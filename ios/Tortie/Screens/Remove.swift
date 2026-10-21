// Remove, on one session that has ended (Phase 348, build/p348/SPEC.md D4 to
// D11, D33 and D55; his ruling of 2026-10-18, "No Face ID, just confirm").
//
// docs/design/phone/TerminalMenuRemove.html and End.html. Once End is done
// and the Mac offers Remove (the session answer's `removeConfirm`, present
// only while the Mac serves `remove` and both of its gates offer it now),
// Remove takes End's place, as it does on the Mac: at Catch Me Up's top right,
// the Mac's own word `Remove` in the error colour and no glyph
// (`RemoveTopControl`); and in the Terminal's ⋯ in End session…'s place
// (`RemoveMenuItem`). A page keeps the face it opened on, so a Terminal whose
// session has just ended offers Remove in its ⋯. Either press shows the Mac's
// OWN confirmation, word for word (`Remove '<name>'?`, `It moves to Past
// Sessions and you can restore it from there.`, `Remove`), from ONE modifier
// (`RemoveConfirmation`), and its destructive press asks NOTHING of iOS: no
// Face ID, no Touch ID, no passcode. This file names no owner check
// (conformance:ios rule ac, `OWNER_CHECK_ABSENT`). The Mac asks both of its
// gates again by id when the write arrives, so what is drawn here decides
// what is drawn and nothing else.
//
// THE RUNNER. Every Remove is a `RemoveRunner` of ONE target, made at the
// destructive press and registered with the app BEFORE its write
// (`RemoveRegistry`; `AppModel` is the app's, and its `wentAway()` stops every
// live one), its `run` the app's ONLY call of the remover's `remove`. Nothing
// keeps the app running to finish a write, and nothing is retried or queued:
// a new press is a new write with a fresh id, and no id is kept.
//
// AFTER A WRITE: `done` goes back to the list, which reads again and no longer
// lists the session (the route's own `backToList`, never an alerted route's
// sentence that the Mac has no record of a session it keeps in Past
// Sessions); a refusal draws the Mac's own sentence on End's line under the
// status and the session is read again; a 404 or a write withheld because the
// app left says `Your Mac did not remove it. Nothing was changed.`; and no
// answer says `Your Mac did not answer. This is the session as it reads now.`
// ONLY over a read of the session that came back after it.

import SwiftUI

// MARK: - The runner

/// Where the app keeps every live Remove runner, so a trip to the background
/// stops each one. `AppModel` is the app's.
@MainActor
protocol RemoveRegistry: AnyObject {
    func registerRemove(_ runner: RemoveRunner)
    func releaseRemove(_ runner: RemoveRunner)
}

/// One Remove, from the destructive press to its answer: ONE session, fixed
/// when it is made. Stopped before its write it writes nothing; stopped while
/// its write runs, a write whose bytes were not yet handed is withheld.
@MainActor
final class RemoveRunner {
    /// The session, fixed at the confirmation.
    let target: String
    private let remover: any DoorRemoving
    /// Read before the write. Set by `stop()` alone, and once true it stays
    /// true: nothing sets it back.
    private(set) var stopRequested = false
    /// The press's own task: this run and what follows it.
    var task: Task<Void, Never>?

    init(target: String, remover: any DoorRemoving) {
        self.target = target
        self.remover = remover
    }

    /// Stop: no write is started, and one whose bytes were not yet handed to
    /// the connection is withheld.
    func stop() {
        stopRequested = true
        task?.cancel()
    }

    /// The one awaited write, or nil when the run was stopped before it.
    func run() async -> RemoveResult? {
        guard !stopRequested else { return nil }
        return await remover.remove(target)
    }
}

// MARK: - What is drawn, decided before anything is laid out

/// Remove as drawn: in End's place exactly when End draws no row because the
/// Mac offers no End (`offer` is `.none`), the Mac sent its own words for
/// Remove, and this pairing removes; pressable while no Remove of it runs,
/// drawn off while one does. Pure, so the tests read every state of it.
struct RemoveDrawing: Equatable {
    enum Row: Equatable {
        /// Pressable, in the error colour.
        case on
        /// Drawn off, in the muted colour, while the write runs.
        case off
    }

    let row: Row
    /// The Mac's confirmation, present exactly when the row is on.
    let confirm: PocketEndConfirm?
    /// The write is under way: the progress mark is drawn.
    let writing: Bool

