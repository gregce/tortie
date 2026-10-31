// Rename, on one session (Phase 349, build/p349/SPEC.md §4.4 step 5, D1, D8,
// D9, D11, D20; his rulings "Only for End" and "No Face ID, just confirm").
//
// docs/design/phone/Rename.html. Rename is the Terminal's ⋯'s second item and
// a row's long-press menu's one item (Screens/SessionScreen.swift,
// Screens/ListScreen.swift); either press opens THIS sheet, in New session's
// family: the title `Rename`, `Cancel` leading and `Save name` trailing, the
// session's whole name in the app's one name field (Screens/NameField.swift),
// focused as it appears with the whole name selected, and ONE line under it,
// drawn only when it has a sentence. Save asks NOTHING of iOS: no Face ID, no
// Touch ID, no passcode, because a rename destroys nothing (D8). This file
// names no owner check (conformance:ios rule ac, `OWNER_CHECK_ABSENT`).
//
// WHAT IS READ FIRST (D20). The list clips a name at 200 and the Terminal holds
// the latest detail, whose name is whole. So a sheet opened from a ROW reads
// the session once (`GET /v1/session`) for the whole name and a fresh offer,
// and Save stays off until that read came back with `rename` still true; a
// sheet opened from the ⋯ reads nothing more. The model is made at the press,
// so the name is fixed when he presses.
//
// WHAT SAVE SENDS. The field's text exactly as he typed it, as ONE rename
// (`RenameRunner`): made at the press, registered with the app BEFORE its task
// starts (`RenameRegistry`; `AppModel` is the app's, and its `wentAway()`
// stops every live one), its `run` the app's ONLY call of the renamer's
// `rename(`. Nothing keeps the app running to finish a write, and nothing is
// retried, queued or stored: a new press is a new write with a fresh id, and
// no id is kept (D9). Save is off while the Mac's rule refuses the trimmed
// text, while it equals the held name byte for byte, while a read or a write
// runs, and until a row's first read came back offering Rename; Return saves
// whenever Save would.
//
// AFTER A WRITE: `done` closes the sheet and what is under it reads the
// session again; a refusal keeps the sheet, his text and the Mac's own
// sentence; a 404 or a write withheld because the app left says `Your Mac did
// not rename it. Nothing was changed.`; and no answer says `Your Mac did not
// answer. This is the session as it reads now.` ONLY over a read of the
// session that came back after it, as Phase 348's Remove does. Inside See a
// sample every press says nothing ran.

import Observation
import SwiftUI

// MARK: - The runner

/// Where the app keeps every live rename runner, so a trip to the background
/// stops each one. `AppModel` is the app's.
@MainActor
protocol RenameRegistry: AnyObject {
    func registerRename(_ runner: RenameRunner)
    func releaseRename(_ runner: RenameRunner)
}

/// One rename, from the press to its answer: ONE session and ONE name, fixed
/// when it is made. Stopped before its write it writes nothing; stopped while
/// its write runs, a write whose bytes were not yet handed is withheld.
@MainActor
final class RenameRunner {
    /// The session, fixed at the press.
    let target: String
    /// The name, the field's text exactly as he typed it, fixed at the press.
    let name: String
    private let renamer: any DoorRenaming
    /// Read before the write. Set by `stop()` alone, and once true it stays
    /// true: nothing sets it back.
    private(set) var stopRequested = false
    /// The press's own task: this run and what follows it.
    var task: Task<Void, Never>?

    init(target: String, name: String, renamer: any DoorRenaming) {
        self.target = target
        self.name = name
        self.renamer = renamer
    }

    /// Stop: no write is started, and one whose bytes were not yet handed to
    /// the connection is withheld.
    func stop() {
        stopRequested = true
        task?.cancel()
    }

    /// The one awaited write, or nil when the run was stopped before it.
    /// Never repeated.
    func run() async -> RenameResult? {
        guard !stopRequested else { return nil }
        return await renamer.rename(target, name: name)
    }
}

