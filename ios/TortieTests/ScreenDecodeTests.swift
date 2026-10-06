import Foundation
import XCTest
@testable import Tortie

/// The Screen's answer, decoded STRICTLY (Phase 337, build/p337/SPEC.md
/// section 5.8.2): every bound one at a time, each refusing the whole answer,
/// and the committed sample (composed by the SHIPPING composer on the Mac,
/// build/fixtures/screen/sample-claude-2.1.287.json, D39) decoding whole. Each
/// test names the clause it holds and fails when that clause is taken out of
/// Door/Contract.swift.
final class ScreenDecodeTests: XCTestCase {
    private func decodes(_ answer: [String: Any]) -> Bool {
        (try? ScreenSample.decode(answer)) != nil
    }

    /// Clause: a screen the Mac composed decodes, and its fields are read
    /// under their own names.
    func testAWellFormedScreenDecodes() throws {
        let read = try ScreenSample.decode(ScreenSample.answer())
        let screen = try XCTUnwrap(read.screen)
        XCTAssertEqual(screen.screenColumns, 4)
        XCTAssertEqual(screen.screenRows, 2)
        XCTAssertEqual(screen.cursor.cursorColumn, 1)
        XCTAssertEqual(screen.cursor.cursorRow, 0)
        XCTAssertEqual(screen.lines.count, 2)
        XCTAssertEqual(screen.lines[0].map(\.runCells), [2, 2])
        XCTAssertEqual(screen.styles.count, 2)
        XCTAssertNil(screen.styles[0].bg)
        XCTAssertEqual(screen.styles[1].bg, ScreenColor.read(ScreenSample.colour("202329")))
        XCTAssertEqual(read.revision, ScreenSample.revision)
        XCTAssertFalse(read.unchanged)
        XCTAssertNil(read.why)
    }

    /// Clause: the revision is 12 lowercase hex, and nothing else.
    func testTheRevisionIsTwelveLowercaseHex() {
        for revision in ["0123456789AB", "0123456789a", "0123456789abc", "0123456789ag", "", "0123456789-b"] {
            XCTAssertFalse(decodes(ScreenSample.answer(revision: revision)), revision)
        }
        XCTAssertTrue(decodes(ScreenSample.answer(revision: "abcdef012345")))
    }

    /// Clause: `unchanged` is true exactly when the screen and the absence are
    /// both null; otherwise exactly one of them, never both.
    func testUnchangedCarriesNothing() {
        XCTAssertTrue(decodes(ScreenSample.answer(screen: nil, unchanged: true)))
        XCTAssertFalse(decodes(ScreenSample.answer(unchanged: true)), "unchanged with a screen")
        XCTAssertFalse(decodes(ScreenSample.answer(screen: nil, unchanged: true, why: "ended", sentence: "s.")), "unchanged with an absence")
        XCTAssertFalse(decodes(ScreenSample.answer(screen: nil)), "neither a screen nor an absence")
        XCTAssertFalse(decodes(ScreenSample.answer(why: "ended", sentence: "s.")), "a screen and an absence")
        XCTAssertTrue(decodes(ScreenSample.answer(screen: nil, why: "unreachable", sentence: "s.")))
    }

    /// Clause: an absence is one of three words, with main's non-empty
    /// sentence; a sentence comes only with one.
    func testAnAbsenceIsOneOfThreeWithASentence() {
        for why in ["ended", "unreachable", "large"] {
            XCTAssertTrue(decodes(ScreenSample.answer(screen: nil, why: why, sentence: "s.")), why)
        }
        XCTAssertFalse(decodes(ScreenSample.answer(screen: nil, why: "gone", sentence: "s.")), "a word this build does not know")
        XCTAssertFalse(decodes(ScreenSample.answer(screen: nil, why: "ended", sentence: nil)), "an absence with no sentence")
        XCTAssertFalse(decodes(ScreenSample.answer(screen: nil, why: "ended", sentence: "")), "an empty sentence")
        XCTAssertFalse(decodes(ScreenSample.answer(sentence: "s.")), "a sentence with a screen")
    }

