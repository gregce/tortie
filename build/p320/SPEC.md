# Phase 320: the wheel on another machine (SPEC, slice 1)

Written by the integrator on 2026-09-22 against `c3477dde`. The binding documents are Phase 320's entry in
`docs/BACKLOG.md` and `docs/research/130-remote-scrollback.md`. This file records what slice 1 is, how it was
built, what proves it and, in §As built, every place the build differs from the entry.

## 1. What slice 1 is

- **Built.** Four changes:
  - the wheel reaches a program on another machine that asked for the mouse;
  - two sentences are deleted;
  - P5, the control client's empty answer;
  - P2 and P3, the two typing fixes. **Removed whole, with R4, under the operator's no-regression rule
    (§As built — removed under his no-regression rule, items 22 to 27).**
- **Not built.** Phase 320.1, the carriage door. It waits for the operator's answer to research 130 §10
  question 1. This was checked against the diff, not taken on trust:
  - nothing under `src/main/machines`, `src/main/sessions`, `src/shared` or `docs` changed;
  - `src/main/tmux/scroll.ts`, `src/main/tmux/version.ts` and `build/conformance-machines.mjs` did not change;
  - `scrollTarget` answers a remote session exactly as before, and `control-plane.ts` exports what it did;
  - no scroll runner or shape table exists.
- **Tier 3**, for the entry's four reasons. The operator's no-regression rule applies to every item.

## 2. The mechanism as built

### The wheel (`src/renderer/terminal/scroll/surface.ts`)

- `handleWheel` answers the no-pane case with `wheelReachesProgram(this.term.modes.mouseTrackingMode)`. The
  mode is read on every event.
- `wheelReachesProgram` is exported and true for `vt200`, `drag` and `any` only.
- The file header gains a fourth route, a pane that is not on this Mac. The comment above the return states
  both halves:
  - a program that asked for the mouse gets xterm's report on the attach;
  - a program that did not ask keeps Phase 95's swallow.

### The two sentences

- `READ_LAST_LINES_HERE_TITLE` and `READ_LINES_ALL_THERE` are deleted from `src/renderer/machines/read-lines.ts`.
- `showsAllThere` and its paragraph are deleted from `src/renderer/app/RemoteLinesModal.tsx`.
- The button in `src/renderer/app/session-actions.tsx` loses its `title`.
- The rule for `.remote-lines-all-there` is deleted from `src/renderer/app/remote-lines.css`.
- The `allThere` field is deleted from the p100 harness reading (`src/renderer/app/p100-lines-shot.ts`). Nothing
  read it.
- The count line stays.
- Tests: `p100-remote-lines.test.tsx` fails if either sentence is in any file under `src`, and if any of the
  three names is exported. `p95-strip-note.test.tsx` fails if the button's own tag carries a `title`.

### P5 (`src/main/tmux/control-client.ts`)

- `start()` calls `pushOwnSlot(child, CONTROL_NO_OUTPUT_COMMAND)` in the same synchronous turn in which it
  queues `refresh-client -f no-output`. `closeBlock` then hands that command's block to its own slot.
- Nobody owns that block, so it is dropped when it arrives.
- If tmux answers the command with `%error`, the client emits an `error` event while that child is still
  current. Both listeners of that event only log:
  - `core.ts`, `sessionsLog.warn`;
  - `control-plane.ts`, `machinesLog.warn`.
- When the connection drops, the slot fails without saying anything. The child is set to null before
  `failPending` runs, so nothing is emitted even after `closeControlPlane` has removed every listener.
- No export was added. The one production caller of `sendCommand` is still the local scroll runner
  (`core.ts:2484`).

### P2: a keystroke ends the wheel gesture (`surface.ts`)

**Removed whole (§As built — removed under his no-regression rule, item 22), `dropUnsentWheel` included.**
Before that: **Superseded by the fix round (§As built, items 16 to 18).** Only the first bullet below survives, renamed
`dropUnsentWheel`; the swallow was removed.

- `sendInput` calls `endWheelGesture()` first. That clears the 16 ms flush timer and the carried fraction.
- If a wheel event reached the Tortie-owned path within `WHEEL_GESTURE_QUIET_MS` (150 ms), `wheelEndedByKey`
  is set. `handleWheel` then swallows that path's events until the wheel has been quiet for 150 ms.
