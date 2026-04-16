import SwiftUI
import SafariServices

/// Displays legal documents via halohome.com standalone pages in an in-app browser.
struct LegalDocumentView: View {

    let url: URL

    var body: some View {
        SafariView(url: url)
            .ignoresSafeArea()
    }

    // MARK: - Factory Methods (halohome.com full pages)

    static func terms() -> LegalDocumentView {
        LegalDocumentView(url: URL(string: "https://halohome.app/terms-of-service")!)
    }

    static func privacy() -> LegalDocumentView {
        LegalDocumentView(url: URL(string: "https://halohome.app/privacy-policy")!)
    }

    static func subscriptionTerms() -> LegalDocumentView {
        LegalDocumentView(url: URL(string: "https://halohome.app/subscription-terms")!)
    }

    static func eula() -> LegalDocumentView {
        LegalDocumentView(url: URL(string: "https://halohome.app/eula")!)
    }
}

// MARK: - Safari View Wrapper

private struct SafariView: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        let config = SFSafariViewController.Configuration()
        config.barCollapsingEnabled = false
        let vc = SFSafariViewController(url: url, configuration: config)
        vc.preferredBarTintColor = UIColor(red: 0.04, green: 0.04, blue: 0.06, alpha: 1)
        vc.preferredControlTintColor = .white
        return vc
    }

    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}
