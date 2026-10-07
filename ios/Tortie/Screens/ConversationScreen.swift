// Catch Me Up: one session's whole conversation, paged back from the newest
// turn (Phase 316.2), and where it stands now (Phase 337.1, build/p3371/SPEC.md
// D20 to D22). The file and its model keep the name they had; the page is
// named Catch Me Up everywhere a person reads it (his ruling, "Yes, rename
// it"), the Mac's own word for the record it reads.
//
// HIS RULING (build/p316/SPEC.md section 6, decision 3): there is no approved
// mock, so this is drawn in the Session screen's style from the desktop's turn
// block (src/renderer/overview/TurnBlock.tsx), and he judges it on his phone at
// 316.4. So each turn is a Session.html card holding TurnBlock's parts, less
// the git mark (the door's turn has none):
//
//   the clock        formatTurnClock's rule, at the answer's own `at`
//   you              the ask, `Text(verbatim:)`, NEVER markdown: a person's
//                    words drawn as markdown would change what they wrote
//   the agent        the answer as inline markdown, as written
//                    (AnswerText.swift; markdown off, his ruling of
//                    2026-10-02), parsed once as its page was accepted, or
//                    main's `absence` sentence when there is none on record
//   the notice       `the session stopped: …`, when the CLI left one
//
// THE NOW CARD (D20) comes after the newest turn: the status, End's line,
// Catch Me Up's card, the options, the press line and the two cells
// (Screens/SessionScreen.swift `NowCard`), and the agent's last answer only
// when there are no turns, because otherwise it IS the newest turn's answer.
// The page is drawn bottom-anchored, so it opens on the now card with the
// conversation above it, as the Mac's Catch Me Up reads. Phase 318's message
// box sits in the bottom inset while the session waits at its own empty
// prompt, and End at the top right. The title is two lines: the session's
// name, then `Catch Me Up`.
//
// THE TERMINAL LINE IS GONE (D22). Until Phase 337.1 a line above the turns
// said the terminal's scrollback stayed on the Mac; the Terminal now scrolls
// back through what the session printed (his ruling, "Yes, scroll back on the
// Screen"), so that line would be false.
//
// PAGING. The newest page is read on appear, on return to the foreground and on
// pull; older pages are read as the top of the conversation scrolls into view.
// `TurnPages` (Door/Contract.swift) holds every page to the door's promise and
// decides what to ask next; this file only asks and draws. A page it refuses
// stops the paging and draws one line where the older turns would be.

import SwiftUI

// MARK: - The clock over a turn

/// src/shared/overview-clock.ts `formatTurnClock`: a turn from the same day as
/// the answer shows its time alone, an older one its date as well, because a
/// bare time on last week's turn would claim a today that is not true. Null in,
/// null out, which is how a record with no per-turn clock draws no clock. The
/// time is the phone's own format, as `read 4:32 PM` is. "Now" is the moment
/// the door composed its answer, never the phone's clock.
enum TurnClock {
    static func clock(_ askAt: String?, answeredAt epochMs: Double, calendar: Calendar = .current) -> String? {
        guard let askAt, let when = parse(askAt) else { return nil }
        let now = Date(timeIntervalSince1970: epochMs / 1000)
        var style = Date.FormatStyle(date: .omitted, time: .shortened)
        style.calendar = calendar
        style.timeZone = calendar.timeZone
        if calendar.isDate(when, inSameDayAs: now) {
            return when.formatted(style)
        }
        var dated = Date.FormatStyle.dateTime.month(.abbreviated).day().hour().minute()
        dated.calendar = calendar
        dated.timeZone = calendar.timeZone
        return when.formatted(dated)
    }

    /// An ISO 8601 moment, with or without fractional seconds, which is what
    /// the agents' records carry. Anything else is no clock.
    static func parse(_ text: String) -> Date? {
        if let date = try? Date.ISO8601FormatStyle(includingFractionalSeconds: true).parse(text) {
            return date
        }
        return try? Date.ISO8601FormatStyle().parse(text)
    }
}

// MARK: - The model

@MainActor
@Observable
final class ConversationModel {
    enum Phase: Equatable {
        case loading
        case loaded
        case failed(String)
    }

