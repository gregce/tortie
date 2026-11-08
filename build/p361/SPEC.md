# Phase 361 — two test tools that lose a verdict or leave processes behind: a gate's last lines dropped through a pipe, and the fault battery's leftover tmux pair — SPEC

Written by the spec step on 2026-11-06 in `/private/var/tmp/tortie-wt/wt-p361`, a detached worktree at origin/main
`d87d414c` ("docs(backlog): drop 357.1's timer-path part under the no-regression rule"). **`git diff d87d414c` in the
worktree must be exactly Phase 361's delta**, this file included. Nobody here rebases, pulls or merges; the main session
moves the tree at landing. The charter is `docs/BACKLOG.md` "## Phase 361" (`:44871-44976`), bound as written except
where §0.1 says the tree or a measurement wins. Its sources are `build/p357/SPEC.md` "Found here, not this phase's"
items 1 (`:748-754`) and 4 (`:763-773`), the measurements at `:720-723` and `:733-734` and the run set-up at
`:688-701`. Phase 357.1 is paused on his ruling (its worktree `wt-p3571` holds work that is not on main) and no 357.1
run is in flight, so this phase may run and edit `build/fault-harness.mjs`. His standing rulings bind: no regression
against today; just enough words; nothing released, tagged, version-bumped, archived or uploaded; his session count is
allowed, being `build/electron-run.mjs`'s read-only `list-sessions` of `-L gmux` and nothing else.

| | |
| --- | --- |
| Subject | `fix(build): keep every gate's verdict and end the fault battery's tmux pair` (the entry's) |
| First body line | `Phase 361: a gate's verdict reaches its reader and the fault battery ends its tmux pair` |
| Semver | None a person meets: no CHANGELOG item (the entry). Nothing that ships changes |
| Lane | Build: Spec → Build (FOUR builders, disjoint files) → Integrate → Verify (Tier 2) → [Fix once → Reverify] → Commit |
| Tier | **2**: invisible to a person (`CLAUDE.md:272`), so the gates are the evidence and every verifier re-derives; at least one independent method, an attack (§9). The two risks: a teardown that signals a process it did not start, and a cure that reads a red arm as green |
| The cure (a) | One runner, `build/gate-run.mjs`, hands a gate two FILES and reads them after it exits. The 23 harnesses run their gates through it. A reading whose gate died, timed out, never started or wrote more than 64 MiB is UNREADABLE with why. `gate:checks` clause 9 pins it, and `gate:gaterun` drives it |
| The cure (b) | One function, `endScratchServer` in `build/scratch-tmux.mjs`, ends a scratch tmux server and proves it gone. It reads the server's pid and its clients from the server, asks it to stop, ends each client it still holds by pid, and removes the socket only after the server has gone. It runs in a `finally` per fault case and in `build/electron-run.mjs`'s step 6. The battery counts its own sockets' processes once at its end and fails on any |
| Menus | **No change.** Nothing a person sees moves |
| Contract | **No change** (`docs/audits/contract-baseline.txt` does not move): no channel, schema, `gmux.*` key, `GMUX_*` name or smoke mode |
| `HELPER_USER_FLOOR` | **Unchanged at 181** (`build/assert-electron-teardown.mjs:584`): no new script reaches `build/electron-run.mjs` |
| CHANGELOG | **None** |

## 0. The hard rules, stated once (every builder, the integrator, every verifier, the fixer and the reverifier)

- NEVER commit, stage or stash. `/Users/gdc/gmux` is read only (`git clone --local` from it is reading). Never touch
  `/private/var/tmp/tortie-wt/wt-p3571*`, `wt-p353*` or `scratch/owed-p362`. Scratch lives under
  `/private/var/tmp/tortie-wt/scratch/p361/<role>/`, never under `/private/tmp`, which macOS cleans; a scratch clone for
  an ablation goes there too, never inside a checkout.
- **The built parent is kept for you**: `/private/var/tmp/tortie-wt/wt-p361-parent` is `d87d414c` (a `git clone --local`
  of `/Users/gdc/gmux`, `node_modules` and `build/vendor` by `cp -Rc` from the worktree, `npm run build` under the history
  block, 50 s, exit 0). Never edit it; a parent of your own goes under `/private/var/tmp/tortie-wt/wt-p361-parent-<role>`.
  Run any harness of the parent in a `cp -Rc` clone of it (several harnesses write their gate's files IN PLACE and
  restore them: `build/p273/ablation-vocabulary.mjs:60-83`, `build/p274/ablation.mjs` header).
- **His shell history is never written by us.** Every command that does not launch an Electron or start `/bin/ps` runs
  under `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb`. **The exception, measured and stated**:
  `sandbox-exec` refuses `/bin/ps` (`execvp() of '/bin/ps' failed: Operation not permitted`, exit 71), while `lsof`
  and `pgrep` start inside it. So the fault battery (Electron), `conformance:scratchtmux` and any plant or count that
  reads the process table run OUTSIDE the block, the way 357's integrator ran the battery: `HOME` and `ZDOTDIR` a
  scratch folder of yours, `HISTFILE=/dev/null`, `SHELL=/bin/sh` for a plant's own tmux server, and `TERM_SESSION_ID`,
  `TERM_PROGRAM`, `TERM_PROGRAM_VERSION`, `TMUX`, `TMUX_PANE`, `GMUX_SESSION_ID`, `GMUX_MANAGED`, every `CSC_*` and
  `APPLE_*`, `GH_TOKEN` and `GITHUB_TOKEN` unset, `CSC_IDENTITY_AUTO_DISCOVERY=false`. **An agent here runs inside his
  Tortie, so `TMUX` names his live server**: a child that inherits it and runs a bare `tmux` command reaches `-L gmux`.
  Unset it, every time. The four `/bin/ps` native vitest tests still fail inside the block by design; never run THEM
  outside it. Record only `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before and after every run that starts a
  shell or the app (`743166 1793987027` and `23166 1790702242` at the start of this phase, and after every run of the
  spec step). A move across a blocked command is his own terminal. A move across an unblocked run means start nothing
  for 3 minutes and stat again: moved again is his; still moved means STOP and report.
- `-L gmux` is named only by `build/electron-run.mjs`'s census, and only with `list-sessions`.
  `build/fault-harness.mjs` refuses it by name (`:100`, `:408`) and keeps refusing it; `build/scratch-tmux.mjs`
  refuses `gmux`, `default` and any name not starting `gmux-` before it runs anything.
- Never `pkill`, `killall`, a `pgrep` pattern or a negative pid. End only pids you started, or that a launch you started
  left (proved by a command line naming YOUR scratch socket), each read again by `ps -p <pid> -o command=` right before
  the signal. Never signal a runner while its own teardown runs. Do not stop his Tortie (a bare `Tortie`, pid 692 today),
  his tmux server (`/Applications/Tortie.app/Contents/Resources/bin/tmux -L gmux … start-server`, pid 6057 today, ppid 1:
  the same SHAPE as the leftover server, so a by-shape search would find it) or his other sessions' processes. **His
  Tortie has the same bundle id as every build you run**: never send an Apple Event, run `osascript`, `open` an app, or
  quit or signal anything by name or bundle id.
- Never open, copy or read his live Tortie profile, his keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`,
  `~/.codex` or any agent's or conversation store. Count `/Users/gdc/Library/Logs/DiagnosticReports` (and `Retired/`) by
  NAME and mtime only, before and after every Electron run, with the absolute path (`~` is the scratch home under the
  scratch environment); never open one; name any new one. No real Tailscale, DNS, APNs or ssh; never `smoke:remote` or
  `smoke:machines`. No Simulator, no `test:ios`, no real agent, not even for a version. Never import a `build/` script to
  inspect it; read it as text (running one, or its `--self-test`, is fine).
- Every Electron goes through `build/electron-run.mjs`. The one runner here that launches the app outside
  `build/harness-socket.mjs` is the fault battery, `node build/fault-harness.mjs` (after `npm run build` in the same
  tree), on its own `gmux-fault-<pid>-<n>` sockets, ONLY under a lock slot: `zsh /private/tmp/tortie-ops/lock.sh try
  p361-<role>` (prints the slot or exits 1; retry every 60 s in a NEW command), released with `zsh
  /private/tmp/tortie-ops/lock.sh release <slot>` from a `trap`. No `smoke`, `smoke:t1`, `smoke:t3`, `package` or another
  phase's probe. `df -h /` before any build or clone; under 8 GB free, wait and report (50 GB free at the spec step's last
  reading).
- Every process you start ends in a `finally`, by pid: a slow reader, a planted parent, a wedged server, a decoy, a load
  generator. Count once at the end: Electrons with CLAUDE.md's command, and every process whose command line names a
  `gmux-fault-`, `gmux-p361-` or other scratch socket of yours (`ps -Ao pid,ppid,command`). A leftover the fault
  battery's own launches made is THE DEFECT this phase measures: record its pid, ppid and command line, end it by pid
  after reading the command line again (the client first, then the server), and say so.

## 0.1 What the entry got wrong or left open at this tree (the tree and the measurements win; each item binds)

1. **The gate count is 61, not 59, and 59 of them call `process.exit(`, not 57.** The gate scripts are every `node
   build/….mjs` behind a `conformance:*` or `gate:*` name (57 files; four names run something else:
   `conformance:remoteclose` is vitest, `conformance:resume` and its two variants are an npm chain) plus the four that
   `npm run build` alone runs. Read with the TypeScript parser (§2.2): 59 hold 144 `process.exit(` calls, and every one
   of the 59 has a call whose argument is not the literal `0`, so each can end a red verdict that way; 2 set
   `process.exitCode` only (`build/assert-arm64-only.mjs`, `build/stapler.mjs`, as the entry says). The entry's two
   missing files are not identifiable from its text; §2.2 lists all 61 with their call counts so a verifier can
   compare.
2. **17 gates are run through a pipe, not 18.** `ablation:p326` copies `build/assert-bundle-refusals.mjs` into its clone
   because `conformance:farattach`'s rule FA10 reads that file as text (`build/p326/ablation.mjs:367`) and runs only
   `conformance-farattach.mjs` (`:375`). Measured: the instrument (§2.4) saw p326 run that gate three times and nothing
   else. Every other row of the entry's table is right, and so is "23 harnesses, none of which sets `stdio`".
3. **The pipe is a UNIX socketpair of 64 KiB, and today only `conformance:pocket` is larger.** libuv hands a
   `spawnSync` child a socketpair whose `SO_SNDBUF` and `SO_RCVBUF` read 65,536 from inside the child; with nobody
   reading, it holds 65,500 bytes of 100-byte writes (§2.3). Output beyond that is queued inside the gate's Node and
   dropped by its `process.exit`. `conformance-pocket.mjs` writes 91,239 bytes green and 91,382 red under the harness's
   `P313_NO_SELF_TEST=1` (102,440 bytes green as `npm run conformance:pocket` runs it). Every other piped gate's red
   output is at most 42,917 bytes (the hostile client), so under a slow reader it loses nothing TODAY; its margin is the
   gap to 65,536 (machines 38,890 green, ios 38,488). Which gates "can lose lines" is therefore one gate now and any gate
   that grows past 64 KiB later.
4. **"Its last line did not arrive" has no per-gate pattern to test.** Six of the 17 end a RED run on a finding line,
   not a closing summary (conformance-agents, -machines, -handback, -shellenv, the hostile client, known-hosts: §2.4's
   last-line table). And with files nothing the gate wrote can be lost: a file write is synchronous in Node, and the
   runner reads the file after the exit. So the last line fails to arrive only when the gate did not finish: it ended by
   a signal, timed out, could not start, or wrote more than the runner reads. That is the UNREADABLE test (D2).
5. **The server does not list the client it is holding.** After the client's parent dies, `list-clients` answers
   nothing in every plant (§2.7), while the client process stays alive with its standard input, output and error
   all unconnected (`unix ->(none)`). tmux's `list-clients` skips a client whose session is gone
   (`cmd-list-clients.c:85-86`, the vendored
   3.7b source). So "reads every client's pid from that server" is done through the server's own socket: the processes
   connected to it (D9). `list-clients` alone would find nothing to end.
6. **Why a pair is left at all is tmux's, and it is now known from the source and measured.** tmux releases a control
   client only once it has written every line it holds for that client (`control_all_done`, `control.c:584-592`, asked
   by `server_client_check_exit`, `server-client.c:1909-1925`). A line it tries to write after the client's reader died
   fails, stays held, and the client is never told to exit. A server asked to stop waits for its client list to empty
   before it exits (`server.c:262-306`), so `kill-server` returns 0 and the server stays. The server debug log of one
   plant shows the write: `control_vwrite: client-74878: writing line: %window-renamed @1 zsh` within 10 ms of the
   death, and no exit for that client afterwards. Measured on the plant: the held server ignores `kill-server` (every
   plant) and SIGTERM (2 of 2). Once the client is ended it leaves within 100 ms (every plant). SIGKILL to the server also
   releases the client within 100 ms (2 of 2). The entry's order, client first, is kept (D10).
7. **Which kills leave a pair is timing, and the parent did not leave one today.** At this tree the battery left NO pair
   in 9 runs and 54 killed cases (§2.6): the four backup points five times (three with Homebrew's 3.6a first on PATH,
   two with the vendored 3.7b first, as 357 ran it), twice more with a made-up `TMUX` inherited, the whole battery once,
   and seven points under 30 busy loops (load 16 rising to 118). 357's integrator read 8 after a full battery and 2, 0, 2
   and 1 of 4 on the backup points, at a load near 35 to 40 while Phases 353 and 358 ran. So whether a battery case
   leaves a pair depends on whether tmux tries to write a line to the work launch's control client between the app's
   death and tmux's own exit handling. The condition that made 357's runs do it is not reproduced here, so why it hit
   the backup points is not known. The design does not depend on it: the teardown proves the server gone whatever left
   it. The proof of (b) is therefore the PLANTED pair, which is deterministic: a stalled reader asked for more output
   than its socket holds, then SIGKILLed, left the pair 13 of 13 times (§2.7).
8. **Candidate (5) is not the escape on this Mac, and is still a hole.** Homebrew's 3.6a, first on his PATH, reaches the
   vendored 3.7b server: `display-message` exits 0 with the socket path and `kill-server` ends it (§2.8). But
   `killServer` hides every failure (`.catch(() => '')`, `.catch(() => undefined)`, `build/fault-harness.mjs:414-423`):
   a PATH with no tmux, or one whose protocol the server refuses, ends nothing and the case passes. The new function
   reaches the server through the app's own order and fails the case when it cannot.
