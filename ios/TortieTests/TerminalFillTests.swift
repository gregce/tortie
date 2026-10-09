import Foundation
import XCTest
@testable import Tortie

/// The Terminal that fills the phone (Phase 337.3, build/p3373/SPEC.md D1 to
/// D11, section 5.1 and section 7.2's history list). His item 1, 2026-10-07:
/// "i'd rather more of the scrollback (if available) in vertical mode could
/// be shown like this [the screen filled with earlier output, the live rows
/// at the bottom]". Following holds the history that fills the view above the
/// live rows, reserved in whole pages inside the first layout pass; the lines
/// that scroll off the live screen are carried at once and checked by a page
/// at most once a second; the alternate screen, a trim, another width or
/// another pane drops what following holds, with no line; a refused fill is
/// not asked again until the picture changes, and a 404 turns it off while
/// scrolled still pages; a drag off the bottom enters scrolled with no row
/// added; back to live keeps a contiguous fill. The door and the clock are
/// scripts and nothing reaches a network. Each test names the clause it holds
/// and fails when that clause is taken out of Screens/ScreenScrollback.swift.
@MainActor
final class TerminalFillTests: XCTestCase {
    private typealias Base = ScrollbackModelTests

    /// The live screen's rows, and the rows above them an upright view holds
    /// at the 337.1 build's geometry (section 14 M1: 645 pt over 6.67 pt is
    /// 97 rows, less 40).
    static let rows = 40
    static let fill = 57
    static let otherSpace = "0000000000ff"

    // MARK: Pictures and layouts

    /// A live picture whose rows are tmux's own numbered lines: live row `r`
    /// at depth `D` is line `D + r`, labelled as the page that brings it would
    /// label it, unless `text` says otherwise. Row `r` is drawn in style
    /// `r % 2`, so a carried row's style is read back too.
    static func numbered(
        depth: Int?, rows: Int = rows, cols: Int = Base.wrap, space: String? = Base.space, alternate: Bool = false,
        revision: String = "0123456789ab", text: ((Int) -> String)? = nil
    ) -> ScreenPicture {
        let lines: [[[String: Any]]] = (0..<rows).map { r in
            let words = text?(r) ?? Base.label((depth ?? 0) + r)
            return [["text": words, "style": r % 2, "cells": words.count]]
        }
        return ScreenSample.picture(
            revision: revision, lines: lines, cols: cols, alternate: alternate, depth: depth, space: depth == nil ? nil : space
        )
    }

    /// A layout following a picture at `depth`, its fill reserved, no page
    /// asked yet.
    private func filled(depth: Int, fill: Int = fill) -> ScrollbackLayout {
        var layout = ScrollbackLayout()
        layout.picture(Self.numbered(depth: depth), holds: { _ in true })
        _ = layout.reserve(visibleTop: depth, fill: fill)
        return layout
    }

    /// The view's first and last rows while it sits at the live bottom: `fill`
    /// rows of history above the live rows.
    private func atBottom(_ layout: ScrollbackLayout, fill: Int = fill) -> (top: Int, bottom: Int) {
        (max(0, layout.live - fill), layout.live + layout.liveRows)
    }

    /// A filled layout whose first page has landed whole: `[top, live)` held
    /// and checked.
    private func filledAndPaged(depth: Int) throws -> ScrollbackLayout {
        var layout = filled(depth: depth)
        let view = atBottom(layout)
        let ask = try XCTUnwrap(layout.want(visibleTop: view.top, visibleBottom: view.bottom))
        XCTAssertEqual(layout.accept(Base.answer(ask), for: ask, holds: { _ in true }), .joined(ask.count))
        return layout
    }

    // MARK: The fill (D1 to D3, D7)

    /// Clause (D1, D2, D3): a 40-row picture at depth 3,000 with 57 rows of
    /// fill reserves ONE whole page, `top` 2,900, so the layout starts there
    /// while following and the live rows sit 100 rows down; the one ask is
    /// that page, keeping its bottom, sharing nothing; once it lands every row
    /// the view holds above the live rows is tmux's line, and nothing more is
    /// asked.
    func testTheFillReservesOneWholePageAndAsksItOnce() throws {
        var layout = ScrollbackLayout()
        layout.picture(Self.numbered(depth: 3_000), holds: { _ in true })
        XCTAssertEqual(layout.firstRow, 3_000, "before the layout pass, the live rows alone")
        XCTAssertEqual(layout.reserve(visibleTop: 3_000, fill: Self.fill), 100)
        XCTAssertEqual(layout.mode, .following)
        XCTAssertEqual(layout.top, 2_900)
        XCTAssertEqual(layout.firstRow, 2_900, "a held index space lays out from top while following too")
        XCTAssertEqual(layout.liveRow, 100)
        XCTAssertEqual(layout.rowCount, 140)
        let view = atBottom(layout)
        let ask = try XCTUnwrap(layout.want(visibleTop: view.top, visibleBottom: view.bottom))
        XCTAssertEqual(ask, ScrollbackAsk(from: 2_900, count: 100, depth: 3_000, wrap: Base.wrap, keep: .bottom, overlap: 0))
        XCTAssertFalse(ask.checks)
        XCTAssertEqual(layout.accept(Base.answer(ask), for: ask, holds: { _ in true }), .joined(100))
        XCTAssertEqual((2_943..<3_000).map { layout.row(at: $0, picture: nil)?.label }, (2_943..<3_000).map(Base.label))
        XCTAssertNil(layout.want(visibleTop: view.top, visibleBottom: view.bottom), "one ask: the fill is whole")
        XCTAssertEqual(layout.rowCount, 140, "the page moved nothing")
    }

    /// Clause (D2, D4): a history shorter than the fill is reserved down to
    /// index 0 and no further, asked in one page of its own rows, and reaches
    /// the oldest line.
    func testAShortHistoryIsFilledDownToTheOldestLine() throws {
        var layout = ScrollbackLayout()
        layout.picture(Self.numbered(depth: 30), holds: { _ in true })
        XCTAssertEqual(layout.reserve(visibleTop: 30, fill: Self.fill), 30, "never below index 0")
        XCTAssertEqual(layout.top, 0)
        let ask = try XCTUnwrap(layout.want(visibleTop: 0, visibleBottom: 97))
        XCTAssertEqual(ask, ScrollbackAsk(from: 0, count: 30, depth: 30, wrap: Base.wrap, keep: .bottom, overlap: 0))
        XCTAssertEqual(layout.accept(Base.answer(ask), for: ask, holds: { _ in true }), .joined(30))
        XCTAssertEqual(layout.edge, .atOldest)
        XCTAssertNil(layout.want(visibleTop: 0, visibleBottom: 97))
    }

    /// Clause (D7): at depth 0 the index space is held (AT ANY DEPTH), nothing
    /// is reserved or asked, and the live rows sit at the top as today; the
    /// very first line that scrolls off is carried, so nothing blinks.
    func testAtDepthZeroTheSpaceIsHeldAndTheFirstLineIsCarried() {
        var layout = ScrollbackLayout()
        layout.picture(Self.numbered(depth: 0), holds: { _ in true })
        XCTAssertEqual(layout.reserve(visibleTop: 0, fill: Self.fill), 0)
        XCTAssertEqual(layout.space, Base.space, "held at depth 0")
        XCTAssertEqual(layout.liveRow, 0, "the live rows at the top, as today")
        XCTAssertNil(layout.want(visibleTop: 0, visibleBottom: 97), "nothing to ask")
        layout.picture(Self.numbered(depth: 1), holds: { _ in true })
        XCTAssertEqual(layout.held[0]?.carried, true)
        XCTAssertEqual(layout.row(at: 0, picture: nil)?.label, Base.label(0))
        XCTAssertEqual(layout.liveRow, 1)
    }

    /// Clause (D2): a fill that shrinks reserves nothing and `top` never moves
    /// back toward the live top; a fill past one page reserves another, whole;
    /// none reaches below index 0.
    func testAFillThatShrinksReservesNothingAndTopNeverMovesBack() {
        var layout = filled(depth: 3_000)
        XCTAssertEqual(layout.top, 2_900)
        XCTAssertEqual(layout.reserve(visibleTop: 3_000, fill: 10), 0)
        XCTAssertEqual(layout.reserve(visibleTop: 3_000, fill: 0), 0)
        XCTAssertEqual(layout.top, 2_900, "never back toward the live top")
        XCTAssertEqual(layout.reserve(visibleTop: 3_000, fill: 101), 100, "a fill past one page: a second, whole")
        XCTAssertEqual(layout.top, 2_800)
        XCTAssertEqual(layout.reserve(visibleTop: 3_000, fill: Self.fill), 0)
        XCTAssertEqual(layout.top, 2_800)
        var short = filled(depth: 150, fill: 500)
        XCTAssertEqual(short.top, 0)
        XCTAssertEqual(short.reserve(visibleTop: 150, fill: 5_000), 0)
        XCTAssertEqual(short.top, 0)
    }

    /// Clause (D2): a view that holds more than a page above the live rows
    /// (a session wider than about 175 columns) is filled by its pages one
    /// after another, the second adjoining the first by its checked rows.
    func testAFillPastAPageIsFilledPageByPage() throws {
        var layout = filled(depth: 3_000, fill: 150)
        XCTAssertEqual(layout.top, 2_800)
        let view = atBottom(layout, fill: 150)
        let first = try XCTUnwrap(layout.want(visibleTop: view.top, visibleBottom: view.bottom))
        XCTAssertEqual(first, ScrollbackAsk(from: 2_900, count: 100, depth: 3_000, wrap: Base.wrap, keep: .bottom, overlap: 0))
        _ = layout.accept(Base.answer(first), for: first, holds: { _ in true })
        let second = try XCTUnwrap(layout.want(visibleTop: view.top, visibleBottom: view.bottom))
        XCTAssertEqual(second, ScrollbackAsk(from: 2_800, count: 108, depth: 3_000, wrap: Base.wrap, keep: .bottom, overlap: 8))
        _ = layout.accept(Base.answer(second), for: second, holds: { _ in true })
        XCTAssertNil(layout.want(visibleTop: view.top, visibleBottom: view.bottom))
        XCTAssertEqual(layout.held.count, 200)
    }

    // MARK: Carrying (D5)

    /// Clause (D5): 1 to 40 lines scrolling off a 40-row screen are carried
    /// from the LAST STEADY picture: its own top rows, at `[live, depth)`, with
    /// its styles, each marked carried, `hi` the new live top and `checked`
    /// where the pages left it.
    func testCarryingOneToFortyRowsFromTheLastSteadyPicture() throws {
        for k in 1...Self.rows {
            var layout = try filledAndPaged(depth: 3_000)
            let last = Self.numbered(depth: 3_000, text: { "before-\($0)" })
            layout.picture(last, holds: { _ in true })
            layout.picture(Self.numbered(depth: 3_000 + k), holds: { _ in true })
            XCTAssertEqual(layout.hi, 3_000 + k, "k \(k)")
            XCTAssertEqual(layout.live, 3_000 + k, "k \(k)")
            XCTAssertEqual(layout.checked, 3_000, "k \(k): carried rows are not checked")
            XCTAssertEqual(layout.liveRow, 100 + k, "k \(k)")
            for i in 0..<k {
                let held = try XCTUnwrap(layout.held[3_000 + i], "k \(k), row \(i)")
                XCTAssertTrue(held.carried, "k \(k), row \(i)")
                XCTAssertEqual(held.row.label, "before-\(i)", "k \(k), row \(i): the last steady picture's own row")
                XCTAssertEqual(held.row.index, 3_000 + i)
                XCTAssertEqual(held.styles, last.styles)
                XCTAssertEqual(held.row.runs.first?.styleIndex, i % 2)
            }
            XCTAssertNil(layout.held[3_000 + k], "k \(k)")
        }
    }

