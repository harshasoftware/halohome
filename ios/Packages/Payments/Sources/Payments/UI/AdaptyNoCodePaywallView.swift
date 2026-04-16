import SwiftUI
import Adapty
import AdaptyUI
import Core

/// SwiftUI wrapper for Adapty's no-code paywall (designed in the Adapty dashboard).
/// Fetches the paywall configuration for a given placement and presents it
/// using AdaptyUI's `AdaptyPaywallController`.
@available(iOS 17.0, *)
public struct AdaptyNoCodePaywallView: UIViewControllerRepresentable {

    private let placementID: String
    private let onPurchaseComplete: () -> Void
    private let onDismiss: (() -> Void)?

    public init(
        placementID: String,
        onPurchaseComplete: @escaping () -> Void,
        onDismiss: (() -> Void)? = nil
    ) {
        self.placementID = placementID
        self.onPurchaseComplete = onPurchaseComplete
        self.onDismiss = onDismiss
    }

    public func makeCoordinator() -> Coordinator {
        Coordinator(
            onPurchaseComplete: onPurchaseComplete,
            onDismiss: onDismiss
        )
    }

    public func makeUIViewController(context: Context) -> AdaptyPaywallHostController {
        let host = AdaptyPaywallHostController()
        host.coordinator = context.coordinator
        host.placementID = placementID
        return host
    }

    public func updateUIViewController(_ uiViewController: AdaptyPaywallHostController, context: Context) {
        // Callbacks may change between SwiftUI updates
        context.coordinator.onPurchaseComplete = onPurchaseComplete
        context.coordinator.onDismiss = onDismiss
    }

    // MARK: - Coordinator (AdaptyPaywallControllerDelegate)

    @MainActor
    public final class Coordinator: NSObject, AdaptyPaywallControllerDelegate {
        var onPurchaseComplete: () -> Void
        var onDismiss: (() -> Void)?

        init(
            onPurchaseComplete: @escaping () -> Void,
            onDismiss: (() -> Void)?
        ) {
            self.onPurchaseComplete = onPurchaseComplete
            self.onDismiss = onDismiss
        }

        public func paywallControllerDidAppear(_ controller: AdaptyPaywallController) {
            AppLogger.info("Adapty no-code paywall appeared", category: AppLogger.payments)
        }

        public func paywallControllerDidDisappear(_ controller: AdaptyPaywallController) {
            AppLogger.info("Adapty no-code paywall disappeared", category: AppLogger.payments)
        }

        public func paywallController(
            _ controller: AdaptyPaywallController,
            didPerform action: AdaptyUI.Action
        ) {
            switch action {
            case .close:
                AppLogger.info("Adapty paywall close action", category: AppLogger.payments)
                onDismiss?()
            case .openURL(let url):
                UIApplication.shared.open(url)
            case .custom(let id):
                AppLogger.info("Adapty paywall custom action: \(id)", category: AppLogger.payments)
            }
        }

        public func paywallController(
            _ controller: AdaptyPaywallController,
            didSelectProduct product: AdaptyPaywallProductWithoutDeterminingOffer
        ) {
            AppLogger.debug("Product selected: \(product.vendorProductId)", category: AppLogger.payments)
        }

        public func paywallController(
            _ controller: AdaptyPaywallController,
            didStartPurchase product: AdaptyPaywallProduct
        ) {
            AppLogger.info("Purchase started: \(product.vendorProductId)", category: AppLogger.payments)
        }

        public func paywallController(
            _ controller: AdaptyPaywallController,
            didFinishPurchase product: AdaptyPaywallProduct,
            purchaseResult: AdaptyPurchaseResult
        ) {
            switch purchaseResult {
            case .success:
                AppLogger.info("No-code paywall purchase successful", category: AppLogger.payments)
                // Fire revenue to PostHog + Singular (Singular forwards to Google Ads S2S)
                PaymentsEventTracker.revenue(
                    currency: product.currencyCode ?? "USD",
                    amount: (product.price as NSDecimalNumber).doubleValue,
                    productID: product.vendorProductId
                )
                onPurchaseComplete()
            case .userCancelled:
                AppLogger.info("No-code paywall purchase cancelled", category: AppLogger.payments)
            case .pending:
                AppLogger.info("No-code paywall purchase pending", category: AppLogger.payments)
            }
        }

        public func paywallController(
            _ controller: AdaptyPaywallController,
            didFailPurchase product: AdaptyPaywallProduct,
            error: AdaptyError
        ) {
            AppLogger.error("No-code paywall purchase failed: \(error)", category: AppLogger.payments)
        }

        public func paywallControllerDidStartRestore(_ controller: AdaptyPaywallController) {
            AppLogger.info("No-code paywall restore started", category: AppLogger.payments)
        }

        public func paywallController(
            _ controller: AdaptyPaywallController,
            didFinishRestoreWith profile: AdaptyProfile
        ) {
            // Check if any access level is active after restore
            let hasAccess = profile.accessLevels.values.contains { $0.isActive }
            AppLogger.info("No-code paywall restore finished, hasAccess=\(hasAccess)", category: AppLogger.payments)
            if hasAccess {
                onPurchaseComplete()
            }
        }

        public func paywallController(
            _ controller: AdaptyPaywallController,
            didFailRestoreWith error: AdaptyError
        ) {
            AppLogger.error("No-code paywall restore failed: \(error)", category: AppLogger.payments)
        }

