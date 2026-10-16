import Foundation
import XCTest
@testable import Tortie

/// One iPhone, several Macs (Phase 345, build/p345/SPEC.md section 5.2, D1 to
/// D26; his answers of 2026-10-14): each kept Mac is its own space, ONE drawn
/// at a time, switched from the Macs tab; the two badges; a refusal that
/// blanks only its Mac; Unpair of the Mac on screen; an alert's tap; the
/// Pair another Mac sheet, its cancel and its cap; and every route reading
/// through the Mac that drew it. The doors are scripts (ScreensFixtures.swift)
/// or stores in memory; nothing here reaches a network or a keychain it did
/// not make. Each test names the clause it holds, and each fails when that
/// clause is taken out of App/TortieApp.swift, Screens/MacsScreen.swift,
/// Screens/PairingScreen.swift or Screens/DoorWords.swift.
@MainActor
final class MacsTests: XCTestCase {
    private let studio = "studio.tail0000.ts.net"
    private let laptop = "laptop.tail0000.ts.net"
    private let mini = "mini.tail0000.ts.net"

    override func tearDown() {
        #if os(iOS)
        TestIdentity.removeFromKeychain()
        #endif
    }

    private func waiting(_ count: Int) -> PocketBlockedAnswer {
        Answers.blocked(rows: (0..<count).map { Answers.row("w" + String($0), dot: "attention") })
    }

    private func app(
        _ readers: [any DoorReading],
        alerts: StandInAlerts = StandInAlerts(),
        words: MemoryWords = MemoryWords(.standard),
        launchCode: String? = nil
    ) -> (AppModel, StandInPhone) {
        let phone = StandInPhone(others: readers)
        let app = AppModel(door: phone, label: "iPhone", alerts: alerts, launchCode: launchCode, choices: words)
        return (app, phone)
    }

    private func space(_ app: AppModel, _ mac: String) throws -> MacSpace {
        try XCTUnwrap(app.space(mac), "\(mac) has no space")
    }

    // MARK: The spaces (D1, D2, D3, D5, D9)

    /// Clause: a space per kept Mac, in the store's order, keyed by the whole
    /// public name; the first is on screen; the Macs tab is drawn with two or
    /// more and never with one, nor inside the sample.
    func testASpacePerMacInOrderAndTheMacsTabWithTwo() throws {
        let (one, _) = app([ScriptedReader(mac: studio)])
        XCTAssertEqual(one.spaces.map(\.id), [studio])
        XCTAssertFalse(one.showsMacs, "one Mac draws the Macs tab")
        XCTAssertEqual(one.chosen?.id, studio)

        let readers = [ScriptedReader(mac: laptop), ScriptedReader(mac: studio), ScriptedReader(mac: mini)]
        let (app, _) = app(readers)
        XCTAssertEqual(app.spaces.map(\.id), [laptop, studio, mini], "the spaces are not in the store's order")
        XCTAssertEqual(app.chosen?.id, laptop, "the app does not open on the first Mac")
        XCTAssertTrue(app.showsMacs)
        XCTAssertEqual(app.tab, .needsInput)
        for (space, reader) in zip(app.spaces, readers) {
            XCTAssertTrue((space.reader as? ScriptedReader) === reader)
            XCTAssertTrue(space.sessions.list === space.list, "a Mac's Sessions model reads another list")
        }
        XCTAssertEqual(Set(app.spaces.map { ObjectIdentifier($0.list) }).count, 3, "two Macs share a list")
        app.openSample()
        XCTAssertFalse(app.showsMacs, "the sample draws the Macs tab")

        let (none, _) = self.app([])
        XCTAssertEqual(none.root, .pairing)
        XCTAssertFalse(none.showsMacs)
        XCTAssertNil(none.chosen)
    }

    /// Clause (D4): choosing a Mac makes the whole app that Mac's, on its
    /// Needs input, and each Mac keeps its own place; the members every screen
    /// reads are the Mac on screen's.
    func testChoosingLandsOnNeedsInputAndEachMacKeepsItsPlace() throws {
        let (app, _) = app([ScriptedReader(mac: studio), ScriptedReader(mac: laptop)])
        let a = try space(app, studio)
        let b = try space(app, laptop)
        app.tab = .sessions
        app.waitingPath = [.session(mac: studio, id: "w", name: "w")]
        app.sessionsPath = [.session(mac: studio, id: "s", name: "s")]
        XCTAssertEqual(a.waitingPath.count, 1)

        app.tab = .macs
        app.choose(laptop)
        XCTAssertEqual(app.chosen?.id, laptop)
        XCTAssertEqual(app.tab, .needsInput, "choosing a Mac did not land on its Needs input")
        XCTAssertTrue(app.list === b.list)
        XCTAssertTrue(app.sessions === b.sessions)
        XCTAssertTrue((app.reader as? ScriptedReader) === (b.reader as? ScriptedReader))
        XCTAssertEqual(app.waitingPath, [])
        XCTAssertEqual(app.sessionsPath, [])
        app.open(RowDrawing(Answers.row("x"), waiting: false), in: .sessions)
        XCTAssertEqual(b.sessionsPath, [.session(mac: laptop, id: "x", name: "x")], "a row opened on a Mac carries another Mac")

        app.choose(studio)
        XCTAssertEqual(app.waitingPath, [.session(mac: studio, id: "w", name: "w")], "the Mac did not keep its place")
        XCTAssertEqual(app.sessionsPath, [.session(mac: studio, id: "s", name: "s")])
        XCTAssertEqual(b.sessionsPath.count, 1, "the other Mac lost its place")
        app.choose("gone.tail0000.ts.net")
        XCTAssertEqual(app.chosen?.id, studio, "a Mac not kept was chosen")
    }

    /// Clause (D17): Show, Group by and Sort by are one choice for every Mac;
    /// a Mac chosen with them changed since its Sessions model was made gets a
    /// new model over the words the phone keeps now, and one with them
    /// unchanged keeps its model (and with it its filters).
    func testAMacChosenWithChangedWordsGetsANewSessionsModel() async throws {
        let words = MemoryWords(.standard)
        let (app, _) = app([ScriptedReader(mac: studio), ScriptedReader(mac: laptop)], words: words)
        let a = try space(app, studio)
        let before = a.sessions
        app.choose(laptop)
        app.choose(studio)
        XCTAssertTrue(a.sessions === before, "a Mac chosen with the same words lost its Sessions model")

        app.choose(laptop)
        await app.sessions?.choose(show: .ended)
        XCTAssertEqual(words.load().show, .ended)
        app.choose(studio)
        XCTAssertFalse(a.sessions === before, "a Mac chosen with changed words kept its old model")
        XCTAssertEqual(a.sessions.words.show, .ended)
        XCTAssertTrue(a.sessions.list === a.list)
        let made = a.sessions
        app.choose(studio)
        XCTAssertTrue(a.sessions === made)
    }

    // MARK: The badges (D6, D7)

