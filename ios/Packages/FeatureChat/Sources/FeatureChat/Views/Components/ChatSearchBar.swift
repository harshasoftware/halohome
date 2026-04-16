import SwiftUI
import DesignSystem

/// Search bar for filtering conversations
struct ChatSearchBar: View {
    @Binding var searchText: String
    @FocusState.Binding var isSearchFocused: Bool
    let cornerRadius: CGFloat
    let strokeWidth: CGFloat
    let onSearchChange: (String) -> Void
    
    var body: some View {
        HStack(spacing: DSSpacing.sm) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(DSColors.textSecondary)
                .font(.body)
            
            TextField("Search conversations", text: $searchText)
                .font(.body)
                .foregroundStyle(DSColors.textPrimary)
                .textFieldStyle(.plain)
                .focused($isSearchFocused)
                .onChange(of: searchText) { _, newValue in
                    onSearchChange(newValue)
                }
            
            if !searchText.isEmpty {
                Button {
                    searchText = ""
                    isSearchFocused = false
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(DSColors.textSecondary)
                        .font(.body)
                }
                .buttonStyle(.borderless)
                .frame(width: 24, height: 24)
                .contentShape(Rectangle())
                .accessibilityLabel("Clear search")
            }
        }
        .padding(.horizontal, DSSpacing.md)
        .padding(.vertical, DSSpacing.md)
        .background(DSColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
        .overlay(
            RoundedRectangle(cornerRadius: cornerRadius)
                .strokeBorder(
                    isSearchFocused ? DSColors.primary : DSColors.separator.opacity(0.5),
                    lineWidth: isSearchFocused ? 2 : strokeWidth
                )
        )
        .animation(.easeInOut(duration: 0.2), value: isSearchFocused)
    }
}

