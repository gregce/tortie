import Foundation
import XCTest
@testable import Tortie

/// THE START'S WIRE, AS THE PHONE READS IT (Phase 346, build/p346/SPEC.md
/// section 3.2, D5, D26, rules bb5 and gate:onlyadd P1 and P2): the answer's
/// three exactly-when rules and its open reason, and the sessions answer's
/// `start` key read leniently, so a key the phone cannot read never fails
/// Sessions. Every test names the clause it holds.
final class StartContractTests: XCTestCase {
    private func decode<T: Decodable>(_ type: T.Type, _ json: String) throws -> T {
        try JSONDecoder().decode(type, from: Data(json.utf8))
    }

    private let id = String(repeating: "c", count: 32)

    private func answer(
        verb: String = "\"start\"", write: String? = nil, outcome: String, reason: String = "null",
        sentence: String = "null", session: String = "null"
    ) -> String {
        #"{"verb":\#(verb),"write":"\#(write ?? id)","outcome":"\#(outcome)","reason":\#(reason),"sentence":\#(sentence),"session":\#(session)}"#
    }

    private let made = #"{"id":"0f6c1b2e-aa1b-4c9e-8d6f-1234567890ab","name":"claude-2"}"#

    // MARK: The answer (D5)

    /// Clause (D5): a done answer carries its session and nothing else.
    func testADoneAnswerReadsItsSession() throws {
        let read = try decode(PocketStartAnswer.self, answer(outcome: "done", session: made))
        XCTAssertEqual(read.verb, "start")
        XCTAssertEqual(read.outcome, .done)
        XCTAssertEqual(read.session, PocketStartSession(id: "0f6c1b2e-aa1b-4c9e-8d6f-1234567890ab", name: "claude-2"))
        XCTAssertNil(read.reason)
        XCTAssertNil(read.sentence)
    }

