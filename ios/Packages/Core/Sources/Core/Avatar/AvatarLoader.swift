import UIKit
import CryptoKit
import os.log

/// Loads and caches Memoji-style avatars from Tapback API with DiceBear fallback
/// Primary: https://github.com/Wimell/Tapback-Memojis
/// Fallback: https://www.dicebear.com/styles/big-smile/
@available(iOS 17.0, *)
public actor AvatarLoader {

    public static let shared = AvatarLoader()

    private let logger = Logger(subsystem: "com.cartostar.core", category: "AvatarLoader")
    private let cacheDirectory: URL
    private var memoryCache: [String: UIImage] = [:]

    private init() {
        // Set up cache directory
        let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        self.cacheDirectory = caches.appendingPathComponent("AvatarCache", isDirectory: true)

        // Create directory if needed
        try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }

    /// Generates a deterministic seed from any input string using SHA256
    public nonisolated func seedFromString(_ input: String) -> String {
        let data = Data(input.utf8)
        let hash = SHA256.hash(data: data)
        // Use first 16 characters of hex hash as seed
        return hash.compactMap { String(format: "%02x", $0) }.prefix(16).joined()
    }

    /// Gets the Tapback API URL for a given seed
    public nonisolated func tapbackURL(for seed: String) -> URL {
        URL(string: "https://www.tapback.co/api/avatar/\(seed).webp")!
    }

    /// Gets the DiceBear big-smile API URL for a given seed (fallback)
    public nonisolated func diceBearURL(for seed: String) -> URL {
        URL(string: "https://api.dicebear.com/9.x/big-smile/png?seed=\(seed)&size=128&radius=50")!
    }

    /// Loads avatar image, using cache if available
    /// Tries Tapback first, falls back to DiceBear big-smile
    public func loadAvatar(for identifier: String) async -> UIImage? {
        let seed = seedFromString(identifier)

        // Check memory cache first
        if let cached = memoryCache[seed] {
            return cached
        }

        // Check disk cache
        let cacheFile = cacheDirectory.appendingPathComponent("\(seed).png")
        if FileManager.default.fileExists(atPath: cacheFile.path),
           let data = try? Data(contentsOf: cacheFile),
           let image = UIImage(data: data) {
            memoryCache[seed] = image
            return image
        }

        // Try Tapback API first
        if let image = await fetchImage(from: tapbackURL(for: seed)) {
            cacheImage(image, seed: seed, cacheFile: cacheFile)
            logger.info("Loaded Tapback avatar for seed: \(seed)")
            return image
        }

        // Fallback to DiceBear big-smile
        if let image = await fetchImage(from: diceBearURL(for: seed)) {
            cacheImage(image, seed: seed, cacheFile: cacheFile)
            logger.info("Loaded DiceBear big-smile avatar for seed: \(seed)")
            return image
        }

        logger.error("Failed to load avatar from both Tapback and DiceBear for seed: \(seed)")
        return nil
    }

    /// Fetches an image from a URL
    private func fetchImage(from url: URL) async -> UIImage? {
        do {
            let (data, response) = try await URLSession.shared.data(from: url)

            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                return nil
            }

            return UIImage(data: data)
        } catch {
            return nil
        }
    }

    /// Caches image to memory and disk
    private func cacheImage(_ image: UIImage, seed: String, cacheFile: URL) {
        // Cache to disk as PNG
        if let pngData = image.pngData() {
            try? pngData.write(to: cacheFile)
        }

        // Cache in memory
        memoryCache[seed] = image
    }

    /// Preloads avatar for an identifier (call this early to avoid delays)
    public func preloadAvatar(for identifier: String) {
        Task {
            _ = await loadAvatar(for: identifier)
        }
    }

    /// Clears the memory cache (disk cache persists)
    public func clearMemoryCache() {
        memoryCache.removeAll()
    }

    /// Clears all caches including disk
    public func clearAllCaches() {
        memoryCache.removeAll()
        try? FileManager.default.removeItem(at: cacheDirectory)
        try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }
}
