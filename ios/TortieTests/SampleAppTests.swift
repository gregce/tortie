import Foundation
import XCTest
@testable import Tortie

/// See a sample, as the app holds it (Phase 333.3, build/p3333/SPEC.md D13 to
/// D19, section 7.2): opened and left by `AppModel` alone, never a call to the
/// door from Pairing, never a read of the paired Mac while it is open, the
/// pairing read ONCE on the way back, the sample's own End check for the
/// sample's reader alone, and the Sessions tab's words kept in memory. The
/// door and the paired reader here RECORD every member they are asked, so a
/// call that should not happen is counted, never assumed. The sample itself is
/// the shipping `SampleReader` over the bundled `sample.json`.
///
/// Each test names the clause it holds, and each fails when that clause is
/// taken out of App/TortieApp.swift, Screens/PairingScreen.swift or
/// Screens/SettingsScreen.swift.
@MainActor
final class SampleAppTests: XCTestCase {
    // MARK: The door and the paired reader, recording

    /// Every member of `PhoneDoor` the app asks, in order.
    final class RecordingPhone: PhoneDoor, @unchecked Sendable {
        private let lock = NSLock()
        private var kept: (any DoorReading)?
        private var asked: [String] = []
        /// A pairing the next code completes, and the first list it reads.
        private var pairsWith: (reader: any DoorReading, first: PocketBlockedAnswer)?

        init(kept: (any DoorReading)? = nil) {
            self.kept = kept
        }

        /// The next code pairs with `reader`, as a Mac's Allow does, and the
        /// pairing is then kept, as the Keychain would keep it.
        func pairs(with reader: any DoorReading, first: PocketBlockedAnswer) {
            lock.withLock { pairsWith = (reader, first) }
        }

        /// Keep a pairing, or none, as the Keychain would.
        func keep(_ reader: (any DoorReading)?) {
            lock.withLock { kept = reader }
        }

        var calls: [String] { lock.withLock { asked } }

        func count(_ member: String) -> Int {
            calls.filter { $0 == member }.count
        }

        func pairedReader() -> (any DoorReading)? {
            lock.withLock {
                asked.append("pairedReader")
                return kept
            }
        }

        func begin(payload: String, label: String) throws -> PendingPairing {
            let pairing = lock.withLock {
                asked.append("begin")
                return pairsWith
            }
            guard pairing != nil else { throw PairingFailure.badCode }
            // The scripted door's own pending pairing: keys and an offer that
            // reach nothing.
            return try StandInPhone().begin(payload: payload, label: label)
        }

        func pair(
            _ pending: PendingPairing,
            askForAlerts: @escaping @Sendable () async -> PushAddress?,
            progress: @escaping @Sendable (PairingStep) -> Void
        ) async -> PairResult {
            lock.withLock {
                asked.append("pair")
                guard let pairing = pairsWith else { return .failed(.unreachable) }
                pairsWith = nil
                kept = pairing.reader
                return .paired(pairing.reader, pairing.first)
            }
        }

        func forget() {
            lock.withLock { asked.append("forget") }
        }

        func unpair() -> UnpairOutcome {
            lock.withLock { asked.append("unpair") }
            return .kept
        }
    }

    /// A paired Mac's reader that records EVERY member it is asked, the two
    /// properties and the writer included, and answers no read. Its writer and
    /// each session's Terminal are made when asked and record into the SAME
    /// log, so a write, a key, a page or a read the sample sends to the paired
    /// Mac is counted (the fix round: a reader whose writer answered nil could
    /// never record one, which is how a static hook on the sample's reader,
    /// the seal attack's S5b, passed every test here).
    final class RecordingReader: DoorReading, @unchecked Sendable {
        private let lock = NSLock()
        private var asked: [String] = []
        private let kept: AlertsKept

        init(alerts: AlertsKept = .nothing) {
            kept = alerts
        }

        var calls: [String] { lock.withLock { asked } }

        fileprivate func note(_ member: String) {
            lock.withLock { asked.append(member) }
        }

        var alerts: AlertsKept {
            note("alerts")
            return kept
        }

