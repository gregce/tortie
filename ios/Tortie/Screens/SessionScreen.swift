// One session, on its two faces (Phase 316.2; terminal first since Phase
// 337.1, build/p3371/SPEC.md D16 to D20).
//
// HIS RULING, "lets do B". Tapping a session in a list opens ITS TERMINAL at
// once, full screen (`TerminalPage`): the session's name as the title, ONE
// status line under it (the status in its dot's colour, then `agent ·
// project`, then the machine's badge for a session elsewhere), End's one line
// under that when End has said anything, the terminal filling the rest, and
// the numbered question's options as buttons under it (`ChoiceTray`). Top
// right, since Phase 337.3 (build/p3373/SPEC.md D21 to D24, his "an ellipses
// in the top right that show the option to catch me up or end session"): ONE
// ⋯ (`TerminalMenu`), a native menu of Catch Me Up, then End session… where
// End is drawn, End still behind Face ID, Touch ID or the passcode, with a
// progress mark beside the ⋯ while End is under way; sideways the bar is
// hidden with everything above and below the terminal (Screens/Screen.swift).
// A session with no terminal (it ended, or the Mac is older than Phase 337)
// opens on CATCH ME UP instead (`CatchUpPage`), and the face is decided at the
// route's first answer and then kept (App/TortieApp.swift `SessionRoute`), so
// nothing he is looking at swaps under him.
//
// CATCH ME UP is the conversation (Screens/ConversationScreen.swift), paged
// back from the newest turn, with THE NOW CARD after the newest turn
// (`NowCard`): where things stand now, as the 337 session page drew it, less
// its two rows. From the top: the status title in its dot's colour, `agent ·
// project`; End's line; the Catch Me Up card (main's outcome, the question,
// what it asks to run, `you asked “…”`); the options; the press line; the two
// cells, Messages and Last message, where a null is drawn the way the Mac
// draws a null and never as 0 (ActivityCells.swift); and the agent's last
// answer, only when there are no turns, because otherwise it IS the newest
// turn's answer. Docs/design/phone/Conversation.html; Session.html is the
// Terminal at rest.
//
// END (Phase 317, Screens/EndBar.swift) is in the Terminal's ⋯ menu and at
// the top right of Catch Me Up: on a session the Mac offers End for, either
// press shows the Mac's own confirmation, from one modifier, and asks Face ID,
// Touch ID or the passcode before anything is sent.
//
// REPLY (Phase 318, Screens/Reply.swift, Screens/MessageStrip.swift): pressing
// an option the Mac offers, on the Terminal's tray or on the now card, and one
// message from a box at the foot of Catch Me Up while the session waits at its
// own empty prompt. NEITHER ASKS FACE ID (his ruling, "Only for End"). What the
// agent asks to run is drawn whole under its question, and every option
// whole, so a person never presses what they could not read.
//
// Every word is main's or `Copy`'s.

import SwiftUI

// MARK: - What the screen draws, decided before anything is laid out

struct SessionDrawing: Equatable, Sendable {
    let id: String
    let name: String
    let dot: StatusDot
    let statusTitle: String
    /// `Claude Code · webapp`.
    let agentLine: String
    let machine: String?
    /// The Catch Me Up outcome, e.g. `The agent is waiting for you.`
    let outcome: String?
    /// What the agent is asking, already redacted and clipped in main.
    let question: String?
    /// `you asked “…”`, the person's own words: drawn verbatim.
    let asked: String?
    /// The agent's own numbered options, in the order it drew them.
    let choices: [PocketChoiceOption]
    let messages: CellDrawing
    let lastMessage: CellDrawing
    /// The agent's last answer, as the door sent it.
    let lastAnswer: String?
    /// The same answer parsed, once, here and never in a `body` (316.6).
    let lastAnswerRendered: RenderedAnswer?
    /// Whether the Mac offers End on this session, and its own confirmation
    /// for it (Phase 317): `.none` and nil from a Mac older than 317.
    let end: PocketEndOffer
    let endConfirm: PocketEndConfirm?
    /// What may be pressed or sent (Phase 318): the empty offer from a Mac
    /// older than 318, and from one whose offer did not agree with itself.
    let reply: PocketReplyOffer
    /// The session has a terminal to open (Phase 337): false from a Mac older
    /// than 337 and for a session that is not running. It decides the
    /// route's face (Phase 337.1, D16).
    let screen: Bool

