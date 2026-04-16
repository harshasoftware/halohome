import SwiftUI

/// View modifier that forces refresh when design system theme changes
struct ThemeRefreshModifier: ViewModifier {
    @State private var refreshID = UUID()
    
    func body(content: Content) -> some View {
        content
            .id(refreshID)
            .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("DSColorsDidChange"))) { _ in
                refreshID = UUID()
            }
    }
}

public extension View {
    /// Apply this modifier to views that use DSColors to ensure they refresh when theme changes
    func refreshOnThemeChange() -> some View {
        modifier(ThemeRefreshModifier())
    }
}


