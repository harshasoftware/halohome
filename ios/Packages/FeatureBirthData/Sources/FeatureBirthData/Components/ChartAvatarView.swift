import SwiftUI
import Core
import DesignSystem

/// Avatar view that displays a unique Memoji-style avatar based on birth data
/// Uses Tapback API with DiceBear fallback for consistent, deterministic avatars
@available(iOS 17.0, *)
public struct ChartAvatarView: View {

    private let birthData: BirthData
    private let size: CGFloat

    @State private var avatarImage: UIImage?
    @State private var isLoading = true

    public init(birthData: BirthData, size: CGFloat = 48) {
        self.birthData = birthData
        self.size = size
    }

    public var body: some View {
        ZStack {
            if let image = avatarImage {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: size, height: size)
                    .clipShape(Circle())
            } else {
                // Fallback placeholder while loading
                Circle()
                    .fill(DSGradient.primaryLinear)
                    .frame(width: size, height: size)
                    .overlay {
                        if isLoading {
                            ProgressView()
                                .scaleEffect(0.6)
                                .tint(.white)
                        } else {
                            // Final fallback - initials
                            Text(initials)
                                .font(.system(size: size * 0.4, weight: .semibold))
                                .foregroundStyle(.white)
                        }
                    }
            }
        }
        .task {
            await loadAvatar()
        }
    }

    /// Generate a unique identifier from birth data for avatar generation
    private var avatarIdentifier: String {
        // Combine name + birth date + location for unique avatar per chart
        let dateString = birthData.date.formatted(.iso8601)
        let locationString = "\(birthData.latitude),\(birthData.longitude)"
        return "\(birthData.name)-\(dateString)-\(locationString)"
    }

    /// Get initials for fallback display
    private var initials: String {
        let words = birthData.name.split(separator: " ")
        if words.count >= 2 {
            return String(words[0].prefix(1) + words[1].prefix(1)).uppercased()
        }
        return String(birthData.name.prefix(2)).uppercased()
    }

    private func loadAvatar() async {
        isLoading = true
        let image = await AvatarLoader.shared.loadAvatar(for: avatarIdentifier)
        await MainActor.run {
            self.avatarImage = image
            self.isLoading = false
        }
    }
}

// MARK: - Preview

#Preview("Chart Avatar") {
    HStack(spacing: 20) {
        ChartAvatarView(birthData: .sample, size: 48)
        ChartAvatarView(birthData: .sampleUnknownTime, size: 48)
        ChartAvatarView(birthData: .sample, size: 64)
    }
    .padding()
    .background(Color.black)
}
