import Foundation

/// Protocol for abstracting sleep/delay behavior for testing
protocol Sleeper: Sendable {
    func sleep(for seconds: TimeInterval) async throws
}

/// Default sleeper using Task.sleep
struct DefaultSleeper: Sleeper {
    func sleep(for seconds: TimeInterval) async throws {
        let nanoseconds = UInt64(seconds * 1_000_000_000)
        try await Task.sleep(nanoseconds: nanoseconds)
    }
}
