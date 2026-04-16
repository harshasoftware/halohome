import SwiftUI

/// Signature AI List Row component
///
/// A one-line list item with optional subtitle, leading icon, and trailing content.
/// Features inset separators at 16pt.
///
/// Example:
/// ```swift
/// SAIListRow(
///     title: "Account Settings",
///     subtitle: "Manage your profile",
///     leading: Image(systemName: "person.circle")
/// ) {
///     Image(systemName: "chevron.right")
///         .foregroundStyle(DSColors.textSecondary)
/// }
/// ```
public struct SAIListRow<Trailing: View>: View {
    
    private let title: String
    private let subtitle: String?
    private let leading: Image?
    private let trailing: Trailing
    
    public init(
        title: String,
        subtitle: String? = nil,
        leading: Image? = nil,
        @ViewBuilder trailing: () -> Trailing = { EmptyView() }
    ) {
        self.title = title
        self.subtitle = subtitle
        self.leading = leading
        self.trailing = trailing()
    }
    
    public var body: some View {
        HStack(spacing: DSSpacing.md) {
            if let leading = leading {
                leading
                    .font(.system(size: 24))
                    .foregroundStyle(DSColors.accentPrimary)
                    .frame(width: 28, height: 28)
            }
            
            VStack(alignment: .leading, spacing: DSSpacing.xs) {
                Text(title)
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.textPrimary)
                
                if let subtitle = subtitle {
                    Text(subtitle)
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                }
            }
            
            Spacer()
            
            trailing
        }
        .padding(.vertical, DSSpacing.md)
        .padding(.horizontal, DSSpacing.lg)
        .background(Color.clear)
        .overlay(alignment: .bottom) {
            DSColors.borderHairline
                .frame(height: 0.5)
                .padding(.leading, leading != nil ? 60 : DSSpacing.lg)
        }
    }
}

// MARK: - Interactive Row

public extension SAIListRow {
    /// Make the row tappable
    func onTap(action: @escaping () -> Void) -> some View {
        Button(action: {
            Haptics.tap()
            action()
        }) {
            self
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Previews

#Preview("List Rows") {
    VStack(spacing: 0) {
        SAIListRow(title: "Simple Row")
        
        SAIListRow(
            title: "Row with Subtitle",
            subtitle: "Additional information"
        )
        
        SAIListRow(
            title: "Row with Icon",
            leading: Image(systemName: "star.fill")
        )
        
        SAIListRow(
            title: "Complete Row",
            subtitle: "All features enabled",
            leading: Image(systemName: "checkmark.circle.fill")
        ) {
            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(DSColors.textSecondary)
        }
        
        SAIListRow(
            title: "With Badge",
            subtitle: "Pro feature",
            leading: Image(systemName: "crown.fill")
        ) {
            SAITag("Pro", style: .success)
        }
    }
    .background(DSColors.surface)
}

#Preview("Interactive List") {
    VStack(spacing: 0) {
        SAIListRow(
            title: "Account",
            leading: Image(systemName: "person.circle")
        ) {
            Image(systemName: "chevron.right")
                .foregroundStyle(DSColors.textSecondary)
        }
        .onTap {
            print("Account tapped")
        }
        
        SAIListRow(
            title: "Notifications",
            leading: Image(systemName: "bell")
        ) {
            Image(systemName: "chevron.right")
                .foregroundStyle(DSColors.textSecondary)
        }
        .onTap {
            print("Notifications tapped")
        }
    }
    .background(DSColors.surface)
}

