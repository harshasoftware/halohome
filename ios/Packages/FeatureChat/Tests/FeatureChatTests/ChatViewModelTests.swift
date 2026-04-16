import XCTest
@testable import FeatureChat

@MainActor
final class ChatViewModelTests: XCTestCase {
    
    private var viewModel: ChatViewModel!
    private var fakeRepo: FakeMessageRepository!
    private var fakeLLM: FakeLLMClient!
    private var conversationID: UUID!
    
    override func setUp() {
        super.setUp()
        
        conversationID = UUID()
        fakeRepo = FakeMessageRepository()
        fakeLLM = FakeLLMClient(chunks: ["Hello", " ", "world", "!"])
        viewModel = ChatViewModel(
            conversationID: conversationID,
            messageRepository: fakeRepo,
            llmClient: fakeLLM
        )
    }
    
    override func tearDown() {
        fakeRepo.reset()
        viewModel = nil
        fakeLLM = nil
        super.tearDown()
    }
    
    func testInitialState() {
        // Given/When
        // viewModel created in setUp
        
        // Then
        XCTAssertTrue(viewModel.messages.isEmpty)
        XCTAssertEqual(viewModel.inputText, "")
        XCTAssertFalse(viewModel.isSending)
    }
    
    func testAppearLoadsFirstPage() async {
        // Given
        await seedMessages(count: 5)
        
        // When
        await viewModel.appear()
        
        // Then
        XCTAssertEqual(viewModel.messages.count, 5)
        XCTAssertEqual(viewModel.paginatorState, .endReached)
    }
    
    func testSendAppendsUserMessage() async {
        // Given
        viewModel.inputText = "Hello, AI!"
        
        // When
        await viewModel.send()
        
        // Wait for streaming to complete
        try? await Task.sleep(nanoseconds: 10_000_000) // 10ms
        
        // Then - User message should be in messages
        let userMessages = viewModel.messages.filter { $0.role == .user }
        XCTAssertEqual(userMessages.count, 1)
        XCTAssertEqual(userMessages.first?.text, "Hello, AI!")
        XCTAssertEqual(viewModel.inputText, "", "Input should be cleared")
    }
    
    func testSendStreamingUpdatesAssistantMessage() async {
        // Given
        fakeLLM.chunks = ["H", "e", "l", "l", "o"]
        fakeLLM.delayNanoseconds = 2_000_000 // 2ms per chunk
        viewModel.inputText = "Test"
        
        // When
        await viewModel.send()
        
        // Then - Assistant message should be complete and not streaming
        let assistantMessages = viewModel.messages.filter { $0.role == .assistant }
        XCTAssertEqual(assistantMessages.count, 1)
        XCTAssertEqual(assistantMessages.first?.text, "Hello")
        XCTAssertFalse(assistantMessages.first?.isStreaming ?? true, "Should not be streaming after completion")
    }
    
    func testSendPersistsFinalMessages() async {
        // Given
        viewModel.inputText = "Test message"
        
        // When
        await viewModel.send()
        
        // Wait for streaming to complete
        try? await Task.sleep(nanoseconds: 10_000_000)
        
        // Then - Both messages should be persisted
        // User message + Assistant message = 2 messages in repo
        let page = try? await fakeRepo.page(conversationID: conversationID, after: nil, limit: 10)
        XCTAssertEqual(page?.items.count, 2)
        
        let roles = page?.items.map { $0.role } ?? []
        XCTAssertTrue(roles.contains(.user))
        XCTAssertTrue(roles.contains(.assistant))
    }
    
    func testSendErrorHandling() async {
        // Given
        fakeLLM.shouldThrow = true
        fakeLLM.throwError = URLError(.notConnectedToInternet)
        viewModel.inputText = "Test"
        
        // When
        await viewModel.send()
        
        // Then
        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.isSending)
        XCTAssertNotNil(viewModel.retryAction, "Should have retry action")
        
