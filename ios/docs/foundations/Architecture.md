# Architecture Overview

High-level system design for CartoStar.

## System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         SwiftUI Views                            │
│                      (AppShell screens)                          │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼─────────────────────────────────────┐
│                      CompositionRoot                               │
│          (Dependency Injection, factories)                         │
└─┬────────┬───────┬───────┬───────┬───────────┬────────────┬────────┘
  │        │       │       │       │           │            │
  ▼        ▼       ▼       ▼       ▼           ▼            ▼
┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌─────┐  ┌──────────┐  ┌────────┐
│Core│  │Net │  │Stor│  │Auth│  │Pay  │  │   AI     │  │Feature │
│    │  │work│  │age │  │    │  │ments│  │          │  │ Modules│
└────┘  └────┘  └────┘  └────┘  └─────┘  └──────────┘  └────────┘
   │       │       │       │       │          │             │
   │       └───────┴───────┴───────┴──────────┴─────────────┘
   │                       │                           │
   ▼                       ▼                           ▼
┌──────────────────┐  ┌─────────────────┐  ┌──────────────────┐
│ DesignSystem     │  │ SwiftData       │  │ Supabase Edge    │
│ (UI Components)  │  │ Keychain        │  │ Function (AI)    │
└──────────────────┘  └─────────────────┘  └──────────────────┘
```

## Five Key Points

### 1. Data Flow (MVVM)

```
User Interaction → View → ViewModel → Repository/Client → Data Source
                    ↑                         ↓
                    └─── Published State ─────┘
```

**Views** are stateless, render `@Published` state from ViewModels.
**ViewModels** orchestrate business logic, expose immutable state.
**Repositories** abstract data access (SwiftData, Keychain).
**Clients** handle external communication (HTTP, LLM, Payments).

**Example:**
```swift
// User sends message
ChatView → ChatViewModel.sendMessage()
         → LLMClient.streamResponse()
         → MessageRepository.save()
         → Updates @Published messages
         → ChatView re-renders
```

### 2. Dependency Injection (CompositionRoot)

All dependencies are created once at app launch in `CompositionRoot`:

```swift
@MainActor
class CompositionRoot {
    // Singletons
    let httpClient: HTTPClient
    let keychainStore: KeychainStore
    let sessionManager: AuthClient
    let paymentsClient: PaymentsClient
    let llmClient: LLMClient
    let crashReporter: CrashReporter
    
    // Repositories
    let conversationRepository: ConversationRepository
    let messageRepository: MessageRepository
    let settingsRepository: SettingsRepository
    
    // Factories
    func makeChatViewModel(conversationID: UUID) -> ChatViewModel
    func makeSettingsViewModel() -> SettingsViewModel
}
```

**DEBUG builds:** MockAuthClient enabled by default (no backend needed)
**RELEASE builds:** Always use real auth

```swift
#if DEBUG
let useMock = ProcessInfo.processInfo.environment["AUTH_BYPASS"] != "0"
#else
let useMock = false
#endif
```

**Rules:**
- No global singletons in domain logic
- Views never create their own dependencies
- All construction happens in `CompositionRoot`
- ViewModels receive dependencies via initializer

**See:** [Composition.md](Composition.md)

### 3. Theming & Design System

**Token-based design:**

```swift
// Tokens defined once
DSColors.textPrimary
DSSpacing.l
DSTypography.body

// Applied everywhere
Text("Hello")
    .foregroundStyle(DSColors.textPrimary)
    .padding(DSSpacing.l)
    .bodyText()
```

**Theme switching:**
- User selects theme in Settings
- Stored in SwiftData
- Applied via `@Environment(\.colorScheme)` and custom logic
- 5 built-in themes: System, Light, Dark, Aurora, Obsidian

**Modes:**
- Light/Dark follow iOS system appearance
- Custom themes (Aurora, Obsidian) have their own color palettes
- All components respect Dynamic Type and accessibility settings

**See:** [visual-consistency.md](visual-consistency.md) and [DesignSystem.md](DesignSystem.md)

### 4. SSE Streaming (AI Responses)

**Server-Sent Events flow:**

```
1. User sends message
2. ChatViewModel calls LLMClient.streamResponse(messages)
3. ProxyLLMClient makes POST to Supabase Edge Function
4. Edge Function streams from OpenRouter API
5. AsyncThrowingStream yields chunks as they arrive
6. ViewModel appends to @Published message.content
7. ChatView auto-updates on each chunk
```

**Implementation:**

```swift
public protocol LLMClient: Sendable {
    func streamResponse(messages: [LLMMessage]) 
        -> AsyncThrowingStream<String, Error>
}

