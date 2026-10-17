// What the screens ask of the door, and what they say when it does not answer
// (Phase 316.2).
//
// THE SEAM. The reading screens ask `DoorReading` and the pairing screen
// asks `PhoneDoor`; App/TortieApp.swift composes both from Door/ (`DoorClient`
// over the kept `PairedDoor`, `PairingFlow`, `PairingStore`). The screens hold
// no key, build no request and name no network type (conformance:ios rule c),
// and the tests drive every model through a fake of these two protocols.
//
// THE WORDS. Door/ reports a failure as a case with no words in it
// (`DoorFailure`, `PairingFailure`); this file is the one place a case becomes
// a sentence, and every sentence is Copy.swift's. A read ends in exactly one of
// three things, so a screen is never half drawn:
//
//   draw(sentence)  the screen shows that one line in place of its content
//   backToList      the door refused a read about ONE session (404, which is
//                   every refusal it makes and says nothing of why): the list
//                   is read again and is the truth, so a session the Mac no
//                   longer has is simply gone from it, and a phone the Mac no
//                   longer knows is refused there too and goes to pairing
//   pairAgain       the list itself was refused, or there is no pairing: the
//                   phone goes back to Pairing with one line (S3: "When the
//                   door answers unpaired or revoked ... the phone goes to
//                   Pairing with one line")
//
// A read the person walked away from (the screen closed, a pull replaced it)
// is none of these: it is dropped without a word.
//
// THE WRITE (Phase 317, build/p317/SPEC.md section 5.8.6). A paired reader
// also answers `writer`, the End. `writer` is a REQUIREMENT of `DoorReading`,
// not only an extension member: the app holds its reader as
// `any DoorReading`, and a member that lived only in an extension would be
// dispatched statically there and read nil, so the shipping app would draw
// no End and no Select while every concretely typed fake passed. The
// extension's nil is the default for a reader that writes nothing (316.6's
// fakes). A write's result becomes a sentence here too (`endSentence`), and
// every one is Copy.swift's or the Mac's own.
//
// THE REPLY WRITES (Phase 318, build/p318/SPEC.md section 5.7.2). The same
// writer presses an option (`choose`) and sends one message (`say`), each
// sent at most once and never retried, and NEITHER asks Face ID (his ruling,
// "Only for End"). Their results become sentences in `replySentence`.
//
// THE SESSIONS READ (Phase 316.7, build/p3167/SPEC.md section 6.4.3).
// `sessions(_:)` is a REQUIREMENT too, for the same reason as `writer`, and
// its extension default throws `DoorFailure.refused`: a reader with no such
// read (the tests' fakes) behaves exactly as a Mac older than this phase,
// whose door answers the route with a 404. The Sessions tab reads that
// refusal as today's tab, never as Pairing, once the list's own read has
// answered (Screens/SessionsScreen.swift `SessionsModel`).
//
// THE SCREEN (Phase 337, build/p337/SPEC.md section 5.8.3). `screenDoor(_:)`
// is a REQUIREMENT too, for the same reason as `writer`, and its extension
// default is nil: a reader with no Screen (the tests' fakes) draws no Screen,
// and since Phase 333.3 See a sample answers one, over its own made-up
// screens (Sample/SampleReader.swift). A paired reader's Screen door holds
// its own two kept connections, one for the poll and one for the keys
// (Door/DoorClient.swift `DoorLine`). Keys ask no Face ID (his
// ruling 3, "Every key, including Ctrl-C"); a keys write's result becomes a
// sentence in `keysSentence`, and a failed read of the screen in
// `screenSentence`.
//
// THE TERMINAL'S HISTORY (Phase 337.1, build/p3371/SPEC.md D7, D30). The same
// door reads pages of the session's history (`scrollback`) and the status
// line's session (`session()`), both on a third kept connection, one exchange
// at a time; a page that is refused stops paging with `scrollbackSentence`.
//
// SEVERAL MACS (Phase 345, build/p345/SPEC.md section 3.3). The phone keeps
// up to four pairings, one per Mac, and `pairedReaders()` answers every one
// in the store's order. It is a REQUIREMENT, for the same reason as `writer`:
// the app holds its door as `any PhoneDoor`, and a member that lived only in
// an extension would be dispatched there and answer one Mac at most. The
// extension's default is `pairedReader()`'s one, for a door that keeps one
// (the tests' stand-ins). Unpair names the Mac it forgets (`unpair(name:)`),
// and a pairing made beside another Mac says `This iPhone is not paired with
// this Mac.` where one with no other says `…with a Mac.`
//
// THE START (Phase 346, build/p346/SPEC.md section 4.15). A paired reader
// also answers `starter`, which starts ONE session on its Mac through
// `POST /v1/start`. `starter` is a REQUIREMENT of `DoorReading`, for the same
// reason as `writer`, and its extension default is nil, so a reader that
// starts nothing (every test fake before this phase) draws no "+". Its one
// caller is `StartRunner.run`. It asks NO Face ID, Touch ID or passcode (his
// answer 5, "no face id to start a session"). See a sample answers one that
// sends nothing (Sample/SampleReader.swift). A start's result becomes a
// sentence in `startSentence`.

