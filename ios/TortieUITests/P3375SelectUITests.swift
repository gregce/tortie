import Foundation
import XCTest

/// `probe:p3375`'s hands and eyes in the Simulator (Phase 337.5,
/// build/p3375/SPEC.md section 7.3): selecting text on a session's Terminal
/// the iPhone's way, over See a sample. No door, no Mac, no model turn.
///
/// Each test method is ONE ARM, so the probe reads the device's pasteboard
/// inside it, through build/simulator-run.mjs's own `pasteboard()`, behind a
/// file this drive waits for. Every method launches the DEBUG app with
/// `-TortieDebugForgetPairing` (start unpaired, so Pairing draws See a sample)
/// and `-TortieDebugStill` (the attention dot held still, so XCUITest sees the
/// app go idle), presses `pairing-see-sample`, selects the Sessions tab by its
/// label, opens `row-sample-1` and waits for the Terminal's rows.
///
/// IT ASSERTS NOTHING. The probe is the judge: it re-derives every text it
/// expects from ios/Tortie/Sample/sample.json by the app's own rules (a cell
/// per column, a word between two blanks, the selected text by absolute
/// index), so the Swift never grades the Swift. This file reads labels and
/// frames from the accessibility tree and the edit menu's items, and never a
/// photograph (conformance:ios rule i). It never reads the pasteboard.
///
/// WHERE IT PRESSES. The probe hands a plan (`P3375_PLAN`, a JSON file): the
/// Terminal's width in columns and, per arm, a list of candidate words, each a
/// row (`live` row n is `screen-row-<n>`, `history` row i is
/// `screen-history-<i>`, i its absolute index) and a column. A row element is
/// exactly `columns` cells wide (Screens/ScreenGrid.swift), so a cell's centre
/// is the row's frame divided by the columns, and a caret is a cell's left
/// edge. The drive takes the FIRST candidate whose rows are drawn in view,
/// under the line over the terminal's top and above the keyboard, the key bar
/// and the back-to-live button, and prints the one it took with the labels of
/// its rows, which the probe compares with its own.
///
/// THE LINE PROTOCOL. Every line is `P3375|<run>|<one JSON object>` on stdout
/// and appended to `P3375_LINES`. Each object carries `arm` and `seq` (from 1
/// in each method). `{"step":"pasteboard","when":"before"|"after"}` waits for
/// the probe's file `pb-<arm>-<seq>` in `P3375_ACKS`: the probe reads the
/// device's pasteboard, then writes it. A step that cannot find its screen
/// prints `missing` and the method ends, so an arm ends in a reading, never a
/// hang.
///
/// Since the 337.5 fix round: G0 reads the Terminal's accessibility elements
/// under the grid (the rows, by identifier and label, and any text view);
/// N8 drags the START handle up into history; N9 takes each handle again
/// and rests on it a second before it moves; N10, run by the probe on a COPY
/// of the app whose sample pages arrive late, drags a handle onto rows not
/// yet fetched and reads the menu at the lift and when it comes by itself.
///
/// It skips itself unless `P3375_RUN` is set: alone it has nobody to judge it,
/// and `test:ios` runs `TortieTests` alone.
final class P3375SelectUITests: XCTestCase {
    @MainActor func testN1WordPress() throws { try drive("N1") }
    @MainActor func testN2PressAndSlide() throws { try drive("N2") }
    @MainActor func testN3EndHandle() throws { try drive("N3") }
    @MainActor func testN4HistoryIntoLive() throws { try drive("N4") }
    @MainActor func testN5KeyboardUp() throws { try drive("N5") }
    @MainActor func testN6Sideways() throws { try drive("N6") }
    @MainActor func testN7TapInsideThenOutside() throws { try drive("N7") }
    @MainActor func testN8StartHandleIntoHistory() throws { try drive("N8") }
    @MainActor func testN9HandlesHeldBeforeTheyMove() throws { try drive("N9") }
    @MainActor func testN10ReservedRowsWait() throws { try drive("N10") }
    @MainActor func testG0RowsAreTheElements() throws { try drive("G0") }
    @MainActor func testG1TapRaisesKeyBar() throws { try drive("G1") }
    @MainActor func testG2DoubleTapZoom() throws { try drive("G2") }
    @MainActor func testG3Pinch() throws { try drive("G3") }
    @MainActor func testG4SwipeAndBack() throws { try drive("G4") }
    @MainActor func testG5TapClearsSelection() throws { try drive("G5") }

    @MainActor
    private func drive(_ arm: String) throws {
        let env = ProcessInfo.processInfo.environment
        guard let run = env["P3375_RUN"], !run.isEmpty else {
            throw XCTSkip("probe:p3375 drives this test; on its own it has nobody to read it.")
        }
        continueAfterFailure = true
        P3375Drive(arm: arm, run: run, env: env).go()
    }
}

// MARK: - The identifiers

