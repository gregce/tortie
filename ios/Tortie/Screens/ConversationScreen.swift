// One session's whole conversation, paged back from the newest turn (Phase 316.2).
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
//   the agent        the answer as inline markdown (AnswerText.swift), or
//                    main's `absence` sentence when there is none on record
//   the notice       `the session stopped: …`, when the CLI left one
//
// Above the turns, one line says the terminal's own output is not here and
// stays on the Mac: "the full CONVERSATION yes, the raw terminal scrollback
// no". There is no message box: nothing on the phone can type into a session
// until Phase 318 (decision 2).
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
            var next = phase == .loaded ? pages : TurnPages(sessionId: sessionId)
            try next.acceptNewest(page)
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
            try next.acceptOlder(page, askedTo: to)
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
    /// yet`). Main composed it for the session screen's card.
    let honestLine: String?
    let isTop: Bool
    let foregroundTick: Int

    /// How much of the older-turns spinner must be on screen before it counts
    /// as in view. Any sliver: the spinner is 20 pt tall and sits above the
    /// oldest turn read, so a person who has scrolled to it has reached the top.
    private static let olderInView: Double = 0.01

    var body: some View {
        VStack(spacing: 0) {
            header
            Hairline()
            switch model.phase {
            case .loading:
                LoadingView(id: ID.conversationLoading)
                Spacer(minLength: 0)
            case .failed(let sentence):
                FailureView(sentence: sentence, id: ID.conversationFailure) {
                    Task { await model.loadNewest() }
                }
                Spacer(minLength: 0)
            case .loaded:
                turns
            }
        }
        .background(Tokens.bgSidebar.ignoresSafeArea())
        .task { await model.loadNewest() }
        .onChange(of: foregroundTick) {
            guard isTop else { return }
            Task { await model.loadNewest() }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.conversationScreen)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Tokens.bgSidebar, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Words(Copy.conversation, .navTitle, Tokens.textPrimary)
                    .accessibilityAddTraits(.isHeader)
            }
        }
    }

    /// The terminal line, and the desktop's note when no turn has a clock.
    private var header: some View {
        VStack(alignment: .leading, spacing: 2) {
            Words(Copy.terminalStaysOnMac, .small, Tokens.textMuted, lines: nil)
                .accessibilityIdentifier(ID.conversationTerminalLine)
            if model.noClocks {
                Words(Copy.noClockNote, .small, Tokens.textMuted)
                    .accessibilityIdentifier(ID.conversationNoClock)
            }
        }
        .padding(.horizontal, Frame.gutter)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var turns: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Frame.cardGap) {
                older
                if model.pages.turns.isEmpty {
                    empty
                } else {
                    // Not lazy: every turn read is in the accessibility tree,
                    // so a UI test counts what was drawn, not what is on screen.
                    ForEach(model.pages.turns) { turn in
                        TurnCard(
                            turn: turn,
                            clock: TurnClock.clock(turn.askAt, answeredAt: model.answeredAt)
                        )
                    }
                }
            }
            .padding(.vertical, Frame.cardGap)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .defaultScrollAnchor(.bottom)
        .scrollIndicators(.hidden)
        .refreshable { await model.loadNewest() }
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
                .accessibilityIdentifier(ID.conversationOlderLine)
                .padding(.horizontal, Frame.gutter)
        } else if model.pagingBack {
            ProgressView()
                .tint(Tokens.textMuted)
                .frame(maxWidth: .infinity)
                .onScrollVisibilityChange(threshold: Self.olderInView) { visible in
                    model.top(visible: visible)
                }
                .accessibilityIdentifier(ID.conversationOlder)
        }
    }

    /// No turns: main's note (a session on another machine), else the
    /// session's own line.
    @ViewBuilder
    private var empty: some View {
        if let note = model.pages.note {
            Words(note, .body, Tokens.textSecondary, lines: nil)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(Frame.cardPadding)
                .card()
                .accessibilityElement(children: .combine)
                .accessibilityIdentifier(ID.conversationNote)
                .padding(.horizontal, Frame.gutter)
        } else if let honestLine {
            Words(honestLine, .body, Tokens.textSecondary, lines: nil)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(Frame.cardPadding)
                .card()
                .accessibilityElement(children: .combine)
                .accessibilityIdentifier(ID.conversationEmpty)
                .padding(.horizontal, Frame.gutter)
        }
    }
}

/// One turn, in the Session screen's card.
private struct TurnCard: View {
    let turn: PocketTurn
    let clock: String?

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
            if let answer = turn.answerText {
                AnswerText(answer: answer)
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
