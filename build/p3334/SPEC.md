# Phase 333.4 — the devices App Review uses — SPEC

Written by the spec step on 2026-10-13 in `/private/tmp/wt-p3334`, a detached worktree at origin/main `5f5efba2`
("docs(backlog): 0.111.2 published"). The phone at this base is `ad317f86`'s `ios/` (Phase 333.3, See a sample), build 10,
already archived for TestFlight: every "parent" below is that build. Every `file:line` here was read at `5f5efba2`.

**The spec step MEASURED before it wrote** (§14 holds every command, exit code and number). It built the parent's app
three ways (Debug for testing, Release for testing with testability on, and Release as it ships) into scratch derived
data, and drove the parent's own `TortieUITests/P316DriveUITests/testDrive` against `build/p316/hostile-door.mjs`'s
`honest` arm on every measurable row of the matrix: 29 devices in all (25 driven rows and four `test:ios` runs), each made
and deleted by `build/simulator-run.mjs`'s `withSimulator` alone, under the lock (taken as `p3334`, up to three slots). It ran the parent's `test:ios` on the iPad
and the iPhone SE at both runtimes from a scratch clone whose only edit was two lines handing `P316_DEVICE` to
`withSimulator`, and read three crash reports of its own runs. Then, in scratch copies only, it built two UI drives that
read iOS's own owner-check surface while End waits, and four candidate changes to the app's Terminal to localise the one
layout defect it found; none of them is proposed (§3 F2). It started no Electron, no agent and no model turn, used no
real Tailscale, DNS or APNs, installed nothing, took no photograph, and read nothing under `~/.ssh`, `~/Keys`,
`~/.claude`, `~/.codex`, his keychain or his live Tortie profile. `stat -f '%z %m' ~/.zsh_history ~/.bash_history` read
`737549 1791921744` and `23166 1790702242` before the first command and after the last. Every `p316-` device it made was
deleted (`xcrun simctl list devices | grep -c p316-` read 0 at the end, none booted), and its derived data, clones and
builds (8 GB) were removed when it returned. Its READINGS are kept for the probe builder and the verifier, 12 MB at
`/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p3334/keep/`: `lines/` (every
drive's `P316|…` lines, labels and frames only), `results/` (one JSON per driven row: its drives, exit codes, door
requests and biometry answers), the four `test:ios` logs, the run logs, and the scratch scripts that made them
(`measure.mjs`, `measure2.mjs`, `analyze.mjs`, `show.mjs`), which are not to be copied into `build/`.

Read with it, whole: `docs/BACKLOG.md` "## Phase 333.4" and `docs/research/136-the-phone-in-peoples-hands.md` §7 (the
charter); `build/p317/SPEC.md` §5.8 and §6.4 (the owner check and `handle.biometry`); `build/p3373/SPEC.md` D15 to D20 (the
Terminal sideways); `build/p3333/SPEC.md` (See a sample, the only part of the app a reviewer can open without a Mac); and
CLAUDE.md's verification and machine-discipline sections.

**The order of authority.** The backlog entry and its "What is NOT in this phase" bind. The tree at `5f5efba2` overrides
anything this file says about it. Where a measurement here disagrees with an earlier SPEC (317's E3 allowed that a
Simulator with nothing enrolled answers `passcodeNotSet`), the measurement wins and §3 says so.

---

## 0. The hard rules, stated once

- **This is a build.** Builders write code and run their own gates; verifiers verify code that exists. Questions the
  operator asks the main session are not anybody's task here.
- Builders and the integrator boot no Simulator and launch no Electron, except the integrator's `test:ios` rows (§7.2).
  Every Simulator run holds THE LOCK: `zsh /private/tmp/tortie-ops/lock.sh try p3334` prints a slot or exits 1 (retry
  every 60 s in a NEW command), and `zsh /private/tmp/tortie-ops/lock.sh release <slot>` on the same command line.
- `/Users/gdc/gmux` is read only; every command runs in `/private/tmp/wt-p3334` or the role's scratch
  `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p3334/<role>/`, every heredoc
  delimiter quoted. Nobody but the committer commits, stages or stashes. `git diff 5f5efba2` is exactly 333.4's delta.
- Never `-L gmux`, never the default tmux server. Never `pkill`, `killall`, a `pgrep` pattern or a negative pid.
- His keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex` and live Tortie profile are never read. No model
  turn; no real Tailscale, DNS or APNs (`probe:p3334` needs none of their stand-ins).
- **Install nothing**: never `xcodebuild -downloadPlatform`, `xcrun simctl runtime add`, a runtime, Xcode or any download.
- **Simulators only through `build/simulator-run.mjs`** (devices `p316-<run id>`, deleted in its `finally`). Never
  Simulator.app, never a screenshot or recording, never a device the run did not create (his own Simulators are his). At
  the end `xcrun simctl list devices | grep -c p316-` reads 0 with nothing booted.
- Derived data only under the role's scratch `dd*`, removed in the role's own cleanup. `df -h /` before any build; under
  8 GB free, wait and report.
- **His shell history**: before and after every command that starts a shell, a Simulator or the app, record ONLY
  `stat -f '%z %m' ~/.zsh_history ~/.bash_history`; stop and report if either moves.
- **No scenario worse than today on the iPhone 16 Pro rows that pass now** (his rule): the two Face ID control rows (§2
  rows 7 and 8) pass every grade at HEAD as at the parent.
- **One Simulator run at a time for a verdict, and a failing UI drive is re-run once, alone, before it is called.** The
  spec step measured load averages of 400 to 956 while three rows ran at once, and three drives on iOS 18.3 devices died
  inside XCUITest's own code under it (§3 F3).

---

## 1. The answer first

**What a person notices: nothing.** The phone app already runs on the iPad App Review uses, on a Touch ID iPhone and on
an iPhone with no biometrics enrolled, at iOS 26.3 and 18.3, in Debug and in Release: it installs, launches, pairs,
lists, opens a session's Terminal and Catch Me Up, opens See a sample and walks it, and End asks the right owner check
and sends exactly one write after it (§3). **No line of the app changes, so the build stays 10** and the archive already
made for TestFlight is the one App Review gets.

What this phase changes is the proof, and one test:

1. **The harness can now run the app on another device**: `withSimulator` reads a device type's biometry from the
   device type itself and answers Touch ID by Touch ID's own name; `test:ios` takes `P316_DEVICE`; and a new probe,
   `probe:p3334`, drives the whole matrix through the same UI test, door and helper `probe:p316` uses (§5.1 to §5.4).
2. **The UI drive can type a passcode** (`end-passcode:<digits>`), because a Simulator with nothing enrolled asks for
   one, and accepts any (§3 F4, §5.5).
3. **One unit test assumed an iPhone 16 Pro's 3x screen** and failed on every 2x screen; it is fixed (§3 F1, §5.5).

**What is still not true, stated:**
- **On a Home-button iPhone on iOS 26.3** (the iPhone SE, 2nd and 3rd generation), after the Terminal is turned sideways
  and back upright, every top bar sits 10 points higher for the rest of the app's run, its top under the clock. Four
  changes to the app's own Terminal code were built and driven and none moved it; iOS 18.3 and the iPhone 16 Pro never
  do it. Inside See a sample the same turn leaves the top 20 points higher, Leave sample's top under the clock and still
  pressable (the fix round's measurement). It is not fixed here and goes to him with the evidence (§3 F2, §11).
- **On a 375-point window** (the iPhone SE, and the iPad in compatibility mode) the Terminal's key bar squeezes its
  `return` key to 41.5 points against the 59.7 it takes on the iPhone 16 Pro, and at the largest text size `⇧tab`, `ctrl`
  and `return` to 34; every key stays inside the window and hittable. Unchanged since Phase 337 and not fixed here (§11).
- **The iOS 27 rows and iPhone Duo are UNMEASURED**: this Mac has neither runtime nor device type, Xcode 26.3's SDK is
  iOS 26.2, and Xcode 27 (which the iOS 27 runtime needs) requires macOS Tahoe 26.6 on Apple silicon while this Mac runs
  macOS 15.7.9 (§11).
- A Simulator accepts any passcode, so a WRONG passcode cannot be driven, and iOS's passcode prompt offers no Cancel
  XCUITest can find (§3 F4).
- An iPad keeps the app's iPhone window upright when it is turned (§3 F6); there is no iPad layout, by the entry.

### 1.1 The decisions, each with its reason

| # | Decision | Reason |
| --- | --- | --- |
| D1 | **The matrix is eleven rows** (§2): the iPad Air 11-inch (M3) at 26.3 and 18.3, the iPhone SE (3rd generation) at 26.3 and 18.3, the iPhone 16 Pro with nothing enrolled at 26.3 and 18.3, the iPhone 16 Pro with Face ID at 26.3 and 18.3 (the controls), and three UNMEASURED rows: the iPad Air 11-inch (M3) and the iPhone 17 Pro on iOS 27, and iPhone Duo on iOS 27.1 | the entry's "The mechanism" 1; research 136 §7; the controls are his no-regression rule |
| D2 | **The device type names are the Simulator's own, measured**: `iPad Air 11-inch (M3)` (`com.apple.CoreSimulator.SimDeviceType.iPad-Air-11-inch-M3`, model `iPad15,3`, minimum runtime 18.3.0), `iPhone SE (3rd generation)` (`…iPhone-SE-3rd-generation`, `iPhone14,6`), `iPhone 16 Pro`, `iPhone 17 Pro`. Both installed iOS runtimes list the first three in `supportedDeviceTypes` (58 types on 18.3, 62 on 26.3); iOS 18.3 does not list the iPhone 17 Pro. No device type of the 121 on this Mac names "Duo" or "Fold" | §14 M1 |
| D3 | **An iPhone-only app installs and runs on the iPad, measured**: in compatibility mode, at 26.3 and 18.3, Release and Debug, `simctl install` exit 0 and `appinfo` exit 0, the app's window 375 × 667 points (an iPhone 8's) on both runtimes, every drive complete. `TARGETED_DEVICE_FAMILY` stays 1 | §14 M3; the entry's NOT list |
| D4 | **A device's biometry is its device type's**, never a caller's: `withSimulator` reads `capabilities.plist` in the device type's own bundle (`pearl-id`, `touch-id`) before it creates the device and exposes `handle.biometryKind` (`faceID`, `touchID` or null). Measured over all 82 iPhone and iPad types on this Mac: 50 Face ID, 32 Touch ID, none with both or neither | §14 M2; Phase 317's rule that a caller names a step and never a device |
| D5 | **Touch ID is answered by BiometricKit's `fingerTouch` names** on a Touch ID device; enrolment is the one notification both kinds share (`com.apple.BiometricKit.enrollmentChanged`), and enrolling by it gave `touchID` on the SE and the iPad at both runtimes. Also measured: the Simulator answers EITHER name on EITHER kind (Face ID's `pearl.match` ended a session behind Touch ID on the SE at 26.3 and 18.3; `fingerTouch.match` ended one behind Face ID on the iPhone 16 Pro at 26.3). The helper posts the device's own name anyway: it is what the Simulator's Features menu posts, nothing documents the cross-answer, and a later runtime may drop it. The gate, not a drive, holds the name (§5.2) | §14 M4, M5 |
| D6 | **`test:ios` takes `P316_DEVICE`** beside `P316_RUNTIME`, an exact device type name, handed to `simulatorHarnessMissing` and `withSimulator`; unset, the iPhone 16 Pro as today. A name the Mac lacks refuses with the helper's sentence, exit 2 | the main session's task; one helper |
| D7 | **The device drive is a new probe, `probe:p3334`**, not an arm of `probe:p316`. It drives the SAME UI test (`P316DriveUITests`) against the SAME door (`hostile-door.mjs`'s `honest` arm, its own process on loopback) through the SAME helper. It needs no Electron, no Tailscale stand-in and no DNS stand-in, because for these readings the honest door is the Mac. An arm of `probe:p316` would add eight Simulators to a 20 to 70 minute run behind an Electron it would not use. `probe:p316` does NOT take a device: its graders hold the iPhone 16 Pro's geometry (337.3's landscape grid `[62, 0, 750, 382]`, the badge read on 18.3), so an iPad would fail them for no defect | CLAUDE.md "one app run per phase"; "never a second helper" is kept |
| D8 | **The Release rows install the app as it ships** (a plain `xcodebuild build -configuration Release`) and read it back, and drive the Release build-for-testing made with `ENABLE_TESTABILITY=YES`, `test:ios`'s own Release setting. Measured: a Release build-for-testing without it exits 65 (`ios/TortieTests/AlertsTests.swift:4:18: error: Unable to find module dependency: 'Tortie'`), and `-only-testing:TortieUITests` does not narrow what build-for-testing compiles | §14 M6 |
| D9 | **With nothing enrolled, a Simulator offers End with the lock and asks for a passcode, and takes any.** At 26.3 and 18.3: `OwnerKind.passcode`, glyph `lock`, End enabled (317 E3's `passcodeNotSet` branch, End off with `Copy.endNeedsPasscode`, is never taken on this Mac's runtimes). Pressed, the Mac's confirmation shows, then iOS draws "Enter iPhone Passcode for “Tortie”", the press's own words "End session" and a "Passcode field" (in `com.apple.CoreAuthUI` on 18.3; a secure field in SpringBoard on 26.3), and typing `1234` and Return ended the session with exactly one `POST /v1/end 200` on both runtimes. So the passcode path is driven end to end, by a new UI step | §14 M7, M8 |
| D10 | **The UI drive gains ONE step, `end-passcode:<digits>`** (§5.5.1): End pressed as `end` presses it, then the digits typed into iOS's passcode field wherever iOS draws it, then `end`'s re-read. No other step is added | D9 |
| D11 | **F2 is not fixed in this phase.** On a Home-button iPhone on iOS 26.3 the top bars sit 10 points high after a turn. Four builds of the Terminal were driven: the status bar left to iOS; the navigation bar left drawn sideways; both bars and the status bar left alone (337.1's landscape); and `.visible` in place of `.automatic` upright. Every one shifted exactly as the parent did, the iPhone SE (2nd generation) shifts too, and iOS 18.3 on the same SE does not. Nothing in the app's chrome code is the cause; the remaining code, the orientation gate, cannot be taken out without taking landscape out, which is his 337.3 ruling. It is stated, graded as a STATED reading that must equal the parent's (§5.4 G7), and handed to him | his "no scenario worse than today"; the entry's "each failure is fixed here" is met for every failure whose cause is in Tortie |
| D12 | **The test fix: the fitted row is the screen's own pixel grid.** `ScreenScrollerTests.testFollowingFillsTheViewWithTheLiveBottomAtItsBottom` holds the row to a measured table, 6.67 pt at 3x and 6.0 pt at 2x, and fails naming any other scale | §3 F1 |
| D13 | **No build number moves.** Only test targets change under `ios/`, so the shipping binary is byte-for-byte the parent's source; `CURRENT_PROJECT_VERSION` and `PHONE_BUILD` stay 10 | the entry's Semver |
| D14 | **No iPad layout and no word changes.** The app's words say "this iPhone" on an iPad (`Copy.notPaired`, `Copy.endNeedsPasscode`, `Copy.pairMatchNote` and more); an iPhone app on an iPad is still an iPhone app | the entry's NOT list; CLAUDE.md "just enough words" |
| D15 | **Tier 2 with a fix round.** Independent method: run over real device types, the parent measured first (this step did; the verifier measures it again, §7.5) | the entry; CLAUDE.md "Verification" |

**Subject.** `test(ios): drive the app on an iPad, on iOS 27 and without Face ID`

**First body line.** `Phase 333.4: the devices App Review uses`

**Semver.** None. No line of the app changes (D13).

**Menus.** No Mac menu moves; nothing under `src/` changes. No phone surface is added, renamed or removed.

---

## 2. The matrix

| # | Row id | Device type | Runtime | Biometry | Status | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ipad-26` | iPad Air 11-inch (M3) | 26.3 | Touch ID, enrolled | measurable | App Review's iPad (forums 815079, 820096); the app runs in iPhone compatibility mode, window 375 × 667 |
| 2 | `ipad-18` | iPad Air 11-inch (M3) | 18.3 | Touch ID, enrolled | measurable | the same on the floor runtime |
| 3 | `touch-26` | iPhone SE (3rd generation) | 26.3 | Touch ID, enrolled | measurable | 317's End on a Touch ID iPhone; F2's row |
| 4 | `touch-18` | iPhone SE (3rd generation) | 18.3 | Touch ID, enrolled | measurable | the same on his phone's line (18.x) |
| 5 | `none-26` | iPhone 16 Pro | 26.3 | none enrolled (the passcode) | measurable | the passcode path (D9) |
| 6 | `none-18` | iPhone 16 Pro | 18.3 | none enrolled (the passcode) | measurable | the same on the floor |
| 7 | `face-26` | iPhone 16 Pro | 26.3 | Face ID, enrolled | measurable (control) | the row that passes today; his no-regression rule |
| 8 | `face-18` | iPhone 16 Pro | 18.3 | Face ID, enrolled | measurable (control) | the same on the floor |
| 9 | `ipad-27` | iPad Air 11-inch (M3) | 27 | Touch ID, enrolled | UNMEASURED | no iOS 27 runtime here (`simctl list runtimes`: iOS 18.3.1, iOS 26.3.1, watchOS 26.2); Xcode 26.3's only iOS SDK is 26.2; the iOS 27 runtime comes with Xcode 27, which needs macOS Tahoe 26.6 on Apple silicon, and this Mac runs macOS 15.7.9 (§11) |
| 10 | `face-27` | iPhone 17 Pro | 27 | Face ID, enrolled | UNMEASURED | the same; the iPhone 17 Pro type is installed and listed by 26.3 |
| 11 | `duo-27.1` | iPhone Duo (name not yet measured) | 27.1 | not yet measured | UNMEASURED | no device type here names "Duo" (121 read); a third-party report says its Simulator ships with the Xcode 27.1 beta. Its exact name and biometry are read when it exists, by `simctl list devicetypes` and its `capabilities.plist` (D4), never guessed |