import Foundation

// MARK: - The seam

/// The four signed reads, for the pairing this phone keeps.
protocol DoorReading: Sendable {
    /// What this pairing agreed about alerts (Phase 316.5): whether its Mac
    /// said it could send, and the address the Mac holds, which the list
    /// compares with the phone's own now.
    var alerts: AlertsKept { get }
    /// What Settings says about the paired Mac (Phase 316.6), from the
    /// pairing the app already holds in memory: no Keychain read and no door
    /// read.
    var facts: PairedFacts { get }
    /// The write this pairing can make, or nil when it makes none (Phase
    /// 317). A requirement, so `any DoorReading` reads the reader's own.
    var writer: (any DoorWriting)? { get }
    func blocked() async throws -> PocketBlockedAnswer
    func session(_ sessionId: String) async throws -> PocketSessionAnswer
    func turns(_ sessionId: String, to: Int?) async throws -> PocketTurnsAnswer
    /// `GET /v1/sessions` with `query`'s words (Phase 316.7). A requirement,
    /// so `any DoorReading` reads the reader's own.
    func sessions(_ query: SessionsQuery) async throws -> PocketSessionsAnswer
    /// One session's Screen door (Phase 337), or nil when this reader has
    /// none. A requirement, so `any DoorReading` reads the reader's own.
    func screenDoor(_ sessionId: String) -> (any ScreenDoor)?
    /// The start this pairing can make (Phase 346), or nil when it makes
    /// none. A requirement, so `any DoorReading` reads the reader's own.
    var starter: (any DoorStarting)? { get }
}

extension DoorReading {
    /// A reader that writes nothing: no End and no Select.
    var writer: (any DoorWriting)? { nil }

    /// A reader that starts nothing: no "+" (Phase 346).
    var starter: (any DoorStarting)? { nil }

    /// A reader with no Screen: none is drawn.
    func screenDoor(_ sessionId: String) -> (any ScreenDoor)? { nil }

    /// A reader with no sessions read is a Mac older than Phase 316.7: its
    /// door refuses the route.
    func sessions(_ query: SessionsQuery) async throws -> PocketSessionsAnswer {
        throw DoorFailure.refused
    }
}

/// The signed writes, each sent at most once and never retried: End (Phase
/// 317), only after the owner check (his ruling: "Only for End"), and the two
/// replies (Phase 318), which ask none.
protocol DoorWriting: Sendable {
    /// `POST /v1/end` for one session. `batch` asks for End these' one
    /// narrowing. The ONE caller in the app is `EndRunner.run`.
    func end(_ sessionId: String, batch: Bool) async -> WriteResult
    /// `POST /v1/choose`: one option of the question the session answer
    /// offered, echoing its question id and mark. The ONE caller in the app is
    /// `ReplyRunner.run`.
    func choose(_ sessionId: String, question: String, mark: String, marker: String) async -> WriteResult
    /// `POST /v1/say`: one message. `write` is nil, or the id a message with
    /// the same words carried when its answer did not come (Revision R13).
    /// The ONE caller in the app is `ReplyRunner.run`.
    func say(_ sessionId: String, text: String, write: String?) async -> SentWrite
}

/// The start (Phase 346): ONE session on the reader's Mac, in a project it
/// offered and with an agent installed there, sent at most once and never
/// retried, asking no owner check (his answer 5).
protocol DoorStarting: Sendable {
    /// `POST /v1/start`. `write` is nil, or the id a start with the same Mac,
    /// project and agent carried when its answer did not come (D17). The ONE
    /// caller in the app is `StartRunner.run`.
    func start(project: String, agent: String, write: String?) async -> SentStart
}

