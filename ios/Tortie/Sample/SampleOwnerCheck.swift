// The owner check the sample's End asks (Phase 333.3, build/p3333/SPEC.md
// section 5.2.5, D11 and D12).
//
// THE REAL CHECK. End and End these in the sample ask iOS exactly as they do for
// a paired Mac: this wraps the app's own check and passes every kind and every
// answer through, so Face ID, Touch ID or the passcode is asked and only a
// match ends the sample's copy. `AppModel.endCheck(for:)` makes it, and only
// for the sample's reader.
//
// WITH NO PASSCODE SET, iOS has nothing to ask, and a paired Mac's End is off.
// The sample then shows what End would have done: its kind is `.unasked`, which
// draws End on with its own line, and its confirmation answers `.confirmed`
// without asking anything. Nothing here asks iOS itself.

import Foundation

struct SampleOwnerCheck: OwnerCheck {
    /// The app's own check.
    let inner: any OwnerCheck

    func kind() -> OwnerKind {
        let asked = inner.kind()
        return asked == .none ? .unasked : asked
    }

    func confirm(reason: String) async -> OwnerAnswer {
        if inner.kind() == .none {
            return .confirmed
        }
        return await inner.confirm(reason: reason)
    }
}