    /// Throws `DoorFailure.malformed` when the counts are not ones the door
    /// could send (ActivityCells.swift), so the screen draws one sentence.
    init(_ detail: PocketSessionDetail) throws {
        id = detail.sessionId
        name = detail.name
        dot = detail.dot
        statusTitle = detail.statusTitle
        agentLine = Copy.joined([detail.agentLabel, detail.project])
        machine = detail.machine
        outcome = detail.catchUp?.outcome
        question = detail.question
        asked = detail.catchUp?.ask.map(Copy.youAsked)
        choices = detail.choices
        messages = try ActivityCells.messages(detail.activity, agent: detail.agent, remote: detail.machine != nil)
        lastMessage = try ActivityCells.lastMessage(detail.activity, agent: detail.agent, text: detail.lastMessageText)
        lastAnswer = detail.lastAnswer
        lastAnswerRendered = detail.lastAnswer.map(RenderedAnswer.init)
        end = detail.end
        endConfirm = detail.endConfirm
        reply = detail.replyOffer
        screen = detail.drawsScreen
    }

    /// The card is drawn when it has something to say.
    var hasCard: Bool { outcome != nil || question != nil || reply.command != nil || asked != nil }

    /// The options the Mac offers to press, each with its place among the
    /// agent's options (318's `n`, so a name names the same option on both
    /// faces), for a pairing that writes. The Terminal's tray draws these
    /// and nothing else (D19): an option the Mac does not offer is on the
    /// terminal itself, and he types it there.
    func pressable(writes: Bool) -> [PressableOption] {
        guard writes else { return [] }
        let offered = Set(reply.pressable)
        return choices.enumerated()
            .filter { offered.contains($0.element.marker) }
            .map { PressableOption(n: $0.offset, option: $0.element) }
    }
}

/// One option the Mac offers to press, with its place among the agent's
/// options (318's `n`).
struct PressableOption: Equatable, Identifiable, Sendable {
    let n: Int
    let option: PocketChoiceOption

    var id: Int { n }
}

// MARK: - The model

@MainActor
@Observable
final class SessionModel {
    enum Phase: Equatable {
        case loading
        case loaded(SessionDrawing)
        case failed(String)
    }

    let sessionId: String
    private(set) var phase: Phase = .loading
    /// The newest answer this model drew, kept when a later read fails, so the
    /// Terminal's status line and Catch Me Up's now card say the last thing
    /// the Mac said rather than nothing (Phase 337.1).
    private(set) var latest: SessionDrawing?
    private let door: any DoorReading
    private let routing: ReadRouting
    /// The read the Terminal hands (Phase 337.1, D17, D30): `/v1/session` on
    /// its side line, one exchange at a time with its pages. Every other
    /// caller leaves it out and reads through the reader.
    private let read: (@Sendable () async throws -> PocketSessionAnswer)?
    private var generation = 0

    init(
        sessionId: String,
        door: any DoorReading,
        routing: ReadRouting,
        read: (@Sendable () async throws -> PocketSessionAnswer)? = nil
    ) {
        self.sessionId = sessionId
        self.door = door
        self.routing = routing
        self.read = read
    }

    /// Read the session. True exactly when THIS read's answer is what the
    /// screen now draws (Phase 317: the End line says "as it reads now" only
    /// over such a read).
    @discardableResult
    func load() async -> Bool {
        generation += 1
        let mine = generation
        do {
            let answer: PocketSessionAnswer
            if let read {
                answer = try await read()
            } else {
                answer = try await door.session(sessionId)
            }
            guard mine == generation else { return false }
            // An answer about another session is not an answer to this read.
            guard answer.session.sessionId == sessionId else {
                phase = .failed(Copy.answerUnreadable)
                return false
            }
            // Counts no door could send, or whose sum would overflow, are an
            // answer this build cannot read: one sentence, never a trap.
            guard let drawing = try? SessionDrawing(answer.session) else {
                phase = .failed(Copy.answerUnreadable)
                return false
            }
            latest = drawing
            phase = .loaded(drawing)
            return true
        } catch {
            guard mine == generation, !Task.isCancelled, !DoorWords.isCancellation(error) else { return false }
            switch DoorWords.consequence(of: error, reading: .oneSession) {
            case .backToList: routing.backToList()
            case .pairAgain: routing.pairAgain()
            case .draw(let sentence): phase = .failed(sentence)
            }
            return false
        }
    }
}

// MARK: - The Terminal's status line follows the session (D17)