/// Identifiers.swift's names, spelled again because a UI test cannot import
/// the app; the probe reads the same names.
private enum P3375Seen {
    static let pairingScreen = "screen-pairing"
    static let pairingSeeSample = "pairing-see-sample"
    static let sampleBar = "sample-bar"
    static let listScreen = "screen-list"
    static let grid = "screen-grid"
    static let liveRow = "screen-row-"
    static let historyRow = "screen-history-"
    static let toLive = "screen-to-live"
    static let line = "screen-line"
    static let scrollbackLine = "screen-scrollback-line"
    static let keyBar = "screen-key-bar"
    static let keyHide = "screen-key-hide"
    static let copy = "screen-copy"
    /// iOS's one-time Slide to Type introduction and its button.
    static let keyboardIntroduction = "UIContinuousPathIntroductionView"
    static let keyboardIntroductionContinue = "Continue"
    static func row(_ id: String) -> String { "row-" + id }
}

/// One element of one snapshot.
private struct P3375Node {
    let id: String
    let label: String
    let frame: CGRect
    let type: XCUIElement.ElementType
}

// MARK: - The drive

@MainActor
private final class P3375Drive {
    private let app = XCUIApplication()
    private let arm: String
    private let run: String
    private let linesFile: String?
    private let acks: String?
    private let plan: [String: Any]
    private var seq = 0
    private var stopped = false

    init(arm: String, run: String, env: [String: String]) {
        self.arm = arm
        self.run = run
        linesFile = env["P3375_LINES"].flatMap { $0.isEmpty ? nil : $0 }
        acks = env["P3375_ACKS"].flatMap { $0.isEmpty ? nil : $0 }
        let planData = env["P3375_PLAN"].flatMap { FileManager.default.contents(atPath: $0) }
        plan = planData.flatMap { (try? JSONSerialization.jsonObject(with: $0)) as? [String: Any] } ?? [:]
    }

    private var columns: Int { (plan["columns"] as? NSNumber)?.intValue ?? 0 }
    private var copyWord: String { plan["copyWord"] as? String ?? "Copy" }
    private var sessionsWord: String { plan["sessionsWord"] as? String ?? "Sessions" }
    private var session: String { plan["session"] as? String ?? "sample-1" }
    private var armPlan: [String: Any] { (plan["arms"] as? [String: Any])?[arm] as? [String: Any] ?? [:] }
    private var candidates: [[String: Any]] { armPlan["candidates"] as? [[String: Any]] ?? [] }

    // MARK: Lines

    @discardableResult
    private func emit(_ object: [String: Any]) -> Int {
        seq += 1
        var body = object
        body["seq"] = seq
        body["arm"] = arm
        guard let json = try? JSONSerialization.data(withJSONObject: body, options: [.sortedKeys, .withoutEscapingSlashes]),
              let text = String(data: json, encoding: .utf8) else { return seq }
        let line = Data("P3375|\(run)|\(text)\n".utf8)
        FileHandle.standardOutput.write(line)
        guard let linesFile else { return seq }
        if !FileManager.default.fileExists(atPath: linesFile) {
            FileManager.default.createFile(atPath: linesFile, contents: nil)
        }
        guard let handle = FileHandle(forWritingAtPath: linesFile) else { return seq }
        defer { try? handle.close() }
        _ = try? handle.seekToEnd()
        try? handle.write(contentsOf: line)
        return seq
    }

    /// The probe's file `name` in P3375_ACKS, waited for up to `seconds`.
    private func ack(_ name: String, within seconds: TimeInterval = 90) -> Bool {
        guard let acks else { return false }
        let path = (acks as NSString).appendingPathComponent(name)
        let deadline = Date().addingTimeInterval(seconds)
        while Date() < deadline {
            if FileManager.default.fileExists(atPath: path) { return true }
            Thread.sleep(forTimeInterval: 0.2)
        }
        return FileManager.default.fileExists(atPath: path)
    }

    /// The probe reads the device's pasteboard now, then lets the drive go on.
    private func pasteboard(_ when: String) {
        let n = emit(["step": "pasteboard", "when": when])
        let acked = ack("pb-\(arm)-\(n)")
        emit(["step": "pasteboard-acked", "when": when, "acked": acked])
    }

    private func missing(_ at: String) {
        emit(["step": "missing", "at": at, "reading": terminalReading()])
        stopped = true
    }

    // MARK: Reading

    private func frameOf(_ f: CGRect) -> [Double] {
        [f.origin.x, f.origin.y, f.size.width, f.size.height].map { $0.isFinite ? Double($0) : -1 }
    }

    /// Every element of ONE snapshot, identified or not.
    private func nodes() -> [P3375Node] {
        guard let root = try? app.snapshot() else { return [] }
        var out: [P3375Node] = []
        var stack: [XCUIElementSnapshot] = [root]
        while let node = stack.popLast() {
            out.append(P3375Node(id: node.identifier, label: node.label, frame: node.frame, type: node.elementType))
            stack.append(contentsOf: node.children.reversed())
        }
        return out
    }

