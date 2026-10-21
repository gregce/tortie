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
        var byEntry: [String: Int] = [:]
        for entry in try entries() {
            for (path, needle) in entry.names {
                named += 1
                byEntry[entry.name, default: 0] += 1
                XCTAssertTrue(try StyleSource.text(path).contains(needle), "\(entry.name): \(path) no longer says ⟦\(needle)⟧")
                let word = try XCTUnwrap(StyleSource.quotedWord(needle), "\(entry.name): ⟦\(needle)⟧ quotes no word")
                XCTAssertTrue(entry.literal.contains(word), "\(entry.name) does not name \(word)")
            }
        }
        // Phase 333.1 (D25): nine, being Pair under the name that did not
        // reach the internet, Remove, Settings and Phone under Unpair's note,
        // Settings and Phone under the second step, and Allow, Settings and
        // Phone under the line that sends a person back to Allow.
        XCTAssertEqual(named, 9)
        XCTAssertEqual(byEntry, ["pairNameNotFound": 1, "unpairNote": 3, "setupOpenPhone": 2, "reachAllowAgain": 3])
    }

    /// The reader reads what compiles: a few parsed values against the values
    /// the app was built with.
    func testTheTextIsWhatCompiles() throws {
        let byName = Dictionary(uniqueKeysWithValues: try entries().map { ($0.name, $0.literal) })
        XCTAssertEqual(byName["sessions"], Copy.sessions)
        XCTAssertEqual(byName["separator"], Copy.separator)
        XCTAssertEqual(byName["closeQuote"], Copy.closeQuote)
        // Phase 333.1: the second step and the Allow line, each naming the
        // Mac's own words, a version's sentence, and the site's name.
        XCTAssertEqual(byName["setupOpenPhone"], Copy.setupOpenPhone)
        XCTAssertEqual(byName["reachAllowAgain"], Copy.reachAllowAgain)
        XCTAssertEqual(byName["pairNewerMac"], Copy.pairNewerMac)
        XCTAssertEqual(byName["siteName"], Copy.siteName)
        XCTAssertNil(byName["pairStepOnMac"], "the step that said press Pair is still declared")
        XCTAssertNil(byName["pairPrivateNetwork"], "the nothing-to-install line that read as the Mac too is still declared")
        XCTAssertEqual(byName["notPaired"], Copy.notPaired)
        XCTAssertEqual(byName["unpairNote"], Copy.unpairNote)
        XCTAssertEqual(byName["buildOpen"], Copy.buildOpen)
        XCTAssertEqual(byName["endNotTaken"], Copy.endNotTaken)
        XCTAssertEqual(byName["space"], Copy.space)
        XCTAssertEqual(byName["send"], Copy.send)
        XCTAssertEqual(byName["replyNotTaken"], Copy.replyNotTaken)
        XCTAssertEqual(byName["endTop"], Copy.endTop)
        XCTAssertEqual(byName["keyBackTab"], Copy.keyBackTab)
        // Phase 337.1: the rename, the Terminal and its scrollback.
        XCTAssertEqual(byName["catchMeUp"], Copy.catchMeUp)
        XCTAssertEqual(byName["terminal"], Copy.terminal)
        XCTAssertEqual(byName["backToLive"], Copy.backToLive)
        XCTAssertEqual(byName["scrollbackMoved"], Copy.scrollbackMoved)
        XCTAssertEqual(byName["screenNotAnswering"], Copy.screenNotAnswering)
        // Phase 337.3: the Terminal's ⋯, spoken `More`.
        XCTAssertEqual(byName["more"], Copy.more)
        // Phase 333.3: See a sample's five words.
        XCTAssertEqual(byName["seeSample"], Copy.seeSample)
        XCTAssertEqual(byName["sample"], Copy.sample)
        XCTAssertEqual(byName["leaveSample"], Copy.leaveSample)
        XCTAssertEqual(byName["sampleNothingRan"], Copy.sampleNothingRan)
        XCTAssertEqual(byName["sampleEndUnasked"], Copy.sampleEndUnasked)
        // Phase 345: the four words of several Macs.
        XCTAssertEqual(byName["macs"], Copy.macs)
        XCTAssertEqual(byName["pairAnotherMac"], Copy.pairAnotherMac)
        XCTAssertEqual(byName["macLimit"], Copy.macLimit)
        XCTAssertEqual(byName["notPairedHere"], Copy.notPairedHere)
    }

    /// Clause (Phase 346, build/p346/SPEC.md section 4.15): New session's
    /// words, each pinned to its value and its owner: the title and Create's
    /// two words the Mac's own ⌘T sheet's, the rest the phone's own; the
    /// sheet's labels are the words already declared once (`groupProject`,
    /// `agent`), and none names a biometry (his answer 5).
    func testNewSessionsWordsArePinned() throws {
        let entries = try entries()
        let byName = Dictionary(uniqueKeysWithValues: entries.map { ($0.name, $0) })
        let macWords: [(String, String)] = [("newSession", "New session"), ("create", "Create"), ("creating", "Creating…")]
        for (name, value) in macWords {
            let entry = try XCTUnwrap(byName[name], "Copy.\(name) is not declared")
            XCTAssertEqual(entry.literal, value, name)
            guard case let .mac(path, _)? = entry.owner else { return XCTFail("\(name) is not the Mac's word") }
            XCTAssertEqual(path, "src/renderer/app/CreateSessionModal.tsx", name)
        }
        let phoneWords: [(String, String)] = [
            ("startsWith", "Starts with"),
            ("startNoAnswer", "Your Mac did not answer. If it started the session, it is in Sessions."),
            ("startNotTaken", "Your Mac did not take it. Nothing was started."),
            ("startSample", "This is a sample, so nothing ran."),
            ("startNoProject", "Open a project in Tortie on your Mac first."),
            ("startNoAgent", "No agent is installed there."),
            ("startNotRead", "Your Mac has not looked for agents there yet."),
            ("startNotConnected", "Not connected")
        ]
        for (name, value) in phoneWords {
            let entry = try XCTUnwrap(byName[name], "Copy.\(name) is not declared")
            XCTAssertEqual(entry.literal, value, name)
            guard case .phone? = entry.owner else { return XCTFail("\(name) is not the phone's word") }
        }
        XCTAssertEqual(Copy.groupProject, "Project")
        XCTAssertEqual(Copy.agent, "Agent")
        XCTAssertEqual(Copy.startsWithLabels("Skip permissions"), "Starts with Skip permissions")
        XCTAssertNil(byName["startProject"], "the sheet's Project label is Copy.groupProject, declared once")
        XCTAssertNil(byName["startAgent"], "the sheet's Agent label is Copy.agent, declared once")
    }

    /// Clause (Phase 345, build/p345/SPEC.md section 3.7): the four words of
    /// several Macs, each the phone's own (no Mac surface switches between
    /// Macs, pairs a second Mac with a phone, or knows what the phone keeps),
    /// each its pinned value; and `This Mac`'s note names the Mac on screen.
    func testTheMacsWordsAreThePhonesOwn() throws {
        let entries = try entries()
        let byName = Dictionary(uniqueKeysWithValues: entries.map { ($0.name, $0) })
        let pinned: [(String, String)] = [
            ("macs", "Macs"),
            ("pairAnotherMac", "Pair another Mac"),
            ("macLimit", "This iPhone is paired with four Macs. Unpair one to pair another."),
            ("notPairedHere", "This iPhone is not paired with this Mac.")
        ]
        for (name, value) in pinned {
            let entry = try XCTUnwrap(byName[name], "Copy.\(name) is not declared")
            XCTAssertEqual(entry.literal, value, name)
            guard case .phone(let reason)? = entry.owner else { return XCTFail("Copy.\(name) is not the phone's own word") }
            XCTAssertFalse(reason.isEmpty, name)
        }
        let source = try StyleSource.text("ios/Tortie/Style/Copy.swift")
        let thisMac = try XCTUnwrap(source.range(of: "    static let thisMac = ")).lowerBound
        XCTAssertTrue(String(source[..<thisMac].suffix(300)).contains("the Mac on screen"), "This Mac's note does not name the Mac on screen")
    }

    /// Clause (Phase 333.3, build/p3333/SPEC.md D21): See a sample's five
    /// words, each the phone's own (no Mac surface has a sample), each its
    /// pinned value; the line Return draws is ASCII, because the sample draws
    /// it as one terminal run of one cell per character.
    func testSeeASamplesFiveWordsAreThePhonesOwn() throws {
        let byName = Dictionary(uniqueKeysWithValues: try entries().map { ($0.name, $0) })
        let pinned: [(String, String)] = [
            ("seeSample", "See a sample"),
            ("sample", "Sample"),
            ("leaveSample", "Leave sample"),
            ("sampleNothingRan", "Nothing ran: this is a sample."),
            ("sampleEndUnasked", "No passcode is set, so the sample ends without asking.")
        ]
        for (name, value) in pinned {
            let entry = try XCTUnwrap(byName[name], "Copy.\(name) is not declared")
            XCTAssertEqual(entry.literal, value, name)
            guard case .phone(let reason)? = entry.owner else { return XCTFail("Copy.\(name) is not the phone's own word") }
            XCTAssertFalse(reason.isEmpty, name)
        }
        XCTAssertTrue(Copy.sampleNothingRan.unicodeScalars.allSatisfy { $0.value >= 0x20 && $0.value <= 0x7E }, "Return's line is not printable ASCII")
    }

    /// Clause: the words the approved screens draw are drawn as they are
    /// approved. Each line below is read out of the mock itself, between its
    /// tags, with the mock's own data put through the phone's composition.
    func testTheComposedLinesAreTheMocksLines() throws {
        let main = try StyleSource.text("docs/design/phone/Main.html")
        let session = try StyleSource.text("docs/design/phone/Session.html")
        let choice = try StyleSource.text("docs/design/phone/Choice.html")
        // Phase 333.1 (D27): Pairing.html is the resting face, and
        // PairingScan.html the camera's, after Scan code.
        let pairing = try StyleSource.text("docs/design/phone/Pairing.html")
        let pairingScan = try StyleSource.text("docs/design/phone/PairingScan.html")
        let needsInput = try StyleSource.text("docs/design/phone/NeedsInput.html")
        let settings = try StyleSource.text("docs/design/phone/Settings.html")
        let unpair = try StyleSource.text("docs/design/phone/Unpair.html")
        let conversation = try StyleSource.text("docs/design/phone/Conversation.html")
        let link = try StyleSource.text("docs/design/phone/Link.html")
        let end = try StyleSource.text("docs/design/phone/End.html")
        let endThese = try StyleSource.text("docs/design/phone/EndThese.html")
        let composer = try StyleSource.text("docs/design/phone/Composer.html")
        let answer = try StyleSource.text("docs/design/phone/Answer.html")
        // Phase 316.7: the parent's list is the older-Mac face, byte for byte.
        let older = try StyleSource.text("docs/design/phone/SessionsOlderMac.html")
        let menu = try StyleSource.text("docs/design/phone/SessionsMenu.html")
        // Phase 337: the Screen, and End at the top right.
        let screenMock = try StyleSource.text("docs/design/phone/Screen.html")
        // Phase 337.3 (build/p3373/SPEC.md section 5.7): the Terminal's ⋯
        // open over it, and the Terminal sideways.
        let terminalMenu = try StyleSource.text("docs/design/phone/TerminalMenu.html")
        let landscape = try StyleSource.text("docs/design/phone/Landscape.html")
        // Phase 333.3 (build/p3333/SPEC.md section 5.7): the Needs input tab
        // inside the sample, under the Sample bar.
        let sampleMock = try StyleSource.text("docs/design/phone/Sample.html")
        // Phase 345 (build/p345/SPEC.md section 3.7): two Macs, the bar's four
        // items and the Macs screen; Pair another Mac is on Settings.html.
        let macsMock = try StyleSource.text("docs/design/phone/Macs.html")
        let drawn: [(String, String)] = [
            (older, Copy.sessions),
            (older, Copy.needsYourInput(3)),
            (older, Copy.everythingElse(9)),
            (older, Copy.readAt("4:32 PM")),
            (older, Copy.joined(["Working", "webapp"])),
            (older, Copy.select),
            (main, Copy.sessions),
            (main, Copy.readAt("4:32 PM")),
            // Phase 316.7: Show, the menu, and the face when nothing matches.
            (main, Copy.showAll),
            (main, Copy.showActive),
            (main, Copy.ended),
            (menu, Copy.groupBy),
            (menu, Copy.groupProject),
            (menu, Copy.sortBy),
            (menu, Copy.sortRecent),
            (menu, Copy.agent),
            (menu, Copy.machine),
            (menu, Copy.allMachines),
            (menu, Copy.clearFilters),
            (menu, Copy.noMatchingSessions),
            (menu, Copy.showAll),
            (menu, Copy.showActive),
            (menu, Copy.ended),
            // Phase 337.1 (build/p3371/SPEC.md section 5.5.8): Session.html is
            // the Terminal at rest, its status line composed from the mock's
            // own sample; the card, the two cells, the counts, the prompt
            // word and the raised agent label moved to Conversation.html,
            // which is Catch Me Up.
            (session, Copy.joined(["Claude Code", "webapp"])),
            (conversation, Copy.youAsked("make the session cookie httpOnly and…")),
            (conversation, Copy.messages),
            (conversation, Copy.lastMessage),
            (conversation, Copy.messageCounts(you: 20, agent: 21)),
            (conversation, Copy.yourPromptWord),
            (conversation, raised(Copy.agentLabel)),
            (choice, Copy.answerInTheSession),
            // Phase 333.1: the resting face, the three steps, Scan code and
            // the foot, with the Mac app's facts on one line the Mac's way.
            (pairing, Copy.pairTitle),
            (pairing, Copy.setupGetMac),
            (pairing, Copy.joined([Copy.freeAtSite, Copy.appleSilicon, Copy.macVersion])),
            (pairing, Copy.setupOpenPhone),
            (pairing, Copy.setupScan),
            (pairing, Copy.scanCode),
            (pairing, Copy.pairNothingElse),
            (pairing, Copy.notPaired),
            (pairing, Copy.privacy),
            (pairing, Copy.support),
            // And the camera's face after Scan code: the line under it, the
            // fingerprint card and the foot.
            (pairingScan, Copy.pairTitle),
            (pairingScan, Copy.pairStepScan),
            (pairingScan, Copy.pairMatchLabel),
            (pairingScan, Copy.pairMatchNote),
            (pairingScan, Copy.pairNothingElse),
            (pairingScan, Copy.pairWaitingForAllow),
            (pairingScan, Copy.privacy),
            (pairingScan, Copy.support),
            // Phase 316.6: the three tabs, on every screen that draws the bar.
            (needsInput, Copy.needsInput),
            (needsInput, Copy.sessions),
            (needsInput, Copy.settings),
            (needsInput, Copy.readAt("4:32 PM")),
            (main, Copy.needsInput),
            (main, Copy.settings),
            // Settings, with the mock's own data put through the composition.
            (settings, Copy.settings),
            (settings, Copy.thisMac),
            (settings, Copy.readAt("4:32 PM")),
            (settings, Copy.pairMatchLabel),
            // Phase 348 (build/p348/SPEC.md section 4.3, D12): Paired is a
            // labelled row, its word on the left and the date on the right,
            // as Version is, where it was one joined line.
            (settings, Copy.paired),
            (settings, "Sep 30, 2026"),
            (settings, Copy.alerts),
            (settings, Copy.notifications),
            (settings, Copy.notificationsAllowed),
            (settings, Copy.unpairThisIPhone),
            (settings, Copy.about),
            (settings, Copy.version),
            (settings, Copy.versionLine("1.0.0", "4")),
            // Phase 333.1 (D22): About's three pages of Tortie's site.
            (settings, Copy.macOnSite),
            (settings, Copy.siteName),
            (settings, Copy.privacy),
            (settings, Copy.support),
            // Unpair's question, every word of the sheet.
            (unpair, Copy.unpairQuestion),
            (unpair, Copy.unpairNote),
            (unpair, Copy.unpair),
            (unpair, Copy.cancel),
            // The conversation's own words, and the link's alert. (The
            // answer's marks are the agent's own bullets since the fix round,
            // and its table is cut nowhere, so neither the `•` nor a `more
            // columns` note is a Copy word any more.) Since his ruling of
            // 2026-10-02 (markdown off) the answer is drawn as written and no
            // link reaches the alert: Conversation.html's answer and Link.html
            // are owed by the later phase that switches markdown back on, and
            // `Copy.open` stays declared for it.
            (conversation, Copy.catchMeUp),
            (link, Copy.open),
            (link, Copy.cancel),
            // Phase 317: End, and End these with the Mac sheet's words,
            // composed with the mock's own counts. Since Phase 337 End is
            // `End` at the top right of a session's page (D33), and since
            // Phase 337.3 of Catch Me Up's alone: the Terminal's End is its
            // ⋯'s `End session…` (TerminalMenu.html, below).
            (conversation, Copy.endTop),
            (choice, Copy.endTop),
            (end, Copy.endTop),
            (end, Copy.cancel),
            (main, Copy.select),
            (endThese, Copy.selectedCount(3)),
            (endThese, Copy.endSelected),
            (endThese, Copy.batchHeading(2)),
            (endThese, Copy.batchBody(false)),
            (endThese, Copy.batchSkippedLine([.ended]) ?? ""),
            (endThese, Copy.batchConfirmLabel(2)),
            (endThese, Copy.cancel),
            // Phase 318: the message box's own words, and a pressable question
            // under the End bar with no line asking him to answer it at the Mac.
            (composer, Copy.messagePlaceholder),
            (composer, Copy.oneMessage),
            (answer, Copy.endTop),
            // Phase 337: the Screen's key bar, in its own words (the Terminal
            // with the keyboard up since Phase 337.1).
            (screenMock, Copy.keyEsc),
            (screenMock, Copy.keyTab),
            (screenMock, Copy.keyBackTab),
            (screenMock, Copy.keyCtrl),
            (screenMock, Copy.keyReturn),
            // Phase 337.3 (D22): the ⋯ open over the Terminal, its two items
            // the Mac's own words.
            (terminalMenu, Copy.catchMeUp),
            (terminalMenu, Copy.endSessionMenu),
            // Phase 333.3 (D13, D14, D26): See a sample under Scan code, and
            // the Sample bar with Leave sample over the sample's Needs input.
            (pairing, Copy.seeSample),
            (sampleMock, Copy.sample),
            (sampleMock, Copy.leaveSample),
            (sampleMock, Copy.needsInput),
            // Phase 345: Pair another Mac on Settings, and the Macs screen
            // with the other Mac's waiting count.
            (settings, Copy.pairAnotherMac),
            (macsMock, Copy.macs),
            (macsMock, Copy.needsYourInput(2)),
            (macsMock, Copy.needsYourInput(1)),
            (macsMock, Copy.needsInput),
            (macsMock, Copy.sessions),
            (macsMock, Copy.settings),
        ]
        for (mock, line) in drawn {
            XCTAssertTrue(mock.contains(">" + line + "<"), "the mock does not draw \(line)")
        }
        XCTAssertFalse(
            answer.contains(">" + Copy.answerInTheSession + "<"),
            "every option Answer.html draws is pressable, so it draws no line sending him to the Mac"
        )
        // Phase 337 (D33): the bar at the bottom is gone from every page.
        // (TerminalMenu.html draws `End session…` as the ⋯'s item, not as a
        // bar, so it is not read here.)
        for (name, mock) in [("Session", session), ("Choice", choice), ("Answer", answer)] {
            XCTAssertFalse(mock.contains(">" + Copy.endSessionMenu + "<"), "\(name).html still draws the End bar")
        }
        // Phase 337.3 (D21, D27): the Terminal's top right is ONE ⋯, which
        // draws no word and is spoken `More`, at rest and with the keyboard
        // up; neither page draws Catch Me Up or End, which are the ⋯'s items,
        // Catch Me Up first (TerminalMenu.html). And no page the rename
        // touched draws the words it took away: no Conversation row or title,
        // no Screen row or title, and no line keeping the scrollback on the Mac.
        for (name, mock) in [("Session", session), ("Screen", screenMock)] {
            XCTAssertTrue(mock.contains("aria-label=\"" + Copy.more + "\""), "\(name).html's ⋯ is not named \(Copy.more)")
            XCTAssertFalse(mock.contains(">" + Copy.more + "<"), "\(name).html draws More as a word; the ⋯ is a symbol")
            for word in [Copy.catchMeUp, Copy.endTop] {
                XCTAssertFalse(mock.contains(">" + word + "<"), "\(name).html still draws \(word) in the Terminal's bar; it is the ⋯'s item")
                XCTAssertFalse(mock.contains("aria-label=\"" + word + "\""), "\(name).html still names a control \(word) in the Terminal's bar; it is the ⋯'s item")
            }
        }
        XCTAssertTrue(terminalMenu.contains("aria-label=\"" + Copy.more + "\""), "TerminalMenu.html's ⋯ is not named \(Copy.more)")
        let menuCatchUp = try XCTUnwrap(terminalMenu.range(of: ">" + Copy.catchMeUp + "<"))
        let menuEnd = try XCTUnwrap(terminalMenu.range(of: ">" + Copy.endSessionMenu + "<"))
        XCTAssertLessThan(menuCatchUp.lowerBound, menuEnd.lowerBound, "TerminalMenu.html draws End session… before Catch Me Up")
        // Phase 337.3 (D15): sideways the Terminal is the terminal alone, with
        // no bar above it and none below: no ⋯, End or Catch Me Up, no tab.
        for word in [Copy.needsInput, Copy.sessions, Copy.settings, Copy.catchMeUp, Copy.endTop, Copy.endSessionMenu] {
            XCTAssertFalse(landscape.contains(">" + word + "<"), "Landscape.html draws \(word); sideways the Terminal is the terminal alone")
        }
        XCTAssertFalse(landscape.contains("aria-label=\"" + Copy.more + "\""), "Landscape.html draws the ⋯; sideways the bar is hidden")
        for (name, mock) in [("Session", session), ("Conversation", conversation), ("Screen", screenMock)] {
            XCTAssertFalse(mock.contains(">Conversation<"), "\(name).html still draws Conversation")
            XCTAssertFalse(mock.contains(">Screen<"), "\(name).html still draws Screen")
            XCTAssertFalse(mock.contains("scrollback stays on your Mac"), "\(name).html still says the scrollback stays on the Mac")
        }
        for word in [Copy.youAsked("make the session cookie httpOnly and…"), Copy.messages, Copy.lastMessage, Copy.messageCounts(you: 20, agent: 21)] {
            XCTAssertFalse(session.contains(">" + word + "<"), "Session.html still draws \(word), which is Catch Me Up's now")
        }
        // The menu button draws no words; its spoken name is the phone's.
        for mock in [main, menu] {
            XCTAssertTrue(mock.contains("aria-label=\"" + Copy.sessionsOptions + "\""), "the menu button is not named \(Copy.sessionsOptions)")
        }
    }

    /// Clause: the composed lines Phase 316.6 adds say the singular for one,
    /// and the version line falls back to the dash, never to nothing.
    func testTheCountedNotesAndTheVersionLine() {
        XCTAssertEqual(Copy.moreLines(1), "1" + Copy.moreLineTail)
        XCTAssertEqual(Copy.moreLines(40), "40" + Copy.moreLinesTail)
        XCTAssertEqual(Copy.orderedMark("12"), "12" + Copy.orderedMarkTail)
        XCTAssertEqual(Copy.orderedMark("007"), "007" + Copy.orderedMarkTail)
        XCTAssertEqual(Copy.cutShort("abc"), "abc" + Copy.pending)
        XCTAssertEqual(Copy.versionLine("1.0.0", "4"), "1.0.0" + Copy.buildOpen + "4" + Copy.countClose)
    }

    /// Clause: his rulings. No hand-off and no typed code; and End is the
    /// Mac's own words, so the approved mock's `End with Face ID` is not a
    /// word the phone says (Phase 317 brought `Select`): none of their words
    /// is here. Phase 318 brought the message box, so its four words left
    /// this list and are the phone's own (`send`, `messagePlaceholder`,
    /// `sending`, `oneMessage`). Nor is a search (Phase 316.7, D14). Phase
    /// 348 brought iOS's own paste on his ruling of 2026-10-18 ("Paste is
    /// native"), so `Paste` and `paste` left this list on purpose and are the
    /// phone's words now (`paste`, the Mac terminal menu's own, and the paste
    /// rule's sentences); every other entry stays.
    func testNoWordOfAControlThePhoneDoesNotHave() throws {
        let refused = [
            "Open in Claude", "Open in Terminal", "Enter a code instead", "End with Face ID",
            "The agent stops. Its saved output stays.",
            // Phase 316.7, D14: no search, so no word of one.
            "Search",
            // Phase 337: the Screen is the session's screen, never a remote
            // desktop or SSH (his ruling 1); and the sentence D31 replaced,
            // which the Screen made false. (Its "no paste key", section 12,
            // and 337.1's "no paste" ended with Phase 348's ruling.)
            "SSH", "remote desktop", "Remote Desktop",
            "The terminal’s own output stays on your Mac.",
            // Phase 337.1 (D22): the Terminal scrolls back, so the line that
            // kept its scrollback on the Mac is false and gone.
            "The terminal’s scrollback stays on your Mac.",
        ]
        for entry in try entries() {
            for word in refused where entry.literal.contains(word) {
                XCTFail("\(entry.name) carries \(word), which the phone does not draw")
            }
        }
    }

    /// Clause (Phase 337.1, D21 to D23, rule au): the rename. No word is
    /// `Conversation` or `Screen`; Catch Me Up is the Mac's word, owned by
    /// the Mac's menu; the Terminal is the phone's word for the feature, and
    /// every sentence that names the feature says terminal, not screen.
    func testTheRenameIsCatchMeUpAndTerminal() throws {
        let entries = try entries()
        for entry in entries {
            XCTAssertNotEqual(entry.literal, "Conversation", entry.name)
            XCTAssertNotEqual(entry.literal, "Screen", entry.name)
        }
        let byName = Dictionary(uniqueKeysWithValues: entries.map { ($0.name, $0) })
        XCTAssertNil(byName["conversation"], "Copy.conversation is still declared")
        XCTAssertNil(byName["screen"], "Copy.screen is still declared")
        XCTAssertNil(byName["terminalStaysOnMac"], "Copy.terminalStaysOnMac is still declared")
        let catchUp = try XCTUnwrap(byName["catchMeUp"])
        guard case let .mac(path, needle)? = catchUp.owner else { return XCTFail("Catch Me Up is not owned by a Mac word") }
        XCTAssertEqual(path, "src/main/menu.ts")
        XCTAssertEqual(needle, "item('Catch Me Up', 'show-overview'")
        XCTAssertEqual(Copy.catchMeUp, "Catch Me Up")
        XCTAssertEqual(Copy.terminal, "Terminal")
        guard case .phone? = try XCTUnwrap(byName["terminal"]).owner else { return XCTFail("Terminal is not the phone's word") }
        let moved = try XCTUnwrap(byName["scrollbackMoved"])
        guard case let .mac(movedPath, _)? = moved.owner else { return XCTFail("the moved sentence is not the Mac's") }
        XCTAssertEqual(movedPath, "src/shared/screen-copy.ts")
        // The feature is the Terminal in every sentence that names it.
        for line in [Copy.screenNotAnswering, Copy.screenWaitForRedraw, Copy.screenHeldWhileSelecting, Copy.backToLive, Copy.scrollbackMoved] {
            XCTAssertTrue(line.contains("terminal"), line)
            XCTAssertFalse(line.contains("screen"), line)
        }
    }

    /// Clause (Phase 333.1, D29, research 140 section 10): no word the phone
    /// draws says beta, TestFlight, remote desktop, mirror, stream or SSH, in
    /// any case, as a whole word. The phone is a terminal on the Mac's
    /// sessions, and the build is the app.
    func testNoWordSaysBetaOrWhatTheTerminalIsNot() throws {
        let refused = try NSRegularExpression(pattern: #"\b(?:beta|testflight|remote desktop|mirror|stream|ssh)\b"#, options: [.caseInsensitive])
        var read = 0
        for entry in try entries() {
            read += 1
            let range = NSRange(entry.literal.startIndex..., in: entry.literal)
            XCTAssertNil(refused.firstMatch(in: entry.literal, range: range), "\(entry.name) says \(entry.literal)")
        }
        XCTAssertGreaterThanOrEqual(read, 170, "the reader found too few words to be reading the file")
        // The pattern is a word's: it finds each refused word in a sentence,
        // and leaves a longer word alone.
        for said in ["Join the Beta.", "Get it on TestFlight", "a remote desktop", "MIRROR", "stream it", "over ssh"] {
            XCTAssertNotNil(refused.firstMatch(in: said, range: NSRange(said.startIndex..., in: said)), said)
        }
        for said in ["streamed", "alphabetical", "mirrored"] {
            XCTAssertNil(refused.firstMatch(in: said, range: NSRange(said.startIndex..., in: said)), said)
        }
    }

    /// Clause (D12, research 136 section 14): no word the phone draws says
    /// Face ID or Touch ID, so a Touch ID iPhone never reads "Face ID"; the
    /// End bar's glyph is an image.
    func testNoWordNamesABiometry() throws {
        for entry in try entries() {
            XCTAssertFalse(entry.literal.contains("Face ID"), entry.name)
            XCTAssertFalse(entry.literal.contains("Touch ID"), entry.name)
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
