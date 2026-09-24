import Foundation
import Security
import UIKit
import XCTest
@testable import Tortie

/// `Tailnet/Node.swift`, the tailnet node inside the app (build/p316/SPEC.md
/// section 4 S3; research 128). NO NODE IN THESE TESTS CONTACTS ANYBODY: each
/// runs over a stand-in engine (`StandInEngine`) in place of TailscaleKit, so
/// a refused join is the node's error INJECTED through the engine seam, and
/// the state directory is a fresh one under the test's own temporary folder.
///
/// Each test names the clause it holds and fails when that clause is taken out
/// of Node.swift (or of the file it names).
final class TailnetNodeTests: XCTestCase {
    private var root: URL!
    private var directory: TailnetDirectory!
    private let control = "https://control.p316.invalid"

    override func setUpWithError() throws {
        root = FileManager.default.temporaryDirectory
            .appendingPathComponent("p316-tailnet-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        directory = TailnetDirectory(url: root.appendingPathComponent(TailnetRules.directoryName, isDirectory: true))
    }

    /// Every node a test made is sent to the background at its end, so no
    /// stand-in is left coming up after the test that made it.
    override func tearDown() async throws {
        for made in nodes {
            made.presence.set(foreground: false)
            await made.settle()
        }
        nodes = []
        try? FileManager.default.removeItem(at: root)
    }

    private var nodes: [TailnetNode] = []

    private func node(
        _ engine: StandInEngine,
        limits: TailnetLimits = TailnetLimits(join: .seconds(5), up: .seconds(5)),
        control: String? = nil
    ) -> TailnetNode {
        let place = directory!
        let made = TailnetNode(engine: engine, place: { place }, controlURL: control ?? self.control, limits: limits)
        nodes.append(made)
        return made
    }

    /// A made-up key, unique per test, shaped like his.
    private func madeUpKey() -> String {
        "tskey-auth-p316madeup-" + UUID().uuidString
    }

    /// Clause (conformance:ios rule p): the start that carries the key for a
    /// first join never repeats it, to `print`, `dump`, interpolation or
    /// `Mirror`. Fails when `TailnetStart`'s `customMirror` is taken out.
    func testTheStartNeverRepeatsItsKey() {
        let key = madeUpKey()
        let start = TailnetStart(hostName: TailnetRules.hostName, directory: "/p316", authKey: key, controlURL: "p316-control")
        let said = everythingSaid(about: start)
        XCTAssertFalse(said.contains(key), said)
        XCTAssertFalse(said.contains("authKey"), said)
        XCTAssertTrue(said.contains(TailnetRules.hostName), "the description says nothing at all: \(said)")
    }

    /// A directory a join succeeded in: tsnet's state and the mark.
    private func joinedAlready() throws {
        try directory.prepare()
        try Data("state".utf8).write(to: directory.url.appendingPathComponent(TailnetRules.stateFileName))
        try directory.markJoined()
        XCTAssertTrue(directory.hasJoined)
    }

    // MARK: (c) tortie-phone, never ephemeral

    /// Clause (c): the node is `tortie-phone`, and the configuration the app's
    /// engine hands TailscaleKit is NOT ephemeral, with or without a key. Read
    /// back from the same function the engine calls.
    func testTheNodeIsTortiePhoneAndNeverEphemeral() async throws {
        XCTAssertEqual(TailnetRules.hostName, "tortie-phone")
        let engine = StandInEngine(up: .joins)
        try await node(engine).join(key: madeUpKey())
        let start = try XCTUnwrap(engine.starts.first)
        XCTAssertEqual(start.hostName, "tortie-phone")
        XCTAssertEqual(start.directory, directory.path)
        XCTAssertEqual(start.controlURL, control)

        for key in [madeUpKey(), nil] {
            let configured = TailnetConfigured.of(
                TailnetStart(hostName: TailnetRules.hostName, directory: directory.path, authKey: key, controlURL: control)
            )
            XCTAssertEqual(configured.hostName, "tortie-phone")
            XCTAssertFalse(configured.ephemeral, "an ephemeral node is deleted within the hour a phone is unseen")
            XCTAssertEqual(configured.hasKey, key != nil)
            XCTAssertEqual(configured.path, directory.path)
            XCTAssertEqual(configured.controlURL, control)
        }
    }

    // MARK: (b) The state, in Application Support, out of every backup

    /// Clause (b): the app's state is `Application Support/tailnet/`, in the
    /// app's own container, and not Caches, tmp or Documents.
    func testTheStateLivesInApplicationSupportTailnet() throws {
        let support = try FileManager.default.url(
            for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: false
        )
        let standard = try TailnetDirectory.standard()
        XCTAssertEqual(standard.url.lastPathComponent, "tailnet")
        XCTAssertEqual(
            standard.url.deletingLastPathComponent().standardizedFileURL.path(percentEncoded: false),
            support.standardizedFileURL.path(percentEncoded: false)
        )
    }

    /// Clause (b): the directory is excluded from backup every time it is
    /// made, including after it was removed, and by the node's own paths: the
    /// foreground and a join.
    func testTheStateIsExcludedFromBackupEveryTimeItIsMade() async throws {
        try directory.prepare()
        XCTAssertEqual(directory.isExcludedFromBackup, true)
        directory.discard()
        XCTAssertNil(directory.isExcludedFromBackup, "the flag reads a directory that is gone")
        try directory.prepare()
        XCTAssertEqual(directory.isExcludedFromBackup, true, "a directory made again is excluded again")

        // The foreground makes it ready with no node at all.
        directory.discard()
        let idle = node(StandInEngine(up: .joins))
        await idle.settle()
        XCTAssertEqual(directory.isExcludedFromBackup, true)

        // A join makes it ready before tsnet writes a byte.
        directory.discard()
        XCTAssertNil(directory.isExcludedFromBackup)
        let engine = StandInEngine(up: .joins)
        try await node(engine).join(key: madeUpKey())
        XCTAssertEqual(engine.excludedAtStart, [true])
        XCTAssertEqual(directory.isExcludedFromBackup, true)
    }

    // MARK: (d) The key

    /// Clause (d): no state and no key refuses with the pairing's sentence at
    /// once, and NOTHING STARTS, so nothing contacts Tailscale.
    func testNoStateAndNoKeyRefusesBeforeAnythingStarts() async throws {
        let engine = StandInEngine(up: .joins)
        let tailnet = node(engine)
        let began = Date()
        do {
            try await tailnet.join(key: nil)
            XCTFail("a node with no state joined with no key")
        } catch {
            XCTAssertEqual(error as? TailnetRefusal, .noKey)
        }
        do {
            try await tailnet.prepareToPair(host: "100.64.0.1", key: nil)
            XCTFail("a pairing went on with no key and no state")
        } catch {
            XCTAssertEqual(error as? PairingFailure, .noTailnetKey)
            XCTAssertEqual(DoorWords.pairingSentence(for: .noTailnetKey), Copy.tailnetNoKey)
        }
        XCTAssertLessThan(Date().timeIntervalSince(began), 1, "the refusal waits for nothing")
        XCTAssertTrue(engine.starts.isEmpty, "a node started with neither state nor key")
        XCTAssertFalse(directory.hasJoined)
    }

    /// Clause (d): with no state, the node joins ONCE with the code's key, and
    /// the Go side's copy is overwritten after the join and before the node is
    /// used. Then it is joined, and reads take its proxy.
    func testWithNoStateItJoinsOnceWithTheKey() async throws {
        let key = madeUpKey()
        let engine = StandInEngine(up: .joins)
        let tailnet = node(engine)
        try await tailnet.join(key: key)
        XCTAssertEqual(engine.starts.map(\.authKey), [key])
        XCTAssertEqual(engine.events, ["start with a key", "up", "forget the key"])
        XCTAssertTrue(directory.hasJoined)
        XCTAssertTrue(tailnet.reaches("100.64.0.1"))

        let route = try await tailnet.route(to: "100.64.0.1")
        XCTAssertEqual(route, .socks5(host: StandInEngine.proxy.host, port: StandInEngine.proxy.port, username: "tsnet", password: StandInEngine.proxy.credential))
        XCTAssertEqual(engine.starts.count, 1, "a read after the join started a second node")
    }

    /// Clause (d): with state, the code's key is ignored: never handed to a
    /// start, and the node comes up from its state.
    func testWithStateTheKeyIsIgnored() async throws {
        try joinedAlready()
        let key = madeUpKey()
        let engine = StandInEngine(up: .joins)
        let tailnet = node(engine)
        try await tailnet.prepareToPair(host: "100.64.0.1", key: key)
        _ = try await tailnet.route(to: "100.64.0.1")
        XCTAssertEqual(engine.starts.count, 1)
        XCTAssertEqual(engine.starts.map(\.authKey), [nil], "a node with state was handed the code's key")
        XCTAssertFalse(engine.events.contains("forget the key"))
    }

    /// Clause (d): the key is kept NOWHERE. After a join, not in any property
    /// of the node (followed down its stored values), not in any file under its
    /// directory, not in UserDefaults and, on the phone, not in the Keychain.
    func testTheKeyIsKeptNowhere() async throws {
        let key = madeUpKey()
        let engine = StandInEngine(up: .joins)
        let tailnet = node(engine)
        try await tailnet.join(key: key)
        _ = try await tailnet.route(to: "100.64.0.1")

        // The reader finds a key where one IS held: the stand-in records every
        // start it was handed, and the node holds the stand-in. So the node is
        // read with the stand-in left out, and the stand-in alone must be found.
        XCTAssertTrue(KeySearch.holds(tailnet, key), "the property reader cannot find a key at all")
        XCTAssertFalse(KeySearch.holds(tailnet, key, skipping: engine), "the node holds the key after the join")

        let bytes = Data(key.utf8)
        let walker = FileManager.default.enumerator(at: directory.url, includingPropertiesForKeys: nil)
        var files = 0
        while let file = walker?.nextObject() as? URL {
            XCTAssertFalse(file.lastPathComponent.contains(key))
            if let data = try? Data(contentsOf: file) {
                files += 1
                XCTAssertNil(data.range(of: bytes), "\(file.lastPathComponent) holds the key")
            }
        }
        XCTAssertGreaterThanOrEqual(files, 2, "the walk read neither the state nor the mark")

        for (name, value) in UserDefaults.standard.dictionaryRepresentation() {
            XCTAssertFalse(String(describing: value).contains(key), "UserDefaults \(name) holds the key")
        }
        #if os(iOS)
        XCTAssertFalse(KeySearch.keychainHolds(bytes), "the Keychain holds the key")
        #endif
    }

    // MARK: A join that fails

    /// Clause (d): a join Tailscale refuses (the backend's error, injected
    /// through the engine) says the key was refused, stops the node and keeps
    /// nothing, so the next code starts clean.
    func testARefusedJoinKeepsNothing() async throws {
        let engine = StandInEngine(up: .refuses)
        let tailnet = node(engine)
        do {
            try await tailnet.prepareToPair(host: "100.64.0.1", key: madeUpKey())
            XCTFail("a refused key joined")
        } catch {
            XCTAssertEqual(error as? PairingFailure, .tailnetKeyRefused)
        }
        XCTAssertEqual(DoorWords.pairingSentence(for: .tailnetKeyRefused), Copy.tailnetKeyRefused)
        XCTAssertEqual(engine.events, ["start with a key", "up", "stop"])
        XCTAssertFalse(FileManager.default.fileExists(atPath: directory.path), "a refused join left its state")
        XCTAssertFalse(tailnet.reaches("100.64.0.1"))
        await assertRefused(tailnet, .notPaired)
    }

    /// Clause (d): a join with no answer inside its limit says so, stops the
    /// node, and KEEPS the directory without the mark: Tailscale may have
    /// spent the one-off key, and a registered node joins again from its state.
    func testAJoinWithNoAnswerTimesOutAndKeepsItsState() async throws {
        let engine = StandInEngine(up: .never)
        let tailnet = node(engine, limits: TailnetLimits(join: .milliseconds(150), up: .seconds(5)))
        do {
            try await tailnet.prepareToPair(host: "100.64.0.1", key: madeUpKey())
            XCTFail("a join with no answer went on")
        } catch {
            XCTAssertEqual(error as? PairingFailure, .tailnetUnreachable)
        }
        XCTAssertEqual(DoorWords.pairingSentence(for: .tailnetUnreachable), Copy.tailnetUnreachable)
        XCTAssertTrue(engine.events.contains("stop"), "a join that timed out was left running")
        XCTAssertTrue(FileManager.default.fileExists(atPath: directory.path))
        XCTAssertFalse(directory.hasJoined)
    }

    /// Clause (a): a join under way when the app goes to the background is
    /// stopped, says nothing, and keeps its directory.
    func testAJoinTheBackgroundInterruptsSaysNothing() async throws {
        let engine = StandInEngine(up: .never)
        let tailnet = node(engine)
        let key = madeUpKey()
        let joining = Task { try await tailnet.prepareToPair(host: "100.64.0.1", key: key) }
        try await waitUntil { engine.events.contains("up") }
        tailnet.presence.set(foreground: false)
        await tailnet.settle()
        do {
            try await joining.value
            XCTFail("a join the background stopped went on")
        } catch {
            XCTAssertEqual(error as? PairingFailure, .cancelled)
            XCTAssertNil(DoorWords.pairingSentence(for: .cancelled))
        }
        XCTAssertTrue(engine.events.contains("stop"))
        XCTAssertTrue(FileManager.default.fileExists(atPath: directory.path))
    }

    /// A node that will not start: the pairing's own sentence.
    func testANodeThatWillNotStartIsOneSentence() async throws {
        let tailnet = node(StandInEngine(up: .joins, startFails: true))
        do {
            try await tailnet.prepareToPair(host: "100.64.0.1", key: madeUpKey())
            XCTFail("a node that did not start joined")
        } catch {
            XCTAssertEqual(error as? PairingFailure, .tailnetUnavailable)
        }
        XCTAssertEqual(DoorWords.pairingSentence(for: .tailnetUnavailable), Copy.tailnetUnavailable)
    }

    // MARK: (a) Foreground only

    /// Clause (a): the node starts when the app becomes active and stops when
    /// it enters the background, from the notifications alone; a read in the
    /// background starts nothing; the next foreground starts it again.
    func testItStartsInTheForegroundAndStopsInTheBackground() async throws {
        try joinedAlready()
        let engine = StandInEngine(up: .joins)
        let tailnet = node(engine)
        let center = NotificationCenter()
        let observers = tailnet.follow(center)
        defer { observers.forEach(center.removeObserver) }

        center.post(name: UIApplicationNames.becameActive, object: nil)
        try await waitUntil { engine.events == ["start from state", "up"] }
        XCTAssertEqual(engine.starts.map(\.authKey), [nil])

        center.post(name: UIApplicationNames.enteredBackground, object: nil)
        try await waitUntil { engine.events.last == "stop" }
        await assertRefused(tailnet, .cancelled)
        XCTAssertEqual(engine.starts.count, 1, "a read in the background started the node")

        center.post(name: UIApplicationNames.becameActive, object: nil)
        try await waitUntil { engine.starts.count == 2 }
        _ = try await tailnet.route(to: "100.64.0.1")
    }

    /// Clause (a): no background mode is asked for (the shipping Info.plist)
    /// and the node never outlives the foreground: every node it started is
    /// stopped by the time the background has settled.
    func testTheBackgroundLeavesNoNodeRunning() async throws {
        try joinedAlready()
        let engine = StandInEngine(up: .joins)
        let tailnet = node(engine)
        _ = try await tailnet.route(to: "100.64.0.1")
        tailnet.presence.set(foreground: false)
        await tailnet.settle()
        XCTAssertEqual(engine.running, 0)
        XCTAssertNil(Bundle.main.object(forInfoDictionaryKey: "UIBackgroundModes"))
    }

    // MARK: (e) The route, and a node that does not come up

    /// Clause (e): a read waits for the node at most its limit, then says it
    /// could not reach the Mac, and LEAVES the node coming up: the next read
    /// waits on the same start rather than starting another.
    func testAReadWaitsForTheNodeAtMostItsLimit() async throws {
        try joinedAlready()
        let engine = StandInEngine(up: .never)
        let tailnet = node(engine, limits: TailnetLimits(join: .seconds(5), up: .milliseconds(150)))
        for _ in 0..<2 {
            do {
                _ = try await tailnet.route(to: "100.64.0.1")
                XCTFail("a node that never came up was routed through")
            } catch {
                guard case .unreachable? = error as? DoorFailure else { return XCTFail("\(error)") }
                XCTAssertEqual(DoorWords.sentence(for: error), Copy.cannotReachMac)
            }
        }
        XCTAssertEqual(engine.starts.count, 1)
        XCTAssertFalse(engine.events.contains("stop"))
    }

    /// Clause (e): the route through the node never fails over to a direct
    /// connection to the tailnet address.
    func testTheNodesRouteNeverFailsOver() async throws {
        try joinedAlready()
        let route = try await node(StandInEngine(up: .joins)).route(to: "100.64.0.1")
        let configuration = DoorClient.configuration(route, limits: .standard)
        XCTAssertEqual(configuration.proxyConfigurations.count, 1)
        XCTAssertEqual(configuration.proxyConfigurations.first?.allowFailover, false)
    }

    // MARK: A node that is gone

    /// SPEC S3: "when ... the node is gone, the phone goes to Pairing with one
    /// line". Its state removed while it runs: the next read stops it and
    /// refuses as not paired, which the list turns into Pairing.
    func testANodeWhoseStateIsRemovedGoesToPairing() async throws {
        try joinedAlready()
        let engine = StandInEngine(up: .joins)
        let tailnet = node(engine)
        _ = try await tailnet.route(to: "100.64.0.1")
        directory.discard()
        XCTAssertFalse(tailnet.reaches("100.64.0.1"))
        await assertRefused(tailnet, .notPaired)
        try await waitUntil { engine.events.last == "stop" }
        XCTAssertEqual(DoorWords.consequence(of: DoorFailure.notPaired, reading: .list), .pairAgain)
    }

    /// A node Tailscale forgot (removed from his Machines page) answers that it
    /// must log in again: the phone goes to Pairing, and the state is removed
    /// so the next code's key is used rather than ignored. A node that is only
    /// slow keeps its state.
    func testANodeTailscaleForgotGoesToPairing() async throws {
        try joinedAlready()
        let slow = StandInEngine(up: .never, backend: TailnetBackend(state: "Starting", hasLoginURL: false))
        await assertRefused(node(slow, limits: TailnetLimits(join: .seconds(5), up: .milliseconds(100))), .unreachable(code: NSURLErrorCannotConnectToHost))
        XCTAssertTrue(directory.hasJoined, "a slow node lost its state")

        let forgotten = StandInEngine(up: .never, backend: TailnetBackend(state: "NeedsLogin", hasLoginURL: true))
        let tailnet = node(forgotten, limits: TailnetLimits(join: .seconds(5), up: .milliseconds(100)))
        await assertRefused(tailnet, .notPaired)
        XCTAssertEqual(forgotten.events.last, "stop", "the forgotten node was left running")
        XCTAssertFalse(FileManager.default.fileExists(atPath: directory.path), "the forgotten node's state was kept")
        XCTAssertFalse(tailnet.reaches("100.64.0.1"))

        // Only a node Tailscale ANSWERED for is forgotten: a login state with no
        // login address is a node that has not reached Tailscale yet.
        try joinedAlready()
        let unanswered = StandInEngine(up: .never, backend: TailnetBackend(state: "NeedsLogin", hasLoginURL: false))
        await assertRefused(node(unanswered, limits: TailnetLimits(join: .seconds(5), up: .milliseconds(100))), .unreachable(code: NSURLErrorCannotConnectToHost))
        XCTAssertTrue(directory.hasJoined)

        // A backend that FAILED (Tailscale's own error) while it asks for a
        // login again is forgotten too; one that failed otherwise is started
        // again by the next read, its state kept.
        let failedOtherwise = StandInEngine(up: .refuses, backend: TailnetBackend(state: "Starting", hasLoginURL: false))
        await assertRefused(node(failedOtherwise), .unreachable(code: NSURLErrorCannotConnectToHost))
        // That stop is not waited for by the read; it ends in its own time.
        try await waitUntil { failedOtherwise.events.last == "stop" }
        XCTAssertTrue(directory.hasJoined)

        let failedForLogin = StandInEngine(up: .refuses, backend: TailnetBackend(state: "NeedsLogin", hasLoginURL: false))
        await assertRefused(node(failedForLogin), .notPaired)
        XCTAssertEqual(failedForLogin.events.last, "stop")
        XCTAssertFalse(FileManager.default.fileExists(atPath: directory.path))
    }

    // MARK: The words

    /// Every way the node ends a pairing has its one line, and leaving says
    /// nothing.
    func testEveryRefusalHasItsLine() {
        let lines: [(TailnetRefusal, String?)] = [
            (.noKey, Copy.tailnetNoKey),
            (.keyRefused, Copy.tailnetKeyRefused),
            (.joinTimedOut, Copy.tailnetUnreachable),
            (.couldNotStart, Copy.tailnetUnavailable),
            (.interrupted, nil)
        ]
        for (refusal, line) in lines {
            XCTAssertEqual(DoorWords.pairingSentence(for: refusal.pairingFailure), line, "\(refusal)")
        }
    }

    #if DEBUG
    // MARK: The DEBUG seams

    /// Clause (DEBUG seam): the Simulator's door on this Mac's loopback is
    /// dialled directly and starts no node; every other host goes to the node,
    /// which with no state and no key refuses before anything starts.
    func testTheDebugTransportSendsOnlyThisMacDirect() async throws {
        XCTAssertTrue(DoorTransports.shipping is DebugDoorTransport)
        let engine = StandInEngine(up: .joins)
        let transport = DebugDoorTransport(tailnet: node(engine))
        let direct = try await transport.route(to: "127.0.0.1")
        XCTAssertEqual(direct, .direct)
        try await transport.prepareToPair(host: "127.0.0.1", key: nil)
        XCTAssertTrue(transport.reaches("127.0.0.1"))
        do {
            try await transport.prepareToPair(host: "100.64.0.1", key: nil)
            XCTFail("a tailnet code with no key went on")
        } catch {
            XCTAssertEqual(error as? PairingFailure, .noTailnetKey)
        }
        do {
            _ = try await transport.route(to: "100.64.0.1")
            XCTFail("a node with no state was routed through")
        } catch {
            XCTAssertEqual(error as? DoorFailure, .notPaired)
        }
        XCTAssertFalse(transport.reaches("100.64.0.1"))
        XCTAssertTrue(engine.starts.isEmpty)
    }

    /// Clause (DEBUG seam): a coordination server may be named only on this
    /// Mac's loopback; anything else refuses to start the node, and no argument
    /// is Tailscale's own server.
    func testTheControlSeamTakesOnlyThisMacsLoopback() async throws {
        let flag = TailnetDebugSeam.controlArgument
        XCTAssertEqual(TailnetDebugSeam.control([]), .absent)
        XCTAssertEqual(TailnetDebugSeam.control([flag, "http://127.0.0.1:9911"]), .local("http://127.0.0.1:9911"))
        for refused in ["https://controlplane.tailscale.com", "http://127.0.0.1", "http://localhost:9911", "http://100.64.0.1:9911", "http://u:p@127.0.0.1:9911", "http://127.0.0.1:9911/?x=1"] {
            XCTAssertEqual(TailnetDebugSeam.control([flag, refused]), .refused, refused)
        }
        XCTAssertEqual(TailnetDebugSeam.control([flag]), .refused)
        // The hardening round: the seam no longer asks the launcher for
        // TS_NO_LOGS_NO_SUPPORT, because the node turns Tailscale's own logs
        // off itself before every start (TailnetLogs, conformance:ios rule q).

        // A node with no control URL never starts, with or without a key.
        let engine = StandInEngine(up: .joins)
        let place = directory!
        let refusing = TailnetNode(engine: engine, place: { place }, controlURL: nil)
        nodes.append(refusing)
        do {
            try await refusing.join(key: madeUpKey())
            XCTFail("a node with a refused control URL joined")
        } catch {
            XCTAssertEqual(error as? TailnetRefusal, .couldNotStart)
        }
        XCTAssertTrue(engine.starts.isEmpty)
    }
    #endif

    #if targetEnvironment(simulator)
    /// Clause (SPEC section 7, no trial on the Simulator over his tailnet): a
    /// build for the Simulator names no control server unless the DEBUG seam
    /// gave one on loopback, so no node an agent starts there can reach
    /// Tailscale's own. The test host is launched with no seam.
    func testASimulatorNeverReachesTailscalesOwnServer() {
        XCTAssertNil(TailnetControl.chosen)
    }
    #endif

    #if os(iOS)
    // MARK: Tailscale's own logs

    /// His ruling of 2026-09-23 ("Turn them off"), through the REAL framework:
    /// the switch every start asks first exists in the built TailscaleKit, and
    /// once it has run, tsnet reads TS_NO_LOGS_NO_SUPPORT as true, which is
    /// what makes a node started after it upload no logs. This process was
    /// launched without the variable (xcodebuild sets none), so the answer is
    /// the switch's own, not the launcher's; asking twice is safe.
    func testTailscalesOwnLogsAreOffBeforeANodeStarts() {
        XCTAssertNil(ProcessInfo.processInfo.environment["TS_NO_LOGS_NO_SUPPORT"], "the test host was launched with the variable, so this proves nothing about the switch")
        XCTAssertTrue(TailnetLogs.off())
        XCTAssertTrue(TailnetLogs.off())
    }

    // MARK: The running app's own node

    /// SPEC S3 proof, "read the backup-exclusion flag back from the running
    /// app": the app's node (the one `DoorTransports.shipping` hands the door
    /// client) keeps its state in this container's Application Support/tailnet,
    /// excluded from backup once it has settled in the foreground, and with no
    /// state it has nothing running and reaches nothing.
    func testTheRunningAppsNodeDirectoryIsExcludedFromBackup() async throws {
        await TailnetNode.shared.settle()
        let standard = try TailnetDirectory.standard()
        XCTAssertTrue(standard.path.contains("/Library/Application Support/tailnet"), standard.path)
        XCTAssertEqual(standard.isExcludedFromBackup, true)
        if !standard.hasJoined {
            XCTAssertFalse(TailnetNode.shared.reaches("100.64.0.1"))
        }
    }

    // MARK: The app's seam (App/TortieApp.swift)

    /// SPEC S3 (d) through the app: a code with no key is refused by the node
    /// BEFORE the door is presented to, and a kept pairing whose node is gone
    /// is not read.
    func testThePairingJoinsBeforeItPresents() async throws {
        let engine = StandInEngine(up: .joins)
        let secrets = MemorySecrets()
        let door = LiveDoor(store: PairingStore(secrets: secrets), transport: node(engine))
        let offer = PairingOffer(
            address: DoorAddress(host: "100.64.0.1", port: 8823, pin: Base64URL.encode(Data(count: 32))),
            macSigningKey: SPKI.ed25519(PhoneKeys.generate().signing.publicKey),
            macExchangeKey: SPKI.x25519(PhoneKeys.generate().exchange.publicKey),
            secret: Data(count: 32),
            expiresAt: 4_102_444_800_000,
            tailnetKey: nil
        )
        let pending = PairingFlow(exchange: door.client!, store: PairingStore(secrets: secrets)).begin(offer, label: "p316")
        let steps = StepLog()
        guard case .failed(let failure) = await door.pair(pending, progress: { steps.append($0) }) else {
            return XCTFail("a code with no key paired")
        }
        XCTAssertEqual(failure, .noTailnetKey)
        XCTAssertTrue(steps.all.isEmpty, "the door was presented to before the node joined")
        XCTAssertTrue(engine.starts.isEmpty)

        let kept = try XCTUnwrap(PairedDoor(
            address: offer.address, macSigningKey: offer.macSigningKey, macExchangeKey: offer.macExchangeKey,
            label: "p316", pairedAt: 1, keys: PhoneKeys.generate()
        ))
        try PairingStore(secrets: secrets).save(kept)
        XCTAssertNil(door.pairedReader(), "a pairing whose node is gone was read")
        try joinedAlready()
        XCTAssertNotNil(door.pairedReader())
    }
    #endif

    // MARK: Helpers

    private func assertRefused(_ tailnet: TailnetNode, _ expected: DoorFailure, file: StaticString = #filePath, line: UInt = #line) async {
        do {
            _ = try await tailnet.route(to: "100.64.0.1")
            XCTFail("routed through a node that should refuse", file: file, line: line)
        } catch {
            XCTAssertEqual(error as? DoorFailure, expected, file: file, line: line)
        }
    }

    private func waitUntil(_ condition: @escaping @Sendable () -> Bool, file: StaticString = #filePath, line: UInt = #line) async throws {
        for _ in 0..<200 {
            if condition() { return }
            try await Task.sleep(for: .milliseconds(10))
        }
        XCTFail("waited 2 s for a condition", file: file, line: line)
    }
}

// MARK: - The stand-ins

/// The notification names the node follows, spelled where the tests need them.
enum UIApplicationNames {
    static let becameActive = UIApplication.didBecomeActiveNotification
    static let enteredBackground = UIApplication.didEnterBackgroundNotification
}

/// In place of TailscaleKit. It starts nothing and reaches nothing: `up()`
/// joins, refuses (the backend's error), or never answers until stopped, as
/// the test says. It writes a state file the way tsnet does, without the key.
final class StandInEngine: TailnetEngine, @unchecked Sendable {
    enum Up { case joins, refuses, never }
    struct Refused: Error {}
    struct Stopped: Error {}

