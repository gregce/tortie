import XCTest
@testable import Tortie
#if canImport(UIKit)
import UIKit
#endif

/// The tab bar (Phase 316.6, build/p3166/SPEC.md section 5.1): three tabs,
/// each its own path, Needs input first and on screen every launch (and since
/// Phase 348 Sessions after every pairing that finishes), its badge
/// the count of the rows the door's last answer called waiting, an alert's tap
/// on Needs input alone, and one read for one return to the foreground; and
/// since Phase 345 (build/p345/SPEC.md D3) a fourth, the Macs tab, drawn only
/// while two or more Macs are kept. The door is a script
/// (ScreensFixtures.swift); nothing here reaches a network. Each test names
/// the clause it holds, and each fails when that clause is taken out of
/// App/TortieApp.swift or Style/Tokens.swift.
@MainActor
final class TabsTests: XCTestCase {
    private func app(_ reader: ScriptedReader = ScriptedReader()) -> AppModel {
        AppModel(door: StandInPhone(kept: reader), label: "iPhone", alerts: StandInAlerts())
    }

    /// Every tab's label: the three Copy words, and the Macs tab's the Mac on
    /// screen's drawn name. A fifth case would not compile here.
    private func label(_ tab: AppTab, _ app: AppModel) -> String {
        switch tab {
        case .needsInput: Copy.needsInput
        case .sessions: Copy.sessions
        case .settings: Copy.settings
        case .macs: app.chosen.map { app.drawnName($0) } ?? ""
        }
    }

    /// Clause: the app opens on Needs input every launch, paired or not, and
    /// lands there when a pairing is lost, whatever was on screen: no tab is
    /// remembered.
    func testTheAppOpensOnNeedsInput() async throws {
        XCTAssertEqual(app().tab, .needsInput)
        XCTAssertEqual(AppModel(door: StandInPhone(), label: "iPhone", alerts: StandInAlerts()).tab, .needsInput)

        let lost = app(ScriptedReader(blocked: [.failure(.refused)]))
        lost.tab = .sessions
        lost.waitingPath = [.session(mac: Answers.mac, id: "w", name: "w")]
        await lost.list?.load()
        XCTAssertEqual(lost.root, .pairing)
        XCTAssertEqual(lost.tab, .needsInput, "a lost pairing kept its tab")
        XCTAssertEqual(lost.waitingPath, [])
    }

    /// Clause (Phase 348, build/p348/SPEC.md D1 and D2, his words "when the
    /// phone first pairs we should have it selected to Sessions"): a pairing
    /// that finishes lands on that Mac's Sessions whatever tab was on screen,
    /// on the Pairing screen and on Settings' Pair another Mac sheet alike,
    /// with every pushed path of the old pairing cleared; and a model made
    /// again over the same store, which is the next launch, opens on Needs
    /// input, because no tab is stored.
    func testAPairingThatFinishesLandsOnSessions() async throws {
        let first = Answers.blocked(rows: [Answers.row("w", dot: "attention")])
        let pairing = AppModel(door: StandInPhone(outcomes: [.paired(ScriptedReader(), first)]), label: "iPhone", alerts: StandInAlerts())
        pairing.tab = .settings
        pairing.sessionsPath = [.session(mac: Answers.mac, id: "s", name: "s")]
        await pairing.pairing.read("code")
        XCTAssertEqual(pairing.root, .reading)
        XCTAssertEqual(pairing.tab, .sessions, "a pairing done did not land on Sessions")
        XCTAssertEqual(pairing.sessionsPath, [], "a pairing done kept another pairing's screens")
        XCTAssertEqual(pairing.waitingPath, [], "a pairing done kept another pairing's screens")

        // The sheet: a second Mac paired from Settings lands on ITS Sessions.
        let studio = "studio.tail0.ts.net"
        let laptop = "laptop.tail0.ts.net"
        let phone = StandInPhone(kept: ScriptedReader(mac: studio), outcomes: [.paired(ScriptedReader(mac: laptop), first)])
        phone.keepsWhatPairs = true
        let sheet = AppModel(door: phone, label: "iPhone", alerts: StandInAlerts())
        sheet.tab = .settings
        sheet.pairAnotherMac()
        await sheet.anotherPairing?.read("code")
        XCTAssertNil(sheet.anotherPairing, "the sheet did not close")
        XCTAssertEqual(sheet.chosen?.id, laptop)
        XCTAssertEqual(sheet.tab, .sessions, "a pairing from the sheet did not land on Sessions")

        // The next launch: a model made again over the same store opens on
        // Needs input with the first Mac, because nothing was stored.
        let relaunched = AppModel(door: phone, label: "iPhone", alerts: StandInAlerts())
        XCTAssertEqual(relaunched.root, .reading)
        XCTAssertEqual(relaunched.tab, .needsInput, "a relaunch did not open on Needs input")
        XCTAssertEqual(relaunched.chosen?.id, studio, "a relaunch did not open on the first Mac")
    }