/// When the Terminal reads `/v1/session` again, so its status line follows
/// the session with no timer of its own (build/p3371/SPEC.md D17).
///
/// The Mac moves a picture's `turn` on every committed status but
/// `needs_input`, and `asking` covers that one, so a status change shows in a
/// picture before anything else. A drawn picture whose turn or asking differs
/// from the values when the last read started asks for a read; AT MOST ONE IS
/// IN FLIGHT and they START AT LEAST A SECOND APART, so a burst of pictures
/// while he types is one read a second at most. A change seen while a read is
/// in flight or cooling is read once both have ended, if the newest picture
/// still differs from what the last read started at.
///
/// The page's appear and a return to the foreground read too, except within
/// a second of a read: the route's first answer, which decided this face, is
/// the read on its first appear. The first picture after a read that saw
/// none is that read's, and asks nothing.
///
/// No arithmetic and no clock is read here: the second is a wait, handed in
/// so a test can hold it.
@MainActor
final class StatusFollow {
    /// What a picture says about the session's status.
    struct Mark: Equatable, Sendable {
        let turn: String
        let asking: Bool

        init(turn: String, asking: Bool) {
            self.turn = turn
            self.asking = asking
        }

        /// A drawn picture's mark, or nil while none is drawn.
        init?(_ picture: ScreenPicture?) {
            guard let picture else { return nil }
            self.init(turn: picture.turn, asking: picture.asking)
        }
    }

    /// The least time between two reads' starts.
    nonisolated static let gap: Duration = .seconds(1)

    private let read: @MainActor () async -> Void
    private let wait: @Sendable () async -> Void
    /// The newest picture's mark when the last read started.
    private var seen: Mark?
    /// The newest picture's mark.
    private var newest: Mark?
    /// A change arrived while a read was in flight or cooling.
    private var wanted = false
    /// The route's read decided this face; its first appear reads nothing.
    private var opened = false
    /// The read in flight, held so a test can wait for it. Never drawn from.
    private(set) var reading: Task<Void, Never>?
    /// The second after a read started.
    private(set) var cooling: Task<Void, Never>?

    init(
        read: @escaping @MainActor () async -> Void,
        wait: @escaping @Sendable () async -> Void = { try? await Task.sleep(for: StatusFollow.gap) }
    ) {
        self.read = read
        self.wait = wait
    }

    /// A picture was drawn.
    func picture(_ mark: Mark?) {
        guard let mark else { return }
        newest = mark
        guard let seen else {
            // The first picture after a read that saw none: that read's.
            self.seen = mark
            return
        }
        guard mark != seen else { return }
        ask()
    }

    /// The page appeared, or the app came back to the foreground with it on
    /// top: read, unless a read is in flight or started within the second.
    func appeared() {
        guard opened else {
            opened = true
            return
        }
        guard reading == nil, cooling == nil else { return }
        start()
    }

    /// The page went away: a read still in flight finishes and draws, and
    /// nothing more starts until it appears again.
    func stop() {
        cooling?.cancel()
        cooling = nil
        wanted = false
    }

    private func ask() {
        guard reading == nil, cooling == nil else {
            wanted = true
            return
        }
        start()
    }

    private func start() {
        wanted = false
        seen = newest
        let read = read
        let wait = wait
        reading = Task { [weak self] in
            await read()
            self?.reading = nil
            self?.again()
        }
        cooling = Task { [weak self] in
            await wait()
            guard !Task.isCancelled else { return }
            self?.cooling = nil
            self?.again()
        }
    }

    /// A read ended or its second passed: read again for a change that came
    /// meanwhile, if the newest picture still differs from what it started at.
    private func again() {
        guard wanted, reading == nil, cooling == nil else { return }
        guard newest != seen else {
            wanted = false
            return
        }
        start()
    }
}

// MARK: - The Terminal (D17)

/// One line under the Terminal's title: the dot, the status in its colour,
/// `·`, `agent · project` in the secondary colour, and the machine's badge
/// for a session elsewhere. One line; the agent line's tail is cut first.
/// It reads `SessionDrawing` fields and nothing else.
struct StatusLine: View {
    let drawing: SessionDrawing

