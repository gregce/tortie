import Foundation
import XCTest
@testable import Tortie

/// Settings (Phase 316.6, build/p3166/SPEC.md section 5.3): the paired Mac's
/// PUBLIC facts and nothing else, the Alerts card only for a Mac that said it
/// can send, what iOS allows in the phone's own words, iOS asked nothing for
/// any other Mac, and the version from the app's own bundle; and since Phase
/// 345 (build/p345/SPEC.md D15, D21) the Mac on screen's card, its name drawn
/// as the Macs tab draws it, and Pair another Mac above Unpair. Each test
/// names the clause it holds, and each fails when that clause is taken out of
/// Screens/SettingsScreen.swift, Screens/DoorWords.swift or App/TortieApp.swift.
final class SettingsTests: XCTestCase {
    private var v: DoorVectorFile!

    override func setUpWithError() throws {
        v = try DoorVectorFile.load()
    }

    override func tearDown() {
        #if os(iOS)
        TestIdentity.removeFromKeychain()
        #endif
    }

    /// A pairing as Door/ keeps it, from the vectors' code and certificate.
    private func pairedDoor(sends: Bool) throws -> PairedDoor {
        let offer = try PairingOffer.parse(try XCTUnwrap(v.qr.first).payload)
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        let keys = MemoryClientKeys(spki: v.keys.clientKey)
        let key = try keys.mint()
        return try XCTUnwrap(PairedDoor(
            endpoint: offer.door, macSigningKey: offer.macSigningKey, macExchangeKey: offer.macExchangeKey,
            label: "p3166-phone-label", pairedAt: 1_759_190_400_000, keys: PhoneKeys.generate(), clientKey: key,
            certificate: certificate, identity: try keys.adopt(certificate, for: key),
            alerts: AlertsKept(macSends: sends, presented: nil)
        ))
    }

    /// Clause: the facts are the six public fields and nothing else: the
    /// name is the public name's first label, the public name whole (Phase
    /// 345, which keys a Mac among several), the address the whole public
    /// name and its port, the fingerprint the six groups both screens showed;
    /// no key, pin, label, certificate or phone id is carried or repeated.
    func testTheFactsAreThePublicFieldsAlone() throws {
        let door = try pairedDoor(sends: true)
        let facts = PairedFacts(door)
        let host = door.endpoint.name
        let first = try XCTUnwrap(host.split(separator: ".").first.map(String.init))
        XCTAssertEqual(facts.name, first)
        XCTAssertNotEqual(facts.name, host, "the name is the whole public name")
        XCTAssertEqual(facts.publicName, host, "the public name is not the whole name the phone dials")
        XCTAssertEqual(facts.address, host + ":" + String(door.endpoint.port))
        XCTAssertEqual(facts.fingerprint, door.fingerprint)
        XCTAssertEqual(facts.pairedAt, door.pairedAt)
        XCTAssertTrue(facts.macSends)
        XCTAssertFalse(PairedFacts(try pairedDoor(sends: false)).macSends)
        XCTAssertEqual(Mirror(reflecting: facts).children.compactMap(\.label), ["name", "publicName", "address", "fingerprint", "pairedAt", "macSends"])
        let said = everythingSaid(about: facts)
        let notCarried: [(String, String)] = [
            ("the pin", door.endpoint.pin),
            ("the Mac's signing key", door.macSigningKey),
            ("the Mac's exchange key", door.macExchangeKey),
            ("the phone's label", door.label),
            ("the phone id", door.phoneId),
            ("the client key's tag", door.clientKey.tag),
            ("the client key", door.clientKey.spki),
            ("the phone's signing key", door.keys.signingKey),
            ("the phone's exchange key", door.keys.exchangeKey),
            ("the certificate", Base64URL.encode(door.certificate))
        ]
        for (what, value) in notCarried {
            XCTAssertFalse(value.isEmpty, what)
            XCTAssertFalse(said.contains(value), "Settings' facts carry \(what)")
        }
    }

