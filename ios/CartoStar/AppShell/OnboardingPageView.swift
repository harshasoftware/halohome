import SwiftUI
import DesignSystem
import CoreLocation

// MARK: - Step 0: Welcome

struct WelcomeStepView: View {
    var body: some View {
        VStack(spacing: 20) {
            Spacer()

            CanvasOrrery()
                .frame(height: 260)

            VStack(spacing: 10) {
                Text("HaloHome")
                    .font(.system(size: 34, weight: .bold, design: .serif))
                    .foregroundStyle(.white)

                Text("Navigate Your Cosmic Destiny")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(Color(hex: "#F59E0B"))

                Text("Personalized astrocartography setup\nin under a minute.")
                    .font(.system(size: 15))
                    .foregroundStyle(.white.opacity(0.74))
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .padding(.top, 2)
            }

            HStack(spacing: 8) {
                chipWithIcon("globe.americas.fill", "3D Globe", "#60A5FA")
                chipWithIcon("sparkles", "AI Astrologer", "#A78BFA")
                chipWithIcon("person.2.fill", "Duo Mode", "#F472B6")
            }
            .padding(.top, 4)

            Spacer()
        }
    }

    private func chipWithIcon(_ icon: String, _ text: String, _ hex: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 9))
            Text(text)
                .font(.system(size: 11, weight: .semibold))
        }
        .foregroundStyle(Color(hex: hex))
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color(hex: hex).opacity(0.12))
        .overlay(Capsule().stroke(Color(hex: hex).opacity(0.3), lineWidth: 1))
        .clipShape(Capsule())
    }
}

// MARK: - Step 1: Meet Caro

struct MeetCaroStepView: View {
    var body: some View {
        VStack(spacing: 16) {
            Spacer()

            ZStack {
                // Pink glow
                Circle()
                    .fill(RadialGradient(colors: [Color(hex: "#F472B6").opacity(0.18), .clear],
                                         center: .center, startRadius: 40, endRadius: 140))
                    .frame(width: 280, height: 280)

                // Caro portrait with ornate frame
                Image("caro-astrologer")
                    .resizable()
                    .scaledToFill()
                    .frame(width: 180, height: 210)
                    .clipShape(UnevenRoundedRectangle(
                        topLeadingRadius: 48, bottomLeadingRadius: 42,
                        bottomTrailingRadius: 42, topTrailingRadius: 48))
                    .overlay(
                        UnevenRoundedRectangle(
                            topLeadingRadius: 48, bottomLeadingRadius: 42,
                            bottomTrailingRadius: 42, topTrailingRadius: 48)
                        .stroke(
                            LinearGradient(colors: [Color(hex: "#F472B6").opacity(0.5), Color(hex: "#A78BFA").opacity(0.3)],
                                          startPoint: .topLeading, endPoint: .bottomTrailing),
                            lineWidth: 1.5)
                    )
                    .shadow(color: Color(hex: "#F472B6").opacity(0.3), radius: 20)

                // Frosted story tags (matching web positioned badges)
                storyTag("Romance", icon: "heart.fill", color: "#F472B6", x: -90, y: -75)
                storyTag("Career", icon: "briefcase.fill", color: "#60A5FA", x: 90, y: -55)
                storyTag("Travel", icon: "airplane", color: "#A78BFA", x: -85, y: 75)
                storyTag("Mindset", icon: "brain.head.profile", color: "#10B981", x: 85, y: 85)
            }
            .frame(height: 290)

            VStack(spacing: 10) {
                Text("Your personal astrologer")
                    .font(.system(size: 24, weight: .bold, design: .serif))
                    .foregroundStyle(.white)

                Text("Caro reads your chart, your goals, and your locations to explain what your lines actually mean for you.")
                    .font(.system(size: 14.5))
                    .foregroundStyle(.white.opacity(0.74))
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .padding(.horizontal, 24)
            }

            Spacer()
        }
    }

