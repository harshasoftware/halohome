import Foundation

/// Protocol for sleep operations, allowing test injection
protocol Sleeper: Sendable {
    /// Sleeps for the specified duration
    /// - Parameter seconds: Duration to sleep in seconds
    func sleep(seconds: TimeInterval) async throws
}

/// Default sleeper implementation using Task.sleep
@available(iOS 17.0, macOS 14.0, *)
struct DefaultSleeper: Sleeper {
    func sleep(seconds: TimeInterval) async throws {
        try await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
    }
}
