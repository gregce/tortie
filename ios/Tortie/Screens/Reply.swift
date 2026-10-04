// Reply, on one session: press an option, or send one message (Phase 318,
// build/p318/SPEC.md section 5.7.3).
//
// docs/design/phone/Answer.html and Composer.html. An option the Mac offers to
// press is a button on the Session screen; a session waiting at its own empty
// prompt draws a message box above the End bar (Screens/MessageStrip.swift).
// NEITHER ASKS FACE ID, Touch ID or the passcode: his ruling, "Only for End".
// The Mac reads the screen again and asks everything again by id when a write
// arrives, so what is drawn decides what is drawn and nothing else.
//
// THE RUNNER. Every press and every message is ONE `ReplyRunner`: made at the
// press, registered with the app BEFORE its task starts, its verb fixed there,
// and its `run` the app's ONLY call of the writer's `choose` and `say`
// (conformance:ios rule ae). The app stops every live runner when it goes to
// the background (`AppModel.wentAway`), which withholds a write whose bytes
// were not yet handed to the connection (Door/DoorClient.swift). Nothing keeps
// the app running to finish a write, and nothing retries, queues or stores
// one (research 137 section 5, Paseo #3464): a write either happened once or
// did not, and the screen says which after it reads again.
//
// THE KEPT SAY (Revision R13). A message whose answer did not come may still
// have reached the session, and once it has, the prompt is empty again and
// the box is offered again. So the model keeps, in memory, the id that message
// went with beside its words, and Send on the same session with the SAME
// BYTES within 60 seconds sends that id again: the Mac's ledger answers what
// it recorded instead of typing the words twice. Edited words, another
// session, 60 seconds or leaving the screen make a fresh id. The bytes are
// compared as UTF-8, never with `String ==`, which calls `é` and `e` with a
// combining acute equal although the Mac would type different bytes. A press
// never keeps an id: its question id already refuses a second act.
//
// AFTER A WRITE. A press that was taken draws nothing and the session reads
// again (it no longer waits). A message that reached the session empties the
// box and says `Sent`. Anything else says the Mac's sentence, or the phone's
// for an answer that did not come, keeps the words in the box, and the screen
// reads again; "as it reads now" is said only over a read that came back.
// A message that was not sent keeps the box drawn with his words and its line
// (`holdsWords`) even when the read that follows says the session cannot take
// one, until he pulls to read again (build/p318/SPEC.md section 9 row 5, and
// probe:p316's P5 and P10).

import Foundation
import Observation

// MARK: - The runner

/// Where the app keeps every live reply runner, so a trip to the background
/// stops each one. `AppModel` is the app's. 317's `EndRunnerRegistry` is End's
/// and does not move.
@MainActor
protocol ReplyRunnerRegistry: AnyObject {
    func registerReply(_ runner: ReplyRunner)
    func releaseReply(_ runner: ReplyRunner)
}

/// One write, from the press to its answer.
@MainActor
final class ReplyRunner {
    /// What the press asked for, fixed when the runner is made.
    enum Verb: Equatable, Sendable {
        /// One option, by the question id and mark the session answer gave.
        case choose(session: String, question: String, mark: String, marker: String)
        /// One message; `write` is nil, or a kept say's id (`KeptSay`).
        case say(session: String, text: String, write: String?)
    }

    let verb: Verb
    private let writer: any DoorWriting
    /// Set by `stop()` and never cleared: a runner stopped before it ran
    /// sends nothing.
    private(set) var stopRequested = false
    /// The press's own task.
    var task: Task<Void, Never>?

    init(verb: Verb, writer: any DoorWriting) {
        self.verb = verb
        self.writer = writer
    }

    /// Stop: no write is started, and one whose bytes were not yet handed to
    /// the connection is withheld.
    func stop() {
        stopRequested = true
        task?.cancel()
    }

    /// ONE awaited write through the writer, the app's only call of its
    /// `choose` and `say`. Never repeated.
    func run() async -> SentWrite {
        guard !stopRequested else { return SentWrite(result: .notSent(.cancelled), write: nil) }
        switch verb {
        case .choose(let session, let question, let mark, let marker):
            let result = await writer.choose(session, question: question, mark: mark, marker: marker)
            return SentWrite(result: result, write: nil)
        case .say(let session, let text, let write):
            return await writer.say(session, text: text, write: write)
        }
    }
}

// MARK: - The kept say

/// A message whose answer did not come: its session, its words as UTF-8
/// bytes, the id it went with, and when it was sent (Revision R13). In memory
/// only, on one Session screen's model.
struct KeptSay: Equatable, Sendable {
    let session: String
    let bytes: [UInt8]
    let write: String
    let at: Date
}

// MARK: - The model

@MainActor
@Observable
final class ReplyModel {
    enum Phase: Equatable {
        case idle
        /// A press of this marker is under way.
        case pressing(String)
        /// A message is under way.
        case sending
    }

    /// How long a kept say's id is sent again, counted from when it was
    /// sent: inside the Mac ledger's life (`POCKET_WRITE_LEDGER_MS`, twice
    /// the signature clock, counted from when the Mac RECORDED the first,
    /// which is after it was sent). Read at Send, never by a timer.
    static let keptSayWindow: TimeInterval = 60

    let sessionId: String
    /// The box, in memory only.
    private(set) var text = ""
    private(set) var phase: Phase = .idle
    /// The line under the options after a press, or nil. Never empty.
    private(set) var pressLine: String?
    /// The line under the box after a message, or nil. Never empty.
    private(set) var sayLine: String?
    /// A message was not sent: the box stays drawn with his words and its
    /// line until he pulls to read again, whatever the read after it says.
    private(set) var holdsWords = false
    /// At most one message whose answer did not come.
    private(set) var kept: KeptSay?
    /// The last press's or message's task, held so a test can wait for it.
    /// Never drawn from.
    @ObservationIgnored private(set) var running: Task<Void, Never>?

