import SwiftUI

/// Progress bar for steps 2-8 of onboarding.
public struct OnboardingProgressBar: View {

    let progress: Double

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(progress: Double) {
        self.progress = progress
    }

    public var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                // Background track
                Capsule()
                    .fill(Color.white.opacity(0.1))
                    .frame(height: 4)

                // Progress fill
                Capsule()
                    .fill(
                        LinearGradient(
                            colors: [
                                Color(red: 0.96, green: 0.62, blue: 0.05),
                                Color(red: 0.85, green: 0.45, blue: 0.10)
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: geometry.size.width * progress, height: 4)
                    .animation(reduceMotion ? nil : .spring(response: 0.4, dampingFraction: 0.8), value: progress)
            }
        }
        .frame(height: 4)
    }
}

#Preview {
    VStack(spacing: 24) {
        OnboardingProgressBar(progress: 0.14)
        OnboardingProgressBar(progress: 0.43)
        OnboardingProgressBar(progress: 0.71)
        OnboardingProgressBar(progress: 1.0)
    }
    .padding(24)
    .background(Color(red: 0.02, green: 0.02, blue: 0.05))
}
