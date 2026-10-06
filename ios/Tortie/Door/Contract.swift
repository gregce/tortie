// Contract.swift — what the door answers, mirrored by hand (Phase 316.2).
//
// THE SOURCE IS src/shared/ipc/pocket.ts, and every type below is one of its
// answer shapes with the same field names. There is no generator: the door
// already sends main's own words (the status word, its raised title, the age,
// the Catch Me Up line, the absence sentence), so the phone decodes strings
// and draws them. It does no arithmetic on a status, an age or an order
// (build/p316/SPEC.md section 4.0).
//
// THE ANSWER IS SOMEBODY ELSE'S BYTES, and it is decoded that way:
//
//   - Unknown fields are ignored, so a newer Mac can add one.
//   - A field the contract always sends is REQUIRED, including the ones whose
//     value may be null: a missing key refuses the whole answer rather than
//     drawing half of it. `nullable` below is that rule, spelled once.
//   - A status word or a dot name the phone does not know is still a string.
//     It is drawn as main wrote it; only the dot's colour falls back
//     (`StatusDot.unknown`).
//   - Epoch milliseconds are Doubles, because a clock read from a file's
//     modification time can be fractional, and one fractional number must not
//     refuse a whole list.
//   - Every WHOLE number (a count, an omitted count, a turn's index) is a
//     count main could have sent, 0 to 9,007,199,254,740,991, or it refuses
//     the whole answer; and a sum or difference of one is taken only by
//     `DoorNumber`, which cannot trap (his ruling of 2026-09-23).
//
// build/p316/vectors.mjs writes answers composed by the SHIPPING route
// composer into ios/TortieTests/Fixtures/vectors.json, and the tests decode
// them, re-encode them and compare the two.
//
// The paging rule for the conversation lives at the foot of this file, beside
// the shape whose promise it enforces.

import Foundation

// MARK: - Decoding rules

extension KeyedDecodingContainer {
    /// A field the contract always sends and that may be null. A MISSING key
    /// throws, so it refuses the answer; `null` is nil.
    func nullable<T: Decodable>(_ type: T.Type, forKey key: Key) throws -> T? {
        guard contains(key) else {
            throw DecodingError.keyNotFound(
                key,
                DecodingError.Context(codingPath: codingPath, debugDescription: "the door always sends this field")
            )
        }
        if try decodeNil(forKey: key) { return nil }
        return try decode(T.self, forKey: key)
    }

    /// A whole number the contract always sends: a count, an omitted count or
    /// a turn's index. One outside `DoorNumber`'s bound refuses the whole
    /// answer, exactly as a missing field does, and the screen draws
    /// `Copy.answerUnreadable`. EVERY whole number the door sends is decoded
    /// here or by `nullableDoorNumber` (conformance:ios rule k).
    func doorNumber(forKey key: Key) throws -> Int {
        let number = try decode(Int.self, forKey: key)
        guard DoorNumber.isCount(number) else { throw outsideTheBound(key) }
        return number
    }

    /// The same, for a whole number the contract always sends and that may be
    /// null. Null is nil, never zero.
    func nullableDoorNumber(forKey key: Key) throws -> Int? {
        guard let number = try nullable(Int.self, forKey: key) else { return nil }
        guard DoorNumber.isCount(number) else { throw outsideTheBound(key) }
        return number
    }

    private func outsideTheBound(_ key: Key) -> DecodingError {
        DecodingError.dataCorruptedError(
            forKey: key, in: self, debugDescription: "not a count or an index the door could have sent"
        )
    }
}

// MARK: - Whole numbers the door sends

/// The bound on every whole number the door sends, and THE ONE PLACE the phone
/// does arithmetic on one (Phase 316.2's fix, his ruling of 2026-09-23: "No
/// trapping arithmetic anywhere on a number the door sends").
///
/// THE BOUND. Main writes every answer with `JSON.stringify` from JavaScript
/// numbers, and the largest whole number that writes exactly is
/// `Number.MAX_SAFE_INTEGER`, 9,007,199,254,740,991. Every whole number in the
/// contract is a count or an index, so none is negative either. A number
/// outside `0...largest` is not one main composed.
///
/// THE ARITHMETIC. Swift's `+` and `-` on an `Int` TRAP on overflow, and a trap
/// ends the app: an `othersOmitted` of `Int.max` did exactly that on the list's
/// refresh. So a sum or a difference over a door number is taken here, with
/// `addingReportingOverflow` and `subtractingReportingOverflow`, and answers
/// nil when an operand is outside the bound or the result overflows. The
/// caller treats nil as a malformed answer (`DoorFailure.malformed`), which
/// every screen draws as `Copy.answerUnreadable`.
///
/// conformance:ios rule (k) holds the rest as text: every door number is
/// decoded through the bound, this enum does no bare arithmetic of its own,
/// and no other arithmetic operator in the app is on a door number.
enum DoorNumber {
    /// `Number.MAX_SAFE_INTEGER`, 2^53 − 1. conformance:ios reads this line
    /// against JavaScript's own constant.
    static let largest = 9_007_199_254_740_991

    /// A count or an index the door could have sent.
    static func isCount(_ number: Int) -> Bool {
        number >= 0 && number <= largest
    }

    /// `a + b`, or nil when either is not a count or the sum overflows.
    static func sum(_ a: Int, _ b: Int) -> Int? {
        guard isCount(a), isCount(b) else { return nil }
        let (value, overflow) = a.addingReportingOverflow(b)
        return overflow ? nil : value
    }

    /// `a - b`, or nil when either is not a count, the difference overflows,
    /// or it is negative, which no count or index is.
    static func difference(_ a: Int, _ b: Int) -> Int? {
        guard isCount(a), isCount(b) else { return nil }
        let (value, overflow) = a.subtractingReportingOverflow(b)
        return overflow || !isCount(value) ? nil : value
    }
}

// MARK: - The rows

/// `SessionChoiceOption`: one numbered option the agent drew. The marker is
/// the agent's own, never an index.
struct PocketChoiceOption: Equatable, Hashable, Sendable {
    let marker: String
    let text: String
}

extension PocketChoiceOption: Codable {
    enum CodingKeys: String, CodingKey { case marker, text }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        marker = try c.decode(String.self, forKey: .marker)
        text = try c.decode(String.self, forKey: .text)
    }
}

/// `PocketBlockedRow`: one session as the list draws it. The same shape serves
/// both lists (`rows` and `others`).
struct PocketBlockedRow: Equatable, Sendable, Identifiable {
    let sessionId: String
    let name: String
    let project: String
    /// Where the session runs, drawn. Nil is this Mac.
    let machine: String?
    let agent: String
    let agentLabel: String
    let statusLabel: String
    let statusTitle: String
    let statusDot: String
    let question: String?
    let choices: [PocketChoiceOption]
    let blockedSince: Double
    let seenAtWake: Bool
    let ageText: String
    /// Whether the Mac offers End on this row (Phase 317), decided in main by
    /// both of the Mac's End gates. A Mac older than 317 sends none, which is
    /// `.none`: no End is drawn. The press asks main again by id, so this
    /// decides what is drawn and nothing else.
    var end: PocketEndOffer = .none

    var id: String { sessionId }
    var dot: StatusDot { StatusDot(name: statusDot) }
}