    let sessionId: String
    private(set) var phase: Phase = .loading
    private(set) var pages: TurnPages
    /// The moment the newest page was composed, for the turn clocks.
    private(set) var answeredAt: Double = 0
    /// The one line drawn where older turns would be, when a page of them was
    /// refused or could not be read. Paging stops with it.
    private(set) var olderLine: String?
    /// Every held turn's answer, parsed once as its page was accepted and
    /// before `pages` changes, by turn index (316.6). Not observed: `pages` is,
    /// and it is assigned after this, so a drawn turn always finds its answer.
    /// The parse itself runs OFF the main actor (`rendering`), between the
    /// door's answer and the page's acceptance.
    @ObservationIgnored private(set) var rendered: [Int: RenderedAnswer] = [:]

    private let door: any DoorReading
    private let routing: ReadRouting
    private var generation = 0
    private var loadingOlder = false
    private var topVisible = false

    init(sessionId: String, door: any DoorReading, routing: ReadRouting) {
        self.sessionId = sessionId
        self.door = door
        self.routing = routing
        pages = TurnPages(sessionId: sessionId)
    }

    /// True while an older page will be asked for when the top comes into view.
    var pagingBack: Bool { olderLine == nil && pages.olderBound != nil }

    /// Every turn carries no clock, which the desktop says in the header.
    var noClocks: Bool {
        !pages.turns.isEmpty && pages.turns.allSatisfy { $0.askAt == nil }
    }

    /// The newest page: the first read, and every refresh after it.
    func loadNewest() async {
        generation += 1
        let mine = generation
        do {
            let page = try await door.turns(sessionId, to: nil)
            guard mine == generation else { return }
            let fresh = await Self.rendering(page.turns)
            guard mine == generation else { return }
            var next = phase == .loaded ? pages : TurnPages(sessionId: sessionId)
            try next.acceptNewest(page)
            rendered = Self.parsed(next.turns, fresh: fresh, held: rendered)
            pages = next
            answeredAt = page.at
            phase = .loaded
        } catch {
            guard mine == generation, !Task.isCancelled, !DoorWords.isCancellation(error) else { return }
            switch DoorWords.consequence(of: error, reading: .oneSession) {
            case .backToList: routing.backToList()
            case .pairAgain: routing.pairAgain()
            case .draw(let sentence): phase = .failed(sentence)
            }
            return
        }
        await olderWhileTopVisible()
    }

    /// Every answer one page carries, parsed OFF THE MAIN ACTOR (the fix
    /// round: a hostile page of twenty answers inside every cap parsed in
    /// 2.3 s on iOS 18.3, which on the main actor is 2.3 s of a screen that
    /// does not move). The parse reads the page's own strings and nothing
    /// else, so it needs no actor; the page is accepted after it, on the main
    /// actor, as before.
    nonisolated static func rendering(_ turns: [PocketTurn]) async -> [Int: RenderedAnswer] {
        await Task.detached(priority: .userInitiated) {
            var out: [Int: RenderedAnswer] = [:]
            for turn in turns {
                guard let answer = turn.answerText else { continue }
                out[turn.index] = RenderedAnswer(answer)
            }
            return out
        }.value
    }

    /// The answers of the turns now held: a turn the accepted page carried
    /// takes its fresh parse (the newest turn's answer may have arrived
    /// since), and any other keeps what was parsed before. Turns no longer
    /// held are dropped. A held answer with no parse at all, which acceptance
    /// does not make, is parsed here rather than drawn as nothing.
    static func parsed(_ turns: [PocketTurn], fresh: [Int: RenderedAnswer], held: [Int: RenderedAnswer]) -> [Int: RenderedAnswer] {
        var out: [Int: RenderedAnswer] = [:]
        for turn in turns {
            guard let answer = turn.answerText else { continue }
            out[turn.index] = fresh[turn.index] ?? held[turn.index] ?? RenderedAnswer(answer)
        }
        return out
    }

