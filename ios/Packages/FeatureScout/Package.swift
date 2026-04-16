// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "FeatureScout",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "FeatureScout",
            targets: ["FeatureScout"]
        )
    ],
    dependencies: [
        .package(path: "../Core"),
        .package(path: "../DesignSystem")
    ],
    targets: [
        .target(
            name: "FeatureScout",
            dependencies: ["Core", "DesignSystem"]
        ),
        .testTarget(
            name: "FeatureScoutTests",
            dependencies: ["FeatureScout"]
        )
    ]
)
