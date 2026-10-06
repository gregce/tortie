import SwiftUI
import XCTest
@testable import Tortie

/// A colour the door names (Phase 337, build/p337/SPEC.md D12, conformance:ios
/// rule am): the committed sample's styles, composed by the SHIPPING composer
/// on the Mac, made `Color` by `Token.drawn`, the one constructor, read back as
/// the same three bytes in sRGB and opaque. Each test names the clause it
/// holds and fails when that clause is taken out of Style/Tokens.swift or
/// Door/Contract.swift.
final class ScreenColourTests: XCTestCase {
    private func bytes(_ color: Color) -> [Float] {
        let resolved = color.resolve(in: EnvironmentValues())
        return [resolved.red, resolved.green, resolved.blue].map { ($0 * 255).rounded() }
    }

    private func bytes(_ color: ScreenColor) -> [Float] {
        [Float(color.red), Float(color.green), Float(color.blue)]
    }

    /// Clause: every colour of the sample, the ground, the ink, the caret and
    /// each style's two, drawn through `Token.drawn`, is its own three bytes,
    /// in sRGB, opaque.
    func testTheSamplesColoursAreTheirOwnBytes() throws {
        let screen = try XCTUnwrap(try ScreenSample.committedSample().screen)
        var colours = [screen.ground, screen.ink, screen.caret]
        for style in screen.styles {
            colours.append(style.fg)
            if let bg = style.bg { colours.append(bg) }
        }
        XCTAssertGreaterThan(colours.count, 5)
        for colour in colours {
            XCTAssertEqual(bytes(Token.drawn(colour)), bytes(colour))
            XCTAssertEqual(Token.drawn(colour).resolve(in: EnvironmentValues()).opacity, 1)
        }
        print("P337_COLOUR|sample|\(Set(colours).count) distinct")
    }

    /// Clause: the Mac's own ground is `--bg-canvas`, which is the token the
    /// phone draws around the grid.
    func testTheSamplesGroundIsTheCanvas() throws {
        let screen = try XCTUnwrap(try ScreenSample.committedSample().screen)
        XCTAssertEqual(bytes(screen.ground), [Float((Token.bgCanvas.hex >> 16) & 0xff), Float((Token.bgCanvas.hex >> 8) & 0xff), Float(Token.bgCanvas.hex & 0xff)])
    }

    /// Clause (am): `Token.drawn` is declared once, in Style/Tokens.swift; no
    /// other app file builds a colour from components.
    func testTheOneConstructorIsTokens() throws {
        let tokens = try StyleSource.text("ios/Tortie/Style/Tokens.swift")
        XCTAssertEqual(tokens.components(separatedBy: "static func drawn(_ rgb: ScreenColor) -> Color").count, 2)
        for file in ["Screens/Screen.swift", "Screens/ScreenGrid.swift", "Screens/ScreenRows.swift", "Screens/ScreenGlyphs.swift",
                     "Screens/ScreenKeyField.swift", "Screens/ScreenSelection.swift", "Door/Contract.swift"] {
            let source = try StyleSource.text("ios/Tortie/" + file)
            XCTAssertFalse(source.contains("Color(.sRGB"), file)
            XCTAssertFalse(source.contains("Color(red:"), file)
        }
    }
}