extension PocketBlockedRow: Codable {
    enum CodingKeys: String, CodingKey {
        case sessionId, name, project, machine, agent, agentLabel, statusLabel, statusTitle
        case statusDot, question, choices, blockedSince, seenAtWake, ageText, end
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        sessionId = try c.decode(String.self, forKey: .sessionId)
        name = try c.decode(String.self, forKey: .name)
        project = try c.decode(String.self, forKey: .project)
        machine = try c.nullable(String.self, forKey: .machine)
        agent = try c.decode(String.self, forKey: .agent)
        agentLabel = try c.decode(String.self, forKey: .agentLabel)
        statusLabel = try c.decode(String.self, forKey: .statusLabel)
        statusTitle = try c.decode(String.self, forKey: .statusTitle)
        statusDot = try c.decode(String.self, forKey: .statusDot)
        question = try c.nullable(String.self, forKey: .question)
        choices = try c.decode([PocketChoiceOption].self, forKey: .choices)
        blockedSince = try c.decode(Double.self, forKey: .blockedSince)
        seenAtWake = try c.decode(Bool.self, forKey: .seenAtWake)
        ageText = try c.decode(String.self, forKey: .ageText)
        // Absent on a Mac older than Phase 317: no End is offered.
        end = try c.decodeIfPresent(PocketEndOffer.self, forKey: .end) ?? .none
    }
}

// MARK: - End (Phase 317)

/// `PocketEndOffer`: End on one row, as main decided it.
///
///   - `offered`: both gates say yes now. `batch` is false only for the Mac
///     batch's one narrowing (a session on a machine Tortie holds no row for),
///     which a single End may clear and End these never touches.
///   - `unreachable`: Tortie cannot see whether it runs. `title` is the Mac's
///     own sentence, drawn under an End that is off.
///   - `none`: no End is drawn.
///
/// A state word this build does not know is `.none`: a newer Mac's offer is
/// never guessed into a press that ends something. A KNOWN word missing its
/// field refuses the whole answer, as a missing field does everywhere here.
enum PocketEndOffer: Equatable, Sendable {
    case offered(batch: Bool)
    case unreachable(title: String)
    case none

    /// Whether End may be pressed on this row from the session screen.
    var isOffered: Bool {
        if case .offered = self { return true }
        return false
    }

    /// Whether End these may end this row: offered, and not the batch's one
    /// narrowing.
    var batchMayEnd: Bool {
        if case .offered(let batch) = self { return batch }
        return false
    }
}

extension PocketEndOffer: Codable {
    enum CodingKeys: String, CodingKey { case state, batch, title }

    /// The three words, spelled once.
    enum Word {
        static let offered = "offered"
        static let unreachable = "unreachable"
        static let none = "none"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        switch try c.decode(String.self, forKey: .state) {
        case Word.offered:
            self = .offered(batch: try c.decode(Bool.self, forKey: .batch))
        case Word.unreachable:
            self = .unreachable(title: try c.decode(String.self, forKey: .title))
        default:
            self = .none
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .offered(let batch):
            try c.encode(Word.offered, forKey: .state)
            try c.encode(batch, forKey: .batch)
        case .unreachable(let title):
            try c.encode(Word.unreachable, forKey: .state)
            try c.encode(title, forKey: .title)
        case .none:
            try c.encode(Word.none, forKey: .state)
        }
    }
}

/// `PocketEndConfirm`: the Mac's own End confirmation for one session, word for
/// word, composed in main by `endSessionConfirm` over main's own row. The phone
/// draws it and writes none of it.
struct PocketEndConfirm: Equatable, Sendable {
    let title: String
    let body: String
    let confirmLabel: String
}

extension PocketEndConfirm: Codable {
    enum CodingKeys: String, CodingKey { case title, body, confirmLabel }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        title = try c.decode(String.self, forKey: .title)
        body = try c.decode(String.self, forKey: .body)
        confirmLabel = try c.decode(String.self, forKey: .confirmLabel)
    }
}

/// `PocketWriteAnswer`: what a write (`POST /v1/end`, and since Phase 318
/// `/v1/choose` and `/v1/say`) answers with a 200. Every word is
/// one of a CLOSED set, and the answer refuses whole when a word is not, or
/// when its fields disagree with its outcome (a reason exactly
/// when refused, a sentence exactly when not done). The client turns any
/// refusal of this shape into "no answer" (Door/DoorClient.swift
/// `WriteResult`), because the bytes reached the Mac and what it did is not
/// known.
struct PocketWriteAnswer: Equatable, Sendable {
    /// The write the answer is about. `choose` and `say` are Phase 318's,
    /// `keys` Phase 337's.
    enum Verb: String, Sendable, Codable { case end, choose, say, keys }
    enum Outcome: String, Sendable, Codable { case done, refused, failed, busy }
    /// Why a write was refused. The last seven are Phase 318's: the question
    /// moved (`changed`), a press the Mac does not offer (`unpressable`), a
    /// session not at its own empty prompt (`unsayable`), the door stopping
    /// before the act (`stopped`), and the message's own three (`empty`,
    /// `long`, `character`). The phone draws the Mac's sentence, never the word.
    enum Reason: String, Sendable, Codable {
        case removed, unreachable, ended, gone, malformed
        case changed, unpressable, unsayable, stopped, empty, long, character
    }

    let verb: Verb
    /// The write id the request carried, echoed; `""` only on the one
    /// `refused` `malformed` answer the Mac makes when it could read no id.
    let write: String
    let outcome: Outcome
    let reason: Reason?
    /// The owner's words; nil exactly when `done`.
    let sentence: String?
}

extension PocketWriteAnswer: Codable {
    enum CodingKeys: String, CodingKey { case verb, write, outcome, reason, sentence }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        verb = try c.decode(Verb.self, forKey: .verb)
        write = try c.decode(String.self, forKey: .write)
        outcome = try c.decode(Outcome.self, forKey: .outcome)
        reason = try c.nullable(Reason.self, forKey: .reason)
        sentence = try c.nullable(String.self, forKey: .sentence)
        // A reason exactly when refused.
        guard (reason != nil) == (outcome == .refused) else {
            throw DecodingError.dataCorruptedError(forKey: .reason, in: c, debugDescription: "a reason comes with refused, and only with it")
        }
        // A sentence, and a non-empty one, exactly when not done.
        let said = sentence.map { !$0.isEmpty } ?? false
        guard said == (outcome != .done), sentence == nil || said else {
            throw DecodingError.dataCorruptedError(forKey: .sentence, in: c, debugDescription: "a sentence comes with every outcome but done")
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(verb, forKey: .verb)
        try c.encode(write, forKey: .write)
        try c.encode(outcome, forKey: .outcome)
        try c.encode(reason, forKey: .reason)
        try c.encode(sentence, forKey: .sentence)
    }
}

// MARK: - Reply (Phase 318)

/// `PocketReplyOffer`: what the phone may do with one session's question or
/// prompt, decided in main over ONE fresh reading (build/p318/SPEC.md section
/// 5.2). The phone draws it and decides nothing: a press echoes `question`
/// and `mark` and names one of `pressable`, and the Mac asks everything again
/// by id when the write arrives.
///
///   - `question` and `mark`: what a press echoes. Null exactly when
///     `pressable` is empty.
///   - `pressable`: the markers of the options that may be pressed now, each
///     one of the same answer's own `choices`, in the order they are drawn.
///   - `command`: what the agent asks to run, when its question does not say
///     it (Codex's `$` line), drawn under the question. Null otherwise.
///   - `canSay`: whether one message may be sent now.
///
/// DECODED STRICTLY. A `reply` the Mac did not send (a Mac older than 318)
/// is the empty offer: no button and no box. A `reply` with a field missing
/// or of the wrong type refuses the whole answer, as every field does here.
/// An offer whose fields disagree with each other or with the options the
/// same answer draws (`agrees(with:)`) is read as the empty offer: a door
/// that says something this build cannot square never becomes a button.
struct PocketReplyOffer: Equatable, Sendable {
    let question: String?
    let mark: String?
    let pressable: [String]
    let command: String?
    let canSay: Bool

