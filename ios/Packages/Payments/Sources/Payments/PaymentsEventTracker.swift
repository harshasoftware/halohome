import Foundation

/// Lightweight analytics hook for the Payments package.
/// Set these closures once at app launch on the main thread.
/// All calls back into these closures are dispatched to the main queue,
/// so there is no data race.
///
/// Usage (main app, e.g. AstroCarto.swift):
///   PaymentsEventTracker.onEvent = { name, props in
///       PostHogSDK.shared.capture(name, properties: props)
///   }
///   PaymentsEventTracker.onRevenue = { currency, amount, productID in
///       Analytics.revenue(currency: currency, amount: amount, productID: productID)
///   }
@MainActor
public enum PaymentsEventTracker {
    public static var onEvent: ((String, [String: Any]) -> Void)?
    /// Called when a confirmed purchase has price data — fires PostHog + Singular revenue.
    public static var onRevenue: ((_ currency: String, _ amount: Double, _ productID: String) -> Void)?

    public static func capture(_ name: String, properties: [String: Any] = [:]) {
        onEvent?(name, properties)
    }

    public static func revenue(currency: String, amount: Double, productID: String) {
        onRevenue?(currency, amount, productID)
    }
}
