import SwiftUI
import UIKit
import XCTest
@testable import Tortie

/// The Terminal's UIKit scroll view (Phase 337.1, build/p3371/SPEC.md D24 to
/// D26, D32 and section 7.3): the keyboard's overlap read from its frame,
/// converted into the view and published once; the offset clamped when it
/// goes; D25's pad, which keeps the live rows still when a page is reserved
/// above them and puts them at the top when following, at the 337 build's own
/// measured geometry (a 40-row screen at 6.67 pt in a 758 pt view, section 14
/// M12); the offset's delta over a thousand random reservations, returns to
/// live and evictions while a scripted drag moves the offset; and a change of
/// cell size that keeps the top row and a pinch's focal row. The view is
/// mounted in the host app's own window; nothing reaches a network. Each test
/// names the clause it holds and fails when that clause is taken out of
/// Screens/ScreenScroller.swift.
@MainActor
final class ScreenScrollerTests: XCTestCase {
    private var window: UIWindow?
    private var published: [CGFloat] = []

    override func tearDown() async throws {
        window?.isHidden = true
        window?.rootViewController = nil
        window = nil
        published = []
    }

    /// The 337 build's Terminal on iOS 26.3 (section 14 M12): 402 points
    /// wide, the grid 758 tall under the bar, 120 columns, 40 rows.
    private static let width: CGFloat = 402
    private static let height: CGFloat = 758
    private static let top: CGFloat = 116

    /// A scroll view over a history of `depth` lines, in a window of the host
    /// app's scene, laid out once, following.
    private func mounted(depth: Int, rows: Int = 40, height: CGFloat = height) -> (ScreenScrollView, ScrollbackModel) {
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
        let window = scene.map { UIWindow(windowScene: $0) } ?? UIWindow(frame: CGRect(x: 0, y: 0, width: Self.width, height: 874))
        window.frame = CGRect(x: 0, y: 0, width: Self.width, height: 874)
        let host = UIViewController()
        window.rootViewController = host
        window.makeKeyAndVisible()
        self.window = window
        let history = ScrollbackModel(door: ScriptedScreenDoor(), holds: { _ in true })
        let view = ScreenScrollView(scrollback: history)
        view.frame = CGRect(x: 0, y: Self.top, width: Self.width, height: height)
        view.actions = ScreenScrollerActions(tap: { _ in }, select: { _, _ in }, overlap: { [weak self] in self?.published.append($0) })
        host.view.addSubview(view)
        let picture = ScrollbackModelTests.picture(depth: depth, rows: rows)
        history.picture(picture)
        view.picture = picture
        view.layoutIfNeeded()
        return (view, history)
    }

    /// Move the offset as a drag would, and let the view hear of it.
    private func drag(_ view: ScreenScrollView, to y: CGFloat) {
        view.contentOffset = CGPoint(x: view.contentOffset.x, y: y)
        view.layoutIfNeeded()
    }

    /// A keyboard whose top is `top` points from the screen's top.
    private func keyboard(_ view: ScreenScrollView, top: CGFloat?, duration: Double = 0) {
        let screen = view.window?.windowScene?.screen.bounds ?? CGRect(x: 0, y: 0, width: Self.width, height: 874)
        let name = top == nil ? UIResponder.keyboardWillHideNotification : UIResponder.keyboardWillChangeFrameNotification
        let frame = CGRect(x: 0, y: top ?? screen.height, width: screen.width, height: screen.height - (top ?? screen.height))
        view.keyboardOverlap(Notification(name: name, object: nil, userInfo: [
            UIResponder.keyboardFrameEndUserInfoKey: NSValue(cgRect: frame),
            UIResponder.keyboardAnimationDurationUserInfoKey: duration,
        ]))
        view.layoutIfNeeded()
    }

    // MARK: The geometry the 337 build measured

