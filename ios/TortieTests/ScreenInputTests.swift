import UIKit
import XCTest
@testable import Tortie

/// The Screen's keyboard field (Phase 337, build/p337/SPEC.md D28, section
/// 5.8.5, §Attack A9): what each change of the hidden field sends, Paseo's
/// input machine (terminal-input.native.test.ts at getpaseo/paseo 2f0cb2f,
/// ported, not copied), and the field's refusals. Each test names the clause
/// it holds and fails when that clause is taken out of
/// Screens/ScreenKeyField.swift or Door/Contract.swift.
final class ScreenInputTests: XCTestCase {
    private func text(_ string: String) -> [KeyItem] {
        [.text(string)]
    }

    /// One character, from its code point.
    private func character(_ value: UInt32) -> Character {
        Character(Unicode.Scalar(value) ?? " ")
    }

    /// Clause: a committed append is sent as text, character by character as
    /// it arrives, and the field holds what was read.
    func testAnAppendIsSentAsText() {
        var state = ScreenInputState()
        XCTAssertEqual(state.changed(to: "e", marked: false, dictating: false).items, text("e"))
        XCTAssertEqual(state.changed(to: "ech", marked: false, dictating: false).items, text("ch"))
        XCTAssertEqual(state.changed(to: "echo p337", marked: false, dictating: false).items, text("o p337"))
        XCTAssertEqual(state.previous, "echo p337")
    }

    /// Clause: Backspace is `BSpace`, even on an empty field, and the
    /// deletion that follows reads as no change.
    func testBackspaceIsBSpaceEvenOnAnEmptyField() {
        var state = ScreenInputState()
        XCTAssertEqual(state.backspace(marked: false).items, [.key(.backspace)])
        _ = state.changed(to: "ab", marked: false, dictating: false)
        XCTAssertEqual(state.backspace(marked: false).items, [.key(.backspace)])
        XCTAssertEqual(state.changed(to: "a", marked: false, dictating: false).items, [], "the deletion itself sends nothing more")
        XCTAssertEqual(state.backspace(marked: true).items, [], "the IME edits its own marked text")
    }

    /// Clause: a replacement that is exactly a line break is `Enter`, and the
    /// field empties.
    func testReturnIsEnter() {
        var state = ScreenInputState()
        _ = state.changed(to: "ls", marked: false, dictating: false)
        let change = state.replacing(with: "\n", marked: false)
        XCTAssertEqual(change, ScreenInputState.Change(items: [.key(.enter)], clear: true))
        XCTAssertEqual(state.previous, "")
        XCTAssertNil(state.replacing(with: "x", marked: false), "anything else is the field's to make")
    }

    /// Clause (§Attack A9): any other replacement holding a line break is
    /// swallowed WHOLE: a pasted or dictated block of lines never arrives as
    /// lines and Returns.
    func testABlockOfLinesIsSwallowedWhole() {
        var state = ScreenInputState()
        for block in ["rm -rf x\nls", "a\n", "\nb", "a\r\nb", "a\rb"] {
            XCTAssertEqual(state.replacing(with: block, marked: false), ScreenInputState.Change(), block)
        }
        XCTAssertEqual(state.changed(to: "a\nb", marked: false, dictating: false), ScreenInputState.Change(clear: true), "a field that holds a line break sends nothing and empties")
        // The fix round of 2026-10-06: "\r\n" is ONE Character, which neither
        // "\n" nor "\r" equals, so a Character search walked past it and the
        // block went as one line of text. Asked scalar by scalar, every shape
        // of line break is caught, in both functions.
        for block in ["a\r\nb", "\r\n", "x\r\n", "\u{1F600}\r\nb"] {
            XCTAssertTrue(ScreenInputState.holdsLineBreak(block), block)
            var fresh = ScreenInputState()
            XCTAssertEqual(fresh.changed(to: block, marked: false, dictating: false), ScreenInputState.Change(clear: true), block)
        }
        XCTAssertFalse(ScreenInputState.holdsLineBreak("echo p337"))
    }

    /// Clause: nothing is sent while text is marked (an IME composition); the
    /// committed text is read once it is not.
    func testMarkedTextIsHeld() {
        var state = ScreenInputState()
        XCTAssertEqual(state.changed(to: "n", marked: true, dictating: false).items, [])
        XCTAssertEqual(state.changed(to: "ni", marked: true, dictating: false).items, [])
        let han = String(character(0x4F60))
        XCTAssertEqual(state.changed(to: han, marked: false, dictating: false).items, text(han))
    }

