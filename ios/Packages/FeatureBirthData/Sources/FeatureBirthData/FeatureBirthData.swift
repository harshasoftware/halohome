// FeatureBirthData
//
// Birth data input feature for CartoStar iOS
// Provides views and models for capturing birth date, time, and location
// for astrological chart calculations.
//
// Usage:
// ```swift
// import FeatureBirthData
//
// // Use the store
// let store = BirthDataStore.shared
//
// // Present the input view
// BirthDataInputView(store: store)
//
// // Or use the quick sheet
// QuickBirthDataSheet(store: store)
// ```

import Foundation
import SwiftUI

// This file serves as documentation for the FeatureBirthData module.
// All public types are automatically exported by Swift's module system.

// MARK: - Module Overview

/// # FeatureBirthData
///
/// A SwiftUI-based module for capturing birth data in the CartoStar iOS app.
///
/// ## Key Components
///
/// ### Models
/// - ``BirthData``: Core model representing birth date, time, location, and timezone
/// - ``LocationSearchResult``: Search result from MapKit location search
/// - ``RecentLocation``: Persisted recent location for quick access
///
/// ### View Models
/// - ``BirthDataStore``: Observable store for managing birth charts
/// - ``LocationSearchViewModel``: ViewModel for MapKit-based location search
///
/// ### Views
/// - ``BirthDataInputView``: Full-screen form for entering birth data
/// - ``LocationSearchView``: Location search with autocomplete
/// - ``QuickBirthDataSheet``: Half-sheet for quick birth data entry
///
/// ### Components
/// - ``BirthDataCard``: Card component for displaying saved charts
/// - ``SavedChartsListView``: List view for managing saved charts
///
/// ## Features
/// - Native iOS date/time pickers
/// - MapKit-based location search (no external API required)
/// - Automatic timezone detection
/// - "Unknown time" option for charts without birth time
/// - Form validation with inline errors
/// - Persistence via UserDefaults
/// - Dark cosmic theme matching web design
/// - Full accessibility support
public enum FeatureBirthDataModule {
    public static let version = "1.0.0"
}