// Usage in ViewModel
for try await chunk in llmClient.streamResponse(messages: messages) {
    currentMessage.content += chunk
    // SwiftUI automatically re-renders
}
```

**Key benefits:**
- Real-time response display
- Early user feedback
- Cancellation support
- Network-efficient

**See:** [AI.md](AI.md) and [FeatureChat.md](FeatureChat.md)

### 5. Provider Swapping

**All external services use protocols:**

```swift
// Auth
protocol AuthClient {
    func signInWithApple() async throws -> AuthUser
    func signInWithEmail(email: String, password: String) async throws -> AuthUser
    func signOut() async throws
    // ...
}

// Current: SupabaseAuthClient
// Swap to: Firebase, Auth0, custom backend

// Payments
protocol PaymentsClient {
    func purchase(productID: String) async throws
    func currentState() async -> PaymentsState
    // ...
}

// Current: RevenueCatClient
// Swap to: StoreKit2, Adapty, Qonversion

// LLM
protocol LLMClient {
    func streamResponse(messages: [LLMMessage]) 
        -> AsyncThrowingStream<String, Error>
}

// Current: ProxyLLMClient (OpenRouter via Supabase)
// Swap to: Direct OpenAI, Anthropic, local model
```

**To swap a provider:**
1. Create new implementation of the protocol
2. Update `CompositionRoot` to construct new implementation
3. No changes to ViewModels or Views

**See module docs:** [Auth.md](Auth.md), [Payments.md](Payments.md), [AI.md](AI.md)

### 4. State Management Patterns

**State hoisting for view recreation:**

When views recreate (e.g., theme changes with `.refreshOnThemeChange()`), state must live above the recreation boundary:

```swift
// AppRootView (state survives theme changes)
@State private var selectedTab: MainTabView.Tab = .home

// MainTabView (recreates on theme change)
@Binding var selectedTab: Tab

// Pattern:
AppRootView
├─ @State selectedTab (survives)
└─ .refreshOnThemeChange() 
   └─ MainTabView (@Binding selectedTab)
```

**Benefits:**
- ✅ Tab preserved during theme changes
- ✅ Resets to home on app launch
- ✅ SwiftUI best practice (no static variables)
- ✅ Predictable lifecycle

**Theme change flow:**
```
User changes theme
→ ThemeManager.selected = newTheme
→ .refreshOnThemeChange() changes view .id
→ MainTabView recreates
→ selectedTab binding preserves value
→ User stays on current tab
```

**App launch flow:**
```
App launches
→ AppRootView: selectedTab = .home (default)
→ Router.destination becomes .main
→ .onChange resets selectedTab = .home
→ User always starts on Home
```

### 5. Theme System Architecture

**Two-layer theme implementation:**

```swift
AppRootView
├─ ThemeManager (Core) - Persistence, iOS interface style
│  └─ @Environment(ThemeManager.self)
└─ DSColors (DesignSystem) - Token resolution
   └─ setTheme(name, colorScheme)
