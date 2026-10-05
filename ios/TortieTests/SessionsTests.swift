import Foundation
import XCTest
@testable import Tortie

/// The Sessions tab (Phase 316.7, build/p3167/SPEC.md section 6.4.5): an
/// answer refused whole when it is not one main could have composed, the two
/// row lines and the dash, the lazy list's lines, and the model's reads, its
/// fallback to today's tab for a Mac older than the phase, its one read in
/// flight, its hold under End these, and what it keeps for its life. The door
/// is a script (SessionsFixtures.swift); nothing here reaches a network. Each
/// test names the clause it holds, and each fails when that clause is taken
/// out of Screens/SessionsScreen.swift, Screens/ListScreen.swift or
/// Door/Contract.swift.
@MainActor
final class SessionsTests: XCTestCase {
    private func refusal(_ answer: PocketSessionsAnswer, _ query: SessionsQuery = .standard) -> SessionsDrawing.Refusal? {
        do {
            _ = try SessionsDrawing(answer, asked: query, clock: { _ in "4:32 PM" })
            return nil
        } catch let refusal as SessionsDrawing.Refusal {
            return refusal
        } catch {
            return nil
        }
    }

    // MARK: - The answer, refused whole

    /// Control: the honest answer draws, under Project and under None.
    func testAnHonestAnswerDraws() throws {
        let drawing = try SessionsDrawing(SessionsAnswers.honest(), asked: .standard, clock: { _ in "4:32 PM" })
        XCTAssertEqual(drawing.groups.map(\.id), ["g0", "g1"])
        XCTAssertEqual(drawing.groups.map { $0.rows.map(\.id) }, [["w", "a"], ["r"]])
        XCTAssertEqual(drawing.groups.map(\.count), ["2", "1"])
        XCTAssertEqual(drawing.groups.map(\.waiting), [true, false])
        XCTAssertEqual(drawing.groups[1].machine, "Mac Pro")
        XCTAssertEqual(drawing.rows, [], "under Project the rows are drawn under their projects")
        XCTAssertNil(drawing.empty)
        XCTAssertNil(drawing.leftOut)
        XCTAssertEqual(drawing.readLine, Copy.readAt("4:32 PM"))
        XCTAssertEqual(drawing.agents.map(\.label), ["Claude Code", "Codex CLI"])
        XCTAssertEqual(drawing.machines.map(\.label), [Copy.thisMac, "Mac Pro"], "the machine `local` is This Mac")

        var none = SessionsQuery.standard
        none.group = .none
        let flat = try SessionsDrawing(SessionsAnswers.honest(none), asked: none)
        XCTAssertEqual(flat.rows.map(\.id), ["w", "a", "r"])
        XCTAssertEqual(flat.groups, [])
    }

    /// Clause: an answer to another question is not this one's.
    func testAnAnswerToAnotherQuestionIsRefused() {
        var other = SessionsQuery.standard
        other.sort = .name
        XCTAssertEqual(refusal(SessionsAnswers.honest(other), .standard), .askedAnother)
        var agent = SessionsQuery.standard
        agent.agent = "claude"
        XCTAssertEqual(refusal(SessionsAnswers.honest(.standard), agent), .askedAnother)
    }

    /// Clause: one session listed twice is refused whole.
    func testARowTwiceIsRefused() {
        let answer = SessionsAnswers.answer(
            rows: [SessionsAnswers.row("a"), SessionsAnswers.row("a")],
            groups: [SessionsAnswers.group("g0", count: 2)]
        )
        XCTAssertEqual(refusal(answer), .rowTwice)
    }

    /// Clause: a row's group outside `groups` is refused, never a trap.
    func testAGroupOutOfRangeIsRefused() {
        for index in [1, Int.max] {
            let answer = SessionsAnswers.answer(
                rows: [SessionsAnswers.row("a"), SessionsAnswers.row("b", group: index)],
                groups: [SessionsAnswers.group("g0", count: 2)]
            )
            XCTAssertEqual(refusal(answer), .groupOutOfRange, "\(index)")
        }
    }

    /// Clause: a group no row names is refused.
    func testAGroupNoRowNamesIsRefused() {
        let answer = SessionsAnswers.answer(
            rows: [SessionsAnswers.row("a")],
            groups: [SessionsAnswers.group("g0", count: 1), SessionsAnswers.group("g1", count: 0)]
        )
        XCTAssertEqual(refusal(answer), .groupNamedByNoRow)
    }

