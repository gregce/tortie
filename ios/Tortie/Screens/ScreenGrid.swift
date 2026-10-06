// The Screen's grid: the session's rows, drawn at the Mac's width (Phase 337,
// build/p337/SPEC.md D26, D27 and section 5.8.4).
//
// APPLE'S OWN DRAWING AND NO PACKAGE (rules f and g): a SwiftUI `Canvas` per
// row inside a lazy, two-axis scroll view, so a screen costs about forty
// views rather than a view per run, and each run is placed at its own column,
// which one `Text` of the whole row cannot do for a wide cell. Each row is
// `.equatable()`: a row that did not change between two pictures is not
// drawn again. A row draws, in order: each run's ground; each box of
// Screens/ScreenRows.swift's layout, clipped to exactly its columns (text,
// a character alone and scaled down to fit, or a box or block shape from
// Screens/ScreenGlyphs.swift); its underline and its line through. The
// cursor's block (at 0.45 opacity, in the Mac's cursor colour) and the
// selection are drawn over the rows. Every row is one accessibility element
// whose label is its text.
//
// THE DESIGN IS PASEO'S (packages/app/src/terminal/native-renderer/
// terminal-grid-view.native.tsx and terminal-grid-metrics.ts at
// getpaseo/paseo 2f0cb2f54be5742d6fc7e9b85ba39808ac22ad93, Apache-2.0, by the
// Paseo authors), ported to Swift, and no Paseo code is copied: a measured
// cell snapped to the pixel; only the rows in view drawn; each run in a box
// exactly its cells wide that clips its text; the cursor as a block at 0.45
// opacity; a row's label as its text. Not taken: its column clipping (the
// phone pans instead), its view per run (one `Canvas` per row draws them),
// and its claim of the terminal's size (`terminal-resize-policy.ts`): the
// phone never sizes the Mac (his ruling 2), and the grid only MEASURES the
// view it is drawn in.
//
// ZOOM (D27). The grid first fits the view's width. A pinch scales the drawn
// grid by a transform while the fingers move and sets the font ONCE when it
// ends (a font change redraws every row); the zoom runs from the fitted size
// to 18 pt, its top held so a row's width in pixels is at most 8,192 (a
// 512-column row at 18 pt is about 17,000 px at 3x, past the GPU's texture
// bound, §Attack A24). A double tap moves between the fitted size and 12 pt
// (or the top). The scroll view pans both ways.
//
// THE SELECTION'S LONG PRESS IS UIKIT'S (the fix round of 2026-10-06). As a
// SwiftUI `LongPressGesture` sequenced before a `DragGesture` on the scroll
// view's content it held every touch on iOS 26: a swipe, a slow press-drag
// and a vertical swipe each left a zoomed Screen where it was, and taking
// that one gesture away made the same swipe pan 478 pt (the verify's bisect;
// iOS 18.3 panned with it). A `UILongPressGestureRecognizer` is arbitrated
// with the scroll view's pan by UIKit's own rule, as a text view's selection
// is: a finger that moves before 450 ms fails the press and pans, and a
// press held still for 450 ms begins, and the pan is not given the touch.

import SwiftUI
import UIKit

// MARK: - The zoom

enum ScreenZoom {
    /// The largest font the pinch reaches.
    static let topFont: CGFloat = 18
    /// The font a double tap reads at.
    static let readingFont: CGFloat = 12
    /// The widest a row may be, in pixels (§Attack A24).
    static let widestRowPixels: CGFloat = 8_192

    /// The cell width that fits `columns` into `width` points.
    static func fitted(columns: Int, width: CGFloat) -> CGFloat {
        guard columns > 0, width > 0 else { return 1 }
        return CGFloat(width) / CGFloat(columns)
    }

    /// The widest cell allowed: 18 pt's, held so `columns × width × scale`
    /// is at most 8,192, and never narrower than the fitted one.
    static func top(columns: Int, scale: CGFloat, fitted: CGFloat) -> CGFloat {
        let font = CGFloat(topFont) * ScreenFont.advancePerPoint
        let bound = CGFloat(widestRowPixels) / (CGFloat(max(columns, 1)) * max(scale, 1))
        return max(fitted, min(font, bound))
    }

