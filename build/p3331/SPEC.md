# Phase 333.1 — "so that people can download it": a stranger's first run on both sides — SPEC

Written by the spec step on 2026-10-07 in `/private/tmp/wt-p3331`, a detached worktree at origin/main `cb8d52a6` ("docs(backlog):
a stranger's first run, rewritten with his setup design and started"). Every `file:line` below was re-read at `cb8d52a6` on this
date. **The spec step MEASURED before it wrote** (§15 holds every measurement, its command, its exit code and its numbers): the
SHIPPING `src/main/pocket/funnel.ts` loaded outside Electron with the compiler's own transpiler and driven over the Phase 330
Tailscale stand-in in every state it has, a wrapper whose first line names an interpreter that does not exist, the SHIPPING
`onWindowLooked` bus over a counting event target, Tailscale's own source at v1.94.1 and v1.102.2 for the account, and the three
gates this phase widens, run on the base. It started no Electron, no Simulator, no tmux server, no agent and no model turn; it ran
no real Tailscale, DNS or APNs; it read nothing under `~/.ssh`, `~/.claude`, `~/.codex`, `~/Keys`, his keychain or his live
Tortie profile; and `stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `734376 1791391290` and `23166 1790702242` before and
after every command that started a shell or a process, unmoved.

**Revised by two adversary rounds on 2026-10-07** (§Attack at the end says which findings came from the first round, which a
usage limit stopped mid-revision, which from round r2, whose revision is the one being built, and which from round r3, a second
run of the attack step that found r2's build under way and changed no design text). **The scratch root moved**: everything this
phase keeps outside the worktree is under `/private/tmp/tortie-ops/p3331/`, and the shared lock and battery scripts are
`/private/tmp/tortie-ops/lock.sh` and `/private/tmp/tortie-ops/battery.sh`. Every operational path below names the new root; r2's
own measurements (§15 M9 to M12) stay where r2 kept them, under the old root, and are cited as r2 recorded them.

Read with it, whole: `docs/BACKLOG.md` "## Phase 333.1" (`:37577-38348`, its "What changed", "What was measured", "The faces", "The
mechanism", "Order", "What is NOT", the two answered questions and "Attack (2026-10-07)") and the running-log lines of 2026-10-07
(`:42481-42491`); `docs/research/140-the-public-beta-beside-the-release.md` §5 (rows 1, 9, 12, 14), §6, §7.2, §8 row 3 and §10;
`docs/research/136-the-phone-in-peoples-hands.md` §7 and §14; `build/p330/SPEC.md` (the door, its confirm, Funnel's refusals),
`build/p332/SPEC.md` and `build/p3321/SPEC.md` (the name check, unchanged here), `build/p3332/SPEC.md` (`SCAN_LINE`),
`build/p3371/SPEC.md` (build 7).

**The order of authority.** His rulings override the entry; the tree at `cb8d52a6` overrides the entry's picture of it. Where this
file departs from the entry for any other reason, §3 says so row by row.

His rulings, in his words where the harness relayed them, and what each moves:

1. **"yes i do"** (2026-10-07), to writing his three-step setup into 333.1 so it ships in the build sent to Apple; then **"Start
   all four"**. This phase builds it.
2. **"Keep today's block."** The confirm at Allow is today's `[data-phone-confirm]` block, whole, at rest: every hashed line,
   `POCKET_CONFIRM_WARNING`, `POCKET_DOOR_HONESTY` and, when Funnel asks approval, `POCKET_FUNNEL_RIGHT_WARNING`. Nothing of it
   goes behind a disclosure.
3. **"Keep it."** A quiet **Try again** stays beside the one button on every step that waits on Tailscale, until his checklist
   row C2 shows a return happens by itself after connecting from Tailscale's menu bar icon.
4. Research 140's four answers (2026-10-07): build 8 goes to Beta App Review before See a sample, so **this build draws no
   sample**; every text says **"terminal"**, never "remote desktop", "mirror", "stream" or "SSH"; **318.1 waits for 333.12**, so
   **this phase adds no door route, changes no QR and moves no hashed field**. And research 140 §10: **never "beta" or
   "TestFlight"** on either side.

---

## 0. The hard rules, stated once

- `/private/tmp/wt-p3331` is the worktree; `git diff cb8d52a6` plus the untracked files is exactly 333.1's delta. **Begin every
  shell command with `cd /private/tmp/wt-p3331 &&`** (or the role's scratch), and **quote every heredoc delimiter** (`<<'EOF'`);
  prefer the Write tool for files. On 2026-10-07 an unquoted heredoc ran `npm` build, test and package in his checkout.
- `/Users/gdc/gmux` and `/Users/gdc/tortiedotsh` are read only. Nobody but the committer commits, stages or stashes. Install
  nothing.
- Builders and the integrator launch no Electron and boot no Simulator. Verifiers take THE LOCK, phone slot first:
  `mkdir -p /private/tmp/tortie-ops/electron.phone-wait && echo p3331 > /private/tmp/tortie-ops/electron.phone-wait/p3331-<role>`,
  then `zsh /private/tmp/tortie-ops/lock.sh try p3331 phone` (prints the slot or exits 1; retry every 60 s in a NEW command),
  remove the wait file once a slot is held, and release with `zsh /private/tmp/tortie-ops/lock.sh release <dir>` on the same
  command line. Nothing under `~/.claude` is read for it.
- **Disk.** The Mac has about 12 GB free and Phase 342 runs beside this one. Before any step that writes much (a parent worktree
  and its build, `npm run package`, an `xcodebuild`, a Simulator), read `df -h /`; under 6 GB free, wait in 60 second steps for up
  to 20 minutes, and if it is still under, do not run that step: it is reported UNREADABLE for disk space, never as a product
  failure. Each role deletes its own DerivedData, parent worktree, `release/` and other build output as soon as it is done with
  them.
- **No real Tailscale, DNS or APNs.** Tailscale is `build/p330/tailscale-standin.mjs` behind its preflight and per-second
  sampler; DNS is `build/p332/dns-standin.mjs` in the probe's own process; APNs is Phase 314's stand-in. **No test and no probe
  opens a real outside page, opens his Tailscale or writes his clipboard**: nothing presses Get Tailscale, Open Tailscale,
  Approve in Tailscale or Copy link, and nothing calls `pocket:setupAction` outside the vitest seam (D35). On the phone, nothing
  presses a site link; the address the code would open is recorded instead.
- Never `-L gmux`. Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; a process is ended by the pid its starter
  holds, in a `finally`.
- Never read his keychain, credentials, APNs key (`~/Keys`), `~/.ssh`, conversation stores (`~/.claude`, `~/.codex`) or his live
  Tortie profile. Real data is the committed fixtures.
- **His shell history**: before and after every command that starts a shell, a Simulator or the app, record ONLY
  `stat -f '%z %m' ~/.zsh_history ~/.bash_history`; if either moves, attribute it and report. Any shell a test starts runs with
  a scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null` and `TERM_SESSION_ID` unset (vitest included).
- **No model turn.** Do NOT run `smoke:remote`, `smoke:machines`, `probe:p268` or `probe:p336`. Never start gemini, qwen, agy or
  grok: `build/hidden-agents.mjs` renames them (and droid) before every launch.
- Simulators only through `build/simulator-run.mjs`; every `xcodebuild` uses
  `-derivedDataPath /private/tmp/tortie-ops/p3331/dd-<role>`, deleted before the role returns. Every Electron through
  `build/electron-run.mjs`, killed in a `finally`. No screenshot and no recording: a visual claim is a frame, a label or a
  number read.
- Refusal 8 binds: nothing starts a process on a configuration change alone; the confirm is never weakened or skipped.
- No raw control, bidi, zero-width or BOM character in any committed file. Describe any weakness by its class, never as a
  recipe. User-visible words follow CLAUDE.md's UI rules: just enough words, every colour a token, no tmux words, native menus.

---

## 1. The answer first

**What a person can do after this phase, on the Mac.**

1. Settings then Phone is **three steps** under the switch: **Tailscale on this Mac**, **Publish this Mac**, **Pair your phone**.
   Each says where it stands on the right; Tortie fills each in itself, and the step that waits on the person has one button.
2. **Not installed** has **Get Tailscale**, which opens Tailscale's download page, and a quiet **Try again** once the switch is
   on. **Not running** says "Turn it on, then come back." and **Signed out** says "Sign in, then come back.", each with **Open
   Tailscale** when this Mac's Tailscale is the app at its pinned place, and a quiet **Try again**.
3. **Coming back to the window checks again by itself**, with no timer and no poll: a return reads Tailscale only when a read
   could now see the step finished (D7), only while a program is there to read, on an allowed door only the program the
   person allowed (D7b), it starts the door at most once per press (D7 (i)), and never after the person's own off press in this
   run, even one Tortie could not save (D7 (a)).
4. **Publishing asks exactly what it asks today**: the same lines, the same two warnings, the same Allow, bound to the same hash.
5. **Tailscale's one-time approval is one button, Approve in Tailscale**, and the step moves on by itself once approved. A person
   who is not their tailnet's admin reads "Ask your Tailscale admin to approve Funnel." with **Copy link**, and the step moves on
   the next time they come back after the admin approves.
6. While the Mac's name goes live, today's progress stays, with one more line: "This can take several minutes. You can leave this
   open or come back later."
7. **On a first setup the code shows by itself** once the name answers, with "Scan with Tortie on your iPhone." and "Get it at
   tortie.sh/iphone."
8. The Alerts card says **"Only Tortie’s publisher can send alerts for now."**

**And on the iPhone.**

1. The first screen is **three numbered steps**: Get Tortie for Mac ("Free at tortie.sh · Apple silicon · 0.111 or later"), Open
   Settings then Phone, Scan the code; one button, **Scan code**; then "Nothing else to install on this phone.", the one line, and
   **Privacy · Support**.
2. **The camera opens, and iOS asks for it, only after Scan code.**
3. **Settings then About** gains **Tortie for Mac** (tortie.sh), **Privacy** and **Support**. All three open in Safari, or in the
   app that owns the address.
4. **"Tortie could not reach your Mac."** gains one line: "If Tortie on your Mac just updated, press Allow in its Settings then
   Phone."
5. **A code from another version says which side to update**, where today it says "That is not a Tortie pairing code.", which is
   false.
6. **Never "beta" or "TestFlight"**, and no "See a sample" (333.3, build 9).

**Nothing else changes for a person.** No native menu row moves (§10). No door route, no QR field and no hashed field moves, so no
paired phone is asked to Allow again. The phone is 1.0.0 **build 8**, the build submitted to Beta App Review; nothing is
released or uploaded by this phase.

### 1.1 The decisions, each with its reason

| # | Decision | Reason |
| --- | --- | --- |
| D1 | **Three steps under the switch.** The switch row keeps `DOOR_LABEL` "Let my phone reach this Mac" and its switch; its caption becomes ONE line that never changes, main's `POCKET_SETUP_LINE` "Your iPhone needs only the Tortie app. This Mac needs Tailscale (free)." Today's section caption, `POCKET_REACH_HONESTY`, moves behind step 1's **What’s this?** (shut). The three step headers are always drawn, the switch off included; each step's BODY is drawn by §5.4's tables, and step 2's body only while the switch is on. `DOOR_OFF`, `DOOR_WAITING`, `PAIR_WAITING` and `doorLine` leave the sheet | his design; the entry "The faces"; `PhoneSection.tsx:68-79`, `:314-324`, `:751` |
| D2 | **Step 1's state is a new status field, `tailscale: PocketTailscaleState`** (`missing`, `stopped`, `signed-out`, `installed`, `ready`), from the stat and from THIS RUN's last read, **never from the stored facts**: `missing` when the stat or this run's last read says `no-tailscale`; `stopped` and `signed-out` from this run's last read's refusal word (`not-running`, `signed-out`); `ready` while this run's last read answered (`this.read !== null && this.readRefusal === null`); `installed` otherwise. **With the switch off, the stat alone** (`missing` or `installed`), as `status()` already composes no read sentence for a door that is off, "the last read belongs to a press the person has since undone" (`src/main/pocket/ipc.ts:776-779`) | the entry item 1; the attack ("Step 1 no longer claims ✓ from the stored facts"); a tailnet an earlier run wrote is no proof Tailscale runs now |
| D3 | **The stat.** `status()` calls `this.funnel.resolve()` EXACTLY ONCE and hands the resolution to both `funnelProgramOf` (D2) and `setupActions` (D9). At most eight `statSync`/`accessSync` calls (a stat and an access for the override and for each of the three candidates, `src/main/machines/tailscale.ts:78-86`, `:122-146`; the attack corrected "four"), no process. MEASURED (§15 M2): a wrapper whose interpreter does not exist still stats as an executable file, so the stat says `installed` and only the read says `no-tailscale` (0 lines in the stand-in's log: it never ran); an unusable development override warns once per `resolve()` call, 2 warnings for 2 calls, so the one call is a bound on the log, stated as a development-build limit | the entry item 1; `tailscale.ts:130-133` |
| D4 | **The read carries the account.** `parseTailnetStatus` (`funnel.ts:390-445`) also reads the self user's `LoginName` when `User` is an object: the entry under `String(Self.UserID)` when `Self.UserID` is a SAFE integer (`Number.isSafeInteger`) and that key is present; the map's one entry ONLY when `Self.UserID` is a number that is NOT a safe integer and the map holds exactly one entry (r2 §Attack F21: with a safe id whose key is absent, the one entry is not proven to be the self user, so nothing is drawn); that entry an object and `LoginName` a non-empty string of at most 256 UTF-16 units that `/[\p{Cc}\p{Cf}]/u` does not match (r2 §Attack F22: a control, bidi, zero-width or BOM character in a drawn account can make step 1 read as another account, and a 64 KB one wrecks the row; written with property escapes, so no raw character enters the file); else `account: null`. WHY THE SECOND ARM (the attack, §Attack F8): Tailscale's user id is an int64 and `JSON.parse` rounds anything above 2^53, MEASURED: `"UserID": 9007199254740993` parses to `9007199254740992`, whose key misses the map's `"9007199254740993"`; with `--peers=false` the map holds the self user and nothing else (v1.102.2 `local.go:1554-1561` adds it before the `WantPeers` branch), so its one entry is the self user. `StatusFacts` and `TailnetRead` gain `account: string \| null`. Status gains `account` and `tailnet`, both non-null only while `tailscale === 'ready'`, from this run's read, **drawn only**: not a field of `PocketExecutionFields`, not in `NORMALIZE` (`src/main/pocket/pairing.ts:288`), not in the store, `facts.ts`, any door answer, the pairing view, or any log call. The algorithm `sha256-pocket-exec-v3` (`pairing.ts:324`) does not move. MEASURED in Tailscale's source (§15 M4): at v1.94.1 the `User` map is filled only inside `populatePeerStatusLocked`, called only `if sb.WantPeers` (`ipn/ipnlocal/local.go:1348`, `:1360`), so `--peers=false` (`cmd/tailscale/cli/status.go:82-84`) carries none; at v1.102.2 the self user is added before that branch "so that callers can resolve the self node's owner to a login name" (`local.go:1554-1561`, tailscale issue 19894). His Mac runs Standalone 1.102.2 (`build/p330/CHECKLIST.md`, "Already done"). Equal account and tailnet are drawn once | the entry item 2; a personal tailnet's name is often the account itself (the stand-in's default `standin@example.com`, `build/p330/tailscale-standin.mjs:139`) |
| D5 | **The start's refusal keeps its word.** `startRefusalWord: PocketFunnelRefusal \| null` sits beside `startRefusal` (`ipc.ts:417`) and is set and cleared WITH it at every site (`:948`, `:971`, `:1000`, `:1008`, `:1033`, `:1075`, `:1086`, `:1728`, `:1733`, and every other `startRefusal =`), null where the sentence is not Tailscale's (`SESSIONS_NOT_READY`, the door process's own sentence, the port that could not be saved). `PocketFunnelView` gains `refused: PocketFunnelRefusal \| null` = `readRefusal ?? startRefusalWord`, null while the switch is off or the door listens | the entry item 3; today "not an admin" and "failed" both arrive as a sentence (`ipc.ts:415-417`) |
| D6 | **The admin link.** When a start refuses `not-approved` AND the child printed an approval URL (`onApproval` fired, `ipc.ts:1057-1062`), main keeps the URL BEFORE `ipc.ts:1069` drops it, **only when it passes `approvalOpens`** (`funnel.ts:599-617`), as `adminLink`, held in main and never crossing to the renderer. **A URL that fails `approvalOpens` is not kept at all** (the attack, §Attack F9): the draft drew it as selectable text beside "Ask your Tailscale admin to approve Funnel.", which hands a person an address Tortie refuses to open together with an instruction to send it to someone; today's text arm stays for the approval WAIT alone (`POCKET_FUNNEL_APPROVAL_ELSEWHERE`, unchanged). `adminLink` is dropped by a press of the switch (on or off), a confirm, a counted start, a read that shows Funnel's two capabilities (`!read.asksApproval`), and the quit. **A return's read that still shows no capabilities does NOT drop it.** MEASURED (§15 M2): the stand-in's `exit0` start refuses `not-approved` WITH the made-up URL (`approvalOpens` true); its stderr `not-approved` refuses with NO URL, so that face has no Copy link | the entry item 4; the attack ("The admin link survives a return before approval") |
| D7 | **`rechecks(held = 0)`, main's ONE predicate for "a return would re-check this refusal"**, answered in status as `rechecks: this.rechecks()`, and asked AGAIN as `this.rechecks(1)` inside the return's own job (D9), where `held` is the one `opening` the job itself holds. True only when ALL hold, written as one early-return chain in this order (§5.2.3 pins the text): (a) the store says the switch is on AND no off press is the last switch press of this run (`!this.switchedOffThisRun`, D8; r2 §Attack F18, MEASURED: an off press whose save fails leaves the held store saying on, `confirmState` `confirmed`, the funnel idle and `not-running` pending, so without this clause a return after Tailscale starts forks the door process and spawns Funnel against the person's off press); (b) the door is not published; (c) `opening === held` (0 for a return arriving, 1 inside its own job, so another start queued behind the job makes it a no-op); (d) `funnelState === 'idle'`; (e) no restart is armed (`restartCancel === null`); (f) neither `pocketShutdownStarted()` nor `funnelShutdownStarted()`; **(i) `returnForked` is false** (D8b); (g) the refusal: when `readRefusal !== null`, it is one of the READ's words `no-tailscale`, `not-running`, `signed-out`; when `readRefusal === null`, `startRefusalWord === 'not-approved'`; **never `shields-up`**, which only a spawn of the Funnel child can see (`funnel.ts:641`), so a return there would fork the door process and spawn the child on every focus; (h) EITHER the gate says the fields are the confirmed ones (`pocketConfirmStatus(this.fields()).state === 'confirmed'`: then a read without a press is what launch and the restart already do, `ipc.ts:1298-1312`, `:1135-1144`) OR the switch was pressed on in this run (`pressedOnThisRun`). WHY EACH CLAUSE IS LOAD BEARING (the attack measured the draft's arm 4 wrong): (c) alone already refuses a return during a start's approval wait, because the start's job holds `opening` for the whole wait; (d) is what refuses one in `recoverNow`'s window between the restart timer firing (`restartCancel = null`, `ipc.ts:1141`) and its `opening += 1` after `await this.unpublish()` (`:1162-1164`), where `opening` is 0 and `funnelState` is `restarting`; (e) is what refuses one while a restart is armed and a confirm's `start()` has set the funnel back to `idle` (`start()` does not cancel a restart, `:872-884`). **(d) and (e) do NOT cover the moment that restart's timer fires** (r2 §Attack F19): `restartCancel` is null, `opening` is 0 and the funnel is still the `idle` that `start()` left, so a return there is queued BEHIND `recoverNow`; if that restart publishes, the return's `openNow` runs while published. MEASURED on the shipping owner: a second start while published refuses `port-taken` against its OWN child and sets the funnel `idle`, so the sheet says `refused` with a false sentence while the child lives, its serve session stands and the door socket answers. That is why the whole chain is asked again inside the job as `rechecks(1)`, where (b), (d) and (e) see what the restart left | the entry item 5; the attack ("A return no longer reads an unconfirmed door on a later day", "`shields-up` left the return set"); §Attack F4, F5 |
| D7b | **`returnMayRun(program)`, asked by `recheck()` before it queues and again as the job's first statement after the superseded check, and NOT part of `rechecks()`** (so the wish of D17, which reads `status.rechecks`, is not dropped while a person is still installing): the stat finds a program (`funnelProgramOf(resolution).ok`), and, on CONFIRMED fields, its path is the confirmed `fields().funnelProgram`. So a return never runs the sweep or a read while nothing is there to read (no "Checking…" flicker per focus while Tailscale is absent), and **a return never runs a program other than the one the person allowed**: after a launch whose read failed `no-tailscale`, a Tailscale that has since appeared at ANOTHER pinned path is run by a press (Try again, today's behaviour, whose read draws the moved lines) and never by a focus. The read inside `openNow` resolves once more after the sessions wait, as launch does; the gate refuses any moved field before the fork, so the residual is that read's two runs of a program swapped into a pinned path inside that wait, which launch shares (stated, §14 item 8; r2 found the pointer named an item §14 did not hold) | §Attack F6 |
| D8 | **`pressedOnThisRun` and `switchedOffThisRun`**, memory only, never stored. `pressedOnThisRun` is set in `setDoor` in the statement after the on press is counted (`const press = this.pressed()`, `ipc.ts:1682`) and cleared by an off press. So a door nobody has allowed is read on a return only in the run whose press started the setup, which keeps today's exposure: no planted program at a pinned path runs because a window came forward on a later day. **`switchedOffThisRun`** (r2 §Attack F18) is set by an off press and cleared by an on press, beside it, and is D7 (a)'s second half: after a person's off, nothing but their next on press starts or reads the door in this run, whether or not the off was saved. THE OFF ARM'S STATEMENTS GO AFTER `let saved = true;` and before its `try`: `build/ablation-p313.mjs:851` anchors on `this.pressed();\n      let saved = true;` and an insertion between the two lines turns that arm red by its anchor alone; both are still before the off's first await (L5 (e), Q1 (d)) | the entry item 5; r2 M10 |
| D8b | **`returnForked`: a return forks the door process and spawns the Funnel child AT MOST ONCE PER PRESS.** Set by `openNow` when it was reached from a return (`options.returned === true`) in the statement before `this.setFunnel('starting')` (after the port check, so the superseded check stays the statement IMMEDIATELY before the fork, L5); cleared by `setDoor` (both arms, beside `pressedOnThisRun` and `switchedOffThisRun`), by `confirmDoor` when it records an agreement, and by the counted start (beside `this.startRefusal = null`, `ipc.ts:1086`); memory only. WHY (the attack, §Attack F5): `not-approved` is in the return set and `approvedOnly` stops a return only while the read still lacks Funnel's two capabilities; a start that refuses `not-approved` (or `busy`, or a race to `not-running`) WITH the capabilities present would otherwise fork and spawn again on every focus, which is the very loop `shields-up` was taken out of the set to avoid. With the bound, after one return-started start that does not publish, the next press (Try again) is today's | §Attack F5 |
| D9 | **One new channel for the return, `pocket:recheck()`**, answering `PocketStatus`, always, at once. It queues a job only when `rechecks()` AND `returnMayRun(...)` hold: under `this.lastPress.press` and **counting no press** (it never calls `pressed()`), `opening += 1` before its first await as a start does, inside `serially`. A return that arrives while a job that holds `opening` is queued or running is DROPPED (`opening !== 0` fails D7c), not queued; one that arrives behind a job that holds none (a close, a stop, the wake check, a restart whose timer just fired) IS queued, which is why the job's first statements after the superseded check are `if (!this.rechecks(1)) return;` (r2 §Attack F19, F20: a restart or a confirm's start that ran or queued meanwhile makes the return a no-op) and then `returnMayRun` again. Inside the job, after those: **confirmed fields** run `openNow(press, 'start', { returned: true })`, the gate first, exactly as launch does; `openNow` returns `stopped` after its read and BEFORE the fork when `options.returned && this.startRefusalWord === 'not-approved' && read.asksApproval` (the draft's `approvedOnly`, now derived inside `openNow` from the one option), and sets `returnForked` (D8b) before the fork otherwise; **unconfirmed fields** require `pressedOnThisRun` again and run `readOnReturn(press)`: `sweepAndRead`, then a public port chosen **only when none is stored** (`choosePublicPort(0, held, read.funnelPorts)`, written; its refusal kept in `readRefusal` as the press keeps it), else the stored port kept or refused, **each refusal kept in `readRefusal`, never in `startRefusal`**: `port-taken` when held, `funnel-ports` when the tailnet's policy no longer allows it. A refusal there therefore makes `confirmable` false, so **no Allow is drawn over a held port** (the attack, §Attack F3: the draft kept `port-taken` as a start sentence, `confirmable` stayed true, the sheet drew the lines and Allow over the held port, and Allow then refused `port-taken` at the start, two presses worse than today's Try again then Allow); the sentence and Try again are drawn, and Try again is the press that chooses again. Nothing starts. **A return never moves a stored port**: only a person's switch chooses again (`ipc.ts:1005-1006`, `:1712-1735`) | the entry item 6; the attack ("A return no longer reuses the press's job as it stands"); §Attack F3 |
| D10 | **Why main drops the second return, not the bus.** MEASURED (§15 M3): the shipping `onWindowLooked` fires EVERY listener on EVERY `focus` and on every `visibilitychange` to visible: twenty synthetic focuses in a row fired 20 calls, and a restore that both shows and focuses the window is two returns. So D9's drop is what keeps reads from overlapping; the sheet adds no debounce of its own | `src/renderer/machines/remote-writes.ts:123-170` |
| D11 | **`setupActions: readonly PocketSetupAction[]`**, main's ONE predicate for which setup press it would act on now: `get-tailscale` while `tailscale === 'missing'`; `open-tailscale` while `tailscale` is `stopped` or `signed-out`, or `funnel.refused === 'shields-up'`, AND the resolution is `!overrideSet && source === 'pinned' && path === TAILSCALE_APP_PROGRAM`, **never under a development override**, so no probe can open his real Tailscale; `copy-admin-link` while `adminLink !== null`. The sheet draws a setup button only when main lists it | the entry item 7; `approvalOpens` is today's precedent for "drawn only when main says" |
| D12 | **One new press channel, `pocket:setupAction(action)`**, taking ONE closed word (`POCKET_SETUP_ACTIONS`, compared by membership) and answering `boolean`. Each word acts only when `setupActions` lists it at that moment; EVERY path returns `false` first, doing nothing, on `isHarnessLaunch(process.env)` (`src/main/harness/launch-gate.ts:37-44`; the precedent of `conformance:push` P3). `get-tailscale` calls `openExternal(TAILSCALE_DOWNLOAD_PAGE)`; `open-tailscale` calls `openPath(TAILSCALE_APP_BUNDLE)` and answers whether it returned `''`; `copy-admin-link` writes the held link after asking `approvalOpens` again. Nothing takes a URL or a path from the renderer. The opener, the path opener and the clipboard are ONE `PocketHostDeps.setup` seam (`PocketSetupSeam`) handed only by tests (U4's rule); production takes Electron's `shell` and `clipboard`, **read at CALL time and never at module load**: `electronSetupSeam`'s three members are arrows whose bodies name `shell.openExternal(`, `shell.openPath(` and `clipboard.writeText(` (r2 §Attack F23: `src/main/alerts/__tests__/alerts.test.ts`, `src/main/harness/__tests__/alerts-override.test.ts` and `src/main/harness/__tests__/push-seam.test.ts` import the pocket host under an `electron` mock that has no `shell` and no `clipboard`, no builder owns them, and vitest throws on the first read of a member a mock lacks, so a seam built as `{ openExternal: shell.openExternal }` turns three files outside this phase red). **Approve in Tailscale is today's `openApproval`, unchanged** (`ipc.ts:1880-1885`) | the entry item 8 |
| D13 | **The constants.** `TAILSCALE_DOWNLOAD_PAGE = 'https://tailscale.com/download'`, declared once in `src/main/pocket/funnel.ts` beside `FUNNEL_APPROVAL_HOST` (`:129`) and compared with `===`. `TAILSCALE_APP_BUNDLE = '/Applications/Tailscale.app'` and `TAILSCALE_APP_PROGRAM`, derived from it and equal to `TAILSCALE_CANDIDATES[0]` (`tailscale.ts:71-75`), declared in `src/main/machines/tailscale.ts` and imported, because `conformance:pocket` U2 refuses any Tailscale path literal in the pocket domain (`build/conformance-pocket.mjs:3272`). MEASURED: `approvalOpens('https://tailscale.com/download')` is false (§15 M2), so the download page is a constant of its own and never an approval URL | the entry item 8 |
| D14 | **The words main owns**, in `src/shared/ipc/pocket.ts` beside its other sentences: `POCKET_SETUP_LINE` "Your iPhone needs only the Tortie app. This Mac needs Tailscale (free)."; `POCKET_TURN_ON_LINE` "Turn it on, then come back."; `POCKET_SIGN_IN_LINE` "Sign in, then come back."; `POCKET_ASK_ADMIN` "Ask your Tailscale admin to approve Funnel."; `POCKET_NAME_WAIT_NOTE` "This can take several minutes. You can leave this open or come back later."; and `POCKET_FUNNEL_APPROVAL` becomes "Tailscale needs your OK, once." (approval adds the `funnel` attribute for the tailnet, research 132 §7.6). In `src/shared/push-copy.ts`: `PUSH_PUBLISHER_ONLY` "Only Tortie’s publisher can send alerts for now.", and its header's "drawn by Phase 316's app or written to the log" gains "or drawn on Settings then Phone's Alerts card". `POCKET_FUNNEL_SENTENCES` does not move: its setup sentences stay for `pocket:confirmDoor`'s refusal and the error line | the entry item 9; research 140 §6 last paragraph (a stranger's own key cannot work: `src/main/alerts/key-file.ts:103` stamps his team, Apple refuses, `src/shared/push-copy.ts:27`) |
| D15 | **Comments that become false are rewritten in the same commit**: `readTailnet`'s "never from opening a sheet and never on a timer" (`funnel.ts:690-692`) and `publicName`'s "opening the sheet reads nothing" (`pocket.ts:842-846`) say a return reads under `rechecks()`; `tailscale.ts`'s header names the stat in `status()` and the two constants; `PhoneSection.tsx`'s header loses "NO DISCLOSURE" (`:26-28`) and names the steps; `src/preload/pocket.ts`'s header says fifteen | the entry item 10 |
| D16 | **The return, on the sheet.** The connected section subscribes ONCE to `onWindowLooked` (the existing helper, `remote-writes.ts:166-170`, not a second listener) and calls `api.recheck()` on each event, and once at mount while `document.hasFocus()`. Nowhere else: no interval, no timeout, no animation frame names `recheck`. It unsubscribes on unmount, so `lookedListenerCount()` returns to where it was. The section mounts only while Phone is the Settings window's section (`src/renderer/settings/SettingsApp.tsx:270`) | the entry item 14; CLAUDE.md "grep for an existing helper" |
| D17 | **The code asked for.** The switch's ON press in this section sets the wish (`pairAfterAllow = 'pressed'`) ONLY while no phone is paired, asked as exactly `status !== null && status.phones.length === 0` (r2 §Attack F27: never `(status?.phones.length ?? 0) === 0`, which reads a status not yet loaded as "no phones"; the switch is disabled while `status === null` today, `PhoneSection.tsx:769`, so the two agree now, and the plain form keeps his paired Mac from ever being handed a code it did not ask for if a later round enables the switch earlier, and gives SU7 one text to read), and so does **Try again** (`onRetryDoor`, which is `setDoor(true)`, the switch's own press again, `PhoneSection.tsx:1162`), under the same condition (the attack, §Attack F11: without it a first setup that met `shields-up`, `busy`, `failed` or a port, all of which drop the wish, still needed Pair after the fix). `pairAfterAllowNext` keeps the wish across a refusal **while `status.rechecks` is true**, and otherwise answers exactly as today (`PhoneSection.tsx:365-375`); it still names no `nameProgress` (D10 of `conformance:pocket`) and compares no `nameCheck` (D6 of `conformance:pocket`). With a phone paired, step 3's **Pair** keeps today's behaviour, door off included (`onPair`, `:1166-1176`, unchanged) | the entry item 15; the attack ("The wish survives a refusal a return re-checks") |
| D18 | **The confirm at Allow is today's block, byte for byte** (his ruling 2): `[data-phone-confirm]` holds every `confirmLines` line, `POCKET_CONFIRM_WARNING`, `POCKET_DOOR_HONESTY`, `POCKET_FUNNEL_RIGHT_WARNING` under `funnel.asksApproval`, and `confirm-door` (`PhoneSection.tsx:774-797`), none inside a `<details>`, the lines and hash handed back unedited (`:1123-1129`). `probe:p317` W1 and `probe:p318` R0 read `POCKET_DOOR_HONESTY` inside it (`build/p317/probe-p317.mjs:1285`, `build/p318/probe-p318.mjs:1767`) and do not move | his ruling 2; `pairing.ts:396` ("so no sheet can omit it") |
| D19 | **The file split, with no import cycle.** NEW `src/renderer/settings/phone/steps.ts` (pure, no React) holds `checklistOf`, the words the phone does NOT quote (step titles, state words, the setup buttons' words, the disclosures), and, MOVED from `PhoneSection.tsx` with unchanged bodies and re-exported there, `doorNeedsConfirm`, `doorMayRetry` and the `PairingStage` type. NEW `phone/Steps.tsx` draws the step FRAME (number, title, state, the done mark, a body slot). Neither imports `PhoneSection.tsx`. `PhoneSection.tsx` keeps every constant the phone quotes (`PHONE_TITLE`, `BTN_PAIR`, `BTN_TRY_AGAIN`, `CODE_EXPIRED`, `BTN_REMOVE`, `BTN_CANCEL`, and `BTN_ALLOW`, which the phone now names), `BTN_OPEN_TAILSCALE` (which `probe:p330` picks by name, `build/p330/probe-p330.mjs:285`), `SCAN_LINE`, `pairingStage`, `pairAfterAllowNext`, `onPair` and the bodies it fills the slots with (the confirm block, the approval block, the pair card) | §3 row 6: the entry put every label in `PhoneSection.tsx`, which `Steps.tsx` would then import while `PhoneSection.tsx` imports it |
| D20 | **The phone's first screen.** `PairingModel` gains `private(set) var scanning = false`, set ONLY by `startScanning()`, which **Scan code** calls. `QRScanner(` is constructed only inside the branch `if model.scanning`, so iOS asks for the camera after the press, in context (today it is built at once, `ios/Tortie/Screens/PairingScreen.swift:200-229`). The ask itself is `AVCaptureDevice.requestAccess(` in `ScannerView.start()` (`:344-361`), reached only from `QRScanner.updateUIView`; av5 holds that it stays the one call, so nothing asks earlier (r2). The DEBUG payload seam still reads a code with no press (`App/TortieApp.swift:241-246`, `:579-584`), so `probe:p316` and the UI drive pair as before; with a code read and `scanning` false the steps stay and the fingerprint card is drawn below them. Rule (v) holds: `line` is never empty, `pairingSentence` returns `String` | the entry item 18 |
| D21 | **The site's three addresses** (`Markdown/Links.swift`): `enum SiteLink: CaseIterable { case home, privacy, support }`, whose `address: URL?` is made with `URL(string:)` from the only three `https://` literals in the app, `https://tortie.sh`, `https://tortie.sh/privacy`, `https://tortie.sh/support`, never with `!` (the file is inside rule (y)'s renderer scope, `build/conformance-ios.mjs:4166`, y3); a nil address opens nothing. `protocol SiteOpening { func open(_ link: SiteLink) }` and ONE `struct SiteOpener: SiteOpening` whose `open` takes a `SiteLink`, never a `URL` or `String`, and asks `LinkPolicy.opens(` in the same body before its one `UIApplication.shared.open(` (z4's shape, `build/conformance-ios.mjs:4620-4623`). No alert comes first: the address is compiled and the words say where it goes. The answer-link gate is unchanged, for bytes somebody else wrote. `PairingScreen` and `SettingsScreen` take `site: any SiteOpening = SiteOpener()`; a test hands a fake. **Each press is a named method of its screen** whose body is exactly `site.open(.<case>)` (`openMacSite()`, `openPrivacy()`, `openSupport()` on each screen that draws the row), and each `Button`'s action names that method and nothing else (r2 §Attack F28: a SwiftUI `Button`'s action cannot be invoked from XCTest, so the draft's "the views' actions invoked directly" had no way to run; a test constructs the screen value with a fake and calls the methods, which reads no `@State`). Neither screen calls `UIApplication.shared.open(` itself, so rule (z)'s file list does not grow, and z5 (Settings opens only iOS's notification settings) still holds | the entry item 19; research 140 §8 row 3; rule (z) refuses `Link(` (`build/conformance-ios.mjs:280-290`) |
| D22 | **Settings then About** (`Screens/SettingsScreen.swift:284-307`) gains three rows under Version, each a `Button` at least `SettingsFrame.lineHeight` (44) tall: **Tortie for Mac** with `tortie.sh` on the right (opens `.home`), **Privacy** (`.privacy`) and **Support** (`.support`) | the entry item 19; research 136 §7 (5.1.1(i), 1.5) |
| D23 | **The Allow line.** `DoorWords.reachNote(for sentence: String) -> String?` answers `Copy.reachAllowAgain` exactly when `sentence == Copy.cannotReachMac`, else nil. `FailureView` (`Screens/Pieces.swift:324-343`) draws it under its sentence, id `ID.reachNote(id)` = `<id>-note`, only when it answers. "Your Mac did not answer in time." gets none; the pairing screen's own `.unreachable` line gets none (it is not a `FailureView`). A shut door never finishes a handshake, so a paired phone reads it as `.unreachable` → `cannotReachMac` (`DoorWords.swift:293`; `.closedBeforeAnswer` needs `ready`, `Door/DoorClient.swift:631-650`) | the entry item 20; research 140 §7.3, §5 row 12 |
| D24 | **The version, lowest priority** (`Door/Pairing.swift`, `Screens/DoorWords.swift`). After today's size check, `parse` decodes `{ v: Int, fp: String, dk: String, dx: String }` first, **the Tortie marker**: `fp` must decode as base64url to exactly 32 bytes (`Base64URL.decode`, as today's v:3 check does) and `dk` and `dx` must be present as strings; a code without the marker is `badCode` whatever its `v` (r2 §Attack F24: decoding `{ v }` alone made ANY JSON code with an integer `v` of 1 or 2, a shape other apps' codes use, say "This code is from an older Tortie for Mac. Update Tortie on your Mac.", which is false, where today it says "That is not a Tortie pairing code.", which is true; and no public Mac ever sent v:1 or v:2, so the older arm's only real input today is somebody else's code. Every code a Tortie Mac drew since v:2 carries `fp`, `dk` and `dx`: `a8e06fe7^:src/main/pocket/pairing.ts:1096-1104` and `conformance:pocket` F2's v:3). Then, compared with `PairingOffer.version` and never written as arithmetic (rule (k)): `v > version && v <= 99` throws `codeFromNewerMac`; `v >= 1 && v < version` throws `codeFromOlderMac`; `v == version` goes on to the whole v:3 shape, where any wrong field is still `badCode`; anything else (0, 100 and above, negative, a string, a fraction, null, missing, not JSON) is `badCode`. A later Mac that changes the code keeps the marker, which `build/p3331/SPEC.md` hands to 333.12 and 318.1 (§12). `PairingFailure.unsupportedCode` is REMOVED (its one producer was the old `v` check, `Pairing.swift:109`) and its readers move (`DoorWords.swift:411`, `ios/TortieTests/DoorWordsTests.swift:61`, `DoorPairingTests.swift:360-361`, `ScreensModelTests.swift:384`). `pairingSentence` maps the two new cases to `Copy.pairNewerMac` and `Copy.pairOlderMac`. **If the build runs short, this is the item dropped**, said in the commit body | the entry item 21; research 136 §14 (the phone and the Mac update on separate clocks) |
| D25 | **The words** (`Style/Copy.swift`), each a one-line `static let` with its owner above it (§5.6). The `/// Names:` count goes from 7 to **9** (three leave with `pairStepOnMac`; `setupOpenPhone` names the window title and `PHONE_TITLE`; `reachAllowAgain` names `BTN_ALLOW`, the window title and `PHONE_TITLE`), and `PHONE_NAMES_FLOOR` (`build/p311/copy-drift.mjs:1351`) rises to 9 | the entry item 22; §3 row 7 (the entry said 8) |
| D26 | **Build 8.** `CURRENT_PROJECT_VERSION = 8` in all six configurations (`ios/Tortie.xcodeproj/project.pbxproj:417`, `:449`, `:479`, `:501`, `:522`, `:543`), `PHONE_BUILD = '8'` (`build/conformance-ios.mjs:3010`); rule (s)'s "not uploaded" fixtures become 9 (`:7184-7185`); `ablation:p316`'s two regexes that read build 7 (`build/p316/ablation-ios.mjs:1298`, `:1643`) read 8 and write 9 and 7; `SettingsTests` reads `1.0.0 (8)` (`ios/TortieTests/SettingsTests.swift:174-183`) | the entry item 23; research 140 §8 row 3 |
| D27 | **The mock follows the app.** `docs/design/phone/Pairing.html` draws the RESTING face (the three steps, Scan code, the foot); NEW `docs/design/phone/PairingScan.html` draws the camera face after Scan code (the scanner, `pairStepScan`, the fingerprint card, `pairWaitingForAllow`, the foot); `Settings.html`'s About card draws its three new rows; `index.html` frames the new screen and its footer says sixteen. "Enter a code instead" leaves the mock and its OWED rule leaves the ledger (`copy-drift.mjs:1085-1089`), because the app never drew it and this phase refuses a typed code (§13) | the entry item 24; every ledger rule must match something (`copy-drift.mjs:2040-2050`) |
| D28 | **The step numbers are positions, never literals and never arithmetic**: the phone draws `String(n)` from `zip(1..., SetupStep.allCases)`, so rule (b) (no drawn literal outside `Copy.swift`) and rule (k) (every arithmetic operator named, `build/conformance-ios.mjs:1536-1592`; `...` is not an operator it reads) are both untouched. The Mac draws `String(i + 1)` from the step list in `phone/Steps.tsx` (no rule reads renderer arithmetic) | rule (b); rule (k) |
| D29 | **Never "beta", "TestFlight", "remote desktop", "mirror", "stream" or "SSH"** in any drawn word on either side: `conformance:pocket` SU9 over every string literal of `PhoneSection.tsx`, `phone/**`, `src/shared/ipc/pocket.ts` and `PUSH_PUBLISHER_ONLY`; `conformance:ios` av6 over every `Copy.swift` value. Word-bounded and case-insensitive, comments not read. MEASURED (§15 M6): none today; the one hit, "streamed" in `pocket.ts:1446`, is a comment | his answer (3); research 140 §10 |
| D30 | **No door route, no QR change, no hashed field.** `POCKET_ROUTE_IDS`, `POCKET_EXECUTION_HASH_ALGORITHM`, `NORMALIZE`, the QR's `v: 3` and `conformance:pocket` R4's pin are untouched; no paired phone is asked to Allow again, so this phase does not wait for 333.12 | his answer (4); the entry "What is NOT" |
| D31 | **`gate:contract` moves by two lines**: `[ipc.invoke.channels] count=246` becomes 248 with `pocket:recheck` and `pocket:setupAction` (`docs/audits/contract-baseline.txt:5`, `:166-178`). The baseline names channels, not status fields or words, so nothing else of this phase appears there; no new `GMUX_*` name is added (the env section is `GMUX_*` across `src/`, `build/` and `package.json`, `build/contract-inventory.mjs:297-310`) | §3 row 4 (the entry listed status fields and words as baseline lines) |
| D32 | **`HELPER_USER_FLOOR` 170 becomes 171** for `build/p3331/probe-p3331.mjs`, in the same commit (`build/assert-electron-teardown.mjs:469`) | §3 row 5 (the entry said 169 → 170; Phase 343 raised it to 170) |
| D33 | **The real return is driven through the document's visibility**, the helper's other real trigger: the Settings window `hide()` then `showInactive()` from main's inspector, `document.visibilityState` read `hidden` then `visible`, and the recheck counted by the stand-in's log; a run whose visibility does not move is UNREADABLE, never a pass. The focus path (`blur`, then `focus`) runs only with `P3331_REAL_FOCUS=1`, because giving focus back to Tortie takes it from whatever he is typing into | §3 row 8 |
| D34 | **Row 12 reaches the clause it is named for.** As the entry wrote it, a relaunched unconfirmed door has no refusal word (an unconfirmed door is never read without a press, `ipc.ts:954-963`), so D7(g) already refuses and `pressedOnThisRun` is never asked. The reachable shape is: a CONFIRMED door relaunched with Tailscale stopped (the launch read leaves `not-running`), then **Remove** of its phone (which withdraws the agreement, `ipc.ts:1852-1865`), then Tailscale running: unconfirmed, a refusal word in the set, not pressed this run. Only D8 refuses a return there | §3 row 9; traced in §15 M7 |
| D35 | **No probe calls `pocket:setupAction`.** A probe that did would open his browser or his Tailscale, or write his clipboard, the moment the harness return regressed. So the probe reads only what `setupActions` LISTS (open-tailscale never under the override), and the press itself is driven by ONE vitest over the seam, the only drive of a real setup press | the entry's proof item 1; §0 |
| D36 | **The stand-in gains three things** (`build/p330/tailscale-standin.mjs`): `selfUser` (true: a `User` map `{"<UserID>": {ID, LoginName, DisplayName, ProfilePicURL}}` with a made-up `person@example.com` or the scenario's `account`, as Tailscale 1.100 and later answer; false, the default: `User: null`, as 1.98 and earlier); an **absent** mode, `setAbsent(true)` rewriting the wrapper's first line to an interpreter that does not exist and `setAbsent(false)` restoring it, each recording the wrapper's hash again so the preflight still passes (its `exec` line is unchanged, `:776-788`); and `readDelayMs`, which holds a `status` or `serve status` answer that long, for the attack arms that need a read in flight. Its `--self-test` gains a case each | the entry's proof item 2; MEASURED (§15 M2): the stand-in has `User: null` and `UserID: 1` today, and an absent-interpreter wrapper reads `no-tailscale` through the shipping read |
| D37 | **`probe:p3332` is re-pinned, not retired.** Its claim was 333.2's (only the scan line's rectangles move); this phase moves the section on purpose. Its model is re-drawn on the three-step layout, its CMP compares HEAD with the parent over a NAMED set that may move (everything between the switch row and the pair card, the code face's side column, which gains a line, and the key row, which gains a caption), every other rectangle equal | the entry item 17; CLAUDE.md's `probe:p3332` row |
| D38 | **The CHANGELOG item goes under `### Changed`** in `## Unreleased`, one line, two sentences (§8). The follow-up docs commit adds the commit link | CHANGELOG.md's house rules (`:1-5`); the entry's draft |

**Subject.** `feat(pocket): set up the phone in three steps, and say where Tortie for Mac comes from`

**First body line.** `Phase 333.1: a stranger's first run, on the Mac and the phone`

**Semver.** Minor for the Mac: a reworked setup surface and two new renderer channels, unreleased under his rule, riding the next
minor release (0.111.0 if that is the tag; the phone's "0.111 or later" moves with it, research 140 §10). The iPhone app stays
1.0.0 and becomes **build 8**. Nothing is released or uploaded by this phase.

**Tier 3.** CLAUDE.md's tier questions: "Does it spawn a process ... **Tier 3**": a return runs Tailscale's two reads with no press
and, on confirmed fields, forks the door process and spawns the Funnel child; Open Tailscale launches an app; the phone gains a way
out of the app. Budget: the gates, a per-row matrix over every Tailscale state at the parent and at HEAD, the phone on iOS 26.3 and
the 18.3 floor, and two independent methods, one an attack (§7.9 names four). Then a fix round if any verdict is needs_work, and an
independent reverify of that fix, once.

---

## 2. The tree at this head, re-read

| What | At `cb8d52a6` | Note |
| --- | --- | --- |
| The sheet | `src/renderer/settings/PhoneSection.tsx` (1,244 lines): header `:1-36` ("THERE IS NO KEY FIELD AND NO DISCLOSURE", `:26`); words `:68-247`; `doorNeedsConfirm` `:291-298`; `doorMayRetry` `:306-311`; `doorLine` `:314-324`; `pairingStage` `:333-348`; `pairAfterAllowNext` `:365-375`; `PairCard` `:578-687`; `ApprovalBlock` `:689-728`; the confirm block `:774-797`; Try again `:801-813`; Alerts `:861-916`; the connected section `:925-1244` (`confirmDoor` `:1123-1133`, `onRetryDoor` `:1162`, `onPair` `:1166-1176`) | D1, D17, D18, D19 |
| Its folder | `src/renderer/settings/phone/{Qr.tsx,qr-colors.ts,qrcodegen.ts}`; `phone-section.css` (198 lines, `.phone-block` `:13`, `.phone-line` `:31`, `.phone-showing` `:53`, `.phone-name*` `:136-198`) | NEW `steps.ts`, `Steps.tsx` |
| The house disclosure | `.set-disclosure` `src/renderer/settings/settings.css:1440-1465`; the quiet button `.set-inline-btn` (Phase 202, `:1467` on) | reused |
| The return helper | `onWindowLooked`, `lookedListenerCount` `src/renderer/machines/remote-writes.ts:161-175`, a bus attached on the first subscriber (`:123-145`); the module imports nothing | reused (D16) |
| The owner | `src/main/pocket/ipc.ts` (2,032 lines): `PocketHostDeps` `:235-288`; `RETRIED` `:353-359`; fields `:402-440` (`opening` `:409`, `read` `:413`, `readRefusal` `:415`, `startRefusal` `:417`, `approvalUrl` `:422`); `confirmable` `:739-745`; `status()` `:759-816`; `serially` `:830-837`; `pressed` `:857-861`; `start` `:872-884`; `sweepAndRead` `:905-941`; `openNow` `:960-1109`; `armRestart` `:1135-1144`; `openAtLaunch` `:1298-1312`; `setDoor` `:1630-1705`; `readAtPress` `:1712-1735`; `confirmDoor` `:1812-1841`; `removePhone` `:1852-1865`; `openApproval` `:1880-1885`; `registerPocketIpc` `:2016-2032` (THIRTEEN channels) | D2 to D12 |
| Funnel | `src/main/pocket/funnel.ts` (1,421 lines): `FUNNEL_APPROVAL_HOST` `:129`; `execReal` `:218-249`; `funnelProgramOf` `:309-318`; `parseTailnetStatus` `:390-445`; `approvalOpens` `:599-617`; `classifyFunnelExit` `:635-655`; `execRefusal` `:676-687`; `readTailnet` `:694-715` (the false comment `:690-692`) | D4, D13, D15 |
| The resolver | `src/main/machines/tailscale.ts` (334 lines): `TAILSCALE_CANDIDATES` `:71-75`; `isExecutableFile` `:78-86`; `resolveTailscale` `:108-146` (the per-call warning `:130-133`) | D3, D13 |
| The contract | `src/shared/ipc/pocket.ts` (1,464 lines): `PocketFunnelView` `:763-779`; `PocketStatus` `:840-935` (`publicName`'s false comment `:842-846`); the sentences `:1035-1194`; `PocketInvokeChannelMap` `:1212-1271`; `GmuxPocketExtras` `:1289-1306` | D2, D4, D5, D9, D12, D14 |
| The preload | `src/preload/pocket.ts` (47 lines, "thirteen reads and presses", `:2`) | D15 |
| The menu row | `Pair a Phone…`, `src/main/menu.ts:643-645`, directly under `Settings…`; `conformance:pocket` MENU1 | unchanged (§10) |
| The phone's pairing screen | `ios/Tortie/Screens/PairingScreen.swift` (412 lines): `PairingModel` `:49-146`; the screen `:157-288` (`heading` `:185-196`, `scanner` `:200-229`, `foot` `:259-287`); `QRScanner` `:304-325` | D20 |
| The links | `ios/Tortie/Markdown/Links.swift` (173 lines): `LinkPolicy.opens` `:51-64`; `linkGate` `:145-173`, applied only to the paired tabs (`App/TortieApp.swift:652`) | D21 |
| Settings | `ios/Tortie/Screens/SettingsScreen.swift`: `aboutCard` `:284-308`; `openNotificationSettings` `:310-315`; `SettingsFrame.lineHeight = 44` `:320` | D22 |
| The failure view | `ios/Tortie/Screens/Pieces.swift:324-343`, on six screens (`App/TortieApp.swift:837`, `Screens/Screen.swift:354`, `ListScreen.swift:369`, `SessionsScreen.swift:646`, `ConversationScreen.swift:367`, `:418`) | D23 |
| The door's words | `ios/Tortie/Screens/DoorWords.swift`: `sentence(for:)` `:280-299`; `pairingSentence` `:406-419`; `stepSentence` `:423-431` | D23, D24 |
| The code | `ios/Tortie/Door/Pairing.swift`: `PairingOffer.version = 3` `:63`; `parse` `:102-128`; `PairingFailure` `:133-160` | D24 |
| The words | `ios/Tortie/Style/Copy.swift` (819 lines): `pairTitle` `:244`; `pairStepOnMac` `:252` (three `/// Names:` `:249-251`); `pairStepScan` `:255`; `pairPrivateNetwork` `:268`; `pairNotACode` `:291`; `notPaired` `:298`; `pairNameNotFound` `:318` (one Names); `unpairNote` `:374` (three Names); `about` `:388`; `cannotReachMac` `:682` | D25 |
| Identifiers | `ios/Tortie/Screens/Identifiers.swift:314-324` (pairing), `:344` on (settings) | §5.5.6 |
| The build | `ios/Tortie.xcodeproj/project.pbxproj:417`, `:449`, `:479`, `:501`, `:522`, `:543` (`CURRENT_PROJECT_VERSION = 7`); `PHONE_BUILD = '7'` `build/conformance-ios.mjs:3010` | D26 |
| The phone gates | `build/conformance-ios.mjs` (11,336 lines): `isRenderer` `:4166`; rule (k) `:1536-1592`; rule (v) `:2900-2962`; rule (s) `:3240-3256`; rule (z) `:4568-4663`; `RULE_IDS` `:10687` ending at `au` | (av) is the next letter |
| The door gates | `build/conformance-pocket.mjs` (10,608 lines): 127 rules; B1 `:181`, `:1225-1245` (THIRTEEN); R3 `:175`, `:1256-1310`; U2 `:199`, `:3272-3300`; U4 `:201`; `phoneSurfaceFiles` `:2159-2165`; D6 `:217`, `:4970`; D10 `:268`, `:5165`; MENU1 `:4170-4191`. Rule ids `SU*` are free | SU1 to SU9 |
| The ledger | `build/p311/copy-drift.mjs`: the pairing rules `:296-336`; About and Version `:690-703`; the integer data rule `:919-922`; "Enter a code instead" `:1085-1089`; `OWNED_RULE_FLOOR = 89` `:1130`; `PHONE_MAC_FLOOR = 80` `:1350`; `PHONE_NAMES_FLOOR = 7` `:1351`; every rule must match `:2040-2050` | §5.6 |
| The stand-in | `build/p330/tailscale-standin.mjs` (1,284 lines): scenarios `:47-73`; `DEFAULT_SCENARIO` `:136-152`; `statusOf` `:314-378` (`UserID: 1` `:345`, `User: null` `:375`); `wrapperText` `:669-681`; `makeStandin` `:688-714`; `preflightStandin` `:760-790` | D36 |
| The readers of the sheet's faces | `src/renderer/settings/__tests__/p316-phone-section.test.tsx` (no `<details` `:248-254`); `build/p330/probe-p330.mjs` (`SPEC_WORDS` `:236-246`, the words by name `:280-290`, A3 `:332-345`, `:1360-1370`); `build/p332/probe-p332.mjs:748-772`; `build/p3321/probe-p3321.mjs:1072-1082`; `build/p3332/probe-p3332.mjs` (header `:1-80`, model `:385-425`); `build/p317/probe-p317.mjs:1285`; `build/p318/probe-p318.mjs:1767`; `build/p330/CHECKLIST.md` row 3 (`:71-75`) and its table `:218` | §11 |
| Floors | `HELPER_USER_FLOOR = 170` (`build/assert-electron-teardown.mjs:469`); `SIMULATOR_USER_FLOOR = 2` (`build/assert-simulator-teardown.mjs:120`) | D32; the simulator floor stays |
| The baseline | `docs/audits/contract-baseline.txt:5` (`count=246`), `:166-178` (13 `pocket:*`) | D31 |
| The phone probe | `build/p316/probe-p316.mjs` (9,832 lines): arm groups `:695`, `:791`; runtimes `:800`; `selfTest` `:6117`, `--grader-self-test` `:6240`; `P316DriveUITests.swift` (`pairing-*` ids `:207-215`, launch with a code `:427`) | the `setup` group |

---

## 3. Where the entry, the research and his rulings are reconciled

| # | The entry or research says | What is true now | This spec |
| --- | --- | --- | --- |
| 1 | "`status()` asks it at most once per call" (item 1) | `resolveTailscale` warns per call under an unusable development override (measured 2 for 2) and `setupActions` also needs the resolution | ONE `resolve()` per `status()`, handed to both (D3) |
| 2 | Step 1 "`installed`, the switch off" | `status()` already refuses a read sentence for a door that is off (`ipc.ts:776-779`), and the entry's `ready`/`stopped` from the last read would outlive the press that read them | with the switch off, the stat alone (D2) |
| 3 | The start's refusal set at "`:948`, `:971`, `:1000`, `:1008`, `:1033`, `:1075`, `:1728`, and every `startRefusal = null`" | right, and also `:1086` and `:1733` (the nulls) | every site (D5) |
| 4 | `gate:contract`: "the status fields `tailscale`, `account`, `tailnet`, `rechecks` and `setupActions`; `PocketFunnelView.refused`; and the `PocketTailscaleState` and `PocketSetupAction` words" | the baseline lists channels, migrations, schema, storage keys, `GMUX_*` names, smoke modes and bundle refusals, never a field or a type (`docs/audits/contract-baseline.txt:5`, `:253`, `:258`, `:279`, `:368`, `:410`, `:529`, `:569`) | two channel lines and the count move; the commit body says so and names the fields as the contract's, not the baseline's (D31) |
| 5 | "`HELPER_USER_FLOOR` 169 becomes 170" | it is 170 since Phase 343 (`build/assert-electron-teardown.mjs:469`) | 170 → 171 (D32) |
| 6 | "The labels, renderer words in `PhoneSection.tsx`"; "`checklistOf(status, offer, view, now, wished)`" | `phone/Steps.tsx` drawing the labels would import `PhoneSection.tsx`, which imports it; and `offer`, `view` and `now` decide only `pairingStage`, which `conformance:pocket` D6 and D10 read in `PhoneSection.tsx` | non-quoted words, `doorNeedsConfirm`, `doorMayRetry` and `PairingStage` in `phone/steps.ts`, re-exported; quoted constants and `pairingStage` stay; `checklistOf(status, stage, wished)` (D19, §5.4.5) |
| 7 | "The `/// Names:` count goes from 7 to 8" with Names on `reachAllowAgain` for `BTN_ALLOW` and `PHONE_TITLE` | `unpairNote`, the precedent, names all three Mac nouns its sentence holds (Remove, Settings, Phone, `Copy.swift:371-374`) and `reachAllowAgain` names Settings too | three Names on `reachAllowAgain`; 7 → 9 (D25) |
| 8 | "the real one at least once per build (the Settings window's focus taken away and given back, measured, `probe:p321`'s precedent)" | giving focus back steals it from his own app while he works; the helper also fires on the document becoming visible (`remote-writes.ts:149-152`) | the real return through `hide()`/`showInactive()`; focus behind `P3331_REAL_FOCUS=1` (D33) |
| 9 | Row 12: "switch on, never allowed, relaunched, stand-in now present: a return makes zero calls (not pressed this run)" | at launch an unconfirmed door is not read (`ipc.ts:960-963`), so there is no refusal word and D7(g) refuses before D8 is asked; the row would pass with D8 deleted | the reachable shape: confirmed, relaunched with Tailscale stopped, Remove, Tailscale running (D34) |
| 10 | Attack A9: "`setupAction` answering false under the harness" in the probe | a probe that calls it risks his browser, his Tailscale or his clipboard on a regression | the probe reads the list only; the vitest drives the press (D35) |
| 11 | The entry's mock note: the phone mock draws one frame | the camera face and the resting face cannot both be the 390 by 844 frame, and every ledger rule must match a drawn string (`copy-drift.mjs:2040-2050`), so the fingerprint card's rules need a frame | `Pairing.html` the resting face, NEW `PairingScan.html` the camera face (D27) |
| 12 | "`DoorPairingTests.swift` ... a v:2 code as the 316.4 Mac drew it" | rule (p) refuses `tk`, `tailnetKey` and `tskey-` anywhere under `ios/` (CLAUDE.md, `conformance:ios` (p)), and the 316.4 code carried its tailnet key | the v:2 fixture is that shape with its tailnet-key field left out, which cannot move the verdict, because `v` is read first (D24, §7.3) |
| 13 | Research 140 §8 row 3: "Tier 2" | the return check forks and spawns with no press | Tier 3, as the entry ruled |
| 14 | The entry's proof item 2: "`P3331_PARENT_CHECKOUT`, a built checkout of `f5ff5183` or the main tip it lands on" | `git diff f5ff5183 cb8d52a6` over every path this phase touches is empty (§15 M8) | the parent is `cb8d52a6`, the base of this delta, for the Mac and for `ios/` (build 7) |
| 15 | The entry's attack A5: "a return with a stored port held by another serve" | it can be met on confirmed fields (`openNow`'s own refusal) or on unconfirmed fields (`readOnReturn`), two code paths | A5a and A5b (§7.5.4) |
| 16 | The entry's step 1 table: `missing` has **Get Tailscale** and nothing else | his ruling 3 keeps a quiet Try again "on every step that waits on Tailscale", and a return cannot help a person who came back while the installer was still running: the stat found nothing, D7b queued nothing, and the install then finished with Tortie in front, so no return follows; today that person has Try again | `missing` gains the quiet Try again while the switch is on (§5.4.2; §Attack F2) |
| 17 | The entry's item 4: a non-opening URL "crosses as `funnel.approvalText`, selectable text" | that text would sit beside "Ask your Tailscale admin to approve Funnel.", an instruction to send a refused address to someone | only a link that passes `approvalOpens` is kept; the wait's own text arm is unchanged (D6; §Attack F9) |
| 18 | The entry's item 5 and 6: the return set and `approvedOnly` | a start that refuses again with the capabilities present forks and spawns on every focus; after a launch whose read failed, a program at another pinned path runs on a focus | D7 (i) and D8b bound it to once per press; D7b runs only the confirmed program on confirmed fields (§Attack F5, F6) |
| 19 | The entry's proof item 2, the presses table: "lower in rows 1, 2, 3 and 6"; §7.10 "A first setup with Tailscale ready ... one press fewer" | the parent's fewest presses for a ready Tailscale are Pair with the door off, Allow, and the code by itself (`onPair`, `PhoneSection.tsx:1166-1176`; `build/p330/CHECKLIST.md` row 2), the same two as HEAD's switch and Allow | the parent's count is its FEWEST presses, Pair with the door off included; the ready row is the same, not one fewer (§7.5.3, §7.10; §Attack F7) |
| 20 | §7.1 and §11 of the draft: "`smoke:t1` is the standalone harness and the integrator runs it" | `build/smoke-standalone.mjs:53`, `:130` launches an Electron through `runElectron` | `smoke:t1` runs under the lock with `smoke` and `smoke:t3`, by Lens 2 or the main session, never by a builder or the integrator (§Attack F17) |
| 21 | The entry item 5: "the switch is on" | an off press whose save fails leaves the held store on (`writeStore`, `ipc.ts:623-628`, "answer false and hold what was"), MEASURED r2 M10 | D7 (a) also asks `switchedOffThisRun` (D8; r2 §Attack F18) |
| 22 | The entry item 6 and the draft's D9: a return is dropped while a job is queued | only jobs that hold `opening` drop it; a return queued behind a restart whose timer just fired runs after it, and a second start while published corrupts the state, MEASURED r2 M9 | the job asks `rechecks(1)` first (D7, D9; r2 §Attack F19, F20) |
| 23 | The entry item 21: "`parse` decodes `{ v }` alone first" | any JSON code with an integer `v` would then claim to be Tortie's | the version is read only behind the Tortie marker (D24; r2 §Attack F24) |
| 24 | The entry's proof item 1 and the draft's §7.3: "the views' actions invoked directly" | a SwiftUI `Button`'s action is not reachable from XCTest | named press methods (D21; r2 §Attack F28) |

---

## 4. The base, and what moves under it

### 4.1 The base

`/private/tmp/wt-p3331`'s `HEAD` is `cb8d52a6`, detached, with `node_modules` and `build/vendor` copied in. 333.1's work goes on top,
UNCOMMITTED. The integrator's first act: `git rev-parse HEAD` reads `cb8d52a6…`, nothing is staged, and `git diff --stat cb8d52a6`
plus `git status --short` name only files §11 assigns (this file included).

### 4.2 What moves under it

- **Order** (the entry): after 337.1 (landed); **never beside 337.2**, which edits `build/p316/probe-p316.mjs` and
  `ios/TortieUITests/P316DriveUITests.swift`; **before 333.3**, which edits `Copy.swift` and the pairing screen. 333.5 (his site
  repository) runs beside it and touches nothing here. If origin/main moves before the land, the committer replays the delta by
  blocks onto the new tip and runs the full battery there; a conflict or a red gate stops the replay and goes to the operator.
- **Build 8 is archived when this lands** and left in his Organizer, read by `node build/p316/test-ios.mjs --read-app`. It is
  uploaded through "App Store Connect" and submitted (333.6) only once 333.5's three pages answer and support@tortie.sh receives
  mail (research 140 §9 steps 1 and 8). Until then its links point at pages that return 404, which is stated, not hidden.
- **The Mac tag that pairs with build 8** is cut from a commit whose `POCKET_ROUTE_IDS` equal build 8's (research 140 §7.2). This
  phase moves no route.
- **The landing cleans up after itself** (his rule of 2026-10-01): once the follow-up docs commit is pushed and no running process
  names the path, the worktree, every parent or clone the verifiers made, `…/scratchpad/p3331*` with every DerivedData, and the
  stale `p3331*` socket files whose server is gone. The landing report says the space freed (`df -k /private/tmp` before and
  after).

---

## 5. The design

### 5.1 The contract — `src/shared/ipc/pocket.ts`

Appended or widened, each with a one-line comment naming 333.1:

```ts
/** Where Tortie stands with Tailscale on this Mac, as step 1 draws it (Phase 333.1, D2). */
export type PocketTailscaleState = 'missing' | 'stopped' | 'signed-out' | 'installed' | 'ready';

/** The setup presses main may act on (Phase 333.1, D11, D12): ONE closed word each, never a URL or a path. */
export const POCKET_SETUP_ACTIONS = ['get-tailscale', 'open-tailscale', 'copy-admin-link'] as const;
export type PocketSetupAction = (typeof POCKET_SETUP_ACTIONS)[number];
```

`PocketFunnelView` gains `refused: PocketFunnelRefusal | null` (D5). `PocketStatus` gains, in this order after `pairable`:

| Field | Type | Meaning |
| --- | --- | --- |
| `tailscale` | `PocketTailscaleState` | D2 |
| `account` | `string \| null` | the account the read named, only while `tailscale === 'ready'` (D4) |
| `tailnet` | `string \| null` | the tailnet the read named, only while `tailscale === 'ready'` (D4) |
| `rechecks` | `boolean` | main's D7 predicate |
| `setupActions` | `readonly PocketSetupAction[]` | main's D11 predicate, in `POCKET_SETUP_ACTIONS` order |

`PocketInvokeChannelMap` gains, with the house comments:

```ts
/** A return to the window (Phase 333.1, D9): reads only when `rechecks` holds; never a press, never a timer. */
'pocket:recheck': { req: []; res: PocketStatus };
/** One setup press (Phase 333.1, D12): acts only when `setupActions` lists it; false under a harness. */
'pocket:setupAction': { req: [action: PocketSetupAction]; res: boolean };
```

`GmuxPocketExtras.pocket` gains `recheck(): Promise<PocketStatus>` and `setupAction(action: PocketSetupAction): Promise<boolean>`.
The channels comment (`:1200-1211`) names the two. The sentences of D14 go beside `POCKET_FUNNEL_APPROVAL`. `publicName`'s
comment (D15) says: "Reading it takes a press, a confirmed start, or a return while `rechecks` holds; opening the sheet with the
door off reads nothing."

### 5.2 Main — `src/main/pocket/ipc.ts`, `funnel.ts`, `src/main/machines/tailscale.ts`

#### 5.2.1 `funnel.ts`

- `StatusFacts`' ok arm and `TailnetRead`'s ok arm gain `account: string | null`; `parseTailnetStatus` reads it as D4 says, after
  every existing clause, so no refusal moves; `readTailnet` carries it.
- `TAILSCALE_DOWNLOAD_PAGE` (D13) beside `FUNNEL_APPROVAL_HOST`.
- `readTailnet`'s comment (D15).
- Nothing else: the argv, the reads, the start, the sweep and the record are unchanged (U1, U3).

#### 5.2.2 `tailscale.ts`

```ts
/** The Tailscale app's bundle, which Open Tailscale opens (Phase 333.1, D13). */
export const TAILSCALE_APP_BUNDLE = '/Applications/Tailscale.app';
/** Its command line copy, the first place Tortie looks. */
export const TAILSCALE_APP_PROGRAM = `${TAILSCALE_APP_BUNDLE}/Contents/MacOS/Tailscale`;
```

`TAILSCALE_CANDIDATES[0]` becomes `TAILSCALE_APP_PROGRAM` (the same string; the candidates' order and values do not move). The
header gains one paragraph (D15).

#### 5.2.3 `ipc.ts`

New private state on `PocketHost`: `startRefusalWord` (D5), `adminLink` (D6; there is no `adminText`), `pressedOnThisRun` and
`switchedOffThisRun` (D8), `returnForked` (D8b). New deps member, TESTS ONLY (U4):

```ts
/** The three setup presses' doors (Phase 333.1, D12). TESTS ONLY; production takes Electron's shell and clipboard. */
export interface PocketSetupSeam {
  openExternal(url: string): Promise<void>;
  openPath(path: string): Promise<string>;
  writeClipboard(text: string): void;
}
// PocketHostDeps.setup?: PocketSetupSeam
```

`status()` (`:759-816`):

- calls `this.funnel.resolve()` once, at its top, and composes `tailscale` (through `tailscaleNow`, below), `account`, `tailnet`,
  `rechecks`, `setupActions` and `funnel.refused` from it and from the fields it already holds;
- `funnel.approvalText` is TODAY'S, unchanged: the waiting URL when the funnel waits on approval and `approvalOpens` is false,
  else null (D6: there is no `adminText`);
- reaches the program only through `funnelProgramOf(resolution)`: never `readTailnet`, `readServe`, an exec or a spawn (SU4).

`tailscaleNow(program: FunnelProgram, on: boolean): PocketTailscaleState` is ONE private method, called once, by `status()`, D2
in this order: switch off → `missing` when `!program.ok && program.reason === 'no-tailscale'`, else `installed`; switch on →
`missing` when that stat says so or `this.readRefusal === 'no-tailscale'`, `stopped` for `not-running`, `signed-out` for
`signed-out`, `ready` when `this.read !== null && this.readRefusal === null`, else `installed`. Its body names no
`tailnetFacts`, `readStore(`, `facts(` or `fields(` (SU4); `on` is handed in by `status()` from the store it already read.

`rechecks(held)` is ONE private method, called by `status()` (as `rechecks: this.rechecks()`) and by `recheck()` (twice: as
`this.rechecks()` before it queues, and as `this.rechecks(1)` inside its job) and nowhere else, written as this chain so the gate
and the ablations read one text:

```ts
/** Would a return to the window re-check this refusal? (Phase 333.1, D7.) `held`: the openings the caller's own job holds. */
private rechecks(held: 0 | 1 = 0): boolean {
  if (this.readStore()?.enabled !== true || this.switchedOffThisRun) return false; // (a) the switch, as the person last left it
  if (this.published()) return false; // (b)
  if (this.opening !== held) return false; // (c)
  if (this.funnelState !== 'idle') return false; // (d)
  if (this.restartCancel !== null) return false; // (e)
  if (pocketShutdownStarted() || funnelShutdownStarted()) return false; // (f)
  if (this.returnForked) return false; // (i)
  const refusal =
    this.readRefusal !== null
      ? RETURN_READ_WORDS.has(this.readRefusal)
      : this.startRefusalWord === 'not-approved'; // (g)
  if (!refusal) return false;
  return pocketConfirmStatus(this.fields()).state === 'confirmed' || this.pressedOnThisRun; // (h)
}
```

with `const RETURN_READ_WORDS: ReadonlySet<PocketFunnelRefusal> = new Set(['no-tailscale', 'not-running', 'signed-out']);`
declared once beside `RETRIED`. `returnMayRun(program: FunnelProgram): boolean` is ONE private method (D7b):
`program.ok && (pocketConfirmStatus(this.fields()).state !== 'confirmed' || program.path === this.fields().funnelProgram)`.
`setupActionsNow(resolution)` is one private method, D11.

`recheck(): PocketStatus` (D9):

```ts
recheck(): PocketStatus {
  if (!this.rechecks()) return this.status();
  if (!this.returnMayRun(funnelProgramOf(this.funnel.resolve()))) return this.status();
  const press = this.lastPress.press; // never this.pressed(): a return is not a press
  this.opening += 1;
  void this.serially(async () => {
    try {
      if (this.superseded(press)) return;
      // r2 §Attack F19, F20: what ran or queued while this return waited decides again.
      if (!this.rechecks(1)) return;
      if (!this.returnMayRun(funnelProgramOf(this.funnel.resolve()))) return;
      if (pocketConfirmStatus(this.fields()).state === 'confirmed') {
        const outcome = await this.openNow(press, 'start', { returned: true });
        if (outcome !== 'published' && this.funnelState !== 'restarting') this.funnelState = 'idle';
      } else if (this.pressedOnThisRun) {
        await this.readOnReturn(press);
      }
    } finally {
      this.opening -= 1;
      this.changed();
    }
  });
  this.changed();
  return this.status();
}
```

`openNow` gains a third parameter `options: { returned?: boolean } = {}`, passed by `recheck()` alone; every existing caller passes
none. Two lines, nothing else of `openNow` moves:

1. after `if (read === null) {…}` (`:985-988`) and before `mayOpen()` again: `if (options.returned === true &&
   this.startRefusalWord === 'not-approved' && read.asksApproval) { this.setFunnel('idle'); return 'stopped'; }`;
2. after the port check (`:1005-1011`) and before `this.setFunnel('starting')` (`:1013`): `if (options.returned === true)
   this.returnForked = true;`. The superseded check stays the statement IMMEDIATELY before `startPocketDoor` (L5).

`readOnReturn(press)` mirrors `readAtPress` (`:1712-1735`) with ONE difference, the port, and keeps every refusal in
`readRefusal` (D9, §Attack F3): `sweepAndRead`; on null or superseded, idle and return; then, with `held =
portsHeld(read.serve)`: stored `publicPort === 0` → `choosePublicPort(0, held, read.funnelPorts)`, its refusal kept in
`readRefusal`, its port written; stored `!== 0` and held → `this.readRefusal = 'port-taken'`; stored `!== 0` and the policy no
longer allows it (`choosePublicPort(stored, held, read.funnelPorts)` answering anything but `stored`) → `this.readRefusal =
'funnel-ports'`; otherwise `startRefusal = startRefusalWord = null`. It never writes a stored port, and never sets
`startRefusal` to a sentence. `funnelState` back to `idle`. Q1's job list gains it (§6.1).

`sweepAndRead`, on a successful read with `!read.asksApproval`, drops `adminLink` (D6). `setDoor` (both arms) and `confirmDoor`
drop it; the counted start (`:1084-1090`) drops it. `setDoor(on)` sets `pressedOnThisRun = true`, `switchedOffThisRun = false` and `returnForked = false`
in the statements after `const press = this.pressed();`; `setDoor(off)` sets `pressedOnThisRun = false`, `switchedOffThisRun =
true` and `returnForked = false` in the statements after `let saved = true;` and before its `try`, never between `this.pressed();`
and `let saved = true;` (D8: `build/ablation-p313.mjs:851` anchors on those two lines together). `confirmDoor` sets `returnForked = false` when `record !== null`; the counted start sets it
false beside `this.startRefusal = null`.

At `ipc.ts:1069`, before `this.approvalUrl = null`, the start keeps `const urlSeen = this.approvalUrl;`, and in the
`started.kind === 'refused'` arm, when `started.reason === 'not-approved' && urlSeen !== null && approvalOpens(urlSeen)`:
`this.adminLink = urlSeen`. Nothing else is kept.

`setupAction(input: unknown): Promise<boolean>` (D12): the input is one of `POCKET_SETUP_ACTIONS` or it throws
`gmuxError('INVALID_INPUT', 'Tortie could not read that press, so it changed nothing.')`; `if (isHarnessLaunch(process.env))
return false;` is its FIRST statement after the parse; then it asks `setupActionsNow(this.funnel.resolve())` and acts only on a
listed word: `get-tailscale` → `await seam.openExternal(TAILSCALE_DOWNLOAD_PAGE); return true`; `open-tailscale` → `return
(await seam.openPath(TAILSCALE_APP_BUNDLE)) === ''`; `copy-admin-link` → `if (!approvalOpens(this.adminLink)) return false;
seam.writeClipboard(this.adminLink); return true`. `seam` is `this.deps.setup ?? electronSetupSeam`, where
`electronSetupSeam` is built from `shell.openExternal`, `shell.openPath` and `clipboard.writeText` in this file and nowhere else, as
arrows that read `shell` and `clipboard` when called (D12; r2 §Attack F23):

```ts
const electronSetupSeam: PocketSetupSeam = {
  openExternal: (url) => shell.openExternal(url),
  openPath: (path) => shell.openPath(path),
  writeClipboard: (text) => clipboard.writeText(text)
};
```

`adminLink` is read in exactly two places, `setupActionsNow` (as `this.adminLink !== null`) and `setupAction`'s
`copy-admin-link` arm; `status()`'s own body names it nowhere (SU8).

`registerPocketIpc` gains `handle(ipc, 'pocket:recheck', () => host.recheck())` and `handle(ipc, 'pocket:setupAction', (_event,
action) => host.setupAction(action))`: fifteen channels. The module header gains a paragraph: a return reads only under
`rechecks()`, and the one URL it opens is now two, Tailscale's approval page and its download page, plus the app, each only on a
person's press.

**What does not move in `ipc.ts`**: the gate (`mayOpen`), the confirm (`confirmDoor`'s record and its refusal), the restart and
its spacing, `openAtLaunch`, the name check, `beginPairing`, `allowPhone`, `removePhone`, the push, `pushDestinations`,
`alertsCanSend`, and every log line's words. No log line names the account (SU5).

### 5.3 The preload — `src/preload/pocket.ts`

`recheck: () => invoke('pocket:recheck')` and `setupAction: (action) => invoke('pocket:setupAction', action)`, the header's
"thirteen" becomes "fifteen" and names the two (D15).

### 5.4 The sheet — `PhoneSection.tsx`, NEW `phone/steps.ts`, NEW `phone/Steps.tsx`, `phone-section.css`

#### 5.4.1 The layout, top to bottom

1. `PHONE_TITLE`; the error line (today's).
2. The switch card: `DOOR_LABEL`, the caption `POCKET_SETUP_LINE` (D1), the switch.
3. The steps card (`div.set-card.phone-steps`): three rows, `[data-phone-step="tailscale"]`, `[data-phone-step="publish"]`,
   `[data-phone-step="pair"]`, each a header (the number, the title, the state on the right) and its body.
4. `PHONES_GROUP` and the phones card (today's).
5. `ALERTS_GROUP` and the Alerts card (today's, plus D14's caption).

The `PAIR_GROUP` heading ("Pair a phone") leaves: the third step's title says it. The pair card's body moves into step 3.

**The marks** (his design): a step that is done shows the codicon `check` (`Codicon name="check"`, `src/renderer/icons`) in
`--success` in place of its number; the current step's number is `--accent`; a step not reached yet is `--text-muted`; lines are
`--text-secondary`. Done is: step 1 `tailscale === 'ready'`; step 2 `state === 'listening'`; step 3 `phones.length > 0`. The
current step is the first that is not done. Every disclosure is the house `<details className="set-disclosure">` and ships shut.
**The sheet draws no `<a>`.** The quiet Try again is `button.set-inline-btn[data-phone-action="retry-door"]`; the one button of a
step is `btn btn-primary` (`get-tailscale`, `open-tailscale`, `open-approval`, `confirm-door`, `pair`) or `btn btn-secondary`
(`copy-link`, the other Try again).

#### 5.4.2 Step 1, Tailscale on this Mac — first match wins

| Main says | State (right side) | Body |
| --- | --- | --- |
| `funnel.state === 'reading'` | `STATE_CHECKING` "Checking…" | nothing |
| `tailscale === 'missing'` | `STATE_NOT_INSTALLED` "Not installed" | `BTN_GET_TAILSCALE` "Get Tailscale" (`data-phone-action="get-tailscale"`) when `setupActions` lists `get-tailscale`; quiet Try again when `state === 'refused'` (§3 row 16) |
| `tailscale === 'stopped'` | `STATE_NOT_RUNNING` "Not running" | `POCKET_TURN_ON_LINE`; `BTN_OPEN_TAILSCALE_APP` "Open Tailscale" (`open-tailscale`) when listed; quiet Try again when `state === 'refused'` |
| `tailscale === 'signed-out'` | `STATE_SIGNED_OUT` "Signed out" | `POCKET_SIGN_IN_LINE`; the same two buttons |
| `tailscale === 'ready'` | the check and `tailscaleLine(account, tailnet)`: `account · tailnet`, or the tailnet alone when `account` is null or equal to it | nothing |
| `state === 'refused'` and `funnel.refused` is one of `no-name`, `unreadable`, `override-unusable`, `ports-taken`, `funnel-ports` | none | `status.refusal` and Try again (`retry-door`, `btn btn-secondary`), as today |
| otherwise (`installed`) | `STATE_INSTALLED` "Installed" | nothing: with the switch off, the switch is the next press |

**What’s this?** (`DISCLOSE_WHATS_THIS` "What’s this?") is on step 1 in every state and holds `POCKET_REACH_HONESTY`.

#### 5.4.3 Step 2, Publish this Mac — its header always, its body only while `state !== 'off'`; first match wins

A `port-taken` a return found on unconfirmed fields (`readRefusal`, D9) is not one of step 1's words, so it reaches the
`state === 'refused'` row below with `doorMayRetry` true (`confirmable` is false) and draws its sentence and Try again, never
Allow.

| Main says | State | Body |
| --- | --- | --- |
| `funnel.state === 'restarting'` | none | `POCKET_FUNNEL_RESTARTING` |
| `funnel.state === 'starting'` | `DOOR_OPENING` "Starting Tailscale Funnel…" | nothing |
| `funnel.state === 'approval'` and `funnel.approvalOpens` | `STATE_WAITING_TAILSCALE` "Waiting for Tailscale" | `[data-phone-approval]`: `POCKET_FUNNEL_APPROVAL` "Tailscale needs your OK, once." and `BTN_OPEN_TAILSCALE`, whose words become "Approve in Tailscale" (`data-phone-action="open-approval"`, today's `openApproval`); **What this allows** (`DISCLOSE_WHAT_ALLOWS`, shut, `[data-phone-what-allows]`, never `data-phone-funnel-right`, which stays the confirm block's own hook) holds `POCKET_FUNNEL_RIGHT_WARNING`, which was also at rest before Allow. No Try again: the child moves on by itself, and a press would supersede the wait and print a fresh URL |
| `funnel.state === 'approval'` | `STATE_WAITING_TAILSCALE` | `[data-phone-approval]`: `POCKET_FUNNEL_APPROVAL_ELSEWHERE` and `[data-phone-approval-text]` selectable text (today's) |
| `state === 'listening'` | the check and `STATE_PUBLISHED` "Published", whose hover is `doorListening(publicName, publicPort)` "Answering at https://…" | nothing |
| `doorNeedsConfirm(status)` (unchanged, `:291-298`) | `STATE_READ_ALLOW` "Read, then allow", or `STATE_CHANGED` "Changed since you allowed it" when `confirmState === 'changed'` | **today's `[data-phone-confirm]` block, byte for byte** (D18). Nothing in a disclosure |
| `funnel.refused === 'not-approved'` | `STATE_WAITING_ADMIN` "Waiting for your admin" | `POCKET_ASK_ADMIN`; `BTN_COPY_LINK` "Copy link" (`data-phone-action="copy-link"`) when `setupActions` lists `copy-admin-link`, else nothing more (D6: no address Tortie refuses to open is drawn here); quiet Try again |
| `funnel.refused === 'shields-up'` | none | `status.refusal`; Open Tailscale (`open-tailscale`) when listed; Try again. A return does not re-check it (D7) |
| `state === 'refused'`, `funnel.refused` is none of step 1's words or states, and `doorMayRetry(status)` | none | `status.refusal` (or `DOOR_NOT_LISTENING` when null) and Try again, as today |
| otherwise | none | nothing |

#### 5.4.4 Step 3, Pair your phone

Its body is today's pair card, `[data-phone-stage]` with today's six values (`pairingStage`, unchanged), and these faces:

| Stage | State | Body |
| --- | --- | --- |
| `start` (the door off) | the check and `STATE_PAIRED` "Paired" when a phone is paired | **Pair** when a phone is paired (it turns the door on and pairs after Allow, today's `onPair`); else nothing |
| `waiting` (on, not answering) | as above | nothing (`PAIR_WAITING` leaves) |
| `naming` | as above | Phase 332.1's block, unchanged, then `POCKET_NAME_WAIT_NOTE` (`p.phone-line[data-phone-name-note]`), drawn for exactly as long as the block is, so nothing above Pair moves when Pair appears (332.1's rule) |
| `ready` | as above | the name block and the unreadable line as today; then **Pair**, unless no phone is paired and the wish is set, where nothing is drawn because the code is on its way (D17) |
| `showing` | as above | the code; beside it `SCAN_LINE` "Scan with Tortie on your iPhone.", `GET_PHONE_APP` "Get it at tortie.sh/iphone." (words only, never a link, 333.2's rule), `CODE_PRIVATE`, the countdown and Cancel |
| `match` | as above | today's match face and **Allow**, unchanged |

#### 5.4.5 The composer — `phone/steps.ts`

```ts
export type StepId = 'tailscale' | 'publish' | 'pair';
export interface StepFace {
  readonly id: StepId;
  readonly title: string;
  readonly done: boolean;
  readonly current: boolean;
  /** The words on the right, or null. */
  readonly state: string | null;
  /** What the body draws, as kinds the sheet fills (never words the phone quotes). */
  readonly body: readonly StepPiece[];
}
export function checklistOf(status: PocketStatus | null, stage: PairingStage, wished: boolean): readonly StepFace[];
```

The entry's signature took `offer`, `view` and `now`; they decide only the pair card's stage, so the section computes
`pairingStage(status, offer, view, now)` (which stays in `PhoneSection.tsx`, where `conformance:pocket` D6 and D10 read it) and
hands the stage in. `StepPiece` is a closed union of kinds (`'line'` with main's sentence, `'setup-button'` with a
`PocketSetupAction`, `'try-again-quiet'`, `'try-again'`, `'confirm'`, `'approval'`, `'disclosure'`, `'pair-card'`). The
composer **reads `confirmable`, `pairable`, `rechecks`, `setupActions`, `tailscale` and `funnel.refused` and never works them
out**. `doorNeedsConfirm` and `doorMayRetry` (unchanged bodies) and the `PairingStage` type MOVE into `steps.ts`, and
`PhoneSection.tsx` imports and re-exports them, so every importer of today keeps working and `steps.ts` imports nothing from
`PhoneSection.tsx` (D19). It holds the words the phone does not quote: `STEP_TAILSCALE` "Tailscale on this Mac",
`STEP_PUBLISH` "Publish this Mac", `STEP_PAIR` "Pair your phone", the state words of §5.4.2 to §5.4.4 (`STATE_CHECKING`,
`STATE_NOT_INSTALLED`, `STATE_NOT_RUNNING`, `STATE_SIGNED_OUT`, `STATE_INSTALLED`, `STATE_WAITING_TAILSCALE`,
`STATE_PUBLISHED`, `STATE_READ_ALLOW`, `STATE_CHANGED`, `STATE_WAITING_ADMIN`, `STATE_PAIRED`), `BTN_GET_TAILSCALE`,
`BTN_OPEN_TAILSCALE_APP`, `BTN_COPY_LINK`, `DISCLOSE_WHATS_THIS`, `DISCLOSE_WHAT_ALLOWS`, and `tailscaleLine`.

`PhoneSection.tsx` keeps `PHONE_TITLE`, `DOOR_LABEL`, `DOOR_OPENING`, `DOOR_NOT_LISTENING`, `BTN_ALLOW`, `BTN_TRY_AGAIN`,
`BTN_OPEN_TAILSCALE` ("Approve in Tailscale"), `BTN_PAIR`, `BTN_CANCEL`, `QR_LABEL`, `SCAN_LINE`, NEW `GET_PHONE_APP`,
`CODE_PRIVATE`, `MATCH_LABEL`, `CODE_EXPIRED`, `CODE_FIRST_NAME`, the name check's words, `PHONES_GROUP`, `NO_PHONES`,
`PHONES_DROPPED`, `BTN_REMOVE`, `ALERTS_ON_CHIP`, the Alerts words, `BRIDGE_MISSING`, `doorListening`, `pairedWith`, `shutsIn`,
and every function it exports today but `doorLine`. `DOOR_OFF`, `DOOR_WAITING`, `PAIR_WAITING`, `PAIR_GROUP` and `doorLine`
are removed (no probe reads them: §15 M6).

#### 5.4.6 The return and the wish

- D16: in `PhoneSection()`, one `useEffect` keyed on `[api, adopt]`: `const off = onWindowLooked(() => { void
  api.recheck().then(adopt).catch(() => undefined); }); if (document.hasFocus()) void api.recheck().then(adopt).catch(() =>
  undefined); return off;`.
- D17: `onSetDoor(on)`: `if (on && (status?.phones.length ?? 0) === 0) setPairAfterAllow('pressed')`, beside today's `if (!on)
  setPairAfterAllow('no')`; `onRetryDoor`: `if ((status?.phones.length ?? 0) === 0) setPairAfterAllow('pressed')` before its
  `setDoor(true)`. `pairAfterAllowNext`'s refusal clause (`:373`) gains `&& !status.rechecks`.
- The marks are drawn for the eye: the number and the codicon carry `aria-hidden="true"`, and the state words on the right are
  what a screen reader reads.

#### 5.4.7 The Alerts card

`PUSH_PUBLISHER_ONLY` is drawn as a second caption in the key row's text block,
`span.set-row-caption[data-phone-publisher]`, whatever the key (D14). The key row, the switch and their hooks do not move.

#### 5.4.8 The hooks, kept and new

Kept with their names and values (every one a probe reads, §15 M6): `data-phone-action` `confirm-door`, `retry-door`,
`open-approval`, `pair`, `cancel-pairing`, `allow-phone`, `remove-phone`, `choose-key`, `forget-key`; `[data-phone-stage]`
with today's six values on step 3's block; `[data-phone-confirm]` with today's children; `[data-phone-approval]`,
`[data-phone-approval-text]`, `[data-phone-funnel-right]`, `[data-phone-name*]`, `[data-phone-key]`, `[data-phone-key-line]`,
`[data-phone-alerts]`, `[data-phone-alert-sentence]`, `[data-phone-id]`, `[data-phone-dropped]`, `[data-phone-countdown]`,
`[data-phone-fingerprint]`. New: `data-phone-step="tailscale|publish|pair"` with `data-phone-step-state` (the state word's key:
`checking`, `missing`, `stopped`, `signed-out`, `installed`, `ready`, `starting`, `approval`, `confirm`, `changed`, `admin`,
`published`, `paired`, or empty) and `data-done`, `data-current`; `data-phone-action` `get-tailscale`, `open-tailscale`,
`copy-link`; `[data-phone-name-note]`; `[data-phone-publisher]`; `[data-phone-get-app]` on `GET_PHONE_APP`'s line;
`[data-phone-what-allows]` on the approval face's shut disclosure (`[data-phone-funnel-right]` stays on the confirm block's line
alone, so a reader of it never finds a second, shut copy).

#### 5.4.9 `phone-section.css`

`.phone-steps`, `.phone-step`, `.phone-step-head`, `.phone-step-num` (`--text-muted`; `[data-current] … { color: var(--accent)
}`), `.phone-step-done` (`color: var(--success)`), `.phone-step-title`, `.phone-step-state` (`--text-secondary`),
`.phone-step-body`. Every colour a token; no literal; spacing from `--space-*`.

### 5.5 The phone — `ios/Tortie/**`

#### 5.5.1 The first screen (`Screens/PairingScreen.swift`)

```
Pair with your Mac                                 pairing-title
1  Get Tortie for Mac                              pairing-get-mac (a Button, the whole row, ≥ 44 pt; opens .home)
   Free at tortie.sh · Apple silicon · 0.111 or later
2  Open Settings then Phone                        pairing-step-open
3  Scan the code                                   pairing-step-scan
[ Scan code ]                                      pairing-scan-code (≥ 44 pt; Tokens.accent on Tokens.bgRaised, Pair again's shape)
Nothing else to install on this phone.             pairing-nothing-else
This iPhone is not paired with a Mac.              pairing-line (the one line; rule (v): never empty)
Privacy · Support                                  pairing-privacy, pairing-support (Buttons, each ≥ 44 pt); the separator is Copy.separator, not pressable
```

`enum SetupStep: CaseIterable { case getMac, openPhone, scan }`, drawn with `zip(1..., SetupStep.allCases)` (D28). After **Scan
code** (`model.startScanning()`): the camera square where the steps were (today's `scanner`, unchanged inside), `pairStepScan`
under it (`pairing-point`), then the fingerprint card when a code was read (today's), then the foot. The fingerprint card, the
one line, the progress and **Pair again** are today's. No "See a sample". The model's mirror still shows nothing (rule (p)).

#### 5.5.2 The site's addresses (`Markdown/Links.swift`)

D21's three declarations, appended under `LinkPolicy`, with a header paragraph: the ONE other way out of the app is a page of
Tortie's own site, compiled, never an address anyone wrote, opened only on a press. `LinkPolicy` and `LinkGate` do not move.

#### 5.5.3 Settings then About (`Screens/SettingsScreen.swift`)

D22's three rows, ids `settings-mac-site` (with `settings-mac-site-name` for `tortie.sh`), `settings-privacy`, `settings-support`.
`openNotificationSettings` does not move (z5).

#### 5.5.4 The Allow line (`Screens/Pieces.swift`, `Screens/DoorWords.swift`)

D23. `FailureView`'s note is `Words(note, .secondary, Tokens.textSecondary, lines: nil)` between the sentence and Try again.

#### 5.5.5 The version (`Door/Pairing.swift`, `Screens/DoorWords.swift`)

D24. `private struct Version: Decodable { let v: Int }` decoded with `try? JSONDecoder().decode(Version.self, …)`, a nil being
`badCode`; then the switch on `v`; then today's `Wire` decode and checks for 3. `PairingFailure` gains, in place of
`unsupportedCode`, `/// A code from a newer Tortie for Mac than this app reads.` `case codeFromNewerMac` and `/// A code from an
older Tortie for Mac.` `case codeFromOlderMac`.

#### 5.5.6 Identifiers (`Screens/Identifiers.swift`)

New: `pairingGetMac` "pairing-get-mac", `pairingStepOpen` "pairing-step-open", `pairingStepScan` "pairing-step-scan",
`pairingScanCode` "pairing-scan-code", `pairingNothingElse` "pairing-nothing-else", `pairingPrivacy` "pairing-privacy",
`pairingSupport` "pairing-support", `settingsMacSite` "settings-mac-site", `settingsMacSiteName` "settings-mac-site-name",
`settingsPrivacy` "settings-privacy", `settingsSupport` "settings-support", `static func reachNote(_ id: String) -> String { id +
"-note" }`. Removed: `pairingStep`, `pairingNetwork`. The header's list follows.

#### 5.5.7 Build 8 (`ios/Tortie.xcodeproj/project.pbxproj`)

D26, and the one new test file (`SiteLinkTests.swift`) added to the `TortieTests` target. No new app source file: the site lives
in `Links.swift`, the steps in `PairingScreen.swift`.

### 5.6 The words, their owners, and the ledger

#### 5.6.1 `Style/Copy.swift`

| Name | Value | Owner line(s) above it |
| --- | --- | --- |
| `setupGetMac` | "Get Tortie for Mac" | `/// Phone: the first step: Tortie for Mac is where the code comes from. No Mac surface sends a person to itself.` |
| `freeAtSite` | "Free at tortie.sh" | `/// Phone: where the Mac app is, in words; the row opens it (research 140 §8 row 3).` |
| `appleSilicon` | "Apple silicon" | `/// Phone: the Mac app is arm64 only (electron-builder.yml:1), so an Intel Mac can never pair (research 140 §5 row 9).` |
| `macVersion` | "0.111 or later" | `/// Phone: the first Mac release with Settings then Phone; it moves with the tag (research 140 §10).` |
| `setupOpenPhone` | "Open Settings then Phone" | `/// Phone: the second step.` and `/// Names: src/main/settings/window.ts ⟦title: 'Settings'⟧`, `/// Names: src/renderer/settings/PhoneSection.tsx ⟦PHONE_TITLE = 'Phone'⟧` |
| `setupScan` | "Scan the code" | `/// Phone: the third step.` |
| `scanCode` | "Scan code" | `/// Phone: the press that opens the camera, and only then asks for it.` |
| `pairNothingElse` | "Nothing else to install on this phone." | `/// Phone: the phone needs nothing beside Tortie (Phase 330); replaces "There is nothing else to install.", which read as the Mac too.` |
| `privacy` | "Privacy" | `/// Phone: the privacy page on tortie.sh (research 136 §7, 5.1.1(i)). No Mac surface links it.` |
| `support` | "Support" | `/// Phone: the support page on tortie.sh (research 136 §7, 1.5). No Mac surface links it.` |
| `macOnSite` | "Tortie for Mac" | `/// Phone: About's row for the Mac app's page.` |
| `siteName` | "tortie.sh" | `/// Phone: the address that row opens, as words.` |
| `reachAllowAgain` | "If Tortie on your Mac just updated, press Allow in its Settings then Phone." | `/// Phone: under "could not reach", because a Mac update that adds a route shuts the door until Allow (research 140 §7.3).` and `/// Names: src/renderer/settings/PhoneSection.tsx ⟦BTN_ALLOW = 'Allow'⟧`, `/// Names: src/main/settings/window.ts ⟦title: 'Settings'⟧`, `/// Names: src/renderer/settings/PhoneSection.tsx ⟦PHONE_TITLE = 'Phone'⟧` |
| `pairNewerMac` | "This code is from a newer Tortie for Mac. Update Tortie on this iPhone." | `/// Phone: a code whose version is above this app's (D24).` |
| `pairOlderMac` | "This code is from an older Tortie for Mac. Update Tortie on your Mac." | `/// Phone: a code whose version is below this app's (D24).` |

Removed: `pairStepOnMac` (and its three Names), `pairPrivateNetwork`. `pairStepScan` stays, under the camera. `about`'s comment
loses "(Phase 333.1's links land here)" and says what the card holds. Every value passes av6. Copy.swift goes from 167 words to
180; Mac-judged stays 82 (floor 80); the phone's own goes 85 → 98; named controls 7 → 9 (D25).

#### 5.6.2 The mocks (`docs/design/phone/`)

- `Pairing.html`: the resting face of §5.5.1, the title, the three steps (numbers in a `<span>`), Scan code, the foot, Privacy ·
  Support. No camera square, no fingerprint card, no "Enter a code instead".
- NEW `PairingScan.html`: the title, the camera square with the reticle, `pairStepScan`, the fingerprint card
  (`pairMatchLabel`, a fingerprint, `pairMatchNote`), `pairNothingElse`, the line `pairWaitingForAllow` "Waiting for you to allow
  this iPhone on your Mac.", Privacy · Support.
- `Settings.html`: About gains Tortie for Mac with tortie.sh, Privacy and Support under Version.
- `index.html`: a figure framing `PairingScan.html` ("10b · Scan"), 10's caption naming the three steps, and the footer's
  "fifteen" becoming "sixteen".

#### 5.6.3 The ledger (`build/p311/copy-drift.mjs`)

- Removed: the owned rules for `pairStepOnMac` (`:303-310`) and `pairPrivateNetwork` (`:329-336`); the owed rule "Enter a code
  instead" (`:1085-1089`).
- Added, owned by `ios/Tortie/Style/Copy.swift`, each with its needle: `setupGetMac`, `freeAtSite`, `appleSilicon`,
  `macVersion`, `setupOpenPhone`, `setupScan`, `scanCode`, `pairNothingElse`, `notPaired`, `privacy`, `support`,
  `pairWaitingForAllow`, `macOnSite`, `siteName`: fourteen, each drawn by a mock.
- The integer data rule's reason (`:919-922`) gains "or a step's place in a list, drawn from its position".
- `OWNED_RULE_FLOOR` becomes the count the run matches, expected **101** (89 − 2 + 14), its comment naming the rules;
  `PHONE_NAMES_FLOOR` 7 → **9**; `PHONE_MAC_FLOOR` stays 80.
- Two `--self-test` mutations: `Scan code` renamed in `Pairing.html` (red), and `tortie.sh` changed by one letter in
  `Copy.swift`'s `siteName` (red).

### 5.7 What does not change

The door (`src/main/pocket/door/**`, `door-process.ts`, `bind.ts`), every route and `POCKET_ROUTE_IDS`, the QR's `v: 3`, the
hash and its algorithm, the confirm record and gate, refusal 8, the name check and `pairable`, `beginPairing`, `allowPhone`,
`removePhone`, the push and the alerts, the Funnel argv and the stand-in's refusals, the phone's door client, every read and write
the phone sends, the tab bar, `linkGate`, `LinkPolicy`, `src/main/menu.ts`, `src/main/capabilities.ts`,
`src/main/harness/push-seam.ts`, `build/p316/node-phone.mjs`, `build/p316/hostile-door.mjs`.

---

## 6. The gates, clause by clause

Every new or widened clause has an ablation arm that turns it red on its own against a green base, restored by sha256 in a
`finally`; an arm whose anchor text is absent FAILS by name.

### 6.1 `conformance:pocket` (`build/conformance-pocket.mjs`) and `ablation:p313`

- **B1 widened**: FIFTEEN channels, the bridge and the registrar moving together, with `pocket:recheck` and `pocket:setupAction`.
- **Q1 widened** (the attack, §Attack F1: without it Q1 goes RED on the correct code): `readOnReturn` joins Q1's `JOBS` set and
  its `viaQueue` count (`build/conformance-pocket.mjs:3029`, `:3083`), because it calls `this.sweepAndRead()` from a method that
  runs only inside a queued job; Q1 then also requires `readOnReturn` to be reached through `this.serially(...)` at least once.
- **R3's sentence** gains "and two LaunchServices opens a person's press makes, Tailscale's download page and the Tailscale app
  (SU3)", so its words stay true.
- **D6 widened to the surface** (r2 §Attack F25): its sheet half reads `PhoneSection.tsx` alone
  (`build/conformance-pocket.mjs:4970`), and so does D10's (`:5165`), so `phone/steps.ts` could compare `nameCheck` with anything,
  or decide a face from `nameProgress`, and both stay green. D6's `nameCheck` clause (compared only with `'unreadable'` or
  `'confirmed'`, never inside a decider) reads every file of `phoneSurfaceFiles()`, and D6 also holds that `phone/steps.ts` and
  `phone/Steps.tsx` name no `nameCheck` and no `nameProgress` at all: the name block is drawn inside the pair card's body, which
  is `PhoneSection.tsx`'s (D19). `pairingStage`, `pairAfterAllowNext` and the live `onPair` stay found in `PhoneSection.tsx`, as
  today.
- **NEW SU1 to SU9**, over `src/main/pocket/ipc.ts`, `funnel.ts`, `src/main/machines/tailscale.ts`, `src/shared/ipc/pocket.ts`,
  `src/shared/push-copy.ts`, `src/preload/pocket.ts` and `phoneSurfaceFiles()` (`PhoneSection.tsx`, `phone/**`), with the
  TypeScript parser:

| Rule | Holds |
| --- | --- |
| SU1 | **The return.** `recheck` queues only under `rechecks()` AND `returnMayRun(`; `rechecks(` is ONE method of `PocketHost` taking `held`, answered in `status()` as `rechecks: this.rechecks()` and called by `recheck` and nowhere else, and its body holds EVERY clause of D7, each read by its own text so a missing one is named: `readStore()?.enabled !== true` AND `this.switchedOffThisRun` in clause (a), `this.published()`, `this.opening !== held`, `this.funnelState !== 'idle'`, `this.restartCancel !== null`, `pocketShutdownStarted()` and `funnelShutdownStarted()`, `this.returnForked`, `RETURN_READ_WORDS.has(this.readRefusal)` over a set that is EXACTLY `no-tailscale`, `not-running`, `signed-out` (never `shields-up`), `this.startRefusalWord === 'not-approved'` on the arm where `readRefusal` is null, and `pocketConfirmStatus(` OR `this.pressedOnThisRun`; `returnMayRun` reads `.ok` and compares `.path` with `fields().funnelProgram` on the confirmed arm, and `recheck` asks it before `this.opening += 1` AND inside the job after the superseded check; inside the job the statement right after the superseded check is `if (!this.rechecks(1)) return;`, before `returnMayRun(` and before any `openNow(` or `readOnReturn(`; `switchedOffThisRun = true` is written only in `setDoor`'s off arm, after `let saved = true;` and before its first await, and `= false` only in its on arm; `recheck`'s body names no `pressed(`, runs its job inside `serially(`, increments `opening` before its first await and decrements it in a `finally`; on confirmed fields it calls `openNow(` with `{ returned: true }` and nothing else that forks or spawns; on unconfirmed fields it requires `pressedOnThisRun` and calls `readOnReturn(`; `readOnReturn` writes `publicPort` only inside the branch where the stored port is 0 and names no `startRefusal =` other than `null`; `openNow` returns before `startPocketDoor(` when `options.returned`, `startRefusalWord === 'not-approved'` and `read.asksApproval`, and assigns `returnForked = true` under `options.returned` before `startPocketDoor(` and NOT as the statement immediately before it (L5); `returnForked = false` is written in `setDoor` (both arms), `confirmDoor` and the counted start, and `true` nowhere but that one line |
| SU2 | **No timer and no read at open.** In `phoneSurfaceFiles()`, `recheck(` is called from exactly one `onWindowLooked(` callback and one statement guarded by `document.hasFocus()` in the same effect; no `setInterval`, `setTimeout` or `requestAnimationFrame` callback names it; `onWindowLooked` is the only listener (no `addEventListener('focus'` or `'visibilitychange'` in the surface); `rechecks()`'s first statement asks the switch; a return while `opening !== 0` queues nothing |
| SU3 | **The setup presses.** `POCKET_SETUP_ACTIONS` is exactly the three words; `setupAction`'s first statement after the parse is a `return false` under `isHarnessLaunch(process.env)`; EACH of the three acts is present exactly once and inside a branch that asked `setupActionsNow(`; `shell.openExternal` named in the domain only in `openApproval` and the `electronSetupSeam`; `shell.openPath` and `clipboard` only in `electronSetupSeam`, and every `shell.` and `clipboard.` read there inside an arrow's body, none at module scope (D12; r2 §Attack F23); the seam's `openExternal(` called only with `TAILSCALE_DOWNLOAD_PAGE` and its `openPath(` only with `TAILSCALE_APP_BUNDLE`; `open-tailscale` listed only when `!overrideSet && source === 'pinned' && path === TAILSCALE_APP_PROGRAM`; `copy-admin-link` asks `approvalOpens(` before the write; `setupAction`'s parameter is a word, never a URL or a path; `PocketHostDeps.setup` handed only by tests (U4's list) |
| SU4 | **The stat.** `status()` calls `this.funnel.resolve()` exactly once and reaches the program only through `funnelProgramOf(`; it names no `readTailnet(`, `readServe(`, `exec`, `spawn` or `sweepFunnelOrphan(`; `tailscale` is `this.tailscaleNow(` called once, in `status()`, and `tailscaleNow`'s body names no `tailnetFacts`, `readStore(`, `facts(` or `fields(` (it takes the switch as a parameter, because D2's switch-off arm needs it) |
| SU5 | **Drawn and never hashed.** No `account` in `PocketExecutionFields`, `NORMALIZE`, `PocketStore`, `src/main/pocket/facts.ts`, `routes.ts`, any door answer type, `PocketPairingView`, or any log call's arguments in the domain; `POCKET_EXECUTION_HASH_ALGORITHM`, `POCKET_ROUTE_IDS` and R4's pin unchanged |
| SU6 | **The confirm unchanged.** Inside the element carrying `data-phone-confirm`: the `confirmLines` map, `POCKET_CONFIRM_WARNING`, `POCKET_DOOR_HONESTY`, `POCKET_FUNNEL_RIGHT_WARNING` under `funnel.asksApproval`, and `confirm-door`; none inside a `<details>` element; `confirmDoor`'s call hands `linesRead: current.confirmLines` and `hashRead: current.confirmHash`, unsliced and unmapped |
| SU7 | **The code asked for.** `setPairAfterAllow('pressed')` is called EXACTLY TWICE outside `onPair`, once in the live `onSetDoor` and once in the live `onRetryDoor`, each inside a branch whose condition holds `status !== null && status.phones.length === 0` (absent, or written with `?? 0`, either reads red; D17); `pairAfterAllowNext` reads `.rechecks` and names no `nameProgress` and no `nameCheck` |
| SU8 | **The admin link.** `adminLink` is assigned a URL EXACTLY ONCE, in the start's `not-approved` arm, inside a condition that asked `approvalOpens(` (absent, it reads red); no field named `adminText` exists; `status()`'s own body names no `adminLink`, which is read only in `setupActionsNow` and in `setupAction`'s `copy-admin-link` arm; it is not cleared inside `readOnReturn` nor by a read whose `asksApproval` is true; `approvalText` in `status()` is composed from `this.approvalUrl` alone, as today |
| SU9 | **The words.** No string literal (template text included) in `PhoneSection.tsx`, `phone/**`, `src/shared/ipc/pocket.ts`, or `PUSH_PUBLISHER_ONLY`'s value matches `\bbeta\b`, `\btestflight\b`, `\bremote desktop\b`, `\bmirror(s\|ed\|ing)?\b`, `\bstream(s\|ed\|ing)?\b` or `\bssh\b`, case-insensitive. Comments are not read |

`ablation:p313` gains one arm per SU clause and per widened clause, each red on the rule that owns it. Its anchors are written
against §5.2.3's pinned text; the integrator, who sees the built text, may correct an anchor in `build/ablation-p313.mjs` and
`build/p316/ablation-ios.mjs` and nothing else of them, and says so in §As built:

1. `rechecks()`'s set gains `shields-up` (SU1);
2. `pressedOnThisRun` dropped from `rechecks()` (SU1), and, as its own arm 2b, from the job's unconfirmed branch (SU1);
   `probe:p3331` R12 reads red only with both dropped, which the vitest drives (§7.2);
3. `this.pressed()` added to `recheck` (SU1);
4. the funnel-idle clause (d) dropped (SU1; the vitest's return in `recoverNow`'s window between the restart timer and its
   `opening += 1` reads one read where it reads none, ON A RESTART WHOSE READ ANSWERS `signed-out`, which is not retried: since r2
   the job asks `rechecks(1)`, so a restart that publishes or re-arms would hide this arm behind (b) or (e)). NOT `probe:p3331`
   A2: during a start's approval wait (c) already refuses, which the draft missed;
4a. (a) the switch clause dropped (SU1); 4b. (b) the published clause dropped (SU1); 4c. (c) the opening clause dropped (SU1; the
   vitest's second return while the first is queued reads two jobs); 4d. (e) the restart clause dropped (SU1; the vitest's return
   while a restart is armed and a confirm's start set the funnel idle reads one read); 4e. (f) the quit clause dropped (SU1);
4f. (i) `returnForked` dropped from `rechecks()` (SU1; `probe:p3331` A10 red), and 4g. its `= true` line removed from `openNow`
   (SU1);
4h. `returnMayRun`'s path comparison dropped (SU1; the vitest's moved program reads two runs);
4i. `returnMayRun` dropped from inside the job (SU1);
4j. `this.switchedOffThisRun` dropped from clause (a) (SU1; the vitest's off press whose save fails, then Tailscale running and
    one return, reads one door fork and one funnel spawn where it reads none);
4k. `if (!this.rechecks(1)) return;` dropped from the job (SU1; the vitest's return at the restart timer with the funnel left idle
    by a confirm's start reads a second start while published: `refused`, a live child and a door that answers);
4l. the job's `this.rechecks(1)` written as `this.rechecks()` (SU1; every return then refuses itself, so the vitest's one return
    on `not-running` reads zero reads where it reads one);
5. the `options.returned && startRefusalWord === 'not-approved' && read.asksApproval` stop dropped, so a return after
   `not-approved` spawns the child (SU1);
6. `readOnReturn` writing a stored `publicPort` (SU1); 6b. `readOnReturn`'s held port kept as `startRefusal` (SU1; the vitest's
   `confirmable` reads true and `probe:p3331` A5b draws Allow);
7. a `setInterval` calling `api.recheck()` (SU2);
8. a second `window.addEventListener('focus'` beside `onWindowLooked` (SU2);
9. `recheck()` called from `status()` (SU1);
10. `setupAction` opening a URL the renderer sent (SU3);
11. `open-tailscale` listed under a development override (SU3);
12. `openPath` handed the program's path rather than the bundle (SU3);
13. the link copied without `approvalOpens` (SU3);
14. the harness return removed (SU3);
15. `readTailnet(` called from `status()` (SU4);
16. `tailscale: 'ready'` computed from `tailnetFacts` (SU4);
17. the account added to `NORMALIZE` (SU5);
18. the account in a `pocketLog.warn` line (SU5);
19. `POCKET_CONFIRM_WARNING` moved inside a `<details>` (SU6);
20. `POCKET_DOOR_HONESTY` moved inside one (SU6);
21. the lines sliced before they are handed back (SU6);
22. the wish set with a phone paired (SU7), and 22b. Try again's wish set with no `phones.length` check (SU7), and 22c. Try
    again's wish removed (SU7);
23. the admin link cleared by a return's read with no capabilities (SU8), and 23b. a non-opening URL kept (an `adminText`
    reintroduced, SU8);
24. "TestFlight" planted in a sheet word (SU9);
25. B1 counting fourteen (a registrar line removed);
26. `this.readOnReturn(press)` called from `recheck()` BEFORE `this.serially(`, outside the queue (Q1: the widened rule names a
    read the queue does not hold);
27. `status.nameCheck === 'unreadable'` planted in `phone/steps.ts`'s `checklistOf` (D6, widened; r2 §Attack F25);
28. `electronSetupSeam` built as `{ openExternal: shell.openExternal, openPath: shell.openPath, writeClipboard: clipboard.writeText }`
    (SU3; r2 §Attack F23);
29. the off arm's two new statements moved between `this.pressed();` and `let saved = true;` (the arm `build/ablation-p313.mjs:851`
    owns reads its anchor absent and FAILS by name, which is the check that the placement of D8 was kept).

### 6.2 `conformance:pocket:hostile`

Not edited. It runs (its trigger is `src/main/pocket/**`) and reads what it read at `cb8d52a6`: no route, body or answer moved.

### 6.3 `conformance:ios` (`build/conformance-ios.mjs`), `ablation:p316`

**NEW (av), THE SITE'S THREE ADDRESSES**, added to `RULE_IDS` after `au`:

| Clause | Holds |
| --- | --- |
| av1 | `enum SiteLink` declared once, in `Markdown/Links.swift`, with exactly the cases `home`, `privacy`, `support` and exactly three string literals inside it: each `https`, host exactly `tortie.sh`, no port, user, query or fragment, paths exactly empty, `/privacy`, `/support`; each made with `URL(string:)` and no `!` |
| av2 | No other string literal in the app holds `https://`, outside comments and `#if DEBUG` arms |
| av3 | ONE `struct SiteOpener`, in `Markdown/Links.swift`, and it is the ONLY type in the app's files conforming to `SiteOpening` (a test's fake lives under `ios/TortieTests/`); its `open` takes exactly one parameter of type `SiteLink`; its body asks `LinkPolicy.opens(` before its one `UIApplication.shared.open(` (z4's closure rule) |
| av4 | `SiteLink`, `SiteOpener` and `SiteOpening` are named outside `Markdown/Links.swift` only in `Screens/PairingScreen.swift` and `Screens/SettingsScreen.swift` |
| av5 | `QRScanner(` is constructed only inside the braces of an `if` whose condition names `scanning`, in `Screens/PairingScreen.swift`; `scanning` is assigned `true` only in `startScanning()`, and `startScanning()` is called only from the Scan code button's action; `AVCaptureDevice.requestAccess(` is named once in the app, inside `ScannerView.start()` (r2) |
| av6 | No `Copy.swift` value matches SU9's six patterns |
| av7 | `reachAllowAgain` is named only in `Style/Copy.swift` and in `DoorWords.reachNote(for:)`, whose body compares with `Copy.cannotReachMac` and answers nil otherwise; `reachNote(` is called only in `Screens/Pieces.swift`, inside `struct FailureView` |
| av8 | **The Tortie marker** (D24; r2 §Attack F24): `PairingFailure.codeFromNewerMac` and `.codeFromOlderMac` are thrown only inside `PairingOffer.parse`, each after a `guard` that names `fp`, `dk` and `dx` and asks `Base64URL.decode(` of `fp`; neither arm compares `v` with a number literal other than `1` and `99`, the version being `version` (`Self.version` or `PairingOffer.version`) |

**Widened**: (s) `PHONE_BUILD = '8'`, six configurations, the "not uploaded" fixtures 9; (v) the two new `PairingFailure` cases
each map to a `Copy` sentence (the rule reads the enum, so this is automatic) and `reachNote` is declared `-> String?` with
exactly two returns, `Copy.reachAllowAgain` and `nil`; (b) covers the new words and the step numbers (no change to the rule);
(y) and (z) hold unchanged over the new code in `Links.swift` (y1's three imports, y3 no `!`, y9 no Door or Pocket name; z3's
file list unchanged; z4 counts `Links.swift`'s opens, now two, each in a closure that asked `LinkPolicy.opens(`; `closureStart`
stops at a function body's brace, so `SiteOpener.open`'s own body is the closure z4 reads, `build/conformance-ios.mjs:4554-4565`).
Rule (z)'s header comment ("the one way out of the app") and `Links.swift`'s header say the app now has TWO ways out, an
answer's link behind its alert and a page of Tortie's own site on a press, and the gates builder edits the first, the phone
builder the second. CLAUDE.md's `conformance:ios` row says the same (the integrator).

`ablation:p316` gains one arm per clause, each red on the rule that owns it: a fourth `tortie.sh` case (av1); an `http://` site
address (av1); `?ref=app` on privacy (av1); a `#top` fragment (av1); `https://tortie.sh.example.com/privacy` (av1); an address
made with `!` (av1, y3); a `https://` literal in `SessionScreen.swift` (av2); an opener taking a `String` (av3); the opener
without `LinkPolicy.opens(` (av3, z4); a third file naming `SiteOpener` (av4); `QRScanner(` outside the Scan code branch (av5);
"beta" in a `Copy.swift` value (av6); the Allow line under `macDidNotAnswer` (av7); `reachNote(` called in `ListScreen.swift`
(av7); the build left at 7 in one configuration (s); `unsupportedCode` restored with no sentence (v); an
`AVCaptureDevice.requestAccess(` added to `PairingModel` (av5); the marker's `guard` removed, so the version arms answer for
`{"v":1}` (av8, and `DoorPairingTests`' foreign-code rows red); a version arm written as `v == 4` (av8). The two existing arms that
read build 7 (`ablation-ios.mjs:1298`, `:1643`) read 8. The existing arms anchored in `Screens/PairingScreen.swift` (`p11`, `p12`,
`p13`, `p17`, `v2`, `v4`, `x7`) anchor on `extension PairingModel: CustomReflectable {`, `spent = payload`, `private(set) var
line: String = Copy.notPaired`, `line = DoorWords.stepSentence(for: .presenting)` and `let alerts = alerts`; the phone builder
keeps each of those lines byte for byte (r2 §Attack F26).

### 6.4 `conformance:phonecopy` (`build/p311/copy-drift.mjs`)

§5.6.3. Its run must print 19 screens, Copy.swift 180 words, 82 Mac-judged (floor 80), 98 the phone's own, 9 named controls
(floor 9), owned rules matched 101 (floor 101), and `phonecopy OK`; its self-test the two new mutations red.

### 6.5 The other gates

- **`gate:contract`** (D31): the integrator regenerates the baseline; the commit body names the two lines and the count.
- **`conformance:push`**: one export added to `push-copy.ts`; runs green (C1 reads `PUSH_WAKE_SEEN` alone).
- **`conformance:machines`**: `src/main/machines/tailscale.ts` gains two constants; runs green.
- **`gate:electron`**: `HELPER_USER_FLOOR` 171 (D32).
- **`gate:checks`**: `probe:p3331` classified in `build/verification-checks.mjs`; the new vitest files carry no `npx` and resolve
  no home through the passwd entry.
- **`gate:background`**: every process `probe:p3331` starts (the stand-in's funnels through the app, the DNS stand-in in process,
  node phones) is ended by pid in a `finally` that names it; a new shape goes into `build/background-fixtures.mjs`.
- **`gate:simulator`**: no new script reaches the helper; `SIMULATOR_USER_FLOOR` stays 2 (`probe:p316`'s `setup` group is in the
  existing file).
- **`build/assert-import-boundaries.mjs`**: unchanged; `main/harness/` is not walled from `main/pocket/`, and the renderer's
  settings already import `../machines/` (`src/renderer/settings/MachineAgents.tsx:49`).
- **MENU1**: unchanged and green.

---

## 7. The proof, run rather than read

### 7.1 The battery

`typecheck`, `build` (with `conformance:ios`, `gate:contract`, `gate:electron`, `gate:background`, `gate:checks`,
`gate:simulator`, `gate:knownhosts`), `test`, `smoke:t1`, `smoke`, `smoke:t3`, `CSC_IDENTITY_AUTO_DISCOVERY=false npm run
package`; `conformance:pocket`, `conformance:pocket:hostile`, `ablation:p313`, `conformance:machines`, `conformance:push`,
`conformance:phonecopy`, `ablation:p316`; `node build/p330/tailscale-standin.mjs --self-test`; every edited probe's
`--grader-self-test` (`p330`, `p332`, `p3321`, `p3332`, `p3331`, `p316`); `test:ios` in Debug and Release on iOS 26.3 and 18.3
(verifiers, under the lock), and `node build/p316/test-ios.mjs --read-app` on an unsigned Release device archive. `smoke`,
`smoke:t1` and `smoke:t3` ALL start an Electron (`package.json:17`, `:21`; `smoke:t1` through `build/smoke-standalone.mjs:53`,
`:130`, `runElectron`, which the draft missed), so all three run under the lock, by Lens 2 or the main session's battery, never
by a builder or the integrator. `git diff
cb8d52a6 -- src/main/menu.ts src/main/pocket/door src/main/pocket/bind.ts src/main/pocket/door-process.ts
src/main/pocket/pairing.ts src/main/capabilities.ts ios/Tortie/Door/DoorClient.swift` is empty.

### 7.2 Vitest (the builders')

- **`src/main/pocket/__tests__/p3331-setup.test.ts`** (main): THE ONLY DRIVE OF A REAL SETUP PRESS (D35). Over a recording
  `PocketSetupSeam` and a fake `FunnelDeps`: each word LISTED acts once with the exact constant (`TAILSCALE_DOWNLOAD_PAGE`,
  `TAILSCALE_APP_BUNDLE`, the held link); each word NOT listed acts never and answers false; under `GMUX_PROBES=1` (and each of
  `GMUX_SMOKE`, `GMUX_SHOT`, `GMUX_UPDATE_REHEARSAL`) every word acts never and answers false; `open-tailscale` is never listed
  with `overrideSet` or a `dev-override` or a Homebrew path; a word outside the three throws `INVALID_INPUT`; a URL or a path as
  the input throws. The stat's own `missing` (a resolution `{ path: null, source: 'missing' }`) lists `get-tailscale` with no
  exec, which no probe can drive (an unusable override refuses `override-unusable`).
- **`src/main/pocket/__tests__/p3331-return.test.ts`** (main): `rechecks()` true and false for every clause of D7 one at a time
  (switch off, published, opening, approval, restart armed, quitting, `returnForked`, each refusal word, confirmed or pressed,
  the Remove of D34), and these three windows driven, each the one clause that refuses it: a return during a start's approval
  wait (c); a return inside `recoverNow` after its restart timer fired and before its `opening += 1`, driven by holding the
  fake child's stop inside `unpublish` (d); a return while a restart is armed after a confirm's `start()` set the funnel idle (e);
  `recheck()` reads once for one return, zero for a second while the first is queued, zero for twenty in a row while a read
  is held, and `status()` answered at once each time; ZERO sweeps and zero reads while the stat finds no program, `rechecks`
  still true (D7b); on CONFIRMED fields after a launch read that failed `no-tailscale`, a program appearing at ANOTHER pinned
  path: zero runs of it on a return, one on Try again (D7b); on confirmed fields after `not-approved` with the read still asking
  approval: zero forks and zero spawns (the `door` and `tailscale.spawn` fakes count), the admin link kept; after the approval:
  one fork, one spawn, published, the link dropped; a start refusing `not-approved` WITH the capabilities present: the first
  return forks and spawns once, the next twenty make zero calls, and Try again clears it (D8b); on unconfirmed fields:
  `publicPort` written only from 0, a held stored port refused `port-taken` IN `readRefusal` with `confirmable` false, `status().refusal`
  that sentence and the store unchanged, a policy-refused stored port `funnel-ports`; an off press racing a return wins;
  `tailscale` for every read result and for the switch off; `account` from a `User` map, null without one, null for an empty or
  non-string `LoginName`, AND for `Self.UserID` 9007199254740993 with the exact key `"9007199254740993"` the map's one entry is
  read (D4), while a two-entry map with an unsafe id reads null; `account` absent from `fields()`, the hash and every log line
  written (the log fake records); `setupActions` for every state; `startRefusalWord` beside every `startRefusal` site;
  `funnel.refused`; a non-opening URL on a `not-approved` exit keeps nothing (D6). AND THE r2 WINDOWS, each over the in-process
  door and the in-memory Funnel of `switch-queue.test.ts` (r2 measured both preconditions that way, §15 M9, M10): (F18) confirmed
  fields, Tailscale stopped, an off press whose seal throws (the off answers its own error and the held store stays on), then
  `Running` and one return: zero reads, zero door forks, zero funnel spawns, and the next on press reads; (F19) a restart armed
  after an unexpected exit, a confirm's `start()` that refuses and leaves the funnel `idle`, the restart's timer fired and its
  job queued, then a return: once the restart publishes, the return's job runs nothing, so one child, `listening`, and no
  `port-taken`; the same with the restart's read answering `signed-out`: the return's job reads once (ablation 4); (F20) a
  return queued behind a held close, then a Remove and an Allow before it runs: the return's job runs nothing and the confirm's
  own start publishes once; `account` null for a 257-unit `LoginName`, for one holding U+202E and for one holding U+0007, and
  for a safe `Self.UserID` whose key is absent from a one-entry map (D4); `npm test` whole, because three files no builder owns
  import the host under an `electron` mock with no `shell` or `clipboard` (D12).
- **`src/main/pocket/__tests__/funnel.test.ts`** (main): `parseTailnetStatus`'s `account` over the 1.94 and 1.102 shapes, every
  existing case answering what it answered; `TAILSCALE_DOWNLOAD_PAGE` not passing `approvalOpens`.
- **`src/main/pocket/__tests__/ipc.test.ts`**, **`switch-queue.test.ts`** (main): their `PocketStatus` expectations gain the new
  fields; nothing else they assert moves.
- **`src/main/machines/__tests__/tailscale.test.ts`** (main): `TAILSCALE_APP_PROGRAM === TAILSCALE_CANDIDATES[0]` and starts with
  `TAILSCALE_APP_BUNDLE`.
- **`src/renderer/settings/__tests__/p3331-steps.test.tsx`** (sheet): `checklistOf` over every row of §5.4.2 to §5.4.4 (a status
  fixture per row), the marks (done, current, muted), the composer reading no field main owns a predicate for (a status whose
  `rechecks` and `setupActions` contradict what a renderer could work out is drawn as main says); the drawn section: the confirm
  block's text equal to today's for the same status and not inside `<details`; `<a` absent; `POCKET_REACH_HONESTY` and
  `POCKET_FUNNEL_RIGHT_WARNING` inside shut disclosures; the publisher caption with and without a key; `GET_PHONE_APP` and
  `SCAN_LINE` with no `://`; the return effect calling `recheck` once at mount with focus, once per `focus` and per visible
  `visibilitychange`, zero on an interval, and `lookedListenerCount()` back to its start after unmount; the wish set by the switch
  AND by Try again with no phone and by neither with one, and kept across a refusal while `rechecks`; the `missing` face with the
  switch on draws Get Tailscale only when listed and the quiet Try again whenever `state === 'refused'` (§5.4.2), and none while a
  read is under way; the wish is NOT set by the switch while `status` is null (D17); the not-approved face with no `copy-admin-link`
  listed draws no address; the approval face's disclosure carries `data-phone-what-allows` and no `data-phone-funnel-right`; a
  `port-taken` `funnel.refused` with `confirmable` false draws its sentence and Try again in step 2 and no `confirm-door`.
- **`src/renderer/settings/__tests__/p316-phone-section.test.tsx`** (sheet): re-based on the steps; its "no disclosure" clause
  (`:248-254`) becomes "no disclosure around the confirm block"; `SCAN_LINE`'s pins (`:547-568`) follow the new words; `DOOR_OFF`,
  `DOOR_WAITING`, `PAIR_WAITING` and `doorLine` assertions leave with them.

### 7.3 XCTest (the phone's)

- NEW **`SiteLinkTests`**: each `SiteLink.address` is the literal and passes `LinkPolicy.opens`; a fake `SiteOpening` handed to
  `PairingScreen` and `SettingsScreen` records `.home` for Get Tortie for Mac and for About's row, `.privacy` and `.support` for
  theirs, by constructing each screen with the fake and calling its named press methods (D21; a SwiftUI `Button`'s action is not
  reachable from XCTest), and each `Button`'s action naming exactly that method; `SiteOpener` is never invoked in a test.
- **`DoorPairingTests`** (method 3, the hostile fixture): codes WITH the marker (`fp`, `dk`, `dx` of a real code) whose `v` is 1,
  2, 4, 99, 100, `"3"`, -1, 3.5, 2^53, null and missing; a v:2 code shaped as the 316.4 Mac drew it with its tailnet-key field
  left out (§3 row 12); a v:3 code with one field wrong; a 5 KB code; not-JSON; and THE FOREIGN CODES (r2 §Attack F24), which
  must each read `badCode`: `{"v":1}`, `{"v":2,"name":"x"}`, `{"v":4}`, `{"v":4,"fp":"short","dk":"a","dx":"b"}`, a v:4 code
  with every key but `fp`. Each throws its own failure (`codeFromOlderMac` for 1 and 2 with the marker, `codeFromNewerMac` for 4
  and 99 with the marker, `badCode` for the rest) and none crashes. `:360-361` move to the new cases.
- **`DoorWordsTests`**: `pairingSentence` for the two new cases; `reachNote` non-nil for `cannotReachMac` alone.
- **`ScreensModelTests`**: the model's `scanning` false at start, true after `startScanning()`, unchanged by `pairAgain()`; a
  launch code read with `scanning` false; `:384`'s list of failures follows D24.
- **`CopyTests`**: `testTheTextIsWhatCompiles` (`:73-93`) reads `setupOpenPhone`, `reachAllowAgain`, `pairNewerMac`, `siteName`
  where it read `pairStepOnMac`; the mock list (`:157-166`) reads the resting words from `Pairing.html` and the camera words from
  `PairingScan.html`; the named-controls test counts 9.
- **`SettingsTests`**: `1.0.0 (8)`; About's three rows.

### 7.4 The stand-in (`build/p330/tailscale-standin.mjs`)

D36: `selfUser`, `account`, `setAbsent`, `readDelayMs`, each in `--self-test`; the header's scenario list names them. The
default scenario does not move, so every probe that does not ask for them reads what it read.

### 7.5 `probe:p3331` — the Mac side (`build/p3331/probe-p3331.mjs`), NEW

`node build/harness-socket.mjs --fresh gmux-p3331 'node build/p3331/probe-p3331.mjs'`. Every launch through `withElectron` on a
scratch profile under a harness directory, a scratch `HOME` and `ZDOTDIR`, and the socket `gmux-p3331-<pid>`, with `GMUX_PROBES=1`,
`GMUX_TAILSCALE_BIN` the stand-in's wrapper (preflighted by sha256 before every launch; a real Tailscale in any per-second
sample, or a forbidden argv at the stand-in, fails the run and ends the app), `GMUX_POCKET_NAME_SERVERS` naming
`build/p332/dns-standin.mjs` in the probe's own process (main's UDP sampled with `lsof` every 2 s; any peer not 127.0.0.1 fails
the run), and `build/hidden-agents.mjs` before every launch, read back through `agents:list`. Node phones are
`build/p316/node-phone.mjs`, unedited. **The parent first** (`P3331_PARENT_CHECKOUT`, a built checkout of `cb8d52a6`; absent or
unbuilt exits 2), then HEAD; never two Electrons at once. Output under `out/p3331/`; `P3331_KEEP=1` keeps the run folder.

**It never presses Get Tailscale, Open Tailscale, Approve in Tailscale or Copy link, and never calls `pocket:setupAction`**
(D35). It reads them drawn and listed. Approval is the stand-in's `<dir>/approve`.

#### 7.5.1 The launches, per build

| Launch | Profile | What runs |
| --- | --- | --- |
| L1 | F, fresh | R1 to R9, R11, R13, A1 to A6, A8 to A10, the real return (RT), then A7 at its end |
| L2 | F, relaunched | R12 (D34), and A7's after-quit count of the previous launch |
| L3 | S: at the PARENT made and set up (switch, Allow, node phone A paired, the code scanned); at HEAD the parent's S reused, with the SAME stand-in wrapper path, the same scenario and the same scratch HOME, because the program's path, the tailnet and the public name are hashed fields and any of them moving reads `changed` for a reason this phase did not cause (§Attack F16); the probe reads both builds' `confirmHash` and fails the run as UNREADABLE, never as a finding, when the parent's own relaunch would not read `confirmed` | R0, R10, R14 |

A row's starting state is made with the sheet's own presses or, for setup only, the bridge (`setDoor`, `forgetDoor`,
`removePhone`), never counted as the row's presses. "A return" is the synthetic `focus` the helper documents
(`remote-writes.ts:162-165`), dispatched on the Settings page through CDP; RT is D33's real one.

**THE RETURN RECORDER** (r2 §Attack F29). A count of "exactly one read" or "zero calls" is only a count of THIS run's returns if
the probe sees every return, and a real one can arrive that nobody pressed: his own clicks, a window that takes the screen, and,
unmeasured here, macOS marking a fully covered window hidden and visible again, which the helper hears as `visibilitychange`. So
before each arm the probe installs its OWN listeners for `focus` and `visibilitychange` on the Settings page through CDP (never
in the shipping surface, which SU2 holds to one listener) and keeps a monotonic timestamp of every one. Each read in the
stand-in's log is paired with the return or press that preceded it; an arm whose window heard a return the probe did not cause
is run once more, and then reads UNREADABLE, never a pass and never a finding.

#### 7.5.2 The per-row matrix, parent and HEAD

| Row | Stand-in | HEAD must show | The parent shows |
| --- | --- | --- | --- |
| R0 | his already-set-up Mac: S from the parent, relaunched at HEAD, Running | published at launch with NO press; no Allow asked (`confirmState` `confirmed`, the same hash as the parent's); step 1 ✓ with the tailnet, step 2 ✓ Published, step 3 ✓ Paired with Pair; node phone A reads `/v1/blocked` | not read: the parent MAKES S (switch, Allow, phone A paired, the code scanned), and R0 is HEAD's reading of the parent's set-up Mac after the update |
| R1 | absent, the switch pressed on, first setup | Not installed, `get-tailscale` listed and drawn; the probe leaves absent mode ("install") and returns once: exactly one read (`status` then `serve status`) in the stand-in's log, step 1 ✓, the lines and Allow; Allow, then the code by itself (`[data-phone-stage="showing"]`) with no other press | the `no-tailscale` sentence and Try again; Try again, Allow, then Pair |
| R2 | `Stopped`, switch on, first setup | Not running, `POCKET_TURN_ON_LINE`, no `open-tailscale` (override), quiet Try again; `Running` and one return: one read, ✓ | its sentence and Try again |
| R3 | `NeedsLogin`, then `NeedsMachineAuth` | Signed out, `POCKET_SIGN_IN_LINE`, as R2 | as R2 |
| R4 | Running, never confirmed | the `[data-phone-confirm]` block's `innerText`, `confirmLines` and `confirmHash` **byte-equal** to the parent's for the same scenario and the same stand-in path; Allow | the same block |
| R5 | `caps: false`, approval `wait` | after Allow: Waiting for Tailscale, `open-approval` drawn with "Approve in Tailscale", What this allows shut; `<dir>/approve` publishes with no press | the approval button; the same |
| R6 | `caps: false`, approval `exit0` | after Allow: Waiting for your admin, `POCKET_ASK_ADMIN`, `copy-admin-link` listed and `copy-link` drawn, quiet Try again; a return before the grant: one read, ZERO forks and ZERO funnel spawns (the stand-in's `funnel` lines and the app's process table), `copy-admin-link` still listed; `<dir>/approve` and one return: published with no press | a dead end: its sentence and Try again |
| R7 | `refuse: shields-up` | main's sentence and Try again, no `open-tailscale` (override); a return makes ZERO stand-in calls; the refusal cleared and Try again publishes | the same |
| R8 | `port-taken` (`servedPorts` holding the confirmed port), `busy`, `failed` | main's sentence and Try again, unchanged; a return makes zero calls | the same |
| R9 | the name silent, then answering | 332.1's block and `POCKET_NAME_WAIT_NOTE`; the rectangles above the block equal before and after Pair would appear; the code by itself (no phone); `nameProgress` unchanged; node phone B scans and is allowed | the same block; the code only if Pair was pressed with the door off |
| R10 | S, the door switched off | step 3 ✓ Paired with Pair; Pair gives a code after the start, no Allow asked (confirmed) | Pair gives the same |
| R11 | `tailnetAfterReads` moving the tailnet after a confirmed read, Tailscale stopped then running | a return reads; Changed since you allowed it, the new lines and Allow; zero forks and spawns | its lines and Allow, after a press |
| R12 | D34: F relaunched confirmed with `Stopped`; Remove of phone B; `Running` | a return makes ZERO stand-in calls (not pressed this run); Try again reads | the same zero (no return), Try again reads |
| R13 | `selfUser` true; false; `account` equal to the tailnet | ✓ `person@example.com · standin@example.com`; ✓ `standin@example.com`; one value drawn once | no step 1 |
| R14 | the Alerts card with and without a scratch key (`GMUX_HARNESS_ALERTS`, Phase 314's stand-in, a scratch P-256 key deleted in the `finally`, as `probe:p3332`) | `PUSH_PUBLISHER_ONLY` both times | no line |

#### 7.5.3 The presses table (no regression)

For each row's starting state, every press from it to `[data-phone-stage="showing"]` is counted at the parent and at HEAD (the
switch, Allow, Try again, Pair; the stand-in's `approve` and leaving absent mode are the person's work outside Tortie and are
listed, not counted). **The parent takes its FEWEST presses**, Pair with the door off included where the parent draws it
(`onPair`, `PhoneSection.tsx:1166-1176`, which carries the wish through Allow): for a ready Tailscale that is Pair then Allow,
two, the same as HEAD's switch then Allow (§3 row 19). **HEAD must be no higher in any row**, lower in R1, R2, R3 and R6, lower
in R7 and R8 when the row starts with no phone paired (Try again carries the wish at HEAD, D17) and equal when one is, and equal
in R4, R5 and R9. The table is printed whole, with each build's path.

#### 7.5.4 The attack (method 1), in the same run

- **A1**: a return with the switch off: zero stand-in calls.
- **A2**: a return during the approval wait: zero calls, the funnel child still alive (its pid), and `approve` still publishing.
- **A3**: with `readDelayMs` 300, twenty synthetic focuses in one second: reads never overlap (each `status` line's start after
  the previous read's `serve status` line), every read follows a return, and a return during a read adds none.
- **A4**: a return while published: zero calls.
- **A5a**: confirmed fields, the stored port held by another serve (`servedPorts`), `Running` after `Stopped`: a return refuses
  `port-taken`; `pocket.json`'s sha256 the same before and after; zero forks and spawns. **A5b**: the same on unconfirmed fields
  pressed this run: `port-taken`, the store's sha256 the same, zero forks and spawns, `confirmable` false, **no
  `[data-phone-action="confirm-door"]` in the section** and Try again drawn (§Attack F3); Try again then chooses the other port
  and draws Allow, today's two presses.
- **A6**: a return racing an off press (`readDelayMs` 300, the return, then the switch off within 50 ms): the off wins, nothing
  published, no funnel child alive.
- **A7**: the quit during a return's read (`readDelayMs` 3000): after L1 ends, no funnel child and no Electron of the run left.
  The read's own stand-in process is NOT ended by the app's exit (an `execFile` child outlives its parent; a press's read at the
  quit is the same today), so the count is taken once, at L2's start, AFTER waiting `readDelayMs` plus `TAILSCALE_DEADLINE_MS`
  plus 2 s from L1's end, and the stand-in process must have ENDED BY ITSELF by then (its pid read from the stand-in's log);
  one still alive is a finding, ended by pid in the `finally` (§Attack F10). Counted with CLAUDE.md's `ps -Ao pid,ppid,rss,comm`
  form.
- **A8**: a return after `shields-up`, `port-taken`, `busy` and `failed`: zero calls each.
- **A9**: `open-tailscale` never listed under the development override in any row; `get-tailscale` listed only while
  `tailscale === 'missing'`. (`setupAction` answering false under the harness is the vitest's, D35.)
- **A10** (D8b): confirmed fields, the stand-in's `refuse: not-approved` (stderr, no URL) with Funnel's capabilities PRESENT;
  Try again; the start refuses `not-approved`; then five returns: the FIRST makes one read, one door fork and one `funnel` spawn
  in the stand-in's log, and returns two to five make ZERO calls; Try again then reads again. At the parent, no return reads.

#### 7.5.5 The real return (RT)

D33, once per build, in R2's arm: `hide()` then `showInactive()` of the Settings window through main's inspector,
`document.visibilityState` read `hidden` then `visible`, then exactly one read in the stand-in's log. UNREADABLE if the visibility
never moved. With `P3331_REAL_FOCUS=1`, the same through `blur()` and `focus()`, `document.hasFocus()` read false then true.

#### 7.5.6 RUN, and the re-derivation records

RUN, both builds: the preflights, the hidden agents read back, no real Tailscale, no forbidden argv, UDP to 127.0.0.1 alone,
every DNS question an `A`, RD 0, for the stand-in's name, no Electron, stand-in or node phone left. With `P3331_KEEP=1` the probe
writes `<run>/rederive/`: the stand-in's `invocations.log` copy, a `timeline.json` of every press, return, launch, quit and
scenario change with its monotonic and wall times, `pocket.json`'s sha256 and mtime after every event, and `pocket:status`
after every event, 0600.

`--grader-self-test` grades recorded fixtures of every row and attack, each clause shown red on its own break, and starts
nothing (`node build/p3331/probe-p3331.mjs --grader-self-test`, NEVER through `npm run`, which hands the flag to the harness).

### 7.6 The moved probes, once each at HEAD (verifiers)

`probe:p330` (A3 presses the switch where it pressed Pair with the door off; `SPEC_WORDS` follows D14; its A3 clause "Open
Tailscale is drawn" reads `BTN_OPEN_TAILSCALE` by name, now "Approve in Tailscale"), `probe:p3321`, `probe:p3332` (D37), and
`probe:p332`'s arms that press the sheet, each green as edited; `probe:p313` once, because `src/main/pocket/**` moved.
`probe:p317` W1 and `probe:p318` R0 do NOT move (D18) and are not re-run unless a verifier chooses to.

### 7.7 `probe:p316`, arm group `setup` — the phone (`P316_ARMS=setup`)

Added to the default arm list and to the runtimes rule (`:791`, `:800`). One Electron, the stand-in Tailscale, the relay,
Simulators one at a time by `withSimulator`. `P316DriveUITests.swift` gains the steps `setup-read` (dump the pairing screen),
`setup-scan` (press Scan code, dump), `setup-settings` (Settings tab, dump About), `setup-failure` (wait for a list failure, dump)
and `setup-code` (dump the line after a seam code). **The UI drive presses no link**: Safari never opens and no request leaves
the Simulator; the presses are `SiteLinkTests`.

| Arm | Simulator | Holds |
| --- | --- | --- |
| SE1 | 26.3 | launched with `-TortieDebugForgetPairing` and no code: `pairing-title`, the three step labels, `pairing-scan-code`, `pairing-nothing-else`, `pairing-line` "This iPhone is not paired with a Mac.", `pairing-privacy`, `pairing-support` as XCUITest reads them; no element whose label holds "sample" |
| SE2 | 26.3 | no `pairing-scanner` before Scan code; `pairing-scanner` and `pairing-point` after (a Simulator has no camera, so iOS never asks there; the camera question is his row C4) |
| SE3 | 26.3 | `pairing-get-mac`, `pairing-privacy`, `pairing-support` each a button whose frame is at least 44 points tall |
| SE4 | 26.3 | paired through the seam: Settings' `settings-mac-site` (label and `tortie.sh`), `settings-privacy`, `settings-support`, each at least 44 points tall, under `settings-version` `1.0.0 (8)` |
| SE5 | 26.3 | the relay shut: the list's `*-failure` "Tortie could not reach your Mac." and its `*-failure-note` the Allow line |
| SE6 | 26.3 | the relay held until the client's time-out: "Your Mac did not answer in time." and no `*-note` |
| SE7 | 26.3 | a v:4 code and a v:2 code through `-TortieDebugPairingPayload`: `pairing-line` `pairNewerMac` and `pairOlderMac` |
| SE8 | 18.3, the floor | SE1, SE2, SE3, SE5 and SE7 |
| SEP | 26.3, with `P3331_PARENT_IOS` (`cb8d52a6`'s `ios/`, build 7) | `pairing-scanner` present at once; no `pairing-privacy`; the v:4 code reads "That is not a Tortie pairing code."; no `*-note` under the shut relay |

`probe-p316.mjs --grader-self-test` gains the group's cases, each clause shown red on its own break.

### 7.8 `test:ios` and `--read-app` (`build/p316/test-ios.mjs`)

`--read-app` on a Release app or archive gains a presence read: the Release Mach-O holds each of the three `tortie.sh` addresses
(17 to 25 bytes, longer than Swift's 15-byte small-string form, so emitted as literal bytes); it already requires no DEBUG seam,
no NetworkExtension or TailscaleKit and no coverage section. Debug and Release on iOS 26.3 and 18.3.

### 7.9 The independent methods (four, one an attack) and the parent

1. **Attack**: A1 to A10 live, and the verifier's own: a return during a quit, a return while the store is sealed shut
   (`readPocketStore` answering `sealKnown: false`), a focus storm across a Remove, a `User` map whose `LoginName` is 64 KB or
   not a string, a `setupAction` input that is an object or a URL (vitest), and hostile pairing codes on the phone (method 3).
   And r2's two, live once each at the parent and HEAD: **A11** (F18), confirmed fields with the stand-in `Stopped`, the scratch
   profile's pocket store folder made read only (its own profile, never his; the mode restored in a `finally`), the switch
   pressed off (its error drawn, the switch still drawn on), the stand-in `Running`, then a return: zero stand-in calls, no door
   process and no funnel child, at both builds; **A12** (F24), a foreign code `{"v":1,"name":"x"}` through
   `-TortieDebugPairingPayload`: "That is not a Tortie pairing code." at the parent AND at HEAD. Each asserted on the stand-in's
   or the store's own record, never on main's report.
2. **Measure the parent**: the presses table at `cb8d52a6` and HEAD; R4's confirm block byte for byte; R0 on his already-set-up
   shape; SEP on the phone.
3. **Hostile fixture**: `DoorPairingTests`' codes of every version and shape (§7.3), and SE7 live.
4. **Re-derive**: the verifier reads `invocations.log` and the store's sha256 series itself and pairs every `status`, `serve
   status` and `funnel` call, every `publicPort` write and every `tailnetFacts` write with the press, return or launch that
   caused it. A call or a write with no cause is a finding. The verifier writes its own parser; it imports nothing of the probe.

### 7.10 No regression against today

| Scenario | Today (`cb8d52a6`) | At HEAD | Verdict |
| --- | --- | --- | --- |
| His own already-set-up Mac | published at launch, Pair at rest | published at launch, every step ✓, Pair at rest, no Allow asked | same (R0) |
| A first setup with Tailscale ready | Pair with the door off, Allow, the code by itself (or the switch, Allow, Pair) | the switch, Allow, the code by itself | the same two presses at the fewest (§3 row 19) |
| A first setup with Tailscale missing, stopped or signed out | a sentence and Try again after fixing it | a button that fixes it, a quiet Try again beside it, then a return reads | fewer presses (R1 to R3) |
| A non-admin | a dead end | Copy link, and a return publishes after the grant | better (R6) |
| `shields-up`, `port-taken`, `busy`, `failed` | the sentence and Try again | the same, and on a first setup Try again carries the code | same or one fewer (R7, R8) |
| A return with nothing to re-check | no read | no read | same (A1, A4, A8) |
| A return after a start that refused with Funnel's capabilities present | no read | one start, then nothing until a press | bounded (A10) |
| A held stored port found by a return on a first setup | Try again chooses another port, then Allow | the sentence and Try again (no Allow over the held port), then Allow | same (A5b) |
| The confirm at Allow | the block | the same block, byte for byte | same (R4) |
| The phone's first screen | the camera at once | the steps, the camera after Scan code | one press more to the camera, and the permission asked in context; the count from launch to a scanned code moves 0 → 1 on the phone, stated |
| A shut door on the phone | "could not reach" | the same and the Allow line | better |
| A code from another version | "not a Tortie pairing code" | which side to update | better |

The phone's one press more is his design and research 136 §7's in-context camera ask; it is said in the CHANGELOG item's words
("Scan code") and in his checklist row C4.

---

## 8. The CHANGELOG item

Under `## Unreleased`, `### Changed`, one line; the follow-up docs commit adds the link:

- `- Settings then Phone now sets up the iPhone app in three steps, getting Tailscale, publishing this Mac and pairing your phone, each with the one button that comes next, and checks again by itself when you come back to the window. The iPhone app's first screen says where to get Tortie for Mac and links its privacy and support pages, and when it cannot reach your Mac it says to press Allow there if Tortie just updated; Tortie for Mac needs an Apple silicon Mac, and for now only Tortie's publisher can send alerts`

No numbers, no file names, no gate names, never "beta" or "TestFlight" (CHANGELOG.md `:1-5`).

---

## 9. His checklist — NEW `build/p3331/CHECKLIST.md` (the probes builder's)

In his words, each row saying what to open, press and see, then "Not covered yet" and a table of where every word it names was
found in the tree:

- **C1**: on his Mac with his real Tailscale, quit Tailscale with the door on: Not running and **Open Tailscale**; press it, come
  back: step 1 ✓ with his account by itself.
- **C2**: disconnect from Tailscale's menu bar icon, then reconnect from it **without clicking Tortie**: does step 1 move by itself?
  This measures question 2; if it does, the quiet Try again may go in a later round.
- **C3**: on a Mac with no Tailscale (or after moving it aside, his choice), **Get Tailscale** opens the download page in his
  browser.
- **C4**: on build 8 on his iPhone, once 333.5's pages answer: Get Tortie for Mac, Privacy and Support open the three pages in
  Safari, and iOS asks for the camera only after Scan code.
- **C5**: with the door switched off on the Mac, the phone's list shows the Allow line under "Tortie could not reach your Mac."

**Not covered yet**: Tailscale's real approval page and a non-admin's link (research 132 §3.3); the App Store variant of Tailscale
(research 132 §3.1); the menu bar case until C2; Safari and the pages themselves until 333.5.

---

## 10. The menus

**No native menu row moves.** `Pair a Phone…` stays directly under `Settings…` and opens Settings at Phone (`src/main/menu.ts:643`,
MENU1), which now leads with the three steps. The Settings sidebar's Phone row does not change. The steps have no context menu.
On the phone, the tab bar does not change. The phase brief says so.

---

## 11. Builders, disjoint files, and who owns what is shared

Five builders in `/private/tmp/wt-p3331` at once, on `cb8d52a6`. Each codes against the names pinned in §5. No file is in two
lists. Builders run `npm run -s typecheck` and the vitest files they own, or `xcodebuild build-for-testing` with
`-derivedDataPath …/scratchpad/p3331/dd-<role>` (deleted before returning), or their gate's own run; they launch no Electron,
boot no Simulator, run no probe but `--grader-self-test`, and never commit, stage or stash.

| Builder | Owns |
| --- | --- |
| **main** (the Mac's main side and the contract) | `src/main/pocket/ipc.ts`, `src/main/pocket/funnel.ts`, `src/main/machines/tailscale.ts`, `src/shared/ipc/pocket.ts`, `src/shared/push-copy.ts`, `src/preload/pocket.ts`; tests `src/main/pocket/__tests__/{ipc,funnel,switch-queue}.test.ts`, NEW `src/main/pocket/__tests__/p3331-return.test.ts`, NEW `p3331-setup.test.ts`, `src/main/machines/__tests__/tailscale.test.ts` |
| **sheet** (the Mac's renderer) | `src/renderer/settings/PhoneSection.tsx`, NEW `src/renderer/settings/phone/steps.ts`, NEW `src/renderer/settings/phone/Steps.tsx`, `src/renderer/settings/phone-section.css`; tests `src/renderer/settings/__tests__/p316-phone-section.test.tsx`, NEW `src/renderer/settings/__tests__/p3331-steps.test.tsx` |
| **phone** (the Swift app) | `ios/Tortie/Screens/{PairingScreen,SettingsScreen,Pieces,DoorWords,Identifiers}.swift`, `ios/Tortie/Markdown/Links.swift`, `ios/Tortie/Door/Pairing.swift`, `ios/Tortie/Style/Copy.swift`, `ios/Tortie.xcodeproj/project.pbxproj`; tests `ios/TortieTests/{CopyTests,DoorWordsTests,DoorPairingTests,ScreensModelTests,SettingsTests}.swift`, NEW `ios/TortieTests/SiteLinkTests.swift` |
| **gates** (the rules, their ablations, the ledger, the mocks) | `build/conformance-pocket.mjs`, `build/ablation-p313.mjs`, `build/conformance-ios.mjs`, `build/p316/ablation-ios.mjs`, `build/p311/copy-drift.mjs`, `docs/design/phone/{Pairing,Settings,index}.html`, NEW `docs/design/phone/PairingScan.html` |
| **probes** (the runs, the stand-in, the checklists) | `build/p330/tailscale-standin.mjs`, `build/p330/probe-p330.mjs`, `build/p330/CHECKLIST.md` (row 3 and its table row), `build/p332/probe-p332.mjs`, `build/p3321/probe-p3321.mjs`, `build/p3332/probe-p3332.mjs`, NEW `build/p3331/probe-p3331.mjs`, NEW `build/p3331/CHECKLIST.md`, `build/p316/probe-p316.mjs`, `build/p316/test-ios.mjs`, `ios/TortieUITests/P316DriveUITests.swift`, `build/assert-electron-teardown.mjs` (171), `build/verification-checks.mjs` (`probe:p3331`), `build/background-fixtures.mjs` only if a new shape appears |

**The anchors each builder keeps byte for byte** (r2 §Attack F26; an ablation arm whose anchor is gone FAILS by name, and the
integrator may correct an anchor only where the built text forces it, §6.1). **main**, in `ipc.ts`: `this.pressed();\n
let saved = true;` (`build/ablation-p313.mjs:851`), the `this.setFunnel('starting');` block before `startPocketDoor` (`:810`),
the `if (!this.mayOpen()) {` block after the read (`:840`), `program: fields.funnelProgram,` (`:1052`), and every other `from:`
of `ablation-p313.mjs` that matches `ipc.ts` today (39, listed by r2's scan, §15 M11). **sheet**, in `PhoneSection.tsx`:
`  return status.pairable ? 'ready' : 'naming';` and `  if (status.pairable) return { phase: 'no', pair: true };` (`D6b`, `D6d`,
`D10c`). **phone**: in `PairingScreen.swift` the five lines of §6.3's last paragraph; in `Door/Pairing.swift`, which D24
restructures, `guard DoorEndpoint.isPublicName(wire.host),`, `        let exp: Double` and `if sends, !asked {`; in
`Screens/DoorWords.swift` `static func pairingSentence(for failure: PairingFailure) -> String {` and `case .couldNotSave,
.notAvailable, .cancelled: return Copy.notPaired` (r2's scan of `ablation-ios.mjs`, §15 M11; its regex anchors were read by
hand). Each builder greps its files against both ablation scripts before it returns, and names any anchor it moved.

**Shared files and their one owner.** `src/shared/ipc/pocket.ts` is **main**'s and the sheet codes against §5.1; `Copy.swift` and
`project.pbxproj` are **phone**'s; the mocks are **gates**'s and `CopyTests.swift` (phone) reads them by the names §5.6.2 pins
(`Pairing.html`, `PairingScan.html`); **`CHANGELOG.md`, `CLAUDE.md`, `package.json` (`"probe:p3331": "node
build/p3331/probe-p3331.mjs"`) and `docs/audits/contract-baseline.txt` are the integrator's**; this file is the spec's, and the
integrator appends "§As built — 333.1"; **`docs/BACKLOG.md` belongs to the main session**.

**The integrator** checks the base first (§4.1); reconciles the pinned names across the five (`PocketTailscaleState`,
`POCKET_SETUP_ACTIONS`, `PocketSetupAction`, the five status fields, `PocketFunnelView.refused`, `PocketSetupSeam`,
`PocketHostDeps.setup`, `recheck`, `setupAction`, `rechecks(held)`, `returnMayRun`, `RETURN_READ_WORDS`, `setupActionsNow`,
`readOnReturn`, `pressedOnThisRun`, `switchedOffThisRun`, `returnForked`, `startRefusalWord`, `adminLink` (and that NO `adminText`
exists anywhere: D6, SU8; r2 found this list naming it), `electronSetupSeam`, `TAILSCALE_DOWNLOAD_PAGE`, `TAILSCALE_APP_BUNDLE`, `TAILSCALE_APP_PROGRAM`, the six
contract sentences, `PUSH_PUBLISHER_ONLY`, `checklistOf`, `StepFace`, `StepPiece`, `GET_PHONE_APP`, the hooks of §5.4.8,
`SiteLink`, `SiteOpening`, `SiteOpener`, `DoorWords.reachNote(for:)`, `PairingFailure.codeFromNewerMac`/`codeFromOlderMac`,
`PairingModel.scanning`/`startScanning()`, the identifiers of §5.5.6, the mock names); runs §7.1 whole except what needs the
lock; `xcodebuild build-for-testing` Debug and Release for the Simulator SDK and an unsigned Release device archive read by
`--read-app`; regenerates the baseline (D31) and checks the diff is exactly the two lines and the count; scans the delta for
control, bidi, zero-width and BOM characters and for duplicated blocks of ten lines or more; writes the CHANGELOG item (§8) and
the CLAUDE.md rows; appends "§As built — 333.1".

**The CLAUDE.md rows** (the integrator, one sentence each in the house style): the `conformance:pocket` row: B1 fifteen, the two
channels, SU1 to SU9, D6 read over the whole sheet surface, `src/main/machines/tailscale.ts`'s two constants; the
`conformance:ios` row: (av), av1 to av8 with the marker, and build 8; the
`conformance:phonecopy` row: the floors 101 and 9 and `PairingScan.html`; the probes table: NEW `probe:p3331` (its launches, the
stand-in's new modes, what it never presses), `probe:p316`'s `setup` group, and `probe:p330`, `probe:p3321`, `probe:p3332` "a
first setup shows the code by itself", with `probe:p3332`'s rectangle sentence following D37, and the `probe:p330` row's "Open
Tailscale drawn and NEVER pressed" becoming "Approve in Tailscale drawn and NEVER pressed" (the button's words move, D14, §5.4.3).

**The verifiers** (two lenses, each under the lock, phone slot first): **Lens 1, the attack and the re-derivations** (§7.9 methods
1, 3 and 4; the presses table read from the raw records; the vitest drive of `setupAction` re-run and attacked); **Lens 2, the app
runs** (`probe:p3331` at the parent and HEAD, `probe:p316 P316_ARMS=setup` on 26.3 and 18.3, `test:ios` Debug and Release on both,
`--read-app` on a Release archive, the moved probes of §7.6 once each). Each names the step it did that the builders did not.

---

## 12. What this sends to other phases and the main session

- **333.6**: research 140 §10.2's What to Test says "press Pair and scan the code"; on a first setup the code now shows by itself,
  so it says "follow the three steps and scan the code".
- **333.5**: the support page names the menu bar case if C2 finds it, and says Get Tailscale opens the page that offers both the
  Standalone and App Store variants.
- **333.3**: it adds "See a sample" to the resting face of §5.5.1, below Scan code, and to `Pairing.html`; this phase leaves no
  slot drawn for it.
- **337.2**: it rebases on this phase's `probe-p316.mjs` and `P316DriveUITests.swift`.
- **333.12 and 318.1**: any later QR version keeps `fp`, `dk` and `dx`, the marker D24 reads before the version, or every phone
  from build 8 on says "That is not a Tortie pairing code." to it.
- **A new entry, for the main session to word and queue** (r2 §Attack F19, §14 item 9): today's latent second start while
  published (an in-flight start, a Remove, an Allow). Its likely shape is one guard at the top of `openNow` or in `start()`; it is
  a change to the gate's own path, so it is a phase of its own with its own reverify, not a line in this one.
- The main session records each in a running-log line.

---

## 13. What is NOT in this phase

- **No door route, no QR version change and no hashed field.** No paired phone is asked to Allow again, which is why this phase
  does not wait for 333.12. 318.1 still does.
- **No See a sample.** That is 333.3, in build 9, after Beta App Review has build 8.
- **No change to the confirm**: its lines, its two warnings, its hash, its record, its gate, refusal 8.
- **No timer and no poll.** No read of Tailscale while the switch is off, none for an unconfirmed door in a run whose switch was
  not pressed, and none on opening the sheet with the door off.
- **No return re-check of `shields-up`**, because only a start can see it.
- **Tortie installs nothing.** No `tailscale up`, no LocalAPI, no admin-console automation, no click on Tailscale's page, and no
  code-signature check of Tailscale.
- **No measurement of the App Store variant of Tailscale.** Get Tailscale opens the page that offers both; Funnel on the App Store
  variant stays "probably yes, not settled" (research 132 §3.1).
- **No way to tell an admin whose Tailscale did not wait from a non-admin.** Both read "Ask your Tailscale admin". The page a
  non-admin's link opens is unmeasured.
- **No new button for `no-name`, `funnel-ports` or `port-taken`.** Their sentence and Try again stay.
- **No web view and no in-app browser.** The pages open in Safari, or in the app that owns the address.
- **No typed-code fallback** for a person who denies the camera; "Enter a code instead" leaves the mock.
- **No Mac version on the wire**, no Intel build, and no fix for the 'iPhone' label.
- **No page content.** The privacy and support pages are 333.5's; tortie.sh/iphone is 333.5's holding page and 333.7's link.
- **Never "beta" or "TestFlight"**, and no "remote desktop", "mirror", "stream" or "SSH".
- **No menu change. No release, and no upload**: uploading is his.

---

## 14. Open concerns handed to the verifiers

1. **The menu bar return is unmeasured** (C2). If clicking Tailscale's menu bar icon never takes focus from Tortie, no return
   follows and the quiet Try again is the way on, which is why it stays.
2. **A focus storm reads more than once.** A return reads whenever `rechecks()` holds and nothing is in flight, so twenty returns
   in a second over a 300 ms read can make three or four reads, never overlapping (A3). A person cannot produce that; a window
   manager that toggles focus could. Each read is two short program runs.
3. **The links point at 404 pages until 333.5 lands** (§4.2); build 8 is not uploaded before then.
4. **An unusable development override logs one warning per status** (D3); development builds only, and only on a probe's own
   mistake.
5. **`account` is drawn as Tailscale answered it** within D4's bound (256 units, no control or format character, else not drawn);
   the tailnet the confirm lines already draw is today's, unbounded. Neither leaves the Mac's Settings window, and neither is in a
   log.
6. **The phone's camera is one press further away** (§7.10), by his design.
7. **Electron's page visibility on `hide()`** is assumed to read `hidden`; RT measures it and reads UNREADABLE otherwise.
8. **The program can be swapped inside a confirmed return's own wait** (D7b). The job asks `returnMayRun` once more, and `openNow`
   then waits on the sessions and the orphan sweep before `readTailnet` resolves the program again; a program swapped into an
   EARLIER pinned path inside that wait runs twice (`status`, `serve status`) before the gate, which reads the moved field and
   forks nothing. Launch and the restart share exactly this window today; a return adds no new one.
9. **A latent race of TODAY, found by r2 and NOT this phase's to fix** (§12): a start already in flight on confirmed fields, then
   a Remove and an Allow before it publishes, queues a second start, and a second start while published refuses `port-taken`
   against its own child and leaves the sheet `refused` while the child and the door answer (MEASURED, §15 M9). This phase's
   return adds no new way into it, because its job asks `rechecks(1)` (opening held by the return alone, the door not published)
   before it runs anything; a confirm's start queued behind a return-started start that is still running is the same race as
   today's, with a window of one start's read and spawn.
10. **A return nobody pressed is still a return.** A focus or visibility change the person did not mean (a window passing over
    Settings, and unmeasured, macOS's occlusion) reads Tailscale whenever `rechecks()` holds: two short program runs and one log
    line each, never a press, never a fork on unconfirmed fields. The probe records every one (§7.5.1).
11. **One frame of a stale step 1 after an off and an on.** `this.read` outlives an off press, so the status pushed by the on
    press itself draws step 1 ✓ from the read before the off until the job's own sweep marks it Checking, in the same task. r2
    weighed a press-numbered read and left it out: one frame, never a decision, and nothing reads `tailscale` but the sheet.

---

## 15. What the spec step measured, how, and the numbers

Every script and output is under `…/scratchpad/p3331/spec/`. History before and after every command: `734376 1791391290` and
`23166 1790702242`, unmoved. M9 to M12 are the r2 adversary's, under `…/scratchpad/p3331/adversary-r2/`; its history read
`734900 1791405989` and `23166 1790702242` before and after every command it ran (the zsh file had moved between the spec step and
r2 by his own terminals, before r2 began, and did not move during r2).

| # | Command | Exit | What it measured |
| --- | --- | --- | --- |
| M1 | `node m1-enoent.mjs` (sha256 `acb4ce56…`), Node v22.23.1 | 0 | A wrapper whose first line is `#!/p3331-no-such-interpreter/sh`, run with `execFile` exactly as `funnel.ts:224-247` runs a program: `code: "ENOENT"`, `errno: -2`; `statSync().isFile()` true and `X_OK` true, so `resolveTailscale` accepts it; a missing file: `ENOENT`; a file not executable: `EACCES`; `spawn` of the wrapper: `error` `ENOENT`, no pid. The build measures it again under Electron (R1 at HEAD) |
| M2 | `env -u TERM_SESSION_ID HOME=<scratch> ZDOTDIR=<scratch> HISTFILE=/dev/null node m2-standin-states.mjs` (sha256 `45d93386…`; output `m2.out.json`, sha256 `06db8f19…`): the SHIPPING `funnel.ts` transpiled with `electron` and `main/log` stubbed (`conformance:pocket`'s `zLoad` shape), over the SHIPPING stand-in | 0 | Running: ok, 2 calls (`status`, `serve-status`); `Stopped` → `not-running`, 1 call; `NeedsLogin`, `NeedsMachineAuth`, `signedOut` → `signed-out`, 1 call each; `caps: false` → ok, `asksApproval: true`, 2 calls; `dnsName: ''` → `no-name`; unreadable status → `unreadable`; `servedPorts: [8443]` → ok with `TCP["8443"]`; the raw status `Self.UserID: 1`, `User: null`; ABSENT → program ok (`dev-override`, the stat), read `no-tailscale`, 0 log lines (the stand-in never ran); an unusable override → `override-unusable` twice, 2 warnings for 2 resolves; `startFunnel` with `approval: 'exit0'` → refused `not-approved`, `onApproval` with `https://login.tailscale.com/f/funnel?node=nMADEUP`, opens true; `refuse: shields-up` → `shields-up`, no URL; `refuse: not-approved` (stderr) → `not-approved`, NO URL; `approval: 'wait'` then `approve` → published, `onApproval` then `onApproved`; `approvalOpens('https://tailscale.com/download')` false; nothing left (`endAll` ended 0, left 0) |
| M3 | `node m3-looked.mjs` (sha256 `084e328d…`; output sha256 `97c8cf2a…`): the SHIPPING `remote-writes.ts` over counting `EventTarget`s | 0 | Nothing attached before a subscriber; two subscribers attach ONE `focus` and ONE `visibilitychange` listener; a synthetic `focus` fires both; `hidden` fires none; `visible` fires both; twenty focuses fire twenty calls per listener (no coalescing, D10); one unsubscribe detaches nothing; the last detaches both; a focus after it fires none |
| M4 | `grep -n` and `sed -n` over the adversary's saved Tailscale sources under `…/scratchpad/p3331/adversary/` (`local.go` v1.94.1 sha256 `6a5390b7…`, `local-1102.go` v1.102.2 `12171082…`, `localapi.go` `44631b37…`, `status-cli.go` `21bede0a…`) | 0 | `status-cli.go:82-84` `StatusWithoutPeers` when `--peers=false`; `localapi.go:853-856` the same on the API; v1.94.1 `local.go:1348` `if sb.WantPeers` guards `populatePeerStatusLocked`, whose `:1360` alone adds users; v1.102.2 `local.go:1554-1561` adds the self user before the guard. The v1.100.0 boundary is the adversary's read and issue 19894; the design reads the field when present, so the exact first version does not decide anything |
| M5 | `node build/conformance-pocket.mjs`; `node build/p311/copy-drift.mjs --self-test`; `node build/conformance-ios.mjs`, on the base | 0, 0, 0 | pocket PASS, 127 rules, 18,018 checks, 5.46 s; phonecopy OK, Copy.swift 167 words, 82 Mac-judged (floor 80), 85 the phone's own, 7 named controls (floor 7), 18 screens, 586 segments, 89 owned rules matched (floor 89), 65 owed; ios PASS, 45 rules over 47 app files, 61 test files and 119 files under `ios/` |
| M6 | `grep` over `ios/Tortie` and the sheet, contract and push copy, and over `build/` for `data-phone-*` | 0 | No `https://` literal in `ios/Tortie` code; no `beta`, `TestFlight`, `remote desktop`, `mirror`, `stream` or `SSH` in a `Copy.swift` value, a sheet literal or a pocket sentence (one comment, `pocket.ts:1446`); no probe reads `data-phone-door-line`, `DOOR_OFF`, `DOOR_WAITING` or `PAIR_WAITING`; the hooks of §5.4.8 are the ones `build/` reads |
| M7 | reading `ipc.ts:960-1012`, `:1298-1312`, `:1852-1865` | — | the trace of D34: at launch an unconfirmed door returns at `mayOpen()` before any read; a confirmed launch whose read fails keeps `readRefusal`; `removePhone` withdraws the agreement and clears no refusal word |
| M8 | `git diff --stat f5ff5183 cb8d52a6 -- ios src/renderer/settings src/main/pocket src/shared/ipc/pocket.ts src/main/machines/tailscale.ts` | 0 | empty: the parent of both sides is `cb8d52a6` (build 7's `ios/`) |
| M9 | r2: `env -u TERM_SESSION_ID HOME=<scratch> ZDOTDIR=<scratch> HISTFILE=/dev/null node_modules/.bin/vitest run --config …/adversary-r2/m/vitest.config.mjs` (config sha256 `33092f11…`, test `a1-shipping-owner.test.ts` `d2804777…`, output `a1.out.json` `718e7535…`; the SHIPPING `PocketHost`, real `bind.ts`, in-process door, `switch-queue.test.ts`'s in-memory Funnel), 2 tests, 396 ms | 0 | A second `start()` on a published door: before `listening`, funnel `publishing`, 1 child, 1 serve session, the door socket answers; after: state `refused`, funnel `idle`, refusal "Tailscale on this Mac already uses port 8443 for something else. Tortie will not take it over.", STILL 1 child alive, 1 serve session, the socket answering, `warn the phone door did not open: port-taken`. The own child's entry is counted because `openNow` calls `portsHeld(read.serve)` with no `exceptTarget` (`ipc.ts:1007`, `funnel.ts` `portsHeld`) |
| M10 | the same run | 0 | Confirmed fields, the fake `Stopped`, off then on (state `refused`, `not-running` pending), then an off press whose seal throws: the off answers "The door is closed, but Tortie could not save the switch, so it will ask again when Tortie next starts."; afterwards state `refused` (not `off`), `confirmState` `confirmed`, funnel `idle`, the `not-running` sentence, 0 children, the socket closed. Every clause of the draft's D7 holds there |
| M11 | r2: two `node -e` scans of every `from:` string of `build/ablation-p313.mjs` and every `replace(` string of `build/p316/ablation-ios.mjs` against today's files (`…/adversary-r2/anchors-p313.txt` sha256 `1450edf8…`, `anchors-p316.txt` `42b33523…`) | 0 | 39 `ablation-p313` anchors match `ipc.ts` and 3 match `PhoneSection.tsx`; the off arm's (`:851`) spans the two lines the draft put D8's statements between. 27 `ablation-ios` string anchors match the phone builder's eight app files, among them `Pairing.swift`'s `guard DoorEndpoint.isPublicName(wire.host),`, which D24 restructures around |
| M12 | r2: reading `git show a8e06fe7^:src/main/pocket/pairing.ts` (`:912`, `:1096-1104`) | 0 | The v:2 code carried `v, host, port, fp, dk, dx, ps, exp` (and `tk`), so `fp`, `dk` and `dx` are in every Tortie code since v:2, the marker D24 reads |

Also read and recorded: `HELPER_USER_FLOOR = 170` (`build/assert-electron-teardown.mjs:469`); `CURRENT_PROJECT_VERSION = 7` at
six `project.pbxproj` lines; `PHONE_BUILD = '7'`; `RULE_IDS` ending `au`; the baseline's `count=246` and 13 `pocket:*` lines;
`package.json` `0.110.0`; `electron-builder.yml:1` arm64.

**Not measured here, each named where it is owed**: Electron's own `execFile` of the absent wrapper (R1); a real `hide()` and
`showInactive()` (RT); the Swift binary's literal bytes (§7.8); Tailscale's real approval page and a non-admin's link (§13); the
menu bar case (C2); the pages (333.5).

---

## 16. Questions for him

None blocks the build. One is his when he next looks:

1. **The camera one press away.** His design puts Scan code before the camera, so iOS asks in context (research 136 §7, 5.1.1(iv));
   the cost is one press for a person who already has the Mac's code on screen. Default: as designed.

---

## §Attack

**Round r2, 2026-10-07, the adversary**, in `/private/tmp/wt-p3331` at `cb8d52a6`, after the first attack round was stopped at
16:07 by the account's usage limit in the middle of its revision. That round left edits citing "§Attack F1" to "F17" and none of
its reasoning; `…/scratchpad/p3331/adversary2/` is empty. r2 read this file whole, re-read every D-row's citations against the
tree, attacked it as if no round had run, measured what it could on the SHIPPING code (§15 M9 to M12), and revised the file in
place. Its findings continue the numbering at F18. It started no Electron, no Simulator, no tmux server, no shell of its own
beyond the commands recorded, no agent and no model turn; no real Tailscale, DNS or APNs; it read nothing under `~/.ssh`,
`~/.claude`, `~/.codex`, `~/Keys`, his keychain or his live profile. His history read `734900 1791405989` and
`23166 1790702242` before and after every command that started a process (vitest ran under a scratch `HOME` and `ZDOTDIR`,
`HISTFILE=/dev/null`, `TERM_SESSION_ID` unset), unmoved. `git status` read only `?? build/p3331/` before and after.

### The stopped round's edits, re-derived

Each citation the stopped round left is re-checked against the tree; its reasoning is lost, so the claim each text makes is what
was judged.

| Cited | What the text claims | r2's reading |
| --- | --- | --- |
| F1 | Q1 goes red unless `readOnReturn` joins its job set | HOLDS: Q1 (c) fails any `this.sweepAndRead()` called from a method outside `JOBS` (`build/conformance-pocket.mjs:3029`, `:3043`, `:3083-3096`) |
| F2 | `missing` gains the quiet Try again | HOLDS, and it is his ruling 3 |
| F3 | a held port a return finds goes in `readRefusal`, so no Allow is drawn over it | HOLDS: `confirmable` reads `readRefusal` (`ipc.ts:739-745`) and `doorNeedsConfirm` reads `confirmable` (`PhoneSection.tsx:291-298`) |
| F4, F5 | `shields-up` leaves the return set; `returnForked` bounds a return to one fork per press | HOLD: only a spawn sees `shields-up` (`funnel.ts:641`); the stand-in's `refuse` answers every funnel start, so A10 can be driven |
| F6 | `returnMayRun` runs only the confirmed program on confirmed fields | HOLDS: `readTailnet` resolves again by itself (`funnel.ts:694-715`). Its row pointed at a §14 item that did not exist; r2 wrote it (§14 item 8) |
| F7 | the parent's count is its fewest presses | HOLDS: `onPair` carries the wish through Allow (`PhoneSection.tsx:1166-1176`) |
| F8 | the account's second arm, for a user id past 2^53 | HOLDS; narrowed by F21 |
| F9 | a URL that fails `approvalOpens` is not kept for Copy link | HOLDS. But §11's integrator list still named `adminText`, which D6 and SU8 say must not exist: two sections disagreed, and r2 fixed §11 |
| F10 | A7 waits for the read's own process to end by itself | HOLDS: `execFile`'s child is not ended by the parent's exit |
| F11 | Try again carries the wish | HOLDS; its guard written exactly by F27 |
| F12 to F15 | cited nowhere | Nothing in the file can be traced to them; r2 found no other pair of sections that disagree |
| F16 | L3 reuses the parent's wrapper path, scenario and HOME | HOLDS: the program, the tailnet and the public name are hashed (`pairing.ts:430-479`) |
| F17 | `smoke:t1` starts an Electron, so it runs under the lock | HOLDS |

### r2's findings, each with what it changed

| # | Class | Finding | Changed |
| --- | --- | --- | --- |
| F18 | refusal 8, his off press | **A return could start the door after the person switched it off.** An off press whose save fails (the sealed store cannot be written; his disk read 99 percent full the day this ran) leaves the HELD store saying on: `writeStore` "answer[s] false and hold[s] what was" (`ipc.ts:623-628`). MEASURED (M10): afterwards `state` is `refused`, not `off`; `confirmState` is `confirmed`; the funnel is `idle`; `not-running` is pending. Every clause of the draft's D7 then holds, so once Tailscale starts, one focus forks the door process and spawns Funnel. Today nothing reopens that door in the run | D7 (a) asks `switchedOffThisRun` (D8), set by the off press and cleared by the on press; SU1; ablation 4j; the vitest's F18 window; Lens 1's A11 |
| F19 | a second start while published | **A return queued behind a restart could start the door a second time.** The draft took (d) and (e) to cover the restart, but when a confirm's `start()` has left the funnel `idle` while a restart is armed (`start()` cancels no restart, `ipc.ts:872-884`), the timer's firing leaves `restartCancel` null, `opening` 0 and the funnel `idle`. A return there is queued BEHIND `recoverNow` and runs `openNow` after it publishes. MEASURED (M9): a second start while published refuses `port-taken` against its OWN child (`portsHeld(read.serve)` has no `exceptTarget`, `ipc.ts:1007`) and sets the funnel `idle`, so the sheet says `refused` with a false sentence while the child lives, its serve session stands and the door answers | the job asks `rechecks(1)` before anything (D7, D9, §5.2.3); SU1; ablations 4k, 4l; arm 4's vitest made to reach its clause; the vitest's F19 window |
| F20 | the same, by a confirm | a return queued behind a close (which holds no `opening`), then a Remove and an Allow before it runs, would run a start beside the confirm's own | closed by the same `rechecks(1)`: `opening` is then 2, not 1; the vitest's F20 window |
| F21 | a state the code cannot read | the account's one-entry arm also fired for a SAFE user id whose key was absent, which does not prove the entry is the Mac's own user | D4: that arm only for an id that is not a safe integer |
| F22 | a drawn string nobody bounded | the account is new drawn text from a program's output, unbounded, so a control or bidi character could make step 1 read as another account, and 64 KB wrecks the row | D4: at most 256 units and no `\p{Cc}` or `\p{Cf}`, else not drawn; §14 item 5 |
| F23 | a gate red on correct-looking code | three test files no builder owns import the pocket host under an `electron` mock with no `shell` or `clipboard`, and vitest throws on the first read of a member a mock lacks | D12: the production seam reads `shell` and `clipboard` at call time; §5.2.3 pins the text; SU3; ablation 28; `npm test` whole in the vitest list |
| F24 | worse than today, on the phone | decoding `{ v }` alone made any JSON code with `"v": 1` or `2` say "This code is from an older Tortie for Mac. Update Tortie on your Mac.", which is false, where today it says "That is not a Tortie pairing code.", which is true; and no public Mac ever sent v:1 or v:2, so that arm's only real input today is somebody else's code | D24: the version is read only behind the Tortie marker (`fp` of 32 bytes, `dk`, `dx`; M12), compared with `version` and never written as arithmetic; av8; `DoorPairingTests`' foreign codes; Lens 1's A12; §12 tells 333.12 and 318.1 to keep the marker |
| F25 | a gate green with the behaviour absent | D6's and D10's sheet halves read `PhoneSection.tsx` alone, so the new `phone/steps.ts` could decide from `nameCheck` or `nameProgress` unseen | §6.1: D6 reads the whole surface, and the two new files name neither; ablation 27 |
| F26 | the builders breaking ablation arms by placement | `build/ablation-p313.mjs:851` anchors on `this.pressed();\n      let saved = true;`, and the draft put D8's off-arm statements between those two lines; 39 other anchors sit in `ipc.ts`, three in `PhoneSection.tsx`, 27 in the phone builder's files (M11) | D8 and §5.2.3 place the statements after `let saved = true;`; §11 lists the anchors each builder keeps; ablation 29 |
| F27 | his Mac handed a code it did not ask for | `(status?.phones.length ?? 0) === 0` reads a status not yet loaded as "no phones". The switch is disabled while `status` is null today (`PhoneSection.tsx:769`), so nothing reaches it now; the plain form keeps it so, and gives SU7 one text | D17, SU7 |
| F28 | a proof that cannot run | `SiteLinkTests` was to invoke "the views' actions directly", which XCTest cannot do to a SwiftUI `Button` | D21: named press methods; §7.3 |
| F29 | a count that is not a count | a real return nobody pressed (his clicks, a window passing over Settings, and, unmeasured, macOS's occlusion) reads Tailscale, so "exactly one read" counts only this run's returns if the probe hears every return | §7.5.1's return recorder: every event timestamped, an arm that heard one it did not cause re-run once and then UNREADABLE; §14 item 10 |

And one finding that is TODAY's, handed on rather than fixed (§12, §14 item 9): an in-flight start, a Remove and an Allow queue a
second start while the first is still running, the same corruption as F19 by today's own path. It is a change to the gate's own
path, so it is its own phase.

### What held, checked against the tree

No door route, QR change or hashed field moves (D30): the status fields are no field of `PocketExecutionFields`, and the baseline
lists channels, not fields (`count=246`, 13 `pocket:*` lines). `funnel.resolve()` answers `{ resolution, overrideSet }`
(`funnel.ts:208-215`), from which D11's predicate reads. U2's path pattern does not match `https://tailscale.com/download`, and
U2 (d) requires every `program:` in `ipc.ts` to name `.funnelProgram`, which the design adds none of. L5 holds with both new
`openNow` lines: the stop sits before the last gate, the `returnForked` line before `setFunnel('starting')`, and nothing is awaited
between the last gate and the fork. Q1 (d) and (e) hold: the new `setDoor` statements precede the first await, and
`this.startRefusalWord =` does not match (e)'s `this\.startRefusal\s*=`. Rule (z)'s z4 requires one open or more in `Links.swift`
and asks `LinkPolicy.opens(` in each open's own closure, whose start is a function body's brace, so `SiteOpener.open` passes as
written; z3 and z5 do not move. Rule (y) pins `Links.swift`'s imports to Foundation, SwiftUI and UIKit (`RENDERER_IMPORTS`). Rule
(k): `id + "-note"` is the shape of `failure + "-retry"` (`Identifiers.swift:448`). Rule (s)'s six pins and its fixtures are as D26
says. The ledger: every `/// Names:` needle exists byte for byte (`title: 'Settings'`, `PHONE_TITLE = 'Phone'`, `BTN_ALLOW =
'Allow'`); `notPaired` and `pairWaitingForAllow` have no rule today; 18 screens become 19. SU9 and av6 find no refused word in a
literal today (only comments, and one in vendored `phone/qrcodegen.ts`). The camera's one ask is in `ScannerView.start()`. One
renderer test imports `PhoneSection.tsx`. Every `/// Mac:` word the phone quotes from the sheet stays there. `src/shared/ipc/
index.ts` re-exports `./pocket` whole. `LinkPolicy.opens` accepts all three addresses. The stand-in already does `caps: false`,
`approve`, `exit0` and `refuse`.

### Considered, and not changed

- One frame of a stale step 1 after an off and an on (§14 item 11).
- The port refusals are drawn by their word, `ports-taken` and `funnel-ports` in step 1 as the entry's table puts them and
  `port-taken` in step 2. Each sentence is drawn once and has its Try again.
- Every return while a refusal is pending reads Tailscale: the design, bounded by D9's drop and D7b (§14 item 10).
- The phone's steps no longer say "press Pair". On a first setup the code shows by itself; for a second phone, step 3 draws Pair on
  the Mac. No press is added.
- `build/p316/CHECKLIST.md` and `build/p3165/CHECKLIST.md` cite `DOOR_WAITING` and `PAIR_GROUP` as their phases' record; they are not
  edited. `build/p330/CHECKLIST.md` row 3 is the probes builder's, as §11 says.

**r2's verdict on the spec: build it as revised.** The two Major findings (F18, F19) are closed by two clauses in the predicate that
already exists, each proved red by an ablation and a vitest window; F24 is closed on the phone by a marker every Tortie code has
carried since v:2.

---

## §As built — 333.1

The integrator appended this section on 2026-10-07 with a shell command, and the wipe of `/private/tmp` on 2026-10-08 took it
with every uncommitted file. It is restored here from the integrator's typed report (`integrate:p3331` in
`/private/tmp/tortie-ops/p3331/retained.json`), which holds every decision and number below. The base then was `cb8d52a6`.

**Decisions, each with where it comes from.**

1. **`phone/StepsCard.tsx`, not `phone/Steps.tsx`** (D19). Beside `steps.ts` the two cannot both build on his case-insensitive
   disk: TS1149, TS6307 and TS5056, measured by the sheet builder with this repository's tsc. `conformance:pocket` D6 reads every
   file under `phone/`, so the frame is still covered.
2. **`DOOR_OPENING`, `DOOR_NOT_LISTENING` and `doorListening` moved to `phone/steps.ts`** and are re-exported from
   `PhoneSection.tsx`, because D19 forbids the composer importing the sheet. The phone quotes none of them.
3. **A defect the sheet builder found and fixed.** Try again's wish for the code was judged against the status drawn before the
   press, so a refusal no return re-checks (`shields-up`, `port-taken`, `busy`, `failed`) dropped it before main answered. The fix
   is a new export, `wishAwaitsAnswer`: a press is judged by main's answer to it.
4. **Two departures by the main builder.** Step 2 draws a start's `funnel-ports` when step 1 reads ready, which the table read
   literally would have left drawn by neither step; and D4's one-entry arm also requires `Number.isInteger(id)`.
5. **Two more.** Once either quit has begun, Copy link is not listed and is refused (the host has no quit hook, and
   `capabilities.ts` and `bind.ts` stay untouched); `clipboard` is imported on its own line, so the
   `import { app, shell, … } from 'electron';` anchor stays byte for byte.
6. **More ablation arms than §6 lists**: `ablation:p313` 53 (the gates builder's SU30 to SU36 among them), `ablation:p316` 24.
7. **The mocks and the ledger.** The contact sheet says "Nineteen screens" because it frames 19 (its header already said
   sixteen while it framed 18). The ledger's data rule for upper-case fingerprint groups left with the old pairing mock, because
   every ledger rule must match something and the camera face draws the app's own lower-case groups.
8. **The CHANGELOG item** adds "its camera opens only once you press Scan code": §7.10 says the item names Scan code and §8's
   text did not, and the house rules put a limit a person will hit in the item.
9. **The Release build for testing** needs `ENABLE_TESTABILITY=YES`, as `build/p316/test-ios.mjs` passes it. Every xcodebuild
   used the harness's ad hoc signing settings, so nothing touched his keychain.
10. **No ablation anchor needed correcting.**

**Left for the main session.** `build/p330/CHECKLIST.md` row 2 still says "Pair a phone" and quotes 333.2's scan line, and its
table cites `DOOR_OPENING` and `doorListening` at `PhoneSection.tsx` lines (they live in `phone/steps.ts` now); §11 gave the
probes builder row 3 alone. `docs/design/phone/Unpair.html` still draws the old About card. A comment in
`src/shared/ipc/pocket.ts` says the door's one write is `end`, false since Phase 337. The latent second start while published
(§12). Fifteen runs of copied ten-line blocks, none in production code (probe helpers, per-file test worlds, and the sheet test's
copy of the confirm block); nothing extracted.

**The integrator's numbers (2026-10-07).** typecheck 0. `npm test` (scratch HOME and ZDOTDIR) 1,119 of 1,121 files (2 skipped),
20,782 passed and 14 skipped, 52.3 s. `contract-inventory --check` 1 before and 0 after the regeneration (246 → 248, the two
channel lines alone). `npm run build` 0, 34 s (electron 171 of 171, background 544 files, simulator 2 users, knownhosts 572 files,
checks 264 classified, ios 46 rules, harnessprobes 6 clauses and 16 ablations, the contract byte for byte). `conformance:pocket`
136 rules, 19,592 checks; `conformance:pocket:hostile` 270 arms, 17.2 s; `conformance:push` 26 rules, 2,381 checks;
`conformance:phonecopy` 19 screens, 180 words, 82 Mac-judged (floor 80), 98 the phone's own, 9 named controls (floor 9), 101 owned
rules (floor 101), 64 owed; `conformance:machines` 0, 30 s. `ablation:p313` 474 of 474 red, 3,223.7 s, the eight arms that must
also redden `p3331-return.test.ts` red there; `ablation:p316` 416 of 416 red, 18 min 11 s. The stand-in's self-test 48 checks.
Grader self-tests p330 103 clauses, p332 64, p3321 54, p3332 43, p3331 144 (246 checks), p316's setup group 45 cases.
`vectors.mjs --check` 0. xcodebuild Debug and Release for testing 0 and 0 (20 s, 53 s, no Swift warning); the unsigned device
archive 0 (20 s); `--read-app` on it and on the Simulator Release app 0 (build 8, version 1.0.0, each `tortie.sh` address present
whole, no DEBUG seam). `npm run package` 0, 64 s, `release/` (836 MB) removed. `test:ios` 26.3 0, 4 min 02 s, Debug 664 tests and
Release 661, 0 failures; 18.3 0, 2 min 38 s, the same counts. The files that must not move: 0 bytes. Hidden characters: 0 in 59
files. History `734900 1791405989` and `23166 1790702242` before and after every command.

## §As built → The fix round, 2026-10-08

Restored from the fixer's typed report (`fix:p3331` in the same file); its own text went with the wipe. The verify had answered
needs_work with two major findings, five minor and three nits, none worse than today.

1. **`probe:p3331` (major).** R11 ends with one press on the stand-in's own tailnet, whose read writes the stored tailnet back, so
   the door is confirmed again for the arms after it. A5b checks it starts confirmed, R12 that it starts confirmed with phone B
   paired; without that each reads UNREADABLE, never FAIL. R12, phone B and S are never run twice, and the two pairings, which
   count no Tailscale call, note a return the probe did not cause in their reading. Every launch waits for its window to settle
   before its first arm: visible, then 4 s quiet, at least 2 s, at most 30 s. The budget is the verifier's measured 9 and 10
   minutes, about one more for the fix; the `probe:p3331` row in CLAUDE.md had a fourth cell in a three-column table, merged.
2. **`probe:p316`'s setup group (major).** Settings runs after the two failure steps; read first, it left SE5 and SE6 unreadable.
3. **`probe:p3332` (minor).** Elements are measured from each landmark's content box (the reader records its padding); the
   parent's rest-face actions row is in the named set; R and K are read at the window's own width and 2,000 px tall at both
   builds; CMP refuses a reading at another height. Eight more self-test checks.
4. **Step 1's line (minor).** "then come back" only while main's `rechecks` is true or a start the person pressed is still
   running; otherwise "Turn it on." or "Sign in." (`POCKET_TURN_ON`, `POCKET_SIGN_IN`). Checklist row C1 says the door comes back
   by itself within a minute. Of the verifier's two options this is the wording one: a return that ran an armed restart would
   start processes on a window focus and need its own bound, and D7 (e) is load-bearing. Recovery stays today's, 10,129 ms at HEAD
   against 10,133 ms at the parent.
5. **The site buttons (minor).** `conformance:ios` av9: each of the six site presses is the one `Button(action:)` naming it,
   drawn by its own Copy word, identified by its own ID, with a body of exactly its own `site.open(.<case>)`. `ablation:p316` av9
   (the verifier's swap), av9b and av9c.
6. **The account (minor).** The bound also refuses line and paragraph separators, lone surrogates, private-use and unassigned
   code points, and more than four combining marks in a row (`ACCOUNT_NOT_DRAWN`, `ACCOUNT_MARK_RUN_MAX`). Step states draw on one
   line cut with an ellipsis; step 1's whole line is its hover. The comment no longer claims step 1 can never read as another
   account: a look-alike is drawn as Tailscale answers it.
7. **The stat after a good read (minor).** A main test and a sheet test cover a Tailscale deleted after a read that answered;
   `ablation:p313` SU37, and SU38 to SU39b for items 6 and 4, through three new driven checks (`setup`, `funnel`, `steps`).
8. **Nit, D28.** Rule (b) reads `Words(` and `stepRow(` as drawing calls, so a literal step number is caught; ablation arm b12.
9. **Nit, §14 item 2, corrected here.** A storm reads more than "three or four" times when the read fails fast: with Tailscale
   stopped, each of twenty returns 40 ms apart made its own read, 19 to 20 per storm, never overlapping (the 333.1 verifier).
10. **Nit, the name note on the live face: not fixed.** It moves the R9 grader and the rectangles three probes hold.

**The fixer's numbers.** typecheck 0; `contract-inventory --check` byte for byte; `npm test` 1,121 files, 20,799 tests (20,785
passed, 14 skipped), 75.3 s; `npm run build` 0; `conformance:pocket` 136 rules, 19,624 checks; hostile 270 arms, 16.6 s;
machines 0; push 26 rules, 2,381 checks; phonecopy 19 screens, 604 segments, floors 101 and 9; `ablation:p313` 480 of 480 red,
3,264.3 s (the six new arms alone 6 of 6, 65.7 s); `ablation:p316` 420 of 420 red, about 22 minutes; the stand-in 48 checks;
every grader self-test; `vectors.mjs --check`. xcodebuild Debug 19.3 s and Release 51.8 s for testing, no Swift warning, and
`--read-app` on the Simulator Release app (12 Mach-O files, the three addresses whole). BLOCKED ON DISK: the device archive, its
`--read-app` and `npm run package` (7.1 GB free at 03:12, under 8 GB for over 30 minutes, none of it this phase's).

## §Rebuilt after the reboot

**What happened.** The phase was built, integrated, verified (needs_work) and fixed on 2026-10-07 and 08 at `cb8d52a6`. The Mac
rebooted at about 11:00 on 2026-10-08 and `/private/tmp` was wiped with every uncommitted file. The worktree was rebuilt at
origin/main `35a9a390` (`cb8d52a6` plus docs commits; the one that touches a file of this phase, `build/p330/CHECKLIST.md`'s
"Superseded" line, is kept) by replaying, in time order, every Write and Edit the phase's agents made. Twenty edits found no
anchor (`/private/tmp/tortie-ops/p3331/REPLAY-GAPS.md`), and every change a shell command made was missing. A first repairer
worked from 11:25 to 12:02 and was stopped when the model was switched; a second (this section's author) checked its changes,
which hold, and finished the work. Nothing is committed, staged or stashed.

**What the replay got wrong, and what was done.**

- **The twenty gaps.** Most were a second agent's copy of an edit already applied, so they were in the tree; six inserts had been
  applied twice and were taken out once (`PUSH_PUBLISHER_ONLY`, which broke the typecheck; `pairNewerMac`, `pairOlderMac` and
  `reachAllowAgain` in Copy.swift; `reachNote` in DoorWords.swift; two tests each in DoorWordsTests and DoorPairingTests; the
  steps block of `phone-section.css`; a header paragraph of `conformance-ios.mjs`). Rebuilt by hand: `PHONE_BUILD`'s comment,
  `ablation:p316` av9, av9b, av9c and b12, the funnel test's import of `ACCOUNT_MARK_RUN_MAX`.
- **Damage no text gate saw.** A line holding a tool call's closing tag, left in Copy.swift by the transcript extraction (after `reachAllowAgain`), found
  by compiling the app with swiftc and removed; four raw bidi and zero-width characters written into `funnel.test.ts` where its
  source spells escapes, put back as escapes.
- **Rewritten from the spec and the retained reports**, because a shell command had made them. The first repairer:
  `HELPER_USER_FLOOR` 171 and its paragraph; `electron('probe:p3331')`; the contract baseline (exactly the two channel lines and
  the count); the ledger and the Settings and contact-sheet mocks; SU1's two clause keys read by name (T1 had read
  `get('a')` as an address); (av)'s dotted `scanning` write and `av` in `RULE_IDS`; `ablation:p313` SU30 to SU39b and its three
  driven checks; the moved probes' re-pins (p330, p332, p3321, and p3332's graders and model); the sheet tests' fix-round words.
  The second: `probe:p316`'s `setup` group (SE1 to SE8 and SEP, `P3331_PARENT_IOS`, the relay's shut mode, 57 self-test cases);
  `P316DriveUITests.swift`'s five setup steps and `setup-inventory`, and the launch with no code leaving the seam out;
  `test-ios.mjs --read-app` requiring the three addresses whole in every build, with six pure checks (72 in all);
  `probe:p3331`'s fix round (R11's press, the premises read as UNREADABLE, R12 and the pairings run once, the window's settle, the
  measured budget) and its `callsOf` fixture count; checklist row C1 and its stale line numbers; `probe:p3332`'s reader and
  drive (the landmarks, their padding, the side lines, the door's switch, R and K at the window's width and 2,000 px tall, the
  switch as the first setup's press), four self-test fixtures, and the key row's buttons allowed to move but never to change their
  words (`MOVES`); the stand-in's `account` answered exactly as given under one `SELF_USER_ID`, its 48th check; `ablation:p316`
  av3c, av5c and av5d, the three arms its count said were missing ("a second opener", "the camera built or asked for early");
  `ablation:p313`'s header count and base line; the `probe:p316` note in `verification-checks.mjs`; CLAUDE.md's `probe:p3331` row
  (three cells, the measured budget, the fix round) and the counts and fix-round clauses of the `conformance:ios`, `ablation`,
  `probe:p316` and `probe:p3332` rows; `PhoneSection.tsx`'s header naming `phone/StepsCard.tsx`; and one sheet test, the fix
  round's third (step 1's one line, its hover and the CSS that cuts it), which brings `npm test` back to the fixer's 20,799.

**Where the rebuilt tree is not byte for byte what the reports describe.** `probe:p3331`'s self-test reads 29 graders, 143
clauses and 244 checks where the reports say 144 and 246: every row and attack §7.5 names has its clauses, and the missing one
could not be identified. `probe:p316`'s setup cases (57 against 45), `probe:p3332`'s graders (39 clauses against 43 plus 8
checks) and `ablation:p316`'s three arms are written anew to the same spec. `conformance:pocket` counts 19,620 checks with the
build present (the fixer's 19,624).

**The numbers of the rebuild (2026-10-08).** typecheck 0. `npm test` (scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`,
`TERM_SESSION_ID` unset) 1,121 files (1,119 passed, 2 skipped), 20,799 tests, 20,785 passed and 14 skipped, the fixer's
numbers; one earlier run had a timing test outside the phase (`src/main/symbols/__tests__/store.test.ts`) red at a load average
of 67, and 15 of 15 alone.
`npm run build` 0 (electron 171 of 171, background 544, simulator 2, knownhosts 572, checks 264, ios 46 rules, harnessprobes,
the contract byte for byte). `conformance:pocket` 136 rules; `conformance:pocket:hostile` 270 arms, 16.6 s; `conformance:push`
26 rules, 2,381 checks; `conformance:machines` 0; `conformance:phonecopy` 19 screens, 604 segments, 180 words, 82 and 98, 9 named
controls, 101 owned rules, 64 owed, its self-test 31 mutations red and the control green; `conformance:ios` 46 rules; `gate:contract`,
`gate:checks`, `gate:electron` (171), `gate:background`, `gate:simulator` 0. `ablation:p313` 480 of 480 arms red on
their own rule, 3,292.8 s; it then said FAIL for one reason alone, `PhoneSection.tsx` moving in the worktree during the run (this
author's header comment naming `phone/StepsCard.tsx`), so the twelve arms planted in that file were run again on the final file,
12 of 12 red, 122.4 s. `ablation:p316` 420 of 420 red, every rule (a) to (av) proved able to fail. Self-tests: the stand-in 48, p330 103 clauses, p332 64, p3321 54, p3332 39, p3331 244 checks, p316's setup group
57 cases (every group PASS), `test-ios.mjs --self-test` 72, `vectors.mjs --check` 0. `CSC_IDENTITY_AUTO_DISCOVERY=false npm run
package` 0, the bundle holding `pocket:recheck`, `pocket:setupAction` and the new words, `release/` (815 MB) removed. The files
that must not move: 0 bytes. Hidden characters: 0 in 59 files. Repeated ten-line blocks in the delta: none but the
project file's build settings.

**BLOCKED: every iOS build.** Xcode 26.3 offers no iOS destination ("iOS 26.2 is not installed. Please download and install the
platform from Xcode > Settings > Components."), and the iOS 26.3 Simulator runtime is gone: `simctl` lists iOS 18.3 and watchOS
26.2 alone, and its mount point `/Library/Developer/CoreSimulator/Volumes/iOS_23D8133_1` is empty. A purgeable runtime asset
taken by macOS while the disk read 4.4 to 7.3 GB free overnight is the likely cause, not measured. Installing it is his.
`test:ios` on 18.3 under the phone slot exited 1 at `build-for-testing` (xcodebuild 70), with 0 devices made; 26.3 refuses at
its preflight ("this Mac has no iOS 26.3 runtime"). Not run: `test:ios`, the Debug and Release builds for testing, the unsigned
device archive and its `--read-app`. In their place, the app's 47 files compiled as one module with `swiftc` against the iOS
Simulator SDK, Debug and Release, complete strict concurrency, 0 errors and 0 warnings; the 61 unit-test files type-checked
against that module in both; and the UI drive type-checked. The live runs (`probe:p3331`, `probe:p316 P316_ARMS=setup`,
`probe:p3332` and the other moved probes) are the reverify's, and the phone's need the platform back.

### The fix after the rebuilt tree's reverify (2026-10-08)

The reverify of the rebuilt tree answered needs_work: two major findings (the phone half blocked; `probe:p3332` unable to pass),
two minor (Copy link writing the text the program printed; `probe:p3321` H7) and two nits (no check on `readOnReturn`'s own
last-press check; the name note on the live face). A first fixer started at 14:24, was stopped by the account's usage limit at
about 14:58 before it returned, and left edits in nine files. This fixer, the one run of the fix, checked each of them: it kept
what held and replaced one. Nothing is committed, staged or stashed.

1. **The phone half (major): unblocked, and run.** He installed the iOS platform: `simctl runtime list` reads iOS 26.3.1
   (23D8133) and iOS 18.3.1 Ready. `test:ios` on 26.3.1 and on 18.3.1 each exit 0: Debug 664 tests and Release 661, 0 failures,
   0 skipped, on both; the built Debug app 11 Mach-O files and its 5 DEBUG seams found, Release 12 with none, the unsigned device
   archive 1 with none, each holding the three `tortie.sh` addresses whole (4 min 29 s and 4 min 1 s). `probe:p316
   P316_ARMS=setup` with `P3331_PARENT_IOS` at a checkout of `35a9a390` (its `ios/` is `cb8d52a6`'s, build 7): every arm PASS,
   exit 0, 452 s. SE1 to SE7 on 26.3.1 (the three site rows 51, 44 and 44 pt; About `1.0.0 (8)` and its rows 44 pt each; the
   shut door's Allow line, none under the held door; the v:4 and v:2 sentences), SE8 on 18.3.1, SEP the parent (the camera at
   once, no Privacy, "That is not a Tortie pairing code." for a v:4 code, no note under the shut door), Q1, N10, K2, MD3, RUN,
   0 Electron and 0 `p316-` Simulator left.
2. **`probe:p3332` (major): the stopped fixer's edits, kept.** Every finite animation on the page ends before a reading
   (`settleAnimations`, run in the page, recorded as `settled`), the code is read back at the first reading's width AND height,
   CMP refuses a code reading taken at another height, the key row's text column may grow downward and nothing else (`GROWS`),
   and the group labels are compared by their words in order, the parent's less "Pair a phone", never by key. Self-test 39
   clauses. Run parent then HEAD three times: every arm read at both builds and CMP PASS three of three (the stopped fixer's own
   four runs read the same). Every one of the 54 readings of the six launches recorded `settled` `{polls 0, finished 0}`:
   nothing was sliding when it was read.
3. **Copy link (minor): the stopped fixer's change replaced.** It had made `approvalOpens` refuse every text whose `new URL`
   serialization differs from it. That narrows what Tortie OPENS, and the real approval page's spelling was never recorded (the
   stand-in prints a made-up one, §2.2 O3), so a real link spelled any other way would lose its Approve button: a scenario
   worse than today. Instead `approvalOpens` is the parent's byte for byte, and Copy link writes `approvalCopyText(link)`, one
   function in `funnel.ts`: null unless `approvalOpens` passes, else `new URL(link).href`, kept only when it begins
   `https://login.tailscale.com/`, so every parser ends the authority at that slash. The backslash form is copied as
   `https://login.tailscale.com/@evil.example/f/funnel`; the link Tailscale prints is copied byte for byte. `funnel.test.ts`
   (the finding, 23 hostile spellings each copied as `new URL` spells it and read by RFC 3986 as login.tailscale.com, 15
   refused ones copied as nothing) and `p3331-setup.test.ts` (four printed spellings listed and written canonically, one
   refused, the real one as printed) drive it; `SU3` reads that `writeClipboard` is handed `approvalCopyText(this.adminLink)`
   and reads the function's three statements; `ablation:p313` `SU41` (the printed text written), `SU41b` (the function answers
   the text) and `SU41c` (it asks no `approvalOpens`), each red on SU3 and on `setup` or `funnel`. The independent check: the
   SHIPPING two functions extracted from `funnel.ts` with the TypeScript parser and run over 7,186 generated spellings, 3,286
   of which open and the same 3,286 copy; Python's `urllib.parse.urlsplit` reads every copied link as login.tailscale.com
   (0 of 3,286 otherwise), where the printed text was read as another host in 39 (evil.example in 2, no host at all in 21).
4. **`probe:p3321` H7 (minor): the stopped fixer's edit, kept.** app.log is one JSON object a line and H7 reads each line by its
   `msg` (`logLines`), and scans it for a leak without its `ts` and `pid`; four more refused fixtures. At HEAD H9, H7, H8 and RUN
   PASS, 3 min 39 s, with the load average reaching 107. The kept log's two verdict lines, re-derived by `JSON.parse`, are "no:
   nxdomain" then "yes: record".
5. **Nit, `readOnReturn`'s own last-press check: the stopped fixer's edits, kept.** Two cases in `p3331-return.test.ts` (an off
   press while a return's read is out, over a public port of 0 and over a held stored port), the clause in `SU1`, and
   `ablation:p313` `SU40`, red on SU1 and on `return`.
6. **Nit, the name note on the live face: not fixed**, for the fix round's reason (item 10): hiding its words moves the R9
   grader and the rectangles three probes hold. The decision is the backlog's to record.

**The fix's numbers (2026-10-08, every shell with a scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, `TERM_SESSION_ID`
unset).** typecheck 0. `npm test` 1,121 files (1,119 passed, 2 skipped), 20,810 tests, 20,796 passed and 14 skipped, 82 s.
`npm run build` 0 (electron 171 of 171, background 544, simulator 2, knownhosts 572, checks 264, ios 46 rules, the contract byte
for byte). `conformance:pocket` 136 rules, 19,642 checks; `conformance:pocket:hostile` 270 arms, 16.6 s; `conformance:ios` 46
rules; `conformance:phonecopy` 19 screens, 604 segments, 101 owned rules (floor 101), 9 named controls (floor 9);
`conformance:push` 26 rules, 2,381 checks; `gate:contract` (the baseline moved by exactly `pocket:recheck`,
`pocket:setupAction` and the count, 246 to 248), `gate:checks` 264, `gate:electron` 171 of 171, `gate:background`,
`gate:simulator` 0. `ablation:p313` 484 of 484 arms red on their own rule (`SU40` to `SU41c` among them), 4,687.6 s, the
worktree never written. `ablation:p316` 419 of 420 red in its full run, 1,929 s at a load average between 100
and 720; the one, `c1`, printed no verdict, the gate having thrown at its own plutil self-test (line 6931, unchanged since the
parent), and run again alone it went red, 18 s. Self-tests: `probe:p3331` 29 graders, 143 clauses, 244 checks; p330 103
clauses; p332 64; p3321 54; p3332 39; p316 every group PASS and its setup group 57 cases; the stand-in 48; `test-ios.mjs` 72;
`vectors.mjs --check` 0. `CSC_IDENTITY_AUTO_DISCOVERY=false npm run package` 0, 91 s, the bundle holding `pocket:recheck`,
`pocket:setupAction` and `approvalCopyText`, `release/` (844 MB) removed. Lock slots held only for the Electron and Simulator
runs and released; 0 `p316-` Simulators and 0 booted at the end; this fixer's DerivedData removed. His shell history read
`735939 1791483475` (zsh) and `23166 1790702242` (bash) before and after every command that started a shell, a Simulator or the
app, and never moved.