    private func storyTag(_ text: String, icon: String, color: String, x: CGFloat, y: CGFloat) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 8))
            Text(text)
                .font(.system(size: 10, weight: .semibold))
        }
        .foregroundStyle(.white.opacity(0.9))
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(.ultraThinMaterial)
        .overlay(Capsule().stroke(Color(hex: color).opacity(0.5), lineWidth: 1))
        .clipShape(Capsule())
        .shadow(color: Color(hex: color).opacity(0.3), radius: 8)
        .offset(x: x, y: y)
    }
}

// MARK: - Step 2: Pronouns

struct PronounsStepView: View {
    @Binding var gender: String

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Color(hex: "#60A5FA").opacity(0.1))
                    .frame(width: 80, height: 80)
                Image(systemName: "person.crop.circle")
                    .font(.system(size: 36))
                    .foregroundStyle(Color(hex: "#60A5FA"))
            }

            Text("How should Caro address you?")
                .font(.system(size: 22, weight: .bold, design: .serif))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)

            Picker("Pronouns", selection: $gender) {
                ForEach(genderOptions, id: \.self) { option in
                    Text(option).tag(option)
                }
            }
            .pickerStyle(.wheel)
            .frame(height: 150)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.white.opacity(0.04))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.white.opacity(0.08), lineWidth: 1))
            )
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .padding(.horizontal, 48)

            Spacer()
            Spacer()
        }
    }
}

// MARK: - Step 3: Goals Questionnaire

struct GoalsStepView: View {
    @Binding var selectedGoals: Set<String>
    let gender: String

    private let columns = [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)]
    private let rowCount: CGFloat = 3
    private let gridSpacing: CGFloat = 8

    var body: some View {
        GeometryReader { geo in
            let headerHeight: CGFloat = 90
            let availableHeight = geo.size.height - headerHeight
            let cardHeight = max(90, (availableHeight - gridSpacing * (rowCount - 1)) / rowCount)

            VStack(spacing: 10) {
                VStack(spacing: 6) {
                    Text("What do you want to transform?")
                        .font(.system(size: 22, weight: .bold, design: .serif))
                        .foregroundStyle(.white)

                    Text("Choose one or more goals to tune your AI astrologer.")
                        .font(.system(size: 14))
                        .foregroundStyle(.white.opacity(0.6))

                    HStack {
                        Text("Select your priorities")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.white.opacity(0.4))
                        Spacer()
                        Text("\(selectedGoals.count) selected")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(.white.opacity(0.5))
                    }
                    .padding(.horizontal, 4)
                    .padding(.top, 4)
                }

                LazyVGrid(columns: columns, spacing: gridSpacing) {
                    ForEach(OnboardingGoal.allGoals) { goal in
                        goalCard(goal, height: cardHeight)
                    }
                }
                .padding(.horizontal, 12)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private func goalCard(_ goal: OnboardingGoal, height: CGFloat) -> some View {
        let isSelected = selectedGoals.contains(goal.id)
        let isFemale = gender == "She/Her"
        let bgImage = isFemale ? goal.femaleImage : goal.maleImage
        let tone = Color(hex: goal.toneHex)

        return Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                if isSelected { selectedGoals.remove(goal.id) } else { selectedGoals.insert(goal.id) }
            }
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        } label: {
            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 18)
                    .fill(
                        isSelected
                        ? AnyShapeStyle(LinearGradient(
                            colors: [tone.opacity(0.35), tone.opacity(0.12)],
                            startPoint: .topLeading, endPoint: .bottomTrailing))
                        : AnyShapeStyle(LinearGradient(
                            colors: [Color.white.opacity(0.09), Color.white.opacity(0.03)],
                            startPoint: .top, endPoint: .bottom))
                    )
                    .overlay(
                        RadialGradient(colors: [tone.opacity(isSelected ? 0.3 : 0.15), .clear],
                                       center: .topLeading, startRadius: 0, endRadius: 100)
                        .clipShape(RoundedRectangle(cornerRadius: 18))
                    )

                RoundedRectangle(cornerRadius: 18)
                    .stroke(isSelected ? tone.opacity(0.9) : tone.opacity(0.35), lineWidth: isSelected ? 1.5 : 1)

                VStack(alignment: .leading, spacing: 8) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 10)
                            .fill(isSelected ? tone : tone.opacity(0.1))
                            .frame(width: 24, height: 24)
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(isSelected ? tone : tone.opacity(0.6), lineWidth: 1)
                            .frame(width: 24, height: 24)
                        Image(systemName: goal.icon)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(isSelected ? .white : tone)
                    }
                    .shadow(color: .black.opacity(0.2), radius: 6, y: 3)

                    Text(goal.label)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(.white.opacity(0.95))
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }
                .padding(10)

                ZStack {
                    Circle()
                        .stroke(isSelected ? .clear : Color.white.opacity(0.3), lineWidth: 1)
                        .frame(width: 20, height: 20)
                    if isSelected {
                        Circle().fill(tone).frame(width: 20, height: 20)
                        Image(systemName: "checkmark")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(.white)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
                .padding(.trailing, 8)
                .padding(.top, 8)

                if let img = bgImage {
                    Image(img)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 110, height: 110)
                        .mask(
                            LinearGradient(colors: [.clear, .clear, .black.opacity(0.7), .black],
                                          startPoint: .topLeading, endPoint: .bottomTrailing)
                        )
                        .opacity(isSelected ? 0.9 : 0.5)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                        .clipped()
                }
            }
            .frame(height: height)
            .clipShape(RoundedRectangle(cornerRadius: 18))
            .shadow(color: isSelected ? tone.opacity(0.25) : .clear, radius: 12, y: 6)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Step 4: Birth Date

