// Transport.swift — how a request reaches the door (Phase 316.2, the tailnet
// node from Phase 316.3).
//
// The door answers on the Mac's tailnet address. The phone reaches it through
// a tailnet node carried inside the app (Tailnet/Node.swift), which hands the
// door client a SOCKS5 proxy on the phone's own loopback. That node is the
// transport a Release build ships with (`DoorTransports.shipping`), so pairing
// and every read go over his tailnet.
//
// THIS FILE NAMES NO NETWORK TYPE. `DoorClient.swift` is the one network user
// and `Tailnet/Node.swift` the one other network file (conformance:ios rule
// c); a transport only says which ROUTE to take, and the client turns that
// into a session.
//
// A TRANSPORT ALSO ANSWERS TWO QUESTIONS, both with an answer that changes
// nothing for a transport that has no node: whether a kept pairing can be
// read at all (`reaches`: a node whose state is gone cannot, and the phone
// goes to Pairing), and what must happen before a pairing presents
// (`prepareToPair`: the node joins with the code's key when it has no state of
// its own, and refuses with a `PairingFailure` when it cannot).
//
// THE DEBUG SEAM. In the Simulator the door runs on this Mac's loopback
// (`GMUX_POCKET_LOOPBACK=1`), so a DEBUG build dials it directly. It dials
// 127.0.0.1 and nothing else directly: any other host goes to the tailnet node,
// exactly as in a Release build, and a node with no state and no key refuses
// before anything starts, so a pairing code that names a tailnet address and
// carries no key never makes a DEBUG build reach past this Mac. The direct
// route exists only inside `#if DEBUG` (conformance:ios rule d).

import Foundation

/// The route to the door's host, as the client needs it.
enum DoorRoute: Equatable, Sendable {
    /// Straight to the host, with no proxy at all.
    case direct
    /// Through a SOCKS5 proxy, which is how the tailnet node and the ATS arm's
    /// loopback stand-in carry a request.
    case socks5(host: String, port: Int, username: String?, password: String?)
}

/// Where requests go. Asked once per request, so a node that stops between
/// two requests is noticed at the second.
protocol DoorTransport: Sendable {
    /// The route to `host`, or `DoorFailure.notPaired` when this transport
    /// cannot reach it at all.
    func route(to host: String) async throws -> DoorRoute
    /// Whether a kept pairing with a door at `host` can be read at all.
    func reaches(_ host: String) -> Bool
    /// Before a pairing with a door at `host` presents. Throws a
    /// `PairingFailure` when the pairing cannot go on.
    func prepareToPair(host: String, key: String?) async throws
}

extension DoorTransport {
    /// A transport with no node of its own reaches whatever it routes to.
    func reaches(_ host: String) -> Bool { true }
    /// A transport with no node of its own has nothing to do first.
    func prepareToPair(host: String, key: String?) async throws {}
}

/// The transport this build ships with.
enum DoorTransports {
    /// The tailnet node; in a DEBUG build, this Mac's loopback directly and
    /// every other host through the node.
    static var shipping: DoorTransport? {
        #if DEBUG
        return DebugDoorTransport(tailnet: TailnetNode.shared)
        #else
        return TailnetNode.shared
        #endif
    }
}

#if DEBUG
/// DEBUG ONLY: straight to the door on this Mac's loopback, for the
/// Simulator. Any host but 127.0.0.1 is refused.
struct DirectLoopbackTransport: DoorTransport {
    static let loopback = "127.0.0.1"

    func route(to host: String) async throws -> DoorRoute {
        guard host == Self.loopback else { throw DoorFailure.notPaired }
        return .direct
    }
}

/// DEBUG ONLY: this Mac's loopback directly, and every other host through the
/// tailnet node, the way a Release build reaches it.
struct DebugDoorTransport: DoorTransport {
    let direct = DirectLoopbackTransport()
    let tailnet: DoorTransport

    private func isDirect(_ host: String) -> Bool {
        host == DirectLoopbackTransport.loopback
    }

    func route(to host: String) async throws -> DoorRoute {
        isDirect(host) ? try await direct.route(to: host) : try await tailnet.route(to: host)
    }

    func reaches(_ host: String) -> Bool {
        isDirect(host) ? direct.reaches(host) : tailnet.reaches(host)
    }

    func prepareToPair(host: String, key: String?) async throws {
        if isDirect(host) {
            try await direct.prepareToPair(host: host, key: key)
        } else {
            try await tailnet.prepareToPair(host: host, key: key)
        }
    }
}
#endif
