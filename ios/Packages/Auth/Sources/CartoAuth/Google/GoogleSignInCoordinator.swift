import Foundation
#if canImport(GoogleSignIn)
import GoogleSignIn
#endif

/// Coordinates Google Sign In flow
@available(iOS 17.0, *)
@MainActor
public final class GoogleSignInCoordinator: NSObject {

    private let clientID: String

    public init(clientID: String) {
        self.clientID = clientID
        super.init()
    }
}

// MARK: - GoogleSignInProvider

@available(iOS 17.0, *)
extension GoogleSignInCoordinator: GoogleSignInProvider {

    public func requestTokens() async throws -> GoogleSignInResult {
        #if canImport(GoogleSignIn)
        let config = GIDConfiguration(clientID: clientID)
        GIDSignIn.sharedInstance.configuration = config

        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let keyWindow = (scenes.first { $0.activationState == .foregroundActive } ?? scenes.first)?.keyWindow
        guard let root = keyWindow?.rootViewController else {
            throw AuthError.notConfigured
        }
        // Walk to the topmost presented view controller — GIDSignIn fails silently if
        // it tries to present over a controller that is already presenting something.
        var presenting = root
        while let presented = presenting.presentedViewController {
            presenting = presented
        }

        let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenting)

        guard let idToken = result.user.idToken?.tokenString else {
            throw AuthError.invalidCredentials
        }

        let accessToken = result.user.accessToken.tokenString

        return GoogleSignInResult(idToken: idToken, accessToken: accessToken)
        #else
        throw AuthError.notConfigured
        #endif
    }
}
