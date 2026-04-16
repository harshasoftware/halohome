// FeatureScout
// Scout location ranking feature for CartoStar iOS
//
// This module provides:
// - Rust-backed C2 algorithm for ranking locations by life category
// - 6 life categories: Career, Love, Health, Home, Wellbeing, Wealth
// - Result cards with score breakdown (benefit, intensity, volatility)
// - Progress view for computation feedback
//
// All heavy computation happens in Rust via ScoutScoringProvider protocol.
// Single call scores all categories using bounding box optimization + Gaussian decay.

import Foundation

/// FeatureScout module version
public let featureScoutVersion = "2.0.0"

/// FeatureScout bundle identifier
public let featureScoutBundleID = "com.cartostar.FeatureScout"
