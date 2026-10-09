import CryptoKit
import Foundation
import XCTest
@testable import Tortie

/// Phase 333.11, "the door's answers only add" (build/p33311/SPEC.md section 8):
/// the PHONE'S half of the frozen wire.
///
/// The phone and the Mac update separately, so a phone on an older build talks
/// to a newer Mac and the reverse. `gate:onlyadd` holds every later Mac to what
/// the launch phone reads and sends (a new Mac, an old phone). This holds
/// every later PHONE to what an old Mac sends and reads (an old Mac, a new
/// phone), over the frozen sets under `Fixtures/frozen/`, each a sealed
/// `<label>.wire.json` beside the vectors it was frozen with
/// (`<label>.vectors.json`, checked here by sha256 with CryptoKit):
///
///   1. every frozen answer decodes BY ITS ROUTE, as sent and with unknown keys
///      at every depth, and nothing the old Mac offered is lost on the way;
///   2. every frozen arm reads as the set says: an accept arm (every optional
///      key taken out, which is what an older Mac sends, and unknown keys)
///      ALWAYS, and a refuse arm only while this phone's decoders read exactly
///      that set (`P33311_PROOF`, handed by test:ios), which is the phone
///      itself proving the freeze was read right;
///   3. every frozen request is still written byte for byte: the canonical
///      text, the signature, the target rebuilt by today's one builder from
///      the inputs read out of the target, and a write's body; and the pairing's
///      presentation and proof;
///   4. today's vectors decode by their routes, which reaches the answers the
///      vectors gained in this phase that `DoorVectorTests` does not name.
///
/// Every item prints ONE row, `P33311|<label>|<item>|<expect>|<got>`, and
/// build/p316/test-ios.mjs grades the rows against the SEALED file, so a row
/// the test never printed is caught by a count this file does not control.
/// The set is read only through `FrozenWire` and `FrozenVectors`, never
/// `DoorVectorFile`, whose sections move with the current vectors.
final class DoorFrozenTests: XCTestCase {
    private var sets: [FrozenSet] = []

    override func setUpWithError() throws {
        sets = try FrozenSet.loadAll()
        XCTAssertFalse(sets.isEmpty, "no frozen set under ios/TortieTests/Fixtures/frozen: node build/assert-door-only-adds.mjs --freeze launch")
    }

