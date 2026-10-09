# Phase 342 — any ordinary Linux machine can be added and used — SPEC

Written by the spec step on 2026-10-07 in `/private/tmp/wt-p342`, a detached worktree at origin/main `cb8d52a6` ("docs(backlog):
a stranger's first run, rewritten with his setup design and started"). Every `file:line` below was re-read at `cb8d52a6` on this
date. **The spec step MEASURED before it wrote** (§14 holds every command, its exit code and its numbers): in SEVEN throwaway
containers in his Docker, one per distribution, each the distribution's own image from Docker Hub with the distribution's own
`tmux` installed inside it by its own package manager, plus a real `sshd` reached from this Mac through `build/ssh-run.mjs` with
a scratch key and a scratch record file. It ran Tortie's SHIPPING far strings (emitted from `src/` by the pinned tsx, byte for
byte) on real Linux binaries for the first time. It started no Electron, no Simulator, no agent and no model turn; it never named
`-L gmux` on this Mac; it read nothing under `~/.ssh`, `~/.claude`, `~/.codex`, his keychain or his live Tortie profile; and
`stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `734376 1791391290` and `23166 1790702242` before and after every command
that started a shell, a container, an sshd or an ssh, unchanged throughout.

**Docker, before and after (his ruling of 2026-10-05).** Docker answered (engine 28.0.4) when the step began, so the user's
request to open it needed no action. Seven containers `tortie-p342-spec-{u2204,u2404,u2604,d12,d13,fed,arch}` were made; four
base images not in the main session's before list were pulled (`ubuntu:26.04`, `debian:13`, `fedora:latest`,
`archlinux:latest`); `ubuntu:22.04`, `ubuntu:24.04` and `debian:bookworm-slim` were already there and were used and kept. No
image was built, no volume or network made. Every container and every pulled image was removed by exact name, and
`docker images`, `docker ps -a` and `docker volume ls` were then compared with the before lists: identical, with 0 `tortie-p342`
containers, images, volumes and networks left (§14 M0). Free disk went from 21 GB to 12 GB during the run (the step's own
footprint was about 2.6 GB; another phase was building beside it) and read 13 GB after the clean-up.

**Revised by the adversary round on 2026-10-07** (§Attack at the foot, with its own measurements in six more throwaway
containers, removed and proved identical to the before lists). Where a row below says "(§Attack Fn)", the adversary
changed it and the finding gives the reason; the rows it did not touch stand as the spec step wrote them.

Read with it, whole: `docs/BACKLOG.md` "## Phase 342" (`:40729-40769`) and the running-log lines of 2026-10-05 that rule it
(`:42445`, the queue, and `:42446`, his Docker ruling, at `cb8d52a6`; origin/main has since moved only in that file, where
they read `:42451` and `:42453`), `docs/research/131-tmux-on-linux.md` (binds: §1, §2.5, §3.3 to §3.5, §4.2, §4.3, §7, §8), `build/p324/SPEC.md`
(the version rows and his four rulings on research 131), `build/p3201/SPEC.md` (scroll-back on another machine and the
carriage's table), `build/p336/SPEC.md` and its 336.1 sections (saving on another machine), `build/p340/SPEC.md` (add a machine,
the check, the probe's ssh wrapper and tailnet stand-in), `build/p343/SPEC.md:765` (the linked-folder row it asks of this phase).

**The order of authority.** His rulings override the entry and research 131 wherever they differ: "you can do the docker tests
but make sure to clean them up" (2026-10-05); and his four answers on research 131 (Phase 324's charter): (1) "add to allow list
but dont add a weird label", (2) "Not now" for Ubuntu 24.04, Debian 12 and Debian 13 as released, which his "so we should fix
that" on 2026-10-05 lifts for THIS phase, (3) "Only say so" for a server older than its program, binding whenever a pair read is
built, (4) "No" to posting on issue 31. The tree at `cb8d52a6` overrides the entry's picture of it. The measurements in §14
override research 131 where they disagree; §3 says so row by row.

---

## 0. The hard rules, stated once

- **NEVER commit, stage or stash** (only the committer does). `/Users/gdc/gmux` is READ ONLY: every shell command begins with
  `cd /private/tmp/wt-p342 &&` or a scratch directory, and every heredoc delimiter is quoted (`<<'EOF'`). `git diff cb8d52a6`
  in this worktree is exactly 342's delta.
- **Never `-L gmux` on this Mac** and never the default tmux server. Never `pkill`, `killall`, a `pgrep` pattern or a negative
  pid on this Mac; a process is ended by the pid its starter holds, in a `finally`. Inside a throwaway container the probe owns
  every process.
- **His Docker** (his ruling, every clause binding): every container, image, volume and network a role makes is named
  `tortie-p342-*`; base images are pulled from Docker Hub as the distributions publish them; a base image already in the main
  session's before list (`<scratch>/p342/docker-images-before.txt`: `ubuntu:22.04`, `ubuntu:24.04`, `debian:bookworm-slim`
  among others) is NEVER removed, and one a role pulled that was not in it is removed at the end; everything made is removed in
  a `finally` whatever happened and proved with `docker ps -a`, `docker images` and `docker volume ls` against the before lists;
  nothing else in his Docker is touched (his `supabase_*` containers and every other container, image and volume are his);
  never `docker system prune`, `image prune`, `volume prune`, `builder prune`, `docker login`, `rm -f $(...)` or any selection
  by pattern; never restart or quit Docker Desktop; **no `docker build`** (its build cache cannot be removed by name, D27);
  check `df -h /` before pulling and pause under 10 GB free; nothing is installed on the Mac, packages are installed INSIDE a
  throwaway container; a container reaches the Mac only as an ssh server on a `127.0.0.1` port it publishes, and mounts no path
  under `/Users/gdc`, no `~/.ssh` and no Docker socket.
- **ssh only through `build/ssh-run.mjs`** with a scratch key and a scratch record file, never his. The app's own ssh is reached
  only through a `GMUX_SSH_BIN` wrapper whose first two arguments are `-F <the run's own ssh_config>` (D26).