    /// No button and no box: main's `POCKET_NO_REPLY`.
    static let empty = PocketReplyOffer(question: nil, mark: nil, pressable: [], command: nil, canSay: false)

    /// A question id's two halves, as main mints it (`src/main/reply/question-id.ts`):
    /// 16 lowercase hex, `-`, then 1 to 16 decimal digits with no leading zero.
    static let questionPrefixLength = 16
    static let questionCountDigits = 1...16
    /// A mark is `hashScreen`'s shape: 12 lowercase hex.
    static let markLength = 12

    /// Whether this offer says one thing, and only about options `choices`
    /// draws: a press half that is all there or all absent, well formed,
    /// naming drawn options in drawn order once each, a command only beside a
    /// press, and never a press and a message at once (a press needs a waiting
    /// session, a message one that is not).
    func agrees(with choices: [PocketChoiceOption]) -> Bool {
        guard !pressable.isEmpty else {
            return question == nil && mark == nil && command == nil
        }
        guard let question, let mark, !canSay,
              Self.isQuestionId(question), Self.isMark(mark),
              pressable.allSatisfy(Self.isMarker) else { return false }
        // A subsequence of the drawn markers: in drawn order, each once.
        var wanted = pressable.makeIterator()
        var next = wanted.next()
        for option in choices where option.marker == next {
            next = wanted.next()
        }
        return next == nil
    }

    /// `<16 lowercase hex>-<1 to 16 digits, no leading zero but 0 itself>`.
    static func isQuestionId(_ text: String) -> Bool {
        let halves = text.split(separator: "-", omittingEmptySubsequences: false)
        guard halves.count == 2, let prefix = halves.first, let count = halves.last else { return false }
        guard prefix.utf8.count == questionPrefixLength, prefix.utf8.allSatisfy(isLowerHex) else { return false }
        guard questionCountDigits.contains(count.utf8.count), count.utf8.allSatisfy(isDigit) else { return false }
        return count == "0" || count.first != "0"
    }

    /// 12 lowercase hex.
    static func isMark(_ text: String) -> Bool {
        text.utf8.count == markLength && text.utf8.allSatisfy(isLowerHex)
    }

    /// One character, `1` to `9`: the agent's own marker as main reads it.
    static func isMarker(_ text: String) -> Bool {
        guard text.utf8.count == 1, let byte = text.utf8.first else { return false }
        return byte >= UInt8(ascii: "1") && byte <= UInt8(ascii: "9")
    }

    private static func isLowerHex(_ byte: UInt8) -> Bool {
        isDigit(byte) || (byte >= UInt8(ascii: "a") && byte <= UInt8(ascii: "f"))
    }

    private static func isDigit(_ byte: UInt8) -> Bool {
        byte >= UInt8(ascii: "0") && byte <= UInt8(ascii: "9")
    }
}

extension PocketReplyOffer: Codable {
    enum CodingKeys: String, CodingKey { case question, mark, pressable, command, canSay }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        question = try c.nullable(String.self, forKey: .question)
        mark = try c.nullable(String.self, forKey: .mark)
        pressable = try c.decode([String].self, forKey: .pressable)
        command = try c.nullable(String.self, forKey: .command)
        canSay = try c.decode(Bool.self, forKey: .canSay)
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(question, forKey: .question)
        try c.encode(mark, forKey: .mark)
        try c.encode(pressable, forKey: .pressable)
        try c.encode(command, forKey: .command)
        try c.encode(canSay, forKey: .canSay)
    }
}

/// The dot's name, for its colour only. The WORD beside it is always main's.
enum StatusDot: String, Sendable, CaseIterable {
    case attention, working, idle, ended, failed
    /// A name this build does not know. Drawn neutral, never guessed at.
    case unknown

    init(name: String) {
        self = StatusDot(rawValue: name) ?? .unknown
    }
}

// MARK: - One session

/// `PocketCatchUp`: the Catch Me Up line, built in main.
struct PocketCatchUp: Equatable, Sendable {
    let ask: String?
    let outcome: String
}

extension PocketCatchUp: Codable {
    enum CodingKeys: String, CodingKey { case ask, outcome }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        ask = try c.nullable(String.self, forKey: .ask)
        outcome = try c.decode(String.self, forKey: .outcome)
    }
}

/// `PocketHandoff`. Null for every session in Phase 316; the phone draws none.
struct PocketHandoff: Equatable, Sendable {
    let kind: String
    let url: String
    let label: String
}

extension PocketHandoff: Codable {
    enum CodingKeys: String, CodingKey { case kind, url, label }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        kind = try c.decode(String.self, forKey: .kind)
        url = try c.decode(String.self, forKey: .url)
        label = try c.decode(String.self, forKey: .label)
    }
}

/// `OverviewSessionActivity`: the session manager's own counts. A null count
/// is never a zero, and the phone draws it the way the desktop draws a null.
struct PocketSessionActivity: Equatable, Sendable {
    let sessionId: String
    /// `complete`, `partial`, `unavailable` or `not-applicable`.
    let coverage: String
    let reason: String?
    let userMessages: Int?
    let agentMessages: Int?
    let lastMessageAt: Double?
    /// `you`, `agent`, or nil.
    let lastMessageBy: String?
    /// `message`, `ask`, `session`, or nil.
    let lastMessageClock: String?
    let readAt: Double?
}

extension PocketSessionActivity: Codable {
    enum CodingKeys: String, CodingKey {
        case sessionId, coverage, reason, userMessages, agentMessages
        case lastMessageAt, lastMessageBy, lastMessageClock, readAt
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        sessionId = try c.decode(String.self, forKey: .sessionId)
        coverage = try c.decode(String.self, forKey: .coverage)
        reason = try c.nullable(String.self, forKey: .reason)
        userMessages = try c.nullableDoorNumber(forKey: .userMessages)
        agentMessages = try c.nullableDoorNumber(forKey: .agentMessages)
        lastMessageAt = try c.nullable(Double.self, forKey: .lastMessageAt)
        lastMessageBy = try c.nullable(String.self, forKey: .lastMessageBy)
        lastMessageClock = try c.nullable(String.self, forKey: .lastMessageClock)
        readAt = try c.nullable(Double.self, forKey: .readAt)
    }
}