    /// The top of the conversation came into view, or left it. Answers the
    /// paging it started, so a caller can wait for it.
    /// The view reports on every scrolled frame; only a change does anything,
    /// and a paging already under way keeps going while the top stays in view.
    @discardableResult
    func top(visible: Bool) -> Task<Void, Never>? {
        guard visible != topVisible else { return nil }
        topVisible = visible
        guard visible else { return nil }
        return Task { await olderWhileTopVisible() }
    }

    /// Older pages, one at a time, for as long as the top stays in view: a
    /// short page leaves the top on screen and the next is asked for at once.
    private func olderWhileTopVisible() async {
        while topVisible, pagingBack, !loadingOlder, phase == .loaded {
            guard await loadOlder() else { return }
        }
    }

    /// One older page. False when paging stopped.
    private func loadOlder() async -> Bool {
        guard let to = pages.olderBound else { return false }
        loadingOlder = true
        defer { loadingOlder = false }
        let mine = generation
        var next = pages
        do {
            let page = try await door.turns(sessionId, to: to)
            guard mine == generation else { return false }
            let fresh = await Self.rendering(page.turns)
            guard mine == generation else { return false }
            // Read again after the parse: the newest page may have been
            // accepted while it ran.
            next = pages
            try next.acceptOlder(page, askedTo: to)
            rendered = Self.parsed(next.turns, fresh: fresh, held: rendered)
            pages = next
            if page.turns.isEmpty && page.more {
                // `more` on a page that added nothing: the door broke its own
                // promise ("always false on an empty page"). Stop, and say so.
                olderLine = Copy.earlierTurnsUnreadable
                return false
            }
            return true
        } catch {
            guard mine == generation, !Task.isCancelled, !DoorWords.isCancellation(error) else { return false }
            switch DoorWords.consequence(of: error, reading: .oneSession) {
            case .backToList: routing.backToList()
            case .pairAgain: routing.pairAgain()
            case .draw:
                // A refused page leaves `next` stopped; keep that, and say why
                // where the older turns would be. The turns already read stay.
                pages = next
                olderLine = DoorWords.olderPageSentence(for: error)
            }
            return false
        }
    }
}

// MARK: - The screen

struct ConversationScreen: View {
    let model: ConversationModel
    /// The session's own line, drawn when it has no turns at all (the
    /// desktop's honest line: `no agent here`, `started 10:02, nothing asked
    /// yet`). Main composed it for the session's card.
    let honestLine: String?
    /// The session as it stands now (Phase 337.1): its read, which the now
    /// card draws from.
    let session: SessionModel
    /// End (Phase 317), or nil for a pairing that writes nothing.
    let end: EndModel?
    /// The press and the message (Phase 318), or nil for a pairing that
    /// writes nothing: then no option is a button and no box is drawn.
    let reply: ReplyModel?
    /// The name the list drew, for the title until the session's read
    /// answers (empty for a session an alert opened).
    let name: String
    let isTop: Bool
    let foregroundTick: Int
    /// Whether the message box has the keyboard.
    @State private var typing = false

    /// How much of the older-turns spinner must be on screen before it counts
    /// as in view. Any sliver: the spinner is 20 pt tall and sits above the
    /// oldest turn read, so a person who has scrolled to it has reached the top.
    private static let olderInView: Double = 0.01

    /// The door's name once it answered; the list's until then.
    private var title: String {
        session.latest?.name ?? name
    }

