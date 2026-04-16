import Foundation
import SwiftUI
import FeatureChat
import FeatureGlobe
import Core
import AI

// MARK: - Astro Chat ViewModel

/// ViewModel for the astro-aware AI chat powered by CopilotKit.
/// Bridges CopilotKitClient (KMP) with the FeatureChat UI layer.
/// Registers astro context (birth data, lines, positions) as readables
/// and globe actions (highlight, zoom, analyze) as tool calls.
@MainActor
@Observable
public final class AstroChatViewModel {

    // MARK: - State

    public var messages: [ChatMessage] = []
    public var inputText: String = ""
    public var isSending: Bool = false
    public var streamingContent: String = ""
    public var errorMessage: String?
    public var activeToolCall: String?

    // MARK: - Configuration

    private let baseUrl: String
    private let authTokenProvider: () -> String?
    private let refreshTokenProvider: () -> String?
    private let paymentsStatusProvider: PaymentsStatusProvider?

    // Globe action callbacks
    public var onHighlightLine: ((String, String) -> Void)?  // (planet, lineType)
    public var onZoomToLocation: ((Double, Double, Double) -> Void)?  // (lat, lng, zoom)
    public var onAnalyzeLocation: ((Double, Double, String?) -> Void)?  // (lat, lng, name)
    public var onTogglePlanetVisibility: ((String) -> Void)?  // planet name

    // Copilot client (lazy-initialized once auth token is available)
    private var copilotClient: CopilotKitClientWrapper?
    private var streamTask: Task<Void, Never>?

    // Birth data context
    private var birthDataContext: String = ""
    private var planetaryPositionsContext: String = ""
    private var selectedLineContext: String = ""
    private var visibleLinesContext: String = ""

    // Per-tier question limits — must match adapty-webhook PRODUCT_TYPE_MAP quotas
    // Free tier has no questions — AI chat requires a subscription (paywall on first tap).
    private static let freeTierLimit = 0
    // (pro=50, duo=100, lifetime=200 come from PaymentsState.aiQuestionLimit)

    /// Cached payments state, refreshed on every send() so limits stay current.
    private var cachedPaymentsState: PaymentsState? = nil

    /// Active limit for the current subscriber tier.
    private var currentLimit: Int { cachedPaymentsState?.aiQuestionLimit ?? Self.freeTierLimit }

    /// Questions used this session (seeded from Supabase DB on initialize()).
    private var messageCount: Int = 0

    /// True when the last limit error is a tier cap (subscribed user hit their quota).
    /// AstroChatView uses this to route "Upgrade" to the correct paywall placement.
    public var isTierLimitError: Bool = false

    /// Whether we've already synced messageCount from Supabase this session.
    private var hasLoadedServerCount: Bool = false

    // Scout context data
    private var scoutContextData: [String: Any] = [:]

    // MARK: - Init

    public init(
        baseUrl: String,
        authTokenProvider: @escaping () -> String?,
        refreshTokenProvider: @escaping () -> String? = { nil },
        paymentsStatusProvider: PaymentsStatusProvider? = nil
    ) {
        self.baseUrl = baseUrl
        self.authTokenProvider = authTokenProvider
        self.refreshTokenProvider = refreshTokenProvider
        self.paymentsStatusProvider = paymentsStatusProvider
    }

    // MARK: - Lifecycle

