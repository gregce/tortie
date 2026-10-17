# Phase 333.4.1 — the small screens App Review uses — SPEC

Written by the spec step on 2026-10-16 in `/private/tmp/wt-p33341`, a detached worktree at origin/main `0b87d0af`
("docs(backlog): 345 landed, his research 142 answers, 337.5 queued, three phases started"). The phone at this base is
Phase 345's (`80daa9fd`, several Macs), `CURRENT_PROJECT_VERSION = 11`, not yet uploaded. Every `file:line` here was read
at `0b87d0af`. Phases 346 (start a session from the phone) and 337.5 (the Terminal's selection) run beside this one and
may land first (§10).

**The spec step MEASURED before it wrote** (§13 holds every command, exit code and number). It made two scratch copies of
`ios/` under its scratch (never the tree): a CANDIDATE app carrying every change below behind launch arguments, five bare
SwiftUI hierarchies of its own and a probe element that reads UIKit's own safe-area numbers live, with a scratch UI step
or four; and a HEAD-shaped copy carrying the changes as §4 specifies them, with no switch. It drove them through
`build/simulator-run.mjs`'s `withSimulator` alone, under the lock (taken as `p33341`), on the iPhone SE (3rd generation)
at iOS 26.3.1 and 18.3.1, the iPhone 16 Pro at 26.3.1 and the iPad Air 11-inch (M3) at 26.3.1, and ran
`conformance:ios` and `test:ios` over a clone of the worktree holding the HEAD-shaped copy. It started no Electron, no
agent and no model turn, used no real Tailscale, DNS or APNs, installed nothing, took no photograph, and read nothing under
`~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex`, his keychain or his live Tortie profile; under the home it read only the
identifying fields of one Tortie crash report (§2.5). Every device it made was deleted by the helper.

Read with it, whole: `docs/BACKLOG.md` "## Phase 333.4.1" (the charter, with "His rulings of 2026-10-16");
`build/p3334/SPEC.md` §3 F2, §11 and both "§As built"; `docs/research/142-text-that-wraps-to-the-phone.md` §2.1 and §4.3;
`build/p3373/SPEC.md` D15 to D19 (the Terminal sideways); CLAUDE.md's verification and machine-discipline sections.

**The order of authority.** The backlog entry, his rulings of 2026-10-16 and its "What is NOT in this phase" bind. The
tree at `0b87d0af` overrides anything this file says about it. Where a measurement here disagrees with 333.4's account
(F2 was "not shown to be the Terminal's chrome code"), the measurement wins and §2 says so.

---

## 0. The hard rules, stated once

- **This is a build.** Builders write code and run their own gates; the verifier verifies code that exists.
- Builders boot no Simulator and launch no Electron. The integrator's `test:ios` rows and the verifier's runs boot
  Simulators, each holding THE LOCK: `zsh /private/tmp/tortie-ops/lock.sh try p33341` prints a slot or exits 1 (retry
  every 60 s in a NEW command), and `zsh /private/tmp/tortie-ops/lock.sh release <slot>` on the same command line.
- `/Users/gdc/gmux` is read only; every command runs in `/private/tmp/wt-p33341` or the role's scratch
  `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p33341/<role>/`, every heredoc
  delimiter quoted. Nobody but the committer commits, stages or stashes. `git diff 0b87d0af` is exactly 333.4.1's delta.
- Never `-L gmux`. Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end only pids you started.
- His keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex`, any conversation store and his live Tortie
  profile are never read. No model turn; never start gemini, qwen, agy or grok. No real Tailscale, DNS or APNs.
- **Install nothing.** Simulators only through `build/simulator-run.mjs`; never Simulator.app, never a screenshot; a
  visual claim is a frame or a label XCUITest read. Every process you start, end in a `finally`.
- Derived data only under the role's scratch `dd*`. `df -h /` before any build; under 8 GB free, wait and report.
- **His shell history**: before and after every command that starts a shell, the app or a Simulator, record ONLY
  `stat -f '%z %m' ~/.zsh_history ~/.bash_history`. A move across one of your commands is the stop. The spec step saw the
  file move five times during its run, while one of its Simulator runs was going in the background (a node driver and
  xcodebuild, no shell), and named the writers by their process rows: a Terminal.app login shell started 13:55:06 and a pane of his Tortie's own tmux server
  started 13:55:52 (§13 M0). Do the same before calling a move yours or not yours: list `ps -Ao pid,ppid,lstart,tty,command`
  for `zsh` and read the parents.
- **Scratch HOME breaks `simctl`**: CoreSimulator's device set is under the real home, so Simulator runs keep `HOME` and
  guard the history with `HISTFILE=/dev/null`, `SHELL_SESSION_HISTORY=0`, a scratch `ZDOTDIR` and `TERM_SESSION_ID`
  unset, as `/private/tmp/tortie-ops/battery.sh` does. Shell-only commands use a scratch HOME as well.
- **No scenario worse than today** (his rule): the iPhone 16 Pro rows read every frame they read at the parent (§6.5).
- **One Simulator run per verdict, and a failing UI drive is driven once more, alone, before it is called.** Load
  averages reached 948 while this step ran beside two other phases' Simulators (§13).

---

## 1. The answer first

**What a person will notice, on an iPhone SE and on the iPad in compatibility mode:**

1. **The top bar stays where it was after the Terminal is turned sideways and back** (F2). Today on a Home-button iPhone
   on iOS 26.3 the back button's top 10 points sit under the clock for the rest of the app's run, and inside See a sample
   the Sample bar and Leave sample lose 20 points. Measured to be iOS's own window losing its status-bar inset after a
   turn, in a bare SwiftUI page with no Tortie code in it; Tortie's root now makes up exactly what iOS's window lacks,
   which is nothing on every other device (§2.1, D1 to D3).
2. **The Terminal fills the screen's width when it opens fitted**: an SE at 200 columns draws 375 of 375 points where it
   drew 300, at 120 columns 375 where it drew 360, and every cell edge still lands on a whole pixel. The iPhone 16 Pro
   (3x) draws exactly what it drew (§2.2, D4, D5).
3. **A sideways pan on the Terminal stays on its row** instead of drifting up and down; a diagonal one still moves freely
   (UIKit's directional lock; §2.3, D6).
4. **No key on the key bar is squeezed**: on a window too narrow for every word (375 points) `return` draws its glyph
   at an arrow key's size and every other word keeps its own width, and the bar is the same at every text size, as the
   iPhone's own keyboard is; today the largest text size squeezes `⇧tab`, `ctrl` and `return` to 34 points on the SE AND
   on the iPhone 16 Pro (§2.4, D7). The 16 Pro at the default size draws exactly what it drew.

**What changes for the tests and the probe:** `probe:p3334` reads crash reports for every drive, so an XCUITest crash the
app came back from is driven again and never graded as the app's (§2.5, D8); `gate:simulator`'s rule 10 refuses any write
to the picked device type row and any read of the caller's options between the pick and the capabilities read (§2.6,
D9); and `probe:p3334 --grader-self-test` is red at this base on the build number, 10 pinned where 345 made it 11, which
this phase fixes (§2.7, D10).

**What is still not true, stated:**
- **The inset is made up, not restored.** iOS's own window still reads a 0 top inset after the turn on the SE at 26.3;
  Tortie's root adds exactly the status bar's height back. If a later iOS restores the inset itself, the difference is
  0 and the root adds nothing, by construction, the moment iOS's two readings agree (D3).
- **The selection's tint keeps `column × width`** below 3x, so its edges may fall between pixels on the SE while every
  cell, the cursor and every ground and line are on whole pixels. 337.5 replaces the selection (§10).
- **No iOS 27 or iPhone Duo row** (the entry's NOT list); 333.4's rows 9 to 11 stay UNMEASURED.

### 1.1 The decisions, each with its reason

| # | Decision | Reason |
| --- | --- | --- |
| D1 | **F2 is iOS 26.3's: after a turn sideways and back, a Home-button iPhone's WINDOW keeps a top safe-area inset of 0 while iOS draws its 20-point status bar again.** Read live from UIKit on the SE at 26.3.1: before the turn `window.safeAreaInsets.top` 20 and `statusBarFrame` `[0, 0, 375, 20]`; sideways 0 and `[0, 0, 0, 0]` (hidden); upright again 0 and `[0, 0, 375, 20]`, `isStatusBarHidden` false, and it stays 0 after 5 s, Back, a tab switch. The same in FIVE bare hierarchies with no Tortie view in them: a plain page with no navigation, a `NavigationStack`, a `TabView` of `NavigationStack`s with nothing hidden, the same with the Terminal's own `.toolbarVisibility` and `.statusBarHidden`, and a 44-point bar above the tabs (the sample's shape). The "10 points" and the "20 points" are one cause: with no top inset UIKit's 54-point navigation bar sits at y 10, and a SwiftUI view that keeps to the safe area (the Sample bar) loses all 20 | §2.1, §13 M3, M4; 333.4 §3 F2 measured the symptom, this the cause |
| D2 | **Nothing public makes iOS measure the inset again.** Measured and refused, each on the SE at 26.3: every view controller's status bar appearance and layout asked again 0.8 s after the turn; the status bar appearance asked at the turn and 0.8 s after; `.statusBarHidden(false)` sideways (iOS hides the SE's status bar sideways anyway, `isStatusBarHidden` true); a portrait geometry request 0.8 s after; the status bar hidden for 0.3 s after the turn. Each left the window's inset at 0 and the bars where 333.4 recorded them | §2.1, §13 M3, M4 |
| D3 | **The fix: Tortie's root makes up exactly what iOS's window lacks.** A child view controller placed once under `RootView` (`StatusBarInsetController`, new file `ios/Tortie/App/StatusBarInset.swift`) sets the window's root view controller's `additionalSafeAreaInsets.top` to `max(0, statusBarFrame.maxY − window.safeAreaInsets.top)`, read from iOS's own two numbers, when every size-change transition COMPLETES (`viewWillTransition(to:with:)`'s coordinator completion), when its safe area changes and when it appears. 0 wherever iOS agrees with itself; 20 on the SE after a turn. Measured: at the completion the status bar reads 20 and the window 0, and the frames read back exactly as before the turn on the paired Terminal, in See a sample and in the bare hierarchies; at the transition's START the status bar still reads 0, so a value read then would be wrong (measured). It is not an offset: no number in it is Tortie's | §2.1, §13 M4 to M7; the entry's "never by an offset that would be wrong on another device" |
| D4 | **The fill: below 3x, the FITTED cell keeps the fitted width itself (`view width ÷ columns`) and every column EDGE is rounded to the nearest device pixel**, so the grid is exactly the view's width and cells differ by at most one pixel (3 or 4 px at 200 columns, 9 or 10 at 80). A zoomed cell (a pinch, a double tap) and every cell at 3x are exactly today's: the width snapped down to a pixel and each edge `column × width`. Measured on the SE at 26.3, the grid's drawn width fitted at 80, 120, 142 and 200 columns: 360, 360, 355, 300 today; 375 at each with the fill; every edge on a whole pixel at each | §2.2; his ruling "keeping cells on whole pixels and leaving @3x phones exactly as they are"; research 142 §2.1, §4.3 |
| D5 | **One edge function, `ScreenCell.x(_ column:)`**, used by every place that turns a column into a point: the content's width, the hosting view's width, a row's frame, each run's ground and each box's clip, each box or block shape's own column, and the cursor's block (now a rectangle from `x(c)` to `x(c + 1)`). A text box's glyphs are drawn from `column × width` (unrounded) and clipped to the rounded box, so a run of text is never compressed. The selection's highlight and its hit test keep `column × width`, because 337.5 rewrites `Screens/ScreenSelection.swift` beside this phase (§10) | §2.2; the task's "keep your edits to ScreenScroller.swift small and local" |
| D6 | **The lock: `isDirectionalLockEnabled = true` in `ScreenScrollView`'s init**, the one line research 142 §4.3 names. Measured on the SE at 18.3 with the sample's 80-column Terminal at the reading size (a double tap): one slow drag 240 points left and 30 down moved the first live row from `[-21, 438, 560, 14]` to `[-185, 476, 560, 14]` without the lock (38 points down with the finger) and to `[-185, 438, 560, 14]` with it (0 down, the same 164 points left), and on the SE at 26.3 the same: `[-21, 377, 560, 14]` to `[-185, 415, 560, 14]` without it and to `[-185, 377, 560, 14]` with it; the iPad 15.5 down without and 0 with | his ruling; research 142 §4.3; §2.3 |
| D7 | **The key bar: the words if they fit, else `return` as its glyph, and the bar at the default text size whatever his.** `ViewThatFits(in: .horizontal)` over the row with every word, then the same row with `return` drawn as the SF Symbol `return` in an arrow key's frame; and `.dynamicTypeSize(...DynamicTypeSize.large)` on the bar, because the key words are already a fixed 15 points and only the arrows grew, to 36 × 44, squeezing `⇧tab`, `ctrl` and `return` to 34. Measured on the SE at 26.3 (375 points): today `return` 41.5 of its 60; giving `return` layout priority squeezes `⇧tab` and `ctrl` to 34 instead; the glyph alone leaves `⇧tab` and `ctrl` at 34 at the largest text size; the glyph and the cap read every word at its own width at both sizes. The iPhone 16 Pro (402) keeps the word, and every frame it draws at the default size is today's byte for byte (`return` 59.7, `⇧tab` and `ctrl` 41.3); at the largest size it squeezes `⇧tab`, `ctrl` and `return` to 34 TODAY too (the arrows 40 to 42 × 44), which the cap ends: with D7 its largest size reads exactly its default | §2.4, §13 M3, M5; the entry's "or draws its glyph instead of the word there" |
| D8 | **`probe:p3334` reads crash reports after EVERY drive**, alive or not, and attributes a report to a drive by device (the process path's udid), time (`procLaunch` and `captureTime` inside the drive's window) and pid (claimed once). A drive that ended with the app running but has an XCUITest crash report (the app came back) is driven again exactly as a dead one is, and its readings are never graded as the app's | the entry's mechanism 3; the reverify's R1 `ipad-18`, `Tortie-2026-10-15-002047.ips` (§2.5) |
| D9 | **Rule 10 refuses any write to the picked device type row, anywhere in `withSimulator`, and any read of `options` (and any use of the row but a null test) between the pick and the capabilities read**, with both of the attack's dodges as ablations and as fixtures beside controls that must stay green | the entry's mechanism 4; §2.6 |
| D10 | **`--grader-self-test` reads the build number from `PHONE_BUILD` in `build/conformance-ios.mjs`**, the one place rule (s) pins it, not a literal: at `0b87d0af` it reads `1 of 184 case(s) graded wrongly` because 345 moved the build to 11 and the case still says 10 | §2.7, §13 M2 |
| D11 | **The build number does not move: 11** in the six `CURRENT_PROJECT_VERSION` lines and in `PHONE_BUILD`; the main session sets it once when it archives | his ruling of 2026-10-16 |
| D12 | **No `conformance:ios` rule moves.** Measured: `node build/conformance-ios.mjs` over a clone holding the HEAD-shaped `ios/` (D3 to D7) reads `PASS. 51 rules over 54 app files, 73 test files and 141 files under ios/`. New arithmetic keeps a `CGFloat(…)` operand on every operator so rule (k) needs no entry. `ablation:p316` runs whole because files under `ios/` moved and its arms anchor on their text | §13 M8 |
| D13 | **Tier 2, one verifier, then fix once and an independent reverify** (his lighter-checking ruling of 2026-10-15). Independent methods: the parent measured on the same devices beside HEAD (`probe:p3334` with `P3334_PARENT_IOS`), and an attack on the new grades and the gate with hostile readings (§6.6) | the entry; CLAUDE.md "Verification" |

**Subject.** `fix(ios): keep the Terminal's top bar in place after a turn on iOS 26, and give the return key its word`

**First body line.** `Phase 333.4.1: the small screens App Review uses`

**Semver.** Patch to the phone app, unreleased; the build stays 11 (D11). The Mac does not move.

**Menus.** No Mac menu moves; nothing under `src/` changes. No phone surface is added, renamed or removed: the key bar's
`return` draws a glyph on a narrow window under the same name, "Return".

---

## 2. What was measured

### 2.1 F2, at its cause

The probe element (`p33341-insets`, scratch only) answers XCUITest with UIKit's own numbers at the moment of the read:
the window's `safeAreaInsets`, the scene's `statusBarManager.statusBarFrame` and `isStatusBarHidden`, the root view
controller's safe area and `additionalSafeAreaInsets`, every navigation controller's bar. Each row: SE (3rd generation),
iOS 26.3.1, read upright before the turn, sideways, upright after it, and 5 s later.

| Hierarchy (scratch, launch argument) | Before | Sideways | After, and 5 s later |
| --- | --- | --- | --- |
| A plain page, no navigation, nothing hidden | window top 20; the page's first line at y 20 | window 0, status bar hidden | **window 0**, status bar `[0, 0, 375, 20]` shown; the first line at **y 0**, under the clock |
| `NavigationStack` | bar `[0, 20, 375, 54]` | | **bar `[0, 10, 375, 54]`**, window 0 |
| `TabView` of `NavigationStack`s | bar `[0, 20, 375, 54]`, tab bar `[0, 584, 375, 83]` | | bar `[0, 10, 375, 54]`, window 0 |
| the same with the Terminal's `.toolbarVisibility(…)` and `.statusBarHidden(…)` | the same | no bars | the same, 10 high |
| a 44-point bar above the tabs (the sample's shape) | bar `[0, 0, 375, 64]`, nav `[0, 74, 375, 54]` | | **bar `[0, 0, 375, 44]`**, nav `[0, 54, 375, 54]`: 20 lost |
| Tortie, paired, the Terminal (the honest door) | nav `[0, 20, 375, 54]`, grid `[0, 104, 375, 480]` | grid `[0, 0, 667, 375]` | nav `[0, 10, 375, 54]`, grid `[0, 94, 375, 490]`: 333.4's reading, byte for byte |
| Tortie, See a sample, the Terminal | Sample bar `[0, 0, 375, 64]`, Leave `[276.5, 20, 82.5, 44]`, nav `[0, 74, 375, 54]` | | Sample bar `[0, 0, 375, 44]`, Leave `[276.5, 0, 82.5, 44]`, nav `[0, 54, 375, 54]` |

The candidates of D2, each read the same way, left the window at 0 and the bars where the table has them. **The keeper of
D3** (the transition's completion), read the same way:

| Where | After the turn, and 5 s later | What the keeper read at the completion |
| --- | --- | --- |
| `TabView` of `NavigationStack`s | bar `[0, 20, 375, 54]`, the page's first line at y 74, as before | status bar 20, window 0: set 20 |
| the sample's shape | bar `[0, 0, 375, 64]`, nav `[0, 74, 375, 54]`, as before | the same |
| Tortie, See a sample, the Terminal | Sample bar `[0, 0, 375, 64]`, Sample `[16, 34, 45, 16]`, Leave `[276.5, 20, 82.5, 44]`, Back `[16, 74, 44, 44]`, grid `[0, 158, 375, 426]`: before and after equal (the shippable shape, §13 M12; the candidate's `compensate` read the same, and after Back and the Needs input tab) | the shippable keeper (the transition's completion) |
| Tortie, paired, the Terminal | nav `[0, 20, 375, 54]`, ⋯ `[319, 24, 36, 36]`, grid `[0, 104, 375, 480]`, tab bar `[0, 584, 375, 83]`: before, after, and after Back and reopen, equal (the candidate, and the shippable shape in §13 M12); at the parent nav `[0, 10, 375, 54]`, ⋯ `[319, 14, 36, 36]`, grid `[0, 94, 375, 490]` | status bar 20, window 0: set 20 |
| iPhone 16 Pro 26.3, See a sample and paired (control) | every frame as before the turn and as without the keeper: Sample bar `[0, 0, 402, 106]`, nav `[0, 116, 402, 54]`, grid `[0, 200, 402, 591]`; paired nav `[0, 62, 402, 54]`, grid `[0, 146, 402, 645]`, sideways `[62, 0, 750, 382]` | status bar 54, window 62: set 0, every time |
| SE 18.3.1, See a sample and paired (control) | no defect to make up: the window reads 20 again after the turn; Sample bar `[0, 0, 375, 64]`, grid `[0, 138, 375, 480]`; paired nav `[0, 20, 375, 44]` (iOS 18's bar), grid `[0, 94, 375, 524]`, as before | status bar 20, window 20: set 0, every time |
| iPad Air 11-inch (M3) 26.3.1, See a sample (control) | the window stays upright when the device turns (333.4 F6); every frame as before | status bar `[0, 0, 375, 20]` in the app's own points, window 20: 0 |

At the START of the turn back upright the status bar still reads 0 (`tc-will: bar 0 window 0`), and at its completion 20
(`tc-done: bar 20 window 0`); a fix read at the size class's change happened to read 20 too, but the transition's
completion is the moment UIKit itself names.

### 2.2 The fitted grid's width

`ScreenCell.wide` (`ios/Tortie/Screens/ScreenRows.swift:256-262`) snaps the fitted width DOWN to a pixel. Read on device
by a scratch XCTest mounting `ScreenScrollView` at the device's own width and scale, 40 rows, fitted:

| Device | Columns | Today: cell, row, grid width | With D4: cell, row, grid width, pixel widths of the cells |
| --- | --- | --- | --- |
| SE 26.3 (375 pt, 2x) | 80 | 4.5, 9.0, **360** | 4.6875, 9.5, **375**, 9 and 10 |
| | 120 | 3.0, 6.0, **360** | 3.125, 6.5, **375**, 6 and 7 |
| | 142 | 2.5, 5.0, **355** | 2.6408, 5.5, **375**, 5 and 6 |
| | 200 | 1.5, 3.0, **300** | 1.875, 4.0, **375**, 3 and 4 |
| 16 Pro 26.3 (402 pt, 3x) | 80, 120, 142, 200 | 80: 5.0, 9.67, 400; 120: 3.333, 6.67, 400; 142: 2.667, 5.33, 378.67; 200: 2.0, 4.0, 400 (15, 10, 8 and 6 px cells) | unchanged (D4) |
| SE 18.3.1 and the iPad Air 11-inch (M3) 26.3.1 (both 2x, a 375-point window) | 80, 120, 142, 200 | the SE 26.3 row's numbers exactly, at both | the SE 26.3 row's numbers exactly, at both |

Every edge `x(c)` for `c` in `0…columns` read a whole number of pixels at both. The rule is the fitted cell's below 3x
wherever the view is: sideways on the SE (667 points) it fills too, where today it snaps 80 columns to 640. In the app on the SE at 26.3: the sample's
80-column Terminal draws its rows `[0, …, 375, 9.5]` (today `[0, …, 360, 9]`), the cursor `[9.5, …, 4.5, 9.5]` (today
`[9, …, 4.5, 9]`); the honest door's 120-column Terminal draws `[0, …, 375, 6.5]`, 40 rows ending at the grid's bottom
(today `[0, …, 360, 6]`).

### 2.3 The directional lock

A scratch step double-taps the grid to the reading size, reads the Terminal, makes ONE slow drag from x 320 to x 80 with
30 points of downward travel (`press(forDuration: 0.05, thenDragTo:, withVelocity: XCUIGestureVelocity(300),
thenHoldForDuration: 0.1)`), and reads it again. The sample's 80-column Terminal on the SE at 18.3.1:

| Build | The first live row before | After | Moved |
| --- | --- | --- | --- |
| today (no lock) | `[-21, 438, 560, 14]` | `[-185, 476, 560, 14]` | 164 left, **38 down** |
| `isDirectionalLockEnabled = true` | `[-21, 438, 560, 14]` | `[-185, 438, 560, 14]` | 164 left, **0 down** |
| iPad Air 11-inch (M3) 26.3.1, today | `[-21, 371, 560, 14]` | `[-146.5, 386.5, 560, 14]` | 125.5 left, **15.5 down** |
| iPad, with the lock | `[-21, 371, 560, 14]` | `[-146.5, 371, 560, 14]` | 125.5 left, **0 down** |

The SE at 26.3.1 reads the same: `[-21, 377, 560, 14]` to `[-185, 415, 560, 14]` today (38 down) and to `[-185, 377, 560, 14]` with the lock (0 down). Apple's own words for the property: a drag that starts in one general direction scrolls in that direction
alone, and a diagonal one is not locked (research 142 §4.3, which fetched the page).

### 2.4 The key bar

Every key's frame, read by XCUITest with the keyboard up (`screen-key-<id>`), on the SE at 26.3 (the window 375 × 667):

| Variant | esc | tab | ⇧tab | ← ↑ ↓ → | ctrl | return | hide |
| --- | --- | --- | --- | --- | --- | --- | --- |
| today, default size | 34 | 34 | 41.5 | 30 each | 41.5 | **41.5** | 30 |
| today, sideways (667), default | 34 | 34 | 41.5 | 30 | 41.5 | 60 | 30 |
| today, largest size (AX XXXL) | 34 | 34 | **34** | 36, 35.5, 35.5, 36 (44 tall) | **34** | **34** | 36 |
| today, largest, sideways | 34 | 34 | 41.5 | 61.5, 52.5, 52.5, 61.5 | 41.5 | 60 | 78.5 |
| `return` given layout priority | 34 | 34 | **34** | 30 | **34** | 60 | 30 |
| the same, largest size | 34 | 34 | **34** | 30.5 to 31 | **34** | 60 | 30.5 |
| the glyph, default size | 34 | 34 | 41.5 | 30 | 41.5 | 30 (glyph) | 30 |
| the glyph, largest size | 34 | 34 | **34** | 35.5 | **34** | 35.5 (glyph) | 35.5 |
| **the glyph and the cap (D7), default** | 34 | 34 | 41.5 | 30 | 41.5 | 30 (glyph) | 30 |
| **the glyph and the cap (D7), largest** | 34 | 34 | 41.5 | 30 | 41.5 | 30 (glyph) | 30 |
| the cap alone, largest | 34 | 34 | 41.5 | 30 | 41.5 | **41.5** | 30 |
| iPhone 16 Pro (402), today, default | 34 | 34 | 41.3 | 30 | 41.3 | 59.7 | 30 |
| iPhone 16 Pro, today, largest | 34 | 34 | **34** | 42, 40, 40, 42 (44 tall) | **34** | **34** | 42 |
| iPhone 16 Pro, D7, default and largest (equal) | 34 | 34 | 41.3 | 30 | 41.3 | 59.7 | 30 |

The bar's words at their own widths cost 387 points with spacing and padding; the SE's 375 cannot hold them, the 16 Pro's
402 can. A squeezed word is read as its frame narrower than the same key sideways, never as a picture.

### 2.5 The probe's hidden death

`driveWithRetry` (`build/p3334/probe-p3334.mjs:1755-1769`) calls `readDeath` only when `needsAgain(a.events)` (the app
not running at the drive's end, `:463-465`). When XCUITest's own crash ends the app mid-drive and a later step launches
it again, the drive ends with `alive` 4, no report is read, and the steps after the death grade as the app's: the 333.4
reverify's R1 read `ipad-18` G1 and G9 FAIL that way. Its report, `~/Library/Logs/DiagnosticReports/Retired/
Tortie-2026-10-15-002047.ips`, read for its identifying fields only: bundle `com.itavero.tortie.phone`, the device
`DF3840C0-1C46-41DA-B864-068379958CF6`, pid 21356, `procLaunch` `2026-10-15 00:18:44.0737 -0400`, `captureTime`
`2026-10-15 00:20:30.2220 -0400`, crashed thread `libsystem_platform.dylib` then `XCTAutomationSupport` (333.4's F3 shape).

### 2.6 Rule 10's dodges

`deviceKindShape` (`build/assert-simulator-teardown.mjs:634-690`) holds the capabilities read's own statement (no
`options`, the bundle path guard alone) but not what happens to `deviceType` before it. Each of the attack lens's two
lines, inserted just above `const capabilitiesRead =` (`build/simulator-run.mjs:963`), leaves rule 10 green while the
device's kind is the caller's: `if (typeof options?.capabilitiesFrom === 'string') deviceType.bundlePath = …` and
`Object.assign(deviceType, options?.typeOverrides ?? {})`. Today, between the pick (`:950`) and the read, the only code is
the refusal `if (runtime === null || deviceType === null) { throw … }`. A prototype of §4.8's 10f to 10h, run in scratch over
the helper's text and eight edits of it, caught both dodges and six more shapes and left the shipping helper and two
controls green (§13 M11).

### 2.7 The base is red in one place

`node build/p3334/probe-p3334.mjs --grader-self-test` at `0b87d0af`: `FAIL the project's build number reads 10 and agrees
six times: 11 (wanted 10)`, `1 of 184 case(s) graded wrongly`, exit 1 (`:1233` pins `'10'`; Phase 345 moved the project
to 11). `gate:simulator` at the base: PASS, 567 scripts, 4 users against a floor of 4, 18 of 18 bad fixtures, 15
controls, 52 of 52 helper ablations.

---

## 3. The tree at this head, re-read

| Where | What is there | Moves |
| --- | --- | --- |
| `ios/Tortie/App/TortieApp.swift:1080-1127` | `RootView`: `Group { switch app.root … }` then `.background(Tokens.bgSidebar.ignoresSafeArea())` (`:1124`), `.task`, two `.onChange` | one line: the keeper (D3) |
| `ios/Tortie/App/Orientation.swift` | `OrientationGate`: portrait unless the Terminal is on top | no |
| `ios/Tortie/Screens/Screen.swift:377` | `.statusBarHidden(chrome.statusBarHidden)`, once (rule (ax)) | no |
| `ios/Tortie/Sample/SampleBar.swift` | the Sample bar, 44 points, in `RootView`'s `case .sample` | no |
| `ios/Tortie/Screens/ScreenRows.swift:248-273` | `ScreenCell` (`fontSize`, `width`, `height`), `wide(_:scale:)` snapping DOWN, `ofFont`, `snapped` | D4, D5 |
| `ios/Tortie/Screens/ScreenGrid.swift:125`, `:141`, `:153`, `:163`, `:174` | `ScreenWindow.cursor: CGPoint?`; three frames `CGFloat(columns) * cell.width`; the cursor block `cell.width` wide | D5 |
| `ios/Tortie/Screens/ScreenGrid.swift:234-236`, `:273`, `:287` | `ScreenRowPainter.rect(column:span:)`; a text box drawn at `area.minX`; a shape's column at `area.minX + place × width` | D5 |
| `ios/Tortie/Screens/ScreenScroller.swift:190-214` | `ScreenScrollView.init`: `contentInsetAdjustmentBehavior = .never` (`:194`), no directional lock | D6 |
| `ios/Tortie/Screens/ScreenScroller.swift:411-413`, `:433`, `:634`, `:658-662` | the fitted and laid-out cell; the content's width; the host's width; the cursor point | D4, D5 |
| `ios/Tortie/Screens/ScreenSelection.swift:169-184` | the hit test and the highlight, `column × width` | no (337.5's) |
| `ios/Tortie/Screens/ScreenKeyField.swift:425-534` | `ScreenKeyBar`: one `HStack(spacing: 2)` of ten keys, words at a fixed 15 points, arrows `Image(systemName:)` at the body size, `minWidth` 30 and `minHeight` 36 | D7 |
| `ios/TortieTests/ScreenScrollerTests.swift:120-127`, `:163-211` | `fittedRow(scale:)` (3x 20/3, 2x 6.0); the fill test; `testTheFittedRowIsMeasuredAtTwoScalesAndNoOther` comparing `ScreenCell.wide(fitted, scale:)` | §4.5 |
| `ios/TortieUITests/P316DriveUITests.swift:613-622`, `:3191-3218`, `:4087-4092` | `carried` launch arguments; `terminalReading()` (rows, grid, `keyBar` frame); `keyBarKeys()` | §4.6 |
| `build/p3334/probe-p3334.mjs:222-273`, `:341-379`, `:463-465`, `:539-621`, `:1040-1104`, `:1233`, `:1755-1769` | `MATRIX` (`touch-26` `stated: 'G7'`); `stepsFor`; `needsAgain`; the death readers; `PARENT_TURNS` and `gradeTurn`; the build case; `driveWithRetry` | §4.7 |
| `build/assert-simulator-teardown.mjs:171`, `:617-690`, `:912-1101` | `SIMULATOR_USER_FLOOR = 4`; `CAPABILITIES_READ_RE`, `deviceKindShape`; `HELPER_ABLATIONS` | §4.8 |
| `build/simulator-run.mjs:930-967` | `withSimulator`: the pick (`:950`), the refusal, the read (`:963`), the kind (`:967`) | no |
| `build/conformance-ios.mjs:3196` | `PHONE_BUILD = '11'` | no (read by §4.7) |

---

## 4. The design

### 4.1 F2: the status bar's inset, kept (builder **app**)

New file `ios/Tortie/App/StatusBarInset.swift`, its header saying what D1 to D3 say (the defect, where measured, the
five bare hierarchies, the refused candidates, and why the difference is never Tortie's number):

```swift
enum StatusBarInset {
    /// What the window's own top inset lacks of the status bar's bottom, in points, never below 0.
    static func missing(statusBarBottom: CGFloat, windowTop: CGFloat) -> CGFloat {
        max(0, CGFloat(statusBarBottom) - windowTop)
    }
}

final class StatusBarInsetController: UIViewController {
    override func viewWillTransition(to size: CGSize, with coordinator: any UIViewControllerTransitionCoordinator) {
        super.viewWillTransition(to: size, with: coordinator)
        coordinator.animate(alongsideTransition: nil) { [weak self] _ in self?.keep() }
    }
    override func viewSafeAreaInsetsDidChange() { super.viewSafeAreaInsetsDidChange(); keep() }
    override func viewDidAppear(_ animated: Bool) { super.viewDidAppear(animated); keep() }

    /// The root's top inset set to what THIS window lacks, and only when it moves.
    func keep() {
        guard let window = view.window, let root = window.rootViewController else { return }
        let bar = window.windowScene?.statusBarManager?.statusBarFrame.maxY ?? 0
        let missing = StatusBarInset.missing(statusBarBottom: bar, windowTop: window.safeAreaInsets.top)
        if root.additionalSafeAreaInsets.top != missing { root.additionalSafeAreaInsets.top = missing }
    }
}

struct StatusBarInsetKeeper: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> StatusBarInsetController { StatusBarInsetController() }
    func updateUIViewController(_ controller: StatusBarInsetController, context: Context) {}
}
```

In `RootView.body` (`ios/Tortie/App/TortieApp.swift`), ONE line after `.background(Tokens.bgSidebar.ignoresSafeArea())`
(`:1124`), with a one-line comment naming the file: `.background { StatusBarInsetKeeper().frame(width: 0, height: 0)
.accessibilityHidden(true) }`. Nothing else in `TortieApp.swift` moves (346 edits that file; §10).

Rules the builder keeps: the keeper acts on its OWN window's root only (never `scene.windows`, which holds the keyboard's
windows); it writes `additionalSafeAreaInsets.top` and no other edge; it computes at the transition's COMPLETION, never in
`viewWillTransition`'s body (D3); it is placed once. `.statusBarHidden(chrome.statusBarHidden)` and every bar hide stay
exactly where rules (b) and (ax) hold them.

### 4.2 The fill (builder **app**)

`ios/Tortie/Screens/ScreenRows.swift`, `ScreenCell`:

```swift
    /// The scale every column edge is rounded to, or 0 when the width is itself whole pixels and an edge is column × width.
    var edgeScale: CGFloat = 0

    /// Column `column`'s left edge, in points, on the pixel grid.
    func x(_ column: CGFloat) -> CGFloat {
        guard edgeScale > 0 else { return CGFloat(column) * width }
        return Self.snapped(CGFloat(column) * width, scale: edgeScale, rule: .toNearestOrAwayFromZero)
    }

    /// The fitted cell below 3x: the fitted width itself, every column edge on a whole pixel instead.
    static func filling(_ fitted: CGFloat, scale: CGFloat) -> ScreenCell {
        let pixel = CGFloat(1.0) / max(scale, 1)
        let width = max(pixel, fitted)
        let fontSize = CGFloat(width) / max(ScreenFont.advancePerPoint, 0.01)
        let line = UIFont.monospacedSystemFont(ofSize: fontSize, weight: .regular).lineHeight
        return ScreenCell(fontSize: fontSize, width: width, height: max(pixel, snapped(line, scale: scale, rule: .up)), edgeScale: max(scale, 1))
    }
```

`edgeScale` defaults to 0, so every `ScreenCell(fontSize:width:height:)` in the tree and the tests still builds, and
`wide(_:scale:)` does not move.

`ios/Tortie/Screens/ScreenScroller.swift`, `layoutSubviews` (`:411-413`), the cell chosen:

```swift
        let wanted = ScreenZoom.held(chosen ?? fitted, fitted: fitted, top: top)
        let now = wanted == fitted && displayScale < 3 ? ScreenCell.filling(fitted, scale: displayScale) : ScreenCell.wide(wanted, scale: displayScale)
```

and, in the same file, the content's width `now.x(CGFloat(picture.columns))` (`:433`), the host's width
`cell.x(CGFloat(picture.columns))` (`:634`), and the cursor a `CGRect` from `cell.x(c)` to `cell.x(c + 1)` (`:658-662`).

`ios/Tortie/Screens/ScreenGrid.swift`: `ScreenWindow.cursor` becomes `CGRect?` and the block takes its size and origin
(`:125`, `:171-176`); the three frame widths become `cell.x(CGFloat(columns))` (`:141`, `:153`, `:163`);
`ScreenRowPainter.rect(column:span:)` keeps today's expression when `cell.edgeScale == 0` and otherwise spans `x(column)`
to `x(column + span)` (`:234-236`); a text box is drawn at `CGFloat(box.column) * cell.width` (`:273`); a shape's own
column is `rect(column: box.column + place, span: 1)` when `edgeScale > 0` and today's expression otherwise (`:287`).

THE 3x PATH IS TODAY'S TEXT: with `edgeScale == 0` every expression the painter, the window and the scroller evaluate is
the one at `0b87d0af` (`x(c)` is `c × width`), so no 3x frame can move. Every new operator keeps a `CGFloat(…)` operand
(rule (k)).

### 4.3 The directional lock (builder **app**)

`ios/Tortie/Screens/ScreenScroller.swift`, `init(scrollback:)`, directly after `contentInsetAdjustmentBehavior = .never`
(`:194`): `isDirectionalLockEnabled = true`. Nothing else. Rule (aq) holds the line above it by its text, which does not
move.

### 4.4 The key bar (builder **app**)

`ios/Tortie/Screens/ScreenKeyField.swift`, `ScreenKeyBar`: `body` becomes

```swift
    var body: some View {
        ViewThatFits(in: .horizontal) {
            keys(returnWord: true)
            keys(returnWord: false)
        }
        .dynamicTypeSize(...DynamicTypeSize.large)
    }
```

where `keys(returnWord:)` (internal, so `KeyBarTests` can measure each row) is today's `HStack` (its modifiers, identifiers and accessibility unchanged) with `return` drawn
by `word(Copy.keyReturn, …)` when `returnWord` and by `arrow(Symbol.enter, label: Copy.keyReturnLabel, id: Short.enter,
key: .enter)` otherwise; `Symbol.enter = "return"` beside the other symbols. Both rows keep the identifier
`screen-key-return` and the label "Return", so the probe's and the UI drive's presses do not move. No word in `Copy.swift`
moves.

### 4.5 The tests (builder **app**)

- `ios/TortieTests/ScreenScrollerTests.swift`: `fittedRow(scale:)`'s 2x row becomes the FILLING cell's at the test's
  402-point view: 6.5 points (13 px), measured on the SE at 26.3 with §4.2 in place (the test read `("6.5") is not equal to ("6.0")` before its table moved, §13 M9); its comment says why; and
  `testTheFittedRowIsMeasuredAtTwoScalesAndNoOther` compares 3x with `ScreenCell.wide(fitted, scale: 3)` and 2x with
  `ScreenCell.filling(fitted, scale: 2)`. A new test: `ScreenScrollView` sets `isDirectionalLockEnabled` (red when §4.3's
  line goes).
- New `ios/TortieTests/TerminalFitTests.swift` (the fill): for 80, 120, 142 and 200 columns at 375 and 2x, the fitted
  content's width equals 375 exactly, every `x(c)` for `c` in `0…columns` is a whole number of pixels, cells differ by at
  most one pixel, the cursor's block spans `x(c)` to `x(c + 1)`, `rect(column:span:)` agrees with `x`; at 402 and 3x the
  cell equals `ScreenCell.wide(fitted, scale: 3)` with `edgeScale == 0` and every rect equals `column × width` exactly
  (`==`), the 3x path unchanged; a zoomed cell at 2x is `wide` (`edgeScale == 0`). Each clause fails when its line in §4.2
  is taken out.
- New `ios/TortieTests/StatusBarInsetTests.swift`: `missing` over (20, 0) → 20, (20, 20) → 0, (0, 0) → 0, (54, 62) → 0,
  (0, 20) → 0; a `StatusBarInsetController` in a window of the host scene whose root has `additionalSafeAreaInsets.top`
  0 keeps it 0 when iOS agrees (the test device), and `RootView`'s source names `StatusBarInsetKeeper()` exactly once
  (read through `StyleSource`).
- New `ios/TortieTests/KeyBarTests.swift`, measured with `UIHostingController(rootView:).sizeThatFits(in:)` at an
  unbounded width: the words row's ideal width is more than 375 and at most 402 (about 387, §2.4) and the glyph row's at
  most 375; the WHOLE bar's ideal width is the same under `.environment(\.dynamicTypeSize, .large)` and
  `.accessibility5` (the cap: without it the arrows widen the bar by 24 points or more, §2.4); and the source holds
  `ViewThatFits` once and `.dynamicTypeSize(...DynamicTypeSize.large)` once, on the bar.

### 4.6 The UI drive (builder **drive**)

`ios/TortieUITests/P316DriveUITests.swift`, three additions and nothing else:
- `P316_TEXT_SIZE`, read in `init`: a value that starts with `UICTContentSizeCategory` is appended to `carried` as
  `-UIPreferredContentSizeCategoryName <value>`; any other value prints `{"step":"text-size-refused"}` and is not used.
- A step `keys-read`: the grid tapped, the keyboard waited for (5 s), `passKeyboardIntroduction()`, 1 s, then ONE line
  `{"step":"keys-read","keys":keyBarKeys(),"bar":<screen-key-bar frame>,"window":[w,h],"orientation":n,"textSize":<the
  value or null>}`, then the hide key pressed. `missing("keys-read")` when the grid is not there.
- A step `pan-sideways`: the grid double-tapped to the reading size, 1.5 s, the Terminal read (`terminalReading()`), ONE
  slow drag from 85 percent to 20 percent of the window's width with 30 points of downward travel
  (`press(forDuration: 0.05, thenDragTo:, withVelocity: XCUIGestureVelocity(300), thenHoldForDuration: 0.1)`), 1.5 s, the
  Terminal read again, one line `{"step":"pan-sideways","before":…,"after":…,"window":[w,h]}`, then a double tap back to
  the fitted size. `missing("pan-sideways")` when the grid is not there.

### 4.7 `probe:p3334` (builder **drive**)

- **G1, every drive's death read (D8).** `readDeath(udid, sinceMs, untilMs, { wait })`: every `Tortie-*.ips` under the two
  directories it reads today whose header is the app's, whose `procPath` names the udid, whose `procLaunch` is at or after
  the drive's start less `CRASH_SKEW_MS` and whose `captureTime` is before its end plus `CRASH_WAIT_MS`, each `(pid,
  captureTime)` claimed once per row so no report is counted for two drives. `driveWithRetry` reads it after EVERY attempt:
  with `wait: CRASH_WAIT_MS` when the app is gone (today's), with no wait when it is running. `driveAgain` treats an
  attempt as dead when `needsAgain(events)` OR its death has a report; `gradeRun` never grades an attempt with a report as
  the app's: XCUITest's → driven again (up to `DRIVES_AT_MOST`), the last one UNREADABLE saying the app came back
  (`alive` 4 with an XCUITest report); the app's own → FAIL, never again. The parsers (`crashOn` gains `pid`,
  `procLaunch`, `captureTime`, the time read as the report writes it, `YYYY-MM-DD HH:MM:SS.ffff ±hhmm`) stay pure.
- **G7, `touch-26` is a PASS row.** `MATRIX`'s `touch-26` loses `stated: 'G7'`; every iPhone row's upright frames after
  the turn equal the reading before it. `PARENT_TURNS` stays (the self-test and the side by side with
  `P3334_PARENT_IOS`), and the line for `touch-26` prints the parent's live reading beside HEAD's.
- **G11, the sample's turn.** The S walk gains, after `terminal-open:<T>`: `sample-inventory:turn-before, landscape,
  portrait, sample-inventory:turn-after`. G11: in `turn-after` the elements `sample-bar`, `sample-label`, `sample-leave`
  and the navigation bar's `BackButton` each equal `turn-before` within 0.5 pt, on every row (the iPad's window does not
  turn, F6, so it reads equal). At the parent `touch-26` reads the bar 20 high (§2.1).
- **G12, the key bar.** The S walk gains `keys-read` after `turn-after`, and each iPhone row (and the iPad) gains a K drive
  with `P316_TEXT_SIZE=UICTContentSizeCategoryAccessibilityXXXL`: `setup-read, sample-see, terminal-open:<T>, keys-read`.
  G12, each reading: all ten keys present, inside the window and inside the bar; `esc` and `tab` at least 33.5 wide, `⇧tab`
  and `ctrl` at least 41 (their words' own widths, 34, 34, 41.5, 41.5, read sideways where nothing is squeezed, §2.4);
  `return` either at least 59 (its word, 60 on the SE, 59.7 on the 16 Pro) or within 0.5 of the arrows' width (the
  glyph); and every key's frame at the largest size equal to the default's within 0.5 (the cap). At the parent the SE
  reads `return` 41.5 and, at the largest size, `⇧tab`, `ctrl` and `return` 34: FAIL.
- **G13, the fill.** From every `chrome` reading's `reading.live` rows (P and T drives, the honest door's 120 columns,
  read from `ios/TortieTests/Fixtures/vectors.json`'s `screen-sample`): on a 2x row (`touch-*`, `ipad-*`) every live row's
  width equals the window's width within 0.5; on a 3x row (`face-*`, `none-*`) it equals `columns × floor(402 × 3 ÷
  columns) ÷ 3` within 0.5 (400 at 120 columns: the parent's). At the parent the SE reads 360: FAIL.
- **G14, the lock.** The S walk gains `pan-sideways` after `keys-read`. G14: every live row read in both readings keeps
  its y within 0.5 pt, and the first live row's x moved left by at least 100 pt (the pan happened). At the parent the rows
  move down with the finger, 38 points on the SE at 18.3 (§2.3): FAIL.
- **The self-test (D10)**: the build case reads `PHONE_BUILD` from `build/conformance-ios.mjs` AS TEXT
  (`/export const PHONE_BUILD = '([^']+)'/`) and requires the project to agree with it six times; and, each red on one
  broken reading and green on the honest one: G1 over an alive drive with an XCUITest report in its window (driven
  again), outside it (not), on another device (not), with the app's own report (FAIL), and three alive deaths (UNREADABLE);
  G7 `touch-26` HEAD (PASS) and the parent's recorded reading (now FAIL); G11, G12 and G13 over HEAD's and the parent's
  readings cut from this step's kept lines (§13), and the hostile ones of §6.6. New fixtures under `build/p3334/fixtures/`,
  cut to labels, frames, steps and the crash report's identifying fields (the `procPath` with `/Users/USER/`), nothing
  else.
- The header gains G11 to G14 and the D8 sentence; its cost line is re-measured by the verifier.

### 4.8 `gate:simulator`, rule 10 widened (builder **gate**)

`build/assert-simulator-teardown.mjs`, `deviceKindShape`:
- **10f**: the pick is exactly `const deviceType = pickDeviceType(parseJson(types.stdout), deviceTypeName);`.
- **10g**: between the end of that statement and the start of the capabilities read statement, no token `options`, and
  every `deviceType` is immediately a null test (`deviceType === null` or `!== null`): no alias, no call, no member.
- **10h**: nowhere in `withSimulator` is `deviceType` written through: no `deviceType.<name> =` or `[…] =` (compound and
  `++`/`--` included), no `delete deviceType…`, and it is never the first argument of `Object.assign`,
  `Object.defineProperty`, `Object.defineProperties`, `Object.setPrototypeOf`, `Reflect.set`, `Reflect.defineProperty` or
  `Reflect.deleteProperty`.
- **Ablations** (`HELPER_ABLATIONS`, each red): the two dodges of §2.6 verbatim, each just above `const capabilitiesRead
  =`; `deviceType['bundlePath'] = …` there; `const row = deviceType; row.bundlePath = …` there; `Reflect.set(deviceType,
  'bundlePath', …)` there; `const extra = options?.extra;` there; `deviceType.name = String(options?.label)` after the
  read; the pick taking `options?.types ?? parseJson(types.stdout)`. 52 become 60.
- **Fixtures** (`DEVICE_KIND_FIXTURES`, new, driven through `deviceKindShape` over the shipping helper edited): the two
  dodges red, each naming rule 10; two controls green, a comment line and a `say('…')` line between the pick and the read.
- The PASS line names the fixtures; `SIMULATOR_USER_FLOOR` stays 4 (no new user of the helper).

### 4.9 What does not move

Nothing under `src/` and no contract line (`git diff 0b87d0af -- src/ docs/audits/contract-baseline.txt` is empty). No
word in `Copy.swift`, no identifier, no `Info.plist` key, no project setting, no build number (11). `build/simulator-run.mjs`,
`build/p316/test-ios.mjs`, `build/p316/probe-p316.mjs`, `build/p316/hostile-door.mjs`, `build/conformance-ios.mjs` and
`build/p316/ablation-ios.mjs` do not move. `ios/Tortie/Screens/Screen.swift`, `ScreenSelection.swift`, `ScreenScrollback.swift`,
`Orientation.swift`, `SampleBar.swift` do not move.

---

## 5. The gates, clause by clause

| Gate | Moves | Why |
| --- | --- | --- |
| `conformance:ios` | nothing (measured PASS over the HEAD shape, D12) | §4.1 to §4.5 |
| `ablation:p316` | no arm moves; run whole, every arm still red | files under `ios/` moved |
| `conformance:phonecopy` | nothing (no word moves) | |
| `gate:simulator` | rule 10 widened (10f to 10h), 8 ablations, 4 fixtures | §4.8 |
| `gate:checks` | nothing (no new script; `probe:p3334` exists and refuses by name) | |
| `gate:background` | nothing new (the probe's door children are ended in their `finally` as today) | |
| `gate:electron` | nothing (no Electron) | |
| `gate:contract` | nothing | |

---

## 6. The proof, run rather than read

### 6.1 The battery (the integrator)

`npm run typecheck`, `npm run build`, `npm test` (the whole vitest, scratch HOME), `npm run conformance:ios`,
`npm run conformance:phonecopy`, `npm run gate:simulator`, `npm run gate:checks`, `npm run gate:electron`,
`npm run gate:background`, `npm run ablation:p316`, `node build/p3334/probe-p3334.mjs --grader-self-test`. Then, under
the lock, `test:ios` on 26.3, on `P316_RUNTIME=18.3`, and with `P316_DEVICE='iPhone SE (3rd generation)'` at 26.3 and 18.3.

### 6.2 `test:ios` (the integrator; Debug and Release each)

| Row | Command | Must read |
| --- | --- | --- |
| iPhone 16 Pro 26.3 | `npm run test:ios` | 0 failures, every suite run; the counts printed |
| iPhone 16 Pro 18.3 | `P316_RUNTIME=18.3 npm run test:ios` | the same |
| SE 26.3 | `P316_DEVICE='iPhone SE (3rd generation)' npm run test:ios` | the same |
| SE 18.3 | `P316_DEVICE='iPhone SE (3rd generation)' P316_RUNTIME=18.3 npm run test:ios` | the same |

Measured by this step over a clone holding the HEAD shape with the tests AS THEY ARE at `0b87d0af` (§13 M9): the iPhone
16 Pro at 26.3, Debug 892 executed, 0 failures, Release 889, 0; the SE at 26.3, Debug 892 and Release 889 with exactly
ONE failure each, `ScreenScrollerTests.testFollowingFillsTheViewWithTheLiveBottomAtItsBottom` (`("6.5") is not equal to
("6.0")`), which §4.5 moves on purpose; the SE at 18.3, Debug 892 and Release 889 with the same ONE failure each and nothing else. Every other suite passed on both devices, so no other unit test
depends on the fill, the lock, the keeper or the key bar. With §4.5's new tests the counts rise by their number.

### 6.3 `probe:p3334` (the verifier)

`P3334_PARENT_IOS=<git archive 0b87d0af ios> P3334_ROWS=touch-26,touch-18,face-26,ipad-26 npm run -s probe:p3334` at
HEAD, one slot, nothing beside it: every arm PASS (no STATED), `touch-26`'s T beside the parent's live T (10 high at the
parent). Rows `none-*`, `face-18` and `ipad-18` once more if the time allows; their arms do not move.

### 6.4 What the verifier must produce

1. The battery's exits (§6.1), re-run once.
2. `probe:p3334` per §6.3, every arm's line.
3. **Frames beside the parent (the independent method, his "frames on the SE at 26.3 and 18.3 and the 16 Pro beside the
   parent")**: on the SE at 26.3 and 18.3 and the 16 Pro at 26.3, at HEAD and at the parent on the same device type: the
   paired Terminal's navigation bar and grid before and after the turn; See a sample's bar and Leave sample before and
   after; the 120-column rows' width against the window's; every key's frame at the default and the largest size. HEAD:
   F2 gone on the SE at 26.3, the grid 375 on the SE, the 16 Pro's every frame equal to the parent's.
4. `xcrun simctl list devices | grep -c p316-` (devices this run made) 0 at the end; the history stats.

### 6.5 No regression against today

The 16 Pro rows (`face-26`, `face-18`, `none-*`) read every arm PASS at HEAD as at the parent, G13 reads their rows 400
wide at both, G12 their words at their widths at both sizes, and `ScreenScrollerTests`' 3x row is 20/3 at both.

### 6.6 The attack

- `--grader-self-test`'s graders fed: a `touch-26` T reading 10 high (G7 FAIL); a sample turn with the Sample bar 44 tall
  after (G11 FAIL); a key bar with `return` 41.5 (G12 FAIL) and one with `return` 30 but `ctrl` 34 (G12 FAIL); an SE row
  360 wide (G13 FAIL) and a 16 Pro row 402 wide (G13 FAIL: the 3x path must not fill); an alive drive with an XCUITest
  report in its window graded PASS (must be driven again, never PASS).
- In a scratch copy of the helper, each dodge of §2.6 inserted: `gate:simulator` red, naming rule 10.
- In a scratch copy of the app (never the tree): `StatusBarInset.missing` made `statusBarBottom − windowTop` without the
  floor (the 16 Pro reads 54 − 62, a negative 8 points): `StatusBarInsetTests` red.

---

## 7. The CHANGELOG items (the integrator, under `## Unreleased`, `### Fixed`)

- On an iPhone SE, turning a session's Terminal sideways and back no longer leaves the top of the app under the clock.
- A session's Terminal on an iPhone SE now fills the screen's width when it opens, and a sideways swipe on any iPhone stays
  on its rows instead of drifting up and down.
- The keys above the keyboard on a session's Terminal keep their words at every text size; on an iPhone SE, return shows
  its symbol.

(The follow-up commit adds each item's commit link.)

## 8. CLAUDE.md (the integrator)

- The `gate:simulator` row: rule 10 refuses any write to the picked device type row and any read of the caller's options
  before the capabilities read (the counts from its own PASS line).
- The `probe:p3334` row: every drive's crash report read, alive or not; `touch-26` passes G7 (F2 kept by the root); G11 to
  G14; the K drive at the largest text size; its cost re-measured.
- The `test:ios` row: unchanged.

---

## 9. Builders, disjoint files

| Builder | Files (and no other) | Task |
| --- | --- | --- |
| **app** | `ios/Tortie/App/StatusBarInset.swift` (new), `ios/Tortie/App/TortieApp.swift` (ONE line, §4.1), `ios/Tortie/Screens/ScreenRows.swift`, `ios/Tortie/Screens/ScreenGrid.swift`, `ios/Tortie/Screens/ScreenScroller.swift`, `ios/Tortie/Screens/ScreenKeyField.swift`, `ios/TortieTests/ScreenScrollerTests.swift`, `ios/TortieTests/TerminalFitTests.swift` (new), `ios/TortieTests/StatusBarInsetTests.swift` (new), `ios/TortieTests/KeyBarTests.swift` (new) | §4.1 to §4.5. Runs `npm run conformance:ios` (must stay PASS with no rule edit) and builds for testing through `xcodebuildRun` into its scratch (nothing boots). Boots no Simulator |
| **drive** | `ios/TortieUITests/P316DriveUITests.swift`, `build/p3334/probe-p3334.mjs`, `build/p3334/fixtures/*.json` (new and edited) | §4.6, §4.7. Codes against §4.4's identifiers (unchanged) and §4.6's lines. Runs `node build/p3334/probe-p3334.mjs --grader-self-test`, `npm run gate:checks`, `npm run gate:background`, `npm run conformance:ios` (the UI test is read by (i), (l), (x)). Boots no Simulator |
| **gate** | `build/assert-simulator-teardown.mjs` | §4.8. Runs `npm run gate:simulator` and `npm run typecheck` |
| (integrator) | `CLAUDE.md`, `CHANGELOG.md`, this SPEC's §As built | §7, §8; the battery and `test:ios` under the lock |

No file is in two lists.

---

## 10. What this sends to him and to other phases

- **To 337.5 (the Terminal's selection), which edits `ScreenScroller.swift`, `ScreenRows.swift` and `ScreenSelection.swift`
  beside this phase.** This phase's edits there are local: in `ScreenScroller.swift` the init's one line and the four
  sites of §4.2; in `ScreenRows.swift` three members added to `ScreenCell`. Below 3x the fitted cell's edges are
  `cell.x(column)`, not `column × width`: 337.5's `firstRect`, `caretRect` and `selectionRects` take their x from
  `cell.x(_:)` (and its hit test from the same edges, or `x ÷ width`, which lands within half a pixel), and its rebase
  keeps `isDirectionalLockEnabled = true`. Whichever lands second reconciles; neither reverts the other.
- **To 346 (start a session from the phone), which edits `TortieApp.swift`.** This phase adds ONE line to `RootView`'s
  modifier chain (§4.1) and touches nothing else there.
- **To him, the key bar at large text sizes (D7).** The bar now stays at the default text size whatever his setting, as
  the iPhone's own keyboard does: the arrows no longer grow to 36 to 42 × 44 at the accessibility sizes, which is what
  squeezed `⇧tab`, `ctrl` and `return` to 34 on the SE and the 16 Pro. If he would rather keep the larger arrows, the
  words must squeeze at those sizes; the default here is the cap.
- **To him.** F2 is iOS's (D1). Tortie now makes up the difference, but iOS's own window still misreads; if he wants Apple
  to know, the bare page of D1 (a `NavigationStack` with nothing hidden, turned on an iPhone SE at iOS 26.3) is a complete
  Feedback report.

## 11. What is NOT in this phase

- **No iPad layout.** `TARGETED_DEVICE_FAMILY` stays 1.
- **No iOS 27 or iPhone Duo row**, until he installs Xcode 27 on macOS Tahoe.
- **No screenshot**, no physical device and no install by an agent.
- **No release, and no build number change** (11 stays; the main session sets it at the next archive).
- No change to the selection (337.5's), to how the Terminal opens (fitted, his research 142 answer 5) or to its zoom.
- No change at 3x: the fill is below 3x alone (his ruling).
- No Mac change.

## 12. Open concerns handed to the verifier

1. **Load.** This step ran at load averages up to 948 beside two other phases' Simulators; iOS 18.3's XCUITest crash
   (333.4 F3) is likelier under it, and D8 now catches it whether the app comes back or not. Run `probe:p3334` alone.
2. **The keeper on other devices.** It must read 0 everywhere but the SE at 26.3 after a turn (§2.1's controls); G7 and
   G11 on the 16 Pro and the iPad are the regression check.
3. **The fill's text.** A text run is drawn from `column × width` and clipped to rounded edges; a clip can take at most
   half a pixel from a glyph's side bearing. No photograph can show it, by the rules; the frames and the edges are the
   claim.

## 13. What the spec step measured, how, and the numbers

All under the scratch `…/scratchpad/p33341/spec/`: two copies of `ios/` (`ios-cand`, the candidate behind launch
arguments, and `ios-head`, §4's shape with no switch), a driver `drive.mjs` that imports `withSimulator`,
`xcodebuildRun` and `countDevicesNamed` from the worktree's `build/simulator-run.mjs` and `hostileDoorArgv` from
`build/p316/hostile-door.mjs`, its step lists `drives.json`, and `wtclone/`, a `cp -Rc` of the worktree with `ios/`
replaced by `ios-head` and its `.git` file removed (so nothing there reaches the worktree's git directory). The candidate's
switches: `-P33341Repro <plain|nav|tabsnav|tabsnav-hide|bartabs>`, `-P33341Fix <relayout|statusupdate|statusvisible|
geometry|flick|compensate|compensate-tc>`, `-P33341Fill YES`, `-P33341Lock YES`, `-P33341Keys <priority|glyph|glyphcap|cap>`,
read from the argument domain; scratch UI steps `insets:<n>` (the probe element's live UIKit numbers and every bar),
`relaunch:<args>`, `push-repro`, `keybar:<n>`, `rows:<n>`, `zoomdrag:<n>`, `wait:<s>` in a scratch copy of
`P316DriveUITests.swift`; and a scratch XCTest `P33341FillTests` printing the fitted geometry. Load averages ran from 12
to 948 while two other phases' Simulators ran beside this step; memory never fell below 48 percent free.

| # | What | Command | Exit | Numbers |
| --- | --- | --- | --- | --- |
| M0 | His history | `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before and after every command that started a shell or a Simulator, and `ps -Ao pid,ppid,lstart,tty,command` when it moved | 0 | Start `737736 1792023873`, `23166 1790702242`. `.zsh_history` moved between commands at 13:55:20, 13:55:30, 13:55:59, 14:00:56 and 14:07:34 (to `738492 1792174054`; from 14:07:34 to this step's last command it did not move again), while a background Simulator run of this step (a node driver and xcodebuild, no shell) was going; the writers were a Terminal.app login shell (pid 33053, parent Terminal pid 611, started 13:55:06) and a new pane of his Tortie's own `tmux -L gmux` server (pid 51708, parent 7822, started 13:55:52), his own; no `zsh` in this step's process trees but the tool's non-interactive `zsh -c`. `.bash_history` never moved |
| M1 | The toolchain | `xcodebuild -version`; `sw_vers`; `xcrun simctl list runtimes` | 0 | Xcode 26.3 (17C529); macOS 15.7.9 (24G830); iOS 18.3.1 (22D8075), iOS 26.3.1 (23D8133) |
| M2 | The base | `node build/assert-simulator-teardown.mjs`; `node build/p3334/probe-p3334.mjs --grader-self-test` | 0; **1** | 567 scripts, 4 users of floor 4, 18 of 18 bad fixtures, 15 controls, 52 of 52 ablations; `FAIL the project's build number reads 10 and agrees six times: 11 (wanted 10)`, 1 of 184 cases |
| M3 | Round 1, SE 26.3.1 (`p316-57343-1`) | `node drive.mjs ios-cand out1 … "iPhone SE (3rd generation):26.3" fill,repro,sample,paired,paired-relayout,paired-fill` | 0 | build 27 s; fill 11 s; repro 173 s (57 lines); sample 445 s (162); paired 47 s; paired-relayout 50 s; paired-fill 31 s; the device deleted (`deviceStillListed false`). §2.1's five hierarchies and the paired and sample rows, the D2 candidates `relayout`, `statusupdate`, `statusvisible`; §2.2's SE rows; §2.4's SE rows |
| M4 | Round 2, SE 26.3.1 (`p316-3397-1`) | `node drive.mjs ios-cand out2 … repro2,sample2,paired2,paired3` | 0 | repro2 234 s; sample2 173 s (it stalled after `geometry` because its next walk did not relaunch, the drive list's fault, so its two `zoomdrag` arms did not run here); paired2 51 s; paired3 62 s. `compensate` (at the size class's change, 0, 0.35, 0.8, 1.5 s) and `compensate-tc` (the transition's completion) both restored every frame in the plain page, the `TabView`, the Terminal's own modifiers, the sample's shape, See a sample (bar `[0, 0, 375, 64]`, Leave `[276.5, 20, 82.5, 44]`, nav `[0, 74, 375, 54]`, grid `[0, 158, 375, 426]`, after Back too) and the paired Terminal (nav `[0, 20, 375, 54]`, grid `[0, 104, 375, 480]`, tab bar `[0, 584, 375, 83]`); `geometry` and `flick` restored nothing |
| M5 | Round 2, iPhone 16 Pro 26.3.1 | `node drive.mjs ios-cand out2 … "iPhone 16 Pro:26.3" fill,keys,turnq,paired3` | 0 | fill 19 s, keys 154 s, turnq 117 s, paired3 61 s. The fill on and off identical (§2.2); the key bar's words at their widths, today and with D7, and squeezed to 34 at the largest size today only (§2.4); the keeper set 0 at every completion (status bar 54, window 62) and every frame equal to the control turn; the `zoomdrag` arms did not run (the same drive-list fault as M4, read before its fix) |
| M6 | Round 2, SE 18.3.1 | `… "iPhone SE (3rd generation):18.3" fill,turnq,paired3` | 0 | fill 27 s (§2.2, the SE 26.3 numbers exactly), turnq 130 s (no defect at 18.3; the keeper 0; §2.3's lock: 38 points down without, 0 with), paired3 51 s (nav `[0, 20, 375, 44]`, grid `[0, 94, 375, 524]` before and after, the keeper 0) |
| M7 | Round 2, iPad Air 11-inch (M3) 26.3.1 | `… "iPad Air 11-inch (M3):26.3" fill,turnq` | 0 | boot 55 s; fill 14 s (§2.2, the SE numbers exactly); turnq 147 s: the window stays upright when the device turns, the keeper 0 (window 20, status bar `[0, 0, 375, 20]`); the lock: 15.5 points down without it, 0 with it |
| M8 | `conformance:ios` over the HEAD shape | `node build/conformance-ios.mjs` in `wtclone/` | 0 | `PASS. 51 rules over 54 app files, 73 test files and 141 files under ios/` (the base: 51 rules, 53 app files) |
| M9 | `test:ios` over the HEAD shape | `P316_DEVICE='iPhone SE (3rd generation)' P316_DERIVED_DATA=… node build/p316/test-ios.mjs` and the 16 Pro's, in `wtclone/` | 1, 0, 1, 1 | SE 26.3, first try: Release build-for-testing exited 65 after 107 s at a load near 900 with no error line (a second build of the same source in the next run succeeded in 49 s; not this phase's); the 16 Pro 26.3: Debug 892 executed 0 failures, Release 889 0, its device archive read as at the parent; the SE 26.3 again: Debug 892 and Release 889, ONE failure each, `ScreenScrollerTests.testFollowingFills…` `("6.5") is not equal to ("6.0")`; the SE 18.3: the same ONE failure each and nothing else. The history unchanged across these runs, `738492 1792174054` |
| M10 | The crash report of §2.5 | its header and five body fields, read by a script | 0 | §2.5 |
| M11 | Rule 10f to 10h, prototyped | `node gateproto/proto.mjs build/simulator-run.mjs` (scratch; reads the helper as text, imports nothing from `build/`) | 0 | the shipping helper green; dodge 1, dodge 2, a bracket write, an alias, `Reflect.set`, a read of `options` alone, a write after the read, a pick from `options` each red; a comment and a `say(…)` line between the pick and the read green |
| M12 | Round 3, SE 26.3.1: the SHIPPABLE shape (`wtclone/ios`, §4 with no switch, built 37 s into its own derived data) driven by the parent's own UI test, then the candidate's fixed `turnq`; then the shippable shape on the iPhone 16 Pro 26.3.1 | `node drive.mjs wtclone/ios out3 … headS,headP`; `node drive.mjs ios-cand out3 … turnq`; `node drive.mjs wtclone/ios out3 … "iPhone 16 Pro:26.3" headS,headP` | 0, 0, 0 | SE: headS 69 s, headP 48 s; turnq 149 s; 16 Pro: headS 59 s, headP 45 s. THE SHIPPABLE SHAPE on the SE at 26.3: See a sample turned and back, every frame equal (Sample bar `[0, 0, 375, 64]`, Leave `[276.5, 20, 82.5, 44]`, Back `[16, 74, 44, 44]`, grid `[0, 158, 375, 426]`); the paired Terminal turned, Back and reopened, every frame equal (nav `[0, 20, 375, 54]`, ⋯ `[319, 24, 36, 36]`, grid `[0, 104, 375, 480]`, tab bar `[0, 584, 375, 83]`); rows 375 wide (80 columns at 9.5, 120 at 6.5), sideways 667 (the fill sideways); the cursor `[9.5, …, 4.5, 9.5]`; the key bar 34, 34, 41.5, 30 × 4, 41.5, 30 (the return glyph), 30. The candidate's control turn on the same device lost the 20 points again (Sample bar `[0, 0, 375, 44]`), its keeper restored them, and its lock read §2.3. On the 16 Pro every frame as at the parent: Sample bar `[0, 0, 402, 106]`, nav `[0, 116, 402, 54]`, rows 400 × 9.67, cursor `[10, …, 5, 9.67]`, `return` 59.7; paired nav `[0, 62, 402, 54]`, grid `[0, 146, 402, 645]`, rows 400 × 6.67, sideways `[62, 0, 750, 382]` with rows 720 wide (3x, snapped down, as today) |

Every device this step made (`p316-57343-1`, `p316-1153-1` stopped by its own SIGTERM and deleted by the helper's net,
`p316-3397-1`, `p316-4635-1` and `p316-9473-1` (a unit run stopped the same way), `p316-85810-1`, `p316-…` of the later
runs) printed `deleted true, deviceStillListed false` or `shut down and deleted on the way out`; `xcrun simctl list devices | grep -c p316-` read 0 at the end with nothing booted, and all three lock slots read free. Kept for
the builders and the verifier under `…/scratchpad/p33341/spec/`: `out1/`, `out2/`, `out3/` (every drive's lines: labels,
frames, steps and the probe element's numbers, the sample's and the honest door's committed text only), `drive.mjs`,
`drives.json`, `show.py`, `gateproto/proto.mjs`, `ios-cand/` and `ios-head/` (the candidate and the shippable shape, 4 MB
each), none of which is copied into `build/`. The derived data (about 2 GB) and `wtclone/` were removed.

---

## §As built (the integrator, 2026-10-16)

Three builders (app, drive, gate) wrote §4.1 to §4.8 on their disjoint files; nothing was committed, staged or stashed, and
`/Users/gdc/gmux` was not written. The integrator reconciled the seams, made TWO changes of its own to the app builder's
files (I1, I2), wrote §7's items into `CHANGELOG.md` and §8's rows into `CLAUDE.md`, and ran the battery and the four
`test:ios` rows under the lock, one at a time. `git diff 0b87d0af -- src/ docs/audits/contract-baseline.txt` is empty and
`CURRENT_PROJECT_VERSION = 11;` reads 6 times (D11).

### The delta

| File | Who | What |
| --- | --- | --- |
| `ios/Tortie/App/StatusBarInset.swift` (new, 81 lines) | app | §4.1: `StatusBarInset.missing`, `StatusBarInsetController` (asks at the size change's completion, on a safe-area change and on appear; its own window's root, the top edge alone), `StatusBarInsetKeeper` |
| `ios/Tortie/App/TortieApp.swift` | app | ONE modifier and its one-line comment after `.background(Tokens.bgSidebar.ignoresSafeArea())` |
| `ios/Tortie/Screens/ScreenRows.swift` | app | `ScreenCell.edgeScale` (default 0), `x(_:)`, `filling(_:scale:)`; `wide` untouched |
| `ios/Tortie/Screens/ScreenGrid.swift` | app | the cursor a `CGRect?`; three frame widths `cell.x(columns)`; `rect(column:span:)` today's expression when `edgeScale == 0`; text drawn from `column × width`; a shape's column through `rect` below 3x |
| `ios/Tortie/Screens/ScreenScroller.swift` | app, then the integrator (I1) | `isDirectionalLockEnabled = true` after the inset adjustment; the cell choice; the content's and the host's width and the cursor through `x(_:)` |
| `ios/Tortie/Screens/ScreenKeyField.swift` | app | `ViewThatFits(in: .horizontal)` over the words row then the glyph row, `.dynamicTypeSize(...DynamicTypeSize.large)`, `keys(returnWord:)` internal, `Symbol.enter = "return"`; identifiers and labels unchanged |
| `ios/TortieTests/ScreenScrollerTests.swift` | app | the 2x fitted row 6.5; the scale test `wide` at 3x and `filling` at 2x; the lock test |
| `ios/TortieTests/TerminalFitTests.swift` (new) | app, then the integrator (I1, I2) | the fill, the edges, the boxes, the cursor, the zoomed cell, 3x unchanged; and the small pinch out |
| `ios/TortieTests/StatusBarInsetTests.swift` (new), `ios/TortieTests/KeyBarTests.swift` (new) | app | §4.5 |
| `ios/TortieUITests/P316DriveUITests.swift` | drive | `P316_TEXT_SIZE`, `keys-read`, `pan-sideways` (§4.6) |
| `build/p3334/probe-p3334.mjs`, 14 new fixtures under `build/p3334/fixtures/`, `touch-26-turn.json`'s `what` | drive | §4.7: G1 for every drive (D8), `touch-26` no longer STATED, G11 to G14, the K drive, `PHONE_BUILD` read as text (D10) |
| `build/assert-simulator-teardown.mjs` | gate | §4.8: 10f, 10g, 10h; 8 ablations (52 to 60); `DEVICE_KIND_FIXTURES`, 11 red and 4 green (the spec asked for 2 and 2); `SIMULATOR_USER_FLOOR` stays 4 |
| `CHANGELOG.md` | integrator | three items under `## Unreleased`, `### Fixed`, with no full stop, for the follow-up's links (§7, reworded: the key bar item says the bar stays at the standard size, which is the limit a person meets) |
| `CLAUDE.md` | integrator | the `gate:simulator` row (rule 10's three clauses, the counts from its PASS line, the floor 4 since Phase 345, which the row had left at 3); the `probe:p3334` row (when it runs, every drive's crash reports, no STATED row, G11 to G14, the K drive, its cost not yet re-measured, 299 self-test cases) |

### The integrator's two changes, and why

- **I1, a small pinch out never narrows the grid (`ScreenScroller.swift`, `TerminalFitTests.swift`).** As built, the cell
  was `filling` only when `wanted == fitted`. A pinch sets the cell ONCE when the fingers lift, to `cell.width × scale`;
  a small pinch out at 2x lands between the fitted width and the next whole pixel, which `wide` snaps DOWN to below the
  fitted width: by `wide`'s own snapping, at 200 columns on the SE a pinch of 1.02 gives 1.5-point cells, a grid of 300 of
  375 and smaller text than before the pinch (80 columns 360, 120 360, 142 355). At the parent the fitted cell and the
  pinched one snap to the same pixel (4.5 and 4.5 at 80 columns), so nothing moved; as built it was a scenario worse
  than today, read from the code and not driven, and his rule is no regression. The choice is now
  `displayScale < 3 && wide(wanted).width <= fitted ? filling : wide`, which is the as-built rule wherever `wanted ==
  fitted` (`wide` snaps the fitted width down) and keeps the filling cell through the band below the next pixel; a zoom
  past it is `wide`'s exactly, as D4 says, and 3x does not move. `testASmallPinchOutNeverNarrowsTheGrid` pinches each
  measured column count by 1.02 at 2x and reads the filling cell and a 375-point content (at the as-built guard it would
  read `wide`'s cell and 360, 360, 355, 300; not run red here). The double tap reads `cell.width`, so after a small pinch it still goes to the reading size.
- **I2, the test helper that reads the drawn window (`TerminalFitTests.swift`).** As built, `drawn(_:)` looked for the
  hosting controller as `contentView.subviews[…].next`; on the device that reads nothing (a hosting controller outside
  the view controller tree is not its view's next responder), so the first `test:ios` round read 3 tests red on the SE
  and the 16 Pro at 26.3, Debug and Release, 6 assertion failures each (`("0") is not equal to ("1") - the one window of
  rows`). It now reads the view's private `host` by `Mirror`, which this repository's tests already use (DoorPairingTests,
  DoorKeychainTests), checked first in a scratch macOS program over an `NSScrollView` subclass with a `private let host:
  NSHostingController<Text>` (`["contentView2", "host"] 1`), and asserts the host's view is under the content view. No
  app file moved for it.

Nothing else moved in the builders' files. The seams read: the UI drive's `keys-read` and `pan-sideways` find
`screen-key-bar` (`ID.screenKeyBar`, unchanged on both rows of the `ViewThatFits`) and `screen-key-return` on both the
word and the glyph; `P316_TEXT_SIZE` reaches the UI test through `driveOnce`'s `testEnv`; the probe's K drive reads the
size from `terminal-open`'s own `terminal-menu` line. `conformance:ios` needed no rule edit (D12).

### The battery (scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset)

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run typecheck` | 0 | 4 s (incremental); 1429 production files, 0 boundary violations, 0 runtime cycles |
| `npm run build` | 0 | 68 s; inside it `gate:simulator` PASS (60 of 60 ablations, 11 of 11 device kind fixtures, 4 controls), `conformance:ios` PASS, `contract-inventory` byte for byte |
| `npm test` (vitest) | 1 | 96 s at a load near 600: 21,425 passed, 3 failed in two files this phase does not touch (`src/` has no diff): `inline-diff-agreement.test.ts`'s timing bound (median 90.4 ms against 50) and two of `p277-store-close-and-policy.test.ts` (a write counted once where two were wanted, then twice where one was); the two files run alone: exit 0, 23 of 23, at a load of 380 |
| `npm run conformance:ios` | 0 | `PASS. 51 rules over 54 app files, 76 test files and 144 files under ios/`; re-run after I1 and after I2, the same line |
| `npm run conformance:phonecopy` | 0 | `phonecopy OK` |
| `npm run gate:simulator` | 0 | 567 scripts, 4 users against a floor of 4, 8 of 8 capabilities, 11 of 11 device kind fixtures and 4 controls, 18 of 18 bad fixtures, 15 controls, 60 of 60 helper ablations |
| `npm run gate:checks` | 0 | 271 check scripts classified, 53 `tsxCli()` importers against a floor of 53, 1143 test files |
| `npm run gate:electron` | 0 | 567 files, 176 reach the helper against a floor of 176 |
| `npm run gate:background` | 0 | 569 files, 3 start a process and end it in a `finally`, 19 of 19 fixtures |
| `npm run ablation:p316` | 0 | 3,449 s at loads of 13 to 445, over the final `ios/` (after I1 and I2): `PASS: 573 of 573 arms red on the rule that owns them, every rule (a) to (z) and (aa) to (ba) proved able to fail, the clone removed, the working tree unmoved`; no arm moved (two earlier starts were stopped by the integrator before I1 and I2 moved the tree) |
| `node build/p3334/probe-p3334.mjs --grader-self-test` | 0 | `self-test PASS: 299 cases over 30 fixtures` (the base read 1 of 184 wrong, on the build number) |
| `node build/p316/test-ios.mjs --self-test` | 0 | `device self-test PASS: 10 checks`, 12 s |
| `git diff --stat 0b87d0af -- src/ docs/audits/contract-baseline.txt` | 0 | empty |
| `grep -c 'CURRENT_PROJECT_VERSION = 11;' ios/Tortie.xcodeproj/project.pbxproj` | 0 | 6; `PHONE_BUILD = '11'` |

### `test:ios`, each row under one lock slot (`p33341 phone`), one at a time, `P316_DERIVED_DATA` in the integrator's scratch

| Row | Round | Exit | Debug | Release | Device archive |
| --- | --- | --- | --- | --- | --- |
| iPhone SE (3rd generation) 26.3.1 | 1 (the builder's helper) | 1, 313 s | 908 executed, 6 failures (I2's 3 tests) | 905, 6 | unsigned, read, no seam |
| iPhone 16 Pro 26.3.1 | 1 | 1, 263 s | 908, 6 (the same 3 tests) | 905, 6 | read |
| iPhone SE (3rd generation) 18.3.1 | after I2 | 0, 322 s | **908, 0 failures** (106.0 s) | **905, 0** (72.4 s) | archived 29.8 s, read |
| iPhone 16 Pro 18.3.1 | after I2 | 0, 226 s | **908, 0** (92.3 s) | **905, 0** (74.4 s) | archived 21.0 s, read |
| iPhone SE (3rd generation) 26.3.1 | after I2 | 0, 232 s | **908, 0** (89.7 s) | **905, 0** (79.5 s) | archived 21.3 s, read |
| iPhone 16 Pro 26.3.1 | after I2 | 0, 280 s | **908, 0** (102.6 s) | **905, 0** (76.8 s) | archived 33.6 s, read |

The base's counts were 892 and 889 (§13 M9); the 16 more are this phase's: TerminalFitTests 7 (I1's among them),
StatusBarInsetTests 5, KeyBarTests 3 and ScreenScrollerTests' lock test 1. Every row read the frozen set's 617 of 617
rows as sealed, the Debug app with all 5 DEBUG seams and the Release app and the device archive with none, and every
device the helper made printed `shut down true, deleted true, deviceStillListed false` and `devices named p316- on
this Mac: 0, booted: 0`. A first start of the SE 26.3 row was stopped by the integrator during its Release build, to
apply I1 (SIGTERM to its own runner and `test-ios.mjs`; the runner's `always` block did not run, so its slot was
released by hand and the orphaned `tsx`, `xcodebuild` and two `swift-frontend` children, each building into this
scratch's `dd-release`, were ended by pid; no device had been made). Two `ablation:p316` runs were stopped the same way
because their tree was about to move (each blocked in a synchronous child, so ended by SIGKILL by pid, its child ended
and its own `/private/tmp/p316-ablation-*` clone removed; the other phases' ablation clones were left alone).

### His shell history

Before the integrator's first command `.zsh_history` read `738586 1792177233` (it had moved from the brief's `737736
1792023873` before this step; the spec step's M0 and the drive builder name the writers) and `.bash_history`
`23166 1790702242`. It moved ONCE across one of the integrator's commands, `npm run build` (15:04 to 15:05), to
`738630 1792177511` (15:05:11). The writer: a new `/bin/zsh -l` (pid 26896, tty `ttys002`) started 15:05:07 under pid
7822, which is `/Applications/Tortie.app/Contents/Resources/bin/tmux -L gmux … start-server` started Oct 8, his own
Tortie's server opening a new session four seconds before the write. The build ran under a scratch HOME and ZDOTDIR with
`HISTFILE=/dev/null` and starts no interactive shell. It moved once more, by 31 bytes at 16:07:02, to `738661 1792181222`,
while the integrator's background `ablation:p316` ran (15:22 to 16:19: node, `cp -Rc`, `plutil` and tsx under a scratch
HOME, no shell); the interactive `zsh` processes alive then were his own, his Terminal's login shell (pid 33053, 13:55:06)
and his Tortie's panes under pid 7822 (26896 from 15:05:07, 51708 from 13:55:52), and no `zsh` but the tool's
non-interactive `zsh -c` was in the integrator's trees. No `test:ios` row moved it (every row's summary line reads
`738630 1792177511` before and after). The last reading: `738661 1792181222` and `23166 1790702242`. `.bash_history`
never moved.

### For the verifier

- `probe:p3334` per §6.3 beside the parent was not run here; it is the verifier's, alone under one slot.
- I1 is held by a unit test only; the probe's G13 grades the fitted readings and does not pinch.
- The vitest failures above are in files this phase does not touch and pass alone; re-read them under a quieter load.

---

## §As built — the fix round (2026-10-16), run once

The verifier answered `needs_work` on two minors and two nits, none in `ios/`. The fixer changed three files, being
`build/assert-simulator-teardown.mjs`, `build/p3334/probe-p3334.mjs` and `CLAUDE.md`, and this section. Nothing under
`ios/`, `src/` or `docs/audits/contract-baseline.txt` moved, `CURRENT_PROJECT_VERSION = 11;` still reads 6 times, and
`git status --short` reads the same 31 lines. Nothing was committed, staged or stashed.

### F1 (minor): rule 10i, the pick's callees are the module's own

The verifier found a third shape of §2.6's kind. A function declared inside `withSimulator` under the pick's own callee's
name, `function pickDeviceType(json, want) { return options?.typeRow ?? … }` (or the same for `parseJson`), is hoisted over
the whole body. So the pick kept 10f's exact text and returned the caller's row, while 10f to 10h stayed green. The fix is
a new clause, 10i (`calleesOwn` and `codeOnly` in the gate, called from `deviceKindShape`). It covers every name the pick,
the read and the kind call: `pickDeviceType`, `parseJson`, `run`, `join` and `biometryOf`, not only the two the verifier
named, because a shadow of `run`, `join` or `biometryOf` takes the read or the kind the same way.

It reads the whole helper with strings blanked (a template's `${…}` code is kept). Each name is only ever CALLED, except
for its one declaration: `function name(` outside `withSimulator`, or, for `join`, the specifier of the import from
`node:path`. So these all read red: a function or class declaration, a var, let or const, a destructuring, a parameter, a
catch binding, a `for … of` head and a rebinding of the module's name, inside `withSimulator` or anywhere else in the
helper. The text as written must also assign none of them, with strings read as code. The helper may not name `eval`,
because a strict direct `eval` can still assign a module binding from a computed string. And no identifier may be spelled
with a `\u` escape: `function pickDeviceType(…)` declares `pickDeviceType`, which a scratch module confirmed by
printing `CALLER`. The rule is conservative where it cannot tell. A catch binding, a nested function's parameter, an
object key or a value passed by name under one of these names reads red, so such a line is written under another name.
The header says this, and adds that the rule does not read what the declarations do.

Findings begin `rule 10i`. The fixture loop now accepts `rule 10[fghi]`. The two shadows verbatim are new
`HELPER_ABLATIONS` entries, so the count goes from 60 to 62. `DEVICE_KIND_FIXTURES` gains 13 entries, going from 15 to 28:

- 11 red, each naming 10i: both shadows; a `var parseJson` in a nested block; `run` and `biometryOf` declared; `join`
  destructured; the module's `pickDeviceType` reassigned above the pick; `[parseJson] = …`; a computed `eval`; a
  `\u`-escaped declaration; and a `for (pickDeviceType of …)` at module level.
- 2 green controls: `parseJson(…)` called beside a member `.join(`, and the five names as words of a message.

The PASS line now ends its row clause with "by functions that are the module's own". The `CLAUDE.md` `gate:simulator` row
gains 10i and the new counts.

The independent check was a plant run (`scratchpad/p33341/fix/plants/gate-plants.mjs`, results in `gate-plants.json`).
It used two `rsync` copies of `build/` without `vendor`, one with this gate and one with the gate as the verifier read it
(sha256 `a26032d5…`). It planted 20 shapes into each copy's helper, ran each copy's gate as a command, and restored the
helper by sha256 (`90b23553…`) in a `finally`.

- All 20 edited helpers pass `node --check`.
- The 17 hostile shapes are exit 0 at the old gate and exit 1 at this one, each naming 10i and nothing else. Beyond the
  fixtures they include: a `let parseJson` at the top of the body, a rebinding in another function, `pickDeviceType ??=`
  inside, the pick imported from another module with the local one renamed, `posix as join` in the import, a `class`
  shadow and a `catch` binding.
- The 3 controls are exit 0 at both: a `globalThis` property of the same name, which the module's binding shadows; the
  names in a comment; and calls with members.

### F2 (minor): D8's read after an attempt that ended alive is now driven

`driveWithRetry` takes `{ read = readDeath, tell = say } = {}`, with the same body. The self-test is now `async` and the
entry awaits it. It DRIVES the loop over attempts cut from the fixtures, using a reader of its own that asks the shipping
`deathReports` over the committed `g1-alive-crash-report` and leaves the directory out.

- An alive attempt with XCUITest's report inside it is read with no wait, comes back with that one report, is driven
  again, the second attempt runs whole, and G1 reads PASS.
- A dead attempt is read with `CRASH_WAIT_MS` and the whole attempt after it with 0.
- An alive attempt with no report in its window gets one unwaited read and one attempt.
- An alive attempt with the app's own report gets one read, is never driven again, and G1 reads FAIL.
- Every read gets the row's own claims and the row's device.
- A text check holds the production defaults.

The two old text checks, which the verifier's `!alive && ` plant passed, were removed. That makes 308 cases over 30
fixtures, up from 299.

The plant run (`plants/probe-plants.mjs`, results in `probe-plants.json`) used an `rsync` copy of `build/` and `ios/`,
restored by sha256 in a `finally`. The control was exit 0. Every one of the following was exit 1:

- the verifier's D8a (the parent's rule: 7 FAIL lines, "has its reports read and is driven again: 1 (wanted 2)")
- the wait inverted, and never waited
- the row's claims dropped
- an alive attempt breaking before the read
- another device read
- the default reader replaced
- driven again regardless
- the four pure plants the verifier had run: `diedIn` reduced to `needsAgain`, `attemptDeath` ignoring alive reports,
  no capture window, and the claims ignored

The first run of `diedIn` reduced to `needsAgain` crashed on `attempts[1]` rather than failing a case. The case now tests
the length first and reads 9 FAIL lines.

### N1 (nit): the probe's cost, as the verifier measured it

The header and the `CLAUDE.md` `probe:p3334` row now carry the verifier's numbers in place of "not yet re-measured":

- 2,377 s for `touch-26`, `touch-18` and `face-26` with `P3334_PARENT_IOS`, of which the four builds took 150 s (21, 75,
  28 and 26 s)
- about 11 to 13 minutes a row
- 717 s for `face-26` alone with warm derived data

The row's self-test count now reads 308, and says that the loop is driven.

### N2 (nit): `face-26:G8`, recorded, not changed

In probe run 1, `face-26:G8` read FAIL once: `faceid-permission` was not seen, and `end-auth-up` read `confirming: false`
on the device's first Face ID End. This was at load averages near 890, beside two other phases' Simulators. The re-drive
read 14 of 14 PASS. This phase does not touch the End path. If it recurs, queue the change: an owner check that never came
up while iOS showed no prompt is read UNREADABLE and driven again, as G1 does for XCUITest's deaths.

### The battery, re-run once on the final tree

Every command below ran with a scratch HOME and ZDOTDIR, `HISTFILE=/dev/null` and `TERM_SESSION_ID` unset, at load
averages of 415 to 682.

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run typecheck` | 0 | 3 s; 1429 production files, 0 violations; 1426 files, 0 strongly connected components |
| `npm run conformance:ios` | 0 | `PASS. 51 rules over 54 app files, 76 test files and 144 files under ios/` |
| `npm run conformance:phonecopy` | 0 | `phonecopy OK` |
| `npm run gate:simulator` | 0 | 567 scripts, 4 users against a floor of 4, 8 of 8 capabilities, **22 of 22 device kind fixtures and 6 controls**, 18 of 18 bad fixtures, 15 controls, **62 of 62 helper ablations** |
| `npm run gate:checks` | 0 | 271 check scripts, 53 `tsxCli()` importers against 53, 1143 test files |
| `npm run gate:electron` | 0 | 567 files, 176 against a floor of 176 |
| `npm run gate:background` | 0 | 569 files, 3 start a process and end it in a `finally`, 19 of 19 fixtures |
| `npm run build` | 0 | 58 s; inside it `gate:simulator` and `conformance:ios` PASS, `contract-inventory` byte for byte |
| `npm test` | 0 | 67 s; 1141 test files passed (2 skipped), 21,428 tests passed (14 skipped), 0 failed |
| `node build/p3334/probe-p3334.mjs --grader-self-test` | 0 | `self-test PASS: 308 cases over 30 fixtures` |
| `node build/p316/test-ios.mjs --self-test` | 0 | `device self-test PASS: 10 checks`, 12 s |
| `git diff --stat 0b87d0af -- src/ docs/audits/contract-baseline.txt` | 0 | empty |
| `grep -c 'CURRENT_PROJECT_VERSION = 11;' …project.pbxproj` | 0 | 6; `PHONE_BUILD = '11'` |

Neither `test:ios` nor `ablation:p316` was re-run. This round touched no file under `ios/`, and neither command reads the
gate or the probe (`test-ios.mjs` names `build/p3334/SPEC.md` only in comments). The integrator's readings of both, on
this same `ios/`, stand. No Simulator, Electron or lock slot was used.

### His shell history

`.zsh_history` read `738871 1792183350` and `.bash_history` read `23166 1790702242` before and after every command of
this round. Neither moved.
