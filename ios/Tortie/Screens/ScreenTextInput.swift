// The Terminal's text, to UIKit's own selection (Phase 337.5,
// build/p3375/SPEC.md D1 to D17, his words "In the Terminal itself"): the
// iPhone's two round handles at a selection's ends, its magnifier under the
// finger, and its edit menu above the selection holding Copy (and, since
// Phase 348, iOS's own Paste where the Mac takes a paste), over rows the
// Terminal draws itself, by their absolute index.
//
// WHY THIS DESIGN, MEASURED (D1, build/p3375/SPEC.md section 14 M1 to M10).
// The content view of the Terminal's scroll view is this view; it adopts
// `UITextInput` over the rows, and three of UIKit's own pieces sit on it:
// `UITextSelectionDisplayInteraction` draws the highlight and the handles,
// `UITextLoupeSession` the magnifier for each press and handle drag, and
// `UIEditMenuInteraction` the menu. The scroll view's long press and ONE
// handle drag drive them (Screens/ScreenScroller.swift). UIKit's full text
// interaction was measured over the same rows on iOS 26.3 and 18.3 and is
// refused: it selects nothing unless its view becomes first responder, and
// without that its own taps swallowed the Terminal's (0 of 2 taps and 0 of 2
// double taps reached it); with it, every long press put the keyboard away,
// its double tap selected a word where the Terminal zooms, a 20 pt drag of a
// handle at the fitted cell moved no row, and its menu was the system's
// suggestions (Copy, Translate and Share, and Look Up, Speak and Writing
// Tools besides), narrowed only through two hooks. This design changes no
// first responder, adds no recogniser the Terminal does not own, and builds
// its menu from nothing.
//
// NOTHING THAT SENDS HIS WORDS ANYWHERE CAN REACH THEM (D8, D9; conformance:ios
// rule al). The menu is built here from nothing: `Copy`, offered only while
// every selected row is drawn, and an empty menu otherwise, which UIKit does
// not show; the system's suggested actions are never read. This view never
// becomes first responder, so no edit command, Look Up, Share or Translate is
// ever offered for it; Writing Tools is off; and the text input's mutators do
// nothing. Copy's press tells the page, whose `copySelection()` writes the
// clipboard through Screens/ScreenSelection.swift alone.
//
// AND PASTE, NATIVELY (Phase 348, build/p348/SPEC.md D39, D40, D42; his ruling
// of 2026-10-18, "i'd like to be able to paste natively"). After Copy, while
// the page says the Mac takes a paste, the menu holds iOS's OWN paste command:
// an app-built `UICommand` with the standard `paste(_:)` selector, which iOS
// honours with no Allow Paste alert (measured on iOS 26.3 and 18.3, with
// another app's text and after a trip to another app). NEVER a `UIAction`
// that reads the pasteboard, which raised the alert on both and blocked its
// read about a minute; and never the system's suggested element. THIS view
// takes the command whoever is first responder (measured: with the keyboard
// up and down the content view took it and the hidden field none), asks
// `hasStrings` in `canPerformAction` alone, reads the clipboard's string once,
// synchronously, in `paste(_:)` alone, and hands it to the page's one paste,
// whose first step is the phone's paste rule. So the clipboard is read only on
// his press, and nothing of it is kept here.
//
// A SELECTION OVER ROWS NOT YET FETCHED WAITS (D10). While a selected row is
// reserved the menu is empty and its showing is OWED; the layout pass that
// finds every selected row drawn, with no press or handle drag under way,
// shows it (`laidOut()`), so Copy never copies a blank line where a line of
// his was.
//
// THE SELECTION IS THE PAGE'S (D13, D14, D17). It is the inclusive range of
// cells the page holds (`ScreenSelectionRange`, absolute indices); UIKit's
// positions are carets between cells (`ScreenCaret`, D2), converted both ways
// by Screens/ScreenSelection.swift. UIKit never sets it: `selectedTextRange`'s
// setter does nothing. The scroll view sets it from the page, and this view's
// own press and handle drag set it as they move, at once, and tell the page,
// whose answer comes back through the scroll view with the same range.
//
// THE ROWS ARE WHAT IS SPOKEN (D20): iOS's accessibility would read this
// view, a `UITextInput`, as one text view over every row, so it answers that
// it is no element, no text area and no value, and the rows inside it are
// found and spoken as before (measured by the 337.5 fix round).
//
// EVERY LAYOUT PASS SAYS WHERE THE ROWS ARE (D12): the scroll view hands this
// view its geometry (the cell, the first index laid out, the width and the
// rows) after it sets its cell, and calls `laidOut()` in the pass that redraws
// the rows, which asks the display interaction to read the selection's
// rectangles again. A page reserved above changes the content's size and
// UIKit would ask again by itself; an eviction can move what the rows are
// without changing it, and then only this call moves the highlight.
//
// ARITHMETIC (D21, conformance:ios rule k): every operator here has a
// `CGFloat(…)` or `Double(…)` operand, and a whole number comes back only
// through `Int(exactly:)` of a finite rounded value or `DoorNumber`.

