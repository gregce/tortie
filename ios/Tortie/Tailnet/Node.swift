// Node.swift — THE TAILNET NODE, the app's second and last network file
// (Phase 316.3).
//
// The phone reaches the Mac's door over his tailnet through a node this app
// carries itself: TailscaleKit, built from pinned source by
// `npm run vendor:tailscalekit`, running in userspace inside this process. No
// Tailscale app, no VPN profile, no entitlement, and never a NetworkExtension
// (research 128 section 2). The rules, each from build/p316/SPEC.md section 4
// S3 and research 128, and where each is held:
//
//   (a) FOREGROUND ONLY. The node starts when the app becomes active and stops
//       when it enters the background (`follow`, `settle`). No background mode
//       keeps it and no background task stretches it, ever (guideline 2.5.4,
//       research 128 section 2, SPEC section 7). A read or a pairing may start
//       it too, and neither happens in the background: both are refused there.
//   (b) ITS STATE lives in `Application Support/tailnet/` and nowhere else
//       (`TailnetDirectory`). The directory is excluded from backup in the same
//       body that makes it, every time it is made ready, so the node's keys never
//       reach a backup that could be restored onto another phone, and a restore
//       never brings back a node whose keys are gone.
//   (c) IT IS `tortie-phone`, AND NEVER EPHEMERAL. An ephemeral node is deleted
//       by Tailscale 30 to 60 minutes after it was last seen, and a phone in a
//       pocket is unseen for that long many times a day, so its stored state
//       would name a node that no longer exists (research 128 section 3.2).
//       `ephemeral: false` is written out where the node is configured.
//   (d) THE KEY. With no state of its own the node joins once, with the QR's
//       `tk`, the one-off key he mints at 316.4. With no key it refuses BEFORE
//       anything starts: tsnet with neither state nor key begins an interactive
//       login against Tailscale's servers, and nothing in this app could finish
//       it. With state, a key the code carries is ignored (tsnet ignores it too:
//       "If the node is already created ... this field is not used"). The key
//       is held only in the frame of `join`: never in a property, the Keychain,
//       a file or UserDefaults; the value handed to TailscaleKit is not kept by
//       it; and once the join is done the Go side's copy is overwritten
//       (`forgetKey`). The state it leaves is tsnet's own node keys, which is
//       what makes the key unnecessary from then on.
//   (e) THE ROUTE. The node hands `DoorClient` its SOCKS5 proxy on the phone's
//       loopback, with the proxy's user and one-time password (tailscale.h:
//       "Authentication is required with the username "tsnet""). The door
//       client builds the session from that route: the same two calls
//       TailscaleKit's `URLSession+Tailscale.swift` makes
//       (`ProxyConfiguration(socksv5Proxy:)`, `applyCredential`), inside the
//       client's own ephemeral configuration with its pin, its cap, its 15 s
//       and `allowFailover = false`. TailscaleKit's own `tailscaleSession`
//       helper is NOT used: it builds a `.default` configuration, with a cache,
//       cookies and a credential store, and leaves failover at its default.
//       This file configures a route and hands it over; it sends nothing.
//
// A JOIN THAT FAILS. Refused by Tailscale (the backend's own error): the
// directory is removed, so nothing half made is kept and the next code starts
// clean. No answer inside 30 s, or the app left the foreground: the directory
// is KEPT without the joined mark, because Tailscale may have registered the
// node and spent the one-off key before the answer arrived, and a node that is
// registered joins again from its state without the key. Each ends in one
// sentence (Copy.swift, through DoorWords), or in nothing when he left. The
// sentence is said once the node has CLOSED, so that nothing still writes the
// directory it leaves: after a join that timed out that is about 39 s from the
// start, not 30 (measured on the Simulator against a server that never
// answers, in 316.3's verification). One refusal is told apart from a refused
// key (Phase 316.4): a tailnet that requires network flow logs takes the key,
// then turns a node whose logs are off OFF, and tsnet's `Up` fails with the
// backend's words for it (`TailnetRules.flowLogsRefusal`), so the pairing
// names flow logs rather than the key. The directory is removed as for any
// refusal; the key is spent all the same.
//
// A NODE THAT IS GONE. The joined mark or tsnet's state is missing (a
// reinstall, a restore, the directory removed), or Tailscale answers that the
// node must log in again (removed from his Machines page): reads refuse as
// `notPaired`, and the phone goes to Pairing with its one line. A node that
// must log in again has its state removed, so the next code's key is used.
//
// TAILSCALE'S OWN LOGS ARE OFF (his ruling of 2026-09-23, "Turn them off";
// conformance:ios rule q). tsnet uploads the node's own logs to
// log.tailscale.com, as every Tailscale client does, unless
// `TS_NO_LOGS_NO_SUPPORT` reads true when a node starts. An app cannot set
// that variable for itself (Go copied the environment when the library
// loaded), so the pinned build adds one export, `tailscale_no_logs_no_support()`
// (build/build-tailscalekit.mjs, NO_LOGS_PATCH), which sets it on the Go side
// for this whole process and answers whether tsnet now reads it true.
// `TailnetLogs.off()` calls it before EVERY start, in every build, device and
// Simulator, Debug and Release, and a node whose logs could not be turned off
// is never started. The cost, stated: Tailscale's support cannot see this
// node's logs. The node's own log lines are discarded here too
// (`tailscale_set_logfd(-1)`); tsnet's few user-facing lines go to stderr,
// which nothing on a phone keeps. No line either writes carries the key.
//
// THE DEBUG SEAM (conformance:ios rule d). A DEBUG build may be pointed at a
// coordination server on this Mac's loopback (`-TortieDebugTailnetControl
// http://127.0.0.1:<port>`), because TailscaleKit exposes its control URL: that
// is how an agent run drives a refused join without Tailscale's servers. Until
// the hardening round the seam also required `TS_NO_LOGS_NO_SUPPORT=true` in
// the app's environment; the node now turns the logs off itself before every
// start, so the seam asks for nothing else, and a run that starts a node
// through it proves the switch rather than the launcher. A Release build has
// no seam.
//
// A LOOPBACK CONTROL MUST REFUSE EVERY KEY. Pointing the node at loopback keeps
// the JOIN off Tailscale's servers, and nothing more. Once a node reaches
// Running, tsnet's captive-portal detection dials
// controlplane.tailscale.com/generate_204, login.tailscale.com/generate_204 and
// DERP addresses, and when the control server's DERP map is EMPTY it falls back
// to the static map compiled into the framework (tailscale.com v1.94.1,
// ipn/ipnlocal/local.go 5648-5655, net/captivedetection/endpoints.go 83-88 and
// 124-125; `strings` finds both hosts in the built framework). So a stand-in
// that ACCEPTS a registration would send this node to Tailscale, logs off or
// not. The only stand-in an agent may run refuses every key (tailscale.com's
// testcontrol with RequireAuthKey set to a key no run sends); one that accepts
// must also send NodeAttrDisableCaptivePortalDetection and a DERP map of
// loopback nodes only, and an empty DERP map is not protection.
//
// NO SIMULATOR REACHES TAILSCALE (build/p316/SPEC.md section 7: there is no
// trial on the Simulator over his tailnet). A build for the Simulator, Debug or
// Release, has no control URL unless the DEBUG seam names one on loopback, so
// a node an agent starts there never dials Tailscale's own control server,
// whatever code it is handed; with the seam, only a stand-in that refuses the
// key keeps the node off Tailscale entirely (above). On a phone the node uses
// TailscaleKit's `kDefaultControlURL`.

