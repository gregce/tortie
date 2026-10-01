import Foundation
import XCTest

/// `probe:p316`'s hands and eyes in the Simulator (Phase 316.2, build/p316/SPEC.md
/// section 4 S2, "Proof"). It launches the DEBUG app with the Mac's pairing code,
/// walks the steps the probe names, and PRINTS what it reads: labels and frames
/// from the accessibility tree, never a photograph (conformance:ios rule i).
///
/// IT ASSERTS NOTHING. The probe is the judge: its own node reader reads the door
/// and computes what each screen must say (Method A), so the Swift never grades
/// the Swift. A step that cannot find its screen prints a dump named
/// `<step>-missing` and stops, so a hostile arm ends in a reading, not a hang.
///
/// THE LINE PROTOCOL is written in build/p316/probe-p316.mjs's header, and this
/// file is its writer. Every line is `P316|<run>|<one JSON object>` on stdout,
/// written unbuffered, and ALSO appended to `P316_LINES` when the probe names a
/// file, because whether xcodebuild relays a runner's output as it happens is not
/// something this repository has measured. Each object carries `seq`, so the
/// probe reads each line once whichever way it arrived.
///
/// It skips itself unless `P316_RUN` is set: it has nothing to do without the
/// door and the probe on the other side.
///
/// THE ALERT (Phase 316.5, build/p3165/SPEC.md section 7.4). Two more inputs:
/// `P316_PUSH_TOKEN`, hex handed to every launch as `-TortieDebugPushToken`
/// (a DEBUG build's alert address, which never comes from Apple), and
/// `P316_NOTIFICATIONS`, `allow` (the default) or `deny`, the answer given to
/// iOS's question if it asks. It asks only when the Mac the app is pairing
/// with says it can send (research 136 section 9), so the `pair` step waits up
/// to 10 seconds for the question and says whether it came. The alert steps
/// press Home, say `ready-for-alert` so the probe delivers the payload it
/// queued, find the banner in SpringBoard by its label (Notification Center
/// is tried when no banner shows) and tap it, and read where the app went.
/// Labels and frames only, never a photograph.
final class P316DriveUITests: XCTestCase {
    @MainActor
    func testDrive() throws {
        let env = ProcessInfo.processInfo.environment
        guard let run = env["P316_RUN"], !run.isEmpty else {
            throw XCTSkip("probe:p316 drives this test; on its own it has no door to read.")
        }
        continueAfterFailure = true
        Drive(run: run, env: env).go()
    }
}

// MARK: - The lines

/// One writer for the protocol. Nothing here holds a key or a signature: the
/// labels it prints are what the screen drew, and the probe keeps only their
/// digests in its report.
@MainActor
final class ProbeLines {
    let run: String
    let file: String?
    private var seq = 0

    init(run: String, file: String?) {
        self.run = run
        self.file = file
    }

