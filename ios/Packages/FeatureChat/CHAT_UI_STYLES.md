# Chat UI Styles - User's Guide

## 📖 Overview

Your boilerplate includes **two distinct chat UI styles** that you can use in your app:

1. **Bubble Chat (WhatsApp/iMessage-style)** - Messages appear as bubbles, user on right, assistant on left
2. **Prompt Chat (ChatGPT-style)** - Centered layout with large prompt input and full-width responses

**Important:** Both styles use the **same backend** (ChatViewModel, persistence, pagination, etc.). This is purely about visual presentation!

---

## 🎯 Which Style Should You Use?

### Use **Bubble Chat** if your app needs:
- ✓ Familiar messaging experience (like WhatsApp, iMessage)
- ✓ Visual separation between user and assistant
- ✓ Compact, space-efficient layout
- ✓ Multi-turn conversations with clear attribution
- ✓ Example apps: AI messaging, chat assistants, conversational apps

### Use **Prompt Chat** if your app needs:
- ✓ Document-like, professional appearance
- ✓ Focus on prompts and responses (like ChatGPT)
- ✓ Large text input area for complex queries
- ✓ Clean, centered, readable format
- ✓ Example apps: Writing assistants, code helpers, research tools

### Use **Both Styles** if:
- ✓ You want to give users UI preference choice
- ✓ Your app serves different use cases (casual vs. professional)
- ✓ You want to differentiate features or tiers

---

## 🚀 Quick Start: Choose Your Configuration

### Option 1: Bubble Chat Only (Current Default)

This is already set up! Just use `ChatView` directly:

```swift
// In your composition root
let viewModel = makeChatViewModel(conversationID: conversationID)
ChatView(viewModel: viewModel)
```

**UI Features:**
- Message bubbles on left (assistant) and right (user)
- Compact input bar at bottom
- Auto-scroll to latest message
- Streaming animation in bubbles

### Option 2: Prompt Chat Only (ChatGPT-style)

Replace the bubble chat with prompt chat:

**Step 1:** Update `CompositionRoot.swift`:

```swift
// Replace ChatView usage with ChatGPTStyleView
public func makeChatView(conversationID: UUID) -> some View {
    let viewModel = makeChatViewModel(conversationID: conversationID)
    return ChatGPTStyleView(
        viewModel: viewModel,
        onRequireSubscription: nil
    )
}
```

**Step 2:** Update `ChatHistoryViewModel`:

```swift
public func makeChatHistoryViewModel() -> ChatHistoryViewModel {
    ChatHistoryViewModel(
        conversationRepository: conversationRepository
    ) { [weak self] conversationID in
        guard let self = self else { return AnyView(EmptyView()) }
        let chatGPTView = self.makeChatGPTStyleView(
            conversationID: conversationID,
            onRequireSubscription: nil
        )
        return AnyView(chatGPTView)
    }
}
```

**UI Features:**
- Centered, full-width layout
- Large TextEditor for prompts
- Full-width assistant responses
- Clean "You" and "Assistant" headers
- Professional appearance

### Option 3: Both Styles (Dual Style Switcher)

This is already implemented! Just use `DualStyleChatView`:

**Already configured in:** `CompositionRoot.swift` → `makeChatHistoryViewModel()`

```swift
public func makeChatHistoryViewModel() -> ChatHistoryViewModel {
    ChatHistoryViewModel(
        conversationRepository: conversationRepository
    ) { [weak self] conversationID in
        guard let self = self else { return AnyView(EmptyView()) }
        let dualStyleView = self.makeDualStyleChatView(
            conversationID: conversationID,
            onRequireSubscription: nil
        )
        return AnyView(dualStyleView)
    }
}
```

**UI Features:**
- Style selector at top of screen
- Users can toggle between Bubble and Prompt styles
- Same conversation, different visualization
- Smooth animated transitions
- User preference persists during session

---

## 🎨 Customization Guide

