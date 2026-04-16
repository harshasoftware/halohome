// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "CartoStarCore",
    platforms: [
        .iOS(.v15),
        .macOS(.v12)
    ],
    products: [
        .library(
            name: "CartoStarCore",
            targets: ["CartoStarCore"]
        ),
    ],
    targets: [
        // Binary target for the Rust XCFramework
        // Build with: ios/scripts/build-rust-xcframework.sh
        .binaryTarget(
            name: "CartoStarCoreFFI",
            path: "CartoStarCoreFFI.xcframework"
        ),
        // Swift wrapper that provides a clean API
        .target(
            name: "CartoStarCore",
            dependencies: ["CartoStarCoreFFI"],
            path: "Sources/CartoStarCore"
        ),
    ]
)
