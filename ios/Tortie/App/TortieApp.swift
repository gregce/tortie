// Tortie on the iPhone: a READ-ONLY remote control for the Mac (Phase 316.2).
//
// The screens he reads, and pairing:
//
//   the list          every session, "Needs your input (n)" then "Everything
//                     else (n)" (his ruling: the phone opens anything)
//   one session       its Terminal, or Catch Me Up when it has none (since
//                     Phase 337.1, below)
//   Catch Me Up       the conversation paged back from the newest turn, then
//                     where the session stands now: its status, the Catch Me
//                     Up card, the options, the two cells
//   pairing           the Mac's code, the fingerprint, and his Allow
//
// THREE TABS since Phase 316.6 (build/p3166/SPEC.md section 5.1): Needs input
// (the list's first section alone, with the Mac's amber count badge), Sessions
// (the list above) and Settings (the paired Mac, what iOS allows for alerts,
// the version, and Unpair this iPhone). Each tab is its own navigation stack,
// so each keeps its place, and the bar stays under a pushed session. The app
// opens on Needs input every launch and stores no tab. One read of the list
// feeds the Needs input tab and the badge (and, until Phase 316.7, the
// Sessions tab, which now has a read of its own beside it). Unpair forgets
// the pairing on the phone (the record first, then every client key), and in
// a Release build tells Apple to stop taking alerts for this install; the
// Mac's half is not built (Phase 317's fix round took it out, because waiting
// on it made Unpair slower than today when the Mac did not answer).
//
// And since Phase 316.5, the alert: a tap on one opens the session it names
// (`Route.alerted`), or the list with the Mac's own sentence when the Mac no
// longer has that session; and a phone paired with a Mac that can send, whose
// alert address is not the one that Mac holds, says `Pair again to get
// alerts.` on the list (Alerts/Alerts.swift). A phone paired with a Mac that
// cannot send asks iOS nothing and says nothing about alerts.
//
// SINCE PHASE 316.7 the Sessions tab is every session Tortie lists, shown,
// grouped and sorted as the phone asks and composed in main
// (Screens/SessionsScreen.swift): its own model reads `/v1/sessions` beside
// the list's read, keeps Show, Group by and Sort by across launches, and
// against a Mac older than that phase draws the list above, as it was.
//
// AND SINCE PHASE 317, END (build/p317/SPEC.md section 5.8): a session the
// Mac offers End for ends from its screen, and End these from the Sessions
// tab, each only after Face ID, Touch ID or the passcode (App/OwnerCheck.swift)
// and each through the Mac's own two gates. The app keeps every live End's
// runner and stops each one when it goes to the background, which withholds a
// write whose bytes were not yet handed (`wentAway`).
//
// AND SINCE PHASE 318, REPLY (build/p318/SPEC.md section 5.7): an option the
// Mac offers to press is a button on the session's screen, and a Claude Code
// or Codex session waiting at its own empty prompt takes one message from a
// box at the foot of the session's page. Neither asks Face ID (his ruling,
// "Only for End"). The app keeps every live reply's runner too and stops each
// one on the way to the background, the same way.
//
// AND SINCE PHASE 337, THE SCREEN (build/p337/SPEC.md section 5.8): a running
// session's own screen as his Mac shows it now, at the Mac's width, read by a
// long poll and typed into with every key, Ctrl-C included, and no Face ID
// (his rulings 1 to 4). End moved to the top right. The app keeps every live
// key sender and stops each one on the way to the background: keys waiting
// are dropped, a keys write not yet handed is withheld, and the screen's kept
// connections close.
//
// AND SINCE PHASE 337.1, TERMINAL FIRST (build/p3371/SPEC.md D16 to D23, his
// ruling "lets do B"): tapping a session opens its TERMINAL at once, full
// screen, with one status line under its name, the numbered question's
// options under it, and Catch Me Up and End at the top right (one ⋯ menu
// since Phase 337.3, below); the terminal scrolls back through what the
// session printed ("Yes, scroll back on the Screen"). A session with no
// terminal, an ended one or one on a Mac older than Phase 337, opens on CATCH
// ME UP, the conversation renamed ("Yes, rename it") with where the session
// stands now after its newest turn. The face is decided at the session's
// first answer and kept (`SessionRoute`).
//
// AND SINCE PHASE 337.3, THE TERMINAL FILLS THE PHONE (build/p3373/SPEC.md):
// upright it opens on what the session printed, its live rows at the bottom
// with earlier output above them; turned sideways it is the terminal alone,
// with no bar above or below it until it is turned upright again; and one ⋯
// at its top right holds Catch Me Up, then End session…, End still behind
// Face ID, Touch ID or the passcode.
//
// AND SINCE PHASE 333.3, SEE A SAMPLE (build/p3333/SPEC.md D1, D13 to D19):
// under Scan code, and in Settings for a paired phone, made-up sessions from a
// file inside the app (Sample/sample.json, composed by the Mac's own code),
// opened and answered, typed into and ended as any session is. Every page says
// Sample in one strip above the tabs; nothing in it leaves the phone, reads or
// writes the Keychain, or is kept, and the paired reads stop while it is open.
// Leave sample returns to where See a sample was pressed: Pairing as it was,
// or the paired Mac's lists with the pairing untouched.
//
// WHAT IT NEVER DOES. It types nothing he did not press, write or type; it
// offers no message box while the agent works, asks him something or holds
// words typed at the Mac (the Mac decides, and asks again when the write
// arrives); and it retries or stores no write. It keeps no line of a
// terminal past the Terminal it is drawn on, pastes nothing, and never changes
// the size of a session on the Mac. It restores and removes nothing, and it
// ends a session only on his press, his confirmation and his face, finger or
// passcode. It has no background mode: it reads on appear, on return to the
// foreground and on pull (build/p316/SPEC.md section 4.0), the Terminal alone
// polls while it is on top, and an alert that arrives while it is open
// refreshes nothing. Nothing keeps it running to finish a write. Dark only,
// iPhone, portrait but for the Terminal.
//
// AND SINCE PHASE 345, SEVERAL MACS (build/p345/SPEC.md; his answers of
// 2026-10-14). One iPhone pairs with up to four Macs, from Settings' Pair
// another Mac, without unpairing the first. Each Mac is its own space
// (`MacSpace`): its list, its Sessions model and where each tab was pushed
// to, and the app draws ONE at a time, "like they are completely separate".
// With two or more kept, a fourth tab at the right of the bar, named after
// the Mac on screen, lists them and switches with one tap; its badge counts
// what waits on the Macs not on screen. Every pushed route names its Mac and
// reads through that Mac's reader alone. A Mac that refuses this phone blanks
// its own space and no other; Unpair forgets the Mac on screen; an alert
// opens its session on the one Mac that sends them. With ONE Mac kept every
// screen draws as before, but for Settings' one new row; and, as before, a
// pairing made on the Pairing screen that one Mac's refusal put him on takes
// that Mac's place rather than standing beside it (the fix round, D18a).
//
// AND SINCE PHASE 346, NEW SESSION (build/p346/SPEC.md; his answers of
// 2026-10-14). The Sessions tab of the Mac on screen draws a "+" while that
// Mac offers a start, and New session starts ONE session there, in a project
// open in Tortie on that Mac or one of its machines, with one of the agents
// installed there; a done start opens its Terminal on that Mac's Sessions tab
// (`openStarted`). No Face ID (his answer 5). The app keeps every live start's
// runner and stops each one on the way to the background, and each Mac keeps
// at most one start whose answer did not come, in memory, forgotten when the
// app leaves (`MacSpace.keptStart`).
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

/// The tabs, in the bar's order: the three every phone has, and since Phase
/// 345 the Macs tab at the right, drawn only while two or more Macs are kept
/// (build/p345/SPEC.md D3). Search and Past Sessions stay refused on the
/// phone (Phase 316).
enum AppTab: Hashable, Sendable {
    case needsInput
    case sessions
    case settings
    /// Every Mac kept, and one tap to switch (Screens/MacsScreen.swift).
    case macs
}

/// A screen pushed over a list. Every route carries the Mac whose list drew
/// the row it opens (Phase 345, D13): its reads and writes go to THAT Mac's
/// reader, looked up by the Mac's whole public name, and never by matching a
/// session id across Macs.
enum Route: Hashable {
    /// One session: its Terminal, or Catch Me Up when it has none (Phase
    /// 337.1, D16), decided at its first answer.
    case session(mac: String, id: String, name: String)
    /// Catch Me Up, pushed from the Terminal's ⋯ (Phase 337.1, D18; a menu
    /// item since Phase 337.3).
    /// `honestLine` is the session's own line, drawn when it has no turns.
    case catchUp(mac: String, id: String, honestLine: String?)
    /// The session an alert named, opened by a tap. Drawn as `session`, with
    /// no name until the door answers, and a refusal says the Mac's own
    /// sentence for a session it no longer has (SPEC section 5.6.4).
    case alerted(mac: String, id: String)

