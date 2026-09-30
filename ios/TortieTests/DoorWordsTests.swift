import Foundation
import XCTest
@testable import Tortie

/// Where a failed read sends the app, and the one sentence every failure and
/// every step of a pairing draws (Screens/DoorWords.swift). Moved out of
/// `ScreensModelTests` in Phase 330 so a Mac with no Simulator runs them too:
/// they need nothing but DoorWords and Copy. Each test names the clause it
/// holds, and each fails when that clause is taken out.
final class DoorWordsTests: XCTestCase {
    /// Clause: a 404 on the LIST means the Mac no longer answers this iPhone,
    /// so the app goes to Pairing; a 404 about ONE session goes back to the
    /// list, which is the truth about what is still there; no pairing goes to
    /// Pairing from anywhere.
    func testWhereARefusalSendsTheApp() {
        XCTAssertEqual(DoorWords.consequence(of: DoorFailure.refused, reading: .list), .pairAgain)
        XCTAssertEqual(DoorWords.consequence(of: DoorFailure.refused, reading: .oneSession), .backToList)
        // Phase 330: a connection the door closed on this phone's key before a
        // byte is the door refusing this phone, and goes where a 404 goes.
        XCTAssertEqual(DoorWords.consequence(of: DoorFailure.closedBeforeAnswer, reading: .list), .pairAgain)
        XCTAssertEqual(DoorWords.consequence(of: DoorFailure.closedBeforeAnswer, reading: .oneSession), .backToList)
        XCTAssertEqual(DoorWords.consequence(of: DoorFailure.notPaired, reading: .list), .pairAgain)
        XCTAssertEqual(DoorWords.consequence(of: DoorFailure.notPaired, reading: .oneSession), .pairAgain)
    }

    /// Clause: every other failure is ONE drawn sentence, Copy.swift's.
    func testEveryOtherFailureIsOneSentence() {
        let cases: [(DoorFailure, String)] = [
            (.unreachable(code: -1004), Copy.cannotReachMac),
            // A paired phone's reads say a missing name as any other miss.
            (.nameNotFound, Copy.cannotReachMac),
            (.timedOut, Copy.macDidNotAnswer),
            (.wrongKey, Copy.keyMismatch),
            (.tooLarge, Copy.answerTooLarge),
            (.malformed, Copy.answerUnreadable),
            (.unexpectedStatus(500), Copy.answerUnreadable),
            (.badPage, Copy.answerUnreadable)
        ]
        for (failure, sentence) in cases {
            XCTAssertEqual(DoorWords.consequence(of: failure, reading: .list), .draw(sentence), "\(failure)")
            XCTAssertEqual(DoorWords.consequence(of: failure, reading: .oneSession), .draw(sentence), "\(failure)")
        }
        XCTAssertEqual(DoorWords.olderPageSentence(for: DoorFailure.badPage), Copy.earlierTurnsUnreadable)
        XCTAssertEqual(DoorWords.olderPageSentence(for: DoorFailure.timedOut), Copy.macDidNotAnswer)
        XCTAssertEqual(DoorWords.sentence(for: CocoaError(.fileReadUnknown)), Copy.answerUnreadable)
    }

    /// Clause: a read the person walked away from says nothing.
    func testACancelledReadSaysNothing() {
        XCTAssertTrue(DoorWords.isCancellation(DoorFailure.cancelled))
        XCTAssertTrue(DoorWords.isCancellation(CancellationError()))
        XCTAssertTrue(DoorWords.isCancellation(PairingFailure.cancelled))
        XCTAssertFalse(DoorWords.isCancellation(DoorFailure.timedOut))
    }

    /// Clause: every way pairing stops has its line, leaving included (his
    /// no-key finding: the phone always draws a sentence).
    func testEveryPairingFailureHasItsLine() {
        let lines: [(PairingFailure, String)] = [
            (.badCode, Copy.pairNotACode),
            (.unsupportedCode, Copy.pairNotACode),
            (.codeExpired, Copy.codeExpired),
            (.windowClosed, Copy.codeExpired),
            (.macRefused, Copy.pairRefused),
            (.strangeAnswer, Copy.pairAnswerUnknown),
            (.wrongKey, Copy.keyMismatch),
            (.notAccepted, Copy.pairFirstReadRefused),
            (.unreachable, Copy.cannotReachMac),
            (.couldNotSave, Copy.notPaired),
            (.notAvailable, Copy.notPaired),
            (.nameNotFound, Copy.pairNameNotFound),
            (.cancelled, Copy.notPaired)
        ]
        for (failure, line) in lines {
            XCTAssertEqual(DoorWords.pairingSentence(for: failure), line, "\(failure)")
            XCTAssertFalse(DoorWords.pairingSentence(for: failure).isEmpty, "\(failure)")
        }
    }

    /// Clause: every step of a pairing under way has its line.
    func testEveryPairingStepHasItsLine() {
        let lines: [(PairingStep, String)] = [
            (.presenting, Copy.pairReaching),
            (.findingName, Copy.pairNameNotYet),
            (.waitingForMac, Copy.pairWaitingForAllow),
            (.confirming, Copy.pairConfirming)
        ]
        for (step, line) in lines {
            XCTAssertEqual(DoorWords.stepSentence(for: step), line, "\(step)")
            XCTAssertFalse(line.isEmpty, "\(step)")
        }
    }
}
