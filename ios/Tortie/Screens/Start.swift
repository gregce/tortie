// New session, on the Mac on screen: start ONE session from the phone
// (Phase 346, build/p346/SPEC.md sections 3.1 and 4.15, D11, D17, D20 to
// D25, D27, D28).
//
// WHAT IT SENDS. Two ids the Mac offered, the project's and the agent's, and a
// write id, through `POST /v1/start` (Door/DoorClient.swift). Nothing on the
// phone chooses a path, a flag, a name, a login or a machine: the Mac re-reads
// both ids and builds exactly the session its own one-press create builds,
// with its own launch defaults. The offer it chose from is the Mac's too, read
// from the Sessions tab's answer (`PocketSessionsStart`), so the "+" and this
// sheet can never disagree about what may be started.
//
// NO FACE ID, TOUCH ID OR PASSCODE (his answer 5, "no face id to start a
// session"). THE RISK HE ACCEPTED, stated where it is made: a lost, unlocked
// phone whose Mac has every session ended can start an agent here and then
// type into it, which it could not do before this phase.
//
// THE RUNNER. Every Create is ONE `StartRunner`: made at the press, registered
// with the app BEFORE its task starts, its project, agent and id fixed there,
// and its `run` the app's ONLY call of the starter's `start`. The app stops
// every live runner when it goes to the background (`AppModel.wentAway`),
// which withholds a start whose bytes were not yet handed to the connection.
// Nothing keeps the app running to finish one, and nothing retries, queues or
// stores one: a start either happened once or did not, and Sessions, read
// again, says which.
//
// THE KEPT START (D17). A start whose answer did not come may still have
// started the session. So the Mac it was sent to keeps, in memory
// (`MacSpace.keptStart`), the id it went with beside the project and the
// agent, and Create becomes Try again: the same Mac, project and agent within
// 60 seconds send THAT id, once per press, and the Mac answers what it
// recorded instead of starting a second session. Another choice, 60 seconds or
// the app leaving forget it. Sessions is read again BEFORE Try again is
// offered. The Mac's ledger is memory: a Mac that relaunched between the two
// can start a second session, which Tortie never ends (ending is his).
//
// DONE (D24). The sheet closes, the session opens on the Sessions tab of the
// Mac that started it (`AppModel.openStarted`), and Sessions reads again.
// From the done answer until the sheet is gone the model stays `.done`, Create
// reads `Creating…` and cannot be pressed, so a press inside the dismissal
// never sends a fresh write id (the ruled round).
// Anything else keeps the sheet with one line: the Mac's own sentence, or the
// phone's for an answer that did not come, and Sessions reads again so the
// offer refreshes.

import Foundation
import Observation

// MARK: - The runner

/// Where the app keeps every live start runner, so a trip to the background
/// stops each one. `AppModel` is the app's.
@MainActor
protocol StartRunnerRegistry: AnyObject {
    func registerStart(_ runner: StartRunner)
    func releaseStart(_ runner: StartRunner)
}

/// One start, from the press to its answer.
@MainActor
final class StartRunner {
    /// The project's id, as the offer carried it, fixed at the press.
    let project: String
    /// The agent's id, as the offer carried it, fixed at the press.
    let agent: String
    /// Nil for a new start, or a kept start's id (`KeptStart`).
    let write: String?
    private let starter: any DoorStarting
    /// Set by `stop()` and never cleared: a runner stopped before it ran
    /// sends nothing.
    private(set) var stopRequested = false
    /// The press's own task.
    var task: Task<Void, Never>?

    init(project: String, agent: String, write: String?, starter: any DoorStarting) {
        self.project = project
        self.agent = agent
        self.write = write
        self.starter = starter
    }

    /// Stop: no start is sent, and one whose bytes were not yet handed to the
    /// connection is withheld.
    func stop() {
        stopRequested = true
        task?.cancel()
    }

    /// ONE awaited start through the starter, the app's only call of its
    /// `start`. Never repeated.
    func run() async -> SentStart {
        guard !stopRequested else { return SentStart(result: .notSent(.cancelled), write: nil) }
        return await starter.start(project: project, agent: agent, write: write)
    }
}

// MARK: - The kept start

