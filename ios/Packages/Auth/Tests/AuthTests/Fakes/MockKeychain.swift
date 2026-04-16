import Foundation
@testable import CartoAuth
import CartoStorage

/// In-memory keychain for testing
final class MockKeychain: SecureStore, @unchecked Sendable {
    nonisolated(unsafe) private var storage: [String: Data] = [:]
    private let lock = NSLock()
    
    func get(_ key: String) throws -> Data? {
        lock.lock()
        defer { lock.unlock() }
        return storage[key]
    }
    
    func set(_ data: Data, for key: String) throws {
        lock.lock()
        defer { lock.unlock() }
        storage[key] = data
    }
    
    func delete(_ key: String) throws {
        lock.lock()
        defer { lock.unlock() }
        storage.removeValue(forKey: key)
    }
    
    func reset() {
        lock.lock()
        defer { lock.unlock() }
        storage.removeAll()
    }
}

