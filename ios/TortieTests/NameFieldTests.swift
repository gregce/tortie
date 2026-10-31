import Foundation
import SwiftUI
import UIKit
import XCTest
@testable import Tortie

/// The one name field and the rule beside it (Phase 349, build/p349/SPEC.md
/// §4.4 step 4, D5, D11, D18, D19; conformance:ios rules bd1 to bd4, bd6):
/// the Mac's trim and its refusals in its order, the 120-unit cap the field
/// holds, the coordinator a `UITextField` talks to, and, read from the source,
/// the six types turned off and the names set in `makeUIView` alone. The
/// rule is held to the Mac's own bytes in `DoorVectorTests` (the vectors'
/// `names` section); here it is held to D5's words. Each test names the clause
/// it holds and fails when that clause is taken out of Screens/NameField.swift.
@MainActor
final class NameFieldTests: XCTestCase {
    // MARK: The rule (D5)

    /// Clause (D5, bd6): the trim set is ECMAScript's own, written out: 25
    /// code points, each taken from both ends of a name and from nowhere else.
    func testTheTrimIsECMAScriptsTwentyFive() {
        let ecmascript: [UInt32] = [0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x20, 0xA0, 0x1680] + Array(0x2000...0x200A) + [0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF]
        XCTAssertEqual(ecmascript.count, 25)
        XCTAssertEqual(NameRule.trimmedAway, Set(ecmascript))
        for value in ecmascript {
            let unit = String(UnicodeScalar(value)!)
            XCTAssertEqual(NameRule.trimmed(unit + "a b" + unit), "a b", String(value, radix: 16))
            XCTAssertEqual(NameRule.trimmed("a" + unit + "b"), "a" + unit + "b", "\(String(value, radix: 16)) taken from inside a name")
        }
        // Not white space to ECMAScript, so kept at the ends.
        for kept in ["\u{85}", "\u{180E}", "\u{200B}", "\u{2060}", "\u{1F600}"] {
            XCTAssertEqual(NameRule.trimmed(kept + "a" + kept), kept + "a" + kept, kept.unicodeScalars.map { String($0.value, radix: 16) }.joined())
        }
        XCTAssertEqual(NameRule.trimmed(""), "")
        XCTAssertEqual(NameRule.trimmed(" \t\n "), "")
    }

    /// Clause (D5): the refusals in the Mac's order, each with its own
    /// sentence: nothing left, then over 120 UTF-16 units, then the first unit
    /// Tortie does not use; anything else passes, a duplicate included.
    func testTheRefusalsAreTheMacsInItsOrder() {
        XCTAssertEqual(NameRule.maxUnits, 120)
        let empty = NameRule.Refusal(reason: .empty, sentence: Copy.nameEmpty)
        let long = NameRule.Refusal(reason: .long, sentence: Copy.nameTooLong)
        let character = NameRule.Refusal(reason: .character, sentence: Copy.nameCharacter)
        XCTAssertEqual(NameRule.refusal(""), empty)
        XCTAssertEqual(NameRule.refusal(" \u{3000} "), empty)
        XCTAssertEqual(NameRule.refusal("\t\n\r"), empty, "TAB, LF and CR at the ends are trimmed before they are refused")
        XCTAssertEqual(NameRule.refusal(String(repeating: "a", count: 121)), long)
        XCTAssertNil(NameRule.refusal(String(repeating: "a", count: 120)))
        XCTAssertNil(NameRule.refusal("  " + String(repeating: "a", count: 120) + "  "), "the cap is counted after the trim")
        XCTAssertNil(NameRule.refusal(String(repeating: "\u{1F600}", count: 60)), "60 astral characters are 120 units")
        XCTAssertEqual(NameRule.refusal(String(repeating: "\u{1F600}", count: 61)), long)
        XCTAssertEqual(NameRule.refusal(String(repeating: "a", count: 121) + "\u{0001}"), long, "a long name with a control is long first")
        for value: UInt32 in [0x00, 0x01, 0x09, 0x0A, 0x0D, 0x1F, 0x7F, 0x80, 0x85, 0x9F, 0x202A, 0x202B, 0x202C, 0x202D, 0x202E, 0x2066, 0x2067, 0x2068, 0x2069, 0x2028, 0x2029] {
            XCTAssertEqual(NameRule.refusal("a" + String(UnicodeScalar(value)!) + "b"), character, String(value, radix: 16))
        }
        for passes in ["fix--auth", "it's \"x\"", "PR #12", "#{session_id}", "x;", "/review", "-x", "$HOME", "a\\b", "café ☕", "مرحبا بالعالم", "日本語のセッション", "👨\u{200D}👩\u{200D}👧\u{200D}👦 fam", "\u{200E}rtl\u{200F}", "a\u{200B}b", "claude-3", "claude-3"] {
            XCTAssertNil(NameRule.refusal(passes), passes)
        }
        for edge: UInt32 in [0x20, 0x7E, 0xA0, 0xA1, 0x2027, 0x202F, 0x2065, 0x206A] {
            XCTAssertNil(NameRule.refusal("a" + String(UnicodeScalar(edge)!) + "b"), "\(String(edge, radix: 16)) is outside every refused range")
        }
    }