/// A start whose answer did not come: the Mac it went to, its project and
/// agent, the id it went with, and when it was sent (D17). In memory only, on
/// that Mac's space.
struct KeptStart: Equatable, Sendable {
    /// How long a kept start's id is sent again, counted from when it was
    /// sent: inside the Mac ledger's life (120 s, counted from when the Mac
    /// RECORDED the first, which is after it was sent). Read at Create, never
    /// by a timer.
    static let window: TimeInterval = 60

    let mac: String
    let project: String
    let agent: String
    let write: String
    let at: Date

    /// Whether a Create of `project` with `agent` on `mac` at `now` sends this
    /// id again: the same three, sent less than `window` ago by this phone's
    /// own clock (a clock that went backwards keeps nothing).
    func holds(mac: String, project: String, agent: String, at now: Date) -> Bool {
        guard self.mac == mac, self.project == project, self.agent == agent else { return false }
        let age = now.timeIntervalSince(at)
        return age >= 0 && age < Self.window
    }
}

/// Where a Mac keeps its one kept start, in memory: `MacSpace`, so switching
/// Macs never sends one Mac's id to another (D27).
@MainActor
protocol StartKeeping: AnyObject {
    var keptStart: KeptStart? { get set }
}

// MARK: - What the sheet is handed

/// New session, for the Mac on screen (D27): its starter, the app's registry,
/// the space that keeps its one kept start, and where a done start opens.
@MainActor
struct StartSetup {
    /// The Mac's whole public name: the space that started it.
    let mac: String
    let starter: any DoorStarting
    let registry: any StartRunnerRegistry
    let keeper: any StartKeeping
    /// See a sample (D28): every Create says nothing ran.
    let sample: Bool
    /// Done: the session the Mac made, opened on that Mac's Sessions tab
    /// (`AppModel.openStarted(mac:id:name:)`).
    let opened: @MainActor (_ id: String, _ name: String) -> Void
}

// MARK: - What the sheet draws, decided before anything is laid out

/// New session as drawn: pure, so the tests read every state of it. Main's
/// order everywhere: the projects as the offer lists them, the marks in the
/// order the chosen place lists its agents (the registry's).
struct StartDrawing: Equatable, Sendable {
    /// One project in the Project menu.
    struct ProjectRow: Equatable, Identifiable, Sendable {
        let id: String
        /// Its label.
        let title: String
        /// Its machine, its folder and, for a machine Tortie is not connected
        /// to, `Not connected`, joined; nil when there is none.
        let detail: String?
        /// Whether it can be chosen: its place is ready.
        let choosable: Bool
    }

    /// One agent's mark.
    struct Mark: Equatable, Identifiable, Sendable {
        let id: String
        let name: String
        let icon: String
        let chosen: Bool
    }

    let projects: [ProjectRow]
    /// The project chosen now, or nil.
    let project: ProjectRow?
    /// The marks of exactly the agents installed where the chosen project
    /// lives (his answer 6), and nothing else.
    let marks: [Mark]
    /// The chosen agent's name, under the marks.
    let agentName: String?
    /// `Starts with …`, when the chosen agent has a sealed safeguard-off
    /// launch default.
    let danger: String?
    /// The line for a state with nothing to create: no project, agents not
    /// read yet, or none installed there. Nil otherwise.
    let state: String?
    /// Whether Create can be pressed: a chosen project whose place is ready,
    /// and a chosen agent installed there.
    let canCreate: Bool

    init(offer: PocketStartOffer, project chosenProject: String?, agent chosenAgent: String?) {
        projects = offer.projects.map { project in
            let ready = offer.place(of: project)?.ready ?? false
            var parts: [String] = []
            if let machine = project.machine { parts.append(machine) }
            if let folder = project.folder { parts.append(folder) }
            if !ready { parts.append(Copy.startNotConnected) }
            return ProjectRow(
                id: project.id, title: project.label, detail: parts.isEmpty ? nil : Copy.joined(parts), choosable: ready
            )
        }
        let row = projects.first { $0.id == chosenProject && $0.choosable }
        project = row
        let listed = offer.projects.first { $0.id == row?.id }
        let place = listed.flatMap { offer.place(of: $0) }
        let installed = (place?.read ?? false) ? (place?.agents ?? []) : []
        marks = installed.compactMap { id in
            offer.agent(id).map { Mark(id: $0.id, name: $0.name, icon: $0.icon, chosen: $0.id == chosenAgent) }
        }
        let agent = marks.first { $0.chosen }.flatMap { offer.agent($0.id) }
        agentName = agent?.name
        danger = agent?.danger.map(Copy.startsWithLabels)
        if offer.projects.isEmpty {
            state = Copy.startNoProject
        } else if let place, !place.read {
            state = Copy.startNotRead
        } else if row != nil, marks.isEmpty {
            state = Copy.startNoAgent
        } else {
            state = nil
        }
        canCreate = row != nil && agent != nil
    }

