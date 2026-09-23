// The list: every session, the ones waiting on him first (Phase 316.2).
//
// docs/design/phone/Main.html, frame for frame, less three things the SPEC
// takes out: the Settings gear and `Select` (End from the phone is Phase 317)
// and the per-agent glyph (S2's row is "its dot, name, the machine badge only
// when the session is elsewhere, `ageText`, and a second line").
//
// "Needs your input (n)" then "Everything else (n)", his ruling of 2026-09-22:
// "Yes it should be able to open anything." Both lists are drawn in the order
// the door answered them. THE PHONE DOES NO ARITHMETIC ON STATUS, AGE OR ORDER
// (build/p316/SPEC.md section 4.0): which sessions wait, in what order, how old
// each is and what its status is called all arrive composed from main, and
// this file only lays them out.
//
// It reads on appear, on return to the foreground and on pull. No timer.

import SwiftUI

// MARK: - What the list draws, decided before anything is laid out

/// One row, as drawn. Every string is the door's.
struct RowDrawing: Equatable, Identifiable, Sendable {
    let id: String
    let name: String
    let dot: StatusDot
    let statusTitle: String
    /// Nil on this Mac. A session elsewhere carries its machine's name.
    let machine: String?
    let age: String
    let line: String
    /// A waiting row's name is drawn at weight 500, as Main.html draws it.
    let waiting: Bool

    /// A waiting row reads `project · question`, the way Main.html's first
    /// section does; with no question on the row it reads what every other row
    /// reads, `status · project`.
    init(_ row: PocketBlockedRow, waiting: Bool) {
        id = row.sessionId
        name = row.name
        dot = row.dot
        statusTitle = row.statusTitle
        machine = row.machine
        age = row.ageText
        self.waiting = waiting
        if waiting, let question = row.question {
            line = Copy.joined([row.project, question])
        } else {
            line = Copy.joined([row.statusTitle, row.project])
        }
    }
}

/// The whole list, as drawn. Built from one answer, so everything on the
/// screen was read together.
struct ListDrawing: Equatable, Sendable {
    /// `Needs your input (n)`, or nil when nothing waits: ⌘J draws the empty
    /// line alone then, and so does the phone.
    let waitingHeader: String?
    let waiting: [RowDrawing]
    /// Main's `emptyLine`, drawn when nothing waits.
    let emptyLine: String?
    /// `Everything else (n)`, or nil when there is nothing else. The count is
    /// every other session, including any the door left out.
    let othersHeader: String?
    let others: [RowDrawing]
    /// `n more not shown.` when the door capped `others`.
    let othersOmitted: String?
    /// Main's `ageNote`, under the ages.
    let ageNote: String
    /// `read 4:32 PM`, the moment main composed the answer.
    let readLine: String

    /// A session that is in both lists, or twice in one, is not an answer the
    /// door can give (`others` is the complement of `rows`, by id), and two
    /// rows with one id cannot both be tapped. So it is refused whole, never
    /// half drawn. So is an omitted count no door could send
    /// (`DoorFailure.malformed`).
    struct Duplicate: Error, Equatable {}

    init(_ answer: PocketBlockedAnswer, clock: (Double) -> String = ReadClock.clock) throws {
        var seen = Set<String>()
        for row in answer.rows + answer.others where !seen.insert(row.sessionId).inserted {
            throw Duplicate()
        }
        waiting = answer.rows.map { RowDrawing($0, waiting: true) }
        others = answer.others.map { RowDrawing($0, waiting: false) }
        waitingHeader = waiting.isEmpty ? nil : Copy.needsYourInput(waiting.count)
        emptyLine = waiting.isEmpty ? answer.emptyLine : nil
        // Every other session, the ones the door left out included, through
        // the one checked sum (Door/Contract.swift `DoorNumber`). An omitted
        // count that is negative, past the door's bound, or that would
        // overflow the sum is an answer this build cannot read, never a trap:
        // `Int.max` here ended the app on the list's refresh.
        guard let otherCount = DoorNumber.sum(others.count, answer.othersOmitted) else {
            throw DoorFailure.malformed
        }
        othersHeader = otherCount == 0 ? nil : Copy.everythingElse(otherCount)
        othersOmitted = answer.othersOmitted > 0 ? Copy.othersOmitted(answer.othersOmitted) : nil
        ageNote = answer.ageNote
        readLine = Copy.readAt(clock(answer.at))
    }
}

