import SwiftUI

/// Signature AI Tag component
///
/// A semantic label badge with different styles for status indication.
///
/// Example:
/// ```swift
/// SAITag("Pro", style: .success)
/// SAITag("Beta", style: .warning)
/// SAITag("New", style: .info)
/// ```
public struct SAITag: View {
    
    public enum Style {
        case info
        case success
        case warning
        case danger
        
        var backgroundColor: Color {
            switch self {
            case .info: return DSColors.toastAccent.opacity(0.15)
            case .success: return DSColors.success.opacity(0.15)
            case .warning: return DSColors.warning.opacity(0.15)
            case .danger: return DSColors.danger.opacity(0.15)
            }
        }
        
        var foregroundColor: Color {
            switch self {
            case .info: return DSColors.toastAccent
            case .success: return DSColors.success
            case .warning: return DSColors.warning
            case .danger: return DSColors.danger
            }
        }
    }
    
    private let text: String
    private let style: Style
    
    public init(_ text: String, style: Style = .info) {
        self.text = text
        self.style = style
    }
    
    public var body: some View {
        Text(text)
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(style.foregroundColor)
            .padding(.horizontal, DSSpacing.sm)
            .padding(.vertical, DSSpacing.xs)
            .background(style.backgroundColor)
            .clipShape(.rect(cornerRadius: DSRadius.xs))
    }
}

// MARK: - Previews

#Preview("Tag Styles") {
    VStack(spacing: DSSpacing.lg) {
        HStack(spacing: DSSpacing.md) {
            SAITag("Info", style: .info)
            SAITag("Success", style: .success)
            SAITag("Warning", style: .warning)
            SAITag("Danger", style: .danger)
        }
        
        HStack(spacing: DSSpacing.md) {
            SAITag("Pro", style: .success)
            SAITag("Beta", style: .warning)
            SAITag("New", style: .info)
            SAITag("Error", style: .danger)
        }
    }
    .padding(DSSpacing.xl)
    .background(DSColors.background)
}

#Preview("Tag Dark Mode") {
    HStack(spacing: DSSpacing.md) {
        SAITag("Info", style: .info)
        SAITag("Success", style: .success)
        SAITag("Warning", style: .warning)
        SAITag("Danger", style: .danger)
    }
    .padding(DSSpacing.xl)
    .background(DSColors.background)
    .preferredColorScheme(.dark)
}

#Preview("Tag In Context") {
    VStack(spacing: 0) {
        SAIListRow(
            title: "Premium Feature",
            subtitle: "Unlock advanced capabilities",
            leading: Image(systemName: "star.fill")
        ) {
            SAITag("Pro", style: .success)
        }
        
        SAIListRow(
            title: "Beta Feature",
            subtitle: "Test new functionality",
            leading: Image(systemName: "flask.fill")
        ) {
            SAITag("Beta", style: .warning)
        }
        
        SAIListRow(
            title: "New Feature",
            subtitle: "Recently added",
            leading: Image(systemName: "sparkles")
        ) {
            SAITag("New", style: .info)
        }
    }
    .background(DSColors.surface)
}