    /// Clause (D6): Needs input's badge is the Mac on screen's waiting count;
    /// the Macs tab's is the sum of the OTHER Macs' loaded counts, folded
    /// through `DoorNumber.sum`; a Mac loading or failed adds nothing; a sum
    /// that is not a count draws none.
    func testTheTwoBadges() async throws {
        let a = ScriptedReader(blocked: [.success(waiting(1))], mac: studio)
        let b = ScriptedReader(blocked: [.success(waiting(2)), .failure(.timedOut)], mac: laptop)
        let c = ScriptedReader(blocked: [.success(waiting(3))], mac: mini)
        let (app, _) = app([a, b, c])
        XCTAssertEqual(app.waitingBadge, 0)
        XCTAssertEqual(app.otherMacsWaiting, 0, "a badge before anything loaded")
        await app.list?.load()
        XCTAssertEqual(app.waitingBadge, 1)
        XCTAssertEqual(app.otherMacsWaiting, 0, "the Mac on screen counted on the Macs tab")
        await app.readOtherMacs()
        XCTAssertEqual(app.otherMacsWaiting, 5)
        XCTAssertEqual(app.waitingBadge, 1, "another Mac's count reached Needs input's badge")
        app.choose(laptop)
        XCTAssertEqual(app.waitingBadge, 2)
        XCTAssertEqual(app.otherMacsWaiting, 4)
        await app.list?.load()
        XCTAssertEqual(app.list?.state, .failed(Copy.macDidNotAnswer))
        app.choose(studio)
        XCTAssertEqual(app.otherMacsWaiting, 3, "a failed Mac kept its count")
        XCTAssertEqual(AppModel.waitingSum([]), 0)
        XCTAssertEqual(AppModel.waitingSum([2, 3]), 5)
        XCTAssertEqual(AppModel.waitingSum([DoorNumber.largest]), DoorNumber.largest)
        XCTAssertEqual(AppModel.waitingSum([DoorNumber.largest, 1, 1]), 0, "a sum that is not a count drew a badge")
        XCTAssertEqual(AppModel.waitingSum([Int.max]), 0, "a count past the bound drew a badge")
        XCTAssertEqual(AppModel.waitingSum([-1]), 0)
        let source = try StyleSource.text("ios/Tortie/App/TortieApp.swift")
        let fold = try XCTUnwrap(source.range(of: "nonisolated static func waitingSum(")).lowerBound
        XCTAssertTrue(String(source[fold...].prefix(400)).contains("DoorNumber.sum(waiting, count)"))
    }

    /// Clause (D7): the Macs not on screen are read, one `/v1/blocked` each,
    /// on the return to the foreground and on the Macs tab; the pull reads
    /// every Mac; with one Mac kept nothing extra is read.
    func testTheMacsNotOnScreenAreRead() async {
        let a = ScriptedReader(blocked: [.success(waiting(0)), .success(waiting(0))], mac: studio)
        let b = ScriptedReader(blocked: [.success(waiting(1)), .success(waiting(1)), .success(waiting(1))], mac: laptop)
        let (app, _) = app([a, b])
        app.cameToForeground()
        await app.othersRead?.value
        var aReads = await a.blockedCalls
        var bReads = await b.blockedCalls
        XCTAssertEqual(aReads, 0, "the foreground read the Mac on screen's list from the model")
        XCTAssertEqual(bReads, 1)
        await app.readOtherMacs()
        bReads = await b.blockedCalls
        XCTAssertEqual(bReads, 2)
        await app.readAllMacs()
        aReads = await a.blockedCalls
        bReads = await b.blockedCalls
        XCTAssertEqual(aReads, 1)
        XCTAssertEqual(bReads, 3)

        let only = ScriptedReader(mac: studio)
        let (one, _) = self.app([only])
        one.cameToForeground()
        XCTAssertNil(one.othersRead, "one Mac read another")
        await one.readOtherMacs()
        await one.readAllMacs()
        let onlyReads = await only.blockedCalls
        XCTAssertEqual(onlyReads, 0)
    }

    // MARK: Names (D21)

    /// Clause (D21): a Mac is drawn by its first label, or by its whole
    /// public name when another kept Mac has the same first label; with one
    /// Mac it is the first label, as Settings has always drawn it.
    func testDrawnNames() {
        XCTAssertEqual(PairedFacts.drawnName(studio, among: [studio]), "studio")
        XCTAssertEqual(PairedFacts.drawnName(studio, among: [studio, laptop]), "studio")
        let twin = "studio.tail9999.ts.net"
        XCTAssertEqual(PairedFacts.drawnName(studio, among: [studio, twin]), studio)
        XCTAssertEqual(PairedFacts.drawnName(twin, among: [studio, twin, laptop]), twin)
        XCTAssertEqual(PairedFacts.drawnName(laptop, among: [studio, twin, laptop]), "laptop")
        let (app, _) = app([ScriptedReader(mac: studio), ScriptedReader(mac: twin)])
        XCTAssertEqual(app.spaces.map { app.drawnName($0) }, [studio, twin])
        XCTAssertEqual(MacRow.rows(app).map(\.name), [studio, twin])
        XCTAssertEqual(SettingsScreen(app: app).drawing.macName, studio)
    }

    // MARK: The Macs screen (D14)

    /// Clause (D14): one row per Mac in order, the Mac on screen ticked, each
    /// line its last read's sentence, else `Needs your input (n)` with the
    /// waiting dot, else nothing; a tap chooses.
    func testTheMacsScreensRows() async throws {
        let a = ScriptedReader(blocked: [.success(waiting(1))], mac: studio)
        let b = ScriptedReader(blocked: [.failure(.timedOut)], mac: laptop)
        let c = ScriptedReader(blocked: [.success(waiting(0))], mac: mini)
        let (app, _) = app([a, b, c])
        XCTAssertEqual(MacRow.rows(app).map(\.line), [nil, nil, nil], "a line before any read")
        await app.readAllMacs()
        XCTAssertEqual(MacRow.rows(app), [
            MacRow(id: studio, name: "studio", chosen: true, line: Copy.needsYourInput(1), waiting: true),
            MacRow(id: laptop, name: "laptop", chosen: false, line: Copy.macDidNotAnswer, waiting: false),
            MacRow(id: mini, name: "mini", chosen: false, line: nil, waiting: false)
        ])
        let screen = MacsScreen(app: app)
        app.tab = .macs
        screen.choose(MacRow.rows(app)[1])
        XCTAssertEqual(app.chosen?.id, laptop)
        XCTAssertEqual(app.tab, .needsInput)
        XCTAssertEqual(MacRow.rows(app).map(\.chosen), [false, true, false])
        XCTAssertEqual(ID.macsScreen, "screen-macs")
        XCTAssertEqual(ID.macsTitle, "macs-title")
        XCTAssertEqual(ID.macsRow(0), "macs-row-0")
        XCTAssertEqual(ID.macsRowName(1), "macs-row-name-1")
        XCTAssertEqual(ID.macsRowLine(2), "macs-row-line-2")
        XCTAssertEqual(ID.macsRowChosen(3), "macs-row-chosen-3")
        XCTAssertEqual(ID.pairAnotherSheet, "pair-another-sheet")
        XCTAssertEqual(ID.pairAnotherCancel, "pair-another-cancel")
    }

    // MARK: A refusal (D18)

