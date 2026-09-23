// The door's closed vocabularies, as the screens compare them (Phase 316.2).
//
// NOT USER-VISIBLE. These are values the door sends in fields a person never
// reads as they are (`coverage`, `reason`, `lastMessageClock`,
// `lastMessageBy`, and the registry id `shell`): the screens compare them to
// choose a word from Copy.swift, and never draw one. They are spelled here, in
// one file, so `conformance:ios` rule (b) can exempt one file by name, and so
// a renamed value in src/shared/overview.ts is one edit.
//
// THE SOURCE: `OverviewActivityCoverage`, `OverviewActivityReason` and
// `OverviewActivityClock` in src/shared/overview.ts, and `lastMessageBy`
// on `OverviewSessionActivity` there.

enum Wire {
    /// `OverviewActivityCoverage`.
    enum Coverage {
        static let complete = "complete"
        static let partial = "partial"
        static let unavailable = "unavailable"
        static let notApplicable = "not-applicable"
    }

    /// The two `OverviewActivityReason`s the Messages cell reads.
    enum Reason {
        static let remote = "remote"
        static let unknownSession = "unknown-session"
    }

    /// `OverviewActivityClock`.
    enum Clock {
        static let message = "message"
        static let ask = "ask"
        static let session = "session"
    }

    /// `lastMessageBy`.
    enum By {
        static let you = "you"
        static let agent = "agent"
    }

    /// The registry id of a plain shell, which has no conversation.
    static let shellAgent = "shell"
}
