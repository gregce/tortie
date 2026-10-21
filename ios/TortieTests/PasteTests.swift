import Foundation
import UIKit
import XCTest
@testable import Tortie

/// Paste into a session's Terminal, natively (Phase 348, build/p348/SPEC.md
/// D19 to D22, D27 to D31, D39 to D42, D53, D54; his ruling of 2026-10-18,
/// "i'd like to be able to paste natively ... just like how the clipboard
/// normally works on a phone or on a computer"): the phone's paste rule, the
/// pairing-code test spelled once, the one key sender's paste item stamped
/// at his press and never merged with keys, the hidden field's and the
/// content view's iOS-own paste, the menu of Copy then Paste, the write's own
/// answer and result, and where the clipboard is read. The door and the clock
/// are scripts; nothing reaches a network. Each test names the clause it
/// holds and fails when that clause is taken out of
/// Screens/ScreenKeyField.swift, Screens/ScreenKeys.swift,
/// Screens/ScreenTextInput.swift, Screens/Screen.swift, Door/Pairing.swift,
/// Door/Contract.swift or Door/DoorClient.swift.
@MainActor
final class PasteTests: XCTestCase {
    private var door: ScriptedScreenDoor!
    private var drawn: ScreenPicture?
    private var clock = ContinuousClock.now
    private let id = "00112233445566778899aabbccddeeff"

    override func setUp() async throws {
        door = ScriptedScreenDoor()
        drawn = ScreenSample.picture(paste: true)
        clock = ContinuousClock.now
    }

    private func sender() -> ScreenKeySender {
        ScreenKeySender(
            door: door,
            picture: { [unowned self] in self.drawn },
            now: { [unowned self] in self.clock },
            sleep: { _ in try? await Task.sleep(nanoseconds: 10_000_000) }
        )
    }

    private func settle() async {
        try? await Task.sleep(nanoseconds: 30_000_000)
        for _ in 0..<5 { await Task.yield() }
    }

    private func keysDone() -> WriteResult {
        .answered(PocketWriteAnswer(verb: .keys, write: id, outcome: .done, reason: nil, sentence: nil))
    }

    private func pasteAnswer(_ outcome: PocketWriteAnswer.Outcome, reason: String? = nil, sentence: String? = nil, write: String? = nil) -> PocketPasteAnswer {
        PocketPasteAnswer(verb: PocketPasteAnswer.verbWord, write: write ?? id, outcome: outcome, reason: reason, sentence: sentence)
    }

    // MARK: The phone's paste rule (D53)

    /// Clause (D53): an empty text is refused, and anything else that holds a
    /// character is not refused for its emptiness.
    func testTheRuleRefusesNothingToPaste() {
        XCTAssertEqual(ScreenPasteRule.refusal(""), .empty)
        XCTAssertNil(ScreenPasteRule.refusal(" "))
        XCTAssertNil(ScreenPasteRule.refusal("x"))
    }

    /// Clause (D29, D53): at most 16,384 bytes of UTF-8, the Mac's own cap
    /// (`POCKET_PASTE_MAX_TEXT_BYTES`), counted in BYTES and refused whole
    /// past it, never split.
    func testTheRuleRefusesPastTheCapInBytes() {
        XCTAssertEqual(ScreenPasteRule.mostBytes, 16_384)
        XCTAssertNil(ScreenPasteRule.refusal(String(repeating: "a", count: 16_384)))
        XCTAssertEqual(ScreenPasteRule.refusal(String(repeating: "a", count: 16_385)), .long)
        XCTAssertNil(ScreenPasteRule.refusal(String(repeating: "\u{E9}", count: 8_192)), "8,192 two-byte characters are 16,384 bytes")
        XCTAssertEqual(ScreenPasteRule.refusal(String(repeating: "\u{E9}", count: 8_193)), .long)
        XCTAssertNil(ScreenPasteRule.refusal(String(repeating: "\u{1F600}", count: 4_096)))
        XCTAssertEqual(ScreenPasteRule.refusal(String(repeating: "\u{1F600}", count: 4_097)), .long)
        let text = String(repeating: "line of text\n", count: 1_000)
        XCTAssertNil(ScreenPasteRule.refusal(text), "13,000 bytes of lines")
    }