    /// Clause: the groups come in the order their first row is emitted.
    func testGroupsOutOfOrderAreRefused() {
        let answer = SessionsAnswers.answer(
            rows: [SessionsAnswers.row("a", group: 1), SessionsAnswers.row("b", group: 0)],
            groups: [SessionsAnswers.group("g0", count: 1), SessionsAnswers.group("g1", count: 1)]
        )
        XCTAssertEqual(refusal(answer), .groupOutOfOrder)
    }

    /// Clause: two groups with one id is refused.
    func testTwoGroupsWithOneIdAreRefused() {
        let answer = SessionsAnswers.answer(
            rows: [SessionsAnswers.row("a"), SessionsAnswers.row("b", group: 1)],
            groups: [SessionsAnswers.group("g0", count: 1), SessionsAnswers.group("g0", count: 1)]
        )
        XCTAssertEqual(refusal(answer), .groupTwice)
    }

    /// Clause: under Project a group's rows are together; under None they
    /// need not be.
    func testASplitGroupIsRefusedUnderProject() {
        let rows = [SessionsAnswers.row("a"), SessionsAnswers.row("b", group: 1), SessionsAnswers.row("c")]
        let groups = [SessionsAnswers.group("g0", count: 2), SessionsAnswers.group("g1", count: 1)]
        XCTAssertEqual(refusal(SessionsAnswers.answer(rows: rows, groups: groups)), .groupSplit)
        var none = SessionsQuery.standard
        none.group = .none
        XCTAssertNil(refusal(SessionsAnswers.answer(none, rows: rows, groups: groups), none))
    }

    /// Clause (F4): a header's count is its rows drawn plus its own omitted.
    func testACountThatIsNotRowsPlusOmittedIsRefused() {
        let rows = [SessionsAnswers.row("a"), SessionsAnswers.row("b")]
        XCTAssertEqual(refusal(SessionsAnswers.answer(rows: rows, groups: [SessionsAnswers.group("g0", count: 3)])), .countNotRowsPlusOmitted)
        XCTAssertEqual(refusal(SessionsAnswers.answer(rows: rows, groups: [SessionsAnswers.group("g0", count: 1)])), .countNotRowsPlusOmitted)
        XCTAssertNil(refusal(SessionsAnswers.answer(rows: rows, groups: [SessionsAnswers.group("g0", count: 3, omitted: 1)], omitted: 1)))
    }

    /// Clause (F4): the groups' omitted counts never sum to more than the
    /// answer's.
    func testOmittedThatSumAboveTheAnswerAreRefused() {
        let answer = SessionsAnswers.answer(
            rows: [SessionsAnswers.row("a")],
            groups: [SessionsAnswers.group("g0", count: 3, omitted: 2)],
            total: 9,
            omitted: 1
        )
        XCTAssertEqual(refusal(answer), .omittedAboveTheAnswer)
    }

    /// Clause (the integrator's ruling, build/p3167/SPEC.md "§As built"): a
    /// project whose every row the caps left out is named by no row, so it
    /// is in no group and the groups' omitted sum to LESS than the answer's.
    /// That answer is main's own past 2,000 rows and draws, its left-out
    /// line saying the whole number.
    func testAProjectWhollyLeftOutStillDraws() throws {
        let answer = SessionsAnswers.answer(
            rows: [SessionsAnswers.row("a"), SessionsAnswers.row("b")],
            groups: [SessionsAnswers.group("g0", count: 3, omitted: 1)],
            total: 9,
            omitted: 4
        )
        XCTAssertNil(refusal(answer))
        let drawing = try SessionsDrawing(answer, asked: .standard, clock: { _ in "4:32 PM" })
        XCTAssertEqual(drawing.leftOut, Copy.othersOmitted(4))
        XCTAssertEqual(drawing.groups.map(\.leftOut), [Copy.othersOmitted(1)])
    }

    /// Clause (F3): a group whose dot is off over a row that waits.
    func testAGroupSilentOverAWaitingRowIsRefused() {
        let answer = SessionsAnswers.answer(
            rows: [SessionsAnswers.waitingRow("w")],
            groups: [SessionsAnswers.group("g0", count: 1, waiting: false)]
        )
        XCTAssertEqual(refusal(answer), .waitingNotSaid)
        // A group may say a session waits that the caps left out.
        let cut = SessionsAnswers.answer(
            rows: [SessionsAnswers.row("a")],
            groups: [SessionsAnswers.group("g0", count: 2, omitted: 1, waiting: true)],
            omitted: 1
        )
        XCTAssertNil(refusal(cut))
    }

