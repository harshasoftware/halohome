import SwiftUI

/// Step 9: Social proof with testimonials.
struct SocialProofPage: View {

    let onContinue: () -> Void

    @State private var isVisible = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let testimonials: [Testimonial] = [
        Testimonial(
            text: "CartoStar helped me find my dream city. I relocated to Lisbon and my career has flourished!",
            author: "Sarah M.",
            role: "Marketing Manager"
        ),
        Testimonial(
            text: "The planetary line insights are incredibly accurate. I met my partner in a Venus line city.",
            author: "James K.",
            role: "Software Developer"
        ),
        Testimonial(
            text: "Finally an astrology app that combines real data with actionable insights.",
            author: "Maria L.",
            role: "Entrepreneur"
        )
    ]

    var body: some View {
        VStack(spacing: 0) {
            Spacer()
                .frame(height: 60)

            // Title and description
            VStack(spacing: 32) {
                VStack(spacing: 12) {
                    Text("People transform\nwith CartoStar")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.center)
                    
                    Text("A focused ritual flow that turns astrology into practical weekly action.")
                        .font(.system(size: 15))
                        .foregroundStyle(.white.opacity(0.5))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                }
                
                HStack(spacing: 4) {
                    ForEach(0..<5, id: \.self) { _ in
                        Image(systemName: "star.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(Color(red: 1.0, green: 0.84, blue: 0.0))
                    }
                    Text("4.9 on App Store")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.white.opacity(0.8))
                        .padding(.leading, 4)
                }
                .padding(.vertical, 8)
                .padding(.horizontal, 16)
                .background(Color.white.opacity(0.05))
                .clipShape(Capsule())
            }
            .opacity(isVisible ? 1 : 0)
            .offset(y: isVisible ? 0 : 20)

            Spacer()
                .frame(height: 32)

            // Testimonials
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 16) {
                    ForEach(Array(testimonials.enumerated()), id: \.element.id) { index, testimonial in
                        TestimonialCard(testimonial: testimonial)
                            .opacity(isVisible ? 1 : 0)
                            .offset(y: isVisible ? 0 : CGFloat(20 + index * 10))
                    }
                }
                .padding(.horizontal, 24)
            }

            Spacer()

            // CTA
            CosmicButton("Continue", action: onContinue)
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
}

// MARK: - Testimonial Model

private struct Testimonial: Identifiable {
    let id = UUID()
    let text: String
    let author: String
    let role: String
}

// MARK: - Testimonial Card

private struct TestimonialCard: View {

    let testimonial: Testimonial

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("\"\(testimonial.text)\"")
                .font(.system(size: 15))
                .foregroundStyle(.white.opacity(0.9))
                .italic()
                .lineSpacing(4)

            HStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [
                                Color(red: 0.6, green: 0.4, blue: 1.0),
                                Color(red: 0.4, green: 0.2, blue: 0.8)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 36, height: 36)
                    .overlay(
                        Text(String(testimonial.author.prefix(1)))
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.white)
                    )

                VStack(alignment: .leading, spacing: 2) {
                    Text(testimonial.author)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)

                    Text(testimonial.role)
                        .font(.system(size: 12))
                        .foregroundStyle(.white.opacity(0.5))
                }
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.white.opacity(0.04))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(Color.white.opacity(0.06), lineWidth: 1)
        )
    }
}

#Preview {
    SocialProofPage {}
        .background(Color(red: 0.04, green: 0.04, blue: 0.08))
}