import Foundation
import TailscaleKit
import UIKit

// MARK: - The rules, written once

enum TailnetRules {
    /// The name the node carries on his tailnet (the S4 checklist, row 12).
    static let hostName = "tortie-phone"
    /// Application Support/<this>/.
    static let directoryName = "tailnet"
    /// tsnet's own state file inside the directory (tsnet.Server.Store: "a new
    /// FileStore is initialized at `Dir/tailscaled.state`").
    static let stateFileName = "tailscaled.state"
    /// Written by this file when the first join succeeded. Empty: a mark, not
    /// a secret.
    static let joinedMarkName = "joined"
    /// The SOCKS5 user name `tailscale_loopback` requires.
    static let proxyUserName = "tsnet"
    /// How long a first join may take before the pairing says so.
    static let joinLimit: Duration = .seconds(30)
    /// How long a read waits for the node to come up: the door client's own
    /// 15 seconds.
    static let upLimit: Duration = .seconds(15)
    /// The backend state tsnet reports for a node Tailscale no longer knows.
    static let needsLogin = "NeedsLogin"
    /// The words tsnet's `Up` fails with when his tailnet requires network
    /// flow logs and this node's logs are off (tailscale.com v1.94.1,
    /// ipn/ipnlocal/local.go 1771-1785: the node registers, is handed a
    /// netmap carrying `CapabilityDataPlaneAuditLogs`, sets `WantRunning`
    /// false and sends this as the backend's `ErrMessage`, which `tsnet.Up`
    /// returns and libtailscale hands over as `TailscaleError.internalError`).
    /// conformance:ios rule q requires every built slice to hold it, so a new
    /// pin that rewords it is refused rather than drawn as a refused key.
    static let flowLogsRefusal = "tailnet requires logging to be enabled"
}