import UIKit

// MARK: - UIKit's positions, ranges and rectangles

/// A caret, as UIKit's text position.
final class ScreenTextPosition: UITextPosition {
    let caret: ScreenCaret

    init(_ caret: ScreenCaret) {
        self.caret = caret
        super.init()
    }

    override func isEqual(_ object: Any?) -> Bool {
        (object as? ScreenTextPosition)?.caret == caret
    }

    override var hash: Int {
        caret.hashValue
    }
}

/// Two carets, as UIKit's text range, the earlier first.
final class ScreenTextRange: UITextRange {
    let from: ScreenTextPosition
    let to: ScreenTextPosition

    init(_ from: ScreenCaret, _ to: ScreenCaret) {
        self.from = ScreenTextPosition(from)
        self.to = ScreenTextPosition(to)
        super.init()
    }

    override var start: UITextPosition { from }
    override var end: UITextPosition { to }
    override var isEmpty: Bool { from.caret == to.caret }
}

/// One selected row's rectangle, left to right, never vertical.
final class ScreenSelectionRect: UITextSelectionRect {
    private let frame: CGRect
    private let first: Bool
    private let last: Bool

    init(_ frame: CGRect, containsStart: Bool, containsEnd: Bool) {
        self.frame = frame
        first = containsStart
        last = containsEnd
        super.init()
    }

    override var rect: CGRect { frame }
    override var writingDirection: NSWritingDirection { .leftToRight }
    override var containsStart: Bool { first }
    override var containsEnd: Bool { last }
    override var isVertical: Bool { false }
}

/// Where the rows are, from the scroll view's last layout pass (D12): the
/// cell, the absolute index of the first row laid out, the Mac's width and
/// how many rows are laid out.
struct ScreenTextGeometry: Equatable {
    let cell: ScreenCell
    let first: Int
    let columns: Int
    let rows: Int

    /// Nothing laid out yet.
    static let none = ScreenTextGeometry(cell: ScreenCell(fontSize: 1, width: 1, height: 1), first: 0, columns: 0, rows: 0)
}

/// What the selection tells the page: a range made or moved (or nil), that
/// the menu's Copy was pressed, and since Phase 348 whether the Mac takes a
/// paste now and the text of one.
struct ScreenTextEvents {
    let select: @MainActor (ScreenSelectionRange?) -> Void
    let copy: @MainActor () -> Void
    /// Whether the menu offers Paste now (Phase 348, D30): the page's answer,
    /// false by default.
    var pasteOffered: @MainActor () -> Bool = { false }
    /// The menu's Paste was pressed, with the clipboard's text (Phase 348).
    var paste: @MainActor (String) -> Void = { _ in }