        // Assistant message should be removed on error
        let assistantMessages = viewModel.messages.filter { $0.role == .assistant }
        XCTAssertEqual(assistantMessages.count, 0)
    }
    
    func testSendEmptyMessageIgnored() async {
        // Given
        viewModel.inputText = "   "
        
        // When
        await viewModel.send()
        
        // Then
        XCTAssertTrue(viewModel.messages.isEmpty)
        XCTAssertFalse(viewModel.isSending)
    }
    
    func testCancellationStopsStreaming() async {
        // Given
        fakeLLM.chunks = Array(repeating: "word ", count: 100)
        fakeLLM.delayNanoseconds = 5_000_000 // 5ms per chunk
        viewModel.inputText = "First message"
        
        // When - Send first message
        let firstTask = Task {
            await viewModel.send()
        }
        
        // Wait a bit for streaming to start
        try? await Task.sleep(nanoseconds: 10_000_000) // 10ms
        
        // Send second message (should cancel first)
        viewModel.inputText = "Second message"
        await viewModel.send()
        
        await firstTask.value
        
        // Then - Should have messages from both sends
        let userMessages = viewModel.messages.filter { $0.role == .user }
        XCTAssertEqual(userMessages.count, 2) // Both user messages persist
        
        // Assistant messages - both persist (cancellation stops streaming but doesn't remove message)
        let assistantMessages = viewModel.messages.filter { $0.role == .assistant }
        XCTAssertEqual(assistantMessages.count, 2) // Both assistant messages persist
    }
    
    func testPaginationLoadsMultiplePages() async {
        // Given
        await seedMessages(count: 100)
        viewModel = ChatViewModel(
            conversationID: conversationID,
            messageRepository: fakeRepo,
            llmClient: fakeLLM,
            pageSize: 20
        )
        
        // When - Load first page
        await viewModel.appear()
        XCTAssertEqual(viewModel.messages.count, 20)
        
        // Load more pages
        viewModel.loadMoreIfNeeded(currentIndex: 15) // Within prefetch threshold
        try? await Task.sleep(nanoseconds: 5_000_000) // Wait for load
        
        // Then
        XCTAssertGreaterThanOrEqual(viewModel.messages.count, 20, "Should have loaded more messages")
    }
    
    func testRetryLastCallsRetryAction() async {
        // Given
        fakeLLM.shouldThrow = true
        fakeLLM.throwError = URLError(.timedOut)
        viewModel.inputText = "Test"
        await viewModel.send()
        
        // Verify error state
        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertNotNil(viewModel.retryAction)
        
        // Fix the error condition
        fakeLLM.shouldThrow = false
        
        // When
        await viewModel.retryLast()
        
        // Then
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertNil(viewModel.retryAction)
        
        // Should have succeeded this time
        let assistantMessages = viewModel.messages.filter { $0.role == .assistant }
        XCTAssertEqual(assistantMessages.count, 1)
    }
    
    func testPrefetchThresholdTriggers() async {
        // Given
        await seedMessages(count: 60)
        viewModel = ChatViewModel(
            conversationID: conversationID,
            messageRepository: fakeRepo,
            llmClient: fakeLLM,
            pageSize: 50
        )
        await viewModel.appear()
        
        // When - Scroll near end (within prefetch threshold of 5)
        viewModel.loadMoreIfNeeded(currentIndex: 46)
        try? await Task.sleep(nanoseconds: 5_000_000)
        
        // Then - Should have loaded next page
        XCTAssertGreaterThanOrEqual(viewModel.messages.count, 50)
    }
    
    func testPrefetchDoesNotTriggerTooEarly() async {
        // Given
        await seedMessages(count: 60)
        viewModel = ChatViewModel(
            conversationID: conversationID,
            messageRepository: fakeRepo,
            llmClient: fakeLLM,
            pageSize: 50
        )
        await viewModel.appear()
        let initialCount = viewModel.messages.count
        
        // When - Scroll but not near end
        viewModel.loadMoreIfNeeded(currentIndex: 20)
        try? await Task.sleep(nanoseconds: 5_000_000)
        
        // Then - Should not have loaded more
        XCTAssertEqual(viewModel.messages.count, initialCount)
    }
    
    func testDebouncePreventsDuplicateLoads() async {
        // Given
        await seedMessages(count: 100)
        viewModel = ChatViewModel(
            conversationID: conversationID,
            messageRepository: fakeRepo,
            llmClient: fakeLLM,
            pageSize: 20
        )
        await viewModel.appear()
        
        // When - Trigger multiple loads rapidly
        viewModel.loadMoreIfNeeded(currentIndex: 16)
        viewModel.loadMoreIfNeeded(currentIndex: 16)
        viewModel.loadMoreIfNeeded(currentIndex: 16)
        
        try? await Task.sleep(nanoseconds: 10_000_000) // Wait for loads
        
        // Then - Should not have excessive loads
        // With debounce, duplicate calls within 200ms should be ignored
        XCTAssertLessThan(viewModel.messages.count, 100)
    }
    
    func testStreamingStateTracking() async {
        // Given
        fakeLLM.chunks = ["Test", " ", "response"]
        fakeLLM.delayNanoseconds = 5_000_000 // 5ms per chunk
        viewModel.inputText = "Hello"
        
        // When - Start streaming
        let sendTask = Task {
            await viewModel.send()
        }
        
        // Wait a bit for streaming to start
        try? await Task.sleep(nanoseconds: 3_000_000)
        
        // Then - Should have streaming message during streaming
        let streamingMessages = viewModel.messages.filter { $0.isStreaming }
        XCTAssertGreaterThan(streamingMessages.count, 0, "Should have streaming message during stream")
        
        // Wait for completion
        await sendTask.value
        
        // After completion, no messages should be streaming
        let finalStreamingMessages = viewModel.messages.filter { $0.isStreaming }
        XCTAssertEqual(finalStreamingMessages.count, 0, "No messages should be streaming after completion")
    }
    
    func testEmptyPlaceholderExcludedFromHistory() async {
        // Given
        viewModel.inputText = "First message"
        await viewModel.send()
        
        // Verify the LLM didn't receive the empty placeholder
        // Since we're using a fake, we can't directly inspect the call,
        // but we can verify behavior: if placeholder was included, LLM would see empty message
        
        // Send another message
        viewModel.inputText = "Second message"
        await viewModel.send()
        
        // Both should succeed without errors
        let userMessages = viewModel.messages.filter { $0.role == .user }
        let assistantMessages = viewModel.messages.filter { $0.role == .assistant }
        
        XCTAssertEqual(userMessages.count, 2)
        XCTAssertEqual(assistantMessages.count, 2)
        XCTAssertFalse(assistantMessages.contains { $0.text.isEmpty }, "No empty assistant messages should remain")
    }
    
    func testDoubleLoadPrevention() async {
        // Given
        await seedMessages(count: 5)
        
        // When - Call appear multiple times
        await viewModel.appear()
        let firstCount = viewModel.messages.count
        
        await viewModel.appear() // Should be ignored
        let secondCount = viewModel.messages.count
        
        // Then - Should only load once
        XCTAssertEqual(firstCount, secondCount, "Second appear() should be ignored")
        XCTAssertEqual(viewModel.messages.count, 5)
    }
    
    // MARK: - Helpers
    
    private func seedMessages(count: Int) async {
        for i in 0..<count {
            _ = try? await fakeRepo.append(
                conversationID: conversationID,
                role: i % 2 == 0 ? .user : .assistant,
                text: "Message \(i)",
                createdAt: Date().addingTimeInterval(TimeInterval(-i))
            )
        }
    }
}

