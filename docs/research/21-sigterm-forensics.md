# 21 — SIGTERM forensics: can gmux kill an agent?

**Date:** 2026-08-10 · **Trigger:** screenshot `media_AkGG8ozcyG` (16:50) — session `greg` (claude, project `pi`) showing *"Session ended unexpectedly (exit 143)"* while five sibling sessions in the same project survived a `npm run dev` restart.

**Verdict:** **NOT REPRODUCED.** No gmux code path — normal quit, SIGTERM to main, SIGKILL to main, process-group SIGTERM, attach-PTY teardown, control-client teardown, overlapping-instance restart, or stale-manifest reconcile — can deliver `SIGTERM` to a pane process. Ten live experiments, zero marker processes signalled. `exit 143` required an external, targeted `kill -TERM` on the agent's pid. gmux's banner was **faithful reporting of a real external kill**.

Two genuine defects were found and reproduced along the way, and one standing hazard is live on this machine right now. They are the deliverable.

---

## 1. Method

All work ran on the user's private socket `-L gmux`, using only sessions prefixed `zzsig-`, plus isolated Electron builds with `--user-data-dir` in a scratchpad. The user's tmux server (pid 3948) and their eleven sessions were never signalled.

The marker process (`marker.sh`) traps `TERM`/`HUP`/`INT`/`QUIT`, appends `time + signal + pid/ppid/pgid` to a log, then exits `128+n` — deliberately mimicking `claude`, which self-maps signals to exit codes rather than dying by them.

Three classes of marker were used:

| marker | how created | why |
|---|---|---|
| `zzsig-m1` | raw `tmux new-session` | not gmux-managed — control |
| `zzsig-gm1`, `zzsig-gm2` | via `window.gmux.sessions.create` on an isolated build, then attached | full gmux management: manifest row, `liveIds` mapping, live attach PTY |
| `zzsig-gm3` | via gmux, running `exec sleep 600` | **untrapped** — dies *by* the signal, to expose tmux's reporting |

Isolated Electron ran under a `setsid` supervisor that recorded the child's wait-status, so every app death is classified as *exited(code)* or *killed-by-signal(n)*.

---

## 2. Topology — why a group signal cannot reach an agent

Measured live, and reproduced exactly in the isolated rig:

```
  3948     1  3948  Ss   tmux -L gmux -f resources/gmux-tmux.conf start-server   ← PPID 1, own sid+pgid
 89996  3948 89996       bash marker.sh gm1     ← pane process: own pgid, own session
 90014  3948 90014       bash marker.sh gm2
 82585  3948 82585       bash marker.sh m1

 93044     1 93044  SNs  supervisor (stands in for `npm run dev`)
 93046 93044 93044       Electron .                       ← app main, in the launcher's pgid
 93594 93046 93044       tmux -C new-session -A -s gmux-control   ← control client, IN the app pgid
 94705 93046 94705  Ss+  tmux attach-session -t =$333     ← attach PTY, own sid (forkpty → setsid)
 94706 93046 94706  Ss+  tmux attach-session -t =$334
```

`ensureServer()` (`src/main/tmux/supervisor.ts:163-221`) runs `execTmux(['start-server'])` through a plain `execFile` — no `detached`, no `unref`. gmux relies entirely on tmux's own `daemon(1,0)`/`setsid()`. It holds: the server is **PPID 1, its own session leader, its own process group**, and every pane process is a direct child of it in its *own* session and group.

Consequence: **no `killpg` aimed at anything gmux owns can reach a pane.** The app's process group contains the app, its helpers, and the control client — and nothing else. This is correct, but it is correct by tmux's behaviour, not by any assertion gmux makes; see fix F4.

---

## 3. Signal semantics on tmux 3.6a (measured, not assumed)

Three measurements on my own `zzsig-` sessions:

