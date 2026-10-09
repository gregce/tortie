import SwiftUI
import UIKit
import XCTest
@testable import Tortie

/// The Terminal's UIKit scroll view (Phase 337.1, build/p3371/SPEC.md D24 to
/// D26, D32 and section 7.3; since Phase 337.3, build/p3373/SPEC.md D1 to D12
/// and section 7.2, it opens full): following, the live rows' LAST row ends at
/// the view's bottom with as much of what the session printed as fills the
/// view above it, from the very first layout pass, the first page landing in
/// rows already laid out; a session with no history and a full-screen program
/// look as 337.1 drew them, the live rows at the top; the pad is the view less
/// EVERY row laid out; two hundred pictures each scrolling one to five lines
/// keep every live row still and the history whole above them; following
/// above its bottom keeps the live rows' place; a drag off the bottom is a
/// scroll at once and keeps what he reads; a turn of the phone keeps the live
/// bottom and a pinch its focal row. And 337.1's own: the keyboard's overlap
/// read from its frame, converted into the view and published once, the
/// offset clamped when it goes, measured again when the view grows; only the
/// rows in view spoken; the offset's delta over a thousand random
/// reservations, returns to live and evictions while a scripted drag moves the
/// offset; an eviction moving nothing; a change of cell size keeping the top
/// row and a pinch's focal row; and only a window drawn. All at the 337
/// build's own measured geometry (a 40-row screen at 6.67 pt in a 758 pt
/// view, build/p3371/SPEC.md section 14 M12). The view is mounted in the host
/// app's own window; nothing reaches a network. Each test names the clause it
/// holds and fails when that clause is taken out of
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

    /// The 337 build's Terminal on iOS 26.3 (build/p3371/SPEC.md section 14
    /// M12): 402 points wide, the grid 758 tall under the bar, 120 columns,
    /// 40 rows.
    private static let width: CGFloat = 402
    private static let height: CGFloat = 758
    private static let top: CGFloat = 116

    // MARK: tmux's own numbered lines

    /// tmux's line at `index`: `L` and `index + 1` in six digits, as the
    /// Mac's pages bring it (build/p3371/SPEC.md section 14 M1).
    nonisolated static func label(_ index: Int) -> String {
        "L" + String(format: "%06d", index + 1)
    }

    static let space = "5eed0123abcd"
    static let wrap = 120

    static let style = PocketScreenStyle(
        fg: ScreenColor.read(ScreenSample.colour("d8dbe2"))!, bg: nil, bold: false, dim: false, italic: false, underline: false, strike: false
    )

    /// A live picture of `rows` rows whose top row is index `depth`, live row
    /// `r` being tmux's line `depth + r`, so a row carried into the history
    /// as it scrolls off the live screen reads what a page brings there. With
    /// no depth (the alternate screen, an unsteady read) it offers no index
    /// space.
    static func numbered(depth: Int?, rows: Int = 40, cols: Int = wrap, alternate: Bool = false) -> ScreenPicture {
        let base = depth ?? 0
        let lines: [[[String: Any]]] = (0..<rows).map { r in
            let text = label(base + r)
            return [["text": text, "style": 0, "cells": text.count]]
        }
        return ScreenSample.picture(
            lines: lines, cols: cols, alternate: alternate, depth: depth, space: depth == nil ? nil : space
        )
    }

    /// The page the Mac answers to `ask`: tmux's numbered lines, read at
    /// `depth` (the ask's when nil).
    static func page(_ ask: ScrollbackAsk, depth: Int? = nil) -> PocketScrollbackAnswer {
        let rows = (ask.from..<(ask.from + ask.count)).map { index -> [PocketScreenRun] in
            let words = label(index)
            return [PocketScreenRun(text: words, runStyle: 0, runCells: words.count)]
        }
        return PocketScrollbackAnswer(
            sessionId: "s", at: 1_791_158_400_000, pageFrom: ask.from, pageDepth: depth ?? ask.depth, pageWrap: ask.wrap,
            space: space, styles: [style], rows: rows, why: nil, sentence: nil
        )
    }

    // MARK: Mounting and moving

    /// A scroll view over `picture`, in a window of the host app's scene;
    /// laid out (every pass `layoutIfNeeded` runs) unless `layOut` is false.
    private func mounted(_ picture: ScreenPicture, height: CGFloat = height, layOut: Bool = true) -> (ScreenScrollView, ScrollbackModel) {
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
        history.picture(picture)
        view.picture = picture
        if layOut { view.layoutIfNeeded() }
        return (view, history)
    }

    /// A scroll view over a history of `depth` lines, laid out, following.
    private func mounted(depth: Int, rows: Int = 40, cols: Int = wrap, height: CGFloat = height) -> (ScreenScrollView, ScrollbackModel) {
        mounted(Self.numbered(depth: depth, rows: rows, cols: cols), height: height)
    }

    /// A new live picture, as the poll draws it: the history hears of it,
    /// then the view, then the layout pass.
    private func show(_ picture: ScreenPicture, on view: ScreenScrollView, _ history: ScrollbackModel) {
        history.picture(picture)
        view.picture = picture
        view.layoutIfNeeded()
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

    /// Where the live screen's LAST row ends in the view, in points from its
    /// top.
    private func liveBottom(_ view: ScreenScrollView, _ history: ScrollbackModel, rows: Int = 40) throws -> CGFloat {
        let last = history.layout.live + rows - 1
        return try XCTUnwrap(view.onScreenY(ofIndex: last), "live row \(rows - 1) is not laid out") + view.cell.height
    }

    // MARK: Open full (build/p3373/SPEC.md D1 to D4)

    /// Clause (D1, D2, D4): following at depth 3,000, the live rows' LAST row
    /// ends at the view's bottom, live row 0 is not at its top, and reserved
    /// rows of history fill the view above them: ONE page at this geometry
    /// (758 pt at about 6.67 pt a row is 114 rows, less 40 live), with no pad.
    /// At the parent the pad was the view less the live rows alone, which held
    /// the live rows at the top whatever was above them (his report).
    func testFollowingFillsTheViewWithTheLiveBottomAtItsBottom() throws {
        let (view, history) = mounted(depth: 3_000)
        let row = view.cell.height
        XCTAssertEqual(history.mode, .following)
        XCTAssertEqual(row, 6.67, accuracy: 0.34, "the fitted row")
        let fill = Int((Self.height / row).rounded(.up)) - 40
        XCTAssertGreaterThan(fill, 0)
        XCTAssertLessThanOrEqual(fill, ScrollbackLayout.pageRows, "one page fills this view")
        XCTAssertEqual(history.layout.firstRow, 3_000 - ScrollbackLayout.pageRows, "the fill reserved one page above the live rows")
        XCTAssertEqual(try liveBottom(view, history), Self.height, accuracy: 0.5, "the live bottom at the view's bottom")
        XCTAssertGreaterThan(try XCTUnwrap(view.onScreenY(ofIndex: 3_000)), 0.5, "live row 0 is at the view's top")
        XCTAssertLessThanOrEqual(try XCTUnwrap(view.onScreenY(ofIndex: history.layout.firstRow)), 0.5, "the history does not reach the view's top")
        XCTAssertEqual(view.contentSize.height, CGFloat(ScrollbackLayout.pageRows + 40) * row, accuracy: 0.5, "every row laid out, and no pad")
        XCTAssertTrue(view.pinned, "following at the bottom")
        XCTAssertTrue(history.layout.held.isEmpty, "the rows above are reserved until their page lands")
        print("P3373_SCROLLER|fill|cell \(row)|first \(history.layout.firstRow)|live0 \(view.onScreenY(ofIndex: 3_000) ?? -1)")
    }

    /// Clause (D7, section 5.6): a session that has printed nothing yet
    /// (depth 0) looks as today: live row 0 at the view's top, the pad below
    /// it filling the view, and no page asked.
    func testWithNoHistoryTheLiveRowsSitAtTheTopAsToday() throws {
        let (view, history) = mounted(depth: 0)
        XCTAssertEqual(history.mode, .following)
        XCTAssertEqual(try XCTUnwrap(view.onScreenY(ofIndex: 0)), 0, accuracy: 0.5, "live row 0 at the view's top")
        XCTAssertEqual(view.contentSize.height, Self.height, accuracy: 0.5, "the pad fills the view")
        XCTAssertEqual(view.contentOffset.y, 0, accuracy: 0.5)
        XCTAssertNil(history.asking, "a page asked with nothing printed")
    }

    /// Clause (D7, section 5.6): a full-screen program, whose picture offers
    /// no index space, looks as today: live row 0 at the view's top, the pad
    /// below, no history and no page.
    func testOnTheAlternateScreenTheLiveRowsSitAtTheTopAsToday() throws {
        let (view, history) = mounted(Self.numbered(depth: nil, alternate: true))
        XCTAssertEqual(try XCTUnwrap(view.onScreenY(ofIndex: history.layout.live)), 0, accuracy: 0.5, "live row 0 at the view's top")
        XCTAssertEqual(history.layout.liveRow, 0, "history laid out over a full-screen program")
        XCTAssertEqual(view.contentSize.height, Self.height, accuracy: 0.5, "the pad fills the view")
        XCTAssertNil(history.asking, "a page asked over a full-screen program")
    }

    /// Clause (D3, rule aq9): the FIRST layout pass already has the live
    /// bottom at the view's bottom: the fill is reserved inside that pass,
    /// before the content is sized, so no pass draws the live rows at the top
    /// and then jumps. One pass, called alone.
    func testTheFirstLayoutPassIsAlreadyFilled() throws {
        let (view, history) = mounted(Self.numbered(depth: 3_000), layOut: false)
        XCTAssertNil(view.laid, "laid out before the first pass")
        view.layoutSubviews()
        XCTAssertEqual(view.laid?.liveRow, ScrollbackLayout.pageRows, "the first pass laid out no history above the live rows")
        XCTAssertEqual(try liveBottom(view, history), Self.height, accuracy: 0.5, "the first pass drew the live bottom elsewhere")
        XCTAssertGreaterThan(try XCTUnwrap(view.onScreenY(ofIndex: 3_000)), 0.5, "the first pass drew live row 0 at the top")
    }

    /// Clause (D3): the first page lands in rows already laid out: no row on
    /// screen moves, the offset and the content's size do not change, and the
    /// rows it brings are tmux's lines where they lay.
    func testTheFirstPageLandsInRowsAlreadyLaidOut() throws {
        let (view, history) = mounted(depth: 3_000)
        let ask = try XCTUnwrap(history.asking, "the fill asked no page at open")
        XCTAssertEqual(ask.from, 2_900)
        XCTAssertEqual(ask.count, 100)
        XCTAssertEqual(ask.keep, .bottom)
        let offset = view.contentOffset.y
        let size = view.contentSize
        var ys: [Int: CGFloat] = [:]
        for index in [2_930, 2_999, 3_000, 3_039] { ys[index] = try XCTUnwrap(view.onScreenY(ofIndex: index)) }
        XCTAssertNil(history.layout.held[2_950], "held before its page landed")
        _ = history.accept(Self.page(ask), for: ask)
        view.layoutIfNeeded()
        XCTAssertEqual(view.contentOffset.y, offset, accuracy: 0.001, "the page moved the offset")
        XCTAssertEqual(view.contentSize, size, "the page changed the content's size")
        for (index, y) in ys {
            XCTAssertEqual(try XCTUnwrap(view.onScreenY(ofIndex: index)), y, accuracy: 0.5, "the page moved row \(index)")
        }
        XCTAssertEqual(history.layout.held[2_950]?.row.label, Self.label(2_950), "the page did not fill the row where it lay")
        XCTAssertEqual(history.mode, .following)
    }

    /// Clause (D2): a session so wide that more than one page fits above its
    /// live screen (200 columns: a cell of about 2 pt and a row of about 4)
    /// reserves whole pages, enough to fill the view, and the live bottom
    /// still ends at the view's bottom.
    func testAWideSessionFillsWithWholePages() throws {
        let (view, history) = mounted(depth: 3_000, cols: 200)
        let fits = Int((Self.height / view.cell.height).rounded(.up))
        let pages = (fits - 40 + ScrollbackLayout.pageRows - 1) / ScrollbackLayout.pageRows
        XCTAssertGreaterThanOrEqual(pages, 2, "a row of \(view.cell.height) pt")
        XCTAssertEqual(history.layout.firstRow, 3_000 - pages * ScrollbackLayout.pageRows, "the fill in whole pages")
        XCTAssertEqual(try liveBottom(view, history), Self.height, accuracy: 0.5)
        XCTAssertLessThanOrEqual(try XCTUnwrap(view.onScreenY(ofIndex: history.layout.firstRow)), 0.5, "the history does not reach the view's top")
    }

    /// Clause (D4, rule aq7): the pad is the view's visible height less EVERY
    /// row laid out, never below 0. A history shorter than the fill (3 and 30
    /// lines) is laid out whole at the view's TOP, then the live rows, then
    /// the pad, so the content is exactly the view; with the keyboard up the
    /// pad is the visible height less every row. The parent's pad, the view
    /// less the live rows alone, made the content taller than the view and put
    /// the live rows at its top.
    func testThePadIsTheViewLessEveryRowLaidOut() throws {
        for depth in [3, 30] {
            let (view, history) = mounted(depth: depth)
            let row = view.cell.height
            let laid = CGFloat(depth + 40) * row
            XCTAssertEqual(history.layout.firstRow, 0, "depth \(depth): the whole history laid out")
            XCTAssertEqual(history.layout.liveRow, depth)
            XCTAssertEqual(view.contentSize.height, Self.height, accuracy: 0.5, "depth \(depth): every row and the pad fill the view")
            XCTAssertEqual(try XCTUnwrap(view.onScreenY(ofIndex: 0)), 0, accuracy: 0.5, "depth \(depth): the oldest line at the view's top")
            XCTAssertEqual(try XCTUnwrap(view.onScreenY(ofIndex: depth)), CGFloat(depth) * row, accuracy: 0.5, "depth \(depth): the live rows under the history")
            keyboard(view, top: 520)
            let visible = Self.height - view.overlap
            XCTAssertEqual(view.contentSize.height, max(visible, laid), accuracy: 0.5, "depth \(depth): the pad with the keyboard up")
            // Rows taller than what the keyboard leaves end just above it;
            // shorter ones stay at the view's top, the pad under them.
            XCTAssertEqual(try liveBottom(view, history), min(visible, laid), accuracy: 0.5, "depth \(depth): the live bottom with the keyboard up")
            keyboard(view, top: nil)
            XCTAssertEqual(view.contentSize.height, Self.height, accuracy: 0.5, "depth \(depth): the pad back")
            XCTAssertEqual(history.mode, .following)
            tearDownWindow()
        }
    }

    // MARK: Following while the session prints (D5, D11)

    /// Clause (D5, D11): two hundred pictures while following, each scrolling
    /// one to five lines: every live row keeps its on-screen y within half a
    /// point (the live bottom at the view's bottom), and the history above
    /// the live rows is whole, no reserved row between it and the live top,
    /// every row tmux's line at its index.
    func testTwoHundredPicturesKeepTheLiveRowsStillAndTheHistoryWhole() throws {
        let (view, history) = mounted(depth: 3_000)
        let first = try XCTUnwrap(history.asking)
        _ = history.accept(Self.page(first), for: first)
        view.layoutIfNeeded()
        let places = [0, 1, 20, 39]
        var ys: [Int: CGFloat] = [:]
        for r in places { ys[r] = try XCTUnwrap(view.onScreenY(ofIndex: 3_000 + r)) }
        XCTAssertEqual(try XCTUnwrap(ys[39]) + view.cell.height, Self.height, accuracy: 0.5)
        var random = SystemRandomNumberGenerator()
        var depth = 3_000
        var drift: CGFloat = 0
        for step in 0..<200 {
            depth += Int.random(in: 1...5, using: &random)
            show(Self.numbered(depth: depth), on: view, history)
            XCTAssertEqual(history.mode, .following, "step \(step)")
            XCTAssertEqual(history.layout.live, depth, "step \(step)")
            for r in places {
                let y = try XCTUnwrap(view.onScreenY(ofIndex: depth + r), "step \(step): live row \(r) is not laid out")
                let was = try XCTUnwrap(ys[r])
                drift = max(drift, abs(y - was))
                XCTAssertEqual(y, was, accuracy: 0.5, "step \(step): live row \(r) moved")
            }
            XCTAssertEqual(history.layout.hi, depth, "step \(step): a reserved row between the history and the live top")
            for index in stride(from: depth - 1, through: max(2_900, depth - 120), by: -1) {
                XCTAssertEqual(history.layout.held[index]?.row.label, Self.label(index), "step \(step): row \(index) of the history")
            }
        }
        print("P3373_SCROLLER|follow|200 pictures|depth \(depth)|drift \(drift)")
    }

    /// Clause (D11, rule aq10): following ABOVE its bottom, on a live screen
    /// taller than the view (200 rows: no fill, nothing pins it), the rows a
    /// picture carries above the live rows move the offset by exactly their
    /// height, so every live row keeps its place on screen and what was above
    /// it slides up, as on a terminal. At the parent following added nothing,
    /// and the live rows moved down under him by the rows carried.
    func testFollowingAboveItsBottomKeepsTheLiveRowsPlace() throws {
        let (view, history) = mounted(depth: 3_000, rows: 200)
        drag(view, to: 40 * view.cell.height)
        XCTAssertEqual(history.mode, .following, "a drag inside the live rows entered scrolled")
        XCTAssertFalse(view.pinned)
        var ys: [Int: CGFloat] = [:]
        for r in [0, 50, 199] { ys[r] = try XCTUnwrap(view.onScreenY(ofIndex: 3_000 + r)) }
        show(Self.numbered(depth: 3_003, rows: 200), on: view, history)
        XCTAssertEqual(history.layout.liveRow, 3, "three rows carried above the live rows")
        for (r, y) in ys {
            XCTAssertEqual(try XCTUnwrap(view.onScreenY(ofIndex: 3_003 + r)), y, accuracy: 0.5, "live row \(r) moved")
        }
        XCTAssertEqual(history.mode, .following)
    }

    /// Clause (D9, D26 of 337.1, rule aq11): a pull past the bottom is still
    /// the bottom; a drag off the bottom with history above is a scroll AT
    /// ONCE, and in the same pass as a picture that carried rows below him it
    /// keeps the row he reads where it is (the rows reserved above the first
    /// row move the offset, never the live rows growing under him); back at
    /// the bottom and at rest it is following again, with the fill kept.
    func testADragOffTheBottomIsAScrollAndKeepsWhatHeReads() throws {
        let (view, history) = mounted(depth: 3_000)
        drag(view, to: view.maxOffsetY + 30)
        XCTAssertEqual(history.mode, .following, "a pull past the bottom entered scrolled")
        drag(view, to: view.maxOffsetY)
        XCTAssertTrue(view.pinned)
        // A picture lands, and before its layout pass he drags up.
        let carried = Self.numbered(depth: 3_003)
        history.picture(carried)
        view.picture = carried
        view.contentOffset = CGPoint(x: 0, y: view.contentOffset.y - 40)
        XCTAssertEqual(history.mode, .scrolled, "a drag off the bottom with history above did not enter scrolled")
        let reading = 2_950
        let before = try XCTUnwrap(view.onScreenY(ofIndex: reading))
        view.layoutIfNeeded()
        XCTAssertEqual(try XCTUnwrap(view.onScreenY(ofIndex: reading)), before, accuracy: 0.5, "the row he reads moved")
        XCTAssertEqual(history.layout.live, 3_003)
        // Back at the bottom, at rest: following, the fill kept.
        drag(view, to: view.maxOffsetY)
        view.scrollViewDidEndDecelerating(view)
        view.layoutIfNeeded()
        XCTAssertEqual(history.mode, .following, "a drag that ended at the bottom did not return to following")
        XCTAssertEqual(try liveBottom(view, history), Self.height, accuracy: 0.5)
    }

    /// Clause (D7, D11): a full-screen program taking the screen while
    /// following drops the history above the live rows and draws the live
    /// rows at the top as today, never past the content's top; when it leaves
    /// the fill comes back with the live bottom at the view's bottom.
    func testAFullScreenProgramDropsTheFillAndItComesBack() throws {
        let (view, history) = mounted(depth: 3_000)
        show(Self.numbered(depth: nil, alternate: true), on: view, history)
        XCTAssertEqual(history.layout.liveRow, 0, "history kept over a full-screen program")
        XCTAssertEqual(view.contentOffset.y, 0, accuracy: 0.5, "the offset left past the content")
        XCTAssertEqual(try XCTUnwrap(view.onScreenY(ofIndex: history.layout.live)), 0, accuracy: 0.5, "live row 0 at the view's top")
        XCTAssertEqual(view.contentSize.height, Self.height, accuracy: 0.5)
        show(Self.numbered(depth: 3_000), on: view, history)
        XCTAssertEqual(history.layout.firstRow, 2_900, "the fill did not come back")
        XCTAssertEqual(try liveBottom(view, history), Self.height, accuracy: 0.5, "the live bottom at the view's bottom again")
        XCTAssertEqual(history.mode, .following)
    }

    /// Clause (D12): a change of cell size with no focal anchor (a turn of
    /// the phone) while following at the bottom keeps the live bottom at the
    /// view's bottom, sideways (the measured landscape terminal, 750 × 382,
    /// build/p3373/SPEC.md section 14 M2) and upright again. Keeping the top
    /// row, the parent's rule, left the live bottom off screen.
    func testATurnWhileFollowingAtTheBottomKeepsTheLiveBottom() throws {
        let (view, history) = mounted(depth: 3_000)
        let upright = view.cell.height
        view.frame = CGRect(x: 62, y: 0, width: 750, height: 382)
        view.layoutIfNeeded()
        XCTAssertGreaterThan(view.cell.height, upright, "the wider view's cell")
        XCTAssertEqual(history.mode, .following)
        XCTAssertEqual(try liveBottom(view, history), 382, accuracy: 0.5, "sideways, the live bottom is not at the view's bottom")
        view.frame = CGRect(x: 0, y: Self.top, width: Self.width, height: Self.height)
        view.layoutIfNeeded()
        XCTAssertEqual(view.cell.height, upright, accuracy: 0.001)
        XCTAssertEqual(try liveBottom(view, history), Self.height, accuracy: 0.5, "upright again, the live bottom is not at the view's bottom")
        XCTAssertEqual(history.mode, .following)
    }

    /// Clause (D12, D32 of 337.1): a pinch in the filled view keeps its focal
    /// row under it, and having left the view off its bottom with history
    /// above it is a scroll, so new output then keeps the zoomed place.
    func testAPinchInTheFillKeepsItsFocalRowAndIsAScroll() throws {
        let (view, history) = mounted(depth: 3_000)
        let fitted = view.cell.width
        let inView: CGFloat = 379
        let focal = CGPoint(x: 100, y: view.contentOffset.y + inView)
        let focalRow = try XCTUnwrap(view.laid).first + Int((focal.y / view.cell.height).rounded(.down))
        view.zoom(to: fitted * 2, focal: focal)
        view.layoutIfNeeded()
        XCTAssertGreaterThan(view.cell.width, fitted * 1.5, "the font was set")
        let under = view.contentOffset.y + inView
        XCTAssertEqual(try XCTUnwrap(view.laid).first + Int((under / view.cell.height).rounded(.down)), focalRow, "the focal row moved")
        XCTAssertEqual(history.mode, .scrolled, "a pinch off the bottom with history above is a scroll")
    }

    /// Clause (D9, D26 of 337.1, §Attack B5): a drag up from the filled view
    /// enters `scrolled` and reserves a page above, and the live rows stay at
    /// the same on-screen y within half a point, in the same layout pass; the
    /// offset grows by exactly the rows reserved; a page landing then moves
    /// nothing.
    func testAPageReservedAboveDoesNotMoveTheLiveRows() throws {
        let (view, history) = mounted(depth: 3_000)
        let first = history.layout.firstRow
        let offset = view.contentOffset.y
        // The drag: the view hears of it, enters `scrolled` and reserves.
        view.contentOffset = CGPoint(x: 0, y: offset - 40)
        XCTAssertEqual(history.mode, .scrolled)
        let before = try XCTUnwrap(view.onScreenY(ofIndex: 3_000))
        XCTAssertEqual(before, CGFloat(3_000 - first) * view.cell.height - (offset - 40), accuracy: 0.5, "as drawn before the layout pass")
        view.layoutIfNeeded()
        XCTAssertEqual(try XCTUnwrap(view.onScreenY(ofIndex: 3_000)), before, accuracy: 0.5, "the live rows did not move")
        // The view's top, near the first row, reserves a page at a time
        // (D26), and every row reserved is added to the offset.
        let reserved = first - history.layout.firstRow
        XCTAssertGreaterThanOrEqual(reserved, 100)
        XCTAssertEqual(reserved % 100, 0, "a page at a time")
        XCTAssertEqual(view.contentOffset.y, offset - 40 + CGFloat(reserved) * view.cell.height, accuracy: 0.5, "the offset grew by exactly what was reserved")
        let ask = try XCTUnwrap(history.asking)
        _ = history.accept(Self.page(ask), for: ask)
        view.layoutIfNeeded()
        XCTAssertEqual(try XCTUnwrap(view.onScreenY(ofIndex: 3_000)), before, accuracy: 0.5, "a page landing moved the live rows")
        XCTAssertEqual(try XCTUnwrap(view.onScreenY(ofIndex: 2_999)), CGFloat(before) - view.cell.height, accuracy: 0.5)
        XCTAssertEqual(history.layout.held[2_999]?.row.label, Self.label(2_999))
    }

    // MARK: The keyboard (D24 of 337.1)

    /// Clause (D24): the keyboard's frame, converted into the view, is its
    /// overlap; it is the bottom inset and the indicators', published to the
    /// page ONCE per change; a keyboard going is 0, and following the live
    /// rows of a short screen with no history stay where they were
    /// throughout.
    func testTheKeyboardsOverlapIsConvertedAndPublishedOnce() throws {
        let (view, _) = mounted(depth: 0)
        let rowTop = try XCTUnwrap(view.onScreenY(ofIndex: 0))
        keyboard(view, top: 520)
        let expected = (Self.top + Self.height) - 520
        XCTAssertEqual(view.overlap, expected, accuracy: 0.5)
        XCTAssertEqual(view.contentInset.bottom, expected, accuracy: 0.5)
        XCTAssertEqual(view.verticalScrollIndicatorInsets.bottom, expected, accuracy: 0.5)
        keyboard(view, top: 520)
        XCTAssertEqual(published.count, 1, "the same keyboard published again")
        XCTAssertEqual(try XCTUnwrap(view.onScreenY(ofIndex: 0)), rowTop, accuracy: 0.5, "the rows followed the keyboard")
        keyboard(view, top: nil)
        XCTAssertEqual(view.overlap, 0)
        XCTAssertEqual(published, [expected, 0])
        XCTAssertEqual(try XCTUnwrap(view.onScreenY(ofIndex: 0)), rowTop, accuracy: 0.5, "the rows sit low after the keyboard went")
        XCTAssertEqual(view.frame, CGRect(x: 0, y: Self.top, width: Self.width, height: Self.height), "the frame never follows the keyboard")
    }

    /// Clause (D2, D24, section 13 item 9): following over the fill, the live
    /// bottom rides just above the keyboard while it is up and is back at the
    /// view's bottom when it goes; the keyboard is no scroll and reserves
    /// nothing (the fill is the view's WHOLE height), and the frame never
    /// follows it.
    func testFollowingKeepsTheLiveBottomJustAboveTheKeyboard() throws {
        let (view, history) = mounted(depth: 3_000)
        let first = history.layout.firstRow
        keyboard(view, top: 520)
        XCTAssertEqual(history.mode, .following, "the keyboard rising entered scrolled")
        XCTAssertEqual(try liveBottom(view, history), Self.height - view.overlap, accuracy: 0.5, "the live bottom is not just above the keyboard")
        XCTAssertEqual(history.layout.firstRow, first, "the keyboard reserved rows")
        keyboard(view, top: nil)
        XCTAssertEqual(history.mode, .following, "the keyboard going entered scrolled")
        XCTAssertEqual(try liveBottom(view, history), Self.height, accuracy: 0.5, "the live bottom is not back at the view's bottom")
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

    // MARK: The delta (D26 of 337.1)

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
                _ = history.accept(Self.page(ask), for: ask)
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
            history.viewed(top: top, bottom: top + 60, atBottom: false)
            guard let ask = history.layout.want(visibleTop: top, visibleBottom: top + 60) else { return XCTFail("no page wanted at \(top)") }
            _ = history.accept(Self.page(ask), for: ask)
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
        history.viewed(top: top, bottom: bottom, atBottom: false)
        let ask = try XCTUnwrap(history.layout.want(visibleTop: top, visibleBottom: bottom))
        _ = history.accept(Self.page(ask), for: ask)
        view.layoutIfNeeded()
        XCTAssertEqual(history.layout.held.count, ScrollbackLayout.mostHeld, "the cap")
        XCTAssertLessThan(history.layout.hi, hi, "the bottom end, far from the view, was evicted")
        XCTAssertEqual(try XCTUnwrap(view.onScreenY(ofIndex: index)), before, accuracy: 0.5, "an eviction moved what he reads")
    }

    // MARK: A change of cell size (D32 of 337.1)

    /// Clause (D32): off the bottom, a change of cell size keeps the row at
    /// the view's top where it was, and a pinch's focal row under the pinch.
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

    // MARK: Helpers

    /// End the window a test mounted, before it mounts another.
    private func tearDownWindow() {
        window?.isHidden = true
        window?.rootViewController = nil
        window = nil
        published = []
    }
}
