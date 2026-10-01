// DebugLaunch.swift — DEBUG ONLY: the arguments the DEBUG seams read, when
// the SYSTEM launched the app (Phase 316.5).
//
// WHY IT EXISTS. `probe:p316` drives the DEBUG app from XCUITest, which hands
// every launch its arguments: the door endpoint on this Mac's loopback
// (Door/Transport.swift), the still attention dot (Screens/Pieces.swift) and
// the alert address (Alerts/SystemAlerts.swift). A tap on an alert that
// COLD-launches the app (`alert-cold`, build/p3165/SPEC.md section 7.4) is a
// launch by iOS, with no argument at all, so without this the app would dial
// the code's public name, which does not resolve in a Simulator, and pulse
// the dot forever, and the arm would read a phone that cannot reach its Mac.
//
// So a DEBUG launch that carries arguments writes down those three seams, and
// only those three, into a file in its own container; a DEBUG launch that
// carries none reads them back. The pairing code and the forget are NEVER
// carried: a launch by the system must not pair or forget anything. None of
// this exists in a Release build (conformance:ios rule d).

import Foundation

#if DEBUG
enum DebugLaunchSeam {
    /// The seams a launch by the system carries on, each with whether a value
    /// follows it.
    static let carried: [(flag: String, takesValue: Bool)] = [
        (DoorEndpointDebugSeam.argument, true),
        (MotionDebugSeam.stillArgument, false),
        (AlertsDebugSeam.tokenArgument, true)
    ]

    /// The file in Application Support the carried seams are written to.
    static let fileName = "debug-launch.json"

    /// What the seams read for this launch: its own arguments, or, when the
    /// system launched the app with none, the program name and the seams the
    /// last launch that carried arguments was handed.
    static let arguments: [String] = resolve(ProcessInfo.processInfo.arguments, file: file())

    /// The carried seams in `arguments`, in `carried`'s order, each with its
    /// value; nothing else, and never a flag whose value is missing.
    static func carriedArguments(_ arguments: [String]) -> [String] {
        var out: [String] = []
        for seam in carried {
            let after = arguments.drop(while: { $0 != seam.flag })
            guard let flag = after.first else { continue }
            if seam.takesValue {
                guard let value = after.dropFirst().first else { continue }
                out.append(contentsOf: [flag, value])
            } else {
                out.append(flag)
            }
        }
        return out
    }

    /// This launch's arguments when it has any, and the carried seams written
    /// down for the next; else the program name and what was written down.
    static func resolve(_ launched: [String], file: URL?) -> [String] {
        var program = Array(launched.prefix(1))
        guard launched.dropFirst().isEmpty else {
            if let file, let data = try? JSONEncoder().encode(carriedArguments(launched)) {
                try? data.write(to: file, options: .atomic)
            }
            return launched
        }
        guard let file, let data = try? Data(contentsOf: file),
              let kept = try? JSONDecoder().decode([String].self, from: data) else { return program }
        program.append(contentsOf: carriedArguments(kept))
        return program
    }

    private static func file() -> URL? {
        guard let support = try? FileManager.default.url(
            for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true
        ) else { return nil }
        return support.appendingPathComponent(fileName, isDirectory: false)
    }
}
#endif
