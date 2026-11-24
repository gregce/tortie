# Phase 370 — "the file tree asks git what is ignored one call at a time" — SPEC

Written by the spec step on 2026-11-23 in `/private/var/tmp/tortie-wt/wt-p370`, a detached worktree at origin/main
`3aae4f89` ("docs(backlog): queue 370"; its code is `34762d87`'s, which carries Phase 369's Electron 45.3.4).
The Mac restarted at 23:18 that day while the finished draft was being re-read; a second spec step read it whole, held
every number against the records in `…/spec/runs/`, reran the store, service and prototype measures, and changed what
§2.8 names.
**`git diff 3aae4f89` in the worktree must be exactly Phase 370's delta**, this file included. origin/main may move while
the phase runs; nobody here rebases, pulls or merges; the main session moves the tree at landing. The charter is
`docs/BACKLOG.md` "## Phase 370" (`:45457`), bound as written except where §0.1 says the tree or a measurement wins. The
rules it keeps are Phase 47's (ask only what the tree has listed, a directory answers for its subtree), Phase 47.1's (THE
RENDERED SET IS NEVER EMPTIED BY A REFRESH, `src/renderer/tree/ignored.ts:20-31`), Phase 90.3's (a folder on another
machine asks nothing), Phase 155's (Refresh and a repository change re-read every cached folder, forced) and Phase 343's
RULE 6 (never a path past a link). His standing rulings bind: **no regression against today** (a scenario worse than the
parent is a defect: fix it or drop the part, and name which); Tortie never ends a session on its own; just enough words;
no tmux vocabulary in anything a person reads; nothing released, tagged, version-bumped, archived or uploaded; refusal 1;
his session count is allowed (`build/electron-run.mjs`'s read-only census around a launch that names `tmuxSocket`).

| | |
| --- | --- |
| Subject | `fix(tree): ask git what is ignored one call at a time` (the entry's) |
| First body line | `Phase 370: the file tree's ignore check no longer piles up git processes` (the entry's) |
| Semver | Patch. One CHANGELOG item under `## Unreleased`, `### Fixed` (§5). It rides 0.116.0 with Phase 369 on his word of 2026-11-23; the release itself still waits for his word on the day |
| Lane | Build: Spec → Build (THREE builders, disjoint files) → Integrate → Verify (two lenses) → [Fix once → Reverify] → Commit |
| Tier | **3**: he reported it, so the parent measurement is mandatory (done, §2.3); and the defect is a process started from a watcher tick with no bound (CLAUDE.md, "does it spawn a process"). Real data is the per-cell matrix at both builds; two independent methods at least, one an attack (§10) |
| The cure | **One call at a time in the store, an answer that lands though listings arrived, one call behind it, a git that did not answer never read as "nothing is ignored", and one child per repository in main** (D1 to D9). Measured at the parent: N+2 children at once the moment a project with N open folders is shown, with no writer at all (12, 102, 502), and N+2 more on every repository change (§2.3) |
| Menus | **No row added, renamed or removed.** Nothing a person presses moves |
| Contract | **Does not move.** No invoke channel, type, `GMUX_*` name, schema, smoke mode, `gmux.*` key or notice kind. `git:checkIgnore` keeps its request and its answer; a rejection is not a contract line. `gate:contract` must read byte for byte, and a diff there is a finding |
| `HELPER_USER_FLOOR` | **192 → 193**: `build/p370/probe-p370.mjs` reaches `build/electron-run.mjs` (obligation 1; `build/assert-electron-teardown.mjs:693`) |
| CHANGELOG | One item (§5); the commit link is added by the follow-up docs commit |

## 0. The hard rules, stated once (every builder, the integrator, every verifier, the fixer, the reverifier)

- NEVER commit, stage or stash. `/Users/gdc/gmux` is read only. `wt-docs` is the main session's: never touch it. No
  other phase runs now. Scratch lives under `/private/var/tmp/tortie-wt/scratch/p370/<role>/`, never under
  `/private/tmp`; a probe's `TMPDIR` points there too.
- **HIS MACHINE IS BUSY WITH HIS OWN BUILDS, AND THIS BUG IS WHAT HURT THEM.** His lanes wait while the 1 minute load is
  above 30. So a run that can hold more than 20 `git check-ignore` children at once (the parent at 100 and 500 folders)
  uses the counting STAND-IN (§8.1), which sleeps for the hold without a child and without a CPU, and answers from the
  fixture's own rules without running real git. Real git answers only the 10 folder cells and the no-regression rows.
  A cell runs at most 90 s. Before any cell that can hold more than 20 children read `sysctl -n vm.loadavg`: above 60,
  wait 2 minutes and read again (up to 20 minutes, then run it and say the load). Say the load beside every timing, and
  read every timing against the parent in the same session, alternated. `memory_pressure | grep percentage` under 20
  percent free with swap growing means start nothing and report (it read 18 percent once during the spec step, with
  swap growing and every top consumer his: `next-server`, `go`, his Claude sessions; the step waited and it read 22 to
  28 for every run). 502 held stand-ins hold about 1.2 GB resident between them (2.5 MB each, measured), which is why
  the ceiling is 520 and the hard cap 560 (§8.1). **Never run the stand-in with no hold above 10 folders**: the spec
  step did once (§2.5), 502 short children at the mount and again on a revalidation, and the 1 minute load read 16
  before and 45 after. **And never let a blown fuse run on**: the hard cap stops the HOLDING, not the starting, and in
  the two 500 folder cells the parent went on starting, 1,397 and 919 unheld children in the drain with 606 and 789
  alive at once (§2.3). A cell whose fuse blows ends its launch there and then (§8.1).
- **Git on the app's PATH.** Main starts `git` by bare name (`src/main/git/exec.ts:93-102`) from its own PATH, and
  `installUserPath` replaces that PATH with the one its login shell answers (`src/main/tmux/user-path.ts:49`). So the
  stand-in's folder is first on the launched app's PATH AND on the PATH the scratch HOME's `.profile` and `.zprofile`
  set (the app is given `SHELL=/bin/sh`), and a probe refuses (exit 2) unless that login shell resolves `git` to the
  stand-in before the launch and a git call whose parent is the app's own pid reached the stand-in after it. The real
  git behind it is `/usr/bin/git` (2.50.1), never a wrapper of his. Every git a probe runs has `HOME` in scratch,
  `GIT_CONFIG_GLOBAL=/dev/null` and `GIT_CONFIG_NOSYSTEM=1`, so his own git settings and his global ignore file are
  never read. Every repository a probe opens is a scratch repository it made.
- **The spec step's instruments are kept for you: read them, do not import them.** Under
  `/private/var/tmp/tortie-wt/scratch/p370/spec/`: `bin/git` (the counting git, zsh), `app/driver.mjs` (one cell of the
  matrix, the audit or the no-regression readings per launch), `lockrun.sh` (a lock slot and a clean environment),
  `measure/` (`vitest.measure.config.ts`, `m1-parent-store.measure.test.ts`, `m2-parent-main.measure.test.ts`: the
  shipping store and service at the parent), `proto/` (`store-tail.ts.txt` and `make-proto.mjs`, which build
  `proto/ignored.ts`, the PROTOTYPE store; `ignore-line.ts`, the prototype of main's line; `store.proto.test.ts`,
  `line.proto.test.ts`; `vitest.proto.config.ts`; `vitest.shipping.config.ts`, which runs the shipping test files
  against the prototype), and `runs/<cell>/` (`reading.json`, the stand-in's `git.log`, `app.log`, `stdout.txt`) for
  every cell of §2. **The prototype is evidence, not the build**: the store builder writes
  `src/renderer/tree/ignored.ts` from §4.1.
- `-L gmux` is named only by `build/electron-run.mjs`'s census, and only with `list-sessions`. Never `pkill`, `killall`,
  a `pgrep` pattern or a negative pid; end only pids you started, each read again by `ps -p <pid> -o command=` right
  before its signal; every writer, stand-in, sleeper and app you start ends in a `finally`, and the count of your
  leftovers at the end is 0. Do not stop processes you did not start: his Tortie (a bare `Tortie` process, pid 782
  since the Mac restarted at 23:18 on 2026-11-23, 744 before; read it again yourself, the pid can change, and his
  sessions are in it), his tmux server, his other Claude sessions and his own tools above all. **His Tortie has
  the same bundle id as a packaged build**: never an Apple Event, `osascript` or `open` of an app; a quit is pressed
  through the harness. Never signal a probe while its own teardown runs.
- Never open, copy, read or stat-for-content his live Tortie profile, his keychain, credentials, `~/.ssh`, `~/Keys`,
  `~/.claude`, `~/.codex` or any agent's or conversation store; never open a crash report under
  `~/Library/Logs/DiagnosticReports`.
- **His shell history is never written by us.** Every command that does not launch an Electron or need `/bin/ps` runs
  under the history block: `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb <command>`, or
  `zsh /private/var/tmp/tortie-ops/sb.sh <dir> "<command>"` (a scratch HOME, a clean environment, node 22.23.1 first on
  PATH). The four `/bin/ps` native tests cannot pass inside it (`process-table.native` ×1, `ps.native` ×2,
  `p269-env-names` ×1): name each as it fails, never run them outside it. What needs `/bin/ps`, `lsof` or Electron runs
  OUTSIDE it with `HOME` and `ZDOTDIR` in your scratch, `HISTFILE=/dev/null`, `SHELL=/bin/sh`, `TERM_SESSION_ID` and
  `TERM_PROGRAM` unset, and you say so. NEVER run Electron, a smoke or a probe under `sandbox-exec`. Record only
  `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before and after every run (the spec step read `750910 1795488487`
  and `23166 1790702242`, unmoved across all 16 app runs; after the restart the first reads `751359 1795494835`, and the
  second spec step, which ran no app, left both there). A move across an unblocked run: start nothing for 3 minutes
  and stat again; moved again while nothing of yours ran is his; still moved means STOP and report.
- **No real agent runs, not even for a version.** This phase needs no agent at all: a probe hides every probed registry
  row (`writeHiddenAgents(profile, 'p370', hiddenAgentsBesides([]))`), reads `agents:list` back
  (`standInsOnlyVerdict(list, { standIns: [] })`), gives the app a closed PATH (the stand-in's folder and the system
  folders), and a session, where one is needed, is a plain shell. `conformance:resume:capture` and the full
  `conformance:resume` start real agents and are NOT run.
- `smoke`, `smoke:t1` and `smoke:t3` start Electron outside the helper: ONLY the main session runs them. No packaging
  in this phase's agents: the main session packages at landing. Every other Electron goes through
  `build/electron-run.mjs` inside `build/harness-socket.mjs` with a scratch profile, `HOME` and socket. No Simulator.
  No network: no Tailscale, DNS or APNs, no ssh to any host but the loopback scratch machine
  (`build/with-scratch-machine.mjs`, quiet shell, scratch far home, none of his keys), never `smoke:remote` or
  `smoke:machines`, never `gh`. Never import a `build/` script to inspect it; read it as text.
- The lock has three slots: `zsh /private/var/tmp/tortie-ops/lock.sh try p370-<role>` prints the slot or exits 1 (retry
  every 60 s in a NEW command); release with `zsh /private/var/tmp/tortie-ops/lock.sh release <slot>` in a trap or a
  `finally`. Every probe or Electron run holds one, no longer than the run. `df -h /` before any build or clone; under
  8 GB free, wait and report (66 GiB free at the spec step).
- **No dependency moves.** Never `npm install` or `npm ci`. `node_modules` and `build/vendor` are clones of his
  checkout's. Electron 45.3.4, node 22.23.1 at `/Users/gdc/.nvm/versions/node/v22.23.1/bin`.
- **The parent** is `/private/var/tmp/tortie-wt/wt-p370-parent`, a second detached worktree at `3aae4f89`, built once by
  the main session (`/private/var/tmp/tortie-wt/scratch/p370/main/parent-build.log` ends `exit 0`). Nobody edits or
  installs anything in it.

## 0.1 What the entry and the parent reading give, measured (the tree and the measurements win; each binds)

Everything here was read at `3aae4f89` and, where it can be run, run at it; §2 holds the numbers.

1. **Every line the entry cites is where it says**, with two small drifts: `GitService.checkIgnore` is
   `src/main/git/service.ts:719-741`, and `readInto` is `src/renderer/tree/store.ts:258-285` (its one `set` a folder is
   `:262-271`). The rest stands as written: `FilesSection.tsx:363-368`, `store.ts:559-611`, `use-tree-model.ts:371-374`
   and `:747-773`, `ignored.ts:358-436` (`:392-395`, `:406`, `:423`, `:428-434`), `:438-451`, `:317-325`, `:105`, `:84`,
   `src/main/git/ipc.ts:323-326`, `src/main/git/exec.ts:59`, `src/renderer/tree/git-status.ts:69-89`,
   `src/renderer/state/repo-changed.ts` (150 ms).
2. **THE PILE-UP NEEDS NO WRITER (the entry does not say this).** The tree remembers the folders a person had open,
   up to 500 of them (`saveExpanded`, `use-tree-model.ts:159-169`), and re-reads every one the moment the tree is
   shown (`:730-735`, one `loadDir` each). Each listing lands with its own `set`, each `set` runs the ignore effect,
   and each run starts a call. Measured in the real app with no writer at all: **12, 102 and 502 `git check-ignore`
   children alive at once** for 10, 100 and 500 remembered folders (the root and one more folder beside them), each
   asking every path listed so far (505 to 1,506 paths a call at 500 folders, 505,011 paths on stdin in all). His 515
   processes of one age are this burst or one change's: both start one call a cached folder.
3. **One call a folder a change, as the entry reads it.** 879 calls over 74 changes at 10 folders (11.9 a change) and
   3,724 over 37 at 100 (100.6 a change): React does not fold the listings together. Inside a revalidation every one of
   them carries every loaded path (§2.1 R).
4. **A late answer is dropped, as the entry reads it.** Of a burst of N+1 none lands before the last is answered, and
   exactly one lands (§2.1 B). Under a writer whose changes come faster than git answers, nothing lands at all and the
   revalidation never clears (§2.1 F: 0 landings in a minute in every cell).
5. **Main starts whatever it is asked** (§2.2 L: one `GitService` asked 100 times while git is held runs 100 children
   at once), and today every way git can fail to answer reads as "nothing is ignored": no git on PATH, the 30 s stop,
   a signal (`runGit` resolves with code −1, `exec.ts:192`), and any other exit (3, 129) all answer `[]` (§2.2 X, K).
6. **The Files section, collapsed** (read, not run: arm A10 drives it). `FilesSection` keeps its subscription while
   collapsed (`:354-375` does not read `collapsed`), so every change still re-reads every cached folder and still calls
   `invalidate`; the tree itself is unmounted (`:482-483`), so nothing syncs. Opened again, the folders are already
   cached (`loadDir` returns at `store.ts:503`), so the opening itself is one sync, and a collapsed folder keeps its
   listing, so "every cached folder" is every folder opened since the project was shown plus every folder the
   remembered set restored. **One tree at most is ever mounted**: `Sidebar.tsx:475` is the only
   mount of the section, the sidebar is mounted only while it is visible (`App.tsx:363`), the tree only in the Explorer
   view (`Sidebar.tsx:426-482`), and the Settings window has no sidebar. A project opens on Source Control
   (`SIDEBAR_VIEW_DEFAULT`, `state/sidebar-views.ts:67`), so the burst of item 2 comes when the Explorer is shown.
7. **The neighbour holds only once the Changes store has answered (corrected by the fix round).** From then on
   `git status` runs one at a time and one behind it (`src/renderer/state/git.ts:227-243`): 1 alive. Before its first
   answer `FilesSection` starts a `git status` of the tree's own on every change with none in flight
   (`if (!externalStatus) void refreshStatus()`), so with `status` ALONE held 10 s a verifier read **13 alive at the
   parent and 11 at HEAD**. The "1" of §2.4 was read with every other command held too, which slowed the changes. **A second pile-up
   was found beside it** and is written down for him, not fixed here (§2.4, §14 Q1): the History store starts four
   reads on every change with none tracked (`src/renderer/scm/depth.ts:703-719`), 227 to 355 git children at once
   under a git held 10 s, whatever the tree's size.
8. **Entry item 3's "asked once per tick at most" does not follow from "the next listing".** A tick delivers one
   listing a cached folder, so a git that fails fast would be asked again by the very next listing: 51 calls a tick at
   100 folders and 250 at 500 in the prototype with the entry's literal rule (§2.6 X). D7 adds a one second hold after
   a failure, and one deferred ask for a listing that came inside it; the price is ONE edit to a shipping test (§7.1).
9. **Entry item 2's "the same epoch, else dropped" never lands under a git slower than the 10 s floor.** Under a
   writer the epoch moves every 10 s, so every call of a 12 s git straddles a move: 0 landings in 120 s in the
   prototype, and only 2 at 9 s (§2.6 F). D5 lands a full ask's answer on screen and settles nothing with it.
10. **Entry item 1's "at most one call at any moment" is held per folder, not across a project switch.** Waiting for
    the folder just left before asking about the folder just shown would make the new project's dimming wait for the
    old project's git, which is worse than today. D4 abandons the call instead (its answer is dropped, as today), and
    main's line (D9) is what keeps the folder left at one child.
11. **What one change costs the Explorer at 500 folders, left as it is** (the entry's first NOT): 502 `fs:readDir`
    calls and 502 store sets (§2.1 S), about 215 to 227 ms of the page's own thread a change in the real app (§2.3),
    71 ms of it rebuilding the tree input 502 times and 35 ms the 502 settled syncs (§2.1 C, in node). §14 Q2.

## 1. The answer first

| # | What | One line |
| --- | --- | --- |
| 1 | One call in flight (item 1) | The store holds one `git:checkIgnore` call for the folder it shows. A `sync` that arrives while it runs records the newest listing, starts nothing and reads no path |
| 2 | An overtaken answer lands (item 2) | The answer lands when the store still shows that folder. Listings that arrived meanwhile are no reason to drop it |
| 3 | One call behind it (item 3) | When a call ends well, the store looks at the newest listing once and starts at most one more: everything again if a revalidation is owed, else only the paths nobody has answered for |
| 4 | Never a loop (item 3, measured) | A failed call starts nothing by itself, nothing starts for a second after it, and a listing that came meanwhile is asked about once when that second ends |
| 5 | A git that did not answer (item 4) | `GitService.checkIgnore` answers for exit 0, 1 and 128 and REJECTS for everything else: it could not start, the 30 s stop, a signal, any other exit. The store keeps the set on screen |
| 6 | Main holds the same line (item 5) | Per repository path one `git check-ignore` child runs, one call waits, a newer call takes the waiting place and the displaced one rejects; the running child is never ended for a newer call |
| 7 | The rows (item 6) | Each of 1 to 6 has vitest rows that go red when it is removed (§7), and one row pins that the store and the service are the only doors |
| 8 | The proof | `probe:p370` (new): the matrix at both builds counted from outside the app, the attack arms, and the no-regression readings, alternated with the parent |

### 1.1 The decisions, each with its reason

| Id | Decision | Reason (where it comes from) |
| --- | --- | --- |
| D1 | **One call for the folder shown.** The store keeps the round it is waiting on (`flight`) and starts no second one while it is out | Entry item 1. Measured: N+2 at once at the mount and on every change (§2.3); the prototype over the same listings starts 1 (§2.6 B, R) |
| D2 | **A `sync` while a call runs records the newest listing (target, paths, link folders) and does nothing else**: no `pathsToAsk`, no `coveredByIgnored`, no `set` | Entry item 1 ("it does no per-path work either"). At the parent each of the 502 syncs of a tick scans every loaded path (35 ms a quiet tick in node, §2.1 C). Not a regression for a file written under an ignored folder: at the parent, too, that row gets its entry only when an answer lands, because while anything is unanswered every sync asks instead of committing (§4.1) |
| D3 | **What `sync`'s promise settles on.** A sync that starts a call settles when THAT call ends, landed, dropped or failed: in the turn the call behind it is started, so before that call's answer can land. A sync that arrived while a call ran is carried by the call started behind it, or settles when the running call ends with nothing left to ask, or when it fails. With nothing to ask it settles at once. It never rejects. `sync` returns the round's own promise: it is NOT an `async` function, and nothing is awaited between a round's last step and its return | Entry item 1 ("a caller that awaits it reads what it read before"). The shipping test `drops an answer that was in flight when the rules changed` awaits a sync and reads the set before the call behind it lands; an `async` wrapper, or one more awaited turn at the round's end, lets that call land first. The prototype passes all 86 shipping tests this way (§2.6) |
| D4 | **Leaving the folder abandons the call**: `reset`, a new target and a target on another machine take the call out of the store at once. Its answer is dropped when it comes, as today, and the folder now shown is asked at once | Entry item 2 ("`reset`, a new target and `forget` still drop it, as today"); the not-waiting half is NEW, from his no-regression ruling: at the parent a project just shown is asked at once. Two calls can therefore be outstanding across a switch, one a repository, and a switch back makes a second for the first folder, which D9 holds behind the first (§2.6 T) |
| D5 | **The landing rule.** Same folder and same epoch: the answer lands as today (a growing ask merges, a revalidation replaces) and is recorded as answered. Same folder, epoch moved while git ran: a REVALIDATION's answer still replaces the set on screen but settles nothing (the revalidation stays owed, nothing is recorded as answered), and a growing ask's answer is dropped as today | Entry item 2, and the task's measurement: with the entry's drop a 12 s git under a writer landed nothing in 120 s and a 9 s git twice; with this rule 8 and 11 times (§2.6 F). It never shows a set older than the one on screen, because calls run one after another: every landed answer comes from a call started after the one that produced the set it replaces. It adds no call: the call behind it is owed either way |
| D6 | **The call behind it.** After a call that ended well the store looks at the newest listing ONCE: a revalidation owed AND a listing that came while the call ran (the fix round: without one nobody is looking, and it stays owed) → one full ask, replace arm; else the paths `pathsToAsk` still returns → one growing ask, merge arm; else nothing starts and the paths the set already covers are spelled out for the newest listing | Entry item 3. More than 20,000 paths end as a chain, one call at a time (50,000 paths: 20,000, 20,000, 10,000, §2.6 M); each landed call records what it asked, so the chain ends |
| D7 | **The failure rule.** A call that failed starts nothing by itself. For `RETRY_AFTER_FAILURE_MS` (1,000) after it a sync records and starts nothing. A listing that arrived while the failed call ran, or inside that second, arms ONE timer for the rest of the second, which pumps once; so does a failed call that was itself the one BEHIND another, or that carried recorded listings (the fix round); with none of these nothing is armed, and the next sync asks. `reset`, a new target and a target on another machine clear the hold and the timer | Entry item 3 ("the next attempt waits for the next listing … never in a tight loop"), corrected by §0.1 item 8: without the hold a git that fails in 2 ms is asked 6,800 to 30,000 times a minute at 100 to 500 folders, one at a time; with it, 60 to 66 (§2.6 X). THE TIMER is the no-regression half: the first draft dropped a listing that came inside the hold, and a first call that failed once over ten listings then left a quiet tree undimmed for good, where the parent, whose later listings ask for themselves, dims all of it (§2.6 Y). It cannot loop, because each retry needs a listing newer than the call before it, or an answer that landed before the call that failed: the retry's own call is never the one behind another. **The fix round's reading**: with only the late listings counted, ONE failure of the SECOND call of a mount left 2 of 12 ignored rows dimmed for good on a quiet tree where the parent dims 12 |
| D8 | **Which exits answer.** `runGit` rejecting (git could not start, the 30 s stop, the output cap) REJECTS. Exit 0 → the paths git printed. Exit 1 → `[]`. Exit 128 → `[]`, as today. Every other code, −1 (a signal) among them, REJECTS with `GIT_FAILED` | Entry item 4. Measured against git 2.50.1 (§2.2 X): 128 is "not a repository", a path outside it, a path past a link, a link spelled as a folder, a corrupt index; 129 is an option git does not know. 128 stays an answer because the two shipping tests that pin it stay unedited and nothing measured refutes it; a 128 on a revalidation still empties the set, as today, and RULE 6 is what keeps the tree from causing one |
| D7b | **A replacement replaces what it ASKED about** (the fix round). A row on screen that is still listed and that the replacement did not ask about (past the 20,000 cap, or listed again while git ran) stays (`unconfirmed`) until the call behind it asks about it, and so do the rows under such a folder. An unconfirmed entry excuses no path from the ask, so a row that stopped being ignored leaves one call later | A verifier's reading: from a settled 25,000 row tree a writer's revalidation emptied 4,500 dimmed rows to 0 in 84, 254 and 241 of 267 ticks at 3, 6 and 12 s a call, where the parent kept every one. §4.1 |
| D9 | **Main's line**, in a new module `src/main/git/ignore-line.ts`, one line for the process, keyed by `GitService.repoPath`, entered inside `GitService.checkIgnore` around its one `runGit`. One job runs; a call that arrives meanwhile waits; at most one waits; a newer call takes the waiting place and the displaced one rejects `GIT_FAILED` ("…was superseded before it started", the sentence `exec.ts:70-75` already uses); the next starts when the running one has SETTLED, whichever way | Entry item 5. Keyed by path and not held on the `GitService`, because `unwatchGitRepo` drops a service (`git/ipc.ts:239`) and a second one for the same folder would have a line of its own. Measured in the prototype: never two running over 2,000 mixed calls, the newest wins, another repository is not held, a failed job frees the line (§2.6 L) |
| D10 | **The contract does not move**, and neither do `src/shared/**` (but for ONE doc comment, `src/shared/ipc/git.ts:339-342`, whose "a failed read … resolve to `[]`" stops being true; the integrator edits the words, and `gate:contract` still reads byte for byte), `src/preload/**`, `src/main/git/ipc.ts`, `src/main/git/exec.ts`, `src/renderer/tree/use-tree-model.ts`, `FilesSection.tsx` or `store.ts` | Nothing in the design needs them. The integrator proves it with one `git diff --stat` (§11) |
| D11 | **CLAUDE.md: no row in the path-triggered table, one row in the probes table** | §7.5 |
| D12 | **One door, pinned as text.** A vitest row reads the tree: under `src/renderer` only `tree/ignored.ts` calls `git.checkIgnore`, and under `src/main` the argv `'check-ignore'` is written once, in `git/service.ts`, inside the job handed to the line | Entry item 5 ("no … later defect in a renderer can start a second one"): a second caller would walk past every rule here with every other row green |
| D13 | **`ablation:p343`'s two anchors in the store move with the code**: `        ? pathsToAsk(paths, NONE, NONE, linkFolders)` and `        ).map((path) => canonicalAnswer(path, linkFolders));` (`build/p343/ablation.mjs:562-572`, arms a-ig3 and a-ig4). They are matched with their indentation, and `pump` sits one level shallower than `sync`'s body did, so the `store` builder writes the natural shape, returns the two new lines exactly, and the integrator re-anchors both arms in the same commit and shows each red on its own owner. a-ig1 and a-ig2 are in the pure half and do not move | Those arms are RULE 6's attack. An anchor that no longer matches is an attack that silently stopped attacking, and code bent to keep an indentation is worse than an anchor moved |
| D14 | **No new word a person reads, and no log line a call.** The two `GIT_FAILED` sentences are drawn nowhere: the store's catch is their only reader. Electron itself writes one line to main's stderr for a handler that rejects (`Error occurred in handler for 'git:checkIgnore'`, in the framework's own code at 45.3.4); nothing writes one to `app.log`, and D7 bounds it at about one a second | Just enough words; the entry's fourth NOT |
| D15 | **The stand-in is zsh and starts no child for a held call** (`$EPOCHREALTIME`, `zselect`, `sysread`), and holds BEFORE it reads its stdin | §0: the count must not cost his CPU. Held first, a sleeping stand-in is an idle zsh: 2.5 MB resident against 4.1 MB when it read first (§2.3) |

## 2. What the spec step measured, how, and the numbers

Every Electron ran through `build/electron-run.mjs`'s `withElectron` (`program: 'app'`, `cwd` the parent, `tmuxSocket`
the harness socket, so the census read his session names once before and once after each launch) inside
`build/harness-socket.mjs --fresh gmux-p370s`, by `zsh -f lockrun.sh <cell> …` (a lock slot taken and released by a
trap; `env -i` with `HOME`, `ZDOTDIR` and `TMPDIR` in scratch, `HISTFILE=/dev/null`, `SHELL=/bin/sh`). Every other
command ran under the history block. Electron 45.3.4, node 22.23.1, git 2.50.1, 12 cores, macOS 15.

### 2.1 The shipping store at the parent, over a fake bridge that counts calls in flight (`measure/m1-parent-store.measure.test.ts`, 19 tests, vitest under the history block)

The listing: the root (N folders, `.gitignore`, `root.log`) and two files a folder, one of them ignored. One sync a
listing, as the app delivers them (§0.1 item 3).

| Arm | N = 10 | N = 100 | N = 500 |
| --- | --- | --- | --- |
| **B** N+1 listings landing while git is held: calls started / most in flight | 11 / 11 | 101 / 101 | 501 / 501 |
| B paths on stdin in all (largest one ask) | 242 (32) | 20,402 (302) | 502,002 (1,502) |
| B answers landed before the last was answered / in all | 0 / 1 | 0 / 1 | 0 / 1 |
| **R** one change inside a revalidation, N+2 syncs: calls, each asking | 12, all 32 loaded paths | 102, all 302 | 502, all 1,502 |
| R paths on stdin in all; rows shown while held | 384; 11 of 11 | 30,804; 101 of 101 | 754,004; 501 of 501 |
| **S** `refreshLoaded`: `fs:readDir` calls / new listing objects | 11 / 11 | 101 / 101 | 501 / 501 |
| **C** one quiet tick in node: tree input rebuilt N+1 times / N+1 settled syncs (both runs, §2.8) | 0.2 / 0 ms | 4.8 to 6.2 / 1.2 to 2.1 ms | 71 to 89 / 35 to 49 ms |
| **Y** the first call fails, N listings follow, then a quiet tree: calls / rows dimmed | 11 / 11 of 11 | not run | not run |

**F**, the feed: a tick every 450 ms that adds one ignored file and calls `invalidate`, as `FilesSection` does.

| N, git | Calls a minute | Most in flight | Full asks | Landings while the writer ran | First landing once it stopped |
| --- | --- | --- | --- | --- | --- |
| 10, 1 s | 1,469 | 34 | all | 0 | 1.2 s |
| 10, 10 s | 1,469 | 255 | all | 0 | 10.2 s |
| 100, 1 s | 13,439 | 304 | all | 0 | 1.2 s |
| 100, 10 s | 13,439 | 2,325 | all | 0 | 10.2 s |
| 500, 1 s | 66,138 | 1,504 | all | 0 | 1.2 s |
| 500, 10 s | 65,140 | 11,524 | all | 0 | 18.5 s |

The two 500 folder rows ran 20 s and 12 s of ticks, the others 60 s; the calls a minute are scaled. The last row is more children than this Mac allows one user (`kern.maxprocperuid` 8,000), which is why the app cells
below run behind a fuse.

### 2.2 The shipping service at the parent, against git 2.50.1 and the stand-in (`measure/m2-parent-main.measure.test.ts`, 5 tests)

| What git was given | git's own exit | The parent answers |
| --- | --- | --- |
| some ignored | 0 | the ignored subset |
| none ignored | 1 | `[]` |
| a path outside the repository | 128 | `[]` for the whole batch |
| a path past a link; a link spelled as a folder | 128 ("beyond a symbolic link") | `[]` for the whole batch |
| a link spelled as a leaf | 0 | answered |
| a folder that is not a repository | 128 | `[]` |
| a corrupt index | 128 | `[]` |
| an option git does not know | 129 | (not reachable through the service) |
| git ended by SIGKILL while held | `runGit` resolves `code: -1` | `[]` |
| the timeout (`runGit` at 300 ms) | `runGit` rejects `GIT_FAILED`, "took too long" | `[]` (the service's catch) |
| no git on PATH | `runGit` rejects `GIT_FAILED` | `[]` |
| a git that exits 3 | 3 | `[]` |

**L**: one `GitService` asked 10 and 100 times while the stand-in holds 1 s: 10 and 100 children started, 10 and 100
alive at once, every one answered (1,016 and 1,137 ms).

### 2.3 The real app at the parent: Method 1's baseline (`app/driver.mjs`, one launch a cell)

The fixture: a scratch repository holding N folders `d0001…` (a tracked `a.txt` and an ignored `b.log` each), the
writer's own folder `w/`, an ignored folder, `.gitignore` (`*.log`, `ignored/`) and one uncommitted change; N+2 folders
cached (the root, `w/` and the N). **How N folders get cached: the persisted expansion set**, `gmux.treeOpen.<root>`,
seeded through the drive hook's own `localStorage` field before the project opens
(`window.__gmuxShotDrive({ projectPath, localStorage, sidebarView: 'explorer' })`, `src/renderer/editor/shot-hook.ts:560`),
because that is the path a person's tree takes at every launch and every project switch, and it needs no store handle
on `window`. The writer adds one file to `w/` every 200 ms; main sends about 2.5 changes a second. The counting git is
first on the app's PATH; every count is read from its log, outside the app. Above 520 held children the driver blows
the fuse (the stand-in stops holding and the writer stops), and the stand-in itself stops holding at 560.

| Cell | Mount, no writer: started / most alive at once | Writer: seconds, changes | Started (a minute) | Most alive at once | Load, 1 min, before → after |
| --- | --- | --- | --- | --- | --- |
| 10, real git at its own speed (18 to 35 ms a call) | 12 / 11 | 30 s, 75 | 137 (274) | **13** | 19.9 → 13.1 |
| 10, held 1 s | 12 / 12 | 30 s, 74 | 879 (1,757) | **37** | 13.1 → 13.1 |
| 10, held 10 s | 12 / 12 | 30 s, 75 | 891 (1,782) | **313** | 13.1 → 12.4 |
| 100, held 1 s | 102 / 102 | 15 s, 37 | 3,724 (14,894) | **307** | 11.1 → 22.4 |
| 100, held 10 s | 102 / 102 | 2.7 s, 6 | 588 (13,164) | **556**, the fuse after 2.6 s | 22.4 → 17.8 |
| 500, held 1 s | **502 / 502** | 1.5 s, 3 | 613 (24,768) | **566**, the fuse after 1.4 s | 7.7 → 10.2 |
| 500, held 10 s | **502 / 502** | 1.2 s, 3 | 589 (29,697) | **559**, the fuse after 1.1 s | 10.2 → 12.9 |

Every call of a writer phase asked every loaded path (36 to 181 at 10 folders, 306 to 375 at 100, 1,506 to 1,509 at
500). The parent shows the pile-up at every cell, the mount alone included, so no widening was needed. In the two 500
cells the page's own thread was busy 221 and 227 ms a change (three changes each). **After the fuse** the parent went on
starting what it had already been asked: 30 children (100 folders, 10 s), 1,397 (500, 1 s) and 919 (500, 10 s) in the
drain, unheld and answered at once, with 529, 606 and 789 alive at once. Those are its own pile-up with no hold at all
(each was alive a median of 109 to 125 ms at 500 folders, because hundreds started together), and they are why §8.1 ends
a fused launch at the fuse. A held stand-in holds 1.6 MB at 10
folders and 2.5 MB at 500 (1,236 MB resident for the 502 of a mount); before its hold was moved ahead of its read it
held 4.1 MB at 100. Memory read 20 to 24 percent free around these cells and swap did not grow across them (9,022 MB
before the first, 8,958 after the last). His history, the leftovers (0) and the census held at every cell.

### 2.4 The audit: every other git call a repository change starts, under the same held git (numbers only)

N of 10, the same writer for 30 s (74 to 75 changes), `check-ignore` left to real git, every OTHER subcommand held by
the stand-in before real git runs it; the children alive are sampled from the process table every 250 ms, because main
ends a History walk a newer one replaces and such a child writes no end line.

| Subcommand | Who starts it on a change | Started in 30 s (with nothing else shown) | Most alive at once, held 1 s | Held 10 s, Source Control looked at again and a diff tab open | Held 10 s, the project opened and the Explorer shown, nothing else |
| --- | --- | --- | --- | --- | --- |
| `for-each-ref` | the History store's branch and remote reads, and its walk's first round (`scm/depth.ts:703-719`) | 296 (222) | 12 | **104** | **78** |
| `remote` | the same store's remotes read | 222 (148) | 9 | **78** | **52** |
| `rev-parse` | its walk's first round | 197 to 220 (123) | 9 | **76** | **50** |
| `symbolic-ref` | its walk's first round | 197 to 220 (123) | 9 | **76** | **50** |
| `log` | its walk (Phase 199's queue ends the one before it) | 98 to 144 (49) | 4 | 26 | 1 |
| `status` | the Changes store, one in flight and one behind it (`state/git.ts:227-243`) | 3 to 29 (3) | 1 | 1 | 1 |
| `show` | the editor's walk of open diff tabs, one walk at a time | 3 to 29 (none) | 1 | 1 | — |
| all of them | | | 45 | **355** | **227** |

`show` is bounded, and `status` is bounded once the Changes store has answered once (corrected by the fix round: the 1 of
this table was read with every command held, which slowed the changes themselves; with `status` alone held 10 s from
the project's opening, a verifier's own counter and the process table agree on 13 alive at the parent and 11 at HEAD,
because the tree starts a status of its own on every change until that first answer; §0.1 item 7). The History store is not: one batch of four reads a change with none tracked, so
under a git held 10 s it holds 227 to 355 children at once at any tree size, and it is live from the moment a project
opens, because Source Control is the first view a project shows. Not fixed here (§12, §14 Q1). Load, 1 minute: 7.7 to
10.5 before and after each of the three runs.

### 2.5 The no-regression baselines at the parent (3 folders, real git, a quiet tree; `P370_LAT=a` and `b`)

| Reading | The parent | Load, 1 min |
| --- | --- | --- |
| The first row drawn after the project opened; the first dimmed row after the first row | 874 ms; 82 and 50 ms | 40 to 51 |
| A new ignored file dims, from its write (three times) | 706, 567, 574 ms | 40 to 46 |
| Phase 47.1's frames: a writer for 25 s (124 files), four always-ignored rows read at every painted frame | 3,191 frames, **0** drew one undimmed, 0 episodes | 40 to 46 |
| A rule added to `.gitignore` on a quiet tree shows; taken away shows | 547 ms; 524 ms | 46 to 51 |
| The same rule added again 2 s later, inside the 10 s floor | 7,968 ms | 46 to 51 |

One more cell, said because it may have moved his load: 500 folders with the stand-in answering at once and a writer
every 3 s (`p-n500-0s`): 502 children at the mount, 46 alive at once; 516 more over six changes, 70 at once; the page's
thread busy 215 ms a change, the longest block 226 ms; the load read 16.2 before and 45.1 after.

### 2.6 The prototype: what the design reads beside the parent, over the same listings (`proto/*.proto.test.ts`, 33 tests: 29 the store's, 4 the line's)

| Arm | The parent (§2.1) | The prototype |
| --- | --- | --- |
| **B** N+1 listings while git is held (N of 10, 100, 500) | N+1 calls, N+1 in flight, 1 landing | **1** call in flight; its answer lands though N listings arrived; **2** calls in all (the second asks the 20, 200, 1,000 paths still unanswered); every ignored row dimmed |
| **R** one change inside a revalidation | N+2 full asks | **1** full ask, 1 call in all; the rows on screen never fewer |
| **F** ticks, git 1 s | 1,469 to 66,138 calls a minute, 0 landings | **60** calls a minute at every N, 1 in flight, 53 landings in the minute |
| F git 10 s | 255 to 11,524 in flight, 0 landings | **6** calls a minute, 1 in flight, 3 landings in the minute, the first that changes a row at 30 s; every row dimmed 10.3 s after the writer stopped |
| F git 12 s, the entry's drop | — | **0** landings in 120 s; 101 of 367 ignored rows dimmed when the writer stopped |
| F git 12 s, D5 | — | 8 landings in 120 s; 315 of 367 |
| F git 9 s, the entry's drop / D5 | — | 2 landings in 120 s / 11 |
| **X** a git that fails in 2 ms, listings 1 ms apart, without D7's hold | N+1 a tick, at once | 51 calls a tick at 100 folders (6,800 a minute), 250 at 500 (30,000), one at a time |
| X with the hold and the one timer (D7) | | **60 a minute at 100 folders and 66 at 500** (9 calls in 9 s, 11 in 10 s), 0 or 1 a tick; at most 1 call in a quiet minute after |
| **Y** the first call fails, ten listings come (while it runs, or after), then a quiet tree | 11 of 11 rows dimmed, 11 calls | without the timer **0 of 11**, for good; with it 11 of 11 in 1 s, 2 calls. A failure with no listing after it: 1 call in a minute. `reset` inside the second: 1 call |
| **T** a project switch and back mid-call | not run (read: every sync with something to ask starts its own call) | the new folder is asked at once; 2 outstanding for the first folder after the switch back (D9 holds the second); no abandoned answer lands |
| **W** 100 syncs while a call runs | not run (read: `sync` builds its ask before it awaits, `ignored.ts:392-395`) | **0** paths read; the call behind it asks the one new path |
| **M** 50,000 loaded paths | not run (read: one ask of 20,000 a sync) | 3 calls in a chain (20,000, 20,000, 10,000), one at a time, 5,000 dimmed |
| **L** main's line over fake jobs | — | one runs, one waits, the newest takes the place (`ok, superseded, superseded, ok`); another repository is not held; a failed or throwing job frees the line; never two running over 2,000 mixed calls |
| The three shipping test files and their two neighbours, unedited, against the prototype | 86 pass | **85 of 86** with D7's hold (the one that fails is §7.1's named edit, and with that one line added its file reads 16 of 16); **86 of 86** with the hold off; the same three readings with D7's timer added |

### 2.7 The spec step's commands, exit codes and numbers

| Command | Exit | Numbers |
| --- | --- | --- |
| `stat -f '%z %m' ~/.zsh_history ~/.bash_history` (start, after every batch, and in every `lockrun` before and after) | 0 | `750910 1795488487`, `23166 1790702242` every time |
| `df -h /`; `git rev-parse HEAD`; `git status --short` in the worktree (history block) | 0 | 66 GiB free; `3aae4f89…`; clean before this file |
| reads of the tree, the entry, Phases 47.1 and 155, `docs/method/HOW-WE-VERIFY-THIS.md`, `build/p365/SPEC.md`, `build/p347/SPEC.md`, the helpers (history block) | 0 | §0.1, §3 |
| `vitest run --config measure/vitest.measure.config.ts` (M1; history block) | 0 | 18 passed; the largest feed cell rerun over 12 s after it timed out at 120 s real over 20 s |
| the same with `P370_INCLUDE=measure/m2-parent-main.measure.test.ts` (M2) | 0 | 5 passed, 3.5 s; load 63 |
| `vitest run --config proto/vitest.shipping.config.ts`, three times (hold on, hold off, the entry's drop) | 0 | 85 of 86; 86 of 86; 85 of 86 |
| `vitest run --config proto/vitest.proto.config.ts` (store and line) | 0 | 23 and 4 passed |
| `zsh -f lockrun.sh` × 16 (`t-n10-real`; `p-n10-real`, `p-n10-1s`, `p-n10-10s`, `p-n100-1s`, `p-n100-10s`, `p-n500-1s`, `p-n500-10s`; `a-n10-1s`, `a-n10-10s`, read from the log alone and superseded by `a2-n10-1s`, `a2-n10-10s`, `a2-explorer-10s`; `lat-a`, `lat-b`; `p-n500-0s`), and three more that started nothing | 0 for the 16; 3 for the three (memory read 18 percent free: refused, waited, rerun) | §2.3 to §2.5; slot `electron.lock` each time, released by its trap; about 30 to 80 s a cell |
| one Bash call the permission system refused (a five-process memory sample of the stand-in) | not run | read instead inside the driver: 1.6, 2.5 and 4.1 MB a held stand-in |
| the Electron count (CLAUDE.md's command, outside the block, once, at the end) | 0 | none of this phase's: his Tortie (744) and its crash handler (2075), and Cursor's, Chrome's and Slack's crash handlers; no `p370` socket under `/private/tmp/tmux-501/`; all three lock slots free; no process naming the scratch but the shell that asked |

### 2.8 The second spec step (after the restart of 23:18), and what it changed

Every file of §2 survived. `…/spec/rederive.mjs` reads every `runs/*/reading.json` and `stdout.txt` again and prints the
numbers of §2.3 to §2.5; every cell agreed. Rerun under the history block at a load of 10 to 14: M1 and M2 (24 passed,
exit 0, every count as written; arm Y added), the prototype with its Y arm (49 passed with the edited shipping copy: 29,
4 and 16), the shipping files three ways (85 of 86, 86 of 86, 85 of 86). No app was launched and no lock slot taken; no
process of the first step is alive, all three slots are free. His history `751359 1795494835`, `23166 1790702242`, before
and after. It changed: D7 (the one timer, with Y as its reason), D13 (the anchors move), D14 and §4.2 (what a rejected
handler does write), D10 (the one comment in `src/shared/ipc/git.ts`), §2.1 C and §2.6 F 10 s (the readings), §2.3 and
§8.1 (a blown fuse ends its launch), A5's bound.

Not run, and why: the parent's build (the main session built it; `parent-build.log` ends `exit 0`); HEAD in the app
(there is no HEAD yet); real git above 10 folders (§0); `probe:p343` (the verifiers run its L5 at both builds, §10.4).

## 3. The tree at this head: the paths each item touches

**The store (items 1 to 3, D1 to D7).** `src/renderer/tree/ignored.ts`: the header `:1-67`, `MAX_ASK` `:84`,
`INVALIDATE_MIN_MS` `:105`, the pure half `:107-257` (unchanged: `pathsToAsk` `:189-206`, `coveredByIgnored`
`:163-174`, `canonicalAnswer` `:135-140`), the state's type `:259-298` (its three verbs keep their signatures), and
the store `:300-470`: `answered` `:306`, `syncSeq` `:307` (goes), `forget` `:317-325`, `commit` `:340-351`, `sync`
`:358-436`, `invalidate` `:438-451` (unchanged), `reset` `:453-468`. Its callers, read and unchanged: the effect
`src/renderer/tree/use-tree-model.ts:747-773` (`void syncIgnored(…)`, `resetIgnored()` for a folder that is not a
repository or is on another machine), `FilesSection.tsx:363-368` and `:385-402` (`invalidateIgnored()`),
`src/renderer/tree/shot-probe.ts:389` (a read).

**Main (items 4 and 5, D8, D9).** `src/main/git/service.ts`: `CHECK_IGNORE_MAX_PATHS` `:119`, `checkIgnore` and its
header `:702-741`. New: `src/main/git/ignore-line.ts`. Read and unchanged: `src/main/git/exec.ts` (`runGit` `:59-198`;
the timeout `:118-126`; `fail` ends the child and rejects `:139-146`; a signal resolves `code: -1` `:186-197`),
`src/main/git/ipc.ts:323-326` (the handler), `:64-80` and `:233-244` (services are dropped with their project tab),
`src/main/typed-ipc.ts:29-62`, `src/preload/git.ts:53`, `src/shared/ipc/git.ts:343`.

**Tests that hold these files today** (each must stay green, unedited but for §7.1's one line):
`src/renderer/tree/__tests__/ignored.test.ts`, `ignored-store.test.ts`, `p343-ignored-links.test.ts`,
`p343-link-hooks.test.ts`, `decorations.test.ts`; `src/main/git/__tests__/check-ignore.integration.test.ts`.

**Scripts that read these files as text**: `build/p343/ablation.mjs:550-572` (four exact strings of `ignored.ts`,
D13); `build/conformance-historysearch.mjs:351` and the two probes beside it import `service.ts`
(`conformance:historysearch`, `conformance:filehistory`); `build/conformance-machines.mjs:8356-8364` reads
`COMMIT_TIMEOUT_MS` out of `service.ts` (do not move it).

**No sentence anywhere names Phase 370 today** outside the backlog.

## 4. The design, item by item (real paths; the builder named on each)

### 4.1 The store (builder `store`): `src/renderer/tree/ignored.ts`

The pure half and the three verbs' signatures do not move. `syncSeq` goes. The store's private state becomes:

```ts
let answered = new Set<string>();          // as today
let revalidating = false;                  // as today
let lastInvalidateAt = 0;                  // as today
let invalidateTimer: ReturnType<typeof setTimeout> | null = null; // as today
/** The ONE call the store is waiting on for the folder it shows, or null. */
let flight: Round | null = null;           // { epoch, replace, ask, linkFolders }
/** The newest listing the tree handed over. Every sync records it. */
let newest: { target: WorkspaceTarget; paths: Iterable<string>; linkFolders: ReadonlySet<string> } | null = null;
/** Syncs that arrived while a call ran, settled with the call behind it. */
let waiting: Array<() => void> = [];
/** When the last call failed, or 0. */
let failedAt = 0;
/** One timer, armed only by a listing a failure left unanswered (D7). */
let retryTimer: ReturnType<typeof setTimeout> | null = null;
export const RETRY_AFTER_FAILURE_MS = 1_000; // beside INVALIDATE_MIN_MS, at module level
```

- **`sync(target, paths, linkFolders)`**, a plain function that returns a promise (D3). A target on another machine:
  as today, and it LEAVES (below). No bridge: a settled promise. A target that is not the one held: as today
  (`answered` cleared, `revalidating` false, `set({ target, ignored: NONE })`), and it leaves the old folder first.
  Then `newest = { target, paths, linkFolders }`. If `flight !== null`: push a waiter and return its promise, nothing
  else (D2). If a call failed less than `RETRY_AFTER_FAILURE_MS` ago: arm the retry if none is armed, for
  the rest of that second, and return a settled promise (D7). Otherwise clear an armed retry and `pump()`. The retry,
  when it fires, pumps only if no call is in flight.
- **`pump()`**, the only place a call starts. It reads `newest` once. `replace = revalidating`; the ask is built
  exactly as today, through the same two arms of `pathsToAsk` (D13). Nothing to ask: `if (replace) revalidating = false;
  commit([], newest.paths, replace)`, settle every waiter, start nothing. Otherwise `flight = round`, the waiters so
  far are carried by this round, and `checkIgnore` is called once. A bridge that throws at once is a failed call.
- **When the round's call ends** (D3 to D7), in this order:
  1. `flight !== round` (the store left the folder): settle the round's carried waiters and return. Nothing lands.
  2. `flight = null`.
  3. It failed: `failedAt = Date.now()`, settle the carried waiters and every waiter since. If there WAS a waiter since,
     a listing came while it ran: arm the one retry (D7). Return. Nothing starts here.
  4. It answered: `failedAt = 0`. Epoch unchanged: record what was asked (`answered = new Set(asked)` and
     `revalidating = false` on the replace arm, `answered.add` on the merge arm) and
     `commit(hits, newest.paths, round.replace)`. Epoch moved: on the replace arm `commit(hits, newest.paths, true)`
     and nothing else; on the merge arm nothing.
  5. Settle the round's carried waiters (the sync that started it reads what it read before).
  6. `pump()` once. Waiters that arrived during the round are carried by the call it starts, or settled by it.
- **Leaving the folder** (`reset`, a new target, a target on another machine): `flight = null`, `newest = null`,
  `failedAt = 0`, the retry cleared, settle every waiter. The epoch does not move (`reset` must still not bump it, `:461-463`).
- **`forget()`**: as today without the `syncSeq++`. It does not touch `flight`: the call in flight ends by rule 4.
- **`commit`** takes the NEWEST listing's paths, so a row listed while git ran gets its entry when the call ends.
- **Three rules of the fix round**, in the header as rules 5, 6 and 7 of PHASE 370. (a) `pump(behind)`: the end of a call
  starts a REVALIDATION only when a listing came while that call ran. The tree hands one over for every epoch, so a tree
  on screen loses nothing; a collapsed section hands none over. A chain of growing asks needs none, because it is finite.
  (b) A failed call arms the one retry when listings came while it ran, when it carried some, or when it was started by
  the end of another call. (c) `commit` keeps, in the set on screen and in `unconfirmed`, every entry that is still to be
  asked about (`pathsToAsk` over the newest listing, less what has been asked) and the rows under one; the next ask is
  built from the screen less `unconfirmed`. Leaving the folder clears it.
- The header gains one section, "PHASE 370: ONE CALL AT A TIME", stating D1 to D7 in the file's own voice with the
  measured reason (N+2 children at once at the mount, §2.3) and what must not be undone: starting a call from every
  sync, dropping an answer because a listing arrived, a call started by a failure.

**What does not regress, and why** (each is a row in §10.4). A new ignored file: the first listing that holds it
starts the call and its answer lands though the rest of the tick's listings arrive, so it dims no later than at the
parent, where only the last call's answer could land. A file written under an ignored folder: with nothing in flight
the sync commits its entry at once, as today; with a call in flight it waits for that call, and at the parent the same
state (something unanswered, or a revalidation owed) made every sync ask instead of committing, so its entry waited
for an answer there too. A rule edit on a quiet tree: one full ask where the parent started N+2. The rendered set:
never emptied by `forget`, never replaced by a failed call (D8), replaced only by an answer.

**Stated, not fixed.** After a switch away from a project and back while its call is still out, the folder's second
call waits in main for the first (D9), so under a git that takes T the dimming returns after up to 2T where the
parent's second call ran beside the first; and at the mount the rows listed after the first call started dim with the
call behind it, two calls where the parent's last of N+2 answered in one. Both cost nothing measurable with git at its
own speed (18 to 35 ms a call); under a stand-in whose hold does not depend on how many run at once they read as one
hold more. A real slow git is slow because of load, and the parent's N+2 at once are that load.
**A third of the same kind (the fix round; a verifier found it, and it was not stated).** On the first change after 10
quiet seconds the revalidation is asked for before the folders have been re-read, so the full ask goes out without a
file that change added, and the file waits for the call behind it: 4.49 to 4.50 s against the parent's 2.48 to 2.50 s
under a stand-in held 2 s; inside the 10 s floor the two are equal. With real git at its own speed the two builds read
the same (476 to 564 ms), and with a real git made slow (0.4 s a call, 2 folders) HEAD read 2203, 1482, 1588 and 1562 ms
against 3269, 3007, 1387 and 1361. Asking after the re-read instead was measured over the store and is no cure (§As
built, the fix round): the growing ask it sends first is dropped when the epoch moves under it, so the file still waits
two holds, and a rule edited beside a new file then waits two where it waits one.
**After the section is collapsed mid-call** at most one more call starts, for a listing recorded before it closed, where
the parent, with up to N+2 already running, starts none. **Past 20,000 rows under a git slower than the 10 s floor and a
writer that never stops**, the rows past the cap keep what they show and a new one there is not asked about until the
writer pauses; at the parent nothing lands at all in that state. The store has no
deadline of its own: main settles every call, within the 30 s stop of the child and of the one ahead of it.

### 4.2 Which exits answer (builder `main`): `src/main/git/service.ts`, `checkIgnore`

```ts
if (asked.length === 0) return [];                 // as today: nothing starts, the line is not entered
const result = await checkIgnoreLine.run(this.repoPath, () =>
  runGit(this.repoPath, ['check-ignore', '-z', '--stdin'], { stdin: asked.join('\0') + '\0' })
);                                                 // runGit's own rejections pass through: no catch
if (result.code === 0) return /* the NUL split, as today */;
if (result.code === 1 || result.code === 128) return [];
throw gmuxError('GIT_FAILED', 'Git could not say which files are ignored.',
  `git check-ignore -z --stdin ended with ${String(result.code)}`);
```

The method's header is rewritten to say what is true now: exit 0, 1 and 128 are answers (the three measured
properties stay), and a git that did not run to one of them rejects, so the tree keeps what it shows. The handler in
`git/ipc.ts` does not move; a rejected `handle` answers the renderer's `invoke` with the error and Tortie logs nothing (Electron's own one line
goes to main's stderr, D14). The doc comment of the channel in `src/shared/ipc/git.ts:339-342` is the integrator's (D10):
a folder that is not a repository and "none ignored" answer `[]`, and a git that did not answer REJECTS.

### 4.3 Main's line (builder `main`): new `src/main/git/ignore-line.ts`

```ts
export interface IgnoreLine {
  /** Run `job` for `key` when nothing runs for it; else wait, taking the waiting place. */
  run<T>(key: string, job: () => Promise<T>): Promise<T>;
  /** Tests only: what the line holds for `key`. */
  observe(key: string): { running: boolean; waiting: boolean };
}
export function createIgnoreLine(superseded: () => Error): IgnoreLine;
/** The one line of this process. `GitService.checkIgnore` is its only caller. */
export const checkIgnoreLine: IgnoreLine;
```

One map, key → `{ waiting }`, holding an entry only while a job runs for that key. `run` with no entry: make the entry
and start the job. `run` with an entry: reject the waiter there is (`superseded()`), and wait in its place. When the
running job SETTLES, whichever way (and a job that throws at once is a rejected one): the waiter starts, or the entry
is deleted. The job is handed no signal: the running child is never ended for a newer call. `superseded()` is
`gmuxError('GIT_FAILED', 'A git command was stopped because a newer one replaced it.', 'git check-ignore -z --stdin
was superseded before it started')`. The module imports `../errors` and nothing else, starts nothing and holds no
timer. The prototype is `…/spec/proto/ignore-line.ts`.

**Stated.** A child `runGit` stopped at the 30 s timeout is ended and rejected in the same turn (`exec.ts:139-146`),
so the waiter's child can start while the stopped one is still dying: an overlap of milliseconds, of a child that has
already been killed. `runGit` is not changed for it (the entry's second NOT).

### 4.4 The probe and its stand-in (builder `probe`): §8

## 5. Words

No new string a person reads. One CHANGELOG item, `## Unreleased`, a new `### Fixed` after `### Changed`, in his style,
the commit link added by the follow-up docs commit:

`- The Explorer now asks git which files are ignored one question at a time. With many folders open it used to start hundreds of git processes at once, when a project was shown and each time a file changed, which could slow the whole Mac`

## 6. What moves on purpose

Nothing in the contract: `docs/audits/contract-baseline.txt` must read byte for byte (`node build/contract-inventory.mjs
--check`). `HELPER_USER_FLOOR` rises 192 → 193. `ignored-store.test.ts` gains one line (§7.1). `git:checkIgnore` can
now REJECT where it answered `[]`: its one caller catches. Tortie starts one `git check-ignore` at a time a repository
where it started one a cached folder.

## 7. The rows

### 7.1 The store's rows (builder `store`): new `src/renderer/tree/__tests__/p370-ignored-flight.test.ts`

A fake bridge with one deferred a call, counting calls in flight by `repoPath`; fake timers as `ignored-store.test.ts`
sets them. Port the listings and the tick of `…/spec/proto/store.proto.test.ts`; do not import it.

| Row | Holds | The ablation that turns it red |
| --- | --- | --- |
| F1 (item 1) | N+1 listings while a call is held start ONE call, one in flight, for N of 10, 100 and 500 | start a call on every sync (drop the `flight !== null` return): N+1 calls |
| F2 (item 1) | 100 syncs while a call runs read no path of the listing they are handed (a counting iterable) | build the ask before the `flight` test: the iterable is read |
| F3 (item 2) | the held call's answer lands though N listings arrived while it ran | drop an answer when a later sync arrived (put `syncSeq` back): no landing |
| F4 (item 2, D4) | an answer for a folder the store left never lands: `reset`, a new folder, a folder on another machine; and the new folder is asked BEFORE the old call answers | remove the `flight !== round` return: the old answer lands in the new folder's set. Wait for the old call before asking: one call, not two |
| F5 (D5) | epoch moved while git ran: a revalidation's answer replaces the set, the call behind it is a full ask, and under a 12 s git with a tick every 450 ms at least 6 answers land in 120 s; a growing ask's answer is dropped (the shipping staleness test, unedited) | drop the revalidation's answer too: 0 landings. Record it as settled: the call behind it is not a full ask |
| F6 (item 3) | after the held call ends with k newer listings recorded, exactly ONE more call starts and it asks only the paths still unanswered | no call behind it: the later listing's ignored row never dims. One a recorded sync: more than 2 calls |
| F7 (D6) | nothing owed and nothing unanswered when the call ends: 0 more calls, and a file listed under an ignored folder while it ran has its own entry; a revalidation owed: the call behind it replaces, so a path that stopped being ignored leaves | skip the commit when there is nothing to ask: the entry is missing. Merge where it must replace: the path stays |
| F8 (item 3) | a call that failed starts nothing by itself: 60 s with no sync, 1 call | pump after a failure: more than 1 |
| F9 (D7) | a git that fails in 2 ms, 20 ticks of 101 listings 1 ms apart: at most one call a second (the prototype: 9 in 9 s) and at most 1 in a quiet minute after; the first sync a second after a failure asks once; `reset` and a new folder clear the hold | no hold: 1,020 calls |
| F14 (D7's timer) | the first call fails over ten listings, once arriving while it runs and once after, then a quiet tree: two calls in all and every row dimmed a second later; `reset`, a new folder or a folder on another machine inside that second: one call in a minute | no timer: 0 rows dimmed. A timer armed with no listing: F8 is red. A timer not cleared on leaving: a second call |
| F14, the fix round's two | the call behind a mount fails once, then a quiet tree: three calls and all eleven rows; its retry failing too starts nothing more | the retry armed by late listings alone: 1 of 11 rows. The retry counted as a call behind another: it re-arms for ever |
| F4, the fix round's | two folders with the same paths, one answered: the second is asked about every one | `answered` kept over a new target |
| F15, the fix round's | a call started from inside a landing carries what was recorded; failing once, it is asked again | `carried` left out of the retry's condition |
| F16 (the fix round) | five minutes collapsed under a 12 s git and a writer: no call starts (one, when a listing was recorded first); opened, one full ask settles it | a revalidation behind a call that needs no listing: 25 calls |
| F17 (the fix round, D7b) | a row past the cap, and one two caps deep, stay dimmed across a revalidation and are asked about; a minute of a writer under a 12 s git keeps all 300; a kept folder keeps its rows, a link's and a new one's among them, and never asks past the link; a row deleted and made again while a full ask runs never goes bright; a row no longer listed leaves; leaving the folder keeps none of it | nothing kept; a kept entry excusing its path; everything kept; kept in leaf spelling; cut at the cap; never recomputed by a merge |
| F10 (D3) | a sync that starts a call settles when it ends and reads the set as it was then; a recorded sync settles with the call behind it and reads that call's hit; nothing to ask settles at once; a recorded sync settles when the running call fails; a bridge that throws at once is a failed call; no sync ever rejects | settle a recorded sync at once: its hit is not there yet |
| F11 (item 3, the cap) | 50,000 loaded paths: three calls, 20,000, 20,000 and 10,000, one at a time, then none | none of its own: F6 and F8 hold the chain's two ends |
| F12 (Phase 47.1) | across a revalidation tick of N+2 syncs and across the whole feed, the rendered set is never smaller than before while the truth has not changed | empty the set in `forget`: the shipping headline test and this row |
| F13 (RULE 6) | a revalidation tick over `p343-ignored-links`' tree with its fake that answers nothing for a path past a link: the call behind the first never carries a path under a link, and all eight stay dimmed | `ablation:p343` a-ig3 |

**The one edit to a shipping test**, named: `ignored-store.test.ts`, `keeps the last answer when the read fails, and
retries in full` (`:267-281`) gains `vi.advanceTimersByTime(1_000);` before its retry, with one comment line saying
why: since Phase 370 a failed read is not retried by the very next listing, because a tick delivers one listing a
cached folder (D7). Its assertions do not move. Every other shipping test passes unedited.

### 7.2 Main's rows (builder `main`)

`src/main/git/__tests__/p370-ignore-line.test.ts`, the line over fake jobs (port `…/spec/proto/line.proto.test.ts`):

| Row | Holds | The ablation that turns it red |
| --- | --- | --- |
| L1 (item 5) | a second call for a key starts only when the first has settled; never two running over 2,000 mixed calls | run every job at once: 2 running |
| L2 | with one running, of three more only the last runs and the two before it reject as superseded, at once | let them queue: three run |
| L3 | the running job is never ended: it is handed no signal and resolves with its own answer after later calls came | abort the running job for a newer call: it rejects |
| L4 | another key is not held; a failed job and a job that throws at once free the line; an idle key holds nothing | key the line on nothing: the second repository waits |

`src/main/git/__tests__/p370-check-ignore.test.ts`, `GitService.checkIgnore` over a mocked `../exec` (`runGit` a fake
that counts calls in flight; no real process, no `process.env` touched):

| Row | Holds | The ablation that turns it red |
| --- | --- | --- |
| C1 (item 4) | `runGit` rejecting (the timeout's error, git missing) rejects; code −1, 3 and 129 reject `GIT_FAILED`; code 0 answers the NUL split; 1 and 128 answer `[]` | put the `catch { return [] }` back; return `[]` for every non-zero code |
| C2 (item 5) | one service asked 10 times while `runGit` is held: 1 in flight, then the last; the 8 between reject superseded; 2 `runGit` calls in all (the parent: 10 at once, §2.2 L) | call `runGit` outside the line: 10 in flight |
| C3 (D9) | two `GitService` objects for one path share the line | hold the line on the service: 2 in flight |
| C4 | an empty or blank-only list calls `runGit` zero times and holds nothing in the line | — |

`check-ignore.integration.test.ts` stays unedited (real git: 0, 1 and 128).

### 7.3 One door (builder `main`): new `src/main/git/__tests__/p370-one-door.test.ts`

Read as text, comments blanked: under `src/renderer` (tests aside) `checkIgnore` is called in `tree/ignored.ts` and
nowhere else; under `src/main` (tests aside) the string `'check-ignore'` is an argv element once, in `git/service.ts`,
inside the function handed to `checkIgnoreLine.run(`; `checkIgnoreLine.run(` has one caller; `src/preload/git.ts`
exposes `checkIgnore` once. Proved on three planted copies it must read red: a second renderer caller, a second argv
in `src/main`, the argv outside the line.

### 7.4 The path-triggered gates the changed files trigger (CLAUDE.md, read at this head)

| Changed | Gate |
| --- | --- |
| `src/main/git/service.ts` | `conformance:filehistory` (~3 s) and `conformance:historysearch` (~2 s): both import the service and read its text; neither's rule is touched |
| `src/main/git/exec.ts` | **not touched** (D10); had it been, `conformance:historysearch` again |
| `src/renderer/tree/ignored.ts` | no gate names it. `probe:p343` does: its arm **L5** reads dimming after a revalidation with a linked folder open. A verifier runs L5 alone at both builds (§10.4 N7). `ablation:p343`'s four `ignored.ts` arms are the integrator's (§11) |
| `build/p370/probe-p370.mjs` | `gate:electron` (the floor), `gate:background`, `gate:checks` (its classification), all inside `npm run build` |
| `src/shared/ipc/git.ts` (one doc comment, the integrator's) | `gate:contract` reads byte for byte; `git:checkIgnore` is one line of the baseline (`docs/audits/contract-baseline.txt:89`) and keeps it |
| the rest of `src/shared/**`, `src/preload/**`, `src/main/git/ipc.ts` | **not touched** |

### 7.5 CLAUDE.md (D11)

**No row in the path-triggered table.** That table names a gate to ADD when a commit touches a path, and this phase
adds none: every rule above is a vitest row, and `npm test` already runs in every commit's battery, so a row would
name nothing to add, and a gate that re-ran those rows the same way is what rule 2 of "the four rules that stop the
waste" forbids. What a text gate could add, that the store and the service stay the only doors, is §7.3's row, in the
same battery. **One row in the probes table**, after `probe:p368`'s: `probe:p370`, with when (the store, the sync
effect in `use-tree-model.ts`, `FilesSection`'s change handler, `GitService.checkIgnore`, `ignore-line.ts`, `runGit`,
`build/p370/**`), its cost as measured, the stand-in and its fuse, and that it is verifiers only, under the lock.

## 8. The app run: `probe:p370` (builder `probe`)

`package.json`: `"probe:p370": "node build/harness-socket.mjs --fresh gmux-p370 'node build/p370/probe-p370.mjs'"`.
Electrons through `withElectron` ONE AT A TIME (`program: 'app'`, so the pid is the app's own and no `node` is needed
on its closed PATH), the PARENT first (`P370_PARENT_CHECKOUT`, a built checkout that is not this one, or exit 2), each
launch on its own scratch profile, HOME and ZDOTDIR with `HISTFILE=/dev/null` and `SHELL=/bin/sh`, the harness socket
as `tmuxSocket`, `GMUX_PROBES=1`. Port the spec step's `app/driver.mjs` and `bin/git` (read them; do not import them).
Three verdicts as `probe:p365`: each arm names `reads`, `needs` and `clauses`; an absent reading or an unmet need is
UNREADABLE (exit 2), only a clause is FAIL (exit 1); every reading is derived from raw text (the stand-in's log, the
process table, the page's own recorder) by ONE pure function that `--grader-self-test` drives over recorded fixtures,
every clause shown red alone and every need unreadable alone. `--grader-self-test` and `--preflight` start nothing.
Seed the fixtures from `…/spec/runs/*/reading.json` and `git.log` (name a copied log `.txt`, so `.gitignore`'s
`*.log` does not hide it). Every arm records `os.loadavg()` at its start and end; the report sits outside the
checkout. It refuses, exit 2: no harness socket or directory; the login shell would not resolve `git` to the stand-in;
`agents:list` resolved anything; no git call whose parent is the app reached the stand-in; and it starts nothing while
memory reads under 20 percent free (it waits up to ten minutes, then exit 3).

### 8.1 The stand-in: `build/p370/stand-in.zsh`, copied into the run's own `bin/` as `git`

zsh, because a held call must cost no child and no CPU (D15). One line when a call starts and one when it ends
(`S <time> <pid> <ppid> <subcommand> <cwd>`, `E <time> <pid> <exit> <how> <paths asked>`), appended to the run's log.
`check-ignore` is answered by the stand-in itself from the fixture's rules (`*.log`, `ignored/`) after the hold, with
stdin read after the hold, or passed to `/usr/bin/git` in `real` mode; every other subcommand is passed to
`/usr/bin/git`, logged. Its knobs come from a control file it reads at every call (so one launch steps through the
cells): the mode, the hold, a hold for one repository alone (arm A3), an exit to fail with (A6), the fuse. It stops
holding once the fuse file exists, and by itself once 560 holds are alive (one empty file a held call, made and
removed with zsh's own builtins). The probe blows the fuse at 520, stops its writer and ENDS THAT LAUNCH at once, through
the helper's own teardown, so the parent never runs on with nothing held (§2.3's 789); the next cell takes a new launch,
the fused cell's drain is not read at that build, and its clause needs the mount and the writer alone. A stand-in ended by main
writes no end line, so most-alive is read from the log AND from the process table sampled every 250 ms, and the
larger is graded.

### 8.2 The arms

| Arm | Builds | What it drives | PASS at the parent | PASS at HEAD |
| --- | --- | --- | --- | --- |
| **M** the matrix | both | Three scratch repositories of 10, 100 and 500 folders, opened as three projects with their open folders seeded (§2.3). Seven cells: 10 with real git at its own speed, and 10, 100 and 500 held 1 s and 10 s. A cell: set the knobs, show the project (the mount), wait for quiet, a writer every 200 ms for 20 s, the drain | every cell: at the mount at least N children alive at once; under the writer more than at the mount or the fuse (printed: started, a minute, most alive, the fuse) | every cell, every phase: **at most 1 `git check-ignore` child alive at once** in the log and in the process table; the fuse never blown; started no more than the parent's in the same cell; a held cell starts at most one call a hold plus 2; every ignored row drawn is dimmed at the drain |
| **D** no regression | both, alternated twice (parent, HEAD, parent, HEAD) | 3 folders, real git, a quiet tree: the first dimmed row after the first row; a new ignored file five times; a rule added on a quiet tree, taken away, and added again 2 s later; the frames of Phase 47.1 under a writer for 25 s | printed, each with the load | each median within 200 ms of the parent's; the rule added inside the floor within 11,500 ms at both; **0 frames** drew a must-dim row undimmed, of at least 1,500 painted (fewer is UNREADABLE) |
| **A1** an edit while a call runs | HEAD | held 3 s; a rule added while the mount's call is out | — | at most 1 alive; the rule's row dims within 2 holds + 2 s |
| **A2** a second edit inside the floor | HEAD | real git; a rule added, then taken away 2 s later | — | the row undims within 11,500 ms; at most 1 alive |
| **A3** a project switch and back mid-call | both | repository A held 10 s, B at git's speed; switch to B during A's call, back after 2 s | printed: the times and the most alive | at most 1 alive a repository; B's rows dim within 1,500 ms of the switch; A's `root.log` dims within 2 holds + 2 s of the return and every ignored row drawn within 3 holds + 2 s (§4.1's stated cost; the parent's time is printed beside it, not graded); no row of B is ever dimmed from A |
| **A4** a folder that is not a repository, mid-call | HEAD | A held 5 s; switch to a plain folder and back (`reset` mid-call) | — | at most 1 alive; nothing dimmed in the plain folder; A's rows dim after the return |
| **A5** a git that fails every time | both | exit 3 at once; the writer for 60 s | printed: calls in the minute | **at most 70 calls** in the minute, one alive at a time; at most 2 calls in a quiet 30 s after (D7's one deferred ask and the floor's own trailing revalidation); the rows dimmed before stay dimmed (0 bad frames) |
| **A6** a git that never returns | HEAD | held 40 s, past main's 30 s stop; a rule taken away at 5 s; 75 s in all | — | one alive at a time; main ends it at 30 s (gone from the process table within 2 s); the set on screen does not change while it hangs (0 bad frames); at most 3 calls |
| **A7** more than 20,000 paths | both | a folder of 21,000 files and, first in the tree, a folder holding one ignored file with a 40 character name; real git | the long-named row dims | calls of 20,000 then the rest, one alive at a time; the long-named row dims; no more than 4 calls. If the harness cannot open that tree within 60 s the arm says so and the claim rests on F11 |
| **A8** two changes inside one call | HEAD | held 3 s; two ignored files written 600 ms apart during a call | — | at most 1 alive; both rows dim within 2 holds + 2 s; no more than 4 calls in the 15 s after the first write (the floor's trailing revalidation is one of them) |
| **A9** a window reload mid-call | HEAD | held 10 s; `Page.reload` 2 s into the mount's call | — | at most 1 alive throughout, sampled every 100 ms; the second call starts only after the first ended (the log); `root.log` dims within 2 holds + 3 s of the reload |
| **A10** the Files section collapsed and opened | HEAD | held 5 s; the section's own toggle pressed twice, 1 s apart, mid-call | — | at most 1 alive; the rows dim |
| **A11** the page asks 200 times at once | HEAD | on a settled tree, `window.gmux.git.checkIgnore` called 200 times in one turn from the page, git held 2 s | — | at most 1 alive; at most 3 children in all (the first, the last, and one of the store's own if it asks meanwhile); at least 197 rejections naming "superseded" |
| **RUN** | — | the preflights, the hidden agents, the census, every pid ended, his history unmoved, no leftover naming the run, the load and memory beside every cell | | |

A tab on another machine and RULE 6 are not arms: §10.3 and §10.4 N7. Defaults: `P370_ARMS=M,D,A1,…,A11`;
`P370_CELLS` narrows M; `P370_KEEP=1` keeps every run folder; `P370_REPORT`. Wall time: about 30 minutes for both
builds, not yet measured (the spec step's cells took 45 to 80 s each, one launch a cell).

`build/p370/CHECKLIST.md`: two plain lines for the operator's seat. Open a project with many folders open in the
Explorer while Activity Monitor is filtered to `git`: no crowd of `git` processes appears, at the open or while an
agent writes. Files git ignores are still dimmed, and a file an agent adds to an ignored folder dims.

## 9. Builders, disjoint files

### 9.1 The table (every file in exactly one list; a builder that must edit a file not in its list stops and names it)

| Builder | Files it owns (and their tests) |
| --- | --- |
| `store` | EDIT `src/renderer/tree/ignored.ts`; NEW `src/renderer/tree/__tests__/p370-ignored-flight.test.ts`; EDIT `src/renderer/tree/__tests__/ignored-store.test.ts` (§7.1's one line and its comment, nothing else) |
| `main` | NEW `src/main/git/ignore-line.ts`; EDIT `src/main/git/service.ts` (`checkIgnore` and its header, nothing else); NEW `src/main/git/__tests__/p370-ignore-line.test.ts`, `p370-check-ignore.test.ts`, `p370-one-door.test.ts` |
| `probe` | NEW `build/p370/probe-p370.mjs`, `build/p370/stand-in.zsh`, `build/p370/fixtures/**`, `build/p370/CHECKLIST.md` |
| integrator | `CLAUDE.md` (one probes-table row, §7.5), `CHANGELOG.md` (§5), `package.json` (`probe:p370`, after `probe:p368`), `build/verification-checks.mjs` (`electron('probe:p370')` with its paragraph), `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 192 → 193, naming the script), `build/background-fixtures.mjs` (only if a new shape needs it), `build/p343/ablation.mjs` (D13's two anchors and nothing else), `src/shared/ipc/git.ts` (the one doc comment, D10), `.gitignore` (only if a fixture is hidden by it), `docs/audits/contract-baseline.txt` (only if, against expectation, a contract line moves), this file's §As built, and any file two builders both need |

### 9.2 The seams, stated exactly so the three build at once

- `store` and `main` meet only through `window.gmux.git.checkIgnore`, whose shape does not move. `store` treats ANY
  rejection as a failed call (D7); it reads no error code and no error text.
- `main` exports from `src/main/git/ignore-line.ts` exactly §4.3's block. Nothing else in `src/` imports it.
- `p370-one-door.test.ts` reads `src/renderer/tree/ignored.ts` as text for a `checkIgnore` call; `store` keeps the
  call spelled with that name (`checkIgnore.call(` or `.checkIgnore(`).
- `store` writes D13's two lines in the natural shape and returns their exact text; the integrator re-anchors a-ig3 and
  a-ig4 to it.
- `probe` reads shipped behaviour only: the stand-in's log, the process table, the tree's shadow root
  (`file-tree-container`, `[data-item-path]`, `data-item-git-status="ignored"`), `window.gmux.git`. It adds no drive
  hook and no file under `src/`.

### 9.3 The builders' briefs

- **`store`**: §4.1, §7.1. Run the three shipping files and the new one by name, then `npm run typecheck` and
  `npm test` (history block, scratch `HOME`). Show each ablation of §7.1 by hand in a scratch copy of the file, never
  in the worktree's own, and return which row went red for each.
- **`main`**: §4.2, §4.3, §7.2, §7.3. The same, with `check-ignore.integration.test.ts` unedited and green, and
  `npm run conformance:filehistory` and `npm run conformance:historysearch` (history block).
- **`probe`**: §8. It runs `--grader-self-test` and `--preflight`, and under a lock slot ONE cell at the parent (10
  folders held 1 s), and returns their numbers. It does not run the 500 cells (the verifiers do, behind the fuse).

Every builder returns every file it changed with its line counts, every decision it took that this file does not
state, and what it could not run and why.

## 10. The proof, run rather than read (Tier 3)

### 10.1 Lens A: the behaviour (Method 1 the parent, real data)

The gates once (§11). Then `probe:p370` whole, the parent first, under a lock slot, `P370_KEEP=1`. Re-derive, by the
verifier's own code over the kept logs: the most alive at once and the starts a minute of every cell, at both builds.
**The independent steps**: (1) a count that is not the stand-in's log: the verifier's own sampler of the process table
(every 50 ms, by the run's own bin path) beside one held cell at each build; (2) a cell the spec step did not run, at
HEAD and at the parent behind the fuse: 250 folders held 3 s, and a repository three folders deep whose remembered set
is at its cap of 500; (3) the cost of §0.1 item 11 read at both builds in the 500 cells (the page's thread a change:
HEAD no higher than the parent's 215 to 227 ms).

### 10.2 Lens B: the attack (Method 2)

Read §4, then try at HEAD to make two run at once for one repository, to make a loop, or to lose the dimming: the arms
A1 to A11 again with shapes of the verifier's own (`.gitignore` edited every second for a minute; 30 project switches
in 10 s under a 10 s hold; ten reloads in 20 s under a 10 s hold; a hold of 31 s; a git that fails for a minute and
then answers; `checkIgnore` called from the page with 30,000 paths, with an empty list, with a `repoPath` that is not
there). For each: the most alive a repository, the calls a minute, and the rows before and after. **The independent
step**: its own ablations of items 1 to 5 in a scratch copy of the two source files (at least one per item, not §7's),
each run against the phase's vitest files and each red; and the gate that no anchor of `ablation:p343` went stale
(`node build/p343/ablation.mjs --self-test`).

### 10.3 What is driven in vitest only, and why

A tab on another machine (the tree's effect resets and never syncs for one, `use-tree-model.ts:752`, and the store
drops such a target whole; both are held by the two `p903-b` rows of `ignored-store.test.ts`, unedited, and F4; the
app arm would need the loopback machine for a rule no line of this phase reaches). The slow-git feed of F5 (minutes of
a 12 s git). The chain of F11 beyond what A7 opens. The line's 2,000 mixed calls.

### 10.4 No regression (both builds)

| Row | What | The parent | HEAD must read |
| --- | --- | --- | --- |
| N1 | the first dimmed row after the first row of a project just opened (D) | 50 to 82 ms | within 200 ms of the parent's median in the same session |
| N2 | a new ignored file dims, from its write (D) | 567 to 706 ms | the same bound |
| N3 | a rule added on a quiet tree shows; taken away shows (D) | 547 ms; 524 ms | the same bound |
| N4 | a rule added inside the 10 s floor (D) | 7,968 ms | within 11,500 ms at both |
| N5 | a path that stopped being ignored leaves the set (D, the rule taken away; F7) | leaves | leaves |
| N6 | the rendered set never empties across a revalidation: Phase 47.1's frames (D) | 0 of 3,191 | 0, of at least 1,500 painted |
| N7 | RULE 6 in the app: `probe:p343`'s arm L5, alone (`P343_ARMS=L5`, `P343_PARENT_CHECKOUT` the parent, inside its own `with-scratch-machine` wrapper, with `HOME` in scratch and `SCRATCH_MACHINE_NO_OWN_KEYS=1` added, so none of his keys is read) | its own header names `ae8767c2` (before Phase 343) as the parent; `3aae4f89` carries 343, so its L5 reading must hold every clause too | every clause |
| N8 | `ignored.test.ts`, `ignored-store.test.ts`, `p343-ignored-links.test.ts`, `p343-link-hooks.test.ts`, `decorations.test.ts`, `check-ignore.integration.test.ts` | green | green, unedited but §7.1's one line |
| N9 | `conformance:filehistory`, `conformance:historysearch`, `gate:contract` | PASS | PASS, the contract byte for byte |
| N10 | the Explorer's own thread a change at 500 folders (M) | 215 to 227 ms | no higher |
| N11 | `npm test`, `npm run build`, `npm run typecheck` | the counts at `3aae4f89` | the same plus this phase's files, the same four `/bin/ps` failures inside the block |

A row worse than the parent is a defect: fixed, or the part dropped and named. §4.1's two stated costs are the only
ones accepted in advance, and only under the stand-in.

### 10.5 At the end, once

The Electron count with CLAUDE.md's command, outside the history block; every `gmux-p370` socket under
`/private/tmp/tmux-501/` gone or with no server answering; no process naming a run folder; the history stats; the lock
slots free.

## 11. The integrator's commands (in order; each with its exit code and PASS line in the report)

1. `npm run typecheck`
2. `node build/contract-inventory.mjs --check` (byte for byte; a diff is a finding)
3. `npm test` (history block, scratch `HOME`; the four `/bin/ps` tests named as the expected failures)
4. `npm run build` (`gate:electron` 193 against a floor of 193; `gate:background`; `gate:checks` with `probe:p370`
   classified)
5. the phase's vitest files and their neighbours by name: `p370-ignored-flight`, `ignored-store`, `ignored`,
   `p343-ignored-links`, `p343-link-hooks`, `decorations`, `p155-refresh-store`, `p155-refresh`, `p370-ignore-line`,
   `p370-check-ignore`, `p370-one-door`, `check-ignore.integration`, `service.integration`
6. `npm run conformance:filehistory`, `npm run conformance:historysearch`
7. re-anchor a-ig3 and a-ig4 (D13); `node build/p343/ablation.mjs --self-test`, then `P343_ONLY=a-ig1,a-ig2,a-ig3,a-ig4 node build/p343/ablation.mjs`
   (its clone is its own; each arm red on its owner)
8. `git diff --stat 3aae4f89 -- src/shared src/preload src/main/git/ipc.ts src/main/git/exec.ts
   src/renderer/tree/use-tree-model.ts src/renderer/tree/FilesSection.tsx src/renderer/tree/store.ts` (only
   `src/shared/ipc/git.ts`, and its diff only the doc comment)
9. `node build/p370/probe-p370.mjs --grader-self-test` and `--preflight`
10. under a lock slot, `P370_ARMS=M P370_CELLS=<the 10 folder cells> P370_PARENT_CHECKOUT=/private/var/tmp/tortie-wt/wt-p370-parent
    npm run probe:p370` (three cells at each build; HEAD needs step 4's `out/`)
11. the Electron count, the socket check, the history stats, the leftovers

`smoke`, `smoke:t1`, `smoke:t3` and the package are the main session's, at landing.

## 12. What is NOT in this phase

- No change to how often folders are re-read: `refreshLoaded` still re-reads every cached folder on every change, one
  `set` each, and the tree still restores up to 500 open folders when it is shown (§0.1 item 11; §14 Q2).
- No bound on any other git call and no queue inside `runGit`: the History store's four reads a change are written
  down (§2.4), not fixed (§14 Q1).
- No change to what is dimmed, to the 10 s floor, to the 20,000 cap, to RULE 6, to exit 128's answer, or to a tab on
  another machine asking nothing.
- No change to `src/main/git/exec.ts`, `src/main/git/ipc.ts`, `src/shared/**` (one doc comment aside), `src/preload/**`, the tree's effect or
  `FilesSection`.
- No new setting, surface, sentence, menu row, log line a call, harness smoke mode or drive hook.
- No release. 0.116.0 is cut on his word once this has landed.

## 13. For the main session at landing

1. `HELPER_USER_FLOOR` 192 → 193, naming `build/p370/probe-p370.mjs`.
2. CLAUDE.md gains ONE row, in the probes table, and none in the path-triggered table (§7.5).
3. The minimum gates that start Electron outside the helper (`smoke:t1`, and `smoke`, `smoke:t3`, the package in the
   battery) are yours; this phase's agents ran none of them.
4. §14 Q1 goes to him with §2.4's table: it is the same shape as his report, from the History store, at any tree size.
5. The CHANGELOG item goes under `## Unreleased`, `### Fixed`; the follow-up docs commit adds its link, and 0.116.0
   carries it beside Phase 369's item.
6. Cleanup after the follow-up commit: both worktrees and `/private/var/tmp/tortie-wt/scratch/p370/` (the spec step's
   part is 3.4 MB).

## 14. Questions for him (the main session asks; the build proceeds on the defaults)

1. **History and branches have the same shape.** On every file change Tortie also asks git for the branches, the
   remotes and the history again, four reads at a time, without waiting for the last four. With git held to 10 s that
   was 227 to 355 git processes at once, in a project of any size, with only the Explorer in front. It was not among
   your 515 and this phase does not touch it. **The same shape, smaller, is in the Explorer's own `git status`** (added
   by the fix round): until Source Control has its first answer for a project, every file change starts another, 13 and
   11 at once under a status held 10 s at the two builds; after that answer it is 1. Default: queue it as its own phase, next. The other choice: fold it into
   this one, which makes this a wider change the day before a release.
2. **Every change re-reads every folder you have opened.** With 500 open that is 500 folder reads and about a fifth of
   a second of the Explorer's own thread, each time a file changes; opening the project restores the same 500. This
   phase leaves it. Default: its own phase after the release. The other choice: leave it for good.
3. **The changelog line.** Default: one item saying the Explorer now asks git which files are ignored one question at
   a time, and what it used to do. The other choice: no item, since nothing a person presses changes.

## §As built

Written by the integrator on 2026-11-24, in `/private/var/tmp/tortie-wt/wt-p370`. Its own logs and both probe runs are
under `/private/var/tmp/tortie-wt/scratch/p370/integrator/` (`logs/`, `runs/m10/`, `runs/whole/` with `report.json`,
every arm's raw input and the stand-in's logs).

### B1. Every file changed against `3aae4f89`

| File | Owner | What, and why |
| --- | --- | --- |
| `src/renderer/tree/ignored.ts` | store, then the fixer | 743 lines. The store of §4.1; the pure half is unchanged. `sync` is a plain function |
| `src/renderer/tree/__tests__/p370-ignored-flight.test.ts` | store | NEW, 1,185 lines, 60 tests: F1 to F14 and F15 (B2), and the fix round's F16, F17 and five rows more (46 tests as built) |
| `src/renderer/tree/__tests__/ignored-store.test.ts` | store | +2: §7.1's one line and its comment |
| `src/main/git/ignore-line.ts` | main | NEW, 122 lines: §4.3's block and nothing more (the prototype's `size()` is gone) |
| `src/main/git/service.ts` | main | +28 −14: one import, `checkIgnore` and its header |
| `src/main/git/__tests__/p370-ignore-line.test.ts`, `p370-check-ignore.test.ts`, `p370-one-door.test.ts` | main | NEW: 8, 19 and 26 tests (21 doors as built; the probe's reviewer added five) |
| `build/p370/probe-p370.mjs`, `stand-in.zsh`, `CHECKLIST.md`, `fixtures/**` | probe | NEW: 2,057 and 128 lines (1,954 as built; the probe's reviewer edited the sampler and graders), two plain lines for his seat, and 492 KB of fixtures, none hidden by `.gitignore` |
| `src/shared/ipc/git.ts` | integrator | +3 −2: the doc comment of `git:checkIgnore` alone (D10). It also says a displaced call rejects |
| `build/p343/ablation.mjs` | integrator | +2 −2: a-ig3 and a-ig4 re-anchored (D13) to `      ? pathsToAsk(paths, NONE, NONE, linkFolders)` and `      .then((raw) => raw.map((path) => canonicalAnswer(path, linkFolders)))` |
| **`build/conformance-filehistory.mjs`** | integrator, **not in §9.1** | +4 −3: `'ignore-line.ts'` joins the list its rule 8 copies. `service.ts` imports `./ignore-line`, so each of the three ablated copies died on `Cannot find module` and the gate counts a probe that did not run as a pin gone red: it exited 0 having proved nothing. Found by the `main` builder; with the word in, it reads 6, 2 and 2 pins red, the parent's own counts. §7.4 was wrong that no rule of that gate is touched |
| `package.json`, `build/verification-checks.mjs`, `build/assert-electron-teardown.mjs` | integrator | `probe:p370`, its classification, `HELPER_USER_FLOOR` 192 → 193 naming the script |
| `CLAUDE.md` | integrator | one row in the probes table, none in the path-triggered table (D11) |
| `CHANGELOG.md` | integrator | §5's item under a new `### Fixed`, with no link yet |

`build/background-fixtures.mjs`, `.gitignore` and `docs/audits/contract-baseline.txt` did not move.

### B2. The decisions this file did not state

- **The store.** A landing pumps only if no call is out (a subscriber that syncs inside a landing would start a second
  one: row F15). A clock set back reads as no hold. An answer that is not a list is a failed call. The round object is
  `{epoch, replace, ask, linkFolders}` and the carried waiters are handed to `finish`.
- **Main.** The one-door row reads the code with the TypeScript parser. It also holds that the store calls
  `checkIgnore` exactly once, that no other renderer file names it, that the line is made once and has one importer
  and one caller. Every row of `p370-check-ignore` has a repository path of its own, because the line is the process's.
- **The probe**, where a measurement beat §8.2. M's real-git cell asks the parent for more than one alive rather than N
  (its mount read 8 in one run). A7 at the parent is printed, not held: the long-named row never dims there. A2 gained
  a clause that git is asked again within 11,500 ms, because an untracked row undims on `git status` alone. A6 leaves
  `w/keep.txt` out of its must-dim rows. D and A5 read `d0001/b.log` to `d0003/b.log` and `ignored/`, because
  `root.log` scrolls out of view. D waits 21 s after the rule is written. A7 has a fourth verdict, STATED. A
  development variable never lets a run exit 0.
- **The integrator.** The `conformance-filehistory` edit of B1. Counting a probe that did not run as a pin gone red
  (its `:370`) is an older weakness and is left as it was, for the main session to queue.

### B3. The seams, as they met

The three halves met with no edit to any of them. `typecheck` was green on the first run and every phase file beside
its neighbours passed at once. The store treats any rejection as a failed call and reads no code and no text; main
rejects exits outside 0, 1 and 128, the timeout, a signal, a git that did not start, and a displaced call. The one-door
row reads the store's `checkIgnore.call(` and passes.

### B4. The ablations

- **Store, 43 arms**, each in a scratch copy over the flight file, `ignored-store` and `p343-ignored-links` (control 75
  of 75): 42 red on their rows. F15c, the retry timer's own `flight === null` guard, is green alone, because `sync`
  clears that timer before it pumps; F15b removes both and is red.
- **Main, 24 arms**, each in a scratch copy (control 56 of 56): all red, each naming its row (the line 11, the exits 5,
  the line around the spawn and its sentence 4, the empty list 1, the doors 3).
- **Probe, 23 rule removals** in a scratch copy: all red; control green.
- **`ablation:p343`**, the integrator's: a-ig1, a-ig2, a-ig3 and a-ig4 each red on its owner, PASS in 8.6 s.

### B5. §11, each command

| # | Command | Exit | Reading (1 minute load) |
| --- | --- | --- | --- |
| 1 | `npm run typecheck` | 0 | 0 boundary violations, 0 runtime cycles (27) |
| 2 | `node build/contract-inventory.mjs --check` | 0 | byte for byte (27) |
| 3 | `npm test` | 1 | 23,603 passed, 4 failed, 24 skipped over 1,236 files, 122 s (32). The four are the named `/bin/ps` tests. `preview/protocol.test.ts`, red for both builders, is green with `TMPDIR` under `/var/tmp`: `sb.sh`'s own `TMPDIR` is already a resolved path, so it is not behind a symlink |
| 4 | `npm run build` | 0 | `gate:electron` 193 against a floor of 193; `gate:checks` 296 check scripts classified; `gate:contract` byte for byte; every other gate inside it passed (30) |
| 5 | the thirteen names | 0 | 14 files (a name matches two), 223 passed (30) |
| 6 | `conformance:filehistory`, `conformance:historysearch` | 0, 0 | rule 8: 6, 2 and 2 pins red for real; every rule passed (27 to 30) |
| 7 | `ablation.mjs --self-test`; the four arms | 0, 0 | 16 fixtures, no arm gone stale; four of four red on their owners (30; 34) |
| 8 | the `git diff --stat` of §11.8 | 0 | `src/shared/ipc/git.ts` alone, its doc comment alone |
| 9 | `--grader-self-test`; `--preflight` with both builds | 0, 0 | 19 graders, 78 clauses each red alone, 130 needs each unreadable alone, 250 fields, 33 variants, 116 raw inputs (73, 108, 222, 29 and 40 before the probe's review); 23 checks |
| 10 | `P370_ARMS=M`, the three 10 folder cells | 0 | 7 verdicts passed, 391 s (30 to 74; it waited 2 minutes once at 74) |
| — | `probe:p370` whole, both builds | **0** | **31 verdicts passed, 0 failed, 0 unreadable, 1,602 s** (19 to 55), B6 |
| 11 | the end, once | — | no Electron of ours (his Tortie 782 and other apps' crash handlers), no `p370` socket, 0 leftover processes, all three lock slots free, history `751359 1795494835` and `23166 1790702242` before and after every run |

Commands 1 to 9 ran under the history block with a scratch HOME; 10 and the whole run outside it (Electron, `ps`), with
`HOME` and `ZDOTDIR` in scratch, `HISTFILE=/dev/null`, `SHELL=/bin/sh`, through `npm run -s probe:p370` in a lock slot.

One reading the builders did not take (`integrator/own/`, real git through the shipping service): 40 calls at once
answered the first and the last and rejected 38; a repository whose folder was deleted rejects (it answered `[]` at the
parent), and the same path answers again once the folder is back. Exit 0, 1 test.

### B6. The whole run, parent then HEAD

| Cell | Parent: mount started / alive | Parent under the writer: started (a minute), most alive | HEAD: mount started / alive | HEAD under the writer: started (a minute), most alive | The page's thread a change, parent / HEAD |
| --- | --- | --- | --- | --- | --- |
| 10, real git | 12 / 10 | 87 (261), 13 | 2 / 1 | 52 (156), **1** | 0 / 0 ms |
| 10, held 1 s | 12 / 12 | 590 (1,768), 37 | 2 / 1 | 20 (60), **1** | 0 / 0 |
| 10, held 10 s | 12 / 12 | 590 (1,769), 313 | 2 / 1 | 2 (6), **1** | 0 / 0 |
| 100, held 1 s | 102 / 102 | 4,963 (14,875), 359 | 2 / 1 | 20 (60), **1** | 5 / 2 |
| 100, held 10 s | 102 / 102 | 541 in 2.7 s, the fuse, 541 | 2 / 1 | 2 (6), **1** | 7 / 3 |
| 500, held 1 s | 502 / 502 | 528 in 1.2 s, the fuse, 528 | 2 / 1 | 19 (57), **1** | 210 / 143 |
| 500, held 10 s | 502 / 502 | 1,215 in 2.1 s, the fuse, 706 | 2 / 1 | 2 (6), **1** | 205 / 139 |

Every HEAD drain ended quiet with every ignored row drawn dimmed. The parent's thread figures at 500 are one change
each, because the fuse ended those launches. The parent reached 706 alive in the last cell: the fuse stops the holding
and the launch is ended, but the calls it had already been asked start first.

| D, two launches a build alternated (load 22 to 38) | Parent | HEAD |
| --- | --- | --- |
| first dimmed row after the first row, six | 25 ms (20 to 37) | 19 ms (8 to 25) |
| a new ignored file dims, ten | 506 ms (488 to 555) | 499 ms (487 to 541) |
| a rule added on a quiet tree | 533, 496 ms | 736, 496 ms |
| a rule taken away | 500, 489 ms | 500, 549 ms |
| the rule added inside the 10 s floor | 8,038, 7,980 ms | 7,970, 7,949 ms |
| Phase 47.1's frames | 0 undimmed of 3,184 and 3,201 | 0 of 3,191 and 3,181 |

| Arm | HEAD | Parent, where driven |
| --- | --- | --- |
| A1 | 1 alive, the rule's row dims at 6.0 s (hold 3 s) | |
| A2 | 1 alive; undims at 528 ms, git asked again at 8.5 s | |
| A3 | 1 alive a repository; B dims at 33 ms, 0 of 240 frames dimmed from A; A's `root.log` at 16.2 s, every row at 26.3 s | B at 41 ms; A at 10.1 s, every row at 10.1 s; 10 alive |
| A4 | 1 alive, 0 rows dimmed in the plain folder, A back at 11.3 s (hold 5 s) | |
| A5 | 59 calls in the minute, 2 in the quiet 30 s, 0 bad frames of 10,820 | 180 calls, 10,758 bad frames of 10,817 |
| A6 | 1 alive, main ended the call at 29.7 s, 2 calls, 0 bad frames of 9,003 | |
| A7 | 7, 20,000, 1,002 paths, one at a time; the long-named row dims at 13.0 s (hold 3 s) | 7, 8, 9, 20,000, 4 alive; it never dims |
| A8 | 1 alive; 5.8 and 5.2 s (hold 3 s), 2 calls after | |
| A9 | 1 alive at 100 ms samples, the second call after the first ended, dims at 18.0 s (hold 10 s) | |
| A10 | 1 alive, rows dim at 7.2 s (hold 5 s) | |
| A11 | 200 asked: 2 children, 198 superseded | |
| RUN | 10 launches, agents hidden in every one, census clean, 0 leftovers, his history unmoved | |

### B7. What is not true, or not run

- **A3 is slower at HEAD under the stand-in**, as §4.1 said in advance: after a switch away and back mid-call the
  folder's rows return after up to two more holds (16.2 s and 26.3 s against 10.1 s under a 10 s hold). With git at its
  own speed a call was 11 to 33 ms in these runs, so the same two waits should be tens of milliseconds. Since driven by
  both verifiers and the fixer: with real git HEAD comes back sooner than the parent (the fix round's table). One of the two readings of a rule added on a quiet tree
  was also later at HEAD (736 ms against 533 and 496), inside D's bound and equal in the second launch (496).
- (Closed by the fix round, D7b: a listing taken exactly between a delete and a re-create of an ignored row used to
  undim that row until the call behind it landed.) A subscriber that throws inside a landing rejects that one sync. Both are the parent's too.
- A child main stops at 30 s can overlap the next by milliseconds (§4.3). A rejected call prints Electron's own line to
  main's stderr (D14).
- The probe's run whole is one run at one time of night. The 250 folder cell, N7 (`probe:p343` L5), the 50 ms sampler
  and the attack of §10.2 are the verifiers' and were not run. `smoke`, `smoke:t1`, `smoke:t3` and the package are the
  main session's.
- §14's three questions stand. The History store's pile-up is not touched.

### The fix round

Written by the fixer on 2026-11-24, once, over both lenses' verdicts. Everything of it is under
`/private/var/tmp/tortie-wt/scratch/p370/fix/`. Every reading below was taken on the final code. It changed two files
under `src/`, `src/renderer/tree/ignored.ts` and its `p370-ignored-flight.test.ts`, and this file; nothing under
`src/main`, no other test, no probe, no fixture, no gate, and no shipping test.

| Finding | What was done | Before | After |
| --- | --- | --- | --- |
| **Major: one failed call behind another undims a quiet tree** | Fixed. The one retry is armed by a listing that came while the failed call ran (as before), by a failed call that CARRIED recorded listings, and by one started by the end of another call (the chain past 20,000 paths). The retry's own call is neither, so it cannot re-arm | app, the second call of a 10 folder mount fails, 20 s quiet: 2 of 12 rows, 2 calls; parent 12 of 12 | **12 of 12, 3 calls**, twice; parent 12 of 12, 12 calls, twice, alternated |
| **Minor: calls for a collapsed section** | Fixed, but for one call. The end of a call starts a REVALIDATION only when a listing came while it ran; otherwise it stays owed and the next listing asks | app, held 12 s, 60 s collapsed under a writer: 5 starts; store, five minutes: 25 | **app 1 start, twice** (a listing recorded before it closed); store 0, or 1 when one was recorded. Parent 0 starts, with 9 already alive |
| **Minor: the strobe past 20,000 rows** | Fixed (D7b). Rows a replacement did not ask about stay until the call behind it asks, and are asked | app, 21,000 files held 4 s: 2,787 of 5,211 frames undimmed; store, settled: short in 84, 254 and 241 of 267 ticks at 3, 6 and 12 s | **app 0 of 5,217 and 0 of 5,214; store 0 of 267 at every speed, never under 4,500**. Parent in the app: 7,573 of 7,573 undimmed (the lens's) |
| **Minor: a third one-more-call cost, not stated** | Stated (§4.1), not cured. Asking after the re-read was measured over the store under a 2 s git, 10 and 500 folders: a new file still 4,008 and 4,004 ms, and a rule edit beside a new file 4,008 and 4,004 ms where the tree as it is reads 2,008 and 2,004, because the growing ask goes first and is dropped when the epoch moves | | unchanged |
| **Minor: the `git status` row of the audit** | Corrected in §0.1 item 7, §2.4 and §14 question 1, with the lens's numbers (13 and 11 alive). Not fixed: the entry's second NOT | | |
| Nit: `answered` kept over a new target is pinned by nothing | A row in F4; the ablation is red on it | | |
| Nit: B1's and B5's numbers | Corrected above | | |

One thing the lenses did not ask for and the fixer's own run found: the first spelling of D7b dropped the rows under an
ignored LINK folder past the cap, which are never asked about themselves. Found by the attack lens's own fuzz with the
cap cut to 7 and to 3 (red at seeds 131 and 4), fixed, and it is a row of F17. The same rule closes B7's delete and
re-create case: the fuzz counted 7 such undims in 1,500 seeds before and 0 in every run after.

**The seeded fuzz** (the attack lens's driver, its rule about retries rewritten for the new arms: a call after a failure
with no newer listing is allowed only behind an answered call and only once): 8,000 seeds at the shipping cap, 5,000 at
7, 5,000 at 3, 2,000 and 1,500 long runs (to 620 steps) at the shipping cap and at 7. 21,500 seeds, 2.58 M steps, 267,671
calls, 51,782 failures, 507 of the new retries: at most 1 call a visit, 0 problems, exit 0 each. The tree as built with
the cap at 7 is red at seed 2.

**The ablations**, each in a scratch copy over the three files (the builder's and the lens's arms with 87 rows, the
fix round's own with the final 89, both controls green): the store builder's 43 arms re-anchored, 42 red and F15c green
alone as before; 18 of the fix round's own, 17 red (R1a to R1d the retry, R2a to R2d
the listing rule, R3a to R3d and R3f to R3j the kept rows) and R3e, `unconfirmed` left set on leaving a folder, green:
the set is empty there and the next landing computes it again; six of the lens's, VA1, VA3, VA5, VA6 and VA8 red and
VA4, a revalidation owed kept over a new target, green: the first answer over an empty set reads the same either way.

| App, alternated parent, HEAD, parent, HEAD | Parent | HEAD |
| --- | --- | --- |
| first show to every ignored row, 10 folders, real git, ten each | 780 to 803 ms (load 25 to 35) | 756 to 782 ms (7 to 21) |
| a switch away and back, twenty each | 91 to 151 ms | 45 to 78 ms |
| one failed call, the 1st, 2nd or 12th of the mount | 12, 12, 0 of 12 | 12, 12, 12 (the 12th does not exist) |
| a rule added inside the floor, then taken away | (the lens's 522, 478) | 516, 519 ms |
| the attack's other shapes at HEAD | | X1 `.gitignore` edited every second for 40 s, held 3 s: 1 alive, 5 calls, 0 of 4,845 frames. X3 30 switches in 10 s, held 10 s: A 3 calls and B 4, 1 alive a repository, 0 of 6,053 dimmed across. X4 ten reloads: 1 alive, 4 calls, dims. X5 a minute of failures: 55 calls, least gap 1.007 s, 1 in the quiet 20 s, 0 of 7,207, recovers in 547 ms. X6 never returns: 0.5, 31.5 and 62.5 s, 1 alive, 0 of 8,400. X7 SIGKILL: 14 of 15 calls signalled, 0 of 1,875. X9 a link folder: 0 exit 128s, 0 of 1,902, 1 alive. X12 a link's spelling: 1 alive |

**`probe:p370` whole, both builds: exit 0, 31 passed, 0 failed, 0 unreadable, 1,720 s, loads of 5 to 62** (112 after the
parent's 100 folder 1 s cell, which held 577). HEAD read 1 alive in the log and at most 1 in the table in every phase of
every cell (2, 51, 20, 2, 20, 2, 19 and 2 started under the writers against the parent's 98, 590, 590, 2,760, and 561,
534 and 675 to the fuse; parent most alive 13, 37, 313, 577, 561, 534 and 630). The page's thread at 500 folders: 138
and 136 ms a change against 198 and 195. D: mounts 5 to 20 ms against 17 to 29; new files 487 to 516 against 490 to
517; a rule added 523 and 512 against 508 and 491, taken away 497 and 494 against 498 and 485, inside the floor 7,974
and 7,975 against 7,972 and 7,971; 0 undimmed of 3,196 and 3,191 frames against 0 of 3,194 twice. A5 59 calls and 2 in
the quiet 30 s, 0 of 10,802 (parent 165, 1, 10,757 of 10,814); A6 the stop at 29.9 s, 0 of 9,000; A7 7, 20,000, 1,002,
12.8 s (parent never); A3 A's `root.log` at 16.2 s and every row at 26.3 s against 10.0 and 10.1; A1 6.0 s, A4 11.3 s,
A8 5.7 and 5.1 s, A9 18.1 s, A10 7.3 s, A11 2 children and 198 superseded.

**`probe:p343`, L5 alone at both builds**: exit 0, L5 and RUN PASS (load 38 to 31).

| Command | Exit | Reading (1 minute load) |
| --- | --- | --- |
| `npm run typecheck` | 0 | 0 violations, 0 cycles (16) |
| `npm run build` | 1, then **0** | red once in `gate:electron` alone because `sb.sh`'s `TMPDIR` is under its scratch HOME; green with `TMPDIR` in the fix scratch: 193 of a floor of 193, 296 check scripts, the contract byte for byte (16) |
| `npm test` | 1 | 23,621 passed, 5 failed, 24 skipped, 1,236 files, 121 s (24 to 42): the four `/bin/ps` tests and `preview/protocol.test.ts`, which is 36 of 36 with `TMPDIR` spelled under `/var/tmp` |
| the fourteen phase and neighbour files | 0 | 242 passed |
| `conformance:filehistory`, `conformance:historysearch`, `contract-inventory --check` | 0 | every rule; 6, 2 and 2 pins red for real; byte for byte |
| `ablation:p343` `--self-test`; a-ig1 to a-ig4 | 0 | 16 fixtures; four of four red on their owners, 5.1 s |
| `probe-p370 --grader-self-test` | 0 | 78 clauses, 130 needs, 116 raw inputs |

A landing of a full ask costs the page 0.7 ms at 500 folders as before, 14 against 10 ms at 25,000 rows and 61 against
33 at 60,000 (in node), where the parent did that work for each of N+2 calls.

**What is still worse than the parent, every one.** (1) All rows dimmed after a project is shown, under a stand-in held
1 s or 10 s: 2.0 and 20.0 s against 1.0 and 10.0; with real git HEAD is sooner (756 to 782 against 780 to 803 ms) and
with real git made slow too (276 to 320 against 329 to 333 ms, lens A). (2) A switch away and back during a call held
10 s: 16.2 s to the first row and 26.3 s to every row against 10.0 and 10.1; with real git 45 to 78 ms against 91 to 151.
(3) A new ignored file on a tree quiet for 10 s, under a stand-in held 2 s: 4.49 to 4.50 s against 2.48 to 2.50; with
real git 480 to 564 ms against 476 to 524 (the 564 at a load of 42 to 75; 487 to 516 against 490 to 517 here), and with a
real git of 0.4 s a call HEAD was sooner on two of four and up to 0.2 s later on two. (4) Collapsed mid-call, one call
starts for a listing recorded before it closed, where the parent starts none and has 9 running. (5) Any call whose
one retry also fails leaves a quiet tree as it is until the next change (the reverify's words; this item had said only a
chain past 20,000 paths): 10 folders live, calls 2 and 3 failing, 2 of 12 rows; calls 1 and 2 failing, 0 of 12; the
parent 12 of 12 for both. A git that fails for a TIME reads the other way: at 0.4 s and 1.2 s the parent has 0 of 12 and
HEAD 12 of 12. (6) A
landing above 20,000 rows costs up to about twice the page time of the tree as built, above, and less than the parent's.
(7) The
reverify's: a `.gitignore` edit made while a full ask that has ALREADY read the rules is still out, its answer held 2 s by
a stand-in, shows after 11.9 s against 2.5; equal with the answer held 400 ms or less and with real git. The old answer
lands and clears the debt and the edit waits for the 10 s floor; the parent shows it early only because its overlapping
full asks keep the debt open. Not cured: a full ask behind every `invalidate` would make every call a full ask under a
writer, which the floor exists to prevent. Stated as it was: a row past 20,000 that is NEW under a git slower than the 10 s floor and a writer that never stops is
not asked about until the writer pauses; the parent lands nothing at all there.

Not run: the lens's VM2 to VM4 (main's source did not move); the 250 folder cell and the 50 ms sampler; the real slow
git arms and the held 2 s arm again (lens A's numbers stand; the fix does not touch their path); X11 and X15 (main's and
the remote arm's, neither touched); X10 and X14 at the parent beyond one X10 and the lens's X14, whose 17 children
parsing 21,000 paths took the load to 179; the smokes and the package. `conformance:resume*` is forbidden here.

History `751359 1795494835` and `23166 1790702242` before and after every run; 0 leftovers and a clean census in every
launch; one ssh master of `probe:p343`'s own loopback machine was still up at the end and was ended by its pid, read
again first; every probed agent hidden; all lock slots free at the end.

### The reverify

Approved. Its two minors are corrected in "What is still worse than the parent" above (items 5 and 7), and its nit is a
row of F16, "a rule removed while collapsed stays owed until it is opened". Its independent methods: an exhaustive
differential run of both shipping stores over every sequence of 5 and 6 of 8 events (about 819,000, and 235,000 random
ones), and a nine seed soak of the real app at both builds with every drawn row compared with real git (HEAD 0 wrong rows
in 9 of 9 and 0 overlaps trapped; the parent 12 wrong rows in one seed and hundreds of overlaps).
