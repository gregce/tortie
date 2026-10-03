// Tortie on the iPhone: a READ-ONLY remote control for the Mac (Phase 316.2).
//
// The screens he reads, and pairing:
//
//   the list          every session, "Needs your input (n)" then "Everything
//                     else (n)" (his ruling: the phone opens anything)
//   one session       its status, the Catch Me Up line, the two cells, the
//                     last answer
//   the conversation  paged back from the newest turn
//   pairing           the Mac's code, the fingerprint, and his Allow
//
// THREE TABS since Phase 316.6 (build/p3166/SPEC.md section 5.1): Needs input
// (the list's first section alone, with the Mac's amber count badge), Sessions
// (the list above) and Settings (the paired Mac, what iOS allows for alerts,
// the version, and Unpair this iPhone). Each tab is its own navigation stack,
// so each keeps its place, and the bar stays under a pushed session. The app
// opens on Needs input every launch and stores no tab. One read of the list
// feeds both list tabs and the badge. Unpair forgets the pairing on the phone
// (the record first, then every client key), and in a Release build tells
// Apple to stop taking alerts for this install; the Mac's half is Phase 317's.
//
// And since Phase 316.5, the alert: a tap on one opens the session it names
// (`Route.alerted`), or the list with the Mac's own sentence when the Mac no
// longer has that session; and a phone paired with a Mac that can send, whose
// alert address is not the one that Mac holds, says `Pair again to get
// alerts.` on the list (Alerts/Alerts.swift). A phone paired with a Mac that
// cannot send asks iOS nothing and says nothing about alerts.
//
// WHAT IT NEVER DOES. It sends no message and draws no message box or send
// control (Phase 318). It draws no terminal scrollback, ever. It ends,
// restores and removes nothing. It has no timer and no background mode: it
// reads on appear, on return to the foreground and on pull (build/p316/SPEC.md
// section 4.0), and an alert that arrives while it is open refreshes nothing.
// Dark only, iPhone, portrait.
//
// THIS FILE COMPOSES and draws nothing of its own: Door/ holds the keys, the
// signature and the one network user, Screens/ draws, and `LiveDoor` below is
// the seam between them (`PhoneDoor`, Screens/DoorWords.swift). Since Phase
// 330 the phone reaches the Mac's public name as an ordinary pinned TLS client
// (Door/DoorClient.swift), with no network of its own to start or stop.

import SwiftUI
import UIKit

@main
struct TortieApp: App {
    /// Where iOS hands over the alert address and the taps (App/AppDelegate.swift).
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @State private var app = AppModel.launch()

    init() {
        // The badge's two colours, once, before the first tab bar exists
        // (Style/Tokens.swift, the one file that writes a colour).
        TabBarLook.apply()
    }

    var body: some Scene {
        WindowGroup {
            RootView(app: app)
                .preferredColorScheme(.dark)
                .tint(Tokens.accent)
        }
    }
}

// MARK: - Where the app is

/// The three tabs, in the bar's order. A fourth would be search, Past Sessions
/// or machines, and Phase 316 refuses each on the phone.
enum AppTab: Hashable, Sendable {
    case needsInput
    case sessions
    case settings
}

/// A screen pushed over a list.
enum Route: Hashable {
    case session(id: String, name: String)
    /// `honestLine` is the session's own line, drawn when it has no turns.
    case conversation(id: String, honestLine: String?)
    /// The session an alert named, opened by a tap. Drawn as `session`, with
    /// no name until the door answers, and a refusal says the Mac's own
    /// sentence for a session it no longer has (SPEC section 5.6.4).
    case alerted(id: String)
}

@MainActor
@Observable
final class AppModel {
    enum Root: Equatable {
        case pairing
        case reading
    }