/// `PocketSessionDetail`, which extends the row. The row's fields are read
/// through it (`detail.statusTitle`), so the two cannot drift apart.
@dynamicMemberLookup
struct PocketSessionDetail: Equatable, Sendable {
    let row: PocketBlockedRow
    let catchUp: PocketCatchUp?
    let lastAnswer: String?
    let turnCount: Int
    let handoff: PocketHandoff?
    let activity: PocketSessionActivity?
    /// Null exactly when the counts carry no time. Never drawn as a zero.
    let lastMessageText: String?
    /// The Mac's own End confirmation for this session (Phase 317): present
    /// exactly when the row's `end` is `offered`, and absent on a Mac older
    /// than 317. An End is drawn only with it, so the phone never makes up
    /// the words of a confirmation.
    var endConfirm: PocketEndConfirm?
    /// What the phone may press or send on this session (Phase 318), as the
    /// door sent it: nil from a Mac older than 318, and the empty offer when
    /// what it sent does not agree with itself or with this answer's options.
    /// Read through `replyOffer`.
    var reply: PocketReplyOffer?
    /// Whether the session's own screen may be opened (Phase 337): true for a
    /// running session on a Mac with that phase, which composes it in one
    /// place (`session()` in src/main/pocket/routes.ts). Absent from an older
    /// Mac, which is false: no Screen row, and nothing to refuse. Read through
    /// `drawsScreen`.
    var screen: Bool?

    /// The offer to draw: absent reads as the empty offer (no button, no box).
    var replyOffer: PocketReplyOffer { reply ?? .empty }

    /// The Screen row is drawn: the Mac said true. Absent is false.
    var drawsScreen: Bool { screen ?? false }

    subscript<T>(dynamicMember path: KeyPath<PocketBlockedRow, T>) -> T {
        row[keyPath: path]
    }
}

extension PocketSessionDetail: Codable {
    enum CodingKeys: String, CodingKey {
        case catchUp, lastAnswer, turnCount, handoff, activity, lastMessageText, endConfirm, reply, screen
    }

    init(from decoder: Decoder) throws {
        row = try PocketBlockedRow(from: decoder)
        let c = try decoder.container(keyedBy: CodingKeys.self)
        catchUp = try c.nullable(PocketCatchUp.self, forKey: .catchUp)
        lastAnswer = try c.nullable(String.self, forKey: .lastAnswer)
        turnCount = try c.doorNumber(forKey: .turnCount)
        handoff = try c.nullable(PocketHandoff.self, forKey: .handoff)
        activity = try c.nullable(PocketSessionActivity.self, forKey: .activity)
        lastMessageText = try c.nullable(String.self, forKey: .lastMessageText)
        // Absent on a Mac older than Phase 317, and null on every row End is
        // not offered on.
        endConfirm = try c.decodeIfPresent(PocketEndConfirm.self, forKey: .endConfirm)
        // Absent on a Mac older than Phase 318. A present offer is read
        // strictly, and one that does not agree with this answer's own
        // options is the empty offer (PocketReplyOffer).
        if let offered = try c.decodeIfPresent(PocketReplyOffer.self, forKey: .reply) {
            reply = offered.agrees(with: row.choices) ? offered : .empty
        } else {
            reply = nil
        }
        // Absent on a Mac older than Phase 337; anything but a boolean
        // refuses the answer, as every field does here.
        screen = try c.decodeIfPresent(Bool.self, forKey: .screen)
    }

    func encode(to encoder: Encoder) throws {
        try row.encode(to: encoder)
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encodeIfPresent(catchUp, forKey: .catchUp)
        try c.encodeIfPresent(lastAnswer, forKey: .lastAnswer)
        try c.encode(turnCount, forKey: .turnCount)
        try c.encodeIfPresent(handoff, forKey: .handoff)
        try c.encodeIfPresent(activity, forKey: .activity)
        try c.encodeIfPresent(lastMessageText, forKey: .lastMessageText)
        try c.encodeIfPresent(endConfirm, forKey: .endConfirm)
        try c.encodeIfPresent(reply, forKey: .reply)
        try c.encodeIfPresent(screen, forKey: .screen)
    }
}

// MARK: - One turn

/// `PocketTurn`: already redacted and already clipped in main. The phone never
/// clips it again. The ASK IS PLAIN TEXT and is drawn verbatim, never as
/// markdown (his ruling); the answer is drawn as markdown.
struct PocketTurn: Equatable, Sendable, Identifiable {
    let index: Int
    let askText: String
    let askClipped: Bool
    let askAt: String?
    let answerText: String?
    let answerClipped: Bool
    let answerAt: String?
    let closed: Bool
    let interrupted: Bool
    let notice: String?
    /// Main's sentence for a turn with no answer on record, else nil.
    let absence: String?

    var id: Int { index }
}

extension PocketTurn: Codable {
    enum CodingKeys: String, CodingKey {
        case index, askText, askClipped, askAt, answerText, answerClipped
        case answerAt, closed, interrupted, notice, absence
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        index = try c.doorNumber(forKey: .index)
        askText = try c.decode(String.self, forKey: .askText)
        askClipped = try c.decode(Bool.self, forKey: .askClipped)
        askAt = try c.nullable(String.self, forKey: .askAt)
        answerText = try c.nullable(String.self, forKey: .answerText)
        answerClipped = try c.decode(Bool.self, forKey: .answerClipped)
        answerAt = try c.nullable(String.self, forKey: .answerAt)
        closed = try c.decode(Bool.self, forKey: .closed)
        interrupted = try c.decode(Bool.self, forKey: .interrupted)
        notice = try c.nullable(String.self, forKey: .notice)
        absence = try c.nullable(String.self, forKey: .absence)
    }
}

// MARK: - The three answers

/// `PocketBlockedAnswer`: every session waiting on him, then everything else.
struct PocketBlockedAnswer: Equatable, Sendable {
    let rows: [PocketBlockedRow]
    let others: [PocketBlockedRow]
    let othersOmitted: Int
    let at: Double
    let emptyLine: String
    let ageNote: String
}

extension PocketBlockedAnswer: Codable {
    enum CodingKeys: String, CodingKey { case rows, others, othersOmitted, at, emptyLine, ageNote }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        rows = try c.decode([PocketBlockedRow].self, forKey: .rows)
        others = try c.decode([PocketBlockedRow].self, forKey: .others)
        othersOmitted = try c.doorNumber(forKey: .othersOmitted)
        at = try c.decode(Double.self, forKey: .at)
        emptyLine = try c.decode(String.self, forKey: .emptyLine)
        ageNote = try c.decode(String.self, forKey: .ageNote)
    }
}

// MARK: - Every session, shown, grouped and sorted as asked (Phase 316.7)
//
// `GET /v1/sessions`, build/p3167/SPEC.md section 6.1. Main decides which
// sessions the words keep, which project each is in, the order, every age and
// every count, and the caps (2,000 rows and 1 MiB, chosen waiting first); the
// phone checks the answer is one main could have composed
// (Screens/SessionsScreen.swift `SessionsDrawing`) and lays it out.
//
// Every whole number here is a door number, decoded through the bound, and
// each Swift name is distinct from every other name in the app (`groupIndex`,
// `sessionCount`, `omittedRows`, `totalSessions`), because conformance:ios
// rule (k) reads an operand naming a door field as arithmetic on the door's
// number, and a field called `count` would make every `.count` in the app one.

/// `PocketSessionsAsked`: the words main read, echoed. A word this build does
/// not know refuses the whole answer, so an answer to another question is
/// never drawn as this one.
struct PocketSessionsAsked: Equatable, Sendable {
    let show: SessionsShow
    let group: SessionsGroupBy
    let sort: SessionsSortBy
    let agent: String?
    let machine: String?

    /// Whether this is the question `query` asked, word for word.
    func answers(_ query: SessionsQuery) -> Bool {
        show == query.show && group == query.group && sort == query.sort
            && agent == query.agent && machine == query.machine
    }
}