    /// Clause (D18): with ONE Mac kept a refused list is today's: Pairing
    /// with the one line, and nothing forgotten. With two or more, only the
    /// refusing Mac is blanked: its paths empty, its list `This iPhone is not
    /// paired with this Mac.` with Try again; the Mac on screen, the other
    /// Macs and the tab stay; nothing is forgotten; never Pairing.
    func testARefusalBlanksOnlyItsMac() async throws {
        let solo = ScriptedReader(blocked: [.failure(.refused)], mac: studio)
        let (one, onePhone) = app([solo])
        await one.list?.load()
        XCTAssertEqual(one.root, .pairing, "one Mac's refusal did not go to Pairing")
        XCTAssertEqual(one.pairing.line, Copy.notPaired)
        XCTAssertEqual(onePhone.unpairs + onePhone.forgets, 0, "a refusal forgot a pairing")
        XCTAssertEqual(onePhone.pairedReaders().count, 1)

        let a = ScriptedReader(blocked: [.success(waiting(1))], mac: studio)
        let b = ScriptedReader(blocked: [.failure(.refused), .success(waiting(2))], mac: laptop)
        let (app, phone) = app([a, b])
        let aSpace = try space(app, studio)
        let bSpace = try space(app, laptop)
        await app.list?.load()
        bSpace.waitingPath = [.session(mac: laptop, id: "w", name: "w")]
        bSpace.sessionsPath = [.session(mac: laptop, id: "s", name: "s")]
        aSpace.sessionsPath = [.session(mac: studio, id: "k", name: "k")]
        app.tab = .sessions
        await app.readOtherMacs()
        XCTAssertEqual(app.root, .reading, "a refusal from one of two Macs went to Pairing")
        XCTAssertEqual(bSpace.list.state, .failed(Copy.notPairedHere))
        XCTAssertEqual(bSpace.waitingPath, [])
        XCTAssertEqual(bSpace.sessionsPath, [])
        XCTAssertEqual(app.chosen?.id, studio, "a refusal moved the Mac on screen")
        XCTAssertEqual(app.tab, .sessions, "a refusal moved the tab")
        XCTAssertEqual(aSpace.sessionsPath, [.session(mac: studio, id: "k", name: "k")], "a refusal moved another Mac")
        XCTAssertEqual(app.waitingBadge, 1)
        XCTAssertEqual(phone.unpairs + phone.forgets, 0, "a refusal forgot a pairing")
        XCTAssertEqual(app.spaces.count, 2)
        // Try again reads again, and draws the Mac's answer.
        await bSpace.list.load()
        XCTAssertEqual(app.otherMacsWaiting, 2)
        // A session's refusal on that Mac blanks that Mac alone too; one from
        // a Mac no longer kept moves nothing.
        app.routing(.needsInput, mac: laptop).pairAgain()
        XCTAssertEqual(bSpace.list.state, .failed(Copy.notPairedHere))
        app.routing(.sessions, mac: "gone.tail0000.ts.net").pairAgain()
        app.alertedRouting(mac: "gone.tail0000.ts.net").pairAgain()
        XCTAssertEqual(app.root, .reading)
        XCTAssertEqual(aSpace.sessionsPath.count, 1)
    }

    // MARK: Unpair (D15, D23)

    /// Clause (D23): Unpair forgets the Mac on screen by its public name, and
    /// tells iOS to forget this install's alert address exactly when no Mac
    /// is left or the Mac unpaired held that address; with Macs left it lands
    /// on the first one's Needs input, never Pairing; a record that stays
    /// says nothing changed on THAT Mac and forgets nothing.
    func testUnpairForgetsTheMacOnScreen() async throws {
        let address = try XCTUnwrap(PushAddress(token: String(repeating: "ab", count: 32), environment: .development))
        let holds = AlertsKept(macSends: true, presented: address)
        let sendsNone = AlertsKept(macSends: true, presented: nil)
        struct Row {
            let why: String
            let kept: [(String, AlertsKept)]
            let unpair: String
            let forgets: Int
        }
        let rows = [
            Row(why: "the last Mac", kept: [(studio, .nothing)], unpair: studio, forgets: 1),
            Row(why: "the last Mac, holding the address", kept: [(studio, holds)], unpair: studio, forgets: 1),
            Row(why: "one of two, holding the address", kept: [(studio, holds), (laptop, .nothing)], unpair: studio, forgets: 1),
            Row(why: "one of two, holding none while another sends", kept: [(studio, .nothing), (laptop, sendsNone)], unpair: studio, forgets: 0),
            Row(why: "one of two that sends, holding none", kept: [(studio, sendsNone), (laptop, holds)], unpair: studio, forgets: 0)
        ]
        for row in rows {
            let alerts = StandInAlerts(authorization: .authorized)
            let (app, phone) = app(row.kept.map { ScriptedReader(alerts: $0.1, mac: $0.0) }, alerts: alerts)
            app.choose(row.unpair)
            app.tab = .settings
            app.unpair()
            await app.forgetting?.value
            XCTAssertEqual(phone.unpaired, [row.unpair], row.why)
            XCTAssertEqual(alerts.addressForgets, row.forgets, row.why)
            if row.kept.count == 1 {
                XCTAssertEqual(app.root, .pairing, row.why)
                XCTAssertEqual(app.pairing.line, Copy.notPaired, row.why)
            } else {
                XCTAssertEqual(app.root, .reading, row.why)
                XCTAssertEqual(app.spaces.map(\.id), [laptop], row.why)
                XCTAssertEqual(app.chosen?.id, laptop, row.why)
                XCTAssertEqual(app.tab, .needsInput, row.why)
                XCTAssertFalse(app.showsMacs, row.why)
                XCTAssertNil(app.space(studio), "the Mac unpaired kept its space, so its routes still draw: \(row.why)")
            }
        }

        let alerts = StandInAlerts(authorization: .authorized)
        let (app, phone) = app([ScriptedReader(alerts: holds, mac: studio), ScriptedReader(mac: laptop)], alerts: alerts)
        phone.unpairOutcome = .kept
        app.choose(laptop)
        app.tab = .settings
        app.unpair()
        XCTAssertEqual(phone.unpaired, [laptop])
        XCTAssertEqual(app.settingsLine, Copy.unpairFailed)
        XCTAssertNil(try space(app, studio).settingsLine, "the other Mac says it could not be forgotten")
        XCTAssertNil(app.forgetting)
        XCTAssertEqual(alerts.addressForgets, 0)
        XCTAssertEqual(app.spaces.count, 2)
        XCTAssertEqual(app.tab, .settings)
    }

    /// Clause (D3): the Macs tab is never left on screen once it is not
    /// drawn: unpairing down to one Mac from it lands on Needs input.
    func testTheMacsTabIsNeverLeftOnScreenUndrawn() {
        let (app, _) = app([ScriptedReader(mac: studio), ScriptedReader(mac: laptop)])
        app.tab = .macs
        XCTAssertTrue(app.showsMacs)
        app.unpair()
        XCTAssertFalse(app.showsMacs)
        XCTAssertEqual(app.tab, .needsInput, "the Macs tab was left on screen with one Mac")
        app.tab = .macs
        app.openSample()
        XCTAssertEqual(app.tab, .needsInput)
    }

    // MARK: An alert's tap (D24) and the alert line (D25)