    /// Clause: the three tabs in the bar's order, each a Copy word with its
    /// mark, then ONE more, the Macs tab (Phase 345, D3): labelled by no Copy
    /// word and no literal but the Mac on screen's drawn name, with the
    /// desktop computer, inside an `if` on `showsMacs`. Read from the file
    /// that composes them (`conformance:ios` rule b reads the same text).
    func testThreeTabsAndTheMacsTabInTheBarsOrder() throws {
        let source = try StyleSource.text("ios/Tortie/App/TortieApp.swift")
        var found: [String] = []
        var rest = Substring(source)
        while let at = rest.range(of: "Tab(") {
            let before = rest[..<at.lowerBound].last
            if before.map({ $0.isLetter || $0.isNumber || $0 == "_" || $0 == "." }) != true {
                found.append(String(rest[at.lowerBound...].prefix { $0 != "\n" }))
            }
            rest = rest[at.upperBound...]
        }
        let want = [
            "Tab(Copy.needsInput, systemImage: \"bell\", value: AppTab.needsInput) {",
            "Tab(Copy.sessions, systemImage: \"list.bullet\", value: AppTab.sessions) {",
            "Tab(Copy.settings, systemImage: \"gearshape\", value: AppTab.settings) {",
            "Tab(value: AppTab.macs) {"
        ]
        XCTAssertEqual(found, want)
        let shown = try XCTUnwrap(source.range(of: "if app.showsMacs {")).upperBound
        let macs = try XCTUnwrap(source.range(of: "Tab(value: AppTab.macs) {")).lowerBound
        XCTAssertLessThan(shown, macs)
        XCTAssertFalse(source[shown..<macs].contains("}"), "the Macs tab is not inside the if on showsMacs")
        let after = String(source[macs...].prefix(400))
        XCTAssertTrue(after.contains("Label(app.drawnName(space), systemImage: \"desktopcomputer\")"), "the Macs tab is not the Mac on screen's name and the desktop computer")
        XCTAssertTrue(after.contains(".badge(app.otherMacsWaiting)"), "the Macs tab's badge is not the other Macs' waiting count")
        let app = app()
        XCTAssertEqual([AppTab.needsInput, .sessions, .settings, .macs].map { label($0, app) }, [Copy.needsInput, Copy.sessions, Copy.settings, "studio"])
        XCTAssertFalse(source.contains("for: .tabBar"), "something hides the tab bar")
        // Every stack in the bar is built again over the Mac on screen (D13).
        let tabs = try XCTUnwrap(source.range(of: "private func tabs(_ space: MacSpace) -> some View {")).lowerBound
        let tabsEnd = try XCTUnwrap(source.range(of: "private func listScreen(", range: tabs..<source.endIndex)).lowerBound
        let body = String(source[tabs..<tabsEnd])
        XCTAssertEqual(body.components(separatedBy: "NavigationStack").count, 5, "the bar holds other than four stacks")
        XCTAssertEqual(body.components(separatedBy: ".id(space.id)").count, 5, "a stack in the bar is not built again over the Mac on screen")
    }

