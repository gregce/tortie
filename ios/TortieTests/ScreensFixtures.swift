import Foundation
@testable import Tortie

// The answers and the stand-in doors the screen tests drive (Phase 316.2).
//
// Every answer here is built from the contract's own types, field by field, so
// a test says exactly what the door answered. The stand-ins script what the
// door does; they sign nothing and reach nothing.

enum Answers {
    static func row(
        _ id: String,
        name: String? = nil,
        project: String = "webapp",
        machine: String? = nil,
        agent: String = "claude",
        agentLabel: String = "Claude Code",
        title: String = "Working",
        dot: String = "working",
        question: String? = nil,
        choices: [PocketChoiceOption] = [],
        blockedSince: Double = 1_000,
        age: String = "2m"
    ) -> PocketBlockedRow {
        PocketBlockedRow(
            sessionId: id,
            name: name ?? id,
            project: project,
            machine: machine,
            agent: agent,
            agentLabel: agentLabel,
            statusLabel: title.lowercased(),
            statusTitle: title,
            statusDot: dot,
            question: question,
            choices: choices,
            blockedSince: blockedSince,
            seenAtWake: false,
            ageText: age
        )
    }

    static func blocked(
        rows: [PocketBlockedRow] = [],
        others: [PocketBlockedRow] = [],
        omitted: Int = 0,
        at: Double = 1_758_600_000_000
    ) -> PocketBlockedAnswer {
        PocketBlockedAnswer(
            rows: rows,
            others: others,
            othersOmitted: omitted,
            at: at,
            emptyLine: "Nothing needs you",
            ageNote: "Waits first seen after your Mac wakes or Tortie restarts are timed from then."
        )
    }

    static func activity(
        coverage: String = "complete",
        reason: String? = nil,
        user: Int? = 20,
        agent: Int? = 21,
        at: Double? = 1_000,
        by: String? = "you",
        clock: String? = "message"
    ) -> PocketSessionActivity {
        PocketSessionActivity(
            sessionId: "s",
            coverage: coverage,
            reason: reason,
            userMessages: user,
            agentMessages: agent,
            lastMessageAt: at,
            lastMessageBy: by,
            lastMessageClock: clock,
            readAt: 1_000
        )
    }

    static func detail(
        _ row: PocketBlockedRow,
        catchUp: PocketCatchUp? = nil,
        lastAnswer: String? = nil,
        activity: PocketSessionActivity? = nil,
        lastMessageText: String? = nil
    ) -> PocketSessionDetail {
        PocketSessionDetail(
            row: row,
            catchUp: catchUp,
            lastAnswer: lastAnswer,
            turnCount: 0,
            handoff: nil,
            activity: activity,
            lastMessageText: lastMessageText
        )
    }

    static func turn(_ index: Int, ask: String = "ask", answer: String? = "answer") -> PocketTurn {
        PocketTurn(
            index: index,
            askText: ask,
            askClipped: false,
            askAt: nil,
            answerText: answer,
            answerClipped: false,
            answerAt: nil,
            closed: answer != nil,
            interrupted: false,
            notice: nil,
            absence: answer == nil ? "the agent has not answered yet" : nil
        )
    }

    static func page(
        _ indexes: [Int],
        more: Bool,
        session: String = "s",
        note: String? = nil
    ) -> PocketTurnsAnswer {
        PocketTurnsAnswer(
            sessionId: session,
            turns: indexes.map { turn($0) },
            more: more,
            at: 1_758_600_000_000,
            note: note
        )
    }
}

/// A door that answers from a script, one answer per call, in order.
actor ScriptedReader: DoorReading {
    /// What this pairing agreed about alerts.
    nonisolated let alerts: AlertsKept
    private var blockedAnswers: [Result<PocketBlockedAnswer, DoorFailure>]
    private var sessionAnswers: [Result<PocketSessionAnswer, DoorFailure>]
    private var turnAnswers: [Result<PocketTurnsAnswer, DoorFailure>]
    private(set) var blockedCalls = 0
    private(set) var sessionCalls = 0
    /// The `to` of every turns read, in order (nil is the newest page).
    private(set) var turnsAsked: [Int?] = []

    init(
        blocked: [Result<PocketBlockedAnswer, DoorFailure>] = [],
        session: [Result<PocketSessionAnswer, DoorFailure>] = [],
        turns: [Result<PocketTurnsAnswer, DoorFailure>] = [],
        alerts: AlertsKept = .nothing
    ) {
        self.alerts = alerts
        blockedAnswers = blocked
        sessionAnswers = session
        turnAnswers = turns
    }

    func blocked() async throws -> PocketBlockedAnswer {
        blockedCalls += 1
        guard !blockedAnswers.isEmpty else { throw DoorFailure.unreachable(code: -1004) }
        return try blockedAnswers.removeFirst().get()
    }

    func session(_ sessionId: String) async throws -> PocketSessionAnswer {
        sessionCalls += 1
        guard !sessionAnswers.isEmpty else { throw DoorFailure.unreachable(code: -1004) }
        return try sessionAnswers.removeFirst().get()
    }

    func turns(_ sessionId: String, to: Int?) async throws -> PocketTurnsAnswer {
        turnsAsked.append(to)
        guard !turnAnswers.isEmpty else { throw DoorFailure.unreachable(code: -1004) }
        return try turnAnswers.removeFirst().get()
    }
}