    /// The labels whose refuse arms this run asserts: test:ios names each set
    /// whose projection equals the phone's decoders today (D10).
    private var proven: Set<String> {
        let said = ProcessInfo.processInfo.environment["P33311_PROOF"] ?? ""
        return Set(said.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty })
    }

    private func row(_ set: FrozenSet, _ item: String, _ expect: String, _ got: String) {
        print("P33311|\(FrozenRow.clean(set.label))|\(FrozenRow.clean(item))|\(FrozenRow.clean(expect))|\(FrozenRow.clean(got))")
    }

    // MARK: 1. Every frozen answer decodes

    /// Clause: every frozen instance decodes by its route as sent and as its
    /// `withUnknown` copy; a sessions answer draws over its own echoed words;
    /// a session answer keeps the End, the reply offer and the Screen row its
    /// JSON offers; a write answer echoing no id reads `echoesNoId`; and the
    /// frozen turns pages page back to the first turn.
    func testEveryFrozenAnswerDecodes() throws {
        for set in sets {
            // Every frozen route, and the QR, is one this file decodes by name.
            for route in set.wire.routes.map(\.id) + ["qr"] {
                XCTAssertFalse(FrozenRoute.decodes(route: route, text: "{}").hasPrefix("no-route:"), "\(set.label): the frozen route \(route) has no case in DoorFrozenTests.decode(route:data:)")
            }
            for key in set.wire.instances.keys.sorted() {
                let route = set.wire.instances[key] ?? ""
                guard let instance = set.vectors.instance(key) else {
                    row(set, "decode:\(key)", "accept", "missing")
                    XCTFail("\(set.label): the frozen instance \(key) is not in \(set.wire.vectors.file)")
                    continue
                }
                let got = FrozenRoute.verdict(route: route, text: instance.json)
                row(set, "decode:\(key)", "accept", got)
                XCTAssertEqual(got, "accept", "\(set.label): \(key) does not read whole by its route \(route)")
                if let unknown = instance.withUnknown {
                    let again = FrozenRoute.verdict(route: route, text: unknown)
                    row(set, "decode:\(key)+unknown", "accept", again)
                    XCTAssertEqual(again, "accept", "\(set.label): \(key) with keys the phone does not know is not read whole")
                }
            }
            try pageTheTurns(set)
        }
    }

    /// The frozen turns pages, read back from the newest as `TurnPages` reads
    /// them, every turn once, in order, to the first.
    private func pageTheTurns(_ set: FrozenSet) throws {
        guard let newestText = set.vectors.answers["turns-newest"]?.json else { return }
        let decode = { (text: String) throws -> PocketTurnsAnswer in
            try JSONDecoder().decode(PocketTurnsAnswer.self, from: Data(text.utf8))
        }
        let newest = try decode(newestText)
        var pages = TurnPages(sessionId: newest.sessionId)
        try pages.acceptNewest(newest)
        var read = 1
        while let bound = pages.olderBound, let older = set.vectors.answers["turns-to-\(bound)"]?.json {
            try pages.acceptOlder(try decode(older), askedTo: bound)
            read += 1
        }
        let named = set.vectors.answers.keys.filter { $0.hasPrefix("turns-to-") }.count
        XCTAssertEqual(read, named + 1, "\(set.label): the frozen turns pages do not page back one from the next")
        XCTAssertNil(pages.olderBound, "\(set.label): the frozen pages stop before the first turn")
        XCTAssertFalse(pages.hasOlder)
        XCTAssertEqual(pages.turns.map(\.index), Array(0..<pages.turns.count), "\(set.label): the paged turns are not every turn once, in order")
        if let talk = set.vectors.answers["session-talk"]?.json {
            let session = try JSONDecoder().decode(PocketSessionAnswer.self, from: Data(talk.utf8))
            XCTAssertEqual(pages.turns.count, session.session.turnCount, "\(set.label): the pages do not hold the count on record")
        }
    }

    // MARK: 2. The arms

    /// Clause: each sealed arm, applied to its instance by its JSON pointer and
    /// decoded by its route, reads as the set says. Accept arms always (an
    /// older Mac's answer and unknown keys must keep reading); refuse arms
    /// while `P33311_PROOF` names the set, and `skipped` otherwise.
    func testTheArms() throws {
        let proven = self.proven
        for set in sets {
            XCTAssertFalse(set.wire.arms.isEmpty, "\(set.label): the sealed set holds no arm")
            let asserted = proven.contains(set.label)
            for arm in set.wire.arms {
                let item = "arm:\(arm.id)"
                if arm.expect == "refuse" && !asserted {
                    row(set, item, arm.expect, "skipped")
                    continue
                }
                guard let route = set.wire.instances[arm.instance], let instance = set.vectors.instance(arm.instance) else {
                    row(set, item, arm.expect, "unapplied")
                    XCTFail("\(set.label) \(arm.id): its instance \(arm.instance) is not in the set")
                    continue
                }
                let edited: String
                do {
                    edited = try FrozenArmEdit.apply(arm, to: instance.json)
                } catch {
                    row(set, item, arm.expect, "unapplied")
                    XCTFail("\(set.label) \(arm.id): \(arm.op) at \(arm.pointer) of \(arm.instance) could not be applied: \(error)")
                    continue
                }
                let got = FrozenRoute.decodes(route: route, text: edited)
                row(set, item, arm.expect, got)
                XCTAssertEqual(got, arm.expect, "\(set.label) \(arm.id): \(arm.op) at \(arm.pointer) of \(arm.instance) reads \(got), the set says \(arm.expect)")
            }
        }
    }

    // MARK: 3. The requests

    /// Clause: every frozen request is the one this phone sends today, so an
    /// old Mac still reads it: the canonical text over its facts with today's
    /// derived identity, the four headers in order with a signature that
    /// verifies, the target rebuilt by today's builder from the inputs read
    /// out of the target, and a write's body re-encoded byte for byte. And the
    /// pairing: today's presentation plaintext, its seal at the frozen nonce,
    /// its proof and its body, with and without the alert address.
    func testTheFrozenRequestsAreTheOnesThisPhoneSends() throws {
        for set in sets {
            let v = set.vectors
            let keys = try PhoneKeys(
                signingSeed: try XCTUnwrap(Hex.decode(v.keys.phoneSigningSeed)),
                exchangeSeed: try XCTUnwrap(Hex.decode(v.keys.phoneExchangeSeed))
            )
            XCTAssertFalse(v.requests.isEmpty, "\(set.label): the frozen vectors hold no request")
            for request in v.requests {
                let got = FrozenRequest.verdict(request, vectors: v, keys: keys)
                row(set, "request:\(request.name)", "same", got)
                XCTAssertEqual(got, "same", "\(set.label): the frozen request \(request.name) is not the one this phone sends")
            }
            let seal = FrozenRequest.presentationVerdict(vectors: v, keys: keys, push: false)
            row(set, "request:seal", "same", seal)
            XCTAssertEqual(seal, "same", "\(set.label): the frozen presentation is not the one this phone seals")
            if v.pushSeal != nil {
                let push = FrozenRequest.presentationVerdict(vectors: v, keys: keys, push: true)
                row(set, "request:pushSeal", "same", push)
                XCTAssertEqual(push, "same", "\(set.label): the frozen presentation with an alert address is not the one this phone seals")
            }
        }
    }

    // MARK: 4. Today's vectors, by route

    /// Clause: every answer in TODAY's `vectors.json` whose route a frozen set
    /// names reads whole on today's phone by that route: the current Mac and
    /// the current phone meeting over every answer, the ones this phase's
    /// vectors added among them.
    func testTodaysVectorsDecodeByTheirRoutes() throws {
        let today = try FrozenSet.todaysAnswers()
        XCTAssertFalse(today.isEmpty, "today's vectors.json holds no answer")
        for set in sets {
            let routes = Set(set.wire.routes.map(\.id))
            var read = 0
            for name in today.keys.sorted() where routes.contains(FrozenSet.routeOf(answer: name)) {
                guard let answer = today[name] else { continue }
                var got = FrozenRoute.verdict(route: FrozenSet.routeOf(answer: name), text: answer.json)
                if got == "accept", let unknown = answer.withUnknown {
                    let again = FrozenRoute.verdict(route: FrozenSet.routeOf(answer: name), text: unknown)
                    if again != "accept" { got = "unknown:\(again)" }
                }
                row(set, "today:\(name)", "accept", got)
                XCTAssertEqual(got, "accept", "\(set.label): today's \(name) does not read whole by its route")
                read += 1
            }
            XCTAssertGreaterThan(read, 0, "\(set.label): no answer of today's vectors names a frozen route")
        }
    }
}