    /// Clause (D25): following, a 40-row screen sits at the TOP of the view,
    /// as Screen.html draws it, at the cell the view's width fits: about
    /// 6.67 pt a row, the 337 build's own measurement.
    func testFollowingPutsTheLiveRowsAtTheTop() throws {
        let (view, history) = mounted(depth: 3_000)
        XCTAssertEqual(history.mode, .following)
        XCTAssertEqual(view.cell.height, 6.67, accuracy: 0.34, "the fitted row")
        XCTAssertEqual(try XCTUnwrap(view.onScreenY(ofIndex: 3_000)), 0, accuracy: 0.5, "live row 0 at the view's top")
        XCTAssertEqual(view.contentSize.height, Self.height, accuracy: 0.5, "the pad fills the view")
        print("P3371_SCROLLER|cell|\(view.cell.height)")
    }

    /// Clause (D25, D26, §Attack B5): a drag past the live top enters
    /// `scrolled` and reserves a page above, and the live rows stay at the
    /// same on-screen y within half a point, in the same layout pass; a page
    /// landing then moves nothing.
    func testAPageReservedAboveDoesNotMoveTheLiveRows() throws {
        let (view, history) = mounted(depth: 3_000)
        // The drag: the view hears of it, enters `scrolled` and reserves.
        view.contentOffset = CGPoint(x: 0, y: -40)
        XCTAssertEqual(history.mode, .scrolled)
        XCTAssertEqual(history.layout.top, 2_900)
        let before = try XCTUnwrap(view.onScreenY(ofIndex: 3_000))
        XCTAssertEqual(before, 40, accuracy: 0.5, "as drawn before the layout pass")
        view.layoutIfNeeded()
        XCTAssertEqual(try XCTUnwrap(view.onScreenY(ofIndex: 3_000)), before, accuracy: 0.5, "the live rows did not move")
        // The view's top, 94 rows into the page just reserved, is within one
        // page of `top`, so the layout pass's own report reserves the next
        // page too (D26): every page reserved is added to the offset, and the
        // pull's 40 pt past the top is kept (UIKit's clamp of an offset it is
        // not tracking, when the content grows, is not what moves it).
        let reserved = 3_000 - history.layout.top
        XCTAssertGreaterThanOrEqual(reserved, 100)
        XCTAssertEqual(reserved % 100, 0, "a page at a time")
        XCTAssertEqual(view.contentOffset.y, CGFloat(reserved) * view.cell.height - 40, accuracy: 0.5, "the offset grew by exactly what was reserved")
        let ask = try XCTUnwrap(history.asking)
        _ = history.accept(ScrollbackModelTests.answer(ask), for: ask)
        view.layoutIfNeeded()
        XCTAssertEqual(try XCTUnwrap(view.onScreenY(ofIndex: 3_000)), before, accuracy: 0.5, "a page landing moved the live rows")
        XCTAssertEqual(try XCTUnwrap(view.onScreenY(ofIndex: 2_999)), CGFloat(before) - view.cell.height, accuracy: 0.5)
    }

    /// Clause (D24): the keyboard's frame, converted into the view, is its
    /// overlap; it is the bottom inset and the indicators', published to the
    /// page ONCE per change; a keyboard going is 0, and following the live
    /// rows of a short screen stay where they were throughout.
    func testTheKeyboardsOverlapIsConvertedAndPublishedOnce() throws {
        let (view, _) = mounted(depth: 3_000)
        let rowTop = try XCTUnwrap(view.onScreenY(ofIndex: 3_000))
        keyboard(view, top: 520)
        let expected = (Self.top + Self.height) - 520
        XCTAssertEqual(view.overlap, expected, accuracy: 0.5)
        XCTAssertEqual(view.contentInset.bottom, expected, accuracy: 0.5)
        XCTAssertEqual(view.verticalScrollIndicatorInsets.bottom, expected, accuracy: 0.5)
        keyboard(view, top: 520)
        XCTAssertEqual(published.count, 1, "the same keyboard published again")
        XCTAssertEqual(try XCTUnwrap(view.onScreenY(ofIndex: 3_000)), rowTop, accuracy: 0.5, "the rows followed the keyboard")
        keyboard(view, top: nil)
        XCTAssertEqual(view.overlap, 0)
        XCTAssertEqual(published, [expected, 0])
        XCTAssertEqual(try XCTUnwrap(view.onScreenY(ofIndex: 3_000)), rowTop, accuracy: 0.5, "the rows sit low after the keyboard went")
        XCTAssertEqual(view.frame, CGRect(x: 0, y: Self.top, width: Self.width, height: Self.height), "the frame never follows the keyboard")
    }