    var body: some View {
        HStack(spacing: Frame.rowGap) {
            DotView(dot: drawing.dot, title: drawing.statusTitle)
                .accessibilityIdentifier(ID.sessionDot)
            HStack(spacing: 0) {
                Words(drawing.statusTitle, .secondary, drawing.dot.color)
                    .fixedSize()
                    .accessibilityIdentifier(ID.sessionStatus)
                Words(Copy.separator, .secondary, Tokens.textSecondary)
                    .fixedSize()
                    .accessibilityHidden(true)
                Words(drawing.agentLine, .secondary, Tokens.textSecondary)
                    .accessibilityIdentifier(ID.sessionAgent)
            }
            if let machine = drawing.machine {
                MachineBadge(name: machine)
                    .fixedSize()
                    .accessibilityIdentifier(ID.sessionMachine)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, Frame.gutter)
        .padding(.vertical, Frame.rowVertical)
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.terminalStatus)
    }
}

/// The Terminal: the session's live terminal (Screens/Screen.swift's
/// `ScreenPage`, which scrolls it back), with the status line and End's line
/// above it, the question tray under it, and one ⋯ at the top right holding
/// Catch Me Up and End (Phase 337.3).
struct TerminalPage: View {
    let screen: ScreenModel
    /// The keys, or nil for a pairing that writes nothing.
    let keys: ScreenKeySender?
    /// The Terminal's own reads of the session, on the side line (D30).
    let session: SessionModel
    let follow: StatusFollow
    /// The route's first answer, drawn until the Terminal's own read lands.
    let first: SessionDrawing
    let isTop: Bool
    let foregroundTick: Int
    /// End (Phase 317), or nil for a pairing that writes nothing.
    let end: EndModel?
    /// The press (Phase 318), or nil: then no option is a button.
    let reply: ReplyModel?
    /// Push Catch Me Up, with the session's own line for a conversation
    /// that has no turns.
    let openCatchUp: (_ honestLine: String?) -> Void

    /// The page's own height, for the tray's share of it.
    @State private var pageHeight: CGFloat = 0

    /// The newest answer the Terminal read, or the route's.
    private var drawing: SessionDrawing { session.latest ?? first }

    var body: some View {
        let drawing = drawing
        ScreenPage(model: screen, keys: keys, name: drawing.name, isTop: isTop, foregroundTick: foregroundTick) {
            VStack(alignment: .leading, spacing: 0) {
                StatusLine(drawing: drawing)
                if let end { EndLine(model: end, offer: drawing.end, confirm: drawing.endConfirm) }
            }
            .background(Tokens.bgSidebar)
        } tray: {
            // At most 40 percent of the page tall (D19), scrolling inside
            // itself past that: a CGFloat times a floating literal.
            ChoiceTray(drawing: drawing, reply: reply, cap: pageHeight * 0.4) { await session.load() }
        } trailing: {
            // One ⋯: Catch Me Up, then End session… (Phase 337.3, D21).
            TerminalMenu(end: end, offer: drawing.end, confirm: drawing.endConfirm, reread: { await session.load() }) { openCatchUp(drawing.outcome) }
        }
        .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { pageHeight = $0 }
        .onAppear { follow.appeared() }
        .onDisappear { follow.stop() }
        .onChange(of: foregroundTick) {
            guard isTop else { return }
            end?.refreshKind()
            follow.appeared()
        }
        .onChange(of: StatusFollow.Mark(screen.picture)) { _, mark in
            follow.picture(mark)
        }
    }
}

/// The Terminal's top right, upright (Phase 337.3, build/p3373/SPEC.md D21,
/// his "an ellipses in the top right that show the option to catch me up or
/// end session"): ONE item, the ⋯. Sideways the navigation bar is hidden and
/// this with it (Screens/Screen.swift `TerminalChrome`).
struct TerminalMenu: ToolbarContent {
    /// End (Phase 317), or nil for a pairing that writes nothing: then the
    /// menu holds Catch Me Up alone.
    let end: EndModel?
    let offer: PocketEndOffer
    let confirm: PocketEndConfirm?
    /// Read the session again, after End.
    let reread: @MainActor () async -> Bool
    /// Push Catch Me Up.
    let openCatchUp: () -> Void

    var body: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            TerminalMenuControl(end: end, offer: offer, confirm: confirm, reread: reread, openCatchUp: openCatchUp)
        }
    }
}

