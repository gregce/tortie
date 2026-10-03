import CryptoKit
import Foundation
import XCTest
@testable import Tortie

/// The alert, on the phone (Phase 316.5, build/p3165/SPEC.md sections 5.6 and
/// 7.3): the tap each of Phase 314's payloads opens, the line that says pair
/// again, the address and its bounds, the presentation that carries it (held
/// to vectors the SHIPPING TypeScript wrote), the record that keeps it and the
/// Mac's word with it, and where a tap takes the app. And research 136 section
/// 9 over the spec: iOS is asked about alerts ONLY when the Mac a phone pairs
/// with says it can send, inside the pairing, after the fingerprint, once; a
/// phone paired with any other Mac is never asked and never told to pair
/// again. Nothing here asks iOS anything: the system half is `probe:p316`'s.
///
/// Each test names the clause it holds and fails when that clause is taken
/// out of ios/Tortie/Alerts/, Door/ or App/.
final class AlertsTests: XCTestCase {
    private var v: DoorVectorFile!

    override func setUpWithError() throws {
        v = try DoorVectorFile.load()
    }

    override func tearDown() {
        #if os(iOS)
        TestIdentity.removeFromKeychain()
        #endif
    }

    /// A payload as iOS hands one over: JSON read by Foundation, so a number
    /// and a boolean arrive as `NSNumber`, the shape `AlertTap.parse` must
    /// tell apart.
    private func userInfo(_ json: String) throws -> [AnyHashable: Any] {
        try XCTUnwrap(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [AnyHashable: Any], json)
    }

    private static let id = "4d8f2c1a-9b7e-4c3d-8a21-5e6f7a8b9c01"
    private static let hex64 = String(repeating: "ab", count: 32)

    private func address(_ token: String, _ environment: PushEnvironment = .development) throws -> PushAddress {
        try XCTUnwrap(PushAddress(token: token, environment: environment), token)
    }

    // MARK: The tap

    /// Clause: Phase 314's three shapes, composed by the SHIPPING
    /// `composeAlert` and `composeBadge`, open what they name: the single
    /// alert its row's session, the count alert and the badge the list.
    func testTheThreeShapesOpenWhatTheyName() throws {
        XCTAssertEqual(v.alerts.map(\.name), ["single", "count", "badge"])
        for alert in v.alerts {
            let want: AlertTap = alert.tap.kind == "session" ? .session(try XCTUnwrap(alert.tap.session)) : .list
            XCTAssertEqual(AlertTap.parse(try userInfo(alert.payload)), want, alert.name)
        }
        XCTAssertEqual(v.alerts.first?.tap.kind, "session", "the single alert's vector names no session, so this proves nothing")
    }

