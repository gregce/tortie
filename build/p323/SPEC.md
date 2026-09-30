# Phase 323 — End ends what the hang-up leaves running (the build spec)

Subject `fix(sessions): End ends what the hang-up leaves running`. First body line
`Phase 323: End ends the session's own processes that outlive the hang-up`. Patch. Tier 3.
Written 2026-09-29 by the spec step in `/private/tmp/wt-p323` at `5866b527`; origin/main has since moved to
`d9b3c621`, which adds only the running-log line recording his rulings. The charter is Phase 323's entry in
`docs/BACKLOG.md` (`grep -n "^## Phase 323 " docs/BACKLOG.md`), research 21 §2 and §3, research 129 §8 and §10,
and `build/p314/SPEC.md` rows R7 and R8. This file is the contract the builders work from. Where it differs
from the entry, it says so and gives the reason. §1.3 lists every such difference.

His rulings, asked on 2026-09-29 and recorded in the running log at `d9b3c621`:
- **R1 yes** ("Yes, end them"). End ends descendants that left the session's terminal.
- **R3 yes, scratch HOME only** ("Yes, throwaway home only"). Gemini may run under Phase 314's R8
  protections, with its install's version and mtime read before and after.
- **R2 keeps its default.** A plain `shell` session gets the hang-up only.
- Qwen, Antigravity and Grok are never started, not even `--help`.

**READ §2 FIRST.** The spec step found two facts the entry did not have. Under his own standing rule, which
is that the part that regresses is removed, they narrow R1 for this phase. That is the one thing the main
session must put to him when it reports (§11).

---

## 1. The entry against the tree at this head

### 1.1 What moved, re-read line by line at `5866b527`

| Entry says | At this head | Note |
| --- | --- | --- |
| `sessions:kill` `src/main/ipc.ts:132-134` | `:132-134` | unchanged |
| `killSession` `core.ts:2816` | `:2839` | +23 |
| `killSessionAdmitted` `:2825` | `:2848` | |
| Phase 293 refusal `:2840` | `endRefusal` at `:2863` | |
| remote branch `:2861-2887` | `:2884-2909` (`remoteKill` at `:2906`) | not touched |
| target from `liveIds` `:2900` | `:2923` | |
| end-time capture `:2910-2927` | `:2924-2950` (`await captureSessionSnapshot(` at `:2934`) | |
| `tmux.killSession(target)` `:2928` | `:2951` | |
| status write `:2932` | `:2955` (`this.liveIds.delete` at `:2954`) | |
| SpecStory flush `:2935` | `queueCaptureSync` at `:2958` | |
| broadcast `:2942-2943` | `:2965-2966` (method closes at `:2967`) | |
| `reapDeadSession` `:2344` | `:2367` | not touched |
| `tmux.killSession` `src/main/tmux/sessions.ts:230-240` | `:231-240` | `kill-session -t formatSessionTarget(target)` |
| Restart step 3 `restart.ts:184-201` | `:184-201`, `host.killSession` at `:191` | |
| `killOwnSession` `scratch.ts:62-72` | `:62-73`, prefix guard `:63`, `tmux.killSession(id)` `:70` | |
| per-case clean-up `scratch.ts:123-127` | `cleanupCase` `:114`, `core.killSession` `:123`, `killOwnSession` `:126` | |
| sweep `:150`, `:158` | `sweepLeftovers` `:145`, `:150`, `:158` | |
| `resume.ts:571`, watchdog `:719-723`, `withTimeout` `:840` | `:571`, `:716-725` (`app.exit(1)` at `:723`), `:840` | |
| `harness-socket.mjs` reap `:125-156`, teardown `:221-245` | `reapDeadRuns` `:125-150` (`kill-server` `:146`), `teardown` `:221-244` (`kill-server` `:232`) | |
| `package.json:237` `conformance:resume` | `:244` | |
| harness-socket wraps 105 lines | 106 (`grep -c harness-socket.mjs package.json`) | |
| `ps.ts` `PS_ARGS :35`, `descendantsOf :68`, `readPsTable :86` | same; `childIndex` `:57` | |
| `orphans.ts` `KillFn :200`, `:212`, `kill(-pid) :220`, zsh note `:51-69` | same | |
| `guarded.ts:79` group kill | `killProcessGroup` `:79`, `process.kill(-pid` `:87` | refused shape |
| `probe-p314.mjs:355-389`, `:769-804`, `:1337-1356`, `:458-461` | `noteAgentProcs` `:361-389`, by-pid ending `:780-805`, `finally` `:1340-1363`, Claude wrapper `:455-470` | |
| `mutation-ledger.ts:25` `MUTATION_JOIN_DEADLINE_MS = 10_000` | `:25` | |
| `HELPER_USER_FLOOR` 149 at `assert-electron-teardown.mjs:292` | **153 at `:326`** | this phase takes it to 154 |
| `remoteKill` `remote-sessions.ts:1960-1973` | `:1960` | not touched |
| `VERBS_THIS_RUNG_REFUSES` `exec-plane.ts:377-381` | `:377` | |
| `git grep -l kill-server -- build`: 108 files, 104 scripts | 111 files, 107 `.mjs`/`.mts`/`.cjs` | not swept, as the entry says |
| Gemini 0.54.0, mtime 2026-08-06 14:46:28 | same (`package.json` and `bundle/gemini.js`), no file newer except docs and sandbox profiles | |

### 1.2 Measured by the spec step, so no builder re-derives it

- **The wide read costs about what the narrow one does.**
  `ps -axo pid=,ppid=,pgid=,tpgid=,stat=,lstart=,command=` with `LC_ALL=C` takes 59.2 ms median over 15 runs
  (min 56.6, max 82.9, 1,285 rows, 351 KB). `PS_ARGS` takes 57.0 ms over 1,296 rows. That is on this Mac
  (Mac16,8, 12 cores) on 2026-09-29. Research 129's 36.7 ms was taken on a smaller table.
- **`lstart` depends on the locale.** Under `LC_ALL=C` it reads `Tue Sep 29 17:41:36 2026`. It is padded to 28
  characters, and a day below 10 is space padded (`Sun Sep  6`). Under `fr_FR.UTF-8` the same process reads
  `Mar 29 sep 17:41:36 2026`. So **every read in this phase runs `/bin/ps` with `LC_ALL=C` and `-ww`**. The
  parser accepts only the C form and collapses runs of whitespace before comparing. The entry's "fixed
  24-character start time" is true only under C.
- **The `sess` column is 0 for every process on macOS**, so it proves nothing. Group membership is read from
  `pgid` and `tpgid`.
- **The pane-pid read is cheap.** `list-panes -s -t <$-id> -F …` took 5.4 ms median and 107.7 ms max, over 81
  reads under four-way concurrency.
- **A tsx child costs 160 to 500 ms.** It runs `node <tsx cli> --tsconfig tsconfig.node.json` on a `.mts` that
  imports `src/main/proc/ps.ts`. Bare `node -e 1` costs 51 ms. §5.5 uses this number.

### 1.3 What the entry got wrong or did not have

