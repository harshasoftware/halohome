// swift-tools-version: 5.10
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "Payments",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "Payments",
            targets: ["Payments"]
        )
    ],
    dependencies: [
        .package(path: "../Core"),
        .package(path: "../DesignSystem"),
        .package(url: "https://github.com/adaptyteam/AdaptySDK-iOS.git", from: "3.15.4")
    ],
    targets: [
        .target(
            name: "Payments",
            dependencies: [
                "Core",
                "DesignSystem",
                .product(name: "Adapty", package: "AdaptySDK-iOS"),
                .product(name: "AdaptyUI", package: "AdaptySDK-iOS")
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency")
            ]
        ),
        .testTarget(
            name: "PaymentsTests",
            dependencies: ["Payments"],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency")
            ]
        )
    ]
)
