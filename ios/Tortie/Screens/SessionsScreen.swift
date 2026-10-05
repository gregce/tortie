// The Sessions tab: every session Tortie lists, shown, grouped and sorted as
// the phone asks, each under its project (Phase 316.7, build/p3167/SPEC.md
// section 6.4.5; docs/design/phone/Main.html, SessionsMenu.html and
// SessionsOlderMac.html). His words: "a way of grouping, filtering sessions and
// sorting them because many many sessions are old that tortie stores".
//
// THE PHONE DOES NO ARITHMETIC ON STATUS, AGE OR ORDER (build/p316/SPEC.md
// section 4.0). The phone sends five closed words (Screens/SessionsChoices.swift)
// and main composes which sessions they keep, which project each is in, the
// order, every age, every count and the caps; this file checks the answer is
// one main could have composed (`SessionsDrawing`) and lays it out. It sorts
// nothing, filters nothing and counts nothing of its own (conformance:ios rule
// aa).
//
// WHAT IT DRAWS. The title with the menu and Select at its trailing edge; Show
// (All · Active · Ended, the session manager's lifecycle segment, opening on
// Active); then, under Project, each project's header (a chevron that opens
// and closes it, its label, how many sessions it has under the words, the
// needs-input dot when one of them waits, open or closed, its machine's badge,
// and its folder only when two projects share a name), its rows, and its own
// `n more not shown.` when the caps left some out; under None, one list whose
// rows read as 316.6's did. Then main's foot. A project he closed keeps its
// dot, so no tap of his hides a waiting session without a mark. The Needs
// input tab and its badge are the list's own read, which no choice here moves.
//
// THE READS (D16). Appear, pull, the foreground and Done read `/v1/sessions`
// AND the list's `/v1/blocked` together, so the badge and the Needs input tab
// are never staler than they were. A choice reads `/v1/sessions` alone. ONE
// `/v1/sessions` read is in flight from here at a time: the model cancels the
// one it holds before it starts another, which closes that read's connection,
// because the door allows a phone four and draws a fifth as a Mac it cannot
// reach. The drawing on screen stays until the newest answer lands.
//
// END THESE (D9, F5, F6). `SessionsTab` attaches End these ONCE, over both of
// the tab's faces, so a face that changes while it runs keeps its bar, its
// selection and its words. While End these is on, the model holds: a pull,
// the foreground and Done's own read replace nothing that is drawn, and the
// Show control, the menu and every header are off, so the rows under a
// selection are the rows it was made over until Done.
//
// A MAC OLDER THAN THIS PHASE (D9). Its door refuses the route. The model then
// waits for the list's own read: when that answered, the tab is TODAY'S tab,
// `ListScreen(kind: .sessions)`, byte for byte, Select included; when it drew
// a sentence, the tab draws the same sentence; when it was refused, the list
// goes to Pairing by its own routing and this model routes nowhere. Every read
// of that face is this model's, which asks `/v1/sessions` first, so the first
// answer from an updated Mac brings this tab back with no relaunch.

import SwiftUI

// MARK: - What the tab draws, decided before anything is laid out

/// One project, as drawn.
struct GroupDrawing: Equatable, Identifiable, Sendable {
    /// Main's group id: a hash of the folder and its machine, never the path.
    let id: String
    let label: String
    /// The machine's label, drawn as its badge; nil on this Mac.
    let machine: String?
    /// The folder, drawn muted under the label, only when another project
    /// shares the label and the machine.
    let folder: String?
    /// How many sessions it has under the words, as main counted them, drawn.
    let count: String
    /// A session the words keep in it waits on him: the needs-input dot.
    let waiting: Bool
    /// Main's: it starts closed.
    let collapsed: Bool
    /// `n more not shown.`, its last line, when the caps left some out.
    let leftOut: String?
    /// The rows main chose for it, in main's order.
    let rows: [RowDrawing]
}

/// One agent or machine the menu offers.
struct ChoiceDrawing: Equatable, Identifiable, Sendable {
    let id: String
    let label: String
}

/// One line of the lazy list: a header, a row, or a project's left-out line.
enum SessionsLine: Equatable, Identifiable, Sendable {
    case header(GroupDrawing, open: Bool)
    /// `last` is true only for the final line of the list, which draws no
    /// hairline (Main.html).
    case row(RowDrawing, last: Bool)
    case leftOut(groupId: String, text: String)