    func emit(_ object: [String: Any]) {
        seq += 1
        var body = object
        body["seq"] = seq
        guard let json = try? JSONSerialization.data(withJSONObject: body, options: [.sortedKeys, .withoutEscapingSlashes]),
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
}

// MARK: - The drive

/// The identifiers this file reads. They are ios/Tortie/Screens/Identifiers.swift's,
/// spelled again because a UI test cannot import the app; the probe reads the same
/// names, so a renamed identifier fails there by name.
private enum Seen {
    static let listScreen = "screen-list"
    static let listAlertsLine = "list-alerts-line"
    static let listNotice = "list-notice"
    static let listLoading = "list-loading"
    static let listFailure = "list-failure"
    static let sessionScreen = "screen-session"
    static let sessionLoading = "session-loading"
    static let sessionOpenConversation = "session-open-conversation"
    static let conversationScreen = "screen-conversation"
    static let conversationLoading = "conversation-loading"
    static let conversationOlder = "conversation-older"
    static let conversationOlderLine = "conversation-older-line"
    static let conversationFailure = "conversation-failure"
    static let pairingScreen = "screen-pairing"
    static let pairingFingerprint = "pairing-fingerprint"
    static let pairingAgain = "pairing-again"
    static let turn = "turn-"
    static let turnAsk = "turn-ask-"
    static let turnAnswer = "turn-answer-"
    static let turnAbsence = "turn-absence-"
    static let pairingLine = "pairing-line"
    static func row(_ id: String) -> String { "row-" + id }
    /// Where a screen says what it could not read: a `*-failure`, the pairing
    /// screen's line, or the line where older turns would be.
    static func isSentence(_ id: String) -> Bool {
        id.hasSuffix("-failure") || id == pairingLine || id == conversationOlderLine
    }
    static func retry(_ failure: String) -> String { failure + "-retry" }
}

/// One element read from a snapshot: its identifier, its label and its frame.
private struct Found {
    let id: String
    let label: String
    let frame: CGRect
}

@MainActor
private final class Drive {
    private let app = XCUIApplication()
    private let lines: ProbeLines
    private let payload: String
    /// `127.0.0.1:<port>`, the stand-in funnel's forwarder on this Mac
    /// (Phase 330), or nil to dial the code's own name.
    private let endpoint: String?
    private let steps: [String]
    private let wait: TimeInterval
    /// The DEBUG build's alert address, handed to every launch, or nil.
    private let pushToken: String?
    /// The answer to iOS's alert question: true is Allow.
    private let allowNotifications: Bool
    /// SpringBoard, where iOS's question and the banners are drawn.
    private let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    /// Set when a step could not find its screen: nothing after it can run.
    private var stuck = false

    init(run: String, env: [String: String]) {
        lines = ProbeLines(run: run, file: env["P316_LINES"])
        payload = env["P316_PAYLOAD"] ?? ""
        endpoint = env["P330_DOOR_ENDPOINT"].flatMap { $0.isEmpty ? nil : $0 }
        steps = (env["P316_STEPS"] ?? "").split(separator: ",").map { String($0).trimmingCharacters(in: .whitespaces) }
        wait = TimeInterval(env["P316_WAIT_S"] ?? "") ?? 60
        pushToken = env["P316_PUSH_TOKEN"].flatMap { $0.isEmpty ? nil : $0 }
        allowNotifications = (env["P316_NOTIFICATIONS"] ?? "allow") != "deny"
    }

    /// The seams every launch carries: the still dot, the forwarder and the
    /// alert address. The pairing code and the forget are the first launch's.
    private var carried: [String] {
        var arguments = ["-TortieDebugStill"]
        if let endpoint { arguments += ["-TortieDebugDoorEndpoint", endpoint] }
        if let pushToken { arguments += ["-TortieDebugPushToken", pushToken] }
        return arguments
    }

    func go() {
        // The DEBUG seams the app reads (Door/Pairing.swift, Screens/Pieces.swift,
        // Door/Transport.swift): start with no pairing kept, hold the attention
        // dot still so XCUITest can see the app go idle, take the Mac's code as
        // the camera would, and open every connection to the stand-in funnel's
        // forwarder on this Mac while the code's name stays the TLS name.
        // Since Phase 316.5 it also hands over the alert address, when the
        // probe names one.
        app.launchArguments = ["-TortieDebugForgetPairing", "-TortieDebugPairingPayload", payload] + carried
        app.launch()
        for step in steps where !stuck {
            if step == "pair" {
                pair()
            } else if step == "list" {
                list()
            } else if step.hasPrefix("open:") {
                open(String(step.dropFirst("open:".count)))
            } else if step.hasPrefix("visit:") {
                open(String(step.dropFirst("visit:".count)), dumping: "visit")
            } else if step == "back" {
                back()
            } else if step == "conversation" {
                conversation()
            } else if step == "first" {
                first()
            } else if step == "unpaired" {
                unpaired()
            } else if step == "sentence" {
                sentence()
            } else if step == "alert" || step == "alert-gone" || step == "alert-list" {
                alert(step, cold: false)
            } else if step == "alert-cold" {
                alert(step, cold: true)
            } else if step.hasPrefix("relaunch-token:") {
                relaunch(token: String(step.dropFirst("relaunch-token:".count)))
            } else if step.hasPrefix("no-banner:") {
                noBanner(seconds: TimeInterval(String(step.dropFirst("no-banner:".count))) ?? 20)
            } else {
                lines.emit(["step": "unknown-step", "name": step])
            }
        }
        lines.emit(["step": "alive", "state": Int(app.state.rawValue)])
        lines.emit(["step": "done"])
    }