    private func find(_ found: [P3375Node], _ id: String) -> P3375Node? {
        found.first { $0.id == id }
    }

    private func has(_ found: [P3375Node], _ id: String) -> Bool {
        found.contains { $0.id == id }
    }

    private func element(_ id: String) -> XCUIElement {
        app.descendants(matching: .any).matching(identifier: id).firstMatch
    }

    /// The number after `prefix` when the rest of the identifier is only digits.
    private func index(_ id: String, after prefix: String) -> Int? {
        guard id.hasPrefix(prefix) else { return nil }
        let rest = id.dropFirst(prefix.count)
        guard !rest.isEmpty, rest.allSatisfy(\.isNumber) else { return nil }
        return Int(rest)
    }

    private func rowId(_ ref: [String: Any]) -> String? {
        guard let kind = ref["kind"] as? String, let n = (ref["n"] as? NSNumber)?.intValue else { return nil }
        if kind == "live" { return P3375Seen.liveRow + String(n) }
        if kind == "history" { return P3375Seen.historyRow + String(n) }
        return nil
    }

    private func intOf(_ ref: [String: Any], _ key: String) -> Int? {
        (ref[key] as? NSNumber)?.intValue
    }

    /// The Terminal, read from one snapshot: every drawn row with its label
    /// and frame, the grid, the keyboard, the key bar, the lines over the
    /// terminal's top and the back-to-live button.
    private func terminalReading(_ given: [P3375Node]? = nil) -> [String: Any] {
        let found = given ?? nodes()
        var live: [[String: Any]] = []
        var history: [[String: Any]] = []
        for f in found {
            if let n = index(f.id, after: P3375Seen.liveRow) {
                live.append(["n": n, "label": f.label, "frame": frameOf(f.frame)])
            } else if let i = index(f.id, after: P3375Seen.historyRow) {
                history.append(["i": i, "label": f.label, "frame": frameOf(f.frame)])
            }
        }
        live.sort { ($0["n"] as? Int ?? 0) < ($1["n"] as? Int ?? 0) }
        history.sort { ($0["i"] as? Int ?? 0) < ($1["i"] as? Int ?? 0) }
        let keyboard = app.keyboards.firstMatch
        let part = { (id: String) -> Any in self.find(found, id).map { self.frameOf($0.frame) as Any } ?? NSNull() }
        let window = found.first?.frame.size ?? .zero
        return [
            "live": live,
            "history": history,
            "grid": part(P3375Seen.grid),
            "toLive": part(P3375Seen.toLive),
            "line": part(P3375Seen.line),
            "scrollbackLine": part(P3375Seen.scrollbackLine),
            "keyBar": part(P3375Seen.keyBar),
            "keyboard": keyboard.exists ? frameOf(keyboard.frame) as Any : NSNull(),
            "window": [Double(window.width), Double(window.height)],
            "orientation": XCUIDevice.shared.orientation.rawValue
        ]
    }

    /// The edit menu as XCUITest reads it, every label the app draws, and
    /// every element carrying `screen-copy` with its type: what the probe
    /// looks for anything but Copy in.
    private func menuReading(_ tag: String) {
        let items = app.menuItems.allElementsBoundByIndex.filter(\.exists).map { item -> [String: Any] in
            ["label": item.label, "id": item.identifier, "frame": frameOf(item.frame), "hittable": item.isHittable]
        }
        let found = nodes()
        var labels: [String] = []
        for f in found where !f.label.isEmpty && !labels.contains(f.label) {
            labels.append(f.label)
        }
        let copies = found.filter { $0.id == P3375Seen.copy }.map { c -> [String: Any] in
            ["type": Int(c.type.rawValue), "menuItem": c.type == .menuItem, "button": c.type == .button, "label": c.label, "frame": frameOf(c.frame)]
        }
        emit(["step": "menu", "tag": tag, "items": items, "labels": labels, "copies": copies, "reading": terminalReading(found)])
    }

    /// Up to `seconds` for the edit menu to hold an item.
    private func waitForMenu(_ seconds: TimeInterval = 5) -> Bool {
        let deadline = Date().addingTimeInterval(seconds)
        while Date() < deadline {
            if app.menuItems.count > 0 { return true }
            Thread.sleep(forTimeInterval: 0.25)
        }
        return app.menuItems.count > 0
    }

    // MARK: Points

