import SwiftUI
import XCTest
@testable import Tortie

/// The Screen leaves no picture (Phase 337, build/p337/SPEC.md D41,
/// conformance:ios rule ao): iOS photographs an app as it leaves the
/// foreground and keeps the picture on the device, so the Screen draws a
/// plain `--bg-canvas` plate over the grid whenever its scene is not active,
/// and the plate holds no text, no row and no run. Each test names the clause
/// it holds and fails when that clause is taken out of Screens/Screen.swift.
final class ScreenCoverTests: XCTestCase {
    /// Clause: the cover is drawn for `.inactive` and `.background`, and
    /// never for `.active`.
    func testTheCoverIsDrawnWheneverTheSceneIsNotActive() {
        XCTAssertTrue(ScreenCover.drawn(for: .inactive))
        XCTAssertTrue(ScreenCover.drawn(for: .background))
        XCTAssertFalse(ScreenCover.drawn(for: .active))
    }

    /// Clause: the Screen reads the scene's phase and draws the cover from
    /// it, and the cover is the canvas token and nothing else: no Text, no
    /// row, no run.
    func testTheCoverHoldsNothingOfTheScreen() throws {
        let source = try StyleSource.text("ios/Tortie/Screens/Screen.swift")
        XCTAssertTrue(source.contains("@Environment(\\.scenePhase)"))
        XCTAssertTrue(source.contains("if ScreenCover.drawn(for: scenePhase) {"))
        let start = try XCTUnwrap(source.range(of: "struct ScreenCover: View {"))
        let end = try XCTUnwrap(source.range(of: "// MARK: - The screen", range: start.upperBound..<source.endIndex))
        let cover = String(source[start.lowerBound..<end.lowerBound])
        XCTAssertTrue(cover.contains(".fill(Tokens.bgCanvas)"))
        for drawn in ["Text(", "Words(", "ScreenGrid", "ScreenRowView", "rows", "runs", "picture"] {
            XCTAssertFalse(cover.contains(drawn), "the cover draws \(drawn)")
        }
    }

    /// Clause: the cover is drawn ABOVE the terminal, the header and the
    /// tray, last in the page's stack (Phase 337.1: `ScreenPage` is generic
    /// over the page that holds it, build/p3371/SPEC.md section 5.5.4).
    func testTheCoverIsOverTheGrid() throws {
        let source = try StyleSource.text("ios/Tortie/Screens/Screen.swift")
        let body = try XCTUnwrap(source.range(of: "struct ScreenPage<Header: View, Tray: View, Trailing: ToolbarContent>: View {"))
        let rest = source[body.upperBound...]
        let stack = try XCTUnwrap(rest.range(of: "var body: some View {"))
        let drawn = rest[stack.upperBound...]
        let cover = try XCTUnwrap(drawn.range(of: "ScreenCover()"))
        for piece in ["header\n", "content\n", "tray\n"] {
            let at = try XCTUnwrap(drawn.range(of: piece), piece)
            XCTAssertLessThan(at.lowerBound, cover.lowerBound, "the cover is drawn under \(piece)")
        }
    }
}