        var facts: PairedFacts {
            note("facts")
            return Answers.facts(macSends: kept.macSends)
        }

        var writer: (any DoorWriting)? {
            note("writer")
            return RecordingWriter(reader: self)
        }

        func blocked() async throws -> PocketBlockedAnswer {
            note("blocked")
            throw DoorFailure.unreachable(code: -1004)
        }

        func session(_ sessionId: String) async throws -> PocketSessionAnswer {
            note("session")
            throw DoorFailure.unreachable(code: -1004)
        }

        func turns(_ sessionId: String, to: Int?) async throws -> PocketTurnsAnswer {
            note("turns")
            throw DoorFailure.unreachable(code: -1004)
        }

        func sessions(_ query: SessionsQuery) async throws -> PocketSessionsAnswer {
            note("sessions")
            throw DoorFailure.unreachable(code: -1004)
        }

        func screenDoor(_ sessionId: String) -> (any ScreenDoor)? {
            note("screenDoor")
            return RecordingScreen(reader: self)
        }
    }

    /// The paired Mac's writer: every write recorded in its reader's log, and
    /// none taken.
    final class RecordingWriter: DoorWriting, @unchecked Sendable {
        let reader: RecordingReader

        init(reader: RecordingReader) {
            self.reader = reader
        }

        func end(_ sessionId: String, batch: Bool) async -> WriteResult {
            reader.note(batch ? "writer.endBatch" : "writer.end")
            return .notTaken
        }

        func choose(_ sessionId: String, question: String, mark: String, marker: String) async -> WriteResult {
            reader.note("writer.choose")
            return .notTaken
        }

        func say(_ sessionId: String, text: String, write: String?) async -> SentWrite {
            reader.note("writer.say")
            return SentWrite(result: .notTaken, write: nil)
        }
    }

    /// One of the paired Mac's Terminals: every read, key and page recorded
    /// in its reader's log, and none answered.
    final class RecordingScreen: ScreenDoor, @unchecked Sendable {
        let reader: RecordingReader

        init(reader: RecordingReader) {
            self.reader = reader
        }

        var writes: Bool {
            reader.note("screen.writes")
            return true
        }

        func read(since: String?) async throws -> PocketScreenAnswer {
            reader.note("screen.read")
            throw DoorFailure.unreachable(code: -1004)
        }

        func keys(_ keys: [KeyItem], turn: String, dialog: String?) async -> WriteResult {
            reader.note("screen.keys")
            return .notTaken
        }

        func scrollback(from: Int, count: Int, depth: Int, wrap: Int, keep: ScrollbackKeep) async throws -> PocketScrollbackAnswer {
            reader.note("screen.scrollback")
            throw DoorFailure.unreachable(code: -1004)
        }

        func session() async throws -> PocketSessionAnswer {
            reader.note("screen.session")
            throw DoorFailure.unreachable(code: -1004)
        }

        func close() {
            reader.note("screen.close")
        }
    }

    /// The pairing screen's model as a person sees it.
    private struct PairingFace: Equatable {
        let line: String
        let stopped: Bool
        let fingerprint: String?
        let step: PairingStep?
        let busy: Bool
        let scanning: Bool
        let cameraLine: String?

        @MainActor
        init(_ model: PairingModel) {
            line = model.line
            stopped = model.stopped
            fingerprint = model.fingerprint
            step = model.step
            busy = model.busy
            scanning = model.scanning
            cameraLine = model.cameraLine
        }
    }

    private func app(
        _ phone: RecordingPhone,
        alerts: StandInAlerts = StandInAlerts(authorization: .authorized),
        owner: ScriptedOwnerCheck = ScriptedOwnerCheck(),
        words: MemoryWords = MemoryWords()
    ) -> AppModel {
        AppModel(door: phone, label: "iPhone", alerts: alerts, ownerCheck: owner, choices: words)
    }

