// The Terminal's scroll view, on UIKit (Phase 337.1, build/p3371/SPEC.md D24
// to D27, D31, D32 and section 5.5.4).
//
// WHY UIKIT. On iOS 26.3 the 337 build's rows sat 134.7 pt low after the
// keyboard was raised and put away, until the first long press (section 14
// M12): its grid was a two-axis SwiftUI scroll view, which CENTRES content
// smaller than itself, and when the keyboard went the view grew back while
// its content kept its keyboard-up height until the next state change re-laid
// it, so a long press hit-tested against rows that then moved. A
// `UIScrollView` never centres and keeps no stale frame: this one's frame is
// the page's area under the status line whatever the keyboard does
// (`ScreenPage` opts the whole page out of the keyboard, once, at its root),
// and the inset this file sets is the only thing that follows the keyboard.
//
// THE CONTENT (Phase 337.3, build/p3373/SPEC.md D1 to D4, which reverse
// 337.1's D25 for `following`): every row laid out, one cell tall each, from
// the layout's first row (Screens/ScreenScrollback.swift): the history (held,
// carried from the live screen, or reserved), then the live rows, then a PAD
// of the view's visible height less EVERY row laid out, never below 0, so the
// content is never shorter than the view. Following holds history too: in
// every layout pass, BEFORE the content is sized, this view hands the history
// its FILL (`scrollback.fill(rows:)`: the rows its whole height holds at the
// cell it lays out, less the live rows), which the history reserves above the
// live rows in whole pages; so the first frame already draws the live rows at
// the view's bottom with the ground above them, and the first page fills
// those rows where they lie, moving nothing. The offset's maximum
// (`following`) then shows the live bottom at the view's bottom with what the
// session printed before above it, as a terminal at the Mac does; a history
// shorter than the view sits at its top, history then live rows; and with no
// history laid out (nothing printed yet, a full-screen program, a Mac older
// than 337.1) it is 337.1's look, the live rows at the top. The pad and the
// fill are computed here, in `layoutSubviews`, from the view's own bounds and
// the keyboard's overlap, and from no SwiftUI geometry. With the pad the
// offset can always grow by exactly what is reserved above.
//
// EVERY OFFSET CHANGE IS A DELTA (D26 of 337.1, D11 and D12 of 337.3). A
// reservation above, a return to live and a change of cell size each move the
// CURRENT offset by the change they made, in the layout pass that made it
// (`apply(above:)`, without animation), so a drag or a fling under way
// continues from where it is and the row he is reading stays where it was.
// Following, rows added above the live rows (carried as they scroll off the
// live screen, or reserved by the fill) or taken away (a drop) move it by
// exactly their height too, so every live row stays where it was on screen
// and what was above it slides up, as on a terminal; following's pin then
// holds the offset at its maximum. A change of cell size keeps a pinch's or a
// double tap's focal row, a turn of the phone while following at the bottom
// keeps the live bottom at the view's bottom (the pin), and anything else
// keeps the row at the view's top. Only three things write the offset: that
// delta, following's pin (the offset at its maximum, when it was there), and
// the keyboard's clamp.
//
// THE KEYBOARD (D24): ONE function, `keyboardOverlap(_:)`, reads the
// keyboard's frame from `keyboardWillChangeFrameNotification` and
// `keyboardWillHideNotification`, converts it into this view, sets the bottom
// inset and the indicators' from it, publishes it to the page once (which
// places the back-to-live button just above it and hides the question tray
// while it is above 0; since Phase 337.3 the page's lines sit at the
// terminal's top, D13), and pins or clamps the offset in the keyboard's own
// animation, so following keeps the live bottom just above it. Since the fix
// round it measures again when the view's height changes under a keyboard
// that is up.
//
// THE ROWS ARE DRAWN BY ONE `UIHostingController` that takes no touch: 337's
// `ScreenRowView`, unchanged, for the rows in view and one screen above and
// below (`ScreenWindow`, Screens/ScreenGrid.swift), placed at the window's
// first row; the window moves only when the view nears its edge. Every touch
// is this view's: UIKit's long press (the selection, D31), its pinch (with the
// pan, D32), its double tap and its single tap (which waits for the double to
// fail), every point read with `location(in: contentView)` and turned into a
// row and a column by arithmetic.
//
// THE DESIGN IS PASEO'S (packages/app/src/terminal/native-renderer/
// headless-terminal-state.ts and terminal-scrollback.test.ts at
// getpaseo/paseo 2f0cb2f54be5742d6fc7e9b85ba39808ac22ad93, Apache-2.0, by the
// Paseo authors), ported to Swift, and no Paseo code is copied: the rows by
// absolute index, `following` tracking the bottom, the place kept when output
// arrives, the bottom affordance. Every number on this file's arithmetic is
// the phone's own geometry (conformance:ios rule k).

