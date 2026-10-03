// End these: Select, then end several sessions at once, behind one Face ID
// (Phase 317, build/p317/SPEC.md section 5.8.4; docs/design/phone/EndThese.html).
//
// ONE ATTACHABLE PIECE. The selection, the bar above the tab bar, the Mac
// sheet's confirmation and the run live here, behind ONE modifier,
// `.endBatch(_:list:)`, which the Sessions tab applies on one line
// (Screens/ListScreen.swift). Phase 316.7's SessionsScreen adopts it by moving
// that line. The list's title and rows carry three small hooks from this file
// (`EndBatchTitleControl`, `EndBatchRowMark`, `EndBatchOutcome`), and a row's
// tap asks the piece first (`takesTaps`). The piece reaches them through the
// environment; where it is not attached (the Needs input tab) the title draws
// no Select, a row lays out nothing for a circle or a word, and a tap opens
// the session as it always has.
//
// THE MAC SHEET'S ORDER AND WORDS (src/renderer/session-manager/BatchPanel.tsx,
// copy.ts): the title `End N running sessions?`; the body FIRST in the
// message, with its remote tail when any target is on another machine; then
// the targets' names one per line; then, when any selected row will not be
// ended, `N selected sessions stay unchanged: …`. A row skipped there is
// counted and is NOT a target, so it gets no outcome word. The press is
// `End N sessions`, and it is the reason under iOS's prompt.
//
// THE LIST ONLY SHRINKS. The targets are fixed at the confirmation, in drawn
// order, in a runner whose list is a `let` (Screens/EndBar.swift `EndRunner`),
// made at the destructive press BEFORE the owner check and registered with the
// app. One write at a time; it stops on Stop, when the app goes to the
// background, and after a write the Mac did not take, did not answer or that
// was not sent; every target it did not reach reads `Not run`. Nothing is
// persisted, nothing is queued for later, and no background task keeps the app
// running (conformance:ios rules l and ad).
//
// The Mac asks both of its End gates again by id for every write, so what the
// phone drew when it confirmed decides nothing on the Mac.

import SwiftUI

// MARK: - The confirmation, decided before anything is laid out

/// Why a selected row stays unchanged, in the Mac batch's words and order.
enum BatchSkip: Equatable, Sendable {
    /// The Mac offers no End on it: it already ended.
    case ended
    /// Tortie cannot see whether it runs, or it is on a machine Tortie holds
    /// no row for (the Mac batch's one narrowing).
    case unreachable
    /// It is no longer on the list.
    case gone
}

/// The batch confirmation for the rows selected now.
struct BatchConfirm: Equatable {
    /// The targets' ids, in drawn order.
    let targets: [String]
    /// `End 2 running sessions?`.
    let heading: String
    /// The body, the names one per line, then the skipped line.
    let message: String
    /// `End 2 sessions`, which is also the reason under iOS's prompt.
    let confirmLabel: String

    /// Nil when no selected row may be ended by a batch.
    static func of(selected: Set<String>, rows: [RowDrawing]) -> BatchConfirm? {
        let chosen = rows.filter { selected.contains($0.id) }
        let targets = chosen.filter { $0.end.batchMayEnd }
        guard !targets.isEmpty else { return nil }
        let skipped: [BatchSkip] = chosen.filter { !$0.end.batchMayEnd }.map { $0.end == .none ? .ended : .unreachable }
        let gone: [BatchSkip] = selected.filter { id in !rows.contains { $0.id == id } }.map { _ in .gone }
        let anyRemote = targets.contains { $0.machine != nil }
        let skippedLine = Copy.batchSkippedLine([skipped, gone].flatMap { $0 })
        // The Mac sheet's order: the body first, the names, the skipped line.
        let lines = [[Copy.batchBody(anyRemote)], targets.map(\.name), skippedLine.map { [$0] } ?? []].flatMap { $0 }
        return BatchConfirm(
            targets: targets.map(\.id),
            heading: Copy.batchHeading(targets.count),
            message: lines.joined(separator: BatchText.lineBreak),
            confirmLabel: Copy.batchConfirmLabel(targets.count)
        )
    }
}