    /// Everything a person can do in the sample, through the app's OWN reader
    /// and models: the list and the badge, the Sessions tab and a choice on
    /// it, a session, its turns, its Terminal and a keys write on it, a press
    /// on a waiting question, and an End.
    private func drive(_ app: AppModel) async throws {
        let reader = try XCTUnwrap(app.reader)
        XCTAssertTrue(reader is SampleReader, "the app's reader is not the sample's")
        let list = try XCTUnwrap(app.list)
        await list.load()
        guard case .loaded(let drawing) = list.state else { return XCTFail("the sample's list did not load: \(list.state)") }
        XCTAssertFalse(drawing.waiting.isEmpty, "the sample's Needs input tab lists nothing")
        XCTAssertEqual(app.waitingBadge, drawing.waiting.count, "the badge is not the sample's own waiting count (D19)")
        let sessions = try XCTUnwrap(app.sessions)
        await sessions.load()
        await sessions.choose(show: .all)
        XCTAssertEqual(app.root, .sample, "a read in the sample left it")

        let blocked = try await reader.blocked()
        let waiting = try XCTUnwrap(blocked.rows.first, "the sample has no waiting session").sessionId
        let asked = try await reader.session(waiting)
        _ = try await reader.turns(waiting, to: nil)
        var live: String?
        for row in blocked.others where live == nil {
            if try await reader.session(row.sessionId).session.drawsScreen { live = row.sessionId }
        }
        let liveId = try XCTUnwrap(live, "the sample has no live session with a terminal")
        let terminal = try XCTUnwrap(reader.screenDoor(liveId), "the sample's live session has no Terminal")
        let picture = try await terminal.read(since: nil)
        let screen = try XCTUnwrap(picture.screen, "the sample's Terminal drew no picture")
        let typed = await terminal.keys([.text("ls"), .key(.enter)], turn: screen.turn, dialog: screen.dialog)
        XCTAssertTrue(Self.done(typed), "the sample's keys were not taken: \(typed)")
        let depth = try XCTUnwrap(screen.historyDepth, "the sample's Terminal has no history")
        let page = try await terminal.scrollback(from: 0, count: min(depth, 10), depth: depth, wrap: screen.screenColumns, keep: .bottom)
        XCTAssertFalse(page.rows.isEmpty, "the sample's Terminal paged back nothing")
        _ = try await terminal.session()
        terminal.close()
        for show in [SessionsShow.active, .ended, .all] {
            await sessions.choose(show: show)
        }

        let writer = try XCTUnwrap(reader.writer, "the sample's reader writes nothing")
        let offer = asked.session.replyOffer
        let pressed = await writer.choose(
            waiting,
            question: try XCTUnwrap(offer.question),
            mark: try XCTUnwrap(offer.mark),
            marker: try XCTUnwrap(offer.pressable.first)
        )
        XCTAssertTrue(Self.done(pressed), "the sample's question did not take a press: \(pressed)")
        let ended = await writer.end(liveId, batch: false)
        XCTAssertTrue(Self.done(ended), "the sample's End did not end its copy: \(ended)")
        // End these, over every session still live.
        for row in try await reader.blocked().others where row.sessionId != liveId {
            _ = await writer.end(row.sessionId, batch: true)
        }
        let said = await writer.say(waiting, text: "hello", write: nil)
        XCTAssertNil(said.write, "the sample's message carried a write id")
        await list.load()
        XCTAssertEqual(app.root, .sample)
    }

    private static func done(_ result: WriteResult) -> Bool {
        if case .answered(let answer) = result { return answer.outcome == .done }
        return false
    }

    // MARK: From Pairing

