// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "FeatureOnboarding",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "FeatureOnboarding",
            targets: ["FeatureOnboarding"]
        )
    ],
    dependencies: [
        .package(path: "../DesignSystem"),
        .package(url: "https://github.com/exyte/ConcentricOnboarding.git", from: "1.0.0"),
        .package(url: "https://github.com/simibac/ConfettiSwiftUI.git", from: "1.1.0")
    ],
    targets: [
        .target(
            name: "FeatureOnboarding",
            dependencies: [
                "DesignSystem",
                "ConcentricOnboarding",
                "ConfettiSwiftUI"
            ]
        ),
        .testTarget(
            name: "FeatureOnboardingTests",
            dependencies: ["FeatureOnboarding"]
        )
    ]
)
