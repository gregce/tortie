import Foundation
import XCTest
@testable import Tortie

/// The Terminal's history, as the phone holds it (Phase 337.1,
/// build/p3371/SPEC.md D13, D25 to D28, D31 and section 5.5.4): Paseo's four
/// behaviours over the Swift model (terminal-scrollback.test.ts at
/// getpaseo/paseo 2f0cb2f, ported, not copied), every ask's shape and that
/// none reaches past `depthSeen`, every check a page passes before it is
/// joined, the reservation one page at a time, a page that fills without
/// moving anything, the 3,000 cap, the one page in flight and its gap, a key
/// returning to live, and a selection by absolute index whose Copy waits for
/// every row. The door and the clock are scripts; nothing reaches a network.
/// Each test names the clause it holds and fails when that clause is taken
/// out of Screens/ScreenScrollback.swift.
@MainActor
final class ScrollbackModelTests: XCTestCase {
    // MARK: The history the tests page through

    /// tmux's own index space over numbered lines: index `i` holds
    /// `L` and `i + 1` in six digits (§14 M1).
    nonisolated static func label(_ index: Int) -> String {
        "L" + String(format: "%06d", index + 1)
    }

    static let wrap = 120
    static let space = "5eed0123abcd"

    static let style = PocketScreenStyle(
        fg: ScreenColor.read(ScreenSample.colour("d8dbe2"))!, bg: nil, bold: false, dim: false, italic: false, underline: false, strike: false
    )

    /// A page of numbered lines, as the Mac answers.
    static func page(
        from: Int, count: Int, depth: Int, wrap: Int = wrap, space: String = space, text: (Int) -> String = label
    ) -> PocketScrollbackAnswer {
        let rows = (from..<(from + count)).map { index -> [PocketScreenRun] in
            let words = text(index)
            return [PocketScreenRun(text: words, runStyle: 0, runCells: words.count)]
        }
        return PocketScrollbackAnswer(
            sessionId: "s", at: 1_791_158_400_000, pageFrom: from, pageDepth: depth, pageWrap: wrap, space: space,
            styles: [style], rows: rows, why: nil, sentence: nil
        )
    }

    /// The page that answers `ask` exactly.
    static func answer(_ ask: ScrollbackAsk, depth: Int? = nil) -> PocketScrollbackAnswer {
        page(from: ask.from, count: ask.count, depth: depth ?? ask.depth)
    }

    /// An absence the Mac sends.
    static func absence(_ why: PocketScrollbackAbsence, _ sentence: String = "s.") -> PocketScrollbackAnswer {
        PocketScrollbackAnswer(
            sessionId: "s", at: 1, pageFrom: nil, pageDepth: nil, pageWrap: nil, space: nil, styles: [], rows: [], why: why, sentence: sentence
        )
    }

    /// A live picture of `rows` rows whose top row is index `depth`.
    static func picture(depth: Int?, rows: Int = 40, cols: Int = wrap, space: String? = space, alternate: Bool = false, revision: String = "0123456789ab") -> ScreenPicture {
        let lines: [[[String: Any]]] = (0..<rows).map { r in [["text": "live-\(r)", "style": 0, "cells": "live-\(r)".count]] }
        return ScreenSample.picture(
            revision: revision, lines: lines, cols: cols, alternate: alternate,
            depth: depth, space: depth == nil ? nil : space
        )
    }

    /// A layout entered `scrolled` from a live picture at `depth`.
    private func entered(depth: Int, rows: Int = 40) -> ScrollbackLayout {
        var layout = ScrollbackLayout()
        layout.picture(Self.picture(depth: depth, rows: rows))
        XCTAssertGreaterThan(layout.reserve(visibleTop: max(0, depth - 1)), 0, "entering scrolled reserves the first page")
        return layout
    }

    // MARK: Paseo's four behaviours

