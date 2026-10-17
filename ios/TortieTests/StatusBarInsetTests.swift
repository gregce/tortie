import SwiftUI
import UIKit
import XCTest
@testable import Tortie

/// The status bar's inset, kept (Phase 333.4.1, build/p33341/SPEC.md D1 to
/// D3). On a Home-button iPhone on iOS 26.3 a turn sideways and back leaves
/// the window's own top inset at 0 while iOS draws its 20-point status bar
/// again (measured in five bare SwiftUI hierarchies, section 2.1), so the
/// app's root makes up EXACTLY the difference between iOS's own two readings,
/// never below 0, on its own window's root alone and on the top edge alone,
/// when a size change completes. Each test names the clause it holds and fails
/// when that clause is taken out of App/StatusBarInset.swift or RootView.
@MainActor
final class StatusBarInsetTests: XCTestCase {
    private var windows: [UIWindow] = []

    override func tearDown() async throws {
        for window in windows {
            window.isHidden = true
            window.rootViewController = nil
        }
        windows = []
    }

    // MARK: The difference

    /// Clause (D3, `StatusBarInset.missing`): what the window lacks is the
    /// status bar's bottom less the window's own top inset, and never below 0.
    /// The rows are the readings of section 2.1: the SE at 26.3 after a turn
    /// (20, 0), before it and at 18.3 (20, 20), sideways (0, 0), the iPhone
    /// 16 Pro (54, 62), which without the floor would be a NEGATIVE 8 points,
    /// and a window that keeps an inset under a hidden status bar (0, 20).
    func testWhatTheWindowLacksIsTheDifferenceNeverBelowZero() {
        XCTAssertEqual(StatusBarInset.missing(statusBarBottom: 20, windowTop: 0), 20, "the SE at 26.3 after a turn")
        XCTAssertEqual(StatusBarInset.missing(statusBarBottom: 20, windowTop: 20), 0, "the SE before a turn, and at 18.3")
        XCTAssertEqual(StatusBarInset.missing(statusBarBottom: 0, windowTop: 0), 0, "sideways, the status bar hidden")
        XCTAssertEqual(StatusBarInset.missing(statusBarBottom: 54, windowTop: 62), 0, "the iPhone 16 Pro: never below 0")
        XCTAssertEqual(StatusBarInset.missing(statusBarBottom: 0, windowTop: 20), 0, "a hidden status bar over a kept inset")
    }

    // MARK: The keeper

    /// A window of the host app's own scene over `root`, shown; key when
    /// `key`.
    private func window(root: UIViewController, key: Bool) -> UIWindow {
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
        let window = scene.map { UIWindow(windowScene: $0) } ?? UIWindow(frame: CGRect(x: 0, y: 0, width: 402, height: 874))
        if let bounds = scene?.screen.bounds { window.frame = bounds }
        window.rootViewController = root
        if key { window.makeKeyAndVisible() } else { window.isHidden = false }
        windows.append(window)
        return window
    }

    /// Clause (D3, `keep()`): the keeper sets ITS OWN window's root's top
    /// inset to exactly what that window lacks, read from iOS's own two
    /// numbers, from a stale value; it leaves the root's other three edges and
    /// another window's root alone; and on this device, untouched by a turn,
    /// iOS agrees with itself, so what it sets is 0.
    func testTheKeeperSetsItsOwnRootsTopToWhatTheWindowLacks() throws {
        let other = UIViewController()
        _ = window(root: other, key: false)
        other.additionalSafeAreaInsets = UIEdgeInsets(top: 9, left: 0, bottom: 0, right: 0)
        let root = UIViewController()
        let keeper = StatusBarInsetController()
        root.addChild(keeper)
        keeper.view.frame = .zero
        root.view.addSubview(keeper.view)
        keeper.didMove(toParent: root)
        let window = window(root: root, key: true)
        window.layoutIfNeeded()
        root.additionalSafeAreaInsets = UIEdgeInsets(top: 7, left: 3, bottom: 5, right: 2)
        keeper.keep()
        let bar = try XCTUnwrap(window.windowScene?.statusBarManager, "the scene's status bar").statusBarFrame.maxY
        let lacks = StatusBarInset.missing(statusBarBottom: bar, windowTop: window.safeAreaInsets.top)
        XCTAssertEqual(root.additionalSafeAreaInsets.top, lacks, "the root's top is not what its window lacks")
        XCTAssertEqual(root.additionalSafeAreaInsets.left, 3, "the keeper wrote the left edge")
        XCTAssertEqual(root.additionalSafeAreaInsets.bottom, 5, "the keeper wrote the bottom edge")
        XCTAssertEqual(root.additionalSafeAreaInsets.right, 2, "the keeper wrote the right edge")
        XCTAssertEqual(other.additionalSafeAreaInsets.top, 9, "the keeper wrote another window's root")
        XCTAssertEqual(lacks, 0, "iOS disagrees with itself on this device before any turn (status bar \(bar), window \(window.safeAreaInsets.top))")
        print("P33341_INSET|status bar \(bar)|window \(window.safeAreaInsets.top)|set \(root.additionalSafeAreaInsets.top)")
    }

