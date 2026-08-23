# Tortie

A calm, durable place for agentic work: **durable named terminal sessions**
(backed by a private tmux server that survives app quit/crash/update), project
tabs, a VS Code-grade git sidebar, a git-decorated file tree, and a Monaco
editor with diff-vs-HEAD — in one window. tmux is invisible: the GUI is the
whole interface.

Philosophy and naming: [`docs/ZEN-OF-TORTIE.md`](docs/ZEN-OF-TORTIE.md).
Architecture authority: [`docs/audits/2026-08-20-electron-typescript-architecture.md`](docs/audits/2026-08-20-electron-typescript-architecture.md).

> **The app was called `gmux` until Phase 16.5.** The product name, bundle id
> and data directory (`~/Library/Application Support/Tortie`) all changed; the
> first launch under the new name copies the old
> `~/Library/Application Support/gmux` across and leaves the original in
> place as a backup (`src/main/migrate/`). Several INTERNAL identifiers keep
> the old spelling ON PURPOSE — most importantly the private tmux socket
> `-L gmux`, which live sessions are bound to and which must never be renamed.
> See "What is still called gmux, and why" below.
>
> **The bundle id changed again in Phase 27**: `com.itavero.tortie`, because
> Tortie ships under Itavero, the operator's LLC, not SpecStory. The data
> directory follows `app.setName` ("Tortie"), not the bundle id, so nothing
> moved. macOS keys privacy grants and the login item on the bundle id, so
> permissions are asked again once and `reconcileLoginItem()` re-registers the
> login item from the recorded preference. The SpecStory integration keeps its
> name everywhere; it is a separate product Tortie talks to.

## Dev quickstart

Requirements: macOS (arm64), Node 22+, Xcode Command Line Tools (for native
module builds and for compiling the bundled tmux), `pkg-config`, and `git` on
PATH.

A system `tmux` (3.6 or newer, `brew install tmux`) is needed to run
`npm run dev` and the harnesses, because a development build resolves tmux from
PATH. It is NOT needed to run a packaged Tortie. Since Phase 41 the app carries
its own tmux 3.7b at `Contents/Resources/bin/tmux` and a packaged build resolves
only that path.

```sh
npm install        # postinstall runs electron-rebuild for node-pty + better-sqlite3
npm run dev        # electron-vite dev server + Electron with HMR
```

### Scripts

| Script              | What it does                                                        |
| ------------------- | ------------------------------------------------------------------- |
| `npm run dev`       | Dev mode with HMR (renderer) and hot restart (main/preload). Set `GMUX_PROBES=1` to load the harness drives in the dev window (Phase 127). Without it the window loads none of them. |
| `npm run build`     | Production bundles into `out/`                                       |
| `npm run typecheck` | Strict `tsc --noEmit` over node (main/preload/shared) + web configs  |
| `npm run smoke`     | Build, then headless boot check: window + native modules + private tmux server reachable, exits 0 in <15 s |
| `npm run shot`      | Build, then screenshot the window after 3 s (`GMUX_SHOT=/path.png npm run shot`) |
| `npm run package`   | electron-builder `--dir` build (unsigned dev packaging stub)         |
| `npm run vendor:tmux` | Build the pinned tmux into `build/vendor/tmux/bin/tmux`. Measured between 31 s and 55 s the first time, depending on what else the machine is compiling, and 0.1 s afterwards, because a binary that already reports the pinned version is left alone. `npm run package` runs it for you. |
| `npm run pin:tmux:check` | Prove `build/tmux-release.json` and `src/main/tmux/version.ts` say the same thing. Spawns nothing, makes no request, measured at 0.1 s. `npm run package` runs it too, so a drifted pin cannot reach a build. |
| `npm run conformance:tmux-pair` | Drive the release's one tested tmux version pair with a real attach: a warm server on the older tmux, the app's create and verify smoke halves as the newer client, and proof the old server never moved. |

### Which gate a change has to run

Some gates are pinned to the paths they protect. Run the gate when the commit
touches the path, whatever else the commit is about. The rule in bold below is
the one Phase 111 added.

Two things about that rule, and the second one matters more. Phase 100 touched
`src/main/restore/snapshots.ts` and did not run `npm run smoke:t3`, so the rule
does fire on that commit and would have asked for the gate. It would not have
caught the failure that turned the nightly durability lane red. That failure is
a race in the T3 harness that is older than Phase 100 by many commits, and the
smoke passes on this Mac, so running it at Phase 100 would have printed a green
line and found nothing. The rule is here because a change to the restore path
deserves the one gate that drives restore end to end, and not because it would
have caught this one.