    /// Clause (D24): with one Mac a tap is today's whatever it said about
    /// alerts; with two or more it opens its session on the ONE Mac that says
    /// it sends, chosen; with none or several it lands on the Mac on screen's
    /// Needs input with nothing pushed and nothing read, never a guess.
    func testAnAlertsTapOpensOnTheOneMacThatSends() async throws {
        for sends in [false, true] {
            let (one, _) = app([ScriptedReader(alerts: AlertsKept(macSends: sends, presented: nil), mac: studio)])
            one.tab = .settings
            one.openFromAlert(.session("s"))
            XCTAssertEqual(one.waitingPath, [.alerted(mac: studio, id: "s")], "one Mac, sends \(sends)")
            XCTAssertEqual(one.tab, .needsInput)
        }

        let sender = AlertsKept(macSends: true, presented: nil)
        let (app, _) = app([ScriptedReader(mac: studio), ScriptedReader(alerts: sender, mac: laptop)])
        let a = try space(app, studio)
        a.sessionsPath = [.session(mac: studio, id: "k", name: "k")]
        app.tab = .sessions
        XCTAssertEqual(app.alertTarget()?.id, laptop)
        app.openFromAlert(.session("s"))
        XCTAssertEqual(app.chosen?.id, laptop, "the tap did not choose the Mac that sends")
        XCTAssertEqual(app.tab, .needsInput)
        XCTAssertEqual(app.waitingPath, [.alerted(mac: laptop, id: "s")])
        XCTAssertEqual(a.sessionsPath.count, 1, "the tap moved the other Mac")
        app.openFromAlert(.list)
        XCTAssertEqual(app.waitingPath, [])

        for kept in [[AlertsKept.nothing, .nothing], [sender, sender]] {
            let readers = [ScriptedReader(alerts: kept[0], mac: studio), ScriptedReader(alerts: kept[1], mac: laptop)]
            let (app, _) = self.app(readers)
            app.choose(laptop)
            let b = try space(app, laptop)
            b.waitingPath = [.session(mac: laptop, id: "o", name: "o")]
            app.tab = .settings
            XCTAssertNil(app.alertTarget())
            app.openFromAlert(.session("s"))
            XCTAssertEqual(app.chosen?.id, laptop, "a tap no Mac can claim moved the Mac on screen")
            XCTAssertEqual(app.tab, .needsInput)
            XCTAssertEqual(b.waitingPath, [], "a tap no Mac can claim pushed something")
            for reader in readers {
                let read = await reader.sessionCalls
                XCTAssertEqual(read, 0, "a tap no Mac can claim read a session")
            }
        }
    }

    /// Clause (D25): `Pair again to get alerts.` is each Mac's own, asked for
    /// every Mac that sends and drawn on that Mac's list; what iOS allows is
    /// read for the Mac on screen alone.
    func testTheAlertLineIsEachMacsOwn() async throws {
        let mine = try XCTUnwrap(PushAddress(token: String(repeating: "ab", count: 32), environment: .development))
        let other = try XCTUnwrap(PushAddress(token: String(repeating: "cd", count: 32), environment: .development))
        let alerts = StandInAlerts(authorization: .authorized, current: mine)
        let (app, _) = app([
            ScriptedReader(alerts: AlertsKept(macSends: true, presented: other), mac: studio),
            ScriptedReader(alerts: AlertsKept(macSends: true, presented: mine), mac: laptop),
            ScriptedReader(alerts: AlertsKept(macSends: false, presented: other), mac: mini)
        ], alerts: alerts)
        await app.checkAlertAddress()
        XCTAssertEqual(try space(app, studio).list.alertsLine, Copy.pairAgainForAlerts)
        XCTAssertNil(try space(app, laptop).list.alertsLine)
        XCTAssertNil(try space(app, mini).list.alertsLine)
        XCTAssertEqual(alerts.authorizationAsks, 2, "iOS was asked for a Mac that cannot send")
        app.choose(mini)
        await app.readAlertPermission()
        XCTAssertNil(app.alertPermission, "a Mac that cannot send read what iOS allows")
        app.choose(laptop)
        XCTAssertNil(app.alertPermission, "what iOS allows for one Mac outlived the switch")
        await app.readAlertPermission()
        XCTAssertEqual(app.alertPermission, .authorized)
    }

    // MARK: Routes (D13)

    /// Clause (D13): every route names its Mac, and a pushed screen's reader
    /// is that Mac's, looked up by its public name in ONE place and from
    /// nothing else; a route whose Mac is no longer kept finds none and draws
    /// nothing; every stack in the bar is built again over the Mac on screen.
    func testARouteReadsThroughItsOwnMac() throws {
        let (app, _) = app([ScriptedReader(mac: studio), ScriptedReader(mac: laptop)])
        let routes: [Route] = [
            .session(mac: laptop, id: "s", name: "s"), .catchUp(mac: laptop, id: "s", honestLine: nil), .alerted(mac: laptop, id: "s")
        ]
        for route in routes {
            XCTAssertEqual(route.mac, laptop)
            XCTAssertTrue((app.space(route.mac)?.reader as? ScriptedReader) === (app.spaces[1].reader as? ScriptedReader))
        }
        app.choose(laptop)
        app.unpair()
        XCTAssertNil(app.space(laptop), "a Mac unpaired still answers a route")

        let source = try StyleSource.text("ios/Tortie/App/TortieApp.swift")
        let start = try XCTUnwrap(source.range(of: "private func destination(")).lowerBound
        let end = try XCTUnwrap(source.range(of: "\n    }\n}\n", range: start..<source.endIndex)).lowerBound
        let destination = String(source[start..<end])
        XCTAssertEqual(destination.components(separatedBy: "app.space(").count, 2, "a route's reader is looked up other than once")
        XCTAssertTrue(destination.contains("if let reader = app.space(route.mac)?.reader {"))
        XCTAssertFalse(destination.contains("app.reader"), "a route reads the Mac on screen's reader")
        XCTAssertFalse(destination.contains("app.chosen"), "a route reads the Mac on screen")
        for routing in ["app.routing(tab, mac: mac)", "app.alertedRouting(mac: mac)"] {
            XCTAssertTrue(destination.contains(routing), "a route's refusals do not go to its own Mac: \(routing)")
        }
    }

    // MARK: Pair another Mac (D16, D12, D19)

    /// Clause (D16): Pair another Mac is a sheet with a model of its own,
    /// beside the kept Macs: its line names this Mac; a second press opens no
    /// second sheet; Pairing has no sheet.
    func testPairAnotherMacOpensOneSheet() throws {
        let (app, _) = app([ScriptedReader(mac: studio)])
        app.pairAnotherMac()
        let sheet = try XCTUnwrap(app.anotherPairing)
        XCTAssertTrue(sheet.keepsOthers)
        XCTAssertFalse(app.pairing.keepsOthers)
        XCTAssertFalse(sheet === app.pairing, "the sheet is Pairing's own model")
        XCTAssertEqual(sheet.line, Copy.notPairedHere)
        XCTAssertEqual(app.pairing.line, Copy.notPaired)
        app.pairAnotherMac()
        XCTAssertTrue(app.anotherPairing === sheet, "a second press opened a second sheet")
        app.endPairAnother()
        XCTAssertNil(app.anotherPairing)
        let (unpaired, _) = self.app([])
        unpaired.pairAnotherMac()
        XCTAssertNil(unpaired.anotherPairing, "Pairing opened the sheet")
    }