// MARK: - The model

@MainActor
@Observable
final class RenameModel: Identifiable {
    enum Phase: Equatable {
        /// A row's sheet reads the session first (D20).
        case reading
        case idle
        /// The rename is under way.
        case writing
        /// The Mac renamed it, or no longer lists it: the sheet closes. Never
        /// left: the model goes with the sheet, so Save cannot be pressed
        /// during the dismissal.
        case done
    }

    /// The session, fixed at the press.
    let sessionId: String
    /// The name the session holds, as the latest read says: what Save
    /// compares the trimmed text with.
    private(set) var held: String
    /// The field's text.
    var text: String
    private(set) var phase: Phase
    /// The line under the field, or nil. Never an empty string.
    private(set) var line: String?
    /// The Mac offers Rename on this session, as last read: true from the ⋯,
    /// which drew Rename over the latest detail; from a row, once its first
    /// read came back with `rename` true (D20).
    private(set) var offered: Bool
    /// Opened from a row: the session is read first (D20).
    let readsFirst: Bool
    /// See a sample: every press says nothing ran.
    let sample: Bool
    /// The first read's task, held so a test can wait for it. Never drawn
    /// from.
    @ObservationIgnored private(set) var reading: Task<Void, Never>?
    /// The press's task, held so a test can wait for it. Never drawn from.
    @ObservationIgnored private(set) var writing: Task<Void, Never>?
    private let renamer: any DoorRenaming
    private let registry: (any RenameRegistry)?

    /// Identified by its session, as a sheet of it is.
    nonisolated var id: String { sessionId }

    init(sessionId: String, name: String, renamer: any DoorRenaming, registry: (any RenameRegistry)?, readsFirst: Bool, sample: Bool = false) {
        self.sessionId = sessionId
        held = name
        text = name
        self.renamer = renamer
        self.registry = registry
        self.readsFirst = readsFirst
        self.sample = sample
        phase = readsFirst ? .reading : .idle
        offered = !readsFirst
    }

    /// Whether Save can be pressed now: nothing runs, the Mac offers Rename,
    /// its rule passes the text, and the trimmed text is not the held name,
    /// compared as bytes.
    var canSave: Bool {
        phase == .idle && offered && NameRule.refusal(text) == nil
            && !NameRule.trimmed(text).utf8.elementsEqual(held.utf8)
    }

    // MARK: The first read (D20)

    /// A row's sheet reads the session once as it opens: the whole name, put
    /// in the field unless he typed already, and a fresh offer. A session the
    /// Mac no longer lists closes the sheet, and `reread` reads the list under
    /// it again; any other failure draws its sentence and keeps Save off. Does
    /// nothing for a sheet that reads nothing first, or twice.
    func readFirst(reread: @escaping @MainActor () async -> Void) {
        guard readsFirst, phase == .reading, reading == nil else { return }
        let shown = text
        let renamer = renamer
        let id = sessionId
        reading = Task { [weak self] in
            do {
                let answer = try await renamer.session(id)
                self?.afterRead(answer, shown: shown)
            } catch {
                await self?.afterFailedRead(error, reread: reread)
            }
        }
    }

    private func afterRead(_ answer: PocketSessionAnswer, shown: String) {
        guard phase == .reading else { return }
        held = answer.session.name
        // The whole name, unless he already typed over what the row showed.
        if text.utf8.elementsEqual(shown.utf8) { text = held }
        offered = answer.session.rename
        phase = .idle
    }

    private func afterFailedRead(_ error: Error, reread: @MainActor () async -> Void) async {
        guard phase == .reading, !DoorWords.isCancellation(error) else { return }
        switch DoorWords.consequence(of: error, reading: .oneSession) {
        case .backToList:
            // The Mac no longer lists this session: the list is the truth.
            phase = .done
            await reread()
        case .draw, .pairAgain:
            line = DoorWords.sentence(for: error)
            phase = .idle
        }
    }

    // MARK: Save