    static let proxy = TailnetProxy(host: "127.0.0.1", port: 41_641, credential: "p316-proxy-credential")

    private let lock = NSLock()
    private let upBehaviour: Up
    private let backendState: TailnetBackend?
    private let startFails: Bool
    private var recordedStarts: [TailnetStart] = []
    private var recordedEvents: [String] = []
    private var recordedExcluded: [Bool] = []
    private var live = 0

    init(up: Up, backend: TailnetBackend? = nil, startFails: Bool = false) {
        upBehaviour = up
        backendState = backend
        self.startFails = startFails
    }

    var starts: [TailnetStart] { lock.withLock { recordedStarts } }
    var events: [String] { lock.withLock { recordedEvents } }
    var excludedAtStart: [Bool] { lock.withLock { recordedExcluded } }
    var running: Int { lock.withLock { live } }

    func note(_ event: String) {
        lock.withLock { recordedEvents.append(event) }
    }

    func start(_ start: TailnetStart) async throws -> any TailnetRunning {
        if startFails { throw Refused() }
        let url = URL(fileURLWithPath: start.directory, isDirectory: true)
        let excluded = (try? url.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup) ?? false
        try Data("tsnet state, no key".utf8).write(to: url.appendingPathComponent(TailnetRules.stateFileName))
        lock.withLock {
            recordedStarts.append(start)
            recordedExcluded.append(excluded == true)
            recordedEvents.append(start.authKey == nil ? "start from state" : "start with a key")
            live = live.advanced(by: 1)
        }
        return StandInNode(engine: self)
    }

