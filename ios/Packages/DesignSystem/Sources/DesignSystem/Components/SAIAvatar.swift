import SwiftUI

/// Signature AI Avatar component
///
/// Displays user initials with dynamic gradient background (based on name hash)
/// or an image. Supports optional online indicator.
///
/// Example:
/// ```swift
/// SAIAvatar(
///     name: "John Doe",
///     imageURL: nil,
///     size: .md,
///     showsOnlineIndicator: true
/// )
/// ```
public struct SAIAvatar: View {
    
    public enum Size {
        case sm
        case md
        case lg
        case xl
        
        var diameter: CGFloat {
            switch self {
            case .sm: return 32
            case .md: return 40
            case .lg: return 56
            case .xl: return 80
            }
        }
        
        var fontSize: CGFloat {
            switch self {
            case .sm: return 13
            case .md: return 16
            case .lg: return 22
            case .xl: return 32
            }
        }
        
        var indicatorSize: CGFloat {
            switch self {
            case .sm: return 8
            case .md: return 10
            case .lg: return 12
            case .xl: return 16
            }
        }
    }
    
    private let name: String
    private let imageURL: URL?
    private let size: Size
    private let showsOnlineIndicator: Bool
    
    public init(
        name: String,
        imageURL: URL? = nil,
        size: Size = .md,
        showsOnlineIndicator: Bool = false
    ) {
        self.name = name
        self.imageURL = imageURL
        self.size = size
        self.showsOnlineIndicator = showsOnlineIndicator
    }
    
    public var body: some View {
        ZStack(alignment: .bottomTrailing) {
            if let imageURL = imageURL {
                AsyncImage(url: imageURL) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    initialsView
                }
                .frame(width: size.diameter, height: size.diameter)
                .clipShape(Circle())
            } else {
                initialsView
            }
            
            if showsOnlineIndicator {
                onlineIndicator
            }
        }
    }
    
    // MARK: - Initials View
    
    private var initialsView: some View {
        ZStack {
            gradientBackground
            
            Text(initials)
                .font(.system(size: size.fontSize, weight: .semibold))
                .foregroundStyle(DSColors.background)
        }
        .frame(width: size.diameter, height: size.diameter)
        .clipShape(Circle())
    }
    
    private var gradientBackground: some View {
        let colors = generateGradientColors(for: name)
        return LinearGradient(
            colors: colors,
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    private var initials: String {
        let components = name.split(separator: " ")
        if components.count >= 2 {
            let first = components.first?.prefix(1).uppercased() ?? ""
            let last = components.last?.prefix(1).uppercased() ?? ""
            return "\(first)\(last)"
        } else if let first = components.first {
            return String(first.prefix(2).uppercased())
        }
        return "?"
    }
    
    // MARK: - Online Indicator
    
    private var onlineIndicator: some View {
        Circle()
            .fill(DSColors.success)
            .frame(width: size.indicatorSize, height: size.indicatorSize)
            .overlay(
                Circle()
                    .strokeBorder(DSColors.background, lineWidth: 2)
            )
            .offset(x: 2, y: 2)
    }
    
    // MARK: - Gradient Generation
    
    private func generateGradientColors(for name: String) -> [Color] {
        let hash = abs(name.hashValue)
        let hue1 = Double(hash % 360) / 360.0
        let hue2 = Double((hash / 360) % 360) / 360.0
        
        return [
            Color(hue: hue1, saturation: 0.6, brightness: 0.8),
            Color(hue: hue2, saturation: 0.7, brightness: 0.7)
        ]
    }
}

// MARK: - Previews

#Preview("Avatar Sizes") {
    VStack(spacing: DSSpacing.xl) {
        HStack(spacing: DSSpacing.lg) {
            SAIAvatar(name: "John Doe", size: .sm)
            SAIAvatar(name: "Jane Smith", size: .md)
            SAIAvatar(name: "Bob Wilson", size: .lg)
            SAIAvatar(name: "Alice Brown", size: .xl)
        }
        
        HStack(spacing: DSSpacing.lg) {
            SAIAvatar(name: "John Doe", size: .sm, showsOnlineIndicator: true)
            SAIAvatar(name: "Jane Smith", size: .md, showsOnlineIndicator: true)
            SAIAvatar(name: "Bob Wilson", size: .lg, showsOnlineIndicator: true)
            SAIAvatar(name: "Alice Brown", size: .xl, showsOnlineIndicator: true)
        }
    }
    .padding(DSSpacing.xl)
    .background(DSColors.background)
}

#Preview("Avatar Variations") {
    VStack(spacing: DSSpacing.lg) {
        HStack(spacing: DSSpacing.md) {
            SAIAvatar(name: "A", size: .md)
            SAIAvatar(name: "Alex", size: .md)
            SAIAvatar(name: "Alex Johnson", size: .md)
            SAIAvatar(name: "Alex Johnson Smith", size: .md)
        }
        
        HStack(spacing: DSSpacing.md) {
            SAIAvatar(name: "Sarah Connor", size: .md)
            SAIAvatar(name: "John Wick", size: .md)
            SAIAvatar(name: "Tony Stark", size: .md)
            SAIAvatar(name: "Peter Parker", size: .md)
        }
    }
    .padding(DSSpacing.xl)
    .background(DSColors.background)
}

#Preview("Avatar Dark Mode") {
    HStack(spacing: DSSpacing.lg) {
        SAIAvatar(name: "John Doe", size: .lg)
        SAIAvatar(name: "Jane Smith", size: .lg, showsOnlineIndicator: true)
    }
    .padding(DSSpacing.xl)
    .background(DSColors.background)
    .preferredColorScheme(.dark)
}

