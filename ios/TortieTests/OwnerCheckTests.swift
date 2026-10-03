import Foundation
import LocalAuthentication
import XCTest
@testable import Tortie

/// The owner check (Phase 317, build/p317/SPEC.md section 5.8.2), through the
/// SHIPPING `DeviceOwnerCheck` over a fake context: the one policy, a new
/// context every call, every `LAError` mapped, and the glyph's kind for each
/// biometry type. Face ID itself is the Simulator arms' (the probe enrols and
/// answers it from the host); no seam in the app skips it. Each test names the
/// clause it holds, and each fails when that clause is taken out of
/// App/OwnerCheck.swift.
final class OwnerCheckTests: XCTestCase {
    /// One context: what it answers, and what it was asked.
    private final class FakeContext: OwnerContext, @unchecked Sendable {
        var biometryType: LABiometryType
        let canError: Error?
        /// What the biometrics-only question answers: nil is yes. LAContext's
        /// `biometryType` names the hardware whatever this answers, which is
        /// what the Simulator showed at the verify's E3.
        let biometryError: Error?
        let evaluates: Result<Bool, Error>
        private(set) var canAsked: [LAPolicy] = []
        private(set) var evaluateAsked: [(LAPolicy, String)] = []

        init(
            biometry: LABiometryType = .faceID,
            canError: Error? = nil,
            biometryError: Error? = nil,
            evaluates: Result<Bool, Error> = .success(true)
        ) {
            biometryType = biometry
            self.canError = canError
            self.biometryError = biometryError
            self.evaluates = evaluates
        }

        func canEvaluatePolicy(_ policy: LAPolicy, error: NSErrorPointer) -> Bool {
            canAsked.append(policy)
            if let canError {
                error?.pointee = canError as NSError
                return false
            }
            if policy == .deviceOwnerAuthenticationWithBiometrics, let biometryError {
                error?.pointee = biometryError as NSError
                return false
            }
            return true
        }

        func evaluatePolicy(_ policy: LAPolicy, localizedReason: String) async throws -> Bool {
            evaluateAsked.append((policy, localizedReason))
            return try evaluates.get()
        }
    }

    /// Every context the check made, in order.
    private final class Contexts: @unchecked Sendable {
        private let lock = NSLock()
        private let make: () -> FakeContext
        private(set) var made: [FakeContext] = []

        init(_ make: @escaping () -> FakeContext) {
            self.make = make
        }

        func next() -> FakeContext {
            lock.withLock {
                let context = make()
                made.append(context)
                return context
            }
        }
    }

    private func check(_ contexts: Contexts) -> DeviceOwnerCheck {
        DeviceOwnerCheck(contexts: { contexts.next() })
    }

    private func laError(_ code: LAError.Code) -> Error {
        NSError(domain: LAErrorDomain, code: code.rawValue)
    }

    /// Clause: the one policy EVALUATED is `deviceOwnerAuthentication`
    /// (biometry with the passcode behind it), with the press's words as the
    /// reason under iOS's prompt; `kind()` asks that policy first and then
    /// only ASKS the biometrics-only one, to pick the glyph.
    func testTheOnePolicyWithThePresssWords() async {
        let contexts = Contexts { FakeContext() }
        let owner = check(contexts)
        _ = owner.kind()
        let answer = await owner.confirm(reason: "End session")
        XCTAssertEqual(answer, .confirmed)
        XCTAssertEqual(contexts.made.first?.canAsked, [.deviceOwnerAuthentication, .deviceOwnerAuthenticationWithBiometrics])
        XCTAssertEqual(contexts.made.first?.evaluateAsked.count, 0, "kind() authenticated something")
        XCTAssertEqual(contexts.made.last?.evaluateAsked.map(\.0), [.deviceOwnerAuthentication])
        XCTAssertEqual(contexts.made.last?.evaluateAsked.map(\.1), ["End session"])
    }

    /// Clause: a NEW context for every call, so an earlier match never stands
    /// in for this press.
    func testANewContextEveryCall() async {
        let contexts = Contexts { FakeContext() }
        let owner = check(contexts)
        _ = await owner.confirm(reason: "End session")
        _ = await owner.confirm(reason: "End 2 sessions")
        _ = owner.kind()
        XCTAssertEqual(contexts.made.count, 3)
        XCTAssertEqual(contexts.made[0].evaluateAsked.count, 1)
        XCTAssertEqual(contexts.made[1].evaluateAsked.count, 1)
    }

    /// Clause: no passcode is the one failure that says so, `needsPasscode`;
    /// every other failure, a cancel included, and a `false` are
    /// `notConfirmed`.
    func testEveryLAErrorIsMapped() async {
        let codes: [LAError.Code] = [
            .authenticationFailed, .userCancel, .userFallback, .systemCancel, .appCancel,
            .invalidContext, .notInteractive, .biometryNotAvailable, .biometryNotEnrolled, .biometryLockout
        ]
        for code in codes {
            let answer = await check(Contexts { FakeContext(evaluates: .failure(self.laError(code))) }).confirm(reason: "End session")
            XCTAssertEqual(answer, .notConfirmed, "\(code)")
        }
        let none = await check(Contexts { FakeContext(evaluates: .failure(self.laError(.passcodeNotSet))) }).confirm(reason: "End session")
        XCTAssertEqual(none, .needsPasscode)
        let refused = await check(Contexts { FakeContext(evaluates: .success(false)) }).confirm(reason: "End session")
        XCTAssertEqual(refused, .notConfirmed)
        let other = await check(Contexts { FakeContext(evaluates: .failure(NSError(domain: "elsewhere", code: LAError.Code.passcodeNotSet.rawValue))) })
            .confirm(reason: "End session")
        XCTAssertEqual(other, .notConfirmed, "a code from another domain is not iOS's passcodeNotSet")
    }

    /// Clause: the glyph's kind: Face ID, Touch ID, and the lock for a phone
    /// with no biometry; `.none` only when no passcode is set, and any other
    /// refusal still draws End on (the press says what iOS answers).
    func testTheKindForEachPhone() {
        XCTAssertEqual(check(Contexts { FakeContext(biometry: .faceID) }).kind(), .faceID)
        XCTAssertEqual(check(Contexts { FakeContext(biometry: .touchID) }).kind(), .touchID)
        XCTAssertEqual(check(Contexts { FakeContext(biometry: .none) }).kind(), .passcode)
        XCTAssertEqual(check(Contexts { FakeContext(canError: self.laError(.passcodeNotSet)) }).kind(), .none)
        XCTAssertEqual(check(Contexts { FakeContext(canError: self.laError(.biometryLockout)) }).kind(), .passcode)
        // THE VERIFY'S E3: a Face ID phone with no face enrolled, Face ID not
        // allowed to Tortie, or locked out reports `.faceID` as its biometry
        // type, and iOS asks for the passcode: the glyph is the lock.
        for code in [LAError.Code.biometryNotEnrolled, .biometryNotAvailable, .biometryLockout] {
            XCTAssertEqual(check(Contexts { FakeContext(biometry: .faceID, biometryError: self.laError(code)) }).kind(), .passcode, "\(code)")
            XCTAssertEqual(check(Contexts { FakeContext(biometry: .touchID, biometryError: self.laError(code)) }).kind(), .passcode, "\(code)")
        }
        XCTAssertEqual(EndBarDrawing.glyph(.faceID), "faceid")
        XCTAssertEqual(EndBarDrawing.glyph(.touchID), "touchid")
        XCTAssertEqual(EndBarDrawing.glyph(.passcode), "lock")
        XCTAssertEqual(EndBarDrawing.glyph(.none), "lock")
    }
}