| A commit that touches | Runs |
| --- | --- |
| **`src/main/restore/**`, `src/main/manifest/**` or `src/main/sessions/core.ts`** | **`npm run smoke:t3`** |
| `src/main/context/agent-context.ts` or `src/renderer/context/groups.ts` | `npm run conformance:context` |
| `src/main/agents/registry.ts`, `src/main/manifest/harvest/**`, `src/main/manifest/agents.ts` or `src/main/restore/**` | `npm run conformance:resume:capture` |
| `src/main/agents/registry.ts`, `src/main/manifest/agents.ts`, `src/main/config/**` or `src/renderer/state/agents.ts` | `npm run conformance:agents` |
| `src/main/agents/registry.ts` | `npm run conformance:installs` |
| `src/main/machines/**` | `npm run conformance:machines` |

`npm run smoke:t3` measured 30 s on this Mac, being 24 s of build and 6 s of
harness. It plants two sessions on a scratch tmux socket, quits so the app-quit
snapshot is written, kills those sessions out of band, and proves both come back
with their scrollback replayed and their resume command typed but not run.
Drive it either way. `npm run smoke:t3` works, and so does
`node build/harness-socket.mjs gmux-smoke-t3 '...'` on its own. Since Phase 112
the harness puts `<repo>/node_modules/.bin` on the child's PATH itself, so
`electron` is found without `npm run`. Before Phase 112 the second way exited
127 with `electron: command not found`.

Since Phase 114 the harness writes a run marker named `<socket>.run` beside
the socket file before its child starts, and its teardown removes the marker.
The cleanup at the start of every harness run reads marker files only. A
server whose marker names a dead process id is ended, and a socket file with
no marker is never touched, whatever its name looks like. Sockets left behind
by runs from before Phase 114 carry no marker, so a person removes those by
hand. The same phase gave the standalone smokes their own names. `npm run
smoke:create` and `npm run smoke:verify` outside a harness now run on
`gmux-smoke-t1-<directory>` with the profile at
`${TMPDIR:-/tmp}/gmux-smoke-t1-<directory>`, so two directories never share a
server while create and verify in one directory still do. The wrapper writes
no marker on purpose, because the server has to survive between the two runs.

### Where each remote gate keeps its isolated config root

Each of these gates runs the app under its own config root and its own tmux
socket, so two of them can run at once and neither can reach the operator's
data. Pointing a probe at the wrong root produces a refused connection to a port
nothing is listening on, which reads like a broken machine and is not one. Every
base name below is read from the script in `package.json`. Since Phase 112 the
rest of the name is composed by `build/harness-socket.mjs` from the current
directory's own name, cut to 12 characters, and the process id of that script,
so two runs on one Mac never share a socket or a root. The root is the same
directory as the socket, it sits under `${TMPDIR:-/tmp}`, and the app is handed
it as `GMUX_HARNESS_DIR`.