- **No model turn.** Every agent is a stand-in (a `/bin/sh` script the probe writes inside the container, printing a committed
  capture and writing a committed transcript) or a plain shell. `smoke:remote`, `smoke:machines`, `probe:p268` and `probe:p336`
  are NOT run (each names `-L gmux` or his real far home). Gemini, Qwen, Antigravity and Grok are never started; a scratch
  `agents.json` renames their binaries (and Droid's) before every launch.
- **His shell history**: before and after every command that starts a shell, a container, a far session or the app, record ONLY
  `stat -f '%z %m' ~/.zsh_history ~/.bash_history`; if either moves, attribute it and report. Any shell a test starts on this Mac
  runs with a scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null` and `TERM_SESSION_ID` unset.
- **Every Electron through `build/electron-run.mjs`**, killed in a `finally`; `probe:p342` raises `HELPER_USER_FLOOR` (D29).
  Builders and the integrator launch no Electron; they MAY run containers for measurement under the Docker rules.
- **THE LOCK HAS TWO SLOTS and a phone phase (333.1) goes first**: `zsh <scratch>/lock.sh try p342` (prints the slot or exits 1;
  retry every 60 s in a NEW command; never with the `phone` argument), released with `zsh <scratch>/lock.sh release <dir>` on the
  same command line. A gate that spawns a probe with `spawnSync` sets `maxBuffer`. Under load, re-run a failing timing test
  alone before calling it a failure.
- **His rule: no scenario worse than today**, his Mac Pro and the loopback machine first. **Remote must feel identical to local.**
  Describe any weakness by its class, never as a recipe.

---

## 1. The answer first

**What a person can do after this phase.**

1. **Add an Ubuntu 22.04, Ubuntu 24.04, Debian 12 or Debian 13 machine with the tmux it ships, and use it.** Add a machine finds
   tmux, one Add press prepares it, and it reads Ready, with no acceptance sheet and no "could not reach". Its sessions get the
   live connection, scroll back like a session on his Mac, and save, rename and make folders. Today every one of the four is
   refused at the version gate ("Tortie has not measured the program this machine runs.", with an acceptance sheet), and a
   person who accepts the version meets Prepare's first refused option, said as "Tortie could not reach this machine, and it
   does not recognise the reason." about a machine Tortie reached (research 131 §1, re-measured in §14 M2; the gate is
   `prepare.ts:521-543`, §Attack F14).
2. **Saving a changed file on ANY Linux machine works, and so does New Folder.** Today, on every GNU or uutils Linux machine,
   including the ones Tortie already admits (Ubuntu 26.04's `3.6`, Debian 13 backports' `3.6b`, Fedora's and Arch's `3.7c`), a
   save over an existing file FAILS: the far script reads the file's mode with BSD `stat -f` first, which on Linux prints five
   lines of file-system status that `chmod` then refuses, so the save stops with no answer, main says the machine "did not
   answer while this file was being saved", the file keeps its old contents and a `<name>.tortie-part` holding the new ones is
   left beside it. New Folder makes the folder `700` whatever its parent and answers in a shape main cannot read, so the person is
   told Tortie "cannot tell you whether that folder was made" about a folder that was. Measured with the shipping texts on all
   seven distributions (§14 M11). This has been true since Phase 101 (save) and 336 (New Folder's mode line), because "no Linux
   machine was contacted" (`src/main/machines/remote-scripts.ts:2837-2838`).
3. **A machine whose tmux was updated while its sessions kept running is told the truth.** On Debian 13 installing its backport,
   the new program cannot talk to the old server: the live connection never greets and an attach exits at once with tmux's "open
   terminal failed: not a terminal" (measured on the real packages, §14 M8). Tortie now reads the program beside the server for
   the four older versions at every Prepare (a person's press, the launch sign-in and its retry), opens no NEW live connection
   and no terminal there, keeps the sessions listed, and says once that they open again after that machine restarts. A live
   connection already open when the program was replaced keeps working, because it is the old program's process (measured,
   §Attack M-A6), and Tortie leaves it alone. It ends nothing (his ruling 3, "Only say so").
4. **Nothing a person sees changes on a machine that works today.** The rows that are measured today (3.6, 3.6a, 3.6b, 3.7b,
   3.7c) keep every command they get today but four, each measured to change nothing drawn: Prepare WRITES `history-limit`
   first instead of last (the read-back, and so the row's settings list, keeps today's order); a server Prepare, a restore or a
   create has just started is asked its `#{version}` once more (one exec, on a born server only); copy mode on another machine
   is entered with `-H`, whose drawn row 0 is byte-identical on 3.6 and 3.7c (§14 M7); and a session name holding `$` gets `_`
   in its far tmux name only (the display name keeps every character). The far scripts' Mac answers are unchanged: the three
   edited texts were run side by side with the shipping ones on this Mac's BSD `stat` under `/bin/sh` and `/bin/dash` and every
   answer, mode and file left read the same (§Attack M-A1).

**What the measurement found that the entry and research 131 did not know** (each a D-row below):

- **Every refusal on the four older versions has a fallback that changes nothing a person sees** (D8). Research 131 §4.2 said
  `allow-passthrough` on 3.2a "has no fallback: images and other pass-through escapes reach the terminal there as nothing". That
  is REFUTED: 3.2a has no such option because it passes every wrapped sequence through ALWAYS; a wrapped OSC reached the
  attached client on 3.2a with no option, was dropped by 3.4 and 3.6 without it, and passed on both with it (§14 M6). So there is
  no sentence at all for the four measured versions; the refusal sentence is for a refusal the measurement did not predict.
- **3.2a, 3.3a and 3.4 store a session name holding `$` and a letter with a backslash** (`cost $HOME` becomes `cost \$HOME`), so
  the exact target `=cost $HOME` misses it; 3.5a and later do not (§14 M9). **3.4 alone also answers every stored value and
  path holding `$` and a letter with a backslash added** (`a $HOME b` reads back `a \$HOME b`, a folder `/tmp/x $d` reads back
  `/tmp/x \$d`), which would show in a session's name and send a restore to the wrong folder (§14 M9).
- **3.2a pads every joined capture line to the pane's width** (63,143 bytes for 3,004 lines where 3.3a gives 13,973), which a
  saved-output replay into a narrower terminal draws as blank lines (§14 M10).
- **Ubuntu 26.04 runs uutils (Rust) coreutils 0.10.0** for `stat`, `chmod` and `base64`; every far answer read equal there except
  the error text of the save defect above (§14 M1, M11).
- **Arch publishes no arm64 image.** Under amd64 emulation OpenSSH's `sshd` cannot install its seccomp sandbox
  (`prctl(PR_SET_SECCOMP): Invalid argument`) and pacman needs `--disable-sandbox`; the Arch row signs in through dropbear, which
  works (§14 M1, M4).
- **The adversary round added four** (§Attack): the four older versions speak the live connection's dialect exactly as 3.6
  does on Phase 324's eight steps (M-A2); a program asking for modifyOtherKeys level 2 is answered at level 1 before 3.5, so a
  few keys reach it in legacy bytes (M-A3, D22); a far tmux name beginning with `-` cannot be renamed to on any version (M-A4,
  D12); and a live connection opened before the program was replaced keeps working after it (M-A6, D3).

### 1.1 The decisions, each with its reason

| # | Decision | Reason and source |
| --- | --- | --- |
| D1 | **Four measured rows join `TESTED_REMOTE_TMUX_VERSIONS` on both planes**: `3.2a`, `3.3a`, `3.4`, `3.5a`, each `measured: { exec: true, control: true }`, in that order BEFORE the 3.6 row, so the list reads oldest first. Each `subject` and `note` is plain and obeys condition 100e word for word: it names the copy measured as "the copy a package manager installs on a scratch machine Tortie made for the measurement" and `npm run probe:p342`, and names no distribution, release, vendor, "Linux", "ships", patch or package suffix (his ruling 1; `build/conformance-machines.mjs:11353-11362` bans each of those, and it reads the array block's COMMENTS too, so the "Measured on" facts of §4.2 never go in the array). `control: true` rests on Phase 324's eight comparable dialect steps (greeting, guard shape, the no-output block, the notifications on a create, a rename and a kill, the renamed line, window traffic, one list and the exit line) measured equal to 3.6's on all four by the adversary (§Attack M-A2), which `measure:p342` reproduces and grades on every run; a version whose stream differs on any step keeps `control: false` (exec only, the timer feed, Phase 320's pass-through scroll), the fails-closed ladder | the per-row matrix on the distributions' own binaries (§14 M2 to M8, §Attack M-A2); research 131 §4.3 item 3's two preconditions, both built here (D3, D5) |
| D2 | **A row before the 3.6 wire change carries `programs`**, the program versions MEASURED working against a server of that version, itself always first: `3.2a: ['3.2a']`, `3.3a: ['3.3a', '3.5a']`, `3.4: ['3.4']`, `3.5a: ['3.5a']`. Rows from 3.6 carry no `programs` and keep the server-only read exactly as today. Membership in a list is not version arithmetic (`src/main/tmux/version.ts:372-374` stands) | 3.3a under a 3.5a program greeted on the real Debian packages (§14 M8); 3.5a under 3.6b never greeted (§14 M8); research 131 §3.4 and §4.3 item 4 (a pair gate on 3.6 and later would refuse the rolling upgrade that works today). 3.2a under 3.4 is NOT listed: research 131 measured it only on Mac builds, and an unlisted pair is refused with a true sentence rather than admitted |
| D3 | **The pair read.** When the server's row carries `programs`, three readers read the program's own `-V` through the login-shell door (`execRemoteShell` over `shellQuoteArgv([ctx.remoteTmuxPath, '-V'])`, the read `readRemoteTmuxVersion` already makes at `src/main/machines/prepare.ts:246-251`) beside the server's `#{version}`: Prepare (after its version read, when a server answered), `openControlPlane` (after its read, `control-plane.ts:651-676`) and the transport's precheck (`control-plane.ts:540-555`). A program not on the list is a **pair refusal**: no control child is spawned and no greeting is waited for; the precheck's refusal closes the machine's control plane the way a missed greeting does (`noControlThisRun` and `closeControlPlane`, `control-plane.ts` around `:641-651` in research 131's numbering), so nothing reconnects on a timer; Prepare still runs the set-up and starts the feed on the timer (the exec plane answers across the pair: list, set-option and display-message did through the new program on the real Debian 13 packages, §14 M8), and answers `tmux-refused` with the pair sentence (D10); an attach and a create on that machine are refused before anything spawns with the same sentence (D4b). An unreadable program on such a row is treated as a refusal of the live connection only, logged, with no sentence | research 131 §3.4 and §4.3 item 3 ("a read of the machine's tmux program beside its running server"); his ruling 3; measured on real Linux, §14 M8 |
| D4 | **Prepare writes `history-limit` FIRST.** `remoteBootOptions()` (`src/main/tmux/server-options.ts:127-129`) returns `history-limit`, then the other eleven in `SERVER_OPTIONS`'s own order. The READ-BACK loop (`remote-server.ts:214-225`) walks `SERVER_OPTIONS` in its own order, so `MachinePrepareResult.options` and the row's settings list (`MachineRow.tsx:524-541`) read as today on every machine that takes all twelve. `SERVER_OPTIONS`, `localReassertOptions()` and `resources/gmux-tmux.conf` are untouched, so this Mac's boot is byte for byte what it is. `src/main/machines/__tests__/p3401-server-setup-stop.test.ts:109-118` counts the rows and stays green | research 131 §4.2 (a refusal can then never leave the server at tmux's 2,000); the entry's mechanism item 1 |
| D4b | **The attach and the create ask the pair.** `attachListedRemote` (`src/main/sessions/core.ts:3777-3796`, the one door every remote attach reaches, `attachFarUnbound` included at `:3833`) asks `assertFarPairUsable(machineId)` after `readyRemoteContext`, synchronously (conformance:farattach holds that nothing is awaited between its check and the spawn, `build/conformance-farattach.mjs:440-444`); `remoteCreate` (`src/main/machines/remote-sessions.ts`, before its create line) and the remote restore (`src/main/machines/remote-restore.ts`, AFTER its `ensureRemoteServer` at `:330`, whose born re-read clears a verdict the restarted server no longer matches, and before `remoteCreateArgs` at `:507`) ask it too. Nothing else asks it: the Explorer, saving and every read work across the pair and stay. **And the launch sign-in marks no `tmux-refused` machine quiet (§Attack F3).** `signInToConfirmedMachines` (`core.ts:1619-1625`) calls `markMachineQuiet` for every class but `prepared`, which writes every row `unknown` and the link "did not answer the last time Tortie asked" (`remote-sessions.ts:3225-3240`); for `tmux-refused` the machine answered and, in the pair case, its feed is running, so that arm arms the retry and marks nothing | the measured break is the attach and the control child only (§14 M8); `readyRemoteContext` is asked by about thirty callers (`src/main/machines/ready-context.ts`) and refusing there would take the Explorer away for nothing; `core.ts:1619-1625` |
| D5 | **Each option row declares the oldest tmux that took it and what Tortie does without it.** `ServerOption` gains `oldest` (a measured version string: `3.2a` for nine rows, `3.3a` for `allow-passthrough`, `3.6` for `copy-mode-position-format` and for `mode-style`'s value) and `without`, exactly one of: `{ kind: 'required', purpose }` for `history-limit`, `exit-empty`, `remain-on-exit` and `mouse`; `{ kind: 'fallback', value: 'bg=default,fg=default' }` for `mode-style`; `{ kind: 'skip' }` for the other seven. Why the four are required: `history-limit` is the scroll-back depth; `exit-empty off` is the server staying up with no session (durability); `remain-on-exit failed` is the exit-code truth main reads before reaping (`resources/gmux-tmux.conf:93-97`); `mouse off` keeps the wheel in Tortie's hands, which 320.1's scroll-back rests on (and 3.8 turns the mouse default on, research 131 §4.2) | the entry ("each option declares the oldest tmux it needs and what Tortie does without it ... history-limit and every row that durability or scroll-back rests on is set on every version or the machine is refused") |
| D6 | **A refusal is read in tmux's own words and nothing else.** A `set-option` that exits non-zero is a REFUSAL only when its stderr's last line is exactly one of `invalid option: <the row's name>`, `invalid style: <the value sent>`, `unknown value: <the value sent>`, `bad value: <the value sent>`, `value is invalid: <the value sent>`, `value is too small: <the value sent>` or `value is too large: <the value sent>` (one pure reader, `isOptionRefusal(text, name, value)` in `server-options.ts`). Anything else (a dropped link, no server, an unknown line) throws exactly as today. On a refusal: a `fallback` row sends its fallback once, and a refused fallback is handled as a `skip`; a `skip` row is recorded and Prepare goes on; a `required` row stops Prepare with `tmux-refused` naming the version and the purpose, and nothing after it is written. `set-option -q` is never used | the seven shapes measured identical on 3.2a, 3.6 and 3.7c (§14 M5); research 131 §4.2 (`-q` rescues a name and not a value; and a silent skip hides a fact) |
| D7 | **Expected or not is a row's declared `lacks`.** Each version row declares the options its tmux refuses, as measured: `3.2a: ['allow-passthrough', 'copy-mode-position-format', 'mode-style']`, and `3.3a`, `3.4`, `3.5a: ['copy-mode-position-format', 'mode-style']`; rows from 3.6 declare none. A refusal of an option the server's row lacks is SILENT (D8 says why); any other refusal of a `skip` or `fallback` row (an unmeasured or accepted version, or the attack) appends ONE sentence to the prepared detail (`MACHINE_TMUX_SETTING_REFUSED`, D10), which the row's hover then draws. The version used is the SERVER's, read before the options (D9) | §14 M2; the entry's mechanism item 3 |
| D8 | **Why the measured fallbacks change nothing a person sees.** (a) `allow-passthrough` on 3.2a: the option does not exist because 3.2a always passes wrapped sequences through (§14 M6), and Tortie's terminal registers no OSC handler, image addon or clipboard addon (`package.json` carries `@xterm/addon-fit`, `-web-links`, `-webgl` only; no `registerOscHandler` under `src/`), so nothing it draws depends on the option anywhere today. (b) `copy-mode-position-format` before 3.6: copy mode on another machine is entered with `-H` (D11), which hides tmux's position indicator: an attached client's row 0, parked 30 lines back, read `2948 [30/2978]` on 3.2a and 3.3a and `2948 19:34:50 [30/2978]` on 3.4 and 3.5a with `copy-mode -e`, and `2948` with `copy-mode -e -H` on all four (§14 M7). (c) `mode-style`: `bg=default,fg=default` is taken and read back on 3.2a to 3.5a (§14 M2); Tortie never makes a tmux-side selection (`resources/gmux-tmux.conf:51-53`), so the style is never drawn | research 131 §3.3 ("the adversary found the way round it: copy-mode -e -H"), §6 item 10; refuted in part, §3 row 2 |
| D9 | **Prepare keys everything on the SERVER's version, and a server Tortie just started must agree with the program.** When `ensureRemoteServer` starts the server (`born`), it reads `display-message -p '#{version}'` from it BEFORE any option, through the same exec door; if that version differs from the version Prepare's gate read (the program's `-V`, because no server answered), it throws `RemoteTmuxRefused({ kind: 'disagrees', said, ran })` and writes nothing more; Prepare answers `tmux-refused` with `MACHINE_TMUX_DISAGREES` (D10). The server it started stays, empty, with `exit-empty off`, because the verb ledger kills nothing (`remote-server.ts:35-39`), and the sentence says only that Tortie will not use it. A warm server's version is the one the gate read. The version is remembered for the machine (`noteFarServerVersion`, D24) the moment the gate reads it, so the feed's first pass reads the quirks of D13 and D14. **A restore and a create also boot servers** (`remote-restore.ts:330`, `remote-sessions.ts:1737`, both `ensureRemoteServer(ctx)` with no `how`, §Attack F4): with no `how.version` the born re-read is still made, notes the version and records the pair `(ran, ran)`, which clears a refusal recorded against the server that is gone, and compares with nothing. A re-read that answers but cannot be parsed compares with nothing and is logged; a re-read that fails throws as any failed exec does today. A `RemoteTmuxRefused` thrown inside a restore or a create carries sentence (1) or (4) as its `message`, so those paths draw a true sentence, never "could not reach" | the entry's attack "a version string that lies"; `prepare.ts:194-262` reads `-V` only when no server answers |
| D10 | **The sentences**, composed in main (`src/main/machines/errors.ts`), with "tmux" the one tmux word, no option name on the resting face, under one NEW class `tmux-refused` (`src/shared/ipc/machines/connection.ts:73-97` gains one member). (1) A required row refused: headline `This machine's tmux is too old for Tortie.`, detail `` `tmux ${v} would not ${purpose}, so Tortie will not start sessions there.` `` with purposes `keep ${n} lines of each session` (`history-limit`, `n` the Settings value), `keep running with no session open` (`exit-empty`), `keep a session's screen when its program fails` (`remain-on-exit`), `leave scrolling to Tortie` (`mouse`). (2) An unexpected optional refusal, appended to the PREPARED detail, class `prepared`: `` `tmux ${v} on this machine is too old for one of Tortie's settings, so a session there can look a little different from one on this Mac.` `` (3) The pair: headline `This machine's tmux was updated while its sessions kept running.`, detail `` `Tortie has not measured tmux ${program} with the tmux ${server} that still runs them, so it opens no session there. After that machine restarts, Tortie can restore them.` `` (§Attack F5: the spec step's "cannot open" was false of 3.2a under 3.4, which research 131 §3.4 measured working on upstream builds and which is refused here only because nobody has measured it on the packages; "has not measured" is true of that pair and of the measured broken one) (4) The disagreement: headline `This machine's tmux is not the version it says.`, detail `` `It says ${said} and runs as ${ran}, so Tortie will not use it.` `` None is ever `unknown` and none says "could not reach". `build/assert-bundle-refusals.mjs` pins each | the entry's mechanism item 3 ("never could not reach"); CLAUDE.md "Just enough words"; his ruling 3 ("Only say so": the pair sentence ends nothing and names no command) |
| D11 | **Scroll-back on another machine enters copy mode with `-H`.** `src/main/tmux/scroll.ts`'s four entry sites (`:626`, `:633`, `:674`, `:691`) call one NEW helper `enterCopyModeArgs(run, target)`, which answers `['copy-mode', '-e', '-H', '-t', target]` for a runner that names a `server` (another machine, the rule `readFormatFor` already follows at `:301-303`) and `['copy-mode', '-e', '-t', target]` for this Mac's, byte for byte as today. The carriage's `enter-copy-mode` row (`src/main/machines/scroll-shapes.ts:192-197`) becomes `[copy-mode, -e, -H, -t, TARGET]`, ONE spelling; `-H` then stands in exactly two rows, `enter-copy-mode` and `type-bytes` (the header's "`-H` exists in exactly one row" at `:44` is reworded). This is not a ninth row and adds no power: the same verb on the same target, which types nothing (measured accepted on every version, §14 M3) | D8 (b); research 131 §3.3; §14 M7 (identical drawn bytes on 3.6 and 3.7c, so today's machines see no change) |
| D12 | **A far tmux name never holds `$`, and `$` becomes `_` (§Attack F6).** One NEW composer `farTmuxName(display, taken)` in `src/main/machines/remote-sessions.ts` = `dedupeSessionName(sanitizeSessionName(display).replace(/\$/g, '_'), taken)`, used at the create (`:1671-1674`) and the rename (`:2170`); the remote restore (`remote-restore.ts:463`) replaces `$` with `_` in the record's name and dedupes nothing, as today. The display name (`@gmux-name`) keeps every character. This Mac's names are untouched. NOT `-`: a name beginning with `-` is read as flags by `rename-session`'s positional argument on EVERY version, 3.6 included (`rename-session -t $0 -HOME` answers "unknown flag -H", measured on all five, §Attack M-A4), so `-` would have broken a rename to `$HOME notes` on the machines that work today | 3.2a, 3.3a and 3.4 store `$` and a letter with a backslash and `=<name>` misses it (§14 M9, re-measured §Attack M-A4), so the create's own confirmation (`show-environment -t =NAME`, `create-confirmation.ts:72`, called at `remote-sessions.ts:1853`) misses the session it just made, `takenNames` and the composed name disagree, and a second session given the same display name meets tmux's "duplicate session". `$` alone misses `=$` on every version; `_` and `-` replacements hit on every version (§Attack M-A4). Attach is by `$`-id (`core.ts:3762-3770`, `:3790-3795`; `=$N` resolved and attached the right session on 3.2a to 3.6, §Attack M-A5) |
| D13 | **3.4's dollar on read.** The 3.4 row declares `quirks: { dollarOnRead: true }`. For a machine whose server reported 3.4, the list's reader removes ONE backslash before every `$` that is followed by a letter, `_` or `{`, in `@gmux-name`, `@gmux-project` and `session_path` after `splitQuotedLine` (one pure helper, `undoDollarEscape`). Nothing else and no other version | the exact rule measured over thirteen values (§14 M9): 3.4 inserts one `\` before `$[A-Za-z_{]` and never before `$[0-9]`, `$-`, `$$`, `$#`, `$}`, `$é` or a trailing `$`. What it protects (§Attack F7, corrected): the LIVE row's name, its project (which decides the tab it groups under) and its folder (`Session.cwd`, `remote-sessions.ts:1269-1279`, which a person's "new session here" hands back to a create). A restore's folder is NOT `session_path`: the restore reads the manifest's create-time `cwd` (`remote-restore.ts:513`), and a completed pass writes back only status and last seen (`remote-sessions.ts:3042-3047`) |
| D14 | **3.2a's joined capture.** The 3.2a row declares `quirks: { joinedCapturePads: true }`. For such a machine, the two far readers that send `-J` and keep its spaces strip trailing ASCII spaces from each line (one pure helper `stripJoinedPadding`): the saved-output capture (`src/main/machines/remote-capsule.ts:409`, `:524`, both through `remoteCaptureArgs`) and the joined history copy (`remote-pane-history.ts:96-117` when `join`). NOT the armed resume's screen read (`remote-arm.ts:447`, §Attack F8): its counter removes every space before it searches (`withoutSpaces`, `remote-arm.ts` in `countOccurrences`), so the padding cannot move its count and an edit there buys nothing | §14 M10: 3.2a pads every joined line to the pane's width after the line's last escape; 3.3a and later keep only a line's own trailing spaces, which neither reader needs |
| D15 | **The far scripts read GNU first, or by the spelling their own probe chose. THREE texts, not four (§Attack F9).** In `src/main/machines/remote-scripts.ts`, and nothing else in the catalogue: `FILE_PUT`'s mode read (`:2928-2929`) and `DIR_NEW`'s (`:3066-3067`) use the `wq` the shared prelude `folderCheck` already sets (`:2640-2641`, `wq=-c` when `stat -c '%d:%i' /` answers): `stat -c %a` when `wq` is `-c`, `stat -f %Lp` otherwise; `STORE_LIST` (`:656-660`) puts the GNU `find … -exec stat -c '%Y %s %n'` first, the order `CONTEXT_READ` already uses (`:2300-2310` explains why). **`ENTRY_RENAME` is left exactly as it is.** Its identity pair (`:3165-3168`) is compared and never printed; on GNU both reads print a file-system block whose `File:` line differs for any two names, so a rename onto an existing name answers `exists` there. The real identity would send two names of ONE file (a hard link) to `mv`, which GNU and uutils `mv` refuse ("are the same file"), so the edited text answered with no marker under `set -e` on all five GNU and uutils builds where the shipping one answers `exists` (§Attack M-A1): worse than today, so it is dropped. Every answer word, field count, parameter count and the catalogue's count (30) stay; the comment at `:2837-2838` is corrected with §14 M11's numbers and names `ENTRY_RENAME`'s pair as compared, never kept | §14 M11; §Attack M-A1, the edited texts beside the shipping ones on GNU 8.32, 9.4, 9.1, 9.7, uutils 0.10.0, BusyBox 1.38 and this Mac's BSD `stat` under `/bin/sh` and `/bin/dash`: every edited answer right where the shipping one fails, and every Mac answer identical |
| D16 | **The Linux far paths measured green are left alone**: `folder-pin` (336's identity) equals a `stat -c '%d:%i'` oracle on every distribution; 336.1's rules (the home itself `offlimits`, a first-level child of the home writable); 343's tree under a linked root (`find -H` follows the root: `inner/` and `inner/f`), a link to a folder listed with `//`; `ls -A -p`; `head -n`; `base64 -d`; the `sha256sum` fallback (Fedora and Arch have no `shasum`); Phase 340's check (`count=1`, the login PATH read, `/usr/bin/tmux`) under bash and under the distribution's own `useradd` default (`/bin/sh`, dash, on Debian and Ubuntu) | §14 M4, M11, M12 |
| D17 | **The drawn list** (`MEASURED_VERSIONS`, `src/renderer/settings/machines-copy.ts:695`) becomes `['3.2a', '3.3a', '3.4', '3.5a', '3.6', '3.6a', '3.6b', '3.7b', '3.7c']`, held equal to main's exec list by its test as today; the Add Machine sheet draws it and nothing beside it (`AddMachine.tsx:756`, condition 100e) | D1 |
| D18 | **The row for `tmux-refused`.** `machineStatusOf` (`src/renderer/settings/machine-status.ts:177-179` is the pattern) maps it to the existing chip `not-usable` ("Not usable"), the hover being main's first sentence, with no next step; no acceptance sheet is ever offered for it (`MachineRow.tsx:160` offers one only for `version-unmeasured`). `REMEDY` (`machines-copy.ts:983`) gains no row: the detail says what is true and Tortie names no install command (`errors.ts:671-672`'s rule) | CLAUDE.md "Just enough words"; Phase 340's chip vocabulary unchanged |
| D19 | **Both gates are unchanged in kind.** Byte equality on the SERVER's whole version string, measured rows only, the control gate takes no acceptance (`version.ts:309-334`), "THERE IS NO VERSION ARITHMETIC" (`:372-374`). The widening is four rows plus the pair read on the rows that carry `programs` | research 131 §4.3 items 1 to 4; Phase 324's charter |
| D20 | **This Mac does not move.** `resources/gmux-tmux.conf`, `SERVER_OPTIONS`' rows and order, `localReassertOptions`, the bundled 3.7b, `TESTED_TMUX_PAIRS`, the local scroll's `copy-mode -e`, the local session names. Condition 16's two-way comparison with the conf is unchanged; the new fields are checked by condition 142 | no scenario worse than today |
| D21 | **The sign-in retry** (`src/main/machines/sign-in-retry.ts`, keyed on "not prepared") retries a `tmux-refused` machine every five minutes as it retries `version-unmeasured` today: the pair case reads two versions and re-runs the idempotent set-up; the required case re-sends idempotent `set-option`s. Nothing new is started | `sign-in-retry.ts:62-72`'s stated cost |
| D22 | **The phone's reads of a Linux session ride what is measured here**: the Screen's `SCREEN_FORMAT` (`src/main/screen/read.ts:55-56`), the extent read and `copy-mode -q` answered on 3.2a to 3.7c (§14 M3); no phone file moves | Phase 337 is unchanged; stated so a verifier does not re-derive it |
| D23 | **`gate:contract` does not move.** One member on the `MachineTestClass` union is not an inventory line (`docs/audits/contract-baseline.txt` lists channels, env names, columns, storage keys and smoke modes); no channel, env name, column or key is added. The integrator asserts it byte for byte | `docs/audits/contract-baseline.txt:1-6` |
| D24 | **One NEW leaf holds what Tortie knows about a machine's tmux in this run**: `src/main/machines/far-tmux.ts` exports `noteFarServerVersion(machineId, version)`, `farServerRow(machineId): TestedRemoteTmux \| null` (the row for the remembered version, or null), `noteFarPair(machineId, verdict)`, `farPairRefusal(machineId): string \| null` (the pair sentence's first line, or null), `assertFarPairUsable(machineId)` (throws `INVALID_INPUT` with that line) and `forgetFarTmux(machineId)` (called where `forgetRowFacts` is: remove and a retired route). It imports nothing but `../tmux/version` and `../errors`, so it is a leaf like `ready-context.ts` | `row-facts.ts` is written only at Prepare's END (`prepare.ts:288-299`), after the feed's first pass |
| D25 | **The pure gate over the pair** is `decideRemotePair(server, program, list = TESTED_REMOTE_TMUX_VERSIONS)` in `version.ts`: `{ kind: 'server-only' }` when the server's row has no `programs`, `{ kind: 'measured' }` when `program` is on it, else `{ kind: 'refused', server, program }` (a null program is `refused` with `program: null`) | D2, D3 |
| D26 | **The app reaches a container exactly as it reaches the loopback machine in Phase 340's probe**: a `GMUX_SSH_BIN` wrapper `exec /usr/bin/ssh -F <run>/ssh_config "$@"`, whose config names, per container, `Host p342-<row>`, `HostName 127.0.0.1`, `Port <published>`, `User tortie`, `IdentityFile <run key>`, `IdentitiesOnly yes`, `IdentityAgent none`, `GlobalKnownHostsFile /dev/null`; the product's own `-o UserKnownHostsFile` (Tortie's file first) beats the config, so the first-seen question is Tortie's own; the tailnet is `build/p340/tailscale-peers.mjs` behind `GMUX_TAILSCALE_BIN`, listing one peer per container (`p342-<row>`, OS `linux`). A sampler fails the run on any `/usr/bin/ssh` of the run whose first two arguments are not `-F <that config>` | `build/p340/probe-p340.mjs:51-77` (the wrapper, the first-value rule, the preflight by sha256, the sampler) |
| D27 | **The containers' harness is ONE helper, `build/docker-run.mjs`**, the only file under `build/` that names `docker` on a spawn, as `build/simulator-run.mjs` is for `simctl`: `withContainers(rows, run)` refuses under 10 GB free (`df -k /`, a sentence, exit 2), records the before lists, pulls a base image only by its exact reference, makes containers `tortie-p342-<row>-<run id>` from the distributions' OWN images (no `docker build`: its cache cannot be removed by name) with `-p 127.0.0.1::22` and no mount, installs inside with `docker exec` (`apt-get`, `dnf`, `pacman --disable-sandbox`), creates `tortie` with bash and `tortiesh` with the distribution's `useradd` default, starts `sshd` (dropbear on the emulated Arch row), and in a `finally` (and on SIGINT, SIGTERM, SIGHUP, installed before the first create) removes every container and every image it pulled that the before list lacks, by exact name, then compares the after lists and FAILS the run on any difference. `gate:docker` keeps it there (§6.2) | his ruling; the rule that made `simulator-run.mjs` (CLAUDE.md "A Simulator is made and ended only by build/simulator-run.mjs") |
| D28 | **Arch is the one emulated row** (`--platform linux/amd64`; no arm64 image exists, §14 M1) and signs in through dropbear, because OpenSSH's preauth sandbox cannot be installed under emulation (§14 M4). Every other row is arm64 and native, with OpenSSH | stated, not hidden |
| D29 | **`HELPER_USER_FLOOR` 170 → 171** (`build/assert-electron-teardown.mjs:469`) for `build/p342/probe-p342.mjs`; if another phase lands first, the next free number | CLAUDE.md obligation 1 |
| D30 | **Conditions 142 to 149 of `conformance:machines`** are appended as one block at the foot of `build/conformance-machines.mjs` (§6.1), after 141; if a phase landing first takes those numbers, the one landing second renumbers | the file's own rule (`:414-416`) |

**Subject.** `feat(machines): add an ordinary Linux machine, whatever tmux it ships`

**First body line.** `Phase 342: Linux machines on the tmux their distribution ships`

**Semver.** Minor, unreleased: Ubuntu 22.04 and 24.04 and Debian 12 and 13 as released can be prepared and used, a refused tmux
option is said as what it is, and saving and making folders work on every Linux machine. No release (phases 311 onward stay
unreleased until the phone ships end to end).

**Tier 3**, on four of CLAUDE.md's questions: it starts a program on another machine and every remote feature rides it; it can
lose the person's work (Prepare's durability options, the save path, a restore's folder); it claims to work across seven
distributions, so the evidence is a per-row matrix over their own packages; and it changes the one script that rewrites a
person's file on another machine. The independent methods are §7.8: four, one an attack, plus the parent measurement.

**Menus.** None move. No surface is added, renamed or removed; one class draws an existing chip with main's sentence.
`src/main/menu.ts` is asserted unchanged.

---

## 2. The tree at this head, re-read

| What | At `cb8d52a6` | Note |
| --- | --- | --- |
| The twelve rows | `src/main/tmux/server-options.ts:65-111` (`SERVER_OPTIONS`), `:127-129` (`remoteBootOptions`), `:132-139` (`setOptionArgs`, `showOptionArgs`) | D4, D5, D6 |
| Prepare's loop | `src/main/machines/remote-server.ts:205-226`: every row set in list order, `execOn` rejects on a non-zero exit, so the first refusal throws out of the loop | D6 |
| Prepare | `src/main/machines/prepare.ts:194-262` (`readRemoteTmuxVersion`, `-V` at `:246-251`), `:406` (the read), `:462-466` (the exec gate), `:551` (`ensureRemoteServer`), `:665-671` (`classOfFailure`: a refusal is `unknown` today) | D3, D9 |
| The version rows and gates | `src/main/tmux/version.ts:138-151` (`TestedRemoteTmux`), `:175-329` (five rows), `:335-345` (`decideRemoteControlGate`), `:382-396` (`decideRemoteVersionGate`), `:403-408` (`joinVersionList`) | D1, D2, D25 |
| The control gate's two askers | `src/main/machines/control-plane.ts:540-555` (the precheck), `:569-582` (`assertControlDialectMeasured`), `:612-700` (`openControlPlane`, its own read at `:651-659`, the gate at `:676`) | D3 |
| The attach | `src/main/sessions/core.ts:3777-3796` (`attachListedRemote`, by `$`-id), `:3814-3834` (`attachFarUnbound`, which calls it) | D4b |
| The create, rename, restore names | `src/main/machines/remote-sessions.ts:1671-1674`, `:2170-2172`; `remote-restore.ts:463`, `:509` | D12 |
| The list and its reader | `src/main/machines/remote-sessions.ts:399-402` (`REMOTE_LIST_FORMAT`), `:956-990` (`splitQuotedLine`), `:995` (`parseRemoteListLine`), `:3203-3206` (`nameOf`) | D13 |
| The `-J` readers | `src/main/machines/remote-capsule.ts:141-152` (`remoteCaptureArgs`), `:409`, `:524`; `remote-pane-history.ts:96-117`; `remote-arm.ts:447` | D14 |
| The scroll entry | `src/main/tmux/scroll.ts:301-303` (`readFormatFor`), `:626`, `:633`, `:674`, `:691`; `src/main/machines/scroll-shapes.ts:44` (header), `:192-197` (the row) | D11 |
| The far scripts | `src/main/machines/remote-scripts.ts:656-660` (`STORE_LIST`), `:2837-2838` (the comment), `:2928-2929` (`FILE_PUT`), `:3066-3067` (`DIR_NEW`), `:3165-3168` (`ENTRY_RENAME`), `:3836` (`FOLDER_PIN`, GNU first since 336) | D15 |
| The outcome copy | `src/main/machines/errors.ts:300-345` (the table), `:600-660` (`composeOutcomeCopy`), `:671-672` (no install command) | D10 |
| The class union | `src/shared/ipc/machines/connection.ts:73-97` | D10, D23 |
| The row's chip | `src/renderer/settings/machine-status.ts:177-179`; `machines-copy.ts:173-197` (`CHIP_WORDS`), `:695` (`MEASURED_VERSIONS`), `:983` (`REMEDY`); `AddMachine.tsx:756`; `MachineRow.tsx:120`, `:160` | D17, D18 |
| The row's memory | `src/main/machines/row-facts.ts:65-80` (`noteRowSignIn`, written after the feed starts) | D24 |
| The readiness leaf | `src/main/machines/ready-context.ts` (no pair question; ~30 callers) | D4b |
| The retry | `src/main/machines/sign-in-retry.ts:62-72` | D21 |
| The gates this phase meets | `build/conformance-machines.mjs`: condition 16 (the conf), 17 (row shape, `:1482`), 44 (measured beats accepted), 100 and 100e (the precheck, and NO WEIRD LABEL, `:11320-11410`), 102 and 103 (the carriage's table, `:11640-11700`, `SIX` at `:11865`), 113 to 121 (336), conditions run to 141; `src/main/tmux/__tests__/version.test.ts:645`, `:656`, `:761` pin the five-row list; `src/main/machines/__tests__/remote-scripts.test.ts:839-843` pins `stat -f %Lp "$p"` beside `stat -c %a "$p"`; `src/main/machines/__tests__/p3201-scroll-shapes.test.ts:353-369` pins the 4-element `copy-mode`; `build/p324/ablation.mjs:370-371`, `build/p3201/ablation.mjs:331`; `build/assert-electron-teardown.mjs:469` (`HELPER_USER_FLOOR = 170`) | §6 |
| The loopback and real-machine rows | `build/with-scratch-machine.mjs`, `build/scratch-machine.mjs` (`SCRATCH_MACHINE_QUIET_SHELL`, `SCRATCH_MACHINE_NO_OWN_KEYS`), `build/p3201/real-machine.mjs` (his Mac Pro, `P3201_REAL_*`) | §7.9 |
| Add a machine's probe | `build/p340/probe-p340.mjs:51-77` (the ssh wrapper, the tailnet stand-in, the sampler), `build/p340/tailscale-peers.mjs` | D26 |

---

## 3. Where the entry, research 131 and the measurement are reconciled

| # | The entry or research says | What was measured | This spec |
| --- | --- | --- | --- |
| 1 | Research 131 §1: 3.2a refuses `allow-passthrough`, 3.3a to 3.5a `copy-mode-position-format`, 3.2a to 3.5a `noattr` | the same three refusals, in the same words, on the distributions' own binaries (§14 M2) | confirmed on real Linux |
| 2 | Research 131 §4.2 and §7: "`allow-passthrough` on 3.2a has no fallback: images ... reach the terminal there as nothing"; §12 ruling 2: "Ubuntu 22.04 would still lack pass-through escapes" | 3.2a passes every wrapped sequence through with no option; 3.4 and 3.6 drop it without the option (§14 M6) | REFUTED; 3.2a loses nothing (D8 a) |
| 3 | Research 131 §4.3 item 3: 3.2a "stays refused unless the operator says otherwise" | his "so we should fix that" (2026-10-05) and the entry name Ubuntu 22.04 | 3.2a is a row (D1) |
| 4 | Research 131 §11 item 2: "the `$` stamp fix for 3.4" | 3.4's escape is on OUTPUT of options, formats and environment (§14 M9); separately, 3.2a to 3.4 STORE a session name's `$` with a backslash | both handled, by their measured rules (D12, D13) |
| 5 | Research 131 §3.3: "3.2a's `capture-pane -J` pads every line" | 63,143 bytes against 13,973 on 3.3a for the same 3,004 lines, the padding after the line's last escape (§14 M10) | D14 |
| 6 | Research 131 §3.4: a pair crossing 3.6 hangs; 3.3a under 3.5a works | Debian 13 3.5a server, trixie-backports 3.6b program: 0 bytes in 10 s, attach "open terminal failed: not a terminal", server and session alive; Debian 12 3.3a server, bookworm-backports 3.5a program: greeted (§14 M8) | confirmed on real Linux; D2, D3 |
| 7 | Research 131 §2.2: Ubuntu 26.04 prints `3.6` for package `3.6a-2ubuntu0.1` | `tmux 3.6`, `#{version}` `3.6`, package `3.6a-2ubuntu0.1`, Ubuntu 26.04.1 LTS (§14 M1) | the version that "lies" is admitted as what it prints (Phase 324's row) |
| 8 | Research 131 §2.1: Fedora 43/44 and Arch at 3.7c; Debian 13 backports 3.6b | Fedora 44 `3.7c-1.fc44`, Arch `3.7_c-1`, trixie-backports candidate `3.6b-1~bpo13+1`, bookworm-backports `3.5a-2~bpo12+1` (§14 M1, M8) | no 3.8 anywhere; no new row for 3.7c-family distributions |
| 9 | The entry's mechanism item 4: "336's identity check (GNU `stat -c`)" | folder-pin is right; four OTHER texts keep BSD `stat -f`'s stdout and two of them break saving and New Folder on every Linux machine, admitted ones included (§14 M11) | D15, in this phase, because it is the Linux far path the entry names |
| 10 | Phase 343: "342's Linux matrix should add one linked-folder row" | `tree-list` under a root that is a link: `find -H` follows it on GNU findutils 4.8 to 4.11 (§14 M11) | arm L8 |
| 11 | The task: "the login shell and PATH an ssh session gets" | non-login PATH is sshd's compiled default (`/usr/local/sbin:...:/snap/bin` on Ubuntu, `/usr/local/bin:/usr/bin:/bin:/usr/games` on Debian, `~/.local/bin:~/bin:/usr/local/bin:/usr/bin` on Fedora via its bashrc, `/usr/bin` on Arch under dropbear); the login PATH adds `/usr/local/games` on Debian and the perl folders on Arch; tmux is `/usr/bin/tmux` everywhere and the check finds exactly one (§14 M4) | D16; nothing to change |
| 12 | Research 131 §8: "a real ssh hop" unmeasured | a real `sshd` per distribution, reached through `build/ssh-run.mjs` (§14 M4); `LANG` arrives only where `AcceptEnv` or PAM's locale file sets it (Ubuntu and Debian accept `LANG`, Fedora and Arch do not) | D22; the locale class is §11's, not this phase's |

---

## 4. The design

### 4.1 Prepare's option table — `src/main/tmux/server-options.ts`, `src/main/machines/remote-server.ts`

- `ServerOption` gains `oldest: string` and `without: OptionWithout`, where
  `type OptionWithout = { kind: 'required'; purpose: 'history' | 'stays-up' | 'failed-screen' | 'scrolling' } | { kind: 'fallback'; value: string } | { kind: 'skip' }`.
  The twelve rows' values, scopes and order are unchanged (D20). The values of the new fields are D5's.
- `remoteBootOptions()` returns `history-limit` first, then the other eleven in `SERVER_OPTIONS`' order (D4).
- NEW pure `isOptionRefusal(text: string, name: string, value: string): boolean` (D6's seven shapes, the LAST non-empty line of
  `text` compared whole, the name or the value compared byte for byte).
- `ensureRemoteServer(ctx, how)`:
  - `how` gains `version: string | null` (the version Prepare's gate read). When the server is `born`, the version is read from it
    before any option (D9); a disagreement throws `RemoteTmuxRefused({ kind: 'disagrees', said: how.version, ran })`.
  - The set loop: each row's value through `execOn`; a rejection whose `GmuxError` detail satisfies `isOptionRefusal` is handled
    by the row's `without` (D6); any other rejection propagates as today. A `required` refusal throws
    `RemoteTmuxRefused({ kind: 'required', name, purpose, version })` and nothing after it is sent.
  - The read-back is unchanged for set rows; a skipped row is not read back; a fallback row is read back against its fallback.
  - `RemoteServerResult` gains `refused: readonly { name: string; expected: boolean; outcome: 'fallback' | 'skipped' }[]`,
    where `expected` is "the server's row lacks it" (D7, through `farServerRow`).
  - `stillRouted()` is asked after every command exactly as today (Phase 340.1), the new read and the fallback included.
- `RemoteTmuxRefused` is a NEW error class beside `RemoteServerSetUpStopped`; `prepare.ts` maps it to class `tmux-refused`
  with D10's sentence (1) or (4); a `refused` entry with `expected: false` appends sentence (2) to the prepared detail.

### 4.2 The rows and the pair — `src/main/tmux/version.ts`, NEW `src/main/machines/far-tmux.ts`, `prepare.ts`, `control-plane.ts`, `core.ts`

- `TestedRemoteTmux` gains three optional, readonly fields: `programs?: readonly string[]` (D2), `lacks?: readonly string[]` (D7)
  and `quirks?: { readonly dollarOnRead?: true; readonly joinedCapturePads?: true }` (D13, D14). The four new rows (D1), in
  order, carry:

| Row | `programs` | `lacks` | `quirks` | Measured on |
| --- | --- | --- | --- | --- |
| `3.2a` | `['3.2a']` | `allow-passthrough`, `copy-mode-position-format`, `mode-style` | `joinedCapturePads` | Ubuntu 22.04.5's `3.2a-4ubuntu0.2`, arm64 |
| `3.3a` | `['3.3a', '3.5a']` | `copy-mode-position-format`, `mode-style` | — | Debian 12's `3.3a-3`, arm64; the 3.5a program is bookworm-backports' `3.5a-2~bpo12+1` |
| `3.4` | `['3.4']` | `copy-mode-position-format`, `mode-style` | `dollarOnRead` | Ubuntu 24.04.5's `3.4-1ubuntu0.1`, arm64 |
| `3.5a` | `['3.5a']` | `copy-mode-position-format`, `mode-style` | — | Debian 13's `3.5a-3`, arm64 |

  The "Measured on" column lives HERE and in the commit body, never in a row's subject or note (condition 100e, his ruling 1).
- `decideRemotePair` (D25) is pure. `prepare.ts`: after the gate answers `measured` and when the read was the server's (a
  `display-message` answer), `decideRemotePair(version, <-V read>)`; `refused` → `noteFarPair`, then the set-up and the feed
  run as for any measured version (D3), then the answer is `tmux-refused` with sentence (3). `noteFarServerVersion` is called
  the moment the gate reads a version (D9, D24).
- `control-plane.ts`: the precheck and `openControlPlane` each make the `-V` read only when `farServerRow`'s row carries
  `programs`; `refused` → `noteFarPair`, `setLink(machineId, 'polling', <pair sentence's first line>)`, no spawn; in the
  precheck, the refusal closes the plane the way a missed greeting does, so no reconnect loop (D3). The precheck's
  `display-message` stays the FIRST read before every spawn (condition 100 is unchanged and must stay green).
- `core.ts`: `attachListedRemote` asks `assertFarPairUsable(remote.machineId)` after `readyRemoteContext` (D4b). That one line;
  `conformance:farattach` runs because the function is on its path list.

### 4.3 The sentences and the row — `errors.ts`, `connection.ts`, `machine-status.ts`, `machines-copy.ts`

D10's four sentences as exported constants and composers in `errors.ts`; `COPY` gains `'tmux-refused'` (headline and detail
composed per shape, `alarm: false`); `MACHINE_OUTCOME_CLASSES` grows by one (condition 6x reads it). `connection.ts` adds the
member. `machine-status.ts` maps it (D18). `MEASURED_VERSIONS` (D17).

### 4.4 Scroll-back's entry — `src/main/tmux/scroll.ts`, `src/main/machines/scroll-shapes.ts`

D11. The helper is exported for the tests and the conformance reader; the four sites call it. The table's row changes and its
`repeat` text says the same measured idempotence ("entering copy mode twice kept the view at position 100") plus "with `-H` the
drawn rows are the same as without it on a tmux that has `copy-mode-position-format`, and tmux's position box is hidden on one
that has not".

### 4.5 The far names and the two read quirks — `remote-sessions.ts`, `remote-restore.ts`, `remote-capsule.ts`, `remote-pane-history.ts`, `remote-arm.ts`

- `farTmuxName` (D12) at the three sites.
- `undoDollarEscape(field)` (D13), applied by the feed's pass to `name`, `project` and `path` of each parsed row when
  `farServerRow(machineId)?.quirks?.dollarOnRead === true`; `parseRemoteListLine` stays pure and unchanged.
- `stripJoinedPadding(text)` (D14), pure, exported from `remote-capsule.ts`, applied by the three `-J` readers when
  `farServerRow(machineId)?.quirks?.joinedCapturePads === true`.
- `remoteCreate` and the remote restore ask `assertFarPairUsable` before their create line (D4b).

### 4.6 The far scripts — `src/main/machines/remote-scripts.ts`

D15's four edits. The lines, exactly:

- `FILE_PUT` and `DIR_NEW`: `m=$(stat -f %Lp …)` / `if [ -z "$m" ]; then m=$(stat -c %a …); fi` become
  `if [ "$wq" = -c ]; then m=$(stat -c %a "<x>" 2>/dev/null || true); else m=$(stat -f %Lp "<x>" 2>/dev/null || true); fi`,
  where `<x>` is `$f` and `$p` as today.
- `ENTRY_RENAME`: the same two lines as the write prelude's probe (`wq=$(stat -c '%d:%i' / 2>/dev/null || true)` then
  `if [ -n "$wq" ]; then wq=-c; else wq=-f; fi`), placed once above the `tp=1` arm (the prelude may already define `wq`; if it
  does, reuse it and add nothing), and `a=`/`b=` read with `stat "$wq" '%d %i'`.
- `STORE_LIST`: the two `find` lines swap, GNU first.

No other text moves; `REMOTE_SCRIPT_COUNT` stays 30; every `params` stays.

### 4.7 What does not change

This Mac's tmux, conf, boot, names and scroll (D20); both gates' kind (D19); the carriage's other seven rows; Phase 340's check
and its install folders; the phone (D22); `gate:contract` (D23); the menus.

---

## 5. The measured matrix

### 5.1 Per option: the oldest tmux that took it, and what Tortie does without it

Every cell is the distribution's own binary, `set-option` then `show-options` through `/bin/sh -c` on a scratch socket, the
shipping argv emitted from `src/` (§14 M2). "took" = exit 0 and read back equal.

| Row | 3.2a (U22.04) | 3.3a (D12) | 3.4 (U24.04) | 3.5a (D13) | 3.6 (U26.04) | 3.7c (F44, Arch) | `oldest` | `without` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `status off` (-g) | took | took | took | took | took | took | 3.2a | skip |
| `escape-time 0` (-s) | took | took | took | took | took | took | 3.2a | skip |
| `extended-keys on` (-s) | took | took | took | took | took | took | 3.2a | skip |
| `allow-passthrough on` (-g) | `invalid option: allow-passthrough` | took | took | took | took | took | 3.3a | skip (3.2a passes always, §14 M6) |
| `focus-events on` (-s) | took | took | took | took | took | took | 3.2a | skip |
| `default-terminal tmux-256color` (-g) | took | took | took | took | took | took | 3.2a | skip |
| `remain-on-exit failed` (-g) | took | took | took | took | took | took | 3.2a | required |
| `exit-empty off` (-s) | took | took | took | took | took | took | 3.2a | required |
| `mouse off` (-g) | took | took | took | took | took | took | 3.2a | required |
| `copy-mode-position-format ''` (-g) | `invalid option: copy-mode-position-format` | same | same | same | took | took | 3.6 | skip (copy mode with `-H`) |
| `mode-style noattr,bg=default,fg=default` (-g) | `invalid style: noattr,bg=default,fg=default` | same | same | same | took | took | 3.6 | fallback `bg=default,fg=default` (took on all four) |
| `history-limit 25000` (-g) | took | took | took | took | took | took | 3.2a | required, written first |

The `tmux-256color` terminfo entry was present on every distribution after installing tmux alone (`infocmp tmux-256color`
exit 0; `/lib/terminfo/t/` or `/usr/share/terminfo/t/`).

### 5.2 Every other far command Tortie sends, per version

| Command (the shipping argv) | 3.2a | 3.3a | 3.4 | 3.5a | 3.6 | 3.7c |
| --- | --- | --- | --- | --- | --- | --- |
| `start-server ; set-option -s exit-empty off` | exit 0 | exit 0 | exit 0 | exit 0 | exit 0 | exit 0 |
| `new-session -d -P -F '#{session_id}' -s … -c … -e GMUX_MANAGED=1 -e GMUX_SESSION_ID=… -- /bin/sh` | `$0` | `$0` | `$0` | `$0` | `$0` | `$0` |
| `set-option -t $0 @gmux-name 'a $HOME b'`, read back | equal | equal | **`a \$HOME b`** | equal | equal | equal |
| `list-sessions -F <REMOTE_LIST_FORMAT>` | 10 fields | 10 | 10 (`\\$` in field 10) | 10 | 10 | 10 |
| `capture-pane -p -e -J -t $0 -S -10000` over 3,004 lines | **63,143 B, 3,004 padded lines** | 13,973 B | 13,973 B | 13,973 B | 13,969 B | 13,981 B |
| `display-message -p -t $0 -F <REMOTE_STATE_FORMAT>` live | `0  2980 24 0 0 80 ` | same | same | same | same | same |
| over `-C new-session -A -s gmux-control`: `refresh-client -f no-output` | `%end` | `%end` | `%end` | `%end` | `%end` | `%end` |
| the list over the control connection | equal to exec | equal | equal | equal | equal | equal |
| `copy-mode -e -t $0`, `send-keys -X -N 30 scroll-up`, `top-line`, read | parked `1 30 2980 24 0 0 80 ` | same | same | same | same | `… 80 2980` (limit set) |
| `send-keys -X goto-line 1500`, read | `1 1500 …` | same | same | same | same | same |
| `send-keys -X cancel` twice | second answers `not in a mode` | same | same | same | same | same |
| `copy-mode -e -H -t $0`, then read | in mode, `%end` | same | same | same | same | same |
| `send-keys -t $0 -H 65 63 68 6f` | `%end` | same | same | same | same | same |
| the 35 `POCKET_SCREEN_KEY_NAMES` as `send-keys -t $0 <Name>` | 35 `%end` | same | same | same | same | same |
| `copy-mode -q -t $0`; `SCREEN_FORMAT`; `#{history_size} #{pane_height}` | exit 0; 8 fields; 2 fields | — | same | — | same | same |

Every control-connection run ended with exactly two `%error` blocks, both expected (the second `cancel` and a deliberate
`can't find session`), and 50 `%end`s (§14 M3).

### 5.3 The pair, on the real packages

| Server | Program (installed under it) | Live connection in 10 s | Attach | Server after |
| --- | --- | --- | --- | --- |
| 3.5a (Debian 13 `3.5a-3`) | 3.6b (trixie-backports `3.6b-1~bpo13+1`) | **0 bytes** | `open terminal failed: not a terminal` | alive, same pid, its session listed |
| 3.3a (Debian 12 `3.3a-3`) | 3.5a (bookworm-backports `3.5a-2~bpo12+1`) | 234 bytes, greeted | (the harness's own pty lacked `TERM`; not a pair result) | alive |

Both servers still refused `copy-mode-position-format` and `noattr` through the new program, and took `allow-passthrough`.

### 5.4 The Linux far scripts (the SHIPPING texts, as `tortie`, in its home)

| Script | Every distribution |
| --- | --- |
| `folder-pin` | equals `stat -c '%d:%i' <dir>/.` |
| `file-put` over an existing file | **exit 1, no marker, `chmod: invalid mode: '  File: …'` (uutils: `chmod: invalid digit found in string`), the file unchanged, `a.txt.tortie-part` left** |
| `file-put` new file | `wrote <sha256> 9`, mode 600 |
| `dir-new` | **folder made 700 under a 755 parent; answer `made` + five lines of file-system status** |
| `dir-new` with the home as the folder | `offlimits` |
| `dir-new` in a first-level child of the home (336.1) | made (mode 700, the same defect) |
| `entry-rename` b → c / c onto existing a | `moved` / `exists` (the second by accident: two status blocks differ in their `File:` line) |
| `tree-list` under a root that is a link (343) | `ok 2 … inner/ … inner/f` |
| `tree-list` of a project holding a link to a folder | the link listed `link//` |
| `store-list` since 0 / since 1 | five garbage lines per file, then the GNU lines / the GNU lines only |

---

## 6. The gates, clause by clause

### 6.1 `conformance:machines` — conditions 142 to 149 (appended, D30)

Every condition reads the code with the TypeScript parser where a clause is about code, DRIVES a pure function where one
exists, and is proved red by `ablation:p342` (§6.3). Fixtures are committed under `build/fixtures/p342/`.

- **142 — the option table.** Every `SERVER_OPTIONS` row has `oldest` and `without`; exactly four are `required` (the names of
  D5) and exactly one is a `fallback` (`mode-style`, value `bg=default,fg=default`); `remoteBootOptions()[0]` is `history-limit`
  and the rest are `SERVER_OPTIONS`' order without it; `localReassertOptions()` is the five rows in `core.ts`'s order (as
  today); `isOptionRefusal` answers true for the seven shapes over `build/fixtures/p342/refusals.json` (the measured lines of
  §14 M5) and false for a dropped link, `no server running on …`, `error connecting to …`, a refusal naming ANOTHER row, a value
  that differs by one byte, and an empty text; `set-option -q` appears nowhere in `src/main/machines/` or
  `src/main/tmux/server-options.ts`.
- **143 — the rows.** The four rows of D1 exist, oldest first, before 3.6, each `measured: { exec: true, control: true }`; each
  carries `programs` whose first element is its own version and every element a version string on the table; `lacks` and
  `programs` and `quirks` are absent on every row from 3.6; each row's `lacks` equals the refusals of that version in
  `build/fixtures/p342/matrix.json` (§5.1, committed by the proof builder from §14) and each option's `oldest` equals the first
  row of the matrix's order that took it; `quirks` exactly as D13 and D14; 100e stays green on the new subjects and notes;
  `MEASURED_VERSIONS` equals the exec list (the existing test) and has nine entries.
- **144 — the pair.** `decideRemotePair` is DRIVEN over every row × the versions on the table plus `null` and `3.9z`: `server-only`
  for every row from 3.6, `measured` exactly for the listed pairs, `refused` otherwise. The precheck, `openControlPlane` and
  Prepare each reach `decideRemotePair` (read by the parser), the `-V` read in each is behind a `programs` check, and in the two
  control-plane readers it stands AFTER the `display-message` read and BEFORE `new TmuxControlClient` / the client's spawn
  (condition 100's order is untouched). `assertFarPairUsable` is called in `attachListedRemote`, `remoteCreate` and the remote
  restore and NOWHERE ELSE (refusing in `readyRemoteContext` would take the Explorer, D4b). `far-tmux.ts` imports only
  `../tmux/version` and `../errors`.
- **145 — the born server's version.** `ensureRemoteServer`, on its `born` branch, sends `display-message -p '#{version}'` before
  the first `setOptionArgs` and throws `RemoteTmuxRefused` on a disagreement with `how.version`; DRIVEN over a recording `execOn`
  stand-in: a born server reporting `3.2a` with `how.version` `3.7c` sends zero `set-option`s.
- **146 — the refusal path, driven.** Over the recording stand-in answering per §5.1 for each of the nine versions: 3.2a to 3.5a
  end prepared with `refused` entries all `expected: true` and no appended sentence; a stand-in that refuses `allow-passthrough`
  on 3.7c ends prepared with sentence (2); one that refuses `remain-on-exit` ends `tmux-refused`, `history-limit` already sent
  first, nothing sent after the refusal, the detail naming `3.7c` and `keep a session's screen when its program fails`;
  `classifyMachineOutput` is never reached by a recognised refusal; none of the four sentences contains `could not reach`.
- **147 — scroll-back's entry.** `enterCopyModeArgs` is DRIVEN: a runner with `server` answers the five-element `-H` form, one
  without answers today's four elements; the four sites in `scroll.ts` call it and no other `'copy-mode'` literal stands in
  `scroll.ts`; the carriage's `enter-copy-mode` row is exactly `[copy-mode, -e, -H, -t, TARGET]`; `-H` stands in exactly two
  rows; `admitScrollArgv(['copy-mode', '-e', '-t', '$1'])` is now REFUSED and the five-element form admitted. Conditions 102 and
  103 are re-pointed, not weakened (the table still has eight rows and three non-idempotent).
- **148 — the far names and the read quirks.** `farTmuxName` is DRIVEN (`cost $HOME` → `cost -HOME`, `$` alone → `-`, a name with
  no `$` unchanged byte for byte); the create, the rename and the restore call it; `undoDollarEscape` is DRIVEN over §14 M9's
  thirteen values (the 3.4 answer in, the value out) and applied only behind `dollarOnRead`; `stripJoinedPadding` is DRIVEN over
  `build/fixtures/p342/capj-3.2a.txt` and `capj-3.3a.txt` (3.2a's padded lines come out equal to 3.3a's except a line's own
  trailing spaces) and applied only behind `joinedCapturePads`, at exactly the three `-J` readers.
- **149 — the far scripts read GNU first.** No folder-bound or store text keeps the stdout of a BSD `stat -f` that runs before a
  GNU spelling: read as text, `FILE_PUT`'s and `DIR_NEW`'s mode reads branch on `wq`, `ENTRY_RENAME`'s identity reads use
  `stat "$wq"`, `STORE_LIST` names `stat -c` before `stat -f`. DRIVEN under `/bin/sh` and `/bin/dash` with
  `build/p342/gnu-stat-standin.sh` first on `PATH`, a stand-in that answers `-c FORMAT` and `-L -c` as GNU does and, for `-f`,
  prints GNU's five-line file-system status to stdout and exits 1 (its own self-test proves it does both): `file-put` over an
  existing 644 file answers `wrote`, keeps 644 and leaves no `.tortie-part`; `dir-new` under a 755 parent answers `made 755` and
  makes 755; `entry-rename` answers `moved` and `exists`; `store-list` answers only three-field lines. And again with no
  stand-in (this Mac's BSD `stat`): the same answers as at the parent, byte for byte, so the Mac's far machines do not move.

### 6.2 `gate:docker` (NEW `build/assert-docker-teardown.mjs`, inside `npm run build`, ~0.1 s, spawns nothing)

Only `build/docker-run.mjs` names `docker` on a spawn under `build/`; it names no `prune`, `system`, `login`, `builder`, `build`,
`commit`, `push`, `-v`/`--volume`/`--mount`, `/var/run/docker.sock`, `--privileged`, a `$(` or a filter on `rm`; every name it
composes starts `tortie-p342-` (or `tortie-<phase>-` for a later phase that reuses it, through one constant); its teardown is in
a `finally` read by matching braces, with handlers for `exit`, SIGINT, SIGTERM and SIGHUP installed before the first `run`; it
refuses to remove an image that is in the before list it read; the population of callers has a floor (`DOCKER_USER_FLOOR`, 2:
`probe-p342.mjs` and `measure-p342.mjs`). Bad fixtures and controls in NEW `build/docker-fixtures.mjs` (a `docker` spawned from
another file, a prune, a pattern removal, a mount of `/Users`, a teardown outside a `finally`, a name without the prefix), each
red; and one-clause helper ablations, each red.

### 6.3 `ablation:p342` (NEW `build/p342/ablation.mjs`)

One arm per clause of 142 to 149, each a sibling copy of the shipping source with ONE clause broken, red on the condition or the
vitest case that owns it, and the tree restored by sha256 in a `finally`: `history-limit` back to last; a fifth `required`; the
fallback deleted; `isOptionRefusal` accepting a refusal that names another row; `isOptionRefusal` accepting `no server
running`; `-q` added to `setOptionArgs`; a row's `lacks` missing `mode-style`; `programs` added to 3.6; `3.5a` added to 3.4's
`programs`; the `-V` read moved before `display-message` in the precheck; `assertFarPairUsable` moved into `readyRemoteContext`;
the born re-read removed; `enterCopyModeArgs` answering `-H` for this Mac's runner; the table keeping the four-element row;
`farTmuxName` keeping `$`; `undoDollarEscape` applied without the quirk; `stripJoinedPadding` applied to `remote-screen.ts`'s
capture; each of the four script edits reverted alone; the stand-in's `-f` printing nothing (the drive must then catch it via
the self-test, not pass).

### 6.4 The other gates

- `conformance:machines` 16, 17, 44, 100, 100e, 102, 103, 113 to 121 stay green (100e on the new rows' words; 115's
  folder-pin GNU-first clause unchanged).
- `conformance:farattach` (the `attachListedRemote` and `remoteCreate` lines) and `ablation:p326`.
- `ablation:p320` and `build/p3201/ablation.mjs` (the table row, re-pointed by the proof builder); `ablation:p324`
  (`build/p324/ablation.mjs:370-371`, re-pointed if its anchor moved); `ablation:p336` (the four texts' anchors).
- `probe:p336:script` (`build/p336/script-arms.mjs`): its 253 rows must still agree between `/bin/sh` and `/bin/dash` on this Mac
  (the BSD path); it does not name `-L gmux` and starts no Electron, so it IS run (unlike `probe:p336`).
- `gate:electron` (171), `gate:background` (the probe's samplers and the container processes it starts are each ended in a
  `finally` naming them), `gate:knownhosts` (every ssh, keyscan through `build/ssh-run.mjs`), `gate:checks` (the new scripts
  classified), `gate:contract` (unchanged, asserted), `gate:simulator` (untouched).
- `build/assert-bundle-refusals.mjs`: four new pins (`machine.tmux-too-old`, `machine.tmux-setting-refused`,
  `machine.tmux-updated-under-sessions`, `machine.tmux-version-disagrees`).

---

## 7. The proof, run rather than read

### 7.1 The battery

`npm run typecheck && npm run build && npm run smoke:t1`; the integrator adds `npm test`, `npm run smoke`, `npm run smoke:t3`,
`npm run package`; the path-triggered gates of §6 (`conformance:machines`, `conformance:farattach`, `ablation:p342`,
`ablation:p320`, `ablation:p324`, `ablation:p326`, `ablation:p336`, `probe:p336:script`); `probe:controldeadline` once (the
precheck moved). NOT run: `smoke:remote`, `smoke:machines`, `probe:p268`, `probe:p336`.

### 7.2 Vitest (the builders')

`src/main/tmux/__tests__/server-options.test.ts` (the two new fields, the order, `isOptionRefusal` over the fixture),
`version.test.ts` (the nine-row lists at `:645`, `:656`, `:761`; `decideRemotePair`), `src/main/machines/__tests__/remote-server.test.ts`
(the refusal arms, the born re-read, `stillRouted` after the new reads), `prepare.test.ts` (`tmux-refused` three ways, the pair
after a warm read, the appended sentence), `control-plane.test.ts` (the pair in both readers, no spawn, the plane closed),
NEW `p342-far-tmux.test.ts` (the leaf), `errors.test.ts` (the four sentences, never "could not reach"),
`remote-scripts.test.ts` (`:839-843` re-pointed to the branch), `p3201-scroll-shapes.test.ts` (`:353-369` re-pointed; the
five-element row), `src/main/tmux/__tests__/scroll.test.ts` (`enterCopyModeArgs` both ways), NEW `p342-far-names.test.ts`
(`farTmuxName`, `undoDollarEscape`, `stripJoinedPadding`), `src/renderer/settings/__tests__/machines-copy.test.ts`
(`MEASURED_VERSIONS`), `p340-machine-status.test.ts` (the chip).

### 7.3 The committed fixtures — NEW `build/fixtures/p342/`

`matrix.json` (§5.1 and §5.2's cells, one object per version, with the package and architecture each was read from), `refusals.json`
(§14 M5's lines), `capj-3.2a.txt` and `capj-3.3a.txt` (generated by `measure:p342` from the distributions' own binaries, plain
text; their bytes contain no control character but the newline: the SGR escapes are written as the six-character text `\033[`
and decoded at test time, CLAUDE.md's rule on raw control bytes), `dollar-3.4.json` (§14 M9's thirteen values and answers).

### 7.4 `measure:p342` — the re-derivation outside Electron (NEW `build/p342/measure-p342.mjs` → `drive-p342.mts`)

Builders and verifiers. Through `build/docker-run.mjs`, one container per row; the SHIPPING composers and readers through the
pinned tsx, every far string handed to the container's `/bin/sh -c` by a stand-in `sshBin` that runs `docker exec -i
<container> /bin/sh -c <last argument>` (the p324 driver's carriage, `build/p324/drive-p324.mts:39-50`, pointed at a container):
the twelve rows through the SHIPPING `ensureRemoteServer` (so D6's reader meets the real words), the list through
`parseRemoteListLine` and the D13 reader, the shipping `TmuxControlClient` over `CONTROL_ATTACH_ARGS` (greeting, no-output, the
list, the seven scroll shapes through the SHIPPING `scroll.ts` functions over a remote runner, the 35 key names), the nested-client
indicator read (D8 b, an outer tmux on its own socket inside the container drawing the real attach), the four far scripts and
`folder-pin`/`tree-list` through `/bin/sh` AND the distribution's `dash` where it has one, and the two pairs (D2). It writes
`matrix.json` and the capture fixtures and grades them against the committed ones; `--self-test` grades recorded fixtures and
starts nothing. About 6 minutes for seven rows on this Mac (§14's run: installs dominate).

### 7.5 `probe:p342` — the Linux matrix in the app (NEW `build/p342/probe-p342.mjs`)

**Verifiers only, under the lock.** It sanitises itself first exactly as `probe:p340` does (`HOME` and `ZDOTDIR` scratch,
`HISTFILE=/dev/null`, `SSH_AUTH_SOCK` and `TERM_SESSION_ID` deleted, exit 2 by name if `SSH_AUTH_SOCK` survives). Then:

1. **The containers** (`build/docker-run.mjs`): rows `u2204` (`ubuntu:22.04`), `u2404` (`ubuntu:24.04`), `u2604`
   (`ubuntu:26.04`), `d12` (`debian:bookworm-slim`, in the before list, kept), `d13` (`debian:13`), `fed` (`fedora:latest`),
   `arch` (`archlinux:latest`, amd64, dropbear); `P342_ROWS` narrows. Each gets `tmux` from its own package manager, an `sshd`,
   the run's public key for `tortie` and `tortiesh`, and a scratch project `~/proj` (a 644 `a.txt`, a 755 `sub/`, a link
   `proj/link → ~/real` holding `inner/f`) and a folder holding `$` in its name (`~/cost $d`).
2. **The app**: ONE Electron per build through `withElectron`, the PARENT FIRST when `P342_PARENT_CHECKOUT` names a built
   checkout of `cb8d52a6` (one after the other, never at once), each on its own scratch profile, HOME and the harness socket
   (whose name is also the far socket, `activeTmuxSocket`; nothing names `-L gmux`), the D26 ssh wrapper and tailnet stand-in
   (preflighted by sha256, sampled every second), `--use-mock-keychain`, the scratch `agents.json`.
3. **The arms, per row** (graded at HEAD; the parent's reading printed beside each):
   - **L1 add**: Settings then Machines, Add a machine, pick `p342-<row>`, Check, trust its first-seen key, Add. Graded: one tmux
     found at `/usr/bin/tmux` with the row's version; Ready; no acceptance sheet; presses and typed fields counted (0 typed).
   - **L2 prepare's reading**: by the probe's OWN `docker exec` (never the app): the twelve options as §5.1 predicts per version
     (fallback `mode-style` on 3.2a to 3.5a, no `copy-mode-position-format` there, no `allow-passthrough` on 3.2a,
     `history-limit` 25000); the prepared detail carries NO appended sentence on any measured version.
   - **L3 create**: Open a folder on it… `~/proj`, a new shell session named `cost $HOME é`; it draws its screen; its listed name
     reads `cost $HOME é` on every row (D12, D13; the `é` is graded only where the machine's ssh session has a UTF-8 `LANG`, and
     reported elsewhere, §11 item 1); the far tmux name holds no `$`.
   - **L4 live connection**: the link reads connected; a session the probe makes on the far server with no `@gmux-id` is never
     shown (NOT OURS); a rename typed in Tortie arrives on the far side.
   - **L5 scroll back**: in the session, `seq 1 3000` typed through the terminal; the renderer's wheel path scrolls back 30 lines;
     by `docker exec`, `#{pane_in_mode}` 1 and `#{scroll_position}` 30; the xterm buffer's row 0 holds no `[` position box on
     every row (D11); typing returns to live.
   - **L6 restore**: `docker restart` the container (a reboot), the harness starts `sshd` again as a boot would; the session reads
     restorable; Restore; a session again, in `~/proj` (by `docker exec`, `#{pane_current_path}`); and a session created in
     `~/cost $d` restores INTO `~/cost $d` on every row, 3.4 included (D13).
   - **L7 save**: open `~/proj/a.txt`, type, ⌘S. By `docker exec`: the bytes equal what was typed (sha256), mode 644, no
     `.tortie-part`; the parent reading is the failure §1 item 2 describes, on every row the parent can prepare.
   - **L8 New Folder and rename (336, 336.1, 341)**: New Folder in `~/proj` → `untitled folder`, mode 755, no error line;
     rename it to `made`; New Folder in a first-level child of the home works; a folder at the home itself is refused as today.
   - **L9 a linked folder (343)**: `link` lists as a folder with the link mark and expands to `inner/` and `inner/f`; a file under
     it opens read only.
   - **L10 Catch Me Up's reader**: a `claude` stand-in the harness installs at `/usr/local/bin/claude` in the container writes the
     committed transcript `docs/research/assets/63-fixtures` names (copied INTO the container by `docker exec -i … tee`) to
     `~/.claude/projects/<slug>/<uuid>.jsonl` and draws the committed Phase 312 dialog; a Claude Code session on the machine;
     ⌘J's Catch Me Up shows the fixture's last answer (the remote harvest's `store-list`, `store-head`, `store-copy` on GNU).
4. **The attack** (§7.7).
5. **RUN**: every container and pulled image gone (the helper's own proof, printed), no Electron of the run left (counted once at
   the end, CLAUDE.md's command), his history stats unchanged, `app.log` holding no far file content.

`--grader-self-test` grades the hand-written `build/p342/fixtures/{head-honest,parent-honest,hostile}.json` (an honest HEAD
record, an honest parent record, and every grader broken alone on a realistic misreading) and starts nothing. `P342_KEEP=1`
keeps the records for the verifier's re-derivation. Exit 0 all passed, 1 an arm failed, 2 could not run or an arm unreadable
(never a pass). Cost: not yet measured; budget 25 to 40 minutes for both builds over seven rows (installs about 4 minutes in
parallel, §14).

### 7.6 Where the no-regression rows run (his rule, his Mac Pro and the loopback machine first)

- **N1, the loopback machine** (`build/with-scratch-machine.mjs` with `SCRATCH_MACHINE_QUIET_SHELL=1` and
  `SCRATCH_MACHINE_NO_OWN_KEYS=1`; Homebrew's 3.6a and the vendored 3.7b), parent and HEAD: Prepare's commands (the same set,
  `history-limit` first at HEAD), no sentence appended, a session, scroll back (row 0's drawn bytes equal at both builds), save
  (mode kept), New Folder (`made 755`, the BSD path), rename, a session named `cost $HOME` (listed the same; far tmux name `-HOME`
  at HEAD).
- **N2, his Mac Pro** (`P342_FAR=real` through `build/p3201/real-machine.mjs`, its eight refusals and his dotfiles census, verifiers
  only): Prepare's option read-back and scroll-back's row 0 at both builds, read only; no save on his machine.

### 7.7 The attack arms (in `probe:p342`, each at parent and HEAD)

- **K1, a tmux that refuses what the table says it takes.** A row from `ubuntu:26.04` whose `/usr/bin/tmux` is a wrapper the
  probe installs in front of the real binary (moved within the container), which refuses ONE `set-option` with tmux's own words
  and execs the real tmux for everything else; the refused row is chosen by a file the probe writes. (a) `allow-passthrough`:
  prepared, Ready, sentence (2) on the row's hover, sessions work. (b) `remain-on-exit`: `tmux-refused`, sentence (1) naming `3.6`
  and its purpose, `history-limit` read back 25000 by `docker exec`, nothing after the refusal sent (the wrapper logs every
  argv), never "could not reach". At the parent: "could not reach … does not recognise the reason".
- **K2, a version string that lies.** (a) Ubuntu 26.04's `3.6` for package `3.6a`: admitted as `3.6`, the row reads `3.6`.
  (b) A `ubuntu:22.04` row whose wrapper answers `-V` with `tmux 3.7c` and runs 3.2a for everything else, with no server: Prepare
  answers `tmux-refused` with sentence (4) (`It says 3.7c and runs as 3.2a`), zero `set-option`s sent (wrapper log), no feed.
- **K3, tmux upgraded under a running server.** The `d13` row after L1 to L5: `apt-get install -t trixie-backports tmux` inside
  the container while the server runs, then Prepare (and, separately, a relaunch). Graded: `tmux-refused` with sentence (3)
  naming `3.6b` and `3.5a`; the answer in under 10 s; zero far control children spawned after the upgrade (`ps` in the container
  for `-C new-session`); the link `polling`; the session still listed; opening it draws sentence (3)'s first line and spawns no
  ssh `-t`; Save in `~/proj` still works. Counter-arm on `d12`: bookworm-backports 3.5a under the 3.3a server: prepared, live
  connection greets, the session opens. At the parent both rows read the unmeasured refusal.
- **K4, the far `stat`.** Covered in the app by L7 and L8 on seven real coreutils builds, and outside it by condition 149's
  stand-in.

### 7.8 The independent methods (four, one an attack) and the parent

1. **Re-derive** (the verifier's own harness, neither `measure:p342` nor `probe:p342`): the per-version option, refusal and
   fallback table, the pair cells and the four scripts' answers, in containers of its own, compared cell by cell with
   `build/fixtures/p342/matrix.json`.
2. **Attack**: K1 to K3, plus at least one of its own (a wrapper refusing `mode-style`'s FALLBACK too; a refusal whose words
   differ from tmux's; a server upgraded between the precheck's two reads; a `$` name renamed on 3.2a).
3. **Run over real data**: seven distributions' own packages, OpenSSH on six and dropbear on one.
4. **Measure the parent**: every L, K and N arm at `cb8d52a6` and at HEAD.

### 7.9 No regression against today

| Scenario | Today (parent) | HEAD |
| --- | --- | --- |
| Loopback machine and his Mac Pro: Prepare, scroll, save, New Folder | works | the same commands but `history-limit`'s position and `-H`; the same drawn bytes; the same answers |
| 3.6, 3.6a, 3.6b, 3.7b, 3.7c Linux: Prepare, scroll | works | the same |
| 3.6, 3.6b, 3.7c Linux: save an existing file | fails, `.tortie-part` left | works |
| 3.6, 3.6b, 3.7c Linux: New Folder | made 700, "cannot tell you" | made with the parent's mode, no error |
| 3.2a to 3.5a: anything | "could not reach" at Prepare | works |
| An unmeasured or accepted version (3.7, 3.8, 3.0a) | the acceptance sheet; on accept, Prepare stops at the first refusal | the acceptance sheet; on accept, a refused optional row is skipped with sentence (2), a required one is `tmux-refused` |
| A pair across 3.6 (3.5a server, newer program) | "could not reach" (Prepare fails on 3.5a anyway) | `tmux-refused`, sessions listed, sentence instead of a terminal that closes |

---

## 8. The CHANGELOG item

Under `## Unreleased`, `### Added` (one commit, one section); the follow-up docs commit adds the link.

- `- Ubuntu 22.04 and 24.04 and Debian 12 and 13 machines can now be added and used with the tmux they come with, prepared in one press with a live connection and scroll-back like a session on your Mac, and saving a changed file or making a folder now works on every Linux machine, where every save of an existing file used to fail and leave a copy ending in .tortie-part beside it. If a machine's tmux is updated while its sessions keep running, Tortie now says so, and that they open again after that machine restarts, instead of opening a terminal that closes at once`

**Sentences this phase makes false, his to reword** (the integrator raises them; the smallest true edits proposed, the commit
body says the wording is his): the Unreleased item "A session on another machine now scrolls back like one on your Mac, … on
machines running tmux 3.6, 3.6a, 3.6b, 3.7b or 3.7c; on any other tmux only full-screen programs that use the mouse scroll"
(`CHANGELOG.md:17`), proposed "… on machines running tmux 3.2a or newer that Tortie has measured; on any other tmux only …".

---

## 9. CLAUDE.md rows (the integrator's)

- **`conformance:machines`'s row**: its trigger paths gain `src/main/tmux/server-options.ts`, `src/main/machines/remote-server.ts`,
  NEW `src/main/machines/far-tmux.ts`, `decideRemotePair` in `src/main/tmux/version.ts`, `enterCopyModeArgs` in
  `src/main/tmux/scroll.ts`, `farTmuxName` and `undoDollarEscape` in `remote-sessions.ts`, `stripJoinedPadding` in
  `remote-capsule.ts`, and the four texts `FILE_PUT`, `DIR_NEW`, `ENTRY_RENAME`, `STORE_LIST` in `remote-scripts.ts`; its
  description gains one sentence: "Since Phase 342 (conditions 142 to 149) Prepare's twelve rows each declare the oldest tmux
  that took them and what Tortie does without them, `history-limit` is written first, a refusal is read only in tmux's own seven
  shapes, the four rows before 3.6 carry the programs measured against them, a server Tortie started must report the version its
  program said, copy mode on another machine is entered with `-H`, a far tmux name holds no `$`, 3.4's dollar and 3.2a's padding
  are undone only behind their rows' quirks, and no far script keeps the stdout of a BSD `stat -f` it ran before the GNU
  spelling, driven under a GNU stand-in; `ablation:p342` is the attack beside it".
- **NEW gate row**: `build/` — any script that runs `docker`; `build/docker-run.mjs` | `gate:docker` | ~0.1 s, spawns nothing |
  "Only `build/docker-run.mjs` names `docker` on a spawn; every name it composes starts `tortie-p342-`; no prune, build, login,
  mount, socket or pattern removal; its teardown is in a `finally` with the four signal handlers installed before the first run;
  it never removes an image the before list holds; the population has a floor".
- **Machine discipline**: one bullet beside the Simulator's: "**A Docker container is made and ended only by
  `build/docker-run.mjs`** (Phase 342), under his ruling of 2026-10-05 … Count at the end with `docker ps -a --format
  '{{.Names}}' | grep -c tortie-p342`, which must read 0, and compare `docker images` with the before list."
- **Probes table**: `measure:p342` (the docker-exec re-derivation, no Electron) and `probe:p342` (the app matrix), each one line
  with its cost once measured.

---

## 10. Builders, disjoint files, and who owns what is shared

Three builders in `/private/tmp/wt-p342` at once, on `cb8d52a6`. Each codes against the names pinned in §4 and D24/D25. No file
is in two lists. Builders run `npm run -s typecheck` and the vitest files they own, and MAY run containers for measurement under
the Docker rules (through `build/docker-run.mjs` once the proof builder has written it, or a scratch script of their own that
follows every rule of §0); they launch no Electron, run no probe and no whole `npm test`, and never commit, stage or stash.

| Builder | Owns |
| --- | --- |
| **prepare** (the boot, the rows, the pair, the sentences) | `src/main/tmux/server-options.ts`; `src/main/tmux/version.ts`; `src/main/machines/remote-server.ts`; `src/main/machines/prepare.ts`; `src/main/machines/errors.ts`; NEW `src/main/machines/far-tmux.ts`; `src/main/machines/control-plane.ts` (the precheck and `openControlPlane`'s pair read only); `src/main/sessions/core.ts` (`attachListedRemote`'s one ask only); `src/main/machines/index.ts` (re-exports only, if any); `src/shared/ipc/machines/connection.ts` (one member); `src/renderer/settings/machines-copy.ts` (`MEASURED_VERSIONS`), `src/renderer/settings/machine-status.ts` (the chip); tests `src/main/tmux/__tests__/{server-options,version}.test.ts`, `src/main/machines/__tests__/{remote-server,prepare,control-plane,errors}.test.ts`, NEW `src/main/machines/__tests__/p342-far-tmux.test.ts`, `src/renderer/settings/__tests__/{machines-copy,p340-machine-status,machines-section,add-machine}.test.ts*` (only where they pin the five-row list or the class set) |
| **far** (the far side's texts, names and readers, and the scroll entry) | `src/main/machines/remote-scripts.ts` (the four texts and the comment at `:2837-2838` only); `src/main/machines/remote-sessions.ts` (`farTmuxName`, `undoDollarEscape` and its application in the pass, the create's pair ask); `src/main/machines/remote-restore.ts` (the name and the pair ask); `src/main/machines/remote-capsule.ts`, `remote-pane-history.ts`, `remote-arm.ts` (the trim); `src/main/tmux/scroll.ts` (`enterCopyModeArgs` and its four sites); `src/main/machines/scroll-shapes.ts` (the row, its `repeat`, the header's `-H` sentence); tests `src/main/machines/__tests__/{remote-scripts,p3201-scroll-shapes}.test.ts`, `src/main/tmux/__tests__/scroll.test.ts`, NEW `src/main/machines/__tests__/p342-far-names.test.ts`, and any `remote-sessions`/`remote-restore`/`remote-capsule`/`remote-pane-history`/`remote-arm` test whose expectation the trim or the name moves |
| **proof** (the harness, the gates, the probes, the fixtures, the words) | NEW `build/docker-run.mjs`, NEW `build/assert-docker-teardown.mjs`, NEW `build/docker-fixtures.mjs`; NEW `build/p342/{probe-p342.mjs,measure-p342.mjs,drive-p342.mts,gnu-stat-standin.sh,tmux-wrapper.sh,ablation.mjs,CHECKLIST.md}` and `build/p342/fixtures/**`; NEW `build/fixtures/p342/**`; `build/conformance-machines.mjs` (142 to 149 appended; 102, 103 re-pointed); `build/machines-conformance-probe.mts` (only if a condition needs its readings); `build/assert-electron-teardown.mjs` (171); `build/assert-bundle-refusals.mjs` (four pins); `build/verification-checks.mjs` (the new scripts classified); `build/background-fixtures.mjs` (if a new start shape appears); `build/p324/ablation.mjs`, `build/p3201/ablation.mjs`, `build/p336/ablation.mjs` (anchors only) |

**Shared files and their one owner.** `src/shared/ipc/machines/connection.ts` is **prepare**'s; `far-tmux.ts`'s exports are
**prepare**'s and **far** codes against D24's names; `remote-sessions.ts` is **far**'s and calls `assertFarPairUsable` and
`farServerRow`; **`CHANGELOG.md`, `CLAUDE.md`, `package.json` (`probe:p342`, `measure:p342`, `ablation:p342`, `gate:docker` in
`build`) and `docs/audits/contract-baseline.txt` (must NOT move) are the integrator's**; this file is the spec's, and the
integrator appends "§As built — 342"; **`docs/BACKLOG.md` belongs to the main session**.

**The integrator** reconciles the pinned names (`OptionWithout`, `isOptionRefusal`, `RemoteTmuxRefused`, `decideRemotePair`,
`noteFarServerVersion`, `farServerRow`, `noteFarPair`, `farPairRefusal`, `assertFarPairUsable`, `forgetFarTmux`,
`enterCopyModeArgs`, `farTmuxName`, `undoDollarEscape`, `stripJoinedPadding`, the four sentence names, `tmux-refused`); runs §7.1
except what needs the lock; runs `measure:p342` once (no Electron) and commits nothing it did not re-derive; scans the delta for
control, bidi, zero-width and BOM characters and for duplicated blocks of ten lines or more; writes the CHANGELOG item and the
CLAUDE.md rows; appends "§As built — 342".

**The verifiers** (two lenses, each under the lock): Lens 1, the attack and the re-derivation (§7.8 methods 1 and 2,
`measure:p342`, `ablation:p342`, K1 to K4); Lens 2, the app run (`probe:p342` at parent and HEAD, N1 and N2). Each names the step
it did that the builders did not.

---

## 11. What this sends to other phases and the main session

1. **Found on the way, each its own entry, none fixed here.** (a) **A far read through a client with no UTF-8 locale answers
   every non-ASCII character as `_`**, on every version and on any far machine whose ssh session carries no `LANG` (measured:
   `ünïcode` read back `_n_code` with no `LANG`, correctly with any `LANG` naming UTF-8 or with `-u`, §14 M13). A session name, a
   project or the phone's Screen of such a machine draws `_`. Ubuntu and Debian accept a forwarded `LANG`; Fedora 44 and Arch do
   not, though their own shell set one in the measured sessions. The exec plane cannot take `-u` where the verb ledger reads the
   verb (`remote-sessions.ts:362-366`). (b) **A session name holding `#{…}` or a backslash misses its own exact match on every
   version, this Mac's included** (`#{host}` becomes the host name, `a\b` is stored `a\\b`; §14 M9). (c) Research 131 §4.2's
   passthrough sentence and §12 ruling 2's "Ubuntu 22.04 would still lack pass-through escapes" are refuted (§3 row 2); a
   bracketed note in place is the main session's call.
2. **The save defect is live today** on every admitted Linux machine (3.6, 3.6b, 3.7c). If this phase stalls, D15 alone (four
   text edits, condition 149, its ablation arms) is a narrow fix the main session may land first.
3. **Issue 31** (Jake Levirne): nothing is posted (his ruling 4).
4. **3.8**: still no row; it joins when final, measured with a 3.7c server under a 3.8 program (research 131 §4.3 item 5). Fedora 44
   and Arch read 3.7c on 2026-10-07.

---

## 12. What is NOT in this phase

- **No Windows. No release.**
- **No distribution beyond the seven**: not Ubuntu 20.04 (3.0a), RHEL and its rebuilds, Amazon Linux, Alpine (BusyBox `find`
  and `stat`), openSUSE or NixOS; no amd64 row but Arch's emulated one; no cloud VM.
- **No row for 3.7, 3.7a or 3.8**, and no `programs` on a row from 3.6 (a pair gate there refuses the rolling upgrade that works).
- **No version arithmetic, no capability probe, no acceptance on the control gate** (research 131 §4.2, rejected; D19).
- **Tortie ends nothing** on a machine whose tmux was updated under its sessions (his ruling 3), restarts no server, upgrades
  nothing and names no install command.
- **No `set-option -q`**, no new option, no change to this Mac's conf, boot, names or scroll (D20).
- **No `-u` on the exec plane** and no locale forwarding (§11 item 1 a); no fix for `#{…}` or `\` in names (§11 item 1 b).
- **No change to the phone** (D22), to Phase 340's check or install folders, or to any far script but the four.
- **No new verb on the ledger, no ninth row on the carriage**; `REMOTE_SCRIPT_COUNT` stays 30.
- **No `docker build`, no image of Tortie's own, nothing installed on the Mac.**

---

## 13. Open concerns handed to the verifiers

1. **A container is not a machine.** No systemd, no `/etc/default/locale` (Ubuntu 22.04, 26.04 and both Debians had none; real
   installs usually do), overlayfs rather than ext4 (`folder-pin`'s device and inode agreed with `stat -c` on it), a root-made
   account rather than a cloud image's default user. State which arms a real install could answer differently.
2. **Only Arch is amd64**, and under emulation; Ubuntu's and Debian's amd64 binaries are not run (pulling an amd64 `ubuntu:24.04`
   would re-tag HIS image, so it is refused; research 131 read the amd64 `.deb` version constants as bytes).
3. **3.2a under a 3.4 program is refused** (not on 3.2a's `programs`), so an Ubuntu 22.04 machine upgraded to 24.04 without a
   reboot reads sentence (3) though research 131 measured that pair working on Mac builds. Conservative by design; a verifier
   who measures it on the real packages may propose adding it.
4. **The pair read costs one more exec per control spawn** on the four older rows only; on a wedged machine the precheck's 2 s
   bound (`CONTROL_PRECHECK_TIMEOUT_MS`) now applies twice.
5. **Dropbear is not OpenSSH**: the Arch row's ssh behaviour (no `AcceptEnv`, its own command execution) is a stand-in for
   Arch's real `sshd`.
6. **The mode a NEW file gets (600) and a folder's mirroring rule** are Phase 101's and 336's on every machine; only the read of
   the mode moves here.

---

## 14. What the spec step measured, how, and the numbers

All in `<scratch>/p342/spec/` (scratch does not survive a reboot): the scripts (`up.sh`, `measure.sh`, `indicator.sh`,
`dollar.sh`, `dollar2.sh`, `names.sh`, `names2.sh`, `names3.sh`, `pair.sh`, `passthrough2.sh`, `refusals.sh`, `fmt.sh`,
`capj.sh`, `locale.sh`, `sshd-up.sh`, `ssh-measure.mjs`, `writes.mjs`, `home1.mjs`, `emit-tmux.mts`, `emit-check.mts`,
`cleanup.sh`) and their outputs (`m-*.txt`, `ind-*.txt`, `dollar-*.txt`, `pair-*.txt`, `ssh-measure*.json`, `writes-*.json`,
`writes-rest.txt`, `tmux-argv.json`, `far-texts.json`, `check-command.txt`, the before and after Docker lists).

- **M0, Docker.** Engine 28.0.4 answered at the start. `up.sh` ledgered each name BEFORE creating it; seven containers
  `tortie-p342-spec-*`, each `docker run -d -p 127.0.0.1::22 <image> sleep infinity`, no mount. Pulled: `ubuntu:26.04` (177 MB),
  `debian:13` (206 MB), `fedora:latest` (279 MB), `archlinux:latest` (567 MB, amd64); used and kept: `ubuntu:22.04`,
  `ubuntu:24.04`, `debian:bookworm-slim`. Container writable layers 151 to 322 MB. `cleanup.sh` exit 0 removed seven containers
  and four images by exact name; `diff` of before and after: images (repo:tag and id) IDENTICAL, containers IDENTICAL, volumes
  IDENTICAL; `tortie-p342` containers, images, volumes and networks: 0, 0, 0, 0. `df -h /`: 21 GB free before, 12 GB at peak, 13
  GB after.
- **M1, what each distribution installs, 2026-10-07.** Ubuntu 22.04.5 LTS `3.2a-4ubuntu0.2` prints `tmux 3.2a`; Ubuntu 24.04.5 LTS
  `3.4-1ubuntu0.1` → `3.4`; Ubuntu 26.04.1 LTS `3.6a-2ubuntu0.1` → **`3.6`**; Debian 12 `3.3a-3` → `3.3a`; Debian 13 `3.5a-3` →
  `3.5a`; Fedora 44 `tmux-3.7c-1.fc44.aarch64` → `3.7c`; Arch `tmux 3.7_c-1` → `3.7c`. `/bin/sh` is dash on Ubuntu and Debian,
  bash on Fedora and Arch. Coreutils: GNU 8.32, 9.4, 9.1, 9.7, 9.10, 9.12 and **uutils 0.10.0 on Ubuntu 26.04**; findutils
  4.8.0 to 4.11.0. `useradd -D` shell: `/bin/sh` on Ubuntu and Debian, `/bin/bash` on Fedora and Arch. Arch: `pacman -Syu`
  failed under emulation (`error restricting syscalls via seccomp: 22`) and succeeded with `--disable-sandbox`.
- **M2, the twelve rows** (`measure.sh`, the shipping argv from `emit-tmux.mts`, exit 0 for each container): §5.1. Fallbacks:
  `mode-style bg=default,fg=default` exit 0, read back equal, on all seven; `set-option -q` rescued the two missing names and
  not `noattr` (exit 1 `invalid style`) on 3.2a to 3.5a.
- **M3, every other command**: §5.2 (`measure.sh`'s CONTROL block over a fifo-fed `-C` client, `fmt.sh`).
- **M4, real ssh** (`ssh-measure.mjs` through `build/ssh-run.mjs`: scratch ed25519 key, scratch record file seeded by keyscan,
  `-F /dev/null`, `IdentitiesOnly=yes`, `IdentityAgent=none`, `GlobalKnownHostsFile=/dev/null`, `StrictHostKeyChecking=yes`):
  every row exit 0 for both accounts after Arch moved to dropbear (OpenSSH there: `ssh_sandbox_child: prctl(PR_SET_SECCOMP):
  Invalid argument [preauth]`, connection closed). The non-login PATHs and login PATHs of §3 row 11; `LANG` unset on Ubuntu
  22.04, 26.04 and both Debians, `C.UTF-8` on Ubuntu 24.04 (PAM, `/etc/default/locale`), Fedora and Arch; with `SendEnv=LANG`
  `en_US.UTF-8` arrived on every Ubuntu and Debian row (`AcceptEnv LANG LC_*`) and not on Fedora or Arch. Phase 340's check
  (the shipping `composeCheckCommand(null)`, 1,797 bytes): `login=read`, `cand=login /usr/bin/tmux`, `count=1`, the row's
  version, on all seven for both accounts.
- **M5, tmux's refusal words**, identical on 3.2a, 3.6 and 3.7c (`refusals.sh`): `bad value: maybe` (`mouse`), `value is
  invalid: abc` (`history-limit`), `value is too small: -5`, `unknown value: sometimes` (`remain-on-exit`, `status`,
  `extended-keys`), `value is invalid: x` (`escape-time`), `invalid style: bogus=1`, `invalid option: no-such-option`, each exit
  1; `default-terminal ''` exit 0.
- **M6, pass-through** (`passthrough2.sh`: a wrapped OSC `ESC P tmux; ESC ESC ] 1337;P342MARK BEL ESC \` printed in a pane, an
  attached client under `script -f`): 3.2a REACHED with no option (the option is refused); 3.4 dropped without, REACHED with; 3.6
  dropped without, REACHED with. Unwrapped text reached on all.
- **M7, the drawn indicator** (`indicator.sh`: an outer tmux on its own socket runs the real attach; `capture-pane -p -t outer`
  row 0 parked 30 lines back): 3.2a and 3.3a `2948 [30/2978]` vs `2948` with `-H`; 3.4 and 3.5a `2948 19:34:50 [30/2978]` vs
  `2948`; 3.6, Fedora 3.7c and Arch 3.7c `2948` both ways with **byte-identical escapes** (`capture-pane -p -e`).
- **M8, the pair** (`pair.sh`): §5.3. Debian 13: `before: program=tmux 3.5a server=3.5a pid=4384`, install exit 0, `after:
  program=tmux 3.6b server=3.5a pid=4384`, `control_bytes_in_10s=0`, `attach=[open terminal failed: not a terminal]`,
  `server_alive_after=3.5a 4384`. Debian 12: `program=tmux 3.5a server=3.3a`, `control_bytes_in_10s=234`, greeting present.
- **M9, the dollar** (`dollar.sh`, `dollar2.sh`, `names.sh`, `names2.sh`, `names3.sh`): stamps — only 3.4 differs, `a $HOME b` →
  `a \$HOME b`, `\$x` → `\\$x`, `${x}` → `\${x}`, `$_a` → `\$_a`, `$ab$cd` → `\$ab\$cd`, `$a b$c` → `\$a b\$c`, `a$Bc` → `a\$Bc`;
  unchanged on 3.4: `cost $5`, `$`, `$1`, `$-`, `$$`, `$#`, `$}`, `$é`, `x$`; 3.4's `-c '/tmp/p342 $d'` reads back
  `/tmp/p342 \$d` and its `-e P342X=a$b` reads back `a\$b` while the pane printed `a$b` (output, not storage). Session names —
  `new-session -s 'cost $HOME'`: 3.2a and 3.3a store `cost \$HOME` and `has-session -t '=cost $HOME'` exits 1; 3.4 the same
  (displayed `cost \\$HOME`); 3.5a, 3.6 and 3.7c store `cost $HOME` and match. On EVERY version `#{host}` in a name is expanded
  and `a\b` is stored doubled (§11 item 1 b). `café` matched everywhere with `LANG=C.UTF-8`.
- **M10, the joined capture** (`measure.sh`, `capj.sh`): 3,004 lines: 3.2a `-J` 63,143 B with 3,004 trailing-space lines, without
  `-J` 13,969 B and 0; 3.3a, 3.4, 3.5a `-J` 13,973 B with 2 (the line `trail   ` keeps its own spaces); 3.6 13,969 B; 3.7c 13,981 B.
  3.2a's pad stands after the line's last SGR (`ESC[31mred ESC[39m` then spaces to the width).
- **M11, the far scripts** (`writes.mjs`, `home1.mjs`: the SHIPPING texts from `far-texts.json` via
  `docker exec -u tortie … /bin/sh -c <text> tortie-<id> <args>`): §5.4 on all seven. GNU `stat -f %Lp <dir>`: 5 lines on stdout,
  exit 1, on every distribution.
- **M12, PATH, terminfo, small GNU behaviours**: `tmux-256color` present on all seven; `head -n 0` exit 0; `base64 -d` decodes,
  `base64 -D` exit 1 (uutils exit 0); `shasum` absent on Fedora and Arch; `mv -n` prints `not replacing` on Ubuntu 24.04 only.
- **M13, the locale** (`locale.sh`): with no `LANG` a stamp `ünïcode<TAB>tab` reads back `_n_code_tab` on 3.2a to 3.7c; with
  `LANG=C.UTF-8`, `en_US.UTF-8` or `de_DE.UTF-8` (not generated, only `C.utf8` exists) or with `-u`, it reads back whole.
- **His history**: `734376 1791391290` and `23166 1790702242` at every check, before the first container and after the last
  clean-up.

---

## 15. Questions for him

None blocks the build. The two the main session may raise: whether to land D15 first on its own (§11 item 2), and whether to
queue §11 item 1's two classes.

---

## §Attack — the adversary round's revised decisions (rebuilt after the reboot)

The adversary round of 2026-10-07 revised this file in place and appended its own §Attack (825 lines to 1,108).
The reboot of 2026-10-08 wiped `/private/tmp`, and the worktree was rebuilt by replaying only the agents' Write and
Edit calls, so the appended §Attack and some of the in-place revisions did not come back (this file is 841 lines,
and D3, D24 and §6.1's condition 148 above still read as the spec step wrote them). What follows is the round's own
typed list of its decisions, kept in the workflow's results, VERBATIM. **Where a row above disagrees with this list,
this list is the authority**; the builders built from it. The round's scratch (its M-A measurements) was under
`/private/tmp` and is gone; its findings F1 to F16 and measurements M-A1 to M-A7 are cited by these rows.

- D1 (revised): four rows 3.2a, 3.3a, 3.4, 3.5a join TESTED_REMOTE_TMUX_VERSIONS before 3.6, each measured {exec:true, control:true}. Subjects and notes obey condition 100e word for word, and that condition reads the array's comments too. control:true now rests on Phase 324's eight dialect steps, which the adversary measured equal to 3.6 on all four (§Attack M-A2). measure:p342 reproduces that on every run, and a version that differs keeps control:false. Sources: §14 M2-M8, §Attack M-A2.
- D2: programs lists: 3.2a:['3.2a'], 3.3a:['3.3a','3.5a'], 3.4:['3.4'], 3.5a:['3.5a']. Rows from 3.6 get none. 3.2a under a 3.4 program stays refused because it is unmeasured on the packages. Sources: §14 M8, research 131 §3.4/§4.3.
- D3 (rewritten, §Attack F1/F2): ONE program read, in Prepare only. readRemoteProgramVersion(ctx) is factored out of readRemoteTmuxVersion in prepare.ts, so condition 40's five execRemoteShell callers stand. It is read on a warm server whose row carries programs, and the verdict goes to the leaf keyed by the server version. openControlPlane (after its read and gate, before new TmuxControlClient) and assertControlDialectMeasured (inside the precheck, whose three-statement body condition 100b pins and which stays untouched) only CONSULT the leaf. They refuse and never admit. On refusal openControlPlane adds dialectRefused (scroll falls back to pass-through), sets link polling with the pair line, and spawns nothing. A refused precheck reconnects through the client's own backoff and spawns nothing; the first read of a new server version reopens. Prepare still runs set-up and feed and answers tmux-refused. A live connection already open is left alone (measured still answering, §Attack M-A6). An unreadable program blocks only the live connection. Stated residual: a program replaced after the last Prepare is learnt at the next one; until then today's greeting-deadline path applies.
- D4 (revised): Prepare WRITES history-limit first. The read-back and the row's settings list keep SERVER_OPTIONS order, so 3.6+ machines read as today. Local conf, boot and localReassertOptions are untouched.
- D4b (revised, §Attack F3): assertFarPairUsable is asked synchronously in attachListedRemote, in remoteCreate before its create line, and in the remote restore after its ensureRemoteServer (:330) and before remoteCreateArgs (:509). It is asked nowhere else. signInToConfirmedMachines (core.ts:1619-1625) arms the retry but no longer calls markMachineQuiet for tmux-refused, which falsely wrote every row unknown and 'did not answer'.
- D5: each ServerOption gains oldest and without. required for history-limit, exit-empty, remain-on-exit, mouse; fallback 'bg=default,fg=default' for mode-style; skip for the other seven.
- D6: a refusal is read only in tmux's seven measured stderr shapes (isOptionRefusal over the last non-empty line). Anything else throws as today. A refused fallback becomes a skip; a required refusal stops with tmux-refused. No set-option -q.
- D7: each version row declares lacks. A refusal the row lacks is silent; any other optional refusal appends sentence (2) to the prepared detail.
- D8: the measured fallbacks change nothing drawn. 3.2a always passes passthrough; -H hides the copy-mode box; mode-style fallback is taken; Tortie has no OSC/image/clipboard addon (verified: package.json lists fit, web-links, webgl only).
- D9 (revised, §Attack F4): a born server is re-read for #{version} after the boot's stillRouted() and before any option, then noted (noteFarServerVersion, noteFarPair(ran,ran)). It is compared only when Prepare passed how.version. Restore and create, which also boot servers (remote-restore.ts:330, remote-sessions.ts:1737), get the re-read and the note, which clears a stale pair refusal. RemoteTmuxRefused.message is sentence (1) or (4). An empty server started on a disagreement stays and is stated.
- D10 (revised, §Attack F5): four sentences under the new class tmux-refused. (1) too old for a required row. (2) one optional setting refused, appended to prepared. (3) headline 'This machine's tmux was updated while its sessions kept running.' with detail 'Tortie has not measured tmux ${program} with the tmux ${server} that still runs them, so it opens no session there. After that machine restarts, Tortie can restore them.' ('cannot open' was false for 3.2a/3.4). (4) 'is not the version it says'. None says 'could not reach'. Four bundle pins.
- D11: remote copy mode is entered with copy-mode -e -H through enterCopyModeArgs in scroll.ts; this Mac's runner is byte-identical to today. The carriage row becomes [copy-mode,-e,-H,-t,TARGET]; -H then appears in two rows. Measured: row 0 is identical on 3.6/3.7c and the box is hidden on 3.2a-3.5a.
- D12 (revised, §Attack F6): farTmuxName maps $ to '_' (not '-') at create and rename; the restore maps $ to '_' in the record's name. Measured on all five versions: a name beginning with '-' is read as flags by rename-session's positional, so '-' would have broken renames to '$HOME …' on machines that work today. The display name is kept whole. Attach by =$N measured correct on 3.2a-3.6.
- D13 (reason corrected, §Attack F7): on 3.4 only, undoDollarEscape removes one backslash before $[A-Za-z_{] in @gmux-name, @gmux-project and session_path. It protects the LIVE row's name, project tab and Session.cwd. A restore uses the manifest's create-time cwd (remote-restore.ts:513), not session_path.
- D14 (revised, §Attack F8): on 3.2a, stripJoinedPadding applies to the capsule's two captures and the joined history copy only. remote-arm.ts is not touched, because its counter removes every space.
- D15 (revised, §Attack F9): THREE texts change: FILE_PUT and DIR_NEW mode reads branch on the wq that folderCheck already sets, and STORE_LIST runs GNU find/stat first. ENTRY_RENAME is NOT edited. Measured: with the real identity, a rename onto a hard link reaches mv, which GNU and uutils refuse with no answer, where today's text answers 'exists'. The edited texts were measured right on GNU 8.32/9.4/9.1/9.7, uutils 0.10.0 and BusyBox, and identical to shipping on this Mac's BSD stat under sh and dash. REMOTE_SCRIPT_COUNT stays 30.
- D16: Linux far paths measured green are left alone: folder-pin, the 336.1 home rules, 343's find -H, ls -A -p, head, base64 -d, the sha256sum fallback, Phase 340's check.
- D17: MEASURED_VERSIONS becomes the nine-row list. The Add Machine sheet draws it and nothing beside it.
- D18 (revised, §Attack F10): tmux-refused maps to the chip 'Not usable' with main's first sentence and no next step. The arm sits beside version-unmeasured's and before the connecting/ready arms, because the pair case leaves ready plus a polling link, which would otherwise read Ready. No REMEDY row.
- D19: both gates keep their kind: byte equality on the server's version, measured rows only, no acceptance on control, no version arithmetic.
- D20: this Mac does not move: conf, SERVER_OPTIONS, local reassert, bundled 3.7b, local scroll, local names.
- D21 (revised): the sign-in retry retries tmux-refused every 5 min (about 27 idempotent execs). Its Prepare is what learns that a far restart happened. The launch sign-in no longer marks such a machine quiet.
- D22 (rewritten, §Attack F11): the phone's reads ride what is measured; SCREEN_FORMAT's reader already takes '_' for a tab. KEY BYTES measured over 33 names × 7 modes. On 3.2a-3.4 a program at modifyOtherKeys level 2 is answered at level 1, so Ctrl+letter, Shift+Tab and Alt+b arrive as legacy bytes. On 3.5a, level 1 turns Shift+Tab into CSI 27;2;9~. The same applies to desk keys; Claude Code, pi and Antigravity are at level 2 and opencode at level 1 (research 20). Stated, not fixed; no phone file moves.
- D23: gate:contract does not move; the new class member is not an inventory line.
- D24 (revised): the leaf src/main/machines/far-tmux.ts holds noteFarServerVersion, farServerRow, noteFarPair(machineId, server, program) keyed by server, farPairRefusal (only when the verdict's server is the remembered one), farPairBlocksLive, assertFarPairUsable and forgetFarTmux. forgetFarTmux is called beside forgetRowFacts at ipc.ts:837 and removal.ts:258. It imports only ../tmux/version and ../errors.
- D25: decideRemotePair(server, program) is pure: server-only, measured or refused.
- D26 (revised): the app reaches containers through a GMUX_SSH_BIN wrapper with -F <run ssh_config> and a FIXED published port (an ephemeral one measured moving on docker restart: 51646→51666→51681), plus the tailnet stand-in and a sampler.
- D27 (hardened, §Attack F15): build/docker-run.mjs is the only docker spawner. It refuses runs under 10 GB free (his ruling) and pulls explicitly by exact ref, with --platform only for refs not in the before list. Every docker run has --rm, --pull never, a fixed -p 127.0.0.1:<port>:22, a sleep 7200 main process and no mount. Every name is ledgered before it is created, and --sweep <ledger> removes leftovers. One run at a time, under a lock file. image rm never uses -f and only removes the id recorded at pull. finally plus SIGINT/TERM/HUP handlers; after-lists are compared, and any difference fails the run.
- D28: Arch is the one emulated amd64 row, signing in through dropbear.
- D29: HELPER_USER_FLOOR 170→171 for probe-p342.mjs.
- D30 (revised, §Attack F12): conditions 142-149 are appended. 102, 103 and 109 are re-pointed: 109's list of files spelling '-H' gains src/main/tmux/scroll.ts, where '-H' may appear only inside enterCopyModeArgs. 144 adds one program read, the leaf consults, and conditions 40/100b green. 148 checks the '_' mapping and that no name begins with '-'. 149 becomes a whole-catalogue rule with ENTRY_RENAME's compare-only pair as its one named exception.
- CORRECTIONS (§Attack F14/F16): today the four versions get the unmeasured refusal plus the acceptance sheet ('could not reach' only after accepting). prepare.ts classOfFailure is :658-663, not :665-671. readRemoteTmuxVersion is :223-295. CONTROL_PRECHECK_TIMEOUT_MS is 5,000 ms, not 2 s. The scroll-shapes header is at :37-38. errors.ts: COPY table :191-346, composer :550-647. K2(b) grades 'nothing after the boot invocation', not 'zero set-options'. K3 now grades the existing live connection kept, reconnects spawning nothing after a dropped link, no quiet at relaunch, and recovery after restart plus Prepare. L6 uses a fixed port and clears /tmp/tmux-*. New arms: L3 cwd/project via the bridge, L4 rename to '$HOME notes', L5 box control, L11 stage/commit, L12 keys. measure:p342 now runs the eight dialect steps, the key bytes, all 30 far texts and the hard-link rename. CHANGELOG: drops 'like a session on your Mac' and the file name, adds the keys limit; the wording is his.

The round's own report, also kept: it changed only this file; its six throwaway containers
(`tortie-p342-adv-*`) and three pulled images were removed and Docker's lists compared identical with the before lists;
his history read `734900 1791405989` and `23166 1790702242` throughout.

---

## §As built — 342 (the integrator's, rebuilt after the reboot)

Written by the integrator on 2026-10-08 and lost with `/private/tmp` that morning; rebuilt from its report, which the
workflow kept. Its own logs (`integrator-r3/logs/`) and the measurement record it names are gone.

- **The class is `program-refused`, not `tmux-refused`** (the integrator's decision). The whole vitest went red on the
  vocabulary audit (`src/renderer/app/__tests__/machine-vocabulary.test.ts`), because `'tmux-refused'` stood in
  `machine-status.ts` and `machines-copy.ts`, and every other class is named without a transport word (`no-program`,
  `client-failed`, `program-choice`). So every `tmux-refused` in this file reads `program-refused`; the four bundle pins'
  ids and every sentence are unchanged.
- **Four tests no builder owned**: `golden/manifest.json` gains a `noGolden` row for the class; `p235-version-deadline`
  expects `from: 'program'`; `p3201-control-scroll` uses 3.0a as the version nobody measured, since 3.2a is measured now;
  `p3201-scroll-pipeline` ignores the remote `-H` when it compares the two runners and checks each runner's own copy-mode
  line exactly (that suite was what kept `ablation:p320`'s base red).
- **`package.json`**: `node build/assert-docker-teardown.mjs` inside `build`; `gate:docker`, `measure:p342`,
  `ablation:p342`, and `probe:p342` (through `harness-socket.mjs --fresh gmux-p342`, exporting the three scratch-machine
  switches the loopback arm refuses to run without).
- **`build/assert-hermetic-checks.mjs`**: `RUNNER_CALLER_FLOOR` 51 to 52 for `measure-p342.mjs`.
  **`build/assert-electron-teardown.mjs`**: `HELPER_USER_FLOOR` 170 to 171 for `probe-p342.mjs` (D29).
- **`measure-p342.mjs`'s history guard** read `HOME`, so under a scratch HOME it printed "absent → absent" and guarded
  nothing; it reads the real home from the account record, as `probe-p342.mjs` does.
- **CHANGELOG**: the item in two sentences rather than §8's three, every clause kept. Two Unreleased items this phase
  made false got the smallest true edit, the wording his to change: the 3.6/3.6b item no longer says Ubuntu 22.04 and
  24.04 and Debian 12 and 13 "still cannot be prepared", and the scroll-back item says "tmux 3.2a or newer that Tortie
  has measured".
- **CLAUDE.md**: the `conformance:machines` row's trigger paths and its Phase 342 sentence; `gate:docker`'s row; the
  Docker bullet under machine discipline; `measure:p342` and `probe:p342` in the probes table (the latter warning never to
  run its self-test through npm); `gate:docker` in the list of gates `npm run build` runs.
- **`docs/audits/contract-baseline.txt` did not move** (D23), asserted byte for byte.
- **Its battery, all exit 0 on the final tree**: typecheck; build (gate:electron 171/171, gate:docker 11/11 bad
  fixtures and 7 controls, gate:checks 52/52, four `program-refused` pins in the bundle, the contract inventory
  byte-identical); the whole vitest (20,817 passed, 14 skipped; two earlier runs red on load-timed suites outside this
  phase that passed alone); `conformance:machines` (29 s and 45 s), `conformance:farattach`, `conformance:remoteclose`,
  `conformance:pocket`; the three self-tests; `measure:p342` over all seven rows (266 s, PASS, six of seven fixtures
  byte-identical to the committed ones, `matrix.json` differing only in pids and clocks); `ablation:p342` (1,876 s,
  40 arms red on their owners, the control unmoved); `ablation:p320` (123/123), `ablation:p324` (29/29, in an APFS
  clone), `ablation:p336` (60/60), `ablation:p326` (25/25); `probe:p336:script` (258 rows agree); gate:contract,
  gate:checks, gate:electron, gate:background, gate:knownhosts, gate:docker, gate:simulator; and `npm run package`
  unsigned (90 s, `release/` removed). Not run: `smoke:t1`, `smoke`, `smoke:t3` (forbidden by the brief),
  `probe:controldeadline` (it names `-L gmux`), `probe:p342` (verifiers only).
- **Open findings it handed on**: a create or restore meeting a required refusal answered a plain error (fixed by the
  fix round); README.md's "Only tested against Macs" is out of date (not this phase's file); four duplicated blocks
  left unextracted (the docker helper's signal net against the Simulator helper's, six blocks of `probe-p342` copied
  from `probe-p340`, the clone set-up every ablation repeats, test scaffolding).
- **Docker and history**: `measure:p342` made seven `tortie-p342-*-m88660` containers, pulled `ubuntu:26.04`,
  `debian:13`, `fedora:latest` and `archlinux:latest` and removed them all by exact name; 0 `tortie-p342` objects after.
  His history read `734900 1791405989` and `23166 1790702242` throughout.

## §As built — the fix round (rebuilt after the reboot)

The verify of 2026-10-08 answered needs_work with two majors, four minors and a nit. The fix round ran once, in this
worktree, and its report was kept; its own files (the probe's rewrite, the gate's widening, its tests, this section) were
lost with `/private/tmp` and are rebuilt below in §Rebuilt.

1. **Major 1, a create on a machine Prepare had refused.** Every refusal of a row Tortie cannot do without is recorded in
   `far-tmux.ts` (`noteFarSettingsRefused`), by one helper, `refuseRequired` in `remote-server.ts`, wherever the set-up
   stops; keyed by the server version as the pair verdict is; cleared by a set-up that holds every row
   (`noteFarSettingsHeld`) and forgotten by `forgetFarTmux`. `remoteCreate` asks it (`assertFarSettingsHeld`) immediately
   before its create line with nothing awaited between, answers sentence (1) as the structured error, sends no
   `new-session` and writes no row. **Not done as the verifier suggested: the attach does not ask it.** An attach opens a
   session already running there, which the parent allowed, so refusing it would hide his running work and be worse than
   today; sentence (1) promises only that Tortie will not START sessions there. A restore re-runs the set-up and is
   refused that way. **Stated gap**: a create that lands in the few commands between the PATH capture and the refusal is
   not refused.
2. **Major 2, the probe could not do its job.** The parent uses HEAD's add flow; L1 reads the found row's text; K3 sets
   up its own running 3.5a server, session and live connection or reads UNREADABLE; L5 and L12 wait until the attach has
   reached the far session before typing; every grader clause requires the readings it compares, and L2 checks all
   twelve options; the verifier's five broken records that passed are hostile cases. **L6's cause**, found by reading the
   code: a reboot empties `/tmp`, the far socket file is gone, and Tortie (Phase 67's rule, the parent's too) reads that
   as proving nothing, so the sessions read `unknown` until something starts a server; L6 presses Prepare after the
   restart and records a trail of every status. **L10's cause**: Catch Me Up answers every session on another machine with
   the `remote` line by design (`overview/service.ts`), and a Claude session Tortie created is never harvested; L10 reads
   that line and a Codex stand-in's conversation copied back to this Mac, once after every row, within eleven minutes.
   `measure:p342`'s matrix grader rejects a version that refuses anything other than what §5.1 measured.
3. **Minor, sentence (2) drawn nowhere.** Prepare's answer carries it as an optional `note` (on `MachinePrepareResult`,
   `RowSignIn` and `MachineRowView.signIn`), drawn after the Ready chip's hover text and as one line under "<name> is
   ready." in Add a machine. No channel and no column, so the contract inventory does not move.
4. **Minor, a required setting not set, or not said.** A required row the server took but READ BACK as another single
   line value is refused with sentence (1); an empty, failed or multi-line read stops nothing. A refusal of `exit-empty`
   on the boot line is that row's refusal, asked after the route is re-asked. Prepare no longer puts a gmux error's JSON
   payload (the ssh command line) in the hover.
5. **Minor, plain errors.** The create and the restore answer a refusal through
   `ensureRemoteServer(ctx).catch(throwAsSessionError)`, the structured error whose message is the sentence.
6. **Nit, partly taken.** A server that is not the version its program claims is drawn as the version it RUNS. Not
   taken: a disagreement verdict still lasts one Prepare (the next, on the warm server, reads the server's own version and
   answers Ready), and a create on a machine refused that way still says Tortie has not signed in to it.
7. **Disclosed by the fixer**: a read-only anchor script of its imported `build/p3201/ablation.mjs`, which has NO import
   guard and so started a whole `ablation:p320` run; it was ended by pid and its clone removed. That file still has no
   guard (§Rebuilt: never import it; read its arms as text). **Found on the way, not this phase's**: after a far machine
   reboots its sessions read `unknown` until a Prepare or a relaunch (Linux and macOS, the parent too); Catch Me Up cannot
   read a conversation on another machine.
8. **Its battery** (all exit 0 but two blocked): typecheck and build first and last; vitest over the touched folders
   (324 files, 7,086 tests); the whole `npm test` (20,845 tests, 1,118 files, after one run red on two FSEvents timing
   suites outside this phase that passed alone); `conformance:machines`; `conformance:farattach`; `ablation:p342` whole
   (50 arms and the control, 1,567 s); `ablation:p320` 123/123, `ablation:p324` 29/29, `ablation:p326` 25/25,
   `ablation:p336` 60/60, `probe:p336:script`; the self-tests; the contract inventory identical. **Blocked on disk**:
   `measure:p342` and `npm run package` (1.68 to 3.31 GiB free, under the 8 GB floor). `probe:p342` was not run: its new
   arms are untested.

---

## §Rebuilt after the reboot

**What happened.** The Mac rebooted at about 11:00 on 2026-10-08 and `/private/tmp` was wiped with every uncommitted
file. The worktree was rebuilt from origin/main `35a9a390` by replaying, in time order, every Write and Edit call the
phase's agents made. That brought back about 95 percent of the edits and NOTHING a shell command wrote: six Edits found
no old text (`REPLAY-GAPS.md`), files written wholly by a command were missing, and edits made by `sed`, `perl` or a
script were absent without a trace. Two repairers then rebuilt it, the first (on another model, 11:25 to 12:02) and
this one (12:04 onwards); nothing was committed, staged or stashed.

**The six replay gaps**: all six applied (the first repairer applied them; each was re-read here): `prepare.ts`'s
catch (a disagreeing server drawn as the version it runs, the payload read rather than its JSON), `p342-far-names`'
measured-list comparison, `p3201-scroll-shapes`' hostile `-H` corpus, and the `copy-mode -e -H -t $7` expectations in
`p3201-scroll-order` and `p3201-remote-scroll`.

**What the replay could not see, and what was done.** Missing or stale, then rebuilt from this spec and the kept
reports:

| What was lost | How it was found | What was done |
| --- | --- | --- |
| `build/p342/fixtures/{head-honest,parent-honest,hostile}.json` (written whole by a command) | the folder was absent | rewritten to the fix round's grader: an honest HEAD record over seven rows and the once arms, an honest parent, 53 hostile cases each failing exactly the clauses it names, the verifier's five broken records among them as absent readings |
| `build/fixtures/p342/**` (written by `measure:p342 --write`) | absent from the replay | regenerated by `measure:p342 --write` over seven throwaway containers (below) |
| the integrator's class rename (88 replacements in 20 files), `package.json`, the two floors, CHANGELOG and CLAUDE.md | `tmux-refused` still in the tree; the typecheck after the replay | redone by the first repairer; the fix round's CLAUDE.md rows (146 widened, `gate:docker`'s driven rules, the probe's arms) rewritten here |
| the proof builder's conditions 142 to 149 (+819 lines) and their readings (+482) | not in the edit log | reconstructed by the first repairer (745 and 441 lines); six defects in that reconstruction fixed here (147 counted the helper's own declaration as a call; 148 required the undo to keep a value 3.3a stores with a backslash, compared 3.2a's capture byte for byte rather than as drawn, and read two regular expression literals out of comment-blanked code where they are blank; 149 compared `/bin/sh` and `/bin/dash` on a listing's clock and path) and the fix round's widening of 146 added: a refusal recorded and then CLEARED by a set-up that holds every row (driven), the create asking it beside the pair before its create line with nothing awaited and nothing else asking it, `throwAsSessionError` at the create and the restore and DRIVEN, Prepare's disagreeing version, its payload rather than JSON in the hover, and its `note`, which the Ready hover and Add a machine read |
| the four bundle pins | `assert-bundle-refusals.mjs` unmodified | `MACHINE_TMUX_REFUSALS`, four rows (`machine.tmux-too-old`, `machine.tmux-setting-refused`, `machine.tmux-updated-under-sessions`, `machine.tmux-version-disagrees`), its own count pinned at 4, a table of its own so `MACHINE_REFUSALS`' baseline count does not move |
| the anchors re-pointed in `build/p324/ablation.mjs` and `build/p336/ablation.mjs` | every arm's anchor checked against the tree as TEXT (never importing `p3201/ablation.mjs`, which has no import guard) | p324 arm 24 and p336 `a120g` re-pointed: both had been stale since Phase 340 moved the lines they name |
| the proof builder's later hardening of `build/docker-run.mjs` and `gate:docker`'s drive | `gate:docker` read 35 helper ablations where the builder reported 66 | the CLI's config folder made with `mkdtemp` and removed by that path alone; the scratch rule reads HOME AND the account record's home and refuses a shared temporary root itself; `runArgvRefusal` takes the run's own prefix and refuses a second publish and every spelling of a mount, a device and a host namespace; the CLI's PATH narrowed to the docker program's folder and the system's. `gate:docker` lifts `scratchWorld`, `refuseScratchReason` and `runArgvRefusal` out of the helper's text and DRIVES them; 48 helper ablations, every one red |
| the proof builder's, the integrator's and the fixer's later fixes to `measure-p342.mjs` and `drive-p342.mts` | the first repairer's two `--write` runs failed (63 problems), and wrote their fixtures anyway | the history guard reads the account record's home; the indicator's session id quoted so the outer pane's shell does not read `$0` as its own name, with Tortie's `copy-mode-position-format ''` set as Prepare sets it; the pair's second live client given an input held open and its attach bounded; the far texts compared by the KIND of their answer (a closed word, or data), this Mac's answers read whole rather than from `farRunner`'s first 400 characters, and the hard-link rename's measured difference stated; the joined captures compared as drawn; the decoy read from the list; the fixer's matrix rule (a version refusing anything §5.1 did not measure) with two corruptions in the self-test; the config folder left to the helper |
| the prepare builder's re-exports in `src/main/tmux/index.ts` and `src/main/machines/index.ts` | both unmodified | `decideRemotePair`, `isOptionRefusal` and their types; `RemoteTmuxRefused`, `throwAsSessionError` and the leaf's exports |
| the builders' and the fixer's tests (the whole vitest read 20,777 where the fix round read 20,845) | each file the reports name, read against the tree | `p342-remote-server-refusals.test.ts` (new, the first repairer's, standing in for `remote-server.test.ts`'s lost arms) and two route arms added here; `p342-prepare.test.ts` (new: the pair, sentence (1), sentence (4) and its version, the note, no JSON in the hover); the pair consult in `control-plane.test.ts`; the four sentences in `errors.test.ts`; the settings refusal in `p342-far-tmux.test.ts`; the create's refusal and structured error in `p270-b-remote-create-env.test.ts`; the restore's in `p342-far-names.test.ts`; the note in `p340-add-steps.test.tsx`; `program-refused` retried and not marked quiet in `sign-in-retry.test.ts`; the first repairer's `p340-row-facts` and `p340-machine-status` cases, the latter's type fixed |
| the fix round's arms in `ablation:p342` (twelve, and b144e and b144g re-pointed) | 40 arms where it reported 50 and a control | fourteen arms on 146's widened clauses and the two renderer cases, b144e, b144g and b149d re-pointed (b149d's anchor never matched the escaped source); 53 arms and a control |
| the fix round's rewrite of `probe-p342.mjs` (major 2) and its CHECKLIST | the probe still pressed `test-draft` at the parent | rewritten as its report describes (§As built — the fix round, item 2); `gate:electron` then read the self-test's `ps` fixture variable as an Electron starter, renamed `recordedPs`. **These arms have not run in an app**: verifiers only |
| this spec's §Attack and both §As built sections | absent | rebuilt above from the kept reports; the D-table above is partly pre-attack and the §Attack list is the authority |

**`measure:p342` after the repair**: `--write` over all seven rows, PASS, 181 s, on 2026-10-08 12:40 to 12:44; seven
`tortie-p342-*-m95316` containers made and removed by exact name, `ubuntu:26.04`, `debian:13`, `fedora:latest` and
`archlinux:latest` pulled and removed, Docker's lists the same as before. The fixtures it wrote read as §14 measured:
the indicator `2948 … [30/2977]` with `copy-mode -e` and `2948` with `-H` on 3.2a to 3.5a (3.4 and 3.5a with the clock),
`2948` both ways on 3.6 and 3.7c; Debian 12's 3.5a program greeting its 3.3a server (85 bytes) and Debian 13's 3.6b
program not greeting its 3.5a server (6 bytes, `%exit`); the decoy never attached. The two failing runs before it (the
first repairer's at 11:44 and 11:59, and one here at 12:37) are why the harness was repaired: their fixtures were
replaced by this run's.

**The battery after the repair** (scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, no `TERM_SESSION_ID`):

| Command | Exit | Result |
| --- | --- | --- |
| `npm run typecheck` | 0 | 5 s |
| `npm run build` | 0 | 38 s; gate:electron 171 against 171; gate:docker 11 of 11 bad fixtures, 7 controls, 48 of 48 helper ablations; gate:checks 52 against 52; 4 `program-refused` sentences in the bundle; the contract inventory byte-identical |
| the whole vitest | 0 | 1,120 files and 20,810 tests passed, 14 skipped, 63 s (20,777 at the start of the repair) |
| `conformance:machines` | 0 | 26 s, 142 to 149 green |
| `conformance:remoteclose`, `conformance:farattach`, `conformance:pocket` | 0 | 11 tests; 11 rules; 127 rules |
| `probe-p342 --grader-self-test`, `measure-p342 --self-test`, `ablation --self-test` (with node) | 0 | 53 hostile cases; 6 fixtures and 12 corruptions; 12 fixtures |
| `ablation:p342`, the new and re-pointed arms (`P342_ONLY`, 18 arms) | 0 | 533.7 s, every arm red on its owner, the control unmoved |
| `ablation:p326`; `probe:p336:script` | 0 | 25 of 25; 258 rows agree between `/bin/sh` and `/bin/dash` |
| every arm's anchor in `ablation:p324`, `p320`, `p336`, `p343` and `p342`, checked as text | — | none missing after the two re-points |
| `gate:contract`, `gate:checks`, `gate:electron`, `gate:background`, `gate:knownhosts`, `gate:docker` | 0 | |
| `CSC_IDENTITY_AUTO_DISCOVERY=false npm run package` | 0 | 91 s, unsigned; `release/` (815 MB) removed |
| the delta scanned for control, bidi, zero-width and BOM characters | — | none |

**Not run, and why**: `conformance:resume:capture` (it launches Electron and real agent programs, which this repair's
brief forbids; this phase touches none of its trigger paths); `probe:p342`, N1 and N2 (verifiers only, under the lock;
its rebuilt arms have not run); `smoke:t1`, `smoke`, `smoke:t3` (Electron); `probe:controldeadline` (it names
`-L gmux`); the whole `ablation:p342`, `ablation:p320`, `ablation:p324` and `ablation:p336` (their anchors were checked
as text instead). His history read `735817 1791475723` and `23166 1790702242` before and after every command of this
repair from 12:08 on; it moved once before that (735746 to 735817 at 12:08:43, during a gate run that starts no
interactive shell and runs every shell with a scratch HOME and `HISTFILE=/dev/null`; the same gate run again moved
nothing, so it was his own terminal).

**Stated, not fixed here**: `p342-prepare.test.ts` copies its harness from `p3401-late-prepare.test.ts` (the test
scaffolding the integrator already listed); `build/p3201/ablation.mjs` still has no import guard; the fix round's
stated gap (a create between the PATH capture and the refusal) and its untaken nit stand.

### The second verify and its fix round (2026-10-08, evening)

The second verify answered needs_work: one major (the probe still could not do its job: run whole it read 17 failures at
HEAD, none of them the product), three minors and three nits. The fix ran once, in this worktree, from 18:38. **No
earlier fixer's partial work was in the tree**: no file under the worktree was newer than 12:51 when it began, so the
fixer reported stopped at about 14:40 left nothing to check. Nothing was committed, staged or stashed.

**The product, three minors and one nit:**

1. **A create after the boot line refused `exit-empty` said "has not signed in".** That refusal stops the set-up before
   the PATH capture, so `readyRemoteContext` refused the create as not signed in and sent the person back to a Prepare
   that repeats the refusal. A create and a restore now reach their context through `readyContextToStart`
   (`remote-sessions.ts`), which is `readyRemoteContext` except that, ONLY when the context was refused, it asks the
   recorded refusal first (sentence (1)) and, since the nit below, a recorded disagreement (sentence (4)'s line). A
   ready machine reaches the create's own synchronous ask before its create line exactly as before, and a machine that
   is simply not signed in still reads the sentence it always did. **Not done**: a Restore item for such a machine's
   sessions. They read `unknown` because no server can start there, Restore is offered only for `restorable`, and the
   session gates are shared with the phone (`conformance:manager`); the parent offered none either. A restore reached
   another way answers sentence (1).
2. **A required row refused in words tmux never uses read Ready and let a create start.** D6 still reads no words. A row
   Tortie cannot do without whose write failed with the exec plane's catch-all (`UNKNOWN`, words on stderr, no taxonomy
   class) is now read back ONCE (`refuseIfNotHeld`, `remote-server.ts`): a server that answers one line holding another
   value is that row's refusal, sentence (1), recorded for the create and thrown, as a row taken and read back as
   another value already was. A classed failure (a dropped link, a server that is gone, every sign-in failure) is never
   read back, the route is asked before the read, and an optional row is never read back. **Stated residual**: a read
   that answers the wanted value, nothing, or several lines is thrown as it came with nothing recorded, as at the
   parent, because nothing is then known about the option.
3. **The program read that reached nothing had no owner.** Two `p342-prepare` cases now hold it (no verdict recorded,
   nothing blocked, and a verdict an earlier Prepare recorded against the same server standing), and `ablation:p342`
   arm b144x is the verifier's M5 again, now red.
4. **The nit: a lying program said as updated.** A born server's disagreement is remembered in the leaf, keyed by the
   version it RAN as (`noteFarDisagreement`, cleared by a born server that agrees and by `forgetFarTmux`), so the next
   Prepare of that warm server, reading the same program beside it, answers sentence (4) with the version it runs, and
   the pair refusal an attach, a create, a restore and the live connection give is sentence (4)'s line
   (`farPairRefusal`). Another program beside that server is still said as an update. Sentence (4)'s headline moved
   into `far-tmux.ts` for that, re-exported by `errors.ts` as sentence (3)'s is, and its bundle pin's source moved with
   it; the four pins and their count are unchanged.

**The probe, the major.** `probe-p342.mjs` and its fixtures:

| The verifier's item | What was done |
| --- | --- |
| (a) L10 could never pass | `overview.sessions` REJECTS a project on another machine at both builds (it runs this Mac's git there), so the line reads `remote` or `refused` and must equal the parent's on a row the parent read; the far `~/.codex`, `~/.claude` and plant log are emptied before each build, because HEAD's Codex copy was the parent's conversation in the same folder |
| (b) L6 read 3.4's escaped display | the restored pane's folder is read from `/proc/<pane_pid>/cwd` AS THE PANE'S OWN ACCOUNT: read as root it answered nothing on every row (a container's root holds no `CAP_SYS_PTRACE`), which this round's first run measured |
| (c) the parent's K3d12 left Debian 12 on 3.5a | K3 and K3d12 run at HEAD alone (`notDriven` at the parent, which cannot set either up); the broken downgrade is gone; every row's `tmux -V` is read again before HEAD and a moved one stops the run |
| (d) K3's relaunch read Ready false | it waits for the far ssh server's greeting (a plain TCP read that signs in to nothing), records Prepare's answer (`afterRestartPrepare`, now graded), presses again only on a could-not-reach class, and waits for the row, the link and K3's OWN session; K3 is graded once all of it is read |
| (e) N1 could not sign in, then crashed | the yard's sshd is started, the ssh_config names the yard's key (`<root>/<prefix>-userkey`), the far HOME must be the yard's (exit 2 otherwise), `local` is declared before the `try`, the far reads use BSD's spellings on this Mac, each build meets no far server and a fresh fixture, the yard is ended in a `finally`, and N1 reads the twelve options back where it graded a constant it wrote itself |
| the nit: L3 accepted `cost $HOMEWORK` | exact on both kinds of row: `cost $HOME _` where the ssh session has no UTF-8 `LANG` |
| found on the way | a parent arm on a row the parent cannot make Ready was UNREADABLE (54 of them), so a run whose every HEAD arm passed could only exit 2: such arms are `notDriven`; such a row waits 20 s, not 180; a refused save, folder or stage is recorded as `refused: <sentence>`, not UNREADABLE; between the builds every container is RESTARTED rather than sent `kill-server`, because in this round's second run a far 3.6 server sent `kill-server` was still exiting when HEAD reached it, and an exiting tmux closes every new client at once ("server exited unexpectedly"), so HEAD's every arm on that row read the parent's leftovers |

The grader: 56 hostile cases (three new: the verifier's `cost $HOMEWORK`, a Prepare after the restart that could not
reach, and a Catch Me Up line that differs from the parent's), the N1 cases re-pointed at the options.

**The probe's runs** (all under the lock, P342_KEEP=1, his history `735939 1791483475` and `23166 1790702242` before and
after each, Docker's lists the same as before after each, by the helper's own comparison and by mine against the main
session's lists of 11:50):

| Run | Exit | Result |
| --- | --- | --- |
| 1, parent then HEAD, seven rows | 1 | 632 s; every HEAD arm passed but L6's folder (14 failures, `null`: the root `/proc` read) |
| 2, the same | 1 | 809 s; the u2604 row at HEAD read "server exited unexpectedly" (the exiting server above); every other arm passed, L6 now right on every row |
| 3, the same | **0** | 651 s; 0 failures, 0 arms not read; K3 after the restart: Prepare `prepared`, Ready, connected, its own session restored |
| N1 1 and 2, parent then HEAD, the loopback machine on Homebrew 3.6a | **0** | 49 s and 51 s; PASS; the parent and HEAD read the twelve options alike (`history-limit` 25000), save 644, New Folder 755, row 0 `2948` at both; the far names `$HOME notes` and `cost $HOME` at the parent, `_HOME notes` and `cost _HOME` at HEAD |
| 4, parent then HEAD, seven rows, on the final build | **0** | 716 s; 0 failures, 0 arms not read; Docker as found (7 containers and 4 pulled images removed by the helper) |

Run 4's HEAD readings, against the second verifier's 17 failures: L6 restores both sessions on every row into
`/home/tortie/proj` and `/home/tortie/cost $d` by the pane's own `/proc`, 3.4 included; L10 reads `refused` on every
row, equal to the parent's on u2604, fed and arch, and every Codex copy matches its far file by sha256; Debian 12 reads
3.3a in L1 and its keys match `keys.json` for 3.3a; K3 reads Prepare `prepared`, Ready, connected and its own session
restored after the restart. The parent: Ready only on 3.6 and 3.7c (the acceptance sheet on the four older rows), and
its saves, New Folders and stages on those three rows refused, as §1 item 2 measured.

**The battery after the fix** (scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, no `TERM_SESSION_ID`):

| Command | Exit | Result |
| --- | --- | --- |
| `npm run typecheck` | 0 | |
| `npm run build` | 0 | 38 s; gate:electron 171 against 171; gate:docker 48 of 48 helper ablations; gate:checks 52 against 52; 4 `program-refused` sentences in the bundle; the contract inventory byte-identical |
| the whole vitest | 0 | 1,120 files and 20,828 tests passed, 14 skipped, 73 s (the run before it was red on one case, `p3401-late-prepare`'s pin of the restore's context line, re-pointed at `readyContextToStart`) |
| `conformance:machines` | 0 | 27 s; 142 to 149 green, with 146's second-fix-round clauses and 145's disagreement |
| `CSC_IDENTITY_AUTO_DISCOVERY=false npm run package` | 0 | 81 s, unsigned; `release/` (836 MB) removed |
| `conformance:remoteclose`, `conformance:farattach`, `conformance:pocket` | 0 | 11 tests; 11 rules; 127 rules |
| the three self-tests, with node | 0 | 56 hostile cases; 6 fixtures and 12 corruptions; 12 fixtures |
| `ablation:p342`, the new arms (`P342_ONLY`) | 0 | b146p to b146u, b145x, b145y and b144x each red on its owner, the control unmoved (211 s, 111 s, 126 s); 63 arms, every anchor present as text; `main` is a third check, the three main-process suites |
| every anchor of `ablation:p326`, `p340` and `p3201` on a file this round touched, as text | — | none missing |
| `gate:contract`, `gate:checks`, `gate:electron`, `gate:background`, `gate:knownhosts`, `gate:docker` | 0 | |

**Not run, and why**: `conformance:resume:capture`. It launches Electron through `build/harness-socket.mjs` rather than
`build/electron-run.mjs`, and starts real agent programs to their first screen, which read his credentials; this
round's rules forbid both, and the delta touches none of its trigger paths (`agents/registry.ts`, `manifest/harvest/**`,
`manifest/agents.ts`, `sessions/codex-repair.ts`, `sessions/inline-repair.ts`, `sessions/resume-argv.ts`, `restore/**`,
`conformance/**`: checked, none). `smoke:t1`, `smoke`, `smoke:t3` (Electron outside the helper); `probe:controldeadline`
(it names `-L gmux`); N2 (his Mac Pro, his go-ahead); `measure:p342` (unchanged by this round); the whole
`ablation:p342`, `p320`, `p324` and `p336` (their anchors were checked as text).

**Left as found**: two empty folders, `/private/tmp/p342-tmux-39443-loop` and `/private/tmp/p342-tmux-72131-loop`, from
the second verifier's N1 runs (14:54 and 17:26), which crashed before their cleanup; nothing runs in them.
