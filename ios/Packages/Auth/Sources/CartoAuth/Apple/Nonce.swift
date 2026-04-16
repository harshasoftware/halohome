import Foundation
import CryptoKit

/// Utilities for generating and hashing nonces for Apple Sign In
public enum Nonce {
    
    /// Generate a random nonce string
    public static func random(length: Int = 32) -> String {
        precondition(length > 0)
        var randomBytes = [UInt8](repeating: 0, count: length)
        let result = SecRandomCopyBytes(kSecRandomDefault, length, &randomBytes)
        
        guard result == errSecSuccess else {
            fatalError("Unable to generate nonce. SecRandomCopyBytes failed with OSStatus \(result)")
        }
        
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        let nonce = randomBytes.map { byte in
            charset[Int(byte) % charset.count]
        }
        
        return String(nonce)
    }
    
    /// SHA256 hash a nonce string
    public static func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = SHA256.hash(data: inputData)
        let hashString = hashedData.compactMap {
            String(format: "%02x", $0)
        }.joined()
        
        return hashString
    }
}