struct BirthDateStepView: View {
    @Binding var day: Int
    @Binding var month: Int
    @Binding var year: Int

    var body: some View {
        VStack(spacing: 20) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Color(hex: "#A78BFA").opacity(0.1))
                    .frame(width: 70, height: 70)
                Image(systemName: "calendar")
                    .font(.system(size: 30))
                    .foregroundStyle(Color(hex: "#A78BFA"))
            }

            Text("When were you born?")
                .font(.system(size: 22, weight: .bold, design: .serif))
                .foregroundStyle(.white)

            Text("Your birth date is the foundation of your natal chart.")
                .font(.system(size: 14))
                .foregroundStyle(.white.opacity(0.6))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)

            // Drum picker with center highlight
            ZStack {
                HStack(spacing: 0) {
                    Picker("Day", selection: $day) {
                        ForEach(dayRange, id: \.self) { d in
                            Text("\(d)").tag(d)
                        }
                    }
                    .pickerStyle(.wheel)
                    .frame(maxWidth: .infinity)
                    .clipped()

                    Rectangle().fill(Color.white.opacity(0.1)).frame(width: 1)

                    Picker("Month", selection: $month) {
                        ForEach(1...12, id: \.self) { m in
                            Text(monthNames[m - 1]).tag(m)
                        }
                    }
                    .pickerStyle(.wheel)
                    .frame(maxWidth: .infinity)
                    .clipped()

                    Rectangle().fill(Color.white.opacity(0.1)).frame(width: 1)

                    Picker("Year", selection: $year) {
                        ForEach(yearRange, id: \.self) { y in
                            Text(String(y)).tag(y)
                        }
                    }
                    .pickerStyle(.wheel)
                    .frame(maxWidth: .infinity)
                    .clipped()
                }

                // Center selection highlight bar
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.white.opacity(0.12), lineWidth: 1)
                    .frame(height: 36)
                    .allowsHitTesting(false)
            }
            .frame(height: 200)
            .background(
                RoundedRectangle(cornerRadius: 18)
                    .fill(Color.white.opacity(0.04))
                    .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.white.opacity(0.08), lineWidth: 1))
            )
            .clipShape(RoundedRectangle(cornerRadius: 18))
            // Top/bottom fade mask
            .mask(
                VStack(spacing: 0) {
                    LinearGradient(colors: [.clear, .black], startPoint: .top, endPoint: .bottom)
                        .frame(height: 30)
                    Rectangle().fill(.black)
                    LinearGradient(colors: [.black, .clear], startPoint: .top, endPoint: .bottom)
                        .frame(height: 30)
                }
            )
            .padding(.horizontal, 24)

            Text("Scroll each column to set your birth date")
                .font(.system(size: 12))
                .foregroundStyle(.white.opacity(0.4))

            Spacer()
            Spacer()
        }
    }
}

