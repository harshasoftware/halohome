import SwiftUI

/// Background matching the high-fidelity web prototype:
/// A dark radial/linear gradient blend, with ambient glowing orbs and a noise texture overlay.
public struct OnboardingBackground: View {

    @State private var animateOrbs = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init() {}

    public var body: some View {
        ZStack {
            // 1. Base gradient
            LinearGradient(
                colors: [
                    Color(red: 6/255, green: 7/255, blue: 13/255),
                    Color(red: 5/255, green: 5/255, blue: 5/255)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            // 2. Ambient Orbs (Animated)
            if !reduceMotion {
                // Purple/Violet top-left orb
                Circle()
                    .fill(Color(red: 167/255, green: 139/255, blue: 250/255).opacity(0.2))
                    .frame(width: 420, height: 420)
                    .blur(radius: 80)
                    .offset(x: animateOrbs ? -120 : -160, y: animateOrbs ? -150 : -190)

                // Blue/Pink bottom-right orb
                Circle()
                    .fill(Color(red: 96/255, green: 165/255, blue: 250/255).opacity(0.18))
                    .frame(width: 420, height: 420)
                    .blur(radius: 80)
                    .offset(x: animateOrbs ? 100 : 140, y: animateOrbs ? 140 : 180)
            } else {
                // Static version for reduce motion
                Circle()
                    .fill(Color(red: 167/255, green: 139/255, blue: 250/255).opacity(0.2))
                    .frame(width: 420, height: 420)
                    .blur(radius: 80)
                    .offset(x: -160, y: -190)

                Circle()
                    .fill(Color(red: 96/255, green: 165/255, blue: 250/255).opacity(0.18))
                    .frame(width: 420, height: 420)
                    .blur(radius: 80)
                    .offset(x: 140, y: 180)
            }

            // 3. Subtle Grain / Noise Overlay
            // A simple implementation of grain using an overlay color/blend mode or an image if available.
            // Using a fine radial repeating pattern approximation (or standard SwiftUI material if preferred)
            Color.white.opacity(0.02)
                .background(.ultraThinMaterial)
                .blendMode(.overlay)
                .ignoresSafeArea()
        }
        .onAppear {
            if !reduceMotion {
                withAnimation(.easeInOut(duration: 8.0).repeatForever(autoreverses: true)) {
                    animateOrbs = true
                }
            }
        }
    }
}

#Preview {
    OnboardingBackground()
}
