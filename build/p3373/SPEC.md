# Phase 337.3 — "the terminal fills the phone": it opens on what the session printed, sideways it is the terminal alone, and one ⋯ holds Catch Me Up and End — SPEC

Written by the spec step on 2026-10-07 in `/private/tmp/wt-p3373`, a detached worktree at origin/main `dfa878b5`
("docs(backlog): lighter checking for a stranger's first run and Linux machines"), with Phase 337.1 (`f5ff5183`) under it.
No file under `ios/` moved between `f5ff5183` and `dfa878b5` (`git log f5ff5183..dfa878b5 -- ios/` is empty), so the phone at
this base is TestFlight build 7, the parent every comparison below names. Every `file:line` here was read at `dfa878b5` on
this date.

**The spec step MEASURED before it wrote** (§14 holds every command, exit code and number). Under the lock's phone slot
(`electron.lock2`, taken as `p3373-spec` at 23:10 and released at 23:18), it built a SCRATCH COPY of the phone app, never the
worktree's, patched three ways (the Terminal page hiding the navigation and tab bars and the status bar in landscape behind a
launch argument, its top bar holding one SwiftUI `Menu` with two items, and a `confirmationDialog` attached to that menu),
and drove it with a patched copy of `P316DriveUITests` against the worktree's hostile door, honest arm, on an iPhone 16 Pro on
iOS 26.3 and on 18.3, each device made and deleted by `build/simulator-run.mjs` alone, twice per runtime (as today, then
hidden). It read labels and frames only, started no Electron, no agent and no model turn, read nothing under `~/.ssh`,
`~/.claude`, `~/.codex`, his keychain or his live Tortie profile, and `stat -f '%z %m' ~/.zsh_history ~/.bash_history` read
`734900 1791405989` and `23166 1790702242` before and after. Its DerivedData (`/private/tmp/tortie-ops/p3373/dd-spec`, 410 MB)
and its scratch builds were deleted when it ended; 0 devices named `p316-` were left.

Read with it, whole: `build/p337/SPEC.md` and `build/p3371/SPEC.md`, each with its §Attack and every §As built (the Terminal,
its UIKit scroll view, its history and its two faces are what this phase changes); `docs/BACKLOG.md` "## Phase 337.1" and the
running-log lines of 2026-10-07; and CLAUDE.md's UI rules.

**His words, 2026-10-07**, while testing TestFlight build 7: "a few little things about the terminal view that would be
ideal to fix if its possible in parallel. 1. when it opens today, it is shown like this [the live rows at the top of the
screen and empty space below] but i'd rather more of the scrollback (if available) in vertical mode could be shown like this
[the screen filled with earlier output, the live rows at the bottom] 2. when you're in horiztonal mode, i want to show as much
of the terminal as possible and not the top which shows you which session you're in or the different bottom needs input,
sessions or settings menu 3. In vertical mode, I'd rather have an ellipses in in the top right that show the option to catch
me up or end session (we can keep face input for end session)." And, with his screenshot of landscape: "this is the image of
horiztonal mode that i'd prefer to sho as much of the terminal as possible".

**The order of authority.** His words override the main session's task text and both earlier specs wherever they differ.
The tree at `dfa878b5` overrides either spec's picture of it. Where this file departs from 337.1 for any other reason, §3
says so row by row.

---

## 0. The hard rules, stated once

- Builders and the integrator launch no Electron and boot no Simulator. Verifiers take THE LOCK, phone slot first:
  `mkdir -p /private/tmp/tortie-ops/electron.phone-wait && echo p3373 > /private/tmp/tortie-ops/electron.phone-wait/p3373-<role>`,
  then `zsh /private/tmp/tortie-ops/lock.sh try p3373 phone` (prints the slot or exits 1; retry every 60 s in a NEW command),
  remove the wait file once a slot is held, and release with `zsh /private/tmp/tortie-ops/lock.sh release <dir>` on the same
  command line. Phases 333.1 and 342 share the lock.
- `/Users/gdc/gmux` is read only: every shell command begins `cd /private/tmp/wt-p3373 &&` (or the role's scratch,
  `/private/tmp/tortie-ops/p3373/<role>/`), and every heredoc delimiter is quoted (`<<'EOF'`). Nobody but the committer
  commits, stages or stashes. `git diff dfa878b5` in this worktree is exactly 337.3's delta. Install nothing.
- **Do not touch `/private/tmp/wt-p3331`** (Phase 333.1, being verified beside this one). This phase lands AFTER 333.1, on top
  of it. Files both phases edit (`ios/Tortie/Style/Copy.swift`, `ios/Tortie/Screens/Identifiers.swift`,
  `build/conformance-ios.mjs`, `build/p316/ablation-ios.mjs`, `docs/design/phone/**`, and, by 333.1's own order note,
  `build/p316/probe-p316.mjs` and `ios/TortieUITests/P316DriveUITests.swift`) take SMALL, ADDITIVE edits here: new
  declarations, new functions and new blocks at the ends of their lists, and an existing line changed only where §10 names it.
- **Change no build number.** The phone stays at the base's build (7). 333.1 raises it to 8; the main session raises it to 9
  when this phase lands. `PHONE_BUILD` in `build/conformance-ios.mjs` and `CURRENT_PROJECT_VERSION` do not move here.
- No Mac change: nothing under `src/` moves, no door route, no contract line. `git diff dfa878b5 -- src/
  docs/audits/contract-baseline.txt` is empty at the end.
- No real Tailscale, DNS or APNs: the stand-ins. Never `-L gmux` and never the default tmux server. Never `pkill`, `killall`,
  a `pgrep` pattern or a negative pid: a process is ended by the pid its starter holds, in a `finally`.
- His keychain, credentials, APNs key (`~/Keys`), `~/.ssh`, conversation stores (`~/.claude`, `~/.codex`) and live Tortie
  profile are never read. **No model turn**; `smoke:remote`, `smoke:machines`, `probe:p268` and `probe:p336` are not run;
  Gemini, Qwen, Antigravity and Grok are never started.