    // MARK: Steps

    private func pair() {
        _ = poll { has($0, Seen.pairingFingerprint) || has($0, Seen.pairingAgain) || has($0, Seen.listScreen) }
        let fingerprint = find(tree(), Seen.pairingFingerprint)
        lines.emit(["step": "fingerprint", "text": fingerprint.map { $0.label as Any } ?? NSNull()])
        // iOS asks only when the Mac says it can send, and the phone hears
        // that on its first `pending`: 10 seconds for it, then said either way.
        // A question that comes later (a name that took long to resolve) is
        // still answered, marked late, so the pairing never waits on it.
        var answered = fingerprint != nil ? notifications(within: 10) : true
        // Paired is the list, which only the first SIGNED read draws; stopped is
        // `Pair again`, which only a pairing that ended draws.
        _ = poll { found in
            if !answered, self.springboard.alerts.firstMatch.exists { answered = self.notifications(within: 0, late: true) }
            return has(found, Seen.listScreen) || has(found, Seen.pairingAgain)
        }
        dump("pair-end")
        if !has(tree(), Seen.listScreen) { stuck = true }
    }

    private func list() {
        guard poll({ has($0, Seen.listScreen) && !has($0, Seen.listLoading) }) else {
            return missing("list")
        }
        // The probe reads the door around this read, so an age that ticks over a
        // minute while the app reads is one of the two the probe saw.
        lines.emit(["step": "list-before"])
        Thread.sleep(forTimeInterval: 2)
        pull(Seen.listScreen)
        Thread.sleep(forTimeInterval: 3)
        _ = poll { has($0, Seen.listScreen) && !has($0, Seen.listLoading) }
        dump("list")
    }

    /// A row tapped from the list; the session screen dumped as `session`, or
    /// as `visit` for the screen an alert is then tapped over (N6b).
    private func open(_ sessionId: String, dumping name: String = "session") {
        guard has(tree(), Seen.listScreen) else { return missing("open") }
        let row = element(Seen.row(sessionId))
        guard row.waitForExistence(timeout: 5) else { return missing("open") }
        row.tap()
        guard poll({ has($0, Seen.sessionScreen) && !has($0, Seen.sessionLoading) }) else {
            return missing(name)
        }
        dump(name)
    }

    /// Back to the list the way a person goes: the navigation bar's back
    /// button until the list is on top, then dumped as `back`. N6 taps its
    /// alert from here (the 316.5 fix round), because a tap over the very
    /// session it names changes nothing on screen, and that arrangement hid a
    /// defect every tap from the list showed.
    private func back() {
        let deadline = Date().addingTimeInterval(wait)
        while Date() < deadline {
            let found = tree()
            if has(found, Seen.listScreen) && !has(found, Seen.sessionScreen) && !has(found, Seen.conversationScreen) && !has(found, Seen.listLoading) {
                dump("back")
                return
            }
            let button = app.navigationBars.buttons.element(boundBy: 0)
            if button.exists { button.tap() }
            Thread.sleep(forTimeInterval: 1)
        }
        missing("back")
    }

    private func conversation() {
        let button = element(Seen.sessionOpenConversation)
        guard button.waitForExistence(timeout: 5) else { return missing("conversation") }
        var tries = 0
        while !button.isHittable && tries < 6 {
            element(Seen.sessionScreen).swipeUp()
            tries += 1
        }
        button.tap()
        guard poll({ has($0, Seen.conversationScreen) && !has($0, Seen.conversationLoading) }) else {
            return missing("conversation")
        }
        dump("conversation")
    }

