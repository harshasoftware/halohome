import SwiftUI
import UIKit

/// Step 2: Pronouns selection page.
struct PronounsPage: View {

    @Binding var gender: Gender
    let onContinue: () -> Void

    @State private var isVisible = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 0) {
            // Progress bar
            OnboardingProgressBar(progress: OnboardingStep.pronouns.progress)
                .padding(.horizontal, 24)
                .padding(.top, 16)

            Spacer()
                .frame(height: 60)

            // Title
            VStack(spacing: 12) {
                Text("How should we\nrefer to you?")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    
                Text("Choose the pronouns that feel right for you.")
                    .font(.system(size: 15))
                    .foregroundStyle(.white.opacity(0.5))
            }
            .opacity(isVisible ? 1 : 0)
            .offset(y: isVisible ? 0 : 20)

            Spacer()
                .frame(height: 40)

            // Options Wheel
            VStack(spacing: 16) {
                Picker("Pronouns", selection: $gender) {
                    ForEach(Gender.allCases) { option in
                        Text(option.displayText).tag(option)
                    }
                }
                .pickerStyle(.wheel)
                .frame(height: 180)
                .padding(.horizontal, 24)
                
                Text(genderHint(for: gender))
                    .font(.system(size: 13))
                    .foregroundColor(Color(red: 176/255, green: 184/255, blue: 215/255).opacity(0.62))
                    .multilineTextAlignment(.center)
            }
            .opacity(isVisible ? 1 : 0)
            .offset(y: isVisible ? 0 : 10)

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
    
    private func genderHint(for gender: Gender) -> String {
        switch gender {
        case .preferNotToSay:
            return "You can change this anytime"
        default:
            return "Used for personalized language"
        }
    }
}

#Preview {
    @Previewable @State var gender: Gender = .preferNotToSay

    return PronounsPage(gender: $gender) {}
        .background(Color(red: 0.04, green: 0.04, blue: 0.10))
}
