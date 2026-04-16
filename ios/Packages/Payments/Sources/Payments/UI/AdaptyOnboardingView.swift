import SwiftUI
import Adapty
import AdaptyUI
import Core

/// SwiftUI wrapper for Adapty's no-code onboarding (designed in the Adapty dashboard).
/// Fetches the onboarding configuration for a given placement and presents it
/// using AdaptyUI's `AdaptyOnboardingController`.
@available(iOS 17.0, *)
public struct AdaptyOnboardingView: UIViewControllerRepresentable {

    private let placementID: String
    private let onPurchaseComplete: (() -> Void)?
    private let onDismiss: () -> Void

    public init(
        placementID: String,
        onPurchaseComplete: (() -> Void)? = nil,
        onDismiss: @escaping () -> Void
    ) {
        self.placementID = placementID
        self.onPurchaseComplete = onPurchaseComplete
        self.onDismiss = onDismiss
    }

    public func makeCoordinator() -> Coordinator {
        Coordinator(
            placementID: placementID,
            onPurchaseComplete: onPurchaseComplete,
            onDismiss: onDismiss
        )
    }

    public func makeUIViewController(context: Context) -> AdaptyOnboardingHostController {
        let host = AdaptyOnboardingHostController()
        host.coordinator = context.coordinator
        host.placementID = placementID
        return host
    }

    public func updateUIViewController(_ uiViewController: AdaptyOnboardingHostController, context: Context) {
        context.coordinator.onPurchaseComplete = onPurchaseComplete
        context.coordinator.onDismiss = onDismiss
    }

    // MARK: - Coordinator (AdaptyOnboardingControllerDelegate + AdaptyPaywallControllerDelegate)

    @MainActor
    public final class Coordinator: NSObject, AdaptyOnboardingControllerDelegate, AdaptyPaywallControllerDelegate {
        let placementID: String
        var onPurchaseComplete: (() -> Void)?
        var onDismiss: () -> Void

        init(
            placementID: String,
            onPurchaseComplete: (() -> Void)?,
            onDismiss: @escaping () -> Void
        ) {
            self.placementID = placementID
            self.onPurchaseComplete = onPurchaseComplete
            self.onDismiss = onDismiss
        }

        // MARK: - Onboarding Delegate

        public func onboardingController(
            _ controller: AdaptyOnboardingController,
            didFinishLoading action: OnboardingsDidFinishLoadingAction
        ) {
            AppLogger.info("Adapty onboarding loaded for '\(self.placementID)'", category: AppLogger.payments)
        }

        public func onboardingController(
            _ controller: AdaptyOnboardingController,
            onCloseAction action: AdaptyOnboardingsCloseAction
        ) {
            AppLogger.info("Adapty onboarding close action", category: AppLogger.payments)
            onDismiss()
        }

        public func onboardingController(
            _ controller: AdaptyOnboardingController,
            onPaywallAction action: AdaptyOnboardingsOpenPaywallAction
        ) {
            AppLogger.info("Adapty onboarding paywall action: \(action.actionId)", category: AppLogger.payments)

            // Present the paywall as a modal over the onboarding
            Task { @MainActor in
                do {
                    let paywall = try await Adapty.getPaywall(placementId: "afterauth")
                    let config = try await AdaptyUI.getPaywallConfiguration(forPaywall: paywall)
                    let paywallVC = try AdaptyUI.paywallController(with: config, delegate: self)
                    controller.present(paywallVC, animated: true)
                } catch {
                    AppLogger.error("Adapty onboarding paywall load failed: \(error)", category: AppLogger.payments)
                }
            }
        }

        public func onboardingController(
            _ controller: AdaptyOnboardingController,
            onCustomAction action: AdaptyOnboardingsCustomAction
        ) {
            AppLogger.info("Adapty onboarding custom action: \(action.actionId)", category: AppLogger.payments)
        }

        public func onboardingController(
            _ controller: AdaptyOnboardingController,
            onStateUpdatedAction action: AdaptyOnboardingsStateUpdatedAction
        ) {
            // State updates from onboarding screens (no-op)
        }

        public func onboardingController(
            _ controller: AdaptyOnboardingController,
            onAnalyticsEvent event: AdaptyOnboardingsAnalyticsEvent
        ) {
            // Analytics handled automatically by Adapty
        }

        public func onboardingController(
            _ controller: AdaptyOnboardingController,
            didFailWithError error: AdaptyUIError
        ) {
            AppLogger.error("Adapty onboarding error: \(error)", category: AppLogger.payments)
        }

        public func onboardingsControllerLoadingPlaceholder(
            _ controller: AdaptyOnboardingController
        ) -> UIView? {
            nil // Use default placeholder
        }

        // MARK: - Paywall Delegate (for in-onboarding paywall)