    /// Clause: the Alerts card, and `Pair again to get alerts.` in it, are
    /// drawn only for a pairing whose Mac said it can send, whatever iOS says.
    func testTheAlertsCardIsOnlyForAMacThatSends() {
        let permissions: [PushAuthorization?] = [nil, .authorized, .denied, .notDetermined]
        for permission in permissions {
            let cannot = SettingsDrawing(
                facts: Answers.facts(macSends: false), list: nil, alertsLine: Copy.pairAgainForAlerts,
                permission: permission, settingsLine: nil, info: nil
            )
            XCTAssertNil(cannot.notificationsState, "a Mac that cannot send drew the Alerts card (\(String(describing: permission)))")
            XCTAssertNil(cannot.alertsLine)
            let can = SettingsDrawing(
                facts: Answers.facts(macSends: true), list: nil, alertsLine: Copy.pairAgainForAlerts,
                permission: permission, settingsLine: nil, info: nil
            )
            XCTAssertEqual(can.notificationsState, SettingsDrawing.permissionWord(permission))
            XCTAssertEqual(can.alertsLine, Copy.pairAgainForAlerts)
            let quiet = SettingsDrawing(
                facts: Answers.facts(macSends: true), list: nil, alertsLine: nil,
                permission: permission, settingsLine: nil, info: nil
            )
            XCTAssertNil(quiet.alertsLine)
        }
        let unpaired = SettingsDrawing(facts: nil, list: nil, alertsLine: Copy.pairAgainForAlerts, permission: .authorized, settingsLine: nil, info: nil)
        XCTAssertNil(unpaired.notificationsState)
        XCTAssertNil(unpaired.alertsLine)
        XCTAssertNil(unpaired.pairedDate)
    }

    /// Clause: what iOS allows, in the phone's own words, a dash before it is
    /// read, and never a word saying alerts are on.
    func testWhatIOSAllowsInThePhonesWords() {
        XCTAssertEqual(SettingsDrawing.permissionWord(.authorized), Copy.notificationsAllowed)
        XCTAssertEqual(SettingsDrawing.permissionWord(.denied), Copy.notificationsOff)
        XCTAssertEqual(SettingsDrawing.permissionWord(.notDetermined), Copy.notificationsNotAsked)
        XCTAssertEqual(SettingsDrawing.permissionWord(nil), Copy.dash)
        let words = [PushAuthorization.authorized, .denied, .notDetermined].map { SettingsDrawing.permissionWord($0) }
        XCTAssertEqual(Set(words).count, 3, "two states say the same word")
        for word in words { XCTAssertFalse(word.lowercased() == "on", "the phone says alerts are on") }
    }

    /// Clause: the This Mac group's lines: `read 4:32 PM` only from a LOADED
    /// answer, the day it paired, which the `Paired` row draws on its right
    /// as Version's row draws the version (Phase 348, D12; it was one joined
    /// line, `Paired · <date>`, until then), and the sentence under Unpair
    /// only when the app holds one.
    func testTheMacCardsLines() throws {
        let loaded = ListModel.drawn(Answers.blocked())
        guard case .loaded(let drawing) = loaded else { return XCTFail("\(loaded)") }
        let facts = Answers.facts(pairedAt: 1_759_190_400_000)
        let shown = SettingsDrawing(facts: facts, list: loaded, alertsLine: nil, permission: nil, settingsLine: nil, info: nil, date: { _ in "Sep 30, 2026" })
        XCTAssertEqual(shown.readLine, drawing.readLine)
        XCTAssertEqual(shown.pairedDate, "Sep 30, 2026")
        XCTAssertNil(shown.unpairLine)
        for state in [ListState.loading, .failed(Copy.macDidNotAnswer)] {
            XCTAssertNil(SettingsDrawing(facts: facts, list: state, alertsLine: nil, permission: nil, settingsLine: nil, info: nil).readLine, "\(state)")
        }
        XCTAssertNil(SettingsDrawing(facts: facts, list: nil, alertsLine: nil, permission: nil, settingsLine: nil, info: nil).readLine)
        // The card's name: the facts' own first label, or the drawn name the
        // app hands it (Phase 345, D21); none with no facts.
        XCTAssertEqual(shown.macName, facts.name)
        let named = SettingsDrawing(facts: facts, list: loaded, alertsLine: nil, permission: nil, settingsLine: nil, info: nil, drawnName: Answers.mac)
        XCTAssertEqual(named.macName, Answers.mac)
        XCTAssertNil(SettingsDrawing(facts: nil, list: loaded, alertsLine: nil, permission: nil, settingsLine: nil, info: nil, drawnName: Answers.mac).macName)
        let failed = SettingsDrawing(facts: facts, list: loaded, alertsLine: nil, permission: nil, settingsLine: Copy.unpairFailed, info: nil)
        XCTAssertEqual(failed.unpairLine, Copy.unpairFailed)
        // The day, in the phone's own format: epoch MILLISECONDS, mid-June 2025.
        XCTAssertTrue(PairedClock.date(1_750_000_000_000).contains("2025"), PairedClock.date(1_750_000_000_000))
    }

