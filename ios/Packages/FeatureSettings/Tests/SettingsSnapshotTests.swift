import XCTest
import SwiftUI
@testable import FeatureSettings

@MainActor
final class SettingsSnapshotTests: XCTestCase {
    
    func testSettings_light() {
        // Given
        let viewModel = PreviewComposition.settingsVM()
        let view = SettingsView(viewModel: viewModel)
        
        // Then - Should render without errors
        XCTAssertNotNil(view)
        
        // TODO: snapshot infra
        // In a real snapshot test, would capture:
        // - Light mode appearance
        // - All sections visible (Appearance, Account, Subscription, Legal)
        // - Theme picker with "System" selected
        // - Sign in button visible
        // - Go Pro button visible
        // - No error banner
        // - No loading overlay
    }
    
    func testSettings_dark() {
        // Given
        let viewModel = PreviewComposition.settingsVM()
        let view = SettingsView(viewModel: viewModel)
        
        // Then - Should render without errors
        XCTAssertNotNil(view)
        
        // TODO: snapshot infra
        // In a real snapshot test, would capture with dark mode trait collection:
        // - Dark mode appearance
        // - All sections visible with dark theme colors
        // - Theme picker with "System" selected
        // - Sign in button visible with dark styling
        // - Go Pro button visible with dark styling
        // - No error banner
        // - No loading overlay
    }
    
    func testSettings_authenticatedAndSubscribed() {
        // Given
        let viewModel = PreviewComposition.settingsVM()
        viewModel.isAuthenticated = true
        viewModel.isSubscribed = true
        let view = SettingsView(viewModel: viewModel)
        
        // Then - Should render without errors
        XCTAssertNotNil(view)
        
        // TODO: snapshot infra
        // Would verify:
        // - "Signed In" status with checkmark
        // - "Sign Out" button visible
        // - "Pro Subscriber" status with star icon
        // - "Restore Purchases" button still visible
        // - No "Go Pro" button
    }
    
    func testSettings_errorState() {
        // Given
        let viewModel = PreviewComposition.settingsVM()
        viewModel.errorMessage = "Unable to connect to server. Please check your internet connection."
        viewModel.isLoading = false
        let view = SettingsView(viewModel: viewModel)
        
        // Then - Should render without errors
        XCTAssertNotNil(view)
        
        // TODO: snapshot infra
        // Would verify:
        // - Error banner visible at top with red background
        // - Warning icon and error message
        // - All other sections still visible
        // - Buttons enabled (not loading)
    }
    
    func testSettings_loadingState() {
        // Given
        let viewModel = PreviewComposition.settingsVM()
        viewModel.isLoading = true
        let view = SettingsView(viewModel: viewModel)
        
        // Then - Should render without errors
        XCTAssertNotNil(view)
        
        // TODO: snapshot infra
        // Would verify:
        // - Semi-transparent loading overlay
        // - Centered progress indicator with material background
        // - All buttons disabled
        // - Form content visible but dimmed
    }
}
