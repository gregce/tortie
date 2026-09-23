import XCTest
@testable import Tortie

/// `Style/Copy.swift` against the Mac modules that own its words and the
/// approved mocks (build/p316/SPEC.md section 4.0 "Words", section 4 S2 builder
/// C). Each test names the clause it holds, and each fails when that clause is
/// taken out.
final class CopyTests: XCTestCase {
    private func entries() throws -> [StyleSource.Entry] {
        let parsed = StyleSource.copyEntries(try StyleSource.text("ios/Tortie/Style/Copy.swift"))
        XCTAssertEqual(parsed.problems, [], "Copy.swift is not written the way its header says")
        return parsed.entries
    }

    /// Clause: every word is declared exactly once, and says who owns it.
    func testEveryWordIsDeclaredOnceWithItsOwner() throws {
        let entries = try entries()
        XCTAssertGreaterThanOrEqual(entries.count, 40, "the reader found too few words to be reading the file")
        var seen: [String: String] = [:]
        for entry in entries {
            XCTAssertNotNil(entry.owner, "\(entry.name) says no owner")
            if let first = seen[entry.literal] {
                XCTFail("\(entry.name) repeats the word \(first) already declares")
            }
            seen[entry.literal] = entry.name
        }
    }

    /// Clause: "each the Mac's own word where one exists". The Mac module still
    /// says the text byte for byte, and the phone's word is the Mac's word in
    /// that text, whole (`StyleSource.macWordHolds`). A word re-typed or cut
    /// short on either side fails.
    func testEveryMacWordIsStillWhatTheMacSays() throws {
        var modules: [String: String] = [:]
        var owned = 0
        for entry in try entries() {
            guard case let .mac(path, needle)? = entry.owner else { continue }
            owned += 1
            let module: String
            if let read = modules[path] {
                module = read
            } else {
                module = try StyleSource.text(path)
                modules[path] = module
            }
            XCTAssertTrue(module.contains(needle), "\(entry.name): \(path) no longer says ⟦\(needle)⟧")
            XCTAssertTrue(
                StyleSource.macWordHolds(entry.literal, in: needle),
                "\(entry.name): its word is not the Mac's word inside ⟦\(needle)⟧"
            )
        }
        XCTAssertGreaterThanOrEqual(owned, 30)
        XCTAssertGreaterThanOrEqual(modules.count, 6)
    }

    /// Clause: a phone line that sends a person to a Mac control names a control
    /// the Mac still has, by the word the Mac draws on it.
    func testEveryMacControlAPhoneLineNamesStillExists() throws {
        var named = 0
        for entry in try entries() {
            for (path, needle) in entry.names {
                named += 1
                XCTAssertTrue(try StyleSource.text(path).contains(needle), "\(entry.name): \(path) no longer says ⟦\(needle)⟧")
                let word = try XCTUnwrap(StyleSource.quotedWord(needle), "\(entry.name): ⟦\(needle)⟧ quotes no word")
                XCTAssertTrue(entry.literal.contains(word), "\(entry.name) does not name \(word)")
            }
        }
        XCTAssertGreaterThanOrEqual(named, 3)
    }

    /// The reader reads what compiles: a few parsed values against the values
    /// the app was built with.
    func testTheTextIsWhatCompiles() throws {
        let byName = Dictionary(uniqueKeysWithValues: try entries().map { ($0.name, $0.literal) })
        XCTAssertEqual(byName["sessions"], Copy.sessions)
        XCTAssertEqual(byName["separator"], Copy.separator)
        XCTAssertEqual(byName["closeQuote"], Copy.closeQuote)
        XCTAssertEqual(byName["pairStepOnMac"], Copy.pairStepOnMac)
        XCTAssertEqual(byName["notPaired"], Copy.notPaired)
    }

    /// Clause: the words the approved screens draw are drawn as they are
    /// approved. Each line below is read out of the mock itself, between its
    /// tags, with the mock's own data put through the phone's composition.
    func testTheComposedLinesAreTheMocksLines() throws {
        let main = try StyleSource.text("docs/design/phone/Main.html")
        let session = try StyleSource.text("docs/design/phone/Session.html")
        let choice = try StyleSource.text("docs/design/phone/Choice.html")
        let pairing = try StyleSource.text("docs/design/phone/Pairing.html")
        let drawn: [(String, String)] = [
            (main, Copy.sessions),
            (main, Copy.needsYourInput(3)),
            (main, Copy.everythingElse(9)),
            (main, Copy.readAt("4:32 PM")),
            (main, Copy.joined(["Working", "webapp"])),
            (session, Copy.youAsked("make the session cookie httpOnly and…")),
            (session, Copy.messages),
            (session, Copy.lastMessage),
            (session, Copy.messageCounts(you: 20, agent: 21)),
            (session, Copy.yourPromptWord),
            (session, raised(Copy.agentLabel)),
            (choice, Copy.answerInTheSession),
            (pairing, Copy.pairTitle),
            // The mock's first step was corrected to this in 316.2: it named the
            // Mac's group heading, which cannot be pressed.
            (pairing, Copy.pairStepOnMac),
            (pairing, Copy.pairStepScan),
            (pairing, Copy.pairMatchLabel),
            (pairing, Copy.pairMatchNote),
        ]
        for (mock, line) in drawn {
            XCTAssertTrue(mock.contains(">" + line + "<"), "the mock does not draw \(line)")
        }
    }

    /// Clause: his rulings. No message box and no send control until Phase 318,
    /// no hand-off, no typed code and no Select: none of their words is here.
    func testNoWordOfAControlThePhoneDoesNotHave() throws {
        let refused = [
            "Message this session", "Send", "Sending…", "Goes to this session as one message.",
            "Open in Claude", "Open in Terminal", "Enter a code instead", "Select", "End with Face ID",
        ]
        for entry in try entries() {
            for word in refused where entry.literal.contains(word) {
                XCTFail("\(entry.name) carries \(word), which the phone does not draw in Phase 316")
            }
        }
    }

    /// The rule the Mac test leans on refuses a word cut short, in either kind
    /// of needle, and allows only a trailing full stop or space to drop.
    func testTheWordRuleRefusesAWordCutShort() {
        XCTAssertTrue(StyleSource.macWordHolds("Sessions", in: "SHEET_TITLE = 'Sessions'"))
        XCTAssertFalse(StyleSource.macWordHolds("Session", in: "SHEET_TITLE = 'Sessions'"))
        XCTAssertTrue(StyleSource.macWordHolds("”", in: "{'”. '}"))
        XCTAssertFalse(StyleSource.macWordHolds("”.", in: "{'”; '}"))
        XCTAssertTrue(StyleSource.macWordHolds("read ", in: "return `read ${clock}`"))
        XCTAssertFalse(StyleSource.macWordHolds("rea", in: "return `read ${clock}`"))
        XCTAssertFalse(StyleSource.macWordHolds("agent", in: "reagent`"))
    }

    /// The first letter raised, as the mock's style raises a label.
    private func raised(_ word: String) -> String {
        word.prefix(1).uppercased() + word.dropFirst()
    }
}
