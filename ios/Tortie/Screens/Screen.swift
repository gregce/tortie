// The Screen: one session's own terminal screen, as the Mac shows it now,
// typed into with every key (Phase 337, build/p337/SPEC.md sections 5.8.3 to
// 5.8.5).
//
// HIS RULINGS. The session's own screen may be shown and typed into on the
// phone ("Yes, for a session's screen"), reached from inside a session, with
// Conversation still the first row; it is the screen tmux shows NOW and never
// its scrollback. The phone never changes the size of a session on his Mac
// ("Never"): it draws the Mac's width and he zooms, pans or turns the phone.
// Every key, Ctrl-C included, and no Face ID on any ("Every key, including
// Ctrl-C"). The Mac composes the screen and the phone fetches it with a long
// poll; no stream and no emulator on the phone ("simple delivery first").
//
// THE POLL (`ScreenModel`). One task, while the Screen is on top and the app
// in the foreground: read with the revision drawn; a new revision draws; an
// `unchanged` answer asks again at once (the Mac held it up to about 10 s);
// a failure keeps the last picture, says `Your Mac is not answering. This is
// the last screen it sent.`, and asks again after 1, 2, 4, then every 8 s; a
// 404 goes where the Session screen's own refusal goes. It stops when the
// Screen goes away and when the app leaves, and starts again when it comes
// back. While a selection is held the Screen keeps drawing the picture it
// began on, and draws the newest once the selection is copied or cleared.
//
// THE SCREEN KEEPS NONE OF IT (D41). It is not redacted: any redaction would
// move cells off the Mac's. So nothing of it is stored: no file, no log, no
// pasteboard but his own Copy, and no app-switcher picture. iOS photographs
// an app as it leaves the foreground and keeps that picture on the device, so
// whenever the scene is not active this screen draws a plain `--bg-canvas`
// plate over the grid, with no text and no rows (`ScreenCover`,
// conformance:ios rule ao).
//
// LANDSCAPE ON THIS SCREEN ALONE (D27, rule an): it says it is on top as it
// appears and that it is not as it goes, and App/AppDelegate.swift answers
// portrait whenever it is not (App/Orientation.swift).

import SwiftUI

// MARK: - The poll

@MainActor
@Observable
final class ScreenModel {
    enum Phase: Equatable {
        case loading
        case drawn(ScreenPicture)
        /// No screen to draw: the Mac's own sentence (`ended`, `unreachable`,
        /// `large`).
        case absent(String)
        /// Nothing came back and there is no picture to keep.
        case failed(String)
    }

    /// After a failure, the poll asks again after these, the last repeating.
    static let retryWaits: [Duration] = [.seconds(1), .seconds(2), .seconds(4), .seconds(8)]

    let sessionId: String
    private(set) var phase: Phase = .loading
    /// The revision drawn, which the next read holds.
    private(set) var revision: String?
    /// `Your Mac is not answering…` over a kept picture, or nil.
    private(set) var line: String?
    /// A selection holds the picture it began on.
    private(set) var selecting = false
    /// The newest picture, drawn once the selection lets go.
    @ObservationIgnored private var newest: ScreenPicture?
    @ObservationIgnored private(set) var loop: Task<Void, Never>?
    /// Told when a new picture is drawn: the keys' lock reads it.
    @ObservationIgnored var onPicture: (@MainActor () -> Void)?

    let door: any ScreenDoor
    private let routing: ReadRouting

    init(sessionId: String, door: any ScreenDoor, routing: ReadRouting) {
        self.sessionId = sessionId
        self.door = door
        self.routing = routing
    }

    /// The picture on screen: the one a selection holds, or the newest drawn.
    var picture: ScreenPicture? {
        if case .drawn(let drawn) = phase { return drawn }
        return nil
    }

    /// Start the poll, ending one already running.
    func start() {
        loop?.cancel()
        loop = Task { [weak self] in await self?.run() }
    }

    /// Stop the poll, and close the poll's kept connection.
    func stop() {
        loop?.cancel()
        loop = nil
        door.close()
    }

    /// A selection began: the picture drawn now stays until it lets go.
    func hold() {
        selecting = true
    }

    /// The selection was copied or cleared: the newest picture is drawn.
    func letGo() {
        selecting = false
        if let newest {
            self.newest = nil
            draw(newest)
        }
    }

    private func run() async {
        var waits = Self.retryWaits
        while !Task.isCancelled {
            do {
                let answer = try await door.read(since: revision)
                guard !Task.isCancelled else { return }
                waits = Self.retryWaits
                line = nil
                if answer.unchanged { continue }
                revision = answer.revision
                if let screen = answer.screen {
                    let drawn = ScreenPicture(screen, revision: answer.revision)
                    if selecting {
                        newest = drawn
                    } else {
                        draw(drawn)
                    }
                } else {
                    phase = .absent(answer.sentence ?? Copy.answerUnreadable)
                    onPicture?()
                }
            } catch {
                guard !Task.isCancelled, !DoorWords.isCancellation(error) else { return }
                switch DoorWords.consequence(of: error, reading: .oneSession) {
                case .backToList:
                    routing.backToList()
                    return
                case .pairAgain:
                    routing.pairAgain()
                    return
                case .draw(let sentence):
                    if picture == nil {
                        phase = .failed((error as? DoorFailure).map(DoorWords.screenSentence(for:)) ?? sentence)
                    } else {
                        line = Copy.screenNotAnswering
                    }
                }
                let wait = waits.count > 1 ? waits.removeFirst() : waits[0]
                try? await Task.sleep(for: wait)
            }
        }
    }

