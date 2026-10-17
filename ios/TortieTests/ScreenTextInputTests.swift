import SwiftUI
import UIKit
import XCTest
@testable import Tortie

/// The Terminal's text, to UIKit's own selection (Phase 337.5,
/// build/p3375/SPEC.md D1 to D17 and section 7.2), mounted in the host app's
/// own window as ScreenScrollerTests mounts the scroll view, at the 337
/// build's geometry (120 columns by 40 rows at the fitted 6.67 pt row in a
/// 758 pt view), over the committed Claude Code screen
/// (build/fixtures/screen/sample-claude-2.1.287.json) placed at a depth of
/// 3,000 lines of history: a long press selects the word under it, a path
/// whole; the selection's rectangles are the Terminal's own by absolute index
/// and follow their rows across a page reserved above and an eviction; the
/// edit menu is exactly Copy over drawn rows and empty over a reserved one,
/// and a menu owed over a reserved row is shown by the layout pass that finds
/// it drawn; Copy calls the page's copy once; the content view holds UIKit's
/// display and menu interactions alone, no full text interaction anywhere,
/// never becomes first responder, answers Writing Tools off and takes no
/// words, and answers that it is no accessibility element, no trait and no
/// value (D20); a press that begins on a handle takes it (D5); and through
/// the real page, a selection beginning holds the picture and stops the
/// history evicting, and a clear lets both go. Nothing reaches a network. Each test names the
/// clause it holds and fails when that clause is taken out of
/// Screens/ScreenTextInput.swift, Screens/ScreenScroller.swift or
/// Screens/Screen.swift.
@MainActor
final class ScreenTextInputTests: XCTestCase {
    private var window: UIWindow?
    private var selections: [ScreenSelectionRange?] = []
    private var copies = 0

    override func tearDown() async throws {
        window?.isHidden = true
        window?.rootViewController = nil
        window = nil
        selections = []
        copies = 0
    }

    private static let width: CGFloat = 402
    private static let height: CGFloat = 758
    private static let top: CGFloat = 116
    private static let depth = 3_000
    private static let space = "5eed0123abcd"

    // MARK: The committed screen, with history

    /// The committed Claude Code screen as a door answer, its index space
    /// moved to `depth` lines of history.
    static func committedAnswer(depth: Int = depth) throws -> [String: Any] {
        let data = try Data(contentsOf: StyleSource.root.appendingPathComponent("build/fixtures/screen/sample-claude-2.1.287.json"))
        var answer = try XCTUnwrap(try JSONSerialization.jsonObject(with: data) as? [String: Any])
        var screen = try XCTUnwrap(answer["screen"] as? [String: Any])
        screen["depth"] = depth
        screen["space"] = space
        answer["screen"] = screen
        return answer
    }

    /// The committed screen as the picture the phone draws.
    static func committedPicture(depth: Int = depth) throws -> ScreenPicture {
        let answer = try ScreenSample.decode(committedAnswer(depth: depth))
        return ScreenPicture(try XCTUnwrap(answer.screen), revision: answer.revision)
    }

    /// History line `index`, as a page brings it: path-shaped.
    nonisolated static func historyLine(_ index: Int) -> String {
        "L\(index) /usr/local/bin/tool-\(index) --flag=\(index % 7) done."
    }

    /// The page the Mac answers to `ask`.
    static func page(_ ask: ScrollbackAsk) -> PocketScrollbackAnswer {
        let rows = (ask.from..<(ask.from + ask.count)).map { index -> [PocketScreenRun] in
            let words = historyLine(index)
            return [PocketScreenRun(text: words, runStyle: 0, runCells: words.count)]
        }
        return PocketScrollbackAnswer(
            sessionId: "s", at: 1_791_158_400_000, pageFrom: ask.from, pageDepth: ask.depth, pageWrap: ask.wrap,
            space: space, styles: [ScreenScrollerTests.style], rows: rows, why: nil, sentence: nil
        )
    }

    // MARK: Mounting

    /// A scroll view over the committed screen at `depth`, in a window of the
    /// host app's scene, laid out; its page's side recorded and, as the page
    /// does, its selection handed back to the scroll view.
    private func mounted() throws -> (ScreenScrollView, ScrollbackModel) {
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
        let window = scene.map { UIWindow(windowScene: $0) } ?? UIWindow(frame: CGRect(x: 0, y: 0, width: Self.width, height: 874))
        window.frame = CGRect(x: 0, y: 0, width: Self.width, height: 874)
        let host = UIViewController()
        window.rootViewController = host
        window.makeKeyAndVisible()
        self.window = window
        let history = ScrollbackModel(door: ScriptedScreenDoor(), holds: { _ in true })
        let view = ScreenScrollView(scrollback: history)
        view.frame = CGRect(x: 0, y: Self.top, width: Self.width, height: Self.height)
        view.actions = ScreenScrollerActions(
            tap: { _ in },
            select: { [weak self, weak view] range in
                self?.selections.append(range)
                view?.selection = range
            },
            copy: { [weak self] in self?.copies += 1 },
            overlap: { _ in }
        )
        host.view.addSubview(view)
        let picture = try Self.committedPicture()
        history.picture(picture)
        view.picture = picture
        view.layoutIfNeeded()
        return (view, history)
    }

