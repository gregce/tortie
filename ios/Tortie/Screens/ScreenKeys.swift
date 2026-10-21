// The Screen's keys, sent to the Mac (Phase 337, build/p337/SPEC.md D17, D29,
// D30 and section 5.8.5).
//
// EVERY KEY, AND NO FACE ID (his ruling 3, "Every key, including Ctrl-C"):
// what he types, dictates or presses on the key bar is gathered here and sent
// as `POST /v1/keys` through the Screen's door. Face ID guards End and
// nothing else, so nothing here names the owner check.
//
// THE SENDER (D30). One write in flight at a time, and at most one started
// every 0.1 s (`minGap`); at most 64 items or 1,024 bytes of text a write; a
// named key other than Backspace ALONE in its write, because a program reads
// one write as one input and Escape followed by anything in the same read is
// Meta (D17, §Attack A1); the rest waits in memory. Nothing is persisted and
// nothing is retried: a write whose answer did not come is said, and the next
// picture shows what landed.
//
// THE ONE REFUSAL, ON THE PHONE'S SIDE (D29, §Attack A5). While the picture
// drawn is `asking` (a numbered question, or the session waiting on him),
// keys go ONE BATCH PER PICTURE: after a batch answered `done`, the next goes
// only against a picture whose question id is NOT the one that batch carried
// (the Mac moves the id at the act, so such a picture was read after it,
// whichever connection answered first); after `changed`, only against a
// picture whose revision is not the refused batch's; after anything else the
// lock is released. A key typed while a write is in flight or the lock holds
// is NOT SENT, ever, and the line says `Waiting for the screen to redraw.`
// (a key held and sent later is the late Return research 135 measured).
// Outside a question keys are gathered while a write is in flight and go in
// the next one.
//
// BACK TO LIVE (Phase 337.1, build/p3371/SPEC.md D27). Every batch he types
// first calls `onSend`, which the Terminal points at its scrollback's
// `follow()`: typing returns a Terminal scrolled back into its history to the
// live rows, as a key at the desk does (src/renderer/terminal/TerminalPane.tsx).
//
// LEAVING. The app registers the sender at the Screen's appear and stops it
// when it goes to the background (`AppModel.wentAway`): the keys waiting are
// dropped, a write whose bytes were not yet handed to its connection is
// withheld (Door/DoorClient.swift), and the door's two kept connections
// close.
//
// A PASTE (Phase 348, build/p348/SPEC.md D20, D21, D31, D53, D54) goes through
// this ONE sender, so his typing and his pastes land in the order he made
// them. The phone's paste rule is asked first (Screens/ScreenKeyField.swift
// `ScreenPasteRule`: a refusal is its sentence on this line, and nothing is
// sent). Then, AT HIS PRESS, the picture drawn now: not typable, nothing is
// queued; inside a question with the picture spent, nothing is queued;
// otherwise the Terminal goes back to live and ONE paste item is queued,
// STAMPED WITH THAT PICTURE's turn, dialog and revision. A paste goes ALONE in
// its write (`POST /v1/paste`), never merged with keys and never split, with
// its own stamp and never the picture at the flush, so a question drawn after
// his press is answered `changed` by the Mac and nothing is typed; and the
// one-batch-per-picture lock holds for it as for keys. No Return is added.

import Foundation
import Observation

/// One thing waiting to go, in the order he made it (Phase 348, D31): a key
/// he typed, or ONE paste, which goes alone in its write.
enum ScreenQueued: Equatable, Sendable {
    case key(KeyItem)
    case paste(ScreenPasteItem)
}

/// One paste, stamped at his press with the picture he pasted against
/// (Phase 348, D31, D54): the text exactly as the clipboard held it, and that
/// picture's question id, window mark and revision.
struct ScreenPasteItem: Equatable, Sendable {
    let text: String
    let turn: String
    let dialog: String?
    let revision: String
}

/// Where the app keeps every live key sender, so a trip to the background
/// stops each one. `AppModel` is the app's.
@MainActor
protocol ScreenKeysRegistry: AnyObject {
    func registerKeys(_ sender: ScreenKeySender)
    func releaseKeys(_ sender: ScreenKeySender)
}

@MainActor
@Observable
final class ScreenKeySender {
    /// At most one write started in this time (D30): at least 0.1 s.
    static let minGap: Duration = .milliseconds(100)
    /// At most this many items in one write (`POCKET_KEYS_MAX_ITEMS`).
    static let mostItems = 64
    /// At most this many bytes of text in one write
    /// (`POCKET_KEYS_MAX_TEXT_BYTES`).
    static let mostTextBytes = 1_024

    /// What the last answered write came to, for the lock.
    enum Outcome: Equatable, Sendable {
        case done
        case changed
        case other
    }