    /// Initialize the CopilotKit client and register context
    public func initialize() async {
        guard copilotClient == nil else { return }
        Analytics.capture(.chatSessionStarted)

        // Build a SupabaseAIChatClient so the SDK handles JWT automatically.
        // Derive the project URL from the functions base URL by stripping the path.
        var supabaseAIChatClient: SupabaseAIChatClient?
        if let components = URLComponents(string: baseUrl),
           let scheme = components.scheme,
           let host = components.host,
           let supabaseURL = URL(string: "\(scheme)://\(host)") {
            let chatClient = SupabaseAIChatClient(
                supabaseURL: supabaseURL,
                supabaseKey: AppConfiguration.SUPABASE_PUBLISHABLE_KEY
            )
            // Restore real user session if available; otherwise sign in anonymously.
            if let accessToken = authTokenProvider(),
               let refreshToken = refreshTokenProvider() {
                await chatClient.importSession(accessToken: accessToken, refreshToken: refreshToken)
            } else {
                await chatClient.ensureAnonymousSession()
            }
            supabaseAIChatClient = chatClient
        }

        let client = CopilotKitClientWrapper(
            baseUrl: baseUrl,
            authTokenProvider: authTokenProvider,
            supabaseAIChatClient: supabaseAIChatClient
        )

        // Register readables
        client.registerReadable(key: "birthData", description: "User's birth data for astrocartography") { [weak self] in
            self?.birthDataContext ?? "No birth data set"
        }

        client.registerReadable(key: "planetaryPositions", description: "Current planetary positions from birth chart") { [weak self] in
            self?.planetaryPositionsContext ?? "No positions calculated"
        }

        client.registerReadable(key: "selectedLine", description: "Currently selected planetary line on globe") { [weak self] in
            self?.selectedLineContext ?? "No line selected"
        }

        client.registerReadable(key: "visibleLines", description: "Which planetary lines are currently visible") { [weak self] in
            self?.visibleLinesContext ?? "All lines visible"
        }

        // Register actions
        client.registerAction(
            name: "highlightLine",
            description: "Highlight a specific planetary line on the globe",
            parameters: ["planet", "lineType"]
        ) { [weak self] params in
            guard let planet = params["planet"] as? String,
                  let lineType = params["lineType"] as? String else { return }
            Task { @MainActor in
                self?.activeToolCall = "Highlighting \(planet) \(lineType) line..."
                self?.onHighlightLine?(planet, lineType)
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                self?.activeToolCall = nil
            }
        }

        client.registerAction(
            name: "zoomToLocation",
            description: "Zoom the globe camera to a specific location",
            parameters: ["latitude", "longitude", "zoom"]
        ) { [weak self] params in
            guard let lat = params["latitude"] as? Double ?? (params["latitude"] as? String).flatMap(Double.init),
                  let lng = params["longitude"] as? Double ?? (params["longitude"] as? String).flatMap(Double.init) else { return }
            let zoom = params["zoom"] as? Double ?? 5.0
            Task { @MainActor in
                self?.activeToolCall = "Zooming to location..."
                self?.onZoomToLocation?(lat, lng, zoom)
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                self?.activeToolCall = nil
            }
        }

        client.registerAction(
            name: "analyzeLocation",
            description: "Open detailed analysis for a location showing nearby astro lines and influences",
            parameters: ["latitude", "longitude", "cityName"]
        ) { [weak self] params in
            guard let lat = params["latitude"] as? Double ?? (params["latitude"] as? String).flatMap(Double.init),
                  let lng = params["longitude"] as? Double ?? (params["longitude"] as? String).flatMap(Double.init) else { return }
            let name = params["cityName"] as? String
            Task { @MainActor in
                self?.activeToolCall = "Analyzing \(name ?? "location")..."
                self?.onAnalyzeLocation?(lat, lng, name)
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                self?.activeToolCall = nil
            }
        }

        client.registerAction(
            name: "togglePlanetVisibility",
            description: "Show or hide lines for a specific planet on the globe",
            parameters: ["planet"]
        ) { [weak self] params in
            guard let planet = params["planet"] as? String else { return }
            Task { @MainActor in
                self?.activeToolCall = "Toggling \(planet) lines..."
                self?.onTogglePlanetVisibility?(planet)
                try? await Task.sleep(nanoseconds: 500_000_000)
                self?.activeToolCall = nil
            }
        }

        copilotClient = client

        // Cache the current subscription state before syncing the server count —
        // fetchServerMessageCount needs billingPeriodStart to filter Pro/Duo correctly.
        if let provider = paymentsStatusProvider, cachedPaymentsState == nil {
            cachedPaymentsState = await provider.currentState()
        }

        // Sync real question count from Supabase so the limit is accurate
        // even if the user asked questions in a previous session.
        if !hasLoadedServerCount {
            hasLoadedServerCount = true
            await fetchServerMessageCount()
        }
    }