    /// Toward the oldest turn: swipe down until no older page remains to ask for
    /// and three swipes add nothing, or the screen says why it stopped.
    private func first() {
        guard has(tree(), Seen.conversationScreen) else { return missing("first") }
        var asks: [String: String] = [:]
        var answers: [String: String] = [:]
        var absences: [String: String] = [:]
        var indexes = Set<Int>()
        var quiet = 0
        var lastCount = -1
        let scroll = element(Seen.conversationScreen).scrollViews.firstMatch
        let deadline = Date().addingTimeInterval(wait)
        while Date() < deadline {
            let found = tree()
            for item in found {
                if let i = index(item.id, after: Seen.turnAsk) {
                    asks[String(i)] = item.label
                } else if let i = index(item.id, after: Seen.turnAnswer) {
                    answers[String(i)] = item.label
                } else if let i = index(item.id, after: Seen.turnAbsence) {
                    absences[String(i)] = item.label
                } else if let i = index(item.id, after: Seen.turn) {
                    indexes.insert(i)
                }
            }
            if has(found, Seen.conversationFailure) || has(found, Seen.conversationOlderLine) { break }
            if !has(found, Seen.conversationOlder) {
                quiet = indexes.count == lastCount ? quiet + 1 : 0
                if quiet >= 3 { break }
            }
            lastCount = indexes.count
            if scroll.exists { scroll.swipeDown() }
            Thread.sleep(forTimeInterval: 0.6)
        }
        lines.emit([
            "step": "turns",
            "indexes": indexes.sorted(),
            "asks": asks,
            "answers": answers,
            "absences": absences
        ])
        dump("conversation-top")
    }

    /// Wait for the one sentence a screen draws in place of what it could not
    /// read, and dump the screen with it. A list arm of the hostile door answers
    /// the list's refresh with its body, and a body that never completes is
    /// said only after the client's own time limit, so the `list` step's dump
    /// can come before the sentence does (Phase 316.2's fix round).
    private func sentence() {
        guard poll({ found in found.contains { Seen.isSentence($0.id) && !$0.label.isEmpty } }) else {
            return missing("sentence")
        }
        dump("sentence")
    }

    /// The Mac removes this iPhone once the probe reads `ready-for-remove`; the
    /// app must end on the pairing screen with its not-paired line. It is walked
    /// back to the list and the list is asked again, the way a person would.
    private func unpaired() {
        lines.emit(["step": "ready-for-remove"])
        Thread.sleep(forTimeInterval: 3)
        let deadline = Date().addingTimeInterval(wait)
        while Date() < deadline {
            let found = tree()
            if has(found, Seen.pairingScreen) {
                dump("unpaired")
                return
            }
            if has(found, Seen.listScreen) {
                let retry = element(Seen.retry(Seen.listFailure))
                if has(found, Seen.retry(Seen.listFailure)) && retry.exists {
                    retry.tap()
                } else {
                    pull(Seen.listScreen)
                }
            } else {
                let back = app.navigationBars.buttons.element(boundBy: 0)
                if back.exists { back.tap() }
            }
            Thread.sleep(forTimeInterval: 2)
        }
        missing("unpaired")
    }

    // MARK: The alert (Phase 316.5)

    /// iOS's alert question, if it comes within `seconds`: what it says, and
    /// the press. It comes only when the Mac said it can send. Answers whether
    /// it was asked (and so needs no more watching).
    @discardableResult
    private func notifications(within seconds: TimeInterval, late: Bool = false) -> Bool {
        let question = springboard.alerts.firstMatch
        guard question.waitForExistence(timeout: seconds) else {
            if !late { lines.emit(["step": "notifications", "asked": false]) }
            return false
        }
        let buttons = question.buttons.allElementsBoundByIndex.map(\.label)
        var asked: [String: Any] = ["step": "notifications", "asked": true, "title": question.label, "buttons": buttons]
        if late { asked["late"] = true }
        lines.emit(asked)
        let labels = allowNotifications ? ["Allow"] : ["Don\u{2019}t Allow", "Don't Allow"]
        guard let label = labels.first(where: { question.buttons[$0].exists }) else {
            lines.emit(["step": "notifications", "answered": NSNull()])
            return true
        }
        question.buttons[label].tap()
        lines.emit(["step": "notifications", "answered": allowNotifications ? "allow" : "deny"])
        return true
    }