    /// Clause (rule k): an omitted or total no checked sum can hold is refused
    /// whole, never a trap.
    func testNumbersNoDoorCouldSendAreRefused() {
        let rows = [SessionsAnswers.row("a")]
        for omitted in [Int.max, -1, Int.min] {
            let answer = SessionsAnswers.answer(rows: rows, groups: [SessionsAnswers.group("g0", count: 1, omitted: omitted)], total: 1, omitted: omitted)
            XCTAssertEqual(refusal(answer), .beyondTheBound, "\(omitted)")
        }
        let total = SessionsAnswers.answer(rows: rows, groups: [SessionsAnswers.group("g0", count: 1)], total: -1)
        XCTAssertEqual(refusal(total), .beyondTheBound)
    }

    /// Clause: `total` is every listed session, so it is never below the rows
    /// plus the omitted.
    func testATotalBelowTheRowsIsRefused() {
        let answer = SessionsAnswers.answer(
            rows: [SessionsAnswers.row("a"), SessionsAnswers.row("b")],
            groups: [SessionsAnswers.group("g0", count: 2)],
            total: 1
        )
        XCTAssertEqual(refusal(answer), .totalTooSmall)
    }

    /// Clause: a menu choice needs a label, but for the machine `local`, and
    /// no two share an id.
    func testAChoiceWithNoLabelIsRefused() {
        let base = SessionsAnswers.honest()
        func with(agents: [PocketSessionsChoice], machines: [PocketSessionsChoice]) -> PocketSessionsAnswer {
            PocketSessionsAnswer(
                asked: base.asked, rows: base.rows, groups: base.groups, agents: agents, machines: machines,
                totalSessions: base.totalSessions, omittedRows: base.omittedRows, at: base.at, ageNote: base.ageNote
            )
        }
        XCTAssertEqual(refusal(with(agents: [PocketSessionsChoice(id: "claude", label: nil)], machines: [])), .choiceUnreadable)
        XCTAssertEqual(refusal(with(agents: [], machines: [PocketSessionsChoice(id: "studio", label: nil)])), .choiceUnreadable)
        XCTAssertEqual(
            refusal(with(agents: [PocketSessionsChoice(id: "a", label: "A"), PocketSessionsChoice(id: "a", label: "B")], machines: [])),
            .choiceUnreadable
        )
        XCTAssertNil(refusal(with(agents: [], machines: [PocketSessionsChoice(id: "local", label: nil)])))
    }

    /// Clause: a refused answer is ONE sentence in place of the tab.
    func testARefusedAnswerIsOneSentence() {
        let answer = SessionsAnswers.answer(rows: [SessionsAnswers.row("a"), SessionsAnswers.row("a")], groups: [SessionsAnswers.group("g0", count: 2)])
        XCTAssertEqual(SessionsModel.drawn(answer, asked: .standard), .failed(Copy.answerUnreadable))
    }

    // MARK: - The decoder

    /// The honest answer as the door writes it: every field the contract
    /// always sends, nulls included.
    private func honestJSON() -> [String: Any] {
        [
            "asked": ["show": "active", "group": "project", "sort": "recent", "agent": NSNull(), "machine": NSNull()],
            "rows": [
                [
                    "sessionId": "w", "name": "w", "group": 0, "machine": NSNull(), "statusDot": "attention",
                    "statusTitle": "Needs input", "ageText": "3m", "waiting": true, "question": "Proceed?",
                    "end": ["state": "offered", "batch": true]
                ],
                [
                    "sessionId": "r", "name": "r", "group": 1, "machine": "Mac Pro", "statusDot": "working",
                    "statusTitle": "Working", "ageText": NSNull(), "waiting": false, "question": NSNull(),
                    "end": ["state": "none"]
                ]
            ],
            "groups": [
                ["id": "g0", "label": "webapp", "machine": NSNull(), "folder": NSNull(), "count": 1, "omitted": 0, "waiting": true, "collapsed": false],
                ["id": "g1", "label": "monorepo", "machine": "Mac Pro", "folder": NSNull(), "count": 1, "omitted": 0, "waiting": false, "collapsed": false]
            ],
            "agents": [["id": "claude", "label": "Claude Code"]],
            "machines": [["id": "local", "label": NSNull()], ["id": "studio-pro", "label": "Mac Pro"]],
            "total": 9, "omitted": 0, "at": 1_758_600_000_000.0,
            "ageNote": "Waits first seen after your Mac wakes or Tortie restarts are timed from then."
        ]
    }