    /// Told nothing, until the scroll view sets its own: no Paste offered,
    /// and a paste does nothing.
    static var none: ScreenTextEvents {
        ScreenTextEvents(select: { _ in }, copy: {})
    }
}

// MARK: - The content view

/// The Terminal's content view: every row laid out, drawn by the scroll
/// view's one hosting view inside it, and the text UIKit's selection reads.
@MainActor
final class ScreenTextContent: UIView, UITextInput {
    /// Where the rows are (D12), set by the scroll view in every layout pass.
    var geometry = ScreenTextGeometry.none
    /// The page's selection, set by the scroll view, and by this view's own
    /// press and handle drag as they move; never by UIKit.
    var selection: ScreenSelectionRange?
    /// A row's cells by absolute index, or nil while it is reserved.
    var cells: (Int) -> [String]? = { _ in nil }
    /// Whether every row of a selection is drawn (D10).
    var drawn: (ScreenSelectionRange) -> Bool = { _ in false }
    /// Whether a row's line goes on into the next, by absolute index (Phase
    /// 348, D46), so the text UIKit reads joins as Copy does.
    var wrapped: (Int) -> Bool = { _ in false }
    /// The page's side.
    var events = ScreenTextEvents.none

    /// How near a handle a drag must start to move it (D5): half Apple's
    /// 44-point touch target.
    static let reach: CGFloat = 22

