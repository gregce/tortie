import Foundation
import XCTest
@testable import Tortie

/// End these' words are the Mac sheet's (Phase 317, build/p317/SPEC.md section
/// 5.8.7). `Fixtures/batch-words.json` holds what the Mac's own composers in
/// src/renderer/session-manager/copy.ts say, for n = 1, 2 and 12 and the body
/// both ways; a vitest holds the Mac's composers to the same file, so the two
/// sides cannot drift apart. Each test fails when a composer or a piece of it
/// in Style/Copy.swift says anything else.
final class EndWordsTests: XCTestCase {
    private struct Words: Decodable {
        struct Case: Decodable {
            let composer: String
            let args: [Arg]
            let text: String
        }

        /// A composer's argument, as the Mac's function takes it.
        enum Arg: Decodable {
            case number(Int)
            case flag(Bool)
            case object([String: Value])

            init(from decoder: Decoder) throws {
                let c = try decoder.singleValueContainer()
                if let number = try? c.decode(Int.self) {
                    self = .number(number)
                } else if let flag = try? c.decode(Bool.self) {
                    self = .flag(flag)
                } else {
                    self = .object(try c.decode([String: Value].self))
                }
            }
        }

        enum Value: Decodable {
            case number(Int)
            case text(String)

            init(from decoder: Decoder) throws {
                let c = try decoder.singleValueContainer()
                if let number = try? c.decode(Int.self) {
                    self = .number(number)
                } else {
                    self = .text(try c.decode(String.self))
                }
            }

            var number: Int? { if case .number(let n) = self { return n } else { return nil } }
            var text: String? { if case .text(let t) = self { return t } else { return nil } }
        }

        let n: [Int]
        let constants: [String: String]
        let cases: [Case]
    }

    /// A case this test cannot read: a failure, never a skip.
    private struct Unreadable: Error {
        let what: String
    }

    private func words() throws -> Words {
        let beside = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .appendingPathComponent("Fixtures")
            .appendingPathComponent("batch-words.json")
        let bundled = Bundle(for: EndWordsTests.self).url(forResource: "batch-words", withExtension: "json")
        let url = FileManager.default.fileExists(atPath: beside.path) ? beside : (bundled ?? beside)
        return try JSONDecoder().decode(Words.self, from: Data(contentsOf: url))
    }

    private func number(_ arg: Words.Arg?) throws -> Int {
        guard case .number(let n)? = arg else { throw Unreadable(what: "not a number") }
        return n
    }

    /// The phone's composer of the same name, over the case's arguments.
    private func phone(_ c: Words.Case) throws -> String {
        switch c.composer {
        case "selectedCount":
            return Copy.selectedCount(try number(c.args.first))
        case "batchHeading":
            return Copy.batchHeading(try number(c.args.first))
        case "batchConfirmLabel":
            return Copy.batchConfirmLabel(try number(c.args.first))
        case "batchRunningHeading":
            return Copy.batchRunningHeading(try number(c.args.first))
        case "batchDoneHeading":
            return Copy.batchDoneHeading(try number(c.args.first), try number(c.args.last))
        case "batchBody":
            guard case .flag(let remote)? = c.args.first else { throw Unreadable(what: "batchBody takes a flag") }
            return Copy.batchBody(remote)
        case "batchSkippedLine":
            guard case .object(let counts)? = c.args.first else { throw Unreadable(what: "batchSkippedLine takes counts") }
            let skipped = [
                (BatchSkip.ended, counts["ended"]?.number ?? 0),
                (BatchSkip.unreachable, counts["unreachable"]?.number ?? 0),
                (BatchSkip.gone, counts["gone"]?.number ?? 0)
            ].flatMap { Array(repeating: $0.0, count: $0.1) }
            // The Mac says nothing skipped with its empty string; the phone
            // with no line at all.
            return Copy.batchSkippedLine(skipped) ?? ""
        case "batchOutcomeWord":
            guard case .object(let outcome)? = c.args.first, let state = outcome["state"]?.text else {
                throw Unreadable(what: "batchOutcomeWord takes an outcome")
            }
            switch (state, outcome["reason"]?.text) {
            case ("ending", _): return EndBatchModel.word(.ending)
            case ("ended", _): return EndBatchModel.word(.wrote(WriteAnswers.done))
            case ("skipped", "ended"?): return Copy.alreadyEnded
            case ("skipped", "unreachable"?): return Copy.unreachable
            case ("skipped", _): return Copy.noLongerHere
            case ("failed", _): return Copy.notEnded(outcome["message"]?.text ?? "")
            case ("not-run", _): return EndBatchModel.word(.notRun)
            default: throw Unreadable(what: "an outcome the phone draws no word for")
            }
        default:
            XCTFail("the fixture names a composer the phone does not have: \(c.composer)")
            return ""
        }
    }

    /// Clause: every composed word in the fixture is the phone's, byte for byte.
    func testThePhoneComposesTheMacsWords() throws {
        let file = try words()
        XCTAssertEqual(file.n, [1, 2, 12])
        XCTAssertGreaterThanOrEqual(file.cases.count, 30, "the reader found too few cases to be reading the file")
        var composers = Set<String>()
        for c in file.cases {
            composers.insert(c.composer)
            XCTAssertEqual(try phone(c), c.text, "\(c.composer)(\(c.args))")
        }
        XCTAssertEqual(composers, [
            "selectedCount", "batchHeading", "batchConfirmLabel", "batchRunningHeading", "batchDoneHeading",
            "batchSkippedLine", "batchBody", "batchOutcomeWord"
        ])
    }

    /// Clause: the Mac's four words, by their names.
    func testTheMacsConstants() throws {
        let file = try words()
        XCTAssertEqual(file.constants["END_SESSION"], Copy.endSessionMenu)
        XCTAssertEqual(file.constants["END_SELECTED"], Copy.endSelected)
        XCTAssertEqual(file.constants["BATCH_STOP"], Copy.stop)
        XCTAssertEqual(file.constants["BATCH_DONE"], Copy.done)
    }

    /// Clause: every n the fixture names, each composer says the singular for
    /// one and the plural otherwise.
    func testOneIsSingular() {
        XCTAssertEqual(Copy.sessionWord(1), Copy.sessionSingular)
        XCTAssertEqual(Copy.sessionWord(2), Copy.sessionPlural)
        XCTAssertEqual(Copy.sessionWord(12), Copy.sessionPlural)
        XCTAssertEqual(Copy.sessionWord(0), Copy.sessionPlural)
    }
}