    /// Clause (D15, az5): from Pairing, See a sample and Leave sample ask the
    /// door NOTHING (no pairedReader, begin, pair, forget or unpair), nor iOS
    /// about alerts, even across a return to the foreground inside it; and
    /// Pairing comes back exactly as it was, its line and its state.
    func testFromPairingTheSampleAsksTheDoorNothingAndPairingComesBackAsItWas() async throws {
        let phone = RecordingPhone()
        let alerts = StandInAlerts(authorization: .authorized)
        let app = app(phone, alerts: alerts)
        XCTAssertEqual(app.root, .pairing)
        // A pairing that stopped, with the camera on: the line is not the
        // not-paired one, so a sample that touched Pairing would show.
        app.pairing.startScanning()
        await app.pairing.read("not a code")
        let before = PairingFace(app.pairing)
        XCTAssertTrue(before.stopped)
        XCTAssertNotEqual(before.line, Copy.notPaired)
        let asked = phone.calls

        app.openSample()
        XCTAssertEqual(app.root, .sample, "See a sample did not open the sample")
        XCTAssertTrue(app.inSample)
        try await drive(app)
        app.wentAway()
        app.cameToForeground()
        await app.permissionRead?.value
        XCTAssertEqual(app.root, .sample, "a return to the foreground left the sample")
        app.leaveSample()

        XCTAssertEqual(app.root, .pairing)
        XCTAssertFalse(app.inSample)
        XCTAssertNil(app.reader)
        XCTAssertNil(app.list)
        XCTAssertNil(app.sessions)
        XCTAssertEqual(phone.calls, asked, "the sample asked the door something from Pairing")
        XCTAssertEqual(PairingFace(app.pairing), before, "Leave sample did not bring Pairing back as it was")
        XCTAssertEqual(alerts.authorizationAsks + alerts.currentAsks + alerts.pairingAsks, 0, "the sample asked iOS about alerts")
    }

    // MARK: From the paired lists

    /// Clause (D15, D16): from the paired lists, the paired reader is asked
    /// NOTHING from See a sample to Leave sample, whatever is driven inside
    /// it and across a return to the foreground; Leave sample reads the kept
    /// pairing exactly once and lands on Needs input over THAT reader.
    func testFromThePairedListsTheMacIsReadOnlyOnTheWayBack() async throws {
        let paired = RecordingReader(alerts: AlertsKept(macSends: true, presented: nil))
        let phone = RecordingPhone(kept: paired)
        let alerts = StandInAlerts(authorization: .authorized)
        let app = app(phone, alerts: alerts)
        XCTAssertEqual(app.root, .reading)
        XCTAssertEqual(phone.calls, ["pairedReader"], "the launch's read")
        let pairedList = app.list
        app.tab = .settings
        let read = paired.calls

        app.openSample()
        XCTAssertEqual(app.root, .sample)
        XCTAssertTrue(app.reader is SampleReader)
        XCTAssertFalse(app.list === pairedList, "the paired list is still drawn in the sample")
        XCTAssertEqual(app.tab, .needsInput, "the sample does not open on Needs input")
        try await drive(app)
        app.wentAway()
        app.cameToForeground()
        await app.permissionRead?.value
        XCTAssertEqual(paired.calls, read, "the paired Mac was asked something while the sample was open")
        XCTAssertEqual(phone.calls, ["pairedReader"], "the door was asked something while the sample was open")
        XCTAssertEqual(alerts.authorizationAsks + alerts.currentAsks + alerts.pairingAsks, 0, "the sample asked iOS about alerts")

        app.leaveSample()
        XCTAssertEqual(phone.calls, ["pairedReader", "pairedReader"], "Leave sample did not read the pairing exactly once")
        XCTAssertEqual(app.root, .reading)
        XCTAssertTrue((app.reader as? RecordingReader) === paired, "Leave sample landed on another reader")
        XCTAssertNotNil(app.list)
        XCTAssertNotNil(app.sessions)
        XCTAssertEqual(app.tab, .needsInput)
        // The new list asks again whether this phone's alert address is the
        // Mac's, as a pairing does, so its line is not lost to the sample.
        await app.addressCheck?.value
        XCTAssertEqual(alerts.authorizationAsks, 1)
    }