    /// Clause (D16): the sheet's pairing done closes the sheet onto the new
    /// Mac's Needs input, chosen, its list the first read's, in the store's
    /// order, with the alert line asked again; a Mac paired again takes its
    /// own place with a new reader and nothing pushed.
    func testAPairingFromTheSheetChoosesTheNewMac() async throws {
        let first = waiting(2)
        let newLaptop = ScriptedReader(mac: laptop)
        let phone = StandInPhone(kept: ScriptedReader(mac: studio), outcomes: [.paired(newLaptop, first)])
        phone.keepsWhatPairs = true
        let app = AppModel(door: phone, label: "iPhone", alerts: StandInAlerts(), choices: MemoryWords(.standard))
        app.tab = .settings
        app.pairAnotherMac()
        await app.anotherPairing?.read("code")
        XCTAssertNil(app.anotherPairing, "the sheet did not close")
        XCTAssertEqual(app.spaces.map(\.id), [studio, laptop])
        XCTAssertEqual(app.chosen?.id, laptop)
        XCTAssertEqual(app.tab, .needsInput)
        XCTAssertTrue(app.showsMacs)
        XCTAssertEqual(app.waitingBadge, 2, "the new Mac's list is not the first read's")
        XCTAssertNotNil(app.addressCheck, "the pairing did not ask the alert line again")

        let again = ScriptedReader(mac: studio)
        let rephone = StandInPhone(kept: ScriptedReader(mac: studio), others: [ScriptedReader(mac: laptop)], outcomes: [.paired(again, waiting(0))])
        rephone.keepsWhatPairs = true
        let reapp = AppModel(door: rephone, label: "iPhone", alerts: StandInAlerts(), choices: MemoryWords(.standard))
        reapp.choose(laptop)
        reapp.space(studio)?.waitingPath = [.session(mac: studio, id: "w", name: "w")]
        reapp.pairAnotherMac()
        await reapp.anotherPairing?.read("code")
        XCTAssertEqual(reapp.spaces.map(\.id), [studio, laptop], "a Mac paired again moved")
        XCTAssertEqual(reapp.chosen?.id, studio)
        XCTAssertTrue((reapp.reader as? ScriptedReader) === again, "a Mac paired again kept its old reader")
        XCTAssertEqual(reapp.waitingPath, [], "a Mac paired again kept what was pushed over its old reader")
    }

    /// Clause (D19): the code handed in at launch with a pairing kept opens
    /// the Pair another Mac sheet and is read there, once, through the exact
    /// line the root's task spells.
    func testTheLaunchCodeWithAPairingKeptOpensTheSheet() async throws {
        let phone = StandInPhone(kept: ScriptedReader(mac: studio), beginFailure: .badCode)
        let app = AppModel(door: phone, label: "iPhone", alerts: StandInAlerts(), launchCode: "launch-code", choices: MemoryWords(.standard))
        XCTAssertEqual(app.root, .reading)
        if let code = app.takeLaunchCode() {
            app.pairAnotherMac()
            await app.anotherPairing?.read(code)
        }
        XCTAssertEqual(phone.begun, ["launch-code"], "the sheet did not read the launch code")
        XCTAssertEqual(app.anotherPairing?.line, Copy.pairNotACode)
        XCTAssertNil(app.takeLaunchCode())
        XCTAssertEqual(app.root, .reading)
        let source = try StyleSource.text("ios/Tortie/App/TortieApp.swift")
        let reading = try XCTUnwrap(source.range(of: "            case .reading:")).lowerBound
        let branch = String(source[reading...].prefix(900))
        XCTAssertTrue(branch.contains("if let code = app.takeLaunchCode() {\n                                app.pairAnotherMac()\n                                await app.anotherPairing?.read(code)\n"), "the reading root does not hand the launch code to the sheet")
        XCTAssertTrue(branch.contains(".sheet(isPresented: pairingAnother, onDismiss: { app.endPairAnother() })"))
        // The sheet: the pairing screen with no See a sample, and Cancel in
        // its top bar ending the attempt, each under its identifier.
        let sheet = try XCTUnwrap(source.range(of: "private func pairAnotherSheet(_ model: PairingModel) -> some View {")).lowerBound
        let sheetEnd = try XCTUnwrap(source.range(of: "private func tabs(", range: sheet..<source.endIndex)).lowerBound
        let drawn = String(source[sheet..<sheetEnd])
        for needle in [
            "NavigationStack {", "PairingScreen(model: model, seeSample: nil)", "ToolbarItem(placement: .cancellationAction)",
            "Button(Copy.cancel) { app.endPairAnother() }", ".accessibilityIdentifier(ID.pairAnotherCancel)",
            ".accessibilityIdentifier(ID.pairAnotherSheet)"
        ] {
            XCTAssertTrue(drawn.contains(needle), "the Pair another Mac sheet does not hold \(needle)")
        }
        let shown = try XCTUnwrap(source.range(of: "private var pairingAnother: Binding<Bool> {")).lowerBound
        let binding = String(source[shown...].prefix(300))
        XCTAssertTrue(binding.contains("get: { app.anotherPairing != nil }"))
        XCTAssertTrue(binding.contains("if !shown { app.endPairAnother() }"), "swiping the sheet away does not end the attempt")
    }

    /// Clause (D16): Cancel ends the attempt under way, through the SHIPPING
    /// flow: the presenting is cancelled, the attempt's client key deleted,
    /// nothing kept, and the line names this Mac.
    func testCancelEndsTheAttemptAndDeletesItsKey() async throws {
        let v = try DoorVectorFile.load()
        let keys = MemoryClientKeys(spki: v.keys.clientKey)
        let store = PairingStore(secrets: MemorySecrets(), clientKeys: keys)
        let exchange = HangingExchange()
        let door = FlowDoor(flow: PairingFlow(exchange: exchange, store: store), offer: PairingOffer(
            door: DoorEndpoint(name: laptop, port: 8443, pin: Base64URL.encode(Data(count: 32))),
            macSigningKey: v.keys.macSigningKey, macExchangeKey: v.keys.macExchangeKey,
            secret: Data(repeating: 7, count: 16), expiresAt: 9_999_999_999_999
        ))
        let model = PairingModel(door: door, label: "iPhone", alerts: StandInAlerts(), keepsOthers: true) { _, _ in
            XCTFail("a cancelled attempt paired")
        }
        let reading = Task { await model.read("code") }
        for _ in 0..<500 where exchange.presented == 0 {
            try await Task.sleep(for: .milliseconds(10))
        }
        XCTAssertEqual(exchange.presented, 1, "the attempt never presented")
        XCTAssertEqual(keys.held.count, 1, "the attempt made no key")
        model.cancel()
        await reading.value
        XCTAssertEqual(keys.held, [], "a cancelled attempt kept its client key")
        XCTAssertEqual(keys.deleted.count, 1)
        XCTAssertFalse(store.holdsRecord)
        XCTAssertEqual(model.line, Copy.notPairedHere)
        XCTAssertFalse(model.busy)
        XCTAssertFalse(model.stopped, "a cancelled attempt was spent")
    }