    /// Clause: the width is 1 to 512 and the height 1 to 200.
    func testTheWidthAndHeightAreBounded() {
        XCTAssertTrue(decodes(ScreenSample.answer(screen: ScreenSample.screen(cols: 512))))
        XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(cols: 513))))
        XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(cols: 0))))
        let tall = ScreenSample.screen(rows: 200, lines: Array(repeating: [], count: 200))
        XCTAssertTrue(decodes(ScreenSample.answer(screen: tall)))
        let taller = ScreenSample.screen(rows: 201, lines: Array(repeating: [], count: 201))
        XCTAssertFalse(decodes(ScreenSample.answer(screen: taller)))
        XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(rows: 0, lines: []))))
    }

    /// Clause: exactly as many rows as the height.
    func testThereAreExactlyAsManyRowsAsTheHeight() {
        XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(rows: 2, lines: [[]]))))
        XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(rows: 2, lines: [[], [], []]))))
    }

    /// Clause: the cursor's column is 0 to the width (tmux's one past the
    /// last), and its row inside the height.
    func testTheCursorIsInsideTheScreen() {
        XCTAssertTrue(decodes(ScreenSample.answer(screen: ScreenSample.screen(cursor: (4, 1)))))
        XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(cursor: (5, 0)))))
        XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(cursor: (0, 2)))), "a cursor.y equal to rows")
        XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(cursor: (-1, 0)))))
    }

    /// Clause: every run's style is an index into the styles, every run covers
    /// 1 to the width, and a row's runs cover no more than the width.
    func testEveryRunIsInsideItsRow() {
        let run = { (cells: Int, style: Int) -> [String: Any] in ["text": "ab", "style": style, "cells": cells] }
        XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(lines: [[run(2, 2)], []]))), "a style index out of range")
        XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(lines: [[run(0, 0)], []]))), "a run of no cells")
        XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(lines: [[run(5, 0)], []]))), "a run past cols")
        XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(lines: [[run(2, 0), run(2, 0), run(1, 1)], []]))), "runs that sum past cols")
        XCTAssertTrue(decodes(ScreenSample.answer(screen: ScreenSample.screen(lines: [[run(2, 0), run(2, 1)], []]))))
        XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(lines: [[run(Int.max, 0)], []]))), "a count no door could send")
    }

    /// Clause: at most 1,024 styles.
    func testAtMostOneThousandAndTwentyFourStyles() {
        let style = ScreenSample.style(fg: ScreenSample.colour("d8dbe2"))
        XCTAssertTrue(decodes(ScreenSample.answer(screen: ScreenSample.screen(styles: Array(repeating: style, count: 1_024)))))
        XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(styles: Array(repeating: style, count: 1_025)))))
    }

    /// Clause: every colour is `#` and six LOWERCASE hex digits: the ground,
    /// the ink, the caret and every style's two.
    func testEveryColourIsSevenLowercaseCharacters() {
        let six = "1314" + "17"
        let bads = [
            six, "#" + "13141", ScreenSample.colour(six) + "0", "#" + "13141G", ScreenSample.colour("ABC" + "DEF"),
            " " + ScreenSample.colour(six), ScreenSample.colour(six) + " ", "rgb(1,2,3)", "#+" + "13141",
        ]
        // One style, which the one run uses, so a refusal below is the
        // colour's and nothing else's.
        let plain: [[[String: Any]]] = [[["text": "ab", "style": 0, "cells": 2]], []]
        let ink = ScreenSample.colour("d8dbe2")
        XCTAssertTrue(decodes(ScreenSample.answer(screen: ScreenSample.screen(lines: plain, styles: [ScreenSample.style(fg: ink, bg: ink)]))))
        for bad in bads {
            XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(ground: bad))), "ground \(bad)")
            XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(lines: plain, styles: [ScreenSample.style(fg: bad)]))), "fg \(bad)")
            XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(lines: plain, styles: [ScreenSample.style(fg: ink, bg: bad)]))), "bg \(bad)")
            XCTAssertNil(ScreenColor.read(bad), bad)
        }
        XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(ink: ScreenSample.colour("ABC" + "DEF")))))
        XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(caret: "#xyzxyz"))))
        let read = ScreenColor.read(ScreenSample.colour("0a7fff"))
        XCTAssertEqual(read?.red, 0x0a)
        XCTAssertEqual(read?.green, 0x7f)
        XCTAssertEqual(read?.blue, 0xff)
    }

    /// Clause: the question id is main's shape, and the window's mark null or
    /// 12 lowercase hex.
    func testTheTurnAndTheDialogAreMainsShapes() {
        XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(turn: "turn"))))
        XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(turn: "0123456789ABCDEF-1"))))
        XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(turn: "0123456789abcdef-01"))))
        XCTAssertTrue(decodes(ScreenSample.answer(screen: ScreenSample.screen(asking: true, dialog: "a1b2c3d4e5f6"))))
        XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(asking: true, dialog: "A1B2C3D4E5F6"))))
        XCTAssertFalse(decodes(ScreenSample.answer(screen: ScreenSample.screen(asking: true, dialog: "a1b2c3"))))
    }

    /// Clause: a field the contract always sends refuses the answer when it
    /// is missing, including the ones that may be null.
    func testAMissingFieldRefusesTheAnswer() {
        for key in ["sessionId", "revision", "at", "unchanged", "screen", "why", "sentence"] {
            var answer = ScreenSample.answer()
            answer[key] = nil
            XCTAssertFalse(decodes(answer), "an answer with no \(key)")
        }
        for key in ["cols", "rows", "cursor", "alternate", "ground", "ink", "caret", "styles", "lines", "turn", "asking", "dialog", "typable"] {
            var screen = ScreenSample.screen()
            screen[key] = nil
            XCTAssertFalse(decodes(ScreenSample.answer(screen: screen)), "a screen with no \(key)")
        }
    }

    /// Clause: the client refuses an answer about another session, and the
    /// session answer's `screen` is read as an optional boolean, absent false.
    func testTheSessionAnswerSaysWhetherAScreenIsOffered() throws {
        var detail = Answers.detail(Answers.row("s"))
        XCTAssertFalse(detail.drawsScreen, "absent reads false")
        detail.screen = true
        XCTAssertTrue(detail.drawsScreen)
        let v = try DoorVectorFile.load()
        let talk = try XCTUnwrap(v.answers["session-talk"]).json
        var object = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(talk.utf8)) as? [String: Any])
        var session = try XCTUnwrap(object["session"] as? [String: Any])
        session["screen"] = true
        object["session"] = session
        let offered = try JSONDecoder().decode(PocketSessionAnswer.self, from: try JSONSerialization.data(withJSONObject: object))
        XCTAssertTrue(offered.session.drawsScreen)
        session["screen"] = "yes"
        object["session"] = session
        XCTAssertThrowsError(try JSONDecoder().decode(PocketSessionAnswer.self, from: try JSONSerialization.data(withJSONObject: object)), "a screen field that is not a boolean")
        session["screen"] = nil
        object["session"] = session
        let older = try JSONDecoder().decode(PocketSessionAnswer.self, from: try JSONSerialization.data(withJSONObject: object))
        XCTAssertFalse(older.session.drawsScreen, "a Mac older than 337 offers no Screen")
    }

    /// Clause (D39): the committed sample, composed by the SHIPPING composer,
    /// decodes whole through the phone's own decoder and lays out.
    func testTheCommittedSampleDecodes() throws {
        let answer = try ScreenSample.committedSample()
        let screen = try XCTUnwrap(answer.screen)
        XCTAssertEqual(screen.lines.count, screen.screenRows)
        XCTAssertFalse(answer.unchanged)
        let picture = ScreenPicture(screen, revision: answer.revision)
        XCTAssertEqual(picture.rows.count, screen.screenRows)
        XCTAssertTrue(picture.rows.contains { $0.label.contains("Claude Code") }, "the sample is not Claude Code's screen")
        print("P337_DECODE|sample|\(screen.screenColumns)x\(screen.screenRows)|styles \(screen.styles.count)|runs \(screen.lines.map(\.count).reduce(0, +))")
    }
}