    private let writer: any DoorWriting
    private let registry: (any ReplyRunnerRegistry)?
    private let clock: @Sendable () -> Date

    init(
        sessionId: String,
        writer: any DoorWriting,
        registry: (any ReplyRunnerRegistry)?,
        clock: @escaping @Sendable () -> Date = { Date() }
    ) {
        self.sessionId = sessionId
        self.writer = writer
        self.registry = registry
        self.clock = clock
    }

    /// He typed. An edit that changes the box's bytes forgets the kept say
    /// and the last line, which spoke of other words.
    func edit(_ new: String) {
        guard !new.utf8.elementsEqual(text.utf8) else { return }
        text = new
        kept = nil
        sayLine = nil
    }

    /// He pulled to read the session again: a box drawn only to hold his
    /// words goes, unless the session can take a message.
    func readingAgain() {
        holdsWords = false
    }

    // MARK: The press

    /// Press `marker`, one of the options `offer` names as pressable. Nothing
    /// is asked first (his ruling, "Only for End"). Does nothing while a press
    /// or a message is under way.
    func press(_ marker: String, offer: PocketReplyOffer, reread: @escaping @MainActor () async -> Bool) {
        guard phase == .idle, offer.pressable.contains(marker),
              let question = offer.question, let mark = offer.mark else { return }
        let runner = ReplyRunner(
            verb: .choose(session: sessionId, question: question, mark: mark, marker: marker), writer: writer
        )
        registry?.registerReply(runner)
        let registry = registry
        phase = .pressing(marker)
        pressLine = nil
        let task = Task { [weak self] in
            let sent = await runner.run()
            await self?.afterPress(sent.result, reread: reread)
            self?.phase = .idle
            registry?.releaseReply(runner)
        }
        runner.task = task
        running = task
    }

    /// What the line under the options says once a press ended, and the read
    /// that follows.
    private func afterPress(_ result: WriteResult, reread: @MainActor () async -> Bool) async {
        switch result {
        case .answered(let answer) where answer.outcome == .done:
            // Taken: the session reads again and no longer waits.
            pressLine = nil
            _ = await reread()
        case .noAnswer:
            // "As it reads now" is true only of a read that came back.
            pressLine = await reread() ? DoorWords.replySentence(for: result) : nil
        default:
            pressLine = DoorWords.replySentence(for: result)
            _ = await reread()
        }
    }

    // MARK: The message

    /// Send the box as ONE message. Nothing is asked first. Does nothing with
    /// an empty box or while a press or a message is under way.
    func send(reread: @escaping @MainActor () async -> Bool) {
        guard phase == .idle, !text.isEmpty else { return }
        let words = text
        let bytes = Array(words.utf8)
        let at = clock()
        let reusing = keptSay(for: bytes, at: at)
        if reusing == nil { kept = nil }
        let runner = ReplyRunner(verb: .say(session: sessionId, text: words, write: reusing?.write), writer: writer)
        registry?.registerReply(runner)
        let registry = registry
        phase = .sending
        sayLine = nil
        let task = Task { [weak self] in
            let sent = await runner.run()
            await self?.afterSay(sent, bytes: bytes, at: at, reusing: reusing, reread: reread)
            self?.phase = .idle
            registry?.releaseReply(runner)
        }
        runner.task = task
        running = task
    }

    /// The kept say these bytes may be sent again under: this session, the
    /// same UTF-8 bytes, sent less than `keptSayWindow` ago by this phone's
    /// own clock (a clock that went backwards keeps nothing).
    private func keptSay(for bytes: [UInt8], at now: Date) -> KeptSay? {
        guard let kept, kept.session == sessionId, kept.bytes == bytes else { return nil }
        let age = now.timeIntervalSince(kept.at)
        guard age >= 0, age < Self.keptSayWindow else { return nil }
        return kept
    }

    /// What the line under the box says once a message ended, what is kept,
    /// and the read that follows.
    private func afterSay(
        _ sent: SentWrite,
        bytes: [UInt8],
        at: Date,
        reusing: KeptSay?,
        reread: @MainActor () async -> Bool
    ) async {
        switch sent.result {
        case .answered(let answer) where answer.outcome == .done:
            // It reached the session, as a paste at the Mac would: the box
            // empties (unless he typed something else meanwhile) and says so.
            kept = nil
            holdsWords = false
            if Array(text.utf8) == bytes { text = "" }
            sayLine = Copy.replySent
        case .answered(let answer):
            // Busy on a kept id: the first may still be acting, so it is
            // asked about by that id again. Every other answer forgets it.
            kept = answer.outcome == .busy ? reusing : nil
            holdsWords = true
            sayLine = DoorWords.replySentence(for: sent.result)
            _ = await reread()
        case .noAnswer:
            // It may have reached the session: keep the id it went with.
            kept = reusing ?? sent.write.map { KeptSay(session: sessionId, bytes: bytes, write: $0, at: at) }
            holdsWords = true
            sayLine = await reread() ? DoorWords.replySentence(for: sent.result) : nil
        case .notTaken:
            kept = nil
            holdsWords = true
            sayLine = DoorWords.replySentence(for: sent.result)
            _ = await reread()
        case .notSent:
            // Not an answer: nothing reached the Mac, so a kept id stays kept.
            holdsWords = true
            sayLine = DoorWords.replySentence(for: sent.result)
            _ = await reread()
        }
    }
}