extension PocketSessionsAsked: Codable {
    enum CodingKeys: String, CodingKey { case show, group, sort, agent, machine }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        show = try c.decode(SessionsShow.self, forKey: .show)
        group = try c.decode(SessionsGroupBy.self, forKey: .group)
        sort = try c.decode(SessionsSortBy.self, forKey: .sort)
        agent = try c.nullable(String.self, forKey: .agent)
        machine = try c.nullable(String.self, forKey: .machine)
    }
}

/// `PocketSessionsRow`: one session as the Sessions tab draws it.
struct PocketSessionsRow: Equatable, Sendable, Identifiable {
    let sessionId: String
    /// Clipped in main to 200 UTF-16 units; the session screen draws it whole.
    let name: String
    /// An index into the answer's `groups`.
    let groupIndex: Int
    /// Where the session runs, drawn. Nil is this Mac.
    let machine: String?
    let statusDot: String
    let statusTitle: String
    /// Main's age for the clock that placed this row (D11): `4m`, `3d old`,
    /// or nil, which draws the dash, for a row with no clock at all.
    let ageText: String?
    /// The session is waiting on him (`needs_input`).
    let waiting: Bool
    /// The question, only on a waiting row, capped in main.
    let question: String?
    /// Required here: only main's composer builds these rows (Phase 317's
    /// decoder reads it, and a state word it does not know is `.none`).
    let end: PocketEndOffer

    var id: String { sessionId }
}

extension PocketSessionsRow: Codable {
    enum CodingKeys: String, CodingKey {
        case sessionId, name, machine, statusDot, statusTitle, ageText, waiting, question, end
        case groupIndex = "group"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        sessionId = try c.decode(String.self, forKey: .sessionId)
        name = try c.decode(String.self, forKey: .name)
        groupIndex = try c.doorNumber(forKey: .groupIndex)
        machine = try c.nullable(String.self, forKey: .machine)
        statusDot = try c.decode(String.self, forKey: .statusDot)
        statusTitle = try c.decode(String.self, forKey: .statusTitle)
        ageText = try c.nullable(String.self, forKey: .ageText)
        waiting = try c.decode(Bool.self, forKey: .waiting)
        question = try c.nullable(String.self, forKey: .question)
        end = try c.decode(PocketEndOffer.self, forKey: .end)
    }
}

/// `PocketSessionsGroup`: one project, a folder AND its machine (the Mac's
/// rule), as main named and counted it.
struct PocketSessionsGroup: Equatable, Sendable, Identifiable {
    /// 16 base64url characters of a hash of the group's key: stable across
    /// answers and choices, and never the path.
    let id: String
    let label: String
    /// The machine's label; nil on this Mac.
    let machine: String?
    /// The folder, only when another project shares the label and the
    /// machine (D7).
    let folder: String?
    /// How many sessions the words keep in this project, drawn or not.
    let sessionCount: Int
    /// Of `sessionCount`, the ones the caps left out.
    let omittedRows: Int
    /// Some session the words keep in this project waits on him.
    let waiting: Bool
    /// Main's: the project starts closed (under All, when none of its
    /// sessions is active).
    let collapsed: Bool
}

extension PocketSessionsGroup: Codable {
    enum CodingKeys: String, CodingKey {
        case id, label, machine, folder, waiting, collapsed
        case sessionCount = "count"
        case omittedRows = "omitted"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        label = try c.decode(String.self, forKey: .label)
        machine = try c.nullable(String.self, forKey: .machine)
        folder = try c.nullable(String.self, forKey: .folder)
        sessionCount = try c.doorNumber(forKey: .sessionCount)
        omittedRows = try c.doorNumber(forKey: .omittedRows)
        waiting = try c.decode(Bool.self, forKey: .waiting)
        collapsed = try c.decode(Bool.self, forKey: .collapsed)
    }
}

/// `PocketSessionsChoice`: one agent or machine the menu may offer. The label
/// is null only for the machine `local`, which the phone calls This Mac.
struct PocketSessionsChoice: Equatable, Sendable, Identifiable {
    let id: String
    let label: String?

    /// The machine id main gives this Mac, in a filter and in a choice.
    static let thisMacId = "local"
}

extension PocketSessionsChoice: Codable {
    enum CodingKeys: String, CodingKey { case id, label }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        label = try c.nullable(String.self, forKey: .label)
    }
}

/// `PocketSessionsAnswer`: what `GET /v1/sessions` answers.
struct PocketSessionsAnswer: Equatable, Sendable {
    let asked: PocketSessionsAsked
    let rows: [PocketSessionsRow]
    /// Exactly the groups `rows` name, in the order their first row is emitted.
    let groups: [PocketSessionsGroup]
    /// Over the sessions Show keeps, before the filters.
    let agents: [PocketSessionsChoice]
    let machines: [PocketSessionsChoice]
    /// Every session Tortie lists, before Show and the filters.
    let totalSessions: Int
    /// The sessions the words keep that the caps left out: the kept count
    /// less the rows. At least the sum of the groups' `omittedRows`, and more
    /// when the caps left out every row of a project, which is then in no
    /// group.
    let omittedRows: Int
    let at: Double
    let ageNote: String
}

extension PocketSessionsAnswer: Codable {
    enum CodingKeys: String, CodingKey {
        case asked, rows, groups, agents, machines, at, ageNote
        case totalSessions = "total"
        case omittedRows = "omitted"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        asked = try c.decode(PocketSessionsAsked.self, forKey: .asked)
        rows = try c.decode([PocketSessionsRow].self, forKey: .rows)
        groups = try c.decode([PocketSessionsGroup].self, forKey: .groups)
        agents = try c.decode([PocketSessionsChoice].self, forKey: .agents)
        machines = try c.decode([PocketSessionsChoice].self, forKey: .machines)
        totalSessions = try c.doorNumber(forKey: .totalSessions)
        omittedRows = try c.doorNumber(forKey: .omittedRows)
        at = try c.decode(Double.self, forKey: .at)
        ageNote = try c.decode(String.self, forKey: .ageNote)
    }
}

/// `PocketSessionAnswer`.
struct PocketSessionAnswer: Equatable, Sendable {
    let session: PocketSessionDetail
    let at: Double
}

extension PocketSessionAnswer: Codable {
    enum CodingKeys: String, CodingKey { case session, at }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        session = try c.decode(PocketSessionDetail.self, forKey: .session)
        at = try c.decode(Double.self, forKey: .at)
    }
}

/// `PocketTurnsAnswer`: ascending by index, newest LAST.
struct PocketTurnsAnswer: Equatable, Sendable {
    let sessionId: String
    let turns: [PocketTurn]
    /// True when older turns exist before the first one here.
    let more: Bool
    let at: Double
    /// Main's sentence for why there is nothing to read here (a session on
    /// another machine), else nil. Not an error.
    let note: String?
}

extension PocketTurnsAnswer: Codable {
    enum CodingKeys: String, CodingKey { case sessionId, turns, more, at, note }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        sessionId = try c.decode(String.self, forKey: .sessionId)
        turns = try c.decode([PocketTurn].self, forKey: .turns)
        more = try c.decode(Bool.self, forKey: .more)
        at = try c.decode(Double.self, forKey: .at)
        note = try c.nullable(String.self, forKey: .note)
    }
}

