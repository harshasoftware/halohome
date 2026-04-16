import SwiftUI

/// Step 10: Loading animation that auto-advances after 2.6s.
struct LoadingPage: View {

    let onComplete: () -> Void

    @State private var step1Progress: Double = 0
    @State private var step2Progress: Double = 0
    @State private var step3Progress: Double = 0
    
    @State private var rotation1: Double = 0
    @State private var rotation2: Double = 0
    @State private var rotation3: Double = 0
    
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Mini Orrery Animation
            ZStack {
                // Outer circle
                Circle()
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    .frame(width: 160, height: 160)
                    .rotationEffect(.degrees(rotation1))
                    .overlay(
                        Circle()
                            .fill(Color(red: 0.35, green: 0.65, blue: 0.95))
                            .frame(width: 6, height: 6)
                            .offset(y: -80)
                            .rotationEffect(.degrees(rotation1))
                    )

                // Middle circle
                Circle()
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    .frame(width: 110, height: 110)
                    .rotationEffect(.degrees(rotation2))
                    .overlay(
                        Circle()
                            .fill(Color(red: 0.96, green: 0.45, blue: 0.71))
                            .frame(width: 5, height: 5)
                            .offset(y: -55)
                            .rotationEffect(.degrees(rotation2))
                    )

                // Inner circle
                Circle()
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    .frame(width: 60, height: 60)
                    .rotationEffect(.degrees(rotation3))
                    .overlay(
                        Circle()
                            .fill(Color(red: 0.96, green: 0.71, blue: 0.25))
                            .frame(width: 4, height: 4)
                            .offset(y: -30)
                            .rotationEffect(.degrees(rotation3))
                    )
                
                // Center glow
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [Color.white.opacity(0.2), Color.clear],
                            center: .center,
                            startRadius: 0,
                            endRadius: 20
                        )
                    )
                    .frame(width: 40, height: 40)
            }
            .frame(height: 200)

            Spacer()
                .frame(height: 60)

            // Progress Steps
            VStack(spacing: 24) {
                loadingStep(
                    text: "Tracing strongest astrocartography lines",
                    progress: step1Progress
                )
                
                loadingStep(
                    text: "Calibrating Caro",
                    progress: step2Progress
                )
                
                loadingStep(
                    text: "Preparing travel alerts",
                    progress: step3Progress
                )
            }
            .padding(.horizontal, 48)

            Spacer()
        }
        .onAppear {
            startAnimation()
        }
    }

    @ViewBuilder
    private func loadingStep(text: String, progress: Double) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(text)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.white.opacity(progress > 0 ? 0.9 : 0.3))
            
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.white.opacity(0.05))
                        .frame(height: 4)

                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.6, green: 0.4, blue: 1.0),
                                    Color(red: 0.35, green: 0.65, blue: 0.95)
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geometry.size.width * progress, height: 4)
                        .shadow(color: Color(red: 0.35, green: 0.65, blue: 0.95).opacity(0.3), radius: 4)
                }
            }
            .frame(height: 4)
        }
    }

    private func startAnimation() {
        // Rotation animations
        withAnimation(.linear(duration: 8).repeatForever(autoreverses: false)) {
            rotation1 = 360
        }
        withAnimation(.linear(duration: 5).repeatForever(autoreverses: false)) {
            rotation2 = -360
        }
        withAnimation(.linear(duration: 3).repeatForever(autoreverses: false)) {
            rotation3 = 360
        }

        // Sequential step progress
        let stepDuration: Double = 1.0
        
        withAnimation(.easeInOut(duration: stepDuration)) {
            step1Progress = 1.0
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + stepDuration) {
            withAnimation(.easeInOut(duration: stepDuration)) {
                step2Progress = 1.0
            }
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + stepDuration * 2) {
            withAnimation(.easeInOut(duration: stepDuration)) {
                step3Progress = 1.0
            }
        }
        
        // Complete after all steps
        DispatchQueue.main.asyncAfter(deadline: .now() + stepDuration * 3.5) {
            onComplete()
        }
    }
}

#Preview {
    LoadingPage {}
        .background(Color(red: 0.03, green: 0.03, blue: 0.06))
}
