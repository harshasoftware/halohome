import SwiftUI
import DesignSystem
import Core
import CoreLocation
import UserNotifications
import FeatureBirthData

/// Full 12-step onboarding flow matching web MobileOnboarding.tsx
/// Dark cosmic theme with functional permissions, birth data entry, and paywall
struct OnboardingContainerView: View {

    let onComplete: () -> Void

    @State private var currentStep: OnboardingStep = .welcome
    @State private var data = OnboardingData()

    // Location permission
    @State private var locationManager = CLLocationManager()
    @State private var locationStatus: String = "idle" // idle, granted, denied

    init(onComplete: @escaping () -> Void) {
        self.onComplete = onComplete
    }

    // MARK: - Body

    var body: some View {
        ZStack {
            // Deep space background
            Color(red: 0.04, green: 0.04, blue: 0.06)
                .ignoresSafeArea()

            // Ambient glow orbs
            cosmicBackground

            VStack(spacing: 0) {
                // Header bar
                if currentStep != .welcome {
                    headerBar
                }

                // Progress bar (steps 1-10)
                if currentStep.showsProgress {
                    progressBar
                        .padding(.horizontal, 24)
                        .padding(.top, 4)
                }

                // Step content
                stepContent
                    .frame(maxWidth: .infinity, maxHeight: .infinity)

                // CTA button (always at bottom except personalizing)
                if currentStep != .personalizing {
                    ctaButton
                        .padding(.horizontal, 24)
                        .padding(.bottom, 40)
                }
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            checkLocationStatus()
        }
    }

    // MARK: - Cosmic Background

    private var cosmicBackground: some View {
        ZStack {
            Circle()
                .fill(Color(hex: "#60A5FA").opacity(0.08))
                .frame(width: 300, height: 300)
                .blur(radius: 80)
                .offset(x: -100, y: -250)
            Circle()
                .fill(Color(hex: "#F472B6").opacity(0.07))
                .frame(width: 250, height: 250)
                .blur(radius: 80)
                .offset(x: 120, y: -180)
            Circle()
                .fill(Color(hex: "#A78BFA").opacity(0.07))
                .frame(width: 280, height: 280)
                .blur(radius: 80)
                .offset(x: 0, y: 100)
        }
        .ignoresSafeArea()
    }

    // MARK: - Header Bar

    private var headerBar: some View {
        HStack {
            // Back
            Button {
                withAnimation(.easeInOut(duration: 0.3)) {
                    goBack()
                }
            } label: {
                Image(systemName: "chevron.left")
                    .font(.body.weight(.medium))
                    .foregroundStyle(.white.opacity(0.6))
                    .frame(width: 44, height: 44)
            }
            .opacity(currentStep.rawValue > 0 ? 1 : 0)

            Spacer()

            // Step label
            Text(currentStep.label.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .tracking(1.5)
                .foregroundStyle(.white.opacity(0.5))

            Spacer()

            // Skip
            Button { onComplete() } label: {
                Text("Skip")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(.white.opacity(0.5))
                    .frame(width: 44, height: 44)
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Progress Bar

    private var progressBar: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.white.opacity(0.08))
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color(hex: "#A78BFA"))
                    .frame(width: geo.size.width * currentStep.progressPercent / 100)
                    .shadow(color: Color(hex: "#A78BFA").opacity(0.35), radius: 8)
                    .animation(.easeInOut(duration: 0.35), value: currentStep)
            }
        }
        .frame(height: 3)
    }

    // MARK: - Step Content

    @ViewBuilder
    private var stepContent: some View {
        switch currentStep {
        case .welcome:
            WelcomeStepView()
                .transition(.opacity)

        case .meetCaro:
            MeetCaroStepView()
                .transition(.opacity)

        case .pronouns:
            PronounsStepView(gender: $data.gender)
                .transition(.opacity)

        case .questionnaire:
            GoalsStepView(selectedGoals: $data.goals, gender: data.gender)
                .transition(.opacity)

        case .birthdate:
            BirthDateStepView(day: $data.birthDay, month: $data.birthMonth, year: $data.birthYear)
                .transition(.opacity)

        case .birthTime:
            BirthTimeStepView(hour: $data.birthHour, minute: $data.birthMinute, amPm: $data.birthAmPm)
                .transition(.opacity)

        case .locationAccess:
            PermissionStepView(
                icon: "location.fill",
                title: "Travel Significance Alerts",
                description: "Enable location to get notified when you enter a powerful planetary zone during travel.",
                hint: "Used for travel/stay notifications and journaling triggers. Your location is never shared.",
                isEnabled: $data.locationReminders,
                onRequestPermission: requestLocationPermission,
                permissionButtonLabel: locationStatus == "granted" ? "GPS Enabled" : "Enable GPS (Optional)"
            )
            .transition(.opacity)

        case .journaling:
            PermissionStepView(
                icon: "book.fill",
                title: "Journaling Prompts",
                description: "Caro generates prompts based on your active planetary lines after you've stayed at a location for 7+ days.",
                hint: "Prompts appear as gentle notifications. You choose when and how to reflect.",
                isEnabled: $data.journalingReminders
            )
            .transition(.opacity)
            .onAppear {
                requestNotificationPermission()
            }

        case .aiTraining:
            PermissionStepView(
                icon: "brain.head.profile",
                title: "Help Improve Caro",
                description: "Anonymized usage patterns help Caro give better recommendations to everyone. No birth data, chart details, or location history are ever shared.",
                hint: "Fully anonymous. No personal identifiers. You can disable this anytime in Settings.",
                isEnabled: $data.aiTraining
            )
            .transition(.opacity)

        case .socialProof:
            SocialProofStepView()
                .transition(.opacity)

        case .personalizing:
            PersonalizingStepView {
                saveOnboardingData()
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                onComplete()
            }
            .transition(.opacity)
        }
    }