    /// Clause (D5 with the Phase 337.3 verify's fix): 41 lines past a 40-row
    /// screen. Following carries the last steady picture's 40 rows, every one
    /// it showed, and leaves the 41st, which no picture showed, as a HOLE
    /// under `hi`, which moves to the new live top; nothing held is dropped,
    /// nothing is said, and the picture is counted. The one page that fills
    /// the hole and checks the rows carried goes at the reserved pace (no
    /// check's second), adjoining the checked rows, and once it lands every
    /// row the view holds above the live rows is tmux's line.
    func testAFloodPastTheScreensRowsCarriesWhatItShowedAndLeavesAHole() throws {
        var layout = try filledAndPaged(depth: 3_000)
        let before = layout.held
        XCTAssertEqual(layout.outruns, 0)
        layout.picture(Self.numbered(depth: 3_041), holds: { _ in true })
        XCTAssertEqual(layout.space, Base.space, "nothing dropped")
        XCTAssertEqual(layout.outruns, 1, "counted: a line no picture showed")
        XCTAssertNil(layout.edge, "no line")
        XCTAssertNil(layout.refusedAt, "no refusal")
        XCTAssertTrue(before.allSatisfy { layout.held[$0.key] == $0.value }, "every row drawn before is drawn still")
        XCTAssertEqual((3_000..<3_040).map { layout.held[$0]?.carried }, Array(repeating: true, count: 40))
        XCTAssertEqual((3_000..<3_040).map { layout.row(at: $0, picture: nil)?.label }, (3_000..<3_040).map(Base.label))
        XCTAssertNil(layout.held[3_040], "the line no picture showed is a hole")
        XCTAssertEqual(layout.hi, 3_041, "hi at the live top, so the next picture carries again")
        XCTAssertEqual(layout.live, 3_041)
        XCTAssertEqual(layout.checked, 3_000)
        XCTAssertEqual(layout.liveRow, 141, "nothing above the live rows taken away")
        let view = atBottom(layout)
        let ask = try XCTUnwrap(layout.want(visibleTop: view.top, visibleBottom: view.bottom))
        XCTAssertEqual(ask, ScrollbackAsk(from: 2_992, count: 49, depth: 3_041, wrap: Base.wrap, keep: .top, overlap: 8, checks: false), "one page, at the reserved pace: a hole is in it")
        XCTAssertEqual(layout.accept(Base.answer(ask), for: ask, holds: { _ in true }), .joined(41))
        for index in view.top..<3_041 {
            XCTAssertEqual(layout.row(at: index, picture: nil)?.label, Base.label(index), "row \(index)")
        }
        XCTAssertEqual(layout.checked, 3_041)
        XCTAssertNil(layout.want(visibleTop: view.top, visibleBottom: view.bottom), "filled: nothing more asked")
    }

    /// Clause (D5 with the Phase 337.3 verify's fix): a hole under the live
    /// top, following, never stops carrying: the next picture's lines are
    /// carried beside it at once, the hole stays the ground until a page
    /// brings it, and every row drawn before either picture is drawn still.
    func testAHoleUnderTheLiveTopKeepsCarryingBesideIt() throws {
        var layout = try filledAndPaged(depth: 3_000)
        let before = layout.held
        layout.picture(Self.numbered(depth: 3_000, text: { "first-\($0)" }), holds: { _ in true })
        layout.picture(Self.numbered(depth: 3_050, text: { "second-\($0)" }), holds: { _ in true })
        XCTAssertEqual(layout.space, Base.space)
        XCTAssertEqual((3_000..<3_040).map { layout.row(at: $0, picture: nil)?.label }, (0..<40).map { "first-\($0)" })
        XCTAssertTrue((3_040..<3_050).allSatisfy { layout.held[$0] == nil }, "ten lines no picture showed")
        layout.picture(Self.numbered(depth: 3_052), holds: { _ in true })
        XCTAssertEqual(layout.hi, 3_052)
        XCTAssertEqual(layout.live, 3_052)
        XCTAssertEqual(layout.row(at: 3_050, picture: nil)?.label, "second-0", "carried beside the hole")
        XCTAssertEqual(layout.row(at: 3_051, picture: nil)?.label, "second-1")
        XCTAssertTrue((3_040..<3_050).allSatisfy { layout.held[$0] == nil }, "the hole waits for its page")
        XCTAssertTrue(before.allSatisfy { layout.held[$0.key] == $0.value }, "nothing drawn was taken away")
        XCTAssertEqual(layout.outruns, 1, "the picture that carried every line it brought is no outrun")
    }

    /// Clause (D5 in scrolled, 337.1's walk kept; the verify's nit): with a
    /// gap under `hi`, scrolled carries nothing, not even a picture whose
    /// lines are fewer than its rows, so the held rows stay exactly
    /// `[lo, hi)` and the gap is left to pages that adjoin the checked rows.
    func testScrolledCarriesNothingBesideAGapUnderHi() throws {
        var layout = try filledAndPaged(depth: 3_000)
        layout.scroll()
        layout.picture(Self.numbered(depth: 3_050), holds: { _ in true })
        XCTAssertEqual(layout.hi, 3_000, "fifty lines past forty rows: the gap stays under hi")
        layout.picture(Self.numbered(depth: 3_053), holds: { _ in true })
        XCTAssertEqual(layout.hi, 3_000, "three lines, fewer than its rows: no carry beside the gap")
        XCTAssertEqual(layout.lo, 2_900)
        XCTAssertEqual(layout.held.count, layout.hi - layout.lo, "held is exactly [lo, hi)")
        XCTAssertTrue((layout.lo..<layout.hi).allSatisfy { layout.held[$0] != nil })
        XCTAssertTrue((3_000..<3_053).allSatisfy { layout.held[$0] == nil })
        XCTAssertEqual(layout.live, 3_053)
        XCTAssertEqual(layout.outruns, 0, "scrolled counts nothing")
        XCTAssertTrue(layout.held.values.allSatisfy { !$0.carried })
    }

    /// Clause (D5, his rule that a page the picture outran is carried or read
    /// again, never dropped to blank): over 300 pictures following, each
    /// scrolling 1 to 120 lines (many past the screen's 40), with no page
    /// answered, every row held before a picture is held after it, `hi` is
    /// the live top after every one, the holes are exactly the lines no
    /// picture showed, and every held row reads tmux's line at its index.
    func testNothingDrawnIsTakenAwayWhileFollowing() throws {
        var layout = try filledAndPaged(depth: 3_000)
        var generator = SplitMix(seed: 0x3373_0f1c)
        var depth = 3_000
        var unseen = Set<Int>()
        var outruns = 0
        for step in 0..<300 {
            let before = layout.held
            let k = Int.random(in: 1...120, using: &generator)
            if k > Self.rows {
                unseen.formUnion((depth + Self.rows)..<(depth + k))
                outruns += 1
            }
            depth += k
            layout.picture(Self.numbered(depth: depth), holds: { _ in true })
            XCTAssertTrue(before.allSatisfy { layout.held[$0.key] == $0.value }, "step \(step): a drawn row was taken away")
            XCTAssertEqual(layout.hi, depth, "step \(step)")
            XCTAssertEqual(layout.live, depth, "step \(step)")
            XCTAssertEqual(layout.outruns, outruns, "step \(step)")
            if layout.held.count > ScrollbackLayout.mostHeld { break }
        }
        let holes = Set((layout.checked..<layout.hi).filter { layout.held[$0] == nil })
        XCTAssertEqual(holes, unseen.filter { $0 >= layout.checked }, "the holes are the lines no picture showed")
        XCTAssertTrue(layout.held.allSatisfy { $0.value.row.label == Base.label($0.key) }, "every held row tmux's line")
        XCTAssertGreaterThan(outruns, 20, "pictures past the screen's rows were driven")
    }

    /// Clause (D14): scrolled keeps 337.1's walk. A flood while scrolled back
    /// reserves the new rows under the held ones and pages adjoin the checked
    /// rows; nothing is dropped, because what he is reading must not move.
    func testAFloodWhileScrolledReservesAndWalks() throws {
        var layout = try filledAndPaged(depth: 3_000)
        layout.scroll()
        XCTAssertEqual(layout.mode, .scrolled)
        layout.picture(Self.numbered(depth: 3_041), holds: { _ in true })
        XCTAssertNotNil(layout.space, "scrolled drops nothing")
        XCTAssertEqual(layout.hi, 3_000)
        XCTAssertEqual(layout.held.count, 100)
        XCTAssertEqual(layout.live, 3_041)
        XCTAssertNil(layout.edge)
        XCTAssertEqual(layout.outruns, 0, "scrolled counts no outrun: nothing is dropped")
        let ask = try XCTUnwrap(layout.want(visibleTop: 2_950, visibleBottom: 3_081))
        XCTAssertEqual(ask, ScrollbackAsk(from: 2_992, count: 49, depth: 3_041, wrap: Base.wrap, keep: .top, overlap: 8, checks: false))
    }

    /// Clause (D5, D7): a picture in another pane or at another width carries
    /// nothing: following drops what it held instead.
    func testNoCarryingFromAnotherSpaceOrWidth() throws {
        for (name, next) in [
            ("another space", Self.numbered(depth: 3_003, space: Self.otherSpace)),
            ("another width", Self.numbered(depth: 3_003, cols: 80)),
        ] {
            var layout = try filledAndPaged(depth: 3_000)
            layout.picture(next, holds: { _ in true })
            XCTAssertNil(layout.row(at: 3_000, picture: nil), name)
            XCTAssertTrue(layout.held.isEmpty, name)
            XCTAssertNil(layout.space, name)
        }
    }

    /// Clause (D5, section 5.6): an unsteady read moves nothing, and the lines
    /// that scrolled off across it are carried from the last STEADY picture.
    func testCarryingAcrossAnUnsteadyPictureIsFromTheLastSteadyOne() throws {
        var layout = try filledAndPaged(depth: 3_000)
        layout.picture(Self.numbered(depth: 3_000, text: { "steady-\($0)" }), holds: { _ in true })
        layout.picture(Self.numbered(depth: nil, text: { "unsteady-\($0)" }), holds: { _ in true })
        XCTAssertEqual(layout.live, 3_000, "an unsteady read leaves the live rows where the last number put them")
        XCTAssertEqual(layout.lastSteady?.rows.first?.label, "steady-0")
        layout.picture(Self.numbered(depth: 3_003), holds: { _ in true })
        XCTAssertEqual((3_000..<3_003).map { layout.row(at: $0, picture: nil)?.label }, ["steady-0", "steady-1", "steady-2"])
    }

    /// Clause (section 5.1, the first page, with the Phase 337.3 verify's
    /// fix): with no page landed yet, a flood leaves the screen's 40 rows
    /// carried and the rest holes, and the first page is the rows just above
    /// the live screen wherever the live top has moved to (the live top's
    /// page, sharing nothing), so the rows he sees are asked first, at once.
    /// Joined, it drops the rows under it, all out of view, and its rows are
    /// the checked ones.
    func testWithNothingHeldTheFirstPageIsJustAboveTheLiveScreen() throws {
        var layout = filled(depth: 3_000)
        layout.picture(Self.numbered(depth: 3_500), holds: { _ in true })
        XCTAssertEqual(layout.space, Base.space, "nothing dropped")
        XCTAssertEqual(layout.outruns, 1)
        XCTAssertEqual(layout.held.count, 40, "the screen's rows carried")
        XCTAssertEqual(layout.hi, 3_500)
        let view = atBottom(layout)
        let ask = try XCTUnwrap(layout.want(visibleTop: view.top, visibleBottom: view.bottom))
        XCTAssertEqual(ask, ScrollbackAsk(from: 3_400, count: 100, depth: 3_500, wrap: Base.wrap, keep: .bottom, overlap: 0, checks: false))
        XCTAssertEqual(layout.accept(Base.answer(ask), for: ask, holds: { _ in true }), .joined(100))
        XCTAssertEqual(layout.lo, 3_400, "the rows under it, out of view, back to reserved")
        XCTAssertEqual(layout.checked, 3_500)
        XCTAssertEqual(layout.hi, 3_500)
        XCTAssertEqual(layout.held.count, 100)
        XCTAssertNil(layout.held[3_000], "a carried row out of view went with them")
        for index in view.top..<3_500 {
            XCTAssertEqual(layout.row(at: index, picture: nil)?.label, Base.label(index), "row \(index)")
        }
        XCTAssertNil(layout.want(visibleTop: view.top, visibleBottom: view.bottom), "filled: nothing more asked")
    }

