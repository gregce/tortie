import Foundation
import XCTest
@testable import Tortie

/// See a sample's book (Phase 333.3, build/p3333/SPEC.md sections 5.2.1 and
/// 7.2): the file the app carries loads, and every answer it holds, for every
/// state the sample can reach, assembles into an object the contract's own
/// decoders take and the screens' own checks draw. The same checks run over a
/// small book these tests write (`SampleBookFixture`), so the reader is held
/// whether or not the composed book is in the bundle. Each test names the
/// clause it holds and fails when that clause is taken out of
/// Sample/SampleBook.swift.
final class SampleBookTests: XCTestCase {
    // MARK: The book the app carries

    /// `SampleBook.bundled()` reads Sample/sample.json out of the app.
    func testTheBundledBookLoads() throws {
        let book = try XCTUnwrap(SampleBook.bundled(), "the app carries no sample.json this build reads")
        XCTAssertEqual(book.ids.count, 5)
        XCTAssertEqual(book.agents, ["claude", "codex"])
    }

    /// Every one of the 36 states and all 54 questions each, every session,
    /// turns, screen, history and absence: decoded, and drawn by the screens'
    /// own checks.
    func testEveryAnswerOfTheBundledBookDecodesAndDraws() throws {
        let book = try XCTUnwrap(SampleBook.bundled())
        let counted = try SampleBookFixture.assertWhole(book)
        XCTAssertEqual(counted.states, 36)
        XCTAssertEqual(counted.questions, 36 * 54)
    }

    // MARK: The reader, over the tests' own book

    func testEveryAnswerOfTheFixtureDecodesAndDraws() throws {
        let counted = try SampleBookFixture.assertWhole(SampleBookFixture.book())
        XCTAssertEqual(counted.states, 6)
        XCTAssertEqual(counted.questions, 6 * 54)
    }

    /// The state key is each session's variant, in the book's order.
    func testTheStateKeyIsTheVariantsInOrder() throws {
        let book = SampleBookFixture.book()
        XCTAssertEqual(book.stateKey(book.start), "waiting.live.ended")
        XCTAssertEqual(book.stateKey(["s-wait": "answered", "s-idle": "ended", "s-done": "ended"]), "answered.ended.ended")
    }

    /// The sessions key spells the question's words, `*` for no agent.
    func testTheSessionsKeySpellsTheQuestion() {
        XCTAssertEqual(SampleBook.sessionsKey(.standard), "active.project.recent.*")
        XCTAssertEqual(
            SampleBook.sessionsKey(SessionsQuery(show: .ended, group: .none, sort: .oldest, agent: "codex", machine: nil)),
            "ended.none.oldest.codex"
        )
    }

    /// D4: `at` is the clock handed in, on every answer; the book's own is
    /// never drawn.
    func testAtIsTheClockHandedIn() throws {
        let book = SampleBookFixture.book()
        let at = 1_800_000_000_123.0
        let state = book.stateKey(book.start)
        XCTAssertEqual(try book.blocked(state: state, at: at).at, at)
        XCTAssertEqual(try book.sessions(state: state, query: .standard, at: at).at, at)
        XCTAssertEqual(try book.session(id: "s-wait", variant: "waiting", at: at).at, at)
        XCTAssertEqual(try book.turns(id: "s-wait", variant: "waiting", at: at).at, at)
        XCTAssertEqual(try book.screen(id: "s-idle", variant: "live", at: at).answer.at, at)
        XCTAssertEqual(try book.pageEnded(id: "s-idle", at: at).at, at)
        XCTAssertEqual(try book.pageMoved(id: "s-idle", at: at).at, at)
    }

