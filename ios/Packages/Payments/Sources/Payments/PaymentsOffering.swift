import Foundation

/// Represents a subscription product offering
public struct PaymentsOffering: Sendable, Identifiable, Equatable {
    public let id: String
    public let title: String
    public let price: String
    public let pricePerMonth: String?
    public let packageType: PackageType
    
    public init(
        id: String,
        title: String,
        price: String,
        pricePerMonth: String? = nil,
        packageType: PackageType
    ) {
        self.id = id
        self.title = title
        self.price = price
        self.pricePerMonth = pricePerMonth
        self.packageType = packageType
    }
    
    /// Package type for common subscription periods
    public enum PackageType: String, Sendable, Equatable {
        case monthly = "monthly"
        case annual = "annual"
        case duoMonthly = "duoMonthly"
        case duoAnnual = "duoAnnual"
        case lifetime = "lifetime"
        case unknown

        public var displayName: String {
            switch self {
            case .monthly: return "Monthly"
            case .annual: return "Annual"
            case .duoMonthly: return "Duo Monthly"
            case .duoAnnual: return "Duo Annual"
            case .lifetime: return "Lifetime"
            case .unknown: return "Subscription"
            }
        }

        /// Whether this package type includes Duo mode access
        public var hasDuoAccess: Bool {
            switch self {
            case .duoMonthly, .duoAnnual, .lifetime:
                return true
            default:
                return false
            }
        }
    }
}

