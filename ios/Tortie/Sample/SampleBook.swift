// The sample's book (Phase 333.3, build/p3333/SPEC.md section 5.2.1): the
// made-up sessions See a sample draws, read from the one file the app carries.
//
// WHERE EVERY ANSWER COMES FROM (D2, D3). build/p3333/sample.mjs runs the Mac's
// own route composer over a made-up world, under the pinned tsx, and writes
// every answer the sample can give into Sample/sample.json: the lists for each
// of the world's states, stored as skeletons over shared pieces, and each
// session's detail, turns, screens and history. This file reads that file once,
// when the sample opens, and ASSEMBLES one answer at a time, by index, into one
// JSON object, then decodes it with the very decoders a paired Mac's bytes go
// through (Door/Contract.swift). So the sample cannot draw anything the door
// could not have sent, and the phone orders, filters, counts and words nothing.
//
// THE ONE FIELD IT SETS is `at`, the phone's own clock at the answer (D4);
// every age in the book is the composer's, at the world's fixed clock.
//
// WHAT IT TOUCHES: the app's own bundle, read once, and nothing else. It opens
// no connection, keeps nothing on the phone and writes no file
// (conformance:ios rule az).

import Foundation

/// The bundled file, parsed once and never changed.
///
/// `@unchecked Sendable`, and why that is true: `root` is the parse of the
/// file, made once in `init` and never mutated or handed out; every reader
/// copies values out of it into a new object. A dictionary of `Any` cannot say
/// so to the compiler.
struct SampleBook: @unchecked Sendable {
    /// The one shape this build reads.
    static let format = 1
    /// What joins the variants of a state's key (`waiting.answered.live`).
    static let stateJoin = "."
    /// The agent word of a sessions key with no agent filter.
    static let everyAgent = "*"

    /// The sessions, in the book's order.
    let ids: [String]
    /// Each session's variants, in the book's order: the first is where the
    /// sample starts.
    let variants: [String: [String]]
    /// The agent filter's ids, in the answers' order.
    let agents: [String]

    private let root: [String: Any]

    /// The book in `data`, or nil when it is not one this build reads.
    init?(data: Data) {
        guard let object = try? JSONSerialization.jsonObject(with: data),
              let root = object as? [String: Any],
              root["format"] as? Int == Self.format,
              let ids = root["ids"] as? [String], !ids.isEmpty, Set(ids).count == ids.count,
              let lists = root["variants"] as? [[String]], lists.count == ids.count,
              lists.allSatisfy({ !$0.isEmpty }),
              let agents = root["agents"] as? [String],
              root["constants"] is [String: Any], root["pieces"] is [String: Any],
              root["lists"] is [String: Any] else { return nil }
        self.root = root
        self.ids = ids
        self.agents = agents
        variants = Dictionary(uniqueKeysWithValues: zip(ids, lists))
    }

    /// The book the app carries, or nil when it is missing or unreadable.
    static func bundled() -> SampleBook? {
        guard let path = Bundle.main.path(forResource: "sample", ofType: "json"),
              let data = FileManager.default.contents(atPath: path) else { return nil }
        return SampleBook(data: data)
    }

    // MARK: - States and keys

    /// The state key for each session's variant now, in `ids` order.
    func stateKey(_ variantOf: [String: String]) -> String {
        ids.map { variantOf[$0] ?? "" }.joined(separator: Self.stateJoin)
    }

    /// Where the sample starts: each session at its first variant.
    var start: [String: String] {
        variants.compactMapValues(\.first)
    }

    /// The key of one `/v1/sessions` question: `<show>.<group>.<sort>.<agent or *>`.
    /// A machine filter has no key: every sample session is on one Mac.
    static func sessionsKey(_ query: SessionsQuery) -> String {
        "\(query.show.rawValue).\(query.group.rawValue).\(query.sort.rawValue).\(query.agent ?? everyAgent)"
    }

    // MARK: - The readers

    /// `/v1/blocked` for one state.
    func blocked(state: String, at: Double) throws -> PocketBlockedAnswer {
        guard let list = lists(state)?["blocked"] as? [String: Any],
              let rows = list["rows"] as? [Int], let others = list["others"] as? [Int],
              let omitted = list["othersOmitted"] else { throw DoorFailure.refused }
        let waiting = try pick(rows, from: "blockedRows")
        let rest = try pick(others, from: "blockedRows")
        let object: [String: Any] = [
            "rows": waiting,
            "others": rest,
            "othersOmitted": omitted,
            "at": at,
            "emptyLine": constant("emptyLine"),
            "ageNote": constant("blockedAgeNote")
        ]
        return try Self.decoded(PocketBlockedAnswer.self, object)
    }

