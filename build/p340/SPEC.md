# Phase 340: add a machine in three steps, find tmux by itself, and a machine row with just enough words (SPEC)

Subject: `feat(machines): add a machine by picking it, and Tortie checks and prepares it`
First body line: `Phase 340: add a machine in three steps`
Semver: Minor, unreleased. Tier 3. Written 2026-10-05 in `/private/tmp/wt-p340` at origin/main `ae38b831`. Nothing
committed, staged or stashed. `git diff ae38b831` must be exactly this phase's delta.

Charter, in his words (`docs/BACKLOG.md` "## Phase 340", `:39953-40016`, and the running-log line of 2026-10-05). Re-adding
his Mac Pro after Remove: the test said tmux was missing until he typed `/usr/local/bin/tmux` under Advanced, then he had to
press Prepare. "can we look at the code and catalog (simply) the steps to add a machine... its not super user friendly. Also
when we connect to the machine we should make it automatically look for [tmux] on that machine"; "end to end i want to
redesign the add a machine steps because it is not very easy to understand what to do and it should be much simpler"; of the
expanded row, "there are also way too many words on this screen". And, folded in on his word ("make it all one phase
please"): the connection test and the key install answer "This Mac has no ssh program at /usr/bin/ssh" whenever node-pty
fails to LAUNCH ssh, even when `/usr/bin/ssh` is there; he saw it while re-adding the Mac Pro.

Binding sources: this file; the backlog entry whole, including "The design he was shown" and "What the spec must keep";
CLAUDE.md refusal 8 (the confirm agreement bound to the hash of the fields that decide what runs; nothing starts on another
machine from a configuration change alone), the UI rules (native menus through `ui:popupMenu`, never DOM menus; tokens; no
tmux vocabulary; just enough words), and his memories "remote feels identical to local" and "no regression against today".
Research 51 §4.2 (the machine object, the one interactive moment, refusal 8 as amended by Phase 68), research 55 §2 and 85
§6-7 (what a machine is to him and why reconnecting is a person's act or a standing confirmation's), and the backlog rulings
of Phases 68 (the add, the hash bound at the end of the test), 69 (Prepare its own button; the login-shell PATH capture), 71
(the link state), 73.1 (markers stripped from the transcript), 79 and 79.1 (the panel; the key install with its own hash),
83 (an unmeasured version accepted through the machine's own agreement), 84 (Tortie's key named on every command; `ready`),
130 and 131 (what stood on the face of the row and why), 324 (measured beats accepted) and 336 (no machines.json key added).

**ONE QUESTION FOR HIM, AND IT DOES NOT BLOCK THE BUILD (§16).**

**REVISED BY THE ADVERSARY, 2026-10-06, in place.** Every decision the attack changed says so on its own line ("Revised
by §Attack"), and §Attack at the end lists each finding, the measurement behind it and the change. New decisions are D27
and D28. The gate's new conditions are renumbered 125 onwards because Phase 337's worktree already holds 122 to 124 in
`build/conformance-machines.mjs`.

## 0. What changes for a person, in one table

| Today (the parent, `ae38b831`) | After this phase |
| --- | --- |
| Add a machine opens a form of 114 words with nothing run; he presses Find machines on your tailnet, picks a row, presses Test the connection, reads a transcript, answers ssh's question by typing `yes` and pressing Send | Add a machine looks at the tailnet at once; he picks a row and Tortie checks the machine by itself; a first-seen machine asks one inline question with its fingerprint and a Trust it button |
| The test asks `command -v tmux` in a NON-login shell whose PATH is `/usr/bin:/bin:/usr/sbin:/sbin` (measured, M1), so tmux in `/usr/local/bin` or `/opt/homebrew/bin` is "missing" and he types its path under Advanced and tests again | Tortie looks through that machine's login shell, then the PATH a command gets there, then a fixed list of install folders, and asks him to choose when it finds more than one; Advanced stays for an odd place |
| After Add this machine and confirm it, the row is shut; he presses Show what it runs, then Prepare this machine; an untested version is a third sheet after Prepare | One press, Add `<name>`, confirms the same hashed lines and prepares; an untested version is one line on that button, and the agreement carries it; then `<name> is ready` and Open a folder on it… |
| After Put Tortie's key on it, the test runs again offering only his own keys, so on a machine that trusts none of them it asks for the password again (read, §Attack R2) | The check also offers the key Tortie made for that machine, so the check after the key install signs in with it (D27) |
| The row opens to 163 words before Prepare and 200 after (`scratchpad/p340/spec/words-today.mts`), with three buttons, five paragraphs and a disclosure | The row is a name, a status chip, a line of facts and one button for the next thing; Test the connection, What Tortie runs there…, Stop trusting this machine, Remove… and Prepare this machine are in a native ⋯ menu; the paragraphs are one menu pick or one hover away |
| A launch failure of ssh reads "This Mac has no ssh program at /usr/bin/ssh" | A missing or non-executable ssh keeps that sentence; a launch that failed says Tortie could not start ssh, and why when macOS says (it does not, for node-pty's own failure: §Attack R10); both are logged |

## 1. The design in one paragraph

The connection test keeps its one pty, its one `BatchMode=no` site and its argv, and changes only the far command: a single
line of POSIX `sh`, composed by `shellQuoteArgv` as `/bin/sh -c <script> tortie-check <typed path> <login probe> <install
folders>`, that prints a block between two `__TORTIE_CHECK__` markers naming the account, the system, every distinct
program it found (through that machine's login shell, then the PATH a command gets there, then a compiled list of install
folders, distinct by device and inode), their count and, only when exactly one was found AND it was typed or found by the
login shell's PATH or the command's own PATH (what his own shell runs by that name), that program's `-V`. A program found
only in an install folder is not run before Add (Revised by §Attack, T6). The test also names Tortie's own key for that
id when one exists (D27), so a check after "Put Tortie's key on it" signs in with it.
Main accepts EXACTLY one block (two blocks, a count that disagrees or a path that fails the schema's rule is `unknown`,
Revised by §Attack, T1), decides `ok`, `program-choice` or `no-program`, and composes the confirm sheet with the found
path and, for a version it read and has not measured, the accepted version (the fifth hashed field), so the Add press binds
the same hash `machines:add` recomputes today, then prepares. The renderer starts the check from his pick (or the Check button
for a typed address), asks inline only for a first-seen fingerprint, a password for the key install, a choice between two
programs, or a prompt it does not recognise, and keeps the transcript behind Details. The machine row derives a chip and
one next step from facts main already holds plus two it now remembers per run (the last sign-in's class and version, and
the system name), and moves everything else into a native ⋯ menu. One new channel, `machines:openFolder`, hands Open a
folder on it… to the main window. No machines.json key is added and no confirm hash moves.

## 2. Measured for this spec (loopback machine only; no Electron, no real host)

Scripts and outputs in `scratchpad/p340/spec/` (`/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p340/spec/`), not in the tree.
The far side was ONLY `build/scratch-machine.mjs` (`scratchYard` + `scratchMachine`) with `SCRATCH_MACHINE_QUIET_SHELL=1`
and `SCRATCH_MACHINE_SCRATCH_HOME=1`. Every node process ran under `env -i` with a scratch `HOME`, a scratch `ZDOTDIR`,
`HISTFILE=/dev/null`, no `TERM_SESSION_ID` and no `SSH_AUTH_SOCK`; every ssh went through `build/ssh-run.mjs` with
`-F none`, `IdentitiesOnly=yes` and the yard's own key, so his `~/.ssh` was never opened; every pid was recorded and ended
in a `finally` (two runs: `15771,15768` and `47792,47789`, both gone, `ps` empty, no `/tmp/p340*` left). His history,
`stat -f '%z %m'`, before and after every run: `~/.zsh_history 733353 1791256765`, `~/.bash_history 23166 1790702242`,
unchanged throughout. No `-L gmux`, no lock taken (no Electron, no Simulator).

**M1, the shell a command gets, and its PATH** (`measure-tmux.mjs`, exit 0):

| Read | Answer |
| --- | --- |
| `echo $0 SHELL HOME ZDOTDIR` | `zsh`, `/bin/zsh`, the yard's home, the yard's zdot |
| `printenv PATH` (what `command -v` searches today) | `/usr/bin:/bin:/usr/sbin:/sbin` |
| `"$SHELL" -lc "printenv PATH"` | `/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:…:/Applications/quarto/bin` (path_helper from `/etc/paths`; no `/opt/homebrew/bin`, because Homebrew's line lives in a person's own `.zprofile`, which the quiet shell does not read) |
| `"$SHELL" -c "[[ -o login ]]"` | `not-login`. The comments at `connection-test.ts:248-249` and `key-install.ts:230-231` ("ssh hands it to the other machine's login shell") are wrong, as the entry said |

**M2, today's probe byte for byte** (`printf '__TORTIE_PATH__%s__TORTIE_PATH__\n' "$(command -v tmux || true)"`,
`connection-test.ts:212-215`): `__TORTIE_PATH____TORTIE_PATH__`, an empty answer, so `no-program`, while
`/opt/homebrew/bin/tmux` (3.6a) is on this Mac. 45 ms.

**M3, the two folders, by witness** (no tmux was placed in `/usr/local/bin`: that folder is on his own PATH and writing there
installs a program for every shell of his; `json-diff` lives only in `/usr/local/bin`, tmux only in `/opt/homebrew/bin`):

| | non-login (today) | login |
| --- | --- | --- |
| `json-diff` (only in `/usr/local/bin`) | not found | `/usr/local/bin/json-diff` |
| `tmux` (only in `/opt/homebrew/bin`) | not found | not found |

So today's probe misses BOTH folders; a login shell finds `/usr/local/bin` (his Mac Pro's case) and not `/opt/homebrew/bin`
unless his own `.zprofile` adds it; the install-folder list is what finds `/opt/homebrew/bin` regardless. Both routes are needed.

**M4 to M9, the draft check (`check-script.mjs`) over the loopback machine** (`measure-tmux.mjs` and `measure2.mjs`, exit 0;
the draft is 1,195 bytes, no newline, no `!`, no single quote, no backslash pair):

| Arm | Planted | Candidates the block names | `-V` run | ms |
| --- | --- | --- | --- | --- |
| M4 plain | nothing | `install /opt/homebrew/bin/tmux` | once, `tmux 3.6a` | 82, 87 |
| M5 planted earlier | a stand-in first on the LOGIN PATH (yard `.zprofile`) | `login <yard>/loginbin/tmux`, `install /opt/homebrew/bin/tmux` | NONE | 82 |
| M6 noise | `.zprofile` prints a fake path marker and a fake block marker; `.zshenv` prints a line | the real one only; the `.zprofile` noise never reached the output (captured in a variable); the `.zshenv` line preceded the block | once | 82 |
| M6' fake block | `.zshenv` prints a WHOLE fake block naming `/evil/tmux` before the script runs | reading the LAST block: the real one | once | 66 |
| M7 typed | `/opt/homebrew/bin/tmux` / `/usr/local/bin/tmux` (absent) / a stand-in saying `tmux 3.9z` | `typed …` / `typed=missing` / `typed <odd>`, version `tmux 3.9z` | once / none / once | 72 / 58 / 67 |
| M8 two on the login PATH | two stand-ins | both, plus the install one | NONE | 96 |
| M9 a link to the real tmux on the login PATH | one link | ONE (`login <yard>/loginbin/tmux`): device and inode match | once | 87 |
| M10 install list only, empty folder | a fake list | none | none | 57 |
| M11 install list, two stand-ins that log every run | a fake list | both | NONE; the log stayed EMPTY | 75 |
| M12 install list, one stand-in that logs | a fake list | one | the log holds exactly one `-V` line | 65 |
| M13 `~/.local/bin` in the list | stand-in under the far `$HOME` | expanded against the far home | once, `tmux 3.7c` | 67 |

Today's probe under M6' (`.zshenv` printing `__TORTIE_PATH__/evil/tmux__TORTIE_PATH__`) would answer `ok` with `/evil/tmux`,
because `parseResolvedPath` (`connection-test.ts:276-282`) takes the FIRST pair. That is an existing class; the check closes
it (D15).

**M14, the far login shell's kind** (`shells.mjs`, the composed one-line command run by each shell as the far one would, exit
0, history unchanged): `/bin/sh`, `bash`, `zsh`, `dash` and `ksh` read the login PATH (`login=read`); `csh` and `tcsh` refuse
`-lc` and answer `login=none`, and all seven still find `install /opt/homebrew/bin/tmux` and read 3.6a, in 41 to 46 ms. A
multi-line script would not survive csh's quoting, which is why the check is one line (key install's script is multi-line
today; not this phase's).

**M15, ssh's repeated options** (`/usr/bin/ssh -G -F none`, OpenSSH_9.9p2): `-p 1111 -p 2222` resolves to port 1111, and
`-o IdentitiesOnly=yes -o IdentitiesOnly=no` to yes. The FIRST value wins, which is what lets the probe's ssh wrapper (§10)
put the loopback port in front of the product's own argv.