    /// Clause: a CJK composition rewrite (Korean's syllable by syllable) is
    /// sent as Backspaces and the new text.
    func testACompositionRewriteIsBackspacesAndTheNewText() throws {
        let h = String(Character(try XCTUnwrap(Unicode.Scalar(0x314E))))    // a jamo
        let ha = String(Character(try XCTUnwrap(Unicode.Scalar(0xD558))))   // a syllable
        let han = String(Character(try XCTUnwrap(Unicode.Scalar(0xD55C))))  // the next
        var state = ScreenInputState()
        XCTAssertEqual(state.changed(to: h, marked: false, dictating: false).items, text(h))
        XCTAssertEqual(state.changed(to: ha, marked: false, dictating: false).items, [.key(.backspace), .text(ha)])
        XCTAssertEqual(state.changed(to: han, marked: false, dictating: false).items, [.key(.backspace), .text(han)])
    }

    /// Clause: any other replacement (an autocorrection) is swallowed, and
    /// the field stays off until it is emptied; appends after it still go.
    func testAnAutocorrectionIsSwallowedUntilAReset() {
        var state = ScreenInputState()
        _ = state.changed(to: "teh", marked: false, dictating: false)
        XCTAssertEqual(state.changed(to: "the", marked: false, dictating: false).items, [], "a replacement is swallowed")
        XCTAssertTrue(state.desynced)
        XCTAssertEqual(state.changed(to: "the x", marked: false, dictating: false).items, text(" x"), "an append still goes")
        let ha = String(character(0xD558))
        XCTAssertEqual(state.changed(to: "the " + ha, marked: false, dictating: false).items, [], "no rewrite while desynced")
        state.reset()
        XCTAssertFalse(state.desynced)
    }

    /// Clause: a dictation sequence of placeholder, partial, revision and end
    /// sends its text ONCE, when it ends.
    func testDictationSendsItsTextOnceWhenItEnds() throws {
        let mark = String(Character(try XCTUnwrap(Unicode.Scalar(ScreenInputState.placeholderMark))))
        var state = ScreenInputState()
        _ = state.changed(to: "say ", marked: false, dictating: false)
        XCTAssertTrue(ScreenInputState.holdsPlaceholder("say " + mark))
        XCTAssertFalse(ScreenInputState.holdsPlaceholder("say "))
        XCTAssertEqual(state.changed(to: "say " + mark, marked: false, dictating: true).items, [], "the placeholder")
        XCTAssertEqual(state.changed(to: "say hel", marked: false, dictating: true).items, [], "a partial result")
        XCTAssertEqual(state.changed(to: "say hello wor", marked: false, dictating: true).items, [], "a revision")
        XCTAssertEqual(state.changed(to: "say hello world", marked: false, dictating: false).items, text("hello world"), "the end, once")
        XCTAssertEqual(state.changed(to: "say hello world", marked: false, dictating: false).items, [], "and never again")
    }

    /// Clause: the field empties once it holds 256 characters, never while
    /// text is marked.
    func testTheFieldEmptiesAtTwoHundredFiftySix() {
        var state = ScreenInputState()
        let long = String(repeating: "a", count: ScreenInputState.resetAt)
        let change = state.changed(to: long, marked: false, dictating: false)
        XCTAssertTrue(change.clear)
        XCTAssertEqual(state.previous, "")
        XCTAssertFalse(state.changed(to: long, marked: true, dictating: false).clear)
    }

    /// Clause: Control arms the next letter, either case, into its control
    /// key, Ctrl-C included; anything else is sent as typed and disarms it.
    func testControlIsOneShot() {
        var state = ScreenInputState()
        state.controlArmed = true
        XCTAssertEqual(state.changed(to: "c", marked: false, dictating: false).items, [.key(.controlC)])
        XCTAssertFalse(state.controlArmed)
        XCTAssertEqual(state.changed(to: "cc", marked: false, dictating: false).items, text("c"), "one shot")
        state.controlArmed = true
        XCTAssertEqual(state.changed(to: "ccD", marked: false, dictating: false).items, [.key(.controlD)], "either case")
        state.controlArmed = true
        XCTAssertEqual(state.changed(to: "ccD1", marked: false, dictating: false).items, text("1"), "not a letter: as typed")
        XCTAssertFalse(state.controlArmed)
        XCTAssertEqual(ScreenKeyName.control("z"), .controlZ)
        XCTAssertNil(ScreenKeyName.control("1"))
        XCTAssertNil(ScreenKeyName.control(character(0xE9)), "not ASCII")
    }

