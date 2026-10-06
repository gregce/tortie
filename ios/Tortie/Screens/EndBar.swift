// End, on one session (Phase 317, build/p317/SPEC.md section 5.8.3; at the
// top right since Phase 337, build/p337/SPEC.md D33).
//
// docs/design/phone/End.html and Session.html. The navigation bar's trailing
// item on a session the Mac offers End for: the owner check's glyph and
// `End` in the error colour; its one line is drawn under the session's status
// (`EndLine`), and the bar that sat above the tab bar until Phase 337 is gone.
// Pressing it shows the Mac's OWN confirmation, word for word (the
// door composes it with the Mac's `endSessionConfirm` over main's own row);
// its destructive press asks iOS for Face ID, Touch ID or the passcode, and
// only a match sends anything. The Mac asks both of its End gates again by id
// when the write arrives, so what this bar draws decides what is drawn and
// nothing else.
//
// THE RUNNER. Every End, single or batch, is an `EndRunner`: made at the
// destructive press BEFORE the owner check, registered with the app, its list
// a `let` fixed there, and its `run` the app's ONLY call of the writer's `end`
// (conformance:ios rules ab, ac, ad). The app stops every live runner when it
// goes to the background (`AppModel.wentAway`), which withholds a write whose
// bytes were not yet handed to the connection (Door/DoorClient.swift). Nothing
// keeps the app running to finish a write, and nothing is retried or queued:
// a new press is a new write id and a new Face ID.
//
// AFTER A WRITE the screen reads again, and End's line says what is true:
// nothing for `done` (the session then reads Ended and End goes), the
// Mac's own sentence for a refusal, `Your Mac did not end it. Nothing was
// changed.` for a 404 or a write that was withheld, and `Your Mac did not
// answer. This is the session as it reads now.` ONLY when the read that
// follows a write with no answer succeeded; otherwise that read's own
// consequence stands (its sentence, back to the list, or Pairing).

import SwiftUI

// MARK: - The runner

/// Where the app keeps every live runner, so a trip to the background stops
/// each one. `AppModel` is the app's.
@MainActor
protocol EndRunnerRegistry: AnyObject {
    func register(_ runner: EndRunner)
    func release(_ runner: EndRunner)
}

/// What one target came to, as the run reports it.
enum EndStep: Equatable, Sendable {
    /// Its write is under way.
    case ending
    /// Its write ended so.
    case wrote(WriteResult)
    /// The run stopped before it came to this one: nothing was sent for it.
    case notRun
}

/// One End, from the press to its last answer: one session for the End bar,
/// the confirmed targets for End these. Its list is fixed when it is made and
/// can only be cut short; it writes one target at a time, in order, and stops
/// for good once asked to or once a write was not taken, not answered or not
/// sent.
@MainActor
final class EndRunner {
    /// The ids, in drawn order, fixed at the confirmation and never grown.
    let targets: [String]
    /// Whether these are End these' writes (the Mac batch's one narrowing).
    let batch: Bool
    private let writer: any DoorWriting
    /// Read before every write, the first included. Once true it stays true:
    /// nothing anywhere sets it back.
    var stopRequested = false
    /// The press's own task: the owner check, then this run.
    var task: Task<Void, Never>?

    init(targets: [String], batch: Bool, writer: any DoorWriting) {
        self.targets = targets
        self.batch = batch
        self.writer = writer
    }

    /// Stop: no further write is started, and one whose bytes were not yet
    /// handed to the connection is withheld.
    func stop() {
        stopRequested = true
        task?.cancel()
    }

    /// One awaited write per target, in order. A target after a stop is not
    /// run, and nothing is ever sent twice.
    func run(_ report: (String, EndStep) -> Void) async {
        for id in targets {
            if stopRequested {
                report(id, .notRun)
                continue
            }
            report(id, .ending)
            let result = await writer.end(id, batch: batch)
            report(id, .wrote(result))
            if Self.stops(after: result) { stopRequested = true }
        }
    }

    /// A write the Mac did not take, did not answer, or that was not sent
    /// stops the run: whatever kept it from the Mac would keep the next one.
    nonisolated static func stops(after result: WriteResult) -> Bool {
        switch result {
        case .answered: false
        case .notTaken, .noAnswer, .notSent: true
        }
    }
}

// MARK: - What the bar draws, decided before anything is laid out

/// End as drawn: its press at the top right and its line under the status.
/// Pure, so the tests read every state of it.
struct EndBarDrawing: Equatable {
    enum Row: Equatable {
        /// Pressable, in the error colour.
        case on
        /// Drawn off, in the muted colour.
        case off
    }