    // MARK: Anchors and checks (D5, D6)

    /// Clause (D5): a carried row is NEVER an overlap anchor: a page whose
    /// shared rows match carried rows, and no checked one, is refused, at
    /// either edge; the layout's own asks share checked rows alone.
    func testACarriedRowIsNeverAnAnchor() throws {
        var newer = try filledAndPaged(depth: 3_000)
        newer.picture(Self.numbered(depth: 3_003), holds: { _ in true })
        XCTAssertEqual(newer.held[3_000]?.carried, true)
        let onCarried = ScrollbackAsk(from: 3_000, count: 3, depth: 3_003, wrap: Base.wrap, keep: .top, overlap: 3)
        XCTAssertEqual(newer.accept(Base.answer(onCarried), for: onCarried, holds: { _ in true }), .moved, "its overlap matched carried rows only")
        var older = filled(depth: 3_000)
        older.picture(Self.numbered(depth: 3_003), holds: { _ in true })
        let view = atBottom(older)
        let own = try XCTUnwrap(older.want(visibleTop: view.top, visibleBottom: view.bottom))
        XCTAssertEqual(own, ScrollbackAsk(from: 2_900, count: 100, depth: 3_003, wrap: Base.wrap, keep: .bottom, overlap: 0), "nothing checked: it shares nothing")
        let bottomOnCarried = ScrollbackAsk(from: 2_900, count: 103, depth: 3_003, wrap: Base.wrap, keep: .bottom, overlap: 3)
        XCTAssertEqual(older.accept(Base.answer(bottomOnCarried), for: bottomOnCarried, holds: { _ in true }), .moved)
    }

    /// Clause (D6): carried rows in view are checked by a newer page that
    /// adjoins the CHECKED rows, shares 8 of them, and is marked a check; none
    /// is asked while no carried row is in view; the page replaces every
    /// carried row it covers, one the agent redrew included (the page is the
    /// truth), and raises `checked`.
    func testACheckIsAskedOnlyForCarriedRowsInViewAndReplacesThem() throws {
        var layout = try filledAndPaged(depth: 3_000)
        layout.picture(Self.numbered(depth: 3_000, text: { $0 == 1 ? "redrawn-1" : Base.label(3_000 + $0) }), holds: { _ in true })
        layout.picture(Self.numbered(depth: 3_003), holds: { _ in true })
        XCTAssertEqual(layout.row(at: 3_001, picture: nil)?.label, "redrawn-1")
        let view = atBottom(layout)
        let ask = try XCTUnwrap(layout.want(visibleTop: view.top, visibleBottom: view.bottom))
        XCTAssertEqual(ask, ScrollbackAsk(from: 2_992, count: 11, depth: 3_003, wrap: Base.wrap, keep: .top, overlap: 8, checks: true))
        XCTAssertNil(layout.want(visibleTop: 2_900, visibleBottom: 2_990), "no check while no carried row is in view")
        XCTAssertEqual(layout.accept(Base.answer(ask), for: ask, holds: { _ in true }), .joined(3))
        XCTAssertEqual((3_000..<3_003).map { layout.row(at: $0, picture: nil)?.label }, (3_000..<3_003).map(Base.label))
        XCTAssertEqual(layout.held[3_001]?.carried, false)
        XCTAssertEqual(layout.checked, 3_003)
        XCTAssertNil(layout.want(visibleTop: view.top, visibleBottom: view.bottom), "all checked: nothing more")
    }

    /// Clause (D5, D6; the Phase 337.3 verify's fix): more than a page of
    /// carried rows and then a flood. A page that adjoins the checked rows
    /// would walk up from rows out of view toward the view, ⌈gap ÷ 100⌉
    /// pages, while the holes above the prompt stayed blank; the checked rows
    /// are more than a page below the live top, so the ONE page asked is the
    /// live top's, sharing nothing, at the reserved pace. Joined, it drops
    /// the rows under it (all out of view) and fills every row in view.
    func testAFloodOverCarriedRowsIsFilledByTheLiveTopsPage() throws {
        var layout = try filledAndPaged(depth: 3_000)
        for depth in [3_040, 3_080, 3_120] {
            layout.picture(Self.numbered(depth: depth), holds: { _ in true })
        }
        XCTAssertEqual(layout.hi, 3_120, "120 rows carried")
        layout.picture(Self.numbered(depth: 3_220), holds: { _ in true })
        XCTAssertEqual(layout.space, Base.space, "a flood drops nothing")
        XCTAssertEqual(layout.held.count, 260, "the page's hundred, 120 carried and the flood's first 40")
        XCTAssertTrue((3_160..<3_220).allSatisfy { layout.held[$0] == nil }, "sixty lines no picture showed")
        let view = atBottom(layout)
        let ask = try XCTUnwrap(layout.want(visibleTop: view.top, visibleBottom: view.bottom))
        XCTAssertEqual(ask, ScrollbackAsk(from: 3_120, count: 100, depth: 3_220, wrap: Base.wrap, keep: .bottom, overlap: 0, checks: false))
        XCTAssertEqual(layout.accept(Base.answer(ask), for: ask, holds: { _ in true }), .joined(100))
        XCTAssertEqual(layout.lo, 3_120)
        XCTAssertEqual(layout.checked, 3_220)
        XCTAssertEqual(layout.hi, 3_220)
        for index in view.top..<3_220 {
            XCTAssertEqual(layout.row(at: index, picture: nil)?.label, Base.label(index), "row \(index)")
            XCTAssertEqual(layout.held[index]?.carried, false, "row \(index) checked")
        }
        XCTAssertNil(layout.want(visibleTop: view.top, visibleBottom: view.bottom), "filled: nothing more asked")
    }

    /// Clause (D6 with the verify's fix): the live top's page goes as a CHECK
    /// (a second's pace) when every row it brings is carried, as output the
    /// checks cannot keep up with leaves them; and it drops nothing when it
    /// lands after a drag up, because what he reads while scrolled must not
    /// move: its rows join above the checked ones, and the rows under it stay.
    func testTheLiveTopsPageChecksAndDropsNothingWhileScrolled() throws {
        var layout = try filledAndPaged(depth: 3_000)
        for depth in stride(from: 3_040, through: 3_200, by: 40) {
            layout.picture(Self.numbered(depth: depth), holds: { _ in true })
        }
        XCTAssertEqual(layout.outruns, 0, "every line carried")
        let view = atBottom(layout)
        let check = try XCTUnwrap(layout.want(visibleTop: view.top, visibleBottom: view.bottom))
        XCTAssertEqual(check, ScrollbackAsk(from: 3_100, count: 100, depth: 3_200, wrap: Base.wrap, keep: .bottom, overlap: 0, checks: true), "every row it brings carried: a check")
        var scrolled = layout
        scrolled.scroll()
        let held = scrolled.held.count
        XCTAssertEqual(scrolled.accept(Base.answer(check), for: check, holds: { _ in true }), .joined(100))
        XCTAssertEqual(scrolled.lo, 2_900, "scrolled: nothing dropped under it")
        XCTAssertEqual(scrolled.held.count, held)
        XCTAssertEqual(scrolled.checked, 3_000)
        XCTAssertEqual(scrolled.held[3_150]?.carried, false, "its rows joined")
        XCTAssertEqual(layout.accept(Base.answer(check), for: check, holds: { _ in true }), .joined(100))
        XCTAssertEqual(layout.lo, 3_100, "following: the rows under it, out of view, back to reserved")
        XCTAssertEqual(layout.checked, 3_200)
    }

    /// Clause (D6): a page fills reserved rows and replaces carried ones, and
    /// never overwrites a checked row past its overlap.
    func testAPageNeverOverwritesACheckedRow() throws {
        var layout = try filledAndPaged(depth: 3_000)
        layout.picture(Self.numbered(depth: 3_003), holds: { _ in true })
        let across = ScrollbackAsk(from: 2_950, count: 53, depth: 3_003, wrap: Base.wrap, keep: .top, overlap: 8)
        let page = Base.page(from: 2_950, count: 53, depth: 3_003) { index in (2_958..<3_000).contains(index) ? "X" : Base.label(index) }
        XCTAssertEqual(layout.accept(page, for: across, holds: { _ in true }), .joined(3))
        XCTAssertEqual(layout.row(at: 2_960, picture: nil)?.label, Base.label(2_960), "a checked row stays")
        XCTAssertEqual(layout.held[3_001]?.carried, false, "a carried row is replaced")
    }

    /// Clause (section 5.1, `lo <= checked <= hi` and held rows exactly
    /// `[lo, hi)`): a page that would leave a gap beside the held rows (the
    /// rows moved under it since it was asked) is not joined and is asked
    /// again as the layout stands.
    func testAPageThatWouldLeaveAGapIsAskedAgain() throws {
        var layout = try filledAndPaged(depth: 3_000)
        let below = ScrollbackAsk(from: 2_700, count: 100, depth: 3_000, wrap: Base.wrap, keep: .bottom, overlap: 0)
        XCTAssertEqual(layout.accept(Base.answer(below), for: below, holds: { _ in true }), .ignored)
        XCTAssertEqual(layout.lo, 2_900)
        // Scrolled, where a flood leaves the gap under the held rows that
        // 337.1's pages fill (following would drop it, the reverify's fix).
        layout.scroll()
        layout.picture(Self.numbered(depth: 3_050), holds: { _ in true })
        let past = ScrollbackAsk(from: 3_010, count: 20, depth: 3_050, wrap: Base.wrap, keep: .top, overlap: 0)
        XCTAssertEqual(layout.accept(Base.answer(past), for: past, holds: { _ in true }), .ignored)
        XCTAssertEqual(layout.hi, 3_000)
        XCTAssertEqual(layout.held.count, 100)
        XCTAssertNotNil(layout.space, "nothing dropped")
    }

    /// Clause (D13 as 337.3 reads it): a page the Mac read after the ask but
    /// before the newest picture the phone holds (its depth at least the one
    /// asked, below `depthSeen`) is asked again, never refused: following
    /// drops nothing and draws no line, scrolled draws no line; a page below
    /// the depth it was asked at is still refused.
    func testAPageReadBeforeTheNewestPictureIsAskedAgain() throws {
        var layout = filled(depth: 3_000)
        let ask = try XCTUnwrap(layout.want(visibleTop: 2_943, visibleBottom: 3_040))
        layout.picture(Self.numbered(depth: 3_003), holds: { _ in true })
        XCTAssertEqual(layout.depthSeen, 3_003)
        XCTAssertEqual(layout.accept(Base.answer(ask, depth: 3_001), for: ask, holds: { _ in true }), .ignored)
        XCTAssertNotNil(layout.space, "nothing dropped")
        XCTAssertNil(layout.edge, "nothing said")
        XCTAssertNil(layout.refusedAt)
        let view = atBottom(layout)
        let again = try XCTUnwrap(layout.want(visibleTop: view.top, visibleBottom: view.bottom))
        XCTAssertEqual(again, ScrollbackAsk(from: 2_900, count: 100, depth: 3_003, wrap: Base.wrap, keep: .bottom, overlap: 0), "asked again at the newest depth")
        XCTAssertEqual(layout.accept(Base.answer(again), for: again, holds: { _ in true }), .joined(100))
        var scrolled = ScrollbackLayout()
        scrolled.picture(Self.numbered(depth: 3_000), holds: { _ in true })
        scrolled.scroll()
        _ = scrolled.reserve(visibleTop: 2_999, fill: 0)
        let pull = try XCTUnwrap(scrolled.want(visibleTop: 2_990, visibleBottom: 3_040))
        scrolled.picture(Self.numbered(depth: 3_003), holds: { _ in true })
        XCTAssertEqual(scrolled.accept(Base.answer(pull, depth: 3_001), for: pull, holds: { _ in true }), .ignored)
        XCTAssertNil(scrolled.edge, "scrolled: no line")
        var below = filled(depth: 3_000)
        let first = try XCTUnwrap(below.want(visibleTop: 2_943, visibleBottom: 3_040))
        XCTAssertEqual(below.accept(Base.answer(first, depth: 2_999), for: first, holds: { _ in true }), .moved, "below the depth asked: refused")
    }