`probe:p3334` holds this table as `MATRIX` (§5.4) and prints rows 9 to 11 on every run with their reasons. Rows 9 and 10
become measurable with no code change once `simulatorHarnessMissing({ runtimes: ['27'], deviceType })` answers null
(`pickRuntime` matches `27.x`); row 11 needs its measured name written into `MATRIX`.

---

## 3. The parent, measured

"Paired" is `pair, list, open:<the honest session>, chrome, catch-up, end, first, settings, open:<it>, landscape,
portrait`; "sample" is the sample walk of §5.4 S; "Release" is the shipping Release app installed and read back, then
the Release drive; "turn" is §5.4 T. Frames are points.

| Row | Paired | Sample | Release | Turn | `test:ios` Debug / Release |
| --- | --- | --- | --- | --- | --- |
| `ipad-26` | PASS: window 375 × 667; End's mark `touchid`, kind `touchID`; iOS's prompt "Touch ID for “Tortie”" with Cancel; one `POST /v1/end 200`; Catch Me Up paged to turn 0 | PASS; End ended the sample's copy behind Touch ID | install 0, appinfo 0; both Release drives PASS, the second through a Terminal, Catch Me Up and End behind Touch ID | the window stays 375 × 667 upright (F6) | 827 / 824 run, 1 failure each (F1) |
| `ipad-18` | PASS, the same; iOS 18's bars (navigation 44 high, tab bar 49) | PASS | install 0, appinfo 0; both Release drives PASS | the window stays upright (F6) | 827 / 824 run, 1 failure each (F1) |
| `touch-26` | PASS for End (the same marks and prompt) | PASS | not run at the parent | **FAIL (F2)** | 827 / 824 run, 1 failure each (F1) |
| `touch-18` | PASS | first run: the app process died in XCUITest's code (F3); re-run alone: PASS | not run at the parent | PASS, every frame equal | 827 / 824 run, 1 failure each (F1) |
| `none-26` | End ON with the lock (D9); pressed and a passcode typed: one write | End ON with the lock; nothing typed, iOS's prompt stayed up and the drive stalled (F4) | not run | not run | the iPhone 16 Pro: as today |
| `none-18` | the same as `none-26` (the prompt drawn by CoreAuthUI) | not run at the parent | not run | not run | as today |
| `face-26` | PASS: window 402 × 874, `faceid`, one write | PASS | install 0, appinfo 0; drive PASS | PASS: sideways `[62, 0, 750, 382]`, upright every frame equal | as today |
| `face-18` | PASS: iOS's first-use question "Do you want to allow “Tortie” to use Face ID?" accepted (on 26.3 no question was seen); one write | PASS | not run at the parent | PASS: sideways `[62, 0, 750, 381]`, upright equal | as today |

### The parent's failures, each with its class

- **F1 — a test that assumes a 3x screen (test, not app). Fixed (§5.5.2).** On every 2x screen, the iPad Air 11-inch (M3)
  and the iPhone SE (3rd generation), at 26.3 and 18.3, in Debug and Release:
  `ios/TortieTests/ScreenScrollerTests.swift:165: error: -[TortieTests.ScreenScrollerTests
  testFollowingFillsTheViewWithTheLiveBottomAtItsBottom] : XCTAssertEqualWithAccuracy failed: ("6.0") is not equal to
  ("6.67") +/- ("0.34") - the fitted row`. The app snaps a cell's height to the screen's pixel grid, rounding up
  (`ScreenCell.wide`, `ios/Tortie/Screens/ScreenRows.swift:256-273`): 20 px at 3x is 6.67 pt, 12 px at 2x is 6.0 pt.
  Every other assertion of that test is computed from the row and held, and 826 of 827 Debug and 823 of 824 Release
  tests passed on each of the four 2x rows. No other unit test depends on the device.
- **F2 — the top bars sit 10 points high after a turn, on a Home-button iPhone on iOS 26.3 (iOS's, stated, not fixed).**
  iPhone SE (3rd generation), iOS 26.3.1, on the Terminal: upright the navigation bar reads `[0, 20, 375, 54]`, the grid
  `[0, 104, 375, 480]`, SpringBoard's status bar `[0, 0, 375, 20]`; sideways the window is 667 × 375 and the terminal is
  alone; turned upright again the navigation bar reads `[0, 10, 375, 54]` and the grid `[0, 94, 375, 490]` under the same
  status bar, so the back button's top 10 points sit under the clock. It PERSISTS: 5 s later, after Back and opening the
  session again, and after Settings and back, the bar still reads `[0, 10, 375, 54]`. Measured on four builds besides the
  parent, each driving the same turn (§14 M9): `.statusBarHidden(…)` removed; the navigation bar left drawn sideways
  (sideways it reads `[0, 24, 667, 54]`); both `.toolbarVisibility(…)` and `.statusBarHidden(…)` removed, which is 337.1's
  landscape (sideways the bars read `[0, 24, 667, 54]` and `[0, 311, 667, 64]`); and `.visible` for `.automatic` upright.
  Every one read `[0, 10, 375, 54]` after the turn. The iPhone SE (2nd generation) at 26.3.1 reads the same at the parent.
  The SE at 18.3.1 and the iPhone 16 Pro at 26.3.1 and 18.3.1 read every frame back exactly, at the parent and with the
  first candidate. Nothing in the Terminal's chrome code is the cause. The back button stays 44 points tall and pressable
  (34 points of it below the status bar). **Graded as STATED** (§5.4 G7) and sent to him (§11).
  **Inside See a sample it is 20 points, not 10** (the fix round, from the attack lens's drive on the iPhone SE (3rd
  generation), iOS 26.3.1, the sample's Terminal turned while End's confirmation was up): the Sample bar `[0, 0, 375, 64]`
  becomes `[0, 0, 375, 44]`, Leave sample moves from `[276.5, 20, 82.5, 44]` to `[276.5, 0, 82.5, 44]` (its top 20 points
  under the status bar `[0, 0, 375, 20]`, 24 of its 44 points below it, still pressed by the drive), the Sample label from
  y 34 to 14 and the navigation bar from y 74 to 54, and back on Pairing See a sample reads y 295.5 against 315.5: the whole
  top of the app loses the status bar's 20 points for the rest of the run. The app is byte-identical to the parent's (the
  attack lens built both at one path: 9 of 9 files equal by sha256), so the parent reads the same. The sample walk does
  not turn, so G7 does not grade it; it is stated here and sent to him (§11). App Review's iPad never turns the app (F6).
  **And iOS 26.3 widens the tab bar's buttons after a turn now and then, at both builds** (the fix round): 100 points
  become 108.5 on the SE (99.67 become 108.33 on the iPhone 16 Pro) until the Terminal is opened again, in 1 of the attack
  lens's 6 drives on the SE and 1 of its 3 on the iPhone 16 Pro, and in 3 of the devices lens's 8 ABBA drives on the SE,
  with the bars 10 points high in all 8. The spec step's recorded parent caught the widened state. So G7 holds the tab
  buttons by their number, their row, their height and their place inside the tab bar, never by their x or width, and
  holds F2 by the bars it moves (§5.4 G7).