/// The app's door, scripted: a kept pairing or none, and how a pairing ends.
final class StandInPhone: PhoneDoor, @unchecked Sendable {
    private let lock = NSLock()
    private var kept: (any DoorReading)?
    private var beginFailure: PairingFailure?
    private var outcomes: [PairResult]
    private(set) var begun: [String] = []
    private(set) var pairs = 0
    private(set) var forgets = 0
    /// Whether the Mac a pairing presents to says it can send an alert, in
    /// which case the pairing asks for the phone's address, once.
    var macSends = false
    /// The address each pairing's question answered, in order; a pairing
    /// that asked nothing adds nothing.
    private(set) var answered: [PushAddress?] = []
    /// Where the order of a pairing's steps is written, when a test reads it.
    var events: Events?
    /// Run while the pairing is under way, before it answers.
    var duringPair: (@Sendable () async -> Void)?
    /// The steps a pairing reports before it answers.
    var reports: [PairingStep] = [.waitingForMac]

    init(kept: (any DoorReading)? = nil, beginFailure: PairingFailure? = nil, outcomes: [PairResult] = []) {
        self.kept = kept
        self.beginFailure = beginFailure
        self.outcomes = outcomes
    }

    func keep(_ reader: (any DoorReading)?) {
        lock.withLock { kept = reader }
    }

    func pairedReader() -> (any DoorReading)? {
        lock.withLock { kept }
    }

    func begin(payload: String, label: String) throws -> PendingPairing {
        let failure: PairingFailure? = lock.withLock {
            begun.append(payload)
            return beginFailure
        }
        if let failure { throw failure }
        let keys = PhoneKeys.generate()
        let offer = PairingOffer(
            door: DoorEndpoint(name: "p330-mac.tail00000.ts.net", port: 8443, pin: "pin"),
            macSigningKey: "dk",
            macExchangeKey: "dx",
            secret: Data(repeating: 7, count: 16),
            expiresAt: 9_999_999_999_999
        )
        return PendingPairing(
            offer: offer, keys: keys, clientKey: ClientKey(tag: "tortie.client.0000000000000000", spki: "ck"),
            label: label, fingerprint: "aaaa bbbb cccc dddd eeee ffff"
        )
    }

    func pair(
        _ pending: PendingPairing,
        askForAlerts: @escaping @Sendable () async -> PushAddress?,
        progress: @escaping @Sendable (PairingStep) -> Void
    ) async -> PairResult {
        events?.append("pair")
        for step in reports {
            progress(step)
        }
        if lock.withLock({ macSends }) {
            let address = await askForAlerts()
            lock.withLock { answered.append(address) }
        }
        await duringPair?()
        return lock.withLock {
            pairs += 1
            return outcomes.isEmpty ? .failed(.unreachable) : outcomes.removeFirst()
        }
    }

    func forget() {
        lock.withLock {
            forgets += 1
            kept = nil
        }
    }
}

/// What the app asks iOS about alerts, scripted, and when it asked.
final class StandInAlerts: PushAddressing, @unchecked Sendable {
    private let lock = NSLock()
    private let said: PushAuthorization
    private let atPairing: PushAddress?
    private let now: PushAddress?
    private(set) var pairingAsks = 0
    private(set) var currentAsks = 0
    private(set) var authorizationAsks = 0
    /// Where the order of a pairing's steps is written, when a test reads it.
    var events: Events?
    /// Run while the question is being asked, before it answers.
    var duringAsk: (@Sendable () async -> Void)?

    init(authorization: PushAuthorization = .denied, atPairing: PushAddress? = nil, current: PushAddress? = nil) {
        said = authorization
        self.atPairing = atPairing
        now = current
    }

    func authorization() async -> PushAuthorization {
        lock.withLock {
            authorizationAsks += 1
            return said
        }
    }

    func askForPairing() async -> PushAddress? {
        events?.append("ask")
        await duringAsk?()
        return lock.withLock {
            pairingAsks += 1
            return atPairing
        }
    }

    func currentAddress() async -> PushAddress? {
        lock.withLock {
            currentAsks += 1
            return now
        }
    }
}

/// The order things happened in, from inside stand-ins.
final class Events: @unchecked Sendable {
    private let lock = NSLock()
    private var names: [String] = []
    func append(_ name: String) { lock.withLock { names.append(name) } }
    var all: [String] { lock.withLock { names } }
}

/// One value, set from inside a stand-in and read by the test.
actor Seen<Value: Sendable> {
    private(set) var value: Value?

    func set(_ value: Value?) {
        self.value = value
    }
}
