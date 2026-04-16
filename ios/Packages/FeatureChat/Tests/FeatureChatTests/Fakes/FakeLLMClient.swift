import Foundation
@testable import FeatureChat

/// Fake LLM client for testing
/// Streams deterministic chunks for predictable test behavior
public final class FakeLLMClient: LLMClient, @unchecked Sendable {
    var chunks: [String] = []
    var shouldThrow = false
    var throwError: Error?
    var delayNanoseconds: UInt64 = 1_000_000 // 1ms default
    
    public init(chunks: [String] = ["Hello", " ", "world", "!"]) {
        self.chunks = chunks
    }
    
    public func streamResponse(messages: [LLMMessage]) -> AsyncThrowingStream<String, Error> {
        let capturedChunks = chunks
        let capturedShouldThrow = shouldThrow
        let capturedError = throwError
        let capturedDelay = delayNanoseconds
        
        return AsyncThrowingStream { continuation in
            Task {
                if capturedShouldThrow {
                    continuation.finish(throwing: capturedError ?? NSError(domain: "Test", code: -1))
                    return
                }
                
                for chunk in capturedChunks {
                    try? await Task.sleep(nanoseconds: capturedDelay)
                    continuation.yield(chunk)
                }
                
                continuation.finish()
            }
        }
    }
}

