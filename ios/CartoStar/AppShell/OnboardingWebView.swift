import SwiftUI
import WebKit

/// WebView-based onboarding that loads halohome.com/onboarding
/// Controlled by PostHog feature flag "show_webview_onboarding"
@available(iOS 17.0, *)
struct OnboardingWebView: View {
    let onComplete: () -> Void

    @State private var isLoading = true

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            OnboardingWebViewRepresentable(
                url: URL(string: "https://halohome.com/onboarding?native=1")!,
                isLoading: $isLoading,
                onComplete: onComplete
            )
            .ignoresSafeArea()

            // Loading overlay
            if isLoading {
                Color.black.ignoresSafeArea()
                ProgressView()
                    .tint(.white)
                    .scaleEffect(1.2)
            }
        }
        .statusBarHidden()
    }
}

// MARK: - WKWebView Wrapper

@available(iOS 17.0, *)
struct OnboardingWebViewRepresentable: UIViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool
    let onComplete: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true

        // Add message handler so the web page can signal completion
        config.userContentController.add(context.coordinator, name: "onboardingComplete")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black

        // Inject CSS to hide web nav/footer if needed
        let hideNavScript = WKUserScript(
            source: """
            document.addEventListener('DOMContentLoaded', function() {
                var style = document.createElement('style');
                style.textContent = 'nav, footer, .navbar, .site-header, .site-footer { display: none !important; }';
                document.head.appendChild(style);
            });
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(hideNavScript)

        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    // MARK: - Coordinator

    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        let parent: OnboardingWebViewRepresentable

        init(parent: OnboardingWebViewRepresentable) {
            self.parent = parent
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            parent.isLoading = false
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            parent.isLoading = false
        }

        // Handle message from web: window.webkit.messageHandlers.onboardingComplete.postMessage("done")
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "onboardingComplete" {
                parent.onComplete()
            }
        }

        // Intercept navigation — detect completion URL patterns
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) async -> WKNavigationActionPolicy {
            if let url = navigationAction.request.url {
                let path = url.path.lowercased()
                // If the onboarding navigates to /app, /globe, /home, or uses a custom scheme — treat as completion
                if path.contains("/app") || path.contains("/globe") || path.contains("/home") ||
                   url.scheme == "halohome" {
                    parent.onComplete()
                    return .cancel
                }
            }
            return .allow
        }
    }
}
