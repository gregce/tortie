// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "Kit",
    products: [
        .library(name: "Kit", targets: ["Kit"]),
    ],
    targets: [
        .executableTarget(name: "App", dependencies: ["Kit"]),
        .target(name: "Kit"),
        .testTarget(name: "KitTests", dependencies: ["Kit"]),
    ]
)