    /// Clause (Paseo: following tracks the bottom as live output continues):
    /// following, the live rows are laid out from the live top, nothing is
    /// held, and a deeper picture moves the first row with it.
    func testFollowingTracksTheLiveRows() {
        var layout = ScrollbackLayout()
        layout.picture(Self.picture(depth: 500))
        XCTAssertEqual(layout.mode, .following)
        XCTAssertEqual(layout.firstRow, 500)
        XCTAssertEqual(layout.liveRow, 0)
        XCTAssertEqual(layout.rowCount, 40)
        layout.picture(Self.picture(depth: 520))
        XCTAssertEqual(layout.mode, .following)
        XCTAssertEqual(layout.firstRow, 520, "following tracks the live top")
        XCTAssertTrue(layout.held.isEmpty)
        XCTAssertNil(layout.want(visibleTop: 0, visibleBottom: 1_000), "following asks no page")
    }

    /// Clause (Paseo: scroll up moves the viewport into retained history):
    /// a view above the live top enters `scrolled`, reserves the first page
    /// at once, and the first page's rows are the lines tmux numbered there.
    func testScrollingUpMovesIntoHistory() throws {
        var layout = ScrollbackLayout()
        layout.picture(Self.picture(depth: 3_000))
        XCTAssertEqual(layout.reserve(visibleTop: 3_000), 0, "a view at the live top is still following")
        XCTAssertEqual(layout.reserve(visibleTop: 2_999), 100)
        XCTAssertEqual(layout.mode, .scrolled)
        XCTAssertEqual(layout.top, 2_900)
        XCTAssertLessThan(layout.firstRow, 3_000)
        let ask = try XCTUnwrap(layout.want(visibleTop: 2_990, visibleBottom: 3_040))
        XCTAssertEqual(ask, ScrollbackAsk(from: 2_900, count: 100, depth: 3_000, wrap: Self.wrap, keep: .bottom, overlap: 0))
        XCTAssertEqual(layout.accept(Self.answer(ask), for: ask, holds: { _ in true }), .joined(100))
        XCTAssertEqual((2_900..<2_903).map { layout.row(at: $0, picture: nil)?.label }, ["L002901", "L002902", "L002903"])
        XCTAssertEqual(layout.row(at: 2_999, picture: nil)?.label, "L003000")
    }

    /// Clause (Paseo: the scrolled place is kept when new output arrives):
    /// a deeper live picture while scrolled moves neither the first row nor
    /// a held row; the live rows move down below him, and `depthSeen` rises.
    func testTheScrolledPlaceIsKeptWhenOutputArrives() throws {
        var layout = entered(depth: 3_000)
        let ask = try XCTUnwrap(layout.want(visibleTop: 2_950, visibleBottom: 3_000))
        _ = layout.accept(Self.answer(ask), for: ask, holds: { _ in true })
        let first = layout.firstRow
        let liveRow = layout.liveRow
        layout.picture(Self.picture(depth: 3_005))
        XCTAssertEqual(layout.mode, .scrolled)
        XCTAssertEqual(layout.firstRow, first, "the place is kept")
        XCTAssertEqual(layout.liveRow, liveRow + 5, "the live rows move down below him")
        XCTAssertEqual(layout.depthSeen, 3_005)
        XCTAssertEqual(layout.row(at: 2_950, picture: nil)?.label, "L002951", "a held row is where it was")
    }

    /// Clause (Paseo: the bottom affordance returns to the tail and resumes
    /// following): `follow()` drops every held and reserved row and answers
    /// the rows that were above the live rows, for the offset's delta.
    func testTheBottomAffordanceReturnsToTheTail() throws {
        var layout = entered(depth: 3_000)
        let ask = try XCTUnwrap(layout.want(visibleTop: 2_950, visibleBottom: 3_000))
        _ = layout.accept(Self.answer(ask), for: ask, holds: { _ in true })
        XCTAssertEqual(layout.follow(), 100)
        XCTAssertEqual(layout.mode, .following)
        XCTAssertEqual(layout.firstRow, 3_000)
        XCTAssertTrue(layout.held.isEmpty)
        XCTAssertNil(layout.edge)
    }

    // MARK: The asks