    /// Clause (D51, D53): read SCALAR BY SCALAR, every C0 control but LF and
    /// TAB, DEL and every C1 control is refused, so a Windows line break,
    /// one Character, is refused for its CR; LF, TAB and every printable
    /// character, wide, combining or astral, are taken as they are.
    func testTheRuleRefusesEveryControlButLineFeedAndTab() throws {
        var controls: [UInt32] = Array(0x00...0x1f)
        controls.append(0x7f)
        controls.append(contentsOf: 0x80...0x9f)
        for value in controls {
            let scalar = try XCTUnwrap(Unicode.Scalar(value))
            var view = String.UnicodeScalarView()
            view.append("a")
            view.append(scalar)
            view.append("b")
            let text = String(view)
            if value == 0x0a || value == 0x09 {
                XCTAssertNil(ScreenPasteRule.refusal(text), String(format: "U+%04X", value))
            } else {
                XCTAssertEqual(ScreenPasteRule.refusal(text), .character, String(format: "U+%04X", value))
            }
        }
        XCTAssertEqual(ScreenPasteRule.refusal("a\r\nb"), .character, "a Windows line break is one Character; its CR is refused")
        XCTAssertEqual("a\r\nb".count, 3, "the CR LF is one Character")
        XCTAssertEqual(ScreenPasteRule.refusal("x\u{1b}[201~ echo y\n"), .character, "the 3.6a bracket-close injection")
        XCTAssertNil(ScreenPasteRule.refusal("git commit -m 'one'\ngit push\n"))
        XCTAssertNil(ScreenPasteRule.refusal("a\tb\tc"))
        XCTAssertNil(ScreenPasteRule.refusal("\u{E9} \u{1F600} \u{4E2D} \u{2028} x \u{0301}e"), "every printable scalar, U+2028 among them")
        XCTAssertTrue(ScreenPasteRule.lineFeeds.contains("\n"))
        XCTAssertEqual(ScreenPasteRule.lineFeeds, Set(ScreenInputState.lineFeed.unicodeScalars), "a line feed has one spelling (rule aj)")
    }

