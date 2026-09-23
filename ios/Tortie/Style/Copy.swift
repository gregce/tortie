// Every word the phone draws that the door does not send (build/p316/SPEC.md
// section 4.0, "Words"; `conformance:ios` rule (b); `conformance:phonecopy`).
//
// Most of what a person reads on the phone is NOT here. The status words and
// their raised titles, the agent's question and its choices, the Catch Me Up
// outcome, every age, the absence sentences, the empty line and the age note
// arrive in the door's answer, composed on the Mac (src/shared/ipc/pocket.ts).
// This file holds only the chrome around them, and each entry is one of two
// things, said in the comment directly above it:
//
//   `/// Mac: <file> ⟦<text>⟧`  The Mac already says it. <file> is the module
//        that owns the word and <text> is copied from that file byte for byte,
//        and the value below must appear inside <text> unchanged. Nothing is
//        re-cased here: a word the mock draws raised (`The agent`) is stored as
//        the Mac stores it (`the agent`) and the screen raises it with its
//        style, the way the Mac's own stylesheet does.
//   `/// Phone: <why>`  No Mac surface says it, because no Mac surface draws
//        this thing. The reason is the ledger entry. A phone line that names
//        a Mac control adds `/// Names: <file> ⟦<text>⟧`, and the word quoted
//        inside <text> must appear in the line, so a renamed button on the Mac
//        cannot leave the phone giving directions to a word that is gone.
//
// THE SHAPE, which the tests in ios/TortieTests/CopyTests.swift read as text:
// every string literal in this file is the whole right side of a one line
// `static let`, and the functions below compose those constants with the
// door's data and write no literal of their own. So every word is declared
// exactly once, next to its owner.
//
// DRAWING THEM. Each value is a `String`, so `Text(Copy.sessions)` takes
// SwiftUI's verbatim `StringProtocol` initialiser: no localisation lookup and
// no markdown. A string LITERAL passed to `Text` would be a
// `LocalizedStringKey` and would parse `**` and `[]`, which is one more reason
// none is written in a screen.
//
// Just enough words (CLAUDE.md UI rules): labels and one line each.

enum Copy {
    // MARK: - Shared

    /// Mac: src/renderer/overview/ProjectLines.tsx ⟦{' · '}⟧
    static let separator = " · "

    /// Mac: src/renderer/app/AttentionOverlay.tsx ⟦({rows.length})⟧
    static let countClose = ")"

    /// Mac: src/renderer/session-manager/copy.ts ⟦DASH = '—'⟧
    static let dash = "—"

    /// Mac: src/renderer/session-manager/copy.ts ⟦PENDING = '…'⟧
    static let pending = "…"

    /// Mac: src/renderer/settings/PhoneSection.tsx ⟦BTN_TRY_AGAIN = 'Try again'⟧
    static let tryAgain = "Try again"

    // MARK: - The list (docs/design/phone/Main.html)

    /// Mac: src/renderer/session-manager/copy.ts ⟦SHEET_TITLE = 'Sessions'⟧
    static let sessions = "Sessions"

    /// Mac: src/renderer/app/AttentionOverlay.tsx ⟦Needs your input (⟧
    static let needsYourInputLead = "Needs your input ("

    /// Phone: the list's second header, for every session that is not waiting
    /// (his ruling of 2026-09-22, "Yes it should be able to open anything").
    /// The Mac's ⌘J draws only the blocked section, so no Mac surface has it.
    static let everythingElseLead = "Everything else ("

    /// Phone: said under the second section when the door left rows out
    /// (`othersOmitted`, capped at `POCKET_OTHERS_MAX`). No Mac list is capped.
    static let othersOmittedTail = " more not shown."

    /// Mac: src/shared/overview-copy.ts ⟦return `read ${clock}`⟧
    static let readLead = "read "

    // MARK: - One session (Session.html, Choice.html)

    /// Mac: src/shared/overview-copy.ts ⟦YOU_ASKED_LEAD = 'you asked '⟧
    static let youAskedLead = "you asked "

    /// Mac: src/renderer/overview/ProjectLines.tsx ⟦{'“'}⟧
    static let openQuote = "“"

    /// Mac: src/renderer/overview/ProjectLines.tsx ⟦{'”. '}⟧
    static let closeQuote = "”"

    /// Mac: src/renderer/session-manager/copy.ts ⟦messages: 'Messages'⟧
    static let messages = "Messages"

    /// Mac: src/renderer/session-manager/copy.ts ⟦lastMessage: 'Last message'⟧
    static let lastMessage = "Last message"