    /// Clause (rule x's launch-read clause, research 136 section 9): what iOS
    /// allows is read ONLY for a pairing whose Mac said it can send, on
    /// Settings' appear and on every return to the foreground; for any other
    /// Mac, or with no pairing, iOS is asked nothing. Reading it never asks
    /// for the address, which in a Release build would register with Apple.
    @MainActor
    func testThePermissionIsReadOnlyForAMacThatSends() async {
        let cannot = StandInAlerts(authorization: .authorized)
        let other = AppModel(door: StandInPhone(kept: ScriptedReader(alerts: AlertsKept(macSends: false, presented: nil))), label: "iPhone", alerts: cannot)
        await other.readAlertPermission()
        XCTAssertNil(other.alertPermission)
        other.cameToForeground()
        await other.permissionRead?.value
        XCTAssertNil(other.alertPermission)
        XCTAssertEqual(cannot.authorizationAsks + cannot.currentAsks + cannot.pairingAsks, 0, "iOS was asked about a Mac that cannot send")

        for said in [PushAuthorization.authorized, .denied, .notDetermined] {
            let alerts = StandInAlerts(authorization: said)
            let sends = AppModel(door: StandInPhone(kept: ScriptedReader(alerts: AlertsKept(macSends: true, presented: nil))), label: "iPhone", alerts: alerts)
            XCTAssertNil(sends.alertPermission, "read before anything asked")
            await sends.readAlertPermission()
            XCTAssertEqual(sends.alertPermission, said)
            XCTAssertEqual(alerts.authorizationAsks, 1)
            sends.cameToForeground()
            await sends.permissionRead?.value
            XCTAssertEqual(alerts.authorizationAsks, 2, "a return to the foreground did not read what iOS allows")
            XCTAssertEqual(alerts.currentAsks + alerts.pairingAsks, 0, "reading what iOS allows asked for the address")
        }

        let unpaired = StandInAlerts(authorization: .authorized)
        let none = AppModel(door: StandInPhone(), label: "iPhone", alerts: unpaired)
        await none.readAlertPermission()
        XCTAssertNil(none.alertPermission)
        XCTAssertEqual(unpaired.authorizationAsks, 0)
    }

    /// Clause: the version line is the bundle's own version and build, a dash
    /// for either it does not say; and the app this test is hosted in is
    /// 1.0.0, build 12 (Phase 348's phone polished, build/p348/SPEC.md: the
    /// one archive cut from that phase's tree; build 11 was Phase 345's
    /// several Macs, build/p345/SPEC.md D27;
    /// build 10 was Phase 333.3's See a sample, build/p3333/SPEC.md D23, the
    /// public and App Store build; build 9 was Phase 337.3's, set when it was rebased onto Phase 333.1,
    /// and the build submitted to Beta App Review on 2026-10-09; build 8 was
    /// 333.1's, build/p3331/SPEC.md D26; build 7 was Phase 337's, build 6
    /// Phase 318's).
    func testTheVersionLine() {
        XCTAssertEqual(AppVersion.line(["CFBundleShortVersionString": "1.0.0", "CFBundleVersion": "4"]), "1.0.0 (4)")
        XCTAssertEqual(AppVersion.line(["CFBundleShortVersionString": "1.0.0"]), "1.0.0 (" + Copy.dash + ")")
        XCTAssertEqual(AppVersion.line(["CFBundleVersion": "4"]), Copy.dash + " (4)")
        XCTAssertEqual(AppVersion.line(["CFBundleShortVersionString": "", "CFBundleVersion": 4]), Copy.dash + " (" + Copy.dash + ")")
        XCTAssertEqual(AppVersion.line(nil), Copy.dash + " (" + Copy.dash + ")")
        #if os(iOS)
        XCTAssertEqual(AppVersion.line(Bundle.main.infoDictionary), "1.0.0 (12)", "the app these tests are hosted in is not 1.0.0 (12)")
        #endif
    }