    /// Fetches the number of AI questions the current user has already sent
    /// from `ai_usage_log` via Supabase REST, then seeds `messageCount`.
    private func fetchServerMessageCount() async {
        // Derive Supabase project URL (strip /functions/v1 path)
        guard let components = URLComponents(string: baseUrl),
              let scheme = components.scheme,
              let host = components.host else { return }
        let supabaseProjectURL = "\(scheme)://\(host)"

        // Prefer Supabase SDK token (handles anonymous sessions too)
        let token: String
        if let sdkToken = await copilotClient?.currentAccessToken() {
            token = sdkToken
        } else if let keychain = authTokenProvider() {
            token = keychain
        } else {
            return
        }

        // For Pro/Duo, filter to the current billing cycle only (monthly reset).
        // For Free and Lifetime, query all-time (no date filter — permanent quotas).
        var queryString = "\(supabaseProjectURL)/rest/v1/ai_usage_log?select=id"
        if let billingStart = cachedPaymentsState?.billingPeriodStart {
            let iso = ISO8601DateFormatter().string(from: billingStart)
            queryString += "&created_at=gte.\(iso)"
            AppLogger.debug("[AstroChat] Filtering usage by billing period start: \(iso)", category: AppLogger.payments)
        }

        guard let url = URL(string: queryString) else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue(AppConfiguration.SUPABASE_PUBLISHABLE_KEY, forHTTPHeaderField: "apikey")
        // Ask PostgREST for an exact row count in the Content-Range header
        request.setValue("count=exact", forHTTPHeaderField: "Prefer")

        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else { return }
            // PostgREST returns "Content-Range: 0-24/25" (or "*/N" when no rows match range)
            if let contentRange = http.allHeaderFields["Content-Range"] as? String {
                let total = contentRange.split(separator: "/").last.flatMap { Int($0) }
                if let count = total {
                    // Don't regress below what we've already counted locally
                    self.messageCount = max(self.messageCount, min(count, self.currentLimit))
                    AppLogger.debug("[AstroChat] Server usage count: \(count), messageCount set to \(self.messageCount)", category: AppLogger.payments)
                }
            }
        } catch {
            AppLogger.debug("[AstroChat] Could not fetch server usage count: \(error)", category: AppLogger.payments)
        }
    }

    // MARK: - Context Updates

    /// Update birth data context for the AI
    public func updateBirthData(
        date: String,
        time: String,
        location: String,
        latitude: Double,
        longitude: Double
    ) {
        birthDataContext = "Born on \(date) at \(time) in \(location) (lat: \(latitude), lng: \(longitude))"
        copilotClient?.updateBirthData(
            date: date,
            time: time,
            location: location,
            latitude: latitude,
            longitude: longitude
        )
    }

    /// Update planetary positions context
    public func updatePlanetaryPositions(_ positions: String) {
        planetaryPositionsContext = positions
    }

    /// Update selected line context
    public func updateSelectedLine(planet: String, lineType: String) {
        selectedLineContext = "\(planet) \(lineType) line"
        copilotClient?.updateSelectedLine(planet: planet, lineType: lineType)
    }

    /// Update visible lines context
    public func updateVisibleLines(_ description: String) {
        visibleLinesContext = description
    }

    /// Update scout results and pipeline context for AI reasoning
    public func updateScoutContext(_ contextData: [String: Any]) {
        scoutContextData = contextData
        copilotClient?.updateScoutContext(contextData)
    }

    // MARK: - Messaging

    /// Send a message to the AI
    public func send() async {
        let trimmed = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        // Enforce maximum message length to prevent abuse
        if trimmed.count > 5000 {
            inputText = String(trimmed.prefix(5000))
        }

        // Refresh subscription state and enforce per-tier limit
        if let provider = paymentsStatusProvider {
            let state = await provider.currentState()
            cachedPaymentsState = state
            let limit = state.aiQuestionLimit
            if messageCount >= limit {
                isTierLimitError = state.isSubscribed
                Analytics.capture(.chatLimitReached, properties: [
                    "message_count": messageCount,
                    "limit": limit,
                    "is_subscribed": state.isSubscribed
                ])
                if state.isSubscribed {
                    errorMessage = "You've reached your \(limit)-question limit. Upgrade your plan to continue."
                } else {
                    errorMessage = "Free limit reached. Upgrade to Pro for unlimited AI chat."
                }
                return
            }
        }

        guard let client = copilotClient else {
            await initialize()
            guard copilotClient != nil else {
                errorMessage = "Failed to initialize chat. Please try again."
                return
            }
            await send()
            return
        }

        streamTask?.cancel()
        isSending = true
        errorMessage = nil

        let userText = inputText
        inputText = ""

        // Add user message
        let userMessage = ChatMessage(role: .user, text: userText)
        messages.insert(userMessage, at: 0)
        messageCount += 1
        Analytics.capture(.chatMessageSent, properties: ["message_count": messageCount])

        // Add streaming placeholder
        let assistantMessage = ChatMessage(role: .assistant, text: "", isStreaming: true)
        messages.insert(assistantMessage, at: 0)
        let streamingID = assistantMessage.id

        streamTask = Task {
            var accumulatedText = ""

            for await update in client.sendMessage(userText) {
                if Task.isCancelled { break }

                switch update {
                case .textDelta(_, let accumulated):
                    accumulatedText = accumulated
                    if let index = messages.firstIndex(where: { $0.id == streamingID }) {
                        messages[index].text = accumulatedText
                    }

                case .toolCallStarted(_, let name):
                    activeToolCall = "Running \(name)..."
                    Analytics.capture(.aiToolCalled, properties: ["tool": name])

                case .toolCallCompleted:
                    activeToolCall = nil

                case .finished:
                    if let index = messages.firstIndex(where: { $0.id == streamingID }) {
                        messages[index].isStreaming = false
                    }
                    // Sync messageCount with server's authoritative remaining value
                    if let serverRemaining = client.lastServerRemaining {
                        let serverUsed = self.currentLimit - serverRemaining
                        self.messageCount = max(self.messageCount, serverUsed)
                        AppLogger.debug("[AstroChat] Synced messageCount from server: remaining=\(serverRemaining) → messageCount=\(self.messageCount)", category: AppLogger.payments)
                    }
                    isSending = false

                case .error(let message, _):
                    if message == "free_limit_reached" {
                        // Server confirmed the limit — sync count and show paywall prompt
                        messageCount = currentLimit
                        isTierLimitError = cachedPaymentsState?.isSubscribed ?? false
                        errorMessage = isTierLimitError
                            ? "You've reached your \(currentLimit)-question limit. Upgrade your plan to continue."
                            : "Free limit reached. Upgrade to Pro for unlimited AI chat."
                    } else {
                        errorMessage = message
                    }
                    messages.removeAll { $0.id == streamingID }
                    isSending = false

                default:
                    break
                }
            }

            if isSending {
                if let index = messages.firstIndex(where: { $0.id == streamingID }) {
                    messages[index].isStreaming = false
                }
                isSending = false
            }
        }

        await streamTask?.value
    }

    /// Cancel any active streaming and clean up resources.
    /// Call when the chat sheet is dismissed.
    public func cleanup() {
        streamTask?.cancel()
        streamTask = nil
        isSending = false
        activeToolCall = nil
    }

    /// Clear conversation
    public func clearConversation() {
        streamTask?.cancel()
        streamTask = nil
        messages.removeAll()
        streamingContent = ""
        isSending = false
        copilotClient?.clearConversation()
        // Don't reset messageCount — cleared conversations don't refund server-side usage.
        // Re-fetch from server next time the client initialises.
        hasLoadedServerCount = false
    }

}