    /// Clause (D5): the three exactly-when rules, each refused when broken.
    func testTheThreeExactlyWhenRules() {
        let refusedBodies = [
            // a session only with done
            answer(outcome: "done"),
            answer(outcome: "refused", reason: #""project""#, sentence: #""Gone.""#, session: made),
            answer(outcome: "busy", sentence: #""Busy.""#, session: made),
            // a sentence exactly when not done
            answer(outcome: "done", sentence: #""Done.""#, session: made),
            answer(outcome: "failed"),
            answer(outcome: "busy", sentence: #""""#),
            // a reason exactly when refused
            answer(outcome: "refused", sentence: #""Gone.""#),
            answer(outcome: "failed", reason: #""project""#, sentence: #""Failed.""#),
            answer(outcome: "refused", reason: #""""#, sentence: #""Gone.""#),
            // the verb
            answer(verb: #""end""#, outcome: "done", session: made),
            answer(verb: "null", outcome: "done", session: made),
            // an outcome no write has
            answer(outcome: "started", session: made),
            // a session the Mac could not have made
            answer(outcome: "done", session: #"{"id":"","name":"claude-2"}"#),
            answer(outcome: "done", session: #"{"id":"a b","name":"claude-2"}"#),
            answer(outcome: "done", session: #"{"id":"\#(String(repeating: "x", count: 129))","name":"n"}"#),
            answer(outcome: "done", session: #"{"id":"made-1","name":""}"#),
            answer(outcome: "done", session: #"{"id":"made-1"}"#),
            // a field missing
            #"{"verb":"start","write":"\#(id)","outcome":"failed","reason":null,"session":null}"#
        ]
        for body in refusedBodies {
            XCTAssertThrowsError(try decode(PocketStartAnswer.self, body), body)
        }
    }

    /// Clause (D5): the reason is an OPEN word, so a later Mac's reason reads,
    /// and the sentence is what is drawn.
    func testTheReasonIsAnOpenWord() throws {
        for reason in ["project", "agent", "machine", "interpreter", "often", "stopped", "malformed", "a-reason-from-a-later-mac"] {
            let read = try decode(PocketStartAnswer.self, answer(outcome: "refused", reason: "\"\(reason)\"", sentence: #""Nothing was started.""#))
            XCTAssertEqual(read.reason, reason)
            XCTAssertEqual(read.sentence, "Nothing was started.")
        }
    }

    /// Clause (D5): only `refused` `malformed` may echo no id.
    func testOnlyMalformedEchoesNoId() throws {
        let malformed = try decode(PocketStartAnswer.self, answer(write: "", outcome: "refused", reason: #""malformed""#, sentence: #""Unreadable.""#))
        XCTAssertTrue(malformed.echoesNoId)
        let other = try decode(PocketStartAnswer.self, answer(write: "", outcome: "refused", reason: #""project""#, sentence: #""Gone.""#))
        XCTAssertFalse(other.echoesNoId)
    }

    /// Clause: an answer reads back as it was written.
    func testTheAnswerRoundTrips() throws {
        let read = try decode(PocketStartAnswer.self, answer(outcome: "done", session: made))
        let again = try JSONDecoder().decode(PocketStartAnswer.self, from: try JSONEncoder().encode(read))
        XCTAssertEqual(again, read)
    }

    // MARK: The key on the sessions answer (D9, D26)

    /// A whole sessions answer, with `start` spelled as given (or absent).
    private func sessions(start: String?) -> String {
        let key = start.map { #","start":\#($0)"# } ?? ""
        return #"{"asked":{"show":"active","group":"project","sort":"recent","agent":null,"machine":null},"rows":[],"groups":[],"agents":[],"machines":[],"total":0,"omitted":0,"at":1,"ageNote":"Ages."\#(key)}"#
    }

    private let offer = #"{"state":"offered","projects":[{"id":"p1","label":"webapp","machine":null,"folder":null,"place":"local"},{"id":"p2","label":"api","machine":"Mac Pro","folder":"~/src/api","place":"studio-pro"}],"places":[{"id":"local","ready":true,"read":true,"agents":["claude","codex"]},{"id":"studio-pro","ready":false,"read":false,"agents":[]}],"agents":[{"id":"claude","name":"Claude Code","icon":"claude","danger":null},{"id":"codex","name":"Codex CLI","icon":"codex","danger":"Full auto"}],"chosen":"p1","defaultAgent":"claude"}"#

    /// Clause (D9): an offer, `waiting`, and no key at all each read as sent.
    func testTheKeyReadsOfferedWaitingAndAbsent() throws {
        let offered = try decode(PocketSessionsAnswer.self, sessions(start: offer))
        guard case .offered(let read)? = offered.start else { return XCTFail("no offer read") }
        XCTAssertEqual(read.projects.map(\.id), ["p1", "p2"])
        XCTAssertEqual(read.projects[1].machine, "Mac Pro")
        XCTAssertEqual(read.projects[1].folder, "~/src/api")
        XCTAssertEqual(read.places.map(\.ready), [true, false])
        XCTAssertEqual(read.agents.map(\.danger), [nil, "Full auto"])
        XCTAssertEqual(read.chosen, "p1")
        XCTAssertEqual(read.defaultAgent, "claude")
        XCTAssertEqual(try decode(PocketSessionsAnswer.self, sessions(start: #"{"state":"waiting"}"#)).start, .waiting)
        XCTAssertNil(try decode(PocketSessionsAnswer.self, sessions(start: nil)).start)
    }

    /// Clause (D26, bb5): a key the phone cannot read is NO key, and the rest
    /// of the answer is read exactly as without it. Ten malformed keys.
    func testAMalformedKeyNeverFailsSessions() throws {
        let plain = try decode(PocketSessionsAnswer.self, sessions(start: nil))
        let broken = [
            #"{"state":"later"}"#,
            #"{"state":7}"#,
            #""offered""#,
            #"[]"#,
            #"{"state":"offered"}"#,
            offer.replacingOccurrences(of: #""place":"studio-pro""#, with: #""place":"nowhere""#),
            offer.replacingOccurrences(of: #""chosen":"p1""#, with: #""chosen":"p9""#),
            offer.replacingOccurrences(of: #""defaultAgent":"claude""#, with: #""defaultAgent":"shell""#),
            offer.replacingOccurrences(of: #""agents":["claude","codex"]"#, with: #""agents":["claude","gemini"]"#),
            offer.replacingOccurrences(of: #""label":"webapp""#, with: #""label":12"#),
            offer.replacingOccurrences(of: #"{"id":"p2""#, with: #"{"id":"p1""#)
        ]
        for key in broken {
            let read = try decode(PocketSessionsAnswer.self, sessions(start: key))
            XCTAssertNil(read.start, key)
            XCTAssertEqual(read.asked, plain.asked, key)
            XCTAssertEqual(read.ageNote, plain.ageNote, key)
            XCTAssertEqual(read.totalSessions, plain.totalSessions, key)
        }
    }

    /// Clause (D26): an offer past the Mac's own caps is no offer: 201
    /// projects, 65 agents or 202 places; at the caps it reads.
    func testAnOfferPastTheCapsIsNoOffer() throws {
        func offer(projects: Int, agents: Int, places: Int) -> String {
            let agentIds = (0..<agents).map { "a\($0)" }
            let placeIds = ["local"] + (1..<max(1, places)).map { "m\($0)" }
            let projectRows = (0..<projects).map { #"{"id":"p\#($0)","label":"x","machine":null,"folder":null,"place":"local"}"# }
            let placeRows = placeIds.map { #"{"id":"\#($0)","ready":true,"read":true,"agents":[]}"# }
            let agentRows = agentIds.map { #"{"id":"\#($0)","name":"n","icon":"i","danger":null}"# }
            return #"{"state":"offered","projects":[\#(projectRows.joined(separator: ","))],"places":[\#(placeRows.joined(separator: ","))],"agents":[\#(agentRows.joined(separator: ","))],"chosen":null,"defaultAgent":null}"#
        }
        let atTheCaps = offer(projects: PocketStartBounds.projects, agents: PocketStartBounds.agents, places: PocketStartBounds.places)
        XCTAssertNotNil(try decode(PocketSessionsAnswer.self, sessions(start: atTheCaps)).start?.offer)
        for (p, a, l) in [(201, 1, 1), (1, 65, 1), (1, 1, 202)] {
            XCTAssertNil(try decode(PocketSessionsAnswer.self, sessions(start: offer(projects: p, agents: a, places: l))).start, "\(p) \(a) \(l)")
        }
        XCTAssertEqual(PocketStartBounds.projects, 200)
        XCTAssertEqual(PocketStartBounds.agents, 64)
        XCTAssertEqual(PocketStartBounds.places, 201)
    }

    /// Clause: the key reads back as it was written: an offer and `waiting`,
    /// each encoded and read again, are what was read (the vectors compare a
    /// whole sessions answer as JSON values, `DoorVectorTests`).
    func testTheKeyRoundTrips() throws {
        for key in [offer, #"{"state":"waiting"}"#] {
            let start = try XCTUnwrap(try decode(PocketSessionsAnswer.self, sessions(start: key)).start, key)
            let again = try JSONDecoder().decode(PocketSessionsStart.self, from: try JSONEncoder().encode(start))
            XCTAssertEqual(again, start, key)
        }
    }

    /// Clause (D26): the drawing of an answer with a broken key is the drawing
    /// of the same answer with none: Sessions draws as it always did.
    func testABrokenKeyDrawsTheSameSessions() throws {
        let plain = try SessionsDrawing(decode(PocketSessionsAnswer.self, sessions(start: nil)), asked: SessionsQuery(show: .active, group: .project, sort: .recent, agent: nil, machine: nil))
        let broken = try SessionsDrawing(decode(PocketSessionsAnswer.self, sessions(start: #"{"state":"later"}"#)), asked: SessionsQuery(show: .active, group: .project, sort: .recent, agent: nil, machine: nil))
        XCTAssertEqual(plain, broken)
    }
}