    /// Clause (D24): a screen taller than the view, following at its bottom,
    /// keeps its live bottom row just above the keyboard; when the keyboard
    /// goes the offset is clamped to the content in the same pass, and never
    /// left past its end.
    func testTheOffsetIsClampedWhenTheKeyboardGoes() throws {
        let (view, _) = mounted(depth: 3_000, rows: 200)
        XCTAssertEqual(view.contentOffset.y, view.maxOffsetY, accuracy: 0.5, "following: the live bottom")
        keyboard(view, top: 520)
        XCTAssertEqual(view.contentOffset.y, view.maxOffsetY, accuracy: 0.5, "pinned above the keyboard")
        let bottomRow = try XCTUnwrap(view.onScreenY(ofIndex: 3_199))
        XCTAssertEqual(bottomRow + view.cell.height, Self.height - view.overlap, accuracy: 0.5, "the live bottom row just above the keyboard")
        keyboard(view, top: nil)
        XCTAssertLessThanOrEqual(view.contentOffset.y, view.maxOffsetY + 0.5, "the offset left past the content")
        XCTAssertEqual(view.contentOffset.y, view.maxOffsetY, accuracy: 0.5)
    }

    /// Clause (D24, the fix round): the view growing under a keyboard that is
    /// up (the question tray hides as it rises) is measured again once the
    /// layout pass is over, never inside it, and published once more.
    func testTheOverlapIsMeasuredAgainWhenTheViewGrowsUnderTheKeyboard() throws {
        let tray: CGFloat = 162
        let (view, _) = mounted(depth: 3_000, height: Self.height - tray)
        keyboard(view, top: 520)
        let short = (Self.top + Self.height - tray) - 520
        XCTAssertEqual(view.overlap, short, accuracy: 0.5)
        // The tray hides: the view grows into its place.
        view.frame = CGRect(x: 0, y: Self.top, width: Self.width, height: Self.height)
        view.layoutIfNeeded()
        XCTAssertEqual(view.overlap, short, accuracy: 0.5, "measured inside the layout pass")
        RunLoop.main.run(until: Date().addingTimeInterval(0.1))
        let tall = (Self.top + Self.height) - 520
        XCTAssertEqual(view.overlap, tall, accuracy: 0.5, "the overlap the keyboard stands at")
        XCTAssertEqual(view.contentInset.bottom, tall, accuracy: 0.5)
        XCTAssertEqual(published.count, 2)
        XCTAssertEqual(published.last ?? 0, tall, accuracy: 0.5)
        // No keyboard, no measurement: a height change after it went publishes nothing.
        keyboard(view, top: nil)
        view.frame = CGRect(x: 0, y: Self.top, width: Self.width, height: Self.height - tray)
        view.layoutIfNeeded()
        RunLoop.main.run(until: Date().addingTimeInterval(0.1))
        XCTAssertEqual(view.overlap, 0)
        XCTAssertEqual(published.count, 3)
    }

    /// Clause (the fix round): only the rows in view are accessibility
    /// elements; the window's rows a screen above and below are drawn and not
    /// spoken, and a scroll that comes to rest marks the rows then in view.
    func testOnlyTheRowsInViewAreSpoken() throws {
        let (view, history) = mounted(depth: 3_000, rows: 200)
        let seen = Int((view.bounds.height / view.cell.height).rounded(.up))
        XCTAssertLessThanOrEqual(view.spoken.count, seen + 1, "more rows spoken than are in view")
        XCTAssertGreaterThan(view.rowWindow.count, view.spoken.count, "the window draws more than it speaks")
        XCTAssertTrue(view.rowWindow.contains(view.spoken.lowerBound))
        // Scrolled back and at rest: the rows then in view are the ones spoken.
        drag(view, to: 40 * view.cell.height)
        view.scrollViewDidEndDecelerating(view)
        let first = Int((view.contentOffset.y / view.cell.height).rounded(.down))
        XCTAssertEqual(view.spoken.lowerBound, first)
        XCTAssertLessThanOrEqual(view.spoken.count, seen + 1)
        XCTAssertEqual(history.mode, .following, "a drag inside the live rows entered scrolled")
    }

    // MARK: The delta (D26)

