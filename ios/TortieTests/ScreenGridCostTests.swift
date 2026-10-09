import Darwin
import SwiftUI
import UIKit
import XCTest
@testable import Tortie

/// What the Terminal's rows cost (Phase 337, build/p337/SPEC.md section 6.4,
/// §Attack A24; Phase 337.1, build/p3371/SPEC.md D28 and section 7.3): the
/// committed sample as the live rows, with 3,000 rows of history HELD (the
/// cap) above them, mounted in the Terminal's own UIKit scroll view in a
/// hosting window at the fitted size and at the top size, scrolled into the
/// history so the rows of history are what it draws; the app's memory read
/// before and after each with `XCTMemoryMetric` and the task's own footprint,
/// and printed for the verifier as `P337_GRID|<size>|<bytes>` lines. A peak
/// growth over 64 MB at the top size is needs_work for the verifier (316.6's
/// class); the scroll view draws only the window in view and a screen either
/// side. The zoom's top is held so a row is at most 8,192 pixels wide.
@MainActor
final class ScreenGridCostTests: XCTestCase {
    /// The ceiling the verifier judges the top size by.
    static let ceiling: UInt64 = 64 * 1024 * 1024
    /// The history held: the cap (D28).
    static let held = ScrollbackLayout.mostHeld
    static let depth = 3_100