    private func decoded(_ object: [String: Any]) -> PocketSessionsAnswer? {
        guard let data = try? JSONSerialization.data(withJSONObject: object) else { return nil }
        return try? JSONDecoder().decode(PocketSessionsAnswer.self, from: data)
    }

    /// Clause: the contract's words, numbers and fields. The honest answer
    /// reads into the phone's names and writes back under the contract's
    /// keys; an unknown word, a missing field, a number outside the bound and
    /// a missing End offer each refuse the whole answer.
    func testTheDecoderIsStrict() throws {
        let honest = honestJSON()
        let answer = try XCTUnwrap(decoded(honest))
        XCTAssertEqual(answer.rows.map(\.groupIndex), [0, 1])
        XCTAssertEqual(answer.groups.map(\.sessionCount), [1, 1])
        XCTAssertEqual(answer.totalSessions, 9)
        XCTAssertEqual(answer.rows[1].end, .none)
        XCTAssertNil(answer.rows[1].ageText)
        XCTAssertNil(answer.machines[0].label)
        XCTAssertEqual(answer.asked, SessionsAnswers.asked(.standard))
        let again = try XCTUnwrap(try JSONSerialization.jsonObject(with: try JSONEncoder().encode(answer)) as? [String: Any])
        XCTAssertEqual(Set(again.keys), ["asked", "rows", "groups", "agents", "machines", "total", "omitted", "at", "ageNote"])
        XCTAssertEqual((again["groups"] as? [[String: Any]])?.first?["count"] as? Int, 1)
        XCTAssertEqual((again["rows"] as? [[String: Any]])?.last?["group"] as? Int, 1)

        func changed(_ edit: (inout [String: Any]) -> Void) -> [String: Any] {
            var copy = honest
            edit(&copy)
            return copy
        }
        func row(_ edit: @escaping (inout [String: Any]) -> Void) -> [String: Any] {
            changed { object in
                var rows = object["rows"] as? [[String: Any]] ?? []
                edit(&rows[1])
                object["rows"] = rows
            }
        }
        func group(_ edit: @escaping (inout [String: Any]) -> Void) -> [String: Any] {
            changed { object in
                var groups = object["groups"] as? [[String: Any]] ?? []
                edit(&groups[0])
                object["groups"] = groups
            }
        }
        XCTAssertNil(decoded(changed { $0["asked"] = ["show": "Active", "group": "project", "sort": "recent", "agent": NSNull(), "machine": NSNull()] }))
        XCTAssertNil(decoded(changed { $0["asked"] = ["show": "active", "group": "flat", "sort": "recent", "agent": NSNull(), "machine": NSNull()] }))
        XCTAssertNil(decoded(changed { $0["asked"] = ["show": "active", "group": "project", "sort": "recent", "agent": NSNull()] }))
        XCTAssertNil(decoded(changed { $0.removeValue(forKey: "total") }))
        XCTAssertNil(decoded(changed { $0["omitted"] = -1 }))
        XCTAssertNil(decoded(row { $0.removeValue(forKey: "end") }), "End is required on a sessions row")
        XCTAssertNil(decoded(row { $0.removeValue(forKey: "ageText") }), "null is sent, never left out")
        XCTAssertNil(decoded(row { $0["group"] = -1 }))
        XCTAssertNil(decoded(row { $0["waiting"] = "no" }))
        XCTAssertNil(decoded(group { $0["count"] = 9_007_199_254_740_992 }))
        XCTAssertNil(decoded(group { $0.removeValue(forKey: "waiting") }))
        XCTAssertNil(decoded(group { $0.removeValue(forKey: "folder") }))
        XCTAssertNotNil(decoded(changed { $0["futureField"] = [1, 2] }), "a newer Mac may add a field")
    }

    // MARK: - The rows