/// The two waits, injectable so a test can end one in milliseconds.
struct TailnetLimits: Sendable {
    let join: Duration
    let up: Duration

    static let standard = TailnetLimits(join: TailnetRules.joinLimit, up: TailnetRules.upLimit)
}

// MARK: - Where the node's state lives

/// `Application Support/tailnet/`, in this app's own container.
struct TailnetDirectory: Sendable {
    let url: URL

    /// The app's directory. Application Support is kept across updates and is
    /// not a cache the system may empty.
    static func standard() throws -> TailnetDirectory {
        let support = try FileManager.default.url(
            for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true
        )
        return TailnetDirectory(url: support.appendingPathComponent(TailnetRules.directoryName, isDirectory: true))
    }

    var path: String { url.path(percentEncoded: false) }

    private var joinedMark: URL { url.appendingPathComponent(TailnetRules.joinedMarkName, isDirectory: false) }
    private var stateFile: URL { url.appendingPathComponent(TailnetRules.stateFileName, isDirectory: false) }

    /// True once a join succeeded here and tsnet's state is still beside the
    /// mark. Either one missing is a node that is gone.
    var hasJoined: Bool {
        let files = FileManager.default
        return files.fileExists(atPath: joinedMark.path(percentEncoded: false))
            && files.fileExists(atPath: stateFile.path(percentEncoded: false))
    }

    /// Make the directory if it is missing and exclude it from backup. Every
    /// time, in this one body: a directory made again after it was removed
    /// would otherwise go into the next backup.
    func prepare() throws {
        try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        var excluded = url
        try excluded.setResourceValues(values)
    }

    /// The mark a completed join leaves. It holds nothing.
    func markJoined() throws {
        try Data().write(to: joinedMark, options: .atomic)
    }

    /// Take the mark away, so the node reads as gone at once.
    func unmark() {
        try? FileManager.default.removeItem(at: joinedMark)
    }

    /// Remove the directory and everything tsnet left in it.
    func discard() {
        try? FileManager.default.removeItem(at: url)
    }

    /// The flag as the file system reports it NOW, for the tests and the probe:
    /// read through a fresh URL, because a URL keeps the resource values it
    /// has already read, and a directory removed and made again would read
    /// back the old answer. Nil when there is no directory.
    var isExcludedFromBackup: Bool? {
        let fresh = URL(fileURLWithPath: path, isDirectory: true)
        guard FileManager.default.fileExists(atPath: fresh.path(percentEncoded: false)) else { return nil }
        return try? fresh.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup
    }
}

// MARK: - How a join ends, as cases and never as words

/// Why the node could not join. DoorWords says each one in Copy.swift's words.
enum TailnetRefusal: Error, Equatable, Sendable {
    /// No state, and the code carries no key.
    case noKey
    /// Tailscale refused the key (the backend's own error).
    case keyRefused
    /// Tailscale took the key, then turned the node off because his tailnet
    /// requires network flow logs, which a node with its logs off never sends
    /// (the backend's own error, `TailnetRules.flowLogsRefusal`).
    case flowLogsRequired
    /// No answer inside the join limit.
    case joinTimedOut
    /// The directory could not be made, or the node would not start.
    case couldNotStart
    /// The app left the foreground during the join.
    case interrupted