    /// Clause (Phase 333.1, D22): About holds the version and then exactly
    /// three rows of Tortie's own site, in this order: Tortie for Mac with
    /// `tortie.sh` on its right, Privacy, Support. Each is a button whose
    /// action is its one named press, each at least 44 tall, and the card
    /// opens nothing itself: the one address Settings hands iOS is still its
    /// notification settings. Read from the source, because SwiftUI draws
    /// nothing in a unit test.
    func testAboutHoldsTheThreePagesOfTheSite() throws {
        let source = try StyleSource.text("ios/Tortie/Screens/SettingsScreen.swift")
        let start = try XCTUnwrap(source.range(of: "private func aboutCard(")).lowerBound
        let end = try XCTUnwrap(source.range(of: "private func siteRow(", range: start..<source.endIndex)).lowerBound
        let card = String(source[start..<end])
        func at(_ needle: String) throws -> String.Index {
            try XCTUnwrap(card.range(of: needle), "About does not draw \(needle)").lowerBound
        }
        let order = [
            "ID.settingsVersion",
            "Button(action: openMacSite)", "Copy.macOnSite", "Copy.siteName", "ID.settingsMacSiteName", "ID.settingsMacSite)",
            "Button(action: openPrivacy)", "Copy.privacy", "ID.settingsPrivacy",
            "Button(action: openSupport)", "Copy.support", "ID.settingsSupport"
        ]
        let places = try order.map(at)
        XCTAssertEqual(places, places.sorted(), "About's rows are not in the order Version, Tortie for Mac, Privacy, Support")
        XCTAssertEqual(card.components(separatedBy: "Button(").count, 4, "About holds a button beside the three pages")
        XCTAssertFalse(card.contains("UIApplication"), "About opens a page itself")
        let row = try XCTUnwrap(source.range(of: "private func siteRow(")).lowerBound
        let rowBody = String(source[row...].prefix(600))
        XCTAssertTrue(rowBody.contains(".frame(minHeight: SettingsFrame.lineHeight)"), "a site row is not 44 tall")
        XCTAssertEqual(source.components(separatedBy: "UIApplication.shared.open(").count, 2, "Settings opens a second address itself")
        // The identifiers the probe reads.
        XCTAssertEqual(ID.settingsMacSite, "settings-mac-site")
        XCTAssertEqual(ID.settingsMacSiteName, "settings-mac-site-name")
        XCTAssertEqual(ID.settingsPrivacy, "settings-privacy")
        XCTAssertEqual(ID.settingsSupport, "settings-support")
    }

    /// Clause (Phase 333.3, D13, D18): which of Settings' own rows are drawn.
    /// A paired phone draws Unpair and See a sample; inside the sample
    /// neither is drawn, because Unpair there would forget a real pairing from
    /// inside a made-up one, and Leave sample is in the bar above every page.
    func testUnpairAndSeeASampleByWhereTheAppIs() {
        let paired = SettingsRows(root: .reading)
        XCTAssertTrue(paired.unpair, "a paired phone draws no Unpair")
        XCTAssertTrue(paired.seeSample, "a paired phone draws no See a sample")
        XCTAssertTrue(paired.pairAnother, "a paired phone draws no Pair another Mac")
        let sample = SettingsRows(root: .sample)
        XCTAssertFalse(sample.unpair, "the sample draws Unpair")
        XCTAssertFalse(sample.seeSample, "the sample draws See a sample")
        XCTAssertFalse(sample.pairAnother, "the sample draws Pair another Mac")
        XCTAssertFalse(SettingsRows(root: .pairing).seeSample)
        XCTAssertFalse(SettingsRows(root: .pairing).pairAnother)
    }