    /// Clause: under Project the header draws the machine and the project, so
    /// a row draws no badge and its line is its question when it waits, else
    /// main's title; under None the line is 316.6's with the project's label;
    /// a row with no clock draws the dash.
    func testTheTwoRowLinesAndTheDash() throws {
        let grouped = try SessionsDrawing(SessionsAnswers.honest(), asked: .standard)
        let w = grouped.groups[0].rows[0]
        XCTAssertEqual(w.line, "Proceed?")
        XCTAssertTrue(w.waiting)
        let r = grouped.groups[1].rows[0]
        XCTAssertEqual(r.line, "Working")
        XCTAssertEqual(r.machine, "Mac Pro", "the confirmation's remote tail reads the row's machine")
        XCTAssertFalse(r.drawsMachine)
        XCTAssertEqual(r.age, Copy.dash)

        var none = SessionsQuery.standard
        none.group = .none
        let flat = try SessionsDrawing(SessionsAnswers.honest(none), asked: none)
        XCTAssertEqual(flat.rows.map(\.line), [
            Copy.joined(["webapp", "Proceed?"]),
            Copy.joined(["Working", "webapp"]),
            Copy.joined(["Working", "monorepo"])
        ])
        XCTAssertTrue(flat.rows[2].drawsMachine)
        XCTAssertEqual(flat.rows.map(\.age), ["3m", "2m", Copy.dash])
        XCTAssertEqual(flat.rows[0].end, .offered(batch: true))

        // A waiting row with no question reads as any other row.
        let quiet = SessionsAnswers.answer(rows: [SessionsAnswers.waitingRow("q", question: nil)], groups: [SessionsAnswers.group("g0", count: 1, waiting: true)])
        XCTAssertEqual(try SessionsDrawing(quiet, asked: .standard).groups[0].rows[0].line, "Needs input")
    }

    /// Clause: the lazy list's lines: a closed project's rows and left-out line
    /// are not drawn, its header is, and only the final line of the list, when
    /// it is a row, draws no hairline.
    func testTheLinesFollowWhatIsOpen() throws {
        let answer = SessionsAnswers.answer(
            rows: [SessionsAnswers.row("a"), SessionsAnswers.row("b", group: 1)],
            groups: [SessionsAnswers.group("g0", count: 3, omitted: 2), SessionsAnswers.group("g1", count: 1, collapsed: true)],
            omitted: 2
        )
        let drawing = try SessionsDrawing(answer, asked: .standard)
        XCTAssertEqual(drawing.leftOut, Copy.othersOmitted(2))
        XCTAssertEqual(drawing.groups[0].leftOut, Copy.othersOmitted(2))
        XCTAssertEqual(drawing.lines(opened: [:]).map(\.id), ["group-g0", "row-a", "left-out-g0", "group-g1"])
        let opened = drawing.lines(opened: ["g1": true])
        XCTAssertEqual(opened.map(\.id), ["group-g0", "row-a", "left-out-g0", "group-g1", "row-b"])
        XCTAssertEqual(opened.last, .row(drawing.groups[1].rows[0], last: true))
        XCTAssertEqual(drawing.lines(opened: ["g0": false]).map(\.id), ["group-g0", "group-g1"])
        guard case .row(_, let last) = opened[1] else { return XCTFail("\(opened[1])") }
        XCTAssertFalse(last, "a row with lines after it keeps its hairline")
    }

    /// Clause (D12): the sheet's empty faces.
    func testTheEmptyFaces() throws {
        let nothing = SessionsAnswers.answer(rows: [], groups: [], total: 0)
        XCTAssertEqual(try SessionsDrawing(nothing, asked: .standard).empty, .noSessions)
        let noMatch = SessionsAnswers.answer(rows: [], groups: [], total: 40)
        XCTAssertEqual(try SessionsDrawing(noMatch, asked: .standard).empty, .noMatch)
    }

    // MARK: - The model

    private func makeModel(_ reader: SessionsReader, words: MemoryWords = MemoryWords(), routing: ReadRouting = .stay) -> SessionsModel {
        SessionsModel(door: reader, list: ListModel(door: reader, routing: routing), store: words)
    }

    private func drawnIds(_ model: SessionsModel) -> [String] {
        guard case .loaded(let drawing) = model.state else { return [] }
        return drawing.groups.flatMap { $0.rows.map(\.id) } + drawing.rows.map(\.id)
    }

    /// Clause (D16): appear, pull, the foreground and Done read both; a choice
    /// reads `/v1/sessions` alone, with the words chosen.
    func testAPullReadsBothAndAChoiceReadsSessionsAlone() async {
        let reader = SessionsReader(blocked: [.success(Answers.blocked()), .success(Answers.blocked())])
        let model = makeModel(reader)
        await model.load()
        var blockedCalls = await reader.blockedCalls
        var asked = await reader.asked
        XCTAssertEqual(blockedCalls, 1)
        XCTAssertEqual(asked, [.standard])
        XCTAssertEqual(drawnIds(model), ["w", "a", "r"])
        await model.choose(sort: .name)
        blockedCalls = await reader.blockedCalls
        asked = await reader.asked
        XCTAssertEqual(blockedCalls, 1, "a choice read the list")
        XCTAssertEqual(asked.last?.sort, .name)
        guard case .loaded(let drawing) = model.state else { return XCTFail("\(model.state)") }
        XCTAssertEqual(drawing.asked.sort, .name)
    }

