import SwiftUI
import UIKit

/// Step 8: AI training opt-in toggle.
struct AITrainingPage: View {

    @Binding var aiTrainingOptIn: Bool
    let onContinue: () -> Void

    @State private var isVisible = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 0) {
            // Progress bar
            OnboardingProgressBar(progress: OnboardingStep.aiTraining.progress)
                .padding(.horizontal, 24)
                .padding(.top, 16)

            Spacer()

            // Title and permission card
            VStack(spacing: 32) {
                VStack(spacing: 12) {
                    Text("Help improve\nCartoStar AI")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.center)
                    
                    Text("Share anonymized usage data to help Caro give better insights to everyone.")
                        .font(.system(size: 15))
                        .foregroundStyle(.white.opacity(0.5))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                }
                
                // Permission Card
                HStack(spacing: 16) {
                    ZStack {
                        Circle()
                            .fill(Color(red: 0.55, green: 0.35, blue: 0.95).opacity(0.12))
                            .frame(width: 56, height: 56)
                        
                        Image(systemName: "brain.fill")
                            .font(.system(size: 24))
                            .foregroundStyle(Color(red: 0.55, green: 0.35, blue: 0.95))
                    }
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Anonymized data")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.white)
                        
                        Text("No birth data, chart details, or location history are ever shared.")
                            .font(.system(size: 13))
                            .foregroundStyle(.white.opacity(0.6))
                            .lineLimit(2)
                    }
                    
                    Spacer()
                }
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(Color.white.opacity(0.05))
                        .overlay(
                            RoundedRectangle(cornerRadius: 20, style: .continuous)
                                .strokeBorder(Color.white.opacity(0.1), lineWidth: 1)
                        )
                )
                .padding(.horizontal, 24)
            }
            .opacity(isVisible ? 1 : 0)
            .offset(y: isVisible ? 0 : 20)

            Spacer()
                .frame(height: 40)

            // Toggle Card
            VStack(spacing: 0) {
                Toggle(isOn: $aiTrainingOptIn) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Share usage data")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(.white)

                        Text("Helps improve AI accuracy for all")
                            .font(.system(size: 13))
                            .foregroundStyle(.white.opacity(0.5))
                    }
                }
                .tint(Color(red: 0.55, green: 0.35, blue: 0.95))
                .padding(.horizontal, 20)
                .padding(.vertical, 18)
            }
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Color.white.opacity(0.04))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .strokeBorder(Color.white.opacity(0.08), lineWidth: 1)
                    )
            )
            .padding(.horizontal, 24)
            .opacity(isVisible ? 1 : 0)
            .onChange(of: aiTrainingOptIn) { _, _ in
                let generator = UIImpactFeedbackGenerator(style: .light)
                generator.impactOccurred()
            }

            Spacer()

            // CTA
            CosmicButton("Continue", action: onContinue)
                .padding(.horizontal, 24)
                .opacity(isVisible ? 1 : 0)

            Spacer()
                .frame(height: 50)
        }
        .onAppear {
            guard !reduceMotion else {
                isVisible = true
                return
            }

            withAnimation(.easeOut(duration: 0.5).delay(0.1)) {
                isVisible = true
            }
        }
    }
}

#Preview {
    @Previewable @State var optIn = true

    return AITrainingPage(aiTrainingOptIn: $optIn) {}
        .background(Color(red: 0.06, green: 0.03, blue: 0.08))
}