    /// A wanted cell width held between the fitted one and the top.
    static func held(_ wanted: CGFloat, fitted: CGFloat, top: CGFloat) -> CGFloat {
        min(max(wanted, fitted), top)
    }

    /// The double tap: the fitted size when zoomed in, else 12 pt's (or the
    /// top).
    static func toggled(_ current: CGFloat, fitted: CGFloat, top: CGFloat) -> CGFloat {
        let reading = held(CGFloat(readingFont) * ScreenFont.advancePerPoint, fitted: fitted, top: top)
        return current > CGFloat(fitted) * 1.01 ? fitted : reading
    }
}

// MARK: - The grid

struct ScreenGrid: View {
    let picture: ScreenPicture
    /// The selection drawn over the rows, or nil.
    let selection: ScreenSelectionRange?
    /// A tap on a cell (nil outside the grid).
    let tap: (ScreenPoint?) -> Void
    /// A long press, then a drag: the cell where it began, then each cell it
    /// reaches.
    let select: (ScreenPoint, Bool) -> Void

    @Environment(\.displayScale) private var scale
    /// The cell width he chose, or nil for the fitted one.
    @State private var chosen: CGFloat?
    /// The pinch while the fingers move: a transform, not a font.
    @GestureState private var pinch: CGFloat = 1
    /// The long press has begun a selection in this gesture.
    @State private var selecting = false

    var body: some View {
        GeometryReader { proxy in
            let fitted = ScreenZoom.fitted(columns: picture.columns, width: proxy.size.width)
            let top = ScreenZoom.top(columns: picture.columns, scale: scale, fitted: fitted)
            let cell = ScreenCell.wide(ScreenZoom.held(chosen ?? fitted, fitted: fitted, top: top), scale: scale)
            ScrollView([.horizontal, .vertical]) {
                grid(cell)
                    .scaleEffect(pinch, anchor: .topLeading)
                    // THE ROWS SIT AT THE TOP (the fix round of 2026-10-06),
                    // as Screen.html draws them: a two-axis scroll view centres
                    // content smaller than itself, so the line that appears
                    // under the grid when a selection begins (or the keyboard
                    // rising) shrank the view and moved every row up under a
                    // finger that had not moved, and a long press then a drag
                    // along one row selected four rows down on a fitted
                    // screen (the fixer's bench, both runtimes). The gestures
                    // are on this whole frame, so a pinch, a tap or a long
                    // press below the last row still reaches them; a point
                    // outside the rows is no cell (`ScreenSelecting.hit`).
                    .frame(minWidth: proxy.size.width, minHeight: proxy.size.height, alignment: .topLeading)
                    .contentShape(Rectangle())
                    .gesture(magnify(cell: cell, fitted: fitted, top: top))
                    .onTapGesture(count: 2) {
                        chosen = ScreenZoom.toggled(cell.width, fitted: fitted, top: top)
                    }
                    .onTapGesture { location in
                        tap(ScreenSelecting.hit(location, cell: cell, columns: picture.columns, rows: picture.rowCount))
                    }
                    .gesture(selectPress(cell))
            }
            .scrollIndicators(.hidden)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.screenGrid)
    }

    /// The rows, the cursor and the selection, at one cell size.
    private func grid(_ cell: ScreenCell) -> some View {
        LazyVStack(alignment: .leading, spacing: 0) {
            ForEach(picture.rows, id: \.index) { row in
                ScreenRowView(
                    row: row,
                    styles: picture.styles,
                    ink: picture.ink,
                    cell: cell,
                    light: lightLine(cell)
                )
                .equatable()
                .frame(width: CGFloat(picture.columns) * cell.width, height: cell.height, alignment: .topLeading)
                .accessibilityElement()
                .accessibilityLabel(Text(verbatim: row.label))
                .accessibilityIdentifier(ID.screenRow(row.index))
            }
        }
        .frame(width: CGFloat(picture.columns) * cell.width, alignment: .topLeading)
        .background(picture.ground)
        .overlay(alignment: .topLeading) { cursor(cell) }
        .overlay(alignment: .topLeading) { highlight(cell) }
    }