- Every wheel event restarts the quiet period.
- The swallow sits after the program's route and after the no-pane route. A wheel that belongs to the program
  is therefore never swallowed.

### P3: a held keystroke never wedges (`surface.ts`)

**Removed whole (§As built — removed under his no-regression rule, item 23).** Nothing in this subsection is
in the tree.

**When a key is held.** `sendInput` sends a key straight only when no key is already held. Once one is held,
every later key waits behind it, so keys arrive in the order they were typed.

**The drain.** `drainHeld` runs on the scroll chain and holds the chain until the keys have gone. Each round
asks `api.live`, then:

| The answer | What happens |
| --- | --- |
| The call failed, or the pane is still scrolled back (position above 0) | Wait 100, 200, 400 and 800 ms, then 1 s each time after that, for as long as the surface is mounted, and ask again |
| Position 0 and out of any mode | The keys are delivered |
| Position 0 but still in a mode, the first time | Ask again at once |
| Position 0 but still in a mode, the second time | The keys are delivered |

**On dispose.** `dispose` drops the held keys and ends a wait at once. The loop checks `disposed` after every
answer and after every wait. **Superseded by the fix round (§As built, item 19):** `dispose` no longer empties
the queue, and the last answer the drain heard settles the keys.

## 3. The proof

| Proof | Who runs it | State |
| --- | --- | --- |
| `npm run -s typecheck` | integrator | exit 0 |
| Targeted vitest over every touched directory and each test that imports a changed module | integrator | all green (table below) |
| `contract-inventory --check`, `assert-electron-teardown`, `assert-background-teardown`, `assert-hermetic-checks`, `assert-known-hosts-scoped`, `conformance:manager` | integrator | all exit 0 |
| `node build/p320/probe-p320.mjs --self-test` | integrator | 32 of 32 |
| `npm run build`, `npm test`, `smoke:t1`, the full battery, `package` | verifier or main session | not run here, by rule |
| `probe:controldeadline` (`control-client.ts` is touched) | verifier | not run here |
| `probe:p292` (`surface.ts` is touched) and `probe:p95` | verifier | not run here |
| `probe:p320`, at HEAD and at the parent `c3477dde` through `P320_CHECKOUT` | verifier | not run here |
| A real Claude Code in fullscreen on the loopback machine, scrolled by a real trackpad, with a photograph | the entry gives it to the integrator; it needs hands | not run: this agent has no trackpad |

`probe:p320` has arms R1 to R6; **R4 is removed (item 24), so five remain.** Their grades are in the probe's header. At the parent, R1, R4 and R5 are
expected to fail and R2, R3 and R6 to pass. At HEAD all six are expected to pass.

## §As built: every difference from the entry

1. **x10 is swallowed, not passed through.**
   - The entry says to return `mouseTrackingMode !== 'none'` and to pin `x10` to true. Both are wrong.
   - Measured by `p320-wheel-and-keys.test.ts` through @xterm/xterm 6.0.0's own
     `CoreMouseService.triggerMouseEvent`: `vt200`, `drag` and `any` send `ESC[<64;11;6M`, and `none` and `x10`
     send nothing.
   - X10 reports presses only, so xterm binds no wheel listener for it. A wheel handed over in that mode falls
     through to the alternate-scroll branch and types `ESC O A`, which is Phase 95's defect.
   - The test reads a private xterm member on purpose, so an upgrade turns it red.
2. **P3's "flushed only after an answer says live" does not hold for modes other than copy mode.**
   - `inMode` is `#{pane_in_mode}`, which is set in any mode, and tmux's cancel leaves copy mode only.
   - The integrator re-measured it on scratch servers on 3.6a and 3.7b. `send-keys -X cancel` exited 1 with
     "not in a mode" in clock mode, in the tree mode and in the options mode, and the pane stayed in each.
   - Holding keys until the pane is live would leave a person in those modes with no key that works. Before
     this phase their key got them out.
   - So a pane at position 0 that is still in a mode is asked about once more, and then the keys go.
   - A pane above position 0 is copy mode, and keys are never delivered into it.