    /// A point in the grid's own coordinate, so it is right in either
    /// orientation: the grid's frame and every row's are read in one space.
    private func at(_ point: CGPoint) -> XCUICoordinate {
        let grid = element(P3375Seen.grid)
        let frame = grid.frame
        return grid.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: point.x - frame.minX, dy: point.y - frame.minY))
    }

    private func cellCentre(_ row: CGRect, _ column: Int) -> CGPoint {
        let width = row.width / CGFloat(max(1, columns))
        return CGPoint(x: row.minX + (CGFloat(column) + 0.5) * width, y: row.midY)
    }

    private func caretPoint(_ row: CGRect, _ caret: Int) -> CGPoint {
        let width = row.width / CGFloat(max(1, columns))
        return CGPoint(x: row.minX + CGFloat(caret) * width, y: row.midY)
    }

    /// Where a press may land, read once per snapshot: inside the grid, under
    /// the lines over its top (and the held line a selection draws there),
    /// above the keyboard and the key bar, and off the back-to-live button.
    private struct Band {
        let left: CGFloat
        let right: CGFloat
        let top: CGFloat
        let bottom: CGFloat
        let avoid: CGRect?

        func holds(_ p: CGPoint) -> Bool {
            if let avoid, avoid.contains(p) { return false }
            return p.y >= top && p.y <= bottom && p.x >= left && p.x <= right
        }
    }

    private func band(_ found: [P3375Node]) -> Band? {
        guard let grid = find(found, P3375Seen.grid)?.frame else { return nil }
        var top = grid.minY + 64
        for id in [P3375Seen.line, P3375Seen.scrollbackLine] {
            if let f = find(found, id)?.frame { top = max(top, f.maxY + 12) }
        }
        var bottom = grid.maxY - 12
        if let bar = find(found, P3375Seen.keyBar)?.frame { bottom = min(bottom, bar.minY - 12) }
        let keyboard = app.keyboards.firstMatch
        if keyboard.exists { bottom = min(bottom, keyboard.frame.minY - 12) }
        let avoid = find(found, P3375Seen.toLive)?.frame.insetBy(dx: -12, dy: -12)
        return Band(left: grid.minX + 2, right: grid.maxX - 2, top: top, bottom: bottom, avoid: avoid)
    }

    /// The first candidate whose rows are drawn and whose every point may be
    /// pressed, with its rows' frames and labels.
    private func pick() -> (candidate: [String: Any], frames: [String: CGRect])? {
        let found = nodes()
        let within = band(found)
        for c in candidates {
            guard let startId = rowId(c), let start = find(found, startId), let col = intOf(c, "col") else { continue }
            var frames = ["start": start.frame]
            var points = [cellCentre(start.frame, col)]
            if let caret = intOf(c, "endCaret") { points.append(caretPoint(start.frame, caret)) }
            if let caret = intOf(c, "startCaret") { points.append(caretPoint(start.frame, caret)) }
            if let above = intOf(c, "above"), let aboveCol = intOf(c, "aboveCol") {
                let row = start.frame.offsetBy(dx: 0, dy: -CGFloat(above) * start.frame.height)
                frames["above"] = row
                points.append(cellCentre(row, aboveCol))
            }
            if let toCol = intOf(c, "toCol") { points.append(cellCentre(start.frame, toCol)) }
            var ok = true
            for key in ["to", "outside", "hold", "up"] {
                guard let ref = c[key] as? [String: Any] else { continue }
                guard let id = rowId(ref), let row = find(found, id), let refCol = intOf(ref, "col") else {
                    ok = false
                    break
                }
                frames[key] = row.frame
                points.append(cellCentre(row.frame, refCol))
            }
            guard ok, let within, points.allSatisfy({ within.holds($0) }) else { continue }
            var labels: [String: Any] = ["start": start.label]
            for key in ["to", "outside", "hold", "up"] {
                if let ref = c[key] as? [String: Any], let id = rowId(ref) { labels[key] = find(found, id)?.label ?? NSNull() }
            }
            emit(["step": "chose", "candidate": c, "labels": labels, "reading": terminalReading(found)])
            return (c, frames)
        }
        emit(["step": "chose", "candidate": NSNull(), "reading": terminalReading(found)])
        return nil
    }

    // MARK: The sample, opened

    /// The app launched unpaired, See a sample pressed, the Sessions tab, the
    /// sample's first session, and its Terminal's rows.
    private func open() -> Bool {
        XCUIDevice.shared.orientation = .portrait
        app.launchArguments = ["-TortieDebugForgetPairing", "-TortieDebugStill"]
        app.launch()
        let see = element(P3375Seen.pairingSeeSample)
        guard see.waitForExistence(timeout: 45) else {
            missing("pairing-see-sample")
            return false
        }
        var tries = 0
        while !(see.exists && see.isHittable) && tries < 6 {
            element(P3375Seen.pairingScreen).swipeUp()
            Thread.sleep(forTimeInterval: 0.6)
            tries += 1
        }
        see.tap()
        guard element(P3375Seen.sampleBar).waitForExistence(timeout: 30) else {
            missing("sample-bar")
            return false
        }
        if !element(P3375Seen.listScreen).exists { selectTab(sessionsWord) }
        let row = element(P3375Seen.row(session))
        guard row.waitForExistence(timeout: 30) else {
            missing("row-" + session)
            return false
        }
        row.tap()
        let deadline = Date().addingTimeInterval(45)
        var drawn = false
        while Date() < deadline {
            let found = nodes()
            if has(found, P3375Seen.grid) && found.contains(where: { index($0.id, after: P3375Seen.liveRow) != nil }) {
                drawn = true
                break
            }
            Thread.sleep(forTimeInterval: 0.25)
        }
        guard drawn else {
            missing("terminal")
            return false
        }
        // The fill's first page lands and the layout settles.
        Thread.sleep(forTimeInterval: 2.5)
        emit(["step": "open", "ok": true, "reading": terminalReading()])
        return true
    }

    /// A tab's button by its label: the tab bar's own, or, where iOS 26's
    /// glass bar is not reported as a tab bar, the lowest button so named.
    private func selectTab(_ label: String) {
        let inBar = app.tabBars.buttons[label]
        if inBar.waitForExistence(timeout: 3) {
            inBar.tap()
            return
        }
        let named = app.buttons.matching(NSPredicate(format: "label == %@", label)).allElementsBoundByIndex.filter { $0.exists }
        named.max(by: { $0.frame.minY < $1.frame.minY })?.tap()
    }

    /// iOS's one-time Slide to Type introduction, passed by its own Continue.
    private func passKeyboardIntroduction() {
        let intro = app.otherElements[P3375Seen.keyboardIntroduction]
        guard intro.waitForExistence(timeout: 2) else { return }
        let go = intro.buttons[P3375Seen.keyboardIntroductionContinue]
        if go.exists { go.tap() }
        let deadline = Date().addingTimeInterval(5)
        while intro.exists && Date() < deadline {
            Thread.sleep(forTimeInterval: 0.2)
        }
        emit(["step": "keyboard-introduction", "gone": !intro.exists])
    }

    private func keyboardUp() -> Bool {
        let up = app.keyboards.firstMatch.waitForExistence(timeout: 5)
        if up { passKeyboardIntroduction() }
        Thread.sleep(forTimeInterval: 1)
        return up
    }

    private func hideKeyboard() {
        let hide = element(P3375Seen.keyHide)
        if hide.exists { hide.tap() }
        Thread.sleep(forTimeInterval: 0.8)
    }

    // MARK: The gestures

    private func longPress(_ frames: [String: CGRect], _ c: [String: Any]) {
        guard let start = frames["start"], let col = intOf(c, "col") else { return }
        at(cellCentre(start, col)).press(forDuration: 1.0)
        _ = waitForMenu()
        Thread.sleep(forTimeInterval: 0.5)
    }

    /// Copy pressed in the edit menu, by its identifier, else by its word.
    private func pressCopy() {
        let byId = app.menuItems.matching(identifier: P3375Seen.copy).firstMatch
        let byWord = app.menuItems[copyWord]
        let via: String?
        let item: XCUIElement?
        if byId.exists {
            via = "id"
            item = byId
        } else if byWord.exists {
            via = "label"
            item = byWord
        } else {
            via = nil
            item = nil
        }
        let hittable = item?.isHittable ?? false
        if hittable { item?.tap() }
        Thread.sleep(forTimeInterval: 1)
        emit(["step": "copy", "pressed": hittable, "via": via.map { $0 as Any } ?? NSNull()])
    }

    /// The end handle, from its caret to the cell `to` names: pressed a
    /// moment, moved slowly, held, lifted.
    private func dragEnd(_ frames: [String: CGRect], _ c: [String: Any]) {
        guard let start = frames["start"], let caret = intOf(c, "endCaret"),
              let to = frames["to"], let ref = c["to"] as? [String: Any], let col = intOf(ref, "col") else { return }
        at(caretPoint(start, caret)).press(forDuration: 0.3, thenDragTo: at(cellCentre(to, col)), withVelocity: .slow, thenHoldForDuration: 0.6)
        _ = waitForMenu()
        Thread.sleep(forTimeInterval: 0.5)
    }

    private func gridCell() -> [Double]? {
        let found = nodes()
        guard let row = found.first(where: { index($0.id, after: P3375Seen.liveRow) != nil || index($0.id, after: P3375Seen.historyRow) != nil }) else { return nil }
        return [Double(row.frame.width) / Double(max(1, columns)), Double(row.frame.height)]
    }

    // MARK: The arms

    func go() {
        defer {
            emit(["step": "done", "stopped": stopped])
            XCUIDevice.shared.orientation = .portrait
        }
        guard open() else { return }
        switch arm {
        case "N1": n1()
        case "N2": n2()
        case "N3", "N4": handleArm()
        case "N5": n5()
        case "N6": n6()
        case "N7": n7()
        case "N8": n8()
        case "N9": n9()
        case "N10": n10()
        case "G0": g0()
        case "G1": g1()
        case "G2": g2()
        case "G3": g3()
        case "G4": g4()
        case "G5": g5()
        default: emit(["step": "unknown-arm"])
        }
    }

    /// N1: a long press on a word, the menu read, Copy pressed.
    private func n1() {
        pasteboard("before")
        guard let picked = pick() else { return }
        let (c, frames) = (picked.candidate, picked.frames)
        longPress(frames, c)
        menuReading("pressed")
        pressCopy()
        pasteboard("after")
        menuReading("after-copy")
    }

    /// N2: a long press that slides along the row before it lifts.
    private func n2() {
        pasteboard("before")
        guard let picked = pick() else { return }
        let (c, frames) = (picked.candidate, picked.frames)
        guard let start = frames["start"], let col = intOf(c, "col"), let toCol = intOf(c, "toCol") else { return }
        at(cellCentre(start, col)).press(forDuration: 1.0, thenDragTo: at(cellCentre(start, toCol)))
        _ = waitForMenu()
        Thread.sleep(forTimeInterval: 0.5)
        menuReading("pressed")
        pressCopy()
        pasteboard("after")
    }

    /// N3 and N4: a word, then its end handle dragged to another row. N4
    /// first drags the terminal down, into what the session printed before.
    private func handleArm() {
        pasteboard("before")
        if arm == "N4" {
            let rows = (armPlan["scrollRows"] as? NSNumber)?.doubleValue ?? 8
            let grid = element(P3375Seen.grid)
            let height = gridCell()?[1] ?? 10
            let from = grid.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.3))
            from.press(forDuration: 0.05, thenDragTo: from.withOffset(CGVector(dx: 0, dy: CGFloat(rows * height))), withVelocity: XCUIGestureVelocity(300), thenHoldForDuration: 0.4)
            Thread.sleep(forTimeInterval: 2.5)
            emit(["step": "scrolled", "reading": terminalReading()])
        }
        guard let picked = pick() else { return }
        let (c, frames) = (picked.candidate, picked.frames)
        longPress(frames, c)
        menuReading("pressed")
        dragEnd(frames, c)
        menuReading("dragged")
        pressCopy()
        pasteboard("after")
        if arm == "N4" {
            let back = element(P3375Seen.toLive)
            if back.exists { back.tap() }
            Thread.sleep(forTimeInterval: 1.5)
            emit(["step": "back", "reading": terminalReading()])
        }
    }

    /// N5: the keyboard raised by a tap, then a long press.
    private func n5() {
        pasteboard("before")
        element(P3375Seen.grid).coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.3)).tap()
        let up = keyboardUp()
        emit(["step": "keyboard", "up": up, "reading": terminalReading()])
        guard let picked = pick() else { return }
        let (c, frames) = (picked.candidate, picked.frames)
        longPress(frames, c)
        menuReading("pressed")
        pressCopy()
        pasteboard("after")
        menuReading("after-copy")
        hideKeyboard()
    }

    /// N6: sideways, a long press, the menu read, Copy pressed.
    private func n6() {
        pasteboard("before")
        XCUIDevice.shared.orientation = .landscapeLeft
        Thread.sleep(forTimeInterval: 3)
        let found = nodes()
        let copies = found.filter { $0.id == P3375Seen.copy }.map { ["type": Int($0.type.rawValue), "button": $0.type == .button] as [String: Any] }
        emit(["step": "rotated", "copies": copies, "reading": terminalReading(found)])
        guard let picked = pick() else { return }
        let (c, frames) = (picked.candidate, picked.frames)
        longPress(frames, c)
        menuReading("pressed")
        pressCopy()
        pasteboard("after")
        XCUIDevice.shared.orientation = .portrait
        Thread.sleep(forTimeInterval: 2)
    }

    /// N7: a word, a tap on it, a tap elsewhere, and a tap where it was.
    private func n7() {
        guard let picked = pick() else { return }
        let (c, frames) = (picked.candidate, picked.frames)
        guard let start = frames["start"], let col = intOf(c, "col"),
              let outside = frames["outside"], let ref = c["outside"] as? [String: Any], let outCol = intOf(ref, "col") else { return }
        longPress(frames, c)
        menuReading("pressed")
        at(cellCentre(start, col)).tap()
        _ = waitForMenu(3)
        Thread.sleep(forTimeInterval: 0.5)
        menuReading("inside")
        at(cellCentre(outside, outCol)).tap()
        Thread.sleep(forTimeInterval: 1.5)
        menuReading("outside")
        at(cellCentre(start, col)).tap()
        _ = app.keyboards.firstMatch.waitForExistence(timeout: 5)
        passKeyboardIntroduction()
        Thread.sleep(forTimeInterval: 1)
        menuReading("again")
        hideKeyboard()
    }

    /// A handle from `from` to `to`: touched `seconds` (0.3 quick, 1.0 resting
    /// past the long press's 0.45 s), moved slowly, held, lifted.
    private func dragHandle(from: CGPoint, to: CGPoint, resting seconds: TimeInterval) {
        at(from).press(forDuration: seconds, thenDragTo: at(to), withVelocity: .slow, thenHoldForDuration: 0.6)
        _ = waitForMenu()
        Thread.sleep(forTimeInterval: 0.5)
    }

    /// N8: the Terminal dragged down into history, a word of a live row, its
    /// START handle dragged up onto a row of history.
    private func n8() {
        pasteboard("before")
        let rows = (armPlan["scrollRows"] as? NSNumber)?.doubleValue ?? 14
        let grid = element(P3375Seen.grid)
        let height = gridCell()?[1] ?? 10
        let from = grid.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.3))
        from.press(forDuration: 0.05, thenDragTo: from.withOffset(CGVector(dx: 0, dy: CGFloat(rows * height))), withVelocity: XCUIGestureVelocity(300), thenHoldForDuration: 0.4)
        Thread.sleep(forTimeInterval: 2.5)
        emit(["step": "scrolled", "reading": terminalReading()])
        guard let picked = pick() else { return }
        let (c, frames) = (picked.candidate, picked.frames)
        guard let start = frames["start"], let caret = intOf(c, "startCaret"),
              let to = frames["to"], let ref = c["to"] as? [String: Any], let col = intOf(ref, "col") else { return }
        longPress(frames, c)
        menuReading("pressed")
        dragHandle(from: caretPoint(start, caret), to: cellCentre(to, col), resting: 0.3)
        menuReading("dragged")
        pressCopy()
        pasteboard("after")
        let back = element(P3375Seen.toLive)
        if back.exists { back.tap() }
        Thread.sleep(forTimeInterval: 1.5)
    }

    /// N9: a word, its end handle dragged quickly three rows down; then the
    /// END handle taken again and rested on a second before it moves on, and
    /// the START handle the same way (the 337.5 verifier's V8b and V9b).
    private func n9() {
        pasteboard("before")
        guard let picked = pick() else { return }
        let (c, frames) = (picked.candidate, picked.frames)
        guard let start = frames["start"], let endCaret = intOf(c, "endCaret"), let startCaret = intOf(c, "startCaret"),
              let to = frames["to"], let toRef = c["to"] as? [String: Any], let toCol = intOf(toRef, "col"),
              let hold = frames["hold"], let holdRef = c["hold"] as? [String: Any], let holdCol = intOf(holdRef, "col"),
              let up = frames["up"], let upRef = c["up"] as? [String: Any], let upCol = intOf(upRef, "col") else { return }
        longPress(frames, c)
        menuReading("pressed")
        dragHandle(from: caretPoint(start, endCaret), to: cellCentre(to, toCol), resting: 0.3)
        menuReading("dragged")
        dragHandle(from: caretPoint(to, toCol + 1), to: cellCentre(hold, holdCol), resting: 1.0)
        menuReading("end-rested")
        dragHandle(from: caretPoint(start, startCaret), to: cellCentre(up, upCol), resting: 1.0)
        menuReading("start-rested")
        pressCopy()
        pasteboard("after")
    }

    /// N10 (on the probe's copy whose pages come late): the Terminal dragged
    /// down over rows not yet fetched, a word of a live row and its START
    /// handle dragged up onto them; the menu read at the lift, and when it
    /// comes with no touch, Copy pressed the moment it does.
    private func n10() {
        pasteboard("before")
        let rows = (armPlan["scrollRows"] as? NSNumber)?.doubleValue ?? 14
        let grid = element(P3375Seen.grid)
        let height = gridCell()?[1] ?? 10
        let from = grid.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.3))
        from.press(forDuration: 0.05, thenDragTo: from.withOffset(CGVector(dx: 0, dy: CGFloat(rows * height))), withVelocity: XCUIGestureVelocity(300), thenHoldForDuration: 0.4)
        Thread.sleep(forTimeInterval: 1.5)
        emit(["step": "scrolled", "reading": terminalReading()])
        guard let picked = pick() else { return }
        let (c, frames) = (picked.candidate, picked.frames)
        guard let start = frames["start"], let caret = intOf(c, "startCaret"), let above = frames["above"],
              let aboveCol = intOf(c, "aboveCol"), let n = intOf(c, "n"), let rowsAbove = intOf(c, "above") else { return }
        let depth = (plan["depth"] as? NSNumber)?.intValue ?? 0
        longPress(frames, c)
        menuReading("pressed")
        at(caretPoint(start, caret)).press(forDuration: 0.3, thenDragTo: at(cellCentre(above, aboveCol)), withVelocity: .slow, thenHoldForDuration: 0.3)
        let lifted = Date()
        let items = app.menuItems.count
        let found = nodes()
        let targets = (0..<rowsAbove).map { depth + n - rowsAbove + $0 }.filter { $0 < depth }
        let drawnAtLift = targets.filter { has(found, P3375Seen.historyRow + String($0)) }
        emit(["step": "lifted", "menuItems": items, "targets": targets, "drawnAtLift": drawnAtLift, "reading": terminalReading(found)])
        var appeared: Double?
        let deadline = Date().addingTimeInterval(45)
        while Date() < deadline {
            if app.menuItems.count > 0 {
                appeared = Date().timeIntervalSince(lifted)
                break
            }
            Thread.sleep(forTimeInterval: 0.1)
        }
        emit(["step": "appeared", "after": appeared.map { $0 as Any } ?? NSNull()])
        menuReading("came")
        pressCopy()
        pasteboard("after")
    }

    /// G0: the Terminal's accessibility elements under the grid, as one
    /// snapshot reads them: every element's kind, and any text view or long
    /// value there, beside the rows.
    private func g0() {
        guard let root = try? app.snapshot() else {
            emit(["step": "g0", "read": false])
            return
        }
        var grid: XCUIElementSnapshot?
        var stack: [XCUIElementSnapshot] = [root]
        while let node = stack.popLast() {
            if node.identifier == P3375Seen.grid {
                grid = node
                break
            }
            stack.append(contentsOf: node.children)
        }
        guard let grid else {
            emit(["step": "g0", "read": false])
            return
        }
        var textViews = 0
        var longest = 0
        var kinds: [String: Int] = [:]
        var under: [XCUIElementSnapshot] = grid.children
        while let node = under.popLast() {
            if node.elementType == .textView { textViews += 1 }
            kinds[String(node.elementType.rawValue), default: 0] += 1
            if let value = node.value as? String { longest = max(longest, value.count) }
            under.append(contentsOf: node.children)
        }
        emit(["step": "g0", "read": true, "textViews": textViews, "longestValue": longest, "kinds": kinds, "reading": terminalReading()])
    }

    /// G1: a tap raises the keyboard and its key bar.
    private func g1() {
        let before = terminalReading()
        element(P3375Seen.grid).coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.3)).tap()
        let up = keyboardUp()
        emit(["step": "g1", "up": up, "before": before, "after": terminalReading()])
        hideKeyboard()
    }

    /// G2: a double tap zooms, and a second one zooms back.
    private func g2() {
        let grid = element(P3375Seen.grid)
        let before = gridCell()
        grid.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).doubleTap()
        Thread.sleep(forTimeInterval: 1.5)
        let zoomed = gridCell()
        grid.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).doubleTap()
        Thread.sleep(forTimeInterval: 1.5)
        let back = gridCell()
        emit(["step": "g2", "before": before.map { $0 as Any } ?? NSNull(), "zoomed": zoomed.map { $0 as Any } ?? NSNull(), "back": back.map { $0 as Any } ?? NSNull()])
    }

    /// G3: a pinch out widens the cells; a pinch in puts them back.
    private func g3() {
        let grid = element(P3375Seen.grid)
        let before = gridCell()
        grid.pinch(withScale: 2.0, velocity: 1.0)
        Thread.sleep(forTimeInterval: 1.5)
        let pinched = gridCell()
        grid.pinch(withScale: 0.5, velocity: -1.0)
        Thread.sleep(forTimeInterval: 1.5)
        let back = gridCell()
        emit(["step": "g3", "before": before.map { $0 as Any } ?? NSNull(), "pinched": pinched.map { $0 as Any } ?? NSNull(), "back": back.map { $0 as Any } ?? NSNull()])
    }

    /// G4: a swipe down shows history and the button back to live, which
    /// returns to the live rows.
    private func g4() {
        let before = terminalReading()
        element(P3375Seen.grid).swipeDown()
        Thread.sleep(forTimeInterval: 2.5)
        let swiped = terminalReading()
        let button = element(P3375Seen.toLive)
        let found = button.exists
        if found { button.tap() }
        Thread.sleep(forTimeInterval: 2)
        emit(["step": "g4", "before": before, "swiped": swiped, "toLiveFound": found, "back": terminalReading()])
    }

    /// G5: a selection, then a tap elsewhere clears it and raises no
    /// keyboard; a second tap there raises it.
    private func g5() {
        guard let picked = pick() else { return }
        let (c, frames) = (picked.candidate, picked.frames)
        guard let outside = frames["outside"], let ref = c["outside"] as? [String: Any], let outCol = intOf(ref, "col") else { return }
        longPress(frames, c)
        _ = element(P3375Seen.copy).waitForExistence(timeout: 5)
        let held = selectionState()
        at(cellCentre(outside, outCol)).tap()
        Thread.sleep(forTimeInterval: 1.5)
        let cleared = selectionState()
        at(cellCentre(outside, outCol)).tap()
        _ = app.keyboards.firstMatch.waitForExistence(timeout: 5)
        passKeyboardIntroduction()
        Thread.sleep(forTimeInterval: 1)
        let again = selectionState()
        emit(["step": "g5", "held": held, "cleared": cleared, "again": again])
        hideKeyboard()
    }

    /// What G5 reads: `screen-copy` drawn (the parent's button, or the edit
    /// menu's Copy), the keyboard, the key bar.
    private func selectionState() -> [String: Any] {
        let found = nodes()
        return [
            "copy": has(found, P3375Seen.copy) || app.menuItems.matching(identifier: P3375Seen.copy).count > 0,
            "menu": app.menuItems.count > 0,
            "keyboard": app.keyboards.firstMatch.exists,
            "keyBar": has(found, P3375Seen.keyBar)
        ]
    }
}