    /// The cursor's block, at 0.45 opacity, where tmux's cursor is.
    @ViewBuilder
    private func cursor(_ cell: ScreenCell) -> some View {
        if picture.caretShown {
            Rectangle()
                .fill(picture.caret.opacity(0.45))
                .frame(width: cell.width, height: cell.height)
                .offset(x: CGFloat(picture.caretColumn) * cell.width, y: CGFloat(picture.caretRow) * cell.height)
                .allowsHitTesting(false)
                .accessibilityElement()
                .accessibilityIdentifier(ID.screenCursor)
        }
    }

    /// The selection, one rectangle per row, in the accent.
    @ViewBuilder
    private func highlight(_ cell: ScreenCell) -> some View {
        let rects = ScreenSelecting.rects(selection, cell: cell, columns: picture.columns)
        if !rects.isEmpty {
            ZStack(alignment: .topLeading) {
                ForEach(Array(rects.enumerated()), id: \.offset) { _, rect in
                    Rectangle()
                        .fill(Tokens.accent.opacity(0.3))
                        .frame(width: rect.width, height: rect.height)
                        .offset(x: rect.minX, y: rect.minY)
                }
            }
            .allowsHitTesting(false)
            .accessibilityElement()
            .accessibilityIdentifier(ID.screenSelection)
        }
    }

    /// A light line's thickness: a tenth of a cell, at least one pixel.
    private func lightLine(_ cell: ScreenCell) -> CGFloat {
        max(CGFloat(1.0) / max(scale, 1), CGFloat(cell.width) * 0.12)
    }

    /// The pinch: a transform while it moves, the font set once at its end.
    private func magnify(cell: ScreenCell, fitted: CGFloat, top: CGFloat) -> some Gesture {
        MagnifyGesture()
            .updating($pinch) { value, state, _ in
                state = value.magnification
            }
            .onEnded { value in
                chosen = ScreenZoom.held(CGFloat(cell.width) * value.magnification, fitted: fitted, top: top)
            }
    }

    /// A long press of 450 ms, then a drag: a selection that grows. UIKit's
    /// long press (above), so the scroll view still pans.
    private func selectPress(_ cell: ScreenCell) -> ScreenLongPress {
        ScreenLongPress(
            minimumDuration: ScreenGesture.longPressSeconds,
            moved: { location in
                guard let point = ScreenSelecting.hit(location, cell: cell, columns: picture.columns, rows: picture.rowCount) else { return }
                select(point, !selecting)
                selecting = true
            },
            ended: { selecting = false }
        )
    }
}

// MARK: - The long press

/// UIKit's long press on the grid, handed to SwiftUI: where the finger is, in
/// the grid's own coordinates, as the press begins and each time it moves
/// after, and when it lets go. Before it begins it hands nothing, so a finger
/// that moves first is the scroll view's.
struct ScreenLongPress: UIGestureRecognizerRepresentable {
    let minimumDuration: Double
    let moved: (CGPoint) -> Void
    let ended: () -> Void

    func makeUIGestureRecognizer(context: Context) -> UILongPressGestureRecognizer {
        let press = UILongPressGestureRecognizer()
        press.minimumPressDuration = minimumDuration
        return press
    }

    func handleUIGestureRecognizerAction(_ recognizer: UILongPressGestureRecognizer, context: Context) {
        switch recognizer.state {
        case .began, .changed:
            moved(context.converter.localLocation)
        case .ended, .cancelled, .failed:
            ended()
        default:
            break
        }
    }
}

// MARK: - One row