1. **Gemini survives the hang-up in ONE shape, not three.**
   - Created shape (Gemini's launcher is the pane process): both processes survived, 3 of 3. SIGTERM ended
     them in 941, 1,176 and 1,465 ms.
   - Restored shape (a login shell is the pane) and wrapped shape (`specstory run` is the pane): both
     processes ended on the hang-up, 6 of 6, in 706 to 1,534 ms.
   - This is consistent with the hang-up reaching only the session leader. Gemini's launcher catches it and
     waits for its child. In the other two shapes the leader exits, and Gemini's child then gets its own
     hang-up. Why the child never finishes on its own stays unmeasured, as the entry says. The fix does not
     depend on the reason.
2. **R1's default would end Codex's shared background server and could cut Gemini's own self-update in half.**
   See §2. This is the census's second stop condition: "a process that a second session of the same agent
   also uses". The spec settles it before any builder starts, as the entry requires.
3. **A pane pid can be reused.** `remain-on-exit failed` keeps a dead pane, and the pid it names is free for
   the kernel to hand out again. So a root must be a LIVE pane (`#{pane_dead}` 0), and its process-table row
   must have the server that answered (`#{pid}`) as its parent. Otherwise the tree read would walk a
   stranger's subtree.
4. **`HELPER_USER_FLOOR` is 153 at this head, at `:326`, not 149 at `:292`.**
5. **Case (g) ("`ps` unavailable, by injection") cannot be driven in the running app without adding a
   test-only seam to the product.** It moves to the unit test, which drives the real `killSessionAdmitted`
   with a reader that answers `null`, and to ablation arm A15.
6. **The harness half (j) needs no Electron except for the conformance runs themselves.** Its teardown and
   reap arms become `probe:p323:harness`, a tmux harness (§8.2).
7. **`conformance:resume` runs under HIS home, so R3 excludes Gemini from it.** Every run of it sets
   `GMUX_CONF_AGENTS` explicitly. Also, `conformance:resume:specstory`'s own default list names
   `antigravity`, so it may only be run with an explicit list.
8. **The pi row in the restored shape never reached its screen.** It printed a node TLS stack trace and was
   gone before the tree read, 3 of 3. Its restored row reads "exited at start under the scratch HOME".

---

## 2. The two facts, and the rule this phase adopts

### 2.1 The facts, read from source

- **Codex starts a shared background server as a single-fork `setsid` child of whichever Codex TUI finds none
  running.** Both files are in his checkout `/Users/gdc/codex` at `b1e72963c3`, read only:
  - `codex-rs/features/src/lib.rs:949-953`: `daemon_auto_start` is Stable with `default_enabled: true`.
  - `codex-rs/tui/src/startup_orchestration.rs:494-530`: the TUI calls
    `codex_app_server_daemon::start_with_features` in process.
  - `codex-rs/app-server-daemon/src/backend/pid_start.rs:139-146` and `:241`: a `pre_exec` that calls
    `setsid()`, then one plain `command.spawn()`. No double fork.

  So the first Codex session opened after a boot holds the server as a descendant of its pane for as long as
  it lives. That includes the Codex he resumes by pressing Enter on a restored Tortie row. Every other Codex
  session then talks to that server, whether it is in Tortie or not. His own `ps` today shows it:
  `codex app-server daemon pid-update-loop` (pid 78444, ppid 1, its own group, started Mon Sep 28 23:10:56)
  over `codex app-server --listen unix:// --managed-daemon` (pid 28046). The start is ten seconds after his
  Codex install's mtime (23:10:46).

  Ending "the descendants that left the terminal" of that session would end the server under every other
  Codex session, mid-turn. Today it survives, because a `setsid` process gets no hang-up. The spec step
  could not measure it live. Starting the server under a scratch `CODEX_HOME` installs a package (research
  133 §8), and under his home it is his running server.
- **Gemini's self-updater is a detached `npm install -g` of his global install.**
  `bundle/chunk-5SMD2SLQ.js:~232-247` runs `spawnFn(updateCommand, { stdio: "ignore", shell: true, detached:
  true })`, and research 129 §3.5 saw it run at launch. Ending it mid-install could leave his Gemini install
  half-written. Today it completes.

Neither can be told from a grok MCP server or a detached tool by anything `ps` prints. All of them are
`setsid` children of the agent, with no controlling terminal, and each has its own group. Telling them apart
needs the descriptors (`lsof`), per-agent registry data, or a name. The entry refuses a name. The other two
are designs of their own.

### 2.2 The rule: what is still on the session's terminal (his ruling of 2026-09-30)

**R1's delivered scope is his ruling, not a hold.** He said yes to R1 on 2026-09-29 ("Yes, end them"). The
build narrowed it for the reason §2.1 gives. On 2026-09-30 he ruled on that narrowing: **"Fix the tests, then
land"**. For this phase, End ends only processes that are still on the session's terminal, in the group the
hang-up was aimed at. A process that fully left the terminal is left alone, exactly as today, and ending it is
**a separate follow-up**. That covers Codex's shared server, Gemini's updater, grok's MCP servers, a detached
tool and a person's background job. The product half stays as the fix rounds left it: the quit does not wait,
and End does not read the whole process table in its own time. His ruling repairs only the proof (§9, and the
last section).

**End ends a process only if all of the following hold.** This is the tree at this head. The second fix round
narrowed item 2 and added item 4.
1. The tree read recorded it under a LIVE pane of that session. The pane was read by the `$-id` that
   `liveIds` holds. Its root is a child of the tmux server that answered, and it leads its own group, which
   every pane process does.
2. At that read, it was in the pane process's own group, which is the group the hang-up was aimed at. The
   terminal's foreground group (`tpgid`) is NOT selected. The second fix round removed it (d2), and E6
   refuses a selection that reads it.
3. It is still running after `HANGUP_GRACE_MS` (10 s), with the same start time, command line and group.
4. No other session still shows its pane (`hungUpOnly`, asked of the same server before each signal). A
   window that a grouped session or a linked window still shows was never hung up (S10).

It is sent SIGTERM, and SIGKILL `TERM_GRACE_MS` (60 s) later if it still matches. Each pid is signalled on
its own, never as a negative pid, a group, a pattern or a name.

A process that called `setsid` or moved to a group of its own is **never signalled**. That covers Codex's
server, Gemini's updater, grok-style MCP servers, a detached tool, and a person's background job. An
executable under `.app/Contents/MacOS/` is never signalled either, whatever its group.

What this delivers against the entry and his rulings:

| Case | Today | After this phase | Why |
| --- | --- | --- | --- |
| Gemini, created (the defect) | pair runs forever | ended by SIGTERM, about 10 s after End | both in the pane's group (census, 3 of 3) |
| An MCP server or helper in the agent's own group that ignores the hang-up | runs forever | ended | His Mac holds 5 such bun servers at ppid 1, each with a pgid not its own (§10.3) |
| A `setsid` MCP server (grok's), a detached tool | runs | **runs, as today** | his ruling of 2026-09-30: what fully left the terminal is a separate follow-up |
| Codex's shared server, Gemini's updater | runs | runs | the same ruling, and the reason §2.1 gives |
| A person's `nohup … &` in a restored agent session | runs | runs | a background job has its own group |
| A person's foreground `nohup` in a restored agent session | runs | runs, as today | the terminal's foreground group is not selected (second fix round, d2) |
| A pane another session still shows (grouped session, linked window) | runs | runs | it was never hung up (S10) |
| An End followed by a quit within the first 10 s | Gemini runs | Gemini runs, as today | the quit does not wait (fix round) |
| Any plain `shell` session | hang-up only | hang-up only | R2: no tree is read at all |

**Why the narrowing was built before he ruled.** The narrowed rule is a strict subset of R1. Every module,
seam, gate and probe arm below is the same under either, and only the selection predicate differs. Widening
it is one ablation arm (A9), and E6 keeps it red. His standing rule removes the part that regresses. The
`setsid` half needs a way to tell a shared server or an installer from a per-session helper, which means
`lsof`, a per-agent spare list or a registry field. That is a design of its own, and it is now the follow-up
he named.

---

## 3. The census the spec step ran (no Electron, scratch HOME, vendored tmux 3.7b)

**The rig.** `scratchpad/p323/spec/census.mjs`, a scratch instrument that is not committed. The raw results
are under `scratchpad/p323/spec/run-61895/` and `run-83408/`. They do not survive a reboot. The rig was:
- one scratch server, `-L gmux-p323spec-<pid>`, with `-f resources/gmux-tmux.conf` and the vendored
  `build/vendor/tmux/bin/tmux`;
- a scratch HOME holding Gemini's R8 `settings.json`, a `~/.codex/config.toml` with
  `check_for_update_on_startup = false` and `[features] daemon_auto_start = false`, and omp's
  `startup.checkUpdate: false`;
- an `npm` first on PATH that refuses and logs, plus `.zprofile` and `.zshrc` putting it first for login
  shells;
- the environment guards `DISABLE_AUTOUPDATER=1`, `MUSE_NO_AUTO_UPDATE=1`, `OPENCODE_DISABLE_AUTOUPDATE=1`,
  `AGENT_CLI_UPDATE_CHECK_URL=http://127.0.0.1:9/`, `OMP_SKIP_SETUP=1`, `NO_UPDATE_NOTIFIER=1` and
  `GMUX_SPECSTORY_NO_CLOUD=1`, with `--disable-auto-update` passed to cursor;
- every `CLAUDECODE*`, `CLAUDE_*`, `ZDOTDIR`, `TMUX` and `TMUX_PANE` removed from the environment.

Each off switch was confirmed present in its binary before use: `OPENCODE_DISABLE_AUTOUPDATE` 3 times,
`DISABLE_AUTOUPDATER` 11 times in Claude 2.1.285, `OMP_SKIP_SETUP` once, and `--disable-auto-update` and
`AGENT_CLI_UPDATE_CHECK_URL` in cursor's JS.

**The shapes, as the product builds them:**
- **created** is `new-session -- <bin>`;
- **restored** is `new-session` with no command, then the bare command typed and entered;
- **wrapped** is `<vendored specstory> run <provider> --no-version-check --silent --no-cloud-sync -c "<bin>"`,
  the argv `wrapArgv` composes at `src/main/specstory/wrap.ts:186-198`.

**The measurement.** For each row: wait for a stable first screen and a stable tree, then read the tree.
Send `kill-session`. Re-read the recorded pids every 40 ms for 20 s, matching on start time, command line
and group. Any survivor then gets SIGTERM, then SIGKILL after 5 s. No key that answers anything was ever
sent.

Three trials of created and restored, and three of wrapped where a provider exists: **72 agent rows and 150
processes.** Controls ran once.

**Versions**, read from files and not by running anything: Claude 2.1.285, cursor-agent 2026.09.18-9a7762b,
Codex 0.158.0 (bun global), Gemini 0.54.0, deepseek-tui 0.8.26 (`deepseek`; `codewhale` and `codew` are
absent), muse-bin 1.4.1-R4503.1, pi 0.84.2, omp 18.0.11, opencode at `~/.opencode/bin` (mtime 2026-09-21).
Droid is not installed. Qwen, agy and grok were not launched, by his ruling.

| Row (shape-agent) | Trials | Tree at rest (own group marked) | Slowest exit on the hang-up, ms | Survivors | SIGTERM exit, ms |
| --- | --- | --- | --- | --- | --- |
| c-claude | 3 | claude Ss+ | 221, 270, 239 | 0, 0, 0 | — |
| r-claude | 3 | -zsh Ss, claude S+ | 343, 424, 490 | 0, 0, 0 | — |
| w-claude | 3 | specstory Ss+, claude S+ | 331, 420, 452 | 0, 0, 0 | — |
| c-cursor | 3 | cursor-agent Ss+ | 46, 51, 48 | 0, 0, 0 | — |
| r-cursor | 3 | -zsh Ss, cursor-agent S+ | 643, 326, 939 | 0, 0, 0 | — |
| w-cursor | 3 | specstory Ss+, cursor-agent S+ | 401, 415, 1015 | 0, 0, 0 | — |
| c-codex | 3 | node Ss+, codex S+ | 906, 647, 539 | 0, 0, 0 | — |
| r-codex | 3 | -zsh Ss, node S+, codex S+ | 543, 825, 553 | 0, 0, 0 | — |
| w-codex | 3 | specstory Ss+, node S+, codex S+ | 580, 923, 583 | 0, 0, 0 | — |
| **c-gemini** | 3 | node Ss+, node S+ | — | **2, 2, 2** (both in the pane's group) | 941, 1176, 1465 |
| r-gemini | 3 | -zsh Ss, node S+, node S+ | 706, 1534, 1279 | 0, 0, 0 | — |
| w-gemini | 3 | specstory Ss+, node S+, node S+ | 814, 1455, 1279 | 0, 0, 0 | — |
| c-deepseek | 3 | node Ss+, deepseek S+, deepseek-tui S+ | 829, 885, 979 | 0, 0, 0 | — |
| r-deepseek | 3 | -zsh Ss, node S+, deepseek S+, deepseek-tui S+ | 772, 686, 483 | 0, 0, 0 | — |
| w-deepseek | 3 | specstory Ss+, node S+, deepseek S+, deepseek-tui S+ | 698, 878, 915 | 0, 0, 0 | — |
| c-muse | 3 | muse-bin Ss+ | 52, 54, 71 | 0, 0, 0 | — |
| r-muse | 3 | -zsh Ss, muse-bin S+ | 392, 626, 392 | 0, 0, 0 | — |
| w-muse | 3 | specstory Ss+, muse-bin S+ | 313, 1012, 505 | 0, 0, 0 | — |
| c-pi | 3 | pi Ss+ | 50, 66, 50 | 0, 0, 0 | — |
| r-pi | 3 | -zsh Ss+ (pi had already exited, §1.3 item 8) | 54, 47, 57 | 0, 0, 0 | — |
| c-omp | 3 | omp Ss+ | 121, 148, 106 | 0, 0, 0 | — |
| r-omp | 3 | -zsh Ss, omp S+ | 634, 473, 702 | 0, 0, 0 | — |
| c-opencode | 3 | opencode Rs+ | 103, 90, 75 | 0, 0, 0 | — |
| r-opencode | 3 | -zsh Ss, opencode S+ | 412, 334, 303 | 0, 0, 0 | — |
| ctl `sleep` | 1 | sleep Ss+ | 129 | 0 | — |
| ctl `trap '' HUP; exec sleep` | 1 | sleep Ss+ | — | 1 (pane's group) | 45 |
| ctl `setsid` child | 1 | sleep Ss+, sleep Ss (own group) | 386 | 1 (own group) | 44 |
| ctl shell `nohup sleep &` | 1 | -zsh Ss+, sleep SN (own group) | 424 | 1 (own group) | 44 |
| ctl shell `( perl setsid sleep; true ) &` | 1 | -zsh Ss+, -zsh SN (own group), sleep SNs (own group) | 414 | 1 (own group) | 50 |

**Neither stop condition fired in the census.** No tree held an `.app/Contents/MacOS/` executable, and no
tree held a process a second session uses. Codex's server was off by configuration in the scratch HOME; §2.1
settles it from source. Every install fingerprint was unchanged before and after both runs: realpath, mtime
and size of each binary, Gemini's `package.json` mtime, and the Claude and cursor version directories. The
refusing `npm` was never called. The `finally` ended 0 processes, because every survivor had been ended
inside its own row. `lsof -a -d cwd +D` over every census work folder afterwards listed 0 processes.

**The constants, from this table:**
- `HANGUP_GRACE_MS = 4_000`: 2.6 × the slowest orderly exit measured (1,534 ms, restored Gemini under
  four-way concurrency). Every agent above that ends itself on the hang-up exits inside it, so after this
  phase it is sent no signal.
- `TERM_GRACE_MS = 2_500`: 1.7 × the slowest SIGTERM exit (1,465 ms).
- `POLL_MS = 250`: the re-read interval. The continuation returns as soon as nothing still matches.
- `TREE_READ_TIMEOUT_MS = 2_000`: 34 × the wide read's median.

The worst case is a process that ignores both signals: 4,000 + 2,500 ms plus about 27 re-reads of about
10 ms, roughly 6.8 s, inside the ledger's 10,000 ms. In the common case the agent exits within 1.5 s, and the
continuation ends at the first poll after it goes.

---

## 4. The mechanism, seam by seam

### 4.1 `src/main/proc/session-tree.ts`, new (builder-product)

The module is pure plus injected. It imports no Electron and no tmux module; type imports are allowed. That
is what lets the harness runner (§4.5) load it under tsx. **The exported surface is fixed here** so the other
two builders can code against it in parallel. A name may change only if all three builders change it in the
integration round.

```ts
import type { KillFn } from './orphans';            // type only: the one KillFn in main
import { childIndex, descendantsOf } from './ps';   // the cap and the cycle guard, reused

export interface TreeRow { pid: number; ppid: number; pgid: number; tpgid: number; stat: string; lstart: string; command: string }
/** What proves a pid is still the process the tree read recorded. */
export interface TreeEntry { pid: number; pgid: number; lstart: string; command: string }
export interface PaneRoot { pid: number; serverPid: number }
export interface SessionTree {
  /** Every process read under the live panes, roots included (the harness's closing check reads these). */
  readonly all: readonly TreeEntry[];
  /** The ones the hang-up was aimed at: in a root's own group or its terminal's foreground group (§2.2). */
  readonly targets: readonly TreeEntry[];
}

export const TREE_PS_ARGS: readonly string[];        // ['-ww', '-axo', 'pid=,ppid=,pgid=,tpgid=,stat=,lstart=,command=']
export function identityPsArgs(pids: readonly number[]): string[]; // ['-ww', '-o', <same fields>, '-p', pids.join(',')]
export const PANE_ROOT_FORMAT: string;                // '#{pane_pid}\t#{pane_dead}\t#{pid}'
export function sessionPanesArgv(target: string): string[];  // ['list-panes', '-s', '-t', target, '-F', PANE_ROOT_FORMAT]
export const ALL_PANES_ARGV: readonly string[];      // ['list-panes', '-a', '-F', PANE_ROOT_FORMAT]

export const HANGUP_GRACE_MS = 4_000;
export const TERM_GRACE_MS = 2_500;
export const POLL_MS = 250;
export const TREE_READ_TIMEOUT_MS = 2_000;

export function parsePaneRoots(stdout: string): PaneRoot[];               // drops pane_dead=1 and non-integers
export function parseTreeTable(stdout: string): Map<number, TreeRow>;     // C-locale lstart only; whitespace collapsed
export function readSessionTree(table: ReadonlyMap<number, TreeRow>, roots: readonly PaneRoot[], selfPid: number): SessionTree;
export function stillTheSame(entries: readonly TreeEntry[], table: ReadonlyMap<number, TreeRow>): TreeEntry[];
export function basenameOf(command: string): string;

export interface EndDeps {
  readTable(): Promise<Map<number, TreeRow> | null>;                           // null: ps failed or timed out
  reread(pids: readonly number[]): Promise<Map<number, TreeRow> | null>;       // null: ps failed or timed out
  kill: KillFn;
  sleep(ms: number): Promise<void>;
  now(): number;
}
export function defaultEndDeps(): EndDeps;   // runGuarded('/bin/ps', …, { env: { ...process.env, LC_ALL: 'C' }, timeoutMs: TREE_READ_TIMEOUT_MS, maxOutputBytes: 16 MB }), process.kill, setTimeout, Date.now
export interface EndReport { ended: Array<{ pid: number; name: string; signal: 'SIGTERM' | 'SIGKILL' }>; readFailed: boolean }
export function endHangupSurvivors(tree: SessionTree, deps: EndDeps): Promise<EndReport>;
```

**`readSessionTree`, the rules:**
- A root counts only if its row exists AND `row.ppid === root.serverPid`. That makes it the server's own
  child, which is what defeats a reused pid of a dead pane.
- The walk uses `childIndex` and `descendantsOf` (4,096 cap, cycle-safe) from each counted root.
- Never included, even if the table says otherwise: pid ≤ 1, `root.serverPid` or any row that is a tmux
  server's own ancestor, and `selfPid`.
- `targets` are the entries whose `pgid` is the root row's `pgid` or its `tpgid` (when above 0) and whose
  argv[0] does not contain `.app/Contents/MacOS/`.
- `all` is every entry. Duplicate pids across roots are counted once.
- To widen `childIndex`'s parameter to `ReadonlyMap<number, { pid: number; ppid: number }>`, which is a pure
  type widening, builder-product edits `ps.ts` and nothing else in it.

**`endHangupSurvivors`, the order, which the gate pins:**
1. If `targets` is empty, return at once.
2. Poll with `reread`. On `null`, return `readFailed` having signalled nothing.
3. Set `alive = stillTheSame(targets, table)`. Identity means pid, `pgid`, `lstart` and `command` all equal.
   If `alive` is empty, return.
4. Keep polling every `POLL_MS` until `HANGUP_GRACE_MS` has passed since the call.
5. Send `kill(pid, 'SIGTERM')` to each member of the `alive` that the latest re-read produced. Catch ESRCH.
6. Poll again as in steps 2 to 4, for up to `TERM_GRACE_MS`.
7. Send `kill(pid, 'SIGKILL')` to each member of the latest `alive`.

A `kill` is never called on a list that did not come from the re-read immediately before it. No other call
signals anything. It never throws; an unexpected error is a `readFailed` report.

### 4.2 `src/main/sessions/core.ts`, `killSessionAdmitted`'s local branch only (builder-product)

Nothing else in the file changes. Phase 320.1 is editing `scrollTarget` (`:2529-2575`) in parallel, and this
phase never touches that region.

- **One field:** `private readonly endTreeDeps: EndDeps = defaultEndDeps();`. The unit test's fake `this`
  replaces it.
- **Inside `if (target !== undefined) {`, after the capture block and before `await tmux.killSession(target);`:**
  `const tree = rec.agent !== 'shell' ? await this.readEndTree(target, rec.name) : null;`. `tree` is declared
  with `let` above the `if`, so the continuation can see it. **THE ORDER IS THE PROMISE:** the capture, then
  the tree read, then the hang-up. `await tmux.killSession(` keeps its exact spelling, because
  `end-restore-order.test.ts` pins it.
- **After `this.broadcastSessions();`, as the last statement:** `if (tree !== null) this.endAfterHangup(tree, rec.name);`.
  This is not awaited, so the End answers the window before the waits.
- **`private async readEndTree(target, name): Promise<SessionTree | null>`:**
  - Run `tmux.execTmux(sessionPanesArgv(tmux.formatSessionTarget(target)))`, then `parsePaneRoots`.
  - If there are no roots, return `null` and log nothing.
  - Otherwise run `this.endTreeDeps.readTable()`.
  - If the pane read throws or the table is `null`, log ONE `sessionsLog.warn` line saying the process table
    could not be read and only the hang-up was sent, then return `null`.
  - Otherwise return `readSessionTree(table, roots, process.pid)`.

  The root never comes from `rec.panePid`, a name or the manifest.
- **`private endAfterHangup(tree, name): void`:**
  - Start `endHangupSurvivors(tree, this.endTreeDeps)`.
  - Log ONE line when `report.ended` is non-empty. It names each process by basename, pid and signal. It never
    includes a command line.
  - Log one line when `report.readFailed`.
  - Swallow any rejection into a log line.
  - Hand the promise to `this.ledger.follow(...)` before returning.
- **`reapDeadSession` (`:2367`), the remote branch, `endRefusal`, the capture, the status write and the
  SpecStory flush do not change.**

### 4.3 `src/main/sessions/mutation-ledger.ts` (builder-product)

- **`follow(work: Promise<unknown>): void`** adds a settle-only wrapper to `admitted` and deletes it on
  settle. It **does not check `shuttingDownFlag` or `isDisposed()`**, because it is called only from inside a
  body that `admit` has already let in. That is the entry's rule that "a shutdown that begins after the End
  was admitted can never refuse that continuation". Its doc comment says it may only be called from inside an
  admitted body.
- **`join(deadlineMs)` loops.** While `admitted.size > 0` and the deadline has not passed, it awaits
  `Promise.race([Promise.all([...admitted]), remaining time])`. Without the loop, a continuation added after
  a quit's join had already taken its snapshot of the set is never waited for. That happens when the quit
  begins while the End is still inside its capture.
- The header's "three public verbs" becomes four. The module still names no `GmuxCore`, which
  `p125-core-split.test.ts` pins.

### 4.4 The conformance harness (builder-harness)

**`src/main/conformance/scratch.ts`:**
- **`killOwnSession`.** The prefix guard stays the first statement. Then the id lookup, then the tree read
  (`tmux.execTmux(sessionPanesArgv(id))` with `defaultEndDeps().readTable()`), then `tmux.killSession(id)`.
  Then the tree is pushed to the run's module-level list and **awaited**:
  `await endHangupSurvivors(tree, deps)`. Step 5's simulated reboot then ends what a reboot ends, before
  step 7 restores.
- **`cleanupCase` and `sweepLeftovers`.** Before each `core.killSession(rec.id)` (`:123`, `:150`), read the
  tree of that row's live `$-id` (from `tmuxIdFor`) and record it only. The product's End ends it. The sweep's
  own `tmux.killSession(live.sessionId)` (`:158`) reads, ends and records the way `killOwnSession` does.
- **`export async function leftBehind(): Promise<{ targets: string[]; outOfScope: string[] }>`** re-reads
  every recorded tree once through `stillTheSame`. `targets` is the basenames of hang-up targets still
  running. `outOfScope` is every other recorded process still running.

**`src/main/conformance/resume.ts`.** After `shutdownGmuxCore()` and `drainWatcherCloses` (which join every
End continuation), and before `exitCodeFor`, call `leftBehind()` and print one line with both counts and
basenames:
- `targets.length > 0` prints `[gmux-conf] FAIL: N agent process(es) of this run are still running` and
  raises the exit code to at least 1.
- `outOfScope` is printed as the `setsid` half R1 holds, never red.

The watchdog, `withTimeout` and the `catch` path skip this, and the wrapper's backstop (§4.5) is what covers
them.

### 4.5 `build/harness-socket.mjs` and `build/session-tree-cli.mts`, new (builder-harness)

**One implementation.** The `.mjs` never parses a process table and never signals a process. It runs the
runner under the pinned tsx: `spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json',
'build/session-tree-cli.mts', <mode>, …], { input, encoding: 'utf8', timeout: 15_000, cwd: repoRoot })`, with
`tsxCli()` from `build/ts-runner.mjs`. The runner imports only `src/main/proc/session-tree.ts`.

**The runner has two modes:**
- `read <socket>` runs `tmux -L <socket> list-panes` with `ALL_PANES_ARGV`, using the same PATH `tmux` as
  harness-socket, then `readTable`, then `readSessionTree`. It prints the tree as JSON.
- `end` reads that JSON on stdin, runs `endHangupSurvivors` with `defaultEndDeps()`, and prints
  `{"ended":N}`.

**In `teardown` (`:221`) and in `reapDeadRuns` (`:125`)**, before each `kill-server` on a socket the marker
proves is the run's:
- If `tmux -L <socket> list-panes -a -F '#{pane_id}'` prints nothing, **no tsx child starts**. That is the
  common teardown, and it costs nothing.
- Otherwise `read` runs, then the existing `kill-server`, then `end`, then ONE line:
  `[harness-socket] ended N process(es) the hang-up left running on -L <socket> (<when>)`, printed only when
  N > 0.

**Cost, measured in §1.2:** 160 to 500 ms per tsx child, two children only when a live pane existed, plus the
`end` mode's early-exit poll. `node build/harness-socket.mjs gmux-p323cost 'true'` must add no child at all,
and the builder prints the before and after wall time of that run and of one that leaves a live pane.

**R2 does not bind here.** The marker proves the server is the run's own scratch server, and no person's work
is in it. The same §2.2 selection applies, so a Codex server a conformance case happened to start under his
HOME is spared exactly as in the product. Every read is synchronous (`spawnSync`) and waited for, so
`gate:background` has no new long-lived child to ask about.

### 4.6 What reaches `session-tree.ts`, pinned

Exactly these importers outside tests: `src/main/sessions/core.ts`, `src/main/conformance/scratch.ts` and
`build/session-tree-cli.mts`. `resume.ts` reaches it only through `scratch.ts`'s `leftBehind`.

**Nothing on reconcile, `reapDeadSession`, boot, quit, suspend or a timer calls it.** That is "Tortie never
auto-ends a session" written as a property of the tree. Only his End and his Restart reach it. Restart reaches
it through `restart.ts:191` → `killSession`, and ⌘J and the session manager's batch End reach it through
`sessions:kill`.

---

## 5. Tests (builder-product)

### 5.1 `src/main/proc/__tests__/session-tree.test.ts`

The tests use planted tables and a recording `kill` that asserts every pid is above 1 and not the test's own.
One case per rule:
- **Parsing.** The C form parses, including a padded day and a command with spaces. A `fr_FR` line parses to
  nothing. `tpgid` reads 0 for no terminal.
- **Roots.**
  - A dead pane (`pane_dead` 1) is dropped.
  - A root whose `ppid` is not the server that answered is dropped. That is the reused-pid-of-a-dead-pane
    case.
  - The server, pid 1 and `selfPid` are never included, even when the table claims them as descendants
    (tmux server as the root's parent).
  - A cycle terminates.
  - The 4,096 cap holds.
- **Selection, one planted table per census shape:**
  - created Gemini: both processes are targets;
  - restored: the zsh root, and the agent job through `tpgid`;
  - wrapped: specstory and the agent;
  - a `setsid` child is never a target;
  - a person's background job with its own group is never a target;
  - **Codex's server shape**: TUI S+ → `pid-update-loop` Ss in its own group → `app-server` → host. Only
    the TUI is a target;
  - an `.app/Contents/MacOS/` executable in the pane's group is never a target.
- **Identity, one case each:**
  - a reused pid (same number, different `lstart`);
  - a process that `exec`s a different program after the read (`command` changed);
  - a process that left its group after the read;
  - a process that joins the group after the read (it is not in the tree);
  - a process that exits during the wait.
- **Ending:**
  - everything exits within the hang-up grace: 0 signals;
  - one survivor ends on SIGTERM: no SIGKILL;
  - TERM-resistant: SIGKILL;
  - `reread` returns `null` at any step: nothing is signalled, `readFailed` is set;
  - early exit: the fake clock shows the call returning at the first poll after the targets are gone.

### 5.2 `src/main/sessions/__tests__/p323-end-tree.test.ts`

This is `./p293-removed-remote-row.test.ts`'s shape: the REAL `killSessionAdmitted` comes off
`GmuxCore.prototype`. It is called on a fake `this` holding the fields it reads, including `endTreeDeps` and a
real `MutationLedger`. It uses `vi.mock` for `../../tmux` (`killSession`, `execTmux`, `formatSessionTarget`),
`../../restore/snapshots` (`captureSessionSnapshot`) and the broadcast module. One event log records every
step. The cases:
1. **Order:** capture, then the pane read, then the table read, then `tmux.killSession`, then the broadcast,
   then any `kill`.
2. A `shell` row: no pane read, no table read, no `kill`, and the End still ends.
3. **A failed `ps`** (`readTable` answers `null`): `setStatus('exited')` and `tmux.killSession` still happen,
   nothing is signalled, and exactly one warn line appears. This is the entry's (g).
4. The End's promise settles while a fake `sleep` is still held. The waits are not in band.
5. **A quit joins the waits:**
   - `join(10_000)` stays pending until the held sleep is released;
   - a `join` that started while the End was inside its capture still waits for the continuation (the loop
     in §4.3);
   - `beginShutdown()` called after admission does not refuse `follow`.
6. A remote row id never reads a tree.
7. The tree root is the `$-id` from `liveIds`. A `panePid` on the record is ignored.

`gate:checks` runs, because two test files are added.

---

## 6. `conformance:endtree`, new (builder-gates)

The gate is `build/conformance-endtree.mjs`: about 1 s, spawning nothing and reading nothing under his home.
It reads source with the TypeScript parser (`import ts from 'typescript'`, as `build/conformance-choices.mjs`
does for method bodies) and `stripComments` from `build/scan-source.mjs`. `--root <dir>` points it at a clone
for the ablation.

**The rules:**
- **E1** In `killSessionAdmitted`, the order in the body is: `captureSessionSnapshot(`, then `readEndTree(`,
  then `tmux.killSession(target)`, then `broadcastSessions()`, then `endAfterHangup(`, the last statement.
  `readEndTree(` sits inside the `target !== undefined` block, and `endAfterHangup(` is not awaited.
- **E2** The tree's root comes from `target`, meaning `this.liveIds.get(sessionId)`. `readEndTree`'s body
  names `sessionPanesArgv(` and `target`. Neither method names `panePid`, `tmuxName` or `rec.name` inside an
  argv.
- **E3** The tree read is guarded by `rec.agent !== 'shell'` (R2).
- **E4** `session-tree.ts`:
  - names no `kill(-`, `-pid`, `killpg`, `pkill`, `killall`, `pgrep` or `SIGHUP`;
  - has exactly two `kill(` call sites, both in `endHangupSurvivors`;
  - each iterates a variable assigned from `stillTheSame(` in the same loop step, with no `await` between the
    assignment and the kill loop.
- **E5** `stillTheSame` compares `pid`, `pgid`, `lstart` and `command`, all four.
- **E6** `readSessionTree` selects `targets` by the root's `pgid` and `tpgid` and excludes
  `.app/Contents/MacOS/`, and roots require `ppid === serverPid` and a live pane. **A selection wider than the
  hang-up's groups is red. This is R1's held half written as a rule, so a later round must come back through
  him to widen it.**
- **E7** The importers are exactly those in §4.6.
- **E8** `reapDeadSession`, `refresh` and the reconcile, `boot`, `dispose`, `shutdownGmuxCore` and every
  `setTimeout` or `setInterval` callback in `core.ts` name no function of the module and neither of the two
  methods. `endAfterHangup(` appears exactly once in `core.ts`.
- **E9** `HANGUP_GRACE_MS` ≥ 2 × 1,534, the census's slowest orderly exit, written as a constant in the gate
  with this file cited. `HANGUP_GRACE_MS + TERM_GRACE_MS + 2 × TREE_READ_TIMEOUT_MS` < `MUTATION_JOIN_DEADLINE_MS`.
- **E10** `follow` names neither `shuttingDownFlag` nor `isDisposed`, and `join` loops (a `while` whose
  condition reads `admitted.size`).
- **E11** In `harness-socket.mjs`, in both `teardown` and `reapDeadRuns`: the runner's `read` precedes
  `kill-server` and `end` follows it. The `.mjs` names no `process.kill` except the existing `(pid, 0)`
  liveness probe and `child.kill(signal)` forwarding. `session-tree-cli.mts` names no `process.kill` and no
  `kill(`.
- **E12** Every `ps` spawn in the module passes `LC_ALL: 'C'`, and `TREE_PS_ARGS` contains `-ww`.
- **E13** The remote branch (`isRemoteSessionId(sessionId)` block) names no module function.

Every rule is first proved on in-memory mutated copies of the shipping text. Each copy must read red, beside
an unmutated control that must read green. That is the tree's standing rule for a source-reading gate.

---

## 7. `ablation:p323`, new (builder-gates)

The script is `build/p323/ablation.mjs`, in `build/p321/ablation.mjs`'s shape. It works in a `cp -Rc` clone
of `src/` and of the build files the gate reads, with `node_modules` and `build/vendor` symlinked and never
copied. It never writes the worktree, it restores and checks every file by sha256, and it removes the clone in
a `finally` and on a signal. Each arm's needle matches the shipping source exactly once. The owner named must
go red, meaning a gate rule or a named vitest row. An unedited control is green first and last.

| Arm | The edit | Owner |
| --- | --- | --- |
| A1 | the tree read moved above the capture | E1, p323 order |
| A2 | the tree read moved below `tmux.killSession(target)` | E1, p323 order |
| A3 | `endAfterHangup(` moved above `tmux.killSession(target)` | E1, p323 order |
| A4 | root from `rec.panePid` | E2, p323 root case |
| A5 | the `shell` guard removed | E3, p323 shell case |
| A6 | identity without `lstart` | E5, session-tree reused pid |
| A7 | identity without `command` | E5, session-tree exec'd |
| A8 | identity without `pgid` | E5, session-tree left its group |
| A9 | **targets = `all` (R1 in full)** | E6, session-tree setsid and Codex-server rows |
| A10 | `kill(-e.pid, …)` | E4 |
| A11 | SIGTERM over `tree.targets` without the re-read | E4, session-tree exits-during-wait |
| A12 | `follow` refuses once shutting down | E10, p323 shutdown case |
| A13 | `join` without the loop | E10, p323 join-during-capture case |
| A14 | `await this.endAfterHangup(…)` (waits in band) | E1, p323 settles-before-waits |
| A15 | a `null` table falls back to signalling the recorded roots | p323 failed-ps case |
| A16 | `reapDeadSession` calls `endAfterHangup` | E8 |
| A17 | the runner's `end` moved above `kill-server` in `teardown` | E11 |
| A18 | `LC_ALL: 'C'` removed | E12, session-tree `fr_FR` row |
| A19 | the `ppid === serverPid` root check removed | E6, session-tree reused-root row |
| A20 | the `.app/Contents/MacOS/` exclusion removed | E6, session-tree app-bundle row |

---

## 8. The app runs (verifiers only, under THE LOCK)

### 8.1 `probe:p323`: `build/p323/probe-p323.mjs` and `build/p323/stand-in.sh` (builder-gates writes them)

**Launch.** One Electron through `build/electron-run.mjs`, in `probe-p314.mjs`'s shape, with:
- a scratch profile under a harness directory, a scratch HOME and the socket `gmux-p323-<pid>`;
- `GMUX_TMUX_BIN` pointed at the vendored tmux;
- every `/^(?:CLAUDECODE|CLAUDE_)/` name and `ZDOTDIR` stripped (`build/p321/probe-p321.mjs`'s `STRIPPED`);
- the §3 guards, and Gemini's R8 settings in the scratch HOME;
- the refusing `npm` first on the scratch login PATH. It refuses every call and logs it; since the tools round a
  registry read (`npm view`, `npm info`, `npm ls`) is named and never fails the run, and only an install verb
  (`install`, `i`, `update`, `add`, a global add, `exec`) does. Every install is read by version and mtime
  before and after every arm, every global npm package included.

**Parent then HEAD.** `P323_PARENT_CHECKOUT` points at a BUILT checkout of the parent. If it is absent or not
built, the probe exits 2 with one sentence. The two builds run one after the other, never at once. The
parent's server does not survive into the HEAD run: each build gets its own socket.

**End and Restart go through the renderer's own bridge** (`window.gmux.sessions.kill` and `sessions:restart`).
The batch End goes through the session manager's `runBatchEnd` path (`src/renderer/session-manager/batch-end.ts:146`).

**Two HOMEs, chosen per session by folder.** Each wrapper on the scratch PATH sets `HOME` from `$PWD`: a
session in `<run>/his/…` gets his HOME, anything else gets the scratch HOME. Every wrapper also unsets `TMUX`
and `TMUX_PANE`. **Gemini's wrapper always sets the scratch HOME** (R3). There are no wrappers for `qwen`,
`agy` or `grok`: the probe refuses before launch if any of those names would be reached.

**The planted rows** use the `droid` registry row. Droid is not installed here, so its bare name on the
scratch PATH is `stand-in.sh <mode>`, where the mode comes from the create extras. A stand-in row is labelled
as planted in every table. The modes:
- `ignore-hup` (the pane's group);
- `fg-child-ignore-hup`;
- `ignore-hup-and-term`;
- `setsid-child`;
- `shared-server` / `shared-client` (A starts a `setsid` server on a unix socket under the run folder, B
  connects and holds);
- `app-bundle` (a copy of `/bin/sleep` at `<run>/Fake.app/Contents/MacOS/fake` in the pane's group, ignoring
  the hang-up).

If the create path refuses the droid row, the probe exits 2 and says so. It never picks a real agent instead.

**Before and after every arm**, the probe records:
- every agent install's realpath, mtime and size (§3's fingerprint), and Gemini's version and mtime;
- the app's tmux server pid and `lstart`, and the Electron main pid;
- **his Codex server's pids and `lstart`**, read only. That is `ps` alone: the `pid-update-loop` and
  `app-server --managed-daemon` rows, if running.

Any move of any of these is a finding, and a moved install stops the run (exit 2).

| Arm | What | Parent (recorded) | HEAD (required) |
| --- | --- | --- | --- |
| C1 | Census, scratch HOME: claude, cursor, codex, gemini, deepseek, muse, pi, omp, opencode × created / restored (typed and entered) / wrapped (the six with a provider, `GMUX_SPECSTORY_NO_CLOUD=1`). droid "not installed"; qwen, antigravity, grok "not launched, by his ruling" | tree at rest, exits on hang-up and slowest, survivors | **signals 0 on every row with no parent survivor**; hang-up-group survivors 0; any other survivor named against R1-held; End's round trip REPORTED (one order only; the grade is arm rt) |
| C2 | Census, his HOME, created only: claude, cursor, codex, deepseek, muse, pi, omp, opencode. No turn, no token; the same exposure `conformance:resume` has | as C1 | as C1. MCP servers his configs start are read here and classed by group |
| R | Restart a created Gemini row | the old pair still running beside the new session | old pair gone within `HANGUP_GRACE_MS + TERM_GRACE_MS`; the new session's tree unchanged by pid and `lstart` |
| a | A stranger `gemini` in the probe's OWN second scratch tmux server, same folder, scratch HOME | survives | survives every End, pid and `lstart` unchanged |
| b | Two sessions of each C1 agent (created). End one | other unchanged | other's tree unchanged by pid and `lstart`, screen unchanged |
| c | A `shell` row holding `nohup sleep 600 &`, `( perl setsid sleep ) &` and a foreground `sh -c "trap '' HUP; exec sleep 600"` | all survive | all survive (R2); `app.log` has no tree line for it |
| d1 | A restored claude row: `nohup sleep 600 >/dev/null 2>&1 &`, then the agent entered, then End | survives | survives (own group) |
| d2 | A restored claude row, before any Enter on the armed resume: a foreground `nohup sh -c "trap '' HUP; exec sleep 600"`, then End | survives | **ended. REPORTED for his ruling** (the restored-agent half of R2) |
| e | ONE real Claude Code turn, his HOME and sign-in, running `perl -e 'select(undef,undef,undef,90)'`, with End pressed while it runs | the tool's fate and its STAT and group recorded | if the tool is in its own group: survives (R1 held), same as the parent; if it is in the agent's group: ended. Reported either way |
| f | End then quit at once: a created Gemini row, and a planted `ignore-hup-and-term` row | survivors after quit | survivors 0 once the quit completes, and the quit completes within 10 s; the quit's wall time recorded at both builds |
| h | Batch End of eight created Gemini rows through the session manager | total ms | ≤ parent + 8 × (the wide read + the pane read); survivors 0 |
| i | Invariants (the rows above the table) | — | unchanged across every arm |
| k | `shared-server` row A plus `shared-client` row B. End A | server and client survive | the server's pid and `lstart` are unchanged and B is still connected |
| l | Planted `ignore-hup`, `fg-child-ignore-hup`, `ignore-hup-and-term`, `setsid-child`, `app-bundle` | all survive | SIGTERM, SIGTERM, SIGKILL, survives, survives (never signalled), each read from `app.log` |
| rt | (C), the End round trip (the tools round): `P323_RT_ROWS` (16) planted `plain` rows that end on the hang-up, each Ended through the bridge and timed, at the end of each full launch; then each build is launched once more, in the other order, for this block alone, so the four blocks run parent, HEAD, HEAD, parent | recorded | pooled median of HEAD's two blocks minus the parent's two within one tree read (the terminal read plus the pane read, measured at both HEAD launches) |

**`finally`:**
- It ends every process it recorded, by pid, with `lstart`, command line and group re-read first, SIGTERM
  then SIGKILL. That covers everything it started, including the `setsid` ones the product spares on purpose.
  **This ending is the probe's own, deliberately not the module under test**: its scope is wider, and the
  instrument must not depend on the code it measures.
- It ends both scratch servers and unlinks their socket files.
- Electrons are counted once, at the end.
- `P323_KEEP=1` keeps the records for the verifier's re-derivation.

### 8.2 `probe:p323:harness`: `build/p323/harness-arms.mjs`, a tmux harness with no Electron (builder-harness)

Each arm runs at `P323_PARENT_CHECKOUT` and at HEAD, one after the other. The planted command is a shell that
creates, on `$GMUX_TMUX_SOCKET`, one created Gemini session (scratch HOME, R8) and one planted
`trap '' HUP; exec sleep 900` session:
- **j2.** `node build/harness-socket.mjs gmux-p323h '<the planted command, then exit>'`. At the parent, both
  Gemini processes and the sleep survive the teardown. At HEAD, 0 survive and the one line is printed.
- **j3.** The same run's `harness-socket` node process and its shell are sent SIGKILL by pid mid-command, so
  no teardown runs. A second `node build/harness-socket.mjs gmux-p323h 'true'` must reap the dead run's
  server. At the parent the survivors remain. At HEAD they are 0.

Every process it starts is ended in a `finally`, by pid. Survivors are counted by working directory
(`lsof -a -d cwd +D <run folder>`), which is the independent census.

### 8.3 The conformance arms (verifiers, under THE LOCK; they start Electron through `harness-socket`)

Rewritten by the tools round after his ruling of 2026-09-30 ("One more tools-only round"). Both arms stand behind
§9's fence, `build/p323/fence.mjs`: a scratch HOME holding Phase 314's R8 settings for Gemini (his ruling R3), a
PATH that holds links to the asked agents and to `node`, `npm`, `npx` and `tmux` and nothing else, and the update
guards exported. The `sandbox-exec` wrapping the round before prescribed is withdrawn, because it cannot start
Electron or `/bin/ps` (§9).

- **j1:** `GMUX_CONF_AGENTS=gemini,claude GMUX_CONF_MODE=capture node build/p323/fence.mjs --cwd <checkout> -- npm run -s conformance:resume`,
  at the parent and at HEAD. The fence script is HEAD's; `--cwd` names the checkout whose own resolver it asks and
  whose build it runs. The Gemini case will not reach a turn, which is expected. The parent leaves the Gemini pair,
  found by the verifier's `lsof` census. At HEAD the closing check reads `0 of the N agent process(es) this run read
  are still running` and never "could not look" (§As built, the tools round, item 1), and `lsof` agrees.
- **j4:** as j1 with `GMUX_CONF_WATCHDOG_MS=20000`. At HEAD the wrapper's teardown line reports the ended pair and
  `lsof` reads 0.

Measured by the tools round with no Electron and no agent started, through HEAD's own resolver under the fence:
qwen, antigravity and grok resolve nowhere; `gemini` and `claude` resolve first to the fence's links; `omp` at
`/opt/homebrew/bin/omp` is also asked for its version, because Tortie's resolver adds that folder whatever PATH
says. What the two arms prove live is the reverify's.

---

## 9. The proof, run rather than read

Rewritten after his ruling of 2026-09-30 ("Fix the tests, then land"), and the fence rewritten again by the tools
round after his second ruling that day ("One more tools-only round"), to what was measured to work. No conformance
run and no app launch may start qwen, agy or grok, not even for a version. Gemini runs only under a scratch HOME.
The previous round's full `conformance:resume` under his HOME let cursor-agent (to 2026.09.28-64d2043) and opencode
update themselves, so every run below stands behind the fence.

- **Builders:** `npm run typecheck`, `npm run build`, their own vitest files, `conformance:endtree` once it
  exists. No Electron.
- **Integrator:**
  - `npm run typecheck && npm run build && npm run smoke:t1`, then the full battery: `test`, `smoke`,
    `smoke:t3`, `package`;
  - `conformance:endtree`, `ablation:p323`;
  - `gate:background`, `gate:electron` (at 154), `gate:checks`, `gate:contract` (**must not move**: no IPC,
    no schema, no storage key, no `GMUX_*` name);
  - `conformance:remoteclose` (`core.ts`, cheap).
- **The fence.** Every conformance run and every app launch stands behind it. Measured by the tools round on
  2026-09-30 with no Electron launched and no agent started; the live runs are the reverify's.
  1. **Every conformance run** starts as
     `GMUX_CONF_AGENTS=<explicit list> node build/p323/fence.mjs [--cwd <checkout>] -- npm run -s conformance:resume…`.
     - **What it builds.** A folder `/private/tmp/p323-fence-<pid>` holding three things, removed in a `finally`
       (`P323_FENCE_KEEP=1` keeps it):
       - `home/`, the run's HOME, ALWAYS a scratch one: Gemini's R8 `settings.json`, Codex's
         `check_for_update_on_startup = false` with `daemon_auto_start = false`, omp's update check off, and
         `.zprofile` and `.zshrc` that put the PATH below back after `/etc/zprofile`'s path_helper;
       - `agents/`, a link for each agent in `GMUX_CONF_AGENTS` to the binary his own Tortie would launch (his
         login shell's `-lic` PATH at his home, then the row's own folders, resolved by the checkout's resolver and
         never run);
       - `tools/`, links to this node, its `npm` and `npx`, and `tmux`.
       The run's PATH is `agents:tools:/usr/bin:/bin:/usr/sbin:/sbin` and nothing else. The update guards are
       exported (`DISABLE_AUTOUPDATER`, `MUSE_NO_AUTO_UPDATE`, `OPENCODE_DISABLE_AUTOUPDATE`,
       `AGENT_CLI_UPDATE_CHECK_URL`, `OMP_SKIP_SETUP`, `NO_UPDATE_NOTIFIER`, `GMUX_SPECSTORY_NO_CLOUD`), and every
       `CLAUDECODE*`, `CLAUDE_*`, `npm_*`, `ZDOTDIR`, `NVM_BIN`, `TMUX`, `TMUX_PANE` and Terminal.app name is
       removed. `resume.ts`'s own holds (`holdSelfUpdatesHere`, `holdSelfUpdatesOnTheServer`) stay as they are.
     - **It says so.** Before the run it prints the HOME, each link and what it points at, the tools, the guards,
       the login-shell PATH the app will capture, the measurement below, what else the scan will still ask, and
       what his HOME would reach.
     - **Why not a scratch `agents.json`.** The harness never reads one: `dispatchHarness` returns at
       `src/main/index.ts:508`, before `initAgentOverlay` at `:543`. The fence writes none and claims none.
     - **Why not `sandbox-exec`.** The reverify ran the round before's fence as written and it cannot work.
       Chromium's GPU helper cannot start its own sandbox inside one: the app exits in about 3 s ("GPU process
       isn't usable. Goodbye."). And `/bin/ps` is setuid root, which `sandbox-exec` refuses to start under any
       profile, even `(allow default)`, so End's tree read and the harness's reads fail. Under `--no-sandbox` the
       seven Ends of the capture logged that their tree could not be read, and the closing check still read 0
       (repaired in item 1 of §As built, the tools round). `deny4.sb` and `deny3.sb` are withdrawn.
     - **Why never his HOME.** Tortie's resolver adds `extraBinDirsFor(HOME)` and each row's own probe folders
       whatever PATH says. Measured through HEAD's own resolver with the fence's PATH and his HOME: qwen at
       `~/.local/bin/qwen`, antigravity at `~/.local/bin/agy`, grok at `~/.grok/bin/grok`, and Gemini at
       `/usr/local/bin/gemini` and `~/.npm-global/bin/gemini`. No PATH can fence a run under his HOME at this
       head. Those runs come back with the rebase onto origin/main, whose Phase 331 `conformanceDetectionTable`
       limits the scan to `GMUX_CONF_AGENTS` (read from origin/main's `cases.ts:334` and `resume.ts:857`, not
       measured here).
     - **The measurement before every run.** The checkout's OWN resolver, through the pinned tsx, under the
       fence's environment: `captureLoginShellPath()` (the login shell the app asks), then every registry row's
       binaries against that PATH, the row's `expandDirs(extraProbeDirs)` and `extraBinDirs()`, exactly as
       `detectOne` composes them. The run is refused (exit 2) on any copy of qwen, antigravity or grok, or on an
       asked agent whose first copy is not its link. It starts one login shell under the scratch HOME and runs no
       agent. `node build/p323/fence.mjs --self-test` proves the verdict can say no (9 fixtures).
     - **What the scan still asks, whatever PATH says.** `/usr/local/bin` and `/opt/homebrew/bin` are always
       added. So `omp` (Homebrew) is asked for its version when omp is not in the list, and Gemini 0.60.0 at
       `/usr/local/bin/gemini` when gemini is not, under the scratch HOME with R8, which R3 allows. The fence
       names them on every run.
     - **Which Gemini.** An asked gemini links to what his Tortie launches: his `zsh -lic` PATH finds
       `~/.npm-global/bin/gemini` 0.54.0, the version R8's keys were read from (his `zsh -lc` finds
       `/usr/local/bin/gemini` 0.60.0), by lookup only.
     - **Installs, before and after.** Every registry row's copies at his home by path, mtime and size, Claude
       Code's and cursor-agent's version folders, and every package in every global npm folder by version and
       mtime (`build/p323/installs.mjs`: `/usr/local`, Homebrew, `~/.npm-global`, each nvm node). **Nothing may
       move.** A move is printed, the fence exits 2 whatever the run answered, and it goes to him.
     - **Its limit.** The fence's `npm` is the real one, because the run's own nested `npm run` needs it. An
       install through it moves a global folder the fence reads.
     - **Measured** (§As built, the tools round): `--check` for j1's list and for the capture list, exit 0 each;
       a list naming qwen refused, exit 2; a lookup-only command behind the fence found no qwen, agy or grok
       from its PATH or from a login shell; `npm run -s build` behind the fence exited 0 in 31 s with every
       install unchanged.
  2. **The scratch-HOME Gemini arms, j1 and j4 (§8.3),** stand behind the same fence with gemini in the list.
     There is one fence, and its HOME is always a scratch one.
  3. **Before each launch, `probe:p323` does three things:**
     - It writes a scratch `<profile>/gmux/config/agents.json` into that build's profile. The app reads the
       file at boot, before its first scan. The file renames the binaries and launch argv[0] of qwen,
       antigravity and grok to `p323-never-<id>`.
     - Before either launch, it runs each build's own overlay reader, merge and resolver over the file through
       the pinned tsx.
     - After boot and before any arm, it reads `agents:list` back. A hidden row with a binary, a version or
       `installed` stops the run with exit 2, and the other build is never launched.

     The PATH fence it already had stays beside this. Droid is not renamed, because its row is the planted
     stand-in, and a renamed execution field would put it behind the confirm gate the create path asks. The
     read-back requires droid to resolve to the stand-in or nowhere. Gemini is not renamed, because every
     launch's HOME is the scratch one (R3). The three installs are read by `stat` before and after every arm.
     The reverify of 2026-09-30 checked this at the level of program starts (a decoy for every registry name
     first on PATH): with the file, 0 starts of qwen, agy or grok at either build.
- **Verifiers (Tier 3):**
  - `probe:p323` and `probe:p323:harness` at the parent and at HEAD, and §8.3 behind the fence;
  - `GMUX_CONF_AGENTS=claude,cursor,codex,deepseek,muse,pi,omp,opencode GMUX_CONF_MODE=capture node build/p323/fence.mjs -- npm run -s conformance:resume`,
    behind the fence and so under a scratch HOME. Without his sign-ins most cases stop at a first-run screen;
    those verdicts are not this phase's. What is read is the closing check's line, and every install before
    and after;
  - `probe:p167` once.

  **The phase's one full `conformance:resume` has already run.** Lens 2 of the first verify round ran it under
  his HOME, and that run is where the two installs moved. A reverifier does not run it again. A run under his
  HOME, the owed full run and `conformance:resume:specstory` included, cannot be fenced at this head (fence item
  1, "Why never his HOME"). It waits for the rebase onto origin/main, runs with `GMUX_CONF_AGENTS` naming none of
  qwen, antigravity, grok or gemini, and reads every install before and after.
- **Independent methods, named before the work:**
  1. The per-agent matrix over real agents at the parent and at HEAD (C1, C2).
  2. Attack: a to l, j1 to j4.
  3. **Re-derivation**: the verifier's own census by working directory, `lsof -a -d cwd +D <run scratch>`,
     never a parent pid. It is compared row by row with the tree-derived survivors.
  4. The parent commit measured on every row.
- **His world, listed only:**
  - his `-L gmux` session count before and after (read only, never typed into or ended);
  - the children of his server's pid that are not live pane pids, counted;
  - processes at ppid 1 counted by basename (§10.3), never signalled;
  - every process outside the runs keeping its pid and `lstart`;
  - every Gemini install, before and after. The one his login PATH finds is `/usr/local/bin/gemini` 0.60.0;
    0.54.0 is under `~/.npm-global` and another 0.60.0 is under nvm (the fix round's finding). The same holds
    for qwen, agy and grok, by `stat` alone.
- **No regression against today**, per row: every C row, a to l, the quit latency (f) and the batch time (h)
  side by side. A row worse than the parent removes the part that caused it. d2 now reads as today (the
  second fix round). e is reported to him rather than judged (§11).

---

## 10. Named limits and what the spec step saw on his Mac

1. **What fully left the terminal is a separate follow-up, by his ruling of 2026-09-30 (§2.2).** grok's MCP
   servers, a detached tool and anything else that left the terminal still run after End, as today.
2. The windows the entry names still stand:
   - a process that double-forks away before End is not in the tree;
   - one born between the tree read and the hang-up is not in it either;
   - a pid can in principle be reused between the identity re-read and the signal, and macOS offers no way to
     hold one;
   - why Gemini's child never finishes stays unexplained.

   Gemini cannot take a turn here, so whether its conversation file is intact after a TERM is untested.
3. **Read-only, 2026-09-29, never signalled.** At ppid 1 on his Mac there are:
   - 7 `bun … talk_to_figma_mcp/server.ts` processes, the oldest from Sep 9. Five carry a process group not
     their own (they were in some agent's group, which is this phase's class). Two lead their own group
     (22095, which is research 129's, and 87453; this is R1's held class);
   - 1 `gemini … --yolo --skip-trust` launcher (83107, from Sep 23, `Ss+`, its own group).

   Nobody read their trees while their panes were alive, so they are not Tortie's to end. The count goes to
   him.
4. **Codex's server can be a Tortie session's descendant.** Under this rule that is safe. It is also why the
   rule cannot widen without his ruling.

---

## 11. For him, and what he ruled

**What he was told.** He said yes to ending what an agent split off from its terminal. Two things do that:
- Codex's shared background server, which every other Codex session uses;
- Gemini's own self-update, which may be installing over his Gemini.

Ending those would be worse than today. So the build ends only what the hang-up was aimed at: Gemini's pair,
and helpers still in the agent's group. grok's detached MCP servers and a detached tool still run after End,
as today. Taking the detached half would need Tortie either to read each process's open files with `lsof` or
to carry a per-agent list of what to spare.

**What he ruled, 2026-09-30: "Fix the tests, then land."**
- End ends what is still on the session's terminal, in the group the hang-up was aimed at (§2.2).
- Processes that fully left the terminal are left alone and are a separate follow-up.
- The product half stays as the fix rounds left it. The quit does not wait, and End does not read the whole
  process table in its own time.
- Only the proof is repaired. That is `probe:p323`, and every conformance run behind the fence in §9.

**Still to report when the phase lands:**
- d2 is as today again: a foreground `nohup` in a restored agent session keeps running (the second fix
  round).
- e: a running tool's fate, as the reverify measures it.
- The second fix round's changes, being the 10 s and 60 s graces and the pane another session still shows.

---

## 12. Builders, disjoint files

- **builder-product** owns:
  - `src/main/proc/session-tree.ts` (new)
  - `src/main/proc/ps.ts` (the `childIndex` type widening only)
  - `src/main/sessions/core.ts` (§4.2 only)
  - `src/main/sessions/mutation-ledger.ts`
  - `src/main/proc/__tests__/session-tree.test.ts` (new)
  - `src/main/sessions/__tests__/p323-end-tree.test.ts` (new)
- **builder-harness** owns:
  - `src/main/conformance/scratch.ts`
  - `src/main/conformance/resume.ts` (the closing check only)
  - `build/harness-socket.mjs`
  - `build/session-tree-cli.mts` (new)
  - `build/p323/harness-arms.mjs` (new)
- **builder-gates** owns:
  - `build/conformance-endtree.mjs` (new)
  - `build/p323/ablation.mjs` (new)
  - `build/p323/probe-p323.mjs` (new)
  - `build/p323/stand-in.sh` (new)
  - **and every shared file**:
    - `package.json` (`conformance:endtree`, `ablation:p323`, `probe:p323`, `probe:p323:harness`)
    - `build/verification-checks.mjs` (`pure('conformance:endtree')`, `pure('ablation:p323', NEEDS.vitest)`,
      `electron('probe:p323')`, `tmux('probe:p323:harness')`)
    - `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 153 → 154, the probe named in the commit
      body)
    - `CLAUDE.md` (the rows in §13)
    - `CHANGELOG.md` (§14)
    - `docs/audits/contract-baseline.txt`, confirmed unmoved and never edited

  Phases 320.1, 330, 331 and 324 are also moving `package.json`, `verification-checks.mjs` and the floor. The
  integrator reconciles at merge.

builder-harness and builder-gates code against §4.1's surface as written. None of the three edits another's
file. A needed change goes to the integrator.

**Hard rules for all three:**
- No Electron, no `-L gmux`, no `pkill`, `killall`, `pgrep` or negative pid.
- Qwen, agy and grok are never started. Gemini only under a scratch HOME with R8, and only in builder-harness's
  own j2 and j3 dry runs if it runs them at all.
- Every process started is ended in a `finally` by pid.
- Never commit, stage or stash.

---

## 13. CLAUDE.md rows (builder-gates writes them)

The gate table gains:

| `src/main/proc/session-tree.ts`, `killSessionAdmitted`, `readEndTree` and `endAfterHangup` in `src/main/sessions/core.ts`, `follow` and `join` in `src/main/sessions/mutation-ledger.ts`, `src/main/conformance/scratch.ts`, the closing check in `src/main/conformance/resume.ts`, `build/harness-socket.mjs`, `build/session-tree-cli.mts` | `conformance:endtree` | ~1 s, spawns nothing | End ends only what the hang-up was aimed at and outlived it. The tree is read after the capture and before the hang-up, rooted at live panes of the `$-id` `liveIds` holds whose process is the answering server's own child. A pid is signalled only when its start time, command line and group still match, one pid at a time, never a group, pattern or name. Nothing that left the terminal is signalled, because Codex's shared server and Gemini's self-update live there (build/p323/SPEC.md §2). `shell` rows are skipped. Nothing on reconcile, reap, boot, quit or a timer reaches it. The End answers before the waits, and a quit joins them. `ablation:p323` is the attack beside it, 20 arms |

The probe table gains:
- `probe:p323`, triggered by the same paths. About 25 to 40 minutes per build (an estimate until the first
  run), one Electron at a time, parent then HEAD. It launches real agents under a scratch HOME (Gemini there
  only) and, created only, under his HOME for the eight others, never qwen, agy or grok. It ends everything
  it started by pid in its `finally`.
- `probe:p323:harness`, a tmux harness with no Electron, covering `build/harness-socket.mjs`'s teardown and
  dead-run reap.

---

## 14. CHANGELOG, under `## Unreleased` → `### Fixed` (builder-gates; the follow-up docs commit adds the link)

```
- Ending a Gemini CLI session, or restarting one, now ends Gemini too; before, its two processes kept running in the background after the session was gone. A program an agent sets running apart from its own screen, such as a tool it is in the middle of, still keeps running after End
```

If the verifier's C2 or l arms find another agent's helpers ended, the item names that agent in the same
sentence. No numbers, no file names.

---

## 15. What is NOT in this phase

Everything the entry lists stays refused:
- no change to the first signal;
- no group signal, pattern or name;
- no boot sweep of existing orphans;
- nothing on his live server signalled;
- nothing Tortie starts on its own;
- no change to plain `shell` sessions;
- no fix by launch setting;
- nothing for sessions on another machine;
- no change to `reapDeadSession`, Remove, Restore, the capture, `endRefusal` or the SpecStory flush;
- no sweep of the other build scripts that send `kill-server`;
- no Gemini sign-in or updater fix;
- no status, copy, surface or menu;
- no release.

This spec adds:
- **Not what fully left the terminal**, by his ruling of 2026-09-30: no `lsof`, no per-agent spare list, no
  registry field. It is a separate follow-up (§2.2, §11).
- **Not a test-only seam in the product** for a failing `ps`. It is a unit test (§1.3 item 5).
- **Not the probe's `finally` through the module under test** (§8.1).
- **Not Gemini under his HOME anywhere, including `conformance:resume`** (R3).

---

## §As built (the integration round, 2026-09-29)

Written by the integrator in `/private/tmp/wt-p323` at `5866b527`. Nothing was committed, staged or stashed.
No Electron was launched. The three builders' reports were read against each other and against the code;
where this section and a paragraph above disagree, this section is what the tree holds.

### What the integration round changed, and why

1. **`TREE_READ_TIMEOUT_MS` is 1,000, not 2,000, and E9 asks the true worst case.** All three builders found
   E9 red on §4.1's own constants (4,000 + 2,500 + 2 × 2,000 = 10,500). The sum was also not the worst case.
   `endHangupSurvivors` asks each deadline only after a re-read answers, so each wait can overrun by one poll
   plus one read that finishes just inside its timeout. The true bound is
   `HANGUP_GRACE_MS + TERM_GRACE_MS + 2 × (POLL_MS + TREE_READ_TIMEOUT_MS)`:
   - 11,000 ms at 2,000, which is over the join's 10,000;
   - 10,000 ms at 1,500, which is not under it;
   - 9,000 ms at 1,000, which is.

   §3's "roughly 6.8 s" left out both overruns. 1,000 ms is 17 times the wide read's median and 12 times its
   slowest (§1.2). A read that runs out is a failed read, and a failed read signals nothing, which is End as
   it was before this phase. The unit row "fits inside the quit's join" now DRIVES the worst case rather than
   adding numbers. An adversarial `ps` answers at once until one re-read can land a millisecond before a
   deadline, then takes a millisecond under the timeout. It lands the SIGKILL at 8,996 ms, which is exactly the
   formula. In a clone at 2,000 the row went red at 10,996 ms and E9 went red. E9 carries two new self-tests,
   at 2,000 and at 1,500.
2. **The harness runner asks tmux with `-u`.** This is a defect the builders' runs could not see, because they
   ran from a UTF-8 terminal. tmux sends every tab in a `-F` format as `_` to a client whose locale is not
   UTF-8 (`LC_ALL=C`, or no locale at all, which is what a launchd job gets). Measured on tmux 3.6a (PATH) and
   the vendored 3.7b: `12_0_34` for `12\t0\t34`. `PANE_ROOT_FORMAT` is tab separated, so a harness run under the
   C locale parsed no pane and ended nothing, silently:
   - the integrator's rig, runner under `LC_ALL=C` before the fix: `module 0` panes, `{"ended":0}`, and 7
     planted survivors left running, which the integrator then ended by pid;
   - after the fix: 12 of 12 processes and 9 of 9 targets, `{"ended":5}`.

   `tmux -u` keeps the tab in every locale on both versions. It is on the runner's one tmux call in
   `build/session-tree-cli.mts`. E12 now pins it, with a self-test that removes it.
   `probe:p323:harness` planted-only passes at HEAD under `env -u LANG -u LC_CTYPE LC_ALL=C`, ending 1 of 1 in
   j2 and 1 of 1 in j3. The instruments' own tmux reads (`tm` and `tx` in the probe, `tmuxOn` in harness-arms)
   got `-u` too, because the probe's `panesOf` would otherwise read every session as paneless and grade a leak
   as nothing left.

   **The product keeps §4.1's tab format.** `execTmux` passes `process.env`, and the supervisor injects
   `LANG=en_US.UTF-8` before the server exists whenever no UTF-8 locale is set. `sessions.ts:353` already
   depends on that for `#{history_size}\t#{pane_height}`. A person whose app environment carries an explicit
   non-UTF-8 `LC_ALL` or `LC_CTYPE` gets `readEndTree` finding no pane and returning null with no log line. End
   then does what it did before this phase. That is named for the verifiers below.
3. **One reader for the two instruments: `build/p323/ps-read.mjs` (new).** `probe-p323.mjs` and
   `harness-arms.mjs` each held the same twenty-line C-locale `ps` parser, one per builder. They share
   `PS_FIELDS`, `parsePsRows` and `psRows` now. It is still deliberately NOT `src/main/proc/session-tree.ts`
   (§8.1).

   The extraction fixed a false-pass shape in the probe. Its old `psRead` returned an EMPTY map when `ps`
   failed, and an empty map is "no survivor". `psRows` answers null, and the probe's `psRead` turns null into
   `Unreadable`. The probe's outer `finally` catches that, so a failed read still ends both scratch servers.
   `survivorsAtEnd` is null rather than 0 when it could not be counted, and the verdict "no process of this run
   is left" reads UNREADABLE rather than PASS. The Codex re-read at the end no longer throws out of the
   `finally`.
4. **`signalsFor` in the probe uses `String.match`, not `RegExp.exec`.** `gate:background` discovers a
   "spawner" by a call spelled `exec(` in a function's body (`\bexec\s*\(` matches `ENDED.exec(`). After
   extraction 3 its value expansion read two `signalsFor` call sites as long-lived children, a false positive
   at `probe-p323.mjs:1661` and `:1689`. `signalsFor` starts nothing. Bisected: the builder's copy was green,
   the extraction alone was red, and the `-u` edit alone was green.
5. **builder-harness's test adopted** as `src/main/conformance/__tests__/p323-scratch-tree.test.ts`, 10 rows,
   restoring `GMUX_HARNESS_DIR` in `afterAll`. Its 13 scratch ablation arms are in that builder's report.
   `ablation:p323` does not include them (its spec'd 20 arms run the other two test files).
6. **`CLAUDE.md`.** The `probe:p323:harness` row said "a few minutes". It measured 41 s with Gemini
   (builder-harness) and 33 s planted-only (the integrator), so the row now says so. The `conformance:endtree`
   row names the true join bound and the `-u` clause.

### Re-derived by the integrator, with a reader of its own

The rig is `scratchpad/p323/integrator/rederive.mjs`, which is not committed. It uses one scratch server,
`-L gmux-p323int-<pid>`, with a config of its own (`default-shell /bin/sh`), and plants eight shapes:
- `trap '' HUP; exec sleep`;
- a perl ignoring HUP and TERM;
- a pane whose `setsid` child hangs off a HUP-ignoring root;
- `set -m` with a background job;
- an `.app/Contents/MacOS/` symlink to `/bin/sleep` ignoring HUP;
- a plain `exec sleep`;
- a HUP-ignoring `sh` with a foreground child;
- a plain `sh` with a foreground child.

A stranger `sleep` outside the server shares the first folder. The rig's own `ps` parser and ppid walk
selected `all` and `targets` by §2.2 with no import of the module. They were compared exactly against the
module through `session-tree-cli.mts read`, run under `LC_ALL=C`:

| Check | Result |
| --- | --- |
| `all` | 12 and 12, the same pids |
| `targets` | 9 and 9, the same pids |
| pgid, lstart and command of every entry | equal to the rig's read |
| `kill-server`, then `end` | `{"ended":5}` in 6,870 ms (the perl needed SIGKILL) |
| Left, by pid + lstart + command | exactly the `setsid` child, the background job and the app-bundle executable |
| `lsof -a -d cwd +D` census | agrees with the identity re-read, plus the stranger |
| The stranger | untouched, same pid and lstart |

The rig's `finally` ended the three spared processes and the stranger by pid, after an identity re-read. Then
it ended its server and unlinked the socket. Nothing was left afterwards.

### Commands, exit codes and numbers (integration round)

| Command | Exit | Result |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 6.1 s, twice |
| `vitest run` on the three phase files | 0 | 78 of 78 |
| `vitest run src/main/proc src/main/sessions src/main/conformance` | 0 | 39 files, 608 tests, twice |
| `npm test` (the whole suite) | 0 | 1,011 files passed, 1 skipped; 17,420 tests passed, 7 skipped; 55 s |
| `conformance:endtree` | 0 | 13 of 13 rules, 46 self-tests red as they must, 0.9 s |
| `ablation:p323` | 0 | 20 of 20 arms, control green first and last, restored by sha256; 123.4 s, then 97.3 s after the E12 edit |
| `conformance:remoteclose` | 0 | |
| `conformance:manager` | 0 | 58 rules, 2,310 checks |
| `gate:checks` | 0 | |
| `gate:background` | 1, then 0 | red on the probe's `signalsFor` after extraction 3; green after item 4 |
| `gate:electron` | 0 | 154 against the floor of 154 |
| `gate:knownhosts` | 0 | |
| `gate:simulator` | 0 | |
| `contract-inventory --check` | 0 | the baseline did not move |
| `npm run -s build` | 0 | 33 s, every gate inside it green |
| `P323_HARNESS_PLANTED_ONLY=1 P323_PARENT_CHECKOUT=<parent> node build/p323/harness-arms.mjs` | 0 | j2 and j3: parent 1 survivor (tree and cwd agree), HEAD 0 and "ended 1"; 33 s |
| The same, HEAD only, under `LC_ALL=C` with no `LANG` | 0 | HEAD 0 survivors, "ended 1" in both arms; 20 s |
| The integrator's rig (above) | 0 | every verdict true |

Not run by the integrator, because each launches an Electron or a real agent: `smoke:t1`, `smoke`,
`smoke:t3`, `package`, `probe:p323`, `probe:p323:harness` with Gemini, the §8.3 conformance arms,
`conformance:resume:capture`, `conformance:resume` and `probe:p167`. They are the verifiers', under THE
LOCK.

### Open concerns for the verifiers

1. **R1's `setsid` half is NOT built, against his "Yes, end them".** §2 holds it, under his standing rule, for
   Codex's shared server and Gemini's updater. Arm l's `setsid-child` must SURVIVE at HEAD, which is the
   opposite of what he said yes to. This goes to him (§11). Do not grade it as a pass of R1.
2. **Quit latency after an End.** A quit that follows an End of a created Gemini row now waits for the
   continuation inside the join: up to about 4 s plus Gemini's SIGTERM exit (up to 1.5 s measured), and up to
   9 s for a process that ignores both signals. At the parent the quit does not wait, and the processes run
   forever. Arm f records both. Whether a slower quit here is "worse than today" is a ruling, and it should be
   put to him with the numbers.
3. **The join does not bound the End's in-band part.** A quit that begins while an End is still inside its
   capture waits for the capture, the two reads (up to 1 s each), the hang-up and then the continuation, all
   inside one 10 s deadline. E9 bounds only the continuation. If the deadline passes first, the app exits and
   the survivors run on as they do at the parent. That is no worse than today, but the fix does not reach them.
4. **Silent no-op under a non-UTF-8 `LC_ALL` or `LC_CTYPE` in the app's own environment** (item 2 above).
   `readEndTree` logs nothing when the pane read parses to no pane. A verifier can confirm by launching the
   HEAD app with `LC_ALL=C` and ending a created Gemini row: at HEAD, expect the pair to survive, as at the
   parent.
5. **The warn line is not always true.** When the pane read itself throws (for example tmux already lost the
   session), `readEndTree` logs "the process table could not be read", but the table was never asked
   (builder-product's item 4).
6. **Instrument changes were not run live against Electron.** Item 3 changed the probe's `ps` reader and its
   `finally`, and item 2 added `-u` to its tmux reads. `node --check` passes and the shared reader was
   exercised read-only against the live table, but `probe:p323` itself has never run. None of builder-gates' 8
   notes about it are proven: the droid create accepting the planted mode, the Claude trust and permission
   flow in arm e, the session manager selectors at the parent, and the restore, clear and type path.
7. **`probe:p323:harness` with Gemini was not re-run after items 2 and 3.** The planted-only run passed at both
   builds and under the C locale. builder-harness's Gemini run (PASS, 41 s) predates the edits.
8. **A known duplicate is left.** `build/p323/ablation.mjs` repeats about 38 lines of
   `build/p321/ablation.mjs`: the vitest JSON reader, the sha256 restore and the `clean` latch. Eight ablations
   share that house shape, and extracting it would edit other phases' scripts, so it is left for a
   consolidation round. `readTreeOf` in `scratch.ts` and `readEndTree` in `core.ts` are about eight lines
   alike, below the threshold. The two signal loops in `endHangupSurvivors` are left apart on purpose, because
   E4 pins two call sites.
9. **`gate:background`'s spawner discovery matches `RegExp.prototype.exec`** (item 4). That is a false
   positive, not a walk-past, so no fixture was added. A later probe that parses with `.exec` inside a helper
   can meet the same red.

---

## §As built, the fix round (2026-09-30)

Written by the fixer in `/private/tmp/wt-p323` at `5866b527`, against the two verifier verdicts (both
needs_work). Nothing was committed, staged or stashed, no Electron was launched and no agent was started.
Where this section and anything above disagree, this section is what the tree holds. **Two parts of the
phase made a scenario worse than today and were REMOVED rather than repaired: the quit's join of the ending,
and the whole-table read in the End's own time.** Everything else is a repair.

### What the verdicts found, and what was done

| # | Verdict | Finding | What the tree holds now |
| --- | --- | --- | --- |
| 1 | Lens 1 major | The identity re-read passed every pid to one `ps -p`. macOS charges about 200 ms of system time for `ps -p a,b` (2 ms for one pid) and such calls run one at a time, so a batch End's re-reads timed out and ended nothing (10 rows: 20 of 20 left). | `identityPsArgs(pid)` takes ONE pid. A poll reads one `ps -p` per pid inside one `TREE_READ_TIMEOUT_MS` budget, or the wide table once above `REREAD_ONE_BY_ONE_MAX` (16) pids. Re-measured here: 1.5 ms for one pid, 205 ms for two (`pstime.mjs`). |
| 2 | Lens 1 major | A quit after an End waited out the graces with the window on screen: +4.8 s (Gemini), +6.5 s (quit during the capture), +6.6 s (a process ignoring both signals), against no wait today. | **REMOVED.** `endAfterHangup` hands its work to nothing a quit waits on; `src/main/sessions/mutation-ledger.ts` is byte for byte the parent's again (no `follow`, a `join` that does not loop). An End followed at once by a quit leaves what it would have ended running, exactly as today. The CHANGELOG item says so in one clause. |
| 3 | Lens 2 major | One failed or slow re-read ended the whole ending: 3 of 31 at HEAD, among them the Restart's new Gemini, whose pair ran on. | A failed re-read proves nothing on that poll and the next is asked, for `READ_RETRY_MS` (10,000) past each grace, longer than the longest stall Lens 2 measured (9 s). A signal still follows only a re-read that answered. `ENDING_WORST_MS` = H + T + 2 × (RETRY + POLL + READ) = 29,000 ms is the bound, driven by the adversarial row. |
| 4 | Lens 2 major | The End answered the window later on 47 of 48 rows (+57 ms light load, +109 ms heavy): the wide read (about 60 ms) ran in the End's own time, after the capture. | **The part that regressed is REMOVED and the read replaced.** End now reads only the processes on the panes' terminals (`ps -ww -o … -t <pane_tty>`, `terminalPsArgs`; 3.8 ms median here against 51.8 for the wide read), and core.ts STARTS that read before the capture and awaits it after the capture and before the hang-up, so the two run at once. The order that matters holds: the capture is written before the hang-up, nothing is signalled before it. My rig's in-band read (the pane read plus the terminal read): 5 ms median, 8 ms max, against 53 ms for the pre-fix read. |
| 5 | Lens 2 major | probe:p323 measured `r-new-gemini` and graded nothing. | Graded like a C1 row, `(R) r-new-gemini`. A new verdict, `(log) no ending at HEAD gave up on a read`, counts every `could not be read` line in HEAD's app.log, on any row or arm. |
| 6 | Lens 2 major | `conformance:resume` under his HOME updated his cursor-agent (to 2026.09.28-64d2043) and replaced his opencode binary. Not Phase 323's code. | The conformance run now holds off the agents' self-updaters: `DISABLE_AUTOUPDATER`, `MUSE_NO_AUTO_UPDATE`, `OPENCODE_DISABLE_AUTOUPDATE`, `AGENT_CLI_UPDATE_CHECK_URL=http://127.0.0.1:9/` and `NO_UPDATE_NOTIFIER`, in its own process before anything is spawned (the `--version` scan) and in its scratch server's global environment (never his live server). Cursor's `--disable-auto-update` is a launch flag and is NOT added, so for Cursor this rests on the update-check URL alone, which is unproven. **The full `conformance:resume` has run once this phase (Lens 2), which is what CLAUDE.md asks; the reverify must not run it again under his HOME**, and any conformance run it does make reads every install's path, mtime and size before and after. His two updated installs are for him to know about, not for this round to undo. |
| 7 | Lens 1 minor | Ablation X1 (SIGKILL over `stillTheSame(tree.all, …)`) was green everywhere. | E4: what is signalled starts as `tree.targets` alone, is only narrowed by `stillTheSame(` over itself, and `endHangupSurvivors` never names `.all`. Row: a HUP+TERM-proof root with a `setsid` child in `all` and not in `targets`; the child is never signalled. Arm A21. |
| 8 | Lens 1 minor | X9: a join re-arming its deadline each lap could wedge a quit. | Moot: the join is the parent's single race again (finding 2). E10 refuses a looping join. |
| 9 | Lens 1 minor | X10: `holdsAPane` always answering no was green everywhere. | E11 now DRIVES `holdsAPane` with a stand-in `spawnSync` (a live pane: yes; no pane: no; no server: no; it must ask `tmux -L <socket> list-panes`). Arm A23. |
| 10 | Lens 1 minor | X11: identity by the command's first word was green everywhere. | E5 requires each identity field compared as the plain field on both sides (`row.command === e.command`); E5's behaviour case and two rows cover a process that exec'd the same program with other arguments. Arm A22. |
| 11 | Lens 1 minor | The closing check's single multi-pid re-read could time out (flaky red). | It re-reads one pid per call, asks again for up to `READ_RETRY_MS`, and first WAITS for the product's Ends (up to `ENDING_WORST_MS` after the last one it recorded), because the quit no longer does. |
| 12 | Lens 2 minor | Run from Terminal.app the probe refused (the zsh "Restored session" banner read as qwen/agy/grok reachable) and printed a false "every install MOVED". | `TERM_SESSION_ID`, `TERM_PROGRAM`, `TERM_PROGRAM_VERSION` and `SHELL_SESSION_ID` are stripped; only a path, an alias or a function name counts as `command -v`'s answer; with no start reading the install verdict is unread. |
| 13 | Lens 2 minor | Rows whose tree was empty at a build graded PASS. | UNREADABLE, "exited at start". |
| 14 | Lens 2 minor | A case whose agent had died was reported as the cleanup's SESSION_NOT_FOUND. | The recorded exit (`exitCode` or `exitSignal`), when the reaper recorded one, leads the case's reason. |
| 15 | Lens 1 nit | The CHANGELOG promised a tool an agent is in the middle of keeps running, which is false for a tool in the agent's own group. | "A program an agent set running on its own, apart from the session, still keeps running after End, and so does Gemini if you quit Tortie within a few seconds of ending it." |
| 16 | Lens 1 nit | The `.app/Contents/MacOS/` exclusion reads the whole command line, not argv[0] as §4.1 says. | Kept, and recorded here: argv[0] can hold a space and the table carries no argument boundaries, so the whole line is asked. It only ever spares more. |
| 17 | Integrator concerns 4 and 5 | A non-UTF-8 `LC_ALL` in the app made the pane read find no pane, silently; the warn line said the table could not be read when the pane read failed. | `PANE_ROOT_FORMAT` is space separated (`#{pane_pid} #{pane_dead} #{pid} #{pane_tty}`); measured here, tmux 3.7b sends `12_0_34` for the tab form and the space form intact to an `LC_ALL=C` client. The warn line says "the panes or processes … could not be read". |

### The instruments

- `build/p323/ps-read.mjs` never passes several pids either: one pid is `-p`, several are the wide table,
  filtered (49 ms for three pids against the 200 ms a multi-pid read costs), so the probe no longer loads the
  machine it times.
- `probe:p323`: the `(C)` allowance and arm h's are the TERMINAL read plus the pane read, measured at HEAD
  (`psTerminalMs`). Arm f's HEAD requirement is now "the quit takes no longer than the parent's, within
  `QUIT_NOISE_MS` (500), and leaves no more than the parent" — no longer "0 left within 10 s", which is the
  join this round removed.

### Re-derived by the fixer, with a rig of its own (no Electron, no agent)

`scratchpad/p323/fixer/rig/rig.mts`, not committed: a scratch server `-L gmux-p323fx-<pid>` (vendored tmux
3.7b, `-f /dev/null`), N sessions each running a Gemini-shaped pair (a `perl` ignoring SIGHUP and its child in
the pane's group), the first a HUP+TERM-proof root with a `setsid` child. It reads each tree the way End does
(pane read under `LC_ALL=C`, terminal read), compares its targets with the wide table's, sends `kill-session`
to all at once and runs every ending CONCURRENTLY with the module's real `defaultEndDeps()`, every signal
refused unless the pid's live command line carries the run's marker. The census afterwards is its own
`ps -axo pid=,command=` filtered by the marker.

| Run | In-band read (median / max) | Targets agree with the wide table | Endings that gave up | Signals | Left |
| --- | --- | --- | --- | --- | --- |
| pre-fix module, 10 sessions | 53 / 56 ms | 10 of 10 | **9 of 10** | 1 SIGTERM, 1 SIGKILL | **19** |
| HEAD, 10 sessions | 5 / 8 ms | 10 of 10 | 0 | 19 SIGTERM, 1 SIGKILL | 1 (the `setsid` child, by design) |
| HEAD, 10 sessions, 12 CPU burners | 5 / 13 ms | 10 of 10 | 0 | 19 SIGTERM, 1 SIGKILL | 1 (the same) |
| HEAD, 10 sessions, 24 CPU burners | 5 / 6 ms | 10 of 10 | 0 | 19 SIGTERM, 1 SIGKILL | 1 (the same) |

The pre-fix row reproduces Lens 1's S4 in my hands; only the one session with a single target (a single-pid
re-read) was ended. 0 foreign signals were refused in every run, and the rig's `finally` ended the spared
`setsid` child by pid, killed its server and removed its socket and folder (0 left, 0 `yes` left).

### What the entry and the spec got wrong (for the report)

- The entry's promise that "a quit that begins while survivors are pending waits for them" and arm (f)'s
  "survivors 0 once the quit completes" cost 4.8 to 6.6 s of quit time the parent does not spend. Under his
  rule that is removed, not kept.
- §4.2's order ("the capture, then the tree read, then the hang-up") put a 60 ms read in every End's answer.
  What the order has to promise is that both reads finish before the hang-up; they now run at once.
- §4.1's `identityPsArgs(pids)` and §1.2's timings measured the wide read and never the multi-pid re-read,
  which is 200 ms and serialises.
- The Gemini the product launches is not the 0.54.0 of 2026-08-06 the entry, §1.1 and §9 name: that one is
  under `~/.npm-global`. His login PATH finds `/usr/local/bin/gemini` 0.60.0 (mtime 2026-09-21 19:13:33), and
  a third under nvm is 0.60.0 (2026-09-23 17:16:52) (Lens 2). R8's key paths were read from 0.54.0's schema;
  Lens 2 found all three installs unchanged by size and mtime after its runs. `probe:p323:harness` refuses
  any install but the 0.54.0 before starting Gemini, which is the safe direction.
- §9 asks for a full `conformance:resume` under his HOME, which updated two of his agents. See finding 6.

### What this round could not do

- No Electron: the End round trip, arm f's quit time, arm h and R at HEAD against the parent are the
  reverify's, under THE LOCK. The in-band cost is re-derived above outside the app only.
- Cursor's self-update in a conformance run rests on `AGENT_CLI_UPDATE_CHECK_URL` alone (finding 6).
- R1's `setsid` half is still held (§2, §11): unchanged by this round.

### Commands, exit codes and numbers (the fix round)

| Command | Exit | Result |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | three times; the first after the product edits failed only in the three test files, as expected |
| `vitest run` on the three phase files | 0 | 91 of 91 (65 + 14 + 12) |
| `vitest run src/main/proc src/main/sessions src/main/conformance` | 0 | 39 files, 621 tests |
| `npm test` | 0 | 1,011 files passed, 1 skipped; 17,433 tests passed, 7 skipped; 63 s |
| `npm run -s build` | 0 | 32 s, every gate inside it green (`gate:electron` 154 against 154) |
| `conformance:endtree` | 0 | 14 of 14 rules (E14 new), 64 self-tests red as they must, each read red for its own reason (printed once) |
| `ablation:p323` | 1, then 0 | first run: A2's owner row stayed green (the ORDER row cannot see a read awaited after the hang-up when every read answers at once; the row that holds the read can), so A2 names that row; second run 27 of 27 in 140.9 s, control green first and last, restored by sha256 |
| `conformance:remoteclose`, `conformance:manager` (58 rules, 2,310 checks) | 0 | |
| `gate:checks`, `gate:background`, `gate:electron`, `gate:knownhosts`, `gate:simulator` | 0 | |
| `contract-inventory --check` | 0 | the baseline did not move |
| `P323_HARNESS_PLANTED_ONLY=1 P323_PARENT_CHECKOUT=<parent's two wrapper files, from git archive> node build/p323/harness-arms.mjs` | 0 | j2 and j3: parent 1 left (tree and cwd agree), HEAD 0 and "ended 1"; 31 s |
| the same, HEAD only, `env -u LANG -u LC_CTYPE LC_ALL=C` | 0 | HEAD 0 left, "ended 1" both arms; 21 s |
| `node build/harness-socket.mjs gmux-p323fixcost 'true'` | 0 | under 1 s; no runner started |
| the rig above, four runs | 0 | see its table |

---

## §As built, the integration re-run (2026-09-30, 03:14 to 03:30)

Written by an integrator launched again, after the fix round and its reverify, in `/private/tmp/wt-p323` at
`5866b527`. Nothing was committed, staged or stashed. No Electron was launched, no agent was started, no
`-L gmux` was named, and nothing outside this round's own scratch server was signalled. **No product file
and no test was changed.**

### What this round found

- **The builders' reports it was handed describe the tree two rounds ago.** They grade the tree before the
  first integration, with `TREE_READ_TIMEOUT_MS` at 2,000, E9 red, a ledger `follow` with a looping
  `join`, and 20 ablation arms. What is on disk is the fix round's tree, written at 01:15. The ledger is
  byte for byte the parent's again, End's read is the pane's terminal, and there are 14 rules and 27 arms.
  This round integrated the tree on disk and did NOT reapply anything the reports describe.
- **The reverify has already run** (01:25 to 02:22, `scratchpad/p323/reverify/`). origin/main's running log
  at `261d98b6` records its answer as the phase's second needs_work, sent to him. Under the rule that the
  fix runs once, this round is not a third fix. It changed no product code, no test and no instrument
  behaviour.

### What this round changed (reconciliation of the words only)

| File | Change | Why |
| --- | --- | --- |
| `build/verification-checks.mjs` | The `conformance:endtree` comment now says 14 rules, E1 to E14, the read started beside the capture, a quit that does not wait, and the files it reads. The `ablation:p323` comment now says twenty-seven arms. | Both still described the first build: thirteen rules, "the ledger's follow and join", "the waits inside the ledger's join", twenty arms. |
| `build/p323/ablation.mjs` | The header's cost now reads about two minutes, 113.6 s here and 140.9 s in the fix round. | It said five to seven minutes, from 288 s over twenty arms. |
| `CLAUDE.md` | The `probe:p323` row's cost now reads 24 minutes for BOTH builds, measured on 2026-09-30, 01:25 to 01:49, with arms b and e left out. | It said "about 25 to 40 minutes per build (an estimate until the first run)". The reverify's run is the first measurement. |

**The duplicate scan** looked for 10-line windows between every phase file and every script under `src/` and
`build/`, ignoring comments and blank lines. It found four matches, and none was extracted:
- Three are `import` lists: `probe-p323.mjs` against `probe-p275` and `probe-p202`, and `resume.ts` against
  `conformance/index.ts`.
- The fourth is the ablation house shape. `build/p323/ablation.mjs` shares about 50 lines with
  `build/p321/ablation.mjs`:
  - the imports, at `:61-76`;
  - the vitest JSON reader, the sha256 restore and the `clean` latch, at `:489-533`.

  Eight ablations carry the same shape (p313, p314, p275, p276, p293, p296, p321, p323). Extracting it would
  edit seven other phases' scripts while Phases 320.1, 330 and 331 are in flight. It is left for a
  consolidation round, as the first integration round also decided.

### Re-derived with readers of this round's own (two methods no earlier round used)

**1. The End path over hostile fixtures whose truth is set by construction.** The rig is
`scratchpad/p323/integrator/rerun/rig.mts`, which is not committed. The setup:
- a scratch server `-L gmux-p323irs<pid>` on the vendored 3.7b, started from a neutral `cat` session, so no
  server argv carries the run marker;
- every tmux call and every `ps` call under `LC_ALL=C` with no `LANG`;
- End's own reads for each session, by its `$-id`: the pane read with `sessionPanesArgv`, then
  `defaultEndDeps().readTerminals`, then `readSessionTree`;
- every `kill-session` sent at once, then every ending run concurrently with the real `defaultEndDeps()`;
- every signal passed through a guard that refuses any pid whose live command line lacks the run's marker.

Every planted process carries a label, written before anything is read, that says what it must be. No second
reader decides the right answer. Seven of the shapes were planted by no earlier round:

| Shape | Must be | Result, 3 of 3 runs |
| --- | --- | --- |
| s5: a process that calls `setpgid` then `tcsetpgrp`, making ITS OWN group the terminal's foreground, under a plain `sh` | the perl a target by `tpgid`, ended by SIGTERM; the sh ends on the hang-up | as required; at the hang-up alone (the parent's outcome) the perl runs on |
| s4: a same-session process in a group of its own (`setpgid(0,0)`) beside a HUP-ignoring root | the child spared, the root ended | as required |
| s6: an app bundle whose path holds a space (`My App ….app/Contents/MacOS/fake`, a symlink to `/bin/sleep`) in the pane's group, ignoring the hang-up | never a target, still running | as required |
| s7: a 6,000-character argv | a target, and identity holds across `ps -t` and `ps -p` | SIGTERM, gone |
| s9: a UTF-8 argv (`é-ü-日本`) under the C locale | a target, identity holds | SIGTERM, gone |
| s10: a second window | both panes read (`-s`); the plain one ends on the hang-up, the HUP-ignoring one gets SIGTERM | as required |
| s11: a dead pane kept by `remain-on-exit` beside a live one | 2 pane lines, 1 root; the live one ended | as required |

Also planted, as the earlier rounds did:
- s1, a HUP-ignoring root;
- s2, a non-job-control shell whose background and foreground children inherit the ignore, with all three in
  the pane's group and all three ended by SIGTERM;
- s8, a process that ignores both signals and is ended by SIGKILL;
- s12, a plain process that ends on the hang-up and is sent 0 signals;
- a stranger outside tmux in the same folder, which was untouched.

Numbers, the same in all three runs:

| Measure | Result |
| --- | --- |
| Selections that agreed with the labels | 11 of 11 |
| Labelled fates as required | 17 of 17 |
| Still running after the hang-up alone (the parent's outcome), read at 2 s | 14 |
| Still running at HEAD | 3: the two spared by design and the stranger |
| Endings that gave up on a read | 0 of 11 |
| Signals refused by the guard | 0 |
| `lsof -a -d cwd +D` census | equal to the identity census |
| In-band read, pane plus terminal | median 4.0 to 4.6 ms, max 5.4 to 6.4 ms |
| Endings' wall time | 6.64 to 6.65 s (the SIGKILL row) |
| Left by the `finally` | 0 processes, socket gone, folder gone |

**2. The shipped bundle, not the source.** The reader is `scratchpad/p323/integrator/rerun/bundle.mjs`. It
matches braces over the built `out/main/index.js`, which is a different reader over a different artefact
from the gate's TypeScript AST over `src/`. In the emitted `killSessionAdmitted`, the order is:
1. the remote check, at offset 184, which returns first;
2. the tree read started and not awaited, at 1573;
3. `await captureSessionSnapshot(`, at 1752;
4. the tree read awaited, at 2305;
5. the hang-up, at 2356;
6. the broadcast, at 2723;
7. `this.endAfterHangup(`, at 2772, not awaited and the last statement.

Across the bundle:
- `endAfterHangup(` and `readEndTree(` each appear exactly twice: the definition and one call.
- `endHangupSurvivors(` appears three times: the definition, `endAfterHangup` and scratch's `hangUpAndEnd`.
- The emitted `endHangupSurvivors` holds exactly two kills, `e2.pid` SIGTERM and `e2.pid` SIGKILL, and
  names no `.all`.
- The one `process.kill(-…)` in the bundle is the existing `killProcessGroup` in `guarded.ts`.
- The emitted `reapDeadSession`, `refresh` and `dispose` name none of it.

One fact was measured rather than assumed: the PATH tmux (3.6a) reads a vendored 3.7b server (`list-panes`
exit 0), so the backstop's `tmux` on PATH can read a server a harness started with `GMUX_TMUX_BIN`.

### Commands, exit codes and numbers (this round)

| Command | Exit | Result |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 2.1 s |
| `vitest run src/main/proc src/main/sessions src/main/conformance` | 0 | 39 files, 621 tests, 2.6 s |
| `npm test` | 0 | 1,011 files passed, 1 skipped; 17,433 tests passed, 7 skipped; 42 s |
| `conformance:endtree` | 0 | 14 of 14 rules, 64 self-tests red as they must, 1.0 s |
| `ablation:p323` | 0 | 27 of 27 arms, every owner red, control green first and last, restored by sha256, 113.6 s |
| `conformance:remoteclose` | 0 | 11 of 11 |
| `conformance:manager` | 0 | 58 rules, 2,310 checks |
| `gate:checks` | 0 | 241 check scripts classified; 1,012 test files reach no home past HOME |
| `gate:electron` | 0 | 154 reach the helper against the floor of 154 |
| `gate:background` | 0 | 488 files; 3 start a process they do not wait for, each ended in a `finally` |
| `gate:knownhosts` | 0 | |
| `gate:simulator` | 0 | |
| `gate:contract` (`contract-inventory --check`) | 0 | the baseline did not move |
| `npm run -s build` | 0 | 26.7 s, every gate inside it green |
| the rig, three runs | 0 | see above |
| the bundle reader | 0 | see above |

Not run, because each launches an Electron or an agent, or both: `smoke:t1`, `smoke`, `smoke:t3`,
`package`, `probe:p323`, `probe:p167`, the §8.3 arms, `conformance:resume:capture` and `conformance:resume`.
`probe:p323:harness` was not run again, because the reverify ran it at 02:21: PASS, planted only, with the
parent leaving 1 in each arm and HEAD 0 with "ended 1". Running the builder's own check the builder's way a
fourth time would add nothing.

### Open concerns for the verifiers

1. **Grade the tree on disk, not the reports.** See "What this round found".
2. **The reverify's findings stand, and nothing here changed them.**
   - `probe:p323` failed arm c. A plain shell's `setsid` job was ended at BOTH builds, so the probe's
     "all survive" expectation is wrong for that shape. R2 means HEAD reads no tree for it.
   - `probe:p323` failed arm k. The shared server was lost at BOTH builds, which is an instrument defect.
   - Arm f could not be read, because the probe's own inspector session holds the quit.
   - Rows c1-c-pi, c2-muse and c2-pi could not be read: "exited at start".

   A re-run of the probe reads the same. The instrument needs a fix before it can pass on a correct build,
   and that fix belongs to whichever round he authorises.
3. **Do not run §8.3 (j1, j4) or §9's `conformance:resume:capture` and `conformance:resume` as written.**
   Tortie's agent detection runs `qwen`, `agy` and `grok --version` in any run of the app that can reach
   them. That breaks his standing ruling, and under his HOME it also runs Gemini. `probe:p323` fences this
   with a PATH that cannot reach them; the conformance harness has no such fence. This is a spec defect,
   recorded at `261d98b6`.
4. **R1's `setsid` half is not built** (§2, §11). Grade it as held for his ruling, never as a pass of R1.
5. **A process born during End's capture is not in the tree.** Since the fix round the tree read runs BESIDE
   the capture, so the window the entry names widened from about nothing to the capture's duration. Such a
   process gets the hang-up only, as today. That is the safe direction, and it is not measured in the app.
6. **An End followed within the graces by a quit leaves the survivors, as today.** The CHANGELOG item says
   so. The quit no longer waits (the fix round).
7. **His two updated installs** (cursor-agent 2026.09.28-64d2043, opencode) came from a `conformance:resume`
   run under his HOME. The fix round's table (finding 6) puts it in the first verify round (Lens 2). The
   running log at `261d98b6` says the harness's update guards did not stop it. They are his to know about.
   No verifier should run that harness under his HOME again until item 3 is settled, and any run that does
   reads every install's path, mtime and size before and after.

---

## §As built, the second fix round (2026-09-30)

Written by the fixer in `/private/tmp/wt-p323` at `5866b527`, against the two verdicts of the second verify
round (Lens 1, the attack; Lens 2, the parent measured over real agents), both needs_work. Nothing was
committed, staged or stashed. No Electron was launched and no agent was started: every process this round
ran was planted, on scratch tmux servers of its own. Where this section and anything above disagree, this
section is what the tree holds.

**Three parts made a scenario worse than today, and each is REMOVED by construction:** the signal to a
process whose pane was never hung up (S10), the SIGTERM that cut an orderly exit still in progress (S9),
and the selection of the terminal's foreground group (d2). The rest is instrument and ownership work.

### What the verdicts found, and what was done

| # | Verdict | Finding | What the tree holds now |
| --- | --- | --- | --- |
| 1 | Lens 1 major, S10 | `kill-session` of a session whose window a grouped session (`new-session -t`) or a linked window (`link-window`) still shows hangs up nothing, and HEAD sent SIGTERM to that live pane's process 4 s later. | **REMOVED.** Before each signal the ending asks the server that answered the tree read for every pane it still shows (`LIVE_PANES_ARGV`, `list-panes -a -F '#{pane_pid}'`, within `TREE_READ_TIMEOUT_MS`) and drops every target whose pane is one of them (`hungUpOnly`). A root now counts only if it leads its own group, which every pane process does (tmux starts it with `setsid`, and a session leader cannot change its group), so a target's group IS its pane's process. The check is asked only at a step that may signal; a check that does not answer signals nothing on that step and is asked again under `READ_RETRY_MS`; only a CONFIRMED "no server running" (Phase 67's `serverProbeVerdict`) reads as no pane shown. Each caller asks its own server: core.ts and scratch.ts through `tmux.execTmux`, the harness runner through `tmux -u -L <socket>`, which is now handed the socket. Measured on the vendored 3.7b: after `kill-session` of both shapes the pane is still listed, live, under the other session. New rule E15, arms A28 and A36, and rows in all three test files. |
| 2 | Lens 1 major, S9 | A process that ends itself on the hang-up in 5 s, with SIGTERM left at its default, was cut at the 4 s grace: 0 lines written against 51 today. | **REMOVED for every exit an agent Tortie launches allows itself.** `HANGUP_GRACE_MS` is 10 s (twice S9, and longer than Claude Code's own default shutdown failsafe, 6.5 s) and `TERM_GRACE_MS` is 60 s, so SIGKILL comes at 70 s, past the 65 s Claude Code allows its own shutdown at the most. Read from its installed 2.1.285 binary, never run: on SIGHUP it runs `shutdown(129)`, whose first line is `if (this.shutdownInProgress) return;` (so a SIGTERM meanwhile is ignored), and it arms its own failsafe at `max(5000, SessionEnd hook timeout + 5000)`; the hook timeout is `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` if set, or else `max(1500, min(longest configured SessionEnd hook timeout, 60000))`. So with a person's own 30 s SessionEnd hook the 6.5 s SIGKILL of the build before would have cut Claude's own exit, which today completes. After the hang-up, and after SIGTERM, the ending re-reads every 250 ms for `QUICK_POLLS_MS` (2 s, covering the census's slowest orderly exit, 1,534 ms) and then once at the grace's end, so a 70 s wait costs 9 re-reads and not 280. `ENDING_WORST_MS` is 94.5 s (both graces, each overrun by the retry window, a poll and the two reads a signal waits for), driven by the adversarial row to the millisecond. E9 holds all of it, arms A30 and A31. |
| 3 | Lens 1 minor, d2 | A person's foreground `nohup` job in a restored agent row (a login shell is the pane) was ended; today it survives. | **REMOVED.** The targets are the pane process's own group only; the terminal's foreground group is not selected. Every agent the census launched in the restored shape ends on the hang-up by itself (27 rows, 0 survivors), and in the created and wrapped shapes the agent is in the root's group anyway, so the selection bought no measured agent anything. E6 now refuses a selection that reads `tpgid`, arm A29, and two rows. Also read from Gemini's bundle while doing this: the launcher's handlers for SIGHUP, SIGTERM and SIGINT are empty, and the child never gets a hang-up in the created shape, because the kernel sends the terminal's foreground group SIGHUP only when the session leader EXITS, and this leader never does. That is the defect's mechanism, which §1.3 item 1 left unmeasured. |
| 4 | Lens 1 minor, X7 | Nothing owned End's pane read bound. | A row (`reads the panes within one read’s bound…`) asserts the list-panes call carries `timeoutMs` ≤ `TREE_READ_TIMEOUT_MS`, E12 asks the same over the source, arm A32. |
| 5 | Lens 1 minor, X12 and X13 | Nothing owned the refusal of a timed-out or signalled `ps`, nor the `pid <= 1` guard in each signal loop. | Two rows: a timed-out, signalled or cancelled read that printed parseable rows with exit 0 is null for all three readers, and a tree naming pid 1 and 0 with a re-read answering for them sees `kill` asked only for 812. Arms A33 and A34. |
| 6 | Lens 1 nits | The header said the pid-reuse window was "one synchronous loop"; the harness runner's `end` was bounded at 15 s against a 29 s ending. | The header now says the gap is at most one read's bound, and names the 97,920 forks Lens 1 needed to reuse one pid. The runner's `end` is bounded by `END_RUNNER_TIMEOUT_MS`, 120 s, above `ENDING_WORST_MS` (E11 asks it against the loaded module's constant). `harness-arms.mjs` waits 130 s. |
| 7 | Lens 2 major, h | The batch End of eight Gemini rows read 570 ms against the parent's 512 (over a 33 ms allowance), from one sample per build; the previous run read the other way by 347 ms. | Instrument only. Arm h now times `P323_H_REPEATS` (default 4) batch Ends per build, watches each repeat's endings out before the next starts (so HEAD's continuations never run beside the next batch), waits for the tree lines before counting signals, and grades the median difference against the reads' cost plus half the larger build's measured range: PASS inside it, FAIL only when every HEAD sample is slower than every parent sample by more than the reads, and UNREADABLE (never PASS) in between. `P323_HEAD_FIRST=1` runs HEAD first, the report records `order`, and `P323_PRIOR_REPORT` pools (C) and (h) with a run in the other order. No product change was made for it: in the batch's first half second a continuation still takes at most three re-reads, the same as before, and Lens 2 measured one `ps -p` at 0.19 ms of main-thread time. |
| 8 | Lens 2 major, conformance | Every conformance run §8.3 and §9 ask for makes Tortie's agent detection run `qwen`, `agy` and `grok --version` (and Gemini under his HOME), against his ruling. | **Not run, and not runnable as written.** §8.3 (j1, j4), `conformance:resume:capture` and the full `conformance:resume` of §9 are withdrawn. The closing check is proven by `p323-scratch-tree.test.ts` (13 rows, driving scratch.ts's own composition, the pane check included) and by `probe:p323:harness` over planted processes. A detection allowlist for harness runs would be a new seam, so it goes to him (below). |
| 9 | Lens 2 minor, pi | pi 0.84.2 needs node ≥ 22.19.0, and the scratch login PATH's node is 22.14.0, so pi died at start and read UNREADABLE at both builds. | pi's wrapper puts a folder holding ONLY a link to the probe's own node first on its PATH, after reading pi's own `engines.node` and checking the probe's node meets it (`report.world.nodeForPi`). His nvm folder is never added, because it holds grok. Checked here against pi's installed package.json without running pi: needs 22.19.0, the probe's node is 22.23.1. |
| 10 | Lens 2 minor, order | The probe always ran the parent first, which favours HEAD. | `P323_HEAD_FIRST` and `P323_PRIOR_REPORT`, as in item 7. |
| 11 | Lens 2 minor, R and h | The probe read app.log before the continuation's line landed: R reported 0 signals where the log named 2, h 10 where it named 16. | Both wait for the lines, up to 3 s, as `endAndWatch` does. |
| 12 | Lens 2 nit, muse | `c2-muse` read "exited at start". | It reads "muse refuses to start under his home (its own error…)", still UNREADABLE. |
| 13 | The second reverify, left for this round | Arm c's `setsid` job ended at BOTH builds; arm k read the probe's own ending of the shared server as the product's; arm f never saw the app exit. | c: `( perl …; true ) &`, so the subshell forks perl and perl is not the job's group leader, whose `setsid()` fails (the spec step's census wrote it this way). k: the End and the watch are done in the arm, the server and the client are read, and only then does the probe end anything. f: the main-process inspector session is closed right after the quit is asked, because a Node process with an inspector attached waits for it before exiting. All three are unproven live (no Electron this round). |
| 14 | Instruments, beside items 1 to 3 | The probe's and the harness's own classifications used the terminal's foreground group; the probe watched every row for `HANGUP_GRACE_MS + TERM_GRACE_MS + 2 s`, which at 60 s would have made the whole table hours long. | Both classify by the pane process's own group. A watch now ends at `SETTLE_MS` (the first grace plus 5 s) once nothing left is a process this build could still signal (at the parent anything; at HEAD whatever is outside the pane's group or an app bundle's executable), so only a target that ignores SIGTERM too is watched to its SIGKILL. New arm g plants the S10 shapes inside the app on the app's own scratch server, with no Tortie id, so the app never adopts them. |

### Re-derived by the fixer, with a rig of its own (no Electron, no agent)

`scratchpad/p323/fixer2/rig2.mts`, not committed. One scratch server `-L gmux-p323fx2r-<pid>` on the vendored
3.7b with `-f /dev/null`, every tmux and `ps` call under `LC_ALL=C` with no `LANG`. Five shapes, each labelled
with what it must be before anything is read, each read the way End reads it (`sessionPanesArgv`, then
`readTerminals`, then `readSessionTree`), all hung up at once, and every ending run concurrently through the
real `endHangupSurvivors` with the real `/bin/ps` and a pane check asking that server. Every signal went through
a guard refusing any pid whose live command line lacks the run's marker. The control is the module exactly as
this round found it, from Lens 1's clone (`verifier-attack/r3/head`, sha256 `e964f4f5…f769`).

| Shape (what it must be) | This round's module | The module as found |
| --- | --- | --- |
| grouped: a HUP-ignoring root whose window a grouped session shows (never signalled, running) | not signalled, running, its pane still shown; the ending returned at 10,058 ms | SIGTERM, gone |
| linked: the same through `link-window` (never signalled, running) | not signalled, running, pane still shown | SIGTERM, gone |
| slow exit: ends itself on the hang-up in 5 s, 50 lines then COMPLETE, TERM default (never signalled, complete) | not signalled, 50 lines and COMPLETE | SIGTERM at the grace, cut at 38 lines, no COMPLETE |
| control: a HUP-ignoring root nothing else shows (SIGTERM, gone) | SIGTERM at 10,058 ms, gone | SIGTERM at 4,075 ms, gone |
| restored: `zsh -f -i` with a foreground `nohup sh -c "trap '' HUP; exec perl …"` (the job never signalled, running) | targets [the zsh] only; the job not signalled, running | targets [the zsh, the job]; the job SIGTERM |

Signals refused by the guard: 0 in both runs. The `finally` ended 5 and 2 marked processes by pid, then the
server; afterwards 0 marked processes, 0 sockets and 0 run folders were left.

`probe:p323:harness`, planted only, at the parent (the two wrapper files from `git show 5866b527`, sha256
matched) and at HEAD: **PASS in 42.5 s.** j2 and j3 at the parent left the planted process running (tree and
working-directory census agree); at HEAD both ended it through the runner's new `end <socket>`, in 10,902 and
11,039 ms, and printed "ended 1". That is the harness path end to end: the tree read, `kill-server`, the pane
check answering "no server running", and SIGTERM at the new grace.

### What the entry and the spec got wrong (for the report)

- **§2.2 item 2 (the terminal's foreground group).** It bought no measured agent anything and ended a
  person's foreground job in a restored row. Removed.
- **§3's graces.** The census measured agents idle at their first screen. An agent's own shutdown is longer
  by design: Claude Code gives a person's SessionEnd hooks up to 60 s and its failsafe 5 s more, and ignores
  SIGTERM while it runs. 4 s and 2.5 s were chosen from the idle census alone.
- **The assumption, never written down, that `kill-session` destroys every pane `list-panes -s` read.** It
  destroys only windows no other session shows.
- **§8.3 and §9's conformance runs** cannot be made under his rulings, because detection runs every
  resolvable agent's version probe, qwen, agy and grok included (Lens 2, from source: `resume.ts:771`,
  `core.ts:1341`, `detection.ts` `scanAgents`, `resolve.ts:160` `extraBinDirsFor`).

### What this round could not do

- **No Electron.** Every probe change (the settle rule, arm g, arm h's repeats and grading, the order
  switch, pi's node, the fixes to arms c, k, f, R and h's line wait) passed `node --check`, `gate:background`
  and `gate:electron`, and `enginesNodeOf` was run against pi's real package.json, but `probe:p323` itself
  has not run. The in-app End round trip and the batch End time at HEAD are the reverify's.
- **No agent mid-turn.** Whether an agent's exit on the hang-up in the middle of a turn can pass 10 s is not
  measured; it would need a real turn under his sign-in. Claude Code's own bounds were read from its binary.
- **The conformance runs** (item 8).

### For him (additions to §11)

1. **The graces are now 10 s and 60 s.** Gemini's pair ends about 10 to 12 s after End rather than 4 to 6, and
   an End followed by a quit within those 10 s leaves Gemini running, as it always did. What is still cut: a
   process that catches the hang-up, lets SIGTERM end it, and needs more than 10 s to finish; and an agent
   whose own shutdown runs past 70 s (for Claude Code, only a person who sets
   `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` above 65 s). Shorter graces are his call.
2. **d2 is as today again.** If he wants a restored agent row's foreground job ended, that is a ruling, and it
   brings back the case where it is his own job.
3. **The conformance closing check over real agents** needs either a detection allowlist for harness runs (a
   new seam) or his acceptance that the planted harness and the unit rows prove it.
4. **R1's `setsid` half is still held** (§2), unchanged by this round.

### Commands, exit codes and numbers (this round)

| Command | Exit | Result |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | several times; the first after the product edits failed only in the three test files, as expected |
| `vitest run` on the three phase files | 0 | 105 of 105 (77 + 15 + 13), from 91 |
| `vitest run src/main/proc src/main/sessions src/main/conformance` | 0 | 39 files, 635 tests |
| `npm run -s build` | 0 | 27 s, every gate inside it green (`gate:electron` 154 against 154) |
| `npm test` | 0 | 1,011 files passed, 1 skipped; 17,447 tests passed, 7 skipped; 38 s |
| `conformance:endtree` | 0 | 15 of 15 rules (E15 new), 81 self-tests red as they must, each read red for its own reason (printed once through a scratch copy of the gate) |
| `ablation:p323` | 0 | 36 of 36 arms (A28 to A36 new), every owner red, control green first and last (15 rules, 105 rows), restored by sha256; 149.0 s |
| `conformance:remoteclose`, `conformance:manager` (58 rules, 2,310 checks) | 0 | |
| `gate:checks`, `gate:background` (after one false positive of the kind item 4 of the integration round names, a `RegExp.exec` in the probe, rewritten as `String.match`), `gate:electron`, `gate:knownhosts`, `gate:simulator` | 0 | |
| `contract-inventory --check` | 0 | the baseline did not move |
| `P323_HARNESS_PLANTED_ONLY=1 P323_PARENT_CHECKOUT=<the parent's two wrapper files> node build/p323/harness-arms.mjs` | 0 | PASS in 42.5 s: parent 1 left in j2 and j3, HEAD 0 and "ended 1" at 10,902 and 11,039 ms |
| `rig2.mts head` and `rig2.mts before` | 0 | the table above |
| a scratch-tmux measurement of both S10 shapes on the vendored 3.7b | 0 | the pane listed live under the other session after `kill-session`; after `kill-server`, `list-panes` prints "no server running on …" with the socket file still there |

Not run, because each launches an Electron or an agent: `smoke:t1`, `smoke`, `smoke:t3`, `package`,
`probe:p323`, `probe:p167`, and the conformance runs item 8 withdraws.

The CHANGELOG item now reads "now ends Gemini too, about ten seconds later" and "and so does Gemini if you
quit Tortie within those ten seconds".

---

## §As built — 323, after his ruling (2026-09-30)

Written by the fixer of the round after his ruling (workflow `p323-ruled-fix`), in `/private/tmp/wt-p323` at
`5866b527`. Nothing was committed, staged or stashed. No Electron was launched, no agent was started, `-L gmux`
was not named and nothing was signalled. **No file under `src/` changed, and the product half is exactly as the
second fix round left it.** Where this section and anything above disagree, this section is what the tree
holds.

**His ruling, 2026-09-30: "Fix the tests, then land."**
- End ends what is still on the session's terminal, in the group the hang-up was aimed at.
- Processes that fully left the terminal are a separate follow-up.
- The quit does not wait, and End does not read the whole table in its own time.
- Only the proof is repaired.

### Found before any edit: a second workflow in this worktree

The resumed Phase 323/324 workflow (`wf_64949866`) is still running here. After the first reverify's needs_work
(`261d98b6`), it ran four more steps:
- an integration re-run;
- a second verify round;
- the second fix round above, which changed product code: the 10 s and 60 s graces, the pane's own group only,
  and S10;
- its reverify, `a85e872c40586839f`, which started at 08:12:40 and was still live while this round worked.

The fixer told the main session twice and held every edit until that reverify had finished its first
`probe:p323` run and released the lock. Its probe run is read only here, as evidence:
- at the parent, arm f exited, and the quit read 36,647 ms;
- arm k read the server before anything was ended;
- `r-new-gemini` was measured;
- at HEAD it threw, because a session named `shell-3-2` appeared on `-L gmux` during the launch.
  `build/electron-run.mjs` refuses that for any probe. The name is one a person opens in his own Tortie. It is
  not this phase's code.

### Item 1, `probe:p323` cannot pass on a correct build

| Finding | State in the tree before this round | This round |
| --- | --- | --- |
| Arm f never released the inspector session | The second fix round closed the session after the quit call returned | **Changed.** The parent's quit still read 36,647 ms, and at least 6.6 s of it was inside the inspector call. The call now only arms `setTimeout(() => app.quit(), 100)` and returns `'scheduled'` within 10 s. The session is closed before the timer fires. The clock starts when the call has returned, and the exit is waited for up to `QUIT_WAIT_MS` (90 s), not 30 s. A call that does not answer `'scheduled'` is UNREADABLE. The report gains `scheduleMs`. |
| Arm f graded against a 10 s ceiling the parent need not meet | `h.quitMs <= QUIT_CEILING_MS` sat in the verdict beside the parent rule | **Changed.** The verdict is the parent rule alone: HEAD no slower than the parent by 500 ms, or by a tenth of the parent's quit when that is longer (one sample a build), and nothing more left. The 10 s ceiling is printed beside the reading and not graded, because the fix round removed the wait it was written for. |
| Arm k ended the shared server before reading it | Fixed by the second fix round: End and watch in the arm, the server and client read, then the probe's own ending | Unchanged, read |
| `r-new-gemini` measured, never graded | Fixed by the first fix round (the grader's labels are `/^(?:c[12]-\|r-new-)/`) | Unchanged, read |
| Empty trees graded PASS | Fixed by the first fix round ("exited at start", UNREADABLE) | Unchanged, read |
| R and h read app.log before the line landed | Fixed by the second fix round (`awaitTreeLines`) | Unchanged, read |
| Terminal.app's variables refused the preflight | Fixed by the first fix round (`TERM_SESSION_ID`, `TERM_PROGRAM`, `TERM_PROGRAM_VERSION` and `SHELL_SESSION_ID` are stripped) | Unchanged, read |
| Found here: `--self-test` could never reach the probe | `build/cdp-target.mjs` answers `--self-test` when it is imported, then exits, so the probe's own flag printed that module's 10 fixtures | **Changed.** `pickRendererTarget` is loaded inside `attachRenderer`, the way `build/p331/probe-p331.mjs` does it |

### Item 2, the four agents never started

**`probe:p323`, before each of its two launches:**
- `neverOverlay()` renames the binaries and launch argv[0] of qwen, antigravity and grok to `p323-never-<id>`.
  `writeNeverOverlay(profile)` writes it into THAT build's `<profile>/gmux/config/agents.json` just before its
  `withElectron`.
- `neverPrecheck()`, before either launch, runs each build's own `parseAgentOverlay`, `mergeAgentOverlay`,
  `resolveBinaryAllAgainst` and `extraBinDirsFor` through the pinned tsx. It resolves against the login shell's
  PATH and the app's PATH under the scratch HOME. Anything but a whole load with 0 copies is a Stop, exit 2.
- After boot and before any arm, `agents:list` is read back (`neverScanVerdict`). A hidden row with a binary, a
  version or `installed`, or a droid anywhere but the probe's own stand-in, is a Stop, exit 2, and the other
  build is never launched. Each build prints a `(guard)` line.
- `installsNow` also reads every qwen, agy and grok found by name on the inherited PATH and in their rows'
  folders under his home, by `stat` alone. A moved one stops the run like any other install.

**What is not renamed, and why:**
- **Droid.** Its row IS the planted stand-in. A renamed execution field gives the row an `executionHash`, which
  `assertConfigRowMayLaunch` asks on the create path, so no planted row could be made. The read-back holds droid
  to the stand-in instead.
- **Gemini.** Every launch's HOME is the scratch one, and its wrapper forces it. R3 lets Gemini run there under
  R8.

**The conformance runs.** At this head the harness never reads `agents.json`: `dispatchHarness` returns at
`src/main/index.ts:508`, before `void initAgentOverlay()` at `:543`. Its version scan, `listDetectedAgents()` at
`src/main/conformance/resume.ts:771`, walks the whole compiled table. So the fence is the sandbox and the update
guards (§9), and an `agents.json` there is not claimed as a guard. Phase 331's `conformanceDetectionTable`
arrives with the rebase onto origin/main.

The two profiles:
- `deny4.sb` is `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p331b/reverifier/sb/deny4.sb`,
  unchanged.
- The three-name profile for j1 and j4 was written by this round at
  `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p323/fixer3/sb/deny3.sb`.

Both texts are below, because the scratchpad does not survive a reboot.

```
; deny4.sb (every conformance run)
(version 1)
(allow default)
(deny process-exec
  (require-all
    (regex #"/(gemini|qwen|agy|grok)([-.][^/]*)?$")
    (require-not (subpath "/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p331b/reverifier/sb/standin"))))
(deny file-read-data
  (subpath "/usr/local/lib/node_modules/@google/gemini-cli")
  (subpath "/Users/gdc/.npm-global/lib/node_modules/@google/gemini-cli")
  (subpath "/Users/gdc/.nvm/versions/node/v22.23.1/lib/node_modules/@xai-official/grok")
  (subpath "/Users/gdc/.grok")
  (subpath "/Users/gdc/.antigravity")
  (literal "/Users/gdc/.local/bin/qwen")
  (literal "/Users/gdc/.local/bin/agy"))

; deny3.sb (j1 and j4, scratch HOME, Gemini allowed by R3): deny4.sb with gemini out of both rules
(version 1)
(allow default)
(deny process-exec
  (require-all
    (regex #"/(qwen|agy|grok)([-.][^/]*)?$")
    (require-not (subpath "/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p331b/reverifier/sb/standin"))))
(deny file-read-data
  (subpath "/Users/gdc/.nvm/versions/node/v22.23.1/lib/node_modules/@xai-official/grok")
  (subpath "/Users/gdc/.grok")
  (subpath "/Users/gdc/.antigravity")
  (literal "/Users/gdc/.local/bin/qwen")
  (literal "/Users/gdc/.local/bin/agy"))
```

### Item 3, R1's scope written as his ruling

- §2.2 is rewritten. It states the ruling, the rule as the tree holds it (the pane's own group, the terminal's
  foreground group not selected, S10's pane check, and 10 s and 60 s), and the table as it stands. That covers
  d2 as today, a pane another session still shows, and an End followed by a quit.
- §11 records what he was told and what he ruled, and what is still to report.
- §10 item 1 and §15 name what fully left the terminal as the follow-up he named.
- §8.3 and §9 bring the conformance arms back behind the fence.
- `CLAUDE.md`'s `probe:p323` row names the agents.json guard, its read-back and `--self-test`.

### Measured by this round, with no Electron and no agent

| Measurement | Result |
| --- | --- |
| The precheck's exact script, taken out of the probe's text, at the built parent `/private/tmp/wt-p323-parent` and at HEAD, against his real HOME and PATH (the worst case) | both: 0 parse and 0 merge problems; qwen, antigravity and grok each carry exactly `p323-never-<id>`, with 0 copies |
| The control: the same reader with an empty `agents` list | qwen 1 copy, agy 1, grok 2. The reader can say no. Found by `stat`, and none of them was run |
| `deny4.sb` over decoys, each a two-line `/bin/sh` script in a scratch folder named `qwen`, `agy`, `grok`, `gemini`, `qwen-code`, `grok.js` and `claude` | the first six refused with "Operation not permitted" (exit 71), and `claude` ran |
| `deny3.sb` over the same decoys | `qwen`, `agy`, `grok`, `qwen-code` and `grok.js` refused; `gemini` and `claude` ran |
| Inheritance under `deny4.sb` | a detached child (`( … & )`) and a bare-name PATH lookup were both refused (126, "bad interpreter: Operation not permitted") |
| Whether macOS logs these denials | No. A deny rule refuses `(with report)` ("report modifier does not apply to deny action"), and no denial appeared in `log show`. So §9's read-back is the decoy check and the install comparison, not the log |
| The probe's `--self-test`, 21 fixtures | 21 of 21. Six one-clause ablations of the three graders: five went red at once, and the sixth (the binaries clause) went red once its own fixture was added |

### Commands and exit codes

| Command | Exit | Result |
| --- | --- | --- |
| `node build/p323/probe-p323.mjs --self-test` | 0 | 21 of 21 |
| `node build/p323/probe-p323.mjs` with no parent | 2 | the one sentence, before anything is made |
| `npm run -s typecheck` | 0 | |
| `vitest run` on the three phase files | 0 | 105 of 105 |
| `npm run -s conformance:endtree` | 0 | 15 of 15 rules, 81 self-tests red as they must |
| `npm run -s ablation:p323` | 0 | 36 of 36 arms, every owner red, restored by sha256, 147.3 s |
| `npm run -s gate:checks`, `gate:electron` (154 against 154), `gate:background`, `gate:simulator`, `gate:knownhosts` | 0 | run before and after the arm f edit |
| `npm run -s build` | 0 | 30 s, every gate inside it green, and `contract-inventory` did not move |

### What this round could not do

- No Electron, so three things are unproven live: the `agents:list` read-back, the scheduled quit, and arm f's
  grade. The reverify runs them under THE LOCK.
- The owed conformance runs were not made here. §9 says how they are fenced.

---

## §As built — 323, the tools round (2026-09-30)

Written by the fixer of the round after his ruling of 2026-09-30, after the third needs_work: **"One more tools-only
round"**. Worktree `/private/tmp/wt-p323` at `5866b527`. Nothing was committed, staged or stashed. No Electron was
launched, no agent was started, `-L gmux` was not named and nothing was signalled. **The product half is exactly as
the second fix round left it** (graces of 10 s and 60 s, the pane process's own group only, S10's check). The one
thing under `src/` this round changed is the conformance closing check his ruling names, in
`src/main/conformance/scratch.ts` and `resume.ts`, with its test file. Where this section and anything above
disagree, this section is what the tree holds.

### Item 1: the closing check read green when it could not look

**What was wrong.** The reverify ran the capture with `/bin/ps` refused. All seven Ends logged "could not be read
when it was ended", yet the harness printed "closing check: 0 agent processes of this run are still running". A
record-time tree read that answered `null` recorded nothing. `leftBehind()` then saw no trees and answered empty.

**What the tree holds now** (`src/main/conformance/scratch.ts`):
- `readTreeOf` answers `{ tree, failed }`. `failed` is "its panes could not be read" (tmux threw) or "the process
  table could not be read" (`ps` answered null).
- A session whose panes answered with NO LIVE PANE is `failed: null`. The check looked, and nothing was under a
  pane. That is exactly what the product's own End finds for it. Counting it as a failure would turn every run in
  which an agent exits at start red (ablation A40).
- `recordTreeOf` never throws. It records every failed read as `<tmux name>: <why>`. It asks `tmux.listSessions()`
  itself, because `tmuxIdFor` answers "not live" when tmux does not answer. A read that throws is recorded rather
  than swallowed by its callers' `.catch`.
- `hangUpAndEnd(id, tmuxName)` records a failed read once the hang-up has gone out. A hang-up that throws still
  records and signals nothing.
- `leftBehind()` answers `{ targets, outOfScope, unread, recorded }`.
- `closingVerdict(left | { failed })`, new, composes the one line and the exit code. `resume.ts`'s `closingCheck`
  only prints it. It is red (1) in three cases:
  - a hang-up target is still running;
  - any session's tree could not be read: "FAIL: the closing check could not look at N session(s) of this run,
    whose process tree could not be read before the hang-up (…), so it cannot say what they left running";
  - the re-read itself never answered.

  The clean line now says out of how many: "closing check: 0 of the N agent process(es) this run read are still
  running".

**Its one named edge.** A session that closes by itself in the milliseconds between the session list and its pane
read (an agent exiting 0, with no dead pane kept) reads as "its panes could not be read". That is red, which is the
safe direction, and it is named here rather than guessed around.

**Proved red by removal.** Five new rows in `p323-scratch-tree.test.ts` (18 rows now) and six new ablation arms,
each of which removes one clause and turns its owner row red (`ablation:p323`, 42 of 42):

| Arm | The clause removed | Owner rows red |
| --- | --- | --- |
| A37 | `recordTreeOf` records no failed read (the defect as the reverify found it) | the table-read row, the thrown-read row |
| A38 | `hangUpAndEnd` records no failed read | the harness's own hang-up row |
| A39 | `closingVerdict` ignores the unread sessions | four rows |
| A40 | a session with no live pane counted as a failure | the no-live-pane row |
| A41 | the record asks through `tmuxIdFor` again | the thrown-read row |
| A42 | a thrown read swallowed inside the record | the thrown-read row |

### Item 2: `probe:p323` can exit 0 on a correct build

**The stated exception.** `KNOWN_START_REFUSALS` now holds each row's reason AND its agent's own words.
`measure()` records `statedRefusalSeen`, a yes or no, never the screen: the words are on the row's DEAD pane
(`remain-on-exit failed`) before End. `emptyRowVerdict` grades the row EXCEPTION only when:
- the row is listed;
- the tree was empty at BOTH builds;
- the words were seen at both builds.

Anything else that started nothing stays UNREADABLE: a row listed but started at one build, one whose words were
missing, and every row not listed. EXCEPTION is neither a pass nor a failure. It does not stop exit 0, and the OK
line names it.

**Which rows.** The reverify's whole run (rv3, all fourteen arms, nine agents, both builds) read `c2-muse` at 0
and 0 processes. Every other C1, C2 and `r-new` row read at least one process at both builds. So `c2-muse` is the
only stated exception. Its words, "created session home no longer matches its protected writer route", are from
Lens 2's start check outside Tortie: exit 1 in 547 to 563 ms, with and without the guards.

**npm.** The stub still refuses EVERY call, so nothing reaches the network or the disk through it. It now logs
each call's arguments apart, by the unit separator. `npmCallClass` classes each call:
- `install`: `install`, `i` and their aliases, `add`, `update`, `ci`, the uninstall and link verbs, `exec` and
  `init`/`create`, which fetch and run a package, and `audit fix`;
- `read`: `view`, `info`, `ls`, `outdated`, `search`, `config get` and the like;
- `other`: anything else.

The verb is the first word npm knows, with options skipped. `installVerdict` fails "nothing was installed" only on
an install verb or a moved install. Reads are named with their counts, and the report carries verbs only.

**Installs are still read by version and mtime before and after every arm**, and now include every package in every
global npm folder (`build/p323/installs.mjs`, shared with the fence). The reverify's parent arm e tree held a REAL
`npm`: under his home a login shell finds it before the stub, so a global add by that path must still show. The
reader covers five global folders on his Mac, 43 packages, in 30 ms, read only.

**(C) in ABBA order within the one run.**
- New arm `rt`: `P323_RT_ROWS` (16) planted rows of a new stand-in mode, `plain` (`exec /bin/sleep 3609`, which
  ends on the hang-up). Each is Ended through the bridge and timed, watched until its process is gone, then
  1.5 s pass before the next.
- It runs at the end of each full launch, before f. Then each build is launched once more, in the other order, for
  `rt` alone (`runBuild(…, { rtOnly: true, suffix: '2' })`, its own socket, profile, folders, overlay and guard
  read-back). The four blocks run parent, HEAD, HEAD, parent.
- `abbaVerdict` grades the pooled median of HEAD's two blocks minus the parent's two, against one tree read (the
  terminal read plus the pane read, averaged over both HEAD launches). A block with fewer than half its Ends is
  UNREADABLE.
- The census rows' one-order round trips are REPORTED, and `P323_PRIOR_REPORT` now pools (h) only.
- The self-test's drift fixture shows what this buys: 10, 16, 22 and 28 ms across the four launches on a build
  that costs nothing. One order alone reads +6 ms, over the allowance; ABBA reads 0.

**Proved.** `--self-test`: 51 of 51. Nine one-clause ablations of the new graders, in a scratch copy of `build/`,
each read red:
- npm: every call read as an install;
- npm: options not skipped;
- the install verdict ignoring a moved install;
- the install verdict ignoring an install verb;
- ABBA from the first two launches only;
- a short block not refused;
- the exception without its words;
- the exception with one build enough;
- any empty row an exception.

### Item 3: the fence

The `sandbox-exec` fence is withdrawn (§9 says why), and so are `deny4.sb` and `deny3.sb`; their texts in the
section above are history. Every conformance run stands behind `build/p323/fence.mjs`, and every probe launch behind
the probe's own `agents.json` overlay and PATH, as §9 now says. The update guards stay exported by both.

Measured by this round (no Electron, no agent started; lookups and one login shell under the scratch HOME only):

| Measurement | Result |
| --- | --- |
| `--check`, j1's list (`gemini,claude`), HEAD | exit 0. qwen, antigravity and grok resolve nowhere; gemini and claude resolve first to their links; the scan will also ask `omp` at `/opt/homebrew/bin/omp` |
| `--check`, j1's list, the built parent `/private/tmp/wt-p323-parent` | exit 0, the same, through the parent's own resolver |
| `--check`, the capture list (`claude,cursor,codex,deepseek,muse,pi,omp,opencode`) | exit 0. All eight resolve first to their links. The scan will also ask Gemini 0.60.0 at `/usr/local/bin/gemini`, under the scratch HOME with R8 |
| The same resolver, the fence's PATH, HIS home | qwen at `~/.local/bin/qwen`, antigravity at `~/.local/bin/agy`, grok at `~/.grok/bin/grok`, gemini at `/usr/local/bin/gemini` and `~/.npm-global/bin/gemini`: no PATH fences a run under his home at this head |
| `GMUX_CONF_AGENTS=claude,qwen … --check` | exit 2, refused by name before anything is built |
| A lookup-only command behind the fence (`command -v` from its PATH, and from a `zsh -lic` under its HOME) | qwen, agy and grok: none; gemini and claude: the links; npm, node and tmux: the tools folder |
| `npm run -s build` behind the fence | exit 0 in 31 s; every install unchanged (27 read) |
| `--self-test` | 9 of 9, and three one-clause ablations of `fenceVerdict` each red |
| Which Gemini a link takes | his `zsh -lic` PATH finds `~/.npm-global/bin/gemini` (0.54.0, the version R8's keys were read from), his `zsh -lc` `/usr/local/bin/gemini` (0.60.0); by lookup only |

Under the fence's scratch HOME the app appends `--use-mock-keychain` for every harness launch
(`src/main/index.ts:198`). The agents run in probe:p323's C1 world, which ran clean at both builds in the
reverify.

### Files changed by this round

- `src/main/conformance/scratch.ts`: the closing check's record, `leftBehind`, `closingVerdict`.
- `src/main/conformance/resume.ts`: `closingCheck` prints `closingVerdict`.
- `src/main/conformance/__tests__/p323-scratch-tree.test.ts`: the fakes' three switches, the new shape and five rows.
- `build/p323/ablation.mjs`: arms A37 to A42.
- `build/p323/probe-p323.mjs`: the stated exception, npm, the global installs, arm `rt` and its second launches,
  `abbaVerdict`, the self-test.
- `build/p323/stand-in.sh`: mode `plain`.
- `build/p323/installs.mjs`, new: the global npm reader.
- `build/p323/fence.mjs`, new: the fence.
- `build/p323/SPEC.md`: §8.1's rows, §8.3, §9, this section.
- `CLAUDE.md`: the `conformance:endtree` row (the closing check, 42 arms) and the `probe:p323` row.
- `build/verification-checks.mjs`: the `ablation:p323` and `probe:p323` comments.

### Commands and exit codes

| Command | Exit | Result |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | |
| `vitest run` on the three phase files | 0 | 110 of 110 (77 + 15 + 18) |
| `vitest run src/main/proc src/main/sessions src/main/conformance` | 0 | 39 files, 640 tests |
| `npm run -s conformance:endtree` | 0 | 15 of 15 rules, 81 self-tests red as they must |
| `P323_ONLY=A37,…,A42 node build/p323/ablation.mjs` | 0 | 6 of 6, 18.3 s |
| `npm run -s ablation:p323` | 0 | 42 of 42 arms, every owner red, control green first and last (15 rules, 110 rows), restored by sha256; 156.2 s |
| `node build/p323/probe-p323.mjs --self-test` | 0 | 51 of 51 |
| nine one-clause ablations of the probe's new graders (scratch copy) | red each | 9 of 9 |
| `node build/p323/fence.mjs --self-test` | 0 | 9 of 9; three one-clause ablations red |
| `node build/p323/fence.mjs --check` (j1's list at HEAD and at the parent; the capture list) | 0 | see the table above |
| the fence refusing qwen; the fence with no command | 2, 2 | |
| a lookup-only command behind the fence | 0 | see the table above |
| `npm run -s build` behind the fence | 0 | 31 s |
| `npm run -s gate:checks`, `gate:electron` (154 against 154), `gate:background` (490 files, 3 long-lived, each ended in a `finally`), `gate:simulator`, `gate:knownhosts` | 0 | |
| `npm run -s build` | 0 | 28 s, every gate inside it green; `contract-inventory` did not move |

### What this round could not do

- **No Electron, so three things are unproven live:**
  - `probe:p323`'s arm `rt` and its two extra launches (budgeted at 5 to 8 minutes, on top of the 41 the
    reverify measured for the whole table);
  - the stated exception's dead-pane read;
  - the npm log in arm e.

  The fenced conformance runs (j1, j4 and the capture) are also unproven live. All of these are the reverify's,
  under THE LOCK.
- **No conformance run under his home can be fenced at this head.** It waits for the rebase onto origin/main
  (Phase 331's table).
- **The fence's `npm` is the real one**, because the run's own nested `npm run` needs it. An install through it
  shows in the global folders the fence reads, and the fence exits 2.

## §As built — 323, landing (his ruling of 2026-09-30, "Land it with 3 small test fixes")

After the tools round's reverify answered needs_work on the proof alone, he ruled to land with three test fixes made
by the main session and no further reverify round. (1) `probe:p323`'s stated exception now reads the dead pane's
WHOLE history (`capture-pane -S -`), because remain-on-exit leaves only tmux's "Pane is dead" line on the visible
screen and Muse's refusal above it. (2) `(C) the End round trip, ABBA` is REPORTED, not graded: at 16 Ends a block it
could not resolve its own allowance (a load spike read +29.6 ms where the quiet pair read +4.6 ms against 5.0); the
planted processes that outlive their hang-up stay graded as `(C) planted Ends leave nothing behind`. (3)
`conformance:endtree` gains E16, "the closing check's code reaches the run's exit", read as text in `resume.ts`
with three self-test attacks, and `ablation:p323` gains A43 (the closing code left out of the merge), red on E16.
The product half is the second fix round's, verified with no row worse than today in four independent rounds.
