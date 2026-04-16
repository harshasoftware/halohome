import SwiftUI

/// Step 4: Birth date picker.
struct BirthDatePage: View {

    @Binding var birthDate: Date?
    let onContinue: () -> Void

    @State private var selectedDate = Calendar.current.date(byAdding: .year, value: -25, to: Date()) ?? Date()
    @State private var isVisible = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 0) {
            // Progress bar
            OnboardingProgressBar(progress: OnboardingStep.birthDate.progress)
                .padding(.horizontal, 24)
                .padding(.top, 16)

            Spacer()
                .frame(height: 60)

            // Title
            VStack(spacing: 12) {
                Text("Your journey\nbegan...")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)

                Text("Your birth date determines your primary planetary positions.")
                    .font(.system(size: 15))
                    .foregroundStyle(.white.opacity(0.5))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }
            .opacity(isVisible ? 1 : 0)
            .offset(y: isVisible ? 0 : 20)

            Spacer()
                .frame(height: 40)

            // Date picker
            DatePicker(
                "",
                selection: $selectedDate,
                in: ...Date(),
                displayedComponents: .date
            )
            .datePickerStyle(.wheel)
            .labelsHidden()
            .colorScheme(.dark)
            .opacity(isVisible ? 1 : 0)
            .onChange(of: selectedDate) { _, newValue in
                birthDate = newValue
            }

            Spacer()

            // CTA
            CosmicButton("Continue", action: {
                birthDate = selectedDate
                onContinue()
            })
            .padding(.horizontal, 24)
            .opacity(isVisible ? 1 : 0)

            Spacer()
                .frame(height: 50)
        }
        .onAppear {
            if let existing = birthDate {
                selectedDate = existing
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
}

#Preview {
    @Previewable @State var date: Date? = nil

    return BirthDatePage(birthDate: $date) {}
        .background(Color(red: 0.08, green: 0.04, blue: 0.14))
}