    /// The constants every answer carries are the book's, and the rows are
    /// the pieces the skeleton names, in its order.
    func testAListIsItsPiecesInTheSkeletonsOrder() throws {
        let book = SampleBookFixture.book()
        let blocked = try book.blocked(state: "waiting.live.ended", at: 1)
        XCTAssertEqual(blocked.rows.map(\.sessionId), ["s-wait"])
        XCTAssertEqual(blocked.others.map(\.sessionId), ["s-idle", "s-done"])
        XCTAssertEqual(blocked.emptyLine, SampleBookFixture.emptyLine)
        XCTAssertEqual(blocked.ageNote, SampleBookFixture.blockedAgeNote)
        let answered = try book.blocked(state: "answered.live.ended", at: 1)
        XCTAssertEqual(answered.rows, [])
        XCTAssertEqual(answered.others.map(\.statusTitle), ["Working", "Idle", "Ended"])
        let sessions = try book.sessions(state: "waiting.live.ended", query: .standard, at: 1)
        XCTAssertEqual(sessions.rows.map(\.sessionId), ["s-wait", "s-idle", "s-done"])
        XCTAssertEqual(sessions.groups.map(\.waiting), [true])
        XCTAssertEqual(sessions.agents.map(\.id), ["claude", "codex"])
        XCTAssertEqual(sessions.machines.map(\.id), ["local"])
        XCTAssertEqual(sessions.ageNote, SampleBookFixture.sessionsAgeNote)
    }

    /// `asked` is the question the phone sent, null for no agent and no machine.
    func testTheSessionsAnswerEchoesTheQuestion() throws {
        let book = SampleBookFixture.book()
        let query = SessionsQuery(show: .all, group: .none, sort: .name, agent: "claude", machine: nil)
        let answer = try book.sessions(state: "waiting.live.ended", query: query, at: 1)
        XCTAssertTrue(answer.asked.answers(query))
        XCTAssertEqual(answer.asked.agent, "claude")
        XCTAssertNil(answer.asked.machine)
        XCTAssertNil(try book.sessions(state: "waiting.live.ended", query: .standard, at: 1).asked.agent)
    }

    /// A question the book holds no answer to is refused, as the door refuses
    /// a word it does not know: a machine filter, an agent it does not list,
    /// a state it never reaches, a session it does not have.
    func testWhatTheBookDoesNotHoldIsRefused() {
        let book = SampleBookFixture.book()
        let onThisMac = SessionsQuery(show: .all, group: .project, sort: .recent, agent: nil, machine: "local")
        XCTAssertThrowsError(try book.sessions(state: "waiting.live.ended", query: onThisMac, at: 1)) { XCTAssertEqual($0 as? DoorFailure, .refused) }
        let another = SessionsQuery(show: .all, group: .project, sort: .recent, agent: "gemini", machine: nil)
        XCTAssertThrowsError(try book.sessions(state: "waiting.live.ended", query: another, at: 1)) { XCTAssertEqual($0 as? DoorFailure, .refused) }
        XCTAssertThrowsError(try book.blocked(state: "waiting.waiting.waiting", at: 1)) { XCTAssertEqual($0 as? DoorFailure, .refused) }
        XCTAssertThrowsError(try book.session(id: "s-none", variant: "live", at: 1)) { XCTAssertEqual($0 as? DoorFailure, .refused) }
        XCTAssertThrowsError(try book.screen(id: "s-wait", variant: "live", at: 1)) { XCTAssertEqual($0 as? DoorFailure, .refused) }
        XCTAssertThrowsError(try book.history(id: "s-done")) { XCTAssertEqual($0 as? DoorFailure, .refused) }
    }

    /// An index past the pieces, or an answer the contract refuses, is an
    /// answer this build cannot read: `malformed`, never half drawn.
    func testAnAnswerTheContractRefusesIsMalformed() throws {
        let past = try XCTUnwrap(SampleBook(data: SampleBookFixture.data { book in
            book[path: ["lists", "waiting.live.ended", "blocked", "rows"]] = [99]
        }))
        XCTAssertThrowsError(try past.blocked(state: "waiting.live.ended", at: 1)) { XCTAssertEqual($0 as? DoorFailure, .malformed) }
        let missing = try XCTUnwrap(SampleBook(data: SampleBookFixture.data { book in
            book[path: ["constants", "emptyLine"]] = nil
        }))
        XCTAssertThrowsError(try missing.blocked(state: "waiting.live.ended", at: 1)) { XCTAssertEqual($0 as? DoorFailure, .malformed) }
        let crooked = try XCTUnwrap(SampleBook(data: SampleBookFixture.data { book in
            book[path: ["screen", "s-idle", "live", "answer", "revision"]] = "not hex"
        }))
        XCTAssertThrowsError(try crooked.screen(id: "s-idle", variant: "live", at: 1)) { XCTAssertEqual($0 as? DoorFailure, .malformed) }
    }

