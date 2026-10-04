// The accessibility identifiers XCUITest reads (Phase 316.2).
//
// NOT USER-VISIBLE. Nothing here is drawn or spoken: an identifier is the
// name a UI test finds an element by, and VoiceOver never reads it. They are
// gathered in this one file so `conformance:ios` rule (b) can exempt one file
// by name rather than a pattern, and so the probe's Method A has one place to
// read what each element is called.
//
// THE TABLE, and every entry is read by `probe:p316` or its UI test:
//
//   screen-list, screen-session, screen-conversation, screen-pairing
//                                the four screens, one container each
//   screen-needs-input, screen-settings
//                                the first and third tabs (Phase 316.6); the
//                                Sessions tab is screen-list. A tab's button
//                                has no identifier: SwiftUI gives a `Tab`
//                                none, so a test finds it by its label
//   list-title                   "Sessions"
//   list-alerts-line             `Pair again to get alerts.`, under the title
//   list-notice                  the Mac's sentence for a session it no longer
//                                has, after a tap on an alert naming it
//   list-loading                 the spinner before the first answer
//   list-failure                 the one sentence when a read failed
//   section-blocked, section-others
//                                the two section headers (28 pt tall); the
//                                label is the header's own words, unraised
//   section-blocked-text, section-others-text
//                                the header's words, for the 16 pt gutter
//   list-empty                   main's `emptyLine` when nothing waits
//   list-others-left-out         the line when `othersOmitted` > 0
//   list-age-note, list-read     the foot: main's `ageNote`, then `read <time>`
//   row-<sessionId>              one row; a container, so its parts below are
//                                elements of their own with their own frames
//   row-dot-<id>, row-name-<id>, row-machine-<id>, row-age-<id>, row-line-<id>
//   session-status, session-dot, session-agent, session-machine
//   session-outcome, session-question, session-asked
//   session-choices-note, session-choice-<n> (n counts from 0 in drawn order),
//   session-choice-marker-<n>, session-choice-text-<n>
//   session-messages, session-messages-small,
//   session-last-message, session-last-message-small
//   session-answer               the agent's last answer, drawn as markdown
//   session-open-conversation    the row that opens the conversation
//   session-loading, session-failure
//   conversation-terminal-line   the line saying the terminal is not here
//   conversation-older           the spinner, present exactly while older
//                                turns remain to be asked for
//   conversation-older-line      the one line when a page of older turns was
//                                refused or did not come back; paging stopped
//   conversation-no-clock        the desktop's note when no turn has a clock
//   conversation-note            main's `note` (a session on another machine)
//   conversation-empty           the session's own line when it has no turns
//   conversation-loading, conversation-failure
//   turn-<index>                 one turn; a container
//   turn-clock-<index>, turn-ask-<index>, turn-ask-clipped-<index>,
//   turn-answer-<index>, turn-answer-clipped-<index>, turn-absence-<index>,
//   turn-notice-<index>
//   pairing-title, pairing-step, pairing-scanner, pairing-point,
//   pairing-match, pairing-fingerprint, pairing-allow-on-mac,
//   pairing-network, pairing-line, pairing-again
//   <failure id>-retry           `Try again` under list-failure,
//                                needs-list-failure, session-failure and
//                                conversation-failure
//
// THE NEEDS INPUT TAB (Phase 316.6) is the list's first section alone, under
// a title of its own, and every element it shares with the Sessions tab
// carries the prefix `needs-`, so the two tabs never share an identifier:
//
//   needs-input-title            "Needs input"
//   needs-list-alerts-line, needs-list-notice, needs-list-loading,
//   needs-list-failure, needs-list-empty, needs-list-age-note, needs-list-read
//                                as the list's, on this tab
//   needs-row-<sessionId>        one waiting row; a container, with its parts
//   needs-row-dot-<id>, needs-row-name-<id>, needs-row-machine-<id>,
//   needs-row-age-<id>, needs-row-line-<id>
//
// SETTINGS (Phase 316.6):
//
//   settings-title               "Settings"
//   settings-mac                 the This Mac card; a container
//   settings-mac-name            the public name's first label
//   settings-mac-address         the public name and its port
//   settings-mac-read            `read <time>` from the list's last answer
//   settings-match               "Check this matches your Mac"
//   settings-fingerprint         the six groups, as Pairing draws them
//   settings-paired              `Paired · <date>`
//   settings-alerts              the Alerts card, only for a Mac that sends
//   settings-notifications       the row that opens iOS Settings; a button
//   settings-notifications-state what iOS allows: Allowed, Off, Not asked, —
//   settings-alerts-line         `Pair again to get alerts.`, when the list
//                                says it
//   settings-unpair              Unpair this iPhone; a button
//   settings-unpair-line         the sentence when the phone could not forget
//   settings-about, settings-version
//                                the About card and its `1.0.0 (4)`
//
// END (Phase 317, build/p317/SPEC.md section 5.8.8):
//
//   session-end-bar              the bar above the tab bar; a container
//   session-end                  its row, `End session…`; a button
//   session-end-line             the one line under it
//   session-end-glyph-<name>     the row's glyph, an image: faceid, touchid or
//                                lock
//   end-confirming               present while iOS asks Face ID, Touch ID or
//                                the passcode
//   list-select                  `Select`, or `Cancel` while selecting, at the
//                                Sessions title's trailing edge
//   list-selected-count          `3 selected`
//   list-end-selected            `End selected sessions…`; a button
//   row-select-<id>              a row's circle while selecting; selected
//                                trait when ticked
//   row-outcome-<id>             a target's outcome word, `Ended` and the rest
//   batch-heading                `Ending 2 sessions…`, then `2 of 2 sessions
//                                ended`
//   batch-stop, batch-done       `Stop` while running, `Done` after
//   batch-line                   the one line in End these' bar (the owner
//                                check's answer when it did not confirm)
//
// REPLY (Phase 318, build/p318/SPEC.md section 5.7.6):
//
//   session-choice-press-<n>     an option the Mac offers to press, a button
//                                inside session-choice-<n> (n counts from 0)
//   session-reply-line           the one line under the options after a press
//   session-command              the command the agent asks to run, drawn
//                                under the question (Codex's `$` line)
//   session-message-strip        the message box above the End bar; a
//                                container
//   session-message-field        the box itself, `Message this session`
//   session-message-send         `Send`; a button
//   session-message-line         the one line under the box: `Goes to this
//                                session as one message.`, `Sending…`, `Sent`
//                                or the Mac's sentence
//
// THE ANSWER DRAWN AS MARKDOWN (Phase 316.6, Screens/MarkdownView.swift).
// `<scope>` is the turn's index in the conversation, or `last` for the
// Session screen's last answer; `<n>` a block's PRE-ORDER ordinal from 0 over
// the drawn tree (a container before its children, items in order, a table
// once and its cells not):
//
//   md-<scope>-<n>               one block, or one list item's content
//   md-<scope>-<n>-r<i>c<j>      a table cell; row 0 is the header
//   md-<scope>-<n>-mark          a list item's mark
//   md-<scope>-<n>-more          a block's counted note (`3 more rows`)
//   md-<scope>-rest              the line when the answer was cut short
//
// A turn's ask reads back WITH its asterisks: the ask is `Text(verbatim:)`.
// Since Phase 316.6 `turn-answer-<index>` and `session-answer` are CONTAINERS
// of the blocks above, whose own label is empty, so the probe's Method A
// composes an answer from its `md-<scope>-*` labels in order.