    /// Clause: the drawing on screen stays until the newest answer lands.
    func testTheOldDrawingStaysUntilTheNewestLands() async {
        let reader = SessionsReader(blocked: [.success(Answers.blocked())])
        let model = makeModel(reader)
        await model.load()
        let before = model.state
        await reader.hold(sessions: true, blocked: false)
        let choice = Task { await model.choose(show: .all) }
        let started = await eventually { await reader.askedCount == 2 }
        XCTAssertTrue(started)
        XCTAssertEqual(model.state, before, "a read in flight replaced the drawing")
        XCTAssertEqual(model.words.show, .all, "the chosen word is drawn at once")
        await reader.release()
        await choice.value
        guard case .loaded(let drawing) = model.state else { return XCTFail("\(model.state)") }
        XCTAssertEqual(drawing.asked.show, .all)
    }

    /// Clause (D16, F7): the read a newer one replaces is cancelled before the
    /// newer starts, so five choices in a row never hold two `/v1/sessions`
    /// reads at once, and only the newest draws.
    func testFiveChoicesHoldOneReadAtATime() async {
        let reader = SessionsReader()
        let model = makeModel(reader)
        await reader.hold(sessions: true, blocked: false)
        var tasks: [Task<Void, Never>] = []
        let words: [SessionsShow] = [.all, .ended, .all, .ended, .all]
        for (k, word) in words.enumerated() {
            tasks.append(Task { await model.choose(show: word) })
            let reached = await eventually { await reader.askedCount == k + 1 }
            XCTAssertTrue(reached, "choice \(k) never reached the door")
        }
        XCTAssertEqual(reader.flight.most, 1, "two /v1/sessions reads were in flight at once")
        XCTAssertEqual(reader.flight.now, 1)
        await reader.release()
        for task in tasks { await task.value }
        guard case .loaded(let drawing) = model.state else { return XCTFail("\(model.state)") }
        XCTAssertEqual(drawing.asked.show, .all)
        XCTAssertEqual(model.words.show, .all)
    }

    /// Clause: only the newest read draws. A read that was replaced, and whose
    /// answer comes back anyway after the newer one landed, draws nothing.
    func testAReadThatWasReplacedDrawsNothing() async {
        let reader = SessionsReader()
        await reader.answerAfterCancel()
        await reader.hold(sessions: true, blocked: false)
        let model = makeModel(reader)
        let older = Task { await model.choose(sort: .name) }
        let first = await eventually { await reader.askedCount == 1 }
        XCTAssertTrue(first)
        let newer = Task { await model.choose(sort: .oldest) }
        let second = await eventually { await reader.askedCount == 2 }
        XCTAssertTrue(second)
        await reader.release(read: 1)
        await newer.value
        guard case .loaded(let landed) = model.state else { return XCTFail("\(model.state)") }
        XCTAssertEqual(landed.asked.sort, .oldest)
        await reader.release(read: 0)
        await older.value
        guard case .loaded(let after) = model.state else { return XCTFail("\(model.state)") }
        XCTAssertEqual(after.asked.sort, .oldest, "a replaced read drew over the newest")
    }

    /// Clause (D9): a Mac older than the phase is today's tab, and only after
    /// the list's own read has answered.
    func testAnOlderMacFallsBackOnlyAfterTheListAnswered() async {
        let reader = SessionsReader(blocked: [.success(Answers.blocked(others: [Answers.row("o")]))]) { _ in .failure(.refused) }
        let model = makeModel(reader)
        await reader.hold(sessions: false, blocked: true)
        let pull = Task { await model.load() }
        let reached = await eventually { await reader.askedCount == 1 }
        XCTAssertTrue(reached)
        // The sessions read was refused, and the list's read has not answered.
        try? await Task.sleep(nanoseconds: 50_000_000)
        XCTAssertEqual(model.state, .loading, "fell back before the list answered")
        await reader.release()
        await pull.value
        XCTAssertEqual(model.state, .olderMac)
        XCTAssertEqual(model.batchRows.map(\.id), ["o"], "the older face's rows are the list's")
    }