/// Screen answers built field by field, for every Screen test. Colours are
/// spelled in pieces, so no colour literal stands in a test.
enum ScreenSample {
    static let revision = "0123456789ab"
    static let turn = "0123456789abcdef-1"

    static func colour(_ six: String) -> String {
        "#" + six
    }

    static func style(fg: String, bg: String? = nil, bold: Bool = false) -> [String: Any] {
        [
            "fg": fg, "bg": bg ?? NSNull(), "bold": bold, "dim": false, "italic": false,
            "underline": false, "strike": false,
        ]
    }

    static func screen(
        cols: Int = 4,
        rows: Int = 2,
        lines: [[[String: Any]]]? = nil,
        styles: [[String: Any]]? = nil,
        cursor: (Int, Int) = (1, 0),
        ground: String = colour("131417"),
        ink: String = colour("d8dbe2"),
        caret: String = colour("e8eaed"),
        turn: String = ScreenSample.turn,
        asking: Bool = false,
        dialog: String? = nil,
        typable: Bool = true
    ) -> [String: Any] {
        let drawn: [[[String: Any]]] = lines ?? [
            [["text": "ab", "style": 0, "cells": 2], ["text": "cd", "style": 1, "cells": 2]],
            [],
        ]
        return [
            "cols": cols, "rows": rows,
            "cursor": ["x": cursor.0, "y": cursor.1, "visible": true],
            "alternate": false, "ground": ground, "ink": ink, "caret": caret,
            "styles": styles ?? [style(fg: colour("d8dbe2")), style(fg: colour("c9cdd6"), bg: colour("202329"))],
            "lines": drawn, "turn": turn, "asking": asking, "dialog": dialog ?? NSNull(), "typable": typable,
        ]
    }