    /// The Mac this route reads from: its whole public name.
    var mac: String {
        switch self {
        case .session(let mac, _, _), .catchUp(let mac, _, _), .alerted(let mac, _): mac
        }
    }
}

/// One Mac this iPhone keeps, as its own space (Phase 345, D1): its reader,
/// its list (the Needs input tab, its badge and the older Mac's Sessions
/// face), its Sessions model, where each list tab is pushed to, and Unpair's
/// line in Settings. Each space keeps its own place, so switching away and
/// back finds it where he left it. Nothing in it is stored.
@MainActor
@Observable
final class MacSpace: Identifiable {
    /// The Mac's whole public name (D2): what the phone dials, so two kept
    /// pairings never share one.
    let id: String
    let reader: any DoorReading
    let list: ListModel
    /// Replaced only when this Mac is chosen with Show, Group by or Sort by
    /// changed since its model was made (D17).
    var sessions: SessionsModel
    /// What is pushed over this Mac's Needs input list.
    var waitingPath: [Route] = []
    /// What is pushed over this Mac's Sessions list.
    var sessionsPath: [Route] = []
    /// The sentence under Unpair this iPhone when the phone could not forget
    /// this Mac.
    var settingsLine: String?
    /// The one start on this Mac whose answer did not come (Phase 346, D17,
    /// D27), so Try again sends its id and nothing starts twice; in memory
    /// only, and forgotten when the app leaves.
    var keptStart: KeptStart?

    init(id: String, reader: any DoorReading, list: ListModel, sessions: SessionsModel) {
        self.id = id
        self.reader = reader
        self.list = list
        self.sessions = sessions
    }
}

/// A Mac keeps its own kept start (Phase 346, D27).
extension MacSpace: StartKeeping {}

/// The space a routing was made for, held weakly (the Phase 345 fix round).
/// A pairing made again takes its Mac's place with a NEW space under the
/// same name, and a read the replaced pairing had under way can answer after
/// it: its refusal, or its pop back to a list, is that pairing's, which is
/// gone, and never the new one's, so it moves nothing (`AppModel.speaks`).
@MainActor
final class MadeFor {
    weak var space: MacSpace?

    init(_ space: MacSpace?) {
        self.space = space
    }
}

@MainActor
@Observable
final class AppModel {
    enum Root: Equatable {
        case pairing
        case reading
        /// See a sample (Phase 333.3): the three tabs over made-up sessions,
        /// under the Sample bar.
        case sample
    }

    private(set) var root: Root
    /// See a sample is open (Phase 333.3).
    var inSample: Bool { root == .sample }
    /// Where See a sample was pressed, Pairing or the paired lists, so Leave
    /// sample goes back there; nil outside the sample.
    private var sampleFrom: Root?
    /// The Mac on screen when See a sample was pressed, chosen again when the
    /// sample is left if it is still kept (D26).
    private var sampleChosen: String?
    /// The tab on screen. Needs input every launch, and never stored.
    var tab: AppTab = .needsInput
    /// Every Mac kept, each its own space, in the store's order (D9): the
    /// first Mac paired, then the rest by when each was paired. Inside the
    /// sample, the sample's one space.
    private(set) var spaces: [MacSpace] = []
    /// The Mac on screen: its whole public name. The first Mac every launch,
    /// held in memory and never stored (D5).
    private(set) var chosenId: String?
    /// Moves each time the app comes back to the foreground; the screen on
    /// top of the tab on screen reads again. Not a timer: it moves only when
    /// he opens the app.
    private(set) var foregroundTick = 0
    private(set) var pairing: PairingModel!
    /// The Pair another Mac sheet's pairing, while the sheet is up (D16).
    private(set) var anotherPairing: PairingModel?
    /// What iOS allows for alerts, for Settings: read only for a pairing
    /// whose Mac said it could send (`readAlertPermission`), nil until then.
    private(set) var alertPermission: PushAuthorization?
    /// The list's read that says the Mac's sentence about a gone session, and
    /// the alert-address check a pairing starts, held so a test can wait for
    /// them. Neither is drawn from.
    @ObservationIgnored private(set) var noticeRead: Task<Void, Never>?
    @ObservationIgnored private(set) var addressCheck: Task<Void, Never>?
    /// The permission read a return to the foreground starts, and Unpair's
    /// `forgetAddress()`, held so a test can wait for them.
    @ObservationIgnored private(set) var permissionRead: Task<Void, Never>?
    @ObservationIgnored private(set) var forgetting: Task<Void, Never>?
    /// The reads of the Macs not on screen a return to the foreground starts
    /// (D7), held so a test can wait for them.
    @ObservationIgnored private(set) var othersRead: Task<Void, Never>?
    /// Every End under way, single or batch: registered at the destructive
    /// press and stopped together when the app goes to the background.
    @ObservationIgnored private(set) var liveRunners: [EndRunner] = []
    /// Every press and message under way (Phase 318): registered at the
    /// press, before its write starts, and stopped with the Ends.
    @ObservationIgnored private(set) var liveReplies: [ReplyRunner] = []
    /// Every Screen's key sender (Phase 337): registered as its Screen
    /// appears, and stopped with the Ends.
    @ObservationIgnored private(set) var liveKeys: [ScreenKeySender] = []
    /// Every start under way (Phase 346): registered at Create, before its
    /// write starts, and stopped with the Ends.
    @ObservationIgnored private(set) var liveStarts: [StartRunner] = []

    private let door: any PhoneDoor
    /// What the Mac shows beside the fingerprint: this iPhone's name.
    private let label: String
    /// What the app asks iOS about alerts (Alerts/SystemAlerts.swift).
    private let alerts: any PushAddressing
    /// Face ID, Touch ID or the passcode, asked before an End and nothing
    /// else (App/OwnerCheck.swift).
    let ownerCheck: any OwnerCheck
    /// Where the Sessions tab keeps its three words (Screens/SessionsChoices.swift).
    private let choices: any SessionsChoicesStore
    /// A code handed in at launch (DEBUG only), read once, by the first
    /// pairing screen or, with a pairing kept, by the Pair another Mac sheet
    /// (Phase 345, D19), and never again, so a pairing that is later removed
    /// draws the not-paired line rather than retrying a spent code.
    private var launchCode: String?
    /// The one Mac whose refusal put the phone on Pairing (the fix round,
    /// D18a): with ONE Mac kept a refusal goes to Pairing, as build 10's did,
    /// and a pairing made THERE with another Mac takes this one's place, as
    /// build 10's one pairing was replaced, rather than keeping a Mac that
    /// refused the phone beside it and opening on it at every launch. Set
    /// only by that refusal; spent by the pairing it stands for; dropped by
    /// Unpair, and by a return that finds the Mac kept with no pairing under
    /// way. A door's answer never names it: only the person's own pairing on
    /// that screen reads it, and the sheet's never does.
    private var refusedOnPairing: String?