    var id: String {
        switch self {
        case .header(let group, _): "group-" + group.id
        case .row(let row, _): "row-" + row.id
        case .leftOut(let groupId, _): "left-out-" + groupId
        }
    }
}

/// The whole tab, as drawn: built from ONE answer, so everything on the
/// screen was read together, or refused whole.
struct SessionsDrawing: Equatable, Sendable {
    /// What the tab draws in place of rows.
    enum Empty: Equatable, Sendable {
        /// Tortie lists no session at all (`total` 0): the sheet's own face.
        case noSessions
        /// The words keep nothing: `No matching sessions` and Clear filters.
        case noMatch
    }

    /// Why an answer was refused. Every case is drawn the same way, as
    /// `Copy.answerUnreadable`; the reason is for the tests.
    enum Refusal: Error, Equatable, Sendable {
        /// `asked` is not the question the phone sent.
        case askedAnother
        /// One session listed twice.
        case rowTwice
        /// A row's `group` is not an index into `groups`.
        case groupOutOfRange
        /// A group appears before a group whose first row comes earlier.
        case groupOutOfOrder
        /// A group no row names.
        case groupNamedByNoRow
        /// Two groups with one id.
        case groupTwice
        /// A group's rows are not together under Project.
        case groupSplit
        /// A group's count is not its rows here plus its omitted.
        case countNotRowsPlusOmitted
        /// The groups' omitted counts sum to more than the answer's. They
        /// may sum to less: a project whose every row the caps left out is
        /// named by no row, so it is in no group and its rows are counted in
        /// the answer's `omitted` alone (build/p3167/SPEC.md "§As built").
        case omittedAboveTheAnswer
        /// A group says nothing waits over a row that waits.
        case waitingNotSaid
        /// A number no checked sum can hold.
        case beyondTheBound
        /// `total` is below the rows plus the omitted.
        case totalTooSmall
        /// A menu choice with no label, or two with one id.
        case choiceUnreadable
    }

    let asked: PocketSessionsAsked
    /// Under Project: every project in main's order, each with its rows.
    /// Empty under None.
    let groups: [GroupDrawing]
    /// Under None: every row in main's order. Empty under Project.
    let rows: [RowDrawing]
    let empty: Empty?
    /// `n more not shown.` above the foot, when the caps left any out.
    let leftOut: String?
    let agents: [ChoiceDrawing]
    let machines: [ChoiceDrawing]
    /// Main's `ageNote`, under the ages.
    let ageNote: String
    /// `read 4:32 PM`, the moment main composed the answer.
    let readLine: String

    /// Whether the rows are drawn under their projects.
    var grouped: Bool { asked.group == .project }

