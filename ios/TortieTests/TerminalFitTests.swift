import SwiftUI
import UIKit
import XCTest
@testable import Tortie

/// The fitted Terminal fills the phone's width below 3x (Phase 333.4.1,
/// build/p33341/SPEC.md D4 and D5; his ruling of 2026-10-16, research 142
/// sections 2.1 and 4.3). `ScreenCell.wide` snaps the fitted width DOWN to a
/// pixel, so an iPhone SE (375 points at 2x) drew 360 of its 375 at 80 and 120
/// columns, 355 at 142 and 300 at 200. Below 3x the fitted cell now keeps the
/// fitted width itself and rounds every column EDGE to the nearest pixel
/// (`ScreenCell.filling`, `ScreenCell.x`), so the grid is exactly the view's
/// width and its cells differ by at most one pixel; a zoomed cell, and every
/// cell at 3x, are exactly what they were, every edge `column × width`.
///
/// The scroll view is mounted in a window of the host app's own scene with
/// its display scale set by a trait override, so every clause runs at 2x AND
/// at 3x whatever this device's own scale is. Each test names the clause it
/// holds and fails when that clause's line is taken out of
/// Screens/ScreenScroller.swift, Screens/ScreenRows.swift or
/// Screens/ScreenGrid.swift. Nothing reaches a network.
@MainActor
final class TerminalFitTests: XCTestCase {
    private var window: UIWindow?

    override func tearDown() async throws {
        endWindow()
    }

    /// The live screen's rows, and the row the cursor sits on.
    static let rows = 40
    static let cursorRow = 3
    /// The fitted widths measured on the SE at 26.3 (section 2.2), each
    /// column count's pixel widths with the fill.
    static let measured: [(columns: Int, pixels: Set<Int>)] = [
        (80, [9, 10]), (120, [6, 7]), (142, [5, 6]), (200, [3, 4]),
    ]

    // MARK: Pictures and mounting

    /// A live picture `columns` wide, its cursor shown at `cursorColumn` on
    /// row 3.
    static func picture(columns: Int, cursorColumn: Int) throws -> ScreenPicture {
        let lines: [[[String: Any]]] = (0..<rows).map { r in
            let text = "row " + String(r)
            return [["text": text, "style": 0, "cells": text.count]]
        }
        let built = ScreenSample.screen(cols: columns, rows: rows, lines: lines, cursor: (cursorColumn, cursorRow))
        let screen = try XCTUnwrap(try ScreenSample.decode(ScreenSample.answer(screen: built)).screen, "the screen does not decode")
        return ScreenPicture(screen, revision: ScreenSample.revision)
    }

    /// A column whose edge is NOT `column × width` once rounded, at every
    /// count of `measured`: past the middle, so the cursor's clause reads red
    /// when the cursor is placed by `column × width`.
    static func cursorColumn(_ columns: Int) -> Int {
        columns / 2 + 1
    }

    /// A scroll view `width` points wide at `scale`, over `columns` columns,
    /// laid out.
    private func mounted(columns: Int, width: CGFloat, scale: CGFloat) throws -> ScreenScrollView {
        endWindow()
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
        let window = scene.map { UIWindow(windowScene: $0) } ?? UIWindow(frame: CGRect(x: 0, y: 0, width: 402, height: 874))
        window.frame = CGRect(x: 0, y: 0, width: 402, height: 874)
        let host = UIViewController()
        window.rootViewController = host
        window.makeKeyAndVisible()
        self.window = window
        let history = ScrollbackModel(door: ScriptedScreenDoor(), holds: { _ in true })
        let view = ScreenScrollView(scrollback: history)
        view.traitOverrides.displayScale = scale
        view.frame = CGRect(x: 0, y: 116, width: width, height: 600)
        view.actions = ScreenScrollerActions(tap: { _ in }, select: { _ in }, copy: {}, overlap: { _ in })
        host.view.addSubview(view)
        view.updateTraitsIfNeeded()
        XCTAssertEqual(view.traitCollection.displayScale, scale, "the scale this test lays the Terminal out at")
        let picture = try Self.picture(columns: columns, cursorColumn: Self.cursorColumn(columns))
        history.picture(picture)
        view.picture = picture
        view.layoutIfNeeded()
        return view
    }

