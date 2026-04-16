# Auth Package

Unified authentication with Apple, Google, and Email via Supabase Auth for CartoStar.

**This package gives you:**
- **Unified Social OAuth**: Apple and Google Sign In via Supabase GoTrue
- **Email Authentication**: Sign up, sign in, and password reset
- **Session Persistence**: Users stay logged in automatically via Keychain
- **Automatic Token Refresh**: Proactive refresh 60s before expiry
- **Secure Storage**: Keychain-backed token storage
- **AsyncStream State**: Real-time auth state observation
- **Full Cancellation**: Task cancellation support throughout

## Quick Start

### Apple + Google + Email Authentication

```swift
import Auth
import Storage
import Networking

// Configure with your Supabase project credentials
// Get these from: https://app.supabase.com/project/_/settings/api
let config = AuthConfig(
    supabaseURL: URL(string: "https://yourproject.supabase.co")!,
    supabaseAnonKey: "your-anon-key"  // Public anon key (safe to include)
)

let httpClient = URLSessionHTTPClient(baseURL: config.supabaseURL)
let keychain = KeychainStore()

// Social sign-in providers
let appleProvider = AppleSignInCoordinator()
let googleProvider = GoogleSignInCoordinator(clientID: "YOUR_GOOGLE_CLIENT_ID")

let authClient = SessionManager(
    httpClient: httpClient,
    keychain: keychain,
    apple: appleProvider,
    google: googleProvider,  // Optional
    config: config
)

// Sign in with Apple
let user = try await authClient.signInWithApple()
print("Signed in with Apple: \(user.email ?? "unknown")")

// Sign in with Google
let user = try await authClient.signInWithGoogle()
print("Signed in with Google: \(user.email ?? "unknown")")

// Sign up with email/password
let user = try await authClient.signUpWithEmail(
    email: "user@example.com",
    password: "secure-password"
)

// Sign in with email/password
let user = try await authClient.signInWithEmail(
    email: "user@example.com", 
    password: "secure-password"
)

// Observe auth state changes
for await state in authClient.authStates() {
    switch state {
    case .authenticated(let user):
        print("Authenticated: \(user.id)")
    case .unauthenticated:
        print("Not authenticated")
    case .refreshing:
        print("Refreshing token...")
    }
}
```

## Overview

The Auth package provides a complete, unified authentication solution using Supabase's GoTrue API with support for:
- **Social OAuth**: Apple and Google Sign In
- **Email Authentication**: Traditional email/password signup and login
- **Session Persistence**: Automatic session restoration from Keychain
- **Token Management**: Proactive refresh and lifecycle handling

All authentication methods flow through Supabase, providing a consistent user experience and centralized user management.

## How It Works

### GoTrue Endpoints

The package directly calls Supabase GoTrue endpoints without third-party SDKs:

1. **Apple Sign In**: `POST /auth/v1/token?grant_type=id_token&provider=apple`
   - Exchanges Apple ID token + nonce for Supabase session
   
2. **Google Sign In**: `POST /auth/v1/token?grant_type=id_token&provider=google`
   - Exchanges Google ID token for Supabase session

3. **Email Sign Up**: `POST /auth/v1/signup`
   - Creates new user account with email/password

4. **Email Sign In**: `POST /auth/v1/token?grant_type=password`
   - Authenticates user with email/password
   
5. **Token Refresh**: `POST /auth/v1/token?grant_type=refresh_token`
   - Refreshes expired access tokens using refresh token
   
6. **Password Reset**: `POST /auth/v1/recover`
   - Sends password reset email to user

7. **Sign Out**: `POST /auth/v1/logout`
   - Revokes access token on server (best effort)

### Session Persistence

✅ **Users stay logged in automatically** - Sessions are restored on app launch

**How it works:**
1. **Initial Load**: On app launch, `SessionManager` loads session from Keychain
2. **Validation**: Checks if session is expired
3. **Auto-Restore**: If valid, user is automatically authenticated
4. **Auto-Refresh**: If expiring soon, token is refreshed proactively
5. **Navigation**: `LaunchRouter` observes state and navigates to main screen

**Storage:**
- **Keychain**: Secure storage with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`
- **Persists**: Across app launches and updates
- **Encrypted**: iOS-level encryption
- **Auto-Delete**: Removed on app uninstall

### Token Refresh Strategy

- **Proactive Refresh**: Scheduled 60 seconds before token expiry
- **Automatic Execution**: Happens in background, no user interaction
- **Refresh Token Rotation**: Handles Supabase token rotation automatically
- **Retry Logic**: Up to 3 attempts with exponential backoff
- **Refresh Mutex**: Prevents concurrent refresh requests (race-safe)
- **Validation on Load**: Expired sessions auto-cleared
- **Cancellation-Aware**: All operations handle task cancellation

## Key Components

### AuthClient Protocol
Public interface for all authentication operations. Implemented by:
- `SessionManager` - Production implementation
- `MockAuthClient` - Debug/testing implementation

### SessionManager
Main actor coordinating authentication flow, token persistence, and state emission.
Handles all auth methods: Apple, Google, and Email.

### AppleSignInCoordinator
iOS-native Apple Sign In using ASAuthorizationController with secure nonce handling.

### GoogleSignInCoordinator
Google OAuth flow using GoogleSignIn SDK (optional dependency).

### SupabaseAuthAPI
Internal API client for GoTrue endpoints with proper error mapping.
Supports all auth providers and token operations.

## Integration with Networking

The Auth package works seamlessly with the Networking package via `KeychainTokenProvider`:

```swift
// In your app's composition root
let tokenProvider = KeychainTokenProvider(keychain: keychain)
let authInterceptor = AuthInterceptor(tokenProvider: tokenProvider)

let networkClient = URLSessionHTTPClient(
    baseURL: apiURL,
    interceptors: [authInterceptor]
)
```

## Testing

Tests use ephemeral URLSessions with URLProtocol stubs and fake providers:
- No real network calls or Apple Sign In UI
- Deterministic with FakeSleeper for refresh scheduling
- Full coverage of sign in, refresh, sign out, and cancellation paths

## Why This Exists

Provides a lightweight, testable authentication layer that integrates Supabase Auth with Apple Sign In while maintaining separation between UI, session management, and token storage. The design ensures tokens are automatically available to the Networking layer without coupling.