    /// Clause (section 5.5.4): every ask's shape. The first page ends at the
    /// live top and keeps its bottom; an older page adjoins `lo`, asks the 8
    /// held rows at its bottom too and keeps its bottom; a newer page adjoins
    /// `hi`, asks the 8 held rows at its top too and keeps its top; every ask
    /// carries `depthSeen` and the held width.
    func testEveryAsksShape() throws {
        var layout = entered(depth: 3_000)
        let first = try XCTUnwrap(layout.want(visibleTop: 2_950, visibleBottom: 3_040))
        XCTAssertEqual(first, ScrollbackAsk(from: 2_900, count: 100, depth: 3_000, wrap: Self.wrap, keep: .bottom, overlap: 0))
        _ = layout.accept(Self.answer(first), for: first, holds: { _ in true })
        XCTAssertEqual(layout.reserve(visibleTop: 2_901), 100)
        let older = try XCTUnwrap(layout.want(visibleTop: 2_880, visibleBottom: 2_930))
        XCTAssertEqual(older, ScrollbackAsk(from: 2_800, count: 108, depth: 3_000, wrap: Self.wrap, keep: .bottom, overlap: 8))
        _ = layout.accept(Self.answer(older), for: older, holds: { _ in true })
        XCTAssertEqual(layout.lo, 2_800)
        XCTAssertEqual(layout.hi, 3_000)
        // Lines scroll in while he reads: the rows between `hi` and the live
        // rows are reserved, and a view near them asks a newer page.
        layout.picture(Self.picture(depth: 3_150))
        let newer = try XCTUnwrap(layout.want(visibleTop: 3_000, visibleBottom: 3_050))
        XCTAssertEqual(newer, ScrollbackAsk(from: 2_992, count: 108, depth: 3_150, wrap: Self.wrap, keep: .top, overlap: 8))
        _ = layout.accept(Self.answer(newer), for: newer, holds: { _ in true })
        XCTAssertEqual(layout.hi, 3_100)
        let last = try XCTUnwrap(layout.want(visibleTop: 3_090, visibleBottom: 3_160))
        XCTAssertEqual(last, ScrollbackAsk(from: 3_092, count: 58, depth: 3_150, wrap: Self.wrap, keep: .top, overlap: 8))
    }

    /// Clause (D7, D27): no ask reaches past `depthSeen`, however far the view
    /// goes, over a whole history paged from the live top to the oldest line.
    func testNoAskReachesPastDepthSeen() throws {
        var layout = entered(depth: 1_234)
        var asks = 0
        var top = 1_233
        while asks < 100 {
            _ = layout.reserve(visibleTop: top)
            guard let ask = layout.want(visibleTop: top, visibleBottom: top + 60) else {
                if top == 0 { break }
                top = max(0, top - 50)
                continue
            }
            asks += 1
            XCTAssertLessThanOrEqual(ask.from + ask.count, layout.depthSeen, "ask \(asks)")
            XCTAssertLessThanOrEqual(ask.count, PocketScrollbackAnswer.mostRows)
            XCTAssertEqual(ask.depth, layout.depthSeen)
            XCTAssertEqual(layout.accept(Self.answer(ask), for: ask, holds: { _ in true }), .joined(ask.count - ask.overlap))
        }
        XCTAssertEqual(layout.lo, 0, "the whole history was paged")
        XCTAssertEqual(layout.edge, .atOldest)
        XCTAssertEqual(layout.row(at: 0, picture: nil)?.label, "L000001")
        XCTAssertEqual(layout.reserve(visibleTop: 0), 0, "nothing is reserved above the oldest line")
    }

    // MARK: What a page must be (D13)

    private func heldTwoPages() throws -> (ScrollbackLayout, ScrollbackAsk) {
        var layout = entered(depth: 3_000)
        let first = try XCTUnwrap(layout.want(visibleTop: 2_950, visibleBottom: 3_040))
        _ = layout.accept(Self.answer(first), for: first, holds: { _ in true })
        _ = layout.reserve(visibleTop: 2_901)
        let older = try XCTUnwrap(layout.want(visibleTop: 2_880, visibleBottom: 2_930))
        return (layout, older)
    }