**M16, words drawn at rest today** (`words-today.mts`, the drawn copy summed from `machines-copy.ts` and the two main
sentences, following each component's own branches):

| Surface | Words |
| --- | --- |
| Add a machine, at rest (nothing pressed after Add a machine) | 114 (18 blocks) |
| …after the Tailscale look, before the peer rows | 127 |
| …Advanced opened | +46 |
| The row, shut, confirmed | 25 |
| The row, open, confirmed, no key, not prepared | 163 |
| The row, open, confirmed, no key, prepared | 200 |
| Biggest single blocks on the open row | `KEY_NOT_MADE_YET` 43, `PREPARE_EXPLAIN` 28, `MACHINE_CONFIRM_WARNING` 24, `MACHINE_PATH_HONESTY` 18 |

**M17, today's presses from Add a machine to a prepared machine** (counted from the code, for the probe to measure): with his
tmux missed by the probe, the tailnet path is 10 presses (Add a machine, Find machines on your tailnet, the peer, Test the
connection, Send after typing `yes`, Advanced, Test the connection, Add this machine and confirm it, Show what it runs,
Prepare this machine) and two typed fields (`yes`, the path). The new path is 4 presses (Add a machine, the peer, Trust it,
Add `<name>`) and no typed field.

**M18, the reads this spec rests on** (grep over this tree):

| Claim | Result |
| --- | --- |
| Where `client-missing` is produced | `connection-test.ts:734` (no ssh), `:754` (spawn threw), `:974` (no ssh), `:994` (spawn threw); `errors.ts:239-246` the copy; `prepare.ts:159` lists it among the unreached classes |
| node-pty's spawn failure on macOS | `node_modules/node-pty/src/unix/pty.cc:373`: every failure of `pty_posix_spawn` (no pty to open, the spawn helper not executable, a failed `posix_spawn`) throws the one string `posix_spawnp failed.` with no errno |
| The login-shell PATH recipe already in the tree | `remotePathCommand()` at `remote-path.ts:70` (`"$SHELL" -lc 'printf …"$PATH"'`), used by Prepare since Phase 69 |
| A row key the schema does not know | `schema.ts:114-121` (called at `:268`) drops the WHOLE row in any build that does not know it, so no presentation fact may be added to machines.json (an older Tortie would drop his machine) |
| The sheet a draft test returns | `connection-test.ts:526-542`, `describeMachine` (`confirm.ts:427`) with the resolved path; `machines:add` (`ipc.ts:663-685`) recomputes it over `rowFromAdd` before `addMachineRow` |
| Condition 100(e) of `conformance:machines` | reads `data-measured-versions="1"` in `AddMachine.tsx` and requires `{MEASURED_VERSIONS.join(', ')}` and nothing beside it (`conformance-machines.mjs:11205-11222`) |
| Probes that drive this surface | `probe-machines`, `probe-p101..p104-shot`, `p129-agents`, `p130-prose`, `p130-spacing`, `p131-row`, `p167-scale`, `p234-arch`, `p235-nits`, `p242-write-path`, `p242-2v-verify`, `p242-2-image` (§9.5) |
| `with-scratch-machine.mjs`'s `isolated()` | runs ssh with no `-F`, so it reads his `~/.ssh/config` and default identity files (via getpwuid); the probe does not use it (§10) |

## 3. Decisions, each with its source

**D1. The far check replaces the test's far command, and nothing else about the test moves.** `composeTestArgv`
(`connection-test.ts:229-252`) keeps every option, `BatchMode=no` stays at its one site, `StrictHostKeyChecking=ask` and the
two record files stay, and only the last argv element changes from `remoteProbeCommand(program)` to
`composeCheckCommand(fields.remoteTmuxPath)` (new, `src/main/machines/check-script.ts`). The pty, the 60 s deadline, the 256
KB cap, the password stop and the one live slot are unchanged. Source: entry; Phase 68's one interactive moment; M4-M14.

**D2. The far script, its shape and its order.** One line (no newline, no `!`, no single quote, no `\\`) so csh and tcsh
parse it as they parse today's probe (M14). Positionals: `$1` a typed path or empty, `$2` the login probe text, `$3` the
install folders joined with `:`. It prints, between two `__TORTIE_CHECK__` lines: `user=` (`id -un`), `os=` (`uname -s`),
`login=read|none`, then `cand=<source> <path>` for each DISTINCT executable regular file named `tmux` found in this order:
1. the login shell: `"${SHELL:-/bin/sh}" -lc "$2" </dev/null 2>/dev/null` captured into a variable, `$2` being exactly
   `printf __TORTIE_LOGIN__%s__TORTIE_LOGIN__ "$PATH"` (the Phase 69 recipe with its own marker), every folder of that PATH
   in order (`source login`);
2. the PATH the far command itself has, which is today's answer (`source path`), so no machine today's probe finds is lost;
3. the folders in `$3` (`source install`), an entry starting `~/` composed against the far `$HOME` by the far shell.
A typed path (`$1`) is checked alone (`source typed`, or `typed=missing`). Distinct means a different `stat -L` device and
inode, GNU spelling first and BSD second (Phase 336 M3: the GNU spelling is silent on macOS), the path text when neither
answers. When exactly one program results, the script prints `version=` (the first line of that program's `-V`, stdin
`/dev/null`) and the legacy `__TORTIE_PATH__<path>__TORTIE_PATH__` pair inside the block. Nothing the login shell printed is
ever printed. Source: entry ("its login shell first, then the usual install folders, and the Advanced field only for an odd
place"); M1, M3, M5-M13.

Revised by §Attack (T2, T3, T6; measured by attack 2, 80 rows): the script also runs `set -f` first, so a login PATH entry holding
`*`, `?` or `[` is never expanded (T3 found two programs in folders the login shell itself never searches); skips a
candidate whose path holds a newline before it is counted or run (`nl=$(printf "\nx"); nl=${nl%x}` then `case "$2" in
*"$nl"*) return 0`; T2 made the draft name a directory as the program and garble the version line); prints `count=<n>`
after the candidates; and runs `-V` only when the one candidate's FIRST source is `typed`, `login` or `path`. For a single
candidate whose first source is `install`, it prints `vskip=install` instead of `version=`. The starting text is
`scratchpad/p340/adversary/check-script-r.mjs` (1,379 bytes, still no newline, no `!`, no `'`, no `\\`), measured under
`/bin/sh` (bash 3.2), `dash`, `ksh`, `zsh --emulate sh` and `bash --posix` as the inner interpreter and under `csh`,
`tcsh`, `ksh`, `dash` and `bash` as the outer one, all agreeing.

**D3. The install folders, compiled, in this order** (`REMOTE_TMUX_INSTALL_FOLDERS` in `check-script.ts`):
`/opt/homebrew/bin`, `/usr/local/bin`, `/home/linuxbrew/.linuxbrew/bin`, `~/.linuxbrew/bin`, `/opt/local/bin`, `/usr/bin`,
`/bin`, `/snap/bin`, `/run/current-system/sw/bin`, `/nix/var/nix/profiles/default/bin`, `~/.nix-profile/bin`,
`~/.local/bin`, `~/bin`. Homebrew on both chips, Linuxbrew, MacPorts, distribution packages, snap, NixOS and Nix profiles,
and a person's own bin folders. It is NOT `extraBinDirsFor` (`tmux/resolve.ts:160`), which is the AGENT list. No entry is
expanded on this Mac and none holds `$`, `*`, `?`, `[` or `:` (the `rebaseRemoteDir` rule, `remote-argv.ts:135`). Order
affects only the order candidates are listed in. Source: entry ("where Homebrew and Linux put it"). The Linux entries are
read, not run (§13).

**D4. Anything ambiguous is refused: more than one distinct program anywhere Tortie looked is a choice he makes.** Main
answers a new class `program-choice` with every candidate (login first); no candidate is run (M5, M8, M11: the stand-in
logs stayed empty); each candidate is a button that re-runs the check with that path typed, which is his press, and only
then is `-V` run. One program, however many spellings reach it (M9), is not ambiguous. This covers the attack "a far tmux
planted earlier on the far PATH than the real one": the plant is shown beside the real one and nothing runs until he picks.
Cost, stated: a machine with two installs of tmux asks once. Source: entry ("refusing anything ambiguous"; the attack list).
Revised by §Attack: in a SAVED check (a row's Test the connection), `program-choice` lists the candidates as text and offers
no button, because the row's path is a hashed field that only Remove and add again changes; a saved row always carries a
path, so this arises only for a hand-written row with none.

**D5. Why the automatic check is consistent with refusal 8, and what the press is.** Refusal 8 forbids a process starting
on a configuration change alone, and binds the agreement to a hash of the fields that decide what runs. The check is
started by his own press in Tortie's own window, out of band of any agent turn: a click on a tailnet row, or Check (or
Return) on an address he typed, or a candidate button. It reads no file (a draft never reads `machines.json`, as today,
`ipc.ts:62-66`), it starts no server, it writes nothing on either machine except Tortie's own record of the far host key
when he presses Trust it (today's behaviour), and it leaves nothing running. What it runs over there is what any sign in as
him runs (his own login files, read by the login shell, which Prepare already runs after the press since Phase 69) plus one
`-V` of the single program found, which his own terminal runs under the same name; when there is more than one, nothing
runs until he picks (D4). The agreement still binds every field that decides what Tortie RUNS there durably (the path, and
the accepted version), and it is recorded only by the Add press (D7). Nothing starts on a keystroke (an edit to an address,
an account, a port or a path drops the finished check, `machines-store.ts:611-629`, and Check again is a press), on opening
Settings, on a file change, on a wake or on a timer; `smoke:machines` (`smoke.ts:321`, zero ssh at boot with confirmed rows)
still holds. The weakness, by class: a program that is the ONLY `tmux` Tortie finds runs once with `-V` at his pick, before
he has read its path; his login files already had that power at any sign in. Source: CLAUDE.md refusal 8 and its "why" paragraph;
research 51 §4.2 as amended by Phase 68 ("a person's own click in Settings, out of band of any agent turn"); entry.

Revised by §Attack (T4, T5, T6). The sentence "his own terminal runs it under the same name" was true only of the login and
path routes: T6 measured a lone program in `~/bin`, a folder the login shell does not search (`command -v tmux` there
answered `none`), being run by the draft. So `-V` now runs only for a program he typed or that his shell runs by that
name (D2), and the class that remains is exactly that one: the program his own `tmux` would start runs once with `-V` at
his pick. Before the Add press the check runs nothing else of the machine's: `id`, `uname`, `stat`, `head`, his login
shell and that one `-V`. "It leaves nothing running" is Tortie's own processes only: a login file that sleeps adds its time
(T4a, 3 s for a 3 s sleep) and a login file that leaves a child holding its output keeps the check waiting until that child
exits (T4b, 4 s), bounded by the test's 60 s deadline, after which that child is his login file's and runs on as it would
after any sign in. Prepare's own login read (`remote-path.ts`, 10 s) refuses such a machine today, so no machine that works
today stops working; the timed-out outcome says it signed in and did not finish (D9).

**D6. Add a machine looks at the tailnet at once.** The Add a machine press runs the pinned Tailscale program once
(`findTailnet`, `machines-store.ts:644-660`), the same local read Find machines on your tailnet runs today, and the button
goes. This supersedes Phase 79's "opening this sheet still runs nothing": the opening IS a press, the program is the pinned
one on this Mac, and it reaches no other machine. Look again stays. Source: the design ("The tailnet list … or Type an
address…" as step 1).

**D7. One press, Add `<name>`: the same hash, then Prepare.** The renderer sends what it sends today plus, for a version Tortie
has not measured, `acceptedTmuxVersion` (appended optional on `MachineAddInput`). `machines:add` (`ipc.ts:663-685`) puts it on
the row in `rowFromAdd` after checking `MACHINE_VERSION_PATTERN` (a value that fails refuses with a sentence, nothing written),
recomputes `describeMachine` over that row and refuses a hash that is not the sheet's, exactly as today, then writes the row
and records the agreement. The store then calls `machines:prepare` with the id the add returned, in the same action, the
shape `acceptVersion` already has (`machines-store.ts:857-888`). No new channel, no new hashed field, no change to
`canonicalMachineText`; a row with no accepted version hashes byte for byte as today (condition 42 holds). An add whose
agreement could not be sealed returns today's sentence and does not prepare. Source: design item 3; Phase 68 (one handler
writes the row and records the confirmation); Phase 83 ("through the machine's existing confirm agreement rather than a new
surface").
Revised by §Attack: the sheet main composes carries the version it bound, `MachineConfirmSheet.acceptedTmuxVersion?:
string | null` (appended optional), and the renderer echoes THAT field into the add, never deriving it from the check view,
so one source decides it. `machines:add` also refuses, with nothing written, an `acceptedTmuxVersion` that
`decideRemoteVersionGate` answers `measured` for, because an acceptance of a measured version is dropped from the lines
but kept in the hash text (Phase 324) and a person would agree to a line they never see. This chain (add, then prepare)
is the ONLY place a confirmation is followed by a prepare in the same press (D12).

**D8. The version line.** Measured: the checklist reads `Version 3.6a` and nothing more. Not measured: the checklist reads
`Version 3.9z, not yet measured`, main's sheet carries the version as the fifth line ("Accepts this version of the program,
which Tortie has not measured: 3.9z") and `versionHonesty` (`MACHINE_VERSION_ACCEPT_OFFER`, appended optional on
`MachineConfirmSheet`), and the Add button carries one sub-line, `Accepts version 3.9z`. Unreadable (no version, or a string
`MACHINE_VERSION_PATTERN` refuses): no sheet, no Add, the row says `It did not say its version.` with Check again. Today such a
machine could be added and was then refused at every Prepare (`prepare.ts:422-444`), so nothing usable is lost. A confirmed
row whose machine later reports a version nobody measured keeps Phase 83's sheet, under Review… (D12). Source: design item 3.

Revised by §Attack (no scenario worse than today). FOUR version kinds, read with `parseTmuxVersion` (`tmux/version.ts:430`,
the parser Prepare uses) and `decideRemoteVersionGate`: `measured` (the checklist reads `Version 3.6a`), `unmeasured` (the
sub-line and the fifth line, as above), `not-read` (the one program was found only in an install folder, `vskip=install`;
the checklist reads `Version: read when it is added`) and `unreadable`. **Add is drawn for every `ok` check**, with an
acceptance only for `unmeasured`: for `not-read` and `unreadable` the sheet carries no accepted version and Prepare decides
as it does today, so a version it has not measured meets Phase 83's sheet on the Ready step (one more press, today's
press). The earlier "no Add for unreadable" is dropped because Prepare asks the RUNNING server's version first
(`readRemoteTmuxVersion`, `prepare.ts:177-188`), so a machine whose old server answers a measured version while its program's `-V` does not parse
works today and would have been refused here.

**D9. The questions, inline, and only when needed.** Main emits a new event kind on `machines:testEvent`,
`{ testId, kind: 'ask', ask }`, where `ask` is `{ kind: 'host-key', fingerprint, keyType }` when the buffer ends with ssh's
"Are you sure you want to continue connecting (yes/no/[fingerprint])?" (the fingerprint read from "key fingerprint is
SHA256:…"), or `{ kind: 'prompt', text }` when the running buffer ends with a non-empty line and nothing has arrived for
700 ms (a passphrase question, for instance; ssh's prompts end without a newline and the check's own lines end with one).
Trust it sends `yes` through `machines:testInput` (today's channel); Stop cancels; a prompt's field sends the line. The
password question keeps today's stop (`connection-test.ts:642-655`) and opens the key step. The transcript, its two Tortie
lines (`TRANSCRIPT_TORTIE_LINES`, still exactly two) and the outcome's detail move behind Details. Source: design item 2.

Revised by §Attack (attack 3, real ssh bytes from OpenSSH 9.9p2 over the loopback machine; T1):
- The `host-key` ask is raised at most once per test and ONLY while no `__TORTIE_CHECK__` marker has arrived, because ssh
  always asks before the far side prints anything and a login file can print ssh's own words after it. Its matcher is
  anchored on the measured bytes: `The authenticity of host '<…>' can't be established.\r\n<TYPE> key fingerprint is
  SHA256:<…>.\r\n` then any lines, then `Are you sure you want to continue connecting (yes/no/[fingerprint])? ` at the end
  of the buffer. Trust it sends `yes` only while that ask is the open one for the live test id.
- The `prompt` ask ignores a buffer whose last line is empty after removing `\r` (the first chunk ssh sends is a lone
  `\r`), and when it is raised Details opens, because the ask shows only the last line and ssh's other questions (an
  address whose key differs, `(yes/no)?` with no fingerprint) put their reason on the lines above it.
- The ask's field is `type="password"`, `autoComplete="off"`, kept in the component and cleared on send, because the usual
  unrecognised prompt is a passphrase or a code. While a check runs, Details also keeps today's answer field and Send
  (`data-machines-action="send"`), so a prompt the 700 ms rule misses can still be answered: today that field is always on
  screen, and hiding it with nothing in its place would strand a machine that works today.
- A `timed-out` check whose buffer holds the opening marker and no closing one composes its detail as `It signed in, and
  its login files did not finish within a minute. Nothing was changed on either machine.` (main's words, `errors.ts`).

**D10. The key step, inline.** On `password-required`, `auth-refused` or `refused` with a key sheet (`keySheetOf`,
`machines-store.ts:264-270`, unchanged), the step draws the password field, `KEY_PASSWORD_HINT` and the button, and puts
main's lines, warning and five notes behind What this does. Main's hash, the one-call password and the redaction are
unchanged (`ipc.ts:937-999`, `connection-test.ts:870-1026`). After `key-installed` the store re-runs the check, as today.
This supersedes Phase 130's rule that the file written on that machine and where the private half lives stay on the face:
they are one click away, and the hash binds them as before. Source: design item 2 ("a password once to put Tortie's key on
it"); "just enough words".
Revised by §Attack: the re-check after `key-installed` reuses the OPEN test's draft and its `draftId` (a saved one its row
id), never `machineIdFrom` over the form again, because the key Tortie just made is keyed by that id; and it can only go
green because of D27.

**D11. The machine row.** A color dot, the label, a chip, one fact line (`<host> · <system> · <version>`, each part only when
known in this run), one next-step button and a ⋯ button. Chip and next step, first match wins (`machineStatusOf`, new pure
`src/renderer/settings/machine-status.ts`):

| Condition | Chip | Next step |
| --- | --- | --- |
| state `unknown` | Not usable | Review… |
| state `never` | Not confirmed | Review… |
| state `changed` | Changed | Review… |
| last sign-in `host-key-changed` | Identity changed (the alarm token) | none |
| last sign-in `auth-refused` or `password-required` | Needs a key | Set up sign-in… |
| last sign-in `version-unmeasured` | New version | Review… |
| link `connecting` | Connecting | none |
| `ready` | Ready | Open a folder on it… |
| otherwise | Offline | Prepare this machine |

The chip's hover title is the sentence that explains it: `STATE_SENTENCE` for the first three, main's last sign-in headline
and detail for the next three, main's link sentence (`machineDetailSentence`, `machine-state.ts`) for the rest. The facts come
from main (D24). Source: design item 4.

**Revised by §Attack: the table above is replaced by this one**, because `ready` is `machineCanHoldSession`
(`remote-sessions.ts:1535`), which asks only whether a context is registered with a captured PATH
(`ready-context.ts:35-61`) and stays true after the machine goes to sleep: the link moves to `quiet` and nothing
unregisters the context. The draft table would have drawn **Ready** on a machine that does not answer. First match wins:

| Condition | Chip | Next step |
| --- | --- | --- |
| state `unknown` | Not usable | Review… |
| state `never` | Not confirmed | Review… |
| state `changed` | Changed | Review… |
| last sign-in `host-key-changed` | Identity changed (the alarm token) | none |
| last sign-in `auth-refused` or `password-required` | Needs a key | Set up sign-in… |
| last sign-in `version-unmeasured` | New version | Review… |
| a Prepare for this row in flight in this window, or link `connecting` | Connecting | none |
| `ready` AND link `connected` or `polling` (the rule of `machineAnswering`, `state/machines-slice.ts:176-182`) | Ready | Open a folder on it… |
| last sign-in `unreachable`, `refused`, `not-resolved` or `timed-out`, or link `quiet` | Offline | Prepare this machine |
| otherwise (no sign-in in this run, `no-program`, `no-server`, `unknown`, `client-missing`, `client-failed`) | Not ready | Prepare this machine |

`Not ready` is the one new chip word; its hover is main's last sign-in headline and detail when there is one, else
`PREPARE_EXPLAIN`. The table is `machineStatusOf` in `machine-status.ts`, pure, and its Ready arm is condition 139.

**D12. The next steps.** Review… opens the agreement panel (today's lines; on a changed row both labelled lists; the warning,
the honesty, any write paragraph and refusal) with Confirm this machine or Confirm the new details, which confirms ONLY
(Revised by §Attack; the draft chained a prepare here); a New version row's Review… runs Prepare first so Phase 83's
acceptance sheet and Accept this version and prepare it are drawn. Set up sign-in… starts the saved check (the gate in main
refuses an unconfirmed row, as today); its key step is D10's; when the re-check of that CONFIRMED row answers `ok` the store
prepares it. Prepare this machine is today's call. Open a folder on it… is D13. Source: design item 4 ("one button for the
next thing").

Why Confirm does not chain, from the attack: his design asks one press to confirm and prepare at ADD (item 3) and is silent
on Review…. A row reaching Review… is one he did not add in this flow (hand-written, edited, or written by an agent), and a
separate Prepare press keeps a second look before anything starts there; and four old probes (`probe:p167`, `probe:p234`,
`probe:p2422`, `probe:p2422v`) press `confirm`, wait 1.6 to 1.8 s, and end that launch soon after, so a chained Prepare would start a
far server in a launch that does not expect one and may outlive it. After Confirm the row reads `Not ready` with Prepare
this machine. While Settings is open, a row that moves from confirmed to changed opens its review panel by itself (the
Phase 131 transition, `MachineRow.tsx:300-311`, kept: it sets UI state and starts nothing).

**D13. Open a folder on it… reaches the main window through one new channel.** `machines:openFolder` (invoke, `[id]`,
answers `boolean`) refuses a row that is not confirmed (`isMachineConfirmed`), then raises the app window and sends the menu
action `open-folder-on:<id>` (a new template family beside `open-recent-on:`, `projects.ts:472-475`) through
`sendMenuAction` (`menu.ts:189-199`). It starts no process. The main window opens the existing Open a Folder on a Machine sheet
(`RemoteProjectModal.tsx`) with that machine chosen. The contract baseline gains exactly this one channel. Source: design
items 3 and 4.

**D14. ssh missing and ssh failing to start are two classes.** In both runners (`startMachineTest`, `startKeyInstall`), the
branch where `resolveSsh` found no executable file keeps `client-missing` and its copy, and now logs a warning naming the
path; the `catch` around `nodePty.spawn` finishes a new class, `client-failed`, and keeps its warning with the raw message.
`client-failed`'s headline is `Tortie could not start ssh on this Mac.`; its detail is composed in main as
`ssh is at <path>, but <reason>. Nothing was sent to any machine.`, the reason in plain words from the error. Revised by
§Attack: node-pty on macOS throws the one string `posix_spawnp failed.` for EVERY failure of `pty_posix_spawn`
(`node_modules/node-pty/src/unix/pty.cc:687-780`: `posix_openpt`, `grantpt`, `unlockpt`, the slave `open`, `tcsetattr`
and the `TIOCSWINSZ` ioctl all return with `err` still `-1`, and a failed `posix_spawn` of the spawn helper returns its
code, all reaching `:373` as the same words with no errno), so that string cannot honestly be read as "it would not give
it a terminal". The reasons are: an error with `code` `EACCES` or `EPERM` → "macOS would not let Tortie run it"; `EMFILE`
or `ENFILE` → "Tortie has too many files open"; `EAGAIN` → "this Mac is running too many programs to start another";
node-pty's `posix_spawnp failed.` and anything else → "macOS would not start it and did not say why". The raw message and
any code are in the warning. Remedy (renderer): `Quit Tortie and open it again. If this keeps happening, restart this
Mac.` Both classes are Tortie's own words, so both are `noGolden` rows. `prepare.ts`'s unreached list gains `client-failed`
beside `client-missing`. Source: the folded-in item; M18.

**D15. Main accepts EXACTLY one block, and the path from inside it.** (Revised by §Attack, T1: the draft read the LAST
block, and an EXIT trap set in the outer shell's `.zshenv` prints a whole block AFTER the script; measured, the draft then
named `/evil/tmux` with a measured version, in every interpreter. bash `-c` exec'd `/bin/sh` and ran no trap; zsh ran it.)
`parseCheckAnswer` counts the marker: exactly two occurrences or the answer is malformed. Inside the block every line is
`key=value` from the closed set (`user`, `os`, `login`, `cand`, `typed`, `count`, `version`, `vskip`) or the one path pair;
each `cand` path passes the schema's `remoteTmuxPath` rule (absolute, no control character, no `'`, at most 1,024
characters, `schema.ts:179-197` and `:101-112`); `count` equals the candidate lines; for one candidate the path pair
equals it. A malformed block is class `unknown` with no sheet, whatever else the buffer holds. Cost, stated: a login file
that prints Tortie's own marker refuses the check, where at the parent a block printed BEFORE chose the program (M6') and
one printed after changed nothing.

The live classifier is a new `classifyCheckOutput(text, exitCode)`: a well-formed block decides (`ok`, `program-choice`,
`no-program`); a malformed one is `unknown`; with no block, today's order exactly, except that the legacy path pair can
no longer answer `ok` (it answers `unknown`: the far side did not run Tortie's check). `classifyProbeOutput` and
`parseResolvedPath` stay byte for byte for `golden.test.ts` and `build/probe-key-install.mjs:270`, and `golden/ok.txt` and
`no-program.txt` are marked in the manifest as captures of the probe this phase retired. `finish` reads `resolvedPath` and the
sheet ONLY from a well-formed block. The display strips both marker kinds (`splitTranscriptForDisplay` generalised to a
marker list; the two markers share the prefix `__TORTIE_`, so the held tail rule is unchanged). Source: M6'; Phase 73.1;
§Attack T1, T2.

**D16. No machines.json key, no hash change, no confirmed row unconfirmed.** `MACHINE_ROW_KEYS`, `APPENDED_KEYS`,
`MACHINE_EXECUTION_HASH_ALGORITHM` and `canonicalMachineText` are untouched; a parent-confirmed row is confirmed at HEAD
with a byte-equal hash (probe arm A11). The system name and version on the row are memory in main, not file fields (M18: an
unknown key drops the whole row in an older build). Source: entry ("What the spec must keep"); Phase 336 D22.

**D17. The paragraphs move; no consent fact is hidden at the moment of agreement.** Every hashed fact is on the face of the
checklist when Add is pressable (Reached `<host>` with `:<port>` when set, Signed in as `<account>`, Found `<path>`, Version
`<v>`), and the exact lines, `MACHINE_CONFIRM_WARNING`, `MACHINE_PATH_HONESTY`, any write paragraph and the version offer are
under What it runs beside the button. On the row they are under What Tortie runs there… and the review panel. This supersedes
Phase 79's "drawn at both moments of agreement" and Phase 131's "on the face of the row", on his design. Source: design items
3 and 4; "just enough words"; memory "remote feels identical to local".

**D18. No tmux or ssh word in Tortie's renderer copy.** The renderer audit (`machines-copy.test.ts:62`, `FORBIDDEN_WORDS`)
is unchanged. The program's path, which the machine reported, is data and may hold the word; main's sentences may name the
program and the client, as `errors.ts` already does (`no-program`, `client-missing`). Source: CLAUDE.md UI rule; the audit.

**D19. The agents appear after Add, not in the check.** Prepare already starts one batched scan (`prepare.ts:472-477`); the
ready panel draws `Agents on it:` and the names the scan found present, when it has answered. Running the agent walk before
the agreement would be a far script that binds nothing. Source: design item 2 asked for "the agents there"; this moves them
one step later at no extra connection (§14 item 2).

**D20. The ⋯ menu is native and holds five rows.** Through `window.gmux.popupMenu` (`ui:popupMenu`,
`menu-popup.ts:116-147`), from the button's rectangle: Prepare this machine (enabled when confirmed); Test the connection
(enabled when confirmed, the answer main gives an unconfirmed row anyway); What Tortie runs there…; a separator; Stop
trusting this machine (today's Withdraw confirmation, enabled when confirmed, sub-label `Also takes back version <v>` while
an acceptance stands); Remove… (today's two-step question, inline under the row). Prepare this machine is a fifth row beyond
his design because seven shipping sentences tell a person to prepare (`machines-copy.ts:756` `REMEDY['no-server']`,
`machines-copy.ts:1028` `AGENTS_NOT_SIGNED_IN`, `errors.ts:274` the `no-server` detail, `errors.ts:402`
`MACHINE_FEED_NOT_STARTED`, `key-install.ts:332` `MACHINE_KEY_USED_NEXT_PREPARE`, `machine-choice.ts:42`,
`remote-copy.ts:241`), and the project tab's action imports its label (`prepare-action.ts`), so the label and the control
must exist in every state; `context.ts:458` tells a person to Test the connection, which the menu also holds. Source: design
item 4; the UI rule; the retired-claims rule.
Revised by §Attack: when `window.gmux.popupMenu` is absent the ⋯ press does nothing and draws nothing (no DOM fallback of any
kind); the press handler and the probe hook both call one `runMachineMenuItem(id, row)`. The existing harness knob
`GMUX_SHOT_POPUP_PICK` (`menu-popup.ts:83-113`) would drive the real native path, but it requires `GMUX_SHOT`, which takes
a photograph, and this run takes none, so the probe uses the hook and condition 134 reads the press handler's source.

**D21. The comments that say login shell are corrected** at `connection-test.ts:248-249` and `key-install.ts:230-231`
("ssh hands it to the account's shell with `-c`, which is not a login shell"). Source: M1; the entry.

**D22. The old probes.** The new row keeps two attributes five setup helpers drive: the next-step button of a row that is
not confirmed carries `data-machines-action="toggle-lines"` with `aria-expanded`, and the review panel's button carries
`data-machines-action="confirm"`. `probe:p167`, `probe:p234`, `probe:p2422` and `probe:p2422v` then confirm their hand-written
rows unchanged, and since Confirm no longer chains a Prepare (D12, Revised by §Attack) each confirm press does exactly what it
did at the parent. `build/probe-machines.mjs`, `probe-p130-prose.mjs`, `probe-p130-spacing.mjs`, `probe-p131-row.mjs` and
`probe-p235-nits.mjs` assert the old face's words and buttons; each refuses by name, exit 2, with one sentence naming Phase 340
and `probe:p340`, the Phase 336 precedent. `probe-p101..p104` and `probe-p242-write-path` already refuse. Source: method rule
"a probe is checked"; Phase 336 §8.5.

**D23. Data attributes kept for continuity**: `open-add`, `add-cancel`, `add-confirm` (the Add `<name>` button), `test-draft`
(Check), `send`, `cancel-test` (Stop), `install-key`, `prepare`, `accept-version`, `remove-confirm`, `remove-keep`,
`machine-password`, `data-machines-peer`. New: `data-machines-step="pick|check|add|ready"`, `data-machines-check-row`,
`data-machines-ask`, `data-machine-chip`, `data-machines-next`, `data-machines-more` (the ⋯ button).

**D24. What the row knows, from main.** `MachineRowView` gains four appended optional fields, composed in `viewOf`
(`ipc.ts:369-414`): `link` and `linkDetail` (that row's `currentMachineStates()` entry), `signIn` (`{ class, at, version,
headline, detail }` of the last Prepare in this run, from any caller: the launch sign-in, its retry, a press), and `os` (the
`uname -s` the far `machine-facts` read last answered). A new module `src/main/machines/row-facts.ts` holds the last two in
memory, written by `prepare.ts` (one wrapper around every return) and by `remote-image.ts` where `machine-facts` is parsed,
forgotten in `removeMachineCompletely` beside `forgetRemoteMachineHome` (`removal.ts:253-254`). The Settings store refreshes
rows on `onAgentsChanged` as well as `onStateChanged`. Darwin is drawn as macOS. Source: design item 4 ("host, OS and tmux
version on one line"); M18 (no file field).
Revised by §Attack: a link change can fire `onStateChanged` inside `prepareMachine`, before the wrapper records the class,
so the refresh it causes reads the previous sign-in and the chip lags until some later push. `row-facts.ts` keeps one
listener set; `registerMachinesIpc` subscribes once, beside `stateSubscribed` (`ipc.ts:540-566`), and re-broadcasts
`EVT_MACHINE_STATE` with `currentMachineStates()` when a fact changes, which the Settings store already refreshes on. No
channel is added. `resultOf` computes `currentMachineStates()` once and hands each row its entry, rather than `viewOf`
asking for every row's states once per row.

**D25. The CHANGELOG.** One item, under `### Changed`, because the commit reshapes an existing flow; the tmux miss and the ssh
split are told inside it (the one-commit-one-section rule). Phase 339's unreleased item names "Find machines on your
tailnet", which this phase removes, so the same commit rewords that item's opening to the list's new name (§8.3).

**D26. The probe touches nothing of his.** Scratch `HOME`, no `SSH_AUTH_SOCK`, its own `scratchYard` and `scratchMachine`
(not `with-scratch-machine.mjs`, whose `isolated()` reads his `~/.ssh/config`), the quiet shell and the scratch home, an ssh
wrapper named by `GMUX_SSH_BIN` (`exec /usr/bin/ssh -F none -p <port> -o IdentitiesOnly=yes -o IdentityFile=<yard key> "$@"`;
M15), a Tailscale stand-in named by `GMUX_TAILSCALE_BIN`, `--use-mock-keychain`, and no `-L gmux` at all (§10). Source: the
run's hard rules.
Revised by §Attack: (1) `npm run probe:p340` inherits his environment, and `scratchYard` at this parent calls
`ownPublicKeys()` (`build/scratch-machine.mjs:103-128`), which lists `$HOME/.ssh/*.pub` and asks `ssh-add -L` of whatever
agent `SSH_AUTH_SOCK` names. So the probe's FIRST statements, before any import that runs code, set `process.env.HOME`,
`ZDOTDIR` and `HISTFILE=/dev/null` to its scratch, delete `SSH_AUTH_SOCK` and `TERM_SESSION_ID`, set
`SCRATCH_MACHINE_NO_OWN_KEYS=1` (Phase 337's switch; harmless before it lands), and exit 2 by name if `SSH_AUTH_SOCK` is
still set. (2) `resolveSsh` FALLS BACK to `/usr/bin/ssh` when `GMUX_SSH_BIN` stops naming an executable file
(`carriage.ts:109-121`, a warning and no refusal, unlike Phase 330's Tailscale override). The real client with no `-F none`
and no port would open his `~/.ssh/config` through the account record and dial 127.0.0.1:22, which is his own account if
Remote Login is on. The probe preflights the wrapper by sha256 before every launch, keeps it until its `finally`, samples
`ps -Ao pid,ppid,args` every second while an Electron runs and FAILS the run, ending the app, on any `/usr/bin/ssh` whose
first two arguments are not `-F none`, and fails on the warning `GMUX_SSH_BIN does not name an absolute executable file` in
`app.log`; every `StartedTest.sshPath` it sees must equal the wrapper. (3) The far tmux server Prepare starts daemonises out
of sshd's process tree, so `machine.stop()` (`scratch-machine.mjs:500-511`) does not end it: the probe ends it in its
`finally` with the yard's own `tmux -L <harness socket> kill-server` under that machine's `TMUX_TMPDIR`, through
`refuseRealSockets`, and the RUN arm asserts no server answers on that socket afterwards.

**D27. The check names Tortie's own key for that id (new, from §Attack).** `composeTestArgv` (`connection-test.ts:229-252`)
has never named an identity: Phase 84 item 7 named Tortie's key on every command through the carriage (`ssh.ts:281-288`,
pinned by condition 48), and the visible test composes its own argv and was missed. So on the stock Mac Phase 79.1 was
written for (Remote Login on, none of his own keys authorized there), "Put Tortie's key on it" installs the key, the store
re-runs the test, and the test, offering only his agent and default files, asks for the password again: the key the button
just installed is never tried, and the new design's step 2 could not go green there. The check now takes the same rule
the carriage takes: when `machineKeyPairPresent(sheetId)` (`key-material.ts:263-272`), the argv carries
`-o IdentityFile="<machineKeyPath(sheetId)>"` (quoted, the data directory holds a space), after the record files and before
`-p`; when it is absent, nothing; never `IdentitiesOnly`, so his own keys are still offered (condition 48's reason). It
changes no hashed field and no confirm hash. Class stated: a DRAFT check offers the key Tortie made for that id, if one is
on this Mac, to the address typed, so a server learns that public half; it can do nothing with it. Keys survive Remove
(`removal.ts` touches none), so re-adding a machine under the same name signs in with the key it had. Source: §Attack;
Phase 84 item 7; Phase 79.1's "the flow ends with the machine's own answer".

**D28. A pick names the machine it picks (new, from §Attack).** `usePeer` (`machines-store.ts:631-641`) keeps a label that is
not empty, which made sense while the Name field sat above the peers. In this design Name is drawn only after a check
(step 3), so a label present at a pick came from an EARLIER pick: picking `studio` and then `macpro` would check `macpro`
under the id and label `studio`. A pick now replaces the label with the name the peer row drew (`peerDisplayName`), and a
Check of a typed address clears a label a pick set. The id is derived at the check (`machineIdFrom`, unchanged) and fixed on
the test (`LiveTest.draftId`), so editing Name in step 3 changes the label and never the hashed id. Source: §Attack;
`machines-store.ts:107-116` (the id is fixed when the test starts).

## 4. Main side (builder A)

### 4.1 First, append-only: the shared contract

`src/shared/ipc/machines/connection.ts`:
- `MachineTestClass` gains `'client-failed'` and `'program-choice'`.
- `MachineCheckView` (new): `{ signedInAs: string | null; os: string | null; loginRead: boolean; program: { path: string;
  source: 'login' | 'path' | 'install' | 'typed' } | null; candidates: { path: string; source: … }[]; typedMissing:
  boolean; version: string | null; versionKind: 'measured' | 'unmeasured' | 'not-read' | 'unreadable' | null }`
  (`not-read` Revised by §Attack, D8).
- `MachineTestOutcome.check?: MachineCheckView | null` (appended optional).
- `MachineTestAsk` (new) and the third `MachineTestEvent` member `{ testId; kind: 'ask'; ask: MachineTestAsk }`.

`src/shared/ipc/machines/rows.ts`:
- `MachineRowView` gains `link?`, `linkDetail?`, `signIn?`, `os?` (D24), each absent-reads-as-unknown.
- `MachineConfirmSheet.versionHonesty?: string | null` and `MachineConfirmSheet.acceptedTmuxVersion?: string | null` (the
  version the sheet binds, echoed by the renderer, D7 revised); `MachineAddInput.acceptedTmuxVersion?: string | null`.
- `'machines:openFolder': { req: [id: string]; res: boolean }` in `MachinesRowsInvokeChannelMap`, `openFolder(id)` in
  `MachinesRowsApi`.

`src/shared/ipc/projects.ts`: `OpenFolderOnMachineActionId = \`open-folder-on:${string}\`` and `OPEN_FOLDER_ON_PREFIX`;
`src/shared/ipc/app.ts`: the family joins `MenuActionWithFind` (`:722-732`). `src/preload/machines.ts`: `openFolder`.

### 4.2 `src/main/machines/check-script.ts` (new, pure: imports `shellQuoteArgv` and the markers only)

Exports `CHECK_MARKER = '__TORTIE_CHECK__'`, `LOGIN_MARKER = '__TORTIE_LOGIN__'`, `REMOTE_TMUX_INSTALL_FOLDERS` (D3),
`LOGIN_PATH_PROBE`, `CHECK_SCRIPT` (D2 as revised; the starting text is
`scratchpad/p340/adversary/check-script-r.mjs`, which supersedes the spec writer's draft), `composeCheckCommand(typed:
string | null): string`, and `parseCheckAnswer(text): MachineCheckFacts | 'malformed' | null` (EXACTLY one block, D15
revised; `parseStrict` in the same scratch file is its measured starting text). It names no `known_hosts` and no
`.ssh/config` (conditions 6 and 7 of the gate read every machines file for them).

### 4.3 `src/main/machines/connection-test.ts`

- `composeTestArgv(fields, hostKeys, identityFile: string | null = null)`: `-o IdentityFile="<path>"` when given (D27),
  last element `composeCheckCommand(fields.remoteTmuxPath)`; `startMachineTest` passes `machineKeyPath(sheetId)` only when
  `machineKeyPairPresent(sheetId)` (the caller in `ipc.ts` decides, as it does for Prepare at `ipc.ts:916`);
  `remoteProbeCommand` is removed with its tests rewritten against the new composer and its re-export in
  `src/main/machines/index.ts:272` removed; the comment at `:248-249` corrected (D21).
- `classifyProbeOutput(text, exitCode)` stays byte for byte (the goldens and `probe-key-install.mjs` read it); the live
  decision is the new `classifyCheckOutput(text, exitCode)` (D15 revised), which `pty.onExit` calls.
- `finish` (`:488-589`): `resolvedPath` and the sheet only from a well-formed block (D15); `outcome.check` filled; the sheet
  composed for every `ok`, carrying `acceptedTmuxVersion` and `versionHonesty` only for `unmeasured` (D8 revised);
  `versionKind` says which. The key sheet rule is unchanged. A `timed-out` finish whose buffer holds one marker and not the
  second takes the signed-in detail (D9 revised).
- Asks (D9 as revised): a `hostKeyAsked` flag so one test asks once, raised only before the first `__TORTIE_CHECK__`; a
  700 ms quiet timer reset on every chunk, cleared in `finish`, that ignores a last line empty after removing `\r`.
- `client-missing` / `client-failed` (D14) at `:729-737`, `:749-757`, `:972-977`, `:989-996`; one composer
  `clientFailedReason(err)` in `errors.ts`.
- Display: `splitTranscriptForDisplay` and `stripPathMarkers` take both markers.

### 4.4 `src/main/machines/errors.ts`

`COPY` gains `client-failed` and `program-choice` (`Tortie found the program in more than one place.` / `Choose the one Tortie
should run. Tortie runs none of them until you do.`); `composeOutcomeCopy` composes `client-failed`'s detail and the typed
variant of `no-program` (`Nothing that runs is at <path> on that machine.`); `MACHINE_OUTCOME_CLASSES` follows `COPY`. No
other sentence moves.

### 4.5 `src/main/machines/ipc.ts`

`machines:add` (D7, with the measured-version refusal); `machines:test` passes the key path (D27); a once-only
subscription to `row-facts` that re-broadcasts `EVT_MACHINE_STATE` (D24 revised); `machines:openFolder` (D13; a helper exported from `src/main/menu.ts`, `openFolderOnMachine(id)`, raises
`menuActionTarget()`'s window and calls `sendMenuAction`); `viewOf` (D24); the header's channel count corrected to the number
the test names. `:installKey`, `:prepare`, `:confirm`, `:acceptVersion`, `:forget`, `:remove` are unchanged.

### 4.6 `src/main/machines/row-facts.ts` (new), `prepare.ts`, `remote-image.ts`, `removal.ts`, `key-install.ts`

As D24 and D21. `row-facts.ts` imports nothing that writes a file, opens the manifest or spawns. `prepare.ts` renames its body
`prepareMachineOnce` and wraps it, recording `{class, at, version (kept when the new read is null), headline, detail}`.

### 4.7 Main tests (new files `p340-` prefixed, plus every existing one these changes break)

`p340-check-script.test.ts` (one-line shape; composed argv; parse over the M4-M13 outputs and the adversary's real ssh
capture `scratchpad/p340/adversary/cap/capture.json` as fixtures, with `\r\n` line ends, the fake block before AND after
(both malformed), a newline-split candidate, a count that disagrees, a candidate failing the path rule);
`p340-test-identity.test.ts` (D27: a key pair present names exactly one quoted `IdentityFile`, absent names none, never
`IdentitiesOnly`);
`p340-check-outcome.test.ts` (each class; the sheet with and without an accepted version; the unreadable and unpatterned
version; the ask events over recorded ssh prompt bytes); `p340-client-split.test.ts` (`vi.mock('node-pty')` throwing
`posix_spawnp failed.` and an `EACCES` error, `GMUX_SSH_BIN` at an executable scratch file in a development resolution:
`client-failed` with each reason; a missing ssh: `client-missing`; the log called in both; both runners);
`p340-add-version.test.ts` (the add writes `acceptedTmuxVersion`, records the fifth line, refuses a bad version with nothing
written, and hashes a no-version add byte for byte as before); `p340-row-facts.test.ts`; `p340-open-folder.test.ts`; and
`golden/manifest.json` two `noGolden` rows. `src/shared/__tests__/p125-machines-surface.test.ts` counts the new member.

## 5. The Settings renderer (builder B)

### 5.1 `AddMachine.tsx` (rewritten; `AddMachineView` stays a pure view, `AddMachine` the store reader)

Step 1, data-machines-step `pick`: title and Cancel; Your tailnet (hover: `TAILSCALE_WHY`, the path the program ran and when
it last looked), Look again, the peer rows (today's `PeerRow`, unchanged marks and disabling); Type an address… which reveals
the address field and Check (Return checks); Advanced (Sign in as, Port, Program path on that machine; the path hint
shortened to `Leave this empty and Tortie finds it.`). Tailscale missing: today's install line and copy button. A pick fills
the form and starts the check (`usePeer` then `startDraftTest`). Revised by §Attack (D28): the pick REPLACES the label with
the name the peer row drew.
Step 2, `check`: while running, one row `Checking <label>…` and Stop; at the end, the checklist rows from `outcome.check`
(Reached, Signed in as, Found with the source as hover, Version), or main's headline as the one failed row with the remedy;
the asks (D9, D10, D4, the no-program `Type its path…` that opens Advanced on the path field); Details holds the transcript.
Revised by §Attack (D9): while the check runs, Details also holds today's answer field and Send; a `prompt` ask opens
Details; the ask's field is `type="password"` and cleared on send; Trust it is drawn only for the open `host-key` ask of the
live test id.
Step 3, `add`, drawn only when `sheetOf(test)` is not null, which is now every `ok` check (D8 revised): Name (prefilled from
the peer or the host; it changes the label and never the id, D28) and Color, the Add `<name>` button with its version
sub-line only for `unmeasured` (D8), What it runs (the lines, the warning and honesty, any write paragraph,
`versionHonesty`, and the measured list inside `<span … data-measured-versions="1">{MEASURED_VERSIONS.join(', ')}</span>`
beside `PREPARE_SUPPORTED_LABEL`, so condition 100(e) reads it unchanged).
Ready, `ready`: `<label> is ready.`, the agents line (D19), Open a folder on it…, Done; or main's Prepare headline, detail,
remedy and, for an unmeasured version, Phase 83's sheet.

### 5.2 `MachineRow.tsx` (rewritten), `machine-status.ts` (new), `machine-menu.ts` (new)

The row of D11 with no expand button; one inline panel at a time under it: `what` (lines, warning, honesty, write paragraph,
refusal, the key line, the accepted version, the fingerprint, the no-adoption promise, Prepare's settings table and path
note, the row id), `review`, `test` (the same check view, saved mode), `remove` (today's question), `prepare` (a Prepare
result that is not `prepared`). `machine-menu.ts` exports `machineMenuItems(row, facts)` (D20) and
`runMachineMenuItem(id, row)`; the ⋯ click awaits `popupMenu({x, y, items})` and runs the picked id; it assigns one probe
hook, `window.__gmuxP340Menu = { items(rowId), run(rowId, itemId) }`, the `p94-create-drive.ts` precedent, which changes no
behaviour. No element with `role="menu"` or `"menuitem"` anywhere in the surface. Revised by §Attack: `machine-menu.ts`
registers the hook itself when `MachinesSection.tsx` imports it (no edit to `integration.ts`, which no builder owns); a ⋯
press with no `popupMenu` on the bridge does nothing; `machineStatusOf` is the D11 REVISED table, its Ready arm requiring
`ready` and an answering link, and it reads `preparing === row.id` from the store for Connecting.

### 5.3 `machines-store.ts`

`openAdd` also looks (D6); `usePeer` then `startDraftTest` (one handler, the pick; the pick replaces the label, D28);
`pickCandidate(path)`; `addMachine` → add then prepare with the returned id (D7), the ONE chain of a confirmation into a
prepare; `confirmMachine` → confirm ONLY (D12 revised); `setUpSignIn(id)` and the `installKey` continuation that re-runs the
check with the OPEN test's draft and id (D10 revised) and prepares only a CONFIRMED saved row after it answers `ok`;
`answerAsk`; `openFolder(id)`; refresh on agents change (D24); the `onTestEvent` handler branches on all three event kinds
(`output`, `ask`, `end`), because today's handler treats every non-`output` event as `end` (`machines-store.ts:538-551`) and
an `ask` would be written as an outcome. Nothing in the file calls a starting action from a reducer, subscription or effect
(the header rule, now with these entries).

### 5.4 `ConnectionTestView.tsx`, `KeyInstall.tsx`, `machines-copy.ts`, `MachinesSection.tsx`, `machines.css`, `key-install.css`

`ConnectionTestView` becomes the checklist view (the export name kept); `KeyInstall` D10; copy §8; the section keeps its title,
caption, dropped-rows block, toolbar and disclosure. Tokens only; the chip classes take `--bg-raised` and the status tokens
the existing `.set-chip.mach-*` rules use; Identity changed wears `--error`/`--error-wash`, the one alarm.

### 5.5 Renderer tests

Rewritten to the new surface: `add-machine.test.tsx`, `key-install.test.tsx`, `machines-copy.test.ts` (REMEDY keys equal the
new class set; `LABELS_ENDING_IN_A_COLON` adds `Agents on it:`; a RETIRED_CLAIMS row for "Find machines on your tailnet" and
"Show what it runs" while `findTailnet` runs on `openAdd`), `machines-section.test.tsx`, `machines-store.test.ts`, and
`p336-no-saving-block.test.tsx` if it reads the old row. New: `p340-machine-status.test.ts` (every row of D11's table),
`p340-add-steps.test.tsx` (each step rendered; Add at rest, Tailscale installed, ≤ 15 words besides the peer rows and main's own note; no Add before a sheet; the version
sub-line; no forbidden word), `p340-machine-row.test.tsx` (a Ready row at rest ≤ 16 words with the label `studio`; no DOM
menu; each panel), `p340-machine-menu.test.ts` (items per state; each id runs the store action), and the chained actions
against a fake bridge (the payload crossing it, the Phase 68 lesson). Revised by §Attack: `p340-machine-status.test.ts`
has a row for `ready: true` with link `quiet` reading Offline, never Ready; `p340-add-steps.test.tsx` has two picks in a row
naming the second peer, a re-check after `key-installed` carrying the first check's id, an `ask` event that leaves the
outcome null, and the answer field drawn inside Details while running; `confirmMachine` against the fake bridge calls
`prepare` zero times. `src/renderer/app/__tests__/machine-vocabulary.test.ts`
lists `machine-status.ts` and `machine-menu.ts`.

## 6. The main window's half of Open a folder on it… (builder D)

`src/renderer/app/menu-actions.ts`: the `open-folder-on:` family beside `open-recent-on:` (`:581-583`), returning silently
when a sheet is already open, as `open-remote-project` does (`:227-231`). `src/renderer/state/projects-slice.ts`:
`setRemoteProjectOpen(open, machineId?)` and `remoteProjectMachineId` (`:102-110`, `:173`, `:247-248`).
`src/renderer/app/RemoteProjectModal.tsx`: the initial `machineId` (`:80`) is that id when the list holds it. Test
`p340-open-folder-on.test.ts`.

## 7. The menus (the phase brief says this)

- The application menu bar: no row added, removed, renamed or re-accelerated. File › Open Folder on a Machine… is unchanged
  and keeps its enabled rule (`menu.ts:695-702`); it can now also be reached from Settings, through the action family, with
  the machine chosen.
- The tray menu: unchanged.
- New: the machine row's ⋯ menu in Settings, native through `ui:popupMenu` (D20): Prepare this machine, Test the connection,
  What Tortie runs there…, separator, Stop trusting this machine, Remove…. No icons (the closed glyph set is untouched, so
  `gate:menu-glyphs` has nothing new).
- Context menus elsewhere: unchanged.

## 8. Words

### 8.1 At rest, before and after (the probe measures the after; the before is M16)

| Surface | Today | After (from the copy below; `probe:p340` reads the DOM) |
| --- | --- | --- |
| Add, at rest | 114 (127 once looked, before peer rows) | 12 before peer rows: Add a machine 3, Cancel 1, Your tailnet 2, Look again 2, Type an address… 3, Advanced 1 |
| Add, when Add is pressable | the above + transcript head (21) + outcome (9) + lines + paragraph (42) + button (6) | step 1 + 4 checklist rows (~10) + Details 1 + Name, value, color (3) + Add `<name>` (2) + What it runs (3) |
| The row at rest | 25 shut, 163 / 200 open | ~11: label, chip, host, system, version, one button |

### 8.2 Every sentence today, and where it goes (`machines-copy.ts`, words in brackets)

| Today | After |
| --- | --- |
| `TAILSCALE_NOT_LOOKED` (5), `BTN_FIND_TAILNET` (5), `tailnetCountLine` (≤4), `ADD_DISABLED_REASON` (21), `BTN_SHOW`/`BTN_HIDE` (4), `BTN_TEST_AGAIN` (4), `BTN_WITHDRAW_VERSION` (3), `WITHDRAW_VERSION_EXPLAIN` (27) | retired (nothing they described remains; the explain becomes the menu sub-line `Also takes back version <v>` (5)) |
| `TAILSCALE_TITLE` (1) | `Your tailnet` (2) |
| `TAILSCALE_WHY` (15), `TAILSCALE_EXPLAIN` (29), `TAILSCALE_SOURCE_LABEL` + path, `lastLookedLine` | hover of Your tailnet |
| `FIELD_HOST` (2), `FIELD_USER` (3) + hint (13), `FIELD_PORT` (1) + hint (7) | behind Type an address… and Advanced |
| `FIELD_LABEL` (3), `FIELD_COLOR` (1) | step 3: `Name` (1) and the color select |
| `FIELD_REMOTE_PATH_HINT` (33) | `Leave this empty and Tortie finds it.` (7), inside Advanced |
| `PREPARE_SUPPORTED_LABEL` + list (9) | inside What it runs (condition 100(e)) |
| `BTN_TEST` (3), `TESTING` (3), `BTN_CANCEL_TEST` (3) | `Check` (1) for a typed address; the menu row Test the connection; `Checking <label>…` (2); `Stop` (1) |
| warning + honesty on Add (42) | inside What it runs |
| `BTN_ADD_CONFIRM` (6) | `Add <label>` (1 + label), sub-line `Accepts version <v>` (3) only when unmeasured |
| `TRANSCRIPT_RUNNING_LABEL`, `TRANSCRIPT_SOURCE_LINE` (27), `ANSWER_LABEL`, `ANSWER_HINT` (13) | inside Details; an unrecognised prompt draws the program's own line, a field and Send |
| `KEY_BLOCK_LABEL` (7), `KEY_LINES_LABEL` (4), `KEY_MORE_LABEL` (4), main's warning and notes | What this does (3), holding main's lines, warning and five notes |
| `BTN_INSTALL_KEY` (9), `KEY_PASSWORD_HINT` (17) | `Put Tortie's key on it` (5), `Sent once to sign in. Tortie keeps no copy.` (8) |
| `STATE_CHIP` (1-2), `STATE_SENTENCE` (15-23) | the chip words of D11; the sentences as its hover |
| `BTN_CONFIRM` (3), `BTN_CONFIRM_CHANGED` (4), `CONFIRMED_LIST_LABEL`, `CURRENT_LIST_LABEL` | the review panel, unchanged words |
| `BTN_WITHDRAW` (2) | menu `Stop trusting this machine` (4) |
| `BTN_REMOVE` (3), `removeQuestion`, `BTN_REMOVE_CONFIRM`, `BTN_REMOVE_KEEP` | menu `Remove…` (1); the question unchanged, inline |
| `BTN_PREPARE` (3), `PREPARING` (3) | unchanged words: the Offline next step and the menu row; `PREPARE_EXPLAIN` (28) loses its last sentence ("This is the first thing Tortie runs there", false once the check runs `-V`) and becomes the hover of Prepare this machine |
| `KEY_NOT_MADE_YET` (43), `keyNamedOnEveryCommand`, `HONESTY_NO_ADOPTION` (23), `ROW_HASH_LABEL`, `ROW_MORE_LABEL` (4), `PREPARE_*` labels, `ACCEPTED_VERSION_*` | inside What Tortie runs there…; `ROW_MORE_LABEL` retired |
| `REMEDY` (each class) | unchanged words, drawn under a failed checklist row; `client-failed` gains the D14 remedy (12); `program-choice` null |
| Section title, caption, disclosure, dropped rows, `BRIDGE_MISSING`, agents tab copy, tombstone sentences | unchanged |

New strings (each a label, a button or one short line): `Your tailnet`, `Type an address…`, `Check`, `Check again`,
`Checking <label>…`, `Stop`, `Reached <host>`, `Signed in as <account>`, `Found <path>`, the four source hovers (`Found by its
login shell.`, `Found on the list a command uses there.`, `Found in a usual install folder.`, `The path you typed.`),
`Version <v>`, `Version <v>, not yet measured`, `It did not say its version.`, `Which one should Tortie run?`, `Tortie has not
met this machine before.`, `Fingerprint <fp>`, `Trust it`, `Type its path…`, `Details`, `What this does`, `Name`,
`Add <label>`, `Accepts version <v>`, `What it runs`, `Adding…`, `<label> is ready.`, `Agents on it:`, `Open a folder on it…`,
`Done`, the D11 chip words, `Set up sign-in…`, `Review…`, `What Tortie runs there…`, `Stop trusting this machine`, `Remove…`,
`Close`, and the ⋯ button's label `More for <label>`. None names tmux or ssh. Revised by §Attack: also `Version: read when it
is added` (D8, `not-read`), the chip `Not ready` (D11), and main's timed-out detail `It signed in, and its login files did
not finish within a minute. Nothing was changed on either machine.` (`errors.ts`, D9); `It did not say its version.` is
now a checklist row beside an Add button, not a refusal (D8).

### 8.3 CHANGELOG (integrator), `## Unreleased` → `### Changed`, one line, the commit link added by the follow-up docs commit

`- Adding a machine in Settings then Machines is now pick, check and add: choose it from your tailnet or type its address, and Tortie signs in, finds tmux where that machine's own shell, Homebrew or Linux put it, and asks only to trust a machine it has not met, for a password once to put its key there, or which tmux to use when it finds two; one Add press then confirms the machine and prepares it, accepting a version Tortie has not measured on the same press when it could read the version first. After Tortie puts its key on a machine, the check now signs in with that key instead of asking for the password again. Each machine is now a name, a status, its address, system and version and one button for the next thing, with the rest in a ⋯ menu, and when ssh cannot be started Tortie now says so instead of saying this Mac has no ssh; a tmux somewhere unusual still needs its path typed under Advanced`

And Phase 339's item in `### Fixed` begins `The list of machines on your tailnet, in Settings then Machines, now lists only your
machines;` in place of `Find machines on your tailnet, in Settings then Machines, now lists only your machines;`, the rest
unchanged.

**CLAUDE.md** (integrator): the `conformance:machines` row's Touching column gains `src/main/machines/check-script.ts`,
`row-facts.ts`, `connection-test.ts`'s far command and class split, and `src/renderer/settings/{machine-status,machine-menu}.ts`;
its proof column one sentence for conditions 125 to 139 (Revised by §Attack: Phase 337 holds 122 to 124) and
`ablation:p340`. The probes table gains `probe:p340` (the app
run, §10) and `probe:p340:script` (node only, no Electron). The `conformance:handback` row already names `src/main/menu.ts`;
the integrator runs it.

**Contract baseline** (integrator, obligation 3): `node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt`;
the one line that moves is `[ipc.invoke.channels]` `count=245` → `246` with `machines:openFolder`. No `gmux.*` key, no
`GMUX_*` name, no smoke mode, no schema line. Phase 337, building at the same time, may move the same count; the integrator
reconciles at landing.

**Commit body** carries M1 to M18, the attack's T and F measurements, the five refusing probes by name, the floor (167, or
168 if Phase 337 landed first), and §13.

## 9. Gates and tools (builder C)

### 9.1 `conformance:machines` (`build/conformance-machines.mjs`, data `build/machines-conformance-probe.mts`)

Condition 10's `EXPECTED_CLASSES` gains `client-failed` and `program-choice`. New conditions, each with one ablation in 9.2.
**Revised by §Attack: numbered 125 to 139**, because Phase 337's worktree (`/private/tmp/wt-p337`, uncommitted) already adds
conditions 122, 123 and 124 to this same file; whichever phase lands second keeps its numbers and the integrator merges the
two blocks. The draft's 122 to 133 map to 125 to 136; 137 to 139 are new.

- **125** The check's text: `CHECK_SCRIPT` holds no newline, no `!`, no `'`, no `\\`, no install-folder literal, and holds
  `set -f`, the newline guard and `count=`; it reaches ssh only as `composeCheckCommand`'s `/bin/sh -c <script> tortie-check
  <typed> <probe> <folders>`, which is the last element of `composeTestArgv` for a draft and for a saved row.
- **126** The login read: `LOGIN_PATH_PROBE` is exactly `printf __TORTIE_LOGIN__%s__TORTIE_LOGIN__ "$PATH"`; the script runs it
  as `"${SHELL:-/bin/sh}" -lc "$q" </dev/null 2>/dev/null` into a variable, and no `printf` or `echo` argument names that
  variable.
- **127** Driven: the shipping script under `/bin/sh`, `/bin/dash` and `/bin/ksh` as the inner interpreter (Revised by §Attack:
  the inner one is what runs it; `ksh` added) with a scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null`, and `SHELL` set to a
  scratch login-shell stand-in, over THIRTEEN fixture trees, the attack's F1 to F12 (`scratchpad/p340/adversary/attack2.mjs`):
  one install hit (NOT run), none, two distinct with logging stand-ins, a link to the same file, a login-only folder, a `~/`
  folder (not run), typed present and missing, a fake block printed before, a fake block printed AFTER by an EXIT trap the
  outer `zsh` set, a newline in a login folder's name, a glob on the login PATH, and a path with a space. `parseCheckAnswer`
  over each equals the expected view (the two fake-block trees `malformed`), and every stand-in log the view says was not run
  is empty.
- **128** `connection-test.ts` still holds exactly two `nodePty.spawn(` sites; condition 9's one `BatchMode=no` holds.
- **129** In both runners, `client-missing` is finished only on the no-path branch and `client-failed` only in the spawn
  `catch`, each beside a `machinesLog.warn`; nothing else in `src/` produces either (TypeScript parser, comments blanked); the
  reason composer maps node-pty's `posix_spawnp failed.` to the did-not-say-why words and never to a terminal (D14 revised).
- **130** `machines:add` builds `rowFromAdd(input)` with `acceptedTmuxVersion` only when it passes `MACHINE_VERSION_PATTERN` AND
  `decideRemoteVersionGate` does not answer `measured`, and calls `describeMachine` over that row before `addMachineRow`;
  driven: a check sheet for `measured` equals today's base hash for the same id and fields, one for `3.9z` equals
  `machineExecutionHash` with the version and carries `acceptedTmuxVersion: '3.9z'`, and an add naming `3.6a` as accepted
  writes nothing.
- **131** `APPENDED_KEYS`, `MACHINE_EXECUTION_HASH_ALGORITHM` and `MACHINE_ROW_KEYS` read exactly as at the parent; condition
  42's pinned value holds.
- **132** Refusal 8 in the renderer: across `src/renderer/settings/**`, `startDraftTest`, `startSavedTest`, `prepareMachine`,
  `addMachine`, `installKey`, `findTailnet`, `setUpSignIn`, `sendTestInput` and `answerAsk` are called only from JSX event
  handlers, from `runMachineMenuItem`, or from the store's own chained actions (`openAdd`, `usePeer`/pick, `addMachine`,
  `installKey`, `pickCandidate`), never inside `useEffect`, `useLayoutEffect`, a store subscription, `onStateChanged`,
  `onAgentsChanged`, `onTestEvent`, `refresh` or `reload`; `openAdd` has one caller, the Add a machine button's `onClick`.
- **133** In `machines-store.ts`, `addMachine` calls `b.prepare(` once, after the awaited `b.add(`, inside the same `try`, with
  the id that call returned, and `addMachine` and `installKey` (for a saved row) are the only functions that call
  `b.prepare(` besides `prepareMachine` and `acceptVersion`; `confirmMachine` calls it zero times (Revised by §Attack, D12).
- **134** The ⋯ menu is native: no `role="menu"` or `role="menuitem"` in `src/renderer/settings/**`; the ⋯ click handler calls
  `popupMenu(` with `machineMenuItems(` and nothing else draws its rows, and has no branch that draws anything when
  `popupMenu` is absent; `machineMenuItems`' labels are D20's, in order.
- **135** `machines:openFolder` asks `isMachineConfirmed` before `openFolderOnMachine`, which sends only
  `${OPEN_FOLDER_ON_PREFIX}${id}` and imports nothing that spawns.
- **136** `row-facts.ts` imports no `node:fs`, manifest or store writer, and `removal.ts` calls `forgetRowFacts` beside
  `forgetRemoteMachineHome`.
- **137** (new) The strict reader: `classifyCheckOutput` is what `pty.onExit` calls; `parseCheckAnswer` refuses (as
  `unknown`) a buffer with other than two markers, a `count` that disagrees, a candidate failing the schema's path rule and a
  path pair unequal to the one candidate; and the legacy path pair with no block never answers `ok` through it. Driven over the
  attack's T1 and F8 to F10 bytes and the real ssh capture.
- **138** (new) The test names Tortie's key exactly as condition 48 requires of the carriage: with a key pair present for the
  sheet id, `composeTestArgv` carries exactly one `IdentityFile="<machineKeyPath(id)>"`, quoted, inside the key folder; with
  none, no `IdentityFile`; never `IdentitiesOnly`.
- **139** (new) Ready means answering: `machineStatusOf` (`src/renderer/settings/machine-status.ts`) returns the Ready chip only
  on an arm that requires `ready` AND link `connected` or `polling`; driven over the D11 revised table, a `ready: true` row
  with link `quiet` is Offline.

### 9.2 `ablation:p340` (`build/p340/ablation.mjs`)

One clause each, every arm red on the condition that owns it, the shipping file restored by sha256 in a `finally`: a newline
in the script (125); the folders inlined into the text (125); `$lo` printed (126); the `[ "$n" -eq 1 ]` guard removed, so a
two-candidate fixture runs a stand-in (127); identity by path, so the link fixture yields two (127); `set -f` removed, so the
glob fixture yields two (127); the newline guard removed (127, and 137 over the same bytes); the install-only `vskip` arm
removed, so F1's stand-in log is not empty (127); the no-path branch finishing `client-failed` (129); the spawn `catch`
finishing `client-missing` (129); a branch's warn removed (129); `rowFromAdd` dropping the version (130); the pattern check
removed (130); the measured-version refusal removed (130); a `startDraftTest` inside a `useEffect` (132); `b.prepare(` before
`await b.add(` (133); `confirmMachine` chaining `b.prepare(` (133); a `role="menu"` element (134); the confirmed check
removed from `machines:openFolder` (135); `forgetRowFacts` removed (136); the LAST block read instead of exactly one (137,
the F9 trap fixture); the `count` comparison removed (137); the test argv dropping the `IdentityFile` (138); `IdentitiesOnly`
added to it (138); the Ready arm reading `ready` alone (139). Plus one control arm that changes a comment and must stay
green.

### 9.3 `probe:p340:script` (`build/p340/script-arms.mjs`; node only, no Electron, no ssh)

Runs the SHIPPING `CHECK_SCRIPT` (read through the pinned tsx) under `/bin/sh`, `bash`, `zsh`, `dash`, `ksh`, `csh` and `tcsh`
as the outer shell (M14's shape), with scratch `HOME`, `ZDOTDIR`, `HISTFILE=/dev/null`, a scratch login-shell stand-in, over
the 127 fixtures; prints each view, exit 0 only when all seven agree. Every shell started is ended in a `finally`. It needs
no far side: it says so in its header ("why not a far login shell: the outer shell IS the far one's stand-in, and the script's
own `-lc` is the login shell"). Revised by §Attack: the outer shell only PARSES the quoted line, and the script itself always
runs under the far `/bin/sh`, which is bash on macOS and RHEL, dash on Debian and Ubuntu, and an ash elsewhere; so it also
runs every fixture with the inner interpreter varied over `/bin/sh`, `/bin/dash`, `/bin/ksh`, `/bin/zsh --emulate sh` and
`/bin/bash --posix` (the adversary's matrix: 65 rows, all agreeing, `scratchpad/p340/adversary/attack2.json`). busybox ash
is not on this Mac and is read, not run.

### 9.4 Tools beside the probe

`build/p340/tailscale-peers.mjs` (answers `status --json` with `build/p340/fixtures/tailnet.json`: this Mac, `p340-loop` at
`127.0.0.1.`, an offline Linux peer, an iPhone, one Funnel relay; every other argv exit 2 and a line in its log);
`build/capture-machine-goldens.mjs` gains the two `noGolden` rows builder A writes into the manifest; `package.json`:
`probe:p340`, `probe:p340:script`, `ablation:p340`; `build/verification-checks.mjs` classifies the three (remote, adapter,
pure); `build/assert-electron-teardown.mjs` `HELPER_USER_FLOOR` 166 → 167 (Revised by §Attack: Phase 337's worktree raises
the same constant 166 → 167 for `probe:p337`, so whichever lands second makes it 168, and both edit `package.json` and
`build/verification-checks.mjs` beside each other); the five refusing probes (D22);
`build/{background,known-hosts}-fixtures.mjs` only if a new shape needs a row.

### 9.5 The battery the integrator runs (no Electron) and the verifier repeats once

`npm run typecheck`, `npm test`, `npm run build` (which runs `gate:electron`, `gate:background`, `gate:simulator`,
`gate:knownhosts`, `gate:checks`, `conformance:ios` and `gate:contract` after the baseline is regenerated),
`conformance:machines`, `conformance:farattach`, `conformance:remoteclose`, `conformance:handback` (menu.ts and the menu
action union move), `gate:menu-glyphs`, `gate:menu-accelerators`, `probe:p340:script`, `ablation:p340`,
`node build/p340/probe-p340.mjs --grader-self-test`. Electron gates for the verifier, under the lock: `smoke:t1`,
`smoke:machines`, `probe:p340`. `smoke:remote` is NOT run (the operator's standing finding that it starts his real Claude
Code with his real far home, and this run's hard rule); the loopback app run replaces it for this phase.

## 10. The proof, run rather than read (`probe:p340`, verifiers only, under the lock; the parent `ae38b831` first, then HEAD; one Electron at a time)

`build/p340/probe-p340.mjs`, under `build/harness-socket.mjs --fresh gmux-p340`, launched with `env -i` plus a scratch `HOME`,
no `SSH_AUTH_SOCK`, `SCRATCH_MACHINE_QUIET_SHELL=1` and `SCRATCH_MACHINE_SCRATCH_HOME=1`. It builds its own yard and machine
(D26), writes the ssh wrapper and the Tailscale stand-in wrapper into its scratch directory, preflights both by sha256, and
launches every Electron through `withElectron` with `--remote-debugging-port=0`, `--use-mock-keychain`, a fresh profile per
arm and build unless the arm says otherwise, `GMUX_SSH_BIN` and `GMUX_TAILSCALE_BIN` pointed at the wrappers, and an
`agents.json` renaming the Gemini, Qwen, Antigravity, Grok and Droid binaries (the `probe:p332` practice), read back through
`agents:list`. It opens Settings with `window.gmux.openSettings()` from the main window, picks the Settings target by its
`renderer/settings/index.html` URL, presses controls by dispatching `click` on the real element (one press each, counted),
types by the native value setter plus an `input` event (counted as a typed field), and reads `innerText` of
`section[aria-label="Machines"]` for words (closed `details` excluded by rendering). It never opens the native ⋯ menu (an OS
menu an unattended run cannot dismiss); it reads and runs its rows through `window.__gmuxP340Menu`. Its own far reads go
through `"$SHELL" -lc` over the yard's ssh, or it reads the yard's files directly on this Mac, because the far side IS this
Mac. No `-L gmux` anywhere: the far server is the harness socket under the yard's `TMUX_TMPDIR`. `P340_PARENT_CHECKOUT` is a
built checkout of `ae38b831`; `P340_ARMS` picks arms; `--grader-self-test` grades recorded honest and hostile fixtures and
starts nothing (method rule 9: a person who did not write it reads every clause that can say FAIL before a verifier uses it).

Revised by §Attack: "launched with `env -i`" cannot be done by a `package.json` line that inherits his environment, so the
probe sanitises ITSELF first (D26 revised: scratch `HOME`, `ZDOTDIR`, `HISTFILE=/dev/null`, no `SSH_AUTH_SOCK` or
`TERM_SESSION_ID`, `SCRATCH_MACHINE_NO_OWN_KEYS=1`, exit 2 by name otherwise) before `scratchYard` runs; it runs the
per-second ssh sampler and the `app.log` override check while any Electron is up; and its `finally` ends the far tmux server
on the harness socket under the machine's `TMUX_TMPDIR`, then the yard.

| Arm | Both builds? | Drives | Passes when |
| --- | --- | --- | --- |
| A1 the path | yes | Add a machine → the `p340-loop` peer → whatever each build asks → Ready (tmux only in `/opt/homebrew/bin`) | HEAD: Ready in ≤ 4 presses and 0 typed fields, no Advanced opened; parent's count printed (M17 predicts 10 and 2); HEAD words at Add rest < parent's |
| A2 the login route | yes | a yard folder holding a link to the real tmux on the far LOGIN PATH only (the `/usr/local/bin` shape, M3) | HEAD: Found reads that folder with source login; parent: `no-program` |
| A3 none found | HEAD | Advanced path `<yard>/missing/tmux`, Check | `Nothing that runs is at …`; no Add drawn |
| A4 planted earlier | yes | a logging stand-in first on the login PATH, the real one in the install list | HEAD: `program-choice` with both, the log EMPTY; pressing the real one reaches Ready and the log stays empty; parent: `no-program` (worse than HEAD, recorded) |
| A5 noise | yes | (a) `.zshenv` prints plain lines with no marker (a banner) and `.zprofile` prints lines; (b) `.zshenv` prints a whole fake block and a path marker naming `/evil/tmux` BEFORE; (c) `.zshenv` sets an EXIT trap printing the same AFTER (Revised by §Attack) | (a) HEAD: Found names the real path; (b) and (c) HEAD: `unknown`, no Add, nothing run; parent: (b) the sheet names `/evil/tmux` (the parent's defect, recorded), (c) the parent reads the real path (recorded: HEAD refuses where the parent did not, the stated cost of D15) |
| A6 host keys | yes | first-seen: the ask's fingerprint against `ssh-keygen -lf <yard hostkey>.pub`; Stop, then Trust; changed: a wrong key planted in the profile's own `known-machines` | equal fingerprint; Stop leaves Tortie's file unchanged in size; Trust adds one entry; changed: the alarm, no Trust, no Add; the app's second record file (scratch `HOME`) absent before and after |
| A7 refused key install | HEAD | a wrapper without the identity → `auth-refused` → the key step, a dummy password | the install answers refused; the dummy bytes appear in no file of the profile, the scratch `HOME` or `app.log`; the yard's authorized file unchanged (the yard's sshd keeps `PasswordAuthentication no`, `KbdInteractiveAuthentication no` and `UsePAM no`, so no password is ever checked against his account) |
| A7b the key signs in (Revised by §Attack, D27) | yes | after A7 the key pair exists in the profile (`ensureMachineKey` runs before the connection); the probe appends that `.pub` line to the yard's authorized file itself, standing in for an install that succeeded, then presses Check again through the same identity-less wrapper | HEAD: `ok`, signed in with Tortie's key (the transcript's command line names it once, quoted); parent: `auth-refused` again (the parent's test names no key, recorded); the probe restores the authorized file by sha256 |
| A8 untested version | yes | Advanced path at a logging stand-in that prints `tmux 3.9z` for `-V` and `exec`s the real tmux for every other argument (Revised by §Attack, so Prepare can reach Ready) | HEAD: the sub-line, one Add press, the row's `acceptedTmuxVersion` 3.9z, its confirmed lines holding the Accepts line, Prepare ran (the log) and answered `prepared`; parent's presses to the same accepted state printed |
| A9 a changed machine | HEAD | after Ready, the probe rewrites the row's port in `machines.json` (the wrapper's first `-p` still reaches the yard, M15) | chip Changed, the review panel opens by itself, next step Review…, both lists; Confirm leaves the row `Not ready` with nothing started (Revised by §Attack, D12); Prepare this machine then reaches Ready |
| A10 an agent between check and press | HEAD | after the check, a row with the draft's id written into `machines.json`; the probe WAITS until `machines:rows` lists it before pressing (Revised by §Attack: `addMachineRow` writes from main's memory, `store.ts:335-338`, so a press inside the watcher's 300 ms window writes over the edit; that race exists at the parent and is named, not this phase's) | the Add press refuses with its sentence, no row added, no confirmation recorded, no Prepare (the far harness server not started) |
| A11 confirmed at the parent | parent then HEAD, ONE profile | A1 at the parent, relaunch HEAD | the row confirmed, hash byte-equal, chip Ready after the launch sign-in |
| A12 the row | yes | read the row at rest; parent shut and open; HEAD each panel through the menu hook | HEAD at rest ≤ 16 words and ≤ the parent's shut row; the menu's rows per state equal D20 |
| A13 open a folder | HEAD | Open a folder on it… | the main window's sheet is open with `p340-loop` chosen; Escape closes it |
| A14 a machine that stops answering (Revised by §Attack, D11) | HEAD | after Ready, the probe stops the yard's sshd (`machine.stop()`) and waits up to 120 s for `machines:state` to read the link `quiet` | the chip never reads Ready once the link is `quiet` (it reads Offline), while `ready` on the row view is still true; the probe restarts the sshd afterwards |
| A15 two picks (Revised by §Attack, D28) | HEAD | the tailnet fixture holds a second loop peer `p340-loop2` at the same address under another name; pick `p340-loop`, then at once `p340-loop2` | the live check and the Add button name `p340-loop2`, and the draft id is `p340-loop2` |
| RUN | — | — | every pid it started ended; no Electron, sshd, agent or stand-in left (CLAUDE.md's census command); no tmux server answers on the harness socket under the machine's `TMUX_TMPDIR`; the ssh sampler saw no `/usr/bin/ssh` without `-F none` first and `app.log` holds no override warning; his history stats unchanged |

The `client-failed` split cannot be driven in the app without breaking node-pty, so its proof is §4.7's test and condition
129. Cost: not yet measured; the verifier records it.

## 11. Builders, disjoint files

- **builder-a-main** (writes §4.1 FIRST): `src/shared/ipc/machines/{connection,rows}.ts`, `src/shared/ipc/{projects,app}.ts`
  (the action family only), `src/preload/machines.ts`, `src/main/machines/{check-script,row-facts}.ts` (new),
  `src/main/machines/{connection-test,errors,ipc,prepare,remote-image,removal,key-install}.ts`, `src/main/machines/index.ts`
  (Revised by §Attack: it re-exports `remoteProbeCommand` at `:272`, which this phase removes, and must export
  `classifyCheckOutput`), `src/main/menu.ts` (the one exported helper), `src/main/machines/__tests__/**` (new `p340-` files,
  every existing test these changes break, and `golden/manifest.json`), `src/shared/__tests__/p125-machines-surface.test.ts`.
- **builder-b-settings**: `src/renderer/settings/{AddMachine,MachineRow,ConnectionTestView,KeyInstall,MachinesSection}.tsx`,
  `src/renderer/settings/{machines-copy,machines-store}.ts`, `src/renderer/settings/{machine-status,machine-menu}.ts` (new),
  `src/renderer/settings/{machines,key-install}.css`, `src/renderer/settings/__tests__/**` that §5.5 names,
  `src/renderer/app/__tests__/machine-vocabulary.test.ts`. Not `src/renderer/state/machines-slice.ts` (no owner): the Ready
  arm writes the two answering links out, and condition 139 reads them.
- **builder-c-proof**: `build/conformance-machines.mjs`, `build/machines-conformance-probe.mts`, `build/p340/**` except this
  file, `build/capture-machine-goldens.mjs`, `build/probe-machines.mjs`, `build/probe-p130-prose.mjs`,
  `build/probe-p130-spacing.mjs`, `build/probe-p131-row.mjs`, `build/probe-p235-nits.mjs`, `build/assert-electron-teardown.mjs`,
  `build/verification-checks.mjs`, `package.json`, `build/{background,known-hosts}-fixtures.mjs` only if needed.
- **builder-d-handoff**: `src/renderer/app/{menu-actions.ts,RemoteProjectModal.tsx}`, `src/renderer/state/projects-slice.ts`,
  and its new test under `src/renderer/app/__tests__/` or `src/renderer/state/__tests__/`.
- **Integrator**: `CHANGELOG.md`, `CLAUDE.md`, `docs/audits/contract-baseline.txt`; reconciles the seams (B codes against A's
  §4.1 types and C's conditions read A's and B's files; A's manifest rows and C's capture rows must agree; D's action family
  is A's type); runs §9.5's battery that launches no Electron; writes §As built.

No file is owned by two builders (checked by the adversary: the four lists and the integrator's are disjoint). Revised by
§Attack, the files Phase 337's uncommitted worktree ALSO edits, none of them on 337's keep-out list but each a textual
merge at landing: `build/conformance-machines.mjs` and `build/machines-conformance-probe.mts` (337's conditions 122 to 124,
hence 125 onwards here), `build/assert-electron-teardown.mjs` (both raise `HELPER_USER_FLOOR` from 166), `package.json`,
`build/verification-checks.mjs`, `CHANGELOG.md` and `CLAUDE.md`. 337 also edits `build/scratch-machine.mjs`, which this phase
imports and does not edit.

Every builder and the integrator: no Electron; no `-L gmux`; no ssh to any host but the loopback machine; every shell a test
starts with a scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null` and no `TERM_SESSION_ID`; his history stats before and after
any command that starts a shell; every process started ended by pid in a `finally`; no commit, stage or stash; nothing of
`src/main/screen/**`, `src/main/pocket/**`, `ios/**`, `scroll-shapes.ts`, `scroll-order.ts` or the control client (Phase 337);
`npm run -s typecheck` and its own vitest files, exits and counts reported. Builder C also runs `conformance:machines`,
`ablation:p340 --list`, `probe:p340:script` and `probe-p340.mjs --grader-self-test`.

## 12. The verifier's brief (Tier 3)

At least two independent methods, one an attack, each named in the verdict:
1. **Attack** on the loopback machine with a corpus of its own beyond §10: a plant that is a symlink to a script, a plant
   with the execute bit and no read bit, a folder on the login PATH that is unreadable, a `$SHELL` that is csh, a login file
   that sleeps 70 s (the deadline), a host whose name starts with `-` typed into Type an address…, an address with a port and
   a peer pick in the same session, a candidate path holding a space, a second pick while a check runs, and a typed path with
   a single quote (refused before anything runs). Revised by §Attack, also: a login file that prints `__TORTIE_CHECK__`
   AFTER the script through an EXIT trap; a login folder whose name holds a newline; a login PATH entry holding `*`; a
   login file that leaves a child holding its output; a lone program in `~/bin` that his login shell does not search (its
   log must stay empty until the Add press); `GMUX_SSH_BIN` deleted while the app runs (the sampler and the override check
   must fail the run, not pass it); and an unmeasured version with no `-V` read before Add (Phase 83's sheet on the Ready
   step).
2. **Re-derive**: its own walker in another language over its own fixture trees (which file each order finds, distinct by
   `stat`), compared row for row with the shipping script's views; and the Add sheet's hash, with and without an accepted
   version, recomputed by its own sha256 over its own canonical text.
3. **The parent measured** in A1, A2, A4, A5, A6, A7b, A8, A11 and A12, reported as a table of scenario, today, HEAD; any
   HEAD row worse than today is named (A5(c) is worse by design and is named as the stated cost of D15).
4. **Real data is owed to him**: his Mac Pro (tmux at `/usr/local/bin/tmux`) is the first step of his own acceptance, because
   no agent may ssh to it.
Report once, at the end, the Electrons, tmux servers, sshd, agents and stand-ins left, and his history stats.

## 13. What is NOT in this phase

- No change to saving on a machine (Phase 336), its scrollback (320.1) or the phone; nothing in Phase 337's files.
- No release.
- No Linux far side was measured: the Linux and Nix install folders, GNU `stat`, bash as a login shell that reads
  `.bashrc` over ssh, and Linuxbrew are read, not run.
- No agent scan before the Add press (D19); no check of anything but the program and its version.
- No machines.json key; no hash algorithm change; no new hashed field; no edit of a row's fields in place (Remove and add
  again, as today).
- No change to Prepare's own reads (the server version first, then `-V`; the login PATH capture), the control plane, the
  sign-in retry or the launch sign-in. A machine whose running server is an older version than its `tmux -V` still meets
  Prepare's refusal and its acceptance sheet after Add, under Review….
- No check started by a file, a timer, a wake, opening Settings or a keystroke.
- No change to how Tortie's key is made or kept; the one change to where it is NAMED is the visible check (D27), which
  takes the carriage's own rule. A key with a passphrase that the check could answer and Prepare (BatchMode) cannot is still
  `Needs a key` after Add, as Prepare refuses it today.
- The root cause of his `posix_spawnp failed` on the Mac Pro re-add is not diagnosed (it was not reproduced), and Tortie
  cannot name it from the message, which carries no errno on macOS (D14 revised); the split stops it being called a
  missing ssh and logs the raw message.
- Revised by §Attack, stated and not fixed: Prepare's own login PATH capture (`remote-path.ts:84-97`) still takes the FIRST
  marker pair, so a login file that prints `__TORTIE_PATH__…__TORTIE_PATH__` before it still sets the PATH a far session
  gets, as it can today by setting `PATH` itself; a login file that prints Tortie's check marker refuses the check (D15);
  a login file whose child holds its output delays the check up to the 60 s deadline (D5); a draft check offers the key
  Tortie made for that id to the address typed (D27); and `addMachineRow` writing from memory inside the watcher's 300 ms
  window (A10) is the parent's and is not changed.
- `with-scratch-machine.mjs`'s `isolated()` still reads `~/.ssh/config` for every harness that uses it (an owed finding).
- No DOM menu; no new application or tray menu row.
- `smoke:remote` is not run.

## 14. What the entry and the earlier rulings got wrong, or left open

Revised by §Attack, added first: Phase 84 item 7 ("Name the installed key on every ssh command") was built in the carriage
and missed the visible test, so the test Phase 79.1 restarts after a key install has never offered that key (D27). And
`ready` on a row view (Phase 84 item 8) answers whether a context is registered, not whether the machine answers now (D11).

1. Phase 68's record says "a connection to this same Mac runs a login shell whose PATH does not carry Homebrew's directory".
   It is not a login shell (M1), and its PATH carries neither Homebrew folder.
2. The design asked for "the agents there" in the check; they appear on the ready line (D19).
3. The design's ⋯ menu gains Prepare this machine so seven shipping sentences stay true (D20).
4. The entry's "tmux in /usr/local/bin" on the loopback machine is not staged (installing there installs for all his shells);
   the login route is staged with a yard folder and the folder's membership is measured by a witness (M3).
5. Today's probe takes the first marker pair, so a login file can choose the program (M6'); the check reads the last block.
6. Today's flow is 10 presses on his Mac Pro shape, not "up to ten steps" as an estimate (M17).
7. Phase 339's unreleased CHANGELOG item names a button this phase removes (D25).
8. Phase 79 ("opening runs nothing"), 130 (the key facts on the face) and 131 (the consent facts on the face of the row) are
   superseded on his design; Phase 83's acceptance is folded into the Add press for a new machine only.

## 15. Attack first

- The planted-earlier shape (A4, and the verifier's variants): nothing may run before he picks.
- A login file printing markers or a whole block (A5): Revised by §Attack, the check must refuse any buffer holding other
  than one block, before or after the script (D15).
- The one-line script under csh and tcsh as the far shell (M14) and under dash (Debian's `/bin/sh`).
- The Add press after a machines.json edit (A10) and after a version change between check and press (Phase 83's mismatch
  refusal must still fire at Prepare).
- Refusal 8 by reading: no starting action reachable from an effect or a subscription (condition 132), and `smoke:machines`.
- The row's chip against main's own state when the two disagree for a moment (a press in flight, a launch sign-in landing),
  and against a machine that stopped answering after it was prepared (A14, condition 139).

## 16. For him

**Q1 (does not block the build).** When a machine has two installs of tmux, for example `/usr/local/bin/tmux` from long ago
and `/opt/homebrew/bin/tmux` today, Tortie asks which one once, at Add, even when that machine's login shell would pick one
(D4). That is what makes a program planted earlier on the PATH visible before anything runs. Recommended: keep it. The
alternative is to take the login shell's first answer without asking and only ask when the login shell found nothing; it
saves one press on such machines and loses the plant's visibility.

---

## §Spec run (the spec writer, 2026-10-05)

Every command, its exit code and what it read. `$S` is `scratchpad/p340/spec/`. His history before and after each:
`~/.zsh_history 733353 1791256765`, `~/.bash_history 23166 1790702242`, never moved.

| Command | Exit | Read |
| --- | --- | --- |
| `env -i … node $S/measure-tmux.mjs` (scratch yard and machine, 16 ssh reads) | 0 | M1 to M9; pids 15771 and 15768 ended |
| `env -i … node $S/shells.mjs` (the composed check under seven shells, locally) | 0 | M14 |
| `env -i … node $S/measure2.mjs` (fake install lists, logging stand-ins, a fake block) | 0 | M6', M10 to M13; pids 47792 and 47789 ended |
| `/usr/bin/ssh -G -F none -p 1111 -p 2222 127.0.0.1` and the `IdentitiesOnly` pair | 0 | M15 |
| `node_modules/.bin/tsx $S/words-today.mts` and `$S/copy-dump.mts` | 0 | M16, §8.2's counts |
| `ps -Ao pid,ppid,comm,args \| grep p340`; `ls /tmp \| grep p340` | 0 | nothing of these runs left |

No Electron, no Simulator, no lock taken, no `-L gmux`, no real host, nothing installed, no product file edited.

---

## §Attack (the adversary, 2026-10-06)

Everything below was run, not read, unless it says "read". `$A` is
`/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p340/adversary/`. Every script ran
under `env -i` with a scratch `HOME` (and a scratch `ZDOTDIR` and `HISTFILE=/dev/null` for every shell it started), no
`TERM_SESSION_ID` and no `SSH_AUTH_SOCK`; attacks 1 and 2 started no ssh at all and ran the check the way sshd runs a
command, `$SHELL -c <command line>`; attack 3 used ONLY the loopback machine (`scratchYard` + `scratchMachine`, quiet shell,
scratch home) with every ssh carrying `-F none`, `IdentitiesOnly=yes` and the yard's key, so his `~/.ssh` was never opened and
`ownPublicKeys()` read the scratch home's (absent) `.ssh` and asked no agent of his. No Electron, no Simulator, no lock taken
(none needed), no `-L gmux`, no tmux server started, nothing installed, no product file edited, nothing committed, staged or
stashed. His history, `stat -f '%z %m'`, before and after each of the three runs: `~/.zsh_history 733353 1791256765`,
`~/.bash_history 23166 1790702242`, never moved.

### Commands

| Command | Exit | Read |
| --- | --- | --- |
| `env -i … node $A/attack1.mjs` (the spec writer's DRAFT check, 11 shapes, outer `zsh` and `bash`) | 0 | T1 to T8, `$A/attack1.json` |
| `env -i … node $A/attack2.mjs` (the REVISED check `$A/check-script-r.mjs` and the strict reader, 13 fixtures × 5 inner interpreters + 3 fixtures × 5 outer shells) | 0 | 80 rows, `$A/attack2.json`; script 1,379 bytes, no newline, `!`, `'` or `\\` |
| `env -i … SCRATCH_MACHINE_QUIET_SHELL=1 SCRATCH_MACHINE_SCRATCH_HOME=1 node $A/capture.mjs` (real `/usr/bin/ssh` in a pty through `$A/ptyssh.py`, Tortie's own test options, first-seen answered `no`, then `yes`, then known, then a typed path) | 0 | `$A/cap/capture.json`; pids 1565 and 1562 (the yard's agent and sshd) ended in the `finally` |
| `ps -Ao pid,ppid,rss,comm,args \| grep …`; `ls /tmp \| grep -c p340a` | 0 | nothing of these runs left (one `sshd` listed belongs to another session's `p341/verifier` run and was not touched); 0 |

### What landed, and the change it made

| # | Attack | Measured or read | Change |
| --- | --- | --- | --- |
| T1 | A login file prints a fake block AFTER the script | the outer `zsh` ran a `.zshenv` EXIT trap after `/bin/sh` exited: 4 markers, and the draft's LAST-block reader named `/evil/tmux` with version 3.6a, 5 of 5 interpreters (F9); `bash -c` exec'd `/bin/sh` and ran no trap (T1b) | D15: exactly one block, else `unknown`; condition 137 |
| T2 | A login folder whose name holds a newline | the draft read the directory `$S/t2/x` as the program and `version=tmux 3.6a/tmux__TORTIE_PATH__`; the plant at the real path ran `-V` | D2: newline guard and `count=`; D15: path rule, count, equality; F10 now `no-program`, 0 run, 5 of 5 |
| T3 | A login PATH entry holding a glob | the draft expanded `g*` into two programs in folders the login shell never searches (`command -v tmux` there: `none`) | D2: `set -f`; F11 now `no-program`, 5 of 5 |
| T6 | The lone program sits where his shell does not look | `~/bin/tmux`, login shell answers `none`, the draft ran it with `-V` | D2, D5: `-V` only for typed, login or path; `vskip=install`; F1 and F6 ran 0, 5 of 5; the real capture read `vskip=install` over ssh |
| T4, T5 | Slow login file; a child holding its output; a slow `-V` | +3,033 ms, +4,036 ms (redirected child: +30 ms), +3,029 ms | D5 restated (Tortie's processes only, bounded by 60 s; no machine that works today stops), D9 timed-out detail |
| R1 | A Ready chip that lies | read: `ready` is `machineCanHoldSession` (`remote-sessions.ts:1535-1542`), a registered context with a captured PATH (`ready-context.ts:35-61`); only a re-registration resets it (`context.ts:510-516`, `:628-636`); nothing unregisters on `quiet` | D11 table replaced; condition 139; arm A14 |
| R2 | The key the button installs is never tried by the re-test | read: `composeTestArgv` (`connection-test.ts:229-252`) names no identity; Phase 84 item 7 named it only in `ssh.ts:281-288`; condition 48 covers only the carriage | D27; condition 138; arm A7b (the parent reads `auth-refused` again) |
| R3 | Two picks, the second named after the first | read: `usePeer` keeps a non-empty label (`machines-store.ts:631-641`) and Name is hidden until step 3 | D28; arm A15 |
| R4 | Confirm on Review… chained a Prepare | read: `probe:p167` (`:944-948`), `p234` (`:464-474`), `p2422v` (`:245-252`) and `p2422-image` press `confirm`, wait 1.6 to 1.8 s per press and end that launch soon after; a far tmux server daemonises out of sshd's tree | D12: Confirm confirms only; condition 133 |
| R5 | `ask` events in a store written for two kinds | read: `machines-store.ts:538-551` writes any non-`output` event as the outcome | §5.3: three-way branch; a test |
| R6 | "No Add for unreadable" | read: Prepare asks the running server's version first (`prepare.ts:177-188`), so a machine whose old server answers a measured version works today | D8: Add for every `ok` |
| R7 | The answer field disappears | read: today it is always on screen while running (`ConnectionTestView.tsx:144-182`); capture: ssh's first chunk is a lone `\r` | D9: Details keeps it; `\r` ignored; prompt opens Details; `type="password"` |
| R8 | A spoofed first-seen question after sign-in | read: the far side's output follows the question in every capture | D9: host-key ask only before the first marker, anchored on the captured bytes |
| R9 | A measured version sent as an acceptance | read: `describeMachine` drops the line, the hash keeps it (`confirm.ts:448-466`) | D7: refused, sheet carries the version; condition 130 |
| R10 | "posix_spawnp failed" read as a terminal failure | read: `pty.cc:687-780`, seven failure points, one string, no errno | D14: did-not-say-why; condition 129 |
| R11 | Condition numbers and the helper floor | read: `/private/tmp/wt-p337` adds conditions 122 to 124 and raises `HELPER_USER_FLOOR` 166 → 167 | §9.1 renumbered 125 to 139; §9.4 and §11 name the merges |
| R12 | A builder file missing | read: `src/main/machines/index.ts:272` re-exports `remoteProbeCommand` | §11: builder A owns `index.ts` |
| R13 | The probe reads his keys or reaches his own sshd | read: `scratchYard` → `ownPublicKeys()` reads `$HOME/.ssh/*.pub` and asks `ssh-add -L` (`scratch-machine.mjs:103-128`); `resolveSsh` falls back to `/usr/bin/ssh` on a bad override (`carriage.ts:109-121`); `machine.stop()` kills only sshd's descendants (`:500-511`) | D26: self-sanitise, sampler and log check, far server ended in the `finally` |
| R14 | Facts land after the push | read: a link change can fire inside `prepareMachine` before the wrapper records | D24: row-facts re-broadcasts the existing state event |

### What did not land, and why (each still pinned)

- **Something starts on another machine without his deliberate press.** `openAdd` has one caller, the button
  (`MachinesSection.tsx:200-212`); the check starts from a pick, Check or Return, or a candidate; Trust it, Send and the key
  install are presses; nothing starts on a file change, timer, wake or Settings opening (condition 132; `smoke:machines`).
  The one start that is not a press, the launch sign-in and its retry, is a confirmed row's standing act and is unchanged.
  One class is NEW and is kept on the entry's word ("its login shell first"): his login files (`.zprofile`, `.bash_profile`,
  `.profile`, `.zlogin`) now run at the pick, before Add, where until now they first ran at Prepare after the agreement; a
  login file that starts a program (an agent, an updater, a tmux server on his own socket) does so at the pick, as it does
  at any sign in of his.
- **An agent editing machines.json between the check and the press gets its fields sealed.** No path seals them: a draft
  never reads the file (`ipc.ts:62-66`); `machines:add` hashes `rowFromAdd(input)` and records the agreement over those
  fields (`ipc.ts:663-685`, `:511-529`), never over the file's; another row the agent rewrote is written back unconfirmed and
  reads Changed; the chained Prepare passes the gate, which re-reads the record and compares the row (`context.ts:452`,
  `sign-in-retry.ts` header). The remaining race (an add inside the watcher's 300 ms window writes over the edit from
  memory) drops the agent's edit rather than sealing it, and is the parent's.
- **A first-seen or changed host key trusted without him.** Measured: after `no`, Tortie's record file absent and the
  scratch home's file absent; after `yes`, Tortie's file 99 bytes and the home's still absent; ssh's question is answered
  only by Trust it. A changed key is refused by ssh with no question under `StrictHostKeyChecking=ask` (read:
  `golden/host-key-changed.txt`); the key install keeps `StrictHostKeyChecking=yes` (`key-install.ts:191`).
- **The password kept anywhere.** `KeyInstall` keeps it in component state, `type="password"`, cleared on press
  (`KeyInstall.tsx:133`, `:178-182`); the store's contract keeps it an argument (`machines-store.ts:275-280`); the new ask
  field takes the same rule (D9).
- **A confirmed row whose hash moves.** No hashed field, key or algorithm moves; D27 changes the test's argv, which no hash
  covers; condition 131 pins the keys and condition 42's value.
- **Something he can do today hidden beyond reach.** Withdraw version was the same `forget` call as Withdraw
  (`MachineRow.tsx:519-528`); Test on an unconfirmed row is refused by main today (`testFieldsOf`, `ipc.ts:1670-1676`);
  Rescan is on the Agents tab; the transcript and today's answer field are in Details (R7); the row id, key line,
  fingerprint and Prepare's settings table are under What Tortie runs there…; Prepare is a next step and a menu row.
- **A DOM menu.** None in the design; no fallback when the bridge lacks `popupMenu` (D20); condition 134.
- **Two builders owning a file; Phase 337's files.** None (§11). The shared BUILD files are merges, named.

---

## §As built (the integrator, 2026-10-06)

Four builders wrote disjoint halves in `/private/tmp/wt-p340` over `ae38b831`; the integrator reconciled the seams, wrote
the CHANGELOG item, the CLAUDE.md rows and the contract baseline, ran the battery that starts no Electron, and wrote this
section. Nothing is committed, staged or stashed, and `git diff ae38b831` is this phase's delta alone (53 tracked files
changed, 6,584 insertions and 2,980 deletions, and 27 new files including this one). Where a decision below departs from
the sections above, this section is what the tree holds and says why. The folded-in ssh item ("make it all one phase
please") is in this one phase, as D14.

### What each builder built, and where it departs from the spec

**Builder A, main (§4).** The §4.1 contract first (`MachineCheckView`, `MachineTestAsk`, the `ask` event, the two classes,
the four row facts, the sheet's `acceptedTmuxVersion` and `versionHonesty`, `MachineAddInput.acceptedTmuxVersion`,
`machines:openFolder`, the `open-folder-on:` family and its prefix), then `check-script.ts` (new; `CHECK_SCRIPT` byte-equal
to the adversary's `check-script-r.mjs`, 1,379 bytes, one line, no `!`, `'` or backslash pair; `parseCheckAnswer` exactly
one block), `row-facts.ts` (new; memory only, one listener set), `classifyCheckOutput` on `pty.onExit` with
`classifyProbeOutput` byte for byte, the sheet for every `ok` binding a version only for `unmeasured` on a draft check,
the two asks (host key once and only before the first marker; a prompt after 700 ms of quiet, a lone `\r` ignored), the
signed-in timed-out detail, `composeTestArgv`'s third argument (D27; `ipc.ts` passes it only when
`machineKeyPairPresent(sheetId)`), `machines:add`'s pattern and measured-version refusals, `client-missing` on the no-path
branch alone and `client-failed` in the spawn `catch` alone in BOTH runners, each with a warning, `clientFailedReason`
reading only an error's `code`, `prepareMachine` as a wrapper over `prepareMachineOnce`, `noteRowOs` where
`machine-facts` is parsed, `forgetRowFacts` in Remove, `machines:openFolder` asking `isMachineConfirmed` before
`openFolderOnMachine` in `menu.ts`, and the D21 comments. Departures: none of substance. `remoteProbeCommand` and its
re-export are gone; `ok.txt` and `no-program.txt` carry a `retiredProbe` note in the golden manifest; the gate's
quiet-window arm stayed green on A's own first ablation run, so A added a test pinning 700 ms (46 of 48 of A's own arms
then red, control green).

**Builder B, Settings (§5).** `AddMachine.tsx`, `MachineRow.tsx`, `ConnectionTestView.tsx`, `KeyInstall.tsx`,
`MachinesSection.tsx`, `machines-copy.ts`, `machines-store.ts`, `machine-status.ts` (new), `machine-menu.ts` (new), the two
stylesheets, and the tests §5.5 names. Departures, each B's own decision:
1. **The ⋯ menu's "confirmed" reads `row.state === 'confirmed'` alone**, not `usable`: `rows.ts` makes `usable` true exactly
   when the state is confirmed, and a row composed without `usable` would otherwise hand the native menu an `enabled` of
   `undefined`, which reads as enabled. A test requires every row's `enabled` to be a real boolean.
2. **Version rows that do not block Add wear a quiet info mark**, not a failure mark (`not yet measured`, `Version: read
   when it is added`, `It did not say its version.`), because D8 as revised draws Add beside them. Only the changed host
   key wears the alarm token.
3. While a Prepare runs its panel reads Preparing; the test and prepare panels each have Close; the chip reads Connecting
   while an accepted version's Prepare runs; starting a saved check clears an old key-install answer for that row.
4. `TAILSCALE_TITLE` (unused) is removed; `Your tailnet` replaces it as §8.2 says.
Words read from the markup by B: Add at rest with Tailscale installed, 12 besides the peer rows (11 while the list loads);
a Ready row named `studio`, 10.

**Builder C, the proof (§9).** Condition 10's two classes and a check that their headlines differ; conditions 125 to 139
at the foot of `build/conformance-machines.mjs` (numbered from 125 because Phase 337 holds 122 to 124), the `phase340`
readings in `build/machines-conformance-probe.mts`, `build/p340/far-check.mts` and `script-arms.mjs` (13 fixtures, F7
split in two), `ablation.mjs` (30 arms and a control), `probe-p340.mjs` (A1 to A15 and RUN, self-sanitising, wrappers
checked by sha256, a per-second sampler, the `app.log` override check, the far server ended in its `finally`),
`tailscale-peers.mjs` and its fixtures, the five refusing probes, `HELPER_USER_FLOOR` 166 to 167, the three scripts and
their classification. Departures:
1. **A15's second peer, `p340-loop2`, is at `localhost.`, not `127.0.0.1.`**: the peer list keys rows by host, so two peers
   on one address collide, and a real tailnet never gives two peers one DNS name.
2. The hostile fake block in F8, F9 and the recorded buffers carries `user`, `os` and `login`, so a "read the last block"
   ablation cannot stay green by reading the plant as malformed for some other reason (a control shows the plant alone
   parses as `ok`).
3. Every ssh wrapper names an `IdentityFile`, A7's included (a file that does not exist), so ssh never falls back to the
   account record's default identity files.
4. The sampler counts an ssh as this run's only when it descends from the launch or its command line names the run's
   directory, so his own concurrent ssh sessions cannot fail the run.
5. `build/electron-run.mjs` is imported statically (gate:electron counts a helper user by its static import); it reads no
   environment at load, and every other repository module loads after the sanitising.
The app probe's DOM half has never run: its selectors were read from B's source, and a drifted one reads UNREADABLE
(exit 2), never a pass.

**Builder D, the hand-off (§6).** `openFolderOnMachineAction` and the `open-folder-on:` branch straight after
`open-recent-on:` in `menu-actions.ts`; `remoteProjectMachineId` and `setRemoteProjectOpen(open, machineId?)` in
`projects-slice.ts`, writing both in one `set` and keeping the id only on an opening that names one; `startingMachineId`
in `RemoteProjectModal.tsx`, read once when the sheet opens. Departures, each stricter than the spec: the action returns
silently under the session manager (as `open-remote-project` does), while this sheet is already open (re-aiming it would
throw away a typed folder), and under a boot block (no sheet is drawn there, so setting the flag would leave an invisible
layer holding `modalLayerOpen()`); other layers are not refused, exactly as File then Open Folder on a Machine… today. A
named machine not in the usable list is not chosen; the sheet starts on its first machine.

### What the integrator changed

1. **CHANGELOG.md.** §8.3's item under `### Changed`, written as TWO sentences because the operator's style rule at the
   top of the file says an item is one or two: the draft's middle sentence ("After Tortie puts its key on a machine, the
   check now signs in with that key…") is folded into the first, in the same words. No commit link: the follow-up docs
   commit adds it. Phase 339's item now opens `The list of machines on your tailnet, in Settings then Machines, now lists
   only your machines;`, the rest unchanged.
2. **CLAUDE.md.** The `conformance:machines` row: Touching gains the check's files, `openFolderOnMachine`, every file
   under `src/renderer/settings/` (conditions 132 and 134 read the whole folder) and `build/p340/{far-check.mts,
   script-arms.mjs}`; the cost is the measured 45 s with what it now starts (ksh and a FAKE ssh under node-pty, never a
   real one); the proof gains one sentence for 125 to 139 and `ablation:p340` (13 to 20 minutes). The probes table gains `probe:p340` and
   `probe:p340:script`.
3. **`docs/audits/contract-baseline.txt`** regenerated (obligation 3). Exactly two lines moved, as §8.3 predicted:
   `[ipc.invoke.channels] count=245` → `count=246`, and the new line `machines:openFolder`. Nothing else.
4. **`build/capture-machine-goldens.mjs`**: C's new doc comment had been inserted between `/** Record one capture, and
   write its file. */` and `function capture`, leaving that comment over the constant; it is moved back above its
   function. No behaviour moved.
5. **`build/verification-checks.mjs`**: the comment over `pure('conformance:machines')` now says what Phase 340 makes the
   gate start (ksh inside zsh over scratch trees and a fake ssh under node-pty at a `.invalid` host), so the `pure`
   classification keeps its stated reason. Comment only; gate:checks green after it.

### The seams, checked

- A's manifest rows and C's capture script agree byte for byte (`retiredProbe` on `ok` and `no-program`, the two
  `noGolden` reasons). A re-run of the capture script would write the `noGolden` rows in a different ORDER (its own rows,
  then the carried `key-installed`); the manifest's order is not asserted anywhere, and this was already so before this
  phase.
- B's `addMachine` echoes `sheet.acceptedTmuxVersion` (A's field, set only for an unmeasured version on a draft) into
  `MachineAddInput.acceptedTmuxVersion` and never derives it from the check view; main's `rowFromAdd` refuses a value the
  pattern rejects or one `decideRemoteVersionGate` answers `measured`, before anything is written; `b.prepare(` runs once,
  after the awaited `b.add(`, with the returned id; `confirmMachine` calls it zero times.
- B's `onTestEvent` branches on `output`, `ask` and `end`; an `ask` never becomes an outcome.
- D's family is A's type (`OpenFolderOnMachineActionId` in `MenuActionWithFind`); main's `sendMenuAction` and the preload
  pass action strings through unfiltered, and the renderer branch reads `OPEN_FOLDER_ON_PREFIX`.
- The typecheck errors A and D saw mid-build (`machines-copy.ts`'s remedy table lacking the two classes,
  `machines-store.ts` reading `outcome` off the three-kind union) were B's, and B's final tree fixed both: typecheck is
  green.
- The four old probes D22 names press `data-machines-action="toggle-lines"` (with `aria-expanded`) and `confirm`; both are
  on the new row, the first only for a row that is not confirmed.
- Phase 337's keep-out list: nothing under `src/main/screen/`, `src/main/pocket/`, `ios/`, `scroll-shapes.ts`,
  `scroll-order.ts` or the control client is in this delta.

### The battery, run here (no Electron; every command under a scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, no `TERM_SESSION_ID` or `SSH_AUTH_SOCK`)

| Command | Exit | Read |
| --- | --- | --- |
| `npm run -s typecheck` (first and last) | 0, 0 | `tsc -b`, the node project, import boundaries (1,408 files, 0 violations), no runtime cycles (1,405 files, 0), shared types |
| `npm test`, first run, load average near 900 from other sessions (a Simulator, a VM, a Go test run, none ours) | 1 | 1,084 files and 19,833 tests passed, 14 skipped, 1 failed: `src/main/symbols/__tests__/store.test.ts`'s 100k-symbol query budget, 610 ms, a timing budget this phase does not touch |
| that one file alone | 0 | 15 of 15 |
| `npm test`, again at the end, load near 26 | 0 | 1,085 files passed, 2 skipped; 19,834 tests passed, 14 skipped; 62 s |
| `node build/contract-inventory.mjs --check`, before | 1 | the expected drift |
| `node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt` | 0 | `count=245` → `246` and `+machines:openFolder`, nothing else |
| `npm run build` | 0 | 45 s; gate:electron 167 helper users against a floor of 167; gate:background 534 files, 3 long-lived starts each ended in a `finally`; gate:simulator PASS; gate:knownhosts 562 files; tab floor; menu glyphs 60; menu accelerators 36 sites; gate:checks 260 scripts classified; conformance:ios PASS, 31 rules; conformance:harnessprobes PASS, 6 clauses and 16 ablations; gate:contract OK byte for byte |
| `npm run conformance:machines` | 0 | 45 s; the check 1,379 bytes, 39 driven rows over 13 fixtures under sh, dash and ksh; PASS |
| `npm run conformance:farattach` | 0 | 11 rules |
| `npm run conformance:remoteclose` | 0 | 11 of 11 |
| `npm run conformance:handback` (`menu.ts` and the menu action union moved) | 0 | PASS |
| `gate:menu-glyphs`, `gate:menu-accelerators`, `gate:contract`, `gate:checks`, `gate:electron`, `gate:background`, `gate:knownhosts`, each once on its own | 0 each | as in the build |
| `node build/p340/ablation.mjs --list` | 0 | 31 arms, nothing run |
| `npm run probe:p340:script` | 0 | 143 rows in 7.1 s, 5 inner interpreters and 7 outer shells agreeing, no stand-in run that the view says was not |
| `npm run ablation:p340` | 0 | PASS in 783 s: 30 arms each newly red on the condition that owns it, the control green, every clone file restored and proved by sha256, the worktree never written, the clone gone |
| `node build/p340/probe-p340.mjs --grader-self-test` | 0 | 70 clauses, 108 checks, nothing started |
| `npm run package` under `CSC_IDENTITY_AUTO_DISCOVERY=false` (the documented unsigned shape, so nothing was asked of his keychain) | 0 | 54 s; DMG and ZIP cut, the nested binaries ad-hoc hardened; no native module under `node_modules` was rebuilt (none newer than the run). Because the HOME was scratch, electron-builder fetched Electron 43.3.0's zip (129 MB) into the scratch HOME's cache; that and `release/` were removed afterwards |
| Electron census, once, at the end (`ps -Ao pid,ppid,rss,comm \| grep -E "[E]lectron\|Tortie$\|chrome_crashpad" \| grep -v defunct`) | — | 25 lines, none of this run's: one Phase 316 probe's profile (`/private/tmp/p316-probe-26126`, another session's), his own running Tortie, and their helpers and crash handlers; no process names `wt-p340` or this run's scratch. This run launched no Electron |

### Found here, for the verifier (named by class, not fixed)

1. **A relative entry on the far login PATH that holds an executable named `tmux` makes the whole check `unknown`.**
   The script adds every `<entry>/tmux` that is an executable file, so an entry like `bin` or `.` (resolved against the
   far home, where the command starts) yields a candidate such as `bin/tmux`; `parseCheckAnswer` then refuses the block
   because that candidate fails the schema's absolute-path rule, and the check answers `unknown` with no sheet and no
   `Type its path…` offer, even when a real tmux sits in an install folder. Measured here with the SHIPPING
   `CHECK_SCRIPT` under `/bin/sh`, a scratch HOME holding `bin/tmux`, and `PATH=bin:/usr/bin:/bin`: the block named
   `cand=login bin/tmux` and `cand=install /opt/homebrew/bin/tmux`, `count=2`, and the reader answered `malformed`;
   with `PATH=/usr/bin:/bin` the same tree read `ok` with the install candidate. At the parent such an entry on the
   NON-login PATH answered `ok` with a relative path the add then refused, and on the login PATH was never seen, so the
   scenario that is worse than today is narrow: a relative login PATH entry holding a `tmux`, beside a real tmux the
   non-login PATH would have found. A narrow fix is one clause in `add()` that skips a path not starting with `/`
   before it is counted; it changes `CHECK_SCRIPT`'s bytes, which the tests and condition 125 pin and the ablation's
   shapes match, so it is a fix-round change, not an integrator's. Left for the verifier to rule on.
2. **A timing budget under another program's load.** The one red test in the first `npm test` was a symbols-store
   budget outside this phase, red at a load average near 900 caused by programs that were not this run's, green alone
   and green in the second full run.

### Not run here

`smoke:t1`, `smoke:machines` and `probe:p340` are the verifier's, under the lock (`probe:p340` needs a built HEAD and
`P340_PARENT_CHECKOUT`, a built checkout of `ae38b831`, and reads UNREADABLE rather than pass on a selector its DOM half
has never been run against). `smoke`, `smoke:t3` and `smoke:remote` were not run, and `smoke:remote` is never run in this
phase. The `client-failed` split cannot be driven in the app without breaking node-pty, so its proof is
`p340-client-split.test.ts` and condition 129, as §10 says.

### At landing (origin/main has moved; reconcile, do not rebase this worktree)

- **Origin/main is at `846a095d`, past this worktree's `ae38b831`**: Phase 341 (`6e407148`, New Folder on another
  machine) landed with its own probe and **raised `HELPER_USER_FLOOR` from 166 to 167**. So at landing this phase's floor
  is **168**, and **169** if Phase 337 lands first (C's comment says 168 for 337 alone; it must count 341 as well). 341
  also adds `probe:p341` to `package.json` and `remote('probe:p341')` to `build/verification-checks.mjs` beside this
  phase's lines, and a `### Fixed` item directly after Phase 339's, whose first words this phase rewords: three textual
  merges. `90e7b5ba` edited the Phase 340 entry in `docs/BACKLOG.md`, which this phase does not touch.
- **Phase 337** (`/private/tmp/wt-p337`, uncommitted) edits `CHANGELOG.md`, `CLAUDE.md`,
  `build/assert-electron-teardown.mjs`, `build/conformance-machines.mjs` (its conditions 122 to 124, a separate block at
  the same foot as this phase's 125 to 139), `build/machines-conformance-probe.mts`, `build/scratch-machine.mjs`,
  `build/verification-checks.mjs` and `package.json`. Whichever lands second merges the two gate blocks by hand and
  re-runs `conformance:machines` and `ablation:p340` (its arms match shapes in files 337 does not edit, but the gate it
  runs is shared). Until 337 lands, `SCRATCH_MACHINE_NO_OWN_KEYS=1` in `probe:p340` does nothing, and the probe's own
  sanitising (scratch HOME, no `SSH_AUTH_SOCK`) is what keeps `scratchYard` from reading his keys.
- **The contract baseline** is `count=246` here. If 337 or anything else that lands first adds a channel, regenerate it
  at landing and name the lines.
- The CHANGELOG item gets its commit link in the follow-up docs commit, as every phase's does.

His history, `stat -f '%z %m'`, before and after every command above: `~/.zsh_history 733353 1791256765`,
`~/.bash_history 23166 1790702242`, never moved.

---

## §As built, the fix round (the fixer, 2026-10-06)

Both verdicts answered `needs_work`. Lens 1 (the attack lens) found one major problem, three minor ones in the product, one minor one in the tooling, and a nit. Lens 2 (the drive lens) found five minor problems and a nit. Every major and minor item is fixed below, and both nits are fixed as well. Lens 1's table also had six rows worse than the parent, and every one is now equal to the parent or better. One of them, S10, is the cost D15 stated. It is closed by a narrow reading the fix added, described in the second row of the table. The fix ran once. Nothing was committed, staged or stashed. `git diff ae38b831` is still this phase's delta alone: 55 tracked files changed (6,921 insertions and 2,977 deletions) and 22 untracked entries. Phase 337's keep-out files were not touched.

### What each finding became

| Finding (lens) | What changed | Where | Proof, run |
| --- | --- | --- | --- |
| **Major, L1, and minor, L2.** A candidate that fails the schema's path rule made the whole check `unknown`, even beside a real tmux. Examples: a relative entry such as `bin` or `.` on the far login PATH, a folder named `o'brien`, or one holding a control character. The parent answered `ok` on the same machine. | `add()` in `CHECK_SCRIPT` now skips such a path before it is counted or run. The skips cover a path that is not absolute, a path holding any control character (`[[:cntrl:]]`, kept beside the newline guard) and a path holding a single quote. The quote is made with `sq=$(printf "\047")` because the text may hold no quote of its own. The script grows from 1,379 bytes to 1,495. It still has no newline, `!`, single quote or backslash pair. | `src/main/machines/check-script.ts` | The guard was run on its own under `/bin/sh`, dash, ksh, `zsh --emulate sh` and `bash --posix`, in both the C and UTF-8 locales. All ten runs agreed on ten inputs. There are new fixtures F13 (`bin` and `.`), F14 (`o'brien`) and F15 (a tab), each beside a real install program. All three answered `ok` with the install program and an empty stand-in log in 33 driven rows (3 × 11). The same three cases are in vitest. Over real ssh to the loopback machine (S14a, S14c, S14d), each answered `ok` with `login /opt/homebrew/bin/tmux`, version 3.6a measured and an empty stand-in log. Condition 125 now reads the three skips, and condition 137 reads F13 to F15's real bytes. The arm `a127d` was reshaped, and `a127f`, `a127g` and `a127h` were added. |
| **Minor, L1, plus the S10 row, the cost D15 stated.** A refused block read "Tortie could not reach this machine". The detail quoted Tortie's own marker as the program's last line, and no way past was offered. | (a) **Copy.** When the strict reader refuses a block, the `unknown` outcome reads `Tortie signed in to this machine and could not read its answer.` and quotes no marker. These words are `MACHINE_CHECK_UNREAD_*` in `errors.ts`, chosen through `composeOutcomeCopy`'s `answerUnread`. `MachineTestOutcome` gains `signedIn?: boolean`, which is true once a check marker came back, so the view ticks Reached. The advice is now `CHECK_UNREAD_REMEDY` instead of "read the last line". (b) **The typed reading.** `parseCheckAnswer(text, typed)` and `classifyCheckOutput(text, exit, typed)` take the path the check carried. With a path, a buffer of whole blocks is read for the ONE block whose only candidate is `typed <exactly that path>`. No such block, two of them, or an odd marker count is still `malformed`. With no path, nothing changes. (c) **Type its path…** is offered on that face for a draft check that carried no path. A check that already carried one (typed, or a saved row's) gets `CHECK_UNREAD_REMEDY_TYPED`, because typing the path again would change nothing. | `check-script.ts`, `connection-test.ts`, `errors.ts`, `src/shared/ipc/machines/connection.ts`, `ConnectionTestView.tsx`, `Remedy.tsx`, `AddMachine.tsx`, `machines-copy.ts` | Over real ssh to the loopback machine: S09 (a whole fake block printed before) and S10 (an EXIT trap printing one after) give `unknown`, `signedIn: true`, the new headline and no sheet. **S09t and S10t, the same plants with the path typed, give `ok` with `typed /opt/homebrew/bin/tmux`, version 3.6a measured and a sheet.** The parent reached that machine the same way, by typing the path, so S10 is no longer worse than the parent. New fixtures F8t and F9t passed 22 driven rows in every inner and outer shell. There are six new recorded buffers for condition 137, one of them a control with no path. There are new vitest cases, and two view tests (Type its path… offered, and not offered when a path was carried). New arms `a137c` (two blocks naming the path), `a137d` (any typed path) and `a137e` (an odd marker count) were added. The `from` of `a137a` follows the new line. |
| **Minor, L1.** On a machine that was already known, a login file printing ssh's first-seen words got Tortie's own Trust it question, with a fingerprint the file chose (§Attack R8 claimed this was closed). | ssh asks first-seen only about a name that neither record file holds. The new module `host-record.ts` reads the two files the command names, once per test. It reads them the way ssh's own matcher does: patterns with `*`, `?` and `!`, `[host]:port` off port 22, `\|1\|` hashed names by HMAC-SHA1, `@cert-authority` counted as on record and `@revoked` as nothing. A file over 8 MB counts as on record, the safe direction. On a recorded machine `maybeAskHostKey` raises nothing, and the quiet rule quotes the program's own line, as it does for every unrecognised prompt. | `src/main/machines/host-record.ts` (new), `connection-test.ts` | The hashed test lines were made by the real `ssh-keygen -H`. `ssh-keygen -F` found `[127.0.0.1]:2222` and the tailnet name in them, and did not find `127.0.0.1`. Over real ssh, S11 (on record, with the spoofed words, then a wait) raised one ask, of kind `prompt`, quoting `Are you sure you want to continue connecting (yes/no/[fingerprint])?`. It raised no `host-key` ask, and Tortie's record stayed at 99 bytes. S18 (not on record) raised the real first-seen ask, and its fingerprint equals `ssh-keygen -lf` of the yard's host key. Trust then grew Tortie's record from 0 to 99 bytes, and the person's file stayed absent. A vitest over the captured bytes shows the same, and shows another port still asking. |
| **Minor, L1.** A pick carried the account, port and program path typed for an earlier address, and checked the picked machine with them at once. | Advanced now belongs to the address it was typed for (`advancedHost`). Typing there ties the values to the address in the form. Values typed before any address are tied to the first address typed or picked. A pick of ANOTHER machine clears all three before the check starts. A program chosen from a check's candidates belongs to that check's machine. | `machines-store.ts` | The verifier's exact sequence over the recording fake bridge now sends `{host: studio…, user: null, port: null, remoteTmuxPath: null, id: 'studio'}`. Four more store tests cover keeping values typed before any address, keeping values typed for the same address, values bound by a later typed address, and a chosen candidate not carried to the next pick. |
| **Nit, L1.** Main's refusal was drawn wrapped in IPC text and JSON. | `sentenceOf` now answers `plainSentence`, which is main's own sentence, the way a Rescan refusal already did. | `machines-store.ts` | The store and section suites are green. |
| **Minor, L1, tooling.** `smoke:machines` seals against the real login keychain, and `withElectron` left the app's LOCAL tmux server running. | No product change. `smoke:machines` uses the real keychain by design (its own header says "The keychain is the real one"), so a run under a rule that forbids touching his keychain does not run it. §9.5 is amended here to list it only for runs that may touch the keychain. `probe:p340` already passes `tmuxSocket: SOCKET` to `withElectron`, which ends that server in its `finally`, and it runs under `build/harness-socket.mjs`, which ends it again. The leak came from the verifier's own driver, which named neither. | none | Read: `build/p340/probe-p340.mjs` passes `tmuxSocket` to `withElectron`, and `build/electron-run.mjs:666-667` and `:716-717` end the server. |
| **Minor, L2.** The Offline chip's hover read "This machine is ready." | The Offline arm uses a sign-in sentence only when that sign-in is the one that did not answer. Otherwise it uses main's link sentence, then `PREPARE_EXPLAIN`. Not ready uses `PREPARE_EXPLAIN` under a prepared sign-in. | `machine-status.ts` | New rows in `p340-machine-status.test.ts`: ready with a quiet link and a prepared sign-in, and Not ready after a prepared sign-in. |
| **Minor, L2.** Needs a key stayed after the key was fixed some other way and a check answered ok, with Ready two presses away behind a next step that only checks again. | `machineStatusOf` takes `checkedOkAt`, the time this window received a finished ok check of THIS row (the new `LiveTest.endedAt`). A key sign-in OLDER than that check is stale, so the row reads Not ready with Prepare this machine, one press from Ready as at the parent. A sign-in refused AFTER the check still reads Needs a key. That covers the passphrase class in §13, where the check could answer and Prepare cannot. Nothing is chained: condition 133's list of `b.prepare(` callers is unchanged, and the row only draws a next step. | `machine-status.ts`, `MachineRow.tsx`, `machines-store.ts` | Status tests cover before the check, after it, a refusal after it, and an alarm, which is never cleared this way. Row tests show the drawn next step moving to `prepare` only for this row's check. |
| **Minor, L2, the same at the parent.** After sshd's per source penalty, `kex_exchange_identification: read: Connection reset by peer` was not in the phrase table, so Prepare said the program would not report its version, about a machine nothing had reached. | `PHRASE_TABLE` gains `kex_exchange_identification` and `ssh_exchange_identification`, read as `refused` (the far side declining), as its LAST entry so a refused sign-in in the same text keeps `auth-refused`. The bare "Connection reset by peer" is not matched, because a connection that drops after the sign in prints it too. | `errors.ts` | `errors.test.ts` covers four shapes and the bare phrase reading `unknown`. `prepare.test.ts` shows the version read now answers `unreached` / `refused`. A check outcome test shows it as `refused` with `signedIn: false`. |
| **Minor, L2, the same at the parent.** File > Open Folder on a Machine… stayed off after Add until Tortie was relaunched. | The menu rebuilds on `onMachineConfirmationsChanged`, the listener `confirm.ts` already had for the window, as well as on `onMachinesChanged`. | `src/main/menu.ts` | The new `src/main/__tests__/p340-menu-confirm.test.ts` uses the real menu, store and confirm record over a fake electron. The row is off while unconfirmed, on at the agreement, and off at the withdrawal. With the subscription line taken out, 2 of 3 tests are red, and `menu.ts` was restored and checked by sha256 (`a0d74c88…` before and after). `conformance:handback` is green. |
| **Nit, L2.** Review… was a toggle, so on a panel that opened by itself the first press shut it. | Review… now opens the panel and never shuts it. The review panel has its own Close. | `MachineRow.tsx` | Row tests. The older probes press `toggle-lines` only when `aria-expanded` is not `true` (read in `probe-p167-scale.mjs:944-946` and `probe-p234-arch.mjs:464-467`), so they behave as before. |

### No-regression rows the verdicts marked worse, now

| Scenario | Parent | HEAD before the fix | HEAD now |
| --- | --- | --- | --- |
| A relative login-PATH entry or `.` holding tmux, beside a real one (S14a, S14b, S14c, H7) | ok (S14c no-program) | unknown, no Add | ok, the real program, nothing else run (driven, and real ssh) |
| A login-PATH folder with a quote holding tmux (S14d) | ok | unknown | ok (real ssh) |
| An EXIT trap printing a fake block after the check (S10) | no-program, recovered by typing the path | unknown, cannot be recovered | unknown with a true headline and Type its path…; with the path typed, ok (real ssh, S10t) |
| Ssh's first-seen words printed by a login file on a known machine (S11, H8) | the raw text and the answer field | Tortie's own Trust it over the spoofed fingerprint | a quoted prompt, as at the parent; no Trust it (real ssh) |
| A pick after Advanced was typed for another address | fills the address, starts nothing | checks the picked machine with the other address's account, port and path | checks the picked machine with none of them |
| A key fixed elsewhere, then a check answers ok | Prepare on the open row, one press | two presses, behind a next step that did not lead there | Prepare this machine as the next step, one press |

### Not changed, and why

- **With no typed path, a refused block is still refused** (D15 is kept). The program would otherwise be the far side's choice. The typed reading is the way past, and it is offered on that face.
- **Type its path… is not offered when the check already carried a path.** The reading already ran for that path, and typing it again changes nothing.
- **The Add press is not chained into the key route.** The fix draws Prepare this machine as the next step rather than starting it, so nothing new starts on its own.

### Weaknesses, by class

- **A machine whose name the person's own ssh settings rewrite.** `HostName`, `Port` and `HostKeyAlias` change the name ssh looks up, and Tortie never reads that file. On such a machine a login file can still draw Tortie's first-seen question, Trust it sends `yes` to that file, and nothing is recorded. This is the class D9 had, narrowed to these machines.
- **A known machine presenting a key of a type not on record.** ssh's real question there now reads as a quoted prompt, as at the parent, not as Trust it.
- **The typed reading on a hostile far side.** A block naming the typed path can claim a version. Prepare reads the version again before it starts anything. An unmeasured claim would appear on the Add press as `Accepts version …`, which the person reads first.
- **The far side's `/bin/sh` must support bracket character classes.** The control-character skip relies on them. Five interpreters were measured. busybox ash was read, not run.
- **A candidate path longer than 1,024 characters.** It is only possible where PATH_MAX allows it, not on macOS. It still refuses an untyped check, now with the true face and Type its path….
- **A key sign-in made stale by a finished ok check compares two clocks.** Main's sign-in time and the window's receive time are both on this Mac.
- **Values typed under Advanced before any address are tied to the first address they meet.** They carry to that pick.

### The fixer's own runs

The far side was ONLY the loopback machine built by `build/scratch-machine.mjs`, with `SCRATCH_MACHINE_QUIET_SHELL=1`, `SCRATCH_MACHINE_SCRATCH_HOME=1` and `SCRATCH_MACHINE_NO_OWN_KEYS=1`. The driver ran under `env -i` with a scratch HOME and ZDOTDIR, `HISTFILE=/dev/null` and no `SSH_AUTH_SOCK` or `TERM_SESSION_ID`. Every ssh went through a wrapper with `-F none`, the yard's port first, `IdentitiesOnly=yes` and the yard's key, and `GMUX_SSH_BIN` named that wrapper. Every `StartedTest.sshPath` was checked to be the wrapper. The driver called the SHIPPING `startMachineTest` through the pinned tsx, with record files under the yard. The yard's sshd, agent and every recorded pid were ended in a `finally`, the yard was removed, and no far descendant remained 1.5 s after any test. No Electron was launched, so no lock was taken. No `-L gmux`. Nothing was installed. The far side did not start any tmux server, because the check starts none.

| Command | Exit | Read |
| --- | --- | --- |
| The guard on its own, under `/bin/sh`, dash, ksh, `zsh --emulate sh` and `bash --posix`, in the C and UTF-8 locales | 0 | all ten runs agreed on all ten inputs |
| `npm run -s typecheck` (three times, after each round of edits) | 0, 0, 0 | 1,409 production files, 0 boundary violations, 0 cycles |
| vitest over `src/main/machines`, `src/renderer/settings` and the new menu test (three times) | 0 | last run: 132 files, 3,433 tests |
| `npm test` (twice) | 0, 0 | last run: 1,087 files passed, 2 skipped; 19,877 tests passed, 14 skipped; 101 s |
| `npm run build` (twice) | 0, 0 | 42 s. gate:electron 167 helper users against a floor of 167; gate:background; gate:simulator; gate:knownhosts; gate:checks, 260 scripts and 1,089 test files; conformance:ios, 31 rules; harnessprobes; contract-inventory OK byte for byte (no channel added, and `signedIn` is a field) |
| `npm run conformance:machines` (after the last edit) | 0 | 21 s. The check is 1,495 bytes, with 54 driven rows over eighteen fixtures under sh, dash and ksh. PASS |
| `npm run probe:p340:script` | 0 | 198 rows in 4.5 s, 5 inner interpreters and 7 outer shells agreeing |
| `node build/p340/script-arms.mjs --self-test` | 0 | 14 cases |
| `node build/p340/ablation.mjs --self-test`, then `--list` | 0, 0 | 37 entries: 36 arms and the control |
| `npm run ablation:p340` (over the final tree) | 0 | PASS in 991 s: 36 arms, each newly red on the condition that owns it, measured as a delta against a green base. The new arms are `a127f`, `a127g` and `a127h` (C127 and C137) and `a137c`, `a137d` and `a137e` (C137). `a127d` is reshaped and red on C125, C127 and C137. The control stayed green. Every clone file was restored and checked by sha256, and the worktree was never written |
| `node build/p340/probe-p340.mjs --grader-self-test` | 0 | 73 clauses, 182 checks, nothing started |
| conformance:farattach, conformance:remoteclose, conformance:handback, gate:menu-glyphs, gate:menu-accelerators, gate:checks, gate:contract, gate:electron, gate:background, gate:knownhosts, each once on its own | 0 each | farattach 11 rules; remoteclose 11 of 11; handback PASS |
| The menu test with the subscription line taken out, then put back and checked by sha256 | 1, then 0 | 2 of 3 red; `menu.ts` sha256 `a0d74c88…` before and after |
| `ssh-keygen -H` and `-F` over a scratch record file | 0 | the hashed lines the host-record test pins |
| The loopback drive (`scratchpad/p340/fixer/loop-drive.mts`), twice, the second run over the final tree | 0, 0 | S14a, S14c, S14d, S09, S10, S09t, S10t, S11 and S18, as in the tables above, each in 1.6 to 2.3 s, with every stand-in log empty |

Two ablation runs were started over earlier trees and stopped part way, each because the tree changed under it. Each run's parent was ended with SIGKILL after SIGTERM, which its synchronous loop could not act on, and each run's gate child was ended the same way. Both clones (`/private/tmp/p340-ablation-75081-*` and `-38504-*`) and one gate scratch (`/private/tmp/p336-script-7582-*`) were removed, and none of the stopped runs' processes remained. Only the third run, over the final tree, is reported above.

**Not run here:** `smoke:t1`, `smoke:machines` and `probe:p340`. Each launches an Electron or touches the keychain, so they are the verifier's. `smoke:remote` is never run in this phase.

**At landing:** the CHANGELOG item gains one clause for the File menu row, inside the same item, because one commit gets one item. The `conformance:machines` and `probe:p340:script` rows in CLAUDE.md now carry the eighteen fixtures, the 36 arms and the measured times.

His history, read with `stat -f '%z %m'` before and after every command that started a shell, a far session or a build: `~/.zsh_history 733353 1791256765` and `~/.bash_history 23166 1790702242`. Neither moved.

---

## §As built, the ruled round (the fixer, 2026-10-06)

The independent reverify of the fix round answered `needs_work` on minor and nit items only. The main session ruled under his delegation of 2026-10-05: fix four items, each with a test that fails when the fix is removed, and change nothing else. This section records those four, the one gate amendment the first of them forced, and the runs. The fix ran once. Nothing was committed, staged or stashed, and every earlier fix is kept.

### What each item became

| Item (the ruling) | What changed | Where | Proof, run |
| --- | --- | --- | --- |
| **1.** A machine ssh already knows from its GLOBAL record got Tortie's "has not met this machine before" question, over a fingerprint a login file chose. | **host-record reads the global files too** (the ruling's first option). `SSH_GLOBAL_HOST_RECORD_FILES` is `/etc/ssh/ssh_known_hosts` and `/etc/ssh/ssh_known_hosts2`, measured as OpenSSH 9.9p2's default with `ssh -G -F none tortie-check.invalid`, which reads no settings file and contacts nothing; neither settings file on this Mac names another. `hostRecordFiles` lists the files in ssh's order and `hostKeyRecorded` takes the global list as a fourth argument, defaulting to that constant. `StartTestInput` gains an optional `globalHostKeys`, which Tortie never passes; a test, or a drive that cannot write `/etc`, hands the same file it named to ssh. | `src/main/machines/host-record.ts`, `connection-test.ts` | New vitest cases: the default list, a machine on record only in a global file (plain, hashed, another port), `@revoked` there making nothing known and `@cert-authority` counting, a too-large global file counting and a missing one not, and **the default list asked of this Mac's own `/usr/bin/ssh -G -F none`**. In the check runner, a machine on record only in the global file raises no host-key ask and its line is quoted as a prompt, with the control (no global file handed) still asking. Over real ssh to the loopback machine: G1 to G3 below. |
| **2.** Confirming a prepared machine's CHANGED details read Ready, with Open a folder on it…, over the context Prepare registered under the old details. | `machines:confirm` asks, BEFORE it records the agreement, whether the row reads `changed` or whether the registered context was built from other details (`registeredRouteDiffers`: address, account, port, program, accepted version). The second question catches a row whose agreement was withdrawn and whose file was then edited, which reads `never` rather than `changed`. Only once the agreement is recorded, it calls `retireMachineRoute`: both feeds stop (the fallback timer and the status list), the live connection made under the old details closes, `forgetMachineRuntime` drops the context and its generation so `ready` is false and every verb refuses with "Prepare the machine first", and the session rows on that machine read `unknown`, the verdict a list that does not arrive writes. The link is left where it was, so the row reads **Not ready with Prepare this machine** rather than Offline over a machine nothing asked. The handler also forgets the row facts the last Prepare read (they were about the old details) and stops a launch sign-in retry still armed for that machine, so nothing reaches it before the person presses Prepare. A refused confirm (a stale sheet) changes nothing. Confirm still starts nothing, per D12, and condition 133's list of `b.prepare(` callers is unchanged. | `src/main/machines/ipc.ts`, `remote-sessions.ts` | New ipc tests: the port rewritten, then Confirm the new details gives `ready: false`, no registered context, no sign-in, no retry and no spawn; the same after Stop trusting followed by an edit; the control (Stop trusting, then Confirm the same details) keeps Ready; and a refused confirm keeps the route. New remote-sessions tests over the faked plane: after the retire, no timer of either kind, the connection stopped, the context gone, the rows `unknown`, no list in 90 s of fake time and a link that never reads quiet; and `registeredRouteDiffers` field by field. |
| **3.** After a key problem was fixed elsewhere and the check answered ok, the chip read Offline beside "This machine answered". | The chip agrees with the check shown. While a finished ok check of THIS row is the newest word about the machine (newer than the last sign-in, or with none in this run), a sign-in that did not reach the machine is stale the way a key one already was, and a `quiet` link is not read as Offline. The row reads Not ready, whose next step, Prepare this machine, is Offline's own. A sign-in after the check is newer and is read as before. A changed identity is never cleared this way. Condition 139 drives the table with no check, so its rows are unchanged. | `src/renderer/settings/machine-status.ts` | Status tests: the reverify's row (key class, quiet link, ok check after), no sign-in with a quiet link, every offline class older than the check, and the controls (no check: Offline; an unreachable or prepared sign-in after the check: Offline; Ready stays Ready; the alarm stays). A row test draws the check panel's "This machine answered." beside a Not ready chip and Prepare, never Offline. |
| **4.** `probe-p340.mjs` A9 read UNREADABLE when the product drew another next step after Confirm, because the press found no Prepare button and threw. | `prepareAfterConfirm` presses Prepare only when the product drew it, and otherwise records `preparePressed: false` and `readyAfterPrepare: null`, so "Confirm started nothing and left Prepare as the next step" and "Prepare this machine reached Ready" read FAIL. A chip still Changed 20 s after Confirm is recorded as `chipMovedAfterConfirm: false` and graded, rather than ending the arm. A press that throws for a button that IS drawn still makes the arm unreadable. | `build/p340/probe-p340.mjs` | The grader self-test gains three refused readings (Ready with Open a folder on it… on both clauses, and a Confirm not taken) and four checks of `prepareAfterConfirm` with a press that throws as the run's own does for a missing button. With the guard taken out, the self-test answers FAIL on 2 of 189. |

### Item 1: why the files are read rather than pinned away

The other way to make host-record and ssh agree was to pin `GlobalKnownHostsFile` to Tortie's own files on the test's command line. It was not taken, for three reasons. The check's ssh would stop being the ssh every session runs, so a machine the system's record vouches for would be asked about in the check alone. A key the system's record marks `@revoked` would be offered as Trust it instead of being refused. And a machine whose key had changed against the system's record would lose ssh's changed-key alarm and meet Tortie's first-seen question over the new key, which is the spoof this module exists to stop, made worse. Reading the files leaves ssh exactly as it is and errs only in the safe direction.

**For the reverifier: a wrapper's own `GlobalKnownHostsFile` is invisible to the product.** Tortie reads ssh's default global files, because Tortie reads no ssh settings file. A drive that makes ssh read a scratch global file through an option in its wrapper, as the reverify's R4 did in the app, still meets Tortie's question there. That is the stated weakness below, not this fix failing, because no real machine moves its global record through a wrapper. The faithful drive, short of writing `/etc`, hands host-record the same file through `globalHostKeys`, which is what G1 does.

### The gate this forced: condition 8 admits one more file, in one module

`conformance:machines` condition 8 fails any line under `src/main/machines/` naming `known_hosts` other than the path helper and a denying comment, because a second mention of the person's record is a second place that could write to it. `ssh_known_hosts` contains that word, so the first run after item 1 failed on three lines of `host-record.ts`. The condition now also admits a line in `src/main/machines/host-record.ts` alone, and only when, with `/etc/ssh/ssh_known_hosts` and its `2` taken out, the line names no record file at all. Beside that, it holds that module to reading: its `node:fs` import may name only `readFileSync`, `statSync`, `existsSync` and `lstatSync`, with no `node:fs/promises`, namespace, default or `require` door. Three ablations, each made in place and restored by sha256, each turned the gate red on condition 8's own words alone:

| Ablation | Condition 8 said |
| --- | --- |
| `host-record.ts` names the person's `.ssh/known_hosts` beside the global path | `host-record.ts:90 names the person's own record file …` |
| `host-record.ts` imports `writeFileSync` from `node:fs` | `host-record.ts names ssh's global record and may only READ it, but its file imports reach writeFileSync.` |
| `carriage.ts` names `/etc/ssh/ssh_known_hosts` | `carriage.ts:169 names the person's own record file …` |

No arm of `ablation:p340` owns condition 8, so none was added there. The full harness was run over the amended gate; its row is in the table below.

### Over real ssh to the loopback machine (item 1)

The far side was only the loopback machine from `build/scratch-machine.mjs`, with `SCRATCH_MACHINE_QUIET_SHELL=1`, `SCRATCH_MACHINE_SCRATCH_HOME=1` and `SCRATCH_MACHINE_NO_OWN_KEYS=1`. The driver (`scratchpad/p340r/fixer/g-drive.mts`) ran the SHIPPING `startMachineTest` through the pinned tsx under `env -i`, with a scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, and no `SSH_AUTH_SOCK` or `TERM_SESSION_ID`. ssh's global record was simulated through ssh's own option in a SCRATCH CONFIG: the wrapper ran `/usr/bin/ssh -F <yard>/ssh_config`, which holds `GlobalKnownHostsFile <yard>/global-known-hosts`, then the yard's port, `IdentitiesOnly=yes` and the yard's key. `/etc` was never named or written. Tortie's record and the person's record were scratch files, both empty in every run. The yard's sshd, its agent and every recorded pid were ended in a `finally`, the yard was removed, and no far descendant remained after any run.

| Run | Set-up | Asks raised | Outcome |
| --- | --- | --- | --- |
| G1 | the machine only in the global record; a login file prints ssh's first-seen words with `SHA256:SPOOFED…0000` and waits; the global file handed to host-record | one `prompt`, quoting `Are you sure you want to continue connecting (yes/no/[fingerprint])?`; **no host-key ask** | `ok`, login `/opt/homebrew/bin/tmux`, Tortie's record 0 bytes |
| G1x | the same, the global file NOT handed (the reading before this round) | one **`host-key` ask over the spoofed fingerprint**: the reverify's finding, reproduced | `ok`, record 0 bytes |
| G2 | the machine only in the global record, no plant | **none**: ssh is silent about a machine on its global record, which is the premise | `ok` |
| G3 | the machine on no record, no plant (the control) | one `host-key` ask, fingerprint `SHA256:3Kj4UXSW…AT7U`, equal to `ssh-keygen -lf` of the yard's host key | `unknown` after the drive answered `no` |

### Not changed, and why

- **No harness seam was added to the app** for a scratch global record. A drive through `globalHostKeys` reaches the shipping runner. A seam in `ipc.ts` would be a new product surface, which the ruling does not allow.
- **`ablation:p340` gained no arm.** Its arms own conditions 10 and 125 to 139, and the ruling's tests are vitest cases, each shown red with its fix taken out.
- **The link is not marked quiet on a retire.** Nothing asked the machine, so "did not answer" would be false.
- **Open terminals on a machine whose details changed keep their own connection.** Retiring the route stops what Tortie reads, as Remove does, and ends nothing the person is typing into.

### Weaknesses, by class

- **A global record the person's settings move.** A `GlobalKnownHostsFile` in `~/.ssh/config` or `/etc/ssh/ssh_config` changes which files ssh reads, and Tortie reads neither settings file. On such a machine a login file can still draw Tortie's first-seen question. This is the same class as `HostName`, `Port` and `HostKeyAlias`, recorded in the fix round.
- **A route compared field by field.** `registeredRouteDiffers` compares address, account, port, program and accepted version. A change to a field the context does not carry (a write folder written by hand into an old file) is caught by the `changed` state, not by the comparison. After Stop trusting, such a change is not caught, and the route stays, which is correct because the route did not move.
- **The rows read `unknown` until Prepare.** A person who confirms new details and does not press Prepare sees that machine's sessions as unknown, which is true: Tortie is not reading them.
- **The link carries no time on the row.** A machine that goes quiet while an ok check is still shown reads Not ready rather than Offline until the check is closed or run again. The next step is the same.

### The fixer's own runs

Every command ran under a scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, and no `TERM_SESSION_ID` or `SSH_AUTH_SOCK` (`scratchpad/p340r/fixer/senv.sh`). No Electron was launched, so no lock was taken. No `-L gmux` was used. Nothing was installed. No real host was contacted.

| Command | Exit | Read |
| --- | --- | --- |
| `ssh -G -F none tortie-check.invalid` (the measurement) | 0 | `globalknownhostsfile /etc/ssh/ssh_known_hosts /etc/ssh/ssh_known_hosts2`; neither file exists on this Mac; `/etc/ssh/ssh_config` names none |
| `npm run -s typecheck` | 0 | 1,409 production files, 0 boundary violations; 1,406 files, 0 cycles |
| vitest over the six touched test files | 0 | 293 tests |
| The fixer's ablations (`scratchpad/p340r/fixer/ablate.py`), eight arms, each one fix taken out alone, each file restored and checked by sha256 | 1 each | host-record ignoring the globals: 4 red (3 host-record, 1 check runner); the runner dropping them: 1; Confirm retiring nothing: 2; Confirm asking only `changed`: 1 (the withdrawn-then-edited case); the retire keeping the feed: 2; the retire keeping the context: 3; a quiet link always Offline: 2 (status and row); an offline sign-in never stale: 1 |
| `node build/p340/probe-p340.mjs --grader-self-test` | 0 | 73 clauses, 189 checks, nothing started |
| The same with `prepareAfterConfirm`'s guard taken out, restored by sha256 | 1 | FAIL on 2 of 189 |
| The loopback drive `g-drive.mts` | 0 | G1, G1x, G2 and G3 as above, 1.5 to 2.3 s each |
| `npm run -s build` | 0 | 33 s; gate:electron 167 of a floor of 167; gate:simulator PASS; gate:knownhosts 562 files; gate:checks 260 scripts and 1,089 test files; conformance:ios PASS, 31 rules; harnessprobes PASS; contract-inventory OK byte for byte |
| `npm test` | 0 | 55 s; 1,087 files passed, 2 skipped; 19,892 tests passed, 14 skipped |
| `npm run -s conformance:machines`, first | 1 | condition 8 on `host-record.ts:83`, `:89` and `:90` |
| the same, after condition 8's amendment | 0 | 24 s; the check 1,495 bytes, 54 driven rows over eighteen fixtures; PASS |
| Condition 8's three ablations (`gate8.py`), restored by sha256 | 1 each | red on condition 8 alone, as in the table above |
| `node build/p340/ablation.mjs --self-test`, then `--list` | 0, 0 | 10 fixtures, every arm's shape present once; 37 entries |
| `npm run -s ablation:p340` (over the amended gate) | 0 | PASS in 935 s at a load average near 150 from other programs: 37 entries, every arm newly red on the condition that owns it, the control green, every clone file restored by sha256, the worktree never written, the clone gone |
| gate:contract, gate:checks, gate:background, gate:knownhosts, gate:electron, conformance:remoteclose (`remote-sessions.ts` moved), each once | 0 each | contract byte for byte; 260 scripts; 534 files with 3 long-lived starts, each ended in a `finally`; 562 files; 167 of 167; remoteclose 11 of 11 |

| After the last edit (the retire's log line said only when there was a route): typecheck, the two remote tests, the two retire ablations again, `npm run -s build`, `npm test`, `conformance:machines`, the four gates, `conformance:remoteclose` and the grader self-test | 0 each, the ablations 1 each | typecheck as above; 175 tests; 2 and 3 red, restored; build 35 s, the same gate readings; 1,087 files and 19,892 tests passed (77 s); PASS in 22 s; contract byte for byte; remoteclose 11 of 11; 73 clauses, 189 checks |

**Not run here:** `smoke:t1`, `smoke:machines` and `probe:p340`. Each launches an Electron or touches the keychain, so they are the reverifier's. `smoke:remote` is never run in this phase.

His history, read with `stat -f '%z %m'` before and after every command that started a shell, a far session or a build: `~/.zsh_history 733353 1791256765` and `~/.bash_history 23166 1790702242`. Neither moved.

---

## §As built, Phase 340.1 (the builder, its reverify and the fix round, 2026-10-06)

Phase 340.1 is the backlog entry of that name: the two edge cases Phase 340's ruled reverify left. Its builder wrote no section here, so this one records the builder's work, the reverify's verdict and the fix round together. The reverify answered `needs_work` on three minor problems and two nits. The fix ran once. Nothing was committed, staged or stashed. `git diff 06f2c632` is this phase's delta alone: 12 tracked files and 4 new test files, all under `src/main/`, plus this section. Phase 337's files were not touched.

### What each item became

| Item | What landed | Where | Proof, run |
| --- | --- | --- | --- |
| **1.** Off port 22, also ask the bare host in every record file, as ssh does. | **Taken out in the fix round.** The builder made any bare line count. The reverify's oracle showed that this fixes 192 rows and makes 108 rows worse than the parent. No reading of the files can tell the two kinds apart (next section), and a row worse than the build before it does not land. `hostKeyRecorded` asks only the name ssh asks first, as at the parent. The module's header now states the class, the measurement and what a fix would need. | `src/main/machines/host-record.ts` (header only), `__tests__/p3401-host-record-portless.test.ts` | The test pins it both ways. Off port 22, a bare line in any of the three files does not vouch for the machine. On port 22, or with no port, it does. Putting the bare name back turns 3 of its 6 tests red (fixer's ablation 9). |
| **2.** A Prepare already running when changed details are confirmed stops before `ensureRemoteServer` and the feed. | **The builder's route epoch, kept.** `machineRouteEpoch` and `bumpMachineRouteEpoch` live in `context.ts`. The number moves on one event, the retire, and is never cleared. `retireMachineRoute` moves it first. `prepareMachineOnce` reads it before it registers its context and asks it again after every await. When it has moved, the Prepare answers `MACHINE_PREPARE_OVERTAKEN_HEADLINE` and its detail, starts nothing more and writes nothing, and the wrapper does not record it as the row's last sign-in. The feed carries the epoch it started under (`feedEpoch`). A pass on a retired route asks nothing, and a list that comes back over one writes nothing. `startMachineFeed` and the live connection's precheck stop when it moves. `closeControlPlane(…, { routeRetired: true })` settles a `connecting` link to `polling`. The launch sign-in in `core.ts` neither marks the machine quiet nor arms a retry when the epoch moved. | `context.ts`, `prepare.ts`, `errors.ts`, `remote-sessions.ts`, `control-plane.ts`, `sessions/core.ts` | The builder's `p3401-late-prepare.test.ts`, with the version read, the set-up, the precheck and an in-flight list each held in turn, and the builder's 15 ablations. Re-run here over this round's code: 12 of 13 still red (see "Not changed" for the 13th). |
| **The fix round's minor 1:** Confirm overtaking the LAUNCH sign-in left the row Offline, "has not been signed in to in this run", and not Not ready (arm C). | The launch sign-in writes no link until its feed starts, so the retire found no record. `machineLinkFacts` reads a missing record as `quiet`. `closeControlPlane`'s retire arm now also settles a machine with **no link record** to `polling`, "is not on a live connection". A `quiet` record is left as it is, because that machine did not answer when it was asked. The confirm handler now stops an armed launch retry **before** it retires the route. The retire can move a link to `polling`, which a retry hears as a machine starting to answer, and the agreement is already recorded by then, so with the old order a retry could have signed in under the new details from Confirm. | `control-plane.ts`, `ipc.ts` | New late-prepare cases: a first Prepare held at its version read with no link record (Offline before Confirm, Not ready after it, no ssh after it, Ready after Prepare), a quiet link left quiet (the control), and an armed retry with no record (no sign-in, retry gone). Ablations 1 to 3 each turn their case red. In the app, arm C: 0 ssh after Confirm, chip `changed` then `not-ready`. |
| **The fix round's minor 2:** a remote create already out when changed details are confirmed: its late `startMachineFeed` adopted the new epoch with no context, marked the machine quiet, and the chip read Offline, "did not answer the last time Tortie asked" (arm D, at the parent and at the build). | `remoteCreate` and `restoreRemoteSession` read the epoch in the same tick as their context. Each starts its feed at the end only when the epoch has not moved, and logs the reason when it has. The comment on `retireMachineRoute` now says so, and it is true again. | `remote-sessions.ts`, `remote-restore.ts` | New `p3401-create-overtaken.test.ts`: a create held at `new-session`, then the retire, then the answer. No list, no precheck and no timer follow; the link is not quiet. The control beside it lists and returns its session. No test drives a whole restore, so the late-prepare file reads the restore's body for the read and the guard. Ablations 4 and 5 turn each red. In the app, arm D: 4 ssh after Confirm (the create's own four stamps, as at the parent), chip `changed` then `not-ready`, never `offline`. |
| **The fix round's nit 1:** a confirm landing inside `ensureRemoteServer` let the set-up run to its end over the old details: 24 commands (arm B). | `ensureRemoteServer(ctx, { stillRouted })` asks its caller's question after every command it sends. A false answer throws `RemoteServerSetUpStopped`, which says whether the call had started the server. Prepare alone passes it, as "the epoch has not moved", and maps the throw to its stopped answer, carrying `born`. A restore and a create pass nothing and are unchanged. | `remote-server.ts`, `prepare.ts`, `__tests__/prepare.test.ts` (three source pins loosened to the call's new argument list) | New `p3401-server-setup-stop.test.ts` drives the REAL set-up: a stop at `set-environment` sends nothing more; a stop after the boot reports `born`; a stop inside the option loop stops at the next command. The controls run the whole set-up with no question and with a question answering yes. Ablations 6 to 8. In the app, arm B: 0 ssh after Confirm (the parent and the builder sent 24). |
| **The fix round's nit 2:** no §As built for 340.1. | This section. | `build/p340/SPEC.md` | |
| **3.** (optional) read `ssh -G` for the files and alias ssh will use. | **Not taken, measured.** `ssh -G` evaluates `Match exec` lines, which run a command. With a scratch settings file whose `Match exec` touched a file, `ssh -G -F <it> tortie-check.invalid` created the file and applied that block's `Port`, exit 0. The builder measured this and the reverify measured it again. It stays a stated limit in `host-record.ts`. | `host-record.ts` (header) | |

### Item 1: why the bare name was taken out

Off port 22, ssh looks up `[host]:port` and, finding no key there, tries the bare `host` over the same files (OpenSSH's `check_host_key`, "checking without port identifier"). It accepts the bare line only when that line holds the key the machine presents. Tortie reads the record files before the test starts, when that key is not known.

- **Counting a bare line fixes the spoof.** A login file can no longer draw Tortie's first-seen question over a machine that ssh accepts silently by such a line. The parent had 192 UNSAFE rows over 3 files and 4 modes off port 22.
- **It also costs the person something.** A bare line holding a key ssh will NOT accept for that port makes Tortie read the machine as on record. ssh still asks, and the person then gets ssh's raw last line, quoted as a prompt, instead of Tortie's own question with the fingerprint and Trust it. The reverify found 108 such rows: 18 shapes, 3 files, 2 hosts, all off port 22. The shapes include another ed25519 key, RSA only, a hashed line with another key, `@cert-authority`, `@Revoked` with a capital, an unknown marker, a host field with no key, a bad key, and a BOM. A real case is a container's sshd on 2222 next to the host's own sshd on 22.

The question bytes cannot settle it. On the spoof path a login file writes every byte, fingerprint included, so any rule that compares the question with the record can be met by a login file that prints another fingerprint. The only thing that separates the two kinds is the key the machine presents, read before any login file runs. That needs a change to the test's own command line, which this entry rules out ("No change to 340's flow or words"). Some of the 108 shapes are lines ssh ignores whatever the key (an unknown marker, `@Revoked`, a host field only, a bad key, a BOM). Not counting those would narrow the cost, but not remove it, so it was not done either.

### The no-regression rows, now

| Scenario | Today (the parent, `06f2c632`) | This build |
| --- | --- | --- |
| A non-default port, a bare line holding the machine's key, and a login file that prints ssh's first-seen words (192 oracle rows) | Tortie draws its own question and Trust it over the login file's fingerprint | **The same.** It stays a stated limit, as before this phase |
| A non-default port, a bare line holding a key ssh will not accept there (108 oracle rows) | ssh asks; Tortie draws its own question and Trust it | **The same.** These were worse at the builder's HEAD |
| Every other oracle row (726: the 702 the builder's HEAD left alone, and 24 where ssh refuses a revoked key) | as recorded by the reverify | **the same**, because `hostKeyRecorded` is the parent's again; only its header comment changed |
| App arm A: Prepare held at its version read, the port rewritten, Confirm, release | 27 ssh after Confirm; Offline at +2.1 s, "did not answer the last time Tortie asked" | 0 ssh after Confirm; `changed`, `connecting`, then `not-ready` at +1.6 s; Prepare then reached Ready (36 ssh) |
| App arm B: held inside the set-up at `set-environment` | 24 ssh after Confirm; Offline | **0 ssh after Confirm** (the builder sent 24); `not-ready`; Prepare then reached Ready |
| App arm C: the launch sign-in held at its version read | 27 ssh; Offline, "did not answer the last time Tortie asked" | 0 ssh; `changed` then **`not-ready`** (the builder left Offline, "has not been signed in to in this run"); Prepare then reached Ready |
| App arm D: a remote create held at `new-session` | 4 stamps; the create fails; Offline, "did not answer the last time Tortie asked" | the same 4 stamps and the same failure sentence; `changed` then **`not-ready`**, never Offline; Prepare then reached Ready |

### Not changed, and why

- **A create or a restore already running when changed details are confirmed still finishes over the old details.** Only its last step, starting the feed, is withheld. In arm D the create's `new-session` landed on the old route and its four stamps followed. That matches the parent, and the session exists over there with the stamps that name it. Stopping a create part way would need a sentence of its own, which this entry does not allow.
- **That create still answers "Tortie could not find a session called … on that machine after it created one. Nothing was changed."** The session was in fact created on the far side. The parent answers the same. The sentence belongs to the create, outside this entry, and is worth its own entry.
- **A `quiet` link stays quiet on a retire.** A machine whose sign-in under the old details did not answer still reads Offline after Confirm, as at the parent. The ruled round kept this on purpose, and the next step is Prepare either way.
- **The check after the set-up returns (`if (overtaken()) return stopped(server.born);`) is kept although no test owns it now.** The set-up asks the question after its last command, so the check is reached only if a later change stops that. The builder's ablation D reads green over this round's code for that reason, and it is the only one of its 13 arms that does.
- **No CHANGELOG item.** The false Offline needs the route retire, which first appeared in Phase 340, and Phase 340 is unreleased. No release ever showed it, so no person would notice the fix. Phase 340's own Changed item covers the flow.

### Weaknesses, by class

- **The portless class.** On a non-default port, for a machine that ssh accepts only through a bare host line, a login file can still draw Tortie's first-seen question. Trust it then sends `yes` to that login file and nothing is recorded. This is the class D9 had, recorded beside the settings one in `host-record.ts`.
- **Names the settings rewrite.** `HostName`, `Port`, `HostKeyAlias` and `GlobalKnownHostsFile` are unchanged from the ruled round. Item 3's measurement is the reason they stay.
- **One command in flight.** A Prepare overtaken during a command still sends that command to the old details. The stop comes at the next one.

### The fixer's own runs

Every command ran under a scratch HOME and ZDOTDIR, with `HISTFILE=/dev/null` and no `TERM_SESSION_ID` or `SSH_AUTH_SOCK` (`scratchpad/p3401/fixer/senv.sh`). The far side was only the loopback machine from `build/scratch-machine.mjs`, with a quiet shell and a scratch home. No real host was contacted, `-L gmux` was never named, `/etc` was never written, nothing was installed, and no screenshot was taken. Electron ran only under the lock, through `withElectron`.

| Command | Exit | Read |
| --- | --- | --- |
| vitest over the four p3401 files and 18 machine neighbours | 0 | 22 files, 509 tests |
| The fixer's ablations (`fixer/ablate.py`), nine arms, each in a `cp -Rc` clone, each file restored and checked by sha256 against the worktree | 1 each | Control: 25 of 25 green. Red counts: (1) no-record settle 2; (2) connecting settle 3; (3) retire before the retry 1; (4) the create's late feed 1; (5) the restore's 1; (6) the set-up's question 3; (7) Prepare passing it 1; (8) `born` carried 1; (9) the bare name put back 3 |
| The builder's 13 arms that still apply (`fixer/ablate2.py`) | 1 each, but 0 for D | 12 red; D green, as described above |
| `npm run -s typecheck` | 0 | 1,409 production files, 0 boundary violations; 1,406 files, 0 cycles |
| `npm run -s build` | 0 | 30 s; gate:electron 168 of a floor of 168; gate:background 535 files, 3 long-lived starts; gate:simulator PASS; gate:knownhosts 563 files; gate:checks 261 scripts, 1,094 test files; conformance:ios PASS (31 rules); harnessprobes PASS; contract inventory byte for byte |
| `npm test` | 1 | 1,091 files and 19,923 tests passed, 14 skipped. The one failure was `src/renderer/editor/__tests__/p282-view-presses.test.ts`, a redline timing test this phase does not touch, at a load average near 30. Alone it passed 7 of 7 (exit 0) |
| `npm run -s conformance:machines` | 0 | PASS in 21 s; 54 driven rows |
| `npm run -s conformance:remoteclose`, `conformance:farattach` | 0, 0 | 11 of 11; FA1 to FA11 green |
| `npm run -s smoke:t1` (under the lock) | 0 | 34 s; create 5/5 PASS, verify 6/6 PASS |
| The reverify's race driver, copied to `fixer/race.mjs` and pointed at this build only, arms A, D, B and C (under the lock) | 0 | 187 s; the numbers in the table above; 0 processes left naming the run |
| Electron census, once at the end | | 16 lines on the machine. None names this run's profile, yard or socket |

His history, read with `stat -f '%z %m'` before and after every command that started a shell, a far session or the app: `~/.zsh_history 733353 1791256765` and `~/.bash_history 23166 1790702242`. Neither moved.