    /// Only a book of this build's shape is read.
    func testABookOfAnotherShapeIsNotRead() {
        XCTAssertNotNil(SampleBook(data: SampleBookFixture.data()))
        XCTAssertNil(SampleBook(data: Data("not json".utf8)))
        XCTAssertNil(SampleBook(data: SampleBookFixture.data { $0["format"] = 2 }))
        XCTAssertNil(SampleBook(data: SampleBookFixture.data { $0["ids"] = ["s-wait", "s-wait", "s-done"] }))
        XCTAssertNil(SampleBook(data: SampleBookFixture.data { $0["variants"] = [["waiting"], ["live"]] }))
        XCTAssertNil(SampleBook(data: SampleBookFixture.data { $0["variants"] = [["waiting"], [], ["ended"]] }))
        XCTAssertNil(SampleBook(data: SampleBookFixture.data { $0["lists"] = nil }))
    }

    /// The echo's rows are where the book says, and a screen with no prompt
    /// (a waiting one, an ended one) has none.
    func testTheEchoRowsAreTheBooks() throws {
        let book = SampleBookFixture.book()
        let live = try book.screen(id: "s-idle", variant: "live", at: 1)
        XCTAssertEqual(live.rows, SampleEcho.Rows(prompt: .init(row: 4, column: 2, style: 0), note: .init(row: 3, style: 0)))
        XCTAssertNil(try book.screen(id: "s-wait", variant: "waiting", at: 1).rows)
        XCTAssertNil(try book.screen(id: "s-done", variant: "ended", at: 1).rows)
        let quiet = try XCTUnwrap(SampleBook(data: SampleBookFixture.data { book in
            book[path: ["screen", "s-idle", "live", "note"]] = NSNull()
        }))
        XCTAssertEqual(try quiet.screen(id: "s-idle", variant: "live", at: 1).rows?.note, nil)
        XCTAssertNotNil(try quiet.screen(id: "s-idle", variant: "live", at: 1).rows?.prompt)
    }
}

// MARK: - The checks, and a small book

/// A book the tests write, in Sample/sample.json's shape
/// (build/p3333/SPEC.md section 5.1.3), and the checks every book must pass.
///
/// Three made-up sessions: `s-wait` (Claude Code: waiting, answered, ended),
/// `s-idle` (Codex CLI: live, ended) and `s-done` (Claude Code: ended), so six
/// states. A terminal is 20 columns by 6 rows with 60 lines of history.
enum SampleBookFixture {
    static let ids = ["s-wait", "s-idle", "s-done"]
    static let variants = [["waiting", "answered", "ended"], ["live", "ended"], ["ended"]]
    static let columns = 20
    static let screenRows = 6
    static let depth = 60
    static let waitPrefix = "0123456789abcdef"
    static let idlePrefix = "fedcba9876543210"
    static let dialog = "dddddddddddd"
    static let emptyLine = "Nothing needs you"
    static let blockedAgeNote = "Waits are timed from the first time Tortie saw them."
    static let sessionsAgeNote = "Ages are timed from the newest message."
    static let endedSentence = "This session is not running, so it has no terminal."
    static let movedSentence = "The history moved, so it is read again."

    /// The sessions' spaces, revisions and question prefixes.
    static let space = ["s-wait": "aaaaaaaaaaaa", "s-idle": "bbbbbbbbbbbb"]
    static let revision = [
        "s-wait waiting": "a0a0a0a0a0a1", "s-wait answered": "a0a0a0a0a0a2", "s-wait ended": "a0a0a0a0a0a3",
        "s-idle live": "b0b0b0b0b0b1", "s-idle ended": "b0b0b0b0b0b2", "s-done ended": "c0c0c0c0c0c1"
    ]

    static func book() -> SampleBook {
        SampleBook(data: data())!
    }

    /// The book's bytes, changed by `edit` first.
    static func data(_ edit: (inout [String: Any]) -> Void = { _ in }) -> Data {
        var object = whole()
        edit(&object)
        return try! JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
    }

    // MARK: Counting and checking a whole book