// MARK: - One row

enum FrozenRow {
    /// A row's field: no `|` and no line break, so a row is one line of five fields.
    static func clean(_ text: String) -> String {
        String(text.map { $0 == "|" || $0.isNewline ? "/" : $0 })
    }
}

// MARK: - The frozen set

/// `<label>.wire.json`, only the sections the phone's half needs.
struct FrozenWire: Decodable {
    struct Route: Decodable {
        let id: String
    }

    struct Vectors: Decodable {
        let file: String
        let sha256: String
    }

    /// One sealed arm (build/p33311/SPEC.md section 8.2), as
    /// `generateArms` in build/assert-door-only-adds.mjs writes it. `value` is
    /// the value an op that writes one sets, when the set names it; otherwise
    /// the op's own value is used. `keys` (or `pointers`) are what an `older`
    /// arm removes. `format` names a format arm's row. `key` is the member an
    /// `unknown` arm adds to every object, `value` its value.
    struct Arm: Decodable {
        let id: String
        let instance: String
        let pointer: String
        let op: String
        let expect: String
        let value: FrozenJSONValue?
        let keys: [String]?
        let pointers: [String]?
        let format: String?
        let key: String?
    }

    let format: Int
    let label: String
    let routes: [Route]
    let instances: [String: String]
    let arms: [Arm]
    let vectors: Vectors
}

/// `<label>.vectors.json`, only the sections the phone's half reads.
struct FrozenVectors: Decodable {
    struct Keys: Decodable {
        let phoneSigningSeed, phoneExchangeSeed, macExchangeKey, clientKey: String
    }

    struct Identity: Decodable {
        let phoneId, fingerprint, binding: String
    }

    struct Request: Decodable {
        let name, method, target, body, bodySha256, timestamp, nonce, canonical, signature: String
        let id: String?
    }

    struct Seal: Decodable {
        struct FromPhone: Decodable { let iv, plaintext, ct, tag, proof, body: String }
        let secret, challenge, label: String
        let fromPhone: FromPhone
    }

    struct PushSeal: Decodable {
        let token, environment, iv, plaintext, ct, tag, proof, body: String
    }

    struct QR: Decodable {
        let name, payload: String
    }

    struct Answer: Decodable {
        let json: String
        let withUnknown: String?
    }

    let keys: Keys
    let identity: Identity
    let requests: [Request]
    let seal: Seal
    let pushSeal: PushSeal?
    let qr: [QR]
    let pairAnswers: [String: String]
    let answers: [String: Answer]

    /// An instance by its frozen name: `answers/<name>`, `pairAnswers/<name>`
    /// or `qr/<name>` (the payload's text).
    func instance(_ key: String) -> Answer? {
        let parts = key.split(separator: "/", maxSplits: 1).map(String.init)
        guard parts.count == 2 else { return nil }
        switch parts[0] {
        case "answers": return answers[parts[1]]
        case "pairAnswers": return pairAnswers[parts[1]].map { Answer(json: $0, withUnknown: nil) }
        case "qr": return qr.first { $0.name == parts[1] }.map { Answer(json: $0.payload, withUnknown: nil) }
        default: return nil
        }
    }
}

/// One frozen set, read and checked.
struct FrozenSet {
    let label: String
    let wire: FrozenWire
    let vectors: FrozenVectors

    /// `Fixtures/frozen/` beside this file in the checkout, which a Simulator
    /// process can read.
    static var beside: URL {
        URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .appendingPathComponent("Fixtures/frozen", isDirectory: true)
    }

    /// Every `*.wire.json`: from the checkout first, the test bundle second.
    static func wireFiles() -> [URL] {
        let manager = FileManager.default
        if let found = try? manager.contentsOfDirectory(at: beside, includingPropertiesForKeys: nil) {
            let wires = found.filter { $0.lastPathComponent.hasSuffix(".wire.json") }
            if !wires.isEmpty { return wires.sorted { $0.lastPathComponent < $1.lastPathComponent } }
        }
        let bundle = Bundle(for: DoorFrozenTests.self)
        let flat = bundle.urls(forResourcesWithExtension: "json", subdirectory: nil) ?? []
        let nested = bundle.urls(forResourcesWithExtension: "json", subdirectory: "frozen") ?? []
        return (flat + nested).filter { $0.lastPathComponent.hasSuffix(".wire.json") }.sorted { $0.lastPathComponent < $1.lastPathComponent }
    }

    /// Every frozen set, its vectors held to the sha256 sealed in its wire file.
    static func loadAll() throws -> [FrozenSet] {
        var out: [FrozenSet] = []
        for url in wireFiles() {
            let wire = try JSONDecoder().decode(FrozenWire.self, from: Data(contentsOf: url))
            let vectorsURL = url.deletingLastPathComponent().appendingPathComponent(wire.vectors.file)
            let bytes = try Data(contentsOf: vectorsURL)
            let digest = SHA256.hash(data: bytes).map { String(format: "%02x", $0) }.joined()
            guard digest == wire.vectors.sha256 else {
                throw FrozenLoadError.vectorsMoved(label: wire.label, file: wire.vectors.file, sha256: digest)
            }
            out.append(FrozenSet(label: wire.label, wire: wire, vectors: try JSONDecoder().decode(FrozenVectors.self, from: bytes)))
        }
        return out
    }