```

**Flow:**
1. User selects theme in Settings
2. SettingsViewModel saves to SwiftData
3. ThemeManager.selected updates
4. AppRootView.onChange applies to DSColors
5. .refreshOnThemeChange() recreates views
6. New theme tokens applied throughout

**Why two layers:**
- `ThemeManager`: iOS-level (light/dark interface style)
- `DSColors`: Design tokens (actual color values)
- Separation allows premium themes (Aurora, Obsidian) with custom palettes

## Modules

### Core Modules

**Core** - Foundation
- `AppError` - Typed error handling with user messages
- `AppLogger` - PII-safe logging with OSLog
- `ResultOrError` - Functional result type
- Theme types and utilities

**Networking** - HTTP Communication
- `HTTPClient` protocol with `URLSessionHTTPClient` implementation
- Interceptors: Auth, Retry, Headers
- Caching: URLCache + NSCache
- Error mapping to AppError

**Storage** - Data Persistence
- SwiftData models: `Conversation`, `Message`, `Settings`
- Repositories for data access
- `KeychainStore` for secure token storage
- Lightweight migrations

### Feature Modules

**Auth** - Authentication
- Supabase integration
- Apple Sign In coordinator
- Email/password flows
- Session management with automatic token refresh

**Payments** - Subscriptions
- RevenueCat integration
- Paywall UI components
- Purchase and restore flows
- Subscription state management

**AI** - LLM Integration
- `LLMClient` protocol
- `ProxyLLMClient` - calls Supabase Edge Function
- `EchoLLMClient` - testing/development fallback
- SSE streaming support

**FeatureChat** - Chat Interface
- Two UI styles: Bubble (WhatsApp) and Centered (ChatGPT)
- `ChatViewModel` with streaming and pagination
- `InfinitePaginator` for message history
- Message persistence via Storage

**FeatureSettings** - Settings & Profile
- Theme picker
- Account management
- Paywall presentation
- Legal document views

**DesignSystem** - UI Components
- Color tokens (5 themes)
- Typography scale
- Spacing system
- Reusable components: buttons, inputs, cards, bubbles
- Haptics and motion utilities

### App Module

**Composition** - Dependency Injection
- `CompositionRoot` - Creates all dependencies
- Factory methods for ViewModels
- Environment-based configuration (xcconfig → env vars)

**AppShell** - UI Screens
- `LaunchRouter` - Initial routing logic
- `HomeView`, `ProfileView`, `SignInView`, etc.
- Navigation structure
- Tab bar coordination

## Module Dependencies

```
App
├─> FeatureChat
│   ├─> AI ──> Networking ──> Core
│   ├─> Storage ──> Core
│   └─> DesignSystem ──> Core
│
├─> FeatureSettings
│   ├─> Payments ──> Core
│   ├─> Auth ──> Networking ──> Core
│   ├─> Storage ──> Core
│   └─> DesignSystem ──> Core
│
└─> Composition
    └─> (all modules)
```

**Rules:**
- Core has no dependencies (foundation)
- Networking depends only on Core
- Features depend on Core + 1-2 specialized modules
- DesignSystem depends only on Core
- No circular dependencies

## Data Flow Examples

### Send Chat Message

```
1. User types message, taps send
   ChatView calls viewModel.sendMessage(text)

2. ViewModel creates LLMMessage array
   messages = [...history, LLMMessage(role: "user", content: text)]

3. ViewModel calls LLMClient
   stream = llmClient.streamResponse(messages: messages)

4. Stream yields chunks
   for try await chunk in stream {
       currentMessage.content += chunk
   }

5. ViewModel saves to storage
   messageRepository.save(userMessage)
   messageRepository.save(assistantMessage)

6. SwiftData triggers @Published update
   ChatView re-renders with new messages
```

### Theme Change

```
1. User selects theme in Settings
   SettingsView calls viewModel.setTheme(.aurora)

2. ViewModel saves to repository
   settingsRepository.updateTheme(.aurora)

3. SwiftData persists change

4. Environment update propagates
   @Environment(\.colorScheme) changes

5. DSColors recalculates based on theme
   DSColors.textPrimary returns new color

6. All views re-render with new colors
```

### Authentication

```
1. User taps "Sign in with Apple"
   SignInView calls viewModel.signInWithApple()

2. ViewModel calls AuthClient
   user = try await authClient.signInWithApple()

3. AuthClient (SessionManager) orchestrates:
   a. AppleSignInCoordinator gets Apple credentials
   b. SupabaseAuthClient exchanges for Supabase session
   c. KeychainStore saves access token + refresh token

4. SessionManager publishes AuthState.authenticated

5. LaunchRouter observes AuthState
   Navigates from sign-in to home screen

6. HTTPClient AuthInterceptor now attaches token
   All API calls authenticated automatically
```

### Purchase Subscription

```
1. User taps "Subscribe" on paywall
   PaywallView calls viewModel.purchase(productID)

