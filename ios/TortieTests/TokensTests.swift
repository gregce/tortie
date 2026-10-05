import SwiftUI
import UIKit
import XCTest
@testable import Tortie

/// `Style/Tokens.swift` against the Mac's own `tokens.css` and the approved
/// mocks (build/p316/SPEC.md section 4, S2, builder C). Each test names the
/// clause it holds, and each fails when that clause is taken out.
final class TokensTests: XCTestCase {
    /// Clause: "each named as its tokens.css token with the same hex". Every
    /// case, turned back into its token's name, holds the value the DARK base
    /// holds for that name. A changed digit, a renamed case, or a name the dark
    /// base does not have, each fails here.
    func testEveryTokenIsTheDarkBaseValueOfItsOwnName() throws {
        let dark = StyleSource.darkTokens(try StyleSource.text("src/renderer/styles/tokens.css"))
        XCTAssertGreaterThan(dark.count, 20, "the dark base was not read")
        for token in Token.allCases {
            let name = StyleSource.kebab(String(describing: token))
            let css = try XCTUnwrap(dark[name], "--\(name) is not in the dark base")
            XCTAssertEqual(token.hex, css, "--\(name)")
        }
    }

    /// Clause: "the 15 colours" (Phase 316.6; 14 before it). The screens the
    /// phone draws are the twelve mocks below, and the set of hexes their CSS
    /// spells is exactly the set this file holds: a colour dropped from
    /// Tokens.swift, or one the mocks do not use, fails here. Phase 318 took
    /// the message strip off the two screens that need input (Session, Choice),
    /// where it had been drawn at rest in --text-disabled, so its fix round
    /// added Idle, the session idle at its own prompt with the strip at rest,
    /// which is where the app draws that colour now (MessageStrip.swift).
    func testTheMocksSpellExactlyTheseColours() throws {
        var spelled = Set<UInt32>()
        let mocks = [
            "Main", "NeedsInput", "Session", "Idle", "Choice", "Pairing", "Settings", "Unpair", "Conversation", "Link",
            // Phase 316.7: the menu, and the older-Mac face (the parent's list).
            "SessionsMenu", "SessionsOlderMac",
        ]
        for mock in mocks {
            spelled.formUnion(StyleSource.hexesSpelled(try StyleSource.text("docs/design/phone/\(mock).html")))
        }
        let held = Set(Token.allCases.map(\.hex))
        XCTAssertEqual(held, spelled)
        XCTAssertEqual(held.count, 15)
        XCTAssertEqual(Token.allCases.count, 19, "nineteen names: two tokens that hold one hex stay two names")
    }

    /// Clause: the colour IS its hex, in sRGB and opaque. A shifted channel, a
    /// swapped channel, a wide-gamut colour space or an alpha below one each
    /// resolves to other components than the hex says.
    func testEachColourResolvesToItsHexInSRGB() {
        let environment = EnvironmentValues()
        for token in Token.allCases {
            let resolved = token.color.resolve(in: environment)
            let channels = [
                (resolved.red, (token.hex >> 16) & 0xff),
                (resolved.green, (token.hex >> 8) & 0xff),
                (resolved.blue, token.hex & 0xff),
            ]
            for (component, byte) in channels {
                XCTAssertEqual((component * 255).rounded(), Float(byte), "\(token)")
            }
            XCTAssertEqual(resolved.opacity, 1, "\(token)")
        }
    }

    /// Clause: the UIKit colour (the tab badge's, Phase 316.6) IS its hex too,
    /// in sRGB and opaque, so the badge is the Mac's count badge and not a
    /// colour that merely looks like it.
    func testEachUIColorIsItsHexInSRGB() throws {
        let srgb = try XCTUnwrap(CGColorSpace(name: CGColorSpace.sRGB))
        for token in Token.allCases {
            let cg = try XCTUnwrap(token.uiColor.cgColor.converted(to: srgb, intent: .defaultIntent, options: nil), "\(token)")
            let components = try XCTUnwrap(cg.components, "\(token)")
            XCTAssertEqual(components.count, 4, "\(token)")
            let bytes = [(token.hex >> 16) & 0xff, (token.hex >> 8) & 0xff, token.hex & 0xff]
            for (component, byte) in zip(components.prefix(3), bytes) {
                XCTAssertEqual((component * 255).rounded(), CGFloat(byte), "\(token)")
            }
            XCTAssertEqual(components[3], 1, "\(token)")
        }
    }

    /// Clause: a screen's `Tokens.x` is its own token's colour and no other.
    func testEachNamedColourIsItsOwnToken() {
        let wired: [(Color, Token)] = [
            (Tokens.bgSidebar, .bgSidebar),
            (Tokens.bgSurface, .bgSurface),
            (Tokens.bgRaised, .bgRaised),
            (Tokens.border, .border),
            (Tokens.borderStrong, .borderStrong),
            (Tokens.textPrimary, .textPrimary),
            (Tokens.textSecondary, .textSecondary),
            (Tokens.textMuted, .textMuted),
            (Tokens.textDisabled, .textDisabled),
            (Tokens.accent, .accent),
            (Tokens.statusAttention, .statusAttention),
            (Tokens.statusWorking, .statusWorking),
            (Tokens.statusIdle, .statusIdle),
            (Tokens.statusExited, .statusExited),
            (Tokens.statusFailed, .statusFailed),
            (Tokens.statusAttentionBadgeBg, .statusAttentionBadgeBg),
            (Tokens.statusAttentionBadgeFg, .statusAttentionBadgeFg),
            (Tokens.error, .error),
            (Tokens.graphLane3, .graphLane3),
        ]
        XCTAssertEqual(wired.count, Token.allCases.count)
        for (color, token) in wired {
            XCTAssertEqual(color, token.color, "\(token)")
        }
    }

    /// The reader the first test leans on: it stops at the dark block, so the
    /// light base's value for a name never wins.
    /// The fixture's colours are spelled in pieces and its expectation in
    /// decimal, so that no colour literal stands anywhere outside Tokens.swift,
    /// not even in a test.
    func testTheReaderStopsAtTheDarkBlock() {
        let dark = "#" + "010203"
        let light = "#" + "fefefe"
        let css = ":root {\n  --a-b: \(dark);\n}\n:root[data-scheme='light'] {\n  --a-b: \(light);\n}\n"
        XCTAssertEqual(StyleSource.darkTokens(css), ["a-b": 66051])
        XCTAssertEqual(StyleSource.kebab("graphLane3"), "graph-lane-3")
        XCTAssertEqual(StyleSource.kebab("bgSidebar"), "bg-sidebar")
    }
}
