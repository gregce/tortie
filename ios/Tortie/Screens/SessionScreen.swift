// One session: its status, where it is, and what it last said (Phase 316.2).
//
// docs/design/phone/Session.html, frame for frame, WITHOUT the message strip
// (no message box and no send control until Phase 318, his ruling) and WITHOUT
// "Open in Claude" (316 draws no hand-off; the door answers `handoff: null`).
// Plus Choice.html's options when the agent drew any, drawn UNPRESSABLE under
// "Answer this in the session.", because pressing one is Phase 318's.
//
// From the top: the status title in its dot's colour, `agent · project`; the
// Catch Me Up card (main's outcome, the question, `you asked “…”`); the
// options; the two cells, Messages and Last message, where a null is drawn the
// way the Mac draws a null and never as 0 (ActivityCells.swift); the agent's
// last answer as markdown; and the row that opens the whole conversation.
//
// Every word is main's or `Copy`'s. It reads on appear, on return to the
// foreground and on pull.

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
    /// The agent's last answer, drawn as inline markdown.
    let lastAnswer: String?

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
    }

    /// The card is drawn when it has something to say.
    var hasCard: Bool { outcome != nil || question != nil || asked != nil }
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

    func load() async {
        generation += 1
        let mine = generation
        do {
            let answer = try await door.session(sessionId)
            guard mine == generation else { return }
            // An answer about another session is not an answer to this read.
            guard answer.session.sessionId == sessionId else {
                phase = .failed(Copy.answerUnreadable)
                return
            }
            // Counts no door could send, or whose sum would overflow, are an
            // answer this build cannot read: one sentence, never a trap.
            guard let drawing = try? SessionDrawing(answer.session) else {
                phase = .failed(Copy.answerUnreadable)
                return
            }
            phase = .loaded(drawing)
        } catch {
            guard mine == generation, !Task.isCancelled, !DoorWords.isCancellation(error) else { return }
            switch DoorWords.consequence(of: error, reading: .oneSession) {
            case .backToList: routing.backToList()
            case .pairAgain: routing.pairAgain()
            case .draw(let sentence): phase = .failed(sentence)
            }
        }
    }
}

// MARK: - The screen

struct SessionScreen: View {
    let model: SessionModel
    /// The name the list drew, for the title until the answer lands.
    let name: String
    let isTop: Bool
    let foregroundTick: Int
    let openConversation: (_ honestLine: String?) -> Void

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
                    SessionBody(drawing: drawing) { openConversation(drawing.outcome) }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.bottom, Frame.gutter)
        }
        .scrollIndicators(.hidden)
        .background(Tokens.bgSidebar.ignoresSafeArea())
        .refreshable { await model.load() }
        .task { await model.load() }
        .onChange(of: foregroundTick) {
            guard isTop else { return }
            Task { await model.load() }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.sessionScreen)
        .navigationTitle(name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Tokens.bgSidebar, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Words(name, .navTitle, Tokens.textPrimary)
                    .accessibilityAddTraits(.isHeader)
            }
        }
    }
}

private struct SessionBody: View {
    let drawing: SessionDrawing
    let openConversation: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            status
            if drawing.hasCard { card }
            if !drawing.choices.isEmpty { choices }
            cells
            if let answer = drawing.lastAnswer { lastAnswer(answer) }
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
            if let asked = drawing.asked {
                Words(asked, .body, Tokens.textSecondary, lines: nil)
                    .accessibilityIdentifier(ID.sessionAsked)
                    .padding(.top, drawing.outcome == nil && drawing.question == nil ? 0 : Frame.cardGap)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Frame.cardPadding)
        .card()
        .padding(.horizontal, Frame.gutter)
    }

    /// Choice.html: the line, then each option as the agent drew it, with its
    /// own marker. NOT PRESSABLE: no button, no tap, no action.
    private var choices: some View {
        VStack(alignment: .leading, spacing: 0) {
            Words(Copy.answerInTheSession, .secondary, Tokens.textSecondary, lines: nil)
                .accessibilityIdentifier(ID.sessionChoicesNote)
                .padding(EdgeInsets(top: Frame.gutter, leading: Frame.gutter, bottom: 8, trailing: Frame.gutter))
            VStack(alignment: .leading, spacing: Frame.optionGap) {
                ForEach(Array(drawing.choices.enumerated()), id: \.offset) { n, option in
                    OptionRow(option: option, n: n)
                }
            }
            .padding(.horizontal, Frame.gutter)
        }
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

    /// `THE AGENT`, 6 above the answer, which is inline markdown.
    private func lastAnswer(_ answer: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            RaisedLabel(Copy.agentLabel)
            AnswerText(answer: answer)
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

/// `.opt`: min-height 54, the chip with the agent's marker, the option's text.
/// Drawn in the secondary colour, because it is not a control.
private struct OptionRow: View {
    let option: PocketChoiceOption
    let n: Int

    var body: some View {
        HStack(spacing: Frame.cardGap) {
            Words(option.marker, .chipMarker, Tokens.textSecondary)
                .frame(width: Frame.chip, height: Frame.chip)
                .background(
                    RoundedRectangle(cornerRadius: Frame.chipRadius, style: .continuous)
                        .fill(Tokens.bgRaised)
                )
                .accessibilityIdentifier(ID.sessionChoiceMarker(n))
            Words(option.text, .body, Tokens.textSecondary, lines: nil)
                .frame(maxWidth: .infinity, alignment: .leading)
                .accessibilityIdentifier(ID.sessionChoiceText(n))
        }
        .padding(.vertical, 8)
        .padding(.horizontal, Frame.cardGap)
        .frame(minHeight: Frame.optionHeight)
        .card(radius: Frame.optionRadius)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.sessionChoice(n))
    }
}