    /// TODAY's `vectors.json` answers: the checkout's file, else the bundle's.
    static func todaysAnswers() throws -> [String: FrozenVectors.Answer] {
        struct Today: Decodable { let answers: [String: FrozenVectors.Answer] }
        let checkout = beside.deletingLastPathComponent().appendingPathComponent("vectors.json")
        let bundled = Bundle(for: DoorFrozenTests.self).url(forResource: "vectors", withExtension: "json")
        let url = FileManager.default.fileExists(atPath: checkout.path) ? checkout : (bundled ?? checkout)
        return try JSONDecoder().decode(Today.self, from: Data(contentsOf: url)).answers
    }

    /// An answer's route: its name up to the first `-`, or the whole name.
    static func routeOf(answer name: String) -> String {
        String(name.split(separator: "-", maxSplits: 1).first ?? Substring(name))
    }
}

enum FrozenLoadError: Error, CustomStringConvertible {
    case vectorsMoved(label: String, file: String, sha256: String)

    var description: String {
        switch self {
        case let .vectorsMoved(label, file, sha256):
            return "\(label): \(file) is not the file its set was sealed over (sha256 \(sha256)); a frozen set is never edited by hand"
        }
    }
}

// MARK: - Decoding by route, never by Swift name

enum FrozenRoute {
    struct NoRoute: Error { let route: String }

    /// The answer the phone decodes `route`'s body with, decoded. A route with
    /// no case throws `NoRoute`, so a frozen route this file does not know
    /// fails by name.
    static func decode(route: String, data: Data) throws -> Any {
        let decoder = JSONDecoder()
        switch route {
        case "pair": return try decoder.decode(PairAnswer.self, from: data)
        case "blocked": return try decoder.decode(PocketBlockedAnswer.self, from: data)
        case "session": return try decoder.decode(PocketSessionAnswer.self, from: data)
        case "turns": return try decoder.decode(PocketTurnsAnswer.self, from: data)
        case "sessions": return try decoder.decode(PocketSessionsAnswer.self, from: data)
        case "screen": return try decoder.decode(PocketScreenAnswer.self, from: data)
        case "scrollback": return try decoder.decode(PocketScrollbackAnswer.self, from: data)
        case "end", "choose", "say", "keys": return try decoder.decode(PocketWriteAnswer.self, from: data)
        case "qr": return try PairingOffer.parse(String(decoding: data, as: UTF8.self))
        default: throw NoRoute(route: route)
        }
    }

    /// `accept` when the text decodes by its route, `refuse` when the phone
    /// refuses it, `no-route:<id>` when no case reads the route.
    static func decodes(route: String, text: String) -> String {
        do {
            _ = try decode(route: route, data: Data(text.utf8))
            return "accept"
        } catch let missing as NoRoute {
            return "no-route:\(missing.route)"
        } catch {
            return "refuse"
        }
    }

    /// `decodes`, and then that nothing the Mac offered was lost on the way:
    /// a sessions answer draws over its own echoed words; a session answer's
    /// End, reply offer and Screen row equal what its JSON says; a write
    /// answer with no id echoed reads `echoesNoId`.
    static func verdict(route: String, text: String) -> String {
        let value: Any
        do {
            value = try decode(route: route, data: Data(text.utf8))
        } catch let missing as NoRoute {
            return "no-route:\(missing.route)"
        } catch {
            return "refuse"
        }
        let json = (try? JSONSerialization.jsonObject(with: Data(text.utf8), options: [.fragmentsAllowed])) as? [String: Any]
        switch value {
        case let answer as PocketSessionsAnswer:
            let asked = SessionsQuery(
                show: answer.asked.show, group: answer.asked.group, sort: answer.asked.sort,
                agent: answer.asked.agent, machine: answer.asked.machine
            )
            guard (try? SessionsDrawing(answer, asked: asked)) != nil else { return "lost:drawing" }
        case let answer as PocketSessionAnswer:
            guard let session = json?["session"] as? [String: Any] else { return "lost:session" }
            if answer.session.end != expectedEnd(session["end"]) { return "lost:end" }
            if answer.session.replyOffer != expectedReply(session["reply"]) { return "lost:reply" }
            if answer.session.drawsScreen != ((session["screen"] as? Bool) ?? false) { return "lost:screen" }
        case let answer as PocketWriteAnswer:
            if (json?["write"] as? String) == "", !answer.echoesNoId { return "lost:echoesNoId" }
        default:
            break
        }
        return "accept"
    }

    /// The End the JSON offers, read the way an old Mac means it.
    private static func expectedEnd(_ value: Any?) -> PocketEndOffer {
        guard let end = value as? [String: Any], let state = end["state"] as? String else { return .none }
        switch state {
        case PocketEndOffer.Word.offered: return .offered(batch: (end["batch"] as? Bool) ?? false)
        case PocketEndOffer.Word.unreachable: return .unreachable(title: (end["title"] as? String) ?? "")
        default: return .none
        }
    }