    /// Clause (rule ai): a text item is made by ONE function, which takes
    /// out every C0 control, DEL and C1 control; nothing left is no item.
    func testATextItemHoldsNoControl() throws {
        let bell = String(Character(try XCTUnwrap(Unicode.Scalar(0x07))))
        let del = String(Character(try XCTUnwrap(Unicode.Scalar(0x7F))))
        let csi = String(Character(try XCTUnwrap(Unicode.Scalar(0x9B))))
        XCTAssertEqual(KeyItem.typed("a" + bell + "b" + del + csi + "c"), .text("abc"))
        XCTAssertNil(KeyItem.typed(bell + del))
        XCTAssertNil(KeyItem.typed(""))
        let emoji = String(Character(try XCTUnwrap(Unicode.Scalar(0x1F44D))))
        XCTAssertEqual(KeyItem.typed(emoji), .text(emoji))
    }

    /// Clause: the keys encode as `{"t":…}` or `{"k":…}`, the 35 names are
    /// the Mac's own, word for word, and a named key other than Backspace
    /// stands alone.
    func testKeysEncodeAsTheMacReadsThem() throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        XCTAssertEqual(String(decoding: try encoder.encode(KeyItem.text("a/\"b")), as: UTF8.self), #"{"t":"a\/\"b"}"#)
        XCTAssertEqual(String(decoding: try encoder.encode(KeyItem.key(.controlC)), as: UTF8.self), #"{"k":"C-c"}"#)
        let pocket = try StyleSource.text("src/shared/ipc/pocket.ts")
        let start = try XCTUnwrap(pocket.range(of: "export const POCKET_SCREEN_KEY_NAMES = ["))
        let end = try XCTUnwrap(pocket.range(of: "] as const;", range: start.upperBound..<pocket.endIndex))
        let names = pocket[start.upperBound..<end.lowerBound].split(separator: "'").enumerated().filter { $0.offset % 2 == 1 }.map { String($0.element) }
        XCTAssertEqual(names, ScreenKeyName.allCases.map(\.rawValue), "the phone's names are not the Mac's")
        XCTAssertEqual(names.count, 35)
        XCTAssertFalse(KeyItem.key(.backspace).standsAlone)
        XCTAssertTrue(KeyItem.key(.escape).standsAlone)
        XCTAssertTrue(KeyItem.key(.controlC).standsAlone)
        XCTAssertFalse(KeyItem.text("a").standsAlone)
    }

    /// Clause (§Attack A9, rule aj): the hidden field takes no paste of any
    /// kind and no drop, makes no correction, prediction or Writing Tools
    /// edit, and asks for no ASCII-capable keyboard.
    @MainActor
    func testTheFieldRefusesPasteAndCorrections() {
        let field = ScreenTextView(frame: CGRect(x: 0, y: 0, width: 1, height: 1), textContainer: nil)
        for action in [
            #selector(UIResponderStandardEditActions.paste(_:)),
            #selector(UIResponderStandardEditActions.pasteAndMatchStyle(_:)),
            #selector(UIResponderStandardEditActions.pasteAndGo(_:)),
            #selector(UIResponderStandardEditActions.pasteAndSearch(_:)),
        ] {
            XCTAssertFalse(field.canPerformAction(action, withSender: nil), "\(action)")
        }
        XCTAssertNil(field.pasteConfiguration)
        XCTAssertNotNil(field.textDropDelegate)
        XCTAssertEqual(field.autocorrectionType, .no)
        XCTAssertEqual(field.spellCheckingType, .no)
        XCTAssertEqual(field.smartQuotesType, .no)
        XCTAssertEqual(field.smartDashesType, .no)
        XCTAssertEqual(field.smartInsertDeleteType, .no)
        XCTAssertEqual(field.autocapitalizationType, .none)
        XCTAssertEqual(field.inlinePredictionType, .no)
        XCTAssertEqual(field.writingToolsBehavior, UIWritingToolsBehavior.none)
        XCTAssertNotEqual(field.keyboardType, .asciiCapable)
        XCTAssertEqual(field.accessibilityIdentifier, ID.screenKeyField)
    }

    /// Clause: Backspace on the field sends `BSpace` even when it is empty.
    @MainActor
    func testTheFieldsBackspaceSendsBSpace() {
        let field = ScreenTextView(frame: CGRect(x: 0, y: 0, width: 1, height: 1), textContainer: nil)
        var sent: [KeyItem] = []
        field.onKeys = { sent.append(contentsOf: $0) }
        field.deleteBackward()
        XCTAssertEqual(sent, [.key(.backspace)])
    }
}