// MARK: - CopilotKit Client Wrapper

/// Thin wrapper around the actual CopilotKitClient to allow conditional import.
/// When CopilotKitShared framework is available, this delegates to the real client.
/// Otherwise, provides a fallback that calls the Supabase edge function directly.
@MainActor
final class CopilotKitClientWrapper {
    private let baseUrl: String
    private let authTokenProvider: () -> String?
    private let supabaseAIChatClient: SupabaseAIChatClient?
    private var readables: [String: () -> String] = [:]
    private var session: URLSession = .shared

    init(
        baseUrl: String,
        authTokenProvider: @escaping () -> String?,
        supabaseAIChatClient: SupabaseAIChatClient? = nil
    ) {
        self.baseUrl = baseUrl
        self.authTokenProvider = authTokenProvider
        self.supabaseAIChatClient = supabaseAIChatClient
    }

    func registerReadable(key: String, description: String, valueProvider: @escaping () -> String) {
        readables[key] = valueProvider
    }

    func registerAction(name: String, description: String, parameters: [String], handler: @escaping ([String: Any?]) -> Void) {
        // Actions are handled server-side via AG-UI protocol
    }

    func updateBirthData(date: String, time: String, location: String, latitude: Double, longitude: Double) {
        // Birth data is sent as context with each message
    }

