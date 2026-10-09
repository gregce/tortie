# Phase 342: the verifier's checklist

This checklist covers the Linux tmux rows: Ubuntu 22.04's 3.2a, Debian 12's 3.3a, Ubuntu 24.04's 3.4 and Debian 13's 3.5a, beside the 3.6 and 3.7c rows already admitted.

It is for the two verifier lenses of build/p342/SPEC.md §10 and for the operator. It gives the order to run things in, the command for each, what each must read, and what each costs where that has been measured. The SPEC has the reasons. This file only says how to run the proof.

Nothing here is a builder's step. Builders and the integrator launch no Electron. They run only §1 and §2.

## 0. Before the first command

- **The rules are SPEC §0, and they bind every step below.** Never `-L gmux` on this Mac. Nothing is installed on this Mac. No model turn is spent: every agent in a far session is a stand-in or a plain shell. Never start gemini, qwen, agy or grok. Do not run `smoke:remote`, `smoke:machines`, `probe:p268` or `probe:p336`.
- **His shell history.** Read `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before and after every step that starts a shell, a container, a far session or the app. If either moved, say which step was running, and whether his own terminals were typing at the time.
- **The disk.** Read `df -h /` before every pull, container start, parent build or package step.
  - Under 10 GB free, `build/docker-run.mjs` refuses, exit 2, with one sentence, and nothing is pulled or made.
  - Under 8 GB free, wait. Re-check every 5 minutes, for at most 30 minutes. If it has not recovered, report BLOCKED ON DISK with the reading.
- **His Docker.** Read his three lists once, before anything, and keep the copies:
  ```
  perl -e 'alarm shift; exec @ARGV' 60 docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' > <scratch>/images-before.txt
  perl -e 'alarm shift; exec @ARGV' 60 docker ps -a --format '{{.Names}} {{.Image}}'           > <scratch>/ps-before.txt
  perl -e 'alarm shift; exec @ARGV' 60 docker volume ls --format '{{.Name}}'                  > <scratch>/volumes-before.txt
  ```
  - Every docker command you type yourself goes under that `perl` alarm. A hang is reported, never retried in a loop.
  - Everything this phase makes is named `tortie-p342-*`. Everything else in his Docker is his, his `supabase_*_altarum` containers among it.
  - Never prune. Never `docker rm -f $(…)`. Never `docker login`. Never restart Docker Desktop.
- **The lock.** The app runs (§3, §4, §5) are under the lock: `zsh /private/tmp/tortie-ops/lock.sh try p342` prints a slot or exits 1.
  - Retry every 60 s in a new command. Never use the `phone` argument, because phone phases go first.
  - Release with `zsh /private/tmp/tortie-ops/lock.sh release <slot>` on the same line as the run, so a failure still releases it.
  - §1 and §2 need no lock.

## 1. The gates (no Docker, no Electron)

| Command | Cost, measured | Must read |
| --- | --- | --- |
| `npm run -s gate:docker` | under a second | `gate:docker PASS`: 2 scripts reach the helper against a floor of 2; 11 of 11 bad fixtures caught, 7 controls left alone; 48 of 48 helper ablations red |
| `npm run -s conformance:machines` | 30 s (2026-10-07) | `PASS`, with conditions 142 to 149 in its Phase 342 paragraph |
| `node build/p342/measure-p342.mjs --self-test` | seconds | every grader holds on the committed fixtures, and every corruption is caught. It starts nothing |
| `node build/p342/probe-p342.mjs --grader-self-test` | seconds | head-honest passes; parent-honest shows the parent's facts; each of the 56 hostile cases fails exactly the clauses it names, an absent reading among them. It starts nothing |
| `npm run -s ablation:p342` | 1,255 s for 40 arms (2026-10-07), 1,567 s for 50 (the fix round); 63 arms now, three checks (`machines`, `renderer`, `main`) | `PASS`: every arm but the control reddens the condition or vitest case that owns it, measured against the base; the control moves nothing; every clone file is restored by sha256 |
| `npm run -s ablation:p320`, `ablation:p324`, `ablation:p336` | each gate's own | green. Their anchors were re-pointed for this phase |
| `node build/assert-electron-teardown.mjs` (inside `npm run build`) | under a second | 171 helper users against a floor of 171 |

`npm run -s ablation:p342 -- --list` prints the arms. `P342_ONLY=b144d,b144l npm run -s ablation:p342` runs a subset.

## 2. `measure:p342`: the matrix again, in containers, outside the app

```
df -h / ; stat -f '%z %m' ~/.zsh_history ~/.bash_history
env -u TERM_SESSION_ID HISTFILE=/dev/null P342_KEEP=1 npm run -s measure:p342
stat -f '%z %m' ~/.zsh_history ~/.bash_history
```

- **What it does.** It runs one container per row through `build/docker-run.mjs`. Seven rows, four of them pulled: `ubuntu:26.04`, `debian:13`, `fedora:latest` and `archlinux:latest`. His `ubuntu:22.04`, `ubuntu:24.04` and `debian:bookworm-slim` are used as found and kept.
- **What it drives.** The shipping composers and readers, under the pinned tsx, through a stand-in ssh that runs its last argument in the container. That covers:
  - Prepare's twelve rows
  - the list and the dollar reader
  - the control client: the greeting, scroll back and the 35 keys
  - Phase 324's eight dialect steps
  - the 33 key names' bytes in seven modes
  - the nested-client indicator
  - the 30 far texts, compared with this Mac's answers over the same fixture
  - the three edited far texts, including the hard-link rename
  - the pairs.
- **What it grades.** Every cell, against `build/fixtures/p342/`.
- **Must read:**
  - `PASS over u2204, u2404, u2604, d12, d13, fed, arch`
  - `Docker after the run: as it was found (7 container(s), 4 pulled image(s) removed; kept [])`
  - the two history lines equal.
- **Cost.** 2 min 13 s for seven rows on 2026-10-07, including the four pulls and the installs.
- **Options.** `P342_ROWS=u2404` narrows the rows. `--write` rewrites the fixtures from the run. It is the builder's step, and a verifier who uses it says so. `P342_KEEP=1` keeps `<scratch>/results.json` and the far logs for your re-derivation. The scratch directory is printed on the first line.
- **Exit codes.** Exit 2 means it could not run: no Docker, under 10 GB free, or the lock held by another run. Exit 1 means a grader failed or Docker was not as found.

**A leaked run.** If a run was killed with SIGKILL, its ledger names everything it made:

```
node build/docker-run.mjs --sweep <scratch>/docker.ledger
```

It removes those things by exact name, and removes a pulled image only when its id still matches the one recorded at the pull. Each container's main process is `sleep 7200`, and `--rm` removes it when that ends.

## 3. `probe:p342`: the matrix in the app (Lens 2, under the lock)

**The parent comes first.** Build a copy of the phase's parent, `35a9a390` for the tree as rebuilt after the reboot of 2026-10-08, beside the worktree and never in his checkout. `git archive` writes nothing into his repository's `.git`, where `git worktree add` would, and the build needs no `.git`:

```
mkdir -p /private/tmp/wt-p342-parent
cd /private/tmp/wt-p342 && git archive 35a9a390 | tar -x -C /private/tmp/wt-p342-parent
cp -Rc /private/tmp/wt-p342/node_modules /private/tmp/wt-p342-parent/node_modules
cp -Rc /private/tmp/wt-p342/build/vendor /private/tmp/wt-p342-parent/build/vendor
cd /private/tmp/wt-p342-parent && env HOME=<scratch> ZDOTDIR=<scratch> HISTFILE=/dev/null npm run -s build
```

**Then the run.** Build HEAD first, because the probe refuses an `out/` older than its sources:

```
cd /private/tmp/wt-p342 && npm run -s build
SLOT=$(zsh /private/tmp/tortie-ops/lock.sh try p342) && \
  env -u TERM_SESSION_ID -u SSH_AUTH_SOCK HISTFILE=/dev/null \
  P342_PARENT_CHECKOUT=/private/tmp/wt-p342-parent P342_KEEP=1 npm run -s probe:p342 ; \
  zsh /private/tmp/tortie-ops/lock.sh release "$SLOT"
