import SwiftUI
import UIKit
import XCTest
@testable import Tortie

/// The key bar above the Terminal's keyboard squeezes no key (Phase 333.4.1,
/// build/p33341/SPEC.md D7). Every word at its own width costs about 387
/// points, which the iPhone 16 Pro's 402-point window holds and an iPhone SE's
/// 375 does not, where `return` was squeezed to 41.5 of its 60: so the bar is
/// the row of words when it fits and otherwise the same row with `return`
/// drawn as its glyph at an arrow key's size (`ViewThatFits`), under the same
/// name and identifier. And it stays at the default text size whatever his
/// (`.dynamicTypeSize(...DynamicTypeSize.large)`), as the iPhone's own keyboard
/// does: at the accessibility sizes the arrows grew to 36 to 42 × 44 and
/// squeezed ⇧tab, ctrl and return to 34 on both phones (section 2.4).
///
/// Measured as SwiftUI lays the bar out with no width given (its ideal
/// width, `fixedSize()`), through `UIHostingController.sizeThatFits(in:)`, so
/// nothing is drawn, and read as text through `StyleSource`. Each test names
/// the clause it holds and fails when that clause is taken out of
/// Screens/ScreenKeyField.swift.
@MainActor
final class KeyBarTests: XCTestCase {
    private func bar() -> ScreenKeyBar {
        ScreenKeyBar(bar: ScreenKeyBarModel(), press: { _ in }, hide: {})
    }

    /// `view`'s ideal size: what SwiftUI lays it out at with no width or
    /// height given.
    private func ideal<V: View>(_ view: V) -> CGSize {
        UIHostingController(rootView: view.fixedSize()).sizeThatFits(in: CGSize(width: 4_000, height: 4_000))
    }

    /// Clause (D7, the two rows): the row of words is wider than an SE's 375
    /// points and no wider than the iPhone 16 Pro's 402, and the row with
    /// `return` as its glyph fits in 375; with no width given the bar is the
    /// row of words.
    func testTheWordsFitA402PointWindowAndTheGlyphA375PointOne() {
        let words = ideal(bar().keys(returnWord: true).environment(\.dynamicTypeSize, .large)).width
        let glyph = ideal(bar().keys(returnWord: false).environment(\.dynamicTypeSize, .large)).width
        let whole = ideal(bar().environment(\.dynamicTypeSize, .large)).width
        XCTAssertGreaterThan(words, 375, "every word at its width fits an SE's 375 points: the glyph would never be drawn")
        XCTAssertLessThanOrEqual(words, 402, "every word at its width no longer fits the iPhone 16 Pro's 402 points")
        XCTAssertLessThanOrEqual(glyph, 375, "with return as its glyph the bar still does not fit an SE's 375 points")
        XCTAssertLessThan(glyph, words, "the glyph row is no narrower than the words")
        XCTAssertEqual(whole, words, accuracy: 0.01, "with room for every word the bar is not the row of words")
        print("P33341_KEYS|words \(words)|glyph \(glyph)|bar \(whole)")
    }

    /// Clause (D7, the cap): the bar's ideal size is the same at every text
    /// size, the accessibility sizes included, as the iPhone's own keyboard
    /// is. Without the cap the arrows grow with the text and widen the bar by
    /// 24 points or more at the largest size.
    func testTheBarIsTheSameAtEveryTextSize() {
        let base = ideal(bar().environment(\.dynamicTypeSize, .large))
        let sizes: [DynamicTypeSize] = [.xSmall, .medium, .xxxLarge, .accessibility1, .accessibility3, .accessibility5]
        for size in sizes {
            let at = ideal(bar().environment(\.dynamicTypeSize, size))
            XCTAssertEqual(at.width, base.width, accuracy: 0.01, "the bar's width moves at \(size)")
            XCTAssertEqual(at.height, base.height, accuracy: 0.01, "the bar's height moves at \(size)")
        }
    }

    /// Clause (D7, as text): the bar's body is ONE `ViewThatFits` over the
    /// two rows, the row of words first, with ONE cap on it; both rows press
    /// `.enter` under the name "Return" and the identifier
    /// `screen-key-return`, so no test or probe press moves; and the glyph is
    /// the SF Symbol `return`.
    func testTheBarChoosesOneRowUnderOneCap() throws {
        let source = try StyleSource.text("ios/Tortie/Screens/ScreenKeyField.swift")
        XCTAssertEqual(source.components(separatedBy: "ViewThatFits").count - 1, 1, "ViewThatFits named other than once")
        XCTAssertEqual(source.components(separatedBy: ".dynamicTypeSize(").count - 1, 1, "the text size capped other than once")
        let start = try XCTUnwrap(source.range(of: "struct ScreenKeyBar: View {"), "no ScreenKeyBar")
        let rows = try XCTUnwrap(source.range(of: "func keys(returnWord: Bool)", range: start.upperBound..<source.endIndex), "no keys(returnWord:)")
        let body = String(source[start.upperBound..<rows.lowerBound])
        XCTAssertTrue(
            body.contains("ViewThatFits(in: .horizontal) {\n            keys(returnWord: true)\n            keys(returnWord: false)\n        }\n        .dynamicTypeSize(...DynamicTypeSize.large)"),
            "the bar's body is not the words row, then the glyph row, under the cap"
        )
        let after = String(source[rows.lowerBound...])
        XCTAssertEqual(
            after.components(separatedBy: "label: Copy.keyReturnLabel, id: Short.enter, key: .enter)").count - 1, 2,
            "the two rows do not both press return under its name and identifier"
        )
        XCTAssertTrue(after.contains("arrow(Symbol.enter, label: Copy.keyReturnLabel"), "the glyph row does not draw return's symbol")
        XCTAssertEqual(ScreenKeyBar.Symbol.enter, "return", "return's glyph is not the SF Symbol return")
        XCTAssertEqual(ID.screenKey(ScreenKeyBar.Short.enter), "screen-key-return", "return's identifier moved")
    }
}
