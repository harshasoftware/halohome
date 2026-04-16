import SwiftUI

/// Signature AI Skeleton component
///
/// Provides shimmer loading blocks for avatars, text lines, and paragraphs.
///
/// Example:
/// ```swift
/// SAISkeleton.avatar(size: .md)
/// SAISkeleton.lines(count: 3)
/// SAISkeleton.paragraph(lineCount: 5)
/// ```
public enum SAISkeleton {
    
    // MARK: - Avatar Skeleton
    
    public static func avatar(size: SAIAvatar.Size = .md) -> some View {
        Circle()
            .fill(DSColors.chipBackground)
            .frame(width: size.diameter, height: size.diameter)
            .shimmer()
    }
    
    // MARK: - Line Skeletons
    
    public static func line(width: CGFloat? = nil, height: CGFloat = 16) -> some View {
        RoundedRectangle(cornerRadius: DSRadius.xs)
            .fill(DSColors.chipBackground)
            .frame(width: width, height: height)
            .shimmer()
    }
    
    public static func lines(count: Int, spacing: CGFloat = DSSpacing.sm) -> some View {
        VStack(alignment: .leading, spacing: spacing) {
            ForEach(0..<count, id: \.self) { index in
                line(width: lineWidth(for: index, total: count))
            }
        }
    }
    
    // MARK: - Paragraph Skeleton
    
    public static func paragraph(lineCount: Int = 3) -> some View {
        VStack(alignment: .leading, spacing: DSSpacing.sm) {
            // Title line (thicker)
            line(width: 200, height: 20)
            
            // Body lines
            ForEach(0..<lineCount, id: \.self) { index in
                line(width: lineWidth(for: index, total: lineCount), height: 14)
            }
        }
    }
    
    // MARK: - Card Skeleton
    
    public static func card() -> some View {
        SAICard(style: .elevated) {
            VStack(alignment: .leading, spacing: DSSpacing.md) {
                HStack(spacing: DSSpacing.md) {
                    avatar(size: .md)
                    VStack(alignment: .leading, spacing: DSSpacing.xs) {
                        line(width: 120, height: 16)
                        line(width: 80, height: 12)
                    }
                }
                
                lines(count: 2)
            }
            .padding(DSSpacing.lg)
        }
    }
    
    // MARK: - Helpers
    
    private static func lineWidth(for index: Int, total: Int) -> CGFloat? {
        // Last line is shorter for natural look
        if index == total - 1 {
            return nil // Let it be flexible but shorter
        }
        return nil
    }
}

// MARK: - Skeleton View Wrapper

public struct SkeletonView: View {
    public init() {}
    
    public var body: some View {
        VStack(alignment: .leading, spacing: DSSpacing.xl) {
            SAISkeleton.paragraph(lineCount: 3)
            SAISkeleton.card()
            SAISkeleton.lines(count: 4)
        }
    }
}

// MARK: - Previews

#Preview("Skeleton Elements") {
    VStack(alignment: .leading, spacing: DSSpacing.xl) {
        Text("Avatars").font(DSTypography.caption).foregroundStyle(DSColors.textSecondary)
        HStack(spacing: DSSpacing.md) {
            SAISkeleton.avatar(size: .sm)
            SAISkeleton.avatar(size: .md)
            SAISkeleton.avatar(size: .lg)
            SAISkeleton.avatar(size: .xl)
        }
        
        Text("Lines").font(DSTypography.caption).foregroundStyle(DSColors.textSecondary)
        SAISkeleton.lines(count: 3)
        
        Text("Paragraph").font(DSTypography.caption).foregroundStyle(DSColors.textSecondary)
        SAISkeleton.paragraph(lineCount: 4)
        
        Text("Card").font(DSTypography.caption).foregroundStyle(DSColors.textSecondary)
        SAISkeleton.card()
    }
    .padding(DSSpacing.xl)
    .background(DSColors.background)
}

#Preview("Loading State") {
    ScrollView {
        VStack(spacing: DSSpacing.lg) {
            ForEach(0..<3, id: \.self) { _ in
                SAISkeleton.card()
            }
        }
        .padding(DSSpacing.lg)
    }
    .background(DSColors.background)
}

#Preview("Skeleton Dark Mode") {
    VStack(alignment: .leading, spacing: DSSpacing.xl) {
        SAISkeleton.avatar(size: .lg)
        SAISkeleton.paragraph(lineCount: 3)
        SAISkeleton.card()
    }
    .padding(DSSpacing.xl)
    .background(DSColors.background)
    .preferredColorScheme(.dark)
}