    /// Clause (the reverify's blink): a page the Mac read AFTER the newest
    /// picture the phone holds (its depth past the picture's) is joined while
    /// following, and does NOT raise `depthSeen`: the picture read before it,
    /// landing after it on the watcher's own connection, is then no trim, so
    /// the fill is not dropped for a round trip (29 blinks of 250 to 870 ms
    /// in 20 runs of 32 s, measured). Scrolled, the page raises it as 337.1
    /// built it.
    func testAPageAheadOfThePictureNeverTurnsTheNextPictureIntoATrim() throws {
        var layout = filled(depth: 3_000)
        let view = atBottom(layout)
        let ask = try XCTUnwrap(layout.want(visibleTop: view.top, visibleBottom: view.bottom))
        XCTAssertEqual(layout.accept(Base.answer(ask, depth: 3_005), for: ask, holds: { _ in true }), .joined(100), "a page ahead of the picture is joined")
        XCTAssertEqual(layout.depthSeen, 3_000, "following: the newest picture's depth alone")
        layout.picture(Self.numbered(depth: 3_002), holds: { _ in true })
        XCTAssertNotNil(layout.space, "the picture read before the page is no trim")
        XCTAssertEqual(layout.held.count, 102, "two lines carried beside the page's hundred")
        XCTAssertEqual(layout.hi, 3_002)
        XCTAssertEqual(layout.depthSeen, 3_002)
        XCTAssertNil(layout.edge)
        var scrolled = filled(depth: 3_000)
        scrolled.scroll()
        let pull = try XCTUnwrap(scrolled.want(visibleTop: view.top, visibleBottom: view.bottom))
        XCTAssertEqual(scrolled.accept(Base.answer(pull, depth: 3_005), for: pull, holds: { _ in true }), .joined(100))
        XCTAssertEqual(scrolled.depthSeen, 3_005, "scrolled: the page raises it (337.1)")
    }

    // MARK: Drops and refusals (D7, D8)

    /// Clause (D7): the alternate screen, a trim, another width and another
    /// space each drop everything following holds above the live rows, with
    /// no line, and the next layout pass fills again from that picture (after
    /// a full-screen program, from the picture it leaves).
    func testTheAlternateScreenATrimAnotherWidthOrSpaceDropWithNoLine() throws {
        let cases: [(String, ScreenPicture, Int)] = [
            ("the alternate screen", Self.numbered(depth: nil, alternate: true), 3_003),
            ("a trim", Self.numbered(depth: 2_904), 2_904),
            ("another width", Self.numbered(depth: 3_010, cols: 80), 3_010),
            ("another space", Self.numbered(depth: 3_010, space: Self.otherSpace), 3_010),
        ]
        for (name, next, live) in cases {
            var layout = try filledAndPaged(depth: 3_000)
            layout.picture(Self.numbered(depth: 3_003), holds: { _ in true })
            layout.picture(next, holds: { _ in true })
            XCTAssertNil(layout.space, name)
            XCTAssertTrue(layout.held.isEmpty, name)
            XCTAssertNil(layout.edge, "\(name): no line")
            XCTAssertNil(layout.refusedAt, "\(name): no refusal")
            XCTAssertEqual(layout.outruns, 0, "\(name): a drop for D7 is no outrun, so the fill is asked again at once")
            XCTAssertEqual(layout.mode, .following, name)
            XCTAssertEqual(layout.live, live, name)
            XCTAssertEqual(layout.liveRow, 0, "\(name): the live rows alone")
            if next.alternate {
                XCTAssertEqual(layout.reserve(visibleTop: live, fill: Self.fill), 0, "a full-screen program: nothing above it")
                layout.picture(Self.numbered(depth: 3_003), holds: { _ in true })
            }
            XCTAssertEqual(layout.reserve(visibleTop: live, fill: Self.fill), 100, "\(name): the next pass fills again")
            XCTAssertEqual(layout.space, next.alternate ? Base.space : next.space, name)
            XCTAssertEqual(layout.wrap, next.columns, name)
        }
    }

    /// Clause (D8, and the Phase 337.3 fix round): a page refused while
    /// following (main's `moved`, or the phone's own check of space or
    /// depth) drops what following holds, draws no line, holds the offer
    /// current then, and nothing is asked again for that offer, not even for
    /// another revision of the same picture; the next pass reserves the
    /// fill's rows all the same, the ground, so the live rows stay at the
    /// bottom and never jump to the view's top; a picture whose depth, space
    /// or width differs fills again.
    func testARefusedFillIsNotAskedAgainUntilThePictureChanges() throws {
        let refusals: [(String, PocketScrollbackAnswer)] = [
            ("main's moved", Base.absence(.moved, "Main's words.")),
            ("another space", Base.page(from: 2_900, count: 100, depth: 3_000, space: Self.otherSpace)),
            ("a shallower depth", Base.page(from: 2_900, count: 100, depth: 2_999)),
        ]
        for (name, refusal) in refusals {
            var layout = filled(depth: 3_000)
            let view = atBottom(layout)
            let ask = try XCTUnwrap(layout.want(visibleTop: view.top, visibleBottom: view.bottom))
            XCTAssertEqual(layout.accept(refusal, for: ask, holds: { _ in true }), .moved, name)
            XCTAssertNil(layout.edge, "\(name): following draws no line")
            XCTAssertNil(layout.space, "\(name): following drops what it held")
            XCTAssertEqual(layout.refusedAt, ScrollbackLayout.Offer(depth: 3_000, space: Base.space, columns: Base.wrap), name)
            XCTAssertEqual(layout.reserve(visibleTop: 3_000, fill: Self.fill), 100, "\(name): the fill's rows reserved again, the ground")
            XCTAssertEqual(layout.liveRow, 100, "\(name): the live rows stay at the bottom")
            XCTAssertTrue(layout.held.isEmpty, "\(name): nothing held")
            XCTAssertNil(layout.want(visibleTop: view.top, visibleBottom: view.bottom), "\(name): not asked again")
            layout.picture(Self.numbered(depth: 3_000, revision: "ba9876543210"), holds: { _ in true })
            XCTAssertNotNil(layout.refusedAt, "\(name): the same offer")
            XCTAssertEqual(layout.reserve(visibleTop: 3_000, fill: Self.fill), 0, "\(name): the same offer")
            XCTAssertNil(layout.want(visibleTop: view.top, visibleBottom: view.bottom), "\(name): the same offer, nothing asked")
        }
        for (name, next) in [
            ("its depth", Self.numbered(depth: 3_001)),
            ("its space", Self.numbered(depth: 3_000, space: Self.otherSpace)),
            ("its width", Self.numbered(depth: 3_000, cols: 80)),
        ] {
            var layout = filled(depth: 3_000)
            let ask = try XCTUnwrap(layout.want(visibleTop: 2_943, visibleBottom: 3_040))
            _ = layout.accept(Base.absence(.moved), for: ask, holds: { _ in true })
            layout.picture(next, holds: { _ in true })
            XCTAssertNil(layout.refusedAt, "\(name) differs")
            XCTAssertEqual(layout.reserve(visibleTop: layout.live, fill: Self.fill), 100, "\(name) differs: the fill again")
        }
    }

    /// Clause (D8): `ended` and `unreachable` stop paging while following
    /// until the next picture with a numeric depth, which resumes it.
    func testEndedOrUnreachableStopsPagingUntilANumericDepth() throws {
        for why in [PocketScrollbackAbsence.ended, .unreachable] {
            var layout = filled(depth: 3_000)
            let view = atBottom(layout)
            let ask = try XCTUnwrap(layout.want(visibleTop: view.top, visibleBottom: view.bottom))
            XCTAssertEqual(layout.accept(Base.absence(why), for: ask, holds: { _ in true }), .stopped)
            XCTAssertEqual(layout.edge, .stopped)
            XCTAssertNil(layout.want(visibleTop: view.top, visibleBottom: view.bottom))
            layout.picture(Self.numbered(depth: nil), holds: { _ in true })
            XCTAssertEqual(layout.edge, .stopped, "an unsteady read is no number")
            layout.picture(Self.numbered(depth: 3_000), holds: { _ in true })
            XCTAssertNil(layout.edge, "a numeric depth resumes paging")
            XCTAssertEqual(layout.want(visibleTop: view.top, visibleBottom: view.bottom), ask)
        }
    }

    /// Clause (D8): a refused page turns the fill off for this Terminal:
    /// following, it drops what following holds, with no line; scrolled, it
    /// stops paging with the sentence, and back to live the fill stays off.
    func testARefusedPageTurnsTheFillOff() {
        var following = filled(depth: 3_000)
        following.stop("Words.")
        XCTAssertTrue(following.fillOff)
        XCTAssertNil(following.space)
        XCTAssertNil(following.edge)
        XCTAssertEqual(following.reserve(visibleTop: 3_000, fill: Self.fill), 0)
        var scrolled = filled(depth: 3_000)
        scrolled.scroll()
        scrolled.stop("Words.")
        XCTAssertEqual(scrolled.edge, .moved("Words."))
        XCTAssertTrue(scrolled.fillOff)
        XCTAssertEqual(scrolled.follow(), 100)
        XCTAssertEqual(scrolled.reserve(visibleTop: 3_000, fill: Self.fill), 0, "back to live, the fill stays off")
    }

    /// Clause (D8): a page joined while scrolled shows the door serves this
    /// space, so following's hold on a refused fill, and a fill turned off,
    /// are lifted, and following asks again.
    func testAJoinedPageLiftsARefusalAndTheFillOff() throws {
        for off in [false, true] {
            let name = off ? "the fill off" : "a refusal"
            var layout = filled(depth: 3_000)
            let ask = try XCTUnwrap(layout.want(visibleTop: 2_943, visibleBottom: 3_040))
            if off {
                layout.stop("Words.")
            } else {
                _ = layout.accept(Base.absence(.moved), for: ask, holds: { _ in true })
            }
            XCTAssertNil(layout.space, name)
            layout.scroll()
            XCTAssertEqual(layout.reserve(visibleTop: 2_999, fill: Self.fill), 100, "\(name): scrolled still pages")
            let pull = try XCTUnwrap(layout.want(visibleTop: 2_990, visibleBottom: 3_040), name)
            XCTAssertEqual(layout.accept(Base.answer(pull), for: pull, holds: { _ in true }), .joined(100), name)
            XCTAssertNil(layout.refusedAt, name)
            XCTAssertFalse(layout.fillOff, name)
            XCTAssertEqual(layout.follow(), 0, name)
            XCTAssertEqual(layout.reserve(visibleTop: 2_850, fill: 150), 100, name)
            XCTAssertNotNil(layout.want(visibleTop: 2_850, visibleBottom: 3_040), "\(name): following asks again")
        }
    }