3. **The integrator's ruling: the second ask goes at once.**
   - Builder A's version waited 100 ms before the second ask.
   - The surface keeps the last answer, which still says "in a mode", so every key typed in such a mode is
     held again. The 100 ms would have been paid on every key, where before this phase each key cost one
     answer. Under the no-regression rule that is a scenario made worse.
   - The second ask now goes with no wait, so a key costs two back-to-back answers.
   - A call that fails still waits and doubles.
   - Pinned by two tests. Of three ablations (the wait put back, the bound removed, the second ask removed),
     each turned 2 tests red.
4. **Seen while measuring, not this phase.** `#{pane_in_mode}` counts stacked modes; values from 1 to 4 were
   seen on scratch servers. `parseState` in `scroll.ts` reads only `'1'` as being in a mode. This is older than
   this phase and is recorded rather than changed.
5. **P2's window.**
   - The quiet period is timed from the WHEEL, not from the key. A new gesture that starts after the wheel was
     already still scrolls at once.
   - It applies only to the Tortie-owned path.
   - The 150 ms is the research judge's value. The entry says the spec step measures its own on a real
     trackpad, and it was NOT measured: nobody in this workflow has a trackpad.
6. **One window stays open until P1.** A key typed while the FIRST scroll of a gesture is still unanswered,
   over a pane the last answer said was live, goes straight to the pane, as it did before. Closing that is
   P1, which is in 320.1.
7. **Dispose drops held keys.**
   - This is the entry's rule, and it is built that way.
   - The entry's reason is that keys from the research's disposed surface arrived in its next run. That
     happened in a harness that reused one pane across runs. In the app, `sendInput` is addressed to the
     session, so a late key would reach the right session at the wrong moment: after this phase it could be
     seconds late, and the person may have left that session.
   - The cost: a key typed over a scrolled-back session in the one round trip before the session is left is
     dropped. Before this phase, a drain that was already running delivered it. The comment in `dispose` says
     so.
8. **P3 holds the whole scroll chain while it waits.** Wheel scrolls, polls and drags queue behind held keys
   until a call succeeds, so nothing can move the pane back before the keys have gone.
   - Before, a failed `api.live` left the chain free and the keys wedged.
   - Locally a call fails only when tmux itself does, and the poll fails then too.
9. **`probe:p95` step 5 had to change.** The entry says `probe:p95` stays green, but step 5 asserted the
   tooltip this slice deletes. Step 5 now asserts that the button is there and that the sentence is not on it.
   The p95 drive's comments (`src/renderer/terminal/p95-scroll-drive.ts`) are updated to match. Step 6, the
   wheel over a remote plain shell, is unchanged and is expected to stay green, because that shell's mode is
   `none`.
10. **R6 is added to the probe.** It is a LOCAL fullscreen stand-in, graded as R1 is, and the entry does not
    name it. It is there because xterm's mouse reports reach the pane through `TerminalPane`'s `onData` and
    `ScrollSurface.sendInput`, which is the road P2 and P3 change.
11. **The probe's notch is at least 60 px.** xterm 6 treats a pixel delta under 50 as a trackpad and scales it
    by 0.3, so a smaller notch would sometimes send no report.
12. **The CHANGELOG items are the entry's, word for word, under `### Fixed` in `## Unreleased`, with no commit
    link.**
    - No earlier "Contributed by" item links an `/issues/` URL; all four link `/pull/`.
    - tortie.sh's `scripts/sync-changelog.mjs` was read, and not changed. It takes a contributor from a
      `[Name](https://github.com/<login>)` link alone, and its pattern does not match
      `/gregce/tortie/issues/31`. So the Contributors row reads Jake Levirne from the profile link, and the
      issue link is only text. The entry's open question is answered: the reader accepts it.
13. **`HELPER_USER_FLOOR` goes from 148 to 149.** Phases 314 and 319 run in parallel and may raise it too. If
    both land, whoever integrates last sets the sum, which would be 150 for two.
14. **The entry's line numbers are from `55dab8b1`.** The tree is `c3477dde`, and the lines named in §2 are the
    current ones.
