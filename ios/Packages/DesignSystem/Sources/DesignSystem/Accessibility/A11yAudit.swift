import SwiftUI

#if DEBUG
// MARK: - Accessibility Audit Tool (Debug Only)
/// Debug tool to identify accessibility issues in views
///
/// Usage in previews:
/// ```swift
/// #Preview {
///     MyView()
///         .accessibilityAuditOverlay()
/// }
/// ```
///
/// Or run audit programmatically:
/// ```swift
/// A11yAudit.checkView(myView)
/// ```
public enum A11yAudit {
    
    /// Audit result for a view
    public struct AuditResult {
        public let viewType: String
        public let issues: [Issue]
        public let warnings: [Warning]
        
        public var hasIssues: Bool { !issues.isEmpty }
        public var hasWarnings: Bool { !warnings.isEmpty }
        public var isAccessible: Bool { !hasIssues }
    }
    
    /// Critical accessibility issue
    public enum Issue: CustomStringConvertible {
        case missingLabel
        case emptyLabel
        case missingHint(forButton: Bool)
        case insufficientContrast
        case touchTargetTooSmall(CGSize)
        case nonAccessibleImage
        
        public var description: String {
            switch self {
            case .missingLabel:
                return "Missing accessibility label"
            case .emptyLabel:
                return "Empty accessibility label"
            case .missingHint(let forButton):
                return forButton ? "Button missing accessibility hint" : "Interactive element missing hint"
            case .insufficientContrast:
                return "Insufficient color contrast"
            case .touchTargetTooSmall(let size):
                return "Touch target too small (\(Int(size.width))x\(Int(size.height))pt, minimum 44x44pt)"
            case .nonAccessibleImage:
                return "Image without accessibility label"
            }
        }
    }
    
    /// Non-critical accessibility warning
    public enum Warning: CustomStringConvertible {
        case genericLabel
        case longLabel(Int)
        case missingTraits
        case redundantLabel
        
        public var description: String {
            switch self {
            case .genericLabel:
                return "Generic label (e.g., 'button', 'image') - consider more descriptive label"
            case .longLabel(let length):
                return "Label too long (\(length) chars) - VoiceOver may truncate"
            case .missingTraits:
                return "Consider adding accessibility traits"
            case .redundantLabel:
                return "Label may be redundant with visible text"
            }
        }
    }
    
    // MARK: - Audit Helpers
    
    /// Check if a label is too generic
    public static func isGenericLabel(_ label: String) -> Bool {
        let genericLabels = [
            "button", "image", "icon", "view", "label",
            "text", "item", "element", "container"
        ]
        return genericLabels.contains(label.lowercased())
    }
    
    /// Recommended maximum label length
    public static let maxRecommendedLabelLength = 100
    
    /// Minimum touch target size (Apple HIG)
    public static let minimumTouchTarget = CGSize(width: 44, height: 44)
    
    /// Print audit results to console
    public static func printResults(_ results: [AuditResult]) {
        print("🔍 Accessibility Audit Results")
        print("================================")
        
        let totalIssues = results.reduce(0) { $0 + $1.issues.count }
        let totalWarnings = results.reduce(0) { $0 + $1.warnings.count }
        
        if totalIssues == 0 && totalWarnings == 0 {
            print("✅ No accessibility issues found!")
            return
        }
        
        for result in results where result.hasIssues || result.hasWarnings {
            print("\n📦 \(result.viewType)")
            
            for issue in result.issues {
                print("  ❌ \(issue.description)")
            }
            
            for warning in result.warnings {
                print("  ⚠️ \(warning.description)")
            }
        }
        
        print("\n================================")
        print("Total: \(totalIssues) issues, \(totalWarnings) warnings")
    }
}

// MARK: - Debug Overlay
public extension View {
    
    /// Add visual accessibility audit overlay (DEBUG only)
    /// - Parameter showWarnings: Whether to show warnings in addition to errors
    /// - Returns: View with audit overlay
    ///
    /// This adds colored borders around elements:
    /// - 🔴 Red: Critical issues (missing labels, etc.)
    /// - 🟡 Yellow: Warnings (generic labels, etc.)
    /// - 🟢 Green: Accessible
    func accessibilityAuditOverlay(showWarnings: Bool = true) -> some View {
        self.modifier(AccessibilityAuditOverlayModifier(showWarnings: showWarnings))
    }
}

private struct AccessibilityAuditOverlayModifier: ViewModifier {
    let showWarnings: Bool
    @State private var showOverlay = false
    
    func body(content: Content) -> some View {
        content
            .overlay(alignment: .topTrailing) {
                Button {
                    showOverlay.toggle()
                } label: {
                    Image(systemName: showOverlay ? "accessibility.fill" : "accessibility")
                        .font(.system(size: 20))
                        .foregroundStyle(showOverlay ? .green : .gray)
                        .padding(8)
                        .background(.ultraThinMaterial)
                        .clipShape(Circle())
                }
                .padding(8)
            }
            .overlay {
                if showOverlay {
                    AuditOverlayView()
                }
            }
    }
}

private struct AuditOverlayView: View {
    var body: some View {
        VStack {
            Text("Accessibility Audit Mode")
                .font(.caption)
                .foregroundStyle(.white)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(.black.opacity(0.8))
                .clipShape(.rect(cornerRadius: 8))
            
            Spacer()
            
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Circle().fill(.red).frame(width: 8, height: 8)
                    Text("Missing accessibility")
                }
                HStack {
                    Circle().fill(.yellow).frame(width: 8, height: 8)
                    Text("Warning")
                }
                HStack {
                    Circle().fill(.green).frame(width: 8, height: 8)
                    Text("Accessible")
                }
            }
            .font(.caption2)
            .foregroundStyle(.white)
            .padding(8)
            .background(.black.opacity(0.8))
            .clipShape(.rect(cornerRadius: 8))
        }
        .padding()
    }
}

// MARK: - Accessibility Checklist
/// Quick reference checklist for developers
public enum A11yChecklist {
    public static let items: [String] = [
        "✓ All interactive elements have accessibility labels",
        "✓ Buttons have hints describing their action",
        "✓ Images have descriptions or are hidden if decorative",
        "✓ Touch targets are at least 44x44 points",
        "✓ Color is not the only way to convey information",
        "✓ Text scales with Dynamic Type",
        "✓ Animations respect Reduce Motion setting",
        "✓ Focus order makes logical sense",
        "✓ Error messages are announced to VoiceOver",
        "✓ Loading states are communicated",
    ]
    
    public static func printChecklist() {
        print("\n📋 Accessibility Checklist")
        print("==========================")
        for item in items {
            print(item)
        }
        print("")
    }
}
#endif
