// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "FeatureSettings",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "FeatureSettings", targets: ["FeatureSettings"])
    ],
    dependencies: [
        .package(path: "../Core"),
        .package(path: "../Storage"),
        .package(path: "../Auth"),
        .package(path: "../Payments"),
        .package(path: "../DesignSystem"),
        .package(path: "../Localization")
    ],
    targets: [
        .target(
            name: "FeatureSettings",
            dependencies: [
                "Core",
                .product(name: "CartoStorage", package: "storage"),
                .product(name: "CartoAuth", package: "auth"),
                "Payments",
                "DesignSystem",
                "Localization"
            ]
        ),
        .testTarget(
            name: "FeatureSettingsTests",
            dependencies: ["FeatureSettings"]
        )
    ]
)
