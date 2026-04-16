import Foundation
import Core

#if canImport(FirebaseCrashlytics)
@preconcurrency import FirebaseCrashlytics

/// Firebase Crashlytics adapter for CrashReporter protocol
@available(iOS 17.0, *)
public final class CrashlyticsCrashReporter: CrashReporter, @unchecked Sendable {
    private let crashlytics = Crashlytics.crashlytics()
    private var isEnabled = true
    
    public init() {}
    
    public func setEnabled(_ enabled: Bool) {
        isEnabled = enabled
        crashlytics.setCrashlyticsCollectionEnabled(enabled)
    }
    
    public func setUser(id: String?, email: String?, name: String?) {
        guard isEnabled else { return }
        
        if let id = id {
            crashlytics.setUserID(id)
        }
        
        // Never send email to comply with PII rules
        let sanitizedEmail = PIISanitizer.sanitizeEmail(email)
        if let email = sanitizedEmail {
            crashlytics.setCustomValue(email, forKey: "email")
        }
        
        if let name = name {
            crashlytics.setCustomValue(name, forKey: "userName")
        }
    }
    
    public func setAttributes(_ attributes: [String: String]) {
        guard isEnabled else { return }
        
        let filtered = PIISanitizer.filter(attributes)
        for (key, value) in filtered {
            crashlytics.setCustomValue(value, forKey: key)
        }
    }
    
    public func recordError(_ error: Error, context: [String: String], isFatal: Bool) {
        guard isEnabled else { return }
        
        let filtered = PIISanitizer.filter(context)
        for (key, value) in filtered {
            crashlytics.setCustomValue(value, forKey: key)
        }
        
        if isFatal {
            crashlytics.record(error: error)
            fatalError(error.localizedDescription)
        } else {
            crashlytics.record(error: error)
        }
    }
    
    public func log(message: String, level: LogLevel) {
        guard isEnabled else { return }
        
        crashlytics.log(message)
        
        // Record errors/faults as non-fatal errors
        if level == .error || level == .fault {
            let error = NSError(
                domain: "AppLog",
                code: 0,
                userInfo: [NSLocalizedDescriptionKey: message]
            )
            crashlytics.record(error: error)
        }
    }
}
#else
// Stub when Firebase is not available
@available(iOS 17.0, *)
public final class CrashlyticsCrashReporter: CrashReporter {
    public init() {}
    public func setEnabled(_ enabled: Bool) {}
    public func setUser(id: String?, email: String?, name: String?) {}
    public func setAttributes(_ attributes: [String: String]) {}
    public func recordError(_ error: Error, context: [String: String], isFatal: Bool) {}
    public func log(message: String, level: LogLevel) {}
}
#endif

