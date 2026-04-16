import SwiftUI

/// Step 0: Welcome page with "Navigate Your Cosmic Destiny" + OrbitingPlanets.
struct WelcomePage: View {

    let onContinue: () -> Void

    @State private var isVisible = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Orbiting planets animation
            ZStack {
                OrbitingPlanetsView()

                // Center globe icon inside the glowing sun layout
                VStack(spacing: 4) {
                    Text("CARTOSTAR")
                        .font(.custom("Cinzel-Bold", size: 24, relativeTo: .title))
                        .textCase(.uppercase)
                        .tracking(3.5)
                        .foregroundStyle(Color(red: 245/255, green: 247/255, blue: 255/255).opacity(0.95))
                        .minimumScaleFactor(0.8)

                    Text("Navigate Your Cosmic Destiny")
                        .font(.system(size: 20, weight: .bold))
                        .fontDesign(.serif)
                        .foregroundStyle(.white)

                    Text("Personalized astrocartography setup in under a minute.")
                        .font(.system(size: 14))
                        .foregroundStyle(Color(red: 226/255, green: 230/255, blue: 246/255).opacity(0.74))
                        .multilineTextAlignment(.center)
                        .padding(.top, 4)
                        
                    // Chip Row
                    HStack(spacing: 8) {
                        chipView("3D Globe")
                        chipView("AI Astrologer")
                        chipView("Duo Compatibility")
                    }
                    .padding(.top, 14)
                }
                .opacity(isVisible ? 1 : 0)
                .scaleEffect(isVisible ? 1 : 0.8)
                .padding(.horizontal, 24)
            }
            .frame(height: 380)

            Spacer()

            // CTA
            CosmicButton("Start Setup", action: onContinue)
                .padding(.horizontal, 24)
                .opacity(isVisible ? 1 : 0)
                .offset(y: isVisible ? 0 : 20)
                .padding(.bottom, 34)
        }
        .onAppear {
            guard !reduceMotion else {
                isVisible = true
                return
            }

            withAnimation(.easeOut(duration: 0.8).delay(0.3)) {
                isVisible = true
            }
        }
    }
    
    @ViewBuilder
    private func chipView(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 11.5))
            .foregroundColor(Color(red: 245/255, green: 247/255, blue: 255/255).opacity(0.9))
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(Color.white.opacity(0.05))
            .overlay(
                Capsule().stroke(Color.white.opacity(0.14), lineWidth: 1)
            )
            .clipShape(Capsule())
    }
}

#Preview {
    WelcomePage {}
        .background(Color(red: 0.02, green: 0.02, blue: 0.05))
}
