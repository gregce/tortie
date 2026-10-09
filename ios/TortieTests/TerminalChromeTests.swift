import SwiftUI
import XCTest
@testable import Tortie

/// The Terminal sideways is the terminal alone (Phase 337.3,
/// build/p3373/SPEC.md D13, D15 to D17; his words: "when you're in horiztonal
/// mode, i want to show as much of the terminal as possible"): every member of
/// `TerminalChrome` for a compact, a regular and no vertical size class; and,
/// read from Screens/Screen.swift, that `ScreenPage` reads the VERTICAL size
/// class and asks the chrome each place it draws (the header, the tray, the
/// two bars once, the status bar once, the two Copies), and that its lines sit
/// in its top view and never in its bottom one. Each test names the clause it
/// holds and fails when that clause is taken out of Screens/Screen.swift.
final class TerminalChromeTests: XCTestCase {
    /// Clause (D15): upright, a regular vertical size class, everything is
    /// drawn as before: the header, the bars as the system draws them, the
    /// status bar, the tray while the keyboard is neither up nor wanted, and
    /// Copy in the bar.
    func testUprightEverythingIsDrawn() {
        let chrome = TerminalChrome(.regular)
        XCTAssertFalse(chrome.landscape)
        XCTAssertTrue(chrome.header)
        XCTAssertEqual(chrome.bars, .automatic)
        XCTAssertFalse(chrome.statusBarHidden)
        XCTAssertTrue(chrome.tray(overlap: 0, typing: false))
        XCTAssertFalse(chrome.tray(overlap: 1, typing: false), "the tray under a keyboard that covers the terminal")
        XCTAssertFalse(chrome.tray(overlap: 0, typing: true), "the tray while the keyboard is wanted (337.1's fix round)")
        XCTAssertTrue(chrome.toolbarCopy(true))
        XCTAssertFalse(chrome.toolbarCopy(false), "Copy with no selection drawn")
        XCTAssertFalse(chrome.overlayCopy(true), "a second Copy over the terminal upright")
        XCTAssertFalse(chrome.overlayCopy(false))
    }

    /// Clause (D15 to D17): sideways, a compact vertical size class, the
    /// terminal alone: no header, the navigation bar and the tab bar hidden,
    /// the status bar hidden, no tray whatever the keyboard does, and Copy
    /// over the terminal rather than in the hidden bar.
    func testSidewaysTheTerminalIsAlone() {
        let chrome = TerminalChrome(.compact)
        XCTAssertTrue(chrome.landscape)
        XCTAssertFalse(chrome.header, "the header drawn sideways")
        XCTAssertEqual(chrome.bars, .hidden, "the bars drawn sideways")
        XCTAssertTrue(chrome.statusBarHidden, "the status bar drawn sideways")
        XCTAssertFalse(chrome.tray(overlap: 0, typing: false), "the tray drawn sideways")
        XCTAssertFalse(chrome.tray(overlap: 1, typing: false))
        XCTAssertFalse(chrome.tray(overlap: 0, typing: true))
        XCTAssertFalse(chrome.toolbarCopy(true), "Copy in the hidden bar")
        XCTAssertTrue(chrome.overlayCopy(true), "no Copy reachable sideways")
        XCTAssertFalse(chrome.overlayCopy(false), "Copy with no selection drawn")
    }

    /// Clause (D15): no size class known yet is upright, as the page was
    /// before this phase.
    func testNoSizeClassIsUpright() {
        let chrome = TerminalChrome(nil)
        XCTAssertFalse(chrome.landscape)
        XCTAssertTrue(chrome.header)
        XCTAssertEqual(chrome.bars, .automatic)
        XCTAssertFalse(chrome.statusBarHidden)
        XCTAssertTrue(chrome.tray(overlap: 0, typing: false))
        XCTAssertTrue(chrome.toolbarCopy(true))
        XCTAssertFalse(chrome.overlayCopy(true))
    }

    /// Clause (D17): one Copy at a time, and a Copy whenever a selection is
    /// held and drawn, in every size class.
    func testOneCopyAtATime() {
        let classes: [UserInterfaceSizeClass?] = [.compact, .regular, nil]
        for sizeClass in classes {
            let chrome = TerminalChrome(sizeClass)
            for drawn in [true, false] {
                XCTAssertFalse(chrome.toolbarCopy(drawn) && chrome.overlayCopy(drawn), "two Copies for \(String(describing: sizeClass))")
                XCTAssertEqual(chrome.toolbarCopy(drawn) || chrome.overlayCopy(drawn), drawn, "\(String(describing: sizeClass)), drawn \(drawn)")
            }
        }
    }

    // MARK: The page asks the chrome

    /// `ScreenPage`'s text, to the end of the file.
    private func page() throws -> String {
        let source = try StyleSource.text("ios/Tortie/Screens/Screen.swift")
        let start = try XCTUnwrap(source.range(of: "struct ScreenPage<Header: View, Tray: View, Trailing: ToolbarContent>: View {"))
        return String(source[start.lowerBound...])
    }

