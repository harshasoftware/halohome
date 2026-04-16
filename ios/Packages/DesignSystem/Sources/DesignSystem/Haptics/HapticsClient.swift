#if canImport(UIKit)
import UIKit
#endif
import Foundation

/// Lightweight haptics feedback client for the Design System
///
/// Provides semantic haptic feedback for user interactions.
/// Usage:
/// ```swift
/// Haptics.default.tap()        // Selection feedback
/// Haptics.default.success()     // Success feedback
/// Haptics.default.error()       // Error feedback
/// ```
#if canImport(UIKit)
public struct HapticsClient {
    
    public static let `default` = HapticsClient()
    
    private let selectionGenerator = UISelectionFeedbackGenerator()
    private let notificationGenerator = UINotificationFeedbackGenerator()
    private let impactGenerator = UIImpactFeedbackGenerator(style: .light)
    
    private init() {
        // Prepare generators for lower latency
        selectionGenerator.prepare()
        notificationGenerator.prepare()
        impactGenerator.prepare()
    }
    
    /// Light tap feedback for selections and toggles
    public func tap() {
        selectionGenerator.selectionChanged()
        selectionGenerator.prepare()
    }
    
    /// Success feedback for completed actions
    public func success() {
        notificationGenerator.notificationOccurred(.success)
        notificationGenerator.prepare()
    }
    
    /// Error feedback for failures
    public func error() {
        notificationGenerator.notificationOccurred(.error)
        notificationGenerator.prepare()
    }
    
    /// Warning feedback
    public func warning() {
        notificationGenerator.notificationOccurred(.warning)
        notificationGenerator.prepare()
    }
    
    /// Light impact feedback
    public func impact() {
        impactGenerator.impactOccurred()
        impactGenerator.prepare()
    }
}
#endif

/// Convenience global accessor
#if canImport(UIKit)
public let Haptics = HapticsClient.default
#else
// Mock for non-iOS platforms
public struct MockHapticsClient {
    public func tap() {}
    public func success() {}
    public func error() {}
    public func warning() {}
    public func impact() {}
}
public let Haptics = MockHapticsClient()
#endif