    /// Clause (D8 with D10, and the Phase 337.3 fix round): a pull and a
    /// return before its first page lands, while a refusal holds or the fill
    /// is off, keeps nothing the pull held. With the fill off the live rows
    /// are alone again and the fill is not reserved (a door with no pages);
    /// under a refusal the next pass reserves the fill's rows again, the
    /// ground, so the live rows stay at the bottom, and no page is asked.
    func testBackToLiveWhileRefusedKeepsNothingHeldAndAsksNothing() throws {
        for off in [false, true] {
            let name = off ? "the fill off" : "a refusal"
            var layout = filled(depth: 3_000)
            let ask = try XCTUnwrap(layout.want(visibleTop: 2_943, visibleBottom: 3_040))
            if off {
                layout.stop("Words.")
            } else {
                _ = layout.accept(Base.absence(.moved), for: ask, holds: { _ in true })
            }
            layout.scroll()
            XCTAssertEqual(layout.reserve(visibleTop: 2_999, fill: Self.fill), 100, "\(name): a pull reserves")
            XCTAssertEqual(layout.follow(), 100, "\(name): back before its page lands, the rows reserved go")
            XCTAssertNil(layout.space, name)
            XCTAssertEqual(layout.liveRow, 0, "\(name): nothing held")
            if off {
                XCTAssertEqual(layout.reserve(visibleTop: 3_000, fill: Self.fill), 0, "\(name): and the fill is not reserved again")
            } else {
                XCTAssertEqual(layout.reserve(visibleTop: 3_000, fill: Self.fill), 100, "\(name): the fill's ground again, the live rows at the bottom")
                XCTAssertTrue(layout.held.isEmpty, "\(name): nothing held")
            }
            XCTAssertNil(layout.want(visibleTop: 2_943, visibleBottom: 3_040), "\(name): nothing asked")
        }
    }

    // MARK: Scrolled and back to live (D9, D10)

    /// Clause (D9): `scroll()` enters `scrolled` only while an index space is
    /// held or offered, so a pull over a full-screen program or a Mac older
    /// than 337.1 never does; entering adds no row.
    func testScrollEntersScrolledOnlyWithAnIndexSpace() {
        for picture in [Self.numbered(depth: nil, alternate: true), Self.numbered(depth: nil)] {
            var layout = ScrollbackLayout()
            layout.picture(picture, holds: { _ in true })
            layout.scroll()
            XCTAssertEqual(layout.mode, .following)
        }
        var offered = ScrollbackLayout()
        offered.picture(Self.numbered(depth: 3_000), holds: { _ in true })
        offered.scroll()
        XCTAssertEqual(offered.mode, .scrolled, "offered, not yet held")
        var held = filled(depth: 3_000)
        let first = held.firstRow
        let rows = held.rowCount
        held.scroll()
        XCTAssertEqual(held.mode, .scrolled)
        XCTAssertEqual(held.firstRow, first)
        XCTAssertEqual(held.rowCount, rows)
    }

    /// Clause (D10): back to live keeps a fill whose held rows reach the live
    /// top (rows carried while scrolled included), answering 0; drops one with
    /// a gap under the live top, or whose paging stopped, answering the rows
    /// it took away, and the next pass fills again; already following, it
    /// moves nothing.
    func testBackToLiveKeepsAContiguousFillAndDropsAGappedOne() throws {
        var kept = try filledAndPaged(depth: 3_000)
        kept.picture(Self.numbered(depth: 3_003), holds: { _ in true })
        kept.scroll()
        kept.picture(Self.numbered(depth: 3_005), holds: { _ in true })
        XCTAssertEqual(kept.follow(), 0)
        XCTAssertEqual(kept.mode, .following)
        XCTAssertEqual(kept.held.count, 105)
        XCTAssertEqual(kept.firstRow, 2_900)
        var gapped = try filledAndPaged(depth: 3_000)
        gapped.scroll()
        gapped.picture(Self.numbered(depth: 3_100), holds: { _ in true })
        XCTAssertEqual(gapped.liveRow, 200)
        XCTAssertEqual(gapped.follow(), 200, "every row above the live rows taken away")
        XCTAssertNil(gapped.space)
        XCTAssertTrue(gapped.held.isEmpty)
        XCTAssertEqual(gapped.firstRow, 3_100)
        XCTAssertEqual(gapped.reserve(visibleTop: 3_100, fill: Self.fill), 100, "the next pass fills again")
        var stopped = try filledAndPaged(depth: 3_000)
        stopped.scroll()
        stopped.picture(Self.numbered(depth: 2_950), holds: { _ in true })
        XCTAssertEqual(stopped.edge, .moved(Copy.scrollbackMoved))
        XCTAssertEqual(stopped.follow(), 100)
        XCTAssertNil(stopped.edge)
        XCTAssertNil(stopped.space)
        var following = try filledAndPaged(depth: 3_000)
        XCTAssertEqual(following.follow(), 0)
        XCTAssertEqual(following.held.count, 100)
    }

    /// Clause (D28 with section 5.1): eviction keeps `lo <= checked <= hi`:
    /// from the top past every checked row, `checked` rises to `lo`; from the
    /// bottom past the carried rows, it falls to `hi`.
    func testEvictionKeepsCheckedInsideTheHeldRows() throws {
        var top = try filledAndPaged(depth: 6_000)
        var depth = 6_000
        for _ in 0..<100 where top.held.count <= ScrollbackLayout.mostHeld + 100 {
            depth += 40
            top.picture(Self.numbered(depth: depth), holds: { _ in true })
        }
        XCTAssertGreaterThan(top.held.count, ScrollbackLayout.mostHeld + 100, "the carried rows grew past the cap")
        XCTAssertEqual(top.checked, 6_000)
        let view = atBottom(top)
        XCTAssertGreaterThan(top.evict(visibleTop: view.top, visibleBottom: view.bottom), 100, "past every checked row")
        XCTAssertEqual(top.held.count, ScrollbackLayout.mostHeld)
        XCTAssertGreaterThan(top.lo, 6_000)
        XCTAssertEqual(top.checked, top.lo)
        XCTAssertLessThanOrEqual(top.checked, top.hi)
        var bottom = try filledAndPaged(depth: 6_000)
        bottom.picture(Self.numbered(depth: 6_040), holds: { _ in true })
        bottom.scroll()
        for _ in 0..<100 where bottom.held.count <= ScrollbackLayout.mostHeld + 100 {
            _ = bottom.reserve(visibleTop: bottom.lo, fill: 0)
            let ask = try XCTUnwrap(bottom.want(visibleTop: bottom.lo, visibleBottom: bottom.lo + 60))
            XCTAssertEqual(ask.keep, .bottom)
            _ = bottom.accept(Base.answer(ask), for: ask, holds: { _ in true })
        }
        XCTAssertGreaterThan(bottom.held.count, ScrollbackLayout.mostHeld + 100, "the pages grew past the cap")
        XCTAssertEqual(bottom.checked, 6_000)
        XCTAssertGreaterThan(bottom.evict(visibleTop: bottom.lo, visibleBottom: bottom.lo + 60), 40, "past the carried rows")
        XCTAssertLessThan(bottom.hi, 6_000)
        XCTAssertEqual(bottom.checked, bottom.hi)
        XCTAssertGreaterThanOrEqual(bottom.checked, bottom.lo)
    }

    /// Clause (D5, D6, his item 1 while an agent prints): over 200 pictures
    /// each scrolling 1 to 5 lines, with a check answered every fourth, the
    /// held rows reach the live top after every picture (no reserved band in
    /// view), stay exactly `[lo, hi)`, carried exactly at `[checked, hi)`, and
    /// every one reads tmux's own line at its index.
    func testTwoHundredPicturesKeepTheHistoryWholeAndTrue() throws {
        var layout = try filledAndPaged(depth: 3_000)
        var generator = SplitMix(seed: 0x3373)
        var depth = 3_000
        var checks = 0
        for step in 0..<200 {
            depth += Int.random(in: 1...5, using: &generator)
            layout.picture(Self.numbered(depth: depth), holds: { _ in true })
            if step % 4 == 3 {
                let view = atBottom(layout)
                if let ask = layout.want(visibleTop: view.top, visibleBottom: view.bottom) {
                    XCTAssertTrue(ask.checks, "step \(step)")
                    XCTAssertEqual(layout.accept(Base.answer(ask), for: ask, holds: { _ in true }), .joined(ask.count - ask.overlap), "step \(step)")
                    checks += 1
                }
            }
            XCTAssertEqual(layout.hi, layout.live, "step \(step): carried at once")
            XCTAssertTrue(layout.lo <= layout.checked && layout.checked <= layout.hi, "step \(step)")
            XCTAssertEqual(layout.held.count, layout.hi - layout.lo, "step \(step)")
            let whole = (layout.lo..<layout.hi).allSatisfy { index in
                guard let held = layout.held[index] else { return false }
                return held.row.label == Base.label(index) && held.carried == (index >= layout.checked)
            }
            XCTAssertTrue(whole, "step \(step): every held row tmux's line, carried exactly above checked")
        }
        XCTAssertEqual(checks, 50)
    }

    // MARK: The model, on a scripted door and clock

    private let clock = Base.FakeClock()

    private func model(_ door: ScriptedScreenDoor) -> ScrollbackModel {
        Base.scriptedModel(door, clock: clock)
    }

    private func settle() async {
        await Base.settleModel()
    }

    /// Counts the times the model told the scroll view to lay out again.
    private final class Told {
        var count = 0
    }

    /// Clause (section 5.1, `fill(rows:)`): the layout pass's ask reserves
    /// the fill and remembers it, tells no one to lay out again (its caller
    /// IS the layout pass), and changes neither observed value.
    func testFillReservesWithoutTellingTheLayoutOrChangingWhatIsObserved() {
        let history = ScrollbackModel(door: ScriptedScreenDoor(), holds: { _ in true })
        let told = Told()
        history.onLayout = { told.count += 1 }
        history.picture(Self.numbered(depth: 3_000))
        let before = told.count
        XCTAssertEqual(history.fill(rows: Self.fill), 100)
        XCTAssertEqual(told.count, before, "its caller is the layout pass")
        XCTAssertEqual(history.mode, .following)
        XCTAssertNil(history.line)
        XCTAssertEqual(history.viewFill, Self.fill)
        XCTAssertEqual(history.layout.top, 2_900)
    }

    /// Clause (D3): the first layout pass reserves the fill before any page
    /// is asked, and its report asks the fill's one page, following.
    func testTheFirstPageIsAskedFromTheFirstLayoutPass() async throws {
        let door = ScriptedScreenDoor()
        let history = model(door)
        history.picture(Self.numbered(depth: 3_000))
        XCTAssertEqual(history.fill(rows: Self.fill), 100)
        await settle()
        XCTAssertTrue(door.pageAsks.isEmpty, "nothing asked before the view says where it is")
        XCTAssertEqual(history.viewed(top: 2_943, bottom: 3_040, atBottom: true), 0)
        await settle()
        XCTAssertEqual(history.mode, .following)
        XCTAssertEqual(door.pageAsks, [ScriptedScreenDoor.PageAsked(from: 2_900, count: 100, depth: 3_000, wrap: Base.wrap, keep: .bottom)])
    }

