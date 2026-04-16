// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "Core",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "Core", targets: ["Core"])
    ],
    targets: [
        .target(name: "Core"),
        .testTarget(name: "CoreTests", dependencies: ["Core"])
    ]
)
