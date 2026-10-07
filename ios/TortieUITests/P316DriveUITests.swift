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
///
/// THE TABS, SETTINGS AND THE RENDERED ANSWER (Phase 316.6, build/p3166/SPEC.md
/// section 7.4). Pairing lands on the Needs input tab, so `pair` ends at
/// `screen-needs-input` and `list` selects the Sessions tab first. A tab's
/// button has no identifier (SwiftUI gives a `Tab` none), so it is found by
/// its label, the Copy word spelled again here. New steps read the tab bar
/// and its badge, the answer drawn as markdown (every `md-` element and every
/// link), a link's alert and where Open takes it, Settings, Unpair's question
/// and its press, and a relaunch with no forget seam. `first` and the session
/// dump compose an answer from its `md-` labels, because `turn-answer-<i>` and
/// `session-answer` are now containers whose own label is empty. Since his
/// ruling of 2026-10-02 (markdown off) every answer is ONE element,
/// `md-<scope>-0`, drawn as written, and no answer holds a link, so the probe
/// asks for no `link:` step; the steps stay for the later phase.
///
/// END, BEHIND FACE ID (Phase 317, build/p317/SPEC.md section 7.5). More
/// steps press End on one session and on several and say when iOS's owner
/// check is up (`end-auth-up`), so the probe can answer Face ID
/// from the host through build/simulator-run.mjs's `biometry`. iOS's first-use
/// Face ID alert is accepted here, through SpringBoard (its allowing button read
/// by label, waited for up to 5 seconds), and `end-auth-up` is printed only
/// once that alert is gone. Where a step must wait for the probe (the host has
/// enrolled, answered or unenrolled), it waits for a file the probe writes into
/// `P316_ACKS`, named in the line it printed. Nothing here answers Face ID
/// itself: there is no seam that skips the owner check. (The fix round took
/// Unpair's Mac half out of the phase, and its steps `unpair-mac`,
/// `unpair-mac-down` and `repair` with it.)
///
/// THE REPLY (Phase 318, build/p318/SPEC.md section 7.7, the `reply` group).
/// Steps that press an option the Mac offers (`reply-press:<n>`, n the
/// option's place from 0), send one message (`reply-say:<b64url>`,
/// `reply-refused:<b64url>`, `reply-again`, `reply-edit:<b64url>`), read that
/// nothing is offered (`reply-none`), leave at once (`reply-home:say:<b64url>`,
/// `reply-home:press:<n>`), focus the box (`reply-focus`) and wait for the
/// Mac (`reply-wait:<tag>`). The words come base64url, because the step list
/// is split on commas. Before every press and every Send the step prints
/// `reply-offer` or `reply-send-ready` and waits for the probe's file
/// `reply-<seq>` in P316_ACKS, so the probe reads the agent's screen, types
/// at the Mac or holds the relay at THAT moment. Nothing here asks Face ID,
/// and every reading is a label or a frame.
///
/// THE SESSIONS TAB (Phase 316.7, build/p3167/SPEC.md section 9.4). The tab
/// is a lazy list now, so a row off screen is not in the tree: `open:` and
/// `select:` bring a row into view before they press it, and `sessions-dump`
/// walks the list from its top to its end and prints every `row-`, `group-`
/// and `list-` element it met, in the order it met them. New steps press the
/// Show control (`show:`), choose in the one menu (`menu:<section>:<label>`,
/// found by the Copy words the probe hands in), read the menu (`menu-read`),
/// clear the filters, open or close a project (`group:`), mark a reading the
/// probe brackets (`sessions-mark:`, which waits for the probe's file), read
/// the face the tab draws with and without a pull, time the first row, pull
/// while End these is done, and relaunch keeping the pairing with an
/// optional planted defaults value (`relaunch-choices:<key>=<value>`, a launch
/// argument in UserDefaults' own argument domain, so no DEBUG seam is added).
/// Nothing here sorts, filters or decides what is drawn; it reads.
///
/// THE SCREEN (Phase 337, build/p337/SPEC.md section 7.8, the `screen`
/// group). Steps open a session's Screen (`screen-open`), pinch and drag it
/// (`screen-zoom`), turn the device and come back (`screen-rotate`), type
/// (`screen-type:<b64url>`, the words base64url because the step list is
/// split on commas), press one key of the bar (`screen-key:<name>`) or ctrl
/// then a letter (`screen-ctrl:<letter>`), press a key twice inside a question
/// (`screen-question:<name>:<ms>`), select a row and Copy it
/// (`screen-select:<n>`), type then leave at once (`screen-home:<b64url>`),
/// wait with the Screen up (`screen-wait:<tag>`) and read End in the top bar
/// (`end-top`). Before every key and every press of the bar the step prints a
/// `…-ready` line and waits for the probe's file `screen-<seq>` in P316_ACKS,
/// so the probe reads the pane, holds the relay or reads the pasteboard at
/// THAT moment. Every reading is a label or a frame: each `screen-row-<n>`'s
/// label is the row's text. Nothing here asks Face ID, and `auth` in a line
/// says whether iOS's owner check was up, which must never be so for a key.
///
/// TERMINAL FIRST (Phase 337.1, build/p3371/SPEC.md section 7.8). A list row
/// now opens a running session on its Terminal at once, and an ended one on
/// Catch Me Up (the Conversation renamed). `open:` waits for the session's
/// route WHICHEVER face it draws and prints a `face` line saying which;
/// `screen-open` is a wait for the grid. Every earlier step that read the
/// session page's card, counts, last answer, message box or Conversation row
/// (`conversation`, `first`, `markdown`, `link:`, the `reply-` steps that send
/// a message or read the box, `idle:`, `end-read` and the alert taps' reads)
/// presses the Catch Me Up icon first when the Terminal is the face, through
/// ONE helper, `toCatchUp(for:)`, which does nothing when Catch Me Up already
/// is and prints its own `face` line; `reply-press:<n>` presses 318's
/// `session-choice-press-<n>` wherever it is drawn, which on a live session is
/// the Terminal's tray; End is pressed in the top bar of whichever face is up.
/// The new steps: `terminal-open:<id>` (a row tapped, the time to the first
/// row printed, the status line and the top bar read), `catch-up` (the icon,
/// Catch Me Up read, Back), `scroll-up:<n>` (n drags up, a reading after
/// each), `scroll-hold` (the finger lifted, readings until pages land),
/// `scroll-drag-hold` (a drag, then the hold as its finger lifts; the fix
/// round), `fling-up`, `to-live`, `scroll-key:<name>` (scrolled back, then a
/// key), `keyboard-glitch` (row 0 before, with and after the keyboard, a long
/// press along row 3 and Copy; section 14 M12), `tray-keyboard` (the keyboard
/// raised over the question's tray and put away; the fix round) and
/// `tray-press:<n>`. A reading is
/// every `screen-row-<n>` and `screen-history-<i>` with its label and frame,
/// never a photograph.
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

    /// Writes one line and answers its `seq`, which a step names a file it
    /// waits for by (Phase 317).
    @discardableResult
    func emit(_ object: [String: Any]) -> Int {
        seq += 1
        var body = object
        body["seq"] = seq
        guard let json = try? JSONSerialization.data(withJSONObject: body, options: [.sortedKeys, .withoutEscapingSlashes]),
              let text = String(data: json, encoding: .utf8) else { return seq }
        let line = Data("P316|\(run)|\(text)\n".utf8)
        FileHandle.standardOutput.write(line)
        guard let file, !file.isEmpty else { return seq }
        if !FileManager.default.fileExists(atPath: file) {
            FileManager.default.createFile(atPath: file, contents: nil)
        }
        guard let handle = FileHandle(forWritingAtPath: file) else { return seq }
        defer { try? handle.close() }
        _ = try? handle.seekToEnd()
        try? handle.write(contentsOf: line)
        return seq
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
    /// A session's route, WHICHEVER face it draws (Phase 337.1, D16): the
    /// Terminal (`screenScreen` inside it) or Catch Me Up (`catchUpScreen`).
    static let sessionScreen = "screen-session"
    static let sessionLoading = "session-loading"
    static let sessionFailureId = "session-failure"
    /// Phase 337.1 (D18, D21): the Terminal's Catch Me Up icon, and Catch Me
    /// Up, the Conversation renamed: a face inside the session's route, or a
    /// page of its own pushed by the icon, which carries this alone.
    static let sessionOpenCatchUp = "session-open-catch-up"
    static let catchUpScreen = "screen-catch-up"
    static let catchUpLoading = "catch-up-loading"
    static let catchUpOlder = "catch-up-older"
    static let catchUpOlderLine = "catch-up-older-line"
    static let catchUpFailure = "catch-up-failure"
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
        id.hasSuffix("-failure") || id == pairingLine || id == catchUpOlderLine || id == screenScrollbackLine
    }
    static func retry(_ failure: String) -> String { failure + "-retry" }

    // Phase 316.6: the Needs input tab, Settings and the drawn answer.
    static let needsScreen = "screen-needs-input"
    static let needsTitle = "needs-input-title"
    static let needsAlertsLine = "needs-list-alerts-line"
    static let needsNotice = "needs-list-notice"
    static let needsLoading = "needs-list-loading"
    static let needsFailure = "needs-list-failure"
    static let needsEmpty = "needs-list-empty"
    static let needsAgeNote = "needs-list-age-note"
    static let needsRead = "needs-list-read"
    static func needsRow(_ id: String) -> String { "needs-row-" + id }
    static func needsRowDot(_ id: String) -> String { "needs-row-dot-" + id }
    static func needsRowName(_ id: String) -> String { "needs-row-name-" + id }
    static func needsRowMachine(_ id: String) -> String { "needs-row-machine-" + id }
    static func needsRowAge(_ id: String) -> String { "needs-row-age-" + id }
    static func needsRowLine(_ id: String) -> String { "needs-row-line-" + id }
    static let settingsScreen = "screen-settings"
    static let settingsTitle = "settings-title"
    static let settingsMac = "settings-mac"
    static let settingsMacName = "settings-mac-name"
    static let settingsMacAddress = "settings-mac-address"
    static let settingsMacRead = "settings-mac-read"
    static let settingsMatch = "settings-match"
    static let settingsFingerprint = "settings-fingerprint"
    static let settingsPaired = "settings-paired"
    static let settingsAlerts = "settings-alerts"
    static let settingsNotifications = "settings-notifications"
    static let settingsNotificationsState = "settings-notifications-state"
    static let settingsAlertsLine = "settings-alerts-line"
    static let settingsUnpair = "settings-unpair"
    static let settingsUnpairLine = "settings-unpair-line"
    static let settingsAbout = "settings-about"
    static let settingsVersion = "settings-version"
    static let sessionAnswer = "session-answer"
    static let md = "md-"
    static let mdLast = "last"
    // Phase 317: End and End these.
    static let sessionStatus = "session-status"
    static let sessionEndBar = "session-end-bar"
    static let sessionEnd = "session-end"
    static let sessionEndLine = "session-end-line"
    static let endConfirming = "end-confirming"
    static let listSelect = "list-select"
    static let listEndSelected = "list-end-selected"
    static let batchHeading = "batch-heading"
    static let batchDone = "batch-done"
    static let batchLine = "batch-line"
    static func rowSelect(_ id: String) -> String { "row-select-" + id }
    static func rowOutcome(_ id: String) -> String { "row-outcome-" + id }
    // Phase 318: the reply.
    static func sessionChoicePress(_ n: Int) -> String { "session-choice-press-" + String(n) }
    static let sessionChoicePressPrefix = "session-choice-press-"
    static let sessionChoicesNote = "session-choices-note"
    static let sessionReplyLine = "session-reply-line"
    static let sessionCommand = "session-command"
    static let sessionMessageStrip = "session-message-strip"
    static let sessionMessageField = "session-message-field"
    static let sessionMessageSend = "session-message-send"
    static let sessionMessageLine = "session-message-line"
    /// The strip's resting line and its line while a write runs: Copy.swift's
    /// `oneMessage` and `sending`, spelled again because a UI test cannot
    /// import the app. A line that is neither is a write's answer.
    static let oneMessage = "Goes to this session as one message."
    static let sending = "Sending…"
    // Phase 316.7: the Sessions tab's controls and its project headers.
    /// The list's title, the first line the tab draws: drawn and pressable
    /// only at the list's top, because the tab is lazy and it scrolls away.
    static let listTitle = "list-title"
    static let listShow = "list-show"
    static func showSegment(_ word: String) -> String { "list-show-" + word }
    static let listMenu = "list-menu"
    static let listClearFilters = "list-clear-filters"
    static let listNoMatch = "list-no-match"
    static let listNoSessions = "list-no-sessions"
    static let listSessionsLeftOut = "list-sessions-left-out"
    static func group(_ id: String) -> String { "group-" + id }
    /// The menu's Clear filters item, `Copy.clearFilters` spelled again (a UI
    /// test cannot import the app).
    static let clearFiltersWords = "Clear filters"
    /// The prefixes a sessions dump keeps: the rows, the headers, and the list's own.
    static let sessionsPrefixes = ["row-", "group-", "list-", "section-"]
    /// iOS's own first-use Face ID question's allowing press, by label, and
    /// the press that ends its failed-match prompt.
    static let faceIDAllow = ["OK", "Allow"]
    static let faceIDCancel = "Cancel"
    /// The three tabs' labels: Copy.swift's words, spelled again because a UI
    /// test cannot import the app (`Copy.needsInput`, `.sessions`, `.settings`).
    static let tabNeedsInput = "Needs input"
    static let tabSessions = "Sessions"
    static let tabSettings = "Settings"
    /// Unpair's question's presses (`Copy.unpair`, `Copy.cancel`) and the
    /// link alert's (`Copy.open`, `Copy.cancel`).
    static let unpairPress = "Unpair"
    static let cancelPress = "Cancel"
    static let openPress = "Open"
    static let safari = "com.apple.mobilesafari"
    /// A screen the app is paired on: either list tab.
    static func paired(_ id: String) -> Bool { id == listScreen || id == needsScreen }
    /// The Screen (Phase 337, Identifiers.swift's section 5.8.7 names), the
    /// TERMINAL since Phase 337.1. `session-open-screen` is the parent's row,
    /// which this build never draws; a step that finds it presses it.
    static let sessionOpenScreen = "session-open-screen"
    static let screenScreen = "screen-screen"
    static let screenGrid = "screen-grid"
    static let screenLoading = "screen-loading"
    static let screenFailure = "screen-failure"
    static let screenRow = "screen-row-"
    static let screenCursor = "screen-cursor"
    static let screenLine = "screen-line"
    static let screenKeyField = "screen-key-field"
    static let screenKeyBar = "screen-key-bar"
    static let screenKey = "screen-key-"
    static let screenCopy = "screen-copy"
    static let screenSelection = "screen-selection"
    static let screenCover = "screen-cover"
    /// End's glyph beside its press at the top right (Identifiers.swift's
    /// `sessionEndGlyph`): read by this prefix since Phase 337 moved End out
    /// of the bar it was read off (the fix round of 2026-10-06).
    static let sessionEndGlyph = "session-end-glyph-"
    /// iOS 26's one-time Slide to Type introduction, by the identifier UIKit
    /// gives its view, and its one press, by label. A fresh Simulator draws it
    /// over the keyboard and the key bar the first time a keyboard rises, and
    /// every key of the bar under it reads not hittable (the verify of
    /// 2026-10-06 read it in the app's own tree). Not a word Tortie says.
    static let keyboardIntroduction = "UIContinuousPathIntroductionView"
    static let keyboardIntroductionContinue = "Continue"
    /// Phase 337.1 (build/p3371/SPEC.md section 5.5.7): the Terminal's status
    /// line and its parts, a history row by its index from the oldest line the
    /// Mac holds, the button back to the live bottom, the line where paging
    /// back stopped, and the key bar's key that puts the keyboard away.
    static let terminalStatus = "terminal-status"
    static let sessionDot = "session-dot"
    static let sessionAgent = "session-agent"
    static let sessionMachine = "session-machine"
    static let screenHistory = "screen-history-"
    static let screenToLive = "screen-to-live"
    static let screenScrollbackLine = "screen-scrollback-line"
    static let keyHide = "hide"
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
    /// Phase 317: where the probe writes the files a step waits for, or nil.
    private let acks: String?
    /// The last `link:` step could not bring its link into view, so the
    /// presses that answer its alert print that and press nothing, and the
    /// drive goes on (the fix round: one unreached link cut a whole drive).
    private var linkUnreached = false
    /// iOS's Slide to Type introduction has been looked for once in this
    /// run, so a later keyboard looks for it only briefly.
    private var introductionLooked = false

    init(run: String, env: [String: String]) {
        lines = ProbeLines(run: run, file: env["P316_LINES"])
        payload = env["P316_PAYLOAD"] ?? ""
        endpoint = env["P330_DOOR_ENDPOINT"].flatMap { $0.isEmpty ? nil : $0 }
        steps = (env["P316_STEPS"] ?? "").split(separator: ",").map { String($0).trimmingCharacters(in: .whitespaces) }
        wait = TimeInterval(env["P316_WAIT_S"] ?? "") ?? 60
        pushToken = env["P316_PUSH_TOKEN"].flatMap { $0.isEmpty ? nil : $0 }
        allowNotifications = (env["P316_NOTIFICATIONS"] ?? "allow") != "deny"
        acks = env["P316_ACKS"].flatMap { $0.isEmpty ? nil : $0 }
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
            } else if step.hasPrefix("tab:") {
                tab(String(step.dropFirst("tab:".count)))
            } else if step == "bar" {
                bar()
            } else if step == "markdown" {
                markdown()
            } else if step.hasPrefix("link:") {
                link(String(step.dropFirst("link:".count)))
            } else if step == "link-cancel" {
                linkPress(Seen.cancelPress, step: "link-cancel")
            } else if step == "link-open" {
                linkOpen()
            } else if step == "settings" {
                settings()
            } else if step == "unpair-cancel" {
                unpair(press: Seen.cancelPress, step: "unpair-cancel")
            } else if step == "unpair" {
                unpair(press: Seen.unpairPress, step: "unpair")
            } else if step == "relaunch-keep" {
                relaunchKeep()
            } else if step.hasPrefix("idle:") {
                idle(seconds: TimeInterval(String(step.dropFirst("idle:".count))) ?? 20)
            } else if step == "end" {
                end(step: "end", after: .reread)
            } else if step == "end-cancel" {
                end(step: "end-cancel", after: .cancel)
            } else if step == "end-home" {
                end(step: "end-home", after: .home)
            } else if step.hasPrefix("end-kill:") {
                end(step: "end-kill", after: .kill(String(step.dropFirst("end-kill:".count))))
            } else if step == "end-read" {
                endRead()
            } else if step.hasPrefix("end-off:") {
                endOff(String(step.dropFirst("end-off:".count)))
            } else if step.hasPrefix("select:") {
                select(String(step.dropFirst("select:".count)).split(separator: "+").map(String.init))
            } else if step == "end-these" {
                endThese(homeAfter: nil)
            } else if step.hasPrefix("end-these-home:") {
                endThese(homeAfter: String(step.dropFirst("end-these-home:".count)))
            } else if step == "batch-done" {
                batchDone()
            } else if step.hasPrefix("reply-press:") {
                replyPress(Int(String(step.dropFirst("reply-press:".count))) ?? 0)
            } else if step.hasPrefix("reply-say:") {
                replySay(String(step.dropFirst("reply-say:".count)), step: "reply-say", fresh: true)
            } else if step.hasPrefix("reply-refused:") {
                replySay(String(step.dropFirst("reply-refused:".count)), step: "reply-refused", fresh: true)
            } else if step == "reply-again" {
                replySay(nil, step: "reply-again", fresh: false)
            } else if step.hasPrefix("reply-edit:") {
                replySay(String(step.dropFirst("reply-edit:".count)), step: "reply-edit", fresh: true)
            } else if step == "reply-none" {
                replyNone()
            } else if step.hasPrefix("reply-home:say:") {
                replyHome(say: String(step.dropFirst("reply-home:say:".count)), press: nil)
            } else if step.hasPrefix("reply-home:press:") {
                replyHome(say: nil, press: Int(String(step.dropFirst("reply-home:press:".count))) ?? 0)
            } else if step == "reply-focus" {
                replyFocus()
            } else if step.hasPrefix("reply-wait:") {
                replyWait(String(step.dropFirst("reply-wait:".count)))
            } else if step.hasPrefix("show:") {
                show(String(step.dropFirst("show:".count)))
            } else if step.hasPrefix("menu:") {
                let parts = step.dropFirst("menu:".count).split(separator: ":", maxSplits: 1, omittingEmptySubsequences: false).map(String.init)
                menu(section: parts.first ?? "", label: parts.count > 1 ? parts[1] : "")
            } else if step == "menu-read" {
                menuRead()
            } else if step == "clear-filters" {
                clearFilters()
            } else if step.hasPrefix("group:") {
                groupPress(String(step.dropFirst("group:".count)))
            } else if step.hasPrefix("sessions-mark:") {
                sessionsMark(String(step.dropFirst("sessions-mark:".count)))
            } else if step.hasPrefix("sessions-dump:") {
                sessionsDump(String(step.dropFirst("sessions-dump:".count)))
            } else if step == "sessions-face" {
                sessionsFace()
            } else if step == "sessions-pull" {
                sessionsPull()
            } else if step == "sessions-pull:ack" {
                sessionsPull(acked: true)
            } else if step == "sessions-first-row" {
                sessionsFirstRow()
            } else if step == "batch-pull" {
                batchPull()
            } else if step == "screen-open" {
                screenOpen()
            } else if step == "screen-zoom" {
                screenZoom()
            } else if step == "screen-rotate" {
                screenRotate()
            } else if step.hasPrefix("screen-type:") {
                screenType(String(step.dropFirst("screen-type:".count)))
            } else if step.hasPrefix("screen-key:") {
                screenKey(String(step.dropFirst("screen-key:".count)))
            } else if step.hasPrefix("screen-ctrl:") {
                screenCtrl(String(step.dropFirst("screen-ctrl:".count)))
            } else if step.hasPrefix("screen-question:") {
                screenQuestion(String(step.dropFirst("screen-question:".count)))
            } else if step.hasPrefix("screen-select:") {
                screenSelect(Int(String(step.dropFirst("screen-select:".count))) ?? 0)
            } else if step.hasPrefix("screen-home:") {
                screenHome(String(step.dropFirst("screen-home:".count)))
            } else if step.hasPrefix("screen-wait:") {
                screenWait(String(step.dropFirst("screen-wait:".count)))
            } else if step == "end-top" {
                endTop()
            } else if step.hasPrefix("terminal-open:") {
                terminalOpen(String(step.dropFirst("terminal-open:".count)))
            } else if step == "catch-up" {
                catchUp()
            } else if step.hasPrefix("scroll-up:") {
                scrollUp(Int(String(step.dropFirst("scroll-up:".count))) ?? 1)
            } else if step == "scroll-hold" {
                scrollHold(seconds: 10, step: "scroll-hold")
            } else if step == "scroll-drag-hold" {
                // The hold begins as the drag's finger lifts (the 337.1 fix
                // round): read 1.2 s after a drag, as `scroll-up` reads, the
                // page that drag asked had already landed and no hold saw it.
                dragUp()
                scrollHold(seconds: 6, step: "scroll-hold", every: 0.25)
            } else if step == "fling-up" {
                flingUp()
            } else if step == "to-live" {
                toLive()
            } else if step.hasPrefix("scroll-key:") {
                scrollKey(String(step.dropFirst("scroll-key:".count)))
            } else if step == "keyboard-glitch" {
                keyboardGlitch()
            } else if step.hasPrefix("tray-press:") {
                trayPress(Int(String(step.dropFirst("tray-press:".count))) ?? 0)
            } else if step == "tray-keyboard" {
                trayKeyboard()
            } else if step == "relaunch-choices" || step.hasPrefix("relaunch-choices:") {
                relaunchChoices(step.hasPrefix("relaunch-choices:") ? String(step.dropFirst("relaunch-choices:".count)) : nil)
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
        // Paired is a list, which only the first SIGNED read draws: since Phase
        // 316.6 the Needs input tab, where pairing lands (the Sessions tab's
        // list is accepted too); stopped is `Pair again`, which only a pairing
        // that ended draws.
        _ = poll { found in
            if !answered, self.springboard.alerts.firstMatch.exists { answered = self.notifications(within: 0, late: true) }
            return found.contains { Seen.paired($0.id) } || has(found, Seen.pairingAgain)
        }
        dump("pair-end")
        if !tree().contains(where: { Seen.paired($0.id) }) { stuck = true }
    }

    private func list() {
        // Since Phase 316.6 the list is the Sessions tab, and pairing lands on
        // Needs input: the Sessions tab is selected first.
        if !has(tree(), Seen.listScreen) { _ = selectTab(Seen.tabSessions) }
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
        // The row is on the Sessions tab, whose own path may still hold a
        // session from before (each tab keeps its place): back to its list.
        if !onSessionsList() {
            _ = selectTab(Seen.tabSessions)
            var tries = 0
            while !onSessionsList() && tries < 6 {
                let back = app.navigationBars.buttons.element(boundBy: 0)
                if back.exists { back.tap() }
                Thread.sleep(forTimeInterval: 1)
                tries += 1
            }
        }
        guard onSessionsList() else { return missing("open") }
        // Phase 316.7: the list is lazy, so the row is brought into view first.
        guard let row = reveal(Seen.row(sessionId)) else { return missing("open") }
        row.tap()
        // Phase 337.1: the session's route, whichever face its first answer
        // decided (the Terminal or Catch Me Up), and one line saying which.
        guard poll({ self.sessionSettled($0) }) else {
            return missing(name)
        }
        emitFace(name)
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
            if found.contains(where: { Seen.paired($0.id) }) && !onSessionPage(found) && !has(found, Seen.listLoading) && !has(found, Seen.needsLoading) {
                dump("back")
                return
            }
            let button = app.navigationBars.buttons.element(boundBy: 0)
            if button.exists { button.tap() }
            Thread.sleep(forTimeInterval: 1)
        }
        missing("back")
    }

    /// Catch Me Up (Phase 337.1): the Terminal's icon pressed when the
    /// Terminal is the face, nothing when Catch Me Up already is; dumped as
    /// `conversation`, the step's name since Phase 316.2.
    private func conversation() {
        guard poll({ self.sessionSettled($0) }), toCatchUp(for: "conversation") else {
            return missing("conversation")
        }
        dump("conversation")
    }

    /// Toward the oldest turn: swipe down until no older page remains to ask for
    /// and three swipes add nothing, or the screen says why it stopped.
    private func first() {
        guard toCatchUp(for: "first") else { return missing("first") }
        var asks: [String: String] = [:]
        var answers: [String: String] = [:]
        var absences: [String: String] = [:]
        var indexes = Set<Int>()
        var quiet = 0
        var lastCount = -1
        var mdSeen: [String: String] = [:]
        let scroll = element(Seen.catchUpScreen).scrollViews.firstMatch
        let deadline = Date().addingTimeInterval(wait)
        while Date() < deadline {
            let found = tree()
            for item in found where item.id.hasPrefix(Seen.md) && mdSeen[item.id] == nil {
                mdSeen[item.id] = item.label
            }
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
            if has(found, Seen.catchUpFailure) || has(found, Seen.catchUpOlderLine) { break }
            if !has(found, Seen.catchUpOlder) {
                quiet = indexes.count == lastCount ? quiet + 1 : 0
                if quiet >= 3 { break }
            }
            lastCount = indexes.count
            if scroll.exists { scroll.swipeDown() }
            Thread.sleep(forTimeInterval: 0.6)
        }
        let composed = MarkdownLabels.composeAll(mdSeen)
        // Since Phase 316.6 `turn-answer-<i>` is a container whose own label is
        // empty: each answer is composed from its `md-<i>-` labels in order.
        for (scope, text) in composed where !text.isEmpty {
            answers[scope] = text
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
            if let screen = [Seen.listScreen, Seen.needsScreen].first(where: { has(found, $0) }) {
                let failure = screen == Seen.listScreen ? Seen.listFailure : Seen.needsFailure
                let retry = element(Seen.retry(failure))
                if has(found, Seen.retry(failure)) && retry.exists {
                    retry.tap()
                } else {
                    pull(screen)
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
        // Phase 337.1: a live session's alert opens its Terminal; the reads
        // the alert taps make are Catch Me Up's, so its icon is pressed first
        // (`toCatchUpIfTerminal`, which leaves a list or Catch Me Up alone).
        toCatchUpIfTerminal(for: name)
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
        // Since Phase 316.6 the app opens on the Needs input tab.
        guard poll({ found in settledList(found) }) else { return missing("relaunch") }
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
        sessionSettled(found) || settledList(found)
    }

    /// Either list tab, read: since Phase 316.6 an alert's tap selects the
    /// Needs input tab, so the list it lands on is that tab's.
    private func settledList(_ found: [Found]) -> Bool {
        (has(found, Seen.needsScreen) && !has(found, Seen.needsLoading))
            || (has(found, Seen.listScreen) && !has(found, Seen.listLoading))
    }

    /// The Sessions tab's list is the screen on top.
    private func onSessionsList() -> Bool {
        let found = tree()
        return has(found, Seen.listScreen) && !onSessionPage(found)
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

    // MARK: The tabs, the answer, Settings and Unpair (Phase 316.6)

    /// A tab's button, by its label: the tab bar's own, or, where iOS 26's
    /// glass bar is not reported as a tab bar, the lowest button with that
    /// label (never a back button, which can carry the list's title too).
    private func tabButton(_ label: String) -> XCUIElement? {
        let inBar = app.tabBars.buttons[label]
        if inBar.waitForExistence(timeout: 3) { return inBar }
        let named = app.buttons.matching(NSPredicate(format: "label == %@", label)).allElementsBoundByIndex.filter { $0.exists }
        return named.max(by: { $0.frame.minY < $1.frame.minY })
    }

    /// Tap a tab by its label; answers whether there was one to tap.
    @discardableResult
    private func selectTab(_ label: String) -> Bool {
        guard let button = tabButton(label) else { return false }
        button.tap()
        return true
    }

    /// The Needs input button's badge, as XCUITest reports it: the button's
    /// label and its value, raw, the labels of every element inside it, and
    /// the system's version. The probe reads the number from the value, else
    /// from a label inside that is only a number; on iOS 26, whose tab bar
    /// gives XCUITest an empty value while UIKit draws the badge (the
    /// verifier's own read of the UITabBar, 2026-10-01), a badge it cannot
    /// read is UNREADABLE, never a pass and never a failure.
    private func badge() {
        let system = UIDevice.current.systemVersion
        guard let button = tabButton(Seen.tabNeedsInput) else {
            lines.emit(["step": "badge", "label": NSNull(), "value": NSNull(), "inside": [String](), "system": system, "found": false])
            return
        }
        let inside = button.descendants(matching: .any).allElementsBoundByIndex.map(\.label).filter { !$0.isEmpty }
        lines.emit(["step": "badge", "label": button.label, "value": (button.value as? String).map { $0 as Any } ?? NSNull(), "inside": inside, "system": system, "found": true])
    }

    /// `tab:<needs|sessions|settings>`: the bar's button tapped, its screen
    /// waited for, a dump named `tab-<name>`, and the badge read.
    private func tab(_ name: String) {
        let pick: (label: String, screen: String)?
        switch name {
        case "needs": pick = (Seen.tabNeedsInput, Seen.needsScreen)
        case "sessions": pick = (Seen.tabSessions, Seen.listScreen)
        case "settings": pick = (Seen.tabSettings, Seen.settingsScreen)
        default: pick = nil
        }
        guard let pick else { return missing("tab-" + name) }
        lines.emit(["step": "tab-before", "name": name])
        guard selectTab(pick.label) else { return missing("tab-" + name) }
        // Sessions keeps its place: a session pushed on it is on top again.
        guard poll({ found in
            has(found, pick.screen) || (name == "sessions" && onSessionPage(found))
        }) else { return missing("tab-" + name) }
        _ = poll { found in !has(found, Seen.needsLoading) && !has(found, Seen.listLoading) && !has(found, Seen.sessionLoading) }
        Thread.sleep(forTimeInterval: 1)
        dump("tab-" + name)
        badge()
    }

    /// The screen on top scrolled to its end, the tab bar's frame printed, and
    /// a dump named `bar`, so the probe can hold the screen's last element at
    /// or above the bar's top (T2d).
    private func bar() {
        let found = tree()
        guard let top = [Seen.catchUpScreen, Seen.sessionScreen, Seen.settingsScreen, Seen.listScreen, Seen.needsScreen].first(where: { has(found, $0) }) else {
            return missing("bar")
        }
        let screen = element(top)
        var last = ""
        for _ in 0..<12 {
            screen.swipeUp()
            Thread.sleep(forTimeInterval: 0.6)
            let now = tree().filter { !$0.id.isEmpty }.map { "\($0.id)@\(Int($0.frame.maxY))" }.joined(separator: ",")
            if now == last { break }
            last = now
        }
        var frame: CGRect?
        var via = "none"
        let bars = app.tabBars.firstMatch
        if bars.exists {
            frame = bars.frame
            via = "tabBar"
        } else {
            let buttons = [Seen.tabNeedsInput, Seen.tabSessions, Seen.tabSettings].compactMap(tabButton)
            if !buttons.isEmpty {
                frame = buttons.map(\.frame).reduce(buttons[0].frame) { $0.union($1) }
                via = "buttons"
            }
        }
        let f = frame ?? .zero
        lines.emit(["step": "bar", "screen": top, "via": via, "frame": frame == nil ? NSNull() : [f.origin.x, f.origin.y, f.size.width, f.size.height].map { Double($0) }])
        dump("bar")
    }

    /// On a conversation: from the newest turn toward the oldest, every `md-`
    /// element's identifier, label and first frame, and every link's label,
    /// the turn and block it sits in and its frame. One line, `markdown`.
    private func markdown() {
        guard toCatchUp(for: "markdown") else { return missing("markdown") }
        var elements: [String: [String: Any]] = [:]
        var links: [String: [String: Any]] = [:]
        var quiet = 0
        var lastCount = -1
        let scroll = element(Seen.catchUpScreen).scrollViews.firstMatch
        let deadline = Date().addingTimeInterval(wait)
        while Date() < deadline {
            walkAnswers { node, turn, block in
                let f = node.frame
                let frame = [f.origin.x, f.origin.y, f.size.width, f.size.height].map { $0.isFinite ? Double($0) : -1 }
                if node.identifier.hasPrefix(Seen.md), elements[node.identifier] == nil {
                    elements[node.identifier] = ["id": node.identifier, "label": node.label, "frame": frame]
                }
                if node.elementType == .link {
                    let key = (turn ?? "?") + "|" + node.label
                    if links[key] == nil {
                        links[key] = ["label": node.label, "turn": turn.map { $0 as Any } ?? NSNull(), "md": block.map { $0 as Any } ?? NSNull(), "frame": frame]
                    }
                }
            }
            let found = tree()
            if has(found, Seen.catchUpFailure) || has(found, Seen.catchUpOlderLine) { break }
            if !has(found, Seen.catchUpOlder) {
                quiet = elements.count == lastCount ? quiet + 1 : 0
                if quiet >= 3 { break }
            }
            lastCount = elements.count
            if scroll.exists { scroll.swipeDown() }
            Thread.sleep(forTimeInterval: 0.6)
        }
        lines.emit([
            "step": "markdown",
            "elements": elements.keys.sorted().compactMap { elements[$0] },
            "links": links.keys.sorted().compactMap { links[$0] }
        ])
        dump("markdown")
    }

    /// Every node of one snapshot, with the nearest `turn-<i>` and `md-` block
    /// identifiers above it (a link inside a Text has no identifier of its own).
    private func walkAnswers(_ visit: (XCUIElementSnapshot, String?, String?) -> Void) {
        guard let root = try? app.snapshot() else { return }
        var stack: [(XCUIElementSnapshot, String?, String?)] = [(root, nil, nil)]
        while let item = stack.popLast() {
            let (node, turnAbove, blockAbove) = item
            var turn = turnAbove
            var block = blockAbove
            if let i = index(node.identifier, after: Seen.turn) { turn = String(i) }
            if node.identifier.hasPrefix(Seen.md) { block = node.identifier }
            visit(node, turn, block)
            for child in node.children.reversed() { stack.append((child, turn, block)) }
        }
    }

    /// `link:<label>`: the link with those words brought into view and
    /// tapped, then the alert's title and presses printed. While XCUITest
    /// knows where the link is, each swipe goes TOWARD it (the fix round: the
    /// first build swiped blind, 60 one way then 60 the other, and on iOS 26.3
    /// never reached a link the markdown step had read 3,600 points up); while
    /// it does not, toward the top, then back. A link it cannot bring into view
    /// is said as that, `reached: false`, and the drive goes on.
    private func link(_ label: String) {
        guard toCatchUp(for: "link") else { return missing("link") }
        linkUnreached = false
        let target = app.links[label]
        let scroll = element(Seen.catchUpScreen).scrollViews.firstMatch
        var tries = 0
        var blind = 0
        while !(target.exists && target.isHittable) && tries < 160 && scroll.exists {
            let view = scroll.frame
            if target.exists && target.frame.height > 0 {
                if target.frame.midY < view.midY { scroll.swipeDown(velocity: .slow) } else { scroll.swipeUp(velocity: .slow) }
            } else {
                if blind < 60 { scroll.swipeDown() } else { scroll.swipeUp() }
                blind += 1
            }
            Thread.sleep(forTimeInterval: 0.5)
            tries += 1
        }
        guard target.exists && target.isHittable else {
            linkUnreached = true
            lines.emit(["step": "link", "label": label, "found": target.exists, "reached": false, "swipes": tries])
            dump("link-unreached")
            return
        }
        target.tap()
        let alert = app.alerts.firstMatch
        guard alert.waitForExistence(timeout: 10) else {
            lines.emit(["step": "link", "label": label, "found": true, "alert": NSNull(), "state": Int(app.state.rawValue)])
            return
        }
        let texts = alert.staticTexts.allElementsBoundByIndex.map(\.label)
        lines.emit(["step": "link", "label": label, "found": true, "alert": ["title": alert.label, "texts": texts, "buttons": alert.buttons.allElementsBoundByIndex.map(\.label)]])
    }

    /// A press in the link's alert, and whether Tortie is still in front.
    private func linkPress(_ press: String, step: String) {
        if linkUnreached {
            lines.emit(["step": step, "skipped": "the link before it could not be brought into view"])
            return
        }
        let alert = app.alerts.firstMatch
        guard alert.waitForExistence(timeout: 5), alert.buttons[press].exists else { return missing(step) }
        alert.buttons[press].tap()
        Thread.sleep(forTimeInterval: 1)
        lines.emit(["step": step, "state": Int(app.state.rawValue), "alertGone": !app.alerts.firstMatch.exists])
    }

    /// Open, then up to 10 seconds for Safari to come forward; its state
    /// printed, Safari ended, Tortie brought back.
    private func linkOpen() {
        if linkUnreached {
            lines.emit(["step": "link-open", "skipped": "the link before it could not be brought into view"])
            return
        }
        let alert = app.alerts.firstMatch
        guard alert.waitForExistence(timeout: 5), alert.buttons[Seen.openPress].exists else { return missing("link-open") }
        alert.buttons[Seen.openPress].tap()
        let safari = XCUIApplication(bundleIdentifier: Seen.safari)
        let forward = safari.wait(for: .runningForeground, timeout: 10)
        lines.emit(["step": "link-open", "safari": Int(safari.state.rawValue), "forward": forward, "tortie": Int(app.state.rawValue)])
        if safari.state != .notRunning { safari.terminate() }
        app.activate()
        _ = app.wait(for: .runningForeground, timeout: 30)
        _ = poll { has($0, Seen.catchUpScreen) }
        dump("link-open")
    }

    /// The Settings tab, read whole.
    private func settings() {
        guard selectTab(Seen.tabSettings), poll({ has($0, Seen.settingsScreen) }) else { return missing("settings") }
        // What iOS allows is read on appear: a moment for it to be drawn.
        Thread.sleep(forTimeInterval: 2)
        dump("settings")
    }

    /// Unpair's question: shown, read, and answered with `press`.
    private func unpair(press: String, step: String) {
        if !has(tree(), Seen.settingsScreen) { _ = selectTab(Seen.tabSettings) }
        let button = element(Seen.settingsUnpair)
        guard button.waitForExistence(timeout: 10) else { return missing(step) }
        var tries = 0
        while !button.isHittable && tries < 6 {
            element(Seen.settingsScreen).swipeUp()
            tries += 1
        }
        button.tap()
        // An action sheet on iOS 18; iOS 26 may draw the question another
        // way, so an alert is tried, then the presses themselves.
        var via = "sheet"
        var container: XCUIElement? = [app.sheets.firstMatch, app.alerts.firstMatch].first { $0.waitForExistence(timeout: 5) }
        if container?.elementType == .alert { via = "alert" }
        if container == nil, app.buttons[press].waitForExistence(timeout: 3) {
            container = app
            via = "app"
        }
        guard let sheet = container else { return missing(step) }
        let texts = via == "app" ? [] : sheet.staticTexts.allElementsBoundByIndex.map(\.label)
        let buttons = via == "app" ? [Seen.unpairPress, Seen.cancelPress].filter { app.buttons[$0].exists } : sheet.buttons.allElementsBoundByIndex.map(\.label)
        lines.emit(["step": "unpair-sheet", "for": step, "via": via, "title": via == "app" ? NSNull() : sheet.label as Any, "texts": texts, "buttons": buttons])
        guard sheet.buttons[press].exists else { return missing(step) }
        // Phase 317: when Unpair is pressed and when Pairing is drawn, by the
        // clock, so the probe reads how long Unpair took beside the parent's.
        if press == Seen.unpairPress { lines.emit(["step": "unpair-pressed", "for": step, "at": Date().timeIntervalSince1970 * 1000]) }
        sheet.buttons[press].tap()
        if press == Seen.unpairPress {
            guard poll({ has($0, Seen.pairingScreen) }) else { return missing(step) }
            lines.emit(["step": "unpair-landed", "for": step, "at": Date().timeIntervalSince1970 * 1000])
        } else {
            _ = poll { has($0, Seen.settingsScreen) && !$0.isEmpty }
            Thread.sleep(forTimeInterval: 1)
        }
        dump(step)
    }

    /// End the app and launch it again with the carried seams and NO forget
    /// seam and no code: what the Keychain kept decides the first screen.
    private func relaunchKeep() {
        app.terminate()
        _ = app.wait(for: .notRunning, timeout: 10)
        app.launchArguments = carried
        app.launch()
        guard poll({ found in has(found, Seen.pairingScreen) || settledList(found) }) else { return missing("relaunch-keep") }
        Thread.sleep(forTimeInterval: 2)
        dump("relaunch-keep")
    }

    /// Nothing pressed for `seconds`, bracketed by two lines, so the probe can
    /// count what the app sends while nobody touches it (U1's 20 s).
    private func idle(seconds: TimeInterval) {
        // Phase 337.1: a Terminal polls while it is up; the idle reading is
        // made where the session page's was, on Catch Me Up.
        toCatchUpIfTerminal(for: "idle")
        lines.emit(["step": "idle-start", "seconds": seconds])
        Thread.sleep(forTimeInterval: seconds)
        lines.emit(["step": "idle-end"])
    }

    // MARK: Phase 317: End and End these

    /// What an End step does once the owner check is up and the probe answered.
    private enum AfterAuth {
        /// The screen reads again; dumped as the step.
        case reread
        /// iOS's prompt cancelled after a failed match.
        case cancel
        /// Home at once, 10 s away, then back.
        case home
        /// The app ended at once, launched again and the session opened.
        case kill(String)
    }

    /// The probe's file `name` in P316_ACKS, waited for up to `seconds`.
    private func ack(_ name: String, within seconds: TimeInterval = 90) -> Bool {
        guard let acks else { return false }
        let path = (acks as NSString).appendingPathComponent(name)
        let deadline = Date().addingTimeInterval(seconds)
        while Date() < deadline {
            if FileManager.default.fileExists(atPath: path) { return true }
            Thread.sleep(forTimeInterval: 0.05)
        }
        return FileManager.default.fileExists(atPath: path)
    }

    private func frameOf(_ f: CGRect) -> [Double] {
        [f.origin.x, f.origin.y, f.size.width, f.size.height].map { $0.isFinite ? Double($0) : -1 }
    }

    /// The End bar as drawn: its frame and the tab bar's, the row's glyphs (an
    /// image's name, never a word), whether it can be pressed, its line, and
    /// what the owner check answered (`kind`).
    ///
    /// The glyph sits BESIDE the press since the fix round (the press is a
    /// plain button, so it reads off when it is off), so it is read off the
    /// bar. `kind` is read back from what the bar drew, which on an offered
    /// row is `kind()` exactly: the Face ID or Touch ID mark, the lock on a
    /// row that can be pressed (the passcode), or the lock on a row drawn off
    /// with the passcode line (no passcode at all).
    ///
    /// PHASE 337 MOVED END TO THE TOP RIGHT (the fix round of 2026-10-06):
    /// there is no bar to read the glyph off, so the glyph is read from ONE
    /// snapshot by its own identifier's prefix (`session-end-glyph-<name>`),
    /// and the navigation bar's frame is printed beside End's so the probe
    /// places End inside it. `bar` stays in the line, null on this build and
    /// a frame on a parent's.
    private func emitBar(_ step: String) {
        let bar = element(Seen.sessionEndBar)
        let row = element(Seen.sessionEnd)
        let tabBar = app.tabBars.firstMatch
        let nav = app.navigationBars.firstMatch
        let line = element(Seen.sessionEndLine)
        var seenGlyph = Set<String>()
        let glyphs: [[String: String]] = tree()
            .filter { $0.id.hasPrefix(Seen.sessionEndGlyph) && seenGlyph.insert($0.id).inserted }
            .map { ["id": $0.id, "label": $0.label] }
        let glyph = glyphs.first?["id"] ?? ""
        let enabled = row.exists ? row.isEnabled : false
        let kind: String
        if glyph.hasSuffix("-faceid") {
            kind = "faceID"
        } else if glyph.hasSuffix("-touchid") {
            kind = "touchID"
        } else if glyph.hasSuffix("-lock") {
            kind = enabled ? "passcode" : "none"
        } else {
            kind = "unread"
        }
        lines.emit([
            "step": "end-bar",
            "for": step,
            "bar": bar.exists ? frameOf(bar.frame) as Any : NSNull(),
            "nav": nav.exists ? frameOf(nav.frame) as Any : NSNull(),
            "row": row.exists ? frameOf(row.frame) as Any : NSNull(),
            "enabled": row.exists ? row.isEnabled as Any : NSNull(),
            "tabBar": tabBar.exists ? frameOf(tabBar.frame) as Any : NSNull(),
            "glyphs": glyphs,
            "glyph": glyph,
            "kind": kind,
            "line": line.exists ? line.label as Any : NSNull()
        ])
    }

    /// A confirmation, drawn as a sheet, an alert or loose buttons: read whole,
    /// then the press `pick` names pressed. Answers that press, or nil.
    private func confirmDialog(for step: String, pick: ([String]) -> String?) -> String? {
        var via = "sheet"
        var container: XCUIElement? = [app.sheets.firstMatch, app.alerts.firstMatch].first { $0.waitForExistence(timeout: 5) }
        if container?.elementType == .alert { via = "alert" }
        if container == nil {
            container = app
            via = "app"
        }
        guard let sheet = container else { return nil }
        let texts = via == "app" ? [] : sheet.staticTexts.allElementsBoundByIndex.map(\.label)
        let buttons = sheet.buttons.allElementsBoundByIndex.map(\.label)
        lines.emit(["step": "end-dialog", "for": step, "via": via, "title": via == "app" ? NSNull() : sheet.label as Any, "texts": texts, "buttons": via == "app" ? [] : buttons])
        guard let press = pick(buttons), sheet.buttons[press].exists else { return nil }
        sheet.buttons[press].tap()
        return press
    }

    /// iOS's first-use question about Face ID, accepted through SpringBoard.
    /// The question is found BY ITS OWN LABEL (it asks to allow Face ID), its
    /// allowing press read by label, and after the press THAT alert, found
    /// again by its label, is waited for up to 5 seconds to leave. The tests
    /// round: the step held `alerts.firstMatch`, a query that re-resolves, so
    /// on iOS 18.3 it found the Face ID prompt that follows Allow at once,
    /// read the question as still up, and the floor's End sent no match.
    /// Answers false when the question was still up after the press: the
    /// owner check behind it is not what the probe would answer, so the step
    /// stops there (the probe grades that UNREADABLE, never a failure).
    private func acceptFaceIDQuestion(for step: String) -> Bool {
        var found: (root: XCUIApplication, title: String)?
        let deadline = Date().addingTimeInterval(5)
        while found == nil && Date() < deadline {
            for root in [springboard, app] {
                let first = root.alerts.firstMatch
                if first.exists, Self.isFaceIDQuestion(first.label) {
                    found = (root, first.label)
                    break
                }
            }
            if found == nil { Thread.sleep(forTimeInterval: 0.1) }
        }
        guard let found else {
            lines.emit(["step": "faceid-permission", "for": step, "seen": false, "drew": promptLabels()])
            return true
        }
        // THE question, by its label, and never whatever alert comes next.
        let question = found.root.alerts.matching(NSPredicate(format: "label == %@", found.title)).firstMatch
        let buttons = question.buttons.allElementsBoundByIndex.map(\.label)
        let allow = Seen.faceIDAllow.first { question.buttons[$0].exists }
        lines.emit(["step": "faceid-permission", "for": step, "seen": true, "title": found.title, "buttons": buttons, "pressed": allow.map { $0 as Any } ?? NSNull()])
        guard let allow else {
            lines.emit(["step": "faceid-permission", "for": step, "stillUp": true])
            return false
        }
        // The question settled before the press: its press hittable, then a
        // moment for its presentation (the tests round's floor run pressed
        // Allow 0.2 s after the question was first seen, and it stayed up).
        let press = question.buttons[allow]
        let settle = Date().addingTimeInterval(2)
        while !press.isHittable && Date() < settle { Thread.sleep(forTimeInterval: 0.1) }
        Thread.sleep(forTimeInterval: 0.5)
        // Pressed, then THAT question waited on to leave; pressed again while
        // it stays, at most three presses, each one printed.
        var presses = 0
        var left = false
        while presses < 3 && !left {
            if question.exists && press.exists { press.tap() }
            presses += 1
            let until = Date().addingTimeInterval(5)
            while question.exists && Date() < until { Thread.sleep(forTimeInterval: 0.1) }
            left = !question.exists
            lines.emit(["step": "faceid-permission", "for": step, "press": presses, "left": left, "after": promptLabels(), "appState": Int(app.state.rawValue)])
        }
        if !left {
            lines.emit(["step": "faceid-permission", "for": step, "stillUp": true])
            return false
        }
        return true
    }

    /// iOS's first-use question asks to allow Face ID; the prompt that
    /// follows it does not ask to allow anything.
    static func isFaceIDQuestion(_ label: String) -> Bool {
        label.contains("Face ID") && label.range(of: "allow", options: .caseInsensitive) != nil
    }

    /// Every alert SpringBoard draws now, by label, with its buttons' labels:
    /// what iOS put up, read rather than assumed. SpringBoard ALONE: iOS's own
    /// questions and prompts are drawn there, and asking the app for its
    /// alerts needs the app's main thread, which on the iOS 18.3 floor was
    /// busy for 30 s while the owner check was up, and that query ended the
    /// whole drive (the tests round's floor run).
    private func promptLabels() -> [[String: Any]] {
        springboard.alerts.allElementsBoundByIndex.filter(\.exists).map { alert in
            ["in": "springboard", "label": alert.label, "buttons": alert.buttons.allElementsBoundByIndex.map(\.label)]
        }
    }

    /// End on the session on screen: the bar read, the Mac's confirmation read
    /// and pressed, iOS's first-use question accepted, then `end-auth-up`
    /// printed once the owner check is up, and the probe's answer waited for
    /// (`auth-<seq>`). What follows is `after`'s.
    private func end(step: String, after: AfterAuth) {
        guard poll({ has($0, Seen.sessionEnd) && !has($0, Seen.sessionLoading) }) else { return missing(step) }
        emitBar(step)
        element(Seen.sessionEnd).tap()
        guard confirmDialog(for: step, pick: { labels in labels.first { $0 != Seen.cancelPress && !$0.isEmpty } }) != nil else { return missing(step) }
        guard acceptFaceIDQuestion(for: step) else { return missing(step) }
        let confirming = element(Seen.endConfirming).waitForExistence(timeout: 10)
        let seq = lines.emit(["step": "end-auth-up", "for": step, "confirming": confirming])
        let answered = ack("auth-\(seq)")
        lines.emit(["step": "end-auth-answered", "for": step, "acked": answered])
        switch after {
        case .reread:
            // End's press gone (the session ended) or its line drawn: the
            // bar's own question before Phase 337 moved End to the top right,
            // asked of the press, because a bar that is never drawn made it
            // true at once and EH write-late read the screen before the
            // phone's 15 s (the fix round of 2026-10-06).
            _ = poll { found in
                !self.has(found, Seen.endConfirming) && self.onSessionPage(found)
                    && (!self.has(found, Seen.sessionEnd) || self.has(found, Seen.sessionEndLine))
            }
            Thread.sleep(forTimeInterval: 2)
            _ = poll { self.sessionSettled($0) }
            emitFace(step)
            dump(step)
        case .cancel:
            // What iOS drew after the failed match, read by its own labels
            // (the tests round: no Cancel was ever found, and no reading said
            // what was there instead).
            Thread.sleep(forTimeInterval: 1)
            lines.emit(["step": "faceid-after-nomatch", "for": step, "drew": promptLabels()])
            var pressed = false
            var gone = false
            var via = ""
            var seen: [String] = []
            var lineFirst = false
            let deadline = Date().addingTimeInterval(wait)
            while !pressed && Date() < deadline {
                // iOS may end its own prompt after the failed match: the End
                // line is drawn only once the owner check has answered.
                if has(tree(), Seen.sessionEndLine) {
                    lineFirst = true
                    break
                }
                for (name, root) in [("springboard", springboard), ("app", app)] {
                    // The press BY ITS LABEL, held as that query, never re-resolved onto another element.
                    let cancel = root.buttons.matching(NSPredicate(format: "label == %@", Seen.faceIDCancel)).firstMatch
                    guard cancel.exists, cancel.isHittable else { continue }
                    seen = root.alerts.firstMatch.exists ? root.alerts.firstMatch.buttons.allElementsBoundByIndex.map(\.label) : [Seen.faceIDCancel]
                    cancel.tap()
                    pressed = true
                    via = name
                    let until = Date().addingTimeInterval(5)
                    while cancel.exists && Date() < until { Thread.sleep(forTimeInterval: 0.1) }
                    gone = !cancel.exists
                    break
                }
                if !pressed { Thread.sleep(forTimeInterval: 0.25) }
            }
            lines.emit(["step": "faceid-cancel", "for": step, "found": pressed, "via": via, "gone": gone, "lineFirst": lineFirst, "buttons": seen])
            _ = poll { self.has($0, Seen.sessionEndLine) }
            dump(step)
        case .home:
            home()
            lines.emit(["step": "end-home-pressed", "state": Int(app.state.rawValue)])
            Thread.sleep(forTimeInterval: 10)
            app.activate()
            _ = app.wait(for: .runningForeground, timeout: 30)
            Thread.sleep(forTimeInterval: 3)
            _ = poll { self.sessionSettled($0) }
            emitFace(step)
            dump(step)
        case .kill(let id):
            app.terminate()
            _ = app.wait(for: .notRunning, timeout: 10)
            lines.emit(["step": "end-killed"])
            app.launchArguments = carried
            app.launch()
            guard poll({ found in self.settledList(found) }) else { return missing(step) }
            open(id, dumping: step)
        }
    }

    /// The End bar read on the session on screen, its row pressed if it can be,
    /// and whether a confirmation came: the hostile door's unreachable offer.
    private func endRead() {
        guard poll({ self.sessionSettled($0) }) else { return missing("end-read") }
        // Phase 337.1: read where the session page was read, on Catch Me Up.
        toCatchUpIfTerminal(for: "end-read")
        Thread.sleep(forTimeInterval: 1)
        emitBar("end-read")
        let row = element(Seen.sessionEnd)
        if row.exists && row.isHittable { row.tap() }
        let dialog = [app.sheets.firstMatch, app.alerts.firstMatch].contains { $0.waitForExistence(timeout: 2) }
        lines.emit(["step": "end-read-press", "dialog": dialog])
        dump("end-read")
    }

    /// E3: the probe unenrols Face ID (`unenrol-<seq>`), then the session is
    /// opened, so what the bar draws is what iOS answers now.
    private func endOff(_ sessionId: String) {
        let seq = lines.emit(["step": "ready-for-unenrol"])
        lines.emit(["step": "unenrolled", "acked": ack("unenrol-\(seq)")])
        open(sessionId, dumping: "end-off-open")
        guard onSessionPage(tree()) else { return }
        Thread.sleep(forTimeInterval: 1)
        emitBar("end-off")
        let row = element(Seen.sessionEnd)
        if row.exists && row.isEnabled && row.isHittable { row.tap() }
        let dialog = [app.sheets.firstMatch, app.alerts.firstMatch].contains { $0.waitForExistence(timeout: 2) }
        let prompt = springboard.alerts.firstMatch.waitForExistence(timeout: 2)
        lines.emit(["step": "end-off-press", "dialog": dialog, "prompt": prompt])
        if dialog, app.buttons[Seen.cancelPress].exists { app.buttons[Seen.cancelPress].tap() }
        dump("end-off")
    }

    /// Select on, and each of `ids` ticked, on the Sessions tab's list.
    private func select(_ ids: [String]) {
        if !onSessionsList() {
            _ = selectTab(Seen.tabSessions)
            var tries = 0
            while !onSessionsList() && tries < 6 {
                let back = app.navigationBars.buttons.element(boundBy: 0)
                if back.exists { back.tap() }
                Thread.sleep(forTimeInterval: 1)
                tries += 1
            }
        }
        // Phase 316.7: Select sits in the title, which scrolls with the lazy list.
        if !element(Seen.listSelect).exists { scrollToTop() }
        let press = element(Seen.listSelect)
        guard onSessionsList(), press.waitForExistence(timeout: 10) else { return missing("select") }
        press.tap()
        for id in ids {
            // Phase 316.7: the list is lazy, so each row is brought into view first.
            guard let row = reveal(Seen.row(id)) else { return missing("select") }
            row.tap()
            Thread.sleep(forTimeInterval: 0.3)
        }
        let ticked = ids.filter { element(Seen.rowSelect($0)).isSelected }
        // Phase 316.7: while End these takes taps, the Show control, the menu
        // and every project header are drawn off (SPEC section 6.4.5).
        lines.emit(["step": "select", "asked": ids, "ticked": ticked, "controls": controlsEnabled()])
        dump("select")
    }

    /// End these: the bar's press, the Mac sheet's confirmation read and
    /// pressed, iOS's first-use question accepted, `end-auth-up` and the
    /// probe's answer, then the run read to its end, or, with `homeAfter`,
    /// Home pressed at once when that row reads Ended.
    private func endThese(homeAfter first: String?) {
        let step = first == nil ? "end-these" : "end-these-home"
        let press = element(Seen.listEndSelected)
        guard press.waitForExistence(timeout: 10), press.isEnabled else { return missing(step) }
        press.tap()
        guard confirmDialog(for: step, pick: { labels in labels.first { $0.hasPrefix("End ") } }) != nil else { return missing(step) }
        guard acceptFaceIDQuestion(for: step) else { return missing(step) }
        // End these draws no mark of its own while iOS asks: the confirmation
        // is gone and no write has begun, so a moment for iOS's prompt.
        Thread.sleep(forTimeInterval: 1)
        let seq = lines.emit(["step": "end-auth-up", "for": step, "confirming": !has(tree(), Seen.batchHeading)])
        lines.emit(["step": "end-auth-answered", "for": step, "acked": ack("auth-\(seq)")])
        if let first {
            let deadline = Date().addingTimeInterval(wait)
            var label = ""
            while Date() < deadline {
                label = element(Seen.rowOutcome(first)).exists ? element(Seen.rowOutcome(first)).label : ""
                if label == "Ended" { break }
                Thread.sleep(forTimeInterval: 0.05)
            }
            home()
            lines.emit(["step": "end-these-home-pressed", "rowOne": label, "state": Int(app.state.rawValue)])
            Thread.sleep(forTimeInterval: 10)
            app.activate()
            _ = app.wait(for: .runningForeground, timeout: 30)
            Thread.sleep(forTimeInterval: 3)
        }
        _ = poll { self.has($0, Seen.batchDone) }
        let found = tree()
        var outcomes: [String: String] = [:]
        for item in found where item.id.hasPrefix("row-outcome-") {
            outcomes[String(item.id.dropFirst("row-outcome-".count))] = item.label
        }
        lines.emit(["step": "end-these", "for": step, "heading": find(found, Seen.batchHeading).map { $0.label as Any } ?? NSNull(), "outcomes": outcomes, "done": has(found, Seen.batchDone)])
        dump(step)
    }

    /// `Done` after End these, and the list read again.
    private func batchDone() {
        let done = element(Seen.batchDone)
        if done.waitForExistence(timeout: 10) { done.tap() }
        _ = poll { self.settledList($0) && !self.has($0, Seen.batchDone) }
        dump("batch-done")
    }

    // MARK: Phase 318: the reply

    /// A message's words, handed base64url (the step list is split on commas).
    private static func words(_ b64url: String) -> String? {
        var text = b64url.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while text.count % 4 != 0 { text += "=" }
        guard let data = Data(base64Encoded: text) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    /// The options as drawn: each press's place, label and whether it can be
    /// pressed, the note above them, the command line and the strip.
    private func replyReading() -> [String: Any] {
        let found = tree()
        var presses: [[String: Any]] = []
        for item in found {
            guard let n = index(item.id, after: Seen.sessionChoicePressPrefix) else { continue }
            presses.append(["n": n, "label": item.label, "enabled": element(item.id).isEnabled])
        }
        return [
            "presses": presses,
            "note": has(found, Seen.sessionChoicesNote),
            "strip": has(found, Seen.sessionMessageStrip),
            "command": find(found, Seen.sessionCommand).map { $0.label as Any } ?? NSNull(),
            "choices": found.filter { index($0.id, after: "session-choice-text-") != nil }.count
        ]
    }

    /// Prints `name` with `body` and waits for the probe's `reply-<seq>`.
    @discardableResult
    private func replyAck(_ name: String, _ body: [String: Any]) -> Bool {
        var object = body
        object["step"] = name
        let seq = lines.emit(object)
        let acked = ack("reply-\(seq)", within: 120)
        lines.emit(["step": name + "-acked", "acked": acked])
        return acked
    }

    /// Whether iOS is asking for Face ID, Touch ID or the passcode, or End's
    /// own confirming mark is drawn: a reply must never cause either.
    private func ownerCheckUp() -> Bool {
        if element(Seen.endConfirming).exists { return true }
        return springboard.alerts.allElementsBoundByIndex.contains { alert in
            let label = alert.label
            return label.contains("Face ID") || label.contains("Touch ID") || label.contains("Passcode")
        }
    }

    /// Press option `n`: the offer read, the probe told (it reads the agent's
    /// screen then), the press, and what the screen draws after it.
    private func replyPress(_ n: Int) {
        guard poll({ self.sessionSettled($0) }) else { return missing("reply-press") }
        Thread.sleep(forTimeInterval: 1)
        // Phase 337.1 (D19): the press is 318's `session-choice-press-<n>`
        // wherever it is drawn, which on a live session is the Terminal's tray.
        guard replyAck("reply-offer", ["for": "reply-press", "n": n, "reading": replyReading(), "face": faceOf(tree())]) else { return missing("reply-press") }
        let press = element(Seen.sessionChoicePress(n))
        guard press.exists, press.isHittable else { return missing("reply-press") }
        press.tap()
        var faceID = false
        var line: String?
        let deadline = Date().addingTimeInterval(wait)
        while Date() < deadline {
            if ownerCheckUp() { faceID = true }
            let found = tree()
            if let l = find(found, Seen.sessionReplyLine), !l.label.isEmpty { line = l.label }
            let pressesLeft = found.contains { index($0.id, after: Seen.sessionChoicePressPrefix) != nil }
            if line != nil || !pressesLeft { break }
            Thread.sleep(forTimeInterval: 0.1)
        }
        Thread.sleep(forTimeInterval: 2)
        _ = poll { self.sessionSettled($0) }
        lines.emit(["step": "reply-pressed", "faceId": faceID, "line": line.map { $0 as Any } ?? NSNull(), "after": replyReading(), "face": faceOf(tree())])
        dump("reply-press")
    }

    /// The box set to `text` (cleared first) when `text` is given.
    private func setBox(_ text: String) -> Bool {
        let field = element(Seen.sessionMessageField)
        guard field.waitForExistence(timeout: 10) else { return false }
        field.tap()
        let current = (field.value as? String) ?? ""
        if !current.isEmpty {
            field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: current.count + 2))
        }
        field.typeText(text)
        return true
    }

    /// The strip, the End bar, the tab bar and the content's lowest edge, read
    /// with the session screen scrolled to its end.
    private func stripFrames() -> [String: Any] {
        let screen = pageElement()
        for _ in 0..<3 where screen.exists { screen.swipeUp() }
        Thread.sleep(forTimeInterval: 1)
        let found = tree()
        let strip = find(found, Seen.sessionMessageStrip)
        let skip: Set<String> = [Seen.sessionScreen, Seen.catchUpScreen, Seen.sessionMessageStrip, Seen.sessionMessageField, Seen.sessionMessageSend, Seen.sessionMessageLine, Seen.sessionEndBar, Seen.sessionEnd, Seen.sessionEndLine]
        var bottom: CGFloat = 0
        if let strip {
            for item in found where !skip.contains(item.id) && item.frame.minY < strip.frame.minY && item.frame.height > 0 {
                bottom = max(bottom, item.frame.maxY)
            }
        }
        let endBar = find(found, Seen.sessionEndBar)
        let tabBar = app.tabBars.firstMatch
        return [
            "strip": strip.map { frameOf($0.frame) as Any } ?? NSNull(),
            "endBar": endBar.map { frameOf($0.frame) as Any } ?? NSNull(),
            "tabBar": tabBar.exists ? frameOf(tabBar.frame) as Any : NSNull(),
            "contentBottom": strip == nil ? NSNull() : Double(bottom) as Any
        ]
    }

    /// Every distinct line the strip draws from the press of Send until one is
    /// a write's answer, and the box's words at the last moment it was drawn.
    private func sampleSay() -> (lines: [String], field: String?) {
        var seen: [String] = []
        var field: String?
        let deadline = Date().addingTimeInterval(wait)
        while Date() < deadline {
            let box = element(Seen.sessionMessageField)
            if box.exists { field = (box.value as? String) ?? "" }
            let line = element(Seen.sessionMessageLine)
            if line.exists {
                let label = line.label
                if seen.last != label { seen.append(label) }
                if label != Seen.oneMessage && label != Seen.sending { break }
            } else if !seen.isEmpty {
                break
            }
            Thread.sleep(forTimeInterval: 0.1)
        }
        // The box and its line once the screen has read again after the answer.
        Thread.sleep(forTimeInterval: 2)
        let box = element(Seen.sessionMessageField)
        if box.exists { field = (box.value as? String) ?? "" }
        return (seen, field)
    }

    /// One message: the strip read (the first Send of a step that sets the
    /// box), the words typed, the probe told, Send, and every line after it.
    private func replySay(_ b64url: String?, step: String, fresh: Bool) {
        guard poll({ self.sessionSettled($0) }), toCatchUp(for: step) else { return missing(step) }
        let frames = step == "reply-say" ? stripFrames() : [:]
        if fresh {
            guard let b64url, let text = Self.words(b64url), setBox(text) else { return missing(step) }
        }
        guard replyAck("reply-send-ready", ["for": step, "frames": frames, "reading": replyReading()]) else { return missing(step) }
        let send = element(Seen.sessionMessageSend)
        guard send.waitForExistence(timeout: 10), send.isEnabled else { return missing(step) }
        send.tap()
        let said = sampleSay()
        lines.emit(["step": "reply-said", "for": step, "lines": said.lines, "fieldAfter": said.field.map { $0 as Any } ?? NSNull(), "faceId": ownerCheckUp(), "after": replyReading()])
        dump(step)
    }

    /// Nothing offered here: the options and the strip as drawn.
    private func replyNone() {
        guard poll({ self.sessionSettled($0) }), toCatchUp(for: "reply-none") else { return missing("reply-none") }
        Thread.sleep(forTimeInterval: 2)
        lines.emit(["step": "reply-none", "reading": replyReading()])
        dump("reply-none")
    }

    /// Send or press, then Home at once (Paseo #3464); 10 s away, back, and
    /// the screen read.
    private func replyHome(say b64url: String?, press n: Int?) {
        guard poll({ self.sessionSettled($0) }) else { return missing("reply-home") }
        // Phase 337.1: a message is sent from Catch Me Up's box; a press from wherever it is drawn.
        if b64url != nil, !toCatchUp(for: "reply-home") { return missing("reply-home") }
        if let b64url {
            guard let text = Self.words(b64url), setBox(text) else { return missing("reply-home") }
            guard replyAck("reply-send-ready", ["for": "reply-home", "reading": replyReading()]) else { return missing("reply-home") }
            let send = element(Seen.sessionMessageSend)
            guard send.exists, send.isEnabled else { return missing("reply-home") }
            send.tap()
        } else if let n {
            guard replyAck("reply-offer", ["for": "reply-home", "n": n, "reading": replyReading()]) else { return missing("reply-home") }
            let press = element(Seen.sessionChoicePress(n))
            guard press.exists, press.isHittable else { return missing("reply-home") }
            press.tap()
        }
        home()
        lines.emit(["step": "reply-home-pressed", "state": Int(app.state.rawValue)])
        Thread.sleep(forTimeInterval: 10)
        app.activate()
        _ = app.wait(for: .runningForeground, timeout: 30)
        Thread.sleep(forTimeInterval: 3)
        _ = poll { self.sessionSettled($0) }
        let found = tree()
        let line = find(found, Seen.sessionMessageLine)?.label ?? find(found, Seen.sessionReplyLine)?.label
        let box = element(Seen.sessionMessageField)
        lines.emit([
            "step": "reply-home-read",
            "line": line.map { $0 as Any } ?? NSNull(),
            "fieldAfter": box.exists ? ((box.value as? String) ?? "") as Any : NSNull(),
            "after": replyReading()
        ])
        dump("reply-home")
    }

    /// The box focused: whether End is drawn beside the keyboard, and where
    /// the strip and the keyboard are.
    private func replyFocus() {
        guard toCatchUp(for: "reply-focus") else { return missing("reply-focus") }
        let field = element(Seen.sessionMessageField)
        guard field.waitForExistence(timeout: 10) else { return missing("reply-focus") }
        field.tap()
        let keyboard = app.keyboards.firstMatch
        _ = keyboard.waitForExistence(timeout: 5)
        Thread.sleep(forTimeInterval: 1)
        let found = tree()
        lines.emit([
            "step": "reply-focus",
            "endBar": has(found, Seen.sessionEndBar),
            "strip": find(found, Seen.sessionMessageStrip).map { frameOf($0.frame) as Any } ?? NSNull(),
            "keyboard": keyboard.exists ? frameOf(keyboard.frame) as Any : NSNull()
        ])
        dump("reply-focus")
        // The keyboard away again: a press on the screen's title.
        let bar = app.navigationBars.firstMatch
        if bar.exists { bar.tap() }
        Thread.sleep(forTimeInterval: 1)
    }

    /// The probe sets the Mac up (`tag` names what), then the screen reads
    /// again, as a person pulls it.
    private func replyWait(_ tag: String) {
        guard replyAck("reply-wait", ["tag": tag]) else { return missing("reply-wait") }
        // Phase 337.1: the page on top is pulled, Catch Me Up's when it is up.
        pull(has(tree(), Seen.catchUpScreen) ? Seen.catchUpScreen : Seen.sessionScreen)
        Thread.sleep(forTimeInterval: 2)
        _ = poll { self.sessionSettled($0) }
        dump("reply-wait")
    }

    // MARK: Phase 316.7: the Sessions tab

    /// The Sessions tab's list, its own path's root: selected, and walked
    /// back past any session pushed on it.
    private func goToSessionsList() {
        if onSessionsList() { return }
        _ = selectTab(Seen.tabSessions)
        var tries = 0
        while !onSessionsList() && tries < 6 {
            let back = app.navigationBars.buttons.element(boundBy: 0)
            if back.exists { back.tap() }
            Thread.sleep(forTimeInterval: 1)
            tries += 1
        }
    }

    /// What one snapshot of the list holds, as one string: the identifiers and
    /// labels of its rows, headers and lines. Equal twice means it has settled.
    private func signature() -> String {
        tree().filter { f in Seen.sessionsPrefixes.contains { f.id.hasPrefix($0) } }.map { "\($0.id)=\($0.label)" }.joined(separator: "|")
    }

    /// A choice's read lands with no mark of its own (the old drawing is kept
    /// until the newest answer lands), so the list is read again until two
    /// readings three quarters of a second apart agree.
    private func settleSessions() {
        Thread.sleep(forTimeInterval: 1.5)
        var last = "\u{0}"
        let deadline = Date().addingTimeInterval(min(wait, 20))
        while Date() < deadline {
            let now = signature()
            if now == last { return }
            last = now
            Thread.sleep(forTimeInterval: 0.75)
        }
    }

    /// The element a list scrolls by: the screen itself when it is the scroll
    /// view, else the first scroll view inside it.
    private func scrollTarget() -> XCUIElement {
        let list = element(Seen.listScreen)
        guard list.exists else { return app.scrollViews.firstMatch }
        if list.elementType == .scrollView { return list }
        let inner = list.scrollViews.firstMatch
        return inner.exists ? inner : list
    }

    /// Up to the list's top: swiped down until the title is drawn and
    /// pressable, then until two readings agree, so the list is at its very
    /// top as before. The bound is the step's wait (at least two minutes),
    /// never a count of swipes: the walk over 2,000 rows takes about 175 to
    /// reach the end, and the 60 swipes this once allowed left the
    /// sessions-cap arm at the list's end with no menu to read (the fix round,
    /// 2026-10-03). A stop short of the title, by the clock or by a swipe
    /// that moved nothing, is said as `{"step":"scroll-to-top","reached":false}`
    /// rather than left for a later step to fail on silently.
    private func scrollToTop() {
        let scroll = scrollTarget()
        let title = element(Seen.listTitle)
        var last = "\u{0}"
        var settling = 0
        let deadline = Date().addingTimeInterval(max(wait, 120))
        while Date() < deadline {
            if title.exists && title.isHittable {
                // The title is drawn: at most a few more swipes, until nothing moves.
                settling += 1
                if settling > 3 { return }
            }
            scroll.swipeDown(velocity: .fast)
            Thread.sleep(forTimeInterval: 0.3)
            let now = signature()
            if now == last { break }
            last = now
        }
        if title.exists && title.isHittable { return }
        lines.emit(["step": "scroll-to-top", "reached": false])
    }

    /// The top of the tab bar, or the window's bottom when there is none.
    private func barTop() -> CGFloat {
        let bars = app.tabBars.firstMatch
        return bars.exists ? bars.frame.minY : app.frame.maxY
    }

    /// The element `id`, brought into view on the list: the tab is lazy, so
    /// a row off screen is not in the tree. Up to the top, then down a swipe
    /// at a time until it is there, above the tab bar and pressable.
    private func reveal(_ id: String) -> XCUIElement? {
        let target = element(id)
        let shown = { target.exists && target.isHittable && target.frame.midY < self.barTop() - 4 }
        if target.waitForExistence(timeout: 2) && shown() { return target }
        // The Sessions tab while End these takes taps is still the list, and a
        // snapshot that came back empty is no answer about it: both are
        // scrolled as the list is (the 337.1 fix round: a row under End
        // these' bar was handed back unrevealed and its tap found no point).
        let found = tree()
        guard has(found, Seen.listScreen) || has(found, Seen.listEndSelected) || found.isEmpty else { return target.exists ? target : nil }
        scrollToTop()
        let scroll = scrollTarget()
        var last = "\u{0}"
        let deadline = Date().addingTimeInterval(wait)
        while Date() < deadline {
            if shown() { return target }
            if target.exists && target.frame.midY >= barTop() - 4 {
                scroll.swipeUp(velocity: .slow)
            } else {
                scroll.swipeUp()
            }
            Thread.sleep(forTimeInterval: 0.4)
            let now = signature()
            if now == last && !target.exists { break }
            last = now
        }
        return shown() ? target : nil
    }

    /// Whether the Show control, the menu and the project headers on screen
    /// take presses, by identifier.
    private func controlsEnabled() -> [String: Bool] {
        var out: [String: Bool] = [:]
        guard let root = try? app.snapshot() else { return out }
        var stack: [XCUIElementSnapshot] = [root]
        while let node = stack.popLast() {
            let id = node.identifier
            if id == Seen.listMenu || id.hasPrefix(Seen.listShow + "-") || (id.hasPrefix("group-") && !Self.isGroupPart(id)) {
                out[id] = node.isEnabled
            }
            stack.append(contentsOf: node.children.reversed())
        }
        return out
    }

    /// A header's part (`group-label-<id>` and its kin), never the header.
    static func isGroupPart(_ id: String) -> Bool {
        ["group-label-", "group-count-", "group-machine-", "group-folder-", "group-waiting-", "group-left-out-"].contains { id.hasPrefix($0) }
    }

    /// `show:<word>`: the Show control's segment pressed, and the read it starts settled.
    private func show(_ word: String) {
        goToSessionsList()
        // The control scrolls with the list, which is lazy: up to the top when it is not drawn.
        if !element(Seen.showSegment(word)).exists { scrollToTop() }
        let segment = element(Seen.showSegment(word))
        guard segment.waitForExistence(timeout: 10) else { return missing("show") }
        let enabled = segment.isEnabled
        segment.tap()
        lines.emit(["step": "show", "word": word, "found": true, "enabled": enabled])
        settleSessions()
    }

    /// An item of the open menu by its words: a menu's own buttons first,
    /// then any button so named that is not a row or a header. A section
    /// drawn as a submenu reads its title and its current choice together, so
    /// a title is matched by its start.
    private func menuItem(_ label: String, prefix: Bool = false) -> XCUIElement? {
        let predicate = prefix ? NSPredicate(format: "label BEGINSWITH %@", label) : NSPredicate(format: "label == %@", label)
        let inMenu = app.collectionViews.buttons.matching(predicate).firstMatch
        if inMenu.waitForExistence(timeout: 2) { return inMenu }
        let named = app.buttons.matching(predicate).allElementsBoundByIndex.filter {
            $0.exists && !$0.identifier.hasPrefix("row-") && !$0.identifier.hasPrefix("group-") && !$0.identifier.hasPrefix("list-show")
        }
        return named.first
    }

    /// Every button the open menu draws, by its words.
    private func menuLabels() -> [String] {
        let inMenu = app.collectionViews.buttons.allElementsBoundByIndex.filter(\.exists).map(\.label)
        return inMenu.isEmpty ? app.buttons.allElementsBoundByIndex.filter(\.exists).map(\.label) : inMenu
    }

    /// An open menu put away: a press on the title's row, which no menu covers.
    private func dismissMenu() {
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.06, dy: 0.12)).tap()
        Thread.sleep(forTimeInterval: 0.6)
    }

    /// `menu:<section>:<label>`: the menu opened, the section's submenu opened
    /// when it is one, and the choice pressed; the read it starts settled.
    private func menu(section: String, label: String) {
        goToSessionsList()
        if !element(Seen.listMenu).exists { scrollToTop() }
        let button = element(Seen.listMenu)
        guard button.waitForExistence(timeout: 10) else { return missing("menu") }
        button.tap()
        Thread.sleep(forTimeInterval: 0.8)
        var path: [String] = []
        if !section.isEmpty, menuItem(label) == nil, let sub = menuItem(section, prefix: true) {
            sub.tap()
            path.append(section)
            Thread.sleep(forTimeInterval: 0.8)
        }
        guard let item = menuItem(label) else {
            lines.emit(["step": "menu", "section": section, "label": label, "found": false, "seen": menuLabels()])
            dismissMenu()
            return
        }
        item.tap()
        path.append(label)
        lines.emit(["step": "menu", "section": section, "label": label, "found": true, "path": path])
        settleSessions()
    }

    /// `menu-read`: the menu opened, every button it draws printed, and put away.
    private func menuRead() {
        goToSessionsList()
        if !element(Seen.listMenu).exists { scrollToTop() }
        let button = element(Seen.listMenu)
        guard button.waitForExistence(timeout: 10) else { return missing("menu-read") }
        button.tap()
        Thread.sleep(forTimeInterval: 1)
        lines.emit(["step": "menu-read", "labels": menuLabels(), "button": button.label])
        dismissMenu()
    }

    /// Clear filters: the "No matching sessions" face's button when it is
    /// drawn, else the menu's item; the read it starts settled.
    private func clearFilters() {
        goToSessionsList()
        scrollToTop()
        let face = element(Seen.listClearFilters)
        var via = "none"
        if face.waitForExistence(timeout: 2) && face.isHittable {
            face.tap()
            via = "face"
        } else {
            let button = element(Seen.listMenu)
            if button.waitForExistence(timeout: 10) {
                button.tap()
                Thread.sleep(forTimeInterval: 0.8)
                if let item = menuItem(Seen.clearFiltersWords) {
                    item.tap()
                    via = "menu"
                } else {
                    dismissMenu()
                }
            }
        }
        lines.emit(["step": "clear-filters", "via": via])
        settleSessions()
    }

    /// `group:<id>`: that project's header brought into view and pressed.
    private func groupPress(_ id: String) {
        goToSessionsList()
        guard let header = reveal(Seen.group(id)) else {
            lines.emit(["step": "group", "id": id, "found": false])
            return missing("group")
        }
        let enabled = header.isEnabled
        header.tap()
        lines.emit(["step": "group", "id": id, "found": true, "enabled": enabled])
        settleSessions()
    }

    /// `sessions-mark:<tag>`: the probe reads the door before the drive's own
    /// read, and the step goes on once its file `sessions-<seq>` is there.
    private func sessionsMark(_ tag: String) {
        let seq = lines.emit(["step": "sessions-before", "tag": tag])
        lines.emit(["step": "sessions-marked", "tag": tag, "acked": acks == nil ? false : ack("sessions-\(seq)", within: 60)])
    }

    /// `sessions-dump:<tag>`: the list settled, then walked from its top to its
    /// end, every row, header and line it met printed once, in the order it met
    /// them (a lazy list draws only what is on screen). `complete` is false when
    /// the step's wait ran out before the end.
    private func sessionsDump(_ tag: String) {
        goToSessionsList()
        guard poll({ self.has($0, Seen.listScreen) && !self.has($0, Seen.listLoading) }) else { return missing("sessions-dump") }
        settleSessions()
        scrollToTop()
        var order: [String] = []
        var index: [String: Int] = [:]
        var items: [String: [String: Any]] = [:]
        var quiet = 0
        var swipes = 0
        var complete = false
        let scroll = scrollTarget()
        let deadline = Date().addingTimeInterval(wait)
        let rebuild = { index = Dictionary(uniqueKeysWithValues: order.enumerated().map { ($1, $0) }) }
        while Date() < deadline {
            guard let root = try? app.snapshot() else { break }
            var found: [XCUIElementSnapshot] = []
            var stack: [XCUIElementSnapshot] = [root]
            while let node = stack.popLast() {
                if Seen.sessionsPrefixes.contains(where: { node.identifier.hasPrefix($0) }) { found.append(node) }
                stack.append(contentsOf: node.children.reversed())
            }
            found.sort { $0.frame.minY < $1.frame.minY }
            var anchor: Int?
            var added = 0
            for (k, node) in found.enumerated() {
                let id = node.identifier
                if let at = index[id] {
                    anchor = at
                    continue
                }
                // Before the first element of this snapshot already known, when
                // none came before it here; else after the last one that did.
                let before = anchor ?? found[(k + 1)...].compactMap { index[$0.identifier] }.first.map { $0 - 1 }
                if let before, before + 1 < order.count {
                    order.insert(id, at: before + 1)
                    rebuild()
                } else {
                    order.append(id)
                    index[id] = order.count - 1
                }
                anchor = index[id]
                added += 1
                let f = node.frame
                var item: [String: Any] = [
                    "id": id,
                    "label": node.label,
                    "frame": [f.origin.x, f.origin.y, f.size.width, f.size.height].map { $0.isFinite ? Double($0) : -1 }
                ]
                if id.hasPrefix(Seen.listShow) || (id.hasPrefix("group-") && !Self.isGroupPart(id)) || id == Seen.listMenu {
                    item["selected"] = node.isSelected
                    item["enabled"] = node.isEnabled
                    if let value = node.value as? String { item["value"] = value }
                }
                items[id] = item
            }
            quiet = added == 0 ? quiet + 1 : 0
            if quiet >= 2 {
                complete = true
                break
            }
            scroll.swipeUp()
            swipes += 1
            Thread.sleep(forTimeInterval: 0.35)
        }
        lines.emit([
            "step": "sessions-dump",
            "tag": tag,
            "complete": complete,
            "swipes": swipes,
            "window": [Double(app.frame.width), Double(app.frame.height)],
            "elements": order.compactMap { items[$0] }
        ])
    }

    /// `sessions-face`: the Sessions tab selected and its face read as drawn,
    /// with no pull: the older-Mac face or the new one (SPEC D9).
    private func sessionsFace() {
        goToSessionsList()
        guard poll({ self.has($0, Seen.listScreen) && !self.has($0, Seen.listLoading) }) else { return missing("sessions-face") }
        settleSessions()
        dump("sessions-face")
    }

    /// `sessions-pull`: one pull on the Sessions tab, and its face read again.
    /// `sessions-pull:ack` first says `sessions-pull-ready` and waits for the
    /// probe's file `pull-<seq>`: the hostile door refuses `/v1/sessions` until
    /// the probe tells it the Mac updated, so the older face is still the
    /// older face when this ONE pull is made (the fix round, 2026-10-03: a door
    /// that refused only its first read was answered by the older face's own
    /// appear read, and the arm could never be read).
    private func sessionsPull(acked: Bool = false) {
        goToSessionsList()
        // A pull refreshes only from the top of the list.
        scrollToTop()
        if acked {
            let seq = lines.emit(["step": "sessions-pull-ready"])
            lines.emit(["step": "sessions-pull-acked", "acked": ack("pull-\(seq)", within: 60)])
        }
        pull(Seen.listScreen)
        Thread.sleep(forTimeInterval: 3)
        _ = poll { self.has($0, Seen.listScreen) && !self.has($0, Seen.listLoading) }
        settleSessions()
        dump("sessions-pull")
    }

    /// `sessions-first-row`: the moment the Sessions tab is pressed, and the
    /// moment its first row is in the tree, by the clock (the probe holds them
    /// to the door's answer: within 2 s, SPEC section 9.5).
    private func sessionsFirstRow() {
        lines.emit(["step": "first-row-start", "at": Date().timeIntervalSince1970 * 1000])
        _ = selectTab(Seen.tabSessions)
        let deadline = Date().addingTimeInterval(wait)
        while Date() < deadline {
            if let row = tree().first(where: { $0.id.hasPrefix("row-") && Self.isRow($0.id) }) {
                lines.emit(["step": "first-row", "at": Date().timeIntervalSince1970 * 1000, "id": row.id])
                return
            }
            Thread.sleep(forTimeInterval: 0.1)
        }
        lines.emit(["step": "first-row", "at": NSNull(), "id": NSNull()])
    }

    /// A row's own identifier, never one of its parts.
    static func isRow(_ id: String) -> Bool {
        !["row-dot-", "row-name-", "row-machine-", "row-age-", "row-line-", "row-select-", "row-outcome-"].contains { id.hasPrefix($0) }
    }

    /// `batch-pull`: a pull while End these is done and before Done, and every
    /// row and outcome word read after it (SPEC section 15 F5).
    private func batchPull() {
        // A pull refreshes only from the top of the list.
        scrollToTop()
        pull(Seen.listScreen)
        Thread.sleep(forTimeInterval: 3)
        let found = tree()
        var outcomes: [String: String] = [:]
        for item in found where item.id.hasPrefix("row-outcome-") {
            outcomes[String(item.id.dropFirst("row-outcome-".count))] = item.label
        }
        let rows = found.filter { $0.id.hasPrefix("row-") && Self.isRow($0.id) }.map { String($0.id.dropFirst("row-".count)) }
        lines.emit(["step": "batch-pull", "outcomes": outcomes, "rows": rows, "done": has(found, Seen.batchDone)])
        dump("batch-pull")
    }

    /// `relaunch-choices[:<key>=<value>]`: the app ended and launched again
    /// with the carried seams and NO forget seam, so the pairing and the three
    /// remembered words stay, and with `-<key> <value>` when one is planted
    /// (UserDefaults' own argument domain). Then the Sessions tab, read.
    private func relaunchChoices(_ planted: String?) {
        app.terminate()
        _ = app.wait(for: .notRunning, timeout: 10)
        var arguments = carried
        if let planted, let eq = planted.firstIndex(of: "=") {
            arguments += ["-" + String(planted[..<eq]), String(planted[planted.index(after: eq)...])]
        }
        app.launchArguments = arguments
        app.launch()
        guard poll({ found in self.settledList(found) || self.has(found, Seen.pairingScreen) }) else { return missing("relaunch-choices") }
        goToSessionsList()
        _ = poll { self.has($0, Seen.listScreen) && !self.has($0, Seen.listLoading) }
        settleSessions()
        lines.emit(["step": "relaunched", "planted": planted.map { $0 as Any } ?? NSNull()])
    }

    // MARK: Reading

    // MARK: Phase 337: the Screen

    /// The grid's rows as drawn: each `screen-row-<n>`'s label and frame, the
    /// cursor's frame, the grid's, the line under it, the key bar's keys, and
    /// whether Copy and the selection are up, from ONE snapshot.
    private func screenReading() -> [String: Any] {
        let found = tree()
        var rows: [[String: Any]] = []
        for f in found {
            guard let n = index(f.id, after: Seen.screenRow) else { continue }
            rows.append(["n": n, "label": f.label, "frame": frameOf(f.frame)])
        }
        rows.sort { ($0["n"] as? Int ?? 0) < ($1["n"] as? Int ?? 0) }
        let keys = found.filter { $0.id.hasPrefix(Seen.screenKey) && $0.id != Seen.screenKeyBar && $0.id != Seen.screenKeyField }.map { ["id": $0.id, "label": $0.label, "frame": frameOf($0.frame)] as [String: Any] }
        let window = (try? app.snapshot())?.frame.size ?? .zero
        return [
            "rows": rows,
            "grid": find(found, Seen.screenGrid).map { frameOf($0.frame) as Any } ?? NSNull(),
            "cursor": find(found, Seen.screenCursor).map { frameOf($0.frame) as Any } ?? NSNull(),
            "line": find(found, Seen.screenLine).map { $0.label as Any } ?? NSNull(),
            "failure": find(found, Seen.screenFailure).map { $0.label as Any } ?? NSNull(),
            "keys": keys,
            "copy": has(found, Seen.screenCopy),
            "selection": has(found, Seen.screenSelection),
            "cover": has(found, Seen.screenCover),
            "window": [Double(window.width), Double(window.height)],
            "orientation": XCUIDevice.shared.orientation.rawValue,
            "endTop": has(found, Seen.sessionEnd),
            "endBar": has(found, Seen.sessionEndBar)
        ]
    }

    private func emitScreen(_ step: String, _ extra: [String: Any] = [:]) {
        var o = screenReading()
        o["step"] = step
        for (k, v) in extra { o[k] = v }
        lines.emit(o)
    }

    /// The Terminal's first picture drawn. Since Phase 337.1 a live session
    /// OPENS on its Terminal, so this is a wait for the grid; a page that still
    /// draws the parent's Screen row has it pressed first.
    private func screenOpen() {
        let button = element(Seen.sessionOpenScreen)
        if button.waitForExistence(timeout: 1) {
            var tries = 0
            while !button.isHittable && tries < 6 {
                element(Seen.sessionScreen).swipeUp()
                tries += 1
            }
            button.tap()
        }
        guard poll({ found in
            self.has(found, Seen.screenScreen) && !self.has(found, Seen.screenLoading)
                && (found.contains { self.index($0.id, after: Seen.screenRow) != nil } || self.has(found, Seen.screenFailure))
        }) else { return missing("screen-open") }
        emitScreen("screen-open")
    }

    /// Pinch out, then drag: the first row's frame before and after each.
    ///
    /// The fix round of 2026-10-06 adds the two drags the verify's bisect
    /// used, because a swipe alone is the gesture least likely to be held: a
    /// SLOW drag to the right (pressed 0.1 s, well under the selection's
    /// 450 ms, then moved at 300 pt a second) and a swipe up.
    private func screenZoom() {
        let grid = element(Seen.screenGrid)
        guard grid.waitForExistence(timeout: 10) else { return missing("screen-zoom") }
        let before = screenReading()
        grid.pinch(withScale: 2.5, velocity: 2)
        Thread.sleep(forTimeInterval: 1)
        let pinched = screenReading()
        grid.swipeLeft()
        Thread.sleep(forTimeInterval: 1)
        let dragged = screenReading()
        let from = grid.coordinate(withNormalizedOffset: CGVector(dx: 0.3, dy: 0.5))
        let to = grid.coordinate(withNormalizedOffset: CGVector(dx: 0.8, dy: 0.5))
        from.press(forDuration: 0.1, thenDragTo: to, withVelocity: XCUIGestureVelocity(300), thenHoldForDuration: 0)
        Thread.sleep(forTimeInterval: 1)
        let slow = screenReading()
        grid.swipeUp()
        Thread.sleep(forTimeInterval: 1)
        let up = screenReading()
        lines.emit([
            "step": "screen-zoom",
            "before": before["rows"] as Any,
            "pinched": pinched["rows"] as Any,
            "dragged": dragged["rows"] as Any,
            "slow": slow["rows"] as Any,
            "up": up["rows"] as Any,
            "selectionAfterDrags": up["selection"] as Any,
            "grid": dragged["grid"] as Any
        ])
    }

    /// Sideways and back: the fitted row width in each, and the session's
    /// page read upright again after Back.
    private func screenRotate() {
        guard element(Seen.screenGrid).waitForExistence(timeout: 10) else { return missing("screen-rotate") }
        let portrait = screenReading()
        XCUIDevice.shared.orientation = .landscapeLeft
        Thread.sleep(forTimeInterval: 2)
        let landscape = screenReading()
        let back = app.navigationBars.buttons.element(boundBy: 0)
        if back.exists { back.tap() }
        // Since Phase 337.1 Back from the Terminal is the list: any page with no Terminal on it.
        _ = poll { !self.has($0, Seen.screenScreen) && !$0.isEmpty }
        Thread.sleep(forTimeInterval: 1)
        let page = (try? app.snapshot())?.frame.size ?? .zero
        lines.emit([
            "step": "screen-rotate",
            "portrait": portrait,
            "landscape": landscape,
            "pageWindow": [Double(page.width), Double(page.height)],
            "pageOrientation": XCUIDevice.shared.orientation.rawValue
        ])
        XCUIDevice.shared.orientation = .portrait
        Thread.sleep(forTimeInterval: 1)
    }

    /// Tap the grid (the keyboard comes up), type the words, press the key
    /// bar's return. Before typing it prints `screen-type-ready` and waits for
    /// the probe's file, so the probe reads the pane at that moment.
    private func screenType(_ b64url: String) {
        guard let text = Self.words(b64url) else { return missing("screen-type") }
        let grid = element(Seen.screenGrid)
        guard grid.waitForExistence(timeout: 10) else { return missing("screen-type") }
        grid.tap()
        let up = app.keyboards.firstMatch.waitForExistence(timeout: 5)
        passKeyboardIntroduction()
        let seq = lines.emit(["step": "screen-type-ready", "keyboard": up])
        _ = ack("screen-\(seq)")
        app.typeText(text)
        let ret = element(Seen.screenKey + "return")
        if ret.waitForExistence(timeout: 5) { ret.tap() }
        Thread.sleep(forTimeInterval: 1.5)
        emitScreen("screen-type", ["typed": text.count, "auth": ownerCheckUp()])
    }

    /// iOS's one-time Slide to Type introduction, passed by its own Continue
    /// once a keyboard is up (the fix round of 2026-10-06). On a fresh iOS 26
    /// Simulator it covers the keyboard and the key bar the first time any
    /// keyboard rises, so the bar's first press lands on it: PS4's return and
    /// keys-404's esc never reached the app. It shows once per device, so it
    /// is looked for 2 s the first time in a run and 0.3 s after; the line
    /// says whether it was seen and whether it left.
    private func passKeyboardIntroduction() {
        let intro = app.otherElements[Seen.keyboardIntroduction]
        let seen = intro.waitForExistence(timeout: introductionLooked ? 0.3 : 2)
        introductionLooked = true
        guard seen else { return }
        let go = intro.buttons[Seen.keyboardIntroductionContinue]
        if go.exists { go.tap() }
        var gone = false
        let deadline = Date().addingTimeInterval(5)
        while Date() < deadline {
            if !intro.exists {
                gone = true
                break
            }
            Thread.sleep(forTimeInterval: 0.2)
        }
        lines.emit(["step": "keyboard-introduction", "pressed": go.exists || gone, "gone": gone])
    }

    /// The key bar is the hidden field's inputAccessoryView, so it is on the
    /// screen only while the keyboard is up. A Screen just opened has neither:
    /// one tap on the grid raises them (Paseo's release table, `.focus`). Asked
    /// before every key, so a step works whether the step before it left the
    /// keyboard up or not.
    private func raiseKeys(_ name: String) -> XCUIElement {
        let key = element(Seen.screenKey + name)
        if key.exists {
            if app.otherElements[Seen.keyboardIntroduction].exists { passKeyboardIntroduction() }
            return key
        }
        let grid = element(Seen.screenGrid)
        if grid.waitForExistence(timeout: 10) {
            grid.tap()
            _ = app.keyboards.firstMatch.waitForExistence(timeout: 5)
            passKeyboardIntroduction()
        }
        return key
    }

    /// One key of the bar pressed by its short name (`esc`, `tab`, `btab`,
    /// `left`, `up`, `down`, `right`, `return`).
    private func screenKey(_ name: String) {
        let key = raiseKeys(name)
        guard key.waitForExistence(timeout: 10) else { return missing("screen-key") }
        let seq = lines.emit(["step": "screen-key-ready", "key": name])
        _ = ack("screen-\(seq)")
        key.tap()
        Thread.sleep(forTimeInterval: 1)
        emitScreen("screen-key", ["key": name, "auth": ownerCheckUp()])
    }

    /// ctrl on the key bar, then one letter on the keyboard: Control-letter.
    private func screenCtrl(_ letter: String) {
        let ctrl = raiseKeys("ctrl")
        guard ctrl.waitForExistence(timeout: 10) else { return missing("screen-ctrl") }
        let seq = lines.emit(["step": "screen-ctrl-ready", "letter": letter])
        _ = ack("screen-\(seq)")
        ctrl.tap()
        app.typeText(letter)
        Thread.sleep(forTimeInterval: 1)
        emitScreen("screen-ctrl", ["letter": letter, "auth": ownerCheckUp()])
    }

    /// Inside a question: the key pressed twice, `gapMs` apart, then the line
    /// under the grid read at once, and again once the next picture is drawn,
    /// and the key pressed a third time after it (PS5).
    private func screenQuestion(_ arg: String) {
        let parts = arg.split(separator: ":").map(String.init)
        let name = parts.first ?? "down"
        let gap = (Double(parts.count > 1 ? parts[1] : "") ?? 50) / 1000
        let key = raiseKeys(name)
        guard key.waitForExistence(timeout: 10) else { return missing("screen-question") }
        let seq = lines.emit(["step": "screen-question-ready", "key": name])
        _ = ack("screen-\(seq)")
        // Two presses as close together as XCUITest can make them. Two
        // `tap()` calls each wait for the app to go idle first, which can put
        // them further apart than the Mac's settle (300 ms, D4), and then the
        // second press would rightly go against the next picture; one
        // `doubleTap()` is one synthesized pair of touches. A gap asked for
        // past 200 ms is two taps with that sleep between.
        if gap <= 0.2 {
            key.doubleTap()
        } else {
            key.tap()
            Thread.sleep(forTimeInterval: gap)
            key.tap()
        }
        let waiting = screenReading()
        lines.emit(["step": "screen-question-pressed", "line": waiting["line"] as Any])
        let drawn = poll { found in self.find(found, Seen.screenLine)?.label != (waiting["line"] as? String) || !self.has(found, Seen.screenLine) }
        // The next picture is drawn: say so and wait for the probe's file
        // before the third press, so the probe counts the keys that reached
        // the agent BEFORE this picture by its own clock, never racing the
        // third press's bytes.
        let redrawn = lines.emit(["step": "screen-question-redrawn", "drawn": drawn])
        _ = ack("screen-\(redrawn)")
        let after = screenReading()
        key.tap()
        Thread.sleep(forTimeInterval: 1)
        emitScreen("screen-question", ["waitingLine": waiting["line"] as Any, "redrawn": drawn, "afterLine": after["line"] as Any])
    }

    /// Long press on row `n` and drag across it; while the selection is held
    /// the probe changes the Mac's screen (it waits for this step's file);
    /// then Copy, and the probe reads the device's pasteboard (another file);
    /// then a tap clears the selection and the grid reads again (PS6).
    private func screenSelect(_ n: Int) {
        let row = element(Seen.screenRow + String(n))
        guard row.waitForExistence(timeout: 10) else { return missing("screen-select") }
        let start = row.coordinate(withNormalizedOffset: CGVector(dx: 0.02, dy: 0.5))
        let end = row.coordinate(withNormalizedOffset: CGVector(dx: 0.6, dy: 0.5))
        start.press(forDuration: 1.0, thenDragTo: end)
        let copy = element(Seen.screenCopy).waitForExistence(timeout: 5)
        let held = screenReading()
        let seq = lines.emit(["step": "screen-select-held", "copy": copy, "line": held["line"] as Any, "rows": held["rows"] as Any])
        _ = ack("screen-\(seq)")
        Thread.sleep(forTimeInterval: 1.5)
        let whileHeld = screenReading()
        if element(Seen.screenCopy).exists { element(Seen.screenCopy).tap() }
        let copied = lines.emit(["step": "screen-copied", "rowsWhileHeld": whileHeld["rows"] as Any, "lineWhileHeld": whileHeld["line"] as Any])
        _ = ack("screen-\(copied)")
        element(Seen.screenGrid).tap()
        Thread.sleep(forTimeInterval: 1.5)
        emitScreen("screen-select")
    }

    /// Type, then Home at once (the probe holds the keys line before its
    /// handshake, waiting on `screen-home-ready`), away 20 s, back, and the
    /// Screen read again (PS7).
    private func screenHome(_ b64url: String) {
        guard let text = Self.words(b64url) else { return missing("screen-home") }
        let grid = element(Seen.screenGrid)
        guard grid.waitForExistence(timeout: 10) else { return missing("screen-home") }
        grid.tap()
        _ = app.keyboards.firstMatch.waitForExistence(timeout: 5)
        passKeyboardIntroduction()
        // The keys line the keys before this step used is kept while it has
        // been idle under DoorLine.freshFor (4 s) and is closed by the phone
        // once it has (D25). Past that, the next write opens a NEW connection,
        // which is the one the probe's relay holds before its handshake; a
        // write on a line still kept would go out on a connection the relay
        // already forwarded, and the arm would read nothing about a held line.
        Thread.sleep(forTimeInterval: 5)
        let seq = lines.emit(["step": "screen-home-ready"])
        _ = ack("screen-\(seq)")
        app.typeText(text)
        home()
        lines.emit(["step": "screen-home-pressed", "state": Int(app.state.rawValue)])
        Thread.sleep(forTimeInterval: 20)
        let away = lines.emit(["step": "screen-home-away"])
        _ = ack("screen-\(away)")
        app.activate()
        _ = app.wait(for: .runningForeground, timeout: 30)
        _ = poll { found in found.contains { self.index($0.id, after: Seen.screenRow) != nil } }
        emitScreen("screen-home")
    }

    /// Wait for the probe's file `screen-wait-<tag>` with the Screen up, then read it.
    private func screenWait(_ tag: String) {
        let seq = lines.emit(["step": "screen-wait", "tag": tag])
        _ = ack("screen-\(seq)")
        Thread.sleep(forTimeInterval: 1)
        emitScreen("screen-wait", ["tag": tag])
    }

    /// The session's page: End's frame and the navigation bar's, the End bar
    /// absent, and (Phase 337.1, PS1 re-pointed) the Catch Me Up icon beside
    /// End on the Terminal, its frame and whether each can be pressed; the
    /// parent's Screen row is printed when drawn.
    private func endTop() {
        guard poll({ self.sessionSettled($0) && self.has($0, Seen.sessionEnd) }) else { return missing("end-top") }
        let found = tree()
        let nav = app.navigationBars.firstMatch
        let window = (try? app.snapshot())?.frame.size ?? .zero
        let icon = element(Seen.sessionOpenCatchUp)
        lines.emit([
            "step": "end-top",
            "face": faceOf(found),
            "end": find(found, Seen.sessionEnd).map { ["label": $0.label, "frame": frameOf($0.frame), "hittable": element(Seen.sessionEnd).isHittable] as Any } ?? NSNull(),
            "catchUp": find(found, Seen.sessionOpenCatchUp).map { ["label": $0.label, "frame": frameOf($0.frame), "hittable": icon.isHittable] as Any } ?? NSNull(),
            "nav": nav.exists ? frameOf(nav.frame) as Any : NSNull(),
            "endBar": has(found, Seen.sessionEndBar),
            "screen": find(found, Seen.sessionOpenScreen).map { frameOf($0.frame) as Any } ?? NSNull(),
            "window": [Double(window.width), Double(window.height)]
        ])
    }

    // MARK: Phase 337.1: terminal first, scrollback, Catch Me Up

    /// A session's page is up: its route, whichever face it draws, or Catch
    /// Me Up pushed over the Terminal (which carries `screen-catch-up` alone).
    private func onSessionPage(_ found: [Found]) -> Bool {
        has(found, Seen.sessionScreen) || has(found, Seen.catchUpScreen)
    }

    /// ...and read: neither the route's first read nor Catch Me Up's is loading.
    private func sessionSettled(_ found: [Found]) -> Bool {
        onSessionPage(found) && !has(found, Seen.sessionLoading) && !has(found, Seen.catchUpLoading)
    }

    /// The face on top: `terminal`, `catch-up`, or `none`.
    private func faceOf(_ found: [Found]) -> String {
        if has(found, Seen.screenScreen) { return "terminal" }
        if has(found, Seen.catchUpScreen) { return "catch-up" }
        return "none"
    }

    /// The page to swipe and pull: Catch Me Up when it is up, else the route.
    private func pageElement() -> XCUIElement {
        element(has(tree(), Seen.catchUpScreen) ? Seen.catchUpScreen : Seen.sessionScreen)
    }

    /// The navigation bar's words (its static texts), in order: the title,
    /// and Catch Me Up's second line under it.
    private func navTexts() -> [String] {
        let nav = app.navigationBars.firstMatch
        guard nav.exists else { return [] }
        return nav.staticTexts.allElementsBoundByIndex.filter(\.exists).map(\.label).filter { !$0.isEmpty }
    }

    /// One line saying which face a step read (`face`), and the title's words.
    private func emitFace(_ step: String) {
        lines.emit(["step": "face", "for": step, "was": faceOf(tree()), "now": faceOf(tree()), "title": navTexts()])
    }

    /// THE ONE HELPER (build/p3371/SPEC.md section 7.8, section Attack B6):
    /// when the Terminal is the face, its Catch Me Up icon pressed and Catch
    /// Me Up waited for; when Catch Me Up already is, nothing. One line says
    /// which face the step found and which it read. False when Catch Me Up
    /// could not be reached.
    @discardableResult
    private func toCatchUp(for step: String) -> Bool {
        let was = faceOf(tree())
        if was == "catch-up" {
            lines.emit(["step": "face", "for": step, "was": was, "now": was, "title": navTexts()])
            return true
        }
        let icon = element(Seen.sessionOpenCatchUp)
        guard icon.waitForExistence(timeout: 10) else {
            lines.emit(["step": "face", "for": step, "was": was, "now": NSNull(), "title": navTexts()])
            return false
        }
        icon.tap()
        let ok = poll { self.has($0, Seen.catchUpScreen) && !self.has($0, Seen.catchUpLoading) }
        lines.emit(["step": "face", "for": step, "was": was, "now": ok ? "catch-up" : NSNull(), "title": navTexts()])
        return ok
    }

    /// `toCatchUp`, only when a Terminal is the page on top: a list, Pairing
    /// or Catch Me Up are left as they are.
    private func toCatchUpIfTerminal(for step: String) {
        if faceOf(tree()) == "terminal" { _ = toCatchUp(for: step) }
    }

    /// Every label the app draws, identified or not, from ONE snapshot.
    private func allLabels() -> [String] {
        guard let root = try? app.snapshot() else { return [] }
        var out: [String] = []
        var stack: [XCUIElementSnapshot] = [root]
        while let node = stack.popLast() {
            if !node.label.isEmpty { out.append(node.label) }
            stack.append(contentsOf: node.children.reversed())
        }
        return out
    }

    /// The Terminal as drawn, from ONE snapshot: every live row and every
    /// history row with its label and frame, the grid, the button back to
    /// live, the scrollback line, the line under the grid, the keyboard and
    /// the face, stamped by the clock.
    private func terminalReading() -> [String: Any] {
        let found = tree()
        var live: [[String: Any]] = []
        var history: [[String: Any]] = []
        for f in found {
            if let n = index(f.id, after: Seen.screenRow) {
                live.append(["n": n, "label": f.label, "frame": frameOf(f.frame)])
            } else if let i = index(f.id, after: Seen.screenHistory) {
                history.append(["i": i, "label": f.label, "frame": frameOf(f.frame)])
            }
        }
        live.sort { ($0["n"] as? Int ?? 0) < ($1["n"] as? Int ?? 0) }
        history.sort { ($0["i"] as? Int ?? 0) < ($1["i"] as? Int ?? 0) }
        let keyboard = app.keyboards.firstMatch
        return [
            "at": Date().timeIntervalSince1970 * 1000,
            "face": faceOf(found),
            "live": live,
            "history": history,
            "grid": find(found, Seen.screenGrid).map { frameOf($0.frame) as Any } ?? NSNull(),
            "toLive": find(found, Seen.screenToLive).map { frameOf($0.frame) as Any } ?? NSNull(),
            "scrollbackLine": find(found, Seen.screenScrollbackLine).map { ["label": $0.label, "frame": frameOf($0.frame)] as Any } ?? NSNull(),
            "line": find(found, Seen.screenLine).map { ["label": $0.label, "frame": frameOf($0.frame)] as Any } ?? NSNull(),
            "keyboard": keyboard.exists ? frameOf(keyboard.frame) as Any : NSNull(),
            "copy": has(found, Seen.screenCopy)
        ]
    }

    /// `terminal-open:<id>` (PS10): a list row tapped and the Terminal waited
    /// for, the tap-to-first-row time printed (it holds the one session read
    /// that decides the face); the status line's parts, the top bar's trailing
    /// items (the icon, then End), every label the app draws, and whether the
    /// icon is row-shaped.
    private func terminalOpen(_ sessionId: String) {
        if !onSessionsList() { goToSessionsList() }
        guard onSessionsList(), let row = reveal(Seen.row(sessionId)) else { return missing("terminal-open") }
        let tapped = Date()
        row.tap()
        var firstRowMs: Double?
        let deadline = Date().addingTimeInterval(wait)
        while Date() < deadline {
            let found = tree()
            if found.contains(where: { index($0.id, after: Seen.screenRow) != nil }) {
                firstRowMs = Date().timeIntervalSince(tapped) * 1000
                break
            }
            if has(found, Seen.catchUpScreen) || has(found, Seen.sessionFailureId) { break }
            Thread.sleep(forTimeInterval: 0.05)
        }
        let found = tree()
        let window = (try? app.snapshot())?.frame.size ?? .zero
        let part = { (id: String) -> Any in self.find(found, id).map { ["label": $0.label, "frame": self.frameOf($0.frame)] as Any } ?? NSNull() }
        let icon = element(Seen.sessionOpenCatchUp)
        let end = element(Seen.sessionEnd)
        let nav = app.navigationBars.firstMatch
        lines.emit([
            "step": "terminal-open",
            "id": sessionId,
            "firstRowMs": firstRowMs.map { $0 as Any } ?? NSNull(),
            "face": faceOf(found),
            "status": part(Seen.terminalStatus),
            "dot": part(Seen.sessionDot),
            "statusWord": part(Seen.sessionStatus),
            "agent": part(Seen.sessionAgent),
            "machine": part(Seen.sessionMachine),
            "catchUp": find(found, Seen.sessionOpenCatchUp).map { ["label": $0.label, "frame": frameOf($0.frame), "hittable": icon.isHittable] as Any } ?? NSNull(),
            "end": find(found, Seen.sessionEnd).map { ["label": $0.label, "frame": frameOf($0.frame), "hittable": end.isHittable] as Any } ?? NSNull(),
            "nav": nav.exists ? frameOf(nav.frame) as Any : NSNull(),
            "title": navTexts(),
            "labels": allLabels(),
            "window": [Double(window.width), Double(window.height)],
            "reading": terminalReading()
        ])
        dump("terminal")
    }

    /// `catch-up` (PS15): the icon pressed; Catch Me Up's turns, its now card,
    /// its message box, End and the title read; Back; the Terminal read.
    private func catchUp() {
        guard poll({ self.sessionSettled($0) }), toCatchUp(for: "catch-up") else { return missing("catch-up") }
        Thread.sleep(forTimeInterval: 1.5)
        let found = tree()
        var turns: [[String: Any]] = []
        for f in found {
            guard let i = index(f.id, after: Seen.turn) else { continue }
            turns.append(["i": i, "frame": frameOf(f.frame)])
        }
        let part = { (id: String) -> Any in self.find(found, id).map { ["label": $0.label, "frame": self.frameOf($0.frame)] as Any } ?? NSNull() }
        let nav = app.navigationBars.firstMatch
        let reading: [String: Any] = [
            "turns": turns,
            "status": part(Seen.sessionStatus),
            "dot": part(Seen.sessionDot),
            "strip": part(Seen.sessionMessageStrip),
            "end": part(Seen.sessionEnd),
            "nav": nav.exists ? frameOf(nav.frame) as Any : NSNull(),
            "title": navTexts(),
            "grid": has(found, Seen.screenGrid),
            "labels": allLabels()
        ]
        dump("catch-up")
        let back = app.navigationBars.buttons.element(boundBy: 0)
        if back.exists { back.tap() }
        let returned = poll { found in self.has(found, Seen.screenScreen) }
        lines.emit(["step": "catch-up", "reading": reading, "backToTerminal": returned, "after": terminalReading()])
    }

    /// One drag of the finger DOWN the grid, which scrolls the terminal up
    /// into what it printed before: pressed briefly, moved at a person's
    /// speed, lifted.
    private func dragUp() {
        let grid = element(Seen.screenGrid)
        guard grid.exists else { return }
        let from = grid.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.3))
        let to = grid.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.75))
        from.press(forDuration: 0.05, thenDragTo: to, withVelocity: XCUIGestureVelocity(600), thenHoldForDuration: 0.3)
    }

    /// `scroll-up:<n>` (PS13): n drags up, a reading after each (the finger
    /// lifted, 1.2 s for a page to land).
    private func scrollUp(_ n: Int) {
        guard element(Seen.screenGrid).waitForExistence(timeout: 10) else { return missing("scroll-up") }
        let before = terminalReading()
        var readings: [[String: Any]] = []
        for _ in 0..<max(1, n) {
            dragUp()
            Thread.sleep(forTimeInterval: 1.2)
            readings.append(terminalReading())
        }
        lines.emit(["step": "scroll-up", "n": n, "before": before, "readings": readings])
    }

    /// `scroll-hold` (PS13): the finger lifted, a reading every half second (or
    /// `every`) for `seconds`, so pages landing are seen one by one.
    private func scrollHold(seconds: TimeInterval, step: String, every: TimeInterval = 0.5) {
        var readings: [[String: Any]] = []
        let deadline = Date().addingTimeInterval(seconds)
        while Date() < deadline {
            readings.append(terminalReading())
            Thread.sleep(forTimeInterval: every)
        }
        lines.emit(["step": step, "readings": readings])
    }

    /// `fling-up` (PS13): one fast swipe down the grid, then four seconds of readings.
    private func flingUp() {
        let grid = element(Seen.screenGrid)
        guard grid.waitForExistence(timeout: 10) else { return missing("fling-up") }
        let before = terminalReading()
        grid.swipeDown(velocity: .fast)
        lines.emit(["step": "fling-up", "before": before])
        scrollHold(seconds: 4, step: "fling-hold")
    }

    /// `to-live` (PS13): the button back to the live bottom pressed, then read.
    private func toLive() {
        let button = element(Seen.screenToLive)
        let found = button.waitForExistence(timeout: 5)
        let before = terminalReading()
        if found { button.tap() }
        Thread.sleep(forTimeInterval: 1.2)
        lines.emit(["step": "to-live", "found": found, "before": before, "after": terminalReading()])
    }

    /// `scroll-key:<name>` (PS13): scrolled back with one drag, then one key
    /// of the bar pressed (its ready line waits for the probe's file), and the
    /// Terminal read: typing returns it to the live bottom (D27).
    private func scrollKey(_ name: String) {
        guard element(Seen.screenGrid).waitForExistence(timeout: 10) else { return missing("scroll-key") }
        let key = raiseKeys(name)
        guard key.waitForExistence(timeout: 10) else { return missing("scroll-key") }
        dragUp()
        Thread.sleep(forTimeInterval: 1.2)
        let scrolled = terminalReading()
        let seq = lines.emit(["step": "scroll-key-ready", "key": name])
        _ = ack("screen-\(seq)")
        if key.exists { key.tap() }
        Thread.sleep(forTimeInterval: 1.2)
        lines.emit(["step": "scroll-key", "key": name, "scrolled": scrolled, "after": terminalReading(), "auth": ownerCheckUp()])
        let hide = element(Seen.screenKey + Seen.keyHide)
        if hide.exists { hide.tap() }
        Thread.sleep(forTimeInterval: 0.6)
    }

    /// `keyboard-glitch` (PS14, section 14 M12): row 0 and the grid read at
    /// rest, with the keyboard up (and the line under the grid against the
    /// keyboard's top), right after the bar's hide key, and 2 s later; then a
    /// long press and drag along row 3 with Copy, the icon and End read for
    /// whether each can be pressed while it is held, Copy pressed (the probe
    /// reads the pasteboard on its file), and row 0 read after. Then, with the
    /// keyboard up again and the terminal scrolled back, the button back to
    /// live against the keyboard's top, and the hide key.
    private func keyboardGlitch() {
        let grid = element(Seen.screenGrid)
        guard grid.waitForExistence(timeout: 10) else { return missing("keyboard-glitch") }
        let rest = terminalReading()
        grid.tap()
        _ = app.keyboards.firstMatch.waitForExistence(timeout: 5)
        passKeyboardIntroduction()
        Thread.sleep(forTimeInterval: 1)
        let up = terminalReading()
        let hide = element(Seen.screenKey + Seen.keyHide)
        let hid = hide.waitForExistence(timeout: 5)
        if hid { hide.tap() }
        Thread.sleep(forTimeInterval: 0.6)
        let after = terminalReading()
        Thread.sleep(forTimeInterval: 2)
        let later = terminalReading()
        // The long press along row 3, read where the row is drawn now.
        let row = element(Seen.screenRow + "3")
        var copyHeld: [String: Any] = [:]
        var rowLabel: String?
        if row.waitForExistence(timeout: 5) {
            rowLabel = row.label
            let start = row.coordinate(withNormalizedOffset: CGVector(dx: 0.02, dy: 0.5))
            let end = row.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5))
            start.press(forDuration: 1.0, thenDragTo: end)
            let copy = element(Seen.screenCopy)
            let copyUp = copy.waitForExistence(timeout: 5)
            copyHeld = [
                "copy": copyUp && copy.isHittable,
                "catchUp": element(Seen.sessionOpenCatchUp).exists && element(Seen.sessionOpenCatchUp).isHittable,
                "end": element(Seen.sessionEnd).exists && element(Seen.sessionEnd).isHittable,
                "reading": terminalReading()
            ]
            if copyUp { copy.tap() }
        }
        let copied = lines.emit(["step": "glitch-copied", "row": rowLabel.map { $0 as Any } ?? NSNull(), "held": copyHeld])
        _ = ack("screen-\(copied)")
        Thread.sleep(forTimeInterval: 0.6)
        let afterPress = terminalReading()
        // The keyboard up again, scrolled back: the button over the keyboard's top.
        grid.tap()
        _ = app.keyboards.firstMatch.waitForExistence(timeout: 5)
        Thread.sleep(forTimeInterval: 0.8)
        dragUp()
        Thread.sleep(forTimeInterval: 1.2)
        let scrolledUp = terminalReading()
        let hide2 = element(Seen.screenKey + Seen.keyHide)
        if hide2.exists { hide2.tap() }
        Thread.sleep(forTimeInterval: 0.6)
        let live = element(Seen.screenToLive)
        if live.exists { live.tap() }
        Thread.sleep(forTimeInterval: 1)
        lines.emit([
            "step": "keyboard-glitch",
            "hideKey": hid,
            "rest": rest,
            "up": up,
            "after": after,
            "later": later,
            "afterPress": afterPress,
            "scrolledUp": scrolledUp,
            "end": terminalReading()
        ])
    }

    /// `tray-keyboard` (PS12k, the 337.1 fix round): on the Terminal with the
    /// question's tray drawn, the terminal tapped so the keyboard rises, read,
    /// the bar's key that puts it away pressed, and read again. Raising the
    /// keyboard over the tray froze the 337.1 build (an AttributeGraph cycle
    /// reached from the key field taking the keyboard inside SwiftUI's own
    /// update). A line says the step began, so a step that began and never
    /// ended is told from one that never ran.
    private func trayKeyboard() {
        guard poll({ self.has($0, Seen.screenScreen) && $0.contains { self.index($0.id, after: Seen.sessionChoicePressPrefix) != nil } }) else { return missing("tray-keyboard") }
        let count = { (found: [Found]) in found.filter { self.index($0.id, after: Seen.sessionChoicePressPrefix) != nil }.count }
        let trayBefore = count(tree())
        lines.emit(["step": "tray-keyboard-start", "trayBefore": trayBefore])
        element(Seen.screenGrid).tap()
        let up = app.keyboards.firstMatch.waitForExistence(timeout: 10)
        passKeyboardIntroduction()
        Thread.sleep(forTimeInterval: 1)
        let trayUp = count(tree())
        let hide = element(Seen.screenKey + Seen.keyHide)
        let hid = hide.waitForExistence(timeout: 5)
        if hid { hide.tap() }
        Thread.sleep(forTimeInterval: 1.5)
        let trayAfter = count(tree())
        lines.emit(["step": "tray-keyboard", "keyboard": up, "hideKey": hid, "trayBefore": trayBefore, "trayUp": trayUp, "trayAfter": trayAfter, "state": Int(app.state.rawValue)])
    }

    /// `tray-press:<n>` (PS12): on the Terminal, the question's tray read (each
    /// press's label and frame, the command, the grid), the probe told, option
    /// `n` pressed, and the Terminal read after; no owner check at any moment.
    private func trayPress(_ n: Int) {
        guard poll({ self.has($0, Seen.screenScreen) && $0.contains { self.index($0.id, after: Seen.sessionChoicePressPrefix) != nil } }) else { return missing("tray-press") }
        let found = tree()
        var presses: [[String: Any]] = []
        for f in found {
            guard let i = index(f.id, after: Seen.sessionChoicePressPrefix) else { continue }
            presses.append(["n": i, "label": f.label, "frame": frameOf(f.frame), "enabled": element(f.id).isEnabled])
        }
        let tray: [String: Any] = [
            "face": faceOf(found),
            "presses": presses,
            "command": find(found, Seen.sessionCommand).map { $0.label as Any } ?? NSNull(),
            "grid": find(found, Seen.screenGrid).map { frameOf($0.frame) as Any } ?? NSNull()
        ]
        guard replyAck("tray-offer", ["n": n, "tray": tray]) else { return missing("tray-press") }
        let press = element(Seen.sessionChoicePress(n))
        guard press.exists, press.isHittable else { return missing("tray-press") }
        press.tap()
        var faceID = false
        var line: String?
        let deadline = Date().addingTimeInterval(wait)
        while Date() < deadline {
            if ownerCheckUp() { faceID = true }
            let now = tree()
            if let l = find(now, Seen.sessionReplyLine), !l.label.isEmpty { line = l.label }
            if line != nil || !now.contains(where: { index($0.id, after: Seen.sessionChoicePressPrefix) != nil }) { break }
            Thread.sleep(forTimeInterval: 0.1)
        }
        Thread.sleep(forTimeInterval: 1.5)
        lines.emit(["step": "tray-pressed", "n": n, "faceId": faceID, "line": line.map { $0 as Any } ?? NSNull(), "after": terminalReading()])
    }

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
        // Since Phase 316.6 `session-answer` is a container of `md-last-`
        // blocks whose own label is empty: the answer is composed from them.
        var drawn: [String: String] = [:]
        for e in elements {
            if let id = e["id"] as? String, id.hasPrefix(Seen.md), let label = e["label"] as? String, drawn[id] == nil { drawn[id] = label }
        }
        let composed = MarkdownLabels.composeAll(drawn)
        lines.emit([
            "step": "screen",
            "name": name,
            "window": [Double(window.width), Double(window.height)],
            "elements": elements,
            "composed": composed
        ])
    }
}