    /// `/v1/sessions` for one state and one question; a question the book
    /// holds no answer to is refused, as the door refuses a word it does not know.
    func sessions(state: String, query: SessionsQuery, at: Double) throws -> PocketSessionsAnswer {
        guard query.machine == nil,
              let all = lists(state)?["sessions"] as? [String: Any],
              let list = all[Self.sessionsKey(query)] as? [String: Any],
              let rows = list["rows"] as? [Int], let groups = list["groups"] as? [Int],
              let agents = list["agents"] as? [Int], let machines = list["machines"] as? [Int],
              let total = list["total"], let omitted = list["omitted"] else { throw DoorFailure.refused }
        let asked: [String: Any] = [
            "show": query.show.rawValue,
            "group": query.group.rawValue,
            "sort": query.sort.rawValue,
            "agent": Self.orNull(query.agent),
            "machine": NSNull()
        ]
        let drawnRows = try pick(rows, from: "sessionsRows")
        let drawnGroups = try pick(groups, from: "groups")
        let agentChoices = try pick(agents, from: "choices")
        let machineChoices = try pick(machines, from: "choices")
        let object: [String: Any] = [
            "asked": asked,
            "rows": drawnRows,
            "groups": drawnGroups,
            "agents": agentChoices,
            "machines": machineChoices,
            "total": total,
            "omitted": omitted,
            "at": at,
            "ageNote": constant("sessionsAgeNote")
        ]
        return try Self.decoded(PocketSessionsAnswer.self, object)
    }

    /// `/v1/session` for one session at one variant.
    func session(id: String, variant: String, at: Double) throws -> PocketSessionAnswer {
        try Self.decoded(PocketSessionAnswer.self, Self.stamped(try entry("session", id, variant), at: at))
    }

    /// `/v1/turns`, the newest page, for one session at one variant.
    func turns(id: String, variant: String, at: Double) throws -> PocketTurnsAnswer {
        try Self.decoded(PocketTurnsAnswer.self, Self.stamped(try entry("turns", id, variant), at: at))
    }

    /// One screen as the book holds it: the door's answer, and the rows the
    /// echo draws on (none on a waiting screen or an ended one).
    struct Screen: Sendable {
        let answer: PocketScreenAnswer
        let rows: SampleEcho.Rows?
    }

    /// `/v1/screen` for one session at one variant, and its echo's rows.
    func screen(id: String, variant: String, at: Double) throws -> Screen {
        let held = try entry("screen", id, variant)
        guard let answer = held["answer"] as? [String: Any] else { throw DoorFailure.refused }
        let decoded = try Self.decoded(PocketScreenAnswer.self, Self.stamped(answer, at: at))
        guard let prompt = held["prompt"], !(prompt is NSNull) else {
            return Screen(answer: decoded, rows: nil)
        }
        let promptAt = try Self.decoded(SampleEcho.Prompt.self, prompt)
        var note: SampleEcho.Note?
        if let written = held["note"], !(written is NSNull) {
            note = try Self.decoded(SampleEcho.Note.self, written)
        }
        return Screen(answer: decoded, rows: SampleEcho.Rows(prompt: promptAt, note: note))
    }

    /// One session's whole history: rows `[0, depth)` at the screen's width.
    func history(id: String) throws -> PocketScrollbackAnswer {
        guard let page = member("history")?[id] as? [String: Any] else { throw DoorFailure.refused }
        return try Self.decoded(PocketScrollbackAnswer.self, page)
    }

    /// Main's `ended` absence of a page, for one session.
    func pageEnded(id: String, at: Double) throws -> PocketScrollbackAnswer {
        try absence("pageEnded", id, at: at)
    }

    /// Main's `moved` absence of a page, for one session.
    func pageMoved(id: String, at: Double) throws -> PocketScrollbackAnswer {
        try absence("pageMoved", id, at: at)
    }

    // MARK: - Reading the parse

    private func member(_ name: String) -> [String: Any]? {
        root[name] as? [String: Any]
    }

    private func lists(_ state: String) -> [String: Any]? {
        member("lists")?[state] as? [String: Any]
    }

    /// A constant every answer of its kind carries; absent, it is null, which
    /// the decoder refuses.
    private func constant(_ name: String) -> Any {
        member("constants")?[name] ?? NSNull()
    }

    /// The pieces `indices` names, in that order. An index the book does not
    /// hold is a book this build cannot read.
    private func pick(_ indices: [Int], from piece: String) throws -> [Any] {
        guard let all = member("pieces")?[piece] as? [Any] else { throw DoorFailure.malformed }
        return try indices.map { index in
            guard all.indices.contains(index) else { throw DoorFailure.malformed }
            return all[index]
        }
    }

    /// One session's answer at one variant, under `name`.
    private func entry(_ name: String, _ id: String, _ variant: String) throws -> [String: Any] {
        guard let byVariant = member(name)?[id] as? [String: Any],
              let answer = byVariant[variant] as? [String: Any] else { throw DoorFailure.refused }
        return answer
    }

    private func absence(_ name: String, _ id: String, at: Double) throws -> PocketScrollbackAnswer {
        guard let page = member(name)?[id] as? [String: Any] else { throw DoorFailure.refused }
        return try Self.decoded(PocketScrollbackAnswer.self, Self.stamped(page, at: at))
    }

    /// The answer with its `at` set to the phone's clock (D4).
    private static func stamped(_ answer: [String: Any], at: Double) -> [String: Any] {
        var stamped = answer
        stamped["at"] = at
        return stamped
    }

    private static func orNull(_ text: String?) -> Any {
        text.map { $0 as Any } ?? NSNull()
    }

    /// One assembled object, through the contract's own decoder; anything it
    /// refuses is an answer this build cannot read.
    private static func decoded<T: Decodable>(_ type: T.Type, _ object: Any) throws -> T {
        guard JSONSerialization.isValidJSONObject(object),
              let data = try? JSONSerialization.data(withJSONObject: object),
              let value = try? JSONDecoder().decode(type, from: data) else { throw DoorFailure.malformed }
        return value
    }
}