15. **Unchanged, with the reasons.**
    - `scroll.ts` and `core.ts` did not change. `exitPaneScroll` already returns a read taken after the
      cancel.
    - P3's "an answer says live" depends on P5 on the main side, because an empty answer parses as live.
    - The contract baseline did not move, and `CLAUDE.md` gains no gate.
    - No menu changed: `terminal-menu.ts`, `src/main/menu.ts` and the keymap have no diff.
    - No user-facing string was added.

### The fix round (2026-09-22, after two verdicts of needs_work)

Both verifiers measured two scenarios worse than the parent. The fix round's rule was that a clause making a
scenario worse than today is **removed, not repaired**. Two clauses were removed. Nothing was added in their
place.

16. **REMOVED: P2's swallow.** `WHEEL_GESTURE_QUIET_MS`, `lastWheelAt`, `wheelEndedByKey` and the swallow
    block in `handleWheel` are deleted. No wheel event is swallowed after a keystroke.
    - **Why.** Every wheel event restarted the 150 ms quiet, so a new swipe begun within 150 ms of a
      momentum tail during which a key was typed was swallowed whole. Lens 1's arm G: the second swipe moved
      0 lines in 10 of 10 runs, where the parent moved 30. Lens 2's app run V1: 0 lines at G = 40 and 100 ms,
      where the parent moved 90 to 91.
    - **Why no narrower removal or repair was possible.** Any swallow that outlasts the key eats the start of a
      swipe begun inside it, and a new swipe cannot be told from a momentum tail by timing. Both verifiers'
      suggested repairs fail their own arms: a delta that rises marks nothing in arm G, whose events are all
      one line, and a window tied to the last key still eats the first 300 ms of arm G's second swipe.
    - **What survives of P2.** A keystroke drops the travel not yet sent: the lines waiting on the 16 ms timer
      and the carried fraction (`dropUnsentWheel`, the old `endWheelGesture` less its last three lines).
      This part cannot swallow a swipe. At most one 16 ms coalescing window of wheel is lost per keystroke.
17. **THE COST OF 16, measured and stated.** Typing through a flick still loses characters at HEAD. The build
    round's 0 of 55 came from the swallow. The fix round ran the verifier's own harness (lens 1's
    `attack.mts`, copied to `scratchpad/p320-fix/` and never edited in place) against a snapshot of this
    tree and against the parent clone, over real tmux with a real `tmux attach` in a node-pty. The snapshot's
    surface.ts is byte-identical in code to the tree's, differing only in comments. The shape of the arms:
    - M: one line per event.
    - M2: a decaying pixel flick.
    - M3: fast typing from 100 ms.

    Characters lost, HEAD beside the parent, 11 per run. In the fresh rows each run gets its own pane and
    server, and the two trees alternate:

    | Where | M | M2 | M3 |
    | --- | --- | --- | --- |
    | 3.7b, round trip 0, fresh, 8 runs each | **0** / 36 of 88 | 9 / 5 of 88 | **14** / 39 of 88 |
    | 3.6a, round trip 0, fresh, 8 runs each | **0** / 31 of 88 | 8 / 4 of 88 | **6** / 48 of 88 |
    | 3.7b, round trip 0, fresh, M2 only, 14 runs each | — | 7 / 8 of 154 | — |
    | 3.7b, round trip 6 ms, fresh, 18 runs each (M) and 10 (M2) | **85** / 103 of 198 | 30 / 47 of 110 | — |

    - **M2 pooled over every run of the fix round at round trip 0:** 45 of 715 at HEAD against 40 of 715 at
      the parent. That is the one shape with no gain. The two fresh 8-run rows lean the parent's way, and the
      14-run row and the rest lean HEAD's way. The instrumented copy logged the same drain sequence on both
      trees in its M runs at round trip 6, and three instrumented M2 runs at HEAD lost nothing.
    - **One same-pane batch read worse and is stated.** This is the verifier's own design, one pane reused
      across runs. It was M at round trip 6: 51 of 66 at HEAD against 30 of 66 at the parent. That design
      drifts to losing every character after the first run or two, on BOTH trees. The instrumented rerun read
      61 of 66 against 59 of 66, and the fresh interleaved rows above read 85 against 103. The same drift is
      why M3 on one pane read 103 against 104 of 132.
    - **Consequences.**
      - The entry's R4 row ("0 of 55" at HEAD) and the CHANGELOG sentence "no longer loses characters" are no
        longer true. The CHANGELOG item now reads "loses fewer characters, though a quick flick can still drop
        a few". `probe:p320`'s R4 grades only "no byte nobody typed". The characters lost are a READING, set
        beside the parent's from the two invocations. The self-test has 33 fixtures, up from 32.
      - Closing the rest belongs with P1 in Phase 320.1, or to a ruling by the operator. The race is a scroll
        issued just after a key. It does not need the swallow to close.