    private func endWindow() {
        window?.isHidden = true
        window?.rootViewController = nil
        window = nil
    }

    /// The window of rows the view hosts, as it was last drawn: the view's
    /// own hosting controller, read by reflection (its `host` is private, and
    /// a hosting controller outside the view controller tree is not its
    /// view's next responder, measured on the SE at 26.3), and its view the
    /// one under the content view.
    private func drawn(_ view: ScreenScrollView) throws -> (window: ScreenWindow, frame: CGRect) {
        let hosts = Mirror(reflecting: view).children.compactMap { child in
            child.label == "host" ? child.value as? UIHostingController<ScreenWindow> : nil
        }
        XCTAssertEqual(hosts.count, 1, "the one window of rows")
        let host = try XCTUnwrap(hosts.first, "the window of rows is not hosted")
        XCTAssertTrue(host.view.superview === view.contentView, "the window of rows is not under the content view")
        return (host.rootView, host.view.frame)
    }

    /// A painter over `cell`, for its rectangles.
    private func painter(_ cell: ScreenCell) -> ScreenRowPainter {
        ScreenRowPainter(row: ScreenRowModel(index: 0, runs: [], holds: { _ in true }), styles: [], ink: .white, cell: cell, light: 1)
    }

    // MARK: Below 3x, fitted (D4)

    /// Clause (D4, `layoutSubviews`'s choice of cell): fitted at 2x the cell
    /// is the filling one, its width the fitted width itself, and the content,
    /// the hosted window and the window's own cell are exactly the view's
    /// width, upright on an SE (375) at every measured column count and
    /// sideways (667) at 80, where `wide` drew 360, 360, 355, 300 and 640.
    func testTheFittedGridFillsTheViewAt2x() throws {
        let rows: [(width: CGFloat, columns: Int, today: CGFloat)] = [
            (375, 80, 360), (375, 120, 360), (375, 142, 355), (375, 200, 300), (667, 80, 640),
        ]
        for row in rows {
            let view = try mounted(columns: row.columns, width: row.width, scale: 2)
            let fitted = ScreenZoom.fitted(columns: row.columns, width: row.width)
            let said = "\(row.columns) columns in \(row.width) points at 2x"
            XCTAssertEqual(view.cell, ScreenCell.filling(fitted, scale: 2), "the filling cell, \(said)")
            XCTAssertEqual(view.cell.width, fitted, "the fitted width itself, \(said)")
            XCTAssertEqual(view.cell.edgeScale, 2, "every edge rounded to a 2x pixel, \(said)")
            XCTAssertEqual(view.contentSize.width, row.width, "the content is the view's width, \(said) (it was \(row.today))")
            let (window, frame) = try drawn(view)
            XCTAssertEqual(frame.width, row.width, "the hosted window is the view's width, \(said)")
            XCTAssertEqual(window.cell, view.cell, "the window draws the cell laid out, \(said)")
            XCTAssertEqual(window.cell.x(CGFloat(row.columns)), row.width, "the window's rows are the view's width, \(said)")
            print("P33341_FIT|\(row.columns)|\(row.width)|cell \(view.cell.width)|row \(view.cell.height)|content \(view.contentSize.width)")
        }
    }

    /// Clause (D4, `ScreenCell.x` and `ScreenCell.filling`): at each measured
    /// column count on a 375-point 2x window, every column edge from 0 to the
    /// last is a whole number of pixels, the last edge is the window's width,
    /// and the cells are the measured widths, at most one pixel apart.
    func testEveryEdgeIsOnAWholePixelAndCellsDifferByOnePixelAtMost() {
        for (columns, pixels) in Self.measured {
            let cell = ScreenCell.filling(ScreenZoom.fitted(columns: columns, width: 375), scale: 2)
            var widths: [Int] = []
            for column in 0...columns {
                let edge = CGFloat(cell.x(CGFloat(column))) * 2
                XCTAssertEqual(edge, edge.rounded(), "edge \(column) of \(columns) is not on a whole pixel")
                if column > 0 {
                    widths.append(Int((CGFloat(edge) - CGFloat(cell.x(CGFloat(column - 1))) * 2).rounded()))
                }
            }
            XCTAssertEqual(cell.x(CGFloat(columns)), 375, "the last edge at \(columns) columns")
            XCTAssertEqual(Set(widths), pixels, "the cells' pixel widths at \(columns) columns")
            XCTAssertLessThanOrEqual((widths.max() ?? 0) - (widths.min() ?? 0), 1, "cells more than a pixel apart at \(columns) columns")
            XCTAssertEqual(widths.reduce(0, +), 750, "the cells' pixels at \(columns) columns")
        }
    }