    struct Counted {
        var states = 0
        var questions = 0
    }

    /// Every state a book can reach: each session at each of its variants.
    static func states(_ book: SampleBook) -> [String] {
        var keys = [[String]()]
        for id in book.ids {
            keys = keys.flatMap { key in (book.variants[id] ?? []).map { key + [$0] } }
        }
        return keys.map { $0.joined(separator: ".") }
    }

    /// Every question the Sessions tab can ask the sample.
    static func questions(_ book: SampleBook) -> [SessionsQuery] {
        var out: [SessionsQuery] = []
        for show in SessionsShow.allCases {
            for group in SessionsGroupBy.allCases {
                for sort in SessionsSortBy.allCases {
                    for agent in [nil] + book.agents.map(Optional.some) {
                        out.append(SessionsQuery(show: show, group: group, sort: sort, agent: agent, machine: nil))
                    }
                }
            }
        }
        return out
    }

    /// SPEC section 7.2's whole-book checks.
    @discardableResult
    static func assertWhole(_ book: SampleBook, file: StaticString = #filePath, line: UInt = #line) throws -> Counted {
        var counted = Counted()
        let at = 1_800_000_000_000.0
        let asked = questions(book)
        XCTAssertEqual(asked.count, 54, "the questions per state", file: file, line: line)
        for state in states(book) {
            counted.states += 1
            let blocked = try book.blocked(state: state, at: at)
            XCTAssertEqual(blocked.at, at, file: file, line: line)
            XCTAssertNoThrow(try ListDrawing(blocked), "\(state) blocked", file: file, line: line)
            for query in asked {
                counted.questions += 1
                let answer = try book.sessions(state: state, query: query, at: at)
                XCTAssertTrue(answer.asked.answers(query), "\(state) \(SampleBook.sessionsKey(query))", file: file, line: line)
                XCTAssertNoThrow(try SessionsDrawing(answer, asked: query), "\(state) \(SampleBook.sessionsKey(query))", file: file, line: line)
            }
        }
        for id in book.ids {
            var spaces = Set<String>()
            var depths = Set<Int>()
            for variant in book.variants[id] ?? [] {
                let detail = try book.session(id: id, variant: variant, at: at)
                XCTAssertEqual(detail.session.sessionId, id, file: file, line: line)
                let turns = try book.turns(id: id, variant: variant, at: at)
                XCTAssertEqual(turns.sessionId, id, file: file, line: line)
                var pages = TurnPages(sessionId: id)
                do { try pages.acceptNewest(turns) } catch { XCTFail("\(id) \(variant) turns: \(error)", file: file, line: line) }
                let screen = try book.screen(id: id, variant: variant, at: at)
                XCTAssertEqual(screen.answer.sessionId, id, file: file, line: line)
                if variant == "ended" {
                    XCTAssertEqual(screen.answer.why, .ended, "\(id) \(variant)", file: file, line: line)
                    XCTAssertNil(screen.rows, file: file, line: line)
                    continue
                }
                let drawn = try XCTUnwrap(screen.answer.screen, "\(id) \(variant) draws a screen", file: file, line: line)
                guard let rows = screen.rows else {
                    XCTAssertTrue(drawn.asking, "\(id) \(variant): only a waiting screen has no prompt", file: file, line: line)
                    continue
                }
                if let space = drawn.space { spaces.insert(space) }
                if let depth = drawn.historyDepth { depths.insert(depth) }
                let prompt = rows.prompt
                XCTAssertTrue(drawn.lines.indices.contains(prompt.row), "\(id) \(variant) prompt row", file: file, line: line)
                XCTAssertTrue(drawn.styles.indices.contains(prompt.style), file: file, line: line)
                XCTAssertLessThanOrEqual(prompt.column, drawn.screenColumns, file: file, line: line)
                XCTAssertEqual(drawn.lines[prompt.row].map(\.runCells).reduce(0, +), prompt.column, "\(id) \(variant): the prompt row covers its column and nothing after it", file: file, line: line)
                if let note = rows.note {
                    XCTAssertTrue(drawn.lines.indices.contains(note.row), file: file, line: line)
                    XCTAssertNotEqual(note.row, prompt.row, file: file, line: line)
                    XCTAssertTrue(drawn.styles.indices.contains(note.style), file: file, line: line)
                    XCTAssertEqual(drawn.lines[note.row], [], "\(id) \(variant): the note row is empty", file: file, line: line)
                }
            }
            guard book.variants[id]?.contains(where: { $0 != "ended" }) == true else { continue }
            let history = try book.history(id: id)
            XCTAssertNil(history.why, file: file, line: line)
            XCTAssertEqual(history.pageFrom, 0, file: file, line: line)
            XCTAssertEqual(history.rows.count, history.pageDepth, "\(id): the history is rows [0, depth)", file: file, line: line)
            XCTAssertEqual(spaces, Set([history.space].compactMap { $0 }), "\(id): one space, the history's", file: file, line: line)
            XCTAssertEqual(depths, Set([history.pageDepth].compactMap { $0 }), "\(id): every screen at the history's depth", file: file, line: line)
            XCTAssertEqual(try book.pageEnded(id: id, at: at).why, .ended, file: file, line: line)
            XCTAssertEqual(try book.pageMoved(id: id, at: at).why, .moved, file: file, line: line)
        }
        return counted
    }