    /// Remove's drawing for a model, an End offer and the Mac's words, or nil
    /// when no Remove is drawn: no model (a pairing that removes nothing), an
    /// End the Mac still offers (or cannot judge), or no words of the Mac's.
    @MainActor
    static func of(_ model: RemoveModel?, offer: PocketEndOffer, confirm: PocketEndConfirm?) -> RemoveDrawing? {
        of(phase: model?.phase, offer: offer, confirm: confirm)
    }

    /// The same, over a phase alone (nil: no model).
    static func of(phase: RemoveModel.Phase?, offer: PocketEndOffer, confirm: PocketEndConfirm?) -> RemoveDrawing? {
        // `PocketEndOffer.none` spelled whole: `.none` beside `==` could be
        // read as `Optional.none`, which no offer ever equals.
        guard let phase, offer == PocketEndOffer.none, let confirm else { return nil }
        let writing = phase == .writing
        return RemoveDrawing(row: writing ? .off : .on, confirm: writing ? nil : confirm, writing: writing)
    }
}

// MARK: - The model

@MainActor
@Observable
final class RemoveModel {
    enum Phase: Equatable {
        case idle
        /// The write is under way.
        case writing
    }

    let sessionId: String
    private(set) var phase: Phase = .idle
    /// The line under the status, or nil. Never an empty string. Drawn on
    /// End's line (Screens/EndBar.swift `EndLine`), whose place Remove takes.
    private(set) var line: String?
    /// A Remove was pressed on this session's page: from then on the line
    /// under the status is Remove's (`EndModel.shownLine`).
    private(set) var pressed = false
    private let remover: any DoorRemoving
    private let registry: (any RemoveRegistry)?
    private let routing: ReadRouting
    /// The press's task, held so a test can wait for it. Never drawn from.
    @ObservationIgnored private(set) var pressing: Task<Void, Never>?

    init(sessionId: String, remover: any DoorRemoving, registry: (any RemoveRegistry)?, routing: ReadRouting) {
        self.sessionId = sessionId
        self.remover = remover
        self.registry = registry
        self.routing = routing
    }

    /// The confirmation's destructive press. The runner is made and registered
    /// HERE, before its write, so leaving the app stops it; nothing is asked
    /// of iOS first (his ruling, "No Face ID, just confirm"). A second press
    /// while one is under way does nothing.
    func press(reread: @escaping @MainActor () async -> Bool) {
        guard phase == .idle else { return }
        let runner = RemoveRunner(target: sessionId, remover: remover)
        registry?.registerRemove(runner)
        let registry = registry
        phase = .writing
        pressed = true
        line = nil
        let task = Task { [weak self] in
            let result = await runner.run()
            await self?.after(result, reread: reread)
            self?.phase = .idle
            registry?.releaseRemove(runner)
        }
        runner.task = task
        pressing = task
    }

    /// What the line says once the write ended, and where the screen goes.
    private func after(_ result: RemoveResult?, reread: @MainActor () async -> Bool) async {
        // Stopped before its write started (the app went away): nothing was
        // sent, which is what the Mac's 404 says too.
        guard let result else {
            line = Copy.removeNotTaken
            _ = await reread()
            return
        }
        switch result {
        case .answered(let answer):
            if answer.outcome == .done {
                // Done: back to the list, which no longer lists the session.
                line = nil
                routing.backToList()
            } else {
                line = DoorWords.removeSentence(for: result)
                _ = await reread()
            }
        case .notTaken:
            line = Copy.removeNotTaken
            _ = await reread()
        case .noAnswer:
            // "As it reads now" is true only of a read that came back.
            line = await reread() ? Copy.endNoAnswer : nil
        case .notSent:
            line = DoorWords.removeSentence(for: result)
            if result.withheld { _ = await reread() }
        }
    }
}

// MARK: - Remove at Catch Me Up's top right (D33)

/// Remove's press, the navigation bar's trailing item on Catch Me Up, in
/// End's place: drawn by `CatchUpPage` beside the trailing item End draws
/// (`EndTopItem`), which draws nothing on a session the Mac offers no End on,
/// so the two never draw at once. A pairing that removes nothing, or a
/// session Remove is not offered on, draws none: the ITEM itself is behind
/// the drawing, so a live session's bar holds End's item alone, exactly as it
/// did before this phase, and no empty item stands beside it.
struct RemoveTopItem: ToolbarContent {
    let model: RemoveModel?
    let offer: PocketEndOffer
    let confirm: PocketEndConfirm?
    let reread: @MainActor () async -> Bool

