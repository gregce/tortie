// One session: its status, where it is, and what it last said (Phase 316.2).
//
// docs/design/phone/Session.html, frame for frame, WITHOUT "Open in Claude"
// (316 draws no hand-off; the door answers `handoff: null`). Plus the
// options when the agent drew any: Choice.html's, drawn unpressable under
// "Answer this in the session.", and since Phase 318 Answer.html's, where
// each option the Mac offers to press is a button.
//
// From the top: the status title in its dot's colour, `agent · project`; the
// Catch Me Up card (main's outcome, the question, `you asked “…”`); the
// options; the two cells, Messages and Last message, where a null is drawn the
// way the Mac draws a null and never as 0 (ActivityCells.swift); the agent's
// last answer as inline markdown, as written (markdown off since his ruling of
// 2026-10-02), parsed once when the answer lands (316.6); and the
// row that opens the whole conversation.
//
// Every word is main's or `Copy`'s. It reads on appear, on return to the
// foreground and on pull.
//
// END IS HERE since Phase 317 (Screens/EndBar.swift): a bar above the tab bar
// on a session the Mac offers End for, whose press shows the Mac's own
// confirmation and asks Face ID, Touch ID or the passcode before anything is
// sent.
//
// AND SINCE PHASE 318, REPLY (Screens/Reply.swift, Screens/MessageStrip.swift):
// pressing an option the Mac offers, and one message from a box above the End
// bar while the session waits at its own empty prompt. NEITHER ASKS FACE ID
// (his ruling, "Only for End"). What the agent asks to run is drawn whole
// under its question, and every option whole, so a person never presses what
// they could not read. While the box has the keyboard the End bar is not
// drawn.

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
    }

    /// The card is drawn when it has something to say.
    var hasCard: Bool { outcome != nil || question != nil || reply.command != nil || asked != nil }
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
    private let door: any DoorReading
    private let routing: ReadRouting
    private var generation = 0

    init(sessionId: String, door: any DoorReading, routing: ReadRouting) {
        self.sessionId = sessionId
        self.door = door
        self.routing = routing
    }

    /// Read the session. True exactly when THIS read's answer is what the
    /// screen now draws (Phase 317: the End line says "as it reads now" only
    /// over such a read).
    @discardableResult
    func load() async -> Bool {
        generation += 1
        let mine = generation
        do {
            let answer = try await door.session(sessionId)
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

// MARK: - The screen

struct SessionScreen: View {
    let model: SessionModel
    /// The name the list drew, for the title until the answer lands (empty
    /// for a session an alert opened, which the list never drew).
    let name: String

    /// The door's name once it answered, so a session an alert opened is
    /// titled by the door; the list's until then.
    private var title: String {
        if case .loaded(let drawing) = model.phase { return drawing.name }
        return name
    }
    let isTop: Bool
    let foregroundTick: Int
    let openConversation: (_ honestLine: String?) -> Void
    /// End (Phase 317), or nil for a pairing that writes nothing.
    var end: EndModel?
    /// The press and the message (Phase 318), or nil for a pairing that
    /// writes nothing: then no option is a button and no box is drawn.
    var reply: ReplyModel?
    /// Whether the message box has the keyboard.
    @State private var typing = false

    /// The offer and the confirmation the loaded answer carries.
    private var endOffer: (PocketEndOffer, PocketEndConfirm?) {
        guard case .loaded(let drawing) = model.phase else { return (.none, nil) }
        return (drawing.end, drawing.endConfirm)
    }

    /// The reply offer the loaded answer carries; the empty one otherwise.
    private var replyOffer: PocketReplyOffer {
        guard case .loaded(let drawing) = model.phase else { return .empty }
        return drawing.reply
    }

    /// The box is drawn while the Mac says the session can take a message,
    /// and after a message that was not sent, to hold his words and its line
    /// until he pulls to read again.
    private var boxDrawn: Bool {
        guard let reply else { return false }
        return replyOffer.canSay || reply.holdsWords
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                switch model.phase {
                case .loading:
                    LoadingView(id: ID.sessionLoading)
                case .failed(let sentence):
                    FailureView(sentence: sentence, id: ID.sessionFailure) {
                        Task { await model.load() }
                    }
                case .loaded(let drawing):
                    SessionBody(drawing: drawing, reply: reply, reread: { await model.load() }) {
                        openConversation(drawing.outcome)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.bottom, Frame.gutter)
        }
        .scrollIndicators(.hidden)
        .scrollDismissesKeyboard(.interactively)
        .background(Tokens.bgSidebar.ignoresSafeArea())
        .refreshable {
            reply?.readingAgain()
            await model.load()
        }
        .task { await model.load() }
        .onChange(of: foregroundTick) {
            guard isTop else { return }
            end?.refreshKind()
            Task { await model.load() }
        }
        // Above the tab bar, so the content ends above it: the message box,
        // then the End bar, which is not drawn while the box has the keyboard.
        .safeAreaInset(edge: .bottom, spacing: 0) {
            VStack(spacing: 0) {
                if let reply, boxDrawn {
                    MessageStrip(model: reply, focused: $typing) { await model.load() }
                }
                if let end, !(typing && boxDrawn) {
                    let (offer, confirm) = endOffer
                    EndBar(model: end, offer: offer, confirm: confirm) { await model.load() }
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.sessionScreen)
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Tokens.bgSidebar, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Words(title, .navTitle, Tokens.textPrimary)
                    .accessibilityAddTraits(.isHeader)
            }
        }
    }
}

private struct SessionBody: View {
    let drawing: SessionDrawing
    /// The press (Phase 318), or nil: then no option is a button.
    let reply: ReplyModel?
    /// Read the session again, after a press.
    let reread: @MainActor () async -> Bool
    let openConversation: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            status
            if drawing.hasCard { card }
            if !drawing.choices.isEmpty { choices }
            if let line = reply?.pressLine { pressLine(line) }
            cells
            if let answer = drawing.lastAnswerRendered { lastAnswer(answer) }
            conversationRow
        }
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

    /// The hand-off row's shape (54 tall, the label in the accent, a chevron),
    /// opening the conversation on the phone.
    private var conversationRow: some View {
        Button(action: openConversation) {
            HStack {
                Words(Copy.conversation, .body, Tokens.accent)
                Spacer(minLength: Frame.rowGap)
                Chevron()
            }
            .padding(.horizontal, Frame.gutter)
            .frame(height: Frame.linkRowHeight)
            .frame(maxWidth: .infinity)
            .card()
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(ID.sessionOpenConversation)
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