    // MARK: The pieces

    static func style(_ fg: String) -> [String: Any] {
        ["fg": fg, "bg": NSNull(), "bold": false, "dim": false, "italic": false, "underline": false, "strike": false]
    }

    static var styles: [[String: Any]] { [style("#d8dbe2"), style("#87afd7")] }

    static func run(_ text: String, _ style: Int = 0) -> [String: Any] {
        ["text": text, "style": style, "cells": text.count]
    }

    /// How one session reads at one variant.
    struct Look {
        let title: String
        let dot: String
        var waiting: Bool { dot == "attention" }
        var ended: Bool { dot == "ended" }
    }

    static func lookOf(_ id: String, _ variant: String) -> Look {
        switch variant {
        case "waiting": Look(title: "Needs input", dot: "attention")
        case "answered": Look(title: "Working", dot: "working")
        case "live": Look(title: "Idle", dot: "idle")
        default: Look(title: "Ended", dot: "ended")
        }
    }

    static func agent(_ id: String) -> (id: String, label: String) {
        id == "s-idle" ? ("codex", "Codex CLI") : ("claude", "Claude Code")
    }

    static func name(_ id: String) -> String {
        ["s-wait": "wait-one", "s-idle": "idle-two", "s-done": "done-three"][id] ?? id
    }

    static var choices: [[String: Any]] {
        [
            ["marker": "1", "text": "Yes"],
            ["marker": "2", "text": "Yes, for this session"],
            ["marker": "3", "text": "No, and say what to do instead"]
        ]
    }

    static func end(_ look: Look) -> [String: Any] {
        look.ended ? ["state": "none"] : ["state": "offered", "batch": true]
    }

    static func blockedRow(_ id: String, _ variant: String) -> [String: Any] {
        let look = lookOf(id, variant)
        return [
            "sessionId": id, "name": name(id), "project": "alpha", "machine": NSNull(),
            "agent": agent(id).id, "agentLabel": agent(id).label,
            "statusLabel": look.title.lowercased(), "statusTitle": look.title, "statusDot": look.dot,
            "question": look.waiting ? "Edit app.ts?" as Any : NSNull() as Any,
            "choices": look.waiting ? choices : [],
            "blockedSince": 1_791_590_160_000.0, "seenAtWake": false, "ageText": "4m",
            "end": end(look)
        ]
    }

    static func sessionsRow(_ id: String, _ variant: String) -> [String: Any] {
        let look = lookOf(id, variant)
        return [
            "sessionId": id, "name": name(id), "group": 0, "machine": NSNull(),
            "statusDot": look.dot, "statusTitle": look.title, "ageText": "4m",
            "waiting": look.waiting, "question": look.waiting ? "Edit app.ts?" as Any : NSNull() as Any,
            "end": end(look)
        ]
    }