/// The ⋯ and the mark beside it (D21 to D24). A native SwiftUI `Menu`, which
/// iOS draws as its own menu (CLAUDE.md "native menus"), labelled SF Symbols'
/// ellipsis in the accent and spoken `More`. Its items, in this order: Catch
/// Me Up (the Mac's word and its speech bubble), which pushes Catch Me Up
/// exactly as the icon before it did; then End session… exactly where End's
/// press at the top right would be drawn, on or off as it would be (no
/// writer, or the Mac offers no End: Catch Me Up alone). The Mac's
/// confirmation is attached to the menu itself, outside its items, so it
/// presents once the menu has closed, and its destructive press is
/// `EndModel.press`, which asks Face ID, Touch ID or the passcode before
/// anything is sent: nothing here names the owner check. While End is under
/// way a progress mark sits left of the ⋯, so the bar never looks idle while
/// a session is ending.
struct TerminalMenuControl: View {
    let end: EndModel?
    let offer: PocketEndOffer
    let confirm: PocketEndConfirm?
    let reread: @MainActor () async -> Bool
    let openCatchUp: () -> Void
    /// The Mac's confirmation is up.
    @State private var asking = false

    /// SF Symbols' `ellipsis` on iOS 26 and later, where the bar draws its own
    /// glass circle around an item, and `ellipsis.circle` before it.
    nonisolated static var symbol: String {
        if #available(iOS 26, *) { "ellipsis" } else { "ellipsis.circle" }
    }

    /// End's row in the menu, or nil when the menu draws no End: exactly where
    /// `EndTopControl` would draw one, a writer and a row (D22).
    nonisolated static func endRow(_ drawing: EndBarDrawing?, writes: Bool) -> EndBarDrawing.Row? {
        writes ? drawing?.row : nil
    }

    /// The progress mark's identifier while End is under way, or nil (D24):
    /// `end-confirming` while the owner check is up, as End's at the top
    /// right is, and `end-writing` while the write runs.
    nonisolated static func progressMark(_ drawing: EndBarDrawing?) -> String? {
        guard let drawing else { return nil }
        if drawing.confirming { return ID.endConfirming }
        if drawing.writing { return ID.endWriting }
        return nil
    }

    /// End as drawn now, read from its model exactly as `EndTopControl` reads
    /// it, or nil for a pairing that writes nothing.
    static func drawing(_ end: EndModel?, offer: PocketEndOffer, confirm: PocketEndConfirm?) -> EndBarDrawing? {
        end.map { EndBarDrawing(offer: offer, confirm: confirm, kind: $0.kind, phase: $0.phase, line: $0.line) }
    }

    var body: some View {
        let drawing = TerminalMenuControl.drawing(end, offer: offer, confirm: confirm)
        HStack(spacing: 4) {
            if let mark = TerminalMenuControl.progressMark(drawing) {
                ProgressView()
                    .tint(Tokens.textMuted)
                    .accessibilityIdentifier(mark)
            }
            Menu {
                Button(action: openCatchUp) {
                    Label(Copy.catchMeUp, systemImage: "text.bubble")
                }
                .accessibilityIdentifier(ID.terminalMenuCatchUp)
                if let drawing, let row = TerminalMenuControl.endRow(drawing, writes: end?.writer != nil) {
                    EndMenuItem(row: row, drawing: drawing) {
                        guard drawing.confirm != nil else { return }
                        asking = true
                    }
                }
            } label: {
                Image(systemName: TerminalMenuControl.symbol)
                    .foregroundStyle(Tokens.accent)
            }
            .accessibilityLabel(Text(verbatim: Copy.more))
            .accessibilityIdentifier(ID.terminalMenu)
            .endConfirmation(model: end, offer: offer, confirm: confirm, drawing: drawing, isPresented: $asking, reread: reread)
        }
    }
}

/// The question's tray under the Terminal (D19): what the agent asks to run,
/// WHOLE, then each option the Mac offers to press as a button with its
/// marker chip and its text WHOLE, pressed exactly as Phase 318 presses them
/// and with no Face ID, then the press line. Options the Mac does not offer
/// are on the terminal and he types them. At most `cap` tall, scrolling inside
/// itself past that. `ScreenPage` hides it while the keyboard is up.
struct ChoiceTray: View {
    let drawing: SessionDrawing
    /// The press (Phase 318), or nil for a pairing that writes nothing: then
    /// there is no tray.
    let reply: ReplyModel?
    /// The most it may be tall; 0 before the page has a height, which caps
    /// nothing.
    let cap: CGFloat
    /// Read the session again, after a press.
    let reread: @MainActor () async -> Bool