    private(set) var root: Root
    /// The tab on screen. Needs input every launch, and never stored.
    var tab: AppTab = .needsInput
    /// What is pushed over the Needs input tab's list.
    var waitingPath: [Route] = []
    /// What is pushed over the Sessions tab's list. Settings pushes nothing
    /// (Unpair's question and a link's address are sheets), so it has no path.
    var sessionsPath: [Route] = []
    /// Moves each time the app comes back to the foreground; the screen on
    /// top of the tab on screen reads again. Not a timer: it moves only when
    /// he opens the app.
    private(set) var foregroundTick = 0
    /// ONE list model for both list tabs and the badge, so all three are
    /// always one answer.
    private(set) var list: ListModel?
    private(set) var pairing: PairingModel!
    private(set) var reader: (any DoorReading)?
    /// What iOS allows for alerts, for Settings: read only for a pairing
    /// whose Mac said it could send (`readAlertPermission`), nil until then.
    private(set) var alertPermission: PushAuthorization?
    /// The sentence under Unpair this iPhone when the phone could not forget.
    private(set) var settingsLine: String?
    /// The list's read that says the Mac's sentence about a gone session, and
    /// the alert-address check a pairing starts, held so a test can wait for
    /// them. Neither is drawn from.
    @ObservationIgnored private(set) var noticeRead: Task<Void, Never>?
    @ObservationIgnored private(set) var addressCheck: Task<Void, Never>?
    /// The permission read a return to the foreground starts, and Unpair's
    /// `forgetAddress()`, held so a test can wait for them.
    @ObservationIgnored private(set) var permissionRead: Task<Void, Never>?
    @ObservationIgnored private(set) var forgetting: Task<Void, Never>?

    private let door: any PhoneDoor
    /// What the app asks iOS about alerts (Alerts/SystemAlerts.swift).
    private let alerts: any PushAddressing
    /// A code handed in at launch (DEBUG only), read once by the first
    /// pairing screen and never again, so a pairing that is later removed
    /// draws the not-paired line rather than retrying a spent code.
    private var launchCode: String?

    init(door: any PhoneDoor, label: String, alerts: any PushAddressing, launchCode: String? = nil) {
        self.door = door
        self.alerts = alerts
        if let reader = door.pairedReader() {
            root = .reading
            self.reader = reader
            self.launchCode = nil
        } else {
            root = .pairing
            self.launchCode = launchCode
        }
        pairing = PairingModel(door: door, label: label, alerts: alerts) { [weak self] reader, first in
            self?.paired(reader, first: first)
        }
        if let reader { list = ListModel(door: reader, routing: listRouting) }
    }

    /// The app as it launches on a phone or in the Simulator.
    static func launch() -> AppModel {
        // A fresh install forgets a pairing an earlier install left in the
        // Keychain, before anything reads it: the Keychain outlives the app's
        // deletion, and a pairing a person deleted with the app must not come
        // back with it (Door/Keys.swift, `forgetOnFreshInstall`).
        if let mark = try? InstallMark.standard() {
            PairingStore.keychain.forgetOnFreshInstall(mark)
        }
        let door = LiveDoor(store: .keychain, transport: DoorTransports.shipping)
        var launchCode: String?
        #if DEBUG
        // THE DEBUG PAYLOAD INJECTION (S2, conformance:ios rule d). The
        // Simulator has no camera, so the probe hands the Mac's code in as a
        // launch argument, and may ask to start with no pairing kept.
        if PairingDebugSeam.forgetRequested() { door.forget() }
        launchCode = PairingDebugSeam.injectedPayload()
        #endif
        return AppModel(door: door, label: UIDevice.current.name, alerts: SystemPushAddressing.shared, launchCode: launchCode)
    }

    /// What a screen pushed over `tab`'s list calls when a read means it
    /// belongs elsewhere: a refusal about one session pops THAT tab to its
    /// list, and the door no longer knowing this iPhone goes to Pairing.
    func routing(_ tab: AppTab) -> ReadRouting {
        ReadRouting(
            backToList: { [weak self] in self?.backToList(in: tab) },
            pairAgain: { [weak self] in self?.lostPairing() }
        )
    }

    /// The list's own: a refused list is a phone the door no longer knows, so
    /// it only ever goes to Pairing (DoorWords, `ReadKind.list`).
    private var listRouting: ReadRouting {
        ReadRouting(backToList: {}, pairAgain: { [weak self] in self?.lostPairing() })
    }

