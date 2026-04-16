// MARK: - FeatureOnboarding Public API

// Re-export public types for easy access
@_exported import struct SwiftUI.Color

// MARK: - Models
public typealias OnboardingDataModel = OnboardingData
public typealias LifeGoalModel = LifeGoal
public typealias GenderModel = Gender
public typealias OnboardingStepModel = OnboardingStep
public typealias SubscriptionPlanModel = SubscriptionPlan

// MARK: - Convenience Factory

/// Factory for creating onboarding flow.
public enum OnboardingFactory {

    /// Create the main onboarding container view.
    /// - Parameters:
    ///   - onComplete: Called when user completes onboarding (purchases or skips)
    ///   - onDismiss: Optional callback when user explicitly dismisses
    ///   - requestLocationPermission: Async closure to request location permission
    ///   - requestNotificationPermission: Async closure to request notification permission
    /// - Returns: Configured OnboardingContainerView
    public static func makeOnboardingView(
        onComplete: @escaping (OnboardingData) -> Void,
        onDismiss: (() -> Void)? = nil,
        requestLocationPermission: @escaping () async -> Bool = { true },
        requestNotificationPermission: @escaping () async -> Bool = { true }
    ) -> OnboardingContainerView {
        let viewModel = OnboardingViewModel(
            onComplete: onComplete,
            onDismiss: onDismiss,
            requestLocationPermission: requestLocationPermission,
            requestNotificationPermission: requestNotificationPermission
        )
        return OnboardingContainerView(viewModel: viewModel)
    }

    /// Check if onboarding should be shown.
    public static func shouldShowOnboarding(
        persistence: OnboardingPersistence = OnboardingPersistence()
    ) -> Bool {
        !persistence.hasCompletedOnboarding
    }
}