enum ID {
    // The four screens.
    static let listScreen = "screen-list"
    static let sessionScreen = "screen-session"
    static let conversationScreen = "screen-conversation"
    static let pairingScreen = "screen-pairing"

    // The list.
    static let listTitle = "list-title"
    static let listAlertsLine = "list-alerts-line"
    static let listNotice = "list-notice"
    static let listLoading = "list-loading"
    static let listFailure = "list-failure"
    static let sectionBlocked = "section-blocked"
    static let sectionOthers = "section-others"
    static let sectionBlockedText = "section-blocked-text"
    static let sectionOthersText = "section-others-text"
    static let listEmpty = "list-empty"
    static let listOthersLeftOut = "list-others-left-out"
    static let listAgeNote = "list-age-note"
    static let listRead = "list-read"
    static func row(_ id: String) -> String { "row-" + id }
    static func rowDot(_ id: String) -> String { "row-dot-" + id }
    static func rowName(_ id: String) -> String { "row-name-" + id }
    static func rowMachine(_ id: String) -> String { "row-machine-" + id }
    static func rowAge(_ id: String) -> String { "row-age-" + id }
    static func rowLine(_ id: String) -> String { "row-line-" + id }

    // One session.
    static let sessionStatus = "session-status"
    static let sessionDot = "session-dot"
    static let sessionAgent = "session-agent"
    static let sessionMachine = "session-machine"
    static let sessionOutcome = "session-outcome"
    static let sessionQuestion = "session-question"
    static let sessionAsked = "session-asked"
    static let sessionChoicesNote = "session-choices-note"
    static func sessionChoice(_ n: Int) -> String { "session-choice-" + String(n) }
    static func sessionChoiceMarker(_ n: Int) -> String { "session-choice-marker-" + String(n) }
    static func sessionChoiceText(_ n: Int) -> String { "session-choice-text-" + String(n) }
    static let sessionMessages = "session-messages"
    static let sessionMessagesSmall = "session-messages-small"
    static let sessionLastMessage = "session-last-message"
    static let sessionLastMessageSmall = "session-last-message-small"
    static let sessionAnswer = "session-answer"
    static let sessionOpenConversation = "session-open-conversation"
    static let sessionLoading = "session-loading"
    static let sessionFailure = "session-failure"

