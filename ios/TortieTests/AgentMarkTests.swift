import UIKit
import XCTest
@testable import Tortie

/// THE MARKS ARE THE MAC'S (Phase 346, build/p346/SPEC.md D23, rule bb8): the
/// thirteen marks the app carries load by name from its own bundle as
/// template images and draw INK, read by counting the pixels a mark covers
/// when drawn into a bitmap context of its own (a count of its alpha, never a
/// photograph: no renderer of the screen's, no attachment); the one table naming them names exactly the catalog's sets;
/// and a key the phone does not carry falls back to `terminal`.
@MainActor
final class AgentMarkTests: XCTestCase {
    /// The registry's thirteen launchable marks (build/p346/SPEC.md M1).
    private let keys = [
        "antigravity", "claude", "codex", "cursor", "deepseek", "droid", "gemini",
        "grok", "muse", "omp", "opencode", "pi", "qwen"
    ]

    /// A clear `side` square bitmap context of its own, RGBA, scale 1.
    private func bitmap(_ side: Int) -> CGContext? {
        CGContext(
            data: nil, width: side, height: side, bitsPerComponent: 8, bytesPerRow: side * 4,
            space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        )
    }

    /// How many pixels of a `side` square bitmap the image covers, drawn
    /// black into that context (a count of its alpha, never a photograph).
    private func covered(_ image: UIImage, side: Int = 48) -> Int {
        guard let context = bitmap(side) else { return 0 }
        UIGraphicsPushContext(context)
        // UIKit draws top-down; the context is bottom-up. A count needs neither.
        image.withTintColor(.black, renderingMode: .alwaysTemplate).draw(in: CGRect(x: 0, y: 0, width: side, height: side))
        UIGraphicsPopContext()
        guard let data = context.data else { return 0 }
        let bytes = data.bindMemory(to: UInt8.self, capacity: side * side * 4)
        var count = 0
        var at = 3
        while at < side * side * 4 {
            if bytes[at] > 32 { count += 1 }
            at += 4
        }
        return count
    }

    /// An image made in a context of its own: clear, or filled black.
    private func made(filled: Bool) -> UIImage? {
        guard let context = bitmap(24) else { return nil }
        if filled {
            context.setFillColor(UIColor.black.cgColor)
            context.fill(CGRect(x: 0, y: 0, width: 24, height: 24))
        }
        return context.makeImage().map { UIImage(cgImage: $0) }
    }

    /// Clause (bb8): each of the thirteen loads by name from the app's bundle
    /// as a template, and draws ink: at least 40 of 2,304 pixels.
    func testEveryMarkLoadsAsATemplateAndDrawsInk() throws {
        for key in keys {
            let name = try XCTUnwrap(AgentMark.assets[key], "\(key): the table names no mark")
            let image = try XCTUnwrap(UIImage(named: name, in: Bundle.main, compatibleWith: nil), "\(name) is not in the app's catalog")
            XCTAssertEqual(image.renderingMode, .alwaysTemplate, "\(name) is not a template")
            XCTAssertGreaterThanOrEqual(covered(image), 40, "\(name) draws no ink")
        }
    }

    /// The count above is a real count: an empty image covers nothing, so a
    /// mark that drew nothing would read red.
    func testAnEmptyMarkCountsAsEmpty() throws {
        XCTAssertEqual(covered(try XCTUnwrap(made(filled: false))), 0)
        XCTAssertEqual(covered(try XCTUnwrap(made(filled: true))), 48 * 48)
    }

    /// Clause (bb8, D23): the one table names exactly the thirteen, each
    /// `agent-<key>`, and exactly the catalog's image sets, nothing more.
    func testTheTableIsTheCatalog() throws {
        XCTAssertEqual(Set(AgentMark.assets.keys), Set(keys))
        for (key, name) in AgentMark.assets {
            XCTAssertEqual(name, "agent-" + key)
        }
        let catalog = StyleSource.root.appendingPathComponent("ios/Tortie/AgentMarks.xcassets")
        let sets = try FileManager.default.contentsOfDirectory(atPath: catalog.path)
            .filter { $0.hasSuffix(".imageset") }
            .map { String($0.dropLast(".imageset".count)) }
        XCTAssertEqual(Set(sets), Set(AgentMark.assets.values))
        XCTAssertFalse(try FileManager.default.contentsOfDirectory(atPath: catalog.path).contains { $0.hasSuffix(".colorset") })
    }

    /// Clause (D23): a key the phone does not carry falls back to `terminal`,
    /// which iOS carries.
    func testAnUnknownKeyFallsBackToTerminal() {
        XCTAssertNil(AgentMark.assets["shell"])
        XCTAssertEqual(AgentMark.fallback, "terminal")
        XCTAssertNotNil(UIImage(systemName: AgentMark.fallback))
    }
}