    /// Home, `ready-for-alert`, the banner tapped, and where the app went.
    /// `cold` ends the app first, so the tap is what launches it.
    private func alert(_ name: String, cold: Bool) {
        if cold {
            app.terminate()
            _ = app.wait(for: .notRunning, timeout: 10)
        } else {
            home()
        }
        lines.emit(["step": "ready-for-alert", "name": name, "cold": cold])
        guard let banner = findBanner(within: wait) else {
            lines.emit(["step": "banner", "name": name, "label": NSNull()])
            return missing(name)
        }
        lines.emit(["step": "banner", "name": name, "label": banner.found.label, "via": banner.via])
        tapSpringboard(banner.found.frame)
        let foreground = app.wait(for: .runningForeground, timeout: 30)
        lines.emit(["step": "opened", "name": name, "cold": cold, "foreground": foreground, "state": Int(app.state.rawValue)])
        guard foreground, poll({ settled($0) }) else { return missing(name) }
        // A session the Mac no longer has goes back to the list, which says so
        // once its own read answers: give it that read before reading.
        Thread.sleep(forTimeInterval: 3)
        _ = poll { settled($0) }
        dump(name)
    }

    /// A delivered alert that must NOT show: Home, `ready-for-alert`, and
    /// `seconds` of looking. The app is brought back after.
    private func noBanner(seconds: TimeInterval) {
        home()
        lines.emit(["step": "ready-for-alert", "name": "no-banner", "cold": false])
        let banner = findBanner(within: seconds, center: false)
        lines.emit(["step": "banner", "name": "no-banner", "label": banner.map { $0.found.label as Any } ?? NSNull()])
        app.activate()
        _ = app.wait(for: .runningForeground, timeout: 30)
        _ = poll { settled($0) }
        dump("no-banner")
    }

    /// End the app and launch it again, still paired, with another alert
    /// address, and read the list once the launch's own check has run.
    private func relaunch(token: String) {
        app.terminate()
        _ = app.wait(for: .notRunning, timeout: 10)
        var arguments = ["-TortieDebugStill"]
        if let endpoint { arguments += ["-TortieDebugDoorEndpoint", endpoint] }
        arguments += ["-TortieDebugPushToken", token]
        app.launchArguments = arguments
        app.launch()
        guard poll({ has($0, Seen.listScreen) && !has($0, Seen.listLoading) }) else { return missing("relaunch") }
        Thread.sleep(forTimeInterval: 3)
        dump("relaunch")
    }

    /// Home, and the app out of the foreground, whichever background state
    /// iOS puts it in (suspended or not).
    private func home() {
        XCUIDevice.shared.press(.home)
        let deadline = Date().addingTimeInterval(10)
        while app.state == .runningForeground && Date() < deadline {
            Thread.sleep(forTimeInterval: 0.25)
        }
    }

    /// A screen the app settles on after a tap: the session read, or the list.
    private func settled(_ found: [Found]) -> Bool {
        (has(found, Seen.sessionScreen) && !has(found, Seen.sessionLoading))
            || (has(found, Seen.listScreen) && !has(found, Seen.listLoading))
    }

    /// Tortie's banner in SpringBoard, looked for four times a second in ONE
    /// snapshot each time: the short look iOS draws a banner as, or an element
    /// whose label begins `Tortie,` (the app's name, then what it says), and
    /// never the app's icon, whose label is the app's name too. With none by
    /// the end, Notification Center, once.
    private func findBanner(within seconds: TimeInterval, center: Bool = true) -> (found: Found, via: String)? {
        let deadline = Date().addingTimeInterval(seconds)
        repeat {
            if let found = bannerElement() { return (found, "banner") }
            Thread.sleep(forTimeInterval: 0.25)
        } while Date() < deadline
        guard center else { return nil }
        // Notification Center: a drag down from the top edge.
        let top = springboard.coordinate(withNormalizedOffset: CGVector(dx: 0.3, dy: 0.001))
        let down = springboard.coordinate(withNormalizedOffset: CGVector(dx: 0.3, dy: 0.6))
        top.press(forDuration: 0.1, thenDragTo: down)
        let later = Date().addingTimeInterval(5)
        repeat {
            if let found = bannerElement() { return (found, "center") }
            Thread.sleep(forTimeInterval: 0.25)
        } while Date() < later
        return nil
    }