    /// The middle of cell `column` of row `index`, in the content's points.
    private func point(_ view: ScreenScrollView, row index: Int, column: Int) -> CGPoint {
        let cell = view.cell
        let first = view.contentView.geometry.first
        return CGPoint(x: (CGFloat(column) + 0.5) * cell.width, y: (CGFloat(index - first) + 0.5) * cell.height)
    }

    /// A long press on a cell, as the scroll view's recogniser hands it: it
    /// begins there, moves to `to` when given, and lifts.
    private func press(_ view: ScreenScrollView, row: Int, column: Int, to: (Int, Int)? = nil, lift: Bool = true) {
        let at = point(view, row: row, column: column)
        view.contentView.press(.began, at: at, hit: view.point(at: at))
        if let to {
            let moved = point(view, row: to.0, column: to.1)
            view.contentView.press(.changed, at: moved, hit: view.point(at: moved))
        }
        if lift {
            let end = to.map { point(view, row: $0.0, column: $0.1) } ?? at
            view.contentView.press(.ended, at: end, hit: view.point(at: end))
        }
    }

    private func spin(_ seconds: Double = 0.3) {
        RunLoop.main.run(until: Date().addingTimeInterval(seconds))
    }

    /// The live row whose text holds `needle`, and the column it starts at.
    private func liveRow(holding needle: String, in view: ScreenScrollView, _ history: ScrollbackModel) throws -> (index: Int, column: Int, cells: [String]) {
        let picture = try XCTUnwrap(view.picture)
        for (r, row) in picture.rows.enumerated() {
            for column in row.cells.indices where row.cells[column...].joined().hasPrefix(needle) {
                return (history.layout.live + r, column, row.cells)
            }
        }
        throw XCTSkip("the committed screen holds no \(needle)")
    }

    // MARK: A press selects a word (D3, D4)

    /// Clause (D3, D4): a long press on the committed screen's path selects
    /// the path whole, from any cell of it, by absolute index; the page is
    /// told the word, the handles and the highlight are UIKit's (the display
    /// interaction activated), and the menu shows when the finger lifts.
    func testAPressSelectsTheWordUnderIt() throws {
        let (view, history) = try mounted()
        let needle = "/private/tmp/p318cap-claude-71621/proj-claude"
        let found = try liveRow(holding: needle, in: view, history)
        XCTAssertEqual(found.cells[found.column], "/", "the path starts where its text does (one cell a character on this row)")
        press(view, row: found.index, column: found.column + 9)
        let selected = try XCTUnwrap(view.selection)
        XCTAssertEqual(selected.start, ScreenPoint(row: found.index, column: found.column))
        XCTAssertEqual(selected.end, ScreenPoint(row: found.index, column: found.column + needle.count - 1))
        XCTAssertEqual(selections, [selected], "the page is told the word once")
        let picture = try XCTUnwrap(view.picture)
        XCTAssertEqual(ScreenSelecting.text(selected, columns: picture.columns) { history.row(at: $0, picture: picture) }, needle)
        XCTAssertEqual(view.contentView.displayInteraction?.isActivated, true, "UIKit's handles and highlight")
        // A press and a slide along the row: the word and the cells to the
        // finger. Each press starts from no selection: with one held, a press
        // within reach of its handle takes the handle (D5, the fix round,
        // testAPressThatBeginsOnAHandleTakesIt).
        view.actions?.select(nil)
        press(view, row: found.index, column: found.column + 3, to: (found.index + 2, 5))
        XCTAssertEqual(view.selection, ScreenSelectionRange(start: ScreenPoint(row: found.index, column: found.column), end: ScreenPoint(row: found.index + 2, column: 5)))
        // A slide back before the word moves the start, the word kept.
        view.actions?.select(nil)
        press(view, row: found.index, column: found.column + 3, to: (found.index, 2))
        XCTAssertEqual(view.selection, ScreenSelectionRange(start: ScreenPoint(row: found.index, column: 2), end: ScreenPoint(row: found.index, column: found.column + needle.count - 1)))
    }

    // MARK: The rectangles (D2, D12)