import SwiftUI
import UIKit

// MARK: - The page's side

/// What the Terminal's scroll view tells the page that holds it.
struct ScreenScrollerActions {
    /// A single tap on a cell, or nil outside the rows.
    let tap: @MainActor (ScreenPoint?) -> Void
    /// A long press began on a cell (true), or the drag after it reached one.
    let select: @MainActor (ScreenPoint, Bool) -> Void
    /// The keyboard's overlap of the Terminal, in points, once per change.
    let overlap: @MainActor (CGFloat) -> Void
}

/// The Terminal's scroll view, for SwiftUI.
struct ScreenScroller: UIViewRepresentable {
    /// The live picture drawn now (the one a selection holds while it is held).
    let picture: ScreenPicture
    let scrollback: ScrollbackModel
    let selection: ScreenSelectionRange?
    let actions: ScreenScrollerActions

    func makeUIView(context: Context) -> ScreenScrollView {
        let view = ScreenScrollView(scrollback: scrollback)
        view.actions = actions
        view.selection = selection
        view.picture = picture
        return view
    }

    func updateUIView(_ view: ScreenScrollView, context: Context) {
        view.actions = actions
        view.selection = selection
        view.picture = picture
    }

    static func dismantleUIView(_ view: ScreenScrollView, coordinator: ()) {
        view.dismantle()
    }
}

/// Lets the pinch be recognised together with the scroll view's pan (D32).
final class ScreenGestureRules: NSObject, UIGestureRecognizerDelegate {
    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool {
        gestureRecognizer is UIPinchGestureRecognizer || other is UIPinchGestureRecognizer
    }
}

// MARK: - The scroll view

final class ScreenScrollView: UIScrollView, UIScrollViewDelegate {
    /// What one layout pass laid out, for the next pass's delta.
    struct Laid: Equatable {
        let mode: ScrollbackMode
        /// The layout's first index.
        let first: Int
        /// The live top row's place, in rows.
        let liveRow: Int
        let cell: ScreenCell
    }

    /// The content: every row laid out, and the pad (D25).
    let contentView = UIView()
    let scrollback: ScrollbackModel
    var actions: ScreenScrollerActions?
    var picture: ScreenPicture? {
        didSet { if oldValue != picture { changed() } }
    }
    var selection: ScreenSelectionRange? {
        didSet { if oldValue != selection { changed() } }
    }

    /// The keyboard's overlap of this view, in points (D24).
    private(set) var overlap: CGFloat = 0
    /// The cell width he chose by pinch or double tap; nil is the fitted one.
    private(set) var chosen: CGFloat?
    /// The cell laid out now.
    private(set) var cell = ScreenCell(fontSize: 1, width: 1, height: 1)
    /// What the last pass laid out.
    private(set) var laid: Laid?
    /// The offset sits at its maximum: following's pin keeps it there.
    private(set) var pinned = true
    /// The places, in rows from the first, the window draws.
    private(set) var rowWindow: Range<Int> = 0..<0
    /// The places in view when the window was last drawn: its rows that are
    /// accessibility elements.
    private(set) var spoken: Range<Int> = 0..<0

