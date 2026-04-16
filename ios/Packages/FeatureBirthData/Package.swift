// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "FeatureBirthData",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "FeatureBirthData",
            targets: ["FeatureBirthData"]
        )
    ],
    dependencies: [
        .package(path: "../Core"),
        .package(path: "../DesignSystem"),
        .package(url: "https://github.com/airbnb/lottie-ios.git", from: "4.4.0")
    ],
    targets: [
        .target(
            name: "FeatureBirthData",
            dependencies: [
                "Core",
                "DesignSystem",
                .product(name: "Lottie", package: "lottie-ios")
            ],
            resources: [
                .process("Resources")
            ]
        ),
        .testTarget(
            name: "FeatureBirthDataTests",
            dependencies: ["FeatureBirthData"]
        )
    ]
)