    /// The project New session opens on (D10): main's chosen one when it can
    /// be chosen, else the first that can, else none.
    static func firstProject(_ offer: PocketStartOffer) -> String? {
        let choosable = { (project: PocketStartProject) -> Bool in offer.place(of: project)?.ready ?? false }
        if let chosen = offer.chosen, let project = offer.projects.first(where: { $0.id == chosen }), choosable(project) {
            return chosen
        }
        return offer.projects.first(where: choosable)?.id
    }

    /// The agent chosen for `project` (D11): `keeping` when that project's
    /// place lists it, else the Mac's default agent when it does, else the
    /// place's first agent, else none.
    static func agent(for project: String?, in offer: PocketStartOffer, keeping: String?) -> String? {
        guard let listed = offer.projects.first(where: { $0.id == project }),
              let place = offer.place(of: listed), place.read else { return nil }
        if let keeping, place.agents.contains(keeping) { return keeping }
        if let preferred = offer.defaultAgent, place.agents.contains(preferred) { return preferred }
        return place.agents.first
    }
}

// MARK: - The model

@MainActor
@Observable
final class StartModel: Identifiable {
    enum Phase: Equatable {
        case idle
        /// A start is under way.
        case starting
        /// The Mac answered done and the sheet is closing onto the session it
        /// made (Phase 346's ruled round). Never left: the model goes with
        /// the sheet, so Create cannot be pressed during the dismissal and
        /// send a fresh write id, which would start a second session.
        case done
    }

    /// The offer the sheet chooses from: the Sessions tab's latest.
    private(set) var offer: PocketStartOffer
    /// The project chosen, by the Mac's id.
    private(set) var project: String?
    /// The agent chosen, by its registry id.
    private(set) var agent: String?
    private(set) var phase: Phase = .idle
    /// The line after a start, or nil. Never empty.
    private(set) var line: String?
    /// The last start's task, held so a test can wait for it. Never drawn
    /// from.
    @ObservationIgnored private(set) var running: Task<Void, Never>?

    private let mac: String
    private let starter: any DoorStarting
    private let registry: any StartRunnerRegistry
    private let keeper: any StartKeeping
    private let sample: Bool
    private let clock: @Sendable () -> Date

    init(offer: PocketStartOffer, setup: StartSetup, clock: @escaping @Sendable () -> Date = { Date() }) {
        self.offer = offer
        mac = setup.mac
        starter = setup.starter
        registry = setup.registry
        keeper = setup.keeper
        sample = setup.sample
        self.clock = clock
        let first = StartDrawing.firstProject(offer)
        project = first
        agent = StartDrawing.agent(for: first, in: offer, keeping: nil)
    }

    /// What the sheet draws now.
    var drawing: StartDrawing {
        StartDrawing(offer: offer, project: project, agent: agent)
    }

    /// Create's word: `Creating…` while a start runs and while the sheet
    /// closes after it was done, `Try again` while a kept start holds for this
    /// Mac, project and agent (D17), else `Create`.
    var createWord: String {
        if phase != .idle { return Copy.creating }
        return kept(at: clock()) == nil ? Copy.create : Copy.tryAgain
    }

    /// Whether Create can be pressed now.
    var canCreate: Bool {
        phase == .idle && drawing.canCreate
    }

    // MARK: Choosing

    /// Another project, one whose place is ready. The agent stays when that
    /// place lists it (D11). Another choice forgets a kept start (D17).
    func choose(project id: String) {
        guard phase == .idle, id != project,
              let listed = offer.projects.first(where: { $0.id == id }),
              offer.place(of: listed)?.ready == true else { return }
        project = id
        agent = StartDrawing.agent(for: id, in: offer, keeping: agent)
        line = nil
        keeper.keptStart = nil
    }

