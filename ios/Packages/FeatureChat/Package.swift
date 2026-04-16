// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "FeatureChat",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "FeatureChat",
            targets: ["FeatureChat"]
        )
    ],
    dependencies: [
        .package(path: "../Core"),
        .package(path: "../Storage"),
        .package(path: "../DesignSystem")
    ],
    targets: [
        .target(
            name: "FeatureChat",
            dependencies: [
                "Core",
                .product(name: "CartoStorage", package: "storage"),
                "DesignSystem"
            ]
        ),
        .testTarget(
            name: "FeatureChatTests",
            dependencies: ["FeatureChat"]
        )
    ]
)
