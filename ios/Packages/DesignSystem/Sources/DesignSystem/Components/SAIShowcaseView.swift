import SwiftUI

/// Signature AI Design System Showcase
///
/// A comprehensive showcase of all SAI components for developers.
/// This view demonstrates the full capability of the Signature UI Kit.
public struct SAIShowcaseView: View {
    
    @State private var inputText = ""
    @State private var selectedChip = "GPT-4"
    @State private var isStreaming = false
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: DSSpacing.xl) {
                    // Header
                    headerSection
                    
                    // Buttons
                    buttonsSection
                    
                    // Cards
                    cardsSection
                    
                    // Chips
                    chipsSection
                    
                    // List Rows
                    listRowsSection
                    
                    // Tags & Avatars
                    tagsAvatarsSection
                    
                    // Input & Streaming
                    inputSection
                    
                    // Toast Demo
                    toastSection
                }
                .padding(DSSpacing.lg)
            }
            .background(DSColors.background)
            .navigationTitle("Design System")
        }
        .toastContainer()
    }
    
    // MARK: - Sections
    
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: DSSpacing.md) {
            SAISectionHeader(
                title: "Signature UI Kit",
                kicker: "Components"
            )
            
            Text("A premium, distinctive look-and-feel with reusable SwiftUI components.")
                .font(DSTypography.body)
                .foregroundStyle(DSColors.textSecondary)
        }
    }
    
    private var buttonsSection: some View {
        VStack(alignment: .leading, spacing: DSSpacing.md) {
            SAISectionHeader(title: "Buttons")
            
            VStack(spacing: DSSpacing.sm) {
                SAIButton("Primary Button", style: .primary) {}
                SAIButton("Secondary Button", style: .secondary) {}
                SAIButton("Quiet Button", style: .quiet) {}
                SAIButton("With Icon", style: .primary, icon: Image(systemName: "sparkles")) {}
            }
        }
    }
    
    private var cardsSection: some View {
        VStack(alignment: .leading, spacing: DSSpacing.md) {
            SAISectionHeader(title: "Cards")
            
            SAICard(style: .elevated) {
                VStack(alignment: .leading, spacing: DSSpacing.md) {
                    HStack {
                        SAIAvatar(name: "John Doe", size: .md, showsOnlineIndicator: true)
                        VStack(alignment: .leading, spacing: DSSpacing.xs) {
                            Text("Elevated Card")
                                .font(DSTypography.titleM)
                            Text("With shadow and depth")
                                .font(DSTypography.caption)
                                .foregroundStyle(DSColors.textSecondary)
                        }
                        Spacer()
                        SAITag("New", style: .success)
                    }
                }
                .padding(DSSpacing.lg)
            }
            
            SAICard(style: .outline) {
                VStack(alignment: .leading, spacing: DSSpacing.sm) {
                    Text("Outline Card")
                        .font(DSTypography.titleM)
                    Text("Minimal with border")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                }
                .padding(DSSpacing.lg)
            }
        }
    }
    
    private var chipsSection: some View {
        VStack(alignment: .leading, spacing: DSSpacing.md) {
            SAISectionHeader(title: "Chips")
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: DSSpacing.sm) {
                    SAIChip(
                        title: "GPT-4",
                        isSelected: selectedChip == "GPT-4",
                        icon: Image(systemName: "sparkles")
                    ) {
                        selectedChip = "GPT-4"
                    }
                    
                    SAIChip(
                        title: "Claude",
                        isSelected: selectedChip == "Claude",
                        icon: Image(systemName: "brain")
                    ) {
                        selectedChip = "Claude"
                    }
                    
                    SAIChip(
                        title: "Gemini",
                        isSelected: selectedChip == "Gemini",
                        icon: Image(systemName: "star")
                    ) {
                        selectedChip = "Gemini"
                    }
                    
                    SAIChip(
                        title: "Loading",
                        isLoading: true
                    ) {}
                }
            }
        }
    }
    
    private var listRowsSection: some View {
        VStack(alignment: .leading, spacing: DSSpacing.md) {
            SAISectionHeader(title: "List Rows")
            
            VStack(spacing: 0) {
                SAIListRow(
                    title: "Account Settings",
                    subtitle: "Manage your profile",
                    leading: Image(systemName: "person.circle")
                ) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundStyle(DSColors.textSecondary)
                }
                .onTap {
                    print("Account tapped")
                }
                
                SAIListRow(
                    title: "Notifications",
                    subtitle: "Push notifications",
                    leading: Image(systemName: "bell")
                ) {
                    Toggle("", isOn: .constant(true))
                }
                
                SAIListRow(
                    title: "Premium Features",
                    leading: Image(systemName: "crown.fill")
                ) {
                    SAITag("Pro", style: .success)
                }
            }
            .background(DSColors.surface)
            .clipShape(.rect(cornerRadius: DSRadius.md))
        }
    }

    private var tagsAvatarsSection: some View {
        VStack(alignment: .leading, spacing: DSSpacing.md) {
            SAISectionHeader(title: "Tags & Avatars")
            
            HStack(spacing: DSSpacing.sm) {
                SAITag("Info", style: .info)
                SAITag("Success", style: .success)
                SAITag("Warning", style: .warning)
                SAITag("Danger", style: .danger)
            }
            
            HStack(spacing: DSSpacing.md) {
                SAIAvatar(name: "John Doe", size: .sm)
                SAIAvatar(name: "Jane Smith", size: .md)
                SAIAvatar(name: "Bob Wilson", size: .lg, showsOnlineIndicator: true)
            }
        }
    }
    
    private var inputSection: some View {
        VStack(alignment: .leading, spacing: DSSpacing.md) {
            SAISectionHeader(title: "Chat Components")
            
            SAIStreamingBubble(
                text: "This is a streaming response with a live caret...",
                isStreaming: isStreaming,
                badges: ["Web", "Search"]
            )
            
            HStack {
                Spacer()
                Text("How can I help you?")
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.background)
                    .padding(DSSpacing.lg)
                    .background(DSGradient.primaryLinear)
                    .clipShape(.rect(cornerRadius: DSRadius.lg))
            }
            
            Button("Toggle Streaming") {
                isStreaming.toggle()
            }
            .buttonStyle(.bordered)
        }
    }
    
    private var toastSection: some View {
        VStack(alignment: .leading, spacing: DSSpacing.md) {
            SAISectionHeader(title: "Toasts")
            
            VStack(spacing: DSSpacing.sm) {
                SAIButton("Show Info Toast") {
                    ToastCenter.shared.show(ToastMessage(
                        title: "Information",
                        message: "This is an informational message",
                        style: .info
                    ))
                }
                
                SAIButton("Show Success Toast", style: .secondary) {
                    ToastCenter.shared.show(ToastMessage(
                        title: "Success!",
                        message: "Operation completed successfully",
                        style: .success
                    ))
                }
                
                SAIButton("Show Error Toast", style: .quiet) {
                    ToastCenter.shared.show(ToastMessage(
                        title: "Error",
                        message: "Something went wrong",
                        style: .error,
                        duration: 3.0
                    ))
                }
            }
        }
    }
}

// MARK: - Preview

#Preview {
    SAIShowcaseView()
}