- **F3 — the app process ended inside XCUITest's own code (harness, not app; the account corrected by the fix round, see the
  end of this item).** Three times, all on iOS 18.3.1 devices:
  `touch-18`'s first sample walk at `screen-key:return`, and two of the spec step's scratch passcode drives on `none-18`.
  Each crash report (`~/Library/Logs/DiagnosticReports/Tortie-2026-10-13-204952.ips`, `-212827.ips`, `-213018.ips`, each
  under that run's own device) reads `EXC_BAD_ACCESS (SIGSEGV) KERN_INVALID_ADDRESS at 0x0`, faulting frames
  `_platform_strcmp` ← `XCTAutomationSupport runtime_issue_os_log_fault_callback` ← `_os_log_fault_impl` ←
  `__LIBTRACE_CLIENT_QUARANTINED_DUE_TO_HIGH_LOGGING_VOLUME__` ← … ← `UIAccessibility _copyMultipleAttributeValuesCallback`
  ← `XCTAutomationSupport -[XCElementSnapshot identifiers]`: XCUITest's in-process snapshot code crashed when os_log
  quarantined the process for the logging volume its own accessibility queries made, while the load average stood
  between 400 and 956. No Tortie frame is in it, and the app makes no log call (`conformance:ios` (x)). The same sample
  walk on the same device type, re-run alone, passed. **No app fix**; `probe:p3334` drives again once after a death
  (§5.4 G1).
  **Corrected by the fix round: it is iOS 18.3's, not load's.** The devices lens measured it again on 2026-10-14 at load
  averages of 7 to 78: the app ended inside XCUITest in 15 of 69 drives on iOS 18.3 (8 of 42 at HEAD, 7 of 27 at the
  parent) and in 0 of 61 on iOS 26.3, clustered at End and the step after it (`tab-before` settings 7, `end-bar` 2,
  `screen` end 2, `screen-type` 2, `chrome` 2, `tab-settings` 1), so one drive again left a row UNREADABLE about one run in
  four for no defect (`ipad-18` G1 and G9 in its probe run). All 27 Tortie crash reports on this Mac on 2026-10-14 (19 from
  that round's devices, 8 older under `Retired/`) read the same shape, `XCTAutomationSupport`'s
  `runtime_issue_os_log_fault_callback` at frame 1 under `_platform_strcmp`, with Tortie's frames only its entry. Since the
  fix round `probe:p3334` reads each death's report itself (§5.4 G1): XCUITest's own is driven again, up to three drives; a
  death that left no report, once; a report that is the app's own is a FAIL and is never driven again.
- **F4 — with nothing enrolled End is on, iOS asks a passcode and takes any (expectation, then harness). Driven by a new
  step (§5.5.1).** `none-26` and `none-18`: End's mark is the lock and End is enabled (`kind` `passcode`). Pressed, the
  Mac's confirmation shows, `end-confirming` is drawn, and iOS asks for a passcode: on 18.3 `com.apple.CoreAuthUI` runs in
  the foreground drawing "User Authentication", "Enter iPhone Passcode for “Tortie”", "End session" and "Passcode field"
  with a keyboard whose return key reads "Go"; on 26.3 SpringBoard holds the secure field (its texts are not exposed to
  XCUITest) and CoreAuthUI does not run. Typing `1234` and Return into that field ended the owner check within 1.6 s and
  the door counted exactly one `POST /v1/end 200`, on both runtimes. Left alone, the prompt stayed up for more than 40 s,
  and no button labelled "Cancel" was found in SpringBoard, CoreAuthUI or the app. Once in four reads (26.3, the first
  scratch drive) the owner check ended by itself before anything was typed and the app drew `Copy.endNotConfirmed`, "Not
  confirmed. Nothing was changed.", with no write: also honest. The parent's own drives stalled behind the prompt
  (`first-missing`, `tab-settings-missing`) because the steps the spec step first chose assumed End off: the
  measurement's mistake, not the app's.
- **F5 — frames read inside an open menu on the iPad are the iPad's own points (reading, not app).** While the
  Terminal's ⋯ menu is open on the iPad, XCUITest reports the menu's, the navigation bar's and the tab bar's frames in
  the iPad's screen points: the bar `[79, 35.4, 663, 95.5]` against `[0, 20, 375, 54]` closed, a scale of 663 / 375 =
  1.768 and an x offset of 79. Every press landed (the drive taps by element). Graders never compare a frame read in an
  open menu with one read in the window.
- **F6 — an iPad keeps the app's window upright (observation).** On the iPad at both runtimes, `XCUIDevice` turned to
  landscape (orientation 3) leaves the window 375 × 667 and every frame where it was, so the Terminal's sideways view
  (337.3 D15) is never reached on an iPad. No iPad layout is in this phase.

**The Touch ID path is right at the parent.** On every Touch ID row End's mark is `touchid` and its kind `touchID`, the
confirmation is the Mac's own (`End 'talk'?` and its body), no Face ID word is drawn, iOS's prompt is "Touch ID for
“Tortie”" with Cancel, no first-use question is asked (Touch ID has none; `NSFaceIDUsageDescription` is Face ID's
alone), and a match sends exactly one write. Nothing in 317's words or glyphs needs to move.

---

## 4. The tree at this head, re-read

| What | At `5f5efba2` | Note |
| --- | --- | --- |
| The default device | `DEVICE_TYPE_NAME = 'iPhone 16 Pro'` (`build/simulator-run.mjs:154`), `RUNTIME_CURRENT = '26.3'` (`:157`), `RUNTIME_FLOOR = '18.3'` (`:164`) | unchanged |
| `withSimulator` takes a device type | `options?.deviceType ?? DEVICE_TYPE_NAME` (`:840`), picked by exact name (`pickDeviceType`, `:479`); the picked row carries `bundlePath` | `capabilities.plist` is at `<bundlePath>/Contents/Resources/capabilities.plist`, its booleans under `capabilities` (`pearl-id`, `touch-id`) |
| Face ID's steps | `BIOMETRY_STEPS` (`:218-229`): `enrol`, `unenrol` (`com.apple.BiometricKit.enrollmentChanged`), `match`, `nomatch` (`com.apple.BiometricKit_Sim.pearl.*`); `handle.biometry(step)` (`:978-991`) | |
| The preflight | `simulatorHarnessMissing({ runtimes, deviceType })` (`:504-536`) checks a device type and each runtime's `supportedDeviceTypes` | |
| `test:ios`'s device | `runtime` from `P316_RUNTIME` (`build/p316/test-ios.mjs:2205`); the preflight (`:2208`) and `withSimulator` (`:2381`) name no device type | |
| The gate | `SIMULATOR_USER_FLOOR = 2` (`build/assert-simulator-teardown.mjs:120`); rule 8, `biometryShape` (`:409-450`), pins `of BIOMETRY_STEPS[step]` and the four keys; `FIXTURES` (`:489`), `HELPER_ABLATIONS` (`:643`). At the parent: 557 scripts read, 2 users, 16 of 16 bad fixtures caught, 13 controls, 33 of 33 ablations red | |
| Device family | `TARGETED_DEVICE_FAMILY = 1` (`ios/Tortie.xcodeproj/project.pbxproj:437`, `:469`) | stays 1 |
| The build | `CURRENT_PROJECT_VERSION = 10` (six configurations); `PHONE_BUILD = '10'` (`build/conformance-ios.mjs:3077`) | stays 10 |
| The owner check | `DeviceOwnerCheck.kind()` and `confirm` (`ios/Tortie/App/OwnerCheck.swift:95-131`): `.none` only on `passcodeNotSet`; one `evaluatePolicy(.deviceOwnerAuthentication…)` | unchanged; D9 |
| The UI drive's End | `end(step:after:)` (`ios/TortieUITests/P316DriveUITests.swift:1703-1805`): the menu's End, `confirmDialog`, `acceptFaceIDQuestion`, `end-auth-up`, the ack `auth-<seq>`, then `AfterAuth` (`:1464-1473`: `reread`, `cancel`, `home`, `kill`) | §5.5.1 adds `passcode(String)` |
| The step dispatch | `Drive.go()` (`:595-800`); an unknown step prints `unknown-step` | §5.5.1 adds one branch |
| The honest door | `node build/p316/hostile-door.mjs serve --arm honest` under the pinned tsx (`hostileDoorArgv`, `:730`); one `P316_DOOR:{…}` line with `port`, `payload` and `sessionToOpen`; the session `talk` opens on the Terminal and offers End with the Mac's `endConfirm`; `/pair` answers `pending` then `allowed`; `POST /v1/end` answers `done`; the payload expires 3 minutes after the door starts | start one per drive, just before it |
| `gate:checks` | an Xcode harness entry must import `build/simulator-run.mjs`, call `simulatorHarnessMissing()` and exit 2 with its sentence (`build/assert-hermetic-checks.mjs:683-713`); `xcode(name, needs)` (`build/verification-checks.mjs:265`) | `probe:p3334` is one |
| `conformance:ios` over tests | reads every Swift file under `ios/TortieTests` and `ios/TortieUITests` for (i) no photograph, (l) no Tailscale, (x) no test naming the alert registration (`build/conformance-ios.mjs:829`, `:14559`, `:14588`, `:14818`) | §5.5's two test edits must keep all three green |

---

## 5. The design

### 5.1 `build/simulator-run.mjs` (builder **harness**)

1. **Named device types**, exported beside `DEVICE_TYPE_NAME`, each with a one-line reason:
   `DEVICE_TYPE_IPAD = 'iPad Air 11-inch (M3)'` (App Review's iPad, research 136 §7) and
   `DEVICE_TYPE_TOUCH_ID = 'iPhone SE (3rd generation)'` (a Touch ID iPhone). Callers spell them from here.
2. **`biometryOf(capabilities)`**, exported and pure: `'faceID'` when `capabilities?.['pearl-id'] === true` and `touch-id`
   is not; `'touchID'` when `capabilities?.['touch-id'] === true` and `pearl-id` is not; `null` for both, neither, a
   number, or anything that is not an object.
3. **The kind, read before the create.** In `withSimulator`, after the device type row is picked and before `create`:
   `run('plutil', ['-convert', 'json', '-o', '-', join(deviceType.bundlePath, 'Contents', 'Resources', 'capabilities.plist')], { timeoutMs: 30_000 })`,
   parsed, and `const biometryKind = biometryOf(parsed?.capabilities)`. A read that fails leaves it null and prints one
   line; it never refuses the device, because a run that asks no biometry still runs. Nothing a caller hands in sets it.
4. **The handle gains** `deviceType` (the name it was made from) and `biometryKind`, both read only; the typedef says so,
   and the "booted" line names the kind.
5. **Touch ID's answers**, a frozen table beside `BIOMETRY_STEPS`, which keeps its four keys and its words:
   ```js
   export const TOUCH_ID_ANSWERS = Object.freeze({
     match: Object.freeze([Object.freeze(['-p', 'com.apple.BiometricKit_Sim.fingerTouch.match'])]),
     nomatch: Object.freeze([Object.freeze(['-p', 'com.apple.BiometricKit_Sim.fingerTouch.nomatch'])])
   });
   ```
6. **`biometry(step)`**: the step checked against `BIOMETRY_STEPS` first, as today; then, before any `run(`, a device whose
   `biometryKind` is null throws ("`<device type>` has neither Face ID nor Touch ID, so there is nothing to `<step>`");
   then
   ```js
   const notifies = biometryKind === 'touchID' && Object.hasOwn(TOUCH_ID_ANSWERS, step) ? TOUCH_ID_ANSWERS[step] : BIOMETRY_STEPS[step];
   for (const notify of notifies) { … the same run of ['simctl', 'spawn', udid, 'notifyutil', ...notify] … }
   ```
   One parameter, the udid it created, owned children, exactly as Phase 317 built it.
7. **The header** gains a paragraph "Touch ID and the device types (Phase 333.4)": the two constants, the kind read from the
   device type's own `capabilities.plist`, the measured cross-answer (D5) and why the device's own name is posted anyway.
8. Nothing else moves: the runtimes, the teardown, the net, `push`, `pasteboard`, `xcodebuildRun`, the preflight's words.
   The helper still names no `all`, `booted` or `unavailable`.

### 5.2 `build/assert-simulator-teardown.mjs`, `gate:simulator` (builder **harness**)

- **Rule 8 widened** (`biometryShape`): `of BIOMETRY_STEPS[step]` becomes: the loop iterates `notifies`, assigned exactly
  once as the conditional of §5.1.6 (the test `biometryKind === 'touchID'`, the test `Object.hasOwn(TOUCH_ID_ANSWERS, step)`,
  the two indexed tables); the `BIOMETRY_STEPS` step check and the null-kind refusal both come before the first `run(`;
  `BIOMETRY_STEPS`' `match` and `nomatch` name `com.apple.BiometricKit_Sim.pearl.`; `TOUCH_ID_ANSWERS` is
  `Object.freeze({` with keys exactly `match` and `nomatch`, each naming `com.apple.BiometricKit_Sim.fingerTouch.` and
  nothing else. `spawn` and `notifyutil` are still named in the helper only inside `biometry()`.
- **Rule 10, new: a device's biometry is its device type's.** In `withSimulator`, `biometryKind` is assigned once, from
  `biometryOf(`, over the parsed `plutil -convert json` read of `capabilities.plist` under the picked device type's
  `bundlePath`, BEFORE the `'create'` run; `options` is never read for it; the handle exposes `biometryKind` and
  `deviceType`. And `biometryOf`, imported from the helper (the gate still spawns nothing), driven over six fixtures:
  `{ 'pearl-id': true }` gives `faceID`, `{ 'touch-id': true }` gives `touchID`, both gives null, neither gives null,
  `null` gives null, `{ 'pearl-id': 1 }` gives null.
- **Fixtures** (rule 6): two new controls that reach the helper (`user: true`), "an iPad made through the helper"
  (`withSimulator({ label: 'x', deviceType: 'iPad Air 11-inch (M3)' }, …)`) and "Touch ID answered through the helper
  handle"; two new caught, "Touch ID answered in argv outside the helper"
  (`spawn('xcrun', [SIM, SPAWN, udid, NOTIFY, '-p', 'com.apple.BiometricKit_Sim.fingerTouch.match'])`) and "an iPad made in
  argv outside the helper" (`[SIM, MAKE, 'p316-x', 'com.apple.CoreSimulator.SimDeviceType.iPad-Air-11-inch-M3', rt]`). The
  PASS line then reads 18 of 18 bad fixtures and 15 controls.
- **Ablations** (one clause each, every one red, built on the existing shape): the kind test dropped (`notifies` always
  `BIOMETRY_STEPS[step]`); a third key in `TOUCH_ID_ANSWERS`; a `fingerTouch` name swapped for `pearl`'s; a `pearl` name in
  `BIOMETRY_STEPS` swapped for `fingerTouch`'s; the null-kind refusal removed; the refusal moved after the `run(`;
  `biometryKind` taken from `options?.biometry`; the capabilities read moved after the create; `biometryOf` answering
  `faceID` when both are true; `biometryOf` accepting `1`. 33 ablations become 43.
- **`SIMULATOR_USER_FLOOR` 2 → 3**, for `build/p3334/probe-p3334.mjs`, its comment naming the file (the floor is red
  until that file exists; the integrator runs the gate after both builders).
- The header gains rule 10 and a Phase 333.4 paragraph; the PASS line names Touch ID.

### 5.3 `build/p316/test-ios.mjs`, `test:ios` takes a device (builder **harness**)

- `const deviceType = (process.env['P316_DEVICE'] ?? '').trim() || DEVICE_TYPE_NAME;` beside `runtime` (`:2205`),
  `DEVICE_TYPE_NAME` imported from the helper; the preflight becomes
  `simulatorHarnessMissing({ runtimes: [runtime], deviceType })` (`:2208`), and `withSimulator` gets `deviceType` (`:2381`).
- The per-configuration line names the device: `TortieTests (Debug) on <deviceType>, iOS <version>: …`. Nothing parses that
  line (read: no file under `build/` or `docs/` but this one names `TortieTests (`); `PASS_WORDS` and `DEBUG_PASS_WORDS` do
  not move, his checklist quotes them.
- The header's usage gains `P316_DEVICE='iPad Air 11-inch (M3)' npm run test:ios` and
  `P316_DEVICE='iPhone SE (3rd generation)' P316_RUNTIME=18.3 npm run test:ios`, and one sentence: the unit tests are
  device independent except where a test names a measured scale (§5.5.2).

### 5.4 `build/p3334/probe-p3334.mjs`, `probe:p3334`, the device drive (builder **probe**)

**What it is.** One script, no Electron, that builds the app three ways and drives `P316DriveUITests/testDrive` on each
measurable row of `MATRIX` against `hostile-door.mjs`'s `honest` arm, one device at a time through `withSimulator`, and
grades what the drive printed. `package.json` gains `"probe:p3334": "node build/p3334/probe-p3334.mjs"`;
`build/verification-checks.mjs` gains `xcode('probe:p3334', `${NEEDS.xcode}, the iOS 18.3 runtime, and the iPad Air
11-inch (M3) and iPhone SE (3rd generation) device types`)` with a comment in the house shape, and its `test:ios` comment
(`:631`) gains "or the device P316_DEVICE names". It refuses by name, exit 2, when Xcode or the iOS 26.3 runtime is absent
(`simulatorHarnessMissing`), which is what `gate:checks` reads.

**Its header** says what it drives, what it refuses (no Electron, no Tailscale, no DNS, no APNs, no photograph, no device
it did not make, no install, nothing under his home read), the environment, the order, the grades and the line protocol
it reads (`P316|<run>|{…}` on the runner's stdout and in the file `P316_LINES` names, `seq` deduplicated, exactly as
`probe:p316` reads it).

**The environment.**
- `P316_DEVICE` and `P316_RUNTIME`: narrow `MATRIX` to the rows whose device type and runtime match (each optional), the
  names `test:ios` reads.
- `P3334_ROWS=<id,…>`: pick rows by id. A requested row that is UNMEASURED or absent exits 2 with its reason, nothing
  created.
- `P3334_DERIVED_DATA=<dir>`: the three builds' derived data (`<dir>-debug`, `<dir>-release`, `<dir>-shipping`), refused in
  the repository and the home; default under a scratch `mkdtemp`, removed in a `finally` unless `P3334_KEEP=1`.
- `P3334_PARENT_IOS=<dir>`: a directory holding the parent's `ios/` (`git archive 5f5efba2 ios | tar -x -C <dir>`). The T
  drive is driven over it too, after HEAD's on the same device, built with its own UI test, and the readings printed side
  by side; G7 then compares HEAD with that live reading rather than the recorded one.
- `--grader-self-test`: every grader over recorded readings (`build/p3334/fixtures/*.json`, cut by the probe builder from
  the spec step's kept `lines/` and `results/`, §preamble: labels, frames, steps and door routes, nothing else), each grade
  red on one broken reading and green on the honest one; starts nothing. At least: `ipad-26` paired and sample,
  `touch-26` turn (the STATED reading), `touch-18` turn, `face-26` turn, a `none` row's passcode drive (`nobio-26-pc2`'s try,
  which has `passcode-ui` lines in place of the new `passcode-prompt`: the builder renames them to the §5.5.1 shape), and
  `touch-18`'s first sample walk (the app's death).

**The order.**
- B0, the preflight, synchronous: `simulatorHarnessMissing({ runtimes: ['26.3'] })` for the harness itself (exit 2 with its
  sentence); then per row `simulatorHarnessMissing({ runtimes: [row.runtime], deviceType: row.deviceType })`, a sentence
  making that row UNMEASURED (absent), printed, never a pass and never a failure.
- B1, the builds, through `xcodebuildRun` (nothing boots): Debug `build-for-testing`; Release `build-for-testing` with
  `ENABLE_TESTABILITY=YES`; Release `build` (the shipping app). A refused build exits 1 with its tail.
- Per measurable row, ONE device, `withSimulator({ label: 'p3334-<row>', deviceType, runtime, scratch })`, and, in order:
  1. **K, the kind**: `sim.biometryKind` is the row's (iPad and SE `touchID`, iPhone 16 Pro `faceID`). Enrolled rows run
     `sim.biometry('enrol')`; `none` rows enrol nothing.
  2. **R, Release** (rows 1 to 4 and 7): `sim.simctl('install', <shipping Tortie.app>)` exit 0; `sim.simctl('appinfo',
     'com.itavero.tortie.phone')` exit 0 and holding the project's `CFBundleVersion`; `sim.simctl('uninstall', …)`. Then the
     Release drive, no code: `setup-read, sample-see, tab:needs, terminal-open:<A>, reply-press:0, tab:needs,
     terminal-open:<R>, first, back, terminal-open:<R>, <E>, tab:settings, sample-inventory:settings, sample-leave`.
  3. **P, paired** (Debug): a fresh honest door child just before it; `sim.simctl('keychain', 'reset')`; steps `pair, list,
     open:<sid>, chrome, catch-up, <E>, first, settings, open:<sid>, chrome`; environment `P316_PAYLOAD`,
     `P330_DOOR_ENDPOINT=127.0.0.1:<port>`, `P316_ACKS`, `P316_WAIT_S=60`.
  4. **T, the turn** (Debug; a fresh door): `pair, list, open:<sid>, chrome, landscape, portrait, chrome, idle:5, chrome,
     back, open:<sid>, chrome, tab:settings, tab:sessions, open:<sid>, chrome`.
  5. **S, the sample** (Debug, no code): `setup-read, setup-scan, sample-see, tab:needs, sample-inventory:needs,
     terminal-open:<A>, sample-inventory:terminal, reply-press:0, tab:needs, terminal-open:<T>, screen-type:<base64url of
     "ls -la">, screen-ctrl:c, screen-key:return, back, terminal-open:<R>, first, sample-inventory:catch-up, back,
     terminal-open:<R>, <E>, tab:settings, sample-inventory:settings, sample-leave`. A, R and T are the waiting Claude Code,
     the live Claude Code and the live Codex of `ios/Tortie/Sample/sample.json`'s start state, found by its own variants and
     agents as `probe:p316`'s `sampleCast` finds them.
  `<E>` is `end` on enrolled rows and `end-passcode:1234` on `none` rows. The reactor writes the `screen-`, `reply-`,
  `sample-` and `setup-<seq>` acks at once for every line, and `auth-<seq>` only once `end-auth-up` is answered: enrolled
  rows by `sim.biometry('match')` (the device's own name), `none` rows by nothing (the drive types). Every door child is
  ended in a `finally` that names it (`gate:background`), as `probe:p316`'s `endDoorChild` ends one.
- After the rows: `countDevicesNamed('p316-<pid>-')` reads 0 named and 0 booted, an arm.

**The grades** (each arm `<row>:<grade>`: PASS, FAIL, STATED or UNREADABLE with its sentence; a missing reading is
UNREADABLE, never a FAIL):

| Grade | Reads | Holds |
| --- | --- | --- |
| G1 run | every drive | lines printed, a `done`, `alive` 4 (running in the foreground), no `<step>-missing` dump, no `unknown-step`, and (since the fix round) xcodebuild exited 0, a whole drive that exited otherwise UNREADABLE with its log's first `error:`. A drive whose app is not running at its end has its crash report read (`Tortie-*.ips` newer than the drive whose process path names the device): XCUITest's own (F3) is driven AGAIN on the same device, up to three drives in all; a death that left no report, once; a report with a Tortie frame nearer the fault than any of XCTAutomationSupport's is the app's own crash, a FAIL, never driven again. A last death is UNREADABLE, never a PASS |
| G2 the window | every dump's `window`, `chrome`'s `statusBar` | the row's measured window upright: 375 × 667 on the iPad and the SE, 402 × 874 on the iPhone 16 Pro; the navigation bar's top at least the status bar's bottom before any turn, the tab bar's bottom at the window's. Frames read inside an open menu (`terminal-menu` lines) are never compared with these (F5) |
| G3 End's mark | `end-bar` | Touch ID rows `kind` `touchID` and glyph `touchid`; Face ID rows `faceID` and `faceid`; `none` rows `passcode` and `lock`, enabled; no label on a Touch ID row holds "Face ID" |
| G4 the owner check | `end-dialog`, `faceid-permission`, `end-auth-up`, the door's events | enrolled rows: the dialog's title and body the door's `talk` row's `endConfirm` word for word; `end-auth-up` with `confirming` true; on a Touch ID row iOS's prompt label holds "Touch ID" and no first-use question is seen; on a Face ID row a first-use question, when iOS asks one, is accepted (this step saw it on 18.3's first End on a device, "Do you want to allow “Tortie” to use Face ID?", and never on 26.3); exactly ONE `POST /v1/end` answered 200 at the door, none before the answer; in the sample, End absent from the menu after (its copy ended) |
| G5 the passcode | `passcode-prompt`, `passcode-typed`, the door's events | `none` rows: the prompt found (`in` `coreAuth` on 18.3 with "Enter iPhone Passcode for “Tortie”" and the confirmation's `confirmLabel` among its texts; `springboard` on 26.3 with a secure field); typed; then exactly ONE `POST /v1/end 200`, none before the typing; or, if iOS ended the check before the field was found, `session-end-line` reads `Copy.endNotConfirmed` (read from `ios/Tortie/Style/Copy.swift`) and ZERO writes. Anything else FAILS |
| G6 Catch Me Up | `first`'s `turns` | turn 0 reached on the paired drive and on the sample (its book's first turn) |
| G7 the turn | T's `chrome` and `statusBar` | iPhone rows: sideways no navigation bar and no tab bar; upright again EVERY frame `chrome` reads (navigation bar, ⋯, status line, grid and tab bar) equals the reading before the turn within 0.5 pt, at once, after `idle:5`, after Back and reopen, and after a tab switch, and the tab bar's buttons keep their number, their row, their height and their place inside the tab bar (since the fix round never their x or width, which iOS 26.3 widens after a turn now and then at both builds, F2). **`touch-26` is STATED**: it passes as STATED only when every upright reading after the turn equals the parent's recorded one (`[0, 10, 375, 54]`, the grid `[0, 94, 375, 490]`; or `P3334_PARENT_IOS`'s live reading) and FAILS on any other difference; if it reads equal to before, PASS, and the line says F2 no longer reproduces. iPad rows: the window and every frame unchanged by the turn (F6) |
| G8 Release | R | install 0, appinfo 0 with the project's build, the Release drive's G1, G3, G4 and G6 |
| G9 the sample | S | `sample-label` in every dump inside the sample, the sample left onto Pairing, and G3 to G5 for the sample's End |
| G10 the kind | K | `sim.biometryKind` is the row's |