| what happened | `pane_dead` | `pane_dead_status` | `pane_dead_signal` |
|---|---|---|---|
| `tmux kill-session -t '=zzsig-m3'` → marker logged **`GOT SIGHUP`** | 1 | `129` | *(empty)* |
| `kill -TERM <pane_pid>` on a **trapping** marker → logged **`GOT SIGTERM`** | 1 | **`143`** | *(empty)* |
| `kill -TERM <pane_pid>` on an **untrapped** `sleep` | 1 | *(empty)* | **`term`** |

Two load-bearing facts:

1. **`tmux kill-session` delivers `SIGHUP`, never `SIGTERM`.** Every gmux path that ends a session funnels through `tmux.killSession()` (`src/main/tmux/sessions.ts:192`). A `claude` killed by gmux would therefore have recorded **129**, not 143. `143` structurally excludes gmux's kill path.
2. `pane_dead_status` is `WEXITSTATUS` **only**. A process that dies *by* a signal reports an **empty** status and puts the signal in `pane_dead_signal` — which gmux never reads.

---

## 4. Complete inventory of every signal gmux can send

`grep -rnE "SIGTERM|SIGKILL|process\.kill|\.kill\(|treeKill|pkill|killall|killpg" src/ scripts/` — the entire result:

| site | signal | target | reaches a pane? |
|---|---|---|---|
| `src/main/tmux/control-client.ts:172` (`stop()`) | **SIGTERM** | a `tmux -C` **control client** | no |
| `src/main/tmux/control-client.ts:292` (`handleDisconnect()`) | **SIGTERM** | same | no |
| `src/main/attach/attach-host.ts:336` (`detach()`) | SIGHUP (node-pty default; `process.kill(this.pid, …)`, positive pid) | a `tmux attach-session` **client** | no |
| `src/main/git/exec.ts:85` | SIGKILL | a `git` subprocess | no |
| `src/main/index.ts:237` | — | `tmux kill-server`, guarded by *zero live sessions*, `GMUX_SMOKE=basic` only | (SIGHUP if ever) |
| all `sessions.kill` → `tmux.killSession` | SIGHUP | the session | yes, but **HUP → 129** |

gmux emits `SIGTERM` at exactly **two** sites, and both target a tmux *client* process. **There is no code path in gmux that can deliver SIGTERM to an agent.** gmux also never learns a pane's pid — `grep -rn "pane_pid" src/` returns nothing — so it cannot target one even in principle.

---

## 5. Ranked mechanisms and repro results

Each row: mechanism exercised against live gmux-managed markers with attach PTYs open. "Survived" means the marker's trap log recorded **no signal at all**.

| # | mechanism | how exercised | marker outcome |
|---|---|---|---|
| **E5** | **normal app quit** (`app.quit` → `before-quit` → `shutdownGmuxCore`) | `window.gmux.quit()` | supervisor: `exited code=0` — **all survived** |
| **E4** | **dev restart: SIGTERM to Electron main** | `kill -TERM <main>` | Electron ran its quit path, `exited code=0` — **all survived**; control client + attach PTYs cleaned up, no leak |
| **E3** | **process-group SIGTERM** (`Ctrl-C` on `npm run dev`) | `kill -TERM -<pgid>` | whole app group died incl. control client; attach PTYs SIGHUP'd by pty-master close — **all survived** |
| **E6** | **hard crash, zero cleanup** | `kill -9 <main>` | supervisor: `KILLED BY SIGNAL 9` — **all survived** |
| **E8** | **electron-vite overlap**: second instance boots on the same userData, then the old one is SIGTERM'd | two instances, then `kill -TERM` old | **all survived**; new instance reconciled cleanly |
| **E1a** | **attach-PTY teardown** (what `detach()` does) | `kill -HUP <attach pty>` | **survived** |
| **E1b** | **attach-PTY *group* kill** | `kill -TERM -<attach pty pgid>` | **survived** |
| **E2** | **control-client kill** | `kill -TERM <control client>` | **survived**; client reconnected on backoff |
| **E7** | **stale manifest row / name collision** | see §6 | **survived** — but gmux killed *someone else's* session with **SIGHUP (129)** |
| **E9** | **external targeted kill** | `kill -TERM <pane_pid>` of a trapping marker | **`exitCode: 143`, "Session ended unexpectedly (exit 143)"** — the screenshot, exactly |