2. ViewModel calls PaymentsClient
   try await paymentsClient.purchase(productID: "premium_monthly")

3. RevenueCatClient handles StoreKit flow
   - Shows Apple purchase dialog
   - Processes payment
   - Verifies receipt
   - Updates entitlements

4. PaymentsClient publishes new PaymentsState
   PaymentsState(isSubscribed: true, ...)

5. ProfileViewModel observes change
   Updates subscription status card

6. Feature gates now allow premium features
   if paymentsState.isSubscribed { ... }
```

## Extending the System

### Add a New Screen

```swift
// 1. Create View + ViewModel in AppShell/
struct NewFeatureView: View {
    @State var viewModel: NewFeatureViewModel
    
    var body: some View {
        // UI here
    }
}

class NewFeatureViewModel: ObservableObject {
    @Published var state: State = .idle
    
    private let repository: SomeRepository
    
    init(repository: SomeRepository) {
        self.repository = repository
    }
    
    func loadData() async {
        // business logic
    }
}

// 2. Add factory to CompositionRoot
extension CompositionRoot {
    func makeNewFeatureViewModel() -> NewFeatureViewModel {
        NewFeatureViewModel(repository: someRepository)
    }
}

// 3. Add navigation in AppShell
NavigationLink("New Feature") {
    NewFeatureView(
        viewModel: composition.makeNewFeatureViewModel()
    )
}
```

### Add a New Module

```swift
// 1. Create Swift Package in Packages/
// File → New → Package → "MyFeature"

// 2. Define public API
public protocol MyFeatureClient {
    func doSomething() async throws
}

// 3. Implement
final class MyFeatureClientImpl: MyFeatureClient {
    // implementation
}

// 4. Add to CompositionRoot
class CompositionRoot {
    let myFeatureClient: MyFeatureClient
    
    init(...) {
        self.myFeatureClient = MyFeatureClientImpl(...)
    }
}

// 5. Use in ViewModels
class SomeViewModel {
    private let myFeatureClient: MyFeatureClient
    
    init(myFeatureClient: MyFeatureClient) {
        self.myFeatureClient = myFeatureClient
    }
}
```

### Swap a Provider

```swift
// Example: Replace RevenueCat with StoreKit2

// 1. Create new implementation
final class StoreKit2Client: PaymentsClient {
    func purchase(productID: String) async throws {
        // StoreKit2 implementation
    }
    
    func currentState() async -> PaymentsState {
        // StoreKit2 implementation
    }
    
    // ... implement all protocol methods
}

// 2. Update CompositionRoot
init(...) {
    // Old:
    // self.paymentsClient = RevenueCatClient()
    
    // New:
    self.paymentsClient = StoreKit2Client()
    
    // All ViewModels and Views continue to work unchanged
}
```

## Testing Strategy

### Unit Tests

**What to test:**
- Core logic (errors, logging)
- Networking (interceptors, retry, caching)
- Repositories (SwiftData operations)
- ViewModels (state changes, business logic)
- Clients (protocol implementations)

**Example:**
```swift
func testChatViewModel_sendMessage_updatesMessages() async throws {
    let viewModel = ChatViewModel(
        conversationID: testID,
        messageRepository: MockMessageRepository(),
        llmClient: MockLLMClient()
    )
    
    await viewModel.sendMessage("Hello")
    
    XCTAssertEqual(viewModel.messages.count, 2) // user + assistant
}
```

### Snapshot Tests

**What to test:**
- Chat bubbles (light/dark, different roles)
- Paywall screens
- Settings layouts
- Component variations

**Example:**
```swift
func testChatBubble_assistantRole_lightMode() {
    let bubble = ChatBubble(
        role: .assistant,
        text: "Hello!",
        isStreaming: false
    )
    assertSnapshot(of: bubble, as: .image)
}
```

### Integration Tests

**What to test:**
- Auth flow (sign in → token storage → API calls)
- Chat flow (send → stream → persist)
- Purchase flow (buy → verify → gate features)
- Pagination (scroll → load more → append)

### Coverage Target

- **Overall:** 85-90%
- **Core/Networking/Storage:** 95%+
- **ViewModels:** 90%+
- **Views:** Snapshot tests only

## Common Patterns

### Async/Await with Actors

```swift
// Repositories use ModelContext (main actor)
@MainActor
final class ConversationRepositoryImpl: ConversationRepository {
    private let modelContext: ModelContext
    