/// One session's Terminal, through the door (Phase 337): the long poll and
/// the keys, each on a connection of its own that it keeps between requests;
/// and since Phase 337.1 (build/p3371/SPEC.md D30) a third kept connection,
/// the side line, which carries the pages of history and the status line's
/// re-reads, one exchange at a time.
protocol ScreenDoor: AnyObject, Sendable {
    /// `GET /v1/screen`, holding `since`, the revision drawn now.
    func read(since: String?) async throws -> PocketScreenAnswer
    /// `POST /v1/keys`: one batch, echoing the question id and the window's
    /// mark of the picture they were typed against. Never retried. The ONE
    /// caller in the app is `ScreenKeySender`.
    func keys(_ keys: [KeyItem], turn: String, dialog: String?) async -> WriteResult
    /// `GET /v1/scrollback` (Phase 337.1, D7): one page of the session's
    /// history, on the side line. A read: it changes nothing on the Mac. The
    /// ONE caller in the app is `ScrollbackModel`.
    func scrollback(from: Int, count: Int, depth: Int, wrap: Int, keep: ScrollbackKeep) async throws -> PocketScrollbackAnswer
    /// `GET /v1/session` for this door's session (Phase 337.1, D17), on the
    /// side line: the Terminal's status line reads it.
    func session() async throws -> PocketSessionAnswer
    /// Whether this door takes keys at all (a pairing that writes).
    var writes: Bool { get }
    /// Close every kept connection now (the Terminal went away, or the app).
    func close()
}

/// How a pairing ended, for the screen.
enum PairResult: Sendable {
    /// Done: the FIRST SIGNED READ came back whole and the pairing is kept.
    /// Its answer is the list, so the list draws at once.
    case paired(any DoorReading, PocketBlockedAnswer)
    case failed(PairingFailure)
}

/// Everything the app asks of Door/.
protocol PhoneDoor: Sendable {
    /// The first kept pairing's reads, or nil when this phone is not paired or
    /// this build has no way to reach a Mac. The app reads `pairedReaders()`;
    /// this is what its default answers from (Phase 345).
    func pairedReader() -> (any DoorReading)?
    /// Every kept pairing's reads, one per Mac, in the store's order: the
    /// first Mac paired, then the rest by when each was paired (Phase 345,
    /// D9). Empty when this phone is not paired. A requirement, so
    /// `any PhoneDoor` reads the door's own.
    func pairedReaders() -> [any DoorReading]
    /// Read a scanned code and make this phone's keys for it. The pending
    /// pairing carries the fingerprint both screens show.
    func begin(payload: String, label: String) throws -> PendingPairing
    /// Present until the Mac answers, then make the first signed read over
    /// the phone's new identity. The ONLY way to `.paired` is that read
    /// succeeding (Door/Pairing.swift), so `allowed` alone is not success.
    /// `askForAlerts` is asked at most once, only if the Mac says it can send.
    func pair(
        _ pending: PendingPairing,
        askForAlerts: @escaping @Sendable () async -> PushAddress?,
        progress: @escaping @Sendable (PairingStep) -> Void
    ) async -> PairResult
    /// Forget every kept pairing (the DEBUG forget seam).
    func forget()
    /// Unpair this iPhone from the Mac whose whole public name is `name`
    /// (Phase 316.6; one Mac of several since Phase 345): forget that Mac's
    /// pairing record, which holds both private keys, FIRST, then its client
    /// key, and say whether the record went. Every other Mac's pairing is
    /// untouched. The Mac keeps its row until he presses Remove there (its
    /// half is not built: Phase 317's fix round took it out).
    func unpair(name: String) -> UnpairOutcome
}

extension PhoneDoor {
    /// A door that keeps one pairing at most: its one, or none.
    func pairedReaders() -> [any DoorReading] {
        pairedReader().map { [$0] } ?? []
    }
}

/// What Unpair did (build/p3166/SPEC.md section 5.4).
enum UnpairOutcome: Equatable, Sendable {
    /// The record is gone, and with it everything that can sign a read or
    /// present the phone's identity.
    case forgotten
    /// The record is still there, or could not be proved gone; because it
    /// goes first, nothing else was touched.
    case kept
}

