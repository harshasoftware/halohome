import SwiftUI
import DesignSystem

/// Empty state shown when there are no conversations
struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: DSSpacing.lg) {
            ZStack {
                Circle()
                    .fill(DSGradient.primaryLinear)
                    .frame(width: 80, height: 80)
                
                Image(systemName: "bubble.left.and.bubble.right")
                    .font(.system(size: 36, weight: .medium))
                    .foregroundStyle(DSColors.textPrimary)
            }
            
            VStack(spacing: DSSpacing.xs) {
                Text("Start Your First Chat")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(DSColors.textPrimary)
                
                Text("Choose a chat style above to begin")
                    .font(.subheadline)
                    .foregroundStyle(DSColors.textSecondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DSSpacing.xl)
    }
}

/// Empty state shown when search returns no results
struct NoResultsStateView: View {
    let onClearSearch: () -> Void
    
    var body: some View {
        VStack(spacing: DSSpacing.lg) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 48, weight: .light))
                .foregroundStyle(DSColors.textSecondary)
            
            VStack(spacing: DSSpacing.xs) {
                Text("No Matches")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(DSColors.textPrimary)
                
                Text("Try a different search term")
                    .font(.subheadline)
                    .foregroundStyle(DSColors.textSecondary)
            }
            
            Button {
                onClearSearch()
            } label: {
                Text("Clear Search")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(DSColors.primary)
            }
            .padding(.top, DSSpacing.sm)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DSSpacing.xl)
    }
}

