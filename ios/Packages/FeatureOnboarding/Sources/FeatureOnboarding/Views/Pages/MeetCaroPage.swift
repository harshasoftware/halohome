import SwiftUI

/// Step 1: Meet Caro - AI astrologer introduction with floating tags.
struct MeetCaroPage: View {

    let onContinue: () -> Void

    @State private var isVisible = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Floating feature pills around avatar
            ZStack {
                // Bottom Glow
                Circle()
                    .fill(Color(red: 0.6, green: 0.4, blue: 1.0).opacity(0.15))
                    .frame(width: 250, height: 250)
                    .blur(radius: 50)
                    .offset(y: 60)

                // Caro Image
                Image("caro-astrologer")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(height: 220)
                    .opacity(isVisible ? 1 : 0)
                    .scaleEffect(isVisible ? 1 : 0.95)

                // Floating tags
                FeaturePill(text: "Romance", color: Color(red: 0.96, green: 0.45, blue: 0.71), delay: 0.3, offsetX: -110, offsetY: -50)
                FeaturePill(text: "Career", color: Color(red: 0.35, green: 0.65, blue: 0.95), delay: 0.5, offsetX: 100, offsetY: -80)
                FeaturePill(text: "Travel", color: Color(red: 0.55, green: 0.35, blue: 0.95), delay: 0.7, offsetX: -90, offsetY: 70)
                FeaturePill(text: "Mindset", color: Color(red: 0.20, green: 0.78, blue: 0.60), delay: 0.9, offsetX: 100, offsetY: 40)
            }
            .frame(height: 320)

            Spacer()
                .frame(height: 40)

            // Text content
            VStack(spacing: 12) {
                Text("Meet Caro")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Color.white.opacity(0.4))
                    .textCase(.uppercase)
                    .tracking(1.2)
                    .opacity(isVisible ? 1 : 0)
                
                Text("Your personal astrologer")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .opacity(isVisible ? 1 : 0)
                    .offset(y: isVisible ? 0 : 20)

                Text("Caro reads your chart, your goals, and your locations to explain what your lines actually mean for you.")
                    .font(.system(size: 16))
                    .foregroundStyle(.white.opacity(0.7))
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .padding(.horizontal, 32)
                    .padding(.top, 4)
                    .opacity(isVisible ? 1 : 0)
                    .offset(y: isVisible ? 0 : 15)
            }

            Spacer()

            // CTA
            CosmicButton("Continue", action: onContinue)
                .padding(.horizontal, 24)
                .opacity(isVisible ? 1 : 0)
                .offset(y: isVisible ? 0 : 20)

            Spacer()
                .frame(height: 50)
        }
        .onAppear {
            guard !reduceMotion else {
                isVisible = true
                return
            }

            withAnimation(.easeOut(duration: 0.6).delay(0.2)) {
                isVisible = true
            }
        }
    }
}

#Preview {
    MeetCaroPage {}
        .background(Color(red: 0.05, green: 0.03, blue: 0.08))
}
