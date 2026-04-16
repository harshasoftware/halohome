// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "FeatureGlobe",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "FeatureGlobe",
            targets: ["FeatureGlobe"]
        )
    ],
    dependencies: [
        .package(path: "../Core"),
        .package(path: "../DesignSystem"),
        // Mapbox Maps SDK v11+ with globe projection support
        // Using exact version to skip version resolution (much faster)
        .package(url: "https://github.com/mapbox/mapbox-maps-ios.git", exact: "11.18.2"),
    ],
    targets: [
        .target(
            name: "FeatureGlobe",
            dependencies: [
                "Core",
                "DesignSystem",
                .product(name: "MapboxMaps", package: "mapbox-maps-ios"),
            ],
            resources: [
                .copy("Resources/airports.json"),
            ]
        ),
        .testTarget(
            name: "FeatureGlobeTests",
            dependencies: ["FeatureGlobe"]
        )
    ]
)