    /// Clause (F19): when the list's read draws a sentence, the tab draws the
    /// same sentence; when it is refused, the list goes to Pairing by its own
    /// routing and this model routes nowhere.
    func testTheListsSentenceAndNoRouteOfItsOwn() async {
        let failing = SessionsReader(blocked: [.failure(.timedOut)]) { _ in .failure(.refused) }
        let sentenced = makeModel(failing)
        await sentenced.load()
        XCTAssertEqual(sentenced.state, .failed(Copy.macDidNotAnswer))

        let routed = Routed()
        let routing = ReadRouting(backToList: {}, pairAgain: { routed.pairAgain += 1 })
        let refused = SessionsReader(blocked: [.failure(.refused)]) { _ in .failure(.refused) }
        let lost = makeModel(refused, routing: routing)
        await lost.load()
        XCTAssertEqual(routed.pairAgain, 1, "the list's refusal is the one route to Pairing")
        XCTAssertEqual(lost.state, .loading)

        // Any other failure is the list's own sentence for it, from this read.
        let unreachable = SessionsReader(blocked: [.success(Answers.blocked())]) { _ in .failure(.timedOut) }
        let far = makeModel(unreachable)
        await far.load()
        XCTAssertEqual(far.state, .failed(Copy.macDidNotAnswer))
    }

    /// Clause (F6): the older face is not sticky: the first answer a pull
    /// through it gets brings the new tab back, with no relaunch.
    func testTheOlderFaceLeavesOnTheFirstAnswer() async {
        let reader = SessionsReader(blocked: [.success(Answers.blocked()), .success(Answers.blocked())]) { _ in .failure(.refused) }
        let model = makeModel(reader)
        await model.load()
        XCTAssertEqual(model.state, .olderMac)
        await reader.answer { .success(SessionsAnswers.honest($0)) }
        await model.load()
        XCTAssertEqual(drawnIds(model), ["w", "a", "r"])
    }

    /// Clause (F5): while End these holds, a pull reads the list alone and
    /// starts no `/v1/sessions` read, so nothing drawn changes; Done's read,
    /// after the hold is let go, reads both.
    func testTheHoldStartsNoSessionsRead() async {
        let reader = SessionsReader(blocked: [.success(Answers.blocked()), .success(Answers.blocked()), .success(Answers.blocked())])
        let model = makeModel(reader)
        await model.load()
        let before = model.state
        model.batchHeld = true
        await reader.answer { _ in .success(SessionsAnswers.answer(rows: [], groups: [], total: 0)) }
        await model.load()
        var asked = await reader.askedCount
        var blockedCalls = await reader.blockedCalls
        XCTAssertEqual(asked, 1, "a held pull read /v1/sessions")
        XCTAssertEqual(blockedCalls, 2, "a held pull did not refresh the badge")
        XCTAssertEqual(model.state, before)
        model.batchHeld = false
        await model.load()
        asked = await reader.askedCount
        blockedCalls = await reader.blockedCalls
        XCTAssertEqual(asked, 2)
        XCTAssertEqual(blockedCalls, 3)
    }

    /// Clause (F5, the fix round of 2026-10-03): a `/v1/sessions` read
    /// already in flight when End these takes the list draws nothing when it
    /// lands, an answer or a refusal; Done's read, after the hold, draws.
    func testAReadInFlightWhenTheHoldStartsDrawsNothing() async {
        let reader = SessionsReader(blocked: Array(repeating: .success(Answers.blocked()), count: 4))
        let model = makeModel(reader)
        await model.load()
        let before = model.state
        guard case .loaded = before else { return XCTFail("\(before)") }
        // An answer that lands under the hold.
        await reader.answer { _ in .success(SessionsAnswers.answer(rows: [], groups: [], total: 0)) }
        await reader.hold(sessions: true, blocked: false)
        let pull = Task { await model.load() }
        var started = await eventually { await reader.askedCount == 2 }
        XCTAssertTrue(started)
        model.batchHeld = true
        await reader.release()
        await pull.value
        XCTAssertEqual(model.state, before, "an answer in flight when End these took the list replaced the drawing")
        // A refusal that lands under the hold: no older face, no sentence.
        model.batchHeld = false
        await reader.answer { _ in .failure(.refused) }
        await reader.hold(sessions: true, blocked: false)
        let second = Task { await model.load() }
        started = await eventually { await reader.askedCount == 3 }
        XCTAssertTrue(started)
        model.batchHeld = true
        await reader.release()
        await second.value
        XCTAssertEqual(model.state, before, "a refusal in flight when End these took the list replaced the drawing")
        // Done lets go of the hold and reads again, and that read draws.
        model.batchHeld = false
        await reader.answer { _ in .success(SessionsAnswers.answer(rows: [], groups: [], total: 0)) }
        await model.load()
        guard case .loaded(let drawing) = model.state else { return XCTFail("\(model.state)") }
        XCTAssertEqual(drawing.empty, .noSessions, "Done's read did not draw")
    }