**Only E9 reproduces the symptom, and E9 is not something gmux does.**

An in-the-wild negative control landed mid-investigation: the user restarted `npm run dev` themselves at **17:15:38** (old pid 37630 → new 91294). All eleven of their sessions survived with zero dead panes.

---

## 6. Defect 1 (REPRODUCED) — reconcile binds manifest rows by mutable name, so gmux can kill a session it never created

gmux stamps a durable identity on every session it creates — `@gmux-id` (`src/main/ipc.ts:750`) and again on restore (`src/main/ipc.ts:357`). `getSessionOption` exists to read it back (`src/main/tmux/sessions.ts:295`) and **has zero callers**. Reconcile matches on name alone: `reconcile(tmuxSessionNames: readonly string[])` (`src/main/manifest/store.ts:531`).

Reproduction, start to finish:

1. gmux down. Rename its own session `$334` → `zzsig-gm2-orig`. It still carries `@gmux-id=8ca9fe32-…`.
2. Create a **foreign** session that takes the freed name `zzsig-gm2` (`$336`, no `@gmux-id`).
3. Boot gmux. Reconcile **adopts the foreign `$336`** as its `zzsig-gm2` row (status `idle`, i.e. live) and **disowns its real session**, logging `zzsig-gm2-orig` under *"live tmux sessions with no manifest row (ignored)"*.
4. Kill that row through the app: `window.gmux.sessions.kill('8ca9fe32-…')`.

Result — the wrong session died:

```
decoy ($336, FOREIGN):  17:20:16 GOT SIGHUP -> exit 129     ← destroyed
gm2   ($334, gmux's):   17:15:16 START …                    ← untouched, still running
```

Same latent bug on three targets computed identically: `const target = this.liveIds.get(sessionId) ?? rec.tmuxName;` at `src/main/ipc.ts:225`, `:550` (`reapDeadSession`) and `:823` (`killSession`). The `?? rec.tmuxName` fallback aims a `kill-session` at a **name**, which is mutable and reusable.

This is not the greg mechanism (SIGHUP → 129, not 143), but it is a real way for gmux to destroy work it does not own.

### Fix F1
- In `src/main/ipc.ts` `refresh()` (`:399-445`), after listing sessions, read `@gmux-id` per live session (`tmux.getSessionOption(info.sessionId, '@gmux-id')`, batchable via one `list-sessions -F '#{session_id} #{@gmux-id}'`) and bind `liveIds`/`byTmuxId` by **id**, falling back to name only when the option is absent.
- Change `manifest/store.ts:531` `reconcile()` to take `{tmuxName, gmuxId}` pairs and claim rows by `gmuxId` first.
- At `src/main/ipc.ts:225`, `:550`, `:823`: **delete the `?? rec.tmuxName` fallback.** If the session is not in `liveIds`, it is not ours — do not kill anything; flip the row to `restorable` instead.

---

## 7. Defect 2 (REPRODUCED) — a true signal death is recorded as no exit code at all

`pollSessionStatus` reads only `#{pane_dead_status}` (`src/main/ipc.ts:495`) and requires `/^\d+$/` (`src/main/ipc.ts:513`); `#{pane_dead_signal}` is never requested. Per §3, a process that dies *by* a signal has an **empty** `pane_dead_status`.

Measured on a gmux-managed session (`zzsig-gm3`, untrapped `sleep`, `kill -TERM`):

```
tmux:  dead=1  dead_status=[]  dead_signal=[term]
gmux:  {"name":"zzsig-gm3","status":"exited"}      ← NO exitCode field
```

Because `failedExit` requires `exitCode !== undefined` (`src/renderer/app/TerminalRegion.tsx:757-760`, mirrored at `src/renderer/app/split/SplitSurface.tsx:151`), the UI drops to the generic "exited" copy and **says nothing about the session having been killed**.