18. **Unchanged by 16, re-measured on the fixed tree** (3.7b unless named):
    - **Arm G:** the second swipe 30 lines in 10 of 10, and the parent 30 in 10 of 10.
    - **The wheel alone:** 50 up gives position 50 and 20 down gives 30, on both trees.
    - **Clock mode and the chooser:** 'bc' and 'xyz' on both trees. HEAD takes 3 answers and the parent 2.
    - **The remote arms, round trips 0 and 50:**
      - P and A: 0 bytes;
      - F: 20 of 20 reports in mode drag;
      - FA: 20 of 20 in mode any;
      - 0 arrow keys.
    - **The control client, 11 connects at round trips 0 and 50:** 11 of 11 correct, and the early command
      got 'EARLY'.
19. **REMOVED: dispose's drop of held keys.** `this.inputQueue.length = 0` is gone from `dispose`, along with
    the drain's "disposed, so drop" after an answer.
    - **Why.** A key typed over a scrolled-back session, with the session left while the one return to live
      was in flight, was dropped. The parent delivered it:
      - lens 1's X: 0 of 10 at 0.5 ms, against 10 of 10;
      - lens 1's XD: 0 of 5 up to 80 ms at round trip 50;
      - lens 2's V3: 0 of 5, against 3 of 5.
    - **What stands instead.** This is the parent's own behaviour, bounded by what this phase added.
      - A surface that has gone makes no new call and waits no more; `dispose` still wakes a wait.
      - The last answer the drain heard settles the keys once (`settleHeldOnDispose`):
        - **At position 0, in any mode, they go.** The parent delivered on any answer, and at the bottom a
          key reaches the program. A pane in a mode is not asked the second time.
        - **Above position 0, or when every call failed, they are dropped.** Above 0 is copy mode, where the
          parent's delivery was eaten by copy mode's own key table. A failed call left the parent's keys
          stranded forever.
      - A live answer that lands after dispose delivers, because the ordinary "live" branch comes before the
        dispose check.
    - **Why no key can arrive seconds late.** No wait survives `dispose`, so a key can arrive after the
      session was left only by the one call already in flight. That is the parent's exposure and no more.
    - **Measured on the fixed tree:**
      - X: 7 of 7 at every delta from 0.5 ms to 25 ms, and 0 of 7 at delta 0 on both trees. The parent's
        own delta-0 loss is the enqueue's `disposed` test, unchanged.
      - XD: 4 of 4 at every delta at round trip 6, and 3 of 3 at every delta at round trip 50.
      - W1 and W2 at round trips 0 and 50: 'fix the bugok' in order, the pane live, the queue empty.
20. **The tests of the fix round** (`p320-wheel-and-keys.test.ts`).
    - **The P2 swallow test is replaced** by "never swallows the wheel after a keystroke, so a swipe begun at
      once scrolls every frame".
    - **The dispose-drop test is replaced by four:**
      - live on its way at dispose delivers;
      - the bottom in a mode delivers without a second ask;
      - still scrolled back drops;
      - the bottom, then a failed ask, then dispose, delivers.
    - **Seven ablations** ran in the scratch snapshot, never the tree, each restored by sha256. Each turned
      red the tests that own its clause:
      - A1, a swallow outlasting the key: 2 tests;
      - A2, dispose emptying the queue: 3;
      - A3, a disposed drain always dropping: 2;
      - A4, always delivering: 3;
      - A5, a disposed drain asking twice: 1;
      - A6, no drop of unsent travel: 4, including all three flick-model rows. So the flick model's 0 now
        rests on the drop, and its comment says it is a model, not the Mac;
      - A7, the last answer forgotten across a failed call: 1.