| Gate | Config root | tmux socket |
| --- | --- | --- |
| `npm run smoke:config` | `<tmpdir>/gmux-smoke-config-<worktree>-<pid>` | `gmux-smoke-config-<worktree>-<pid>` |
| `npm run smoke:machines` | `<tmpdir>/gmux-smoke-machines-<worktree>-<pid>` | `gmux-smoke-machines-<worktree>-<pid>` |
| `npm run smoke:execplane` | `<tmpdir>/gmux-p69-exec-<worktree>-<pid>` | `gmux-p69-exec-<worktree>-<pid>` |
| `npm run smoke:remote` | `<tmpdir>/gmux-p70-remote-<worktree>-<pid>` | `gmux-p70-remote-<worktree>-<pid>` |
| `npm run smoke:capture:remote` | `<tmpdir>/gmux-p91-capture-<worktree>-<pid>` | `gmux-p91-capture-<worktree>-<pid>` |
| `npm run smoke:p93remote` | `<tmpdir>/gmux-p93-remote-<worktree>-<pid>` | `gmux-p93-remote-<worktree>-<pid>` |
| `npm run smoke:p117` | `<tmpdir>/gmux-p117-unknown-<worktree>-<pid>` | `gmux-p117-unknown-<worktree>-<pid>` |
| `npm run probe:realmachine` | `<tmpdir>/p83-real-<pid>`, made fresh on every run | none on this Mac. One scratch socket on the far machine, named `p83-<pid>-ctl` |
| `npm run probe:realunknowns` | `<tmpdir>/p83-real-<pid>`, made fresh on every run | none on this Mac. One scratch socket on the far machine, named `p83-<pid>-sockpath`, and socket `gmux` over there for the sessions it creates by name |
| `npm run probe:remotearm` | `<tmpdir>/gmux-p89-arm-<pid>`, made fresh on every run and removed at the end | `gmux-p89-<pid>`, on the scratch machine, which is this Mac over a loopback sshd. `refuseRealSockets` rejects the names `gmux` and `default` before anything starts. |
| `npm run probe:p98` | `/tmp/p98-search-<pid>`, made fresh on every run and removed at the end. It drives no Electron, so it reads no config root. | `gmux-p98-search-<pid>`, on the scratch machine, which is this Mac over a loopback sshd. `refuseRealSockets` rejects the names `gmux` and `default` before anything starts. |
| `npm run probe:p99` | `/tmp/p99-quickopen-<pid>`, made fresh on every run and removed at the end. It drives no Electron, so it reads no config root. | `gmux-p99-quickopen-<pid>`, on the scratch machine, which is this Mac over a loopback sshd. `refuseRealSockets` rejects the names `gmux` and `default` before anything starts. |
| `npm run probe:p100` | `/tmp/p100-lines-<pid>`, made fresh on every run and removed at the end. It drives no Electron, so it reads no config root. | `gmux-p100-lines-<pid>`, on the scratch machine, which is this Mac over a loopback sshd. `refuseRealSockets` rejects the names `gmux` and `default` before anything starts. It is the only tmux server this probe writes to, and it holds the one session the run makes. |
| `npm run probe:p105` | `/tmp/p105-runs-<pid>`, made fresh on every run and removed at the end. It drives no Electron, so it reads no config root. | `gmux-p105-runs-<pid>`, on the scratch machine, which is this Mac over a loopback sshd. `refuseRealSockets` rejects the names `gmux` and `default` before anything starts. This probe starts no tmux session at all. |
| `npm run probe:p106` | `/tmp/p106-branch-<pid>`, made fresh on every run and removed at the end. It drives no Electron, so it reads no config root. | `gmux-p106-branch-<pid>`, on the scratch machine, which is this Mac over a loopback sshd. `refuseRealSockets` rejects the names `gmux` and `default` before anything starts. This probe starts no tmux session at all. |
| `npm run probe:p107` | `/tmp/p107-history-<pid>`, made fresh on every run and removed at the end. It drives no Electron, so it reads no config root. | `gmux-p107-history-<pid>`, on the scratch machine, which is this Mac over a loopback sshd. `refuseRealSockets` rejects the names `gmux` and `default` before anything starts. This probe starts no tmux session at all. |
| `npm run probe:p104` | `/tmp/p104-commit-<pid>`, made fresh on every run and removed at the end. It drives no Electron, so it reads no config root. | `gmux-p104-commit-<pid>`, on the scratch machine, which is this Mac over a loopback sshd. `refuseRealSockets` rejects the names `gmux` and `default` before anything starts. This probe starts no tmux session at all. |
| `npm run probe:p104shot` | the harness root `build/harness-socket.mjs` composes, being `<tmpdir>/gmux-p104-shot-<worktree>-<pid>`. It drives the real app under that profile and never the operator's own. | `gmux-p104-shot-<worktree>-<pid>`. `activeTmuxSocket` honours `GMUX_TMUX_SOCKET` only while one of `GMUX_SMOKE`, `GMUX_SHOT`, `GMUX_UPDATE_REHEARSAL` or `GMUX_PROBES` is set, so this probe sets one. The four terms live in `src/main/harness/launch-gate.ts`. |
| `npm run probe:p127` | the same harness root. It launches the app TWICE on one throwaway profile, once with `GMUX_PROBES=1` and once with `GMUX_PROBES=0`, and reads `typeof window.__gmuxP93` over the devtools protocol each time. Armed must answer `object` and unarmed must answer `undefined`. | `gmux-p127-probes-<worktree>-<pid>`. The unarmed leg still sets `GMUX_PROBES=0`, which is a harness term for the socket and is not the string `1` the loader tests for, so the socket override stays honoured while the probes stay out. A launch with no harness term at all would attach to socket `gmux`, which is the operator's live server, and is forbidden. |

