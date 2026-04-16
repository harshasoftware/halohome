import SwiftUI
import UIKit

/// Step 11: Paywall with subscription options.
/// Integrates with Adapty for payments.
struct PaywallPage: View {

    let onSubscribe: (SubscriptionPlan) -> Void
    let onRestore: () -> Void
    let onClose: () -> Void

    @State private var selectedPlan: SubscriptionPlan = .annual
    @State private var isVisible = false
    @State private var isPurchasing = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 0) {
            // Close button
            HStack {
                Spacer()
                Button(action: onClose) {
                    Image(systemName: "xmark")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(.white.opacity(0.5))
                        .padding(12)
                }
            }
            .padding(.horizontal, 12)

            Spacer()
                .frame(height: 20)

            // Title and trial info
            VStack(spacing: 8) {
                Text("Activate your\ncosmic ritual")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)

                Text("Your 3-day free trial starts now")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(Color(red: 0.2, green: 0.8, blue: 0.6))
            }
            .opacity(isVisible ? 1 : 0)
            .offset(y: isVisible ? 0 : 20)

            Spacer()
                .frame(height: 32)

            // Features
            VStack(alignment: .leading, spacing: 18) {
                FeatureRow(icon: "sparkles", title: "Complete City Discovery", subtitle: "Explore lines in all 8 core energy categories")
                FeatureRow(icon: "magnifyingglass", title: "Unlimited Energy Scouting", subtitle: "Search any city on earth for its planetary lines")
                FeatureRow(icon: "brain.fill", title: "Deep Cosmic Guidance", subtitle: "AI insights on how your transits affect your location")
                FeatureRow(icon: "bell.fill", title: "Real-time Travel Alerts", subtitle: "Get notified when you cross a power line")
            }
            .padding(.horizontal, 32)
            .opacity(isVisible ? 1 : 0)
            .offset(y: isVisible ? 0 : 15)

            Spacer()
                .frame(height: 32)

            // Plan selection
            VStack(spacing: 12) {
                PlanCard(
                    plan: .annual,
                    isSelected: selectedPlan == .annual,
                    action: { selectPlan(.annual) }
                )

                PlanCard(
                    plan: .monthly,
                    isSelected: selectedPlan == .monthly,
                    action: { selectPlan(.monthly) }
                )
            }
            .padding(.horizontal, 24)
            .opacity(isVisible ? 1 : 0)

            Spacer()

            // Subscribe button
            CosmicButton(
                "Start Free Trial",
                isLoading: isPurchasing
            ) {
                isPurchasing = true
                onSubscribe(selectedPlan)
            }
            .padding(.horizontal, 24)
            .opacity(isVisible ? 1 : 0)

            // Legal links
            HStack(spacing: 16) {
                Button("Restore Purchases", action: onRestore)
                    .font(.system(size: 13))
                    .foregroundStyle(.white.opacity(0.4))

                Text("•")
                    .foregroundStyle(.white.opacity(0.2))

                Link("Terms", destination: URL(string: "https://cartostar.app/terms-of-service")!)
                    .font(.system(size: 13))
                    .foregroundStyle(.white.opacity(0.4))

                Text("•")
                    .foregroundStyle(.white.opacity(0.2))

                Link("Privacy", destination: URL(string: "https://cartostar.app/privacy-policy")!)
                    .font(.system(size: 13))
                    .foregroundStyle(.white.opacity(0.4))

                Text("•")
                    .foregroundStyle(.white.opacity(0.2))

                Link("EULA", destination: URL(string: "https://cartostar.app/eula")!)
                    .font(.system(size: 13))
                    .foregroundStyle(.white.opacity(0.4))
            }
            .padding(.top, 16)
            .opacity(isVisible ? 1 : 0)

            Spacer()
                .frame(height: 30)
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

    private func selectPlan(_ plan: SubscriptionPlan) {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
        selectedPlan = plan
    }
}

// MARK: - Subscription Plan

public enum SubscriptionPlan: String, Identifiable {
    case annual
    case monthly

    public var id: String { rawValue }

    var title: String {
        switch self {
        case .annual: return "Annual"
        case .monthly: return "Monthly"
        }
    }

    var price: String {
        switch self {
        case .annual: return "$49.99/year"
        case .monthly: return "$7.99/month"
        }
    }

    var monthlyPrice: String {
        switch self {
        case .annual: return "$4.17/month"
        case .monthly: return "$7.99/month"
        }
    }

    var savings: String? {
        switch self {
        case .annual: return "Save 48%"
        case .monthly: return nil
        }
    }
}

// MARK: - Feature Row

private struct FeatureRow: View {

    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            ZStack {
                Circle()
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 32, height: 32)
                
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundStyle(Color(red: 0.2, green: 0.8, blue: 0.6))
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                
                Text(subtitle)
                    .font(.system(size: 13))
                    .foregroundStyle(.white.opacity(0.5))
            }
        }
    }
}

// MARK: - Plan Card

private struct PlanCard: View {

    let plan: SubscriptionPlan
    let isSelected: Bool
    let action: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(plan.title)
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(.white)

                        if let savings = plan.savings {
                            Text(savings)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(.black)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(
                                    Capsule()
                                        .fill(Color(red: 0.2, green: 0.8, blue: 0.6))
                                )
                        }
                    }

                    Text(plan.monthlyPrice)
                        .font(.system(size: 14))
                        .foregroundStyle(.white.opacity(0.5))
                }

                Spacer()

                Text(plan.price)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(.white)

                ZStack {
                    Circle()
                        .strokeBorder(
                            isSelected ? Color(red: 0.2, green: 0.8, blue: 0.6) : Color.white.opacity(0.2),
                            lineWidth: 2
                        )
                        .frame(width: 24, height: 24)

                    if isSelected {
                        Circle()
                            .fill(Color(red: 0.2, green: 0.8, blue: 0.6))
                            .frame(width: 12, height: 12)
                    }
                }
                .padding(.leading, 12)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 18)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Color.white.opacity(isSelected ? 0.08 : 0.04))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(
                        isSelected ? Color(red: 0.2, green: 0.8, blue: 0.6).opacity(0.5) : Color.white.opacity(0.06),
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
        .buttonStyle(.plain)
        .scaleEffect(isSelected ? 1.02 : 1.0)
        .animation(reduceMotion ? nil : .spring(response: 0.25, dampingFraction: 0.7), value: isSelected)
    }
}

#Preview {
    PaywallPage(onSubscribe: { _ in }, onRestore: {}, onClose: {})
        .background(Color(red: 0.02, green: 0.02, blue: 0.05))
}