    /// The reply offer the JSON makes, before any degrade.
    private static func expectedReply(_ value: Any?) -> PocketReplyOffer {
        guard let reply = value as? [String: Any] else { return .empty }
        return PocketReplyOffer(
            question: reply["question"] as? String,
            mark: reply["mark"] as? String,
            pressable: (reply["pressable"] as? [String]) ?? [],
            command: reply["command"] as? String,
            canSay: (reply["canSay"] as? Bool) ?? false
        )
    }
}

// MARK: - The arms, applied

/// Any JSON value, as a sealed arm carries one.
enum FrozenJSONValue: Decodable {
    case null
    case bool(Bool)
    case integer(Int)
    case number(Double)
    case string(String)
    case array([FrozenJSONValue])
    case object([String: FrozenJSONValue])

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() {
            self = .null
        } else if let value = try? c.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? c.decode(Int.self) {
            self = .integer(value)
        } else if let value = try? c.decode(Double.self) {
            self = .number(value)
        } else if let value = try? c.decode(String.self) {
            self = .string(value)
        } else if let value = try? c.decode([FrozenJSONValue].self) {
            self = .array(value)
        } else {
            self = .object(try c.decode([String: FrozenJSONValue].self))
        }
    }

    /// The value as `JSONSerialization` writes it.
    var foundation: Any {
        switch self {
        case .null: return NSNull()
        case .bool(let value): return NSNumber(value: value)
        case .integer(let value): return NSNumber(value: value)
        case .number(let value): return NSNumber(value: value)
        case .string(let value): return value
        case .array(let values): return values.map(\.foundation)
        case .object(let members): return members.mapValues(\.foundation)
        }
    }
}

enum FrozenArmEdit {
    enum Failure: Error, CustomStringConvertible {
        case notJSON
        case pointer(String)
        case absent(String)
        case present(String)
        case op(String)

        var description: String {
            switch self {
            case .notJSON: return "the instance is not JSON"
            case .pointer(let p): return "the pointer \(p) does not resolve"
            case .absent(let p): return "nothing at \(p)"
            case .present(let p): return "\(p) is already there"
            case .op(let o): return "no value for the op \(o)"
            }
        }
    }

    /// What every object gains under an `unknown` arm.
    static var unknownMember: [String: Any] { ["p33311Unknown": ["nested": [1]]] }

    /// The instance's text with the arm applied, written back as JSON.
    static func apply(_ arm: FrozenWire.Arm, to text: String) throws -> String {
        guard let root = try? JSONSerialization.jsonObject(with: Data(text.utf8), options: [.fragmentsAllowed]) else {
            throw Failure.notJSON
        }
        let edited = try edit(arm, root)
        let data = try JSONSerialization.data(withJSONObject: edited, options: [.fragmentsAllowed, .withoutEscapingSlashes])
        return String(decoding: data, as: UTF8.self)
    }

    private static func edit(_ arm: FrozenWire.Arm, _ root: Any) throws -> Any {
        guard let tokens = tokens(arm.pointer) else { throw Failure.pointer(arm.pointer) }
        let given = arm.value?.foundation
        switch arm.op {
        case "remove":
            return try change(tokens, in: root, pointer: arm.pointer) { current in
                guard current != nil else { throw Failure.absent(arm.pointer) }
                return nil
            }
        case "kind":
            return try replace(tokens, in: root, pointer: arm.pointer) { given ?? kindChange($0) }
        case "null":
            return try replace(tokens, in: root, pointer: arm.pointer) { _ in NSNull() }
        case "fraction":
            return try replace(tokens, in: root, pointer: arm.pointer) { current in
                if let given { return given }
                guard let number = current as? NSNumber, !isBool(number) else { throw Failure.op(arm.op) }
                return NSNumber(value: number.doubleValue + 0.5)
            }
        case "word":
            return try replace(tokens, in: root, pointer: arm.pointer) { _ in given ?? "p33311-unknown" }
        case "add":
            return try change(tokens, in: root, pointer: arm.pointer) { current in
                guard current == nil else { throw Failure.present(arm.pointer) }
                return given ?? "p33311"
            }
        case "format":
            return try replace(tokens, in: root, pointer: arm.pointer) { current in
                if let given { return given }
                return try formatChange(arm.format ?? formatGuess(tokens.last ?? ""), current, op: arm.op)
            }
        case "older":
            return try older(arm, tokens, root, given)
        case "unknown":
            let member: [String: Any] = arm.key.map { [$0: given ?? NSNull()] } ?? unknownMember
            if tokens.isEmpty { return addUnknown(root, member) }
            return try replace(tokens, in: root, pointer: arm.pointer) { addUnknown($0, member) }
        default:
            throw Failure.op(arm.op)
        }
    }

    /// An `older` arm: every optional key it names taken out at once, which
    /// is what a Mac older than those keys sends. The keys are named relative
    /// to the object at the pointer (`keys`, or `value` as a list of names),
    /// or as whole pointers (`pointers`).
    private static func older(_ arm: FrozenWire.Arm, _ tokens: [String], _ root: Any, _ given: Any?) throws -> Any {
        var targets: [[String]] = []
        if let pointers = arm.pointers {
            for p in pointers {
                guard let t = self.tokens(p) else { throw Failure.pointer(p) }
                targets.append(t)
            }
        } else if let names = arm.keys ?? (given as? [String]) {
            targets = names.map { tokens + [$0] }
        } else {
            throw Failure.op(arm.op)
        }
        var out = root
        var removed = 0
        for target in targets {
            guard value(at: target, in: out) != nil else { continue }
            out = try change(target, in: out, pointer: arm.pointer) { _ in nil }
            removed += 1
        }
        guard removed > 0 else { throw Failure.absent(arm.pointer) }
        return out
    }