    /// Clause (D16), the fix round: a phone paired IN THIS LAUNCH, through
    /// the pairing screen's own success path (`paired(_:first:)`), asks that
    /// Mac nothing from See a sample to Leave sample, its writer and its
    /// Terminals included; then Leave sample lands on it. The seal attack's
    /// second lens left the paired reader in a static from `paired(_:first:)`
    /// alone, and every test here started from a kept pairing, so none saw it.
    func testFromAFreshPairingTheMacIsNotReadInsideTheSample() async throws {
        let paired = RecordingReader(alerts: AlertsKept(macSends: true, presented: nil))
        let phone = RecordingPhone()
        phone.pairs(with: paired, first: Answers.blocked(others: [Answers.row("o")]))
        let alerts = StandInAlerts(authorization: .authorized)
        let app = app(phone, alerts: alerts)
        XCTAssertEqual(app.root, .pairing)
        await app.pairing.read("code")
        XCTAssertEqual(app.root, .reading, "the pairing did not land on the lists")
        XCTAssertTrue((app.reader as? RecordingReader) === paired, "the pairing landed on another reader")
        await app.addressCheck?.value
        let read = paired.calls
        let asked = phone.calls
        let askedAlerts = alerts.authorizationAsks + alerts.currentAsks + alerts.pairingAsks

        app.tab = .settings
        app.openSample()
        XCTAssertEqual(app.root, .sample)
        try await drive(app)
        app.wentAway()
        app.cameToForeground()
        await app.permissionRead?.value
        XCTAssertEqual(paired.calls, read, "the Mac paired in this launch was asked something while the sample was open")
        XCTAssertEqual(phone.calls, asked, "the door was asked something while the sample was open")
        XCTAssertEqual(alerts.authorizationAsks + alerts.currentAsks + alerts.pairingAsks, askedAlerts, "the sample asked iOS about alerts")

        app.leaveSample()
        XCTAssertEqual(phone.calls, asked + ["pairedReader"], "Leave sample did not read the pairing exactly once")
        XCTAssertEqual(app.root, .reading)
        XCTAssertTrue((app.reader as? RecordingReader) === paired, "Leave sample landed on another reader")
    }

    /// Clause (D15): a pairing that no longer reads back on the way out goes
    /// to Pairing with the not-paired line, as `lostPairing` does.
    func testLeavingToAPairingThatIsGoneGoesToPairing() async throws {
        let phone = RecordingPhone(kept: RecordingReader())
        let app = app(phone)
        await app.pairing.read("not a code")
        XCTAssertTrue(app.pairing.stopped)
        app.openSample()
        XCTAssertEqual(app.root, .sample)
        phone.keep(nil)
        app.leaveSample()
        XCTAssertEqual(phone.count("pairedReader"), 2)
        XCTAssertEqual(app.root, .pairing)
        XCTAssertNil(app.reader)
        XCTAssertEqual(app.pairing.line, Copy.notPaired)
        XCTAssertFalse(app.pairing.stopped)
    }

    /// Clause (D15, az5): Leave sample outside the sample, and a second See a
    /// sample inside it, do nothing; so Leave sample still goes back to where
    /// the FIRST press was.
    func testOpenAndLeaveOnlyFromWhereTheyMeanSomething() {
        let paired = RecordingReader()
        let phone = RecordingPhone(kept: paired)
        let app = app(phone)
        app.leaveSample()
        XCTAssertEqual(app.root, .reading)
        XCTAssertTrue((app.reader as? RecordingReader) === paired)
        XCTAssertEqual(phone.count("pairedReader"), 1, "Leave sample outside the sample read the pairing")
        app.openSample()
        let sample = app.list
        app.openSample()
        XCTAssertTrue(app.list === sample, "a second See a sample made the sample again")
        app.leaveSample()
        XCTAssertEqual(app.root, .reading, "Leave sample did not go back to where See a sample was first pressed")
    }

    /// Clause (D16): See a sample stops every End, reply and key under way,
    /// as a trip to the background does, so nothing paired is sent from
    /// inside the sample; and Leave sample does the same for the sample's.
    func testOpeningAndLeavingStopWhatIsUnderWay() {
        let app = app(RecordingPhone(kept: RecordingReader()))
        let paired = EndRunner(targets: ["a"], batch: false, writer: ScriptedWriter())
        app.register(paired)
        app.openSample()
        XCTAssertTrue(paired.stopRequested, "See a sample left a paired End running")
        let sample = EndRunner(targets: ["b"], batch: false, writer: ScriptedWriter())
        app.register(sample)
        app.leaveSample()
        XCTAssertTrue(sample.stopRequested, "Leave sample left the sample's End running")
    }