    /// Save name, or Return where Save would: ONE runner of the text as typed,
    /// made and registered HERE, before its write, so leaving the app stops
    /// it; nothing is asked of iOS first (D8). A press while Save is off does
    /// nothing.
    func save(reread: @escaping @MainActor () async -> Void) {
        guard canSave else { return }
        let runner = RenameRunner(target: sessionId, name: text, renamer: renamer)
        registry?.registerRename(runner)
        let registry = registry
        phase = .writing
        line = nil
        let task = Task { [weak self] in
            let result = await runner.run()
            await self?.after(result ?? .notSent(.cancelled), reread: reread)
            registry?.releaseRename(runner)
        }
        runner.task = task
        writing = task
    }

    /// What the line says once the write ended, and what is read again. A
    /// run stopped before its write (the app went away) sent nothing, which
    /// is a write withheld.
    private func after(_ result: RenameResult, reread: @MainActor () async -> Void) async {
        switch result {
        case .answered(let answer) where answer.outcome == .done:
            // Done: the sheet closes, and what is under it reads again.
            if let stored = answer.name { held = stored }
            line = nil
            phase = .done
            await reread()
        case .answered, .notTaken:
            // Refused, failed, busy or not taken: the sheet keeps his text and
            // says why.
            line = DoorWords.renameSentence(for: result, sample: sample)
            phase = .idle
            await reread()
        case .noAnswer:
            // "As it reads now" is true only of a read that came back.
            if let now = try? await renamer.session(sessionId) {
                held = now.session.name
                offered = now.session.rename
                line = DoorWords.renameSentence(for: result, sample: sample)
            } else {
                line = nil
            }
            phase = .idle
            await reread()
        case .notSent:
            line = DoorWords.renameSentence(for: result, sample: sample)
            phase = .idle
            if result.withheld { await reread() }
        }
    }
}

// MARK: - The sheet

/// The Rename sheet (docs/design/phone/Rename.html): the title `Rename`,
/// `Cancel` and `Save name`, the name field and one line. It closes itself
/// when the model's phase becomes `.done`.
struct SessionNameSheet: View {
    @Bindable var model: RenameModel
    /// Reads again what is under the sheet: the list, or the Terminal's session.
    let reread: @MainActor () async -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: StartFrame.labelGap) {
                    NameField(text: $model.text, identifier: ID.renameField, label: Copy.sortName, focusOnAppear: true) {
                        if model.canSave { model.save(reread: reread) }
                    }
                    .frame(minHeight: StartFrame.menuHeight)
                    .padding(.horizontal, Frame.cardPadding)
                    .card()
                    if let line = model.line {
                        Words(line, .secondary, Tokens.textSecondary, lines: nil)
                            .accessibilityIdentifier(ID.renameLine)
                    }
                }
                .padding(Frame.gutter)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .scrollIndicators(.hidden)
            .background(Tokens.bgSidebar.ignoresSafeArea())
            .navigationTitle(Copy.rename)
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Tokens.bgSidebar, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(Copy.cancel) { dismiss() }
                        .disabled(model.phase == .writing)
                        .accessibilityIdentifier(ID.renameCancel)
                }
                ToolbarItem(placement: .confirmationAction) {
                    HStack(spacing: Frame.rowGap) {
                        if model.phase == .writing {
                            ProgressView()
                                .tint(Tokens.textMuted)
                                .accessibilityIdentifier(ID.renameWriting)
                        }
                        Button(Copy.saveName) { model.save(reread: reread) }
                            .disabled(!model.canSave)
                            .accessibilityIdentifier(ID.renameSave)
                    }
                }
            }
        }
        // A write under way keeps the sheet, so its line is drawn where Save
        // was pressed.
        .interactiveDismissDisabled(model.phase == .writing)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.renameSheet)
        .task { model.readFirst(reread: reread) }
        .onChange(of: model.phase) { _, phase in
            if phase == .done { dismiss() }
        }
    }
}
