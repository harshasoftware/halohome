import Foundation
import SwiftUI
import Core
import CartoStorage

/// Free tier message limit per conversation
private let kFreeMessageLimit = 10

/// Protocol for checking payments/subscription status
/// Allows ChatViewModel to check limits without hard dependency on Payments
public protocol PaymentsStatusProvider: Sendable {
    func currentState() async -> PaymentsState
}

/// Payments state info needed for chat limits
public struct PaymentsState: Sendable {
    public let isSubscribed: Bool
    /// Per-tier AI question quota (0 = paywall, 50 = Pro, 100 = Duo, 200 = Lifetime)
    public let aiQuestionLimit: Int
    /// Start of current billing period for Pro/Duo (nil = no monthly reset)
    public let billingPeriodStart: Date?

    public init(
        isSubscribed: Bool,
        aiQuestionLimit: Int = 0,
        billingPeriodStart: Date? = nil
    ) {
        self.isSubscribed = isSubscribed
        self.aiQuestionLimit = aiQuestionLimit
        self.billingPeriodStart = billingPeriodStart
    }
}

/// ViewModel for chat interface
@MainActor
@Observable
public final class ChatViewModel {
    
    // MARK: - Published State
    
    public var messages: [ChatMessage] = []
    public var inputText: String = ""
    public var isSending: Bool = false
    public var paginatorState: InfinitePaginator.State = .idle
    public var errorMessage: String?
    public var retryAction: (() async -> Void)?
    
    // MARK: - Dependencies
    
    private let conversationID: UUID
    private let messageRepository: MessageRepository
    private let llmClient: LLMClient
    private let paymentsStatusProvider: PaymentsStatusProvider?
    private let memoryRepository: CartoStorage.MemoryRepository?
    private let memoryRetriever: CartoStorage.MemoryRetriever?
    private let memoryExtractor: CartoStorage.MemoryExtractor?
    private var paginator: InfinitePaginator
    private var streamTask: Task<Void, Never>?
    private var lastLoadTime: Date?
    private let debounceInterval: TimeInterval = 0.2 // 200ms
    private var didLoadFirstPage: Bool = false
    private var streamingMessageID: UUID?
    
    public init(
        conversationID: UUID,
        messageRepository: MessageRepository,
        llmClient: LLMClient,
        paymentsStatusProvider: PaymentsStatusProvider? = nil,
        memoryRepository: CartoStorage.MemoryRepository? = nil,
        memoryRetriever: CartoStorage.MemoryRetriever? = nil,
        memoryExtractor: CartoStorage.MemoryExtractor? = nil,
        pageSize: Int = 50
    ) {
        self.conversationID = conversationID
        self.messageRepository = messageRepository
        self.llmClient = llmClient
        self.paymentsStatusProvider = paymentsStatusProvider
        self.memoryRepository = memoryRepository
        self.memoryRetriever = memoryRetriever
        self.memoryExtractor = memoryExtractor
        self.paginator = InfinitePaginator(pageSize: pageSize)
    }
    
    // MARK: - Public Methods
    
    /// Load initial messages
    public func appear() async {
        guard !didLoadFirstPage else { return }
        didLoadFirstPage = true
        await loadFirstPage()
    }
    
    /// Check if should load more and trigger loading
    public func loadMoreIfNeeded(currentIndex: Int) {
        guard paginator.shouldLoadMore(visibleIndex: currentIndex, totalCount: messages.count) else {
            return
        }
        
        Task {
            await loadNextPage()
        }
    }
    
    /// Send current input text
    public func send() async {
        // 1. Validate input
        guard !inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            AppLogger.debug("Attempted to send empty message", category: AppLogger.feature)
            return
        }
        
        // 2. Check message limit for free users
        if let provider = paymentsStatusProvider {
            let state = await provider.currentState()
            if !state.isSubscribed {
                let userMessageCount = messages.filter { $0.role == .user }.count
                if userMessageCount >= kFreeMessageLimit {
                    errorMessage = "Free limit reached. Upgrade to Pro for unlimited messages."
                    AppLogger.info("Free message limit reached (\(kFreeMessageLimit))", category: AppLogger.feature)
                    return
                }
            }
        }
        
        // Cancel any previous streaming task
        streamTask?.cancel()
        
        isSending = true
        errorMessage = nil
        retryAction = nil
        
        // Capture and clear input
        let userText = inputText
        inputText = ""
        
