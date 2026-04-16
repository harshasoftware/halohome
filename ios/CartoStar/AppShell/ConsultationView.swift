import SwiftUI
import WebKit
import DesignSystem

// MARK: - Consultation View

/// Session picker + Cal.com booking flow for consultations.
/// Two-phase: user picks a session type, then books via Cal.com in a WKWebView.
@available(iOS 17.0, *)
struct ConsultationView: View {

    let onDismiss: () -> Void

    @State private var selectedSession: ConsultSession?

    var body: some View {
        NavigationStack {
            Group {
                if let session = selectedSession {
                    CalBookingView(
                        session: session,
                        onBack: { selectedSession = nil }
                    )
                } else {
                    sessionPicker
                }
            }
            .background(Color.acBackground)
            .navigationTitle(selectedSession != nil ? "Book Session" : "Consultations")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        onDismiss()
                    }
                }
                if selectedSession != nil {
                    ToolbarItem(placement: .topBarLeading) {
                        Button {
                            selectedSession = nil
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "chevron.left")
                                    .font(.system(size: 14, weight: .semibold))
                                Text("Sessions")
                                    .font(.system(size: 16))
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Session Picker

    private var sessionPicker: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: DSSpacing.xl) {

                // Foundation sessions
                sessionCategory(
                    title: "Foundation Reading",
                    subtitle: "Discover your astrocartography map",
                    icon: "sparkles",
                    sessions: ConsultSession.foundation
                )

                // Relocation sessions
                sessionCategory(
                    title: "Relocation Consult",
                    subtitle: "Deep-dive into specific cities",
                    icon: "mappin.and.ellipse",
                    sessions: ConsultSession.relocation
                )

                // Duo session
                sessionCategory(
                    title: "Duo Reading",
                    subtitle: "For couples planning together",
                    icon: "person.2.fill",
                    sessions: [ConsultSession.duo]
                )

                // Policies
                policiesSection
            }
            .padding(DSSpacing.xl)
        }
    }

    private func sessionCategory(
        title: String,
        subtitle: String,
        icon: String,
        sessions: [ConsultSession]
    ) -> some View {
        VStack(alignment: .leading, spacing: DSSpacing.lg) {
            // Header
            HStack(spacing: DSSpacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Color.acAmber500)
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .saiScaledFont(size: 18, weight: .bold, relativeTo: .headline)
                        .foregroundStyle(Color.acForeground)

                    Text(subtitle)
                        .saiScaledFont(size: 13, relativeTo: .caption)
                        .foregroundStyle(Color.acMutedForeground)
                }
            }

            // Session cards
            ForEach(sessions) { session in
                SessionCard(session: session) {
                    selectedSession = session
                }
            }
        }
    }

    private var policiesSection: some View {
        VStack(alignment: .leading, spacing: DSSpacing.md) {
            Text("Session Details")
                .saiScaledFont(size: 14, weight: .semibold, relativeTo: .subheadline)
                .foregroundStyle(Color.acMutedForeground)

            VStack(alignment: .leading, spacing: DSSpacing.sm) {
                policyRow(icon: "video.fill", text: "All sessions are held via Zoom")
                policyRow(icon: "clock.fill", text: "Reschedule up to 24 hours before")
                policyRow(icon: "doc.text.fill", text: "Recording sent after each session")
                policyRow(icon: "gift.fill", text: "Personalized PDF report included")
            }
        }
        .padding(.top, DSSpacing.md)
    }

    private func policyRow(icon: String, text: String) -> some View {
        HStack(spacing: DSSpacing.md) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundStyle(Color.acAmber500.opacity(0.7))
                .frame(width: 16)
                .accessibilityHidden(true)

            Text(text)
                .saiScaledFont(size: 13, relativeTo: .caption)
                .foregroundStyle(Color.acMutedForeground)
        }
    }
}

// MARK: - Session Card

@available(iOS 17.0, *)
private struct SessionCard: View {