    init(
        door: any PhoneDoor,
        label: String,
        alerts: any PushAddressing,
        launchCode: String? = nil,
        ownerCheck: any OwnerCheck = DeviceOwnerCheck(),
        choices: any SessionsChoicesStore = KeptSessionsWords.onThisPhone()
    ) {
        self.door = door
        self.label = label
        self.alerts = alerts
        self.ownerCheck = ownerCheck
        self.choices = choices
        self.launchCode = launchCode
        let kept = door.pairedReaders()
        root = kept.isEmpty ? .pairing : .reading
        pairing = PairingModel(door: door, label: label, alerts: alerts) { [weak self] reader, first in
            self?.paired(reader, first: first)
        }
        spaces = kept.map { makeSpace($0, store: choices) }
        chosenId = spaces.first?.id
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
        // Then a client key no kept pairing names is deleted, once, before
        // anything can start a pairing, and only after every pairing record
        // read without an error (Phase 345, D11).
        PairingStore.keychain.sweepOrphans()
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

    // MARK: The Macs (Phase 345)

    /// The Mac on screen: the chosen space, or nil with no pairing.
    var chosen: MacSpace? {
        spaces.first { $0.id == chosenId } ?? spaces.first
    }

    /// The space of the Mac whose whole public name is `mac`, or nil when it
    /// is no longer kept. THE ONE LOOKUP a route's reader comes from (D13).
    func space(_ mac: String) -> MacSpace? {
        spaces.first { $0.id == mac }
    }

    /// Whether the Macs tab is drawn: two or more Macs kept, on the paired
    /// lists. With one Mac the bar is the three tabs it always was (D3).
    var showsMacs: Bool {
        root == .reading && spaces.count > 1
    }

    /// A Mac's name as the Macs tab, the Macs screen and Settings draw it
    /// (D21): its first label, or its whole public name when another kept Mac
    /// has the same first label.
    func drawnName(_ space: MacSpace) -> String {
        PairedFacts.drawnName(space.id, among: spaces.map(\.id))
    }

    /// The Macs tab's badge (D6): what waits on the Macs NOT on screen, the
    /// sum of each one's last loaded waiting count, folded through the one
    /// checked sum (Door/Contract.swift `DoorNumber`). Zero, which draws no
    /// badge, when nothing waits there, when none has loaded, or when a sum
    /// is not a count.
    var otherMacsWaiting: Int {
        Self.waitingSum(spaces.filter { $0.id != chosen?.id }.compactMap { space -> Int? in
            guard case .loaded(let drawing) = space.list.state else { return nil }
            return drawing.waiting.count
        })
    }

    /// Waiting counts folded through `DoorNumber.sum`, with no operator of
    /// its own: 0, which draws no badge, when a sum is not a count.
    nonisolated static func waitingSum(_ counts: [Int]) -> Int {
        var waiting = 0
        for count in counts {
            guard let sum = DoorNumber.sum(waiting, count) else { return 0 }
            waiting = sum
        }
        return waiting
    }

    /// One tap on a Mac in the Macs tab (D4): the whole app is that Mac's,
    /// on its Needs input, each list where he left it. What iOS allows is
    /// asked again for it, on Settings' appear. When Show, Group by or Sort
    /// by changed since this Mac's Sessions model was made, it is made again
    /// over the words the phone keeps now (D17).
    func choose(_ mac: String) {
        guard root == .reading, let space = space(mac) else { return }
        chosenId = mac
        tab = .needsInput
        alertPermission = nil
        if space.sessions.words != choices.load() {
            space.sessions = SessionsModel(door: space.reader, list: space.list, store: choices)
        }
    }

    /// One `/v1/blocked` for each Mac not on screen, side by side, each
    /// bounded by the client's own time limit (D7): when the app opens, on
    /// every return to the foreground and when the Macs tab appears. With one
    /// Mac kept, nothing.
    func readOtherMacs() async {
        guard showsMacs else { return }
        await readLists(spaces.filter { $0.id != chosen?.id })
    }

    /// Every Mac's `/v1/blocked`, side by side: the Macs tab's pull (D14).
    func readAllMacs() async {
        guard showsMacs else { return }
        await readLists(spaces)
    }

    /// Each Mac's list read once, side by side.
    private func readLists(_ macs: [MacSpace]) async {
        await withTaskGroup(of: Void.self) { group in
            for space in macs {
                let list = space.list
                group.addTask { await list.load() }
            }
        }
    }

    /// A Mac refused this iPhone: its list, the reads about one of its
    /// sessions, or an alerted session's (D18). With one Mac kept it is
    /// today's: back to Pairing with the one line (`lostPairing`). With two or
    /// more, only that Mac is blanked: its paths empty and its list says `This
    /// iPhone is not paired with this Mac.` with Try again; no other Mac, the
    /// Mac on screen and the tab stay as they are, and nothing is forgotten.
    /// A Mac no longer kept moves nothing.
    ///
    /// With one Mac kept, that Mac's name is kept for the Pairing screen it
    /// goes to (`refusedOnPairing`, D18a): a pairing made there with another
    /// Mac replaces it, as build 10's did.
    func refused(mac: String) {
        let refusing = space(mac)
        if let refusing, spaces.count > 1 {
            refusing.waitingPath = []
            refusing.sessionsPath = []
            refusing.list.drawRefused(Copy.notPairedHere)
        } else if let refusing {
            refusedOnPairing = refusing.id
            lostPairing()
        } else if spaces.isEmpty {
            lostPairing()
        }
    }

    /// Whether a routing made for `owner` still speaks for `mac` (the fix
    /// round): yes when the space kept under that name is the one it was made
    /// for, or when none is kept, where the routing's own rules say what a
    /// Mac no longer kept does; no when a pairing made since has put a new
    /// space in its place.
    private func speaks(for mac: String, _ owner: MadeFor) -> Bool {
        guard let kept = space(mac) else { return true }
        return kept === owner.space
    }

    // MARK: Routing

    /// What a screen pushed over `tab`'s list on `mac` calls when a read means
    /// it belongs elsewhere: a refusal about one session pops THAT tab of THAT
    /// Mac to its list, and the Mac no longer knowing this iPhone is `refused`.
    /// Each answers for the space kept under `mac` when it was made, and for
    /// no space a later pairing put in its place (`speaks`).
    func routing(_ tab: AppTab, mac: String) -> ReadRouting {
        let owner = MadeFor(space(mac))
        return ReadRouting(
            backToList: { [weak self] in
                guard let self, self.speaks(for: mac, owner) else { return }
                self.backToList(in: tab, mac: mac)
            },
            pairAgain: { [weak self] in
                guard let self, self.speaks(for: mac, owner) else { return }
                self.refused(mac: mac)
            }
        )
    }

    /// A Mac's list's own: a refused list is a phone that Mac no longer knows,
    /// so it only ever goes where `refused` sends it (DoorWords, `ReadKind.list`),
    /// and only while its space is the one kept under its Mac's name.
    private func listRouting(_ mac: String, owner: MadeFor) -> ReadRouting {
        ReadRouting(backToList: {}, pairAgain: { [weak self] in
            guard let self, self.speaks(for: mac, owner) else { return }
            self.refused(mac: mac)
        })
    }

    /// The same for the session an alert opened, which is pushed on the Needs
    /// input tab of `mac`: a refusal about it goes back to that list with the
    /// Mac's own sentence for a session it no longer has.
    func alertedRouting(mac: String) -> ReadRouting {
        let owner = MadeFor(space(mac))
        return ReadRouting(
            backToList: { [weak self] in
                guard let self, self.speaks(for: mac, owner) else { return }
                self.backToList(saying: Copy.noSuchSession, mac: mac)
            },
            pairAgain: { [weak self] in
                guard let self, self.speaks(for: mac, owner) else { return }
                self.refused(mac: mac)
            }
        )
    }

    /// The code handed in at launch, once.
    func takeLaunchCode() -> String? {
        defer { launchCode = nil }
        return launchCode
    }

    // MARK: The chosen Mac's lists, as every screen has read them

    /// The Mac on screen's list: its Needs input tab, its badge and the
    /// older Mac's Sessions face, always one answer.
    var list: ListModel? { chosen?.list }
    /// The Sessions tab's model (Phase 316.7) for the Mac on screen, made
    /// wherever its list is, over the same reader and the same list.
    var sessions: SessionsModel? { chosen?.sessions }
    /// The Mac on screen's reader.
    var reader: (any DoorReading)? { chosen?.reader }
    /// The sentence under Unpair this iPhone when the phone could not forget
    /// the Mac on screen.
    var settingsLine: String? { chosen?.settingsLine }

    /// What is pushed over the Mac on screen's Needs input list.
    var waitingPath: [Route] {
        get { chosen?.waitingPath ?? [] }
        set { chosen?.waitingPath = newValue }
    }

    /// What is pushed over the Mac on screen's Sessions list. Settings and
    /// Macs push nothing (Unpair's question, a link's address and the Pair
    /// another Mac sheet are sheets), so they have no path.
    var sessionsPath: [Route] {
        get { chosen?.sessionsPath ?? [] }
        set { chosen?.sessionsPath = newValue }
    }

    // MARK: Pairing

    /// The first pairing, from Pairing: the paired lists, on Needs input.
    /// When one Mac's refusal put the phone on Pairing and this pairing is
    /// with ANOTHER Mac, that Mac's pairing is forgotten first, so the new Mac
    /// takes its place, as build 10's one pairing was replaced (D18a).
    func paired(_ reader: any DoorReading, first: PocketBlockedAnswer) {
        replaceRefused(with: reader.facts.publicName)
        adopt(reader, first: first)
        startOver()
        root = .reading
        // The launch's check, at once (the 316.5 fix round): an Allow pressed
        // on the Mac while iOS was still asking pairs with no address, and
        // the list says `Pair again to get alerts.` now, not at the next launch.
        addressCheck = Task { [weak self] in await self?.checkAlertAddress() }
    }

    /// Pair another Mac (D16): the pairing screen as a sheet over the lists,
    /// with a model of its own, the Macs kept staying kept.
    func pairAnotherMac() {
        guard root == .reading, anotherPairing == nil else { return }
        anotherPairing = PairingModel(door: door, label: label, alerts: alerts, keepsOthers: true) { [weak self] reader, first in
            self?.pairedAnother(reader, first: first)
        }
    }

    /// Cancel, or the sheet swiped away: the attempt under way ends, its
    /// client key with it, and the sheet's model is dropped (D16).
    func endPairAnother() {
        anotherPairing?.cancel()
        anotherPairing = nil
    }

    /// The sheet's pairing is done: the sheet closes onto that Mac's Needs
    /// input, chosen, whether it was new or paired again.
    private func pairedAnother(_ reader: any DoorReading, first: PocketBlockedAnswer) {
        guard root == .reading else { return }
        adopt(reader, first: first)
        tab = .needsInput
        alertPermission = nil
        anotherPairing = nil
        addressCheck = Task { [weak self] in await self?.checkAlertAddress() }
    }

    /// D18a, THE ONE-MAC PHONE AS BUILD 10 LEFT IT (the fix round). Build 10
    /// kept one pairing, and a Mac paired on the Pairing screen that its Mac's
    /// refusal led to took that Mac's place. With one Mac kept this build
    /// goes to that same screen, and the pairing made there does the same:
    /// the Mac that refused, and only it, is forgotten through Unpair's own
    /// door, its record first and then its client key. Nothing is forgotten
    /// when this is the same Mac paired again (its record was replaced in
    /// place), when no refusal led here (a first pairing, or Unpair of the
    /// last Mac), or from the Pair another Mac sheet. Apple is told nothing,
    /// as build 10 told it nothing when one pairing replaced another; a
    /// record that would not go leaves both Macs kept, which is what this
    /// build drew before the fix.
    private func replaceRefused(with mac: String) {
        defer { refusedOnPairing = nil }
        guard let refused = refusedOnPairing, refused != mac else { return }
        _ = door.unpair(name: refused)
    }

    /// A pairing that is done takes its Mac's place: the space with that
    /// public name is made again (a new reader, its list adopting the first
    /// read, a new Sessions model, nothing pushed), or added; the order is the
    /// store's, read again; and that Mac is chosen. A kept Mac this phone did
    /// not hold a space for (one a refusal left behind) gets one, so what is
    /// drawn is what the next launch draws.
    private func adopt(_ reader: any DoorReading, first: PocketBlockedAnswer) {
        let made = makeSpace(reader, store: choices)
        made.list.adopt(first)
        var next: [MacSpace] = []
        for kept in door.pairedReaders() {
            let mac = kept.facts.publicName
            if mac == made.id {
                next.append(made)
            } else if let had = space(mac) {
                next.append(had)
            } else {
                next.append(makeSpace(kept, store: choices))
            }
        }
        if !next.contains(where: { $0.id == made.id }) { next.append(made) }
        spaces = next
        chosenId = made.id
    }

    /// The door no longer knows this iPhone, or there is no pairing: back to
    /// Pairing with the one line. The kept pairing is NOT forgotten here: a
    /// 404 is every refusal the door makes, including one while the Mac is
    /// quitting, and a pairing that still works comes back on the next code.
    func lostPairing() {
        // Inside the sample, which refuses nothing, a refusal leaves it first
        // (Phase 333.3, D16).
        if root == .sample {
            leaveSample()
            return
        }
        endPairAnother()
        startOver()
        spaces = []
        chosenId = nil
        pairing.pairAgain()
        root = .pairing
    }

    /// Nothing pushed on any list tab, Needs input on screen, and nothing said
    /// about a pairing that is not this one.
    private func startOver() {
        for space in spaces {
            space.waitingPath = []
            space.sessionsPath = []
            space.settingsLine = nil
        }
        tab = .needsInput
        alertPermission = nil
    }

    /// The door refused a read about one session on `tab` of `mac`. That
    /// tab's list reads again on appear, and it is the truth about what is
    /// still there; the other tab, and every other Mac, keep their place.
    private func backToList(in tab: AppTab, mac: String) {
        guard let space = space(mac) else { return }
        switch tab {
        case .needsInput: space.waitingPath = []
        case .sessions: space.sessionsPath = []
        case .settings, .macs: break
        }
    }

    /// The door refused a read about the session an alert opened on `mac`.
    /// The list says `sentence` once a read of its own answers, and that read
    /// is asked for HERE rather than left to the list appearing again: a door
    /// answers the 404 in milliseconds, and a list whose push never finished
    /// never left the screen, so it reads nothing on appear (the 316.5 fix
    /// round). A list the door refuses too is a phone it no longer knows,
    /// which goes where `refused` sends it, so the sentence is never said over
    /// an unpaired phone.
    func backToList(saying sentence: String, mac: String) {
        guard let space = space(mac) else { return }
        space.waitingPath = []
        let list = space.list
        list.sayAfterRead(sentence)
        noticeRead = Task { await list.load() }
    }

    /// He left the app: the Mac's sentence about a session it no longer has
    /// goes now, so it is not there when he comes back. It is NOT cleared on
    /// the way back in. A tap on an alert is what brings the app back, iOS
    /// hands the tap over before the scene is active, and a sentence that tap
    /// produced was cleared by the return it arrived with: five taps of five
    /// on iOS 26.3 drew the list with no sentence (the 316.5 fix round).
    ///
    /// And every write stops (Phase 317, D6): each live End's runner starts
    /// no further write and its task is cancelled, which WITHHOLDS a write
    /// whose bytes were not yet handed to the connection, so a handshake iOS
    /// resumes on the way back cannot carry it. Nothing keeps the app running
    /// to finish one.
    ///
    /// Every press and message stops the same way (Phase 318, research 137
    /// section 5): a reply whose bytes were not handed is withheld, never sent
    /// on the way back in, and never retried.
    ///
    /// And every Terminal's keys (Phase 337, D30): the keys waiting are
    /// dropped, a write whose bytes were not handed is withheld, and the
    /// Terminal's kept connections close.
    ///
    /// And every start (Phase 346, D17): a start whose bytes were not handed
    /// is withheld, never sent on the way back in, and never retried; and
    /// every Mac forgets its kept start, so Try again after a trip away is a
    /// new start.
    func wentAway() {
        for space in spaces {
            space.list.clearNotice()
            space.keptStart = nil
        }
        for runner in liveRunners {
            runner.stopRequested = true
            runner.task?.cancel()
        }
        for runner in liveReplies {
            runner.stop()
        }
        for sender in liveKeys {
            sender.stop()
        }
        for runner in liveStarts {
            runner.stop()
        }
    }

    /// He came back: the screen on top of the tab on screen reads again, a
    /// pairing the door had refused is tried again, what iOS allows for
    /// alerts is read again, since he may have changed it in iOS Settings,
    /// and the Macs not on screen are read for the Macs tab's badge (D7).
    func cameToForeground() {
        foregroundTick += 1
        readKeptPairing()
        permissionRead = Task { [weak self] in await self?.readAlertPermission() }
        if showsMacs {
            othersRead = Task { [weak self] in await self?.readOtherMacs() }
        }
    }

    /// A pairing the door had refused (a quit, a Remove then a new Allow) is
    /// tried again when he opens the app, or taps an alert.
    private func readKeptPairing() {
        guard root == .pairing else { return }
        let kept = door.pairedReaders()
        guard !kept.isEmpty else { return }
        // The Mac that refused is back on screen: the Pairing screen it led to
        // is gone, and only a pairing already under way there still replaces
        // it (D18a).
        if !pairing.busy {
            refusedOnPairing = nil
        }
        spaces = kept.map { makeSpace($0, store: choices) }
        chosenId = spaces.first?.id
        root = .reading
    }

    /// One Mac's space: its list and its Sessions model over its reader, made
    /// together and dropped together. `store` keeps the Sessions tab's three
    /// words: the phone's own for a paired Mac, and the sample's, in memory,
    /// for See a sample (Phase 333.3, D17).
    private func makeSpace(_ reader: any DoorReading, store: any SessionsChoicesStore) -> MacSpace {
        let mac = reader.facts.publicName
        let owner = MadeFor(nil)
        let list = ListModel(door: reader, routing: listRouting(mac, owner: owner))
        let made = MacSpace(id: mac, reader: reader, list: list, sessions: SessionsModel(door: reader, list: list, store: store))
        owner.space = made
        return made
    }

    // MARK: See a sample (Phase 333.3, build/p3333/SPEC.md D13 to D17)

    /// See a sample, from Pairing or from Settings on a paired phone: the
    /// three tabs over made-up sessions read from the app's own file. It asks
    /// nothing of the door and the Keychain: every Mac's list, Sessions model
    /// and reader are dropped (no pairing is forgotten), every write, press
    /// and key under way stops as on a trip to the background, and the
    /// Sessions tab's words are kept in memory, fresh each time. A file that
    /// will not read leaves everything as it was.
    func openSample() {
        guard root != .sample, let sample = SampleReader.bundled() else { return }
        sampleFrom = root
        sampleChosen = chosenId
        wentAway()
        startOver()
        let space = makeSpace(sample, store: SampleChoices())
        spaces = [space]
        chosenId = space.id
        root = .sample
    }

    /// Leave sample: back to where See a sample was pressed. From Pairing,
    /// Pairing as it was, with nothing asked of the door. From the paired
    /// lists, every kept pairing's reader, read once, the Mac that was on
    /// screen chosen again if it is still kept, else the first (D26), and the
    /// Needs input tab, which reads on appear; no pairing that reads back goes
    /// to Pairing with the not-paired line, as `lostPairing` does.
    func leaveSample() {
        guard root == .sample else { return }
        defer {
            sampleFrom = nil
            sampleChosen = nil
        }
        wentAway()
        startOver()
        spaces = []
        chosenId = nil
        if sampleFrom == .reading {
            let kept = door.pairedReaders()
            if kept.isEmpty {
                pairing.pairAgain()
                root = .pairing
            } else {
                spaces = kept.map { makeSpace($0, store: choices) }
                chosenId = spaces.contains(where: { $0.id == sampleChosen }) ? sampleChosen : spaces.first?.id
                root = .reading
                // The lists made here are new, so the alert line the launch's
                // check drew is asked again, as a pairing asks it.
                addressCheck = Task { [weak self] in await self?.checkAlertAddress() }
            }
        } else {
            root = .pairing
        }
    }

    /// The owner check End asks for `reader`'s sessions: the device's own for
    /// every paired reader, and for the sample's alone the sample's, which on
    /// an iPhone with no passcode ends the sample's copy without asking
    /// (D11, D12).
    func endCheck(for reader: any DoorReading) -> any OwnerCheck {
        reader is SampleReader ? SampleOwnerCheck(inner: ownerCheck) : ownerCheck
    }

    /// A row tapped on `tab`'s list of the Mac on screen opens that session
    /// on that tab, on that Mac.
    func open(_ row: RowDrawing, in tab: AppTab) {
        guard let space = chosen else { return }
        space.list.clearNotice()
        push(.session(mac: space.id, id: row.id, name: row.name), on: tab)
    }

    // MARK: Alerts

    /// A tap on an alert. With no pairing kept, Pairing stays; with one, the
    /// app reads, Needs input comes on screen, and the tap replaces whatever
    /// was pushed there: its list, or the one session the alert named. The
    /// Sessions tab keeps its place. With two or more Macs kept the alert
    /// says nothing of which Mac sent it, so it opens its session only on
    /// the one Mac that says it sends alerts (`alertTarget`), chosen; with
    /// none or several, the Mac on screen's Needs input, and nothing is
    /// pushed or read for the session it named, never a guess (D24).
    func openFromAlert(_ tap: AlertTap) {
        // A tap inside the sample leaves it first, then routes as ever
        // (Phase 333.3, D16).
        if root == .sample {
            leaveSample()
        }
        readKeptPairing()
        guard root == .reading, let onScreen = chosen else { return }
        guard let target = alertTarget() else {
            onScreen.list.clearNotice()
            tab = .needsInput
            onScreen.waitingPath = []
            return
        }
        if target.id != onScreen.id {
            choose(target.id)
        }
        target.list.clearNotice()
        tab = .needsInput
        switch tap {
        case .list:
            target.waitingPath = []
        case .session(let id):
            target.waitingPath = [.alerted(mac: target.id, id: id)]
        }
    }

    /// The Mac an alert's tap opens on (D24): the one Mac kept; else the one
    /// Mac of several that said, as it held this phone, that it could send;
    /// else none, because the phone cannot tell which Mac sent it.
    func alertTarget() -> MacSpace? {
        guard spaces.count > 1 else { return spaces.first }
        let senders = spaces.filter { $0.reader.alerts.macSends }
        return senders.count == 1 ? senders.first : nil
    }

    /// Once a launch, with a pairing kept: whether this phone's alert address
    /// is the one each Mac holds (Alerts/Alerts.swift, `AlertLine`), said on
    /// that Mac's own list (D25). Only for a pairing whose Mac said it could
    /// send: with any other, iOS is asked nothing and the line is never drawn
    /// (research 136 section 9). Its address is asked only when alerts are
    /// allowed, which in a Release build is when it registers with Apple, as
    /// Apple asks an app to on every launch.
    func checkAlertAddress() async {
        guard root == .reading else { return }
        for space in spaces {
            await checkAlertAddress(space)
        }
    }

    /// One Mac's half of `checkAlertAddress`.
    private func checkAlertAddress(_ space: MacSpace) async {
        let kept = space.reader.alerts
        guard kept.macSends else {
            space.list.alertsLine = nil
            return
        }
        let authorization = await alerts.authorization()
        let current = authorization == .authorized ? await alerts.currentAddress() : nil
        let shows = AlertLine.shows(kept: kept, authorization: authorization, current: current)
        space.list.alertsLine = shows ? Copy.pairAgainForAlerts : nil
    }

    /// What iOS allows for alerts, for Settings: asked only for a pairing
    /// whose Mac said it could send (research 136 section 9), so a phone
    /// paired with any other Mac asks iOS nothing. On Settings' appear and on
    /// every return to the foreground, for the Mac on screen. Asking is not
    /// registering: nothing here speaks to Apple.
    func readAlertPermission() async {
        guard root == .reading, let reader, reader.alerts.macSends else {
            alertPermission = nil
            return
        }
        alertPermission = await alerts.authorization()
    }

    /// Unpair this iPhone from the Mac on screen, after he confirmed it
    /// (build/p3166/SPEC.md section 5.4; that Mac alone since Phase 345). Its
    /// record goes first; if it stays, nothing else was touched and Settings
    /// says so. If it went, Apple is told to stop taking alerts for this
    /// install (Release only) when no Mac is left, or when that Mac held this
    /// phone's alert address (D23); then, with no Mac left, the app goes back
    /// to Pairing with its not-paired line, and otherwise to the first Mac
    /// left, on its Needs input. The Mac lists this iPhone until he presses
    /// Remove.
    func unpair() {
        guard root == .reading, let space = chosen else { return }
        switch door.unpair(name: space.id) {
        case .kept:
            space.settingsLine = Copy.unpairFailed
        case .forgotten:
            space.settingsLine = nil
            refusedOnPairing = nil
            let left = spaces.filter { $0.id != space.id }
            if left.isEmpty || space.reader.alerts.presented != nil {
                forgetting = Task { await alerts.forgetAddress() }
            }
            if let next = left.first {
                spaces = left
                choose(next.id)
            } else {
                lostPairing()
            }
        }
    }

    /// Catch Me Up, opened from the Terminal's ⋯ on `tab` (Phase 337.1).
    func openCatchUp(_ sessionId: String, honestLine: String?, in tab: AppTab) {
        guard let space = chosen else { return }
        push(.catchUp(mac: space.id, id: sessionId, honestLine: honestLine), on: tab)
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
    /// on a status. The Mac on screen's alone (D6).
    var waitingBadge: Int {
        guard case .loaded(let drawing)? = list?.state else { return 0 }
        return drawing.waiting.count
    }

    private func path(_ tab: AppTab) -> [Route] {
        switch tab {
        case .needsInput: waitingPath
        case .sessions: sessionsPath
        case .settings, .macs: []
        }
    }

    private func push(_ route: Route, on tab: AppTab) {
        switch tab {
        case .needsInput: waitingPath.append(route)
        case .sessions: sessionsPath.append(route)
        case .settings, .macs: break
        }
    }

    /// End these, for the Sessions tab of a pairing that writes.
    func endBatchSetup(_ reader: any DoorReading) -> EndBatchSetup? {
        let check = endCheck(for: reader)
        return reader.writer.map { EndBatchSetup(writer: $0, ownerCheck: check, registry: self) }
    }

    /// New session, for the Sessions tab of a pairing that starts (Phase 346,
    /// D27): that Mac's starter, this app's registry, that Mac's space as the
    /// keeper of its one kept start, and a done start opened on that Mac.
    /// The sample's says nothing ran (D28). No owner check (his answer 5).
    func startSetup(_ reader: any DoorReading) -> StartSetup? {
        let mac = reader.facts.publicName
        guard let starter = reader.starter, let space = space(mac) else { return nil }
        return StartSetup(
            mac: mac,
            starter: starter,
            registry: self,
            keeper: space,
            sample: inSample,
            opened: { [weak self] id, name in
                self?.openStarted(mac: mac, id: id, name: name)
            }
        )
    }

    /// A start on `mac` was done (D24): its session opens on that Mac's
    /// Sessions tab, its Terminal at its first answer. The Mac that started it
    /// is the one on screen, because its sheet is that Mac's; a start that
    /// answers after another Mac was chosen opens nothing.
    func openStarted(mac: String, id: String, name: String) {
        guard chosen?.id == mac else { return }
        tab = .sessions
        push(.session(mac: mac, id: id, name: name), on: .sessions)
    }
}

/// The app keeps every live start's runner until it ends, so `wentAway` can
/// stop each one (Phase 346).
extension AppModel: StartRunnerRegistry {
    func registerStart(_ runner: StartRunner) {
        liveStarts.append(runner)
    }

    func releaseStart(_ runner: StartRunner) {
        liveStarts.removeAll { $0 === runner }
    }
}

/// The app keeps every live End's runner until it ends, so `wentAway` can
/// stop each one.
extension AppModel: EndRunnerRegistry {
    func register(_ runner: EndRunner) {
        liveRunners.append(runner)
    }

    func release(_ runner: EndRunner) {
        liveRunners.removeAll { $0 === runner }
    }
}

/// The app keeps every live reply's runner until it ends, so `wentAway` can
/// stop each one (Phase 318).
extension AppModel: ReplyRunnerRegistry {
    func registerReply(_ runner: ReplyRunner) {
        liveReplies.append(runner)
    }

    func releaseReply(_ runner: ReplyRunner) {
        liveReplies.removeAll { $0 === runner }
    }
}

/// The app keeps every Screen's key sender while its Screen is shown, so
/// `wentAway` can stop each one (Phase 337).
extension AppModel: ScreenKeysRegistry {
    func registerKeys(_ sender: ScreenKeySender) {
        guard !liveKeys.contains(where: { $0 === sender }) else { return }
        liveKeys.append(sender)
    }

    func releaseKeys(_ sender: ScreenKeySender) {
        liveKeys.removeAll { $0 === sender }
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
                PairingScreen(model: app.pairing, seeSample: { app.openSample() })
                    .task {
                        if let code = app.takeLaunchCode() {
                            await app.pairing.read(code)
                        }
                    }
            case .reading:
                if let space = app.chosen {
                    tabs(space)
                        // With a pairing kept, the DEBUG code opens the Pair
                        // another Mac sheet and is read there (Phase 345, D19).
                        .task {
                            if let code = app.takeLaunchCode() {
                                app.pairAnotherMac()
                                await app.anotherPairing?.read(code)
                            }
                        }
                        .sheet(isPresented: pairingAnother, onDismiss: { app.endPairAnother() }) {
                            if let model = app.anotherPairing {
                                pairAnotherSheet(model)
                            }
                        }
                }
            case .sample:
                // See a sample (Phase 333.3, D14): ONE strip above the three
                // tabs, so every page, upright or sideways, says Sample.
                if let space = app.chosen {
                    VStack(spacing: 0) {
                        SampleBar(leave: { app.leaveSample() })
                        tabs(space)
                    }
                }
            }
        }
        .background(Tokens.bgSidebar.ignoresSafeArea())
        // The status bar's inset after a turn, kept (App/StatusBarInset.swift).
        .background { StatusBarInsetKeeper().frame(width: 0, height: 0).accessibilityHidden(true) }
        // Once a launch: is the alert address each Mac holds this phone's?
        // And, with two or more Macs kept, a read of the ones not on screen,
        // beside it, for the Macs tab's badge (Phase 345, D7).
        .task {
            async let others: Void = app.readOtherMacs()
            await app.checkAlertAddress()
            await others
        }
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

    /// The Pair another Mac sheet is up while its model is (D16); swiping it
    /// away ends the attempt, as Cancel does.
    private var pairingAnother: Binding<Bool> {
        Binding(
            get: { app.anotherPairing != nil },
            set: { shown in
                if !shown { app.endPairAnother() }
            }
        )
    }

    /// Pair another Mac (Phase 345, D16): the pairing screen over the lists,
    /// with Cancel in its top bar and no See a sample.
    private func pairAnotherSheet(_ model: PairingModel) -> some View {
        NavigationStack {
            PairingScreen(model: model, seeSample: nil)
                .toolbarBackground(Tokens.bgSidebar, for: .navigationBar)
                .toolbarBackground(.visible, for: .navigationBar)
                .toolbarColorScheme(.dark, for: .navigationBar)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(Copy.cancel) { app.endPairAnother() }
                            .accessibilityIdentifier(ID.pairAnotherCancel)
                    }
                }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.pairAnotherSheet)
    }

    /// The tabs, each its own stack (build/p3166/SPEC.md section 5.1.1), over
    /// the Mac on screen: every stack carries that Mac's id, so a switch
    /// builds each one again over the new Mac's reader and never reuses a view
    /// built over another's (Phase 345, D13). Nothing here hides the bar: it
    /// stays under a pushed session, so a session is one tap from Needs input;
    /// only the Terminal turned sideways hides it, with the navigation bar,
    /// and turning it upright brings both back (Screens/Screen.swift, Phase
    /// 337.3). With two or more Macs kept a fourth tab, named after the Mac
    /// on screen, lists them and switches (D3). `.badge(0)` draws no badge.
    private func tabs(_ space: MacSpace) -> some View {
        TabView(selection: $app.tab) {
            Tab(Copy.needsInput, systemImage: "bell", value: AppTab.needsInput) {
                NavigationStack(path: $app.waitingPath) {
                    listScreen(space, kind: .needsInput, tab: .needsInput)
                        .navigationDestination(for: Route.self) { route in
                            destination(route, tab: .needsInput)
                        }
                }
                .id(space.id)
            }
            .badge(app.waitingBadge)
            Tab(Copy.sessions, systemImage: "list.bullet", value: AppTab.sessions) {
                NavigationStack(path: $app.sessionsPath) {
                    // Phase 316.7: every session, shown, grouped and sorted,
                    // or today's list for a Mac older than that phase, under
                    // ONE End these (Screens/SessionsScreen.swift).
                    SessionsTab(
                        model: space.sessions,
                        isTop: app.listIsTop(.sessions),
                        foregroundTick: app.foregroundTick,
                        open: { app.open($0, in: .sessions) },
                        ends: app.reader.flatMap { app.endBatchSetup($0) },
                        starts: app.reader.flatMap { app.startSetup($0) }
                    )
                    .navigationDestination(for: Route.self) { route in
                        destination(route, tab: .sessions)
                    }
                }
                .id(space.id)
            }
            Tab(Copy.settings, systemImage: "gearshape", value: AppTab.settings) {
                NavigationStack {
                    SettingsScreen(app: app)
                }
                .id(space.id)
            }
            if app.showsMacs {
                Tab(value: AppTab.macs) {
                    NavigationStack {
                        MacsScreen(app: app)
                    }
                    .id(space.id)
                } label: {
                    Label(app.drawnName(space), systemImage: "desktopcomputer")
                }
                .badge(app.otherMacsWaiting)
            }
        }
        // The one way out of the app for an address an answer names
        // (Markdown/Links.swift), applied once, to the reading root.
        .linkGate()
    }

    /// The Needs input tab's list. It draws no Select: End these is the
    /// Sessions tab's alone.
    private func listScreen(_ space: MacSpace, kind: ListKind, tab: AppTab) -> some View {
        ListScreen(
            model: space.list,
            kind: kind,
            isTop: app.listIsTop(tab),
            foregroundTick: app.foregroundTick,
            open: { app.open($0, in: tab) },
            ends: app.reader.flatMap { app.endBatchSetup($0) }
        )
    }

    /// A pushed screen, over the reader of the Mac its route names, looked up
    /// by that Mac's whole public name and from nothing else (D13). A route
    /// whose Mac is no longer kept draws nothing.
    @ViewBuilder
    private func destination(_ route: Route, tab: AppTab) -> some View {
        if let reader = app.space(route.mac)?.reader {
            switch route {
            case .session(let mac, let id, let name):
                SessionRoute(
                    id: id, name: name, reader: reader, routing: app.routing(tab, mac: mac),
                    isTop: app.isTop(route, in: tab), foregroundTick: app.foregroundTick,
                    ownerCheck: app.endCheck(for: reader), registry: app, replies: app, keys: app
                ) { honestLine in
                    app.openCatchUp(id, honestLine: honestLine, in: tab)
                }
            case .catchUp(let mac, let id, let honestLine):
                CatchUpRoute(
                    id: id, honestLine: honestLine, reader: reader, routing: app.routing(tab, mac: mac),
                    isTop: app.isTop(route, in: tab), foregroundTick: app.foregroundTick,
                    ownerCheck: app.endCheck(for: reader), registry: app, replies: app
                )
            case .alerted(let mac, let id):
                SessionRoute(
                    id: id, name: "", reader: reader, routing: app.alertedRouting(mac: mac),
                    isTop: app.isTop(route, in: tab), foregroundTick: app.foregroundTick,
                    ownerCheck: app.endCheck(for: reader), registry: app, replies: app, keys: app
                ) { honestLine in
                    app.openCatchUp(id, honestLine: honestLine, in: tab)
                }
            }
        }
    }
}