    /// The keys and pastes waiting to go, in order. In memory only.
    private(set) var pending: [ScreenQueued] = []
    /// The one line under the Screen this sender owns, or nil. Never empty.
    private(set) var line: String?
    /// The lock: the question id and the revision the last batch carried,
    /// and what it came to. Nil while it is in flight.
    @ObservationIgnored private(set) var lastTurn: String?
    @ObservationIgnored private(set) var lastRevision: String?
    @ObservationIgnored private(set) var lastOutcome: Outcome?
    /// Set by `stop()`; cleared only by `resume()`, when the Screen is on
    /// top again.
    @ObservationIgnored private(set) var stopped = false
    /// The one write in flight.
    @ObservationIgnored private(set) var inFlight: Task<Void, Never>?
    @ObservationIgnored private var gapWait: Task<Void, Never>?
    @ObservationIgnored private var lastStarted: ContinuousClock.Instant?
    /// Called first by every batch he types (Phase 337.1, D27): the Terminal
    /// returns to its live rows.
    @ObservationIgnored var onSend: (@MainActor () -> Void)?

    private let door: any ScreenDoor
    /// The picture drawn now, which every write is typed against.
    private let picture: @MainActor () -> ScreenPicture?
    private let now: @MainActor () -> ContinuousClock.Instant
    private let sleep: @Sendable (ContinuousClock.Instant) async -> Void

    init(
        door: any ScreenDoor,
        picture: @escaping @MainActor () -> ScreenPicture?,
        now: @escaping @MainActor () -> ContinuousClock.Instant = { ContinuousClock.now },
        sleep: @escaping @Sendable (ContinuousClock.Instant) async -> Void = { deadline in
            try? await Task.sleep(until: deadline, clock: .continuous)
        }
    ) {
        self.door = door
        self.picture = picture
        self.now = now
        self.sleep = sleep
    }

    /// Keys typed, dictated or pressed, in order.
    func send(_ items: [KeyItem]) {
        guard !stopped, !items.isEmpty else { return }
        guard let drawn = picture(), drawn.typable else {
            pending = []
            line = Copy.screenCannotType
            return
        }
        if drawn.asking, spent(drawn) {
            // One batch per picture inside a question: not sent, ever.
            line = Copy.screenWaitForRedraw
            return
        }
        // A key he sends returns the Terminal to its live rows (D27).
        onSend?()
        pending.append(contentsOf: items.flatMap(Self.withinCap).map(ScreenQueued.key))
        flush()
    }

    /// Whether the Terminal offers Paste now (Phase 348, D30): the door
    /// pastes, and the picture drawn says the Mac takes a paste and keys.
    var pasteOffered: Bool {
        guard !stopped, door.pastes, let drawn = picture() else { return false }
        return drawn.paste && drawn.typable
    }

    /// A paste, from the edit menu's Paste, Command-V or the three-finger
    /// paste, with the clipboard's text (Phase 348, D53, D54): the phone's
    /// paste rule first, then the picture drawn NOW, at his press, which the
    /// one item queued is stamped with.
    func paste(_ payload: String) {
        guard !stopped else { return }
        if let sentence = ScreenPasteRule.refusal(payload)?.sentence {
            line = sentence
            return
        }
        guard let drawn = picture(), drawn.typable else {
            pending = []
            line = Copy.screenCannotType
            return
        }
        if drawn.asking, spent(drawn) {
            // One batch per picture inside a question: not sent, ever.
            line = Copy.screenWaitForRedraw
            return
        }
        // A paste returns the Terminal to its live rows, as a key does (D27).
        onSend?()
        pending.append(.paste(ScreenPasteItem(text: payload, turn: drawn.turn, dialog: drawn.dialog, revision: drawn.revision)))
        flush()
    }

    /// A new picture was drawn: the lock may be released, and what waits may
    /// go.
    func pictureChanged() {
        guard !stopped, let drawn = picture() else { return }
        if line == Copy.screenWaitForRedraw, !(drawn.asking && spent(drawn)) { line = nil }
        if !drawn.typable, line == nil, !pending.isEmpty {
            pending = []
            line = Copy.screenCannotType
        }
        flush()
    }

    /// Stop: the keys waiting are dropped, the write in flight is cancelled
    /// (withheld when its bytes were not handed), and the door's kept
    /// connections close.
    func stop() {
        stopped = true
        pending = []
        gapWait?.cancel()
        gapWait = nil
        inFlight?.cancel()
        door.close()
    }

    /// The Screen is on top again, the app in the foreground: keys may go.
    /// Nothing dropped by the stop comes back.
    func resume() {
        stopped = false
    }

    /// Whether the picture is spent inside a question: a write is in flight,
    /// or the lock holds (D29).
    private func spent(_ drawn: ScreenPicture) -> Bool {
        inFlight != nil || lockHolds(drawn)
    }