    /// Clause (D13): the filters and every project opened or closed last for
    /// the model's life, across reads, and are never kept; the three words
    /// are kept on every change; Clear filters is the Mac's.
    func testFiltersAndOpenedProjectsLastForTheModelsLife() async throws {
        let reader = SessionsReader(blocked: [.success(Answers.blocked()), .success(Answers.blocked())])
        let words = MemoryWords()
        let model = makeModel(reader, words: words)
        await model.load()
        guard case .loaded(let drawing) = model.state else { return XCTFail("\(model.state)") }
        model.toggle(drawing.groups[0])
        XCTAssertFalse(model.isOpen(drawing.groups[0]))
        XCTAssertEqual(model.batchRows.map(\.id), ["r"], "End these selects over a closed project's rows")
        await model.choose(agent: "codex")
        await model.choose(machine: "local")
        XCTAssertTrue(model.filtered)
        await model.load()
        XCTAssertEqual(model.agent, "codex")
        XCTAssertEqual(model.machine, "local")
        XCTAssertFalse(model.isOpen(drawing.groups[0]), "a project he closed opened on a read")
        let asked = await reader.asked
        XCTAssertEqual(asked.last?.agent, "codex")
        XCTAssertEqual(asked.last?.machine, "local")
        XCTAssertEqual(words.saves, [], "a filter or a project was kept")

        await model.choose(group: .none)
        await model.clearFilters()
        XCTAssertEqual(model.words, SessionsWords(show: .all, group: .none, sort: .recent))
        XCTAssertNil(model.agent)
        XCTAssertNil(model.machine)
        XCTAssertEqual(words.saves.last, model.words)
    }

    /// Clause: the three words are read from where they are kept when the
    /// model is made, and they are the first read's question.
    func testTheKeptWordsAskTheFirstRead() async {
        let reader = SessionsReader(blocked: [.success(Answers.blocked())])
        let model = makeModel(reader, words: MemoryWords(SessionsWords(show: .ended, group: .none, sort: .oldest)))
        await model.load()
        let asked = await reader.asked
        XCTAssertEqual(asked, [SessionsQuery(show: .ended, group: .none, sort: .oldest, agent: nil, machine: nil)])
    }

    /// Clause (6.4.7): End these selects over the rows drawn: a closed
    /// project's are not, under None every row is, and with no drawing none.
    func testEndTheseRowsAreTheRowsDrawn() async {
        let reader = SessionsReader(blocked: [.success(Answers.blocked())])
        let model = makeModel(reader)
        XCTAssertEqual(model.batchRows, [])
        await model.load()
        XCTAssertEqual(model.batchRows.map(\.id), ["w", "a", "r"])
        await model.choose(group: .none)
        XCTAssertEqual(model.batchRows.map(\.id), ["w", "a", "r"])
        let closed = SessionsReader(blocked: [.success(Answers.blocked())]) { query in
            .success(SessionsAnswers.answer(
                query,
                rows: [SessionsAnswers.row("e", title: "Saved", dot: "ended", end: .none)],
                groups: [SessionsAnswers.group("g0", count: 1, collapsed: true)]
            ))
        }
        let all = makeModel(closed)
        await all.load()
        XCTAssertEqual(all.batchRows, [], "a project main closed is selected over")
    }

    /// Clause (6.4.8): the list is an `EndBatchList` too, and its rows are
    /// today's, waiting first.
    func testTheListsRowsAreTodaysRows() async {
        let list = ListModel(door: ScriptedReader(blocked: [.success(Answers.blocked(rows: [Answers.row("w", dot: "attention")], others: [Answers.row("o")]))]), routing: .stay)
        XCTAssertEqual(list.batchRows, [])
        await list.load()
        XCTAssertEqual(list.batchRows.map(\.id), ["w", "o"])
    }

    /// Clause (6.4.3): a reader with no sessions read is a Mac older than the
    /// phase: its read is refused, as the door refuses an unknown route.
    func testAReaderWithNoSessionsReadIsRefused() async {
        do {
            _ = try await ScriptedReader().sessions(.standard)
            XCTFail("a reader with no sessions read answered")
        } catch {
            XCTAssertEqual(error as? DoorFailure, .refused)
        }
    }
}

/// Where the list's routing sent the app.
@MainActor
private final class Routed {
    var pairAgain = 0
}
