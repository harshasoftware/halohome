import SwiftUI

/// Floating feature pill for Meet Caro page.
public struct FeaturePill: View {

    let text: String
    let color: Color
    let delay: Double
    let offsetX: CGFloat
    let offsetY: CGFloat

    @State private var isVisible = false
    @State private var floatOffset: CGFloat = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(text: String, color: Color = .white.opacity(0.12), delay: Double = 0, offsetX: CGFloat = 0, offsetY: CGFloat = 0) {
        self.text = text
        self.color = color
        self.delay = delay
        self.offsetX = offsetX
        self.offsetY = offsetY
    }

    public var body: some View {
        Text(text)
            .font(.system(size: 13, weight: .medium))
            .foregroundStyle(.white.opacity(0.8))
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(
                Capsule()
                    .fill(color.opacity(0.1))
            )
            .overlay(
                Capsule()
                    .strokeBorder(color.opacity(0.4), lineWidth: 1)
            )
            .offset(x: offsetX, y: offsetY + floatOffset)
            .opacity(isVisible ? 1 : 0)
            .scaleEffect(isVisible ? 1 : 0.8)
            .onAppear {
                guard !reduceMotion else {
                    isVisible = true
                    return
                }

                withAnimation(.easeOut(duration: 0.5).delay(delay)) {
                    isVisible = true
                }

                withAnimation(
                    .easeInOut(duration: 2.5)
                    .repeatForever(autoreverses: true)
                    .delay(delay + 0.5)
                ) {
                    floatOffset = 6
                }
            }
    }
}

#Preview {
    ZStack {
        FeaturePill(text: "Romance", delay: 0, offsetX: -60, offsetY: -40)
        FeaturePill(text: "Career", delay: 0.2, offsetX: 50, offsetY: -20)
        FeaturePill(text: "Travel", delay: 0.4, offsetX: -30, offsetY: 40)
    }
    .frame(width: 300, height: 200)
    .background(Color(red: 0.02, green: 0.02, blue: 0.05))
}