    /// Clause (D16): endPairAnother cancels the sheet's attempt and drops it;
    /// the stand-in's pairing ends as one whose screen was left.
    func testEndPairAnotherCancelsTheSheetsAttempt() async throws {
        let phone = StandInPhone(kept: ScriptedReader(mac: studio), outcomes: [.paired(ScriptedReader(mac: laptop), waiting(0))])
        let started = Seen<Bool>()
        phone.duringPair = {
            await started.set(true)
            try? await Task.sleep(for: .seconds(30))
        }
        let app = AppModel(door: phone, label: "iPhone", alerts: StandInAlerts(), choices: MemoryWords(.standard))
        app.pairAnotherMac()
        let sheet = try XCTUnwrap(app.anotherPairing)
        let reading = Task { await sheet.read("code") }
        for _ in 0..<500 {
            if await started.value == true { break }
            try await Task.sleep(for: .milliseconds(10))
        }
        app.endPairAnother()
        await reading.value
        XCTAssertNil(app.anotherPairing)
        XCTAssertEqual(phone.pairs, 0, "a cancelled attempt was answered")
        XCTAssertEqual(app.spaces.map(\.id), [studio], "a cancelled attempt added a Mac")
        XCTAssertEqual(sheet.line, Copy.notPairedHere)
    }

    /// Clause (D12): a fifth Mac's code is refused as it is read, with the
    /// cap's sentence and nothing made or presented; a kept Mac's code at
    /// four is read as ever. Through the SHIPPING `LiveDoor.begin` over a
    /// store in memory holding four Macs.
    func testAFifthMacIsRefusedAsTheCodeIsRead() throws {
        let v = try DoorVectorFile.load()
        let payload = try XCTUnwrap(v.qr.first).payload
        let codeName = try PairingOffer.parse(payload).door.name
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        func kept(_ names: [String]) throws -> (LiveDoor, MemoryClientKeys) {
            let keys = MemoryClientKeys(spki: v.keys.clientKey)
            let store = PairingStore(secrets: MemorySecrets(), clientKeys: keys)
            for (at, name) in names.enumerated() {
                let key = try keys.mint()
                let door = try XCTUnwrap(PairedDoor(
                    endpoint: DoorEndpoint(name: name, port: 8443, pin: Base64URL.encode(Data(count: 32))),
                    macSigningKey: v.keys.macSigningKey, macExchangeKey: v.keys.macExchangeKey, label: "x",
                    pairedAt: Double(at), keys: PhoneKeys.generate(), clientKey: key, certificate: certificate,
                    identity: try keys.adopt(certificate, for: key), alerts: .nothing
                ))
                try store.save(door)
            }
            return (LiveDoor(store: store, transport: NameTransport()), keys)
        }
        let four = ["a.tail0000.ts.net", "b.tail0000.ts.net", "c.tail0000.ts.net", "d.tail0000.ts.net"]
        let (full, fullKeys) = try kept(four)
        XCTAssertEqual(full.pairedReaders().count, 4)
        XCTAssertEqual(full.pairedReaders().map { $0.facts.publicName }, four, "the readers are not in the store's order")
        let minted = fullKeys.minted
        XCTAssertThrowsError(try full.begin(payload: payload, label: "iPhone")) { error in
            XCTAssertEqual(error as? PairingFailure, .macLimit)
        }
        XCTAssertEqual(fullKeys.minted, minted, "a fifth Mac's code made a key")
        XCTAssertEqual(DoorWords.pairingSentence(for: .macLimit, keepsOthers: true), Copy.macLimit)

        let (again, againKeys) = try kept(Array(four.dropLast()) + [codeName])
        XCTAssertNoThrow(try again.begin(payload: payload, label: "iPhone"), "a kept Mac's code at four was refused")
        XCTAssertEqual(againKeys.minted, 5)
        let (room, _) = try kept(Array(four.dropLast()))
        XCTAssertNoThrow(try room.begin(payload: payload, label: "iPhone"))
    }

    /// Clause (D12): on the sheet the cap is its sentence, and nothing is
    /// presented.
    func testTheSheetSaysTheCap() async throws {
        let phone = StandInPhone(kept: ScriptedReader(mac: studio), beginFailure: .macLimit)
        let app = AppModel(door: phone, label: "iPhone", alerts: StandInAlerts(), choices: MemoryWords(.standard))
        app.pairAnotherMac()
        let sheet = try XCTUnwrap(app.anotherPairing)
        await sheet.read("fifth")
        XCTAssertEqual(sheet.line, Copy.macLimit)
        XCTAssertEqual(phone.pairs, 0)
        XCTAssertTrue(sheet.stopped)
    }

    // MARK: The one-Mac phone's Pairing screen, as build 10 (the fix round, D18a)

    /// Clause (D18a): with ONE Mac kept a refusal goes to Pairing and forgets
    /// nothing, as build 10's did; a pairing made THERE with another Mac then
    /// takes the refused Mac's place, as build 10's one pairing was replaced:
    /// that Mac alone is forgotten, through Unpair's door, once the new pairing
    /// is kept; the bar keeps its three tabs; Apple is told nothing; and the
    /// next launch opens on the new Mac alone, never on the Mac that refused.
    /// The same Mac paired again there forgets nothing: its record was
    /// replaced in place.
    func testAPairingOnThePairingScreenARefusalLedToTakesThatMacsPlace() async throws {
        let holds = AlertsKept(
            macSends: true,
            presented: try XCTUnwrap(PushAddress(token: String(repeating: "ab", count: 32), environment: .development))
        )
        let alerts = StandInAlerts(authorization: .authorized)
        let phone = StandInPhone(
            kept: ScriptedReader(blocked: [.failure(.refused)], alerts: holds, mac: studio),
            outcomes: [.paired(ScriptedReader(mac: laptop), waiting(1))]
        )
        phone.keepsWhatPairs = true
        let app = AppModel(door: phone, label: "iPhone", alerts: alerts, choices: MemoryWords(.standard))
        await app.list?.load()
        XCTAssertEqual(app.root, .pairing, "one Mac's refusal did not go to Pairing")
        XCTAssertEqual(phone.unpaired, [], "a refusal forgot the Mac")
        XCTAssertEqual(phone.pairedReaders().count, 1)
        await app.pairing.read("code")
        XCTAssertEqual(phone.unpaired, [studio], "the Mac that refused was not replaced, or another was forgotten")
        XCTAssertEqual(phone.forgets, 0, "every Mac was forgotten")
        XCTAssertEqual(app.root, .reading)
        XCTAssertEqual(app.spaces.map(\.id), [laptop], "the Mac that refused stayed beside the new one")
        XCTAssertEqual(app.chosen?.id, laptop)
        XCTAssertFalse(app.showsMacs, "a fourth tab after a one-Mac phone paired again")
        XCTAssertEqual(app.waitingBadge, 1)
        await app.addressCheck?.value
        XCTAssertEqual(alerts.addressForgets, 0, "Apple was told to stop, which build 10 never did on a pairing")
        let next = AppModel(door: phone, label: "iPhone", alerts: StandInAlerts(), choices: MemoryWords(.standard))
        XCTAssertEqual(next.spaces.map(\.id), [laptop], "the next launch keeps the Mac that refused")
        XCTAssertEqual(next.chosen?.id, laptop)
        XCTAssertFalse(next.showsMacs)

        let again = ScriptedReader(mac: studio)
        let rephone = StandInPhone(kept: ScriptedReader(blocked: [.failure(.refused)], mac: studio), outcomes: [.paired(again, waiting(0))])
        rephone.keepsWhatPairs = true
        let reapp = AppModel(door: rephone, label: "iPhone", alerts: StandInAlerts(), choices: MemoryWords(.standard))
        await reapp.list?.load()
        XCTAssertEqual(reapp.root, .pairing)
        await reapp.pairing.read("code")
        XCTAssertEqual(rephone.unpaired, [], "the same Mac paired again was forgotten")
        XCTAssertEqual(reapp.spaces.map(\.id), [studio])
        XCTAssertTrue((reapp.reader as? ScriptedReader) === again)
    }