    // MARK: The values an op writes (build/p33311/SPEC.md section 8.2)

    /// A string, colour or word becomes `0`; a number or a bool `"p33311"`; an
    /// array `{}`; an object `[]`.
    static func kindChange(_ current: Any) -> Any {
        if current is [String: Any] { return [Any]() }
        if current is [Any] { return [String: Any]() }
        if current is String { return NSNumber(value: 0) }
        return "p33311"
    }

    /// The one value outside each format row.
    static func formatChange(_ format: String, _ current: Any, op: String) throws -> Any {
        switch format {
        case "mark": return "0123456789abc"
        case "questionId": return "p33311"
        case "certificate": return "!"
        case "version":
            guard let number = current as? NSNumber else { throw Failure.op(op) }
            return NSNumber(value: number.intValue + 1)
        case "port": return NSNumber(value: 443)
        case "publicName": return "p33311.example"
        case "pin", "ed25519Spki", "x25519Spki", "secret": return "p33311"
        case "positive": return NSNumber(value: 0)
        default: throw Failure.op(op)
        }
    }

    /// The format a key's row is, when the arm does not name it.
    static func formatGuess(_ key: String) -> String {
        switch key {
        case "revision", "space", "dialog": return "mark"
        case "turn": return "questionId"
        case "cert": return "certificate"
        case "v": return "version"
        case "port": return "port"
        case "host": return "publicName"
        case "fp": return "pin"
        case "dk": return "ed25519Spki"
        case "dx": return "x25519Spki"
        case "ps": return "secret"
        case "exp": return "positive"
        default: return key
        }
    }

    static func isBool(_ number: NSNumber) -> Bool {
        CFGetTypeID(number as CFTypeRef) == CFBooleanGetTypeID()
    }

    /// Every object at every depth gains `member`.
    static func addUnknown(_ value: Any, _ member: [String: Any]) -> Any {
        if let object = value as? [String: Any] {
            var out: [String: Any] = [:]
            for (key, inner) in object { out[key] = addUnknown(inner, member) }
            for (key, inner) in member where out[key] == nil { out[key] = inner }
            return out
        }
        if let array = value as? [Any] { return array.map { addUnknown($0, member) } }
        return value
    }

    // MARK: JSON pointers (RFC 6901)

    static func tokens(_ pointer: String) -> [String]? {
        if pointer.isEmpty { return [] }
        guard pointer.hasPrefix("/") else { return nil }
        return pointer.dropFirst().split(separator: "/", omittingEmptySubsequences: false).map {
            $0.replacingOccurrences(of: "~1", with: "/").replacingOccurrences(of: "~0", with: "~")
        }
    }

    static func value(at tokens: [String], in root: Any) -> Any? {
        var at: Any = root
        for token in tokens {
            if let object = at as? [String: Any] {
                guard let next = object[token] else { return nil }
                at = next
            } else if let array = at as? [Any], let index = Int(token), array.indices.contains(index) {
                at = array[index]
            } else {
                return nil
            }
        }
        return at
    }

    /// `root` with the value at `tokens` replaced by what `make` answers for
    /// the one there, which must exist.
    private static func replace(_ tokens: [String], in root: Any, pointer: String, _ make: (Any) throws -> Any) throws -> Any {
        try change(tokens, in: root, pointer: pointer) { current in
            guard let current else { throw Failure.absent(pointer) }
            return try make(current)
        }
    }

    /// `root` with the member the last token names set to what `make`
    /// answers for the one there (nil when absent); nil removes it.
    private static func change(_ tokens: [String], in root: Any, pointer: String, _ make: (Any?) throws -> Any?) throws -> Any {
        guard let first = tokens.first else { throw Failure.pointer(pointer) }
        let rest = Array(tokens.dropFirst())
        if var object = root as? [String: Any] {
            if rest.isEmpty {
                object[first] = try make(object[first])
                return object
            }
            guard let child = object[first] else { throw Failure.pointer(pointer) }
            object[first] = try change(rest, in: child, pointer: pointer, make)
            return object
        }
        if var array = root as? [Any], let index = Int(first), array.indices.contains(index) {
            if rest.isEmpty {
                if let made = try make(array[index]) { array[index] = made } else { array.remove(at: index) }
                return array
            }
            array[index] = try change(rest, in: array[index], pointer: pointer, make)
            return array
        }
        throw Failure.pointer(pointer)
    }
}

// MARK: - The requests, written again by today's phone

enum FrozenRequest {
    /// The headers the frozen Mac reads, in its order (`POCKET_HEADERS`).
    static let headerNames = ["x-tortie-phone", "x-tortie-timestamp", "x-tortie-nonce", "x-tortie-signature"]

