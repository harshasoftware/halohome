import SwiftUI
import Lottie

/// Lottie animation view for the astrology animation
/// Adapts color to white in dark mode
struct AstrologyLottieView: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        LottieView {
            try await DotLottieFile.named("Astrology", bundle: .module)
        }
        .playing(loopMode: .loop)
        .animationSpeed(0.8)
        .configure { view in
            if colorScheme == .dark {
                applyWhiteColor(to: view)
            }
        }
        .frame(width: 120, height: 120)
    }

    /// Apply white color to all shape layers in the animation
    private func applyWhiteColor(to animationView: LottieAnimationView) {
        let whiteColorValue = LottieColor(r: 1, g: 1, b: 1, a: 1)
        let colorValueProvider = ColorValueProvider(whiteColorValue)

        let colorKeypaths = [
            "**.Fill 1.Color",
            "**.Stroke 1.Color",
            "**.Color",
            "**Fill.Color",
            "**Stroke.Color"
        ]

        for keypath in colorKeypaths {
            animationView.setValueProvider(
                colorValueProvider,
                keypath: AnimationKeypath(keypath: keypath)
            )
        }
    }
}

#Preview("Light Mode") {
    AstrologyLottieView()
        .preferredColorScheme(.light)
}

#Preview("Dark Mode") {
    AstrologyLottieView()
        .preferredColorScheme(.dark)
        .background(Color.black)
}
