# Storage Package

SwiftData persistence, repository patterns, and secure Keychain storage for CartoStar.

**This package gives you:**
- SwiftData models with repository abstraction (no @Model types leak out)
- Cursor-based pagination for message history with deterministic ordering
- Background context support for large operations
- Batch operations for efficient bulk deletions
- Migration framework with version tracking
- Automatic retry for transient storage errors
- Secure Keychain wrapper for tokens and sensitive data
- Thread-safe operations with proper error mapping to AppError
- In-memory containers for testing

## Quick Start

```swift
import Storage

// Setup
let container = try StorageModelContainer.make()
let repos = StorageModelContainer.makeRepositories(container: container)

// Create conversation and append messages
let conversation = try await repos.conversations.create(
    title: "New Chat",
    personaName: "Assistant"
)
let message = try await repos.messages.append(
    conversationID: conversation.id,
    role: .user,
    text: "Hello!",
    createdAt: Date()
)

// Secure token storage
let keychain = KeychainStore()
try keychain.setString("sk-secret", for: KeychainStore.Keys.authAccessToken)
let tokenProvider = KeychainTokenProvider(keychain: keychain)
```

## Overview

Storage provides the persistence layer with clean boundaries between SwiftData models and the rest of the application. Views never touch SwiftData or Keychain directly - all access goes through repository protocols that return lightweight DTOs.

## Key Concepts

### Repositories
- **ConversationRepository**: Create, rename, delete, list conversations ordered by updatedAt
- **MessageRepository**: Append messages, paginate history with cursor-based pagination
- **SettingsRepository**: Load and save user preferences with automatic default creation

### DTOs (Data Transfer Objects)
- Lightweight structs that mirror domain needs without SwiftData dependencies
- `ConversationDTO`, `MessageDTO`, `SettingsDTO` with proper enums for type safety
- Internal mappers handle conversion between @Model and DTO

### Keychain
- Thread-safe wrapper around Security framework
- Standard keys for auth tokens (`auth_access_token`, `auth_refresh_token`)
- Automatic PII redaction in logs via AppLogger

## Usage

### Repository Pattern

```swift
// Create repositories from container
@MainActor
let repos = StorageModelContainer.makeRepositories(container: container)

// List conversations (newest first)
let conversations = try await repos.conversations.list(
    limit: 20,
    after: lastConversation?.updatedAt
)

// Paginate messages with cursor
let page = try await repos.messages.page(
    conversationID: conversationID,
    after: MessageCursor(createdAt: lastDate, id: lastID),
    limit: 50
)
// Use page.items and page.next for pagination
```

### Secure Storage

```swift
// Store sensitive data
let keychain = KeychainStore(accessGroup: "group.com.app")
try keychain.setString(refreshToken, for: KeychainStore.Keys.authRefreshToken)

// Use with Networking's AuthInterceptor
let tokenProvider = KeychainTokenProvider(keychain: keychain)
// tokenProvider.currentToken() returns nil if no token stored
```

### Settings Management

```swift
// Load settings (creates defaults if none exist)
let settings = try await repos.settings.load()

// Update settings
let updated = SettingsDTO(
    theme: .dark,
    preferredModel: "gpt-4",
    reduceMotion: true
)
try await repos.settings.save(updated)
```

## Advanced

### Background Operations

For large data operations that shouldn't block the UI:

```swift
let backgroundRepos = StorageModelContainer.makeBackgroundRepositories(container: container)
// Use backgroundRepos for bulk operations
```

### Batch Operations

```swift
// Efficiently delete multiple messages
try await messageRepo.batchDelete(messageIDs: [id1, id2, id3])
```

### Migrations

The package includes a migration framework for safe schema evolution:
- Version tracking via `StorageSchemaVersion`
- Automatic validation on container creation
- Guidelines for lightweight vs. custom migrations
- See `StorageMigration.swift` for detailed documentation

## Testing

Tests use in-memory containers for isolation and speed. Run with `swift test --package-path Packages/Storage`.

```swift
// Test setup
let container = try StorageModelContainer.make(inMemory: true)
let repo = ConversationRepositoryImpl(modelContext: container.mainContext)
```

## Why This Exists

Provides a clean abstraction over SwiftData and Keychain, ensuring Views never directly access persistence layers. This maintains MVVM boundaries while offering type-safe, testable data access patterns with proper error handling and logging.