    private func draw(_ drawn: ScreenPicture) {
        phase = .drawn(drawn)
        onPicture?()
    }
}

// MARK: - The cover

/// The plate drawn over the Screen whenever the scene is not active, so the
/// picture iOS keeps of the app holds nothing of the session (D41): no text,
/// no row and no run.
struct ScreenCover: View {
    /// Whether the cover is drawn for a scene phase: always but when active.
    nonisolated static func drawn(for phase: ScenePhase) -> Bool {
        phase != .active
    }

    var body: some View {
        Rectangle()
            .fill(Tokens.bgCanvas)
            .ignoresSafeArea()
            .accessibilityElement()
            .accessibilityIdentifier(ID.screenCover)
    }
}

// MARK: - The screen

struct ScreenPage: View {
    let model: ScreenModel
    /// The keys, or nil for a pairing that writes nothing.
    let keys: ScreenKeySender?
    let name: String
    let isTop: Bool
    let foregroundTick: Int

    @Environment(\.scenePhase) private var scenePhase
    /// The keyboard is wanted.
    @State private var typing = false
    @State private var selection = ScreenSelectionModel()
    @State private var bar = ScreenKeyBarModel()

    var body: some View {
        ZStack {
            Tokens.bgCanvas.ignoresSafeArea()
            VStack(spacing: 0) {
                content
                if let line = shownLine {
                    Words(line, .secondary, Tokens.textSecondary, lines: nil)
                        .accessibilityIdentifier(ID.screenLine)
                        .padding(.horizontal, Frame.gutter)
                        .padding(.vertical, 8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            if let keys {
                ScreenKeyField(typing: $typing, bar: bar) { items in keys.send(items) }
                    .frame(width: 1, height: 1)
                    .opacity(0.01)
                    .allowsHitTesting(false)
            }
            if ScreenCover.drawn(for: scenePhase) {
                ScreenCover()
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.screen)
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
            ToolbarItem(placement: .topBarTrailing) {
                if !selection.isEmpty {
                    Button { copySelection() } label: {
                        Words(Copy.copy, .body, Tokens.accent)
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier(ID.screenCopy)
                }
            }
        }
        .onAppear {
            OrientationGate.screenOnTop = true
            OrientationGate.apply()
            model.onPicture = { [weak keys] in keys?.pictureChanged() }
            keys?.resume()
            model.start()
        }
        .onDisappear {
            OrientationGate.screenOnTop = false
            OrientationGate.apply()
            typing = false
            model.stop()
            keys?.stop()
        }
        .onChange(of: foregroundTick) {
            guard isTop else { return }
            keys?.resume()
            model.start()
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .background {
                typing = false
                model.stop()
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch model.phase {
        case .loading:
            LoadingView(id: ID.screenLoading)
            Spacer(minLength: 0)
        case .failed(let sentence):
            FailureView(sentence: sentence, id: ID.screenFailure) { model.start() }
            Spacer(minLength: 0)
        case .absent(let sentence):
            Words(sentence, .body, Tokens.textSecondary, lines: nil)
                .accessibilityIdentifier(ID.screenFailure)
                .padding(Frame.gutter)
                .frame(maxWidth: .infinity, alignment: .leading)
            Spacer(minLength: 0)
        case .drawn(let picture):
            ScreenGrid(
                picture: picture,
                selection: selection.range,
                tap: { point in tapped(point, picture: picture) },
                select: { point, first in selected(point, first: first) }
            )
        }
    }

    /// The one line under the grid: a held selection, the Mac not answering,
    /// what the keys came to, or that keys cannot reach the session now.
    private var shownLine: String? {
        if model.selecting { return Copy.screenHeldWhileSelecting }
        if let line = model.line { return line }
        if let said = keys?.line { return said }
        if keys != nil, let picture = model.picture, !picture.typable { return Copy.screenCannotType }
        return nil
    }

    /// A tap: clear a selection, or raise the keyboard (Paseo's release
    /// table), or say that keys cannot reach the session.
    private func tapped(_ point: ScreenPoint?, picture: ScreenPicture) {
        let action = ScreenGesture.release(
            selection.isEmpty ? .pressing : .selecting,
            startedWithSelection: !selection.isEmpty,
            didScroll: false,
            movedBeyondTapTolerance: false,
            pressed: .zero
        )
        switch action {
        case .clear:
            selection.clear()
            model.letGo()
        case .focus:
            // Not typable: the keyboard is not raised, and the line says so.
            typing = keys != nil && picture.typable
        case .select, .none:
            break
        }
    }

    /// A long press began a selection, or a drag grew it.
    private func selected(_ point: ScreenPoint, first: Bool) {
        if first {
            selection.begin(at: point)
            model.hold()
        } else {
            selection.update(to: point)
        }
    }

    /// Copy: the selected text onto the clipboard, the selection cleared, the
    /// newest picture drawn.
    private func copySelection() {
        guard let picture = model.picture else { return }
        ScreenSelecting.copy(ScreenSelecting.text(selection.range, in: picture))
        selection.clear()
        model.letGo()
    }
}