    /// Clause (D13): a page whose overlap rows do not read as the held rows
    /// is not joined, and paging stops with the phone's own sentence; nothing
    /// is asked after it until `following`.
    func testAnOverlapThatDoesNotMatchStopsPaging() throws {
        var (layout, older) = try heldTwoPages()
        let lie = Self.page(from: older.from, count: older.count, depth: 3_000) { index in index >= 2_900 ? "X" : Self.label(index) }
        XCTAssertEqual(layout.accept(lie, for: older, holds: { _ in true }), .moved)
        XCTAssertEqual(layout.edge, .moved(Copy.scrollbackMoved))
        XCTAssertNil(layout.row(at: 2_850, picture: nil), "nothing of the page is held")
        XCTAssertNil(layout.want(visibleTop: 2_880, visibleBottom: 2_930), "nothing more is asked")
        XCTAssertEqual(layout.reserve(visibleTop: 2_801), 0, "nothing more is reserved")
        _ = layout.follow()
        XCTAssertNil(layout.edge, "following clears it")
    }

    /// Clause (D13): a smaller depth, another width and another space are
    /// each the index space moving.
    func testASmallerDepthAnotherWidthOrAnotherSpaceMoves() throws {
        for (name, make) in [
            ("a shallower history", { (ask: ScrollbackAsk) in Self.page(from: ask.from, count: ask.count, depth: 2_999) }),
            ("another width", { (ask: ScrollbackAsk) in Self.page(from: ask.from, count: ask.count, depth: 3_000, wrap: 80) }),
            ("another space", { (ask: ScrollbackAsk) in Self.page(from: ask.from, count: ask.count, depth: 3_000, space: "0000000000ff") }),
        ] {
            var (layout, older) = try heldTwoPages()
            XCTAssertEqual(layout.accept(make(older), for: older, holds: { _ in true }), .moved, name)
            XCTAssertEqual(layout.edge, .moved(Copy.scrollbackMoved), name)
        }
        // The first page has no overlap: its depth, width and space alone.
        var layout = entered(depth: 3_000)
        let first = try XCTUnwrap(layout.want(visibleTop: 2_950, visibleBottom: 3_040))
        XCTAssertEqual(layout.accept(Self.page(from: first.from, count: first.count, depth: 3_000, space: "0000000000ff"), for: first, holds: { _ in true }), .moved)
    }

    /// Clause (D7, D8): a page that answers other rows than were asked (more
    /// rows, another first row, rows outside the ask) is not joined.
    func testAPageThatAnswersOtherRowsIsNotJoined() throws {
        var (layout, older) = try heldTwoPages()
        XCTAssertEqual(layout.accept(Self.page(from: older.from, count: older.count + 1, depth: 3_000), for: older, holds: { _ in true }), .moved, "more rows than asked")
        (layout, older) = try heldTwoPages()
        XCTAssertEqual(layout.accept(Self.page(from: older.from + 1, count: older.count, depth: 3_000), for: older, holds: { _ in true }), .moved, "a bottom that is not the one asked")
        (layout, older) = try heldTwoPages()
        // Kept from the bottom past a cap: fewer rows, its bottom the one asked.
        XCTAssertEqual(layout.accept(Self.page(from: older.from + 50, count: older.count - 50, depth: 3_000), for: older, holds: { _ in true }), .joined(50))
        XCTAssertEqual(layout.lo, 2_850)
    }

    /// Clause (section 5.6): main's `moved` stops paging with main's own
    /// sentence; `busy` stops nothing; `ended` and `unreachable` stop paging
    /// and draw no line of their own.
    func testMainsAbsences() throws {
        var (layout, older) = try heldTwoPages()
        XCTAssertEqual(layout.accept(Self.absence(.busy), for: older, holds: { _ in true }), .busy)
        XCTAssertNil(layout.edge)
        XCTAssertNotNil(layout.want(visibleTop: 2_880, visibleBottom: 2_930), "busy: the same page is asked again")
        XCTAssertEqual(layout.accept(Self.absence(.moved, "Main's words."), for: older, holds: { _ in true }), .moved)
        XCTAssertEqual(layout.edge, .moved("Main's words."))
        for why in [PocketScrollbackAbsence.ended, .unreachable] {
            (layout, older) = try heldTwoPages()
            XCTAssertEqual(layout.accept(Self.absence(why), for: older, holds: { _ in true }), .stopped)
            XCTAssertEqual(layout.edge, .stopped)
            XCTAssertNil(layout.want(visibleTop: 2_880, visibleBottom: 2_930))
        }
    }