/// The clock in `read 4:32 PM`: the moment the answer was composed, in the
/// phone's own time format. It is a moment, not an age: nothing is subtracted.
enum ReadClock {
    static func clock(_ epochMs: Double) -> String {
        Date(timeIntervalSince1970: epochMs / 1000).formatted(date: .omitted, time: .shortened)
    }
}

// MARK: - The model

/// What the list shows: the spinner, the drawing, or one sentence.
enum ListState: Equatable {
    case loading
    case loaded(ListDrawing)
    case failed(String)
}

@MainActor
@Observable
final class ListModel {
    private(set) var state: ListState = .loading
    private let door: any DoorReading
    /// Told when the door no longer knows this iPhone, so the app goes back to
    /// pairing with one line (S3: "the phone goes to Pairing with one line").
    private let routing: ReadRouting
    /// Only the newest read may draw. A pull while a read is in flight asks
    /// again, and the older answer is dropped when it lands.
    private var generation = 0
    /// True between the pairing's first read being adopted and the list's
    /// first appearance, which then reads nothing.
    private var adoptedUnseen = false

    init(door: any DoorReading, routing: ReadRouting) {
        self.door = door
        self.routing = routing
    }

    /// The answer the pairing's first signed read already fetched, so the list
    /// is not read twice in the first second.
    func adopt(_ answer: PocketBlockedAnswer) {
        generation += 1
        adoptedUnseen = true
        state = Self.drawn(answer)
    }

    /// The list came on screen: read, unless it is showing the answer the
    /// pairing's first read fetched a moment ago.
    func appeared() async {
        if adoptedUnseen {
            adoptedUnseen = false
            return
        }
        await load()
    }

    func load() async {
        generation += 1
        adoptedUnseen = false
        let mine = generation
        do {
            let answer = try await door.blocked()
            guard mine == generation else { return }
            state = Self.drawn(answer)
        } catch {
            guard mine == generation, !Task.isCancelled, !DoorWords.isCancellation(error) else { return }
            switch DoorWords.consequence(of: error, reading: .list) {
            case .pairAgain, .backToList:
                routing.pairAgain()
            case .draw(let sentence):
                state = .failed(sentence)
            }
        }
    }

    /// One answer as the list draws it, or the one sentence. Pure.
    nonisolated static func drawn(_ answer: PocketBlockedAnswer) -> ListState {
        guard let drawing = try? ListDrawing(answer) else {
            return .failed(Copy.answerUnreadable)
        }
        return .loaded(drawing)
    }
}

// MARK: - The screen

struct ListScreen: View {
    let model: ListModel
    /// True while no session is pushed over the list, so a return to the
    /// foreground reads the screen a person is looking at and nothing else.
    let isTop: Bool
    let foregroundTick: Int
    let open: (RowDrawing) -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                title
                switch model.state {
                case .loading:
                    LoadingView(id: ID.listLoading)
                case .failed(let sentence):
                    FailureView(sentence: sentence, id: ID.listFailure) {
                        Task { await model.load() }
                    }
                case .loaded(let drawing):
                    sections(drawing)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .scrollIndicators(.hidden)
        .background(Tokens.bgSidebar.ignoresSafeArea())
        .refreshable { await model.load() }
        .task { await model.appeared() }
        .onChange(of: foregroundTick) {
            guard isTop else { return }
            Task { await model.load() }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.listScreen)
        .navigationTitle(Copy.sessions)
        .toolbar(.hidden, for: .navigationBar)
    }

    /// `Sessions`, 28/34 semibold, `padding: 0 16px 8px` under the status bar.
    private var title: some View {
        Words(Copy.sessions, .title, Tokens.textPrimary)
            .lineBox(.title)
            .accessibilityAddTraits(.isHeader)
            .accessibilityIdentifier(ID.listTitle)
            .padding(.horizontal, Frame.gutter)
            .padding(.bottom, 8)
    }