    static func answer(
        screen: [String: Any]? = ScreenSample.screen(),
        revision: String = ScreenSample.revision,
        unchanged: Bool = false,
        why: String? = nil,
        sentence: String? = nil,
        session: String = "s"
    ) -> [String: Any] {
        [
            "sessionId": session, "revision": revision, "at": 1_791_158_400_000, "unchanged": unchanged,
            "screen": screen ?? NSNull(), "why": why ?? NSNull(), "sentence": sentence ?? NSNull(),
        ]
    }

    static func decode(_ answer: [String: Any]) throws -> PocketScreenAnswer {
        try JSONDecoder().decode(PocketScreenAnswer.self, from: try JSONSerialization.data(withJSONObject: answer))
    }

    /// A picture the phone would draw.
    static func picture(
        revision: String = ScreenSample.revision,
        turn: String = ScreenSample.turn,
        asking: Bool = false,
        dialog: String? = nil,
        typable: Bool = true,
        lines: [[[String: Any]]]? = nil,
        cols: Int = 4
    ) -> ScreenPicture {
        let built = screen(cols: cols, rows: lines?.count ?? 2, lines: lines, turn: turn, asking: asking, dialog: dialog, typable: typable)
        let read = try? decode(answer(screen: built, revision: revision))
        guard let screen = read?.screen else { fatalError("the sample screen does not decode") }
        return ScreenPicture(screen, revision: revision)
    }

    /// build/fixtures/screen/sample-claude-2.1.287.json, beside the checkout.
    static func committedSample() throws -> PocketScreenAnswer {
        let data = try Data(contentsOf: StyleSource.root.appendingPathComponent("build/fixtures/screen/sample-claude-2.1.287.json"))
        return try JSONDecoder().decode(PocketScreenAnswer.self, from: data)
    }
}