    /// Clause (D27, §Attack B13): while scrolled, a live picture's numeric
    /// depth raises `depthSeen`; a shallower one (a trim), another space or
    /// another width stops paging; a null depth leaves the live rows where
    /// they were; the alternate screen returns to `following`.
    func testALivePictureWhileScrolled() {
        var layout = entered(depth: 1_000)
        layout.picture(Self.picture(depth: 1_040))
        XCTAssertEqual(layout.depthSeen, 1_040)
        XCTAssertEqual(layout.live, 1_040)
        layout.picture(Self.picture(depth: nil))
        XCTAssertEqual(layout.live, 1_040, "a null depth leaves the live rows where the last number put them")
        XCTAssertNil(layout.edge)
        layout.picture(Self.picture(depth: 940))
        XCTAssertEqual(layout.edge, .moved(Copy.scrollbackMoved), "a trimmed history moves the index space")
        XCTAssertEqual(layout.live, 1_040, "and the live rows stay placed")
        layout = entered(depth: 1_000)
        layout.picture(Self.picture(depth: 1_010, space: "0000000000ff"))
        XCTAssertEqual(layout.edge, .moved(Copy.scrollbackMoved), "another pane")
        layout = entered(depth: 1_000)
        layout.picture(Self.picture(depth: 1_010, cols: 80))
        XCTAssertEqual(layout.edge, .moved(Copy.scrollbackMoved), "another width")
        layout = entered(depth: 1_000)
        layout.picture(Self.picture(depth: nil, alternate: true))
        XCTAssertEqual(layout.mode, .following, "the program covered the history")
    }

    /// Clause (D3): a picture that offers no index space (null, the
    /// alternate screen, an older Mac) does not enter `scrolled`.
    func testNoScrollbackWithoutAnIndexSpace() {
        for picture in [Self.picture(depth: nil), Self.picture(depth: 500, alternate: true), Self.picture(depth: 0)] {
            var layout = ScrollbackLayout()
            layout.picture(picture)
            XCTAssertEqual(layout.reserve(visibleTop: 0), 0)
            XCTAssertEqual(layout.mode, .following)
        }
    }

    // MARK: Reserving and filling (D26)

    /// Clause (D26): rows are reserved one page at a time, only when the
    /// view's top is within one page of `top`, and never below 0.
    func testReservationIsOnePageAtATimeAndNeverBelowZero() {
        var layout = entered(depth: 250)
        XCTAssertEqual(layout.top, 150)
        XCTAssertEqual(layout.reserve(visibleTop: 250), 0, "a view more than a page below top reserves nothing")
        XCTAssertEqual(layout.reserve(visibleTop: 249), 100)
        XCTAssertEqual(layout.top, 50)
        XCTAssertEqual(layout.reserve(visibleTop: 60), 50)
        XCTAssertEqual(layout.top, 0)
        XCTAssertEqual(layout.reserve(visibleTop: 0), 0)
        XCTAssertEqual(layout.top, 0)
    }

    /// Clause (D26): a page FILLS reserved rows; the layout's height and
    /// its first row do not change.
    func testAPageFillsReservedRowsAndMovesNothing() throws {
        var layout = entered(depth: 3_000)
        let rows = layout.rowCount
        let first = layout.firstRow
        XCTAssertNil(layout.row(at: 2_950, picture: nil), "reserved, not held")
        let ask = try XCTUnwrap(layout.want(visibleTop: 2_950, visibleBottom: 3_000))
        _ = layout.accept(Self.answer(ask), for: ask, holds: { _ in true })
        XCTAssertEqual(layout.rowCount, rows)
        XCTAssertEqual(layout.firstRow, first)
        XCTAssertEqual(layout.row(at: 2_950, picture: nil)?.label, "L002951")
    }

