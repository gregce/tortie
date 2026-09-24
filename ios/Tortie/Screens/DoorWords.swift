// What the screens ask of the door, and what they say when it does not answer
// (Phase 316.2).
//
// THE SEAM. The three reading screens ask `DoorReading` and the pairing screen
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

import Foundation

// MARK: - The seam

/// The three signed reads, for the pairing this phone keeps.
protocol DoorReading: Sendable {
    func blocked() async throws -> PocketBlockedAnswer
    func session(_ sessionId: String) async throws -> PocketSessionAnswer
    func turns(_ sessionId: String, to: Int?) async throws -> PocketTurnsAnswer
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
    /// The kept pairing's reads, or nil when this phone is not paired or this
    /// build has no way to reach a Mac.
    func pairedReader() -> (any DoorReading)?
    /// Read a scanned code and make this phone's keys for it. The pending
    /// pairing carries the fingerprint both screens show.
    func begin(payload: String, label: String) throws -> PendingPairing
    /// Present until the Mac answers, then make the first signed read. The
    /// ONLY way to `.paired` is that read succeeding (Door/Pairing.swift):
    /// the door answers `allowed` to any presenter from the allowed phone's
    /// address (316.1's nit P2b), so `allowed` alone is not success.
    func pair(_ pending: PendingPairing, progress: @escaping @Sendable (PairingStep) -> Void) async -> PairResult
    /// Forget the kept pairing.
    func forget()
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
            case .refused:
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
        case .unreachable: return Copy.cannotReachMac
        case .timedOut: return Copy.macDidNotAnswer
        case .refused: return Copy.notPaired
        case .unexpectedStatus, .malformed: return Copy.answerUnreadable
        case .tooLarge: return Copy.answerTooLarge
        // The newest page broke the door's promise; the older-page line is
        // `olderPageSentence`'s, where there are earlier turns to speak of.
        case .badPage: return Copy.answerUnreadable
        case .cancelled: return Copy.answerUnreadable
        }
    }

    /// The line drawn where older turns would be, when a page of them failed.
    static func olderPageSentence(for error: Error) -> String {
        if let failure = error as? DoorFailure, failure == .badPage || failure == .malformed {
            return Copy.earlierTurnsUnreadable
        }
        return sentence(for: error)
    }

    /// The pairing screen's line for how a pairing stopped, or nil when the
    /// person walked away.
    static func pairingSentence(for failure: PairingFailure) -> String? {
        switch failure {
        case .badCode, .unsupportedCode: return Copy.pairNotACode
        case .codeExpired, .windowClosed: return Copy.codeExpired
        case .macRefused: return Copy.pairRefused
        case .strangeAnswer: return Copy.pairAnswerUnknown
        case .wrongKey: return Copy.keyMismatch
        case .notAccepted: return Copy.pairFirstReadRefused
        case .unreachable: return Copy.cannotReachMac
        case .couldNotSave, .notAvailable: return Copy.notPaired
        case .cancelled: return nil
        // The tailnet node's join (Phase 316.3, Tailnet/Node.swift).
        case .noTailnetKey: return Copy.tailnetNoKey
        case .tailnetKeyRefused: return Copy.tailnetKeyRefused
        case .tailnetFlowLogs: return Copy.tailnetFlowLogs
        case .tailnetUnreachable: return Copy.tailnetUnreachable
        case .tailnetUnavailable: return Copy.tailnetUnavailable
        }
    }
}
