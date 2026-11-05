import Foundation
import XCTest
@testable import Tortie

/// A page through the Screen's one key sender (Phase 350, build/p350/SPEC.md
/// D7, D8, D10, D22): `ScreenKeySender.page(_:)` sends ONE Page Up or Page
/// Down as one write of its own, stamped with the picture's turn and dialog
/// and paced with his typing, only while the picture drawn offers pages,
/// takes keys and does not ask, at the pull and again when its write starts;
/// it says nothing and does not send the Terminal back to live. And See a
/// sample takes the two names and draws nothing for them. The door and the
/// clock are scripts; nothing reaches a network. Each test names the clause
/// it holds and fails when that clause is taken out of
/// Screens/ScreenKeys.swift or Sample/SampleWorld.swift.
@MainActor
final class ScreenPageSenderTests: XCTestCase {
    private var door: ScriptedScreenDoor!
    private var drawn: ScreenPicture?
    private var clock = ContinuousClock.now

    override func setUp() async throws {
        door = ScriptedScreenDoor()
        drawn = PageSample.picture()
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

    /// Let the sender's tasks and the door's run.
    private func settle() async {
        try? await Task.sleep(nanoseconds: 30_000_000)
        for _ in 0..<5 { await Task.yield() }
    }

    private func done() -> WriteResult {
        .answered(PocketWriteAnswer(verb: .keys, write: "0123456789abcdef0123456789abcdef", outcome: .done, reason: nil, sentence: nil))
    }

    /// Clause (D22): a page on a picture that offers one is ONE write holding
    /// its one key, stamped with the picture's turn and dialog, and it says
    /// nothing (D10).
    func testAPageIsOneWriteOfItsKey() async {
        let keys = sender()
        keys.page(.pageUp)
        await settle()
        XCTAssertEqual(door.asked, [ScriptedScreenDoor.Asked(keys: [.key(.pageUp)], turn: ScreenSample.turn, dialog: nil)])
        XCTAssertNil(keys.line, "a page said something")
        clock = clock.advanced(by: .milliseconds(150))
        door.answer(done())
        await settle()
        keys.page(.pageDown)
        await settle()
        XCTAssertEqual(door.asked.map(\.keys), [[.key(.pageUp)], [.key(.pageDown)]])
        XCTAssertNil(keys.line)
    }

    /// Clause (D6, D8, D22): no page where the picture drawn does not offer
    /// one, takes no keys or asks, or where there is no picture; nothing is
    /// queued and nothing is said.
    func testNoPageWhereThePictureDoesNotOfferOne() async {
        let refusing: [ScreenPicture?] = [
            PageSample.picture(pages: false), PageSample.picture(pages: nil), PageSample.picture(typable: false),
            PageSample.picture(asking: true, dialog: "a1b2c3d4e5f6"), ScreenSample.picture(), nil,
        ]
        for picture in refusing {
            drawn = picture
            let keys = sender()
            keys.page(.pageUp)
            keys.page(.pageDown)
            await settle()
            XCTAssertEqual(door.asked.count, 0, "a page went against \(String(describing: picture?.revision))")
            XCTAssertEqual(keys.pending, [])
            XCTAssertNil(keys.line, "a refused page drew a line")
        }
    }

    /// Clause (D22): a stopped sender (the app left) sends no page.
    func testAStoppedSenderSendsNoPage() async {
        let keys = sender()
        keys.stop()
        keys.page(.pageUp)
        await settle()
        XCTAssertEqual(door.asked.count, 0)
        keys.resume()
        keys.page(.pageUp)
        await settle()
        XCTAssertEqual(door.asked.map(\.keys), [[.key(.pageUp)]], "back on top, the next pull pages")
    }

    /// Clause (D4): `page(_:)` takes Page Up and Page Down and no other key.
    func testOnlyThePagesArePages() async {
        let keys = sender()
        for name in ScreenKeyName.allCases where !name.isPage {
            keys.page(name)
        }
        await settle()
        XCTAssertEqual(door.asked.count, 0)
        XCTAssertEqual(keys.pending, [])
    }

    /// Clause (D22): a page does not call `onSend`, so it never sends the
    /// Terminal back to live; typing still does.
    func testAPageCallsNoOnSend() async {
        let keys = sender()
        var called = 0
        keys.onSend = { called += 1 }
        keys.page(.pageUp)
        await settle()
        XCTAssertEqual(door.asked.count, 1)
        XCTAssertEqual(called, 0, "a page called onSend")
        clock = clock.advanced(by: .milliseconds(150))
        door.answer(done())
        await settle()
        keys.send([.text("a")])
        XCTAssertEqual(called, 1, "the control: typing calls onSend")
    }

    /// Clause (D17, D30): a page stands ALONE in its write, in the order he
    /// made it among his typing, one write in flight and at least the gap
    /// apart.
    func testAPageStandsAloneInHisOrder() async {
        let keys = sender()
        keys.send([.text("a")])
        await settle()
        keys.send([.text("b")])
        keys.page(.pageUp)
        keys.send([.text("c")])
        await settle()
        XCTAssertEqual(door.asked.count, 1, "a second write while one is out")
        for _ in 0..<3 {
            clock = clock.advanced(by: .milliseconds(150))
            door.answer(done())
            await settle()
        }
        XCTAssertEqual(door.asked.map(\.keys), [[.text("a")], [.text("b")], [.key(.pageUp)], [.text("c")]])
    }

    /// Clause (D30): a page right after a write waits the gap, as a key does.
    func testAPageKeepsThePace() async {
        let keys = sender()
        keys.send([.text("a")])
        await settle()
        door.answer(done())
        await settle()
        keys.page(.pageUp)
        await settle()
        XCTAssertEqual(door.asked.count, 1, "a page inside the gap")
        clock = clock.advanced(by: .milliseconds(100))
        await settle()
        XCTAssertEqual(door.asked.map(\.keys), [[.text("a")], [.key(.pageUp)]], "the page after the gap")
    }

    /// Clause (D8): a page that waited behind a write is dropped, unsaid,
    /// when the picture drawn when it would go asks or no longer offers
    /// pages; while it still offers them it goes, stamped with that picture.
    func testAWaitingPageGoesOnlyWhileThePictureStillOffersIt() async {
        let gone: [ScreenPicture] = [
            PageSample.picture(asking: true, dialog: "a1b2c3d4e5f6", revision: "bbbbbbbbbbbb", turn: "0123456789abcdef-2"),
            ScreenSample.picture(revision: "cccccccccccc", turn: "0123456789abcdef-2"),
            PageSample.picture(pages: false, revision: "dddddddddddd", turn: "0123456789abcdef-2"),
        ]
        for picture in gone {
            door = ScriptedScreenDoor()
            drawn = PageSample.picture()
            let keys = sender()
            keys.send([.text("a")])
            await settle()
            keys.page(.pageUp)
            XCTAssertEqual(keys.pending, [.key(.key(.pageUp))], "the page waits behind the write in flight")
            drawn = picture
            keys.pictureChanged()
            clock = clock.advanced(by: .milliseconds(150))
            door.answer(done())
            await settle()
            XCTAssertEqual(door.asked.map(\.keys), [[.text("a")]], "a waiting page went against \(picture.revision)")
            XCTAssertEqual(keys.pending, [])
            XCTAssertNil(keys.line, "a dropped page drew a line")
        }
        // The control: the picture changed and still offers pages.
        door = ScriptedScreenDoor()
        drawn = PageSample.picture()
        let keys = sender()
        keys.send([.text("a")])
        await settle()
        keys.page(.pageDown)
        drawn = PageSample.picture(revision: "eeeeeeeeeeee", turn: "0123456789abcdef-2")
        keys.pictureChanged()
        clock = clock.advanced(by: .milliseconds(150))
        door.answer(done())
        await settle()
        XCTAssertEqual(door.asked.map(\.keys), [[.text("a")], [.key(.pageDown)]])
        XCTAssertEqual(door.asked.last?.turn, "0123456789abcdef-2", "the page is stamped with the picture drawn when it went")
    }

    /// Clause (D8, D10): a page dropped because a question was drawn while it
    /// waited says nothing, even where the lock inside the question holds and
    /// would have said `Waiting for the screen to redraw.` for a key.
    func testADroppedPageSaysNothingInsideAQuestion() async {
        let keys = sender()
        keys.send([.text("a")])
        await settle()
        keys.page(.pageUp)
        // The question drawn before the batch landed: the same turn, asking.
        drawn = PageSample.picture(asking: true, dialog: "a1b2c3d4e5f6", revision: "abababababab", turn: ScreenSample.turn)
        keys.pictureChanged()
        clock = clock.advanced(by: .milliseconds(150))
        door.answer(done())
        await settle()
        XCTAssertEqual(door.asked.map(\.keys), [[.text("a")]])
        XCTAssertEqual(keys.pending, [])
        XCTAssertNil(keys.line, "a dropped page said something")
        keys.send([.key(.down)])
        XCTAssertEqual(keys.line, Copy.screenWaitForRedraw, "the control: a key against the spent question still says so")
    }

    /// Clause (D8): a page waiting out the gap is dropped when a question is
    /// drawn before the gap ends.
    func testAPageWaitingOutTheGapIsDroppedForAQuestion() async {
        let keys = sender()
        keys.send([.text("a")])
        await settle()
        door.answer(done())
        await settle()
        keys.page(.pageUp)
        drawn = PageSample.picture(asking: true, dialog: "a1b2c3d4e5f6", revision: "ffffffffffff", turn: "0123456789abcdef-2")
        clock = clock.advanced(by: .milliseconds(100))
        await settle()
        XCTAssertEqual(door.asked.map(\.keys), [[.text("a")]], "a page went into a question drawn during the gap")
        XCTAssertEqual(keys.pending, [])
    }

    // MARK: See a sample (D22, section 4.4 step 6)

    /// Clause: See a sample's Terminal takes Page Up and Page Down as the
    /// keys they are, answers each done, draws nothing for them and moves
    /// its question id as every keys write does; and none of its pictures
    /// offers a page, so no pull of the sample sends one.
    func testTheSampleTakesThePagesAndDrawsNothing() async throws {
        let fixture = SampleBookFixture.book()
        let sample = SampleReader(book: fixture)
        let door = try XCTUnwrap(sample.screenDoor("s-idle"))
        let before = try await door.read(since: nil)
        let screen = try XCTUnwrap(before.screen)
        XCTAssertFalse(screen.pages, "the sample offers a page")
        var turn = screen.turn
        for key in [ScreenKeyName.pageUp, .pageDown] {
            let typed = await door.keys([.key(key)], turn: turn, dialog: nil)
            guard case .answered(let answer) = typed else { return XCTFail("the sample did not take \(key): \(typed)") }
            XCTAssertEqual(answer.outcome, .done)
            let next = try await door.read(since: nil)
            turn = try XCTUnwrap(next.screen).turn
        }
        let after = try await door.read(since: nil)
        let paged = try XCTUnwrap(after.screen)
        XCTAssertEqual(paged.lines, screen.lines, "a page drew on the sample's Terminal")
        XCTAssertNotEqual(paged.turn, screen.turn, "a page moved no question id")
        XCTAssertNotEqual(after.revision, before.revision)

        let book = try XCTUnwrap(SampleBook.bundled(), "the app carries no sample")
        let reader = SampleReader(book: book)
        for id in reader.world.ids {
            guard let screenDoor = reader.screenDoor(id), let read = try? await screenDoor.read(since: nil) else { continue }
            XCTAssertFalse(read.screen?.pages ?? false, "the app's sample \(id) offers a page")
        }
    }
}