/// Which face a session's route draws, decided at its first answer and then
/// kept for the route's life (Phase 337.1, build/p3371/SPEC.md D16): the
/// Terminal exactly when the answer says the session has one (`screen`) and
/// this reader has a screen door for it, else Catch Me Up. A session that ends
/// while he watches keeps its Terminal, whose poll then says the Mac's
/// sentence where the rows were; nothing he is looking at swaps under him.
@MainActor
@Observable
final class SessionRouteModel {
    enum Face: Equatable, Sendable {
        case terminal
        case catchUp
    }

    let sessionId: String
    /// The route's read: the first answer, which decides the face, and
    /// Catch Me Up's now card on that face. Through the reader, never a kept
    /// line: the Terminal makes its own (`TerminalFace`).
    let session: SessionModel
    /// Nil until an answer decides it; then never changed.
    private(set) var face: Face?
    /// The Terminal's door, made only when the Terminal is the face.
    private(set) var terminalDoor: (any ScreenDoor)?
    private let reader: any DoorReading

    init(sessionId: String, reader: any DoorReading, routing: ReadRouting) {
        self.sessionId = sessionId
        self.reader = reader
        session = SessionModel(sessionId: sessionId, door: reader, routing: routing)
    }

    /// The face for an answer: the Terminal exactly when the session has one
    /// and there is a door to it.
    nonisolated static func face(screen: Bool, hasDoor: Bool) -> Face {
        screen && hasDoor ? .terminal : .catchUp
    }

