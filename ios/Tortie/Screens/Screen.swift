// The Terminal: one session's own terminal, as the Mac shows it now, typed
// into with every key (Phase 337, build/p337/SPEC.md sections 5.8.3 to 5.8.5),
// and since Phase 337.1 scrolled back through what the session printed, and
// the page a session opens on (build/p3371/SPEC.md D16 to D33).
//
// HIS RULINGS. The session's own screen may be shown and typed into on the
// phone ("Yes, for a session's screen"). It scrolls back ("Yes, scroll back on
// the Screen", which lifts his Phase 316 "the raw terminal scrollback no" for
// it), and tapping a session opens it at once, full screen ("lets do B"), its
// name in the app Terminal. The phone never changes the size of a session on
// his Mac ("Never"): it draws the Mac's width and he zooms, pans or turns the
// phone. Every key, Ctrl-C included, and no Face ID on any ("Every key,
// including Ctrl-C"); no paste ("i don't think we need paste to start"). The
// Mac composes the screen and each page of history, and the phone fetches
// them; no stream and no emulator on the phone ("simple delivery first").
//
// THE POLL (`ScreenModel`). One task, while the Screen is on top and the app
// in the foreground: read with the revision drawn; a new revision draws; an
// `unchanged` answer asks again at once (the Mac held it up to about 10 s);
// a failure keeps the last picture, says `Copy.screenNotAnswering`, and asks
// again after 1, 2, 4, then every 8 s; a
// 404 goes where the Session screen's own refusal goes. It stops when the
// Screen goes away and when the app leaves, and starts again when it comes
// back. While a selection is held the Screen keeps drawing the picture it
// began on, and draws the newest once the selection is copied or cleared.
//
// THE HISTORY (Phase 337.1) is Screens/ScreenScrollback.swift's, drawn by the
// UIKit scroll view of Screens/ScreenScroller.swift; this page holds both,
// feeds the history every picture it draws, and returns it to the live rows
// when he sends a key or presses the back-to-live button.
//
// THE SCREEN KEEPS NONE OF IT (D41). It is not redacted: any redaction would
// move cells off the Mac's. So nothing of it is stored: no file, no log, no
// pasteboard but his own Copy, and no app-switcher picture. iOS photographs
// an app as it leaves the foreground and keeps that picture on the device, so
// whenever the scene is not active this screen draws a plain `--bg-canvas`
// plate over the grid, with no text and no rows (`ScreenCover`,
// conformance:ios rule ao).
//
// LANDSCAPE ON THIS SCREEN ALONE (D27, rule an; D33 of 337.1): it says it is
// on top as it appears and that it is not as it goes, and App/AppDelegate.swift
// answers portrait whenever it is not (App/Orientation.swift), so Catch Me Up
// pushed over the Terminal is portrait.

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

/// The Terminal's page (Phase 337, rebuilt by Phase 337.1, build/p3371/SPEC.md
/// D17, D19, D24, D27, D31 and section 5.5.4): generic over the page that
/// holds it, which hands it the header under the navigation bar (the
/// Terminal's status line), the tray under the terminal (the question's
/// buttons), and the trailing items of its top bar (the Catch Me Up icon, then
/// End). It draws the header, the terminal, the line (D23's words, or the
/// scrollback edge's) and the back-to-live button over the terminal's bottom,
/// the tray while the keyboard is down, and its toolbar: the principal title,
/// Copy while a selection is held and every selected row is drawn, then the
/// trailing items.
///
/// THE KEYBOARD (D24, §Attack B4): the page's ROOT opts out of the keyboard's
/// safe area, ONCE, and nothing inside it does, so the terminal's frame never
/// follows the keyboard; the terminal's own scroll view reads the keyboard's
/// overlap and publishes it here, and the line and the back-to-live button are
/// placed just above it.
struct ScreenPage<Header: View, Tray: View, Trailing: ToolbarContent>: View {
    let model: ScreenModel
    /// The keys, or nil for a pairing that writes nothing.
    let keys: ScreenKeySender?
    let name: String
    let isTop: Bool
    let foregroundTick: Int
    let header: Header
    let tray: Tray
    let trailing: Trailing

    @Environment(\.scenePhase) private var scenePhase
    /// The keyboard is wanted.
    @State private var typing = false
    @State private var selection = ScreenSelectionModel()
    @State private var bar = ScreenKeyBarModel()
    /// What the Terminal holds of the session's history (D25 to D28).
    @State private var scrollback: ScrollbackModel
    /// The keyboard's overlap of the terminal, published by its scroll view.
    @State private var overlap: CGFloat = 0

    init(
        model: ScreenModel,
        keys: ScreenKeySender?,
        name: String,
        isTop: Bool,
        foregroundTick: Int,
        @ViewBuilder header: () -> Header,
        @ViewBuilder tray: () -> Tray,
        @ToolbarContentBuilder trailing: () -> Trailing
    ) {
        self.model = model
        self.keys = keys
        self.name = name
        self.isTop = isTop
        self.foregroundTick = foregroundTick
        self.header = header()
        self.tray = tray()
        self.trailing = trailing()
        _scrollback = State(initialValue: ScrollbackModel(door: model.door))
    }