`smoke:execplane`, `smoke:remote`, `smoke:capture:remote`, `smoke:p93remote`
and `smoke:p117` all honour a `GMUX_CONFIG_ROOT` already in the environment and
fall back to the value above. `smoke:p117` is the only one of them that runs
TWO Electron launches, and both take the same `--user-data-dir`, being
`<config root>/profile`. That is what makes its restart real rather than
described: the second launch reads the manifest the first one wrote. `smoke:config` and `smoke:machines` always use the value above. The two `probe:real` rows read no
config root at all, because they drive no Electron process.

Two more gates set a config root without naming it in `package.json`, because
their harness makes a new one on every run. `npm run smoke:partition` uses
`<tmpdir>/p71-partition-<pid>` and `npm run smoke:matrix` uses
`<tmpdir>/p72-matrix-<pid>`. Both take their socket from
`build/harness-socket.mjs`, which is `gmux-p71-partition-<worktree>-<pid>` and
`gmux-p72-matrix-<worktree>-<pid>`. There is no fixed root to point at for
those two, so there is nothing to point at wrongly.

`node build/probe-execplane.mjs` reads `GMUX_CONFIG_ROOT` too, and it is the one
place the variable changes what the script does rather than only where it writes.
With the variable set the probe writes its carriage file into that root, leaves
its scratch sshd and key holder running for a harness, and prints the kill
command for both. With the variable empty it kills every pid it recorded, closes
the ssh control socket and removes its own run directory. Since Phase 71
`smoke:remote` provisions its own machine through
`build/with-scratch-machine.mjs`, so the handoff mode is a convenience a person
asks for and nothing depends on it.

The two `probe:real` rows have no fixed root. `build/real-machine.mjs` makes
`<tmpdir>/p83-real-<pid>` on every run and removes nothing else, so there is no
root to point at wrongly and nothing carries over between runs.

`npm run probe:p98` is Phase 98's live gate, being a search of a project that
lives on another machine. It makes its own repository under `/tmp`, drives
`src/main/machines/remote-search.ts` against a loopback sign in server, and
checks seventeen things. Two of them are what the phase rests on. The set of
matching lines is compared against
`git ls-files -z --cached --others --exclude-standard | xargs -0 grep -I -H -n`
run directly in that repository, and against the ripgrep this build ships, on
the same corpus. It also counts `tmux -L gmux list-sessions` before and after
and fails on a difference.

`npm run probe:p99` is Phase 99's live gate, being the file names of a project
that lives on another machine. It makes its own repository under `/tmp`, drives
`src/main/machines/remote-files.ts` against a loopback sign in server, and
checks twelve things. The one the phase rests on is the second. The set of names
Tortie holds is compared against
`git ls-files --cached --others --exclude-standard` run directly in that
repository, and it requires zero missing and zero extra. It also proves that a
folder which is not a repository answers with a walk that names nothing under
`.git` and nothing under `node_modules`, that the name cap delivers exactly what
was asked for and says it cut, and that the read left the repository byte for
byte as it found it. It counts `tmux -L gmux list-sessions` before and after and
fails on a difference.

`npm run probe:p106` is Phase 106's live gate, being the branch checked out on
another machine. It makes its own repositories under `/tmp`, drives
`src/main/machines/remote-branch.ts` against a loopback sign in server, and
checks sixteen things. Four of them are what the phase rests on. Row 5 builds a
branch that is two commits ahead of its upstream and one behind, and compares
the counts Tortie drew against `git rev-list --left-right --count` run directly
in that repository. Row 8 is a linked worktree on a second branch, and it is the
row that fails if the script ever asks with `--absolute-git-dir` instead of
`--git-common-dir`. Row 12 measures the number of external programs the far side
runs, by putting counting wrappers on PATH ahead of `git`, `base64` and `tr`, and
it prints what it measured rather than what anybody claimed. Row 13 compares
`git status --porcelain` byte for byte before and after, and the size and
modification time of every file under `.git`, because a read must leave the
repository as it found it. It counts `tmux -L gmux list-sessions` before and
after and fails on a difference.

`npm run probe:p107` is Phase 107's live gate, being the commit graph of a
folder on another machine. It makes its own repositories under `/tmp`, one of
them holding 10,000 commits, drives `src/main/machines/remote-history.ts`
against a loopback sign in server, and checks twenty one things. Five of them
are what the phase rests on.