    // The conversation.
    static let conversationTerminalLine = "conversation-terminal-line"
    static let conversationOlder = "conversation-older"
    static let conversationOlderLine = "conversation-older-line"
    static let conversationNoClock = "conversation-no-clock"
    static let conversationNote = "conversation-note"
    static let conversationEmpty = "conversation-empty"
    static let conversationLoading = "conversation-loading"
    static let conversationFailure = "conversation-failure"
    static func turn(_ index: Int) -> String { "turn-" + String(index) }
    static func turnClock(_ index: Int) -> String { "turn-clock-" + String(index) }
    static func turnAsk(_ index: Int) -> String { "turn-ask-" + String(index) }
    static func turnAskClipped(_ index: Int) -> String { "turn-ask-clipped-" + String(index) }
    static func turnAnswer(_ index: Int) -> String { "turn-answer-" + String(index) }
    static func turnAnswerClipped(_ index: Int) -> String { "turn-answer-clipped-" + String(index) }
    static func turnAbsence(_ index: Int) -> String { "turn-absence-" + String(index) }
    static func turnNotice(_ index: Int) -> String { "turn-notice-" + String(index) }

    // Pairing.
    static let pairingTitle = "pairing-title"
    static let pairingStep = "pairing-step"
    static let pairingScanner = "pairing-scanner"
    static let pairingPoint = "pairing-point"
    static let pairingMatch = "pairing-match"
    static let pairingFingerprint = "pairing-fingerprint"
    static let pairingAllowOnMac = "pairing-allow-on-mac"
    static let pairingNetwork = "pairing-network"
    static let pairingLine = "pairing-line"
    static let pairingAgain = "pairing-again"