    /// Clause (D9): a view off its bottom with its top above the live top
    /// enters `scrolled` with no row added; at its bottom never; off its
    /// bottom with its top at the live top or below (the upper rows of a tall
    /// live screen) never; and over a full-screen program never.
    func testViewedOffTheBottomEntersScrolledWithNoRowAdded() async throws {
        let door = ScriptedScreenDoor()
        let history = model(door)
        history.picture(Self.numbered(depth: 30))
        XCTAssertEqual(history.fill(rows: Self.fill), 30)
        history.viewed(top: 0, bottom: 97, atBottom: true)
        await settle()
        door.answerPage(.success(Base.page(from: 0, count: 30, depth: 30)))
        await settle()
        let first = history.layout.firstRow
        let rows = history.layout.rowCount
        XCTAssertEqual(history.viewed(top: 5, bottom: 102, atBottom: true), 0)
        XCTAssertEqual(history.mode, .following, "at its bottom: never")
        XCTAssertEqual(history.viewed(top: 30, bottom: 127, atBottom: false), 0)
        XCTAssertEqual(history.mode, .following, "its top at the live top: never")
        XCTAssertEqual(history.viewed(top: 5, bottom: 102, atBottom: false), 0, "entering adds no row")
        XCTAssertEqual(history.mode, .scrolled)
        XCTAssertEqual(history.layout.firstRow, first)
        XCTAssertEqual(history.layout.rowCount, rows)
        let program = model(ScriptedScreenDoor())
        program.picture(Self.numbered(depth: 3_000))
        program.fill(rows: Self.fill)
        program.picture(Self.numbered(depth: nil, alternate: true))
        program.viewed(top: 2_990, bottom: 3_030, atBottom: false)
        XCTAssertEqual(program.mode, .following, "a full-screen program scrolls back nothing")
    }

    /// Clause (D8): a 404 while following turns the fill off for this
    /// Terminal with no line, so no picture asks it again; a pull past the
    /// live top still pages, as 337.1.
    func testA404TurnsTheFillOffWhileScrolledStillPages() async throws {
        let door = ScriptedScreenDoor()
        let history = model(door)
        history.picture(Self.numbered(depth: 3_000))
        XCTAssertEqual(history.fill(rows: Self.fill), 100)
        history.viewed(top: 2_943, bottom: 3_040, atBottom: true)
        await settle()
        XCTAssertEqual(door.pageAsks.count, 1)
        door.answerPage(.failure(.refused))
        await settle()
        XCTAssertNil(history.line, "following draws no line")
        XCTAssertTrue(history.layout.fillOff)
        XCTAssertNil(history.layout.space)
        XCTAssertEqual(history.fill(rows: Self.fill), 0, "the fill is off")
        clock.advance(by: .seconds(2))
        history.picture(Self.numbered(depth: 3_001))
        XCTAssertEqual(history.fill(rows: Self.fill), 0, "a new picture does not turn it on")
        history.viewed(top: 3_001, bottom: 3_041, atBottom: true)
        await settle()
        XCTAssertEqual(door.pageAsks.count, 1, "nothing asked while following")
        history.viewed(top: 3_000, bottom: 3_040, atBottom: false)
        await settle()
        XCTAssertEqual(history.mode, .scrolled)
        XCTAssertEqual(door.pageAsks.count, 2)
        XCTAssertEqual(door.pageAsks.last, ScriptedScreenDoor.PageAsked(from: 2_901, count: 100, depth: 3_001, wrap: Base.wrap, keep: .bottom))
    }

    /// Clause (D8): main's `moved` while following draws no line, holds the
    /// refusal so nothing is asked over the same picture, and a picture that
    /// differs fills again.
    func testARefusedFillDrawsNoLineAndWaitsForAnotherPicture() async throws {
        let door = ScriptedScreenDoor()
        let history = model(door)
        history.picture(Self.numbered(depth: 3_000))
        history.fill(rows: Self.fill)
        history.viewed(top: 2_943, bottom: 3_040, atBottom: true)
        await settle()
        door.answerPage(.success(Base.absence(.moved, "Main's words.")))
        await settle()
        XCTAssertNil(history.line, "following draws no line")
        XCTAssertEqual(history.mode, .following)
        XCTAssertNotNil(history.layout.refusedAt)
        clock.advance(by: .seconds(2))
        XCTAssertEqual(history.fill(rows: Self.fill), 100, "the fill's ground reserved again, so the live rows stay at the bottom")
        history.viewed(top: 2_943, bottom: 3_040, atBottom: true)
        await settle()
        XCTAssertEqual(door.pageAsks.count, 1, "not asked again over the same picture")
        history.picture(Self.numbered(depth: 3_001))
        XCTAssertEqual(history.fill(rows: Self.fill), 0, "already reserved")
        history.viewed(top: 2_944, bottom: 3_041, atBottom: true)
        await settle()
        XCTAssertEqual(door.pageAsks.count, 2, "another picture: the fill again")
    }

    /// Clause (D7): a picture that drops what following holds lets the page
    /// in flight for it go, and says nothing.
    func testADropLetsThePageInFlightGo() async throws {
        let door = ScriptedScreenDoor()
        let history = model(door)
        history.picture(Self.numbered(depth: 3_000))
        history.fill(rows: Self.fill)
        history.viewed(top: 2_943, bottom: 3_040, atBottom: true)
        await settle()
        XCTAssertEqual(door.pageAsks.count, 1)
        history.picture(Self.numbered(depth: nil, alternate: true))
        await settle()
        XCTAssertEqual(door.pagesCancelled, 1)
        XCTAssertNil(history.asking)
        XCTAssertNil(history.line)
        XCTAssertNil(history.layout.space)
    }

    /// Clause (D27 as 337.3 keeps it): a key he sends while following moves
    /// nothing, so typing never drops the fill or the page in flight for it.
    func testAKeyWhileFollowingKeepsTheFillAndItsPage() async throws {
        let door = ScriptedScreenDoor()
        let history = model(door)
        let picture = Self.numbered(depth: 3_000)
        history.picture(picture)
        history.fill(rows: Self.fill)
        history.viewed(top: 2_943, bottom: 3_040, atBottom: true)
        await settle()
        XCTAssertEqual(door.pageAsks.count, 1)
        let keys = ScreenKeySender(door: door, picture: { picture })
        keys.onSend = { [weak history] in history?.follow() }
        keys.send([.text("a")])
        await settle()
        XCTAssertEqual(door.pagesCancelled, 0, "typing drops no page")
        XCTAssertEqual(history.layout.top, 2_900, "nor the fill")
        door.answerPage(.success(Base.page(from: 2_900, count: 100, depth: 3_000)))
        await settle()
        XCTAssertEqual(history.layout.held.count, 100)
    }

    /// Clause (D6): a check goes no sooner than `checkGap` (1 s) after the
    /// last page started, two checks a second apart; a page for reserved rows
    /// in view keeps `minGap` (0.25 s).
    func testACheckWaitsASecondAndAReservedPageAQuarter() async throws {
        let door = ScriptedScreenDoor()
        let history = model(door)
        history.picture(Self.numbered(depth: 3_000))
        history.fill(rows: Self.fill)
        history.viewed(top: 2_943, bottom: 3_040, atBottom: true)
        await settle()
        XCTAssertEqual(door.pageAsks.count, 1, "the fill's page, at once")
        door.answerPage(.success(Base.page(from: 2_900, count: 100, depth: 3_000)))
        await settle()
        history.picture(Self.numbered(depth: 3_003))
        history.viewed(top: 2_946, bottom: 3_043, atBottom: true)
        await settle()
        clock.advance(by: .milliseconds(250))
        await settle()
        XCTAssertEqual(door.pageAsks.count, 1, "a check does not go at minGap")
        clock.advance(by: .milliseconds(740))
        await settle()
        XCTAssertEqual(door.pageAsks.count, 1, "nor before its second")
        clock.advance(by: .milliseconds(10))
        await settle()
        XCTAssertEqual(door.pageAsks.count, 2, "a check, a second after the last page started")
        XCTAssertEqual(history.asking?.checks, true)
        XCTAssertEqual(door.pageAsks.last, ScriptedScreenDoor.PageAsked(from: 2_992, count: 11, depth: 3_003, wrap: Base.wrap, keep: .top))
        door.answerPage(.success(Base.page(from: 2_992, count: 11, depth: 3_003)))
        await settle()
        XCTAssertEqual(history.layout.checked, 3_003)
        history.picture(Self.numbered(depth: 3_005))
        history.viewed(top: 2_948, bottom: 3_045, atBottom: true)
        await settle()
        clock.advance(by: .milliseconds(990))
        await settle()
        XCTAssertEqual(door.pageAsks.count, 2, "the next check, not before its second")
        clock.advance(by: .milliseconds(10))
        await settle()
        XCTAssertEqual(door.pageAsks.count, 3)
        door.answerPage(.success(Base.page(from: 2_995, count: 10, depth: 3_005)))
        await settle()
        // Reserved rows in view (the view grew taller, a second page of fill
        // reserved above the first): a quarter of a second, no check's wait.
        XCTAssertEqual(history.fill(rows: 150), 95)
        history.viewed(top: 2_855, bottom: 3_045, atBottom: true)
        await settle()
        XCTAssertEqual(door.pageAsks.count, 3)
        clock.advance(by: .milliseconds(250))
        await settle()
        XCTAssertEqual(door.pageAsks.count, 4, "reserved rows in view: a quarter of a second")
        XCTAssertEqual(history.asking?.checks, false)
        XCTAssertEqual(door.pageAsks.last, ScriptedScreenDoor.PageAsked(from: 2_805, count: 103, depth: 3_005, wrap: Base.wrap, keep: .bottom))
    }

    /// Clause (D6): reserved rows that come into view while a check waits its
    /// second are asked at `minGap`: the gap's wait gives way to the sooner one.
    func testAReservedPageNeverWaitsOutACheck() async throws {
        let door = ScriptedScreenDoor()
        let history = model(door)
        history.picture(Self.numbered(depth: 3_000))
        history.fill(rows: Self.fill)
        history.viewed(top: 2_943, bottom: 3_040, atBottom: true)
        await settle()
        door.answerPage(.success(Base.page(from: 2_900, count: 100, depth: 3_000)))
        await settle()
        history.picture(Self.numbered(depth: 3_003))
        history.viewed(top: 2_946, bottom: 3_043, atBottom: true)
        await settle()
        // A check of the three carried rows now waits its second. The view
        // grows taller, so a second page of fill is reserved above, in view.
        XCTAssertEqual(history.fill(rows: 150), 97)
        history.viewed(top: 2_853, bottom: 3_043, atBottom: true)
        await settle()
        clock.advance(by: .milliseconds(250))
        await settle()
        XCTAssertEqual(door.pageAsks.count, 2, "the reserved rows' page did not wait out the check's second")
        XCTAssertEqual(history.asking?.checks, false)
        XCTAssertEqual(door.pageAsks.last, ScriptedScreenDoor.PageAsked(from: 2_803, count: 105, depth: 3_003, wrap: Base.wrap, keep: .bottom))
    }

