import Foundation
import Security
import Core

/// Protocol for secure storage operations
public protocol SecureStore: Sendable {
    func get(_ key: String) throws -> Data?
    func set(_ data: Data, for key: String) throws
    func delete(_ key: String) throws
}

// MARK: - String Convenience Methods

public extension SecureStore {
    /// Get a string value from secure storage
    func getString(_ key: String) throws -> String? {
        guard let data = try get(key) else { return nil }
        return String(data: data, encoding: .utf8)
    }
    
    /// Set a string value in secure storage
    func setString(_ value: String, for key: String) throws {
        guard let data = value.data(using: .utf8) else {
            throw StorageError.validation("Failed to encode string as UTF-8")
        }
        try set(data, for: key)
    }
}

/// Keychain wrapper for secure storage
public final class KeychainStore: SecureStore, @unchecked Sendable {
    private let accessGroup: String?
    private let lock = NSLock()
    
    /// Standard keys for authentication tokens
    public enum Keys {
        public static let authAccessToken = "auth_access_token"
        public static let authRefreshToken = "auth_refresh_token"
    }
    
    public init(accessGroup: String? = nil) {
        self.accessGroup = accessGroup
    }
    
    // MARK: - SecureStore
    
    public func get(_ key: String) throws -> Data? {
        lock.lock()
        defer { lock.unlock() }
        
        var query = baseQuery(for: key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        switch status {
        case errSecSuccess:
            AppLogger.debug("Retrieved value for key: \(key)", category: AppLogger.storage)
            return result as? Data
        case errSecItemNotFound:
            AppLogger.debug("No value found for key: \(key)", category: AppLogger.storage)
            return nil
        default:
            let error = StorageError.underlying(NSError(domain: NSOSStatusErrorDomain, code: Int(status)))
            AppLogger.error("Keychain get failed for key \(key): \(error)", category: AppLogger.storage)
            throw error
        }
    }
    
    public func set(_ data: Data, for key: String) throws {
        lock.lock()
        defer { lock.unlock() }
        
        // Try to update first
        var query = baseQuery(for: key)
        let attributes = [kSecValueData as String: data]
        
        var status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        
        if status == errSecItemNotFound {
            // Item doesn't exist, add it
            query[kSecValueData as String] = data
            status = SecItemAdd(query as CFDictionary, nil)
        }
        
        guard status == errSecSuccess else {
            let error = StorageError.underlying(NSError(domain: NSOSStatusErrorDomain, code: Int(status)))
            AppLogger.error("Keychain set failed for key \(key): \(error)", category: AppLogger.storage)
            throw error
        }
        
        AppLogger.debug("Stored value for key: \(key)", category: AppLogger.storage)
    }
    
    public func delete(_ key: String) throws {
        lock.lock()
        defer { lock.unlock() }
        
        let query = baseQuery(for: key)
        let status = SecItemDelete(query as CFDictionary)
        
        guard status == errSecSuccess || status == errSecItemNotFound else {
            let error = StorageError.underlying(NSError(domain: NSOSStatusErrorDomain, code: Int(status)))
            AppLogger.error("Keychain delete failed for key \(key): \(error)", category: AppLogger.storage)
            throw error
        }
        
        AppLogger.debug("Deleted value for key: \(key)", category: AppLogger.storage)
    }
    
    // MARK: - Private Helpers
    
    private func baseQuery(for key: String) -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrService as String: bundleIdentifier,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
        
        if let accessGroup = accessGroup {
            query[kSecAttrAccessGroup as String] = accessGroup
        }
        
        return query
    }
    
    private var bundleIdentifier: String {
        Bundle.main.bundleIdentifier ?? "com.swiftai.CartoStar"
    }
}
