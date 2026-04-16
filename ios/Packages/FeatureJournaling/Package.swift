// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "FeatureJournaling",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "FeatureJournaling",
            targets: ["FeatureJournaling"]
        )
    ],
    dependencies: [
        .package(path: "../Core"),
        .package(path: "../DesignSystem")
    ],
    targets: [
        .target(
            name: "FeatureJournaling",
            dependencies: ["Core", "DesignSystem"]
        ),
    ]
)
