import Foundation
import XCTest
@testable import Tortie

/// Tortie's own site, the one way out of the app that is not an answer's link
/// (Phase 333.1, build/p3331/SPEC.md D21 and D22; `conformance:ios` rule
/// (av)): three compiled addresses, ONE opener that takes a `SiteLink` and
/// asks the link policy, and on each screen that draws a site row a named
/// press whose body hands its one link to the opener. A SwiftUI `Button`'s
/// action cannot be invoked from XCTest, so each screen is built with a fake
/// opener and its press methods are called; the source is read for each
/// button naming exactly its method. `SiteOpener` itself is never invoked
/// here, because it would hand iOS a real address. Each test names the clause
/// it holds, and each fails when that clause is taken out.
@MainActor
final class SiteLinkTests: XCTestCase {
    /// Records what a screen asked to open, and opens nothing.
    @MainActor
    private final class RecordingSite: SiteOpening {
        private(set) var opened: [SiteLink] = []
        func open(_ link: SiteLink) {
            opened.append(link)
        }
    }

    private func app() -> AppModel {
        AppModel(door: StandInPhone(), label: "iPhone", alerts: StandInAlerts())
    }

    /// Clause (D21, av1): each page is its compiled address, exactly, made
    /// without a force, and each one the link policy would open: `https`,
    /// the host `tortie.sh`, no port, user, password, query or fragment, and
    /// the paths nothing, `/privacy` and `/support`.
    func testEachPageIsItsCompiledAddress() throws {
        XCTAssertEqual(SiteLink.allCases, [.home, .privacy, .support])
        let want: [SiteLink: String] = [
            .home: "https://tortie.sh",
            .privacy: "https://tortie.sh/privacy",
            .support: "https://tortie.sh/support"
        ]
        let paths: [SiteLink: String] = [.home: "", .privacy: "/privacy", .support: "/support"]
        for link in SiteLink.allCases {
            let url = try XCTUnwrap(link.address, "\(link) has no address")
            XCTAssertEqual(url.absoluteString, want[link], "\(link)")
            XCTAssertEqual(url.scheme, "https", "\(link)")
            XCTAssertEqual(url.host(percentEncoded: true), "tortie.sh", "\(link)")
            XCTAssertNil(url.port, "\(link)")
            XCTAssertNil(url.user, "\(link)")
            XCTAssertNil(url.password, "\(link)")
            XCTAssertNil(url.query, "\(link)")
            XCTAssertNil(url.fragment, "\(link)")
            XCTAssertEqual(url.path(percentEncoded: true), paths[link], "\(link)")
            XCTAssertTrue(LinkPolicy.opens(url), "the link policy would not open \(link)'s page")
        }
        XCTAssertEqual(Set(SiteLink.allCases.compactMap(\.address)).count, 3, "two pages share an address")
    }

    /// Clause (D21): the pairing screen's three presses each hand their own
    /// page to the opener it was given, and nothing else: Get Tortie for Mac
    /// the Mac app's page, Privacy and Support theirs.
    func testThePairingScreensPressesOpenTheirPages() {
        let model = PairingModel(door: StandInPhone(), label: "iPhone", alerts: StandInAlerts()) { _, _ in }
        let site = RecordingSite()
        let screen = PairingScreen(model: model, site: site)
        XCTAssertEqual(site.opened, [], "building the screen opened a page")
        screen.openMacSite()
        XCTAssertEqual(site.opened, [.home])
        screen.openPrivacy()
        XCTAssertEqual(site.opened, [.home, .privacy])
        screen.openSupport()
        XCTAssertEqual(site.opened, [.home, .privacy, .support])
        XCTAssertFalse(model.scanning, "a site press opened the camera")
    }

