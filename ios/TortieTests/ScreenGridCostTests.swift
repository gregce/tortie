import Darwin
import SwiftUI
import UIKit
import XCTest
@testable import Tortie

/// What the Screen's grid costs (Phase 337, build/p337/SPEC.md section 6.4,
/// §Attack A24): the committed sample mounted in a hosting window at the
/// fitted size and at the top size, the app's memory read before and after
/// each with `XCTMemoryMetric` and the task's own footprint, and printed for
/// the verifier as `P337_GRID|<size>|<bytes>` lines. A peak growth over 64 MB
/// at the top size is needs_work for the verifier (316.6's class); a design
/// that draws only the visible window in one `Canvas` is the named way out.
/// The zoom's top is held so a row is at most 8,192 pixels wide.
@MainActor
final class ScreenGridCostTests: XCTestCase {
    /// The ceiling the verifier judges the top size by.
    static let ceiling: UInt64 = 64 * 1024 * 1024

    /// The task's physical footprint, in bytes.
    private func footprint() -> UInt64 {
        var info = task_vm_info_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size / MemoryLayout<natural_t>.size)
        let status = withUnsafeMutablePointer(to: &info) { pointer in
            pointer.withMemoryRebound(to: integer_t.self, capacity: Int(count)) { task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count) }
        }
        return status == KERN_SUCCESS ? info.phys_footprint : 0
    }

    /// Mount the sample's grid at a cell width, draw it, and say what it cost.
    private func mount(_ picture: ScreenPicture, width: CGFloat, label: String) -> UInt64 {
        let before = footprint()
        // In the host app's own scene when it has one, so the grid is drawn
        // as it is on the phone; a window with no scene otherwise.
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
        let window = scene.map { UIWindow(windowScene: $0) } ?? UIWindow(frame: CGRect(x: 0, y: 0, width: 393, height: 852))
        window.frame = CGRect(x: 0, y: 0, width: 393, height: 852)
        let host = UIHostingController(rootView: ScreenGrid(picture: picture, selection: nil, tap: { _ in }, select: { _, _ in })
            .frame(width: width, height: 852))
        window.rootViewController = host
        window.makeKeyAndVisible()
        host.view.setNeedsLayout()
        host.view.layoutIfNeeded()
        CATransaction.flush()
        RunLoop.main.run(until: Date().addingTimeInterval(0.3))
        let after = footprint()
        window.isHidden = true
        window.rootViewController = nil
        let grew = after > before ? after - before : 0
        print("P337_GRID|\(label)|\(grew)|\(before)|\(after)")
        return grew
    }

    /// Clause: the grid mounts at the fitted size and at the top, and what it
    /// costs is printed; the top size is under the ceiling.
    func testTheGridsMemoryAtTheFittedAndTheTopSize() throws {
        let answer = try ScreenSample.committedSample()
        let picture = ScreenPicture(try XCTUnwrap(answer.screen), revision: answer.revision)
        let fitted = ScreenZoom.fitted(columns: picture.columns, width: 393)
        let top = ScreenZoom.top(columns: picture.columns, scale: 3, fitted: fitted)
        let fittedCost = mount(picture, width: 393, label: "fitted")
        let topWidth = CGFloat(picture.columns) * ScreenCell.wide(top, scale: 3).width
        let topCost = mount(picture, width: topWidth, label: "top")
        XCTAssertLessThan(topCost, Self.ceiling, "the top size grew the app by \(topCost) bytes")
        _ = fittedCost
        measure(metrics: [XCTMemoryMetric()]) {
            _ = mount(picture, width: topWidth, label: "measured")
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