The asymmetry is the trap: `claude` traps `SIGTERM` and calls `exit(143)` itself, so gmux happens to show `exit 143`. Any agent that does *not* self-map — most binaries — vanishes with no explanation. The one incident that was diagnosable was diagnosable by luck.

Also note `resources/gmux-tmux.conf` sets `remain-on-exit failed`, which is what preserves the dead pane long enough to read either field — so the data is available today, gmux just doesn't ask for it.

### Fix F2 (the primary instrumentation deliverable)
- `src/main/ipc.ts:495` — add `\t#{pane_dead_signal}` to the poll format.
- `src/main/ipc.ts:508-518` — parse it; pass `deadSignal` into `reapDeadSession`.
- `src/main/ipc.ts:543-562` — persist it. Add a `exit_signal TEXT` column to the sessions table (`src/main/manifest/store.ts`) alongside `exit_code`, and write a durable audit line (timestamp, session id, tmux id, `pane_pid` if captured, `pane_dead_status`, `pane_dead_signal`) to a rotating `deaths.log` in userData. Today the manifest row is the only record and it is deleted on discard — the greg row had to be recovered from a freed SQLite page.
- `src/renderer/app/TerminalRegion.tsx:757` and `src/renderer/app/split/SplitSurface.tsx:151` — treat a recorded signal as a failed exit and name it: *"Session terminated by SIGTERM (external)"* rather than the ambiguous *"exit 143"*. `128+n` exit codes from self-mapping agents should be labelled the same way.

---

## 8. Standing hazard (LIVE ON THIS MACHINE) — gmux-launched agents are uniquely pattern-killable

gmux records and launches agents with an **absolute** `argv[0]` (asserted by the `GMUX_SMOKE=agent` harness at `src/main/index.ts:584-593`). That makes every gmux-launched agent the *only* process on the machine matching `pkill -f "$(command -v <agent>)"`.

Read-only demonstration, taken just now (no `pkill` was run):

```
$ command -v claude          →  /Users/gdc/.local/bin/claude
$ pgrep -fl "/Users/gdc/.local/bin/claude"
  99276 /Users/gdc/.local/bin/claude --session-id aa5fc3cd-a011-4ce1-ae96-5339b490f27f
```

Exactly one match — pid 99276, **PPID 3948**, i.e. the user's *current* gmux `claude-1` session. Four other claude processes were running at the same moment and every one was immune:

| process | argv as `ps` shows it | matched? |
|---|---|---|
| `claude-1` (gmux, durable) | `/Users/gdc/.local/bin/claude --session-id …` | **YES** |
| VS Code extension | `…/anthropic.claude-code-…/native-binary/claude …` | no |
| user's own shell agent | `claude --resume ecc455c7-…` | no |
| two more `claude --resume` | `claude --resume` | no |

The durable session — the one thing gmux exists to protect — is the single most killable claude on the box, and the ephemeral ones are safe. That is the product-shaped version of what happened to greg.

gmux also stamps **no marker env var** on agent panes (`src/main/ipc.ts:719,731` pass through `spec.env` only), so nothing distinguishes a durable agent from a disposable one to any observer.