    /// Clause (the Phase 337.3 reverify's "worse" row, the fix round):
    /// following, output at 60 lines a picture, past the screen's 40 but
    /// short of the view (40 rows and 57 above them), for two seconds. Every
    /// picture carries the 40 rows the one before showed and leaves the other
    /// 20 as holes; nothing drawn is ever taken away, so the band above the
    /// prompt never blinks; and from the second such picture inside
    /// `outrunGap` the model asks the Mac for nothing until `outrunGap` after
    /// the last, so it reads no page the output would scroll away. Once it
    /// calms, the ONE page that fills the holes in view goes, from the live
    /// top.
    func testOutputThatOutrunsTheScreenShortOfTheViewCarriesAndAsksNothing() async throws {
        let door = ScriptedScreenDoor()
        let history = model(door)
        history.picture(Self.numbered(depth: 3_000))
        history.fill(rows: Self.fill)
        history.viewed(top: 2_943, bottom: 3_040, atBottom: true)
        await settle()
        XCTAssertEqual(door.pageAsks.count, 1, "the fill's page, at once")
        door.answerPage(.success(Base.page(from: 2_900, count: 100, depth: 3_000)))
        await settle()
        var depth = 3_000
        for step in 0..<20 {
            clock.advance(by: .milliseconds(100))
            await settle()
            let before = history.layout.held
            depth += 60
            history.picture(Self.numbered(depth: depth))
            XCTAssertNotNil(history.layout.space, "step \(step): nothing dropped")
            XCTAssertTrue(before.allSatisfy { history.layout.held[$0.key] == $0.value }, "step \(step): a drawn row was taken away")
            XCTAssertTrue(((depth - 60)..<(depth - 20)).allSatisfy { history.layout.row(at: $0, picture: nil)?.label == Base.label($0) }, "step \(step): the screen before carried")
            XCTAssertTrue(((depth - 20)..<depth).allSatisfy { history.layout.held[$0] == nil }, "step \(step): the lines no picture showed are holes")
            XCTAssertEqual(history.layout.hi, depth, "step \(step): hi at the live top")
            history.fill(rows: Self.fill)
            history.viewed(top: depth - Self.fill, bottom: depth + Self.rows, atBottom: true)
            await settle()
        }
        XCTAssertEqual(history.layout.outruns, 20)
        XCTAssertEqual(door.pageAsks.count, 1, "nothing asked while the pictures outran the screen")
        XCTAssertEqual(door.pagesCancelled, 0)
        clock.advance(by: .milliseconds(100))
        await settle()
        depth += 2
        history.picture(Self.numbered(depth: depth))
        history.fill(rows: Self.fill)
        history.viewed(top: depth - Self.fill, bottom: depth + Self.rows, atBottom: true)
        await settle()
        XCTAssertEqual(history.layout.outruns, 20, "a calm picture is no outrun")
        XCTAssertEqual(history.layout.hi, depth, "its lines carried at once")
        XCTAssertEqual(history.layout.row(at: depth - 1, picture: nil)?.label, Base.label(depth - 1))
        clock.advance(by: ScrollbackModel.outrunGap - .milliseconds(110))
        await settle()
        XCTAssertEqual(door.pageAsks.count, 1, "not before outrunGap after the last outrun")
        clock.advance(by: .milliseconds(10))
        await settle()
        XCTAssertEqual(door.pageAsks.count, 2, "the one page that fills the holes in view")
        XCTAssertEqual(door.pageAsks.last, ScriptedScreenDoor.PageAsked(from: depth - 100, count: 100, depth: depth, wrap: Base.wrap, keep: .bottom))
        XCTAssertEqual(history.asking?.checks, false)
        door.answerPage(.success(Base.page(from: depth - 100, count: 100, depth: depth)))
        await settle()
        XCTAssertTrue(((depth - Self.fill)..<depth).allSatisfy { history.layout.row(at: $0, picture: nil)?.label == Base.label($0) }, "every row in view tmux's")
    }

    /// Clause (the verify's straddle, the fix round): following, output at
    /// 130 lines a picture, past the screen's 40 AND the 57 rows the view
    /// holds above it, so whatever a picture carries lands above the view.
    /// The first is lone (its page goes at once); from the second inside
    /// `outrunGap` following carries NOTHING and asks no page until
    /// `outrunGap` after the last: every new line is a hole, the rows above
    /// the prompt are the ground steadily, and nothing drawn is ever taken
    /// away. A calm picture inside the hold carries nothing either; once it
    /// ends, the ONE page that fills the view goes and carrying resumes.
    func testOutputThatPassesTheViewAgainAndAgainLeavesTheGroundAndAsksNothing() async throws {
        let door = ScriptedScreenDoor()
        let history = model(door)
        history.picture(Self.numbered(depth: 3_000))
        history.fill(rows: Self.fill)
        history.viewed(top: 2_943, bottom: 3_040, atBottom: true)
        await settle()
        door.answerPage(.success(Base.page(from: 2_900, count: 100, depth: 3_000)))
        await settle()
        var depth = 3_000
        for step in 0..<15 {
            clock.advance(by: .milliseconds(100))
            await settle()
            let before = history.layout.held
            depth += 130
            history.picture(Self.numbered(depth: depth))
            XCTAssertNotNil(history.layout.space, "step \(step): nothing dropped")
            XCTAssertTrue(before.allSatisfy { history.layout.held[$0.key] == $0.value }, "step \(step): a drawn row was taken away")
            if step <= 1 {
                // The lone first, and the second, which tells the model the output passes the view again and again.
                XCTAssertTrue(((depth - 130)..<(depth - 90)).allSatisfy { history.layout.row(at: $0, picture: nil)?.label == Base.label($0) }, "step \(step): the screen before carried, above the view")
            } else {
                XCTAssertTrue(((depth - 130)..<depth).allSatisfy { history.layout.held[$0] == nil }, "step \(step): passing the view again, nothing carried, every new line a hole")
            }
            XCTAssertTrue(((depth - Self.fill)..<depth).allSatisfy { history.layout.held[$0] == nil }, "step \(step): the rows in view above the prompt are the ground")
            XCTAssertEqual(history.layout.hi, depth, "step \(step): hi at the live top")
            history.fill(rows: Self.fill)
            history.viewed(top: depth - Self.fill, bottom: depth + Self.rows, atBottom: true)
            await settle()
            if step == 0, let ask = history.asking {
                // The lone first's page, answered at once: its rows lie above the next picture's view.
                door.answerPage(.success(Base.page(from: ask.from, count: ask.count, depth: depth)))
                await settle()
            }
        }
        XCTAssertEqual(history.layout.outruns, 15)
        // The fill's page, and the lone first's only if its quarter second came before the second picture.
        XCTAssertLessThanOrEqual(door.pageAsks.count, 2, "nothing asked while the pictures passed the view")
        let held = door.pageAsks.count
        clock.advance(by: .milliseconds(100))
        await settle()
        depth += 2
        history.picture(Self.numbered(depth: depth))
        history.fill(rows: Self.fill)
        history.viewed(top: depth - Self.fill, bottom: depth + Self.rows, atBottom: true)
        await settle()
        XCTAssertNil(history.layout.held[depth - 1], "inside the hold even a calm picture carries nothing: the ground stays steady")
        clock.advance(by: ScrollbackModel.outrunGap - .milliseconds(110))
        await settle()
        XCTAssertEqual(door.pageAsks.count, held, "not before outrunGap after the last outrun")
        clock.advance(by: .milliseconds(10))
        await settle()
        XCTAssertEqual(door.pageAsks.count, held + 1, "the one page that fills the view")
        XCTAssertEqual(door.pageAsks.last, ScriptedScreenDoor.PageAsked(from: depth - 100, count: 100, depth: depth, wrap: Base.wrap, keep: .bottom))
        door.answerPage(.success(Base.page(from: depth - 100, count: 100, depth: depth)))
        await settle()
        XCTAssertTrue(((depth - Self.fill)..<depth).allSatisfy { history.layout.row(at: $0, picture: nil)?.label == Base.label($0) }, "every row in view tmux's")
        clock.advance(by: .milliseconds(100))
        await settle()
        history.picture(Self.numbered(depth: depth + 3))
        XCTAssertEqual((depth..<(depth + 3)).map { history.layout.held[$0]?.carried }, [true, true, true], "calm again: carried at once")
    }

    /// Clause (the verify's band: a page the picture outran is read again at
    /// once): ONE flood, or a return to the Terminal after the agent printed,
    /// is no output faster than the screen, so its page goes at the reserved
    /// pace, never a second later; and a second flood more than `outrunGap`
    /// after it is lone again. Two within it hold the pages until
    /// `outrunGap` after the last.
    func testALoneFloodIsReadAgainAtOnceAndTwoInsideTheGapWait() async throws {
        let door = ScriptedScreenDoor()
        let history = model(door)
        history.picture(Self.numbered(depth: 3_000))
        history.fill(rows: Self.fill)
        history.viewed(top: 2_943, bottom: 3_040, atBottom: true)
        await settle()
        door.answerPage(.success(Base.page(from: 2_900, count: 100, depth: 3_000)))
        await settle()
        clock.advance(by: .seconds(5))
        await settle()
        history.picture(Self.numbered(depth: 3_200))
        await settle()
        XCTAssertEqual(history.layout.outruns, 1)
        XCTAssertEqual(door.pageAsks.count, 2, "a lone flood's page, at once, for the rows the view now holds")
        XCTAssertEqual(door.pageAsks.last, ScriptedScreenDoor.PageAsked(from: 3_100, count: 100, depth: 3_200, wrap: Base.wrap, keep: .bottom))
        history.fill(rows: Self.fill)
        history.viewed(top: 3_143, bottom: 3_240, atBottom: true)
        await settle()
        XCTAssertEqual(door.pageAsks.count, 2, "the layout pass asks nothing more")
        door.answerPage(.success(Base.page(from: 3_100, count: 100, depth: 3_200)))
        await settle()
        XCTAssertTrue((3_143..<3_200).allSatisfy { history.layout.row(at: $0, picture: nil)?.label == Base.label($0) }, "filled within one round trip")
        clock.advance(by: ScrollbackModel.outrunGap + .milliseconds(500))
        await settle()
        history.picture(Self.numbered(depth: 3_500))
        history.viewed(top: 3_443, bottom: 3_540, atBottom: true)
        await settle()
        XCTAssertEqual(door.pageAsks.count, 3, "a second flood past outrunGap later is lone too")
        door.answerPage(.success(Base.page(from: 3_400, count: 100, depth: 3_500)))
        await settle()
        clock.advance(by: .milliseconds(300))
        await settle()
        history.picture(Self.numbered(depth: 3_800))
        history.viewed(top: 3_743, bottom: 3_840, atBottom: true)
        await settle()
        XCTAssertEqual(door.pageAsks.count, 3, "a flood 0.3 s after the last: held")
        clock.advance(by: ScrollbackModel.outrunGap - .milliseconds(10))
        await settle()
        XCTAssertEqual(door.pageAsks.count, 3, "not before outrunGap after it")
        clock.advance(by: .milliseconds(10))
        await settle()
        XCTAssertEqual(door.pageAsks.count, 4)
        XCTAssertEqual(door.pageAsks.last, ScriptedScreenDoor.PageAsked(from: 3_700, count: 100, depth: 3_800, wrap: Base.wrap, keep: .bottom))
    }

    /// Clause (the verify's straddle, the fix round): pictures a tenth of a
    /// second apart that scroll 45 and 35 lines in turn, past and under the
    /// screen's 40, for three seconds, with every page the model asks
    /// answered at once. The build the verify read carried on one picture and
    /// dropped on the next: strips of about 30 rows flashing above the prompt
    /// 9 to 98 times a minute. Here every row drawn stays drawn until a page
    /// replaces it with tmux's own line; the band above the prompt never goes
    /// blank, and each picture leaves no more than five lines no picture
    /// showed in view; and the Mac is asked at most the lone first picture's
    /// page while it lasts, then the one page that fills the holes once the
    /// output has calmed.
    func testOutputNearAScreenAPictureKeepsTheBandAndNeverFlashes() async throws {
        let door = ScriptedScreenDoor()
        let history = model(door)
        history.picture(Self.numbered(depth: 3_000))
        history.fill(rows: Self.fill)
        history.viewed(top: 2_943, bottom: 3_040, atBottom: true)
        await settle()
        door.answerPage(.success(Base.page(from: 2_900, count: 100, depth: 3_000)))
        await settle()
        let asked = door.pageAsks.count
        var depth = 3_000
        var leastDrawn = Self.fill
        for step in 0..<30 {
            clock.advance(by: .milliseconds(100))
            await settle()
            let before = history.layout.held
            depth += step % 2 == 0 ? 45 : 35
            history.picture(Self.numbered(depth: depth))
            history.fill(rows: Self.fill)
            history.viewed(top: depth - Self.fill, bottom: depth + Self.rows, atBottom: true)
            await settle()
            if let ask = history.asking {
                door.answerPage(.success(Base.page(from: ask.from, count: ask.count, depth: depth)))
                await settle()
            }
            for (index, row) in before where index >= history.layout.lo {
                XCTAssertEqual(history.layout.row(at: index, picture: nil)?.label, row.row.label, "step \(step): row \(index) taken away or changed")
            }
            let drawn = ((depth - Self.fill)..<depth).filter { history.layout.held[$0] != nil }.count
            leastDrawn = min(leastDrawn, drawn)
        }
        XCTAssertGreaterThanOrEqual(leastDrawn, Self.fill - 10, "the band above the prompt never went blank")
        XCTAssertLessThanOrEqual(door.pageAsks.count - asked, 1, "the Mac asked at most the lone first picture's page while the output lasted")
        XCTAssertTrue(history.layout.held.allSatisfy { $0.value.row.label == Base.label($0.key) })
        let calm = door.pageAsks.count
        clock.advance(by: ScrollbackModel.outrunGap)
        await settle()
        XCTAssertEqual(door.pageAsks.count, calm + 1, "calm: the one page that fills the holes")
        let ask = try XCTUnwrap(history.asking)
        door.answerPage(.success(Base.page(from: ask.from, count: ask.count, depth: depth)))
        await settle()
        XCTAssertTrue(((depth - Self.fill)..<depth).allSatisfy { history.layout.row(at: $0, picture: nil)?.label == Base.label($0) }, "every row in view tmux's again")
    }

