import SwiftUI
import CartoStorage
import DesignSystem
import Core

/// Row card representing a conversation in the chat history list
struct ChatRowCard: View {
    let conversation: ConversationDTO
    let cornerRadius: CGFloat
    let strokeWidth: CGFloat
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 0) {
                // Title and time
                HStack(alignment: .top) {
                    Text(conversation.title)
                        .font(.headline.weight(.semibold))
                        .foregroundStyle(DSColors.textPrimary)
                        .lineLimit(1)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    
                    Text(formatDate(conversation.updatedAt))
                        .font(.caption)
                        .foregroundStyle(DSColors.textSecondary)
                }
                
                // Hairline divider
                Rectangle()
                    .fill(DSColors.separator.opacity(0.3))
                    .frame(height: 1 / UIScreen.main.scale)
                    .padding(.vertical, DSSpacing.sm)
                
                // Preview and chevron
                HStack {
                    if let persona = conversation.personaName {
                        Text("Talking to \(persona)")
                            .font(.subheadline)
                            .foregroundStyle(DSColors.textSecondary)
                            .lineLimit(1)
                    } else {
                        Text("Tap to continue")
                            .font(.subheadline)
                            .foregroundStyle(DSColors.textSecondary)
                            .lineLimit(1)
                    }
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(DSColors.textSecondary.opacity(0.5))
                }
            }
            .padding(DSSpacing.lg)
            .background(DSColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(DSColors.separator.opacity(0.5), lineWidth: strokeWidth)
            )
            .shadow(color: DSColors.shadow.opacity(0.06), radius: 8, y: 3)
        }
        .buttonStyle(.plain)
    }
}

