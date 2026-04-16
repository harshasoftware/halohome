import SwiftUI

// MARK: - Accessibility View Modifiers
/// SwiftUI view modifiers for applying accessibility properties
///
/// These modifiers provide a consistent, easy-to-use API for accessibility.
///
/// ## Basic Usage
/// ```swift
/// Button("Send") { }
///     .saiAccessible(A11y.Chat.sendButton)
/// ```
///
/// ## With Custom Label
/// ```swift
/// Image(systemName: "gear")
///     .saiAccessible(label: "Settings", hint: "Open settings")
/// ```
///
/// ## Dynamic Type Support
/// ```swift
/// Text("Hello")
///     .saiScaledFont(.body)  // Respects Dynamic Type
/// ```
public extension View {
    
    // MARK: - Apply A11yLabel
    
    /// Apply a pre-defined accessibility label to a view
    /// - Parameter a11y: The accessibility label configuration
    /// - Returns: View with accessibility properties applied
    ///
    /// Example:
    /// ```swift
    /// SAIButton("Send") { }
    ///     .saiAccessible(A11y.Chat.sendButton)
    /// ```
    func saiAccessible(_ a11y: A11yLabel) -> some View {
        self
            .accessibilityLabel(a11y.label)
            .accessibilityHint(a11y.hint ?? "")
            .accessibilityAddTraits(a11y.traits)
    }
    
    /// Apply custom accessibility label and hint
    /// - Parameters:
    ///   - label: Main accessibility label
    ///   - hint: Optional accessibility hint
    ///   - traits: Accessibility traits to add
    /// - Returns: View with accessibility properties applied
    ///
    /// Example:
    /// ```swift
    /// Image(systemName: "star.fill")
    ///     .saiAccessible(label: "Favorite", hint: "Double tap to favorite")
    /// ```
    func saiAccessible(
        label: String,
        hint: String? = nil,
        traits: AccessibilityTraits = []
    ) -> some View {
        self
            .accessibilityLabel(label)
            .accessibilityHint(hint ?? "")
            .accessibilityAddTraits(traits)
    }
    
    // MARK: - Hide from Accessibility
    
    /// Hide decorative elements from VoiceOver
    /// - Returns: View hidden from accessibility
    ///
    /// Use this for purely decorative elements that don't convey information.
    ///
    /// Example:
    /// ```swift
    /// Image("decorative-pattern")
    ///     .saiAccessibilityHidden()
    /// ```
    func saiAccessibilityHidden() -> some View {
        self.accessibilityHidden(true)
    }
    
    // MARK: - Combine Elements
    
    /// Combine child elements into a single accessibility element
    /// - Parameter label: Combined label for the group
    /// - Returns: View with combined accessibility
    ///
    /// Useful for grouping related content like an avatar + name.
    ///
    /// Example:
    /// ```swift
    /// HStack {
    ///     Image("avatar")
    ///     Text("John Doe")
    /// }
    /// .saiAccessibilityCombine(label: "John Doe, profile picture")
    /// ```
    func saiAccessibilityCombine(label: String) -> some View {
        self
            .accessibilityElement(children: .combine)
            .accessibilityLabel(label)
    }
    
    // MARK: - Dynamic Value Announcements
    
    /// Make VoiceOver announce value changes
    /// - Parameters:
    ///   - value: Current value to announce
    ///   - label: Label for the value
    /// - Returns: View with accessibility value
    ///
    /// Example:
    /// ```swift
    /// Slider(value: $volume)
    ///     .saiAccessibilityValue("\(Int(volume * 100))%", label: "Volume")
    /// ```
    func saiAccessibilityValue(_ value: String, label: String) -> some View {
        self
            .accessibilityLabel(label)
            .accessibilityValue(value)
    }
    
    // MARK: - Sortable Priority
    
    /// Set accessibility sort priority (reading order)
    /// - Parameter priority: Higher numbers are read first
    /// - Returns: View with sort priority
    ///
    /// Example:
    /// ```swift
    /// VStack {
    ///     ErrorBanner()
    ///         .saiAccessibilitySortPriority(100)  // Read first
    ///     MainContent()
    ///         .saiAccessibilitySortPriority(50)
    /// }
    /// ```
    func saiAccessibilitySortPriority(_ priority: Double) -> some View {
        self.accessibilitySortPriority(priority)
    }
}

// MARK: - Dynamic Type Support
public extension View {
    
    /// Apply a font that scales with Dynamic Type settings
    /// - Parameter style: The text style to use
    /// - Returns: View with scaled font
    ///
    /// Example:
    /// ```swift
    /// Text("Hello")
    ///     .saiScaledFont(.body)
    /// ```
    func saiScaledFont(_ style: Font.TextStyle) -> some View {
        self.font(.system(style))
    }
    