    /// Clause (Phase 333.3, D13, D18; grouped since Phase 348, D12): the body
    /// draws its groups in today's order, Unpair and its line only under
    /// `rows.unpair`, then See a sample only under `rows.seeSample`, directly
    /// under them and above About; See a sample is a group of its own, one
    /// row in Unpair's shape whose press opens the app's sample, identified
    /// `settings-see-sample`; and the facts are nil inside the sample. Read
    /// from the source, because SwiftUI draws nothing in a unit test.
    func testSeeASampleIsUnderUnpairAndTheSampleDrawsNoMac() throws {
        let source = try StyleSource.text("ios/Tortie/Screens/SettingsScreen.swift")
        let start = try XCTUnwrap(source.range(of: "    var body: some View {")).lowerBound
        let end = try XCTUnwrap(source.range(of: "// MARK: The groups, in today's order", range: start..<source.endIndex)).lowerBound
        let body = String(source[start..<end])
        let order = [
            "macGroup(facts, drawing: drawing)", "alertsGroup(state: state, line: drawing.alertsLine)",
            "if rows.pairAnother {", "pairAnotherRow",
            "if rows.unpair {", "unpairGroup(line: drawing.unpairLine)", "if rows.seeSample {", "seeSampleRow", "aboutCard(drawing.version)"
        ]
        let places = try order.map { needle in
            try XCTUnwrap(body.range(of: needle), "Settings' body does not draw \(needle)").lowerBound
        }
        XCTAssertEqual(places, places.sorted(), "Pair another Mac is not between the Mac's groups and Unpair, or See a sample not under Unpair and above About, each under its own row's rule")
        let unpair = try ScreensDrawingTests.body(of: "private func unpairGroup(", in: source)
        for needle in ["footer: line.map { GroupFooter(words: $0, id: ID.settingsUnpairLine) }", "unpairRow"] {
            XCTAssertTrue(unpair.contains(needle), "Unpair's group does not hold \(needle)")
        }
        XCTAssertTrue(source.contains("facts: app.inSample ? nil : app.reader?.facts,"), "Settings in the sample may draw a Mac")
        let drawn = try ScreensDrawingTests.body(of: "private var seeSampleRow: some View {", in: source)
        for needle in ["group {", "Button(action: openSample)", "symbol(SettingsSymbol.seeSample)", "Copy.seeSample", "Chevron()", ".frame(height: Frame.linkRowHeight)", "ID.settingsSeeSample"] {
            XCTAssertTrue(drawn.contains(needle), "See a sample's row does not hold \(needle)")
        }
        let press = try XCTUnwrap(source.range(of: "    func openSample() {")).lowerBound
        XCTAssertTrue(String(source[press...].prefix(80)).contains("app.openSample()"), "See a sample's press does not open the app's sample")
        XCTAssertEqual(ID.settingsSeeSample, "settings-see-sample")
    }