    /// The pairing's case for it. Leaving the app says nothing.
    var pairingFailure: PairingFailure {
        switch self {
        case .noKey: return .noTailnetKey
        case .keyRefused: return .tailnetKeyRefused
        case .flowLogsRequired: return .tailnetFlowLogs
        case .joinTimedOut: return .tailnetUnreachable
        case .couldNotStart: return .tailnetUnavailable
        case .interrupted: return .cancelled
        }
    }
}

// MARK: - The seam over TailscaleKit

/// What a node is started with. The key is here only for a first join. This
/// value is handed to the engine and kept by nobody; it is deliberately not
/// Encodable, and it mirrors itself without the key, so `print`, `dump`,
/// `String(describing:)` and interpolation, which read it through its mirror,
/// never repeat it (conformance:ios rule p).
struct TailnetStart: Sendable, Equatable, CustomReflectable {
    let hostName: String
    let directory: String
    let authKey: String?
    let controlURL: String

    var customMirror: Mirror {
        Mirror(self, children: ["hostName": hostName, "directory": directory, "controlURL": controlURL], displayStyle: .struct)
    }
}

/// The node's SOCKS5 proxy on the phone's loopback.
struct TailnetProxy: Sendable, Equatable {
    let host: String
    let port: Int
    let credential: String
}

/// What tsnet says about itself, read when a node does not come up.
struct TailnetBackend: Sendable, Equatable {
    let state: String
    let hasLoginURL: Bool

    /// Tailscale no longer knows this node: it answered, and asked for a login.
    var isGone: Bool { state == TailnetRules.needsLogin && hasLoginURL }
}

/// Starts a node. The app's is TailscaleKit; the tests hand in their own, which
/// is how a refused join is driven without a tailnet.
protocol TailnetEngine: Sendable {
    func start(_ start: TailnetStart) async throws -> any TailnetRunning
}

/// One started node.
protocol TailnetRunning: Sendable {
    /// Returns once the node is on the tailnet; throws the backend's refusal.
    func up() async throws
    /// The SOCKS5 proxy onto the tailnet.
    func proxy() async throws -> TailnetProxy
    /// The backend's own state, or nil when it cannot be read.
    func backend() async -> TailnetBackend?
    /// Overwrite the Go side's copy of the key, once the join is done.
    func forgetKey() async
    func stop() async
}

// MARK: - Foreground, as the notifications report it

/// Whether the app is in the foreground. Set synchronously on the thread the
/// notification arrives on, so the node settles on the LATEST word however its
/// tasks are ordered. The app is made in the foreground, so it starts true.
final class TailnetPresence: @unchecked Sendable {
    private let lock = NSLock()
    private var foreground = true

    var isForeground: Bool {
        lock.lock()
        defer { lock.unlock() }
        return foreground
    }

    func set(foreground now: Bool) {
        lock.lock()
        foreground = now
        lock.unlock()
    }
}

// MARK: - The node