    init(_ answer: PocketSessionsAnswer, asked query: SessionsQuery, clock: (Double) -> String = ReadClock.clock) throws {
        guard answer.asked.answers(query) else { throw Refusal.askedAnother }
        let grouped = answer.asked.group == .project

        var groupIds = Set<String>()
        for group in answer.groups where !groupIds.insert(group.id).inserted {
            throw Refusal.groupTwice
        }

        // Every row once, every group index in range, the groups in the order
        // their first row comes, and under Project each group's rows together.
        var seen = Set<String>()
        var named: [Int] = []
        var rowsOf: [Int: [PocketSessionsRow]] = [:]
        var previous: Int?
        for row in answer.rows {
            guard seen.insert(row.sessionId).inserted else { throw Refusal.rowTwice }
            guard answer.groups.indices.contains(row.groupIndex) else { throw Refusal.groupOutOfRange }
            if rowsOf[row.groupIndex] == nil {
                guard row.groupIndex == named.count else { throw Refusal.groupOutOfOrder }
                named.append(row.groupIndex)
            } else if grouped, previous != row.groupIndex {
                throw Refusal.groupSplit
            }
            rowsOf[row.groupIndex, default: []].append(row)
            previous = row.groupIndex
        }
        guard named.count == answer.groups.count else { throw Refusal.groupNamedByNoRow }

        // Each group's count is its rows here plus its omitted, its dot is
        // said over every row that waits, and the omitted counts sum to no
        // more than the answer's, every sum through the one checked helper.
        var omittedSum = 0
        var drawnGroups: [GroupDrawing] = []
        for (index, group) in answer.groups.enumerated() {
            let rows = rowsOf[index] ?? []
            guard let whole = DoorNumber.sum(rows.count, group.omittedRows),
                  let sum = DoorNumber.sum(omittedSum, group.omittedRows) else { throw Refusal.beyondTheBound }
            guard whole == group.sessionCount else { throw Refusal.countNotRowsPlusOmitted }
            guard group.waiting || !rows.contains(where: \.waiting) else { throw Refusal.waitingNotSaid }
            omittedSum = sum
            drawnGroups.append(GroupDrawing(group, rows: rows.map { RowDrawing($0, in: group, grouped: true) }))
        }
        guard omittedSum <= answer.omittedRows else { throw Refusal.omittedAboveTheAnswer }
        guard let kept = DoorNumber.sum(answer.rows.count, answer.omittedRows),
              DoorNumber.isCount(answer.totalSessions) else { throw Refusal.beyondTheBound }
        guard answer.totalSessions >= kept else { throw Refusal.totalTooSmall }

        self.asked = answer.asked
        groups = grouped ? drawnGroups : []
        rows = grouped ? [] : answer.rows.map { RowDrawing($0, in: answer.groups[$0.groupIndex], grouped: false) }
        if !answer.rows.isEmpty {
            empty = nil
        } else if answer.totalSessions == 0 {
            empty = .noSessions
        } else if answer.omittedRows == 0 {
            empty = .noMatch
        } else {
            empty = nil
        }
        leftOut = answer.omittedRows > 0 ? Copy.othersOmitted(answer.omittedRows) : nil
        agents = try Self.choices(answer.agents, unnamed: nil)
        machines = try Self.choices(answer.machines, unnamed: PocketSessionsChoice.thisMacId)
        ageNote = answer.ageNote
        readLine = Copy.readAt(clock(answer.at))
    }

    /// The menu's choices, each with its label. Only `unnamed` may come with
    /// none, and it is This Mac; two with one id is not an answer either.
    private static func choices(_ choices: [PocketSessionsChoice], unnamed: String?) throws -> [ChoiceDrawing] {
        var ids = Set<String>()
        return try choices.map { choice in
            guard ids.insert(choice.id).inserted else { throw Refusal.choiceUnreadable }
            if let label = choice.label { return ChoiceDrawing(id: choice.id, label: label) }
            guard let unnamed, choice.id == unnamed else { throw Refusal.choiceUnreadable }
            return ChoiceDrawing(id: choice.id, label: Copy.thisMac)
        }
    }

    /// Whether a project is drawn open: as he left it, else open unless main
    /// said it starts closed.
    static func isOpen(_ group: GroupDrawing, opened: [String: Bool]) -> Bool {
        opened[group.id] ?? !group.collapsed
    }

    /// The lines the lazy list draws, in order: under Project each header,
    /// then, while it is open, its rows and its left-out line; under None the
    /// rows. The final line, when it is a row, draws no hairline.
    func lines(opened: [String: Bool]) -> [SessionsLine] {
        var lines: [SessionsLine] = []
        if grouped {
            for group in groups {
                let open = Self.isOpen(group, opened: opened)
                lines.append(.header(group, open: open))
                guard open else { continue }
                lines.append(contentsOf: group.rows.map { SessionsLine.row($0, last: false) })
                if let leftOut = group.leftOut { lines.append(.leftOut(groupId: group.id, text: leftOut)) }
            }
        } else {
            lines = rows.map { SessionsLine.row($0, last: false) }
        }
        if case .row(let row, _)? = lines.last {
            lines.removeLast()
            lines.append(.row(row, last: true))
        }
        return lines
    }

    /// The rows drawn, in drawn order: a closed project's are not drawn.
    func drawnRows(opened: [String: Bool]) -> [RowDrawing] {
        guard grouped else { return rows }
        return groups.flatMap { Self.isOpen($0, opened: opened) ? $0.rows : [] }
    }
}

extension GroupDrawing {
    /// One project from main's group, with the rows drawn under it.
    init(_ group: PocketSessionsGroup, rows: [RowDrawing]) {
        id = group.id
        label = group.label
        machine = group.machine
        folder = group.folder
        count = String(group.sessionCount)
        waiting = group.waiting
        collapsed = group.collapsed
        leftOut = group.omittedRows > 0 ? Copy.othersOmitted(group.omittedRows) : nil
        self.rows = rows
    }
}

