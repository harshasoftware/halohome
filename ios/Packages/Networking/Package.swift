// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "Networking",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "Networking", targets: ["Networking"])
    ],
    dependencies: [
        .package(path: "../Core")
    ],
    targets: [
        .target(
            name: "Networking",
            dependencies: ["Core"]
        ),
        .testTarget(
            name: "NetworkingTests",
            dependencies: ["Networking"]
        )
    ]
)