/// The app's tailnet node, and the route the door client takes in a Release
/// build. One instance, `shared`, for the app; the tests make their own.
actor TailnetNode: DoorTransport {
    /// The app's node, made the first time the app asks for its transport,
    /// which is at launch.
    static let shared: TailnetNode = {
        let node = TailnetNode(
            engine: LiveTailnetEngine(),
            place: { try TailnetDirectory.standard() },
            controlURL: TailnetControl.chosen
        )
        node.follow(.default)
        return node
    }()

    nonisolated let presence = TailnetPresence()
    private let engine: any TailnetEngine
    private let place: @Sendable () throws -> TailnetDirectory
    /// Nil only when a DEBUG build was handed a control URL that is not this
    /// Mac's loopback: then the node never starts.
    private let controlURL: String?
    private let limits: TailnetLimits

    /// The node started from its own state, and its one `up()`, which every
    /// read waits on. Nil when stopped.
    private var running: (any TailnetRunning)?
    private var coming: Task<Void, Error>?
    /// The node of a first join under way, so the background can stop it too.
    private var joining: (token: UUID, node: any TailnetRunning)?
    private var interrupted: Set<UUID> = []
    /// The last stop, which a start waits for so two nodes never share a
    /// directory.
    private var stopping: Task<Void, Never>?

    init(
        engine: any TailnetEngine,
        place: @escaping @Sendable () throws -> TailnetDirectory,
        controlURL: String?,
        limits: TailnetLimits = .standard
    ) {
        self.engine = engine
        self.place = place
        self.controlURL = controlURL
        self.limits = limits
    }

    // MARK: (a) Foreground only

    /// Start on becoming active, stop on entering the background. Returns the
    /// observers; the app's node keeps them for its lifetime.
    @discardableResult
    nonisolated func follow(_ center: NotificationCenter) -> [NSObjectProtocol] {
        let active = center.addObserver(
            forName: UIApplication.didBecomeActiveNotification, object: nil, queue: nil
        ) { [self] _ in
            presence.set(foreground: true)
            Task { await self.settle() }
        }
        let away = center.addObserver(
            forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: nil
        ) { [self] _ in
            presence.set(foreground: false)
            Task { await self.settle() }
        }
        return [active, away]
    }

    /// Bring the node to where the app is: coming up in the foreground when it
    /// has state, stopped in the background. Idempotent, and it reads the
    /// latest word, so notifications that arrive out of order still settle
    /// right.
    func settle() async {
        if presence.isForeground {
            // The directory is made ready (and excluded from backup) whether or
            // not there is a node yet, so the flag is there to be read.
            try? place().prepare()
            _ = try? await comingUp()
        } else {
            stopAll()
            await stopping?.value
        }
    }

    // MARK: (e) The route

    /// The node's proxy for a read. A node with no state refuses as
    /// `notPaired`, which sends the phone to Pairing with its one line.
    func route(to host: String) async throws -> DoorRoute {
        let (started, up) = try await comingUp()
        do {
            try await TailnetWait.run(within: limits.up) { try await up.value }
        } catch is TailnetWait.Expired {
            // Still coming up: the node is left to finish, and the next read
            // waits on the same start. Unless Tailscale said it forgot it.
            if let backend = await started.backend(), backend.isGone, coming == up {
                await forgetNode()
                throw DoorFailure.notPaired
            }
            throw DoorFailure.unreachable(code: NSURLErrorCannotConnectToHost)
        } catch is CancellationError {
            throw DoorFailure.cancelled
        } catch {
            // The node stopped (the background), or its backend failed. A
            // backend that failed while asking for a login again is a node
            // Tailscale no longer has; anything else, the next read starts it
            // again.
            guard presence.isForeground else {
                if coming == up { stopAll() }
                throw DoorFailure.cancelled
            }
            if coming == up, let backend = await started.backend(), backend.state == TailnetRules.needsLogin {
                await forgetNode()
                throw DoorFailure.notPaired
            }
            if coming == up { stopAll() }
            throw DoorFailure.unreachable(code: NSURLErrorCannotConnectToHost)
        }
        // The node waited for must still be the node: not stopped by the
        // background, and not replaced, while this read waited.
        guard presence.isForeground, coming == up else { throw DoorFailure.cancelled }
        let proxy: TailnetProxy
        do {
            proxy = try await started.proxy()
        } catch {
            throw DoorFailure.unreachable(code: NSURLErrorCannotConnectToHost)
        }
        return .socks5(
            host: proxy.host,
            port: proxy.port,
            username: TailnetRules.proxyUserName,
            password: proxy.credential
        )
    }

    /// Whether a kept pairing can be read: only while the node has state.
    nonisolated func reaches(_ host: String) -> Bool {
        (try? place())?.hasJoined ?? false
    }

    /// The node's start from its own state, shared by every read, with the
    /// node it started. Never with a key.
    private func comingUp() async throws -> (node: any TailnetRunning, up: Task<Void, Error>) {
        guard presence.isForeground else { throw DoorFailure.cancelled }
        let directory: TailnetDirectory
        do {
            directory = try place()
        } catch {
            throw DoorFailure.notPaired
        }
        guard directory.hasJoined else {
            // The node is gone (never joined, or its state removed while it
            // ran): nothing may keep running on state that is not there.
            if running != nil { stopAll() }
            throw DoorFailure.notPaired
        }
        if let running, let coming { return (running, coming) }
        guard let controlURL else { throw DoorFailure.notPaired }
        if let stopping { await stopping.value }
        // The actor was free during the wait: another read may have started it.
        if let running, let coming { return (running, coming) }
        guard presence.isForeground else { throw DoorFailure.cancelled }
        do {
            try directory.prepare()
        } catch {
            throw DoorFailure.unreachable(code: NSURLErrorCannotConnectToHost)
        }
        let started: any TailnetRunning
        do {
            started = try await engine.start(
                TailnetStart(hostName: TailnetRules.hostName, directory: directory.path, authKey: nil, controlURL: controlURL)
            )
        } catch {
            throw DoorFailure.unreachable(code: NSURLErrorCannotConnectToHost)
        }
        if let running, let coming {
            await started.stop()
            return (running, coming)
        }
        guard presence.isForeground else {
            await started.stop()
            throw DoorFailure.cancelled
        }
        let up = Task { try await started.up() }
        running = started
        coming = up
        return (started, up)
    }

    // MARK: (d) The join

    /// Before a pairing presents: join with the code's key when the node has no
    /// state, and refuse with a pairing case when it cannot.
    func prepareToPair(host: String, key: String?) async throws {
        do {
            try await join(key: key)
        } catch let refusal as TailnetRefusal {
            throw refusal.pairingFailure
        }
    }

    /// Join once with `key`, or refuse. The key lives in this frame only.
    func join(key: String?) async throws {
        guard presence.isForeground else { throw TailnetRefusal.interrupted }
        let directory: TailnetDirectory
        do {
            directory = try place()
            try directory.prepare()
        } catch {
            throw TailnetRefusal.couldNotStart
        }
        if directory.hasJoined {
            // The node has its state. The code's key, if it carries one, is not
            // used and not kept; the node comes up as it always does.
            _ = try? await comingUp()
            return
        }
        guard let key else { throw TailnetRefusal.noKey }
        guard let controlURL else { throw TailnetRefusal.couldNotStart }
        stopAll()
        if let stopping { await stopping.value }
        guard presence.isForeground else { throw TailnetRefusal.interrupted }

        let token = UUID()
        let node: any TailnetRunning
        do {
            node = try await engine.start(
                TailnetStart(hostName: TailnetRules.hostName, directory: directory.path, authKey: key, controlURL: controlURL)
            )
        } catch {
            throw TailnetRefusal.couldNotStart
        }
        joining = (token, node)
        do {
            try await TailnetWait.run(within: limits.join) { try await node.up() }
        } catch {
            let left = interrupted.remove(token) != nil
            if joining?.token == token { joining = nil }
            await node.stop()
            if left || error is CancellationError { throw TailnetRefusal.interrupted }
            if error is TailnetWait.Expired { throw TailnetRefusal.joinTimedOut }
            // Tailscale said no. Nothing half made is kept.
            directory.discard()
            if error is TailnetFlowLogsRequired { throw TailnetRefusal.flowLogsRequired }
            throw TailnetRefusal.keyRefused
        }
        if joining?.token == token { joining = nil }
        await node.forgetKey()
        do {
            try directory.markJoined()
        } catch {
            await node.stop()
            throw TailnetRefusal.couldNotStart
        }
        if interrupted.remove(token) != nil || !presence.isForeground {
            await node.stop()
            throw TailnetRefusal.interrupted
        }
        // It is the node now, up, and nothing in this app holds the key.
        running = node
        coming = Task<Void, Error> {}
    }

    // MARK: Stopping

    /// Stop every node this actor started, in the order started, before any
    /// new one may begin.
    private func stopAll() {
        var nodes: [any TailnetRunning] = []
        if let running { nodes.append(running) }
        if let joining {
            interrupted.insert(joining.token)
            nodes.append(joining.node)
        }
        running = nil
        coming = nil
        joining = nil
        guard !nodes.isEmpty else { return }
        let previous = stopping
        stopping = Task {
            await previous?.value
            for node in nodes { await node.stop() }
        }
    }

    /// Tailscale forgot this node: stop it and remove its state, so the next
    /// code's key is used rather than ignored. The mark goes first, so no read
    /// starts the node again while it stops; the rest goes once it has stopped
    /// writing.
    private func forgetNode() async {
        let directory = try? place()
        directory?.unmark()
        stopAll()
        await stopping?.value
        directory?.discard()
    }
}