    var body: some View {
        ZStack {
            Tokens.bgCanvas.ignoresSafeArea()
            VStack(spacing: 0) {
                header
                content
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    .overlay(alignment: .bottom) { bottom }
                // The tray is hidden while the keyboard is wanted as well as
                // while it covers the terminal (the fix round): a tray tall
                // enough to fill the space below the keyboard's top left the
                // terminal itself uncovered, so its overlap read 0 and the
                // tray stayed drawn under the keyboard (iOS 18.3, the fix
                // round's own drive).
                if overlap == 0, !typing {
                    tray
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
        .ignoresSafeArea(.keyboard, edges: .bottom)
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
                if copyDrawn {
                    Button { copySelection() } label: {
                        Words(Copy.copy, .body, Tokens.accent)
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier(ID.screenCopy)
                }
            }
            trailing
        }
        .onAppear {
            OrientationGate.screenOnTop = true
            OrientationGate.apply()
            let (screen, history) = (model, scrollback)
            model.onPicture = { [weak keys, weak screen, weak history] in
                keys?.pictureChanged()
                history?.picture(screen?.picture)
            }
            keys?.onSend = { [weak history] in history?.follow() }
            keys?.resume()
            scrollback.resume()
            model.start()
        }
        .onDisappear {
            OrientationGate.screenOnTop = false
            OrientationGate.apply()
            typing = false
            model.stop()
            keys?.stop()
            scrollback.stop()
        }
        .onChange(of: foregroundTick) {
            guard isTop else { return }
            keys?.resume()
            scrollback.resume()
            model.start()
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .background {
                typing = false
                model.stop()
                scrollback.stop()
            }
        }
        .onChange(of: scrollback.mode) { _, mode in
            // Back to live: a selection over rows of history that are no
            // longer held is let go, never copied half blank (D31).
            if mode == .following, !selection.isEmpty, !scrollback.drawn(selection.range, picture: model.picture) {
                selection.clear()
                scrollback.selecting = false
                model.letGo()
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
            ScreenScroller(
                picture: picture,
                scrollback: scrollback,
                selection: selection.range,
                actions: ScreenScrollerActions(
                    tap: { point in tapped(point, picture: picture) },
                    select: { point, first in selected(point, first: first) },
                    overlap: { overlap = $0 }
                )
            )
        }
    }

    /// The back-to-live button while scrolled back, then the scrollback's
    /// line and the Terminal's own, just above the keyboard's overlap (D24,
    /// D27).
    @ViewBuilder
    private var bottom: some View {
        VStack(alignment: .trailing, spacing: 8) {
            if scrollback.mode == .scrolled {
                Button { scrollback.follow() } label: {
                    Image(systemName: "arrow.down.to.line")
                        .font(.body.weight(.semibold))
                        .foregroundStyle(Tokens.accent)
                        .frame(width: 44, height: 44)
                        .background(Circle().fill(Tokens.bgRaised))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(Text(verbatim: Copy.backToLive))
                .accessibilityIdentifier(ID.screenToLive)
                .padding(.trailing, Frame.gutter)
            }
            if let said = scrollback.line {
                lineView(said, id: ID.screenScrollbackLine)
            }
            if let line = shownLine {
                lineView(line, id: ID.screenLine)
            }
        }
        .padding(.bottom, overlap)
    }

    private func lineView(_ text: String, id: String) -> some View {
        Words(text, .secondary, Tokens.textSecondary, lines: nil)
            .accessibilityIdentifier(id)
            .padding(.horizontal, Frame.gutter)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Tokens.bgCanvas)
    }

    /// The one line under the terminal: a held selection, the Mac not
    /// answering, what the keys came to, or that keys cannot reach the
    /// session now.
    private var shownLine: String? {
        if model.selecting { return Copy.screenHeldWhileSelecting }
        if let line = model.line { return line }
        if let said = keys?.line { return said }
        if keys != nil, let picture = model.picture, !picture.typable { return Copy.screenCannotType }
        return nil
    }

    /// Copy is drawn while a selection is held and every row of it is drawn
    /// (D31): a selection that reaches rows not yet fetched waits for them.
    private var copyDrawn: Bool {
        !selection.isEmpty && scrollback.drawn(selection.range, picture: model.picture)
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
            scrollback.selecting = false
            model.letGo()
        case .focus:
            // Not typable: the keyboard is not raised, and the line says so.
            typing = keys != nil && picture.typable
        case .select, .none:
            break
        }
    }

    /// A long press began a selection, or a drag grew it. Its points are
    /// absolute indices (D31); while it is held the picture is held and no
    /// row of history is evicted.
    private func selected(_ point: ScreenPoint, first: Bool) {
        if first {
            selection.begin(at: point)
            model.hold()
            scrollback.selecting = true
        } else {
            selection.update(to: point)
        }
    }

    /// Copy: the selected text, read by absolute index from the held history
    /// and the live rows, onto the clipboard; the selection cleared, the
    /// newest picture drawn.
    private func copySelection() {
        guard let picture = model.picture, copyDrawn else { return }
        let held = scrollback
        ScreenSelecting.copy(ScreenSelecting.text(selection.range, columns: picture.columns) { held.row(at: $0, picture: picture) })
        selection.clear()
        scrollback.selecting = false
        model.letGo()
    }
}