    /// Clause (Phase 345, D15; grouped since Phase 348, D12): Pair another
    /// Mac is a group of its own, one row in See a sample's shape, 54 tall
    /// past its symbol with the chevron of a row that opens something,
    /// identified `settings-pair-another`, whose press opens the app's sheet:
    /// it moves everything under it down by exactly one row and one group's
    /// gap (`Frame.linkRowHeight + SettingsFrame.groupGap`, 78 points, where
    /// it was one row and one card's gap, 66, before the page was grouped).
    /// The card draws the Mac on screen's drawn name. Read from the source,
    /// because SwiftUI draws nothing in a unit test; the press is driven.
    @MainActor
    func testPairAnotherMacIsOneRowThatOpensTheSheet() throws {
        let source = try StyleSource.text("ios/Tortie/Screens/SettingsScreen.swift")
        let drawn = try ScreensDrawingTests.body(of: "private var pairAnotherRow: some View {", in: source)
        for needle in [
            "group {", "Button(action: pairAnother)", "symbol(SettingsSymbol.pairAnother)", "Copy.pairAnotherMac", "Chevron()",
            ".frame(height: Frame.linkRowHeight)", "ID.settingsPairAnother"
        ] {
            XCTAssertTrue(drawn.contains(needle), "Pair another Mac's row does not hold \(needle)")
        }
        XCTAssertEqual(Frame.linkRowHeight + (try Self.length("groupGap", in: source)), 78, "the row no longer moves what is under it by one row and one group's gap")
        XCTAssertTrue(source.contains("Words(drawing.macName ?? facts.name, .lead, Tokens.textPrimary)"), "the card does not draw the Mac's drawn name")
        XCTAssertTrue(source.contains("drawnName: app.chosen.map { app.drawnName($0) }"), "the card is not handed the Mac on screen's drawn name")
        XCTAssertEqual(ID.settingsPairAnother, "settings-pair-another")

        let app = AppModel(door: StandInPhone(kept: ScriptedReader()), label: "iPhone", alerts: StandInAlerts())
        let settings = SettingsScreen(app: app)
        XCTAssertTrue(settings.rows.pairAnother)
        XCTAssertNil(app.anotherPairing)
        settings.pairAnother()
        let sheet = try XCTUnwrap(app.anotherPairing, "Pair another Mac opened no sheet")
        XCTAssertTrue(sheet.keepsOthers)
        XCTAssertEqual(sheet.line, Copy.notPairedHere)
        XCTAssertEqual(settings.drawing.macName, "studio")
    }

    // MARK: - Grouped, like the iPhone's own Settings (Phase 348, D12)

    /// Clause (D12, his words "redesign the settings screen on the phone to
    /// make it look better"): an inset grouped page of the house pieces and
    /// never SwiftUI's own list. Every group is one card drawn by ONE
    /// `group(` piece, with its raised header above the card and its footer
    /// under it in the secondary words; nothing else in the file draws a card,
    /// and no system list, form or section is named.
    func testSettingsIsGroupedFromTheHousePieces() throws {
        let source = try StyleSource.text("ios/Tortie/Screens/SettingsScreen.swift")
        for system in ["List {", "List(", "Form {", "Section(", "Section {", ".listStyle(", "LabeledContent("] {
            XCTAssertFalse(source.contains(system), "Settings names the system's \(system)")
        }
        XCTAssertEqual(source.components(separatedBy: ".card()").count, 2, "a card is drawn outside the one group piece")
        let piece = try ScreensDrawingTests.body(of: "private func group<Rows: View>(", in: source)
        let header = try XCTUnwrap(piece.range(of: "RaisedLabel(header)"), "a group's header is not the raised label").lowerBound
        let card = try XCTUnwrap(piece.range(of: ".card()"), "a group draws no card").lowerBound
        let footer = try XCTUnwrap(piece.range(of: "Words(footer.words, .secondary, Tokens.textSecondary, lines: nil)"), "a group's footer is not the secondary words").lowerBound
        XCTAssertTrue(header < card && card < footer, "a group is not its header, its card, then its footer")
        XCTAssertTrue(piece.contains(".accessibilityIdentifier(footer.id)"), "a footer is not identified")
        // Rows inside a card are parted by a hairline from the text column.
        let line = try ScreensDrawingTests.body(of: "private func rowLine(symbols: Bool)", in: source)
        for needle in ["if symbols {", "symbolSpace", "Hairline()", ".padding(.leading, Frame.cardPadding)"] {
            XCTAssertTrue(line.contains(needle), "the rows' hairline does not hold \(needle)")
        }
        // Every group is drawn by the piece: six, in today's order.
        for head in ["private func macGroup(", "private func alertsGroup(", "private var pairAnotherRow: some View {", "private func unpairGroup(", "private var seeSampleRow: some View {", "private func aboutCard("] {
            let drawn = try ScreensDrawingTests.body(of: head, in: source)
            XCTAssertTrue(drawn.contains("group(") || drawn.contains("group {"), "\(head) is not drawn as a group")
        }
    }