    /// `same`, or `differs:` and every part that moved.
    static func verdict(_ request: FrozenVectors.Request, vectors v: FrozenVectors, keys: PhoneKeys) -> String {
        var moved: [String] = []
        // The identity this phone derives today, which the canonical text binds.
        let phoneId = DoorSignature.phoneId(signingKey: keys.signingKey)
        let binding = DoorSignature.binding(phoneExchange: keys.exchange, macExchangeKey: v.keys.macExchangeKey) ?? ""
        if phoneId != v.identity.phoneId { moved.append("phoneId") }
        if binding != v.identity.binding { moved.append("binding") }
        let body = Data(request.body.utf8)
        if Hex.sha256(body) != request.bodySha256 { moved.append("bodySha256") }
        let text = DoorSignature.canonicalText(
            method: request.method, target: request.target, bodySha256: request.bodySha256,
            timestamp: request.timestamp, nonce: request.nonce, binding: binding
        )
        if Data(text.utf8) != Data(request.canonical.utf8) { moved.append("canonical") }
        let signer = RequestSigner(phoneId: phoneId, binding: binding, key: keys.signing)
        if let headers = try? signer.headers(method: request.method, target: request.target, body: body, timestamp: request.timestamp, nonce: request.nonce) {
            if headers.map(\.name) != headerNames
                || headers.first?.value != v.identity.phoneId
                || headers.count != 4 || headers[1].value != request.timestamp || headers[2].value != request.nonce {
                moved.append("headers")
            } else if let signature = Base64URL.decode(headers[3].value),
                      signature.count == 64,
                      keys.signing.publicKey.isValidSignature(signature, for: Data(request.canonical.utf8)) {
                // The frozen Mac verifies it.
            } else {
                moved.append("signature")
            }
        } else {
            moved.append("headers")
        }
        let path = String(request.target.split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false).first ?? "")
        switch rebuiltTarget(request.target) {
        case .some((let target, let id)):
            if target != request.target { moved.append("target") }
            if let frozenId = request.id, frozenId != id { moved.append("id") }
        case .none:
            moved.append("target")
        }
        if let method = methodOf(path), request.method != method { moved.append("method") }
        if let written = rebuiltBody(path: path, body: request.body), written != request.body { moved.append("body") }
        return moved.isEmpty ? "same" : "differs:\(moved.joined(separator: ","))"
    }

    /// The method the route is called with, or nil for `/pair`, whose frozen
    /// request is a canonical-text vector and not a phone's own.
    private static func methodOf(_ path: String) -> String? {
        switch path {
        case DoorClient.endTarget, DoorClient.chooseTarget, DoorClient.sayTarget, DoorClient.keysTarget: return "POST"
        case DoorClient.pairTarget: return nil
        default: return "GET"
        }
    }

    /// The target today's one builder spells from the inputs read out of the
    /// frozen target, and the session id it names (nil for a route with none);
    /// nil when the target is not one this phone builds.
    static func rebuiltTarget(_ target: String) -> (String, String?)? {
        let parts = target.split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false).map(String.init)
        let path = parts[0]
        var names: [String] = []
        var values: [String: String] = [:]
        if parts.count == 2 {
            for pair in parts[1].split(separator: "&", omittingEmptySubsequences: false) {
                let kv = pair.split(separator: "=", maxSplits: 1, omittingEmptySubsequences: false).map(String.init)
                guard kv.count == 2, values[kv[0]] == nil, let value = kv[1].removingPercentEncoding else { return nil }
                names.append(kv[0])
                values[kv[0]] = value
            }
        }
        let number = { (name: String) -> Int? in values[name].flatMap { Int($0) } }
        switch path {
        case DoorClient.blockedTarget, DoorClient.pairTarget, DoorClient.endTarget, DoorClient.chooseTarget, DoorClient.sayTarget, DoorClient.keysTarget:
            return parts.count == 1 ? (path, nil) : nil
        case "/v1/session":
            guard names == ["id"], let id = values["id"] else { return nil }
            return (DoorClient.sessionTarget(id), id)
        case "/v1/turns":
            guard names == ["id", "limit"] || names == ["id", "limit", "to"], let id = values["id"], let limit = number("limit") else { return nil }
            let to = names.count == 3 ? number("to") : nil
            if names.count == 3 && to == nil { return nil }
            return (DoorClient.turnsTarget(id, limit: limit, to: to), id)
        case "/v1/sessions":
            guard let query = DoorVectorTests.sessionsQuery(target) else { return nil }
            return (DoorClient.sessionsTarget(query), nil)
        case "/v1/screen":
            guard names == ["id"] || names == ["id", "since"], let id = values["id"] else { return nil }
            return (DoorClient.screenTarget(id, since: values["since"]), id)
        case "/v1/scrollback":
            guard names == ["id", "from", "count", "depth", "wrap", "keep"], let id = values["id"],
                  let from = number("from"), let count = number("count"), let depth = number("depth"), let wrap = number("wrap"),
                  let keep = values["keep"].flatMap(ScrollbackKeep.init(rawValue:)) else { return nil }
            return (DoorClient.scrollbackTarget(id, from: from, count: count, depth: depth, wrap: wrap, keep: keep), id)
        default:
            return nil
        }
    }

    /// A write's body as today's encoder writes it from the frozen body's own
    /// fields, sorted; `""` for a read; nil for `/pair`, whose body is a
    /// presentation (`presentationVerdict`). A body this phone cannot have
    /// written answers a text that is not the body.
    static func rebuiltBody(path: String, body: String) -> String? {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        let encoded = { (value: any Encodable) -> String in
            (try? encoder.encode(value)).map { String(decoding: $0, as: UTF8.self) } ?? "unwritable"
        }
        let fields = (try? JSONSerialization.jsonObject(with: Data(body.utf8))) as? [String: Any]
        let named = (fields.map { Array($0.keys).sorted() }) ?? []
        switch path {
        case DoorClient.pairTarget:
            return nil
        case DoorClient.endTarget:
            guard named == ["batch", "session", "write"], let f = fields, let batch = f["batch"] as? Bool,
                  let session = f["session"] as? String, let write = f["write"] as? String else { return "unreadable" }
            return encoded(EndBody(batch: batch, session: session, write: write))
        case DoorClient.chooseTarget:
            guard named == ["mark", "marker", "question", "session", "write"], let f = fields,
                  let mark = f["mark"] as? String, let marker = f["marker"] as? String, let question = f["question"] as? String,
                  let session = f["session"] as? String, let write = f["write"] as? String else { return "unreadable" }
            return encoded(ChooseBody(mark: mark, marker: marker, question: question, session: session, write: write))
        case DoorClient.sayTarget:
            guard named == ["session", "text", "write"], let f = fields, let session = f["session"] as? String,
                  let text = f["text"] as? String, let write = f["write"] as? String else { return "unreadable" }
            return encoded(SayBody(session: session, text: text, write: write))
        case DoorClient.keysTarget:
            guard named == ["dialog", "keys", "session", "turn", "write"], let f = fields, let items = f["keys"] as? [[String: Any]],
                  let session = f["session"] as? String, let turn = f["turn"] as? String, let write = f["write"] as? String else { return "unreadable" }
            var read: [KeyItem] = []
            for item in items {
                if item.count == 1, let text = item["t"] as? String {
                    read.append(.text(text))
                } else if item.count == 1, let name = (item["k"] as? String).flatMap(ScreenKeyName.init(rawValue:)) {
                    read.append(.key(name))
                } else {
                    return "unreadable"
                }
            }
            return encoded(KeysBody(dialog: f["dialog"] as? String, keys: read, session: session, turn: turn, write: write))
        default:
            return ""
        }
    }

    /// The presentation: today's plaintext for the frozen keys and label (and
    /// the frozen alert address), sealed at the frozen nonce, its proof and
    /// its body; and the fingerprint the person matches on both screens.
    static func presentationVerdict(vectors v: FrozenVectors, keys: PhoneKeys, push: Bool) -> String {
        var moved: [String] = []
        let address: PushAddress?
        let frozen: (iv: String, plaintext: String, ct: String, tag: String, proof: String, body: String)
        if push {
            guard let p = v.pushSeal, let environment = PushEnvironment(rawValue: p.environment),
                  let made = PushAddress(token: p.token, environment: environment) else { return "differs:address" }
            address = made
            frozen = (p.iv, p.plaintext, p.ct, p.tag, p.proof, p.body)
        } else {
            address = nil
            let f = v.seal.fromPhone
            frozen = (f.iv, f.plaintext, f.ct, f.tag, f.proof, f.body)
        }
        guard let secret = Base64URL.decode(v.seal.secret) else { return "differs:secret" }
        if PresentationSeal.challenge(secret: secret) != v.seal.challenge { moved.append("challenge") }
        if DoorSignature.pairFingerprint(signingKey: keys.signingKey, exchangeKey: keys.exchangeKey, clientKey: v.keys.clientKey) != v.identity.fingerprint {
            moved.append("fingerprint")
        }
        guard let inner = try? PresentationSeal.inner(label: v.seal.label, keys: keys, clientKey: v.keys.clientKey, push: address) else {
            return "differs:plaintext"
        }
        if inner != Data(frozen.plaintext.utf8) { moved.append("plaintext") }
        guard let iv = Base64URL.decode(frozen.iv), let nonce = try? AES.GCM.Nonce(data: iv),
              let sealed = try? PresentationSeal.seal(inner, secret: secret, nonce: nonce) else {
            return "differs:seal"
        }
        if sealed != PresentationSeal.Sealed(iv: frozen.iv, ct: frozen.ct, tag: frozen.tag) { moved.append("seal") }
        if PresentationSeal.proofText(challenge: v.seal.challenge, iv: frozen.iv, ct: frozen.ct, tag: frozen.tag) != frozen.proof {
            moved.append("proof")
        }
        let theirs = (try? JSONSerialization.jsonObject(with: Data(frozen.body.utf8))) as? [String: String]
        if let body = try? PresentationSeal.body(sealed, challenge: v.seal.challenge, keys: keys),
           let mine = (try? JSONSerialization.jsonObject(with: body)) as? [String: String], let theirs {
            let same = Set(mine.keys) == Set(theirs.keys) && ["ct", "ek", "iv", "tag"].allSatisfy { mine[$0] == theirs[$0] }
            let signed = mine["sig"].flatMap(Base64URL.decode).map { keys.signing.publicKey.isValidSignature($0, for: Data(frozen.proof.utf8)) } ?? false
            if !same { moved.append("body") }
            if !signed { moved.append("sig") }
        } else {
            moved.append("body")
        }
        return moved.isEmpty ? "same" : "differs:\(moved.joined(separator: ","))"
    }
}
