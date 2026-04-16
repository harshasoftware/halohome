// swift-tools-version: 5.10
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "Storage",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "CartoStorage",
            targets: ["CartoStorage"]
        )
    ],
    dependencies: [
        .package(path: "../Core"),
        .package(path: "../Networking")
    ],
    targets: [
        .target(
            name: "CartoStorage",
            dependencies: ["Core", "Networking"]
        ),
        .testTarget(
            name: "StorageTests",
            dependencies: ["CartoStorage"]
        )
    ]
)
