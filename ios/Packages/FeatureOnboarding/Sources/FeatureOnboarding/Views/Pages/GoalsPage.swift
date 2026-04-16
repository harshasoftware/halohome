import SwiftUI

/// Step 3: Multi-select life goals grid.
struct GoalsPage: View {

    @Binding var selectedGoals: Set<LifeGoal>
    let onContinue: () -> Void

    @State private var isVisible = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        VStack(spacing: 0) {
            // Progress bar
            OnboardingProgressBar(progress: OnboardingStep.goals.progress)
                .padding(.horizontal, 24)
                .padding(.top, 16)

            Spacer()
                .frame(height: 40)

            // Title
            VStack(spacing: 12) {
                Text("What do you want\nto transform?")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)

                Text("Choose one or more goals to tune your AI astrologer.")
                    .font(.system(size: 15))
                    .foregroundStyle(.white.opacity(0.5))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)
            }
            .opacity(isVisible ? 1 : 0)
            .offset(y: isVisible ? 0 : 20)

            // Meta Bar
            HStack {
                Text("Select your priorities")
                    .font(.system(size: 12, weight: .semibold))
                    .textCase(.uppercase)
                    .tracking(1)
                    .foregroundStyle(Color.white.opacity(0.4))
                Spacer()
                Text("\(selectedGoals.count) selected")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Color(red: 167/255, green: 139/255, blue: 250/255))
            }
            .padding(.horizontal, 24)
            .padding(.top, 32)
            .padding(.bottom, 12)
            .opacity(isVisible ? 1 : 0)

            // Goals List
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 12) {
                    ForEach(LifeGoal.allCases) { goal in
                        GoalOptionCard(
                            goal: goal,
                            isSelected: selectedGoals.contains(goal),
                            action: { toggleGoal(goal) }
                        )
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 20)
            }
            .opacity(isVisible ? 1 : 0)

            // CTA
            CosmicButton(
                "Continue",
                isDisabled: selectedGoals.isEmpty,
                action: onContinue
            )
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

    private func toggleGoal(_ goal: LifeGoal) {
        if selectedGoals.contains(goal) {
            selectedGoals.remove(goal)
        } else {
            selectedGoals.insert(goal)
        }
    }
}

#Preview {
    @Previewable @State var goals: Set<LifeGoal> = [.career]

    return GoalsPage(selectedGoals: $goals) {}
        .background(Color(red: 0.06, green: 0.03, blue: 0.12))
}
