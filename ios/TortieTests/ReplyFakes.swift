import Foundation
@testable import Tortie

// The stand-ins Phase 318's tests drive (build/p318/SPEC.md section 7). Kept
// apart from EndFakes.swift and ScreensFixtures.swift, so neither moves: a
// writer that replies is a NEW type here, and 317's `ScriptedWriter` gains the
// two reply requirements below, answering that it sent nothing, because no End
// test presses or sends.
//
// They script what the Mac answers; they sign nothing and reach nothing.

/// The Mac's answers to the two reply writes, scripted, and every write
/// asked, in order.
actor ScriptedReplier: DoorWriting {
    struct Choose: Equatable, Sendable {
        let session: String
        let question: String
        let mark: String
        let marker: String
    }

    struct Say: Equatable, Sendable {
        let session: String
        let text: String
        let write: String?
    }

    private var chooseResults: [WriteResult]
    private var sayResults: [WriteResult]
    /// The id each say that was not handed one went with, in order.
    private var minted: [String]
    private(set) var chooses: [Choose] = []
    private(set) var says: [Say] = []
    private(set) var endCount = 0
    /// Run inside each write, before it answers.
    private let during: (@Sendable () async -> Void)?

    init(
        chooses: [WriteResult] = [],
        says: [WriteResult] = [],
        minted: [String] = ReplyAnswers.mintedIds,
        during: (@Sendable () async -> Void)? = nil
    ) {
        chooseResults = chooses
        sayResults = says
        self.minted = minted
        self.during = during
    }

    func end(_ sessionId: String, batch: Bool) async -> WriteResult {
        endCount += 1
        return .noAnswer
    }

    func choose(_ sessionId: String, question: String, mark: String, marker: String) async -> WriteResult {
        chooses.append(Choose(session: sessionId, question: question, mark: mark, marker: marker))
        await during?()
        return chooseResults.isEmpty ? .noAnswer : chooseResults.removeFirst()
    }

    /// Answers as the client does: a handed id when there is one, else the
    /// next minted id, and the scripted result.
    func say(_ sessionId: String, text: String, write: String?) async -> SentWrite {
        says.append(Say(session: sessionId, text: text, write: write))
        await during?()
        let id = write ?? (minted.isEmpty ? nil : minted.removeFirst())
        return SentWrite(result: sayResults.isEmpty ? .noAnswer : sayResults.removeFirst(), write: id)
    }

    var chooseCount: Int { chooses.count }
    var sayCount: Int { says.count }
}

/// 317's End writer meets the two reply requirements: it sends nothing,
/// because no End test presses an option or sends a message.
extension ScriptedWriter {
    func choose(_ sessionId: String, question: String, mark: String, marker: String) async -> WriteResult {
        .notSent(.notPaired)
    }

    func say(_ sessionId: String, text: String, write: String?) async -> SentWrite {
        SentWrite(result: .notSent(.notPaired), write: nil)
    }
}

/// The app's reply registry, for a test with no app: every runner made, and
/// the ones still live.
@MainActor
final class ReplyRecord: ReplyRunnerRegistry {
    private(set) var made: [ReplyRunner] = []
    private(set) var live: [ReplyRunner] = []

    func registerReply(_ runner: ReplyRunner) {
        made.append(runner)
        live.append(runner)
    }

    func releaseReply(_ runner: ReplyRunner) {
        live.removeAll { $0 === runner }
    }
}

/// A clock a test moves by hand.
final class HandClock: @unchecked Sendable {
    private let lock = NSLock()
    private var current: Date

    init(_ start: Date = Date(timeIntervalSince1970: 1_759_400_000)) {
        current = start
    }

    var now: Date { lock.withLock { current } }

    func set(_ date: Date) {
        lock.withLock { current = date }
    }

    /// The model's `clock`.
    var read: @Sendable () -> Date { { [self] in self.now } }
}

/// The Mac's answers and offers, field by field.
enum ReplyAnswers {
    /// The ids a scripted say goes with when it is handed none, in order.
    static let mintedIds = [
        "0123456789abcdef0123456789abcdef",
        "fedcba9876543210fedcba9876543210",
        "00112233445566778899aabbccddeeff",
        "ffeeddccbbaa99887766554433221100"
    ]

