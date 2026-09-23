// Tortie on the iPhone: a READ-ONLY remote control for the Mac (Phase 316.2).
//
// Three screens he reads, and pairing:
//
//   the list          every session, "Needs your input (n)" then "Everything
//                     else (n)" (his ruling: the phone opens anything)
//   one session       its status, the Catch Me Up line, the two cells, the
//                     last answer
//   the conversation  paged back from the newest turn
//   pairing           the Mac's code, the fingerprint, and his Allow
//
// WHAT IT NEVER DOES. It sends no message and draws no message box or send
// control (Phase 318). It draws no terminal scrollback, ever. It ends,
// restores and removes nothing. It has no timer and no background mode: it
// reads on appear, on return to the foreground and on pull (build/p316/SPEC.md
// section 4.0). Dark only, iPhone, portrait.
//
// THIS FILE COMPOSES and draws nothing of its own: Door/ holds the keys, the
// signature and the one network user, Screens/ draws, and `LiveDoor` below is
// the seam between them (`PhoneDoor`, Screens/DoorWords.swift). A Release build
// of 316.2 has no transport yet (`DoorTransports.shipping` is nil until the
// tailnet node arrives in 316.3), so it holds no reader and says it is not
// paired.

import SwiftUI
import UIKit

@main
struct TortieApp: App {
    @State private var app = AppModel.launch()

    var body: some Scene {
        WindowGroup {
            RootView(app: app)
                .preferredColorScheme(.dark)
                .tint(Tokens.accent)
        }
    }
}

// MARK: - Where the app is

/// A screen pushed over the list.
enum Route: Hashable {
    case session(id: String, name: String)
    /// `honestLine` is the session's own line, drawn when it has no turns.
    case conversation(id: String, honestLine: String?)
}

@MainActor
@Observable
final class AppModel {
    enum Root: Equatable {
        case pairing
        case reading
    }

    private(set) var root: Root
    var path: [Route] = []
    /// Moves each time the app comes back to the foreground; the screen on
    /// top reads again. Not a timer: it moves only when he opens the app.
    private(set) var foregroundTick = 0
    private(set) var list: ListModel?
    private(set) var pairing: PairingModel!
    private(set) var reader: (any DoorReading)?

    private let door: any PhoneDoor
    /// A code handed in at launch (DEBUG only), read once by the first
    /// pairing screen and never again, so a pairing that is later removed
    /// draws the not-paired line rather than retrying a spent code.
    private var launchCode: String?

    init(door: any PhoneDoor, label: String, launchCode: String? = nil) {
        self.door = door
        if let reader = door.pairedReader() {
            root = .reading
            self.reader = reader
            self.launchCode = nil
        } else {
            root = .pairing
            self.launchCode = launchCode
        }
        pairing = PairingModel(door: door, label: label) { [weak self] reader, first in
            self?.paired(reader, first: first)
        }
        if let reader { list = ListModel(door: reader, routing: routing) }
    }

    /// The app as it launches on a phone or in the Simulator.
    static func launch() -> AppModel {
        let door = LiveDoor(store: .keychain, transport: DoorTransports.shipping)
        var launchCode: String?
        #if DEBUG
        // THE DEBUG PAYLOAD INJECTION (S2, conformance:ios rule d). The
        // Simulator has no camera, so the probe hands the Mac's code in as a
        // launch argument, and may ask to start with no pairing kept.
        if PairingDebugSeam.forgetRequested() { door.forget() }
        launchCode = PairingDebugSeam.injectedPayload()
        #endif
        return AppModel(door: door, label: UIDevice.current.name, launchCode: launchCode)
    }

    /// What the screens call when a read means they belong elsewhere.
    var routing: ReadRouting {
        ReadRouting(
            backToList: { [weak self] in self?.backToList() },
            pairAgain: { [weak self] in self?.lostPairing() }
        )
    }

    /// The code handed in at launch, once.
    func takeLaunchCode() -> String? {
        defer { launchCode = nil }
        return launchCode
    }

    func paired(_ reader: any DoorReading, first: PocketBlockedAnswer) {
        self.reader = reader
        let list = ListModel(door: reader, routing: routing)
        list.adopt(first)
        self.list = list
        path = []
        root = .reading
    }

    /// The door no longer knows this iPhone, or there is no pairing: back to
    /// Pairing with the one line. The kept pairing is NOT forgotten here: a
    /// 404 is every refusal the door makes, including one while the Mac is
    /// quitting, and a pairing that still works comes back on the next code.
    func lostPairing() {
        path = []
        list = nil
        reader = nil
        pairing.pairAgain()
        root = .pairing
    }

    /// The door refused a read about one session. The list reads again on
    /// appear, and it is the truth about what is still there.
    func backToList() {
        path = []
    }

    func cameToForeground() {
        foregroundTick += 1
        if root == .pairing, let reader = door.pairedReader() {
            // A pairing the door had refused (a quit, a Remove then a new
            // Allow) is tried again when he opens the app.
            self.reader = reader
            list = ListModel(door: reader, routing: routing)
            root = .reading
        }
    }

    func open(_ row: RowDrawing) {
        path.append(.session(id: row.id, name: row.name))
    }