Row 2 compares the 50 commit names Tortie drew against
`git log --branches --tags --remotes --topo-order --max-count=50 --format=%H`
run directly in that repository, name for name and in order.

Row 7 asks for 20,000 commits against the 10,000 commit repository and requires
the answer to carry 500 rows. That is the row that keeps this phase at tier 2,
because a person who cannot ask for 20,000 commits cannot make main buffer
5,400,000 bytes in one answer.

Row 9 is a linked worktree on a second branch, and it is the row that fails if
the script ever asks with `--absolute-git-dir` instead of `--git-common-dir`.

Row 13 builds a repository holding a commit and no refs at all, and requires
the answer to carry no rows. That is the measured refusal of the
`git log --stdin` shape research 57 proposed. Measured on 2026-08-20 against
git 2.50.1, `printf '' | git log --stdin` walks HEAD silently, so an empty ref
list on the far side would have answered a HEAD only walk while this end
believed it had asked for everything.

Row 16 measures the number of external programs the far side runs, by putting
counting wrappers on PATH ahead of `git`, `base64` and `tr` and running each of
eight shapes five times. It prints what it measured rather than what anybody
claimed.

Three more rows carry numbers rather than verdicts. Rows 4, 5 and 6 print the
answer bytes and the milliseconds at 100, 1,000 and 10,000 commits. Row 20
measures the two `git show` calls a commit's file diff would need, over plain
`ssh` and outside the product, because Tortie does not draw that diff on a
remote tab after this phase and the next phase should inherit a measurement
rather than an estimate. The probe counts `tmux -L gmux list-sessions` before
and after and fails on a difference, and it reads the size of the person's own
`~/.ssh/known_hosts` before and after for the same reason.

`npm run probe:p105` is Phase 105's live gate, being the workflow runs for the
branch checked out on another machine. It makes six repositories and three plain
folders under `/tmp`, drives `src/main/machines/remote-runs.ts` against a
loopback sign in server, and checks eighteen things. The property the phase rests
on is row 12. The exact bytes the door composed are printed in full and searched
for the nine words a credential would travel in, and zero hits is the pass,
because the gh program runs on this Mac and never leaves it. Row 13 puts a program
called `gh` in every folder the far side's script changes into and asserts the
witness file it would write never appears, and it asserts every gh process Tortie
made stood in this Mac's own home directory. Row 6 is a linked worktree, and it
is the row that fails if the script ever asks with `--absolute-git-dir` instead
of `--git-common-dir`. Row 17 is the end to end demonstration with the real gh on
this Mac, and it prints SKIPPED with the reason when this Mac has no gh or is not
signed in. A skipped row is never a pass. It counts `tmux -L gmux list-sessions`
before and after and fails on a difference.

### Talking to a real machine

Every remote number this product recorded before Phase 83 came from a loopback
sshd whose far side is this Mac. `build/scratch-machine.mjs` says so in capitals
in its own header, and it is right to. That carriage is a good gate and it is
not a second machine, because the client, the server, the account, the
filesystem and the tmux build are all the same computer. `build/real-machine.mjs`
is the second carriage. Its far side is a machine a person names, and it runs
only when that person asks for it.

The evidence this phase produced on this Mac is committed at
`docs/research/assets/phase83/`, with a README naming what each file is and what
it is not.

Two runners use it. `npm run probe:realmachine` measures the four exec shapes
and the eight control mode steps against the named machine. `npm run
probe:realunknowns` answers the five unknowns from research 54 section 7 and
creates, attaches to, types into and reads back one session over there.

This never runs in CI. The carriage refuses outright when `CI` is set. CI has
no second machine to reach and no person watching the run, so a carriage that
contacts a real computer has no business starting there.

#### What you set

| Variable | Default | What it is |
| --- | --- | --- |
| `GMUX_REAL_MACHINE_HOST` | none, required | The address to contact |
| `GMUX_REAL_MACHINE_CONFIRM` | none, required | The same address again |
| `GMUX_REAL_MACHINE_USER` | the name on this Mac | The account over there |
| `GMUX_REAL_MACHINE_PORT` | 22 | The port |
| `GMUX_REAL_MACHINE_TMUX` | `/usr/local/bin/tmux` | The program over there |
| `GMUX_P83_LOCAL` | none | Path to the local 3.7c measurement, so each row prints the local answer beside the far one. It is committed at `docs/research/assets/phase83/p83-local-3.7c.json`, so the usual value is that path |