// MARK: - Where the node's coordination server is

enum TailnetControl {
    /// Tailscale's own server, TailscaleKit's default, on a phone; nil (the
    /// node never starts) in the Simulator, unless a DEBUG build was pointed
    /// at a server on this Mac's loopback.
    static var chosen: String? {
        #if DEBUG
        switch TailnetDebugSeam.control() {
        case .absent: break
        case .local(let url): return url
        case .refused: return nil
        }
        #endif
        #if targetEnvironment(simulator)
        return nil
        #else
        return kDefaultControlURL
        #endif
    }
}

// MARK: - A wait with a limit

/// Waits for work at most `limit`. The work is NOT cancelled when the limit
/// passes: a node's `up()` is a blocking call inside Go that only a close
/// ends, so the caller decides what to stop.
enum TailnetWait {
    struct Expired: Error {}

    static func run(within limit: Duration, _ work: @escaping @Sendable () async throws -> Void) async throws {
        let gate = TailnetGate()
        try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                gate.hold(continuation)
                gate.sleeper = Task {
                    try? await Task.sleep(for: limit)
                    gate.answer(.failure(Expired()))
                }
                Task {
                    do {
                        try await work()
                        gate.answer(.success(()))
                    } catch {
                        gate.answer(.failure(error))
                    }
                }
            }
        } onCancel: {
            gate.answer(.failure(CancellationError()))
        }
    }
}