    /// Clause (D28): at most 3,000 rows held; the end farther from the view
    /// goes first, back to reserved; nothing laid out moves; and the evicted
    /// rows are asked again, adjoining, when he returns to them.
    func testTheCapEvictsTheFarthestFirst() throws {
        var layout = entered(depth: 6_000)
        var top = 5_999
        while layout.held.count < 3_100 {
            _ = layout.reserve(visibleTop: top)
            let ask = try XCTUnwrap(layout.want(visibleTop: top, visibleBottom: top + 60))
            _ = layout.accept(Self.answer(ask), for: ask, holds: { _ in true })
            top = layout.lo
        }
        let rows = layout.rowCount
        let first = layout.firstRow
        let hi = layout.hi
        let evicted = layout.evict(visibleTop: layout.lo, visibleBottom: layout.lo + 60)
        XCTAssertEqual(layout.held.count, ScrollbackLayout.mostHeld)
        XCTAssertGreaterThan(evicted, 0)
        XCTAssertEqual(layout.hi, hi - evicted, "the bottom end, farther from a view at the top, went")
        XCTAssertNil(layout.row(at: hi - 1, picture: nil), "back to reserved")
        XCTAssertEqual(layout.rowCount, rows)
        XCTAssertEqual(layout.firstRow, first)
        let again = try XCTUnwrap(layout.want(visibleTop: hi - 30, visibleBottom: hi))
        XCTAssertEqual(again.keep, .top)
        XCTAssertEqual(again.from, layout.hi - again.overlap, "asked again, adjoining")
    }

    // MARK: Reading a row back (D31)

    /// Clause (D31): a row is named by its absolute index: a live row is
    /// `H + r`, a held row its own index, and a reserved row is nothing; a
    /// reservation above changes none of them.
    func testARowIsNamedByItsAbsoluteIndex() throws {
        var layout = entered(depth: 3_000)
        let picture = Self.picture(depth: 3_000)
        let ask = try XCTUnwrap(layout.want(visibleTop: 2_950, visibleBottom: 3_000))
        _ = layout.accept(Self.answer(ask), for: ask, holds: { _ in true })
        XCTAssertEqual(layout.liveIndex(3), 3_003)
        XCTAssertEqual(layout.row(at: 3_003, picture: picture)?.label, "live-3")
        XCTAssertEqual(layout.row(at: 2_999, picture: picture)?.label, "L003000")
        XCTAssertNil(layout.row(at: 2_899, picture: picture), "reserved")
        XCTAssertNil(layout.row(at: 3_040, picture: picture), "past the live rows")
        _ = layout.reserve(visibleTop: 2_901)
        XCTAssertEqual(layout.row(at: 3_003, picture: picture)?.label, "live-3", "a reservation moves no index")
        XCTAssertEqual(layout.row(at: 2_999, picture: picture)?.label, "L003000")
    }

    // MARK: The model: one page in flight, its gap, its back-off

    /// The test's own clock, which only the test moves.
    final class FakeClock: @unchecked Sendable {
        private let lock = NSLock()
        private var instant = ContinuousClock.now

        var now: ContinuousClock.Instant { lock.withLock { instant } }

        func advance(by duration: Duration) {
            lock.withLock { instant = instant.advanced(by: duration) }
        }
    }

    private let clock = FakeClock()

    /// A model on the scripted door, whose clock is the test's own: a wait
    /// ends once the test has moved the clock past its deadline.
    private func model(_ door: ScriptedScreenDoor) -> ScrollbackModel {
        let clock = clock
        return ScrollbackModel(
            door: door,
            holds: { _ in true },
            now: { clock.now },
            sleep: { deadline in
                while !Task.isCancelled, clock.now < deadline {
                    try? await Task.sleep(nanoseconds: 5_000_000)
                }
            }
        )
    }

    private func settle() async {
        try? await Task.sleep(nanoseconds: 40_000_000)
        for _ in 0..<5 { await Task.yield() }
    }