#### The five refusals, asked before anything is contacted

1. `GMUX_REAL_MACHINE_HOST` is unset or empty. No machine was named, so there is
   nothing to contact.
2. `GMUX_REAL_MACHINE_CONFIRM` is not byte equal to `GMUX_REAL_MACHINE_HOST`.
   Two variables that have to agree is the whole rule that a person named this
   machine, and a leftover variable from another run refuses instead of reaching
   a machine nobody chose.
3. `CI` is set to anything at all. See the paragraph above.
4. The socket in play is `gmux` or `default`. The check is `refuseRealSockets`
   from `build/scratch-machine.mjs`, imported rather than copied, so there is one
   place that list of names lives.
5. The host resolves to a loopback address. This carriage exists to reach a
   second machine, so a loopback host means the person pointed it at the wrong
   thing.

A sixth check runs after the gate and is not a refusal of the same kind. The
carriage sends one `true` over the connection and ends the run with exit 3 when
it cannot sign in. Without it, a command that could not authenticate exits 255
with an empty answer, and an empty session list reads exactly like a machine
holding no sessions.

#### The session ledger, which outranks every result

Nothing this harness runs may kill, rename or reconfigure a session it did not
create, on either side. The rules are mechanical rather than promised.

1. Every scratch session name is `zz-p83-<what it is>-<pid>`.
2. `createSession` refuses a name that does not start `zz-p83-`.
3. `killSession` refuses a name that does not start `zz-p83-`, and it sends
   `kill-session -t '=<name>'`, which is the exact match form. It never sends a
   bare name.
4. The far machine's session list is read before anything and after everything,
   and the two are compared. A difference other than this run's own rows is a
   failure whatever else passed.
5. The far machine's socket is `gmux`, because that is the socket the product
   uses and the point is to measure what the product meets. Reading it is free.
   Every write to it goes through the two name checked functions above.
   `probe:realmachine` writes to it not at all. It reads that socket's session
   list twice and runs every shape and every step on a scratch socket instead.
6. This Mac's own `-L gmux` server is counted before and after with
   `list-sessions`, read only, and a moved count is a failure.
7. `kill-server` is sent from exactly one file of this carriage,
   `build/probe-real-machine.mjs`, at the control step that measures what the far
   side says when its server ends. Its socket argument is composed by
   `scratchSocket`, every name that composer builds starts `p83-`, and the
   composer asks `refuseRealSockets` as well. Read the composer rather than the
   sentence. There is no `pkill` and no `killall` anywhere in this carriage.

#### What it reads and what it never writes

It never reads the operator's `machines.json`. Every value comes from the
environment. It never writes into Tortie's data directory. It copies Tortie's
own identity record and the person's `~/.ssh/known_hosts` into its run directory
and points `UserKnownHostsFile` at the copy, so `StrictHostKeyChecking=yes` can
succeed on a machine the person already knows while both originals stay closed
to writing. Each runner prints the size and modification time of both originals
at the end and fails when either moved.

#### The five unknowns, and which of them is answered today

Research 54 section 7 names five unknowns. Phase 83 was meant to close all five
against mac-pro and closed none of them there, because this Mac holds no ssh key
that machine trusts. `ssh-add -l` answers "The agent has no identities" and
`~/.ssh` holds no private key at all, so every sign in to mac-pro ends with
"Permission denied (publickey,password,keyboard-interactive)" and exit 255. The
harness exits 3 rather than reporting a pass, which is the behaviour that is
wanted. A person has to put a key on this Mac that mac-pro trusts before any row
below can say mac-pro.

Four of the five have a local answer. A local answer is a real measurement of a
mechanism and it is not an answer for mac-pro, so both are stated on every row.

| Unknown | Answered on this Mac | Answered on mac-pro | The command |
| --- | --- | --- | --- |
| 1. What PATH a pane gets | yes, and it changes how a remote agent must be launched | no | step 17b of `npm run probe:execplane` |
| 2. `new-session -c <a path that is not there>` | yes, and it made an existing refusal dead code | no | `new-session -d -s NAME -c /p83-not-there -P -F '#{session_id}'` |
| 3. What `#{session_activity}` reports | yes, and it contradicted this tree | no | `list-sessions -F '#{session_activity} #{window_activity}'` at three moments |
| 4. What a reboot does to the tmux socket directory | yes, once | no | `stat -f '%SB' /private/tmp/tmux-501` against `sysctl -n kern.boottime` |
| 5. The far sshd channel ceiling | no. This Mac's own file says nothing about another machine | no | `grep -i maxsessions /etc/ssh/sshd_config` |