    /// Clause: only `tortie` is read, only version 1, and only a session id of
    /// the door's shape; everything else opens the list and never a guess.
    func testEveryOtherShapeOpensTheList() throws {
        let id = Self.id
        // The positive controls: the shape that opens a session, at both ends of the id's bounds.
        XCTAssertEqual(AlertTap.parse(try userInfo(#"{"tortie":{"v":1,"session":"\#(id)"}}"#)), .session(id))
        let longest = String(repeating: "a", count: 128)
        XCTAssertEqual(AlertTap.parse(try userInfo(#"{"tortie":{"v":1,"session":"\#(longest)"}}"#)), .session(longest))
        XCTAssertEqual(AlertTap.parse(try userInfo(#"{"tortie":{"v":1,"session":"a"}}"#)), .session("a"))
        let hostile = [
            #"{}"#,
            #"{"aps":{"alert":{"title":"x"},"thread-id":"\#(id)"}}"#,
            #"{"tortie":"\#(id)"}"#,
            #"{"tortie":["\#(id)"]}"#,
            #"{"tortie":1}"#,
            #"{"tortie":null}"#,
            #"{"tortie":{"session":"\#(id)"}}"#,
            #"{"tortie":{"v":2,"session":"\#(id)"}}"#,
            #"{"tortie":{"v":0,"session":"\#(id)"}}"#,
            #"{"tortie":{"v":"1","session":"\#(id)"}}"#,
            #"{"tortie":{"v":1.5,"session":"\#(id)"}}"#,
            #"{"tortie":{"v":true,"session":"\#(id)"}}"#,
            #"{"tortie":{"v":null,"session":"\#(id)"}}"#,
            #"{"tortie":{"v":1,"session":42}}"#,
            #"{"tortie":{"v":1,"session":null}}"#,
            #"{"tortie":{"v":1,"session":["\#(id)"]}}"#,
            #"{"tortie":{"v":1,"session":""}}"#,
            #"{"tortie":{"v":1,"session":"\#(String(repeating: "a", count: 129))"}}"#,
            #"{"tortie":{"v":1,"session":"../x"}}"#,
            #"{"tortie":{"v":1,"session":"a b"}}"#,
            #"{"tortie":{"v":1,"session":"%2F"}}"#,
            #"{"tortie":{"v":1,"session":"a/b"}}"#,
            #"{"tortie":{"v":1,"session":"a\u0000b"}}"#,
            #"{"tortie":{"v":1,"session":"café"}}"#,
            #"{"tortie":{"v":1,"session":"١"}}"#,
            #"{"tortie":{"v":1,"session":"a\nb"}}"#,
            #"{"Tortie":{"v":1,"session":"\#(id)"}}"#
        ]
        for json in hostile {
            XCTAssertEqual(AlertTap.parse(try userInfo(json)), .list, json)
        }
        // A dictionary built in Swift, not read from JSON.
        XCTAssertEqual(AlertTap.parse(["tortie": ["v": 1, "session": id] as [String: Any]]), .session(id))
        XCTAssertEqual(AlertTap.parse(["tortie": ["v": true, "session": id] as [String: Any]]), .list)
        XCTAssertEqual(AlertTap.parse([:]), .list)
    }

    // MARK: Pair again to get alerts

    /// Clause: every row of SPEC section 5.6.5's table, for a pairing whose
    /// Mac said it could send; and for one whose Mac could not (research 136
    /// section 9), no row draws the line.
    func testTheLineIsTheTableRowForRow() throws {
        let a = try address(Self.hex64)
        let b = try address(String(repeating: "cd", count: 32))
        let aProduction = try address(Self.hex64, .production)
        let rows: [(PushAddress?, PushAuthorization, PushAddress?, Bool, String)] = [
            (nil, .notDetermined, nil, true, "never asked"),
            (nil, .denied, nil, false, "he said no"),
            (nil, .authorized, nil, false, "registration failed"),
            (nil, .authorized, a, true, "allowed later; the Mac holds no address"),
            (a, .denied, nil, false, "alerts off in iOS Settings; the Mac's token is still his"),
            (a, .notDetermined, nil, true, "permission was reset"),
            (a, .authorized, nil, false, "cannot tell"),
            (a, .authorized, a, false, "the same"),
            (a, .authorized, b, true, "a different token"),
            (a, .authorized, aProduction, true, "a different environment")
        ]
        for (presented, authorization, current, shows, why) in rows {
            let sends = AlertsKept(macSends: true, presented: presented)
            XCTAssertEqual(AlertLine.shows(kept: sends, authorization: authorization, current: current), shows, why)
            // The same row with a Mac that could not send never says it.
            let cannot = AlertsKept(macSends: false, presented: presented)
            XCTAssertFalse(AlertLine.shows(kept: cannot, authorization: authorization, current: current), "a Mac that cannot send: \(why)")
        }
        XCTAssertFalse(AlertLine.shows(kept: .nothing, authorization: .notDetermined, current: nil), "a pairing from before 316.5 is told to pair again")
        // The rows where the current address is never read say the same whatever it is.
        for current in [nil, a, b] {
            XCTAssertTrue(AlertLine.shows(kept: AlertsKept(macSends: true, presented: a), authorization: .notDetermined, current: current))
            XCTAssertFalse(AlertLine.shows(kept: AlertsKept(macSends: true, presented: a), authorization: .denied, current: current))
        }
    }

    // MARK: The address

    /// Clause: the address is the Mac's `PUSH_TOKEN_RE`, folded to lowercase:
    /// hex of 32 to 256 characters, and nothing else.
    func testTheAddressIsTheMacsShape() throws {
        XCTAssertEqual(PushAddress(token: Self.hex64.uppercased(), environment: .production)?.token, Self.hex64)
        XCTAssertEqual(PushAddress(token: Self.hex64, environment: .production)?.environment, .production)
        for length in [32, 33, 64, 256] {
            XCTAssertNotNil(PushAddress(token: String(repeating: "f", count: length), environment: .development), String(length))
        }
        for length in [0, 31, 257, 10_000] {
            XCTAssertNil(PushAddress(token: String(repeating: "f", count: length), environment: .development), String(length))
        }
        for token in [String(repeating: "g", count: 64), "0x" + String(repeating: "a", count: 62), String(repeating: "a", count: 63) + " ",
                      String(repeating: "a", count: 63) + "é", String(repeating: "a", count: 63) + "\u{0}"] {
            XCTAssertNil(PushAddress(token: token, environment: .development), token)
        }
        XCTAssertEqual(PushAddress.hex(Data([0x00, 0xab, 0xff])), "00abff")
        XCTAssertEqual(PushEnvironment(rawValue: "sandbox"), nil)
    }

    /// Clause: an address read back is checked as one made is.
    func testAnAddressDecodedIsCheckedToo() throws {
        let good = try JSONDecoder().decode(PushAddress.self, from: Data(#"{"token":"\#(Self.hex64.uppercased())","environment":"production"}"#.utf8))
        XCTAssertEqual(good, try address(Self.hex64, .production))
        for json in [#"{"token":"zz","environment":"production"}"#, #"{"token":"\#(Self.hex64)","environment":"sandbox"}"#, #"{"token":"\#(Self.hex64)"}"#] {
            XCTAssertThrowsError(try JSONDecoder().decode(PushAddress.self, from: Data(json.utf8)), json)
        }
    }

    /// Clause: the environment is the build's, at compile time: a DEBUG build
    /// is ad hoc and Apple's development environment's, a Release build is
    /// what App Store Connect re-signs as production.
    func testTheEnvironmentIsTheBuilds() {
        #if DEBUG
        XCTAssertEqual(PushEnvironment.current, .development)
        #else
        XCTAssertEqual(PushEnvironment.current, .production)
        #endif
    }

    // MARK: The presentation

    private func phoneKeys() throws -> PhoneKeys {
        try PhoneKeys(
            signingSeed: try XCTUnwrap(Hex.decode(v.keys.phoneSigningSeed)),
            exchangeSeed: try XCTUnwrap(Hex.decode(v.keys.phoneExchangeSeed))
        )
    }

    /// Clause: with an address, the sealed plaintext is the vector's byte for
    /// byte (`ape` and `apt` first, keys sorted), sealed at its nonce it is the
    /// body the SHIPPING opener opened to exactly this token and environment;
    /// with none it is today's plaintext byte for byte.
    func testThePresentationCarriesTheAddressTheDoorOpens() throws {
        let keys = try phoneKeys()
        let environment = try XCTUnwrap(PushEnvironment(rawValue: v.pushSeal.environment))
        let push = try address(v.pushSeal.token, environment)
        let inner = try PresentationSeal.inner(label: v.seal.label, keys: keys, clientKey: v.keys.clientKey, push: push)
        XCTAssertEqual(String(decoding: inner, as: UTF8.self), v.pushSeal.plaintext)
        XCTAssertTrue(v.pushSeal.plaintext.hasPrefix(#"{"ape":"#), "the vector does not lead with the address, so this proves nothing about the order")
        let secret = try XCTUnwrap(Base64URL.decode(v.seal.secret))
        let iv = try XCTUnwrap(Base64URL.decode(v.pushSeal.iv))
        let sealed = try PresentationSeal.seal(inner, secret: secret, nonce: try AES.GCM.Nonce(data: iv))
        XCTAssertEqual(sealed, PresentationSeal.Sealed(iv: v.pushSeal.iv, ct: v.pushSeal.ct, tag: v.pushSeal.tag))
        XCTAssertEqual(v.pushSeal.opened.pushToken, push.token)
        XCTAssertEqual(v.pushSeal.opened.pushEnvironment, push.environment.rawValue)
        let none = try PresentationSeal.inner(label: v.seal.label, keys: keys, clientKey: v.keys.clientKey, push: nil)
        XCTAssertEqual(none, Data(v.seal.fromPhone.plaintext.utf8), "a phone with no address no longer presents today's bytes")
    }

    /// Clause: the Mac's `pending` answer says whether it can send
    /// (`"alerts": true`); absent or `null` is a Mac that cannot, a value that
    /// is not a boolean refuses the answer, and the word says nothing on
    /// `refused` or `allowed`.
    func testTheMacSaysWhetherItCanSend() {
        let decode = { (body: String) in try? JSONDecoder().decode(PairAnswer.self, from: Data(body.utf8)) }
        XCTAssertEqual(decode(#"{"state":"pending","alerts":true}"#), .pending(macSends: true))
        XCTAssertEqual(decode(#"{"state":"pending","alerts":false}"#), .pending(macSends: false))
        XCTAssertEqual(decode(#"{"state":"pending","alerts":null}"#), .pending(macSends: false))
        XCTAssertEqual(decode(#"{"state":"pending"}"#), .pending(macSends: false))
        XCTAssertEqual(decode(#"{"state":"refused","alerts":true}"#), .refused)
        XCTAssertEqual(decode(#"{"state":"allowed","cert":"AQID","alerts":true}"#), .allowed(certificate: Data([1, 2, 3])))
        for body in [#"{"state":"pending","alerts":1}"#, #"{"state":"pending","alerts":"true"}"#, #"{"state":"pending","alerts":{}}"#] {
            XCTAssertNil(decode(body), body)
        }
    }

    /// One pairing through the SHIPPING flow against a door that answers what
    /// the test names, with `ask` as iOS's question.
    private struct FlowRun {
        let outcome: PairingOutcome
        let door: StandInDoor
        let asks: Int
        /// How many presentations had been sent at each pause, in order.
        let pausedAfter: [Int]
        let kept: PairedDoor?
        let offer: PairingOffer
    }

    private func flow(_ presents: [Result<PairAnswer, DoorFailure>], ask: PushAddress?) async throws -> FlowRun {
        let offer = try PairingOffer.parse(try XCTUnwrap(v.qr.first { $0.name == "funnel-8443" }).payload)
        let first = try JSONDecoder().decode(PocketBlockedAnswer.self, from: Data(try XCTUnwrap(v.answers["blocked"]).json.utf8))
        let door = StandInDoor(presents: presents, reads: [.success(first)])
        let clock = StepClock(Date(timeIntervalSince1970: (offer.expiresAt - 180_000) / 1000))
        let secrets = MemorySecrets()
        let keys = MemoryClientKeys(spki: v.keys.clientKey)
        let pauses = Counter()
        let flow = PairingFlow(
            exchange: door, store: PairingStore(secrets: secrets, clientKeys: keys), now: { clock.now },
            pause: { duration in
                pauses.note(door.presented.count)
                clock.advance(duration)
            }
        )
        let asks = Counter()
        let pending = try flow.begin(offer, label: "x")
        let outcome = await flow.run(pending, askForAlerts: {
            asks.note(door.presented.count)
            return ask
        })
        return FlowRun(
            outcome: outcome, door: door, asks: asks.all.count, pausedAfter: pauses.all,
            kept: PairingStore(secrets: secrets, clientKeys: keys).load(), offer: offer
        )
    }

    /// The alert fields of each presentation a door was sent, opened.
    private func presentedAddresses(_ run: FlowRun) throws -> [PushAddress?] {
        try run.door.presented.map { body in
            let fields = try XCTUnwrap(JSONSerialization.jsonObject(with: try PresentationSeal.open(body, secret: run.offer.secret)) as? [String: String])
            switch (fields["apt"], fields["ape"]) {
            case (nil, nil):
                XCTAssertEqual(Set(fields.keys), ["ck", "ek", "label", "xk"])
                return nil
            case let (token?, word?):
                XCTAssertEqual(Set(fields.keys), ["ape", "apt", "ck", "ek", "label", "xk"])
                return try address(token, try XCTUnwrap(PushEnvironment(rawValue: word)))
            default:
                XCTFail("half an address: \(fields.keys.sorted())")
                return nil
            }
        }
    }

    /// Clause (research 136 section 9): a Mac that never says it can send is
    /// never asked about, and every presentation carries no address.
    func testAMacThatCannotSendIsNeverAskedAbout() async throws {
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        let run = try await flow([.success(.pending(macSends: false)), .success(.pending(macSends: false)), .success(.allowed(certificate: certificate))], ask: try address(Self.hex64))
        guard case .paired = run.outcome else { return XCTFail("\(run.outcome)") }
        XCTAssertEqual(run.asks, 0, "iOS was asked for alerts a Mac that cannot send them")
        XCTAssertEqual(try presentedAddresses(run), [nil, nil, nil])
        XCTAssertEqual(run.kept?.alerts, .nothing)
    }

    /// Clause: a Mac that says it can send is asked about ONCE, on its first
    /// such `pending`, after the first presentation; the address is presented
    /// AT ONCE (no pause between) and in every presentation after; and the
    /// pairing keeps the address of the presentation the Mac last answered
    /// `pending` to, with the Mac's word.
    func testAMacThatCanSendIsAskedOnceAndHoldsTheAddress() async throws {
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        let push = try address(Self.hex64, .production)
        let run = try await flow(
            [.success(.pending(macSends: true)), .success(.pending(macSends: true)), .success(.pending(macSends: true)), .success(.allowed(certificate: certificate))],
            ask: push
        )
        guard case let .paired(paired, _) = run.outcome else { return XCTFail("\(run.outcome)") }
        XCTAssertEqual(run.asks, 1)
        XCTAssertEqual(try presentedAddresses(run), [nil, push, push, push])
        XCTAssertFalse(run.pausedAfter.contains(1), "the address waited a pause before it was presented: \(run.pausedAfter)")
        XCTAssertEqual(paired.alerts, AlertsKept(macSends: true, presented: push))
        XCTAssertEqual(run.kept?.alerts, AlertsKept(macSends: true, presented: push))
    }

    /// Clause: a denial (no address) still pairs, presents no address, and
    /// keeps the Mac's word, so the list can say pair again if he later
    /// allows alerts in iOS Settings.
    func testADenialPairsWithTheMacsWordAndNoAddress() async throws {
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        let run = try await flow([.success(.pending(macSends: true)), .success(.pending(macSends: true)), .success(.allowed(certificate: certificate))], ask: nil)
        guard case .paired = run.outcome else { return XCTFail("\(run.outcome)") }
        XCTAssertEqual(run.asks, 1)
        XCTAssertEqual(try presentedAddresses(run), [nil, nil, nil])
        XCTAssertEqual(run.kept?.alerts, AlertsKept(macSends: true, presented: nil))
    }

    /// Clause: an Allow that came before the Mac held the address keeps NO
    /// address, because `allowed` does not open the presentation it answers:
    /// the Mac holds what it last answered `pending` to.
    func testAnAllowBeforeTheAddressKeepsNone() async throws {
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        let run = try await flow([.success(.pending(macSends: true)), .success(.allowed(certificate: certificate))], ask: try address(Self.hex64))
        guard case .paired = run.outcome else { return XCTFail("\(run.outcome)") }
        XCTAssertEqual(try presentedAddresses(run), [nil, try address(Self.hex64)])
        XCTAssertEqual(run.kept?.alerts, AlertsKept(macSends: true, presented: nil))
    }

    /// Clause: the Mac's word is read on every `pending`, so a Mac whose
    /// switch is turned on while the phone waits is asked about then, and the
    /// word kept is the last one the Mac gave.
    func testTheMacsWordIsItsLast() async throws {
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        let push = try address(Self.hex64)
        let later = try await flow([.success(.pending(macSends: false)), .success(.pending(macSends: true)), .success(.pending(macSends: true)), .success(.allowed(certificate: certificate))], ask: push)
        XCTAssertEqual(later.asks, 1)
        XCTAssertEqual(try presentedAddresses(later), [nil, nil, push, push])
        XCTAssertEqual(later.kept?.alerts, AlertsKept(macSends: true, presented: push))
        let off = try await flow([.success(.pending(macSends: true)), .success(.pending(macSends: false)), .success(.allowed(certificate: certificate))], ask: push)
        XCTAssertEqual(off.asks, 1)
        XCTAssertEqual(off.kept?.alerts, AlertsKept(macSends: false, presented: push))
    }

    // MARK: The record

    private func pairedDoor(_ keys: MemoryClientKeys, alerts: AlertsKept) throws -> PairedDoor {
        let offer = try PairingOffer.parse(try XCTUnwrap(v.qr.first).payload)
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        let key = try keys.mint()
        return try XCTUnwrap(PairedDoor(
            endpoint: offer.door, macSigningKey: offer.macSigningKey, macExchangeKey: offer.macExchangeKey,
            label: "x", pairedAt: 1, keys: PhoneKeys.generate(), clientKey: key, certificate: certificate,
            identity: try keys.adopt(certificate, for: key), alerts: alerts
        ))
    }

    /// Clause: the Keychain record keeps the presented address both halves or
    /// neither and the Mac's word only when it said it could send; a record
    /// with neither (1.0.0 (2)'s) reads as a pairing that agreed nothing; and
    /// half an address, a word that is not an environment, a token this app
    /// never writes, or a word about sending that is not a boolean, removes
    /// the record whole, keys and all.
    func testTheRecordKeepsWhatWasAgreedWholeOrNotAtAll() throws {
        let push = try address(Self.hex64, .production)
        let agreements = [
            AlertsKept(macSends: true, presented: push), AlertsKept(macSends: true, presented: nil),
            AlertsKept(macSends: false, presented: push), AlertsKept.nothing
        ]
        for kept in agreements {
            let secrets = MemorySecrets()
            let keys = MemoryClientKeys(spki: v.keys.clientKey)
            let store = PairingStore(secrets: secrets, clientKeys: keys)
            try store.save(try pairedDoor(keys, alerts: kept))
            let record = try XCTUnwrap(JSONSerialization.jsonObject(with: try XCTUnwrap(secrets.item(PairingStore.account))) as? [String: Any])
            XCTAssertEqual(record["v"] as? Int, 2, "the record is still pairing-v2's shape")
            XCTAssertEqual(record["apt"] as? String, kept.presented?.token)
            XCTAssertEqual(record["ape"] as? String, kept.presented?.environment.rawValue)
            XCTAssertEqual(record.keys.contains("apt"), kept.presented != nil, "a record with no address writes no key for one")
            XCTAssertEqual(record["sends"] as? Bool, kept.macSends ? true : nil)
            XCTAssertEqual(record.keys.contains("sends"), kept.macSends, "a Mac that could not send is written down")
            XCTAssertEqual(store.load()?.alerts, kept)
        }
        // An explicit `false` is a Mac that could not send, and reads back.
        do {
            let secrets = MemorySecrets()
            let keys = MemoryClientKeys(spki: v.keys.clientKey)
            let store = PairingStore(secrets: secrets, clientKeys: keys)
            try store.save(try pairedDoor(keys, alerts: AlertsKept(macSends: true, presented: push)))
            var record = try XCTUnwrap(JSONSerialization.jsonObject(with: try XCTUnwrap(secrets.item(PairingStore.account))) as? [String: Any])
            record["sends"] = false
            try secrets.write(try JSONSerialization.data(withJSONObject: record), account: PairingStore.account)
            XCTAssertEqual(store.load()?.alerts, AlertsKept(macSends: false, presented: push))
        }
        let edits: [(String, (inout [String: Any]) -> Void)] = [
            ("the token alone", { $0["ape"] = nil }),
            ("the environment alone", { $0["apt"] = nil }),
            ("an environment that is not a word", { $0["ape"] = "sandbox" }),
            ("a token that is not hex", { $0["apt"] = String(repeating: "z", count: 64) }),
            ("a token too short", { $0["apt"] = "abcd" }),
            ("a token in upper case, which this app never writes", { $0["apt"] = Self.hex64.uppercased() }),
            ("a token that is a number", { $0["apt"] = 7 }),
            ("a word about sending that is a string", { $0["sends"] = "yes" })
        ]
        for (what, edit) in edits {
            let secrets = MemorySecrets()
            let keys = MemoryClientKeys(spki: v.keys.clientKey)
            let store = PairingStore(secrets: secrets, clientKeys: keys)
            try store.save(try pairedDoor(keys, alerts: AlertsKept(macSends: true, presented: push)))
            XCTAssertNotNil(store.load(), "the record did not read back before it was edited (\(what))")
            var record = try XCTUnwrap(JSONSerialization.jsonObject(with: try XCTUnwrap(secrets.item(PairingStore.account))) as? [String: Any])
            edit(&record)
            try secrets.write(try JSONSerialization.data(withJSONObject: record), account: PairingStore.account)
            XCTAssertNil(store.load(), what)
            XCTAssertTrue(secrets.isEmpty, "the record was left behind (\(what))")
            XCTAssertEqual(keys.held, [], "the record's client key was left behind (\(what))")
        }
    }

    // MARK: Pairing asks, in order

    /// Clause: the screen hands the pairing iOS's question and nothing asks it
    /// before the pairing does: with a Mac that can send it is asked inside
    /// the pairing, AFTER the fingerprint is drawn, once.
    @MainActor
    func testTheQuestionIsAskedInsideThePairingAfterTheFingerprint() async throws {
        let events = Events()
        let phone = StandInPhone(outcomes: [.failed(.codeExpired)])
        phone.events = events
        phone.macSends = true
        let push = try address(Self.hex64)
        let alerts = StandInAlerts(authorization: .authorized, atPairing: push)
        alerts.events = events
        let model = PairingModel(door: phone, label: "iPhone", alerts: alerts) { _, _ in }
        let seen = Seen<String>()
        alerts.duringAsk = {
            let drawn = await MainActor.run { model.fingerprint }
            await seen.set(drawn)
        }
        await model.read("code")
        XCTAssertEqual(events.all, ["pair", "ask"])
        let drawnWhileAsked = await seen.value
        XCTAssertEqual(drawnWhileAsked, "aaaa bbbb cccc dddd eeee ffff", "the fingerprint was not drawn when iOS was asked")
        XCTAssertEqual(phone.answered, [push])
        XCTAssertEqual(alerts.pairingAsks, 1)
    }

    /// Clause (research 136 section 9): pairing with a Mac that cannot send
    /// asks iOS nothing, and pairs.
    @MainActor
    func testAMacThatCannotSendMeansNoQuestion() async throws {
        let first = Answers.blocked(others: [Answers.row("o")])
        let phone = StandInPhone(outcomes: [.paired(ScriptedReader(), first)])
        let alerts = StandInAlerts(authorization: .notDetermined, atPairing: try address(Self.hex64))
        var seen: [PocketBlockedAnswer] = []
        let model = PairingModel(door: phone, label: "iPhone", alerts: alerts) { _, answer in seen.append(answer) }
        await model.read("code")
        XCTAssertEqual(alerts.pairingAsks, 0)
        XCTAssertEqual(alerts.authorizationAsks, 0)
        XCTAssertEqual(phone.pairs, 1)
        XCTAssertEqual(seen, [first])
    }

    /// Clause: a denial, or no address to be had, still pairs: the pairing
    /// asked, got nothing, and the app is handed its reader.
    @MainActor
    func testADenialStillPairs() async throws {
        let first = Answers.blocked(others: [Answers.row("o")])
        let phone = StandInPhone(outcomes: [.paired(ScriptedReader(), first)])
        phone.macSends = true
        let alerts = StandInAlerts(authorization: .denied, atPairing: nil)
        var seen: [PocketBlockedAnswer] = []
        let model = PairingModel(door: phone, label: "iPhone", alerts: alerts) { _, answer in seen.append(answer) }
        await model.read("code")
        XCTAssertEqual(alerts.pairingAsks, 1)
        XCTAssertEqual(phone.pairs, 1)
        XCTAssertEqual(phone.answered, [nil])
        XCTAssertEqual(seen, [first])
    }

    /// Clause: text that is not a code asks iOS nothing.
    @MainActor
    func testNotACodeAsksNothing() async {
        let alerts = StandInAlerts(authorization: .notDetermined)
        let model = PairingModel(door: StandInPhone(beginFailure: .badCode), label: "iPhone", alerts: alerts) { _, _ in }
        await model.read("hello")
        XCTAssertEqual(alerts.pairingAsks, 0)
    }

    // MARK: Where a tap takes the app

    /// Clause: a tap on a single alert selects Needs input and opens that
    /// session there, replacing whatever was pushed on that tab; a tap on
    /// anything else opens its list (Phase 316.6: the Sessions tab keeps its
    /// place).
    @MainActor
    func testATapOpensWhatItNames() {
        let app = AppModel(door: StandInPhone(kept: ScriptedReader()), label: "iPhone", alerts: StandInAlerts())
        app.waitingPath = [.session(id: "o", name: "o"), .conversation(id: "o", honestLine: nil)]
        app.sessionsPath = [.session(id: "k", name: "k")]
        app.tab = .settings
        app.openFromAlert(.session("s"))
        XCTAssertEqual(app.tab, .needsInput)
        XCTAssertEqual(app.waitingPath, [.alerted(id: "s")])
        XCTAssertTrue(app.isTop(.alerted(id: "s"), in: .needsInput))
        XCTAssertEqual(app.sessionsPath, [.session(id: "k", name: "k")], "the tap moved the Sessions tab")
        app.tab = .sessions
        app.openFromAlert(.list)
        XCTAssertEqual(app.tab, .needsInput)
        XCTAssertEqual(app.waitingPath, [])
        XCTAssertEqual(app.sessionsPath, [.session(id: "k", name: "k")])
        XCTAssertEqual(app.root, .reading)
    }

    /// Clause: with no pairing kept, a tap leaves Pairing as it is; with one
    /// kept after a refusal, the app reads it first (cameToForeground's rule).
    @MainActor
    func testATapWithNoPairingKeptLeavesPairing() {
        let phone = StandInPhone()
        let app = AppModel(door: phone, label: "iPhone", alerts: StandInAlerts())
        app.openFromAlert(.session("s"))
        XCTAssertEqual(app.root, .pairing)
        XCTAssertEqual(app.waitingPath, [])
        XCTAssertNil(app.list)
        phone.keep(ScriptedReader())
        app.openFromAlert(.session("s"))
        XCTAssertEqual(app.root, .reading)
        XCTAssertEqual(app.waitingPath, [.alerted(id: "s")])
    }

    /// Clause (SPEC section 5.6.4): the session an alert named is refused (a
    /// 404), the app goes back to the list, and the Mac's own sentence is said
    /// ONLY once the list's read answers 200; it goes when a row is opened.
    /// The list's read is the one the refusal asks for itself (the 316.5 fix
    /// round), not one left to the list appearing again.
    @MainActor
    func testAGoneSessionSaysTheMacsSentenceOnceTheListAnswers() async throws {
        let reader = ScriptedReader(blocked: [.success(Answers.blocked(others: [Answers.row("o")]))], session: [.failure(.refused)])
        let app = AppModel(door: StandInPhone(kept: reader), label: "iPhone", alerts: StandInAlerts())
        app.openFromAlert(.session("gone"))
        let session = SessionModel(sessionId: "gone", door: reader, routing: app.alertedRouting)
        await session.load()
        XCTAssertEqual(app.waitingPath, [])
        let list = try XCTUnwrap(app.list)
        XCTAssertNil(list.notice, "the sentence was said before the list's read answered")
        let read = try XCTUnwrap(app.noticeRead, "the refusal asked the list for no read of its own")
        await read.value
        XCTAssertEqual(list.notice, Copy.noSuchSession)
        let blockedReads = await reader.blockedCalls
        XCTAssertEqual(blockedReads, 1)
        guard case .loaded(let drawing) = list.state else { return XCTFail("\(list.state)") }
        app.open(try XCTUnwrap(drawing.others.first), in: .sessions)
        XCTAssertNil(list.notice, "opening a row keeps the sentence")
    }

    /// Clause: a list the door refuses too is a phone it no longer knows: the
    /// app goes to Pairing and the sentence is never said.
    @MainActor
    func testAGoneSessionOnAPhoneTheMacForgotGoesToPairing() async throws {
        let reader = ScriptedReader(blocked: [.failure(.refused)], session: [.failure(.refused)])
        let app = AppModel(door: StandInPhone(kept: reader), label: "iPhone", alerts: StandInAlerts())
        app.openFromAlert(.session("gone"))
        await SessionModel(sessionId: "gone", door: reader, routing: app.alertedRouting).load()
        let list = try XCTUnwrap(app.list)
        await app.noticeRead?.value
        XCTAssertEqual(app.root, .pairing)
        XCTAssertNil(app.list)
        XCTAssertNil(list.notice)
    }

    /// Clause: a session opened from the list and refused says nothing: the
    /// sentence is the alerted route's alone.
    @MainActor
    func testARefusalFromTheListSaysNothing() async throws {
        let reader = ScriptedReader(blocked: [.success(Answers.blocked(others: [Answers.row("o")]))], session: [.failure(.refused)])
        let app = AppModel(door: StandInPhone(kept: reader), label: "iPhone", alerts: StandInAlerts())
        app.tab = .sessions
        app.sessionsPath = [.session(id: "o", name: "o")]
        await SessionModel(sessionId: "o", door: reader, routing: app.routing(.sessions)).load()
        let list = try XCTUnwrap(app.list)
        await list.load()
        XCTAssertEqual(app.sessionsPath, [])
        XCTAssertNil(list.notice)
    }

    /// Clause: the sentence goes when he leaves the app and when another
    /// alert opens, and NOT on the return itself (the 316.5 fix round).
    @MainActor
    func testTheSentenceGoesWhenHeLeavesAndOnTheNextAlert() async throws {
        for leave in ["away", "alert"] {
            let reader = ScriptedReader(blocked: [.success(Answers.blocked())], session: [.failure(.refused)])
            let app = AppModel(door: StandInPhone(kept: reader), label: "iPhone", alerts: StandInAlerts())
            app.openFromAlert(.session("gone"))
            await SessionModel(sessionId: "gone", door: reader, routing: app.alertedRouting).load()
            let list = try XCTUnwrap(app.list)
            await app.noticeRead?.value
            XCTAssertEqual(list.notice, Copy.noSuchSession, leave)
            if leave == "away" { app.wentAway() } else { app.openFromAlert(.list) }
            XCTAssertNil(list.notice, leave)
        }
    }

    /// Clause (the 316.5 fix round, the verifier's VX5R): the tap that says
    /// the sentence is what brings the app back, and iOS hands the tap over
    /// BEFORE the scene is active, so the return that follows the tap keeps
    /// the sentence, whichever of the tap's reads and the return comes first,
    /// and whether the tap came from the list or from another session's
    /// screen. Before the fix, the return cleared it: five taps of five on
    /// iOS 26.3 drew the list with no sentence.
    @MainActor
    func testTheReturnATapBringsKeepsTheSentence() async throws {
        for (from, readFirst) in [("list", true), ("list", false), ("session", true), ("session", false)] {
            let why = "from the \(from), \(readFirst ? "read then return" : "return then read")"
            let reader = ScriptedReader(
                blocked: [.success(Answers.blocked(others: [Answers.row("o")])), .success(Answers.blocked(others: [Answers.row("o")]))],
                session: [.failure(.refused)]
            )
            let app = AppModel(door: StandInPhone(kept: reader), label: "iPhone", alerts: StandInAlerts())
            if from == "session" { app.waitingPath = [.session(id: "o", name: "o")] }
            // He left the app, and the alert's tap brings it back.
            app.wentAway()
            app.openFromAlert(.session("gone"))
            XCTAssertEqual(app.waitingPath, [.alerted(id: "gone")], why)
            await SessionModel(sessionId: "gone", door: reader, routing: app.alertedRouting).load()
            let list = try XCTUnwrap(app.list)
            if readFirst {
                await app.noticeRead?.value
                app.cameToForeground()
                // The return reads the list again, as the screen on top does.
                await list.load()
            } else {
                app.cameToForeground()
                await app.noticeRead?.value
            }
            XCTAssertEqual(app.waitingPath, [], why)
            XCTAssertEqual(list.notice, Copy.noSuchSession, why)
        }
    }

    /// Clause (the 316.5 fix round): an Allow pressed on the Mac while iOS was
    /// still asking pairs with no address; the list says `Pair again to get
    /// alerts.` as the pairing ends, not at the next launch. A pairing whose
    /// Mac holds the phone's own address says nothing.
    @MainActor
    func testAPairingThatHeldNoAddressSaysSoAtOnce() async throws {
        let a = try address(Self.hex64)
        for (presented, shows) in [(nil as PushAddress?, true), (a, false)] {
            let first = Answers.blocked(others: [Answers.row("o")])
            let kept = AlertsKept(macSends: true, presented: presented)
            let alerts = StandInAlerts(authorization: .authorized, current: a)
            let app = AppModel(door: StandInPhone(outcomes: [.paired(ScriptedReader(alerts: kept), first)]), label: "iPhone", alerts: alerts)
            await app.pairing.read("code")
            XCTAssertEqual(app.root, .reading)
            let check = try XCTUnwrap(app.addressCheck, "the pairing started no check")
            await check.value
            XCTAssertEqual(app.list?.alertsLine, shows ? Copy.pairAgainForAlerts : nil, String(describing: presented?.token.prefix(2)))
        }
    }

    /// Clause: the launch check draws `Pair again to get alerts.` exactly when
    /// SPEC section 5.6.5 says, for a pairing whose Mac said it could send,
    /// and asks for the phone's address only when alerts are allowed (a
    /// Release build registers with Apple there); for a pairing whose Mac
    /// could not (research 136 section 9) it asks iOS NOTHING and draws nothing.
    @MainActor
    func testTheLaunchCheckDrawsTheLine() async throws {
        let a = try address(Self.hex64)
        let b = try address(String(repeating: "cd", count: 32))
        let cases: [(PushAddress?, PushAuthorization, PushAddress?, Bool)] = [
            (nil, .notDetermined, nil, true),
            (nil, .denied, a, false),
            (nil, .authorized, nil, false),
            (nil, .authorized, a, true),
            (a, .denied, b, false),
            (a, .notDetermined, a, true),
            (a, .authorized, nil, false),
            (a, .authorized, a, false),
            (a, .authorized, b, true)
        ]
        for (presented, authorization, current, shows) in cases {
            let why = "\(String(describing: presented?.token.prefix(2))) \(authorization) \(String(describing: current?.token.prefix(2)))"
            let alerts = StandInAlerts(authorization: authorization, current: current)
            let kept = AlertsKept(macSends: true, presented: presented)
            let app = AppModel(door: StandInPhone(kept: ScriptedReader(alerts: kept)), label: "iPhone", alerts: alerts)
            await app.checkAlertAddress()
            XCTAssertEqual(app.list?.alertsLine, shows ? Copy.pairAgainForAlerts : nil, why)
            XCTAssertEqual(alerts.currentAsks, authorization == .authorized ? 1 : 0, why)
            // The same pairing with a Mac that could not send.
            let cannot = StandInAlerts(authorization: authorization, current: current)
            let other = AppModel(
                door: StandInPhone(kept: ScriptedReader(alerts: AlertsKept(macSends: false, presented: presented))),
                label: "iPhone", alerts: cannot
            )
            await other.checkAlertAddress()
            XCTAssertNil(other.list?.alertsLine, "a Mac that cannot send: \(why)")
            XCTAssertEqual(cannot.authorizationAsks + cannot.currentAsks + cannot.pairingAsks, 0, "iOS was asked about a Mac that cannot send: \(why)")
        }
        let unpaired = StandInAlerts(authorization: .notDetermined)
        let app = AppModel(door: StandInPhone(), label: "iPhone", alerts: unpaired)
        await app.checkAlertAddress()
        XCTAssertNil(app.list)
        XCTAssertEqual(unpaired.currentAsks, 0)
    }

    /// Clause: the inbox hands a tap over once.
    @MainActor
    func testTheInboxHandsATapOverOnce() {
        let inbox = AlertInbox()
        XCTAssertNil(inbox.take())
        inbox.post(.session("s"))
        XCTAssertEqual(inbox.pending, .session("s"))
        XCTAssertEqual(inbox.take(), .session("s"))
        XCTAssertNil(inbox.take())
        XCTAssertNil(inbox.pending)
    }

    #if DEBUG
    // MARK: The DEBUG seams

    /// Clause (conformance:ios rule d): the address seam reads its launch
    /// argument, and nothing without one.
    func testTheTokenSeamReadsTheLaunchArgument() {
        XCTAssertEqual(AlertsDebugSeam.token(["app", "-TortieDebugPushToken", "ab"]), "ab")
        XCTAssertNil(AlertsDebugSeam.token(["app", "-TortieDebugPushToken"]))
        XCTAssertNil(AlertsDebugSeam.token(["app"]))
    }

    /// Clause: a launch by the system (no argument at all, a tap that
    /// cold-launches the app) reads the endpoint, still and token seams the
    /// last launch with arguments was handed, and NEVER a pairing code or a
    /// forget; a launch with arguments reads its own.
    func testASystemLaunchCarriesOnlyThreeSeams() throws {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("p3165-" + UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: dir) }
        let file = dir.appendingPathComponent(DebugLaunchSeam.fileName)
        let launched = [
            "app", "-TortieDebugForgetPairing", "-TortieDebugPairingPayload", "{}", "-TortieDebugStill",
            "-TortieDebugDoorEndpoint", "127.0.0.1:9", "-TortieDebugPushToken", "ab"
        ]
        XCTAssertEqual(DebugLaunchSeam.resolve(launched, file: file), launched)
        let bare = DebugLaunchSeam.resolve(["app"], file: file)
        XCTAssertEqual(bare, ["app", "-TortieDebugDoorEndpoint", "127.0.0.1:9", "-TortieDebugStill", "-TortieDebugPushToken", "ab"])
        XCTAssertFalse(bare.contains("-TortieDebugForgetPairing"))
        XCTAssertFalse(bare.contains("-TortieDebugPairingPayload"))
        XCTAssertNil(PairingDebugSeam.injectedPayload(bare))
        XCTAssertFalse(PairingDebugSeam.forgetRequested(bare))
        XCTAssertEqual(DoorEndpointDebugSeam.loopbackPort(bare), 9)
        XCTAssertEqual(AlertsDebugSeam.token(bare), "ab")
        _ = DebugLaunchSeam.resolve(["app", "-TortieDebugStill"], file: file)
        XCTAssertEqual(DebugLaunchSeam.resolve(["app"], file: file), ["app", "-TortieDebugStill"], "a later launch with no endpoint left the old one behind")
        XCTAssertEqual(DebugLaunchSeam.resolve(["app"], file: dir.appendingPathComponent("none.json")), ["app"])
        XCTAssertEqual(DebugLaunchSeam.carriedArguments(["app", "-TortieDebugDoorEndpoint"]), [], "a flag whose value is missing is carried")
    }
    #endif
}

/// Numbers noted from inside a stand-in, in order.
final class Counter: @unchecked Sendable {
    private let lock = NSLock()
    private var notes: [Int] = []
    func note(_ number: Int) { lock.withLock { notes.append(number) } }
    var all: [Int] { lock.withLock { notes } }
}