    private func bannerElement() -> Found? {
        guard let root = try? springboard.snapshot() else { return nil }
        var stack: [XCUIElementSnapshot] = [root]
        while let node = stack.popLast() {
            let named = node.identifier == "NotificationShortLookView" || node.label.lowercased().hasPrefix("tortie,")
            if named, node.elementType != .icon, node.frame.width > 0, node.frame.height > 0 {
                return Found(id: node.identifier, label: node.label, frame: node.frame)
            }
            stack.append(contentsOf: node.children.reversed())
        }
        return nil
    }

    /// A press at the middle of a frame SpringBoard drew.
    private func tapSpringboard(_ frame: CGRect) {
        springboard.coordinate(withNormalizedOffset: .zero)
            .withOffset(CGVector(dx: frame.midX, dy: frame.midY))
            .tap()
    }

    // MARK: Reading

    private func missing(_ step: String) {
        dump(step + "-missing")
        stuck = true
    }

    private func element(_ id: String) -> XCUIElement {
        app.descendants(matching: .any).matching(identifier: id).firstMatch
    }

    /// Every element with an identifier, from ONE snapshot of the app, so a
    /// reading is one moment and an absent element is an answer, not a failure.
    private func tree() -> [Found] {
        guard let root = try? app.snapshot() else { return [] }
        var out: [Found] = []
        var stack: [XCUIElementSnapshot] = [root]
        while let node = stack.popLast() {
            if !node.identifier.isEmpty {
                out.append(Found(id: node.identifier, label: node.label, frame: node.frame))
            }
            stack.append(contentsOf: node.children.reversed())
        }
        return out
    }

    private func has(_ found: [Found], _ id: String) -> Bool {
        found.contains { $0.id == id }
    }

    private func find(_ found: [Found], _ id: String) -> Found? {
        found.first { $0.id == id }
    }

    /// The number after `prefix` when the rest of the identifier is only digits.
    private func index(_ id: String, after prefix: String) -> Int? {
        guard id.hasPrefix(prefix) else { return nil }
        let rest = id.dropFirst(prefix.count)
        guard !rest.isEmpty, rest.allSatisfy(\.isNumber) else { return nil }
        return Int(rest)
    }

    /// Asks `condition` of a fresh snapshot four times a second until it holds
    /// or the step's wait runs out.
    private func poll(_ condition: ([Found]) -> Bool) -> Bool {
        let deadline = Date().addingTimeInterval(wait)
        repeat {
            if condition(tree()) { return true }
            Thread.sleep(forTimeInterval: 0.25)
        } while Date() < deadline
        return condition(tree())
    }

    /// Pull to refresh: a press near the top of the screen dragged down.
    private func pull(_ id: String) {
        let screen = element(id)
        guard screen.exists else { return }
        let from = screen.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25))
        let to = screen.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.85))
        from.press(forDuration: 0.1, thenDragTo: to)
    }

    /// Every element with an identifier, its label and its frame in points.
    private func dump(_ name: String) {
        let root = try? app.snapshot()
        var elements: [[String: Any]] = []
        var stack: [XCUIElementSnapshot] = root.map { [$0] } ?? []
        while let node = stack.popLast() {
            if !node.identifier.isEmpty {
                let f = node.frame
                elements.append([
                    "id": node.identifier,
                    "label": node.label,
                    // A frame JSON cannot carry (an infinity) is written as -1.
                    "frame": [f.origin.x, f.origin.y, f.size.width, f.size.height].map { $0.isFinite ? Double($0) : -1 }
                ])
            }
            stack.append(contentsOf: node.children.reversed())
        }
        let window = root?.frame.size ?? .zero
        lines.emit([
            "step": "screen",
            "name": name,
            "window": [Double(window.width), Double(window.height)],
            "elements": elements
        ])
    }
}
