import Foundation

/// Encrypted file storage using iOS Data Protection (`NSFileProtectionComplete`).
/// Files are inaccessible when the device is locked.
public struct ProtectedFileStore {
    private let directory: URL

    public init(subdirectory: String = "protected") {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        self.directory = appSupport.appendingPathComponent(subdirectory)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try? (directory as NSURL).setResourceValue(URLFileProtection.complete, forKey: .fileProtectionKey)
    }

    public func save<T: Encodable>(_ value: T, key: String) throws {
        let data = try JSONEncoder().encode(value)
        let fileURL = directory.appendingPathComponent(key)
        try data.write(to: fileURL, options: [.atomic, .completeFileProtection])
    }

    public func load<T: Decodable>(_ type: T.Type, key: String) -> T? {
        let fileURL = directory.appendingPathComponent(key)
        guard let data = try? Data(contentsOf: fileURL) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    public func delete(key: String) {
        let fileURL = directory.appendingPathComponent(key)
        try? FileManager.default.removeItem(at: fileURL)
    }
}
