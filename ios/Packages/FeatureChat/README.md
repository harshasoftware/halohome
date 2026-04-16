# FeatureChat

Chat feature module with **dual UI style support**: bubble chat (WhatsApp/iMessage) and prompt chat (ChatGPT).

## 📚 Documentation

- **[Chat UI Styles Guide](CHAT_UI_STYLES.md)** - Start here! Practical guide for choosing and implementing chat UI styles

## 🎯 Quick Start

### For Buyers: Choose Your Chat UI Style

This module supports three UI configurations:

1. **Bubble Chat Only** (WhatsApp/iMessage-style)
   - Messages appear as bubbles
   - User on right, assistant on left
   - Compact, familiar messaging UI
   - Default configuration

2. **Prompt Chat Only** (ChatGPT-style)
   - Centered, document-like layout
   - Large prompt input area
   - Full-width responses
   - Professional appearance

3. **Both Styles** (Dual Style Switcher)
   - Let users choose their UI preference
   - Style selector at top of chat
   - Same data, different visualization
   - Already implemented in the boilerplate

**👉 See [CHAT_UI_STYLES.md](CHAT_UI_STYLES.md) for detailed setup instructions.**

**Important:** Both UI styles use the **same backend** (ChatViewModel, SwiftData persistence, pagination, LLM client). This is purely about visual presentation!

## 📦 What's Included

### Core Components

#### Bubble Chat UI (WhatsApp/iMessage-style)
- `ChatView.swift` - Bubble-based chat interface with infinite scroll
- `MessageRow.swift` - Individual message bubbles
- `SAIStreamingBubble.swift` - Animated streaming bubbles (in DesignSystem)

#### Prompt Chat UI (ChatGPT-style)
- `ChatGPTStyleView.swift` - Centered layout with large prompt input
- Full-width response rendering
- Professional document-like appearance

#### Dual Style Switcher
- `DualStyleChatView.swift` - Container with UI style switcher
- `ChatUIStyle.swift` - Style enum with display metadata

#### Shared Backend (used by both UI styles)
- `ChatViewModel.swift` - State management with pagination
- `ChatHistoryView.swift` - List of all conversations

#### Shared
- `ChatMessage.swift` - Domain model for messages
- `LLMClient.swift` - Protocol for LLM providers (agnostic)
- `InfinitePaginator.swift` - Reusable pagination logic

## 🏗️ Architecture

### MVVM with Clean Boundaries

```
View (SwiftUI)
  ↓ User actions
ViewModel (@Observable)
  ↓ Business logic
Repository/Client (protocols)
  ↓ Data access
SwiftData / Network
```

**Rules:**
- ✅ Views are stateless and pure
- ✅ ViewModels expose `@Observable` state
- ✅ No business logic in Views
- ✅ All async work is cancellation-aware

### LLM Agnostic

Both chat modes use the `LLMClient` protocol:

```swift
public protocol LLMClient: Sendable {
    func streamResponse(messages: [LLMMessage]) -> AsyncThrowingStream<String, Error>
}
```

**Supported providers:**
- OpenAI (GPT-3.5, GPT-4, GPT-4o)
- Anthropic (Claude)
- DeepSeek
- Any provider with streaming support

**Implementation:** All API calls go through a secure proxy (Cloudflare Worker) that hides API keys.

## 🎨 Design System Integration

All components use the **Signature UI Kit** design tokens:

- `DSColors` - Semantic colors with dark mode
- `DSTypography` - Type scales
- `DSSpacing` - Consistent spacing
- `DSRadius` - Corner radii
- `DSGradient` - Brand gradients
- `SAIButton`, `SAIInputBar`, `SAIStreamingBubble` - Reusable components

## ♿️ Accessibility

- ✅ Dynamic Type support
- ✅ VoiceOver labels on all interactive elements
- ✅ Reduce Motion respected for animations
- ✅ High contrast mode compatible
- ✅ Keyboard navigation ready

## 🧪 Testing

Each view includes SwiftUI previews:

```swift
#Preview("Empty State") {
    ContinuousChatView(viewModel: ContinuousChatViewModel(llmClient: PreviewLLMClient()))
}
```

**Test coverage:**
- Unit tests for ViewModels
- Snapshot tests for Views
- Integration tests for pagination

## 🔌 Dependencies

### Internal (Swift Packages)
- `Core` - Logging, errors
- `Storage` - SwiftData repositories
- `DesignSystem` - UI components and tokens
- `Networking` - HTTP client (for proxy)

### External
- SwiftUI (iOS 17+)
- SwiftData
- Foundation

**No external packages required!**

## 🚀 Usage Examples

### Bubble Chat (Default)

```swift
import FeatureChat

let viewModel = ChatViewModel(
    conversationID: conversationID,
    messageRepository: messageRepository,
    llmClient: llmClient
)

ChatView(viewModel: viewModel, onRequireSubscription: nil)
```

### Prompt Chat (ChatGPT-style)

```swift
import FeatureChat

let viewModel = ChatViewModel(
    conversationID: conversationID,
    messageRepository: messageRepository,
    llmClient: llmClient
)

ChatGPTStyleView(viewModel: viewModel, onRequireSubscription: nil)
```

**Note:** Same `ChatViewModel` used for both!

### Dual Style Switcher

```swift
import FeatureChat

let viewModel = ChatViewModel(...)

DualStyleChatView(
    viewModel: viewModel,
    onRequireSubscription: { /* show paywall */ }
)
```

**Note:** Users can toggle between bubble and prompt styles with the same data.

## 📝 Customization

### Add Custom UI Style

1. Create new View (follow `ChatGPTStyleView` pattern)
2. Use the same `ChatViewModel` for data
3. Add case to `ChatUIStyle` enum
4. Update `DualStyleChatView` to include your style

### Customize Bubble Colors

Edit `DSColors.swift` in DesignSystem:

```swift
public static var accentPrimary: Color  // User bubble
public static var surface: Color        // Assistant bubble
```

### Customize Prompt Layout

Edit `ChatGPTStyleView.swift`:

```swift
.frame(maxWidth: DSLayout.readableMaxWidth)  // Response width
.frame(minHeight: 60, maxHeight: 120)        // Input height
```

### Custom Message Types

Extend `ChatMessage` model:

```swift
public struct ChatMessage {
    // Existing fields...
    public var attachments: [Attachment]? // Your addition
}
```

Update both `MessageRow` (bubbles) and `ChatGPTStyleView` (prompt) to render your custom data.

## 🐛 Debugging

Enable detailed logging:

```swift
// In your app's environment
AppLogger.debug("Chat event", category: AppLogger.feature)
```

Logs use `OSLog` with privacy redaction for PII.

## 📄 License

Part of CartoStar. See main repository for license details.

---

**Questions?** Check [CHAT_UI_STYLES.md](CHAT_UI_STYLES.md) for detailed setup instructions, customization examples, and FAQ.