    /// Clause (D12): four symbols, SF Symbols' own, in the secondary text
    /// colour with no tile and hidden from VoiceOver: `desktopcomputer` on
    /// the Mac's name, `bell.badge` on Notifications, `plus.circle` on Pair
    /// another Mac and `eye` on See a sample, each drawn once and no other.
    func testTheFourSymbols() throws {
        let source = try StyleSource.text("ios/Tortie/Screens/SettingsScreen.swift")
        let names = try ScreensDrawingTests.body(of: "private enum SettingsSymbol {", in: source)
        let declared = names.components(separatedBy: "\n").compactMap { line -> String? in
            guard let open = line.range(of: "= \""), let close = line.range(of: "\"", range: open.upperBound..<line.endIndex) else { return nil }
            return String(line[open.upperBound..<close.lowerBound])
        }
        XCTAssertEqual(declared, ["desktopcomputer", "bell.badge", "plus.circle", "eye"])
        for (symbol, place) in [("mac", "private func macGroup("), ("notifications", "private func alertsGroup("), ("pairAnother", "private var pairAnotherRow: some View {"), ("seeSample", "private var seeSampleRow: some View {")] {
            XCTAssertEqual(source.components(separatedBy: "symbol(SettingsSymbol.\(symbol))").count, 2, "\(symbol) is drawn other than once")
            XCTAssertTrue(try ScreensDrawingTests.body(of: place, in: source).contains("symbol(SettingsSymbol.\(symbol))"), "\(symbol) is not drawn by \(place)")
        }
        XCTAssertEqual(source.components(separatedBy: "Image(systemName:").count, 2, "Settings draws a symbol outside its one symbol piece")
        let piece = try ScreensDrawingTests.body(of: "private func symbol(_ name: String)", in: source)
        for needle in ["Image(systemName: name)", ".foregroundStyle(Tokens.textSecondary)", ".frame(width: SettingsFrame.symbolColumn)", ".accessibilityHidden(true)"] {
            XCTAssertTrue(piece.contains(needle), "a symbol is not drawn with \(needle)")
        }
        for tile in [".background(", ".clipShape(", ".fill(", "RoundedRectangle("] {
            XCTAssertFalse(piece.contains(tile), "a symbol is drawn on a tile (\(tile))")
        }
    }

    /// Clause (D12, "no regression against today"): every row that presses is
    /// at least as tall as the parent's, the whole card row pressing: Pair
    /// another Mac, Unpair this iPhone and See a sample 54, Notifications and
    /// About's three site rows at least 44 (build/p348/SPEC.md §2.8).
    func testEveryPressableRowIsAtLeastTodaysHeight() throws {
        let source = try StyleSource.text("ios/Tortie/Screens/SettingsScreen.swift")
        XCTAssertEqual(Frame.linkRowHeight, 54)
        XCTAssertEqual(try Self.length("lineHeight", in: source), 44)
        for head in ["private var pairAnotherRow: some View {", "private var unpairRow: some View {", "private var seeSampleRow: some View {"] {
            let row = try ScreensDrawingTests.body(of: head, in: source)
            XCTAssertTrue(row.contains(".frame(height: Frame.linkRowHeight)"), "\(head) is not 54 tall")
            let frame = try XCTUnwrap(row.range(of: ".frame(height: Frame.linkRowHeight)")).lowerBound
            let shape = try XCTUnwrap(row.range(of: ".contentShape(Rectangle())"), "\(head) presses its words alone").lowerBound
            let pad = try XCTUnwrap(row.range(of: ".padding(.horizontal, Frame.cardPadding)"), "\(head) is not inset in its card").lowerBound
            XCTAssertTrue(pad < frame && frame < shape, "\(head)'s press is not the whole card row")
        }
        for head in ["private func alertsGroup(", "private func siteRow("] {
            let row = try ScreensDrawingTests.body(of: head, in: source)
            XCTAssertTrue(row.contains(".frame(minHeight: SettingsFrame.lineHeight)"), "\(head)'s row is not at least 44 tall")
            XCTAssertTrue(row.contains(".contentShape(Rectangle())"), "\(head)'s row presses its words alone")
        }
        // The Notifications row is still ONE element that contains its state.
        let alerts = try ScreensDrawingTests.body(of: "private func alertsGroup(", in: source)
        let state = try XCTUnwrap(alerts.range(of: ".accessibilityIdentifier(ID.settingsNotificationsState)")).lowerBound
        let contain = try XCTUnwrap(alerts.range(of: ".accessibilityElement(children: .contain)")).lowerBound
        let row = try XCTUnwrap(alerts.range(of: ".accessibilityIdentifier(ID.settingsNotifications)\n")).lowerBound
        XCTAssertTrue(state < contain && contain < row, "the Notifications row no longer contains its state")
    }

