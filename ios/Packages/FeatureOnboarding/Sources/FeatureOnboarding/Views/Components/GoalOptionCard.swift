import SwiftUI
import UIKit

/// Selection card for life goals with animated selection state.
public struct GoalOptionCard: View {

    let goal: LifeGoal
    let isSelected: Bool
    let action: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(goal: LifeGoal, isSelected: Bool, action: @escaping () -> Void) {
        self.goal = goal
        self.isSelected = isSelected
        self.action = action
    }

    public var body: some View {
        Button(action: handleTap) {
            HStack(spacing: 16) {
                // Icon
                ZStack {
                    Circle()
                        .fill(goal.color.opacity(isSelected ? 0.25 : 0.12))
                        .frame(width: 44, height: 44)

                    Image(systemName: goal.icon)
                        .font(.system(size: 18))
                        .foregroundStyle(goal.color)
                }
                
                // Text
                VStack(alignment: .leading, spacing: 4) {
                    Text(goal.title)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.white)

                    Text(goal.subtitle)
                        .font(.system(size: 12))
                        .foregroundStyle(.white.opacity(0.6))
                        .lineLimit(2)
                }
                
                Spacer()
                
                // Check circle
                ZStack {
                    Circle()
                        .strokeBorder(
                            isSelected ? goal.color : Color.white.opacity(0.15),
                            lineWidth: isSelected ? 2 : 1
                        )
                        .frame(width: 24, height: 24)

                    if isSelected {
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(goal.color)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Color.white.opacity(isSelected ? 0.1 : 0.04))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(
                        isSelected ? goal.color.opacity(0.6) : Color.white.opacity(0.08),
                        lineWidth: isSelected ? 2 : 1
                    )
            )
            .scaleEffect(isSelected ? 1.02 : 1.0)
            .animation(reduceMotion ? nil : .spring(response: 0.25, dampingFraction: 0.7), value: isSelected)
        }
        .buttonStyle(.plain)
    }

    private func handleTap() {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
        action()
    }
}

#Preview {
    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
        ForEach(LifeGoal.allCases) { goal in
            GoalOptionCard(goal: goal, isSelected: goal == .career || goal == .love) {}
        }
    }
    .padding(24)
    .background(Color(red: 0.02, green: 0.02, blue: 0.05))
}
