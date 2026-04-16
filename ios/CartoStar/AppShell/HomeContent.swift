import Foundation

/// Home screen content configuration
/// Buyers can easily customize this to match their app's features and branding
public struct HomeContent {
    
    // MARK: - Models
    
    /// Featured content card in carousel
    public struct FeatureItem: Identifiable, Equatable {
        public let id: UUID
        public let title: String
        public let description: String
        public let systemImage: String
        public let accentColor: String
        
        public init(
            id: UUID = UUID(),
            title: String,
            description: String,
            systemImage: String,
            accentColor: String = "blue"
        ) {
            self.id = id
            self.title = title
            self.description = description
            self.systemImage = systemImage
            self.accentColor = accentColor
        }
    }
    
    /// Quick action button
    public struct QuickAction: Identifiable, Equatable {
        public let id: UUID
        public let title: String
        public let systemImage: String
        public let accentColor: String
        public let action: ActionType
        
        public enum ActionType: Equatable {
            case newChat
            case history
            case upgrade
            case settings
        }
        
        public init(
            id: UUID = UUID(),
            title: String,
            systemImage: String,
            accentColor: String = "blue",
            action: ActionType
        ) {
            self.id = id
            self.title = title
            self.systemImage = systemImage
            self.accentColor = accentColor
            self.action = action
        }
    }
    
    // MARK: - Configuration
    
    public let welcomeTitle: String
    public let welcomeSubtitle: String
    public let featuredItems: [FeatureItem]
    public let quickActions: [QuickAction]
    
    public init(
        welcomeTitle: String = "Welcome Back",
        welcomeSubtitle: String = "What would you like to explore today?",
        featuredItems: [FeatureItem] = FeatureItem.defaults,
        quickActions: [QuickAction] = QuickAction.defaults
    ) {
        self.welcomeTitle = welcomeTitle
        self.welcomeSubtitle = welcomeSubtitle
        self.featuredItems = featuredItems
        self.quickActions = quickActions
    }
}

// MARK: - Default Content

extension HomeContent.FeatureItem {
    
    /// Default featured items for the HaloHome
    /// Buyers should customize these for their specific app
    public static let defaults: [HomeContent.FeatureItem] = [
        HomeContent.FeatureItem(
            title: "GPT-4 Powered",
            description: "Experience the most advanced AI model for natural conversations",
            systemImage: "cpu.fill",
            accentColor: "purple"
        ),
        HomeContent.FeatureItem(
            title: "Lightning Fast",
            description: "Get instant responses with our optimized streaming technology",
            systemImage: "bolt.fill",
            accentColor: "orange"
        ),
        HomeContent.FeatureItem(
            title: "Private & Secure",
            description: "Your conversations are encrypted and never shared",
            systemImage: "lock.shield.fill",
            accentColor: "green"
        ),
        HomeContent.FeatureItem(
            title: "Multi-Device Sync",
            description: "Access your chats from any device, anytime",
            systemImage: "icloud.fill",
            accentColor: "blue"
        )
    ]
}

extension HomeContent.QuickAction {
    
    /// Default quick actions for the HaloHome
    /// Buyers can customize or add more actions
    public static let defaults: [HomeContent.QuickAction] = [
        HomeContent.QuickAction(
            title: "New Chat",
            systemImage: "plus.message.fill",
            accentColor: "blue",
            action: .newChat
        ),
        HomeContent.QuickAction(
            title: "History",
            systemImage: "clock.fill",
            accentColor: "purple",
            action: .history
        ),
        HomeContent.QuickAction(
            title: "Upgrade",
            systemImage: "star.fill",
            accentColor: "orange",
            action: .upgrade
        ),
        HomeContent.QuickAction(
            title: "Settings",
            systemImage: "gearshape.fill",
            accentColor: "gray",
            action: .settings
        )
    ]
}