    // The Needs input tab (Phase 316.6).
    static let needsInputScreen = "screen-needs-input"
    static let needsInputTitle = "needs-input-title"
    static let needsListAlertsLine = "needs-list-alerts-line"
    static let needsListNotice = "needs-list-notice"
    static let needsListLoading = "needs-list-loading"
    static let needsListFailure = "needs-list-failure"
    static let needsListEmpty = "needs-list-empty"
    static let needsListAgeNote = "needs-list-age-note"
    static let needsListRead = "needs-list-read"
    static func needsRow(_ id: String) -> String { "needs-row-" + id }
    static func needsRowDot(_ id: String) -> String { "needs-row-dot-" + id }
    static func needsRowName(_ id: String) -> String { "needs-row-name-" + id }
    static func needsRowMachine(_ id: String) -> String { "needs-row-machine-" + id }
    static func needsRowAge(_ id: String) -> String { "needs-row-age-" + id }
    static func needsRowLine(_ id: String) -> String { "needs-row-line-" + id }

    // Settings (Phase 316.6).
    static let settingsScreen = "screen-settings"
    static let settingsTitle = "settings-title"
    static let settingsMac = "settings-mac"
    static let settingsMacName = "settings-mac-name"
    static let settingsMacAddress = "settings-mac-address"
    static let settingsMacRead = "settings-mac-read"
    static let settingsMatch = "settings-match"
    static let settingsFingerprint = "settings-fingerprint"
    static let settingsPaired = "settings-paired"
    static let settingsAlerts = "settings-alerts"
    static let settingsNotifications = "settings-notifications"
    static let settingsNotificationsState = "settings-notifications-state"
    static let settingsAlertsLine = "settings-alerts-line"
    static let settingsUnpair = "settings-unpair"
    static let settingsUnpairLine = "settings-unpair-line"

    // End and End these (Phase 317).
    static let sessionEndBar = "session-end-bar"
    static let sessionEnd = "session-end"
    static let sessionEndLine = "session-end-line"
    /// The owner check's glyph on the End row: `faceid`, `touchid` or `lock`.
    static func sessionEndGlyph(_ glyph: String) -> String { "session-end-glyph-" + glyph }
    static let endConfirming = "end-confirming"
    static let listSelect = "list-select"
    static let listSelectedCount = "list-selected-count"
    static let listEndSelected = "list-end-selected"
    static func rowSelect(_ id: String) -> String { "row-select-" + id }
    static func rowOutcome(_ id: String) -> String { "row-outcome-" + id }
    static let batchHeading = "batch-heading"
    static let batchStop = "batch-stop"
    static let batchDone = "batch-done"
    static let batchLine = "batch-line"
    static let settingsAbout = "settings-about"
    static let settingsVersion = "settings-version"

    // Reply (Phase 318).
    /// An option the Mac offers to press: a button.
    static func sessionChoicePress(_ n: Int) -> String { "session-choice-press-" + String(n) }
    static let sessionReplyLine = "session-reply-line"
    static let sessionCommand = "session-command"
    static let sessionMessageStrip = "session-message-strip"
    static let sessionMessageField = "session-message-field"
    static let sessionMessageSend = "session-message-send"
    static let sessionMessageLine = "session-message-line"

    // The answer drawn as markdown (Phase 316.6).
    /// The Session screen's scope; a conversation's is the turn's index.
    static let mdLastScope = "last"
    static func md(_ scope: String, _ n: Int) -> String { "md-" + scope + "-" + String(n) }
    static func mdCell(_ scope: String, _ n: Int, row: Int, column: Int) -> String { md(scope, n) + "-r" + String(row) + "c" + String(column) }
    static func mdMark(_ scope: String, _ n: Int) -> String { md(scope, n) + "-mark" }
    static func mdMore(_ scope: String, _ n: Int) -> String { md(scope, n) + "-more" }
    static func mdRest(_ scope: String) -> String { "md-" + scope + "-rest" }

    /// The `Try again` under a screen's failure sentence.
    static func retry(_ failure: String) -> String { failure + "-retry" }
}