    static func detail(_ id: String, _ variant: String) -> [String: Any] {
        let look = lookOf(id, variant)
        var session = blockedRow(id, variant)
        session["catchUp"] = ["ask": "tidy the module", "outcome": "Working on it"]
        session["lastAnswer"] = NSNull()
        session["turnCount"] = 2
        session["handoff"] = NSNull()
        session["activity"] = NSNull()
        session["lastMessageText"] = NSNull()
        let confirm: [String: Any] = ["title": "End '\(name(id))'?", "body": "This stops what is running in it.", "confirmLabel": "End session"]
        let offered: [String: Any] = ["question": "\(waitPrefix)-1", "mark": dialog, "pressable": ["1", "2", "3"], "command": NSNull(), "canSay": false]
        let empty: [String: Any] = ["question": NSNull(), "mark": NSNull(), "pressable": [String](), "command": NSNull(), "canSay": false]
        session["endConfirm"] = look.ended ? NSNull() as Any : confirm as Any
        session["reply"] = look.waiting ? offered : empty
        session["screen"] = !look.ended
        return ["session": session, "at": 1_791_590_400_000.0]
    }

    static func turns(_ id: String) -> [String: Any] {
        let turn: (Int, String, String) -> [String: Any] = { index, ask, answer in
            [
                "index": index, "askText": ask, "askClipped": false, "askAt": NSNull(), "answerText": answer,
                "answerClipped": false, "answerAt": NSNull(), "closed": true, "interrupted": false,
                "notice": NSNull(), "absence": NSNull()
            ]
        }
        return [
            "sessionId": id, "turns": [turn(0, "tidy the module", "Tidied."), turn(1, "and the tests", "Done.")],
            "more": false, "at": 1_791_590_400_000.0, "note": NSNull()
        ]
    }

    /// One screen and its echo's rows.
    static func screen(_ id: String, _ variant: String) -> [String: Any] {
        let key = "\(id) \(variant)"
        let look = lookOf(id, variant)
        guard !look.ended else {
            return [
                "answer": [
                    "sessionId": id, "revision": revision[key]!, "at": 1_791_590_400_000.0, "unchanged": false,
                    "screen": NSNull(), "why": "ended", "sentence": endedSentence
                ],
                "prompt": NSNull(), "note": NSNull()
            ]
        }
        let prefix = id == "s-wait" ? waitPrefix : idlePrefix
        let lines: [[[String: Any]]]
        let cursor: [String: Any]
        if look.waiting {
            lines = [[run("Edit app.ts?")], [run("1. Yes")], [run("2. Always")], [run("3. No")], [], []]
            cursor = ["x": 0, "y": 5, "visible": false]
        } else {
            lines = [[run("Edited app.ts.")], [run("Ran the tests.", 1)], [], [], [run("> ", 1)], []]
            cursor = ["x": 2, "y": 4, "visible": true]
        }
        let drawn: [String: Any] = [
            "cols": columns, "rows": screenRows, "cursor": cursor, "alternate": false,
            "ground": "#131417", "ink": "#d8dbe2", "caret": "#e8eaed", "styles": styles, "lines": lines,
            "turn": "\(prefix)-\(variant == "answered" ? 2 : 1)", "asking": look.waiting,
            "dialog": look.waiting ? dialog : NSNull(), "typable": true, "depth": depth, "space": space[id]!
        ]
        return [
            "answer": [
                "sessionId": id, "revision": revision[key]!, "at": 1_791_590_400_000.0, "unchanged": false,
                "screen": drawn, "why": NSNull(), "sentence": NSNull()
            ],
            "prompt": look.waiting ? NSNull() as Any : ["row": 4, "column": 2, "style": 0] as Any,
            "note": look.waiting ? NSNull() as Any : ["row": 3, "style": 0] as Any
        ]
    }

    static func history(_ id: String) -> [String: Any] {
        [
            "sessionId": id, "at": 1_791_590_400_000.0, "from": 0, "depth": depth, "wrap": columns, "space": space[id]!,
            "styles": styles, "rows": (0..<depth).map { [run("line \($0)")] }, "why": NSNull(), "sentence": NSNull()
        ]
    }

    static func absence(_ id: String, _ why: String, _ sentence: String) -> [String: Any] {
        [
            "sessionId": id, "at": 1_791_590_400_000.0, "from": NSNull(), "depth": NSNull(), "wrap": NSNull(),
            "space": NSNull(), "styles": [Any](), "rows": [Any](), "why": why, "sentence": sentence
        ]
    }