    /// Mac: src/renderer/session-manager/copy.ts ⟦ you · ${String(replies)}⟧
    static let youCountTail = " you"

    /// Mac: src/renderer/session-manager/copy.ts ⟦ agent`⟧
    static let agentCountTail = " agent"

    /// Mac: src/renderer/session-manager/copy.ts ⟦toLocaleString()}+`⟧
    static let atLeastMark = "+"

    /// Mac: src/renderer/session-manager/copy.ts ⟦SHELL_WORD = 'Shell'⟧
    static let shellWord = "Shell"

    /// Mac: src/renderer/session-manager/copy.ts ⟦UNAVAILABLE_WORD = 'Unavailable'⟧
    static let unavailableWord = "Unavailable"

    /// Mac: src/renderer/session-manager/copy.ts ⟦NOT_RECORDED_WORD = 'Not recorded'⟧
    static let notRecordedWord = "Not recorded"

    /// Mac: src/renderer/session-manager/copy.ts ⟦NOT_APPLICABLE_WORD = 'Not applicable'⟧
    static let notApplicableWord = "Not applicable"

    /// Mac: src/renderer/session-manager/copy.ts ⟦NO_MESSAGES_WORD = 'No messages yet'⟧
    static let noMessagesYetWord = "No messages yet"

    /// Mac: src/renderer/session-manager/copy.ts ⟦PARTIAL_WORD = 'Partial history'⟧
    static let partialHistoryWord = "Partial history"

    /// Mac: src/renderer/session-manager/copy.ts ⟦NO_REPLIES_WORD = 'Replies not recorded'⟧
    static let repliesNotRecordedWord = "Replies not recorded"

    /// Mac: src/renderer/session-manager/copy.ts ⟦YOUR_PROMPT_WORD = 'Your prompt'⟧
    static let yourPromptWord = "Your prompt"

    /// Mac: src/renderer/session-manager/copy.ts ⟦AGENT_REPLY_WORD = 'Agent reply'⟧
    static let agentReplyWord = "Agent reply"

    /// Mac: src/renderer/session-manager/copy.ts ⟦SESSION_UPDATED_WORD = 'Session updated'⟧
    static let sessionUpdatedWord = "Session updated"

    /// Mac: src/renderer/choice.ts ⟦CHOICE_NOT_PRESSABLE = 'Answer this in the session.'⟧
    static let answerInTheSession = "Answer this in the session."

    /// Phone: the row that opens the whole conversation. The Mac opens it with
    /// a key (`⏎ open this session’s conversation`), so it has no label.
    static let conversation = "Conversation"

    // MARK: - The conversation (the desktop's turn block, drawn in the Session style)

    /// Mac: src/shared/overview-copy.ts ⟦YOU_LABEL = 'you'⟧
    static let youLabel = "you"

    /// Mac: src/shared/overview-copy.ts ⟦AGENT_LABEL = 'the agent'⟧
    static let agentLabel = "the agent"

    /// Mac: src/shared/overview-copy.ts ⟦REST_NOT_SHOWN = 'The rest of this message is not shown.'⟧
    static let restNotShown = "The rest of this message is not shown."

    /// Mac: src/shared/overview-copy.ts ⟦return `the session stopped: ${notice}`⟧
    static let sessionStoppedLead = "the session stopped: "

    /// Mac: src/shared/overview-copy.ts ⟦NO_CLOCK_NOTE = 'no clock on these turns'⟧
    static let noClockNote = "no clock on these turns"

    /// Phone: the one line his ruling asks for ("the full CONVERSATION yes, the
    /// raw terminal scrollback no"). The Mac shows the terminal, so it never
    /// needs to say where it is.
    static let terminalStaysOnMac = "The terminal’s own output stays on your Mac."

    /// Phone: a page of older turns the phone refused (indexes that go
    /// backwards or overlap, or `more` on a page that added nothing).
    static let earlierTurnsUnreadable = "Tortie could not read the earlier turns."

    // MARK: - Pairing (Pairing.html, without its typed code fallback)

    /// Phone: the pairing screen's title, owed to Phase 313 and now the phone's.
    static let pairTitle = "Pair with your Mac"

    /// Phone: the first step. The mock said "press Pair a phone", which is the
    /// Mac's group heading and not something a person can press; the button
    /// under it is "Pair" (the SPEC's section As built, concern 8).
    /// Names: src/main/settings/window.ts ⟦title: 'Settings'⟧
    /// Names: src/renderer/settings/PhoneSection.tsx ⟦PHONE_TITLE = 'Phone'⟧
    /// Names: src/renderer/settings/PhoneSection.tsx ⟦BTN_PAIR = 'Pair'⟧
    static let pairStepOnMac = "In Tortie on your Mac, open Settings then Phone and press Pair."