    /// Clause (D2, D12): the selection's rectangles are `ScreenSelecting.rects`
    /// by absolute index from the layout's first row, one per row, the first
    /// holding the start and the last the end; after a page reserved above
    /// they follow their rows (each still where it was on screen), and after
    /// an eviction that moves the first index with the content's size
    /// unchanged, UIKit's own highlight follows them only because the layout
    /// pass's `laidOut()` asks it to read them again.
    func testTheRectanglesFollowTheirRowsByAbsoluteIndex() throws {
        let (view, history) = try mounted()
        let content = view.contentView
        let live = history.layout.live
        press(view, row: live + 5, column: 10, to: (live + 7, 30))
        let selected = try XCTUnwrap(view.selection)
        XCTAssertEqual(selected.start.row, live + 5)
        XCTAssertEqual(selected.end.row, live + 7)
        func rects() throws -> [UITextSelectionRect] {
            content.selectionRects(for: try XCTUnwrap(content.selectedTextRange))
        }
        let before = try rects()
        XCTAssertEqual(before.map(\.rect), ScreenSelecting.rects(selected, cell: view.cell, columns: 120, first: history.layout.firstRow))
        XCTAssertEqual(before.map(\.containsStart), [true, false, false])
        XCTAssertEqual(before.map(\.containsEnd), [false, false, true])
        XCTAssertTrue(before.allSatisfy { !$0.isVertical && $0.writingDirection == .leftToRight })
        XCTAssertEqual(content.firstRect(for: try XCTUnwrap(content.selectedTextRange)), before[0].rect)
        // A page reserved above: the first index moves up, the rows stay
        // where the drag put them.
        let first = history.layout.firstRow
        view.contentOffset = CGPoint(x: 0, y: view.contentOffset.y - 40)
        let onScreen = before[0].rect.minY - view.contentOffset.y
        view.layoutIfNeeded()
        XCTAssertLessThan(history.layout.firstRow, first, "no page reserved above")
        XCTAssertEqual(content.geometry.first, history.layout.firstRow, "the layout pass did not hand the content its first index")
        XCTAssertEqual(content.geometry.cell, view.cell)
        XCTAssertEqual(content.geometry.columns, 120)
        let after = try rects()
        XCTAssertEqual(after.map(\.rect), ScreenSelecting.rects(selected, cell: view.cell, columns: 120, first: history.layout.firstRow))
        XCTAssertEqual(after[0].rect.minY - view.contentOffset.y, onScreen, accuracy: 0.5, "the selection moved on screen")
        content.layoutIfNeeded()
        spin()
        XCTAssertTrue(same(highlighted(content), after.map(\.rect)), "UIKit's highlight is not on the selected rows: \(highlighted(content))")
        // An eviction: the first index moves, the content's size does not.
        let size = content.bounds.size
        let moved = ScreenTextGeometry(cell: content.geometry.cell, first: content.geometry.first + 7, columns: 120, rows: content.geometry.rows - 7)
        content.geometry = moved
        content.layoutIfNeeded()
        spin()
        XCTAssertEqual(content.bounds.size, size)
        XCTAssertTrue(same(highlighted(content), after.map(\.rect)), "UIKit read the rectangles again by itself; laidOut() would not be needed")
        XCTAssertFalse(same(highlighted(content), try rects().map(\.rect)))
        content.laidOut()
        content.layoutIfNeeded()
        spin()
        XCTAssertTrue(same(highlighted(content), try rects().map(\.rect)), "laidOut() did not ask UIKit to read the rectangles again: \(highlighted(content))")
        XCTAssertEqual(try rects().first?.rect.minY, (CGFloat(selected.start.row - moved.first)) * view.cell.height, "a rectangle not placed by absolute index")
    }

    /// UIKit's highlight view's rectangles, as it draws them now.
    private func highlighted(_ content: ScreenTextContent) -> [CGRect] {
        content.displayInteraction?.highlightView.selectionRects.map(\.rect) ?? []
    }

    /// Two lists of rectangles alike within a hundredth of a point (UIKit
    /// keeps its own sums, a last bit off).
    private func same(_ a: [CGRect], _ b: [CGRect]) -> Bool {
        a.count == b.count && zip(a, b).allSatisfy { x, y in
            abs(x.minX - y.minX) < 0.01 && abs(x.minY - y.minY) < 0.01 && abs(x.width - y.width) < 0.01 && abs(x.height - y.height) < 0.01
        }
    }