    // MARK: The whole book

    /// The pieces, each once, in the order the skeletons index them.
    static let pairs: [(String, String)] = zip(ids, variants).flatMap { id, list in list.map { (id, $0) } }

    static func whole() -> [String: Any] {
        let index = Dictionary(uniqueKeysWithValues: pairs.enumerated().map { ("\($1.0) \($1.1)", $0) })
        var lists: [String: Any] = [:]
        for first in variants[0] {
            for second in variants[1] {
                let state = [first, second, "ended"]
                let pieces = zip(ids, state).map { index["\($0) \($1)"]! }
                let waiting = first == "waiting"
                var sessions: [String: Any] = [:]
                for show in SessionsShow.allCases {
                    for group in SessionsGroupBy.allCases {
                        for sort in SessionsSortBy.allCases {
                            for agent in ["*", "claude", "codex"] {
                                sessions["\(show.rawValue).\(group.rawValue).\(sort.rawValue).\(agent)"] = [
                                    "rows": pieces, "groups": [waiting ? 0 : 1], "agents": [0, 1], "machines": [2],
                                    "total": 3, "omitted": 0
                                ] as [String: Any]
                            }
                        }
                    }
                }
                lists[state.joined(separator: ".")] = [
                    "blocked": [
                        "rows": waiting ? [pieces[0]] : [Int](),
                        "others": waiting ? Array(pieces.dropFirst()) : pieces,
                        "othersOmitted": 0
                    ] as [String: Any],
                    "sessions": sessions
                ] as [String: Any]
            }
        }
        func byVariant(_ make: (String, String) -> [String: Any]) -> [String: Any] {
            Dictionary(uniqueKeysWithValues: zip(ids, variants).map { id, list in
                (id, Dictionary(uniqueKeysWithValues: list.map { ($0, make(id, $0) as Any) }) as Any)
            })
        }
        let live = ["s-wait", "s-idle"]
        return [
            "format": 1,
            "clock": 1_791_590_400_000.0,
            "ids": ids,
            "variants": variants,
            "agents": ["claude", "codex"],
            "constants": ["blockedAgeNote": blockedAgeNote, "sessionsAgeNote": sessionsAgeNote, "emptyLine": emptyLine],
            "pieces": [
                "blockedRows": pairs.map { blockedRow($0.0, $0.1) },
                "sessionsRows": pairs.map { sessionsRow($0.0, $0.1) },
                "groups": [true, false].map { waiting -> [String: Any] in
                    [
                        "id": "AAAAAAAAAAAAAAAA", "label": "alpha", "machine": NSNull(), "folder": NSNull(),
                        "count": 3, "omitted": 0, "waiting": waiting, "collapsed": false
                    ]
                },
                "choices": [
                    ["id": "claude", "label": "Claude Code"], ["id": "codex", "label": "Codex CLI"], ["id": "local", "label": NSNull()]
                ] as [[String: Any]]
            ] as [String: Any],
            "lists": lists,
            "session": byVariant(detail),
            "turns": byVariant { id, _ in turns(id) },
            "screen": byVariant(screen),
            "history": Dictionary(uniqueKeysWithValues: live.map { ($0, history($0) as Any) }),
            "pageEnded": Dictionary(uniqueKeysWithValues: live.map { ($0, absence($0, "ended", endedSentence) as Any) }),
            "pageMoved": Dictionary(uniqueKeysWithValues: live.map { ($0, absence($0, "moved", movedSentence) as Any) })
        ]
    }
}

extension Dictionary where Key == String, Value == Any {
    /// A value inside nested objects, for the tests that change one.
    subscript(path path: [String]) -> Any? {
        get {
            guard let first = path.first else { return nil }
            if path.count == 1 { return self[first] }
            return (self[first] as? [String: Any])?[path: Array(path.dropFirst())]
        }
        set {
            guard let first = path.first else { return }
            if path.count == 1 {
                self[first] = newValue
                return
            }
            var inner = self[first] as? [String: Any] ?? [:]
            inner[path: Array(path.dropFirst())] = newValue
            self[first] = inner
        }
    }
}