    /// The absolute index of the row at the view's top, as drawn now.
    private func topIndex(_ view: ScreenScrollView) -> Int? {
        guard let laid = view.laid else { return nil }
        let down = Int((view.contentOffset.y / view.cell.height).rounded(.down))
        return laid.first + max(0, down)
    }

    /// The view's first and last rows, as absolute indices.
    private func visible(_ view: ScreenScrollView, _ history: ScrollbackModel) -> (Int, Int) {
        let top = history.layout.firstRow + max(0, Int((view.contentOffset.y / view.cell.height).rounded(.down)))
        return (top, top + Int((view.bounds.height / view.cell.height).rounded(.up)))
    }

    /// Clause (D26, D28): over a thousand random reservations, pages, returns
    /// to live and evictions, with a scripted drag moving the offset between
    /// them, the row at the view's top keeps its on-screen y within half a
    /// point through every layout pass; a return to live from the bottom keeps
    /// the live rows where they were.
    func testTheDeltaKeepsTheFirstVisibleRowOverAThousandChanges() throws {
        let (view, history) = mounted(depth: 100_000)
        var random = SystemRandomNumberGenerator()
        var checked = 0
        var reservations = 0
        var follows = 0
        var evicted = false
        var maxDrift: CGFloat = 0
        for step in 0..<1_000 {
            let roll = Int.random(in: 0..<10, using: &random)
            let reservedBefore = history.layout.top
            if roll < 9, history.mode == .scrolled, roll >= 6 {
                // A page lands where he reads, and fills reserved rows; past
                // 3,000 rows the farthest are evicted.
                let (top, bottom) = visible(view, history)
                guard let ask = history.layout.want(visibleTop: top, visibleBottom: bottom) else { continue }
                guard let index = topIndex(view), let before = view.onScreenY(ofIndex: index) else { continue }
                _ = history.accept(ScrollbackModelTests.answer(ask), for: ask)
                if history.layout.held.count == ScrollbackLayout.mostHeld, history.layout.lo > history.layout.top { evicted = true }
                view.layoutIfNeeded()
                let after = try XCTUnwrap(view.onScreenY(ofIndex: index))
                checked += 1
                maxDrift = max(maxDrift, abs(after - before))
                XCTAssertEqual(after, before, accuracy: 0.5, "step \(step): a page moved row \(index)")
                continue
            }
            if roll == 9, history.mode == .scrolled {
                // Back to live from the bottom: the live rows stay.
                view.contentOffset = CGPoint(x: 0, y: view.maxOffsetY)
                view.layoutIfNeeded()
                let live = history.layout.live
                let before = try XCTUnwrap(view.onScreenY(ofIndex: live))
                history.follow()
                view.layoutIfNeeded()
                let after = try XCTUnwrap(view.onScreenY(ofIndex: live))
                follows += 1
                maxDrift = max(maxDrift, abs(after - before))
                XCTAssertEqual(after, before, accuracy: 0.5, "step \(step): a return to live from the bottom moved the live rows")
                continue
            }
            // A drag: up past the top of what is laid out (a reservation), or
            // anywhere inside it. The view hears of it in the setter, and the
            // layout pass after applies what it reserved.
            let target: CGFloat
            if history.mode == .following || roll < 3 {
                target = max(-30, view.contentOffset.y - CGFloat.random(in: 20...400, using: &random))
            } else {
                target = CGFloat.random(in: 0...max(1, view.contentSize.height - view.bounds.height), using: &random)
            }
            view.contentOffset = CGPoint(x: 0, y: target)
            guard let index = topIndex(view), let before = view.onScreenY(ofIndex: index) else { continue }
            view.layoutIfNeeded()
            if history.layout.top != reservedBefore { reservations += 1 }
            guard let after = view.onScreenY(ofIndex: index) else { continue }
            checked += 1
            maxDrift = max(maxDrift, abs(after - before))
            XCTAssertEqual(after, before, accuracy: 0.5, "step \(step): row \(index) moved")
        }
        XCTAssertGreaterThan(checked, 500)
        XCTAssertGreaterThan(reservations, 20)
        XCTAssertGreaterThan(follows, 5)
        print("P3371_SCROLLER|delta|\(checked) checked|\(reservations) reservations|\(follows) follows|evicted \(evicted)|drift \(maxDrift)")
    }