extension RowDrawing {
    /// One row of `/v1/sessions`. Under Project the header draws the machine
    /// and the project, so the row draws no badge and its line is the
    /// question on a waiting row that has one, else main's status title. Under
    /// None it reads exactly as 316.6's rows did: `project · question` on a
    /// waiting row with a question, else `status · project`, with the
    /// project's label. A row with no clock draws the dash.
    init(_ row: PocketSessionsRow, in group: PocketSessionsGroup, grouped: Bool) {
        id = row.sessionId
        name = row.name
        dot = StatusDot(name: row.statusDot)
        statusTitle = row.statusTitle
        machine = row.machine
        drawsMachine = !grouped
        age = row.ageText ?? Copy.dash
        waiting = row.waiting
        end = row.end
        if grouped {
            line = row.waiting ? (row.question ?? row.statusTitle) : row.statusTitle
        } else if row.waiting, let question = row.question {
            line = Copy.joined([group.label, question])
        } else {
            line = Copy.joined([row.statusTitle, group.label])
        }
    }
}

// MARK: - The model

/// What the tab shows: the spinner, the drawing, one sentence, or today's tab
/// for a Mac older than this phase.
enum SessionsState: Equatable {
    case loading
    case loaded(SessionsDrawing)
    case failed(String)
    case olderMac
}

@MainActor
@Observable
final class SessionsModel: EndBatchList {
    private(set) var state: SessionsState = .loading
    /// Show, Group by and Sort by: kept across launches.
    private(set) var words: SessionsWords
    /// The agent filter, for the model's life and never kept.
    private(set) var agent: String?
    /// The machine filter, for the model's life and never kept.
    private(set) var machine: String?
    /// The projects he opened or closed, by main's group id, for the model's
    /// life and never kept.
    private(set) var opened: [String: Bool] = [:]
    /// End these is on: no read replaces what is drawn (F5). Set by the piece.
    @ObservationIgnored var batchHeld = false
    /// THE ONE `/v1/sessions` read in flight, cancelled before another starts
    /// (D16, F7). Held so a test can wait for it; never drawn from.
    @ObservationIgnored private(set) var reading: Task<Void, Never>?
    /// The app's one list model: the badge, the Needs input tab, and the older
    /// Mac's face.
    let list: ListModel
    private let door: any DoorReading
    private let store: any SessionsChoicesStore

    init(door: any DoorReading, list: ListModel, store: any SessionsChoicesStore) {
        self.door = door
        self.list = list
        self.store = store
        words = store.load()
    }

    /// The question the next read asks.
    var query: SessionsQuery {
        SessionsQuery(show: words.show, group: words.group, sort: words.sort, agent: agent, machine: machine)
    }

    /// The one read of `/v1/sessions`. `listToo` reads the list's
    /// `/v1/blocked` beside it (appear, pull, foreground, Done); a choice reads
    /// `/v1/sessions` alone. While End these holds, it reads the list alone
    /// and starts no `/v1/sessions` read, so the drawing and the face stay as
    /// they are under a selection or a run.
    func load(listToo: Bool) async {
        let listRead: Task<Void, Never>? = listToo ? Task { await list.load() } : nil
        guard !batchHeld else {
            await listRead?.value
            return
        }
        // The read this one replaces is cancelled first, which closes its
        // connection, so the door never sees more than one from this tab.
        reading?.cancel()
        let query = query
        let door = door
        let read = Task { [weak self] in
            guard !Task.isCancelled else { return }
            do {
                let answer = try await door.sessions(query)
                self?.landed(answer, asked: query)
            } catch {
                await self?.failed(error, listRead: listRead)
            }
        }
        reading = read
        await read.value
        await listRead?.value
    }

    /// Appear, pull, the foreground and Done (`EndBatchList`'s): both reads.
    func load() async {
        await load(listToo: true)
    }

    /// The newest answer, drawn, or one sentence. A read that was replaced
    /// draws nothing, and neither does a read already in flight when End these
    /// took the list: the hold stops reads that START while held, and this
    /// stops the one that started before it, so the rows under a selection
    /// never change. Done reads again (F5; the fix round, 2026-10-03).
    private func landed(_ answer: PocketSessionsAnswer, asked query: SessionsQuery) {
        guard !Task.isCancelled, !batchHeld else { return }
        state = Self.drawn(answer, asked: query)
    }

