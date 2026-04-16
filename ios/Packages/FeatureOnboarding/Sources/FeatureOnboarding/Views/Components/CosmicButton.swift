import SwiftUI
import UIKit

/// Primary CTA button with cosmic gradient styling.
public struct CosmicButton: View {

    public enum Variant {
        case primary
        case secondary
    }

    private let title: String
    private let variant: Variant
    private let isLoading: Bool
    private let isDisabled: Bool
    private let action: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(
        _ title: String,
        variant: Variant = .primary,
        isLoading: Bool = false,
        isDisabled: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.variant = variant
        self.isLoading = isLoading
        self.isDisabled = isDisabled
        self.action = action
    }

    public var body: some View {
        Button(action: handleTap) {
            HStack(spacing: 8) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(foregroundColor)
                        .scaleEffect(0.8)
                }
                Text(title)
                    .font(.system(size: 17, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .foregroundStyle(foregroundColor)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(overlay)
        }
        .buttonStyle(CosmicButtonStyle())
        .disabled(isDisabled || isLoading)
        .opacity(isDisabled ? 0.5 : 1.0)
    }

    private func handleTap() {
        // Haptic feedback
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
        action()
    }

    private var foregroundColor: Color {
        switch variant {
        case .primary:
            return .white
        case .secondary:
            return .white.opacity(0.7)
        }
    }

    @ViewBuilder
    private var background: some View {
        switch variant {
        case .primary:
            LinearGradient(
                colors: [
                    Color(red: 0.96, green: 0.62, blue: 0.05),
                    Color(red: 0.85, green: 0.45, blue: 0.10)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case .secondary:
            Color.white.opacity(0.08)
        }
    }

    @ViewBuilder
    private var overlay: some View {
        switch variant {
        case .primary:
            EmptyView()
        case .secondary:
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(Color.white.opacity(0.15), lineWidth: 1)
        }
    }
}

// MARK: - Button Style

private struct CosmicButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(scale(for: configuration))
            .animation(reduceMotion ? nil : .spring(response: 0.2, dampingFraction: 0.7), value: configuration.isPressed)
    }

    private func scale(for configuration: Configuration) -> CGFloat {
        configuration.isPressed ? 0.97 : 1.0
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 16) {
        CosmicButton("Continue") {}
        CosmicButton("Continue", isLoading: true) {}
        CosmicButton("Continue", isDisabled: true) {}
        CosmicButton("Back", variant: .secondary) {}
    }
    .padding(24)
    .background(Color(red: 0.02, green: 0.02, blue: 0.05))
}
