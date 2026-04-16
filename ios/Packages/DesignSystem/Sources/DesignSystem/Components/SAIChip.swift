import SwiftUI

/// Signature AI Chip component
///
/// A selectable pill-shaped component with optional icon and loading state.
/// Features subtle glow when selected and shimmer effect when loading.
///
/// Example:
/// ```swift
/// SAIChip(
///     title: "GPT-4",
///     isSelected: $selectedModel == .gpt4,
///     isLoading: false,
///     icon: Image(systemName: "sparkles")
/// )
/// ```
public struct SAIChip: View {
    
    private let title: String
    private let isSelected: Bool
    private let isLoading: Bool
    private let icon: Image?
    private let action: () -> Void
    
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    
    public init(
        title: String,
        isSelected: Bool = false,
        isLoading: Bool = false,
        icon: Image? = nil,
        action: @escaping () -> Void = {}
    ) {
        self.title = title
        self.isSelected = isSelected
        self.isLoading = isLoading
        self.icon = icon
        self.action = action
    }
    
    public var body: some View {
        Button(action: handleTap) {
            HStack(spacing: DSSpacing.xs) {
                if isLoading {
                    ProgressView()
                        .scaleEffect(0.7)
                        .frame(width: 14, height: 14)
                } else if let icon = icon {
                    icon
                        .font(.system(size: 13, weight: .medium))
                }
                
                Text(title)
                    .font(.system(size: 14, weight: .medium))
            }
            .foregroundStyle(foregroundColor)
            .padding(.horizontal, DSSpacing.md)
            .padding(.vertical, DSSpacing.sm)
            .background(backgroundColor)
            .clipShape(.rect(cornerRadius: DSRadius.sm))
            .overlay(selectedOverlay)
            .shimmer(isActive: isLoading)
        }
        .buttonStyle(ChipButtonStyle())
    }
    
    private func handleTap() {
        guard !isLoading else { return }
        Haptics.tap()
        action()
    }
    
    // MARK: - Style Helpers
    
    private var foregroundColor: Color {
        isSelected ? DSColors.accentPrimary : DSColors.textPrimary
    }
    
    private var backgroundColor: Color {
        isSelected ? DSColors.chipSelectedBackground : DSColors.chipBackground
    }
    
    @ViewBuilder
    private var selectedOverlay: some View {
        if isSelected && !reduceMotion {
            RoundedRectangle(cornerRadius: DSRadius.sm)
                .strokeBorder(DSColors.accentPrimary.opacity(0.5), lineWidth: 1)
                .shadow(color: DSColors.accentPrimary.opacity(0.3), radius: 4, x: 0, y: 0)
        }
    }
}

// MARK: - Button Style

private struct ChipButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(scale(for: configuration))
            .opacity(configuration.isPressed ? 0.85 : 1.0)
            .animation(SAIMotion.quick, value: configuration.isPressed)
    }
    
    private func scale(for configuration: Configuration) -> CGFloat {
        guard !reduceMotion else { return 1.0 }
        return configuration.isPressed ? 0.95 : 1.0
    }
}

// MARK: - Previews

#Preview("Chip States") {
    VStack(spacing: DSSpacing.lg) {
        HStack(spacing: DSSpacing.sm) {
            SAIChip(title: "Unselected") {}
            SAIChip(title: "Selected", isSelected: true) {}
            SAIChip(title: "Loading", isLoading: true) {}
        }
        
        HStack(spacing: DSSpacing.sm) {
            SAIChip(title: "GPT-4", icon: Image(systemName: "sparkles")) {}
            SAIChip(title: "Claude", isSelected: true, icon: Image(systemName: "brain")) {}
            SAIChip(title: "Gemini", icon: Image(systemName: "star")) {}
        }
    }
    .padding(DSSpacing.xl)
    .background(DSColors.background)
}

#Preview("Chip Dark Mode") {
    HStack(spacing: DSSpacing.sm) {
        SAIChip(title: "Unselected") {}
        SAIChip(title: "Selected", isSelected: true) {}
        SAIChip(title: "Loading", isLoading: true) {}
    }
    .padding(DSSpacing.xl)
    .background(DSColors.background)
    .preferredColorScheme(.dark)
}

#Preview("Model Selector") {
    @Previewable @State var selectedModel = "GPT-4"
    
    return HStack(spacing: DSSpacing.sm) {
        SAIChip(
            title: "GPT-4",
            isSelected: selectedModel == "GPT-4",
            icon: Image(systemName: "sparkles")
        ) {
            selectedModel = "GPT-4"
        }
        
        SAIChip(
            title: "Claude",
            isSelected: selectedModel == "Claude",
            icon: Image(systemName: "brain")
        ) {
            selectedModel = "Claude"
        }
        
        SAIChip(
            title: "Gemini",
            isSelected: selectedModel == "Gemini",
            icon: Image(systemName: "star")
        ) {
            selectedModel = "Gemini"
        }
    }
    .padding(DSSpacing.xl)
    .background(DSColors.background)
}

