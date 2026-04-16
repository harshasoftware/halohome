import SwiftUI
import DesignSystem
import Core

/// Launcher card for starting a new chat with a specific style
struct LauncherCard: View {
    let title: String
    let subtitle: String
    let icon: String
    let cornerRadius: CGFloat
    let action: () -> Void
    
    @GestureState private var isPressed = false
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: DSSpacing.md) {
                // Icon with solid neutral background - unified system
                ZStack {
                    Circle()
                        .fill(DSColors.surface.opacity(0.8))
                        .overlay(
                            Circle()
                                .strokeBorder(DSColors.borderSubtle.opacity(0.3), lineWidth: 0.5)
                        )
                        .frame(width: 64, height: 64)
                    
                    Image(systemName: icon)
                        .font(.system(size: 28, weight: .medium))
                        .foregroundStyle(DSColors.accentPrimary)
                }
                
                VStack(spacing: DSSpacing.xs) {
                    Text(title)
                        .font(.headline.weight(.semibold))
                        .foregroundStyle(DSColors.textPrimary)
                    
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(DSColors.textSecondary.opacity(0.8))
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 160)
            .background(DSColors.surface)
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(DSColors.borderSubtle.opacity(0.4), lineWidth: 0.5)
            )
        }
        .buttonStyle(.plain)
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        .compositingGroup()
        .shadow(color: DSColors.shadow.opacity(0.08), radius: 12, y: 4)
        .scaleEffect(isPressed ? 0.97 : 1.0)
        .opacity(isPressed ? 0.9 : 1.0)
        .animation(.spring(response: 0.25, dampingFraction: 0.9), value: isPressed)
        .contentShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        .gesture(
            LongPressGesture(minimumDuration: 0, maximumDistance: 8)
                .updating($isPressed) { value, state, _ in
                    state = value
                }
        )
    }
}