    var body: some View {
        VStack(spacing: 0) {
            if model.noClocks {
                header
                Hairline()
            }
            page
        }
        .background(Tokens.bgSidebar.ignoresSafeArea())
        // The session is read on appear only when nothing has read it yet:
        // a session that opened on this face was read by its route.
        .task { await readBoth(session: session.latest == nil) }
        .onChange(of: foregroundTick) {
            guard isTop else { return }
            end?.refreshKind()
            Task { await readBoth(session: true) }
        }
        // Above the tab bar, so the page ends above it: the message box
        // alone (End is in the top bar).
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if let reply, CatchUpParts.boxDrawn(reply: reply, offer: replyOffer) {
                MessageStrip(model: reply, focused: $typing) { await session.load() }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.catchUpScreen)
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Tokens.bgSidebar, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 0) {
                    Words(title, .navTitle, Tokens.textPrimary)
                        .accessibilityAddTraits(.isHeader)
                    Words(Copy.catchMeUp, .small, Tokens.textSecondary)
                }
            }
            // End, top right (Phase 337, D33).
            EndTopItem(model: end, offer: endOffer.0, confirm: endOffer.1) { await session.load() }
        }
    }

    /// The offer and the confirmation the session's newest answer carries.
    private var endOffer: (PocketEndOffer, PocketEndConfirm?) {
        guard let drawing = session.latest else { return (.none, nil) }
        return (drawing.end, drawing.endConfirm)
    }

    /// The reply offer the session's newest answer carries; the empty one
    /// otherwise.
    private var replyOffer: PocketReplyOffer {
        session.latest?.reply ?? .empty
    }

    /// The conversation and the session, read together: on a pull, and on a
    /// return to the foreground while this is on top; on appear, the session
    /// too unless it is already read.
    private func readBoth(session reading: Bool) async {
        let model = model
        let session = session
        guard reading else {
            await model.loadNewest()
            return
        }
        async let turns: Void = model.loadNewest()
        async let now: Bool = session.load()
        _ = await (turns, now)
    }

    /// The desktop's note when no turn has a clock.
    private var header: some View {
        Words(Copy.noClockNote, .small, Tokens.textMuted)
            .accessibilityIdentifier(ID.catchUpNoClock)
            .padding(.horizontal, Frame.gutter)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// The turns, oldest at the top, then the now card, bottom-anchored.
    private var page: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Frame.cardGap) {
                switch model.phase {
                case .loading:
                    LoadingView(id: ID.catchUpLoading)
                case .failed(let sentence):
                    FailureView(sentence: sentence, id: ID.catchUpFailure) {
                        Task { await model.loadNewest() }
                    }
                case .loaded:
                    turns
                }
                now
            }
            .padding(.vertical, Frame.cardGap)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .defaultScrollAnchor(.bottom)
        .scrollIndicators(.hidden)
        .scrollDismissesKeyboard(.interactively)
        .refreshable {
            reply?.readingAgain()
            await readBoth(session: true)
        }
    }

    /// The turns read, or the line drawn in place of them.
    @ViewBuilder
    private var turns: some View {
        older
        if model.pages.turns.isEmpty {
            empty
        } else {
            // Not lazy: every turn read is in the accessibility tree,
            // so a UI test counts what was drawn, not what is on screen.
            ForEach(model.pages.turns) { turn in
                TurnCard(
                    turn: turn,
                    clock: TurnClock.clock(turn.askAt, answeredAt: model.answeredAt),
                    answer: model.rendered[turn.index]
                )
            }
        }
    }

    /// Where things stand now, after the newest turn (D20): the now card from
    /// the session's newest answer, its spinner before the first, or its one
    /// sentence when that read did not come back.
    @ViewBuilder
    private var now: some View {
        if let drawing = session.latest {
            NowCard(
                drawing: drawing, reply: reply, end: end,
                lastAnswer: CatchUpParts.drawsLastAnswer(turns: model.pages.turns),
                reread: { await session.load() }
            )
        } else if case .failed(let sentence) = session.phase {
            FailureView(sentence: sentence, id: ID.sessionFailure) {
                Task { await session.load() }
            }
        } else {
            LoadingView(id: ID.sessionLoading)
        }
    }

    /// Where older turns arrive: a spinner while there are more, the one line
    /// when a page of them was refused, nothing once the first turn is here.
    ///
    /// THE SPINNER IS THE TRIGGER (Phase 316.2's fix round). The scroll view
    /// itself says when it comes into view and when it leaves
    /// (`onScrollVisibilityChange`, iOS 18.0, inside the 18.1 floor), and the
    /// model pages back for as long as it stays in view. The first build asked a
    /// GeometryReader for the spinner's frame through a preference, and in the
    /// Simulator that preference never reported the spinner in view: it sat on
    /// screen for three minutes of readings and no older page was ever asked
    /// for, so a conversation of more than 20 turns showed only its newest 20.
    @ViewBuilder
    private var older: some View {
        if let line = model.olderLine {
            Words(line, .small, Tokens.textMuted, lines: nil)
                .accessibilityIdentifier(ID.catchUpOlderLine)
                .padding(.horizontal, Frame.gutter)
        } else if model.pagingBack {
            ProgressView()
                .tint(Tokens.textMuted)
                .frame(maxWidth: .infinity)
                .onScrollVisibilityChange(threshold: Self.olderInView) { visible in
                    model.top(visible: visible)
                }
                .accessibilityIdentifier(ID.catchUpOlder)
        }
    }

    /// No turns: main's note (a session on another machine), else the
    /// session's own line, unless the now card's card already says it.
    @ViewBuilder
    private var empty: some View {
        if let note = model.pages.note {
            Words(note, .body, Tokens.textSecondary, lines: nil)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(Frame.cardPadding)
                .card()
                .accessibilityElement(children: .combine)
                .accessibilityIdentifier(ID.catchUpNote)
                .padding(.horizontal, Frame.gutter)
        } else if let line = CatchUpParts.emptyLine(note: nil, honestLine: honestLine, now: session.latest) {
            Words(line, .body, Tokens.textSecondary, lines: nil)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(Frame.cardPadding)
                .card()
                .accessibilityElement(children: .combine)
                .accessibilityIdentifier(ID.catchUpEmpty)
                .padding(.horizontal, Frame.gutter)
        }
    }
}