    private(set) var displayInteraction: UITextSelectionDisplayInteraction?
    private(set) var menuInteraction: UIEditMenuInteraction?
    /// The menu was asked for while a selected row was not drawn (D10).
    private(set) var owed = false
    /// The menu is on screen, as UIKit's delegate calls say.
    private(set) var menuShown = false
    /// The word a long press began on (D3).
    private var pressedWord: ScreenSelectionRange?
    /// The end a handle drag holds (D5).
    private var held: ScreenSelectionEnd?
    /// A handle is moving, by the handle drag or by a press that began on it.
    private var dragging = false
    /// The press under way began on a handle, so it moves that end (D5).
    private var pressHolds = false
    private var loupe: UITextLoupeSession?

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        // D15: UIKit's highlight and handles, in the accent.
        tintColor = Token.accent.uiColor
    }

    /// UIKit's two interactions join this view when it first joins a window,
    /// AFTER the scroll view has put the rows' hosting view inside it (D15):
    /// the display interaction adds its highlight and handle views as it is
    /// added, and added here in `init` they sat under the rows' opaque ground
    /// (subviews 0 to 5, the rows at 6, in this phase's own unit test), drawn
    /// and never seen. Added now they sit above it, as the spec step
    /// measured (the highlight at 1, the rows at 0).
    override func didMoveToWindow() {
        super.didMoveToWindow()
        guard window != nil, displayInteraction == nil else { return }
        let display = UITextSelectionDisplayInteraction(textInput: self, delegate: self)
        addInteraction(display)
        displayInteraction = display
        let menu = UIEditMenuInteraction(delegate: self)
        addInteraction(menu)
        menuInteraction = menu
        selectionChanged()
    }

    convenience init() {
        self.init(frame: .zero)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not used")
    }

    // MARK: The rows are what is spoken (D20)

    /// THE ROWS STAY THE ELEMENTS THEY WERE (D20, measured by the 337.5 fix
    /// round with XCUITest on iOS 26.3 and 18.3). iOS's accessibility reads a
    /// view that adopts `UITextInput` as ONE text view whose value is all of
    /// its text, whatever `isAccessibilityElement` was set to: the 337.5
    /// verifier found the Terminal as a single text view, no
    /// `screen-row-<n>` under it, and VoiceOver would have spoken every row
    /// laid out where 337 speaks the rows in view. These three answers are
    /// getters that never ask UIKit's: this view is no element, carries no
    /// text-area trait and no value, so the rows inside it are what is found
    /// and spoken, as at the parent. Their setters keep nothing.
    override var isAccessibilityElement: Bool {
        get { false }
        set {}
    }

    override var accessibilityTraits: UIAccessibilityTraits {
        get { .none }
        set {}
    }

    override var accessibilityValue: String? {
        get { nil }
        set {}
    }

    // MARK: Never an editor (D9, D17)

    override var canBecomeFirstResponder: Bool { false }

    // MARK: iOS's own paste (Phase 348, D39, D40, D42)

    /// The menu's Paste is iOS's own command, offered only while the page
    /// says the Mac takes a paste AND the clipboard holds text (`hasStrings`,
    /// which raises no alert: measured, 0.0 to 5.2 ms). Every other action is
    /// answered as before.
    override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
        if action == #selector(UIResponderStandardEditActions.paste(_:)) {
            return events.pasteOffered() && UIPasteboard.general.hasStrings
        }
        return super.canPerformAction(action, withSender: sender)
    }

    /// The command itself, on his press: the clipboard's text read once,
    /// synchronously, and handed to the page's one paste, which asks the
    /// phone's paste rule first. Nothing else; nothing is kept.
    override func paste(_ sender: Any?) {
        guard let payload = UIPasteboard.general.string else { return }
        events.paste(payload)
    }

    /// Writing Tools is off. A get-only property only "nearly matches" the
    /// optional requirement and is not taken (build/p3375/SPEC.md section 14),
    /// so it has a setter that keeps nothing.
    var writingToolsBehavior: UIWritingToolsBehavior {
        get { .none }
        set {}
    }

    var hasText: Bool { true }

    func insertText(_ text: String) {}

    func deleteBackward() {}

    func replace(_ range: UITextRange, withText text: String) {}

    var markedTextRange: UITextRange? { nil }

    var markedTextStyle: [NSAttributedString.Key: Any]?

    func setMarkedText(_ markedText: String?, selectedRange: NSRange) {}

    func unmarkText() {}

    weak var inputDelegate: UITextInputDelegate?

    lazy var tokenizer: UITextInputTokenizer = UITextInputStringTokenizer(textInput: self)

    var textInputView: UIView { self }

    // MARK: The selection, as UIKit reads it

    var selectedTextRange: UITextRange? {
        get { selection?.carets.map { ScreenTextRange($0.start, $0.end) } }
        set {}
    }

    func text(in range: UITextRange) -> String? {
        guard let selected = cellsOf(range) else { return nil }
        return ScreenSelecting.text(selected, columns: geometry.columns, cells: cells, wrapped: wrapped)
    }

    /// The cells a UIKit range covers, or nil when it covers none.
    private func cellsOf(_ range: UITextRange) -> ScreenSelectionRange? {
        guard let range = range as? ScreenTextRange else { return nil }
        return ScreenSelectionRange.between(range.from.caret, range.to.caret, columns: geometry.columns)
    }

    // MARK: Geometry, in this view's points (the content's)

    /// One rectangle per selected row, through `ScreenSelecting.rects`' own
    /// arithmetic: row `index - first` down, column times width across.
    func selectionRects(for range: UITextRange) -> [UITextSelectionRect] {
        let rects = ScreenSelecting.rects(cellsOf(range), cell: geometry.cell, columns: geometry.columns, first: geometry.first)
        return rects.indices.map { place in
            ScreenSelectionRect(rects[place], containsStart: place == rects.indices.first, containsEnd: place == rects.indices.last)
        }
    }

    func firstRect(for range: UITextRange) -> CGRect {
        selectionRects(for: range).first?.rect ?? .null
    }

    /// A caret's rectangle: its column times the width across, its row's band
    /// down, at least a point wide.
    func caretRect(for position: UITextPosition) -> CGRect {
        guard let caret = (position as? ScreenTextPosition)?.caret else { return .null }
        let cell = geometry.cell
        let down = CGFloat(caret.row) - CGFloat(geometry.first)
        return CGRect(
            x: CGFloat(caret.column) * cell.width, y: CGFloat(down) * cell.height,
            width: max(CGFloat(1.0), CGFloat(cell.width) * 0.2), height: cell.height
        )
    }

    /// The caret nearest a point: the row under it from the first laid out,
    /// the column rounded to the nearest caret, both held to what is laid out.
    func closestPosition(to point: CGPoint) -> UITextPosition? {
        let cell = geometry.cell
        guard geometry.rows > 0, cell.width > 0, cell.height > 0, point.x.isFinite, point.y.isFinite else { return nil }
        let down = (Double(point.y) / Double(cell.height)).rounded(.down)
        let across = (Double(point.x) / Double(cell.width)).rounded()
        let place = min(max(down, 0), Double(geometry.rows) - 1.0)
        let column = min(max(across, 0), Double(geometry.columns))
        guard let rowsDown = Int(exactly: place), let at = Int(exactly: column), let row = DoorNumber.sum(geometry.first, rowsDown) else { return nil }
        return ScreenTextPosition(ScreenCaret(row: row, column: at))
    }

    func closestPosition(to point: CGPoint, within range: UITextRange) -> UITextPosition? {
        guard let near = closestPosition(to: point) as? ScreenTextPosition, let range = range as? ScreenTextRange else { return nil }
        if ScreenCaret.precedes(near.caret, range.from.caret) { return range.from }
        if ScreenCaret.precedes(range.to.caret, near.caret) { return range.to }
        return near
    }

    func characterRange(at point: CGPoint) -> UITextRange? {
        guard let cell = ScreenSelecting.hit(point, cell: geometry.cell, columns: geometry.columns, first: geometry.first, rows: geometry.rows),
              let after = DoorNumber.sum(cell.column, 1) else { return nil }
        return ScreenTextRange(ScreenCaret(row: cell.row, column: cell.column), ScreenCaret(row: cell.row, column: after))
    }

    // MARK: Positions

    var beginningOfDocument: UITextPosition {
        ScreenTextPosition(ScreenCaret(row: geometry.first, column: 0))
    }

    var endOfDocument: UITextPosition {
        ScreenTextPosition(ScreenCaret(row: lastRow, column: geometry.columns))
    }

    /// The last row laid out, by absolute index.
    private var lastRow: Int {
        DoorNumber.sum(geometry.first, geometry.rows).flatMap { DoorNumber.difference($0, 1) } ?? geometry.first
    }

    /// A caret as an offset from the document's start, a row being the width
    /// and one carets long (D21), as a Double so nothing can trap.
    private func offset(of caret: ScreenCaret) -> Double {
        Double(Double(caret.row) - Double(geometry.first)) * Double(Double(geometry.columns) + 1.0) + Double(caret.column)
    }

    /// The caret at an offset, or nil outside the rows laid out.
    private func caret(at offset: Double) -> ScreenCaret? {
        let width = Double(Double(geometry.columns) + 1.0)
        guard offset.isFinite, offset >= 0, width > 0 else { return nil }
        let down = (Double(offset) / Double(width)).rounded(.down)
        let across = Double(offset) - Double(Double(down) * Double(width))
        guard let rowsDown = Int(exactly: down), let column = Int(exactly: across),
              let row = DoorNumber.sum(geometry.first, rowsDown), row <= lastRow else { return nil }
        return ScreenCaret(row: row, column: column)
    }

    func compare(_ position: UITextPosition, to other: UITextPosition) -> ComparisonResult {
        guard let a = (position as? ScreenTextPosition)?.caret, let b = (other as? ScreenTextPosition)?.caret else { return .orderedSame }
        if ScreenCaret.precedes(a, b) { return .orderedAscending }
        if ScreenCaret.precedes(b, a) { return .orderedDescending }
        return .orderedSame
    }

    func offset(from: UITextPosition, to toPosition: UITextPosition) -> Int {
        guard let a = (from as? ScreenTextPosition)?.caret, let b = (toPosition as? ScreenTextPosition)?.caret else { return 0 }
        let between = Double(offset(of: b)) - Double(offset(of: a))
        return between.isFinite ? Int(exactly: between.rounded()) ?? 0 : 0
    }

    func position(from position: UITextPosition, offset: Int) -> UITextPosition? {
        guard let caret = (position as? ScreenTextPosition)?.caret else { return nil }
        return self.caret(at: Double(self.offset(of: caret)) + Double(offset)).map(ScreenTextPosition.init)
    }

    func position(from position: UITextPosition, in direction: UITextLayoutDirection, offset: Int) -> UITextPosition? {
        guard let caret = (position as? ScreenTextPosition)?.caret else { return nil }
        switch direction {
        case .right:
            return self.caret(at: Double(self.offset(of: caret)) + Double(offset)).map(ScreenTextPosition.init)
        case .left:
            return self.caret(at: Double(self.offset(of: caret)) - Double(offset)).map(ScreenTextPosition.init)
        case .up, .down:
            let moved = direction == .up ? Double(caret.row) - Double(offset) : Double(caret.row) + Double(offset)
            guard moved.isFinite, moved >= Double(geometry.first), moved <= Double(lastRow), let row = Int(exactly: moved) else { return nil }
            return ScreenTextPosition(ScreenCaret(row: row, column: caret.column))
        @unknown default:
            return nil
        }
    }

    func position(within range: UITextRange, farthestIn direction: UITextLayoutDirection) -> UITextPosition? {
        direction == .left || direction == .up ? range.start : range.end
    }

    func characterRange(byExtending position: UITextPosition, in direction: UITextLayoutDirection) -> UITextRange? {
        guard let other = self.position(from: position, in: direction, offset: 1) else { return nil }
        return textRange(from: position, to: other)
    }

    func textRange(from fromPosition: UITextPosition, to toPosition: UITextPosition) -> UITextRange? {
        guard let a = (fromPosition as? ScreenTextPosition)?.caret, let b = (toPosition as? ScreenTextPosition)?.caret else { return nil }
        return ScreenCaret.precedes(b, a) ? ScreenTextRange(b, a) : ScreenTextRange(a, b)
    }

    func baseWritingDirection(for position: UITextPosition, in direction: UITextStorageDirection) -> NSWritingDirection {
        .leftToRight
    }

    func setBaseWritingDirection(_ writingDirection: NSWritingDirection, for range: UITextRange) {}

    // MARK: The driver, called by the scroll view

    /// THE LONG PRESS (D3, D7), its point in this view's coordinates and the
    /// cell under it: it begins by selecting the word under the finger and
    /// the magnifier; moving grows the selection from that word to the cell
    /// under the finger, the word kept; lifting ends the magnifier and shows
    /// the menu. A press that begins within reach of a handle TAKES that
    /// handle instead (D5): a person who rests on a handle longer than the
    /// press's 0.45 s before moving it drags that end, and the selection's
    /// other end stays where it was (the 337.5 verifier's H10, V8b and V9b).
    func press(_ state: UIGestureRecognizer.State, at point: CGPoint, hit: ScreenPoint?) {
        switch state {
        case .began:
            if grabs(at: point) {
                pressHolds = true
                takeHandle(at: point)
                return
            }
            guard let hit else { return }
            let word = ScreenSelecting.word(at: hit, cells: cells(hit.row) ?? [])
            pressedWord = word
            owed = false
            menuInteraction?.dismissMenu()
            choose(word)
            beginLoupe(at: point)
        case .changed:
            if pressHolds {
                moveHandle(to: hit, at: point)
                return
            }
            guard let pressedWord, let hit else { return }
            choose(pressedWord.extending(to: hit))
            moveLoupe(to: point)
        case .ended:
            if pressHolds {
                pressHolds = false
                letHandleGo(at: point, showing: true)
                return
            }
            let pressed = pressedWord != nil
            pressedWord = nil
            endLoupe()
            if pressed { showMenu(at: point) }
        case .cancelled, .failed:
            if pressHolds {
                pressHolds = false
                letHandleGo(at: point, showing: false)
                return
            }
            pressedWord = nil
            endLoupe()
        default:
            break
        }
    }

    /// Whether a drag starting at `point` takes a handle (D5): within
    /// `reach` of the start caret or the end caret, the nearer one, which it
    /// then holds.
    func grabs(at point: CGPoint) -> Bool {
        held = nil
        guard let carets = selection?.carets else { return false }
        let start = caretRect(for: ScreenTextPosition(carets.start))
        let end = caretRect(for: ScreenTextPosition(carets.end))
        let toStart = hypot(CGFloat(point.x) - start.minX, CGFloat(point.y) - start.midY)
        let toEnd = hypot(CGFloat(point.x) - end.minX, CGFloat(point.y) - end.midY)
        guard min(toStart, toEnd) <= Self.reach else { return false }
        held = toStart <= toEnd ? .start : .end
        return true
    }

    /// THE HANDLE DRAG (D5, D7): the end it took follows the finger, cell by
    /// cell, with the magnifier, crossing the other end swaps which end it
    /// holds, and the menu shows when it stops.
    func drag(_ state: UIGestureRecognizer.State, at point: CGPoint, hit: ScreenPoint?) {
        switch state {
        case .began:
            takeHandle(at: point)
            moveHandle(to: hit, at: point)
        case .changed:
            moveHandle(to: hit, at: point)
        case .ended:
            letHandleGo(at: point, showing: true)
        case .cancelled, .failed:
            letHandleGo(at: point, showing: false)
        default:
            break
        }
    }

    /// Show the edit menu at `point` (D8), or owe it while a selected row is
    /// not drawn (D10).
    func showMenu(at point: CGPoint) {
        guard let selection else {
            owed = false
            return
        }
        guard drawn(selection) else {
            owed = true
            return
        }
        owed = false
        menuInteraction?.presentEditMenu(with: UIEditMenuConfiguration(identifier: nil, sourcePoint: point))
    }

    /// The scroll view's selection changed: UIKit's highlight and handles
    /// follow it, and with none the menu goes and nothing is owed.
    func selectionChanged() {
        displayInteraction?.isActivated = selection != nil
        displayInteraction?.setNeedsSelectionUpdate()
        guard selection == nil else { return }
        owed = false
        menuInteraction?.dismissMenu()
    }

    /// A layout pass redrew the rows (D12): UIKit reads the selection's
    /// rectangles again, the menu follows them, and a menu owed is shown once
    /// every selected row is drawn and no press or handle drag is under way
    /// (D10); a menu on screen is asked again, so Copy appears in it when its
    /// rows land.
    func laidOut() {
        displayInteraction?.setNeedsSelectionUpdate()
        guard let selection else { return }
        menuInteraction?.updateVisibleMenuPosition(animated: false)
        if owed, drawn(selection), pressedWord == nil, !dragging {
            showMenu(at: centre(of: selection))
        } else if menuShown {
            menuInteraction?.reloadVisibleMenu()
        }
    }

    // MARK: Inside

    /// A range made by the press or a handle: kept at once, so the next step
    /// reads where this one left it, drawn, and told to the page.
    private func choose(_ range: ScreenSelectionRange) {
        guard range != selection else { return }
        selection = range
        selectionChanged()
        events.select(range)
    }

    /// A handle taken (`grabs(at:)` chose which), by the handle drag or by a
    /// press that began on it: the menu goes and the magnifier comes. Nothing
    /// moves until the finger does.
    private func takeHandle(at point: CGPoint) {
        dragging = true
        menuInteraction?.dismissMenu()
        beginLoupe(at: point)
    }

    /// The held end to the cell under the finger; crossing the other end
    /// swaps which end is held (D5).
    private func moveHandle(to hit: ScreenPoint?, at point: CGPoint) {
        guard let held, let selection, let hit else { return }
        let (moved, holds) = selection.moving(held, to: hit)
        self.held = holds
        choose(moved)
        moveLoupe(to: point)
    }

    /// The handle let go: the magnifier ends, and on a lift the menu shows.
    private func letHandleGo(at point: CGPoint, showing: Bool) {
        dragging = false
        held = nil
        endLoupe()
        if showing { showMenu(at: point) }
    }

    /// The middle of the selection's rectangles, where an owed menu shows.
    private func centre(of range: ScreenSelectionRange) -> CGPoint {
        let union = ScreenSelecting.rects(range, cell: geometry.cell, columns: geometry.columns, first: geometry.first)
            .reduce(CGRect.null) { $0.union($1) }
        return union.isNull ? .zero : CGPoint(x: union.midX, y: union.midY)
    }

    private func beginLoupe(at point: CGPoint) {
        loupe?.invalidate()
        loupe = UITextLoupeSession.begin(at: point, fromSelectionWidgetView: nil, in: self)
    }

    private func moveLoupe(to point: CGPoint) {
        guard let loupe else { return }
        let caret = closestPosition(to: point).map { caretRect(for: $0) } ?? .null
        loupe.move(to: point, withCaretRect: caret, trackingCaret: true)
    }

    private func endLoupe() {
        loupe?.invalidate()
        loupe = nil
    }
}