```

- **How it starts.** `npm run probe:p342` wraps the probe in `build/harness-socket.mjs --fresh gmux-p342`.
- **What it sanitises.** It points `HOME` and `ZDOTDIR` at scratch, sets `HISTFILE=/dev/null`, and deletes `SSH_AUTH_SOCK` and `TERM_SESSION_ID`, before any module of the repository runs code.
- **The machines.** It makes the seven containers once, each holding the run's own key for `tortie` and `tortiesh`, with an sshd (dropbear on Arch).
- **The two launches.** It launches the parent's Electron, then HEAD's, one after the other and never at once. Each has its own scratch profile, the run's own ssh_config behind `GMUX_SSH_BIN`, and the tailnet stand-in behind `GMUX_TAILSCALE_BIN`. Both are preflighted by sha256, and both are sampled every second while an Electron runs.
- **The arms.** It drives L1 to L12 per row, then K1 and K2, then (at HEAD alone) K3 and K3's counter-arm on Debian 12, then RUN. HEAD is graded. The parent's reading is printed beside each line.
- **What the parent is not driven through, by design (the second fix round).** Every arm after L1 on a row the parent did not read Ready (3.2a to 3.5a: its L1 shows the acceptance sheet, and such a row is given 20 s, not 180), and K3 and K3d12, which install a newer tmux package on their row and so run at HEAD alone, after HEAD's rows. Each is printed as `not driven` and recorded `{ notDriven }`, never UNREADABLE. Before HEAD's launch every row's `tmux -V` is read again, and a row that is not its distribution's own version stops the run (exit 2).
- **Exit codes.** Exit 0 means every arm passed. Exit 1 means an arm failed. Exit 2 means it could not run or an arm could not be read, which is never a pass.
- **What each arm must read.** These are SPEC §7.5 item 3 and §7.7, and `grade()` in the probe is the authority. Since the fix round every reading an arm needs must be there: an absent one fails as `not read: <field>`, never a pass. In short:
  - **L1:** one tmux, at `/usr/bin/tmux` (read from the found row's text, not its title), with the row's version. Ready. No acceptance sheet. Nothing typed. The parent is driven the same way: pick the peer and nothing more.
  - **L2:** read by the probe's own far read, never the app.
    - All twelve options, each against what that version keeps. `history-limit` is 25000 on every row.
    - `mode-style` falls back to `bg=default,fg=default` on 3.2a to 3.5a.
    - There is no `copy-mode-position-format` before 3.6, and no `allow-passthrough` on 3.2a.
    - No sentence is appended on any measured version.
  - **L3:** a session `cost $HOME é` is listed as named on every row. Where the ssh session has no UTF-8 `LANG` (SPEC §11 item 1 a) it must list as exactly `cost $HOME _`, never a name that only begins the same. Its far tmux name holds no `$`. The `~/cost $d` session's folder and project read `~/cost $d` on 3.4 too.
  - **L4:** connected. A stranger session is never shown. A rename to `$HOME notes` arrives as `_HOME notes`.
  - **L5:** the attach has reached the far session before anything is typed. Then in copy mode, at position 30, with no `[30/…]` box on row 0. The probe's own `copy-mode -e` draws the box on 3.2a to 3.5a, which proves the box could be seen.
  - **L6:** after `docker restart` the probe presses Prepare, because a boot empties `/tmp` and Tortie reads a missing socket as proving nothing, so the sessions read `unknown` until a server runs there (Phase 67's rule, the parent's too). Then the session reads restorable and restores into `~/proj`, and the `~/cost $d` session into `~/cost $d`. The folder is the restored pane's own, read from `/proc/<pane_pid>/cwd`, never tmux 3.4's `#{pane_current_path}`, which adds a backslash before `$` and a letter on output. Every status read is kept as a trail.
  - **L7:** the save's bytes equal what was typed (by sha256), the mode is 644, and no `.tortie-part` is left. A refused save, New Folder or stage is recorded as `refused: <its sentence>` (the parent's on Linux are), never as UNREADABLE.
  - **L8:** New Folder is made 755. The home itself is refused.
  - **L9:** the linked folder lists and expands.
  - **L10:** the bridge's `overview.sessions` for a Claude stand-in session there answers the `remote` line or, as it does at the parent and at HEAD alike, rejects the project (it runs this Mac's git in a folder that is on the other machine: "Git is not installed (or not on PATH)…"), read as `refused`. Where the parent read the same row, HEAD must answer what the parent did. A Codex stand-in's conversation is copied back to this Mac byte for byte (the remote reader's `store-list`, `store-head` and `store-copy` on GNU). That half is read once after every row, within one eleven-minute deadline. The far account's `~/.codex` and `~/.claude` are emptied before each build, because the harvest picks a conversation by its folder and HEAD's copy was the parent's.
  - **L11:** committed, and `git status --porcelain` is empty.
  - **L12:** the attach has reached the far session before the keys are typed, and the keys' bytes equal `keys.json` for that version.
  - **K1a:** prepared, with sentence (2).
  - **K1b:** `program-refused`, with sentence (1) and `history-limit` 25000. Nothing is sent after the refusal. It never says "could not reach".
  - **K2b:** sentence (4), and nothing is sent after the boot but the re-read.
  - **K3 (HEAD alone):** it first sets up its own running 3.5a server, a session of Tortie's on it and a live connection (L6 restarted Debian 13, so there was none), or reads UNREADABLE. Then sentence (3) in under 10 s.
    - The old live connection still answers.
    - After the probe drops it, zero control children are spawned.
    - The chip reads Not usable, the attach is refused with no `ssh -t`, and the save still works.
    - After a relaunch, nothing is marked quiet and the link reads `polling`.
    - After `docker restart`, the probe waits for the far ssh server's greeting, presses Prepare and records its answer (`afterRestartPrepare` must be `prepared`; a second press only when the first could not reach the machine), then waits for the row to read Ready, the link to read connected, and K3's OWN session to read restorable, restores it and finds it on the far server. K3 is graded once all of that is read.
  - **K3d12 (HEAD alone, after HEAD's rows):** prepared and connected.
  - **RUN:**
    - Docker is as it was found.
    - No Electron of the run is left: count with `ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct`.
    - His history is unchanged.
    - `app.log` holds no far file content.
- **Knobs:**
  - `P342_ROWS` and `P342_ARMS` narrow the run.
  - `P342_KEEP=1` keeps the records under `out/p342/` for your re-derivation. They may replace `build/p342/fixtures/head-honest.json` and `parent-honest.json`, and if you do that, say so.
  - `P342_OUT_DIR` moves the records.
- **Cost.** 651 to 716 s (11 to 12 min) for both builds over seven rows, measured by the second fix round on 2026-10-08 (exit 0 twice); 2,667 s (44.5 min) before it cut the parent's 180 s waits.

## 4. N1: the loopback machine, at parent and HEAD (under the lock)

```
SLOT=$(zsh /private/tmp/tortie-ops/lock.sh try p342) && \
  env -u TERM_SESSION_ID -u SSH_AUTH_SOCK HISTFILE=/dev/null \
  SCRATCH_MACHINE_QUIET_SHELL=1 SCRATCH_MACHINE_SCRATCH_HOME=1 SCRATCH_MACHINE_NO_OWN_KEYS=1 \
  P342_FAR=loopback P342_PARENT_CHECKOUT=/private/tmp/wt-p342-parent npm run -s probe:p342 ; \
  zsh /private/tmp/tortie-ops/lock.sh release "$SLOT"
```

- **Where it runs.** The far side is this Mac, through a yard sshd of the run's own (`build/scratch-machine.mjs`), started by the probe and ended in its `finally` with the far server and the yard's sessions folder. The far HOME and `TMUX_TMPDIR` belong to the yard, and the probe refuses (exit 2) a far HOME that is not the yard's. The far shell is quiet. The far side trusts the yard's own key (`<yard>/p342-userkey`, which the run's ssh_config names) and none of his.
- **Fixed in the second fix round.** Before it, this arm never signed in: the yard's sshd was never started, the ssh_config named the run's container key, and the run ended in a `ReferenceError`. It also read the far side with GNU spellings (`stat -c`, `sha256sum`) this Mac does not have, and graded a constant it wrote itself for the order of the writes; it now reads all twelve options back.
- **The far tmux.** It is the one the Add a machine check finds on this Mac, which is Homebrew's 3.6a.
- **Must read, at HEAD and the same at the parent where SPEC §7.6 says so:**
  - Prepare's options as listed, with `history-limit` 25000.
  - No sentence appended.
  - Scroll back's row 0 the same at both builds.
  - The save keeps the mode.
  - New Folder is made 755, through the BSD path.
  - A rename to `$HOME notes` works at both builds.
  - The session `cost $HOME` has the far name `cost _HOME` at HEAD.

**The vendored 3.7b half of N1 is not driven by probe:p342.** The check would find two programs if the vendored binary were put on the loopback PATH beside Homebrew's, and then Phase 340's check leaves the choice to the person. Cover 3.7b with Phase 320's real reader instead, which hands the loopback machine a tmux by path:

```
P320_FAR_TMUX=$PWD/build/vendor/tmux/bin/tmux P320_ARMS=R2 npm run -s probe:p320
P320_FAR_TMUX=$PWD/build/vendor/tmux/bin/tmux P320_ARMS=R2 P320_CHECKOUT=/private/tmp/wt-p342-parent npm run -s probe:p320
```

R2 grades Prepare's server, which the app made, and remote scroll back: the pane parks, 0 bytes reach the program, no error line, and the next key brings it back to live. At HEAD the entry is `copy-mode -e -H`.

## 5. N2: his Mac Pro, read only, at parent and HEAD (verifiers only, under the lock)

**probe:p342 never reaches his machine.** It refuses `P342_FAR=real` by name. `build/p3201/real-machine.mjs`, the one sanctioned door to his Mac Pro, admits only `gmux-p320…`, `gmux-p292…` and `gmux-p336…` harness sockets (its refusal 4). Widening it is not this phase's file. So N2 is read through Phase 320's reader of that door.

**Before you start:**

- Get his go-ahead for this run. The committed tree names no host.
- Set `P3201_REAL_HOST`, `P3201_REAL_USER`, `P3201_REAL_TMUX` (his tmux, `/usr/local/bin/tmux`, 3.7c) and `P3201_REAL_ACK=p3201`.
- Start a scratch ssh agent, loaded with his key BY PATH, and end it in your own `finally`. real-machine.mjs's refusal 6 explains why the app needs one.

**What the door does by itself, every run:**

- It censuses his three dotfiles (size and time) first and last.
- It counts his `-L gmux` sessions, count only, before and after.
- It uses a far directory `/tmp/p3201-<pid>/` of its own and a quiet far shell.
- It puts nothing anywhere else on his machine.

**At each build:**

1. **Scroll back's row 0.** At HEAD: `P320_FAR=real P320_ARMS=R2 npm run -s probe:p320`. At the parent: the same with `P320_CHECKOUT=/private/tmp/wt-p342-parent`.
   - R2 parks a remote plain shell's pane on his Mac Pro and grades it.
   - The drawn row 0 must hold no position box at either build. Prepare writes `copy-mode-position-format ''` on 3.7c at both builds, and HEAD adds `-H`. Read row 0 from the xterm buffer the probe already holds, and print it beside the parent's.
2. **Prepare's option read-back.** Read `show-options -g` and `show-options -s` of the run's own scratch server on his Mac Pro, which the app prepared, through the door's own `tmux()`.
   - Use the handle `openRealMachine` returns, inside your own harness started by `build/harness-socket.mjs --fresh gmux-p320`, while the app holds the server.
   - Never read his own server.
   - The twelve options must read the same at both builds: `history-limit` 25000, `mode-style` `noattr,bg=default,fg=default`, `copy-mode-position-format` empty, and the rest as SPEC §5.1 gives them for 3.6 and later. Only the ORDER of the writes differs: `history-limit` comes first at HEAD.

**Never on his machine:** a save, New Folder, a rename, a commit, an install, a session the door did not make, or a server the door did not start. The door's second census and second count must equal the first. If either moved, the run fails, and you stop and report it.

## 6. The independent methods (SPEC §7.8): name the one you did that the builders did not

1. **Re-derive.** Use a harness of your own, neither `measure:p342` nor `probe:p342`, in containers of your own named `tortie-p342-*`, made through `build/docker-run.mjs`'s `withContainers` or by exact name under the same rules.
   - Derive the per-version option, refusal and fallback table, the pair cells, the dialect steps, the keys, and the three edited scripts' answers, including the hard-link rename.
   - Compare them cell by cell with `build/fixtures/p342/matrix.json`, `refusals.json`, `dialect.json` and `keys.json`.
2. **Attack.** Run K1 to K3, plus at least one attack of your own. Examples:
   - a wrapper that refuses `mode-style`'s fallback too
   - a refusal whose words differ from tmux's
   - a program upgraded after the last Prepare and before a reconnect. That is D3's stated residual. Grade it as today's greeting-deadline path, never as an ended server.
   - a `$` name renamed on 3.2a
   - a rename onto a hard link of the same file.

   `build/p342/tmux-wrapper.sh` is the wrapper the probe installs. In the container:
   - `/etc/p342-tmux/refuse` names one option to refuse.
   - `refuse-value` names one value to refuse.
   - `say-version` gives the version `-V` answers.
   - `/tmp/p342-tmux-argv.log` records every argv.
3. **Run over real data.** Seven distributions' own packages: OpenSSH on six rows, dropbear on Arch.
4. **Measure the parent.** Read every L, K and N arm at the parent (`35a9a390`) and at HEAD.

SPEC §13's open concerns are yours to state: a container is not a machine; only Arch is amd64; 3.2a under a 3.4 program is refused; the pair read costs one more exec per Prepare; dropbear is not OpenSSH; GNU's `%a` carries a set-group-ID bit; the keys are measured as bytes. For each, state which arms a real install could answer differently.

## 7. The Docker proof, at the end of every Docker step

```
perl -e 'alarm shift; exec @ARGV' 60 docker ps -a --format '{{.Names}}' | grep -c tortie-p342      # must read 0
perl -e 'alarm shift; exec @ARGV' 60 docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | diff - <scratch>/images-before.txt
perl -e 'alarm shift; exec @ARGV' 60 docker ps -a --format '{{.Names}} {{.Image}}' | diff - <scratch>/ps-before.txt
perl -e 'alarm shift; exec @ARGV' 60 docker volume ls --format '{{.Name}}' | diff - <scratch>/volumes-before.txt
```

- The three diffs must print nothing, except a change in his own containers' state that he made himself. If one does, name it, and say whose it is.
- A base image this phase pulled is gone. One that was in his list before is still there with the same id.
- The helper prints its own proof on every run (`Docker's lists read the same as before`), but your own diff is the one you report.

## 8. Afterwards

Once the run is reported, remove only what you made:

- the parent copy: `rm -rf /private/tmp/wt-p342-parent` (made by `git archive`, so there is no worktree to remove; one made by `git worktree add` instead is removed with `git -C /private/tmp/wt-p342 worktree remove --force /private/tmp/wt-p342-parent`, then `worktree prune`)
- your scratch directories under `/private/tmp`
- `out/p342/` if you kept it and no longer need it.

First check that no running process names the path: `ps -Ao command | grep <path>`.

Never remove anything under `/Users/gdc`, anything in his Docker, or a path another phase that is still running uses.