    /// Clause (D3, `keep()`'s guard): a keeper in no window writes nothing.
    func testAKeeperInNoWindowWritesNothing() {
        let root = UIViewController()
        let keeper = StatusBarInsetController()
        root.addChild(keeper)
        root.view.addSubview(keeper.view)
        keeper.didMove(toParent: root)
        root.additionalSafeAreaInsets = UIEdgeInsets(top: 7, left: 0, bottom: 0, right: 0)
        keeper.keep()
        XCTAssertEqual(root.additionalSafeAreaInsets.top, 7)
    }

    // MARK: Read as text

    /// The text of `file` from `from` up to the first `to` after it.
    private func section(_ source: String, from: String, to: String) throws -> String {
        let start = try XCTUnwrap(source.range(of: from), "no \(from)")
        let end = source.range(of: to, range: start.upperBound..<source.endIndex)?.lowerBound ?? source.endIndex
        return String(source[start.lowerBound..<end])
    }

    /// Clause (D3, the moment): `viewWillTransition` asks for the inset only
    /// in the transition's COMPLETION, never in its own body, because at the
    /// transition's start the status bar still reads 0 (section 2.1); the
    /// safe area's change and the keeper's appearance ask too; the keeper
    /// names no list of the scene's windows (the keyboard's are among them)
    /// and writes the root's top edge alone.
    func testTheKeeperAsksAtTheTransitionsCompletionAndWritesTheTopAlone() throws {
        let source = try StyleSource.text("ios/Tortie/App/StatusBarInset.swift")
        let transition = try section(source, from: "override func viewWillTransition", to: "override func")
        XCTAssertTrue(
            transition.contains("coordinator.animate(alongsideTransition: nil) { [weak self] _ in self?.keep() }"),
            "the size change's completion does not ask"
        )
        XCTAssertEqual(transition.components(separatedBy: "keep()").count - 1, 1, "viewWillTransition asks outside its completion")
        XCTAssertTrue(try section(source, from: "override func viewSafeAreaInsetsDidChange", to: "override func").contains("keep()"), "a safe area change does not ask")
        XCTAssertTrue(try section(source, from: "override func viewDidAppear", to: "func keep()").contains("keep()"), "the keeper's appearance does not ask")
        XCTAssertFalse(source.contains(".windows"), "the keeper names the scene's windows")
        XCTAssertEqual(source.components(separatedBy: "additionalSafeAreaInsets.top = ").count - 1, 1, "the top edge written once")
        for written in ["additionalSafeAreaInsets = ", ".left = ", ".bottom = ", ".right = "] {
            XCTAssertFalse(source.contains(written), "the keeper writes \(written)")
        }
    }

    /// Clause (D3, the placing): `RootView` places the keeper exactly once,
    /// and no other file of the app places it.
    func testRootViewPlacesTheKeeperOnce() throws {
        let app = try StyleSource.text("ios/Tortie/App/TortieApp.swift")
        let root = try section(app, from: "struct RootView: View {", to: "\nstruct ")
        XCTAssertEqual(root.components(separatedBy: "StatusBarInsetKeeper()").count - 1, 1, "RootView does not place the keeper once")
        let folder = StyleSource.root.appendingPathComponent("ios/Tortie")
        let files = try XCTUnwrap(FileManager.default.enumerator(at: folder, includingPropertiesForKeys: nil), "the app's sources")
        var placed = 0
        for case let url as URL in files where url.pathExtension == "swift" {
            placed += try String(contentsOf: url, encoding: .utf8).components(separatedBy: "StatusBarInsetKeeper()").count - 1
        }
        XCTAssertEqual(placed, 1, "the keeper placed \(placed) times across the app")
    }
}