9. **Candidate (6) is real.** `build/electron-run.mjs`'s step 6 command byte for byte (`spawnSync('tmux', ['-L', socket,
   'kill-server'], { stdio: 'ignore' })`, `:1166`, and `:1216` in `teardownSync`) against the planted pair: exit 0, the
   server still running 3 s later, its socket file kept, 2 of 2. A probe that names `tmuxSocket` and whose app dies by
   SIGKILL can leave the pair, and 131 files under `build/` name `tmuxSocket`.
10. **The fault battery's own report is 145,014 bytes.** It prints every case's JSON and then calls `process.exit`
    (`:739`, `:744`), so read through a pipe its PASS line can be lost; its exit status cannot. Not this phase (§11, Q1).
11. **Citations at this tree.** `killServer` `build/fault-harness.mjs:407-428`, called once per case at `:457` outside any
    `finally`; `runCase` `:434-500`; `main` `:617-740`; `runApp` `:233-334` (no `tmuxSocket`, `:257-264`). The helper's
    `teardown` `build/electron-run.mjs:1106-1178` with step 6 at `:1164-1169`, `teardownSync` `:1186-1222` with step 6 at
    `:1215-1219`, `withElectron`'s `finally` `:1580-1622`. `ablation:p313`'s gate call `build/ablation-p313.mjs:9145-9151`
    in `runChecks` (`:9139-9172`), its verdict `:9282-9304`. `conformance-pocket.mjs`'s exits `:20048-20071`. The app's
    development tmux order: `VENDORED_TMUX_RELATIVE_PATH` `src/main/tmux/resolve.ts:1392`, `resolveTmux` `:1445`, the
    three install folders `:1567-1569`, `GMUX_TMUX_BIN` in front of them (the comment above `:1445`).

## 1. The answer first

| # | What | One line |
| --- | --- | --- |
| a1 | The runner | `build/gate-run.mjs` exports `gateRun(script, args, { cwd, env, timeout })`: `spawnSync(process.execPath, …)` with `stdio: ['ignore', <file>, <file>]`, both files read after the exit, its scratch folder removed in a `finally`. It answers spawnSync's fields plus `readable` and `why` |
| a2 | UNREADABLE | A reading is readable when the gate started, ended by an exit status, did not time out and wrote at most 64 MiB. Anything else is UNREADABLE with why, in every harness: never green, never red on a rule or "nothing numbered", and the run cannot PASS (exit 2 when that is its only problem) |
| a3 | The harnesses | The 24 gate call sites in the 23 harnesses go through `gateRun`, cwd, env and timeout unchanged. `ablation:p313`'s CHECKS loop goes through it whole. The 11 node children that are not gates (vitest, the harness itself, `vectors.mjs`) stay |
| a4 | The pin | `gate:checks` clause 9, read with the TypeScript parser: the runner hands two files, and no file behind `ablation:*` that names a gate runs a node child that could be a gate except through the runner (floor 23). Its reader is proved on fixtures, with in-memory ablations. `gate:gaterun` (`node build/gate-run.mjs --self-test`) drives the runner. Both run inside `npm run build` |
| b1 | The teardown | `endScratchServer(socket, { candidates })` in `build/scratch-tmux.mjs` (sync). It reaches the server through the app's own tmux order, then uses the server's own binary. It reads the pid, the clients the server lists, and the clients it holds (connected to its socket, no longer listed). Then `kill-server` and a 2 s bound. Each held client is ended by pid (SIGTERM, then SIGKILL), its command line read again first, then the server is waited for. The socket is removed only after the server's pid has gone. The verdict names what is left |
| b2 | The battery | Each case ends its socket through it in a `finally`. A server not proved gone fails the case. `main` counts once, in a `finally`, every process naming `-L gmux-fault-<its pid>-<n>`, and fails on any, without signalling it. The two `-L gmux` refusals stay |
| b3 | Step 6 | `build/electron-run.mjs`'s step 6 (both teardowns) calls the same function. A failed verdict is thrown after the census when the body returned and printed otherwise, as the census is |
| b4 | The proof of (b) | `conformance:scratchtmux` (`node build/scratch-tmux.mjs --self-test`) drives the function over the deterministic planted pair, two decoys, a tmux that cannot reach the server, refused names, no server, and a live client. It has in-memory ablations, and text rules over the battery and the helper |

### 1.1 The decisions, each with its reason

| Id | Decision | Reason (where it comes from) |
| --- | --- | --- |
| D1 | **The cure for (a) lives on the harness side**: one shared runner that gives a gate a file for stdout and one for stderr and reads them after the exit | Entry mechanism (a)1, decided with the numbers. (1) The loss is the reader's transport (§2.3). A file write is synchronous in Node: through files, all 17 harness runs read every arm on its own rule (§2.4, §2.5), and the toy lost 0 of 100,023. (2) It edits no gate. 59 gates hold 144 `process.exit(` calls, and swapping each for a flush that returns lets the code after it run on (a FAIL branch's `process.exit(1)` followed by the PASS print), which is the "cure that reads a red arm as green" the entry warns of. (3) Gates move far more often than harnesses. Since 2026-08-08, 144 commits touched one of the 17 piped gates (`conformance-machines.mjs` alone 60) and 59 touched one of the 23 harnesses. In the last 14 days the numbers are 9 and 3. (4) Only the reader can say UNREADABLE |
| D2 | **Readable** = `error` undefined, `signal` null, `status` an integer, and at most `GATE_RUN_CAP_BYTES` (64 MiB) written across both files | §0.1 item 4: with files, the only ways the last line fails to arrive are death, timeout, failure to start and a cap. No per-gate pattern: six gates end a red run on a finding line |
| D3 | **UNREADABLE in every harness**: a reading the runner calls unreadable (base, arm, control, freeze or restore) reads `UNREADABLE: <why>` and nothing else. A run holding one cannot PASS. It exits 2 when unreadable readings are its only problems, and 1 when anything else is wrong too | Entry mechanism (a)2 ("never red on nothing"). Exit 2 is the house's UNREADABLE (probes); 1 stays FAIL |
| D4 | **The cap is 64 MiB**, a constant, with no option to raise it | The largest `maxBuffer` of the 23 today (most pass 64 MiB; three pass none, which is 1 MiB; three 16 MiB; one 32 MiB, §3). No harness reads less than it does today |
| D5 | **Only gate calls move.** The 24 call sites (in 23 files) that run one of the 61 gate scripts go through `gateRun`, cwd, env and timeout exactly as now, `encoding` and `maxBuffer` dropped. The 11 node children that run vitest (with a JSON report file), the harness's own file (`p307`'s `--read-background`) or `build/p316/vectors.mjs` stay as they are | Smallest change: those 11 read a report file or an exit status, and none is a gate (§2.2). p313's CHECKS loop is one call site whose argv comes from a table, so it moves whole, vitest checks included |
| D6 | **The pin is `gate:checks` clause 9**, read with the TypeScript parser, its reader proved on fixtures, plus in-memory ablations of the shipping texts. **`gate:gaterun`** drives the runner. Both run inside `npm run build` | Entry mechanism (a)3. `gate:checks` already holds how a check script is spawned (clauses 1 and 4) and cannot be skipped by anything that builds; the stapler self-test is the precedent for a driven self-test inside the build |
| D7 | **The pin's scope is the files behind `ablation:*` that name a gate script in a string literal**: 23 today, a floor of 23. A file in scope may run a node child only through `gateRun`, unless the child's script resolves to a file that is not a gate | The entry's "no harness reads a gate's verdict through a pipe". The scope is derived from `package.json` and the gate set, never listed. The four other readers of a gate (`conformance-evidence.mjs:485` and `conformance-semantic.mjs:1308` read `assert-electron-teardown.mjs --list`, 4,081 bytes; `conformance-facts.mjs:1369` reads `conformance-watcher`'s exit status; `build/p300/probe-p300.mjs:486` reads one line of `conformance-overview --real`) are outside it, stated in §11: none reads a verdict through more than 4 KB and none can read red as green |
| D8 | **(b) is one function, and step 6 calls it** (the entry's first placement: yes) | §0.1 item 9: step 6 sends the same unchecked kill, and it left the planted pair 2 of 2. One place now ends a scratch server, and the fault battery and 131 probe files that name `tmuxSocket` get the same proof |
| D9 | **Clients are read from the server two ways**: the ones it lists (`list-clients -F '#{client_pid}'`), and the ones it holds. A held client is a process whose command line holds the tokens `-L <socket>` and that holds a UNIX socket connected to one of the server's own sockets bound to that socket's path (`lsof -a -p <pid> -U`: the candidate's NAME is `->` plus the server socket's DEVICE address). A process naming the socket and not connected is never signalled | §0.1 item 5. Measured on every plant: the held client's own socket (fd 5) reads `->0xa98998802ca5f0b`, the address of the server's listening socket, while its fds 0, 1 and 2 read `->(none)`. `lsof` of one pid costs 40 to 50 ms and the process table 40 to 50 ms (997 processes) |
| D10 | **The order**: read; `kill-server`; wait at most 2,000 ms for the server's pid. Then each held or listed client still alive: read its command line again (it must hold `-L <socket>`), SIGTERM, wait 2,000 ms; read again, SIGKILL, wait 1,000 ms. Then wait 2,000 ms for the server. Only then the server itself: read its command line again, SIGKILL, wait 1,000 ms | §0.1 item 6. On every plant that left on its own the server was gone within 100 ms of `kill-server` or of its client's end, so 2,000 ms is 20 times the measurement. The client is ended before the server, as the entry and its Method 2 say |
| D11 | **The tmux the app ran**: reach the server through the development app's own order (`GMUX_TMUX_BIN` when it names an executable file, the checkout's `build/vendor/tmux/bin/tmux`, `/opt/homebrew/bin/tmux`, `/usr/local/bin/tmux`, `/usr/bin/tmux`, then `tmux` on PATH; a packaged launch's own `Contents/Resources/bin/tmux` first). Once reached, use the server's own executable (`ps -p <pid> -o comm=`) for every later command | Entry (b)1 ("using the copy of tmux the app ran") and candidate (5). The app's order is `src/main/tmux/resolve.ts` (§0.1 item 11). The server's own binary removes any drift between that order and the copy cited here |
| D12 | **A held client the teardown ended is a note, not a failure.** The case fails when anything it named is left, when no tmux reached the server, or when the server outlived its clients and needed SIGKILL | The entry: "fails the case when anything it named is left". The held pair is tmux waiting to write to a reader the case's own SIGKILL removed. Q2 offers him the stricter rule |
| D13 | **The battery's count is a count.** Once, at the end of `main`, in a `finally`: every process whose command line holds `-L` and a token matching `^gmux-fault-<this pid>-\d+$`, printed with pid, ppid and command line. Any one fails the battery. Nothing is signalled | Entry (b)2, and its refusal "No kill by name or pattern". By then every case has ended its own server from pids the server gave, so anything counted is a teardown that failed, and it should be loud |
| D14 | **`build/background-fixtures.mjs` does not move** | CLAUDE.md's second obligation covers a shape that walks past `gate:background`'s rule. The pair is started by the app, not by a script under `build/` (entry (b)7), so it does not. The new self-test's own starts (a planted parent, decoys, its tmux servers) are held to `gate:background` as written |
| D15 | **`conformance:scratchtmux` is the driven proof of (b)**, classified a tmux harness, NOT inside `npm run build` (it starts tmux servers) | Every rule a builder adds has a test or an ablation that goes red when it is removed (the brief) |
| D16 | Four builders on disjoint files: `runner`, `harness-a`, `harness-b`, `pair` (§8) | 23 harness edits split in two, so the two halves build at once against one stated seam |

## 2. What the spec step measured, how, and the numbers

Instruments, logs and the clone are under `/private/var/tmp/tortie-wt/scratch/p361/spec/` (`a/` for the pipe, `b/` for
the pair, `logs/`, `clone/` a `cp -Rc` of the built parent whose ten harnesses that hard-code `/private/tmp` for their
scratch were pointed at `TMPDIR` by one `sed` each, nothing else changed). They stay there for the verifier. History read
`743166 1793987027` and `23166 1790702242` before and after every run. No new crash report (97 names and mtimes, equal
before and after). Machine: 12 cores, 48 GB, macOS 24.6.0, node v22.23.1, the vendored tmux 3.7b, Homebrew's 3.6a first
on PATH.

### 2.1 The parent

`git clone --local --no-checkout /Users/gdc/gmux wt-p361-parent`, `checkout --detach d87d414c`, `cp -Rc` of
`node_modules` and `build/vendor` from the worktree, `npm run build` under the history block: exit 0 in 50 s,
`contract-inventory: OK`, `conformance:harnessprobes` PASS over 689 files, the stapler self-test 31 answers and 28
ablations.

### 2.2 M1: the gates and their readers, counted (`a/gates.mjs`, `a/exits.mjs`, `a/harness-scope.mjs`)

- **61 gate scripts.** The four build-only ones are `assert-bundle-refusals.mjs`, `assert-preview-containment.mjs`,
  `assert-probe-containment.mjs` and `assert-css-order.mjs`. The 57 behind names are every `node build/….mjs` of a
  `conformance:*` or `gate:*` script. Each with its `process.exit(` count (under `build/`): `conformance-runtime.mjs` 1,
  `conformance-agents.mjs` 3, `conformance-harnessprobes.mjs` 3, `conformance-machines.mjs` 4,
  `conformance-farattach.mjs` 3, `conformance-installs.mjs` 3, `conformance-context.mjs` 3, `conformance-overview.mjs`
  6, `p293/conformance-manager.mjs` 3, `conformance-redline.mjs` 4, `conformance-redline-write.mjs` 3,
  `conformance-save.mjs` 2, `conformance-pathdoors.mjs` 2, `conformance-containment.mjs` 3,
  `p274/conformance-samefolder.mjs` 2, `conformance-shellenv.mjs` 1, `conformance-filehistory.mjs` 1,
  `conformance-historysearch.mjs` 1, `conformance-logins.mjs` 1, `conformance-credentials.mjs` 3,
  `conformance-watcher.mjs` 2, `conformance-derived.mjs` 1, `conformance-arch.mjs` 3, `conformance-reading.mjs` 1,
  `conformance-facts.mjs` 1, `conformance-evidence.mjs` 1, `conformance-semantic.mjs` 1, `conformance-arch-modules.mjs`
  3, `p248/assert-wide-blocks.mjs` 2, `p255/assert-preview-window.mjs` 2, `conformance-hue.mjs` 1, `fsevents-cap.mjs` 3,
  `conformance-handback.mjs` 3, `p311/copy-drift.mjs` 1, `conformance-choices.mjs` 2, `conformance-pocket.mjs` 4,
  `p313/hostile-client.mjs` 3, `conformance-push.mjs` 3, `conformance-endtree.mjs` 3, `conformance-stopped-list.mjs` 2,
  `conformance-ios.mjs` 1, `probe-specstory-entitlement.mjs` 1, `tmux-pair.mjs` 2 and one `exitCode`,
  `assert-electron-teardown.mjs` 1, `assert-background-teardown.mjs` 1, `assert-simulator-teardown.mjs` 1,
  `assert-docker-teardown.mjs` 1, `assert-cache-policy-never-deletes.mjs` 1, `assert-known-hosts-scoped.mjs` 1,
  `assert-tab-floor.mjs` 1, `assert-hermetic-checks.mjs` 1, `contract-inventory.mjs` 3, `assert-door-only-adds.mjs` 17,
  `assert-menu-glyphs.mjs` 3, `assert-menu-accelerators.mjs` 2, `assert-arm64-only.mjs` 0 and two `exitCode`,
  `stapler.mjs` 0 and two `exitCode`, `assert-bundle-refusals.mjs` 6, `assert-preview-containment.mjs` 2,
  `assert-probe-containment.mjs` 3, `assert-css-order.mjs` 2.
- **`process.exit(`, read with the TypeScript parser**: 59 files, 144 calls, every one of the 59 with a call whose
  argument is not the literal 0. `process.exitCode` only: `assert-arm64-only.mjs` and `stapler.mjs`. `tmux-pair.mjs`
  does both (two calls and one assignment).
- **The harness scope, read with the TypeScript parser**: of the 27 files behind `ablation:*`, 23 name a gate script in a
  string literal and 4 do not (`p300`, `p306`, `p321`, `p344`, vitest only). The 23 hold 35 node-child calls: 24 run a
  gate and 11 run something else. Those 11 are vitest at `p275:547`, `p312:105`, `p3201:1734`, `p331:597`, `p323:680`,
  `p326:387`, `p336:656`, `p342:652` and `p343:849`, the harness itself at `p307:512`, and `build/p316/vectors.mjs` at
  `p33311:891`.
- **The 17 gates run through a pipe, and by whom**: the entry's table less `assert-bundle-refusals.mjs` (§0.1 item 2).
- **Other readers of a gate's text** (outside the pin, D7): `conformance-evidence.mjs:485` and
  `conformance-semantic.mjs:1308` read `assert-electron-teardown.mjs --list` (181 lines, 4,081 bytes, measured).
  `conformance-facts.mjs:1369` reads `conformance-watcher.mjs`'s exit status (its output is 3,919 bytes).
  `build/p300/probe-p300.mjs:486` reads one line of `conformance-overview --real` (a probe).
- **How often each side moves** (`git log --since=2026-08-08`, 2,042 commits): one of the 61 gates 367 commits, one of
  the 17 piped gates 144, one of the 23 harnesses 59. Most: `conformance-machines.mjs` 60, `assert-bundle-refusals.mjs`
  37, `conformance-ios.mjs` 21, `conformance-pocket.mjs` 20; `ablation-p313.mjs` 20, `p316/ablation-ios.mjs` 20. Since
  2026-10-23: 33 commits, 9 touching a gate and 3 a harness.

### 2.3 M2: the transport (`a/bin/slowread.mjs`, `a/bin/slowsock.py`, a toy gate)

| Reading | Number |
| --- | --- |
| A `spawnSync` child's fd 1 (`fstat` from Python inside the child) | a socket, `SO_SNDBUF` 65,536, `SO_RCVBUF` 65,536 |
| A UNIX socketpair at those sizes, nobody reading, 100-byte writes | 65,500 bytes |
| The same at the macOS defaults (`net.local.stream.sendspace` and `recvspace` 8,192) | 8,100 bytes |
| `pipe(2)` | 65,500 bytes (100-byte writes), 65,536 (64 KiB writes) |
| The toy, 100,000 bytes then `process.exit(1)`: to a file / through `spawnSync` unloaded / through the slow socketpair | 100,023 / 100,023 / 65,500, and the slow reader's verdict "red on nothing" |
| The toy at 50,000 and 64,000 bytes through the slow socketpair | all of it (50,023, 64,023) |
| The toy at 66,000, 70,000 and 200,000 bytes through the slow socketpair | 65,500 each |
| `process.exitCode = 1` and return, 200,000 bytes, slow socketpair | 200,023 of 200,023 |
| Exit once two empty writes' callbacks fire, with a live `setInterval`, 200,000 bytes, slow socketpair | 200,023 of 200,023 |

The slow reader (`slowsock.py`) is a socketpair at libuv's 64 KiB, read at most 4,096 bytes every 20 ms per stream. The
preload `a/bin/p361-preload.mjs`, loaded with `node --import` into a harness, routes that harness's `spawnSync` of a gate
through one of three transports and leaves every other `spawnSync` alone, so the HARNESS's own reading code reads the
result. The modes: `log` is today's pipes, `slow` is the slow socketpair, `file` is two files read after the exit (D1's
cure). A call that already names its own `stdio` (the runner's) is passed through untouched and logged as `passed`, so
the verifier can run it at HEAD.

### 2.4 M3: one red arm per gate, through its own harness, slow then file (`a/bin/batch.sh`, `a/summarize2.mjs`)

| Harness (arm) | Gate | Gate runs | Largest output (red) | Slow: tail lost | Harness, slow / file |
| --- | --- | --- | --- | --- | --- |
| p313 (`O3a`, `A4s`) | conformance-pocket | 4 | 91,382 B | **4 of 4** (64,799 to 69,659 B received) | `O3a` **RED ELSEWHERE, nothing numbered** / red on `O3` |
| p313 | hostile client | 3 | 42,917 B | 0 of 3 | `A4s` red on `hostile` both |
| p314 (`H1`) | conformance-push | 3 | 5,773 B | 0 | PASS both |
| p273 (all 5) | conformance-save | 7 | 5,825 B | 0 | OK both |
| p268 (all 35) | conformance-save | 37 | 5,988 B | 0 | PASS both |
| p274 (all 13) | samefolder (`P274_SOURCE_ONLY`) | 14 | 2,500 B | 0 | OK both |
| p275 (`0`) | conformance-agents | 3 | 10,600 B | 0 | PASS both |
| p276 (`R10`) | conformance-shellenv | 3 | 303 B | 0 | PASS both |
| p293 (`1`) | conformance-manager | 3 | 13,089 B | 0 | PASS both |
| p296 (`A1`) | conformance-handback | 3 | 4,867 B | 0 | PASS both |
| p307 (`R1`) | background (green only), known-hosts, handback | 1, 3, 4 | 176, 1,138, 4,554 B | 0 | PASS both |
| p312 (all 23) | conformance-choices | 24 | 3,550 B | 0 | OK both |
| p316 (`a1`) | conformance-ios `--json` | 2 | 38,369 B | 0 | PASS both |
| p323 (`A1`) | conformance-endtree `--root` | 3 | 2,570 B | 0 | PASS both |
| p326 (`A1`) | conformance-farattach `--json` | 3 | 254 B | 0 | PASS both |
| p33311 (`F1`) | assert-door-only-adds `--json` | 2 | 7,836 B | 0 | 1/1 red both |
| p340 (`a010a`) | conformance-machines | 3 | 38,790 B | 0 | PASS both (81 s, 106 s) |

"Tail lost" compares the last stdout line of each slow run with the file run at the same index (digits normalised).
Green `conformance-pocket` runs (the base, the restore check, and `A4s`'s gate run) lose their PASS line under the slow
reader too, and the harness still reads them green, by exit status. The last line each gate wrote red, which is why D2
tests no pattern: pocket, push and manager end
`[conformance:…] FAIL: N of M rules red`. choices, endtree, save and samefolder end with a `FAILED: …` line on stderr. ios
ends `[conformance:ios] FAIL. …`. Door-only-adds and farattach end on their JSON lines. Agents (`  - [p275 R7] …`),
machines (`  - condition 129: …`), handback, shellenv (`  - [p276 R10] …`), the hostile client (`  - [p313 hostile] Rm6
…`) and known-hosts (stderr) end on a finding.

### 2.5 M4: the 14 arms 357 read as nothing, at the parent (`a/bin/batch14.sh`)

`P313_ONLY=R3b,R5,O2a,O2db,O2i,O2l,R3h,Z11a,Z25b,NS7c,L5s,PS6e,Z32a,O3a`, through the slow reader: **14 of 14 RED
ELSEWHERE** (13 with nothing numbered; `O2l` with `unit`, its vitest check's own tag, never `O2l`). The run took 238 s and
exited 1. The gate's 16 runs (base, 14 arms, the restore) each delivered 64,799 to 69,659 bytes. Through files:
**14 of 14 red on their own rule** (`NS7c` with `R5` and `O2c` beside `NS7`, `O2l` with `unit` beside `O2l`), PASS,
exit 0 in 234 s, the gate writing 91,239 to 91,744 bytes each run.

### 2.6 M5: the battery at the parent (`b/run-fault.sh`, `b/leftovers.mjs`)

Each run is under lock slot `electron.lock`, outside the history block, with the scratch environment of §0. After each,
`leftovers.mjs` counts once every process naming `-L gmux-fault-<that battery's pid>-<n>`.

| Run | PATH's first tmux | Load (1 min) | Wall | Verdict | Processes naming its sockets |
| --- | --- | --- | --- | --- | --- |
| backup points ×3 (5 cases each) | Homebrew 3.6a | 6 to 18 | 14, 15, 16 s | PASS | 0, 0, 0 |
| backup points ×2 | the vendored 3.7b (357's set-up) | 9 to 15 | 14, 15 s | PASS | 0, 0 |
| backup points ×2, a made-up `TMUX` inherited | Homebrew 3.6a | 9 to 52 | 15, 17 s | PASS | 0, 0 |
| the whole battery (20 cases) | Homebrew 3.6a | 4 to 6 | 55 s, a 145,014-byte report | PASS | 0 |
| 7 points (the four backup, `create.after-spawn`, `snapshot.after-write`, `restore.after-arm`) beside 30 busy loops | Homebrew 3.6a | 16 rising to 118 | 97 s | PASS | 0 |

9 runs, 54 killed work launches, 0 pairs. The busy loops (`b/load.sh`) each ended themselves after 80 s and were ended
by pid in a trap. None was left.

### 2.7 M6: the pair, planted by hand (`b/wedge*.mjs`, `b/p-parent*.mjs`)

Each plant runs a scratch server `gmux-p361-spec-<pid>-<n>` started by the vendored 3.7b with `resources/gmux-tmux.conf`,
and a node parent that spawns the app's own control client (`-C new-session -A -s gmux-control`, stdio pipes) and writes
`refresh-client -f no-output`. Every process was ended by pid in the plant's `finally`.

| How the parent dies | Held pair |
| --- | --- |
| SIGKILLed by the plant, right after the attach (two) or after a flood of window notifications it had stopped reading (one) | 0 of 3 |
| SIGKILLs itself 200 ms after start | 0 of 1 |
| SIGKILLs itself 800 ms after start (two pane commands, a window-renaming loop and `sleep 600`) | 13 of 13, and 1 of 1 with the server's `-vv` log |
| SIGKILLs itself 3,000 ms / 6,000 ms after start | 2 of 2 / 1 of 1 (0 of 1 with `-vv`) |
| writes `list-sessions` / `list-keys` / `show-options -g`, then SIGKILLs itself in the same tick | 0 of 1 / 1 of 1 / 0 of 1 |
| **stalls its reader, asks for 40 × `list-keys`, SIGKILLs itself 500 ms later (the deterministic plant, `b/p-parent4.mjs`)** | **13 of 13** |

What a held pair reads, every time: the client's ppid is 1, and its fds 0, 1 and 2 read `unix ->(none)`. Its fd 5 is
connected to the server's listening socket. The server holds two sockets with no peer, which are the client's stdin and
stdout. `list-clients` answers nothing. `kill-server` exits 0 and the server is still there 3 s later. SIGTERM to the
server is ignored for 2 s (2 of 2). SIGTERM to the client: the server is gone within 100 ms. SIGKILL to the server: the
client is gone within 100 ms (2 of 2).

### 2.8 M7: which tmux reaches the server, and step 6 (`b/crossver.mjs`, `b/wedge10.mjs`)

Homebrew's 3.6a against a vendored 3.7b server: `display-message -p '#{socket_path}'` exits 0 with the path, and
`kill-server` exits 0 and ends the server (the vendored copy then answers `no server running on
/private/tmp/tmux-501/<socket>`). The server's socket file stays after `kill-server`, and after a SIGKILL of the server
(`b/noserver.mjs`). Both versions answer `no server running on <path>`, exit 1, over such a file, and `error connecting
to <path> (No such file or directory)`, exit 1, when there is no file. Step 6's own command against the
deterministic plant: exit 0, the server alive 3 s later, the socket file kept, 2 of 2.

### 2.9 M8: the design, prototyped before it is specified (`b/proto/end-scratch.mjs`, `b/proto/try-end.mjs`; not product code)

| Case | Verdict | Time | What it did |
| --- | --- | --- | --- |
| the deterministic plant, a decoy on another socket, a decoy naming this socket and not connected | ok | 2,216 ms, 2,240 ms | held = the client; the client SIGTERMed; the server left within 100 ms; socket removed; both decoys alive and unsignalled (the second reported not connected) |
| a server with a listed control client whose parent lives | ok | 151 ms | `kill-server` alone; the client read `<defunct>` (not counted alive) |
| a server with no client | ok | 149 ms | `kill-server`; socket removed |
| the only candidate a stand-in that prints `protocol version mismatch (client 7, server 8)` | failed, `no tmux reached the server` | 4 ms | nothing signalled; the plant's own `finally` ended the server |

The prototype's first run found two traps the design now names. lsof's NAME is its eighth column for a UNIX socket, and
reading the ninth classified the held client as "not connected". And `kill(pid, 0)` succeeds on a zombie, so "alive"
must also read `ps -o stat=` and refuse `Z`.

## 3. The tree at this head (what the builders start from)

| Harness | Gate call (line, function) | maxBuffer | timeout | What it reads |
| --- | --- | --- | --- | --- |
| `build/ablation-p313.mjs` | `:9145` `runChecks` (CHECKS table, gate + hostile + vitest) | 64 MiB | 120 s | `[p313 <rule>]` tags; status; Phase 348's "did not answer" line (`:9154-9159`) |
| `build/ablation-p314.mjs` | `:596` `runGate` (`GATE.map(…)`) | 64 MiB | 120 s | rule tags |
| `build/p316/ablation-ios.mjs` | `:6262` `runGate` (`--json`) | 1 MiB | 180 s | the `CONFORMANCE_IOS:` line; none → arm FAIL "printed no verdict" |
| `build/p33311/ablation.mjs` | `:688` `gate`, `:701` `freeze` (`--root`, `--json`) | 32 MiB | 180 s | the `GATE_ONLYADD:` line |
| `build/p268/ablation.mjs` | `:130` `runGate` | 1 MiB | — | rule numbers |
| `build/p273/ablation-vocabulary.mjs` | `:48` `runGate` | 1 MiB | — | stderr's `[conformance:save] N.` lines |
| `build/p274/ablation.mjs` | `:211` `gateFindings` (`P274_SOURCE_ONLY=1`) | 16 MiB | — | rule numbers |
| `build/p275/ablation.mjs` | `:572` `runGate` | 64 MiB | — | section 9 rules |
| `build/p276/ablation.mjs` | `:556` `runGate` | 64 MiB | — | rule ids |
| `build/p293/ablation.mjs` | `:1027` `runGate` | 64 MiB | 120 s | rule ids |
| `build/p296/ablation.mjs` | `:374` `runGate` | 64 MiB | 120 s | the clause's sentence |
| `build/p307/ablation.mjs` | `:501` `runGate(rel)` (three gates) | 64 MiB | 180 s | readings per gate |
| `build/p312/ablation.mjs` | `:96` the `choices` check | 64 MiB | — | check names |
| `build/p3201/ablation.mjs` | `:1720` `runMachines` | 64 MiB | 300 s | conditions |
| `build/p3202/ablation.mjs` | `:398` `runGate` | 64 MiB | 180 s | conditions |
| `build/p323/ablation.mjs` | `:656` `runGate` (`--root`) | 16 MiB | 120 s | rule ids |
| `build/p324/ablation.mjs` | `:522` `runGate` | 64 MiB | 180 s | conditions |
| `build/p326/ablation.mjs` | `:375` `runGate` (`--root`, `--json`) | 16 MiB | 60 s | the last stdout line as JSON; unparsable → null |
| `build/p331/ablation.mjs` | `:634` `runGate` | 64 MiB | 300 s | rule ids |
| `build/p336/ablation.mjs` | `:642` `runAblations` | 64 MiB | 600 s | conditions |
| `build/p340/ablation.mjs` | `:443` `runAblations` | 64 MiB | 600 s | conditions |
| `build/p342/ablation.mjs` | `:639` `runAblations` | 64 MiB | 600 s | conditions |
| `build/p343/ablation.mjs` | `:835` `runAblations` | 64 MiB | 600 s | conditions |

Every one uses `spawnSync(process.execPath, …)` with the default pipes and `encoding: 'utf8'`. No helper under `build/`
hands a child a file for its output today (grepped: no `stdio: ['ignore', <fd>` anywhere), so the runner is new. The name
`gateRun` is free. Fourteen harnesses already have a local function named `runGate`, which is why the export is not
called that.

## 4. The design, item by item (real paths; the builder named on each)

### 4.1 `build/gate-run.mjs` (new; builder `runner`)

- `export const GATE_RUN_CAP_BYTES = 64 * 1024 * 1024;`
- `export function gateRun(script, args = [], { cwd, env, timeout } = {})`, synchronous:
  1. `const dir = mkdtempSync(join(tmpdir(), 'gate-run-'))`, then `openSync` of `dir/stdout` and `dir/stderr` for writing.
  2. `spawnSync(process.execPath, [script, ...args], { cwd, env: env ?? process.env, timeout, killSignal: 'SIGTERM',
     stdio: ['ignore', out, err] })`. This is the file's ONE child_process call.
  3. In a `finally`: close both fds, read both sizes; when their sum is at most the cap, read both as utf8; remove `dir`
     whole.
  4. Answer `{ status, signal, error, stdout, stderr, bytes, readable, why }`. `stdout` and `stderr` are strings (`''`
     when over the cap). `why` is the first that holds, in this order, in §5's words: a timeout (`error.code ===
     'ETIMEDOUT'`), a failed start (any other `error`), a signal, a missing exit status, the cap. `readable` is `why ===
     null`.
- The command line runs only when the file is invoked directly, by realpath (as `build/stapler.mjs` does), with
  `--self-test` (`gate:gaterun`). It writes its own child scripts into a scratch folder and removes it in a `finally`.
  It sets `process.exitCode` and returns, so its own last lines reach a pipe. Cases, each with literal expectations:
  - G1: 200,000 bytes, then `process.exit(1)`. Readable, status 1, every byte, its last line present, and the child's own
    `fstatSync(1).isFile()` and `fstatSync(2).isFile()` both printed `true`. This is the case a pipe loses, and the one
    an ablation to `'pipe'` turns red.
  - G2: 2,097,152 bytes, then its verdict line. Readable, every byte (above the 1 MiB three harnesses read today).
  - G3: 1 KB, then `process.kill(process.pid, 'SIGKILL')`. Unreadable, `ended by SIGKILL`.
  - G4: sleeps 2 s under `timeout: 300`. Unreadable, `timed out after 300 ms`.
  - G5: `cwd` a folder that does not exist. Unreadable, `could not start: ENOENT`.
  - G6: the cap, through an internal function the export does not expose, with a cap of 1,000 and a child that writes
    2,000. Unreadable, with §5's cap sentence and both strings empty.
  - G7: `O` to stdout and `E` to stderr. They come back apart.
  - G8: after every case, no `gate-run-*` folder is left in the self-test's own `TMPDIR`.
  - It prints `gate-run self-test: PASS, 8 cases; every gate is handed two files and read after it exits` or one
    `gate-run self-test: FAIL <case>: <why>` line per failure.

### 4.2 `gate:checks` clause 9 (`build/assert-hermetic-checks.mjs`; builder `runner`)

Header paragraph `9. A HARNESS RUNS A GATE THROUGH build/gate-run.mjs (Phase 361)`, its text in the shape of 1 to 8. The
clause reads with the TypeScript parser (`createRequire(…)('typescript')`), skipping comments:

- **9a. The runner hands files.** `build/gate-run.mjs` holds exactly one call to a `node:child_process` function, a
  `spawnSync`. Its options object names `stdio` as an array literal of three elements: `'ignore'`, then two identifiers
  each initialised by `openSync(`. The strings `'pipe'` and `'inherit'` appear nowhere in the file's code.
- **9b. The harnesses use it.** H is every file behind a `package.json` script whose name starts `ablation:` and whose
  command starts `node <path>`, whose code holds a string literal naming a gate script. A gate script is one of the 61
  derived exactly as §2.2 derives them, and a literal names one when it equals its basename or ends `/<basename>`. Then:
  - |H| is at least `HARNESS_GATE_FLOOR = 23`.
  - Every file in H imports `gateRun` from a specifier ending `gate-run.mjs`.
  - No file in H calls `spawnSync`, `spawn`, `execFileSync`, `execFile`, `execSync` or `exec` with `process.execPath` or
    the string `'node'` first, UNLESS the second argument is an array literal whose first element RESOLVES to a script
    that is not a gate. It resolves when it is a string literal, a `join(…)` or `resolve(…)` whose last argument is a
    string literal, a `const` of the same file initialised by one of those, or `fileURLToPath(import.meta.url)` (the
    harness's own file). Anything else, including `argv.map(…)` or a variable that is not such a const, does not
    resolve and is a finding. A finding names the file, the line and what the call runs.
- **9c. The reader proved on fixtures** (texts in the gate, as clauses 4 to 8 keep theirs). Caught:
  - `const GATE = join(REPO, 'build/conformance-save.mjs'); spawnSync(process.execPath, [GATE], {…})`;
  - `spawnSync(process.execPath, [join(scratch, 'build', 'conformance-machines.mjs')])`;
  - `spawnSync(process.execPath, argv.map((a) => join(scratch, a)))` in a text naming `'build/conformance-pocket.mjs'`;
  - `execFileSync('node', ['build/conformance-ios.mjs'])`;
  - a runner text whose `stdio` is `'pipe'`, and one whose second element is `'inherit'`.
  Passed:
  - `gateRun(GATE, [])`;
  - `spawnSync(process.execPath, [join('node_modules', 'vitest', 'vitest.mjs'), 'run'])`;
  - `spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--read-background', clone])`;
  - a text that names a gate only in a comment (out of H);
  - the runner text with `['ignore', out, err]` from `openSync`.
- **9d. In-memory ablations of the shipping texts**, each red on 9a or 9b:
  - the runner's second `stdio` element replaced by `'pipe'`;
  - one harness's `gateRun(` call replaced by the parent's own `spawnSync(process.execPath, [GATE], { cwd: REPO,
    encoding: 'utf8' })` (`build/p268/ablation.mjs:130` at `d87d414c`);
  - the `ablation:` names removed from an in-memory `package.json`, so the floor reads red.
- The PASS summary gains one line, §5's.

### 4.3 The 23 harnesses (builders `harness-a` and `harness-b`)

The same rule in each:

1. **Every node child that runs a gate goes through `gateRun`** (`import { gateRun } from './gate-run.mjs'` at the top
   level of `build/`, `'../gate-run.mjs'` one folder down), with that call's own `cwd`, `env` and `timeout` exactly.
   Drop `encoding` and `maxBuffer`. Read `status`, `signal`, `error`, `stdout` and `stderr` as before: same names, same
   types. The 24 sites are §3's lines. `ablation-p313.mjs`'s `runChecks` loop goes through it whole:
   `gateRun(argv[0], argv.slice(1), …)` after its `relative` join, so its vitest checks move too.
2. **Every reading asks `readable` first.** That covers the base, each arm, each control, the restore check, a freeze and
   a `--json` read. When `readable` is false, the reading is `UNREADABLE: <why>`. It is never green, never red on a rule,
   never `RED ELSEWHERE` and never "nothing numbered". In a harness table it is the row's verdict and the why its last
   column. A run that holds one cannot PASS. The base or the restore check unreadable stops the run at once with §5's
   base line. Exit 2 when unreadable readings are the run's only problems, and 1 when anything else is wrong.
3. **A harness that already reads a missing verdict line keeps that reading for a readable run.** That means `p316`'s
   "printed no verdict", `p326`'s null and `p33311`'s null verdict: a gate that finished without its line is the gate's
   own finding, as today. The runner's UNREADABLE is asked first. `ablation-p313.mjs`'s Phase 348 "did not answer" text
   becomes the runner's why.
4. **Everything else stays**: every arm, plant, rule, tag, table, sentence, floor and `--self-test`.

`harness-a` owns: `build/ablation-p313.mjs`, `build/ablation-p314.mjs`, `build/p316/ablation-ios.mjs`,
`build/p33311/ablation.mjs`, `build/p268/ablation.mjs`, `build/p273/ablation-vocabulary.mjs`, `build/p274/ablation.mjs`,
`build/p275/ablation.mjs`, `build/p276/ablation.mjs`, `build/p293/ablation.mjs`, `build/p296/ablation.mjs`,
`build/p307/ablation.mjs` (12).

`harness-b` owns: `build/p312/ablation.mjs`, `build/p3201/ablation.mjs`, `build/p3202/ablation.mjs`,
`build/p323/ablation.mjs`, `build/p324/ablation.mjs`, `build/p326/ablation.mjs`, `build/p331/ablation.mjs`,
`build/p336/ablation.mjs`, `build/p340/ablation.mjs`, `build/p342/ablation.mjs`, `build/p343/ablation.mjs` (11).

### 4.4 `build/scratch-tmux.mjs` (new; builder `pair`)

Node builtins only. Synchronous throughout, so `teardownSync` can call it from `process.on('exit')`. It sleeps with
`Atomics.wait` on a `SharedArrayBuffer`.

- `export function tmuxCandidates({ repoRoot, env = process.env, bundled = null })` answers the app's own order (D11):
  `bundled` when given, `env.GMUX_TMUX_BIN` when it names an executable file, `<repoRoot>/build/vendor/tmux/bin/tmux`,
  `/opt/homebrew/bin/tmux`, `/usr/local/bin/tmux`, `/usr/bin/tmux`, then `'tmux'`. An absolute candidate that does not
  exist is skipped.
- `export function endScratchServer(socket, { candidates })`:
  1. Refuse, by throwing before anything runs: `gmux`, `default`, and any name not starting `gmux-`.
  2. **Reach.** For each candidate: `<bin> -L <socket> display-message -p '#{pid} #{socket_path}'` (5 s bound).
     - Exit 0: the server's pid and socket path.
     - A stderr of `no server running on <path>` (a socket file with no server) or `error connecting to <path> (No such
       file or directory)` (no file): there is no server; take the path. Any other `error connecting to …` is a candidate
       that did not reach it.
     - Anything else: record why, try the next.
     - No candidate reached: the verdict fails with §5's sentence, and nothing is signalled.
  3. **The copy the server runs.** `ps -p <pid> -o comm=`. When it names an existing absolute file other than the
     candidate, every later command uses it, with a note.
  4. **The clients, from the server.** The listed ones come from `list-clients -F '#{client_pid}'`. The held ones are
     every row of `ps -Ao pid=,command=` whose command holds the adjacent tokens `-L` and `<socket>`, other than the
     server, this process and the listed ones, whose `lsof -a -p <pid> -U` shows a NAME (column 8) of `->` plus the
     DEVICE address (column 6) of one of the server's own UNIX sockets whose NAME is the socket path. A row naming the
     socket and not connected is recorded as not connected and never signalled.
  5. `kill-server`, its status recorded. Wait at most 2,000 ms for the server's pid, polling every 25 ms.
  6. If the server is still there: for each listed or held client still alive, read `ps -p <pid> -o command=` again. It
     must still hold `-L <socket>`, or the client is left and recorded. SIGTERM and wait 2,000 ms; if still there, read
     again, SIGKILL and wait 1,000 ms. Record the signal that ended it. Then wait 2,000 ms for the server.
  7. If the server is still there: read its command line again, SIGKILL, wait 1,000 ms. The verdict fails with §5's
     SIGKILL sentence.
  8. **The socket file**: removed only when the server's pid is gone (or there was no server), and only at the exact path,
     which must end `/<socket>` and be a socket (`statSync(…).isSocket()`).
  9. Answer `{ ok, socket, tmux, serverPid, socketPath, listed, held, notConnected, ended: [{ pid, signal }], left:
     [{ pid, command }], socketFile: 'removed' | 'absent' | 'kept', steps: [], why: [], notes: [] }`. `steps` is the
     ordered list of what it did (`kill-server`, `SIGTERM <pid>`, `server gone`, `socket removed`, …), which T1 reads.
     `ok` holds when `why` and `left` are both empty. A held client that step 6 ended is a note (D12).
  "Alive" means `process.kill(pid, 0)` succeeds AND `ps -p <pid> -o stat=` is non-empty and does not start `Z`
  (§2.9: a `<defunct>` entry holds no memory and is not a leak, CLAUDE.md).
- `export function namingProcesses(pattern, rows = readProcessTable())` answers every `{ pid, ppid, command }` whose
  command holds `-L` followed by a token matching `pattern` (an anchored RegExp of a socket name), or a `-L<name>` token
  whose name matches. It is pure over the given rows, counts only and signals nothing.
- `--self-test` (`conformance:scratchtmux`). It needs `/bin/ps` and `lsof`, so it runs outside the history block (§0).
  It plants on sockets `gmux-p361-<pid>-<n>` with the first existing absolute candidate (refusing to run with none), a
  scratch `HOME`, `ZDOTDIR`, `TMUX_TMPDIR` unset, `SHELL=/bin/sh` and `HISTFILE=/dev/null` for its servers. Every
  process it starts (planted parents, servers, clients, decoys) is ended by pid in a `finally`, after its command line is
  read again. The planted parent starts a child it never ends (that is the plant), so its source is written into the
  self-test's scratch at run time from a string, never kept as a file under `build/`, and `gate:background` reads the
  module green. Cases:
  - T1, the deterministic plant (§2.7: a node parent spawns the control client, writes `refresh-client -f no-output`,
    after 300 ms stops reading its stdout, writes 40 `list-keys`, and SIGKILLs itself 500 ms later). It runs beside a
    decoy on another socket and a decoy whose command line holds `-L <this socket>` and that is connected to nothing.
    Expect: ok; `held` names the client and nothing else; `ended[0]` is the client by SIGTERM; the server gone; the
    socket file removed AFTER the server's pid was gone (read from `steps`); both decoys alive and never
    signalled; the second in `notConnected`.
  - T2: a first candidate that is a stand-in printing `protocol version mismatch (client 7, server 8)` with exit 1, then
    the real tmux. Reached by the second, and the stand-in's why noted. Then the stand-in alone: not ok, `no tmux
    reached the server on …`, nothing signalled.
  - T3: `gmux`, `default` and `other` refused, with no process started (the table read before and after).
  - T4: no server, with a stale socket file at the exact path: ok, nothing signalled, the file removed. No file at all:
    ok, `absent`.
  - T5: a server whose control client's parent is alive. `kill-server` alone ends it, and no signal is sent.
  - T6: `namingProcesses` over fixture rows. `-L gmux-fault-12-1` and `-L gmux-fault-12-10` match
    `^gmux-fault-12-\d+$`; `-L gmux-fault-121-1`, `-L gmux-fault-12-1x`, and `gmux-fault-12-1` without `-L` do not;
    `-Lgmux-fault-12-3` does.
  - T7, the text rules, read with the TypeScript parser:
    - `build/fault-harness.mjs`'s `runCase` calls `endCaseServer(` inside a `finally` (matching braces), and
      `endCaseServer` calls `endScratchServer(` after its two refusals;
    - its `main` calls `namingProcesses(` exactly once, inside a `finally`, and a non-empty answer reaches the FAIL line;
    - it still holds `REAL_SOCKET = 'gmux'` with its refusal `refusing to touch -L gmux`, and the `gmux-fault-` prefix
      refusal;
    - `build/electron-run.mjs`'s `teardown` and `teardownSync` each call `endScratchServer(`;
    - neither file holds the string `'kill-server'` in its code.
  - Ablations: in-memory copies of the module written to the self-test's scratch and imported, and in-memory text
    mutations of the two files, each red on the case named:
    - step 6 removed: T1 reads the client left;
    - the connection test removed, so every process naming the socket is a client: T1's second decoy is signalled;
    - the socket removed before the server is waited for: T1's order;
    - the zombie test removed: T5 reads a `<defunct>` client as left;
    - the `finally` around `endCaseServer(` in `runCase` removed: T7;
    - a `spawnSync('tmux', ['-L', s, 'kill-server'])` put back in `electron-run.mjs`'s step 6: T7.
  - It prints `scratch-tmux self-test: PASS, 7 cases and 6 ablations; …` and sets `process.exitCode`.

### 4.5 `build/fault-harness.mjs` (builder `pair`)

- `killServer` (`:407-428`) becomes `endCaseServer(socket)`. It keeps both refusals word for word (`refusing to touch
  -L gmux`, and the `gmux-fault-` prefix with its message), then answers `endScratchServer(socket, { candidates:
  tmuxCandidates({ repoRoot: REPO, env: process.env }) })`.
- `runCase` (`:434-500`): `try { work; survey } finally { teardown = endCaseServer(socket) }`. The result gains
  `teardown: { ok, serverPid, held, ended, notes, why }`. A teardown that is not ok adds §5's case failure. Its `judge`
  is unchanged.
- `main` (`:617-740`): the cases run inside `try … finally`. The `finally` runs, once,
  ``namingProcesses(new RegExp(`^gmux-fault-${process.pid}-\\d+$`))``, and prints each process with pid, ppid and
  command line. Any one makes the run FAIL with §5's line and exit 1, as a failed case does. Nothing is signalled. `--keep`, `--json` and the
  root removal stay. The two `process.exit` calls stay (§11).
- `runApp` (`:233-334`) still names no `tmuxSocket`: the helper's step 6 would end the server between the work launch
  and the survey, which reads that server's sessions. The case's own `finally` ends it once, after the survey.
- No `kill-server` literal stays in the file.

### 4.6 `build/electron-run.mjs` step 6 (builder `pair`)

- The header's step 6 (`:74-76`) reads: "End the scratch tmux server, when the caller named one, through
  `build/scratch-tmux.mjs`, which reads the server's pid and its clients from the server, asks it to stop, ends a client
  it still holds by pid, and removes the socket file only once the server has gone. The names `gmux` and `default` are
  refused outright."
- `entry` gains `env` (the composed `childEnv`) and `program`. Step 6 in `teardown` (`:1164-1169`) and `teardownSync`
  (`:1215-1219`) becomes `entry.scratch = endScratchServer(entry.tmuxSocket, { candidates: tmuxCandidates({ repoRoot,
  env: entry.env, bundled: <the packaged app's Contents/Resources/bin/tmux when program is 'packaged'> }) })`, inside a
  `try` whose `catch` turns a throw into a failed verdict, so a teardown never throws.
- `withElectron`'s `finally`, after the census block: when `entry.scratch?.ok === false`, it throws §5's helper line when
  the body returned and no census failure was thrown, and prints it otherwise. `teardownSync`'s net prints it. Every
  other step is unchanged, word for word.

### 4.7 The integrator's files

- `package.json`: `"gate:gaterun": "node build/gate-run.mjs --self-test"`, `"conformance:scratchtmux": "node
  build/scratch-tmux.mjs --self-test"`, and `build` gains `&& node build/gate-run.mjs --self-test` right after `node
  build/assert-hermetic-checks.mjs`.
- `build/verification-checks.mjs`: `pure('gate:gaterun', …)`, whose needs are "node and the repository install; it
  starts node children of its own into a scratch folder it removes", beside `gate:stapler` with a paragraph. And
  `tmux('conformance:scratchtmux', …)`, whose needs are "the vendored tmux on scratch -L sockets of its own, /bin/ps and
  lsof; it plants a held control client, a decoy and a stand-in tmux and ends each by pid in a finally", beside
  `conformance:tmux-pair`.
- `CLAUDE.md`, just enough words:
  - the "run inside `npm run build`" sentence names `gate:gaterun`;
  - the path-triggered table's `gate:checks` row gains "a file behind `ablation:*`, `build/gate-run.mjs`" and the
    clause's one line;
  - one new row: `build/scratch-tmux.mjs`, `build/fault-harness.mjs` and step 6 of `build/electron-run.mjs` →
    `conformance:scratchtmux`, about 15 s, outside the history block;
  - machine discipline gains one sentence: a scratch tmux server is ended by `build/scratch-tmux.mjs`, which proves it
    gone, and a control client whose reader died holds its server until it is ended.
- `build/background-fixtures.mjs` and `build/assert-electron-teardown.mjs`: no change expected (D14; the floor stays 181).
  Reconcile only if `gate:background` or `gate:electron` reads red on a builder's file.
- `docs/audits/contract-baseline.txt`: no change; `--check` proves it.
- This file's `§As built`.

## 5. Words (every new line, verbatim)

| Where | Line |
| --- | --- |
| runner `why` | `timed out after <n> ms` · `could not start: <code>` · `ended by <signal>` · `ended with no exit status` · `wrote <n> bytes, more than the 67108864 the runner reads` |
| harness, a reading | `<TAG> <id> UNREADABLE: <why>` (its table row's verdict `UNREADABLE`) |
| harness, the base | `<TAG> UNREADABLE: the base could not be read: <why>` |
| gate:checks summary | `  <n> harnesses run their gates through build/gate-run.mjs against a floor of 23, and the runner hands every gate two files (<k> reader fixtures behaving).` |
| gate:gaterun | `gate-run self-test: PASS, 8 cases; every gate is handed two files and read after it exits` |
| endScratchServer `why` | `no tmux reached the server on <socket>: <each candidate's why>` · `<pid> no longer names <socket>; not signalled` · `left: <pid> <command>` · `the server outlived its clients and was ended by SIGKILL` |
| endScratchServer notes | `the server left once the client it held was ended` · `the server runs <path>; asked it with that` · `<pid> names <socket> and is not connected to its server; not signalled` |
| fault case failure | `the case's tmux server on <socket> was not proven gone: <why>` |
| fault battery, the count | `[fault] FAIL — <n> process(es) of this battery's tmux servers still running: <pid> (ppid <ppid>) <command>; …` |
| helper | `[electron-run] <label>: the scratch tmux server <socket> was not proven gone: <why>` |

## 6. What moves on purpose (each named in the integrator's report)

- A harness reading whose gate died, timed out, never started or wrote more than 64 MiB now reads UNREADABLE, where today
  it reads `RED ELSEWHERE`, "nothing numbered" or a plain FAIL.
- A gate whose output is larger than the `maxBuffer` its harness passes today (1 MiB for p268, p273 and p316; 16 MiB for
  p274, p323 and p326; 32 MiB for p33311) is now read whole up to 64 MiB, where today spawnSync kills it and hands back
  the part it had.
- The fault battery fails a case whose server it cannot prove gone, and fails a run that leaves a process naming one of
  its sockets. Each case's JSON gains `teardown`.
- Step 6 of every launch that names `tmuxSocket` now ends a held client and proves the server gone, at about 150 ms a
  launch (the prototype: 149 to 205 ms; a held pair about 2.2 s).
- `npm run build` gains `gate:gaterun` (well under a second); `gate:checks` reads with the TypeScript parser (a few
  hundred ms more).

## 7. The gates that move

| Gate | Moves how |
| --- | --- |
| `gate:checks` | clause 9 (§4.2) |
| `gate:gaterun` (new, inside `npm run build`) | the runner driven (§4.1) |
| `conformance:scratchtmux` (new, path-triggered, not in the build) | the teardown driven, plus its text rules (§4.4) |
| `gate:background`, `gate:electron`, `gate:contract`, `conformance:ios` | unchanged; they must read green over the new files (`conformance:ios` because `build/p316/**` triggers it) |

## 8. Builders, disjoint files, and the seams

### 8.1 The table (every file in exactly one list; a builder that must edit a file not in its list stops and names it)

| Builder | Files |
| --- | --- |
| `runner` | `build/gate-run.mjs` (new), `build/assert-hermetic-checks.mjs` |
| `harness-a` | the 12 of §4.3 |
| `harness-b` | the 11 of §4.3 |
| `pair` | `build/scratch-tmux.mjs` (new), `build/fault-harness.mjs`, `build/electron-run.mjs` |
| integrator | `CLAUDE.md`, `package.json`, `build/verification-checks.mjs`, `build/background-fixtures.mjs`, `build/assert-electron-teardown.mjs`, `docs/audits/contract-baseline.txt`, this file's `§As built`, and any file two builders both need |

### 8.2 The seams (one worktree: `runner` writes `build/gate-run.mjs` FIRST, before clause 9)

- `build/gate-run.mjs` exports `gateRun(script, args, { cwd, env, timeout })` and `GATE_RUN_CAP_BYTES`, answering `{
  status, signal, error, stdout, stderr, bytes, readable, why }` as §4.1 says. `harness-a` and `harness-b` code against
  that and test once the file exists. Until it does, `gate:checks` clause 9 reads red, which is expected.
- `build/scratch-tmux.mjs` exports `tmuxCandidates`, `endScratchServer` and `namingProcesses` as §4.4 says. `pair` owns
  both of its callers.

### 8.3 The briefs (the workflow hands each its own, with §0, §0.1 and §1.1)

- **`runner`**: §4.1 and §4.2. Prove G1 reads red over a scratch copy of the runner with `'pipe'`, and report it.
- **`harness-a`, `harness-b`**: §4.3. For each file: the swap, the UNREADABLE branch for every reading, and one run.
  That is one arm through its `P*_ONLY` (or `--only`), or the whole harness where it takes under two minutes (`p268`,
  `p273`, `p274`, `p276`, `p296`, `p312`), in a `cp -Rc` clone of the worktree under your scratch. Each must read as it
  did at the parent (§2.4's verdicts). Also run its own `--self-test` where it has one (`p3201`, `p3202`, `p336`,
  `p340`, `p342`, `p343`). Then show UNREADABLE once per builder: plant, in the clone, a gate that SIGKILLs itself
  after its first kilobyte and read the arm UNREADABLE with `ended by SIGKILL`.
- **`pair`**: §4.4 to §4.6. Run `conformance:scratchtmux` (outside the block, §0), `gate:background`, `gate:electron`, and
  the battery's four backup points once under a lock slot after `npm run build`.

Every builder runs `npm run typecheck` and `npm test` (under the history block, naming the four `/bin/ps` tests and the
five FSEvents tests 357 measured failing inside it) and `npm run gate:checks` before it returns. Until all four have
returned, clause 9 may name another builder's files; it must name none of yours. Each returns every file it
changed with line counts, every command with exit code and numbers, and the history stats.

## 9. The proof, run rather than read (Tier 2)

The gates once (§10's list; the integrator's PASS lines are a start, not the evidence). The ONE app run is the fault
battery at HEAD. Name the independent step in the verdict; a verdict whose evidence is only the builders' checks re-run is
not a verification.

- **(a) Method 1, measure the parent.** Run the spec's instrument (`a/bin/p361-preload.mjs` with
  `P361_MODE=slow`, `a/bin/slowsock.py`; §2.3) over `ablation:p313`'s 14 arms and `O3a` at the parent and at HEAD, each
  in a `cp -Rc` clone.
  - The parent reads 14 of 14 `RED ELSEWHERE` (§2.5).
  - At HEAD, every gate call is logged `passed` (it names its own stdio, two file descriptors) and 14 of 14 read their
    own rule.
  - Also one arm of each of the 23 harnesses at HEAD under the instrument: every gate call `passed`, every arm on its own
    rule, and the gate's bytes equal by sha256 to a direct file run of the same gate under the same plant.
- **(a) Method 2, the attack.** In a clone at HEAD, put each of these in place of one harness's gate, at least `p313`,
  `p316` and one machines harness:
  - a gate that SIGKILLs itself after 1 KB;
  - one that sleeps past the harness's timeout;
  - one that writes 70 MiB, then its verdict;
  - one that writes 2 MiB, then its verdict.
  The first three must read UNREADABLE with their why; the fourth its own rule; none red on nothing. Then:
  - count the gate scripts by your own method (the TypeScript parser over every exit) and agree on 61, 59, 2 and 144, or
    say where you differ;
  - break clause 9 in a clone (one harness back on a plain `spawnSync` of its gate; the runner's stdio back to `'pipe'`)
    and read `gate:checks` red naming the file.
- **(b) Method 1, measure the parent.** By your own script, run the parent's `killServer` commands as text gives them
  (`display-message -p '#{socket_path}'` and `kill-server` through PATH's tmux, then `rm` of the path) against the
  deterministic plant (§2.7): the pair is left. Run HEAD's `endScratchServer` against the same plant: the client ended
  first, the server gone, the socket removed. Then the battery at HEAD under a lock slot:
  - its four backup points twice and the whole battery once;
  - each PASS, its own count 0, and your own `ps -Ao pid,ppid,command` count 0 after each;
  - each run's added teardown time stated (the parent's numbers are in §2.6).
- **(b) Method 2, the attack** (the entry's three plants and one more), each planted by you:
  - the held pair;
  - a `tmux` first on PATH that cannot reach the server (a stand-in that logs every call): with the checkout's copy
    present the teardown never calls it (its log empty), and driven with the stand-in as its only candidate the
    function fails and signals nothing;
  - a decoy on another socket;
  - a decoy naming this socket and connected to nothing;
  - during one battery run, a decoy of yours whose command line holds `-L gmux-fault-<that battery's pid>-99`.
  The teardown must end exactly the two processes on its own socket, the client first, and leave every decoy alone. The
  battery's end count must name the last decoy and fail the run, and nothing may signal it. `-L gmux` must still be
  refused by both files, by name.
- **At the end, once**: the Electron count with CLAUDE.md's command, every `gmux-fault-`, `gmux-p361-` or other scratch
  socket's process (none), no such socket file under `/private/tmp/tmux-501/`, the crash reports by name and mtime, and
  the history stats.

## 10. The integrator's commands (in order; each with its exit code and PASS line in the report)

1. `npm run typecheck`.
2. `npm run build` (under the history block): `gate:checks` with clause 9, `gate:gaterun`, `gate:electron` at floor 181,
   `gate:background`, `gate:knownhosts`, `conformance:ios` (`build/p316/**` triggers it), `contract-inventory --check`.
3. `npm test` (under the history block; name each expected failure: the four `/bin/ps` tests and the five FSEvents
   tests).
4. `npm run gate:background`, `npm run gate:electron`, `npm run gate:checks`, `npm run gate:gaterun`, each alone (each a
   few seconds; `gate:checks` a few hundred ms more than before for the parser).
5. `npm run conformance:scratchtmux`, outside the history block (§0), about 15 s.
6. The harnesses' own self-tests the design touches: `node build/<p>/ablation.mjs --self-test` for `p3201`, `p3202`,
   `p336`, `p340`, `p342` and `p343`, each a few seconds.
7. One run of each of the 23 harnesses at HEAD, in a `cp -Rc` clone under your scratch with `P313_SCRATCH`,
   `P316_SCRATCH`, `P323_SCRATCH` and `P33311_SCRATCH` there. Each must read as §2.4 reads the parent. Measured walls at
   the parent, one arm unless named: `p268` all 35 arms 19 to 22 s, `p273` all 5 3 to 5 s, `p274` all 13 2 to 3 s,
   `p275` 13 s, `p276` 3 s, `p293` 7 s, `p296` 3 s, `p307` 15 s, `p312` all 23 62 to 82 s, `p313` (`O3a,A4s`)
   105 to 110 s, `p314` 19 s, `p316` 24 s, `p323` 11 s, `p326` 2 s, `p33311` 15 s, `p340` 81 to 106 s. `p3201`,
   `p3202`, `p324`, `p331`, `p336`, `p342` and `p343` were not timed (one arm of a machines harness is about three
   gate runs of 27 to 45 s). About 25 minutes in all. Never a whole `ablation:p313` (818 arms, hours), `ablation:p316`
   (747 arms) or a whole machines harness.
8. The fault battery at HEAD, under a lock slot, outside the history block (§0), after step 2's build in the same tree:
   `node build/fault-harness.mjs --root <scratch>` with the four backup points (`--point backup.after-copy#5 --point
   backup.after-body#5 --point backup.after-record#5 --point backup.prune.before-unlink`) twice, then the whole battery
   once. At the parent these took 14 to 17 s and 55 s (§2.6); say what the teardowns add. Count with
   `ps -Ao pid,ppid,command` after each.
9. `node build/contract-inventory.mjs --check` (no line moves).
10. The Electron count, the scratch sockets' processes and files, the crash reports by name and mtime, and the history
    stats.

## 11. What is NOT in this phase

- No change to what any gate checks, to any rule's verdict, or to any arm. The 61 gates are not edited: their 144
  `process.exit` calls stay (Q1).
- No change to the app, to tmux, to the vendored tmux pin or to `-L gmux`. No change inside tmux to why a control client
  with no reader keeps its server. The app's own reap of orphaned clients at launch (`src/main/proc/orphans.ts`) is
  unchanged.
- No kill by name or pattern. Every pid ended is read from its own socket's server, through its listed clients or the
  processes connected to its socket, and its command line is read again first. The battery's end count only counts.
- No change to the fault battery's own exits or to the 23 harnesses' own exits. Read through a pipe, the battery's
  145,014-byte report or a harness's table can still lose its last lines; their exit statuses cannot (Q1).
- No change to the four other readers of a gate (D7): `conformance-evidence`, `conformance-semantic`,
  `conformance-facts` and `probe:p300`.
- No change to a gate's own children. How a gate starts and reads its own children (several run the pinned tsx) is that
  gate's business and unchanged.
- No new menu row, surface, contract line, CHANGELOG item or release.

## 12. For the main session at landing

1. The brief for each role should carry §0's exception (the battery, `conformance:scratchtmux`, the plants and the counts
   run outside the history block because `/bin/ps` cannot start inside it), as 357's integrator ran the battery.
2. Owed (found, not this phase's): why 357's battery runs left pairs on the backup points and none of today's 54 killed
   cases did (§0.1 item 7) is unmeasured. The design does not need it.
3. Cleanup after the follow-up commit: the worktree, `/private/var/tmp/tortie-wt/wt-p361-parent` and any `-<role>` parent,
   and `/private/var/tmp/tortie-wt/scratch/p361/` (the spec step's is about 1.5 GB, most of it the `clone/` APFS clone).

## 13. Questions for him (the main session asks; the build proceeds on the defaults)

1. **Scope of the pipe cure.** The 23 harnesses will read every gate from files, so no harness can lose a verdict. A
   person or an agent who pipes a gate or the fault battery itself (`npm run conformance:pocket | tail`, `npm run
   smoke:fault | tail`) can still lose its last lines under load; its exit status is never lost. Default: leave the 61
   gates and the battery's exits as they are. The other choice is a later phase that gives each gate a flush-then-exit
   helper (measured lossless here, 200,023 of 200,023 bytes) when that gate is next edited.
2. **A held control client.** Default: the teardown ends it, client first, the server then leaves by itself, and the case
   passes with a note. A held pair is tmux waiting to write to a reader that the case's own SIGKILL removed. The other
   choice is to fail any case whose teardown had to end a held client, which is stricter but fails the battery for a
   side effect of its own kill.

## 14. The spec step's commands, exit codes and numbers

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `git clone --local --no-checkout`, `checkout --detach d87d414c`, `cp -Rc` of `node_modules` and `build/vendor` | 0 | 6 s | tmux 3.7b; `specstory --version` printed its update banner (it reached its server; stated) |
| `npm run build` in the parent (history block) | 0 | 50 s | §2.1 |
| `cp -Rc` of the built parent to `scratch/p361/spec/clone` | 0 | 6 s | 1.4 GB, an APFS clone |
| M1 counts (`a/gates.mjs`, `a/exits.mjs`, `a/harness-scope.mjs`, `a/spawners.mjs`, `git log`) | 0 | | §2.2 |
| M2 transport (`a/bin/slowread.mjs`, `a/bin/slowsock.py`, the toy) | 0 | | §2.3 |
| green sizes, the 18 gates to files in the clone | 0 each | 16 s pocket, 27 s machines, the rest under 16 s | §0.1 item 3 |
| M3 `a/bin/batch.sh`, 15 harnesses × slow and file, plus p313's first pair | 0 (p313 slow: 1, as measured) | about 17 min | §2.4 |
| M4 `a/bin/batch14.sh` | slow 1 / file 0 | 238 s / 234 s | §2.5 |
| M5 the battery, 9 runs under lock slot `electron.lock`, released each time by a trap | 0 each | 14 to 97 s | §2.6 |
| M6 the plants (`b/wedge*.mjs`, `b/p-parent*.mjs`), 35 | 0 each | 3 to 10 s each | §2.7 |
| M7 `b/crossver.mjs`, `b/wedge10.mjs` | 0 | | §2.8 |
| M8 the prototype (`b/proto/`), 9 runs | 0 | | §2.9 |
| The final count (`ps -Ao pid,ppid,rss,comm` and `ps -Ao pid,ppid,command`, outside the block) | 0 | | none of this step's: his Tortie (pid 692) and other applications' crash handlers; no process names a `gmux-fault-`, `gmux-p361-` or other scratch socket of mine, no such socket file is under `/private/tmp/tmux-501/`, his tmux server (6057) and its clients are untouched, no busy loop is left, every lock slot is free |

Lock slots: taken and released nine times (`electron.lock`, each at the first try). The plants, the counts and the
busy loops ran outside the history block, because `/bin/ps` cannot start inside it (§0), each with the
scratch environment of §0; the busy loops (30, 80 s each, one run) were ended by pid in a trap. History before and after
every
run: `743166 1793987027` and `23166 1790702242`, unchanged. Crash reports: 97 names and mtimes, unchanged. Disk: 56 GB
free before the first build, 50 GB at the last reading.

## §As built (the integrator, 2026-11-07)

The four builders' files as they returned them, plus the integrator's. `git diff d87d414c` is this phase alone: 29
tracked files changed and 3 new (`build/gate-run.mjs`, `build/scratch-tmux.mjs`, this file); nothing staged, committed
or stashed. Scratch, logs and the scripts named below are under `/private/var/tmp/tortie-wt/scratch/p361/integrator/`.

### What the integrator changed, and why

| File | Change | Where it comes from |
| --- | --- | --- |
| `package.json` | +3/−1: `conformance:scratchtmux` after `conformance:tmux-pair`; `gate:gaterun` after `gate:stapler`; `node build/gate-run.mjs --self-test` in `build`, right after `node build/assert-hermetic-checks.mjs` | §4.7 |
| `build/verification-checks.mjs` | +25: `pure('gate:gaterun', …)` after `gate:stapler` and `tmux('conformance:scratchtmux', …)` after `conformance:tmux-pair`, each with §4.7's needs and a paragraph | §4.7; `gate:checks` clause 3 (282 check scripts classified, 280 at the parent) |
| `CLAUDE.md` | +8/−4: `gate:gaterun` in the "run inside `npm run build`" sentence, with one sentence saying what it is; the `gate:checks` row gains "a file behind `ablation:*`, `build/gate-run.mjs`" and clause 9's line, and its cost reads "~0.7 s" where it read "~0.1 s" (measured below: 0.67 to 0.69 s at HEAD, 0.43 s at the parent); one new row, `conformance:scratchtmux`, after `gate:background`'s (17.2 s measured); one sentence in the machine discipline's Electron bullet | §4.7 |
| eight of harness-b's restore checks, one line each: `build/p3201/ablation.mjs:1891`, `p326:569`, `p331:802`, `p336:802`, `p340:578`, `p342:781`, `p343:1016`, and `p323:782`'s `control('last')` | a restore check the runner cannot read says `<TAG> restored UNREADABLE: <why>`, as harness-a's do, where it said `<TAG> UNREADABLE: the base could not be read: <why>` | a seam harness-a named (decision 1) |
| this file | this section | §4.7 |

Not changed, as §4.7 expected: `build/background-fixtures.mjs` (`gate:background` reads 581 files and 3 long-lived
starts, as the parent's 579 and 3: the pair is the app's start, so obligation 2 is not triggered),
`build/assert-electron-teardown.mjs` (181 reach the helper against `HELPER_USER_FLOOR` 181) and
`docs/audits/contract-baseline.txt` (`--check` matches byte for byte).

### Decisions the integrator made

1. **One set of words for an unreadable restore check, in all 23.** §4.3 item 2 has an unreadable restore check stop the
   run "with §5's base line". harness-a found that line false there (the restore check is not the base), used §5's
   reading line with the id `restored`, and asked the integrator to choose one form. harness-b used the base line. The
   true one is kept: only the base says `the base could not be read`, and every gate reading after the arms says
   `<TAG> restored UNREADABLE: <why>`. Eight one-line edits; no verdict, exit status or flow moved. Driven
   (`bin/plants.sh`): p323, p326 and p331 with their third gate run SIGKILLed each read `restored UNREADABLE: ended by
   SIGKILL` and exit 2; p323 with its first read `UNREADABLE: the base could not be read: ended by SIGKILL` and exit 2.
2. **`ablation:p3202` and `ablation:p324` ran one arm each.** Neither has an arm filter and §10 item 7 forbids a whole
   machines harness, so the clone's copy of each (never the tree's) loops `ARMS.slice(0, 1)`. harness-b ran both whole
   at HEAD and at the parent (15 of 15, 29 of 29, tables identical); the integrator changed neither file.
3. **The harnesses' clone.** A `cp -Rc` of the worktree after the build, its `.git` FILE removed (it reads `gitdir:
   /Users/gdc/gmux/.git/worktrees/wt-p361`, so a git command in the clone would write his repository's worktree
   index), and the ten harnesses that fix their scratch at `/private/tmp` (p314, p293, p296, p3201, p326, p331, p336,
   p340, p342, p343) pointed at `TMPDIR` by one `sed` each, as the spec step did.
4. **`npm test` ran with `TMPDIR` reached through `/var`**, which is a link, as the system's own is. Two builders' runs
   with a `TMPDIR` under `/private/var` failed `preview/protocol.test.ts` "sits behind a symlink" for that reason alone.
5. **Two `resolve.test.ts` cases failed in the first full suite and pass alone.** "shell that forks a stdout-holding
   child" and "shell that forks then EXITS without markers" give a fake login shell 300 ms; at a load near 12 the pid
   file it writes was never there (`ENOENT`). The file alone, twice, under the same block: 40 of 40. The last full run
   passed both. The phase changes no file under `src/`.
6. **The builders' departures from this spec, each accepted as built:**
   - `runner`: 9b is stricter than §4.2 (a const resolves only when it is the one binding of its name; `fork` counts;
     a flag before the script is a finding; a method named `exec` counts only on a child_process namespace), and 9a
     also refuses a spread in the options, a child_process function passed as a value and a dynamic import. 29 reader
     fixtures where §4.2 names 11. The self-test adds two checks: the cap is 67,108,864, and the fifth `why`.
   - `harness-a`: p268's and p273's inline arms are wrapped in `arm('<id>', …)`; p274 names an arm `rule N "<name>"`;
     p316 skips its "rule (x) has no arm that turned it red" check for an unreadable arm; p33311's modes take an
     unreadable freeze from the mode before; p313 names the check in its why (`gate ended by SIGKILL`).
   - `harness-b`: p331 reads its gate before vitest at the control and the restore check; p326's gate reading answers
     `{ why, results }`; p312 reads an arm whose collateral reading is unreadable as UNREADABLE; p343's control is
     UNREADABLE at its first unreadable check; p3202 and p324 name an arm `arm N`.
   - `pair`: `build/electron-run.mjs` loads `build/scratch-tmux.mjs` by a top-level `await import()` that holds a
     failure, because `gate:electron` rule 5 and `probe:p261` arm D copy the helper alone; in the tree a launch that
     names a scratch socket while the module did not load fails at step 6 with the reason. A socket must match
     `^gmux-[A-Za-z0-9._-]+$` (`gmux-x/../gmux` refused). The bare `tmux` candidate is left out when PATH finds a file
     already named. The self-test is 8 cases and 12 ablations where §4.4 says 7 and 6 (T8, the app's order, and six
     more). Words beyond §5: the note `<bin> did not reach the server: <why>`, the lsof, ps and module-load reasons,
     the battery's "could not be counted" line, `ms` in each case's `teardown`, and `leftovers` in `--json`.
7. **The unreadable-only summary differs between the halves, and both exit 2.** harness-a's harnesses repeat each
   unreadable line and exit 2 with no summary word; harness-b's print their problem list under `FAIL` and exit 2. Neither
   can print PASS over an unreadable reading. Left as built.

### Commands, exit codes and numbers (under the history block with `HOME` in scratch, except the two marked outside)

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `df -h /` | 0 | | 51 GB free at the start, 49 at the first build, 42 before the battery, 38 at the last build |
| `npm run typecheck` | 0 | 3 s | import boundaries 0 violations (1,437 files, 8,212 imports); 0 runtime cycles (1,434 files, 5,020 edges); shared types OK |
| `npm run build` | 0 | 53 s | `gate:electron` 579 files, 181 reach the helper against 181; `gate:background` 581 files, 3 long-lived starts each ended in a `finally`, 32 of 32 fixtures; `gate:simulator`, `gate:docker`, `gate:knownhosts` (609 files) PASS; `gate:checks` PASS, 282 check scripts, "23 harnesses run their gates through build/gate-run.mjs against a floor of 23, and the runner hands every gate two files (29 reader fixtures behaving)"; `gate-run self-test: PASS, 8 cases`; `conformance:ios` PASS, 55 rules; `gate:onlyadd` PASS; `conformance:harnessprobes` PASS, 689 files; stapler 31, 18, 28; `contract-inventory` OK |
| `npm test` | 1 | 61 s | 1,184 files; 22,343 tests: 22,323 passed, 6 failed, 14 skipped. The four `/bin/ps` tests (`process-table.native` ×1, `ps.native` ×2, `p269-env-names` "leaving no survivor", `spawnSync /bin/ps EPERM`) and decision 5's two. The five FSEvents tests 357 named did not fail |
| `resolve.test.ts` alone, twice | 0, 0 | 6 s, 6 s | 40 of 40 each |
| `npm run gate:background` / `gate:electron` / `gate:checks` / `gate:gaterun` | 0 ×4 | 2.4, 3.9, 0.78, 0.64 s | as in the build. `node build/assert-hermetic-checks.mjs` alone: 0.67 to 0.69 s at HEAD, 0.43 s at the parent (280 scripts), three runs each |
| `npm run conformance:scratchtmux`, OUTSIDE the block, §0's environment (`bin/out.sh`) | 0 | 17.5 s | "PASS, 8 cases and 12 ablations in 17.2 s": T1's held client ended by SIGTERM and its server gone in 2,188 ms, the plant held at the first attempt, both decoys untouched; T5 `kill-server` alone in 47 ms; every ablation red on its case; nothing left |
| `node build/<p>/ablation.mjs --self-test`, p3201, p3202, p336, p340, p342, p343 | 0 ×6 | 0.03 to 0.05 s | 10 fixtures; 3 outputs and 5 verdicts; 11; 10; 12; 16 |
| the 23 harnesses at HEAD, one at a time in the clone (`bin/harnesses.sh`) | 0 ×23 | 14 min 45 s | the table below; no reading said UNREADABLE |
| the restore-check plants (`bin/plants.sh`) | 2 ×4 | 1 to 15 s | decision 1 |
| the battery's four backup points, OUTSIDE the block under lock slot `electron.lock` (`bin/battery.sh backup-1`) | 0 | 34 s | `[fault] PASS — 5 cases`; teardowns 52 to 80 ms, 308 ms in all; its own count 0, `ps -Ao pid,ppid,command` naming `gmux-fault-` 0, no socket file left, no new crash report; load 20 to 45 |
| the same again (`backup-2`) | 0 | 32 s | PASS, 5 cases; 51 to 64 ms, 284 ms in all; 0; 0; load 44 to 67 |
| the whole battery (`whole`) | 0 | 59 s | `[fault] PASS — 20 cases`; 45 to 60 ms, 1,023 ms in all; 0; 0; no new crash report; a 147,598-byte log (145,014 at the parent); load 23 to 35 |
| `node build/contract-inventory.mjs --check` | 0 | 1.3 s | matches byte for byte |
| `npm run typecheck && npm run build && npm test`, the last run | 1 | 134 s | typecheck and build as above; 22,343 tests: 22,325 passed, 4 failed (the four `/bin/ps` tests), 14 skipped |

The battery's parent walls were 14 to 17 s and 55 s at a load of 4 to 18 (§2.6); these ran at 20 to 67, the load being
his own work (`next build` and `npm ci` under `/Users/gdc/runstory`, read and left alone). What the teardown adds is its
own time: 45 to 80 ms a case. No case held a pair, at HEAD as at the parent today (§0.1 item 7); every teardown read its
server's pid, found no client listed or held, sent `kill-server`, saw the server go and removed the socket. The
held pair is `conformance:scratchtmux`'s T1. The helper's existing note "ended 1 process the teardown found still
running" appears once a case, 20 of 20, as in every parent log of §2.6.

| Harness | Arms | At HEAD | Wall | At the parent (§2.4, §10 item 7) |
| --- | --- | --- | --- | --- |
| p273 | all 5 | OK | 4 s | OK, 3 to 5 s |
| p274 | all 13 | OK, 13 of 13 | 2 s | OK, 2 to 3 s |
| p268 | all 35 | PASS, 35 | 24 s | PASS, 19 to 22 s |
| p276 | `R10` | PASS | 4 s | PASS, 3 s |
| p296 | `A1` | PASS | 3 s | PASS, 3 s |
| p293 | `1` | PASS | 6 s | PASS, 7 s |
| p275 | `0` | PASS | 14 s | PASS, 13 s |
| p314 | `H1` | PASS | 20 s | PASS, 19 s |
| p307 | `R1` | PASS | 15 s | PASS, 15 s |
| p316 | `a1` | PASS | 24 s | PASS, 24 s |
| p33311 | `F1` | 1/1 red, exit 0 | 17 s | 1/1 red, 15 s |
| p323 | `A1` | PASS | 12 s | PASS, 11 s |
| p326 | `A1` | PASS | 2 s | PASS, 2 s |
| p331 | `P5` | PASS | 23 s | PASS (harness-b, 24 s) |
| p312 | all 23 | OK, 23 of 23 | 86 s, load 31 | OK, 62 to 82 s |
| p313 | `O3a`, `A4s` | PASS: `O3a` red on `O3`, `A4s` on `hostile` | 110 s | through a slow pipe `O3a` RED ELSEWHERE, nothing numbered; through files red on `O3`; 105 to 110 s |
| p3201 | `m1` | PASS | 84 s | PASS (harness-b, 92 s) |
| p3202 | arm 1 (decision 2) | OK, 1 of 15 | 50 s | whole: 15 of 15 (harness-b) |
| p324 | arm 1 (decision 2) | OK, 1 of 29 | 48 s | whole: 29 of 29 (harness-b) |
| p336 | `a113a` | PASS | 79 s | PASS (harness-b, 91 s) |
| p340 | `a010a` | PASS | 92 s | PASS, 81 to 106 s |
| p342 | `b142a` | PASS | 86 s | PASS (harness-b, 137 s) |
| p343 | `a-c51a` | PASS | 80 s | PASS (harness-b, 100 s) |

His shell history read `743166 1793987027` and `23166 1790702242` before and after every run, unmoved. The lock was
taken three times (`electron.lock`, each at the first try) and released by a trap each time. The count at the end, once,
outside the block: his own Tortie (pid 692) and other applications' crash handlers, and no Electron of this phase's; no
process names a `gmux-fault-`, `gmux-p361-` or scratch socket of the integrator's; `/private/tmp/tmux-501/` holds `gmux`
alone; his tmux server (6057) is untouched; crash reports, 92 names and mtimes read the integrator's way, unchanged;
every lock slot free. The integrator signalled nothing.

### What moves on purpose (§6), as measured here

- A reading whose gate died reads UNREADABLE: the plants of decision 1, harness-a's 12 and harness-b's 11, each
  `ended by SIGKILL`, exit 2.
- A gate's output is read whole to 64 MiB: `gate:gaterun`'s G2 (2,097,169 bytes) and harness-a's 2 MiB attack, where p268,
  p273 and p316 read at most 1 MiB before.
- The battery: each case's JSON gains `teardown`, the run's `--json` gains `leftovers`, a server not proven gone fails
  its case, and a process naming one of its sockets fails the run (pair's decoy run: named, exit 1, not signalled).
- Step 6: no launch here named `tmuxSocket` (the battery does not, §4.5), so it was not driven by a real Electron in this
  round; pair drove it through `withElectron` with a stand-in program (a held pair ended in 3.2 s; an unanswering server
  thrown after 15 s and not signalled).
- `npm run build` gains `gate:gaterun` (0.64 s through npm), and `gate:checks` takes about 0.25 s more.

### Found here, not this phase's

1. `ablation:p33311` run whole exits 1 at HEAD and at the parent alike: arms `A1` and `P0d` miss identically (harness-a).
2. p275's vitest lane reads an arm red on a non-zero exit alone, so a vitest that died reads as the arm red (harness-a).
3. p274's and p312's last `process.exit` overrides the `process.exitCode = 2` each sets when a file did not come back
   (harness-a, harness-b).
4. A gate that runs itself again under tsx hides its inner child's death behind a readable exit 1; §11 leaves a gate's
   own children alone (harness-a).
5. p268, p273, p274, p275 and p276 pass no timeout, as at the parent, so a gate that hangs hangs them (harness-a).
6. Nothing pins that a harness asks `readable` before it reads anything else: clause 9 pins only that the gate goes
   through `gateRun`. harness-a drafted a clause 9e with two fixtures and an ablation (both harness builders).
7. `gateRun` ends a timed-out gate with SIGTERM where p3202 and p324 passed SIGKILL, and spawnSync does not escalate,
   so a gate that ignored SIGTERM would hang them. None of the 17 piped gates installs a handler today (runner,
   harness-b).
8. Decision 5's two `resolve.test.ts` cases, which give a shell 300 ms, fail in a full suite at a load near 12.

### The fix round (the fixer, 2026-11-07)

The fix ran once, over both lenses' verdicts. Lens 1 (the pipe) read needs_work: two minors, one nit, and two rows
worse than the parent. Lens 2 (the pair) read needs_work: one major and one nit. Every major and minor is fixed, both
worse rows are fixed, and both nits are taken. Nothing is dropped. Scratch, scripts and logs are under
`/private/var/tmp/tortie-wt/scratch/p361/fix/`. `git diff d87d414c` is still this phase alone: the same 29 tracked files
and 3 new ones, now +2569/−404 tracked, `build/gate-run.mjs` 547 lines (378 before) and `build/scratch-tmux.mjs` 2,086
(1,637). Nothing was staged, committed or stashed.

| Finding | What changed | Where |
| --- | --- | --- |
| Lens 2 major: no gate pinned either re-read of a command line before a signal | Four driven cases and a parser rule in the self-test. **T9**: a raw holder (a `/usr/bin/perl` process naming `-L <socket>` and holding one connection) execs on tmux's `MSG_SHUTDOWN` (210) with the connection kept, so its command line changes before the teardown reads it again: not signalled, the verdict fails naming it. **T10**: a `run-shell` job holds the server past its clients, so step 7 runs: the server is SIGKILLed after its re-read and the verdict fails with "outlived". **T11**: a tmux stand-in answers for a server pid whose command line names no socket (an impostor started with `argv0`): step 7's re-read leaves it unsignalled and the verdict fails. **T12**: the TypeScript parser over the file itself: every `signalPid(` and every child handle's `.kill(` is the first statement under an `if` holding a fresh read of that pid's command line, or follows one that leaves unless it holds; `process.kill(` only in `signalPid`, and in `stateOf` with 0; `ownedPlant` reads `commandOf(` of its own argument; a floor of 7 signal calls. Four driven module ablations (each re-read removed, red on T9 and T11; the outlived failure removed, red on T10; the stopping words removed, red on T13) and six text ablations of the file, each red on T12 | `build/scratch-tmux.mjs` (self-test only, below its mark), CLAUDE.md's row, `build/verification-checks.mjs`'s needs |
| Lens 1 minor: 9b held only for `process.execPath` and `'node'`; six spellings passed it green | 9b is now a rule of shapes, not of spellings. A start in a harness is node however spelled (`process.execPath`, `process.argv[0]`, `argv0`, through `globalThis` or a string key, a destructured or held copy, a path ending `/node`, `fork`) on a script that resolves to a non-gate with no other argument naming a gate, or a program by a resolving name that is not a launcher (a shell, a wrapper, a package runner or a script runtime) handed no gate and no `conformance:` or `gate:` script. Findings: `exec`/`execSync`, the `shell` option, a launcher, an unresolved program, options it cannot read, a child_process function passed around (an alias, `.call`, a string key, a destructuring) or loaded at run time, and a `Worker`. Every module a harness reaches by a relative import is held to the same starts. 26 new reader fixtures (29 to 55) and six more shipping-text ablations over p268 (one to seven) | `build/assert-hermetic-checks.mjs`, CLAUDE.md's `gate:checks` row |
| Lens 1 minor, worse row 1: p3202 and p324 lost their `killSignal: 'SIGKILL'` | `gateRun` takes `killSignal`, SIGTERM (spawnSync's default, the other 21 harnesses' at the parent) or SIGKILL; anything else throws before anything starts. p3202 and p324 pass SIGKILL again. Self-test G10 (a gate that ignores SIGTERM, ended at the bound) and G12 (a signal refused) | `build/gate-run.mjs`, `build/p3202/ablation.mjs`, `build/p324/ablation.mjs` |
| Lens 1 nit, worse row 2: a full scratch volume cut a gate's output silently | After the gate exits, before its output leaves the volume, the runner writes a probe beside it of `GATE_RUN_ROOM_BYTES` (64 KiB) or the gate's longest line when that is longer; a volume that refuses it reads `the volume holding its output ran out of room (<code>)`. And a folder or file the runner cannot make (the same full volume) reads `could not make its output files: <code>`, where before it threw and took the harness down. Self-test G9, G11 and G13 | `build/gate-run.mjs`, CLAUDE.md's `gate:checks` row |
| Lens 2 nit: a server already told to stop read like a missing tmux | A candidate answering `server exited unexpectedly` gets `(a server already stopping closes every new connection)` beside it, read from tmux's own `server_accept` (`if (server_exit) { close(newfd); return; }`). T13 drives it and an ablation reddens it. The limit stays, named below | `build/scratch-tmux.mjs` (`reachServer`) |

The integrator's "Found here" item 7 is fixed by the third row.

#### Decisions the fixer made, each with where it comes from

1. **The full-volume row is fixed, not dropped.** Dropping files brings the pipe back, which is the defect. The fix
   makes the row read UNREADABLE with why, where it read a cut file as readable; today's pipe still reads it whole, and
   that difference is stated in the rows below rather than hidden. The charter's mechanism (a)2 is that an arm whose
   gate's last line did not arrive reads UNREADABLE; lens 1's fix named the same outcome. **What stays his choice**: on
   a full or unwritable scratch volume this build refuses (UNREADABLE, exit 2) where today's pipe reads the gate whole.
   That is the price of files, measured in the Scenarios table (the toy gate, `ablation:p273` and an unmakeable
   folder); keeping it, or going back to pipes and their lost lines, is his to rule, and this round does not rule it.
2. **A probe, not `statfs`.** Measured on scratch images (`bin/fillprobe.mjs`): HFS+ fills to 0 bytes free under small
   writes, leaves 12,288 under 64 KiB writes, and refuses a 1 MiB or 4 MiB write whole with 864,256 bytes still free;
   APFS (8 MB) stops 64 KiB writes with 1,093,632 bytes free, 1 MiB writes with 1,683,456, and refuses a 4 MiB write
   with 3,780,608 free. Free space says nothing; a write refused for room is answered by asking for room. Node drops
   every write after the first refused one and never raises the error before the gate's `process.exit` (stderr 0
   bytes, with room for it). The probe is at least the gate's longest line because a volume that takes a write of that
   size took every line; every gate writes line by line.
3. **The kill signal is an option, not an escalation.** spawnSync cannot escalate, and 21 of the 23 harnesses used
   SIGTERM at the parent. Restoring each harness's own signal is the parent exactly.
4. **9b by shapes.** A spelling list loses to the next spelling. npm's runner (`npx`) is not in the launcher list
   because clause 1 already refuses its name in every file under `build/`; writing it there made clause 1 red.
5. **The Perl holder, the stand-in impostor and the mark.** A tmux server's command line cannot be made to change, so
   T11 drives step 7's re-read with a stand-in that names another pid as the server. `/usr/bin/perl` is macOS's own and
   already used by `build/p323/probe-p323.mjs`, and it can clear close-on-exec on its connection; Node 22.23.1 has
   `process.execve`, but no call that keeps a socket open across it. An exec'd holder, the job and the impostor
   carry `p361-plant-<socket>` (argv[0], or a job's last word), so the self-test's `ownedPlant` re-reads each one's
   command line before its own `finally` signals it. On this Mac `ps -o comm=` shows argv[0], so the teardown keeps
   asking the stand-in.
6. **`gate:background` was not changed, and does not see the holder.** It reads a name's value only up to the first `;`
   of its line, so no multi-statement source handed to a spawn is read for a loop (nor the planted parent's, nor the
   decoys'), one-line or not. This phase refuses changes to what a gate checks. What pins the holder's end is the
   self-test's own count, measured below.

#### Commands, exit codes and numbers

Under the history block with `HOME` in scratch, except the rows marked outside (`/bin/ps`, `lsof` and Electron cannot
start inside it).

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `node build/gate-run.mjs --self-test` | 0 | 0.87 s | PASS, 13 cases |
| 7 runner ablations in scratch copies (`bin/ablate-runner.mjs`) | 1 each | 0.8 to 2.6 s | kill signal hard-coded: G10 red (2,030 ms, woke); room never asked: G9 and G11; probe size fixed: G11 (`[65536,65536]`); signal not checked: G12; room words dropped: G9; stdout on a pipe: G1, G2 (`ENOBUFS`) and more; the folder throw put back: G13 (`ENOENT … mkdtemp`) |
| full volume, the toy gate (5,880 lines of 100 B and its verdict, `bin/fullvol.mjs`) on 1 MB HFS+ and 8 MB APFS images | 0 | | see the rows below |
| a stand-in that ignores SIGTERM, 500 ms bound (`bin/killsig.mjs`) | 0 | | SIGKILL: 510 ms, `timed out after 500 ms`, signal SIGKILL; the default: 3,038 ms, status 0, as spawnSync does for the other 21 |
| `node build/assert-hermetic-checks.mjs` | 0 | 0.88 s (0.876, 0.883, 0.880) | PASS, 282 check scripts, 23 harnesses against 23, 55 reader fixtures; the integrator's was 0.67 to 0.69 s |
| 12 plants and a control in a clone, `gate:checks` after each (`bin/pin-attack.mjs`), restored by sha256 | 0 control, 1 each | 0.8 to 1.1 s | lens 1's V1 to V6 and C1 on p273, the spec's S1 and S2, p313's `runChecks` on `process.argv[0]` (E1), a helper that pipes the gate (H1) and a namespace alias (M1): each red naming the file and line (`p273…:53`, `ablation-p313.mjs:9151`, `p273/pipe-helper.mjs:2` "imported by build/p273/ablation-vocabulary.mjs", `gate-run.mjs` stdio word `'pipe'`) |
| `npm run conformance:scratchtmux`, OUTSIDE, §0's environment (`bin/out.sh`) | 0 | 42.6 s | PASS, 13 cases and 22 ablations in 42.3 s: T1 2,196 ms; T9 5,150 ms; T10 4,073 ms; T11 4,235 ms; T12 18 ms; T13 322 ms; every new ablation red on its case |
| the same over the final file (after the holder's comment and form were settled), OUTSIDE | 0 | 42.4 s | PASS, 13 cases and 22 ablations in 42.1 s at a load of 9 to 14: T1 2,163 ms, T9 5,190 ms, T10 4,086 ms, T11 4,196 ms, T12 14 ms, T13 285 ms |
| the same in a clone with endPlanted's kill of the holders removed, OUTSIDE | 1 | 43 s | FAIL, 3 problems: T12 "found 6 signal call(s), where … 7"; that text ablation found nothing to edit; "left running after the run, and ended: 2552 (ppid 2307) p361-plant-gmux-p361-2307-6 -e select(undef, undef, undef, 60)". `ps` naming `gmux-p361-` or `p361-plant-` after: 0 |
| `gate:background` over a control, the same removal and the holders' list left unwalked, with the source as written and on one line (`bin/bg-attack.mjs`) | 0 ×6 | | 581 files, 3 starters, 32 of 32 fixtures: green each time (decision 6) |
| plant experiments (`bin/exp.mjs`), OUTSIDE | 0 | | `ps -o comm=` of a process started with `argv0` reads the argv0; the holder held through `kill-server` (`msg 210`, `exec`, command line `p361-plant-… -e select(…)`); a new client then read `server exited unexpectedly`; a `run-shell` job held its server 2.5 s past `kill-server` with its client gone; 0 left |
| `ablation:p273` on 4,096 bytes free (`bin/fullvol-harness.sh`), twice | | | parent: OK, exit 0; HEAD: `UNREADABLE: the base could not be read: the volume holding its output ran out of room (ENOSPC)`, exit 2; HEAD with the room never asked: exit 1, "1. rule 15 did not go red" to "4. rule 16 did not go red". Identical both times; the image held nothing else |
| `npm run typecheck` | 0 | 2 s | import boundaries 0 violations (1,437 files, 8,212 imports); 0 runtime cycles (1,434 files, 5,020 edges); shared types OK |
| `npm run build` | 0 | 49 s | `gate:electron` 579 files, 181 against 181; `gate:background` 581 files, 3, 32 of 32; `gate:docker`; `gate:knownhosts` 609 files; `gate:checks` PASS (54 fixtures, before the Worker fixture); `gate-run self-test` PASS, 12 cases (before G13); `conformance:ios` PASS, 55 rules; `gate:onlyadd` PASS; `conformance:harnessprobes` PASS, 689 files; stapler 31, 18, 28; `contract-inventory` OK |
| `npm test` | 1 | 56 s | 1,184 files; 22,343 tests: 22,325 passed, 4 failed (the four `/bin/ps` tests), 14 skipped |
| `npm run typecheck && npm run build && npm test`, the last run, over the final tree | 1 | 113 s | typecheck as above; build as above with `gate:checks` at 55 reader fixtures and `gate-run self-test: PASS, 13 cases`; 22,343 tests: 22,325 passed, 4 failed (the four `/bin/ps` tests: `process-table.native` ×1, `ps.native` ×2, `p269-env-names` "leaving no survivor"), 14 skipped; load 3 rising to 17 beside the second harness batch |
| `npm run gate:background` / `gate:electron` / `gate:checks` / `gate:gaterun` | 0 ×4 | 2.13, 3.60, 0.95, 0.96 s | as in the build |
| `node build/<p>/ablation.mjs --self-test`, p3201, p3202, p336, p340, p342, p343 | 0 ×6 | | 714, 147, 709, 642, 800 and 1,129 bytes, equal to lens 1's |
| the battery's four backup points, OUTSIDE, lock slot `electron.lock` (`bin/battery.sh backup-1`) | 0 | 15 s | `[fault] PASS — 5 cases`; teardowns 46 to 47 ms, 231 ms in all; leftovers `[]`; `ps` naming `gmux-fault-` 0; socket files 0; new crash reports 0; load 3.2 to 3.3 |
| the same (`backup-2`) | 0 | 14 s | PASS, 5 cases; 42 to 53 ms, 233 ms; 0; 0; 0; 0 |
| the whole battery (`whole`) | 0 | 56 s | `[fault] PASS — 20 cases`; 44 to 53 ms, 926 ms in all; leftovers `[]`; 0; 0; 0; a 147,900-byte log; load 3.4 to 4.9 |
| the 23 harnesses at HEAD, one at a time in a `cp -Rc` clone with the integrator's arms and its two clone-only edits (`bin/harnesses.sh`) | 0 ×23 | 13 min 13 s | every verdict as the integrator's table (below); no reading said UNREADABLE; load 3.4 to 4.9. This clone's runner had the room probe and the kill signal, not yet the folder change |
| the same over the final tree (`bin/harnesses2.sh`) | 0 ×23 | 13 min 25 s | the same 23 verdicts; no UNREADABLE; load 2.7 rising to 17 beside the last run |
| the integrator's restore-check plants over the final runner (`bin/plants.sh`, its preload) | 2 ×4 | 1 to 14 s | p323, p326 and p331 with their third gate run SIGKILLed: `restored UNREADABLE: ended by SIGKILL`; p323 with its first: `UNREADABLE: the base could not be read: ended by SIGKILL`; as the integrator read them |
| `node build/contract-inventory.mjs --check` | 0 | 0.63 s | matches byte for byte |

| Harness | Arms | First batch | Final tree | Verdict, both batches | The integrator's wall |
| --- | --- | --- | --- | --- | --- |
| p273 | all 5 | 3 s | 3 s | OK | 4 s |
| p274 | all 13 | 2 s | 2 s | OK, 13 of 13 | 2 s |
| p268 | all 35 | 17 s | 18 s | PASS, 35 | 24 s |
| p276 | `R10` | 4 s | 4 s | PASS | 4 s |
| p296 | `A1` | 3 s | 3 s | PASS | 3 s |
| p293 | `1` | 6 s | 6 s | PASS | 6 s |
| p275 | `0` | 13 s | 13 s | PASS | 14 s |
| p314 | `H1` | 20 s | 21 s | PASS | 20 s |
| p307 | `R1` | 15 s | 25 s | PASS | 15 s |
| p316 | `a1` | 23 s | 37 s | PASS | 24 s |
| p33311 | `F1` | 15 s | 15 s | 1/1 red, exit 0 | 17 s |
| p323 | `A1` | 12 s | 12 s | PASS | 12 s |
| p326 | `A1` | 2 s | 3 s | PASS | 2 s |
| p331 | `P5` | 22 s | 23 s | PASS | 23 s |
| p312 | all 23 | 59 s | 59 s | OK, 23 of 23 | 86 s (load 31) |
| p313 | `O3a`, `A4s` | 100 s | 100 s | PASS: `O3a` red on `O3`, `A4s` on `hostile` | 110 s |
| p3201 | `m1` | 74 s | 75 s | PASS | 84 s |
| p3202 | arm 1 | 47 s | 49 s | OK, 1 of 15 | 50 s |
| p324 | arm 1 | 47 s | 48 s | OK, 1 of 29 | 48 s |
| p336 | `a113a` | 72 s | 72 s | PASS | 79 s |
| p340 | `a010a` | 90 s | 71 s | PASS | 92 s |
| p342 | `b142a` | 76 s | 70 s | PASS | 86 s |
| p343 | `a-c51a` | 71 s | 76 s | PASS | 80 s |

p307 and p316 ran beside the last run's build at a load near 17 in the second batch; the probe is one write of 64 KiB a reading.

His shell history read `743166 1793987027` and `23166 1790702242` before and after every run, unmoved. The lock was
taken three times (`electron.lock`, each at the first try, for the battery alone) and released by its trap each time.
The scratch disk images were attached `-nobrowse` under the fixer's scratch and detached and deleted in a trap; none is
mounted. The count at the end, once, outside the block: his Tortie (692) and other applications' crash handlers, no
Electron of this round; no process names a `gmux-fault-`, `gmux-p361-` or `p361-plant-` socket or mark, or the fixer's
scratch; no stopped process; `/private/tmp/tmux-501/` holds `gmux` alone; his tmux server (6057) is untouched; crash
reports, 92 names and mtimes, unchanged from before the first battery run; every lock slot free; 45 GB free. The fixer
signalled only its own plants' and experiments' processes, each by pid after its command line was read again.

#### Scenarios, today against this build

| Scenario | Today (the parent) | This build after the fix round | Worse |
| --- | --- | --- | --- |
| A gate that ignores SIGTERM past p3202's or p324's bound | SIGKILL at the bound (lens 1: 502 ms of 500) | SIGKILL at the bound (510 ms of 500); before the fix 3,022 ms | no |
| The same gate under any other harness | SIGTERM, then waits for the gate | the same (3,038 ms of 500) | no |
| A full scratch volume, HFS+ 1 MB, 200 KB left, the toy gate | the pipe reads 588,029 B whole | `UNREADABLE: the volume holding its output ran out of room (ENOSPC)`; before the fix it read 204,800 B as readable | **yes** (corrected in the drop round): a refusal where today's pipe reads the gate whole. The reverify read it as worse, and it is |
| A full scratch volume, APFS 8 MB, 1.5 MB left | whole | UNREADABLE (ENOSPC); before the fix 528,300 B read as readable | **yes**, as above |
| A volume nearly full that holds the output: HFS+ 844 KB free, APFS 3 MB free | whole | whole (588,029 B, readable) | no |
| A nearly full volume that refuses one line longer than the room probe (added in the drop round) | whole | the probe (64 KiB, or the longest line that landed) passes, Node drops every write after the refused one, and the cut file reads as readable (the fix round's own limit, item 11; the reverify's `longline` case) | **yes**: cut, where today reads whole |
| A nearly full volume whose room comes back before the gate ends, the gate removing its own scratch (added in the drop round) | whole | the probe passes and the cut file reads as readable (item 11; the reverify's `cameback` case) | **yes**: cut, where today reads whole |
| `ablation:p273` with 4,096 bytes free | OK, exit 0 | UNREADABLE base, exit 2; before the fix four arms "did not go red", exit 1 | **yes**: as the first row |
| A folder the runner cannot make (an unwritable or full `TMPDIR`) | the pipe needs no folder and reads the gate | UNREADABLE `could not make its output files: <code>`; before the fix a throw that ended the harness | **yes**: a refusal where the pipe needs no folder |
| A gate that prints without end (added in the drop round) | each harness's `maxBuffer` (1 to 64 MiB) ends it | its two files have no bound while it runs, so it writes until the volume holding `TMPDIR` (his disk) is full, and six harnesses pass no timeout (p268, p273, p274, p275, p276, p312) | **yes** (the reverify's first row) |
| A held client whose command line changes before its signal | nothing signalled, the pair left, the case PASS (lens 2, C0's mechanism) | not signalled, the server ended after its own re-read, the verdict fails naming the client (T9) | no |
| A server pid that names no socket at step 7 | nothing signalled; a server that stays is left, PASS | not signalled, the verdict fails naming it (T11) | no |
| A server already told to stop and still held | pair left silently | pair left, the verdict fails naming why, with "a server already stopping closes every new connection" | no |
| The battery, backup points twice and whole once | PASS (§2.6) | PASS, 0 left, teardowns 42 to 53 ms a case | no |
| One arm of each of the 23 harnesses | the verdicts of §2.4 | the same 23 at both batches; walls at or under the integrator's, but p307 and p316 in the second, beside the build at a load near 17 | no |
| The six harness self-tests | exit 0 | exit 0, the same bytes | no |

The rows marked yes are half (a)'s, and the drop round took half (a) out with them (§As built, "### The drop round"). The
reverify counted four rows: the gate that prints without end, and three readings on a nearly full volume (UNREADABLE, or
cut). The other full-volume refusals above are the same class.

#### Found here, not this phase's (the fix round)

9. `gate:background` reads a name's value only up to the first `;` of the line it is assigned on
   (`assignedValues` in `build/scan-source.mjs`), so a multi-statement source handed to a spawn is never read for a
   loop or a sleeper. Measured: endPlanted's kill of the holders removed, the gate read green; the self-test read FAIL
   and ended the one holder its count found. A phase that widens it adds the shape to `build/background-fixtures.mjs`
   (CLAUDE.md's second obligation).
10. A held server already told to stop closes every new connection, so no teardown can reach it and its pair stays.
    HEAD now fails the case and says why; the parent left it silently (lens 2's nit).
11. The room probe's limits: a refused write longer than the probe, or room that came back before the gate ended (a
    gate removing its own scratch from the same volume), is not seen.
12. 9b's limit: a plain program handed arguments that do not resolve (git with a caller's arguments) is taken at its
    name.

### The drop round (the fixer, 2026-11-08)

The reverify after the fix round answered needs_work on half (a) alone. It found four rows worse than today: a gate
that prints without end now fills the runner's scratch volume (his disk), where every harness's `maxBuffer` stopped it
at 1 to 64 MiB, and six harnesses pass no timeout; and on a nearly full volume three readings that the pipe read whole
now read UNREADABLE or cut (the Scenarios table above, corrected). Half (b)'s major was fixed, and two nits remained on
it. Nothing pinned that a re-read of a pid's command line is fresh: a memoized `commandOf` passed every check. And
nothing pinned that a ps that cannot answer is never read as gone.

**His ruling (2026-11-08, "3. a")**: land half (b) now, and redo half (a) as a smaller fix, queued as **Phase 361.1**.
In 361.1, `build/conformance-pocket.mjs`, the one gate whose red output is larger than the pipe today, sets its exit
code and returns, or exits only once its writes have flushed. The spec step measured that as lossless, 200,023 of
200,023 bytes (§2.3). The spec's two questions stand on their defaults: the 61 gates' exits stay as they are (§13 Q1),
and a case whose teardown had to end a held client passes with a note (§13 Q2, D12).

This round ran once. It removed half (a) and nothing else, and it pinned half (b)'s two re-read rules. Half (a) is saved
under `/private/var/tmp/tortie-wt/scratch/owed-p3611/`, which sits outside this phase's scratch on purpose. Scratch,
scripts and logs are under `/private/var/tmp/tortie-wt/scratch/p361/drop/`. `git diff d87d414c` is now half (b) alone:
5 tracked files (+282/−81: `CLAUDE.md` +4/−1, `build/electron-run.mjs` +114/−10, `build/fault-harness.mjs` +145/−70,
`build/verification-checks.mjs` +18, `package.json` +1) and 2 new ones (`build/scratch-tmux.mjs` at 2,230 lines, up from
2,086, and this file). Nothing was staged, committed or stashed. No CHANGELOG item.

| Item | What changed | Where |
| --- | --- | --- |
| D1, half (a) saved first | The 28 files the drop would touch were copied to `owed-p3611/pre-drop/`, with `pre-drop.sha256`. After the drop came `gate-runner.patch`, in git-apply format, which takes the post-drop tree back to `pre-drop/` for those 28 files: +2,836/−323, 279,174 bytes, sha256 `918b3611…`. Beside it go `README.md`, naming the reverify's four rows, and copies of the reverify's half (a) instruments. `git -C wt-p361 apply --check` exits 0 right after the drop and again at the end of the round. Applied to a scratch copy of the 27 post-drop files, all 28 sums match (`shasum -c` exit 0) | `/private/var/tmp/tortie-wt/scratch/owed-p3611/` |
| D2, half (a) removed | `build/gate-run.mjs` is gone. The 23 harnesses and `build/assert-hermetic-checks.mjs` come from `d87d414c`'s blobs, and 24 of 24 are proved equal three ways: by blob id (`git hash-object` against `git rev-parse d87d414c:<path>`), and by sha256 against the blob and against the built parent's file. `package.json` loses `gate:gaterun` and the runner's step in `build`. `build/verification-checks.mjs` loses the `gate:gaterun` row. `CLAUDE.md` loses the runner from the build-gates sentence and from the `gate:checks` row, whose cost goes back to "~0.1 s"; both read as the parent's, byte for byte. The drop left half (b) alone: `build/scratch-tmux.mjs`, `build/fault-harness.mjs`, `build/electron-run.mjs` and this file are sha256-equal before and after it | the tree |
| D3, half (b)'s two nits | **T14**, a held client whose command line changes AFTER its SIGTERM. The fix round's perl holder gains a `term` mode: on SIGTERM it execs as `p361-plant-<socket>`, keeping its connection. Step 6 SIGTERMs it, reads it again before the SIGKILL, finds the socket no longer named, and leaves it. The verdict fails naming it, and the server, outliving its clients, is SIGKILLed after its own re-read. **T15**, a ps that cannot answer: the module runs from a copy of its text with `const PS` swapped. (a) A stand-in exits 2 for `-p <server pid> -o stat=` alone and hands every other question to `/bin/ps`; the teardown waits out its bound, ends the held client, and only then sees the server go (ok). (b) No ps at all: the teardown never calls the server gone, keeps the socket file, signals nothing and fails. **Two module ablations**, each red: `commandOf` answered from a memo reads red on T14 `signalled`, and `alive()` reading `unknown` as gone reads red on T15 `gone`. `runModuleAblation` now hands its case the ablated text | `build/scratch-tmux.mjs`: the self-test, below its mark. Above it, only the header's paragraph on the self-test moves, and no line of the module's code does |
| D4, words | This section; the Scenarios table's full-volume rows corrected (four cells now read yes, and three rows added); `CLAUDE.md`'s `conformance:scratchtmux` row (T1 to T15, 24 ablations, ~65 s, "read again, fresh", "never reads a pid gone when ps cannot answer"); `build/verification-checks.mjs`'s block for it (a stand-in ps in its needs) | this file, `CLAUDE.md`, `build/verification-checks.mjs` |

#### Decisions the fixer made, each with where it comes from

1. **`build/assert-hermetic-checks.mjs` goes back to the parent whole.** Half (b) needed no line there. All 1,230 added
   lines were clause 9 (§4.2's builder `runner`), and `conformance:scratchtmux` is classified in
   `build/verification-checks.mjs`, which clause 3 reads: 281 check scripts, the parent's 280 plus that one.
2. **The patch was made right after the drop, before D3's words.** That is the brief's order, and it is why a scratch
   copy reproduces `pre-drop.sha256` exactly. It still applies to the final tree, because the two lines D4 changed
   afterwards (the `conformance:scratchtmux` row and block) sit outside its hunks. Applied there, 26 files match
   `pre-drop.sha256`, and `CLAUDE.md` and `build/verification-checks.mjs` differ only in those lines.
3. **T14 is driven, not a text rule.** T12's parser rule accepts a memoized `commandOf`, because the call is still
   written inline before the signal. Only a pid whose command line changes between two reads of one teardown can tell a
   memo from a read. T9's holder cannot, because its first re-read is also the first read. The reverifier's own
   ablation A3 (`scratch/p361/reverify/bin/st-ablate.mjs`) read PASS at the fix round. Over this tree it reads FAIL,
   with T14 red on `signalled`, `why`, `ok` and `server`.
4. **T15 swaps the ps in a copy of the module, and the export surface does not move.** `PS` is a constant, so the case
   drives a copy of the module's text, the way every module ablation already drives a copy. For its ablation, the copy
   is of the ablated text. Two failures are driven because `stateOf` has two branches to `unknown`: an exit that is
   neither 0 nor ps's own "no such pid" (status 1 with nothing printed, which stays `gone`), and a ps that will not
   start, which is what the history block's EPERM is. The reverifier's own ablation A6 read PASS at the fix round. Over
   this tree it reads FAIL, with T15 red on `gone` at (a) and at (b).
5. **The words follow the new cases.** `CLAUDE.md`'s row is half (b)'s and stays, made true for T14, T15 and the 24
   ablations, with the time measured twice. The `gate:checks` row and the build-gates sentence go back to the parent's
   text. Nothing else in `CLAUDE.md` moves.

#### Commands, exit codes and numbers

Under the history block with `HOME` and `TMPDIR` in scratch (`bin/sbp.sh`), except the rows marked outside, which ran
with §0's environment (`bin/out.sh`, `bin/battery.sh`), because `/bin/ps`, `lsof` and Electron cannot start inside it.

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `df -h /` | 0 | | 48 GB free at the start, 43 before the build and the battery, 44 at the end |
| D1, the copies, `pre-drop.sha256`, `git diff --no-index` into the patch | 0 (1 from `git diff`, which means a difference was found) | | 28 files, 28 sums; 28 file headers in the patch, the runner's new-file header written `a/`…`b/` |
| D2: `git cat-file blob d87d414c:<path>` for 24 files, `rm build/gate-run.mjs`, five edits | 0 | | 24 of 24 equal by blob id and sha256; half (b)'s four files sha256-equal before and after |
| `git -C wt-p361 apply --check gate-runner.patch`, after the drop and again at the end | 0, 0 | | `28 files changed, 2836 insertions(+), 323 deletions(-)` |
| the patch over a scratch copy of the 27 post-drop files, then `shasum -a 256 -c pre-drop.sha256` | 0, 0 | | 28 of 28 OK |
| `npm run conformance:scratchtmux`, OUTSIDE (first run over the new cases) | 0 | 67 s | PASS, 15 cases and 24 ablations in 66.0 s: T14 7,318 ms, T15 6,568 ms; both new ablations red (`signalled`, `gone`) |
| the reverifier's ablations A3 and A6 over a `cp -Rc` clone, OUTSIDE (`bin/st-ablate.mjs`, its own script with only the clone path changed) | 0 (each self-test 1) | 117 s | A3: FAIL, T14 red on `signalled`, `why`, `ok`, `server`; A6: FAIL, T15 red on `gone` at (a) and (b) and on `ok`. Both read PASS at the fix round. The clone's file restored by sha256 after each; no leak reported |
| `npm run typecheck` | 0 | 7 s | import boundaries 0 violations (1,437 files, 8,212 imports); 0 runtime cycles (1,434 files, 5,020 edges); shared types OK |
| `node build/contract-inventory.mjs --check` | 0 | 2 s | matches byte for byte |
| `npm test` (`TMPDIR` through `/var`, as the integrator's decision 4) | 1 | 146 s | 1,184 files; 22,343 tests: 22,324 passed, 5 failed, 14 skipped. The four `/bin/ps` tests (`process-table.native` ×1, `ps.native` ×2, `p269-env-names` "leaving no survivor") and `symbols/store.test.ts` "answers a three-letter query over 100k symbols inside the budget" (242.8 ms against 161.7) at a load of 83 to 109 |
| `src/main/symbols/__tests__/store.test.ts` alone, twice | 0, 0 | 1 s each | 15 of 15 each, at a load near 67. The phase changes no file under `src/` |
| `npm run build` | 0 | 62 s | `gate:electron` 578 files, 181 reach the helper against `HELPER_USER_FLOOR` 181; `gate:background` 580 files, 3 long-lived starts each ended in a `finally`, 32 of 32 fixtures; `gate:simulator`, `gate:docker`, `gate:knownhosts` (608 files) PASS; `gate:checks` PASS, 281 check scripts, no clause 9 line; `conformance:ios` PASS, 55 rules; `gate:onlyadd` PASS; `conformance:harnessprobes` PASS, 689 files; stapler 31, 18, 28; `contract-inventory` OK. No `gate-run self-test` line |
| `npm run gate:background` / `gate:electron` / `gate:checks` | 0 ×3 | 2.31, 3.90, 0.71 s | as in the build |
| `npm run gate:gaterun` | 1 | | `Missing script: "gate:gaterun"` |
| `npm run conformance:scratchtmux`, OUTSIDE, over the final file | 0 | 65 s | PASS, 15 cases and 24 ablations in 64.9 s at a load of 22 falling to 13: T1 2,199 ms (the plant held at the first attempt), T9 5,315, T10 4,237, T11 6,622, T13 359, T14 7,389, T15 6,591 ms |
| `node build/<p>/ablation.mjs --self-test`, p3201, p3202, p336, p340, p342, p343, at HEAD and at the built parent | 0 ×12 | | 714, 147, 709, 642, 800 and 1,129 bytes; HEAD's equal to the parent's by sha256, each |
| the battery's four backup points, OUTSIDE, lock slot `electron.lock` (`bin/battery.sh backup-1`) | 0 | 16 s | `[fault] PASS — 5 cases, every invariant held`; teardowns 55 to 57 ms, 280 ms in all; no client held; leftovers `[]`; `ps` naming `gmux-fault-` 0; socket files 0; crash reports 92 before and 92 after; load 9 |
| the whole battery, OUTSIDE, lock slot `electron.lock` (`bin/battery.sh whole`) | 0 | 61 s | `[fault] PASS — 20 cases, every invariant held`; teardowns 51 to 63 ms, 1,146 ms in all; no client held, no note; leftovers `[]`; 0; 0; 92 and 92; a 147,320-byte log; load 10 to 8 |
| one arm of each of the 23 harnesses, one at a time in a `cp -Rc` clone made after the build, with the integrator's arms and its two clone-only edits (`bin/harnesses.sh`) | 0 ×23 | 17 min 25 s | every verdict as at the parent (below); no reading said UNREADABLE (the word is no longer in any harness); load 7 at the start, near 138 at its height (two other workflows), 11 at the end |

| Harness | Arms | After the drop round (the parent's bytes) | Wall | At the parent (§2.4, §10 item 7) |
| --- | --- | --- | --- | --- |
| p273 | all 5 | OK | 4 s | OK, 3 to 5 s |
| p274 | all 13 | OK, 13 of 13 | 1 s | OK, 2 to 3 s |
| p268 | all 35 | PASS, 35 | 20 s | PASS, 19 to 22 s |
| p276 | `R10` | PASS | 4 s | PASS, 3 s |
| p296 | `A1` | PASS | 3 s | PASS, 3 s |
| p293 | `1` | PASS | 6 s | PASS, 7 s |
| p275 | `0` | PASS | 14 s | PASS, 13 s |
| p314 | `H1` | PASS | 19 s | PASS, 19 s |
| p307 | `R1` | PASS | 17 s | PASS, 15 s |
| p316 | `a1` | PASS | 37 s | PASS, 24 s |
| p33311 | `F1` | 1/1 red, exit 0 | 31 s | 1/1 red, 15 s |
| p323 | `A1` | PASS | 18 s | PASS, 11 s |
| p326 | `A1` | PASS | 3 s | PASS, 2 s |
| p331 | `P5` | PASS | 26 s | PASS (harness-b, 24 s) |
| p312 | all 23 | OK, 23 of 23 | 69 s | OK, 62 to 82 s |
| p313 | `O3a`, `A4s` | PASS: `O3a` red on `O3`, `A4s` on `hostile`, through the pipe at a load near 30 | 122 s | through files red on `O3`; through a SLOW pipe `O3a` RED ELSEWHERE (§2.4); 105 to 110 s |
| p3201 | `m1` | PASS | 91 s | PASS (harness-b, 92 s) |
| p3202 | arm 1 (the integrator's decision 2) | OK, 1 of 15 | 61 s | whole: 15 of 15 (harness-b) |
| p324 | arm 1 (the integrator's decision 2) | OK, 1 of 29 | 105 s, at a load near 130 | whole: 29 of 29 (harness-b) |
| p336 | `a113a` | PASS | 108 s | PASS (harness-b, 91 s) |
| p340 | `a010a` | PASS | 102 s | PASS, 81 to 106 s |
| p342 | `b142a` | PASS | 95 s | PASS (harness-b, 137 s) |
| p343 | `a-c51a` | PASS | 89 s | PASS (harness-b, 100 s) |

His shell history read `743166 1793987027` and `23166 1790702242` before and after every run, unmoved. The lock was
taken twice (`electron.lock`, each at the first try, for the battery alone) and released by its trap each time.

The count at the end, taken once, outside the block:

- Electrons, by CLAUDE.md's command: his Tortie (692), other applications' crash handlers, and one Electron of Phase
  357.1's (62670, with its helpers under `wt-p3571` and its own lock slot). None is this round's.
- No process names a `gmux-fault-`, `gmux-p361-` or `p361-plant-` socket or mark, or this round's scratch, and none is
  stopped.
- `/private/tmp/tmux-501/` holds `gmux` and 357.1's `gmux-p3571fa-…` pair, and nothing of this round's.
- His tmux server (6057) is untouched.
- Crash reports: 92 names and mtimes, none new since before the first battery run.
- This round's lock slot is free (357.1 and 353 hold the other two), and 44 GB are free.

The round signalled only its own self-test's plants, through the module and `endPlanted`, each after its command line
was read again.

#### Scenarios, today against this build after the drop round

| Scenario | Today (the parent) | This build after the drop round | Worse |
| --- | --- | --- | --- |
| Every half (a) row of the table above: a gate that prints without end, a full or nearly full scratch volume, a long refused line, room that came back, a folder the runner cannot make, a gate that ignores SIGTERM | the pipe, as each harness reads it | the same, because the 23 harnesses are the parent's bytes and `build/gate-run.mjs` is gone | no |
| A gate's red output larger than the pipe, read slowly (`ablation:p313`'s 14 arms, §2.5) | 14 of 14 RED ELSEWHERE | the same; 361.1 is the cure | no: as today, not cured here |
| A held client whose command line changes after its SIGTERM | one unchecked `kill-server`: the pair is left and the case passes | not sent SIGKILL after its fresh re-read, the server SIGKILLed after its own, and the verdict fails naming the client (T14) | no |
| A ps that cannot answer about a held server's pid | no ps is asked: one `kill-server`, the pair left, PASS | waited out, the held client ended, then the server seen gone, ok (T15 a); with no ps at all, never read gone, the socket kept, the verdict fails (T15 b) | no |
| The battery, four backup points and whole | PASS (§2.6) | PASS, 0 left, teardowns 51 to 63 ms a case | no |
| One arm of each of the 23 harnesses | §2.4's verdicts | the same 23 (the table above) | no |
| The six harness self-tests | exit 0 | exit 0, the same bytes | no |

#### Found here, not this phase's (the drop round)

13. `src/main/symbols/__tests__/store.test.ts` "answers a three-letter query over 100k symbols inside the budget" failed
    once in a full suite at a load of 83 to 109, which two other workflows' load tests made (242.8 ms against a budget
    of 161.7). Alone it passed twice, 15 of 15. It is a timing budget, as the integrator's decision 5 was.

#### For the main session at landing (the drop round)

1. The header's Subject and First body line name half (a) ("keep every gate's verdict", "a gate's verdict reaches its
   reader"), and so do its "The cure (a)" row and §1's a1 to a4. With half (a) out, the commit would claim what it no
   longer does. A suggestion, which is the main session's to decide: Subject `fix(build): end the fault battery's tmux
   pair and prove it gone`, and First body line `Phase 361: the fault battery ends its tmux pair and proves it gone`.
2. Cleanup at landing (§12 item 3, CLAUDE.md): remove `scratch/p361/` and the parents. Keep
   `/private/var/tmp/tortie-wt/scratch/owed-p3611/`, which belongs to 361.1.
3. 361.1's section and its running-log lines are the main session's, under CLAUDE.md's backlog rule.
