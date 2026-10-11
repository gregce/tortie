import Foundation
import XCTest
@testable import Tortie

/// The sample's owner check (Phase 333.3, build/p3333/SPEC.md section 5.2.5,
/// D11 and D12), over a fake of the app's own check: every kind iOS can ask
/// with passes through and its confirmation asks iOS exactly once, and only
/// an iPhone with no passcode reads `.unasked` and is confirmed with nothing
/// asked. Each test names the clause it holds and fails when that clause is
/// taken out of Sample/SampleOwnerCheck.swift.
final class SampleOwnerCheckTests: XCTestCase {
    /// The app's check, scripted: what the phone has, what iOS answers, and
    /// how often each was asked.
    private final class Inner: OwnerCheck, @unchecked Sendable {
        private let lock = NSLock()
        private let has: OwnerKind
        private let answer: OwnerAnswer
        private var kinds = 0
        private var reasons: [String] = []

        init(_ has: OwnerKind, answer: OwnerAnswer = .confirmed) {
            self.has = has
            self.answer = answer
        }

        func kind() -> OwnerKind {
            lock.withLock { kinds += 1 }
            return has
        }

        func confirm(reason: String) async -> OwnerAnswer {
            lock.withLock { reasons.append(reason) }
            return answer
        }

        var confirmed: [String] { lock.withLock { reasons } }
        var kindAsked: Int { lock.withLock { kinds } }
    }

    /// No passcode: End is drawn on with its own line, and the sample's copy
    /// ends with nothing asked of iOS.
    func testNoPasscodeIsUnaskedAndConfirmsWithoutAsking() async {
        let inner = Inner(.none, answer: .needsPasscode)
        let check = SampleOwnerCheck(inner: inner)
        XCTAssertEqual(check.kind(), .unasked)
        let answer = await check.confirm(reason: "End wait-one")
        XCTAssertEqual(answer, .confirmed)
        XCTAssertEqual(inner.confirmed, [], "iOS was asked with no passcode set")
    }

    /// Face ID, Touch ID and the passcode pass through, and a press asks iOS
    /// exactly once, with the press's own words, and answers what iOS answered.
    func testEveryKindIOSAsksWithPassesThrough() async {
        for kind in [OwnerKind.faceID, .touchID, .passcode] {
            for scripted in [OwnerAnswer.confirmed, .notConfirmed, .needsPasscode] {
                let inner = Inner(kind, answer: scripted)
                let check = SampleOwnerCheck(inner: inner)
                XCTAssertEqual(check.kind(), kind)
                let answer = await check.confirm(reason: "End idle-two")
                XCTAssertEqual(answer, scripted, "\(kind) \(scripted)")
                XCTAssertEqual(inner.confirmed, ["End idle-two"], "\(kind)")
            }
        }
    }

    /// The kind is read from the app's check at each ask, never kept: a
    /// passcode set or removed between two presses is what the next one sees.
    func testTheKindIsAskedEachTime() {
        let inner = Inner(.faceID)
        let check = SampleOwnerCheck(inner: inner)
        _ = check.kind()
        _ = check.kind()
        XCTAssertEqual(inner.kindAsked, 2)
    }

    /// The sample's check never answers a kind the app's check did not, but
    /// `.unasked` for `.none`.
    func testOnlyNoPasscodeBecomesUnasked() {
        XCTAssertEqual(SampleOwnerCheck(inner: Inner(.none)).kind(), .unasked)
        for kind in [OwnerKind.faceID, .touchID, .passcode] {
            XCTAssertNotEqual(SampleOwnerCheck(inner: Inner(kind)).kind(), .unasked)
        }
    }
}