    fileprivate func up(_ node: StandInNode) async throws {
        note("up")
        switch upBehaviour {
        case .joins:
            return
        case .refuses:
            throw Refused()
        case .never:
            while !node.isStopped { try await Task.sleep(for: .milliseconds(5)) }
            throw Stopped()
        }
    }

    fileprivate var backend: TailnetBackend? { backendState }

    fileprivate func stopped() {
        lock.withLock {
            recordedEvents.append("stop")
            live = live.advanced(by: -1)
        }
    }
}

final class StandInNode: TailnetRunning, @unchecked Sendable {
    private let engine: StandInEngine
    private let lock = NSLock()
    private var stoppedFlag = false

    init(engine: StandInEngine) {
        self.engine = engine
    }

    var isStopped: Bool { lock.withLock { stoppedFlag } }

    func up() async throws {
        try await engine.up(self)
    }

    func proxy() async throws -> TailnetProxy {
        StandInEngine.proxy
    }

    func backend() async -> TailnetBackend? {
        engine.backend
    }

    func forgetKey() async {
        engine.note("forget the key")
    }

    func stop() async {
        let first = lock.withLock { () -> Bool in
            defer { stoppedFlag = true }
            return !stoppedFlag
        }
        if first { engine.stopped() }
    }
}

// MARK: - Where a key could be

enum KeySearch {
    /// Does any stored value reachable from `subject`, followed down its
    /// properties, collections and optionals, hold `key`?
    /// `skipping` is an object not to follow (the test's own stand-in).
    static func holds(_ subject: Any, _ key: String, skipping: AnyObject? = nil, depth: Int = 0) -> Bool {
        if let text = subject as? String { return text.contains(key) }
        if let data = subject as? Data { return data.range(of: Data(key.utf8)) != nil }
        if let skipping, let object = subject as AnyObject?, type(of: subject) is AnyClass, object === skipping { return false }
        // The two values that hold the key keep it out of their own mirror
        // (conformance:ios rule p), so this search opens them by the field
        // itself: a redacted mirror must never hide a key from it.
        if let start = subject as? TailnetStart, start.authKey?.contains(key) == true { return true }
        if let offer = subject as? PairingOffer, offer.tailnetKey?.contains(key) == true { return true }
        guard depth < 12 else { return false }
        for child in Mirror(reflecting: subject).children
        where holds(child.value, key, skipping: skipping, depth: depth.advanced(by: 1)) {
            return true
        }
        return false
    }

    #if os(iOS)
    /// Does any generic password or key item this app can read hold `bytes`,
    /// in its data or its attributes?
    static func keychainHolds(_ bytes: Data) -> Bool {
        for itemClass in [kSecClassGenericPassword, kSecClassInternetPassword, kSecClassKey] {
            let query: [String: Any] = [
                kSecClass as String: itemClass,
                kSecMatchLimit as String: kSecMatchLimitAll,
                kSecReturnAttributes as String: true,
                kSecReturnData as String: true
            ]
            var found: CFTypeRef?
            let status = SecItemCopyMatching(query as CFDictionary, &found)
            guard status == errSecSuccess, let items = found as? [[String: Any]] else { continue }
            for item in items {
                for value in item.values {
                    if let data = value as? Data, data.range(of: bytes) != nil { return true }
                    if let text = value as? String, text.utf8.count >= bytes.count, Data(text.utf8).range(of: bytes) != nil { return true }
                }
            }
        }
        return false
    }
    #endif
}