    /// Another agent, one installed where the chosen project lives.
    func choose(agent id: String) {
        guard phase == .idle, id != agent, drawing.marks.contains(where: { $0.id == id }) else { return }
        agent = id
        line = nil
        keeper.keptStart = nil
    }

    /// The Sessions tab read again and the Mac offered this: the choices stay
    /// where it still lists them, and are made again where it does not.
    func refresh(_ newer: PocketStartOffer) {
        offer = newer
        let listed = newer.projects.first { $0.id == project }
        if listed.flatMap({ newer.place(of: $0) })?.ready != true {
            project = StartDrawing.firstProject(newer)
        }
        agent = StartDrawing.agent(for: project, in: newer, keeping: agent)
    }

    // MARK: Create

    /// Start the chosen project with the chosen agent, as ONE runner. Nothing
    /// is asked first (his answer 5). Does nothing while a start runs, or with
    /// nothing to start. `reread` reads the Sessions tab again; `opened` closes
    /// the sheet and opens the session the Mac made, and is called ONLY when
    /// it answers done.
    func create(reread: @escaping @MainActor () async -> Void, opened: @escaping @MainActor (_ id: String, _ name: String) -> Void) {
        guard phase == .idle, drawing.canCreate, let project, let agent else { return }
        let at = clock()
        let reusing = kept(at: at)
        if reusing == nil { keeper.keptStart = nil }
        let runner = StartRunner(project: project, agent: agent, write: reusing?.write, starter: starter)
        registry.registerStart(runner)
        let registry = registry
        phase = .starting
        line = nil
        let task = Task { [weak self] in
            let sent = await runner.run()
            await self?.afterStart(sent, project: project, agent: agent, at: at, reusing: reusing, reread: reread, opened: opened)
            // A done start stays `.done` until the sheet is gone with it.
            if self?.phase == .starting { self?.phase = .idle }
            registry.releaseStart(runner)
        }
        runner.task = task
        running = task
    }

    /// The kept start a Create of the chosen project and agent sends again
    /// now, or nil.
    private func kept(at now: Date) -> KeptStart? {
        guard let kept = keeper.keptStart, let project, let agent,
              kept.holds(mac: mac, project: project, agent: agent, at: now) else { return nil }
        return kept
    }

    /// What the sheet does once a start ended, what is kept, and the read that
    /// follows.
    private func afterStart(
        _ sent: SentStart,
        project: String,
        agent: String,
        at: Date,
        reusing: KeptStart?,
        reread: @MainActor () async -> Void,
        opened: @MainActor (_ id: String, _ name: String) -> Void
    ) async {
        switch sent.result {
        case .answered(let answer) where answer.outcome == .done:
            // Done: the sheet closes onto the session the Mac made, and
            // Sessions reads again under it.
            keeper.keptStart = nil
            line = nil
            if let session = answer.session {
                // Create stays off from here until the sheet is gone (the
                // ruled round): the dismissal animates, and a press inside it
                // would send a fresh id and start a second session.
                phase = .done
                opened(session.id, session.name)
            }
            await reread()
        case .answered(let answer):
            // Busy on a kept id: the first may still be starting, so it is
            // asked about by that id again. Every other answer forgets it.
            keeper.keptStart = answer.outcome == .busy ? reusing : nil
            line = DoorWords.startSentence(for: sent.result, sample: sample)
            await reread()
        case .noAnswer:
            // It may have started: keep the id it went with, read Sessions
            // FIRST, then offer Try again under that id.
            keeper.keptStart = reusing ?? sent.write.map { KeptStart(mac: mac, project: project, agent: agent, write: $0, at: at) }
            await reread()
            line = DoorWords.startSentence(for: sent.result, sample: sample)
        case .notTaken:
            keeper.keptStart = nil
            line = DoorWords.startSentence(for: sent.result, sample: sample)
            await reread()
        case .notSent:
            // Not an answer: nothing reached the Mac, so a kept id stays kept.
            line = DoorWords.startSentence(for: sent.result, sample: sample)
            await reread()
        }
    }
}
