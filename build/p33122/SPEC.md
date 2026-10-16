# Phase 333.12.2 — a second Allow must never leave a door answering behind a refused face — SPEC

Written by the spec step on 2026-10-15 in `/private/tmp/wt-p33122`, a detached worktree at origin/main `69c3bd5a`
("docs(backlog): 333.12.1 landed"), which holds Phase 333.12 (`786ee1c6`) and Phase 333.12.1 (`2aff4e4a`). Every
`file:line` below is read at `69c3bd5a`. The release measured beside it is `v0.111.1` (commit `b97d3b85`).

**The spec step MEASURED before it wrote** (§12 holds every command, exit code and number). It drove the SHIPPING
`PocketHost` under the pinned tsx (4.23.12) with a stand-in `electron` module (a scratch userData and a reversible seal,
no keychain), the door process run in-process through the shipping `src/main/pocket/door/in-process.ts`, and Funnel as
the REAL Phase 330 Tailscale stand-in (`build/p330/tailscale-standin.mjs`) spawned as a child process through the
shipping `defaultFunnelDeps()`. Fourteen sequences, each at `69c3bd5a` and at `v0.111.1`, each in its own process. Then it
built the worktree and ran ONE Electron of it under THE LOCK, through `build/electron-run.mjs` inside
`build/harness-socket.mjs`, with the Tailscale and DNS stand-ins and the hidden agents renamed, and pressed the sheet's
own Allow with real `Input.dispatchMouseEvent` input. Then it put the mechanism below into a SCRATCH COPY of `src/`
(never this worktree) and ran the same fourteen sequences, `conformance:pocket` and the 77 pocket, harness and settings
test files over it. No model turn, no agent, no real Tailscale, DNS or APNs, nothing under `~/.ssh`, `~/.claude`,
`~/.codex`, `~/Keys`, his keychain or his live Tortie profile. His two history files never moved (§12).

**What it found, in one paragraph.** `confirmDoor` queues a start whenever the door is on and not yet PUBLISHED
(`src/main/pocket/ipc.ts:2309-2312`), and `published()` (`:930-932`) only turns true once a start has adopted its Funnel
child inside the queue. So N confirms that arrive before the first start publishes queue N starts. The second start runs
after the first published: its Tailscale read sees the port held by the door's OWN child (`portsHeld(read.serve)` is
asked with no exception, `:1363`), it refuses `port-taken` and sets the funnel `idle` (`:1364-1368`), and from then on
`published()` reads false while the door process listens and the Funnel child publishes. Main reads `refused`, the
refusal says "Tailscale on this Mac already uses port 8443 for something else", and the app log says "the phone door did
not open: port-taken" 66 ms after "the phone door is published". The sheet then draws Try again: pressing it moves the
public port to 10000 (the read counts its own child's 8443 as somebody else's), the gate reads `changed` and its sentence
says "Nothing is listening" while the door process and the 8443 child both answer. The sheet then draws Allow: pressing
it spawns a SECOND Funnel child on 10000 beside the first, and switching the door OFF ends the door process and the
10000 child and leaves the 8443 child running, publishing, with the switch off, until Tortie quits. Every one of those
readings is the same at `v0.111.1`. A PERSON'S MOUSE CANNOT START IT: a real double click, four mouse events at once, and
a click where Allow was while the start waited all sent ONE Allow (§3). Two programmatic `click()` calls in one task and
two calls of the bridge did.

