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
//   screen-list, screen-session, screen-catch-up, screen-pairing
//                                the four screens, one container each. Since
//                                Phase 337.1 screen-session is a session's
//                                route WHICHEVER face it draws (the Terminal
//                                or Catch Me Up, build/p3371/SPEC.md D16), and
//                                screen-catch-up is Catch Me Up, as a face
//                                inside it or pushed from the Terminal's ⋯
//   screen-needs-input, screen-settings
//                                the first and third tabs (Phase 316.6); the
//                                Sessions tab is screen-list. A tab's button
//                                has no identifier: SwiftUI gives a `Tab`
//                                none, so a test finds it by its label
//
// THE TAB ROOTS' TITLES (Phase 348, build/p348/SPEC.md D15, section 5.3) are
// the iPhone's own navigation bar with its large title, which carries no
// identifier of ours: a test reads `app.navigationBars[<title>]`, the bar
// whose identifier is its title ("Needs input", "Sessions", "Settings",
// "Macs"). So `list-title`, `needs-input-title`, `settings-title` and
// `macs-title` are gone, and with the age note (item 4) `list-age-note` and
// `needs-list-age-note`.
//
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
//   list-read                    the foot: `read <time>` alone (main's
//                                `ageNote` is read and never drawn since
//                                Phase 348)
//   row-<sessionId>              one row; a container, so its parts below are
//                                elements of their own with their own frames
//   row-dot-<id>, row-name-<id>, row-machine-<id>, row-age-<id>, row-line-<id>
//   session-status, session-dot, session-agent, session-machine
//   session-outcome, session-question, session-asked
//   session-choices-note, session-choice-<n> (n counts from 0 in drawn order),
//   session-choice-marker-<n>, session-choice-text-<n>
//   session-messages, session-messages-small,
//   session-last-message, session-last-message-small
//                                Since Phase 337.1 every session-* name above
//                                is drawn by Catch Me Up's now card, and the
//                                Terminal's status line keeps session-dot,
//                                session-status, session-agent and
//                                session-machine: a name names the thing, not
//                                the page, and one face is on screen at a time
//   session-answer               the agent's last answer, drawn as markdown
//   session-loading, session-failure
//                                the session route's first read: the spinner,
//                                and its one sentence when it did not come back
//   catch-up-older               the spinner, present exactly while older
//                                turns remain to be asked for
//   catch-up-older-line          the one line when a page of older turns was
//                                refused or did not come back; paging stopped
//   catch-up-no-clock            the desktop's note when no turn has a clock
//   catch-up-note                main's `note` (a session on another machine)
//   catch-up-empty               the session's own line when it has no turns
//   catch-up-loading, catch-up-failure
//   turn-<index>                 one turn; a container
//   turn-clock-<index>, turn-ask-<index>, turn-ask-clipped-<index>,
//   turn-answer-<index>, turn-answer-clipped-<index>, turn-absence-<index>,
//   turn-notice-<index>
//   pairing-title, pairing-scanner, pairing-point,
//   pairing-match, pairing-fingerprint, pairing-allow-on-mac,
//   pairing-line, pairing-again
//   pairing-get-mac              the first step, Get Tortie for Mac: a button,
//                                the whole row, that opens tortie.sh (Phase
//                                333.1, build/p3331/SPEC.md section 5.5.1)
//   pairing-step-open, pairing-step-scan
//                                the second and third steps
//   pairing-scan-code            Scan code, the press that opens the camera
//   pairing-nothing-else         `Nothing else to install on this phone.`
//   pairing-privacy, pairing-support
//                                the foot's two pages of Tortie's site; buttons
//   pairing-see-sample           See a sample, under Scan code at rest and
//                                under pairing-point after it, whenever no
//                                pairing is under way; a button (Phase 333.3,
//                                build/p3333/SPEC.md D13)
//   <failure id>-retry           `Try again` under list-failure,
//                                needs-list-failure, session-failure and
//                                catch-up-failure
//   <failure id>-note            the line under a failure's sentence when it
//                                is `Tortie could not reach your Mac.` (Phase
//                                333.1, D23)
//
// THE NEEDS INPUT TAB (Phase 316.6) is the list's first section alone, under
// a title of its own (the bar's large title since Phase 348), and every
// element it shares with the Sessions tab carries the prefix `needs-`, so the
// two tabs never share an identifier:
//
//   needs-list-alerts-line, needs-list-notice, needs-list-loading,
//   needs-list-failure, needs-list-empty, needs-list-read
//                                as the list's, on this tab
//   needs-row-<sessionId>        one waiting row; a container, with its parts
//   needs-row-dot-<id>, needs-row-name-<id>, needs-row-machine-<id>,
//   needs-row-age-<id>, needs-row-line-<id>
//
// SETTINGS (Phase 316.6; an inset grouped page since Phase 348, D12, each
// group's id on the whole group, so what was read inside a card still is):
//
//   settings-mac                 the This Mac group; a container
//   settings-mac-name            the public name's first label
//   settings-mac-address         the public name and its port
//   settings-mac-read            `read <time>` from the list's last answer
//   settings-match               "Check this matches your Mac"
//   settings-fingerprint         the six groups, as Pairing draws them
//   settings-paired              the day this iPhone paired, the right side
//                                of the `Paired` row (Phase 348: a labelled
//                                row, as Version is; `Paired · <date>` before)
//   settings-alerts              the Alerts group, only for a Mac that sends
//   settings-notifications       the row that opens iOS Settings; a button
//   settings-notifications-state what iOS allows: Allowed, Off, Not asked, —
//   settings-alerts-line         `Pair again to get alerts.`, when the list
//                                says it: the Alerts group's footer
//   settings-unpair              Unpair this iPhone; a button
//   settings-unpair-line         the sentence when the phone could not forget:
//                                the Unpair group's footer
//   settings-see-sample          See a sample, under Unpair on a paired phone;
//                                a button (Phase 333.3, D13)
//   settings-about, settings-version
//                                the About group and its `1.0.0 (4)`
//   settings-mac-site            Tortie for Mac, a button that opens tortie.sh
//                                (Phase 333.1, D22)
//   settings-mac-site-name       `tortie.sh`, on that row's right
//   settings-privacy, settings-support
//                                the privacy and support pages; buttons
//   settings-pair-another        Pair another Mac, between the Mac's cards and
//                                Unpair this iPhone; a button (Phase 345,
//                                build/p345/SPEC.md D15)
//
// SEVERAL MACS (Phase 345, build/p345/SPEC.md D3, D14, D16). With two or more
// Macs kept the bar has a fourth tab, named after the Mac on screen; like
// every tab's button it has no identifier, and a test finds it by that name.
// `<i>` counts the Macs from 0 in the phone's order (D9):
//
//   screen-macs                  the Macs screen, the fourth tab's root,
//                                under the bar's large title `Macs`
//   macs-row-<i>                 one Mac; a container, and a button that
//                                chooses it
//   macs-row-name-<i>            its drawn name (D21)
//   macs-row-line-<i>            its line: the sentence its last read said, or
//                                `Needs your input (n)`; absent when neither
//   macs-row-chosen-<i>          the tick on the Mac on screen; absent on the
//                                others
//   pair-another-sheet           the Pair another Mac sheet; a container
//                                holding the pairing screen
//   pair-another-cancel          its Cancel; a button
//
// SEE A SAMPLE (Phase 333.3, build/p3333/SPEC.md D14): made-up sessions inside
// the app, under one strip at the top of every page:
//
//   sample-bar                   the strip above the three tabs; a container
//   sample-label                 `Sample`, at its leading edge
//   sample-leave                 `Leave sample`, at its trailing edge; a button
//
// END (Phase 317, build/p317/SPEC.md section 5.8.8; moved to the top bar in
// Phase 337, D33, and its bar at the bottom is gone):
//
//   session-end                  `End`, the navigation bar's trailing item; a
//                                button
//   session-remove               `Remove`, in End's place at Catch Me Up's top
//                                right once End is done and the Mac offers
//                                Remove (Phase 348, D4, D33); a button
//   remove-writing               present beside the ⋯ or the top-right press
//                                while a Remove's write runs (Phase 348)
//   session-end-line             the one line about End, under the status
//   session-end-glyph-<name>     the row's glyph, an image: faceid, touchid or
//                                lock, and lock.open in the sample on an
//                                iPhone with no passcode (Phase 333.3)
//   end-confirming               present while iOS asks Face ID, Touch ID or
//                                the passcode
//   end-writing                  present beside the Terminal's ⋯ while End's
//                                write runs (Phase 337.3)
//   list-select                  `Select`, or `Cancel` while selecting, at the
//                                bar's leading edge on Sessions (Phase 348,
//                                D16; at the title's trailing edge before)
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
// REPLY (Phase 318, build/p318/SPEC.md section 5.7.6). Since Phase 337.1 the
// Terminal's question tray draws session-choice-<n>, session-choice-press-<n>,
// session-command and session-reply-line under the terminal, the same names
// Catch Me Up's now card draws (build/p3371/SPEC.md D19):
//
//   session-choice-press-<n>     an option the Mac offers to press, a button
//                                inside session-choice-<n> (n counts from 0)
//   session-reply-line           the one line under the options after a press
//   session-command              the command the agent asks to run, drawn
//                                under the question (Codex's `$` line)
//   session-message-strip        the message box at the foot of Catch Me Up
//                                (Phase 337.1); a container
//   session-message-field        the box itself, `Message this session`
//   session-message-send         `Send`; a button
//   session-message-line         the one line under the box: `Goes to this
//                                session as one message.`, `Sending…`, `Sent`
//                                or the Mac's sentence
//
// THE SCREEN (Phase 337, build/p337/SPEC.md section 5.8.7), THE TERMINAL
// since Phase 337.1 (build/p3371/SPEC.md section 5.5.7): a running session
// opens on it, and every name below is its own as 337 gave it:
//
//   screen-screen                the Terminal; a container inside
//                                screen-session
//   terminal-status              the Terminal's one status line under the
//                                title; a container of session-dot,
//                                session-status, session-agent and
//                                session-machine
//   terminal-menu                the Terminal's one ⋯ at the top right, a
//                                menu (Phase 337.3, build/p3373/SPEC.md D21)
//   terminal-menu-catch-up, terminal-menu-end
//                                its two items, Catch Me Up then End
//                                session…; buttons, found once it is open
//   terminal-menu-remove         Remove, in End session…'s place once End is
//                                done and the Mac offers Remove (Phase 348,
//                                build/p348/SPEC.md D4, D33); a button
//   screen-grid                  the grid of rows, at the Mac's width
//   screen-loading, screen-failure
//                                the spinner before the first picture, and the
//                                one sentence in place of the grid: none came
//                                and none is kept, or the Mac's own sentence
//                                for a session with no screen to show
//   screen-row-<n>               one live row, n counting from 0 at the top
//                                of the live screen; its label is the row's
//                                text, trailing blanks dropped
//   screen-history-<i>           one row of history (Phase 337.1), i its index
//                                from the oldest line the Mac holds; its label
//                                is the row's text
//   screen-to-live               the button that returns a terminal scrolled
//                                back to its live bottom
//   screen-scrollback-line       the one line where paging back stopped
//   screen-cursor                the cursor's block, when it is shown
//   screen-line                  the one line under the grid: not answering,
//                                waiting for the redraw, held while
//                                selecting, cannot type, or the Mac's sentence
//   screen-key-field             the hidden field that holds the keyboard
//   screen-key-bar               the key bar above the keyboard; a container
//   screen-key-<name>            one of its keys: esc, tab, btab, left, up,
//                                down, right, ctrl, return, hide
//   screen-copy                  `Copy`, the edit menu's first item over a
//                                selection; a menu item (Phase 337.5)
//   screen-paste                 `Paste`, iOS's own paste command after Copy,
//                                only while the Mac takes a paste and the
//                                clipboard holds text; a menu item (Phase
//                                348, D39)
//   screen-cover                 the plate over the grid while the app is not
//                                active, so iOS keeps no picture of it
//
// THE SESSIONS TAB (Phase 316.7, build/p3167/SPEC.md section 6.4.9) keeps
// every name above on its new screen: screen-list, list-select,
// list-loading, list-failure, list-alerts-line, list-notice, list-read and
// row-* (its rows are `RowView`s), so every existing UI test step finds them.
// On the older-Mac face it IS the list above, every name as it was. New:
//
//   list-show                    the Show control; a container
//   list-show-all, list-show-active, list-show-ended
//                                its three buttons; the chosen one carries the
//                                selected trait
//   list-menu                    the menu after Select at the bar's leading
//                                edge (Group by, Sort by, Agent, Machine,
//                                Clear filters); a button
//   group-<id>                   one project's header; a button laid over its
//                                parts, one tap opens or closes it, off while
//                                End these takes taps (the fix round,
//                                2026-10-03). `<id>` is main's 16 character
//                                group id
//   group-label-<id>, group-count-<id>
//                                its label, and how many sessions it has under
//                                the words
//   group-machine-<id>           its machine's badge, when it is elsewhere
//   group-folder-<id>            its folder, when two projects share a name
//   group-waiting-<id>           the needs-input dot, when one of its sessions
//                                waits, open or closed
//   group-left-out-<id>          `n more not shown.`, its last line, when the
//                                caps left some of its sessions out
//   list-no-match                `No matching sessions`
//   list-clear-filters           the Clear filters under it; a button
//   list-no-sessions             `No sessions to manage`, when the Mac lists
//                                none at all
//   list-sessions-left-out       `n more not shown.` above the foot, when the
//                                caps left any session out
//
// NEW SESSION (Phase 346, build/p346/SPEC.md section 4.16):
//
//   start-open                   the "+" alone at the bar's trailing edge on
//                                Sessions (Phase 348, D16; at the title's
//                                trailing end before), drawn only for an
//                                offered start; a button, off while End
//                                these takes taps
//   start-sheet                  New session; a container
//   start-project                its Project menu; a button
//   start-project-<id>           one project in the menu, `<id>` the Mac's
//                                project id; off when its machine is not
//                                connected
//   start-agent-<id>             one agent's mark, `<id>` its registry id; a
//                                button whose label is the agent's name; the
//                                chosen one carries the selected trait
//   start-agent-name             the chosen agent's name, under the marks
//   start-danger                 `Starts with …`, when the chosen agent has a
//                                sealed safeguard-off launch default
//   start-create                 Create, Creating… or Try again; a button
//   start-line                   the one line for the state: a refusal, no
//                                answer, no project or no agent
//   start-close                  Cancel, which closes the sheet
//
// THE ANSWER DRAWN AS MARKDOWN (Phase 316.6, Screens/MarkdownView.swift).
// `<scope>` is the turn's index in the conversation, or `last` for the
// now card's last answer (Catch Me Up with no turns, Phase 337.1); `<n>` a block's PRE-ORDER ordinal from 0 over
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
    /// A session's route, whichever face it draws (Phase 337.1, D16).
    static let sessionScreen = "screen-session"
    /// The route's second child, beside its face, hidden from VoiceOver and
    /// drawn as nothing (the 337.1 fix round): with the face its one child,
    /// SwiftUI folded the face's own container into the route's and only
    /// `screen-session` reached the tree, never `screen-screen` or
    /// `screen-catch-up` (the verifier's element dumps).
    static let sessionRouteMark = "session-route-mark"
    /// Catch Me Up (Phase 337.1, D20, D21).
    static let catchUpScreen = "screen-catch-up"
    static let pairingScreen = "screen-pairing"

    // The list.
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
    static let sessionLoading = "session-loading"
    static let sessionFailure = "session-failure"

    // Catch Me Up's conversation (Phase 337.1: the conversation's names).
    static let catchUpOlder = "catch-up-older"
    static let catchUpOlderLine = "catch-up-older-line"
    static let catchUpNoClock = "catch-up-no-clock"
    static let catchUpNote = "catch-up-note"
    static let catchUpEmpty = "catch-up-empty"
    static let catchUpLoading = "catch-up-loading"
    static let catchUpFailure = "catch-up-failure"
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
    static let pairingScanner = "pairing-scanner"
    static let pairingPoint = "pairing-point"
    static let pairingMatch = "pairing-match"
    static let pairingFingerprint = "pairing-fingerprint"
    static let pairingAllowOnMac = "pairing-allow-on-mac"
    static let pairingLine = "pairing-line"
    static let pairingAgain = "pairing-again"
    // The resting face's three steps and its foot (Phase 333.1).
    static let pairingGetMac = "pairing-get-mac"
    static let pairingStepOpen = "pairing-step-open"
    static let pairingStepScan = "pairing-step-scan"
    static let pairingScanCode = "pairing-scan-code"
    static let pairingNothingElse = "pairing-nothing-else"
    static let pairingPrivacy = "pairing-privacy"
    static let pairingSupport = "pairing-support"
    /// See a sample, under Scan code (Phase 333.3, D13).
    static let pairingSeeSample = "pairing-see-sample"

    // See a sample (Phase 333.3, D14): the one strip above the three tabs.
    static let sampleBar = "sample-bar"
    static let sampleLabel = "sample-label"
    static let sampleLeave = "sample-leave"

    // The Needs input tab (Phase 316.6).
    static let needsInputScreen = "screen-needs-input"
    static let needsListAlertsLine = "needs-list-alerts-line"
    static let needsListNotice = "needs-list-notice"
    static let needsListLoading = "needs-list-loading"
    static let needsListFailure = "needs-list-failure"
    static let needsListEmpty = "needs-list-empty"
    static let needsListRead = "needs-list-read"
    static func needsRow(_ id: String) -> String { "needs-row-" + id }
    static func needsRowDot(_ id: String) -> String { "needs-row-dot-" + id }
    static func needsRowName(_ id: String) -> String { "needs-row-name-" + id }
    static func needsRowMachine(_ id: String) -> String { "needs-row-machine-" + id }
    static func needsRowAge(_ id: String) -> String { "needs-row-age-" + id }
    static func needsRowLine(_ id: String) -> String { "needs-row-line-" + id }

    // Settings (Phase 316.6).
    static let settingsScreen = "screen-settings"
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
    /// See a sample, under Unpair this iPhone on a paired phone (Phase 333.3, D13).
    static let settingsSeeSample = "settings-see-sample"
    /// Pair another Mac, above Unpair this iPhone (Phase 345, D15).
    static let settingsPairAnother = "settings-pair-another"

    // Several Macs (Phase 345).
    static let macsScreen = "screen-macs"
    static func macsRow(_ i: Int) -> String { "macs-row-" + String(i) }
    static func macsRowName(_ i: Int) -> String { "macs-row-name-" + String(i) }
    static func macsRowLine(_ i: Int) -> String { "macs-row-line-" + String(i) }
    static func macsRowChosen(_ i: Int) -> String { "macs-row-chosen-" + String(i) }
    static let pairAnotherSheet = "pair-another-sheet"
    static let pairAnotherCancel = "pair-another-cancel"

    // End and End these (Phase 317; End in the top bar since Phase 337).
    static let sessionEnd = "session-end"
    static let sessionEndLine = "session-end-line"
    /// The owner check's glyph on the End row: `faceid`, `touchid` or `lock`
    /// (`lock.open` in the sample with no passcode, Phase 333.3).
    static func sessionEndGlyph(_ glyph: String) -> String { "session-end-glyph-" + glyph }
    static let endConfirming = "end-confirming"
    /// Beside the Terminal's ⋯ while End's write runs (Phase 337.3, D24).
    static let endWriting = "end-writing"
    /// Remove at Catch Me Up's top right, a button (End's `session-end`
    /// place, Phase 348).
    static let sessionRemove = "session-remove"
    /// The progress mark beside the ⋯ or the top-right press while a
    /// Remove's write runs (Phase 348).
    static let removeWriting = "remove-writing"
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
    // About's three pages of Tortie's own site (Phase 333.1).
    static let settingsMacSite = "settings-mac-site"
    static let settingsMacSiteName = "settings-mac-site-name"
    static let settingsPrivacy = "settings-privacy"
    static let settingsSupport = "settings-support"

    // Reply (Phase 318).
    /// An option the Mac offers to press: a button.
    static func sessionChoicePress(_ n: Int) -> String { "session-choice-press-" + String(n) }
    static let sessionReplyLine = "session-reply-line"
    static let sessionCommand = "session-command"
    static let sessionMessageStrip = "session-message-strip"
    static let sessionMessageField = "session-message-field"
    static let sessionMessageSend = "session-message-send"
    static let sessionMessageLine = "session-message-line"

    // The Screen (Phase 337), the Terminal since Phase 337.1.
    static let screen = "screen-screen"
    /// The Terminal's one status line (Phase 337.1, D17).
    static let terminalStatus = "terminal-status"
    /// The Terminal's one ⋯ at the top right, a menu (Phase 337.3, D21).
    static let terminalMenu = "terminal-menu"
    /// Its first item, Catch Me Up (D22).
    static let terminalMenuCatchUp = "terminal-menu-catch-up"
    /// Its second item, End session… (D22).
    static let terminalMenuEnd = "terminal-menu-end"
    /// Remove in the Terminal's ⋯ (End session…'s `terminal-menu-end` place,
    /// Phase 348).
    static let terminalMenuRemove = "terminal-menu-remove"
    static let screenGrid = "screen-grid"
    static let screenLoading = "screen-loading"
    static let screenFailure = "screen-failure"
    static func screenRow(_ n: Int) -> String { "screen-row-" + String(n) }
    /// One row of history, by its index from the oldest line (Phase 337.1).
    static func screenHistoryRow(_ i: Int) -> String { "screen-history-" + String(i) }
    /// Back to the live terminal (Phase 337.1, D27).
    static let screenToLive = "screen-to-live"
    /// The one line where paging back stopped (Phase 337.1).
    static let screenScrollbackLine = "screen-scrollback-line"
    static let screenCursor = "screen-cursor"
    static let screenLine = "screen-line"
    static let screenKeyField = "screen-key-field"
    static let screenKeyBar = "screen-key-bar"
    /// One key of the bar, by its short name (`esc`, `ctrl`, `hide`, …).
    static func screenKey(_ name: String) -> String { "screen-key-" + name }
    /// The edit menu's Copy over a selection (Phase 337.5): a menu item.
    static let screenCopy = "screen-copy"
    /// The long-press menu's Paste command, a menu item (Phase 348).
    static let screenPaste = "screen-paste"
    static let screenCover = "screen-cover"

    // The Sessions tab (Phase 316.7).
    static let listShow = "list-show"
    static let listShowAll = "list-show-all"
    static let listShowActive = "list-show-active"
    static let listShowEnded = "list-show-ended"
    /// The Show control's button for `show`.
    static func showButton(_ show: SessionsShow) -> String {
        switch show {
        case .all: listShowAll
        case .active: listShowActive
        case .ended: listShowEnded
        }
    }
    static let listMenu = "list-menu"
    static func group(_ id: String) -> String { "group-" + id }
    static func groupLabel(_ id: String) -> String { "group-label-" + id }
    static func groupCount(_ id: String) -> String { "group-count-" + id }
    static func groupMachine(_ id: String) -> String { "group-machine-" + id }
    static func groupFolder(_ id: String) -> String { "group-folder-" + id }
    static func groupWaiting(_ id: String) -> String { "group-waiting-" + id }
    static func groupLeftOut(_ id: String) -> String { "group-left-out-" + id }
    static let listNoMatch = "list-no-match"
    static let listClearFilters = "list-clear-filters"
    static let listNoSessions = "list-no-sessions"
    static let listSessionsLeftOut = "list-sessions-left-out"

    // New session (Phase 346).
    static let startOpen = "start-open"
    static let startSheet = "start-sheet"
    static let startProject = "start-project"
    static func startProjectChoice(_ id: String) -> String { "start-project-" + id }
    static func startAgent(_ id: String) -> String { "start-agent-" + id }
    static let startAgentName = "start-agent-name"
    static let startDanger = "start-danger"
    static let startCreate = "start-create"
    static let startLine = "start-line"
    static let startClose = "start-close"

    // The answer drawn as markdown (Phase 316.6).
    /// The now card's scope; a conversation's is the turn's index.
    static let mdLastScope = "last"
    static func md(_ scope: String, _ n: Int) -> String { "md-" + scope + "-" + String(n) }
    static func mdCell(_ scope: String, _ n: Int, row: Int, column: Int) -> String { md(scope, n) + "-r" + String(row) + "c" + String(column) }
    static func mdMark(_ scope: String, _ n: Int) -> String { md(scope, n) + "-mark" }
    static func mdMore(_ scope: String, _ n: Int) -> String { md(scope, n) + "-more" }
    static func mdRest(_ scope: String) -> String { "md-" + scope + "-rest" }

    /// The `Try again` under a screen's failure sentence.
    static func retry(_ failure: String) -> String { failure + "-retry" }
    /// The line under a failure's sentence that names Allow on the Mac
    /// (Phase 333.1, D23).
    static func reachNote(_ id: String) -> String { id + "-note" }
}