    let session: ConsultSession
    let onTap: () -> Void

    var body: some View {
        Button(action: {
            Haptics.tap()
            onTap()
        }) {
            HStack(spacing: DSSpacing.lg) {
                // Left: time + description
                VStack(alignment: .leading, spacing: DSSpacing.sm) {
                    HStack(spacing: DSSpacing.sm) {
                        Text(session.time)
                            .saiScaledFont(size: 16, weight: .semibold, relativeTo: .body)
                            .foregroundStyle(Color.acForeground)

                        if session.isPopular {
                            Text("MOST POPULAR")
                                .font(.system(size: 9, weight: .heavy))
                                .foregroundStyle(Color.acBackground)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 3)
                                .background(
                                    Capsule()
                                        .fill(Color.acAmber500)
                                )
                        }
                    }

                    Text(session.description)
                        .saiScaledFont(size: 13, relativeTo: .caption)
                        .foregroundStyle(Color.acMutedForeground)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }

                Spacer()

                // Right: price + arrow
                VStack(alignment: .trailing, spacing: DSSpacing.xs) {
                    Text(session.price)
                        .saiScaledFont(size: 20, weight: .bold, relativeTo: .title3)
                        .foregroundStyle(Color.acAmber500)

                    Image(systemName: "arrow.right.circle.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(Color.acAmber500.opacity(0.6))
                }
            }
            .padding(DSSpacing.lg)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.acMuted)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(
                        session.isPopular
                            ? Color.acAmber500.opacity(0.4)
                            : Color.acCardBorder,
                        lineWidth: session.isPopular ? 1.5 : 1
                    )
            )
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(session.time) session, \(session.price)")
        .accessibilityAddTraits(.isButton)
    }
}

// MARK: - Cal Booking View (WKWebView)

@available(iOS 17.0, *)
private struct CalBookingView: View {

    let session: ConsultSession
    let onBack: () -> Void

    @State private var isLoading = true
    @State private var loadError: String?
    @State private var retryId = UUID()

    var body: some View {
        ZStack {
            Color.acBackground
                .ignoresSafeArea()

            if let error = loadError {
                VStack(spacing: DSSpacing.lg) {
                    Image(systemName: "wifi.exclamationmark")
                        .font(.system(size: 40))
                        .foregroundStyle(Color.acMutedForeground)

                    Text("Failed to Load")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(Color.acForeground)

                    Text(error)
                        .font(.system(size: 14))
                        .foregroundStyle(Color.acMutedForeground)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, DSSpacing.xl)

                    Button {
                        loadError = nil
                        isLoading = true
                        retryId = UUID()
                    } label: {
                        HStack(spacing: DSSpacing.sm) {
                            Image(systemName: "arrow.clockwise")
                            Text("Try Again")
                        }
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color.acBackground)
                        .padding(.horizontal, DSSpacing.xl)
                        .padding(.vertical, DSSpacing.md)
                        .background(Capsule().fill(Color.acAmber500))
                    }
                    .padding(.top, DSSpacing.sm)
                }
            } else {
                CalWebView(
                    calLink: session.calLink,
                    isLoading: $isLoading,
                    loadError: $loadError
                )
                .id(retryId)
            }

            if isLoading && loadError == nil {
                VStack(spacing: DSSpacing.lg) {
                    ProgressView()
                        .tint(Color.acAmber500)
                        .scaleEffect(1.2)

                    Text("Loading calendar...")
                        .font(.system(size: 14))
                        .foregroundStyle(Color.acMutedForeground)
                }
            }
        }
    }
}

// MARK: - WKWebView Wrapper

private struct CalWebView: UIViewRepresentable {

    let calLink: String
    @Binding var isLoading: Bool
    @Binding var loadError: String?

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true

