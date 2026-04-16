import SwiftUI

// MARK: - Accessibility Label
/// A type-safe accessibility label with optional hint
///
/// Usage:
/// ```swift
/// // Define labels
/// let sendButton = A11yLabel(
///     label: "Send message",
///     hint: "Double tap to send your message"
/// )
///
/// // Apply to view
/// Button("Send") { }
///     .saiAccessible(sendButton)
/// ```
public struct A11yLabel: Sendable {
    /// The main accessibility label (read by VoiceOver)
    public let label: String
    
    /// Optional hint providing additional context
    public let hint: String?
    
    /// Accessibility traits for the element
    public let traits: AccessibilityTraits
    
    /// Creates an accessibility label
    /// - Parameters:
    ///   - label: Main label for VoiceOver
    ///   - hint: Optional hint for additional context
    ///   - traits: Accessibility traits (default: none)
    public init(
        label: String,
        hint: String? = nil,
        traits: AccessibilityTraits = []
    ) {
        self.label = label
        self.hint = hint
        self.traits = traits
    }
}

// MARK: - Pre-defined Accessibility Labels
/// Common accessibility labels for the CartoStar
///
/// These provide consistent VoiceOver experiences across the app.
/// Customize or extend for your specific app needs.
///
/// Usage:
/// ```swift
/// // Use pre-defined labels
/// SAIInputBar(...)
///     .saiAccessible(A11y.Chat.sendButton)
///
/// // Or create custom ones
/// let custom = A11yLabel(label: "Custom label", hint: "Custom hint")
/// ```
public enum A11y {
    
    // MARK: - Chat
    /// Accessibility labels for chat interface
    public enum Chat {
        /// Send message button
        public static let sendButton = A11yLabel(
            label: "Send message",
            hint: "Double tap to send your message",
            traits: .isButton
        )
        
        /// Message input field
        public static let messageInput = A11yLabel(
            label: "Message input",
            hint: "Type your message here"
        )
        
        /// User message bubble
        public static let userMessage = A11yLabel(
            label: "Your message",
            hint: "Double tap to copy message"
        )
        
        /// Assistant message bubble
        public static let assistantMessage = A11yLabel(
            label: "Assistant message",
            hint: "Double tap to copy message"
        )
        
        /// New chat button
        public static let newChat = A11yLabel(
            label: "New chat",
            hint: "Double tap to start a new conversation",
            traits: .isButton
        )
        
        /// Chat history list
        public static let historyList = A11yLabel(
            label: "Chat history",
            hint: "List of your previous conversations"
        )
        
        /// Copy message action
        public static let copyAction = A11yLabel(
            label: "Copy",
            hint: "Copy message to clipboard",
            traits: .isButton
        )
        
        /// Delete chat action
        public static let deleteAction = A11yLabel(
            label: "Delete chat",
            hint: "Double tap to delete this conversation",
            traits: .isButton
        )
    }
    
    // MARK: - Auth
    /// Accessibility labels for authentication
    public enum Auth {
        /// Sign in with Apple button
        public static let signInApple = A11yLabel(
            label: "Sign in with Apple",
            hint: "Double tap to sign in using your Apple ID",
            traits: .isButton
        )
        
        /// Sign in with Google button
        public static let signInGoogle = A11yLabel(
            label: "Continue with Google",
            hint: "Double tap to sign in using your Google account",
            traits: .isButton
        )
        
        /// Email input field
        public static let emailInput = A11yLabel(
            label: "Email address",
            hint: "Enter your email address"
        )
        
        /// Password input field
        public static let passwordInput = A11yLabel(
            label: "Password",
            hint: "Enter your password"
        )
        
        /// Sign out button
        public static let signOut = A11yLabel(
            label: "Sign out",
            hint: "Double tap to sign out of your account",
            traits: .isButton
        )
    }
    
    // MARK: - Settings
    /// Accessibility labels for settings
    public enum Settings {
        /// Theme selector
        public static let themeSelector = A11yLabel(
            label: "Theme",
            hint: "Double tap to change app theme"
        )
        
