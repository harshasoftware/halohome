import Foundation
import Core

/// Mapping utilities for Adapty types to domain types
enum AdaptyMappers {

    // MARK: - Known Product ID Map

    /// Maps known vendor product IDs to package types
    /// Product IDs must match App Store Connect exactly
    private static let knownProductTypes: [String: PaymentsOffering.PackageType] = [
        "com.cartostar.pro.monthly": .monthly,
        "com.cartostar.pro.annual": .annual,
        "com.cartostar.duo.monthly": .duoMonthly,
        "com.cartostar.duo.annual": .duoAnnual,
        "com.cartostar.lifetime": .lifetime,
    ]

    // MARK: - State Mapping

    /// Map AdaptyProfileProtocol to PaymentsState
    static func mapToState(profile: AdaptyProfileProtocol, accessLevelID: String) -> PaymentsState {
        // If the primary access level isn't active, fall back to "premium_duo".
        // This handles Duo subscribers whose product only grants premium_duo without also
        // granting premium — an Adapty misconfiguration that would otherwise leave them locked out.
        let effectiveID = profile.isAccessLevelActive(accessLevelID) ? accessLevelID : "premium_duo"
        let isActive = profile.isAccessLevelActive(effectiveID)
        let expiryDate = profile.accessLevelExpiresAt(effectiveID)
        let productID = profile.accessLevelVendorProductId(effectiveID)

        // Billing period start: only for active subscriptions that are NOT lifetime.
        // Free users and lifetime purchasers have a permanent all-time quota (no monthly reset).
        let isLifetime = productID?.contains("lifetime") == true
        let billingPeriodStart: Date? = (isActive && !isLifetime)
            ? profile.accessLevelRenewedAt(effectiveID)
            : nil

        return PaymentsState(
            isSubscribed: isActive,
            activeEntitlementIDs: profile.activeAccessLevelIDs,
            expirationDate: expiryDate,
            productID: productID,
            billingPeriodStart: billingPeriodStart
        )
    }

    // MARK: - Offering Mapping

    /// Map AdaptyProductProtocol to PaymentsOffering
    static func mapToOffering(_ product: AdaptyProductProtocol) -> PaymentsOffering {
        let packageType = detectPackageType(product)
        let title = packageType.displayName

        // Calculate monthly equivalent for annual plans
        let pricePerMonth: String? = {
            guard packageType == .annual || packageType == .duoAnnual else { return nil }

            let priceString = product.localizedPrice
            let currencySymbol = extractCurrencySymbol(from: priceString)

            if let numericPrice = extractNumericPrice(from: priceString) {
                let monthlyPrice = numericPrice / 12.0
                return "\(currencySymbol)\(String(format: "%.2f", monthlyPrice))"
            }

            return nil
        }()

        return PaymentsOffering(
            id: product.vendorProductId,
            title: title,
            price: formatPriceWithPeriod(product.localizedPrice, packageType: packageType),
            pricePerMonth: pricePerMonth,
            packageType: packageType
        )
    }

    // MARK: - Package Type Detection

    /// Detect package type: first checks known product ID map, then infers from period
    static func detectPackageType(_ product: AdaptyProductProtocol) -> PaymentsOffering.PackageType {
        // Check known product IDs first
        if let known = knownProductTypes[product.vendorProductId] {
            return known
        }

        // Infer from subscription period
        guard let period = product.subscriptionPeriod else {
            return .lifetime // No period = lifetime/one-time purchase
        }

        switch period.unit {
        case .month where period.numberOfUnits == 1:
            return .monthly
        case .year where period.numberOfUnits == 1:
            return .annual
        case .month where period.numberOfUnits >= 12:
            return .annual
        default:
            return .unknown
        }
    }

    // MARK: - Error Mapping

    /// Map Adapty/StoreKit/network errors to PaymentsError
    static func mapError(_ error: Error) -> PaymentsError {
        if error is CancellationError {
            return .cancelled
        }

        let nsError = error as NSError

        // Check for Adapty error codes
        if nsError.domain.contains("Adapty") || nsError.domain.contains("AdaptyError") {
            switch nsError.code {
            case 2: // paymentCancelled
                return .cancelled
            case 3: // paymentDeferred
                return .server(message: "Payment is pending approval.")
            case 1, 6: // network related
                return .network(underlying: error)
            case 7: // productNotAvailable
                return .purchaseNotAllowed
            default:
                AppLogger.error("Unknown Adapty error code: \(nsError.code) - \(nsError.localizedDescription)", category: AppLogger.payments)
                return .server(message: nsError.localizedDescription)
            }
        }

        // Check for StoreKit errors
        if nsError.domain == "SKErrorDomain" {
            switch nsError.code {
            case 0: return .unknown(underlying: error)
            case 1: return .purchaseNotAllowed
            case 2: return .cancelled
            case 3: return .server(message: "Payment information is invalid.")
            case 4: return .purchaseNotAllowed
            case 5: return .server(message: "This product is not available in your region.")
            default: return .unknown(underlying: error)
            }
        }

        // Check for network errors
        if nsError.domain == NSURLErrorDomain {
            return .network(underlying: error)
        }

        return .unknown(underlying: error)
    }

    // MARK: - Private Helpers

    private static func formatPriceWithPeriod(_ price: String, packageType: PaymentsOffering.PackageType) -> String {
        switch packageType {
        case .monthly, .duoMonthly: return "\(price)/month"
        case .annual, .duoAnnual: return "\(price)/year"
        case .lifetime: return price
        case .unknown: return price
        }
    }

    private static func extractCurrencySymbol(from priceString: String) -> String {
        let symbols = ["$", "€", "£", "¥", "₹", "A$", "C$", "HK$", "NZ$", "S$"]
        for symbol in symbols {
            if priceString.contains(symbol) {
                return symbol
            }
        }
        return "$"
    }

    private static func extractNumericPrice(from priceString: String) -> Double? {
        let numericString = priceString
            .replacingOccurrences(of: "[^0-9.,]", with: "", options: .regularExpression)
            .replacingOccurrences(of: ",", with: ".")
        return Double(numericString)
    }
}