/// The one character the message is broken with: not a word.
enum BatchText {
    static let lineBreak = "\n"
}

/// What End these needs from the app.
struct EndBatchSetup {
    let writer: any DoorWriting
    let ownerCheck: any OwnerCheck
    let registry: any EndRunnerRegistry
}

// MARK: - The model

@MainActor
@Observable
final class EndBatchModel {
    enum Phase: Equatable {
        /// Rows open their session.
        case off
        /// Rows toggle.
        case selecting
        /// The owner check is up.
        case confirming
        /// One write at a time.
        case running
        /// Every target has its word.
        case done
    }

    private(set) var phase: Phase = .off
    private(set) var selected: Set<String> = []
    /// The run's targets, in drawn order, once it is confirmed.
    private(set) var targets: [String] = []
    /// What each target came to.
    private(set) var steps: [String: EndStep] = [:]
    /// One line in the bar: the owner check's answer when it did not confirm.
    private(set) var line: String?
    private let setup: EndBatchSetup
    @ObservationIgnored private var runner: EndRunner?
    /// The press's task, held so a test can wait for it. Never drawn from.
    @ObservationIgnored private(set) var pressing: Task<Void, Never>?

    init(setup: EndBatchSetup) {
        self.setup = setup
    }

    /// Whether a tap on a row toggles it rather than opening its session.
    var takesTaps: Bool { phase != .off }

    /// Whether every row draws its circle.
    var showsMarks: Bool { phase == .selecting || phase == .confirming }

    /// `Select`.
    func select() {
        guard phase == .off else { return }
        selected = []
        line = nil
        phase = .selecting
    }

    /// `Cancel` in the title: back to opening rows, nothing ended.
    func cancel() {
        guard phase == .selecting else { return }
        selected = []
        line = nil
        phase = .off
    }

    func toggle(_ id: String) {
        guard phase == .selecting else { return }
        selected.formSymmetricDifference([id])
        line = nil
    }

    /// The confirmation's destructive press. The runner, its targets fixed
    /// here, is made and registered BEFORE the owner check; the writes start
    /// only on `.confirmed`.
    func press(_ confirm: BatchConfirm) {
        guard phase == .selecting else { return }
        let runner = EndRunner(targets: confirm.targets, batch: true, writer: setup.writer)
        setup.registry.register(runner)
        self.runner = runner
        let registry = setup.registry
        let ownerCheck = setup.ownerCheck
        phase = .confirming
        line = nil
        let task = Task { [weak self] in
            switch await ownerCheck.confirm(reason: confirm.confirmLabel) {
            case .confirmed:
                self?.targets = runner.targets
                self?.steps = [:]
                self?.phase = .running
                await runner.run { id, step in
                    self?.steps[id] = step
                }
                self?.phase = .done
            case .notConfirmed:
                self?.line = Copy.endNotConfirmed
                self?.phase = .selecting
            case .needsPasscode:
                self?.line = Copy.endNeedsPasscode
                self?.phase = .selecting
            }
            registry.release(runner)
        }
        runner.task = task
        pressing = task
    }

    /// `Stop`: no further write starts.
    func stop() {
        runner?.stop()
    }

    /// `Done`: back to the list, read again.
    func finish() {
        guard phase == .done else { return }
        runner = nil
        targets = []
        steps = [:]
        selected = []
        phase = .off
    }

    /// The bar's heading while running or done.
    var heading: String? {
        switch phase {
        case .running: Copy.batchRunningHeading(targets.count)
        case .done: Copy.batchDoneHeading(endedCount, targets.count)
        default: nil
        }
    }