    @ViewBuilder
    private func sections(_ drawing: ListDrawing) -> some View {
        if let header = drawing.waitingHeader {
            SectionHeader(text: header, id: ID.sectionBlocked, textID: ID.sectionBlockedText)
            rows(drawing.waiting, endsList: drawing.othersHeader == nil)
        } else if let empty = drawing.emptyLine {
            Words(empty, .secondary, Tokens.textSecondary, lines: nil)
                .accessibilityIdentifier(ID.listEmpty)
                .padding(.horizontal, Frame.gutter)
                .padding(.vertical, Frame.rowVertical)
        }
        if let header = drawing.othersHeader {
            SectionHeader(text: header, id: ID.sectionOthers, textID: ID.sectionOthersText)
                .padding(.top, Frame.headerGap)
            rows(drawing.others, endsList: true)
            if let omitted = drawing.othersOmitted {
                Words(omitted, .secondary, Tokens.textMuted)
                    .lineBox(.secondary)
                    .accessibilityIdentifier(ID.listOthersLeftOut)
                    .padding(.horizontal, Frame.gutter)
                    .padding(.vertical, Frame.rowVertical)
            }
        }
        foot(drawing)
    }

    /// Every row has its hairline but the very last one on the list, which is
    /// how Main.html draws it: the last waiting row keeps its line when the
    /// second section follows.
    private func rows(_ rows: [RowDrawing], endsList: Bool) -> some View {
        ForEach(Array(rows.enumerated()), id: \.element.id) { offset, row in
            RowView(row: row, last: endsList && offset == rows.count - 1) { open(row) }
        }
    }

    /// The age note, then `read 4:32 PM` right aligned, both 13 pt muted
    /// (Main.html's foot: `text-align: right; padding: 16px`).
    private func foot(_ drawing: ListDrawing) -> some View {
        VStack(alignment: .leading, spacing: Frame.rowVertical) {
            Words(drawing.ageNote, .small, Tokens.textMuted, lines: nil)
                .accessibilityIdentifier(ID.listAgeNote)
            Words(drawing.readLine, .age, Tokens.textMuted)
                .frame(maxWidth: .infinity, alignment: .trailing)
                .accessibilityIdentifier(ID.listRead)
        }
        .padding(Frame.gutter)
    }
}

/// `.hdr`: 28 pt tall, `padding: 0 16px`, 13 pt medium raised, then its
/// hairline. The header is one element (its frame is the 28 pt box) that
/// contains its words as a second element (whose frame starts at the gutter).
private struct SectionHeader: View {
    let text: String
    let id: String
    let textID: String

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                RaisedLabel(text, .header)
                    .accessibilityIdentifier(textID)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, Frame.gutter)
            .frame(height: Frame.headerHeight)
            .accessibilityElement(children: .contain)
            .accessibilityAddTraits(.isHeader)
            .accessibilityIdentifier(id)
            Hairline()
        }
    }
}

/// `.row`: `padding: 6px 16px`, two lines 2 pt apart, a hairline under every
/// row but the last. The row is a container, so XCUITest reads its frame and
/// each part's frame; tapping anywhere on it opens the session.
private struct RowView: View {
    let row: RowDrawing
    let last: Bool
    let open: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: Frame.rowLineGap) {
                HStack(spacing: Frame.rowGap) {
                    DotView(dot: row.dot, title: row.statusTitle)
                        .accessibilityIdentifier(ID.rowDot(row.id))
                    Words(row.name, row.waiting ? .nameWaiting : .name, Tokens.textPrimary)
                        .lineBox(.name)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .accessibilityElement(children: .combine)
                        .accessibilityIdentifier(ID.rowName(row.id))
                    if let machine = row.machine {
                        MachineBadge(name: machine)
                            .accessibilityIdentifier(ID.rowMachine(row.id))
                    }
                    Words(row.age, .age, Tokens.textMuted)
                        .fixedSize()
                        .accessibilityIdentifier(ID.rowAge(row.id))
                }
                Words(row.line, .secondary, Tokens.textSecondary)
                    .lineBox(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityElement(children: .combine)
                    .accessibilityIdentifier(ID.rowLine(row.id))
            }
            .padding(.vertical, Frame.rowVertical)
            .padding(.horizontal, Frame.gutter)
            if !last { Hairline() }
        }
        .contentShape(Rectangle())
        .onTapGesture(perform: open)
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(.isButton)
        .accessibilityIdentifier(ID.row(row.id))
        .accessibilityAction(.default, open)
    }
}