    /// Clause (D18a): ONLY the Pairing screen a one-Mac refusal led to
    /// replaces, and only the Mac that refused. Pairing after Unpair of the
    /// last Mac forgets nothing more; the Pair another Mac sheet never
    /// forgets, a refused Mac among two included; a return that finds the Mac
    /// kept with no pairing under way drops it; and a pairing already under
    /// way there when the return comes still replaces it, as build 10's did.
    func testOnlyThePairingScreenARefusalLedToReplacesAndOnlyThatMac() async throws {
        let afterUnpair = StandInPhone(kept: ScriptedReader(mac: studio), outcomes: [.paired(ScriptedReader(mac: laptop), waiting(0))])
        afterUnpair.keepsWhatPairs = true
        let unpaired = AppModel(door: afterUnpair, label: "iPhone", alerts: StandInAlerts(), choices: MemoryWords(.standard))
        unpaired.unpair()
        XCTAssertEqual(unpaired.root, .pairing)
        await unpaired.pairing.read("code")
        XCTAssertEqual(afterUnpair.unpaired, [studio], "a pairing after Unpair forgot again")
        XCTAssertEqual(unpaired.spaces.map(\.id), [laptop])

        let refusing = ScriptedReader(blocked: [.failure(.refused)], mac: laptop)
        let two = StandInPhone(kept: ScriptedReader(mac: studio), others: [refusing], outcomes: [.paired(ScriptedReader(mac: mini), waiting(0))])
        two.keepsWhatPairs = true
        let twoApp = AppModel(door: two, label: "iPhone", alerts: StandInAlerts(), choices: MemoryWords(.standard))
        await twoApp.readOtherMacs()
        XCTAssertEqual(try space(twoApp, laptop).list.state, .failed(Copy.notPairedHere))
        XCTAssertEqual(twoApp.root, .reading)
        twoApp.pairAnotherMac()
        await twoApp.anotherPairing?.read("code")
        XCTAssertEqual(two.unpaired, [], "the sheet forgot a Mac")
        XCTAssertEqual(twoApp.spaces.map(\.id), [studio, laptop, mini])

        let back = StandInPhone(
            kept: ScriptedReader(blocked: [.failure(.refused), .success(waiting(0))], mac: studio),
            outcomes: [.paired(ScriptedReader(mac: laptop), waiting(0))]
        )
        back.keepsWhatPairs = true
        let backApp = AppModel(door: back, label: "iPhone", alerts: StandInAlerts(), choices: MemoryWords(.standard))
        await backApp.list?.load()
        XCTAssertEqual(backApp.root, .pairing)
        backApp.cameToForeground()
        XCTAssertEqual(backApp.root, .reading, "the Mac kept did not come back on the return")
        await backApp.pairing.read("code")
        XCTAssertEqual(back.unpaired, [], "a Mac that came back was replaced by a pairing started after it did")
        XCTAssertEqual(backApp.spaces.map(\.id), [studio, laptop])

        let flight = StandInPhone(
            kept: ScriptedReader(blocked: [.failure(.refused)], mac: studio),
            outcomes: [.paired(ScriptedReader(mac: laptop), waiting(0))]
        )
        flight.keepsWhatPairs = true
        let flightApp = AppModel(door: flight, label: "iPhone", alerts: StandInAlerts(), choices: MemoryWords(.standard))
        await flightApp.list?.load()
        XCTAssertEqual(flightApp.root, .pairing)
        flight.duringPair = { await MainActor.run { flightApp.cameToForeground() } }
        await flightApp.pairing.read("code")
        XCTAssertEqual(flight.unpaired, [studio], "a pairing under way on that screen did not replace the Mac that refused")
        XCTAssertEqual(flightApp.spaces.map(\.id), [laptop])
        XCTAssertEqual(flightApp.root, .reading)
    }

    // MARK: A replaced pairing's late answers (the fix round)

    /// Clause (the fix round): a read the REPLACED pairing of a Mac had under
    /// way answers for that pairing alone. Its refusal, landing after the new
    /// pairing of the same Mac is drawn, blanks nothing and goes nowhere, with
    /// two Macs kept or one; a session's routing or an alerted session's made
    /// before the re-pair neither pops nor blanks the new space; and a
    /// routing made for the new space still does.
    func testAReplacedPairingsLateAnswersMoveNothing() async throws {
        for count in [2, 1] {
            let old = GatedReader(mac: studio)
            let others: [any DoorReading] = count == 2 ? [ScriptedReader(mac: laptop)] : []
            let phone = StandInPhone(kept: old, others: others, outcomes: [.paired(ScriptedReader(mac: studio), waiting(2))])
            phone.keepsWhatPairs = true
            let app = AppModel(door: phone, label: "iPhone", alerts: StandInAlerts(), choices: MemoryWords(.standard))
            let before = try space(app, studio)
            let route = app.routing(.needsInput, mac: studio)
            let alerted = app.alertedRouting(mac: studio)
            old.hold()
            let reading = Task { await before.list.load() }
            while old.entered == 0 {
                try await Task.sleep(for: .milliseconds(5))
            }
            app.pairAnotherMac()
            await app.anotherPairing?.read("code")
            let after = try space(app, studio)
            XCTAssertFalse(after === before, "the re-pair kept the old space (\(count) Macs)")
            XCTAssertEqual(app.waitingBadge, 2)
            app.open(RowDrawing(Answers.row("x"), waiting: false), in: .needsInput)
            let pushed = after.waitingPath
            XCTAssertEqual(pushed.count, 1)

            old.release(refusing: true)
            await reading.value
            route.pairAgain()
            route.backToList()
            alerted.backToList()
            alerted.pairAgain()
            XCTAssertEqual(app.root, .reading, "the old pairing's refusal went to Pairing (\(count) Macs)")
            XCTAssertEqual(app.waitingBadge, 2, "the old pairing's refusal blanked the new pairing (\(count) Macs)")
            XCTAssertEqual(after.waitingPath, pushed, "the old pairing's routing popped the new one (\(count) Macs)")
            XCTAssertNil(app.noticeRead, "the old pairing's alerted routing read the new list (\(count) Macs)")
            XCTAssertEqual(phone.unpaired, [])
            XCTAssertEqual(phone.forgets, 0)

            app.routing(.needsInput, mac: studio).backToList()
            XCTAssertEqual(after.waitingPath, [], "a routing made for the new space did not pop it (\(count) Macs)")
            if count == 2 {
                app.routing(.needsInput, mac: studio).pairAgain()
                XCTAssertEqual(after.list.state, .failed(Copy.notPairedHere), "a routing made for the new space did not blank it")
            } else {
                app.routing(.needsInput, mac: studio).pairAgain()
                XCTAssertEqual(app.root, .pairing, "a routing made for the one Mac did not go to Pairing")
            }
        }
    }