21. **The verifiers' nits.**
    - **`probe:p320`'s R3 header** now says its 0 bytes are the ruler, because the stand-in writes no state
      line without a byte.
    - **`probe:p95`'s step 6** now says it grades error lines and a read only, and names `probe:p320` R2 as
      the byte-exact half.
    - **The pass-through's one stray report after a far program leaves mouse mode** is tmux's own race. It
      belongs in the commit body and was not changed.

## Open concerns for the verifiers

1. **Run `probe:p320` at HEAD and at the parent.**
   - Build first: the script carries no `npm run build &&`.
   - Run the far side on both tmux builds (`P320_FAR_TMUX`).
   - R4 is the no-regression arm on this Mac. R6 is the guard that the local fullscreen wheel is not eaten.
2. **P2 against a real trackpad.** Measure the 150 ms if hands are available. A new swipe started immediately
   after typing during momentum is swallowed until 150 ms of quiet. That is the entry's one named change that
   a person can notice.
3. **Rule 3 above is the integrator's.** Attack it: keys in clock, tree or options mode now cost two answers,
   and before this phase they cost one.
4. **Rule 7 above: dispose drops a key typed in the last round trip.** Check whether any real road reaches it:
   a keyboard shortcut that leaves the session, fired in the same event turn as a typed key.
5. **Run `probe:controldeadline` and the full battery** (`control-client.ts` is touched), and `probe:p292` and
   `probe:p95` (`surface.ts` is touched).
6. **The real-trackpad photograph the entry asks for is still owed.** It needs a person's hands.

**After the fix round.** Items 2 and 4 are answered by removal (§As built, items 16 and 19); there is no
swallow left to measure and no drop on dispose. What the reverify owes:

7. **Rerun the two regressions live.** Lens 1's arm G and lens 2's V1 at G = 40 and 100 ms must move like the
   parent. Lens 1's X and XD and lens 2's V3 must deliver at least what the parent does.
8. **R4 at both builds, read side by side.** It is a reading now, not a grade. One run of five cannot tell a
   character or two apart, so pool more runs than five if the two readings are close.
9. **Attack the new dispose rule** (item 19). The last answer settles the keys. Is there a road where the last
   answer said position 0 and the key still lands somewhere the parent's would not have?

## §As built — removed under his no-regression rule

Written on 2026-09-23, after the reverify answered needs_work a second time. The operator's standing rule decides
it: **a part that makes any scenario worse than today is removed and queued, and the phase lands only when a side by
side against today shows no scenario worse.** The fix round had repaired P2 and P3 in part (items 16 and 19). This
round takes both out whole. Nothing was added in their place.