    /// The task's physical footprint, in bytes.
    private func footprint() -> UInt64 {
        var info = task_vm_info_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size / MemoryLayout<natural_t>.size)
        let status = withUnsafeMutablePointer(to: &info) { pointer in
            pointer.withMemoryRebound(to: integer_t.self, capacity: Int(count)) { task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count) }
        }
        return status == KERN_SUCCESS ? info.phys_footprint : 0
    }

    /// The committed sample, its depth set so 3,000 rows of history sit
    /// above it.
    private func sample() throws -> PocketScreen {
        let data = try Data(contentsOf: StyleSource.root.appendingPathComponent("build/fixtures/screen/sample-claude-2.1.287.json"))
        var answer = try XCTUnwrap(try JSONSerialization.jsonObject(with: data) as? [String: Any])
        var screen = try XCTUnwrap(answer["screen"] as? [String: Any])
        screen["depth"] = Self.depth
        if screen["space"] == nil || screen["space"] is NSNull { screen["space"] = ScrollbackModelTests.space }
        answer["screen"] = screen
        let decoded = try JSONDecoder().decode(PocketScreenAnswer.self, from: try JSONSerialization.data(withJSONObject: answer))
        return try XCTUnwrap(decoded.screen)
    }

    /// A page of history whose rows are the sample's own rows, cycled, so
    /// every row of history is a real agent's row and its styles.
    private func page(_ ask: ScrollbackAsk, _ screen: PocketScreen) -> PocketScrollbackAnswer {
        PocketScrollbackAnswer(
            sessionId: "s", at: 1, pageFrom: ask.from, pageDepth: Self.depth, pageWrap: screen.screenColumns, space: screen.space,
            styles: screen.styles, rows: (ask.from..<(ask.from + ask.count)).map { screen.lines[$0 % screen.lines.count] },
            why: nil, sentence: nil
        )
    }

    /// The history, 3,000 rows held, through the model's own paths.
    private func history(_ screen: PocketScreen, picture: ScreenPicture) throws -> ScrollbackModel {
        let history = ScrollbackModel(door: ScriptedScreenDoor())
        history.picture(picture)
        history.viewed(top: Self.depth - 1, bottom: Self.depth + 40, atBottom: false)
        var top = Self.depth - 1
        for _ in 0..<40 where history.layout.held.count < Self.held {
            history.viewed(top: top, bottom: top + 60, atBottom: false)
            let ask = try XCTUnwrap(history.layout.want(visibleTop: top, visibleBottom: top + 60))
            _ = history.accept(page(ask, screen), for: ask)
            top = history.layout.lo
        }
        XCTAssertEqual(history.layout.held.count, Self.held)
        return history
    }

    /// Mount the Terminal at a cell width scrolled into its history, draw it,
    /// and say what it cost.
    private func mount(_ picture: ScreenPicture, history: ScrollbackModel, top: Bool, label: String) -> UInt64 {
        let before = footprint()
        // In the host app's own scene when it has one, so the rows are drawn
        // as they are on the phone; a window with no scene otherwise.
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
        let window = scene.map { UIWindow(windowScene: $0) } ?? UIWindow(frame: CGRect(x: 0, y: 0, width: 393, height: 852))
        window.frame = CGRect(x: 0, y: 0, width: 393, height: 852)
        let host = UIViewController()
        window.rootViewController = host
        window.makeKeyAndVisible()
        let view = ScreenScrollView(scrollback: history)
        view.frame = CGRect(x: 0, y: 0, width: 393, height: 852)
        host.view.addSubview(view)
        view.picture = picture
        view.layoutIfNeeded()
        if top {
            let fitted = ScreenZoom.fitted(columns: picture.columns, width: 393)
            view.zoom(to: ScreenZoom.top(columns: picture.columns, scale: max(1, view.traitCollection.displayScale), fitted: fitted), focal: view.contentOffset)
            view.layoutIfNeeded()
        }
        view.contentOffset = CGPoint(x: 0, y: max(0, view.contentOffset.y - 200))
        view.layoutIfNeeded()
        CATransaction.flush()
        RunLoop.main.run(until: Date().addingTimeInterval(0.3))
        let after = footprint()
        window.isHidden = true
        window.rootViewController = nil
        let grew = after > before ? after - before : 0
        print("P337_GRID|\(label)|\(grew)|\(before)|\(after)|rows \(view.rowWindow.count)")
        return grew
    }

    /// Clause: the Terminal mounts at the fitted size and at the top with
    /// 3,000 rows of history held, and what it costs is printed; the top size
    /// is under the ceiling.
    func testTheGridsMemoryAtTheFittedAndTheTopSize() throws {
        let screen = try sample()
        let picture = ScreenPicture(screen, revision: "0123456789ab")
        let history = try history(screen, picture: picture)
        let fittedCost = mount(picture, history: history, top: false, label: "fitted")
        let topCost = mount(picture, history: history, top: true, label: "top")
        XCTAssertLessThan(topCost, Self.ceiling, "the top size grew the app by \(topCost) bytes")
        _ = fittedCost
        measure(metrics: [XCTMemoryMetric()]) {
            _ = mount(picture, history: history, top: true, label: "measured")
        }
    }

    /// Clause (§Attack A24): the zoom's top holds a row to at most 8,192
    /// pixels at 3x, the widest screen included, and is never below the
    /// fitted size.
    func testTheTopHoldsARowUnderTheTextureBound() {
        for columns in [80, 120, 250, 512] {
            let fitted = ScreenZoom.fitted(columns: columns, width: 393)
            let top = ScreenZoom.top(columns: columns, scale: 3, fitted: fitted)
            let cell = ScreenCell.wide(top, scale: 3)
            XCTAssertLessThanOrEqual(CGFloat(columns) * cell.width * 3, ScreenZoom.widestRowPixels + 0.001, "\(columns) columns")
            XCTAssertGreaterThanOrEqual(top, fitted)
        }
        let narrow = ScreenZoom.top(columns: 80, scale: 3, fitted: 1)
        XCTAssertEqual(narrow, ScreenZoom.topFont * ScreenFont.advancePerPoint, accuracy: 0.001, "80 columns reach 18 pt")
    }

    /// Clause (D27): a pinch is held between the fitted size and the top, and
    /// a double tap moves between the fitted size and 12 pt.
    func testTheZoomIsHeldAndToggled() {
        let fitted: CGFloat = 3
        let top: CGFloat = 10
        XCTAssertEqual(ScreenZoom.held(1, fitted: fitted, top: top), fitted)
        XCTAssertEqual(ScreenZoom.held(20, fitted: fitted, top: top), top)
        XCTAssertEqual(ScreenZoom.held(5, fitted: fitted, top: top), 5)
        let reading = ScreenZoom.readingFont * ScreenFont.advancePerPoint
        XCTAssertEqual(ScreenZoom.toggled(fitted, fitted: fitted, top: top), min(max(reading, fitted), top))
        XCTAssertEqual(ScreenZoom.toggled(8, fitted: fitted, top: top), fitted)
    }
}