Exit 0 when every measurable row's every arm is PASS or STATED, 1 when one FAILED, 2 when one is UNREADABLE or no row is
measurable. The UNMEASURED rows print on every run and change no exit.

**Its cost**, budgeted from this step's runs: three builds (about 20, 60 and 20 s unloaded), then per row a boot (16 to
47 s) and four or five drives (45 to 150 s each), about 8 to 12 minutes a row, 70 to 90 minutes for rows 1 to 8 one after
another. One lock slot. A verifier's, never the battery's.

### 5.5 The test files (builder **tests**)

#### 5.5.1 `ios/TortieUITests/P316DriveUITests.swift`: `end-passcode:<digits>`

- `AfterAuth` (`:1464-1473`) gains `case passcode(String)`.
- `Drive.go()` gains, beside `end`: `step.hasPrefix("end-passcode:")` → `end(step: "end-passcode", after:
  .passcode(String(step.dropFirst("end-passcode:".count))))`. The digits are the step's own (`[0-9]{4,6}`, else the step
  prints `unknown-step`).
- In `end(step:after:)`, `case .passcode(let digits)`: look for iOS's passcode field, in this order and for up to 10 s,
  in `XCUIApplication(bundleIdentifier: "com.apple.CoreAuthUI")` when its state is not `notRunning`, then in SpringBoard:
  `root.secureTextFields.firstMatch`. Read the prompt ONCE through `root.snapshot()` (the labelled elements, at most 40,
  never `allElementsBoundByIndex`, which raced the prompt's own teardown in the spec step's first scratch drive and failed
  the test at "No matches found for Element at index 4"), and print
  `{"step":"passcode-prompt","for":step,"in":"coreAuth"|"springboard"|null,"texts":[…],"field":Bool}`. When the field is
  there, `typeText(digits + "\n")` and print `{"step":"passcode-typed","for":step,"in":…}`. Then do exactly what
  `.reread` does (the re-read, the face, the dump, the menu opened again). No loop polls the prompt: the spec step's
  0.5 s polling loop is the shape that drew F3's crash twice.
