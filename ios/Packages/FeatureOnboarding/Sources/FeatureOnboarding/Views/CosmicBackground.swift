import SwiftUI

/// Deep space gradient background for onboarding pages.
public struct CosmicBackground: View {

    let step: OnboardingStep

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var gradientAngle: Double = 0

    public init(step: OnboardingStep = .welcome) {
        self.step = step
    }

    public var body: some View {
        ZStack {
            // Base color
            step.backgroundColor
                .ignoresSafeArea()

            // Subtle gradient overlay
            LinearGradient(
                colors: [
                    Color.white.opacity(0.02),
                    Color.clear,
                    Color(red: 0.3, green: 0.2, blue: 0.5).opacity(0.05)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            // Animated stars (reduced motion aware)
            if !reduceMotion {
                StarsView()
            }
        }
    }
}

// MARK: - Stars View

private struct StarsView: View {

    @State private var opacity: Double = 0.3

    var body: some View {
        Canvas { context, size in
            // Draw scattered stars
            let starCount = 50
            for i in 0..<starCount {
                let seed = Double(i * 12345)
                let x = (sin(seed) * 0.5 + 0.5) * size.width
                let y = (cos(seed * 1.5) * 0.5 + 0.5) * size.height
                let starSize = (sin(seed * 2) * 0.5 + 0.5) * 2 + 0.5

                let rect = CGRect(
                    x: x - starSize / 2,
                    y: y - starSize / 2,
                    width: starSize,
                    height: starSize
                )

                context.fill(
                    Circle().path(in: rect),
                    with: .color(.white.opacity(opacity * (0.3 + sin(seed * 3) * 0.3)))
                )
            }
        }
        .ignoresSafeArea()
        .onAppear {
            withAnimation(
                .easeInOut(duration: 3)
                .repeatForever(autoreverses: true)
            ) {
                opacity = 0.6
            }
        }
    }
}

#Preview {
    CosmicBackground(step: .welcome)
}
