// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "Localization",
    defaultLocalization: "en",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "Localization", targets: ["Localization"])
    ],
    targets: [
        .target(
            name: "Localization",
            resources: [
                .process("Resources")
            ]
        ),
        .testTarget(
            name: "LocalizationTests",
            dependencies: ["Localization"]
        )
    ]
)