- The header's End paragraph gains two sentences: with nothing enrolled iOS asks for a passcode, and a Simulator takes
  any; `end-passcode:<digits>` types one where iOS draws its field.
- Nothing else in the file moves. `conformance:ios` (i), (l) and (x) read this file: no photograph, no Tailscale, no
  alert registration, which the step has none of.

#### 5.5.2 `ios/TortieTests/ScreenScrollerTests.swift`: the fitted row at any scale

- `:165`, `XCTAssertEqual(row, 6.67, accuracy: 0.34, "the fitted row")`, becomes
  `XCTAssertEqual(row, try Self.fittedRow(scale: view.traitCollection.displayScale), accuracy: 0.01, "the fitted row")`,
  with `static func fittedRow(scale: CGFloat) throws -> CGFloat` a table of the two measured scales, `3` giving `20.0 / 3.0`
  (the iPhone 16 Pro) and `2` giving `6.0` (the iPad Air 11-inch (M3) and the iPhone SE (3rd generation)), throwing a
  failure naming the scale ("no measured fitted row at <scale>x") for any other.
- The header's "All at the 337 build's own measured geometry (… 6.67 pt …)" gains "and 6.0 pt on a 2x screen (Phase
  333.4)". No other test moves: every other TortieTests case passed on both 2x devices at both runtimes, Debug and Release.

### 5.6 What does not move

Nothing under `ios/Tortie/` (the app): no Swift file, no word, no identifier, no `Info.plist` key, no project setting, no
build number (`CURRENT_PROJECT_VERSION` and `PHONE_BUILD` stay 10). Nothing under `src/` (no route, no contract line:
`git diff 5f5efba2 -- src/ docs/audits/contract-baseline.txt ios/Tortie ios/Tortie.xcodeproj` is empty).
`build/p316/probe-p316.mjs` and `build/p316/hostile-door.mjs` do not move. `RUNTIME_CURRENT` and `RUNTIME_FLOOR` do not
move.

---

## 6. The gates, clause by clause

| Gate | Moves | Why |
| --- | --- | --- |
| `gate:simulator` | rule 8 widened, rule 10 new, 4 fixtures, 10 ablations, floor 3 (§5.2) | §5.1 |
| `gate:checks` | one Xcode harness entry more (`probe:p3334`), which must refuse by name | §5.4 |
| `gate:background` | `probe:p3334` starts the honest door as a long-lived child, ended in a `finally` that names it | the rule, asked per start |
| `conformance:ios` | no rule moves; it reads the two edited test files and must stay green | §5.5 |
| `ablation:p316` | no arm moves; run once because files under `ios/` moved, every arm still red on the rule that owns it | the task's rule |
| `conformance:phonecopy` | nothing (no word moves) | |
| `gate:contract` | nothing | no contract line |

---

## 7. The proof, run rather than read

### 7.1 The battery (the integrator, then the committer at landing)

`npm run typecheck`, `npm run build` (which runs `gate:simulator`, `gate:checks` and `conformance:ios` inside it),
`npm test` (the whole vitest), `npm run conformance:ios`, `npm run gate:simulator`, `npm run gate:checks`,
`npm run gate:background`, `npm run ablation:p316`, `node build/p3334/probe-p3334.mjs --grader-self-test` and
`node build/p316/test-ios.mjs --self-test`. Then, under the lock, `test:ios` on EVERY measurable matrix row (§7.2).

### 7.2 `test:ios` on every measurable row (the integrator; Debug and Release each)

| Rows | Command | Must read |
| --- | --- | --- |
| `ipad-26` | `P316_DEVICE='iPad Air 11-inch (M3)' npm run test:ios` | 0 failures in Debug and Release (F1 fixed), every listed suite run |
| `ipad-18` | `P316_DEVICE='iPad Air 11-inch (M3)' P316_RUNTIME=18.3 npm run test:ios` | the same |
| `touch-26` | `P316_DEVICE='iPhone SE (3rd generation)' npm run test:ios` | the same |
| `touch-18` | `P316_DEVICE='iPhone SE (3rd generation)' P316_RUNTIME=18.3 npm run test:ios` | the same |
| `face-26`, `none-26` | `npm run test:ios` | as today (one device type; enrolment does not reach the unit tests) |
| `face-18`, `none-18` | `P316_RUNTIME=18.3 npm run test:ios` | as today |

At the parent the four 2x rows each read 827 Debug and 824 Release tests with 1 failure each, the same test (F1).

### 7.3 XCTest (builder **tests**)

The builder runs `npm run conformance:ios` (no Simulator). The integrator's `test:ios` rows run `ScreenScrollerTests`; the
UI step runs only inside `probe:p3334`.

### 7.4 `probe:p3334` (builder **probe** writes it; the verifier drives it)

Every measurable row, at HEAD, under one slot and with no other Simulator run beside it: `npm run -s probe:p3334`. With
`P3334_PARENT_IOS` set for G7's side by side. Its exit and every arm's line go in the verdict.

### 7.5 What the verifier must produce

1. The battery's exit codes (§7.1), re-run once.
2. `probe:p3334` over rows 1 to 8 at HEAD: every arm PASS, `touch-26:G7` STATED with the parent's reading; rows 9 to 11
   printed UNMEASURED with their reasons.
3. **The parent, measured again (the independent method)**: `test:ios` with `P316_DEVICE='iPad Air 11-inch (M3)'` at the
   parent fails exactly F1 and at HEAD passes (the parent clone needs §5.3's two lines, as this step's did); G7 on
   `touch-26` with `P3334_PARENT_IOS` reads `[0, 10, 375, 54]` after the turn at both builds.
4. `test:ios` on at least `ipad-26` and `touch-18`, 0 failures.
5. Counted once at the end: `xcrun simctl list devices | grep -c p316-` reads 0, none booted; his history stats unmoved.

### 7.6 The independent method: the attack