    /// Clause (D5, `ScreenRowPainter.rect`): below 3x a box's rectangle runs
    /// from its column's edge to the edge after its last column, so a run's
    /// ground, a box's clip and a shape's own column land on whole pixels.
    func testABoxRunsFromItsEdgeToTheNextAt2x() {
        for (columns, _) in Self.measured {
            let cell = ScreenCell.filling(ScreenZoom.fitted(columns: columns, width: 375), scale: 2)
            let painter = painter(cell)
            var wrong: [String] = []
            for column in 0..<columns {
                for span in 1...3 where column + span <= columns {
                    let rect = painter.rect(column: CGFloat(column), span: CGFloat(span))
                    let left = cell.x(CGFloat(column))
                    let right = cell.x(CGFloat(column + span))
                    if rect.minX != left || rect.maxX != right || rect.minY != 0 || rect.height != cell.height {
                        wrong.append("\(column)+\(span): \(rect) where the edges are \(left) and \(right)")
                    }
                }
            }
            XCTAssertEqual(wrong, [], "boxes off their edges at \(columns) columns")
        }
    }

    /// Clause (D5, the cursor): below 3x the cursor's block runs from its
    /// column's edge to the next column's, at a column whose edge is not
    /// `column × width`.
    func testTheCursorRunsFromItsEdgeToTheNextAt2x() throws {
        for (columns, _) in Self.measured {
            let view = try mounted(columns: columns, width: 375, scale: 2)
            let cell = view.cell
            let column = Self.cursorColumn(columns)
            XCTAssertNotEqual(cell.x(CGFloat(column)), CGFloat(column) * cell.width, "the test's column is one whose edge was rounded")
            let cursor = try XCTUnwrap(try drawn(view).window.cursor, "no cursor at \(columns) columns")
            let down = CGFloat(Self.cursorRow) - CGFloat(view.rowWindow.lowerBound)
            XCTAssertEqual(cursor.minX, cell.x(CGFloat(column)), "the cursor's left edge at \(columns) columns")
            XCTAssertEqual(cursor.maxX, cell.x(CGFloat(column + 1)), "the cursor's right edge at \(columns) columns")
            XCTAssertEqual(cursor.minY, CGFloat(down) * cell.height, accuracy: 0.001, "the cursor's row at \(columns) columns")
            XCTAssertEqual(cursor.height, cell.height, "the cursor's height at \(columns) columns")
        }
    }

    /// Clause (D4, the zoomed cell): a cell zoomed past the next whole pixel
    /// at 2x is `wide`'s, every edge `column × width` as before; back at the
    /// fitted width it fills again.
    func testAZoomedCellIsSnappedAsBefore() throws {
        let view = try mounted(columns: 120, width: 375, scale: 2)
        let fitted = ScreenZoom.fitted(columns: 120, width: 375)
        let top = ScreenZoom.top(columns: 120, scale: 2, fitted: fitted)
        view.zoom(to: CGFloat(fitted) * 2, focal: .zero)
        view.layoutIfNeeded()
        XCTAssertEqual(view.cell, ScreenCell.wide(ScreenZoom.held(CGFloat(fitted) * 2, fitted: fitted, top: top), scale: 2), "zoomed, the cell snapped down")
        XCTAssertEqual(view.cell.edgeScale, 0, "zoomed, every edge column × width")
        XCTAssertEqual(view.contentSize.width, CGFloat(120) * view.cell.width, "zoomed, the content column × width")
        view.zoom(to: fitted, focal: .zero)
        view.layoutIfNeeded()
        XCTAssertEqual(view.cell, ScreenCell.filling(fitted, scale: 2), "back at the fitted width, the filling cell")
        XCTAssertEqual(view.contentSize.width, 375, "back at the fitted width, the view's width")
    }