/// One turn, in the Session screen's card.
private struct TurnCard: View {
    let turn: PocketTurn
    let clock: String?
    /// The answer, parsed when its page was accepted.
    let answer: RenderedAnswer?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let clock {
                Words(clock, .age, Tokens.textMuted)
                    .accessibilityIdentifier(ID.turnClock(turn.index))
                    .padding(.bottom, 8)
            }
            RaisedLabel(Copy.youLabel)
                .padding(.bottom, 6)
            // THE ASK IS PLAIN TEXT. It is the person's own words and is never
            // parsed as markdown (his ruling; conformance:ios rule h).
            Text(verbatim: turn.askText)
                .font(Face.body.font)
                .foregroundStyle(Tokens.textPrimary)
                .lineSpacing(Face.body.spacing)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
                .accessibilityIdentifier(ID.turnAsk(turn.index))
            if turn.askClipped {
                Words(Copy.restNotShown, .small, Tokens.textMuted, lines: nil)
                    .accessibilityIdentifier(ID.turnAskClipped(turn.index))
                    .padding(.top, 4)
            }
            RaisedLabel(Copy.agentLabel)
                .padding(.top, Frame.cardGap)
                .padding(.bottom, 6)
            if let text = turn.answerText {
                // A container of the answer, `md-<index>-0` drawn as written
                // while markdown is off (his ruling of 2026-10-02), its blocks
                // `md-<index>-<n>` when a later phase switches them back on.
                // Every accepted page is parsed before it is drawn, so the
                // verbatim words are only a floor that keeps every word if it
                // ever were not.
                Group {
                    if let answer {
                        AnswerText(answer: answer, scope: String(turn.index))
                    } else {
                        Words(text, .body, Tokens.textPrimary, lines: nil)
                    }
                }
                .accessibilityElement(children: .contain)
                .accessibilityIdentifier(ID.turnAnswer(turn.index))
                if turn.answerClipped {
                    Words(Copy.restNotShown, .small, Tokens.textMuted, lines: nil)
                        .accessibilityIdentifier(ID.turnAnswerClipped(turn.index))
                        .padding(.top, 4)
                }
            } else if let absence = turn.absence {
                Words(absence, .body, Tokens.textMuted, lines: nil)
                    .accessibilityIdentifier(ID.turnAbsence(turn.index))
            }
            if let notice = turn.notice {
                Words(Copy.sessionStopped(notice), .small, Tokens.textMuted, lines: nil)
                    .accessibilityIdentifier(ID.turnNotice(turn.index))
                    .padding(.top, 4)
            }
        }
        .padding(Frame.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.turn(turn.index))
        .padding(.horizontal, Frame.gutter)
    }
}