    func updateSelectedLine(planet: String, lineType: String) {
        // Selected line is sent as context with each message
    }

    // Scout context (pipeline settings + ranked results)
    private var scoutContext: [String: Any] = [:]

    func updateScoutContext(_ context: [String: Any]) {
        scoutContext = context
    }

    // Conversation history for context
    private var conversationHistory: [[String: String]] = []

    /// Last `remaining` value returned by the server — synced back to AstroChatViewModel.
    var lastServerRemaining: Int? = nil

    /// Expose current access token for usage fetch in AstroChatViewModel.
    func currentAccessToken() async -> String? {
        await supabaseAIChatClient?.currentAccessToken()
    }

    func clearConversation() {
        // Clear conversation history
        conversationHistory.removeAll()
    }

    /// Send message via Supabase edge function and stream response
    func sendMessage(_ content: String) -> AsyncStream<AstroChatStreamUpdate> {
        AsyncStream { continuation in
            Task {
                do {
                    // Build context — the edge function expects typed objects for keys like
                    // birthData, planetaryPositions, visibleLines. Sending plain strings under
                    // those keys causes a 500 when the server calls .map() on a string.
                    // Use relatedContext (plain string field) to pass all readable values safely.
                    let contextLines = readables.compactMap { key, provider -> String? in
                        let val = provider()
                        guard !val.isEmpty else { return nil }
                        return "\(key): \(val)"
                    }.sorted() // deterministic order

                    let context: [String: Any] = contextLines.isEmpty ? [:] : [
                        "relatedContext": contextLines.joined(separator: "\n")
                    ]

                    // Generate anonymous ID for tracking
                    let anonymousId = Self.getOrCreateAnonymousId()

                    var body: [String: Any] = [
                        "message": content,
                        "context": context,
                        "conversationHistory": conversationHistory,
                        "anonymousId": anonymousId,
                        "platform": "ios",
                    ]
                    if !scoutContext.isEmpty {
                        body["scoutContext"] = scoutContext
                    }

                    let jsonData = try JSONSerialization.data(withJSONObject: body)

                    // Use Supabase edge function URL (baseUrl already includes /functions/v1)
                    guard let url = URL(string: "\(baseUrl)/astro-ai-chat") else {
                        continuation.yield(.error(message: "Invalid chat endpoint URL", code: nil))
                        continuation.finish()
                        return
                    }

                    var request = URLRequest(url: url)
                    request.httpMethod = "POST"
                    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    // Use Supabase SDK to get a valid JWT (handles session, refresh, and anonymous sign-in).
                    // Falls back to reading keychain token directly, then publishable key.
                    let bearerToken: String
                    if let sdkToken = await supabaseAIChatClient?.currentAccessToken() {
                        bearerToken = sdkToken
                    } else {
                        bearerToken = authTokenProvider() ?? AppConfiguration.SUPABASE_PUBLISHABLE_KEY
                    }
                    request.setValue(AppConfiguration.SUPABASE_PUBLISHABLE_KEY, forHTTPHeaderField: "apikey")
                    request.setValue("Bearer \(bearerToken)", forHTTPHeaderField: "Authorization")
                    request.httpBody = jsonData

                    let (data, response) = try await session.data(for: request)

                    guard let httpResponse = response as? HTTPURLResponse else {
                        continuation.yield(.error(message: "Invalid response", code: nil))
                        continuation.finish()
                        return
                    }

                    // Parse response
                    if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                        // Check for errors
                        if let errorMessage = json["error"] as? String {
                            let reason = json["reason"] as? String ?? errorMessage
                            continuation.yield(.error(message: reason, code: "\(httpResponse.statusCode)"))
                            continuation.finish()
                            return
                        }

                        // Check for non-200 status code
                        guard httpResponse.statusCode == 200 else {
                            let errorMsg = json["error"] as? String ?? "Server error (\(httpResponse.statusCode))"
                            continuation.yield(.error(message: errorMsg, code: "\(httpResponse.statusCode)"))
                            continuation.finish()
                            return
                        }

                        // Sync server-side remaining count if provided
                        if let remaining = json["remaining"] as? Int {
                            self.lastServerRemaining = remaining
                        }

                        // Check for server-enforced subscription limit
                        if let errorCode = json["error"] as? String,
                           (errorCode == "subscription_limit" || errorCode == "limit_reached") {
                            continuation.yield(.error(message: "free_limit_reached", code: "402"))
                            continuation.finish()
                            return
                        }

                        // Success - get the message field (not content!)
                        if let responseContent = json["message"] as? String {
                            // Update conversation history
                            conversationHistory.append(["role": "user", "content": content])
                            conversationHistory.append(["role": "assistant", "content": responseContent])

                            // Keep only last 6 messages
                            if conversationHistory.count > 6 {
                                conversationHistory = Array(conversationHistory.suffix(6))
                            }

                            continuation.yield(.textDelta(delta: responseContent, accumulated: responseContent))
                        } else if let responseText = String(data: data, encoding: .utf8) {
                            continuation.yield(.textDelta(delta: responseText, accumulated: responseText))
                        }
                    } else {
                        // Fallback for non-JSON response
                        if let responseText = String(data: data, encoding: .utf8) {
                            continuation.yield(.textDelta(delta: responseText, accumulated: responseText))
                        }
                    }

                    continuation.yield(.finished(threadId: "", runId: ""))
                    continuation.finish()
                } catch {
                    continuation.yield(.error(message: error.localizedDescription, code: nil))
                    continuation.finish()
                }
            }
        }
    }

    /// Generate or retrieve anonymous ID for tracking
    private static func getOrCreateAnonymousId() -> String {
        let key = "astro_anonymous_id"
        if let existing = UserDefaults.standard.string(forKey: key) {
            return existing
        }
        let newId = "anon_\(Int(Date().timeIntervalSince1970))_\(UUID().uuidString.prefix(8))"
        UserDefaults.standard.set(newId, forKey: key)
        return newId
    }
}

// MARK: - Stream Update Enum

/// Simplified stream update for the fallback implementation
enum AstroChatStreamUpdate {
    case started(threadId: String, runId: String)
    case textDelta(delta: String, accumulated: String)
    case toolCallStarted(id: String, name: String)
    case toolCallCompleted(toolCall: String)
    case messageCompleted(content: String)
    case finished(threadId: String, runId: String)
    case error(message: String, code: String?)
}