    /// Read the session, and decide the face if this is the first answer.
    func load() async {
        await session.load()
        decide()
    }

    /// The first loaded answer decides, once.
    func decide() {
        guard face == nil, case .loaded(let drawing) = session.phase else { return }
        let door = drawing.screen ? reader.screenDoor(sessionId) : nil
        face = Self.face(screen: drawing.screen, hasDoor: door != nil)
        terminalDoor = face == .terminal ? door : nil
    }
}

/// One session's route (Phase 337.1, D16): its name and the loading view
/// until the first answer, then the Terminal or Catch Me Up, kept. Holds the
/// session's End and its reply for as long as it is pushed, both built from
/// the reader's writer: a reader that writes nothing draws no End, no button
/// and no message box. The reply asks no owner check (his ruling, "Only for
/// End"), and its box, its kept say and its lines are forgotten when the
/// route is left. Its outer container is `screen-session` whichever face it
/// draws, the face's own inside it.
private struct SessionRoute: View {
    @State private var route: SessionRouteModel
    @State private var conversation: ConversationModel
    @State private var end: EndModel?
    @State private var reply: ReplyModel?
    let name: String
    let reader: any DoorReading
    let routing: ReadRouting
    let isTop: Bool
    let foregroundTick: Int
    let keys: any ScreenKeysRegistry
    let openCatchUp: (String?) -> Void