### Customize Style Names & Icons

Edit `ChatUIStyle.swift`:

```swift
public var displayName: String {
    switch self {
    case .bubbles: return "Messaging"  // Your custom name
    case .centered: return "Assistant" // Your custom name
    }
}

public var icon: String {
    switch self {
    case .bubbles: return "message.fill"        // Your custom SF Symbol
    case .centered: return "doc.text.fill"      // Your custom SF Symbol
    }
}
```

### Customize Prompt Chat Empty State

Edit `ChatGPTStyleView.swift` → `emptyStateView`:

```swift
private var emptyStateView: some View {
    VStack(spacing: DSSpacing.xl) {
        // Your custom icon/branding
        Image("your_custom_logo")
            .resizable()
            .frame(width: 80, height: 80)
        
        Text("Your Custom Greeting")
            .font(DSTypography.titleL)
        
        Text("Your custom subtitle explaining what this assistant does")
            .font(DSTypography.body)
            .foregroundStyle(DSColors.textSecondary)
    }
}
```

### Set Default Style

Edit `DualStyleChatView.swift`:

```swift
@State private var selectedStyle: ChatUIStyle = .centered  // Change to .bubbles for default
```

### Customize Prompt Input Area

Edit `ChatGPTStyleView.swift` → `promptInputView`:

```swift
TextEditor(text: $viewModel.inputText)
    .font(DSTypography.body)  // Change font size
    .frame(minHeight: 60, maxHeight: 120)  // Adjust heights
```

### Customize Message Layout

Edit `ChatGPTStyleView.swift` → `centeredMessageView`:

```swift
.frame(maxWidth: DSLayout.readableMaxWidth)  // Adjust max width for responses
```

---

## 🔧 Advanced Configuration

### Hide Style Selector (Lock to One Style)

If you want dual style capability but don't want to show the selector:

```swift
// In DualStyleChatView
var body: some View {
    VStack(spacing: 0) {
        // Comment out or remove:
        // styleSelectorView
        // Divider()
        
        chatContentView
    }
}

// Set default style programmatically
@State private var selectedStyle: ChatUIStyle = .centered
```

### Make Style Selection a Premium Feature

```swift
// In DualStyleChatView
@State private var isPremium: Bool = false

var body: some View {
    VStack(spacing: 0) {
        if isPremium {
            styleSelectorView  // Show selector only for premium
        }
        
        chatContentView
    }
}

// In the button
Button {
    if !isPremium && selectedStyle != .bubbles {
        onRequireSubscription?()
    } else {
        withAnimation { selectedStyle = style }
    }
}
```

### Add Style Preference Persistence

```swift
// Add to Settings model
@AppStorage("preferredChatStyle") private var preferredStyle: String = ChatUIStyle.bubbles.rawValue

// Use in DualStyleChatView
@State private var selectedStyle: ChatUIStyle = .bubbles

var body: some View {
    // ...
    .onAppear {
        if let saved = ChatUIStyle(rawValue: preferredStyle) {
            selectedStyle = saved
        }
    }
    .onChange(of: selectedStyle) { _, newValue in
        preferredStyle = newValue.rawValue
    }
}
```

---

## 🧪 Testing Your Configuration

### Test Bubble Chat
1. Open the app and navigate to Chat
2. Send a message
3. ✅ User message appears on right in colored bubble
4. ✅ Assistant response streams on left in gray bubble
5. ✅ Messages are compact and space-efficient

### Test Prompt Chat
1. Switch to "Prompt Chat" (or use ChatGPTStyleView directly)
2. Enter a prompt in the large text box
3. ✅ User prompt appears in full-width gray box with "You" header
4. ✅ Assistant response appears below with gradient icon
5. ✅ Layout is centered and readable
6. ✅ Large text input area works for multi-line prompts