    /// Clause (D21, D22): Settings then About's three presses each hand their
    /// own page to the opener: Tortie for Mac the Mac app's page, Privacy and
    /// Support theirs.
    func testSettingsPressesOpenTheirPages() {
        let site = RecordingSite()
        let screen = SettingsScreen(app: app(), site: site)
        XCTAssertEqual(site.opened, [], "building the screen opened a page")
        screen.openMacSite()
        XCTAssertEqual(site.opened, [.home])
        screen.openPrivacy()
        XCTAssertEqual(site.opened, [.home, .privacy])
        screen.openSupport()
        XCTAssertEqual(site.opened, [.home, .privacy, .support])
    }

    /// Clause (D21): each press's body is exactly `site.open(.<case>)`, and
    /// each site button's action names that press and nothing else, on both
    /// screens. Neither screen hands iOS a page itself: the pairing screen
    /// names no `UIApplication`, and Settings' one open is iOS's own
    /// notification settings.
    func testEachButtonNamesItsOnePress() throws {
        let presses: [(method: String, link: String)] = [("openMacSite", "home"), ("openPrivacy", "privacy"), ("openSupport", "support")]
        for file in ["ios/Tortie/Screens/PairingScreen.swift", "ios/Tortie/Screens/SettingsScreen.swift"] {
            let source = try StyleSource.text(file)
            for press in presses {
                let body = "func \(press.method)() {\n        site.open(.\(press.link))\n    }"
                XCTAssertEqual(source.components(separatedBy: body).count, 2, "\(file): \(press.method) is not exactly site.open(.\(press.link))")
                XCTAssertEqual(source.components(separatedBy: "Button(action: \(press.method))").count, 2, "\(file): no one button names \(press.method)")
                XCTAssertEqual(source.components(separatedBy: "\(press.method)()").count, 2, "\(file): \(press.method) is called, or declared, other than once")
            }
            XCTAssertEqual(source.components(separatedBy: "site.open(").count, 4, "\(file) opens a page outside its three presses")
            XCTAssertFalse(source.contains("SiteOpener()."), "\(file) opens a page with the app's own opener, not the one it was given")
        }
        let pairing = try StyleSource.text("ios/Tortie/Screens/PairingScreen.swift")
        XCTAssertFalse(pairing.contains("UIApplication.shared"), "the pairing screen hands iOS an address itself")
        let settings = try StyleSource.text("ios/Tortie/Screens/SettingsScreen.swift")
        XCTAssertEqual(settings.components(separatedBy: "UIApplication.shared.open(").count, 2)
        XCTAssertTrue(settings.contains("URL(string: UIApplication.openNotificationSettingsURLString)"))
    }

    /// Clause (D21, av3): the app's one opener takes a `SiteLink`, never a URL
    /// or a string, and asks the link policy in the same body before its one
    /// open; it is the one type in the app that opens a site page.
    func testTheOneOpenerAsksThePolicyFirst() throws {
        let links = try StyleSource.text("ios/Tortie/Markdown/Links.swift")
        let start = try XCTUnwrap(links.range(of: "struct SiteOpener: SiteOpening {")).lowerBound
        let opener = String(links[start...])
        XCTAssertTrue(opener.contains("func open(_ link: SiteLink) {"), "the opener does not take a SiteLink")
        let ask = try XCTUnwrap(opener.range(of: "LinkPolicy.opens(url)"), "the opener does not ask the link policy").lowerBound
        let open = try XCTUnwrap(opener.range(of: "UIApplication.shared.open(url)"), "the opener opens nothing").lowerBound
        XCTAssertLessThan(ask, open, "the opener opens before it asks the link policy")
        XCTAssertEqual(opener.components(separatedBy: "UIApplication.shared.open(").count, 2)
        XCTAssertEqual(links.components(separatedBy: "struct SiteOpener").count, 2, "two openers")
        XCTAssertEqual(links.components(separatedBy: "https://tortie.sh").count, 4 + Self.commentMentions(links), "Links.swift holds a site address beside the three")
    }

    /// How many times the header's prose spells the site's address (the
    /// enum is what holds the three literals).
    private static func commentMentions(_ source: String) -> Int {
        source.components(separatedBy: "\n").filter { $0.trimmingCharacters(in: .whitespaces).hasPrefix("//") && $0.contains("https://tortie.sh") }.count
    }
}