### Fix F3
- Stamp `GMUX_SESSION_ID=<uuid>` and `GMUX_MANAGED=1` into the pane env at create (`src/main/ipc.ts:719`) — cheap, and it gives tooling and humans a positive signal.
- Stop putting the resolved absolute path in `argv[0]`. The absolute path exists to fix Bug A (agent not on tmux's PATH); that is already solved independently by injecting the login-shell PATH into the tmux server env (asserted at `src/main/index.ts:561-565`). Launch as the bare name with the absolute path available in the manifest for restore, so `pkill -f "$(command -v claude)"` cannot collaterally match a durable session. Keep the `GMUX_SMOKE=agent` assertion, but assert it against the manifest record rather than the launch argv.

### Fix F4 (cheap regression guards)
- Assert daemonization in the smoke suite: after `ensureServer()`, read `ps -o ppid=,sid=,pgid=` for the server pid and fail unless PPID is 1 and it is its own session leader. Today nothing would catch a future `spawn(..., {detached: false})` plus a group kill.
- Assert that no gmux process group ever contains a pane process.

---

## 9. Secondary hygiene issues observed

1. **Control-client leak across restarts.** Nine orphaned `tmux -C new-session -A -s gmux-control` clients (PPID 1) dating to Aug 9 22:15 are attached to the live server. My isolated runs did *not* leak (E4/E5 cleaned up correctly), so the leak needs the real `electron-vite dev` path to reproduce — likely a restart shape where `before-quit` does not complete. `child.kill()` at `control-client.ts:172,292` is the cleanup that is being missed.
2. **No socket or userData isolation between builds.** `TMUX_SOCKET` is the hardcoded constant `'gmux'` (`src/main/tmux/supervisor.ts:42`). At peak, four different builds — the user's dev tree, `release/mac-arm64/gmux.app`, and two agent scratchpad builds — were simultaneously attached to the user's live server. An isolated `--user-data-dir` build is **not** isolated where it matters. A `GMUX_TMUX_SOCKET` env override would make agent and CI work genuinely safe.
3. **Harnesses run against the live server.** `GMUX_SMOKE=basic` will `tmux kill-server` if it believes the server is empty (`src/main/index.ts:229-237`); `cleanupT3Leftovers` (`:383-398`) kills raw tmux sessions by name prefix; `src/renderer/editor/shot-hook.ts:600` kills sessions. All of these inherit the hardcoded socket.
4. **Hung PATH probes.** Orphaned `zsh -lic printf '__GMUX_PATH__…'` processes (PPID 1) persist after `execFile`'s timeout fires at `src/main/tmux/resolve.ts:144` — the timeout kills the wrapper, not the shell.

---

## 10. What would make the next occurrence diagnosable in one minute

Currently: the exit code is the only recorded artefact, it cannot express a signal, and it is deleted when the row is discarded. Ship F2 and the next incident answers itself:

- `exit_signal` persisted next to `exit_code`, so signal deaths are distinguishable from exits;
- an append-only `deaths.log` in userData: `timestamp, session id, tmux session id, tmux name, agent, pane_pid, pane_dead_status, pane_dead_signal, last_seen` — surviving discard;
- `pane_pid` captured at create (one `#{pane_pid}` in the existing `new-session -P -F`), so a post-mortem can correlate against `ps` history and other agents' transcripts;
- the UI naming the signal, so the user reports *"terminated by SIGTERM"* instead of *"exit 143"*.

---

## 11. Safety ledger

**Before** — 9 sessions: `gmux-control, pi-1, pi1, qwen-1, shell-1, shell-1-2, test1, zz-probe-one, zz-probe-two` (the last two belong to a sibling agent and were never touched).

**After** — 11 sessions, zero dead panes:
```
$335 claude-1     $1  gmux-control  $202 pi-1      $150 pi1    $152 qwen-1
$148 shell-1      $222 shell-1-2    $337 shell-2   $23 test1
$323 zz-probe-one $324 zz-probe-two
```
`claude-1` and `shell-2` are the user's own, created during the investigation. Every baseline session is present and healthy.

Created and destroyed by me: `zzsig-m1/m2/m3`, `zzsig-gm1/gm2/gm3`, `zzsig-untrapped`, `zzsig-gm2` (decoy) — **zero remain** (`tmux ls | grep -c zzsig` → 0, `pgrep -fl zzsig` → empty). Six isolated Electron instances launched under scratchpad `--user-data-dir`, all terminated. `tmux kill-server`, `kill-session` against a session I did not create, `pkill` and `killall` were never run. The user's server 3948 and their `npm run dev` instance were never signalled; their instance change at 17:15:38 was their own restart.