    /// The same for the session an alert opened, which is pushed on the Needs
    /// input tab: a refusal about it goes back to that list with the Mac's own
    /// sentence for a session it no longer has.
    var alertedRouting: ReadRouting {
        ReadRouting(
            backToList: { [weak self] in self?.backToList(saying: Copy.noSuchSession) },
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
        let list = ListModel(door: reader, routing: listRouting)
        list.adopt(first)
        self.list = list
        startOver()
        root = .reading
        // The launch's check, at once (the 316.5 fix round): an Allow pressed
        // on the Mac while iOS was still asking pairs with no address, and
        // the list says `Pair again to get alerts.` now, not at the next launch.
        addressCheck = Task { [weak self] in await self?.checkAlertAddress() }
    }

    /// The door no longer knows this iPhone, or there is no pairing: back to
    /// Pairing with the one line. The kept pairing is NOT forgotten here: a
    /// 404 is every refusal the door makes, including one while the Mac is
    /// quitting, and a pairing that still works comes back on the next code.
    func lostPairing() {
        startOver()
        list = nil
        reader = nil
        pairing.pairAgain()
        root = .pairing
    }

    /// Nothing pushed on either tab, Needs input on screen, and nothing said
    /// about a pairing that is not this one.
    private func startOver() {
        waitingPath = []
        sessionsPath = []
        tab = .needsInput
        alertPermission = nil
        settingsLine = nil
    }

    /// The door refused a read about one session on `tab`. That tab's list
    /// reads again on appear, and it is the truth about what is still there;
    /// the other tab keeps its place.
    private func backToList(in tab: AppTab) {
        switch tab {
        case .needsInput: waitingPath = []
        case .sessions: sessionsPath = []
        case .settings: break
        }
    }

    /// The door refused a read about the session an alert opened. The list
    /// says `sentence` once a read of its own answers, and that read is asked
    /// for HERE rather than left to the list appearing again: a door answers
    /// the 404 in milliseconds, and a list whose push never finished never
    /// left the screen, so it reads nothing on appear (the 316.5 fix round).
    /// A list the door refuses too is a phone it no longer knows, which goes
    /// to Pairing, so the sentence is never said over an unpaired phone.
    func backToList(saying sentence: String) {
        waitingPath = []
        guard let list else { return }
        list.sayAfterRead(sentence)
        noticeRead = Task { await list.load() }
    }

    /// He left the app: the Mac's sentence about a session it no longer has
    /// goes now, so it is not there when he comes back. It is NOT cleared on
    /// the way back in. A tap on an alert is what brings the app back, iOS
    /// hands the tap over before the scene is active, and a sentence that tap
    /// produced was cleared by the return it arrived with: five taps of five
    /// on iOS 26.3 drew the list with no sentence (the 316.5 fix round).
    func wentAway() {
        list?.clearNotice()
    }

    /// He came back: the screen on top of the tab on screen reads again, a
    /// pairing the door had refused is tried again, and what iOS allows for
    /// alerts is read again, since he may have changed it in iOS Settings.
    func cameToForeground() {
        foregroundTick += 1
        readKeptPairing()
        permissionRead = Task { [weak self] in await self?.readAlertPermission() }
    }

    /// A pairing the door had refused (a quit, a Remove then a new Allow) is
    /// tried again when he opens the app, or taps an alert.
    private func readKeptPairing() {
        guard root == .pairing, let reader = door.pairedReader() else { return }
        self.reader = reader
        list = ListModel(door: reader, routing: listRouting)
        root = .reading
    }

    /// A row tapped on `tab`'s list opens that session on that tab.
    func open(_ row: RowDrawing, in tab: AppTab) {
        list?.clearNotice()
        push(.session(id: row.id, name: row.name), on: tab)
    }

    /// A tap on an alert. With no pairing kept, Pairing stays; with one, the
    /// app reads, Needs input comes on screen, and the tap replaces whatever
    /// was pushed there: its list, or the one session the alert named. The
    /// Sessions tab keeps its place.
    func openFromAlert(_ tap: AlertTap) {
        readKeptPairing()
        guard root == .reading, let list else { return }
        list.clearNotice()
        tab = .needsInput
        switch tap {
        case .list:
            waitingPath = []
        case .session(let id):
            waitingPath = [.alerted(id: id)]
        }
    }

    /// Once a launch, with a pairing kept: whether this phone's alert address
    /// is the one the Mac holds (Alerts/Alerts.swift, `AlertLine`). Only for a
    /// pairing whose Mac said it could send: with any other, iOS is asked
    /// nothing and the line is never drawn (research 136 section 9). Its
    /// address is asked only when alerts are allowed, which in a Release build
    /// is when it registers with Apple, as Apple asks an app to on every launch.
    func checkAlertAddress() async {
        guard root == .reading, let reader, let list else { return }
        let kept = reader.alerts
        guard kept.macSends else {
            list.alertsLine = nil
            return
        }
        let authorization = await alerts.authorization()
        let current = authorization == .authorized ? await alerts.currentAddress() : nil
        let shows = AlertLine.shows(kept: kept, authorization: authorization, current: current)
        list.alertsLine = shows ? Copy.pairAgainForAlerts : nil
    }

    /// What iOS allows for alerts, for Settings: asked only for a pairing
    /// whose Mac said it could send (research 136 section 9), so a phone
    /// paired with any other Mac asks iOS nothing. On Settings' appear and on
    /// every return to the foreground. Asking is not registering: nothing
    /// here speaks to Apple.
    func readAlertPermission() async {
        guard root == .reading, let reader, reader.alerts.macSends else {
            alertPermission = nil
            return
        }
        alertPermission = await alerts.authorization()
    }

    /// Unpair this iPhone, after he confirmed it (build/p3166/SPEC.md section
    /// 5.4). The record goes first; if it stays, nothing else was touched and
    /// Settings says so. If it went, Apple is told to stop taking alerts for
    /// this install (Release only), and the app goes back to Pairing with its
    /// not-paired line. The Mac lists this iPhone until he presses Remove.
    func unpair() {
        guard root == .reading else { return }
        switch door.unpair() {
        case .kept:
            settingsLine = Copy.unpairFailed
        case .forgotten:
            settingsLine = nil
            forgetting = Task { await alerts.forgetAddress() }
            lostPairing()
        }
    }

    /// The conversation, opened from a session on `tab`.
    func openConversation(_ sessionId: String, honestLine: String?, in tab: AppTab) {
        push(.conversation(id: sessionId, honestLine: honestLine), on: tab)
    }

    /// Whether `route` is the screen a person is looking at: `tab` is on
    /// screen and `route` is on top of it (nil for its list).
    func isTop(_ route: Route?, in tab: AppTab) -> Bool {
        self.tab == tab && path(tab).last == route
    }

    /// Whether `tab`'s list is the screen a person is looking at.
    func listIsTop(_ tab: AppTab) -> Bool {
        self.tab == tab && path(tab).isEmpty
    }

    /// The number on the Needs input tab: the count of the rows the door's
    /// last loaded answer called waiting, the same array that tab draws, so
    /// the badge and the list never disagree. Zero, which draws no badge,
    /// while nothing is loaded or the read failed. A count, never arithmetic
    /// on a status.
    var waitingBadge: Int {
        guard case .loaded(let drawing)? = list?.state else { return 0 }
        return drawing.waiting.count
    }

    private func path(_ tab: AppTab) -> [Route] {
        switch tab {
        case .needsInput: waitingPath
        case .sessions: sessionsPath
        case .settings: []
        }
    }

    private func push(_ route: Route, on tab: AppTab) {
        switch tab {
        case .needsInput: waitingPath.append(route)
        case .sessions: sessionsPath.append(route)
        case .settings: break
        }
    }
}

/// `dump` and `Mirror` would show `launchCode`, the code handed in at launch,
/// which carries the one-shot secret: the model mirrors itself with nothing in
/// it (conformance:ios rule p).
extension AppModel: CustomReflectable {
    nonisolated var customMirror: Mirror { Mirror(self, children: [:], displayStyle: .class) }
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
                    tabs(list: list, reader: reader)
                }
            }
        }
        .background(Tokens.bgSidebar.ignoresSafeArea())
        // Once a launch: is the alert address the Mac holds this phone's?
        .task { await app.checkAlertAddress() }
        // Each tap, exactly once, including the one that launched the app,
        // which can be posted before this view is first drawn.
        .onChange(of: AlertInbox.shared.pending, initial: true) {
            if let tap = AlertInbox.shared.take() { app.openFromAlert(tap) }
        }
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .background:
                wasAway = true
                app.wentAway()
            case .active where wasAway:
                wasAway = false
                app.cameToForeground()
            default:
                break
            }
        }
    }

    /// The three tabs, each its own stack (build/p3166/SPEC.md section
    /// 5.1.1). Nothing hides the bar: it stays under a pushed session, so a
    /// session is one tap from Needs input. `.badge(0)` draws no badge.
    private func tabs(list: ListModel, reader: any DoorReading) -> some View {
        TabView(selection: $app.tab) {
            Tab(Copy.needsInput, systemImage: "bell", value: AppTab.needsInput) {
                NavigationStack(path: $app.waitingPath) {
                    listScreen(list, kind: .needsInput, tab: .needsInput)
                        .navigationDestination(for: Route.self) { route in
                            destination(route, reader: reader, tab: .needsInput)
                        }
                }
            }
            .badge(app.waitingBadge)
            Tab(Copy.sessions, systemImage: "list.bullet", value: AppTab.sessions) {
                NavigationStack(path: $app.sessionsPath) {
                    listScreen(list, kind: .sessions, tab: .sessions)
                        .navigationDestination(for: Route.self) { route in
                            destination(route, reader: reader, tab: .sessions)
                        }
                }
            }
            Tab(Copy.settings, systemImage: "gearshape", value: AppTab.settings) {
                NavigationStack {
                    SettingsScreen(app: app)
                }
            }
        }
        // The one way out of the app for an address an answer names
        // (Markdown/Links.swift), applied once, to the reading root.
        .linkGate()
    }

    private func listScreen(_ list: ListModel, kind: ListKind, tab: AppTab) -> some View {
        ListScreen(
            model: list,
            kind: kind,
            isTop: app.listIsTop(tab),
            foregroundTick: app.foregroundTick,
            open: { app.open($0, in: tab) }
        )
    }

    @ViewBuilder
    private func destination(_ route: Route, reader: any DoorReading, tab: AppTab) -> some View {
        switch route {
        case .session(let id, let name):
            SessionRoute(
                id: id, name: name, reader: reader, routing: app.routing(tab),
                isTop: app.isTop(route, in: tab), foregroundTick: app.foregroundTick
            ) { honestLine in
                app.openConversation(id, honestLine: honestLine, in: tab)
            }
        case .conversation(let id, let honestLine):
            ConversationRoute(
                id: id, honestLine: honestLine, reader: reader, routing: app.routing(tab),
                isTop: app.isTop(route, in: tab), foregroundTick: app.foregroundTick
            )
        case .alerted(let id):
            SessionRoute(
                id: id, name: "", reader: reader, routing: app.alertedRouting,
                isTop: app.isTop(route, in: tab), foregroundTick: app.foregroundTick
            ) { honestLine in
                app.openConversation(id, honestLine: honestLine, in: tab)
            }
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

    var alerts: AlertsKept {
        door.alerts
    }

    /// Settings' facts, from the pairing in memory: no Keychain read.
    var facts: PairedFacts {
        PairedFacts(door)
    }

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

/// Door/ as the app uses it: the one network user over the transport this
/// build ships with, the kept pairing, and the client keys.
struct LiveDoor: PhoneDoor {
    let store: PairingStore
    let client: DoorClient

    init(store: PairingStore, transport: DoorTransport) {
        self.store = store
        client = DoorClient(transport: transport)
    }

    private var flow: PairingFlow {
        PairingFlow(exchange: client, store: store)
    }

    /// The kept pairing's reads, or nil when there is none or it no longer
    /// reads back whole.
    func pairedReader() -> (any DoorReading)? {
        guard let door = store.load() else { return nil }
        return PairedReader(client: client, door: door)
    }

    func begin(payload: String, label: String) throws -> PendingPairing {
        let offer = try PairingOffer.parse(payload)
        return try flow.begin(offer, label: label)
    }

    func pair(
        _ pending: PendingPairing,
        askForAlerts: @escaping @Sendable () async -> PushAddress?,
        progress: @escaping @Sendable (PairingStep) -> Void
    ) async -> PairResult {
        switch await flow.run(pending, askForAlerts: askForAlerts, progress: progress) {
        case .paired(let door, let first):
            return .paired(PairedReader(client: client, door: door), first)
        case .failed(let failure):
            return .failed(failure)
        }
    }

    /// The DEBUG forget seam's. Unchanged, and NOT Unpair's: it swallows a
    /// failure, which Unpair must not.
    func forget() {
        try? store.forget()
    }

    /// Unpair this iPhone: the store forgets the record first, then every
    /// client key. A record whose removal throws, or that still reads back
    /// (or cannot be read), is `.kept`, and the screen says nothing changed.
    func unpair() -> UnpairOutcome {
        do {
            try store.forget()
        } catch {
            return .kept
        }
        return store.holdsRecord ? .kept : .forgotten
    }
}