/// `PocketPairAnswer`: what `POST /pair` answers, ONE of three, and nothing
/// else decodes (build/p330/SPEC.md section 4.8.3). `allowed` is the only one
/// that carries anything: the certificate the Mac issued over this phone's
/// client key, DER, base64url. A certificate on any other answer, or none on
/// `allowed`, refuses the answer, and the pairing stops with a sentence.
///
/// `pending` says one more thing since Phase 316.5: whether THIS Mac can send
/// an alert (`"alerts": true`), which it can only while it keeps an Apple push
/// key and its alert switch is on. Alerts are the key holder's alone (research
/// 136 section 9, research 127 section 11.6), so a phone asks iOS for alerts
/// only when the Mac it is presenting to says so, and a Mac that cannot send
/// answers exactly the bytes it answered before (the field is absent). A value
/// that is not a boolean refuses the answer; on `refused` and `allowed` the
/// field says nothing and is not read.
enum PairAnswer: Sendable, Equatable {
    case pending(macSends: Bool)
    case refused
    case allowed(certificate: Data)

    /// Far above any certificate the Mac issues (a few hundred bytes).
    static let certificateCap = 4096
}

extension PairAnswer: Decodable {
    enum CodingKeys: String, CodingKey { case state, cert, alerts }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let word = try c.decode(String.self, forKey: .state)
        switch word {
        case "pending", "refused":
            guard !c.contains(.cert) else {
                throw DecodingError.dataCorruptedError(forKey: .cert, in: c, debugDescription: "a certificate only comes with allowed")
            }
            if word == "pending" {
                // Absent, or `null`, is a Mac that cannot send; anything but a
                // boolean is not an answer.
                self = .pending(macSends: try c.decodeIfPresent(Bool.self, forKey: .alerts) ?? false)
            } else {
                self = .refused
            }
        case "allowed":
            let text = try c.decode(String.self, forKey: .cert)
            guard let der = Base64URL.decode(text), !der.isEmpty, der.count <= Self.certificateCap else {
                throw DecodingError.dataCorruptedError(forKey: .cert, in: c, debugDescription: "not a certificate")
            }
            self = .allowed(certificate: der)
        default:
            throw DecodingError.dataCorruptedError(forKey: .state, in: c, debugDescription: "not one of pending, allowed, refused")
        }
    }
}

// MARK: - The session's own screen (Phase 337)
//
// `GET /v1/screen?id=<session>[&since=<revision>]`, build/p337/SPEC.md
// sections 5.2 and 5.8.2. The Mac composes the screen tmux shows now: rows of
// runs, each run text of one style and the columns it covers, measured by
// tmux's own widths; every colour already resolved to `#rrggbb` exactly as
// the Mac's own dark terminal draws it (D12). The phone draws it and decides
// nothing about it: no emulator, no parser of the session's bytes (his
// ruling 4).
//
// DECODED STRICTLY, because a picture somebody else composed is drawn into a
// grid whose every index the phone trusts: the revision is 12 lowercase hex;
// `unchanged` is true exactly when the screen and the absence are both null;
// the width is 1 to 512 and the height 1 to 200; the cursor's column is 0 to
// the width and its row inside the height; every run's style is an index into
// the styles, every run covers 1 to the width, and a row's runs together
// cover no more than the width, summed through `DoorNumber`; there are
// exactly as many rows as the height and at most 1,024 styles; every colour is
// `#` and six lowercase hex digits; the question id is main's shape and the
// window's mark 12 lowercase hex or null. Anything else refuses the whole
// answer (`DoorFailure.malformed`), so no half-trusted picture is ever drawn.
//
// THE NAMES. Every whole number here is a door number, decoded through the
// bound, under a Swift name no other value in the app has (`screenColumns`,
// `screenRows`, `cursorColumn`, `cursorRow`, `runStyle`, `runCells`), for
// rule (k)'s reason stated above `PocketSessionsAsked`.

/// A colour the door names (D12), as the three bytes `#rrggbb` spells. Made
/// ONLY by `read(_:)`, the seven-character reader below (conformance:ios rule
/// am), and drawn only through `Token.drawn(_:)` in Style/Tokens.swift, the
/// one file that makes a colour.
struct ScreenColor: Equatable, Hashable, Sendable {
    /// Red, green and blue, in that order: each the byte two of the six hex
    /// digits spell. Three bytes, not a number the door sent.
    let channels: SIMD3<UInt8>

    var red: UInt8 { channels.x }
    var green: UInt8 { channels.y }
    var blue: UInt8 { channels.z }

    private init(channels: SIMD3<UInt8>) {
        self.channels = channels
    }

    /// `#` and six digits.
    static let spelledLength = 7

    /// The one maker: exactly `#` and six LOWERCASE hex digits, the shape
    /// checked byte by byte first, then the six digits read by
    /// `UInt32(_:radix:)`, which can only answer a value under 2^24 for them.
    /// Anything else is nil, and the answer that carried it is refused.
    static func read(_ text: String) -> ScreenColor? {
        let bytes = Array(text.utf8)
        guard bytes.count == spelledLength, bytes.first == UInt8(ascii: "#"),
              bytes.dropFirst().allSatisfy(isLowerHex),
              let value = UInt32(String(text.dropFirst()), radix: 16) else { return nil }
        return ScreenColor(channels: SIMD3(
            UInt8(truncatingIfNeeded: value >> 16),
            UInt8(truncatingIfNeeded: value >> 8),
            UInt8(truncatingIfNeeded: value)
        ))
    }

    private static func isLowerHex(_ byte: UInt8) -> Bool {
        (byte >= UInt8(ascii: "0") && byte <= UInt8(ascii: "9")) || (byte >= UInt8(ascii: "a") && byte <= UInt8(ascii: "f"))
    }
}

extension KeyedDecodingContainer {
    /// A `#rrggbb` the contract always sends, or a refusal of the answer.
    func screenColor(forKey key: Key) throws -> ScreenColor {
        guard let color = ScreenColor.read(try decode(String.self, forKey: key)) else {
            throw DecodingError.dataCorruptedError(forKey: key, in: self, debugDescription: "not #rrggbb in lowercase")
        }
        return color
    }
}

/// `PocketScreenStyle`: one style of the answer's table, its colours already
/// resolved on the Mac (D12). `bg` null is the screen's own ground.
struct PocketScreenStyle: Equatable, Hashable, Sendable {
    let fg: ScreenColor
    let bg: ScreenColor?
    let bold: Bool
    let dim: Bool
    let italic: Bool
    let underline: Bool
    let strike: Bool
}

extension PocketScreenStyle: Decodable {
    enum CodingKeys: String, CodingKey { case fg, bg, bold, dim, italic, underline, strike }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        fg = try c.screenColor(forKey: .fg)
        if try c.nullable(String.self, forKey: .bg) == nil {
            bg = nil
        } else {
            bg = try c.screenColor(forKey: .bg)
        }
        bold = try c.decode(Bool.self, forKey: .bold)
        dim = try c.decode(Bool.self, forKey: .dim)
        italic = try c.decode(Bool.self, forKey: .italic)
        underline = try c.decode(Bool.self, forKey: .underline)
        strike = try c.decode(Bool.self, forKey: .strike)
    }
}

/// `PocketScreenRun`: text of one style, and the columns it covers by tmux's
/// own widths: one column for each narrow cell, or the one wide cell's two
/// (a cell wider or narrower than one column is always its own run, D9).
struct PocketScreenRun: Equatable, Hashable, Sendable {
    let text: String
    /// An index into the answer's `styles`.
    let runStyle: Int
    /// The columns this run covers.
    let runCells: Int
}