    var body: some ToolbarContent {
        if let model, let drawing = RemoveDrawing.of(model, offer: offer, confirm: confirm) {
            ToolbarItem(placement: .topBarTrailing) {
                RemoveTopControl(model: model, drawing: drawing, reread: reread)
            }
        }
    }
}

/// The press, the mark beside it while the write runs, and the Mac's
/// confirmation over it. THE PRESS IS A PLAIN BUTTON, its word alone, as
/// End's is (Phase 317's fix round), so it says off when it is drawn off; the
/// mark sits beside it as an element of its own. No glyph: no owner check is
/// asked (D33).
struct RemoveTopControl: View {
    let model: RemoveModel
    let drawing: RemoveDrawing
    let reread: @MainActor () async -> Bool
    /// The Mac's confirmation is up.
    @State private var asking = false

    var body: some View {
        HStack(spacing: 4) {
            if drawing.writing {
                ProgressView()
                    .tint(Tokens.textMuted)
                    .accessibilityIdentifier(ID.removeWriting)
            }
            Button {
                guard drawing.confirm != nil else { return }
                asking = true
            } label: {
                Words(Copy.remove, .body, drawing.row == .on ? Tokens.error : Tokens.textMuted)
                    .lineBox(.body)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(drawing.row == .off)
            .accessibilityIdentifier(ID.sessionRemove)
        }
        .removeConfirmation(model: model, drawing: drawing, isPresented: $asking, reread: reread)
    }
}

// MARK: - Remove in the Terminal's ⋯ menu (D33)

/// Remove as the Terminal's ⋯ menu draws it, in End session…'s place: the
/// Mac's own word, destructive (iOS draws it in the error colour), with no
/// mark beside it, because nothing but the Mac's own question is asked
/// (docs/design/phone/TerminalMenuRemove.html), and drawn off while its write
/// runs. Its press asks for the Mac's confirmation, which the menu's control
/// holds OUTSIDE the menu (`removeConfirmation`), so it presents once the menu
/// has closed. ONE Button, whose own chain says off when it is drawn off.
struct RemoveMenuItem: View {
    let drawing: RemoveDrawing
    /// Ask for the Mac's confirmation.
    let ask: () -> Void

    var body: some View {
        Button(Copy.remove, role: .destructive) {
            ask()
        }
        .disabled(drawing.row == .off)
        .accessibilityIdentifier(ID.terminalMenuRemove)
    }
}

// MARK: - The Mac's confirmation, once

/// The Mac's own Remove confirmation over a Remove press, word for word: its
/// title, its destructive press, which is `RemoveModel.press` and nothing
/// before it, Cancel, and its body. ONE modifier, applied by Catch Me Up's
/// Remove at the top right and by the Terminal's ⋯ menu. The destructive press
/// is drawn only over the Mac's offer while Remove's row is on (the drawing's
/// `confirm`).
struct RemoveConfirmation: ViewModifier {
    let model: RemoveModel?
    let drawing: RemoveDrawing?
    @Binding var isPresented: Bool
    let reread: @MainActor () async -> Bool

    func body(content: Content) -> some View {
        content
            .confirmationDialog(drawing?.confirm?.title ?? Copy.remove, isPresented: $isPresented, titleVisibility: .visible) {
                if let model, let shown = drawing?.confirm {
                    Button(shown.confirmLabel, role: .destructive) {
                        model.press(reread: reread)
                    }
                }
                Button(Copy.cancel, role: .cancel) {}
            } message: {
                if let shown = drawing?.confirm {
                    Text(verbatim: shown.body)
                }
            }
    }
}

extension View {
    /// The Mac's confirmation over Remove's press (`RemoveConfirmation`).
    func removeConfirmation(
        model: RemoveModel?,
        drawing: RemoveDrawing?,
        isPresented: Binding<Bool>,
        reread: @escaping @MainActor () async -> Bool
    ) -> some View {
        modifier(RemoveConfirmation(model: model, drawing: drawing, isPresented: isPresented, reread: reread))
    }
}
