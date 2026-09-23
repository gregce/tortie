import Foundation
import XCTest
@testable import Tortie

/// The ATS arm of `probe:p316` (build/p316/SPEC.md section 4 S2, "Proof"; the
/// measurement is section 3.2). It is a unit test HOSTED IN THE APP, so it runs
/// under the SHIPPING Info.plist: the one App Transport Security exception for
/// 100.64.0.0/10, or, in the probe's copy of `ios/` with that key removed, none.
///
/// It dials `P316_ATS_HOST` (100.64.0.1) through the probe's SOCKS5 stand-in on
/// 127.0.0.1, with the SHIPPING door client and its `.socks5` route, whose
/// `allowFailover` is off, so no packet is sent to the 100.64/10 range: the
/// stand-in splices the one CONNECT it allows to a door on loopback. One
/// `POST /pair` of `{}`, and one line saying what came back.
///
/// IT ASSERTS NOTHING. The probe grades both directions: 200 (`pending`) with
/// the key, -1200 and zero requests served without it. The line protocol is
/// build/p316/probe-p316.mjs's header; each line is also appended to
/// `P316_LINES` when the probe names a file.
///
/// It skips itself unless `P316_RUN` is set, so `test:ios` passes over it.
final class P316ATSTests: XCTestCase {
    func testDialThroughSocks() async throws {
        let env = ProcessInfo.processInfo.environment
        guard let run = env["P316_RUN"], !run.isEmpty else {
            throw XCTSkip("probe:p316 drives this test; on its own it has no stand-in to dial.")
        }
        let line = { (object: [String: Any]) in ATSLine.emit(object, run: run, file: env["P316_LINES"]) }
        guard let host = env["P316_ATS_HOST"],
              let port = Int(env["P316_ATS_PORT"] ?? ""),
              let pin = env["P316_ATS_PIN"],
              let socks = Int(env["P316_SOCKS_PORT"] ?? "") else {
            line(["step": "ats", "ok": false, "failure": "environment", "code": NSNull()])
            return
        }
        let client = DoorClient(transport: SocksStandIn(port: socks))
        do {
            let answer = try await client.present(Data("{}".utf8), to: DoorAddress(host: host, port: port, pin: pin))
            line(["step": "ats", "ok": true, "answer": answer.rawValue])
        } catch let failure as DoorFailure {
            line(["step": "ats", "ok": false, "failure": ATSLine.name(failure), "code": ATSLine.code(failure) ?? NSNull()])
        } catch {
            line(["step": "ats", "ok": false, "failure": "other", "code": NSNull()])
        }
    }
}

/// The route the tailnet node will hand the client in 316.3, pointed at the
/// probe's stand-in instead.
private struct SocksStandIn: DoorTransport {
    let port: Int

    func route(to host: String) async throws -> DoorRoute {
        .socks5(host: "127.0.0.1", port: port, username: nil, password: nil)
    }
}

private enum ATSLine {
    static func emit(_ object: [String: Any], run: String, file: String?) {
        var body = object
        body["seq"] = 1
        guard let json = try? JSONSerialization.data(withJSONObject: body, options: [.sortedKeys]),
              let text = String(data: json, encoding: .utf8) else { return }
        let line = Data("P316|\(run)|\(text)\n".utf8)
        FileHandle.standardOutput.write(line)
        guard let file, !file.isEmpty else { return }
        if !FileManager.default.fileExists(atPath: file) {
            FileManager.default.createFile(atPath: file, contents: nil)
        }
        guard let handle = FileHandle(forWritingAtPath: file) else { return }
        defer { try? handle.close() }
        _ = try? handle.seekToEnd()
        try? handle.write(contentsOf: line)
    }

    /// The `DoorFailure` case, by name, for the probe's report.
    static func name(_ failure: DoorFailure) -> String {
        switch failure {
        case .notPaired: return "notPaired"
        case .wrongKey: return "wrongKey"
        case .unreachable: return "unreachable"
        case .timedOut: return "timedOut"
        case .refused: return "refused"
        case .unexpectedStatus: return "unexpectedStatus"
        case .tooLarge: return "tooLarge"
        case .malformed: return "malformed"
        case .badPage: return "badPage"
        case .cancelled: return "cancelled"
        }
    }

    /// The URL loading system's code, where the failure carries one.
    static func code(_ failure: DoorFailure) -> Int? {
        switch failure {
        case .unreachable(let code): return code
        case .unexpectedStatus(let status): return status
        case .wrongKey: return NSURLErrorCancelled
        case .timedOut: return NSURLErrorTimedOut
        default: return nil
        }
    }
}