/// The paired Mac, as Settings draws it (Phase 316.6, SPEC section 5.3.2).
/// Public facts ONLY: no key, pin, label, certificate, token or phone id is
/// carried, so nothing here can sign, present or address anything.
struct PairedFacts: Equatable, Sendable {
    /// The Mac's public name up to its first `.`: `studio`.
    let name: String
    /// The Mac's WHOLE public name, no port: `studio.tail0000.ts.net`. What
    /// the phone dials, and so what keys a Mac among several (Phase 345, D2).
    let publicName: String
    /// The whole public name and its port: `studio.tail0000.ts.net:8443`.
    let address: String
    /// The six groups both screens showed when this iPhone paired.
    let fingerprint: String
    /// Epoch ms of the first signed read that succeeded.
    let pairedAt: Double
    /// Whether the Mac said, as it held this phone, that it could send an
    /// alert (Phase 316.5's `sends`).
    let macSends: Bool

    init(name: String, address: String, fingerprint: String, pairedAt: Double, macSends: Bool, publicName: String = "") {
        self.name = name
        self.publicName = publicName
        self.address = address
        self.fingerprint = fingerprint
        self.pairedAt = pairedAt
        self.macSends = macSends
    }

    init(_ door: PairedDoor) {
        name = Self.firstLabel(door.endpoint.name)
        publicName = door.endpoint.name
        address = door.endpoint.name + ":" + String(door.endpoint.port)
        fingerprint = door.fingerprint
        pairedAt = door.pairedAt
        macSends = door.alerts.macSends
    }

    /// A public name up to its first `.`: `studio`.
    static func firstLabel(_ publicName: String) -> String {
        String(publicName.prefix { $0 != "." })
    }

    /// How a Mac among `kept` is drawn (Phase 345, D21): its first label, or
    /// its WHOLE public name when another kept Mac has the same first label,
    /// because Tailscale keeps names unique within one tailnet only. With one
    /// Mac it is the first label, as Settings has always drawn it.
    static func drawnName(_ publicName: String, among kept: [String]) -> String {
        let first = firstLabel(publicName)
        let shared = kept.contains { $0 != publicName && firstLabel($0) == first }
        return shared ? publicName : first
    }
}

/// What a screen tells the app when a read means it belongs somewhere else.
struct ReadRouting: Sendable {
    /// Pop to the list, which reads again.
    let backToList: @MainActor @Sendable () -> Void
    /// Go to Pairing with the not-paired line.
    let pairAgain: @MainActor @Sendable () -> Void

    /// For a screen that is going nowhere (the tests, a preview).
    static let stay = ReadRouting(backToList: {}, pairAgain: {})
}

// MARK: - The words

/// Where the app goes when a read fails.
enum ReadConsequence: Equatable {
    case draw(String)
    case backToList
    case pairAgain
}

/// Which read failed: the list's, or a read about one session.
enum ReadKind {
    case list
    case oneSession
}

enum DoorWords {
    /// The person walked away from this read. Never a sentence.
    static func isCancellation(_ error: Error) -> Bool {
        if error is CancellationError { return true }
        if let failure = error as? DoorFailure, failure == .cancelled { return true }
        if let failure = error as? PairingFailure, failure == .cancelled { return true }
        return false
    }

    /// What a failed read means for where the app goes.
    static func consequence(of error: Error, reading kind: ReadKind) -> ReadConsequence {
        if let failure = error as? DoorFailure {
            switch failure {
            case .notPaired:
                return .pairAgain
            // The door refused, or closed the connection on this phone's
            // key before a byte, which is how it answers a phone it no
            // longer knows (Phase 330's mutual TLS).
            case .refused, .closedBeforeAnswer:
                return kind == .list ? .pairAgain : .backToList
            default:
                break
            }
        }
        return .draw(sentence(for: error))
    }

    /// The one sentence for a read that did not come back.
    static func sentence(for error: Error) -> String {
        guard let failure = error as? DoorFailure else {
            // Anything Door/ did not name is an answer this build could not
            // read, never a guess at a connection problem.
            return Copy.answerUnreadable
        }
        switch failure {
        case .notPaired: return Copy.notPaired
        case .wrongKey: return Copy.keyMismatch
        // A paired phone's reads say the name the same way as any other miss:
        // the name-specific sentences are the pairing screen's alone.
        case .unreachable, .nameNotFound: return Copy.cannotReachMac
        case .timedOut: return Copy.macDidNotAnswer
        case .refused, .closedBeforeAnswer: return Copy.notPaired
        case .unexpectedStatus, .malformed: return Copy.answerUnreadable
        case .tooLarge: return Copy.answerTooLarge
        // The newest page broke the door's promise; the older-page line is
        // `olderPageSentence`'s, where there are earlier turns to speak of.
        case .badPage: return Copy.answerUnreadable
        case .cancelled: return Copy.answerUnreadable
        }
    }

