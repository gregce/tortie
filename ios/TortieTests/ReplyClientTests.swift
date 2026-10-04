import Foundation
import XCTest
@testable import Tortie

/// The two reply writes' client half and what the door's answers carry for
/// them (Phase 318, build/p318/SPEC.md sections 5.1.3, 5.2 and 5.7.1): the
/// bodies' bytes and caps, the targets and verbs, the closed words of the
/// answer, the offer read strictly, and the one id a say may be handed. Each
/// test names the clause it holds, and each fails when that clause is taken
/// out of Door/DoorClient.swift or Door/Contract.swift.
final class ReplyClientTests: XCTestCase {
    private let id = "00112233445566778899aabbccddeeff"

    private func encoded<T: Encodable>(_ body: T) throws -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        return String(decoding: try encoder.encode(body), as: UTF8.self)
    }

    /// The door's caps (src/main/pocket/door/limits.ts, D3).
    private let chooseCap = 512
    private let sayCap = 32_768
    /// The Mac's text rule: at most 4,096 bytes of UTF-8 (D15).
    private let textMaxBytes = 4_096

    // MARK: The bodies

    /// Clause: each body is exactly its keys, written sorted, which is what
    /// the Mac's strict parse reads (`mark,marker,question,session,write` and
    /// `session,text,write`).
    func testTheBodiesAreExactlyTheirKeys() throws {
        XCTAssertEqual(
            try encoded(ChooseBody(mark: "a1b2c3d4e5f6", marker: "2", question: "0123456789abcdef-42", session: "s-1", write: id)),
            #"{"mark":"a1b2c3d4e5f6","marker":"2","question":"0123456789abcdef-42","session":"s-1","write":"00112233445566778899aabbccddeeff"}"#
        )
        XCTAssertEqual(
            try encoded(SayBody(session: "s-1", text: "hello phone", write: id)),
            #"{"session":"s-1","text":"hello phone","write":"00112233445566778899aabbccddeeff"}"#
        )
    }

    /// Clause: the words go as written: Swift escapes `/` as `\/`, `"`, `\`
    /// and LF as two bytes each, and an emoji as its own UTF-8, and nothing
    /// is dropped; the Mac's JSON parse reads back exactly the words.
    func testTheWordsGoAsWritten() throws {
        let emoji = String(Character(try XCTUnwrap(Unicode.Scalar(0x1F44D))))
        let words = "/exit \"a\" \\ b" + "\n" + "!ls " + emoji
        let body = try encoded(SayBody(session: "s", text: words, write: id))
        XCTAssertTrue(body.contains(#"\/exit"#), body)
        let read = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(body.utf8)) as? [String: String])
        XCTAssertEqual(read["text"].map { Array($0.utf8) }, Array(words.utf8))
        XCTAssertEqual(Array(read.keys).sorted(), ["session", "text", "write"])
    }

    /// Clause (section 5.1.3): the worst legal choose is 267 bytes, under 512;
    /// the worst say Swift writes for a 4,096-byte message, every byte a C0
    /// control (escaped six bytes for one), is under the door's 32,768, and so
    /// is a message of slashes or quotes and one of four-byte emoji. Every
    /// text is built from code points here, never written into this file.
    func testTheWorstBodiesAreUnderTheDoorsCaps() throws {
        let alphabet = Array("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._:-")
        let session = String((0..<128).map { alphabet[$0 % alphabet.count] })
        let worstChoose = try encoded(ChooseBody(
            mark: "ffffffffffff", marker: "9", question: "ffffffffffffffff-9007199254740991", session: session, write: id
        ))
        XCTAssertEqual(worstChoose.utf8.count, 267)
        XCTAssertLessThanOrEqual(worstChoose.utf8.count, chooseCap)

        let control = String(Character(try XCTUnwrap(Unicode.Scalar(0x01))))
        let controls = String(repeating: control, count: textMaxBytes)
        XCTAssertEqual(controls.utf8.count, textMaxBytes)
        let worstSay = try encoded(SayBody(session: session, text: controls, write: id))
        XCTAssertGreaterThan(worstSay.utf8.count, 24_000, "Swift wrote a C0 control in fewer than six bytes")
        XCTAssertLessThanOrEqual(worstSay.utf8.count, sayCap)

        for ascii in ["/", "\"", "\\", "\n"] {
            let text = String(repeating: ascii, count: textMaxBytes)
            let body = try encoded(SayBody(session: session, text: text, write: id))
            XCTAssertLessThanOrEqual(body.utf8.count, sayCap, ascii)
        }
        let emoji = String(Character(try XCTUnwrap(Unicode.Scalar(0x1F600))))
        let emojis = String(repeating: emoji, count: 1_024)
        XCTAssertEqual(emojis.utf8.count, textMaxBytes)
        XCTAssertLessThanOrEqual(try encoded(SayBody(session: session, text: emojis, write: id)).utf8.count, sayCap)
    }

    /// Clause: each target is a path with no query, and each route names its
    /// own verb.
    func testTheTargetsAndVerbs() {
        XCTAssertEqual(DoorClient.chooseTarget, "/v1/choose")
        XCTAssertEqual(DoorClient.sayTarget, "/v1/say")
        let choose = WriteRoute.choose(session: "s", question: "q", mark: "m", marker: "1")
        let say = WriteRoute.say(session: "s", text: "t")
        XCTAssertEqual(choose.target, DoorClient.chooseTarget)
        XCTAssertEqual(say.target, DoorClient.sayTarget)
        XCTAssertEqual(choose.verb, .choose)
        XCTAssertEqual(say.verb, .say)
        XCTAssertEqual(WriteRoute.end(session: "s", batch: false).verb, .end)
    }

    // MARK: The answer

    private func reply(_ status: Int, _ json: String) -> ExchangeEnd {
        ExchangeEnd(result: .success(DoorReply(status: status, body: Data(json.utf8))), handed: true)
    }

    private func answer(_ verb: String, write: String, outcome: String = "done", reason: String = "null", sentence: String = "null") -> String {
        #"{"verb":"\#(verb)","write":"\#(write)","outcome":"\#(outcome)","reason":\#(reason),"sentence":\#(sentence)}"#
    }

    /// Clause: a reply's answer is accepted only when it names the write's own
    /// verb and echoes its id; an End's answer to a say is no answer.
    func testAnAnswerMustNameItsOwnVerb() {
        XCTAssertEqual(
            WriteResult.of(reply(200, answer("say", write: id)), verb: .say, sent: id),
            .answered(PocketWriteAnswer(verb: .say, write: id, outcome: .done, reason: nil, sentence: nil))
        )
        XCTAssertEqual(
            WriteResult.of(reply(200, answer("choose", write: id)), verb: .choose, sent: id),
            .answered(PocketWriteAnswer(verb: .choose, write: id, outcome: .done, reason: nil, sentence: nil))
        )
        XCTAssertEqual(WriteResult.of(reply(200, answer("end", write: id)), verb: .say, sent: id), .noAnswer)
        XCTAssertEqual(WriteResult.of(reply(200, answer("choose", write: id)), verb: .say, sent: id), .noAnswer)
        XCTAssertEqual(WriteResult.of(reply(200, answer("say", write: id)), verb: .choose, sent: id), .noAnswer)
    }

    /// Clause (D19): the seven reply reasons are words this build reads, each
    /// with `refused` and a sentence; a word outside the set refuses whole.
    func testTheReplyReasonsAreRead() {
        for reason in ["changed", "unpressable", "unsayable", "stopped", "empty", "long", "character", "gone"] {
            let json = answer("say", write: id, outcome: "refused", reason: "\"\(reason)\"", sentence: "\"s.\"")
            let read = try? JSONDecoder().decode(PocketWriteAnswer.self, from: Data(json.utf8))
            XCTAssertEqual(read?.reason?.rawValue, reason)
        }
        let unknown = answer("say", write: id, outcome: "refused", reason: #""tired""#, sentence: #""s.""#)
        XCTAssertNil(try? JSONDecoder().decode(PocketWriteAnswer.self, from: Data(unknown.utf8)))
        let verb = answer("interrupt", write: id)
        XCTAssertNil(try? JSONDecoder().decode(PocketWriteAnswer.self, from: Data(verb.utf8)), "a verb this build does not make")
    }

    // MARK: The offer

    private func session(_ reply: String?, choices: String = ReplyAnswers.claudeChoicesJSON) throws -> PocketSessionDetail {
        try JSONDecoder().decode(PocketSessionAnswer.self, from: Data(ReplyAnswers.sessionJSON(choices: choices, reply: reply).utf8)).session
    }

    private func offer(
        question: String = #""0123456789abcdef-42""#, mark: String = #""a1b2c3d4e5f6""#,
        pressable: String = #"["1","2","3","4"]"#, command: String = "null", canSay: String = "false"
    ) -> String {
        #"{"question":\#(question),"mark":\#(mark),"pressable":\#(pressable),"command":\#(command),"canSay":\#(canSay)}"#
    }

    /// Clause: no `reply` (a Mac older than 318) reads as the empty offer;
    /// one that agrees with itself and the options is read as sent.
    func testTheOfferIsReadAsSent() throws {
        XCTAssertNil(try session(nil).reply)
        XCTAssertEqual(try session(nil).replyOffer, .empty)
        XCTAssertEqual(try session("null").replyOffer, .empty)
        let read = try session(offer(command: #""ls -la""#)).replyOffer
        XCTAssertEqual(read.question, "0123456789abcdef-42")
        XCTAssertEqual(read.mark, "a1b2c3d4e5f6")
        XCTAssertEqual(read.pressable, ["1", "2", "3", "4"])
        XCTAssertEqual(read.command, "ls -la")
        XCTAssertFalse(read.canSay)
        XCTAssertEqual(try session(offer(pressable: #"["4"]"#)).replyOffer.pressable, ["4"])
        XCTAssertEqual(try session(offer(question: "null", mark: "null", pressable: "[]", canSay: "true"), choices: "[]").replyOffer,
                       ReplyAnswers.sayable)
    }

    /// Clause (section 5.7.1): an offer that disagrees with itself or with
    /// the options the same answer draws reads as the empty offer, never a
    /// button: a press half that is half there, a marker the answer does not
    /// draw, out of order or twice, a press and a message at once, a command
    /// with no press, and ids not of main's shape.
    func testAnOfferThatDisagreesIsTheEmptyOffer() throws {
        let disagreeing = [
            offer(question: "null"),
            offer(mark: "null"),
            offer(pressable: "[]"),
            offer(question: "null", mark: "null", pressable: "[]", command: #""ls""#),
            offer(pressable: #"["5"]"#),
            offer(pressable: #"["2","1"]"#),
            offer(pressable: #"["1","1"]"#),
            offer(canSay: "true"),
            offer(question: #""0123456789ABCDEF-42""#),
            offer(question: #""0123456789abcdef-042""#),
            offer(question: #""0123456789abcde-42""#),
            offer(question: #""0123456789abcdef-12345678901234567""#),
            offer(question: #""0123456789abcdef-4-2""#),
            offer(mark: #""a1b2c3d4e5f""#),
            offer(mark: #""A1B2C3D4E5F6""#),
            offer(pressable: #"["10"]"#)
        ]
        for json in disagreeing {
            XCTAssertEqual(try session(json).replyOffer, .empty, json)
        }
        // A marker main never offers, even when the answer draws it: one
        // character, `1` to `9`.
        for marker in ["10", "0"] {
            let drawn = #"[{"marker":"\#(marker)","text":"Yes"},{"marker":"2","text":"No"}]"#
            XCTAssertEqual(try session(offer(pressable: #"["\#(marker)","2"]"#), choices: drawn).replyOffer, .empty, marker)
        }
    }

    /// Clause: a `reply` with a field missing or of the wrong type refuses the
    /// whole answer, as every field the door sends does.
    func testABrokenOfferRefusesTheAnswer() {
        XCTAssertThrowsError(try session(#"{"question":null,"mark":null,"pressable":[],"command":null}"#))
        XCTAssertThrowsError(try session(#"{"question":null,"mark":null,"pressable":[1],"command":null,"canSay":false}"#))
        XCTAssertThrowsError(try session(#"{"question":null,"mark":null,"pressable":[],"command":null,"canSay":"yes"}"#))
        XCTAssertThrowsError(try session(#""offered""#))
    }

    /// Clause: the offer reads back as the door wrote it.
    func testTheOfferRoundTrips() throws {
        let read = try session(offer(command: #""ls""#))
        let again = try JSONEncoder().encode(read)
        let object = try XCTUnwrap(try JSONSerialization.jsonObject(with: again) as? [String: Any])
        let reply = try XCTUnwrap(object["reply"] as? [String: Any])
        XCTAssertEqual(reply["pressable"] as? [String], ["1", "2", "3", "4"])
        XCTAssertEqual(reply["command"] as? String, "ls")
        XCTAssertEqual(reply["canSay"] as? Bool, false)
        let older = try JSONEncoder().encode(try session(nil))
        let olderObject = try XCTUnwrap(try JSONSerialization.jsonObject(with: older) as? [String: Any])
        XCTAssertNil(olderObject["reply"], "an answer with no reply grew one")
    }

    // MARK: The one id a say may be handed (Revision R13)

    #if os(iOS)
    /// A pairing as Door/ keeps it, from the vectors' code and certificate.
    private func pairedDoor() throws -> PairedDoor {
        let v = try DoorVectorFile.load()
        let offer = try PairingOffer.parse(try XCTUnwrap(v.qr.first).payload)
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        let keys = MemoryClientKeys(spki: v.keys.clientKey)
        let key = try keys.mint()
        return try XCTUnwrap(PairedDoor(
            endpoint: offer.door, macSigningKey: offer.macSigningKey, macExchangeKey: offer.macExchangeKey,
            label: "p318-phone-label", pairedAt: 1_759_190_400_000, keys: PhoneKeys.generate(), clientKey: key,
            certificate: certificate, identity: try keys.adopt(certificate, for: key),
            alerts: AlertsKept(macSends: false, presented: nil)
        ))
    }

    override func tearDown() {
        TestIdentity.removeFromKeychain()
    }

    /// Clause: a say handed a well-formed id goes with THAT id; handed none,
    /// or one that is not well formed, it goes with a fresh one. Read from
    /// what the write went with, over a transport that refuses, so nothing
    /// leaves; asked once each.
    func testASayUsesAKeptIdOnlyWhenWellFormed() async throws {
        let door = try pairedDoor()
        let refusing = CountingTransport(route: nil)
        let client = DoorClient(transport: refusing)
        let kept = await client.say("s-1", text: "x", write: id, door: door)
        XCTAssertEqual(kept.write, id)
        XCTAssertEqual(kept.result, .notSent(.notPaired))
        let fresh = await client.say("s-1", text: "x", write: nil, door: door)
        XCTAssertTrue(WriteId.isWellFormed(try XCTUnwrap(fresh.write)))
        XCTAssertNotEqual(fresh.write, id)
        for bad in ["ABCDEF0123456789ABCDEF0123456789", "abc"] {
            let replaced = await client.say("s-1", text: "x", write: bad, door: door)
            XCTAssertNotEqual(replaced.write, bad, "a kept id that is not well formed went")
            XCTAssertTrue(WriteId.isWellFormed(try XCTUnwrap(replaced.write)))
        }
        XCTAssertEqual(refusing.asked, 4, "each say was asked for once")
    }

    /// Clause: a choose is never handed an id: each press is a fresh one,
    /// asked once, and nothing retries.
    func testAChooseIsAskedOnce() async throws {
        let door = try pairedDoor()
        let refusing = CountingTransport(route: nil)
        let result = await DoorClient(transport: refusing).choose(
            "s-1", question: "0123456789abcdef-42", mark: "a1b2c3d4e5f6", marker: "1", door: door
        )
        XCTAssertEqual(result, .notSent(.notPaired))
        XCTAssertEqual(refusing.asked, 1)
    }

    /// Clause (withheld): a say whose task was cancelled before it began is
    /// never dialled: `.notSent(.cancelled)`.
    func testASayCancelledBeforeItBeganIsWithheld() async throws {
        let door = try pairedDoor()
        let client = DoorClient(transport: CountingTransport(route: DoorRoute(host: "127.0.0.1", port: 1)))
        let task = Task { () -> SentWrite in
            withUnsafeCurrentTask { $0?.cancel() }
            return await client.say("s-1", text: "x", write: nil, door: door)
        }
        let sent = await task.value
        XCTAssertEqual(sent.result, .notSent(.cancelled))
        XCTAssertTrue(sent.result.withheld)
    }
    #endif
}