// MARK: - Step 5: Birth Time

struct BirthTimeStepView: View {
    @Binding var hour: Int
    @Binding var minute: Int
    @Binding var amPm: String

    var body: some View {
        VStack(spacing: 20) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Color(hex: "#60A5FA").opacity(0.1))
                    .frame(width: 70, height: 70)
                Image(systemName: "clock.fill")
                    .font(.system(size: 30))
                    .foregroundStyle(Color(hex: "#60A5FA"))
            }

            Text("What time were you born?")
                .font(.system(size: 22, weight: .bold, design: .serif))
                .foregroundStyle(.white)

            Text("Scroll each column to set your birth time")
                .font(.system(size: 14))
                .foregroundStyle(.white.opacity(0.6))

            ZStack {
                HStack(spacing: 0) {
                    Picker("Hour", selection: $hour) {
                        ForEach(hourRange, id: \.self) { h in
                            Text("\(h)").tag(h)
                        }
                    }
                    .pickerStyle(.wheel)
                    .frame(maxWidth: .infinity)
                    .clipped()

                    Rectangle().fill(Color.white.opacity(0.1)).frame(width: 1)

                    Picker("Minute", selection: $minute) {
                        ForEach(minuteRange, id: \.self) { m in
                            Text(String(format: "%02d", m)).tag(m)
                        }
                    }
                    .pickerStyle(.wheel)
                    .frame(maxWidth: .infinity)
                    .clipped()

                    Rectangle().fill(Color.white.opacity(0.1)).frame(width: 1)

                    Picker("AM/PM", selection: $amPm) {
                        ForEach(ampmOptions, id: \.self) { a in
                            Text(a).tag(a)
                        }
                    }
                    .pickerStyle(.wheel)
                    .frame(maxWidth: .infinity)
                    .clipped()
                }

                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.white.opacity(0.12), lineWidth: 1)
                    .frame(height: 36)
                    .allowsHitTesting(false)
            }
            .frame(height: 200)
            .background(
                RoundedRectangle(cornerRadius: 18)
                    .fill(Color.white.opacity(0.04))
                    .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.white.opacity(0.08), lineWidth: 1))
            )
            .clipShape(RoundedRectangle(cornerRadius: 18))
            .mask(
                VStack(spacing: 0) {
                    LinearGradient(colors: [.clear, .black], startPoint: .top, endPoint: .bottom).frame(height: 30)
                    Rectangle().fill(.black)
                    LinearGradient(colors: [.black, .clear], startPoint: .top, endPoint: .bottom).frame(height: 30)
                }
            )
            .padding(.horizontal, 24)

            Button {
                hour = 12; minute = 0; amPm = "PM"
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "questionmark.circle")
                        .font(.system(size: 13))
                    Text("I don\u{2019}t know my exact time")
                        .font(.system(size: 13, weight: .medium))
                }
                .foregroundStyle(Color(hex: "#60A5FA"))
            }

            Spacer()
            Spacer()
        }
    }
}

// MARK: - Steps 6-8: Permission Cards

struct PermissionStepView: View {
    let icon: String
    let title: String
    let description: String
    let hint: String
    @Binding var isEnabled: Bool
    var onRequestPermission: (() -> Void)?
    var permissionButtonLabel: String?
    var toneHex: String = "#A78BFA"