    /// The line a failure draws under its sentence (Phase 333.1, D23): Allow
    /// on the Mac, under `Tortie could not reach your Mac.` and nothing else. A
    /// Mac that updated to a build with a new route shuts its door until Allow,
    /// and a paired phone reads a shut door as a connection that never
    /// finishes, which is that sentence. A time-out is not that.
    static func reachNote(for sentence: String) -> String? {
        if sentence == Copy.cannotReachMac {
            return Copy.reachAllowAgain
        }
        return nil
    }

    /// The line drawn where older turns would be, when a page of them failed.
    static func olderPageSentence(for error: Error) -> String {
        if let failure = error as? DoorFailure, failure == .badPage || failure == .malformed {
            return Copy.earlierTurnsUnreadable
        }
        return sentence(for: error)
    }

    /// The End's line for a write's result (Phase 317, build/p317/SPEC.md
    /// section 5.7): ALWAYS a sentence, never empty (conformance:ios rule v).
    /// A `done` answer draws nothing on the session screen, which re-reads
    /// and then reads Ended; its word here is the Mac batch's `Ended`.
    static func endSentence(for result: WriteResult) -> String {
        switch result {
        case .answered(let answer):
            guard answer.outcome != .done else { return Copy.ended }
            // The decoder refuses a non-done answer with no sentence or an
            // empty one, so this is the Mac's own sentence.
            return answer.sentence ?? Copy.answerUnreadable
        // Both are true of a 404 and of a withheld write: the Mac did not end it.
        case .notTaken:
            return Copy.endNotTaken
        case .noAnswer:
            return Copy.endNoAnswer
        case .notSent(let failure):
            return failure == .cancelled ? Copy.endNotTaken : sentence(for: failure)
        }
    }

    /// A reply's line for a write's result (Phase 318, build/p318/SPEC.md
    /// section 5.7.2): ALWAYS a sentence, never empty (conformance:ios rule
    /// v). A `done` press draws nothing (the session reads again and no
    /// longer waits) and a `done` message draws `Sent`, its word here. An
    /// answered refusal, failure or busy is the Mac's own sentence. A 404 and
    /// a write withheld because the app left are both "nothing was sent",
    /// which is true of each; no answer is End's own line, whose words are
    /// true of any write; anything else not sent says why.
    static func replySentence(for result: WriteResult) -> String {
        switch result {
        case .answered(let answer):
            guard answer.outcome != .done else { return Copy.replySent }
            // The decoder refuses a non-done answer with no sentence or an
            // empty one, so this is the Mac's own sentence.
            return answer.sentence ?? Copy.answerUnreadable
        case .notTaken:
            return Copy.replyNotTaken
        case .noAnswer:
            return Copy.endNoAnswer
        case .notSent(let failure):
            return failure == .cancelled ? Copy.replyNotTaken : sentence(for: failure)
        }
    }

    /// The Screen's line when a read of the screen did not come back and
    /// there is no picture to keep (Phase 337): ALWAYS a sentence, never
    /// empty (conformance:ios rule v), the same words as any read's.
    static func screenSentence(for failure: DoorFailure) -> String {
        sentence(for: failure)
    }

    /// The Terminal's scrollback line when a page of history was REFUSED and
    /// paging stops (Phase 337.1, D27): ALWAYS a sentence, never empty
    /// (conformance:ios rule v). A refusal (404, or the connection ended on
    /// this phone's key) is a history the Mac no longer answers for here, and
    /// the way back is the live terminal, which reads it all again: the
    /// phone's own `Earlier lines changed…`. Anything else is any read's
    /// sentence. A page that failed for a reason a later ask can mend is
    /// asked again after its back-off and draws nothing (section 5.6).
    static func scrollbackSentence(for failure: DoorFailure) -> String {
        switch failure {
        case .refused, .closedBeforeAnswer:
            return Copy.scrollbackMoved
        default:
            return sentence(for: failure)
        }
    }

