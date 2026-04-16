// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "AI",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "AI", targets: ["AI"])
    ],
    dependencies: [
        .package(path: "../Core"),
        .package(path: "../Networking"),
        .package(path: "../FeatureChat"),
        .package(url: "https://github.com/supabase/supabase-swift", from: "2.0.0")
    ],
    targets: [
        .target(
            name: "AI",
            dependencies: [
                "Core",
                "Networking",
                "FeatureChat",
                .product(name: "Supabase", package: "supabase-swift")
            ]
        ),
        .testTarget(name: "AITests", dependencies: ["AI"])
    ]
)