    /// Clause (D5, bd6): over every scalar of the Basic Multilingual Plane,
    /// read inside a name, the rule refuses exactly D5's 76 units (C0, DEL,
    /// C1, the five embeddings and overrides, the four isolates and the two
    /// separators) and trims exactly the 25; a Swift string holds no half of a
    /// surrogate pair, so those are the Mac's alone.
    func testOverTheWholePlaneTheRefusedAreD5sSeventySix() {
        var refused: [UInt32] = []
        var trimmed: [UInt32] = []
        for value in UInt32(0)...0xFFFF {
            guard let scalar = UnicodeScalar(value) else { continue }
            let unit = String(scalar)
            if NameRule.refusal("a" + unit + "b")?.reason == .character { refused.append(value) }
            if NameRule.trimmed(unit).isEmpty { trimmed.append(value) }
        }
        let d5: [UInt32] = Array(0x00...0x1F) + [0x7F] + Array(0x80...0x9F) + Array(0x202A...0x202E) + Array(0x2066...0x2069) + [0x2028, 0x2029]
        XCTAssertEqual(refused, d5.sorted())
        XCTAssertEqual(refused.count, 76)
        XCTAssertEqual(Set(trimmed), NameRule.trimmedAway)
        XCTAssertEqual(trimmed.count, 25)
    }

    // MARK: The cap (bd4)

    /// Clause (bd4): an edit is taken only when the name it leaves holds at
    /// most 120 UTF-16 units, counted as units (an astral character is two),
    /// or, for a name already past the cap, no more units than it held; a
    /// range outside the text is no edit.
    func testTheFieldTakesNoEditPastTheCap() {
        let full = String(repeating: "a", count: 119)
        XCTAssertTrue(NameField.takes(full, NSRange(location: 119, length: 0), "b"))
        XCTAssertFalse(NameField.takes(full + "b", NSRange(location: 120, length: 0), "c"), "a 121st unit was taken")
        XCTAssertFalse(NameField.takes(full, NSRange(location: 119, length: 0), "\u{1F600}"), "an astral character is one unit")
        XCTAssertTrue(NameField.takes(String(repeating: "a", count: 118), NSRange(location: 118, length: 0), "\u{1F600}"))
        XCTAssertFalse(NameField.takes("", NSRange(location: 0, length: 0), String(repeating: "p", count: 121)), "a paste past the cap was taken")
        XCTAssertTrue(NameField.takes("", NSRange(location: 0, length: 0), String(repeating: "p", count: 120)))
        let long = String(repeating: "n", count: 300)
        XCTAssertTrue(NameField.takes(long, NSRange(location: 0, length: 300), "x"), "a prefilled name over the cap cannot be replaced")
        XCTAssertTrue(NameField.takes(long, NSRange(location: 0, length: 300), ""), "a prefilled name over the cap cannot be cleared")
        // The fix round of 2026-10-30: a name the Mac holds past the cap shrinks a unit at a time, and never grows.
        XCTAssertTrue(NameField.takes(long, NSRange(location: 299, length: 1), ""), "a prefilled name over the cap cannot be shortened one unit at a time")
        XCTAssertTrue(NameField.takes(long, NSRange(location: 10, length: 1), "y"), "a unit of a prefilled name over the cap cannot be typed over")
        XCTAssertFalse(NameField.takes(long, NSRange(location: 300, length: 0), "x"), "a prefilled name over the cap grew")
        XCTAssertFalse(NameField.takes(long, NSRange(location: 10, length: 1), "yz"), "a prefilled name over the cap grew by a two-unit replacement")
        XCTAssertFalse(NameField.takes("abc", NSRange(location: 2, length: 5), "x"), "a range past the text was taken")
        XCTAssertFalse(NameField.takes("abc", NSRange(location: NSNotFound, length: 0), "x"))
    }