    var body: some View {
        let shown = drawing.pressable(writes: reply != nil)
        if let reply, !shown.isEmpty || reply.pressLine != nil {
            ViewThatFits(in: .vertical) {
                choices(shown, reply: reply)
                ScrollView {
                    choices(shown, reply: reply)
                }
                .scrollIndicators(.visible)
            }
            .frame(maxHeight: cap > 0 ? cap : nil)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Tokens.bgSidebar.ignoresSafeArea(edges: .horizontal))
            .overlay(alignment: .top) { Hairline() }
        }
    }

    /// The command, the pressable options and the press line.
    private func choices(_ shown: [PressableOption], reply: ReplyModel) -> some View {
        let offer = drawing.reply
        return VStack(alignment: .leading, spacing: Frame.optionGap) {
            // What the agent asks to run, when its question does not say it
            // (Codex's `$` line, Phase 318): the agent's words, WHOLE, with
            // no line limit, because Yes runs exactly this.
            if !shown.isEmpty, let command = offer.command {
                Words(command, .body, Tokens.textPrimary, lines: nil)
                    .accessibilityIdentifier(ID.sessionCommand)
            }
            ForEach(shown) { item in
                OptionRow(option: item.option, n: item.n, press: press(item.option, offer: offer, reply: reply))
            }
            if let line = reply.pressLine { pressLine(line) }
        }
        .padding(Frame.gutter)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// The press of one option the Mac offers. Asks nothing first (his
    /// ruling, "Only for End").
    private func press(_ option: PocketChoiceOption, offer: PocketReplyOffer, reply: ReplyModel) -> OptionPress {
        OptionPress(on: reply.phase == .idle, pressing: reply.phase == .pressing(option.marker)) {
            reply.press(option.marker, offer: offer, reread: reread)
        }
    }

    /// The one line under the options after a press: the Mac's sentence, or
    /// the phone's when no answer came.
    private func pressLine(_ line: String) -> some View {
        Words(line, .secondary, Tokens.textSecondary, lines: nil)
            .accessibilityIdentifier(ID.sessionReplyLine)
    }
}

// MARK: - Catch Me Up (D20)

/// What Catch Me Up draws besides the turns, decided before anything is laid
/// out, so the tests read every case of it.
enum CatchUpParts {
    /// The agent's last answer is drawn on the now card only when there are
    /// no turns: otherwise it IS the newest turn's answer
    /// (src/main/pocket/routes.ts `session()`), drawn above.
    static func drawsLastAnswer(turns: [PocketTurn]) -> Bool {
        turns.isEmpty
    }

    /// The line drawn in place of turns when there are none: main's note for
    /// a session elsewhere, else the session's own line, unless the now card's
    /// card already says those very words.
    static func emptyLine(note: String?, honestLine: String?, now: SessionDrawing?) -> String? {
        if let note { return note }
        guard let honestLine else { return nil }
        return now?.outcome == honestLine ? nil : honestLine
    }

    /// Phase 318's box: drawn while the Mac says the session can take a
    /// message, and after a message that was not sent, to hold his words and
    /// its line until he pulls to read again. A pairing that writes nothing
    /// draws none.
    @MainActor
    static func boxDrawn(reply: ReplyModel?, offer: PocketReplyOffer) -> Bool {
        guard let reply else { return false }
        return offer.canSay || reply.holdsWords
    }
}

/// Catch Me Up (D20, D21): the conversation, oldest at the top and paged back
/// as before, then the now card after the newest turn, the message box at the
/// foot while the session waits at its own empty prompt, End at the top right,
/// and the title in two lines, the session's name then `Catch Me Up`. It opens
/// at its bottom, so what he reads first is where things stand now.
struct CatchUpPage: View {
    let conversation: ConversationModel
    /// The session's own line, for a conversation with no turns.
    let honestLine: String?
    let session: SessionModel
    /// End (Phase 317), or nil for a pairing that writes nothing.
    let end: EndModel?
    /// The press and the message (Phase 318), or nil.
    let reply: ReplyModel?
    /// The name the list drew, until the session's read answers.
    let name: String
    let isTop: Bool
    let foregroundTick: Int

    var body: some View {
        ConversationScreen(
            model: conversation, honestLine: honestLine, session: session, end: end, reply: reply,
            name: name, isTop: isTop, foregroundTick: foregroundTick
        )
    }
}