    init(
        id: String, name: String, reader: any DoorReading, routing: ReadRouting,
        isTop: Bool, foregroundTick: Int, ownerCheck: any OwnerCheck, registry: any EndRunnerRegistry,
        replies: any ReplyRunnerRegistry, keys: any ScreenKeysRegistry,
        openCatchUp: @escaping (String?) -> Void
    ) {
        _route = State(initialValue: SessionRouteModel(sessionId: id, reader: reader, routing: routing))
        _conversation = State(initialValue: ConversationModel(sessionId: id, door: reader, routing: routing))
        _end = State(initialValue: reader.writer.map {
            EndModel(sessionId: id, writer: $0, ownerCheck: ownerCheck, registry: registry)
        })
        _reply = State(initialValue: reader.writer.map {
            ReplyModel(sessionId: id, writer: $0, registry: replies)
        })
        self.name = name
        self.reader = reader
        self.routing = routing
        self.isTop = isTop
        self.foregroundTick = foregroundTick
        self.keys = keys
        self.openCatchUp = openCatchUp
    }

    var body: some View {
        ZStack {
            // THE ROUTE'S SECOND CHILD (the 337.1 fix round). With the face as
            // the route's one accessibility child, SwiftUI folded the face's
            // own container into this one: only `screen-session` reached the
            // tree, never `screen-screen` or `screen-catch-up`, and every drive
            // that read the face read none (the verifier's element dumps on
            // iOS 26.3). A second child keeps the two containers apart. It
            // draws nothing, takes no touch and is hidden from VoiceOver.
            Color.clear
                .frame(width: 0, height: 0)
                .allowsHitTesting(false)
                .accessibilityElement()
                .accessibilityIdentifier(ID.sessionRouteMark)
                .accessibilityHidden(true)
            switch route.face {
            case .terminal?:
                if let door = route.terminalDoor, let first = route.session.latest {
                    TerminalFace(
                        sessionId: route.sessionId, door: door, reader: reader, routing: routing, first: first,
                        isTop: isTop, foregroundTick: foregroundTick, end: end, reply: reply, registry: keys,
                        openCatchUp: openCatchUp
                    )
                }
            case .catchUp?:
                CatchUpPage(
                    conversation: conversation, honestLine: route.session.latest?.outcome, session: route.session,
                    end: end, reply: reply, name: route.session.latest?.name ?? name,
                    isTop: isTop, foregroundTick: foregroundTick
                )
            case nil:
                deciding
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.sessionScreen)
    }

    /// Before an answer decides the face: the name, and the spinner or the
    /// one sentence with Try again. A refusal goes where the session page's
    /// went (`DoorWords.consequence`, or the alerted route's own sentence).
    private var deciding: some View {
        VStack(spacing: 0) {
            if case .failed(let sentence) = route.session.phase {
                FailureView(sentence: sentence, id: ID.sessionFailure) {
                    Task { await route.load() }
                }
            } else {
                LoadingView(id: ID.sessionLoading)
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Tokens.bgSidebar.ignoresSafeArea())
        .task { await route.load() }
        .onChange(of: foregroundTick) {
            guard isTop else { return }
            Task { await route.load() }
        }
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
        }
    }
}

/// The Terminal face: its poll, its keys and its own reads of the session,
/// held while the face is up (337's `ScreenRoute`, which this replaces). The
/// keys are made only for a door that writes; the sender is registered with
/// the app as the Terminal appears and released as it goes, so a trip to the
/// background stops it. The status line's reads go through the door's side
/// line (D17, D30), one exchange at a time with the pages.
private struct TerminalFace: View {
    @State private var screen: ScreenModel
    @State private var keys: ScreenKeySender?
    @State private var status: SessionModel
    @State private var follow: StatusFollow
    let first: SessionDrawing
    let isTop: Bool
    let foregroundTick: Int
    let end: EndModel?
    let reply: ReplyModel?
    let registry: any ScreenKeysRegistry
    let openCatchUp: (String?) -> Void