extension PocketScreenRun: Decodable {
    enum CodingKeys: String, CodingKey {
        case text
        case runStyle = "style"
        case runCells = "cells"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        text = try c.decode(String.self, forKey: .text)
        runStyle = try c.doorNumber(forKey: .runStyle)
        runCells = try c.doorNumber(forKey: .runCells)
    }
}

/// `PocketScreen.cursor`: where tmux's cursor is, and whether it is shown.
struct PocketScreenCursor: Equatable, Sendable {
    /// `x`: 0 to the width (tmux puts the cursor one past the last column
    /// after a full row).
    let cursorColumn: Int
    /// `y`: a row of the screen.
    let cursorRow: Int
    let visible: Bool
}

extension PocketScreenCursor: Decodable {
    enum CodingKeys: String, CodingKey {
        case visible
        case cursorColumn = "x"
        case cursorRow = "y"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        cursorColumn = try c.doorNumber(forKey: .cursorColumn)
        cursorRow = try c.doorNumber(forKey: .cursorRow)
        visible = try c.decode(Bool.self, forKey: .visible)
    }
}

/// `PocketScreen`: the screen tmux shows now, at the Mac's own width and
/// height. The phone never sizes it (his ruling 2).
struct PocketScreen: Equatable, Sendable {
    /// The caps the Mac composes under (`POCKET_SCREEN_MAX_COLS`,
    /// `POCKET_SCREEN_MAX_ROWS`, `POCKET_SCREEN_MAX_STYLES`).
    static let widest = 512
    static let tallest = 200
    static let mostStyles = 1_024

    /// `cols`.
    let screenColumns: Int
    /// `rows`.
    let screenRows: Int
    let cursor: PocketScreenCursor
    /// The program drew on the alternate screen.
    let alternate: Bool
    /// The Mac's own terminal colours: its ground, its default ink, its cursor.
    let ground: ScreenColor
    let ink: ScreenColor
    let caret: ScreenColor
    let styles: [PocketScreenStyle]
    /// Exactly `screenRows` rows; a row with nothing on it is empty.
    let lines: [[PocketScreenRun]]
    /// The question id now, echoed by a keys write.
    let turn: String
    /// A numbered question is drawn, or the session waits on him.
    let asking: Bool
    /// The window's mark while asking, echoed by a keys write; nil otherwise.
    let dialog: String?
    /// Keys are taken now.
    let typable: Bool
}

extension PocketScreen: Decodable {
    enum CodingKeys: String, CodingKey {
        case cursor, alternate, ground, ink, caret, styles, lines, turn, asking, dialog, typable
        case screenColumns = "cols"
        case screenRows = "rows"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        screenColumns = try c.doorNumber(forKey: .screenColumns)
        screenRows = try c.doorNumber(forKey: .screenRows)
        cursor = try c.decode(PocketScreenCursor.self, forKey: .cursor)
        alternate = try c.decode(Bool.self, forKey: .alternate)
        ground = try c.screenColor(forKey: .ground)
        ink = try c.screenColor(forKey: .ink)
        caret = try c.screenColor(forKey: .caret)
        styles = try c.decode([PocketScreenStyle].self, forKey: .styles)
        lines = try c.decode([[PocketScreenRun]].self, forKey: .lines)
        turn = try c.decode(String.self, forKey: .turn)
        asking = try c.decode(Bool.self, forKey: .asking)
        dialog = try c.nullable(String.self, forKey: .dialog)
        typable = try c.decode(Bool.self, forKey: .typable)
        guard Self.holdsTogether(
            columns: screenColumns, rows: screenRows, cursor: cursor, styles: styles.count,
            lines: lines, turn: turn, dialog: dialog
        ) else {
            throw DecodingError.dataCorruptedError(forKey: .lines, in: c, debugDescription: "a screen no Mac composed")
        }
    }

    /// Every bound of section 5.8.2, asked once, in order. Only comparisons and
    /// `DoorNumber`'s checked sum: no arithmetic of its own on a door number.
    static func holdsTogether(
        columns: Int, rows: Int, cursor: PocketScreenCursor, styles: Int,
        lines: [[PocketScreenRun]], turn: String, dialog: String?
    ) -> Bool {
        guard (1...widest).contains(columns), (1...tallest).contains(rows),
              cursor.cursorColumn <= columns, cursor.cursorRow < rows,
              styles <= mostStyles, lines.count == rows,
              PocketReplyOffer.isQuestionId(turn),
              dialog.map(PocketReplyOffer.isMark) ?? true else { return false }
        for row in lines {
            var covered = 0
            for run in row {
                guard run.runStyle < styles, run.runCells >= 1, run.runCells <= columns,
                      let next = DoorNumber.sum(covered, run.runCells), next <= columns else { return false }
                covered = next
            }
        }
        return true
    }
}

/// Why there is no screen to draw (`PocketScreenAbsence`); main says which
/// in its own sentence, drawn as it is.
enum PocketScreenAbsence: String, Sendable, Decodable {
    case ended, unreachable, large
}

/// `PocketScreenAnswer`: one answer to `GET /v1/screen`. `unchanged` says the
/// revision the phone holds is still the screen and carries nothing else;
/// otherwise exactly one of a screen or an absence with main's sentence.
struct PocketScreenAnswer: Equatable, Sendable {
    let sessionId: String
    /// 12 lowercase hex: what the phone sends back as `since`.
    let revision: String
    let at: Double
    let unchanged: Bool
    let screen: PocketScreen?
    let why: PocketScreenAbsence?
    /// Main's words for `why`; nil otherwise.
    let sentence: String?
}

extension PocketScreenAnswer: Decodable {
    enum CodingKeys: String, CodingKey { case sessionId, revision, at, unchanged, screen, why, sentence }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        sessionId = try c.decode(String.self, forKey: .sessionId)
        revision = try c.decode(String.self, forKey: .revision)
        at = try c.decode(Double.self, forKey: .at)
        unchanged = try c.decode(Bool.self, forKey: .unchanged)
        screen = try c.nullable(PocketScreen.self, forKey: .screen)
        why = try c.nullable(PocketScreenAbsence.self, forKey: .why)
        sentence = try c.nullable(String.self, forKey: .sentence)
        guard PocketReplyOffer.isMark(revision) else {
            throw DecodingError.dataCorruptedError(forKey: .revision, in: c, debugDescription: "not 12 lowercase hex")
        }
        // Unchanged carries nothing; otherwise a screen or an absence, never both.
        let carries = (screen != nil) != (why != nil)
        guard unchanged ? (screen == nil && why == nil) : carries else {
            throw DecodingError.dataCorruptedError(forKey: .unchanged, in: c, debugDescription: "unchanged exactly when nothing is carried")
        }
        // A sentence, and a non-empty one, exactly with an absence.
        let said = sentence.map { !$0.isEmpty } ?? false
        guard said == (why != nil), sentence == nil || said else {
            throw DecodingError.dataCorruptedError(forKey: .sentence, in: c, debugDescription: "a sentence comes with an absence, and only with it")
        }
    }
}

// MARK: - Keys (Phase 337)