    /// Clause (the ruled round): the same, with ONLY the old LIST kept across
    /// the re-pair and never its space, so the replaced space is freed and the
    /// weak `MadeFor` every old routing holds reads nil. A routing whose space
    /// is gone speaks for no space a later pairing put in its place: the late
    /// refusal and every old routing move nothing in the new space, with two
    /// Macs kept or one. (The test above holds the old space, so a `speaks`
    /// that let a nil `MadeFor` through would pass it.)
    func testALateAnswerWhoseSpaceWasFreedMovesNothing() async throws {
        for count in [2, 1] {
            let old = GatedReader(mac: studio)
            let others: [any DoorReading] = count == 2 ? [ScriptedReader(mac: laptop)] : []
            let phone = StandInPhone(kept: old, others: others, outcomes: [.paired(ScriptedReader(mac: studio), waiting(2))])
            phone.keepsWhatPairs = true
            let app = AppModel(door: phone, label: "iPhone", alerts: StandInAlerts(), choices: MemoryWords(.standard))
            let route = app.routing(.needsInput, mac: studio)
            let alerted = app.alertedRouting(mac: studio)
            weak var oldSpace = app.space(studio)
            let oldList = try XCTUnwrap(oldSpace, "no space for \(studio)").list
            old.hold()
            let reading = Task { await oldList.load() }
            while old.entered == 0 {
                try await Task.sleep(for: .milliseconds(5))
            }
            app.pairAnotherMac()
            await app.anotherPairing?.read("code")
            XCTAssertNil(oldSpace, "the replaced space outlived the re-pair, so its MadeFor never went nil (\(count) Macs)")
            let after = try space(app, studio)
            XCTAssertEqual(app.spaces.count, count)
            XCTAssertEqual(app.waitingBadge, 2)
            app.open(RowDrawing(Answers.row("x"), waiting: false), in: .needsInput)
            let pushed = after.waitingPath
            XCTAssertEqual(pushed.count, 1)
            let state = after.list.state

            old.release(refusing: true)
            await reading.value
            route.pairAgain()
            route.backToList()
            alerted.backToList()
            alerted.pairAgain()
            XCTAssertEqual(app.root, .reading, "the freed space's late refusal went to Pairing (\(count) Macs)")
            XCTAssertEqual(app.waitingBadge, 2, "the freed space's late refusal blanked the new pairing (\(count) Macs)")
            XCTAssertEqual(after.list.state, state, "the freed space's late answer moved the new list (\(count) Macs)")
            XCTAssertEqual(after.waitingPath, pushed, "an old routing popped the new space (\(count) Macs)")
            XCTAssertNil(app.noticeRead, "an old alerted routing read the new list (\(count) Macs)")
            XCTAssertTrue(app.space(studio) === after, "the new space was replaced (\(count) Macs)")
            XCTAssertEqual(phone.unpaired, [], "a late answer forgot a Mac (\(count) Macs)")
            XCTAssertEqual(phone.forgets, 0)
        }
    }

    // MARK: One Mac is today (section 3.8)

    /// Clause (section 3.8): with ONE Mac kept the app is today's: three
    /// tabs, no extra read, every member a screen reads the one Mac's, and
    /// Unpair, a refusal and a tap exactly as before.
    func testOneMacIsToday() async {
        let reader = ScriptedReader(blocked: [.success(waiting(1))], mac: studio)
        let (app, phone) = app([reader])
        XCTAssertFalse(app.showsMacs)
        XCTAssertEqual(app.otherMacsWaiting, 0)
        app.cameToForeground()
        XCTAssertNil(app.othersRead)
        await app.readOtherMacs()
        let reads = await reader.blockedCalls
        XCTAssertEqual(reads, 0)
        XCTAssertEqual(phone.readersAsked, 1, "the launch read the pairings other than once")
        XCTAssertTrue(app.list === app.spaces.first?.list)
        app.unpair()
        XCTAssertEqual(app.root, .pairing)
        XCTAssertNil(app.list)
        XCTAssertEqual(app.spaces.count, 0)
    }
}

/// A door over the SHIPPING pairing flow and a store in memory, for the
/// sheet's cancel: its code is one fixed offer.
private final class FlowDoor: PhoneDoor, @unchecked Sendable {
    let flow: PairingFlow
    let offer: PairingOffer

    init(flow: PairingFlow, offer: PairingOffer) {
        self.flow = flow
        self.offer = offer
    }

    func pairedReader() -> (any DoorReading)? { nil }

    func begin(payload: String, label: String) throws -> PendingPairing {
        try flow.begin(offer, label: label)
    }

    func pair(
        _ pending: PendingPairing,
        askForAlerts: @escaping @Sendable () async -> PushAddress?,
        progress: @escaping @Sendable (PairingStep) -> Void
    ) async -> PairResult {
        switch await flow.run(pending, askForAlerts: askForAlerts, progress: progress) {
        case .paired(let door, let first):
            return .paired(PairedReader(client: DoorClient(transport: NameTransport()), door: door), first)
        case .failed(let failure):
            return .failed(failure)
        }
    }

    func forget() {}

    func unpair(name: String) -> UnpairOutcome { .kept }
}

/// A Mac that takes the presentation and answers only when the attempt is
/// cancelled, as the client does: `DoorFailure.cancelled`.
private final class HangingExchange: DoorExchanging, @unchecked Sendable {
    private let lock = NSLock()
    private var presents = 0

    var presented: Int { lock.withLock { presents } }

    func present(_ presentation: Data, to door: DoorEndpoint) async throws -> PairAnswer {
        lock.withLock { presents += 1 }
        do {
            try await Task.sleep(for: .seconds(30))
        } catch {
            throw DoorFailure.cancelled
        }
        return .refused
    }

    func blocked(_ door: PairedDoor) async throws -> PocketBlockedAnswer {
        throw DoorFailure.refused
    }
}

/// A Mac whose list read the test holds open, then answers or refuses: the
/// pairing a re-pair replaces while its read is under way.
private final class GatedReader: DoorReading, @unchecked Sendable {
    let alerts: AlertsKept = .nothing
    let facts: PairedFacts
    private let lock = NSLock()
    private var holding = false
    private var refusing = false
    private var calls = 0

    init(mac: String) {
        facts = Answers.facts(of: mac)
    }

    var entered: Int { lock.withLock { calls } }

    func hold() {
        lock.withLock { holding = true }
    }

    func release(refusing: Bool) {
        lock.withLock {
            self.refusing = refusing
            holding = false
        }
    }

    func blocked() async throws -> PocketBlockedAnswer {
        lock.withLock { calls += 1 }
        while lock.withLock({ holding }) {
            try? await Task.sleep(for: .milliseconds(5))
        }
        if lock.withLock({ refusing }) { throw DoorFailure.refused }
        return Answers.blocked(rows: [])
    }

    func session(_ sessionId: String) async throws -> PocketSessionAnswer {
        throw DoorFailure.unreachable(code: -1004)
    }

    func turns(_ sessionId: String, to: Int?) async throws -> PocketTurnsAnswer {
        throw DoorFailure.unreachable(code: -1004)
    }
}