    /// Clause (D15): UIKit's highlight is drawn ABOVE the rows' opaque
    /// ground, in the content view, tinted by the accent.
    func testTheHighlightIsAboveTheRows() throws {
        let (view, history) = try mounted()
        press(view, row: history.layout.live + 2, column: 20)
        view.contentView.layoutIfNeeded()
        spin()
        let content = view.contentView
        let highlight = try XCTUnwrap(content.displayInteraction?.highlightView)
        XCTAssertEqual(content.tintColor, Token.accent.uiColor)
        var drawnIn: UIView? = highlight
        while let v = drawnIn, v.superview !== content { drawnIn = v.superview }
        let container = try XCTUnwrap(drawnIn, "the highlight is not inside the content view")
        print("P3375_SELECT|subviews|\(content.subviews.map { String(describing: type(of: $0)) })|highlight in \(String(describing: type(of: container)))")
        let rows = try XCTUnwrap(content.subviews.first { String(describing: type(of: $0)).contains("Hosting") }, "no rows hosted in the content view")
        let place = try XCTUnwrap(content.subviews.firstIndex(of: container))
        let ground = try XCTUnwrap(content.subviews.firstIndex(of: rows))
        XCTAssertGreaterThan(place, ground, "the highlight is under the rows' opaque ground")
        let handles = try XCTUnwrap(content.displayInteraction?.handleViews)
        XCTAssertEqual(handles.count, 2, "UIKit's two handles")
        for handle in handles {
            var top: UIView? = handle
            while let v = top, v.superview !== content { top = v.superview }
            let at = try XCTUnwrap(top.flatMap { content.subviews.firstIndex(of: $0) }, "a handle is not inside the content view")
            XCTAssertGreaterThan(at, ground, "a handle is under the rows' opaque ground")
        }
    }

    // MARK: The menu (D8, D10, D14)