        public func paywallController(
            _ controller: AdaptyPaywallController,
            didPerform action: AdaptyUI.Action
        ) {
            switch action {
            case .close:
                controller.dismiss(animated: true)
            case .openURL(let url):
                UIApplication.shared.open(url)
            case .custom(let id):
                AppLogger.info("Onboarding paywall custom action: \(id)", category: AppLogger.payments)
            }
        }

        public func paywallController(
            _ controller: AdaptyPaywallController,
            didFinishPurchase product: AdaptyPaywallProduct,
            purchaseResult: AdaptyPurchaseResult
        ) {
            switch purchaseResult {
            case .success:
                AppLogger.info("Onboarding paywall purchase successful", category: AppLogger.payments)
                controller.dismiss(animated: true) {
                    self.onPurchaseComplete?()
                }
            case .userCancelled:
                AppLogger.info("Onboarding paywall purchase cancelled", category: AppLogger.payments)
            case .pending:
                AppLogger.info("Onboarding paywall purchase pending", category: AppLogger.payments)
            }
        }

        public func paywallController(
            _ controller: AdaptyPaywallController,
            didFailPurchase product: AdaptyPaywallProduct,
            error: AdaptyError
        ) {
            AppLogger.error("Onboarding paywall purchase failed: \(error)", category: AppLogger.payments)
        }

        public func paywallControllerDidStartRestore(_ controller: AdaptyPaywallController) {
            AppLogger.info("Onboarding paywall restore started", category: AppLogger.payments)
        }

        public func paywallController(
            _ controller: AdaptyPaywallController,
            didFinishRestoreWith profile: AdaptyProfile
        ) {
            let hasAccess = profile.accessLevels.values.contains { $0.isActive }
            if hasAccess {
                controller.dismiss(animated: true) {
                    self.onPurchaseComplete?()
                }
            }
        }

        public func paywallController(
            _ controller: AdaptyPaywallController,
            didFailRestoreWith error: AdaptyError
        ) {
            AppLogger.error("Onboarding paywall restore failed: \(error)", category: AppLogger.payments)
        }

        public func paywallController(
            _ controller: AdaptyPaywallController,
            didFailRenderingWith error: AdaptyUIError
        ) {
            AppLogger.error("Onboarding paywall rendering failed: \(error)", category: AppLogger.payments)
        }

        public func paywallController(
            _ controller: AdaptyPaywallController,
            didFailLoadingProductsWith error: AdaptyError
        ) -> Bool {
            true // retry once
        }
    }
}

// MARK: - Host Controller

/// A container UIViewController that loads the AdaptyOnboardingController
/// asynchronously and embeds it as a child.
@available(iOS 17.0, *)
@MainActor
public final class AdaptyOnboardingHostController: UIViewController {
    var placementID: String = ""
    var coordinator: AdaptyOnboardingView.Coordinator?

    private var onboardingController: AdaptyOnboardingController?
    private var loadingView: UIActivityIndicatorView?

    public override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.04, green: 0.04, blue: 0.08, alpha: 1.0)

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

        Task { await loadOnboarding() }
    }

    private func loadOnboarding() async {
        guard let delegate = coordinator else { return }

        do {
            let onboarding = try await Adapty.getOnboarding(placementId: placementID)
            let config = try AdaptyUI.getOnboardingConfiguration(forOnboarding: onboarding)
            let controller = try AdaptyUI.onboardingController(with: config, delegate: delegate)

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
            onboardingController = controller

            AppLogger.info("Adapty onboarding loaded for placement '\(self.placementID)'", category: AppLogger.payments)
        } catch {
            AppLogger.error("Failed to load onboarding for '\(self.placementID)': \(error)", category: AppLogger.payments)
            loadingView?.removeFromSuperview()
            showError()
        }
    }

    private func showError() {
        let closeButton = UIButton(type: .system)
        closeButton.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        closeButton.tintColor = .white.withAlphaComponent(0.5)
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        closeButton.addTarget(self, action: #selector(dismissOnboarding), for: .touchUpInside)
        view.addSubview(closeButton)

        let label = UILabel()
        label.text = "Unable to load onboarding.\nCheck your connection and try again."
        label.textColor = .white.withAlphaComponent(0.6)
        label.font = .systemFont(ofSize: 15)
        label.numberOfLines = 0
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)

        var retryConfig = UIButton.Configuration.tinted()
        retryConfig.title = "Retry"
        retryConfig.baseForegroundColor = .white
        retryConfig.baseBackgroundColor = .white.withAlphaComponent(0.15)
        retryConfig.cornerStyle = .capsule
        let retryButton = UIButton(configuration: retryConfig)
        retryButton.translatesAutoresizingMaskIntoConstraints = false
        retryButton.addTarget(self, action: #selector(retryLoad), for: .touchUpInside)
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
    }

    @objc private func dismissOnboarding() {
        coordinator?.onDismiss()
    }

    @objc private func retryLoad() {
        view.subviews.forEach { $0.removeFromSuperview() }

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

        Task { await loadOnboarding() }
    }
}