    private let host: UIHostingController<ScreenWindow>
    private let rules = ScreenGestureRules()
    /// A change of cell size keeps this content point where it was in the
    /// view: the pinch's centre, the double tap, or the view's top.
    private var anchor: (content: CGPoint, inView: CGPoint)?
    private var pinchFocal = CGPoint.zero
    private var pressing = false
    private var laying = false
    /// Something the window draws changed: the layout, the picture, the
    /// selection or the cell.
    private var dirty = true
    /// The keyboard is moving: its own animation pins or clamps the offset.
    private var keyboardMoving = false
    /// The keyboard's last notification while it covered the view, handed
    /// back to `keyboardOverlap(_:)` when the view's height changes under it.
    private var keyboardNote: Notification?
    /// The view's height when the overlap was last measured.
    private var measuredHeight: CGFloat = 0
    /// A measurement is waiting for the layout pass to end.
    private var remeasuring = false

    init(scrollback: ScrollbackModel) {
        self.scrollback = scrollback
        host = UIHostingController(rootView: ScreenWindow.empty)
        super.init(frame: .zero)
        contentInsetAdjustmentBehavior = .never
        alwaysBounceVertical = true
        showsVerticalScrollIndicator = false
        showsHorizontalScrollIndicator = false
        backgroundColor = .clear
        delegate = self
        contentView.backgroundColor = .clear
        addSubview(contentView)
        host.view.backgroundColor = .clear
        host.view.isUserInteractionEnabled = false
        host.safeAreaRegions = []
        host.sizingOptions = []
        contentView.addSubview(host.view)
        addGestures()
        for name in [UIResponder.keyboardWillChangeFrameNotification, UIResponder.keyboardWillHideNotification] {
            NotificationCenter.default.addObserver(self, selector: #selector(keyboardOverlap(_:)), name: name, object: nil)
        }
        accessibilityIdentifier = ID.screenGrid
        accessibilityLabel = Copy.terminal
        scrollback.onLayout = { [weak self] in self?.changed() }
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not used")
    }

    /// The page went away: nothing more is observed.
    func dismantle() {
        NotificationCenter.default.removeObserver(self)
        scrollback.onLayout = nil
    }

    /// Something the window draws changed: lay out again, and redraw.
    private func changed() {
        dirty = true
        setNeedsLayout()
    }

    // MARK: The gestures, all UIKit's, all on this view (D31, D32)

    private func addGestures() {
        let press = UILongPressGestureRecognizer(target: self, action: #selector(pressed(_:)))
        press.minimumPressDuration = ScreenGesture.longPressSeconds
        let pinch = UIPinchGestureRecognizer(target: self, action: #selector(pinched(_:)))
        pinch.delegate = rules
        let double = UITapGestureRecognizer(target: self, action: #selector(doubleTapped(_:)))
        double.numberOfTapsRequired = 2
        let single = UITapGestureRecognizer(target: self, action: #selector(tapped(_:)))
        single.require(toFail: double)
        for gesture in [press, pinch, double, single] as [UIGestureRecognizer] {
            addGestureRecognizer(gesture)
        }
    }

    /// The cell under a point of the content, by arithmetic: the row is the
    /// layout's first index plus `y / cellHeight`, the column `x / cellWidth`.
    func point(at location: CGPoint) -> ScreenPoint? {
        guard let picture else { return nil }
        let layout = scrollback.layout
        let rows = ScrollbackLayout.plus(layout.liveRow, picture.rowCount)
        return ScreenSelecting.hit(location, cell: cell, columns: picture.columns, first: layout.firstRow, rows: rows)
    }

    @objc private func pressed(_ press: UILongPressGestureRecognizer) {
        switch press.state {
        case .began, .changed:
            guard let point = point(at: press.location(in: contentView)) else { return }
            actions?.select(point, !pressing)
            pressing = true
        case .ended, .cancelled, .failed:
            pressing = false
        default:
            break
        }
    }

    @objc private func tapped(_ tap: UITapGestureRecognizer) {
        actions?.tap(point(at: tap.location(in: contentView)))
    }

    @objc private func doubleTapped(_ tap: UITapGestureRecognizer) {
        guard let picture else { return }
        let fitted = ScreenZoom.fitted(columns: picture.columns, width: bounds.width)
        let top = ScreenZoom.top(columns: picture.columns, scale: displayScale, fitted: fitted)
        zoom(to: ScreenZoom.toggled(cell.width, fitted: fitted, top: top), focal: tap.location(in: contentView))
    }

    /// The pinch: a transform about its centre while the fingers move, and
    /// the font set ONCE when they lift (D32).
    @objc private func pinched(_ pinch: UIPinchGestureRecognizer) {
        switch pinch.state {
        case .began:
            pinchFocal = pinch.location(in: contentView)
        case .changed:
            contentView.transform = scaled(pinch.scale, about: pinchFocal)
        case .ended:
            contentView.transform = .identity
            zoom(to: CGFloat(cell.width) * pinch.scale, focal: pinchFocal)
        case .cancelled, .failed:
            contentView.transform = .identity
        default:
            break
        }
    }

    /// A transform that scales the content by `scale` about `focal`, a point
    /// of the content.
    private func scaled(_ scale: CGFloat, about focal: CGPoint) -> CGAffineTransform {
        let center = contentView.center
        let keep = CGFloat(1.0) - scale
        return CGAffineTransform(
            a: scale, b: 0, c: 0, d: scale,
            tx: CGFloat(keep) * (CGFloat(focal.x) - center.x),
            ty: CGFloat(keep) * (CGFloat(focal.y) - center.y)
        )
    }

    /// Set the cell width he chose, keeping `focal`, a point of the content,
    /// where it is in the view (D32). Held between the fitted size and the
    /// top in the next layout pass.
    func zoom(to width: CGFloat, focal: CGPoint) {
        anchor = (content: focal, inView: CGPoint(x: CGFloat(focal.x) - contentOffset.x, y: CGFloat(focal.y) - contentOffset.y))
        chosen = width
        setNeedsLayout()
    }

    // MARK: The keyboard (D24)

    /// THE ONE KEYBOARD FUNCTION. The keyboard's end frame, converted into
    /// this view, is how far it covers the view's bottom; it becomes the
    /// bottom inset and the indicators', it is published to the page once,
    /// and the offset is pinned (following, at its maximum) or clamped to the
    /// content, in the keyboard's own animation. A keyboard going is an
    /// overlap of 0.
    ///
    /// MEASURED AGAIN WHEN THE VIEW'S HEIGHT CHANGES UNDER IT (the fix round):
    /// the question tray hides as the keyboard rises and the view grows into
    /// its place, so the overlap the first notification measured (107 pt in
    /// the verifier's instrumented run) is not the one that stands (269 pt);
    /// `layoutSubviews` hands the keyboard's last notification back to this
    /// function once the pass is over.
    @objc func keyboardOverlap(_ note: Notification) {
        var covered: CGFloat = 0
        if note.name != UIResponder.keyboardWillHideNotification,
           let end = (note.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? NSValue)?.cgRectValue,
           let screen = window?.windowScene?.screen {
            let mine = convert(end, from: screen.coordinateSpace)
            covered = min(bounds.height, max(0, CGFloat(bounds.maxY) - mine.minY))
        }
        keyboardNote = covered > 0 ? note : nil
        measuredHeight = bounds.height
        guard covered != overlap else { return }
        let atMax = pinned
        overlap = covered
        var inset = contentInset
        inset.bottom = covered
        contentInset = inset
        var indicators = verticalScrollIndicatorInsets
        indicators.bottom = covered
        verticalScrollIndicatorInsets = indicators
        actions?.overlap(covered)
        let duration = (note.userInfo?[UIResponder.keyboardAnimationDurationUserInfoKey] as? Double) ?? 0
        let curve = (note.userInfo?[UIResponder.keyboardAnimationCurveUserInfoKey] as? UInt) ?? 0
        keyboardMoving = true
        defer { keyboardMoving = false }
        UIView.animate(withDuration: duration, delay: 0, options: UIView.AnimationOptions(rawValue: curve << 16)) {
            self.dirty = true
            self.setNeedsLayout()
            self.layoutIfNeeded()
            if self.scrollback.layout.mode == .following, atMax {
                self.pin()
            } else {
                let y = min(max(self.contentOffset.y, -CGFloat(self.contentInset.top)), self.maxOffsetY)
                if y != self.contentOffset.y {
                    self.contentOffset = CGPoint(x: self.contentOffset.x, y: y)
                }
            }
        }
    }

    /// The view's height changed under a keyboard that covers it: its last
    /// notification is handed back to `keyboardOverlap(_:)` once this layout
    /// pass is over, never inside it, so the page is never told anything
    /// while UIKit or SwiftUI lays it out.
    private func remeasureKeyboard() {
        guard keyboardNote != nil, bounds.height != measuredHeight, !remeasuring else { return }
        remeasuring = true
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.remeasuring = false
            if let note = self.keyboardNote { self.keyboardOverlap(note) }
        }
    }

    // MARK: The layout pass (D25, D26)

    /// The offset's maximum: the content's bottom, with the keyboard's inset,
    /// at the view's bottom.
    var maxOffsetY: CGFloat {
        max(-CGFloat(contentInset.top), CGFloat(contentSize.height) + CGFloat(contentInset.bottom) - bounds.height)
    }

    private var displayScale: CGFloat {
        max(traitCollection.displayScale, 1)
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        remeasureKeyboard()
        guard let picture, bounds.width > 0 else { return }
        laying = true
        defer { laying = false }
        // At its maximum before this pass moved anything: following's pin
        // keeps it there through whatever the pass adds or takes away (D11,
        // D12), whatever an offset written below makes of `pinned`.
        let wasPinned = pinned
        let fitted = ScreenZoom.fitted(columns: picture.columns, width: bounds.width)
        let top = ScreenZoom.top(columns: picture.columns, scale: displayScale, fitted: fitted)
        let now = ScreenCell.wide(ScreenZoom.held(chosen ?? fitted, fitted: fitted, top: top), scale: displayScale)
        // THE FILL (build/p3373/SPEC.md D2, D3): the rows this view holds at
        // this cell, less the live rows, never below 0, from its WHOLE height
        // (never less the keyboard, so a keyboard rising or going reserves
        // nothing). The history reserves it above the live rows, in whole
        // pages, BEFORE the content is sized, so the first frame is already
        // filled. Whole numbers through Int(exactly:) of a finite rounded
        // value and ScrollbackLayout.less, neither of which can trap.
        let room = Double(CGFloat(bounds.height) / now.height).rounded(.up)
        let fits = room.isFinite ? Int(exactly: room) ?? 0 : 0
        let fill = ScrollbackLayout.less(fits, picture.rowCount)
        _ = scrollback.fill(rows: fill)
        // The layout as the fill left it.
        let layout = scrollback.layout
        let rows = ScrollbackLayout.plus(layout.liveRow, picture.rowCount)
        // D4's pad: the view's visible height, less EVERY row laid out (the
        // history held or reserved, then the live rows), never below 0, from
        // this view's own bounds and the keyboard's overlap.
        let visible = max(0, CGFloat(bounds.height) - overlap)
        let pad = max(0, CGFloat(visible) - CGFloat(ScrollbackLayout.plus(layout.liveRow, picture.rowCount)) * now.height)
        let size = CGSize(width: CGFloat(picture.columns) * now.width, height: CGFloat(CGFloat(rows) * now.height) + pad)
        let grew = size != contentSize
        // UIKit clamps an offset it is not tracking when the content size is
        // set: a pull past the top (-40, say) reads 0 the moment the rows a
        // reservation added are sized, before the delta below is added to
        // it, and the live rows then land 40 pt away from where the delta
        // keeps them (the 337.1 verifier's measurement on iOS 26.3 and 18.3).
        // The offset as it was before the size was set is what the delta
        // moves (the fix round).
        let held = contentOffset
        if grew { contentSize = size }
        let clamped = CGPoint(x: CGFloat(held.x) - contentOffset.x, y: CGFloat(held.y) - contentOffset.y)
        contentView.bounds = CGRect(origin: .zero, size: size)
        contentView.center = CGPoint(x: CGFloat(size.width) / 2.0, y: CGFloat(size.height) / 2.0)
        // A Terminal drawn afresh over a history it already holds opens on
        // its live rows, as if it had just entered `scrolled` from them.
        let previous = laid ?? (layout.mode == .scrolled ? Laid(mode: .following, first: layout.live, liveRow: 0, cell: now) : nil)
        laid = Laid(mode: layout.mode, first: layout.firstRow, liveRow: layout.liveRow, cell: now)
        if previous != laid { dirty = true }
        cell = now
        // A pinch or a double tap keeps its focal row where it was (D32), and
        // the pin below leaves it there.
        var keptFocal = false
        if let previous, previous.cell != now {
            if anchor == nil, layout.mode == .following, wasPinned {
                // A turn of the phone while following at the bottom: the
                // live bottom stays at the view's bottom (D12), where keeping
                // the top row would leave it off screen.
                pin()
            } else {
                keptFocal = anchor != nil
                keepAnchor(from: previous, offset: held)
            }
        } else if let previous {
            let added = CGFloat(Self.rowsAdded(from: previous, to: layout)) * now.height
            // Rows added or taken above: the offset he had moved by exactly
            // them, whatever the size's clamp did. Nothing added: UIKit's
            // clamp stands, so an offset left past the content by code is
            // brought back inside it, as before.
            if added != 0 { apply(above: CGPoint(x: 0, y: CGFloat(clamped.y) + added)) }
        }
        anchor = nil
        if keyboardMoving {
            // The keyboard's own animation pins or clamps.
        } else if layout.mode == .following, !isTracking, !keptFocal,
                  previous == nil || previous?.mode == .scrolled || (wasPinned && !isDecelerating) {
            // Following's pin: the first layout, a return to live, and every
            // pass that began at the bottom (a picture's carried rows, the
            // fill, a drop, a taller or shorter view) end at the bottom; a
            // view he moved off it, inside a live screen taller than the
            // view, is not pulled down by each picture, and a bounce at the
            // bottom runs to its end rather than snapping.
            pin()
        } else if !isTracking, !isDecelerating, contentOffset.y > maxOffsetY {
            // Rows the live screen lost (its height changed): back inside.
            apply(above: CGPoint(x: 0, y: CGFloat(maxOffsetY) - contentOffset.y))
        }
        let redraw = dirty
        dirty = false
        drawWindow(force: redraw)
        laying = false
        if redraw { report() }
    }

    /// The rows added above what he reads since the last pass, in rows (D26
    /// of 337.1, D11 of 337.3). Following keeps the LIVE ROWS' place: the
    /// rows laid out above them that a picture carried or the fill reserved,
    /// less those a drop took away, so every live row stays where it was on
    /// screen and what was above it slides up, as on a terminal. Entering
    /// `scrolled` and scrolling keep HIS place: the rows reserved above the
    /// first row, and nothing for the live rows growing below him. A return to
    /// live keeps the live rows' place: what it took away above them.
    static func rowsAdded(from previous: Laid, to layout: ScrollbackLayout) -> Double {
        switch (previous.mode, layout.mode) {
        case (.following, .following):
            return Double(layout.liveRow) - Double(previous.liveRow)
        case (.following, .scrolled):
            return Double(previous.first) - Double(layout.firstRow)
        case (.scrolled, .scrolled):
            return Double(previous.first) - Double(layout.firstRow)
        case (.scrolled, .following):
            return Double(layout.liveRow) - Double(previous.liveRow)
        }
    }

    /// THE DELTA (D26): added to the CURRENT offset, in the layout pass that
    /// grew or shrank the content, without animation, so a drag or a fling
    /// under way continues from where it is.
    private func apply(above delta: CGPoint) {
        guard delta != .zero else { return }
        UIView.performWithoutAnimation {
            contentOffset = CGPoint(x: CGFloat(contentOffset.x) + delta.x, y: CGFloat(contentOffset.y) + delta.y)
        }
    }

    /// A change of cell size keeps the anchor (the pinch's centre, the double
    /// tap) where it was in the view, or else the row at the view's top,
    /// read at `offset`, the offset before the new size was set.
    private func keepAnchor(from previous: Laid, offset: CGPoint) {
        let point = anchor ?? (content: offset, inView: .zero)
        let across = CGFloat(cell.width) / previous.cell.width
        let down = CGFloat(cell.height) / previous.cell.height
        let wantX = CGFloat(CGFloat(point.content.x) * across) - point.inView.x
        let wantY = CGFloat(CGFloat(point.content.y) * down) - point.inView.y
        let widest = max(0, CGFloat(contentSize.width) - bounds.width)
        let x = min(max(0, wantX), widest)
        let y = min(max(-CGFloat(contentInset.top), wantY), maxOffsetY)
        apply(above: CGPoint(x: CGFloat(x) - contentOffset.x, y: CGFloat(y) - contentOffset.y))
    }

    /// FOLLOWING'S PIN: the offset at its maximum.
    private func pin() {
        let y = maxOffsetY
        guard contentOffset.y != y else { return }
        UIView.performWithoutAnimation {
            contentOffset = CGPoint(x: contentOffset.x, y: y)
        }
        pinned = true
    }

    // MARK: Scrolling

    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        pinned = contentOffset.y >= CGFloat(maxOffsetY) - 0.5
        guard !laying else { return }
        drawWindow(force: false)
        report()
    }

    func scrollViewDidEndDragging(_ scrollView: UIScrollView, willDecelerate decelerate: Bool) {
        guard !decelerate else { return }
        drawWindow(force: true)
        settled()
    }

    func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {
        drawWindow(force: true)
        settled()
    }

    /// A drag or a fling that ENDS at the offset's maximum returns to
    /// `following` (D27).
    private func settled() {
        guard scrollback.layout.mode == .scrolled, contentOffset.y >= CGFloat(maxOffsetY) - 0.5 else { return }
        scrollback.follow()
    }

    /// The view's first and last rows, as absolute indices, to the history,
    /// with whether the view is at its bottom (`pinned`, its own offset at
    /// its maximum): following, a view that leaves its bottom with its top
    /// above the live top enters `scrolled` (build/p3373/SPEC.md D9); it
    /// reserves or asks a page as they say (D26, D27 of 337.1).
    private func report() {
        guard picture != nil, cell.height > 0 else { return }
        let first = Double(scrollback.layout.firstRow)
        let down = Double(contentOffset.y) / Double(cell.height)
        let seen = Double(max(0, CGFloat(bounds.height) - overlap)) / Double(cell.height)
        let topIndex = max(0, Double(first) + down.rounded(.down))
        let bottomIndex = max(topIndex, Double(first) + Double(Double(down) + seen).rounded(.up))
        guard topIndex.isFinite, bottomIndex.isFinite, let top = Int(exactly: topIndex.rounded(.down)),
              let bottom = Int(exactly: bottomIndex.rounded(.down)) else { return }
        _ = scrollback.viewed(top: top, bottom: bottom, atBottom: pinned)
    }

    // MARK: The window of rows

    /// Draw the rows in view and one screen above and below, moving the
    /// window only when the view nears its edge, or now when `force` (every
    /// layout pass, and every scroll as it comes to rest).
    ///
    /// ONLY THE ROWS IN VIEW ARE ACCESSIBILITY ELEMENTS (the fix round), as
    /// the view stood when the window was last drawn: the rows a screen above
    /// and below are drawn for the scroll and spoken by no one. Every row of
    /// the window was an element, about 300 of them scrolled back where 337
    /// had 40, and on iOS 18.3 the test framework's own logging of them put
    /// the app in log quarantine and crashed it twice while it scrolled (the
    /// 337.1 verifier's two reports, `XCElementSnapshot children` under
    /// `__LIBTRACE_CLIENT_QUARANTINED_DUE_TO_HIGH_LOGGING_VOLUME__`).
    func drawWindow(force: Bool) {
        guard let picture, cell.height > 0 else { return }
        let layout = scrollback.layout
        let rows = ScrollbackLayout.plus(layout.liveRow, picture.rowCount)
        let firstSeen = max(0, Double(Double(contentOffset.y) / Double(cell.height)).rounded(.down))
        let reach = Double(contentOffset.y) + Double(bounds.height)
        let lastSeen = max(firstSeen, Double(Double(reach) / Double(cell.height)).rounded(.up))
        let screen = min(Double(lastSeen) - Double(firstSeen), 200.0)
        let lower = max(0, Double(firstSeen) - Double(screen))
        let upper = min(Double(rows), Double(lastSeen) + Double(screen))
        guard lower.isFinite, upper.isFinite, let from = Int(exactly: lower), let to = Int(exactly: max(lower, upper)) else { return }
        let margin = Double(screen) / 2.0
        let near = (Double(firstSeen) < Double(rowWindow.lowerBound) + margin && rowWindow.lowerBound > 0)
            || (Double(lastSeen) > Double(rowWindow.upperBound) - margin && rowWindow.upperBound < rows)
        guard force || near || rowWindow.isEmpty else { return }
        rowWindow = from..<to
        let seenTop = min(Double(firstSeen), Double(rows))
        let seenEnd = min(max(Double(lastSeen), seenTop), Double(rows))
        guard let spokenFrom = Int(exactly: seenTop), let spokenTo = Int(exactly: seenEnd) else { return }
        spoken = spokenFrom..<spokenTo
        host.rootView = windowView(picture: picture, layout: layout)
        host.view.frame = CGRect(
            x: 0, y: CGFloat(from) * cell.height,
            width: CGFloat(picture.columns) * cell.width, height: CGFloat(rowWindow.count) * cell.height
        )
    }

    /// The window's rows by absolute index: live rows from the live top,
    /// held rows of history above it, and reserved rows as the ground; the
    /// cursor on the live rows only; the selection by absolute index.
    private func windowView(picture: ScreenPicture, layout: ScrollbackLayout) -> ScreenWindow {
        let first = ScrollbackLayout.plus(layout.firstRow, rowWindow.lowerBound)
        var drawn: [ScreenWindowRow] = []
        drawn.reserveCapacity(rowWindow.count)
        for place in rowWindow {
            let index = ScrollbackLayout.plus(layout.firstRow, place)
            let said = spoken.contains(place)
            if place >= layout.liveRow {
                let live = ScrollbackLayout.less(place, layout.liveRow)
                let row = picture.rows.indices.contains(live) ? picture.rows[live] : nil
                drawn.append(ScreenWindowRow(id: index, row: row, styles: picture.styles, live: live, spoken: said))
            } else if let held = layout.held[index] {
                drawn.append(ScreenWindowRow(id: index, row: held.row, styles: held.styles, live: nil, spoken: said))
            } else {
                drawn.append(ScreenWindowRow(id: index, row: nil, styles: [], live: nil, spoken: false))
            }
        }
        var cursor: CGPoint?
        let caretPlace = ScrollbackLayout.plus(layout.liveRow, picture.caretRow)
        if picture.caretShown, rowWindow.contains(caretPlace) {
            let down = CGFloat(caretPlace) - CGFloat(rowWindow.lowerBound)
            cursor = CGPoint(x: CGFloat(picture.caretColumn) * cell.width, y: CGFloat(down) * cell.height)
        }
        return ScreenWindow(
            rows: drawn, columns: picture.columns, cell: cell, ink: picture.ink, ground: picture.ground,
            caret: picture.caret, light: ScreenZoom.lightLine(cell, scale: displayScale), cursor: cursor,
            highlights: ScreenSelecting.rects(selection, cell: cell, columns: picture.columns, first: first)
        )
    }

    // MARK: Reading back, for the tests and the page

    /// Where row `index` is drawn in the view now, in points from the view's
    /// top, or nil when it is not laid out.
    func onScreenY(ofIndex index: Int) -> CGFloat? {
        guard let laid, index >= laid.first else { return nil }
        let down = CGFloat(index) - CGFloat(laid.first)
        return CGFloat(CGFloat(down) * cell.height) - contentOffset.y
    }
}