    /// A read that did not come back. A refusal is a Mac older than this
    /// phase, or a door that no longer knows this phone, and the list's own
    /// read tells them apart: its answer is today's tab, its sentence is this
    /// tab's, and its refusal goes to Pairing by the list's own routing. This
    /// model routes nowhere.
    private func failed(_ error: Error, listRead: Task<Void, Never>?) async {
        guard !Task.isCancelled, !batchHeld, !DoorWords.isCancellation(error) else { return }
        switch DoorWords.consequence(of: error, reading: .list) {
        case .draw(let sentence):
            state = .failed(sentence)
        case .pairAgain, .backToList:
            if let listRead {
                await listRead.value
            } else {
                await list.load()
            }
            guard !Task.isCancelled, !batchHeld else { return }
            switch list.state {
            case .loaded:
                state = .olderMac
            case .failed(let sentence):
                state = .failed(sentence)
            case .loading:
                break
            }
        }
    }

    /// One answer as the tab draws it, or the one sentence. Pure.
    nonisolated static func drawn(_ answer: PocketSessionsAnswer, asked query: SessionsQuery) -> SessionsState {
        guard let drawing = try? SessionsDrawing(answer, asked: query) else {
            return .failed(Copy.answerUnreadable)
        }
        return .loaded(drawing)
    }

    // MARK: The choices: each one kept or not, then `/v1/sessions` alone

    func choose(show: SessionsShow) async {
        guard show != words.show else { return }
        words.show = show
        await keepAndRead()
    }

    func choose(group: SessionsGroupBy) async {
        guard group != words.group else { return }
        words.group = group
        await keepAndRead()
    }

    func choose(sort: SessionsSortBy) async {
        guard sort != words.sort else { return }
        words.sort = sort
        await keepAndRead()
    }

    func choose(agent: String?) async {
        guard agent != self.agent else { return }
        self.agent = agent
        await load(listToo: false)
    }

    func choose(machine: String?) async {
        guard machine != self.machine else { return }
        self.machine = machine
        await load(listToo: false)
    }

    /// The Mac's Clear filters (D12): Show to All and both filters cleared.
    func clearFilters() async {
        words.show = .all
        agent = nil
        machine = nil
        await keepAndRead()
    }

    private func keepAndRead() async {
        store.save(words)
        await load(listToo: false)
    }

    /// Whether a filter is set: the menu's button is filled.
    var filtered: Bool { agent != nil || machine != nil }

    /// Whether the menu offers Clear filters: Show is not All, or a filter is set.
    var offersClear: Bool { words.show != .all || filtered }

    // MARK: Projects opened and closed, for the model's life

    /// Open unless main said it starts closed, until he taps it.
    func isOpen(_ group: GroupDrawing) -> Bool {
        SessionsDrawing.isOpen(group, opened: opened)
    }

    func toggle(_ group: GroupDrawing) {
        opened[group.id] = !isOpen(group)
    }

    /// `EndBatchList`'s: the rows drawn, a closed project's left out; on the
    /// older Mac's face, the list's own rows; otherwise none.
    var batchRows: [RowDrawing] {
        switch state {
        case .loaded(let drawing): drawing.drawnRows(opened: opened)
        case .olderMac: list.batchRows
        case .loading, .failed: []
        }
    }
}

// MARK: - The words each choice draws

extension SessionsShow {
    var word: String {
        switch self {
        case .all: Copy.showAll
        case .active: Copy.showActive
        case .ended: Copy.ended
        }
    }
}

extension SessionsGroupBy {
    var word: String {
        switch self {
        case .project: Copy.groupProject
        case .none: Copy.groupNone
        }
    }
}

extension SessionsSortBy {
    var word: String {
        switch self {
        case .recent: Copy.sortRecent
        case .name: Copy.sortName
        case .oldest: Copy.sortOldest
        }
    }
}

// MARK: - The numbers this screen's mock spells

/// Main.html's `.seg`, `.grp` and the title's controls, in points.
enum SessionsFrame {
    /// `.seg { padding: 2px; border-radius: 9px }`.
    static let showInset: CGFloat = 2
    static let showRadius: CGFloat = 9
    /// `.seg button { height: 28px; border-radius: 7px }`.
    static let showButtonHeight: CGFloat = 28
    static let showButtonRadius: CGFloat = 7
    /// `.grp { padding: 8px 16px 6px }`.
    static let groupTop: CGFloat = 8
    static let groupBottom: CGFloat = 6
    /// `.grp-folder { padding-left: 17px }`: under the label, past the chevron.
    static let folderInset: CGFloat = 17
    /// The menu button and Select, `gap: 16px`.
    static let controlGap: CGFloat = 16
}