**Unknown 1, measured 2026-08-18 by step 17b of `npm run probe:execplane`, on
tmux 3.6a over a real ssh carriage.** A pane was made with
`new-session -d -s NAME -- /bin/sh -c 'printenv PATH > FILE'` and the file was
read back. It was done twice, with `set-environment -g PATH <the login shell's
list>` sent again in between. That is the command
`src/main/machines/remote-server.ts:161` sends when it boots a machine's server.

```
                                  what PATH read
the login shell (-lc)             /Users/gdc/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:...
the pane, first reading           /Users/gdc/.cargo/bin:/usr/bin:/bin:/usr/sbin:/sbin
the pane, after the command       /Users/gdc/.cargo/bin:/usr/bin:/bin:/usr/sbin:/sbin
show-environment -g PATH          the login shell's list, in full
```

The pane does not get the login shell's list. The server holds that list and
hands none of it to the pane, which is research 47 section 2's local finding
holding on the remote side as well. So a remote create cannot launch an agent by
bare name, because `/opt/homebrew/bin` is not on the pane's PATH. The Phase 84
entry in `docs/BACKLOG.md` carries the two candidates for what it does instead,
being an `-e PATH=` pair on the `new-session` line or an absolute program path.

What is not true here. This probe cannot produce a server that never had PATH
set, because step 5 of the same run sets it. Both readings agree, which is a
stronger answer than one reading, and neither of them is that third state.

**Unknown 2, measured 2026-08-18 on tmux 3.6a at `/opt/homebrew/bin/tmux`, over a
scratch socket.** The create exited 0, printed `$0`, and made a live session whose
pane sat in `/Users/gdc` rather than the folder that was asked for. tmux printed
no error of any kind, and `capture-pane` on that pane was empty. So
`createFailure` at `src/main/machines/remote-sessions.ts` can never turn this
case into `REMOTE_DIR_MISSING`, because a create that exits 0 throws nothing. The
Phase 84 entry in `docs/BACKLOG.md` carries the full measurement and the fix,
which is a read only check before the create rather than a rule about tmux's
error text.

**Unknown 3, measured 2026-08-18 on tmux 3.6a at `/opt/homebrew/bin/tmux`, over a
scratch socket.** One session was created, left alone for three seconds, and then
made to print a line. `#{session_activity}` read 1787079802 at all three moments.
`#{window_activity}` read 1787079802 at the first two and 1787079805 after the
line was printed. So `#{session_activity}` is not evidence that a session printed
something, and a remote row never reads `running` because work happened. The
Phase 85 entry in `docs/BACKLOG.md` carries this measurement and acts on it. The
operator's own server was counted at 34 sessions before and 34 after.

**Unknown 4, measured 2026-08-18 on this Mac, once.** `/private/tmp/tmux-501` was
born at 2026-08-09T13:59:54. This Mac last booted at 2026-08-09 11:46:27, read
from `sysctl -n kern.boottime`, and has been up 9 days since. The directory is
2 hours and 13 minutes younger than the boot, so nothing in it survived that
reboot and the directory was made again afterwards. That is one measurement on
one machine and it is not a rule. It is not measured on mac-pro, and finding 9 of
research 54 stays written as two branches until it is.

**Unknown 5 is open and nothing here narrows it.** This Mac's
`/etc/ssh/sshd_config` carries `#MaxSessions 10` at line 43, commented, so
OpenSSH's compiled default of 10 channels on one connection applies here. That
sentence is about this Mac. It says nothing about mac-pro, whose file nobody has
read, and `sshd -T` needs root so even here the effective value was not read back
from the running program.

### Environment variables for the tmux work

| Variable | What it does |
| --- | --- |
| `GMUX_TMUX_BIN` | Names the tmux binary a development build uses, in place of the PATH probe. A packaged Tortie ignores it and logs one warning, so it cannot redirect a user's copy. It is what lets the interop probes drive a real version pair instead of simulating one. |
| `GMUX_TMUX_TARBALL_DIR` | A directory holding the three source tarballs `build/build-tmux.mjs` needs, for an offline or air-gapped build. Files found there are used in place of a download and are checked against the same pinned hashes, so the escape hatch cannot smuggle different sources in. |

## tmux safety

Tortie only ever talks to its **private** tmux server:

