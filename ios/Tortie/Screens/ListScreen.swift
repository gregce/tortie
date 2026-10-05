// The list: every session, the ones waiting on him first (Phase 316.2).
//
// docs/design/phone/Main.html, frame for frame, less two things the SPEC
// takes out: the Settings gear and the per-agent glyph (S2's row is "its dot,
// name, the machine badge only when the session is elsewhere, `ageText`, and a
// second line"). `Select` is Phase 317's End these, on the Sessions tab only:
// ONE line below attaches it (`.endBatch`, Screens/EndBatch.swift), and the
// title and the rows carry its hooks, which draw nothing where it is not
// attached.
//
// TWO TABS, ONE READ (Phase 316.6, build/p3166/SPEC.md section 5.2). The
// Sessions tab is the screen above, unchanged: both sections, every identifier
// it had. The Needs input tab (docs/design/phone/NeedsInput.html) is its first
// section alone, under a title of its own and a hairline, with no section
// header (the title and the tab's badge say it), or main's empty line when
// nothing waits. One `ListModel` feeds both, so the badge, the Needs input tab
// and the Sessions tab's first section are always one answer; and every
// identifier the Needs input tab draws carries `needs-`, so the two tabs never
// share one.
//
// "Needs your input (n)" then "Everything else (n)", his ruling of 2026-09-22:
// "Yes it should be able to open anything." Both lists are drawn in the order
// the door answered them. THE PHONE DOES NO ARITHMETIC ON STATUS, AGE OR ORDER
// (build/p316/SPEC.md section 4.0): which sessions wait, in what order, how old
// each is and what its status is called all arrive composed from main, and
// this file only lays them out.
//
// It reads on appear, on return to the foreground and on pull. No timer.
//
// SINCE PHASE 316.7 the Sessions tab is Screens/SessionsScreen.swift: every
// session, shown, grouped and sorted as the phone asks, composed in main. This
// screen's `.sessions` kind is that tab's OLDER-MAC FACE, drawn byte for byte
// as it was, Select included, when the paired Mac's door has no sessions read;
// its reads are then the Sessions model's (`reload`), which asks the new read
// first, so the first answer from an updated Mac brings the new tab back.
// End these is attached once, over both faces, by `SessionsTab`, which is why
// `ListModel` is still an `EndBatchList` and this file's own `.endBatch` line
// is handed nil there.
//
// Two lines of the phone's own may sit under the title (Phase 316.5):
// `Pair again to get alerts.` when this phone's alert address is not the one
// its Mac holds and that Mac said it could send, and the Mac's own sentence
// for a session it no longer has, after an alert naming one was tapped. The
// second is said only once the list's own read has answered, so it is never
// said over a phone the Mac no longer knows, and it goes when a row or another
// alert is opened or he leaves the app (not when he comes back: the tap that
// said it is what brings the app back).

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
    /// Whether the row draws the machine's badge. False under a project's
    /// header, which draws it once for the project (Phase 316.7); the name
    /// stays on the row, because End these' confirmation says the remote tail
    /// for a target on another machine.
    let drawsMachine: Bool
    let age: String
    let line: String
    /// A waiting row's name is drawn at weight 500, as Main.html draws it.
    let waiting: Bool
    /// Whether the Mac offers End on this row (Phase 317): End these selects
    /// over it, and decides nothing the Mac does not decide again.
    let end: PocketEndOffer

    /// A waiting row reads `project · question`, the way Main.html's first
    /// section does; with no question on the row it reads what every other row
    /// reads, `status · project`.
    init(_ row: PocketBlockedRow, waiting: Bool) {
        id = row.sessionId
        name = row.name
        dot = row.dot
        statusTitle = row.statusTitle
        machine = row.machine
        drawsMachine = true
        age = row.ageText
        self.waiting = waiting
        end = row.end
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
final class ListModel: EndBatchList {
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
    /// `Pair again to get alerts.`, or nil (App/TortieApp.swift decides).
    var alertsLine: String?
    /// The sentence drawn at the top of the list, or nil.
    private(set) var notice: String?
    /// A sentence waiting for the list's next read to answer.
    private var noticeAfterRead: String?
    /// `EndBatchList`'s hold. Never read here: since Phase 316.7 End these is
    /// attached over the Sessions model, never over this one, and the line in
    /// `ListScreen` that hands this model nil needs the conformance to compile.
    @ObservationIgnored var batchHeld = false

    /// Every row the Sessions tab drew before Phase 316.7, in drawn order: the
    /// older-Mac face's rows.
    var batchRows: [RowDrawing] {
        guard case .loaded(let drawing) = state else { return [] }
        return [drawing.waiting, drawing.others].flatMap { $0 }
    }

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

    /// Say `sentence` once the list's next read answers. A read the door
    /// refuses goes to Pairing instead, and the sentence with it.
    func sayAfterRead(_ sentence: String) {
        notice = nil
        noticeAfterRead = sentence
    }

    func clearNotice() {
        notice = nil
        noticeAfterRead = nil
    }

    func load() async {
        generation += 1
        adoptedUnseen = false
        let mine = generation
        do {
            let answer = try await door.blocked()
            guard mine == generation else { return }
            state = Self.drawn(answer)
            if let held = noticeAfterRead {
                notice = held
                noticeAfterRead = nil
            }
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

// MARK: - The two tabs

/// Which list a tab draws from the one answer.
enum ListKind: Equatable, Sendable {
    /// The first tab: the waiting rows alone (NeedsInput.html).
    case needsInput
    /// The second tab: both sections, as Phase 316.2 drew the list (Main.html).
    case sessions

    /// The screen's title, and the back button's word on a pushed screen.
    var title: String {
        switch self {
        case .needsInput: Copy.needsInput
        case .sessions: Copy.sessions
        }
    }

    /// The identifiers this tab's elements carry.
    var names: ListNames {
        switch self {
        case .needsInput: .needsInput
        case .sessions: .sessions
        }
    }
}

/// The identifiers one list tab draws (Screens/Identifiers.swift): the
/// Sessions tab keeps every one Phase 316.2 gave the list, and the Needs input
/// tab's carry `needs-`.
struct ListNames: Sendable {
    let screen: String
    let title: String
    let alertsLine: String
    let notice: String
    let loading: String
    let failure: String
    let empty: String
    let ageNote: String
    let read: String
    let row: @Sendable (String) -> String
    let rowDot: @Sendable (String) -> String
    let rowName: @Sendable (String) -> String
    let rowMachine: @Sendable (String) -> String
    let rowAge: @Sendable (String) -> String
    let rowLine: @Sendable (String) -> String

    static let sessions = ListNames(
        screen: ID.listScreen, title: ID.listTitle, alertsLine: ID.listAlertsLine, notice: ID.listNotice,
        loading: ID.listLoading, failure: ID.listFailure, empty: ID.listEmpty, ageNote: ID.listAgeNote, read: ID.listRead,
        row: { ID.row($0) }, rowDot: { ID.rowDot($0) }, rowName: { ID.rowName($0) },
        rowMachine: { ID.rowMachine($0) }, rowAge: { ID.rowAge($0) }, rowLine: { ID.rowLine($0) }
    )

    static let needsInput = ListNames(
        screen: ID.needsInputScreen, title: ID.needsInputTitle, alertsLine: ID.needsListAlertsLine, notice: ID.needsListNotice,
        loading: ID.needsListLoading, failure: ID.needsListFailure, empty: ID.needsListEmpty, ageNote: ID.needsListAgeNote,
        read: ID.needsListRead,
        row: { ID.needsRow($0) }, rowDot: { ID.needsRowDot($0) }, rowName: { ID.needsRowName($0) },
        rowMachine: { ID.needsRowMachine($0) }, rowAge: { ID.needsRowAge($0) }, rowLine: { ID.needsRowLine($0) }
    )
}

// MARK: - The screen

struct ListScreen: View {
    let model: ListModel
    let kind: ListKind
    /// True while this tab is the one on screen and no session is pushed over
    /// its list, so a return to the foreground reads the screen a person is
    /// looking at and nothing else: one return, one read.
    let isTop: Bool
    let foregroundTick: Int
    let open: (RowDrawing) -> Void
    /// End these (Phase 317), for the Sessions tab of a pairing that writes;
    /// nil draws no `Select`.
    var ends: EndBatchSetup?
    /// The read a pull, the appearance, the foreground and Try again ask for
    /// instead of this list's own (Phase 316.7): the Sessions model's, on the
    /// older-Mac face, which asks the Mac's sessions read first. Nil is the
    /// list's own reads.
    var reload: (() async -> Void)? = nil

    private var names: ListNames { kind.names }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                title
                if let line = model.alertsLine {
                    Words(line, .secondary, Tokens.textSecondary, lines: nil)
                        .accessibilityIdentifier(names.alertsLine)
                        .padding(.horizontal, Frame.gutter)
                        .padding(.bottom, 8)
                }
                if let notice = model.notice {
                    Words(notice, .secondary, Tokens.textSecondary, lines: nil)
                        .accessibilityIdentifier(names.notice)
                        .padding(.horizontal, Frame.gutter)
                        .padding(.bottom, 8)
                }
                // NeedsInput.html: a hairline under the title, where Main.html
                // draws its first section's header.
                if kind == .needsInput { Hairline() }
                switch model.state {
                case .loading:
                    LoadingView(id: names.loading)
                case .failed(let sentence):
                    FailureView(sentence: sentence, id: names.failure) {
                        Task { await read() }
                    }
                case .loaded(let drawing):
                    switch kind {
                    case .needsInput: waiting(drawing)
                    case .sessions: sections(drawing)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .scrollIndicators(.hidden)
        .background(Tokens.bgSidebar.ignoresSafeArea())
        .refreshable { await read() }
        .task {
            if let reload {
                await reload()
            } else {
                await model.appeared()
            }
        }
        .onChange(of: foregroundTick) {
            guard isTop else { return }
            Task { await read() }
        }
        // End these, on the Sessions tab alone: the ONE line that attaches it.
        .endBatch(kind == .sessions ? ends : nil, list: model)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(names.screen)
        .navigationTitle(kind.title)
        .toolbar(.hidden, for: .navigationBar)
    }

    /// A pull, the foreground and Try again: `reload` when it is set, else
    /// the list's own read.
    private func read() async {
        if let reload {
            await reload()
        } else {
            await model.load()
        }
    }

    /// `Sessions` or `Needs input`, 28/34 semibold, `padding: 0 16px 8px`
    /// under the status bar, and End these' `Select` at its trailing edge.
    private var title: some View {
        HStack(alignment: .firstTextBaseline, spacing: Frame.rowGap) {
            Words(kind.title, .title, Tokens.textPrimary)
                .lineBox(.title)
                .accessibilityAddTraits(.isHeader)
                .accessibilityIdentifier(names.title)
            Spacer(minLength: 0)
            EndBatchTitleControl()
        }
        .padding(.horizontal, Frame.gutter)
        .padding(.bottom, 8)
    }

    /// The Needs input tab: the waiting rows in the door's order, the last
    /// with no hairline (NeedsInput.html), or main's empty line, then the foot.
    @ViewBuilder
    private func waiting(_ drawing: ListDrawing) -> some View {
        if !drawing.waiting.isEmpty {
            rows(drawing.waiting, endsList: true)
        } else if let empty = drawing.emptyLine {
            Words(empty, .secondary, Tokens.textSecondary, lines: nil)
                .accessibilityIdentifier(names.empty)
                .padding(.horizontal, Frame.gutter)
                .padding(.vertical, Frame.rowVertical)
        }
        foot(drawing)
    }

    @ViewBuilder
    private func sections(_ drawing: ListDrawing) -> some View {
        if let header = drawing.waitingHeader {
            SectionHeader(text: header, id: ID.sectionBlocked, textID: ID.sectionBlockedText)
            rows(drawing.waiting, endsList: drawing.othersHeader == nil)
        } else if let empty = drawing.emptyLine {
            Words(empty, .secondary, Tokens.textSecondary, lines: nil)
                .accessibilityIdentifier(names.empty)
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
                .named(names)
        }
    }

    /// The age note, then `read 4:32 PM` right aligned, both 13 pt muted
    /// (Main.html's foot: `text-align: right; padding: 16px`).
    private func foot(_ drawing: ListDrawing) -> some View {
        VStack(alignment: .leading, spacing: Frame.rowVertical) {
            Words(drawing.ageNote, .small, Tokens.textMuted, lines: nil)
                .accessibilityIdentifier(names.ageNote)
            Words(drawing.readLine, .age, Tokens.textMuted)
                .frame(maxWidth: .infinity, alignment: .trailing)
                .accessibilityIdentifier(names.read)
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
/// each part's frame; tapping anywhere on it opens the session. Internal since
/// Phase 316.7: the Sessions tab draws its rows with it too.
struct RowView: View {
    let row: RowDrawing
    let last: Bool
    let open: () -> Void
    /// The tab's identifiers: the Sessions tab's unless `named(_:)` says.
    private(set) var names = ListNames.sessions
    /// End these, where it is attached: a tap toggles the row while it
    /// selects, and opens nothing while it confirms or runs.
    @Environment(\.endBatch) private var batch

    init(row: RowDrawing, last: Bool, open: @escaping () -> Void) {
        self.row = row
        self.last = last
        self.open = open
    }

    /// The same row, carrying `names`' identifiers.
    func named(_ names: ListNames) -> RowView {
        var copy = self
        copy.names = names
        return copy
    }

    var body: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: Frame.rowLineGap) {
                HStack(spacing: Frame.rowGap) {
                    // End these' circle, drawn only while it selects: nothing
                    // is laid out for it otherwise, so the row is the row.
                    if let batch, batch.showsMarks {
                        EndBatchRowMark(id: row.id, ticked: batch.selected.contains(row.id))
                    }
                    DotView(dot: row.dot, title: row.statusTitle)
                        .accessibilityIdentifier(names.rowDot(row.id))
                    Words(row.name, row.waiting ? .nameWaiting : .name, Tokens.textPrimary)
                        .lineBox(.name)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .accessibilityElement(children: .combine)
                        .accessibilityIdentifier(names.rowName(row.id))
                    if let machine = row.machine, row.drawsMachine {
                        MachineBadge(name: machine)
                            .accessibilityIdentifier(names.rowMachine(row.id))
                    }
                    Words(row.age, .age, Tokens.textMuted)
                        .fixedSize()
                        .accessibilityIdentifier(names.rowAge(row.id))
                    if let word = batch?.word(for: row.id) {
                        EndBatchOutcome(id: row.id, word: word)
                    }
                }
                Words(row.line, .secondary, Tokens.textSecondary)
                    .lineBox(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityElement(children: .combine)
                    .accessibilityIdentifier(names.rowLine(row.id))
            }
            .padding(.vertical, Frame.rowVertical)
            .padding(.horizontal, Frame.gutter)
            if !last { Hairline() }
        }
        .contentShape(Rectangle())
        .onTapGesture(perform: tapped)
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(.isButton)
        .accessibilityIdentifier(names.row(row.id))
        .accessibilityAction(.default, tapped)
    }

    private func tapped() {
        if let batch, batch.takesTaps {
            batch.toggle(row.id)
        } else {
            open()
        }
    }
}