22. **REMOVED: P2, a keystroke drops the wheel travel not yet sent.**
    - **What went.**
      - `dropUnsentWheel` and its call as the first line of `sendInput`.
      - The header paragraph "TWO THINGS KEEP A KEYSTROKE".
      - The comment the fix round left in `handleWheel` about the removed swallow. The parent never had the swallow,
        so the comment described nothing.
      - The 150 ms quiet window (`WHEEL_GESTURE_QUIET_MS`, `lastWheelAt`, `wheelEndedByKey`) had already gone in item
        16.
    - **Why.** The reverifier's M3 shape, in the real app, one Electron per build, local sessions, a raw-mode
      recorder as the ruler: 50 one-line wheel events 16 ms apart, with "fix the bug" typed from 100 ms at 35 ms a
      key.

      | Build | Runs | Characters lost | Copy-mode prompts left open |
      | --- | --- | --- | --- |
      | Slice 1 after the fix round | 70 | 114 of 770 | 12 |
      | The parent `c3477dde` | 50 | 24 of 550 | 3 |
      | Slice 1 with only the `dropUnsentWheel()` call taken out (the reverifier's ablation A) | 40 | 22 of 440 | 1 |

      - That is about 3.4 times the parent's rate. The reverifier gives p = 2e-10.
      - Ablation A kept P3 and read like the parent, so the drop is the cause.
      - The readings are in the session scratchpad under `p320rv/`: the harness `rv-attack.mjs`, and `rv-head-m.json`,
        `rvm-head-{1,2,3}.json`, `rv-parent.json`, `rvm-parent-{1,2}.json` and `rvm-ablA-{1,2}.json`. An earlier
        six-run reading at HEAD, `rv-head.json`, lost 48 of 66 and is not in the pool. Leaving it out flatters HEAD,
        not the parent.
    - **The fix round read M3 the other way** (item 17: 14 against 39 of 88 on 3.7b, 6 against 48 on 3.6a). That was
      a node-pty harness over real tmux, not the app. The app run is the one that stands.

23. **REMOVED: P3, a held keystroke never wedges.**
    - **What went.**
      - `drainHeld`, `deliverHeld`, `settleHeldOnDispose` and `waitBeforeAskingAgain`.
      - The backoff, `HELD_RETRY_FIRST_MS` (100) and `HELD_RETRY_MAX_MS` (1000).
      - `HELD_MODE_ANSWERS`, and with it item 3's ruling that the second ask goes at once.
      - `wakeHeldRetry`, and the clause in `dispose` that woke it.
      - The order clause in `sendInput` that held a key behind one already held.
    - `sendInput` is the parent's again: `noPane` first, then one `api.live`, then every held key.
    - **Why.**
      - The first round measured its dispose clause worse than the parent. A key was typed over a parked pane and the
        session was left while the first return-to-live answer was in flight. Lens 2's V3 delivered 0 of 5 against
        the parent's 3 of 5. Lens 1's X delivered 0 of 10 against 10 of 10.
      - The fix round repaired that clause (item 19) instead of removing the part. The part also made typing in
        clock mode and in the chooser take 3 answers where the parent took 2 (item 18).
      - The rule takes out the part whole, with P2, as the reverify's brief ruled.
    - **Not measured.** M3 does not separate P3, because ablation A kept it and read like the parent. P3 is removed
      on the rule, not on M3.

24. **What went with them.**
    - **Tests.** `p320-wheel-and-keys.test.ts` loses its sections 2 and 3:
      - 7 P2 cases, the three flick-model rows included;
      - 12 P3 cases.

      Its section 1 is kept: the mode table asked of xterm itself, 6 cases. It is byte for byte from
      `wheelReportFor` down, under a new name, `p320-wheel-reaches-program.test.ts`, because the old name said "keys"
      and no key is tested any more. Items 1 and 20 above name the old file.
    - **`probe:p320` loses R4.** That is the flick, the typing, `TYPED`, `lcs`, `lostOf`, `typingLost`,
      `typingFindings`, `flickLines`, `keyOf`, the page kit's `focusWhere`, `P320_RUNS` and the local recorder's log.
      - `P320_ARMS=R4` is now refused by name, and the name is not reused, so an old reading cannot pass for a new
        one.
      - The self-test goes from 33 fixtures to 26: eight removed (the two sequence graders, five R4 graders and the
        flick) and one added (R4 refused).
    - **R6 stays**, graded as before. Its header no longer gives P2 and P3 as its reason. It is there because this
      phase edits `handleWheel`, which every wheel over a pane on this Mac passes.
    - **The recorder's `--history` option.** Only R4 used it. R2 passed 0, so R2's recorder prints and logs what it
      did before, less the `history` field of its ready record, which nothing read.
    - **The CHANGELOG.** The typing clause goes. The Read Last Lines half stays as its own item, in the entry's
      words.
    - **`build/verification-checks.mjs`.** The comment above `probe:p320` no longer lists typing during a flick.

25. **What stays, as the reverify left it.**
    - The pass-through: `surface.ts`'s fourth route, `wheelReachesProgram` and `handleWheel`'s no-pane branch, with
      `p95-scroll-stops.test.ts`'s five mode cases and its per-event case, and the mode table.
    - The two deleted sentences, with `p100-remote-lines.test.tsx`, `p95-strip-note.test.tsx` and `probe:p95`'s
      step 5.
    - P5 in `control-client.ts`, with its tests.
    - `HELPER_USER_FLOOR` at 149, and `probe:p320`'s R1, R2, R3, R5 and R6.

26. **Byte for byte against the parent.** `git diff c3477dde -- src/renderer/terminal/scroll/surface.ts` shows three
    hunks holding four changes, and all four are the pass-through:
    - the header's fourth route;
    - the `IModes` import;
    - `wheelReachesProgram`;
    - `handleWheel`'s no-pane branch.

    `sendInput`, `dispose`, the fields and the chain read as the parent's. No other file that P2 or P3 touched
    differs from the parent except by a kept clause.

27. **Queued into Phase 320.1.**
    - P2's drop and P3's drain go there together, beside P1, the hold that closes the window properly. Today a key
      typed while a scroll is still unanswered, over a pane the last answer said was live, goes straight to the pane.
    - **The ruler is the reverifier's M3 shape**, in the real app beside the parent. It reads both the characters
      lost and the copy-mode prompts left open, and 320.1 lands only if neither is worse.
    - It must also read no worse than the parent on:
      - lens 1's arm G and lens 2's V1, a new swipe begun right after typing;
      - lens 1's X and XD and lens 2's V3, a key over a parked pane when the session is left;
      - the answers a key costs in clock, tree and options mode.
    - This worktree does not touch `docs/BACKLOG.md`. The 320.1 entry needs these words, and the running log needs
      its line, when this phase is committed.

28. **What is true of typing on this Mac now: the parent's behaviour, unchanged.**
    - Typing through a flick loses what it lost before this phase. The reverify read 24 of 550 at the parent in M3.
      Research 130 read 4 of 55 and 9 of 55 in its own shape.
    - A failed return to live still strands held keys until the pane is remounted (research 130 §6 item 5).
    - This phase makes neither better nor worse. Three places still say otherwise, and this round did not edit them:
      - the Phase 320 entry's Semver line, "typing while a scroll is still moving no longer loses characters";
      - its R4 row, "0 of 55";
      - its first body line, which is this file's title, "and no keystroke lost to a scroll". The commit's first body
        line must drop that half.

29. **The proof of this round.** Every command was run in this worktree. None starts an Electron.

    | Command | Exit | Reading |
    | --- | --- | --- |
    | `npm run -s typecheck` | 0 | boundaries, cycles and shared types OK |
    | vitest over `src/renderer/terminal/scroll/__tests__`, the two drag-select tests, `keys/__tests__/multiline.test.ts`, `src/main/tmux/__tests__/scroll.test.ts` and `control-client.test.ts`, `p100-remote-lines.test.tsx` and `p95-strip-note.test.tsx` | 0 | 10 files, 207 tests |
    | `node build/contract-inventory.mjs --check` | 0 | the baseline did not move |
    | `node build/assert-electron-teardown.mjs` | 0 | 149 against a floor of 149 |
    | `node build/assert-background-teardown.mjs` | 0 | 19 of 19 fixtures |
    | `node build/assert-hermetic-checks.mjs` | 0 | 229 check scripts classified |
    | `node build/p293/conformance-manager.mjs` | 0 | 58 rules, 2,307 checks |
    | `node build/p320/probe-p320.mjs --self-test` | 0 | 26 of 26 |

30. **The open concerns above.**
    - 2, 3, 4, 7, 8 and 9 have nothing left to measure in this slice.
    - 1 stands without R4.
    - 5 stands. `surface.ts` changed again, so `probe:p292` and `probe:p95` are owed on this tree.
    - 6 stands. The real-trackpad photograph is still owed.
    - **The side by side the rule asks for is owed on this tree**: `probe:p320` at HEAD and at the parent on both
      far tmux builds, `probe:p292` and `probe:p95`. No Electron was started in this round.

### Read this before the sections above (the main session, 2026-09-23)

The typing half is gone, so three things above describe a tree that no longer exists. Items 1, 17 and 20
name `p320-wheel-and-keys.test.ts`; the removal replaced it with `p320-wheel-reaches-program.test.ts`,
which keeps only the xterm mode table. §3's "32 of 32" and "all six are expected to pass" describe the
probe before R4 left it; it is 26 of 26 fixtures and five arms (R1, R2, R3, R5, R6) now. The independent
reverify of the remainder measured no scenario worse than the parent, including typing through a flick,
which is exactly as it was at the parent.