        // 2a. Retrieve relevant memories (if feature enabled)
        var memoryContext = ""
        if let retriever = memoryRetriever {
            do {
                let memories = try await retriever.retrieve(
                    for: userText,
                    conversationID: conversationID,
                    limit: 5
                )
                
                if !memories.isEmpty {
                    memoryContext = """
                    
                    [Context about the user from previous conversations:]
                    \(memories.map { "- \($0.content)" }.joined(separator: "\n"))
                    
                    """
                    AppLogger.debug("Injected \(memories.count) memories into context", category: AppLogger.feature)
                }
            } catch {
                AppLogger.error("Failed to retrieve memories: \(error)", category: AppLogger.feature)
                // Continue without memories - don't block the message
            }
        }
        
        do {
            // 3. Create and persist user message
            let userMessageDTO = try await messageRepository.append(
                conversationID: conversationID,
                role: .user,
                text: userText,
                createdAt: Date()
            )
            
            let userMessage = ChatMappers.toChatMessage(userMessageDTO)
            messages.insert(userMessage, at: 0)
            
            AppLogger.debug("User message sent: \(AppLogger.redacted(userText))", category: AppLogger.feature)
            
            // 4. Create placeholder assistant message with streaming flag
            let assistantMessage = ChatMessage(
                role: .assistant,
                text: "",
                createdAt: Date(),
                isStreaming: true
            )
            messages.insert(assistantMessage, at: 0)
            streamingMessageID = assistantMessage.id
            
            // 5. Build LLM message history (reverse order for LLM, most recent last)
            // Exclude empty assistant placeholders from history
            var llmMessages = messages
                .filter { !($0.role == .assistant && $0.text.isEmpty) }
                .reversed()
                .map { LLMMessage(from: $0) }
            
            // 5a. Inject memory context into the most recent user message
            if !memoryContext.isEmpty, let lastIndex = llmMessages.indices.last {
                let lastMessage = llmMessages[lastIndex]
                llmMessages[lastIndex] = LLMMessage(
                    role: lastMessage.role,
                    content: lastMessage.content + memoryContext
                )
                AppLogger.debug("Memory context injected into LLM prompt", category: AppLogger.feature)
            }
            
            // 6. Stream LLM response
            var accumulatedText = ""
            let stream = llmClient.streamResponse(messages: llmMessages)
            
            streamTask = Task { @MainActor in
                do {
                    for try await chunk in stream {
                        // Check for cancellation
                        try Task.checkCancellation()
                        
                        // Update assistant message text by ID
                        accumulatedText += chunk
                        if let index = messages.firstIndex(where: { $0.id == streamingMessageID }) {
                            messages[index].text = accumulatedText
                        }
                    }
                    
                    // 7. Mark streaming complete and persist final assistant message
                    if let index = messages.firstIndex(where: { $0.id == streamingMessageID }) {
                        messages[index].isStreaming = false
                    }
                    
                    _ = try await messageRepository.append(
                        conversationID: conversationID,
                        role: .assistant,
                        text: accumulatedText,
                        createdAt: Date()
                    )
                    
                    AppLogger.debug("Assistant message completed", category: AppLogger.feature)
                    
                    // Extract and save memories asynchronously (don't block completion)
                    Task {
                        await extractAndSaveMemories()
                    }
                    
                    streamingMessageID = nil
                    isSending = false
                    
                } catch is CancellationError {
                    AppLogger.debug("Message streaming cancelled", category: AppLogger.feature)
                    // Remove incomplete assistant message by ID
                    if let streamingID = streamingMessageID {
                        messages.removeAll { $0.id == streamingID }
                        streamingMessageID = nil
                    }
                    isSending = false
                } catch {
                    AppLogger.error("Failed to stream LLM response: \(error)", category: AppLogger.feature)
                    let appError = AppError.from(error)
                    errorMessage = appError.chatUserMessage
                    
                    // Remove incomplete assistant message by ID
                    if let streamingID = streamingMessageID {
                        messages.removeAll { $0.id == streamingID }
                        streamingMessageID = nil
                    }
                    
                    // Set retry action
                    retryAction = { [weak self] in
                        await self?.retryLastMessage(userText)
                    }
                    
                    isSending = false
                }
            }
            
            await streamTask?.value
            
        } catch {
            AppLogger.error("Failed to send message: \(error)", category: AppLogger.feature)
            isSending = false
            
            let appError: AppError
            if let storageError = error as? StorageError {
                appError = storageError.asAppError()
            } else {
                appError = AppError.from(error)
            }
            
            errorMessage = appError.chatUserMessage
            
            // Restore input text on failure before persistence
            inputText = userText
        }
    }
    
    /// Retry last failed operation
    public func retryLast() async {
        if let action = retryAction {
            await action()
            retryAction = nil
        }
    }
    
    // MARK: - Private Helpers
    
    private func loadFirstPage() async {
        paginator.reset()
        messages.removeAll()
        lastLoadTime = nil
        await loadNextPage()
    }
    
    private func loadNextPage() async {
        // Debounce: prevent loading too frequently
        let now = Date()
        if let lastLoad = lastLoadTime, now.timeIntervalSince(lastLoad) < debounceInterval {
            AppLogger.debug("Load request debounced", category: AppLogger.feature)
            return
        }
        lastLoadTime = now
        
        let result = await paginator.loadNext { cursor in
            try await messageRepository.page(
                conversationID: conversationID,
                after: cursor,
                limit: paginator.pageSize
            )
        }
        
        switch result {
        case .success(let newMessages):
            messages.append(contentsOf: newMessages)
            paginatorState = paginator.state
            errorMessage = nil // Clear any previous errors
            
        case .failure(let error):
            errorMessage = error.chatUserMessage
            paginatorState = paginator.state
        }
    }
    
    private func retryLastMessage(_ text: String) async {
        inputText = text
        await send()
    }
    
    // MARK: - Deep Link Handling
    
    /// Handle deep link navigation and actions
    /// - Parameter deepLink: The deep link to handle
    public func handleDeepLink(_ deepLink: DeepLink) {
        switch deepLink {
        case .chat(let conversationId):
            // Check if this is the correct conversation
            let currentConversationId = conversationID.uuidString
            if conversationId == currentConversationId {
                // Check for pending reply text
                if let replyText = ReplyActionBus.shared.take(for: conversationId) {
                    AppLogger.info("Handling reply from notification", category: AppLogger.notifications)
                    // Set the reply text as input and trigger send
                    inputText = replyText
                    Task {
                        await send()
                    }
                } else {
                    AppLogger.debug("No pending reply for conversation: \(conversationId)", category: AppLogger.notifications)
                }
            } else {
                AppLogger.debug("Deep link for different conversation: \(conversationId), current: \(currentConversationId)", category: AppLogger.notifications)
            }
        }
    }
    
    // MARK: - Memory Extraction
    
    /// Extract and save memories from recent conversation
    /// Called asynchronously after successful message completion
    private func extractAndSaveMemories() async {
        guard let extractor = memoryExtractor,
              let repository = memoryRepository else {
            return
        }
        
        // Get recent messages from this conversation (last 10)
        let recentMessages = Array(messages.prefix(10))
        
        // Convert to extraction format
        let messagesForExtraction = recentMessages.map { message in
            CartoStorage.ChatMessageForExtraction(
                role: CartoStorage.MessageRole(rawValue: message.role.rawValue) ?? .user,
                text: message.text,
                createdAt: message.createdAt
            )
        }
        
        // Extract memories
        let extracted = await extractor.extractMemories(from: messagesForExtraction)
        
        guard !extracted.isEmpty else {
            AppLogger.debug("No memories extracted from recent conversation", category: AppLogger.feature)
            return
        }
        
        // Save new memories with conflict resolution
        for memory in extracted {
            do {
                // Delete conflicting old memories before saving new ones
                // This applies to all personal info and preferences, not just explicit corrections
                // Example: "My name is Eric" then "My name is Jessica" should delete the Eric memory
                if memory.importance >= 7 { // High importance = likely to conflict
                    try await repository.deleteConflicting(
                        keywords: memory.keywords,
                        excludingContent: memory.content,
                        conversationID: conversationID
                    )
                    AppLogger.debug("Checked for conflicting memories", category: AppLogger.feature)
                }
                
                // Create the new memory
                _ = try await repository.create(
                    content: memory.content,
                    keywords: memory.keywords,
                    importance: memory.importance,
                    conversationID: conversationID
                )
                AppLogger.debug("Saved memory successfully", category: AppLogger.feature)
            } catch {
                AppLogger.error("Failed to save memory: \(error)", category: AppLogger.feature)
                // Continue with other memories even if one fails
            }
        }
        
        AppLogger.info("Extracted and saved \(extracted.count) memories", category: AppLogger.feature)
    }
}