    /// Clause (D27): one page in flight per Terminal, and the next no sooner
    /// than `minGap` (at least 0.25 s) after the last started.
    func testOnePageInFlightAndAQuarterOfASecondApart() async throws {
        XCTAssertGreaterThanOrEqual(ScrollbackModel.minGap, .milliseconds(250))
        let door = ScriptedScreenDoor()
        let history = model(door)
        history.picture(Self.picture(depth: 3_000))
        history.viewed(top: 2_990, bottom: 3_040)
        await settle()
        XCTAssertEqual(history.mode, .scrolled)
        XCTAssertEqual(door.pageAsks.count, 1)
        XCTAssertEqual(door.pageAsks.first, ScriptedScreenDoor.PageAsked(from: 2_900, count: 100, depth: 3_000, wrap: Self.wrap, keep: .bottom))
        history.viewed(top: 2_900, bottom: 2_950)
        await settle()
        XCTAssertEqual(door.pageAsks.count, 1, "a second page while one is in flight")
        door.answerPage(.success(Self.page(from: 2_900, count: 100, depth: 3_000)))
        await settle()
        XCTAssertEqual(door.pageAsks.count, 1, "the next page inside the gap")
        clock.advance(by: .milliseconds(240))
        await settle()
        XCTAssertEqual(door.pageAsks.count, 1, "the next page inside the gap")
        clock.advance(by: .milliseconds(10))
        await settle()
        XCTAssertEqual(door.pageAsks.count, 2, "the next page after the gap")
        XCTAssertEqual(door.pageAsks.last?.keep, .bottom)
        XCTAssertEqual(door.pageAsks.last?.from, 2_800)
    }

    /// Clause (section 5.6): `busy` and a failed read ask the same page again
    /// after a wait, drawing nothing; a refused page stops paging with
    /// `DoorWords.scrollbackSentence`.
    func testBusyAndFailuresBackOffAndARefusalStops() async throws {
        XCTAssertEqual(ScrollbackModel.retryWaits, [.seconds(1), .seconds(2), .seconds(4)])
        let door = ScriptedScreenDoor()
        let history = model(door)
        history.picture(Self.picture(depth: 3_000))
        history.viewed(top: 2_990, bottom: 3_040)
        await settle()
        door.answerPage(.success(Self.absence(.busy)))
        await settle()
        XCTAssertNil(history.line, "busy draws nothing")
        clock.advance(by: .milliseconds(900))
        await settle()
        XCTAssertEqual(door.pageAsks.count, 1, "asked again before its 1 s")
        clock.advance(by: .milliseconds(100))
        await settle()
        XCTAssertEqual(door.pageAsks.count, 2)
        XCTAssertEqual(door.pageAsks[0], door.pageAsks[1], "the same page asked again")
        door.answerPage(.failure(.timedOut))
        await settle()
        XCTAssertNil(history.line, "a failed read draws nothing")
        clock.advance(by: .milliseconds(1_900))
        await settle()
        XCTAssertEqual(door.pageAsks.count, 2, "asked again before its 2 s")
        clock.advance(by: .milliseconds(100))
        await settle()
        XCTAssertEqual(door.pageAsks.count, 3)
        door.answerPage(.failure(.refused))
        await settle()
        XCTAssertEqual(history.line, DoorWords.scrollbackSentence(for: .refused))
        clock.advance(by: .seconds(8))
        history.viewed(top: 2_900, bottom: 2_950)
        await settle()
        XCTAssertEqual(door.pageAsks.count, 3, "nothing more after a refusal")
    }

    /// Clause (D27): a key he sends returns the Terminal to `following`,
    /// dropping every held row and the page in flight.
    func testAKeySentReturnsToFollowing() async throws {
        let door = ScriptedScreenDoor()
        let history = model(door)
        let picture = Self.picture(depth: 3_000)
        history.picture(picture)
        history.viewed(top: 2_990, bottom: 3_040)
        await settle()
        XCTAssertEqual(history.mode, .scrolled)
        let keys = ScreenKeySender(door: door, picture: { picture })
        keys.onSend = { [weak history] in history?.follow() }
        keys.send([.text("a")])
        XCTAssertEqual(history.mode, .following)
        XCTAssertTrue(history.layout.held.isEmpty)
        await settle()
        XCTAssertEqual(door.pagesCancelled, 1, "the page in flight is dropped")
    }