/// The first answer wins; the rest are dropped, and the limit's sleeper is
/// ended with it.
private final class TailnetGate: @unchecked Sendable {
    private let lock = NSLock()
    private var continuation: CheckedContinuation<Void, Error>?
    private var early: Result<Void, Error>?
    private var answered = false
    private var sleeping: Task<Void, Never>?

    var sleeper: Task<Void, Never>? {
        get { lock.withLock { sleeping } }
        set {
            lock.lock()
            let over = answered
            sleeping = newValue
            lock.unlock()
            if over { newValue?.cancel() }
        }
    }

    func hold(_ continuation: CheckedContinuation<Void, Error>) {
        lock.lock()
        if let early {
            answered = true
            self.early = nil
            lock.unlock()
            continuation.resume(with: early)
            return
        }
        self.continuation = continuation
        lock.unlock()
    }

    func answer(_ result: Result<Void, Error>) {
        lock.lock()
        guard !answered else {
            lock.unlock()
            return
        }
        guard let waiting = continuation else {
            // Cancelled before the continuation was held: kept for `hold`.
            if early == nil { early = result }
            lock.unlock()
            return
        }
        answered = true
        continuation = nil
        let sleeper = sleeping
        lock.unlock()
        sleeper?.cancel()
        waiting.resume(with: result)
    }
}

// MARK: - TailscaleKit, and only here

/// What TailscaleKit's `Configuration` holds for a start, read back from the
/// SAME configuration the app's engine builds, so the tests can hold its
/// hostname and ephemeral flag without a node.
struct TailnetConfigured: Sendable, Equatable {
    let hostName: String
    let path: String
    let hasKey: Bool
    let controlURL: String
    let ephemeral: Bool

    static func of(_ start: TailnetStart) -> TailnetConfigured {
        let configuration = tailscaleConfiguration(start)
        return TailnetConfigured(
            hostName: configuration.hostName,
            path: configuration.path,
            hasKey: configuration.authKey != nil,
            controlURL: configuration.controlURL,
            ephemeral: configuration.ephemeral
        )
    }
}

/// The one place a TailscaleKit configuration is made. Never ephemeral.
private func tailscaleConfiguration(_ start: TailnetStart) -> Configuration {
    Configuration(
        hostName: start.hostName,
        path: start.directory,
        authKey: start.authKey,
        controlURL: start.controlURL,
        ephemeral: false
    )
}

/// Tailscale's own diagnostic logs, turned off before every start (his ruling
/// of 2026-09-23; conformance:ios rule q).
enum TailnetLogs {
    /// Sets TS_NO_LOGS_NO_SUPPORT=true on the Go side for this whole process
    /// (envknob.SetNoLogsNoSupport, the switch tailscaled's
    /// --no-logs-no-support flips) and answers whether tsnet now reads it true,
    /// which is what decides, when a node starts, that its logs go nowhere.
    /// Idempotent, and cheap enough to ask before every start.
    static func off() -> Bool {
        tailscale_no_logs_no_support() == 0
    }
}