    private func menu(_ content: ScreenTextContent) throws -> UIMenu {
        let interaction = try XCTUnwrap(content.menuInteraction)
        let suggested: [UIMenuElement] = [
            UIAction(title: "Share", identifier: UIAction.Identifier("p3375-share")) { _ in },
            UICommand(title: "Copy", action: #selector(UIResponderStandardEditActions.copy(_:))),
            UIMenu(title: "", options: .displayInline, children: [UIAction(title: "Translate") { _ in }]),
        ]
        return try XCTUnwrap(content.editMenuInteraction(interaction, menuFor: UIEditMenuConfiguration(identifier: nil, sourcePoint: .zero), suggestedActions: suggested))
    }

    /// Clause (D8, D10, D14): over drawn rows the menu is exactly one action,
    /// titled Copy's word, identified `screen-copy` both ways, with nothing
    /// the system suggested; over a reserved row it is empty and its showing
    /// is owed; and Copy's press calls the page's copy once.
    func testTheMenuIsCopyAloneAndOnlyOverDrawnRows() throws {
        let (view, history) = try mounted()
        let content = view.contentView
        let live = history.layout.live
        press(view, row: live + 2, column: 20)
        let drawn = try menu(content)
        XCTAssertEqual(drawn.children.count, 1, "the menu holds \(drawn.children.map(\.title))")
        let copy = try XCTUnwrap(drawn.children.first as? UIAction)
        XCTAssertEqual(copy.title, Copy.copy)
        XCTAssertEqual(copy.identifier.rawValue, ID.screenCopy)
        XCTAssertEqual(copy.accessibilityIdentifier, ID.screenCopy)
        XCTAssertNotNil(copy.image)
        XCTAssertEqual(copies, 0)
        UIButton().sendAction(copy)
        XCTAssertEqual(copies, 1, "Copy's press did not reach the page's copy, or reached it twice")
        // The rows above the live rows are reserved until their page lands.
        XCTAssertTrue(history.layout.held.isEmpty)
        press(view, row: live - 3, column: 4, to: (live + 1, 6))
        let over = try XCTUnwrap(view.selection)
        XCTAssertEqual(over.start.row, live - 3)
        XCTAssertFalse(view.scrollback.drawn(over, picture: view.picture))
        XCTAssertEqual(try menu(content).children.count, 0, "Copy offered over a reserved row")
        XCTAssertTrue(content.owed, "the menu over a reserved row is not owed")
        XCTAssertEqual(copies, 1)
        // The target is the union of the selection's rectangles.
        let target = content.editMenuInteraction(try XCTUnwrap(content.menuInteraction), targetRectFor: UIEditMenuConfiguration(identifier: nil, sourcePoint: .zero))
        let union = ScreenSelecting.rects(over, cell: view.cell, columns: 120, first: history.layout.firstRow).reduce(CGRect.null) { $0.union($1) }
        XCTAssertEqual(target, union)
    }

    /// Clause (D10, D12): a menu asked for over a reserved row is owed, and
    /// the layout pass that finds every selected row drawn shows it with no
    /// touch, Copy in it; a clear owes nothing.
    func testAnOwedMenuIsShownByTheLayoutPassOnceItsRowsLand() throws {
        let (view, history) = try mounted()
        let content = view.contentView
        let live = history.layout.live
        press(view, row: live - 3, column: 4, to: (live + 1, 6))
        spin()
        XCTAssertTrue(content.owed)
        XCTAssertFalse(content.menuShown, "a menu shown over a reserved row")
        let ask = try XCTUnwrap(history.asking ?? history.layout.want(visibleTop: live - 10, visibleBottom: live + 40))
        _ = history.accept(Self.page(ask), for: ask)
        XCTAssertTrue(view.scrollback.drawn(view.selection, picture: view.picture), "the page did not fill the selected rows")
        view.layoutIfNeeded()
        XCTAssertFalse(content.owed, "the layout pass did not pay the owed menu")
        spin(1.0)
        XCTAssertTrue(content.menuShown, "the owed menu was not shown")
        XCTAssertEqual(try menu(content).children.map(\.title), [Copy.copy])
        // A clear dismisses the menu and owes nothing.
        view.selection = nil
        XCTAssertFalse(content.owed)
        XCTAssertEqual(content.displayInteraction?.isActivated, false)
        spin(1.0)
        XCTAssertFalse(content.menuShown, "the menu outlived its selection")
    }

    /// Clause (D10): while a handle drag is under way an owed menu waits for
    /// it, under the finger, and shows when the handle stops; a new press
    /// owes nothing until it lifts.
    func testAnOwedMenuWaitsForTheHandle() throws {
        let (view, history) = try mounted()
        let content = view.contentView
        let live = history.layout.live
        press(view, row: live - 3, column: 4, to: (live + 1, 6))
        XCTAssertTrue(content.owed)
        // The end handle is taken and moved, and the rows land under it.
        let carets = try XCTUnwrap(view.selection?.carets)
        let endCaret = content.caretRect(for: ScreenTextPosition(carets.end))
        XCTAssertTrue(content.grabs(at: CGPoint(x: endCaret.minX, y: endCaret.midY)))
        let lower = point(view, row: live + 3, column: 8)
        content.drag(.began, at: lower, hit: view.point(at: lower))
        let ask = try XCTUnwrap(history.asking ?? history.layout.want(visibleTop: live - 10, visibleBottom: live + 40))
        _ = history.accept(Self.page(ask), for: ask)
        view.layoutIfNeeded()
        spin()
        XCTAssertTrue(content.owed, "the owed menu was paid under the finger")
        XCTAssertFalse(content.menuShown, "a menu shown under the finger")
        content.drag(.ended, at: lower, hit: view.point(at: lower))
        XCTAssertFalse(content.owed)
        spin(1.0)
        XCTAssertTrue(content.menuShown, "the menu did not show when the handle stopped")
        // A new press owes nothing while it is down.
        press(view, row: live + 9, column: 4, lift: false)
        XCTAssertFalse(content.owed, "a new press owes the old menu")
        spin()
        XCTAssertFalse(content.menuShown, "the old menu kept under a new press")
    }

    // MARK: The handles (D5)

    /// Clause (D5): a drag that starts on the end caret moves the end cell by
    /// cell, crossing the start swaps the end it holds, and the menu shows
    /// when it stops.
    func testAHandleDragMovesItsEnd() throws {
        let (view, history) = try mounted()
        let content = view.contentView
        let live = history.layout.live
        press(view, row: live + 5, column: 10)
        let word = try XCTUnwrap(view.selection)
        let carets = try XCTUnwrap(word.carets)
        let endCaret = content.caretRect(for: ScreenTextPosition(carets.end))
        XCTAssertTrue(content.grabs(at: CGPoint(x: endCaret.minX, y: endCaret.midY)))
        let three = point(view, row: live + 8, column: 3)
        content.drag(.began, at: three, hit: view.point(at: three))
        XCTAssertEqual(view.selection, ScreenSelectionRange(start: word.start, end: ScreenPoint(row: live + 8, column: 3)))
        let up = point(view, row: live + 2, column: 0)
        content.drag(.changed, at: up, hit: view.point(at: up))
        XCTAssertEqual(view.selection, ScreenSelectionRange(start: ScreenPoint(row: live + 2, column: 0), end: word.start), "crossing the start")
        content.drag(.ended, at: up, hit: view.point(at: up))
        spin(1.0)
        XCTAssertTrue(content.menuShown, "no menu when the handle stopped")
    }

    /// Clause (D5, the 337.5 fix round, the verifier's H10, V8b and V9b): a
    /// long press that BEGINS on a handle takes that handle, as resting on a
    /// handle longer than the press's 0.45 s before dragging it does. The
    /// selection's other end stays where it was, nothing moves until the
    /// finger does, and the menu shows when it lifts. Before the fix the
    /// press selected the word under the finger and grew it from there, so
    /// the rest of the selection was lost.
    func testAPressThatBeginsOnAHandleTakesIt() throws {
        let (view, history) = try mounted()
        let content = view.contentView
        let live = history.layout.live
        press(view, row: live + 5, column: 10)
        let word = try XCTUnwrap(view.selection)
        let endAt = try XCTUnwrap(word.carets).end
        let endCaret = content.caretRect(for: ScreenTextPosition(endAt))
        XCTAssertTrue(content.grabs(at: CGPoint(x: endCaret.minX, y: endCaret.midY)))
        let three = point(view, row: live + 8, column: 20)
        content.drag(.began, at: three, hit: view.point(at: three))
        content.drag(.ended, at: three, hit: view.point(at: three))
        let before = try XCTUnwrap(view.selection)
        XCTAssertEqual(before, ScreenSelectionRange(start: word.start, end: ScreenPoint(row: live + 8, column: 20)))

        // The end handle: the press begins just right of its caret, where
        // the cell under the finger is the one after the selection.
        let end = content.caretRect(for: ScreenTextPosition(try XCTUnwrap(before.carets).end))
        let onEnd = CGPoint(x: end.minX + 0.5, y: end.midY)
        content.press(.began, at: onEnd, hit: view.point(at: onEnd))
        XCTAssertEqual(view.selection, before, "resting on the end handle moved the selection")
        let down = point(view, row: live + 10, column: 4)
        content.press(.changed, at: down, hit: view.point(at: down))
        XCTAssertEqual(view.selection, ScreenSelectionRange(start: before.start, end: ScreenPoint(row: live + 10, column: 4)), "a press on the end handle did not move the end alone")
        content.press(.ended, at: down, hit: view.point(at: down))
        spin(1.0)
        XCTAssertTrue(content.menuShown, "no menu when the handle was let go")

        // The start handle: the start moves, the end stays.
        let kept = try XCTUnwrap(view.selection)
        let start = content.caretRect(for: ScreenTextPosition(try XCTUnwrap(kept.carets).start))
        let onStart = CGPoint(x: start.minX + 0.5, y: start.midY)
        content.press(.began, at: onStart, hit: view.point(at: onStart))
        XCTAssertEqual(view.selection, kept, "resting on the start handle moved the selection")
        let up = point(view, row: live + 3, column: 7)
        content.press(.changed, at: up, hit: view.point(at: up))
        XCTAssertEqual(view.selection, ScreenSelectionRange(start: ScreenPoint(row: live + 3, column: 7), end: kept.end), "a press on the start handle did not move the start alone")
        content.press(.cancelled, at: up, hit: view.point(at: up))
        XCTAssertEqual(view.selection?.end, kept.end)

        // Far from either handle a press still selects a new word.
        content.press(.began, at: point(view, row: live + 20, column: 2), hit: view.point(at: point(view, row: live + 20, column: 2)))
        XCTAssertEqual(view.selection?.start.row, live + 20, "a press away from the handles did not select where it was")
    }

    /// Clause (D5, D21, the fix round's nit): a caret sits ON its column's
    /// left edge (the end caret one past the end cell), so a handle is taken
    /// at its own caret and not a cell beside it, and a press past `reach`
    /// takes no handle.
    func testAHandleIsTakenAtItsOwnCaret() throws {
        let (view, history) = try mounted()
        let content = view.contentView
        let live = history.layout.live
        press(view, row: live + 20, column: 2)
        let range = try XCTUnwrap(view.selection)
        let carets = try XCTUnwrap(range.carets)
        let cell = view.cell
        let first = content.geometry.first
        for caret in [carets.start, carets.end] {
            let rect = content.caretRect(for: ScreenTextPosition(caret))
            XCTAssertEqual(rect.minX, CGFloat(caret.column) * cell.width, accuracy: 0.001, "a caret off its column's edge")
            XCTAssertEqual(rect.minY, CGFloat(caret.row - first) * cell.height, accuracy: 0.001, "a caret off its row's band")
            XCTAssertTrue(content.grabs(at: CGPoint(x: rect.minX, y: rect.midY)), "a handle not taken at its own caret")
        }
        XCTAssertEqual(carets.end.column, range.end.column + 1, "the end caret is not one past the end cell")
        let past = content.caretRect(for: ScreenTextPosition(carets.end))
        XCTAssertFalse(content.grabs(at: CGPoint(x: past.minX + ScreenTextContent.reach + 30, y: past.midY - ScreenTextContent.reach - 30)), "a press far past reach took a handle")
    }

    // MARK: Never an editor (D9, D17, D20)

    /// Clause (D1, D9, D17, D20): the content view holds UIKit's display and
    /// edit menu interactions and nothing else; no full text interaction
    /// exists anywhere in the window; it never becomes first responder, so
    /// the keyboard's owner keeps the keyboard; it answers Writing Tools off
    /// through the protocol UIKit reads; its mutators change nothing and tell
    /// the page nothing; UIKit cannot set its selection; and it is no
    /// accessibility element, so the rows stay the ones found.
    func testTheContentIsNoEditorAndTakesNoWords() throws {
        let (view, history) = try mounted()
        let content = view.contentView
        XCTAssertEqual(content.interactions.filter { $0 is UITextSelectionDisplayInteraction }.count, 1)
        XCTAssertEqual(content.interactions.filter { $0 is UIEditMenuInteraction }.count, 1)
        // Whatever else is on it is what UIKit's own edit menu interaction
        // brings with it, read from a plain view in the same window.
        let reference = UIView()
        try XCTUnwrap(window).addSubview(reference)
        reference.addInteraction(UIEditMenuInteraction(delegate: nil))
        let menuBrings = Set(reference.interactions.map { String(describing: type(of: $0)) })
        reference.removeFromSuperview()
        let others = content.interactions.filter { !($0 is UITextSelectionDisplayInteraction) }.map { String(describing: type(of: $0)) }
        print("P3375_SELECT|interactions|\(content.interactions.map { String(describing: type(of: $0)) })|the menu brings \(menuBrings.sorted())")
        XCTAssertTrue(Set(others).isSubset(of: menuBrings), "an interaction the edit menu does not bring: \(Set(others).subtracting(menuBrings))")
        var stack: [UIView] = [try XCTUnwrap(window)]
        while let next = stack.popLast() {
            XCTAssertFalse(next.interactions.contains { $0 is UITextInteraction }, "a full text interaction on \(type(of: next))")
            XCTAssertFalse(next.interactions.contains { $0 is UIDragInteraction }, "a drag interaction on \(type(of: next))")
            stack.append(contentsOf: next.subviews)
        }
        XCTAssertFalse(content.canBecomeFirstResponder)
        XCTAssertFalse(content.becomeFirstResponder())
        XCTAssertFalse(content.isFirstResponder)
        // D20 (the fix round): no element, no trait, no value, whatever is
        // set, so iOS's accessibility does not read the Terminal as one text
        // view over every row and the rows inside are what is found.
        content.isAccessibilityElement = true
        content.accessibilityTraits = [.staticText, .updatesFrequently]
        content.accessibilityValue = "every row"
        XCTAssertFalse(content.isAccessibilityElement)
        XCTAssertEqual(content.accessibilityTraits, UIAccessibilityTraits.none)
        XCTAssertNil(content.accessibilityValue)
        let traits: UITextInputTraits = content
        XCTAssertEqual(traits.writingToolsBehavior, UIWritingToolsBehavior.none, "Writing Tools is not off as UIKit reads it")
        content.writingToolsBehavior = .complete
        XCTAssertEqual(content.writingToolsBehavior, UIWritingToolsBehavior.none)
        let live = history.layout.live
        press(view, row: live + 2, column: 20)
        let selected = try XCTUnwrap(view.selection)
        let range = try XCTUnwrap(content.selectedTextRange)
        let text = content.text(in: range)
        XCTAssertNotNil(text)
        let told = selections.count
        content.insertText("rm -rf ~")
        content.deleteBackward()
        content.replace(range, withText: "words")
        content.setMarkedText("marked", selectedRange: NSRange(location: 0, length: 6))
        content.unmarkText()
        content.selectedTextRange = content.textRange(from: content.beginningOfDocument, to: content.endOfDocument)
        XCTAssertEqual(view.selection, selected)
        XCTAssertEqual(content.selection, selected, "UIKit set the selection")
        XCTAssertEqual(content.text(in: try XCTUnwrap(content.selectedTextRange)), text)
        XCTAssertNil(content.markedTextRange)
        XCTAssertEqual(selections.count, told, "a mutator told the page something")
        XCTAssertFalse(content.isFirstResponder)
    }

    /// Clause (D2, D21): UIKit's positions walk the rows laid out by caret,
    /// row by row, a row being the width and one carets long, and stop at the
    /// document's ends.
    func testPositionsWalkTheRowsByCaret() throws {
        let (view, history) = try mounted()
        let content = view.contentView
        let first = history.layout.firstRow
        let start = try XCTUnwrap(content.beginningOfDocument as? ScreenTextPosition)
        XCTAssertEqual(start.caret, ScreenCaret(row: first, column: 0))
        let end = try XCTUnwrap(content.endOfDocument as? ScreenTextPosition)
        XCTAssertEqual(end.caret, ScreenCaret(row: first + content.geometry.rows - 1, column: 120))
        let a = ScreenTextPosition(ScreenCaret(row: first + 2, column: 119))
        let b = try XCTUnwrap(content.position(from: a, offset: 3) as? ScreenTextPosition)
        XCTAssertEqual(b.caret, ScreenCaret(row: first + 3, column: 1), "a row is 121 carets")
        XCTAssertEqual(content.offset(from: a, to: b), 3)
        XCTAssertEqual(content.offset(from: b, to: a), -3)
        XCTAssertEqual(content.compare(a, to: b), .orderedAscending)
        XCTAssertEqual(content.compare(b, to: a), .orderedDescending)
        XCTAssertEqual(content.compare(a, to: ScreenTextPosition(a.caret)), .orderedSame)
        XCTAssertNil(content.position(from: start, offset: -1), "before the document")
        XCTAssertNil(content.position(from: end, offset: 1), "after the document")
        let down = try XCTUnwrap(content.position(from: a, in: .down, offset: 2) as? ScreenTextPosition)
        XCTAssertEqual(down.caret, ScreenCaret(row: first + 4, column: 119))
        XCTAssertNil(content.position(from: start, in: .up, offset: 1))
        let near = try XCTUnwrap(content.closestPosition(to: CGPoint(x: 10.4 * view.cell.width, y: 2.5 * view.cell.height)) as? ScreenTextPosition)
        XCTAssertEqual(near.caret, ScreenCaret(row: first + 2, column: 10))
        let far = try XCTUnwrap(content.closestPosition(to: CGPoint(x: 9_999, y: 99_999)) as? ScreenTextPosition)
        XCTAssertEqual(far.caret, end.caret, "held to what is laid out")
        let cellRange = try XCTUnwrap(content.characterRange(at: CGPoint(x: 10.4 * view.cell.width, y: 2.5 * view.cell.height)) as? ScreenTextRange)
        XCTAssertEqual(cellRange.from.caret, ScreenCaret(row: first + 2, column: 10))
        XCTAssertEqual(cellRange.to.caret, ScreenCaret(row: first + 2, column: 11))
        XCTAssertEqual(content.baseWritingDirection(for: a, in: .forward), .leftToRight)
    }

    // MARK: The page holds the picture (D13)

    /// Clause (D13): through the real page, a selection beginning holds the
    /// picture it began on, and a clear lets it go.
    func testASelectionHoldsThePictureAndAClearLetsItGo() throws {
        let door = ScriptedScreenDoor()
        door.reads = [.success(try ScreenSample.decode(Self.committedAnswer()))]
        let model = ScreenModel(sessionId: "s", door: door, routing: .stay)
        let page = ScreenPage(model: model, keys: nil, name: "s", isTop: true, foregroundTick: 0) {
            EmptyView()
        } tray: {
            EmptyView()
        } trailing: {
            ToolbarItem(placement: .topBarTrailing) { EmptyView() }
        }
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
        let window = scene.map { UIWindow(windowScene: $0) } ?? UIWindow(frame: CGRect(x: 0, y: 0, width: Self.width, height: 874))
        window.frame = CGRect(x: 0, y: 0, width: Self.width, height: 874)
        window.rootViewController = UIHostingController(rootView: NavigationStack { page })
        window.makeKeyAndVisible()
        self.window = window
        var scroller: ScreenScrollView?
        for _ in 0..<50 where scroller == nil || scroller?.picture == nil {
            spin(0.1)
            var stack: [UIView] = [window]
            while let next = stack.popLast() {
                if let found = next as? ScreenScrollView { scroller = found }
                stack.append(contentsOf: next.subviews)
            }
        }
        let view = try XCTUnwrap(scroller, "the page drew no terminal")
        view.layoutIfNeeded()
        XCTAssertFalse(model.selecting)
        let row = view.scrollback.layout.live + 2
        let at = point(view, row: row, column: 20)
        view.contentView.press(.began, at: at, hit: view.point(at: at))
        spin()
        XCTAssertTrue(model.selecting, "a selection beginning did not hold the picture")
        XCTAssertTrue(view.scrollback.selecting, "a selection beginning let the history evict a selected row (D13, the fix round's nit)")
        XCTAssertEqual(view.selection?.start.row, row, "the page did not hand its selection back to the scroll view")
        view.contentView.press(.ended, at: at, hit: view.point(at: at))
        view.actions?.select(nil)
        spin()
        XCTAssertFalse(model.selecting, "a clear did not let the picture go")
        XCTAssertFalse(view.scrollback.selecting, "a clear kept the history from evicting")
        XCTAssertNil(view.selection)
    }
}