    // MARK: Alerts and refusals inside the sample

    /// Clause (D16, az6): a tap on an alert inside the sample leaves it, then
    /// routes as today: Needs input, the session the alert named, the kept
    /// pairing read once by the leaving and not again.
    func testAnAlertTappedInTheSampleLeavesItThenRoutesAsToday() {
        let paired = RecordingReader()
        let phone = RecordingPhone(kept: paired)
        let app = app(phone)
        app.openSample()
        app.tab = .sessions
        app.openFromAlert(.session("s1"))
        XCTAssertEqual(app.root, .reading)
        XCTAssertTrue((app.reader as? RecordingReader) === paired)
        XCTAssertEqual(app.tab, .needsInput)
        XCTAssertEqual(app.waitingPath, [.alerted(id: "s1")])
        XCTAssertEqual(phone.count("pairedReader"), 2)
    }

    /// Clause (D16, az6): from a sample opened on Pairing, the tap leaves to
    /// Pairing and then reads a pairing kept since, as a tap on Pairing does
    /// today.
    func testAnAlertTappedInASampleOpenedFromPairingRoutesAsToday() {
        let phone = RecordingPhone()
        let app = app(phone)
        app.openSample()
        XCTAssertEqual(app.root, .sample)
        app.openFromAlert(.list)
        XCTAssertEqual(app.root, .pairing, "with no pairing kept, Pairing stays")
        XCTAssertEqual(phone.count("pairedReader"), 2, "today's tap reads the kept pairing once")
        app.openSample()
        phone.keep(RecordingReader())
        app.openFromAlert(.list)
        XCTAssertEqual(app.root, .reading)
        XCTAssertEqual(app.waitingPath, [])
    }

    /// Clause (D16, az6): a refusal inside the sample (which it never makes)
    /// leaves the sample, and does not drop the pairing it was opened over.
    func testLostPairingInTheSampleLeavesIt() {
        let paired = RecordingReader()
        let fromReading = app(RecordingPhone(kept: paired))
        fromReading.openSample()
        fromReading.lostPairing()
        XCTAssertEqual(fromReading.root, .reading)
        XCTAssertTrue((fromReading.reader as? RecordingReader) === paired)

        let fromPairing = app(RecordingPhone())
        fromPairing.openSample()
        fromPairing.lostPairing()
        XCTAssertEqual(fromPairing.root, .pairing)
        XCTAssertNil(fromPairing.reader)
    }

    // MARK: End's check

    /// Clause (D11, ac): the sample's End asks `SampleOwnerCheck` over the
    /// app's own check, for the sample's reader ALONE; every other reader's
    /// End, single or batch, asks the app's check itself.
    func testTheEndCheckIsTheSamplesForTheSampleAlone() throws {
        let owner = ScriptedOwnerCheck(kind: .none)
        let app = app(RecordingPhone(kept: RecordingReader()), owner: owner)
        let others: [any DoorReading] = [
            RecordingReader(),
            ScriptedReader(),
            WritingReader(reads: ScriptedReader(), writes: ScriptedWriter())
        ]
        for other in others {
            let check = app.endCheck(for: other)
            XCTAssertFalse(check is SampleOwnerCheck, "\(type(of: other)) was handed the sample's check")
            XCTAssertTrue((check as? ScriptedOwnerCheck) === owner, "\(type(of: other)) was not handed the app's check")
        }
        let paired = try XCTUnwrap(app.endBatchSetup(WritingReader(reads: ScriptedReader(), writes: ScriptedWriter())))
        XCTAssertTrue((paired.ownerCheck as? ScriptedOwnerCheck) === owner)

        app.openSample()
        let sample = try XCTUnwrap(app.reader)
        let check = try XCTUnwrap(app.endCheck(for: sample) as? SampleOwnerCheck, "the sample's End does not ask the sample's check")
        XCTAssertTrue((check.inner as? ScriptedOwnerCheck) === owner, "the sample's check does not ask the app's own")
        XCTAssertEqual(check.kind(), .unasked)
        let batch = try XCTUnwrap(app.endBatchSetup(sample), "the sample offers no End these")
        XCTAssertTrue(batch.ownerCheck is SampleOwnerCheck, "the sample's End these does not ask the sample's check")
    }

