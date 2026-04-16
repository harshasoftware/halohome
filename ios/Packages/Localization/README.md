# Localization Module

Type-safe string localization for CartoStar.

## Quick Start

```swift
import Localization

// Simple strings
Text(L10n.Auth.tagline)           // "Your AI assistant"
Text(L10n.Chat.placeholder)       // "Type a message..."

// Pluralized strings
Text(L10n.Chat.messagesRemaining(5))  // "5 messages remaining"
Text(L10n.Chat.messagesRemaining(1))  // "1 message remaining"
Text(L10n.Chat.messagesRemaining(0))  // "No messages remaining"

// Error messages
errorLabel.text = L10n.Error.networkOffline

// Accessibility
.accessibilityLabel(L10n.A11y.sendMessage)
.accessibilityHint(L10n.A11y.sendMessageHint)
```

## Adding a New Language

1. Create folder: `Sources/Localization/Resources/[code].lproj/`
2. Copy `Localizable.strings` from `en.lproj/`
3. Translate all strings
4. (Optional) Copy and adapt `Localizable.stringsdict` for plural rules
5. Rebuild the project

Example for German:
```
Resources/
├── en.lproj/
│   ├── Localizable.strings
│   └── Localizable.stringsdict
├── es.lproj/
│   └── Localizable.strings
└── de.lproj/          <- New folder
    └── Localizable.strings
```

## Adding New Strings

1. Add to `L10n.swift`:
```swift
public enum MyFeature {
    public static var greeting: String {
        String(localized: "myFeature.greeting", bundle: bundle)
    }
}
```

2. Add to all `.strings` files:
```
"myFeature.greeting" = "Hello!";
```

## String Categories

| Namespace | Purpose |
|-----------|---------|
| `L10n.Auth` | Authentication screens |
| `L10n.Chat` | Chat interface |
| `L10n.Settings` | Settings screens |
| `L10n.Payments` | Paywall and subscriptions |
| `L10n.Onboarding` | Onboarding flow |
| `L10n.Profile` | Profile screens |
| `L10n.Theme` | Theme names |
| `L10n.Common` | Shared strings (OK, Cancel, etc.) |
| `L10n.Error` | User-facing error messages |
| `L10n.A11y` | Accessibility labels and hints |

## Documentation

See [docs/modules/Localization.md](../../docs/modules/Localization.md) for full documentation.
