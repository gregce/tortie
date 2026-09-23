// Transport.swift — how a request reaches the door (Phase 316.2).
//
// The door answers on the Mac's tailnet address. From Phase 316.3 the phone
// reaches it through a tailnet node carried inside the app, which hands the
// door client a SOCKS5 proxy on the phone's own loopback. Until then there is
// no way to reach a Mac from a Release build, so `DoorTransports.shipping` is
// nil there and the app says it is not paired (build/p316/SPEC.md S2, "The
// Release build has no transport yet").
//
// THIS FILE NAMES NO NETWORK TYPE. `DoorClient.swift` is the one network user
// (conformance:ios rule c); a transport only says which ROUTE to take, and the
// client turns that into a session.
//
// THE DEBUG SEAM. In the Simulator the door runs on this Mac's loopback
// (`GMUX_POCKET_LOOPBACK=1`), so a DEBUG build dials it directly. It dials
// 127.0.0.1 and nothing else: any other host is refused before a socket
// exists, so a pairing code that names a real tailnet address can never make a
// DEBUG build reach past this Mac. It exists only inside `#if DEBUG`
// (conformance:ios rule d).

import Foundation

/// The route to the door's host, as the client needs it.
enum DoorRoute: Equatable, Sendable {
    /// Straight to the host, with no proxy at all.
    case direct
    /// Through a SOCKS5 proxy, which is how the tailnet node (Phase 316.3)
    /// and the ATS arm's loopback stand-in carry a request.
    case socks5(host: String, port: Int, username: String?, password: String?)
}

/// Where requests go. Asked once per request, so a node that stops between
/// two requests is noticed at the second.
protocol DoorTransport: Sendable {
    /// The route to `host`, or `DoorFailure.notPaired` when this transport
    /// cannot reach it at all.
    func route(to host: String) async throws -> DoorRoute
}

/// The transport this build ships with.
enum DoorTransports {
    /// Nil in a Release build until Phase 316.3 carries the tailnet node.
    static var shipping: DoorTransport? {
        #if DEBUG
        return DirectLoopbackTransport()
        #else
        return nil
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
#endif