    /// Clause (D4, `snapped.width <= fitted`, the integrator's round): a small
    /// pinch out at 2x, to a width `wide` snaps DOWN to no wider than the
    /// fitted one, keeps the filling cell, so a pinch out never draws the grid
    /// narrower or its text smaller than before it. Red when the guard is
    /// `wanted == fitted`, which drew 360, 360, 355 and 300 of 375 here, less
    /// than the fitted grid the pinch began on.
    func testASmallPinchOutNeverNarrowsTheGrid() throws {
        for (columns, _) in Self.measured {
            let view = try mounted(columns: columns, width: 375, scale: 2)
            let fitted = ScreenZoom.fitted(columns: columns, width: 375)
            let small = CGFloat(fitted) * 1.02
            XCTAssertLessThanOrEqual(ScreenCell.wide(small, scale: 2).width, fitted, "the test's pinch snaps down to the fitted width or below at \(columns) columns")
            view.zoom(to: small, focal: .zero)
            view.layoutIfNeeded()
            XCTAssertEqual(view.cell, ScreenCell.filling(fitted, scale: 2), "a small pinch out left the filling cell at \(columns) columns")
            XCTAssertEqual(view.contentSize.width, 375, "a small pinch out narrowed the grid at \(columns) columns")
        }
    }

    // MARK: At 3x, exactly as before (his ruling)

    /// Clause (D4, `displayScale < 3`): at 3x on a 402-point window the fitted
    /// cell is `wide`'s exactly, with no rounded edge; every edge, box and the
    /// cursor are `column × width` exactly as before (`==`), and the content
    /// is what it was: 400, 400, 378.67 and 400 points (section 2.2).
    func testA3xScreenIsExactlyAsBefore() throws {
        let today: [Int: CGFloat] = [80: 400, 120: 400, 142: 378.67, 200: 400]
        for (columns, _) in Self.measured {
            let view = try mounted(columns: columns, width: 402, scale: 3)
            let cell = view.cell
            let said = "\(columns) columns at 3x"
            XCTAssertEqual(cell, ScreenCell.wide(ScreenZoom.fitted(columns: columns, width: 402), scale: 3), "wide's cell, \(said)")
            XCTAssertEqual(cell.edgeScale, 0, "no rounded edge, \(said)")
            XCTAssertEqual(view.contentSize.width, CGFloat(columns) * cell.width, "the content column × width, \(said)")
            XCTAssertEqual(view.contentSize.width, try XCTUnwrap(today[columns]), accuracy: 0.01, "the content as before, \(said)")
            let painter = painter(cell)
            var wrong: [String] = []
            for column in 0...columns {
                if cell.x(CGFloat(column)) != CGFloat(column) * cell.width { wrong.append("edge \(column)") }
                for span in 1...3 where column + span <= columns {
                    let rect = painter.rect(column: CGFloat(column), span: CGFloat(span))
                    let before = CGRect(x: CGFloat(column) * cell.width, y: 0, width: CGFloat(span) * cell.width, height: cell.height)
                    if rect != before { wrong.append("box \(column)+\(span): \(rect), before \(before)") }
                }
            }
            XCTAssertEqual(wrong, [], "edges or boxes moved, \(said)")
            let column = Self.cursorColumn(columns)
            let cursor = try XCTUnwrap(try drawn(view).window.cursor, "no cursor, \(said)")
            let down = CGFloat(Self.cursorRow) - CGFloat(view.rowWindow.lowerBound)
            XCTAssertEqual(
                cursor, CGRect(x: CGFloat(column) * cell.width, y: CGFloat(down) * cell.height, width: cell.width, height: cell.height),
                "the cursor as before, \(said)"
            )
        }
    }
}