    /// Clause (bd4, D11): the coordinator a `UITextField` talks to holds the
    /// cap, hands every change back to the model, and answers Return by
    /// calling `onReturn` once and hiding the keyboard.
    func testTheCoordinatorHoldsTheCapAndAnswersReturn() {
        var text = "fix-login"
        var returns = 0
        let coordinator = NameField.Coordinator(text: Binding(get: { text }, set: { text = $0 }), onReturn: { returns += 1 })
        let field = UITextField()
        field.text = String(repeating: "a", count: 120)
        XCTAssertFalse(coordinator.textField(field, shouldChangeCharactersIn: NSRange(location: 120, length: 0), replacementString: "b"))
        XCTAssertTrue(coordinator.textField(field, shouldChangeCharactersIn: NSRange(location: 0, length: 1), replacementString: "b"))
        field.text = "it's \"x\" fix--auth"
        coordinator.changed(field)
        XCTAssertEqual(text, "it's \"x\" fix--auth", "the model does not hold the field's text as typed")
        XCTAssertTrue(coordinator.edited)
        XCTAssertFalse(coordinator.textFieldShouldReturn(field), "Return is handed to UIKit as a line break")
        XCTAssertEqual(returns, 1)
    }

    // MARK: The source (bd1, bd2, bd3)

    /// Clause (bd2, D11, D18): `makeUIView` turns the six types off, and sets
    /// the identifier and the label there and nowhere else.
    func testMakeUIViewTurnsEveryRewriteOffAndNamesTheField() throws {
        let file = RenameTests.code(try StyleSource.text("ios/Tortie/Screens/NameField.swift"))
        let make = try body(file, "func makeUIView(context: Context) -> UITextField {")
        for setting in [
            "field.smartQuotesType = .no", "field.smartDashesType = .no", "field.smartInsertDeleteType = .no",
            "field.autocorrectionType = .no", "field.autocapitalizationType = .none", "field.spellCheckingType = .no",
            "field.accessibilityIdentifier = identifier", "field.accessibilityLabel = label"
        ] {
            XCTAssertTrue(make.contains(setting), "makeUIView does not set \(setting)")
        }
        for name in ["accessibilityIdentifier =", "accessibilityLabel ="] {
            XCTAssertEqual(file.components(separatedBy: name).count, 2, "NameField.swift sets \(name) outside makeUIView")
        }
        XCTAssertTrue(make.contains("if focusOnAppear {"), "the field takes the keyboard whatever it was told")
        let coordinator = try body(file, "final class Coordinator: NSObject, UITextFieldDelegate {")
        XCTAssertTrue(coordinator.contains("NameField.takes(field.text ?? \"\", range, string)"), "the cap is not held where UIKit asks")
        XCTAssertTrue(file.contains("NameRule.maxUnits"), "the cap is not the rule's")
        XCTAssertEqual(file.components(separatedBy: "static let maxUnits = 120").count, 2, "the cap is declared other than once, as 120")
    }

