import Foundation
import XCTest
@testable import Tortie

/// What the Sessions tab keeps, and the words it sends (Phase 316.7,
/// build/p3167/SPEC.md D3, D13, section 6.4.2 and 6.4.4). Each test runs on a
/// suite of its own, removed in tearDown, so nothing here touches the app's
/// own defaults. Each test names the clause it holds, and each fails when that
/// clause is taken out of Screens/SessionsChoices.swift or
/// Door/DoorClient.swift.
@MainActor
final class SessionsChoicesTests: XCTestCase {
    private var suite = ""
    private var defaults: UserDefaults!

    override func setUp() async throws {
        suite = "tortie-tests-sessions-" + UUID().uuidString
        defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
    }

    override func tearDown() async throws {
        defaults.removePersistentDomain(forName: suite)
        defaults = nil
    }

    private var keptKeys: Set<String> {
        Set((defaults.persistentDomain(forName: suite) ?? [:]).keys)
    }

    /// Clause: three keys, each holding its word as the contract spells it,
    /// read back as written.
    func testThreeKeysHoldTheContractsWords() {
        let store = KeptSessionsWords(defaults: defaults)
        XCTAssertEqual(store.load(), .standard, "a fresh install is Active, Project, Recent activity")
        XCTAssertEqual(SessionsWords.standard, SessionsWords(show: .active, group: .project, sort: .recent))
        let words = SessionsWords(show: .ended, group: .none, sort: .oldest)
        store.save(words)
        XCTAssertEqual(keptKeys, ["tortie.sessions.show", "tortie.sessions.group", "tortie.sessions.sort"])
        XCTAssertEqual(defaults.string(forKey: "tortie.sessions.show"), "ended")
        XCTAssertEqual(defaults.string(forKey: "tortie.sessions.group"), "none")
        XCTAssertEqual(defaults.string(forKey: "tortie.sessions.sort"), "oldest")
        XCTAssertEqual(KeptSessionsWords(defaults: defaults).load(), words, "a relaunch did not keep the three words")
    }

    /// Clause: anything that is not one of the contract's words reads the
    /// default, a planted `bogus` included, each key on its own.
    func testAPlantedWordReadsTheDefault() {
        defaults.set("bogus", forKey: "tortie.sessions.show")
        defaults.set("Project", forKey: "tortie.sessions.group")
        defaults.set(7, forKey: "tortie.sessions.sort")
        XCTAssertEqual(KeptSessionsWords(defaults: defaults).load(), .standard)
        defaults.set("all", forKey: "tortie.sessions.show")
        XCTAssertEqual(KeptSessionsWords(defaults: defaults).load(), SessionsWords(show: .all, group: .project, sort: .recent))
    }

    /// Clause: a filter is never kept, and neither is a project opened or
    /// closed, nor anything the door answered: only the three words.
    func testFiltersAreNeverKept() async throws {
        let reader = SessionsReader(blocked: [.success(Answers.blocked())])
        let model = SessionsModel(door: reader, list: ListModel(door: reader, routing: .stay), store: KeptSessionsWords(defaults: defaults))
        await model.load()
        guard case .loaded(let drawing) = model.state else { return XCTFail("\(model.state)") }
        model.toggle(drawing.groups[0])
        await model.choose(agent: "codex")
        await model.choose(machine: "local")
        XCTAssertEqual(keptKeys, [], "a filter or a project was kept")
        await model.choose(show: .ended)
        XCTAssertEqual(keptKeys, ["tortie.sessions.show", "tortie.sessions.group", "tortie.sessions.sort"])
        let relaunched = SessionsModel(door: reader, list: ListModel(door: reader, routing: .stay), store: KeptSessionsWords(defaults: defaults))
        XCTAssertEqual(relaunched.words.show, .ended)
        XCTAssertNil(relaunched.agent)
        XCTAssertNil(relaunched.machine)
        XCTAssertEqual(relaunched.opened, [:])
    }

    /// Clause: the one builder of a `/v1/sessions` target writes the three
    /// words always, in the order show, group, sort, then the agent and the
    /// machine only when set, every value through `queryValue`.
    func testTheSessionsTargetIsSpelledOnce() {
        XCTAssertEqual(DoorClient.sessionsTarget(.standard), "/v1/sessions?show=active&group=project&sort=recent")
        let every = SessionsQuery(show: .ended, group: .none, sort: .oldest, agent: "claude", machine: "local")
        XCTAssertEqual(DoorClient.sessionsTarget(every), "/v1/sessions?show=ended&group=none&sort=oldest&agent=claude&machine=local")
        let machineOnly = SessionsQuery(show: .all, group: .project, sort: .name, agent: nil, machine: "studio-pro")
        XCTAssertEqual(DoorClient.sessionsTarget(machineOnly), "/v1/sessions?show=all&group=project&sort=name&machine=studio-pro")
        // An id the door would refuse is still sent as its own bytes, never
        // as a second parameter: the door refuses it whole.
        let odd = SessionsQuery(show: .active, group: .project, sort: .recent, agent: "a&machine=b", machine: nil)
        XCTAssertEqual(DoorClient.sessionsTarget(odd), "/v1/sessions?show=active&group=project&sort=recent&agent=a%26machine%3Db")
    }

    /// Clause: the words are the contract's, in its order.
    func testTheWordsAreTheContracts() {
        XCTAssertEqual(SessionsShow.allCases.map(\.rawValue), ["all", "active", "ended"])
        XCTAssertEqual(SessionsGroupBy.allCases.map(\.rawValue), ["project", "none"])
        XCTAssertEqual(SessionsSortBy.allCases.map(\.rawValue), ["recent", "name", "oldest"])
        XCTAssertEqual(SessionsShow.allCases.map(\.word), [Copy.showAll, Copy.showActive, Copy.ended])
        XCTAssertEqual(SessionsGroupBy.allCases.map(\.word), [Copy.groupProject, Copy.groupNone])
        XCTAssertEqual(SessionsSortBy.allCases.map(\.word), [Copy.sortRecent, Copy.sortName, Copy.sortOldest])
    }
}