    /// Phone: the second step, under the camera.
    static let pairStepScan = "Point this at the QR code in Tortie on your Mac."

    /// Phone: the label over the fingerprint. The Mac's side of the same match
    /// is `MATCH_LABEL`, "Match this on your iPhone".
    static let pairMatchLabel = "Check this matches your Mac"

    /// Phone: the promise that a person on the Mac allows every pairing.
    static let pairMatchNote = "Your Mac will ask you to allow this iPhone. Nothing is paired until you do."

    /// Mac: src/renderer/settings/PhoneSection.tsx ⟦CODE_EXPIRED = 'The code expired. Nothing was paired.'⟧
    static let codeExpired = "The code expired. Nothing was paired."

    /// Phone: the door answered `refused` to this iPhone's presentation.
    static let pairRefused = "Your Mac did not allow this iPhone. Nothing was paired."

    /// Phone: `/pair` answered something that is not `pending`, `allowed` or
    /// `refused` (the hostile door's arm), OR pairing's first signed read came
    /// back in a shape this build cannot read: too large, not JSON, missing
    /// fields, or a status the door never sends. Either way nothing is kept,
    /// and the list's own words for those answers (`answerTooLarge`,
    /// `answerUnreadable`) are for a phone that is already paired.
    static let pairAnswerUnknown = "Your Mac answered in a way Tortie does not know. Nothing was paired."

    /// Phone: `allowed` is not success. The door answers it to any presenter
    /// from the allowed phone's address (316.1's open nit P2b), so pairing is
    /// done only when the first SIGNED read comes back, and this is the line
    /// when it does not.
    static let pairFirstReadRefused = "Your Mac refused this iPhone’s first read, so it is not paired."

    /// Phone: what was read is not a QR v:2 pairing payload.
    static let pairNotACode = "That is not a Tortie pairing code."

    /// Phone: the camera is off for Tortie, so the code cannot be read.
    static let cameraOff = "Allow the camera for Tortie in your iPhone’s Settings to scan the code."

    /// Phone: no pairing, or the Mac removed this one. The Release build of
    /// Phase 316.2 has no transport yet and draws only this.
    static let notPaired = "This iPhone is not paired with a Mac."

    /// Phone: the press that goes back to pairing.
    static let pairAgain = "Pair again"

    // MARK: - The door, when it does not answer as it should

    /// Phone: no connection, or the connection was cut.
    static let cannotReachMac = "Tortie could not reach your Mac."

    /// Phone: nothing came back inside the client's time limit.
    static let macDidNotAnswer = "Your Mac did not answer in time."

    /// Phone: the Mac's public key is not the one the QR pinned. Nothing was
    /// sent past the handshake.
    static let keyMismatch = "This Mac’s key is not the one this iPhone paired with. Nothing was read."

    /// Phone: the answer passed the client's size cap and was dropped unread.
    static let answerTooLarge = "Your Mac’s answer was too large to read."

    /// Phone: the answer was not JSON, or not the shape this build reads.
    static let answerUnreadable = "Tortie could not read your Mac’s answer."

    // MARK: - Composed lines. No literal below this point.

    /// `Needs your input (3)`, as ⌘J draws it.
    static func needsYourInput(_ count: Int) -> String {
        needsYourInputLead + String(count) + countClose
    }

    /// `Everything else (9)`.
    static func everythingElse(_ count: Int) -> String {
        everythingElseLead + String(count) + countClose
    }

    /// `12 more not shown.`
    static func othersOmitted(_ count: Int) -> String {
        String(count) + othersOmittedTail
    }

    /// `read 4:32 PM`. The clock is the device's own formatter's.
    static func readAt(_ clock: String) -> String {
        readLead + clock
    }

    /// `you asked “make the session cookie httpOnly and…”`. The ask is the
    /// person's own words: draw the result with `Text(verbatim:)`.
    static func youAsked(_ ask: String) -> String {
        youAskedLead + openQuote + ask + closeQuote
    }

    /// `20 you · 21 agent`, the Messages cell's small line.
    static func messageCounts(you: Int, agent: Int) -> String {
        String(you) + youCountTail + separator + String(agent) + agentCountTail
    }

    /// `the session stopped: <the CLI's own notice>`.
    static func sessionStopped(_ notice: String) -> String {
        sessionStoppedLead + notice
    }

    /// Two facts on one line, the way the Mac joins them.
    static func joined(_ parts: [String]) -> String {
        parts.joined(separator: separator)
    }
}
