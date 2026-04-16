import SwiftUI
#if canImport(SafariServices)
import SafariServices
#endif
#if canImport(UIKit)
import UIKit
#endif

/// Displays legal documents by opening the live web pages via in-app browser.
public struct LegalDocumentView: View {

    let url: URL

    public var body: some View {
        #if canImport(UIKit) && canImport(SafariServices)
        SafariView(url: url)
            .ignoresSafeArea()
        #else
        Text("Unable to display document on this platform.")
        #endif
    }

    // MARK: - Factory Methods

    public static func terms() -> LegalDocumentView {
        LegalDocumentView(url: URL(string: "https://cartostar.app/terms-of-service")!)
    }

    public static func privacy() -> LegalDocumentView {
        LegalDocumentView(url: URL(string: "https://cartostar.app/privacy-policy")!)
    }

    public static func subscriptionTerms() -> LegalDocumentView {
        LegalDocumentView(url: URL(string: "https://cartostar.app/subscription-terms")!)
    }

    public static func eula() -> LegalDocumentView {
        LegalDocumentView(url: URL(string: "https://cartostar.app/eula")!)
    }
}

// MARK: - Safari View Wrapper

#if canImport(UIKit) && canImport(SafariServices)
private struct SafariView: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        SFSafariViewController(url: url)
    }

    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}
#endif