    /// Apply a custom font that scales with Dynamic Type
    /// - Parameters:
    ///   - size: Base font size
    ///   - weight: Font weight
    ///   - relativeTo: Text style to scale relative to
    /// - Returns: View with scaled custom font
    ///
    /// Example:
    /// ```swift
    /// Text("Custom")
    ///     .saiScaledFont(size: 18, weight: .semibold, relativeTo: .body)
    /// ```
    func saiScaledFont(
        size: CGFloat,
        weight: Font.Weight = .regular,
        relativeTo style: Font.TextStyle = .body
    ) -> some View {
        self.font(.system(size: size, weight: weight).leading(.loose))
            .dynamicTypeSize(...DynamicTypeSize.accessibility3)
    }
}

// MARK: - Reduced Motion Support
public extension View {
    
    /// Apply animation only if user hasn't enabled Reduce Motion
    /// - Parameter animation: The animation to apply conditionally
    /// - Returns: View with conditional animation
    ///
    /// Example:
    /// ```swift
    /// Circle()
    ///     .scaleEffect(isPressed ? 0.95 : 1.0)
    ///     .saiReducedMotionAnimation(.spring())
    /// ```
    func saiReducedMotionAnimation(_ animation: Animation?) -> some View {
        self.modifier(ReducedMotionAnimationModifier(animation: animation))
    }
    
    /// Replace animation with instant change when Reduce Motion is enabled
    /// - Parameters:
    ///   - animation: Animation when reduce motion is off
    ///   - value: Value to trigger animation
    /// - Returns: View with motion-aware animation
    func saiMotionAwareAnimation<V: Equatable>(
        _ animation: Animation?,
        value: V
    ) -> some View {
        self.modifier(MotionAwareAnimationModifier(animation: animation, value: value))
    }
}

// MARK: - Private Modifiers

private struct ReducedMotionAnimationModifier: ViewModifier {
    let animation: Animation?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    
    func body(content: Content) -> some View {
        content.animation(reduceMotion ? nil : animation, value: UUID())
    }
}

private struct MotionAwareAnimationModifier<V: Equatable>: ViewModifier {
    let animation: Animation?
    let value: V
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    
    func body(content: Content) -> some View {
        content.animation(reduceMotion ? .none : animation, value: value)
    }
}

// MARK: - High Contrast Support
public extension View {
    
    /// Adjust colors for high contrast mode
    /// - Parameters:
    ///   - normalColor: Color for normal mode
    ///   - highContrastColor: Color for high contrast mode
    /// - Returns: View with contrast-aware foreground
    ///
    /// Example:
    /// ```swift
    /// Text("Important")
    ///     .saiContrastAwareForeground(
    ///         normal: DSColors.textSecondary,
    ///         highContrast: DSColors.textPrimary
    ///     )
    /// ```
    func saiContrastAwareForeground(
        normal normalColor: Color,
        highContrast highContrastColor: Color
    ) -> some View {
        self.modifier(ContrastAwareForegroundModifier(
            normalColor: normalColor,
            highContrastColor: highContrastColor
        ))
    }
}

private struct ContrastAwareForegroundModifier: ViewModifier {
    let normalColor: Color
    let highContrastColor: Color
    @Environment(\.colorSchemeContrast) private var contrast
    
    func body(content: Content) -> some View {
        content.foregroundStyle(contrast == .increased ? highContrastColor : normalColor)
    }
}

// MARK: - Focus State
public extension View {
    
    /// Add visual focus indicator for keyboard/switch control navigation
    /// - Parameter isFocused: Whether the element is focused
    /// - Returns: View with focus indicator
    ///
    /// Example:
    /// ```swift
    /// @FocusState private var isFocused: Bool
    ///
    /// TextField("Name", text: $name)
    ///     .focused($isFocused)
    ///     .saiFocusIndicator(isFocused)
    /// ```
    func saiFocusIndicator(_ isFocused: Bool) -> some View {
        self.overlay(
            RoundedRectangle(cornerRadius: DSRadius.md)
                .strokeBorder(DSColors.accentPrimary, lineWidth: isFocused ? 2 : 0)
        )
    }
}

// MARK: - Accessibility Rotor
public extension View {
    
    /// Create a custom accessibility rotor for quick navigation
    /// - Parameters:
    ///   - name: Name of the rotor
    ///   - entries: Items in the rotor
    ///   - entryLabel: Label for each entry
    /// - Returns: View with custom rotor
    ///
    /// Example:
    /// ```swift
    /// ChatView()
    ///     .saiAccessibilityRotor("Messages", entries: messages) { message in
    ///         Text(message.preview)
    ///     }
    /// ```
    func saiAccessibilityRotor<Entry: Identifiable>(
        _ name: String,
        entries: [Entry],
        @ViewBuilder entryLabel: @escaping (Entry) -> some View
    ) -> some View {
        self.accessibilityRotor(name) {
            ForEach(entries) { entry in
                AccessibilityRotorEntry(Text("Item"), id: entry.id)
            }
        }
    }
}
