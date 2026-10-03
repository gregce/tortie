import Foundation
import XCTest
@testable import Tortie

/// Settings (Phase 316.6, build/p3166/SPEC.md section 5.3): the paired Mac's
/// PUBLIC facts and nothing else, the Alerts card only for a Mac that said it
/// can send, what iOS allows in the phone's own words, iOS asked nothing for
/// any other Mac, and the version from the app's own bundle. Each test names
/// the clause it holds, and each fails when that clause is taken out of
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

    /// Clause: the facts are the five public fields and nothing else: the
    /// name is the public name's first label, the address the whole public
    /// name and its port, the fingerprint the six groups both screens showed;
    /// no key, pin, label, certificate or phone id is carried or repeated.
    func testTheFactsAreThePublicFieldsAlone() throws {
        let door = try pairedDoor(sends: true)
        let facts = PairedFacts(door)
        let host = door.endpoint.name
        let first = try XCTUnwrap(host.split(separator: ".").first.map(String.init))
        XCTAssertEqual(facts.name, first)
        XCTAssertNotEqual(facts.name, host, "the name is the whole public name")
        XCTAssertEqual(facts.address, host + ":" + String(door.endpoint.port))
        XCTAssertEqual(facts.fingerprint, door.fingerprint)
        XCTAssertEqual(facts.pairedAt, door.pairedAt)
        XCTAssertTrue(facts.macSends)
        XCTAssertFalse(PairedFacts(try pairedDoor(sends: false)).macSends)
        XCTAssertEqual(Mirror(reflecting: facts).children.compactMap(\.label), ["name", "address", "fingerprint", "pairedAt", "macSends"])
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
        XCTAssertNil(unpaired.pairedLine)
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

    /// Clause: the This Mac card's lines: `read 4:32 PM` only from a LOADED
    /// answer, `Paired · <date>` from when it paired, and the sentence under
    /// Unpair only when the app holds one.
    func testTheMacCardsLines() throws {
        let loaded = ListModel.drawn(Answers.blocked())
        guard case .loaded(let drawing) = loaded else { return XCTFail("\(loaded)") }
        let facts = Answers.facts(pairedAt: 1_759_190_400_000)
        let shown = SettingsDrawing(facts: facts, list: loaded, alertsLine: nil, permission: nil, settingsLine: nil, info: nil, date: { _ in "Sep 30, 2026" })
        XCTAssertEqual(shown.readLine, drawing.readLine)
        XCTAssertEqual(shown.pairedLine, Copy.joined([Copy.paired, "Sep 30, 2026"]))
        XCTAssertNil(shown.unpairLine)
        for state in [ListState.loading, .failed(Copy.macDidNotAnswer)] {
            XCTAssertNil(SettingsDrawing(facts: facts, list: state, alertsLine: nil, permission: nil, settingsLine: nil, info: nil).readLine, "\(state)")
        }
        XCTAssertNil(SettingsDrawing(facts: facts, list: nil, alertsLine: nil, permission: nil, settingsLine: nil, info: nil).readLine)
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
    /// 1.0.0, build 5 (Phase 317, build/p317/SPEC.md section 4.3).
    func testTheVersionLine() {
        XCTAssertEqual(AppVersion.line(["CFBundleShortVersionString": "1.0.0", "CFBundleVersion": "4"]), "1.0.0 (4)")
        XCTAssertEqual(AppVersion.line(["CFBundleShortVersionString": "1.0.0"]), "1.0.0 (" + Copy.dash + ")")
        XCTAssertEqual(AppVersion.line(["CFBundleVersion": "4"]), Copy.dash + " (4)")
        XCTAssertEqual(AppVersion.line(["CFBundleShortVersionString": "", "CFBundleVersion": 4]), Copy.dash + " (" + Copy.dash + ")")
        XCTAssertEqual(AppVersion.line(nil), Copy.dash + " (" + Copy.dash + ")")
        #if os(iOS)
        XCTAssertEqual(AppVersion.line(Bundle.main.infoDictionary), "1.0.0 (5)", "the app these tests are hosted in is not 1.0.0 (5)")
        #endif
    }
}