    /// Clause (D11): every route RootView makes hands End `endCheck(for:)`,
    /// never the app's check bare, so no session's End can skip the choice.
    func testEveryRouteHandsEndTheReadersCheck() throws {
        let source = try StyleSource.text("ios/Tortie/App/TortieApp.swift")
        let start = try XCTUnwrap(source.range(of: "private func destination(")).lowerBound
        let end = try XCTUnwrap(source.range(of: "\n    }\n}\n", range: start..<source.endIndex)).lowerBound
        let destination = String(source[start..<end])
        XCTAssertEqual(destination.components(separatedBy: "ownerCheck: app.endCheck(for: reader)").count, 4, "a route does not hand End the reader's check")
        XCTAssertFalse(destination.contains("app.ownerCheck"), "a route hands End the app's check bare")
        let batch = try XCTUnwrap(source.range(of: "func endBatchSetup(")).lowerBound
        XCTAssertTrue(String(source[batch...].prefix(300)).contains("endCheck(for: reader)"), "End these does not ask the reader's check")
    }

    // MARK: What the sample keeps

    /// Clause (D17): the sample's Show, Group by and Sort by live in memory,
    /// fresh each time it opens; the phone's own kept words are never saved
    /// from inside it, and the paired tab reads them again on the way back.
    func testTheSamplesWordsAreItsOwnAndFresh() async throws {
        let kept = SessionsWords(show: .ended, group: .none, sort: .oldest)
        let words = MemoryWords(kept)
        let app = app(RecordingPhone(kept: RecordingReader()), words: words)
        XCTAssertEqual(app.sessions?.words, kept)
        app.openSample()
        let sample = try XCTUnwrap(app.sessions)
        XCTAssertEqual(sample.words, .standard, "the sample opened on the phone's own words")
        await sample.choose(show: .all)
        await sample.choose(sort: .name)
        XCTAssertEqual(sample.words.show, .all)
        XCTAssertEqual(words.saves, [], "the sample saved into the phone's kept words")
        app.leaveSample()
        XCTAssertEqual(app.sessions?.words, kept, "the paired tab lost its words to the sample")
        app.openSample()
        XCTAssertEqual(app.sessions?.words, .standard, "the sample kept its words from last time")
        XCTAssertEqual(words.saves, [])
    }

    // MARK: Settings

    /// Clause (D13, D18): Settings inside the sample draws no paired Mac (no
    /// facts) and neither Unpair nor See a sample; on a paired phone it draws
    /// the Mac, Unpair and See a sample; and its See a sample press opens the
    /// sample.
    func testSettingsInsideAndOutsideTheSample() {
        let paired = RecordingReader()
        let app = app(RecordingPhone(kept: paired))
        let settings = SettingsScreen(app: app)
        XCTAssertNotNil(settings.drawing.facts)
        XCTAssertEqual(settings.rows, SettingsRows(root: .reading))
        XCTAssertTrue(settings.rows.unpair)
        XCTAssertTrue(settings.rows.seeSample)
        settings.openSample()
        XCTAssertEqual(app.root, .sample, "Settings' See a sample did not open the sample")
        let read = paired.calls
        XCTAssertNil(settings.drawing.facts, "Settings in the sample draws a Mac")
        XCTAssertFalse(settings.rows.unpair, "Settings in the sample draws Unpair")
        XCTAssertFalse(settings.rows.seeSample, "Settings in the sample draws See a sample")
        XCTAssertNil(settings.drawing.notificationsState)
        XCTAssertEqual(paired.calls, read, "Settings in the sample read the paired Mac's facts")
    }

    // MARK: Pairing's press and the root