    /// Clause (the verify's straddle where pictures pass the view, the fix
    /// round): pictures that scroll 60 and 130 lines in turn, one short of the
    /// view and one past it (40 rows and 57 above them). The build the verify
    /// read flashed strips there; carrying every picture would too, a strip
    /// drawn after each short picture and passed after each long one. Here,
    /// from the first picture that passes the view inside `outrunGap` of
    /// another that outran the screen, the rows drawn in view only ever FALL,
    /// scrolling away with the output, to the ground, and stay there while it
    /// lasts; nothing drawn is taken away; and the Mac is asked at most the
    /// lone first picture's page.
    func testOutputThatPassesTheViewNowAndThenGoesToTheGroundOnceAndStays() async throws {
        let door = ScriptedScreenDoor()
        let history = model(door)
        history.picture(Self.numbered(depth: 3_000))
        history.fill(rows: Self.fill)
        history.viewed(top: 2_943, bottom: 3_040, atBottom: true)
        await settle()
        door.answerPage(.success(Base.page(from: 2_900, count: 100, depth: 3_000)))
        await settle()
        let asked = door.pageAsks.count
        var depth = 3_000
        var drawnBefore = Self.fill
        var rose: [Int] = []
        for step in 0..<30 {
            clock.advance(by: .milliseconds(150))
            await settle()
            let before = history.layout.held
            depth += step % 2 == 0 ? 60 : 130
            history.picture(Self.numbered(depth: depth))
            history.fill(rows: Self.fill)
            history.viewed(top: depth - Self.fill, bottom: depth + Self.rows, atBottom: true)
            await settle()
            if let ask = history.asking {
                door.answerPage(.success(Base.page(from: ask.from, count: ask.count, depth: depth)))
                await settle()
            }
            for (index, row) in before where index >= history.layout.lo {
                XCTAssertEqual(history.layout.row(at: index, picture: nil)?.label, row.row.label, "step \(step): row \(index) taken away or changed")
            }
            let drawn = ((depth - Self.fill)..<depth).filter { history.layout.held[$0] != nil }.count
            if step >= 2, drawn > drawnBefore { rose.append(step) }
            drawnBefore = drawn
        }
        XCTAssertEqual(rose, [], "once a picture passed the view inside the gap, the rows drawn in view only fell: no strip flashed back")
        XCTAssertEqual(drawnBefore, 0, "the rows above the prompt went to the ground and stayed there")
        XCTAssertLessThanOrEqual(door.pageAsks.count - asked, 1, "the Mac asked at most the lone first picture's page while the output lasted")
        XCTAssertTrue(history.layout.held.allSatisfy { $0.value.row.label == Base.label($0.key) })
    }

    /// Clause (the fix round): once a picture passed the view inside a
    /// burst, the carry stays stopped while the output keeps outrunning the
    /// screen, even by less than the view, for longer than `outrunGap` after
    /// that pass: carrying again under it would draw a strip the next pass
    /// takes away. Only `outrunGap` after the last picture that outran the
    /// screen does the one page fill the view and carrying resume.
    func testAPassKeepsTheCarryStoppedWhileTheOutputKeepsOutrunningTheScreen() async throws {
        let door = ScriptedScreenDoor()
        let history = model(door)
        history.picture(Self.numbered(depth: 3_000))
        history.fill(rows: Self.fill)
        history.viewed(top: 2_943, bottom: 3_040, atBottom: true)
        await settle()
        door.answerPage(.success(Base.page(from: 2_900, count: 100, depth: 3_000)))
        await settle()
        var depth = 3_000
        for k in [60, 130] {
            clock.advance(by: .milliseconds(300))
            await settle()
            depth += k
            history.picture(Self.numbered(depth: depth))
            history.fill(rows: Self.fill)
            history.viewed(top: depth - Self.fill, bottom: depth + Self.rows, atBottom: true)
            await settle()
            if let ask = history.asking {
                // The lone first's page, answered at once.
                door.answerPage(.success(Base.page(from: ask.from, count: ask.count, depth: depth)))
                await settle()
            }
        }
        let held = door.pageAsks.count
        for step in 0..<12 {
            clock.advance(by: .milliseconds(300))
            await settle()
            let before = history.layout.held
            depth += 60
            history.picture(Self.numbered(depth: depth))
            history.fill(rows: Self.fill)
            history.viewed(top: depth - Self.fill, bottom: depth + Self.rows, atBottom: true)
            await settle()
            XCTAssertTrue(before.allSatisfy { history.layout.held[$0.key] == $0.value }, "step \(step): a drawn row was taken away")
            XCTAssertTrue(((depth - 60)..<depth).allSatisfy { history.layout.held[$0] == nil }, "step \(step), \(String(300 * (step + 1))) ms after the pass: still outrunning, nothing carried")
        }
        XCTAssertEqual(door.pageAsks.count, held, "nothing asked while the output kept outrunning the screen")
        clock.advance(by: ScrollbackModel.outrunGap)
        await settle()
        XCTAssertEqual(door.pageAsks.count, held + 1, "calm: the one page that fills the view")
        let ask = try XCTUnwrap(history.asking)
        XCTAssertEqual(ask.from, depth - 100, "the live top's page")
        door.answerPage(.success(Base.page(from: ask.from, count: ask.count, depth: depth)))
        await settle()
        XCTAssertTrue(((depth - Self.fill)..<depth).allSatisfy { history.layout.row(at: $0, picture: nil)?.label == Base.label($0) }, "every row in view tmux's")
        clock.advance(by: .milliseconds(100))
        await settle()
        history.picture(Self.numbered(depth: depth + 3))
        XCTAssertEqual((depth..<(depth + 3)).map { history.layout.held[$0]?.carried }, [true, true, true], "calm again: carried at once")
    }

    /// Clause (the fix round): the layout handed `carrying: false` carries
    /// nothing, at any count of lines: every new line is a hole under `hi`,
    /// which moves to the new live top, every row held stays held, and the
    /// picture is counted only when it outran the screen.
    func testWithCarryingOffEveryNewLineIsAHoleAndNothingHeldGoes() throws {
        var layout = try filledAndPaged(depth: 3_000)
        let before = layout.held
        layout.picture(Self.numbered(depth: 3_010), holds: { _ in true }, carrying: false)
        XCTAssertTrue((3_000..<3_010).allSatisfy { layout.held[$0] == nil }, "ten lines, none carried")
        XCTAssertEqual(layout.hi, 3_010)
        XCTAssertEqual(layout.live, 3_010)
        XCTAssertEqual(layout.outruns, 0, "ten lines are no outrun")
        layout.picture(Self.numbered(depth: 3_070), holds: { _ in true }, carrying: false)
        XCTAssertTrue((3_010..<3_070).allSatisfy { layout.held[$0] == nil })
        XCTAssertEqual(layout.hi, 3_070)
        XCTAssertEqual(layout.outruns, 1, "sixty lines are")
        XCTAssertTrue(before.allSatisfy { layout.held[$0.key] == $0.value }, "nothing held goes")
        XCTAssertNotNil(layout.space)
        layout.picture(Self.numbered(depth: 3_073), holds: { _ in true })
        XCTAssertEqual((3_070..<3_073).map { layout.held[$0]?.carried }, [true, true, true], "carrying again beside the holes")
    }

    /// Clause (the fix round): the hold is following's alone. While output
    /// outruns the screen, a drag off the bottom enters scrolled, and its
    /// page goes at 337.1's quarter second, not when the hold ends.
    func testTheHoldIsFollowingsAlone() async throws {
        let door = ScriptedScreenDoor()
        let history = model(door)
        history.picture(Self.numbered(depth: 3_000))
        history.fill(rows: Self.fill)
        history.viewed(top: 2_943, bottom: 3_040, atBottom: true)
        await settle()
        door.answerPage(.success(Base.page(from: 2_900, count: 100, depth: 3_000)))
        await settle()
        var depth = 3_000
        for _ in 0..<2 {
            clock.advance(by: .milliseconds(300))
            await settle()
            depth += 60
            history.picture(Self.numbered(depth: depth))
            history.fill(rows: Self.fill)
            history.viewed(top: depth - Self.fill, bottom: depth + Self.rows, atBottom: true)
            await settle()
        }
        XCTAssertEqual(history.layout.outruns, 2)
        // The lone first picture's page, answered.
        let lone = try XCTUnwrap(history.asking)
        door.answerPage(.success(Base.page(from: lone.from, count: lone.count, depth: depth)))
        await settle()
        let asked = door.pageAsks.count
        history.fill(rows: Self.fill)
        history.viewed(top: depth - Self.fill, bottom: depth + Self.rows, atBottom: true)
        await settle()
        XCTAssertEqual(door.pageAsks.count, asked, "following, inside the hold: nothing asked")
        history.viewed(top: depth - 150, bottom: depth - 50, atBottom: false)
        XCTAssertEqual(history.mode, .scrolled)
        clock.advance(by: .milliseconds(250))
        await settle()
        XCTAssertGreaterThan(door.pageAsks.count, asked, "scrolled pages at 337.1's pace, inside the hold")
    }

    /// Clause (D31 with D5): carried rows are drawn rows, so a selection over
    /// them draws Copy at once, and copies what the terminal showed.
    func testCarriedRowsAreDrawnForCopy() throws {
        let history = ScrollbackModel(door: ScriptedScreenDoor(), holds: { _ in true })
        history.picture(Self.numbered(depth: 3_000))
        history.fill(rows: Self.fill)
        let picture = Self.numbered(depth: 3_003)
        history.picture(picture)
        let carried = ScreenSelectionRange(start: ScreenPoint(row: 3_000, column: 0), end: ScreenPoint(row: 3_002, column: 6))
        XCTAssertTrue(history.drawn(carried, picture: picture))
        let text = ScreenSelecting.text(carried, columns: Base.wrap) { history.row(at: $0, picture: picture) }
        XCTAssertEqual(text.components(separatedBy: "\n"), [Base.label(3_000), Base.label(3_001), Base.label(3_002)])
        let reserved = ScreenSelectionRange(start: ScreenPoint(row: 2_950, column: 0), end: ScreenPoint(row: 3_001, column: 3))
        XCTAssertFalse(history.drawn(reserved, picture: picture), "a reserved row waits for its page")
    }
}

/// A seeded generator, so the property test is the same run every time.
private struct SplitMix: RandomNumberGenerator {
    var state: UInt64

    init(seed: UInt64) {
        state = seed
    }

    mutating func next() -> UInt64 {
        state &+= 0x9E37_79B9_7F4A_7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        return z ^ (z >> 31)
    }
}