/// A node whose logs could not be turned off, which is never started.
struct TailnetLogsStillOn: Error {}

/// A join Tailscale took and then turned off, because his tailnet requires
/// network flow logs and this node's logs are off: the second cost of turning
/// them off (build/p316/SPEC.md, "Owed to S4"). Without this it would read as
/// a refused key, and a new key would fail the same way.
struct TailnetFlowLogsRequired: Error, Equatable {
    /// Whether the words the backend failed with are that refusal.
    static func said(_ message: String?) -> Bool {
        message?.contains(TailnetRules.flowLogsRefusal) ?? false
    }
}

/// The app's engine: a TailscaleKit node per start, and never one whose logs
/// would go to Tailscale.
private struct LiveTailnetEngine: TailnetEngine {
    func start(_ start: TailnetStart) async throws -> any TailnetRunning {
        guard TailnetLogs.off() else { throw TailnetLogsStillOn() }
        let node = try TailscaleNode(config: tailscaleConfiguration(start), logger: SilentTailnetLog())
        return LiveTailnetRunning(node: node)
    }
}

/// One TailscaleKit node.
private struct LiveTailnetRunning: TailnetRunning {
    let node: TailscaleNode

    func up() async throws {
        do {
            try await node.up()
        } catch TailscaleError.internalError(let message) where TailnetFlowLogsRequired.said(message) {
            throw TailnetFlowLogsRequired()
        }
    }

    func proxy() async throws -> TailnetProxy {
        let proxy = try await node.loopback()
        guard let host = proxy.ip, let port = proxy.port else { throw TailscaleError.invalidProxyAddress }
        return TailnetProxy(host: host, port: port, credential: proxy.proxyCredential)
    }

    func backend() async -> TailnetBackend? {
        guard let json = try? await node.statusJSON(),
              let status = try? JSONDecoder().decode(TailnetStatus.self, from: json) else { return nil }
        return TailnetBackend(state: status.backendState, hasLoginURL: !(status.authURL ?? "").isEmpty)
    }

    func forgetKey() async {
        guard let handle = await node.tailscale else { return }
        _ = tailscale_set_authkey(handle, "")
    }

    func stop() async {
        try? await node.close()
    }
}

/// The two fields of ipnstate.Status this file reads.
private struct TailnetStatus: Decodable {
    let backendState: String
    let authURL: String?

    private enum CodingKeys: String, CodingKey {
        case backendState = "BackendState"
        case authURL = "AuthURL"
    }
}

/// Discards the node's own log lines: `tailscale_set_logfd(-1)`, and nothing
/// from the Swift wrapper.
private struct SilentTailnetLog: LogSink {
    let logFileHandle: Int32? = -1

    func log(_ message: String) {}
}

#if DEBUG
// MARK: - DEBUG ONLY: a coordination server on this Mac

/// A DEBUG build may be pointed at a coordination server on this Mac's
/// loopback, and nowhere else. A Release build has no such argument.
enum TailnetDebugSeam {
    /// `-TortieDebugTailnetControl http://127.0.0.1:<port>`.
    static let controlArgument = "-TortieDebugTailnetControl"
    static let loopbackHost = "127.0.0.1"

    enum Control: Equatable {
        /// No argument: Tailscale's own server.
        case absent
        /// A server on this Mac's loopback.
        case local(String)
        /// Something else: the node does not start.
        case refused
    }

    static func control(_ arguments: [String] = ProcessInfo.processInfo.arguments) -> Control {
        guard let flag = arguments.firstIndex(of: controlArgument) else { return .absent }
        let next = arguments.index(after: flag)
        guard arguments.indices.contains(next),
              let parts = URLComponents(string: arguments[next]),
              parts.host == loopbackHost, parts.port != nil,
              parts.user == nil, parts.password == nil, parts.query == nil, parts.fragment == nil else {
            return .refused
        }
        return .local(arguments[next])
    }
}
#endif