private extension Face {
    /// A project's label (`.grp-name { font-size: 15px; line-height: 20px; font-weight: 600 }`).
    static let groupLabel = Face(15, .semibold, line: 20)
    /// A Show word (`.seg button { font-size: 13px; font-weight: 500 }`).
    static let showWord = Face(13, .medium, line: 16)
}

// MARK: - The tab, and its two faces under ONE End these

/// The ONE thing the Sessions tab draws: this file's screen, or, for a Mac
/// older than this phase, today's tab, both under one End these.
struct SessionsTab: View {
    let model: SessionsModel
    let isTop: Bool
    let foregroundTick: Int
    let open: (RowDrawing) -> Void
    /// End these, for a pairing that writes; nil draws no `Select`.
    var ends: EndBatchSetup?

    var body: some View {
        face
            // End these, ONCE, over both faces (F6).
            .endBatch(ends, list: model)
    }

    @ViewBuilder
    private var face: some View {
        if case .olderMac = model.state {
            ListScreen(
                model: model.list,
                kind: .sessions,
                isTop: isTop,
                foregroundTick: foregroundTick,
                open: open,
                ends: nil,
                reload: { await model.load() }
            )
        } else {
            SessionsScreen(model: model, isTop: isTop, foregroundTick: foregroundTick, open: open)
        }
    }
}

// MARK: - The screen

struct SessionsScreen: View {
    let model: SessionsModel
    let isTop: Bool
    let foregroundTick: Int
    let open: (RowDrawing) -> Void
    /// End these, where `SessionsTab` attached it. While it takes taps the
    /// Show control, the menu and every header are off, so nothing drawn
    /// changes under a selection.
    @Environment(\.endBatch) private var batch

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                title
                showControl
                if let line = model.list.alertsLine {
                    Words(line, .secondary, Tokens.textSecondary, lines: nil)
                        .accessibilityIdentifier(ID.listAlertsLine)
                        .padding(.horizontal, Frame.gutter)
                        .padding(.bottom, 8)
                }
                if let notice = model.list.notice {
                    Words(notice, .secondary, Tokens.textSecondary, lines: nil)
                        .accessibilityIdentifier(ID.listNotice)
                        .padding(.horizontal, Frame.gutter)
                        .padding(.bottom, 8)
                }
                switch model.state {
                case .loading:
                    LoadingView(id: ID.listLoading)
                case .failed(let sentence):
                    FailureView(sentence: sentence, id: ID.listFailure) {
                        Task { await model.load() }
                    }
                case .loaded(let drawing):
                    if let empty = drawing.empty { emptyFace(empty) }
                    ForEach(drawing.lines(opened: model.opened)) { line in
                        lineView(line)
                    }
                    if let leftOut = drawing.leftOut {
                        Words(leftOut, .secondary, Tokens.textMuted)
                            .lineBox(.secondary)
                            .accessibilityIdentifier(ID.listSessionsLeftOut)
                            .padding(.horizontal, Frame.gutter)
                            .padding(.vertical, Frame.rowVertical)
                    }
                    foot(drawing)
                case .olderMac:
                    // `SessionsTab` draws today's tab in this one's place.
                    EmptyView()
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
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
        .accessibilityIdentifier(ID.listScreen)
        .navigationTitle(Copy.sessions)
        .toolbar(.hidden, for: .navigationBar)
    }

    /// `Sessions`, 28/34 semibold, with the menu and End these' `Select` at
    /// its trailing edge (Main.html).
    private var title: some View {
        HStack(alignment: .firstTextBaseline, spacing: Frame.rowGap) {
            Words(Copy.sessions, .title, Tokens.textPrimary)
                .lineBox(.title)
                .accessibilityAddTraits(.isHeader)
                .accessibilityIdentifier(ID.listTitle)
            Spacer(minLength: 0)
            HStack(spacing: SessionsFrame.controlGap) {
                menu
                EndBatchTitleControl()
            }
        }
        .padding(.horizontal, Frame.gutter)
        .padding(.bottom, 8)
    }

