# Core Package

Centralized error handling, structured logging, and functional result utilities for CartoStar.

**This package gives you:**
- Typed error handling with user-friendly messages (`AppError`)
- PII-safe structured logging with automatic redaction (`AppLogger`)
- Functional result patterns with error mapping (`ResultOrError`)
- HTTP error mapping from URLError and status codes
- Conditional conformances (Equatable, Sendable) where appropriate

## Quick Start

```swift
import Core

// Map system errors and log safely
func fetchUserData() async -> ResultOrError<User> {
    do {
        let data = try await URLSession.shared.data(from: userURL)
        let user = try JSONDecoder().decode(User.self, from: data)
        return .value(user)
    } catch {
        let appError = AppError.from(error) // Maps URLError, NSError automatically
        AppLogger.error("Failed to fetch user: \(appError.userMessage)")
        return .error(appError)
    }
}

// Chain operations functionally
let result = fetchUserData()
    .map { user in user.displayName }
    .mapError { _ in AppError.network(code: 0, message: "User unavailable") }
```

## Overview

The Core package provides the foundational error handling, logging, and result patterns used throughout the application. It ensures consistent error presentation to users while maintaining detailed logging for debugging.

## Key Concepts

### AppError
- Maps system errors (URLError, NSError) to typed application errors
- Provides user-friendly messages for common network scenarios  
- Supports HTTP status code mapping with Retry-After parsing
- Conforms to LocalizedError and Sendable for broad compatibility

```swift
let appError = AppError.from(URLError(.notConnectedToInternet))
print(appError.userMessage) // "You're offline. Please check your internet connection."
```

### AppLogger
- OSLog-based structured logging with categories (networking, ai, ui)
- Automatic PII redaction for API keys, tokens, and sensitive data
- Thread-safe with configurable subsystem identification

```swift
AppLogger.debug("API request: \(AppLogger.redacted(urlString))")
// Output: "API request: https://api.com/users?api_key=■REDACTED■"
```

### ResultOrError
- Custom result type optimized for AppError handling
- Functional transformations (map, flatMap, mapError, bimap)
- Bridges to Swift's Result type and throwing functions
- Conditional Equatable and Sendable conformance

```swift
let result = ResultOrError(catching: { try parseJSON(data) })
    .map { $0.username }
    .mapError { AppError.decoding }
```

## Usage

Integrate Core components in ViewModels for consistent error handling:

```swift
class UserViewModel: ObservableObject {
    @Published var user: User?
    @Published var errorMessage: String?
    
    func loadUser() async {
        let result = await userService.fetchUser()
        
        await MainActor.run {
            switch result {
            case .value(let user):
                self.user = user
                self.errorMessage = nil
            case .error(let error):
                self.errorMessage = error.userMessage
                AppLogger.error("User load failed: \(error.description)")
            }
        }
    }
}
```

## Advanced

- **Equality**: AppError.unknown compares NSError domain and code for deterministic behavior
- **LocalizedError**: errorDescription matches userMessage for system integration  
- **Functional patterns**: Chain operations with map/flatMap, handle errors with mapError/bimap
- **HTTP-date parsing**: Retry-After headers support both numeric seconds and RFC 7231 dates

## Testing

Run tests with `swift test --package-path Packages/Core`. All components include comprehensive unit tests with edge case coverage.

## Why This Exists

Provides consistent error handling and logging patterns across all application modules, ensuring users see friendly messages while developers get detailed diagnostic information.