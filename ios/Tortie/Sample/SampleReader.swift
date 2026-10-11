// See a sample's reader (Phase 333.3, build/p3333/SPEC.md section 5.2.3, D1):
// a second `DoorReading`, and its own `DoorWriting`, over the sample's world in
// memory. Every screen draws it exactly as it draws a paired Mac's, because it
// answers every member those screens ask (Screens/DoorWords.swift): the five
// reads, the writes, and each session's Terminal.
//
// NOTHING LEAVES THE PHONE. It holds no pairing, no key and no connection; it
// names no type that reaches a Mac. Its alerts are none, so iOS is never asked
// about one, and its facts are empty, which Settings never draws in the sample
// (D18). A message is never offered, and `say` answers not taken (D10).
//
// THE SAMPLE KEEPS NOTHING (D17): Show, Group by and Sort by live in
// `SampleChoices`, made fresh each time the sample opens, so the paired tab's
// three words are never touched.

import Foundation

struct SampleReader: DoorReading, DoorWriting {
    let world: SampleWorld

    init(book: SampleBook, now: @escaping @Sendable () -> Double = SampleWorld.phoneClock) {
        world = SampleWorld(book: book, now: now)
    }

    /// The sample the app carries, or nil when its book is missing or unreadable.
    static func bundled() -> SampleReader? {
        SampleBook.bundled().map { SampleReader(book: $0) }
    }

    /// The sample writes, to its own copy.
    var writer: (any DoorWriting)? {
        self
    }

    /// No alert: the sample sends none and asks iOS nothing (D19).
    var alerts: AlertsKept {
        .nothing
    }

    /// Nothing about a Mac, because there is none; Settings asks whether the
    /// sample is open before it draws a Mac (D18).
    var facts: PairedFacts {
        PairedFacts(name: "", address: "", fingerprint: "", pairedAt: 0, macSends: false)
    }

    func blocked() async throws -> PocketBlockedAnswer {
        try await world.blocked()
    }

    func session(_ sessionId: String) async throws -> PocketSessionAnswer {
        try await world.session(sessionId)
    }

    func turns(_ sessionId: String, to: Int?) async throws -> PocketTurnsAnswer {
        try await world.turns(sessionId, to: to)
    }

    func sessions(_ query: SessionsQuery) async throws -> PocketSessionsAnswer {
        try await world.sessions(query)
    }

    /// The Terminal of every sample session, and of nothing else.
    func screenDoor(_ sessionId: String) -> (any ScreenDoor)? {
        world.ids.contains(sessionId) ? SampleScreenDoor(world: world, sessionId: sessionId) : nil
    }

    /// End, on the sample's copy (D11). The owner check has already answered.
    func end(_ sessionId: String, batch: Bool) async -> WriteResult {
        await world.endSession(sessionId)
    }

    /// A press on the sample's question (D10).
    func choose(_ sessionId: String, question: String, mark: String, marker: String) async -> WriteResult {
        await world.pressOption(sessionId, marker: marker)
    }

    /// No sample session offers a message, so none is taken (D10).
    func say(_ sessionId: String, text: String, write: String?) async -> SentWrite {
        SentWrite(result: .notTaken, write: nil)
    }
}

/// One sample session's Terminal: the held read, the echo and the history,
/// all out of the world in memory (D6 to D9).
final class SampleScreenDoor: ScreenDoor {
    let world: SampleWorld
    let sessionId: String

    init(world: SampleWorld, sessionId: String) {
        self.world = world
        self.sessionId = sessionId
    }

    /// The sample takes keys, and echoes them on its own prompt.
    var writes: Bool { true }

    func read(since: String?) async throws -> PocketScreenAnswer {
        try await world.picture(sessionId, since: since)
    }

    func keys(_ keys: [KeyItem], turn: String, dialog: String?) async -> WriteResult {
        await world.typeKeys(sessionId, keys)
    }

    func scrollback(from: Int, count: Int, depth: Int, wrap: Int, keep: ScrollbackKeep) async throws -> PocketScrollbackAnswer {
        try await world.page(sessionId, from: from, count: count, depth: depth, wrap: wrap)
    }

    func session() async throws -> PocketSessionAnswer {
        try await world.session(sessionId)
    }

    /// The sample holds no connection; a held read ends by its own task's
    /// cancellation (D8).
    func close() {}
}

/// Show, Group by and Sort by while the sample is open, in memory alone and
/// made fresh each time it opens (D17).
final class SampleChoices: SessionsChoicesStore, @unchecked Sendable {
    // @unchecked: its one value is read and written under `lock`.
    private let lock = NSLock()
    private var kept = SessionsWords.standard

    func load() -> SessionsWords {
        lock.withLock { kept }
    }

    func save(_ words: SessionsWords) {
        lock.withLock { kept = words }
    }
}