    var body: some View {
        VStack(spacing: 20) {
            Spacer()

            // Icon badge
            ZStack {
                Circle()
                    .fill(Color(hex: toneHex).opacity(0.12))
                    .frame(width: 72, height: 72)
                Circle()
                    .stroke(Color(hex: toneHex).opacity(0.25), lineWidth: 1)
                    .frame(width: 72, height: 72)
                Image(systemName: icon)
                    .font(.system(size: 28))
                    .foregroundStyle(Color(hex: toneHex))
            }

            Text(title)
                .font(.system(size: 22, weight: .bold, design: .serif))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)

            // Permission card
            VStack(spacing: 14) {
                Text(description)
                    .font(.system(size: 14))
                    .foregroundStyle(.white.opacity(0.74))
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)

                // Toggle row
                HStack {
                    HStack(spacing: 8) {
                        Image(systemName: icon)
                            .font(.system(size: 14))
                            .foregroundStyle(Color(hex: toneHex))
                        Text(title)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(.white)
                    }
                    Spacer()
                    Toggle("", isOn: $isEnabled)
                        .labelsHidden()
                        .tint(Color(hex: "#10B981"))
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 11)
                .background(Color.white.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 12))

                if let buttonLabel = permissionButtonLabel, let action = onRequestPermission {
                    Button(action: action) {
                        HStack(spacing: 6) {
                            Image(systemName: "location.fill")
                                .font(.system(size: 13))
                            Text(buttonLabel)
                                .font(.system(size: 14, weight: .semibold))
                        }
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(Color(hex: "#60A5FA").opacity(0.25))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: "#60A5FA").opacity(0.4), lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }

                Text(hint)
                    .font(.system(size: 11))
                    .foregroundStyle(.white.opacity(0.35))
                    .multilineTextAlignment(.center)
                    .lineSpacing(3)
            }
            .padding(18)
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color.white.opacity(0.03))
                    .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.white.opacity(0.08), lineWidth: 1))
            )
            .padding(.horizontal, 20)

            Spacer()
            Spacer()
        }
    }
}

// MARK: - Step 9: Social Proof

struct SocialProofStepView: View {
    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 18) {
                Text("People transform with HaloHome")
                    .font(.system(size: 22, weight: .bold, design: .serif))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .padding(.top, 12)

                Text("A focused ritual that turns astrology into practical weekly action.")
                    .font(.system(size: 14))
                    .foregroundStyle(.white.opacity(0.6))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 8)

                // Before / After
                HStack(spacing: 8) {
                    beforeAfterCard(title: "Before",
                                    items: ["Unclear priorities", "Reactive travel choices", "Inconsistent journaling"],
                                    isAfter: false)
                    beforeAfterCard(title: "After",
                                    items: ["Confident timing decisions", "Aligned city & travel plans", "Consistent reflection habits"],
                                    isAfter: true)
                }
                .padding(.horizontal, 14)

                // Rating bar
                HStack(spacing: 6) {
                    HStack(spacing: 2) {
                        ForEach(0..<5, id: \.self) { _ in
                            Image(systemName: "star.fill")
                                .font(.system(size: 11))
                                .foregroundStyle(Color(hex: "#F59E0B"))
                        }
                    }
                    Text("4.8 average rating")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.white.opacity(0.45))
                    Spacer()
                    Text("Trusted by daily astrology users")
                        .font(.system(size: 10))
                        .foregroundStyle(.white.opacity(0.35))
                }
                .padding(.horizontal, 16)

                // Testimonials
                VStack(spacing: 8) {
                    testimonialCard(
                        quote: "I found my dream city with HaloHome\u{2019}s Scout. Moved 6 months ago and everything clicked.",
                        name: "Sarah K.", initials: "SK", color: "#F472B6")
                    testimonialCard(
                        quote: "The Duo mode showed us why we always argued in one city and thrived in another.",
                        name: "Mike & Jen", initials: "MJ", color: "#60A5FA")
                    testimonialCard(
                        quote: "Caro\u{2019}s insights on my Jupiter MC line gave me the courage to relocate for my career.",
                        name: "Priya M.", initials: "PM", color: "#A78BFA")
                }
                .padding(.horizontal, 14)

                Spacer().frame(height: 80)
            }
        }
    }

    private func beforeAfterCard(title: String, items: [String], isAfter: Bool) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(isAfter ? Color(hex: "#F59E0B") : .white.opacity(0.6))

            ForEach(items, id: \.self) { item in
                HStack(alignment: .top, spacing: 6) {
                    Image(systemName: isAfter ? "checkmark" : "minus")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(isAfter ? Color(hex: "#10B981") : .white.opacity(0.25))
                        .frame(width: 14)
                        .padding(.top, 2)
                    Text(item)
                        .font(.system(size: 12))
                        .foregroundStyle(.white.opacity(0.8))
                        .lineSpacing(2)
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(isAfter
                      ? LinearGradient(colors: [Color(hex: "#F59E0B").opacity(0.1), Color(hex: "#F59E0B").opacity(0.04)],
                                       startPoint: .top, endPoint: .bottom)
                      : LinearGradient(colors: [Color.white.opacity(0.04), Color.white.opacity(0.02)],
                                       startPoint: .top, endPoint: .bottom))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(isAfter ? Color(hex: "#F59E0B").opacity(0.3) : Color.white.opacity(0.08), lineWidth: 1)
        )
    }

    private func testimonialCard(quote: String, name: String, initials: String, color: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            // Avatar circle
            ZStack {
                Circle().fill(Color(hex: color).opacity(0.2)).frame(width: 32, height: 32)
                Text(initials)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Color(hex: color))
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 2) {
                    ForEach(0..<5, id: \.self) { _ in
                        Image(systemName: "star.fill")
                            .font(.system(size: 8))
                            .foregroundStyle(Color(hex: "#F59E0B"))
                    }
                }
                Text("\u{201C}\(quote)\u{201D}")
                    .font(.system(size: 12))
                    .foregroundStyle(.white.opacity(0.75))
                    .italic()
                    .lineSpacing(2)
                Text("\u{2014} \(name)")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(.white.opacity(0.4))
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.03))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.white.opacity(0.06), lineWidth: 1))
        )
    }
}

