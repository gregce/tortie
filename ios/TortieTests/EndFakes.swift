import Foundation
@testable import Tortie

// The stand-ins Phase 317's tests drive (build/p317/SPEC.md section 7.3). Kept
// apart from ScreensFixtures.swift, so 316.6's fixtures do not move: a reader
// that writes is a NEW type here, and every 316.6 reader still writes nothing
// through `DoorReading`'s default.
//
// They script what the Mac answers and what iOS answers; they sign nothing and
// reach nothing.

/// The Mac's answers to the write, scripted, and every write asked, in order.
actor ScriptedWriter: DoorWriting {
    private var endResults: [WriteResult]
    /// Every `end` asked: the session and the batch flag.
    private(set) var ends: [(session: String, batch: Bool)] = []
    /// Run inside each `end`, before it answers.
    private let during: (@Sendable (String) async -> Void)?

    init(
        ends: [WriteResult] = [],
        during: (@Sendable (String) async -> Void)? = nil
    ) {
        endResults = ends
        self.during = during
    }

    func end(_ sessionId: String, batch: Bool) async -> WriteResult {
        ends.append((sessionId, batch))
        await during?(sessionId)
        return endResults.isEmpty ? .noAnswer : endResults.removeFirst()
    }

    var endCount: Int { ends.count }
    var endedIds: [String] { ends.map(\.session) }
}

/// A reader that writes: `ScriptedReader`'s reads, and a writer, answered
/// through `DoorReading`'s requirement exactly as `PairedReader` answers it.
struct WritingReader: DoorReading {
    let reads: ScriptedReader
    let writes: (any DoorWriting)?

    var alerts: AlertsKept { reads.alerts }
    var facts: PairedFacts { reads.facts }
    var writer: (any DoorWriting)? { writes }

    func blocked() async throws -> PocketBlockedAnswer { try await reads.blocked() }
    func session(_ sessionId: String) async throws -> PocketSessionAnswer { try await reads.session(sessionId) }
    func turns(_ sessionId: String, to: Int?) async throws -> PocketTurnsAnswer { try await reads.turns(sessionId, to: to) }
}

/// iOS's owner check, scripted: what the phone has, and each answer in turn.
final class ScriptedOwnerCheck: OwnerCheck, @unchecked Sendable {
    private let lock = NSLock()
    private let has: OwnerKind
    private var answers: [OwnerAnswer]
    private(set) var asked: [String] = []
    /// Run while iOS is "asking", before it answers.
    var during: (@Sendable () async -> Void)?

    init(kind: OwnerKind = .faceID, answers: [OwnerAnswer] = [.confirmed]) {
        has = kind
        self.answers = answers
    }

    func kind() -> OwnerKind { has }

    func confirm(reason: String) async -> OwnerAnswer {
        lock.withLock { asked.append(reason) }
        await during?()
        return lock.withLock { answers.isEmpty ? .notConfirmed : answers.removeFirst() }
    }

    var askedCount: Int { lock.withLock { asked.count } }
}

/// The app's registry, for a test with no app: every runner made, and the
/// ones still live.
@MainActor
final class RunnerRecord: EndRunnerRegistry {
    private(set) var made: [EndRunner] = []
    private(set) var live: [EndRunner] = []

    func register(_ runner: EndRunner) {
        made.append(runner)
        live.append(runner)
    }

    func release(_ runner: EndRunner) {
        live.removeAll { $0 === runner }
    }
}

/// The Mac's answers to a write, field by field.
enum WriteAnswers {
    static func answer(
        _ outcome: PocketWriteAnswer.Outcome,
        reason: PocketWriteAnswer.Reason? = nil,
        sentence: String? = nil,
        verb: PocketWriteAnswer.Verb = .end,
        write: String = "0123456789abcdef0123456789abcdef"
    ) -> PocketWriteAnswer {
        PocketWriteAnswer(verb: verb, write: write, outcome: outcome, reason: reason, sentence: sentence)
    }

    static let done = WriteResult.answered(answer(.done))
    static let ended = WriteResult.answered(answer(.refused, reason: .ended, sentence: "This session changed. Nothing was done."))
    static let removed = WriteResult.answered(answer(
        .refused, reason: .removed, sentence: "This session was removed, so there is nothing to end. Nothing was changed."
    ))
    static let busy = WriteResult.answered(answer(
        .busy, sentence: "Tortie is still doing the last thing you asked from this phone. Nothing was done."
    ))

    /// A row the Mac offers End on, or not.
    static func row(_ id: String, end: PocketEndOffer, machine: String? = nil, title: String = "Working") -> PocketBlockedRow {
        var row = Answers.row(id, machine: machine, title: title)
        row.end = end
        return row
    }

    /// The Mac's own confirmation for a session on this Mac.
    static let confirm = PocketEndConfirm(
        title: "End 'build'?",
        body: "This stops what is running in it. The scrollback and the conversation are saved first, so you can restore this session later.",
        confirmLabel: "End session"
    )

    /// One session's answer, with its End offer and confirmation.
    static func session(_ id: String, end: PocketEndOffer, confirm: PocketEndConfirm? = WriteAnswers.confirm) -> PocketSessionAnswer {
        var detail = Answers.detail(row(id, end: end))
        detail.endConfirm = end.isOffered ? confirm : nil
        return PocketSessionAnswer(session: detail, at: 1_758_600_000_000)
    }
}