        public func paywallController(
            _ controller: AdaptyPaywallController,
            didFailRenderingWith error: AdaptyUIError
        ) {
            AppLogger.error("No-code paywall rendering failed: \(error)", category: AppLogger.payments)
        }

        public func paywallController(
            _ controller: AdaptyPaywallController,
            didFailLoadingProductsWith error: AdaptyError
        ) -> Bool {
            AppLogger.error("No-code paywall product loading failed: \(error)", category: AppLogger.payments)
            return true // retry once
        }

        public func paywallController(
            _ controller: AdaptyPaywallController,
            didPartiallyLoadProducts failedIds: [String]
        ) {
            AppLogger.error("No-code paywall partially loaded, failed IDs: \(failedIds)", category: AppLogger.payments)
        }

        public func paywallController(
            _ controller: AdaptyPaywallController,
            didFinishWebPaymentNavigation product: AdaptyPaywallProduct?,
            error: AdaptyError?
        ) {
            if let error {
                AppLogger.error("No-code paywall web payment error: \(error)", category: AppLogger.payments)
            }
        }
    }
}

// MARK: - Host Controller

/// A container UIViewController that loads the AdaptyPaywallController
/// asynchronously and embeds it as a child.
@available(iOS 17.0, *)
@MainActor
public final class AdaptyPaywallHostController: UIViewController {
    var placementID: String = ""
    var coordinator: AdaptyNoCodePaywallView.Coordinator?

    private var paywallController: AdaptyPaywallController?
    private var loadingView: UIActivityIndicatorView?
    private var errorLabel: UILabel?

    public override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.04, green: 0.04, blue: 0.08, alpha: 1.0)

        // Show loading spinner
        let spinner = UIActivityIndicatorView(style: .large)
        spinner.color = .white
        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.startAnimating()
        view.addSubview(spinner)
        NSLayoutConstraint.activate([
            spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
        loadingView = spinner

        Task {
            await loadPaywall()
        }
    }

    private func loadPaywall() async {
        guard let delegate = coordinator else { return }

        do {
            // 1. Get the paywall
            let paywall = try await Adapty.getPaywall(placementId: placementID)

            // 2. Get the visual configuration
            let configuration = try await AdaptyUI.getPaywallConfiguration(forPaywall: paywall)

            // 3. Create the paywall controller
            let controller = try AdaptyUI.paywallController(
                with: configuration,
                delegate: delegate
            )

            // 4. Embed as child view controller
            loadingView?.removeFromSuperview()
            addChild(controller)
            controller.view.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview(controller.view)
            NSLayoutConstraint.activate([
                controller.view.topAnchor.constraint(equalTo: view.topAnchor),
                controller.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
                controller.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
                controller.view.trailingAnchor.constraint(equalTo: view.trailingAnchor)
            ])
            controller.didMove(toParent: self)
            paywallController = controller

            AppLogger.info("No-code paywall loaded for placement '\(self.placementID)'", category: AppLogger.payments)
        } catch {
            AppLogger.error("Failed to load no-code paywall for '\(self.placementID)': \(error)", category: AppLogger.payments)
            loadingView?.removeFromSuperview()
            showError(error)
        }
    }

    private func showError(_ error: Error) {
        // Close button — top-right corner so reviewer/tester is never stuck
        let closeButton = UIButton(type: .system)
        closeButton.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        closeButton.tintColor = .white.withAlphaComponent(0.5)
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        closeButton.addTarget(self, action: #selector(dismissPaywall), for: .touchUpInside)
        view.addSubview(closeButton)

        let label = UILabel()
        label.text = "Unable to load paywall.\nCheck your connection and try again."
        label.textColor = .white.withAlphaComponent(0.6)
        label.font = .systemFont(ofSize: 15)
        label.numberOfLines = 0
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)

        // Retry button
        var retryConfig = UIButton.Configuration.tinted()
        retryConfig.title = "Retry"
        retryConfig.baseForegroundColor = .white
        retryConfig.baseBackgroundColor = .white.withAlphaComponent(0.15)
        retryConfig.cornerStyle = .capsule
        let retryButton = UIButton(configuration: retryConfig)
        retryButton.translatesAutoresizingMaskIntoConstraints = false
        retryButton.addTarget(self, action: #selector(retryLoadPaywall), for: .touchUpInside)
        view.addSubview(retryButton)

        NSLayoutConstraint.activate([
            closeButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            closeButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            closeButton.widthAnchor.constraint(equalToConstant: 32),
            closeButton.heightAnchor.constraint(equalToConstant: 32),

            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -20),
            label.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 32),
            label.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -32),

            retryButton.topAnchor.constraint(equalTo: label.bottomAnchor, constant: 20),
            retryButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
        ])
        errorLabel = label
    }

    @objc private func dismissPaywall() {
        coordinator?.onDismiss?()
    }

    @objc private func retryLoadPaywall() {
        // Remove existing error UI
        errorLabel?.removeFromSuperview()
        errorLabel = nil
        view.subviews.filter { $0 is UIButton }.forEach { $0.removeFromSuperview() }

        // Show spinner again
        let spinner = UIActivityIndicatorView(style: .large)
        spinner.color = .white
        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.startAnimating()
        view.addSubview(spinner)
        NSLayoutConstraint.activate([
            spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
        loadingView = spinner

        Task { await loadPaywall() }
    }
}