    /// How many targets the Mac answered `done` for.
    var endedCount: Int {
        steps.values.filter(Self.isDone).count
    }

    private static func isDone(_ step: EndStep) -> Bool {
        if case .wrote(.answered(let answer)) = step { return answer.outcome == .done }
        return false
    }

    /// One target's word, or nil before its turn and for a row that is not a
    /// target.
    func word(for id: String) -> String? {
        guard let step = steps[id] else { return nil }
        return Self.word(step)
    }

    /// The Mac batch's outcome word for one target (`batchOutcomeWord`), the
    /// door's reason mapped exactly as the Mac batch maps its skip reasons.
    nonisolated static func word(_ step: EndStep) -> String {
        switch step {
        case .ending:
            return Copy.ending
        case .notRun:
            return Copy.notRun
        case .wrote(let result):
            switch result {
            case .answered(let answer):
                switch answer.outcome {
                case .done:
                    return Copy.ended
                case .refused:
                    switch answer.reason {
                    case .ended?: return Copy.alreadyEnded
                    case .unreachable?: return Copy.unreachable
                    // The Mac batch reads a removed row as gone.
                    case .gone?, .removed?: return Copy.noLongerHere
                    case .malformed?, nil: return Copy.notEnded(DoorWords.endSentence(for: result))
                    }
                case .failed, .busy:
                    return Copy.notEnded(DoorWords.endSentence(for: result))
                }
            case .noAnswer:
                return Copy.noAnswer
            case .notTaken:
                return Copy.notEnded(Copy.endNotTaken)
            case .notSent(let failure):
                // Withheld when the app left: it was never sent.
                return failure == .cancelled ? Copy.notRun : Copy.notEnded(DoorWords.sentence(for: failure))
            }
        }
    }
}

// MARK: - The one line the Sessions tab applies

extension View {
    /// End these on this list, or nothing when `setup` is nil.
    func endBatch(_ setup: EndBatchSetup?, list: ListModel) -> some View {
        modifier(EndBatchPiece(setup: setup, list: list))
    }
}

private struct EndBatchKey: EnvironmentKey {
    static let defaultValue: EndBatchModel? = nil
}

private struct EndBatchRowsKey: EnvironmentKey {
    static let defaultValue: [RowDrawing] = []
}

extension EnvironmentValues {
    /// End these, where it is attached.
    var endBatch: EndBatchModel? {
        get { self[EndBatchKey.self] }
        set { self[EndBatchKey.self] = newValue }
    }

    /// The rows End these confirms over, as drawn.
    fileprivate var endBatchRows: [RowDrawing] {
        get { self[EndBatchRowsKey.self] }
        set { self[EndBatchRowsKey.self] = newValue }
    }
}

private struct EndBatchPiece: ViewModifier {
    let setup: EndBatchSetup?
    let list: ListModel

    func body(content: Content) -> some View {
        if let setup {
            Attached(content: content, setup: setup, list: list)
        } else {
            content
        }
    }

    private struct Attached: View {
        let content: Content
        let list: ListModel
        @State private var model: EndBatchModel
        @State private var asking = false

        init(content: Content, setup: EndBatchSetup, list: ListModel) {
            self.content = content
            self.list = list
            _model = State(initialValue: EndBatchModel(setup: setup))
        }

        /// Every row the Sessions tab draws, in drawn order.
        private var rows: [RowDrawing] {
            guard case .loaded(let drawing) = list.state else { return [] }
            return [drawing.waiting, drawing.others].flatMap { $0 }
        }

        var body: some View {
            let rows = rows
            let confirm = BatchConfirm.of(selected: model.selected, rows: rows)
            content
                .environment(\.endBatch, model)
                .environment(\.endBatchRows, rows)
                .safeAreaInset(edge: .bottom) {
                    if model.phase != .off {
                        bar(confirm)
                    }
                }
                .confirmationDialog(confirm?.heading ?? Copy.endSelected, isPresented: $asking, titleVisibility: .visible) {
                    if let confirm {
                        Button(confirm.confirmLabel, role: .destructive) { model.press(confirm) }
                    }
                    Button(Copy.cancel, role: .cancel) {}
                } message: {
                    if let confirm {
                        Text(verbatim: confirm.message)
                    }
                }
        }