    /// Clause (D12): Paired is a labelled row, `Paired` on the left and the
    /// day on the right as Version is, the day identified `settings-paired`;
    /// and the two lines are their groups' footers, `Pair again to get
    /// alerts.` under Alerts and the could-not-forget sentence under Unpair.
    func testPairedIsALabelledRowAndTheLinesAreFooters() throws {
        let source = try StyleSource.text("ios/Tortie/Screens/SettingsScreen.swift")
        XCTAssertFalse(source.contains("Copy.joined([Copy.paired"), "Paired is still one joined line")
        let mac = try ScreensDrawingTests.body(of: "private func macGroup(", in: source)
        let label = try XCTUnwrap(mac.range(of: "Words(Copy.paired, .body, Tokens.textPrimary)"), "the Paired row has no label").lowerBound
        let date = try XCTUnwrap(mac.range(of: "Words(paired, .body, Tokens.textSecondary)"), "the Paired row has no day").lowerBound
        let id = try XCTUnwrap(mac.range(of: ".accessibilityIdentifier(ID.settingsPaired)"), "the day is not identified").lowerBound
        XCTAssertTrue(label < date && date < id, "the Paired row is not its label, then the day, identified")
        XCTAssertTrue(mac.contains("if let paired = drawing.pairedDate {"), "the Paired row is not drawn from the day")
        let alerts = try ScreensDrawingTests.body(of: "private func alertsGroup(", in: source)
        XCTAssertTrue(alerts.contains("footer: line.map { GroupFooter(words: $0, id: ID.settingsAlertsLine) }"), "Pair again to get alerts. is not the Alerts group's footer")
        let unpair = try ScreensDrawingTests.body(of: "private func unpairGroup(", in: source)
        XCTAssertTrue(unpair.contains("footer: line.map { GroupFooter(words: $0, id: ID.settingsUnpairLine) }"), "the could-not-forget line is not the Unpair group's footer")
        // Each container keeps its identifier, so every element read inside
        // it before is read inside it still.
        for (head, id) in [("private func macGroup(", "ID.settingsMac)"), ("private func alertsGroup(", "ID.settingsAlerts)"), ("private func aboutCard(", "ID.settingsAbout)")] {
            XCTAssertTrue(try ScreensDrawingTests.body(of: head, in: source).contains(".accessibilityIdentifier(\(id)"), "\(head) is not identified \(id)")
        }
    }

    /// One `static let <name>: CGFloat = <n>` of `SettingsFrame`, read from
    /// the source, because the enum is private to its file.
    static func length(_ name: String, in source: String) throws -> CGFloat {
        let frame = try ScreensDrawingTests.body(of: "private enum SettingsFrame {", in: source)
        let head = "static let \(name): CGFloat = "
        let at = try XCTUnwrap(frame.range(of: head), "SettingsFrame holds no \(name)").upperBound
        let digits = frame[at...].prefix { $0.isNumber }
        return CGFloat(try XCTUnwrap(Double(String(digits)), "SettingsFrame.\(name) is not a whole number"))
    }
}