/// Where things stand now (D20): 337's session page less its two rows.
struct NowCard: View {
    let drawing: SessionDrawing
    /// The press (Phase 318), or nil: then no option is a button.
    let reply: ReplyModel?
    /// End (Phase 317), whose one line is drawn under the status.
    let end: EndModel?
    /// Whether the agent's last answer is drawn (no turns above it).
    let lastAnswer: Bool
    /// Read the session again, after a press.
    let reread: @MainActor () async -> Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            status
            if let end { EndLine(model: end, offer: drawing.end, confirm: drawing.endConfirm) }
            if drawing.hasCard { card }
            if !drawing.choices.isEmpty { choices }
            if let line = reply?.pressLine { pressLine(line) }
            cells
            if lastAnswer, let answer = drawing.lastAnswerRendered { lastAnswer(answer) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// `padding: 12px 16px`: the dot and the raised word in the dot's colour,
    /// then `agent · project`.
    private var status: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: Frame.rowGap) {
                DotView(dot: drawing.dot, title: drawing.statusTitle)
                    .accessibilityIdentifier(ID.sessionDot)
                Words(drawing.statusTitle, .body, drawing.dot.color)
                    .lineBox(.body)
                    .accessibilityElement(children: .combine)
                    .accessibilityIdentifier(ID.sessionStatus)
            }
            HStack(spacing: Frame.rowGap) {
                Words(drawing.agentLine, .secondary, Tokens.textSecondary)
                    .lineBox(.secondary)
                    .accessibilityElement(children: .combine)
                    .accessibilityIdentifier(ID.sessionAgent)
                if let machine = drawing.machine {
                    MachineBadge(name: machine)
                        .accessibilityIdentifier(ID.sessionMachine)
                }
            }
        }
        .padding(.vertical, 12)
        .padding(.horizontal, Frame.gutter)
    }

    /// The Catch Me Up card: 20/25 outcome, 17/22 question 8 below it, and
    /// `you asked “…”` 12 below that in the secondary colour.
    private var card: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let outcome = drawing.outcome {
                Words(outcome, .lead, Tokens.textPrimary, lines: nil)
                    .accessibilityIdentifier(ID.sessionOutcome)
            }
            if let question = drawing.question {
                Words(question, .body, Tokens.textPrimary, lines: nil)
                    .accessibilityIdentifier(ID.sessionQuestion)
                    .padding(.top, drawing.outcome == nil ? 0 : 8)
            }
            // What the agent asks to run, when its question does not say it
            // (Codex's `$` line, Phase 318): the agent's words, WHOLE, with
            // no line limit, because Yes runs exactly this.
            if let command = drawing.reply.command {
                Words(command, .body, Tokens.textPrimary, lines: nil)
                    .accessibilityIdentifier(ID.sessionCommand)
                    .padding(.top, drawing.outcome == nil && drawing.question == nil ? 0 : 8)
            }
            if let asked = drawing.asked {
                Words(asked, .body, Tokens.textSecondary, lines: nil)
                    .accessibilityIdentifier(ID.sessionAsked)
                    .padding(.top, drawing.outcome == nil && drawing.question == nil && drawing.reply.command == nil ? 0 : Frame.cardGap)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Frame.cardPadding)
        .card()
        .padding(.horizontal, Frame.gutter)
    }

    /// Each option as the agent drew it, with its own marker. An option whose
    /// marker the Mac offers to press is a button (Answer.html, Phase 318);
    /// every other is drawn as Choice.html draws it, NOT PRESSABLE, and the
    /// line `Answer this in the session.` is drawn above them only when at
    /// least one option is not pressable. While a press runs every button is
    /// off and the pressed one draws a progress mark.
    private var choices: some View {
        let offer = drawing.reply
        let pressable: Set<String> = reply == nil ? [] : Set(offer.pressable)
        let everyOnePressable = drawing.choices.allSatisfy { pressable.contains($0.marker) }
        return VStack(alignment: .leading, spacing: 0) {
            if !everyOnePressable {
                Words(Copy.answerInTheSession, .secondary, Tokens.textSecondary, lines: nil)
                    .accessibilityIdentifier(ID.sessionChoicesNote)
                    .padding(EdgeInsets(top: Frame.gutter, leading: Frame.gutter, bottom: 8, trailing: Frame.gutter))
            }
            VStack(alignment: .leading, spacing: Frame.optionGap) {
                ForEach(Array(drawing.choices.enumerated()), id: \.offset) { n, option in
                    OptionRow(option: option, n: n, press: press(option, offer: offer, pressable: pressable))
                }
            }
            .padding(.horizontal, Frame.gutter)
            .padding(.top, everyOnePressable ? Frame.gutter : 0)
        }
    }

    /// The press of one option, or nil when the Mac does not offer it. Asks
    /// nothing first (his ruling, "Only for End").
    private func press(_ option: PocketChoiceOption, offer: PocketReplyOffer, pressable: Set<String>) -> OptionPress? {
        guard let reply, pressable.contains(option.marker) else { return nil }
        return OptionPress(on: reply.phase == .idle, pressing: reply.phase == .pressing(option.marker)) {
            reply.press(option.marker, offer: offer, reread: reread)
        }
    }

    /// The one line under the options after a press: the Mac's sentence, or
    /// the phone's when no answer came.
    private func pressLine(_ line: String) -> some View {
        Words(line, .secondary, Tokens.textSecondary, lines: nil)
            .accessibilityIdentifier(ID.sessionReplyLine)
            .padding(EdgeInsets(top: 8, leading: Frame.gutter, bottom: 0, trailing: Frame.gutter))
    }

    /// The two cells, `display: flex; gap: 16px`, in one card 12 below.
    private var cells: some View {
        HStack(alignment: .top, spacing: Frame.gutter) {
            Cell(label: Copy.messages, drawing: drawing.messages,
                 id: ID.sessionMessages, smallID: ID.sessionMessagesSmall)
            Cell(label: Copy.lastMessage, drawing: drawing.lastMessage,
                 id: ID.sessionLastMessage, smallID: ID.sessionLastMessageSmall)
        }
        .padding(Frame.cardPadding)
        .card()
        .padding(.horizontal, Frame.gutter)
        .padding(.top, Frame.cardGap)
    }

    /// `THE AGENT`, 6 above the answer, which is inline markdown as written
    /// (markdown off). The answer is a container of its one element,
    /// `md-last-0`; the blocks a later phase switches back on would be
    /// `md-last-<n>`, each an element of its own.
    private func lastAnswer(_ answer: RenderedAnswer) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            RaisedLabel(Copy.agentLabel)
            AnswerText(answer: answer, scope: ID.mdLastScope)
                .accessibilityElement(children: .contain)
                .accessibilityIdentifier(ID.sessionAnswer)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Frame.cardPadding)
        .card()
        .padding(.horizontal, Frame.gutter)
        .padding(.top, Frame.cardGap)
    }
}