    /// The row, or nil when no row is drawn.
    let row: Row?
    /// `End`, or `Ending…` while the write is under way.
    let label: String
    /// The owner check's glyph: an image, never a word.
    let glyph: String
    /// The one line under the row, or nil. Never empty.
    let line: String?
    /// The confirmation, present exactly when the row is on.
    let confirm: PocketEndConfirm?
    /// The owner check is up.
    let confirming: Bool

    /// The bar is drawn at all.
    var drawn: Bool { row != nil || line != nil }

    init(offer: PocketEndOffer, confirm: PocketEndConfirm?, kind: OwnerKind, phase: EndModel.Phase, line: String?) {
        glyph = Self.glyph(kind)
        confirming = phase == .confirming
        label = phase == .writing ? Copy.ending : Copy.endTop
        let said = line.flatMap { $0.isEmpty ? nil : $0 }
        switch offer {
        case .offered:
            // An End is drawn only with the Mac's own words for its question.
            guard let confirm else {
                row = nil
                self.line = said
                self.confirm = nil
                return
            }
            let on = kind != .none && phase == .idle
            row = on ? .on : .off
            self.confirm = on ? confirm : nil
            self.line = said ?? (kind == .none ? Copy.endNeedsPasscode : nil)
        case .unreachable(let title):
            row = .off
            self.confirm = nil
            self.line = said ?? (title.isEmpty ? nil : title)
        case .none:
            row = nil
            self.confirm = nil
            self.line = said
        }
    }

    /// `faceid`, `touchid`, or `lock` for the passcode alone.
    static func glyph(_ kind: OwnerKind) -> String {
        switch kind {
        case .faceID: "faceid"
        case .touchID: "touchid"
        case .passcode, .none: "lock"
        }
    }
}

// MARK: - The model

@MainActor
@Observable
final class EndModel {
    enum Phase: Equatable {
        case idle
        /// The owner check is up.
        case confirming
        /// The write is under way.
        case writing
    }

    let sessionId: String
    private(set) var phase: Phase = .idle
    /// The line under the bar, or nil. Never an empty string.
    private(set) var line: String?
    /// What this iPhone confirms its owner with.
    private(set) var kind: OwnerKind
    /// The reader's writer; nil draws no End at all.
    let writer: (any DoorWriting)?
    private let ownerCheck: any OwnerCheck
    private let registry: (any EndRunnerRegistry)?
    /// The press's task, held so a test can wait for it. Never drawn from.
    @ObservationIgnored private(set) var pressing: Task<Void, Never>?

    init(
        sessionId: String,
        writer: (any DoorWriting)?,
        ownerCheck: any OwnerCheck,
        registry: (any EndRunnerRegistry)?
    ) {
        self.sessionId = sessionId
        self.writer = writer
        self.ownerCheck = ownerCheck
        self.registry = registry
        kind = writer == nil ? .none : ownerCheck.kind()
    }

    /// Ask iOS again what confirms the owner: a passcode set in iOS Settings
    /// while he was away turns End on.
    func refreshKind() {
        guard writer != nil else { return }
        kind = ownerCheck.kind()
    }

    /// The confirmation's destructive press. The runner is made and registered
    /// HERE, before the owner check, so leaving the app while iOS asks stops
    /// it before it sends; the write is started only on `.confirmed`. A second
    /// press while one is under way does nothing.
    func press(_ confirm: PocketEndConfirm, reread: @escaping @MainActor () async -> Bool) {
        guard phase == .idle, kind != .none, let writer else { return }
        let runner = EndRunner(targets: [sessionId], batch: false, writer: writer)
        registry?.register(runner)
        let registry = registry
        let ownerCheck = ownerCheck
        phase = .confirming
        line = nil
        let task = Task { [weak self] in
            switch await ownerCheck.confirm(reason: confirm.confirmLabel) {
            case .confirmed:
                self?.phase = .writing
                var written: WriteResult?
                await runner.run { _, step in
                    if case .wrote(let result) = step { written = result }
                }
                await self?.after(written, reread: reread)
            case .notConfirmed:
                self?.line = Copy.endNotConfirmed
            case .needsPasscode:
                self?.kind = .none
            }
            self?.phase = .idle
            registry?.release(runner)
        }
        runner.task = task
        pressing = task
    }