    /// Clause (D13): Pairing's See a sample press hands the press to the app
    /// once and does nothing else; the root hands it `openSample`.
    func testPairingsPressOpensTheSample() throws {
        let app = app(RecordingPhone())
        var pressed = 0
        let screen = PairingScreen(model: app.pairing, seeSample: { pressed += 1 })
        screen.pressSeeSample()
        XCTAssertEqual(pressed, 1)
        XCTAssertEqual(app.root, .pairing)
        let source = try StyleSource.text("ios/Tortie/App/TortieApp.swift")
        XCTAssertTrue(source.contains("PairingScreen(model: app.pairing, seeSample: { app.openSample() })"), "the root does not hand Pairing See a sample")
    }

    /// Clause (D13): See a sample is drawn under Scan code at rest and under
    /// the camera's line after it, each only while no pairing is under way;
    /// it is a 44-tall press of `Copy.seeSample` in the accent, identified
    /// `pairing-see-sample`.
    func testPairingDrawsSeeASampleUnderScanCode() throws {
        let source = try StyleSource.text("ios/Tortie/Screens/PairingScreen.swift")
        let bodyStart = try XCTUnwrap(source.range(of: "    var body: some View {")).lowerBound
        let bodyEnd = try XCTUnwrap(source.range(of: "// MARK: Tortie's own site", range: bodyStart..<source.endIndex)).lowerBound
        let body = String(source[bodyStart..<bodyEnd])
        func place(_ needle: String, after: String.Index) throws -> String.Index {
            try XCTUnwrap(body.range(of: needle, range: after..<body.endIndex), "the body does not draw \(needle) where it should").lowerBound
        }
        let point = try place("ID.pairingPoint", after: body.startIndex)
        let firstGuard = try place("if !model.busy {", after: point)
        let firstButton = try place("seeSampleButton", after: firstGuard)
        let rest = try place("} else {", after: firstButton)
        let scan = try place("scanButton", after: rest)
        let secondGuard = try place("if !model.busy {", after: scan)
        _ = try place("seeSampleButton", after: secondGuard)
        XCTAssertEqual(body.components(separatedBy: "seeSampleButton").count, 3, "See a sample is drawn other than twice")
        let button = try XCTUnwrap(source.range(of: "private var seeSampleButton: some View {")).lowerBound
        let drawn = String(source[button...].prefix(600))
        for needle in ["Button(action: pressSeeSample)", "Copy.seeSample", "Tokens.accent", ".frame(height: PairingFrame.pressHeight)", "ID.pairingSeeSample"] {
            XCTAssertTrue(drawn.contains(needle), "See a sample's button does not hold \(needle)")
        }
        XCTAssertEqual(ID.pairingSeeSample, "pairing-see-sample")
    }

    /// Clause (D14, az5): the sample's root draws ONE strip above the three
    /// tabs, the app's only `SampleBar(`, whose Leave sample is the app's.
    func testTheSampleIsTheTabsUnderOneBar() throws {
        let source = try StyleSource.text("ios/Tortie/App/TortieApp.swift")
        XCTAssertEqual(source.components(separatedBy: "SampleBar(").count, 2, "the app draws the Sample bar other than once")
        let sample = try XCTUnwrap(source.range(of: "            case .sample:")).lowerBound
        let branch = String(source[sample...].prefix(700))
        let bar = try XCTUnwrap(branch.range(of: "SampleBar(leave: { app.leaveSample() })")).lowerBound
        let tabs = try XCTUnwrap(branch.range(of: "tabs(list: list, sessions: sessions, reader: reader)")).lowerBound
        XCTAssertLessThan(bar, tabs, "the Sample bar is not above the tabs")
        XCTAssertTrue(branch.contains("VStack(spacing: 0)"))
        XCTAssertEqual(ID.sampleBar, "sample-bar")
        XCTAssertEqual(ID.sampleLabel, "sample-label")
        XCTAssertEqual(ID.sampleLeave, "sample-leave")
        XCTAssertEqual(ID.settingsSeeSample, "settings-see-sample")
    }
}