    func openConversation(_ sessionId: String, honestLine: String?) {
        path.append(.conversation(id: sessionId, honestLine: honestLine))
    }

    func isTop(_ route: Route?) -> Bool {
        path.last == route
    }
}

// MARK: - The root

struct RootView: View {
    @Bindable var app: AppModel
    @Environment(\.scenePhase) private var scenePhase
    @State private var wasAway = false

    var body: some View {
        Group {
            switch app.root {
            case .pairing:
                PairingScreen(model: app.pairing)
                    .task {
                        if let code = app.takeLaunchCode() {
                            await app.pairing.read(code)
                        }
                    }
            case .reading:
                if let list = app.list, let reader = app.reader {
                    NavigationStack(path: $app.path) {
                        ListScreen(
                            model: list,
                            isTop: app.path.isEmpty,
                            foregroundTick: app.foregroundTick,
                            open: { app.open($0) }
                        )
                        .navigationDestination(for: Route.self) { route in
                            destination(route, reader: reader)
                        }
                    }
                }
            }
        }
        .background(Tokens.bgSidebar.ignoresSafeArea())
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .background:
                wasAway = true
            case .active where wasAway:
                wasAway = false
                app.cameToForeground()
            default:
                break
            }
        }
    }

    @ViewBuilder
    private func destination(_ route: Route, reader: any DoorReading) -> some View {
        switch route {
        case .session(let id, let name):
            SessionRoute(
                id: id, name: name, reader: reader, routing: app.routing,
                isTop: app.isTop(route), foregroundTick: app.foregroundTick
            ) { honestLine in
                app.openConversation(id, honestLine: honestLine)
            }
        case .conversation(let id, let honestLine):
            ConversationRoute(
                id: id, honestLine: honestLine, reader: reader, routing: app.routing,
                isTop: app.isTop(route), foregroundTick: app.foregroundTick
            )
        }
    }
}

/// Holds one session screen's model for as long as the screen is pushed.
private struct SessionRoute: View {
    @State private var model: SessionModel
    let name: String
    let isTop: Bool
    let foregroundTick: Int
    let openConversation: (String?) -> Void

    init(
        id: String, name: String, reader: any DoorReading, routing: ReadRouting,
        isTop: Bool, foregroundTick: Int, openConversation: @escaping (String?) -> Void
    ) {
        _model = State(initialValue: SessionModel(sessionId: id, door: reader, routing: routing))
        self.name = name
        self.isTop = isTop
        self.foregroundTick = foregroundTick
        self.openConversation = openConversation
    }

    var body: some View {
        SessionScreen(
            model: model, name: name, isTop: isTop, foregroundTick: foregroundTick,
            openConversation: openConversation
        )
    }
}

/// Holds one conversation's model, and every page it read, while it is pushed.
private struct ConversationRoute: View {
    @State private var model: ConversationModel
    let honestLine: String?
    let isTop: Bool
    let foregroundTick: Int

    init(
        id: String, honestLine: String?, reader: any DoorReading, routing: ReadRouting,
        isTop: Bool, foregroundTick: Int
    ) {
        _model = State(initialValue: ConversationModel(sessionId: id, door: reader, routing: routing))
        self.honestLine = honestLine
        self.isTop = isTop
        self.foregroundTick = foregroundTick
    }

    var body: some View {
        ConversationScreen(model: model, honestLine: honestLine, isTop: isTop, foregroundTick: foregroundTick)
    }
}

// MARK: - The seam to Door/

/// The kept pairing's three reads, through the one network user.
struct PairedReader: DoorReading {
    let client: DoorClient
    let door: PairedDoor

    func blocked() async throws -> PocketBlockedAnswer {
        try await client.blocked(door)
    }

    func session(_ sessionId: String) async throws -> PocketSessionAnswer {
        try await client.session(sessionId, door: door)
    }

    func turns(_ sessionId: String, to: Int?) async throws -> PocketTurnsAnswer {
        try await client.turns(sessionId, to: to, door: door)
    }
}

/// Door/ as the app uses it. With no transport (a Release build of 316.2)
/// there is no client: nothing is read and nothing pairs.
struct LiveDoor: PhoneDoor {
    let store: PairingStore
    let client: DoorClient?

    init(store: PairingStore, transport: DoorTransport?) {
        self.store = store
        client = transport.map { DoorClient(transport: $0) }
    }

    func pairedReader() -> (any DoorReading)? {
        guard let client, let door = store.load() else { return nil }
        return PairedReader(client: client, door: door)
    }

    func begin(payload: String, label: String) throws -> PendingPairing {
        guard let client else { throw PairingFailure.notAvailable }
        let offer = try PairingOffer.parse(payload)
        return PairingFlow(exchange: client, store: store).begin(offer, label: label)
    }

    func pair(_ pending: PendingPairing, progress: @escaping @Sendable (PairingStep) -> Void) async -> PairResult {
        guard let client else { return .failed(.notAvailable) }
        switch await PairingFlow(exchange: client, store: store).run(pending, progress: progress) {
        case .paired(let door, let first):
            return .paired(PairedReader(client: client, door: door), first)
        case .failed(let failure):
            return .failed(failure)
        }
    }

    func forget() {
        try? store.forget()
    }
}
