import SwiftUI

/// Toast message model
public struct ToastMessage: Identifiable, Equatable {
    public let id: UUID
    public let title: String
    public let message: String?
    public let style: ToastStyle
    public let duration: TimeInterval
    
    public enum ToastStyle: Equatable {
        case info
        case success
        case error
        case warning
        
        var color: Color {
            switch self {
            case .info: return DSColors.toastAccent
            case .success: return DSColors.success
            case .error: return DSColors.danger
            case .warning: return DSColors.warning
            }
        }
        
        var icon: String {
            switch self {
            case .info: return "info.circle.fill"
            case .success: return "checkmark.circle.fill"
            case .error: return "xmark.circle.fill"
            case .warning: return "exclamationmark.triangle.fill"
            }
        }
    }
    
    public init(
        id: UUID = UUID(),
        title: String,
        message: String? = nil,
        style: ToastStyle = .info,
        duration: TimeInterval = 2.0
    ) {
        self.id = id
        self.title = title
        self.message = message
        self.style = style
        self.duration = duration
    }
}

/// Toast presentation manager (singleton)
@MainActor
@Observable
public final class ToastCenter {
    public static let shared = ToastCenter()

    public private(set) var currentToast: ToastMessage?
    private var toastTask: Task<Void, Never>?
    
    private init() {}
    
    /// Show a toast message
    public func show(_ toast: ToastMessage) {
        // Cancel any existing toast
        toastTask?.cancel()
        
        // Show new toast
        currentToast = toast
        
        // Auto-dismiss after duration
        toastTask = Task {
            try? await Task.sleep(for: .seconds(toast.duration))
            if !Task.isCancelled {
                dismiss()
            }
        }
    }
    
    /// Dismiss the current toast
    public func dismiss() {
        toastTask?.cancel()
        withAnimation(SAIMotion.standard) {
            currentToast = nil
        }
    }
}

/// Signature AI Toast component
///
/// A floating toast notification with accent progress bar.
/// Managed by `ToastCenter.shared`.
///
/// Example:
/// ```swift
/// ToastCenter.shared.show(
///     ToastMessage(
///         title: "Success",
///         message: "Your changes have been saved",
///         style: .success,
///         duration: 2.0
///     )
/// )
/// ```
public struct SAIToast: View {
    let toast: ToastMessage
    let onDismiss: () -> Void
    
    @State private var progress: CGFloat = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    
    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: DSSpacing.md) {
                Image(systemName: toast.style.icon)
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(toast.style.color)
                
                VStack(alignment: .leading, spacing: DSSpacing.xs) {
                    Text(toast.title)
                        .font(DSTypography.body)
                        .fontWeight(.semibold)
                        .foregroundStyle(DSColors.textPrimary)
                    
                    if let message = toast.message {
                        Text(message)
                            .font(DSTypography.caption)
                            .foregroundStyle(DSColors.textSecondary)
                    }
                }
                
                Spacer()
                
                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(DSColors.textSecondary)
                        .frame(width: 24, height: 24)
                }
                .accessibilityLabel("Dismiss")
            }
            .padding(DSSpacing.lg)
            
            // Progress bar
            GeometryReader { geometry in
                toast.style.color
                    .frame(width: geometry.size.width * progress, height: 3)
            }
            .frame(height: 3)
        }
        .background(DSColors.surfaceElevated)
        .clipShape(.rect(cornerRadius: DSRadius.md))
        .elevation(DSElevation.level3)
        .onAppear {
            startProgress()
        }
    }
    
    private func startProgress() {
        guard !reduceMotion else {
            progress = 1.0
            return
        }
        
        withAnimation(.linear(duration: toast.duration)) {
            progress = 1.0
        }
    }
}

/// Container view modifier to host toasts
///
/// Apply this to your root view to enable toast notifications:
/// ```swift
/// ContentView()
///     .toastContainer()
/// ```
public struct ToastContainerView<Content: View>: View {
    @State private var toastCenter = ToastCenter.shared
    private let content: Content
    
    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }
    
    public var body: some View {
        ZStack {
            content
            
            VStack {
                if let toast = toastCenter.currentToast {
                    SAIToast(toast: toast) {
                        toastCenter.dismiss()
                    }
                    .padding(.horizontal, DSSpacing.lg)
                    .padding(.top, DSSpacing.lg)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .zIndex(999)
                }
                
                Spacer()
            }
        }
        .animation(SAIMotion.adaptiveSpring, value: toastCenter.currentToast?.id)
    }
}

// MARK: - View Extension

public extension View {
    /// Apply toast container to enable toast notifications
    func toastContainer() -> some View {
        ToastContainerView { self }
    }
}

// MARK: - Previews

#Preview("Toast Styles") {
    VStack(spacing: DSSpacing.xl) {
        SAIToast(toast: ToastMessage(
            title: "Information",
            message: "This is an informational message",
            style: .info
        )) {}
        
        SAIToast(toast: ToastMessage(
            title: "Success",
            message: "Operation completed successfully",
            style: .success
        )) {}
        
        SAIToast(toast: ToastMessage(
            title: "Error",
            message: "Something went wrong",
            style: .error
        )) {}
        
        SAIToast(toast: ToastMessage(
            title: "Warning",
            message: "Please review your input",
            style: .warning
        )) {}
    }
    .padding(DSSpacing.xl)
    .background(DSColors.background)
}

#Preview("Toast Container") {
    @Previewable @State var showCount = 0
    
    return VStack {
        Spacer()
        
        SAIButton("Show Info Toast") {
            showCount += 1
            ToastCenter.shared.show(ToastMessage(
                title: "Toast \(showCount)",
                message: "This is a test toast message",
                style: .info,
                duration: 2.0
            ))
        }
        
        SAIButton("Show Success Toast", style: .secondary) {
            ToastCenter.shared.show(ToastMessage(
                title: "Success!",
                message: "Everything worked as expected",
                style: .success,
                duration: 2.0
            ))
        }
        
        SAIButton("Show Error Toast", style: .secondary) {
            ToastCenter.shared.show(ToastMessage(
                title: "Error",
                message: "Something went wrong. Please try again.",
                style: .error,
                duration: 3.0
            ))
        }
        
        Spacer()
    }
    .toastContainer()
    .background(DSColors.background)
}