    /// Clause (bd1, bd3): `UITextField` is named in Screens/NameField.swift
    /// alone, the app's ONE; no SwiftUI text field is drawn by Rename or New
    /// session; and no caller attaches an identifier to a `NameField(`, which
    /// would replace the one `makeUIView` sets (D18).
    func testTheFieldIsTheAppsOneAndNamedByItself() throws {
        let root = StyleSource.root.appendingPathComponent("ios").appendingPathComponent("Tortie").resolvingSymlinksInPath()
        let prefix = root.path + "/"
        let walk = try XCTUnwrap(FileManager.default.enumerator(at: root, includingPropertiesForKeys: nil))
        var files: [(name: String, code: String)] = []
        for case let url as URL in walk where url.pathExtension == "swift" {
            let path = url.resolvingSymlinksInPath().path
            guard path.hasPrefix(prefix) else { continue }
            files.append((name: String(path.dropFirst(prefix.count)), code: RenameTests.code(try String(contentsOf: url, encoding: .utf8))))
        }
        XCTAssertGreaterThan(files.count, 40)
        for f in files where f.code.contains("UITextField") {
            XCTAssertEqual(f.name, "Screens/NameField.swift", "\(f.name) names UITextField")
        }
        for name in ["Screens/SessionName.swift", "Screens/StartSheet.swift", "Screens/Start.swift", "Screens/ListScreen.swift", "Screens/SessionsScreen.swift"] {
            let code = try XCTUnwrap(files.first { $0.name == name }?.code, "\(name) is not in the app")
            for word in [" TextField(", "(TextField(", "SecureField(", "TextEditor("] {
                XCTAssertFalse(code.contains(word), "\(name) draws a SwiftUI \(word)")
            }
        }
        var calls = 0
        for f in files {
            var from = f.code.startIndex
            while let made = f.code.range(of: "NameField(text:", range: from..<f.code.endIndex) {
                from = made.upperBound
                calls += 1
                for modifier in Self.chain(after: made.lowerBound, in: f.code) {
                    XCTAssertFalse(modifier.hasPrefix(".accessibilityIdentifier("), "\(f.name) attaches an identifier to a NameField: \(modifier)")
                }
            }
        }
        XCTAssertGreaterThanOrEqual(calls, 1, "no NameField( is made in the app")
    }

    // MARK: Helpers

    /// The modifiers chained onto the call that starts at `at`: its argument
    /// list matched, a trailing closure skipped, then every line after it
    /// that starts with a dot, each trimmed.
    static func chain(after at: String.Index, in code: String) -> [String] {
        guard let open = code[at...].firstIndex(of: "(") else { return [] }
        var i = open
        var depth = 0
        repeat {
            if code[i] == "(" { depth += 1 } else if code[i] == ")" { depth -= 1 }
            i = code.index(after: i)
        } while depth > 0 && i < code.endIndex
        var rest = code[i...]
        if let first = rest.firstIndex(where: { !$0.isWhitespace || $0 == "\n" }), rest[first] == "{" {
            var j = first
            var braces = 0
            repeat {
                if code[j] == "{" { braces += 1 } else if code[j] == "}" { braces -= 1 }
                j = code.index(after: j)
            } while braces > 0 && j < code.endIndex
            rest = code[j...]
        }
        var out: [String] = []
        for line in rest.split(separator: "\n", omittingEmptySubsequences: false).dropFirst() {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            guard trimmed.hasPrefix(".") else { break }
            out.append(trimmed)
        }
        return out
    }

    /// The body of the declaration that `head` opens, braces matched.
    private func body(_ code: String, _ head: String) throws -> String {
        let start = try XCTUnwrap(code.range(of: head), "no \(head)")
        var depth = 0
        var at = code.index(before: start.upperBound)
        repeat {
            if code[at] == "{" { depth += 1 } else if code[at] == "}" { depth -= 1 }
            at = code.index(after: at)
        } while depth > 0 && at < code.endIndex
        return String(code[start.lowerBound..<at])
    }
}