    /// What the line says once the write ended, and the read that follows.
    private func after(_ written: WriteResult?, reread: @MainActor () async -> Bool) async {
        // Stopped before its write started (the app went away during the
        // owner check): nothing was sent, which is what the Mac's 404 says too.
        guard let written else {
            line = Copy.endNotTaken
            _ = await reread()
            return
        }
        switch written {
        case .answered(let answer):
            line = answer.outcome == .done ? nil : DoorWords.endSentence(for: written)
            _ = await reread()
        case .notTaken:
            line = Copy.endNotTaken
            _ = await reread()
        case .noAnswer:
            // "As it reads now" is true only of a read that came back.
            line = await reread() ? Copy.endNoAnswer : nil
        case .notSent:
            line = DoorWords.endSentence(for: written)
            if written.withheld { _ = await reread() }
        }
    }
}

// MARK: - End at the top right (Phase 337, D33)

/// End's press, the navigation bar's trailing item. A pairing that writes
/// nothing, or a session End is not offered on, draws none.
struct EndTopItem: ToolbarContent {
    let model: EndModel?
    let offer: PocketEndOffer
    let confirm: PocketEndConfirm?
    let reread: @MainActor () async -> Bool

    var body: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            if let model {
                EndTopControl(model: model, offer: offer, confirm: confirm, reread: reread)
            }
        }
    }
}

/// The press and the Mac's confirmation over it.
struct EndTopControl: View {
    let model: EndModel
    let offer: PocketEndOffer
    let confirm: PocketEndConfirm?
    let reread: @MainActor () async -> Bool
    /// The Mac's confirmation is up.
    @State private var asking = false

    private var drawing: EndBarDrawing {
        EndBarDrawing(offer: offer, confirm: confirm, kind: model.kind, phase: model.phase, line: model.line)
    }

    var body: some View {
        let drawing = drawing
        if model.writer != nil, let row = drawing.row {
            self.row(row, drawing: drawing)
                .confirmationDialog(confirm?.title ?? Copy.endSessionMenu, isPresented: $asking, titleVisibility: .visible) {
                    if let shown = drawing.confirm {
                        Button(shown.confirmLabel, role: .destructive) {
                            model.press(shown, reread: reread)
                        }
                    }
                    Button(Copy.cancel, role: .cancel) {}
                } message: {
                    if let shown = drawing.confirm {
                        Text(verbatim: shown.body)
                    }
                }
        }
    }

    /// The glyph and `End`, in the error colour while it can be pressed.
    ///
    /// THE PRESS IS A PLAIN BUTTON, its word alone (Phase 317's fix round): a
    /// Button made a container of its own children read ENABLED to XCUITest,
    /// and so to VoiceOver, while drawn off, which the verify measured on the
    /// unreachable offer. So the glyph and the progress sit beside the press as
    /// elements of their own (a UI test reads which glyph the phone drew, an
    /// image and never a word), and the press says off when it is off.
    private func row(_ row: EndBarDrawing.Row, drawing: EndBarDrawing) -> some View {
        HStack(spacing: 4) {
            if drawing.confirming {
                ProgressView()
                    .tint(Tokens.textMuted)
                    .accessibilityIdentifier(ID.endConfirming)
            }
            Image(systemName: drawing.glyph)
                .foregroundStyle(row == .on ? Tokens.error : Tokens.textMuted)
                .accessibilityIdentifier(ID.sessionEndGlyph(drawing.glyph))
            Button {
                guard drawing.confirm != nil else { return }
                asking = true
            } label: {
                Words(drawing.label, .body, row == .on ? Tokens.error : Tokens.textMuted)
                    .lineBox(.body)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(row == .off)
            .accessibilityIdentifier(ID.sessionEnd)
        }
    }
}

/// End's one line, drawn under the session's status: the Mac's sentence, the
/// phone's, or the passcode's. Nothing when there is none.
struct EndLine: View {
    let model: EndModel
    let offer: PocketEndOffer
    let confirm: PocketEndConfirm?

    var body: some View {
        let drawing = EndBarDrawing(offer: offer, confirm: confirm, kind: model.kind, phase: model.phase, line: model.line)
        if model.writer != nil, let line = drawing.line {
            Words(line, .secondary, Tokens.textSecondary, lines: nil)
                .accessibilityIdentifier(ID.sessionEndLine)
                .padding(.horizontal, Frame.gutter)
                .padding(.bottom, 8)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

/// The lengths End.html spells that the other mocks do not.
enum EndFrame {
    /// End these' bar (`height: 50px`); the End bar's row until Phase 337.
    static let rowHeight: CGFloat = 50
}
