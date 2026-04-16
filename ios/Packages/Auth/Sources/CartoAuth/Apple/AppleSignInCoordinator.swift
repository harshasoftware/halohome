import Foundation
#if canImport(AuthenticationServices)
import AuthenticationServices
#endif

/// Coordinates Apple Sign In flow
@available(iOS 17.0, *)
@MainActor
public final class AppleSignInCoordinator: NSObject {
    private var currentOriginalNonce: String?
    private var continuation: CheckedContinuation<(idToken: String, nonce: String), Error>?
    
    public override init() {
        super.init()
    }
}

// MARK: - AppleSignInProvider

@available(iOS 17.0, *)
extension AppleSignInCoordinator: AppleSignInProvider {
    
    public func requestIDToken(originalNonce: String, hashedNonce: String) async throws -> (idToken: String, nonce: String) {
        #if canImport(AuthenticationServices)
        // Store the original nonce to return after Apple Sign In completes
        self.currentOriginalNonce = originalNonce
        
        return try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            
            let appleIDProvider = ASAuthorizationAppleIDProvider()
            let request = appleIDProvider.createRequest()
            request.requestedScopes = [.fullName, .email]
            // Use the hashed nonce in the request
            request.nonce = hashedNonce
            
            let authorizationController = ASAuthorizationController(authorizationRequests: [request])
            authorizationController.delegate = self
            authorizationController.presentationContextProvider = self
            authorizationController.performRequests()
        }
        #else
        throw AuthError.notConfigured
        #endif
    }
}

// MARK: - ASAuthorizationControllerDelegate

#if canImport(AuthenticationServices)
@available(iOS 17.0, *)
extension AppleSignInCoordinator: ASAuthorizationControllerDelegate {
    
    public func authorizationController(controller: ASAuthorizationController, 
                                       didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let identityTokenData = appleIDCredential.identityToken,
              let identityToken = String(data: identityTokenData, encoding: .utf8),
              let originalNonce = currentOriginalNonce else {
            continuation?.resume(throwing: AuthError.invalidCredentials)
            continuation = nil
            currentOriginalNonce = nil
            return
        }
        
        continuation?.resume(returning: (idToken: identityToken, nonce: originalNonce))
        continuation = nil
        currentOriginalNonce = nil
    }
    
    public func authorizationController(controller: ASAuthorizationController, 
                                       didCompleteWithError error: Error) {
        if (error as NSError).code == ASAuthorizationError.canceled.rawValue {
            continuation?.resume(throwing: AuthError.cancelled)
        } else {
            continuation?.resume(throwing: AuthError.unknown(underlying: error))
        }
        continuation = nil
        currentOriginalNonce = nil
    }
}

// MARK: - ASAuthorizationControllerPresentationContextProviding

@available(iOS 17.0, *)
extension AppleSignInCoordinator: ASAuthorizationControllerPresentationContextProviding {
    
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        // Prefer the foreground-active scene's key window (iOS 15+ API, avoids deprecated .windows)
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        if let window = (scenes.first { $0.activationState == .foregroundActive } ?? scenes.first)?.keyWindow {
            return window
        }
        // Last resort: any window from any scene — never return a detached UIWindow() as that
        // causes ASAuthorizationController to silently fail with "Signup not completed".
        return scenes.flatMap { $0.windows }.first(where: { $0.isKeyWindow })
            ?? scenes.flatMap { $0.windows }.first
            ?? UIWindow()
    }
}
#endif
