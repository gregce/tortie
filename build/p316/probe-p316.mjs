#!/usr/bin/env node
/**
 * probe:p316 — the Tortie iPhone app, driven in the Simulator against the
 * Mac's door published through a STAND-IN Tailscale (Phase 316.2,
 * build/p316/SPEC.md §4 S2, "Proof"; re-pointed by Phase 330,
 * build/p330/SPEC.md §5.4 and §7.3).
 *
 * WHAT IS REAL IN A RUN
 *   - The Mac: ONE Electron through build/electron-run.mjs's `withElectron`, on
 *     a scratch profile, a scratch HOME and the socket `gmux-p316-<pid>`. The
 *     door (a `utilityProcess` on 127.0.0.1) is switched on, confirmed and
 *     paired through the app's own `pocket:*` channels, pressed through
 *     `window.gmux.pocket` exactly as Settings then Phone presses them, and it
 *     is PUBLISHED through build/p330/tailscale-standin.mjs, named by
 *     `GMUX_TAILSCALE_BIN`: the stand-in's funnel is a loopback forwarder that
 *     writes a PROXY v2 header and pipes to the door, the way tailscaled does.
 *     The PREFLIGHT refuses the launch unless that variable is the stand-in's
 *     wrapper, and the process table is sampled through the run: a real
 *     Tailscale program under the app, or run as a command, FAILS the run.
 *   - The phone: the DEBUG build of `ios/Tortie.xcodeproj`, signed ad hoc with
 *     no team, on Simulators made ONE AT A TIME by build/simulator-run.mjs's
 *     `withSimulator`. It dials `-TortieDebugDoorEndpoint 127.0.0.1:<port>`
 *     (DEBUG only), which keeps the code's public NAME as the TLS server name
 *     and the Host: THE TRANSPORT ARM, on iOS 26.3 and 18.3 alike, is the app
 *     reaching the Mac's door through the stand-in's forwarder with its client
 *     identity on every connection. The endpoint is a relay this probe holds
 *     on 127.0.0.1 that dials the CURRENT forwarder per connection, because a
 *     Remove and a re-confirm restart the Funnel child and its forwarder moves.
 *   - The UI tests, which print what they read (frames and labels, never a
 *     photograph) as `P316|<run>|{…}` lines this probe reads live.
 *
 * WHAT IS SUPPLIED
 *   - The `claude` on the scratch PATH: a /bin/sh script this probe writes. It
 *     prints the COMMITTED Phase 312 dialog fixture for one session and plants
 *     the COMMITTED research 63 transcript for another. NO VENDOR PROCESS RUNS
 *     AND NO TOKEN IS SPENT.
 *   - Method A's reader: build/p316/node-phone.mjs, a phone written in node from
 *     the wire format, paired as a second phone through the same forwarder.
 *   - Method B's door: build/p316/hostile-door.mjs, run as its OWN PROCESS on
 *     loopback (pitfall b), with the HTTP arms Phase 330's hand-written reader
 *     must refuse (SPEC §6.4 (t)).
 *   - NO KEY: a v:3 code carries none. What is scanned for instead is every
 *     window's one-shot secret, which must be in nothing the app wrote on the
 *     device (its container and the device keychain) and nothing under the
 *     Mac's scratch world, and any PEM private key on the Mac's side.
 *   - APPLE (Phase 316.5, build/p3165/SPEC.md §7.4): Phase 314's APNs stand-in,
 *     build/p314/apns-stand-in.mjs, IN THIS PROCESS on 127.0.0.1 (two h2c
 *     listeners, one per environment), seeded with the topic
 *     `com.itavero.tortie.phone`, the scratch public key and each phone's
 *     token and the environment it was minted in. The Mac is handed
 *     `GMUX_HARNESS_ALERTS=<harness>/alerts`, whose `alerts.json` names the
 *     stand-in's two origins and the scratch key file; the PREFLIGHT refuses
 *     the launch unless every origin is `http://127.0.0.1:<port>` and the key
 *     file sits inside the harness directory. THE KEY is a scratch P-256 key
 *     made here, written 0600 as `<harness>/alerts/AuthKey_P3165SCRAT.p8` and
 *     deleted in the `finally` whatever happened, kept world or not. HIS KEY
 *     IS NEVER READ. No request reaches Apple's real hosts: the phone's token
 *     is a DEBUG seam value (`-TortieDebugPushToken`), a Debug build never asks
 *     Apple for one, and a notification reaches the Simulator only through
 *     build/simulator-run.mjs's `handle.push`, with a body the stand-in
 *     recorded or this file composed.
 *
 * THE ORDER
 *   B0  preflight: a build, Xcode, both runtimes, the device type
 *   B1  build-for-testing, the SHIPPING project. It boots nothing.
 *   Electron:
 *   D0  sessions: a shell, a planted conversation, a waiting session
 *   D1  switch on → confirm → published through the stand-in at <name>:8443
 *   D2  the node reader pairs (window 1) through the forwarder, the Mac allows,
 *       and it reads with its client certificate
 *   iOS 26.3 Simulator:
 *   P1  the app is handed window 2's QR through the DEBUG injection; the UI test
 *       prints the fingerprint it DRAWS; this probe compares it with the Mac
 *       sheet's and presses Allow; the app's first SIGNED read is what makes it
 *       paired
 *   L1  the list, its order, ages, foot and the mocks' frames
 *   S1  a working session
 *   T1  its conversation paged to the first turn
 *   R1  Remove on the Mac, re-confirm the door, and the app draws its unpaired line
 *   M1  every signed read the app made presented its client identity (its pin
 *       among the Mac's phones), over TLS 1.3, with the code's name as SNI
 *   K1  the windows' secrets are in nothing the app wrote on the device
 *   iOS 18.3 Simulator (THE FLOOR ARM, MANDATORY: his iPhone runs 18.x):
 *   F1  pairing and the list again, through the forwarder, and K1 again
 *   iOS 26.3 Simulator, the hostile door (Method B):
 *   H*  every arm of build/p316/hostile-door.mjs, the HTTP arms included:
 *       each must end in a drawn sentence (the honest control, the long ask and
 *       the two unknown words end drawn instead) WHERE and WHICH its row says,
 *       the app still running, no half-drawn screen; every signed read with the
 *       client identity and the code's name; the wrong key with 0 requests served
 *   After: the secret scan of the Mac's scratch world, the stand-in's own
 *   reading (no real Tailscale, nothing forbidden, nothing left), the Electron
 *   count and the Simulator count, once each.
 *
 * PHASE 316.5, THE ALERTS (build/p3165/SPEC.md §7.4), woven into that order.
 * Every arm that needs a session to block is graded in TWO STEPS: main must
 * read the block first, and an arm whose block main never read is UNREADABLE
 * (exit 2), never a pass. A tap whose banner XCUITest could not find is
 * UNREADABLE too (SPEC §12 concern 1).
 *   N1  after D1: `pocket.choosePushKey()` through the bridge takes the harness
 *       key file; `pushKeyId` reads P3165SCRAT; the sealed file under the
 *       profile's gmux/push is not the PEM and holds no line of it
 *   D2+ the node reader presents a PRODUCTION token; the sheet's lines at
 *       Allow read `Alerts for "p316 reader" go through Apple (production),
 *       device <8 hex>`
 *   iOS 26.3, the order Simulator, FIRST DRIVE, while the Mac holds the key
 *   and its alert switch is still OFF (research 136, which binds over the
 *   SPEC: alerts are his alone by default, so a phone is asked only when the
 *   Mac it pairs with CAN send, meaning it holds a key AND the switch is on,
 *   and the pairing answer tells the phone which):
 *   N11 it pairs WITHOUT being asked (`asked:false`) although it was handed a
 *       seam token; the Mac holds no `Alerts for` line for it and its row reads
 *       `none`; a relaunch with another token draws no `Pair again to get
 *       alerts.`; and no word of Copy.swift that names alerts is drawn on any
 *       screen of the run
 *   N2  alerts on, and Allow through the sheet's own lines: `phone alerts
 *       armed` in app.log once, and 0 requests at the stand-in, because D0's
 *       waiting session was waiting before alerts armed
 *   iOS 26.3, the order Simulator, SECOND DRIVE, now that the Mac can send,
 *   handed P316_PUSH_TOKEN and P316_NOTIFICATIONS=allow:
 *   N0  the Mac could send when the window opened; iOS asked AFTER the
 *       fingerprint line and before the Mac allowed the phone (research 136
 *       moves the SPEC's "while the Mac still read waiting": the phone learns
 *       that the Mac can send from the Mac's answer to its presentation, so
 *       the Mac may already read `presented`); answered allow; the Mac's lines
 *       AT ALLOW hold the development line for sha256(the seam token); the
 *       phone's row reads alerts `on`. This file presses Allow only after the
 *       phone has said how the question was answered, or that none came,
 *       because a person answers iOS before they reach for the Mac
 *   N3  a new `ask` session blocks: one request at the development origin for
 *       the app's token, one at the production origin for the reader's, both
 *       200, the single shape, the JWT verifying under the scratch public key,
 *       `apns-topic` the phone's bundle id, and the body byte for byte this
 *       file's own composition from the reader's `/v1/blocked` rows
 *   N4  `alert`: N3's recorded body delivered; the tap opens that session.
 *       N3 is done INSIDE this step: its session is made when the UI test
 *       says it is ready for the alert, so the block cannot disturb L1's list
 *       reads, and the UI test waits its step's P316_WAIT_S (150 s) for the
 *       banner while main reads the block and the engine sends
 *   N5  `alert-cold`: the app terminated, then N3's body: the tap cold-
 *       launches it onto that session. It runs BEFORE N6 because N6 removes
 *       that session. A launch by iOS carries no XCUITest argument, so the
 *       DEBUG app carries its endpoint, stillness and token seams over from
 *       the launch before (ios/Tortie/App/DebugLaunch.swift); a cold launch
 *       that could not reach the door reads as a session failure, by name
 *   N6  `back` to the list, then `alert-gone`: that session ended and
 *       removed on the Mac, the door answering 404 for it, then this file's
 *       own composition of the same alert, TAPPED FROM THE LIST: the list,
 *       with the Mac's own `Tortie no longer has a record of that session.`
 *       Until the 316.5 fix round N6 was tapped over the very session it
 *       names (N5 leaves it on screen), which changed nothing on screen and
 *       so passed while every tap from anywhere else drew no sentence; the
 *       grader now reads the dump before the ready line and a tap that was not
 *       arranged from the list is UNREADABLE
 *   N6b `visit:<talk>` then `alert-gone` again: the same alert tapped from
 *       ANOTHER session's screen: the list, with the Mac's sentence
 *   N7  `alert-list` twice: a count body, then a single body naming `../x`:
 *       the list each time, no notice
 *   N8  `relaunch-token:<another>` then `relaunch-token:<the paired one>`:
 *       `Pair again to get alerts.` the first time, absent the second
 *   N9  after R1: alerts off, and a new `ask` session blocks: `phone alerts
 *       disarmed` once, 0 requests in 15 s. R1's Remove moves the door's hash,
 *       so alerts disarm and re-arm around its re-confirm; N9 reads the
 *       disarm lines it GAINED and is UNREADABLE unless alerts were armed when
 *       it began. THEN ALERTS GO BACK ON and are confirmed, and the armed line
 *       it gains is read, because the floor and the denied phone must each be
 *       ASKED, and a phone is asked only when the Mac can send (research 136)
 *   F1+ iOS 18.3, after F1: the Mac could send, the floor phone was asked and
 *       allowed, and `alert` with a single body naming a live session,
 *       composed here: the tap opens it on the floor
 *   ND  a new iOS 26.3 Simulator, P316_NOTIFICATIONS=deny (arm `deny`): the
 *       Mac could send, so it was asked; denied, it pairs with no `Alerts for`
 *       line for it although it was handed a seam token, its row reads
 *       `none`, the list, a session and its conversation are drawn, and a
 *       delivered body shows no banner in 20 s
 *   N10 after the app is gone: app.log holds no token, no JWT, no PEM line
 *       and no alert body
 * The arms are reported in the SPEC's order: N3 is graded during N4's step
 * and written to the report with the order Simulator's other arms.
 *
 * PHASE 316.6, THE TABS, SETTINGS AND THE RENDERED ANSWER (build/p3166/SPEC.md
 * §7.4), woven into that order. A third planted session, `p316-md`: the
 * stand-in's mode `md` plants the committed research 63 transcript (its id in
 * P316_MD_SID) and this file appends one turn per
 * ios/TortieTests/Fixtures/markdown/fixtures.json fixture marked `probe`, the
 * ask `p3166 md <name>`, `{{MD3}}` filled with the port of a loopback listener
 * this file holds (MD3), which counts every connection and must count none.
 * The relay counts the app's connections too (U1).
 *   T2a to T2d  order and floor: pairing lands on Needs input; the badge is
 *       `/v1/blocked`'s waiting count, read by the node reader just before and
 *       after (from the button's value, else a number-only label inside it;
 *       none on iOS 26's glass bar is UNREADABLE); a session opened in
 *       Sessions is still on top after Needs input and back; at the end of a
 *       pushed session its last element ends at or above the tab bar
 *   MARKDOWN OFF (his ruling of 2026-10-02, "Ship tabs + Settings, markdown
 *   off"; build/p3166/SPEC.md "As built, markdown off"): MarkdownCaps.pieces
 *   is 0, so the phone draws EVERY answer as written, exactly as the parent:
 *   MD1 order and floor: every planted turn is ONE element, md-<turn>-0, and
 *       no block, cell, mark or note; table-at-caps holds every word of its
 *       51 rows, honest-wide its ten columns, `-` and `+` lines, long cell and
 *       long line whole, loop-quote-comment what follows it; no `**` pair
 *   MD2 order: no link can be pressed, as in the parent: no link element in
 *       any planted answer, none of refused-schemes' words a link, the lying
 *       link and the long link drawn as their words and the lying link's
 *       address drawn nowhere. The drive taps no link: there is none
 *   MD3 the whole run: the listener counted 0 connections
 *   S6  order (Allowed), floor (Allowed), deny (Off), N11 (no Alerts card):
 *       the Mac's name and address, the fingerprint the Mac's row and
 *       Pairing's, the version the project builds
 *   U1  floor, after F1+: Cancel changes no label; Unpair draws Pairing; the
 *       relay counts no connection in the 20 s after; a relaunch with no
 *       forget seam draws Pairing; the Mac still lists the phone; a second
 *       drive pairs again onto Needs input
 *   HM  hostile: `md-hostile` and `md-huge` end drawn, alive, MD3 still 0;
 *       every turn from the oldest the drive reached to the newest drew (its
 *       md-<turn>-0, drawn as written while markdown is off), and the older
 *       ones it never reached are UNREADABLE
 *   PR  with P316_PARENT_IOS: the parent's own app and UI test over the same
 *       planted turns; no tab, a table as pipes, no pressable link (read from
 *       its own AnswerText.swift), no word it drew that HEAD loses, except
 *       a fence's info string and a task box's `x` (the fix round took away
 *       the excuse for words past a table's caps: none is lost now), and,
 *       markdown off, each planted answer HEAD draws EQUAL to the parent's,
 *       character for character
 *
 * THE LINE PROTOCOL the Swift tests speak, which this file is the reader of.
 * Every line is `P316|<run>|<one JSON object>` on the test runner's stdout,
 * written unbuffered, AND appended to the file `P316_LINES` names, because
 * whether xcodebuild relays a runner's output as it happens is unmeasured.
 * Every object carries `seq`, and a line is read once from whichever channel
 * brought it first. The environment arrives through xcodebuild's `TEST_RUNNER_`
 * prefix, so the test reads `P316_*`.
 *
 *   TortieUITests / P316DriveUITests / testDrive     (XCTSkip when P316_RUN is unset)
 *     P316_RUN, P316_LINES, P316_PAYLOAD (the QR text), P316_STEPS (comma
 *     separated), P316_WAIT_S (seconds per wait). It launches the app with
 *     `-TortieDebugForgetPairing -TortieDebugStill -TortieDebugPairingPayload
 *     <payload>` (the last two DEBUG only: the attention dot held still so
 *     XCUITest can see the app idle, and the code the camera would read). A
 *     step that cannot find its screen dumps "<step>-missing" and the steps
 *     after it are not run. The steps:
 *       pair            wait for `pairing-fingerprint`, print
 *                       {"step":"fingerprint","text":<its label>} (or
 *                       "text":null when it never appears), then wait for
 *                       `screen-list` or `pairing-again` (a pairing that
 *                       stopped), and dump the screen as "pair-end"
 *       list            wait for `screen-list` to settle, print
 *                       {"step":"list-before"}, pull to refresh 2 s later,
 *                       dump "list" 3 s after that (the probe reads the door on
 *                       both lines, so the two reads bracket the app's)
 *       open:<id>       tap `row-<id>`, wait for `screen-session`, dump "session"
 *       conversation    tap `session-open-conversation`, wait, dump "conversation"
 *       first           scroll toward the oldest turn until `conversation-older`
 *                       is gone and three swipes add nothing (or a
 *                       `conversation-failure` or `conversation-older-line`
 *                       appears), then print
 *                       {"step":"turns","indexes":[…],"asks":{i:label},
 *                       "answers":{i:label},"absences":{i:label}} over every
 *                       `turn-<i>` seen on the way, and dump "conversation-top"
 *       unpaired        print {"step":"ready-for-remove"}, then every 2 s:
 *                       back to the list, and pull it to refresh (or press
 *                       `list-failure-retry`), until `screen-pairing` is
 *                       drawn, and dump "unpaired"
 *       sentence        wait for a sentence drawn in place of a screen (a
 *                       `*-failure`, `pairing-line` or
 *                       `conversation-older-line` with words), and dump
 *                       "sentence": the hostile list arms, whose body arrives on
 *                       the list's refresh, some only after the client's 15 s
 *     and ends with {"step":"alive","state":<XCUIApplication.State raw>} and
 *     {"step":"done"}. A dump is {"step":"screen","name":…,"window":[w,h],
 *     "elements":[{"id","label","frame":[x,y,w,h]}]} over every element with
 *     an accessibility identifier (ios/Tortie/Screens/Identifiers.swift).
 *   Every UI test run is also handed P330_DOOR_ENDPOINT (`127.0.0.1:<port>`),
 *   which the test passes to the app as `-TortieDebugDoorEndpoint` (Phase 330).
 *   A run whose test prints no P316 line is UNREADABLE (exit 2), never a pass.
 *
 *   PHASE 316.5 adds two inputs and six steps (build/p3165/SPEC.md §7.4,
 *   pinned; P316DriveUITests.swift is their writer):
 *     P316_PUSH_TOKEN      hex; every launch passes `-TortieDebugPushToken
 *                          <hex>` when it is set (DEBUG only: the app's
 *                          address, never Apple's answer)
 *     P316_NOTIFICATIONS   `allow` (the default) or `deny`
 *     pair, after the fingerprint, waits up to 10 s for springboard's
 *       notification question. When it appears it prints
 *       {"step":"notifications","asked":true,"title":…,"buttons":[…]}, presses
 *       by label (`Allow`, or `Don’t Allow` / `Don't Allow`) and prints
 *       {"step":"notifications","answered":"allow"|"deny"}; when none appears
 *       it prints {"step":"notifications","asked":false}. Since research 136
 *       the question comes only when the Mac can send, which the phone learns
 *       from the Mac's answer to its presentation, so the 10 s run from the
 *       fingerprint across that first answer; a Mac that cannot send is
 *       answered `asked:false` (N11).
 *     alert             press Home, print {"step":"ready-for-alert"}, wait for
 *                       a banner from Tortie in springboard, print
 *                       {"step":"banner","label":…} (null when none came), tap
 *                       it, wait for `screen-session` or `screen-list`, dump
 *                       "alert"
 *     alert-cold        the same after `app.terminate()`, the ready line
 *                       carrying "cold":true; the app must reach running-
 *                       foreground from the tap
 *     alert-gone, alert-list    as `alert`, dumping under their own names
 *     back              the navigation bar's back button until the list is on
 *                       top, dump "back" (the 316.5 fix round: where N6 taps)
 *     visit:<id>        as `open:<id>`, dumping "visit" (where N6b taps)
 *     relaunch-token:<hex>      terminate, relaunch WITHOUT
 *                       `-TortieDebugForgetPairing` and with that token, dump
 *                       "relaunch" once the list settles
 *     no-banner:<s>     press Home, print {"step":"ready-for-alert"}, wait that
 *                       long, and print {"step":"banner","label":null} when
 *                       none came
 *   PHASE 316.6 adds ten steps (build/p3166/SPEC.md §7.4; `pair` now ends at
 *   `screen-needs-input`, `list` selects the Sessions tab first, `open:`
 *   returns the Sessions tab to its list first, every alert step accepts
 *   `screen-needs-input`, and every dump carries `composed`, each `md-` scope's
 *   answer composed from its labels in pre-order):
 *     tab:<needs|sessions|settings>  {"step":"tab-before"}, the tab's button
 *                       tapped by its label, its screen waited for, a dump
 *                       `tab-<name>`, then {"step":"badge","label","value",
 *                       "found"} read from the Needs input button
 *     bar               the top screen scrolled to its end, then
 *                       {"step":"bar","screen","via","frame"} and a dump `bar`
 *     markdown          on a conversation, newest to oldest:
 *                       {"step":"markdown","elements":[{id,label,frame}],
 *                       "links":[{label,turn,md,frame}]}, then a dump
 *     link:<words>      that link tapped, then {"step":"link","label","found",
 *                       "alert":{"title","texts","buttons"}} (no drive asks
 *                       for it while markdown is off: no answer holds a link)
 *     link-cancel       Cancel pressed: {"step":"link-cancel","state"}
 *     link-open         Open pressed, up to 10 s for Safari:
 *                       {"step":"link-open","safari","forward","tortie"}, then
 *                       Safari ended and Tortie brought back
 *     settings          the Settings tab, and a dump `settings`
 *     unpair-cancel, unpair     the question: {"step":"unpair-sheet","for",
 *                       "via","title","texts","buttons"}, the press, a dump
 *     relaunch-keep     relaunched with the carried seams, NO forget seam and
 *                       no code, and a dump `relaunch-keep`
 *     idle:<s>          {"step":"idle-start"}, nothing for <s> seconds,
 *                       {"step":"idle-end"} (U1's 20 s)
 *
 *   THIS FILE delivers ONE queued body for each `ready-for-alert` it reads, in
 *   order, through `handle.push`, and reads each tap from the `banner` line and
 *   the first dump after that ready line, and where the tap was made from from
 *   the last dump BEFORE it. It never matches a tap to a body by
 *   anything the phone chose. A `ready-for-alert` with nothing queued, and a
 *   queued body with no `ready-for-alert`, are both reported by name.
 *
 * PHASE 317, THE `end` GROUP (build/p317/SPEC.md §7.5, `P316_ARMS=end`):
 * End from the phone behind Face ID and End these (the fix round took Unpair's
 * Mac half out of the phase, and E8, E9 and E10's unpair half with it). Face
 * ID is enrolled and answered FROM THE HOST through build/simulator-run.mjs's
 * `handle.biometry('enrol' | 'unenrol' | 'match' | 'nomatch')`, never by a
 * seam in the app (SPEC D21). The UI test prints `end-auth-up` once iOS's
 * owner check is up (after accepting iOS's first-use Face ID question through
 * SpringBoard: the question found BY ITS OWN LABEL, its allowing press read by
 * label, and THAT alert, found again by its label, waited for up to 5 s to
 * leave; the tests round, after `alerts.firstMatch` re-resolved onto the Face
 * ID prompt that follows on iOS 18.3 and the floor's End sent no match), this
 * file answers it and writes the file `auth-<seq>` into `P316_ACKS`, and the
 * step goes on only then. Likewise `ready-for-unenrol` (E3). A step whose
 * prompt never comes up is UNREADABLE, never a pass, and AN UNMET PREMISE IS
 * UNREADABLE, NEVER A FAIL (the tests round): what follows a match is not read
 * when no match was given; what is wrong whatever iOS did still fails. THE RELAY HOLDS E5's and
 * E7's writes (the fix round): before Face ID is answered for those two steps
 * it lets 0 (E5) or 1 (E7, row one's) connection through and HOLDS every one
 * after, taken and never dialled onward, so its TLS handshake never completes
 * and the write's bytes are never handed; Home is pressed with the write held,
 * and three seconds after the UI test says so the relay forwards again. That
 * is the withheld path measured live (no POST, `Not run`, the not-taken
 * line), where the verify's run had every write land before Home took effect.
 * The steps (P316DriveUITests.swift is their writer): `end` (the bar read: its
 * frame, the tab bar's, the glyph read off the bar, what the owner check
 * answered as it drew it, and whether the row can be pressed; the Mac's
 * confirmation read and pressed;
 * iOS's question; `end-auth-up`; the screen read again), `end-cancel` (Cancel
 * on iOS's prompt after a failed match), `end-off:<id>` (Face ID unenrolled,
 * then the session opened and its bar read), `select:<a>+<b>+<c>`,
 * `end-these`, `end-these-home:<first>` (Home at once when the first target
 * reads Ended), `batch-done`, `end-home`, `end-kill:<id>` (the app ended at
 * once and launched again) and `end-read` (an End that cannot be pressed).
 * The arms:
 *   E1  enrol; a running shell's End bar between the content and the tab bar,
 *       Face ID's mark; the dialog the door's own `endConfirm`; iOS's
 *       first-use question accepted; match: one `done` line, tmux's session
 *       gone, the screen reads what the door says and the bar goes
 *   E2  nomatch, then the owner check ends: Cancel pressed BY ITS LABEL and
 *       waited on until it leaves, or iOS ending its own prompt (which the End
 *       line being drawn shows), what iOS drew after the failed match printed
 *       either way: `Not confirmed. Nothing was changed.`, no write line, the
 *       session still runs
 *   E3  unenrol: what iOS answered is drawn (off with the passcode line for
 *       passcodeNotSet, or on with the lock, which the fix round's `kind()`
 *       draws for a biometry iOS will not ask for), never Face ID's mark
 *   E4  three selected, two running and one ended: the Mac sheet's title, its
 *       body first, the two names, the skipped line (read as one text, since
 *       XCUITest hands the message's newlines back as spaces); two `Ended`,
 *       the ended row no target and no word; `2 of 2 sessions ended`; two acts
 *   E5  match with the write HELD at the relay, then Home at once, 10 s away:
 *       withheld, so the not-taken line, no act, the session still there and
 *       equal to tmux; no write line in 20 s more; UNREADABLE if the relay
 *       held nothing
 *   E6  match then the app ended at once and launched again: at most one act,
 *       the screen equals tmux, done, no answer or not taken each only when
 *       honest, and which is printed
 *   E7  a batch of three, row one let through and row two HELD at the relay,
 *       Home after the first `Ended`: rows two and three `Not run` with no
 *       act and still running, nothing after the return; UNREADABLE when all
 *       three acted before Home took effect (the verify's 114 ms run). THE
 *       ROWS ARE IN THE ORDER THE PHONE DRAWS THEM (the tests round): the batch
 *       runs in drawn order, and the door draws `others` newest output first
 *       (src/main/pocket/routes.ts `othersOrder`), so row one is the last made.
 *       The order is read from `/v1/blocked` before the drive, Home waits on
 *       its first row, the rows are graded in it, and the order the
 *       confirmation names must agree, or the arm is UNREADABLE
 *   E10 iOS 18.3, the floor: E1
 *   EH  every write arm of build/p316/hostile-door.mjs, each ending in its
 *       drawn line, on the list, or on Pairing, after exactly the POSTs its
 *       row counts. The write arms run HERE and never in the hostile group's
 *       loop, which grades a read
 *   EP  with P317_PARENT_IOS (551312f7's ios/; never P316_PARENT_IOS, which
 *       PR reads at 28d89295): the parent's app draws no End bar and no
 *       Select, and its Unpair, seen to run, leaves the Mac's row, which
 *       HEAD's U1 now reads too
 *
 * PHASE 332: THE NAME CHECK, AGAINST A LOOPBACK DNS STAND-IN. A published door
 * now asks the `ts.net` zone's own servers whether its public name answers
 * before a code may show. The Mac is handed `GMUX_POCKET_NAME_SERVERS`, naming
 * build/p332/dns-standin.mjs IN THIS PROCESS on 127.0.0.1, answering the
 * Tailscale stand-in's made-up name, so no question reaches real DNS; the
 * preflight refuses unless that value names 127.0.0.1 alone and the stand-in
 * answers. Every window waits for main's `pairable` (`confirmListening`), and
 * Q1 grades every question the Mac asked: an `A` question, RD 0, for that
 * name (Phase 332 called it N1; Phase 316.5 renamed it, because SPEC §7.4
 * gives N1 to the push key). Before the launch the profile's agents.json renames the Gemini, Qwen,
 * Antigravity, Grok and Droid binaries and `agents:list` is read back, so no
 * agent's `--version` ever runs.
 *
 * WHAT IT REFUSES TO DO. It never binds a real interface and dials nothing but
 * 127.0.0.1 (the code's host is a public NAME nobody resolves here), never runs
 * a `tailscale` command, never signs into anything and touches no keychain of
 * the person's. It never reads his APNs key or any `.p8` of his, and nothing
 * it starts can reach Apple: the Mac's alerts go to the stand-in named in
 * alerts.json, and without that file a harness launch refuses Apple's hosts
 * before any socket. It signals nothing it did not start. It takes NO
 * screenshot and no screen recording. Its report holds no key, no signature,
 * no device token, no alert body and no conversation line, only lengths,
 * counts and digests. `npm run shot` is not called. It spends NO model turn.
 *
 * VERIFIERS ONLY: it starts an Electron and boots Simulators, so take the
 * orchestrator's lock first. It ran for about 17 minutes before Phase 316.5,
 * which adds a fourth Simulator, a second drive on the first (N11) and a few
 * minutes of alerts (budget 20 to 25 minutes, unmeasured until a verifier runs
 * it), and
 * build/electron-run.mjs's guard over the person's own `-L gmux` server
 * compares that server's sessions before and after: a session HE creates or
 * ends while it runs reads as this run's, and the run ends in that guard's
 * error although nothing here touched `-L gmux`. Run it while he is not
 * creating or ending sessions. It carries no `npm run build &&`; it refuses
 * (exit 2) when the checkout has no build.
 *
 *   npm run -s probe:p316
 *   P316_ARMS=order,floor,deny,hostile,end    which arms (default all; `order` holds N11 and N0 to N8; `end` is Phase 317's)
 *   P316_HOSTILE=honest,wrong-key         which hostile arms (default all)
 *   P316_DERIVED_DATA=<dir>               derived data (never the repo, never home; kept)
 *   P316_KEEP=1                           keep the scratch world, and write
 *                                         <run>/rederive/records.json (0600): the
 *                                         reader's /v1/blocked rows at N3's block,
 *                                         every stand-in record, every body
 *                                         delivered, the scratch PUBLIC key and
 *                                         each phone's token, for the verifier's
 *                                         own re-derivation. The private key is
 *                                         deleted whatever this says.
 *   P316_PARENT_CHECKOUT=<dir>            the parent reading: whether it has ios/
 *   P316_PARENT_IOS=<dir>                 Phase 316.6's PR arm: the directory holding the
 *                                         parent's ios/ (`git archive 28d89295 ios | tar -x`
 *                                         into scratch), built and driven by its own UI test
 *   P317_PARENT_IOS=<dir>                 Phase 317's EP arm: the directory holding 551312f7's
 *                                         ios/ (`git archive 551312f7 ios | tar -x` into scratch)
 *   P316_KEEP=1 also writes <run>/md1.json (the order Simulator's markdown line) and
 *                                         <run>/rederive/md-answers.json (the door's own
 *                                         answer text for every p316-md turn), 0600
 *   node build/p316/probe-p316.mjs --grader-self-test   every grader on its own fixtures; launches nothing
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ.
 */

import { spawn, spawnSync } from 'node:child_process';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import {
  appendFileSync,
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { readFile as readFileAsync } from 'node:fs/promises';
import { connect as netConnect, createServer as createNetServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wsConnect, cdpEval } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import {
  RUNTIME_CURRENT,
  RUNTIME_FLOOR,
  countDevicesNamed,
  pushPayloadRefusal,
  simulatorHarnessMissing,
  withSimulator,
  xcodebuildRun
} from '../simulator-run.mjs';
import { startApnsStandIn } from '../p314/apns-stand-in.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, loopbackOnlyServers, makeDnsStandin, nameQuestionsSelfTest, nameQuestionsVerdict, quietAgentsHeld, writeQuietAgents } from '../p332/dns-standin.mjs';
import { HOSTILE_ARMS, HOSTILE_NAME, HOSTILE_PUBLIC_PORT, UNKNOWN_STATUS_TITLE, hostileDoorArgv, markdownFixtures } from './hostile-door.mjs';
import { fingerprintDigits, makePhone, pageBack, pairThrough, readOffer, shaHex, signedGet } from './node-phone.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p316]';
const say = (line) => console.log(`${TAG} ${line}`);
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const J = JSON.stringify;

// ---------------------------------------------------------------------------
// The parent reading, which is only whether ios/ exists
// ---------------------------------------------------------------------------

const PARENT = (process.env['P316_PARENT_CHECKOUT'] ?? '').trim();
if (PARENT !== '') {
  const has = existsSync(join(resolve(PARENT), 'ios'));
  say(`the parent reading: ${resolve(PARENT)} ${has ? 'HAS' : 'has no'} ios/ directory; 0 write routes are used by a phone that does not exist`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// B0: the preflight, synchronous, before anything is started or served
// ---------------------------------------------------------------------------

const PROJECT = join(ROOT, 'ios', 'Tortie.xcodeproj');
// `deny` is Phase 316.5's (SPEC §7.4 ND): a fourth Simulator, notifications denied.
const ARMS = new Set(((process.env['P316_ARMS'] ?? '').trim() || 'order,floor,deny,hostile,end').split(',').map((s) => s.trim()));
if (ARMS.has('ats')) {
  // The ATS arm left with TailscaleKit (Phase 330): the phone has no tailnet
  // and no ATS exception, so there is nothing for it to prove.
  console.error(`${TAG} the ats arm was retired in Phase 330; the transport is the order and floor arms, through the stand-in's forwarder.`);
  ARMS.delete('ats');
}
// Phase 317: the end group's E10 is the floor's too.
const runtimes = ARMS.has('floor') || ARMS.has('end') ? [RUNTIME_CURRENT, RUNTIME_FLOOR] : [RUNTIME_CURRENT];

/** B0, asked once, synchronously, before anything is started or served. */
function preflight() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) {
    console.error(`${TAG} this checkout has no build at out/main/index.js. Run npm run build first.`);
    process.exit(2);
  }
  if (!existsSync(PROJECT)) {
    console.error(`${TAG} there is no ${relative(ROOT, PROJECT)}, so there is no app to drive.`);
    process.exit(2);
  }
  const missing = simulatorHarnessMissing({ runtimes });
  if (missing !== null) {
    console.error(`${TAG} ${missing}`);
    process.exit(2);
  }
}

const SCHEME = 'Tortie';
const BUNDLE_ID = 'com.itavero.tortie.phone';
const UI_TEST = 'TortieUITests/P316DriveUITests/testDrive';
const RUN = `/private/tmp/p316-probe-${String(process.pid)}`;
const HOME = join(RUN, 'home');
const HARNESS = join(RUN, 'harness');
const PROFILE = join(HARNESS, 'profile');
const WORK = join(RUN, 'project');
const BIN = join(HOME, '.local', 'bin');
const XCODE = join(RUN, 'xcode');
const DD = resolve((process.env['P316_DERIVED_DATA'] ?? '').trim() || join(XCODE, 'dd'));
/** OUTSIDE the profile, so the helper's profile sweep never takes the stand-in's children for the app's. */
const STANDIN_DIR = join(RUN, 'standin');
const PUBLIC_NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
const SOCKET = `gmux-p316-${String(process.pid)}`;
const KEEP = (process.env['P316_KEEP'] ?? '') === '1';
const NEXT = join(RUN, 'fake-next');
const STOP = join(RUN, 'fake-stop');
const TALK_SID = join(RUN, 'talk-sid');
const DIALOG = join(ROOT, 'src/main/activity/__tests__/fixtures/claude-permission-prompt.txt');
const STORE_SRC = join(ROOT, 'docs/research/assets/63-fixtures/claude-session.jsonl');
const FIXTURE_SID = '11111111-2222-4333-8444-555555555555';
const FIXTURE_CWD = '/Users/dev/demo-app';
const N = { shell: 'p316-shell', talk: 'p316-talk', ask: 'p316-ask', alert: 'p316-alert', quiet: 'p316-quiet', md: 'p316-md' };
/** Phase 316.6: where the stand-in writes the markdown session's id (P316_MD_SID). */
const MD_SID = join(RUN, 'md-sid');
/**
 * Phase 316.6's parent arm (PR, SPEC §7.6): the directory holding the
 * parent's `ios/`, made by `git archive 28d89295 ios | tar -x` into scratch.
 * NOT `P316_PARENT_CHECKOUT`, which keeps its meaning (whether ios/ exists).
 */
const PARENT_IOS = (process.env['P316_PARENT_IOS'] ?? '').trim();
/**
 * EP's parent, Phase 317's own (the fix round): the directory holding
 * 551312f7's ios/. Never P316_PARENT_IOS, which PR reads at 28d89295, because
 * one variable for two parents graded one of them against the wrong one.
 */
const PARENT_IOS_317 = (process.env['P317_PARENT_IOS'] ?? '').trim();

// ---------------------------------------------------------------------------
// Phase 316.5: the alerts' scratch world (build/p3165/SPEC.md §7.4)
// ---------------------------------------------------------------------------

/** Ten capitals or digits, the shape of Apple's own key file name. A scratch key's, never his. */
const KEY_ID = 'P3165SCRAT';
/** Inside the harness directory, which the Mac's override requires of its key file. */
const ALERTS_DIR = join(HARNESS, 'alerts');
const KEY_FILE = join(ALERTS_DIR, `AuthKey_${KEY_ID}.p8`);
const ALERTS_JSON = join(ALERTS_DIR, 'alerts.json');
/** Where the Mac seals the provider key it keeps: `apnsKeyDir()`, `<userData>/gmux/push`. */
const SEALED_KEY_DIR = join(PROFILE, 'gmux', 'push');
/** The phone app's bundle id is the topic an alert is sent under. */
const TOPIC = BUNDLE_ID;
/**
 * Every device token this run hands out, 64 lowercase hex each, and the
 * environment each was minted in. `other` is only ever a relaunch's (N8,
 * N11), `deny` is handed to a phone that denies notifications (ND) and
 * `nosend` to a phone pairing with a Mac that cannot send (N11): none of them
 * may reach the Mac, so none is seeded at the stand-in.
 */
const TOKENS = Object.freeze({
  reader: randomBytes(32).toString('hex'),
  app: randomBytes(32).toString('hex'),
  other: randomBytes(32).toString('hex'),
  floor: randomBytes(32).toString('hex'),
  deny: randomBytes(32).toString('hex'),
  nosend: randomBytes(32).toString('hex')
});
const SEEDED = Object.freeze({ [TOKENS.reader]: 'production', [TOKENS.app]: 'development', [TOKENS.floor]: 'development' });
/** Which phone a token is, for the report, which never carries a token. */
const tokenName = (token) => Object.entries(TOKENS).find(([, t]) => t === token)?.[0] ?? (token === null ? 'none' : 'unknown');
/** The Mac's short digest of a token, as its `Alerts for …` line draws it (pairing.ts, pushTokenDigest). */
const deviceDigest = (token) => shaHex(String(token).toLowerCase()).slice(0, 8);
/** The engine's first send waits COALESCE_MS; a quiet this long says nothing was sent. */
const QUIET_AFTER_ARM_MS = 10_000;
/** N9's window, the SPEC's 15 s. */
const QUIET_AFTER_OFF_MS = 15_000;
/** N7's hostile tap: a session id no door could hold, which must open the list. */
const HOSTILE_TAP_SESSION = '../x';
/**
 * How long a pairing's Allow waits for the phone's word on iOS's question
 * (answered, or `asked:false` after its own 10 s), from the fingerprint line.
 * A person answers iOS before reaching for the Mac, and an Allow pressed
 * before the phone presents its address pairs a phone the Mac cannot alert.
 */
const NOTIFICATIONS_SETTLE_MS = 30_000;
/** How long, after an `allow`, the Allow waits for the Mac's lines to name the phone's address. */
const ADDRESS_LINE_WAIT_MS = 20_000;

/** Every window's one-shot secret this run opened. The report never holds them. */
const SECRETS = [];
const unsecret = (text) => SECRETS.reduce((t, secret) => t.split(secret).join('<a one-shot secret>'), String(text));

// What the mocks' CSS says a frame must be, read from the approved mock itself.
const MAIN_HTML = readFileSync(join(ROOT, 'docs', 'design', 'phone', 'Main.html'), 'utf8');
const cssRule = (selector) => new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`).exec(MAIN_HTML)?.[1] ?? '';
const px = (text, prop) => {
  // `padding: 0 16px` writes its zero with no unit, so the unit is optional.
  const m = new RegExp(`${prop}\\s*:\\s*([0-9.]+)(?:px)?(?:\\s+([0-9.]+)(?:px)?)?`).exec(text);
  return m === null ? null : [Number(m[1]), m[2] === undefined ? Number(m[1]) : Number(m[2])];
};
/** A text run's CSS line box in the mock, found by its font size (`font-size: 17px; line-height: 22px`). */
const lineBoxOf = (size) => {
  const m = new RegExp(`font-size:\\s*${String(size)}px;\\s*line-height:\\s*([0-9.]+)px`).exec(MAIN_HTML);
  return m === null ? null : Number(m[1]);
};
const FRAMES = {
  headerHeight: px(cssRule('.hdr'), 'height')?.[0] ?? null,
  gutter: px(cssRule('.hdr'), 'padding')?.[1] ?? null,
  rowPadding: px(cssRule('.row'), 'padding'),
  // Grading a row by its LINE BOXES and its HEIGHT, never by glyph boxes
  // (Phase 316.2's fix round). XCUITest reports a Text by the glyphs it drew
  // (a 15 pt line reads 18 tall inside its 20 pt box) and a section header's
  // container by the union of its children (the header read 15.67 tall, the
  // text's own box), so the first grader measured those against the CSS box and
  // failed a list that matched Main.html. These are the numbers the CSS box
  // model is made of, read from the mock: the row's `gap`, the hairline under
  // every row and header, and the two lines' `line-height`.
  rowGap: px(cssRule('.row'), 'gap')?.[0] ?? null,
  hairline: Number(/border-bottom:\s*([0-9.]+)px/.exec(cssRule('.row'))?.[1] ?? Number.NaN) || null,
  nameLine: lineBoxOf(17),
  secondLine: lineBoxOf(15)
};
// The phone's own words, from Copy.swift, for the lines main does not send.
const COPY_SWIFT = (() => {
  try {
    return readFileSync(join(ROOT, 'ios', 'Tortie', 'Style', 'Copy.swift'), 'utf8');
  } catch {
    return '';
  }
})();
const copyOf = (name) => {
  const m = new RegExp(`static let ${name}\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(COPY_SWIFT);
  return m === null ? null : m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
};
/** Every `static let` word in Copy.swift, by name, so a drawn sentence can be named. */
const COPY_WORDS = Object.fromEntries(
  [...COPY_SWIFT.matchAll(/static let ([A-Za-z0-9]+)\s*=\s*"/g)].map((m) => [m[1], copyOf(m[1])]).filter(([, text]) => text !== null)
);
const COPY = {
  needsLead: copyOf('needsYourInputLead'),
  othersLead: copyOf('everythingElseLead'),
  close: copyOf('countClose'),
  notPaired: copyOf('notPaired'),
  terminal: copyOf('terminalStaysOnMac'),
  readLead: copyOf('readLead')
};

/**
 * A word the MAC spells, read from its own TypeScript source (Phase 316.5), so
 * the phone's copy of it is judged by the Mac's and never by itself.
 */
const macWord = (file, name) => {
  try {
    const m = new RegExp(`export const ${name}\\s*=\\s*'((?:[^'\\\\]|\\\\.)*)'`).exec(readFileSync(join(ROOT, file), 'utf8'));
    return m === null ? null : m[1];
  } catch {
    return null;
  }
};
const MAC = {
  /** The Mac's sentence for exactly an unknown session (SPEC §5.6.4). */
  noSuchSession: macWord('src/renderer/app/reach-copy.ts', 'NO_SUCH_SESSION'),
  /** The count alert's title word (src/main/tray/attention.ts), for this file's own composer. */
  needsYourInput: macWord('src/main/tray/attention.ts', 'NEEDS_YOUR_INPUT')
};
/** Pinned by build/p3165/SPEC.md §5.6.5. Copy.swift's `pairAgainForAlerts` must say exactly it. */
const PAIR_AGAIN = 'Pair again to get alerts.';
/**
 * Every phone word that names alerts (research 136: a phone paired to a Mac
 * that cannot send draws none of them): Copy.swift's words that say "alert",
 * and the pinned line whether Copy.swift has it or not.
 */
const ALERT_WORDS = [...new Set([PAIR_AGAIN, ...Object.values(COPY_WORDS).filter((text) => /alert/i.test(text))])];

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

const report = {
  runtimes,
  arms: [],
  readings: { frames: FRAMES },
  copyFound: {
    ...Object.fromEntries(Object.entries(COPY).map(([k, v]) => [k, v !== null])),
    // Phase 316.5: the phone's two new words, each equal to the one it names.
    pairAgainForAlerts: copyOf('pairAgainForAlerts') === PAIR_AGAIN,
    noSuchSession: MAC.noSuchSession !== null && copyOf('noSuchSession') === MAC.noSuchSession,
    macNoSuchSession: MAC.noSuchSession !== null,
    macNeedsYourInput: MAC.needsYourInput !== null
  },
  // Phase 316.5: no model turn is spent by any arm (SPEC §7.8).
  modelTurns: 0
};
let failures = 0;
const arm = (id, ok, said) => {
  const text = unsecret(said);
  report.arms.push({ id, ok, said: text });
  if (ok === false) failures += 1;
  say(`${ok === null ? 'UNREADABLE' : ok ? 'PASS' : 'FAIL'} ${id}: ${text}`);
};

// ---------------------------------------------------------------------------
// The Mac, through its own bridge
// ---------------------------------------------------------------------------

const INHERITED_CLAUDE = Object.fromEntries(Object.keys(process.env).filter((n) => /^(?:CLAUDECODE|CLAUDE_)/.test(n)).map((n) => [n, undefined]));

async function attach(timeoutMs) {
  const started = Date.now();
  let why = 'no DevToolsActivePort yet';
  for (;;) {
    try {
      const port = Number(readFileSync(join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
      if (Number.isFinite(port) && port > 0) {
        const list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
        const picked = pickRendererTarget(list);
        if (picked.target !== null) return await wsConnect(picked.target.webSocketDebuggerUrl);
        why = picked.why;
      }
    } catch (err) {
      why = String(err?.message ?? err);
    }
    if (Date.now() - started > timeoutMs) throw new Error(`no app window: ${why}`);
    await sleep(300);
  }
}

async function armed(cdp) {
  await cdp.call('Runtime.enable');
  for (let i = 0; i < 200; i += 1) {
    if ((await cdpEval(cdp, 'window.gmux !== undefined && window.gmux.pocket !== undefined && window.__gmuxP93 !== undefined && window.__gmuxP202 !== undefined')) === true) {
      // NO AGENT STARTS (Phase 332): the renamed rows must read not installed.
      const held = quietAgentsHeld(JSON.parse(await cdpEval(cdp, 'window.gmux.agentsList().then((r) => JSON.stringify(r))')));
      agentsHeld.push(held.ok);
      if (!held.ok) throw new Error(`agents:list says the renamed agents are not all absent: ${held.problems.join('; ')}`);
      return true;
    }
    await sleep(300);
  }
  return false;
}

async function pocket(cdp, method, arg) {
  const call = arg === undefined ? `window.gmux.pocket[${J(method)}]()` : `window.gmux.pocket[${J(method)}](${J(arg)})`;
  return JSON.parse(
    await cdpEval(cdp, `(async () => { try { const v = await ${call}; return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`)
  );
}

async function mainSessions(cdp) {
  return JSON.parse(await cdpEval(cdp, 'window.gmux.sessions.list().then((s) => JSON.stringify(s.map((x) => ({ id: x.id, name: x.name, status: x.status, createdAt: x.createdAt }))))'));
}

async function waitStatus(cdp, test, ms) {
  const started = Date.now();
  let last = null;
  for (;;) {
    const got = await pocket(cdp, 'status');
    last = got.ok ? got.value : null;
    if (last !== null && test(last)) return { ok: true, status: last };
    if (Date.now() - started >= ms) return { ok: false, status: last };
    await sleep(400);
  }
}

/**
 * Confirm the door as it now stands, and wait until it listens.
 *
 * THE LINES FIRST (the Phase 330 fix round). `setDoor({ on: true })` answers
 * once its read is QUEUED, so the status it answers with holds lines over
 * empty fields (`https://:0`). The first build confirmed those, the read then
 * moved the hash, and nothing published (lens 2's D1). It waits for main's own
 * `confirmable`, lines that name the stand-in's name, and no read under way;
 * main now refuses a confirm over lines that name nothing, too.
 */
async function confirmListening(cdp) {
  const now = await waitStatus(
    cdp,
    (s) =>
      (s.state === 'listening' && s.confirmState === 'confirmed') ||
      (s.confirmable === true &&
        s.state !== 'opening' &&
        s.confirmLines.some((l) => l.includes(`https://${PUBLIC_NAME}:${String(s.publicPort)}`))),
    30_000
  );
  if (!now.ok) return { ok: false, why: `the lines never named ${PUBLIC_NAME}: ${J({ state: now.status?.state, confirmable: now.status?.confirmable, refusal: now.status?.refusal })}` };
  if (now.status.state === 'listening' && now.status.confirmState === 'confirmed') {
    const p = await waitStatus(cdp, pairableNow, 65_000);
    return { ok: p.ok, why: `already confirmed, pairable ${String(p.status?.pairable)}` };
  }
  const c = await pocket(cdp, 'confirmDoor', { linesRead: now.status.confirmLines, hashRead: now.status.confirmHash });
  // Phase 332: listening is not enough; a code shows once main says the name
  // answers (one round of the DNS stand-in). A parent answers no
  // `pairable`, so listening is its word.
  const l = await waitStatus(cdp, pairableNow, 65_000);
  return { ok: c.ok && c.value.allowed === true && l.ok, why: c.ok ? `confirm allowed=${String(c.value.allowed)}, state ${String(l.status?.state)}, pairable ${String(l.status?.pairable)}` : c.error };
}

/** Main's word that a code may show (Phase 332), or `listening` from a build that has no such word. */
const pairableNow = (s) => s.pairable === true || (s.pairable === undefined && s.state === 'listening');

/**
 * Open a pairing window. The code must read the phone's way (v:3: the public
 * name, 8443 or 10000, no tailnet key, no address), and its host must be the
 * stand-in's name: nothing it names is ever dialled.
 */
async function openWindow(cdp) {
  const offered = await pocket(cdp, 'beginPairing');
  if (!offered.ok) return { ok: false, why: offered.error.slice(0, 200) };
  const read = readOffer(offered.value.payload);
  if (!read.ok) return { ok: false, why: `the code does not read the phone's way: ${read.why}` };
  if (read.offer.host !== PUBLIC_NAME) return { ok: false, why: `the code names ${J(read.offer.host)}, which is not the stand-in's ${PUBLIC_NAME}` };
  SECRETS.push(read.offer.ps);
  return { ok: true, payload: offered.value.payload, offer: read.offer };
}

let standin = null;
/** The name check's zone servers (Phase 332), in this process on 127.0.0.1. */
let dns = null;
const dnsPreflights = [];
const agentsHeld = [];
/** The live Funnel child's forwarder port, or 0 while nothing is published. */
const forwarderPort = () => standin?.readFunnel()[0]?.forwarderPort ?? 0;

/**
 * THE APP'S ENDPOINT: a TCP relay on 127.0.0.1 that dials the CURRENT
 * forwarder per connection, so a restarted Funnel child (a Remove, a
 * re-confirm) moves nothing the app was told. It adds no byte and reads none.
 * In this process; closed in the `finally`.
 */
async function startRelay() {
  const sockets = new Set();
  let connections = 0;
  // Phase 317 (E5, E7): past its allowance a connection is taken and HELD,
  // never dialled onward, so its TLS handshake never completes and the app's
  // write is never handed its bytes; `heldTotal` counts every one so held.
  // `pauseAfter(n)` lets n more through first (E7 lets row one's write pass
  // and holds row two's); resume ends the held and forwards again.
  let allowance = Infinity;
  let heldTotal = 0;
  const held = new Set();
  const server = createNetServer((client) => {
    // Phase 316.6 (U1): every connection the app opens to the door is counted.
    connections += 1;
    sockets.add(client);
    client.on('close', () => sockets.delete(client));
    client.on('error', () => undefined);
    if (allowance <= 0) {
      heldTotal += 1;
      held.add(client);
      client.on('close', () => held.delete(client));
      return;
    }
    allowance -= 1;
    const port = forwarderPort();
    if (port === 0) {
      client.destroy();
      return;
    }
    const upstream = netConnect({ host: '127.0.0.1', port });
    sockets.add(upstream);
    upstream.on('close', () => {
      sockets.delete(upstream);
      client.destroy();
    });
    upstream.on('error', () => client.destroy());
    client.on('close', () => upstream.destroy());
    client.pipe(upstream);
    upstream.pipe(client);
  });
  const handle = await listenLoopback(server, sockets, () => connections);
  return {
    ...handle,
    /** Hold every new connection from now. */
    pause: () => {
      allowance = 0;
    },
    /** Let `n` more connections through, then hold every one after. */
    pauseAfter: (n) => {
      allowance = n;
    },
    /** How many connections were ever held. */
    held: () => heldTotal,
    resume: () => {
      allowance = Infinity;
      for (const s of held) s.destroy();
      held.clear();
    }
  };
}

/**
 * MD3 (Phase 316.6, SPEC §7.4): a loopback listener every image and every
 * refused link in the planted answers points at. It answers nothing and
 * counts every connection, which must be none for the whole run. In this
 * process; closed in the `finally`, by its handle.
 */
async function startMd3Listener() {
  const sockets = new Set();
  let connections = 0;
  const server = createNetServer((socket) => {
    connections += 1;
    sockets.add(socket);
    socket.on('error', () => undefined);
    socket.destroy();
  });
  return listenLoopback(server, sockets, () => connections);
}

/**
 * The relay's and MD3's one listening step (the integrator's extraction):
 * 127.0.0.1 at a port the system picks, the connection count the caller
 * keeps, and a close that ends every socket it holds and then the server.
 * Called only by the two starters above; each handle is closed in the
 * `finally`.
 */
async function listenLoopback(server, sockets, count) {
  await new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(0, '127.0.0.1', () => ok());
  });
  return {
    port: server.address().port,
    count,
    close: () =>
      new Promise((done) => {
        for (const s of sockets) s.destroy();
        server.close(() => done());
      })
  };
}

// ---------------------------------------------------------------------------
// The planted conversation, and the turn appended to it
// ---------------------------------------------------------------------------

function talkRecord(path = TALK_SID) {
  if (!existsSync(path)) return null;
  const sid = readFileSync(path, 'utf8').trim();
  if (sid === '') return null;
  return { sid, file: join(HOME, '.claude', 'projects', WORK.replace(/[^a-zA-Z0-9]/g, '-'), `${sid}.jsonl`) };
}

/** How many turns are appended to the planted conversation (see D0). */
const PLANTED_TURNS = 41;

/** One exchange appended to the scratch COPY of the record. The committed fixture is never touched. */
function appendTurn(record, nth, askText, answerText, of = { total: PLANTED_TURNS, tag: '316' }) {
  // Distinct, rising, in the last minute: after the fixture's own turns, and
  // never in the future. `of` keeps each planted session's ids its own.
  const at = new Date(Date.now() - (of.total + 1 - nth) * 1_000).toISOString();
  const base = { isSidechain: false, userType: 'external', entrypoint: 'cli', cwd: WORK, sessionId: record.sid, version: '2.1.238', gitBranch: 'main' };
  const pad = String(nth).padStart(4, '0');
  const lines = [
    J({ parentUuid: null, ...base, type: 'user', message: { role: 'user', content: askText }, uuid: `${of.tag}0${pad}-1111-4111-8111-111111111111`, timestamp: at, promptSource: 'typed', promptId: `p${of.tag}-${pad}`, origin: { kind: 'human' } }),
    J({ parentUuid: null, ...base, message: { model: 'claude-opus-5', id: `msg_p${of.tag}${pad}`, type: 'message', role: 'assistant', content: [{ type: 'text', text: answerText }] }, requestId: `req_p${of.tag}${pad}`, type: 'assistant', uuid: `${of.tag}1${pad}-1111-4111-8111-111111111111`, timestamp: at })
  ];
  appendFileSync(record.file, `${lines.join('\n')}\n`, 'utf8');
}

// ---------------------------------------------------------------------------
// The key scan
// ---------------------------------------------------------------------------

function filesHolding(root, needles) {
  const hits = [];
  let files = 0;
  const walk = (dir) => {
    let entries = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const path = join(dir, name);
      let st;
      try {
        st = lstatSync(path);
      } catch {
        continue;
      }
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) {
        walk(path);
        continue;
      }
      if (!st.isFile() || st.size > 64 * 1024 * 1024) continue;
      files += 1;
      let bytes;
      try {
        bytes = readFileSync(path);
      } catch {
        continue;
      }
      for (const [needle, what] of needles) if (bytes.indexOf(needle) !== -1) hits.push(`${name} (${what})`);
    }
  };
  if (existsSync(root)) walk(root);
  return { hits, files };
}
/** Every window's secret, as text and as bytes, read when asked (windows open through the run). */
const secretNeedles = () =>
  SECRETS.flatMap((secret) => [
    [Buffer.from(secret, 'utf8'), 'a window’s secret as text'],
    [Buffer.from(secret, 'utf16le'), 'a window’s secret as UTF-16'],
    [Buffer.from(secret, 'base64url'), 'a window’s secret as bytes']
  ]);

// ---------------------------------------------------------------------------
// The Swift tests, driven and read
// ---------------------------------------------------------------------------

let runCounter = 0;
/**
 * One xcodebuild test run on `sim`, whose `P316|<run>|` lines are parsed as
 * they arrive and handed to `onEvent`, which may act on the Mac. Reactions are
 * queued, so a slow press never blocks the reading of the next line.
 */
async function drive(sim, { test, env, derivedDataPath, label, onEvent = null, timeoutMs = 900_000 }) {
  runCounter += 1;
  const run = `${String(process.pid)}-${String(runCounter)}`;
  const marker = `P316|${run}|`;
  const events = [];
  const reactions = [];
  const reactionErrors = [];
  // TWO CHANNELS, ONE READING (integrator, Phase 316.2). The Swift writes every
  // line to its stdout AND appends it to this file, because whether xcodebuild
  // relays a runner's output AS IT HAPPENS is unmeasured, and P1's Allow is a
  // reaction to a line the test prints while it waits. Each object carries
  // `seq`, so a line is read once, from whichever channel brought it first.
  // The file is read with fs/promises, never synchronously (pitfall b).
  const linesFile = join(XCODE, `lines-${run}.txt`);
  rmSync(linesFile, { force: true });
  const seen = new Set();
  const take = (line) => {
    const at = line.indexOf(marker);
    if (at === -1) return;
    let event;
    try {
      event = JSON.parse(line.slice(at + marker.length).trim());
    } catch {
      return;
    }
    if (event !== null && typeof event === 'object' && event.seq !== undefined) {
      if (seen.has(event.seq)) return;
      seen.add(event.seq);
    }
    // When THIS process first read the line (Phase 316.5). A line is printed
    // before it is read, and a pairing only moves forward, so a Mac state
    // sampled AT OR AFTER this moment that still reads `waiting` was `waiting`
    // when the phone printed the line (N0).
    if (event !== null && typeof event === 'object') event.receivedAt = Date.now();
    events.push(event);
    if (onEvent !== null) reactions.push(Promise.resolve().then(() => onEvent(event)).catch((err) => reactionErrors.push(String(err?.message ?? err))));
  };
  let offset = 0;
  let partial = '';
  const readNew = async () => {
    let buf;
    try {
      buf = await readFileAsync(linesFile);
    } catch {
      return;
    }
    if (buf.length <= offset) return;
    partial += buf.subarray(offset).toString('utf8');
    offset = buf.length;
    let at;
    while ((at = partial.indexOf('\n')) !== -1) {
      take(partial.slice(0, at));
      partial = partial.slice(at + 1);
    }
  };
  let tailing = true;
  const tail = (async () => {
    while (tailing) {
      await readNew();
      await sleep(250);
    }
    await readNew();
  })();
  let r;
  try {
    r = await sim.xcodebuild(['test-without-building', '-project', test.project ?? PROJECT, '-scheme', SCHEME, `-only-testing:${test.id}`], {
      label,
      timeoutMs,
      derivedDataPath,
      testEnv: { P316_RUN: run, P316_LINES: linesFile, ...env },
      onLine: take
    });
  } finally {
    tailing = false;
    await tail;
  }
  await Promise.all(reactions);
  events.sort((a, b) => Number(a?.seq ?? 0) - Number(b?.seq ?? 0));
  const text = `${r.stdout}${r.stderr}`;
  const executed = /Executed (\d+) tests?/.exec(text)?.[1] ?? null;
  const skipped = /with (\d+) tests? skipped/.exec(text)?.[1] ?? '0';
  return { code: r.code, ms: r.ms, timedOut: r.timedOut, events, reactionErrors, executed: executed === null ? null : Number(executed), skipped: Number(skipped) };
}

const dumps = (events, name) => events.filter((e) => e.step === 'screen' && e.name === name);
const lastDump = (events, name) => dumps(events, name).at(-1) ?? null;
const el = (dump, id) => dump?.elements?.find((e) => e.id === id) ?? null;
const els = (dump, prefix) => (dump?.elements ?? []).filter((e) => typeof e.id === 'string' && e.id.startsWith(prefix));
const near = (a, b, tol = 0.5) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= tol;
const aliveOf = (events) => events.find((e) => e.step === 'alive')?.state ?? null;
/** XCUIApplication.State.runningForeground. */
const RUNNING_FOREGROUND = 4;

/**
 * THE LIST, Method A: what the node reader's own reads say the list must draw,
 * against the labels and frames XCUITest read. `reads` is one or two answers
 * taken around the dump, so an age that ticked between them is either.
 */
function gradeList(dump, reads) {
  const problems = [];
  if (dump === null) return ['the UI test printed no "list" dump'];
  const first = reads[0];
  const rows = first.rows ?? [];
  const others = first.others ?? [];
  const wantBlocked = `${COPY.needsLead}${String(rows.length)}${COPY.close}`;
  // The count is every other session, the ones the door left out included
  // (`othersOmitted`), which is what "Everything else (n)" claims.
  const wantOthers = `${COPY.othersLead}${String(others.length + Math.max(0, Number(first.othersOmitted ?? 0)))}${COPY.close}`;
  /** A header's words: its text element's label, else its own. */
  const said = (id) => {
    const text = el(dump, `${id}-text`)?.label;
    return typeof text === 'string' && text !== '' ? text : (el(dump, id)?.label ?? null);
  };
  if (rows.length > 0 && said('section-blocked') !== wantBlocked) problems.push(`the blocked header reads ${J(said('section-blocked'))}, not ${J(wantBlocked)}`);
  if (others.length > 0 && said('section-others') !== wantOthers) problems.push(`the second header reads ${J(said('section-others'))}, not ${J(wantOthers)}`);
  // The order: every row main sent, blocked first, in main's order, drawn top to bottom.
  const want = [...rows, ...others].map((r) => r.sessionId);
  const drawn = els(dump, 'row-')
    .filter((e) => /^row-[^-]/.test(e.id) && !/^row-(dot|name|machine|age|line)-/.test(e.id))
    .sort((a, b) => a.frame[1] - b.frame[1])
    .map((e) => e.id.slice('row-'.length));
  const visible = want.filter((id) => drawn.includes(id));
  if (visible.length === 0) problems.push('no row main sent was drawn');
  if (J(drawn.filter((id) => want.includes(id))) !== J(visible)) problems.push(`the rows are drawn in the order ${J(drawn)}, and main sent ${J(want)}`);
  for (const row of [...rows, ...others]) {
    if (!drawn.includes(row.sessionId)) continue;
    const name = el(dump, `row-name-${row.sessionId}`)?.label;
    if (name !== row.name) problems.push(`row ${row.sessionId} draws the name ${J(name)}, not ${J(row.name)}`);
    const ages = reads.map((r) => [...(r.rows ?? []), ...(r.others ?? [])].find((x) => x.sessionId === row.sessionId)?.ageText).filter((a) => a !== undefined);
    const age = el(dump, `row-age-${row.sessionId}`)?.label;
    if (!ages.includes(age)) problems.push(`row ${row.sessionId} draws the age ${J(age)}; main said ${J(ages)}`);
    const machine = el(dump, `row-machine-${row.sessionId}`);
    if ((row.machine === null) !== (machine === null)) problems.push(`row ${row.sessionId} ${machine === null ? 'draws no machine badge for' : 'draws a machine badge on'} a session ${row.machine === null ? 'on this Mac' : 'elsewhere'}`);
    const line = el(dump, `row-line-${row.sessionId}`)?.label ?? '';
    // Main.html's two shapes: a WAITING row reads `project · question`, and
    // every other row reads `status · project` (ListScreen.swift's RowDrawing).
    // A row that is not waiting may still carry a question the feed has not
    // cleared yet; its second line is the status title all the same.
    const asking = rows.includes(row) && row.question !== null;
    const second = asking ? row.question : row.statusTitle;
    if (!line.includes(row.project) || !line.includes(second)) problems.push(`row ${row.sessionId}'s second line ${J(line.slice(0, 80))} does not carry the project and ${asking ? 'the question' : 'the status title'}`);
  }
  const note = el(dump, 'list-age-note')?.label;
  if (note !== first.ageNote) problems.push(`the age note reads ${J(note)}, not main's ${J(first.ageNote)}`);
  const read = el(dump, 'list-read')?.label ?? '';
  if (COPY.readLead !== null && !read.startsWith(COPY.readLead)) problems.push(`the foot reads ${J(read)}, which does not start with ${J(COPY.readLead)}`);
  // THE FRAMES, from the mock's own CSS, measured from POSITIONS: a text's
  // centre is the centre of its line box whatever height its glyphs read, and a
  // row's top and height are the row's own. Never a glyph box against a CSS box.
  const frames = [];
  const screenX = el(dump, 'screen-list')?.frame?.[0] ?? 0;
  const round = (n) => Math.round(n * 100) / 100;
  const centre = (e) => e.frame[1] + e.frame[3] / 2;
  const rowBoxes = drawn.map((id) => el(dump, `row-${id}`)).filter((e) => e !== null);
  const known = (...values) => values.every((n) => typeof n === 'number' && Number.isFinite(n));
  for (const id of ['section-blocked', 'section-others']) {
    // The header's words, else the header itself. SwiftUI reports a header
    // container by the union of its children, so its own frame is the text's.
    const t = el(dump, `${id}-text`) ?? el(dump, id);
    if (t === null) continue;
    if (FRAMES.gutter !== null && !near(t.frame[0] - screenX, FRAMES.gutter)) problems.push(`${id}'s words start at x ${String(round(t.frame[0] - screenX))}; the gutter is ${String(FRAMES.gutter)}`);
    // `.hdr { height: 28px; align-items: center; border-bottom: 1px }`: the
    // words sit in the middle of the 28 pt box and the next row starts one
    // hairline below it, so the box is twice the distance from the words'
    // centre to the hairline.
    const next = rowBoxes.filter((r) => r.frame[1] >= centre(t)).sort((a, b) => a.frame[1] - b.frame[1])[0] ?? null;
    let height = null;
    if (next !== null && known(FRAMES.headerHeight, FRAMES.hairline)) {
      height = round(2 * (next.frame[1] - FRAMES.hairline - centre(t)));
      if (!near(height, FRAMES.headerHeight, 1)) problems.push(`${id} is ${String(height)} pt tall (its words centred at y ${String(round(centre(t)))}, the next row at ${String(round(next.frame[1]))}); the mock's .hdr is ${String(FRAMES.headerHeight)}`);
    }
    frames.push({ id, textX: round(t.frame[0] - screenX), textCentre: round(centre(t)), nextRowTop: next === null ? null : round(next.frame[1]), height });
  }
  const [vertical, horizontal] = FRAMES.rowPadding ?? [null, null];
  const lineBoxes = known(vertical, horizontal, FRAMES.rowGap, FRAMES.hairline, FRAMES.nameLine, FRAMES.secondLine);
  // THE RIGHT GUTTER (his nit of 2026-09-23: the grader measured the left one
  // and never the right). A row's own frame spans the window, because the
  // whole row is the tap target, so its right edge is its WORDS' right edge:
  // the rightmost of its parts, which is the age, `.row`'s right padding in
  // from the window's edge.
  const windowWidth = Array.isArray(dump.window) && known(dump.window[0]) && dump.window[0] > 0 ? dump.window[0] : (() => {
    const screen = el(dump, 'screen-list')?.frame;
    return screen === undefined ? null : screen[0] + screen[2];
  })();
  if (!lineBoxes && drawn.length > 0) problems.push(`the mock's row box could not be read from Main.html (${J(FRAMES)}), so the rows were not measured`);
  for (const id of lineBoxes ? drawn : []) {
    const row = el(dump, `row-${id}`);
    const dot = el(dump, `row-dot-${id}`);
    const name = el(dump, `row-name-${id}`);
    const line = el(dump, `row-line-${id}`);
    if (row === null) continue;
    const top = row.frame[1];
    // `.row { padding: 6px 16px; gap: 2px; border-bottom: 1px }` around a 22 pt
    // name line and a 20 pt second line; the very last row has no hairline.
    const last = id === drawn.at(-1);
    const wantHeight = vertical + FRAMES.nameLine + FRAMES.rowGap + FRAMES.secondLine + vertical + (last ? 0 : FRAMES.hairline);
    const wantName = vertical + FRAMES.nameLine / 2;
    const wantLine = vertical + FRAMES.nameLine + FRAMES.rowGap + FRAMES.secondLine / 2;
    if (dot !== null && !near(dot.frame[0] - row.frame[0], horizontal)) problems.push(`row ${id}'s dot sits ${String(round(dot.frame[0] - row.frame[0]))} pt in; the mock's row padding is ${String(horizontal)}`);
    const parts = ['dot', 'name', 'machine', 'age', 'line'].map((part) => el(dump, `row-${part}-${id}`)).filter((e) => e !== null && Array.isArray(e.frame));
    const rightEdge = parts.length === 0 ? null : Math.max(...parts.map((e) => e.frame[0] + e.frame[2]));
    const rightGutter = rightEdge === null || windowWidth === null ? null : windowWidth - rightEdge;
    if (el(dump, `row-age-${id}`) === null) problems.push(`row ${id} draws no age, so its right gutter was not measured`);
    else if (rightGutter === null) problems.push(`row ${id}'s right gutter could not be measured (window ${J(dump.window ?? null)})`);
    else if (!near(rightGutter, horizontal)) problems.push(`row ${id}'s words end ${String(round(rightGutter))} pt from the window's right edge (${String(round(windowWidth))} − ${String(round(rightEdge))}); the mock's row padding is ${String(horizontal)}`);
    if (!near(row.frame[3], wantHeight, 0.75)) problems.push(`row ${id} is ${String(round(row.frame[3]))} pt tall; the mock's row box is ${String(wantHeight)} (${String(vertical)}+${String(FRAMES.nameLine)}+${String(FRAMES.rowGap)}+${String(FRAMES.secondLine)}+${String(vertical)}${last ? ', the last row, no hairline' : `+${String(FRAMES.hairline)}`})`);
    if (name !== null && !near(centre(name) - top, wantName, 1)) problems.push(`row ${id}'s name is centred ${String(round(centre(name) - top))} pt down its row; the mock's padding and line box put it at ${String(wantName)}`);
    if (line !== null && !near(centre(line) - top, wantLine, 1)) problems.push(`row ${id}'s second line is centred ${String(round(centre(line) - top))} pt down its row; the mock's padding, gap and line boxes put it at ${String(wantLine)}`);
    frames.push({
      id: `row ${id.slice(0, 8)}`,
      height: round(row.frame[3]),
      dotInset: dot === null ? null : round(dot.frame[0] - row.frame[0]),
      rightGutter: rightGutter === null ? null : round(rightGutter),
      nameCentre: name === null ? null : round(centre(name) - top),
      lineCentre: line === null ? null : round(centre(line) - top)
    });
  }
  if (frames.length === 0) problems.push('no section header or row frame was read, so the frames were not measured');
  return problems.length > 0 ? problems : { frames };
}

// ---------------------------------------------------------------------------
// Phase 316.5: this file's OWN composer of Phase 314's alert JSON
// ---------------------------------------------------------------------------
//
// Written from build/p314/SPEC.md §2.2 to §2.4 and build/p3165/SPEC.md §5.4,
// never imported from src/main/push/, so N3's byte comparison is two
// implementations agreeing rather than one agreeing with itself. The key
// order is the pinned one: aps { alert { title, body }, badge, sound,
// thread-id }, then tortie. The clip past 4096 bytes is not written here: every
// row this probe makes is a few dozen bytes, and a composition over the cap is
// refused rather than guessed at.

/** Tortie's one separator between two facts. */
const SEPARATOR = ' · ';
/** The count alert's thread (src/main/push/alert.ts's WAITING_THREAD, spelled again on purpose). */
const COUNT_THREAD = 'tortie-waiting';

/** The single shape for one blocked row, or null when it would not fit. */
function composeSingleAlert(row, badge) {
  const body = [row.project, row.agentLabel, ...(row.machine !== null && row.machine !== undefined ? [row.machine] : [])].join(SEPARATOR);
  const text = J({
    aps: { alert: { title: `${row.name} ${row.statusLabel}`, body }, badge, sound: 'default', 'thread-id': row.sessionId },
    tortie: { v: 1, session: row.sessionId }
  });
  return pushPayloadRefusal(text) === null ? text : null;
}

/** The count shape over names, or null when it would not fit or the Mac's title word could not be read. */
function composeCountAlert(names, badge) {
  if (MAC.needsYourInput === null) return null;
  const text = J({
    aps: { alert: { title: `${MAC.needsYourInput} (${String(badge)})`, body: names.join(SEPARATOR) }, badge, sound: 'default', 'thread-id': COUNT_THREAD },
    tortie: { v: 1 }
  });
  return pushPayloadRefusal(text) === null ? text : null;
}

// ---------------------------------------------------------------------------
// Phase 316.5: the preflight of the Mac's override, and the graders
// ---------------------------------------------------------------------------

/** The ONE origin shape alerts.json may name: cleartext to 127.0.0.1 on a port. */
const LOOPBACK_ORIGIN = /^http:\/\/127\.0\.0\.1:([0-9]{1,5})$/;

/**
 * Why the override this file wrote may not be handed to the Mac, or null
 * (SPEC §7.4: "The preflight refuses unless the override names only
 * 127.0.0.1"). Both environments, each `http://127.0.0.1:<port>`, and a key
 * file inside the harness directory.
 */
function alertsOverrideRefusal(json, harness) {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) return 'alerts.json is not an object';
  const origins = json.origins;
  if (origins === null || typeof origins !== 'object' || Array.isArray(origins)) return 'alerts.json names no origins';
  const names = Object.keys(origins).sort();
  if (J(names) !== J(['development', 'production'])) return `alerts.json names the origins ${J(names)}, not development and production`;
  for (const name of names) {
    const hit = LOOPBACK_ORIGIN.exec(String(origins[name]));
    if (hit === null || Number(hit[1]) < 1 || Number(hit[1]) > 65_535) return `the ${name} origin ${J(origins[name])} is not http://127.0.0.1:<port>`;
  }
  const root = `${resolve(harness)}/`;
  if (typeof json.keyFile !== 'string' || !resolve(json.keyFile).startsWith(root)) return 'the key file alerts.json names is not inside the harness directory';
  const extra = Object.keys(json).filter((k) => k !== 'origins' && k !== 'keyFile');
  if (extra.length > 0) return `alerts.json carries ${J(extra)} beside its two fields`;
  return null;
}

/** One verdict: `ok` true, false, or null for UNREADABLE (exit 2, never a pass). */
const verdict = (ok, said) => ({ ok, said });
/** Problems first (a FAIL), then what could not be read (UNREADABLE), then the pass. */
const decide = (problems, unreadable, green) =>
  problems.length > 0 ? verdict(false, problems.join('; ')) : unreadable.length > 0 ? verdict(null, unreadable.join('; ')) : verdict(true, green);

/** N1: the key, through the bridge. */
function gradeKey(r) {
  const p = [];
  if (!r.bridge.ok) p.push(`pocket.choosePushKey() did not answer: ${String(r.bridge.error).slice(0, 160)}`);
  else {
    if (r.bridge.value?.kept !== true) p.push(`the key was not kept (${J(r.bridge.value)})`);
    if (r.bridge.value?.refusal !== null) p.push(`the pick answered a refusal (${J(r.bridge.value?.refusal)})`);
  }
  if (r.statusKeyId !== KEY_ID) p.push(`pushKeyId reads ${J(r.statusKeyId)}, not ${KEY_ID}`);
  if (r.sealed.length === 0) p.push('nothing is sealed under the profile\'s gmux/push');
  for (const f of r.sealed) {
    if (f.bytes.indexOf('PRIVATE KEY') !== -1 || f.bytes.indexOf(r.pemText) !== -1 || r.pemLines.some((line) => f.bytes.indexOf(line) !== -1)) p.push(`the sealed file ${f.name} holds the PEM or a line of it`);
  }
  return decide(p, [], `kept; pushKeyId ${KEY_ID}; ${String(r.sealed.length)} sealed file(s) under gmux/push, none holding the PEM or any of its ${String(r.pemLines.length)} lines`);
}

/** The exact line the Mac's sheet draws for a phone's alert address (pairing.ts, describePocketDoor). */
const alertLineFor = (label, environment, token) => `Alerts for "${label}" go through Apple (${environment}), device ${deviceDigest(token)}`;
const alertLines = (lines) => (lines ?? []).filter((l) => typeof l === 'string' && l.startsWith('Alerts for "'));

/** D2+: the reader's production address, in the lines the Mac asked Allow over. */
function gradeReaderLine(r) {
  if (r.lines === null) return verdict(null, 'the sheet\'s lines were never read at the reader\'s Allow, so what they held is unknown');
  const want = alertLineFor(r.label, 'production', r.token);
  const got = alertLines(r.lines);
  return decide(got.includes(want) ? [] : [`the lines hold ${J(got.map((l) => l.replace(/device [0-9a-f]{8}$/, 'device …')))}, and not the production line for the reader's token`], [], `the sheet's lines at Allow hold "Alerts for "${r.label}" go through Apple (production), device ${deviceDigest(r.token)}"`);
}

/** N2: alerts on and allowed: armed once, and nothing announced of a wait that began before. */
function gradeArmed(r) {
  if (!r.askWaiting) return verdict(null, 'D0\'s waiting session was not needs_input in main when alerts armed, so "not announced" says nothing');
  const p = [];
  if (!r.confirmed) p.push(`the door was not confirmed after alerts were turned on (${J(r.confirmWhy)})`);
  if (r.pushAlerts !== true) p.push('pocket:status does not read pushAlerts on');
  if (r.armedLines !== 1) p.push(`app.log holds ${String(r.armedLines)} "phone alerts armed" line(s), not one`);
  if (r.requests !== 0) p.push(`the stand-in took ${String(r.requests)} request(s): a wait that began before alerts armed was announced`);
  if (r.waitedMs < QUIET_AFTER_ARM_MS) p.push(`only ${String(r.waitedMs)} ms were waited, under the ${String(QUIET_AFTER_ARM_MS)} that outlast the engine's first coalesce`);
  return decide(p, [], `armed once, confirmed through the sheet's own lines; D0's waiting session read needs_input and 0 requests reached the stand-in in ${String(r.waitedMs)} ms`);
}

/** The notification lines of one pairing drive. */
function notificationEvents(events) {
  return {
    fingerprint: events.find((e) => e.step === 'fingerprint') ?? null,
    asked: events.find((e) => e.step === 'notifications' && e.asked !== undefined) ?? null,
    answered: events.find((e) => e.step === 'notifications' && e.answered !== undefined) ?? null
  };
}
/** The first Mac pairing state sampled at or after `at`, or null. */
const stateAtOrAfter = (samples, at) => samples.find((s) => s.at >= at)?.state ?? null;
/**
 * The most a P316 line can wait between the phone printing it and this
 * process reading it: the file is tailed every 250 ms, and the stdout channel
 * is at least as fast. A Mac state sampled more than this BEFORE a line was
 * read was sampled before the line was printed.
 */
const LINE_LAG_MS = 1_000;
/** When the Mac first read the phone as allowed, or null. */
const firstAllowedAt = (samples) => samples.find((s) => s.state === 'allowed')?.at ?? null;
/**
 * Whether the Mac could send when a window opened (research 136): it held a
 * key AND its alert switch was on, over fields a person confirmed (the Mac's
 * own `alertsCanSend`, src/main/pocket/ipc.ts). Read from `pocket:status` as
 * it stood.
 */
const macCanSend = (status) =>
  status !== null && status !== undefined && status.pushAlerts === true && status.confirmState === 'confirmed' && typeof status.pushKeyId === 'string' && status.pushKeyId !== '';

/**
 * N0 (and the floor's pairing in F1+): the Mac could send, iOS asked after the
 * fingerprint and before the Mac allowed the phone, the answer was allow, and
 * the Mac held the phone's development address when Allow was pressed.
 *
 * RESEARCH 136 moved the SPEC's order. The phone is asked only when the Mac
 * can send, and it learns that from the Mac's answer to its presentation, so
 * the Mac may read `presented` when iOS asks; what must hold is that the
 * question came before the Mac ALLOWED the phone, and that the address
 * reached the Mac before Allow was pressed.
 */
function gradeAsked(r) {
  if (r.canSend !== true) return verdict(null, 'the Mac could not send when this window opened (no key kept, or the alert switch off), so whether the phone was asked says nothing');
  if (r.events.length === 0) return verdict(null, 'the UI test printed no P316 line');
  const n = notificationEvents(r.events);
  const p = [];
  const u = [];
  if (n.fingerprint === null) p.push('no fingerprint line');
  if (n.asked === null) p.push('no notifications line: the UI test did not look for the question');
  else if (n.asked.asked !== true) p.push('XCUITest saw no notification question in the 10 s after the fingerprint, although the Mac could send');
  else {
    if (n.fingerprint !== null && Number(n.asked.seq) <= Number(n.fingerprint.seq)) p.push('the question came before the fingerprint line');
    // THE ORDER, in three answers. A `waiting` or `presented` sampled at or
    // after the moment this process READ the question line was true after the
    // phone printed it: proof the Mac had not allowed the phone. An `allowed`
    // sampled more than the lines' lag BEFORE that moment was true before the
    // line was printed: the phone was allowed first, a FAIL, because its
    // address could no longer reach the Mac. Anything between is a reading
    // that could not separate the two, never a pass.
    const state = stateAtOrAfter(r.samples, n.asked.receivedAt);
    const allowedAt = firstAllowedAt(r.samples);
    if (state === 'waiting' || state === 'presented') {
      /* proved */
    } else if (allowedAt !== null && allowedAt < n.asked.receivedAt - LINE_LAG_MS) {
      p.push(`the Mac's pairing read allowed ${String(n.asked.receivedAt - allowedAt)} ms before the question line was read: the phone was allowed before it asked`);
    } else if (state === null) u.push('the Mac\'s pairing was not sampled after the question was read');
    else u.push(`the Mac's pairing read ${J(state)} at the first sample after the question line was read, within the ${String(LINE_LAG_MS)} ms a line can lag, so the order could not be read`);
  }
  // The UI test says `answered: null` when it saw the question and found no
  // button it could press: a reading it could not take, never a FAIL.
  if (n.answered !== null && n.answered.answered === null) u.push('XCUITest saw iOS\'s question and found no Allow button to press');
  else if (n.answered?.answered !== 'allow') p.push(`the question was answered ${J(n.answered?.answered ?? null)}, not allow`);
  if (r.macLines === null) p.push('the Mac\'s lines were never read at Allow');
  else if (!alertLines(r.macLines).includes(alertLineFor(r.label, 'development', r.token))) p.push(`the Mac's lines at Allow hold no development line for sha256(the seam token) (${String(alertLines(r.macLines).length)} alert line(s))`);
  if (r.phoneRow === null) p.push('the Mac lists no new phone');
  else if (r.phoneRow.alerts !== 'on') p.push(`the phone's row reads alerts ${J(r.phoneRow.alerts)}, not on`);
  return decide(p, u, `the Mac could send; iOS asked after the fingerprint and before the Mac allowed the phone, answered allow; the Mac's lines at Allow hold "Alerts for "${String(r.label)}" go through Apple (development), device ${deviceDigest(r.token)}" and the row reads on`);
}

/**
 * N11 (research 136): a phone pairing with a Mac that CANNOT send is never
 * asked, presents no address although it was handed one, draws no `Pair again
 * to get alerts.` on a relaunch with another token, and draws no word that
 * names alerts anywhere in the run.
 */
function gradeNoSend(r) {
  if (r.canSend !== false) return verdict(null, `the Mac ${r.canSend === true ? 'COULD send' : 'was not read'} when this window opened, so "never asked" says nothing`);
  if (r.events.length === 0) return verdict(null, 'the UI test printed no P316 line');
  const n = notificationEvents(r.events);
  const p = [];
  if (n.asked === null) p.push('no notifications line: the UI test did not look for the question');
  else if (n.asked.asked !== false) p.push('iOS asked for notifications although the Mac cannot send');
  if (n.answered !== null) p.push(`the UI test answered a question (${J(n.answered.answered)}) that must not have been asked`);
  if (!r.allowed) p.push('the phone did not pair');
  if (r.macLines === null) p.push('the Mac\'s lines were never read at Allow');
  else {
    if (alertLines(r.macLines).some((l) => l.endsWith(`device ${deviceDigest(r.token)}`))) p.push('the Mac holds an alert address for the seam token the phone was handed, which it was never asked to present');
    if (alertLines(r.macLines).length !== r.alertLinesBefore) p.push(`the lines hold ${String(alertLines(r.macLines).length)} alert line(s), and held ${String(r.alertLinesBefore)} before this phone`);
  }
  if (r.phoneRow === null) p.push('the Mac lists no new phone');
  else if (r.phoneRow.alerts !== 'none') p.push(`the phone's row reads alerts ${J(r.phoneRow.alerts)}, not none`);
  const relaunch = lastDump(r.events, 'relaunch');
  if (relaunch === null) p.push('no "relaunch" dump after a relaunch with another token');
  else {
    if (el(relaunch, 'screen-needs-input') === null) p.push('the relaunch did not settle on the Needs input list');
    if ((el(relaunch, 'needs-list-alerts-line')?.label ?? '') !== '') p.push('the relaunch draws a line asking to pair again for alerts, from a Mac that cannot send');
  }
  const promised = r.events
    .filter((e) => e.step === 'screen')
    .flatMap((d) => (d.elements ?? []).filter((e) => typeof e.label === 'string' && r.alertWords.some((w) => e.label.includes(w))).map((e) => `${String(d.name)}/${String(e.id)}`));
  if (promised.length > 0) p.push(`a word that names alerts is drawn at ${J(promised.slice(0, 4))}`);
  if (r.alive !== RUNNING_FOREGROUND) p.push(`the app ended the drive in state ${J(r.alive)}`);
  return decide(p, [], `the Mac could not send (key kept, switch off); never asked, paired with no alert line and its row none although it was handed a seam token; a relaunch with another token draws no line; none of ${String(r.alertWords.length)} alert word(s) drawn`);
}

/** F1+: the floor phone was asked and allowed while the Mac could send, and the tap opens the session. */
function gradeFloorTap(r) {
  const asked = gradeAsked(r.pairing);
  if (asked.ok !== true) return verdict(asked.ok, `the floor's pairing: ${asked.said}`);
  const tap = gradeTap(r.tap);
  return tap.ok === true ? verdict(true, `the floor phone was asked and allowed and its address reached the Mac; ${tap.said}`) : tap;
}

/** Whether a body is the single shape for `sessionId`. */
function singleFor(bodyText, sessionId) {
  try {
    const b = JSON.parse(bodyText);
    return b?.tortie?.v === 1 && b.tortie.session === sessionId && b?.aps?.['thread-id'] === sessionId && typeof b?.aps?.alert?.title === 'string';
  } catch {
    return false;
  }
}

/** N3: one send per phone, each at its own environment's origin, signed, and byte for byte the composition. */
function gradeSent(r) {
  if (!r.mainBlocked) return verdict(null, `main never read ${N.alert} needs_input, so no alert was owed`);
  const p = [];
  const at = (origin) => r.requests.filter((x) => x.origin === origin);
  const want = [
    ['development', r.appToken, 'the app'],
    ['production', r.readerToken, 'the reader']
  ];
  for (const [origin, token, who] of want) {
    const hits = at(origin);
    if (hits.length !== 1) {
      p.push(`${String(hits.length)} request(s) at the ${origin} origin (${J(hits.map((x) => tokenName(x.token)))}), not one for ${who}`);
      continue;
    }
    const rec = hits[0];
    if (rec.token !== token) p.push(`the ${origin} origin was sent ${tokenName(rec.token)}'s token, not ${who}'s`);
    if (rec.method !== 'POST') p.push(`the ${origin} request is ${J(rec.method)}`);
    if (rec.status !== 200) p.push(`the ${origin} request was answered ${String(rec.status)} ${String(rec.reason ?? '')}`.trim());
    if (rec.jwt?.verifies !== true) p.push(`the ${origin} request's provider token does not verify under the scratch public key`);
    if (rec.headers?.['apns-topic'] !== r.topic) p.push(`the ${origin} request's apns-topic is ${J(rec.headers?.['apns-topic'])}`);
    if (!singleFor(rec.body, r.sessionId)) p.push(`the ${origin} body is not the single shape for ${N.alert}`);
    else if (r.composed !== null && rec.body !== r.composed) p.push(`the ${origin} body (${String(rec.bodyBytes)} bytes, sha ${shaHex(rec.body).slice(0, 12)}) is not this file's composition (${String(Buffer.byteLength(r.composed))} bytes, sha ${shaHex(r.composed).slice(0, 12)})`);
  }
  // No third clause for "more requests": the stand-in has two origins, so a
  // request beside the two wanted ones moves a count above or is the lone
  // request at its origin carrying the wrong token.
  const unread = r.composed === null ? ['the reader could not read /v1/blocked at the block, so no composition to compare with'] : [];
  return decide(p, unread, `one request at each origin, the app's at development and the reader's at production, both 200, signed under the scratch key, topic ${r.topic}, the single shape, byte for byte this file's composition (${String(Buffer.byteLength(r.composed ?? ''))} bytes)`);
}

/** How a session screen is titled: the navigation bar's identifier is its title, or a `session-title`. */
const titledWith = (dump, name) => el(dump, 'session-title')?.label === name || (dump?.elements ?? []).some((e) => e.id === name);

/** What must be true before a tap can be graded at all: delivered, and a banner seen. */
function tapUnreadable(r) {
  const u = [];
  if (r.delivery === null) u.push('nothing was delivered for this step (no ready-for-alert, or nothing to deliver)');
  else if (r.delivery.code !== 0) u.push(`the delivery answered ${String(r.delivery.code)}`);
  if (r.banner === null) u.push('the UI test printed no banner line');
  else if (r.banner.label === null) u.push('XCUITest found no banner from Tortie (SPEC §12 concern 1)');
  return u;
}

/** N4, N5 and F1+: the tap opens the session the alert names. */
function gradeTap(r) {
  const u = tapUnreadable(r);
  if (u.length > 0) return verdict(null, u.join('; '));
  const p = [];
  if (r.cold === true && r.ready?.cold !== true) p.push('the ready line does not say the app was terminated first');
  if (r.dump === null) p.push('no screen was dumped after the tap');
  else {
    if (String(r.dump.name).endsWith('-missing')) p.push(`the UI test dumped ${J(r.dump.name)}: no session or list after the tap`);
    if (el(r.dump, 'screen-session') === null) p.push(`the tap opened no session${el(r.dump, 'screen-list') !== null || el(r.dump, 'screen-needs-input') !== null ? ' (a list is drawn)' : ''}`);
    else if (el(r.dump, 'session-failure') !== null) p.push(`the session drew a failure${r.cold === true ? ' (a tap that launches the app carries none of the DEBUG launch arguments, so the door endpoint seam is absent unless the app keeps it)' : ''}`);
    else if (!titledWith(r.dump, r.name)) p.push(`the session is not titled with the door's name for it (${String(r.name).length} characters)`);
  }
  return decide(p, [], `the banner tapped${r.cold === true ? ' with the app terminated' : ''}; the session opened, titled with the name the door holds for it`);
}

/**
 * Where a gone-session tap must be made from, read from the last dump before
 * its ready line (the 316.5 fix round): N6 from the list (`back`), N6b from
 * another session's screen (`visit`). A tap over the very session it names
 * changes nothing on screen, which is how N6 passed over a defect every other
 * tap showed, so a tap not arranged as named is UNREADABLE, never a pass.
 */
const TAP_FROM = {
  // Since Phase 316.6 the list on top is either tab's: N5's tap opened its
  // session on the Needs input tab, so `back` returns to that tab's list.
  list: { name: 'back', holds: (d) => (el(d, 'screen-list') !== null || el(d, 'screen-needs-input') !== null) && el(d, 'screen-session') === null },
  session: { name: 'visit', holds: (d) => el(d, 'screen-session') !== null }
};

/** N6 and N6b: a gone session draws the Mac's own sentence on the list. */
function gradeGone(r) {
  if (!r.gone404) return verdict(null, 'the door still answered for that session after End and Remove, so "gone" was not set up');
  const from = TAP_FROM[r.from] ?? null;
  if (from === null) return verdict(null, `no arrangement named ${J(r.from)}`);
  if (r.before === null || r.before === undefined || r.before.name !== from.name || !from.holds(r.before)) {
    return verdict(null, `the tap was not made from ${r.from === 'list' ? 'the list' : 'another session\'s screen'}: the screen before it was ${r.before?.name === undefined || r.before === null ? 'never dumped' : J(r.before.name)}`);
  }
  const u = tapUnreadable(r);
  if (u.length > 0) return verdict(null, u.join('; '));
  const p = [];
  if (r.word === null) p.push('the Mac\'s NO_SUCH_SESSION could not be read from src/renderer/app/reach-copy.ts');
  if (r.dump === null) p.push('no screen was dumped after the tap');
  else {
    // Phase 316.6: an alert's tap selects the Needs input tab, whose list
    // says the Mac's sentence (SPEC §5.1.5, §7.4).
    if (el(r.dump, 'screen-needs-input') === null) p.push(`the Needs input list is not drawn${el(r.dump, 'screen-list') !== null ? ' (the Sessions list is)' : ''}`);
    if (el(r.dump, 'screen-session') !== null) p.push('a session screen is still drawn');
    const notice = el(r.dump, 'needs-list-notice')?.label ?? null;
    if (r.word !== null && notice !== r.word) p.push(`the Needs input list's notice reads ${notice === null ? 'nothing' : `${String(notice.length)} characters that are not the Mac's sentence`}`);
  }
  if (r.alive !== RUNNING_FOREGROUND) p.push(`the app ended the drive in state ${J(r.alive)}`);
  return decide(p, [], `the door answered 404, the tap from ${r.from === 'list' ? 'the list' : 'another session\'s screen'} drew the list with the Mac's own sentence, and the app stayed up`);
}

/** N7: a count body and a hostile id each open the list, and say nothing. */
function gradeListTaps(r) {
  const u = r.taps.flatMap((t, i) => tapUnreadable(t).map((why) => `tap ${String(i + 1)}: ${why}`));
  if (r.taps.length !== 2) u.push(`${String(r.taps.length)} list tap(s) were read, not two`);
  const p = [];
  r.taps.forEach((t, i) => {
    if (tapUnreadable(t).length > 0) return;
    if (t.dump === null) p.push(`tap ${String(i + 1)}: no screen dumped`);
    else {
      if (el(t.dump, 'screen-needs-input') === null) p.push(`tap ${String(i + 1)}: the Needs input list is not drawn`);
      if (el(t.dump, 'screen-session') !== null) p.push(`tap ${String(i + 1)}: a session screen opened`);
      const notice = el(t.dump, 'needs-list-notice')?.label ?? '';
      if (notice !== '') p.push(`tap ${String(i + 1)}: the list carries a notice`);
    }
  });
  if (r.alive !== RUNNING_FOREGROUND) p.push(`the app ended the drive in state ${J(r.alive)}`);
  return decide(p, u, 'the count body and the body naming ../x each opened the list with no notice, and the app stayed up');
}

/** N8: a changed address draws one line, the same address draws none. */
function gradeRelaunch(r) {
  const p = [];
  const [changed, same] = r.dumps;
  if (r.dumps.length !== 2) p.push(`${String(r.dumps.length)} "relaunch" dump(s), not two (the changed token, then the paired one)`);
  // Phase 316.6: the app opens on the Needs input tab, whose list carries the line.
  if (changed !== undefined) {
    if (el(changed, 'screen-needs-input') === null) p.push('the relaunch with a changed token did not settle on the Needs input list');
    const line = el(changed, 'needs-list-alerts-line')?.label ?? null;
    if (line !== PAIR_AGAIN) p.push(`with a changed token the list's alerts line reads ${line === null ? 'nothing' : J(line)}, not ${J(PAIR_AGAIN)}`);
  }
  if (same !== undefined) {
    if (el(same, 'screen-needs-input') === null) p.push('the relaunch with the paired token did not settle on the Needs input list');
    if ((el(same, 'needs-list-alerts-line')?.label ?? '') !== '') p.push('with the token it paired with, the list still says to pair again');
  }
  return decide(p, [], `a changed token draws "${PAIR_AGAIN}" under the title, and the token it paired with draws nothing`);
}

/** N9: alerts off disarms once, and a new wait sends nothing. */
function gradeOff(r) {
  if (!r.armedAtStart) return verdict(null, `app.log did not read alerts armed when N9 began (${String(r.armedBefore)} armed, ${String(r.disarmedBefore)} disarmed line(s)), so a disarm says nothing`);
  if (!r.mainBlocked) return verdict(null, `main never read ${N.quiet} needs_input, so "nothing sent" says nothing`);
  const p = [];
  if (r.pushAlerts !== false) p.push('pocket:status still reads pushAlerts on');
  if (r.disarmed !== 1) p.push(`app.log gained ${String(r.disarmed)} "phone alerts disarmed" line(s), not one`);
  if (r.requests !== 0) p.push(`the stand-in took ${String(r.requests)} request(s) with alerts off`);
  if (r.waitedMs < QUIET_AFTER_OFF_MS) p.push(`only ${String(r.waitedMs)} ms were waited, under ${String(QUIET_AFTER_OFF_MS)}`);
  return decide(p, [], `disarmed once; ${N.quiet} read needs_input in main and 0 requests reached the stand-in in ${String(r.waitedMs)} ms`);
}

/** ND: denied, it pairs with no address and works, and a body shows nothing. */
function gradeDeny(r) {
  // Research 136: a phone is asked only when the Mac can send, so a denial
  // can only be read from a pairing with a Mac that could.
  if (r.canSend !== true) return verdict(null, 'the Mac could not send when this window opened, so the phone could not be asked and there was nothing to deny');
  if (r.events.length === 0) return verdict(null, 'the UI test printed no P316 line');
  const n = notificationEvents(r.events);
  const p = [];
  const u = [];
  if (n.asked?.asked !== true) p.push('XCUITest saw no notification question to deny');
  if (n.answered !== null && n.answered.answered === null) u.push('XCUITest saw iOS\'s question and found no Don\u2019t Allow button to press');
  else if (n.answered?.answered !== 'deny') p.push(`the question was answered ${J(n.answered?.answered ?? null)}, not deny`);
  if (!r.allowed) p.push('the phone did not pair');
  if (r.macLines === null) p.push('the Mac\'s lines were never read at Allow');
  else {
    if (alertLines(r.macLines).some((l) => l.endsWith(`device ${deviceDigest(r.token)}`))) p.push('the Mac holds an alert address for the seam token the phone was handed although it denied');
    if (alertLines(r.macLines).length !== r.alertLinesBefore) p.push(`the lines hold ${String(alertLines(r.macLines).length)} alert line(s), and held ${String(r.alertLinesBefore)} before this phone`);
  }
  if (r.phoneRow === null) p.push('the Mac lists no new phone');
  else if (r.phoneRow.alerts !== 'none') p.push(`the phone's row reads alerts ${J(r.phoneRow.alerts)}, not none`);
  for (const [name, screen] of [['list', 'screen-list'], ['session', 'screen-session'], ['conversation', 'screen-conversation']]) {
    if (el(lastDump(r.events, name), screen) === null) p.push(`the ${name} was not drawn`);
  }
  if (r.delivery === null || r.delivery.code !== 0) u.push(`the body was ${r.delivery === null ? 'never delivered' : `delivered with code ${String(r.delivery.code)}`}, so "no banner" says nothing`);
  const banner = r.events.find((e) => e.step === 'banner') ?? null;
  if (banner === null) u.push('the UI test printed no banner line');
  else if (banner.label !== null) p.push('a banner from Tortie was shown to a phone that denied notifications');
  if (r.alive !== RUNNING_FOREGROUND) p.push(`the app ended the drive in state ${J(r.alive)}`);
  return decide(p, u, 'denied, paired with no alert line and its row none although it was handed a seam token; the list, a session and its conversation drawn; no banner in 20 s; alive');
}

/** N10: nothing of an alert in app.log, and nothing in what the app printed. */
function gradeLog(r) {
  if (r.log === null || r.log === '') return verdict(null, 'app.log could not be read');
  const p = [];
  for (const [what, needle] of r.needles) {
    if (typeof needle !== 'string' || needle.length < 12) continue;
    if (r.log.includes(needle)) p.push(`app.log holds ${what}`);
    if (r.printed.includes(needle)) p.push(`the app printed ${what}`);
  }
  const counted = r.needles.filter(([, n]) => typeof n === 'string' && n.length >= 12).length;
  return decide(p, counted === 0 ? ['there was nothing to look for'] : [], `app.log (${String(r.log.length)} characters) and the app's output hold none of ${String(counted)} tokens, provider tokens, key lines and alert bodies`);
}

/**
 * Each delivery, with the banner line and the first dump the UI test printed
 * after its ready line and before the next ready line. Deliveries are in the
 * order their ready lines were read; nothing here trusts a name the phone
 * chose for a step.
 */
function tapReadings(events, deliveries) {
  const readies = events.filter((e) => e.step === 'ready-for-alert').map((e) => Number(e.seq)).sort((a, b) => a - b);
  return deliveries.map((d) => {
    const next = readies.find((s) => s > d.readySeq) ?? Number.POSITIVE_INFINITY;
    const inside = (e) => Number(e.seq) > d.readySeq && Number(e.seq) < next;
    // Where the tap was made from: the last screen dumped before its ready line.
    const earlier = events.filter((e) => e.step === 'screen' && Number(e.seq) < d.readySeq).sort((a, b) => Number(a.seq) - Number(b.seq));
    return {
      arm: d.arm,
      delivery: d.code === null ? null : { code: d.code },
      ready: events.find((e) => e.step === 'ready-for-alert' && Number(e.seq) === d.readySeq) ?? null,
      banner: events.find((e) => e.step === 'banner' && inside(e)) ?? null,
      dump: events.find((e) => e.step === 'screen' && inside(e)) ?? null,
      before: earlier.at(-1) ?? null
    };
  });
}

// ---------------------------------------------------------------------------
// Phase 316.6: the tab bar, Settings, Unpair and the rendered answer
// (build/p3166/SPEC.md §7.4). Each grader is pure over what the run read, so
// --grader-self-test proves every clause red on its own break.
// ---------------------------------------------------------------------------

/** The app's version and build, from the project the run builds (Settings' `1.0.0 (4)`). */
const PHONE_VERSION = (() => {
  try {
    const pbx = readFileSync(join(ROOT, 'ios', 'Tortie.xcodeproj', 'project.pbxproj'), 'utf8');
    const marketing = /MARKETING_VERSION = ([0-9.]+);/.exec(pbx)?.[1] ?? null;
    const build = /CURRENT_PROJECT_VERSION = ([0-9]+);/.exec(pbx)?.[1] ?? null;
    return marketing === null || build === null ? null : `${marketing} (${build})`;
  } catch {
    return null;
  }
})();

/** The integer a badge's XCUITest value or label carries, or null when it carries none. */
function badgeNumber(event) {
  for (const text of [event?.value, event?.label]) {
    const m = typeof text === 'string' ? /(\d+)/.exec(text) : null;
    if (m !== null) return Number(m[1]);
  }
  // A label inside the button that is a number and nothing else (the fix
  // round: the UI test also prints every label inside the button).
  for (const text of Array.isArray(event?.inside) ? event.inside : []) {
    const m = typeof text === 'string' ? /^\s*(\d+)\s*$/.exec(text) : null;
    if (m !== null) return Number(m[1]);
  }
  return null;
}

/** Whether a badge reading came from iOS 26 or later, whose tab bar XCUITest reads no badge value from. */
function glassBar(event) {
  const major = Number(String(event?.system ?? '').split('.')[0]);
  return Number.isFinite(major) && major >= 26;
}

/**
 * An answer composed from its drawn `md-` labels, the way the UI test's
 * `MarkdownLabels` composes one: each scope in pre-order (by block, then its
 * mark, itself, its cells by row and column, its note), the cut last, joined
 * with a new line. Answers `{ scope: text }`.
 */
function composeScopes(elements) {
  const by = new Map();
  for (const e of elements ?? []) {
    const m = /^md-([^-]+)-(?:(rest)|(\d+)(?:(-mark)|(-more)|-r(\d+)c(\d+))?)$/.exec(String(e.id ?? ''));
    if (m === null) continue;
    const key = m[2] !== undefined ? [Number.MAX_SAFE_INTEGER, 0, 0, 0] : [Number(m[3]), m[4] !== undefined ? 0 : m[5] !== undefined ? 3 : m[6] !== undefined ? 2 : 1, Number(m[6] ?? 0), Number(m[7] ?? 0)];
    if (!by.has(m[1])) by.set(m[1], []);
    by.get(m[1]).push({ key, label: String(e.label ?? '') });
  }
  const out = {};
  for (const [scope, parts] of by) {
    parts.sort((a, b) => a.key[0] - b.key[0] || a.key[1] - b.key[1] || a.key[2] - b.key[2] || a.key[3] - b.key[3]);
    out[scope] = parts.map((p) => p.label).filter((l) => l !== '').join('\n');
  }
  return out;
}

/** Every letter-or-digit word of a text, counted. */
function wordCounts(text) {
  const counts = new Map();
  for (const w of String(text ?? '').match(/[\p{L}\p{N}]+/gu) ?? []) counts.set(w, (counts.get(w) ?? 0) + 1);
  return counts;
}

/**
 * The words a planted answer's source holds that HEAD leaves undrawn BY
 * DESIGN, each named (SPEC §7.6): a fence's info string and a task box's `x`.
 * Nothing else: since the fix round (2026-10-01) no cap an honest answer can
 * reach drops a word, and a table row's cells past its header stay in its
 * last cell, so the words of a table past its caps are no longer excused.
 * Answers `{ fence: Map, task: Map }`.
 */
function undrawnByDesign(source) {
  const fence = new Map();
  const task = new Map();
  const add = (map, text) => {
    for (const [w, n] of wordCounts(text)) map.set(w, (map.get(w) ?? 0) + n);
  };
  for (const line of String(source ?? '').split(/\r\n|\r|\n/)) {
    const f = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (f !== null && f[2].trim() !== '') add(fence, f[2]);
    const t = /^\s*(?:[-+*]|\d{1,9}[.)])\s+\[([xX])\]\s/.exec(line);
    if (t !== null) add(task, t[1]);
  }
  return { fence, task };
}

/** T2a: the first screen after pairing is Needs input. */
function gradeT2a(r) {
  const d = r.pairEnd;
  if (d === null || d === undefined) return verdict(null, 'the UI test printed no "pair-end" dump');
  const p = [];
  if (el(d, 'screen-needs-input') === null) p.push(`pairing landed on ${el(d, 'screen-list') !== null ? 'the Sessions list' : 'no list'}, not Needs input`);
  return decide(p, [], 'pairing landed on the Needs input tab');
}

/**
 * T2b: the badge's integer is the rows the door answered as waiting, read by
 * the node reader just before and just after the app's read; no integer when
 * nothing waits. A badge XCUITest could not find is UNREADABLE, and so is one
 * with no number on iOS 26 or later, whose glass tab bar gives XCUITest an
 * empty value while UIKit draws the badge (SPEC §12 concern 1; the
 * rederive verifier read `badgeValue` "3" and a visible badge view off the
 * real UITabBar on 26.3.1 in the run that graded it a FAIL).
 */
function gradeT2b(r) {
  if (r.badges.length === 0) return verdict(null, 'the UI test printed no badge line');
  const u = [];
  const p = [];
  r.badges.forEach((b, k) => {
    if (b.event.found === false) {
      u.push(`badge ${String(k + 1)}: XCUITest found no Needs input button (SPEC §12 concern 1)`);
      return;
    }
    const counts = b.reads.filter((x) => x !== null).map((x) => (x.rows ?? []).length);
    if (counts.length === 0) {
      u.push(`badge ${String(k + 1)}: the node reader read nothing around it`);
      return;
    }
    const n = badgeNumber(b.event);
    if (counts.every((c) => c === 0)) {
      if (n !== null) p.push(`badge ${String(k + 1)} reads ${String(n)} while the door answered no waiting row`);
    } else if (n === null && glassBar(b.event)) u.push(`badge ${String(k + 1)}: iOS ${String(b.event.system)}'s tab bar gave XCUITest no number, and the door answered ${J(counts)} waiting row(s) (SPEC §12 concern 1)`);
    else if (n === null) p.push(`badge ${String(k + 1)} carries no number, and the door answered ${J(counts)} waiting row(s)`);
    else if (!counts.includes(n)) p.push(`badge ${String(k + 1)} reads ${String(n)}, and the door answered ${J(counts)} waiting row(s) around it`);
  });
  return decide(p, u, `${String(r.badges.length)} badge reading(s), each the door's waiting count read around it (${r.badges.map((b) => String(badgeNumber(b.event))).join(', ')})`);
}

/** T2c: a session opened in Sessions is still on top after Needs input and back. */
function gradeT2c(r) {
  const d = r.tabSessions;
  if (d === null || d === undefined) return verdict(null, 'the UI test printed no "tab-sessions" dump');
  const p = [];
  if (el(d, 'screen-session') === null) p.push(`after Needs input and back, Sessions shows ${el(d, 'screen-list') !== null ? 'its list' : 'no session'}, not the session opened on it`);
  else if (r.name !== null && !titledWith(d, r.name)) p.push('the session on top is not the one opened');
  return decide(p, [], 'the session opened in Sessions was still on top after Needs input and back');
}

/** T2d: at the end of a pushed session, its last element ends at or above the tab bar's top. */
function gradeT2d(r) {
  if (r.bar === null || r.bar === undefined) return verdict(null, 'the UI test printed no bar line');
  if (!Array.isArray(r.bar.frame)) return verdict(null, `the tab bar's frame could not be read (${J(r.bar.via ?? null)}; SPEC §12 concern 1)`);
  if (r.dump === null || r.dump === undefined) return verdict(null, 'the UI test printed no "bar" dump');
  const top = r.bar.frame[1];
  const content = (r.dump.elements ?? []).filter((e) => typeof e.id === 'string' && e.id.startsWith('session-') && Array.isArray(e.frame) && e.frame[3] > 0);
  if (content.length === 0) return verdict(null, 'the "bar" dump holds no session element to measure');
  const lowest = content.reduce((a, b) => (a.frame[1] + a.frame[3] >= b.frame[1] + b.frame[3] ? a : b));
  const end = lowest.frame[1] + lowest.frame[3];
  const p = [];
  if (r.bar.screen !== 'screen-session') p.push(`the bar was read over ${J(r.bar.screen)}, not a pushed session`);
  if (end > top + 0.5) p.push(`the session's last element (${lowest.id}) ends at y ${String(Math.round(end * 100) / 100)}, under the tab bar's top at ${String(Math.round(top * 100) / 100)}`);
  return decide(p, [], `the session's last element ends at y ${String(Math.round(end * 100) / 100)}, at or above the tab bar's top at ${String(Math.round(top * 100) / 100)}`);
}

/**
 * MD1, MARKDOWN OFF (his ruling of 2026-10-02, "Ship tabs + Settings,
 * markdown off"; build/p3166/SPEC.md "As built, markdown off"):
 * `MarkdownCaps.pieces` is 0, so EVERY planted turn is drawn as written,
 * exactly as the parent drew every answer: ONE element, `md-<turn>-0`, and no
 * other `md-<turn>-` element (no block, cell, mark or counted note).
 * table-at-caps holds its opening words, its header and every cell of its 51
 * rows; honest-wide (when planted) its ten columns, the `-` and `+` lines of
 * its unfenced diff, its long cell and its long code line whole;
 * loop-quote-comment (when planted) its heading, table and list; and no label
 * holds a `**` pair (a `**` beside no other `*`), because the inline markdown
 * the parent drew is still drawn: `***`, a rule written as its characters,
 * is not one. `planted` maps a turn index to its fixture.
 */
function gradeMd1(r) {
  if (r.markdown === null || r.markdown === undefined) return verdict(null, 'the UI test printed no markdown line');
  if (r.planted.size === 0) return verdict(null, 'the node reader found no planted turn in the markdown session');
  const p = [];
  const byScope = new Map();
  for (const e of r.markdown.elements ?? []) {
    const m = /^md-([^-]+)-/.exec(String(e.id ?? ''));
    if (m === null) continue;
    if (!byScope.has(m[1])) byScope.set(m[1], []);
    byScope.get(m[1]).push(e);
  }
  const missing = [...r.planted].filter(([i]) => (byScope.get(String(i)) ?? []).length === 0).map(([, name]) => name);
  if (missing.length > 0) p.push(`${String(missing.length)} planted turn(s) drew no md- element: ${missing.slice(0, 6).join(', ')}`);
  // Every planted turn, drawn as written: one element, md-<turn>-0, alone.
  const asBlocks = [...r.planted].filter(([i]) => {
    const own = byScope.get(String(i)) ?? [];
    return own.length > 0 && (own.length !== 1 || own[0].id !== `md-${String(i)}-0`);
  });
  for (const [i, name] of asBlocks.slice(0, 6)) {
    const own = byScope.get(String(i)) ?? [];
    p.push(`${name} drew ${String(own.length)} md- element(s) (${own.slice(0, 3).map((e) => e.id).join(', ')}), not the one md-${String(i)}-0 every answer is while markdown is off`);
  }
  if (asBlocks.length > 6) p.push(`… and ${String(asBlocks.length - 6)} more planted turn(s) drawn as blocks`);
  const labelOf = (turn) => String((byScope.get(String(turn)) ?? []).find((e) => e.id === `md-${String(turn)}-0`)?.label ?? '');
  const tableTurn = [...r.planted].find(([, name]) => name === 'table-at-caps')?.[0];
  if (tableTurn === undefined) p.push('table-at-caps was not planted');
  else {
    const label = labelOf(tableTurn);
    const words = ['p3166', 'past', ...Array.from({ length: 9 }, (_, c) => `h${String(c + 1)}`)];
    for (let row = 1; row <= 51; row += 1) for (let column = 1; column <= 9; column += 1) words.push(`r${String(row)}c${String(column)}`);
    const lost = words.filter((w) => !new RegExp(`(?:^|[^A-Za-z0-9])${w}(?:$|[^A-Za-z0-9])`).test(label));
    if (label !== '' && lost.length > 0) p.push(`table-at-caps drawn as written lost ${String(lost.length)} word(s): ${lost.slice(0, 6).join(', ')}`);
  }
  const writtenWhole = (turn, name, words) => {
    if (turn === undefined) return;
    const label = labelOf(turn);
    if (label === '') return;
    const lost = words.filter((w) => !label.includes(w));
    if (lost.length > 0) p.push(`${name} drawn as written lost ${J(lost.slice(0, 6))}`);
  };
  const wideTurn = [...r.planted].find(([, name]) => name === 'honest-wide')?.[0];
  writtenWhole(wideTurn, 'honest-wide', ['nothing about a session is ever silent', 'c1 | c2', '| c10 |', 'ninth | tenth', 'p3166item0', 'p3166item49', '- res.cookie("sid", id);', '+ res.cookie("sid", id, { httpOnly: true });', 'That is all.']);
  const loopTurn = [...r.planted].find(([, name]) => name === 'loop-quote-comment')?.[0];
  writtenWhole(loopTurn, 'loop-quote-comment', ['# After heading', '| head a | head b |', '- item one', '- item two']);
  const starred = [...r.planted].flatMap(([i]) => (byScope.get(String(i)) ?? []).filter((e) => /(?:^|[^*])\*\*(?:[^*]|$)/.test(String(e.label ?? ''))));
  if (starred.length > 0) p.push(`${String(starred.length)} label(s) still hold a ** pair (${starred.slice(0, 3).map((e) => e.id).join(', ')}), so the inline markdown the parent drew was not drawn`);
  return decide(p, [], `all ${String(r.planted.size)} planted turns drawn as written, markdown off: each ONE element md-<turn>-0 and no block, cell, mark or note (${String((r.markdown.elements ?? []).length)} md- elements in all); table-at-caps holding all 459 cells' words and its 51st row${wideTurn === undefined ? '' : '; honest-wide its ten columns, its - and + lines, its long cell and line whole'}${loopTurn === undefined ? '' : '; loop-quote-comment what follows the loop'}; no label holds a ** pair`);
}

/** The links an answer may never let him press (refused-schemes' words). */
const REFUSED_LINK_WORDS = ['cleartext link', 'javascript link', 'data link', 'file link', 'shortcuts link', 'tel link', 'sms link', 'mailto link', 'facetime link', 'prefs link', 'app settings link', 'itms services link', 'itms apps link', 'maps link', 'tortie link', 'upper scheme link', 'ip host link', 'localhost link', 'port link', 'underscore link', 'empty host link'];
/** The lying link's words, and the address they would have opened. */
const LYING_WORDS = 'https://apple.com';
const LYING_ADDRESS = 'https://evil.example/x';
const LONG_WORDS = 'a long address';

/**
 * MD2, MARKDOWN OFF (his ruling of 2026-10-02): NO LINK IS PRESSABLE, as in
 * the parent. The link's alert, Cancel and Open no longer apply, because no
 * answer holds a link element to tap: the markdown step read the whole
 * conversation and found none, and refused-schemes' words are no link
 * either. The lying link and the long link are drawn as their WORDS in their
 * answer's one element, and the address the lying link would have opened is
 * drawn nowhere. `planted` maps a turn index to its fixture.
 */
function gradeMd2(r) {
  if (r.markdown === null || r.markdown === undefined) return verdict(null, 'no markdown line to read the link elements from');
  if (r.planted === undefined || r.planted.size === 0) return verdict(null, 'the node reader found no planted turn in the markdown session');
  const p = [];
  const u = [];
  const links = r.markdown.links ?? [];
  if (links.length > 0) p.push(`${String(links.length)} link element(s) drawn (${links.slice(0, 4).map((l) => J(String(l.label ?? '').slice(0, 40))).join(', ')}); while markdown is off no link can be pressed, as in the parent`);
  for (const w of REFUSED_LINK_WORDS) if (links.some((l) => l.label === w)) p.push(`"${w}" is a link element; its address is refused`);
  const labelOf = (name) => {
    const turn = [...r.planted].find(([, n]) => n === name)?.[0];
    if (turn === undefined) return null;
    return String((r.markdown.elements ?? []).find((e) => e.id === `md-${String(turn)}-0`)?.label ?? '');
  };
  const lying = labelOf('lying-link');
  if (lying === null) u.push('lying-link was not planted');
  else {
    if (!lying.includes(LYING_WORDS)) p.push(`lying-link's answer does not draw its words ${J(LYING_WORDS)}`);
    if (lying.includes('evil.example')) p.push(`lying-link's answer draws the address ${LYING_ADDRESS}, which the parent's rendering removes`);
  }
  const long = labelOf('long-link');
  if (long === null) u.push('long-link was not planted');
  else if (!long.includes(LONG_WORDS)) p.push(`long-link's answer does not draw its words ${J(LONG_WORDS)}`);
  const stray = (r.events ?? []).filter((e) => e.step === 'link' && e.alert !== null && e.alert !== undefined);
  if (stray.length > 0) p.push(`a link tap showed an alert (${J(String(stray[0].alert?.title ?? '').slice(0, 60))})`);
  return decide(p, u, `no link element in any planted answer (${String((r.markdown.elements ?? []).length)} md- elements read), none of ${String(REFUSED_LINK_WORDS.length)} refused links among them; the lying link and the long link drawn as their words, ${LYING_ADDRESS} drawn nowhere, as the parent drew every link`);
}

/** MD3: the loopback listener every image and refused link points at was never dialled. */
function gradeMd3(r) {
  if (r.port === null || r.port === undefined) return verdict(null, 'the MD3 listener never started');
  if (r.planted === 0) return verdict(null, 'no turn naming the listener was planted');
  return decide(r.connections === 0 ? [] : [`the listener on 127.0.0.1:${String(r.port)} counted ${String(r.connections)} connection(s)`], [], `the listener on 127.0.0.1:${String(r.port)} counted 0 connections over the whole run`);
}

/**
 * S6: Settings names the paired Mac, its fingerprint is the Mac's row for
 * this phone and the one Pairing drew, the version is the build's, and the
 * Alerts card reads what iOS allows, or is absent for a Mac that cannot send.
 */
function gradeS6(r) {
  const d = r.dump;
  if (d === null || d === undefined) return verdict(null, 'the UI test printed no "settings" dump');
  if (el(d, 'screen-settings') === null) return verdict(false, 'the Settings tab was not drawn');
  const p = [];
  const u = [];
  const label = (id) => el(d, id)?.label ?? null;
  const first = String(r.publicName ?? '').split('.')[0];
  if (label('settings-mac-name') !== first) p.push(`the Mac's name reads ${J(label('settings-mac-name'))}, not ${J(first)}`);
  if (label('settings-mac-address') !== `${String(r.publicName)}:${String(r.publicPort)}`) p.push(`the address reads ${J(label('settings-mac-address'))}, not ${J(`${String(r.publicName)}:${String(r.publicPort)}`)}`);
  const fp = fingerprintDigits(label('settings-fingerprint'));
  if (r.macFingerprint === null || r.macFingerprint === undefined) u.push('the Mac lists no row for this phone to compare the fingerprint with');
  else if (fp !== fingerprintDigits(r.macFingerprint)) p.push('the fingerprint is not the Mac\'s row for this phone');
  if (r.drawnFingerprint !== null && r.drawnFingerprint !== undefined && fp !== fingerprintDigits(r.drawnFingerprint)) p.push('the fingerprint is not the one Pairing drew');
  if (fp.length !== 24) p.push(`the fingerprint holds ${String(fp.length)} hex digits, not 24`);
  if (r.version === null) u.push('the project\'s version could not be read');
  else if (label('settings-version') !== r.version) p.push(`the version reads ${J(label('settings-version'))}, not ${J(r.version)}`);
  if (r.alerts === 'absent') {
    if (el(d, 'settings-alerts') !== null || el(d, 'settings-notifications') !== null) p.push('the Alerts card is drawn for a Mac that cannot send');
  } else {
    const state = label('settings-notifications-state');
    if (el(d, 'settings-alerts') === null) p.push('the Alerts card is not drawn for a Mac that can send');
    else if (state !== r.alerts) p.push(`the Alerts row reads ${J(state)}, not ${J(r.alerts)}`);
  }
  return decide(p, u, `the Mac named ${first} at ${String(r.publicName)}:${String(r.publicPort)}, the fingerprint the Mac's row and Pairing's, ${String(r.version)}, and the Alerts card ${r.alerts === 'absent' ? 'absent' : `reading ${String(r.alerts)}`}`);
}

/**
 * U1: Cancel changes no label; Unpair draws Pairing with its not-paired line;
 * the app dials nothing in the 20 s after; a relaunch with no forget seam
 * draws Pairing; the Mac still lists the phone; and a new code pairs again,
 * landing on Needs input.
 */
function gradeU1(r) {
  const p = [];
  const u = [];
  const before = r.settings;
  const cancelled = r.cancelDump;
  if (before === null || cancelled === null) u.push(`no ${before === null ? '"settings"' : '"unpair-cancel"'} dump`);
  else {
    const was = new Map((before.elements ?? []).filter((e) => String(e.id).startsWith('settings-')).map((e) => [e.id, e.label]));
    const now = new Map((cancelled.elements ?? []).filter((e) => String(e.id).startsWith('settings-')).map((e) => [e.id, e.label]));
    const moved = [...was].filter(([id, label]) => now.get(id) !== label).map(([id]) => id);
    if (was.size === 0) u.push('the "settings" dump holds no settings element');
    if (moved.length > 0) p.push(`Cancel changed ${moved.join(', ')}`);
  }
  if (r.sheet === null) u.push('the UI test printed no unpair-sheet line');
  else {
    const said = [r.sheet.title, ...(r.sheet.texts ?? [])].filter((x) => typeof x === 'string');
    if (r.question !== null && !said.includes(r.question)) p.push(`the question does not read ${J(r.question)}`);
    if (r.note !== null && !said.includes(r.note)) p.push('the question does not carry Unpair\'s note');
    for (const b of ['Unpair', 'Cancel']) if (!(r.sheet.buttons ?? []).includes(b)) p.push(`the question has no ${b}`);
  }
  if (r.unpaired === null) u.push('no "unpair" dump');
  else {
    if (el(r.unpaired, 'screen-pairing') === null) p.push('Unpair did not draw Pairing');
    if (el(r.unpaired, 'pairing-line')?.label !== r.notPaired) p.push(`Pairing's line reads ${J(el(r.unpaired, 'pairing-line')?.label ?? null)}, not the not-paired line`);
  }
  if (r.relay === null) u.push('the relay was not counted around Unpair');
  else {
    if (r.relay.waitedMs < 20_000) u.push(`only ${String(r.relay.waitedMs)} ms were counted, under 20 s`);
    if (r.relay.after !== r.relay.before) p.push(`the app dialled the door ${String(r.relay.after - r.relay.before)} time(s) after Unpair`);
  }
  if (r.relaunch === null) u.push('no "relaunch-keep" dump');
  else if (el(r.relaunch, 'screen-pairing') === null) p.push('a relaunch with no forget seam did not draw Pairing, so the pairing was kept');
  if (r.stillListed === null) u.push('the Mac\'s status could not be read');
  else if (!r.stillListed) p.push('the Mac no longer lists the phone (its half of Unpair is Phase 317\'s)');
  if (r.again === null) u.push('the second drive printed no "pair-end" dump');
  else if (el(r.again, 'screen-needs-input') === null) p.push('a new code did not pair again onto Needs input');
  return decide(p, u, 'Cancel changed nothing; Unpair drew Pairing with its not-paired line; 0 dials in 20 s; a relaunch drew Pairing; the Mac still lists the phone; a new code paired again onto Needs input');
}

/**
 * HM: a markdown arm of the hostile door ends drawn, alive, with an md-
 * element for every turn the drive reached. The drive reads from the newest
 * turn back, for as long as its wait allows; a turn OLDER than the oldest it
 * reached was never on screen, so it is UNREADABLE, never a failure (the fix
 * round: the rederive verifier's 60 s reached 20 of 32 turns of a 105,000
 * point page, every one of them drawn, and the arm said FAIL). A turn missing
 * between two that drew, or the newest one, is a failure.
 */
function gradeHm(r) {
  if (r.events.length === 0) return verdict(null, 'the UI test printed no P316 line');
  const p = [];
  const u = [];
  const md = r.events.find((e) => e.step === 'markdown') ?? null;
  const d = lastDump(r.events, 'markdown') ?? lastDump(r.events, 'conversation');
  if (d === null || el(d, 'screen-conversation') === null) p.push('the conversation was not drawn');
  const failures = r.events.filter((e) => e.step === 'screen').flatMap((x) => x.elements ?? []).filter((e) => /-failure$/.test(String(e.id)) && String(e.label ?? '') !== '');
  if (failures.length > 0) p.push(`a failure was drawn (${[...new Set(failures.map((e) => e.id))].join(', ')})`);
  const scopes = new Set((md?.elements ?? []).map((e) => /^md-(\d+)-/.exec(String(e.id))?.[1]).filter((s) => s !== undefined).map(Number));
  if (md === null) p.push('no markdown line');
  else if (scopes.size === 0) p.push(`no turn drew an md- element, of ${String(r.turnCount)}`);
  else {
    const oldest = Math.min(...scopes);
    const gaps = [];
    for (let i = oldest; i < r.turnCount; i += 1) if (!scopes.has(i)) gaps.push(i);
    if (gaps.length > 0) p.push(`${String(gaps.length)} turn(s) the drive passed drew no md- element (${gaps.slice(0, 8).join(', ')})`);
    if (oldest > 0) u.push(`${String(oldest)} older turn(s) were never reached in the drive's time, so whether they drew is unread`);
  }
  if (r.alive !== RUNNING_FOREGROUND) p.push(`the app ended in state ${J(r.alive)}`);
  if (r.connections !== 0) p.push(`the MD3 listener counted ${String(r.connections)} connection(s)`);
  return decide(p, u, `the conversation drawn, ${String(scopes.size)} of ${String(r.turnCount)} turns with md- elements, no failure, alive, the listener undialled`);
}

/**
 * PR's no-regression check (SPEC §7.6): every letter-or-digit word the parent
 * drew for a planted answer, HEAD draws at least as often, except, each
 * counted and printed, a fence's info string and a task box's `x`. Since the
 * fix round no word past a table's caps is excused: none is lost.
 * `pairs` is `[{ name, parent, head, source }]`.
 */
function regressedWords(pairs) {
  const lost = [];
  const excused = { fence: 0, task: 0 };
  for (const pair of pairs) {
    const want = wordCounts(pair.parent);
    const have = wordCounts(pair.head);
    const design = undrawnByDesign(pair.source);
    for (const [w, n] of want) {
      let short = n - (have.get(w) ?? 0);
      if (short <= 0) continue;
      for (const kind of ['fence', 'task']) {
        const room = Math.min(short, design[kind].get(w) ?? 0);
        excused[kind] += room;
        short -= room;
      }
      if (short > 0) lost.push({ name: pair.name, word: w, short });
    }
  }
  return { lost, excused };
}

/**
 * Whether a renderer's Swift source removes every link and every image
 * address from what it draws (the PR arm's read of the parent's own rule).
 * Two spellings mean the same removal: the attribute's property (`x.link =
 * nil`, `x.imageURL = nil`) and its key, `[K.self] = nil`, where `K` is the
 * attribute itself or a typealias of it. The parent (316.5, `28d89295`) writes
 * the second through `typealias Link = …LinkAttribute` and `typealias Image =
 * …ImageURLAttribute`, which the first regex here never matched, so PR read
 * UNREADABLE at the real parent although it lost no word (the reverify of
 * 2026-10-01, problem 3).
 */
function sourceStripsLinks(source) {
  const text = String(source ?? '');
  const removes = (property, attribute) => {
    if (new RegExp(`\\.${property}\\s*=\\s*nil\\b`).test(text)) return true;
    const names = [attribute, ...[...text.matchAll(new RegExp(`typealias\\s+(\\w+)\\s*=\\s*[\\w.]*\\b${attribute}\\b`, 'g'))].map((m) => m[1])];
    return names.some((name) => new RegExp(`\\[\\s*(?:[\\w.]*\\.)?${name}\\.self\\s*\\]\\s*=\\s*nil\\b`).test(text));
  };
  return removes('link', 'LinkAttribute') && removes('imageURL', 'ImageURLAttribute');
}

/** The parent's link rule, read from ITS OWN ios/Tortie/Screens/AnswerText.swift under `parentRoot`: true, false, or null when that file cannot be read. */
function readParentStripsLinks(parentRoot) {
  try {
    return sourceStripsLinks(readFileSync(join(parentRoot, 'ios', 'Tortie', 'Screens', 'AnswerText.swift'), 'utf8'));
  } catch {
    return null;
  }
}

/**
 * PR: the parent app over the same turns draws no tab, a table as pipes, no
 * link, and no word HEAD loses. MARKDOWN OFF (his ruling of 2026-10-02): HEAD
 * draws every planted answer as written, which IS the parent's drawing, so
 * each pair's label is also held EQUAL to the parent's, character for
 * character; the first difference is named.
 */
function gradePr(r) {
  if (r.parent === null) return verdict(null, 'the parent app was not driven');
  if (r.parent.events.length === 0) return verdict(null, 'the parent\'s own UI test printed no P316 line');
  const p = [];
  const u = [];
  const screens = r.parent.events.filter((e) => e.step === 'screen');
  if (screens.some((d) => el(d, 'screen-needs-input') !== null)) p.push('the parent drew a Needs input tab, which 316.5 did not have');
  if (!screens.some((d) => el(d, 'screen-list') !== null)) u.push('the parent never drew its list');
  const turns = r.parent.events.find((e) => e.step === 'turns') ?? null;
  if (turns === null) u.push('the parent printed no turns line');
  else {
    const table = r.tableTurn === null ? null : turns.answers?.[String(r.tableTurn)] ?? null;
    if (table === null) u.push('the parent drew no answer for table-at-caps');
    else if (!table.includes('|')) p.push('the parent drew table-at-caps without its pipes, so it is not the parent');
  }
  if (r.parentStripsLinks !== true) u.push('the parent\'s own source was not read for its link rule');
  const { lost, excused } = regressedWords(r.pairs);
  if (r.pairs.length === 0) u.push('no planted answer was read at both builds');
  for (const l of lost.slice(0, 8)) p.push(`${l.name}: HEAD draws "${l.word}" ${String(l.short)} time(s) fewer than the parent`);
  if (lost.length > 8) p.push(`… and ${String(lost.length - 8)} more`);
  const unequal = r.pairs.filter((pair) => pair.head !== pair.parent);
  for (const pair of unequal.slice(0, 4)) {
    let at = 0;
    while (at < pair.head.length && at < pair.parent.length && pair.head[at] === pair.parent[at]) at += 1;
    p.push(`${pair.name}: HEAD's drawn answer is not the parent's (${String(pair.head.length)} against ${String(pair.parent.length)} characters, first different at ${String(at)}: ${J(pair.head.slice(at, at + 24))} against ${J(pair.parent.slice(at, at + 24))}); markdown is off, so it is the parent's drawing exactly`);
  }
  if (unequal.length > 4) p.push(`… and ${String(unequal.length - 4)} more answer(s) not the parent's`);
  return decide(p, u, `the parent drew no tab, table-at-caps as pipes, and (read from its own AnswerText.swift) no pressable link; over ${String(r.pairs.length)} planted answer(s) HEAD draws each one exactly as the parent did, character for character (markdown off), and so every word the parent drew, excused by design: ${String(excused.fence)} fence info word(s), ${String(excused.task)} task box x(s)`);
}

/** Every new grader above, proved on readings written here. Launches nothing. */
function tabsSelfTest() {
  const cases = [];
  const add = (what, grader, input, want) => cases.push({ what, got: () => grader(input).ok, want });
  const edit = (base, fn) => {
    const copy = structuredClone(base);
    fn(copy);
    return copy;
  };
  // The composer and the words.
  const composed = composeScopes([
    { id: 'md-3-1', label: 'para' },
    { id: 'md-3-0', label: 'Head' },
    { id: 'md-3-2-mark', label: '•' },
    { id: 'md-3-2', label: 'item' },
    { id: 'md-3-4-r1c0', label: 'b1' },
    { id: 'md-3-4-r0c1', label: 'h2' },
    { id: 'md-3-4-r0c0', label: 'h1' },
    { id: 'md-3-4', label: '' },
    { id: 'md-3-4-more', label: '1 more row' },
    { id: 'md-3-rest', label: 'cut' },
    { id: 'md-last-0', label: 'last' }
  ]);
  cases.push({ what: 'composer: pre-order, mark before its item, cells by row and column, the note, the cut last', got: () => composed['3'] === 'Head\npara\n•\nitem\nh1\nh2\nb1\n1 more row\ncut' && composed.last === 'last', want: true });
  const design = undrawnByDesign('```ts\nx\n```\n- [x] done\n| a | b | c | d | e | f | g | h | i9 |\n| - | - | - | - | - | - | - | - | - |\n| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | past |\n');
  cases.push({ what: 'undrawn by design: the fence info and the task box, and no table word', got: () => design.fence.get('ts') === 1 && design.task.get('x') === 1 && design.cap === undefined, want: true });
  cases.push({ what: 'badge: a number in the value', got: () => badgeNumber({ value: '3 items', label: 'Needs input' }) === 3 && badgeNumber({ value: null, label: 'Needs input' }) === null, want: true });
  cases.push({ what: 'badge: a label inside that is only a number, and no other', got: () => badgeNumber({ value: '', label: 'Needs input', inside: ['Needs input', '3'] }) === 3 && badgeNumber({ value: '', label: 'Needs input', inside: ['Needs input', 'item 3'] }) === null, want: true });
  // T2a
  const pairEnd = { step: 'screen', name: 'pair-end', elements: [{ id: 'screen-needs-input', label: '' }] };
  add('T2a honest', gradeT2a, { pairEnd }, true);
  add('T2a landed on Sessions', gradeT2a, { pairEnd: { ...pairEnd, elements: [{ id: 'screen-list', label: '' }] } }, false);
  add('T2a no dump (UNREADABLE)', gradeT2a, { pairEnd: null }, null);
  // T2b
  const read = (n) => ({ rows: Array.from({ length: n }, (_, i) => ({ sessionId: String(i) })) });
  const t2b = { badges: [{ event: { step: 'badge', label: 'Needs input', value: '2', found: true }, reads: [read(2), read(2)] }] };
  add('T2b honest', gradeT2b, t2b, true);
  add('T2b a count that ticked between the reads', gradeT2b, edit(t2b, (x) => { x.badges[0].reads = [read(1), read(2)]; }), true);
  add('T2b a badge that is not the door\'s count', gradeT2b, edit(t2b, (x) => { x.badges[0].event.value = '3'; }), false);
  add('T2b no badge while rows wait', gradeT2b, edit(t2b, (x) => { x.badges[0].event.value = null; }), false);
  add('T2b a badge while nothing waits', gradeT2b, edit(t2b, (x) => { x.badges[0].reads = [read(0), read(0)]; x.badges[0].event.value = '1'; }), false);
  add('T2b no badge and nothing waits', gradeT2b, edit(t2b, (x) => { x.badges[0].reads = [read(0)]; x.badges[0].event.value = null; }), true);
  add('T2b an empty value on iOS 26 (UNREADABLE)', gradeT2b, edit(t2b, (x) => { x.badges[0].event.value = ''; x.badges[0].event.system = '26.3.1'; }), null);
  add('T2b an empty value on iOS 18 is a failure', gradeT2b, edit(t2b, (x) => { x.badges[0].event.value = ''; x.badges[0].event.system = '18.3.1'; }), false);
  add('T2b the number read from inside the button on iOS 26', gradeT2b, edit(t2b, (x) => { x.badges[0].event.value = ''; x.badges[0].event.system = '26.3.1'; x.badges[0].event.inside = ['Needs input', '2']; }), true);
  add('T2b a wrong number inside the button', gradeT2b, edit(t2b, (x) => { x.badges[0].event.value = ''; x.badges[0].event.system = '26.3.1'; x.badges[0].event.inside = ['5']; }), false);
  add('T2b the button not found (UNREADABLE)', gradeT2b, edit(t2b, (x) => { x.badges[0].event.found = false; }), null);
  add('T2b no badge line (UNREADABLE)', gradeT2b, { badges: [] }, null);
  // T2c
  const tabSessions = { step: 'screen', name: 'tab-sessions', elements: [{ id: 'screen-session', label: '' }, { id: 'p316-talk', label: 'p316-talk' }] };
  add('T2c honest', gradeT2c, { tabSessions, name: 'p316-talk' }, true);
  add('T2c Sessions lost its place', gradeT2c, { tabSessions: { ...tabSessions, elements: [{ id: 'screen-list', label: '' }] }, name: 'p316-talk' }, false);
  add('T2c another session on top', gradeT2c, { tabSessions, name: 'p316-md' }, false);
  add('T2c no dump (UNREADABLE)', gradeT2c, { tabSessions: null, name: 'p316-talk' }, null);
  // T2d
  const barDump = { step: 'screen', name: 'bar', elements: [{ id: 'screen-session', label: '', frame: [0, 0, 402, 874] }, { id: 'session-status', label: 'Working', frame: [16, 100, 100, 20] }, { id: 'session-open-conversation', label: '', frame: [16, 700, 370, 54] }] };
  const t2d = { bar: { step: 'bar', screen: 'screen-session', via: 'tabBar', frame: [0, 791, 402, 83] }, dump: barDump };
  add('T2d honest', gradeT2d, t2d, true);
  add('T2d the last element under the bar', gradeT2d, edit(t2d, (x) => { x.dump.elements[2].frame[1] = 760; }), false);
  add('T2d read over the list', gradeT2d, edit(t2d, (x) => { x.bar.screen = 'screen-list'; }), false);
  add('T2d no bar frame (UNREADABLE)', gradeT2d, edit(t2d, (x) => { x.bar.frame = null; }), null);
  add('T2d no bar line (UNREADABLE)', gradeT2d, { bar: null, dump: barDump }, null);
  // MD1
  const tableCells = [];
  for (let row = 0; row <= 50; row += 1) for (let column = 0; column < 9; column += 1) tableCells.push({ id: `md-7-1-r${String(row)}c${String(column)}`, label: `r${String(row)}c${String(column + 1)}` });
  const tableWritten = ['p3166 a table one row and one column past its caps', '', `|${Array.from({ length: 9 }, (_, c) => `h${String(c + 1)}`).join('|')}|`, '|-|-|-|-|-|-|-|-|-|', ...Array.from({ length: 51 }, (_, r0) => `|${Array.from({ length: 9 }, (_, c) => `r${String(r0 + 1)}c${String(c + 1)}`).join('|')}|`)].join('\n');
  const wideWritten = `p3166 an honest answer at every edge the first build cut\n\n| File | What changed |\n| src/auth/session.ts | ${'x'.repeat(300)} nothing about a session is ever silent |\n\n| c1 | c2 | c3 | c4 | c5 | c6 | c7 | c8 | c9 | c10 |\n| v1 | v2 | v3 | v4 | v5 | v6 | v7 | v8 | ninth | tenth |\n\n{"items":[{"id":"p3166item0","ok":true},{"id":"p3166item49","ok":true}]}\n\n- res.cookie("sid", id);\n+ res.cookie("sid", id, { httpOnly: true });\n\nThat is all.`;
  const md1 = {
    planted: new Map([[6, 'answer-realistic'], [7, 'table-at-caps'], [8, 'honest-wide'], [9, 'loop-quote-comment']]),
    markdown: {
      step: 'markdown',
      elements: [
        { id: 'md-6-0', label: 'What changed' }, { id: 'md-7-0', label: tableWritten },
        { id: 'md-8-0', label: wideWritten },
        { id: 'md-9-0', label: '> <!--\n> -->\n    x\n\n# After heading\n\n| head a | head b |\n| --- | --- |\n| one | two |\n\n- item one\n- item two\n' }
      ],
      links: []
    }
  };
  add('MD1 honest', gradeMd1, md1, true);
  add('MD1 a planted turn with no md- element', gradeMd1, edit(md1, (x) => { x.planted.set(10, 'quote-nested'); }), false);
  add('MD1 table-at-caps drawn as blocks, markdown off', gradeMd1, edit(md1, (x) => { x.markdown.elements = x.markdown.elements.filter((e) => e.id !== 'md-7-0'); x.markdown.elements.push({ id: 'md-7-0', label: 'p3166 a table one row and one column past its caps' }, { id: 'md-7-1', label: '' }, ...tableCells, { id: 'md-7-2', label: 'r51c1' }); }), false);
  add('MD1 table-at-caps as written lost its 51st row', gradeMd1, edit(md1, (x) => { x.markdown.elements.find((e) => e.id === 'md-7-0').label = tableWritten.split('\n').slice(0, -1).join('\n'); }), false);
  add('MD1 table-at-caps as written lost one cell', gradeMd1, edit(md1, (x) => { x.markdown.elements.find((e) => e.id === 'md-7-0').label = tableWritten.replace('|r23c4|', '||'); }), false);
  add('MD1 a counted note under the table', gradeMd1, edit(md1, (x) => { x.markdown.elements.push({ id: 'md-7-1-more', label: '1 more row' }); }), false);
  add('MD1 table-at-caps drew a second element beside its written text', gradeMd1, edit(md1, (x) => { x.markdown.elements.push({ id: 'md-7-1', label: 'r51c1' }); }), false);
  add('MD1 table-at-caps drew nothing', gradeMd1, edit(md1, (x) => { x.markdown.elements = x.markdown.elements.filter((e) => e.id !== 'md-7-0'); }), false);
  add('MD1 honest-wide drawn as blocks, markdown off', gradeMd1, edit(md1, (x) => { x.markdown.elements.push({ id: 'md-8-3-r0c0', label: 'c1' }); }), false);
  add('MD1 honest-wide as written lost its diff\'s + line', gradeMd1, edit(md1, (x) => { x.markdown.elements.find((e) => e.id === 'md-8-0').label = wideWritten.replace('+ res.cookie', 'res.cookie'); }), false);
  add('MD1 honest-wide as written lost its long cell', gradeMd1, edit(md1, (x) => { x.markdown.elements.find((e) => e.id === 'md-8-0').label = wideWritten.replace(' nothing about a session is ever silent', '\u2026'); }), false);
  add('MD1 honest-wide as written lost its long line', gradeMd1, edit(md1, (x) => { x.markdown.elements.find((e) => e.id === 'md-8-0').label = wideWritten.replace('p3166item49', 'p3166item4'); }), false);
  add('MD1 loop-quote-comment as written lost its table', gradeMd1, edit(md1, (x) => { x.markdown.elements.find((e) => e.id === 'md-9-0').label = 'After heading\n- item one\n- item two'; }), false);
  add('MD1 loop-quote-comment drawn as blocks', gradeMd1, edit(md1, (x) => { x.markdown.elements.push({ id: 'md-9-3', label: 'After heading' }); }), false);
  add('MD1 a label holding **', gradeMd1, edit(md1, (x) => { x.markdown.elements[0].label = '**What changed**'; }), false);
  // Markdown off (his ruling of 2026-10-02): EVERY planted answer is one
  // element drawn as written, a short one included, and a rule written as
  // `***` is its characters, not a ** pair.
  add('MD1 a short answer drawn as blocks, markdown off', gradeMd1, edit(md1, (x) => { x.planted.set(10, 'quote-nested'); x.markdown.elements.push({ id: 'md-10-0', label: '' }, { id: 'md-10-1', label: 'nested' }); }), false);
  add('MD1 answer-realistic with a mark beside its text', gradeMd1, edit(md1, (x) => { x.markdown.elements.push({ id: 'md-6-2-mark', label: '-' }); }), false);
  add('MD1 a short answer drawn as written', gradeMd1, edit(md1, (x) => { x.planted.set(10, 'quote-nested'); x.markdown.elements.push({ id: 'md-10-0', label: '> one\n> > nested' }); }), true);
  add('MD1 a rule written as *** is no ** pair', gradeMd1, edit(md1, (x) => { x.planted.set(10, 'setext-and-rules'); x.markdown.elements.push({ id: 'md-10-0', label: 'Title one\n=========\n\n***\n- - -' }); }), true);
  add('MD1 no markdown line (UNREADABLE)', gradeMd1, { ...md1, markdown: null }, null);
  // MD2, markdown off (his ruling of 2026-10-02): no link element at all.
  const md2 = {
    planted: new Map([[10, 'lying-link'], [11, 'long-link']]),
    markdown: {
      step: 'markdown',
      elements: [{ id: 'md-10-0', label: LYING_WORDS }, { id: 'md-11-0', label: `${LONG_WORDS}.` }],
      links: []
    },
    events: []
  };
  add('MD2 honest', gradeMd2, md2, true);
  add('MD2 a link element drawn', gradeMd2, edit(md2, (x) => { x.markdown.links.push({ label: 'pull request' }); }), false);
  add('MD2 the lying link a link element', gradeMd2, edit(md2, (x) => { x.markdown.links.push({ label: LYING_WORDS }); }), false);
  add('MD2 a javascript link pressable', gradeMd2, edit(md2, (x) => { x.markdown.links.push({ label: 'javascript link' }); }), false);
  add('MD2 the lying link\'s address drawn', gradeMd2, edit(md2, (x) => { x.markdown.elements[0].label = `${LYING_WORDS} ${LYING_ADDRESS}`; }), false);
  add('MD2 the lying link\'s words lost', gradeMd2, edit(md2, (x) => { x.markdown.elements[0].label = ''; }), false);
  add('MD2 the long link\'s words lost', gradeMd2, edit(md2, (x) => { x.markdown.elements[1].label = 'a long'; }), false);
  add('MD2 a link tap that showed an alert', gradeMd2, edit(md2, (x) => { x.events.push({ step: 'link', label: LYING_WORDS, found: true, alert: { title: LYING_ADDRESS, texts: [], buttons: ['Cancel', 'Open'] } }); }), false);
  add('MD2 lying-link not planted (UNREADABLE)', gradeMd2, edit(md2, (x) => { x.planted.delete(10); }), null);
  add('MD2 no markdown line (UNREADABLE)', gradeMd2, { ...md2, markdown: null }, null);
  // MD3
  add('MD3 honest', gradeMd3, { port: 50_000, connections: 0, planted: 25 }, true);
  add('MD3 one connection', gradeMd3, { port: 50_000, connections: 1, planted: 25 }, false);
  add('MD3 no listener (UNREADABLE)', gradeMd3, { port: null, connections: 0, planted: 25 }, null);
  // S6
  const settingsDump = {
    step: 'screen',
    name: 'settings',
    elements: [
      { id: 'screen-settings', label: '' },
      { id: 'settings-mac-name', label: 'studio' },
      { id: 'settings-mac-address', label: 'studio.tail0000.ts.net:8443' },
      { id: 'settings-fingerprint', label: '7c4d 2a9e 0f13 b6c2 91de 4a07' },
      { id: 'settings-version', label: '1.0.0 (4)' },
      { id: 'settings-alerts', label: '' },
      { id: 'settings-notifications', label: 'Notifications' },
      { id: 'settings-notifications-state', label: 'Allowed' }
    ]
  };
  const s6 = { dump: settingsDump, publicName: 'studio.tail0000.ts.net', publicPort: 8443, macFingerprint: '7c4d2a9e0f13b6c291de4a07', drawnFingerprint: '7c4d 2a9e 0f13 b6c2 91de 4a07', version: '1.0.0 (4)', alerts: 'Allowed' };
  add('S6 honest', gradeS6, s6, true);
  add('S6 the name is not the public name\'s first label', gradeS6, edit(s6, (x) => { x.dump.elements[1].label = 'studio.tail0000'; }), false);
  add('S6 the address without its port', gradeS6, edit(s6, (x) => { x.dump.elements[2].label = 'studio.tail0000.ts.net'; }), false);
  add('S6 a fingerprint that is not the Mac\'s row', gradeS6, edit(s6, (x) => { x.macFingerprint = 'ffff2a9e0f13b6c291de4a07'; }), false);
  add('S6 a fingerprint that is not Pairing\'s', gradeS6, edit(s6, (x) => { x.drawnFingerprint = 'ffff 2a9e 0f13 b6c2 91de 4a07'; }), false);
  add('S6 the old build', gradeS6, edit(s6, (x) => { x.dump.elements[4].label = '1.0.0 (3)'; }), false);
  add('S6 Off where iOS allows', gradeS6, edit(s6, (x) => { x.dump.elements[7].label = 'Off'; }), false);
  add('S6 denied reads Off', gradeS6, edit(s6, (x) => { x.alerts = 'Off'; x.dump.elements[7].label = 'Off'; }), true);
  add('S6 the card for a Mac that cannot send', gradeS6, edit(s6, (x) => { x.alerts = 'absent'; }), false);
  add('S6 no card for a Mac that cannot send', gradeS6, edit(s6, (x) => { x.alerts = 'absent'; x.dump.elements.splice(5, 3); }), true);
  add('S6 no card for a Mac that can send', gradeS6, edit(s6, (x) => { x.dump.elements.splice(5, 3); }), false);
  add('S6 no Mac row (UNREADABLE)', gradeS6, edit(s6, (x) => { x.macFingerprint = null; }), null);
  add('S6 no dump (UNREADABLE)', gradeS6, { ...s6, dump: null }, null);
  // U1
  const unpairDump = { step: 'screen', name: 'unpair', elements: [{ id: 'screen-pairing', label: '' }, { id: 'pairing-line', label: 'This iPhone is not paired with a Mac.' }] };
  const u1 = {
    settings: settingsDump,
    // A dump of its own: structuredClone keeps a shared array shared.
    cancelDump: structuredClone({ ...settingsDump, name: 'unpair-cancel' }),
    sheet: { step: 'unpair-sheet', title: 'Unpair this iPhone?', texts: ['Unpair this iPhone?', 'The note.'], buttons: ['Unpair', 'Cancel'] },
    question: 'Unpair this iPhone?',
    note: 'The note.',
    unpaired: unpairDump,
    notPaired: 'This iPhone is not paired with a Mac.',
    relay: { before: 7, after: 7, waitedMs: 20_100 },
    relaunch: { step: 'screen', name: 'relaunch-keep', elements: [{ id: 'screen-pairing', label: '' }] },
    stillListed: true,
    again: pairEnd
  };
  add('U1 honest', gradeU1, u1, true);
  add('U1 Cancel changed a label', gradeU1, edit(u1, (x) => { x.cancelDump.elements[3].label = '—'; }), false);
  add('U1 the question in other words', gradeU1, edit(u1, (x) => { x.sheet.title = 'Forget this Mac?'; x.sheet.texts = ['Forget this Mac?', 'The note.']; }), false);
  add('U1 no Cancel in the question', gradeU1, edit(u1, (x) => { x.sheet.buttons = ['Unpair']; }), false);
  add('U1 Unpair left Settings up', gradeU1, edit(u1, (x) => { x.unpaired.elements = [{ id: 'screen-settings', label: '' }]; }), false);
  add('U1 Pairing without its line', gradeU1, edit(u1, (x) => { x.unpaired.elements[1].label = ''; }), false);
  add('U1 a dial after Unpair', gradeU1, edit(u1, (x) => { x.relay.after = 8; }), false);
  add('U1 a short count (UNREADABLE)', gradeU1, edit(u1, (x) => { x.relay.waitedMs = 5_000; }), null);
  add('U1 the pairing kept across a relaunch', gradeU1, edit(u1, (x) => { x.relaunch.elements = [{ id: 'screen-needs-input', label: '' }]; }), false);
  add('U1 the Mac forgot the phone', gradeU1, edit(u1, (x) => { x.stillListed = false; }), false);
  add('U1 the second pairing landed elsewhere', gradeU1, edit(u1, (x) => { x.again.elements = [{ id: 'screen-list', label: '' }]; }), false);
  add('U1 no second drive (UNREADABLE)', gradeU1, edit(u1, (x) => { x.again = null; }), null);
  // HM
  const hm = {
    turnCount: 2,
    alive: RUNNING_FOREGROUND,
    connections: 0,
    events: [
      { step: 'markdown', elements: [{ id: 'md-0-0', label: 'a' }, { id: 'md-1-0', label: 'b' }], links: [] },
      { step: 'screen', name: 'markdown', elements: [{ id: 'screen-conversation', label: '' }] }
    ]
  };
  add('HM honest', gradeHm, hm, true);
  add('HM the newest turn drew nothing', gradeHm, edit(hm, (x) => { x.turnCount = 3; }), false);
  add('HM a turn between two that drew drew nothing', gradeHm, edit(hm, (x) => { x.turnCount = 3; x.events[0].elements.push({ id: 'md-2-0', label: 'c' }); x.events[0].elements = x.events[0].elements.filter((e) => e.id !== 'md-1-0'); }), false);
  add('HM older turns never reached (UNREADABLE)', gradeHm, edit(hm, (x) => { x.turnCount = 4; x.events[0].elements = [{ id: 'md-2-0', label: 'c' }, { id: 'md-3-0', label: 'd' }]; }), null);
  add('HM a failure drawn', gradeHm, edit(hm, (x) => { x.events[1].elements.push({ id: 'conversation-failure', label: 'x' }); }), false);
  add('HM the app ended', gradeHm, edit(hm, (x) => { x.alive = 1; }), false);
  add('HM the listener dialled', gradeHm, edit(hm, (x) => { x.connections = 1; }), false);
  add('HM no conversation', gradeHm, edit(hm, (x) => { x.events[1].elements = []; }), false);
  add('HM no line (UNREADABLE)', gradeHm, { ...hm, events: [] }, null);
  // PR
  const pr = {
    tableTurn: 7,
    parentStripsLinks: true,
    parent: { events: [{ step: 'screen', name: 'list', elements: [{ id: 'screen-list', label: '' }] }, { step: 'turns', answers: { 7: '| h1 | h2 |' } }] },
    pairs: [{ name: 'answer-realistic', parent: '```ts\nWhat changed [x] done Reviewer', head: '```ts\nWhat changed [x] done Reviewer', source: '```ts\nx\n```\n- [x] done\n| a | b | c | d | e | f | g | h | Reviewer |\n| - | - | - | - | - | - | - | - | - |\n' }]
  };
  add('PR honest: each answer drawn exactly as the parent drew it', gradePr, pr, true);
  // Markdown off: the ruled round's honest pair (blocks, every lost word
  // excused by design) is now a failure, because HEAD draws the parent's.
  add('PR an answer drawn as blocks, every loss excused by design', gradePr, edit(pr, (x) => { x.pairs[0].head = 'What changed\ndone\nReviewer'; }), false);
  add('PR an answer that differs from the parent by its spacing alone', gradePr, edit(pr, (x) => { x.pairs[0].head = '```ts\nWhat changed  [x] done Reviewer'; }), false);
  add('PR a word HEAD lost', gradePr, edit(pr, (x) => { x.pairs[0].head = 'What\ndone\nReviewer'; }), false);
  add('PR a word past a table\'s old caps is no longer excused', gradePr, edit(pr, (x) => { x.pairs[0].head = 'What changed\ndone'; }), false);
  add('PR the parent drew a tab', gradePr, edit(pr, (x) => { x.parent.events[0].elements.push({ id: 'screen-needs-input', label: '' }); }), false);
  add('PR the parent drew the table without pipes', gradePr, edit(pr, (x) => { x.parent.events[1].answers[7] = 'h1 h2'; }), false);
  add('PR no planted answer at both builds (UNREADABLE)', gradePr, edit(pr, (x) => { x.pairs = []; }), null);
  add('PR the parent not driven (UNREADABLE)', gradePr, { ...pr, parent: null }, null);
  // The parent's link rule, read from source. PARENT_ANSWER_TEXT is the body of
  // `AnswerMarkdown.render` in 28d89295's ios/Tortie/Screens/AnswerText.swift,
  // copied byte for byte: the typealias form the first regex never matched.
  const PARENT_ANSWER_TEXT = [
    '    static func render(_ answer: String) -> AttributedString {',
    '        guard var drawn = try? AttributedString(markdown: answer, options: options) else {',
    '            return AttributedString(answer)',
    '        }',
    '        typealias Link = AttributeScopes.FoundationAttributes.LinkAttribute',
    '        typealias Image = AttributeScopes.FoundationAttributes.ImageURLAttribute',
    '        let opened = drawn.runs.compactMap { run in',
    '            run[Link.self] == nil && run[Image.self] == nil ? nil : run.range',
    '        }',
    '        for range in opened {',
    '            drawn[range][Link.self] = nil',
    '            drawn[range][Image.self] = nil',
    '        }',
    '        return drawn',
    '    }'
  ].join('\n');
  const strips = (source) => ({ ok: sourceStripsLinks(source) });
  add('PR reads the parent\'s typealias form as removing links and images', strips, PARENT_ANSWER_TEXT, true);
  add('PR reads the property form as removing links and images', strips, 'drawn[r].link = nil\ndrawn[r].imageURL = nil', true);
  add('PR reads the attribute\'s own key as removing it', strips, 'x[AttributeScopes.FoundationAttributes.LinkAttribute.self] = nil\nx[ImageURLAttribute.self] = nil', true);
  add('PR a parent that removes links but keeps image addresses does not strip', strips, PARENT_ANSWER_TEXT.replace('            drawn[range][Image.self] = nil\n', ''), false);
  add('PR a parent that removes image addresses but keeps links does not strip', strips, PARENT_ANSWER_TEXT.replace('            drawn[range][Link.self] = nil\n', ''), false);
  add('PR a key aliased to another attribute is not a link removal', strips, PARENT_ANSWER_TEXT.replace('typealias Link = AttributeScopes.FoundationAttributes.LinkAttribute', 'typealias Link = AttributeScopes.FoundationAttributes.InlinePresentationIntentAttribute'), false);
  add('PR a link only compared with nil is not removed', strips, PARENT_ANSWER_TEXT.replace(/\n {12}drawn\[range\]\[Link\.self\] = nil/, ''), false);
  // And through the probe's own read of a parent checkout: the file written
  // where P316_PARENT_IOS's ios/ keeps it, in a directory made and removed here.
  const parentRootFixture = mkdtempSync(join(tmpdir(), 'p316-pr-parent-'));
  try {
    mkdirSync(join(parentRootFixture, 'ios', 'Tortie', 'Screens'), { recursive: true });
    writeFileSync(join(parentRootFixture, 'ios', 'Tortie', 'Screens', 'AnswerText.swift'), `${PARENT_ANSWER_TEXT}\n`);
    add('PR the parent graded with its own checkout\'s source read', gradePr, { ...pr, parentStripsLinks: readParentStripsLinks(parentRootFixture) }, true);
    add('PR a parent checkout with no AnswerText.swift (UNREADABLE)', gradePr, { ...pr, parentStripsLinks: readParentStripsLinks(join(parentRootFixture, 'none')) }, null);
  } finally {
    rmSync(parentRootFixture, { recursive: true, force: true });
  }
  let bad = 0;
  for (const c of cases) {
    let got;
    try {
      got = c.got();
    } catch (err) {
      got = `threw ${String(err?.message ?? err)}`;
    }
    const ok = got === c.want;
    if (!ok) bad += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.what}: ${got === null ? 'UNREADABLE' : String(got)}`);
  }
  return { bad, total: cases.length };
}

// ---------------------------------------------------------------------------
// Phase 316.5: every grader above, proved on fixtures. Launches nothing.
// ---------------------------------------------------------------------------

/**
 * Each case is ONE honest reading or ONE clause of it broken, and says what
 * the grader must answer: true (pass), false (FAIL) or null (UNREADABLE). A
 * break answered green is a clause nothing holds; a precondition answered
 * anything but UNREADABLE is a pass or a fail the run did not earn.
 */
function alertsSelfTest() {
  const tok = { reader: 'a'.repeat(64), app: 'b'.repeat(64), floor: 'c'.repeat(64), deny: 'd'.repeat(64) };
  const pemLine = 'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgSELFTEST';
  const pemText = `-----BEGIN PRIVATE KEY-----\n${pemLine}\n-----END PRIVATE KEY-----\n`;
  const row = { sessionId: 's1', name: 'p316-alert', statusLabel: 'needs input', project: 'project', agentLabel: 'Claude Code', machine: null };
  const single = composeSingleAlert(row, 2);
  const cases = [];
  const add = (what, grader, input, want) => cases.push({ what, got: () => grader(input).ok, want });
  const edit = (base, fn) => {
    const copy = structuredClone(base);
    fn(copy);
    return copy;
  };

  // The composer, against the pinned bytes of SPEC §5.4.
  cases.push({ what: 'composer: the single shape, byte for byte', got: () => single === '{"aps":{"alert":{"title":"p316-alert needs input","body":"project · Claude Code"},"badge":2,"sound":"default","thread-id":"s1"},"tortie":{"v":1,"session":"s1"}}', want: true });
  cases.push({ what: 'composer: the single shape with a machine', got: () => JSON.parse(composeSingleAlert({ ...row, machine: 'Mac Pro' }, 1)).aps.alert.body === 'project · Claude Code · Mac Pro', want: true });
  cases.push({ what: 'composer: the count shape, byte for byte', got: () => MAC.needsYourInput === null || composeCountAlert(['a', 'b'], 2) === `{"aps":{"alert":{"title":"${MAC.needsYourInput} (2)","body":"a · b"},"badge":2,"sound":"default","thread-id":"tortie-waiting"},"tortie":{"v":1}}`, want: true });
  cases.push({ what: 'composer: a body over 4096 bytes is refused, never sent', got: () => composeSingleAlert({ ...row, name: 'x'.repeat(5_000) }, 1) === null, want: true });

  // The preflight of the Mac's override.
  const harness = '/private/tmp/p316-selftest/harness';
  const honestOverride = { origins: { development: 'http://127.0.0.1:50001', production: 'http://127.0.0.1:50002' }, keyFile: `${harness}/alerts/AuthKey_${KEY_ID}.p8` };
  const pre = (what, json, want) => cases.push({ what: `preflight: ${what}`, got: () => alertsOverrideRefusal(json, harness) === null, want });
  pre('the honest override', honestOverride, true);
  pre('JSON null', null, false);
  pre('origins null', edit(honestOverride, (o) => (o.origins = null)), false);
  pre('a name, not an address', edit(honestOverride, (o) => (o.origins.production = 'http://localhost:50002')), false);
  pre('https', edit(honestOverride, (o) => (o.origins.development = 'https://127.0.0.1:50001')), false);
  pre('another address', edit(honestOverride, (o) => (o.origins.production = 'http://10.0.0.1:50002')), false);
  pre('Apple\'s host', edit(honestOverride, (o) => (o.origins.production = 'https://api.push.apple.com:443')), false);
  pre('port 0', edit(honestOverride, (o) => (o.origins.development = 'http://127.0.0.1:0')), false);
  pre('one environment only', edit(honestOverride, (o) => delete o.origins.production), false);
  pre('the key outside the harness', edit(honestOverride, (o) => (o.keyFile = '/Users/someone/Keys/AuthKey_ABCDEFGHIJ.p8')), false);
  pre('the key beside the harness by prefix', edit(honestOverride, (o) => (o.keyFile = `${harness}-x/AuthKey_${KEY_ID}.p8`)), false);
  pre('a third field', edit(honestOverride, (o) => (o.allowRemote = true)), false);

  // N1
  const key = { bridge: { ok: true, value: { kept: true, refusal: null } }, statusKeyId: KEY_ID, sealed: [{ name: 'apns-provider.cred', bytes: Buffer.from('sealed-bytes-that-are-not-the-key') }], pemText, pemLines: [pemLine] };
  add('N1 honest', gradeKey, key, true);
  add('N1 the bridge has no choosePushKey', gradeKey, { ...key, bridge: { ok: false, error: 'not a function' } }, false);
  add('N1 not kept', gradeKey, edit(key, (k) => (k.bridge.value.kept = false)), false);
  add('N1 a refusal', gradeKey, edit(key, (k) => (k.bridge.value.refusal = 'no')), false);
  add('N1 pushKeyId null', gradeKey, { ...key, statusKeyId: null }, false);
  add('N1 nothing sealed', gradeKey, { ...key, sealed: [] }, false);
  add('N1 the sealed file holds a PEM line', gradeKey, { ...key, sealed: [{ name: 'x', bytes: Buffer.from(`xx${pemLine}xx`) }] }, false);

  // D2+
  const readerLine = { lines: ['Allows no phone yet', alertLineFor('p316 reader', 'production', tok.reader)], label: 'p316 reader', token: tok.reader };
  add('D2+ honest', gradeReaderLine, readerLine, true);
  add('D2+ development, not production', gradeReaderLine, { ...readerLine, lines: [alertLineFor('p316 reader', 'development', tok.reader)] }, false);
  add('D2+ another token\'s digest', gradeReaderLine, { ...readerLine, lines: [alertLineFor('p316 reader', 'production', tok.app)] }, false);
  add('D2+ no line', gradeReaderLine, { ...readerLine, lines: ['Allows no phone yet'] }, false);
  add('D2+ lines never read (UNREADABLE)', gradeReaderLine, { ...readerLine, lines: null }, null);

  // N2
  const armedR = { askWaiting: true, confirmed: true, confirmWhy: '', pushAlerts: true, armedLines: 1, requests: 0, waitedMs: QUIET_AFTER_ARM_MS };
  add('N2 honest', gradeArmed, armedR, true);
  add('N2 main never read the wait (UNREADABLE)', gradeArmed, { ...armedR, askWaiting: false }, null);
  add('N2 not confirmed', gradeArmed, { ...armedR, confirmed: false }, false);
  add('N2 pushAlerts off', gradeArmed, { ...armedR, pushAlerts: false }, false);
  add('N2 never armed', gradeArmed, { ...armedR, armedLines: 0 }, false);
  add('N2 armed twice', gradeArmed, { ...armedR, armedLines: 2 }, false);
  add('N2 the old wait announced', gradeArmed, { ...armedR, requests: 1 }, false);
  add('N2 too short a wait', gradeArmed, { ...armedR, waitedMs: 3_000 }, false);

  // N0
  const askedEvents = [
    { step: 'fingerprint', text: 'ab12', seq: 1, receivedAt: 900 },
    { step: 'notifications', asked: true, title: 'x', buttons: ['Allow'], seq: 2, receivedAt: 1_000 },
    { step: 'notifications', answered: 'allow', seq: 3, receivedAt: 1_400 }
  ];
  const asked = { canSend: true, events: askedEvents, samples: [{ at: 950, state: 'waiting' }, { at: 1_050, state: 'waiting' }, { at: 1_600, state: 'presented' }], macLines: [alertLineFor('iPhone', 'development', tok.app)], label: 'iPhone', token: tok.app, phoneRow: { alerts: 'on' } };
  add('N0 honest', gradeAsked, asked, true);
  // Research 136: the phone learns the Mac can send from the Mac's answer to
  // its presentation, so a question while the Mac reads presented is honest.
  add('N0 honest, asked after the Mac\'s first answer (research 136)', gradeAsked, { ...asked, samples: [{ at: -2_000, state: 'waiting' }, { at: -1_500, state: 'presented' }, { at: 1_050, state: 'presented' }, { at: 1_600, state: 'allowed' }] }, true);
  add('N0 the Mac could not send (UNREADABLE)', gradeAsked, { ...asked, canSend: false }, null);
  add('N0 no line at all (UNREADABLE)', gradeAsked, { ...asked, events: [] }, null);
  add('N0 no sample after the question (UNREADABLE)', gradeAsked, { ...asked, samples: [{ at: 950, state: 'waiting' }] }, null);
  add('N0 no question seen', gradeAsked, edit(asked, (a) => { a.events[1].asked = false; }), false);
  add('N0 no notifications line', gradeAsked, { ...asked, events: [askedEvents[0]] }, false);
  add('N0 an answer with no question line before it', gradeAsked, { ...asked, events: [askedEvents[0], askedEvents[2]] }, false);
  add('N0 no fingerprint line', gradeAsked, { ...asked, events: askedEvents.slice(1) }, false);
  add('N0 the Mac\'s lines never read', gradeAsked, { ...asked, macLines: null }, false);
  add('N0 asked before the fingerprint', gradeAsked, edit(asked, (a) => { a.events[0].seq = 5; }), false);
  add('N0 allowed long before the question line was read', gradeAsked, { ...asked, samples: [{ at: -2_000, state: 'presented' }, { at: -1_500, state: 'allowed' }, { at: 1_050, state: 'allowed' }] }, false);
  add('N0 allowed within the line lag (UNREADABLE)', gradeAsked, { ...asked, samples: [{ at: 500, state: 'allowed' }, { at: 1_050, state: 'allowed' }] }, null);
  add('N0 answered deny', gradeAsked, edit(asked, (a) => { a.events[2].answered = 'deny'; }), false);
  add('N0 no button to press (UNREADABLE)', gradeAsked, edit(asked, (a) => { a.events[2].answered = null; }), null);
  add('N0 production, not development', gradeAsked, { ...asked, macLines: [alertLineFor('iPhone', 'production', tok.app)] }, false);
  add('N0 no alert line', gradeAsked, { ...asked, macLines: [] }, false);
  add('N0 the row reads none', gradeAsked, { ...asked, phoneRow: { alerts: 'none' } }, false);
  add('N0 no new phone', gradeAsked, { ...asked, phoneRow: null }, false);

  // N3
  const rec = (origin, token, body) => ({ origin, token, method: 'POST', status: 200, reason: null, jwt: { verifies: true }, headers: { 'apns-topic': TOPIC }, body, bodyBytes: Buffer.byteLength(body) });
  const sent = { mainBlocked: true, sessionId: 's1', composed: single, requests: [rec('development', tok.app, single), rec('production', tok.reader, single)], appToken: tok.app, readerToken: tok.reader, topic: TOPIC };
  const count = composeCountAlert(['p316-alert'], 2) ?? '{"aps":{"badge":2}}';
  add('N3 honest', gradeSent, sent, true);
  add('N3 main never read the block (UNREADABLE)', gradeSent, { ...sent, mainBlocked: false }, null);
  add('N3 no composition (UNREADABLE)', gradeSent, { ...sent, composed: null }, null);
  add('N3 nothing at development', gradeSent, { ...sent, requests: [sent.requests[1]] }, false);
  add('N3 two at development', gradeSent, { ...sent, requests: [...sent.requests, rec('development', tok.app, single)] }, false);
  add('N3 each token at the other origin', gradeSent, { ...sent, requests: [rec('development', tok.reader, single), rec('production', tok.app, single)] }, false);
  add('N3 a 400', gradeSent, edit(sent, (s) => { s.requests[0].status = 400; }), false);
  add('N3 a provider token that does not verify', gradeSent, edit(sent, (s) => { s.requests[1].jwt.verifies = false; }), false);
  add('N3 another topic', gradeSent, edit(sent, (s) => { s.requests[0].headers['apns-topic'] = 'com.example.other'; }), false);
  add('N3 not POST', gradeSent, edit(sent, (s) => { s.requests[0].method = 'GET'; }), false);
  add('N3 the count shape', gradeSent, { ...sent, requests: [rec('development', tok.app, count), rec('production', tok.reader, count)] }, false);
  add('N3 one character off the composition', gradeSent, { ...sent, requests: [rec('development', tok.app, single.replace('needs input', 'needs inpu!')), sent.requests[1]] }, false);
  add('N3 a third request', gradeSent, { ...sent, requests: [...sent.requests, rec('development', tok.floor, single)] }, false);

  // N4, N5, F1+
  const sessionDump = { step: 'screen', name: 'alert', elements: [{ id: 'screen-session', label: '' }, { id: 'p316-alert', label: 'p316-alert' }] };
  const tap = { delivery: { code: 0 }, banner: { step: 'banner', label: 'Tortie, p316-alert needs input' }, dump: sessionDump, name: 'p316-alert', cold: false, ready: { step: 'ready-for-alert' } };
  add('N4 honest', gradeTap, tap, true);
  add('N4 nothing delivered (UNREADABLE)', gradeTap, { ...tap, delivery: null }, null);
  add('N4 the delivery failed (UNREADABLE)', gradeTap, { ...tap, delivery: { code: 1 } }, null);
  add('N4 no banner line (UNREADABLE)', gradeTap, { ...tap, banner: null }, null);
  add('N4 no banner found (UNREADABLE)', gradeTap, { ...tap, banner: { step: 'banner', label: null } }, null);
  add('N4 no dump', gradeTap, { ...tap, dump: null }, false);
  add('N4 a missing dump', gradeTap, { ...tap, dump: { ...sessionDump, name: 'alert-missing', elements: [] } }, false);
  add('N4 a dump named missing over a drawn session', gradeTap, { ...tap, dump: { ...sessionDump, name: 'alert-missing' } }, false);
  add('N4 the list, a row named alike', gradeTap, { ...tap, dump: { ...sessionDump, elements: [{ id: 'screen-list', label: '' }, { id: 'row-name-s1', label: 'p316-alert' }] } }, false);
  add('N4 a session titled otherwise', gradeTap, { ...tap, dump: { ...sessionDump, elements: [{ id: 'screen-session', label: '' }, { id: 'p316-talk', label: 'p316-talk' }] } }, false);
  add('N4 a session whose name is only a label', gradeTap, { ...tap, dump: { ...sessionDump, elements: [{ id: 'screen-session', label: '' }, { id: 'session-agent', label: 'p316-alert' }] } }, false);
  add('N4 a session failure', gradeTap, { ...tap, dump: { ...sessionDump, elements: [...sessionDump.elements, { id: 'session-failure', label: 'x' }] } }, false);
  add('N5 honest cold', gradeTap, { ...tap, cold: true, ready: { step: 'ready-for-alert', cold: true } }, true);
  add('N5 the app was not terminated', gradeTap, { ...tap, cold: true, ready: { step: 'ready-for-alert' } }, false);
  add('N5 a cold launch that could not reach the door', gradeTap, { ...tap, cold: true, ready: { step: 'ready-for-alert', cold: true }, dump: { ...sessionDump, elements: [...sessionDump.elements, { id: 'session-failure', label: 'x' }] } }, false);
  const floor = { pairing: { ...asked, token: tok.floor, macLines: [alertLineFor('iPhone', 'development', tok.floor)] }, tap: { ...tap, name: 'p316-talk', dump: { ...sessionDump, elements: [{ id: 'screen-session', label: '' }, { id: 'p316-talk', label: 'p316-talk' }] } } };
  add('F1+ honest on the floor', gradeFloorTap, floor, true);
  add('F1+ the tap opened the list', gradeFloorTap, edit(floor, (f) => { f.tap.dump.elements = [{ id: 'screen-list', label: '' }]; }), false);
  add('F1+ the Mac could not send (UNREADABLE)', gradeFloorTap, edit(floor, (f) => { f.pairing.canSend = false; }), null);
  add('F1+ the floor phone never asked', gradeFloorTap, edit(floor, (f) => { f.pairing.events[1].asked = false; }), false);
  add('F1+ the floor phone\'s address never reached the Mac', gradeFloorTap, edit(floor, (f) => { f.pairing.macLines = []; }), false);
  add('F1+ no banner found (UNREADABLE)', gradeFloorTap, edit(floor, (f) => { f.tap.banner = { step: 'banner', label: null }; }), null);

  // N6
  const word = MAC.noSuchSession ?? 'the Mac word';
  const fromList = { step: 'screen', name: 'back', elements: [{ id: 'screen-needs-input', label: '' }] };
  const fromOther = { step: 'screen', name: 'visit', elements: [{ id: 'screen-session', label: '' }, { id: 'p316-talk', label: 'p316-talk' }] };
  const gone = { ...tap, gone404: true, word, alive: RUNNING_FOREGROUND, from: 'list', before: fromList, dump: { step: 'screen', name: 'alert-gone', elements: [{ id: 'screen-needs-input', label: '' }, { id: 'needs-list-notice', label: word }] } };
  add('N6 honest', gradeGone, gone, true);
  add('N6 honest, tapped from the Sessions list', gradeGone, { ...gone, before: { ...fromList, elements: [{ id: 'screen-list', label: '' }] } }, true);
  add('N6 the sentence on the Sessions list, not Needs input', gradeGone, { ...gone, dump: { ...gone.dump, elements: [{ id: 'screen-list', label: '' }, { id: 'list-notice', label: word }] } }, false);
  add('N6 tapped over the session it names (UNREADABLE)', gradeGone, { ...gone, before: { ...sessionDump, name: 'alert-cold' } }, null);
  add('N6 a session screen dumped as back (UNREADABLE)', gradeGone, { ...gone, before: { ...fromList, elements: [{ id: 'screen-session', label: '' }] } }, null);
  add('N6 nothing dumped before the tap (UNREADABLE)', gradeGone, { ...gone, before: null }, null);
  add('N6 no arrangement named (UNREADABLE)', gradeGone, { ...gone, from: undefined }, null);
  add('N6b honest, from another session', gradeGone, { ...gone, from: 'session', before: fromOther }, true);
  add('N6b from the list (UNREADABLE)', gradeGone, { ...gone, from: 'session', before: fromList }, null);
  add('N6b no notice', gradeGone, { ...gone, from: 'session', before: fromOther, dump: { ...gone.dump, elements: [{ id: 'screen-needs-input', label: '' }] } }, false);
  add('N6 the door still knew the session (UNREADABLE)', gradeGone, { ...gone, gone404: false }, null);
  add('N6 no banner found (UNREADABLE)', gradeGone, { ...gone, banner: { step: 'banner', label: null } }, null);
  add('N6 no notice', gradeGone, { ...gone, dump: { ...gone.dump, elements: [{ id: 'screen-needs-input', label: '' }] } }, false);
  add('N6 a notice in other words', gradeGone, { ...gone, dump: { ...gone.dump, elements: [{ id: 'screen-needs-input', label: '' }, { id: 'needs-list-notice', label: 'That session is gone.' }] } }, false);
  add('N6 a session still drawn', gradeGone, { ...gone, dump: { ...gone.dump, elements: [...gone.dump.elements, { id: 'screen-session', label: '' }] } }, false);
  add('N6 no list', gradeGone, { ...gone, dump: { ...gone.dump, elements: [{ id: 'needs-list-notice', label: word }] } }, false);
  add('N6 no dump', gradeGone, { ...gone, dump: null }, false);
  add('N6 the app is gone', gradeGone, { ...gone, alive: 1 }, false);
  add('N6 the Mac\'s word unread', gradeGone, { ...gone, word: null }, false);

  // N7
  const listDump = { step: 'screen', name: 'alert-list', elements: [{ id: 'screen-needs-input', label: '' }] };
  const listTaps = { taps: [{ ...tap, dump: listDump }, { ...tap, dump: listDump }], alive: RUNNING_FOREGROUND };
  add('N7 honest', gradeListTaps, listTaps, true);
  add('N7 one tap read (UNREADABLE)', gradeListTaps, { ...listTaps, taps: [listTaps.taps[0]] }, null);
  add('N7 no banner on either (UNREADABLE)', gradeListTaps, { ...listTaps, taps: listTaps.taps.map((t) => ({ ...t, banner: { step: 'banner', label: null } })) }, null);
  add('N7 a notice', gradeListTaps, { ...listTaps, taps: [listTaps.taps[0], { ...tap, dump: { ...listDump, elements: [...listDump.elements, { id: 'needs-list-notice', label: word }] } }] }, false);
  add('N7 the Sessions list, not Needs input', gradeListTaps, { ...listTaps, taps: [listTaps.taps[0], { ...tap, dump: { ...listDump, elements: [{ id: 'screen-list', label: '' }] } }] }, false);
  add('N7 ../x opened a session', gradeListTaps, { ...listTaps, taps: [listTaps.taps[0], { ...tap, dump: sessionDump }] }, false);
  add('N7 a session screen drawn over the list', gradeListTaps, { ...listTaps, taps: [listTaps.taps[0], { ...tap, dump: { ...listDump, elements: [...listDump.elements, { id: 'screen-session', label: '' }] } }] }, false);
  add('N7 the app is gone', gradeListTaps, { ...listTaps, alive: 1 }, false);
  add('N7 no dump after a tap', gradeListTaps, { ...listTaps, taps: [listTaps.taps[0], { ...tap, dump: null }] }, false);
  add('N7 no list drawn', gradeListTaps, { ...listTaps, taps: [listTaps.taps[0], { ...tap, dump: { ...listDump, elements: [] } }] }, false);

  // N8
  const relaunch = { dumps: [{ step: 'screen', name: 'relaunch', elements: [{ id: 'screen-needs-input', label: '' }, { id: 'needs-list-alerts-line', label: PAIR_AGAIN }] }, { step: 'screen', name: 'relaunch', elements: [{ id: 'screen-needs-input', label: '' }] }] };
  add('N8 honest', gradeRelaunch, relaunch, true);
  add('N8 no line for a changed token', gradeRelaunch, { dumps: [relaunch.dumps[1], relaunch.dumps[1]] }, false);
  add('N8 the line without its full stop', gradeRelaunch, { dumps: [edit(relaunch.dumps[0], (d) => { d.elements[1].label = 'Pair again to get alerts'; }), relaunch.dumps[1]] }, false);
  add('N8 a line for the same token', gradeRelaunch, { dumps: [relaunch.dumps[0], relaunch.dumps[0]] }, false);
  add('N8 no second relaunch', gradeRelaunch, { dumps: [relaunch.dumps[0]] }, false);
  add('N8 not on the list', gradeRelaunch, { dumps: [{ ...relaunch.dumps[0], elements: [{ id: 'needs-list-alerts-line', label: PAIR_AGAIN }] }, relaunch.dumps[1]] }, false);
  add('N8 the line on the Sessions list only', gradeRelaunch, { dumps: [{ ...relaunch.dumps[0], elements: [{ id: 'screen-needs-input', label: '' }, { id: 'list-alerts-line', label: PAIR_AGAIN }] }, relaunch.dumps[1]] }, false);
  add('N8 the control not on the list', gradeRelaunch, { dumps: [relaunch.dumps[0], { ...relaunch.dumps[1], elements: [] }] }, false);
  add('N8 no relaunch at all', gradeRelaunch, { dumps: [] }, false);

  // N9
  const off = { armedAtStart: true, armedBefore: 2, disarmedBefore: 1, mainBlocked: true, pushAlerts: false, disarmed: 1, requests: 0, waitedMs: QUIET_AFTER_OFF_MS };
  add('N9 honest', gradeOff, off, true);
  add('N9 not armed when it began (UNREADABLE)', gradeOff, { ...off, armedAtStart: false }, null);
  add('N9 main never read the wait (UNREADABLE)', gradeOff, { ...off, mainBlocked: false }, null);
  add('N9 still on', gradeOff, { ...off, pushAlerts: true }, false);
  add('N9 never disarmed', gradeOff, { ...off, disarmed: 0 }, false);
  add('N9 disarmed twice', gradeOff, { ...off, disarmed: 2 }, false);
  add('N9 a request with alerts off', gradeOff, { ...off, requests: 1 }, false);
  add('N9 too short a wait', gradeOff, { ...off, waitedMs: 5_000 }, false);

  // ND
  const denyEvents = [
    { step: 'fingerprint', text: 'ab', seq: 1 },
    { step: 'notifications', asked: true, seq: 2 },
    { step: 'notifications', answered: 'deny', seq: 3 },
    { step: 'screen', name: 'list', elements: [{ id: 'screen-list', label: '' }], seq: 4 },
    { step: 'screen', name: 'session', elements: [{ id: 'screen-session', label: '' }], seq: 5 },
    { step: 'screen', name: 'conversation', elements: [{ id: 'screen-conversation', label: '' }], seq: 6 },
    { step: 'ready-for-alert', seq: 7 },
    { step: 'banner', label: null, seq: 8 }
  ];
  const deny = { canSend: true, events: denyEvents, allowed: true, macLines: [alertLineFor('p316 reader', 'production', tok.reader)], alertLinesBefore: 1, token: tok.deny, phoneRow: { alerts: 'none' }, delivery: { code: 0 }, alive: RUNNING_FOREGROUND };
  add('ND honest', gradeDeny, deny, true);
  add('ND the Mac could not send (UNREADABLE)', gradeDeny, { ...deny, canSend: false }, null);
  add('ND no line at all (UNREADABLE)', gradeDeny, { ...deny, events: [] }, null);
  add('ND never delivered (UNREADABLE)', gradeDeny, { ...deny, delivery: null }, null);
  add('ND no banner line (UNREADABLE)', gradeDeny, { ...deny, events: denyEvents.filter((e) => e.step !== 'banner') }, null);
  add('ND answered allow', gradeDeny, edit(deny, (d) => { d.events[2].answered = 'allow'; }), false);
  add('ND no button to press (UNREADABLE)', gradeDeny, edit(deny, (d) => { d.events[2].answered = null; }), null);
  add('ND not asked', gradeDeny, edit(deny, (d) => { d.events[1].asked = false; }), false);
  add('ND not paired', gradeDeny, { ...deny, allowed: false }, false);
  // The count held equal, so only the seam-token clause can say it.
  add('ND the seam token reached the Mac', gradeDeny, { ...deny, macLines: [...deny.macLines, alertLineFor('iPhone', 'development', tok.deny)], alertLinesBefore: 2 }, false);
  add('ND an alert line gained', gradeDeny, { ...deny, macLines: [...deny.macLines, alertLineFor('iPhone', 'development', tok.floor)] }, false);
  add('ND the row reads on', gradeDeny, { ...deny, phoneRow: { alerts: 'on' } }, false);
  add('ND no new phone', gradeDeny, { ...deny, phoneRow: null }, false);
  add('ND the Mac\'s lines never read', gradeDeny, { ...deny, macLines: null }, false);
  add('ND no list drawn', gradeDeny, { ...deny, events: denyEvents.filter((e) => e.name !== 'list') }, false);
  add('ND no conversation drawn', gradeDeny, { ...deny, events: denyEvents.filter((e) => e.name !== 'conversation') }, false);
  add('ND delivered with a failure (UNREADABLE)', gradeDeny, { ...deny, delivery: { code: 1 } }, null);
  add('ND a banner shown', gradeDeny, edit(deny, (d) => { d.events[7].label = 'Tortie'; }), false);
  add('ND no session drawn', gradeDeny, { ...deny, events: denyEvents.filter((e) => e.name !== 'session') }, false);
  add('ND the app is gone', gradeDeny, { ...deny, alive: 1 }, false);

  // N11 (research 136): a Mac that cannot send, and a phone never asked.
  const noSendEvents = [
    { step: 'fingerprint', text: 'ab', seq: 1 },
    { step: 'notifications', asked: false, seq: 2 },
    { step: 'screen', name: 'list', elements: [{ id: 'screen-list', label: '' }, { id: 'row-name-s1', label: 'p316-ask' }], seq: 3 },
    { step: 'screen', name: 'relaunch', elements: [{ id: 'screen-needs-input', label: '' }], seq: 4 }
  ];
  const noSend = { canSend: false, events: noSendEvents, allowed: true, macLines: [alertLineFor('p316 reader', 'production', tok.reader)], alertLinesBefore: 1, token: tok.deny, phoneRow: { alerts: 'none' }, alive: RUNNING_FOREGROUND, alertWords: [PAIR_AGAIN] };
  add('N11 honest', gradeNoSend, noSend, true);
  add('N11 the Mac could send (UNREADABLE)', gradeNoSend, { ...noSend, canSend: true }, null);
  add('N11 the Mac was not read (UNREADABLE)', gradeNoSend, { ...noSend, canSend: null }, null);
  add('N11 no line at all (UNREADABLE)', gradeNoSend, { ...noSend, events: [] }, null);
  add('N11 asked although the Mac cannot send', gradeNoSend, edit(noSend, (n) => { n.events[1].asked = true; }), false);
  add('N11 no notifications line', gradeNoSend, { ...noSend, events: noSendEvents.filter((e) => e.step !== 'notifications') }, false);
  add('N11 a question answered', gradeNoSend, { ...noSend, events: [...noSendEvents, { step: 'notifications', answered: 'allow', seq: 5 }] }, false);
  add('N11 not paired', gradeNoSend, { ...noSend, allowed: false }, false);
  add('N11 the Mac\'s lines never read', gradeNoSend, { ...noSend, macLines: null }, false);
  // The count held equal, so only the seam-token clause can say it.
  add('N11 the seam token reached the Mac', gradeNoSend, { ...noSend, macLines: [...noSend.macLines, alertLineFor('iPhone', 'development', tok.deny)], alertLinesBefore: 2 }, false);
  add('N11 an alert line gained', gradeNoSend, { ...noSend, macLines: [...noSend.macLines, alertLineFor('iPhone', 'development', tok.floor)] }, false);
  add('N11 no new phone', gradeNoSend, { ...noSend, phoneRow: null }, false);
  add('N11 the row reads on', gradeNoSend, { ...noSend, phoneRow: { alerts: 'on' } }, false);
  add('N11 no relaunch', gradeNoSend, { ...noSend, events: noSendEvents.filter((e) => e.name !== 'relaunch') }, false);
  add('N11 the relaunch not on the list', gradeNoSend, edit(noSend, (n) => { n.events[3].elements = []; }), false);
  add('N11 the relaunch asks to pair again', gradeNoSend, edit(noSend, (n) => { n.events[3].elements.push({ id: 'needs-list-alerts-line', label: 'x' }); }), false);
  add('N11 an alert word drawn elsewhere', gradeNoSend, edit(noSend, (n) => { n.events[2].elements.push({ id: 'list-title-note', label: `Sessions. ${PAIR_AGAIN}` }); }), false);
  add('N11 the app is gone', gradeNoSend, { ...noSend, alive: 1 }, false);

  // N10
  const log = { log: '2026-09-30 info [push] phone alerts armed\n', printed: '', needles: [['a device token', tok.app], ['a provider token', 'eyJhbGciOiJFUzI1NiJ9.eyJpc3MiOiJ4In0.c2ln'], ['a line of the scratch key', pemLine], ['an alert body', single]] };
  add('N10 honest', gradeLog, log, true);
  add('N10 no log (UNREADABLE)', gradeLog, { ...log, log: '' }, null);
  add('N10 a token in the log', gradeLog, { ...log, log: `${log.log}token ${tok.app}\n` }, false);
  add('N10 a provider token in the log', gradeLog, { ...log, log: `${log.log}${log.needles[1][1]}\n` }, false);
  add('N10 a key line in the log', gradeLog, { ...log, log: `${log.log}${pemLine}\n` }, false);
  add('N10 a body in the log', gradeLog, { ...log, log: `${log.log}${single}\n` }, false);
  add('N10 a token printed', gradeLog, { ...log, printed: tok.app }, false);

  // The tap reader: a banner and a dump belong to the ready line before them.
  const seqEvents = [
    { step: 'ready-for-alert', seq: 5 },
    { step: 'banner', label: 'one', seq: 6 },
    { step: 'screen', name: 'alert', elements: [], seq: 7 },
    { step: 'ready-for-alert', seq: 9, cold: true },
    { step: 'screen', name: 'alert-cold-missing', elements: [], seq: 10 }
  ];
  // Research 136's switch, read the way the Mac states it.
  cases.push({ what: 'can send: a key kept and the switch on, confirmed', got: () => macCanSend({ pushAlerts: true, confirmState: 'confirmed', pushKeyId: KEY_ID }), want: true });
  cases.push({ what: 'can send: the switch on and no key', got: () => macCanSend({ pushAlerts: true, confirmState: 'confirmed', pushKeyId: null }), want: false });
  cases.push({ what: 'can send: a key and the switch off', got: () => macCanSend({ pushAlerts: false, confirmState: 'confirmed', pushKeyId: KEY_ID }), want: false });
  cases.push({ what: 'can send: a key and the switch on, not yet confirmed', got: () => macCanSend({ pushAlerts: true, confirmState: 'unconfirmed', pushKeyId: KEY_ID }), want: false });
  cases.push({ what: 'can send: no status', got: () => macCanSend(null), want: false });
  // A delivery whose step printed nothing before the next ready line reads
  // nothing, not the next step's banner and screen.
  cases.push({
    what: 'the tap reader: a step that printed nothing does not borrow the next step\'s banner',
    got: () => {
      const t = tapReadings([{ step: 'ready-for-alert', seq: 5 }, { step: 'ready-for-alert', seq: 9 }, { step: 'banner', label: 'two', seq: 10 }, { step: 'screen', name: 'alert', elements: [], seq: 11 }], [{ arm: 'a', readySeq: 5, code: 0 }, { arm: 'b', readySeq: 9, code: 0 }]);
      return t[0].banner === null && t[0].dump === null && t[1].banner?.label === 'two' && t[1].dump?.name === 'alert';
    },
    want: true
  });
  cases.push({
    what: 'the tap reader: where a tap was made from is the last dump before its ready line',
    got: () => {
      const t = tapReadings(
        [{ step: 'screen', name: 'session', elements: [], seq: 2 }, { step: 'screen', name: 'back', elements: [], seq: 3 }, { step: 'ready-for-alert', seq: 5 }, { step: 'screen', name: 'alert-gone', elements: [], seq: 7 }, { step: 'ready-for-alert', seq: 9 }],
        [{ arm: 'a', readySeq: 5, code: 0 }, { arm: 'b', readySeq: 9, code: 0 }]
      );
      return t[0].before?.name === 'back' && t[1].before?.name === 'alert-gone';
    },
    want: true
  });
  cases.push({
    what: 'the tap reader: each banner and dump to its own delivery, and a missing banner stays missing',
    got: () => {
      const t = tapReadings(seqEvents, [{ arm: 'a', readySeq: 5, code: 0 }, { arm: 'b', readySeq: 9, code: 0 }]);
      return t[0].banner?.label === 'one' && t[0].dump?.name === 'alert' && t[1].banner === null && t[1].dump?.name === 'alert-cold-missing' && t[1].ready?.cold === true;
    },
    want: true
  });

  let bad = 0;
  for (const c of cases) {
    let got;
    try {
      got = c.got();
    } catch (err) {
      got = `threw ${String(err?.message ?? err)}`;
    }
    const ok = got === c.want;
    if (!ok) bad += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.what}: ${got === true ? 'green' : got === false ? 'red' : got === null ? 'UNREADABLE' : String(got)}`);
  }
  return { bad, total: cases.length };
}

// ---------------------------------------------------------------------------
// Phase 317: End and End these (build/p317/SPEC.md §7.5; Unpair's Mac half
// was taken out by the fix round, and E8 to E10's unpair halves with it)
// ---------------------------------------------------------------------------

/** The phone's own words for End's lines, from Copy.swift. */
const END_WORDS = {
  notConfirmed: copyOf('endNotConfirmed'),
  needsPasscode: copyOf('endNeedsPasscode'),
  notTaken: copyOf('endNotTaken'),
  noAnswer: copyOf('endNoAnswer'),
  ended: copyOf('ended'),
  noAnswerWord: copyOf('noAnswer'),
  notRun: copyOf('notRun')
};
/** The log line main writes once per write that acted (SPEC §5.3.4 step 7). */
const DONE_LINE = "the phone's end: done";

/** The labels of an `end-dialog` line, title first. */
const dialogWords = (d) => [d?.title, ...(d?.texts ?? [])].filter((x) => typeof x === 'string');
/**
 * A dialog's message as ONE text, every label it drew joined in order with
 * its whitespace folded to one space: XCUITest hands a message's newlines back
 * as spaces on one label (the verify read the right order this way and the
 * line-split reading called it wrong), and a name or a sentence is found in it
 * whichever way it came. The fix round's.
 */
const dialogText = (d) => (d?.texts ?? []).map((t) => String(t)).join(' ').replace(/\s+/g, ' ').trim();
/** Where `needle`, its whitespace folded the same way, first sits in `text`, at or after `from`; -1 when absent. */
const foldedAt = (text, needle, from = 0) => (typeof needle === 'string' && needle.trim() !== '' ? text.indexOf(needle.replace(/\s+/g, ' ').trim(), from) : -1);

/**
 * E1 (and E10's half): the bar above the tab bar with the device's mark, the
 * Mac's own confirmation, iOS's first-use question accepted, a match, one act.
 */
function gradeE1(r) {
  const unread = [];
  const problems = [];
  if (r.authUp !== true || r.acked !== true) unread.push('the owner check was never seen up and answered, so Face ID\'s answer could not be given (SPEC §13 item 1)');
  if (r.permission?.stillUp === true) unread.push('iOS\'s first-use Face ID question was still up when match would be sent');
  // THE PREMISE (the tests round): a match was given to an owner check that
  // was up. Unmet, what follows a match (one act, tmux, the screen, the bar
  // going) is not read at all, so it never decides a FAIL over the
  // UNREADABLE above, which the reverify's floor run (iOS 18.3) showed it
  // did. What is wrong whatever iOS did still fails: the bar, its mark and
  // the Mac's confirmation, all read before the owner check; and a session
  // that ended when no match was ever sent (the probe answers only on
  // `end-auth-up`), which would be an End past the owner check.
  const premise = unread.length === 0;
  const bar = r.bar?.bar;
  const tab = r.bar?.tabBar;
  if (!Array.isArray(bar) || !Array.isArray(tab)) problems.push('no End bar or no tab bar was read');
  else if (bar[1] + bar[3] > tab[1] + 0.5) problems.push(`the End bar's bottom ${String(bar[1] + bar[3])} is below the tab bar's top ${String(tab[1])}`);
  if (Array.isArray(r.bar?.row) && !near(r.bar.row[3], 50, 1)) problems.push(`the End row is ${String(r.bar.row[3])} tall, not 50`);
  if (!(r.bar?.glyphs ?? []).some((g) => /faceid/i.test(String(g.id)) || /face id/i.test(String(g.label)))) problems.push(`the End row's mark is ${J(r.bar?.glyphs ?? [])}, not Face ID's`);
  const words = dialogWords(r.dialog);
  if (!words.includes(r.want?.title)) problems.push(`the confirmation's title is not the Mac's ${J(r.want?.title)}`);
  if (!words.some((w) => w.includes(r.want?.body ?? '\u0000'))) problems.push('the confirmation does not draw the Mac\'s body for this session');
  if (!(r.dialog?.buttons ?? []).includes(r.want?.confirmLabel)) problems.push(`the confirmation's press is not ${J(r.want?.confirmLabel)}`);
  if (premise) {
    if (r.doneLines !== 1) problems.push(`${String(r.doneLines)} done line(s) in app.log, not one`);
    if (r.tmuxAlive !== false) problems.push('the tmux session is still there');
    if (r.mainStatus !== 'exited') problems.push(`main reads ${J(r.mainStatus)}, not exited`);
    if (r.drawnStatus !== r.doorStatus) problems.push(`the screen draws ${J(r.drawnStatus)} where the door says ${J(r.doorStatus)}`);
    if (r.barAfter === true) problems.push('the End bar is still drawn on an ended session');
  } else if (r.authUp !== true && ((typeof r.doneLines === 'number' && r.doneLines > 0) || r.tmuxAlive === false || r.mainStatus === 'exited')) {
    problems.push(`no match was sent, and the session ended (${String(r.doneLines)} done line(s), tmux ${r.tmuxAlive === false ? 'gone' : 'alive'}, main ${J(r.mainStatus)}): an End past the owner check`);
  }
  return decide(problems, unread, `the bar sits above the tab bar with Face ID's mark; the Mac's confirmation word for word; ${r.permission?.seen === true ? `iOS's first-use question (${J(r.permission?.pressed)}) accepted first, and gone before the match` : 'no first-use question came'}; match ended it once, and the screen read it again`);
}

/**
 * E2: no match, then the owner check ends: one line, nothing sent.
 *
 * The tests round. The UI test now reads what iOS drew after the failed match
 * (`drew`, by label), presses Cancel BY ITS LABEL when iOS draws one and
 * waits for that press to leave, and notices when iOS ended its own prompt
 * first, which is what the End line being drawn means (it is drawn only once
 * the owner check has answered). Either way the owner check failed, and the
 * reading is the same: the line, nothing sent, the session still running.
 * The premise is that the check was up, answered with no match, and ENDED
 * (Cancel pressed, or a line drawn); unmet, nothing is a FAIL but what is
 * wrong whatever iOS drew: a write, a session that stopped running, or an End
 * line drawn that is not the not-confirmed one.
 */
function gradeE2(r) {
  const unread = [];
  const problems = [];
  if (typeof r.writeLines === 'number' && r.writeLines !== 0) problems.push(`${String(r.writeLines)} write line(s) in app.log`);
  else if (r.writeLines !== 0) unread.push('the Mac\'s write count was not taken around the owner check');
  if (!['running', 'idle', 'needs_input'].includes(r.mainStatus)) problems.push(`the session reads ${J(r.mainStatus)}, not still running`);
  if (r.line !== null && r.line !== undefined && r.line !== END_WORDS.notConfirmed) problems.push(`the line reads ${J(r.line)}, not ${J(END_WORDS.notConfirmed)}`);
  let how = null;
  if (r.authUp !== true || r.acked !== true) unread.push('the owner check was never seen up and answered');
  else if (r.cancelFound === true) {
    if (r.cancelGone === false) unread.push('Cancel was pressed and iOS\'s prompt did not leave');
    else if (r.line !== END_WORDS.notConfirmed) unread.push('Cancel was pressed and no End line came');
    else how = 'Cancel pressed on iOS\'s prompt';
  } else if (r.line === END_WORDS.notConfirmed) how = `iOS ended its own prompt after the failed match (it drew ${J(r.drew ?? null)})`;
  else unread.push(`iOS's prompt drew no Cancel after the failed match and no End line came (it drew ${J(r.drew ?? null)})`);
  return decide(problems, unread, `${String(how)}; nothing was sent, the line says so, and the session still runs`);
}

/** E3: Face ID unenrolled: what iOS answers is printed, and the bar says it. */
function gradeE3(r) {
  const problems = [];
  const faceMark = (r.bar?.glyphs ?? []).some((g) => /faceid/i.test(String(g.id)) || /face id/i.test(String(g.label)));
  if (faceMark) problems.push('the bar still draws Face ID\'s mark with Face ID unenrolled');
  if (r.acked !== true) return verdict(null, 'the probe\'s unenrol was never acknowledged');
  if (r.bar?.enabled === false) {
    // passcodeNotSet: drawn off, with its line, and no prompt.
    if (r.bar?.line !== END_WORDS.needsPasscode) problems.push(`the bar is off with ${J(r.bar?.line)}, not ${J(END_WORDS.needsPasscode)}`);
    if (r.dialog === true || r.prompt === true) problems.push('a confirmation or a prompt came from a bar drawn off');
    return decide(problems, [], 'iOS answered passcodeNotSet: the bar is off with the passcode line, and nothing asked');
  }
  if (r.bar?.enabled === true) {
    if (!(r.bar?.glyphs ?? []).some((g) => /lock/i.test(String(g.id)))) problems.push(`iOS answered a passcode, and the mark is ${J(r.bar?.glyphs ?? [])}, not the lock`);
    return decide(problems, [], 'iOS answered the passcode alone: the bar is on with the lock, never Face ID\'s mark');
  }
  return verdict(null, 'no End bar was read with Face ID unenrolled');
}

/** E4: End these in the Mac sheet's order, two ended, the third counted and never a target. */
function gradeE4(r) {
  const unread = [];
  const problems = [];
  if (r.authUp !== true || r.acked !== true) unread.push('the owner check was never answered');
  const words = dialogWords(r.dialog);
  if (!words.includes(r.wantHeading)) problems.push(`the confirmation's title is not ${J(r.wantHeading)}`);
  const text = dialogText(r.dialog);
  // The Mac sheet's order: its body, then the names (in the list's drawn
  // order, which this reading does not hold, so each name anywhere between),
  // then the skipped line. Read over the message as one text, so a message
  // whose newlines came back as spaces reads the same.
  const body = foldedAt(text, r.wantBody);
  const afterBody = body === -1 ? -1 : body + String(r.wantBody).replace(/\s+/g, ' ').trim().length;
  const skipped = afterBody === -1 ? -1 : foldedAt(text, r.wantSkipped, afterBody);
  const names = r.names.map((n) => (afterBody === -1 ? -1 : foldedAt(text, n, afterBody)));
  if (body === -1 || skipped === -1 || names.some((i) => i === -1 || i >= skipped)) problems.push(`the message is not the body, the names and the skipped line, in that order: ${J(text)}`);
  for (const id of r.targets) if (r.outcomes?.[id] !== END_WORDS.ended) problems.push(`target ${id} reads ${J(r.outcomes?.[id])}, not Ended`);
  if (r.outcomes?.[r.skipped] !== undefined) problems.push(`the skipped row draws ${J(r.outcomes[r.skipped])}; it was counted in the skipped line and is no target`);
  if (r.heading !== r.wantDone) problems.push(`the heading reads ${J(r.heading)}, not ${J(r.wantDone)}`);
  if (r.doneLines !== 2) problems.push(`${String(r.doneLines)} done line(s), not two`);
  return decide(problems, unread, 'the Mac sheet\'s order, two Ended, the ended row only in the skipped line, two acts');
}

/**
 * E5 and E6 (Paseo #3464): a match, then Home (or the app ended) at once.
 * Which of three honest cases happened is printed; each passes only when it
 * is honest about tmux and the log, and nothing is sent after the return.
 */
function gradeAfterLeaving(r) {
  const unread = [];
  const problems = [];
  if (r.authUp !== true || r.acked !== true) unread.push('the owner check was never answered');
  // THE FIX ROUND'S HOLD (E5): the relay held the write's connection before
  // its handshake, so its bytes were never handed and the only honest end is
  // the withheld one: not taken, no act, the session still there.
  if (r.held !== undefined) {
    if (r.held === null) unread.push('the relay\'s hold was not read');
    else if (r.held < 1) unread.push('the relay held no connection, so the write was not caught before its bytes were handed');
    else {
      if (r.line !== END_WORDS.notTaken) problems.push(`the write was held before its bytes were handed, and the line reads ${J(r.line)}, not ${J(END_WORDS.notTaken)}`);
      if (r.doneLines !== 0) problems.push(`the write was held before its bytes were handed, and ${String(r.doneLines)} act(s) are in the log`);
      if (r.tmuxAlive !== true) problems.push('the write was held before its bytes were handed, and the session is gone');
    }
  }
  if (r.doneLines > 1) problems.push(`${String(r.doneLines)} done lines: more than one act`);
  if ((r.doneLines === 1) === r.tmuxAlive) problems.push(`the log says ${String(r.doneLines)} act(s) and tmux says the session is ${r.tmuxAlive ? 'alive' : 'gone'}`);
  if (r.drawnStatus !== r.doorStatus) problems.push(`the screen draws ${J(r.drawnStatus)} where the door says ${J(r.doorStatus)}`);
  let which = null;
  if (r.line === null && r.doneLines === 1) which = 'done: the answer arrived';
  else if (r.line === END_WORDS.noAnswer) which = 'no answer: the bytes were handed and the re-read came back';
  else if (r.line === END_WORDS.notTaken && r.doneLines === 0) which = 'not taken: withheld before its bytes were handed, or a 404';
  else if (r.line === null && r.doneLines === 0 && r.relaunched === true) which = 'nothing on the relaunched screen: the write never acted';
  if (which === null) problems.push(`the line ${J(r.line)} is not an honest one with ${String(r.doneLines)} act(s)`);
  if (r.writeLinesAfter !== 0) problems.push(`${String(r.writeLinesAfter)} write line(s) after the return`);
  if (r.relayAfter !== 0 && r.relayAfter !== null) problems.push(`${String(r.relayAfter)} connection(s) at the relay in the 20 s after`);
  return decide(problems, unread, `${String(which)}; at most one act, the screen equals tmux, and nothing was sent after`);
}

/**
 * The E7 sessions in the order the phone DRAWS them, which is the order its
 * batch runs (the tests round): the Sessions tab draws the waiting rows, then
 * the others, each in the door's order (`/v1/blocked`'s `rows` then `others`,
 * src/main/pocket/routes.ts `othersOrder`, newest output first). Null when
 * any of them is not in the answer.
 */
function drawnOrderOf(sessions, blocked) {
  const drawn = [...(blocked?.rows ?? []), ...(blocked?.others ?? [])].map((x) => x?.sessionId);
  const at = sessions.map((s) => drawn.indexOf(s?.id));
  if (at.some((i) => i === -1)) return null;
  return sessions.map((s, k) => ({ s, i: at[k] })).sort((a, b) => a.i - b.i).map((x) => x.s);
}

/** Where `name` stands as a whole word in `text` (bounded by a space or an end), or -1. */
const wordAt = (text, name) => {
  for (let i = text.indexOf(name); i !== -1; i = text.indexOf(name, i + 1)) {
    const before = i === 0 ? ' ' : text[i - 1];
    const after = text[i + name.length] ?? ' ';
    if (/\s/.test(before) && /\s/.test(after)) return i;
  }
  return -1;
};

/**
 * The E7 sessions in the order the phone's CONFIRMATION names them, which is
 * the batch's own order (EndBatch.swift's `BatchConfirm`: the body, then the
 * targets' names in drawn order), read from the dialog's message as one text.
 * Null when the dialog was not read or a name is not in it.
 */
function confirmOrderOf(dialog, sessions) {
  if (dialog === null || dialog === undefined) return null;
  const text = ` ${dialogText(dialog)} `;
  const at = sessions.map((s) => wordAt(text, String(s?.name ?? '\u0000')));
  if (at.some((i) => i === -1)) return null;
  return sessions.map((s, k) => ({ s, i: at[k] })).sort((a, b) => a.i - b.i).map((x) => x.s);
}

/** E7: a batch interrupted by Home after the first Ended. */
function gradeE7(r) {
  const unread = [];
  const problems = [];
  if (r.authUp !== true || r.acked !== true) unread.push('the owner check was never answered');
  if (r.rowOne !== END_WORDS.ended) unread.push(`Home was pressed when row one read ${J(r.rowOne)}, not Ended`);
  // THE ORDER (the tests round): the probe named the first DRAWN row as the
  // one Home follows, and grades the rows in that order; the confirmation
  // says the order the batch ran. If they differ, Home did not follow row
  // one, and nothing after it can be read.
  if (r.order !== undefined) {
    if (!Array.isArray(r.order.drawn)) unread.push('the door\'s drawn order was not read before the drive');
    else if (!Array.isArray(r.order.confirmed)) unread.push('the confirmation\'s order of names was not read');
    else if (J(r.order.drawn) !== J(r.order.confirmed)) unread.push(`the batch ran in ${J(r.order.confirmed)}, not the drawn order ${J(r.order.drawn)} the probe named, so Home did not follow row one`);
  }
  // AN UNMET PREMISE IS UNREADABLE, NEVER A FAIL (the tests round: the
  // reverify's run at 00:22 waited on a row the batch ran last, and its rows
  // graded FAIL). Only what is wrong whenever Home came still fails: a session
  // acted on twice, a write after the return, and a row whose drawn word tmux
  // and the log contradict.
  if (unread.length > 0) {
    const wrong = [];
    if ((r.rows ?? []).some((x) => x.acts > 1)) wrong.push('a session was acted on twice');
    if (typeof r.writeLinesAfter === 'number' && r.writeLinesAfter > 0) wrong.push(`${String(r.writeLinesAfter)} write line(s) after the return`);
    for (const x of r.rows ?? []) {
      const said = `${String(x?.id ?? 'a row')} reads ${J(x?.word)} with ${String(x?.acts)} act(s) and tmux ${x?.tmuxAlive ? 'alive' : 'gone'}`;
      if (x?.word === END_WORDS.ended && (x.acts !== 1 || x.tmuxAlive !== false)) wrong.push(said);
      if (x?.word === END_WORDS.notRun && (x.acts !== 0 || x.tmuxAlive !== true)) wrong.push(said);
      if (x?.word === END_WORDS.noAnswerWord && (x.acts === 1) !== (x.tmuxAlive === false)) wrong.push(said);
    }
    return decide(wrong, unread, '');
  }
  const [one, two, three] = r.rows;
  // THE PREMISE (the fix round): Home must land while the batch still has a
  // write to stop. The verify's run finished all three acts in 114 ms, before
  // Home took effect, and graded that a failure; it is no reading at all. Only
  // what would be wrong whenever Home came is still a failure then.
  if ((r.rows ?? []).length === 3 && r.rows.every((x) => x.acts === 1)) {
    const wrong = [];
    if (r.rows.some((x) => x.acts > 1)) wrong.push('a session was acted on twice');
    if (r.writeLinesAfter !== 0) wrong.push(`${String(r.writeLinesAfter)} write line(s) after the return`);
    return decide(wrong, ['every row acted before Home took effect, so nothing was left to stop'], '');
  }
  // THE HOLD: the relay let row one's connection through and held the next
  // before its handshake, so row two's bytes were never handed: Not run is
  // its only honest word, with no act and the session still there.
  if (r.held !== undefined) {
    if (r.held === null) unread.push('the relay\'s hold was not read');
    else if (r.held >= 1 && (two?.word !== END_WORDS.notRun || two?.acts !== 0 || two?.tmuxAlive !== true)) problems.push(`row two's write was held before its bytes were handed, and it reads ${J(two?.word)} with ${String(two?.acts)} act(s) and tmux ${two?.tmuxAlive ? 'alive' : 'gone'}`);
  }
  if (one?.word !== END_WORDS.ended || one?.tmuxAlive !== false) problems.push(`row one reads ${J(one?.word)} with tmux ${one?.tmuxAlive ? 'alive' : 'gone'}`);
  const twoOk =
    (two?.word === END_WORDS.ended && two?.tmuxAlive === false && two?.acts === 1) ||
    (two?.word === END_WORDS.noAnswerWord && (two?.acts === 1) === (two?.tmuxAlive === false)) ||
    (two?.word === END_WORDS.notRun && two?.acts === 0 && two?.tmuxAlive === true);
  if (!twoOk) problems.push(`row two reads ${J(two?.word)} with ${String(two?.acts)} act(s) and tmux ${two?.tmuxAlive ? 'alive' : 'gone'}`);
  if (three?.word !== END_WORDS.notRun || three?.tmuxAlive !== true || three?.acts !== 0) problems.push(`row three reads ${J(three?.word)} with ${String(three?.acts)} act(s) and tmux ${three?.tmuxAlive ? 'alive' : 'gone'}`);
  if (r.rows.some((x) => x.acts > 1)) problems.push('a session was acted on twice');
  if (r.writeLinesAfter !== 0) problems.push(`${String(r.writeLinesAfter)} write line(s) after the return`);
  return decide(problems, unread, `row two read ${J(two?.word)}, matching tmux; row three Not run and still running; at most one act each; nothing sent after`);
}

/** EH: one hostile write arm, ending where its row says, after exactly its POSTs. */
function gradeEh(r) {
  const problems = [];
  if (r.alive !== RUNNING_FOREGROUND) problems.push(`the app's state is ${J(r.alive)}, not running in the foreground`);
  if (r.posts !== r.wantPosts) problems.push(`${String(r.posts)} POST(s) reached the door, not ${String(r.wantPosts)}`);
  if (r.ends === 'sentence') {
    const ok = [...(r.expect ?? []).map((w) => COPY_WORDS[w]), ...(r.door ?? [])].includes(r.line);
    if (!ok) problems.push(`the line reads ${J(r.line)}, none of the words its row names`);
  } else if (r.ends === 'back-to-list') {
    if (r.onList !== true) problems.push('the app did not go back to the list after the refused read');
  } else if (r.ends === 'pairing') {
    // A signed read refused 404 is a pairing the Mac no longer answers: the
    // read's own consequence is Pairing (the fix round; the verify's EH).
    if (r.onPairing !== true) problems.push('the app did not land on Pairing after every read was refused');
  } else if (r.ends === 'drawn') {
    if (r.enabled !== false || r.line !== r.title) problems.push(`the End row is ${r.enabled ? 'on' : 'off'} with ${J(r.line)}, not off with the Mac's title`);
    if (r.dialog === true) problems.push('a confirmation came from an End drawn off');
  }
  for (const w of r.never ?? []) if (r.line !== null && r.line === COPY_WORDS[w]) problems.push(`the line is ${w}, which this arm must never draw`);
  return decide(problems, [], `ended ${r.ends === 'sentence' ? `in ${J(r.line)}` : r.ends} after ${String(r.posts)} POST(s)`);
}

/**
 * EP: the parent's app (551312f7's ios/, named by P317_PARENT_IOS and never by
 * Phase 316.6's P316_PARENT_IOS, which PR reads at 28d89295): no End, no
 * Select, and its Unpair, which must be SEEN to run (its question read and
 * Pairing drawn), leaves the Mac's row, which is what HEAD's U1 now reads too.
 */
function gradeEp(r) {
  const problems = [];
  const unread = [];
  if (r.sessionDrawn !== true) return verdict(null, 'the parent\'s app drew no session to look for End on');
  if (r.endBar === true) problems.push('the parent draws an End bar');
  if (r.select === true) problems.push('the parent draws Select');
  if (r.unpairSheet !== true) unread.push('the parent\'s Unpair question was never read, so its Unpair did not run');
  else if (r.unpairedToPairing !== true) unread.push('the parent\'s Unpair never drew Pairing, so whether it ran is not known');
  else if (r.macLists !== true) problems.push('the parent\'s Unpair took the Mac\'s row');
  return decide(problems, unread, `no End bar, no Select, and its Unpair ran${typeof r.ms === 'number' ? `, drew Pairing ${String(r.ms)} ms after the press,` : ''} and left the Mac's row`);
}

/** Every End grader, proved both ways on readings written here. */
function endSelfTest() {
  const cases = [];
  const add = (what, grader, input, want) => cases.push({ what, got: () => grader(input).ok, want });
  const edit = (base, fn) => {
    const copy = structuredClone(base);
    fn(copy);
    return copy;
  };
  const want = { title: "End 'p316-e1'?", body: 'This stops what is running in it. The scrollback is saved first, so you can restore this session later.', confirmLabel: 'End session' };
  const e1 = {
    authUp: true,
    acked: true,
    permission: { seen: true, pressed: 'OK' },
    bar: { bar: [0, 711, 402, 51], row: [0, 712, 402, 50], tabBar: [0, 762, 402, 83], glyphs: [{ id: 'faceid', label: 'Face ID' }] },
    dialog: { title: want.title, texts: [want.title, want.body], buttons: ['End session', 'Cancel'] },
    want,
    doneLines: 1,
    tmuxAlive: false,
    mainStatus: 'exited',
    drawnStatus: 'Ended',
    doorStatus: 'Ended',
    barAfter: false
  };
  add('E1 passes its honest reading', gradeE1, e1, true);
  add('E1 is red on a bar below the tab bar', gradeE1, edit(e1, (r) => void (r.bar.bar[1] = 800)), false);
  add('E1 is red on a Touch ID mark', gradeE1, edit(e1, (r) => void (r.bar.glyphs = [{ id: 'touchid', label: 'Touch ID' }])), false);
  add('E1 is red on a body the Mac does not say', gradeE1, edit(e1, (r) => void (r.dialog.texts = [want.title, 'The agent stops. Its saved output stays.'])), false);
  add('E1 is red on two acts', gradeE1, edit(e1, (r) => void (r.doneLines = 2)), false);
  add('E1 is red on a session tmux still holds', gradeE1, edit(e1, (r) => void (r.tmuxAlive = true)), false);
  add('E1 is red on a screen that disagrees with the door', gradeE1, edit(e1, (r) => void (r.drawnStatus = 'Working')), false);
  add('E1 is red on a row that is not 50 tall', gradeE1, edit(e1, (r) => void (r.bar.row[3] = 44)), false);
  add('E1 is red on another press', gradeE1, edit(e1, (r) => void (r.dialog.buttons = ['End', 'Cancel'])), false);
  add('E1 is red on another title', gradeE1, edit(e1, (r) => void (r.dialog = { ...r.dialog, title: 'End?', texts: [want.body] })), false);
  add('E1 is red on main reading it running', gradeE1, edit(e1, (r) => void (r.mainStatus = 'running')), false);
  add('E1 is red on the bar still drawn', gradeE1, edit(e1, (r) => void (r.barAfter = true)), false);
  add('E1 is red on no bar read', gradeE1, edit(e1, (r) => void (r.bar = { ...r.bar, bar: null })), false);
  add('E1 is UNREADABLE with the question still up', gradeE1, edit(e1, (r) => void (r.permission = { seen: true, stillUp: true })), null);
  // The tests round: an unmet premise is UNREADABLE, never a FAIL, and only
  // what is wrong whatever iOS did still fails.
  const noMatch = (r) => Object.assign(r, { authUp: false, acked: false, doneLines: null, tmuxAlive: true, mainStatus: 'idle', drawnStatus: null, doorStatus: 'Idle', barAfter: false });
  add('E1 is UNREADABLE when the owner check was never up and nothing ended', gradeE1, edit(e1, noMatch), null);
  add('E1 is UNREADABLE on the reverify\'s floor run: the question still up after Allow, no match sent, the session running', gradeE1, edit(e1, (r) => void Object.assign(noMatch(r), { permission: { seen: true, pressed: 'OK', stillUp: true } })), null);
  add('E1 is red when no match was sent and the session ended anyway', gradeE1, edit(e1, (r) => void Object.assign(noMatch(r), { tmuxAlive: false, mainStatus: 'exited' })), false);
  add('E1 is red on a confirmation the Mac does not say, even with no match sent', gradeE1, edit(e1, (r) => void Object.assign(noMatch(r), { dialog: { ...r.dialog, texts: [want.title, 'The agent stops. Its saved output stays.'] } })), false);
  add('E1 is red on Face ID\'s mark missing, even with the question still up', gradeE1, edit(e1, (r) => void Object.assign(r, { permission: { seen: true, stillUp: true }, bar: { ...r.bar, glyphs: [{ id: 'lock', label: 'Lock' }] } })), false);
  add('E1 passes the question accepted and gone before the match', gradeE1, edit(e1, (r) => void (r.permission = { seen: true, pressed: 'OK', stillUp: false })), true);
  const e2 = { authUp: true, acked: true, cancelFound: true, line: END_WORDS.notConfirmed, writeLines: 0, mainStatus: 'running' };
  add('E2 passes its honest reading', gradeE2, e2, true);
  add('E2 is red on a write line', gradeE2, edit(e2, (r) => void (r.writeLines = 1)), false);
  add('E2 is red on another line', gradeE2, edit(e2, (r) => void (r.line = END_WORDS.notTaken)), false);
  add('E2 is UNREADABLE with no Cancel and no line', gradeE2, edit(e2, (r) => void Object.assign(r, { cancelFound: false, line: null })), null);
  add('E2 passes iOS ending its own prompt after the failed match, the line drawn', gradeE2, edit(e2, (r) => void Object.assign(r, { cancelFound: false, drew: [] })), true);
  add('E2 is red on another End line with no Cancel', gradeE2, edit(e2, (r) => void Object.assign(r, { cancelFound: false, line: END_WORDS.notTaken })), false);
  add('E2 is UNREADABLE when the owner check was never up, whatever came after', gradeE2, edit(e2, (r) => void Object.assign(r, { authUp: false, acked: false, cancelFound: false, line: null, writeLines: null })), null);
  add('E2 is red on a write with the owner check never up', gradeE2, edit(e2, (r) => void Object.assign(r, { authUp: false, acked: false, cancelFound: false, line: null, writeLines: 1 })), false);
  add('E2 is UNREADABLE when Cancel was pressed and the prompt never left', gradeE2, edit(e2, (r) => void (r.cancelGone = false)), null);
  add('E2 is UNREADABLE when Cancel was pressed and no line came', gradeE2, edit(e2, (r) => void (r.line = null)), null);
  const e3 = { acked: true, bar: { enabled: false, line: END_WORDS.needsPasscode, glyphs: [{ id: 'lock', label: 'Lock' }] }, dialog: false, prompt: false };
  add('E3 passes passcodeNotSet', gradeE3, e3, true);
  add('E3 passes the passcode alone with the lock', gradeE3, edit(e3, (r) => void (r.bar.enabled = true)), true);
  add('E3 is red on Face ID\'s mark unenrolled', gradeE3, edit(e3, (r) => void (r.bar.glyphs = [{ id: 'faceid', label: 'Face ID' }])), false);
  add('E3 is red on a prompt from a bar drawn off', gradeE3, edit(e3, (r) => void (r.prompt = true)), false);
  const e4 = {
    authUp: true,
    acked: true,
    dialog: { title: 'End 2 running sessions?', texts: ['End 2 running sessions?', 'BODY\na\nb\n1 selected session stays unchanged: 1 already ended'], buttons: ['End 2 sessions', 'Cancel'] },
    wantHeading: 'End 2 running sessions?',
    wantBody: 'BODY',
    names: ['a', 'b'],
    wantSkipped: '1 selected session stays unchanged: 1 already ended',
    targets: ['ia', 'ib'],
    skipped: 'ic',
    outcomes: { ia: END_WORDS.ended, ib: END_WORDS.ended },
    heading: '2 of 2 sessions ended',
    wantDone: '2 of 2 sessions ended',
    doneLines: 2
  };
  add('E4 passes its honest reading', gradeE4, e4, true);
  add('E4 is red on the names before the body', gradeE4, edit(e4, (r) => void (r.dialog.texts = ['a\nb\nBODY\n1 selected session stays unchanged: 1 already ended'])), false);
  add('E4 passes the message as one label with its newlines read as spaces (the verify\'s reading)', gradeE4, edit(e4, (r) => void (r.dialog.texts = ['End 2 running sessions?', 'BODY a b 1 selected session stays unchanged: 1 already ended'])), true);
  add('E4 is red on the skipped line before the names, as one label', gradeE4, edit(e4, (r) => void (r.dialog.texts = ['BODY 1 selected session stays unchanged: 1 already ended a b'])), false);
  add('E4 is red on no body, as one label', gradeE4, edit(e4, (r) => void (r.dialog.texts = ['a b 1 selected session stays unchanged: 1 already ended'])), false);
  add('E4 is red on an outcome word for the skipped row', gradeE4, edit(e4, (r) => void (r.outcomes.ic = 'Already ended')), false);
  add('E4 is red on one act', gradeE4, edit(e4, (r) => void (r.doneLines = 1)), false);
  add('E4 is red on another title', gradeE4, edit(e4, (r) => void (r.dialog = { ...r.dialog, title: 'End 3 running sessions?', texts: r.dialog.texts.slice(1) })), false);
  add('E4 is red on a target that did not end', gradeE4, edit(e4, (r) => void (r.outcomes.ib = 'Not run')), false);
  add('E4 is red on another heading', gradeE4, edit(e4, (r) => void (r.heading = '1 of 2 sessions ended')), false);
  add('E4 is UNREADABLE when the owner check was never answered', gradeE4, edit(e4, (r) => void (r.acked = false)), null);
  const e5 = { authUp: true, acked: true, doneLines: 0, tmuxAlive: true, drawnStatus: 'Working', doorStatus: 'Working', line: END_WORDS.notTaken, writeLinesAfter: 0, relayAfter: 0 };
  add('E5 passes the withheld case', gradeAfterLeaving, e5, true);
  add('E5 passes the done case', gradeAfterLeaving, edit(e5, (r) => Object.assign(r, { doneLines: 1, tmuxAlive: false, drawnStatus: 'Ended', doorStatus: 'Ended', line: null })), true);
  add('E5 passes the no-answer case after an act', gradeAfterLeaving, edit(e5, (r) => Object.assign(r, { doneLines: 1, tmuxAlive: false, drawnStatus: 'Ended', doorStatus: 'Ended', line: END_WORDS.noAnswer })), true);
  add('E5 is red on done drawn with no act', gradeAfterLeaving, edit(e5, (r) => void (r.line = null)), false);
  add('E5 is red on not-taken drawn after an act', gradeAfterLeaving, edit(e5, (r) => Object.assign(r, { doneLines: 1, tmuxAlive: false, drawnStatus: 'Ended', doorStatus: 'Ended' })), false);
  add('E5 is red on a write after the return', gradeAfterLeaving, edit(e5, (r) => void (r.writeLinesAfter = 1)), false);
  add('E5 is red on a log that disagrees with tmux', gradeAfterLeaving, edit(e5, (r) => void (r.tmuxAlive = false)), false);
  add('E5 passes the withheld case with the relay\'s hold read', gradeAfterLeaving, edit(e5, (r) => void (r.held = 1)), true);
  add('E5 is red on an act after the relay held the write', gradeAfterLeaving, edit(e5, (r) => Object.assign(r, { held: 1, doneLines: 1, tmuxAlive: false, drawnStatus: 'Ended', doorStatus: 'Ended', line: null })), false);
  add('E5 is red on the no-answer line after the relay held the write', gradeAfterLeaving, edit(e5, (r) => Object.assign(r, { held: 1, line: END_WORDS.noAnswer })), false);
  add('E5 is UNREADABLE when the relay held nothing', gradeAfterLeaving, edit(e5, (r) => void (r.held = 0)), null);
  const e7 = {
    authUp: true,
    acked: true,
    rowOne: END_WORDS.ended,
    rows: [
      { word: END_WORDS.ended, tmuxAlive: false, acts: 1 },
      { word: END_WORDS.notRun, tmuxAlive: true, acts: 0 },
      { word: END_WORDS.notRun, tmuxAlive: true, acts: 0 }
    ],
    writeLinesAfter: 0
  };
  add('E7 passes row two Not run', gradeE7, e7, true);
  add('E7 passes row two Ended', gradeE7, edit(e7, (r) => void (r.rows[1] = { word: END_WORDS.ended, tmuxAlive: false, acts: 1 })), true);
  add('E7 passes row two No answer after an act', gradeE7, edit(e7, (r) => void (r.rows[1] = { word: END_WORDS.noAnswerWord, tmuxAlive: false, acts: 1 })), true);
  add('E7 is red on row two Not run after a request acted', gradeE7, edit(e7, (r) => void (r.rows[1] = { word: END_WORDS.notRun, tmuxAlive: false, acts: 1 })), false);
  add('E7 is red on row three ended', gradeE7, edit(e7, (r) => void (r.rows[2] = { word: END_WORDS.ended, tmuxAlive: false, acts: 1 })), false);
  add('E7 is UNREADABLE when Home came before row one ended', gradeE7, edit(e7, (r) => void (r.rowOne = 'Ending…')), null);
  add('E7 is UNREADABLE when all three acted before Home (the verify\'s 114 ms run)', gradeE7, edit(e7, (r) => void (r.rows = [1, 2, 3].map(() => ({ word: END_WORDS.ended, tmuxAlive: false, acts: 1 })))), null);
  add('E7 passes row two Not run with the relay\'s hold read', gradeE7, edit(e7, (r) => void (r.held = 1)), true);
  add('E7 is red on row two acting after the relay held it', gradeE7, edit(e7, (r) => Object.assign(r, { held: 1, rows: [r.rows[0], { word: END_WORDS.noAnswerWord, tmuxAlive: false, acts: 1 }, r.rows[2]] })), false);
  add('E7 is UNREADABLE with the hold not read', gradeE7, edit(e7, (r) => void (r.held = null)), null);
  // The tests round: the rows in the order the phone draws, and the batch's own order agreeing.
  add('E7 passes with the drawn and the confirmed order agreeing', gradeE7, edit(e7, (r) => void (r.order = { drawn: ['c', 'b', 'a'], confirmed: ['c', 'b', 'a'] })), true);
  const at0022 = (r) =>
    Object.assign(r, {
      order: { drawn: ['a', 'b', 'c'], confirmed: ['c', 'b', 'a'] },
      rowOne: END_WORDS.notRun,
      rows: [
        { id: 'a', word: END_WORDS.notRun, tmuxAlive: true, acts: 0 },
        { id: 'b', word: 'Not ended. Your Mac did not answer in time.', tmuxAlive: true, acts: 0 },
        { id: 'c', word: END_WORDS.ended, tmuxAlive: false, acts: 1 }
      ]
    });
  add('E7 is UNREADABLE when the batch ran in another order than the probe named (the reverify\'s 00:22 run)', gradeE7, edit(e7, at0022), null);
  add('E7 is red, order unmet, on a row drawn Ended that tmux still holds', gradeE7, edit(e7, (r) => void (at0022(r).rows[2] = { id: 'c', word: END_WORDS.ended, tmuxAlive: true, acts: 0 })), false);
  add('E7 is red, order unmet, on two acts on one session', gradeE7, edit(e7, (r) => void (at0022(r).rows[2].acts = 2)), false);
  add('E7 is red, order unmet, on a write after the return', gradeE7, edit(e7, (r) => void (at0022(r).writeLinesAfter = 1)), false);
  add('E7 is UNREADABLE when the confirmation\'s order was not read', gradeE7, edit(e7, (r) => void (r.order = { drawn: ['c', 'b', 'a'], confirmed: null })), null);
  add('E7 is red with the order agreeing and row three ended', gradeE7, edit(e7, (r) => Object.assign(r, { order: { drawn: ['c', 'b', 'a'], confirmed: ['c', 'b', 'a'] }, rows: [r.rows[0], r.rows[1], { word: END_WORDS.ended, tmuxAlive: false, acts: 1 }] })), false);
  const eh = { alive: RUNNING_FOREGROUND, posts: 1, wantPosts: 1, ends: 'sentence', expect: ['endNoAnswer'], door: [], never: [], line: END_WORDS.noAnswer, onList: false, enabled: true, title: null, dialog: false };
  add('EH passes a sentence arm', gradeEh, eh, true);
  add('EH is red on two POSTs for one press', gradeEh, edit(eh, (r) => void (r.posts = 2)), false);
  add('EH is red on another line', gradeEh, edit(eh, (r) => void (r.line = END_WORDS.notTaken)), false);
  add('EH passes the back-to-list arm', gradeEh, edit(eh, (r) => Object.assign(r, { ends: 'back-to-list', expect: [], never: ['endNoAnswer'], line: null, onList: true })), true);
  add('EH is red on endNoAnswer where the read was refused', gradeEh, edit(eh, (r) => Object.assign(r, { ends: 'back-to-list', expect: [], never: ['endNoAnswer'], line: END_WORDS.noAnswer, onList: true })), false);
  add('EH passes the unreachable offer', gradeEh, edit(eh, (r) => Object.assign(r, { ends: 'drawn', posts: 0, wantPosts: 0, expect: [], line: 'T', title: 'T', enabled: false })), true);
  add('EH passes the Pairing arm (every read refused after the cut)', gradeEh, edit(eh, (r) => Object.assign(r, { ends: 'pairing', expect: [], never: ['endNoAnswer'], line: null, onPairing: true })), true);
  add('EH is red on a Pairing arm that stayed on the list', gradeEh, edit(eh, (r) => Object.assign(r, { ends: 'pairing', expect: [], never: ['endNoAnswer'], line: null, onPairing: false, onList: true })), false);
  add('EH is red on a back-to-list arm still on the session', gradeEh, edit(eh, (r) => Object.assign(r, { ends: 'back-to-list', expect: [], never: ['endNoAnswer'], line: null, onList: false })), false);
  add('EH is red on a confirmation from an End drawn off', gradeEh, edit(eh, (r) => Object.assign(r, { ends: 'drawn', posts: 0, wantPosts: 0, expect: [], line: 'T', title: 'T', enabled: false, dialog: true })), false);
  add('EH is red on an app that died', gradeEh, edit(eh, (r) => void (r.alive = 1)), false);
  add('EH is red on an unreachable End that can be pressed', gradeEh, edit(eh, (r) => Object.assign(r, { ends: 'drawn', posts: 0, wantPosts: 0, expect: [], line: 'T', title: 'T', enabled: true })), false);
  const ep = { sessionDrawn: true, endBar: false, select: false, unpairSheet: true, unpairedToPairing: true, macLists: true, ms: 800 };
  add('EP passes its honest reading', gradeEp, ep, true);
  add('EP is red on a parent with an End bar', gradeEp, edit(ep, (r) => void (r.endBar = true)), false);
  add('EP is red on a parent that draws Select', gradeEp, edit(ep, (r) => void (r.select = true)), false);
  add('EP is UNREADABLE with no session drawn', gradeEp, edit(ep, (r) => void (r.sessionDrawn = false)), null);
  add('EP is UNREADABLE when the parent\'s Unpair question was never read', gradeEp, edit(ep, (r) => void (r.unpairSheet = false)), null);
  add('EP is UNREADABLE when the parent\'s Unpair never drew Pairing', gradeEp, edit(ep, (r) => void (r.unpairedToPairing = false)), null);
  add('E7 is red on two acts on one session', gradeE7, edit(e7, (r) => void (r.rows[0].acts = 2)), false);
  add('E7 is red on a write after the return', gradeE7, edit(e7, (r) => void (r.writeLinesAfter = 1)), false);
  add('E3 is red on an off bar with another line', gradeE3, edit(e3, (r) => void (r.bar.line = 'x')), false);
  add('E3 is red on an on bar with no lock', gradeE3, edit(e3, (r) => Object.assign(r.bar, { enabled: true, glyphs: [{ id: 'touchid', label: 'Touch ID' }] })), false);
  add('E3 is UNREADABLE with no bar read', gradeE3, edit(e3, (r) => void (r.bar = null)), null);
  add('E2 is red on a session that ended', gradeE2, edit(e2, (r) => void (r.mainStatus = 'exited')), false);
  add('E5 is red on two acts', gradeAfterLeaving, edit(e5, (r) => Object.assign(r, { doneLines: 2, tmuxAlive: false })), false);
  add('E5 is red on a screen that disagrees with the door', gradeAfterLeaving, edit(e5, (r) => void (r.drawnStatus = 'Ended')), false);
  add('E5 is red on a connection after the return', gradeAfterLeaving, edit(e5, (r) => void (r.relayAfter = 1)), false);
  add('EP is red on a parent whose Unpair took the Mac\'s row', gradeEp, edit(ep, (r) => void (r.macLists = false)), false);
  // The tests round: E7's two orders, read both ways.
  const sA = { id: 'ia', name: 'p317-e7a' };
  const sB = { id: 'ib', name: 'p317-e7b' };
  const sC = { id: 'ic', name: 'p317-e7c' };
  const truth = (fn) => ({ ok: fn() === true });
  const ids = (xs) => (xs === null ? null : xs.map((x) => x.id).join(','));
  add('drawnOrderOf reads the waiting rows, then the others, in the door\'s order (the reverify\'s reading)', () => truth(() => ids(drawnOrderOf([sA, sB, sC], { rows: [{ sessionId: 'w' }], others: [{ sessionId: 'ic' }, { sessionId: 'ib' }, { sessionId: 'ia' }] })) === 'ic,ib,ia'), null, true);
  add('drawnOrderOf puts a waiting row before every other', () => truth(() => ids(drawnOrderOf([sA, sB, sC], { rows: [{ sessionId: 'ib' }], others: [{ sessionId: 'ia' }, { sessionId: 'ic' }] })) === 'ib,ia,ic'), null, true);
  add('drawnOrderOf is null when a row is not in the answer', () => truth(() => drawnOrderOf([sA, sB, sC], { rows: [], others: [{ sessionId: 'ia' }, { sessionId: 'ib' }] }) === null), null, true);
  add('confirmOrderOf reads the names in the message\'s order', () => truth(() => ids(confirmOrderOf({ texts: ['End 3 running sessions?', 'BODY\np317-e7c\np317-e7b\np317-e7a'] }, [sA, sB, sC])) === 'ic,ib,ia'), null, true);
  add('confirmOrderOf reads names whose newlines came back as spaces', () => truth(() => ids(confirmOrderOf({ texts: ['BODY p317-e7b p317-e7a p317-e7c'] }, [sA, sB, sC])) === 'ib,ia,ic'), null, true);
  add('confirmOrderOf never takes a name for the start of a longer one', () => truth(() => ids(confirmOrderOf({ texts: ['BODY p317-e10 p317-e1'] }, [{ id: 'one', name: 'p317-e1' }, { id: 'ten', name: 'p317-e10' }])) === 'ten,one'), null, true);
  add('confirmOrderOf is null with no dialog or a name missing', () => truth(() => confirmOrderOf(null, [sA]) === null && confirmOrderOf({ texts: ['BODY p317-e7a'] }, [sA, sB]) === null), null, true);
  let bad = 0;
  for (const c of cases) {
    let got;
    try {
      got = c.got();
    } catch (err) {
      got = `threw ${String(err?.message ?? err)}`;
    }
    const ok = got === c.want;
    if (!ok) bad += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.what}: ${got === true ? 'green' : got === false ? 'red' : got === null ? 'UNREADABLE' : String(got)}`);
  }
  return { bad, total: cases.length };
}

// ---------------------------------------------------------------------------
// The hostile door, in a process of its own
// ---------------------------------------------------------------------------

/** Start one arm's door as a child under tsx; resolves with its first line and a live event list. */
function startDoorChild(armName) {
  return new Promise((done) => {
    // Phase 316.6: the markdown arms fill {{MD3}} with the probe's listener.
    const child = spawn(process.execPath, hostileDoorArgv(['serve', '--arm', armName, '--md3', md.md3 ?? '127.0.0.1:9']), {
      cwd: ROOT,
      env: { ...process.env, P316_HOSTILE_INNER: '1' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const events = [];
    let buf = '';
    let facts = null;
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      done(value);
    };
    const timer = setTimeout(() => finish({ child, facts: null, events, why: 'the hostile door printed nothing in 60 s' }), 60_000);
    child.stdout.on('data', (c) => {
      buf += c.toString('utf8');
      let at;
      while ((at = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, at);
        buf = buf.slice(at + 1);
        if (line.startsWith('P316_DOOR_EVENT:')) events.push(JSON.parse(line.slice('P316_DOOR_EVENT:'.length)));
        else if (line.startsWith('P316_DOOR:')) {
          facts = JSON.parse(line.slice('P316_DOOR:'.length));
          clearTimeout(timer);
          finish({ child, facts, events, why: null });
        }
      }
    });
    child.stderr.on('data', () => undefined);
    child.on('exit', (code) => {
      clearTimeout(timer);
      finish({ child, facts: null, events, why: `the hostile door exited ${String(code)} before it served` });
    });
  });
}

/** End a hostile door child: close its stdin, SIGTERM, then SIGKILL. */
async function endDoorChild(child) {
  if (child === null || child === undefined || child.exitCode !== null || child.signalCode !== null) return;
  try {
    child.stdin.end();
  } catch {
    /* already closed */
  }
  child.kill('SIGTERM');
  const deadline = Date.now() + 3_000;
  while (child.exitCode === null && child.signalCode === null && Date.now() < deadline) await sleep(100);
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
}

/** A sentence the app drew in place of a screen: any failure element or pairing line with words. */
function drawnSentence(events) {
  for (const d of [...events].reverse().filter((e) => e.step === 'screen')) {
    // `conversation-older-line` is where the conversation says a page of older
    // turns was refused (ConversationScreen.swift): the turns already read stay
    // above it, and paging stops with it.
    const hit = (d.elements ?? []).find((e) => (/-failure$/.test(e.id) || e.id === 'pairing-line' || e.id === 'conversation-older-line') && typeof e.label === 'string' && e.label.trim() !== '');
    if (hit !== undefined) {
      // The `Copy.swift` word it is, by name, or null. The report keeps the
      // name, the length and a digest; the words stay out of it.
      const word = Object.entries(COPY_WORDS).find(([, text]) => text === hit.label)?.[0] ?? null;
      // The rows beside it on the same tab: since Phase 316.6 the Needs input
      // tab's carry the prefix `needs-` (its failure is `needs-list-failure`).
      const rows = hit.id.startsWith('needs-') ? els(d, 'needs-row-').length : els(d, 'row-').length;
      return { id: hit.id, length: hit.label.length, rows, sha: shaHex(hit.label).slice(0, 12), word };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// --grader-self-test: the list grader, proved on dumps written here. Nothing launches.
// ---------------------------------------------------------------------------

function selfTest() {
  const reads = [
    {
      rows: [{ sessionId: 'a', name: 'fix-login', project: 'webapp', machine: null, question: 'Edit x?', statusTitle: 'Needs input', ageText: '2m' }],
      others: [{ sessionId: 'b', name: 'talk', project: 'api', machine: 'Mac Pro', question: null, statusTitle: 'Working', ageText: 'now' }],
      ageNote: 'the age note'
    }
  ];
  // THE HONEST DUMP IS A REAL ONE's SHAPE (Phase 316.2's fix round): the
  // frames XCUITest read from the app on iOS 26.3 against the real door, as
  // verifier A dumped them. A header's container reads the same frame as its
  // words (SwiftUI reports a container by the union of its children), a Text
  // reads its glyph box (a 15 pt line 18 tall inside its 20 pt line box), a row
  // reads 57 with its hairline and the very last row 56. The first grader
  // judged glyph boxes against CSS boxes and failed exactly this list.
  const rowAt = (id, y, name, age, line, machine, last) => [
    { id: `row-${id}`, label: '', frame: [0, y, 402, last ? 56 : 57] },
    { id: `row-dot-${id}`, label: '', frame: [16, y + 12, 10, 10] },
    { id: `row-name-${id}`, label: name, frame: [34, y + 6.8333, 60.33, 20.3333] },
    { id: `row-age-${id}`, label: age, frame: [361, y + 9.1667, 25, 15.6667] },
    { id: `row-line-${id}`, label: line, frame: [16, y + 31, 200, 18] },
    ...(machine === null ? [] : [{ id: `row-machine-${id}`, label: machine, frame: [300, y + 9, 50, 16] }])
  ];
  const good = {
    step: 'screen',
    name: 'list',
    window: [402, 874],
    elements: [
      { id: 'screen-list', label: '', frame: [0, 0, 402, 874] },
      { id: 'list-title', label: 'Sessions', frame: [16, 62.1667, 115, 33.6667] },
      { id: 'section-blocked', label: '', frame: [16, 110.1667, 156.6667, 15.6667] },
      { id: 'section-blocked-text', label: `${String(COPY.needsLead)}1${String(COPY.close)}`, frame: [16, 110.1667, 156.6667, 15.6667] },
      ...rowAt('a', 133, 'fix-login', '2m', 'webapp · Edit x?', null, false),
      { id: 'section-others', label: '', frame: [16, 216.1667, 149.6667, 15.6667] },
      { id: 'section-others-text', label: `${String(COPY.othersLead)}1${String(COPY.close)}`, frame: [16, 216.1667, 149.6667, 15.6667] },
      ...rowAt('b', 239, 'talk', 'now', 'api · Working', 'Mac Pro', true),
      { id: 'list-age-note', label: 'the age note', frame: [16, 312, 357, 33.6667] },
      { id: 'list-read', label: `${String(COPY.readLead)}4:32 PM`, frame: [306, 351.6667, 80, 15.6667] }
    ]
  };
  const edit = (fn) => {
    const d = structuredClone(good);
    fn(d.elements);
    return d;
  };
  const find = (list, id) => list.find((e) => e.id === id);
  const move = (list, pattern, dy) => {
    for (const e of list) if (pattern.test(e.id)) e.frame[1] += dy;
  };
  const cases = [
    { what: 'the honest dump, read from the app on iOS 26.3', dump: good, red: false },
    { what: 'the honest dump with the header containers drawn as 28 pt boxes', dump: edit((l) => { find(l, 'section-blocked').frame = [0, 104, 402, 28]; find(l, 'section-others').frame = [0, 210, 402, 28]; }), red: false },
    { what: 'a header count that is not main\'s', dump: edit((l) => (find(l, 'section-blocked-text').label = `${String(COPY.needsLead)}2${String(COPY.close)}`)), red: true },
    { what: 'the two rows drawn in the other order', dump: edit((l) => move(l, /-a$/, 400)), red: true },
    { what: 'a gutter of 24.17 pt, the defect SPEC §3.4 measured', dump: edit((l) => (find(l, 'section-blocked-text').frame[0] = 24.17)), red: true },
    { what: 'a right gutter of 24 pt: every row\'s words end 24 pt from the window\'s right edge', dump: edit((l) => { for (const id of ['a', 'b']) find(l, `row-age-${id}`).frame[0] = 402 - 24 - 25; }), red: true },
    { what: 'a right gutter of 24 pt on one row only', dump: edit((l) => (find(l, 'row-age-b').frame[0] = 402 - 24 - 25)), red: true },
    { what: 'a 30 pt section header (its words 1 pt lower, its rows 2 pt lower)', dump: edit((l) => { move(l, /^section-others/, 1); move(l, /-b$/, 2); }), red: true },
    { what: 'a 26 pt section header', dump: edit((l) => { move(l, /^section-others/, -1); move(l, /-b$/, -2); }), red: true },
    { what: 'an age main did not send', dump: edit((l) => (find(l, 'row-age-a').label = '3m')), red: true },
    { what: 'no machine badge on a session elsewhere', dump: edit((l) => l.splice(l.indexOf(find(l, 'row-machine-b')), 1)), red: true },
    { what: 'a name 4 pt down in its row', dump: edit((l) => (find(l, 'row-name-a').frame[1] += 4)), red: true },
    { what: 'a second line 3 pt low, so 3 pt of bottom padding', dump: edit((l) => (find(l, 'row-line-a').frame[1] += 3)), red: true },
    { what: 'a row that is not the last drawn without its hairline', dump: edit((l) => (find(l, 'row-a').frame[3] = 56)), red: true },
    { what: 'the last row drawn with a hairline under it', dump: edit((l) => (find(l, 'row-b').frame[3] = 57)), red: true },
    { what: 'rows with 8/16 padding', dump: edit((l) => { find(l, 'row-a').frame[3] = 61; move(l, /^row-(name|age|line|dot)-a$/, 2); }), red: true },
    { what: 'the question missing from the second line', dump: edit((l) => (find(l, 'row-line-a').label = 'webapp')), red: true }
  ];
  let bad = 0;
  for (const c of cases) {
    const got = gradeList(c.dump, reads);
    const red = Array.isArray(got);
    const ok = red === c.red;
    if (!ok) bad += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.what}: ${red ? `red (${got[0]})` : 'green'}`);
  }
  console.log(bad === 0 ? `${TAG} self-test PASS: ${String(cases.length)} dumps graded as they must be, against the mock's own frames ${J(FRAMES)}.` : `${TAG} self-test FAIL: ${String(bad)} dump(s) graded wrongly.`);
  // Phase 316.5: every alert grader, the composer, the preflight and the tap reader.
  const alerts = alertsSelfTest();
  console.log(
    alerts.bad === 0
      ? `${TAG} alerts self-test PASS: ${String(alerts.total)} cases (the composer, the override's preflight, N0 to N11, D2+, F1+ and ND) graded as they must be.`
      : `${TAG} alerts self-test FAIL: ${String(alerts.bad)} of ${String(alerts.total)} case(s) graded wrongly.`
  );
  // Phase 316.6: the tabs, Settings, Unpair and the drawn answer.
  const tabs = tabsSelfTest();
  console.log(
    tabs.bad === 0
      ? `${TAG} tabs and markdown self-test PASS: ${String(tabs.total)} cases (the composer, T2a to T2d, MD1 to MD3, S6, U1, HM and PR's word check) graded as they must be.`
      : `${TAG} tabs and markdown self-test FAIL: ${String(tabs.bad)} of ${String(tabs.total)} case(s) graded wrongly.`
  );
  // Phase 317: End, End these and Unpair's Mac half.
  const ends = endSelfTest();
  console.log(
    ends.bad === 0
      ? `${TAG} End self-test PASS: ${String(ends.total)} cases (E1 to E7, EH and EP) graded as they must be.`
      : `${TAG} End self-test FAIL: ${String(ends.bad)} of ${String(ends.total)} case(s) graded wrongly.`
  );
  process.exit(bad === 0 && alerts.bad === 0 && tabs.bad === 0 && ends.bad === 0 ? 0 : 1);
}
// NOT `--self-test`: build/cdp-target.mjs, imported above, runs ITS fixtures
// and exits when argv holds that exact word.
if (process.argv.includes('--grader-self-test')) {
  // Phase 332's clause first, on its own cases; selfTest() exits.
  if (!nameQuestionsSelfTest(PUBLIC_NAME)) {
    console.log(`${TAG} self-test FAIL: the name-question clause (N1).`);
    process.exit(1);
  }
  selfTest();
}
preflight();

const doorChildren = new Set();
let relay = null;
/**
 * Phase 316.6: the markdown session (`p316-md`), the MD3 listener its answers
 * point at, and what the arms read. The fixtures are the committed ones with
 * {{MD3}} filled with the listener's port once it listens.
 */
const md = { listener: null, md3: null, fixtures: [], plantedNames: [], sid: null, sessionId: null, turns: null, readings: {} };
let watch = null;
let preflightOk = false;
let ran = false;
let appText = '';
let shimPid = 0;
let appPid = 0;

/** Phase 314's APNs stand-in, in this process on 127.0.0.1. Closed in the `finally`. */
let apns = null;
/**
 * Everything the Phase 316.5 arms read. `pem` is held in memory only so N1 and
 * N10 can look for it; the report never carries it, and the key FILE is
 * deleted in the `finally`.
 */
const alerts = {
  pem: null,
  publicPem: null,
  pemLines: [],
  preflight: false,
  armed: false,
  verdicts: {},
  readings: {},
  deliveries: [],
  lines: {},
  alertSessionId: null,
  alertName: null,
  blockedAtN3: null,
  recordedBody: null,
  composedForAlertSession: null,
  gone404: false
};
/** app.log, read without blocking (pitfall b: three stand-ins serve in this process). */
const appLogText = async () => {
  try {
    return await readFileAsync(join(PROFILE, 'logs', 'app.log'), 'utf8');
  } catch {
    return '';
  }
};
const countLogLines = async (needle) => (await appLogText()).split('\n').filter((l) => l.includes(needle)).length;
/** Every file under `dir`, with its bytes, for N1's look at what the Mac sealed. */
const filesUnder = async (dir) => {
  const out = [];
  const walk = async (d) => {
    let names = [];
    try {
      names = readdirSync(d);
    } catch {
      return;
    }
    for (const name of names) {
      const path = join(d, name);
      let st;
      try {
        st = lstatSync(path);
      } catch {
        continue;
      }
      if (st.isDirectory()) await walk(path);
      else if (st.isFile()) {
        try {
          out.push({ name: relative(dir, path), bytes: await readFileAsync(path) });
        } catch {
          /* gone between the listing and the read */
        }
      }
    }
  };
  await walk(dir);
  return out;
};
/** A stand-in record as the report may carry it: digests, lengths and headers, never a token, a JWT or a body. */
const redactedRecord = (rec) => ({
  seq: rec.seq,
  origin: rec.origin,
  phone: tokenName(rec.token),
  status: rec.status,
  reason: rec.reason,
  topic: rec.headers?.['apns-topic'] ?? null,
  pushType: rec.headers?.['apns-push-type'] ?? null,
  priority: rec.headers?.['apns-priority'] ?? null,
  bodyBytes: rec.bodyBytes,
  bodySha256: shaHex(rec.body ?? ''),
  authorizationSha256: rec.authorizationDigest,
  verifies: rec.jwt?.verifies ?? false
});
/** A delivery as the report may carry it. */
const redactedDelivery = (d) => ({ arm: d.arm, readySeq: d.readySeq, code: d.code, bytes: d.bytes ?? null, sha: d.sha ?? null, why: d.why ?? null });

try {
  rmSync(RUN, { recursive: true, force: true });
  for (const dir of [HOME, HARNESS, PROFILE, WORK, BIN, XCODE, join(HOME, '.claude')]) mkdirSync(dir, { recursive: true });
  standin = makeStandin({ dir: STANDIN_DIR, scenario: { ...DEFAULT_SCENARIO } });
  const pre = preflightStandin(standin, standin.binPath);
  preflightOk = pre.ok;
  if (!pre.ok) {
    arm('the run', null, `the Tailscale preflight refused the launch: ${pre.problems.join('; ')}`);
    throw new Error('port taken');
  }
  watch = watchForRealTailscale({ roots: () => [shimPid, appPid].filter((p) => p > 0), everyMs: 1_000 });
  dns = await makeDnsStandin({ name: PUBLIC_NAME, mode: 'record' });
  relay = await startRelay();
  md.listener = await startMd3Listener();
  md.md3 = `127.0.0.1:${String(md.listener.port)}`;
  md.fixtures = markdownFixtures(md.md3).fixtures;

  // ---- Phase 316.5: the scratch key, Apple's stand-in and the Mac's override --
  // THE KEY is made here and deleted in the `finally` whatever happened. It is
  // this run's own; his is never read.
  const keyPair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  alerts.pem = keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  alerts.publicPem = keyPair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  alerts.pemLines = alerts.pem.split('\n').filter((l) => l.length >= 16 && !l.startsWith('-----'));
  mkdirSync(ALERTS_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(KEY_FILE, alerts.pem, { mode: 0o600 });
  // The `finally` below deletes it. This is the net for a run that ends by a
  // signal the helpers answer with process.exit, which skips a `finally`.
  process.once('exit', () => rmSync(KEY_FILE, { force: true }));
  // APPLE is the stand-in, in this process, seeded with the phone app's topic
  // and each token that may reach it, with the environment it was minted in.
  apns = await startApnsStandIn({ publicKey: keyPair.publicKey, topic: TOPIC, devices: SEEDED });
  const override = { origins: apns.origins, keyFile: KEY_FILE };
  const overrideWhy = alertsOverrideRefusal(override, HARNESS);
  alerts.preflight = overrideWhy === null;
  if (overrideWhy !== null) {
    arm('the run', null, `the alerts preflight refused the launch: ${overrideWhy}`);
    throw new Error('port taken');
  }
  writeFileSync(ALERTS_JSON, `${J(override)}\n`, { mode: 0o600 });

  // ---- B1: the two builds, before anything serves ------------------------
  const built = await xcodebuildRun({
    label: 'shipping',
    scratch: XCODE,
    derivedDataPath: DD,
    args: ['build-for-testing', '-project', PROJECT, '-scheme', SCHEME, '-configuration', 'Debug', '-destination', 'generic/platform=iOS Simulator']
  });
  report.readings.builds = { shipping: { code: built.code, ms: built.ms } };
  arm('B1 the app builds for the Simulator, ad hoc with no team', built.code === 0, `the shipping project exited ${String(built.code)} in ${String(built.ms)} ms`);
  if (built.code !== 0) throw new Error('no build');

  // ---- the fake claude and the project ------------------------------------
  writeFileSync(
    join(BIN, 'claude'),
    `#!/bin/sh
# probe:p316. Not Claude Code. It prints a committed fixture and waits.
case "$1" in
  -v|--version) echo "2.1.238 (Claude Code)"; exit 0;;
esac
sid=""
prev=""
for a in "$@"; do
  if [ "$prev" = "--session-id" ] || [ "$prev" = "--resume" ]; then sid="$a"; fi
  prev="$a"
done
mode=""
if [ -n "$P316_NEXT" ] && [ -f "$P316_NEXT" ]; then
  mode=$(cat "$P316_NEXT")
  rm -f "$P316_NEXT"
fi
if [ "$mode" = "talk" ] && [ -n "$sid" ]; then
  slug=$(printf '%s' "$PWD" | sed 's|[^a-zA-Z0-9]|-|g')
  d="$HOME/.claude/projects/$slug"
  mkdir -p "$d"
  if [ ! -f "$d/$sid.jsonl" ]; then
    sed -e "s|${FIXTURE_SID}|$sid|g" -e "s|${FIXTURE_CWD}|$PWD|g" "$P316_STORE" > "$d/$sid.jsonl"
  fi
  printf '%s\\n' "$sid" > "$P316_TALK_SID"
  echo "p316 a planted conversation"
fi
if [ "$mode" = "md" ] && [ -n "$sid" ]; then
  slug=$(printf '%s' "$PWD" | sed 's|[^a-zA-Z0-9]|-|g')
  d="$HOME/.claude/projects/$slug"
  mkdir -p "$d"
  if [ ! -f "$d/$sid.jsonl" ]; then
    sed -e "s|${FIXTURE_SID}|$sid|g" -e "s|${FIXTURE_CWD}|$PWD|g" "$P316_STORE" > "$d/$sid.jsonl"
  fi
  printf '%s\\n' "$sid" > "$P316_MD_SID"
  echo "p316 a planted markdown conversation"
fi
if [ "$mode" = "ask" ]; then
  sleep 2
  cat "$P316_DIALOG"
fi
while [ ! -f "$P316_STOP" ]; do sleep 1; done
exit 0
`,
    'utf8'
  );
  chmodSync(join(BIN, 'claude'), 0o755);
  writeFileSync(join(HOME, '.zprofile'), `export PATH="${BIN}:$PATH"\n`, 'utf8');
  writeFileSync(join(HOME, '.zshrc'), `export PATH="${BIN}:$PATH"\n`, 'utf8');
  const git = (args) => spawnSync('git', args, { cwd: WORK, encoding: 'utf8', env: { ...process.env, HOME } });
  git(['init', '-q']);
  writeFileSync(join(WORK, 'note.txt'), 'hello\n');
  git(['add', '-A']);
  git(['-c', 'user.email=p@x', '-c', 'user.name=p', 'commit', '-qm', 'seed']);

  // ---- Electron ------------------------------------------------------------
  // Phase 332: the name check's servers are the loopback stand-in's, or nothing launches.
  const dnsPre = await dns.preflight(dns.servers);
  dnsPreflights.push(dnsPre.ok && loopbackOnlyServers(dns.servers));
  if (!dnsPre.ok) {
    arm('the run', null, `the DNS preflight refused the launch: ${dnsPre.problems.join('; ')}`);
    throw new Error('port taken');
  }
  writeQuietAgents(PROFILE);
  await withElectron(
    {
      label: 'p316',
      userDataDir: PROFILE,
      cwd: ROOT,
      tmuxSocket: SOCKET,
      args: ['--remote-debugging-port=0', '--use-mock-keychain'],
      env: withoutDevRenderer({
        ...INHERITED_CLAUDE,
        HOME,
        GMUX_TMUX_SOCKET: SOCKET,
        GMUX_PROBES: '1',
        GMUX_LOG_FILE: '1',
        GMUX_SPECSTORY_NO_CLOUD: '1',
        GMUX_CONFIG_ROOT: join(PROFILE, 'gmux', 'config'),
        GMUX_HARNESS_DIR: HARNESS,
        // THE STAND-IN TAILSCALE (Phase 330). A development build honours
        // this and runs it; a packaged one ignores it. The door itself binds
        // 127.0.0.1 and nothing else.
        GMUX_TAILSCALE_BIN: standin.binPath,
        // THE DNS STAND-IN (Phase 332): the name check asks it and nothing else.
        [NAME_SERVERS_VAR]: dns.servers,
        // APPLE'S STAND-IN (Phase 316.5): the alerts' two origins and the
        // scratch key file, under the push seam's own refusals. A harness
        // launch without it can reach nothing: its sender refuses Apple's
        // hosts before any socket.
        GMUX_HARNESS_ALERTS: ALERTS_DIR,
        P316_NEXT: NEXT,
        P316_STOP: STOP,
        P316_TALK_SID: TALK_SID,
        P316_MD_SID: MD_SID,
        P316_DIALOG: DIALOG,
        P316_STORE: STORE_SRC
      }),
      graceMs: 8_000,
      ceilingMs: 3_600_000
    },
    async (handle) => {
      shimPid = handle.pid;
      try {
        const cdp = await attach(150_000);
        try {
          appPid = handle.appPid();
        } catch {
          appPid = 0;
        }
        if (!(await armed(cdp))) {
          arm('the run', null, 'the app never armed its bridge and the harness drives');
          return;
        }

        // ---- D0: sessions ------------------------------------------------
        await cdpEval(cdp, `window.__gmuxP93.setup(${J({ path: WORK, names: [N.shell] })}).then(() => true)`);
        writeFileSync(NEXT, 'talk', 'utf8');
        await cdpEval(cdp, `window.__gmuxP202.createSession(${J(N.talk)}, 'claude').then(() => true).catch(() => false)`);
        for (let i = 0; i < 60 && talkRecord() === null; i += 1) await sleep(500);
        rmSync(NEXT, { force: true });
        // Phase 316.6: the markdown session, made BEFORE the waiting one, each
        // stand-in reading its own mode before the next is written.
        writeFileSync(NEXT, 'md', 'utf8');
        await cdpEval(cdp, `window.__gmuxP202.createSession(${J(N.md)}, 'claude').then(() => true).catch(() => false)`);
        for (let i = 0; i < 60 && talkRecord(MD_SID) === null; i += 1) await sleep(500);
        rmSync(NEXT, { force: true });
        writeFileSync(NEXT, 'ask', 'utf8');
        await cdpEval(cdp, `window.__gmuxP202.createSession(${J(N.ask)}, 'claude').then(() => true).catch(() => false)`);
        const record = talkRecord();
        // The Method A turns. The first holds **x** in its ask and its answer,
        // and 40 more follow it, so the conversation is three of the door's
        // 20-turn pages and the **x** turn is on the OLDEST of them: T1 reads
        // it only if the app paged back (Phase 316.2's fix round; the first
        // build planted one turn, the conversation fit on one page, and T1
        // passed while paging back had never worked). Every answer carries
        // markdown, so S1's last answer is read as rendered too.
        if (record !== null) {
          appendTurn(record, 1, 'p316 the ask keeps **x** as typed', 'p316 the answer draws **x** in bold');
          for (let nth = 2; nth <= PLANTED_TURNS; nth += 1) appendTurn(record, nth, `p316 ask ${String(nth)}`, `p316 answer **${String(nth)}**`);
        }
        // Phase 316.6: the markdown session's turns. The same committed
        // transcript, then one turn per fixtures.json fixture marked `probe`,
        // in file order, the ask `p3166 md <name>` and {{MD3}} the listener's
        // port. A committed .jsonl cannot carry that port, which is why the
        // turns are appended at plant time. Main clips and redacts them as it
        // does any answer.
        const mdRecord = talkRecord(MD_SID);
        if (mdRecord !== null) {
          const planted = md.fixtures.filter((f) => f.probe === true);
          planted.forEach((f, k) => appendTurn(mdRecord, k + 1, `p3166 md ${f.name}`, f.source, { total: planted.length, tag: '366' }));
          md.plantedNames = planted.map((f) => f.name);
          md.sid = mdRecord.sid;
        }

        // ---- D1: on, confirm, listening ----------------------------------
        const on = await pocket(cdp, 'setDoor', { on: true });
        const opened = on.ok ? await confirmListening(cdp) : { ok: false, why: on.error };
        const listening = await waitStatus(cdp, (s) => s.state === 'listening', 20_000);
        arm(
          'D1 the door switched on, confirmed and published through the stand-in',
          opened.ok && listening.ok && listening.status.publicName === PUBLIC_NAME && listening.status.publicPort === 8443 && forwarderPort() > 0,
          `${opened.why ?? ''}; status ${J({ state: listening.status?.state, publicName: listening.status?.publicName, publicPort: listening.status?.publicPort })}; forwarder ${forwarderPort() > 0 ? 'up' : 'NOT up'}`
        );
        if (!listening.ok || forwarderPort() === 0) return;

        // ---- N1 (Phase 316.5): the key, through the bridge ----------------
        // `choosePushKey` in a harness launch answers the override's key file
        // with no panel; the name, the read and the keep are the shipping path.
        {
          const bridge = await pocket(cdp, 'choosePushKey');
          const keyed = await waitStatus(cdp, (s) => s.pushKeyId === KEY_ID, 15_000);
          const sealed = await filesUnder(SEALED_KEY_DIR);
          const v = gradeKey({ bridge, statusKeyId: keyed.status?.pushKeyId ?? null, sealed, pemText: alerts.pem, pemLines: alerts.pemLines });
          alerts.readings.N1 = { kept: bridge.ok ? bridge.value?.kept ?? null : null, refused: bridge.ok ? bridge.value?.refusal !== null : null, pushKeyId: keyed.status?.pushKeyId ?? null, sealedFiles: sealed.map((f) => ({ name: f.name, bytes: f.bytes.length })) };
          arm('N1 the push key chosen through the bridge is kept sealed, and the sheet reads its id', v.ok, v.said);
        }

        // ---- D2: the node reader pairs, window 1 --------------------------
        const w1 = await openWindow(cdp);
        if (!w1.ok) {
          arm('D2 the node reader pairs', false, w1.why);
          return;
        }
        const reader = makePhone('p316 reader', w1.offer.dx);
        /** The reader's door: the CURRENT forwarder, the code's name and pin. */
        const readerDoor = {
          get port() {
            return forwarderPort();
          },
          name: w1.offer.host,
          publicPort: w1.offer.port,
          pin: w1.offer.fp
        };
        let allowReader = { ok: false };
        // Phase 316.5: the reader presents a PRODUCTION token (`apt`, `ape`),
        // and the lines the Mac asks Allow over are kept for D2+.
        let readerLines = null;
        const paired = await pairThrough(readerDoor, w1.offer, reader, {
          tries: 20,
          everyMs: 500,
          sealOptions: { pushToken: TOKENS.reader, pushEnvironment: 'production' },
          between: async () => {
            const sheet = await pocket(cdp, 'pairingState');
            if (sheet.ok && sheet.value.state === 'presented') {
              readerLines = sheet.value.lines;
              allowReader = await pocket(cdp, 'allowPhone', { linesRead: sheet.value.lines, hashRead: sheet.value.hash });
            }
          }
        });
        await pocket(cdp, 'cancelPairing');
        const readerCheck = await signedGet(reader, readerDoor, '/v1/blocked');
        arm('D2 the node reader pairs through the forwarder, takes its certificate and reads with it', paired.ok && allowReader.ok && readerCheck.status === 200, `pairing answered ${J(paired.words)}${paired.ok ? '' : ` (${paired.why})`}, Allow ${allowReader.ok ? 'pressed' : 'FAILED'}, first read ${String(readerCheck.status)}`);
        {
          const v = gradeReaderLine({ lines: readerLines, label: reader.label, token: TOKENS.reader });
          arm('D2+ the reader\'s production address is in the lines the Mac asked Allow over', v.ok, v.said);
        }
        if (readerCheck.status !== 200) return;
        /** One read by the node reader, or null when the door did not answer it. */
        const readJson = async (target) => {
          const a = await signedGet(reader, readerDoor, target);
          try {
            return a.status === 200 ? JSON.parse(a.body) : null;
          } catch {
            return null;
          }
        };
        const readBlocked = () => readJson('/v1/blocked');

        // The waiting session must really be waiting before the list is graded.
        for (let i = 0; i < 90; i += 1) {
          if ((await mainSessions(cdp)).find((s) => s.name === N.ask)?.status === 'needs_input') break;
          await sleep(1_000);
        }
        const talk = (await mainSessions(cdp)).find((s) => s.name === N.talk);
        // Phase 316.6: the markdown session as Tortie names it (its row, its
        // door reads); `md.sid` is the planted conversation's own id.
        md.sessionId = md.sid === null ? null : (await mainSessions(cdp)).find((s) => s.name === N.md)?.id ?? null;

        // ---- N2 (Phase 316.5): alerts on, and Allow through the sheet's own lines
        // Step one: D0's session must be waiting in main BEFORE alerts arm, or
        // "it was not announced" says nothing. It runs AFTER N11's drive on the
        // order Simulator (research 136: that phone must meet a Mac that holds
        // the key with its switch still off), so it is a function called once.
        const runN2 = async () => {
          const askWaiting = (await mainSessions(cdp)).find((s) => s.name === N.ask)?.status === 'needs_input';
          const from = apns.requests.length;
          const on = await pocket(cdp, 'setPushAlerts', { on: true });
          const onRead = on.ok ? await waitStatus(cdp, (s) => s.pushAlerts === true, 15_000) : { ok: false, status: null };
          // Turning alerts on moves a confirmed field: the sheet's own lines,
          // as they now stand, are what Allow is pressed over.
          const confirmed = onRead.ok ? await confirmListening(cdp) : { ok: false, why: on.ok ? 'pushAlerts never read on' : on.error };
          for (let i = 0; i < 40 && (await countLogLines('phone alerts armed')) === 0; i += 1) await sleep(500);
          const quietFrom = Date.now();
          await sleep(QUIET_AFTER_ARM_MS);
          const after = await pocket(cdp, 'status');
          const reading = {
            askWaiting,
            confirmed: confirmed.ok && after.ok && after.value.confirmState === 'confirmed',
            confirmWhy: confirmed.why ?? null,
            pushAlerts: after.ok ? after.value.pushAlerts : null,
            armedLines: await countLogLines('phone alerts armed'),
            requests: apns.requests.length - from,
            waitedMs: Date.now() - quietFrom
          };
          alerts.readings.N2 = reading;
          alerts.armed = reading.armedLines > 0;
          const v = gradeArmed(reading);
          arm('N2 alerts on and allowed: armed once, and a wait that began before is not announced', v.ok, v.said);
        };

        /**
         * One pairing of the app on `sim`, and everything that follows it. The
         * reactions press the Mac's own buttons when the UI test says so.
         */
        const pairAndRead = async (sim, steps, label, opts = {}) => {
          const w = await openWindow(cdp);
          if (!w.ok) return { ok: false, why: w.why };
          let macFingerprint = null;
          let drawnFingerprint = null;
          let allowed = false;
          let simPhoneId = null;
          const readsAroundList = [];
          const opened = steps.find((st) => st.startsWith('open:'));
          const sessionIdOpened = opened === undefined ? null : opened.slice('open:'.length);
          let sessionAround = null;
          let removed = null;
          const statusBefore = (await pocket(cdp, 'status')).value ?? null;
          const phonesBefore = (statusBefore?.phones ?? []).map((p) => p.id);
          // Research 136: whether the Mac could send as this window opened
          // (a key kept AND the switch on), which decides whether the phone
          // may be asked at all. Null when the status could not be read.
          const canSend = statusBefore === null ? null : macCanSend(statusBefore);
          // The phone's word on iOS's question: `answered`, or `asked:false`.
          // Allow waits for it (NOTIFICATIONS_SETTLE_MS at most).
          let settleNotifications = () => undefined;
          const notificationsSettled = new Promise((done) => {
            settleNotifications = done;
          });
          let allowPressedAt = null;
          let settledBeforeAllow = null;
          // Phase 316.5. The lines the Mac asked Allow over, the new phone's row
          // as the Mac lists it once paired, how many alert lines the door held
          // before this phone, and every body delivered for a ready line.
          let macLines = null;
          let macLabel = null;
          let newPhoneRow = null;
          const alertLinesBefore = alertLines(statusBefore?.confirmLines ?? []).length;
          const queue = [...(opts.queue ?? [])];
          const deliveries = [];
          // THE MAC'S PAIRING, SAMPLED (N0): each sample is stamped with the
          // moment its read BEGAN, so a `waiting` it reads was true at or after
          // that moment. It stops once the phone reads the list.
          const samples = [];
          let sampling = true;
          const sampler = (async () => {
            while (sampling) {
              const at = Date.now();
              const v = await pocket(cdp, 'pairingState');
              samples.push({ at, state: v.ok ? v.value?.state ?? null : null });
              await sleep(100);
            }
          })();
          // Phase 316.6: the door's waiting rows read around each badge, and
          // the relay's count when Unpair is drawn and when the phone has
          // idled 20 s after it (U1).
          const badgeReads = [];
          let readBeforeTab = null;
          const relayAt = {};
          let result;
          try {
            result = await drive(sim, {
              test: { id: UI_TEST, project: opts.project },
              derivedDataPath: opts.derivedDataPath ?? DD,
              label,
              env: {
                P316_PAYLOAD: w.payload,
                P316_STEPS: steps.join(','),
                P316_WAIT_S: '150',
                P330_DOOR_ENDPOINT: `127.0.0.1:${String(relay.port)}`,
                ...(opts.pushToken === undefined ? {} : { P316_PUSH_TOKEN: opts.pushToken }),
                ...(opts.notifications === undefined ? {} : { P316_NOTIFICATIONS: opts.notifications }),
                // Phase 317: where the probe writes the files an End step waits for.
                ...(opts.env ?? {})
              },
              onEvent: async (event) => {
                if (event.step === 'notifications' && (event.answered !== undefined || event.asked === false)) settleNotifications(event);
                if (event.step === 'fingerprint') {
                  drawnFingerprint = String(event.text ?? '');
                  // ALLOW WAITS FOR THE PHONE'S WORD ON iOS's QUESTION (Phase
                  // 316.5, research 136). The phone is asked only once it has
                  // heard from the Mac that it can send, and it presents its
                  // address only after the answer, so an Allow pressed at the
                  // first `presented` would pair it before its address reached
                  // the Mac. A person answers iOS before reaching for the Mac.
                  const settled = await Promise.race([notificationsSettled, sleep(NOTIFICATIONS_SETTLE_MS).then(() => null)]);
                  settledBeforeAllow = settled === null ? null : settled.answered ?? (settled.asked === false ? 'not asked' : null);
                  // Allowed with a token in hand: wait for the Mac's lines to
                  // name THAT address, bounded; anything else is pressed over
                  // the lines as they stand, and the graders say what they held.
                  const want = settled?.answered === 'allow' && typeof opts.pushToken === 'string' ? `device ${deviceDigest(opts.pushToken)}` : null;
                  const addressBy = Date.now() + ADDRESS_LINE_WAIT_MS;
                  for (let i = 0; i < 120; i += 1) {
                    const v = await pocket(cdp, 'pairingState');
                    if (v.ok && v.value.state === 'presented') {
                      const named = want === null || alertLines(v.value.lines).some((l) => l.endsWith(want));
                      if (!named && Date.now() < addressBy) {
                        await sleep(500);
                        continue;
                      }
                      macFingerprint = v.value.fingerprint;
                      macLines = v.value.lines ?? null;
                      macLabel = v.value.label ?? null;
                      if (fingerprintDigits(macFingerprint) === fingerprintDigits(drawnFingerprint) && fingerprintDigits(drawnFingerprint).length === 24) {
                        allowPressedAt = Date.now();
                        const a = await pocket(cdp, 'allowPhone', { linesRead: v.value.lines, hashRead: v.value.hash });
                        allowed = a.ok && a.value.allowed === true;
                      }
                      break;
                    }
                    await sleep(500);
                  }
                }
                if (event.step === 'list-before') {
                  sampling = false;
                  // Paired: the app's first SIGNED read succeeded. Shut the
                  // window so "allowed" is answered to nobody else (P2b), and read
                  // BEFORE the app's refresh, so the two reads bracket it and an
                  // age that ticks over a minute in between is one of them.
                  await pocket(cdp, 'cancelPairing');
                  readsAroundList.push(await readBlocked());
                  const st = (await pocket(cdp, 'status')).value ?? null;
                  newPhoneRow = (st?.phones ?? []).find((ph) => !phonesBefore.includes(ph.id)) ?? null;
                }
                if (event.step === 'screen' && event.name === 'list') {
                  await pocket(cdp, 'cancelPairing');
                  readsAroundList.push(await readBlocked());
                }
                if (event.step === 'screen' && event.name === 'session' && sessionIdOpened !== null) {
                  // The session as the door answered it at the moment the app drew
                  // it, not minutes later when the run is over.
                  sessionAround = (await readJson(`/v1/session?id=${encodeURIComponent(sessionIdOpened)}`))?.session ?? null;
                }
                if (event.step === 'ready-for-alert') {
                  // ONE queued body per ready line, in order (Phase 316.5).
                  const readySeq = Number(event.seq);
                  const item = queue.shift() ?? null;
                  if (item === null) {
                    deliveries.push({ arm: null, readySeq, code: null, why: 'nothing was queued for this ready line' });
                    return;
                  }
                  let body = null;
                  let why = null;
                  try {
                    body = await item.prepare();
                  } catch (err) {
                    why = String(err?.message ?? err);
                  }
                  if (body === null) {
                    deliveries.push({ arm: item.arm, readySeq, code: null, why: why ?? 'there was nothing to deliver' });
                    return;
                  }
                  const sent = await sim.push(BUNDLE_ID, body).catch((err) => ({ code: -1, stderr: String(err?.message ?? err) }));
                  deliveries.push({ arm: item.arm, readySeq, code: sent.code, bytes: Buffer.byteLength(body), sha: shaHex(body).slice(0, 12), body, why: sent.code === 0 ? null : String(sent.stderr ?? '').trim().slice(0, 200) });
                }
                if (event.step === 'tab-before') readBeforeTab = await readBlocked();
                if (event.step === 'badge') badgeReads.push({ event, reads: [readBeforeTab, await readBlocked()] });
                if (event.step === 'screen' && event.name === 'unpair') relayAt.unpair = { count: relay.count(), at: Date.now() };
                if (event.step === 'idle-start') relayAt.idleStart = { count: relay.count(), at: Date.now() };
                if (event.step === 'idle-end') relayAt.idleEnd = { count: relay.count(), at: Date.now() };
                // Phase 317: the End group's own reactions (Face ID answered
                // from the host, the relay paused), handed in by the caller.
                if (opts.react !== undefined) await opts.react(event);
                if (event.step === 'ready-for-remove') {
                  const phones = ((await pocket(cdp, 'status')).value?.phones ?? []).map((p) => p.id);
                  simPhoneId = phones.find((id) => !phonesBefore.includes(id)) ?? null;
                  const r = simPhoneId === null ? { ok: false, error: 'no new phone listed' } : await pocket(cdp, 'removePhone', simPhoneId);
                  // A Remove closes a listening door until the person confirms
                  // again (316.1 as built, row 19); confirm, so the app's next
                  // read is answered — refused, as unpaired — rather than cut.
                  const again = await confirmListening(cdp);
                  removed = { ok: r.ok, reopened: again.ok };
                }
              }
            });
          } finally {
            sampling = false;
            await sampler;
          }
          if (readsAroundList.length > 0) readsAroundList.push(await readBlocked());
          // The phone this run just paired, as the Mac lists it, for M1: the
          // pins its handshakes must have presented.
          const statusAfter = (await pocket(cdp, 'status')).value ?? null;
          const phonesAfter = (statusAfter?.phones ?? []).map((p) => p.id);
          if (newPhoneRow === null) newPhoneRow = (statusAfter?.phones ?? []).find((ph) => !phonesBefore.includes(ph.id)) ?? null;
          // A body queued for a ready line that never came is said by name.
          for (const item of queue) deliveries.push({ arm: item.arm, readySeq: Number.NaN, code: null, why: 'the UI test printed no ready-for-alert for it' });
          return {
            ok: true,
            result,
            macFingerprint,
            drawnFingerprint,
            allowed,
            readsAroundList: readsAroundList.filter((r) => r !== null),
            removed,
            simPhoneId: simPhoneId ?? phonesAfter.find((id) => !phonesBefore.includes(id)) ?? null,
            sessionAround,
            samples,
            macLines,
            macLabel,
            newPhoneRow,
            alertLinesBefore,
            deliveries,
            canSend,
            allowPressedAt,
            settledBeforeAllow,
            badgeReads,
            relayAt
          };
        };

        /** K1 on `sim`: no window's one-shot secret in anything the app wrote (SPEC §6.4 (p)). */
        const secretScan = async (sim, tag) => {
          const container = await sim.simctl('get_app_container', BUNDLE_ID, 'data');
          const roots = [container.code === 0 ? container.stdout.trim() : null, join(sim.dataPath(), 'Library', 'Keychains')].filter((p) => p !== null && p !== '');
          const scanned = roots.map((r) => filesHolding(r, secretNeedles()));
          const hits = scanned.flatMap((s) => s.hits);
          arm(`K1 ${tag} no window's one-shot secret is in anything the app wrote`, SECRETS.length > 0 && scanned.reduce((n, s) => n + s.files, 0) > 0 && hits.length === 0, `${String(scanned.reduce((n, s) => n + s.files, 0))} file(s) in the app's container and the device keychain read for ${String(SECRETS.length)} secret(s); ${hits.length === 0 ? 'none holds one' : `found in ${J(hits)}`}`);
        };

        /**
         * M1: every signed read the app made presented its client identity. The
         * door admits no connection whose client key is not a paired phone's, so
         * a read ANSWERED 200 was a read with the identity; this counts the
         * handshakes the Mac refused for this run in app.log, which must hold no
         * `no-certificate` or `unknown-key` line from before the Remove.
         */
        const identityHeld = (run) => {
          const log = (() => {
            try {
              return readFileSync(join(PROFILE, 'logs', 'app.log'), 'utf8');
            } catch {
              return '';
            }
          })();
          return { paired: run.allowed && run.readsAroundList.length > 0, refusedUnknownKey: log.split('\n').filter((l) => l.includes('refused a connection at the door: unknown-key')).length, refusedNoCertificate: log.split('\n').filter((l) => l.includes('refused a connection at the door: no-certificate')).length };
        };

        // ==================================================================
        // Phase 316.5: the alerts' own steps on the Mac
        // ==================================================================

        /**
         * STEP ONE of every arm that needs a block: a new session whose fake
         * `claude` prints the committed dialog, and main's own reading of it.
         * It answers the session's id; `mainBlocked` is true only once main
         * reads it `needs_input`, and an arm that finds it false is UNREADABLE.
         */
        const blockNew = async (name) => {
          writeFileSync(NEXT, 'ask', 'utf8');
          await cdpEval(cdp, `window.__gmuxP202.createSession(${J(name)}, 'claude').then(() => true).catch(() => false)`);
          let found = null;
          for (let i = 0; i < 90; i += 1) {
            found = (await mainSessions(cdp)).find((x) => x.name === name) ?? null;
            if (found?.status === 'needs_input') break;
            await sleep(1_000);
          }
          rmSync(NEXT, { force: true });
          return { mainBlocked: found?.status === 'needs_input', sessionId: found?.id ?? null };
        };

        /**
         * N3, run when the order Simulator's UI test says it is ready for the
         * first alert: a new session blocks, and the engine must tell BOTH
         * phones, each at its own environment's origin. The requests are read
         * after the engine's coalescing window and three seconds more, so a
         * stray send lands inside the reading; the reader's `/v1/blocked` is
         * read at once after, and this file composes the alert from it.
         */
        const sendN3 = async () => {
          const from = apns.requests.length;
          const block = await blockNew(N.alert);
          alerts.alertSessionId = block.sessionId;
          let requests = [];
          let answer = null;
          if (block.mainBlocked) {
            for (let i = 0; i < 60 && apns.requests.length - from < 2; i += 1) await sleep(500);
            await sleep(3_000);
            requests = apns.since(from);
            answer = await readBlocked();
          }
          const rows = (answer?.rows ?? []).filter((r) => r.machine === null);
          const row = rows.find((r) => r.sessionId === block.sessionId) ?? null;
          const composed = row === null ? null : composeSingleAlert(row, rows.length);
          alerts.blockedAtN3 = answer;
          alerts.alertName = row?.name ?? null;
          alerts.composedForAlertSession = composed;
          alerts.recordedBody = requests.find((x) => x.origin === 'development' && x.token === TOKENS.app && x.status === 200)?.body ?? null;
          alerts.verdicts.N3 = gradeSent({ mainBlocked: block.mainBlocked, sessionId: block.sessionId, composed, requests, appToken: TOKENS.app, readerToken: TOKENS.reader, topic: TOPIC });
          alerts.readings.N3 = {
            mainBlocked: block.mainBlocked,
            requests: requests.map(redactedRecord),
            blockedRows: rows.length,
            composedBytes: composed === null ? null : Buffer.byteLength(composed),
            composedSha256: composed === null ? null : shaHex(composed),
            recordedSha256: alerts.recordedBody === null ? null : shaHex(alerts.recordedBody)
          };
          return alerts.recordedBody;
        };

        /**
         * N6, run when the UI test says it is ready for the third alert: the
         * alerted session is ended and removed on the Mac, and the door must
         * answer 404 for it before anything is delivered. The body is this
         * file's own composition of the alert N3 sent (byte for byte the
         * recorded one when N3 passed). A session the door still answers for
         * is delivered all the same, so the drive moves on, and N6 reads
         * UNREADABLE.
         */
        const goneN6 = async () => {
          const id = alerts.alertSessionId;
          if (id === null) return null;
          await cdpEval(cdp, `window.gmux.sessions.kill(${J(id)}).catch(() => 0).then(() => window.gmux.sessions.discard(${J(id)}).catch(() => 0)).then(() => true)`);
          let status = null;
          for (let i = 0; i < 30; i += 1) {
            status = (await signedGet(reader, readerDoor, `/v1/session?id=${encodeURIComponent(id)}`)).status;
            if (status === 404) break;
            await sleep(1_000);
          }
          alerts.gone404 = status === 404;
          alerts.readings.N6 = { doorAnswered: status, stillInMain: (await mainSessions(cdp)).some((x) => x.id === id) };
          return alerts.composedForAlertSession;
        };

        /** N7's count body: the count shape over the rows the door holds now. */
        const countN7 = async () => {
          const rows = ((await readBlocked())?.rows ?? []).filter((r) => r.machine === null);
          return composeCountAlert(rows.length > 0 ? rows.map((r) => r.name) : [N.ask], Math.max(1, rows.length));
        };
        /** N7's hostile body: the single shape, naming a session id no door could hold. */
        const hostileN7 = async () => composeSingleAlert({ sessionId: HOSTILE_TAP_SESSION, name: 'p316-x', statusLabel: 'needs input', project: 'p316', agentLabel: 'Claude Code', machine: null }, 1);

        /**
         * F1+'s and ND's body: this file's composition of a single alert for a
         * session the door holds now, from the door's own answer for it. The
         * name the tap must title the session with is kept beside it.
         */
        const composeLive = (slot) => async () => {
          if (talk === undefined) return null;
          const d = (await readJson(`/v1/session?id=${encodeURIComponent(talk.id)}`))?.session ?? null;
          alerts.readings[slot] = { name: d?.name ?? null, sessionId: talk.id };
          return d === null ? null : composeSingleAlert(d, 1);
        };

        /** A delivery's tap, or an empty reading naming the arm when the step never came. */
        const tapOf = (taps, armId) => taps.find((t) => t.arm === armId) ?? { arm: armId, delivery: null, ready: null, banner: null, dump: null, before: null };

        // ==================================================================
        // Phase 316.6: the tabs, the drawn answer and Settings, read the same
        // way on every Simulator that drives them
        // ==================================================================

        /**
         * The markdown session's turns as the door holds them, read once by the
         * node reader: each planted turn's index and the fixture it is (its ask
         * is `p3166 md <name>`), and the door's own answer text, which Method 2
         * re-derives from (`rederive/md-answers.json`).
         */
        const mdTurns = async () => {
          if (md.turns !== null || md.sessionId === null) return md.turns;
          const paged = await pageBack(reader, readerDoor, md.sessionId, 20);
          const all = paged.pages.slice().reverse().flatMap((p) => p.turns);
          const planted = new Map();
          for (const t of all) {
            const m = /^p3166 md (\S+)$/.exec(String(t.askText ?? ''));
            if (m !== null) planted.set(t.index, m[1]);
          }
          md.turns = { ok: paged.ok, all, planted };
          return md.turns;
        };

        /** T2a to T2d, over one drive's lines. */
        const gradeTabArms = (ev, run, where) => {
          const v1 = gradeT2a({ pairEnd: lastDump(ev, 'pair-end') });
          arm(`T2a ${where}: pairing lands on the Needs input tab`, v1.ok, v1.said);
          const v2 = gradeT2b({ badges: run.badgeReads ?? [] });
          arm(`T2b ${where}: the Needs input badge is the door's waiting count`, v2.ok, v2.said);
          const v3 = gradeT2c({ tabSessions: lastDump(ev, 'tab-sessions'), name: talk?.name ?? null });
          arm(`T2c ${where}: a session opened in Sessions is still on top after Needs input and back`, v3.ok, v3.said);
          const v4 = gradeT2d({ bar: ev.find((e) => e.step === 'bar') ?? null, dump: lastDump(ev, 'bar') });
          arm(`T2d ${where}: a pushed session's last element ends at or above the tab bar`, v4.ok, v4.said);
        };

        /** MD1 (and MD2 on the order Simulator), over one drive's lines. */
        const gradeMarkdownArms = async (ev, where, withLinks) => {
          const turns = await mdTurns();
          const markdown = ev.find((e) => e.step === 'markdown') ?? null;
          if (KEEP && markdown !== null) {
            try {
              // The order Simulator's is SPEC §7.4's `<run>/md1.json`; any other is named for its runtime.
              const file = where === 'iOS 26.3' ? 'md1.json' : `md1-${where.replace(/[^a-z0-9.]+/gi, '-')}.json`;
              writeFileSync(join(RUN, file), `${J({ planted: [...(turns?.planted ?? new Map())], markdown }, null, 1)}\n`, { mode: 0o600 });
            } catch {
              /* the kept world may be gone */
            }
          }
          const v1 = gradeMd1({ markdown, planted: turns?.planted ?? new Map() });
          md.readings[`MD1 ${where}`] = { elements: markdown?.elements?.length ?? null, links: markdown?.links?.length ?? null, planted: turns?.planted?.size ?? 0 };
          arm(`MD1 ${where}: markdown off, every planted answer drawn as written, one element each, table-at-caps with every word, no ** pair left`, v1.ok, v1.said);
          if (withLinks) {
            const v2 = gradeMd2({ events: ev, markdown, planted: turns?.planted ?? new Map() });
            arm(`MD2 ${where}: markdown off, no link can be pressed, as in the parent: no link element, the lying link and the long link drawn as their words`, v2.ok, v2.said);
          }
          return { markdown, turns };
        };

        /** S6 over one drive's "settings" dump; `alerts` is Allowed, Off or absent. */
        const gradeSettingsArm = async (ev, run, alerts, where) => {
          const st = (await pocket(cdp, 'status')).value ?? null;
          const row = run.newPhoneRow ?? null;
          const v = gradeS6({
            dump: lastDump(ev, 'settings'),
            publicName: st?.publicName ?? PUBLIC_NAME,
            publicPort: st?.publicPort ?? 8443,
            macFingerprint: row?.fingerprint ?? null,
            drawnFingerprint: run.drawnFingerprint ?? null,
            version: PHONE_VERSION,
            alerts
          });
          arm(`S6 ${where}: Settings names the Mac, its fingerprint and the version, and the Alerts card says what iOS allows`, v.ok, v.said);
        };

        // ==================================================================
        // iOS 26.3: the order
        // ==================================================================
        if (!ARMS.has('order')) await runN2();
        if (ARMS.has('order')) {
          await withSimulator({ label: 'p316-order', runtime: RUNTIME_CURRENT, scratch: join(XCODE, 'sim-order'), derivedDataPath: DD, keep: KEEP }, async (sim) => {
            // ---- N11 (research 136): a Mac that holds the key with its alert
            // switch OFF cannot send, so the phone is never asked. The FIRST
            // drive on this Simulator, while iOS's answer is still not
            // determined: on a device that had already answered, "not asked"
            // would say nothing, because iOS asks only once.
            {
              // Phase 316.6: Settings too, whose Alerts card a Mac that cannot send never gets (S6).
              const noSendSteps = ['pair', 'list', 'settings', `relaunch-token:${TOKENS.other}`];
              const run = await pairAndRead(sim, noSendSteps, 'no-send', { pushToken: TOKENS.nosend, notifications: 'allow' });
              if (!run.ok) {
                arm('N11 a phone pairing with a Mac that cannot send is never asked and never told to pair again', false, run.why);
              } else {
                const ev = run.result.events;
                const n = notificationEvents(ev);
                alerts.readings.N11 = {
                  canSend: run.canSend,
                  asked: n.asked?.asked ?? null,
                  answered: n.answered?.answered ?? null,
                  settledBeforeAllow: run.settledBeforeAllow,
                  alertLinesBefore: run.alertLinesBefore,
                  alertLines: alertLines(run.macLines ?? []).length,
                  row: run.newPhoneRow?.alerts ?? null,
                  relaunches: dumps(ev, 'relaunch').length,
                  lines: ev.length,
                  xcodebuild: run.result.code
                };
                const v = gradeNoSend({
                  canSend: run.canSend,
                  events: ev,
                  allowed: run.allowed,
                  macLines: run.macLines,
                  alertLinesBefore: run.alertLinesBefore,
                  token: TOKENS.nosend,
                  phoneRow: run.newPhoneRow,
                  alive: aliveOf(ev),
                  alertWords: ALERT_WORDS
                });
                arm('N11 a phone pairing with a Mac that cannot send is never asked and never told to pair again', v.ok, v.said);
                await gradeSettingsArm(ev, run, 'absent', 'iOS 26.3, a Mac that cannot send');
              }
            }
            await runN2();
            {
              // Phase 316.5: the alert steps sit between the conversation and
              // the Remove, in the SPEC's order (§7.4): N4, N5, N6, N7 twice,
              // then N8's two relaunches. One body is queued per ready line.
              // The fix round taps N6 from the LIST (`back` first: N5 leaves
              // the very session N6 names on screen, where a tap changes
              // nothing) and N6b from ANOTHER session's screen (`visit`).
              // Phase 316.6 (SPEC §7.4): the tabs around the session (T2), the
              // markdown session (MD1, MD2), and Settings (S6), before the
              // alerts, which start from Home. Markdown off (his ruling of
              // 2026-10-02): no answer holds a link to tap, so the drive no
              // longer taps one; MD2 reads the markdown step's link list.
              const steps = [
                'pair',
                'tab:needs',
                'list',
                ...(talk !== undefined ? [`open:${talk.id}`, 'bar', 'tab:needs', 'tab:sessions', 'conversation', 'first'] : []),
                ...(md.sessionId !== null ? [`visit:${md.sessionId}`, 'conversation', 'markdown'] : []),
                'settings',
                'alert',
                'alert-cold',
                'back',
                'alert-gone',
                ...(talk !== undefined ? [`visit:${talk.id}`, 'alert-gone'] : []),
                'alert-list',
                'alert-list',
                `relaunch-token:${TOKENS.other}`,
                `relaunch-token:${TOKENS.app}`,
                'unpaired'
              ];
              const queue = [
                { arm: 'N4', prepare: sendN3 },
                { arm: 'N5', prepare: async () => alerts.recordedBody },
                { arm: 'N6', prepare: goneN6 },
                ...(talk !== undefined ? [{ arm: 'N6b', prepare: async () => (alerts.gone404 ? alerts.composedForAlertSession : null) }] : []),
                { arm: 'N7a', prepare: countN7 },
                { arm: 'N7b', prepare: hostileN7 }
              ];
              const run = await pairAndRead(sim, steps, 'order', { pushToken: TOKENS.app, notifications: 'allow', queue });
              if (run.ok) alerts.deliveries.push(...run.deliveries);
              if (!run.ok) {
                arm('P1 pairing', false, run.why);
                return;
              }
              const ev = run.result.events;
              report.readings.order = { xcodebuild: run.result.code, ms: run.result.ms, lines: ev.length, executed: run.result.executed, reactionErrors: run.result.reactionErrors };
              if (ev.length === 0) {
                arm('P1 pairing', null, `the UI test printed no P316 line (xcodebuild exited ${String(run.result.code)}, ${String(run.result.executed)} test(s), ${String(run.result.skipped)} skipped); is ${UI_TEST} there?`);
                return;
              }
              // P1
              const listDrawn = lastDump(ev, 'list') !== null && el(lastDump(ev, 'list'), 'screen-list') !== null;
              arm(
                'P1 the fingerprint the app draws is the Mac\'s, Allow, and the first SIGNED read makes it paired',
                run.drawnFingerprint !== null && run.macFingerprint !== null && fingerprintDigits(run.drawnFingerprint) === fingerprintDigits(run.macFingerprint) && run.allowed && listDrawn,
                `drawn ${J(fingerprintDigits(run.drawnFingerprint ?? '').length)} hex digits, the Mac's ${run.macFingerprint === null ? 'never shown' : fingerprintDigits(run.drawnFingerprint ?? '') === fingerprintDigits(run.macFingerprint) ? 'THE SAME' : 'DIFFERENT'}${run.drawnFingerprint === run.macFingerprint ? ', byte for byte' : ''}; Allow ${run.allowed ? 'pressed' : 'NOT pressed'}; the list ${listDrawn ? 'drawn' : 'NOT drawn'}`
              );
              // N0 (Phase 316.5): iOS asked after the fingerprint, before the
              // phone presented, and the Mac holds the address it presented.
              {
                const n = notificationEvents(ev);
                alerts.readings.N0 = { canSend: run.canSend, asked: n.asked?.asked ?? null, answered: n.answered?.answered ?? null, settledBeforeAllow: run.settledBeforeAllow, samples: run.samples.length, alertLines: alertLines(run.macLines ?? []).length, row: run.newPhoneRow?.alerts ?? null };
                const v = gradeAsked({ canSend: run.canSend, events: ev, samples: run.samples, macLines: run.macLines, label: run.macLabel, token: TOKENS.app, phoneRow: run.newPhoneRow });
                arm('N0 the Mac can send, so the phone asks for notifications after the fingerprint and before it is allowed, and the Mac holds its development address', v.ok, v.said);
              }
              // L1
              const listGrade = run.readsAroundList.length === 0 ? ['the node reader read nothing around the list'] : gradeList(lastDump(ev, 'list'), run.readsAroundList);
              arm('L1 the list says what main sent, in its order, at the mocks\' frames', !Array.isArray(listGrade), Array.isArray(listGrade) ? listGrade.slice(0, 8).join('; ') : `sections and ${String(run.readsAroundList[0].rows.length + run.readsAroundList[0].others.length)} row(s) agree; frames ${J(listGrade.frames)}`);
              report.readings.frames.measured = Array.isArray(listGrade) ? null : listGrade.frames;
              // S1
              if (talk !== undefined) {
                const detail = run.sessionAround ?? (await readJson(`/v1/session?id=${encodeURIComponent(talk.id)}`))?.session ?? null;
                const d = lastDump(ev, 'session');
                const problems = [];
                if (detail === null) problems.push('the node reader could not read the session, so there is nothing to compare with');
                else if (d === null) problems.push('no "session" dump');
                else {
                  if (el(d, 'session-status')?.label !== detail.statusTitle) problems.push(`the status reads ${J(el(d, 'session-status')?.label)}, not ${J(detail.statusTitle)}`);
                  const agent = el(d, 'session-agent')?.label ?? '';
                  if (!agent.includes(detail.agentLabel) || !agent.includes(detail.project)) problems.push(`the agent line ${J(agent)} does not carry ${J(detail.agentLabel)} and ${J(detail.project)}`);
                  if (detail.catchUp !== null && !(el(d, 'session-outcome')?.label ?? '').includes(detail.catchUp.outcome)) problems.push('the Catch Me Up outcome is not main\'s');
                  const last = el(d, 'session-last-message-small')?.label ?? el(d, 'session-last-message')?.label ?? '';
                  if (detail.lastMessageText === null && /(^|\s)0(\s|$)/.test(last)) problems.push('a missing last message is drawn as 0');
                  // Since Phase 316.6 `session-answer` is a container: the
                  // answer is the UI test's composition of its md-last- blocks.
                  const composedLast = typeof d.composed?.last === 'string' && d.composed.last !== '' ? d.composed.last : null;
                  const answer = composedLast ?? (el(d, 'session-answer')?.label || null);
                  if (detail.lastAnswer !== null && (answer === null || answer.includes('**'))) problems.push(`the last answer is ${answer === null ? 'not drawn' : 'drawn with its asterisks, so not as markdown'}`);
                }
                arm('S1 one session, in main\'s words', problems.length === 0, problems.length === 0 ? `status, agent and project, the outcome, the counts and the last answer (markdown, ${String(detail?.lastAnswer?.length ?? 0)} characters) agree with the door` : problems.join('; '));
                // T1
                const turnsEvent = ev.find((e) => e.step === 'turns') ?? null;
                const paged = await pageBack(reader, readerDoor, talk.id, 20);
                const all = paged.pages.slice().reverse().flatMap((p) => p.turns);
                const planted = all.find((t) => typeof t.askText === 'string' && t.askText.includes('**x**'));
                const tProblems = [];
                if (detail === null) tProblems.push('the node reader could not read the session');
                else if (turnsEvent === null) tProblems.push('no "turns" line');
                else {
                  const drawnIdx = [...new Set((turnsEvent.indexes ?? []).map(Number))].sort((a, b) => a - b);
                  if (paged.pages.length < 2) tProblems.push(`the door holds this conversation on ${String(paged.pages.length)} page(s), so paging back was not proved (it must be at least two)`);
                  if (drawnIdx.length !== detail.turnCount) tProblems.push(`${String(drawnIdx.length)} turn(s) drawn, and the door's turnCount is ${String(detail.turnCount)}`);
                  if (J(drawnIdx) !== J(all.map((t) => t.index))) tProblems.push('the indexes drawn are not the indexes the door holds');
                  if (planted !== undefined) {
                    const ask = turnsEvent.asks?.[String(planted.index)] ?? null;
                    const ans = turnsEvent.answers?.[String(planted.index)] ?? null;
                    if (ask === null || !ask.includes('**x**')) tProblems.push(`the planted ask reads back ${ask === null ? 'nowhere' : 'WITHOUT its asterisks'}: it was drawn as markdown`);
                    if (ans === null || ans.includes('**')) tProblems.push(`the planted answer reads back ${ans === null ? 'nowhere' : 'WITH its asterisks'}: it was not drawn as markdown`);
                  } else tProblems.push('the planted turn is not in the door\'s record');
                  const top = lastDump(ev, 'conversation-top') ?? lastDump(ev, 'conversation');
                  if (COPY.terminal !== null && el(top, 'conversation-terminal-line')?.label !== COPY.terminal && el(lastDump(ev, 'conversation'), 'conversation-terminal-line')?.label !== COPY.terminal) tProblems.push('the terminal line is not drawn');
                }
                arm('T1 the conversation, paged to the first turn, ask plain and answer formatted', tProblems.length === 0, tProblems.length === 0 ? `${String(all.length)} turn(s) drawn of ${String(detail.turnCount)} over the door's ${String(paged.pages.length)} pages; **x** kept in the ask, rendered in the answer; the terminal line drawn` : tProblems.join('; '));
              }
              // ---- Phase 316.6: T2a to T2d, MD1, MD2 and S6 -----------------
              gradeTabArms(ev, run, 'iOS 26.3');
              const orderMarkdown = await gradeMarkdownArms(ev, 'iOS 26.3', true);
              md.readings.headAnswers = composeScopes(orderMarkdown.markdown?.elements ?? []);
              // The markdown session's own screen: the FIRST visit (N6b's comes later).
              md.readings.headLast = md.sessionId === null ? null : dumps(ev, 'visit')[0]?.composed?.last ?? null;
              await gradeSettingsArm(ev, run, 'Allowed', 'iOS 26.3');
              // ---- N3 to N8 (Phase 316.5), in the SPEC's order ------------
              {
                const taps = tapReadings(ev, run.deliveries);
                const alive = aliveOf(ev);
                const name = alerts.alertName ?? N.alert;
                const n3 = alerts.verdicts.N3 ?? verdict(null, 'the UI test printed no ready line for the first alert, so no session was made to block');
                arm('N3 a new wait is sent once to each phone, at its own environment\'s origin, signed, and byte for byte this file\'s composition', n3.ok, n3.said);
                const n4 = gradeTap({ ...tapOf(taps, 'N4'), name, cold: false });
                arm('N4 a tap on the alert opens the session it names', n4.ok, n4.said);
                const n5 = gradeTap({ ...tapOf(taps, 'N5'), name, cold: true });
                arm('N5 a tap on the alert with the app terminated launches it onto that session', n5.ok, n5.said);
                const n6 = gradeGone({ ...tapOf(taps, 'N6'), gone404: alerts.gone404, word: MAC.noSuchSession, alive, from: 'list' });
                arm('N6 a tap from the list on an alert for a session the Mac removed draws the Mac\'s own sentence on the list', n6.ok, n6.said);
                const n6b = talk === undefined ? verdict(null, 'no conversation session was made, so there was no other session to tap from') : gradeGone({ ...tapOf(taps, 'N6b'), gone404: alerts.gone404, word: MAC.noSuchSession, alive, from: 'session' });
                arm('N6b the same tap from another session\'s screen draws the Mac\'s own sentence on the list', n6b.ok, n6b.said);
                const n7 = gradeListTaps({ taps: [tapOf(taps, 'N7a'), tapOf(taps, 'N7b')], alive });
                arm('N7 a count alert and an alert naming ../x each open the list and say nothing', n7.ok, n7.said);
                const relaunches = dumps(ev, 'relaunch');
                alerts.readings.N8 = { relaunches: relaunches.length, lines: relaunches.map((d) => el(d, 'list-alerts-line')?.label ?? null) };
                const n8 = gradeRelaunch({ dumps: relaunches });
                arm('N8 a changed alert address draws "Pair again to get alerts.", and the paired one draws nothing', n8.ok, n8.said);
                alerts.readings.taps = taps.map((t) => ({ arm: t.arm, delivered: t.delivery?.code ?? null, banner: t.banner === null ? 'no line' : t.banner.label === null ? 'none found' : `${String(t.banner.label).length} characters`, dump: t.dump?.name ?? null, cold: t.ready?.cold ?? null }));
              }
              // R1
              const unpaired = lastDump(ev, 'unpaired');
              const line = unpaired === null ? null : (unpaired.elements ?? []).find((e) => e.label === COPY.notPaired) ?? null;
              arm('R1 Remove on the Mac, and the app draws its unpaired line', run.removed?.ok === true && unpaired !== null && el(unpaired, 'screen-pairing') !== null && line !== null && aliveOf(ev) === RUNNING_FOREGROUND, `Remove ${run.removed === null ? 'never pressed (no ready-for-remove line)' : run.removed.ok ? 'pressed' : 'FAILED'}, the door ${run.removed?.reopened ? 'confirmed again' : 'NOT reopened'}; the app ${unpaired === null ? 'drew no unpaired screen' : line === null ? 'drew the pairing screen without the line' : 'drew the line'}; state ${J(aliveOf(ev))}`);
              // M1: the app's reads before the Remove all carried its identity:
              // none was refused for a missing or unknown client key, and the
              // Remove is what made its next connection unknown.
              const held = identityHeld(run);
              report.readings.m1 = held;
              arm('M1 the app presented its client identity on every read, through the stand-in\'s forwarder', held.paired && held.refusedNoCertificate === 0, `paired and read ${held.paired ? 'yes' : 'NO'}; app.log holds ${String(held.refusedNoCertificate)} no-certificate and ${String(held.refusedUnknownKey)} unknown-key refusal line(s) (unknown-key is the Remove's own)`);
            }
            await secretScan(sim, 'iOS 26.3');
          });
        }

        // ==================================================================
        // N9 (Phase 316.5): alerts off, and a new wait sends nothing
        // ==================================================================
        {
          // Alerts must be ARMED when this begins, or a disarm says nothing.
          // R1's Remove moved the door's hash, so they disarmed and re-armed
          // around its re-confirm; what counts is the lines this step GAINS.
          const armedBefore = await countLogLines('phone alerts armed');
          const disarmedBefore = await countLogLines('phone alerts disarmed');
          const from = apns.requests.length;
          const off = await pocket(cdp, 'setPushAlerts', { on: false });
          if (off.ok) await waitStatus(cdp, (s) => s.pushAlerts === false, 15_000);
          for (let i = 0; i < 40 && (await countLogLines('phone alerts disarmed')) === disarmedBefore; i += 1) await sleep(500);
          // The switch is a confirmed field: the door closes until it is
          // confirmed again, which the floor and the denied phone need.
          const again = await confirmListening(cdp);
          // Step one: the new wait must be read by main.
          const block = await blockNew(N.quiet);
          const quietFrom = Date.now();
          if (block.mainBlocked) await sleep(QUIET_AFTER_OFF_MS);
          const after = await pocket(cdp, 'status');
          const reading = {
            armedAtStart: armedBefore > disarmedBefore,
            armedBefore,
            disarmedBefore,
            reconfirmed: again.ok,
            mainBlocked: block.mainBlocked,
            pushAlerts: after.ok ? after.value.pushAlerts : null,
            disarmed: (await countLogLines('phone alerts disarmed')) - disarmedBefore,
            requests: apns.requests.length - from,
            waitedMs: Date.now() - quietFrom
          };
          alerts.readings.N9 = reading;
          const v = gradeOff(reading);
          arm('N9 alerts off disarms once, and a new wait sends nothing for 15 s', v.ok, v.said);
        }

        // ---- Alerts back on (research 136) ------------------------------
        // The floor phone and the denied phone must each be ASKED, and a
        // phone is asked only when the Mac can send. So the switch goes back
        // on and is confirmed through the sheet's own lines, and the armed
        // line it gains is read. Not an arm of its own: F1+ and ND read the
        // Mac's state as their window opens and are UNREADABLE when it
        // could not send. Nothing new blocks while they run, so the engine,
        // which seeds silently, sends nothing here.
        if (ARMS.has('floor') || ARMS.has('deny')) {
          const armedBefore = await countLogLines('phone alerts armed');
          const on = await pocket(cdp, 'setPushAlerts', { on: true });
          const onRead = on.ok ? await waitStatus(cdp, (s) => s.pushAlerts === true, 15_000) : { ok: false };
          const again = onRead.ok ? await confirmListening(cdp) : { ok: false, why: on.ok ? 'pushAlerts never read on' : on.error };
          for (let i = 0; i < 40 && (await countLogLines('phone alerts armed')) === armedBefore; i += 1) await sleep(500);
          const st = (await pocket(cdp, 'status')).value ?? null;
          alerts.readings.rearmed = { on: onRead.ok, confirmed: again.ok, canSend: st === null ? null : macCanSend(st), armedGained: (await countLogLines('phone alerts armed')) - armedBefore };
          say(`alerts back on for the floor and the denied phone: ${J(alerts.readings.rearmed)}`);
        }

        // ==================================================================
        // iOS 18.3: THE FLOOR ARM
        // ==================================================================
        if (ARMS.has('floor')) {
          await confirmListening(cdp);
          await withSimulator({ label: 'p316-floor', runtime: RUNTIME_FLOOR, scratch: join(XCODE, 'sim-floor'), derivedDataPath: DD, keep: KEEP }, async (sim) => {
            // Phase 316.5: F1+ is the tap on the floor, after F1's pairing.
            // Phase 316.6 (SPEC §7.4): the tabs (T2), the markdown session
            // (MD1) and Settings (S6) on the floor, then U1 after F1+: Unpair's
            // question cancelled, then pressed, 20 s with nothing touched,
            // and a relaunch with no forget seam.
            const floorSteps = [
              'pair',
              'tab:needs',
              'list',
              ...(talk !== undefined ? [`open:${talk.id}`, 'bar', 'tab:needs', 'tab:sessions'] : []),
              ...(md.sessionId !== null ? [`visit:${md.sessionId}`, 'conversation', 'markdown'] : []),
              'alert',
              'settings',
              'unpair-cancel',
              'unpair',
              'idle:20',
              'relaunch-keep'
            ];
            const run = await pairAndRead(sim, floorSteps, 'floor', { pushToken: TOKENS.floor, notifications: 'allow', queue: [{ arm: 'F1+', prepare: composeLive('F1+') }] });
            if (run.ok) alerts.deliveries.push(...run.deliveries);
            if (!run.ok) {
              arm('F1 iOS 18.3 pairing', false, run.why);
            } else if (run.result.events.length === 0) {
              arm('F1 iOS 18.3 pairing', null, `the UI test printed no P316 line on iOS ${sim.runtime} (xcodebuild exited ${String(run.result.code)})`);
            } else {
              const listGrade = run.readsAroundList.length === 0 ? ['the node reader read nothing around the list'] : gradeList(lastDump(run.result.events, 'list'), run.readsAroundList);
              arm(`F1 iOS ${sim.runtime}: the fingerprint matches, Allow, the signed read, the list`, fingerprintDigits(run.drawnFingerprint ?? '') === fingerprintDigits(run.macFingerprint ?? 'x') && run.allowed && !Array.isArray(listGrade), Array.isArray(listGrade) ? listGrade.slice(0, 6).join('; ') : `paired and the list agrees; frames ${J(listGrade.frames)}`);
              const t = tapOf(tapReadings(run.result.events, run.deliveries), 'F1+');
              const name = alerts.readings['F1+']?.name ?? null;
              const n = notificationEvents(run.result.events);
              alerts.readings['F1+'] = { ...(alerts.readings['F1+'] ?? {}), canSend: run.canSend, asked: n.asked?.asked ?? null, answered: n.answered?.answered ?? null, settledBeforeAllow: run.settledBeforeAllow, alertLines: alertLines(run.macLines ?? []).length, row: run.newPhoneRow?.alerts ?? null };
              const pairing = { canSend: run.canSend, events: run.result.events, samples: run.samples, macLines: run.macLines, label: run.macLabel, token: TOKENS.floor, phoneRow: run.newPhoneRow };
              const v = name === null ? verdict(null, 'the door answered nothing for the live session, so no alert was composed for it') : gradeFloorTap({ pairing, tap: { ...t, name, cold: false } });
              arm(`F1+ iOS ${sim.runtime}: asked and allowed while the Mac can send, and a tap on an alert naming a live session opens it`, v.ok, v.said);
              // ---- Phase 316.6 on the floor ----------------------------------
              const ev = run.result.events;
              gradeTabArms(ev, run, `iOS ${sim.runtime}`);
              await gradeMarkdownArms(ev, `iOS ${sim.runtime}`, false);
              await gradeSettingsArm(ev, run, 'Allowed', `iOS ${sim.runtime}`);
              // U1: the Mac still lists the phone (its half is Phase 317's),
              // and a new code pairs the same Simulator again onto Needs input.
              const listed = (await pocket(cdp, 'status')).value ?? null;
              const again = await pairAndRead(sim, ['pair'], 'floor-again', { notifications: 'allow' });
              // That drive reads no list, whose first line is what shuts the window.
              await pocket(cdp, 'cancelPairing');
              const unpairSheet = ev.find((e) => e.step === 'unpair-sheet' && e.for === 'unpair') ?? null;
              const at = run.relayAt ?? {};
              const u1 = gradeU1({
                settings: lastDump(ev, 'settings'),
                cancelDump: lastDump(ev, 'unpair-cancel'),
                sheet: unpairSheet,
                question: copyOf('unpairQuestion'),
                note: copyOf('unpairNote'),
                unpaired: lastDump(ev, 'unpair'),
                notPaired: COPY.notPaired,
                relay: at.unpair === undefined || at.idleEnd === undefined ? null : { before: at.unpair.count, after: at.idleEnd.count, waitedMs: at.idleEnd.at - at.unpair.at },
                relaunch: lastDump(ev, 'relaunch-keep'),
                stillListed: listed === null || run.simPhoneId === null ? null : (listed.phones ?? []).some((ph) => ph.id === run.simPhoneId),
                again: again.ok ? lastDump(again.result.events, 'pair-end') : null
              });
              md.readings.U1 = { relay: at, stillListed: listed === null ? null : (listed.phones ?? []).length, again: again.ok ? again.result.events.length : again.why };
              arm(`U1 iOS ${sim.runtime}: Unpair forgets the pairing on the phone, dials nothing after, and a new code pairs again`, u1.ok, u1.said);
            }
            await secretScan(sim, `iOS ${sim.runtime}`);
          });
        }

        // ==================================================================
        // iOS 26.3: ND, notifications denied (Phase 316.5)
        // ==================================================================
        if (ARMS.has('deny')) {
          await confirmListening(cdp);
          await withSimulator({ label: 'p316-deny', runtime: RUNTIME_CURRENT, scratch: join(XCODE, 'sim-deny'), derivedDataPath: DD, keep: KEEP }, async (sim) => {
            // Handed a seam token all the same: a phone that denies must
            // present NO address, whatever it could have registered.
            // Phase 316.6: Settings too, whose Alerts row reads Off (S6).
            const steps = ['pair', 'list', ...(talk !== undefined ? [`open:${talk.id}`, 'conversation'] : []), 'settings', 'no-banner:20'];
            const run = await pairAndRead(sim, steps, 'deny', { pushToken: TOKENS.deny, notifications: 'deny', queue: [{ arm: 'ND', prepare: composeLive('ND') }] });
            if (!run.ok) {
              arm('ND notifications denied: it pairs with no address and works', false, run.why);
            } else {
              alerts.deliveries.push(...run.deliveries);
              const d = run.deliveries.find((x) => x.arm === 'ND') ?? null;
              const n = notificationEvents(run.result.events);
              alerts.readings.ND = { canSend: run.canSend, asked: n.asked?.asked ?? null, answered: n.answered?.answered ?? null, settledBeforeAllow: run.settledBeforeAllow, alertLinesBefore: run.alertLinesBefore, alertLines: alertLines(run.macLines ?? []).length, row: run.newPhoneRow?.alerts ?? null, delivered: d?.code ?? null };
              const v = gradeDeny({
                canSend: run.canSend,
                events: run.result.events,
                allowed: run.allowed,
                macLines: run.macLines,
                alertLinesBefore: run.alertLinesBefore,
                token: TOKENS.deny,
                phoneRow: run.newPhoneRow,
                delivery: d === null || d.code === null ? null : { code: d.code },
                alive: aliveOf(run.result.events)
              });
              arm('ND notifications denied: it pairs with no address, the list, a session and its conversation are drawn, and no banner shows', v.ok, v.said);
              await gradeSettingsArm(run.result.events, run, 'Off', 'iOS 26.3, notifications denied');
            }
            await secretScan(sim, 'iOS 26.3, notifications denied,');
          });
        }

        // ==================================================================
        // iOS 26.3: the hostile door
        // ==================================================================
        // ==================================================================
        // Phase 317: THE END GROUP (build/p317/SPEC.md §7.5). Face ID is
        // enrolled and answered from the host through build/simulator-run.mjs's
        // `biometry`, on the line the UI test prints once iOS's owner check is
        // up; the probe writes the file the step waits for after it answered.
        // Every session ended is a shell. No word here is the phone's but the
        // ones it drew.
        // ==================================================================
        if (ARMS.has('end')) {
          const ACKS = join(RUN, 'acks');
          mkdirSync(ACKS, { recursive: true });
          const ackFile = (name) => writeFileSync(join(ACKS, name), 'ok\n');
          const tmuxAlive = (name) => spawnSync('tmux', ['-L', SOCKET, 'has-session', '-t', `=${name}`], { encoding: 'utf8', timeout: 10_000 }).status === 0;
          const full = async () =>
            JSON.parse(await cdpEval(cdp, 'window.gmux.sessions.list().then((s) => JSON.stringify(s.map((x) => ({ id: x.id, name: x.name, tmuxName: x.tmuxName, status: x.status }))))'));
          const shellNamed = async (name) => {
            await cdpEval(cdp, `window.gmux.sessions.create(${J({ name, projectPath: WORK, cwd: WORK, agent: 'shell' })}).then(() => true).catch(() => false)`);
            for (let i = 0; i < 60; i += 1) {
              const s = (await full()).find((x) => x.name === name);
              if (s !== undefined && ['running', 'idle', 'needs_input'].includes(s.status)) return s;
              await sleep(500);
            }
            return (await full()).find((x) => x.name === name) ?? null;
          };
          const logText = async () => (await appLogText()).split('\n');
          const doneLines = async () => (await logText()).filter((l) => l.includes(DONE_LINE)).length;
          const writeLines = async () => (await logText()).filter((l) => l.includes("the phone's end:")).length;
          const actsFor = async (id) => (await logText()).filter((l) => l.includes("the phone's end:") && l.includes(id)).length;
          const doorStatusOf = async (id) => (await readJson(`/v1/session?id=${encodeURIComponent(id)}`))?.session?.statusTitle ?? null;
          const mainStatusOf = async (id) => (await full()).find((x) => x.id === id)?.status ?? null;
          const byFor = (events, step, name) => events.filter((e) => e.step === step && e.for === name);
          /**
           * The reactions every End drive shares: Face ID answered in the
           * order `answers` names, Face ID unenrolled, and the Mac's counts
           * taken at the moments the grading reads. `holds` (the fix round)
           * names the steps whose write the relay catches before its bytes
           * are handed: before Face ID is answered the relay lets that many
           * connections through and holds every one after, and once the UI
           * test says Home was pressed, and the app has had three seconds in
           * the background, the relay forwards again, so the screen it reads
           * on return is read through it.
           */
          const reactor = (sim, answers, marks, holds = {}) => async (event) => {
            if (event.step === 'end-auth-up') {
              marks[`auth:${String(event.for)}`] = { done: await doneLines(), writes: await writeLines(), relay: relay.count(), held: relay.held() };
              const hold = holds[String(event.for)];
              if (typeof hold === 'number') relay.pauseAfter(hold);
              const answer = answers.shift() ?? 'match';
              const b = await sim.biometry(answer).catch((err) => ({ code: -1, stderr: String(err?.message ?? err) }));
              marks.biometry = [...(marks.biometry ?? []), { for: event.for, answer, code: b.code }];
              ackFile(`auth-${String(event.seq)}`);
            }
            if (event.step === 'ready-for-unenrol') {
              const b = await sim.biometry('unenrol').catch(() => ({ code: -1 }));
              marks.unenrol = b.code;
              ackFile(`unenrol-${String(event.seq)}`);
            }
            if (event.step === 'end-home-pressed' || event.step === 'end-these-home-pressed') {
              const name = event.step === 'end-home-pressed' ? 'end-home' : 'end-these-home';
              if (typeof holds[name] === 'number') {
                await sleep(3_000);
                marks[`held:${name}`] = relay.held() - (marks[`auth:${name}`]?.held ?? relay.held());
                relay.resume();
              }
            }
            if (event.step === 'screen') marks[`screen:${String(event.name)}`] = { done: await doneLines(), writes: await writeLines(), relay: relay.count() };
            if (event.step === 'idle-start') marks[`idle-start:${String(Object.keys(marks).filter((k) => k.startsWith('idle-start:')).length)}`] = { writes: await writeLines(), relay: relay.count() };
            if (event.step === 'idle-end') marks[`idle-end:${String(Object.keys(marks).filter((k) => k.startsWith('idle-end:')).length)}`] = { writes: await writeLines(), relay: relay.count() };
          };
          const idleDelta = (marks, k, field) => (marks[`idle-end:${String(k)}`] === undefined || marks[`idle-start:${String(k)}`] === undefined ? null : marks[`idle-end:${String(k)}`][field] - marks[`idle-start:${String(k)}`][field]);

          // ---- the sessions ------------------------------------------------
          const S = {};
          for (const key of ['e1', 'e2', 'e3', 'e4a', 'e4b', 'e4c', 'e5', 'e6', 'e7a', 'e7b', 'e7c', 'e10', 'ep']) S[key] = await shellNamed(`p317-${key}`);
          await cdpEval(cdp, `window.gmux.sessions.kill(${J(S.e4c?.id ?? '')}).then(() => true).catch(() => false)`);
          for (let i = 0; i < 40 && (await mainStatusOf(S.e4c?.id)) !== 'exited'; i += 1) await sleep(500);
          if (Object.values(S).some((s) => s === null)) arm('E the end group\'s sessions', null, `not every session was made live: ${J(Object.fromEntries(Object.entries(S).map(([k, s]) => [k, s?.status ?? null])))}`);
          else {
            const wantE1 = (await readJson(`/v1/session?id=${encodeURIComponent(S.e1.id)}`))?.session?.endConfirm ?? null;
            const copyTs = (() => {
              try {
                return readFileSync(join(ROOT, 'src', 'renderer', 'session-manager', 'copy.ts'), 'utf8');
              } catch {
                return '';
              }
            })();
            const batchBodyLocal = /'(This stops what is running in them[^']*)'/.exec(copyTs)?.[1] ?? null;
            // E7's rows in the order the phone DRAWS them, which is the order
            // its batch runs (the tests round: the door draws `others` newest
            // output first, so row one is the last made, never e7a). The drive
            // waits on the first drawn row and the grade reads them in this
            // order; the confirmation's order is read after and must agree.
            const e7Drawn = drawnOrderOf([S.e7a, S.e7b, S.e7c], await readJson('/v1/blocked'));
            const E7 = e7Drawn ?? [S.e7a, S.e7b, S.e7c];
            report.readings.E7Order = { drawn: e7Drawn === null ? null : e7Drawn.map((s) => s.name) };

            // ---- E1 to E7 and E3, one drive on iOS 26.3 --------------------
            await withSimulator({ label: 'p316-end', runtime: RUNTIME_CURRENT, scratch: join(XCODE, 'sim-end'), derivedDataPath: DD, keep: KEEP }, async (sim) => {
              const enrol = await sim.biometry('enrol');
              report.readings.endEnrol = enrol.code;
              const marks = {};
              const steps = [
                'pair',
                'list',
                `open:${S.e1.id}`,
                'end',
                'back',
                `open:${S.e2.id}`,
                'end-cancel',
                'back',
                `select:${S.e4a.id}+${S.e4b.id}+${S.e4c.id}`,
                'end-these',
                'batch-done',
                `open:${S.e5.id}`,
                'end-home',
                'idle:20',
                'back',
                `select:${S.e7a.id}+${S.e7b.id}+${S.e7c.id}`,
                `end-these-home:${E7[0].id}`,
                'idle:20',
                'batch-done',
                `open:${S.e6.id}`,
                `end-kill:${S.e6.id}`,
                'idle:20',
                `end-off:${S.e3.id}`
              ];
              // E5 holds its one write (0 through) and E7 lets row one's pass
              // and holds row two's (1 through): the withheld path, live.
              const run = await pairAndRead(sim, steps, 'end', { env: { P316_ACKS: ACKS }, react: reactor(sim, ['match', 'nomatch', 'match', 'match', 'match', 'match'], marks, { 'end-home': 0, 'end-these-home': 1 }) });
              const events = run.ok ? run.result.events : [];
              report.readings.endMarks = { ...marks };
              if (!run.ok || events.length === 0) {
                arm('E1 End above the tab bar, the Mac\'s confirmation, Face ID, one act', null, `the drive did not run: ${String(run.why ?? 'no P316 line')}`);
                return;
              }
              const auth = (name) => byFor(events, 'end-auth-up', name).length > 0;
              const acked = (name) => byFor(events, 'end-auth-answered', name).some((e) => e.acked === true);
              // E1
              {
                const d = lastDump(events, 'end');
                const before = marks['auth:end']?.done ?? null;
                const reading = {
                  authUp: auth('end'),
                  acked: acked('end'),
                  permission: (() => {
                    const p = byFor(events, 'faceid-permission', 'end');
                    return { seen: p.some((e) => e.seen === true), pressed: p.find((e) => e.pressed !== undefined)?.pressed ?? null, stillUp: p.some((e) => e.stillUp === true) };
                  })(),
                  bar: byFor(events, 'end-bar', 'end')[0] ?? null,
                  dialog: byFor(events, 'end-dialog', 'end')[0] ?? null,
                  want: wantE1,
                  doneLines: before === null || marks['screen:end'] === undefined ? null : marks['screen:end'].done - before,
                  tmuxAlive: tmuxAlive(S.e1.tmuxName),
                  mainStatus: await mainStatusOf(S.e1.id),
                  drawnStatus: el(d, 'session-status')?.label ?? null,
                  doorStatus: await doorStatusOf(S.e1.id),
                  barAfter: el(d, 'session-end-bar') !== null
                };
                const v = gradeE1(reading);
                arm('E1 End above the tab bar with Face ID\'s mark, the Mac\'s confirmation, iOS\'s first-use question accepted, a match, one act', v.ok, v.said);
              }
              // E2
              {
                const d = lastDump(events, 'end-cancel');
                const before = marks['auth:end-cancel'];
                const cancel = byFor(events, 'faceid-cancel', 'end-cancel')[0] ?? null;
                const v = gradeE2({
                  authUp: auth('end-cancel'),
                  acked: acked('end-cancel'),
                  cancelFound: cancel?.found === true,
                  cancelGone: cancel === null ? null : cancel.gone === true,
                  drew: byFor(events, 'faceid-after-nomatch', 'end-cancel')[0]?.drew ?? null,
                  line: el(d, 'session-end-line')?.label ?? null,
                  writeLines: before === undefined || marks['screen:end-cancel'] === undefined ? null : marks['screen:end-cancel'].writes - before.writes,
                  mainStatus: await mainStatusOf(S.e2.id)
                });
                arm('E2 no match, Cancel: Not confirmed, nothing sent, the session still runs', v.ok, v.said);
              }
              // E4
              {
                const done = byFor(events, 'end-these', 'end-these')[0] ?? null;
                const before = marks['auth:end-these']?.done ?? null;
                const v = gradeE4({
                  authUp: auth('end-these'),
                  acked: acked('end-these'),
                  dialog: byFor(events, 'end-dialog', 'end-these')[0] ?? null,
                  wantHeading: 'End 2 running sessions?',
                  wantBody: batchBodyLocal,
                  names: [S.e4a.name, S.e4b.name],
                  wantSkipped: '1 selected session stays unchanged: 1 already ended',
                  targets: [S.e4a.id, S.e4b.id],
                  skipped: S.e4c.id,
                  outcomes: done?.outcomes ?? {},
                  heading: done?.heading ?? null,
                  wantDone: '2 of 2 sessions ended',
                  doneLines: before === null || marks['screen:end-these'] === undefined ? null : marks['screen:end-these'].done - before
                });
                arm('E4 End these: the Mac sheet\'s order, two Ended, the ended row only in the skipped line', v.ok, v.said);
              }
              // E5 and E6
              for (const [label, step, session, idle, relaunched] of [
                ['E5 match with the write held before its handshake, then Home: withheld, never sent, the truth on return (Paseo #3464)', 'end-home', S.e5, 0, false],
                ['E6 match then the app ended at once: at most one act, the truth on relaunch, nothing sent after', 'end-kill', S.e6, 2, true]
              ]) {
                const d = lastDump(events, step);
                const before = marks[`auth:${step}`]?.done ?? null;
                const v = gradeAfterLeaving({
                  authUp: auth(step),
                  acked: acked(step),
                  doneLines: before === null || marks[`screen:${step}`] === undefined ? null : marks[`screen:${step}`].done - before,
                  tmuxAlive: tmuxAlive(session.tmuxName),
                  drawnStatus: el(d, 'session-status')?.label ?? null,
                  doorStatus: await doorStatusOf(session.id),
                  line: el(d, 'session-end-line')?.label ?? null,
                  relaunched,
                  writeLinesAfter: idleDelta(marks, idle, 'writes'),
                  relayAfter: null,
                  ...(step === 'end-home' ? { held: typeof marks['held:end-home'] === 'number' ? marks['held:end-home'] : null } : {})
                });
                arm(label, v.ok, v.said);
              }
              // E7
              {
                const done = byFor(events, 'end-these', 'end-these-home')[0] ?? null;
                const pressed = events.find((e) => e.step === 'end-these-home-pressed') ?? null;
                const rows = [];
                for (const s of E7) rows.push({ id: s.id, word: done?.outcomes?.[s.id] ?? null, tmuxAlive: tmuxAlive(s.tmuxName), acts: await actsFor(s.id) });
                const held = typeof marks['held:end-these-home'] === 'number' ? marks['held:end-these-home'] : null;
                const confirmed = confirmOrderOf(byFor(events, 'end-dialog', 'end-these-home')[0] ?? null, [S.e7a, S.e7b, S.e7c]);
                const order = { drawn: e7Drawn === null ? null : e7Drawn.map((s) => s.id), confirmed: confirmed === null ? null : confirmed.map((s) => s.id) };
                const v = gradeE7({ authUp: auth('end-these-home'), acked: acked('end-these-home'), rowOne: pressed?.rowOne ?? null, rows, writeLinesAfter: idleDelta(marks, 1, 'writes'), held, order });
                report.readings.E7 = { rowTwo: rows[1]?.word ?? null, held, order: { drawn: e7Drawn?.map((s) => s.name) ?? null, confirmed: confirmed?.map((s) => s.name) ?? null } };
                arm('E7 a batch interrupted by Home with row two held before its handshake: row two and three Not run, nothing sent after', v.ok, v.said);
              }
              // E3
              {
                const v = gradeE3({
                  acked: events.some((e) => e.step === 'unenrolled' && e.acked === true),
                  bar: byFor(events, 'end-bar', 'end-off')[0] ?? null,
                  dialog: events.find((e) => e.step === 'end-off-press')?.dialog ?? null,
                  prompt: events.find((e) => e.step === 'end-off-press')?.prompt ?? null
                });
                arm('E3 Face ID unenrolled: what iOS answers is drawn, and nothing asks', v.ok, v.said);
              }
            });

            // ---- E10: the floor, iOS 18.3: E1 --------------------------------
            await confirmListening(cdp);
            await withSimulator({ label: 'p316-end-floor', runtime: RUNTIME_FLOOR, scratch: join(XCODE, 'sim-end-floor'), derivedDataPath: DD, keep: KEEP }, async (sim) => {
              await sim.biometry('enrol');
              const marks = {};
              const wantE10 = (await readJson(`/v1/session?id=${encodeURIComponent(S.e10.id)}`))?.session?.endConfirm ?? null;
              const run = await pairAndRead(sim, ['pair', 'list', `open:${S.e10.id}`, 'end'], 'end-floor', { env: { P316_ACKS: ACKS }, react: reactor(sim, ['match'], marks) });
              const ev = run.ok ? run.result.events : [];
              const d = lastDump(ev, 'end');
              const before = marks['auth:end']?.done ?? null;
              const v1 = gradeE1({
                authUp: byFor(ev, 'end-auth-up', 'end').length > 0,
                acked: byFor(ev, 'end-auth-answered', 'end').some((e) => e.acked === true),
                permission: { seen: byFor(ev, 'faceid-permission', 'end').some((e) => e.seen === true), pressed: byFor(ev, 'faceid-permission', 'end').find((e) => e.pressed !== undefined)?.pressed ?? null, stillUp: byFor(ev, 'faceid-permission', 'end').some((e) => e.stillUp === true) },
                bar: byFor(ev, 'end-bar', 'end')[0] ?? null,
                dialog: byFor(ev, 'end-dialog', 'end')[0] ?? null,
                want: wantE10,
                doneLines: before === null || marks['screen:end'] === undefined ? null : marks['screen:end'].done - before,
                tmuxAlive: tmuxAlive(S.e10.tmuxName),
                mainStatus: await mainStatusOf(S.e10.id),
                drawnStatus: el(d, 'session-status')?.label ?? null,
                doorStatus: await doorStatusOf(S.e10.id),
                barAfter: el(d, 'session-end-bar') !== null
              });
              arm('E10 the floor (iOS 18.3): E1', v1.ok, v1.said);
            });

            // ---- EH: the hostile door's write arms --------------------------
            const writeArms = Object.keys(HOSTILE_ARMS).filter((a) => HOSTILE_ARMS[a].write === true);
            await withSimulator({ label: 'p316-end-hostile', runtime: RUNTIME_CURRENT, scratch: join(XCODE, 'sim-end-hostile'), derivedDataPath: DD, keep: KEEP }, async (sim) => {
              await sim.biometry('enrol');
              for (const name of writeArms) {
                const spec = HOSTILE_ARMS[name];
                await sim.simctl('keychain', 'reset');
                const door = await startDoorChild(name);
                doorChildren.add(door.child);
                try {
                  if (door.facts === null) {
                    arm(`EH ${name}`, null, door.why ?? 'the hostile door did not start');
                    continue;
                  }
                  const steps = ['pair', 'list', `open:${door.facts.sessionToOpen}`, spec.posts === 0 ? 'end-read' : 'end'];
                  const r = await drive(sim, {
                    test: { id: UI_TEST },
                    label: `end-hostile-${name}`,
                    env: { P316_PAYLOAD: door.facts.payload, P316_STEPS: steps.join(','), P316_WAIT_S: '60', P316_ACKS: ACKS, P330_DOOR_ENDPOINT: `127.0.0.1:${String(door.facts.port)}` },
                    onEvent: reactor(sim, ['match'], {})
                  });
                  if (r.events.length === 0) {
                    arm(`EH ${name}: ${spec.what}`, null, `the UI test printed no P316 line (xcodebuild exited ${String(r.code)})`);
                    continue;
                  }
                  const d = [...r.events].reverse().find((e) => e.step === 'screen') ?? null;
                  const bar = r.events.filter((e) => e.step === 'end-bar').at(-1) ?? null;
                  const v = gradeEh({
                    alive: aliveOf(r.events),
                    posts: door.events.filter((e) => e.kind === 'request' && e.route === 'POST /v1/end').length,
                    wantPosts: spec.posts,
                    ends: spec.ends,
                    expect: spec.expect,
                    door: (spec.door ?? []).map((k) => door.facts.writeSentences?.[k] ?? null).filter((x) => x !== null),
                    never: spec.never,
                    line: el(d, 'session-end-line')?.label ?? (spec.posts === 0 ? bar?.line ?? null : null),
                    onList: el(d, 'screen-list') !== null && el(d, 'screen-session') === null,
                    onPairing: el(d, 'screen-pairing') !== null,
                    enabled: bar?.enabled ?? null,
                    title: door.facts.endOffer?.title ?? null,
                    dialog: r.events.find((e) => e.step === 'end-read-press')?.dialog ?? null
                  });
                  arm(`EH ${name}: ${spec.what}`, v.ok, v.said);
                } finally {
                  await endDoorChild(door.child);
                  doorChildren.delete(door.child);
                }
              }
            });

            // ---- EP: the parent's app ----------------------------------------
            if (PARENT_IOS_317 !== '') {
              const parentProject = join(resolve(PARENT_IOS_317), 'ios', 'Tortie.xcodeproj');
              const parentDd = join(XCODE, 'dd-parent');
              const built = existsSync(parentProject)
                ? await xcodebuildRun({ label: 'parent-end', scratch: XCODE, derivedDataPath: parentDd, args: ['build-for-testing', '-project', parentProject, '-scheme', SCHEME, '-configuration', 'Debug', '-destination', 'generic/platform=iOS Simulator'] })
                : { code: -1 };
              if (built.code !== 0) arm('EP the parent\'s app: no End, no Select, and its Unpair leaves the Mac\'s row', null, `the parent's project did not build (${String(built.code)})`);
              else {
                await confirmListening(cdp);
                await withSimulator({ label: 'p316-end-parent', runtime: RUNTIME_CURRENT, scratch: join(XCODE, 'sim-end-parent'), derivedDataPath: parentDd, keep: KEEP }, async (sim) => {
                  const run = await pairAndRead(sim, ['pair', 'list', `open:${S.ep.id}`, 'settings', 'unpair'], 'end-parent', { project: parentProject, derivedDataPath: parentDd });
                  const ev = run.ok ? run.result.events : [];
                  const st = (await pocket(cdp, 'status')).value ?? null;
                  const pressedAt = ev.find((e) => e.step === 'unpair-pressed')?.at ?? null;
                  const landedAt = ev.find((e) => e.step === 'unpair-landed')?.at ?? null;
                  const v = gradeEp({
                    sessionDrawn: lastDump(ev, 'session') !== null,
                    endBar: ev.some((e) => e.step === 'screen' && el(e, 'session-end-bar') !== null),
                    select: ev.some((e) => e.step === 'screen' && el(e, 'list-select') !== null),
                    // The parent's Unpair is SEEN to run: its question read,
                    // then Pairing drawn in the dump its step writes.
                    unpairSheet: ev.some((e) => e.step === 'unpair-sheet' && e.for === 'unpair'),
                    unpairedToPairing: el(lastDump(ev, 'unpair'), 'screen-pairing') !== null,
                    macLists: (st?.phones ?? []).some((p) => p.id === run.simPhoneId),
                    ms: pressedAt === null || landedAt === null ? undefined : Math.round(landedAt - pressedAt)
                  });
                  arm('EP the parent\'s app: no End, no Select, and its Unpair leaves the Mac\'s row', v.ok, v.said);
                });
              }
            } else report.readings.endParent = 'not run: P317_PARENT_IOS is not set';
          }
        }

        if (ARMS.has('hostile')) {
          // THE WRITE ARMS ARE THE END GROUP'S (EH), never this loop's: this
          // loop drives a read and grades it as one, so a write arm here read
          // FAIL for want of a press it never made (the fix round, after the
          // verify ran the nine write arms twice). Named or not, they are left out.
          const wanted = ((process.env['P316_HOSTILE'] ?? '').trim() || Object.keys(HOSTILE_ARMS).join(','))
            .split(',')
            .map((s) => s.trim())
            .filter((name) => HOSTILE_ARMS[name]?.write !== true);
          await withSimulator({ label: 'p316-hostile', runtime: RUNTIME_CURRENT, scratch: join(XCODE, 'sim-hostile'), derivedDataPath: DD, keep: KEEP }, async (sim) => {
            for (const name of wanted) {
              const spec = HOSTILE_ARMS[name];
              if (spec === undefined) continue;
              await sim.simctl('keychain', 'reset');
              const door = await startDoorChild(name);
              doorChildren.add(door.child);
              try {
                if (door.facts === null) {
                  arm(`H ${name}`, null, door.why ?? 'the hostile door did not start');
                  continue;
                }
                const conversationArm = /^(pages-|more-|long-ask|honest)/.test(name) || spec.md === true;
                const steps = [
                  'pair',
                  ...(name === 'wrong-key' || name === 'pair-word' ? [] : ['list']),
                  // Phase 316.6's markdown arms read every drawn block (HM).
                  ...(conversationArm ? [`open:${door.facts.sessionToOpen}`, 'conversation', spec.md === true ? 'markdown' : 'first'] : []),
                  // A list arm's body arrives on the list's refresh, and the
                  // one that never completes is said after the client's 15 s.
                  ...(spec.list === true ? ['sentence'] : [])
                ];
                const r = await drive(sim, { test: { id: UI_TEST }, label: `hostile-${name}`, env: { P316_PAYLOAD: door.facts.payload, P316_STEPS: steps.join(','), P316_WAIT_S: '60', P330_DOOR_ENDPOINT: `127.0.0.1:${String(door.facts.port)}` } });
                const alive = aliveOf(r.events);
                const sentence = drawnSentence(r.events);
                const served = door.events.filter((e) => e.kind === 'request').length;
                const verified = door.events.filter((e) => e.kind === 'request' && e.verified !== undefined);
                // (t): every signed read presented the phone's client identity,
                // over TLS 1.3, with the code's name as SNI and in Host.
                const identity = verified.every((e) => e.channelHeld === true && e.tls === 'TLSv1.3' && e.servername === HOSTILE_NAME && e.host === `${HOSTILE_NAME}:${String(HOSTILE_PUBLIC_PORT)}`);
                report.readings[`hostile-${name}`] = { lines: r.events.length, alive, sentence, served, signedReads: verified.length, signaturesHeld: verified.every((e) => e.verified === 'ok'), identity };
                if (r.events.length === 0) {
                  arm(`H ${name}: ${spec.what}`, null, `the UI test printed no P316 line (xcodebuild exited ${String(r.code)})`);
                  continue;
                }
                let ok;
                let said;
                if (spec.md === true) {
                  // HM (Phase 316.6, SPEC §7.3): somebody else's markdown ends drawn.
                  const v = gradeHm({ events: r.events, turnCount: door.facts.turnCount, alive, connections: md.listener?.count() ?? null });
                  ok = v.ok;
                  said = `${v.said}${identity ? '' : '; a signed read WITHOUT the client identity or the code\'s name'}`;
                  if (!identity && ok === true) ok = false;
                } else if (name === 'honest') {
                  const t = r.events.find((e) => e.step === 'turns');
                  const drawn = new Set((t?.indexes ?? []).map(Number));
                  ok = alive === RUNNING_FOREGROUND && sentence === null && lastDump(r.events, 'list') !== null && drawn.size === door.facts.turnCount && verified.length > 0 && verified.every((e) => e.verified === 'ok') && identity;
                  said = `the control: the list drawn, ${String(drawn.size)} of ${String(door.facts.turnCount)} turns drawn, ${String(verified.length)} signed read(s) all verified by the door's own reader, ${identity ? 'every one with the client identity and the code\'s name' : 'NOT every one with the client identity and the code\'s name'}, no sentence`;
                } else if (name === 'unknown-status' || name === 'unknown-dot') {
                  // Drawn, not refused (hostile-door.mjs's table says why): the
                  // list is there, every row has its dot, nothing is a failure
                  // sentence, and an unknown word is drawn as main sent it.
                  const d = lastDump(r.events, 'list');
                  const dots = els(d, 'row-dot-');
                  const word = name === 'unknown-status' ? dots.some((e) => e.label === UNKNOWN_STATUS_TITLE) : true;
                  ok = alive === RUNNING_FOREGROUND && sentence === null && d !== null && dots.length > 0 && word;
                  said = `${d === null ? 'NO list drawn' : `the list drawn with ${String(dots.length)} dot(s)`}${name === 'unknown-status' ? `, main's unknown word ${word ? 'drawn as sent' : 'NOT drawn'}` : ''}; ${sentence === null ? 'no failure sentence' : `a sentence in ${sentence.id}`}; state ${J(alive)}`;
                } else if (name === 'long-ask') {
                  const t = r.events.find((e) => e.step === 'turns');
                  const top = Math.max(...(t?.indexes ?? [-1]).map(Number));
                  const ask = t?.asks?.[String(top)] ?? '';
                  const d = lastDump(r.events, 'conversation');
                  const frame = el(d, `turn-ask-${String(top)}`)?.frame ?? null;
                  ok = alive === RUNNING_FOREGROUND && ask.length === 4_000 && frame !== null && frame[0] >= 0 && frame[0] + frame[2] <= (d?.window?.[0] ?? 0) + 0.5;
                  said = `the ask drawn ${String(ask.length)} characters long, its frame ${J(frame)} inside a window ${J(d?.window)}; state ${J(alive)}`;
                } else {
                  const halfDrawn = sentence !== null && sentence.rows > 0 && (sentence.id === 'list-failure' || sentence.id === 'needs-list-failure');
                  // WHERE and WHICH (Phase 316.2's fix round): the first build
                  // passed an arm on any sentence anywhere, and every list arm
                  // was in fact ending on the pairing screen. Since Phase 316.6
                  // a list's sentence may be drawn on the Needs input tab's
                  // list too (`needs-list-failure`), the same words.
                  const where = spec.at === undefined || sentence?.id === spec.at || (spec.at === 'list-failure' && sentence?.id === 'needs-list-failure');
                  const which = spec.expect === undefined || (sentence?.word !== null && spec.expect.includes(sentence?.word));
                  const honestFirst = spec.list !== true || door.events.some((e) => e.kind === 'request' && e.honestFirst === true);
                  ok = alive === RUNNING_FOREGROUND && sentence !== null && !halfDrawn && where && which && honestFirst && identity && (name !== 'wrong-key' || served === 0);
                  said = `${sentence === null ? 'NO sentence drawn' : `a sentence drawn in ${sentence.id} (${String(sentence.length)} characters, Copy.${String(sentence.word ?? 'none of its words')})`}${halfDrawn ? ' BESIDE rows' : ''}${where ? '' : `, NOT in ${String(spec.at)}`}${which ? '' : `, NOT ${String(spec.expect.join(' or '))}`}${spec.list === true ? `; pairing's first read ${honestFirst ? 'answered honestly' : 'NEVER answered honestly'}` : ''}${identity ? '' : '; a signed read WITHOUT the client identity or the code\'s name'}; state ${J(alive)}; the door served ${String(served)} request(s)`;
                }
                arm(`H ${name}: ${spec.what}`, ok, said);
              } finally {
                await endDoorChild(door.child);
                doorChildren.delete(door.child);
              }
            }
          });
        }

        // ==================================================================
        // Phase 316.6: PR, the parent app over the same planted turns
        // (SPEC §7.6 item 4). Its own project, built here into its own derived
        // data, driven by ITS OWN UI test against this Mac, which this phase
        // does not change: no tab, a table as pipes, no pressable link, and
        // no word it drew that HEAD loses.
        // ==================================================================
        if (PARENT_IOS !== '') {
          const parentRoot = resolve(PARENT_IOS);
          const parentProject = join(parentRoot, 'ios', 'Tortie.xcodeproj');
          const parentDd = join(XCODE, 'dd-parent');
          let parentRun = null;
          let parentWhy = null;
          // The parent's link rule, read from its own source: 316.2 drew every
          // link as its words and removed every link and image address.
          const parentStripsLinks = readParentStripsLinks(parentRoot);
          if (!existsSync(parentProject)) parentWhy = `${parentProject} does not exist; P316_PARENT_IOS names the directory holding the parent's ios/`;
          else {
            const built = await xcodebuildRun({
              label: 'parent',
              scratch: XCODE,
              derivedDataPath: parentDd,
              args: ['build-for-testing', '-project', parentProject, '-scheme', SCHEME, '-configuration', 'Debug', '-destination', 'generic/platform=iOS Simulator']
            });
            report.readings.builds = { ...(report.readings.builds ?? {}), parent: { code: built.code, ms: built.ms } };
            if (built.code !== 0) parentWhy = `the parent's project exited ${String(built.code)} in ${String(built.ms)} ms`;
            else {
              await confirmListening(cdp);
              await withSimulator({ label: 'p316-parent', runtime: RUNTIME_CURRENT, scratch: join(XCODE, 'sim-parent'), derivedDataPath: parentDd, keep: KEEP }, async (sim) => {
                const parentSteps = ['pair', 'list', ...(md.sessionId !== null ? [`open:${md.sessionId}`, 'conversation', 'first'] : [])];
                parentRun = await pairAndRead(sim, parentSteps, 'parent', { notifications: 'allow', project: parentProject, derivedDataPath: parentDd });
              });
            }
          }
          const turns = await mdTurns();
          const parentEv = parentRun?.ok ? parentRun.result.events : null;
          const parentTurns = parentEv?.find((e) => e.step === 'turns') ?? null;
          const pairs = [];
          for (const t of turns?.all ?? []) {
            const name = turns.planted.get(t.index);
            const parent = parentTurns?.answers?.[String(t.index)] ?? null;
            const head = md.readings.headAnswers?.[String(t.index)] ?? null;
            if (name === undefined || parent === null || head === null) continue;
            pairs.push({ name, parent, head, source: t.answerText ?? '' });
          }
          const parentLast = parentEv === null ? null : el(lastDump(parentEv, 'session'), 'session-answer')?.label ?? null;
          if (parentLast !== null && md.readings.headLast !== null && md.readings.headLast !== undefined) {
            pairs.push({ name: 'session-answer', parent: parentLast, head: md.readings.headLast, source: turns?.all?.at(-1)?.answerText ?? '' });
          }
          const tableTurn = [...(turns?.planted ?? new Map())].find(([, name]) => name === 'table-at-caps')?.[0] ?? null;
          const v = parentWhy !== null ? verdict(null, parentWhy) : !parentRun?.ok ? verdict(null, `the parent did not pair: ${String(parentRun?.why ?? 'it was not driven')}`) : gradePr({ parent: { events: parentEv }, tableTurn, parentStripsLinks, pairs });
          const words = regressedWords(pairs);
          md.readings.PR = { pairs: pairs.length, lost: words.lost, excused: words.excused, parentStripsLinks };
          arm('PR the parent (316.5) over the same planted answers: no tab, a table as pipes, no pressable link, no word it drew that HEAD loses, and (markdown off) each answer HEAD draws equal to the parent\'s', v.ok, v.said);
        } else {
          report.readings.parent = 'not run: P316_PARENT_IOS is not set (the parent reading is SPEC §7.6 item 4\'s)';
        }
        ran = true;
      } finally {
        appText += `\n${handle.text()}`;
        shimPid = handle.pid;
        try {
          appPid = handle.appPid();
        } catch {
          appPid = 0;
        }
      }
    }
  );
} catch (err) {
  if (!['port taken', 'no build'].includes(String(err?.message ?? err))) arm('the run', false, `it threw: ${String(err?.message ?? err)}`);
} finally {
  for (const child of [...doorChildren]) await endDoorChild(child);
  await relay?.close().catch(() => undefined);
  // Phase 316.6: MD3's count, read once the last app is gone, then the listener closed by its handle.
  if (md.listener !== null) {
    md.readings.md3 = { port: md.listener.port, connections: md.listener.count(), planted: md.plantedNames.length };
    await md.listener.close().catch(() => undefined);
  }
  // ---- Phase 316.5: the verifier's records, then Apple's stand-in and the key --
  // P316_KEEP=1 keeps what the verifier re-derives from (SPEC §7.4, §7.5
  // Method A): the reader's /v1/blocked answer at N3's block, every stand-in
  // record whole (its JWT included, to be verified by another hand), every
  // body delivered to a Simulator, the scratch PUBLIC key and each phone's
  // token with the environment it presented. 0600, under the kept world. The
  // private key is never written here, and its file goes whatever this says.
  // Phase 316.6 (SPEC §7.4): the door's own answer text for every p316-md
  // turn, read by the node reader: Method 2's input, for the verifier.
  if (KEEP && md.turns !== null) {
    try {
      const dir = join(RUN, 'rederive');
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      writeFileSync(
        join(dir, 'md-answers.json'),
        `${J({ sessionId: md.sessionId, md3: md.md3, turns: md.turns.all.map((t) => ({ index: t.index, fixture: md.turns.planted.get(t.index) ?? null, askText: t.askText, answerText: t.answerText, answerClipped: t.answerClipped })) }, null, 1)}\n`,
        { mode: 0o600 }
      );
      say(`kept the markdown session's answers for re-derivation at ${join(dir, 'md-answers.json')}`);
    } catch (err) {
      say(`could not keep the markdown answers: ${String(err?.message ?? err)}`);
    }
  }
  if (KEEP && apns !== null) {
    try {
      const dir = join(RUN, 'rederive');
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      writeFileSync(
        join(dir, 'records.json'),
        `${J(
          {
            topic: TOPIC,
            keyId: KEY_ID,
            publicKeyPem: alerts.publicPem,
            origins: apns.origins,
            phones: Object.fromEntries(Object.entries(TOKENS).map(([name, token]) => [name, { token, environment: SEEDED[token] ?? null }])),
            blockedAtN3: alerts.blockedAtN3,
            composedAtN3: alerts.composedForAlertSession,
            standIn: apns.requests,
            deliveries: alerts.deliveries
          },
          null,
          1
        )}\n`,
        { mode: 0o600 }
      );
      say(`kept the alerts' records for re-derivation at ${join(dir, 'records.json')}`);
    } catch (err) {
      say(`could not keep the alerts' records: ${String(err?.message ?? err)}`);
    }
  }
  report.readings.markdown = { md3: md.md3 === null ? null : 'a loopback port', planted: md.plantedNames, ...md.readings, headAnswers: undefined, headLast: undefined };
  if (apns !== null) {
    report.readings.alerts = {
      preflight: alerts.preflight,
      ...alerts.readings,
      standIn: apns.requests.map(redactedRecord),
      connections: { ...apns.connections },
      deliveries: alerts.deliveries.map(redactedDelivery)
    };
    await apns.close().catch(() => undefined);
  }
  // THE SCRATCH KEY, deleted whatever happened and whether the world is kept.
  rmSync(KEY_FILE, { force: true });
  try {
    writeFileSync(STOP, 'stop\n', 'utf8');
  } catch {
    /* the world may already be gone */
  }
  // THE STAND-IN TAILSCALE: every pid it ran as, ended by pid whatever happened.
  const ended = standin === null ? { ended: [], left: [] } : endStandinProcesses(STANDIN_DIR, 1_500);
  const findings = watch?.stop() ?? [];
  const log = standin?.readLog() ?? [];
  const nameRows = dns?.log() ?? [];
  if (dns !== null) await dns.close();
  if (standin !== null) {
    const forbidden = log.filter((e) => e.forbidden === true).length;
    const refusedArgv = log.filter((e) => e.verdict === 'refused').length;
    report.readings.tailscale = { preflight: preflightOk, samples: watch?.samples() ?? 0, realTailscale: findings, notThisRun: watch?.notOurs() ?? [], forbidden, refusedArgv, funnelStarts: log.filter((e) => e.kind === 'funnel').length, ended: ended.ended.length, left: ended.left.length };
    arm(
      'RUN no real Tailscale, nothing forbidden, no stand-in left',
      preflightOk && findings.length === 0 && (watch?.samples() ?? 0) > 0 && forbidden === 0 && refusedArgv === 0 && ended.left.length === 0,
      `preflight ${preflightOk ? 'passed' : 'REFUSED'}; ${String(watch?.samples() ?? 0)} sample(s), ${String(findings.length)} real Tailscale process(es); ${String(forbidden)} forbidden and ${String(refusedArgv)} refused argv at the stand-in; ${String(ended.ended.length)} stand-in pid(s) ended here, ${String(ended.left.length)} left`
    );
  }
  // ---- Q1 (Phase 332's N1): the name check asked the loopback stand-in, and rightly --
  if (dns !== null) {
    const verdict = nameQuestionsVerdict({ expect: log.some((e) => e.kind === 'funnel'), rows: nameRows, name: PUBLIC_NAME });
    report.readings.nameQuestions = nameRows;
    arm(
      'Q1 the name check asked only the DNS stand-in, an A question with RD 0 for the stand-in’s name, and no agent was started',
      verdict.ok && dnsPreflights.length > 0 && dnsPreflights.every((x) => x === true) && agentsHeld.length > 0 && agentsHeld.every((x) => x === true),
      `${verdict.said}; the DNS preflight ${J(dnsPreflights)}; the renamed agents ${J(agentsHeld)} absent`
    );
  }
}

// ---- N10 (Phase 316.5): nothing of an alert in app.log, the app gone --------
if (ran) {
  const tokenNeedles = Object.entries(TOKENS).flatMap(([name, t]) => [
    [`the ${name} device token`, t],
    [`the ${name} device token in capitals`, t.toUpperCase()]
  ]);
  const jwts = [...new Set(apns.requests.map((x) => x.authorization).filter((a) => typeof a === 'string' && a !== ''))];
  const bodies = [...new Set([...apns.requests.map((x) => x.body), ...alerts.deliveries.map((d) => d.body)].filter((b) => typeof b === 'string' && b !== ''))];
  const needles = [
    ...tokenNeedles,
    ...jwts.map((jwt, i) => [`provider token ${String(i + 1)}`, jwt]),
    ...alerts.pemLines.map((line, i) => [`line ${String(i + 1)} of the scratch key`, line]),
    ...bodies.map((body, i) => [`alert body ${String(i + 1)}`, body])
  ];
  const log = await appLogText();
  const v = gradeLog({ log, printed: appText, needles });
  report.readings.alerts = { ...(report.readings.alerts ?? {}), N10: { logCharacters: log.length, looked: needles.length, jwts: jwts.length, bodies: bodies.length } };
  arm('N10 app.log and the app\'s output hold no device token, provider token, key line or alert body', v.ok, v.said);
}

// ---- MD3 (Phase 316.6): nothing an answer names was fetched, all run --------
if (ran) {
  const v = gradeMd3(md.readings.md3 ?? { port: null, connections: 0, planted: 0 });
  arm('MD3 nothing an answer names was fetched: the loopback listener every image and refused link points at counted no connection', v.ok, v.said);
}

// ---- K2: the windows' secrets and any private key, on the Mac's side --------
if (ran) {
  const needles = [...secretNeedles(), [Buffer.from('PRIVATE KEY-----', 'utf8'), 'a PEM private key']];
  const scanned = [HARNESS, HOME].map((root) => filesHolding(root, needles));
  const hits = scanned.flatMap((s) => s.hits);
  const printed = SECRETS.some((secret) => appText.includes(secret)) || appText.includes('PRIVATE KEY-----');
  arm('K2 no window\'s secret and no private key is in any file of the Mac\'s scratch world or anything the app printed', SECRETS.length > 0 && scanned.reduce((n, s) => n + s.files, 0) > 0 && hits.length === 0 && !printed, `${String(scanned.reduce((n, s) => n + s.files, 0))} file(s) read for ${String(SECRETS.length)} secret(s) and any PEM private key; ${hits.length === 0 ? 'none holds one' : J(hits)}; the app's output ${printed ? 'CARRIES one' : 'does not'}`);
}
if (!KEEP) rmSync(RUN, { recursive: true, force: true });

// ---- counted once, at the end ----------------------------------------------
const ps = spawnSync('ps', ['-Ao', 'pid,ppid,rss,comm'], { encoding: 'utf8' });
const electronLines = (ps.stdout ?? '').split('\n').filter((l) => /Electron|Tortie$|chrome_crashpad/.test(l) && !/defunct/.test(l));
const ours = electronLines.filter((l) => {
  const [pid, ppid] = l.trim().split(/\s+/).map(Number);
  return (appPid > 0 && (pid === appPid || ppid === appPid)) || (shimPid > 0 && (pid === shimPid || ppid === shimPid));
});
arm('no Electron of this run is left', ours.length === 0, `${String(electronLines.length)} Electron line(s) on the machine, ${String(ours.length)} of this run`);
const devices = countDevicesNamed('p316-');
arm('no p316- Simulator is left, and none is booted', devices.readable && devices.named === 0 && devices.booted === 0, `${String(devices.named)} device(s) named p316-, ${String(devices.booted)} booted`);

const OUT = join(ROOT, 'out', 'p316');
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'probe-p316.json'), `${unsecret(J(report, null, 1))}\n`, 'utf8');
say(`wrote ${join(OUT, 'probe-p316.json')}`);
const unreadable = report.arms.filter((a) => a.ok === null).length;
if (ran && failures === 0 && unreadable > 0) {
  say(`probe:p316 could not READ ${String(unreadable)} arm(s); that is not a pass`);
  process.exit(2);
}
say(failures > 0 ? `probe:p316 FAILED ${String(failures)} arm(s)` : !ran ? 'probe:p316 did not complete' : 'probe:p316 OK');
process.exit(failures > 0 ? 1 : ran ? 0 : 2);