- **His shell history**: before and after every command that starts a shell, a Simulator or the app, record ONLY
  `stat -f '%z %m' ~/.zsh_history ~/.bash_history`; if either moves, attribute it and report. Any shell a test starts runs
  with a scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null` and `TERM_SESSION_ID` unset.
- Simulators only through `build/simulator-run.mjs`; every `xcodebuild` uses
  `-derivedDataPath /private/tmp/tortie-ops/p3373/dd-<role>`, deleted before the role returns. Every Electron through
  `build/electron-run.mjs`, killed in a `finally`; a new script reaching it raises `HELPER_USER_FLOOR` (none is planned).
  No screenshot and no recording: a visual claim is a frame, a label or a number read.
- DISK: read `df -h /` before any `xcodebuild`, Simulator or parent build (it read 13 GB free at 23:20); under 8 GB free wait
  (re-check every 5 minutes, at most 30), then report BLOCKED ON DISK. Delete DerivedData and parent clones as soon as done.
- Under load a failing timing test is re-run alone before it is called a failure. No scenario may be worse than today.
  User-visible words follow CLAUDE.md's UI rules (just enough words; native menus; no tmux words).

---

## 1. The answer first

**What a person can do after this phase.**

1. **On the iPhone, upright, a session's terminal opens full**: its live rows at the BOTTOM of the view, as his Mac shows
   them, and above them as much of what the session printed before as fills the screen, read through 337.1's own pages.
   While the session works the terminal keeps its live bottom in view and what scrolls off its top slides up into the
   history above, as on a terminal at the Mac. Scrolling up still pages further back, a page arriving still moves nothing
   he reads, and the arrow back to live, a drag to the bottom or any key still return to the live bottom, now with the
   history above it. A session that has printed nothing yet, a full-screen program (vim, less) and a session on a Mac
   older than Phase 337.1 open as today: the live rows at the top.
2. **Turned sideways, the Terminal is the terminal alone**: no navigation bar (no back button, title or ⋯), no status line
   under it, no question tray, no tab bar, no status bar. On an iPhone 16 Pro the terminal's area grows from 750 × 230
   points to 750 × 382 on iOS 26.3 and from 750 × 275 to 750 × 381 on iOS 18.3 (measured, §14 M1 to M4): at a 120-column
   session's fitted cell, about 20 or 24 rows visible today and 33 at HEAD. The keyboard and the key bar work as upright;
   Copy for a selection sits at the bottom right; turning the phone upright brings every bar back where it was.
3. **Upright, the top right holds one ⋯** in place of the Catch Me Up icon and End. It opens a native menu of two items,
   **Catch Me Up** and **End session…**; End session… shows the Mac's own confirmation and asks for Face ID, Touch ID or
   the passcode exactly as End does today. Catch Me Up keeps End at its own top right, and an ended session still opens on
   Catch Me Up.

**Nothing else changes for a person**, on the Mac or on the phone. No Mac surface is added, renamed or removed, and nothing
under `src/` moves. **Menus: no Mac menu moves.** The phone's own top bar changes (item 3), which is a phone surface, not a
native Mac menu.

### 1.1 The decisions, each with its reason

| # | Decision | Reason |
| --- | --- | --- |
| D1 | **Following holds history.** In `following` the Terminal lays out history above the live rows and keeps its view at the live bottom: the live rows' last row at the view's bottom, and above them as much earlier output as fills the view. 337.1 D25 and D27 said the opposite on purpose ("in `following` nothing is held and `top = H` ... the rows at the top of the view, Screen.html's"); this row reverses them | his item 1 |
| D2 | **How much: the rows the view holds, less the live rows, in whole pages.** In every layout pass the scroll view computes `fill = max(0, ⌈bounds.height ÷ cell.height⌉ − picture.rowCount)` from its OWN bounds (the whole height, never less the keyboard, so a keyboard rising or going reserves nothing) and the cell it lays out at; the history then reserves `min(H, ⌈fill ÷ 100⌉ × 100)` rows above the live top (`ScrollbackLayout.pageRows`, D27 of 337.1), never below index 0 and never fewer than it already reserved. At the measured geometry this is ONE page: 645 pt ÷ 6.67 pt = 97 rows, less 40 live, is 57 on iOS 26.3, and 660.7 pt gives 60 on 18.3 (§14 M1, M3). A session wider than about 200 columns fits more than 100 rows above its live screen and is filled by its pages one after another, 0.25 s apart | the pages are 337.1's own: `GET /v1/scrollback`, the phone's `ScrollbackModel.minGap` (0.25 s), the Mac's floor, queue and caps (337.1 D14), no new route; whole pages keep 337.1's invariant that no held row lies above `top` |
| D3 | **The first frame is already filled.** The scroll view asks the history to reserve the fill INSIDE the layout pass that first lays out a picture with a numeric depth, BEFORE it sizes the content, so the first frame draws the live rows at the bottom with reserved rows (the ground) above them, and the first page FILLS those rows: nothing moves when it lands. Until it lands (one round trip) the rows above are the ground | 337.1 D26, reserve first and fill later; the live rows must never draw at the top and then jump to the bottom |
| D4 | **The pad is the view's visible height less EVERY row laid out** (history held or reserved, then the live rows), never below 0. With no history laid out it is 337.1's pad exactly (the live rows at the top); with a fill that reaches the view's top it is 0 (the live rows at the bottom); a history shorter than the fill sits at the view's TOP, history then live rows, as a terminal draws a short history | 337.1 D25 computed the pad against the live rows alone, which holds the live rows at the top whatever is above them (the defect he reported). §Attack B5's property still holds: in `scrolled` the content is either at least the view's height (so a reservation is matched by the offset) or laid out down to index 0 (so nothing more can be reserved) |
| D5 | **Rows carried from the live screen.** When a steady live picture's depth is `k` more than the last picture whose depth was a number, in the same space and width, `0 < k ≤` that picture's row count, and the held rows reach the live top (`hi == live`), the `k` lines that scrolled into history ARE that picture's top `k` rows: they are laid out at indices `[H0, H0 + k)` at once, held, marked `carried`, with that picture's styles. A carried row is drawn as any held row, is NEVER an overlap anchor, and is REPLACED by the row of the next page that covers it (D6). Any other growth (`k` past the rows, a gap under the held rows, an unsteady picture between) reserves the new rows, which pages fill (337.1) | tmux pushes a screen's top row into its history as the screen scrolls, and a line keeps its index once it has scrolled off (337.1 D2), so under a scroll those are the rows. Without this, the band 337.1 §13 item 10 stated (rows that leave the live screen are reserved until their page lands) sits RIGHT ABOVE THE LIVE ROWS in following, in view, after every picture while an agent prints: a blank strip flickering above the prompt. 337.1 rejected carrying because it "would put rows the agent may since have redrawn beside the overlap check"; here a carried row is never beside the check, and a page replaces it |
| D6 | **Check pages, at most one a second.** Carried rows in view are checked by a newer page that adjoins the CHECKED rows (its overlap rows checked rows only, `checked` being the end of the rows pages brought), asked no sooner than `ScrollbackModel.checkGap` (1 s) after the last page started; a page for RESERVED rows in view keeps 337.1's 0.25 s. A carried row whose page row differs is replaced, silently: the page is the truth. Carried rows out of view are checked when they come into view | a phone watching a busy session costs the Mac at most one page read a second for checks (on another machine one exec a second, under its 0.4 s floor); 337.1's D29 budget (4 pages a second) is not reached by checks |
| D7 | **The index space in following.** Following holds an index space whenever the live picture offers one (a numeric depth and a space, not the alternate screen), from the first such picture, AT ANY DEPTH, 0 included, so the very first line that scrolls off is carried. It drops everything it holds above the live rows, drawing nothing and saying nothing, when a picture is the alternate screen (a full-screen program covers the history: today's look), offers another space or another width, or a depth below `depthSeen` (a trim at the history limit, a clear, a rewrap); the next layout pass fills again from that picture | 337.1 D12, D13 and §5.6, whose `moved` line is for a person scrolled back; following draws no line. "A full-screen program, which scrolls back nothing, looks as today" |
| D8 | **A refused fill is not asked again for the same reason.** In following, a page the phone does not join (main's `moved`, or the phone's own space, width, depth, rows or overlap check) drops what following holds, and following fills again only from a live picture whose depth, space or width differs from the picture current at the refusal. A 404, or a line the door closed before an answer (a door with no `/v1/scrollback`, 337.1 terminal builder's rule), turns the fill off for that Terminal; scrolled still pages as 337.1. `busy` and a failed read back off 1, 2 then 4 s (337.1). `ended` and `unreachable` stop paging until the next picture with a numeric depth | so a hostile or a refusing door cannot hold the phone in a loop of pages at the picture rate over a screen that has not changed; the honest Mac's `moved` is a real change the next picture shows |
| D9 | **Entering `scrolled`.** The history enters `scrolled` when the view leaves its bottom with its top above the live top; the scroll view says which (`atBottom`, its own `contentOffset.y ≥ maxOffsetY − 0.5`). A drag up from the filled view is that at once, and so is 337.1's pull past the live top with nothing held. Entering adds no rows: the fill is already there, and `reserve(` extends `top` one page at a time as the view's top nears it (337.1 D26). A drag or a fling that ends at the bottom, the arrow back to live, or any key sent returns to following (337.1 D27) | 337.1 entered `scrolled` when the view's top went above the live top, which in following is now always so |
| D10 | **Back to live keeps the fill when it can.** `follow()` keeps everything held when the held rows reach the live top (`hi == live`) and paging has not stopped, so the filled look returns at once with nothing asked; otherwise it drops every held and reserved row, and the next layout pass reserves the fill again (one page) | "Following stays at the bottom"; a short trip up and back should not blank the history and fetch it again |
| D11 | **The delta in following keeps the live rows' place.** Rows added above the live rows while following (carried, reserved by the fill, or taken away by a drop) move the offset by exactly their height, in the layout pass that made them (`apply(above:)`, 337.1 D26), so every live row stays where it was on screen and what was above it slides up, as a terminal scrolls; following's pin then holds the offset at its maximum. In `scrolled` the delta is 337.1's (the rows reserved above the first row) | 337.1 D26: every offset change is a delta in `layoutSubviews` |
| D12 | **A change of cell size.** Following at the bottom, a turn of the phone keeps the live bottom at the view's bottom (the pin); a pinch or a double tap keeps its focal row (337.1 D32), and a pinch that leaves the view off its bottom with history above is a scroll (D9), so new output then keeps the zoomed place; `scrolled` keeps the row at the view's top (D32) | D32 kept the top row in every case, which in a filled following view would leave the live bottom off screen after a turn |
| D13 | **The Terminal's lines move to its TOP.** The lines 337.1 drew just above the keyboard (`Copy.screenHeldWhileSelecting`, `Copy.screenNotAnswering`, the keys' line, `Copy.screenCannotType`, and the scrollback edge's `SCROLLBACK_MOVED`) are drawn over the terminal's top edge, under the status line upright and at the window's top sideways, still an overlay that moves no row; the arrow back to live stays at the bottom right, just above the keyboard | with the fill the live rows, the prompt among them, sit at the view's bottom and, while he types, just above the keyboard, which is exactly where 337.1's lines sat; a line there would cover the prompt he is typing into. 337's fix round's rule stands: a line never moves a row |
| D14 | **What does not move.** `scrolled` pages, checks, joins, evicts (3,000 rows), selects (absolute indices, Copy only over drawn rows) and returns exactly as 337.1 built it; the page floor, queue and caps, the nonce budget (337.1 D29), the side line (D30), the keyboard's opt-out and overlap (D24), the window of rows and its elements (the 337.1 fix round), the cover (337 D41) | the fill is a change to `following` and to the pad, nothing else |
| D15 | **Landscape is the terminal alone.** While the Terminal is sideways (`@Environment(\.verticalSizeClass) == .compact`, which on an iPhone is exactly landscape), `ScreenPage` hides the navigation bar and the tab bar with SwiftUI's own `.toolbarVisibility(.hidden, for: .navigationBar, .tabBar)`, the status bar with `.statusBarHidden(true)`, and draws no header (the status line and End's line) and no tray; upright each is `.automatic`, `false` and drawn as today. Measured on both runtimes (§14 M2, M4): the grid's frame becomes `[62, 0, 750, 382]` (18.3: 381), the navigation and tab bars leave the tree, and back upright every frame (the bar, the ⋯, the status line, the grid, the tab bar and its three tabs) is what it was before the turn | his item 2; the main session's "SwiftUI's own toolbar and tab bar visibility on the Terminal route alone" |
| D16 | **The safe area stays.** Sideways the terminal keeps inside the window's safe area: the two side strips (the Dynamic Island's and the far corner's, 62 points each on an iPhone 16 Pro) and the home indicator's strip (20 points) stay the ground colour, as they are today | text under the island or the home indicator would be cut; the measured grid is exactly the safe area |
| D17 | **Copy sideways.** While a selection is held and every selected row is drawn, Copy is drawn at the terminal's bottom right, above the arrow back to live and the keyboard, and the toolbar's Copy is not drawn: one element identified `screen-copy` at a time | the bar that holds Copy upright is hidden; 337 D34's Copy must stay reachable |
| D18 | **The keyboard sideways.** Unchanged: the key bar is the hidden field's input accessory (`Screens/ScreenKeyField.swift:320`), so it rides the keyboard in any orientation, and D24's opt-out and overlap hold | his item 2: "The key bar and the keyboard still work in landscape" |
| D19 | **No back sideways.** The Terminal draws no back button sideways; turning upright is the way back, and the system's own edge swipe where iOS offers it. This phase adds and removes no gesture | his item 2 lists the back button among what landscape drops |
| D20 | **The fill sideways.** The same rule (D2): sideways a session's live rows are usually taller than the view (40 rows at the fitted 11.67 pt are 467 pt in 382), so the fill is 0 and the view holds the live bottom, as today | one rule for both orientations |
| D21 | **One ⋯, upright.** The Terminal's top bar holds ONE trailing item: a native SwiftUI `Menu` whose label is SF Symbols' `ellipsis` on iOS 26 and later (the bar draws its own glass circle there) and `ellipsis.circle` before it, in the accent, spoken `More` (`Copy.more`), identified `terminal-menu`; while a selection is held Copy stays beside it (ScreenPage's toolbar) | his item 3; CLAUDE.md "native menus": a SwiftUI `Menu` is UIKit's own menu, not a drawn one |
| D22 | **Its two items, in this order.** `Catch Me Up` (`Copy.catchMeUp`, the Mac's word, `text.bubble`, identified `terminal-menu-catch-up`), which pushes Catch Me Up exactly as the icon did; then `End session…` (`Copy.endSessionMenu`, the Mac's own session menu word, `src/renderer/session-manager/copy.ts` `END_SESSION`), destructive, with the owner check's glyph (`faceid`, `touchid` or `lock`, `EndBarDrawing.glyph`), identified `terminal-menu-end`, reading `Ending…` (`Copy.ending`) while the write runs, drawn off exactly where End is drawn off today (an unreachable machine, no passcode, an End under way), and absent exactly where End is absent today (no writer, or the Mac offers no End): then the menu holds Catch Me Up alone | his item 3, "the option to catch me up or end session"; every word already in `Copy.swift` and owned by the Mac |
| D23 | **End's confirmation and owner check are unchanged.** `End session…` shows the Mac's own confirmation, word for word, from a `confirmationDialog` attached to the menu's control (outside the menu's content, so it presents once the menu has closed: measured as a sheet on both runtimes, §14 M6); its destructive press calls `EndModel.press`, which makes and registers the runner and asks Face ID, Touch ID or the passcode before anything is sent (`Screens/EndBar.swift:230-257`). The dialog's code is ONE modifier in `Screens/EndBar.swift`, which Catch Me Up's top-bar End uses too, never a copy | his "(we can keep face input for end session)"; 317's rules (ab) to (ad) read the same runner and the same owner check |
| D24 | **A progress mark while End is under way.** While the owner check is up or the write runs, a progress mark sits left of the ⋯ (identified `end-confirming` while the owner check is up, as End's is today, and `end-writing` while the write runs), so the bar says something is happening as End's `Ending…` did | 317's `EndBarDrawing.confirming` and `Copy.ending`; End must never look idle while it is ending |
| D25 | **Catch Me Up is unchanged**: its title, now card, message box and End at its top right (`EndTopItem`, `Screens/ConversationScreen.swift:319`); an ended session, a Mac older than Phase 337 and a pairing that has no screen door still open on Catch Me Up (337.1 D16) | his item 3 names the terminal view |
| D26 | **The tray and 318's identifiers stay** under the terminal upright, hidden sideways (D15) and while the keyboard is wanted (337.1's fix round) | the main session's task: "The numbered-question tray and 318's identifiers stay" |
| D27 | **One new word**: `Copy.more = "More"`, `/// Phone:`-owned: iOS's own name for an ellipsis button, and the ⋯'s spoken name. The Mac names its machine rows' ⋯ `More for <name>` (`src/renderer/settings/machines-copy.ts:287` `moreLabel`); the phone's one ⋯ sits beside the session's name in the bar, so `More` is enough. Every other word the menu draws is already in `Copy.swift` | CLAUDE.md "just enough words"; `conformance:phonecopy` |
| D28 | **Identifiers**: `terminal-menu`, `terminal-menu-catch-up`, `terminal-menu-end` and `end-writing` are added; `session-open-catch-up` (`ID.sessionOpenCatchUp`, `Screens/Identifiers.swift:295`) is removed with the icon. Measured: SwiftUI hands a menu item's `.accessibilityIdentifier` to XCUITest on both runtimes, and each item's image is an XCUITest image whose identifier is its SF Symbol's name (`faceid`, labelled `face id`), §14 M5 | a drive reads the menu by identifier, and reads End's glyph inside the open menu |
| D29 | **No door route, no Mac change, no build number** (§0) | the main session's task |
| D30 | **The gates this moves**, each with its ablation (§6): `conformance:ios` (b), (ac), (aq), (ar), (as), (at), (t), (k) widened; (aw), (ax) and (ay) new; `conformance:phonecopy` and the mocks; nothing on the Mac | the existing gates encode today's look on purpose |
| D31 | **Tier 2**, with the parent measurement mandatory (he reported it) and one independent method, an attack (§7.6) | CLAUDE.md "Verification" |
| D32 | **Order**: after 333.1 (on top of it), and never beside 337.2, because both edit `build/p316/probe-p316.mjs` and `ios/TortieUITests/P316DriveUITests.swift` (`docs/BACKLOG.md:38256`) | the main session's task; the backlog's order note |

**Subject.** `feat(pocket): open the phone's terminal full, alone when sideways, with Catch Me Up and End in a ⋯ menu`

**First body line.** `Phase 337.3: the terminal fills the phone`

**Semver.** Minor, unreleased: the phone's terminal opens on what the session printed, shows the terminal alone sideways, and
moves Catch Me Up and End into one menu. The iPhone app 1.0.0; its build is the main session's (9 at landing).

**Tier 2**, on CLAUDE.md's questions: a rendered surface with no new state on the Mac (nothing under `src/` moves, no route,
no write), invisible to his data, and he reported it, so the parent measurement is mandatory whatever the tier. It does not
lose or corrupt work (the phone's carried rows live in memory while the Terminal is up, and a page replaces each), it claims
nothing across agents that 337.1 did not already prove per provider, and it spawns nothing and sends nothing new. **The
proof**: one app run that drives every claim, on iOS 26.3 and on the 18.3 floor, upright and sideways, beside the parent
build 7; plus ONE independent method, an attack (§7.6).

**Menus.** No Mac menu moves; `src/main/menu.ts` is asserted unchanged. The phone's top bar on the Terminal changes from two
items to one native menu (item 3).

---

## 2. The tree at this head, re-read

| What | At `dfa878b5` | Note |
| --- | --- | --- |
| The page | `ios/Tortie/Screens/Screen.swift:208-478` (`ScreenPage`); body `:250-345`; the root's keyboard opt-out `:278`; the toolbar `:286-301` (Copy `:291-299`, then `trailing`); the landscape gate `:303` and `:316`; `content` `:347-374`; `bottom` `:379-403` (padded by the overlap `:402`); `shownLine` `:417-423`; `copyDrawn` `:427-429` | D13, D15, D17 |
| The history | `ios/Tortie/Screens/ScreenScrollback.swift:131-459` (`ScrollbackLayout`): `firstRow` `:176`, `picture(_:)` `:212-237` (following places the live rows and holds nothing, `:222-223`), `reserve(visibleTop:)` `:246-269` (following enters `scrolled` at `:249-261`), `want` `:276-301` (`mode == .scrolled` only, `:277`), `accept` `:319-370`, `overlapAgrees` `:387-398`, `evict` `:405-420`, `follow()` `:426-435` (drops everything), `stop` `:438-441`; `ScrollbackModel` `:467-687` (`minGap` `:472`, `viewed` `:534-542`, `follow` `:548-558`, `pump` `:607-629`, `landed` `:631-653`) | D1 to D11 |
| The scroll view | `ios/Tortie/Screens/ScreenScroller.swift:110-617` (`ScreenScrollView`): `keyboardOverlap` `:315-352`, `layoutSubviews` `:380-439` (the pad against the live rows alone `:393-394`), `rowsAdded` `:445-456` (`(.following, .following)` is 0, `:447-448`), `apply(above:)` `:461-466`, `keepAnchor` `:471-481`, `pin` `:484-491`, `scrollViewDidScroll` `:495-500`, `settled` `:515-518`, `report` `:522-532`, `drawWindow` `:548-573` | D2 to D4, D9, D11, D12 |
| The Terminal | `ios/Tortie/Screens/SessionScreen.swift:384-438` (`TerminalPage`; its trailing items `:421-425`, the icon then End); `CatchUpItem` `:444-459`; `ChoiceTray` `:467-529` | D21, D22, D26 |
| End | `ios/Tortie/Screens/EndBar.swift:117-178` (`EndBarDrawing`: `label` `:144`, `glyph` `:171-177`), `EndModel.press` `:230-257`, `EndTopItem` `:289-302`, `EndTopControl` `:305-367` (its dialog `:321-332`, its press `.disabled(row == .off)` `:363` and `ID.sessionEnd` `:364`), `EndLine` `:371-386` | D22 to D24 |
| Catch Me Up's End | `ios/Tortie/Screens/ConversationScreen.swift:319` (`EndTopItem`) | unchanged (D25) |
| The tabs | `ios/Tortie/App/TortieApp.swift:616-653` (three `Tab(`s, "Nothing hides the bar" `:614`); `SessionRoute` `:757-864`; `TerminalFace` `:872-913` | D15 |
| Landscape | `ios/Tortie/App/Orientation.swift:15-38`, `App/AppDelegate.swift:31-33`, `Info.plist` (portrait and both landscapes) | unchanged |
| The key bar | `ios/Tortie/Screens/ScreenKeyField.swift:311-320` (`inputAccessoryView`) | unchanged (D18) |
| Words | `ios/Tortie/Style/Copy.swift:218` (`catchMeUp`), `:407` (`endSessionMenu`), `:478` (`ending`), `:586` (`endTop`), `:591` (`copy`) | `more` added (D27) |
| Identifiers | `ios/Tortie/Screens/Identifiers.swift:295` (`sessionOpenCatchUp`), `:361` (`sessionEnd`), `:365` (`endConfirming`), `:391` (`terminalStatus`), `:408` (`screenCopy`) | D28 |
| Phone gates | `build/conformance-ios.mjs:3958-4004` (`ruleTabs`, rule (b)'s "hides the tab bar" `:3990`), `:4945-5031` (`ruleOwnerCheck`), `:5045-5104` (`ruleEndPressOff`, ONE `ID.sessionEnd`), `:9435-9465` (`ruleLandscape`, (an)), `:9527-9560` (`ruleEndTop`), `:9686-9795` ((aq)), `:9811-9905` ((ar)), `:9913-10024` ((as)), `:10029-10127` ((at), the trailing items `CatchUpItem,EndTopItem` `:10101`), `:10239` (`HOSTILE_SCROLLBACK_ARMS`), the run `:11195-11312` | §6 |
| Ablations | `build/p316/ablation-ios.mjs:399` (`ARMS`, 392 arms: `{ id, rule, what, file, edit }`) | §6.2 |
| Mocks | `docs/design/phone/Session.html` (the icon `:53`, End `:54`, the tab bar `:111-130`), `Screen.html`, `index.html` (captions 3 and 7), `End.html` | §5.7 |
| The drive | `ios/TortieUITests/P316DriveUITests.swift`: `endTop` `:2617`, `toCatchUp` `:2679-2694`, `terminalOpen` `:2742-2790`, `catchUp` `:2796-2822`, `screenRotate` `:2399-2420` (Back pressed SIDEWAYS, `:2405`), `end(step:after:)` `:1437-1520`, `emitBar` `:1297-1330`, `endOff` `:1537-1550` | §7.3 |
| The probe | `build/p316/probe-p316.mjs`: `gradePs1` `:5054`, `gradePs3` `:5141` (Back sideways, "the page came back upright" `:5182`), `gradePs10` `:5335`, `gradePs13` `:5441`, `gradePs14` `:5523`, `gradePs15` `:5560`, `gradeE1` `:3387`, `gradeE3` `:3461`, `gradePshScroll` `:5600`; the screen group's Terminal drive `:8960-9140` | §7.3 |
| The stand-in | `build/p3371/history-stand-in.mjs` (modes `--lines`, `--stack`, `--rate`, `--worst`; tails one at a time, `:160-161`) | `--stream`, `--alt-for` (§7.3) |
| Floors | `HELPER_USER_FLOOR` and `SIMULATOR_USER_FLOOR` | neither moves: no new script reaches either helper |

---

## 3. Where his words, the task and the tree are reconciled

| # | The task or 337.1 says | What is true now | This spec |
| --- | --- | --- | --- |
| 1 | "the live rows at the bottom of the view and as much earlier output above them as fills the screen" | 337.1's pad (`ScreenScroller.swift:393-394`) is computed against the live rows alone, so the offset's maximum always shows the live rows at the view's top, whatever is held above | the pad against every row laid out (D4) |
| 2 | "Following stays at the bottom" | following holds nothing (`ScreenScrollback.swift:222-223`, `:426-435`); with history above, each picture's new history rows would be reserved (blank) right above the live rows until a page landed (337.1 §13 item 10) | carrying (D5), checked at most once a second (D6) |
| 3 | "nothing he is reading moves" | 337.1 D26 holds it for pages and reservations | the first frame already reserved (D3); following's delta keeps the live rows' place (D11) |
| 4 | "A session with no earlier output (or a full-screen program) looks as today" | an alternate picture carries no depth (337.1 D3) | no fill at depth 0 or on the alternate screen (D7) |
| 5 | "No navigation bar ... no tab bar ... no status bar if the system allows" | `conformance:ios` (b) refuses any `.hidden` for `.tabBar` (`:3990`), and the app's comment says "Nothing hides the bar" (`TortieApp.swift:614`) | (b) widened to exactly ScreenPage's landscape `toolbarVisibility` (§6.1) |
| 6 | "The key bar and the keyboard still work in landscape" | the key bar is the field's input accessory | unchanged (D18), driven (PL2) |
| 7 | 337.1's lines "just above the keyboard" (D24, §5.5.4) | with the fill they would sit over the live bottom rows, the prompt | moved to the top (D13) |
| 8 | "one ⋯ button ... Its menu holds Catch Me Up and End session" | End is a top-bar Button identified `session-end` in `EndBar.swift`, and (ac) holds exactly ONE such element | a second press, `terminal-menu-end`, in the menu; (ac) widened to two presses, each a Button with `.disabled(row == .off)` (§6.1) |
| 9 | "End still asks for Face ID ... exactly as today" | the owner check is `EndModel.press` | the menu's End reaches the same `press` through the same dialog (D23) |
| 10 | "probe:p316's screen and end groups still read what they read through the menu" | the drive presses `session-open-catch-up` and `session-end` on the Terminal, and `screen-rotate` presses Back SIDEWAYS (`P316DriveUITests.swift:2405`), where this phase draws none | the drive opens the ⋯ menu (§7.3); `screen-rotate` turns upright before Back |
| 11 | "within its page floor, queue and caps" | the fill's pages are 337.1's pages | at most `⌈fill ÷ 100⌉` pages at open, 0.25 s apart; checks at most 1 a second |
| 12 | 337.1 §13 item 10: "Stated, not designed away: carrying the live rows across as provisional history would put rows the agent may since have redrawn beside the overlap check" | following now shows those rows in view | carried rows are never overlap anchors and a check page replaces them (D5, D6) |

---

## 4. The base, the order and the replay

`/private/tmp/wt-p3373`'s `HEAD` is `dfa878b5`, detached, with `node_modules` and `build/vendor` copied in. 337.3's work goes
on top, UNCOMMITTED, so `git diff dfa878b5` plus the untracked files is exactly the delta. The integrator checks that first:
`git rev-parse HEAD` reads `dfa878b5…`, nothing is staged, and `git diff --stat dfa878b5` names only files §10 assigns.

**This phase lands AFTER 333.1**, on top of it, and never beside 337.2. The committer replays 337.3's delta onto the commit
333.1 lands, by blocks, and runs the battery on the merged tree. The files both phases edit are named in §0; 337.3's edits
to them are additive (new declarations at the ends of `Copy.swift`'s and `Identifiers.swift`'s blocks, new rule functions and
a new `record(...)` block after (au) and 333.1's (av) in `build/conformance-ios.mjs`, new arms at the end of
`build/p316/ablation-ios.mjs`'s `ARMS`, new figures in `docs/design/phone/index.html`, new steps and arms in the drive and the
probe). A conflict or a red gate stops the replay and goes to the main session. The phone's build number is the main
session's at landing (9).

After it lands (his rule of 2026-10-01): the worktree, every parent clone a verifier made, `/private/tmp/tortie-ops/p3373*`
with every DerivedData, removed; never a path another phase uses, never under `/Users/gdc`; `df -k /private/tmp` before and
after in the landing report.

---

## 5. The design

Every drawn word is `Copy.swift`'s or the door's. No `print(`, no log, no package, no web view, no `NSAttributedString`, no
`URLSession`, no `LocalAuthentication` outside `App/OwnerCheck.swift`; nothing persisted. Every arithmetic operator on a
number the door sends goes through `DoorNumber` or is named (rule (k)).

### 5.1 The history — `ios/Tortie/Screens/ScreenScrollback.swift` (builder **history**)

`ScrollbackLayout` keeps its fields and its pure, clock-free shape, and gains:

- `ScrollbackRow.carried: Bool` (default `false`): a row carried from a live picture (D5), drawn as any held row.
- `checked: Int`: the end of the rows pages brought, `lo ≤ checked ≤ hi`. `[lo, checked)` are checked; `[checked, hi)` are
  carried. Every place that moves `lo` or `hi` keeps the bound (an eviction from the top raises `checked` to `lo`; one from
  the bottom lowers it to `hi`).
- `lastSteady: ScreenPicture?`: the last live picture whose depth was a number, kept for carrying.
- `refusedAt: Offer?` and `fillOff: Bool`: D8's two holds on the fill.
- `firstRow` becomes `space == nil ? live : top` (it was `mode == .scrolled ? top : live`, `:176`): when an index space is
  held, in either mode, the layout starts at `top`.

THE CALLS, each named in the code and in the gate (§6.1 (aw)):

1. **`mutating func picture(_ picture: ScreenPicture)`** (`:212-237`, rewritten). In this order:
   - `liveRows` and `offered` as today.
   - **The alternate screen**: `scrolled` returns to following as today (`follow()`); then following drops everything held
     above the live rows (`space = nil`, `held = [:]`, `edge = nil`), and keeps `live` at the last numeric depth (D7).
   - **No offer** (an unsteady read, or a Mac older than 337.1): `live` stays where the last number put it (337.1 §5.6); no
     carrying; `lastSteady` unchanged.
   - **An offer while an index space is held**: another space, another width, or a depth below `depthSeen` is, in
     `scrolled`, 337.1's `edge = .moved(Copy.scrollbackMoved)`; in following, a drop (as above), with `live` set to the new
     depth, so the next pass fills again (D7). Otherwise `depthSeen` rises to the depth, and **carrying** (D5): with
     `k = depth − live`, when `lastSteady` is in the same space and width, `0 < k ≤ lastSteady.rowCount` and `hi == live`,
     rows `[live, depth)` are held as `ScrollbackRow(row: ScreenRowModel(index: live + i, runs: lastSteady.rows[i].runs,
     holds:), styles: lastSteady.styles, carried: true)` for `i` in `0..<k`, and `hi = depth`; otherwise the rows are left
     reserved (a gap under `hi`, which pages fill). Then `live = depth` (following) or `max(live, depth)` (scrolled, as today).
   - **An offer with no index space held, in following**: `live = depth`; the space is established by the next `reserve(`.
   - **D8's re-arm**: a picture whose offer (depth, space, columns) differs from `refusedAt` clears `refusedAt`; a numeric
     depth clears an `.stopped` edge in following.
   - `lastSteady = picture` whenever the picture offered a numeric depth.
2. **`mutating func reserve(visibleTop: Int, fill: Int) -> Int`**, STILL THE ONE PLACE `top` MOVES (rule (as)), answering the
   rows it reserved above the first row:
   - **following**: when no space is held and an offer exists, not `refusedAt` and not `fillOff`: establish it (`space`,
     `wrap`, `depthSeen = live = offer.depth`, `lo = hi = checked = offer.depth`, `held = [:]`, `edge = nil`,
     `overlapWanted = overlapRows`, `top = offer.depth`), AT ANY DEPTH, 0 included (D7). Then, when `fill > 0`:
     `let want = max(0, live − ⌈fill ÷ pageRows⌉ × pageRows)`, and `top = want` when `want < top`. Never the other way: the
     reservation only grows (D2). Following no longer enters `scrolled` here (it did at `:249-261`).
   - **scrolled**: with no space held (337.1's pull past the live top), establish as above and reserve the first page above
     the live rows (`top = max(0, live − pageRows)`, 337.1); else 337.1's next page when the view's top is within one page of
     `top` (`:262-269`).
3. **`mutating func scroll()`**: following → `scrolled`, the layout kept exactly as it is (no row added, D9).
4. **`func want(visibleTop: Int, visibleBottom: Int) -> ScrollbackAsk?`** (`:276-301`), now in EITHER mode (the
   `mode == .scrolled` guard at `:277` goes; `!pagingStopped`, and in following `!fillOff` and `refusedAt == nil`, are asked
   instead). Every page's overlap comes from CHECKED rows alone: `overlap = min(overlapWanted, checked − lo)`, 0 when none is
   checked (then the page is joined by its space, width and depth alone, as 337.1's first page). In this order:
   1. **older**: rows reserved above `lo`, in view or within one page above it (337.1): `from = max(top, lo − pageRows)`,
      `count = (lo − from) + overlap`, `keep = .bottom`. With nothing held (`lo == hi == checked == live`) this IS 337.1's
      first page, `[max(0, live − 100), live)`;
   2. **newer**: rows above `checked` and under the live top, carried or reserved, in view (and, for reserved rows, within one
      page below it): the page ADJOINS THE CHECKED ROWS, not `hi` as in 337.1 (`:295-298`): `from = checked − overlap`,
      `count = min(pageRows, live − checked) + overlap`, `keep = .top`; it fills the reserved rows and replaces the carried ones
      it covers. It is a **check** (`ScrollbackAsk.checks = true`, D6) when every row it brings past its overlap is carried,
      and then it is asked only while a carried row is in view;
   3. otherwise none. Every ask is still checked `from + count ≤ depthSeen` and `count ≤ PocketScrollbackAnswer.mostRows`
      (`ask(`, `:306-310`).
5. **`mutating func accept(_ page:, for ask:, holds:) -> ScrollbackLanding`** (`:319-370`), in either mode:
   - its checks as today (space, width, `depth ≥ depthSeen`, rows within the ask, `answers(`, `overlapAgrees(`), with
     `overlapAgrees` reading CHECKED rows alone (a carried row is never an anchor: `guard let mine = held[index],
     !mine.carried`);
   - a page FILLS a reserved row and REPLACES a carried one (`held[index] == nil || held[index]!.carried`), never a checked
     one; `checked` then rises to the page's end where the page starts at or under it;
   - a refusal in `scrolled` is 337.1's (`edge = .moved`, the line); in following it drops what following holds and sets
     `refusedAt` to the offer current then (D8), and draws no line;
   - `.ended` and `.unreachable`: `edge = .stopped` (337.1), cleared in following by the next numeric depth (D8).
6. **`mutating func follow() -> Int`** (`:426-435`): `mode = .following`; when `hi == live` and `!pagingStopped`, everything
   held is kept (D10); otherwise every held and reserved row is dropped (`space = nil`). Answers the rows laid out above the
   live rows that it took away, for the offset's delta (0 when kept).
7. **`mutating func stop(_ sentence: String)`** (`:438-441`): in `scrolled` as today; in following it drops what following
   holds and sets `fillOff = true` for this Terminal (D8).
8. `evict` (`:405-420`) keeps the `checked` bound; nothing else moves.

`ScrollbackModel` (`:467-687`):

- `static let checkGap: Duration = .seconds(1)`, declared once, beside `minGap` (D6).
- **`func fill(rows: Int) -> Int`**: called by the scroll view's layout pass BEFORE it sizes the content;
  `layout.reserve(visibleTop: visibleTop, fill: rows)`; remembers `rows` as the view's fill; then `pump()`. It does NOT call
  `onLayout` (its caller is the layout pass) and changes neither observed value. Answers the rows reserved.
- **`func viewed(top: Int, bottom: Int, atBottom: Bool) -> Int`** (`:534-542`): when following, `!atBottom` and
  `top < layout.live`, `layout.scroll()` then `changed()` (D9); then `layout.reserve(visibleTop: top, fill: <the view's
  fill>)`, the eviction and `pump()` as today.
- `pump()` (`:607-629`): the wait before a page is `ask.checks ? Self.checkGap : Self.minGap` after the last start; one page in
  flight as today.
- `landed` (`:631-653`): a refused page (404, or `closedBeforeAnswer`) is `layout.stop(DoorWords.scrollbackSentence(for:))`
  as today, which in following turns the fill off (D8).
- `follow()` (`:548-558`): as today around `layout.follow()`.

The header comment gains Phase 337.3's paragraph (his item 1, the fill, carrying, checks), and keeps Paseo's credit.

### 5.2 The scroll view — `ios/Tortie/Screens/ScreenScroller.swift` (builder **terminal**)

- **`layoutSubviews`** (`:380-439`): after the cell is known and BEFORE `rows` and the content size are computed, the fill:
  `let fill = <⌈bounds.height ÷ now.height⌉ − picture.rowCount, never below 0>`, through `Int(exactly:)` of a finite rounded
  value and `ScrollbackLayout.less(`, never a trapping cast or operator; then `_ = scrollback.fill(rows: fill)`, and the
  layout read again (`let layout = scrollback.layout`) after it. D2.
- **The pad** (`:393-394`): `max(0, visible − (layout.liveRow + picture.rowCount) × now.height)`, every row laid out (D4).
- **`rowsAdded(from:to:)`** (`:445-456`): `(.following, .following)` is `layout.liveRow − previous.liveRow` (rows added or
  taken above the live rows, D11); `(.following, .scrolled)` and `(.scrolled, .scrolled)` are
  `previous.first − layout.firstRow` (rows reserved above the first row); `(.scrolled, .following)` stays
  `layout.liveRow − previous.liveRow`. The delta is still applied only by `apply(above:)`, from `layoutSubviews` alone.
- **The pin**: following's pin as today; and when the cell changes with no focal anchor (a turn of the phone, not a pinch or
  a double tap) while following and pinned, `pin()` instead of `keepAnchor` (D12).
- **`report()`** (`:522-532`): `scrollback.viewed(top:bottom:atBottom: pinned)` (D9).
- Nothing else: `keyboardOverlap(_:)`, the gestures, the window, the elements, the offset's writers (`apply`, `pin`,
  `keyboardOverlap`) as 337.1's fix round left them.

The header comment's "THE CONTENT (D25)" paragraph is rewritten for D4 and D11, naming this spec.

### 5.3 The page — `ios/Tortie/Screens/Screen.swift` (builder **terminal**)

- **`TerminalChrome`** (NEW, pure, in this file): `init(_ sizeClass: UserInterfaceSizeClass?)`, `landscape` (`sizeClass ==
  .compact`), `header` (`!landscape`), `tray(overlap: CGFloat, typing: Bool) -> Bool` (`!landscape && overlap == 0 &&
  !typing`), `bars: Visibility` (`landscape ? .hidden : .automatic`), `statusBarHidden` (`landscape`),
  `toolbarCopy(_ drawn: Bool) -> Bool` (`drawn && !landscape`), `overlayCopy(_ drawn: Bool) -> Bool` (`drawn && landscape`).
  Every decision D15 and D17 make is one member here, so `TerminalChromeTests` reads each and rule (ax) reads that ScreenPage
  asks it.
- **`ScreenPage`** (`:208-478`): `@Environment(\.verticalSizeClass) private var sizeClass` and
  `private var chrome: TerminalChrome { TerminalChrome(sizeClass) }`; the header drawn only `if chrome.header`; the tray only
  `if chrome.tray(overlap: overlap, typing: typing)` (replacing `if overlap == 0, !typing`, `:264`); after the toolbar
  modifiers, `.toolbarVisibility(chrome.bars, for: .navigationBar, .tabBar)` and `.statusBarHidden(chrome.statusBarHidden)`,
  each ONCE; the toolbar's Copy only `if chrome.toolbarCopy(copyDrawn)`; `trailing` unchanged (the bar is hidden sideways).
- **The lines move to a `top` view** (D13): `scrollback.line` (`screen-scrollback-line`) and `shownLine` (`screen-line`) are
  drawn in a NEW `private var top: some View`, applied as `.overlay(alignment: .top) { top }` on the content, each line as
  `lineView` draws it today; `bottom` (`:379-403`) keeps the arrow back to live and gains, above it, Copy when
  `chrome.overlayCopy(copyDrawn)` (`Words(Copy.copy, .body, Tokens.accent)` on `Tokens.bgRaised`, `ID.screenCopy`, the same
  `copySelection()`), still padded at its bottom by the overlap alone.
- `OrientationGate`'s two sets stay in this file's appear and disappear (rule (an)); `ScreenCover`, the poll, the key field,
  the root's keyboard opt-out unchanged.

### 5.4 The ⋯ — `ios/Tortie/Screens/SessionScreen.swift` and `ios/Tortie/Screens/EndBar.swift` (builder **pages**)

In `Screens/EndBar.swift`:

- `EndBarDrawing.menuLabel: String`: `Copy.ending` while the write runs, else `Copy.endSessionMenu` (pure, beside `label`).
- **`EndMenuItem: View`**: `let model: EndModel`, `let row: EndBarDrawing.Row`, `let drawing: EndBarDrawing`,
  `let ask: () -> Void`; its body ONE `Button(role: .destructive) { ask() } label: { Label(drawing.menuLabel, systemImage:
  drawing.glyph) }` with `.disabled(row == .off)` and `.accessibilityIdentifier(ID.terminalMenuEnd)` in its own chain (rule
  (ac)'s second press). It is drawn only where `EndTopControl` would draw a row: `model.writer != nil` and `drawing.row !=
  nil`.
- **`EndConfirmation: ViewModifier`** and `extension View { func endConfirmation(model:offer:confirm:drawing:isPresented:
  reread:) }`: the `confirmationDialog` `EndTopControl` holds today (`:321-332`), word for word, moved here; `EndTopControl`
  applies it instead of its inline copy, so Catch Me Up's End is unchanged and the menu's End shares it (D23).
- `EndTopItem`, `EndTopControl` (its press keeps `ID.sessionEnd` and `.disabled(row == .off)`), `EndLine`, `EndModel` and
  `EndRunner` otherwise unchanged.

In `Screens/SessionScreen.swift`:

- `TerminalPage`'s `trailing:` (`:421-425`) becomes exactly `TerminalMenu(end: end, offer: drawing.end, confirm:
  drawing.endConfirm, reread: { await session.load() }) { openCatchUp(drawing.outcome) }`.
- **`TerminalMenu: ToolbarContent`**: ONE `ToolbarItem(placement: .topBarTrailing)` holding `TerminalMenuControl`.
- **`TerminalMenuControl: View`**: `@State private var asking = false`; its body an `HStack(spacing: 4)` of the progress mark
  (D24: a `ProgressView` while `drawing.confirming`, identified `ID.endConfirming`, or while the write runs, identified
  `ID.endWriting`) and ONE `Menu { … } label: { Image(systemName: TerminalMenuControl.symbol) … }`, the label in
  `Tokens.accent`, the menu `.accessibilityLabel(Text(verbatim: Copy.more))` and `.accessibilityIdentifier(ID.terminalMenu)`,
  with `.endConfirmation(…, isPresented: $asking, …)` applied to the `Menu` itself, outside its content. The content, in order:
  `Button(action: openCatchUp) { Label(Copy.catchMeUp, systemImage: "text.bubble") }.accessibilityIdentifier(
  ID.terminalMenuCatchUp)`, then, where End is drawn, `EndMenuItem(…) { asking = true }`.
  `static var symbol: String { if #available(iOS 26, *) { "ellipsis" } else { "ellipsis.circle" } }`.
- `CatchUpItem` (`:444-459`) is deleted. `ChoiceTray`, `StatusLine`, `NowCard`, `CatchUpPage` unchanged.
- The file's header comment says what the top right holds now (D21 to D24).

### 5.5 Words, identifiers, the project (builder **pages**)

- `ios/Tortie/Style/Copy.swift`, one word, added at the end of the Terminal's block, beside `endTop`:
  ```swift
  /// Phone: the spoken name of the Terminal's ⋯ (Phase 337.3, his "an ellipses in the top right"),
  /// iOS's own name for an ellipsis button. The Mac names its machine rows' ⋯ `More for <name>`
  /// (src/renderer/settings/machines-copy.ts moreLabel); the phone's one ⋯ sits beside the session's name.
  static let more = "More"
  ```
- `ios/Tortie/Screens/Identifiers.swift`: added `terminalMenu = "terminal-menu"`, `terminalMenuCatchUp =
  "terminal-menu-catch-up"`, `terminalMenuEnd = "terminal-menu-end"` (beside `terminalStatus`) and `endWriting = "end-writing"`
  (beside `endConfirming`); `sessionOpenCatchUp` (`:294-295`) deleted with its doc line.
- `ios/Tortie.xcodeproj/project.pbxproj`: every new file of every builder referenced (§10); `CURRENT_PROJECT_VERSION`
  unchanged in all six configurations.

### 5.6 What the phone does in each case

| Case | What the phone draws |
| --- | --- |
| Opening a session whose history is deeper than the fill | live rows at the bottom from the first frame, reserved rows above, filled by one page (two or more only past about 200 columns) |
| Opening a session at depth 0 (nothing scrolled off yet) | the live rows at the top, the pad below, no page asked: as today; the first line that scrolls off is carried, so nothing blinks |
| A history shorter than the fill | the whole history at the top, the live rows under it, the pad below; nothing more to page |
| A full-screen program | the live rows at the top, no history, no page, no line: as today; when it leaves, the fill comes back |
| A Mac older than 337.1 (no depth) | as today |
| An agent printing while he watches | the live bottom stays at the view's bottom; what scrolls off the live top is carried into the history above at once; carried rows in view checked at most once a second |
| More lines in one picture than the screen holds (a flood, a return to the Terminal while an agent printed, or a selection let go) | *His rule, since the fix round of 2026-10-08: a page the picture outran is carried or read again, never dropped to blank.* Nothing drawn is taken away: the rows the last picture showed are carried, the lines no picture showed are holes under the new live top, and the page that fills the view goes AT ONCE from the live top, so only those lines are the ground, for one round trip |
| Output that outruns the screen picture after picture (two such pictures within `outrunGap`, 3 s), short of the view | every row a picture showed carried, the lines no picture showed holes beside them, no page asked until 3 s after the last such picture (a page would be scrolled away before it filled anything), then one page fills the holes. Nothing drawn is taken away |
| Output that passes the view picture after picture (such a picture's lines past the screen and every row the view holds above it) | the rows above the prompt go to the ground once, each drawn row scrolling away with the output, and stay the ground steadily, as build 7 drew nothing there: no carry and no page until 3 s after the last picture that outran the screen, then one page fills the view. Never a strip that appears and vanishes |
| A trim, a clear, a width or pane change while following | the history above dropped and filled again from the new picture, with no line |
| A page refused while following | the history above dropped, no line, not asked again until the picture's depth, space or width differs; *since the fix round:* the fill's rows stay reserved, the ground, so the live rows stay at the bottom (they had jumped to the top until the next picture); a 404 turns the fill off for that Terminal |
| He drags up | `scrolled` at once; 337.1's paging, its line where paging stops, its arrow back to live |
| Back to live | the fill kept when it reaches the live top, else filled again (one page) |
| Sideways | the terminal alone inside the safe area; Copy at the bottom right for a selection; no ⋯, no tabs |
| Upright again | every bar where it was |
| The ⋯ | a native menu: Catch Me Up, then End session… (or Catch Me Up alone where End is not drawn today) |

### 5.7 The mocks — `docs/design/phone/` (builder **gates**)

- `Session.html` (the Terminal at rest): the top right holds the ⋯ alone, an inline SVG of three dots with
  `aria-label="More"` and no visible word, in place of the icon (`:53`) and End (`:54`); the terminal FILLED: rows of earlier
  output above the sample's live rows, the live rows' last row at the grid's bottom. The history rows are a committed
  capture's own rows, judged as data by a rule that reads that capture (as `screenSampleRows` reads the sample,
  `build/p311/copy-drift.mjs:243`), so a row the mock invents fails by name.
- `Screen.html` (the Terminal with the keyboard up): the ⋯ in place of the icon and End; the live bottom just above the key
  bar; the history above.
- NEW `TerminalMenu.html`: the Terminal upright with the ⋯ menu open over it: `Catch Me Up` with the speech bubble, then
  `End session…` in the error colour with the Face ID glyph.
- NEW `Landscape.html`: the Terminal sideways, the terminal alone in a landscape frame, the island's strip and the home
  indicator's strip the ground colour; no bar.
- `index.html`: the two new figures (a landscape figure gets a landscape frame of its own), caption 3 ("…the ⋯ at the top
  right holds Catch Me Up and End"), caption 7 ("End is in a session's ⋯ menu, and at the top right of Catch Me Up"), and the
  screen count in the header.
- `End.html`: one comment line: the Terminal reaches the same confirmation from its ⋯ menu (`TerminalMenu.html`).

**The words each mock draws, pinned so `CopyTests` (pages) and the mocks (gates) agree**: `Session.html` draws
`aria-label="More"` (`Copy.more`) and no longer draws `Copy.endTop`, the icon's `aria-label="Catch Me Up"` or any End word;
`TerminalMenu.html` draws `Copy.catchMeUp` and `Copy.endSessionMenu` as visible words and `aria-label="More"`;
`Landscape.html` draws no Copy word (the terminal's rows are data); `Screen.html` keeps the key bar's words and draws
`aria-label="More"`; `Conversation.html`, `Choice.html`, `Answer.html` and `End.html` keep `Copy.endTop` (Catch Me Up's End).
`CopyTests`' `drawn` list: `(session, Copy.endTop)` goes; `(terminalMenu, Copy.catchMeUp)` and
`(terminalMenu, Copy.endSessionMenu)` come; its check that `Session.html` names its icon `Catch Me Up` becomes that
`Session.html` and `Screen.html` name their ⋯ `Copy.more` and draw `Copy.catchMeUp` nowhere; the check that no page draws
`>End session…<` as an End bar keeps `Session.html`, `Choice.html` and `Answer.html` and never reads `TerminalMenu.html`.
`ios/TortieTests/TokensTests.swift` keeps its eleven chrome mocks (the two new ones draw a session's own colours, as
`Session.html` and `Screen.html` do).

---

## 6. The gates, clause by clause

Every new or widened clause has an ablation arm that turns it red on its own against a green base, restored by sha256 in a
`finally`; an arm whose anchor text is absent FAILS by name. Rule letters (a) to (au) are taken, and (av) is 333.1's; this
phase's new rules are (aw), (ax) and (ay), in a block after (av)'s in the run list. Every new scanner is proved on fixtures of
its own first, the shapes that pass the parent's code among them.

### 6.1 `conformance:ios` (`build/conformance-ios.mjs`)

**Why each clause that encodes today's look moves, in his words.**

| Clause | Today it holds | It moves because he said |
| --- | --- | --- |
| (b) "nothing hides the tab bar" (`:3990`) | the tab bar on every pushed page | "when you're in horiztonal mode, i want to show as much of the terminal as possible and not the top which shows you which session you're in or the different bottom needs input, sessions or settings menu" |
| (at) "the icon then End" (`:10086`) | `CatchUpItem` then `EndTopItem` on the Terminal | "In vertical mode, I'd rather have an ellipses in in the top right that show the option to catch me up or end session" |
| (ac) "the ONE End press" (`:5045`) | one element `session-end` | the same words, and "(we can keep face input for end session)": End now also lives in the menu, behind the same owner check |
| (aq7) "the pad against the live rows" | the live rows at the view's top | "i'd rather more of the scrollback (if available) in vertical mode could be shown like this" [the screen filled with earlier output, the live rows at the bottom] |
| (as) `follow()` drops everything; following asks no page | following holds nothing | the same words: following now holds the history that fills the view |
| (ar3) the lines just above the keyboard | the lines over the empty pad | not his words but their consequence: the fill puts his prompt where the lines sat (D13) |
| (an) "landscape on the Screen alone" | unchanged | stands; (ax) adds what landscape draws |

The header's rule list gains a Phase 337.3 paragraph naming (aw), (ax), (ay) and the widenings, as 337.1's did.

**Widened**

- **(b) the tab bar** (`ruleTabs`, `:3958-4004`): "nothing hides the tab bar" becomes: the tab bar and the navigation bar are
  hidden in ONE place, `ScreenPage`'s body in `Screens/Screen.swift`, by ONE `.toolbarVisibility(` whose visibility argument
  is `chrome.bars` (or reads `TerminalChrome`), whose `for:` names exactly `.navigationBar, .tabBar`, and `TerminalChrome.bars`
  is `landscape ? .hidden : .automatic` with `landscape` exactly `sizeClass == .compact` over a VERTICAL size class; no other
  file and no other modifier hides either (`.toolbar(.hidden`, an unconditional `.toolbarVisibility(.hidden`,
  `.navigationBarHidden(`, `setNavigationBarHidden`, `tabBar.isHidden`, `.isHidden = true` on a tab bar). The three tabs, their
  words, symbols and order, and "no tab stored" stand. Fixtures: the parent's tree passes; an unconditional hide, a hide in
  `SessionScreen.swift`, a `horizontalSizeClass` reading (every iPhone is horizontally compact upright, so the bar would hide
  upright), `.navigationBarHidden(true)` each fail.
- **(ac) the End presses** (`ruleEndPressOff`, `:5045-5104`): exactly TWO elements in the app are End presses, each ONE site in
  `Screens/EndBar.swift`, each a `Button` whose own modifier chain holds `.disabled(<row> == .off)` over a parameter of type
  `EndBarDrawing.Row` (whose cases stay exactly `on` and `off`): `ID.sessionEnd` in `EndTopControl.row` (Catch Me Up's top
  bar) and `ID.terminalMenuEnd` in `EndMenuItem` (the Terminal's menu), the latter also `role: .destructive`. `ruleEndTop`
  (`:9527-9560`) stands for `EndTopItem`. `ruleOwnerCheck` (`:4945-5031`) is read unchanged: one `evaluatePolicy(`, every
  runner's `run` in the `.confirmed` case, `SessionScreen.swift` naming no owner check.
- **(aq) the pan and the delta** (`ruleScreenPans`, `:9686-9795`): (aq7) reads the pad as the visible height less
  `(layout.liveRow + picture.rowCount)` rows (every row laid out, D4) and refuses the parent's live-rows-alone pad; NEW
  clause (aq9): `layoutSubviews` calls `scrollback.fill(rows:` BEFORE it assigns `contentSize`; NEW (aq10): `rowsAdded`'s
  `(.following, .following)` arm is `layout.liveRow − previous.liveRow`, never `0`; NEW (aq11): `report()` hands
  `atBottom:` the view's `pinned`. The offset's writers stay `apply`, `pin` and `keyboardOverlap`.
- **(ar) the keyboard** (`ruleScreenKeyboard`, `:9811-9905`): (ar3) reads `bottom` as holding the arrow back to live (and
  Copy sideways) padded by the overlap alone; NEW (ar5): `ID.screenLine` and `ID.screenScrollbackLine` are drawn in
  ScreenPage's `top` view, applied with `.overlay(alignment: .top)`, and never in `bottom` (D13).
- **(as) the scrollback client** (`ruleScrollbackClient`, `:9913-10024`): (as5) `reserve(` is still the one place `top`
  moves (the fill goes through it); NEW (as12): `ScrollbackModel.checkGap` declared once, at least 1 s, and `pump()` waits it
  for an ask with `checks`; NEW (as13): `overlapAgrees` skips a carried row (`!…carried`), and `accept(` overwrites only a nil
  or carried held row; NEW (as14): `follow()` keeps the held rows exactly when `hi == live` and paging has not stopped.
- **(at) terminal first** (`ruleTerminalFirst`, `:10029-10127`): (at3)'s trailing items become exactly `TerminalMenu`
  (`said.trailing` is `TerminalMenu`, never `CatchUpItem,EndTopItem`); the `CatchUpItem` clauses (`:10105-10114`) move into (ay);
  no `CatchUpItem` and no `ID.sessionOpenCatchUp` anywhere in the app.
- **(t)** `HOSTILE_SCROLLBACK_ARMS` (`:10239`) gains `scrollback-fill-moved` (§7.3), `ends: 'drawn'`.
- **(k)** reads every new operator: the fill's arithmetic in `ScreenScroller.swift` and the carrying and checking arithmetic
  in `ScreenScrollback.swift` through `ScrollbackLayout.plus`/`less` and `DoorNumber`, or named in `ARITHMETIC_NAMED` with
  why; nothing new traps.

**New**

| Rule | Holds |
| --- | --- |
| **(aw) THE TERMINAL OPENS FILLED** (D1 to D12) | `ScrollbackLayout.firstRow` is `space == nil ? live : top`; `reserve(visibleTop:fill:)` in following establishes the space at any depth and moves `top` to `live − ⌈fill ÷ pageRows⌉ × pageRows` (never above 0, never down); `picture(` drops what following holds on an alternate picture, another space, another width and a depth below `depthSeen`, and carries rows only from `lastSteady`'s first `k` rows with `k ≤ lastSteady.rowCount`, `hi == live`, the same space and width, marking each `carried: true`; `ScrollbackModel.fill(rows:` exists and calls no `onLayout`; `viewed(top:bottom:atBottom:)` calls `layout.scroll()` only behind `!atBottom` and `top < layout.live` in following; `want(` asks in either mode, a check ask (`checks: true`) only for carried rows in view, its overlap from checked rows alone; a refusal in following sets `refusedAt` and draws no line, a 404 sets `fillOff`; nothing of the history persisted (`PERSISTS` over both files, as (as10)) |
| **(ax) LANDSCAPE IS THE TERMINAL ALONE** (D15 to D19) | `TerminalChrome` declared once, in `Screens/Screen.swift`, with exactly the members §5.3 names; `landscape` reads `verticalSizeClass` and `.compact`; ScreenPage reads `@Environment(\.verticalSizeClass)`, draws its header only behind `chrome.header` and its tray only behind `chrome.tray(`, applies `.toolbarVisibility(chrome.bars, for: .navigationBar, .tabBar)` and `.statusBarHidden(chrome.statusBarHidden)` exactly once each; the toolbar's Copy behind `chrome.toolbarCopy(` and the overlay's behind `chrome.overlayCopy(`, the two complements of one `landscape`, so `ID.screenCopy` is drawn by at most one at a time; `OrientationGate.screenOnTop` still set in this file's appear and disappear and nowhere else ((an) stands); and (aq1) still refuses any SwiftUI gesture in a Screen file, so nothing shows the bars on a swipe or a tap |
| **(ay) THE ⋯ MENU** (D21 to D24, D27, D28) | `TerminalPage`'s trailing items are exactly `TerminalMenu`; `TerminalMenu` is one `ToolbarItem(placement: .topBarTrailing)`; `TerminalMenuControl` holds exactly one `Menu {`, labelled with `Image(systemName: TerminalMenuControl.symbol)`, whose `symbol` is `"ellipsis"` under `#available(iOS 26, *)` and `"ellipsis.circle"` otherwise, spoken `Copy.more` through `Text(verbatim:`, identified `ID.terminalMenu`; its content exactly two entries in order, a `Button` labelled `Label(Copy.catchMeUp, systemImage: "text.bubble")` identified `ID.terminalMenuCatchUp` whose action opens Catch Me Up, then `EndMenuItem(`; the `.endConfirmation(` modifier applied to the `Menu`, outside its content closure; `EndMenuItem`'s label `Label(drawing.menuLabel, systemImage: drawing.glyph)`; `EndBarDrawing.menuLabel` is `Copy.ending` or `Copy.endSessionMenu`; the dialog's `confirmationDialog(` written once in the app for a single End (in `EndConfirmation`), so the Terminal and Catch Me Up cannot drift; the progress mark identified `ID.endConfirming` behind `confirming` and `ID.endWriting` behind the write; `Copy.more` is `"More"` with a `/// Phone:` owner; `TerminalMenuControl` names no `OwnerCheck`, `LAContext` or `evaluatePolicy` (End's check is `EndModel.press`'s) |

### 6.2 `ablation:p316` (`build/p316/ablation-ios.mjs`)

One arm per new or widened clause, at the end of `ARMS`, each `{ id, rule, what, file, edit }` and each red on the rule that
owns it, about 30. Among them: (b) an unconditional `.toolbarVisibility(.hidden, for: .tabBar)` in ScreenPage; the hide moved
into `TerminalPage`; `landscape` read from `horizontalSizeClass`; `.navigationBarHidden(true)`; (ac) `EndMenuItem`'s
`.disabled(row == .off)` removed; `ID.terminalMenuEnd` moved onto the label; (aq) the pad put back against the live rows alone
(the parent's: his defect); `scrollback.fill(rows:` moved after `contentSize =`; `rowsAdded`'s following arm back to 0;
`atBottom:` handed `true`; (ar) `screenLine` moved back into `bottom`; (as) `checkGap` 0.25; a carried row used as an anchor;
`accept(` overwriting a checked row; `follow()` always dropping; (at) `CatchUpItem` put back as a trailing item;
(aw) `firstRow` back to `mode == .scrolled ? top : live`; the fill moving `top` outside `reserve(`; carrying with no `hi == live`;
carrying `k` past the picture's rows; no drop on the alternate screen; a refusal in following drawing the moved line; no
`refusedAt` (a loop); `fill(rows:` calling `onLayout`; (ax) the header drawn sideways; the tray drawn sideways;
`statusBarHidden` removed; the toolbar's Copy drawn sideways too (two `screen-copy`); `OrientationGate` set in
`SessionScreen.swift`; (ay) a third menu item; the two items swapped; the dialog attached inside the menu's content; a second
`confirmationDialog(` for End copied into `SessionScreen.swift`; `Copy.more` spelled `"More…"`; the symbol fixed to
`"ellipsis.circle"` on every iOS; `TerminalMenuControl` naming `ownerCheck`.

### 6.3 `conformance:phonecopy` (`build/p311/copy-drift.mjs`)

- `More` OWNED by `ios/Tortie/Style/Copy.swift` (`static let more = "More"`), drawn by `Session.html`, `Screen.html` and
  `TerminalMenu.html` as an `aria-label`; `Catch Me Up` and `End session…` owned as today, drawn by `TerminalMenu.html`.
- The new mocks judged; `Session.html`'s and `Screen.html`'s history rows as data by a rule reading the capture they are drawn
  from (§5.7); the owned-rule floor moves by the rules the run matches (the gates builder counts and names it in the floor's
  comment, as 337.1's integrator did).
- Self-test mutations: `More` cased differently in `Copy.swift`; `Catch Me Up` put back as `Session.html`'s icon label;
  `End` drawn in `Session.html`'s top bar; an invented row in `Session.html`'s history; each red.

### 6.4 What does not move

`conformance:pocket`, `:pocket:hostile`, `:machines`, `:choices`, `:handback`, `:manager`, `:push` and the vectors
(`build/p316/vectors.mjs --check`) read the same tree they read at `dfa878b5` and must pass unedited. `gate:contract` byte for
byte. `gate:electron` and `gate:simulator` floors unchanged. `probe:p337`, `measure:p337` and `probe:p3167` are not
triggered (nothing under `src/` moves).

---

## 7. The proof, run rather than read

### 7.1 The battery (the integrator, then the committer at landing)

`npm run -s typecheck`, `npm run -s build` (with `conformance:ios`, `gate:contract`, `gate:simulator`, `gate:electron`,
`gate:background`, `gate:checks`, `gate:knownhosts`), `npm test` (scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null`, no
`TERM_SESSION_ID`), `CSC_IDENTITY_AUTO_DISCOVERY=false npm run -s package`, `npm run -s conformance:phonecopy` and its
`--self-test`, `npm run -s ablation:p316` in its own `cp -Rc` clone, `node build/p316/vectors.mjs --check`, the grader
self-tests of `probe:p316` (every group), `build/p316/hostile-door.mjs --self-test` and `build/p3371/history-stand-in.mjs`'s;
`xcodebuild build-for-testing` Debug and Release (`ENABLE_TESTABILITY=YES`) for the Simulator SDK and an unsigned Release
device archive read by `node build/p316/test-ios.mjs --read-app`; `git diff dfa878b5 -- src/ docs/audits/contract-baseline.txt
src/main/menu.ts` empty. `smoke:t1`, `smoke`, `smoke:t3` at landing. `test:ios` Debug and Release on iOS 26.3 and 18.3 and
the app run (§7.3) are the verifier's, under the lock.

### 7.2 XCTest (the builders')

- **history**: `ios/TortieTests/ScrollbackModelTests.swift` rewritten where 337.1's following moved (its "following asks no
  page" and "follow() drops every held row" become the fill's), and NEW `ios/TortieTests/TerminalFillTests.swift`: the
  fill's reservation for a 40-row picture at depth 3,000 and a fill of 57 rows is 100 rows (`top` 2,900) and one ask
  `(2900, 100, depth 3000, keep bottom, overlap 0)`; at depth 30, `top` 0 and one ask of 30; at depth 0 the space held and
  nothing reserved or asked; a fill that shrinks reserves nothing and moves `top` back down never; carrying 1 to 40 rows
  from the last steady picture (labels, styles, `carried`), and none for 41, for a gap under `hi`, for another space or
  width, across an unsteady picture (from the last steady one); a carried row never an anchor (a page whose overlap would
  match a carried row but not a checked one is refused); a check ask only for carried rows in view, its overlap from checked
  rows, replacing carried rows (one that differed included) and raising `checked`; the alternate screen, a trim, another
  width and another space each dropping following's rows with no line; a refused page in following setting `refusedAt` and
  asking nothing until a picture's depth, space or width differs; a 404 turning the fill off while `scrolled` still pages;
  `ended` then a numeric depth resuming; `viewed(atBottom: false)` above the live top entering `scrolled` with no row added,
  and `atBottom: true` never; `follow()` keeping a contiguous fill and dropping a gapped one; the eviction keeping
  `lo ≤ checked ≤ hi`; `checkGap` between two check pages and `minGap` before a reserved page, on a scripted clock.
- **terminal**: `ios/TortieTests/ScreenScrollerTests.swift` rewritten where 337.1's following moved
  (`testFollowingPutsTheLiveRowsAtTheTop`, `:81`, becomes three: at depth 3,000 the live rows' LAST row ends at the view's
  bottom within half a point at the 337 build's geometry (40 rows of 6.67 pt in a 758 pt view) and reserved rows above;
  at depth 0, live row 0 at the view's top and the pad below, as today; on the alternate screen, the same), and new cases: the
  FIRST layout pass already has the live bottom at the view's bottom (no pass with the live rows at the top); a first page
  landing moves no on-screen row; 200 pictures each scrolling 1 to 5 lines while following keep every live row's on-screen y
  within half a point and keep history contiguous above them; the pad equal to the visible height less every row laid out;
  a drag off the bottom entering `scrolled`; a turn (a cell change with no anchor) while following and pinned keeping the live
  bottom; a pinch keeping its focal row; and 337.1's delta, keyboard, window and element tests kept green. NEW
  `ios/TortieTests/TerminalChromeTests.swift`: every `TerminalChrome` member for `.compact`, `.regular` and nil.
- **pages**: NEW `ios/TortieTests/TerminalMenuTests.swift`: the menu's items for each End offer (offered with Face ID, Touch
  ID, the passcode alone, no passcode, unreachable, under way, writing, not offered, no writer), read from the drawing
  (labels, glyphs, on or off, present or absent) and from the source (two entries in order, the dialog outside the content,
  the symbol by iOS version); `EndTopTests` (`:44-49` read `CatchUpItem {` then `EndTopItem(` in TerminalPage's trailing items;
  now `TerminalMenu(` alone, and Catch Me Up's `EndTopItem(` as today), `TerminalRouteTests` (`:180-188` read `CatchUpItem` and
  `ID.sessionOpenCatchUp`; now `TerminalMenu` and `ID.terminalMenuCatchUp`), `CopyTests` (§5.7), `EndTests` and `EndWordsTests`
  where `menuLabel` and the shared dialog move them.

### 7.3 `probe:p316` — the app run (builder **probes**; driven by the verifier)

**THE DRIVE** (`ios/TortieUITests/P316DriveUITests.swift`). `Seen` gains `terminalMenu`, `terminalMenuCatchUp`,
`terminalMenuEnd`, `endWriting`, and the menu's words spelled again (`More`, `Catch Me Up`, `End session…`, `Ending…`) for a
label fallback; `sessionOpenCatchUp` goes. ONE helper opens the menu and reads it: `openTerminalMenu(for:)` taps
`terminal-menu`, waits up to 5 s for `terminal-menu-catch-up`, and prints `terminal-menu` with the ⋯'s frame, label and
hittable state, the navigation bar's frame, and each item (identifier, label, enabled, frame) found by identifier and, only
if that is absent, by its label (`via` printed), and the owner glyph read from the open menu as the image whose identifier is
`faceid`, `touchid` or `lock` (§14 M5); `closeTerminalMenu()` dismisses it without a press. Re-pointed:

- `toCatchUp(for:)` (`:2679-2694`) presses the menu's Catch Me Up when the Terminal is the face (it pressed the icon);
- `end(step:after:)` (`:1437-1520`), `endOff` (`:1537-1550`) and `emitBar` (`:1297-1330`): on the Terminal, End is the
  menu's `terminal-menu-end` (the dialog, the first-use Face ID question, `end-confirming` and the probe's answer exactly as
  today); `emitBar`'s `row` is the ⋯'s frame, `enabled` the End item's, `glyphs` the glyph read in the open menu, `line` the
  Terminal's `session-end-line`; after the re-read, `endAfter` is read by opening the menu (End absent on an ended session),
  never from a closed menu, where it would pass vacuously; on Catch Me Up, End is its top bar's `session-end`, as today;
- `endTop()` (`end-top`, `:2617`), `terminalOpen()` (`terminal-open`, `:2742-2790`) and `catchUp()` (`catch-up`,
  `:2796-2822`) print the ⋯ and its items in place of the icon and End; `terminal-open`'s reading also prints the grid's
  frame and every drawn row (the fill's first frame);
- `screenRotate()` (`screen-rotate`, `:2399-2420`) reads the landscape chrome, turns upright BEFORE Back (no back button is
  drawn sideways), reads the upright chrome, presses Back, then on the list turns the device sideways, reads the window
  (upright) and turns back.

NEW steps: `fill-hold:<s>` (readings every 0.25 s for `s` seconds, the finger lifted, each the grid's frame and every drawn
row with its label and frame); `stream-hold:<s>` (the same after printing `stream-ready` and waiting for the probe's
`screen-<seq>` ack, which starts the stand-in's stream); `chrome` (the navigation bar, the ⋯, `terminal-status`, the tray's
presses, the tab bar with its buttons and badge, the grid and the window, from ONE snapshot); `landscape` and `portrait`
(turn the device, wait 3 s, print `chrome` plus SpringBoard's status bar as read); `landscape-type:<b64url>` (sideways: tap
the grid, read the keyboard and the key bar, type, Return, the hide key); `landscape-select:<n>` (sideways: long press live
row `n`, read `screen-copy`'s frame against the grid's, press it, print `landscape-copied` for the probe's pasteboard read);
`menu-sideways` (Catch Me Up through the menu, then the device sideways, the window read, upright again).

**THE STAND-IN** (`build/p3371/history-stand-in.mjs`): two tails, each one at a time as today: `--stream R:N` (after the
history, `N` more numbered lines at `R` a second, continuing the numbers) and `--alt-for S` (with `--alt`, leave the
alternate screen after `S` seconds, so the history comes back). Its own `--self-test` (or the probe's) pins both.

**THE HOSTILE DOOR** (`build/p316/hostile-door.mjs`): NEW arm `scrollback-fill-moved`: its FIRST `/v1/scrollback` answers
`moved` with the Mac's sentence and every later one honestly (`ends: 'drawn'`, `expect: []`, `fillOnce: true`).

**THE ARMS** (`build/p316/probe-p316.mjs`), in the `screen` group with its sessions (T.hist, 3,000 numbered lines and a
counter, today's), plus T.stream (`--lines 3000 --stream 4:40`), T.short (`--lines 5`, depth 0) and T.altback (`--lines 3000
--alt --alt-for 8`); each graded on the drawn labels and frames and on the probe's own `capture-pane -p`, never on the
phone's report; every grader shown red on its own break in `--grader-self-test`:

| Arm | Runtime | Holds |
| --- | --- | --- |
| PF1 | 26.3 and 18.3 | **The fill on open**, T.hist: at `terminal-open`'s first reading the live rows' last row ends at the grid's bottom (within half a point, the keyboard down) and live row 0 is not at the grid's top; through `fill-hold:3` that row never moves (half a point); once a page has landed the drawn history rows are contiguous indices ending at the live top, the topmost within one row of the grid's top, every label equal to tmux's line at its index; the door asked at most `⌈fill ÷ 100⌉` pages at open, each at most 128 rows and at least 250 ms apart by its own stamps |
| PF2 | 26.3 | **Following while the agent prints**, T.stream through `stream-hold:10`: in every reading the live rows' last row ends at the grid's bottom; in at least 95 percent of readings no reserved row lies between the drawn history and the live top (carried rows), the count printed; every drawn history row's label equals tmux's line at its index, in every reading; the door's check pages at most one a second |
| PF3 | 26.3 | **No history, as today**, T.short: live row 0 at the grid's top, no `screen-history-` element, no page asked in 3 s |
| PF4 | 26.3 | **A full-screen program, as today, then the fill back**, T.altback: while the program draws, live row 0 at the grid's top, no history, no page; after it leaves, the fill as PF1's |
| PF5 | 26.3 | **Back to live returns the fill**, from PS13's run: after `to-live` and after `scroll-key:esc`, the live bottom at the grid's bottom and history contiguous above it |
| PF6 | 26.3 and 18.3 | **The keyboard over the fill**: with it up, the live rows' last row ends within one row above the keyboard's top (the key bar's); after it goes, back at the grid's bottom; PS14's clauses unchanged |
| PF7 | 26.3 | **A turn over the fill**: upright, sideways, upright: following at the bottom in each; upright again the history contiguous and every label tmux's |
| PL1 | 26.3 and 18.3 | **Sideways, the terminal alone**: no navigation bar and no tab bar in the tree, no `terminal-status`, no `terminal-menu`, no tray press (on T.question), the grid's top at the window's top (within a point) and its frame inside the window less the side strips and the home indicator's strip (§14 M2, M4); live rows drawn; SpringBoard's status bar printed, not graded (§14 M8) |
| PL2 | 26.3 | **The keyboard sideways**: the keyboard and the key bar's keys hittable; a typed line and Return reach the recorder as exactly those bytes; the hide key puts it away; the grid's frame unchanged by the keyboard |
| PL3 | 26.3 | **Copy sideways**: a long press on live row 3 draws `screen-copy` inside the grid's frame, hittable; pressed, the device's pasteboard holds row 3's text |
| PL4 | 26.3 and 18.3 | **Upright again**: the navigation bar with the session's name, the ⋯, `terminal-status`, the tray (on T.question) and the tab bar with its three tabs, each frame equal within half a point to its frame before the turn |
| PL5 | 26.3 | **Every other page stays upright**: on the list and on Catch Me Up (through the menu), the device sideways, the window stays upright |
| PM1 | 26.3 and 18.3 | **The ⋯**: upright on the Terminal the bar's trailing half holds `terminal-menu`, labelled `More`, hittable; no `session-open-catch-up` and no `session-end` on the Terminal; opened, exactly two items in order, `Catch Me Up` and `End session…`, End enabled on a session the Mac offers End for with an owner check iOS can ask, its glyph the one `kind()` picks; Catch Me Up pushes `screen-catch-up`, Back returns to the Terminal |
| PP1 | 26.3, with `P3373_PARENT_IOS` (`dfa878b5`'s `ios/`, build 7) | **The parent's top, his item 1**: T.hist opens with live row 0 at the grid's top and no history drawn (printed and graded as the parent's look, the arm that proves PF1 can fail) |
| PP2 | 26.3 and 18.3, the parent | **The parent's landscape, his item 2**: the navigation bar and the tab bar still in the tree sideways; the grid's height printed beside HEAD's (§14 M1, M3) |
| PP3 | 26.3, the parent | **The parent's top right, his item 3**: `session-open-catch-up` and `session-end` in the bar, no `terminal-menu` |

**RE-POINTED, and RUN, not assumed**: PS1 (337's "End top right" becomes "the ⋯ alone top right, no End bar"), PS3 (the turn:
the landscape chrome read and Back upright; its "the page came back upright" becomes PL5's list clause), PS10 (the ⋯ and its
two items, Copy beside the ⋯ while selecting), PS15 (Catch Me Up through the menu), E1 (the ⋯ in the bar's trailing half; the
menu's two items, End enabled; Face ID's mark read in the open menu; End absent from the menu after the session ended), E2,
E5, E6 (End through the menu), E3 (the menu's End drawn off with the passcode line, or on with the lock), and PSH's new
`scrollback-fill-moved` (the fill asks one page at open, draws no line and no history row while following, asks nothing more
in 5 s over a still screen, and a drag then pages honestly). Every other grader keeps its clauses. The verifier runs
`P316_ARMS=screen,end` at HEAD on iOS 26.3 and those groups' floor arms on 18.3, and `P3373_PARENT_IOS` for PP1 to PP3.

`probe-p316.mjs --grader-self-test` gains the cases, each clause shown red on its own break.

### 7.4 His checklist — `build/p337/CHECKLIST.md` (builder **probes**)

Three rows, in his words, worded for the next TestFlight build without a number (the main session writes the build at
landing):

13. **Open full.** Upright, open a session that has printed a lot. **You should see** its live rows at the bottom and earlier
    output above them up to the top, with no empty space below.
14. **Sideways.** Turn the phone. **You should see** only the terminal: no bar at the top, none at the bottom. Turn it back:
    everything returns.
15. **The ⋯.** Upright, press the ⋯ at the top right. **You should see** Catch Me Up and End session…; End session… asks for
    Face ID.

**Not covered yet**: how the fill feels through Funnel; a session wider than 200 columns (more than one page to fill); an
iPad.

### 7.5 What the verifier must produce

ONE app run (`probe:p316`, `P316_ARMS=screen,end`) on iOS 26.3 and the 18.3 floor, upright and sideways, beside the parent
build 7 (`P3373_PARENT_IOS`), every PF, PL, PM and PP arm above and every re-pointed arm, each with its numbers; `test:ios`
Debug and Release on both runtimes; the grader self-tests; and ONE independent method (§7.6). Its verdict is typed
(`verdict`, `evidence`, `problems`) and names the step it did that the builders did not.

### 7.6 The independent method: the attack (and the parent, which is mandatory)

The verifier attacks the fill rather than confirming it, live, each case asserted on the drawn labels against its own
`capture-pane -p` and on the door's page log, never on the phone's report:

1. a trim at a history limit of 1,000 while following (the fill dropped and refilled, no line, no wrong row);
2. the active pane switched at the Mac while following (another space: dropped and refilled);
3. the Mac's window resized narrower while following (another width);
4. a program entering and leaving the alternate screen while following;
5. a flood (more lines in one picture than the screen holds) while following;
6. a selection begun in the fill and held while output scrolls and checks land (Copy only over drawn rows; the copied text
   tmux's);
7. the keyboard raised while the first page is in flight, and a turn of the phone while it is in flight;
8. the hostile door's `scrollback-fill-moved`, `scrollback-404` and `scrollback-never` while following;
9. the redraw case D5 names: a stand-in that rewrites its top row and then scrolls, so the carried row is wrong, and the check
   page must replace it within a second and a half of the line scrolling off (the residual §13 item 1 states, measured);
10. the menu: End session… pressed with Face ID unenrolled, with no passcode, on an unreachable session (a session on a
    stopped loopback machine), and twice quickly.

**The parent measurement** (mandatory, he reported it): PP1 to PP3 on build 7 beside PF1, PL1 and PM1 at HEAD.

### 7.7 No regression against today

| Scenario | Today (build 7, `dfa878b5`) | At HEAD | Verdict |
| --- | --- | --- | --- |
| Opening a session with history, upright | live rows at the top, empty space below, no page asked | live rows at the bottom, history above, one page asked | his ask (item 1) |
| Opening a session with no history or a full-screen program | live rows at the top | the same | same (PF3, PF4) |
| Watching an agent print, upright | live rows at the top while shorter than the view; nothing above | the live bottom held, history sliding up above it, carried at once; at most one check page a second | better; the Mac pays one page read a second at most while lines scroll (§13 item 2) |
| Scrolling back | 337.1's paging | the same, entered by the first drag off the bottom | same (PS13) |
| Back to live | live rows at the top | live rows at the bottom, the fill kept or refilled | his ask |
| A line under the terminal (held while selecting, not answering, keys, cannot type) | just above the keyboard, over the empty space below the live rows | over the terminal's top, under the status line | same words; no longer over the prompt (D13) |
| The keyboard rising over a short live screen | the rows stay at the view's top, the keyboard over the empty pad | the live bottom slides up to sit just above the keyboard, history above it | same reach: the prompt is in view either way (PF6, PS14; §13 item 9) |
| Sideways | 230 (26.3) or 275 (18.3) points of terminal under the bar and the status line, above the tabs | 382 or 381 points, the terminal alone | his ask (item 2), measured (§14) |
| Copy sideways | in the bar | at the terminal's bottom right | same reach (PL3) |
| A numbered question sideways | buttons under the terminal | the terminal alone; the digit typed, or the phone turned upright | his ask ("only the terminal"); the buttons are back upright |
| Catch Me Up from the Terminal | the speech bubble, one tap | the ⋯ then Catch Me Up, two taps | his ask (item 3) |
| End from the Terminal | End, then the Mac's confirmation, then Face ID | the ⋯, End session…, the confirmation, Face ID | his ask; one tap more; the owner check unchanged (E1 to E6) |
| End while it runs | `Ending…` in the bar, a progress mark while Face ID is up | a progress mark beside the ⋯ throughout, `Ending…` in the menu | same signal (D24) |
| End on Catch Me Up, End these, an ended session | as 337.1 | the same | same |
| Back from the Terminal sideways | the back button | turn upright first | his ask (item 2 drops the back button) |
| The Mac | — | unchanged; one page read at open, at most one a second while watching a session that prints | §13 item 2 |

---

## 8. The CHANGELOG item (the integrator)

Under `## Unreleased`, `### Changed`; the follow-up docs commit adds the link:

- `- On the iPhone, a session's terminal now opens full, its live rows at the bottom with what it printed before filling the screen above them, and turned sideways it shows the terminal alone with no bars above or below it; Catch Me Up and End session are now in a ⋯ menu at the top right, and End still asks for Face ID, Touch ID or your passcode. To reach that menu, the tabs or the back button, turn the phone upright again`

One item, two sentences, no numbers, no file names. 337.1's item stays as it is.

---

## 9. CLAUDE.md (the integrator)

Two rows gain one sentence each, in the house style:

- **The `ios/**` row** (`conformance:ios`): "**Phase 337.3's terminal that fills the phone**: (aw) the Terminal opens filled,
  following holding history above the live rows with its view at the live bottom (the pad against every row laid out, the
  fill reserved in whole pages inside the first layout pass, rows carried from the last steady picture and checked at most
  once a second, dropped on the alternate screen, a trim, another width or pane, a refusal not asked again until the picture
  changes); (ax) sideways the terminal alone, through `TerminalChrome`, one `.toolbarVisibility(…, for: .navigationBar,
  .tabBar)` and `.statusBarHidden` on ScreenPage and nowhere else, with Copy at the bottom right; (ay) one ⋯, a native `Menu`
  of Catch Me Up then End session…, the confirmation one modifier shared with Catch Me Up's End; (b) the tab bar hidden only
  there; (ac) two End presses, each `.disabled(row == .off)`; (aq), (ar), (as), (at) widened; `ablation:p316` has N arms."
- **The `probe:p316` row**: "Since Phase 337.3 the `screen` group adds PF1 to PF7 (the fill: open, printing, no history, a
  full-screen program, back to live, the keyboard, a turn), PL1 to PL5 (sideways: the terminal alone, the keyboard, Copy,
  upright again, every other page upright) and PM1 (the ⋯), with PP1 to PP3 on the parent build (`P3373_PARENT_IOS`), and
  every step that pressed the Catch Me Up icon or End on the Terminal presses the ⋯ menu's item."

---

## 10. Builders, disjoint files, and who owns what is shared

Five builders in `/private/tmp/wt-p3373` at once, on `dfa878b5`, each coding against the names §5 pins. No file is in two
lists. Builders run `npm run -s typecheck` where a JavaScript file moves, `node build/conformance-ios.mjs` (the gates builder),
and `xcodebuild build-for-testing` with `-derivedDataPath /private/tmp/tortie-ops/p3373/dd-<role>` (deleted before returning)
where Swift moves; they launch no Electron, boot no Simulator, run no probe and no whole `npm test`; they never commit, stage
or stash.

| Builder | Owns |
| --- | --- |
| **history** (the fill's model) | `ios/Tortie/Screens/ScreenScrollback.swift`; tests `ios/TortieTests/ScrollbackModelTests.swift`, NEW `ios/TortieTests/TerminalFillTests.swift` |
| **terminal** (the scroll view and the page) | `ios/Tortie/Screens/ScreenScroller.swift`, `ios/Tortie/Screens/Screen.swift`; tests `ios/TortieTests/ScreenScrollerTests.swift`, NEW `ios/TortieTests/TerminalChromeTests.swift`, and `ScreenCoverTests.swift`, `ScreenSelectionTests.swift`, `ScreenGridCostTests.swift`, `ScreenKeysTests.swift` only where the page's change moves them |
| **pages** (the ⋯, End's menu press, words, identifiers, the project) | `ios/Tortie/Screens/SessionScreen.swift`, `ios/Tortie/Screens/EndBar.swift`, `ios/Tortie/Style/Copy.swift`, `ios/Tortie/Screens/Identifiers.swift`, `ios/Tortie.xcodeproj/project.pbxproj` (every new file of every builder referenced); tests NEW `ios/TortieTests/TerminalMenuTests.swift`, `EndTopTests.swift`, `TerminalRouteTests.swift`, `CopyTests.swift`, `EndTests.swift`, `EndWordsTests.swift` where `menuLabel` and the shared dialog move them |
| **gates** (the phone gates, their attacks, the words gate, the mocks) | `build/conformance-ios.mjs`, `build/p316/ablation-ios.mjs`, `build/p311/copy-drift.mjs`; `docs/design/phone/{Session,Screen,index,End}.html`, NEW `docs/design/phone/{TerminalMenu,Landscape}.html` |
| **probes** (the app run) | `ios/TortieUITests/P316DriveUITests.swift`, `build/p316/probe-p316.mjs`, `build/p316/hostile-door.mjs`, `build/p3371/history-stand-in.mjs`, `build/p337/CHECKLIST.md` |

**Shared names and their one owner.** `ScrollbackLayout`'s and `ScrollbackModel`'s new members (`ScrollbackRow.carried`,
`checked`, `lastSteady`, `refusedAt`, `fillOff`, `reserve(visibleTop:fill:)`, `scroll()`, `ScrollbackAsk.checks`,
`checkGap`, `fill(rows:)`, `viewed(top:bottom:atBottom:)`) are **history**'s and **terminal** codes against them;
`TerminalChrome` is **terminal**'s; `EndMenuItem`, `EndConfirmation`/`endConfirmation(`, `EndBarDrawing.menuLabel`,
`TerminalMenu`, `TerminalMenuControl`, `Copy.more` and the four identifiers are **pages**'s, who adds them first so the others
code against them; the drive's step names (§7.3) and the hostile arm's name are pinned here, so **probes** writes them and
**gates**' rule (t) reads `scrollback-fill-moved`; the words each mock draws (§5.7) are pinned here, so **gates** draws them and
**pages**' `CopyTests` reads them. **`CHANGELOG.md` and `CLAUDE.md` are the integrator's**, and `docs/audits/contract-baseline.txt`
must not move; this file is the spec's, and the integrator appends "§As built — 337.3"; **`docs/BACKLOG.md` belongs to the main
session**.

**The integrator** checks the base first (§4); reconciles the pinned names across the five; runs §7.1 whole except what needs
the lock or launches the app; scans the delta for control, bidi, zero-width and BOM characters and for duplicated blocks of ten
lines or more (the dialog moved, not copied, is the one to look for); writes the CHANGELOG item and the CLAUDE.md sentences;
appends "§As built — 337.3".

**The verifier** (one, under the lock, phone slot first): §7.5 and §7.6, typed, naming its independent step.

---

## 11. What this sends to other phases and the main session

- **333.1**: lands first; 337.3 replays on top of it (§4). Its build 8 has none of this.
- **337.2** (the probe repairs): never beside this phase; both edit the drive and the probe. Whichever lands second replays its
  probe edits onto the other's.
- **318.1** (the message box under the terminal): the Terminal it will sit under now holds history above the live rows and
  draws its lines at its top; the box belongs under the live bottom.
- **333.3** (See a Sample): its reader answers `scrollback` with `moved` (337.1 §11), which in following now drops the fill
  and asks again only when the picture changes (D8): a sample's still screen asks one page and then nothing.
- **The TestFlight build**: build 9 at this phase's landing (the main session's).

---

## 12. What is NOT in this phase

**The refusals that stand.**

- **No door route and no Mac change**: nothing under `src/` moves, no contract line, no hashed field, no Allow asked again.
- **No build number** here (the main session's at landing).
- **No change to End's owner check**, its runner, its confirmation's words, its one write, End these, or Catch Me Up's End.
- **No paste**, and no change to what Copy copies (only where Copy sits sideways).
- **No change to `scrolled`**: its paging, its overlap, its depth, its eviction, its selection, its line, its arrow; and no
  change to the page floor, the queue, the caps or the nonce budget.
- **No landscape for any other page** (rule (an) stands), and no landscape for Catch Me Up.
- **No new gesture**: nothing to show the bars sideways, no swipe back of the app's own.
- **No drawing under the Dynamic Island or the home indicator**, and no hiding of the home indicator.
- **No change to the terminal's size on the Mac**, ever (his 337 ruling).
- **No iPad**, **no release**, **no upload** (uploading is his).
- **No probe repair 337.2 owns** (PS13's counter, the eight PSH arms' readings, S1, PS11, T1, MD1, E4's select): this phase
  re-points only the steps the menu, the fill and the turn move.

**The designs set aside.** Reserving the band between the fill and the live rows and letting pages fill it (337.1's rule
while scrolled): in following it is in view after every picture while an agent prints, a blank strip flickering above the
prompt. Holding a picture until the page for its new history lands: the live rows would lag the Mac. Collapsing the gap (the
live rows drawn under the last held row until the page lands): rows would no longer sit at their indices, which the selection,
Copy and the overlap check rest on. Drawing the lines at the bottom with room made below the live rows: a line appearing at a
long press would move the rows under the finger (337's fix round). Presenting the Terminal full screen in its own cover
sideways: a second scroll view and its state lost on every turn. A UIKit hook on the navigation controller to hide the bars:
SwiftUI's own `toolbarVisibility` measured right on both runtimes (§14). `ellipsis.circle` on iOS 26 (a circle in the bar's own
glass circle). Keeping the icon and End beside the ⋯.

---

## 13. Open concerns handed to the verifier

1. **A carried row can be wrong for up to a check's interval.** When a program rewrites a row and the row then scrolls off
   between two pictures, the carried row shows what the screen showed, not what tmux keeps; the check page replaces it
   within about `checkGap` and a round trip. Nothing is typed and nothing kept. Attack 9 measures it.
2. **The Mac's cost while watching.** Today a phone following a session asks no page; at HEAD it asks one page at open and at
   most one check page a second while lines scroll (on another machine, one exec a second beside the poll's 2.5). Within
   337.1's designed ceiling (D14, D29), but it is new for the common case and is printed by PF2.
3. **The band after a flood, a return or a long selection.** More lines in one picture than the screen holds leave lines no
   picture showed. *The contract, his rule as the fix round of 2026-10-08 reads it: a page the picture outran is carried or read
   again, never dropped to blank, and no case is worse than build 7.* Nothing drawn is taken away while following: what the
   last picture showed is carried, the lines no picture showed are holes under the live top, and ONE page from the live top is
   asked at once, so the ground above the prompt is only those lines and lasts about a round trip (0.10 to 0.60 s measured
   over the shipping model, here and on another machine). When such pictures come again and again (two within `outrunGap`,
   3 s), no page is asked until 3 s after the last, because one would be scrolled away before it filled anything; carrying
   goes on while the pictures fall short of the view, so the band keeps every row a picture showed with holes beside them;
   and once one of them passes the view, the rows above the prompt go to the ground and stay there until 3 s after the last,
   then one page fills the view: never a strip that flashes, and nothing asked of the Mac that the output would throw away.
   The build the verify read
   dropped at every such picture and refilled a second later, which blanked the band for 1.15 to 1.55 s on every return and
   flashed strips 9 to 98 times a minute near a screen a picture (§Rebuilt after the reboot, its fix round).
4. **SwiftUI's bars on a future iOS.** `toolbarVisibility` toggled by the size class was measured right on iOS 26.3 and
   18.3 (§14); a later iOS that leaves the tab bar's room behind would show as PL1 or PL4 red.
5. **The status bar sideways is not readable by XCUITest** (§14 M8): SpringBoard reports its element in every case. The grid's
   top at the window's top is the reading.
6. **The first frame before the first page** draws the ground above the live rows for a round trip (D3); through Funnel that is
   unmeasured here.
7. **A session wider than about 200 columns** fills with more than one page, 0.25 s apart, top rows last.
8. **Two taps to Catch Me Up** and two to End from the Terminal, by his design; Catch Me Up's own End is still one.
9. **The rows slide with the keyboard and the tray now.** Following holds the live bottom at the view's bottom, so when the
   keyboard rises the rows slide up by its height (the prompt stays above it), and when the question's tray appears or goes,
   the terminal's frame changes height and the rows above the live bottom slide by the tray's height. In 337.1 a live screen
   shorter than the view stayed at the view's top through both. PS14 compares row 0 before and after the keyboard, which
   still holds; PF6 holds the live bottom above the keyboard. Nothing he reads in history moves while `scrolled`.

---

## 14. What the spec step measured, how, and the numbers

Scripts under `/private/tmp/tortie-ops/p3373/spec/` (`patch.mjs`, the scratch patches; `bench.mjs`, the runner), outputs under
`/private/tmp/tortie-ops/p3373/spec/out/` (`bench-b263h0.json`, `bench-b263h1.json`, `bench-b183h0.json`, `bench-b183h1.json`,
`summary.json`, `bench.log`). The worktree was never edited by the bench: `patch.mjs` patched a `cp -Rc` copy of `ios/`, deleted
afterwards. The scratch app: `ScreenPage` reading `verticalSizeClass` and, behind `-Bench3373Hide`, hiding the header,
`.toolbarVisibility(.hidden, for: .navigationBar, .tabBar)` and `.statusBarHidden(true)` sideways; `TerminalPage`'s trailing
items one `Menu` (`ellipsis.circle`, `More`, `terminal-menu`) of `Catch Me Up` (`text.bubble`, `terminal-menu-catch-up`) and
`End session…` (`faceid`, destructive, `terminal-menu-end`), its `confirmationDialog` attached to the `Menu`; the drive's one
new step `bench-3373` (the chrome upright, sideways and upright again; the menu opened and read; End pressed; Cancel; Catch Me
Up through the menu). The door: `build/p316/hostile-door.mjs serve --arm honest` (40 rows, 120 columns, depth 600), its own
process, ended in a `finally`.

| # | Command | Exit | What it measured |
| --- | --- | --- | --- |
| M0 | `node patch.mjs`; under the lock (`electron.lock2`, 23:10:58 to 23:18:19), `node bench.mjs` | 0, 0 | build-for-testing Debug, Simulator SDK, into `dd-spec`: 31.9 s; iOS 26.3.1 device booted in 39.2 s, iOS 18.3.1 in 24.2 s; four drives of 107.7, 74.5, 76.6 and 61.7 s; 7 min 8 s in all; 0 devices named `p316-` afterwards (`xcrun simctl list devices \| grep -c p316-`); history `734900 1791405989` and `23166 1790702242` before and after |
| M1 | iOS 26.3, as today | 0 | upright: the bar `[0, 62, 402, 54]`, the grid `[0, 146, 402, 645]`, 40 rows of 6.67 pt from y 146 to 412.7 (378 pt of pad below), the tab bar `[0, 791, 402, 83]`; SIDEWAYS: the bar `[0, 24, 874, 54]`, the tab bar `[0, 338, 874, 64]`, the grid `[62, 108, 750, 230]`, rows of 11.67 pt (19.7 visible); upright again every frame the same |
| M2 | iOS 26.3, hidden sideways | 0 | sideways: the navigation bar, the tab bar, the ⋯ and `terminal-status` absent from the tree; the grid `[62, 0, 750, 382]` (32.7 rows); upright again the bar `[0, 62, 402, 54]`, the ⋯ `[346, 66, 36, 36]`, the grid `[0, 146, 402, 645]`, the tab bar `[0, 791, 402, 83]` with `Needs input`, `Sessions`, `Settings`: each exactly as before the turn |
| M3 | iOS 18.3, as today | 0 | upright: the bar `[0, 56.3, 402, 44]`, the grid `[0, 130.3, 402, 660.7]`, the tab bar `[0, 791, 402, 83]`; sideways: the bar `[0, 0, 874, 44]`, the tab bar `[0, 349, 874, 53]`, the grid `[62, 74, 750, 275]` (23.6 rows); upright again the same |
| M4 | iOS 18.3, hidden sideways | 0 | sideways: the bars, the ⋯ and the status line absent; the grid `[62, 0, 750, 381]` (32.7 rows); upright again every frame as before |
| M5 | both runtimes, the menu | 0 | `terminal-menu` labelled `More` (two elements, the menu and its button: `[346, 66, 36, 36]` on 26.3, `[352, 61.3, 34, 34]` on 18.3, inside the bar's trailing half); opened, its items are XCUITest BUTTONS carrying the SwiftUI identifiers: `terminal-menu-catch-up` `Catch Me Up` and `terminal-menu-end` `End session…`, enabled, at `[144, 72, 250, 42]` and `[144, 114, 250, 42]` (26.3), `[144, 101, 250, 43.7]` and `[144, 145, 250, 43.7]` (18.3); each item's image an XCUITest image whose identifier is its SF Symbol (`faceid` labelled `face id`, `text.bubble` labelled `comment lines`); `app.menuItems` empty |
| M6 | both runtimes, the dialog | 0 | `End session…` pressed: the `confirmationDialog` attached to the `Menu` presented as a SHEET with its title, message and press (`Bench title`, `Bench body`, `Bench end`); Cancel dismissed it |
| M7 | both runtimes, Catch Me Up | 0 | iOS 18.3: the menu opened again and its Catch Me Up pushed `screen-catch-up` (both drives); iOS 26.3: the second open, one second after the dialog's Cancel, found no item, so that push is NOT READ here (the dialog was still leaving; the probe waits for the sheet to go) |
| M8 | both runtimes, the status bar | 0 | SpringBoard's status bar element read `[0, 0, 402, 54]` upright and `[0, 0, 54, 402]` sideways, with and without `.statusBarHidden(true)`: XCUITest cannot say whether it is shown |
| M9 | the pages | 0 | the door was asked no `/v1/scrollback` in any drive: today's following asks none at open, which the fill changes to one |

**Not measured here, each named where it is owed**: the fill itself (no builder had written it; PF1 to PF7), carrying's
correctness under a redraw (attack 9), the Mac's page cost while watching (PF2), Funnel.

---

## 15. Questions for him

None blocks the build. Two are his when he next looks:

1. **The ⋯ symbol**: `ellipsis` on iOS 26 (the bar draws the circle) and `ellipsis.circle` on iOS 18; one symbol everywhere is
   a one-line change.
2. **A numbered question sideways** draws the terminal alone, as he asked; the buttons return upright. If he would rather keep
   the buttons sideways, that is one clause of `TerminalChrome.tray`.

---

## §As built — 337.3

The integrator appended this section on 2026-10-08 with a shell command, and the reboot at about 11:00 that day took it with
`/private/tmp`. It is written again here from the integrator's and the five builders' retained reports
(`/private/tmp/tortie-ops/p3373/retained.json`), and says only what those reports say; what the repair after the reboot
changed is the next section's.

**The base and the delta.** Built on `dfa878b5`; the repair worktree sits on `35a9a390` (four docs commits later, none under
`ios/`, `src/` or the phone's gates). Nothing under `src/`, `docs/audits/contract-baseline.txt` or `src/main/menu.ts` moved;
`CURRENT_PROJECT_VERSION = 7` in all six configurations; `ios/Tortie.xcodeproj/project.pbxproj` is unchanged on purpose,
because the targets use synchronized folders and the three new test files join `TortieTests` by being there.

**history** (`ScreenScrollback.swift`, `ScrollbackModelTests.swift`, `TerminalFillTests.swift`), beyond §5.1's letter:
1. A page the Mac read after the ask but before the newest picture (its depth at least the one asked, below `depthSeen`) is
   asked again (`.ignored`), never refused, in both modes; in `scrolled` this also removes a false "Earlier lines changed".
2. A key sent while following moves nothing (`ScrollbackModel.follow()` acts only from `scrolled`), so typing never cancels the
   fill's page.
3. `stop()` (a 404) turns the fill off in both modes.
4. A joined page lifts `refusedAt` and `fillOff`.
5. `follow()` keeps nothing while a refusal holds or the fill is off, so rows a pull reserved never stay the ground.
6. With nothing held, `lo`, `hi` and `checked` follow the live top, so the first page is the rows on screen.
7. A page that would leave a gap beside the held rows is `.ignored` and asked again.
8. A reserved page never waits out a check's second; a page from the checked rows that brings only carried rows is no check
   while reserved rows are in reach.
9. Carrying is capped at the picture's rows and iterates `rows.prefix(k)`.
10. No eviction in `model.picture()`.

**terminal** (`ScreenScroller.swift`, `Screen.swift`, `ScreenScrollerTests.swift`, `TerminalChromeTests.swift`, two lines in
`ScreenGridCostTests.swift`): following's pin is "the pass began at the bottom" (`wasPinned`), not 337.1's "pinned and the
content grew", unless the finger is down or the view is mid-bounce, because a full-screen program's drop pushed the offset to
about −491 pt; a pinch's or a double tap's focal row wins over the pin; the `top` lines are drawn only while a picture is
shown; `bottom` is `.frame(maxWidth: .infinity, alignment: .trailing)`, so the arrow and Copy sit bottom right as both specs
say (337.1's code centred them when no line was shown); the sideways Copy is a capsule on `Tokens.bgRaised`, at least 44 pt.

**pages** (`SessionScreen.swift`, `EndBar.swift`, `Copy.swift`, `Identifiers.swift`, `TortieApp.swift` comments, the tests):
`endConfirmation` keeps its six pinned labels with `model` and `drawing` optional; the destructive press is drawn only over
`offer.isOffered`; `TerminalMenuControl` has three pure helpers (`drawing`, `endRow`, `progressMark`) the tests read; the menu's
End keeps `EndTopControl`'s `guard drawing.confirm != nil`; `EndMenuItem` follows `EndTopControl`, so the earlier first-match
ablation arms still hit the top bar's End.

**gates** (`conformance-ios.mjs`, `ablation-ios.mjs`, `copy-drift.mjs`, the mocks): (b) keeps the three tab roots' own
navigation-bar hides (`NAV_BAR_ROOTS`) and reads any non-literal visibility as a hide; (as4) counts a comparison only in a guard
whose else refuses; (ac) puts `SessionScreen.swift` on `OWNER_CHECK_ABSENT`; (aw) reads the carry clauses only in the function
that marks rows carried, and holds "never below index 0"; (as14) accepts the keep written either way before the drop;
phonecopy owns `More` and `End session…`, reads the mocks' history rows from
`src/main/activity/__tests__/fixtures/claude-post-answer.txt`, checks which words each Terminal mock may draw, and its
owned-rule floor went 89 to 91; the mocks draw all 40 live rows; index.html's count reads twenty.

**probes** (the drive, the probe, the hostile door, the stand-in, the checklist): the Mac's door stamps no page, so PF1's page
limits are graded at the hostile door's honest arm (PF1 (pages)) and PF2 does not count the Mac's checks; PP1 to PP3 drive the
parent app with THIS checkout's UI test; two extra sessions, T3.question and T3.rec; PL3 presses row `rows − 5`; the stream
starts by one byte typed at `stream-ready` and the full-screen program at `screen-wait:altback`; PS1 and PS10 hand off to new
graders when the line carries `menu`; PF5 and PF6 read UNREADABLE when the key bar is not read; the menu waits for a leaving
sheet; `scrollback-fill-moved` runs in its own block, out of 337.1's PSH loop.

**The integrator** pulled three duplicated blocks into one (`modifierChainAt` in the gate; `scriptedModel` and `settleModel`
in `ScrollbackModelTests`; one `Latch` shared with `TerminalMenuTests`), wrote the §8 CHANGELOG item and the §9 CLAUDE.md
sentences, and ran the battery: typecheck, conformance:ios 48 rules, build, `npm test` (1,116 files, 20,657 tests), package,
phonecopy and its self-test, vectors, the probe's grader self-test (1,132 cases), the hostile door (90 arms), the six
unedited conformances, `ablation:p316` 444 of 444 red twice, `xcodebuild build-for-testing` Debug and Release and an unsigned
archive read by `test-ios.mjs --read-app` (`CFBundleVersion` 7). `test:ios` and the app run were left to the verifier, and
disk below the 8 GB floor kept the verifier and the reverifier from them (their verdicts: needs_work).

---

## §Rebuilt after the reboot

**What was lost.** The Mac rebooted at about 11:00 on 2026-10-08 and `/private/tmp` was wiped. The worktree was rebuilt on
`35a9a390` by replaying every Write and Edit the phase's agents made; two Edits found no anchor (REPLAY-GAPS.md), and every
file or block an agent wrote by shell command was missing: `ablation-ios.mjs`'s 52 new arms, the probe's fill self-test,
**the probe's whole run wiring for 337.3** (no PF, PL, PM, PP or PSH-fill arm was ever called, T3's sessions were never made,
E1 read no menu line, PS3, PS10 and PS15 were handed none of their 337.3 fields, and `P3373_PARENT_IOS` was read nowhere),
`TerminalMenuTests`' rename of `MenuLatch` to the shared `Latch` (the test target did not compile), parts of `copy-drift.mjs`,
the mocks, the checklist, and this spec's §As built. A first repairer, on another model, restored the arms, the mocks, the
self-test and the checklist, wrote the test:ios suite list and the two Swift fixes below, and was stopped at 12:02; a second
repairer checked its work and finished the rest.

**The environment.** After the reboot the iOS 26.3 Simulator runtime was gone (its MobileAsset directory changed at 11:25;
`xcrun simctl runtime list` lists iOS 18.3.1 and watchOS 26.2 only) and Xcode 26.3 reads the iOS 26.2 platform as not
installed, so `xcodebuild` offers NO iOS destination, not even an 18.3 device. Installing it is the operator's call, and
nothing was installed. `test:ios` therefore read: iOS 26.3 exit 2, "this Mac has no iOS 26.3 runtime. Nothing was created";
iOS 18.3 exit 1, `build-for-testing (Debug) exited 70`, "iOS 26.2 is not installed"; 0 devices named `p316-`. The app run
(`probe:p316`) cannot run either. In their place, the compile and the tests that need no host app:
- **The iOS Simulator SDK typecheck** (`swiftc -typecheck`, `arm64-apple-ios18.1-simulator`, Swift 5 mode, complete
  concurrency checking, Debug with `DEBUG` and Release with `-O`): the app, all 64 unit test files and the UI test, no error,
  no warning.
- **The unit tests on Mac Catalyst** (`arm64-apple-ios18.1-macabi`, the shipping app sources as a library module with
  `-enable-testing`, every test file compiled into one runner that runs only an allowlist of classes touching no keychain,
  network, owner check or host app): TerminalFillTests 40, ScrollbackModelTests 24, TerminalChromeTests 6, TerminalMenuTests
  15, TerminalRouteTests 18, EndTopTests 6, EndTests 23, EndWordsTests 3, CopyTests 10, TokensTests 7, StatusLineTests 10,
  ScrollbackDecodeTests 10, ScreenKeysTests 13, ScreenCoverTests 3, CatchUpPageTests 9, ScreenSelectionTests 9: 206 run, 0
  failures. **ScreenScrollerTests (23) and ScreenGridCostTests could not run**: a UIWindow on Catalyst needs NSApplication, and
  a window on his Mac was not opened. They are owed to `test:ios` once the platform is back, with every XCTest on a Simulator.

**The verdict's problems, fixed** (the fix round never ran: a Bedrock 503):
1. **The band** (the reverify's major). Following, a picture whose new lines carrying could not take (more lines than the last
   steady picture's rows, or a gap under the live top) now DROPS what following holds, with no line, and the next layout
   pass fills again from the live top in ONE page; tried only after the carry (`if mode == .following, offer.depth > live`
   after `carry(`), counted in `outruns`. This is the reverify's scratch variant B, measured there to close every flood,
   return and selection case within 0.81 s at no more than 1.05 pages a second. Scrolled keeps 337.1's walk (D14). At the
   measured geometry (57 rows above the live rows) whatever was held before the drop was out of view for every gap of 57
   rows or more; under that, the top of the view's history is the ground for one round trip, never a wrong row.
2. **The outrun's hold** (the reverify's two rows marked worse than today: the Mac read four pages a second, and on another
   machine the whole history blinked 2.5 times a second, under output faster than a screen a picture). Neither variant changed
   that; the repair adds `ScrollbackModel.outrunGap = 1 s`: following, no page is asked until a second after the last picture
   that outran carrying. Output faster than a screen a picture now asks the Mac for nothing and draws nothing above the live
   rows that the next picture would take away, as build 7 drew nothing there; once a picture does not outrun, its lines are
   carried at once and the one page that fills the view goes a second after the last outrun. The price is that a return to
   the Terminal while an agent prints fills about half a second later than variant B did (a second plus a round trip).
3. **The blink** (minor). A page raises `depthSeen` only while scrolled, so a picture read before a deeper page, landing
   after it on the watcher's connection, is no trim and drops nothing (29 of 29 blinks measured had that one cause).
4. **The suite list** (nit). `test-ios.mjs` exports `P3373_SUITES` (TerminalFillTests, TerminalChromeTests,
   TerminalMenuTests) in the never-ran union, with two self-test checks.

**Their proof.** (aw) gained clause (aw9) for all three Swift fixes (the drop after the carry and counted, `outrunGap` at
least 1 s and waited only while following, the model noting the outrun, a page raising `depthSeen` only under `if mode ==
.scrolled`), each proved on fixtures of its own first (ten new expectations), and `ablation:p316` gained aw17 to aw23, each red
on (aw): 459 arms. Behaviourally, five ablations of a scratch copy of the app (the drop, the hold, the noting, the count, the
blink) each turned TerminalFillTests or ScrollbackModelTests red under Catalyst. New tests: the outrun test (two seconds of 60
lines a picture ask nothing; the page goes a second after the last outrun), the outrun count in the flood, D7 and scrolled
tests, and four tests whose old expectations were the walk or the old nothing-held path (two rewritten to reserved rows the
view grows into, the gap test moved to `scrolled`, the first-page test given the layout pass that follows a drop).

**The probe's run wiring, written again from §7.3 and the probe's own header**: T3's sessions; the fill drive on 26.3 (PF2,
PF3, PF4, PF7, PF8, PL1 to PL5), the floor (PL1, PL4), PF1, PM1, PF5 and PF6 on 337.1's two Terminal drives (`fill-hold:3`
after the open, and Catch Me Up from the ⋯ on the floor), PF1 (pages) and PSH `scrollback-fill-moved` at the hostile door
(out of 337.1's PSH loop), PP1 to PP3 with `P3373_PARENT_IOS`; E1 and E10 read the open menu and the menu after End; PS3
reads the landscape and upright chrome, PS10 the menu, PS15 the `via`; PL5 reads PS3's screen-rotate line. The drive's
`chrome` line now carries the bar's words (PL4 holds the name among them). **New arm PF8** (the reverify asked for it): back
from Catch Me Up after 5 s while T3.away prints 20 lines a second (`return-hold:5:6`), the view filled again within 3 s of the
return and kept filled in 90 percent of the readings. The run's pure readers are module-level and self-tested on
drive-shaped lines. A clause ablation of the probe found 36 of 150 grader clauses that no self-test case turned and every
clause of `gradePs10Menu` unproved; cases were added until each of the 161 clauses of the 19 phase 337.3 graders, and each of
the 19 in `gradePs1Menu`, `gradePs10Menu`, `gradeE1` and `gradePs3`, is red on its own break (three of `gradePs15` were green at
the base too, 337.1's, and are left). None of this wiring has run against a Simulator.

**Gates run** (history `stat` unmoved by every one of them): typecheck 0; build 0 (conformance:ios 48 rules, electron floor
170 of 170, simulator floor 2 of 2, background, knownhosts, checks, harnessprobes, contract byte for byte); `npm test` 1,116
files and 20,657 tests passed, 14 skipped; phonecopy and its self-test 0 (20 screens, 693 segments, 91 of 91 owned rules); the
probe's grader self-test 0 (1,104 cases, 0 FAIL); the hostile door 90 arms; test-ios's self-test 68 checks; vectors PASS;
the six unedited conformances (pocket 127 rules, pocket:hostile 270 arms, choices 27 clauses, handback, manager 64 rules, push
26 rules) PASS; `ablation:p316` in a scratch clone, 20 min 17 s: 458 of 459 arms red on their own rule, the one failure as10,
whose anchor the repair's own restructuring of `picture(` moved; as10 was re-pointed (the carry is now tried first) and with
the twelve arms on the history it ran red alone, 13 of 13, and every one of the 459 anchors applies to the final tree; `git
diff 35a9a390 -- src/ docs/audits/contract-baseline.txt src/main/menu.ts` empty.

**Owed, in order**: the iOS 26.2 platform and the 26.3 runtime reinstalled (his); then `test:ios` Debug and Release on 26.3
and 18.3 (ScreenScrollerTests and ScreenGridCostTests among them, never yet run); then the verifier's app run with
`P316_ARMS=screen,end` beside `P3373_PARENT_IOS`, which is the first time the rebuilt wiring runs; then §7.6's attack.

### The fix round (2026-10-08, the verify's needs_work)

**What it was handed.** The verify's verdict after the reboot: the repair's drop blanked all 57 rows above the prompt for
1.15 to 1.55 s on every return and flood (major); output near one screen a picture flashed strips of carried rows 9 to 98
times a minute (major); PF2 and PF8 could not see lines lost between the history and the live top (minor); the scrolled
carry's `hi == live` was held by text alone (nit); and the phone's required proof had not run (major, the environment). A
first fixer started on it at about 14:12 and was stopped by the account's usage limit before it returned. Its work was in
the tree, unverified, and was checked rather than trusted: it had replaced the drop with HOLES (what the last picture showed
is carried, the lines no picture showed are holes under `hi`, which moves to the new live top), asked the live top's page
at once for holes in view (`want`) and joined it by returning the rows under it to reserved (`accept`), added a hold for
pictures that pass the view (`bandWide`, `passingTheView`, `fillRows`), rewritten TerminalFillTests to 45 tests, and left
`conformance:ios` red on (aw) (its carry and drop clauses still read the repair's code), the ablation arms on dead anchors,
the probe and this file unchanged. Its harness (the verify's, with a `floor` cadence that models
`src/main/screen/watch.ts`'s 250 ms answer floor, and counters for a drawn row taken away and a whole band blank) showed its
hold still flashing the band 27.6 times a minute at 250 to 400 lines a second under that cadence and 20 at 600.

**What this round decided, and why.** Every number below is the verify's harness over the SHIPPING model and scroll view,
compiled for Mac Catalyst, ten seeds per row, under three cadences (the verify's 100 ms grid, a watcher that reads as the poll
arrives, and the 250 ms floor), beside build 7 compiled the same way.
1. **The first fixer's holes, the live top's page and its join are kept** (his rule: a page the picture outran is carried
   or read again, never dropped to blank). A return, a flood, a selection let go, a trim or a pane switch leaves the band
   the ground for at most 0.10 to 0.65 s (the page's round trip), against 1.15 to 1.55 s in the build the verify read.
2. **Its `bandWide` hold is replaced.** Following counts pictures that outran the screen (`outruns`). Two within
   `outrunGap` and the model asks no page until `outrunGap` after the last (`holdUntil`): a page would be scrolled away
   before it filled anything, and the Mac reads none (the reverify's four a second). Carrying goes on, so output that
   outruns the screen by less than the view keeps every row a picture showed. Only when such a picture also PASSES THE VIEW
   (its new lines at least the screen and every row the view holds above it, `passed`), or the carry is already stopped,
   does following carry nothing until then (`fastUntil`): the rows above the prompt go to the ground once and stay there.
   A variant that stopped the carry on any repeated outrun (measured, not shipped) blanked the whole band up to 6.2 times
   a minute, and where it filled the band in 3 to 86 percent of the readings the shipped rule fills it in 43 to 92; the
   shipped rule blanks it at most 1.2 times a minute.
3. **`outrunGap` is 3 s, up from 1 s.** At 1 s pictures that pass the view every second or two slipped out of the hold and
   back, the band filling and blanking 13 to 28 times a minute at the watcher's floor; 3.5 at 2 s; 1.2 at 3 s; 0.5 at 4 s,
   which costs the band's refill after a burst ends a further second. Only a burst waits: a lone outrun is read at once.
4. **A refused page while following keeps the fill's rows reserved, the ground** (`reserve(` no longer refuses on
   `refusedAt`; `want(` still asks nothing while it holds, so D8's no-loop rule stands). Found by this round's ten-seed
   runs, in the build the verify read too: a page refused across a trim or a pane switch put the live rows alone at the
   view's top for the 50 to 100 ms until the picture that showed the change, then back at the bottom, in 7 of 60 runs. Now
   0 rows move; the band goes to the ground in place for that moment instead.
5. **PF2, PF8 and the new PF9 read the history's lowest row right above the live top BY INDEX** (`historyAbove`'s
   `adjoins`, from live row 0's own numbered line), so a history shifted three lines, every row its own index's line, is
   red (the verify's V3 and V3b, now self-test cases); a run whose live row 0 is never a numbered line is UNREADABLE, never
   a pass. **PF8's bound is 1.5 s** (it was 3 s while a lone return waited out the hold). **PF9** is the arm the verify
   asked for: T3.fast prints 280 lines a second (`--lines 3000 --stream 280:8400`, `stream-hold:20`), graded on the live
   bottom held, every row tmux's and none lost under the live top, no drawn row taken away in place (a history row drawn in
   one reading whose index is still in view in the next and drawn no more), and at most six whole-band blank episodes a
   minute, the shares filled, the ground and partly drawn printed.
6. **The nit was already met**: the first fixer's `testScrolledCarriesNothingBesideAGapUnderHi` holds `[lo, hi)` exactly
   with a gap under `hi` while scrolled; this round's behavioural ablation of `hi == live` turned it red.

**Measured, the final tree beside build 7** (ten seeds, three cadences; build 7 draws 40 live rows at the top in every
row, asks no page and never blanks or moves anything, because it draws no history):

| Case | This build |
| --- | --- |
| Opening, idle, printing 4 or 20 lines a second, here and on another machine | 97 rows of text, 0 whole-band blanks, at most 1.00 page a second at the Mac |
| A return after 5 s while printing (60 or 120 ms one way, another machine) | the band the ground for at most 0.30 to 0.60 s, then filled; 1 episode per return |
| A 1,000-line flood, alone or while printing | the ground for at most 0.15 s alone, 0.65 s while printing |
| A selection let go after output scrolled | at most 0.10 s |
| A trim, a pane switch | at most 0.65 s and 0.40 s; 0 rows moved (7 of 60 runs moved the live rows before this round) |
| Output that outruns the screen short of the view (150 to 200 lines a second at the floor and 250 to 400 under the grid and arrival cadences here, 100 and 150 at 150 ms one way, 60 to 150 on another machine) | 0 whole-band blanks a minute; 62 to 97 rows drawn on average (build 7: 40), the band holding every row a picture showed with holes beside them; at most 1.0 page a second |
| Output that passes the view (pictures of 97 lines or more: 250 to 400 lines a second at the floor, 600 and 1,000 here, 150 at the floor and 300 on another machine) | the ground above the live rows, steadily: at most 1.2 whole-band blank episodes a minute; at most 0.02 pages a second |
| Scrolled back while printing (337.1's paging) | unchanged by this round |
| Every reading | 0 wrong rows outside the stated §13 item 1 residual (a rewritten row carried for at most 0.35 s), 0 live bottoms off the bottom, 0 page landings that moved a row; a drawn row taken away in place only at a refused page (7 of 990 runs, the band the ground for one reading before the picture that showed the trim) |

**Proof run.** `test:ios` Debug and Release on iOS 26.3 and on the 18.3 floor (the runtime was back by the time this round
ran): 734 tests in Debug and 731 in Release on each, 0 failures, every suite of the never-ran rule named (TerminalFillTests,
TerminalChromeTests and TerminalMenuTests among them; ScreenScrollerTests and ScreenGridCostTests ran for the first time and
passed); 0 devices named `p316-` left by these runs. Under Mac Catalyst, 16 allowed classes, 216 tests, 0 failures.
Seventeen behavioural ablations of the fix, each in a `cp -c` copy of `ios/`, sixteen red on TerminalFillTests or
ScrollbackModelTests; the one green, the `layout.mode == .following` guard in `fast(_:)`, is unobservable (the layout reads
`carrying` only while following, and only following counts an outrun) and is held by (aw) as text. `conformance:ios` 48
rules, (aw) rewritten for the holes, the hold, the pass, the gap and the refusal, each new clause proved on fixtures of its
own; `ablation:p316` 472 arms (aw17 to aw36 on this round's clauses); the probe's grader self-test 1,127 cases (the fill
group 245), and a clause ablation of the new and changed grader clauses, 15 of 15 red. The app run (`probe:p316`) is the
reverify's: PF9 has never run against a Simulator.