```sh
tmux -L gmux -f resources/gmux-tmux.conf <command>
```

It never reads `~/.tmux.conf`, never touches the default `tmux` server, and
its config keeps the private server alive with zero sessions (`exit-empty off`).
That server, not the GUI, is the durability boundary.

Phase 41 closed the bundling question the [pre-build architecture assessment](docs/audits/2026-08-09-prebuild-architecture-assessment.md) (§5, Stream A1) left open.
A packaged Tortie runs the tmux inside its own bundle. A development build
still runs the system tmux, so the two can differ on the same machine, and
`GMUX_TMUX_BIN` is how you point a development run at the bundled copy.

Tortie adopts a new tmux only when it CREATES a server, which in practice means
after a reboot. It never restarts, signals, reconfigures or upgrades a server
that is already running. On a warm server it reads the server's version before
the first attach and stops the boot with a screen when the pair is one it has
not tested. The reasoning and the measurements are in
[docs/research/43-bundled-tmux.md](docs/research/43-bundled-tmux.md).

## Layout

```
src/main/       Electron main: window, (later) tmux/, manifest/, attach/, git/, watcher/, fs/, ipc.ts
src/preload/    The typed window.gmux bridge (contextBridge, isolation on)
src/shared/     FROZEN contracts: types.ts (domain), ipc.ts (channels + GmuxApi)
src/renderer/   React app: app/ (shell), terminal/, scm/, tree/, editor/, styles/
resources/      gmux-tmux.conf (private server config)
```

`src/shared/` is the contract every work stream codes against: append new
types/channels, never change existing declarations.

## What is still called gmux, and why

The Phase 16.5 rename changed what the USER sees. It deliberately changed none
of the identifiers that live data is already bound to, because renaming those
would strand it:

| Still `gmux` | Why it can never change |
| --- | --- |
| tmux socket `-L gmux` | Every live session is on that socket. Rename it and the app starts a second, empty server while the user's work sits unreachable on the first. |
| `resources/gmux-tmux.conf` | Passed as `-f` to the running server; paired with the socket above. |
| tmux session options `@gmux-id`, `@gmux-agent`, `@gmux-session-id` | Stamped into sessions that are running RIGHT NOW. They are how the app proves a live session is its own — and, by the same rule, how it knows not to touch anyone else's. |
| `GMUX_SESSION_ID`, `GMUX_MANAGED` pane env | Same argument, plus users' own tooling may read them. |
| `<userData>/gmux/` (manifest, snapshots, hooks, dropped images) | Copied wholesale by the migration; renaming it inside the copy would be a second migration for no gain. |
| `window.gmux` preload bridge, `gmux-asset:` scheme, `gmux.*` localStorage keys, `gmux-*` CSS classes | Private to the process. The localStorage keys in particular carry the user's tab order, layouts and one-time-tip flags. |
| `GMUX_*` env vars and `[gmux]` log prefixes | Developer surface: harness switches and greppable log lines, never shown in the UI. |

## The keychain and the harness (2026-08-16)

Harness launches run Chromium with `--use-mock-keychain`, appended in `src/main/index.ts`
whenever `GMUX_SMOKE` or `GMUX_SHOT` is set. Do not remove it, and do not launch Electron
with a redirected HOME outside those modes. The reason is an incident. Chromium stores its
safe-storage key in the default keychain, a probe with a redirected HOME has no keychain
there, and macOS answers with a modal alert reading "A keychain cannot be found to store".
Keychain prompts queue system-wide behind one modal. One unanswered dialog on an unattended
machine therefore blocks every later process that touches the keychain, including claude
reading its own credentials at boot, and the visible symptom is a harness that hangs with no
output and no error on every tree at once. If a harness ever hangs that way again, look at
the machine's screen first.

One more path belongs in the same list, and it is not a `gmux` spelling. It is
execution bearing all the same:

| Never move | Why |
| --- | --- |
| `Contents/Resources/bin/tmux` | The bundled tmux, added in Phase 41. Three separate things key off that exact path. `build/sign-nested-binaries.cjs` signs it with the identifier `com.itavero.tortie.tmux` and `mac.signIgnore` in `electron-builder.yml` names the same path, so the two lists must stay in step or notarization rejects the build. macOS attributes file access grants to the responsible process, so every grant an agent's pane has earned is tied to that path. And the server started from it outlives the app on purpose, which means the path has to still be there when the app comes back. |
