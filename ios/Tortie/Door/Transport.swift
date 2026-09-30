// Transport.swift — where a connection to the door is opened (Phase 316.2;
// the Mac's public name since Phase 330).
//
// The door answers at `https://<publicName>:<publicPort>`, published by
// Tailscale Funnel on the Mac (build/p330/SPEC.md section 4.1). A Release build
// dials that NAME and nothing else (`NameTransport`), and the name is always
// the TLS server name and the HTTP `Host`, whatever is dialled.
//
// THIS FILE NAMES NO NETWORK TYPE. `DoorClient.swift` is the one network file
// (conformance:ios rule c); a transport only says which host and port to open
// a connection to, and the client does the rest.
//
// THE DEBUG SEAM. In the Simulator the door is reached through the stand-in's
// forwarder on this Mac's loopback, so a DEBUG build launched with
// `-TortieDebugDoorEndpoint 127.0.0.1:<port>` opens its connections to that
// port on 127.0.0.1 while the code's own name stays the SNI and the `Host`.
// It takes 127.0.0.1 and nothing else, and it exists only inside `#if DEBUG`
// (conformance:ios rule d).

import Foundation

/// Where one connection is opened. The door's own name is the TLS server name
/// and the `Host` whatever this says.
struct DoorRoute: Equatable, Sendable {
    let host: String
    let port: Int
}

/// Where connections go. Asked once per connection.
protocol DoorTransport: Sendable {
    /// The route to `door`, or `DoorFailure.notPaired` when this transport
    /// dials nothing for it.
    func route(to door: DoorEndpoint) throws -> DoorRoute
}

/// The door's public name and port, exactly as the code gave them.
struct NameTransport: DoorTransport {
    func route(to door: DoorEndpoint) throws -> DoorRoute {
        guard door.isPublic else { throw DoorFailure.notPaired }
        return DoorRoute(host: door.name, port: door.port)
    }
}

/// The transport this build ships with.
enum DoorTransports {
    /// The door's public name; in a DEBUG build launched with the endpoint
    /// seam, this Mac's loopback at the port it names.
    static var shipping: DoorTransport {
        #if DEBUG
        if let port = DoorEndpointDebugSeam.loopbackPort() {
            return DebugEndpointTransport(port: port)
        }
        #endif
        return NameTransport()
    }
}

#if DEBUG
/// DEBUG ONLY: `-TortieDebugDoorEndpoint 127.0.0.1:<port>`.
enum DoorEndpointDebugSeam {
    static let argument = "-TortieDebugDoorEndpoint"
    /// The only host the seam takes.
    static let loopbackHost = "127.0.0.1"

    /// The port the seam names, or nil when there is no seam or it names
    /// anything but a port on 127.0.0.1.
    static func loopbackPort(_ arguments: [String] = ProcessInfo.processInfo.arguments) -> Int? {
        guard let value = arguments.drop(while: { $0 != argument }).dropFirst().first else { return nil }
        let parts = value.split(separator: ":", omittingEmptySubsequences: false)
        guard parts.count == 2, parts[0] == loopbackHost,
              (1...5).contains(parts[1].utf8.count),
              parts[1].utf8.allSatisfy({ $0 >= UInt8(ascii: "0") && $0 <= UInt8(ascii: "9") }),
              let port = Int(parts[1]), (1...65535).contains(port) else { return nil }
        return port
    }
}

/// DEBUG ONLY: every connection to a door with a public name opened on this
/// Mac's loopback at one port, the name kept as the SNI and the `Host`.
struct DebugEndpointTransport: DoorTransport {
    let port: Int

    func route(to door: DoorEndpoint) throws -> DoorRoute {
        guard door.isPublic else { throw DoorFailure.notPaired }
        return DoorRoute(host: DoorEndpointDebugSeam.loopbackHost, port: port)
    }
}
#endif
