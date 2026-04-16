import Foundation

/// Message structure for LLM communication
public struct LLMMessage: Sendable, Equatable {
    public let role: String // "user" | "assistant" | "system"
    public let content: String
    
    public init(role: String, content: String) {
        self.role = role
        self.content = content
    }
}

/// Protocol for LLM streaming client
/// Implementations should stream responses chunk by chunk for real-time display
public protocol LLMClient: Sendable {
    /// Stream a response from the LLM based on conversation history
    /// - Parameter messages: Array of messages representing conversation history
    /// - Returns: AsyncThrowingStream yielding text chunks as they arrive
    func streamResponse(messages: [LLMMessage]) -> AsyncThrowingStream<String, Error>
}

/// Convenience extension for converting ChatMessage to LLMMessage
extension LLMMessage {
    public init(from chatMessage: ChatMessage) {
        self.role = chatMessage.role.rawValue
        self.content = chatMessage.text
    }
}