/// One cell: the raised label, the big line, the small word.
private struct Cell: View {
    let label: String
    let drawing: CellDrawing
    let id: String
    let smallID: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            RaisedLabel(label)
            Words(drawing.main, .count, Tokens.textPrimary)
                .lineBox(.count)
                .accessibilityElement(children: .combine)
                .accessibilityIdentifier(id)
            if let small = drawing.small {
                Words(small, .age, Tokens.textSecondary)
                    .accessibilityIdentifier(smallID)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// How one option is pressed (Phase 318): whether it may be pressed now, and
/// whether its press is the one under way.
private struct OptionPress {
    let on: Bool
    let pressing: Bool
    let action: () -> Void
}

/// `.opt`: min-height 54, the chip with the agent's marker, the option's text,
/// WHOLE (no line limit: a person never presses what they could not read).
/// With no press it is drawn in the secondary colour, because it is not a
/// control; with one it is a button, the chip and the text in the accent
/// (Answer.html), muted while another press runs.
private struct OptionRow: View {
    let option: PocketChoiceOption
    let n: Int
    let press: OptionPress?

    var body: some View {
        HStack(spacing: 0) {
            if let press {
                Button(action: press.action) {
                    content(press.on || press.pressing ? Tokens.accent : Tokens.textMuted, pressing: press.pressing)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .disabled(!press.on)
                .accessibilityIdentifier(ID.sessionChoicePress(n))
            } else {
                content(Tokens.textSecondary, pressing: false)
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.sessionChoice(n))
    }

    private func content(_ ink: Color, pressing: Bool) -> some View {
        HStack(spacing: Frame.cardGap) {
            Words(option.marker, .chipMarker, ink)
                .frame(width: Frame.chip, height: Frame.chip)
                .background(
                    RoundedRectangle(cornerRadius: Frame.chipRadius, style: .continuous)
                        .fill(Tokens.bgRaised)
                )
                .accessibilityIdentifier(ID.sessionChoiceMarker(n))
            Words(option.text, .body, ink, lines: nil)
                .frame(maxWidth: .infinity, alignment: .leading)
                .accessibilityIdentifier(ID.sessionChoiceText(n))
            if pressing {
                ProgressView()
                    .tint(Tokens.textMuted)
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, Frame.cardGap)
        .frame(minHeight: Frame.optionHeight)
        .card(radius: Frame.optionRadius)
    }
}
