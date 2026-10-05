import Foundation
@testable import Tortie

// The answers and the stand-in door Phase 316.7's tests drive. Kept apart from
// ScreensFixtures.swift so 316.6's fixtures do not move: every reader there
// has no sessions read, which is exactly a Mac older than this phase.
//
// Every answer is built from the contract's own types, field by field; the
// stand-in scripts what the door does, signs nothing and reaches nothing.

enum SessionsAnswers {
    static func row(
        _ id: String,
        group: Int = 0,
        title: String = "Working",
        dot: String = "working",
        machine: String? = nil,
        age: String? = "2m",
        waiting: Bool = false,
        question: String? = nil,
        end: PocketEndOffer = .offered(batch: true)
    ) -> PocketSessionsRow {
        PocketSessionsRow(
            sessionId: id, name: id, groupIndex: group, machine: machine, statusDot: dot, statusTitle: title,
            ageText: age, waiting: waiting, question: question, end: end
        )
    }

    /// A row that waits on him, with its question.
    static func waitingRow(_ id: String, group: Int = 0, question: String? = "Proceed?", age: String? = "3m") -> PocketSessionsRow {
        row(id, group: group, title: "Needs input", dot: "attention", age: age, waiting: true, question: question)
    }

    static func group(
        _ id: String,
        label: String = "webapp",
        count: Int,
        omitted: Int = 0,
        waiting: Bool = false,
        collapsed: Bool = false,
        machine: String? = nil,
        folder: String? = nil
    ) -> PocketSessionsGroup {
        PocketSessionsGroup(
            id: id, label: label, machine: machine, folder: folder, sessionCount: count, omittedRows: omitted,
            waiting: waiting, collapsed: collapsed
        )
    }

    static func asked(_ query: SessionsQuery = .standard) -> PocketSessionsAsked {
        PocketSessionsAsked(show: query.show, group: query.group, sort: query.sort, agent: query.agent, machine: query.machine)
    }

    static func answer(
        _ query: SessionsQuery = .standard,
        rows: [PocketSessionsRow],
        groups: [PocketSessionsGroup],
        agents: [PocketSessionsChoice] = [],
        machines: [PocketSessionsChoice] = [],
        total: Int? = nil,
        omitted: Int = 0,
        at: Double = 1_758_600_000_000
    ) -> PocketSessionsAnswer {
        PocketSessionsAnswer(
            asked: asked(query), rows: rows, groups: groups, agents: agents, machines: machines,
            totalSessions: total ?? rows.count + omitted, omittedRows: omitted, at: at,
            ageNote: "Waits first seen after your Mac wakes or Tortie restarts are timed from then."
        )
    }

    /// An honest answer to `query`: two projects, the first waiting, the
    /// second on another machine, three rows, nothing left out.
    static func honest(_ query: SessionsQuery = .standard) -> PocketSessionsAnswer {
        answer(
            query,
            rows: [waitingRow("w"), row("a"), row("r", group: 1, machine: "Mac Pro", age: nil)],
            groups: [group("g0", count: 2, waiting: true), group("g1", label: "monorepo", count: 1, machine: "Mac Pro")],
            agents: [PocketSessionsChoice(id: "claude", label: "Claude Code"), PocketSessionsChoice(id: "codex", label: "Codex CLI")],
            machines: [PocketSessionsChoice(id: "local", label: nil), PocketSessionsChoice(id: "studio-pro", label: "Mac Pro")],
            total: 9
        )
    }
}

/// The three words, kept in memory.
final class MemoryWords: SessionsChoicesStore, @unchecked Sendable {
    private let lock = NSLock()
    private var kept: SessionsWords
    private(set) var saves: [SessionsWords] = []

    init(_ words: SessionsWords = .standard) {
        kept = words
    }

    func load() -> SessionsWords {
        lock.withLock { kept }
    }

    func save(_ words: SessionsWords) {
        lock.withLock {
            kept = words
            saves.append(words)
        }
    }
}

/// The reads in flight right now: a read is in flight from the moment it
/// reaches the door until it answers or is cancelled, because a cancelled read
/// closes its connection at once (Door/DoorClient.swift).
final class InFlight: @unchecked Sendable {
    private let lock = NSLock()
    private var open: Set<Int> = []
    private var next = 0
    private var mostSeen = 0