    init(
        sessionId: String, door: any ScreenDoor, reader: any DoorReading, routing: ReadRouting,
        first: SessionDrawing, isTop: Bool, foregroundTick: Int, end: EndModel?, reply: ReplyModel?,
        registry: any ScreenKeysRegistry, openCatchUp: @escaping (String?) -> Void
    ) {
        let screen = ScreenModel(sessionId: sessionId, door: door, routing: routing)
        _screen = State(initialValue: screen)
        _keys = State(initialValue: door.writes ? ScreenKeySender(door: door, picture: { [weak screen] in screen?.picture }) : nil)
        let status = SessionModel(sessionId: sessionId, door: reader, routing: routing, read: { try await door.session() })
        _status = State(initialValue: status)
        _follow = State(initialValue: StatusFollow(read: { [weak status] in _ = await status?.load() }))
        self.first = first
        self.isTop = isTop
        self.foregroundTick = foregroundTick
        self.end = end
        self.reply = reply
        self.registry = registry
        self.openCatchUp = openCatchUp
    }

    var body: some View {
        TerminalPage(
            screen: screen, keys: keys, session: status, follow: follow, first: first,
            isTop: isTop, foregroundTick: foregroundTick, end: end, reply: reply, openCatchUp: openCatchUp
        )
        .onAppear { if let keys { registry.registerKeys(keys) } }
        .onDisappear { if let keys { registry.releaseKeys(keys) } }
    }
}

/// Catch Me Up pushed from the Terminal's ⋯ (Phase 337.1, D18): its own
/// conversation, its own read of the session, End and the reply, for as long
/// as it is pushed. Its reads are the reader's own, never the Terminal's kept
/// lines, which close as the Terminal goes under it.
private struct CatchUpRoute: View {
    @State private var conversation: ConversationModel
    @State private var session: SessionModel
    @State private var end: EndModel?
    @State private var reply: ReplyModel?
    let honestLine: String?
    let isTop: Bool
    let foregroundTick: Int

