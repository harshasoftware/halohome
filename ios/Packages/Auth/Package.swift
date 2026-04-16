// swift-tools-version: 5.10
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "Auth",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "CartoAuth",
            targets: ["CartoAuth"]
        )
    ],
    dependencies: [
        .package(path: "../Core"),
        .package(path: "../Networking"),
        .package(path: "../Storage"),
        .package(url: "https://github.com/google/GoogleSignIn-iOS.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "CartoAuth",
            dependencies: [
                "Core",
                "Networking",
                .product(name: "CartoStorage", package: "storage"),
                .product(name: "GoogleSignIn", package: "GoogleSignIn-iOS")
            ]
        ),
        .testTarget(
            name: "AuthTests",
            dependencies: [
                "CartoAuth",
                .product(name: "CartoStorage", package: "storage")
            ]
        )
    ]
)
