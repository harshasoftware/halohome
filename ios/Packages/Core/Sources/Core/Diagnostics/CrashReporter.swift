import Foundation

public enum LogLevel: String, Sendable {
    case debug, info, warning, error, fault
}

/// Abstraction for crash reporting and diagnostics
/// Supports multiple providers (Crashlytics, Sentry, Bugsnag) via adapters
public protocol CrashReporter: Sendable {
    /// Enable or disable crash reporting at runtime
    func setEnabled(_ enabled: Bool)
    
    /// Associate user context with crash reports
    func setUser(id: String?, email: String?, name: String?)
    
    /// Set custom attributes (filtered by allow-list)
    func setAttributes(_ attributes: [String: String])
    
    /// Record an error with optional context
    func recordError(_ error: Error, context: [String: String], isFatal: Bool)
    
    /// Log a message at specified level
    func log(message: String, level: LogLevel)
}

public extension CrashReporter {
    func recordError(_ error: Error, context: [String: String] = [:], isFatal: Bool = false) {
        recordError(error, context: context, isFatal: isFatal)
    }
}

/// No-op implementation when diagnostics are disabled
public final class NoOpCrashReporter: CrashReporter {
    public init() {}
    
    public func setEnabled(_ enabled: Bool) {}
    public func setUser(id: String?, email: String?, name: String?) {}
    public func setAttributes(_ attributes: [String: String]) {}
    public func recordError(_ error: Error, context: [String: String], isFatal: Bool) {}
    public func log(message: String, level: LogLevel) {}
}