    /// Clause (D28, D26): an eviction (back to reserved) moves nothing laid
    /// out: the row at the view's top stays.
    func testAnEvictionMovesNothing() throws {
        let (view, history) = mounted(depth: 6_000)
        view.contentOffset = CGPoint(x: 0, y: -10)
        view.layoutIfNeeded()
        XCTAssertEqual(history.mode, .scrolled)
        var pages = 0
        while pages < 30 {
            let top = history.layout.lo < history.layout.hi ? history.layout.lo : 5_999
            history.viewed(top: top, bottom: top + 60)
            guard let ask = history.layout.want(visibleTop: top, visibleBottom: top + 60) else { return XCTFail("no page wanted at \(top)") }
            _ = history.accept(ScrollbackModelTests.answer(ask), for: ask)
            view.layoutIfNeeded()
            pages += 1
        }
        XCTAssertEqual(history.layout.held.count, ScrollbackLayout.mostHeld)
        view.contentOffset = CGPoint(x: 0, y: CGFloat(history.layout.lo - history.layout.top) * view.cell.height)
        view.layoutIfNeeded()
        let index = try XCTUnwrap(topIndex(view))
        let before = try XCTUnwrap(view.onScreenY(ofIndex: index))
        let hi = history.layout.hi
        let (top, bottom) = visible(view, history)
        history.viewed(top: top, bottom: bottom)
        let ask = try XCTUnwrap(history.layout.want(visibleTop: top, visibleBottom: bottom))
        _ = history.accept(ScrollbackModelTests.answer(ask), for: ask)
        view.layoutIfNeeded()
        XCTAssertEqual(history.layout.held.count, ScrollbackLayout.mostHeld, "the cap")
        XCTAssertLessThan(history.layout.hi, hi, "the bottom end, far from the view, was evicted")
        XCTAssertEqual(try XCTUnwrap(view.onScreenY(ofIndex: index)), before, accuracy: 0.5, "an eviction moved what he reads")
    }

    // MARK: A change of cell size (D32)

    /// Clause (D32): a change of cell size keeps the row at the view's top
    /// where it was, and a pinch's focal row under the pinch.
    func testACellChangeKeepsTheTopRowAndTheFocalRow() throws {
        let (view, history) = mounted(depth: 3_000, rows: 200)
        drag(view, to: 40 * view.cell.height)
        let topIndex = history.layout.firstRow + Int((view.contentOffset.y / view.cell.height).rounded(.down))
        let fitted = view.cell.width
        view.zoom(to: fitted * 2, focal: view.contentOffset)
        view.layoutIfNeeded()
        XCTAssertGreaterThan(view.cell.width, fitted * 1.5, "the font was set")
        let nowTop = history.layout.firstRow + Int((view.contentOffset.y / view.cell.height + 0.01).rounded(.down))
        XCTAssertEqual(nowTop, topIndex, "the row at the top")
        // A pinch's centre, mid-view, in the middle of its row: the row under
        // it stays under it.
        let focalRow = Int(((view.contentOffset.y + 300) / view.cell.height).rounded(.down))
        let focal = CGPoint(x: 100, y: (CGFloat(focalRow) + 0.5) * view.cell.height)
        let inView = focal.y - view.contentOffset.y
        view.zoom(to: fitted, focal: focal)
        view.layoutIfNeeded()
        let under = view.contentOffset.y + inView
        XCTAssertEqual(Int((under / view.cell.height).rounded(.down)), focalRow, "the focal row")
    }

    // MARK: The rows drawn

    /// Clause (D25): the window draws the rows in view and one screen above
    /// and below, never the whole history.
    func testOnlyAWindowOfRowsIsDrawn() throws {
        let (view, history) = mounted(depth: 100_000)
        for _ in 0..<30 {
            drag(view, to: view.contentOffset.y - 300)
        }
        XCTAssertGreaterThan(history.layout.liveRow, 500)
        let seen = Int((view.bounds.height / view.cell.height).rounded(.up))
        XCTAssertLessThanOrEqual(view.rowWindow.count, seen * 3 + 4, "the window is a view and a screen either side")
    }
}