        // Inject dark background CSS to prevent white flash
        let darkCSS = """
        var style = document.createElement('style');
        style.textContent = 'body, html { background-color: #0a0a0a !important; color: #fafafa !important; }';
        document.head.appendChild(style);
        """
        let script = WKUserScript(
            source: darkCSS,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(script)

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(Color.acBackground)
        webView.scrollView.backgroundColor = UIColor(Color.acBackground)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = false

        // Validate calLink contains only safe characters (alphanumeric, hyphens, slashes)
        let safeCalLink = calLink.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? calLink
        var components = URLComponents(string: "https://cal.com")!
        components.path = "/\(safeCalLink)"
        components.queryItems = [
            URLQueryItem(name: "theme", value: "dark"),
            URLQueryItem(name: "layout", value: "month_view")
        ]
        if let url = components.url, url.host == "cal.com" {
            webView.load(URLRequest(url: url))
        }

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    class Coordinator: NSObject, WKNavigationDelegate {
        let parent: CalWebView

        init(parent: CalWebView) {
            self.parent = parent
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            Task { @MainActor in
                self.parent.isLoading = false
            }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            Task { @MainActor in
                self.parent.isLoading = false
                self.parent.loadError = error.localizedDescription
            }
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            Task { @MainActor in
                self.parent.isLoading = false
                self.parent.loadError = error.localizedDescription
            }
        }
    }
}

// MARK: - Consult Session Model

struct ConsultSession: Identifiable, Equatable {
    let id: String
    let time: String
    let price: String
    let description: String
    let calLink: String
    let isPopular: Bool

    init(id: String, time: String, price: String, description: String, calLink: String, isPopular: Bool = false) {
        self.id = id
        self.time = time
        self.price = price
        self.description = description
        self.calLink = calLink
        self.isPopular = isPopular
    }

    // MARK: - Session Data (matches web Consultation.tsx)

    static let foundation: [ConsultSession] = [
        ConsultSession(
            id: "foundation-30",
            time: "30 minutes",
            price: "$95",
            description: "Focused overview of main lines & 3-4 high-impact regions.",
            calLink: "halohome/foundation-30"
        ),
        ConsultSession(
            id: "foundation-45",
            time: "45 minutes",
            price: "$140",
            description: "Deeper reading covering work, love, and \"red flag\" regions.",
            calLink: "halohome/foundation-45",
            isPopular: true
        ),
        ConsultSession(
            id: "foundation-60",
            time: "60 minutes",
            price: "$185",
            description: "Full consultation with natal chart context & travel strategy.",
            calLink: "halohome/foundation-60"
        ),
    ]

    static let relocation: [ConsultSession] = [
        ConsultSession(
            id: "relocation-30",
            time: "30 minutes",
            price: "$120",
            description: "Focused follow-up on 1-2 potential cities.",
            calLink: "halohome/relocation-30"
        ),
        ConsultSession(
            id: "relocation-45",
            time: "45 minutes",
            price: "$165",
            description: "Comparing up to 3 locations with nuanced questions.",
            calLink: "halohome/relocation-45"
        ),
        ConsultSession(
            id: "relocation-60",
            time: "60 minutes",
            price: "$225",
            description: "Full strategy: 3-5 cities, timing, and local shifts.",
            calLink: "halohome/relocation-60",
            isPopular: true
        ),
    ]

    static let duo = ConsultSession(
        id: "duo-60",
        time: "60 minutes",
        price: "$450",
        description: "For couples: honeymoon, relocation, settling down, or vacation planning together.",
        calLink: "halohome/duo-60"
    )
}

// MARK: - Preview

#if DEBUG
@available(iOS 17.0, *)
#Preview("Consultation View") {
    ConsultationView(onDismiss: {})
        .preferredColorScheme(.dark)
}

@available(iOS 17.0, *)
#Preview("Session Card") {
    VStack(spacing: 16) {
        SessionCard(session: ConsultSession.foundation[1], onTap: {})
        SessionCard(session: ConsultSession.relocation[0], onTap: {})
    }
    .padding()
    .background(Color.acBackground)
    .preferredColorScheme(.dark)
}
#endif