// MARK: - An answer composed from its drawn blocks

/// `md-<scope>-<n>`, `-mark`, `-r<i>c<j>`, `-more` and `md-<scope>-rest`, as
/// ios/Tortie/Screens/Identifiers.swift names them: each scope's labels in
/// pre-order (by `n`; within a block its mark, itself, its cells by row and
/// column, then its note; the cut last), joined with a new line.
enum MarkdownLabels {
    private struct Key: Comparable {
        let n: Int
        let part: Int
        let row: Int
        let column: Int

        static func < (a: Key, b: Key) -> Bool {
            (a.n, a.part, a.row, a.column) < (b.n, b.part, b.row, b.column)
        }
    }

    /// The scope and the place of one identifier, or nil when it is not a drawn block's.
    private static func parse(_ id: String) -> (scope: String, key: Key)? {
        guard id.hasPrefix(Seen.md) else { return nil }
        let rest = id.dropFirst(Seen.md.count)
        guard let dash = rest.firstIndex(of: "-") else { return nil }
        let scope = String(rest[..<dash])
        let tail = rest[rest.index(after: dash)...]
        if tail == "rest" { return (scope, Key(n: Int.max, part: 0, row: 0, column: 0)) }
        let digits = tail.prefix { $0.isNumber }
        guard let n = Int(digits) else { return nil }
        let after = tail.dropFirst(digits.count)
        if after.isEmpty { return (scope, Key(n: n, part: 1, row: 0, column: 0)) }
        if after == "-mark" { return (scope, Key(n: n, part: 0, row: 0, column: 0)) }
        if after == "-more" { return (scope, Key(n: n, part: 3, row: 0, column: 0)) }
        if after.hasPrefix("-r"), let c = after.firstIndex(of: "c"),
           let row = Int(after[after.index(after.startIndex, offsetBy: 2)..<c]),
           let column = Int(after[after.index(after: c)...]) {
            return (scope, Key(n: n, part: 2, row: row, column: column))
        }
        return nil
    }

    /// Every scope's composed answer, from identifier to label.
    static func composeAll(_ labels: [String: String]) -> [String: String] {
        var byScope: [String: [(Key, String)]] = [:]
        for (id, label) in labels {
            guard let (scope, key) = parse(id) else { continue }
            byScope[scope, default: []].append((key, label))
        }
        return byScope.mapValues { parts in
            parts.sorted { $0.0 < $1.0 }.map(\.1).filter { !$0.isEmpty }.joined(separator: "\n")
        }
    }
}