    // MARK: - CTA Button

    private var ctaButton: some View {
        Button {
            advanceStep()
        } label: {
            HStack(spacing: 8) {
                Text(ctaLabel)
                    .font(.system(size: 16, weight: .semibold, design: .serif))

                if currentStep == .socialProof {
                    Image(systemName: "arrow.right")
                        .font(.system(size: 14, weight: .semibold))
                }
            }
            .foregroundStyle(Color(red: 0.04, green: 0.04, blue: 0.06))
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(.white)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .shadow(color: .white.opacity(0.16), radius: 10, y: 5)
        }
        .disabled(currentStep == .personalizing)
        .opacity(currentStep == .personalizing ? 0.5 : 1)
    }

    private var ctaLabel: String {
        switch currentStep {
        case .welcome: return "Start Setup"
        case .socialProof: return "Personalize My Experience"
        case .personalizing: return "Personalizing..."
        default: return "Continue"
        }
    }

    // MARK: - Navigation

    private func advanceStep() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()

        Analytics.capture(.onboardingStepCompleted, properties: [
            "step": currentStep.rawValue,
            "step_name": currentStep.label
        ])

        withAnimation(.easeInOut(duration: 0.3)) {
            if let next = OnboardingStep(rawValue: currentStep.rawValue + 1) {
                currentStep = next
            }
        }
    }

    private func goBack() {
        if let prev = OnboardingStep(rawValue: currentStep.rawValue - 1) {
            currentStep = prev
        }
    }

    // MARK: - Notification Permission

    private func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .sound, .badge]
        ) { granted, error in
            if let error {
                AppLogger.error("Notification permission error: \(error.localizedDescription)", category: AppLogger.notifications)
            } else {
                AppLogger.info("Notification permission \(granted ? "granted" : "denied") (from onboarding)", category: AppLogger.notifications)
                if granted {
                    DispatchQueue.main.async {
                        UIApplication.shared.registerForRemoteNotifications()
                    }
                }
            }
        }
    }

    // MARK: - Location Permission

    private func checkLocationStatus() {
        switch locationManager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            locationStatus = "granted"
        case .denied, .restricted:
            locationStatus = "denied"
        default:
            locationStatus = "idle"
        }
    }

    private func requestLocationPermission() {
        locationManager.requestWhenInUseAuthorization()
        // Check after a delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            checkLocationStatus()
        }
    }

    // MARK: - Save Data

    private func saveOnboardingData() {
        // Build birth date from picker values
        var dateComponents = DateComponents()
        dateComponents.year = data.birthYear
        dateComponents.month = data.birthMonth
        dateComponents.day = data.birthDay
        let birthDate = Calendar.current.date(from: dateComponents) ?? Date()

        // Build birth time
        var hour24 = data.birthHour
        if data.birthAmPm == "PM" && hour24 != 12 { hour24 += 12 }
        if data.birthAmPm == "AM" && hour24 == 12 { hour24 = 0 }
        var timeComponents = DateComponents()
        timeComponents.hour = hour24
        timeComponents.minute = data.birthMinute
        let birthTime = Calendar.current.date(from: timeComponents) ?? Date()

        // Create BirthData and save to store as the default chart.
        // Location defaults to 0,0 — user will set their birth city in the app.
        let birthData = BirthData(
            name: data.gender == "She/Her" ? "Me" : (data.gender == "He/Him" ? "Me" : "Me"),
            date: birthDate,
            time: birthTime,
            isTimeUnknown: false,
            latitude: 0,
            longitude: 0,
            placeName: "",
            timezone: .current
        )

        BirthDataStore.shared.saveChart(birthData)
        BirthDataStore.shared.setDefaultChart(birthData)

        Analytics.capture(.birthDataEntered, properties: [
            "birth_year": data.birthYear,
            "goals_count": data.goals.count,
            "goals": Array(data.goals),
            "gender": data.gender,
            "location_reminders": data.locationReminders,
            "journaling_reminders": data.journalingReminders
        ])
        Analytics.capture(.onboardingCompleted)

        // Save preferences
        let defaults = UserDefaults.standard
        defaults.set(data.gender, forKey: "onboarding_gender")
        defaults.set(Array(data.goals), forKey: "onboarding_goals")
        defaults.set(data.locationReminders, forKey: "onboarding_location_reminders")
        defaults.set(data.journalingReminders, forKey: "onboarding_journaling_reminders")
        defaults.set(data.aiTraining, forKey: "onboarding_ai_training")

        AppLogger.info("Onboarding birth data saved: \(data.birthMonth)/\(data.birthDay)/\(data.birthYear) \(data.birthHour):\(String(format: "%02d", data.birthMinute)) \(data.birthAmPm), goals=\(data.goals)", category: AppLogger.ui)
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Full Onboarding") {
    OnboardingContainerView {
        print("Onboarding complete!")
    }
}
#endif