    /// Clause: the badge is the count of the rows the door's last LOADED
    /// answer called waiting, the same array the Needs input tab draws, so the
    /// two never disagree; and 0, which draws no badge, before an answer, when
    /// nothing waits, and after a read that failed.
    func testTheBadgeIsTheLoadedWaitingCount() async throws {
        let rows = [Answers.row("a", dot: "attention"), Answers.row("b", dot: "attention"), Answers.row("c", dot: "attention")]
        let reader = ScriptedReader(blocked: [
            .success(Answers.blocked(rows: rows, others: [Answers.row("o"), Answers.row("p")], omitted: 4)),
            .success(Answers.blocked(others: [Answers.row("o")])),
            .success(Answers.blocked(rows: [rows[0]])),
            .failure(.timedOut)
        ])
        let app = app(reader)
        let list = try XCTUnwrap(app.list)
        XCTAssertEqual(app.waitingBadge, 0, "a badge before any answer")
        await list.load()
        XCTAssertEqual(app.waitingBadge, 3)
        guard case .loaded(let drawing) = list.state else { return XCTFail("\(list.state)") }
        XCTAssertEqual(app.waitingBadge, drawing.waiting.count, "the badge and the Needs input tab disagree")
        await list.load()
        XCTAssertEqual(app.waitingBadge, 0, "nothing waits, and a badge is drawn")
        await list.load()
        XCTAssertEqual(app.waitingBadge, 1)
        await list.load()
        XCTAssertEqual(list.state, .failed(Copy.macDidNotAnswer))
        XCTAssertEqual(app.waitingBadge, 0, "a read that failed kept the last badge")
    }

    /// Clause: each tab keeps its own path. A row opened on one tab is pushed
    /// on that tab alone, its Catch Me Up on the same tab, and moving between
    /// tabs moves nothing that is pushed.
    func testEachTabKeepsItsPath() {
        let app = app()
        app.open(RowDrawing(Answers.row("w", dot: "attention"), waiting: true), in: .needsInput)
        app.openCatchUp("w", honestLine: nil, in: .needsInput)
        app.tab = .sessions
        app.open(RowDrawing(Answers.row("o"), waiting: false), in: .sessions)
        let waiting: [Route] = [.session(mac: Answers.mac, id: "w", name: "w"), .catchUp(mac: Answers.mac, id: "w", honestLine: nil)]
        let sessions: [Route] = [.session(mac: Answers.mac, id: "o", name: "o")]
        XCTAssertEqual(app.waitingPath, waiting)
        XCTAssertEqual(app.sessionsPath, sessions)
        for tab in [AppTab.needsInput, .settings, .sessions, .needsInput] {
            app.tab = tab
            XCTAssertEqual(app.waitingPath, waiting, "\(tab)")
            XCTAssertEqual(app.sessionsPath, sessions, "\(tab)")
        }
        // Settings pushes nothing.
        app.open(RowDrawing(Answers.row("x"), waiting: false), in: .settings)
        XCTAssertEqual(app.waitingPath, waiting)
        XCTAssertEqual(app.sessionsPath, sessions)
    }

    /// Clause (316.5 as built, on tabs): an alert's tap selects Needs input
    /// and replaces only its path; the Sessions tab keeps its place.
    func testAnAlertTapIsNeedsInputsAlone() {
        let app = app()
        app.tab = .sessions
        app.waitingPath = [.session(mac: Answers.mac, id: "w", name: "w")]
        app.sessionsPath = [.session(mac: Answers.mac, id: "o", name: "o"), .catchUp(mac: Answers.mac, id: "o", honestLine: nil)]
        app.openFromAlert(.session("s"))
        XCTAssertEqual(app.tab, .needsInput)
        XCTAssertEqual(app.waitingPath, [.alerted(mac: Answers.mac, id: "s")])
        XCTAssertEqual(app.sessionsPath, [.session(mac: Answers.mac, id: "o", name: "o"), .catchUp(mac: Answers.mac, id: "o", honestLine: nil)])
        app.tab = .settings
        app.openFromAlert(.list)
        XCTAssertEqual(app.tab, .needsInput)
        XCTAssertEqual(app.waitingPath, [])
        XCTAssertEqual(app.sessionsPath.count, 2)
    }