    /// Clause (D53, rule p): a text that reads as a Tortie pairing code is
    /// refused with nothing sent, whatever white space or line breaks lead or
    /// trail it; a code inside other text, a newer or older Mac's code, and
    /// a JSON that is not a code's marker are told apart by the one marker
    /// `parse` asks.
    func testTheRuleRefusesAPairingCode() throws {
        let v = try DoorVectorFile.load()
        XCTAssertFalse(v.qr.isEmpty, "vectors.json holds no QR payload")
        for qr in v.qr {
            XCTAssertEqual(ScreenPasteRule.refusal(qr.payload), .code, qr.name)
            XCTAssertEqual(ScreenPasteRule.refusal("  \n" + qr.payload + "\n\t "), .code, "\(qr.name) with blanks round it")
            XCTAssertTrue(PairingOffer.readsAsCode(qr.payload))
            XCTAssertNoThrow(try PairingOffer.parse(qr.payload), "the marker moved and parse no longer reads a code")
            XCTAssertNil(ScreenPasteRule.refusal("the code was " + qr.payload), "a code inside other text is not a code")
        }
        var marker = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(try XCTUnwrap(v.qr.first).payload.utf8)) as? [String: Any])
        marker["v"] = 4
        let newer = String(decoding: try JSONSerialization.data(withJSONObject: marker), as: UTF8.self)
        XCTAssertEqual(ScreenPasteRule.refusal(newer), .code, "a newer Mac's code is a code")
        marker["fp"] = Base64URL.encode(Data(repeating: 1, count: 31))
        let short = String(decoding: try JSONSerialization.data(withJSONObject: marker), as: UTF8.self)
        XCTAssertNil(ScreenPasteRule.refusal(short), "an fp of 31 bytes is not the marker")
        XCTAssertFalse(PairingOffer.readsAsCode(#"{"v":3}"#))
        XCTAssertFalse(PairingOffer.readsAsCode("not json"))
        XCTAssertFalse(PairingOffer.readsAsCode(""))
    }

    /// Clause (D53): each refusal's sentence is the Mac's own words for the
    /// three it refuses too, and the phone's for a pairing code; the order is
    /// empty, long, character, code.
    func testEachRefusalSaysItsSentence() {
        XCTAssertEqual(ScreenPasteRefusal.empty.sentence, Copy.pasteEmpty)
        XCTAssertEqual(ScreenPasteRefusal.long.sentence, Copy.pasteTooLong)
        XCTAssertEqual(ScreenPasteRefusal.character.sentence, Copy.pasteCharacter)
        XCTAssertEqual(ScreenPasteRefusal.code.sentence, Copy.pasteCode)
        XCTAssertEqual(Copy.pasteEmpty, "There is nothing to paste.")
        XCTAssertEqual(Copy.pasteTooLong, "That is too long to paste. Nothing was pasted.")
        XCTAssertEqual(Copy.pasteCharacter, "That holds a character Tortie does not paste. Nothing was pasted.")
        XCTAssertEqual(Copy.pasteCode, "That looks like a Tortie pairing code, so it was not pasted.")
        XCTAssertEqual(ScreenPasteRule.refusal(String(repeating: "\u{1b}", count: 16_385)), .long, "long comes before character")
    }

    /// Clause (D53, rule p): the marker is spelled ONCE, in one private
    /// function `parse` and `readsAsCode` both call.
    func testTheMarkerIsSpelledOnce() throws {
        let pairing = try StyleSource.text("ios/Tortie/Door/Pairing.swift")
        XCTAssertEqual(pairing.components(separatedBy: "JSONDecoder().decode(Marker.self").count, 2, "the marker is decoded more than once")
        XCTAssertEqual(pairing.components(separatedBy: "private static func markerOf(_ payload: String) -> Marker? {").count, 2)
        XCTAssertTrue(pairing.contains("guard let marker = markerOf(payload) else {"), "parse does not ask the one marker")
        XCTAssertTrue(pairing.contains("markerOf(payload) != nil || markerOf(payload.trimmingCharacters(in: .whitespacesAndNewlines)) != nil"))
        let field = try StyleSource.text("ios/Tortie/Screens/ScreenKeyField.swift")
        XCTAssertTrue(field.contains("if PairingOffer.readsAsCode(payload) { return .code }"))
    }

    // MARK: The one sender (D31, D54)

    /// Clause (D31, D54): a paste waiting behind a keys write carries the
    /// picture of HIS PRESS (its turn and dialog), never the picture drawn
    /// when it goes, its text exactly, with no Return added, ALONE in its
    /// write.
    func testAPasteWaitingBehindAWriteCarriesThePictureOfItsPress() async {
        let keys = sender()
        keys.send([.text("a")])
        await settle()
        XCTAssertEqual(door.asked.count, 1)
        let pressed = ScreenSample.picture(revision: "aaaaaaaaaaaa", turn: "0123456789abcdef-4", paste: true)
        drawn = pressed
        keys.paste("git status\nls")
        XCTAssertEqual(keys.pending, [.paste(ScreenPasteItem(text: "git status\nls", turn: "0123456789abcdef-4", dialog: nil, revision: "aaaaaaaaaaaa"))])
        drawn = ScreenSample.picture(revision: "bbbbbbbbbbbb", turn: "0123456789abcdef-5", paste: true)
        keys.pictureChanged()
        clock = clock.advanced(by: .milliseconds(150))
        door.answer(keysDone())
        await settle()
        XCTAssertEqual(door.pastesAsked, [ScriptedScreenDoor.PasteAsked(text: "git status\nls", turn: "0123456789abcdef-4", dialog: nil)])
        XCTAssertEqual(door.writeOrder, ["keys", "paste"])
        XCTAssertFalse(door.pastesAsked.first?.text.hasSuffix("\r") ?? true, "a Return was added")
    }

    /// Clause (D54): a paste is never merged with keys and never split:
    /// keys typed before it, the paste, and keys typed after it are three
    /// writes, in the order he made them.
    func testAPasteIsNeverMergedWithKeys() async {
        let keys = sender()
        keys.send([.text("a")])
        await settle()
        keys.paste(String(repeating: "p", count: 5_000))
        keys.send([.text("b")])
        clock = clock.advanced(by: .milliseconds(150))
        door.answer(keysDone())
        await settle()
        XCTAssertEqual(door.writeOrder, ["keys", "paste"])
        XCTAssertEqual(door.pastesAsked.first?.text.count, 5_000, "a paste was split")
        XCTAssertEqual(keys.pending, [.key(.text("b"))])
        clock = clock.advanced(by: .milliseconds(150))
        door.answerPaste(.answered(pasteAnswer(.done)))
        await settle()
        XCTAssertEqual(door.writeOrder, ["keys", "paste", "keys"])
        XCTAssertEqual(door.asked.map(\.keys), [[.text("a")], [.text("b")]])
    }

    /// Clause (D53): a paste the rule refuses sends nothing, queues nothing,
    /// returns nothing to live, and draws its sentence.
    func testAPasteTheRuleRefusesSendsNothing() async {
        let keys = sender()
        var live = 0
        keys.onSend = { live += 1 }
        keys.paste("rm -rf build\r")
        await settle()
        XCTAssertEqual(keys.line, Copy.pasteCharacter)
        XCTAssertTrue(keys.pending.isEmpty)
        XCTAssertTrue(door.pastesAsked.isEmpty)
        XCTAssertEqual(live, 0)
        keys.paste("")
        XCTAssertEqual(keys.line, Copy.pasteEmpty)
    }

    /// Clause (D54): on a picture that takes no keys nothing is queued, and
    /// the line says so; inside a question against a spent picture nothing
    /// is queued, and the line says to wait for the redraw.
    func testAPasteTheScreenCannotTakeIsNotQueued() async {
        drawn = ScreenSample.picture(typable: false, paste: true)
        let keys = sender()
        keys.paste("ls")
        await settle()
        XCTAssertEqual(keys.line, Copy.screenCannotType)
        XCTAssertTrue(door.pastesAsked.isEmpty)
        drawn = ScreenSample.picture(turn: "0123456789abcdef-1", asking: true, dialog: "a1b2c3d4e5f6", paste: true)
        let asking = sender()
        asking.send([.key(.down)])
        await settle()
        asking.paste("yes")
        XCTAssertEqual(asking.line, Copy.screenWaitForRedraw, "a paste against a spent question was queued")
        XCTAssertTrue(asking.pending.isEmpty)
        XCTAssertTrue(door.pastesAsked.isEmpty)
    }

    /// Clause (D54): a paste's answer holds the one-batch-per-picture lock as
    /// a keys write's does: `done` by the turn it carried, `changed` by its
    /// revision with the Mac's sentence, anything else released with
    /// `pasteSentence`; and a paste returns the Terminal to live.
    func testThePastesAnswerHoldsTheLockAsKeysDo() async {
        drawn = ScreenSample.picture(revision: "aaaaaaaaaaaa", turn: "0123456789abcdef-1", asking: true, dialog: "a1b2c3d4e5f6", paste: true)
        let keys = sender()
        var live = 0
        keys.onSend = { live += 1 }
        keys.paste("1")
        XCTAssertEqual(live, 1, "a paste did not return the Terminal to live")
        await settle()
        XCTAssertEqual(door.pastesAsked.first?.dialog, "a1b2c3d4e5f6")
        clock = clock.advanced(by: .milliseconds(150))
        door.answerPaste(.answered(pasteAnswer(.done)))
        await settle()
        keys.send([.key(.enter)])
        XCTAssertEqual(keys.line, Copy.screenWaitForRedraw, "the lock did not hold after a done paste")
        drawn = ScreenSample.picture(revision: "cccccccccccc", turn: "0123456789abcdef-2", asking: true, dialog: "a1b2c3d4e5f6", paste: true)
        keys.pictureChanged()
        keys.paste("2")
        await settle()
        let changed = PasteResult.answered(pasteAnswer(
            .refused, reason: "changed", sentence: "The question on this session changed since your terminal was drawn. Nothing was typed."
        ))
        clock = clock.advanced(by: .milliseconds(150))
        door.answerPaste(changed)
        await settle()
        XCTAssertEqual(keys.line, DoorWords.pasteSentence(for: changed))
        XCTAssertTrue(keys.lockHolds(ScreenSample.picture(revision: "cccccccccccc", turn: "0123456789abcdef-9", asking: true, dialog: "a1b2c3d4e5f6")), "changed did not lock by the revision")
        XCTAssertFalse(keys.lockHolds(ScreenSample.picture(revision: "dddddddddddd", turn: "0123456789abcdef-2", asking: true, dialog: "a1b2c3d4e5f6")))
        drawn = ScreenSample.picture(revision: "dddddddddddd", turn: "0123456789abcdef-3", paste: true)
        keys.pictureChanged()
        keys.paste("3")
        await settle()
        clock = clock.advanced(by: .milliseconds(150))
        door.answerPaste(.notTaken)
        await settle()
        XCTAssertEqual(keys.line, Copy.pasteNotTaken)
        XCTAssertFalse(keys.lockHolds(drawn!))
    }

    /// Clause (D30): Paste is offered exactly where the Mac says it takes one
    /// (the picture's `paste` and `typable`) on a door that pastes, and not
    /// once the sender stopped.
    func testPasteIsOfferedOnlyWhereTheMacTakesOne() {
        XCTAssertTrue(sender().pasteOffered)
        drawn = ScreenSample.picture()
        XCTAssertFalse(sender().pasteOffered, "a Mac older than 348, or one whose Allow waits")
        drawn = ScreenSample.picture(typable: false, paste: true)
        XCTAssertFalse(sender().pasteOffered, "a screen that takes no keys")
        drawn = ScreenSample.picture(paste: true)
        door = ScriptedScreenDoor(pastes: false)
        XCTAssertFalse(sender().pasteOffered, "a door that pastes nothing")
        door = ScriptedScreenDoor()
        let keys = sender()
        keys.stop()
        XCTAssertFalse(keys.pasteOffered)
        drawn = nil
        XCTAssertFalse(sender().pasteOffered)
    }

    /// Clause (D54): leaving the app drops a paste still waiting, with the
    /// keys.
    func testStopDropsAWaitingPaste() async {
        let keys = sender()
        keys.send([.text("a")])
        await settle()
        keys.paste("queued")
        keys.stop()
        await settle()
        XCTAssertTrue(keys.pending.isEmpty)
        XCTAssertTrue(door.pastesAsked.isEmpty, "a paste went after the app left")
    }

    // MARK: The hidden field (D35, D41)

    /// Clause (D35, D41): the field refuses Paste and Match Style, Paste and
    /// Go and Paste and Search always, and takes iOS's own paste only while
    /// the page says the Mac takes one and the clipboard holds text.
    func testTheFieldTakesIOSsOwnPasteOnlyWhenTheMacDoes() {
        let field = ScreenTextView(frame: CGRect(x: 0, y: 0, width: 1, height: 1), textContainer: nil)
        XCTAssertEqual(ScreenTextView.refused, [
            #selector(UIResponderStandardEditActions.pasteAndMatchStyle(_:)),
            #selector(UIResponderStandardEditActions.pasteAndGo(_:)),
            #selector(UIResponderStandardEditActions.pasteAndSearch(_:)),
        ])
        UIPasteboard.general.string = "p348 field"
        XCTAssertFalse(field.canPerformAction(#selector(UIResponderStandardEditActions.paste(_:)), withSender: nil), "offered with no word of the page's")
        field.pasteOffered = { true }
        XCTAssertTrue(field.canPerformAction(#selector(UIResponderStandardEditActions.paste(_:)), withSender: nil))
        for action in ScreenTextView.refused {
            XCTAssertFalse(field.canPerformAction(action, withSender: nil), "\(action)")
        }
        UIPasteboard.general.items = []
        XCTAssertFalse(field.canPerformAction(#selector(UIResponderStandardEditActions.paste(_:)), withSender: nil), "offered over an empty clipboard")
        XCTAssertNil(field.pasteConfiguration)
        XCTAssertNotNil(field.textDropDelegate, "a drop is no longer refused")
    }

    /// Clause (D41): the field's paste reads the clipboard once and hands it
    /// to the page's one paste, NEVER into its own text, so nothing of it is
    /// typed, composed or sent as keys.
    func testTheFieldsPasteGoesToThePageNeverIntoItsText() {
        let field = ScreenTextView(frame: CGRect(x: 0, y: 0, width: 1, height: 1), textContainer: nil)
        var pasted: [String] = []
        var typed: [[KeyItem]] = []
        field.onPaste = { pasted.append($0) }
        field.onKeys = { typed.append($0) }
        field.state.controlArmed = true
        UIPasteboard.general.string = "echo one\necho two"
        field.paste(nil)
        XCTAssertEqual(pasted, ["echo one\necho two"])
        XCTAssertEqual(field.text, "", "a paste went into the field's text")
        XCTAssertTrue(typed.isEmpty, "a paste was sent as keys")
        UIPasteboard.general.items = []
        field.paste(nil)
        XCTAssertEqual(pasted.count, 1, "an empty clipboard pasted")
    }

    /// Clause (D20): a paste disarms Control as every key of the bar does, in
    /// the field's own state and on the bar, so the next letter he types is a
    /// letter; the page's one paste asks it before the sender.
    func testAPasteDisarmsControl() throws {
        let bar = ScreenKeyBarModel()
        let view = ScreenKeyField(typing: .constant(true), bar: bar, onKeys: { _ in }, pasteOffered: { true }, onPaste: { _ in })
        let coordinator = view.makeCoordinator()
        let field = ScreenTextView(frame: CGRect(x: 0, y: 0, width: 1, height: 1), textContainer: nil)
        coordinator.field = field
        field.state.controlArmed = true
        bar.controlArmed = true
        coordinator.disarm()
        XCTAssertFalse(field.state.controlArmed)
        XCTAssertFalse(bar.controlArmed)
        let page = try StyleSource.text("ios/Tortie/Screens/Screen.swift")
        XCTAssertTrue(page.contains("        selected(nil)\n        bar.disarm?()\n        keys?.paste(payload)"), "the page's one paste does not disarm Control before it sends")
        let source = try StyleSource.text("ios/Tortie/Screens/ScreenKeyField.swift")
        XCTAssertTrue(source.contains("bar.disarm = { [weak coordinator = context.coordinator] in coordinator?.disarm() }"))
    }

    // MARK: The content view and the menu (D39, D40, D42)

    private func content(offered: Bool, pasted: @escaping @MainActor (String) -> Void = { _ in }) -> ScreenTextContent {
        let view = ScreenTextContent()
        view.selection = ScreenSelectionRange(start: ScreenPoint(row: 0, column: 0), end: ScreenPoint(row: 0, column: 1))
        view.drawn = { _ in true }
        view.events = ScreenTextEvents(select: { _ in }, copy: {}, pasteOffered: { offered }, paste: pasted)
        return view
    }

    /// Clause (D39): the menu is built from nothing: Copy, then, while the
    /// page says the Mac takes a paste, iOS's OWN paste command, a
    /// `UICommand` with the standard `paste(_:)` selector, never a
    /// `UIAction`; the suggested actions are never read.
    func testTheMenuIsCopyThenIOSsOwnPaste() throws {
        let suggested = [UIAction(title: "Look Up") { _ in }, UIAction(title: "Translate") { _ in }]
        let plain = content(offered: false)
        let interaction = UIEditMenuInteraction(delegate: plain)
        let configuration = UIEditMenuConfiguration(identifier: nil, sourcePoint: .zero)
        let alone = try XCTUnwrap(plain.editMenuInteraction(interaction, menuFor: configuration, suggestedActions: suggested))
        XCTAssertEqual(alone.children.count, 1)
        XCTAssertEqual((alone.children.first as? UIAction)?.title, Copy.copy)
        let offered = content(offered: true)
        let menu = try XCTUnwrap(offered.editMenuInteraction(UIEditMenuInteraction(delegate: offered), menuFor: configuration, suggestedActions: suggested))
        XCTAssertEqual(menu.children.count, 2, "the menu holds more than Copy and Paste")
        XCTAssertEqual((menu.children.first as? UIAction)?.title, Copy.copy)
        let paste = try XCTUnwrap(menu.children.last as? UICommand, "Paste is not a UICommand")
        XCTAssertFalse(menu.children.last is UIAction, "Paste is a UIAction, which raises iOS's Allow Paste alert")
        XCTAssertEqual(paste.action, #selector(UIResponderStandardEditActions.paste(_:)))
        XCTAssertEqual(paste.title, Copy.paste)
        XCTAssertEqual(paste.accessibilityIdentifier, ID.screenPaste)
        let source = try StyleSource.text("ios/Tortie/Screens/ScreenTextInput.swift")
        let start = try XCTUnwrap(source.range(of: "suggestedActions: [UIMenuElement]) -> UIMenu? {"))
        let end = try XCTUnwrap(source.range(of: "\n    }\n", range: start.upperBound..<source.endIndex))
        XCTAssertFalse(String(source[start.upperBound..<end.lowerBound]).contains("suggestedActions"), "the suggested actions are read")
    }

    /// Clause (D40, D42): the content view takes the command whoever is first
    /// responder, only while offered and the clipboard holds text, and its
    /// `paste(_:)` reads the clipboard once and hands it to the page.
    func testTheContentViewTakesTheCommandOnlyWhenOffered() {
        var pasted: [String] = []
        let view = content(offered: true) { pasted.append($0) }
        UIPasteboard.general.string = "from another app"
        XCTAssertTrue(view.canPerformAction(#selector(UIResponderStandardEditActions.paste(_:)), withSender: nil))
        view.paste(nil)
        XCTAssertEqual(pasted, ["from another app"])
        XCTAssertFalse(content(offered: false).canPerformAction(#selector(UIResponderStandardEditActions.paste(_:)), withSender: nil))
        UIPasteboard.general.items = []
        XCTAssertFalse(view.canPerformAction(#selector(UIResponderStandardEditActions.paste(_:)), withSender: nil), "offered over an empty clipboard")
        XCTAssertFalse(view.canBecomeFirstResponder)
        XCTAssertFalse(ScreenTextEvents.none.pasteOffered())
    }

    /// Clause (D40, D42, rule al): in each of the two files that take iOS's
    /// own paste, the clipboard's string is read inside its `paste(_:)`
    /// override and nowhere else, once, synchronously, straight into the
    /// page's one paste; `hasStrings` is asked inside its `canPerformAction`
    /// and nowhere else; neither file offers a `UIAction` titled Paste. The
    /// sample world and its reader name the pasteboard nowhere: a paste in the
    /// sample is the page's own text. ScreenSelectionTests holds that no
    /// other file names it.
    func testTheClipboardIsReadOnlyInsideThePasteOverrides() throws {
        for file in ["Sample/SampleWorld.swift", "Sample/SampleReader.swift", "Sample/SampleBook.swift"] {
            XCTAssertFalse(try StyleSource.text("ios/Tortie/" + file).contains("UIPasteboard"), file)
        }
        let hands = [
            "Screens/ScreenTextInput.swift": "events.paste(payload)",
            "Screens/ScreenKeyField.swift": "onPaste?(payload)",
        ]
        for (file, hand) in hands {
            let code = try ScreenSelectionTests.code("ios/Tortie/" + file)
            let paste = try Self.braced("override func paste(_ sender: Any?) {", in: code)
            XCTAssertEqual(ScreenSelectionTests.pasteboardPaths(paste), ["UIPasteboard.general.string"], "\(file): paste(_:) does not read the string, once")
            XCTAssertTrue(paste.contains("guard let payload = UIPasteboard.general.string else { return }\n        \(hand)\n    }"), "\(file): the read is not handed straight to the page")
            let asked = try Self.braced("override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {", in: code)
            XCTAssertEqual(ScreenSelectionTests.pasteboardPaths(asked), ["UIPasteboard.general.hasStrings"], "\(file): canPerformAction does not ask hasStrings, once")
            XCTAssertEqual(ScreenSelectionTests.pasteboardPaths(code).count, 2, "\(file) names the pasteboard outside its two overrides")
            XCTAssertFalse(code.contains("UIAction(title: Copy.paste"), "\(file): a Paste UIAction")
        }
    }

    /// The text of the declaration that begins at `head`, to its closing brace.
    static func braced(_ head: String, in source: String) throws -> String {
        let start = try XCTUnwrap(source.range(of: head), "no \(head)").lowerBound
        var depth = 0
        var index = start
        while index < source.endIndex {
            switch source[index] {
            case "{":
                depth += 1
            case "}":
                depth -= 1
                if depth == 0 { return String(source[start...index]) }
            default:
                break
            }
            index = source.index(after: index)
        }
        XCTFail("\(head) never closes")
        return ""
    }

    // MARK: The write (D27, D28, D54)

    private func encoded<T: Encodable>(_ body: T) throws -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        return String(decoding: try encoder.encode(body), as: UTF8.self)
    }

    /// Clause (D28): the body is exactly `dialog`, `session`, `text`, `turn`
    /// and `write`, sorted, `dialog` written as null when the picture had
    /// none, and the text exactly as handed; the worst legal body (16,384
    /// controls, each escaped) is within the door's cap of 131,072.
    func testTheBodyIsExactlyItsFiveKeys() throws {
        XCTAssertEqual(
            try encoded(PasteBody(dialog: nil, session: "s", text: "a\nb", turn: "0123456789abcdef-1", write: id)),
            #"{"dialog":null,"session":"s","text":"a\nb","turn":"0123456789abcdef-1","write":"00112233445566778899aabbccddeeff"}"#
        )
        let keys = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(try encoded(PasteBody(dialog: "a1b2c3d4e5f6", session: "s", text: "t", turn: "u", write: id)).utf8)) as? [String: Any]).keys.sorted()
        XCTAssertEqual(keys, ["dialog", "session", "text", "turn", "write"], "nothing else leaves the phone, and nothing is a size")
        let worst = try encoded(PasteBody(
            dialog: "a1b2c3d4e5f6", session: String(repeating: "x", count: 128), text: String(repeating: "\u{1}", count: 16_384),
            turn: String(repeating: "f", count: 16) + "-9007199254740991", write: id
        ))
        XCTAssertGreaterThan(worst.utf8.count, 90_000)
        XCTAssertLessThanOrEqual(worst.utf8.count, 131_072)
        XCTAssertEqual(DoorClient.pasteTarget, "/v1/paste")
        XCTAssertEqual(WriteRoute.paste(session: "s", text: "t", turn: "u", dialog: nil).target, DoorClient.pasteTarget)
        XCTAssertNil(WriteRoute.paste(session: "s", text: "t", turn: "u", dialog: nil).verb)
    }

    /// Clause (D27): the answer refuses whole unless it names the paste, a
    /// non-empty reason comes exactly with `refused` (an OPEN word: `machine`
    /// and a later Mac's own), and a non-empty sentence exactly with every
    /// outcome but `done`.
    func testTheAnswerIsStrictWithAnOpenReason() {
        func decodes(_ json: String) -> PocketPasteAnswer? {
            try? JSONDecoder().decode(PocketPasteAnswer.self, from: Data(json.utf8))
        }
        XCTAssertNotNil(decodes(#"{"verb":"paste","write":"\#(id)","outcome":"done","reason":null,"sentence":null}"#))
        XCTAssertNotNil(decodes(#"{"verb":"paste","write":"\#(id)","outcome":"refused","reason":"machine","sentence":"Tortie pastes only into sessions on this Mac. Nothing was pasted."}"#))
        XCTAssertNotNil(decodes(#"{"verb":"paste","write":"\#(id)","outcome":"refused","reason":"a-later-macs-word","sentence":"s."}"#))
        XCTAssertNil(decodes(#"{"verb":"keys","write":"\#(id)","outcome":"done","reason":null,"sentence":null}"#))
        XCTAssertNil(decodes(#"{"verb":"paste","write":"\#(id)","outcome":"done","reason":"machine","sentence":null}"#))
        XCTAssertNil(decodes(#"{"verb":"paste","write":"\#(id)","outcome":"refused","reason":null,"sentence":"s."}"#))
        XCTAssertNil(decodes(#"{"verb":"paste","write":"\#(id)","outcome":"failed","reason":null,"sentence":""}"#))
        XCTAssertNil(decodes(#"{"verb":"paste","write":"\#(id)","outcome":"done","sentence":null}"#))
        XCTAssertEqual(decodes(#"{"verb":"paste","write":"","outcome":"refused","reason":"malformed","sentence":"s."}"#)?.echoesNoId, true)
    }

    private func reply(_ status: Int, _ json: String, handed: Bool = true) -> ExchangeEnd {
        ExchangeEnd(result: .success(DoorReply(status: status, body: Data(json.utf8))), handed: handed)
    }

    /// Clause (D54): one exchange's end is read as a paste's result exactly
    /// as a start's is, and `pasteSentence` is always a sentence.
    func testTheResultIsClassifiedAsAStartsIsAndAlwaysSaysASentence() {
        let done = #"{"verb":"paste","write":"\#(id)","outcome":"done","reason":null,"sentence":null}"#
        XCTAssertEqual(PasteResult.of(reply(200, done), sent: id), .answered(pasteAnswer(.done)))
        XCTAssertEqual(PasteResult.of(reply(200, done), sent: "ffeeddccbbaa99887766554433221100"), .noAnswer)
        XCTAssertEqual(PasteResult.of(reply(200, #"{"verb":"remove","write":"\#(id)","outcome":"done","reason":null,"sentence":null}"#), sent: id), .noAnswer)
        XCTAssertEqual(PasteResult.of(reply(404, ""), sent: id), .notTaken)
        XCTAssertEqual(PasteResult.of(ExchangeEnd(result: .failure(DoorFailure.cancelled), handed: false), sent: id), .notSent(.cancelled))
        XCTAssertEqual(PasteResult.of(ExchangeEnd(result: .failure(DoorFailure.timedOut), handed: true), sent: id), .noAnswer)
        XCTAssertTrue(PasteResult.notSent(.cancelled).withheld)
        XCTAssertEqual(PostEnd.ended(reply(404, ""), write: id).asPaste, .notTaken)
        XCTAssertEqual(DoorWords.pasteSentence(for: .answered(pasteAnswer(.done))), Copy.replySent)
        XCTAssertEqual(DoorWords.pasteSentence(for: .answered(pasteAnswer(.refused, reason: "machine", sentence: "Mac's words."))), "Mac's words.")
        XCTAssertEqual(DoorWords.pasteSentence(for: .notTaken), Copy.pasteNotTaken)
        XCTAssertEqual(DoorWords.pasteSentence(for: .noAnswer), Copy.endNoAnswer)
        XCTAssertEqual(DoorWords.pasteSentence(for: .notSent(.cancelled)), Copy.pasteNotTaken)
        XCTAssertEqual(DoorWords.pasteSentence(for: .notSent(.unreachable(code: 61))), Copy.cannotReachMac)
        XCTAssertEqual(Copy.pasteNotTaken, "Your Mac did not take it. Nothing was pasted.")
        XCTAssertEqual(Copy.paste, "Paste")
        XCTAssertEqual(ID.screenPaste, "screen-paste")
    }

    /// Clause (D30): the screen answer's `paste` is read strictly when
    /// present, absent reads false, and the picture carries it.
    func testTheScreenCarriesTheMacsPasteFlag() throws {
        XCTAssertEqual(try ScreenSample.decode(ScreenSample.answer(screen: ScreenSample.screen(paste: true))).screen?.paste, true)
        XCTAssertEqual(try ScreenSample.decode(ScreenSample.answer(screen: ScreenSample.screen(paste: false))).screen?.paste, false)
        XCTAssertEqual(try ScreenSample.decode(ScreenSample.answer()).screen?.paste, false, "a Mac older than 348 offers a paste")
        XCTAssertThrowsError(try ScreenSample.decode(ScreenSample.answer(screen: ScreenSample.screen(paste: "yes"))), "a paste flag that is not a boolean")
        XCTAssertTrue(ScreenSample.picture(paste: true).paste)
        XCTAssertFalse(ScreenSample.picture().paste)
    }

    // MARK: The sample (D34)

    /// Clause (D34): the sample's Terminal takes a paste and echoes it on its
    /// own prompt as typed text is, its line feed as the prompt's Return
    /// (the prompt empties and the note row says what a Return says), and
    /// nothing leaves the phone. Over the tests' own book, and over the book
    /// the app carries.
    func testTheSamplesPasteIsEchoedOnItsPrompt() async throws {
        let fixture = SampleBookFixture.book()
        let rows = try XCTUnwrap(try fixture.screen(id: "s-idle", variant: "live", at: 1).rows)
        let sample = SampleReader(book: fixture)
        let door = try XCTUnwrap(sample.screenDoor("s-idle"))
        XCTAssertTrue(door.pastes)
        let before = try await door.read(since: nil)
        let typed = await door.paste("ls -la", turn: before.screen?.turn ?? "", dialog: nil)
        guard case .answered(let answer) = typed else { return XCTFail("the sample's paste was not done: \(typed)") }
        XCTAssertEqual(answer.outcome, .done)
        let echoedAnswer = try await door.read(since: nil)
        let echoed = try XCTUnwrap(echoedAnswer.screen)
        XCTAssertEqual(echoed.lines[rows.prompt.row].last, PocketScreenRun(text: "ls -la", runStyle: rows.prompt.style, runCells: 6), "the paste is not echoed on the prompt")
        _ = await door.paste("\n", turn: echoed.turn, dialog: nil)
        let returnedAnswer = try await door.read(since: nil)
        let returned = try XCTUnwrap(returnedAnswer.screen)
        let note = try XCTUnwrap(rows.note)
        XCTAssertEqual(
            returned.lines[note.row].map(\.text).joined(), String(SampleWorld.nothingRan.prefix(returned.screenColumns)),
            "a pasted line feed is not the prompt's Return"
        )
        XCTAssertEqual(returned.lines[rows.prompt.row], try XCTUnwrap(before.screen).lines[rows.prompt.row], "the prompt kept its text after the Return")

        let book = try XCTUnwrap(SampleBook.bundled(), "the app carries no sample")
        let reader = SampleReader(book: book)
        let screen = try XCTUnwrap(reader.screenDoor("sample-3"))
        XCTAssertTrue(screen.pastes)
        let first = try await screen.read(since: nil)
        XCTAssertEqual(first.screen?.paste, true, "the sample's live picture offers no paste: run node build/p3333/sample.mjs")
        let result = await screen.paste("ls", turn: first.screen?.turn ?? "", dialog: nil)
        guard case .answered(let done) = result else { return XCTFail("\(result)") }
        XCTAssertEqual(done.outcome, .done)
        let after = try await screen.read(since: nil)
        XCTAssertNotEqual(after.revision, first.revision, "the paste moved nothing")
    }
}