    /// The Screen's line for a keys write's result (Phase 337): ALWAYS a
    /// sentence, never empty (conformance:ios rule v). A `done` batch draws
    /// nothing on the Screen (the next picture is the echo), and its word
    /// here is a message's `Sent`. A refusal is the Mac's own sentence
    /// (`The question on this session changed…`); a 404 and a batch withheld
    /// because the app left are both "nothing was sent", which is true of
    /// each; no answer is End's own line, whose words are true of any write.
    static func keysSentence(for result: WriteResult) -> String {
        switch result {
        case .answered(let answer):
            guard answer.outcome != .done else { return Copy.replySent }
            // The decoder refuses a non-done answer with no sentence or an
            // empty one, so this is the Mac's own sentence.
            return answer.sentence ?? Copy.answerUnreadable
        case .notTaken:
            return Copy.replyNotTaken
        case .noAnswer:
            return Copy.endNoAnswer
        case .notSent(let failure):
            return failure == .cancelled ? Copy.replyNotTaken : sentence(for: failure)
        }
    }

    /// New session's line for a start's result (Phase 346, D25): ALWAYS a
    /// sentence, never empty (conformance:ios rule v). A `done` start draws
    /// nothing (the sheet closes and the session opens); its word here is the
    /// sheet's own title, `New session`, which is what it made. An answered
    /// refusal, failure or busy is the Mac's
    /// own sentence. A 404 and a start withheld because the app left are both
    /// `Your Mac did not take it. Nothing was started.`, which is true of each,
    /// as End's and a reply's not-taken line is of theirs; no answer says
    /// Sessions holds what started; anything else not sent says why. Inside
    /// See a sample every start says nothing ran (D28).
    static func startSentence(for result: StartResult, sample: Bool) -> String {
        guard !sample else { return Copy.startSample }
        switch result {
        case .answered(let answer):
            guard answer.outcome != .done else { return Copy.newSession }
            // The decoder refuses a non-done answer with no sentence or an
            // empty one, so this is the Mac's own sentence.
            return answer.sentence ?? Copy.answerUnreadable
        case .notTaken:
            return Copy.startNotTaken
        case .noAnswer:
            return Copy.startNoAnswer
        case .notSent(let failure):
            return failure == .cancelled ? Copy.startNotTaken : sentence(for: failure)
        }
    }

    /// The pairing screen's line for how a pairing stopped. ALWAYS a sentence
    /// (his no-key finding: a pairing that stopped with nothing drawn left the
    /// phone saying nothing at all), and leaving the screen is the not-paired
    /// line (conformance:ios rule v). `keepsOthers` is a pairing made beside
    /// a Mac this phone keeps (Pair another Mac, Phase 345, D16), whose
    /// not-paired line names this Mac, because `…not paired with a Mac.`
    /// would be false; and a fifth Mac is the cap's own sentence (D12).
    static func pairingSentence(for failure: PairingFailure, keepsOthers: Bool = false) -> String {
        switch failure {
        case .badCode: return Copy.pairNotACode
        case .codeFromNewerMac: return Copy.pairNewerMac
        case .codeFromOlderMac: return Copy.pairOlderMac
        case .codeExpired, .windowClosed: return Copy.codeExpired
        case .macRefused: return Copy.pairRefused
        case .strangeAnswer: return Copy.pairAnswerUnknown
        case .wrongKey: return Copy.keyMismatch
        case .notAccepted: return Copy.pairFirstReadRefused
        case .unreachable: return Copy.cannotReachMac
        case .nameNotFound: return Copy.pairNameNotFound
        case .macLimit: return Copy.macLimit
        case .couldNotSave, .notAvailable, .cancelled: return DoorWords.notPairedLine(keepsOthers: keepsOthers)
        }
    }

    /// The not-paired line: `This iPhone is not paired with a Mac.`, or, for a
    /// pairing made beside a Mac this phone keeps, `This iPhone is not paired
    /// with this Mac.` (Phase 345, D16). Never empty (conformance:ios rule v).
    static func notPairedLine(keepsOthers: Bool) -> String {
        keepsOthers ? Copy.notPairedHere : Copy.notPaired
    }

    /// The pairing screen's line while a pairing is under way. Every step has
    /// one (conformance:ios rule v).
    static func stepSentence(for step: PairingStep) -> String {
        switch step {
        case .presenting: return Copy.pairReaching
        case .findingName: return Copy.pairNameNotYet
        case .waitingForMac: return Copy.pairWaitingForAllow
        case .confirming: return Copy.pairConfirming
        }
    }
}
