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

    var id: String { sessionId }
    var dot: StatusDot { StatusDot(name: statusDot) }
}

extension PocketBlockedRow: Codable {
    enum CodingKeys: String, CodingKey {
        case sessionId, name, project, machine, agent, agentLabel, statusLabel, statusTitle
        case statusDot, question, choices, blockedSince, seenAtWake, ageText
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

    subscript<T>(dynamicMember path: KeyPath<PocketBlockedRow, T>) -> T {
        row[keyPath: path]
    }
}

extension PocketSessionDetail: Codable {
    enum CodingKeys: String, CodingKey {
        case catchUp, lastAnswer, turnCount, handoff, activity, lastMessageText
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

/// `PocketPairAnswer`: what `POST /pair` answers, ONE of three words. Anything
/// else fails to decode, and the pairing stops with a sentence.
enum PairAnswer: String, Sendable, Equatable {
    case pending, allowed, refused
}

extension PairAnswer: Decodable {
    enum CodingKeys: String, CodingKey { case state }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let word = try c.decode(String.self, forKey: .state)
        guard let answer = PairAnswer(rawValue: word) else {
            throw DecodingError.dataCorruptedError(
                forKey: .state, in: c, debugDescription: "not one of pending, allowed, refused"
            )
        }
        self = answer
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
