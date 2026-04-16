import SwiftUI

/// Step 5: Birth time picker.
struct BirthTimePage: View {

    @Binding var birthTime: Date?
    let onContinue: () -> Void

    @State private var selectedTime = Calendar.current.date(from: DateComponents(hour: 12, minute: 0)) ?? Date()
    @State private var isVisible = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 0) {
            // Progress bar
            OnboardingProgressBar(progress: OnboardingStep.birthTime.progress)
                .padding(.horizontal, 24)
                .padding(.top, 16)

            Spacer()
                .frame(height: 60)

            // Title
            VStack(spacing: 12) {
                Text("The exact\nmoment...")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)

                Text("Birth time unlocks the precision of your rising sign and houses.")
                    .font(.system(size: 15))
                    .foregroundStyle(.white.opacity(0.5))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }
            .opacity(isVisible ? 1 : 0)
            .offset(y: isVisible ? 0 : 20)

            Spacer()
                .frame(height: 40)

            // Time picker
            DatePicker(
                "",
                selection: $selectedTime,
                displayedComponents: .hourAndMinute
            )
            .datePickerStyle(.wheel)
            .labelsHidden()
            .colorScheme(.dark)
            .opacity(isVisible ? 1 : 0)
            .onChange(of: selectedTime) { _, newValue in
                birthTime = newValue
            }

            // Unknown time option
            Button(action: useDefaultTime) {
                Text("I don't know my exact time")
                    .font(.system(size: 14))
                    .foregroundStyle(.white.opacity(0.5))
            }
            .padding(.top, 16)
            .opacity(isVisible ? 1 : 0)

            Spacer()

            // CTA
            CosmicButton("Continue", action: {
                birthTime = selectedTime
                onContinue()
            })
            .padding(.horizontal, 24)
            .opacity(isVisible ? 1 : 0)

            Spacer()
                .frame(height: 50)
        }
        .onAppear {
            if let existing = birthTime {
                selectedTime = existing
            }

            guard !reduceMotion else {
                isVisible = true
                return
            }

            withAnimation(.easeOut(duration: 0.5).delay(0.1)) {
                isVisible = true
            }
        }
    }

    private func useDefaultTime() {
        selectedTime = Calendar.current.date(from: DateComponents(hour: 12, minute: 0)) ?? Date()
        birthTime = selectedTime
        onContinue()
    }
}

#Preview {
    @Previewable @State var time: Date? = nil

    return BirthTimePage(birthTime: $time) {}
        .background(Color(red: 0.06, green: 0.05, blue: 0.12))
}