### Test Style Switching (Dual Style)
1. Send messages in Bubble style
2. Switch to Prompt style
3. ✅ Same messages displayed in different layout
4. ✅ Switch is smooth with animation
5. ✅ Input state preserved during switch
6. ✅ Both styles show same message history

---

## 🔄 Key Differences Between Styles

### Bubble Chat (ChatView)
```
┌────────────────────────────────────┐
│  ┌──────────────┐                  │
│  │ Assistant    │                  │
│  │ message      │                  │
│  └──────────────┘                  │
│                  ┌──────────────┐  │
│                  │   User       │  │
│                  │   message    │  │
│                  └──────────────┘  │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ [   Type message...   ] [Send]    │
└────────────────────────────────────┘
```

### Prompt Chat (ChatGPTStyleView)
```
┌────────────────────────────────────┐
│            ✨ Assistant             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Hello! I'm here to help. What     │
│  would you like to know?           │
│                                    │
│            You                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Can you help me with SwiftUI?    │
│                                    │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  ┌──────────────────────────────┐ │
│  │ Enter your prompt...         │ │
│  │                              │ │
│  │                              │ │
│  └──────────────────────────────┘ │
│                         [Send]    │
└────────────────────────────────────┘
```

---

## 📝 Migration Guide

### From Bubble to Prompt Style

1. In `CompositionRoot.swift`, find all `ChatView(` usages
2. Replace with `ChatGPTStyleView(`
3. Same `viewModel` parameter works for both

```swift
// Before
ChatView(viewModel: viewModel, onRequireSubscription: nil)

// After
ChatGPTStyleView(viewModel: viewModel, onRequireSubscription: nil)
```

### From Single Style to Dual Style

1. Already implemented! Just use `DualStyleChatView`
2. It's already configured in `CompositionRoot.makeDualStyleChatView()`
3. Call that factory method instead of individual view constructors

```swift
// Before (single style)
ChatView(viewModel: viewModel)

// After (dual style)
DualStyleChatView(viewModel: viewModel)
```

---

## ❓ FAQ

**Q: Can I customize the colors of bubbles?**  
A: Yes! Edit `DSColors.swift`:
```swift
public static var accentPrimary: Color // User bubble color
public static var surface: Color       // Assistant bubble color
```

**Q: Can I make the prompt input even larger?**  
A: Yes! In `ChatGPTStyleView.swift`:
```swift
.frame(minHeight: 100, maxHeight: 200)  // Increase heights
```

**Q: Do both styles support streaming?**  
A: Yes! Both show streaming animation. Bubbles use `SAIStreamingBubble`, Prompt uses animated dots.

**Q: Does switching styles clear my messages?**  
A: No! Both styles share the same `ChatViewModel` and display the same messages, just formatted differently.

**Q: Can I use different LLMs for different styles?**  
A: Technically yes, but not recommended. Both styles should show the same conversation. If you want different models, use different conversations.

**Q: How much code do I need to remove if I only want one style?**  
A: Very little! Just don't use `DualStyleChatView`. Keep whichever view you want (`ChatView` or `ChatGPTStyleView`) and you can safely ignore the other.

**Q: Will adding the prompt style break my existing bubble chat?**  
A: No! Zero breaking changes. Your existing `ChatView` works exactly as before. The new styles are purely additive.

---

## 🆘 Support

**Files to check:**
- `ChatView.swift` - Bubble chat implementation
- `ChatGPTStyleView.swift` - Prompt chat implementation  
- `DualStyleChatView.swift` - Style switcher
- `ChatUIStyle.swift` - Style enum
- `ChatViewModel.swift` - Shared state management (used by both)

**Remember:** Both UI styles use the same:
- ✅ ChatViewModel (same state, same logic)
- ✅ Persistence (same SwiftData storage)
- ✅ Pagination (same infinite scroll)
- ✅ LLMClient (same AI provider)
- ✅ Streaming (same real-time updates)

The **only** difference is visual presentation!

---

**Happy building! 🚀**