        /// Notifications toggle
        public static let notificationsToggle = A11yLabel(
            label: "Push notifications",
            hint: "Double tap to toggle push notifications"
        )
        
        /// Share diagnostics toggle
        public static let diagnosticsToggle = A11yLabel(
            label: "Share diagnostics",
            hint: "Help improve the app by sharing crash reports"
        )
        
        /// Delete account button
        public static let deleteAccount = A11yLabel(
            label: "Delete account",
            hint: "Permanently delete your account and data",
            traits: .isButton
        )
    }
    
    // MARK: - Profile
    /// Accessibility labels for profile
    public enum Profile {
        /// Profile photo
        public static let photo = A11yLabel(
            label: "Profile photo",
            hint: "Double tap to change your profile photo",
            traits: .isImage
        )
        
        /// Display name field
        public static let displayName = A11yLabel(
            label: "Display name",
            hint: "Your name shown to others"
        )
        
        /// Edit profile button
        public static let editButton = A11yLabel(
            label: "Edit profile",
            hint: "Double tap to edit your profile",
            traits: .isButton
        )
    }
    
    // MARK: - Payments
    /// Accessibility labels for payments
    public enum Payments {
        /// Subscribe button
        public static let subscribeButton = A11yLabel(
            label: "Subscribe",
            hint: "Double tap to start your subscription",
            traits: .isButton
        )
        
        /// Restore purchases button
        public static let restoreButton = A11yLabel(
            label: "Restore purchases",
            hint: "Double tap to restore previous purchases",
            traits: .isButton
        )
        
        /// Subscription plan option
        public static func planOption(name: String, price: String) -> A11yLabel {
            A11yLabel(
                label: "\(name), \(price)",
                hint: "Double tap to select this plan",
                traits: .isButton
            )
        }
        
        /// Current subscription status
        public static func subscriptionStatus(isSubscribed: Bool) -> A11yLabel {
            A11yLabel(
                label: isSubscribed ? "Subscribed" : "Not subscribed",
                hint: isSubscribed ? "You have an active subscription" : "Tap to view subscription options"
            )
        }
    }
    
    // MARK: - Navigation
    /// Accessibility labels for navigation
    public enum Navigation {
        /// Back button
        public static let back = A11yLabel(
            label: "Back",
            hint: "Go back to previous screen",
            traits: .isButton
        )
        
        /// Close button
        public static let close = A11yLabel(
            label: "Close",
            hint: "Close this screen",
            traits: .isButton
        )
        
        /// Menu button
        public static let menu = A11yLabel(
            label: "Menu",
            hint: "Open menu options",
            traits: .isButton
        )
        
        /// Tab bar item
        public static func tab(name: String, selected: Bool) -> A11yLabel {
            A11yLabel(
                label: name,
                hint: selected ? "Currently selected" : "Double tap to switch to \(name)",
                traits: selected ? [.isSelected, .isButton] : .isButton
            )
        }
    }
    
    // MARK: - Common
    /// Common accessibility labels
    public enum Common {
        /// Loading indicator
        public static let loading = A11yLabel(
            label: "Loading",
            hint: "Please wait"
        )
        
        /// Error state
        public static func error(message: String) -> A11yLabel {
            A11yLabel(
                label: "Error: \(message)",
                hint: "An error occurred"
            )
        }
        
        /// Success state
        public static func success(message: String) -> A11yLabel {
            A11yLabel(
                label: message,
                hint: "Action completed successfully"
            )
        }
        
        /// Dismiss button
        public static let dismiss = A11yLabel(
            label: "Dismiss",
            hint: "Double tap to dismiss",
            traits: .isButton
        )
    }
}

// MARK: - Accessibility Traits Helpers
public extension AccessibilityTraits {
    /// Combined traits for interactive buttons
    static let interactiveButton: AccessibilityTraits = [.isButton]
    
    /// Combined traits for headers/titles
    static let sectionHeader: AccessibilityTraits = [.isHeader]
    
    /// Combined traits for static images
    static let decorativeImage: AccessibilityTraits = [.isImage]
    
    /// Combined traits for links
    static let externalLink: AccessibilityTraits = [.isLink]
}