    /// Clause (D31, §Attack B11): a selection's points are absolute indices,
    /// so a page reserved above moves none of them; Copy waits while any
    /// selected row is reserved and not yet fetched, and is drawn once it is;
    /// nothing is evicted while selecting, and pages still fill.
    func testASelectionByAbsoluteIndexAndCopyThatWaits() async throws {
        let door = ScriptedScreenDoor()
        let history = model(door)
        let picture = Self.picture(depth: 3_000)
        history.picture(picture)
        history.viewed(top: 2_990, bottom: 3_040)
        await settle()
        let range = ScreenSelectionRange(start: ScreenPoint(row: 2_995, column: 0), end: ScreenPoint(row: 3_001, column: 3))
        XCTAssertFalse(history.drawn(range, picture: picture), "rows 2,995 to 2,999 are reserved: no Copy")
        history.selecting = true
        door.answerPage(.success(Self.page(from: 2_900, count: 100, depth: 3_000)))
        await settle()
        XCTAssertTrue(history.drawn(range, picture: picture), "the page filled them while selecting")
        let text = ScreenSelecting.text(range, columns: Self.wrap) { history.row(at: $0, picture: picture) }
        XCTAssertEqual(text.components(separatedBy: "\n"), ["L002996", "L002997", "L002998", "L002999", "L003000", "live-0", "live"])
        history.viewed(top: 2_900, bottom: 2_950)
        XCTAssertEqual(history.layout.top, 2_800, "a page reserved above")
        XCTAssertEqual(ScreenSelecting.text(range, columns: Self.wrap) { history.row(at: $0, picture: picture) }, text, "and the selection still names the same rows")
        history.selecting = false
    }

    /// Clause (D31): nothing is evicted while a selection is held.
    func testNothingIsEvictedWhileSelecting() async throws {
        let door = ScriptedScreenDoor()
        let history = model(door)
        history.picture(Self.picture(depth: 6_000))
        history.selecting = true
        var top = 5_999
        var rounds = 0
        while history.layout.held.count < 3_050 {
            rounds += 1
            guard rounds < 200 else { return XCTFail("the history stopped growing at \(history.layout.held.count) rows") }
            history.viewed(top: top, bottom: top + 60)
            await settle()
            guard let asked = door.pageAsks.last, door.pagesWaiting > 0 else {
                clock.advance(by: .milliseconds(300))
                await settle()
                continue
            }
            door.answerPage(.success(Self.page(from: asked.from, count: asked.count, depth: asked.depth)))
            await settle()
            clock.advance(by: .milliseconds(300))
            top = history.layout.lo
        }
        XCTAssertGreaterThan(history.layout.held.count, ScrollbackLayout.mostHeld, "nothing evicted while selecting")
        history.selecting = false
        XCTAssertEqual(history.layout.held.count, ScrollbackLayout.mostHeld, "the cap holds again once it lets go")
    }

    // MARK: Nothing kept, and the design credited

    /// Clause (D41, section 12): nothing of the history is persisted, and the
    /// model's file credits Paseo's design and copies none of its code.
    func testNothingIsPersistedAndTheDesignIsCredited() throws {
        for file in ["Screens/ScreenScrollback.swift", "Screens/ScreenScroller.swift"] {
            let source = try StyleSource.text("ios/Tortie/" + file)
            for name in ["UserDefaults", "@AppStorage", "@SceneStorage", "FileManager", "SecItemAdd", "write(to:", "NSKeyedArchiver", "print("] {
                XCTAssertFalse(source.contains(name), "\(file) names \(name)")
            }
            XCTAssertTrue(source.contains("2f0cb2f54be5742d6fc7e9b85ba39808ac22ad93"), file)
            XCTAssertTrue(source.contains("Apache-2.0"), file)
            XCTAssertTrue(source.contains("no Paseo code is copied"), file)
        }
    }

    /// Clause (D28): the constants, each declared once.
    func testTheConstants() {
        XCTAssertEqual(ScrollbackLayout.pageRows, 100)
        XCTAssertEqual(ScrollbackLayout.overlapRows, 8)
        XCTAssertEqual(ScrollbackLayout.mostHeld, 3_000)
        XCTAssertLessThanOrEqual(ScrollbackLayout.pageRows + ScrollbackLayout.overlapRows, PocketScrollbackAnswer.mostRows)
    }
}