Beyond re-running what the builders ran, the verifier ATTACKS:
- in a scratch copy of the helper, the kind test dropped (Face ID's name on a Touch ID device): `gate:simulator` over it
  is red, and a `touch-26` End through it still ends the session (D5's cross-answer), which is WHY the gate holds the name;
- `--grader-self-test`'s graders fed a `touch-26` reading whose bar after the turn is `[0, 12, 375, 54]` (G7 FAIL, not
  STATED), a `face-26` reading at `[0, 52, 402, 54]` (G7 FAIL), a Touch ID row whose glyph is `faceid` (G3 FAIL), a `none`
  row with two `POST /v1/end` or one before the typing (G5 FAIL), and a drive whose app died twice (G1 UNREADABLE, never
  PASS);
- `P316_RUNTIME=27 npm run -s probe:p3334` exits 2 with the iOS 27 sentence, nothing created; `P3334_ROWS=duo-27.1` the same.

### 7.7 No regression against today

The Face ID control rows (`face-26`, `face-18`) pass G1 to G10 at HEAD. `probe:p316`'s `end` group is not re-run for this
phase: its `biometry('match')` on the iPhone 16 Pro posts the same `pearl` name as before, which G10 and the controls' G4
prove, and its sideways readings (337.3's) are G7 on `face-26` and `face-18`, `[62, 0, 750, 382]` and `[62, 0, 750, 381]`
at the parent and at HEAD. Nothing in the app changes, so no person's phone can read differently.

---

## 8. The CHANGELOG item

None: nothing a person can do changes and nothing goes wrong less (CHANGELOG.md's own rule). The commit body carries the
matrix and F2.

## 9. CLAUDE.md (the integrator)

- The `gate:simulator` row: since Phase 333.4 a device's biometry is its device type's (`capabilities.plist`, read before
  the create), `handle.biometry` posts Touch ID's `fingerTouch` names on a Touch ID device, the floor is 3, and the counts
  (bad fixtures, controls, ablations).
- The `test:ios` probe row: `P316_DEVICE` beside `P316_RUNTIME`.
- A new probe row, `probe:p3334`, in the house shape: when (`build/simulator-run.mjs`'s device types or biometry,
  `build/p3334/**`, the UI drive's End steps, before an App Review submission), cost (70 to 90 minutes for rows 1 to 8,
  one slot, no Electron), what it drives and refuses, and that `touch-26`'s turn is STATED (F2).

## 10. Builders, disjoint files

| Builder | Files (and no other) | Task |
| --- | --- | --- |
| **harness** | `build/simulator-run.mjs`, `build/assert-simulator-teardown.mjs`, `build/p316/test-ios.mjs` | §5.1, §5.2, §5.3. Runs `npm run gate:simulator` (the floor of 3 stays red until the probe exists; every other clause green), `node build/p316/test-ios.mjs --self-test`, `npm run typecheck`, `npm test`. Boots no Simulator |
| **probe** | `build/p3334/probe-p3334.mjs` (new), `build/p3334/fixtures/*.json` (new), `package.json`, `build/verification-checks.mjs` | §5.4. Codes against §5.1's API exactly (`DEVICE_TYPE_IPAD`, `DEVICE_TYPE_TOUCH_ID`, `handle.biometryKind`, `handle.deviceType`) and §5.5.1's step and lines (`end-passcode:<digits>`, `passcode-prompt`, `passcode-typed`). Runs `node build/p3334/probe-p3334.mjs --grader-self-test`, `npm run gate:checks`, `npm run gate:background`, `npm run typecheck`. Boots no Simulator |
| **tests** | `ios/TortieUITests/P316DriveUITests.swift`, `ios/TortieTests/ScreenScrollerTests.swift` | §5.5. Runs `npm run conformance:ios` and, for the Swift, an `xcodebuild build-for-testing` through `xcodebuildRun` into its scratch (nothing boots). Boots no Simulator |
| (integrator) | `CLAUDE.md`, and reconciling the seams | §9; the battery of §7.1 and `test:ios` on every row of §7.2 under the lock |

No file is in two lists.

## 11. What this sends to him and to other phases

- **To him, for rows 9 to 11.** The iOS 27 rows need Xcode 27 and its iOS 27 Simulator runtime, and Xcode 27 needs macOS
  Tahoe 26.6 or later on Apple silicon (read from a third-party summary citing Apple's compatibility table and release
  notes, not from Apple's own page, which this step did not read; release build 27A266a, 14 September 2026; the runtime is a
  separate download of several gigabytes). This Mac runs macOS 15.7.9 with Xcode 26.3 (17C529). The iPhone Duo Simulator is
  reported with the Xcode 27.1 beta. Once he installs them, `P316_RUNTIME=27 npm run -s probe:p3334` measures rows 9 and 10
  with no code change; row 11 needs its measured device type name written into `MATRIX` by a later round.
- **To him, F2.** On an iPhone SE (2nd or 3rd generation) on iOS 26.3, turning the Terminal sideways and back leaves the top
  bars 10 points higher, under the clock, until the app is next launched; four changes to Tortie's own Terminal code did not
  move it, iOS 18.3 and Face ID iPhones never do it. Inside See a sample, which is what a reviewer without a Mac opens, the
  same turn moves the top 20 points, and Leave sample's top sits under the clock (24 of its 44 points stay below it and it
  still presses); App Review's iPad never turns the app (F6). He decides whether a later phase chases it (Apple feedback, or
  a workaround measured on a device), or whether it waits for an iOS update.
- **To him, the key bar on a 375-point window** (found by the verify round's attack lens). On the iPhone SE and on the iPad in
  compatibility mode the Terminal's key bar gives `return` 41.5 points where it takes 59.7 on the iPhone 16 Pro (402
  points), and at Accessibility XXXL `⇧tab`, `ctrl` and `return` get 34 points each and the arrows grow from 30 × 36 to
  36 × 44; every key stays inside the window and hittable, at 26.3 and 18.3 alike. It is unchanged since Phase 337 and is
  the same in build 10. Not fixed here, by the fix round's decision: a fix moves the app and so the build to 11, and how the
  word is drawn inside a key cannot be read as a frame or a label, so no drive this phase allows could prove a fix (no
  photograph). His call: a horizontally scrolling bar, a single line with a measured minimum scale, or tighter padding so
  the bar's ideal width (about 402.5 points) fits 375.
- **To him, End's mark after Touch ID is unenrolled** (a nit from the same lens, Phase 317's, not this phase's). End's mark is
  decided when a session's screen opens and refreshed only when the app returns to the foreground, so a session opened
  before Touch ID was unenrolled still draws the Touch ID mark while iOS asks the passcode; the session still ends
  correctly. Refreshing the kind when the ⋯ menu opens would close it.
- **To the main session.** No new build: build 10, already archived, is what App Review gets. The UI drive's `end-passcode`
  step is available to `probe:p316` if a later phase wants the passcode path there.
- **To a later phase.** An iPad layout, if he ever wants one, starts from F6 (the window stays upright) and D14 (the words
  say iPhone).

## 12. What is NOT in this phase

- **No iPad app.** `TARGETED_DEVICE_FAMILY` stays 1, no iPad layout is designed, and no word says "iPad".
- **No screenshot**, no screen recording, **no physical device**, and **no install by an agent**: no runtime, no Xcode, no
  download.
- **No release**, and no new build number.
- No change to the app: F2 is stated and sent to him, not chased into iOS.
- No change to `probe:p316`'s arms or its device (D7).
- No wrong-passcode arm: a Simulator takes any passcode (D9).
- No IPv6-only measurement: it stays UNMEASURED, as the entry accepted.
- No Mac change.

## 13. Open concerns handed to the verifier

1. **Load, and iOS 18.3.** At load averages of 400 to 956 three drives died inside XCUITest (F3), all on iOS 18.3 devices,
   and timings stretched (a 70 s drive took 278 s). Run `probe:p3334` with no other Simulator run beside it. The verify
   round found F3 is iOS 18.3's at any load (15 of 69 drives there, 0 of 61 on 26.3, at load averages of 7 to 78), and
   the fix round made G1 read each death's crash report and drive again up to three times (§3 F3).
2. **The cross-answer (D5).** Because either BiometricKit name answers either kind, no drive can prove the helper posts the
   right name; the gate's rules 8 and 10 are that proof, and the attack in §7.6 shows why.
3. **The passcode prompt's surface moves between runtimes** (CoreAuthUI on 18.3, SpringBoard on 26.3). G5 must accept
   both and nothing else, and must never pass a row where no field was found AND a write was sent.
4. **F2 is graded STATED against a recorded reading.** If iOS 26.3's own layout ever reads differently (another Simulator
   build), G7 fails on `touch-26`; run with `P3334_PARENT_IOS` before calling it a regression.
5. **The parent clone** for `P3334_PARENT_IOS` uses the parent's own UI test, which has no `end-passcode` step; the T drive
   it runs uses none.

## 14. What the spec step measured, how, and the numbers

All under the scratch `…/scratchpad/p3334/spec/`, scripts outside `build/` importing `withSimulator`, `xcodebuildRun` and
`countDevicesNamed` from the worktree's `build/simulator-run.mjs` and `hostileDoorArgv` from `build/p316/hostile-door.mjs`.
Load averages ran from 3 at the start to 956 at the worst, while up to three slots ran at once; memory never fell below
35 percent free.