        /// Above the tab bar: the count and the press while selecting; the
        /// heading and Stop or Done while running and after.
        private func bar(_ confirm: BatchConfirm?) -> some View {
            VStack(alignment: .leading, spacing: 0) {
                Hairline()
                HStack(spacing: Frame.rowGap) {
                    if let heading = model.heading {
                        Words(heading, .body, Tokens.textPrimary)
                            .lineBox(.body)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .accessibilityIdentifier(ID.batchHeading)
                        if model.phase == .running {
                            Button(Copy.stop) { model.stop() }
                                .accessibilityIdentifier(ID.batchStop)
                        } else {
                            Button(Copy.done) {
                                model.finish()
                                Task { await list.load() }
                            }
                            .accessibilityIdentifier(ID.batchDone)
                        }
                    } else {
                        Words(Copy.selectedCount(model.selected.count), .body, Tokens.textSecondary)
                            .lineBox(.body)
                            .accessibilityIdentifier(ID.listSelectedCount)
                        Spacer(minLength: Frame.rowGap)
                        Button {
                            asking = true
                        } label: {
                            Words(Copy.endSelected, .body, confirm == nil ? Tokens.textMuted : Tokens.error)
                                .lineBox(.body)
                        }
                        .buttonStyle(.plain)
                        .disabled(confirm == nil || model.phase != .selecting)
                        .accessibilityIdentifier(ID.listEndSelected)
                    }
                }
                .padding(.horizontal, Frame.gutter)
                .frame(height: EndFrame.rowHeight)
                if let line = model.line {
                    Words(line, .secondary, Tokens.textSecondary, lines: nil)
                        .accessibilityIdentifier(ID.batchLine)
                        .padding(.horizontal, Frame.gutter)
                        .padding(.bottom, 8)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Tokens.bgSurface.ignoresSafeArea(edges: .horizontal))
        }
    }
}

// MARK: - The hooks the list draws, nothing where the piece is absent

/// `Select`, or `Cancel` while selecting, at the title's trailing edge. Drawn
/// only when the Mac offers End on at least one row.
struct EndBatchTitleControl: View {
    @Environment(\.endBatch) private var batch
    @Environment(\.endBatchRows) private var rows

    var body: some View {
        if let batch {
            switch batch.phase {
            case .off where rows.contains(where: { $0.end.isOffered }):
                Button(Copy.select) { batch.select() }
                    .accessibilityIdentifier(ID.listSelect)
            case .selecting:
                Button(Copy.cancel) { batch.cancel() }
                    .accessibilityIdentifier(ID.listSelect)
            default:
                EmptyView()
            }
        }
    }
}

/// The circle on a row while selecting: an image with no words, and the
/// selected trait when it is ticked. The row draws it only while
/// `showsMarks`, so a row with no batch attached lays out exactly as before.
struct EndBatchRowMark: View {
    let id: String
    let ticked: Bool

    var body: some View {
        Image(systemName: ticked ? "checkmark.circle.fill" : "circle")
            .foregroundStyle(ticked ? Tokens.accent : Tokens.textMuted)
            .accessibilityAddTraits(ticked ? .isSelected : [])
            .accessibilityIdentifier(ID.rowSelect(id))
    }
}

/// One target's outcome word while the run goes and after it. The row draws
/// it only when the target has one.
struct EndBatchOutcome: View {
    let id: String
    let word: String

    var body: some View {
        Words(word, .secondary, Tokens.textSecondary)
            .lineBox(.secondary)
            .fixedSize()
            .accessibilityIdentifier(ID.rowOutcome(id))
    }
}
