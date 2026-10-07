// The Terminal's rows, drawn at the Mac's width (Phase 337, build/p337/SPEC.md
// D26, D27 and section 5.8.4; rebuilt by Phase 337.1, build/p3371/SPEC.md D24
// to D26, D32).
//
// APPLE'S OWN DRAWING AND NO PACKAGE (rules f and g): a SwiftUI `Canvas` per
// row, so a screen costs about forty views rather than a view per run, and
// each run is placed at its own column, which one `Text` of the whole row
// cannot do for a wide cell. Each row is `.equatable()`: a row that did not
// change between two pictures is not drawn again. A row draws, in order: each
// run's ground; each box of Screens/ScreenRows.swift's layout, clipped to
// exactly its columns (text, a character alone and scaled down to fit, or a
// box or block shape from Screens/ScreenGlyphs.swift); its underline and its
// line through. The cursor's block (at 0.45 opacity, in the Mac's cursor
// colour) and the selection are drawn over the rows. Every row is one
// accessibility element whose label is its text.
//
// SINCE PHASE 337.1 THE ROWS ARE DRAWN IN A WINDOW (`ScreenWindow`), hosted by
// the Terminal's UIKit scroll view (Screens/ScreenScroller.swift): only the
// rows in view and one screen above and below, live rows and rows of history
// alike, each placed by its index. A row of history is `screen-history-<i>`,
// a live row keeps `screen-row-<n>`, and a row reserved but not yet fetched is
// drawn as the ground and is no element. Only the rows in view are elements
// (the fix round): those a screen above and below are drawn and not spoken.
// The SwiftUI scroll view, its long press and its pinch are gone: a two-axis
// SwiftUI scroll view centres content smaller than itself, and on iOS 26.3
// the rows sat 134.7 pt low after the keyboard went until the first long
// press re-laid them (build/p3371/SPEC.md section 14 M12).
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
// phone never sizes the Mac (his ruling 2), and the Terminal only MEASURES
// the view it is drawn in.
//
// ZOOM (D27 of 337, D32 of 337.1). The Terminal first fits the view's width.
// A pinch scales the drawn rows by a transform while the fingers move and
// sets the font ONCE when they lift (a font change redraws every row); the
// zoom runs from the fitted size to 18 pt, its top held so a row's width in
// pixels is at most 8,192 (a 512-column row at 18 pt is about 17,000 px at
// 3x, past the GPU's texture bound, §Attack A24). A double tap moves between
// the fitted size and 12 pt (or the top). The row under the pinch's centre
// stays under it when the font is set.

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

    /// A light line's thickness: about a tenth of a cell, at least one pixel.
    static func lightLine(_ cell: ScreenCell, scale: CGFloat) -> CGFloat {
        max(CGFloat(1.0) / max(scale, 1), CGFloat(cell.width) * 0.12)
    }
}

// MARK: - The window of rows

/// One row of the window, as drawn: its absolute index, the row (nil while
/// it is reserved and not yet fetched), the styles its runs index, and for a
/// live row its place on the live screen.
struct ScreenWindowRow: Identifiable, Equatable {
    /// The row's absolute index in the session's index space.
    let id: Int
    let row: ScreenRowModel?
    let styles: [ScreenStyle]
    /// Live row `n`, or nil for a row of history.
    let live: Int?
    /// In view when the window was drawn, so an accessibility element; the
    /// rows a screen above and below are drawn and not spoken.
    var spoken = true
}

/// The rows the Terminal's scroll view draws: the window in view and one
/// screen above and below, from its first row, with the cursor and the
/// selection over them, in the window's own points. Hosted by one
/// `UIHostingController` that takes no touch (Screens/ScreenScroller.swift).
struct ScreenWindow: View {
    let rows: [ScreenWindowRow]
    let columns: Int
    let cell: ScreenCell
    let ink: Color
    let ground: Color
    let caret: Color
    let light: CGFloat
    /// Where the cursor's block is, in the window's points, or nil.
    let cursor: CGPoint?
    /// One rectangle per selected row, in the window's points.
    let highlights: [CGRect]

    /// Nothing to draw yet.
    static let empty = ScreenWindow(
        rows: [], columns: 0, cell: ScreenCell(fontSize: 1, width: 1, height: 1),
        ink: Tokens.textPrimary, ground: Tokens.bgCanvas, caret: Tokens.textPrimary, light: 1, cursor: nil, highlights: []
    )

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(rows) { item in
                drawn(item)
            }
        }
        .frame(width: CGFloat(columns) * cell.width, alignment: .topLeading)
        .background(ground)
        .overlay(alignment: .topLeading) { caretBlock }
        .overlay(alignment: .topLeading) { highlight }
    }

    /// A held or live row in its `Canvas`; a reserved row as the ground.
    @ViewBuilder
    private func drawn(_ item: ScreenWindowRow) -> some View {
        if let row = item.row {
            ScreenRowView(row: row, styles: item.styles, ink: ink, cell: cell, light: light)
                .equatable()
                .frame(width: CGFloat(columns) * cell.width, height: cell.height, alignment: .topLeading)
                // A row out of view is no element at all (the fix round): an
                // empty container with no name, no label and no child is not
                // one, where a hidden element still was to the test framework.
                .accessibilityElement(children: item.spoken ? .ignore : .contain)
                .accessibilityLabel(Text(verbatim: item.spoken ? row.label : ""))
                .accessibilityIdentifier(item.spoken ? item.live.map(ID.screenRow) ?? ID.screenHistoryRow(item.id) : "")
                .accessibilityHidden(!item.spoken)
        } else {
            Spacer(minLength: 0)
                .frame(width: CGFloat(columns) * cell.width, height: cell.height)
                .accessibilityHidden(true)
        }
    }

    /// The cursor's block, at 0.45 opacity, where tmux's cursor is.
    @ViewBuilder
    private var caretBlock: some View {
        if let cursor {
            Rectangle()
                .fill(caret.opacity(0.45))
                .frame(width: cell.width, height: cell.height)
                .offset(x: cursor.x, y: cursor.y)
                .allowsHitTesting(false)
                .accessibilityElement()
                .accessibilityIdentifier(ID.screenCursor)
        }
    }

    /// The selection, one rectangle per row, in the accent.
    @ViewBuilder
    private var highlight: some View {
        if !highlights.isEmpty {
            ZStack(alignment: .topLeading) {
                ForEach(Array(highlights.enumerated()), id: \.offset) { _, rect in
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
