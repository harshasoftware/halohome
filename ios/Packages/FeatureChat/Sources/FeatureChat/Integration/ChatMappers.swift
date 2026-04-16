import Foundation
import CartoStorage

/// Mappers between Storage DTOs and Chat domain models
public enum ChatMappers {
    
    /// Convert MessageDTO to ChatMessage
    public static func toChatMessage(_ dto: MessageDTO) -> ChatMessage {
        let role = ChatMessage.Role(rawValue: dto.role.rawValue) ?? .system
        return ChatMessage(
            id: dto.id,
            role: role,
            text: dto.text,
            createdAt: dto.createdAt
        )
    }
    
    /// Convert ChatMessage to MessageDTO role
    public static func toMessageRole(_ role: ChatMessage.Role) -> MessageDTO.Role {
        MessageDTO.Role(rawValue: role.rawValue) ?? .system
    }
}