    init(
        id: String, honestLine: String?, reader: any DoorReading, routing: ReadRouting,
        isTop: Bool, foregroundTick: Int, ownerCheck: any OwnerCheck, registry: any EndRunnerRegistry,
        replies: any ReplyRunnerRegistry
    ) {
        _conversation = State(initialValue: ConversationModel(sessionId: id, door: reader, routing: routing))
        _session = State(initialValue: SessionModel(sessionId: id, door: reader, routing: routing))
        _end = State(initialValue: reader.writer.map {
            EndModel(sessionId: id, writer: $0, ownerCheck: ownerCheck, registry: registry)
        })
        _reply = State(initialValue: reader.writer.map {
            ReplyModel(sessionId: id, writer: $0, registry: replies)
        })
        self.honestLine = honestLine
        self.isTop = isTop
        self.foregroundTick = foregroundTick
    }

    var body: some View {
        CatchUpPage(
            conversation: conversation, honestLine: honestLine, session: session, end: end, reply: reply,
            name: "", isTop: isTop, foregroundTick: foregroundTick
        )
    }
}

// MARK: - The seam to Door/

/// The kept pairing's four reads (Phase 316.7's Sessions read the fourth) and
/// three writes (End, and Phase 318's press and message), through the one
/// network user, and since Phase 337 each session's Screen door. It is its
/// own writer, answered through `DoorReading`'s requirement, so the app's
/// `any DoorReading` reads it; and since Phase 346 its own starter, the same
/// way.
struct PairedReader: DoorReading, DoorWriting, DoorStarting {
    let client: DoorClient
    let door: PairedDoor

    var writer: (any DoorWriting)? {
        self
    }

    /// Phase 346: this pairing starts sessions on its Mac.
    var starter: (any DoorStarting)? {
        self
    }

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

    /// `GET /v1/sessions` (Phase 316.7).
    func sessions(_ query: SessionsQuery) async throws -> PocketSessionsAnswer {
        try await client.sessions(query, door: door)
    }

    /// `POST /v1/end`, once.
    func end(_ sessionId: String, batch: Bool) async -> WriteResult {
        await client.end(sessionId, batch: batch, door: door)
    }

    /// `POST /v1/choose`, once (Phase 318).
    func choose(_ sessionId: String, question: String, mark: String, marker: String) async -> WriteResult {
        await client.choose(sessionId, question: question, mark: mark, marker: marker, door: door)
    }

    /// `POST /v1/say`, once (Phase 318), under a kept say's id when `write`
    /// names one.
    func say(_ sessionId: String, text: String, write: String?) async -> SentWrite {
        await client.say(sessionId, text: text, write: write, door: door)
    }

    /// One session's Screen door (Phase 337): its poll and its keys, each on
    /// a kept connection of its own.
    func screenDoor(_ sessionId: String) -> (any ScreenDoor)? {
        PairedScreenDoor(client: client, door: door, sessionId: sessionId)
    }

    /// `POST /v1/start`, once (Phase 346), under a kept start's id when
    /// `write` names one.
    func start(project: String, agent: String, write: String?) async -> SentStart {
        await client.start(project: project, agent: agent, write: write, door: door)
    }
}

/// One session's Terminal through the kept pairing (Phase 337, widened in
/// 337.1): `GET /v1/screen` on the poll's kept line, `POST /v1/keys` on the
/// keys', and, since Phase 337.1, THE SIDE LINE (build/p3371/SPEC.md D30): a
/// third kept line carrying `GET /v1/scrollback`'s pages and the Terminal's
/// `GET /v1/session` re-reads, ONE EXCHANGE AT A TIME through its one gate,
/// because a second exchange on a busy line cancels the first
/// (Door/DoorClient.swift `DoorLine`). So a poll held by the Mac never waits
/// behind a key or a page, nor a key behind either. At rest it holds one
/// connection, two while he types, two while he scrolls back or the status
/// re-reads, and each kept line closes itself once idle 4 s.
final class PairedScreenDoor: ScreenDoor {
    let client: DoorClient
    let door: PairedDoor
    let sessionId: String
    private let poll = DoorLine(keeps: true)
    private let typing = DoorLine(keeps: true)
    /// Pages and status re-reads, one exchange at a time through `sideGate`.
    private let side = DoorLine(keeps: true)
    /// The side line's one gate: a page and a status re-read never overlap,
    /// the second waits for the first.
    private let sideGate = OneExchange()

    init(client: DoorClient, door: PairedDoor, sessionId: String) {
        self.client = client
        self.door = door
        self.sessionId = sessionId
    }

    /// A paired door takes keys.
    var writes: Bool { true }

    func read(since: String?) async throws -> PocketScreenAnswer {
        try await client.screen(sessionId, since: since, line: poll, door: door)
    }

    func keys(_ keys: [KeyItem], turn: String, dialog: String?) async -> WriteResult {
        await client.keys(sessionId, keys: keys, turn: turn, dialog: dialog, line: typing, door: door)
    }

    /// One page of the session's history, on the side line (Phase 337.1).
    func scrollback(from: Int, count: Int, depth: Int, wrap: Int, keep: ScrollbackKeep) async throws -> PocketScrollbackAnswer {
        let client = client
        let door = door
        let sessionId = sessionId
        let side = side
        return try await sideGate.run {
            try await client.scrollback(
                sessionId, from: from, count: count, depth: depth, wrap: wrap, keep: keep, line: side, door: door
            )
        }
    }

    /// The Terminal's status re-read, on the side line (Phase 337.1, D17).
    func session() async throws -> PocketSessionAnswer {
        let client = client
        let door = door
        let sessionId = sessionId
        let side = side
        return try await sideGate.run {
            try await client.session(sessionId, door: door, line: side)
        }
    }

    /// Close all three kept lines now (the Terminal went away, or the app).
    func close() {
        poll.close()
        typing.close()
        side.close()
    }
}

/// One exchange at a time (Phase 337.1, D30): a second `run` waits until the
/// first has ended, in the order they came. It holds no answer and no request,
/// and gives every exchange its own task's cancellation.
actor OneExchange {
    private var busy = false
    private var waiting: [CheckedContinuation<Void, Never>] = []

    func run<T: Sendable>(_ exchange: @Sendable () async throws -> T) async throws -> T {
        await enter()
        defer { leave() }
        return try await exchange()
    }

    private func enter() async {
        guard busy else {
            busy = true
            return
        }
        await withCheckedContinuation { waiting.append($0) }
    }

    private func leave() {
        guard !waiting.isEmpty else {
            busy = false
            return
        }
        waiting.removeFirst().resume()
    }
}

/// Door/ as the app uses it: the one network user over the transport this
/// build ships with, the kept pairings (one per Mac since Phase 345), and the
/// client keys.
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

    /// The first kept pairing's reads, or nil when there is none or it no
    /// longer reads back whole.
    func pairedReader() -> (any DoorReading)? {
        guard let door = store.load() else { return nil }
        return PairedReader(client: client, door: door)
    }

    /// Every kept pairing's reads, one per Mac, in the store's order
    /// (Phase 345, D9). Each holds its own pairing; nothing is pooled across
    /// them but the one network user, which keeps no connection between two
    /// doors.
    func pairedReaders() -> [any DoorReading] {
        store.loadAll().map { door -> any DoorReading in PairedReader(client: client, door: door) }
    }

    /// The code is read, then, before any key is made, the cap: a fifth Mac
    /// is refused here with nothing minted or presented, and a Mac already
    /// kept may always pair again (Phase 345, D12).
    func begin(payload: String, label: String) throws -> PendingPairing {
        let offer = try PairingOffer.parse(payload)
        guard store.admits(offer.door.name) else { throw PairingFailure.macLimit }
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

    /// The DEBUG forget seam's: every Mac. Unchanged, and NOT Unpair's: it
    /// swallows a failure, which Unpair must not.
    func forget() {
        try? store.forget()
    }

    /// Unpair this iPhone from the Mac named `name` (Phase 345: that Mac
    /// alone): the store forgets its record first, then its client key. A
    /// record whose removal throws, or that still reads back (or cannot be
    /// read), is `.kept`, and the screen says nothing changed. Every other
    /// Mac's pairing is untouched.
    func unpair(name: String) -> UnpairOutcome {
        do {
            try store.forget(name: name)
        } catch {
            return .kept
        }
        return store.holdsRecord(name: name) ? .kept : .forgotten
    }
}
