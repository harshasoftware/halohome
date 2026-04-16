import Foundation
@testable import CartoAuth

/// Fake sleeper for testing that doesn't actually sleep
final class FakeSleeper: Sleeper, @unchecked Sendable {
    var sleepCalls: [(seconds: TimeInterval, timestamp: Date)] = []
    var shouldThrowCancellation = false
    
    func sleep(for seconds: TimeInterval) async throws {
        sleepCalls.append((seconds: seconds, timestamp: Date()))
        
        if shouldThrowCancellation {
            throw CancellationError()
        }
    }
    
    func reset() {
        sleepCalls.removeAll()
        shouldThrowCancellation = false
    }
}
