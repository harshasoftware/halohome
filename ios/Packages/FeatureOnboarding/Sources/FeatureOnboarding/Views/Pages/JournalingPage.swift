import SwiftUI

/// Step 7: Notification permission for journaling reminders.
struct JournalingPage: View {

    let onAllow: () async -> Void
    let onSkip: () -> Void

    @State private var isVisible = false
    @State private var isRequesting = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 0) {
            // Progress bar
            OnboardingProgressBar(progress: OnboardingStep.journaling.progress)
                .padding(.horizontal, 24)
                .padding(.top, 16)

            Spacer()

            // Title and permission card
            VStack(spacing: 32) {
                VStack(spacing: 12) {
                    Text("Daily Insights")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.center)
                    
                    Text("Caro can send you daily reminders and journaling prompts based on your planetary transits.")
                        .font(.system(size: 15))
                        .foregroundStyle(.white.opacity(0.5))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                }
                
                // Permission Card
                HStack(spacing: 16) {
                    ZStack {
                        Circle()
                            .fill(Color(red: 0.92, green: 0.30, blue: 0.50).opacity(0.12))
                            .frame(width: 56, height: 56)
                        
                        Image(systemName: "bell.fill")
                            .font(.system(size: 24))
                            .foregroundStyle(Color(red: 0.92, green: 0.30, blue: 0.50))
                    }
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Stay inspired")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.white)
                        
                        Text("Receive alerts when planetary energy peaks in your current city.")
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

            // CTAs
            VStack(spacing: 12) {
                CosmicButton("Enable Notifications", isLoading: isRequesting) {
                    isRequesting = true
                    Task {
                        await onAllow()
                        isRequesting = false
                    }
                }

                CosmicButton("Skip for Now", variant: .secondary, action: onSkip)
            }
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
    JournalingPage(onAllow: {}, onSkip: {})
        .background(Color(red: 0.05, green: 0.04, blue: 0.10))
}
