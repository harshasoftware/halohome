import SwiftUI
import Observation

/// Central state manager for the 12-step onboarding flow.
@Observable
public final class OnboardingViewModel {

    // MARK: - State

    public private(set) var currentStep: OnboardingStep = .welcome
    public var data: OnboardingData = OnboardingData()
    public var isLoading: Bool = false
    public var showConfetti: Bool = false

    // MARK: - Dependencies

    private let onComplete: (OnboardingData) -> Void
    private let onDismiss: (() -> Void)?
    private let requestLocationPermission: () async -> Bool
    private let requestNotificationPermission: () async -> Bool

    // MARK: - Initialization

    public init(
        onComplete: @escaping (OnboardingData) -> Void,
        onDismiss: (() -> Void)? = nil,
        requestLocationPermission: @escaping () async -> Bool = { true },
        requestNotificationPermission: @escaping () async -> Bool = { true }
    ) {
        self.onComplete = onComplete
        self.onDismiss = onDismiss
        self.requestLocationPermission = requestLocationPermission
        self.requestNotificationPermission = requestNotificationPermission
    }

    // MARK: - Navigation

    public func goToNext() {
        guard let nextStep = OnboardingStep(rawValue: currentStep.rawValue + 1) else {
            return
        }

        if currentStep == .loading {
            // Loading step auto-advances after animation
            return
        }

        withAnimation(.easeInOut(duration: 0.3)) {
            currentStep = nextStep
        }

        // Handle special step behaviors
        handleStepEntry(nextStep)
    }

    public func goToPrevious() {
        guard let previousStep = OnboardingStep(rawValue: currentStep.rawValue - 1),
              previousStep.rawValue >= OnboardingStep.pronouns.rawValue else {
            return
        }

        withAnimation(.easeInOut(duration: 0.3)) {
            currentStep = previousStep
        }
    }

    public func goToStep(_ step: OnboardingStep) {
        withAnimation(.easeInOut(duration: 0.3)) {
            currentStep = step
        }
        handleStepEntry(step)
    }

    // MARK: - Step Actions

    private func handleStepEntry(_ step: OnboardingStep) {
        switch step {
        case .loading:
            break
        case .paywall:
            break
        default:
            break
        }
    }



    // MARK: - Location Permission

    public func requestLocation() async {
        let granted = await requestLocationPermission()
        data.locationRemindersEnabled = granted
        goToNext()
    }

    public func skipLocationPermission() {
        data.locationRemindersEnabled = false
        goToNext()
    }

    // MARK: - Notification Permission

    public func requestNotifications() async {
        let granted = await requestNotificationPermission()
        data.journalingRemindersEnabled = granted
        goToNext()
    }

    public func skipNotificationPermission() {
        data.journalingRemindersEnabled = false
        goToNext()
    }

    // MARK: - Goal Selection

    public func toggleGoal(_ goal: LifeGoal) {
        if data.goals.contains(goal) {
            data.goals.remove(goal)
        } else {
            data.goals.insert(goal)
        }
    }

    // MARK: - Completion

    public func completeOnboarding() {
        showConfetti = true

        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(1500))
            onComplete(data)
        }
    }

    public func dismiss() {
        onDismiss?()
    }

    // MARK: - Validation

    public var canProceed: Bool {
        switch currentStep {
        case .welcome, .meetCaro, .socialProof:
            return true
        case .pronouns:
            return true // Default is .preferNotToSay
        case .goals:
            return data.hasGoals
        case .birthDate:
            return data.birthDate != nil
        case .birthTime:
            return data.birthTime != nil
        case .locationPermission, .journaling, .aiTraining:
            return true
        case .loading:
            return false
        case .paywall:
            return true
        }
    }

    // MARK: - Page Data for ConcentricOnboarding

    public var allSteps: [OnboardingStep] {
        OnboardingStep.allCases
    }
}
