# Networking Package

HTTP client with interceptors, retry logic, response caching, and comprehensive error handling for CartoStar.

**This package gives you:**
- Clean HTTPClient protocol with URLSession implementation
- Interceptor pipeline (Headers, Auth, Retry) for cross-cutting concerns
- Exponential backoff retry with jitter and server Retry-After support
- Response caching with TTL helpers and synthetic cache control
- PII-safe logging with automatic redaction of sensitive headers
- Full cancellation support through structured concurrency

## Quick Start

```swift
import Networking
import Core

// Configure client with interceptors
let client = URLSessionHTTPClient(
    baseURL: URL(string: "https://api.example.com")!,
    interceptors: [
        HeadersInterceptor(appVersion: "1.0.0"),
        AuthInterceptor(tokenProvider: MyTokenProvider()),
        RetryInterceptor()
    ]
)

// Send request with caching
let request = HTTPRequest(path: "/users", method: .get)
    .withCache(CachePolicy(defaultTTL: 300))

let response = try await client.send(request)
// Automatic: headers added, auth injected, retries on failure, response cached
```

## Overview

The Networking package provides production-ready HTTP communication with enterprise features like automatic retry, authentication handling, and intelligent caching while maintaining clean architectural boundaries.

## Key Concepts

### HTTPClient
- Protocol-based abstraction for HTTP communication
- URLSession implementation with configurable base URL and headers
- Automatic error mapping to AppError with user-friendly messages

### Interceptors
- **HeadersInterceptor**: Adds app version, platform, User-Agent, and custom headers
- **AuthInterceptor**: Injects Bearer tokens via TokenProvider protocol  
- **RetryInterceptor**: Handles transient failures (timeouts, 5xx, 429) with exponential backoff

### Retry Policy
- Configurable max attempts, base delay, delay cap, and jitter
- Respects server Retry-After headers (numeric seconds and HTTP-date)
- Cancellation-aware with direct CancellationError passthrough

### Caching
- Request-level cache policies (.useURLCache, .reloadIgnoringCache)
- Synthetic TTL for responses without server cache headers
- Cacheable status codes: 200, 203, 204, 206, 300, 301, 308, 404, 410
- Respects Cache-Control directives (no-store prevents caching)

## Usage

### Basic Client

```swift
let client = URLSessionHTTPClient(baseURL: URL(string: "https://api.example.com")!)
let request = HTTPRequest(path: "/data", method: .get)
let response = try await client.send(request)
```

### With Interceptors

```swift
struct MyTokenProvider: TokenProvider {
    func currentToken() -> String? { 
        UserDefaults.standard.string(forKey: "auth_token") 
    }
}

let client = URLSessionHTTPClient(
    baseURL: baseURL,
    interceptors: [
        HeadersInterceptor(appVersion: "1.0.0"),
        AuthInterceptor(tokenProvider: MyTokenProvider()),
        RetryInterceptor(policy: RetryPolicy(maxAttempts: 3))
    ]
)
```

### Caching

```swift
// Use server cache headers or apply 5-minute fallback TTL
let request = HTTPRequest(path: "/api/users", method: .get)
    .withCache(CachePolicy(mode: .useURLCache, defaultTTL: 300))

// Always fetch fresh data
let freshRequest = HTTPRequest(path: "/live/data", method: .get)
    .withCache(CachePolicy(mode: .reloadIgnoringCache))
```

## Advanced

### Custom Interceptors

```swift
struct CustomInterceptor: HTTPInterceptor {
    func adapt(_ request: inout URLRequest) {
        request.setValue("custom-value", forHTTPHeaderField: "X-Custom")
    }
    
    func shouldRetry(response: HTTPURLResponse?, data: Data?, error: Error?, attempt: Int) -> RetryDecision {
        return .noRetry // Custom retry logic
    }
}
```

### Retry Configuration

```swift
let retryPolicy = RetryPolicy(
    maxAttempts: 5,     // Maximum retry attempts
    baseDelay: 1.0,     // Base delay in seconds  
    maxDelay: 30.0,     // Maximum delay cap
    jitter: 0.3         // Jitter fraction (0.0-1.0)
)
```

## Testing

Tests use URLProtocolStub for request interception and ephemeral URLSessions with controlled URLCache. Deterministic timing via fake sleepers avoids wall-clock dependencies.

## FAQ

**How does Retry-After work?** Server headers take precedence over retry policy. Supports both numeric seconds and HTTP-date formats.

**How many retries happen?** maxAttempts includes the initial request (e.g., maxAttempts: 3 = 1 initial + 2 retries).

**What gets cached?** Only responses with cacheable status codes (200, 203, 204, 206, 300, 301, 308, 404, 410) unless no-store directive is present.

## Why This Exists

Provides a robust, testable HTTP layer that handles cross-cutting concerns (auth, retry, caching) while maintaining clean separation between networking infrastructure and business logic.