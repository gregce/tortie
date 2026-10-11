// The sample's world in memory (Phase 333.3, build/p3333/SPEC.md sections
// 5.2.2 and 5.2.4): which variant each made-up session is at, and what he typed
// on its terminal. Made from the book when the sample opens and dropped when it
// leaves; nothing in it outlives the sample, and nothing in it is kept on the
// phone (D17).
//
// A STATE is every session's variant (D3, D5). Every answer for a state was
// composed by the Mac's own code and is read out of the book; this actor only
// moves the variants, the way the door's writes move a real session:
//
//   endSession    any variant to `ended`; an ended one stays ended (D11)
//   pressOption   a `waiting` session whose offer lists the marker to
//                 `answered`; anything else is not taken (D10)
//   typeKeys      the echo below, on the sample's own prompt (D7)
//
// Its members are named so that no conformance:ios rule reads them as the
// writer's own calls (rules ab and ae count those, one each, in the app).
//
// THE ECHO (D7). Printable ASCII appears on the prompt row, one cell each; a
// Ctrl key as `^` and its letter; Backspace takes the last of those back;
// Return empties the prompt and draws ONE fixed line saying nothing ran, never
// a shell's answer (guideline 2.5.2); every other key draws nothing. Each keys
// write moves the screen's question id and its revision, as every keystroke at
// the Mac moves the question id, so the key sender's lock inside a question
// lets go. A waiting screen has no prompt, so keys there draw nothing. A
// picture is built with the contract's own initializers and handed out only
// when `PocketScreen.holdsTogether` holds, and every sum on a cell count goes
// through `DoorNumber` (rule k).
//
// THE HELD READ (D8). A read whose `since` is the revision drawn now waits, in
// 100 ms looks, until that session changes or 10 s pass, then answers the new
// picture or `unchanged`, as the door holds its poll; the read's own task's
// cancellation ends it at once.
//
// THE HISTORY (D9). One page of made-up earlier output, sliced by the ask, or
// main's own `moved` and `ended` absences out of the book.

import Foundation

/// What he typed on one session's terminal since its variant began.
struct SampleEcho: Equatable, Sendable {
    /// The row his typing appears on: the column after the agent's own prefix,
    /// and the style a typed character takes.
    struct Prompt: Equatable, Sendable, Decodable {
        let row: Int
        let column: Int
        let style: Int
    }

    /// The empty row Return's line is drawn on, and its style.
    struct Note: Equatable, Sendable, Decodable {
        let row: Int
        let style: Int
    }

    /// The rows a screen with a prompt holds. A waiting screen has none.
    struct Rows: Equatable, Sendable {
        let prompt: Prompt
        let note: Note?
    }

    /// Each one printable ASCII character, or a two-character `^X`.
    private(set) var units: [String] = []
    /// Return's line is drawn.
    private(set) var returned = false
    /// The keys writes since the variant began: how far the question id moved.
    private(set) var moves = 0

    /// The units as the prompt row draws them: every one ASCII, so a character
    /// is a cell.
    var text: String { units.joined() }

    /// Add one unit while the prompt row has `room` cells left for it.
    mutating func add(_ unit: String, room: Int) {
        guard let after = DoorNumber.sum(text.utf8.count, unit.utf8.count), after <= room else { return }
        units.append(unit)
    }

    /// Backspace: the last unit, a `^X` whole.
    mutating func takeBack() {
        if !units.isEmpty { units.removeLast() }
    }

    /// Return: the prompt empties and its line is drawn.
    mutating func pressReturn() {
        units.removeAll()
        returned = true
    }

    /// One keys write landed.
    mutating func moved() {
        moves = DoorNumber.sum(moves, 1) ?? moves
    }
}