// MARK: - Step 10: Personalizing (Auto-advance)

struct PersonalizingStepView: View {
    let onAutoAdvance: () -> Void
    @State private var currentAnalysis = 0
    @State private var barProgress: [CGFloat] = [0, 0, 0]

    private let analysisSteps = [
        "Tracing strongest astrocartography lines",
        "Calibrating Caro guidance prompts",
        "Preparing travel alert logic",
    ]

    var body: some View {
        VStack(spacing: 28) {
            Spacer()

            CanvasOrrery()
                .frame(height: 180)

            Text("Personalizing your experience\u{2026}")
                .font(.system(size: 20, weight: .bold, design: .serif))
                .foregroundStyle(.white)

            VStack(spacing: 16) {
                ForEach(0..<3, id: \.self) { i in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 6) {
                            Image(systemName: currentAnalysis >= i ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 12))
                                .foregroundStyle(currentAnalysis >= i ? Color(hex: "#10B981") : .white.opacity(0.25))
                            Text(analysisSteps[i])
                                .font(.system(size: 13))
                                .foregroundStyle(.white.opacity(currentAnalysis >= i ? 0.8 : 0.3))
                        }
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(Color.white.opacity(0.08))
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(Color(hex: "#A78BFA"))
                                    .frame(width: geo.size.width * barProgress[i])
                                    .shadow(color: Color(hex: "#A78BFA").opacity(0.35), radius: 8)
                            }
                        }
                        .frame(height: 4)
                    }
                }
            }
            .padding(.horizontal, 32)

            Spacer()
            Spacer()
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 0.8).delay(0.2)) { barProgress[0] = 1.0; currentAnalysis = 0 }
            withAnimation(.easeInOut(duration: 0.8).delay(1.0)) { barProgress[1] = 1.0; currentAnalysis = 1 }
            withAnimation(.easeInOut(duration: 0.8).delay(1.8)) { barProgress[2] = 1.0; currentAnalysis = 2 }
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.6) { onAutoAdvance() }
        }
    }
}