    func fetchAll() async throws -> [Conversation] {
        // SwiftData operations on main actor
    }
}

// Clients can be Sendable
final class ProxyLLMClient: LLMClient, Sendable {
    func streamResponse(messages: [LLMMessage]) 
        -> AsyncThrowingStream<String, Error> {
        // Network calls can happen on any thread
    }
}
```

### Error Handling

```swift
// Map all errors to AppError
do {
    let data = try await httpClient.execute(request)
    return data
} catch {
    let appError = AppError.from(error)
    AppLogger.error("API failed: \(appError.userMessage)")
    throw appError
}

// Present to user
@Published var errorMessage: String?

func loadData() async {
    do {
        self.data = try await repository.fetch()
    } catch let error as AppError {
        self.errorMessage = error.userMessage
    }
}
```

### Cancellation

```swift
// Store tasks for cancellation
private var streamTask: Task<Void, Never>?

func sendMessage(_ text: String) {
    streamTask?.cancel()
    
    streamTask = Task {
        do {
            for try await chunk in llmClient.streamResponse(...) {
                guard !Task.isCancelled else { return }
                await MainActor.run {
                    currentMessage.content += chunk
                }
            }
        } catch {
            // handle error
        }
    }
}

deinit {
    streamTask?.cancel()
}
```

## Performance Considerations

### Memory

- **SwiftData:** Fetch only needed data, use predicates
- **Images:** Use NSCache for in-memory caching
- **Streaming:** Process chunks incrementally, don't buffer entire response

### Network

- **Caching:** Use URLCache for API responses
- **Retry:** Exponential backoff with max attempts
- **Compression:** Enable gzip for large payloads

### UI

- **Lazy loading:** Use `LazyVStack` for long lists
- **Pagination:** Load 20-50 items per page
- **Debouncing:** Prevent rapid-fire API calls

## Security

### API Keys

- **Never commit:** `Secrets.xcconfig` is gitignored
- **Proxy pattern:** App calls Supabase Edge Function, not LLM API directly
- **Server-side:** OpenRouter API key lives in Supabase secrets

### Tokens

- **Storage:** Access/refresh tokens in Keychain
- **Transmission:** HTTPS only
- **Refresh:** Automatic token refresh before expiry

### Logging

- **PII redaction:** Use `AppLogger.redacted()` for sensitive data
- **API keys:** Never log full keys
- **User data:** Minimal logging, privacy-safe

## Troubleshooting

### Build Issues

**"Cannot find module"**
- Reset package cache: File → Packages → Reset Package Caches
- Clean build: ⌘ + Shift + K

**"Missing xcconfig"**
- Copy `Config/Secrets.example.xcconfig` to `Config/Secrets.xcconfig`

### Runtime Issues

**"Unauthorized"**
- Check Supabase credentials in `Secrets.xcconfig`
- Verify user is signed in
- Check token in Keychain

**"No AI response"**
- Verify `PROXY_BASE_URL` is set
- Check Edge Function deployment
- View logs in Supabase dashboard

### Testing Issues

**"Mock not working"**
- Ensure mock conforms to protocol exactly
- Use `@MainActor` where needed
- Check async context

## Next Steps

**Explore modules:**
- [Core.md](Core.md) - Error handling and logging
- [Networking.md](Networking.md) - HTTP client details
- [FeatureChat.md](FeatureChat.md) - Chat implementation
- [Composition.md](Composition.md) - Dependency injection

**Set up backend:**
- [migrations/supabase.md](migrations/supabase.md) - Deploy Edge Function
- [migrations/revenuecat.md](migrations/revenuecat.md) - Configure subscriptions

**Customize:**
- [visual-consistency.md](visual-consistency.md) - Theming guide
- [DesignSystem.md](DesignSystem.md) - Component customization

---

**Questions?** See [INDEX.md](INDEX.md) or check module-specific docs.

