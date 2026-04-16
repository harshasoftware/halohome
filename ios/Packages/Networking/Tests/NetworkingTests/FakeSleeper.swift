import Foundation
@testable import Networking

/// Test sleeper that records requested delays but returns immediately
final class FakeSleeper: Sleeper {
    private(set) var sleepCalls: [TimeInterval] = []
    
    func sleep(seconds: TimeInterval) async throws {
        sleepCalls.append(seconds)
        // Return immediately for fast tests
    }
    
    /// Resets the recorded sleep calls
    func reset() {
        sleepCalls.removeAll()
    }
    
    /// Total number of sleep calls made
    var callCount: Int {
        return sleepCalls.count
    }
}
