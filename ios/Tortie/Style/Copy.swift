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

    // MARK: - The tabs (Phase 316.6: NeedsInput.html, Main.html, Settings.html)

    /// Mac: src/renderer/session-manager/copy.ts ⟦label: 'Needs input'⟧
    /// The first tab and its title: the session manager's State filter says
    /// these words of exactly this list. Not status-words.ts's `needs input`,
    /// because a word here is the Mac's literal and nothing is re-cased.
    static let needsInput = "Needs input"

    /// Mac: src/main/settings/window.ts ⟦title: 'Settings'⟧
    /// The third tab and the Settings screen's title, as the Mac titles its
    /// own Settings window.
    static let settings = "Settings"

    // MARK: - The list (docs/design/phone/Main.html, the Sessions tab)

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

    // MARK: - Show, group, sort and filter (Phase 316.7: Main.html, SessionsMenu.html)
    //
    // Show is the session manager's lifecycle segment, word for word. Its third
    // word, `Ended`, is `ended` below (End these' outcome word, the same word in
    // the same module), because a word is declared once. The sort words and
    // Group by are the phone's own: no Mac surface offers that choice.

    /// Mac: src/renderer/session-manager/copy.ts ⟦label: 'All'⟧
    static let showAll = "All"

    /// Mac: src/renderer/session-manager/copy.ts ⟦label: 'Active'⟧
    static let showActive = "Active"

    /// Phone: the menu's grouping choice. No Mac surface offers a choice of
    /// grouping; the sheet always groups by project.
    static let groupBy = "Group by"

    /// Mac: src/renderer/session-manager/copy.ts ⟦project: 'Project'⟧
    static let groupProject = "Project"

    /// Mac: src/renderer/settings/fold-copy.ts ⟦FOLD_NONE_OPTION = 'None'⟧
    static let groupNone = "None"

    /// Phone: the menu's order choice. The sheet sorts by pressing a column
    /// heading, which a phone does not have.
    static let sortBy = "Sort by"

    /// Phone: the order today's list already has, waiting first, then output,
    /// then creation; no Mac column is that clock.
    static let sortRecent = "Recent activity"

    /// Phone: the sheet's column for it is headed `Session`, which as a sort
    /// reads as nothing.
    static let sortName = "Name"

    /// Phone: the sheet's Created column ascending, said as a direction
    /// because a menu has no arrow.
    static let sortOldest = "Oldest first"

    /// Mac: src/renderer/diagnostics/copy.ts ⟦COL_AGENT = 'Agent'⟧
    static let agent = "Agent"

    /// Mac: src/renderer/context/ContextHeader.tsx ⟦All agents`⟧
    static let allAgents = "All agents"

    /// Mac: src/renderer/machines/machine-choice.ts ⟦MACHINE_FIELD_LABEL = 'Machine'⟧
    static let machine = "Machine"

    /// Phone: the machine filter's no-filter value. No Mac surface filters
    /// sessions by machine.
    static let allMachines = "All machines"

    /// Mac: src/renderer/session-manager/copy.ts ⟦CLEAR_FILTERS = 'Clear filters'⟧
    static let clearFilters = "Clear filters"

    /// Mac: src/renderer/session-manager/copy.ts ⟦NO_MATCH_HEADING = 'No matching sessions'⟧
    static let noMatchingSessions = "No matching sessions"

    /// Mac: src/renderer/session-manager/copy.ts ⟦heading: 'No sessions to manage'⟧
    static let noSessions = "No sessions to manage"

    /// Phone: the menu button's spoken name; the button draws no words.
    static let sessionsOptions = "Group, sort and filter"

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
    /// raw terminal scrollback no"). Since Phase 337 the Screen shows the
    /// terminal's output as it is now, so the line says what is still true
    /// (D31): its scrollback is not on the phone. The Mac shows the terminal,
    /// so it never needs to say where it is.
    static let terminalStaysOnMac = "The terminal’s scrollback stays on your Mac."

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

    /// Phone: the phone needs nothing beside Tortie: no Tailscale, no VPN, no
    /// profile, no sign-in (Phase 330: the phone reaches the Mac's public name
    /// as an ordinary TLS client). No Mac surface says it, because the Mac
    /// has its own Tailscale.
    static let pairPrivateNetwork = "There is nothing else to install."

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

    /// Phone: `allowed` is not success. Pairing is done only when the first
    /// SIGNED read comes back over the phone's new identity, and this is the
    /// line when the door refuses it.
    static let pairFirstReadRefused = "Your Mac refused this iPhone’s first read, so it is not paired."

    /// Phone: what was read is not a QR v:3 pairing payload. The TestFlight
    /// build of 316.4 says this to a v:3 code too.
    static let pairNotACode = "That is not a Tortie pairing code."

    /// Phone: the camera is off for Tortie, so the code cannot be read.
    static let cameraOff = "Allow the camera for Tortie in your iPhone’s Settings to scan the code."

    /// Phone: no pairing, the Mac removed this one, a pairing kept by an
    /// earlier build, or the person left the pairing screen.
    static let notPaired = "This iPhone is not paired with a Mac."

    /// Phone: presenting, the Mac has not answered yet (`PairingStep.presenting`).
    static let pairReaching = "Reaching your Mac."

    /// Phone: the Mac's public name does not resolve yet and the phone tries
    /// again inside the window (`PairingStep.findingName`). His measurement on
    /// 2026-09-29: the name reached public DNS about 8 minutes after Tailscale
    /// first published it.
    static let pairNameNotYet = "Your Mac’s name is not on the internet yet. The first time, this can take several minutes."

    /// Phone: the Mac has this iPhone and is asking him (`PairingStep.waitingForMac`).
    static let pairWaitingForAllow = "Waiting for you to allow this iPhone on your Mac."

    /// Phone: allowed; the first signed read is being made (`PairingStep.confirming`).
    static let pairConfirming = "Checking with your Mac."

    /// Phone: the window shut while the Mac's name still did not resolve. The
    /// Mac's button is named, because a new code is the way on.
    /// Names: src/renderer/settings/PhoneSection.tsx ⟦BTN_PAIR = 'Pair'⟧
    static let pairNameNotFound = "Your Mac’s name did not reach the internet before the code shut. Press Pair on your Mac again in a few minutes."

    /// Phone: the press that goes back to pairing.
    static let pairAgain = "Pair again"

    // MARK: - Alerts (Phase 316.5)

    /// Mac: src/renderer/app/reach-copy.ts ⟦NO_SUCH_SESSION = 'Tortie no longer has a record of that session.'⟧
    static let noSuchSession = "Tortie no longer has a record of that session."

    /// Phone: this iPhone's alert address is not the one the Mac holds, and the
    /// Mac learns it only inside a pairing (build/p314/SPEC.md section 1.1 row 3:
    /// no route carries it). No Mac surface draws the phone's address. Drawn
    /// only for a Mac that said it could send (research 136 section 9).
    static let pairAgainForAlerts = "Pair again to get alerts."

    // MARK: - Settings (Phase 316.6: Settings.html, Unpair.html)

    /// Mac: src/renderer/machines/machine-choice.ts ⟦THIS_MAC = 'This Mac'⟧
    /// The machine filter's word for the Mac itself (Phase 316.7), which is
    /// what the Mac's own machine choice calls it, and the Settings card for
    /// the one Mac this iPhone is paired with (Phase 316.6), the same Mac.
    static let thisMac = "This Mac"

    /// Phone: before the date this iPhone was paired, `Paired · Sep 30, 2026`.
    /// No Mac surface says when a phone paired.
    static let paired = "Paired"

    /// Mac: src/renderer/settings/PhoneSection.tsx ⟦ALERTS_GROUP = 'Alerts'⟧
    static let alerts = "Alerts"

    /// Phone: the iOS setting the row opens, by iOS's own name for it.
    static let notifications = "Notifications"

    /// Phone: iOS allows Tortie's alerts. Never "On": the phone cannot see
    /// the Mac's switch, so it says only what iOS allows.
    static let notificationsAllowed = "Allowed"

    /// Phone: iOS does not allow Tortie's alerts.
    static let notificationsOff = "Off"

    /// Phone: iOS has not asked about Tortie's alerts yet.
    static let notificationsNotAsked = "Not asked"

    /// Phone: the press that forgets the pairing on this iPhone.
    static let unpairThisIPhone = "Unpair this iPhone"

    /// Phone: the question Unpair asks before it forgets anything.
    static let unpairQuestion = "Unpair this iPhone?"

    /// Phone: what Unpair does and does not do, until a signed verb tells the
    /// Mac (Phase 317's fix round took that verb out and queued it on its
    /// own). The Mac's own button and where it is are named.
    /// Names: src/renderer/settings/PhoneSection.tsx ⟦BTN_REMOVE = 'Remove'⟧
    /// Names: src/main/settings/window.ts ⟦title: 'Settings'⟧
    /// Names: src/renderer/settings/PhoneSection.tsx ⟦PHONE_TITLE = 'Phone'⟧
    static let unpairNote = "It forgets this Mac and its keys. Your Mac lists this iPhone until you press Remove in Settings then Phone."

    /// Phone: the question's destructive press.
    static let unpair = "Unpair"

    /// Mac: src/renderer/settings/PhoneSection.tsx ⟦BTN_CANCEL = 'Cancel'⟧
    static let cancel = "Cancel"

    /// Phone: the pairing record would not go, and the record goes FIRST, so
    /// nothing else was touched (Door/Keys.swift `PairingStore.forget`).
    static let unpairFailed = "This iPhone could not forget your Mac. Nothing was changed."

    /// Phone: the heading over the app's own facts (Phase 333.1's links land
    /// here).
    static let about = "About"

    /// Phone: the row that says the app's version.
    static let version = "Version"

    /// Phone: between the version and its build, `1.0.0 (4)`, as Xcode and
    /// TestFlight write it; `countClose` closes it.
    static let buildOpen = " ("

    // MARK: - End (Phase 317: End.html, EndThese.html, build/p317/SPEC.md section 5.8.7)
    //
    // The confirmation itself is NOT here: the door sends the Mac's own
    // `endSessionConfirm` for the session, word for word. Every batch and
    // outcome word below is a piece of the Mac sheet's own composer in
    // src/renderer/session-manager/copy.ts, and the composers at the foot of
    // this file put the pieces together the Mac's way;
    // ios/TortieTests/Fixtures/batch-words.json holds what both sides compose.

    /// Mac: src/renderer/session-manager/copy.ts ⟦END_SESSION = 'End session…'⟧
    static let endSessionMenu = "End session…"

    /// Phone: the Sessions tab's press that starts End these, drawn only when
    /// the Mac offers End on at least one row. The Mac sheet selects with a
    /// checkbox on every row and has no such press.
    static let select = "Select"

    /// Mac: src/renderer/session-manager/copy.ts ⟦END_SELECTED = 'End selected sessions…'⟧
    static let endSelected = "End selected sessions…"

    /// Mac: src/renderer/session-manager/copy.ts ⟦return `${String(n)} selected`;⟧
    static let selectedTail = " selected"

    /// Mac: src/renderer/session-manager/copy.ts ⟦return `End ${String(n)} running ${sessionWord(n)}?`;⟧
    static let batchEndLead = "End "

    /// Mac: src/renderer/session-manager/copy.ts ⟦return `End ${String(n)} running ${sessionWord(n)}?`;⟧
    static let batchRunningMid = " running "

    /// Mac: src/renderer/session-manager/copy.ts ⟦return `End ${String(n)} running ${sessionWord(n)}?`;⟧
    static let questionMark = "?"

    /// Mac: src/renderer/session-manager/copy.ts ⟦return `End ${String(n)} ${sessionWord(n)}`;⟧
    static let space = " "

    /// Mac: src/renderer/session-manager/copy.ts ⟦return n === 1 ? 'session' : 'sessions';⟧
    static let sessionSingular = "session"

    /// Mac: src/renderer/session-manager/copy.ts ⟦'sessions';⟧
    static let sessionPlural = "sessions"

    /// Mac: src/renderer/session-manager/copy.ts ⟦'This stops what is running in them, including sessions in closed projects. What each printed is saved first, and they stay in Managed as Ended.'⟧
    static let batchBodyLocal = "This stops what is running in them, including sessions in closed projects. What each printed is saved first, and they stay in Managed as Ended."

    /// Mac: src/renderer/session-manager/copy.ts ⟦return `${local} For a session on another machine, bringing it back always returns the folder, and it returns the conversation only when Tortie recorded one for this agent.`;⟧
    static let batchBodyRemoteTail = " For a session on another machine, bringing it back always returns the folder, and it returns the conversation only when Tortie recorded one for this agent."

    /// Mac: src/renderer/session-manager/copy.ts ⟦'1 selected session stays unchanged:'⟧
    static let skippedOneHead = "1 selected session stays unchanged:"

    /// Mac: src/renderer/session-manager/copy.ts ⟦`${String(total)} selected sessions stay unchanged:`⟧
    static let skippedManyTail = " selected sessions stay unchanged:"

    /// Mac: src/renderer/session-manager/copy.ts ⟦parts.push(`${String(counts.ended)} already ended`);⟧
    static let alreadyEndedTail = " already ended"

    /// Mac: src/renderer/session-manager/copy.ts ⟦parts.push(`${String(counts.unreachable)} unreachable`);⟧
    static let unreachableTail = " unreachable"

    /// Mac: src/renderer/session-manager/copy.ts ⟦parts.push(`${String(gone)} no longer here`);⟧
    static let noLongerHereTail = " no longer here"

    /// Mac: src/renderer/session-manager/copy.ts ⟦return `${head} ${parts.join(', ')}`;⟧
    static let listSeparator = ", "

    /// Mac: src/renderer/session-manager/copy.ts ⟦return `Ending ${String(n)} ${sessionWord(n)}…`;⟧
    static let runningLead = "Ending "

    /// Mac: src/renderer/session-manager/copy.ts ⟦return `${String(ended)} of ${String(n)} ${sessionWord(n)} ended`;⟧
    static let doneMid = " of "

    /// Mac: src/renderer/session-manager/copy.ts ⟦return `${String(ended)} of ${String(n)} ${sessionWord(n)} ended`;⟧
    static let doneTail = " ended"

    /// Mac: src/renderer/session-manager/copy.ts ⟦BATCH_STOP = 'Stop'⟧
    static let stop = "Stop"

    /// Mac: src/renderer/session-manager/copy.ts ⟦BATCH_DONE = 'Done'⟧
    static let done = "Done"

    /// Mac: src/renderer/session-manager/copy.ts ⟦return 'Ending…';⟧
    static let ending = "Ending…"

    /// Mac: src/renderer/session-manager/copy.ts ⟦return 'Ended';⟧
    /// Also the Show control's third word (Phase 316.7), the lifecycle
    /// segment's `label: 'Ended'` in the same module.
    static let ended = "Ended"

    /// Mac: src/renderer/session-manager/copy.ts ⟦? 'Already ended'⟧
    static let alreadyEnded = "Already ended"

    /// Mac: src/renderer/session-manager/copy.ts ⟦? 'Unreachable'⟧
    static let unreachable = "Unreachable"

    /// Mac: src/renderer/session-manager/copy.ts ⟦: 'No longer here';⟧
    static let noLongerHere = "No longer here"

    /// Mac: src/renderer/session-manager/copy.ts ⟦return `Not ended. ${outcome.message}`;⟧
    static let notEndedLead = "Not ended. "

    /// Mac: src/renderer/session-manager/copy.ts ⟦return 'Not run';⟧
    static let notRun = "Not run"

    /// Phone: a target whose write went out and got no answer the phone can
    /// read, so the Mac may have ended it once. The Mac sheet calls its own
    /// verb in-process and always has an answer.
    static let noAnswer = "No answer"

    /// Phone: Face ID, Touch ID or the passcode was cancelled or failed, so
    /// nothing was sent. The Mac asks no owner check.
    static let endNotConfirmed = "Not confirmed. Nothing was changed."

    /// Phone: this iPhone has no passcode, so nothing can confirm its owner
    /// and End is drawn off (research 136 section 14).
    static let endNeedsPasscode = "Set a passcode on this iPhone to end a session from it."

    /// Phone: the door refused the write before acting (a 404), or the app
    /// left before its bytes were handed and it was never sent. Both are true
    /// of each: the Mac did not end it.
    static let endNotTaken = "Your Mac did not end it. Nothing was changed."

    /// Phone: the write went out and no answer came back; drawn only over a
    /// read of the session that came back after it, so "as it reads now" is
    /// true.
    static let endNoAnswer = "Your Mac did not answer. This is the session as it reads now."

    // MARK: - Reply (Phase 318: Answer.html, Composer.html, build/p318/SPEC.md section 5.7.5)
    //
    // A press and a message ask no Face ID (his ruling, "Only for End"). The
    // options' words are the agent's own and the refusal sentences are the
    // Mac's (`src/shared/reply-copy.ts`), both drawn as the door sends them,
    // so neither is here. These are the message box's own words, which no Mac
    // surface draws: on the Mac a person types into the session itself.

    /// Phone: the message box's press. The Mac has no message box: a person
    /// types into the session's own terminal there.
    static let send = "Send"

    /// Phone: the message box's placeholder and its accessible name. The Mac
    /// has no message box to name.
    static let messagePlaceholder = "Message this session"

    /// Phone: under the message box, what Send does: one paste and Return,
    /// never queued and never split. The Mac types into the session directly.
    static let oneMessage = "Goes to this session as one message."

    /// Phone: under the message box while the message is on its way to the
    /// Mac. The Mac's own typing has no such wait.
    static let sending = "Sending…"

    /// Phone: the Mac answered that the message reached the session (`done`).
    /// The Mac's own typing needs no such word.
    static let replySent = "Sent"

    /// Phone: the door refused a press or a message before acting (a 404), or
    /// the app left before its bytes were handed and it was never sent. Both
    /// are true of each: nothing was sent.
    static let replyNotTaken = "Your Mac did not take it. Nothing was sent."

    // MARK: - The Screen (Phase 337: Screen.html, Session.html, build/p337/SPEC.md section 5.8.7)
    //
    // The session's own screen, typed into with every key and no Face ID (his
    // rulings 1 and 3). Every row on it is the session's own text, drawn as
    // the door sends it, so none of that is here; the Mac's refusals reach the
    // phone in the door's own sentences. These are the screen's chrome, which
    // no Mac surface draws: on the Mac a person is in the terminal itself.

    /// Phone: the row under Conversation that opens the session's own screen.
    /// The Mac IS that screen, so it needs no word for opening it.
    static let screen = "Screen"

    /// Phone: End's press, at the top right of a session's page since Phase
    /// 337 (D33). The Mac's menu item is `End session…` and the phone's
    /// confirmation is still the Mac's own words; a top bar holds one word.
    static let endTop = "End"

    /// Mac: src/renderer/terminal/terminal-menu.ts ⟦label: 'Copy',⟧
    /// The press that puts a selection of the screen on the iPhone's
    /// clipboard: the Mac's own word for copying from a terminal.
    static let copy = "Copy"

    /// Phone: the poll did not come back, so the screen drawn is the last one
    /// the Mac sent. The Mac never shows an old screen.
    static let screenNotAnswering = "Your Mac is not answering. This is the last screen it sent."

    /// Phone: inside a numbered question the phone sends one batch of keys per
    /// picture (D29), and a key typed before the next picture is not sent. The
    /// Mac draws every key at once, so it never waits.
    static let screenWaitForRedraw = "Waiting for the screen to redraw."

    /// Phone: while a selection is held the Screen keeps the picture it began
    /// on (D34). The Mac's terminal selects over the live screen.
    static let screenHeldWhileSelecting = "Showing the screen as it was when you started selecting."

    /// Phone: the session does not take keys now (it is not running, its
    /// state is unknown, or its machine has no live connection). The Mac's
    /// own terminal says so by not drawing one.
    static let screenCannotType = "Keys cannot reach this session now."

    /// Phone: the key bar's Escape. The Mac has a keyboard.
    static let keyEsc = "esc"

    /// Phone: the key bar's Tab.
    static let keyTab = "tab"

    /// Phone: the key bar's Shift-Tab, as the key's own cap draws it.
    static let keyBackTab = "⇧tab"

    /// Phone: the key bar's one-shot Control: the next letter becomes that
    /// control key.
    static let keyCtrl = "ctrl"

    /// Phone: the key bar's Return.
    static let keyReturn = "return"

    /// Phone: the spoken name of the key bar's Escape.
    static let keyEscapeLabel = "Escape"

    /// Phone: the spoken name of the key bar's Tab.
    static let keyTabLabel = "Tab"

    /// Phone: the spoken name of the key bar's Shift-Tab.
    static let keyBackTabLabel = "Shift Tab"

    /// Phone: the spoken name of the key bar's left arrow, drawn as a symbol.
    static let keyLeftLabel = "Left"

    /// Phone: the spoken name of the key bar's up arrow, drawn as a symbol.
    static let keyUpLabel = "Up"

    /// Phone: the spoken name of the key bar's down arrow, drawn as a symbol.
    static let keyDownLabel = "Down"

    /// Phone: the spoken name of the key bar's right arrow, drawn as a symbol.
    static let keyRightLabel = "Right"

    /// Phone: the spoken name of the key bar's one-shot Control.
    static let keyControlLabel = "Control"

    /// Phone: the spoken name of the key bar's Return.
    static let keyReturnLabel = "Return"

    /// Phone: the spoken name of the key bar's last button, drawn as a
    /// symbol, which puts the keyboard away.
    static let hideKeyboard = "Hide keyboard"

    // MARK: - The answer, drawn as markdown (Phase 316.6: Conversation.html, Link.html)

    /// Mac: src/renderer/arch/copy.ts ⟦ARCH_INSPECT_OPEN = 'Open'⟧
    /// The press that hands a link's whole address to iOS.
    static let open = "Open"

    /// Phone: an image an answer names, which the phone never loads, when it
    /// has no words of its own.
    static let image = "Image"

    /// Phone: after an ordered item's number, as CommonMark draws it; a `)`
    /// delimiter is drawn with it too.
    static let orderedMarkTail = "."

    /// Phone: under a code block cut at its line cap. No Mac block is cut.
    static let moreLineTail = " more line"

    /// Phone: the same, for more than one line.
    static let moreLinesTail = " more lines"

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

    /// `1.0.0 (4)`: the app's version and its build, from its own bundle.
    static func versionLine(_ marketing: String, _ build: String) -> String {
        marketing + buildOpen + build + countClose
    }

    /// `40 more lines`, or `1 more line`.
    static func moreLines(_ count: Int) -> String {
        String(count) + (count == 1 ? moreLineTail : moreLinesTail)
    }

    /// `12.`, an ordered item's mark: the number as the agent wrote it.
    static func orderedMark(_ number: String) -> String {
        number + orderedMarkTail
    }

    /// A line or a cell cut short, ending in the Mac's own mark for it.
    static func cutShort(_ text: String) -> String {
        text + pending
    }

    // End these (Phase 317): each the Mac's composer of the same name, put
    // together from its pieces above (batch-words.json holds both sides').

    /// `session`, or `sessions` for any count but one.
    static func sessionWord(_ count: Int) -> String {
        count == 1 ? sessionSingular : sessionPlural
    }

    /// `3 selected`.
    static func selectedCount(_ count: Int) -> String {
        String(count) + selectedTail
    }

    /// `End 2 running sessions?`, the batch confirmation's title.
    static func batchHeading(_ count: Int) -> String {
        batchEndLead + String(count) + batchRunningMid + sessionWord(count) + questionMark
    }

    /// `End 2 sessions`, the batch confirmation's press.
    static func batchConfirmLabel(_ count: Int) -> String {
        batchEndLead + String(count) + space + sessionWord(count)
    }

    /// The batch confirmation's body, drawn FIRST in its message: the local
    /// sentence, and the remote tail when any target is on another machine.
    static func batchBody(_ anyRemote: Bool) -> String {
        anyRemote ? batchBodyLocal + batchBodyRemoteTail : batchBodyLocal
    }

    /// `1 selected session stays unchanged: 1 already ended`: the selected
    /// rows the confirmation will not end, counted with their reasons in the
    /// Mac's order and never listed. Nil when none was skipped.
    static func batchSkippedLine(_ skipped: [BatchSkip]) -> String? {
        guard !skipped.isEmpty else { return nil }
        let ended = skipped.filter { $0 == .ended }.count
        let unreachable = skipped.filter { $0 == .unreachable }.count
        let gone = skipped.filter { $0 == .gone }.count
        var parts: [String] = []
        if ended > 0 { parts.append(String(ended) + alreadyEndedTail) }
        if unreachable > 0 { parts.append(String(unreachable) + unreachableTail) }
        if gone > 0 { parts.append(String(gone) + noLongerHereTail) }
        let head = skipped.count == 1 ? skippedOneHead : String(skipped.count) + skippedManyTail
        return head + space + parts.joined(separator: listSeparator)
    }

    /// `Ending 2 sessions…`.
    static func batchRunningHeading(_ count: Int) -> String {
        runningLead + String(count) + space + sessionWord(count) + pending
    }

    /// `2 of 2 sessions ended`.
    static func batchDoneHeading(_ endedCount: Int, _ count: Int) -> String {
        String(endedCount) + doneMid + String(count) + space + sessionWord(count) + doneTail
    }

    /// `Not ended. <the reason, in its owner's words>`.
    static func notEnded(_ reason: String) -> String {
        notEndedLead + reason
    }
}