    /// Clause: a refusal about one session pops only the tab it is on; the
    /// alerted session's pops Needs input; Settings pushes nothing to pop.
    func testARefusalPopsOnlyItsTab() {
        let app = app()
        let w: [Route] = [.session(mac: Answers.mac, id: "w", name: "w")]
        let o: [Route] = [.session(mac: Answers.mac, id: "o", name: "o"), .catchUp(mac: Answers.mac, id: "o", honestLine: nil)]
        app.waitingPath = w
        app.sessionsPath = o
        app.routing(.sessions, mac: Answers.mac).backToList()
        XCTAssertEqual(app.sessionsPath, [])
        XCTAssertEqual(app.waitingPath, w)
        app.sessionsPath = o
        app.routing(.needsInput, mac: Answers.mac).backToList()
        XCTAssertEqual(app.waitingPath, [])
        XCTAssertEqual(app.sessionsPath, o)
        app.waitingPath = [.alerted(mac: Answers.mac, id: "gone")]
        app.alertedRouting(mac: Answers.mac).backToList()
        XCTAssertEqual(app.waitingPath, [])
        XCTAssertEqual(app.sessionsPath, o)
        app.waitingPath = w
        app.routing(.settings, mac: Answers.mac).backToList()
        XCTAssertEqual(app.waitingPath, w)
        XCTAssertEqual(app.sessionsPath, o)
        XCTAssertEqual(app.root, .reading)
    }

    /// Clause: on a return to the foreground EXACTLY ONE screen is on top,
    /// the top of the tab on screen, so one return is one read; with Settings
    /// on screen no list and no session reads.
    func testOneReturnIsOneRead() {
        let app = app()
        let s: Route = .session(mac: Answers.mac, id: "s", name: "s")
        let c: Route = .catchUp(mac: Answers.mac, id: "s", honestLine: nil)
        let o: Route = .session(mac: Answers.mac, id: "o", name: "o")
        let cases: [(AppTab, [Route], [Route], String)] = [
            (.needsInput, [], [], "needs-list"),
            (.sessions, [], [], "sessions-list"),
            (.needsInput, [s], [o], "needs-0"),
            (.sessions, [s], [o], "sessions-0"),
            (.needsInput, [s, c], [], "needs-1"),
            (.sessions, [s, c], [o], "sessions-0"),
            (.settings, [s], [o], ""),
            (.settings, [], [], "")
        ]
        for (tab, waiting, sessions, want) in cases {
            app.tab = tab
            app.waitingPath = waiting
            app.sessionsPath = sessions
            var top: [String] = []
            if app.listIsTop(.needsInput) { top.append("needs-list") }
            if app.listIsTop(.sessions) { top.append("sessions-list") }
            for (i, route) in waiting.enumerated() where app.isTop(route, in: .needsInput) { top.append("needs-" + String(i)) }
            for (i, route) in sessions.enumerated() where app.isTop(route, in: .sessions) { top.append("sessions-" + String(i)) }
            XCTAssertEqual(top, want.isEmpty ? [] : [want], "\(tab) \(waiting) \(sessions)")
        }
        let before = app.foregroundTick
        app.cameToForeground()
        XCTAssertEqual(app.foregroundTick, before + 1, "one return moved the tick other than once")
    }

    #if canImport(UIKit)
    /// Clause (SPEC section 5.1.6): `TabBarLook.apply()` gives every layout
    /// and both states of the tab bar's items the Mac's count badge, amber
    /// under a dark number, from the two tokens and nothing else. The
    /// appearance is cleared first, so what is read is what `apply()` set.
    func testTheBadgeIsTheMacsCountBadge() {
        UITabBar.appearance().standardAppearance = UITabBarAppearance()
        UITabBar.appearance().scrollEdgeAppearance = nil
        TabBarLook.apply()
        let looks: [UITabBarAppearance?] = [UITabBar.appearance().standardAppearance, UITabBar.appearance().scrollEdgeAppearance]
        for (index, candidate) in looks.enumerated() {
            guard let look = candidate else {
                XCTFail("appearance \(index) is not set")
                continue
            }
            for item in [look.stackedLayoutAppearance, look.inlineLayoutAppearance, look.compactInlineLayoutAppearance] {
                for state in [item.normal, item.selected] {
                    XCTAssertEqual(state.badgeBackgroundColor, Token.statusAttentionBadgeBg.uiColor, "appearance \(index)")
                    XCTAssertEqual(state.badgeTextAttributes[.foregroundColor] as? UIColor, Token.statusAttentionBadgeFg.uiColor, "appearance \(index)")
                }
            }
        }
    }
    #endif
}
