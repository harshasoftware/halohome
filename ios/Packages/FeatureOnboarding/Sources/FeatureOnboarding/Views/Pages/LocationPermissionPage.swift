import SwiftUI

/// Step 6: Location permission request.
struct LocationPermissionPage: View {

    let onAllow: () async -> Void
    let onSkip: () -> Void

    @State private var isVisible = false
    @State private var isRequesting = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 0) {
            // Progress bar
            OnboardingProgressBar(progress: OnboardingStep.locationPermission.progress)
                .padding(.horizontal, 24)
                .padding(.top, 16)

            Spacer()

            // Title and permission card
            VStack(spacing: 32) {
                VStack(spacing: 12) {
                    Text("Location Access")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.center)
                    
                    Text("Caro needs your location to see exactly where planetary lines fall in your current area.")
                        .font(.system(size: 15))
                        .foregroundStyle(.white.opacity(0.5))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                }
                
                // Permission Card
                HStack(spacing: 16) {
                    ZStack {
                        Circle()
                            .fill(Color(red: 0.35, green: 0.65, blue: 0.95).opacity(0.12))
                            .frame(width: 56, height: 56)
                        
                        Image(systemName: "location.fill")
                            .font(.system(size: 24))
                            .foregroundStyle(Color(red: 0.35, green: 0.65, blue: 0.95))
                    }
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Find your lines")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.white)
                        
                        Text("See how your current city aligns with your planetary energies.")
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
                CosmicButton("Allow Location", isLoading: isRequesting) {
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
    LocationPermissionPage(onAllow: {}, onSkip: {})
        .background(Color(red: 0.04, green: 0.06, blue: 0.10))
}