    /// One of the page's views, from its declaration to the next one named.
    private func view(_ name: String, to next: String, in page: String) throws -> String {
        let start = try XCTUnwrap(page.range(of: "private var \(name): some View {"), name)
        let end = try XCTUnwrap(page.range(of: next, range: start.upperBound..<page.endIndex), next)
        return String(page[start.lowerBound..<end.lowerBound])
    }

    /// Clause (D15, rule ax): the page reads the VERTICAL size class (an
    /// iPhone's horizontal one is compact upright too) and asks the chrome:
    /// the header and the tray behind it, the navigation bar and the tab bar
    /// hidden by ONE `toolbarVisibility` of the chrome's bars, the status bar
    /// by ONE `statusBarHidden` of the chrome's, and each Copy behind its own
    /// member.
    func testThePageAsksTheChrome() throws {
        let source = try StyleSource.text("ios/Tortie/Screens/Screen.swift")
        let page = try page()
        XCTAssertTrue(page.contains("@Environment(\\.verticalSizeClass) private var sizeClass"), "the page does not read the vertical size class")
        XCTAssertFalse(source.contains("horizontalSizeClass"), "the horizontal size class is compact upright on every iPhone")
        XCTAssertTrue(page.contains("TerminalChrome(sizeClass)"))
        XCTAssertTrue(page.contains("if chrome.header {"), "the header drawn sideways")
        XCTAssertTrue(page.contains("if chrome.tray(overlap: overlap, typing: typing) {"), "the tray drawn sideways")
        XCTAssertEqual(source.components(separatedBy: ".toolbarVisibility(").count, 2, "the bars hidden in more than one place, or none")
        XCTAssertTrue(page.contains(".toolbarVisibility(chrome.bars, for: .navigationBar, .tabBar)"))
        XCTAssertEqual(source.components(separatedBy: ".statusBarHidden(").count, 2, "the status bar hidden in more than one place, or none")
        XCTAssertTrue(page.contains(".statusBarHidden(chrome.statusBarHidden)"))
        XCTAssertTrue(page.contains("if chrome.toolbarCopy(copyDrawn) {"), "the bar's Copy drawn sideways")
        XCTAssertTrue(page.contains("if chrome.overlayCopy(copyDrawn) {"), "no Copy sideways")
        XCTAssertEqual(page.components(separatedBy: "ID.screenCopy").count, 3, "Copy is the bar's and the overlay's, one at a time")
        XCTAssertEqual(page.components(separatedBy: "copySelection()").count, 4, "both Copies press the one copySelection()")
        // The orientation gate stays this page's (rule an).
        XCTAssertTrue(page.contains("OrientationGate.screenOnTop = true"))
        XCTAssertTrue(page.contains("OrientationGate.screenOnTop = false"))
    }

    /// Clause (D13, rule ar): the scrollback's line and the Terminal's own
    /// are drawn in the page's top view, an overlay at the terminal's top, and
    /// never in its bottom view, which holds Copy sideways and the
    /// back-to-live button and is padded at its bottom by the keyboard's
    /// overlap alone.
    func testTheLinesSitAtTheTerminalsTop() throws {
        let page = try page()
        XCTAssertTrue(page.contains(".overlay(alignment: .top) { top }"), "the top view is not over the terminal's top")
        XCTAssertTrue(page.contains(".overlay(alignment: .bottom) { bottom }"))
        let top = try view("top", to: "private var bottom: some View {", in: page)
        XCTAssertTrue(top.contains("lineView(said, id: ID.screenScrollbackLine)"))
        XCTAssertTrue(top.contains("lineView(line, id: ID.screenLine)"))
        XCTAssertTrue(top.contains("if model.picture != nil {"), "a line drawn over the sentence that says why there is no terminal")
        let bottom = try view("bottom", to: "private func lineView(", in: page)
        XCTAssertFalse(bottom.contains("ID.screenLine"), "a line over the live bottom, where he types")
        XCTAssertFalse(bottom.contains("ID.screenScrollbackLine"), "the scrollback line over the live bottom")
        XCTAssertTrue(bottom.contains("ID.screenToLive"))
        XCTAssertTrue(bottom.contains("ID.screenCopy"))
        XCTAssertTrue(bottom.contains(".frame(maxWidth: .infinity, alignment: .trailing)"), "the arrow and Copy drawn at the bottom's centre, not its right")
        XCTAssertEqual(bottom.components(separatedBy: ".padding(.bottom,").count, 2, "padded at its bottom by something besides the overlap")
        XCTAssertTrue(bottom.contains(".padding(.bottom, overlap)"))
        XCTAssertEqual(page.components(separatedBy: "ID.screenLine)").count, 2, "the Terminal's line drawn twice")
        XCTAssertEqual(page.components(separatedBy: "ID.screenScrollbackLine)").count, 2, "the scrollback line drawn twice")
    }
}
