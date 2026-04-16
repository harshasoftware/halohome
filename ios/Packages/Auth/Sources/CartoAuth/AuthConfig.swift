import Foundation

/// Configuration for authentication services
public struct AuthConfig: Sendable {
    /// Supabase project URL (https://*.supabase.co)
    public let supabaseURL: URL
    
    /// Supabase anonymous key (public)
    public let supabaseAnonKey: String
    
    public init(supabaseURL: URL, supabaseAnonKey: String) {
        self.supabaseURL = supabaseURL
        self.supabaseAnonKey = supabaseAnonKey
    }
}