/// One row, drawn in one `Canvas`. Equatable, so a row whose runs, styles
/// and cell did not change is not drawn again.
struct ScreenRowView: View, Equatable {
    let row: ScreenRowModel
    let styles: [ScreenStyle]
    let ink: Color
    let cell: ScreenCell
    let light: CGFloat

    var body: some View {
        Canvas(opaque: false, rendersAsynchronously: false) { context, _ in
            ScreenRowPainter(row: row, styles: styles, ink: ink, cell: cell, light: light).paint(in: &context)
        }
        .accessibilityHidden(true)
    }
}

/// What one row's `Canvas` draws.
struct ScreenRowPainter {
    let row: ScreenRowModel
    let styles: [ScreenStyle]
    let ink: Color
    let cell: ScreenCell
    let light: CGFloat

    /// The style of a run, or the screen's own ink.
    private func style(_ index: Int) -> ScreenStyle {
        styles.indices.contains(index) ? styles[index] : ScreenStyle(ink: ink)
    }

    /// A box's rectangle: exactly its columns, the cell's height.
    func rect(column: CGFloat, span: CGFloat) -> CGRect {
        CGRect(x: CGFloat(column) * cell.width, y: 0, width: CGFloat(span) * cell.width, height: cell.height)
    }

    func paint(in context: inout GraphicsContext) {
        // The grounds first, run by run, so no box's text is drawn under one.
        var column: CGFloat = 0
        for run in row.runs {
            if let ground = style(run.styleIndex).ground {
                context.fill(Path(rect(column: column, span: CGFloat(run.span))), with: .color(ground))
            }
            column += CGFloat(run.span)
        }
        for box in row.boxes {
            draw(box, in: context)
        }
    }

    private func font(_ drawn: ScreenStyle) -> Font {
        .system(size: cell.fontSize, weight: drawn.bold ? .bold : .regular, design: .monospaced)
    }

    private func text(_ string: String, _ drawn: ScreenStyle) -> Text {
        var text = Text(verbatim: string).font(font(drawn)).foregroundStyle(drawn.ink)
        if drawn.italic { text = text.italic() }
        if drawn.underline { text = text.underline() }
        if drawn.strike { text = text.strikethrough() }
        return text
    }

    private func draw(_ box: ScreenBox, in context: GraphicsContext) {
        let drawn = style(box.styleIndex)
        let area = rect(column: box.column, span: box.span)
        var boxed = context
        boxed.clip(to: Path(area))
        if drawn.dim { boxed.opacity = 0.5 }
        switch box.kind {
        case .text:
            guard box.text.contains(where: { $0 != " " }) || drawn.underline || drawn.strike else { return }
            boxed.draw(boxed.resolve(text(box.text, drawn)), at: CGPoint(x: area.minX, y: area.midY), anchor: .leading)
        case .alone:
            // Measured as drawn, centred, and scaled DOWN to its box, never up.
            let resolved = boxed.resolve(text(box.text, drawn))
            let measured = resolved.measure(in: CGSize(width: CGFloat.greatestFiniteMagnitude, height: CGFloat(cell.height) * 4.0))
            let scale = ScreenLayout.fit(measured: measured.width, box: area.width)
            boxed.translateBy(x: area.midX, y: area.midY)
            boxed.scaleBy(x: scale, y: scale)
            boxed.draw(resolved, at: .zero, anchor: .center)
        case .shape(let code):
            guard let glyph = code.glyph else { return }
            let width = cell.width
            // One shape per column: a shape box holds one character a column.
            for (place, _) in box.text.enumerated() {
                let one = CGRect(x: CGFloat(area.minX) + CGFloat(place) * width, y: 0, width: width, height: cell.height)
                let paint = glyph.paint(in: one, light: light)
                var shaded = boxed
                shaded.opacity = Double(boxed.opacity) * paint.opacity
                for fill in paint.fills {
                    shaded.fill(Path(fill), with: .color(drawn.ink))
                }
                for stroke in paint.strokes {
                    shaded.stroke(stroke, with: .color(drawn.ink), lineWidth: paint.strokeWidth)
                }
            }
        }
    }
}