Read with it, whole: `docs/BACKLOG.md` "## Phase 333.12.2" (`:42427`); build/p33312/SPEC.md's last §As built and its fix
round (`:889-1090`); `src/main/pocket/ipc.ts` (the switch's queue `:1114-1225`, `openNow` `:1303-1491`, `recoverNow`
`:1541-1562`, `unpublish` `:1618-1632`, `openAtLaunch` `:1680-1695`, `setDoor` `:2012-2101`, `readAtPress` `:2108-2133`,
`confirmDoor` `:2270-2333`); `src/main/pocket/bind.ts` `startPocketDoor` (`:587-614`); `src/main/pocket/funnel.ts`
`portsHeld` (`:596-616`), `sweepFunnelOrphan` (`:985-1022`), `startFunnel` (`:1312-1343`); `src/renderer/settings/
PhoneSection.tsx` (`run` `:1238-1252`, the confirm block's Allow `:865-875`, `confirmDoor` `:1313-1323`);
`src/renderer/settings/phone/steps.ts` (`doorNeedsConfirm` `:106-113`, `publishRow` `:361-417`);
`build/conformance-pocket.mjs` L5 (`:2677-2810`) and Q1 (`:3066-3247`); `build/ablation-p313.mjs` (its header, `CHECKS`
`:313-350`, the arms on `IPC`); `src/main/pocket/__tests__/p3331-return.test.ts` (the in-memory world every new test here
copies, `:150-360`).

**The order of authority.** His word (none yet on this phase), then the backlog entry, then the main session's task
text, then this file. The tree at `69c3bd5a` overrides any picture of it here. §Attack, at the end, records what this
file's own attack changed, including the three places it departs from the entry's wording (D1, D5, D9) and the one
place it widens the entry by a press the entry did not name (D4).

---

## 0. The hard rules, stated once

- **No phone code moves.** Nothing under `ios/**` or `build/p316/**` is edited (Phase 345 is building there in another
  worktree). No phone build number moves; `node build/p316/vectors.mjs --check` stays byte for byte (inside `npm run
  build`).
- **No door route, field, hash or IPC channel moves.** `POCKET_ROUTE_IDS`, R4's pin, `sha256-pocket-exec-v3`,
  `PocketStatus` and `docs/audits/contract-baseline.txt` stay as they are; `gate:contract` proves the last.
- **Nothing under `src/renderer/` moves** (D7), and **`src/main/harness/push-seam.ts` is not edited** (it owes
  `probe:p314`, which runs real agents and model turns).
- Nobody commits, stages or stashes. `/Users/gdc/gmux` is read only. Every shell command begins
  `cd /private/tmp/wt-p33122 &&` or works in the role's scratch,
  `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p33122/<role>/`. Heredoc
  delimiters are quoted. `git diff 69c3bd5a` is exactly this phase's delta. Install nothing.
- Never `-L gmux` and never the default tmux server. Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end
  only pids you started. His keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex` and live Tortie profile
  are never read. **No model turn.** Never start gemini, qwen, agy or grok (`build/hidden-agents.mjs` before any launch).
- **His shell history**: before and after every command that starts a shell or the app, record ONLY
  `stat -f '%z %m' ~/.zsh_history ~/.bash_history`; his own sessions may move it, so a move ACROSS one of your commands
  is the stop. Any shell a test starts runs with a scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null` and
  `TERM_SESSION_ID` unset.
- **No real Tailscale, DNS or APNs.** Never import a `build/` script to inspect it (`node -e 'import(...)'` runs it):
  read it as text. No screenshot.
- **Builders and the integrator launch no Electron.** Every Electron goes through `build/electron-run.mjs` inside
  `build/harness-socket.mjs`, killed in a `finally`. THE LOCK has three slots: `zsh /private/tmp/tortie-ops/lock.sh try
  p33122` (prints the slot or exits 1; retry every 60 s in a NEW command), released with `zsh /private/tmp/tortie-ops/
  lock.sh release <dir>` on the same command line. **Disk**: `df -h /` before any parent build or package; under 8 GB
  free, wait and report.
- **His rule: no scenario worse than today.** Every behaviour that changes is compared with the parent in §9.

---

## 1. The answer first

One Allow starts the door once, however many arrive, and no start ever runs over a door that already has its Funnel
child:

1. **A confirm starts nothing while a start is queued or running** (D1). `PocketHost` counts its starts (`starts`), and
   `queueStart()`, the one way a confirm starts the door, returns while one is in flight. The start in flight asks the
   gate after its Tailscale read and again at its end, so it opens whatever the confirm recorded.
2. **A start that finds the door's child already adopted does nothing** (D2, D3). `openNow`'s first statement answers
   the new outcome `'held'` while `this.run !== null`, before it reads, forks, spawns or writes anything, and the two
   jobs that write the funnel's state after `openNow` leave it alone on `'held'`. This is what covers the starts D1
   cannot see: a confirm's start queued behind a Try again, a return or the launch's own start.
3. **A press that replaces a restart ends what the restart would have ended** (D4). When the door process died under a
   live child and the person (today: only the bridge) presses the switch on before the restart fires, the press ends the
   adopted child and then the door process before it reads Tailscale, as `recoverNow` does, so the read never counts the
   door's own child as somebody else's and never moves the port over it.
4. **A start that loses ends what it made, the Funnel child first and the door process second** (D5). That is already
   true of every losing path in `openNow`; this phase pins it and does not reorder it.

Nothing a person sees moves. The sheet already sent one Allow per press (§3); the fix is main's, which is the one place
that can count starts.

### 1.1 The decisions, each with its reason

| # | Decision | From |
| --- | --- | --- |
| D1 | **One start in flight.** `PocketHost` gains `private starts = 0`, written only by `start()`: `this.starts += 1` beside `this.opening += 1` before its first await, `this.starts -= 1` in the `finally` of the `try` that holds `await this.serially(`. `queueStart()`'s first statement is `if (this.starts > 0) return;`. It applies to EVERY confirm, not only one "whose hash is already recorded" (the entry's words): the start in flight asks the gate after its read (`openNow` steps 5 and 6, `:1327-1347`) and again at its end (`closeNowUnlessConfirmed`, step 13, `:1485`), so a confirm of a new hash is opened by it too, and a second start for it is exactly the double start. The counter is NOT `opening`: `opening` also counts a return's job (`recheck`, `:1202`), which may decline to open (a return never starts again what Tailscale has not approved, `:1337-1343`), so an Allow pressed while a return is queued would start nothing; today the return yields to the confirm's start (`rechecks(1)`'s `(c)`) | entry step 2; §Attack A1, A2 |
| D2 | **A door that has its child is not started again.** `type OpenOutcome = 'published' \| 'stopped' \| 'retry' \| 'held'` (`:473`), and `openNow`'s FIRST statement is `if (this.run !== null) return 'held';`, before the last-press check, the gate, the sessions, the orphan sweep and the read. `this.run` is set only by the counted start's `adopt` (`:1494`) and cleared by `unpublish` and by the child's unasked exit, so inside the serial queue nothing else can adopt a child between this question and the fork. In the guard's place rather than in `start()`, because `openNow` is the one door every fork and spawn passes (L5) | entry step 2 ("any start that loses a race"); measured (§2.2 rows 1, 8, 11, 13) |
| D3 | **A start that made nothing writes nothing.** `start()`'s funnel write becomes `if (outcome !== 'published' && outcome !== 'held' && this.funnelState !== 'restarting') this.funnelState = 'idle';`, and the return's job's (`:1211`) the same. That `idle` written over a published door IS the defect: `published()` asks `funnelState === 'publishing'`. `setDoor`'s job keeps `if (outcome !== 'published') this.setFunnel('idle');` byte for byte, because D4 ends any adopted child before its read, so its `openNow` never answers `'held'`; `recoverNow` unpublishes before its `openNow` (`:1546`), so neither does its | measured; keeps `ablation:p313` SU34's anchor |
| D4 | **A press that replaces a restart ends the child first.** In `setDoor`'s on job, straight after `this.cancelRestart();` (`:2085`): `if (this.run !== null) await this.unpublish();`, before `readAtPress`. `unpublish` stops the child, then the door process, and keeps the pairing window (`:1618-1632`), which is what `recoverNow` does before its own start. Without it, a door process that died under a live child (restart armed) plus a switch-on press moves the public port to 10000 over the door's own child and cancels the restart, leaving the child publishing behind `changed` (§2.2 row 10, both builds, persisting past the restart's time). Bridge only today: the sheet draws no switch-on press and no Try again while the face reads `opening` | the walk's invariant (§7.2) must hold with deaths in its alphabet; §Attack A7 |
| D5 | **A losing start ends what it made, CHILD FIRST, then the door process, before it returns.** Already true: `startFunnel`'s own `finally` stops its child unless it published (`funnel.ts:1340-1342`), then `openNow`'s `finally` stops the door process (`:1473-1479`); a start superseded after its fork and before its spawn stops the door process (`:1389-1394`). The entry says "ends the process and child it made, in that order"; this phase keeps the child first, because the child is what carries the internet, and "a child alive while its door process is gone" is precisely the published-to-nothing state this phase measured as the leak (§2.2 row 10 and the off at the end of row 1). Nothing is reordered; `Q2` (i), arm `Q2h` and row O12 pin it | `unpublish`'s own rule (`:1618-1622`); §Attack A8 |
| D6 | **The check lives inside `queueStart`**, so every caller of `queueStart` is behind it by construction (the entry's rule), and `start()` is reached only from `queueStart` and `openAtLaunch`. `openAtLaunch` keeps calling `start()` directly (it awaits its outcome to answer `opened`/`refused`); it counts itself in `starts`, and D2 holds its start if a bridge Allow's start published first (§2.2 row 8) | entry mechanism 3 |
| D7 | **The sheet does not change.** Measured in the real app (§3): a person's double click, four mouse events at once, and a click where Allow was during `opening` each sent one Allow, because `run()` sets `busy` inside the click (`PhoneSection.tsx:1238-1252`), Allow is disabled while `busy` or while main says `opening` (`:869`), and the block is not drawn on a confirmed door (`steps.ts:106-113`). Only two programmatic `click()` calls in ONE task (not a person) and the bridge sent two. Main is the one place that counts starts | measured; refusal 4's spirit (the sheet decides nothing) |
| D8 | **Patch, Mac only, NO CHANGELOG item.** The entry: "CHANGELOG item only if the spec finds a person could meet it". A person's mouse could not (D7). The commit body says so, with §3's numbers. Subject `fix(pocket): one Allow starts the door once, however many arrive`; first body line `Phase 333.12.2: no door behind a refused face` | entry; CLAUDE.md release-notes rules |
| D9 | **The parent is `69c3bd5a`.** The entry says "beside 786ee1c6" because it was written before 333.12.1 landed; `69c3bd5a` holds `786ee1c6` and `2aff4e4a`, nothing between them touches the start path, and every reading here is identical at `69c3bd5a` and at `v0.111.1`. The verifier measures `69c3bd5a` | CLAUDE.md "measure the parent commit" |
| D10 | **The walk is this phase's own, committed and seeded.** The reverify's 60,000-press walk lived in its scratch, which 333.12's landing cleanup removed: no copy under `build/p33312/`, no seed recorded anywhere this step may read. So `src/main/pocket/__tests__/p33122-walk.test.ts` is written here (§7.2), seed `333122`, a short default inside `npm test`, `P33122_WALK_PRESSES=60000` for the verifier, and it must be shown RED at the parent before it is believed green at HEAD | entry's proof; §Attack A11 |
| D11 | **One rule, `Q2`, and eight arms**, `Q2a` to `Q2h`, with a new driven check `onestart` (`p33122-one-start.test.ts`) in `build/ablation-p313.mjs` (§6) | entry mechanism 3 |
| D12 | **No committed probe.** The app run is the verifier's own independent method; this step's scratch app run (§12 M6) is a reference it may start from. So no `package.json` script, no `build/verification-checks.mjs` row and no `HELPER_USER_FLOOR` change (175 stays) | §Attack A10 |

---

## 2. The defect, measured

### 2.1 How it was measured

Every sequence ran in its own process: `node <tsx cli> --tsconfig <scratch tsconfig> measure.mts`, the tsconfig mapping
`@shared/*` to the measured tree's `src/shared/*` and `electron` to a scratch stand-in module, `P33122_ROOT` naming the
tree (`/private/tmp/wt-p33122` at `69c3bd5a`, or a `git archive v0.111.1 src` extraction), a fresh userData and a fresh
Tailscale stand-in directory per run. The host is `new PocketHost({ facts, names: fakeNameDeps({ sleep: 'now' }),
door: inProcessDoor(), onResume })` with NO `tailscale` dep, so Funnel is `defaultFunnelDeps()`: the real stand-in
program spawned as a child, the real `/bin/ps`, the real record file. After each step the run settled the queue and read
`status()`, `pocketDoorStatus()`, the stand-in's own live funnel entries (by pid, with `ps`), a TCP connection through
each live entry's forwarder counted by the in-process listener's own `stats().connections`, `liveFunnelCountForTests()`,
and how many door processes had been started. A reading is a VIOLATION when, with no start in flight and the face not
saying Tortie is trying again (`funnel.state !== 'restarting'`), the door process listens or a Funnel child lives while
`status().state` is not `listening`. Row 11's violation is read with a restart still armed underneath: the face had
already been turned to `refused`, which is the lie.

### 2.2 The table (identical at `69c3bd5a` and `v0.111.1`, and the prototype of §4)

| # | Sequence | 69c3bd5a | v0.111.1 | Prototype |
| --- | --- | --- | --- | --- |
| 1 | The reverify's: on, Allow, alerts on, two Allows in one tick | `refused`/`idle`/`confirmed`, door listening, child 16518 alive and reached through its forwarder: VIOLATION. Then Try again: port 8443 → 10000, `changed`, "Nothing is listening", door and child still answering: VIOLATION. Then Allow: TWO children, 8443 and 10000, `liveFunnelRuns` 2. Then off: state `off`, the 8443 child still alive and its forwarder accepting: VIOLATION; the run's own teardown had to end pid 16518 | the same (child 18562) | `listening`, one child; Try again leaves the port at 8443 and one child; off leaves nothing |
| 2 | First setup, two Allows in one tick | VIOLATION (`refused`, refusal "Tailscale on this Mac already uses port 8443 for something else.") | the same | `listening`, one child |
| 3 | Three Allows in one tick | VIOLATION | the same | `listening` |
| 4 | Ten Allows in one tick | VIOLATION; 23 Tailscale reads by the stand-in's own log | the same, 23 | `listening`; 5 reads |
| 5 | An Allow while the first start waits on approval (`caps: false`, `approval: wait`) | the second answers `allowed`, state `opening`; after approval VIOLATION | the same | `listening`, one child |
| 6 | Allow and Remove in one tick (two phones, alerts on) | `listening` (333.12's narrowing) | `refused`, `never` (no narrowing), then Allow `listening` | `listening` |
| 7 | Allow and alerts off in one tick, then alerts off and two Allows | `listening`; the stale second Allow throws "changed after it was shown" and records nothing | `refused`/`changed`; the same throw | as 69c3bd5a |
| 8 | Stop, a new host, `openAtLaunch()` and a bridge Allow of the recorded hash during it | launch answers `refused`; VIOLATION | the same | launch `opened`; `listening` |
| 9 | The child dies unasked (SIGKILL by pid), a bridge Allow before the restart | `listening` (the start joins the live door process); the restart cancelled | the same | the same |
| 10 | The DOOR PROCESS dies unasked, Try again before the restart | port → 10000, `changed`, the old child alive with no door process, restart cancelled: VIOLATION, still there 3 s later | the same | `listening` at 8443, the old child ended first, one child |
| 11 | The door process dies unasked, a bridge Allow before the restart | `refused`/`idle` with the port-taken sentence about its own child: VIOLATION until the restart fires 2 s later | the same | `opening`/`restarting` (honest), then `listening` |
| 12 | The child dies unasked, Try again | `listening` | the same | the same |
| 13 | Stop, then Try again and a bridge Allow in one tick | VIOLATION (the switch's job published; the confirm's start hit its own port) | the same | `listening` |
| 14 | Control: one Allow | `listening`, one start | the same | the same |

Rows 6 and 7 differ between the builds by Phase 333.12's design (Remove of one of several phones, alerts off) and not by
this defect; neither has a violation at either build.

### 2.3 Why each step happens, read from the tree

- `confirmDoor` asks only `this.readStore()?.enabled === true && !this.published()` before `this.queueStart()`
  (`ipc.ts:2309-2312`). The record is written synchronously and nothing is awaited, so N confirms in one tick are N
  starts; and a confirm arriving while any other job is about to publish is one more.
- `start()` (`:1167-1179`) runs `openNow(press)` with no question about a door that is already up.
- `openNow`'s orphan sweep leaves the door's own child alone ("A child of THIS run is not an orphan", `funnel.ts:993`),
  then `portsHeld(read.serve)` (`:1363`) counts that child's foreground session as a port somebody else holds, and the
  start refuses `port-taken` with `this.setFunnel('idle')` (`:1364-1368`).
- `published()` (`:930-932`) is `this.run !== null && this.run.alive && this.funnelState === 'publishing'`, and
  `status()`'s `listening` is `door.listening && this.published()` (`:954`). One `idle` write turns a published door into
  a refused face; nothing turns it back, and `pairable()` (`:1927-1933`) answers no, so no code can be shown.
- `readAtPress` (`:2108-2133`) chooses the stored port "while it is free" by the same `portsHeld`, so the door's own child
  makes a Try again move the port and write it, which moves the hash.
- `startPocketDoor` JOINS a door process that is already listening (`bind.ts:597`), so the Allow after that spawns a
  second child against the same door process; `adopt` replaces `this.run` (`:1494-1502`) and nothing ends the first
  child but the quit's join over `funnel.ts`'s `live` set. Its record file holds one record, rewritten by the second
  child's `run.record()` (`funnel.ts:1205`), so after a crash the next launch's orphan sweep would find only the second.
  That last sentence is read from the code, NOT measured.

---

## 3. Can the sheet send the second Allow? Measured in the real app

One Electron of this worktree's own build (`npm run build` at `69c3bd5a`, exit 0, 43 s), under lock slot
`electron.lock`, launched by a scratch script through `withElectron` inside `node build/harness-socket.mjs --fresh
gmux-p33122 …` (socket `gmux-p33122-wt-p33122-87129`), 26 s in all. The Tailscale stand-in preflighted by sha256 and
sampled (no real Tailscale seen, nothing forbidden), the DNS stand-in in the script's own process, the hidden agents
renamed and read back from `agents:list`. Each arm began from a door that was on and never agreed to
(`window.gmux.pocket.forgetDoor()`), so Settings then Phone drew the confirm block with Allow enabled. A start was
counted by the stand-in's own log (one `funnel` argv line per spawn, one `status` line per start's read). The door
process was read by pid as a `node.mojom.NodeService` descendant of the app whose environment names `TORTIE_DOOR`.

| Arm | Press | Allows main acted on | End |
| --- | --- | --- | --- |
| S1 | A real double click on Allow: `mousePressed`/`mouseReleased` at clickCount 1, then at clickCount 2, each awaited | 1 start, 1 read. Allow read `disabled: true` straight after | `listening`, door pid 89497, child 89502 |
| S1b | The same four events sent at once, none awaited | 1 start, 1 read | `listening` |
| S2 | Allow with the start held on approval, then a real click where Allow was while the face read `opening` | 1 start, 1 read. No Allow was drawn while `opening` (`present: false`) | `listening` after approval |
| S3 | NOT A PERSON: `b.click(); b.click();` in ONE task | 1 spawn, 2 reads: two Allows reached main | `refused`, "already uses port 8443", door 90176 and child 90180 alive: VIOLATION |
| S4 | THE BRIDGE: two `window.gmux.pocket.confirmDoor` in one tick | 2 starts, 4 reads | `refused`, door 90355, child 90361: VIOLATION |
| S4, then | the sheet's OWN Try again, clicked | | port 10000, `changed`, "Nothing is listening", door 90355 and child 90361 still up: VIOLATION |
| S4, then | the sheet's OWN Allow, clicked | | `listening` with TWO children, 90361 on 8443 and 91395 on 10000 |
| S4, then | the switch off | | `off`, no door process, child 90361 STILL ALIVE: VIOLATION. `build/electron-run.mjs`'s tree teardown was what ended it |

So a person's mouse sends one Allow per press; once two Allows have reached main some other way, the sheet's own Try
again and Allow walk the door into the worse state. The keyboard (Enter held on the focused Allow, key repeat) was not
measured here and is the verifier's (§9.3).

---

## 4. The mechanism

### 4.1 The prototype that proved it

The scratch copy at
`/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p33122/spec/proto/` holds
`69c3bd5a`'s `src/` with exactly D1 to D4 applied to `src/main/pocket/ipc.ts` (14 lines added or changed, and nothing else under `src/`: `diff -rq` names that one file; §12 M9). Over it:
the fourteen sequences read 0 violations (§2.2's last column); `node build/conformance-pocket.mjs` PASS, 152 rules,
20,743 checks (HEAD reads 152 rules and 20,725 checks); and `vitest run src/main/pocket src/main/harness/__tests__
src/renderer/settings` PASS, 77 files, 2,684 tests, 9 s. No existing test or rule had to change. The builders write it
again in the worktree, with its comments, to §5's text.

### 4.2 What each change answers

| Change | Rows of §2.2 it fixes | Without it |
| --- | --- | --- |
| D1 `starts` and `queueStart`'s check | 2, 3, 4, 5 (and the count of reads in 4) | D2 alone still answers rows 2 to 5 as `listening`, but a first start that is REFUSED is followed by every queued start reading and spawning again (row O2b in §7.1) |
| D2 the held guard and D3 the writes | 1, 8, 11, 13 | D1 cannot see a confirm's start queued behind a Try again, a return or the launch's start |
| D4 the press ends the adopted child first | 10 | the press reads the door's own child as somebody else's port |
| D5 (no change) | the off at the end of row 1 never arises, because a second child never does | |

---

## 5. What each file says (builder **core** owns all of §5)

All in `src/main/pocket/ipc.ts`. The statements below are the text the gates and the ablation arms anchor on, so they
are written exactly as here, indentation included. Comments may be worded freely but each new statement keeps its own
line, and no new statement goes between two lines this section quotes together.

### 5.1 The outcome (`:472-473`)

```ts
/**
 * What one start came to. `retry` is a refusal a restart may try again.
 * `held` (Phase 333.12.2, D2): the door already has its Funnel child, so this
 * start did nothing and wrote nothing.
 */
type OpenOutcome = 'published' | 'stopped' | 'retry' | 'held';
```

### 5.2 The counter (`:496-498`)

```ts
  /** Door jobs queued or running that may start the door. */
  private opening = 0;
  /**
   * STARTS queued or running (Phase 333.12.2, D1), counted by start() alone.
   * Not `opening`: a return's job counts there too, and a return may decline.
   */
  private starts = 0;
```

### 5.3 `start()` and `queueStart()` (`:1163-1184`)

```ts
  async start(): Promise<void> {
    const press = this.lastPress.press;
    this.opening += 1;
    this.starts += 1;
    try {
      await this.serially(async () => {
        const outcome = await this.openNow(press);
        if (outcome !== 'published' && outcome !== 'held' && this.funnelState !== 'restarting') this.funnelState = 'idle';
      });
    } finally {
      this.starts -= 1;
      this.opening -= 1;
      this.changed();
    }
  }

  /** The same start, queued and not awaited: the IPC answer never waits on it. */
  private queueStart(): void {
    // ONE START IN FLIGHT (Phase 333.12.2, D1): ...
    if (this.starts > 0) return;
    void this.start();
  }
```

`start()`'s doc comment gains one sentence: a start queued while another is queued or running is not queued at all
(`queueStart`), and the launch's start, which calls `start()` itself, is held by D2 if a door is already up.

### 5.4 The return's job (`:1209-1212`)

```ts
          const outcome = await this.openNow(press, 'start', { returned: true });
          if (outcome !== 'published' && outcome !== 'held' && this.funnelState !== 'restarting') this.funnelState = 'idle';
```

### 5.5 `openNow`'s first statement (`:1303-1310`)

```ts
  ): Promise<OpenOutcome> {
    // 0. A DOOR THAT ALREADY HAS ITS CHILD IS NOT STARTED AGAIN (Phase
    // 333.12.2, D2): ...
    if (this.run !== null) return 'held';
    // 1, 2.
    if (this.superseded(press)) return 'stopped';
```

The method's doc comment gains the step: asked FIRST, before the press, so a held door writes nothing whatever the press.

### 5.6 `setDoor`'s on job (`:2083-2086`)

```ts
        // A person's press replaces a restart that was waiting its turn.
        this.cancelRestart();
        // ... (Phase 333.12.2, D4)
        if (this.run !== null) await this.unpublish();
        if (!(await this.readAtPress(press))) return;
```

`setDoor`'s `if (outcome !== 'published') this.setFunnel('idle');` and the three lines `ablation:p313` SU34 anchors on
stay byte for byte (D3).

### 5.7 The module header

One more section after "The switch handles ONE PRESS AT A TIME": `## One Allow starts the door once (Phase 333.12.2,
build/p33122/SPEC.md)`, saying D1 to D5 in five sentences, and that a person's mouse could not send two (§3).

### 5.8 Not changed

`confirmDoor` (its guard `enabled && !this.published()` before `this.queueStart()` stays), `recoverNow`, `unpublish`,
`closeNow`, `readAtPress`, `readOnReturn`, `openAtLaunch`, `bind.ts`, `funnel.ts`, `server.ts`, `writes.ts`, every
shared type, the renderer. A confirm still records, still writes the allowed set and still posts the served set while a
start is in flight (Phase 333.12's D9 and D22): it only starts nothing more.

---

## 6. The gates that move, on purpose (builder **gates**)

### 6.1 `conformance:pocket` (`build/conformance-pocket.mjs`): one new rule, `Q2`

Declared in the rule table beside `Q1` (`:244`), its code literals (`'held'`, `'published'`) spelled as the table's other
rule strings spell theirs:

```
['Q2', 'build/p33122/SPEC.md D1 to D6; CLAUDE.md refusal 8', 'ONE START, HOWEVER MANY ALLOWS: PocketHost declares starts once, initialised to 0, and start() alone writes it, this.starts += 1 before its first await and this.starts -= 1 in the finally of the try that holds await this.serially(; queueStart()’s first statement is if (this.starts > 0) return; and its only other statement is void this.start();; this.queueStart( is called only in confirmDoor and this.start( only in queueStart and openAtLaunch; OpenOutcome names held; openNow’s first statement is if (this.run !== null) return ’held’;; the funnel write after openNow in start() and in recheck()’s job names outcome !== ’held’ beside outcome !== ’published’; setDoor’s on job awaits this.unpublish() under this.run !== null as the statement right after this.cancelRestart() and right before its readAtPress(; recoverNow awaits this.unpublish() before its openNow(; and a losing start ends its child before its door process: startFunnel’s finally awaits run.stop() unless published, and the finally of openNow’s try around startFunnel( awaits stopPocketDoor() under outcome !== ’published’'],
```

The function (`oneStartRule()`), read with the TypeScript parser and the file's existing helpers (`moduleNamed`, `methodOf`,
`callsOf`, `calleeName`, `enclosingName`, `codeOfNode`, `squash`, `statementBefore`), one `checked('Q2', …)` per clause
and a `fail('Q2', …)` sentence that says what a person would meet:

| Clause | Reads | Red when |
| --- | --- | --- |
| (a) the counter | `PocketHost`'s property declarations; every `this.starts` assignment or compound assignment under `src/main/**` (tests excepted) | no `starts` field, more than one, an initialiser that is not `0`, a write outside `start()`, the `+= 1` after `start()`'s first `await`, or the `-= 1` not inside a `finally` whose `try` block contains `await this.serially(` |
| (b) the check | `queueStart`'s body statements | its first statement is not an early return whose condition squashes to `this.starts>0`, or it holds any statement but that and `void this.start();` |
| (c) the callers | every `this.queueStart(` and `this.start(` call in `ipc.ts`, by `enclosingName` | a `queueStart` call outside `confirmDoor`, a `start` call outside `queueStart` and `openAtLaunch`, or zero calls of either (a zero is red: a rule that read nothing asserted nothing) |
| (d) the outcome | the `OpenOutcome` type alias | its union does not hold the literal `'held'` beside `'published'`, `'stopped'` and `'retry'` |
| (e) the held door | `openNow`'s first body statement | it does not squash to `if(this.run!==null)return'held';` |
| (f) nothing written | the statement right after `const outcome = await this.openNow(` in `start()` and in `recheck()`'s queued job | its condition does not name both `outcome!=='published'` and `outcome!=='held'` |
| (g) the press after a restart | `setDoor`'s queued on job's `try` block | the statement after `this.cancelRestart();` is not `if (this.run !== null) await this.unpublish();`, or the statement after that is not the one holding `this.readAtPress(` |
| (h) the restart | `recoverNow`'s body | no `await this.unpublish()` before its `this.openNow(` call |
| (i) child first | `startFunnel` in `funnel.ts`; the `try` in `openNow` whose block calls `startFunnel(` | `startFunnel`'s `finally` does not hold `if (!published) await run.stop();`, or that `try`'s `finally` does not await `stopPocketDoor()` under `outcome !== 'published'` |

`Q1` and `L5` stay byte for byte. Over the scratch prototype (§4.1) all 152 existing rules read green, so no existing
rule is widened. The rule count becomes 153.

### 6.2 `ablation:p313` (`build/ablation-p313.mjs`): eight arms and one driven check

One more entry in `CHECKS`, after `face`:

```js
  // PHASE 333.12.2 (build/p33122/SPEC.md §6.2): the one-start rows, DRIVEN over
  // the shipping owner, for the arms whose clause only an order of jobs shows.
  ['onestart', ['node_modules/vitest/vitest.mjs', 'run', '--no-cache', 'src/main/pocket/__tests__/p33122-one-start.test.ts'], { tag: 'onestart', relative: true }]
```

The arms, each `rule: 'Q2'`, each anchored on §5's exact text (or `funnel.ts`'s, for `Q2h`), each red on `Q2` and, where
named, newly red on `onestart` against the green base:

| Arm | File | The break | Also red | Why it matters (the `why` field) |
| --- | --- | --- | --- | --- |
| `Q2a` | `IPC` | `queueStart`'s `if (this.starts > 0) return;` deleted | `onestart` (O2b) | a refused first start is followed by every queued start reading Tailscale and spawning again; ten Allows read Tailscale 23 times (§2.2 row 4) |
| `Q2b` | `IPC` | `openNow`'s `if (this.run !== null) return 'held';` deleted | `onestart` (O1, O6, O7) | a start queued behind a Try again or the launch reads its own child's port as somebody else's and turns a published door into a refused face over a live door process and Funnel child (refusal 8) |
| `Q2c` | `IPC` | `this.starts -= 1;` moved out of the `finally`, after the `await` inside the `try` | none (text) | one start whose job throws would leave the count above zero for the rest of the run, and every later Allow would start nothing |
| `Q2d` | `IPC` | `setDoor`'s `if (this.run !== null) await this.unpublish();` deleted | `onestart` (O9) | a switch-on press after the door process died moves the public port over the door's own child and leaves that child publishing behind `changed` |
| `Q2e` | `IPC` | `start()`'s `outcome !== 'held' &&` deleted | `onestart` (O6, O7) | a held start writes `idle` over a published door, which is the defect itself |
| `Q2f` | `IPC` | the return's job's `outcome !== 'held' &&` deleted | none (text) | the same write, from a return |
| `Q2g` | `IPC` | `confirmDoor`'s `this.queueStart();` replaced by `void this.start();` | `onestart` (O2b) | a confirm that goes around the one-in-flight check is every confirm the entry names |
| `Q2h` | `FUNNEL` | `startFunnel`'s `finally` body `if (!published) await run.stop();` replaced by a comment | `onestart` (O12) | a start superseded during Tailscale's approval wait would leave its child publishing after the switch is off |

The header gains a paragraph, "PHASE 333.12.2 ADDED EIGHT (build/p33122/SPEC.md §6.2), 556 entries in all", naming the
arms and the `onestart` check. No existing arm moves: SU34's three lines stay byte for byte (D3), and the arms anchored
inside `openNow`, `recheck` and `setDoor` (L5a to L5e, L5b2, Q1a to Q1c, SU05, SU26, SU31, SU33, SU34) keep their
anchors, which the integrator proves by running them (§9.1).

### 6.3 `CLAUDE.md`

The `conformance:pocket` row gains one sentence after the Phase 333.12.1 sentence: "Since Phase 333.12.2
(build/p33122/SPEC.md §6) one Allow starts the door once: `Q2` holds the start counter `start()` alone writes, the
one-in-flight check as `queueStart()`'s first statement, its two callers, the `'held'` outcome as `openNow`'s first
statement and the two funnel writes that leave a held door alone, the press that ends an adopted child before it reads
Tailscale, and the child ended before the door process when a start loses; `ablation:p313` gained eight arms (`Q2a` to
`Q2h`) and a driven `onestart` check (`p33122-one-start.test.ts`), 556 in all." No other row moves; no probe row is added
(D12).

---

## 7. The tests

### 7.1 The directed rows, `src/main/pocket/__tests__/p33122-one-start.test.ts` (builder **core**)

The world is `p3331-return.test.ts`'s, copied (vi.mock is per file): the SHIPPING `PocketHost` over the REAL `../bind`
behind the same counting wrapper (`binds.entered`, the stop hold), the door process run in this process through
`../door/in-process`, and Funnel the in-memory `ts` stand-in with its held long sleeps (`releaseNewest`). Three additions,
each in this file only:

1. **tailscaled's rule** in `spawn`: a child asked for a port a live foreground session already holds writes
   `listener already exists for port <p>` to stderr and exits 1 (the pinned message `funnel.ts` classifies `port-taken`),
   as the Phase 330 stand-in and the real `tailscaled` do.
2. **a door wrapper** around `inProcessDoor()` that keeps every `DoorChild` it hands out, so a row can make one die
   unasked (`kill()` from the test, which `bind.ts` reads as an exit nobody asked for), and logs `door-kill` into one
   shared `order: string[]` whenever any `DoorChild` is killed.
3. **the order log**: `Child.kill` logs `child-kill <pid>` and the fake `exec` logs `exec <args[0]>` into the same
   `order`, so a row reads what happened before what.

And one helper, `oneDoorOrNone(one)`, the invariant §7.2 checks, asserted at the end of every row: (I1) the door process
listening or a child alive means `state === 'listening'` and `confirmState === 'confirmed'`; (I2) at most one child
alive, and `liveFunnelCountForTests()` equals that count; (I3) `listening` means the door process listens and exactly one
child is alive, on `status().publicPort`, forwarding to `127.0.0.1:<the door's local port>`; (I5) the refusal is never
`pocketFunnelSentence('port-taken', p)` while no port is held but by the door's own child.

| Row | Drive | Must read |
| --- | --- | --- |
| O1 | The reverify's: on, Allow, alerts on, then two `confirmDoor` of one status in one tick | after the two: 1 fork, 1 spawn, 1 `status` exec; `listening`, `confirmed`, funnel `publishing`, refusal null, one child. Then `setDoor({ on: true })`: `publicPort` 8443, no spawn, one child |
| O2 | A first setup, then two, three and ten `confirmDoor` of one status in one tick (three cases) | each: 1 spawn, 1 `status` exec after the Allows; `listening` |
| O2b | Two Allows in one tick while every Funnel start is refused (`ts.refuse` = the pinned not-approved message) | 1 spawn, 1 `status` exec after the Allows; `refused`, funnel refused `not-approved`; no child; the door process not listening |
| O3 | `ts.approval = 'wait'`; Allow; once the funnel reads `approval`, a second Allow | the second answers `allowed: true` with state `opening`; after `ts.approve()`: 1 spawn, `listening`, one child |
| O4 | Two phones paired, alerts on (`changed`); `confirmDoor` and `removePhone(B)` in one tick. Then the reverse: a fresh `changed` door, `removePhone` first, then an Allow over the lines read before it | first: `listening`, `confirmed`, one child. Reverse: the Allow throws INVALID_INPUT ("changed after it was shown") and records nothing; no child, the door process not listening |
| O5 | Alerts on (`changed`); `confirmDoor` and `setPushAlerts(false)` in one tick | `listening`, one child |
| O6 | On, Allow, `stop()`; then `setDoor({ on: true })` and `confirmDoor` of the recorded hash in one tick | 1 spawn since the stop; `listening`, funnel `publishing`, refusal null, one child |
| O7 | On, Allow, `stop()`; a NEW host on the same store; `openAtLaunch()` and, before awaiting it, `confirmDoor` of its status | the launch answers `'opened'`; 1 spawn since the stop; `listening`, one child |
| O8 | On, Allow; the door process dies unasked; an Allow of the recorded hash before the restart | no fork, no spawn, no `status` exec; `opening`, funnel `restarting`, refusal not the port-taken sentence. Then `releaseNewest(2_000)`: `listening`, one child, the first child closed |
| O9 | On, Allow; the door process dies unasked; `setDoor({ on: true })` before the restart | in `order`, the first child's `child-kill` before the press's first `exec status`; `publicPort` 8443 in the status and in the store; `listening`, one child; funnel not `restarting` |
| O10 | Control: the CHILD dies unasked; `setDoor({ on: true })` | `listening`, one child (today's reading) |
| O11 | Control: a first setup and ONE Allow | 1 fork, 1 spawn, 1 `status` exec; `listening` (today's counts byte for byte) |
| O12 | `ts.approval = 'wait'`; on, Allow; once the funnel reads `approval`, `setDoor({ on: false })` | in `order`, the start's `child-kill` before its `door-kill`; no child, the door process not listening, `liveFunnelCountForTests() === 0` |

**The rows that answer the defect must be shown RED at the parent** before they are believed green here: the
builder runs this one file in a scratch tree of `69c3bd5a` (`git -C /private/tmp/wt-p33122 archive 69c3bd5a src
vitest.config.ts package.json tsconfig.json tsconfig.node.json tsconfig.tests.json tsconfig.main.json
tsconfig.shared.json tsconfig.web.json tsconfig.preload.json | tar -x -C <scratch>/parent`, `node_modules` symlinked) and
reports which rows read red there and which green. O1, O2, O2b, O3, O6, O7, O8 and O9 must be red there (O2b because
the parent's second start reads Tailscale and spawns again after the first is refused, which is the one thing D1 alone
answers, so `Q2a` and `Q2g` name it); O4 and O5 read green there as well as here (§2.2 rows 6 and 7 had no violation at
either build), and so do the controls O10 to O12. Run as `node node_modules/vitest/vitest.mjs run --no-cache <file>`
with a scratch `HOME`.

### 7.2 The walk, `src/main/pocket/__tests__/p33122-walk.test.ts` (builder **walk**)

A seeded, model-based random walk over the SHIPPING `PocketHost`, the world of §7.1 copied (its three additions
included). It imports nothing this phase adds, so the same file runs unchanged at the parent.

- **The seed and the size**: `P33122_WALK_SEED` (default `333122`) into an inline 32-bit generator (mulberry32 or
  sfc32, written here); `P33122_WALK_PRESSES` (default chosen by the builder so the test takes at most 8 s on this
  machine, never under 400); the test's own timeout `Math.max(60_000, presses * 8 + 30_000)` ms. The choice of every
  action reads only the generator and main's answers, so one seed replays one walk.
- **The alphabet** (weights are the builder's, every one present):
  `on` (`setDoor({ on: true })`), `off`, `allow` (the status' own lines and hash), `allowN` (2, 3 or 10 copies in one
  tick), `allowStale` (lines read before the previous action; a throw is caught and counted), `alertsOn`, `alertsOff`,
  `pair` (through the shipping window while `pairable`, at most three phones), `remove` (a paired phone), `recheck`,
  `onAndAllow` and `allowAndRemove` and `allowAndAlerts` (each pair in one tick), `childDies`, `doorDies`, `tailscaleStops`
  and `tailscaleRuns` (`ts.backend`), `approvalHold` (the next spawn waits for approval) and `approve`, `relaunch`
  (`stop()`, then a new host on the same store and `openAtLaunch()`, sometimes with an Allow in the same tick), and
  `noSettle` (the next action is issued before the queue settles, so presses interleave across ticks).
- **Quiescence**: after an action settles (`idle()` and immediates), while the funnel reads `restarting` and Tailscale
  runs, release the newest held restart wait and settle again (at most five times); release any outstanding approval
  hold the same way. Only then check, and count the checks.
- **The invariant**: §7.1's I1, I2, I3 and I5, and (I6) the switch `off` at quiescence means no child alive and the door
  process not listening. Every violation is recorded with its press index, the last ten actions and the readings, and the
  walk goes on. At the end it prints one line, `[p33122 walk] seed <s> presses <n> checks <q> violations <v> actions
  {…counts}`, and expects `v === 0`, printing the first three violations when not.
- **It must be RED at the parent**: the builder runs it in the scratch tree of §7.1 at the default size and reports the
  violations it found there (the double Allow must be among them). A walk that cannot see the defect at the parent proves
  nothing at HEAD. Before the core builder's `ipc.ts` lands, the builder may prove green against the spec step's
  prototype tree (§4.1), whose `ipc.ts` is the mechanism; the integrator runs it against the final tree.

---

## 8. Builders, disjoint files, and the seams

| Builder | Files (each in exactly one list) | Task |
| --- | --- | --- |
| **core** | `src/main/pocket/ipc.ts`; `src/main/pocket/__tests__/p33122-one-start.test.ts` (new); any OTHER existing file under `src/main/pocket/__tests__/` that this change turns red (none expected: 77 files and 2,684 tests read green over the prototype, §12 M10) | §5 and §7.1 |
| **walk** | `src/main/pocket/__tests__/p33122-walk.test.ts` (new) | §7.2 |
| **gates** | `build/conformance-pocket.mjs`, `build/ablation-p313.mjs`, `CLAUDE.md` | §6 |

| # | Seam | Confirmed by |
| --- | --- | --- |
| 1 | §5's exact statements ← `Q2` and the arms' anchors | `npm run conformance:pocket` green with `Q2` checked; every `Q2a` to `Q2h` red (§9.1) |
| 2 | `onestart` ← the file name and rows O1, O2b, O6, O7, O9, O12 | the arms' `alsoRed` read red against a green base |
| 3 | the walk ← `ipc.ts`: red at the parent, green only once §5 lands | the integrator runs the walk at the default size over the final tree |
| 4 | the walk and the rows share no module: each copies the world | the integrator's duplicate scan names the copies and leaves them, as Phase 333.12's did (vi.mock is per file) |

---

## 9. The proof, run rather than read

### 9.1 The battery (the integrator, then the committer at landing)

From `/private/tmp/wt-p33122`, every command that might start a shell with `HOME` and `ZDOTDIR` set to the integrator's
scratch `home`, `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset, and his history stat'ed around each:

`npm run typecheck`; `npm run build`; `npm test`; `df -h /` then `CSC_IDENTITY_AUTO_DISCOVERY=false npm run package`
then `rm -rf release`; `npm run conformance:pocket`; `npm run conformance:pocket:hostile`; `npm run gate:onlyadd`;
`npm run conformance:push`; `P313_ONLY=Q2a,Q2b,Q2c,Q2d,Q2e,Q2f,Q2g,Q2h,L5a,L5b,L5b2,L5c,L5d,L5e,Q1a,Q1b,Q1c,SU05,SU26,SU31,SU33,SU34
node build/ablation-p313.mjs`; `npm run gate:contract`; `npm run gate:checks`; `npm run gate:electron` (175 against 175);
`npm run gate:background`; and the two new files on their own, `node node_modules/vitest/vitest.mjs run --no-cache
src/main/pocket/__tests__/p33122-one-start.test.ts src/main/pocket/__tests__/p33122-walk.test.ts`, its walk line quoted.

### 9.2 What the builders' tests must show (driven, not read)

- **core**: O1 to O12 green here; O1, O2, O2b, O3, O6, O7, O8 and O9 RED at `69c3bd5a` (§7.1); the 77 pocket, harness
  and settings test files still green.
- **walk**: 0 violations at the default size at HEAD; at least one at `69c3bd5a`; both walk lines quoted.
- **gates**: `conformance:pocket` green with `Q2`; each arm red on `Q2` and on its named `onestart` rows, run once by
  `P313_ONLY=Q2a,…,Q2h` after core lands.

### 9.3 The verifier: Tier 3, two independent methods and the app run

Tier 3 because a door process and a Funnel child answering the internet while main reads `refused` or `changed` is
refusal 8's ground, and the fix spawns and ends processes.

1. **Measure the parent, at scale (re-derive).** `P33122_WALK_PRESSES=60000` at seed `333122` over HEAD: 0 violations;
   the same file over `69c3bd5a`: at least one, its first violation's actions read and matched to §2.2. Then one seed of
   the verifier's own choosing at HEAD: 0.
2. **Attack, do not confirm.** Sequences the builders did not write, at HEAD and at the parent: for example two Allows
   in two ticks with a return between them; an Allow while a restart is held inside its `unpublish` (`binds.stopHold`);
   off, on and three Allows in one tick; a relaunch with a bridge Allow queued before the launch's orphan sweep; a
   door-process death during a start's approval wait, then an Allow; recheck and Allow after a `not-approved` refusal
   (today's behaviour must hold: the return yields and the Allow's own start waits on approval). And re-run the spec
   step's tsx sequences over HEAD (`.../spec/measure.mts` through `.../spec/run.sh head <seq>`, fourteen sequences; 0
   violations expected, §2.2's last column), reading the readings, not the exit codes.
3. **One app run beside the parent** (THE LOCK, `df -h /` first, the parent built in its own clone): the sheet's Allow
   pressed by a real double click, four mouse events at once, and Enter held on the focused Allow
   (`Input.dispatchKeyEvent` with `autoRepeat`); two programmatic `click()` calls in one task; and two bridge
   `confirmDoor` calls in one tick, then the sheet's own Try again and Allow, then off. At the parent S3 and S4 reproduce
   (§3); at HEAD every arm ends `listening` with one door process and one Funnel child read by pid, and nothing alive
   after off. The spec step's scratch script, `.../spec/apprun/app-run.mjs`, is a reference the verifier may start from;
   its own reading is what counts.
4. **No regression against today**: §2.2 rows 6, 7, 9, 12 and 14 read at HEAD what they read at the parent.

### 9.4 No checklist row for him

Nothing a person sees moves (D7, D8), so there is nothing for him to press.

---

## 10. What is NOT in this phase

- No change to the hash, the fields, the routes, the record, the store or what Allow allows. A confirm still records,
  still writes the allowed set and still posts the served set while a start is in flight; it only starts nothing more.
- No change under `src/renderer/`: the sheet sends one Allow per press (§3), and main is the one place that counts.
- No change to `bind.ts` (its join of a listening door, `:597`) or `funnel.ts` (its one record file, `portsHeld`): with
  D2 a start never reaches either while a child is adopted, and with D4 a press never reads over one.
- No change to `readAtPress`'s or `readOnReturn`'s port rule.
- No phone code, nothing under `ios/**` or `build/p316/**`, no `src/main/harness/push-seam.ts`.
- No committed probe, no `package.json` script, no `build/verification-checks.mjs` row, no `HELPER_USER_FLOOR` change.
- No CHANGELOG item and no release on its own (D8).

---

## 11. For the main session at landing

- **Subject** `fix(pocket): one Allow starts the door once, however many arrive`; **first body line** `Phase 333.12.2: no
  door behind a refused face`; the body carries §2.2's table in prose, §3's numbers, and that no person's mouse could
  send two Allows, which is why there is no CHANGELOG item.
- **The running log** gets its two lines (started, landed) at the end of `docs/BACKLOG.md`.
- **No `test:ios`, no menu change, no contract change, no release.**
- **Cleanup after the follow-up commit**: this worktree, and the spec step's scratch under
  `.../scratchpad/p33122/` (307 MB, most of it the prototype's `cp -Rc` of `src/` and `build/`: `spec/proto` 266 MB,
  `spec/parent` 38 MB with its `node_modules` a symlink). The app run's harness directory and socket were removed by the
  spec step (§12 M7).

---

## 12. What the spec step measured, how, and the numbers

All under `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p33122/spec/`
(`spec/` below). Every tsx run, the build, the gates and the tests ran with `HOME` and `ZDOTDIR` set to `spec/home`,
`HISTFILE=/dev/null` and `TERM_SESSION_ID` (and for the runs and the app, `SSH_AUTH_SOCK`) unset. `df -h /` read 79 GiB
free at the start and 78 GiB before the build. Load averages 7 to 19.

| # | Command | Exit | Numbers |
| --- | --- | --- | --- |
| M1 | `git -C /private/tmp/wt-p33122 archive v0.111.1 src tsconfig.node.json package.json \| tar -x -C spec/parent`, `node_modules` a symlink to the worktree's | 0 | 38 MB. `git -C … rev-parse v0.111.1^{commit}` = `b97d3b85…` |
| M2 | `spec/smoke.mts` under `node <tsx 4.23.12 cli> --tsconfig spec/tsconfig.head.json`: does `electron` resolve to `spec/electron-standin.ts` through tsconfig `paths`, and does the shipping `ipc.ts` load | 0 | yes, and `PocketHost` is a function |
| M3 | `spec/run.sh <head\|parent> <seq>` × 14 sequences (`spec/measure.mts`, each in its own process, each with its own userData and stand-in directory) | 0 × 28 | 1 to 7 s each. Violations as §2.2: rows 1, 2, 3, 4, 5, 8, 10, 11, 13 at both builds; rows 6, 7, 9, 12, 14 none at either. Ten Allows: 23 Tailscale reads by the stand-in's log at both. Row 1's teardown ended pid 16518 (HEAD) and 18562 (parent) that main had left after its own off |
| M4 | `npm run build` at `69c3bd5a` | 0 | 43 s; `git status --short` empty after |
| M5 | `zsh /private/tmp/tortie-ops/lock.sh status`, then `try p33122` and `release` on the same line | 0 | three slots free; slot `electron.lock` held for the app run only |
| M6 | `node build/harness-socket.mjs --fresh gmux-p33122 "node spec/apprun/app-run.mjs"` (one Electron through `withElectron`) | 0 | 26 s; socket `gmux-p33122-wt-p33122-87129`; arms S1 to S4 as §3; `spec/apprun/out/app-run.json`; the helper's teardown "ended 1 process the teardown found still running" (the 8443 child main had left after off); afterwards no Electron, Tortie or crashpad process of this run in `ps -Ao pid,ppid,rss,comm` (only his own `/Applications/Tortie.app` pid 68183, parent 1, and other apps), no stand-in pid, no socket file under `/private/tmp/tmux-501/`, and `realTailscale: []`, `forbidden: []` |
| M7 | the app log copied to `spec/apprun/app.log` (37 lines), then the run's harness directory removed after `ps` showed no process naming it | 0 | "the phone door did not open: port-taken" at 19:31:47.028, 66 ms after "the phone door is published" at 19:31:46.961 (S3), and again at 19:31:49.567 (S4) |
| M8 | the prototype: `cp -Rc` of `src/` and `build/` (and the tsconfigs, `vitest.config.ts`, `electron.vite.config.ts`, `ios/TortieTests/Fixtures/frozen`) to `spec/proto/`, D1 to D4 applied to its `ipc.ts` by an exact-match script; `spec/run.sh proto <seq>` × 14 | 0 × 14 | 0 violations; ten Allows: 5 Tailscale reads; row 10: port stays 8443, one child |
| M9 | `diff -rq /private/tmp/wt-p33122/src spec/proto/src`; `diff -u` of `ipc.ts` | 1, 1 | one file differs, 14 lines added or changed |
| M10 | `node node_modules/vitest/vitest.mjs run --no-cache src/main/pocket src/main/harness/__tests__ src/renderer/settings` in `spec/proto` | 0 | 77 files, 2,684 tests passed, 9 s |
| M11 | `node build/conformance-pocket.mjs` in `spec/proto`, then in the worktree | 1, 0, 0 | the first prototype run red on U5 alone because `electron.vite.config.ts` had not been copied; copied, PASS 152 rules and 20,743 checks in 7.05 s. The worktree: PASS 152 rules and 20,725 checks in 6.66 s |

**His shell history.** `stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `737736 1792023873` and `23166 1790702242`
at the start, before and after every command above that started a shell, a test, the build or the app, and at the end.
Neither file moved.

**What this step did not do.** It wrote nothing under `src/` or `build/` of the worktree but this file, committed,
staged and stashed nothing, read nothing of his keychain, credentials or profile, started no agent and no model turn, and
named no `-L gmux` itself (`build/electron-run.mjs`'s own read-only census of his server ran inside the helper, as it does
for every probe).

---

## 13. Questions for him

None. D4 widens the entry by one press (a switch-on while the restart after a door-process death is armed), measured to
leave a Funnel child publishing behind `changed` at both builds, bridge-only today, and the fix is the order
`recoverNow` already uses; it makes no scenario worse (§9.3 item 4).

---

## §Attack — the spec step's own attack, and what it changed

| # | Attack | What it changed |
| --- | --- | --- |
| A1 | "Gate the confirm on `opening`, which already counts the door jobs that may start the door." A return's job counts there too and may decline to open (after `not-approved` with approval still asked, `:1337-1343`), so an Allow pressed while a return waits its turn would start nothing, where today the return yields to the Allow's start (`rechecks(1)`'s `(c)`) | D1: a counter of `start()` alone |
| A2 | "Only a confirm whose hash is ALREADY recorded starts nothing more" (the entry). A confirm of a new hash while a start is in flight is opened by that start, which asks the gate after its read and closes at its end unless confirmed; a second start for it is the double start | D1: every confirm while `starts > 0` |
| A3 | "The one-in-flight check is enough." No: a confirm's start queued behind a Try again's job, a return or the launch's own start runs after that job published (§2.2 rows 8, 13) | D2, D3: the held outcome |
| A4 | "The held guard is enough." No: when the first start is refused, every queued start reads Tailscale and spawns again (23 reads for ten Allows at both builds, 5 with both changes), and the entry asks that the confirm start nothing more | D1 kept beside D2 |
| A5 | "Return `'published'` from the guard and touch no caller." A door process that died under its child reads `restarting`; calling that published is a lie to every caller, and a reader of `start()` could not tell a start that published from one that found the door taken | D2: `'held'`, and D3 names it at the two writes |
| A6 | "Put the guard in `start()`." Then the return's job and any later caller of `openNow` lack it | D2: `openNow`'s first statement, the one door every fork passes |
| A7 | "Let `readAtPress` except the door's own child from `portsHeld` (its `exceptTarget`)." The door process may be gone (its local port reads 0) and the old child's target is not in the status; and the press would then publish beside the old child, which is the two-children state | D4: end the adopted child first, as `recoverNow` does |
| A8 | "End the door process before the child" (the entry's word order). A child alive while its door process is gone is a published session forwarding to nothing, which is exactly what row 10 and the off in row 1 leave | D5: child first, nothing reordered |
| A9 | "Harden the sheet too, with a ref-based in-flight flag." The sheet sent one Allow per press in the real app (S1, S1b, S2); two clicks in one task are not a person; a second guard in the renderer is a second place that decides | D7: no renderer change |
| A10 | "Commit a `probe:p33122`." One app run is the verifier's own method; a committed probe adds a package script, a check row and a floor raise for it | D12 |
| A11 | "Re-run the reverify's walk with its seed." Its script and seed were in a scratch the landing removed; nothing under `build/p33312/` holds them | D10: this phase's own walk, red at the parent first |
| A12 | "Count the start in `openAtLaunch` through `queueStart` too." `openAtLaunch` must await its start to answer `opened` or `refused`, and its start is held by D2 when a bridge Allow's start published first (row 8) | D6: `openAtLaunch` keeps calling `start()` |

---

## §As built

Written by the integrator on 2026-10-15, then the fix round if there is one.

### The integrator's round

**Three builders, disjoint files, then one seam that did not hold.** Builder **core** wrote §5 into `src/main/pocket/ipc.ts`
(its code, comments stripped, equals the prototype's byte for byte) and `p33122-one-start.test.ts` (O1 to O12, 16 cases);
builder **walk** wrote `p33122-walk.test.ts` (1,083 lines, mulberry32, default 4,000 presses, sha256 `d2d5705b…`); builder
**gates** wrote `Q2`, the `onestart` check, `Q2a` to `Q2h` and the CLAUDE.md sentence. Seam 3 of §8 failed: **with D1 to D4
alone the walk was RED at HEAD**, 6 violations at its default size (`I1 loopback` 6, first at press 3,095) and 175 at 60,000
presses (`I1 loopback` 170, `I1 internet` 5, first at 3,095); seeds 1, 2 and 3 at 20,000 read 49+11, 81+0 and 94+12
(walk builder's numbers). Every one was one of two classes, identical at the parent, and neither is a second Allow, so the
spec's prototype (measured on the 14 sequences of §2.2 only) never met them:

- **(A) a door process left listening without its child, behind a refused face.** Tailscale stops and the CHILD dies
  unasked, so the door process still listens and a restart is armed. A start that reaches its read (a bridge Allow; a
  return on focus does not run while a restart is armed, `rechecks` (e)) reads `not-running` and writes `idle` over
  `restarting`; a switch-on press (D4 asked only `this.run !==
  null`, which the child's death had cleared) cancels the restart and returns at its read. Either way main reads
  `refused` while the door process listens on loopback, until the restart fires (the start) or the next press (the
  switch). Nothing on the internet.
- **(B) a child adopted after its door process died.** The door process dies while a start waits on Tailscale's
  approval. `onPocketDoorExit`'s listener returns because no child is adopted yet, so after approval the start adopts a
  child publishing to a dead loopback port: main reads `refused` with "The door stopped unexpectedly, so nothing is
  answering. Tortie is trying again." with no restart armed, and Try again returns at once (`published() && confirmed`).
  It lasts until off or quit. A crash, never a press.

The entry's proof is "0 states where a door process or a Funnel child lives while main reads anything but listening", so
the integrator closed both rather than exempt them, and records the three statements as decisions of its own:

| # | Decision | Where |
| --- | --- | --- |
| D13 | **A start ends a door process whose child died, before anything else.** `openNow`'s SECOND statement, right after D2's held check: `if (pocketDoorStatus().listening) await this.unpublish();`. With no child adopted (D2 returned otherwise) a listening door process is one whose child died with its restart waiting, and the restart would end it the same way before its own start (`recoverNow`'s unpublish). `unpublish` and not `stopPocketDoor`, so the order stays the child first (none here) and its `stopNameCheck` is a no-op (the child's death already stopped the name check). Answers class (A) for the start | `ipc.ts` `openNow` |
| D14 | **A start adopts its child only while the door process it forked still listens on that port.** The two statements before `this.adopt(started.run);`: `const forked = pocketDoorStatus();` and `if (!forked.listening \|\| forked.localPort !== door.localPort) { await started.run.stop(); this.startRefusal = DOOR_SENTENCES['bind-failed']; this.startRefusalWord = null; pocketLog.warn(…); outcome = 'retry'; return outcome; }`, then the existing `finally` stops the (dead) door process. Nothing is awaited between the check and the adopt. The sentence is the existing "Tortie could not open the door on this Mac." and NOT the door's own `door-exited` sentence, which says Tortie is trying again: from a start, a setup press or a return nothing is armed to try again, and Try again now works; from a restart, `retry` re-arms the restart as before. No new copy. Answers class (B) | `ipc.ts` `openNow`, step 11b |
| D15 | **D4 widened: a switch-on press ends a door process whose CHILD died too.** `if (this.run !== null \|\| pocketDoorStatus().listening) await this.unpublish();`, the same line, still right after `this.cancelRestart();` and right before `readAtPress(`. That is what the cancelled restart would have ended; §5.6's text and `Q2` (g) move with it. Answers class (A) for the switch | `ipc.ts` `setDoor` |

**One reading moves, by design (§9.3 item 4).** §2.2 rows 9 (a bridge Allow while the restart after the child's death is
armed) and 12 (Try again in the same place) end exactly as at the parent, `listening` at 8443 with one child, but the
start now forks a NEW door process (the spec's runner reads `doors 2`) where the parent JOINED the old one (`doors 1`).
The door's identity is main's (`tls.ts`'s held identity, handed to every fork), which is what every restart already does,
and no phone connection can be cut by it because the child that carried them had already died. Both rows are reached
through the bridge alone today (the sheet draws neither Allow nor Try again while the face reads `opening`, and a return
does not run while a restart is armed), and a person would see nothing different.

**Rows, gates and arms for the three.** `p33122-one-start.test.ts` gained O13 (D13), O14 (D15) and O15 (D14) in a fourth
`describe`, each ending on `oneDoorOrNone`: all three RED at `69c3bd5a` and RED at core's D1-to-D4 tree, green here.
`Q2` gained clauses (j) (`openNow`'s second statement) and (k) (the two statements before the adopt) and (g)'s expected
text; its row now cites "D1 to D6 and §As built D13 to D15". `ablation:p313` gained `Q2i`, `Q2j` and `Q2k`, re-anchored
`Q2d` on the widened line (559 entries in all), and the CLAUDE.md sentence names the three and 559.

**Rows each arm reddens, measured** (one-clause breaks in a scratch `69c3bd5a` tree with HEAD's `ipc.ts`, then by core
for its eight): `Q2a` O2b; `Q2b` O6, O7, O8 (NOT O1, O6, O7 as §6.2 says: with D1 in place O1's second Allow never queues
a start, so the held guard is not what O1 tests; the arm's `alsoRed` is the `onestart` tag, so nothing moves); `Q2c`
none (text); `Q2d` O9 and O14; `Q2e` O6, O7; `Q2f` none (text); `Q2g` O2b; `Q2h` O12; `Q2i` O13; `Q2j` O14; `Q2k` O15.

**CHANGELOG: still none (D8).** Class (A) is reached through the bridge alone, for the reasons just given; class (B)
needs the door process to crash during an approval wait, never a press. The main session may judge (B) otherwise.

**Duplicate scan.** Every 10-line window of the delta's added lines looked up across `src/` and `build/`: 79 windows
recur, all in the test files' copied in-memory world (one-start against `p3331-return.test.ts` 38, walk against
one-start 33, walk against `p3331-return.test.ts` 26, walk against `ipc.test.ts` 13 and `switch-queue.test.ts` 11, and
under ten against four others). None in `ipc.ts`, `conformance-pocket.mjs` or `ablation-p313.mjs`. They stay, as Phase
333.12's integrator ruled (`vi.mock` is per file).

**A caution for the verifier.** The walk reads `P33122_WALK_SEED` and `P33122_WALK_PRESSES` as integers and falls back
to the default on anything else, so quote the printed `[p33122 walk] seed … presses …` line, never the environment.

### Files changed (`git diff --stat 69c3bd5a` plus the new files)

`src/main/pocket/ipc.ts` +84 −5 (§5 plus D13 to D15); `src/main/pocket/__tests__/p33122-one-start.test.ts` new, 1,005
lines (19 cases); `src/main/pocket/__tests__/p33122-walk.test.ts` new, 1,083 lines; `build/conformance-pocket.mjs` +449;
`build/ablation-p313.mjs` +149 −1; `CLAUDE.md` one row widened by one sentence; `build/p33122/SPEC.md` new. Nothing under
`src/renderer/`, `ios/**`, `build/p316/**`, `bind.ts`, `funnel.ts` or `push-seam.ts`; no channel, route, hash or type.

### The integrator's commands (scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset)

| Command | Exit | Numbers |
| --- | --- | --- |
| the two new files at HEAD BEFORE the integrator's round | 1 | 16 of 17 green; walk `seed 333122 presses 4000 checks 3461 violations 6`, `I1 loopback` 6, first at 3,095 |
| `npm run typecheck` | 0 | import boundaries 1,429 files 0 violations; no runtime cycles |
| `npm run build` | 0 | 40 s; `vectors.mjs --check` and `contract-inventory` OK inside it; worktree unchanged after |
| `npm test` | 0 | 50 s; 1,141 files passed, 2 skipped; 21,422 tests passed, 14 skipped; walk `seed 333122 presses 4000 checks 3461 violations 0` |
| `vitest run --no-cache` the two new files | 0 | 4 s; 20 tests; `[p33122 walk] seed 333122 presses 4000 checks 3461 violations 0 actions {"allowN":325,"relaunch":101,"allow":442,"noSettle":257,"approvalHold":130,"allowAndRemove":139,"on":378,"doorDies":190,"tailscaleRuns":117,"alertsOn":232,"allowStale":131,"off":173,"onAndAllow":175,"childDies":192,"tailscaleStops":89,"remove":144,"pair":203,"allowAndAlerts":117,"approve":86,"alertsOff":187,"recheck":192}` |
| the walk at HEAD, `P33122_WALK_PRESSES=60000` seed 333122; 20,000 at seeds 1, 2, 3 | 0 × 4 | 42 s `checks 51620 violations 0` (forks 4,255, spawns 4,225, held-port refusals 0); 15 s each, `checks 17174`, `17276`, `17174`, `violations 0` |
| the walk at a scratch `69c3bd5a` tree, default | 1 | `checks 3481 violations 629`: `I1 internet` 474, `I5` 353, `I2` 166, `I3` 80, `I6` 75, `I1 loopback` 14; first at press 11, `alertsOn` then `allow×2`, `refused`/`idle`/`port-taken` over a listening door process and a live child: the double Allow |
| the walk at core's D1-to-D4 tree, default | 1 | `checks 3461 violations 6`, `I1 loopback` 6 |
| one-start at the parent / at D1-to-D4 / at HEAD | 1 / 1 / 0 | parent 13 red (O1, O2 ×3, O2b, O3, O6, O7, O8, O9, O13, O14, O15), 6 green; D1-to-D4 3 red (O13, O14, O15); HEAD 19 of 19 |
| pocket, harness and settings tests | 0 | 79 files, 2,701 tests, 7.9 s (before O13 to O15) |
| `df -h /` then `npm run package` then `rm -rf release` | 0, 0 | 76 GiB free; 73 s, `Tortie-0.111.2-arm64.dmg` and `.zip` (831 MB) removed; electron-builder's tool cache went to the scratch `HOME` |
| `npm run conformance:pocket` | 0 | PASS, 153 rules, 20,819 checks, 6.8 s and 12.2 s; `Q2` 37 checks |
| `npm run conformance:pocket:hostile` | 0 | PASS, 279 arms, 19.2 s |
| `npm run gate:onlyadd` | 0 | PASS, 158 requests replayed, 11 routes |
| `npm run conformance:push` | 0 | PASS, 26 rules, 2,394 checks |
| `P313_ONLY=Q2a…Q2k,L5a,L5b,L5b2,L5c,L5d,L5e,Q1a,Q1b,Q1c,SU05,SU26,SU31,SU33,SU34 node build/ablation-p313.mjs` | 0 | PASS, 282.1 s, 25 arms, each red on its own rule; the nine marked also red on `onestart`; base 12 checks green; every clone file restored by sha256. A FIRST run (exit 1, 266 s), launched beside four other gates at a load average near 80, read its base red on `hostile` alone, SBS1 (Phase 337.1's scrollback pacing, "least gap 247.5 ms"), which this phase does not touch; every arm still read red on its rule, and the harness refused the run for its red base, as it should. Re-run alone at load 18: green base, PASS |
| `npm run gate:contract` | 0 | the inventory matches the baseline byte for byte |
| `npm run gate:checks` | 0 | 270 check scripts classified, 1,143 test files reach no home |
| `npm run gate:electron` | 0 | 175 against the floor of 175 |
| `npm run gate:background` | 0 | 567 files, 19 of 19 fixtures |
| the spec's 14 sequences over HEAD (its `measure.mts`, the REAL Phase 330 stand-in, runs in the integrator's scratch) | 0 × 14 | 0 violations; ten Allows 5 Tailscale reads; row 10 stays 8443 with one child; rows 9 and 12 as above; every teardown ended no stand-in pid |

**His shell history.** `stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `737736 1792023873` and `23166 1790702242`
at the start, before and after every command above, and at the end. Neither file moved. No Electron, no lock, no model
turn, no real Tailscale, DNS or APNs, nothing committed, staged or stashed.

### The fix round

Written by the fixer on 2026-10-15, once, after two verify lenses. Lens 1 (the shipping host over real processes read by
pid, 40 sequences at both builds, 12 one-clause breaks of its own) answered **approved** with three nits. Lens 2 (its own
seeded walk of 4,000 short walks, per-walk end states against the parent, one-clause ablations, two app runs) answered
**needs_work** with one minor: **Allow, `forgetDoor`, Allow ends with the door shut at HEAD and open at the parent**
(`refused`/`idle`/`confirmed`, no sentence, nothing alive; app runs F1 and F2, its walk 2632). Every finding below was
reproduced before it was changed, and every change was measured at three trees: the parent `69c3bd5a`, the integrator's
tree (its `ipc.ts`, sha256 `a8b6a9ac…`, kept as the "pre-fix" tree) and this tree.

**Lens 2's minor, and what the fix round found beside it.** D1 assumed that the start in flight opens whatever the person
has just allowed, because it asks the gate after its read and again at its end. That is false in three shapes, and the
first was lens 2's:

1. **A stop queued behind the start in flight.** `forgetDoor` queues `stop()`, an unconditional close. The start publishes,
   the stop closes, and the Allow made after the stop was dropped by D1. The parent queued a start for it.
2. **The same over a published door** (found by the fix round's walk invariant I7, below). `confirmDoor` asked
   `!this.published()` while a stop was about to close the door, so a published door, forget and Allow in one tick was
   left shut. This one is **identical at the parent** (row O19 red at both); it is the same rule, so it is fixed with it.
3. **An Allow made after the start in flight last read the gate** (found by the fix round's own short walks, below). The
   start's last read refused (alerts had just been turned on) or found its door changed at its end and closed it, and the
   Allow arriving while that start was finishing was dropped by D1. In the app the window is the close at a start's end
   (real I/O, row O20); in the walk also the microtasks between a refusal and the start's `finally`. The parent queued a
   start for it.

None of the three is a refusal-8 state: nothing answers. Each is a door the person has just allowed left shut with
nothing said, where the parent opened it (1, 3) or where it already stayed shut (2).

| # | Decision | Where |
| --- | --- | --- |
| D16 | **A stop un-answers the start in flight.** `private startAfterStop = false;` set `true` by `start()` (beside `this.starts += 1;`) and `false` by `stop()`, each before its method's first await; `queueStart()` drops only while `this.starts > 0 && this.startAfterStop`. And **a stop waiting its turn makes a published door one to start again**: `private stops = 0;` counted by `stop()` alone (`+= 1` before its await, `-= 1` in the finally around `await this.serially(`), and `confirmDoor` queues under `this.readStore()?.enabled === true && (!this.published() \|\| this.stops > 0)`. Only `stop()` counts, because it is the one unconditional close reachable with the switch on and no press: `closeUnlessConfirmed` (Remove, alerts, a refused phone) asks the gate when it runs, after the confirm's synchronous record, and the switch's off writes `enabled: false`, after which no confirm queues anything and the next on is a press with its own job | `ipc.ts` `start`, `queueStart`, `stop`, `confirmDoor` |
| D17 | **The Allow the start in flight never read is owed a start.** `private startOwed = false;` set `true` by `queueStart()` when it drops (its first statement is now `if (this.starts > 0 && this.startAfterStop) { this.startOwed = true; return; }`), set `false` by the two reads of the gate a door job makes (`mayOpen()`'s first statement; `closeNowUnlessConfirmed()`'s statement after its early return), and read in `start()`'s `finally`, after `this.opening -= 1;`: `if (this.startOwed) { this.startOwed = false; if (<confirmDoor's own condition>) this.queueStart(); }`. A drop that happens before the start's own read is cleared by that read, so D1 holds where it was measured (O2b, O3, ten Allows: one read, one spawn); a drop after the start's last read is queued when that start ends. Any gate read by another job between the drop and the owing start's `finally` is impossible: the queue is serial and a start's `finally` runs before the next job's body (the `serially` tail's reaction is registered before `start()`'s await, so the next job is called one microtask after that `finally`). The cost, stated: an Allow made while a start waits on Tailscale's approval, after its read, on a start that then fails (approval exit 0, the door fork dying), now reads and spawns once more, as the parent did | `ipc.ts` `queueStart`, `start`, `mayOpen`, `closeNowUnlessConfirmed` |

**Lens 1's three nits.** (1) `Q2` (a) missed a writer of the count through a cast of `this` (its M16): `q2WritesTo` now
reads the object through `bare()` for a property access and an element access alike, and arm `Q2p` is that cast. (2) No
rule pinned `unpublish`'s own order (its M12): `Q2` (m) pins the child in the try and the door process in its finally, row
O18 drives it, and arm `Q2q` swaps them. (3) The door fork dying at its first fork with TWO Allows in one tick ends
`refused` at HEAD where the parent's second, accidental start published: **not changed**. It is the entry's own wording
("a confirm whose hash is already recorded while a start is queued or running starts nothing more"), both Allows arrive
before the start's read so D17 owes nothing, one Allow reads the same at both builds, and one more Allow or Try again
opens it. The false sentence that face draws ("Tortie is trying again" with no restart armed, `door.sentence` on a
start's `!door.ok` arm) is older than this phase and is lens 1's to a later phase, as it suggested. Its three pre-existing
notes (`confirmPocketDoor` checks the hash alone; `setPushAlerts` waits behind a start waiting on approval; a quit's joins
leaving one door process to the process exit) are not this phase's either.

**The gates.** `Q2` reads 67 checks (37 at the integrator's tree): (a) became one helper for the two counters, `starts`
in `start()` and `stops` in `stop()`; (a2) holds `startAfterStop`'s two writes; (b) holds `queueStart()`'s new first
statement; (c) admits `start()` as `queueStart`'s second caller (its `finally`); (l) holds `confirmDoor`'s guard; (m)
`unpublish`'s order; (n) `startOwed`'s four places and the `finally`'s condition. `ablation:p313` gained ten arms, `Q2l`
to `Q2u` (569 entries), and `Q2a` and `Q2o` moved their anchors (`Q2o`'s old text now occurs twice, and the harness
replaces the first). Rows each arm reddens, measured over this tree with one clause broken and restored by sha256:
`Q2a` O2b; `Q2l` O16, O17; `Q2m` O16, O17; `Q2n` O2b; `Q2o` O19; `Q2p` none (text); `Q2q` O18; `Q2r` O20; `Q2s` O20;
`Q2t` O2b; `Q2u` none (text: the start it would add is held by D2 and reads nothing).

**The rows.** `p33122-one-start.test.ts` gained O16 (Allow, forget, Allow in one tick), O16b (a control: Allow and forget,
nothing after: shut, `never`, nothing alive), O17 (the same while the first start waits on approval), O18 (a control:
off ends the child before the door process), O19 (a published door, then forget and Allow) and O20 (the start's end finds
alerts turned on and closes, held inside its stop; an Allow made then). Read at the three trees: **the parent** red on
O1, O2 ×3, O2b, O3, O6, O7, O8, O9, O13, O14, O15 and O19, green on O16, O16b, O17, O18 and O20; **the integrator's
tree** red on O16, O17, O19 and O20 alone; **this tree** 25 of 25.

**The walk.** Two actions joined the alphabet, `forget` and `allowForgetAllow` (the second's last call an Allow), and one
clause, **I7: an Allow is never swallowed** — when the person's last WORD (an action that moves the switch, the agreement
or a hashed field, or relaunches) was an Allow main answered `allowed`, and Tailscale runs, main never reads `refused`
over `confirmed` with no sentence and no refusal word. Its first form, without "the last word", read 37 at this tree and
was wrong: after alerts on closes a door and alerts off puts its fields back, the door stays closed by Phase 333.12's own
rule ("nothing here ever OPENS one"), which is honest; narrowed, it reads 0 here. The seed now draws a different walk than
the integrator's round did. Over a scratch copy of the walk that runs 2,000 SHORT walks of 30 presses, each from a fresh
world (its own userData and modules, seed `333122 + w`): with D16 alone, I7 at press 19 of walk 315, three runs of three,
the start's log reading "did not open: its details are not the confirmed ones" and then two drops; with D17, 0 in two runs.

**No scenario worse than today, measured.** The same 2,000 short walks at the parent and at this tree, each walk's end
state compared where the two walks' action labels are identical (1,537 of 2,000; the rest diverge because a skip depends
on main's answers): listening at this tree only 141, at the parent only 1; endings where a door process or a child lives
while main is not `listening` (honest `restarting` excepted) 0 here and 307 at the parent. The one walk (1031) is the
parent's defect: its double start read Tailscale while it was stopped (press 17), which made its later Allows
unconfirmable, so its record kept `bindAtLaunch: true`; here the door was published, the Allows made with the switch off
recorded `bindAtLaunch: false`, and the next switch-on read `changed`, which is the honest face of a hashed field the
switch moves.

### Files changed (`git diff --stat 69c3bd5a` plus the new files), after the fix round

`src/main/pocket/ipc.ts` +146 −8 (the integrator's +84 −5, then D16 and D17: 68 lines added and 9 changed, sha256
`d083d068…`); `src/main/pocket/__tests__/p33122-one-start.test.ts` 1,158 lines (25 cases); `p33122-walk.test.ts` 1,165
lines; `build/conformance-pocket.mjs` +663; `build/ablation-p313.mjs` +273 −1; `CLAUDE.md` one row, its 333.12.2
sentence widened for D16, D17 and 569; this file. Still nothing under `src/renderer/`, `ios/**`, `build/p316/**`,
`bind.ts`, `funnel.ts` or `push-seam.ts`; no channel, route, hash, field or type.

### The fixer's commands (scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset)

| Command | Exit | Numbers |
| --- | --- | --- |
| the new rows before any change (O16, O16b, O17, O18 over the integrator's `ipc.ts`) | 1 | O16 and O17 red, the rest green |
| `npm run typecheck` | 0 | 6 s; import boundaries 1,429 files 0 violations; no runtime cycles |
| `npm run build` | 0 | 40 s; `vectors.mjs --check` and `contract-inventory` OK inside it; worktree unchanged after |
| `npm test` | 1, then 0 | first run 90 s at a load average near 410 (another worktree's `xcodebuild` and Simulators): 2 red in files this phase does not touch, `src/main/proc/__tests__/guarded.test.ts` ("no pid in … slow.pid") and `p347-open-files.native.test.ts` N8; those two files alone: 2 files, 21 tests passed; the whole run again at load 71: 79 s, 1,141 files passed, 2 skipped, 21,428 tests passed, 14 skipped |
| the two new files alone | 0 | 4 s; 26 tests; `[p33122 walk] seed 333122 presses 4000 checks 3506 violations 0` |
| `df -h /` then `npm run package` then `rm -rf release` | 0 | 63 GiB free; 78 s; `Tortie-0.111.2-arm64.dmg` and `.zip` (840 MB) removed |
| `npm run conformance:pocket` | 0 | PASS, 153 rules, 20,851 checks; `Q2` 67 checks |
| `npm run conformance:pocket:hostile` | 0 | PASS, 279 arms, 18.1 s |
| `npm run gate:onlyadd` | 0 | PASS, 158 requests replayed, 11 routes |
| `npm run conformance:push` | 0 | PASS, 26 rules, 2,394 checks |
| `P313_ONLY=Q2a…Q2u,L5a,L5b,L5b2,L5c,L5d,L5e,Q1a,Q1b,Q1c,SU05,SU26,SU31,SU33,SU34 node build/ablation-p313.mjs` | 0 | PASS, 357.0 s at load averages of 75 to 465, 35 arms each red on its own rule, the 17 marked also red on `onestart`; base 12 checks green; every clone file restored by sha256. (A run of 31 arms before D17, 322.8 s, also PASS) |
| `npm run gate:contract` | 0 | byte for byte |
| `npm run gate:checks` | 0 | 270 check scripts classified |
| `npm run gate:electron` | 0 | 175 against the floor of 175 |
| `npm run gate:background` | 0 | 567 files, 19 of 19 fixtures |
| the walk at this tree: seed 333122 at 60,000; seeds 1, 2, 3 at 20,000; seed 151015 at 30,000 | 0 × 5 | `checks 51881`, `17340`, `17321`, `17356`, `26006`, `violations 0` each; at 60,000 forks 5,067, spawns 5,018, held-port refusals 0 |
| the same walk at the integrator's tree, 4,000 and 60,000 | 1, 1 | `violations 33` and `630`, every one I7 (the forget shapes) |
| the same walk at the parent, 4,000 and 60,000 | 1, 1 | `violations 743` and `9493`; at 60,000 `I1 internet` 6,639, `I5` 5,154, `I2` 2,071, `I3` 1,292, `I6` 588, `I7` 329, `I1 loopback` 128 |
| the spec's fourteen sequences plus the fix round's four (`forget-between`, `forget-during-approval`, `forget-published`, `forget-alone`), the real Phase 330 stand-in, over this tree | 0 × 18 | 0 violations once `opening` (a start in flight, or `restarting`) is excepted as §2.1 says; ten Allows 5 Tailscale reads; every forget sequence but `forget-alone` ends `listening` at 8443 with one child, `forget-alone` ends `refused`/`never` with nothing alive; every teardown ended no stand-in pid |
| the four forget sequences at the integrator's tree and at the parent | 0 × 8 | integrator's tree: `forget-between`, `forget-during-approval` and `forget-published` end `refused`/`idle`/`confirmed` with nothing alive; parent: the first two end `listening`, `forget-published` ends `refused`/`idle`/`confirmed`; `forget-alone` `refused`/`never` at both |
| the 2,000 short walks (scratch), at this tree twice and at the parent once | 0 × 3 | as above: I7 0 and 0 here (2 with D16 alone, three runs of three); per-walk comparison 141 better, 1 worse explained |

**His shell history.** `stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `737736 1792023873` and `23166 1790702242`
at the start, before and after every command above, and at the end. Neither file moved. No Electron, no lock, no model
turn, no real Tailscale, DNS or APNs (the sequences ran the Phase 330 stand-in as a child and the walks and rows an
in-memory one), nothing committed, staged or stashed. The scratch is under
`/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p33122/fix/` (the pre-fix
copies under `prefix/`, the three scratch trees `parent/`, `prefixtree/`, `headtree/`, the short-walk harness
`p33122-diff.test.ts`, the D16-only instrumented tree `dbgtree/`, the sequence runner `seq/`).
