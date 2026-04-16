import SwiftUI
import ConfettiSwiftUI

/// Main container that wraps the onboarding pages with custom cosmic transitions.
public struct OnboardingContainerView: View {

    @Bindable var viewModel: OnboardingViewModel
    @State private var confettiCounter = 0

    public init(viewModel: OnboardingViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        ZStack {
            // Persistent Cosmic Background
            OnboardingBackground()
            
            VStack(spacing: 0) {
                // Header (Skip / Back)
                if viewModel.currentStep != .welcome && viewModel.currentStep != .loading && viewModel.currentStep != .paywall {
                    headerView
                        .padding(.horizontal, 16)
                        .padding(.top, 10)
                        .padding(.bottom, 4)
                }

                // Page Content
                ZStack {
                    ForEach(OnboardingStep.allCases) { step in
                        if viewModel.currentStep == step {
                            pageView(for: step)
                                .transition(.asymmetric(
                                    insertion: .move(edge: .bottom).combined(with: .opacity),
                                    removal: .move(edge: .top).combined(with: .opacity)
                                ))
                                .id(step.rawValue)
                        }
                    }
                }
                .animation(.easeInOut(duration: 0.4), value: viewModel.currentStep)
            }

            // Confetti on completion
            ConfettiCannon(
                counter: $confettiCounter,
                num: 50,
                colors: [
                    Color(red: 0.96, green: 0.62, blue: 0.05),
                    Color(red: 0.6, green: 0.4, blue: 1.0),
                    Color(red: 0.2, green: 0.8, blue: 0.6)
                ],
                confettiSize: 10,
                rainHeight: 800,
                radius: 400
            )
        }
        .ignoresSafeArea(.keyboard)
        .preferredColorScheme(.dark)
        .onChange(of: viewModel.showConfetti) { _, show in
            if show {
                confettiCounter += 1
            }
        }
    }
    
    // MARK: - Header
    
    @ViewBuilder
    private var headerView: some View {
        HStack {
            // Back Button
            Button(action: {
                viewModel.goToPrevious()
            }) {
                Image(systemName: "arrow.left")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 36, height: 36)
                    .background(Color.white.opacity(0.04))
                    .overlay(
                        Circle().stroke(Color.white.opacity(0.12), lineWidth: 1)
                    )
                    .clipShape(Circle())
            }
            .opacity(viewModel.currentStep.rawValue > OnboardingStep.welcome.rawValue ? 1 : 0.3)
            .disabled(viewModel.currentStep.rawValue <= OnboardingStep.welcome.rawValue)
            
            Spacer()
            
            // Step Label
            Text(stepLabel(for: viewModel.currentStep))
                .font(.system(size: 12, weight: .bold))
                .textCase(.uppercase)
                .tracking(1.2)
                .foregroundColor(Color(red: 235/255, green: 239/255, blue: 255/255).opacity(0.7))
            
            Spacer()
            
            // Skip Button
            Button(action: {
                viewModel.goToStep(.paywall)
            }) {
                Text("Skip")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(Color(red: 176/255, green: 184/255, blue: 215/255).opacity(0.62))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 7)
                    .background(Color.white.opacity(0.04))
                    .overlay(
                        Capsule().stroke(Color.white.opacity(0.12), lineWidth: 1)
                    )
                    .clipShape(Capsule())
            }
        }
    }
    
    private func stepLabel(for step: OnboardingStep) -> String {
        switch step {
        case .welcome: return "Welcome"
        case .meetCaro: return "Meet Caro"
        case .pronouns: return "Pronouns"
        case .goals: return "Questionnaire"
        case .birthDate: return "Birthdate"
        case .birthTime: return "Birth Time"
        case .locationPermission: return "Location Access"
        case .journaling: return "Journaling"
        case .aiTraining: return "AI Training"
        case .socialProof: return "Social Proof"
        case .loading: return "Personalizing"
        case .paywall: return "Upgrade"
        }
    }



    @ViewBuilder
    private func pageView(for step: OnboardingStep) -> some View {
        switch step {
        case .welcome:
            WelcomePage(onContinue: viewModel.goToNext)

        case .meetCaro:
            MeetCaroPage(onContinue: viewModel.goToNext)

        case .pronouns:
            PronounsPage(gender: $viewModel.data.gender, onContinue: viewModel.goToNext)

        case .goals:
            GoalsPage(selectedGoals: $viewModel.data.goals, onContinue: viewModel.goToNext)

        case .birthDate:
            BirthDatePage(birthDate: $viewModel.data.birthDate, onContinue: viewModel.goToNext)

        case .birthTime:
            BirthTimePage(birthTime: $viewModel.data.birthTime, onContinue: viewModel.goToNext)

        case .locationPermission:
            LocationPermissionPage(
                onAllow: viewModel.requestLocation,
                onSkip: viewModel.skipLocationPermission
            )

        case .journaling:
            JournalingPage(
                onAllow: viewModel.requestNotifications,
                onSkip: viewModel.skipNotificationPermission
            )

        case .aiTraining:
            AITrainingPage(
                aiTrainingOptIn: $viewModel.data.aiTrainingOptIn,
                onContinue: viewModel.goToNext
            )

        case .socialProof:
            SocialProofPage(onContinue: viewModel.goToNext)

        case .loading:
            LoadingPage(onComplete: viewModel.goToNext)

        case .paywall:
            PaywallPage(
                onSubscribe: { plan in
                    // Handle subscription through Adapty
                    viewModel.completeOnboarding()
                },
                onRestore: {
                    // Handle restore purchases
                },
                onClose: viewModel.dismiss
            )
        }
    }
}

// MARK: - Preview

#Preview {
    OnboardingContainerView(
        viewModel: OnboardingViewModel(
            onComplete: { _ in },
            onDismiss: {}
        )
    )
}