actor SampleWorld {
    /// The variant words the book writes (build/p3333/SPEC.md section 5.1.1).
    enum Variant {
        static let waiting = "waiting"
        static let answered = "answered"
        static let live = "live"
        static let ended = "ended"
    }

    /// How long a read of the picture already drawn is held, as the door holds
    /// its poll: 10 s, in milliseconds of `now`.
    static let holdMs: Double = 10_000
    /// How often a held read looks again: 100 ms.
    static let lookAgain: UInt64 = 100_000_000
    /// A revision is 12 lowercase hex.
    static let revisionLength = 12
    /// What a question id's two halves are joined by.
    static let questionJoin = "-"

    /// The phone's own clock, in epoch milliseconds.
    static let phoneClock: @Sendable () -> Double = { Date.now.timeIntervalSince1970 * 1000.0 }

    /// The sessions, in the book's order.
    nonisolated let ids: [String]
    private let book: SampleBook
    private let now: @Sendable () -> Double

    /// One session as the sample holds it.
    private struct Held {
        var variant: String
        var echo = SampleEcho()
        /// Every keys write on this session, ever: its typed revision.
        var writes = 0
        /// Moved by every change of this session: a variant, a keys write.
        var changes = 0
    }

    private var held: [String: Held] = [:]
    /// The book's screens and histories, decoded once each.
    private var screens: [String: SampleBook.Screen] = [:]
    private var histories: [String: PocketScrollbackAnswer] = [:]

    init(book: SampleBook, now: @escaping @Sendable () -> Double = SampleWorld.phoneClock) {
        self.book = book
        self.now = now
        ids = book.ids
        held = book.start.mapValues { Held(variant: $0) }
    }

    // MARK: - The reads

    /// The state now: each session's variant, in the book's order.
    func currentState() -> String {
        book.stateKey(held.mapValues(\.variant))
    }

    func blocked() throws -> PocketBlockedAnswer {
        try book.blocked(state: currentState(), at: now())
    }

    func sessions(_ query: SessionsQuery) throws -> PocketSessionsAnswer {
        try book.sessions(state: currentState(), query: query, at: now())
    }

    func session(_ id: String) throws -> PocketSessionAnswer {
        try book.session(id: id, variant: try variant(of: id), at: now())
    }

    /// The newest page, or, for an older one, an empty page: no sample
    /// conversation has more than one.
    func turns(_ id: String, to: Int?) throws -> PocketTurnsAnswer {
        let variant = try variant(of: id)
        guard to == nil else {
            return PocketTurnsAnswer(sessionId: id, turns: [], more: false, at: now(), note: nil)
        }
        return try book.turns(id: id, variant: variant, at: now())
    }

    // MARK: - The writes

    /// End: any variant to `ended`.
    func endSession(_ id: String) -> WriteResult {
        guard var session = held[id], book.variants[id]?.contains(Variant.ended) == true else { return .notTaken }
        if session.variant != Variant.ended {
            Self.move(&session, to: Variant.ended)
            held[id] = session
        }
        return Self.done(.end, id)
    }

    /// A press: a waiting session whose offer lists `marker` is answered.
    func pressOption(_ id: String, marker: String) -> WriteResult {
        guard var session = held[id], session.variant == Variant.waiting,
              book.variants[id]?.contains(Variant.answered) == true,
              let detail = try? book.session(id: id, variant: Variant.waiting, at: now()),
              detail.session.replyOffer.pressable.contains(marker) else { return .notTaken }
        Self.move(&session, to: Variant.answered)
        held[id] = session
        return Self.done(.choose, id)
    }

    /// One keys write, echoed on the sample's own prompt.
    func typeKeys(_ id: String, _ items: [KeyItem]) -> WriteResult {
        // No picture (an ended session's absence), no keys.
        guard var session = held[id], let screen = try? bookScreen(id, session.variant),
              let drawn = screen.answer.screen else { return .notTaken }
        if let rows = screen.rows {
            let room = DoorNumber.difference(drawn.screenColumns, rows.prompt.column) ?? 0
            for item in items {
                switch item {
                case .text(let typed):
                    for scalar in typed.unicodeScalars where Self.echoes(scalar) {
                        session.echo.add(String(scalar), room: room)
                    }
                case .key(let name):
                    if name == .backspace {
                        session.echo.takeBack()
                    } else if name == .enter {
                        session.echo.pressReturn()
                    } else if let letter = Self.controlLetter(name) {
                        session.echo.add("^\(letter)", room: room)
                    }
                }
            }
        }
        session.echo.moved()
        session.writes = DoorNumber.sum(session.writes, 1) ?? session.writes
        session.changes = DoorNumber.sum(session.changes, 1) ?? session.changes
        held[id] = session
        return Self.done(.keys, id)
    }

    // MARK: - The terminal

    /// The screen, held while `since` is the revision drawn now (D8).
    func picture(_ id: String, since: String?) async throws -> PocketScreenAnswer {
        try Task.checkCancellation()
        let drawn = try answer(id)
        guard let since, since == drawn.revision else { return drawn }
        let started = held[id]?.changes
        let deadline = now().advanced(by: Self.holdMs)
        while true {
            try await Task.sleep(nanoseconds: Self.lookAgain)
            if held[id]?.changes != started {
                return try answer(id)
            }
            if now() >= deadline {
                return PocketScreenAnswer(
                    sessionId: id, revision: since, at: now(), unchanged: true, screen: nil, why: nil, sentence: nil
                )
            }
        }
    }

    /// One page of the history (D9): rows `[from, from + count)`, or main's
    /// `moved` for an ask the picture did not make, or `ended`. A count under
    /// one is `moved` too: a negative one has no sum, and an empty page does
    /// not hold together.
    func page(_ id: String, from: Int, count: Int, depth: Int, wrap: Int) throws -> PocketScrollbackAnswer {
        let variant = try variant(of: id)
        let at = now()
        if variant == Variant.ended {
            return try book.pageEnded(id: id, at: at)
        }
        let history = try bookHistory(id)
        guard depth == history.pageDepth, wrap == history.pageWrap,
              let end = DoorNumber.sum(from, count), end <= depth, end <= history.rows.count else {
            return try book.pageMoved(id: id, at: at)
        }
        let rows = Array(history.rows[from..<end])
        guard PocketScrollbackAnswer.holdsTogether(
            from: from, depth: depth, wrap: wrap, space: history.space, styles: history.styles.count,
            rows: rows, why: nil, sentence: nil
        ) else {
            return try book.pageMoved(id: id, at: at)
        }
        return PocketScrollbackAnswer(
            sessionId: id, at: at, pageFrom: from, pageDepth: depth, pageWrap: wrap, space: history.space,
            styles: history.styles, rows: rows, why: nil, sentence: nil
        )
    }

    // MARK: - Inside

    private func variant(of id: String) throws -> String {
        guard let session = held[id] else { throw DoorFailure.refused }
        return session.variant
    }

    private func bookScreen(_ id: String, _ variant: String) throws -> SampleBook.Screen {
        let key = "\(id) \(variant)"
        if let kept = screens[key] { return kept }
        let read = try book.screen(id: id, variant: variant, at: now())
        screens[key] = read
        return read
    }

    private func bookHistory(_ id: String) throws -> PocketScrollbackAnswer {
        if let kept = histories[id] { return kept }
        let read = try book.history(id: id)
        histories[id] = read
        return read
    }

    /// The screen answer now: the book's for the variant until something is
    /// typed on it, then the echo's under its own revision.
    private func answer(_ id: String) throws -> PocketScreenAnswer {
        guard let session = held[id] else { throw DoorFailure.refused }
        let screen = try bookScreen(id, session.variant)
        let kept = screen.answer
        let at = now()
        guard session.echo.moves > 0, let drawn = kept.screen else {
            return PocketScreenAnswer(
                sessionId: kept.sessionId, revision: kept.revision, at: at, unchanged: kept.unchanged,
                screen: kept.screen, why: kept.why, sentence: kept.sentence
            )
        }
        return PocketScreenAnswer(
            sessionId: kept.sessionId, revision: Self.revision(session.writes), at: at, unchanged: false,
            screen: Self.echoed(drawn, rows: screen.rows, echo: session.echo) ?? drawn, why: nil, sentence: nil
        )
    }

    /// The book's picture with the echo drawn on it, or nil when that picture
    /// would not hold together.
    static func echoed(_ screen: PocketScreen, rows: SampleEcho.Rows?, echo: SampleEcho) -> PocketScreen? {
        var lines = screen.lines
        var cursor = screen.cursor
        if let rows {
            let prompt = rows.prompt
            guard lines.indices.contains(prompt.row) else { return nil }
            let typed = echo.text
            if !typed.isEmpty {
                lines[prompt.row].append(PocketScreenRun(text: typed, runStyle: prompt.style, runCells: typed.utf8.count))
            }
            guard let column = DoorNumber.sum(prompt.column, typed.utf8.count) else { return nil }
            cursor = PocketScreenCursor(cursorColumn: column, cursorRow: prompt.row, visible: screen.cursor.visible)
            if echo.returned, let note = rows.note {
                guard lines.indices.contains(note.row) else { return nil }
                let said = String(nothingRan.prefix(screen.screenColumns))
                lines[note.row] = said.isEmpty ? [] : [PocketScreenRun(text: said, runStyle: note.style, runCells: said.utf8.count)]
            }
        }
        guard let turn = turnMoved(screen.turn, by: echo.moves),
              PocketScreen.holdsTogether(
                  columns: screen.screenColumns, rows: screen.screenRows, cursor: cursor, styles: screen.styles.count,
                  lines: lines, turn: turn, dialog: screen.dialog
              ),
              PocketScreen.indexSpaceHolds(depth: screen.historyDepth, space: screen.space) else { return nil }
        return PocketScreen(
            screenColumns: screen.screenColumns, screenRows: screen.screenRows, cursor: cursor,
            alternate: screen.alternate, ground: screen.ground, ink: screen.ink, caret: screen.caret,
            styles: screen.styles, lines: lines, turn: turn, asking: screen.asking, dialog: screen.dialog,
            typable: screen.typable, historyDepth: screen.historyDepth, space: screen.space
        )
    }

    /// Return's line: Copy's words, printable ASCII only, so a character is a cell.
    static var nothingRan: String {
        String(Copy.sampleNothingRan.unicodeScalars.filter(echoes))
    }

    /// The question id `moves` writes on: `<prefix>-<count + moves>`, or nil
    /// when the book's id is not main's shape.
    static func turnMoved(_ turn: String, by moves: Int) -> String? {
        let halves = turn.split(separator: Character(questionJoin), omittingEmptySubsequences: false)
        guard halves.count == 2, let prefix = halves.first, let last = halves.last, let count = Int(last),
              let moved = DoorNumber.sum(count, moves) else { return nil }
        let id = "\(prefix)\(questionJoin)\(moved)"
        return PocketReplyOffer.isQuestionId(id) ? id : nil
    }

    /// A typed revision: the session's writes, as 12 lowercase hex.
    static func revision(_ writes: Int) -> String {
        let hex = String(writes, radix: 16)
        let pad = String(repeating: "0", count: DoorNumber.difference(revisionLength, hex.utf8.count) ?? 0)
        return String("\(pad)\(hex)".suffix(revisionLength))
    }

    /// U+0020 to U+007E: a character the prompt echoes as one cell.
    static func echoes(_ scalar: Unicode.Scalar) -> Bool {
        scalar.value >= 0x20 && scalar.value <= 0x7e
    }

    /// The capital letter of `C-a` to `C-z`, or nil for any other key.
    static func controlLetter(_ name: ScreenKeyName) -> String? {
        guard name.rawValue.hasPrefix(ScreenKeyName.controlLead) else { return nil }
        let letter = name.rawValue.dropFirst(ScreenKeyName.controlLead.count)
        guard letter.count == 1, let first = letter.first, first.isASCII, first.isLetter else { return nil }
        return first.uppercased()
    }

    private static func move(_ session: inout Held, to variant: String) {
        session.variant = variant
        session.echo = SampleEcho()
        session.changes = DoorNumber.sum(session.changes, 1) ?? session.changes
    }

    /// `done`, made with the contract's own initializer: the sample's writes
    /// carry no write id, and nothing after the result reads one.
    private static func done(_ verb: PocketWriteAnswer.Verb, _ id: String) -> WriteResult {
        .answered(PocketWriteAnswer(verb: verb, write: id, outcome: .done, reason: nil, sentence: nil))
    }
}