/// The 35 keys the phone may send, by tmux's own names (D17, D18): the raw
/// values are `POCKET_SCREEN_KEY_NAMES` in src/shared/ipc/pocket.ts, word for
/// word (conformance:ios rule ai reads both). A closed set: nothing else is
/// ever named.
enum ScreenKeyName: String, CaseIterable, Sendable {
    case escape = "Escape"
    case tab = "Tab"
    case backTab = "BTab"
    case enter = "Enter"
    case backspace = "BSpace"
    case up = "Up"
    case down = "Down"
    case left = "Left"
    case right = "Right"
    case controlA = "C-a"
    case controlB = "C-b"
    case controlC = "C-c"
    case controlD = "C-d"
    case controlE = "C-e"
    case controlF = "C-f"
    case controlG = "C-g"
    case controlH = "C-h"
    case controlI = "C-i"
    case controlJ = "C-j"
    case controlK = "C-k"
    case controlL = "C-l"
    case controlM = "C-m"
    case controlN = "C-n"
    case controlO = "C-o"
    case controlP = "C-p"
    case controlQ = "C-q"
    case controlR = "C-r"
    case controlS = "C-s"
    case controlT = "C-t"
    case controlU = "C-u"
    case controlV = "C-v"
    case controlW = "C-w"
    case controlX = "C-x"
    case controlY = "C-y"
    case controlZ = "C-z"

    /// The control key of a letter, either case (`c` and `C` are `C-c`), or
    /// nil for anything that is not one ASCII letter.
    static func control(_ character: Character) -> ScreenKeyName? {
        guard character.isASCII, character.isLetter, let lower = character.lowercased().first else { return nil }
        return ScreenKeyName(rawValue: controlLead + String(lower))
    }

    /// `C-`, before the letter.
    static let controlLead = "C-"
}

/// One item of a keys write: text typed, or one named key (D17).
enum KeyItem: Equatable, Hashable, Sendable {
    case text(String)
    case key(ScreenKeyName)

    /// THE ONE MAKER OF A TEXT ITEM (conformance:ios rule ai): the text with
    /// every C0 control, DEL and C1 control taken out, which is what the Mac
    /// refuses whole (`refused character`); nil when nothing is left. A
    /// typed line break never reaches here: Return is the `Enter` key.
    static func typed(_ text: String) -> KeyItem? {
        var kept = String.UnicodeScalarView()
        for scalar in text.unicodeScalars where !isControl(scalar) {
            kept.append(scalar)
        }
        return kept.isEmpty ? nil : .text(String(kept))
    }

    /// U+0000 to U+001F, U+007F and U+0080 to U+009F.
    static func isControl(_ scalar: Unicode.Scalar) -> Bool {
        scalar.value <= 0x1f || (scalar.value >= 0x7f && scalar.value <= 0x9f)
    }

    /// Whether this is a named key other than Backspace, which the Mac takes
    /// only as the one item of its write (D17).
    var standsAlone: Bool {
        if case .key(let name) = self { return name != .backspace }
        return false
    }

    /// The UTF-8 bytes of a text item; zero for a key.
    var textBytes: Int {
        if case .text(let text) = self { return text.utf8.count }
        return 0
    }
}

extension KeyItem: Encodable {
    enum CodingKeys: String, CodingKey {
        case typedText = "t"
        case keyName = "k"
    }

    /// `{"t":"…"}` or `{"k":"…"}`, exactly one key.
    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .text(let text): try c.encode(text, forKey: .typedText)
        case .key(let name): try c.encode(name.rawValue, forKey: .keyName)
        }
    }
}

// MARK: - Paging the conversation back

/// The conversation as the phone holds it: pages read from the newest turn
/// back, stitched in index order.
///
/// THE DOOR'S PROMISE is on `PocketTurnsAnswer`: a page is ascending with the
/// newest last, `more` says older turns exist, and `more` is always false on an
/// empty page. A door is somebody else's bytes, so this holds every page to it
/// before a turn is kept:
///
///   - a page whose indexes do not strictly rise, or are negative, or lie past
///     `DoorNumber.largest`, is REFUSED;
///   - an older page that reaches at or past the oldest turn already held, or
///     past the index it was asked for, OVERLAPS and is REFUSED;
///   - a page that adds nothing STOPS the paging, whatever its `more` says, so
///     `more: true` forever cannot page forever;
///   - paging also stops at index 0, because nothing is older than the first.
///
/// A refusal throws `DoorFailure.badPage` and stops the paging too, so a
/// hostile door gets one sentence and not a loop. Nothing here reaches the
/// network: the screen asks `DoorClient` for the page `olderBound` names.
struct TurnPages: Equatable, Sendable {
    /// Turns asked for per page. The door's own default is 20.
    static let pageSize = 20

    let sessionId: String
    private(set) var turns: [PocketTurn] = []
    /// True while an older page may be asked for.
    private(set) var hasOlder = false
    /// Main's sentence when there is nothing to read here, from the newest page.
    private(set) var note: String?

    init(sessionId: String) {
        self.sessionId = sessionId
    }

    /// The `to` of the next older page, or nil when there is none to ask for.
    var olderBound: Int? {
        guard hasOlder, let first = turns.first, first.index > 0 else { return nil }
        return DoorNumber.difference(first.index, 1)
    }

    /// The newest page: the first read, and every refresh after it.
    ///
    /// A refresh that continues what is held (it starts at or before the turn
    /// after the newest one held, and does not end before it) keeps the older
    /// turns and replaces the rest, because the newest turn's answer may have
    /// arrived since. Anything else starts again from this page.
    mutating func acceptNewest(_ page: PocketTurnsAnswer) throws {
        try Self.check(page, sessionId: sessionId)
        note = page.note
        guard let first = page.turns.first, let last = page.turns.last,
              let heldFirst = turns.first, let heldLast = turns.last,
              first.index > heldFirst.index,
              last.index >= heldLast.index else {
            startAgain(from: page)
            return
        }
        // The turn after the newest one held, through the one checked sum. A
        // held index is always inside the bound, so this never fails on a page
        // `check` let in; if it did, it is an answer this build cannot read.
        guard let afterHeld = DoorNumber.sum(heldLast.index, 1) else { throw DoorFailure.malformed }
        guard first.index <= afterHeld else {
            startAgain(from: page)
            return
        }
        turns = turns.filter { $0.index < first.index } + page.turns
    }

    /// Anything but a refresh that continues what is held: this page alone.
    private mutating func startAgain(from page: PocketTurnsAnswer) {
        turns = page.turns
        hasOlder = page.more && (page.turns.first?.index ?? 0) > 0
    }

    /// An older page, asked for with `to: askedTo` (which was `olderBound`).
    mutating func acceptOlder(_ page: PocketTurnsAnswer, askedTo: Int) throws {
        do {
            try Self.check(page, sessionId: sessionId)
        } catch {
            hasOlder = false
            throw error
        }
        guard let first = page.turns.first, let last = page.turns.last else {
            // Adds nothing: stop, whatever `more` said.
            hasOlder = false
            return
        }
        guard let heldFirst = turns.first, last.index <= askedTo, last.index < heldFirst.index else {
            hasOlder = false
            throw DoorFailure.badPage
        }
        turns = page.turns + turns
        hasOlder = page.more && first.index > 0
    }

    /// One page on its own: this session, every index a count the door could
    /// have sent (never negative, never past `DoorNumber.largest`), strictly
    /// rising.
    private static func check(_ page: PocketTurnsAnswer, sessionId: String) throws {
        guard page.sessionId == sessionId else { throw DoorFailure.badPage }
        var previous = -1
        for turn in page.turns {
            guard DoorNumber.isCount(turn.index), turn.index > previous else { throw DoorFailure.badPage }
            previous = turn.index
        }
    }
}