    func enter() -> Int {
        lock.withLock {
            next += 1
            open.insert(next)
            mostSeen = max(mostSeen, open.count)
            return next
        }
    }

    func leave(_ token: Int) {
        lock.withLock { _ = open.remove(token) }
    }

    var now: Int { lock.withLock { open.count } }
    var most: Int { lock.withLock { mostSeen } }
}

/// A door with the sessions read: each `/v1/sessions` is answered by
/// `respond` over the words it was asked with, and each `/v1/blocked` from a
/// script. Either can be held until released, to put a read in flight.
actor SessionsReader: DoorReading {
    nonisolated let alerts: AlertsKept = .nothing
    nonisolated let facts: PairedFacts = Answers.facts()
    nonisolated let flight = InFlight()
    private var respond: @Sendable (SessionsQuery) -> Result<PocketSessionsAnswer, DoorFailure>
    private var blockedAnswers: [Result<PocketBlockedAnswer, DoorFailure>]
    private(set) var asked: [SessionsQuery] = []
    private(set) var blockedCalls = 0
    private var holdingSessions = false
    private var holdingBlocked = false
    /// A door that answers a read whose connection the phone already closed:
    /// the answer comes back anyway, and only the model may drop it.
    private var answersAfterCancel = false
    private var waiters: [CheckedContinuation<Void, Never>] = []
    /// Held sessions reads, by the order they reached the door (0 first).
    private var heldReads: [Int: CheckedContinuation<Void, Never>] = [:]

    init(
        blocked: [Result<PocketBlockedAnswer, DoorFailure>] = [],
        respond: @escaping @Sendable (SessionsQuery) -> Result<PocketSessionsAnswer, DoorFailure> = { .success(SessionsAnswers.honest($0)) }
    ) {
        blockedAnswers = blocked
        self.respond = respond
    }

    func answer(with respond: @escaping @Sendable (SessionsQuery) -> Result<PocketSessionsAnswer, DoorFailure>) {
        self.respond = respond
    }

    func hold(sessions: Bool, blocked: Bool) {
        holdingSessions = sessions
        holdingBlocked = blocked
    }

    func answerAfterCancel() {
        answersAfterCancel = true
    }

    /// Everything held goes on, and nothing is held after.
    func release() {
        holdingSessions = false
        holdingBlocked = false
        let all = waiters + heldReads.keys.sorted().compactMap { heldReads[$0] }
        waiters = []
        heldReads = [:]
        for waiter in all { waiter.resume() }
    }

    /// The `index`th sessions read (0 first) goes on; the rest stay held.
    func release(read index: Int) {
        heldReads.removeValue(forKey: index)?.resume()
    }

    var askedCount: Int { asked.count }

    func blocked() async throws -> PocketBlockedAnswer {
        blockedCalls += 1
        if holdingBlocked { await withCheckedContinuation { waiters.append($0) } }
        guard !blockedAnswers.isEmpty else { throw DoorFailure.unreachable(code: -1004) }
        return try blockedAnswers.removeFirst().get()
    }

    func session(_ sessionId: String) async throws -> PocketSessionAnswer {
        throw DoorFailure.unreachable(code: -1004)
    }

    func turns(_ sessionId: String, to: Int?) async throws -> PocketTurnsAnswer {
        throw DoorFailure.unreachable(code: -1004)
    }

    func sessions(_ query: SessionsQuery) async throws -> PocketSessionsAnswer {
        let index = asked.count
        asked.append(query)
        let token = flight.enter()
        defer { flight.leave(token) }
        return try await withTaskCancellationHandler {
            if holdingSessions { await withCheckedContinuation { heldReads[index] = $0 } }
            if !answersAfterCancel { try Task.checkCancellation() }
            return try respond(query).get()
        } onCancel: { [flight] in
            flight.leave(token)
        }
    }
}

/// Waits until `condition` holds, or fails the wait after `seconds`.
@MainActor
func eventually(_ seconds: Double = 5, _ condition: () async -> Bool) async -> Bool {
    let deadline = Date().addingTimeInterval(seconds)
    while Date() < deadline {
        if await condition() { return true }
        try? await Task.sleep(nanoseconds: 1_000_000)
    }
    return await condition()
}