    /// The lock, read off the question id and the revision (D29), never off
    /// which answer arrived first.
    func lockHolds(_ drawn: ScreenPicture) -> Bool {
        switch lastOutcome {
        case .done?: drawn.turn == lastTurn
        case .changed?: drawn.revision == lastRevision
        case .other?, nil: false
        }
    }

    /// Start the next write when one may start.
    func flush() {
        guard !stopped, inFlight == nil, gapWait == nil, !pending.isEmpty, let drawn = picture() else { return }
        guard drawn.typable else {
            pending = []
            line = Copy.screenCannotType
            return
        }
        if drawn.asking, lockHolds(drawn) {
            pending = []
            line = Copy.screenWaitForRedraw
            return
        }
        if let started = lastStarted, started.advanced(by: Self.minGap) > now() {
            let deadline = started.advanced(by: Self.minGap)
            let sleep = sleep
            gapWait = Task { [weak self] in
                await sleep(deadline)
                guard let self, !Task.isCancelled else { return }
                self.gapWait = nil
                self.flush()
            }
            return
        }
        if case .paste(let item)? = pending.first {
            // A paste ALONE in its write, with the stamp of his press, never
            // the picture drawn now (Phase 348, D31, D54).
            pending.removeFirst()
            lastStarted = now()
            lastTurn = item.turn
            lastRevision = item.revision
            lastOutcome = nil
            if line == Copy.screenWaitForRedraw { line = nil }
            let door = door
            inFlight = Task { [weak self] in
                let result = await door.paste(item.text, turn: item.turn, dialog: item.dialog)
                self?.pasted(result)
            }
            return
        }
        let batch = takeBatch()
        guard !batch.isEmpty else { return }
        lastStarted = now()
        lastTurn = drawn.turn
        lastRevision = drawn.revision
        lastOutcome = nil
        if line == Copy.screenWaitForRedraw { line = nil }
        let door = door
        let (turn, dialog) = (drawn.turn, drawn.dialog)
        inFlight = Task { [weak self] in
            let result = await door.keys(batch, turn: turn, dialog: dialog)
            self?.answered(result)
        }
    }

    /// The next write's items: a named key other than Backspace alone, or
    /// the leading text and Backspace items, at most 64 of them and 1,024
    /// bytes of text (D17, D30); never a paste, which goes alone (Phase 348).
    private func takeBatch() -> [KeyItem] {
        guard case .key(let first)? = pending.first else { return [] }
        if first.standsAlone {
            pending.removeFirst()
            return [first]
        }
        var batch: [KeyItem] = []
        var bytes = 0
        while case .key(let next)? = pending.first, !next.standsAlone, batch.count < Self.mostItems,
              let total = DoorNumber.sum(bytes, next.textBytes), total <= Self.mostTextBytes {
            bytes = total
            pending.removeFirst()
            batch.append(next)
        }
        return batch
    }

    private func answered(_ result: WriteResult) {
        inFlight = nil
        guard !stopped else { return }
        switch result {
        case .answered(let answer) where answer.outcome == .done:
            lastOutcome = .done
            if line != Copy.screenWaitForRedraw { line = nil }
        case .answered(let answer) where answer.reason == .changed:
            lastOutcome = .changed
            line = DoorWords.keysSentence(for: result)
        default:
            lastOutcome = .other
            line = DoorWords.keysSentence(for: result)
        }
        flush()
    }

    /// A paste's answer, read for the lock exactly as a keys write's is
    /// (Phase 348, D54): `done` locks by the turn it carried, `changed` by its
    /// revision, anything else releases it; every outcome but `done` draws
    /// `DoorWords.pasteSentence(for:)`.
    private func pasted(_ result: PasteResult) {
        inFlight = nil
        guard !stopped else { return }
        switch result {
        case .answered(let answer) where answer.outcome == .done:
            lastOutcome = .done
            if line != Copy.screenWaitForRedraw { line = nil }
        case .answered(let answer) where answer.reason == PocketPasteAnswer.changedWord:
            lastOutcome = .changed
            line = DoorWords.pasteSentence(for: result)
        default:
            lastOutcome = .other
            line = DoorWords.pasteSentence(for: result)
        }
        flush()
    }

    /// A text item over 1,024 bytes, split at characters into items under
    /// the cap; a single character over it is dropped. Anything else as it
    /// is.
    static func withinCap(_ item: KeyItem) -> [KeyItem] {
        guard case .text(let text) = item, text.utf8.count > mostTextBytes else { return [item] }
        var out: [KeyItem] = []
        var piece = ""
        var bytes = 0
        for character in text {
            let size = String(character).utf8.count
            guard size <= mostTextBytes else { continue }
            if let total = DoorNumber.sum(bytes, size), total <= mostTextBytes {
                piece.append(character)
                bytes = total
            } else {
                if let typed = KeyItem.typed(piece) { out.append(typed) }
                piece = String(character)
                bytes = size
            }
        }
        if let typed = KeyItem.typed(piece) { out.append(typed) }
        return out
    }
}