// MARK: - UIKit's delegates

extension ScreenTextContent: UITextSelectionDisplayInteractionDelegate {}

extension ScreenTextContent: @preconcurrency UIEditMenuInteractionDelegate {
    /// THE MENU (D8, D10): `Copy`, while every selected row is drawn, and an
    /// empty menu, which UIKit does not show, otherwise; and since Phase 348
    /// (D39) iOS's own Paste after Copy while the page says the Mac takes a
    /// paste, which iOS then draws only while the clipboard holds text (this
    /// view's `canPerformAction`). Built from nothing: the suggested actions
    /// are never read.
    func editMenuInteraction(_ interaction: UIEditMenuInteraction, menuFor configuration: UIEditMenuConfiguration, suggestedActions: [UIMenuElement]) -> UIMenu? {
        guard let selection else { return UIMenu(children: []) }
        guard drawn(selection) else {
            owed = true
            return UIMenu(children: [])
        }
        let copy = UIAction(title: Copy.copy, image: UIImage(systemName: "doc.on.doc"), identifier: UIAction.Identifier(ID.screenCopy)) { [weak self] _ in
            self?.events.copy()
        }
        copy.accessibilityIdentifier = ID.screenCopy
        guard events.pasteOffered() else { return UIMenu(children: [copy]) }
        // iOS's own paste command: the standard selector, so iOS shows no
        // Allow Paste alert, taken by this view's `paste(_:)` (D39, D40).
        let paste = UICommand(title: Copy.paste, image: UIImage(systemName: "doc.on.clipboard"), action: #selector(UIResponderStandardEditActions.paste(_:)))
        paste.accessibilityIdentifier = ID.screenPaste
        return UIMenu(children: [copy, paste])
    }

    /// The menu sits over the selection: the union of its rectangles.
    func editMenuInteraction(_ interaction: UIEditMenuInteraction, targetRectFor configuration: UIEditMenuConfiguration) -> CGRect {
        guard let range = selectedTextRange else { return .null }
        return selectionRects(for: range).reduce(CGRect.null) { $0.union($1.rect) }
    }

    func editMenuInteraction(_ interaction: UIEditMenuInteraction, willPresentMenuFor configuration: UIEditMenuConfiguration, animator: any UIEditMenuInteractionAnimating) {
        menuShown = true
    }

    func editMenuInteraction(_ interaction: UIEditMenuInteraction, willDismissMenuFor configuration: UIEditMenuConfiguration, animator: any UIEditMenuInteractionAnimating) {
        menuShown = false
    }
}