| # | What | Command | Exit | Numbers |
| --- | --- | --- | --- | --- |
| M0 | The toolchain | `xcodebuild -version`; `xcodebuild -showsdks`; `xcrun simctl runtime list`; `sw_vers` | 0 | Xcode 26.3 (17C529); iOS SDK 26.2 (the only one); runtimes iOS 18.3.1 (22D8075), iOS 26.3.1 (23D8133), watchOS 26.2; macOS 15.7.9 (24G830); CoreSimulator 1051.17.8; the 26.3 runtime's `minHostVersion` 14.0.0 |
| M1 | The device types | `xcrun simctl list devicetypes -j`; each runtime's `supportedDeviceTypes` from `simctl list runtimes -j` | 0 | 121 types; iPad Air 11-inch (M3), iPhone SE (3rd generation) and iPhone 16 Pro in both runtimes (58 types on 18.3, 62 on 26.3); iPhone 17 Pro on 26.3 only; none names Duo or Fold |
| M2 | The biometry of every iPhone and iPad type | `plutil -convert json -o - <bundlePath>/Contents/Resources/capabilities.plist` over the 82 | 0 | 50 `pearl-id`, 32 `touch-id`, 0 both, 0 neither; the iPad Air 11-inch (M3) and the SE `touch-id`, the iPhone 16 and 17 Pro `pearl-id` |
| M3 | The parent on the iPad | the measurement script's `ipad-26`, `ipad-18`, `ipad-26-sample-release`, `ipad-18-sample-release` rows | every drive's xcodebuild 0 | install 0, appinfo 0 on both runtimes; window 375 × 667; Release drives 44 s and 48 s, Release sample walks with End 128 s and 117 s; paired 133 s and 102 s; sample 138 s and 117 s; boots 21 to 32 s |
| M4 | Touch ID on the SE, by Touch ID's name | rows `se-26`, `se-18`, `se-18-sample` | 0 | `touchid`, prompt "Touch ID for “Tortie”" (buttons Cancel, Cancel), one `POST /v1/end 200` per End, through `xcrun simctl spawn <this run's udid> notifyutil -p com.apple.BiometricKit_Sim.fingerTouch.match` |
| M5 | The cross-answer | `se-26`'s and `se-18-turn`'s pearl drives (the parent helper's `biometry('match')` on the SE); `control-26-turn`'s other drive (`fingerTouch.match` on the iPhone 16 Pro) | 0 | each ended its session: one `POST /v1/end 200` each |
| M6 | The Release builds | `build-for-testing -configuration Release` without testability; with `-only-testing:TortieUITests`; with `ENABLE_TESTABILITY=YES`; `build -configuration Release` | 65, 65, 0, 0 | 20.9 s, 1.4 s, 58.6 s, 20.6 s; the failure `AlertsTests.swift:4:18: Unable to find module dependency: 'Tortie'`; the shipping app's `UIDeviceFamily` [1], `MinimumOSVersion` 18.1, `CFBundleVersion` 10, `DTSDKName` iphonesimulator26.2 |
| M7 | Nothing enrolled, the parent's drives | rows `nobio-26` (paired with `end-read`, sample with `end`) | 0 | End `passcode`/`lock`, enabled; the paired drive `first-missing`, the sample `tab-settings-missing` behind the prompt (F4) |
| M8 | The passcode prompt | scratch UI drives `wt-parent` (patch 1) and `wt-pc2` (patch 2: one `snapshot()` read of CoreAuthUI and SpringBoard every 0.5 s, then `typeText("1234\n")`), rows `nobio-26-pc`, `nobio-18-pc`, `nobio-26-pc2`, `nobio-18-pc2` | patch 1: 26.3 cancel 65 and try 0, 18.3 both 65 (its own element enumeration raced the prompt); patch 2: 26.3 both 0, 18.3 cancel 0 with the app then dead and try 65 after the write (both F3) | 18.3: CoreAuthUI state 4 with "User Authentication", "Enter iPhone Passcode for “Tortie”", "End session", "Passcode field", a keyboard whose return key reads "Go"; 26.3: CoreAuthUI not running, a secure field in SpringBoard; typed, the check ended in 1.5 s (26.3) and 1.6 s (18.3) with one `POST /v1/end 200` each; untyped, still up after 40 s, no "Cancel" button found; once (patch 1, 26.3) it ended by itself with "Not confirmed. Nothing was changed." and no write |
| M9 | The turn and its four candidates | rows `se-26-turn`, `control-26-turn`, `se-18-turn`, `control-18`, `se2-26-turn`; `se-26-fix1` (`.statusBarHidden` removed), `se-26-fix2` (the navigation bar left drawn), `se-26-fix3` (both `.toolbarVisibility` and `.statusBarHidden` removed), `se-26-fix5` (`.visible` upright); `control-26-fix1`, `se-18-fix1`, `control-18-fix1` | 0 | SE 26.3 at the parent and with every candidate: upright after the turn `[0, 10, 375, 54]`, grid `[0, 94, 375, 490]`, through idle, reopen and a tab switch; SE (2nd generation) 26.3 the same; SE 18.3, iPhone 16 Pro 26.3 and 18.3: every frame equal, with and without fix1; with fix1 the iPhone 16 Pro's sideways grid still `[62, 0, 750, 382]` (iOS hides the status bar sideways itself) |
| M10 | The parent's unit tests on 2x screens | `P316_DEVICE=… P316_RUNTIME=… node build/p316/test-ios.mjs` in a scratch clone with §5.3's two lines, for the iPad and the SE at 26.3 and 18.3 | 1, 1, 1, 1 | each Debug 827 run 1 failure, Release 824 run 1 failure, the same assertion (F1); 84.8 to 102.3 s per Debug run |
| M11 | The crash reports | `~/Library/Logs/DiagnosticReports/Tortie-2026-10-13-{204952,212827,213018}.ips`, the three whose process path is under a device this step made | read | F3's frames, each `EXC_BAD_ACCESS (SIGSEGV)` at 0x0 in `_platform_strcmp` under `XCTAutomationSupport runtime_issue_os_log_fault_callback` |
| M12 | The gates at the parent | `node build/assert-simulator-teardown.mjs`; `node build/conformance-ios.mjs` | 0, 0 | 557 scripts, 2 users of floor 2, 16 of 16 bad fixtures, 13 controls, 33 of 33 ablations; 50 rules over 52 app files and 70 test files |
| M13 | Xcode 27's requirement | one web search (third-party summary) | n/a | Xcode 27 requires macOS Tahoe 26.6 or later on Apple silicon; the iOS 27 runtime is a separate download; iPhone Duo's Simulator came with the Xcode 27.1 beta. Not read from Apple's own page |

29 devices were made (the 25 driven rows above and the four `test:ios` runs' own), every one shut down and deleted by the helper
(`deviceStillListed false` on each); `xcrun simctl list devices | grep -c p316-` read 0 at the end with none booted. His
history read `737549 1791921744` and `23166 1790702242` at the first command and the last.

---

## §As built (the integrator, 2026-10-14)

**What landed is what §5 says, and no line of the app moved.** `git diff --stat 5f5efba2 -- src/ docs/audits/contract-baseline.txt
ios/Tortie ios/Tortie.xcodeproj` prints nothing (0 lines), so `CURRENT_PROJECT_VERSION` and `PHONE_BUILD` stay 10, the build
already archived for TestFlight is the one App Review gets, and there is no CHANGELOG item (§8, D13). The delta is 23 files: this SPEC;
`build/simulator-run.mjs`, `build/assert-simulator-teardown.mjs`, `build/p316/test-ios.mjs` (builder harness);
`build/p3334/probe-p3334.mjs`, the 13 readings in `build/p3334/fixtures/`, `package.json`, `build/verification-checks.mjs`
(builder probe); `ios/TortieUITests/P316DriveUITests.swift`, `ios/TortieTests/ScreenScrollerTests.swift` (builder tests);
`CLAUDE.md` and this section (the integrator).

**Where the builders went past §5, each kept, with the reason.**
- Harness: **50 one-clause helper ablations, not 43**, and **8 `biometryOf` fixtures, not 6**. The seven extra ablations cover
  clauses §5.2's ten left unproved (the path the kind is read from, the type row from `pickDeviceType`, assigned once, each
  getter, the table frozen, the loop over `notifies`); the two extra fixtures are the shapes every real device type has
  (both keys present, one `false`), which a `biometryOf` that wanted the other key ABSENT would pass the six and fail on every
  device. `biometryOf` is driven both as imported and as its own text (`new Function`), as `assert-docker-teardown.mjs` does,
  so a text ablation reads red. `deviceType` and `biometryKind` are getters, so "read only" is enforced.
- Probe: **the iPhone SE's sideways grid is pinned at `[0, 0, 667, 375]`** beside the iPhone 16 Pro's `[62, 0, 750, 382]` and
  `[62, 0, 750, 381]`. The integrator kept it because it is measured, not designed: the spec step's kept parent drives read it
  at seq 9 (`landscape`) of `lines-se-26-turn-turn-41310-1.txt` and `lines-se-18-turn-turn-41310-5.txt`, on both runtimes.
  Its one-clause grader ablations: 53 of 53 red (the builder's scratch `ablate.mjs`).
- Tests: **one new unit test**, `testTheFittedRowIsMeasuredAtTwoScalesAndNoOther`, so the 2x row and the named refusal can
  fail on ANY device (the edited assertion alone could fail at 2x only on a 2x device, and the refusal on none); it puts
  Debug at 828 and Release at 825, one above the parent on every row. And `passcode-prompt` carries a `read` key naming whose
  snapshot the texts came from when no field was found.

**The seams, reconciled.** The probe codes against the harness's exports as written (`DEVICE_TYPE_IPAD`,
`DEVICE_TYPE_TOUCH_ID`, `sim.biometryKind`, `sim.deviceType`) and against the UI test's lines as written (`end-passcode:1234`,
`passcode-prompt` with `in`, `read`, `texts`, `field`, then `passcode-typed` with `in`); its reactor writes `auth-<seq>` at once
on a `none` row, which the UI test waits for before it looks for iOS's field. Nothing needed changing.

**CLAUDE.md, one row each.** `gate:simulator` widened (the floor 3 naming the probe, rule 10, rule 8 widened, 18 bad fixtures,
15 controls, 50 ablations: every count equal to the gate's own PASS line below); a new `probe:p3334` row directly under
`probe:p316`'s; `test:ios` widened by one clause for `P316_DEVICE`. `conformance:ios` is not touched (no rule moved; 50 rules
at the parent and here) and neither is `probe:p316` (no arm moved, D7). The first two edits were made by an earlier integrator
run of this phase on 2026-10-13 (22:00 to 00:03), which was interrupted before it returned; this run read both rows against
the gates' own output and kept them, added the third, and re-ran every command below itself. That run's leftovers (its
derived data `dd-touch26*`, 975 MB, and two ablation clones `/private/tmp/p316-ablation-{z72AmF,m84xXx}`, 80 MB each, whose
times match its logs and which no process named) were removed.

### The battery, each run once (one re-run where a red one had to be caught)

| Command | Exit | Time | Numbers |
| --- | --- | --- | --- |
| `npm run typecheck` | 0 | 2.3 s | import boundaries 1,427 files, 0 violations; 0 runtime cycles |
| `npm run build` | 0 | 42 s | inside it `gate:simulator` PASS, `conformance:ios` PASS, `gate:checks` PASS, `gate:contract` and the rest green |
| `npm test` | **1**, then **0** | 76 s, then 55 s | first run: 1 of 21,139 failed, `src/renderer/editor/__tests__/p282-view-presses.test.ts:541` "A HELD KEY IS ONE PRESS" (`"alpha"->"ALPHA"` for `"beta"->"BETA"`), at a load average near 14; that file alone 3 runs of 3 green (7 of 7); the whole suite once more: 1,133 files passed and 1 skipped, 21,132 tests passed and 7 skipped. Nothing under `src/` moved in this phase, so it is a timing flake of Phase 282's test, not this phase's |
| `npm run conformance:ios` | 0 | 4.3 s | 50 rules over 52 app files, 70 test files and 136 files under `ios/` |
| `npm run gate:simulator` | 0 | 0.6 s | 558 scripts read; 3 reach the helper against a floor of 3; 8 of 8 capabilities read as the type's own; 18 of 18 bad fixtures caught; 15 controls left alone; 50 of 50 helper ablations red |
| `npm run gate:checks` | 0 | 0.5 s | 269 check scripts classified; 3 Xcode harness entries refuse by name |
| `npm run gate:background` | 0 | 1.4 s | 560 files read, 3 start a process they do not wait for, each ended in a `finally`; 19 of 19 fixtures |
| `npm run ablation:p316` | 0 | 2,719 s | 533 of 533 arms red on the rule that owns them, every rule (a) to (az) able to fail, the clone removed, the tree unmoved (run beside the `test:ios` rows; load averages up to 450, from another phase's Simulator run) |
| `node build/p3334/probe-p3334.mjs --grader-self-test` | 0 | 56 ms | 146 cases over 13 fixtures |
| `node build/p316/test-ios.mjs --self-test` | 0 | 11.5 s | doors, frozen, sample book, and the device's 10 checks |
| `git diff --stat 5f5efba2 -- src/ docs/audits/contract-baseline.txt ios/Tortie ios/Tortie.xcodeproj` | 0 | | empty |

### `test:ios` on every measurable row (§7.2), one at a time, each under its own lock slot

Each with `P316_DERIVED_DATA` under the integrator's scratch, removed after the row; each device made and deleted by
`withSimulator` (`deviceStillListed false`).

| Rows | Device, runtime | Debug | Release | Exit | Wall |
| --- | --- | --- | --- | --- | --- |
| `ipad-26` | iPad Air 11-inch (M3), iOS 26.3.1 | 828 run, 0 failures (84.0 s) | 825 run, 0 failures (86.8 s) | 0 | 317 s |
| `ipad-18` | iPad Air 11-inch (M3), iOS 18.3.1 | 828, 0 (86.0 s) | 825, 0 (72.0 s) | 0 | 310 s |
| `touch-26` | iPhone SE (3rd generation), iOS 26.3.1 | 828, 0 (91.8 s) | 825, 0 (78.2 s) | 0 | 401 s |
| `touch-18` | iPhone SE (3rd generation), iOS 18.3.1 | 828, 0 (97.6 s) | 825, 0 (92.7 s) | 0 | 368 s |
| `face-26`, `none-26` | iPhone 16 Pro, iOS 26.3.1 | 828, 0 (86.4 s) | 825, 0 (65.2 s) | 0 | 329 s |
| `face-18`, `none-18` | iPhone 16 Pro, iOS 18.3.1 | 828, 0 (83.4 s) | 825, 0 (69.7 s) | 0 | 276 s |

**F1 is fixed on every 2x row**: the parent read 827 and 824 with 1 failure each (§14 M10); HEAD reads 828 and 825 with none.
Every row's device archive read `1 Mach-O file(s), none links NetworkExtension or TailscaleKit, none carries code coverage,
no DEBUG seam, and it asks Apple for its alert address; unsigned` (PASS_WORDS unmoved), and every per-configuration line named
its device, e.g. `TortieTests (Release) on iPad Air 11-inch (M3), iOS 26.3.1: …`. The helper's boot line named the kind it
read from the device type: `iPhone SE (3rd generation) (touchID)`, `iPhone 16 Pro (faceID)`.

**Not run by the integrator, by §0 and §7.4:** `probe:p3334` over the matrix, which is the verifier's (the UI step
`end-passcode` therefore runs for the first time there).

### Counted once, at the end

`xcrun simctl list devices | grep -c p316-` read **0**, with nothing booted. During the `touch-26` and `touch-18` rows one
other `p316-` device was booted, `p316-73654-1`, made by another phase's `test:ios` (pid 73654, `/private/tmp/wt-p33311`, its
own lock slot); the helper printed it as not this run's and left it alone, and it was gone before the count. His history
read `737549 1791921744` and `23166 1790702242` before the first command, around every command and after the last.

## §As built — the fix round (2026-10-14 and 15), run once

Two verdicts came back `needs_work`: the devices lens (the parent and HEAD side by side on all eight rows) and the attack
lens (Dynamic Type, both orientations, Touch ID failing, the passcode, 26 one-clause ablations). Both found the same major
problem; between them they found five minors and five nits. Every major and minor is fixed or stated below, with its
source. **No line of the app moved**: `git diff --stat 5f5efba2 -- src/ docs/audits/contract-baseline.txt ios/Tortie
ios/Tortie.xcodeproj` is still empty, so the build stays 10 and there is no CHANGELOG item. An earlier instance of this
fixer was cut off at 20:32 after making one edit (rule 10 of the gate, below; its scratch is `…/p3334/fixer/`). This run
read that edit, kept it, re-ran the gate over it, and did everything else.

**Files the fix round changed.** `build/p3334/probe-p3334.mjs`; three new fixtures in `build/p3334/fixtures/`
(`touch-26-turn-settled.json`, `face-26-turn-widened.json`, `f3-crash-report.json`); `build/assert-simulator-teardown.mjs`;
this SPEC (§1, §3 F2 and F3, §5.4 G1 and G7, §11, §13 concern 1, and this section); `CLAUDE.md` (the `gate:simulator` and
`probe:p3334` rows).

### Each problem, what was done, and where the decision comes from

| # | Lens | Severity | Problem | Done |
| --- | --- | --- | --- | --- |
| 1 | both | major | G7 compared the tab buttons' frames after a turn, and iOS 26.3 sometimes widens them (100 to 108.5 points on the SE, 99.67 to 108.33 on the iPhone 16 Pro) at both builds. That gave false FAILs: `touch-26` against the recorded parent, and once the `face-26` control | **Fixed.** `tabButtonDifferences` holds each button by its number, its row (y), its height and its place inside its own reading's tab bar, never by its x or width. F2 is held by the bars it moves: the navigation bar, the ⋯, the status line, the grid and the tab bar. Both lenses proposed this. The recorded parent reading is kept as recorded (it is a real measurement), and the self-test grades both button states STATED against it, from two REAL drives cut by the probe builder's own `cut()` from the attack lens's kept lines: `touch-26-turn-settled` (HEAD, buttons 100 wide) and `face-26-turn-widened` (HEAD, 108.33 wide, a PASS). The self-test also covers: the bars 12 points high, the grid moved, the bar at 52, the tab bar moved, a button outside the bar, a button gone and a button taller, each FAIL; and a button only narrower on 18.3, which is no longer compared (PASS). The touch-18 case that edited only x and width now moves the button down instead |
| 2 | devices | minor | F3's account (load averages of 400 to 956) was wrong. It is iOS 18.3's at any load, and one drive again left a row UNREADABLE about one run in four | **Fixed.** The account is corrected (§3 F3, §13). G1 now reads each death's crash report: only `Tortie-*.ips` newer than the drive, under `~/Library/Logs/DiagnosticReports` and its `Retired/`, kept only when its process path names that device. If no Tortie frame is nearer the fault than the first XCTAutomationSupport frame, it is XCUITest's crash, and the drive is driven again, up to three drives in all. A death with no report is driven again once. A report that is the app's own crash is a FAIL and is never driven again. The lens proposed this. The classifier was run over every Tortie report on this Mac first: 27 of 27 read `xcuitest`, with the XCTAutomationSupport frame at index 1. The probe's header now names the one read it makes under the home |
| 3 | devices | minor | The earlier devices instance left `p316-21024-4` booted and `electron.lock` held | **Not touched**, by the hard rule (a device this run did not make). By 00:07 on 2026-10-15 both were gone (count 0, all three slots free). This run did not do that |
| 4 | attack | minor | Rule 10 stayed green when the `plutil` read was made conditional on the caller's options | **Fixed** (the earlier fixer instance's edit, kept). `deviceKindShape` captures everything between `const <read> =` and `await run('plutil'`. It holds that span to the bundle path guard alone (`CAPABILITIES_GUARD_RE`), and requires the statement to name no `options`. Two helper ablations were added: the lens's own (`options?.deviceType !== undefined && …`) and a stand-in read taken from `options`. The gate now reads 52 of 52 red, and `abl-check.mjs` shows each new ablation named by its clause |
| 5 | attack | minor | F2 inside See a sample is 20 points, not 10, and the sample walk does not turn | **Stated** in §1, §3 F2 and §11, with the lens's frames. Adding a turn to the S walk, which the lens left optional, was **not** done. A STATED grade needs a recorded parent reading, and the only reading is one attack drive through patched UI steps. Because the app is byte-identical, the parent reads the same |
| 6 | attack | minor | The key bar's `return` key gets 41.5 points on a 375-point window, and 34 at AX XXXL | **Stated and sent to him** (§1, §11), not fixed. The lens itself called it his call and cosmetic. A fix moves the app, so the build moves to 11 and a new TestFlight archive is needed. How the word is drawn inside a key is neither a frame nor a label, so no drive this phase allows could prove a fix (no photograph). Every key stays inside the window and hittable |
| 7 | devices | nit | Importing the probe for its graders ran `main()` | **Fixed.** `invokedDirectly()` compares the realpath of `process.argv[1]` with this module's realpath (the house pattern of `build/docker-run.mjs`, made symlink-safe). An import now starts nothing: measured, 43 exports and no exit code. A run through `/tmp`'s symlink still runs |
| 8 | attack | nit | G1 never read xcodebuild's exit code | **Fixed.** If a whole drive exits non-zero, G1 reads it as UNREADABLE and gives the first `error:` line of the drive's own log. A stall reads FAIL as before. Every live drive that came back alive exited 0 in all three runs below and in the devices lens's run |
| 9 | attack | nit | End's mark is refreshed only on foreground (Phase 317) | Noted for him (§11). Not this phase's |
| 10 | attack | nit | `closeTerminalMenu` does not close the menu on the iPad at AX XXXL | Nothing to do. It is the harness's, and this phase has no AX arm |
| 11 | devices | nit | His history moved during the lens's run | Nothing to do. It did not move in this run (below) |

**The fix proved red.** `ablate.mjs` (in this round's scratch, not committed) breaks one clause at a time in a copy outside
the tree. The copy uses the tree's helper, fixtures and `ios/` through symlinks. Results: **19 of 19 arms red, and the
unedited copy green.** The six G7 arms: whole frames again; the row not compared; the height not compared (red after its
case was made to move the height alone); outside the bar not refused; the count not compared; the buttons not compared at
all. Three `crashClass` arms, two `crashOn` arms, two `deathReports` arms, three `driveAgain` arms, and three G1 arms (the
app's crash not failed, the exit code not read, a last death read as a pass).

### Commands, each with its exit and numbers

His history read `737736 1792023873` and `23166 1790702242` before the first command of this run, around every command
that started a shell or a Simulator, and after the last. It did not move.

| Command | Exit | Numbers |
| --- | --- | --- |
| `node build/p3334/probe-p3334.mjs --grader-self-test` | 0 | 184 cases over 16 fixtures (was 146 over 13) |
| `npm run gate:simulator` | 0 | 558 scripts; 3 against a floor of 3; 8 of 8 capabilities; 18 of 18 bad fixtures; 15 controls; **52 of 52** helper ablations red |
| `npm run gate:background` | 0 | 560 files, 3 start a process, each ended in a `finally`; 19 of 19 fixtures |
| `npm run gate:checks` | 0 | 269 check scripts; 3 Xcode harness entries refuse by name |
| `npm run typecheck` | 0 | 1,427 files, 0 violations, 0 cycles |
| `npm run build` | 0 | 38 s; inside it `gate:simulator`, `conformance:ios` (50 rules), `gate:checks` and `gate:contract` green |
| `npm test` | 0 | 59 s; 1,133 files passed and 1 skipped; 21,132 tests passed and 7 skipped |
| **Run A**: `probe:p3334`, rows 1 to 8, `P3334_PARENT_IOS` = `git archive 5f5efba2 ios` | **0** | 4,124 s; **70 arms: 69 PASS, 1 STATED (`touch-26:G7`, against the parent's live drive), 0 FAIL, 0 UNREADABLE**; rows 9 to 11 printed UNMEASURED with their reasons; `run:devices` PASS |
| **Run B**: `P3334_ROWS=touch-26,face-26`, no parent (the recorded reading) | **0** | 1,013 s; 19 arms: 18 PASS, 1 STATED (`touch-26:G7` against the recorded parent) |
| **Run C**: the same again | **0** | 1,018 s; 19 arms: 18 PASS, 1 STATED |

The devices lens's run of the same probe read 67 PASS, 1 FAIL (`touch-26:G7`) and 2 UNREADABLE (`ipad-18` G1 and G9). Run A
reads none of either. Each run held one lock slot (`electron.lock2`), taken and released on the same command line, and had
no other Simulator run of this phase beside it.

**G7 re-graded both ways over the runs' own kept lines** (`regrade.mjs`). The fixed probe was compared with a copy whose
only change is the builder's whole-frame comparison of the tab buttons:

| Drive | Tab button 0's width after the turn (five readings) | Fixed | Builder's rule |
| --- | --- | --- | --- |
| A `touch-26` T, against the recorded parent | 100 throughout | STATED | **FAIL** |
| A `touch-26` T, against the parent's live T (also 100) | 100 throughout | STATED | STATED |
| A `face-26` T (the control), and the parent's live T | 108.33, 108.33, then 99.67 | PASS | **FAIL** |
| B `touch-26` T, against the recorded parent | 108.5, 108.5, then 100 | STATED | STATED |
| B `face-26` T | 99.67 throughout | PASS | PASS |
| C `touch-26` T, against the recorded parent | 108.5, 108.5, then 100 | STATED | STATED |
| C `face-26` T | 99.67 throughout | PASS | PASS |

The navigation bar read `[0, 10, 375, 54]` after the turn in every `touch-26` T drive, against `[0, 20, 375, 54]` before. The
parent's live T in run A read the same. So F2 is unchanged, and the only thing that varied was iOS's button width. Under
the builder's rule, run A would have failed the `face-26` control, which his no-regression rule protects, on a
byte-identical app.

**F3 in run A, read from the reports.** There were 3 deaths in 21 drives on iOS 18.3 and 0 in 19 on 26.3. Each was
classified `xcuitest` from its own report:

- `ipad-18` T: `Tortie-2026-10-14-223814.ips`. The second drive ran whole.
- `none-18` S: `Tortie-2026-10-14-231132.ips` during `screen-type`, then `-231407.ips` during `sample-leave`. The third drive
  ran whole.

Under the old rule of one drive again, `none-18`'s S, and so its G1 and G9, would have read UNREADABLE.

**Every row's other readings matched the devices lens's.** The window was 375 × 667 on the iPad and the SE and 402 × 874 on
the iPhone 16 Pro. End's mark was `touchid`, `faceid` or `lock`. The passcode prompt came from SpringBoard on 26.3 and from
CoreAuthUI on 18.3, with exactly one `POST /v1/end` after the typing. iOS 18.3's Face ID first-use question was accepted.
The Release app installed with `CFBundleVersion` 10. Turn 0 was reached on every paired drive and every sample.

**Counted once, at the end** (00:07 on 2026-10-15): `xcrun simctl list devices | grep -c p316-` read **0**, with 0 devices
booted, and all three lock slots read free. Every device this run made (12, named `p316-16258-*`, `p316-77535-*` and
`p316-6647-*`) printed `deleted true, deviceStillListed false`. All derived data this run made (`dd-A-*`, `dd-B-*` and
`dd-C-*`, 1.6 GB for run A with the parent's build and about 1.1 GB for each of B and C) and the parent's extracted `ios/` were removed, and so was `out/p3334` in the worktree. Kept
for the reverify, 8.5 MB under `…/scratchpad/p3334/fixer2/`: the three runs' logs and reports, their `lines/`, `fx/` (the
fixtures as cut), and the scratch scripts (`ablate.mjs`, `regrade.mjs`, `cut3.mjs`, `cut-ips.mjs`, `ips-class.mjs`,
`run.zsh`), none of which is copied into `build/`.