    /// All · Active · Ended: three house buttons in one capsule, drawn with
    /// the tokens (a system segmented control's colours are not tokens); the
    /// chosen one carries the selected trait.
    private var showControl: some View {
        HStack(spacing: 0) {
            ForEach(SessionsShow.allCases, id: \.self) { show in
                let chosen = show == model.words.show
                Button {
                    Task { await model.choose(show: show) }
                } label: {
                    Words(show.word, .showWord, chosen ? Tokens.textPrimary : Tokens.textSecondary)
                        .frame(maxWidth: .infinity)
                        .frame(height: SessionsFrame.showButtonHeight)
                        .background {
                            if chosen {
                                RoundedRectangle(cornerRadius: SessionsFrame.showButtonRadius, style: .continuous)
                                    .fill(Tokens.bgRaised)
                            }
                        }
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(chosen ? .isSelected : [])
                .accessibilityIdentifier(ID.showButton(show))
            }
        }
        .padding(SessionsFrame.showInset)
        .background(
            RoundedRectangle(cornerRadius: SessionsFrame.showRadius, style: .continuous)
                .fill(Tokens.bgSurface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: SessionsFrame.showRadius, style: .continuous)
                .strokeBorder(Tokens.border, lineWidth: Frame.hairline)
        )
        .disabled(batch?.takesTaps ?? false)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.listShow)
        .padding(.horizontal, Frame.gutter)
        .padding(.bottom, 8)
    }