    static let question = "0123456789abcdef-42"
    static let mark = "a1b2c3d4e5f6"

    static func answer(
        _ outcome: PocketWriteAnswer.Outcome,
        verb: PocketWriteAnswer.Verb,
        reason: PocketWriteAnswer.Reason? = nil,
        sentence: String? = nil,
        write: String = "0123456789abcdef0123456789abcdef"
    ) -> WriteResult {
        .answered(PocketWriteAnswer(verb: verb, write: write, outcome: outcome, reason: reason, sentence: sentence))
    }

    static let chosen = answer(.done, verb: .choose)
    static let sent = answer(.done, verb: .say)
    static let changed = answer(.refused, verb: .choose, reason: .changed, sentence: "This session changed. Nothing was done.")
    static let notReady = answer(
        .refused, verb: .say, reason: .unsayable, sentence: "This session is not ready for a message. Nothing was sent."
    )
    static let sayBusy = answer(
        .busy, verb: .say, sentence: "Tortie is still doing the last thing you asked from this phone. Nothing was done."
    )
    static let notTakenSentence = "Your answer was typed and the question is still there."
    static let pressNotTaken = answer(.failed, verb: .choose, sentence: notTakenSentence)

    /// Claude's Bash prompt as main reads it: four options, every one
    /// pressable when the command is said whole (his ruling, "Yes, allow them").
    static let claudeChoices = [
        PocketChoiceOption(marker: "1", text: "Yes"),
        PocketChoiceOption(marker: "2", text: "Yes, and always allow access to p318 from this project"),
        PocketChoiceOption(marker: "3", text: "Yes, and switch to auto mode · auto mode handles these prompts for you"),
        PocketChoiceOption(marker: "4", text: "No")
    ]

    static func offer(
        _ pressable: [String] = ["1", "2", "3", "4"],
        question: String? = ReplyAnswers.question,
        mark: String? = ReplyAnswers.mark,
        command: String? = nil,
        canSay: Bool = false
    ) -> PocketReplyOffer {
        PocketReplyOffer(question: question, mark: mark, pressable: pressable, command: command, canSay: canSay)
    }

    static let sayable = PocketReplyOffer(question: nil, mark: nil, pressable: [], command: nil, canSay: true)

    /// One session's answer carrying `reply`, as the door composes it.
    static func session(
        _ id: String = "s",
        choices: [PocketChoiceOption] = [],
        question: String? = nil,
        reply: PocketReplyOffer? = nil,
        title: String = "Needs input",
        agent: String = "claude"
    ) -> PocketSessionAnswer {
        var detail = Answers.detail(Answers.row(id, agent: agent, title: title, question: question, choices: choices))
        detail.reply = reply
        return PocketSessionAnswer(session: detail, at: 1_759_400_000_000)
    }

    /// The JSON of one session answer, with `reply` written as given (nil
    /// leaves the key out, as a Mac older than 318 does).
    static func sessionJSON(choices: String = "[]", reply: String?) -> String {
        let row = #""sessionId":"s","name":"s","project":"p","machine":null,"agent":"claude","agentLabel":"Claude Code","statusLabel":"needs input","statusTitle":"Needs input","statusDot":"attention","question":"Do you want to proceed?","choices":"# + choices + #","blockedSince":1,"seenAtWake":false,"ageText":"now""#
        let rest = #""catchUp":null,"lastAnswer":null,"turnCount":0,"handoff":null,"activity":null,"lastMessageText":null"#
        let tail = reply.map { #","reply":"# + $0 } ?? ""
        return #"{"session":{"# + row + "," + rest + tail + #"},"at":1}"#
    }

    /// Claude's four options as the door writes them.
    static let claudeChoicesJSON = #"[{"marker":"1","text":"Yes"},{"marker":"2","text":"Yes, and always allow"},{"marker":"3","text":"Yes, and switch to auto mode"},{"marker":"4","text":"No"}]"#
}
