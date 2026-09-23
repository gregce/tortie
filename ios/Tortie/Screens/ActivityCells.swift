// The two cells on the session screen, Messages and Last message (Phase 316.2).
//
// THE DESKTOP'S RULE, ported and not reinvented. src/renderer/session-manager/
// copy.ts `messagesCell` and `lastMessageCell` decide what the session manager
// draws for these same counts, and the door hands the phone exactly the
// session manager's answer (`PocketSessionDetail.activity`). So the phone draws
// what the Mac draws, by the same two rules the Mac's own copy.ts keeps:
//
//  1. NULL IS NEVER DRAWN AS ZERO. A count is a digit only where main read a
//     record and answered a number. Everything else is a dash and a word.
//  2. ONE CLOCK IS NEVER DRAWN AS ANOTHER. For the two agents that record no
//     time on a reply, the small word says whose time the age is.
//
// One difference, and it is the door's: the Last message cell's big line is
// main's own age (`lastMessageText`, e.g. `2m`, as Session.html draws it)
// rather than the grid's `2m ago`, so the phone draws no age of its own. And
// where the grid would draw its pending mark because it has not asked yet,
// the phone has asked and main could not answer (`activity: null`), so it
// draws the dash with no word under it rather than promise an answer.
//
// The words are `Copy`'s; each one names the copy.ts constant it mirrors.
//
// THE COUNTS ARE THE DOOR'S NUMBERS. A count outside the door's bound, or two
// whose sum would overflow, is an answer this build cannot read: the cells
// THROW `DoorFailure.malformed` and the session screen draws
// `Copy.answerUnreadable` in place of the whole session, never a trap (his
// ruling of 2026-09-23; `userMessages` of `Int.max` ended the app on opening a
// session). The one sum is `DoorNumber.sum` (Door/Contract.swift).

import Foundation

/// What one cell draws: the big line and the small word under it.
struct CellDrawing: Equatable, Sendable {
    let main: String
    let small: String?

    static func dash(_ small: String?) -> CellDrawing {
        CellDrawing(main: Copy.dash, small: small)
    }
}

enum ActivityCells {
    /// The two counts, where a record was read. Nil when neither may be drawn.
    /// copy.ts `countsOf`. Throws when a count is not one the door could send.
    private static func counts(_ a: PocketSessionActivity) throws -> (user: Int, agent: Int?)? {
        guard a.coverage == Wire.Coverage.complete || a.coverage == Wire.Coverage.partial else { return nil }
        // The contract says this is a number here. An answer that breaks it is
        // drawn as not recorded, never defaulted to a digit.
        guard let user = a.userMessages else { return nil }
        guard DoorNumber.isCount(user), a.agentMessages.map(DoorNumber.isCount) ?? true else {
            throw DoorFailure.malformed
        }
        return (user, a.agentMessages)
    }

    /// The two counts together, through the one checked sum.
    private static func together(_ user: Int, _ agent: Int) throws -> Int {
        guard let total = DoorNumber.sum(user, agent) else { throw DoorFailure.malformed }
        return total
    }

    /// copy.ts `noCountWord`.
    private static func noCountWord(_ a: PocketSessionActivity) -> String {
        if a.coverage == Wire.Coverage.notApplicable { return Copy.shellWord }
        if a.coverage == Wire.Coverage.unavailable,
           a.reason == Wire.Reason.remote || a.reason == Wire.Reason.unknownSession {
            return Copy.unavailableWord
        }
        return Copy.notRecordedWord
    }

    /// The number as the Mac's `toLocaleString()` draws it (`1,234`).
    private static func grouped(_ n: Int) -> String {
        n.formatted(.number.grouping(.automatic))
    }

    /// The Messages cell. copy.ts `messagesCell`: a shell and a session on
    /// another machine are decided from the row, without the counts.
    static func messages(_ activity: PocketSessionActivity?, agent: String, remote: Bool) throws -> CellDrawing {
        if agent == Wire.shellAgent { return .dash(Copy.shellWord) }
        if remote { return .dash(Copy.unavailableWord) }
        guard let activity else { return .dash(nil) }
        guard let counts = try counts(activity) else { return .dash(noCountWord(activity)) }
        guard let replies = counts.agent else {
            // No reply count and no ask either: there is nothing to put a `+`
            // on (copy.ts `nothingSaidYet`, Phase 298 rough edge 2).
            if counts.user == 0 { return .dash(Copy.noMessagesYetWord) }
            return CellDrawing(main: grouped(counts.user) + Copy.atLeastMark, small: Copy.repliesNotRecordedWord)
        }
        let total = try together(counts.user, replies)
        if activity.coverage == Wire.Coverage.partial {
            return CellDrawing(main: grouped(total) + Copy.atLeastMark, small: Copy.partialHistoryWord)
        }
        return CellDrawing(main: grouped(total), small: Copy.messageCounts(you: counts.user, agent: replies))
    }

    /// The small word for one clock. copy.ts `clockWords`.
    private static func clockWord(_ clock: String, by: String) -> String? {
        switch clock {
        case Wire.Clock.message:
            // copy.ts draws `you` as the prompt and the other author as the
            // reply. An author the contract does not name is neither.
            if by == Wire.By.you { return Copy.yourPromptWord }
            if by == Wire.By.agent { return Copy.agentReplyWord }
            return nil
        case Wire.Clock.ask: return Copy.agentReplyWord
        case Wire.Clock.session: return Copy.sessionUpdatedWord
        default: return nil
        }
    }

    /// The Last message cell. copy.ts `lastMessageOf` and `lastMessageCell`,
    /// with main's `lastMessageText` as the big line.
    static func lastMessage(_ activity: PocketSessionActivity?, agent: String, text: String?) throws -> CellDrawing {
        if agent == Wire.shellAgent { return .dash(Copy.notApplicableWord) }
        guard let activity else { return .dash(nil) }
        if activity.coverage == Wire.Coverage.notApplicable { return .dash(Copy.notApplicableWord) }
        guard let counts = try counts(activity) else { return .dash(Copy.notRecordedWord) }
        if activity.lastMessageAt != nil {
            // A time with no clock, no author, or no age drawn for it breaks
            // the contract. Guessing would draw one clock as another.
            guard let clock = activity.lastMessageClock,
                  let by = activity.lastMessageBy,
                  let word = clockWord(clock, by: by),
                  let text else {
                return .dash(Copy.notRecordedWord)
            }
            return CellDrawing(main: text, small: word)
        }
        let known = try counts.agent.map { try together(counts.user, $0) } ?? counts.user
        return .dash(known == 0 ? Copy.noMessagesYetWord : Copy.notRecordedWord)
    }
}