    /// The one menu: Group by and Sort by, Agent and Machine only when the
    /// answer names more than one, and Clear filters while Show is not All or
    /// a filter is set. Its button is filled while a filter is set.
    private var menu: some View {
        Menu {
            Picker(Copy.groupBy, selection: groupChoice) {
                ForEach(SessionsGroupBy.allCases, id: \.self) { group in
                    Text(verbatim: group.word).tag(group)
                }
            }
            .pickerStyle(.menu)
            Picker(Copy.sortBy, selection: sortChoice) {
                ForEach(SessionsSortBy.allCases, id: \.self) { sort in
                    Text(verbatim: sort.word).tag(sort)
                }
            }
            .pickerStyle(.menu)
            if case .loaded(let drawing) = model.state {
                if drawing.agents.count > 1 {
                    Picker(Copy.agent, selection: agentChoice) {
                        Text(verbatim: Copy.allAgents).tag(String?.none)
                        ForEach(drawing.agents) { agent in
                            Text(verbatim: agent.label).tag(Optional(agent.id))
                        }
                    }
                    .pickerStyle(.menu)
                }
                if drawing.machines.count > 1 {
                    Picker(Copy.machine, selection: machineChoice) {
                        Text(verbatim: Copy.allMachines).tag(String?.none)
                        ForEach(drawing.machines) { machine in
                            Text(verbatim: machine.label).tag(Optional(machine.id))
                        }
                    }
                    .pickerStyle(.menu)
                }
            }
            if model.offersClear {
                Divider()
                Button(Copy.clearFilters) {
                    Task { await model.clearFilters() }
                }
            }
        } label: {
            Image(systemName: model.filtered ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle")
                .foregroundStyle(Tokens.accent)
        }
        .disabled(batch?.takesTaps ?? false)
        .accessibilityLabel(Text(verbatim: Copy.sessionsOptions))
        .accessibilityIdentifier(ID.listMenu)
    }

    private var groupChoice: Binding<SessionsGroupBy> {
        Binding(get: { model.words.group }, set: { group in Task { await model.choose(group: group) } })
    }

    private var sortChoice: Binding<SessionsSortBy> {
        Binding(get: { model.words.sort }, set: { sort in Task { await model.choose(sort: sort) } })
    }

    private var agentChoice: Binding<String?> {
        Binding(get: { model.agent }, set: { agent in Task { await model.choose(agent: agent) } })
    }

    private var machineChoice: Binding<String?> {
        Binding(get: { model.machine }, set: { machine in Task { await model.choose(machine: machine) } })
    }

    @ViewBuilder
    private func lineView(_ line: SessionsLine) -> some View {
        switch line {
        case .header(let group, let open):
            GroupHeader(group: group, open: open) { model.toggle(group) }
        case .row(let row, let last):
            RowView(row: row, last: last) { open(row) }
        case .leftOut(let groupId, let text):
            VStack(spacing: 0) {
                Words(text, .secondary, Tokens.textMuted)
                    .lineBox(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityIdentifier(ID.groupLeftOut(groupId))
                    .padding(.horizontal, Frame.gutter)
                    .padding(.vertical, Frame.rowVertical)
                Hairline()
            }
        }
    }

    /// The sheet's own empty faces (D12): `No sessions to manage` when Tortie
    /// lists none at all, and `No matching sessions` with the Mac's Clear
    /// filters when the words keep nothing.
    @ViewBuilder
    private func emptyFace(_ empty: SessionsDrawing.Empty) -> some View {
        switch empty {
        case .noSessions:
            Words(Copy.noSessions, .body, Tokens.textSecondary, lines: nil)
                .accessibilityIdentifier(ID.listNoSessions)
                .padding(.horizontal, Frame.gutter)
                .padding(.vertical, Frame.cardGap)
        case .noMatch:
            VStack(alignment: .leading, spacing: Frame.cardGap) {
                Words(Copy.noMatchingSessions, .body, Tokens.textSecondary, lines: nil)
                    .accessibilityIdentifier(ID.listNoMatch)
                Button {
                    Task { await model.clearFilters() }
                } label: {
                    Words(Copy.clearFilters, .body, Tokens.accent)
                        .lineBox(.body)
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier(ID.listClearFilters)
            }
            .padding(.horizontal, Frame.gutter)
            .padding(.vertical, Frame.cardGap)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    /// The age note, then `read 4:32 PM` right aligned, both 13 pt muted.
    private func foot(_ drawing: SessionsDrawing) -> some View {
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

/// `.grp`: a project's header (Main.html). Its label, count, dot, badge and
/// folder are each an element of its own, read by its id; one tap anywhere on
/// it opens or closes the project, except while End these takes taps.
///
/// The press is a plain `Button` laid over the parts, named by the label, and
/// never a view with `.onTapGesture` or a button made a container: `.disabled(`
/// sets the not-enabled trait only on a control's own element, so a header
/// drawn with a tap gesture, and then one wrapped in a Button made a container
/// by `.accessibilityElement(children: .contain)`, both read as an enabled
/// button to VoiceOver and XCUITest while End these took taps, a button that
/// did nothing (the fix round, 2026-10-03, measured on iOS 26.3; rule (aa)(6)).
/// The parts stay elements of their own beside it, so each is read by its id.
private struct GroupHeader: View {
    let group: GroupDrawing
    let open: Bool
    let toggle: () -> Void
    /// End these, where it is attached: while it takes taps, a header is off.
    @Environment(\.endBatch) private var batch

    var body: some View {
        content
            .overlay {
                Button(action: tapped) {
                    Color.clear
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .disabled(batch?.takesTaps ?? false)
                .accessibilityLabel(Text(verbatim: group.label))
                .accessibilityAddTraits(open ? .isSelected : [])
                .accessibilityIdentifier(ID.group(group.id))
            }
    }

    /// What the header draws: the chevron, the label, the count, the
    /// needs-input dot, the machine badge and the folder, then a hairline.
    private var content: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: Frame.rowGap) {
                    Chevron()
                        .rotationEffect(.degrees(open ? 90 : 0))
                    Words(group.label, .groupLabel, Tokens.textPrimary)
                        .lineBox(.groupLabel)
                        .accessibilityIdentifier(ID.groupLabel(group.id))
                    Words(group.count, .age, Tokens.textMuted)
                        .fixedSize()
                        .accessibilityIdentifier(ID.groupCount(group.id))
                    if group.waiting {
                        DotView(dot: .attention, title: Copy.needsInput)
                            .accessibilityIdentifier(ID.groupWaiting(group.id))
                    }
                    Spacer(minLength: 0)
                    if let machine = group.machine {
                        MachineBadge(name: machine)
                            .accessibilityIdentifier(ID.groupMachine(group.id))
                    }
                }
                if let folder = group.folder {
                    Words(folder, .small, Tokens.textMuted)
                        .lineBox(.small)
                        .padding(.leading, SessionsFrame.folderInset)
                        .accessibilityIdentifier(ID.groupFolder(group.id))
                }
            }
            .padding(.horizontal, Frame.gutter)
            .padding(.top, SessionsFrame.groupTop)
            .padding(.bottom, SessionsFrame.groupBottom)
            Hairline()
        }
        .contentShape(Rectangle())
    }

    private func tapped() {
        guard batch?.takesTaps != true else { return }
        toggle()
    }
}
