# Phase 371 — "History is read when git's own data moves, not when a file is saved" — SPEC

Written by the spec step on 2026-11-24 in `/private/var/tmp/tortie-wt/wt-p371`, a detached worktree at origin/main
`e424fc64` (its code is 0.116.0's). **`git diff e424fc64` in the worktree must be exactly Phase 371's delta**, this file
included. origin/main may move while the phase runs; nobody here rebases, pulls or merges; the main session moves the
tree at landing. The charter is `docs/BACKLOG.md` "## Phase 371" (`:45504`), bound as written except where §0.1 says the
tree or a measurement wins. The rules it keeps: Phase 151's (a dropped batch re-reads, because nothing is known about
what was in it), Phase 163's (a drop is counted and is never a number on a surface), Phase 198's (a file's history is
re-read on the same beat as the log), Phase 199's (a change search on screen is never re-run by a repository change; the
newest walk owns the pane), Phase 365's D9 (a watch that waited re-reads once) and its one-queue host, and
`src/renderer/state/repo-changed.ts`'s header (one debounce, every surface woken in the same tick). His standing rulings
bind: **no regression against today** (a scenario worse than the parent is a defect: fix it or drop the part, and name
which); Tortie never ends a session on its own; just enough words; no tmux vocabulary in anything a person reads;
nothing released, tagged, version-bumped, archived or uploaded; refusal 1; his session count is allowed
(`build/electron-run.mjs`'s read-only census around a launch that names `tmuxSocket`).

| | |
| --- | --- |
| Subject | `perf(scm): read history only when git's own data moves` (the entry's) |
| First body line | `Phase 371: a saved file no longer re-reads history, branches and remotes` (the entry's) |
| Semver | Patch. One CHANGELOG item under `## Unreleased`, `### Fixed` (§5). No release: that waits for his word |
| Lane | Build: Spec → Build (THREE builders, disjoint files) → Integrate → Verify (two lenses) → [Fix once → Reverify] → Commit |
| Tier | **3**: it decides when processes start, it claims nothing a person sees gets staler, and the number comes from his report through Phase 370's audit, so the parent measurement is mandatory (done, §2.1). The risk is STALENESS. Two independent methods at least, one an attack (§10) |
| The cure | **The change says whether git's own data may have moved (`gitMoved`), true unless the watcher knows better; History, Branches, the remotes panel and each file's history answer only those, plus any read that has not yet been answered; and the reads a change causes run one at a time with one behind** (D1 to D16). Measured at the parent: 10 git commands a saved file with the Explorer in front, 15 with Source Control and a diff tab, 218 and 318 alive at once under a git held 10 s (§2.1) |
| Menus | **No row added, renamed or removed** |
| Contract | `git:changed`'s payload gains one optional second value (`src/shared/ipc/base.ts`). **`docs/audits/contract-baseline.txt` does not move**: it has no event section (§0.1 item 2). `gate:contract` must read byte for byte, and a diff there is a finding |
| `HELPER_USER_FLOOR` | **193 → 194**: `build/p371/probe-p371.mjs` reaches `build/electron-run.mjs` (obligation 1; `build/assert-electron-teardown.mjs:702`) |
| CHANGELOG | One item (§5); the commit link is added by the follow-up docs commit |

## 0. The hard rules, stated once (every builder, the integrator, every verifier, the fixer, the reverifier)

- NEVER commit, stage or stash in `wt-p371`, `wt-p371-parent` or any checkout of his (the scratch repositories a probe
  makes are yours to commit in). `/Users/gdc/gmux` is read only. `wt-docs` and `wt-p373` are not ours: never touch them.
  Scratch lives under `/private/var/tmp/tortie-wt/scratch/p371/<role>/`, never under `/private/tmp`; a probe's `TMPDIR`
  points there too.
- **His machine is busy with his own work.** Wherever more than 20 git children can be alive at once, the `git` first on
  the app's PATH is the STAND-IN (§8.1), which logs its start and end, SLEEPS for the hold in zsh with no child, and only
  then runs real git. A held cell runs at most 45 s. Before any held cell read `sysctl -n vm.loadavg`: above 60, wait 2
  minutes and read again (up to 20 minutes, then run it and say the load). Say the load beside every timing, and read
  every timing against the parent in the same session, alternated. `memory_pressure | grep percentage` under 20 percent
  free with swap growing means start nothing and report. The parent's held 10 s cells reached 289 (table) and 318 (log)
  alive; the fuse is 420 and a blown fuse ends its launch.
- **Git on the app's PATH.** Main starts `git` by bare name (`src/main/git/exec.ts`), and `installUserPath` replaces its
  PATH with the one its login shell answers (`SHELL=/bin/sh`). So the stand-in's folder is first on the launched app's
  PATH AND on the PATH the scratch HOME's rc files set, and a probe refuses (exit 2) unless `/bin/sh -lic 'command -v
  git'` answers the stand-in before the launch and a git call whose parent is the app's own pid reached it after. The
  real git is `/usr/bin/git` (2.50.1). Every git a probe runs, inside the app or from a terminal, has HOME in scratch,
  `GIT_CONFIG_GLOBAL=/dev/null` (a scratch file in the arms that need a global file) and `GIT_CONFIG_NOSYSTEM=1`. Every
  repository is a scratch one, every remote a bare repository on this disk by path: no network remote, ever.
- The spec step's instruments are kept for you: read them, do not import them. Under
  `/private/var/tmp/tortie-wt/scratch/p371/spec/`: `moves.measure.test.ts` and `special.measure.test.ts` (the moves
  table over the PARENT's shipping `RepoWatcher` and real FSEvents; `moves.jsonl`, `special.jsonl`), `proto/` (a copy of
  the parent's `src/` with the PROTOTYPE `src/main/watcher/git-data.ts` and `repo-watcher.ts`),
  `proto.moves.measure.test.ts` and `proto.special.measure.test.ts` (`proto-moves.jsonl`, `special-proto.jsonl`),
  `run.sh`/`runp.sh`, and `app/` (`git-hold.zsh`, `driver.mjs`, `lockrun.sh`, `all.out`) with `runs/*.json`. **The
  prototype is evidence, not the build.** It lacks D6's guards.
- `-L gmux` is named only by `build/electron-run.mjs`'s census, and only with `list-sessions`. Never `pkill`, `killall`,
  a `pgrep` pattern or a negative pid; end only pids you started, each read again by `ps -p <pid> -o command=` right
  before its signal; every writer, stand-in, sleeper and app ends in a `finally`; leftovers at the end are 0. His Tortie
  (a bare `Tortie`, pid 50568 on 2026-11-24; read it again yourself) and its sessions, his tmux server, his other Claude
  sessions and his tools are never signalled. Never an Apple Event, `osascript` or `open`. Never signal a probe while
  its own teardown runs.
- Never open, copy, read or stat-for-content his live Tortie profile, his keychain, credentials, `~/.ssh`, `~/Keys`,
  `~/.claude`, `~/.codex`, `~/.gitconfig` or any agent's or conversation store; never a crash report under
  `~/Library/Logs/DiagnosticReports`.
- **His shell history is never written by us.** What does not launch an Electron or need `/bin/ps` runs under the
  history block (`zsh /private/var/tmp/tortie-ops/sb.sh <dir> "<command>"`); the four `/bin/ps` native tests cannot pass
  inside it, name each as it fails. What needs `/bin/ps`, `lsof` or Electron runs outside it with HOME and ZDOTDIR in
  scratch, `HISTFILE=/dev/null`, `SHELL=/bin/sh`, `TERM_SESSION_ID` and `TERM_PROGRAM` unset, and you say so. NEVER
  Electron, a smoke or a probe under `sandbox-exec`. Record only `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before
  and after every run (the spec step read `751833 1795554792` and `23166 1790702242` at its start, and §2.5 at its end; take your own). A move across an
  unblocked run: start nothing for 3 minutes and stat again; moved again while nothing of yours ran is his; still moved
  means STOP and report.
- No real agent runs, not even for a version: a probe hides every probed registry row
  (`writeHiddenAgents(profile, 'p371', hiddenAgentsBesides([]))`) and reads `agents:list` back
  (`standInsOnlyVerdict(list, { standIns: [] })`). `conformance:resume:capture` and `conformance:resume` are NOT run.
  `smoke`, `smoke:t1`, `smoke:t3` and the package are the main session's alone. No Simulator. No network.
- The lock has three slots: `zsh /private/var/tmp/tortie-ops/lock.sh try p371-<role>` (retry every 60 s in a NEW
  command), released in a trap or `finally`; every probe or Electron run holds one and no longer than the run. `df -h /`
  before any build or clone; under 8 GB free, wait and report. No dependency moves: never `npm install` or `npm ci`.
- **The parent** is `/private/var/tmp/tortie-wt/wt-p371-parent`, built once
  (`/private/var/tmp/tortie-wt/scratch/p371/main/parent-build.log` ends `exit 0`). Nobody edits it.

## 0.1 What the entry and the parent reading give, measured (the tree and the measurements win; each binds)

1. **`state/git.ts`'s own log is never loaded by anything.** `refreshLog` (`:245`) is reached from the change listener
   (`:208-217`), `refreshAll` (`:263`) and `commit` (`:328`), each only when `log !== null`, and nothing sets it first.
   So `state/git.ts:208-217` starts no history read today. It is gated all the same (D10), because the entry says so and
   it would start one the day something loads it.
2. **The contract baseline holds no event payload.** Its sections are `[ipc.invoke.channels]`, the SQLite three,
   `[localStorage.keys]`, `[env.names]`, `[harness.smoke.modes]` and `[bundle.refusals]`. `git:changed`'s payload is the
   type in `src/shared/ipc/base.ts:97`. The entry's "the baseline moves by the event's payload alone" comes true as "it
   does not move". Beware: the generator reads any quoted `gmux.<a>.<b>` text as a storage key (`gmux.git.onChanged` is
   line 393 for that reason), so no builder writes a new one.
3. **The counts, at git's own speed, are 10 a change (Explorer) and 15 (Source Control and a diff tab), not 9 and 14.**
   The entry's 9 and 14 were read with git held 10 s, where a walk's first round outlives the gap and fewer start. A
   third of the 15 is **the followed file's history** (`fetchFile`, Phase 198), which the entry's item 4 leaves out of
   "the four reads": one more `rev-parse`, `symbolic-ref`, `for-each-ref`, `remote` and `log` a window a change, up to
   eight windows, with no queue and no bound. D9 puts it under the same line.
4. **A linked worktree loses more than refs.** From inside it, branch made/renamed/deleted, tag, stash drop, push,
   remote and upstream changes, `pack-refs`, `gc`, `update-ref` and `replace` reach NO stream at the parent; a commit is
   seen only because it rewrites the worktree's own `index`. From another worktree, nothing is seen at all (§2.2).
5. **More is shown only by accident than the entry's two.** (a) a reftable repository: its branch, tag, push,
   `reset --soft`, `update-ref`, `symbolic-ref`, `replace`, stash drop, `pack-refs` and `gc` reach no stream, because the
   refs live in `.git/reftable/`; (b) `config.worktree`; (c) a file a config includes, and the person's global git file;
   (d) `info/grafts`, `shallow` and `objects/info/alternates`; (e) a project that is a FOLDER INSIDE a repository: it has
   no `.git` of its own, so no `.git` watch, ever; (f) a git directory whose `refs`, `packed-refs` or `config` is a
   symbolic link out of it (git's own `git-new-workdir`, Android's `repo`); (g) `.git` removed and made again, renamed
   away and back, or a `.git` FILE rewritten to point elsewhere: **the `.git` stream is dead from then on and says
   nothing**, no error, the same path and, for a rename back, the same inode (§2.3); (h) `git init` in an open folder,
   which no stream sees until a file is saved; (i) a read that FAILED: the next saved file asked it again.
6. **The index is git's data here.** `git add` and a `git status` that refreshes stale entries write `.git/index`, which
   the relevance filter names, so they read as a move (the entry's "a relevant `.git` event"). A plain `git status` with
   nothing to refresh writes only `index.lock`, which the filter refuses: no flush. Tortie's own reads write nothing
   under `.git` (`GIT_OPTIONAL_LOCKS=0`; over a 30 s cell of 61 changes the fixture's `.git/index` kept its time).
7. **`hasCommitGraph` is drawn nowhere in the renderer**, so a `commit-graph write` (invisible to every stream) is not a
   thing a person can see go stale, and nothing is done for it. `%an`, not `%aN`, is read, so a saved `.mailmap` moves no
   answer.
8. The entry's line numbers hold at `e424fc64`, but `resolveDotgitDir` is `repo-watcher.ts:626-646` (the entry says
   `:664-688`) and `scheduleFlush` `:551-569`.
9. Three rows of `src/renderer/state/__tests__/repo-changed.test.ts` (`:70`, `:101`, `:103`) compare the listener's
   arguments exactly and are edited by name (§7.2). No watcher or bus test does.

## 1. The answer first

A saved file reaches History as the same message a commit does, so History asks git for everything again on each one.
The watcher already knows which of its two streams spoke and drops it. This phase keeps that one bit. It is **true
unless the watcher is sure**: sure means a `.git` stream is attached and alive, the whole of the repository's refs live
under it, and the handful of other files git's answers depend on read exactly as they did at the last flush (34 µs of
file stats a flush, measured). Anything else (a linked worktree, a folder inside a repository, a symlinked git
directory, an include that cannot be followed, a dead or replaced stream, a drop, the first flush) is "may have moved",
which is today's behaviour. The prototype of the watcher half ran the whole moves table (§2.4).

Who may use the bit: `src/renderer/scm/depth.ts` and `src/renderer/state/git.ts`'s `refreshLog`, and nobody else. Every
other consumer is woken exactly as today:

| Consumer | Answers a change with | Uses `gitMoved` |
| --- | --- | --- |
| main `git/ipc.ts:116` | the event to every window | carries it |
| main `quickopen/coordinator.ts:255` | marks a held index stale in its worker | no |
| main `symbols/service.ts:376` | one rebuild of a live index, debounced | no |
| main `arch/watch.ts:98` | a settle and a check of an ARMED repository | no |
| main `actions/service.ts:565-620` | for an observed repository: `rev-parse` of the upstream and of HEAD, to arm a push watch; one at a time (`armBusy`) | **no, left as it is**: the entry's words do not cover it, and it is how a push made in a terminal is noticed |
| renderer `tree/FilesSection.tsx:363` | listings, the ignore check, its own status | no |
| renderer `state/git.ts:208` | `git status` (one in flight, one behind) | no; `refreshLog` yes (D10) |
| renderer `editor/store.ts:896` | a walk of the open tabs (`git show`) | no |
| renderer `scm/runs.ts:206` | `gh` for an observed repository | **no, left as it is** |
| renderer `scm/depth.ts:411` | the four reads and every file window | **yes (D8, D9)** |
| renderer `search/SearchView.tsx:286` (the raw event) | a "results may be stale" flag | no |

## 2. What the spec step measured, how, and the numbers

### 2.1 The parent in the real app (Method 1's baseline)

`app/driver.mjs`, one launch a cell through `withElectron` (`program: 'app'`, `cwd` the parent, `tmuxSocket` named)
inside `build/harness-socket.mjs --fresh gmux-p371s`, a lock slot each, HOME, ZDOTDIR, TMPDIR in scratch. The fixture:
10 folders, 61 commits, 4 branches, a bare remote by path, one uncommitted change. The writer adds one file every
200 ms for 30 s and takes away the one before; no git operation. The counting git holds every subcommand but
`check-ignore`.

| Cell | Changes | `for-each-ref` | `remote` | `rev-parse` | `symbolic-ref` | `log` | The five, a change | `status` | Most alive (log / process table) | Load before → after |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Explorer, git's own speed | 61 | 183 | 122 | 122 | 122 | 61 | **10.0** | 61 | 9 / not seen | 61 → 53 |
| Explorer, held 1 s | 62 | 186 | 124 | 122 | 122 | 60 | 9.9 | 29 | 29 / 27 | 23 → 23 |
| Explorer, held 10 s | 63 | 189 | 126 | 106 | 106 | 43 | 9.0 | 3 | **218 / 195** | 11 → 11 |
| Source Control + a diff tab, own speed | 71 | 284 | 213 | 213 | 213 | 142 | **15.0** | 71 (+71 `show`) | 13 / not seen | 32 → 23 |
| the same, held 1 s | 70 | 280 | 210 | 208 | 208 | 136 | 14.9 | 29 (+29) | 47 / 42 | 26 → 25 |
| the same, held 10 s | 61 | 244 | 183 | 162 | 162 | 80 | 13.6 | 3 (+3) | **318 / 289** | 39 → 41 |

Beside `build/p370/SPEC.md` §2.4: the starts a change agree to the first decimal (222/75 = 3.0 and 296/74 = 4.0
`for-each-ref`; 2.0 and 3.0 `remote`). Its 227 and 355 alive are ours at 63 and 61 changes rather than 75 and 74: the
load made this run's writer slower, and the per-change rate is the same. Its "about 9" and "about 14" are the held 10 s
rates (§0.1 item 3). What its one `log` row hid: at Source Control there are TWO walks a change, History's and the
followed file's. The log's count of "alive" closes a child main itself ended at its hold, so it reads a little high; the
table (every 250 ms) reads a little low. Both are given.

### 2.2 Every way git's data moves, over the parent's shipping `RepoWatcher` and real FSEvents

`moves.measure.test.ts` (vitest, history block): twelve shapes, 42 to 52 operations each (593 rows, no watcher error,
no drop), each with a listing before and after and the two private handlers teed. "At once" is a flush because a
relevant `.git` event arrived; "accident" is nothing until an unrelated file is saved.

| What moves | The path on disk | Ordinary, sha256, separate git dir, submodule, shallow, `.git` a symlink | Linked worktree, bare + worktree | Reftable | This phase |
| --- | --- | --- | --- | --- | --- |
| commit, amend | `refs/heads/*`, `index` | at once | at once, through `index` only | at once, through `index` only | true at once; linked: every change |
| reset --soft | `refs/heads/*`, `ORIG_HEAD` | at once | at once, through `ORIG_HEAD` | **accident** | reftable: `reftable/tables.list` joins the filter |
| reset --hard, checkout, merge, cherry-pick, rebase, stash | `HEAD`, `index`, `refs/*`, state files | at once | at once, through `HEAD`/`index`/`ORIG_HEAD` | at once, through `index` | true at once |
| branch made, renamed, deleted; tag; stash drop; `update-ref`; `replace` | `refs/*` (+ `config` for rename/delete) | at once | **accident** | **accident** | reftable: at once; linked: every change |
| `symbolic-ref HEAD` | `HEAD` (reftable: the table) | at once | at once | **accident** | at once |
| push | `refs/remotes/*` | at once | **accident** | **accident** | the same |
| fetch | `FETCH_HEAD`, `refs/remotes/*` | at once | at once, through its own `FETCH_HEAD` | at once, through `FETCH_HEAD` | true at once |
| remote add, rename, set-url, remove; upstream set, unset; `config` | `config` | **accident** | **accident** (the common `config`) | **accident** | `config` joins the filter: at once, and earlier than the parent; linked: every change |
| `config --worktree` | `config.worktree` | **accident** | **accident** (its own) | **accident** | joins the filter |
| `pack-refs`, `gc` | `packed-refs`, loose refs | at once | **accident** | **accident** | at once; linked: every change |
| a file a config includes; the global git file | outside `.git` | **accident** | **accident** | **accident** | the stamp (D5): true at the next flush, as the parent |
| `info/grafts`, `shallow`, `objects/info/alternates` | as named | **accident** (a `fetch --unshallow` at once, through `FETCH_HEAD`) | **accident** | **accident** | the stamp |
| `commit-graph write` | `objects/info/commit-graph` | no stream | no stream | no stream | nothing drawn reads it (§0.1 item 7) |
| moved from ANOTHER worktree: commit, branch, fetch, remote | the common `refs`, `config` | **from the main worktree's project: at once** (`remote add`: accident) | **accident, all four** | — | main: at once; linked: every change |
| the same in a symlinked git dir (`git-new-workdir`) | outside `.git` | — | **accident** | — | every change (D4) |
| a project that is a folder inside a repository | the repository's `.git`, above the project | **accident, every one** | | | no `.git` stream: every change |
| a saved file, tracked or not | none | the worktree stream, one flush | the same | the same | **false** where whole |

### 2.3 The `.git` directory itself (`special.measure.test.ts`, the parent)

| What happens | The parent |
| --- | --- |
| `git init` and a first commit in an open folder | no flush at all; at the next saved file one flush, which attaches the `.git` watch; after that a branch flushes |
| `rm -rf .git`, `git init`, commit, branch | one root-delete event, then **nothing ever again** from the `.git` stream, `dotgitSub` still set, no error |
| `mv .git .g` and back (the same inode) | the same: a branch made afterwards reaches no stream |
| `.git` swapped for another repository's | this time the stream went on speaking; it must not be relied on |
| a separate git directory moved and the `.git` file rewritten | dead: branches in the new place reach no stream |
| `.git` a symbolic link | whole: branches and commits flush |
| `refs` a symbolic link out of `.git` | a branch reaches no stream |
| 1,000 files and a branch in one window | one flush, both streams in it |

Over the 593 rows of §2.2 no ordinary operation delivers an event whose path is the git directory itself.

### 2.4 The prototype over the same tables

`proto/`: §4.1's `git-data.ts` and flush rule laid over a copy of the parent's `src/`, then the same two files with a
save after every step.

**Read over all twelve shapes (593 rows, no watcher error): no move the parent showed at once read anything but true at
once, in any shape.** In the eight shapes that can be watched whole (ordinary, reftable, linked-main, submodule, include,
separate git directory, sha256, shallow) `config`, `config.worktree` and every reftable move read true at once where the
parent flushed nothing; each of grafts written, grafts removed, alternates, the global file and the included file read
true at the next save and false at the one after; and a save read **false in every other case** (44 of 48 a shape, 48 of
52 in linked-main, 44 of 49 in include). In the four that cannot (linked, bare + worktree, new-workdir, a folder inside a
repository) every save read true, 52, 48, 52 and 52 of them. `pack-refs` with nothing to do in a reftable repository, a
`commit-graph write`, a push that moved nothing and a `git status` with nothing to refresh flush nothing and read false
after, as the parent. The prototype follows an include anywhere; under D6 that shape's included file, outside HOME and
the project, makes it an every-change shape.

The special table: after `rm -rf .git`, a rename away (and back), a swap or a rewritten pointer, every later save reads
true; after `git init` the attaching save reads true and the flush after it too, then false; a `.git` symlink reads
false at a save; `refs` symlinked reads true at every save; the burst reads one true. The stats cost **33.6 µs a flush**
(1,000 runs, load 24).

### 2.5 The spec step's commands

| Command | Exit | Numbers |
| --- | --- | --- |
| `stat -f '%z %m' ~/.zsh_history ~/.bash_history` (start, around every app run, end) | 0 | `751833 1795554792` and `23166 1790702242` at the start and around all six app runs. At the end the first read `751864 1795559147` (written at 17:25:47, unmoved over the three minutes' wait after it was seen): the only thing of ours alive then was vitest under the history block, which cannot write it, and the last app run had ended at 17:20:47; the second unmoved |
| `run.sh moves.out ordinary`; `run.sh moves2.out <11 shapes>` (history block) | 0; 0 | 48 and 545 rows; 47.6 s and 529.7 s |
| `vitest … special` at the parent (history block) | 0 | 9 passed, 45.3 s |
| `runp.sh … ordinary`; `… <11 shapes>`; `… special` (history block) | 0; 0; 0 | §2.4; 9 passed, 66.1 s |
| `lockrun.sh driver.mjs` × 6 (outside the block: Electron and `/bin/ps`) | 0 × 6 | §2.1; slot `electron.lock` each time, released by its trap; 0 processes left naming a run folder |
| `memory_pressure \| grep percentage` around the cells | 0 | 47 to 52 percent free |
| the Electron count, once | 0 | none of this phase's: his Tortie (50568), its crash handlers, and Chrome's, Cursor's, Slack's, Granola's |
| `git status --short` in both worktrees | 0 | the parent clean; `wt-p371` this file alone |

Not run, and why: HEAD in the app (there is none); the parent's build (the main session's, `exit 0`); a real FSEvents
drop (it cannot be forced; vitest and Phase 163's fakes drive it); a sleep of the Mac (§8.2 A5 stops the app instead);
the renderer half as a prototype (its rows are §7.2's). The vitest runs above read the parent's `src/` through its own
`node_modules`; nothing was written there.

## 3. The tree at this head: the paths each item touches

- The watcher: `repo-watcher.ts` (the two handlers `:484`, `:500`; `noteDrop` `:524`; the flush `:551`; the attach
  `:572-620`; `resolveDotgitDir` `:626`; the D9 lines `:403`, `:616`), `bus.ts:39-62`, `index.ts` (re-exports).
- Main's way out: `git/ipc.ts:105-107` (`broadcastGitChanged`), `:116` (the bus), `:126-128` (`onChange:
  emitRepoChanged`), and the direct broadcasts: `git:stage`, `unstage`, `discard`, `commit` (`:280`, `:287`, `:294`,
  `:301`), `git:init` (`:344`), and `depth-ipc.ts`'s checkout, createBranch, createTag, cherryPick, checkoutDetached,
  fetch, checkoutTracking, deleteBranch, push, pull, sync through `deps.broadcast`. `emitRepoChanged` has ONE production
  caller, the watcher's `onChange`; tests call it too.
- The contract type: `src/shared/ipc/base.ts:97` and `:174`. `src/preload/bridge.ts:44-53`'s `on` passes every payload
  value already, so the preload does not change.
- The renderer: `state/repo-changed.ts:38-92`, `scm/depth.ts:398-424` (the subscriber), `:454-480`, `:505-640` (the
  reads), `:689-726` (`ensure`, `refresh`, `ensureFile`), `:943-949`; `state/git.ts:208-217`.

## 4. The design, item by item (real paths; the builder named on each)

### 4.0 The decisions

| | Decision | Where it comes from; its reason; its row |
| --- | --- | --- |
| D1 | **The fact is one boolean, `gitMoved`: "git's own data may have moved".** True, or absent, means it may have; `false` means main knows it did not. One boolean and not a closed word | The entry's item 1. A third word would have no consumer. Absent is true so that every fake, every direct broadcast and anything unthought of is today's behaviour. Rows W1, B1, R2 |
| D2 | **Set at the flush, from a pending bit.** `gitMovePending` is true at construction, and is set by a relevant `.git` event, by `noteDrop` (either stream), by both D9 re-reads and by the `.git` watch attaching. The flush takes it and clears it, in the same statement block that calls `onChange` | The entry's item 1. "Attaching" closes the gap between the flush that started the attach and the stream's start, and the boot's. Rows W1 to W7 |
| D3 | **A `.git` stream that may be dead is "cannot tell", for the life of the watcher** (`dotgitLost`): any error on it that is not a re-scan; the watcher process's restart notice (`WATCHER_RESTART_ERROR`, whose re-bind can come back with no watch and say nothing, `host.ts` `answered`); an event that deletes the git directory itself; or the git directory resolved at a flush not being the one the watch was started on (path, device and inode). It is never un-set | §2.3: the stream dies in silence. Re-attaching is a change to the watch lifecycle this phase does not need; every change counting is today's behaviour, and a project opened again starts a new watcher. Rows W10, W11 |
| D4 | **A repository whose refs are not all under the watched directory keeps today's behaviour, every change counting, and gains no watch**: no `.git` stream (a folder inside a repository, not a repository, a bare one); `commondir` present (every linked worktree); or any of `config`, `config.worktree`, `packed-refs`, `refs`, `refs/heads`, `refs/remotes`, `refs/tags`, `reftable`, `reftable/tables.list`, `FETCH_HEAD` in it a symbolic link | The entry's item 3, "the smaller one". The other choice, watching the common directory, was weighed: one subscription could be moved there, but then every commit in ANY worktree wakes every consumer (`git status`, the tree, the editor, quick open) of every open linked worktree, which is more processes than the parent starts, and his rule is no scenario worse. `main` tells the shape by file reads alone, at the flush. §14 Q1. Rows W7 to W9 |
| D5 | **The other files git's answers depend on are stat'ed at each flush, and a stamp that moved means true once**: the git directory's `config`, `config.worktree`, `shallow`, `info/grafts`, `objects/info/alternates`; the person's global git files; `/etc/gitconfig`; and every file those configs include, followed. The stamp is each file's device, inode, size, mtime and ctime, or its absence | §0.1 item 5 (c) and (d). Each is shown at the parent by the next saved file, and this shows it there too. 34 µs measured. A config event already flushes (D7); the stamp is for what no stream carries. Rows G1 to G6, W13 |
| D6 | **Following an include can never hang, or read something that is not a git file.** Only a REGULAR file (opened `O_RDONLY\|O_NONBLOCK`, then `fstat`) of at most 1 MiB is read, and its text only when its stamp moved; an include is followed (and stat'ed) only when its path is under HOME, the git directory or the project; at most 32 files and 10 deep. `~user/`, `%(prefix)/`, a quoted or continued value this reader does not take, anything outside those three folders, an unreadable file, or a `refstorage` value holding `://`, is "cannot tell", every change counting | New. `stat`, `open` and `read` here are on main's thread; a FIFO, `/dev/tty` or an automounted `/net/…` named by a hostile `.git/config` would freeze the app. The parent never reads these files. Nothing read is logged, kept (only the list of include paths is) or sent. Rows G7 to G12 |
| D7 | **`config`, `config.worktree` and `reftable/tables.list` join `DOTGIT_FILES`**; `shallow` does not. `*.lock` stays out | The entry's item 3 names `config`; the other two are §0.1 item 5's. Each wakes every consumer, as any relevant `.git` event does, so a remote or an upstream changed in a terminal now shows at once. `reftable/` as a prefix would add a wake per temporary file. Row W12 |
| D8 | **History answers a change by what it carries**: `gitMoved` true, the four reads; false, only the reads that are OWED (D11). Every file window the same: true, all; false, only one that has no rows or an error | The entry's items 2 and 4. Rows H1, H2, H8 |
| D9 | **The reads a change causes run on a line: one in flight per repository and one behind it, for each of the four; and per file window, for `fetchFile`.** The line is one small helper, `src/renderer/scm/one-behind.ts`. A call arriving while one runs marks one behind and adds nothing more. `ensure`'s branches, remote branches and remotes, `loadRemotes` and `loadFetchAge` go through the line too. `refresh` (the ↻, and what every Tortie checkout, commit, fetch, pull and push calls), `loadMore`, `setLogScope`, `setQuery`, `ensure`'s walk and `runSync`'s read go direct, exactly as today | The entry's item 4, and §0.1 item 3 for the file windows. Direct calls keep "exactly as today", because putting a person's press behind a running read would show it up to one read later than the parent under a slow git. Rows L1 to L7, H9, H12 |
| D10 | `state/git.ts`'s listener re-reads its log only when `gitMoved` is not false; its status is unchanged | The entry's item 2; §0.1 item 1. Row S1 |
| D11 | **A read is owed until it has been answered, and again when it fails, and an owed read is asked by the next change of any kind.** A failure keeps what is on screen and starts nothing by itself. Answered means: branches, remote branches, remotes resolved; a walk that owns the pane drew. `graphLog` answering `isRepo: false`, or falling to the flat walk, or refused under a query, is a failure; a superseded walk is neither | New, from §0.1 item 5 (i) and the entry's "a failed read keeps what is on screen and starts nothing by itself": at the parent the next saved file asked it again, and a read that timed out must not stay wrong until the next commit. It costs at most what the parent costs. A History section that has never loaded is loaded by the first change, as today. Rows H3 to H6 |
| D12 | **The walk's one behind waits for whichever walk is out** (a person's, `ensure`'s or the line's), then asks Phase 199's question again (a change search on screen: no walk) and only then starts. So a change no longer ends a walk that is running; a person's walk still ends whatever runs, through Phase 199's queue | The entry: "a walk Phase 199's queue ends is still ended". At the parent each change ended the walk before it, so under a git slower than the changes History never drew (held 1 s: 60 started, none finished while the writer ran). The cost, stated: when a walk takes longer than the gap between two moves, the second move shows up to one walk later than at the parent. Rows L4, L5, H7 |
| D13 | **An older answer never lands over a newer one.** For branches, remote branches and remotes: each call takes a number, and an answer (or failure) older than the last that landed changes nothing. For a file window: the newest started owns it, as `logGen` already does for the walk | New. Direct and line calls can overlap, and at the parent a wrong overwrite was repaired by the next saved file. Rows H10, H11 |
| D14 | The renderer's bus carries `gitMoved` to every listener as a second argument; two messages in one 150 ms window join as OR, absent as true; the value is dropped with the timer | The entry's item 1. Rows R1 to R4 |
| D15 | Main's bus and broadcast take `gitMoved` with the default `true`. Every direct broadcast (stage, unstage, discard, commit, init and `depth-ipc.ts`'s) stays a call with one argument | The entry's "a Tortie commit, checkout, fetch, pull or push re-reads exactly as today". Staging and discarding write the index, which is a move anyway (§0.1 item 6). Rows B1, B2 |
| D16 | Nothing in the message, the log or a surface says a word about it; no count | Phase 163, just enough words |

### 4.1 `src/main/watcher/git-data.ts` (NEW) and `repo-watcher.ts` (builder `watcher`)

`git-data.ts` exports exactly:

```ts
/** What a flush may read of a git directory without asking git (build/p371/SPEC.md D4 to D6). */
export interface GitDataReading {
  /** True when every ref and every file git's answers depend on is either under the watched directory or in `stamp`. */
  readonly whole: boolean;
  /** The git directory's own identity: its path, device and inode; null when there is none. */
  readonly id: string | null;
  /** The named files' stats, joined. Compared, never parsed. */
  readonly stamp: string;
}
/** The include paths `text` names, or null when one cannot be followed (D6). Pure. */
export function includePathsIn(text: string, file: string, home: string | undefined): string[] | null;
/** One reader per watcher, so its small cache of include lists goes with it. Never throws; a throw inside is `whole: false`. */
export function createGitDataReader(projectRoot: string, env: NodeJS.ProcessEnv): (gitDir: string | null) => GitDataReading;
```

It imports `node:fs` and `node:path` alone: no log, no child process, no write, no `normalize`, no case folding
(conformance:samefolder rule 23), no bare `realpathSync`. Include semantics are git's: `[include]` and `[includeIf
"…"]`, any case, `path = value` on the header's line or after it, every conditional include followed whatever its
condition (a superset only costs a stat); `~/` is HOME; a relative path is relative to the file that names it; CRLF
taken; a path seen once is not followed again; a path that does not exist is stamped as absent and noticed when it
appears. Global files: `GIT_CONFIG_GLOBAL` when set (empty or `/dev/null` is none), else `$HOME/.gitconfig` and
`${XDG_CONFIG_HOME:-$HOME/.config}/git/config`; system: none under a set `GIT_CONFIG_NOSYSTEM`, else `GIT_CONFIG_SYSTEM`
or `/etc/gitconfig`. A system file of another git install is not read; its change shows at the next move (stated).

`repo-watcher.ts`:

- `onChange: (repoPath: string, gitMoved: boolean) => void`.
- `DOTGIT_FILES` gains the three names of D7, its comment saying why; `isRelevantDotGitPath` otherwise unchanged.
- The fields `gitMovePending = true`, `dotgitLost = false`, `dotgitId: string | null`, `gitStamp: string | null`, and the
  reader.
- `noteDrop` sets the bit, on either stream. `handleDotgitEvents`: an error that is not a re-scan, or is the restart
  notice, sets `dotgitLost`; an event whose relative path is `''` and whose type is `delete` sets `dotgitLost` (and
  flushes nothing by itself); a relevant event sets the bit before `scheduleFlush()`.
- The flush: `const gitMoved = this.takeGitMoved();` before `tryStartDotgitWatcher()`, then
  `this.onChange(this.repoPath, gitMoved)`.

```ts
private takeGitMoved(): boolean {
  const pending = this.gitMovePending;
  this.gitMovePending = false;
  const now = this.readGitData(this.resolveDotgitDir());
  if (this.dotgitSub !== null && now.id !== this.dotgitId) this.dotgitLost = true;
  const changed = this.gitStamp !== now.stamp;
  this.gitStamp = now.stamp;
  return pending || changed || !now.whole || this.dotgitSub === null || this.dotgitLost;
}
```

  Every operand is evaluated on every flush, so the stamp never goes stale behind a pending bit.
- The attach records `dotgitId` beside `dotgitDir`, BEFORE it asks for the watch, and sets the bit when `dotgitSub` is
  set. Both D9 lines set the bit beside their `scheduleFlush()`.
- A header paragraph, PHASE 371, saying what the fact means and that "unknown" is always true.

Nothing here adds a watch, a timer, a git process or a `watchFolder(` call (conformance:watcher rules 1, 2, W365-10).

### 4.2 The bus, the broadcast and the event (builder `watcher`)

`bus.ts`: the listener is `(repoPath: string, gitMoved: boolean) => void`; `emitRepoChanged(repoPath: string, gitMoved
= true)`. Its header's "what it deliberately does not carry" gains one line: the one bit, and that paths are still not
carried. `git/ipc.ts`: `broadcastGitChanged(repoPath: string, gitMoved = true)` sends `broadcastEvent(EVT_GIT_CHANGED,
repoPath, gitMoved)`; the two lines that hand functions over (`onRepoChanged(broadcastGitChanged)`, `onChange:
emitRepoChanged`) do not move. `src/shared/ipc/base.ts`: `'git:changed': [repoPath: string, gitMoved?: boolean]` with a
doc line ("false only when main knows git's own data did not move; absent means it may have"), and `onChanged(cb:
(repoPath: string, gitMoved?: boolean) => void)`. No other main consumer changes a byte.

### 4.3 `src/renderer/state/repo-changed.ts` (builder `renderer`)

`RepoChangedListener = (repoPath: string, gitMoved: boolean) => void`; the source's callback is `(repoPath: string,
gitMoved?: boolean) => void`. Beside `timers`, one `Map<string, boolean>` of the window's OR: `moved.set(repo,
(moved.get(repo) ?? false) || gitMoved !== false)`. `fire` reads it, deletes it with the timer and hands it to each
listener. The window, its reset by each event, the lazy attach and the snapshot are unchanged, and the header gains one
paragraph.

### 4.4 `src/renderer/scm/one-behind.ts` (NEW) and `depth.ts` (builder `renderer`)

```ts
/** One call of `run` per key in flight, and one behind it. Every caller of a window waits for the last call it needs. */
export function oneBehind(run: (key: string) => Promise<void>): (key: string) => Promise<void>;
```

The running entry is cleared in the same synchronous step that reads "nothing behind", so a call can never land between
them and be lost; a `run` that throws clears it too. `depth.ts`:

- `line.log`, `line.branches`, `line.remoteBranches`, `line.remotes` keyed by repository; `line.file` keyed by
  `fileHistoryKey`.
- `line.log`'s run: wait while `walks.get(repo)` (set by `fetchLog` to its own promise, newest wins, removed when it is
  still its own) is out; then, if the repository is gone or a change search is on screen (the same `query.change !== ''`
  test `refresh` makes, moved into one function both call), return; then `fetchLog(repo)`.
- `const owed = new Map<string, Set<DepthRead>>()` (outside the store: nothing renders it): a repository registers all
  four; a read removes itself when it lands and adds itself when it fails, by D11 and under D13's number. A bridge with
  no such method lands as answered (it asks nothing today either).
- The subscriber: `onRepoChanged((repoPath, gitMoved) => { … })`. File windows: `gitMoved || rows === null ||
  error !== null` goes to `line.file`. Then, for a registered repository, each of the four that `gitMoved` or `owed`
  asks for. Nothing is awaited.
- `fetchFile` gains a generation per key (D13). `ensureFile` and `loadMoreFile` are unchanged.
- `refresh` keeps its body and its `await Promise.all`.

### 4.5 `state/git.ts` (builder `renderer`)

The listener takes the second argument; the `refreshLog` line gains `gitMoved &&`. Nothing else.

## 5. Words

No sentence, label, tooltip, log line or error is added. The CHANGELOG item, under `## Unreleased`, `### Fixed`:

> - Saving a file, or an agent writing many, no longer makes Tortie ask git for history, branches and remotes again; they refresh when git itself changes, and a remote or upstream you change in a terminal now shows at once. A linked worktree, or a folder inside a repository, still refreshes on every change

## 6. What moves on purpose

`src/renderer/state/__tests__/repo-changed.test.ts` `:70`, `:101`, `:103` (the listener's second argument, `true`
there). `git:changed`'s TypeScript payload and `onChanged`'s callback type. Three new wakes a person can cause:
`config`, `config.worktree` and reftable's `tables.list` now flush, so a change the parent showed late shows at once.
History no longer ends a running walk on a change (D12). Nothing else.

## 7. The rows (each beside the ablation that turns it red, made by hand in a scratch copy, never in the worktree)

### 7.1 Builder `watcher`

`src/main/watcher/__tests__/p371-git-moved.test.ts` (the injected backend of `repo-watcher-contract.test.ts`, real
scratch repositories, a 20 ms window; `watchFolder` warmed as `repo-watcher-observation.test.ts` does, because an
unwarmed first watch waits past 20 ms and D9 then flushes):

| Row | What | Ablation |
| --- | --- | --- |
| W1 | a worktree batch after a warm flush is `false`; `onChange` is handed exactly `(repoPath, false)` | the flush always passes true |
| W2 | a relevant `.git` event: `true`; an irrelevant one (`index.lock`, `COMMIT_EDITMSG`) flushes nothing and the next save is false | the bit not set in `handleDotgitEvents` |
| W3 | a file and a ref in one window, in both orders: one call, `true` | the bit cleared when a worktree batch arrives |
| W4 | a drop on the worktree stream, and one on the `.git` stream: `true` | the line out of `noteDrop` |
| W5 | a worktree watch, and a `.git` watch, that waited longer than the window: the one re-read is `true` | each D9 line's set removed, read with the other sources of true already consumed |
| W6 | the first flush after the watch is `true`, the second `false`; the bit is taken once (a true then a save: `false`) | `gitMovePending = false` at construction with the attach's set also out; not cleared |
| W7 | no `.git`: every flush `true`; a `.git` that appears: `true` until it attaches, `true` once after, then `false` | the `dotgitSub === null` term; the set at attach |
| W8 | `commondir` present (a real linked worktree): every flush `true` | the `commondir` test |
| W9 | each name of D4 a symbolic link out of the git directory: every flush `true`; `.git` itself a symbolic link: `false` | the name out of the list |
| W10 | a fatal error, the restart notice, a delete of the git directory: every later flush `true`; an ordinary drop: `true` once | each clause |
| W11 | `.git` replaced (another inode), renamed away and back with a flush between, the pointer rewritten: every later flush `true` | the identity compare; the latch |
| W12 | `isRelevantDotGitPath`: `config`, `config.worktree`, `reftable/tables.list` yes; `config.lock`, `config.worktree.lock`, `reftable/tables.list.lock`, `reftable/x.ref`, `shallow` no | each name |
| W13 | the stamp: grafts, shallow, alternates and an include file written, changed and removed each read `true` once at the next save and `false` after, with the bit clear | each name; the stamp not stored |
| W14 | a throwing reader is `true`, and nothing is thrown out of the flush | the catch |

`src/main/watcher/__tests__/p371-git-data.test.ts`: G1 whole and stamp over ordinary, sha256, separate, submodule; G2
the global file by each route of §4.1, and `/dev/null` none; G3 includes nested, relative, `~/`, `[includeIf]`, a header
line carrying `path =`, CRLF, a missing include that appears; G4 a cycle ends; G5 a file whose stamp did not move is not
read again (counted through a spied read); G6 ctime alone moves the stamp; G7 a FIFO, a directory, `/dev/tty`, a 2 MiB
file: `whole: false` in under 50 ms and nothing read past the cap; G8 an include outside HOME, the git directory and the
project: `whole: false`, and it is never stat'ed; G9 `~user/`, `%(prefix)/`, an escaped, quoted or continued value the
reader does not take; G10 33 files, 11 deep; G11 an unreadable file; G12 `refstorage = reftable:///x`; G13 the module's
imports are `node:fs` and `node:path` alone, and it names no spawn, no write and no log (read with the TypeScript
parser). Each with its clause's ablation.

`src/main/watcher/__tests__/bus.test.ts` gains B1 (the default is true; false is carried; a throwing listener costs no
other listener its value). `src/main/git/__tests__/p371-broadcast.test.ts` B2, read with the TypeScript parser:
`broadcastGitChanged` sends `gitMoved` as the event's second value and defaults it to true; `onRepoChanged(
broadcastGitChanged)` and `onChange: emitRepoChanged` hand the functions themselves; every other call of it, and
`deps.broadcast` in `depth-ipc.ts`, passes one argument; no other file under `src/main` names `EVT_GIT_CHANGED`.

Unedited and green: `repo-watcher-contract`, `repo-watcher-observation`, `repo-watcher.native`, `p365-sites`,
`p365-host`, `p347-excludes`, `p347-open-files*`, `p197-arch-disarm`, `symbols/service`, `actions/service`.

### 7.2 Builder `renderer`

`src/renderer/state/__tests__/repo-changed.test.ts`: the three edits of §6 and R1 (true, then false, in one window:
true; false then true: true), R2 (absent is true), R3 (false alone is false; the next window starts clean), R4 (two
repositories are independent, and a listener that takes one argument is called as before).
`src/renderer/scm/__tests__/p371-one-behind.test.ts`: L1 one in flight, one behind, any number of calls; L2 a call in
the same step the last one ends is not lost; L3 a throwing run clears the line; L6 two keys are independent; L7 what
each caller's promise waits for.
`src/renderer/scm/__tests__/p371-history-moves.test.ts` (the shape of `p199-search-refusal.test.ts`, a bridge it owns
with held answers):

| Row | What | Ablation |
| --- | --- | --- |
| H1 | a `false` change on an answered repository asks none of the four and no file window | the `gitMoved` test out of the subscriber |
| H2 | a `true`, and an absent, change asks each of the four once and each window once | inverted |
| H3 | a failed branches, remote branches or remotes read keeps the list, starts nothing by itself over 5 s, and the next `false` change asks THAT read alone, until it answers | the owed set |
| H4 | a walk that fell to the flat walk, one under a query that was refused, and one answering `isRepo: false` are owed; a superseded one is not | each |
| H5 | a registered repository whose log was never loaded is loaded by the first `false` change, once | registration owes nothing |
| H6 | a file window with an error, or no rows, is asked by a `false` change | the two clauses |
| H7 | Phase 199: with a change search on screen a `true` change asks the branches and no walk; the same when the search is set while the walk waits behind | the question asked at the mark instead of at the run |
| H8 | the file windows are asked on the same beat as the log | the windows left on every change |
| H9 | 40 moves over a held bridge: each of the four and each window at most 1 in flight and 1 behind, 2 calls in all | the line out |
| H10 | an older branches answer landing after a newer one, and an older failure after a newer success, change nothing | the number |
| H11 | an older file read landing after a newer one changes nothing | the generation |
| H12 | every verb of `depth.ts` that calls `refresh` still starts the four at once, with a line read out | `refresh` put on the line |
| L4 | a person's `setQuery`, `setLogScope`, `refresh` during a line's walk starts at once and owns the pane; the behind walk starts only after it settles | the walk's wait |
| L5 | a change during `ensure`'s first walk and during `loadMore`: that walk is not ended, then one walk follows | direct `fetchLog` in the line |

`src/renderer/state/__tests__/p371-git-log.test.ts` S1: a `false` change asks status and never `git:log`, a `true` one
asks both, with a loaded log. Unedited and green: `p199-search-refusal`, `history-scope`, `history-search`,
`p127-shell-ops`, `p230-*`, `p290-owed-read`, `p347-open-file-watch`.

### 7.3 Gates

No path-triggered gate gains a rule, and no gate reads the new code by name. Triggered: **`conformance:watcher`**
(`src/main/watcher/`: its rules must read unchanged, and its five sites stay five), **`conformance:samefolder`** (a new
file under `src/main/watcher`), **`gate:contract`** (byte for byte). `conformance:filehistory` and
`conformance:historysearch` are run because the History store changed, though `git/service.ts` does not. CLAUDE.md gains
ONE row, in the probes table.

## 8. The app run: `probe:p371` (builder `probe`)

`package.json`: `"probe:p371": "node build/harness-socket.mjs --fresh gmux-p371 'node build/p371/probe-p371.mjs'"`,
after `probe:p370`; `electron('probe:p371', …)` in `build/verification-checks.mjs`, with its paragraph.

### 8.1 The world

One Electron at a time through `withElectron`, the parent first (`P371_PARENT_CHECKOUT`, a built `e424fc64`, or exit 2)
then HEAD, each launch on its own scratch profile, HOME, ZDOTDIR and the harness socket as its `tmuxSocket`, §0's
environment, agents hidden and read back, no session created, no drive hook added. `build/p371/stand-in.zsh` is the
counting git of `scratch/p371/spec/app/git-hold.zsh`: the subcommand AND its next two arguments are logged, so
`rev-parse --verify` (the walk) and `--abbrev-ref` (the remotes) are told apart; the hold is polled for the fuse;
`GIT_CONFIG_NOSYSTEM=1` always and `GIT_CONFIG_GLOBAL` from its control file. **Counts are read from its log, and from
the process table every 250 ms at the held cells.** A probe never opens the Runs section, arms no Architecture map and
opens no ⌘P (§1's other readers would be counted). Terminal operations run as `/usr/bin/git` children of the probe. What
is SHOWN is read from the page: `.scm-hsubject` rows under `[data-section-root="history"]`, `.scm-bname` rows and the
remote groups of `.section-scm-branches`, opened by their own persisted keys
(`gmux.scm.branchesCollapsed.<repo>` `false`) through the shot drive's `localStorage` field
(`{ projectPath, openRel, mode: 'diff', sidebarView: 'scm' }`); ground truth is computed by the probe's own git after
the operation.

### 8.2 The arms

| Arm | What | HEAD must |
| --- | --- | --- |
| M | §2.1's six cells at both builds, 30 s each, after one warm save that is not counted (D2's first flush) | start 0 `for-each-ref`, `remote`, `symbolic-ref`, `rev-parse` and `log` in the writer phase; `status`, `show` and `check-ignore` a change no higher than the parent's; changes delivered within 15 percent of the parent's |
| V | the moves table: the entry's Method 2 list, by shape (ordinary, linked from inside and from another worktree, linked-main, submodule, reftable, separate, include, subfolder, new-workdir), driven from a terminal; per row the time from the operation's end to the page showing the truth with nothing else written for 3 s, then, if not shown, after one unrelated saved file | every row the parent showed at once: shown at once, its median of three no more than 400 ms later than the parent's in the same session; every row the parent showed only after the save: shown at once or after the save, and never later after the save by more than 400 ms |
| A1 | a ref move inside the same 300 ms as 1,000 file writes, 20 times | shown every time |
| A2 | the window reloaded 50 ms before, at and 50 ms after a commit; the project's tab in the background while 10 moves happen, then pressed | shown every time |
| A3 | the run's own watcher process SIGKILLed (pid read from the process table as this app's helper, as probe:p365's SK) between a ref move and the flush, and before it | shown within 10 s; afterwards every save re-reads (D3), printed |
| A4 | `.git` renamed away and back, removed and made again, the pointer rewritten (§2.3), each with a save after | shown after the save |
| A5 | the app's main process SIGSTOPped for 10 s while 5 moves and 50 saves happen, then SIGCONTed (the Mac asleep, as near as a script comes) | shown within 10 s of the CONT |
| A6 | git failing: the stand-in exits 1 for `for-each-ref` and `remote`, and is held past 30 s for `log`, at the project's opening; then it answers; then ONE save | nothing started by itself while it fails; the save shows the truth; the next save starts none of the five |
| A7 | 60 ref moves 350 ms apart with git held 1 s and 10 s (a rebase's shape) | at most 1 of each of the four alive a repository and 1 file walk a window (the walk's first round counted as its own); the last move shown after the held reads drain; the parent's most alive printed |
| A8 | a hostile config: an include naming a FIFO, `/dev/tty` and `/net/x/y`, with a writer running for 10 s | the longest block of main's thread (a 20 ms interval in main through `--inspect`, never across a quit) under 100 ms, or the parent's own plus 50 ms where that is higher; every save re-reads |
| P | a person's own: ↻, checkout, branch made, commit, loadMore, scope change, a query, a change search with the writer running, opening History and Branches while a read is out; git held 1 s | the same starts as the parent per press, or fewer, and each press shown no later than the parent's plus 400 ms |
| N | the same writer read by every other consumer: the changes a page hears a save; `status`, `show`, `check-ignore` a save; the Explorer's new row, the editor's reload and Changes' row after a save | within the parent's range at the same load |
| RUN | hygiene: his history unmoved, no leftover process or socket, every launch's census clean, the stand-in the only git the app started | every clause |

An arm whose input is absent, or whose operation did not do what it says, is UNREADABLE (exit 2), never a pass. The
whole default run is not yet measured; budget 40 to 60 minutes, M and V most of it.

### 8.3 Its self-test

`node build/p371/probe-p371.mjs --grader-self-test` (never through `npm run`) drives the one reader and every grader
over recorded raw fixtures seeded from §2.1's own logs (`scratch/p371/spec/runs/*/logs/cell.txt`), with a hostile edit
per clause, and starts nothing. `--preflight` and `--list-graders` start nothing. `P371_ARMS`, `P371_CELLS`,
`P371_SHAPES`, `P371_KEEP`, `P371_REPORT`, `P371_HEAD_ONLY` (never exits 0).

## 9. Builders, disjoint files

### 9.1 The table (every file in exactly one list; a builder that must edit a file not in its list stops and names it)

| Builder | Files it owns (and their tests) |
| --- | --- |
| `watcher` | NEW `src/main/watcher/git-data.ts`; EDIT `src/main/watcher/repo-watcher.ts`, `src/main/watcher/bus.ts`, `src/main/watcher/index.ts` (its header's one line, and no new export), `src/main/git/ipc.ts` (`broadcastGitChanged` and its comment, nothing else), `src/shared/ipc/base.ts` (the payload, the callback and their doc lines, nothing else); NEW `src/main/watcher/__tests__/p371-git-moved.test.ts`, `p371-git-data.test.ts`, `src/main/git/__tests__/p371-broadcast.test.ts`; EDIT `src/main/watcher/__tests__/bus.test.ts` |
| `renderer` | NEW `src/renderer/scm/one-behind.ts`; EDIT `src/renderer/scm/depth.ts`, `src/renderer/state/repo-changed.ts`, `src/renderer/state/git.ts` (the listener alone); NEW `src/renderer/scm/__tests__/p371-one-behind.test.ts`, `p371-history-moves.test.ts`, `src/renderer/state/__tests__/p371-git-log.test.ts`; EDIT `src/renderer/state/__tests__/repo-changed.test.ts` (§6's three lines and R1 to R4) |
| `probe` | NEW `build/p371/probe-p371.mjs`, `build/p371/stand-in.zsh`, `build/p371/fixtures/**` |
| integrator | `CLAUDE.md` (one probes-table row), `CHANGELOG.md` (§5), `package.json` (`probe:p371`), `build/verification-checks.mjs`, `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 193 → 194, naming the script), `build/background-fixtures.mjs` and `.gitignore` (only if needed), `docs/audits/contract-baseline.txt` (only if, against §0.1 item 2, a line moves), this file's §As built, and any file two builders both need |

### 9.2 The seams, stated exactly so the three build at once

- `watcher` and `renderer` meet only at `window.gmux.git.onChanged(cb: (repoPath: string, gitMoved?: boolean) => void)`.
  `watcher` owns the type; `renderer` writes its source against that shape and treats absent as true.
- `renderer` adds no field to the store's state: `owed`, `walks`, the numbers and the lines live beside `logGen`.
- `probe` reads shipped behaviour only: the stand-in's log, the process table, the page's DOM, `window.gmux`, main's
  inspector. No file under `src/`.

### 9.3 The briefs

Each builder runs its own files by name, then `npm run typecheck` and `npm test` (history block), shows each of §7's
ablations by hand in a scratch copy, and returns every file with its line counts, every decision this file does not
state, and what it could not run. `watcher` also runs `npm run conformance:watcher`, `conformance:samefolder` and the
spec step's two `proto.*` measures with their paths pointed at its own tree (`runp.sh`, the history block), and returns
the same table. `probe` runs `--grader-self-test`, `--preflight`, and under a lock slot M's `Explorer, own speed` and V's
ordinary shape at the parent alone.

## 10. The proof, run rather than read (Tier 3)

### 10.1 Lens A: the counts and nothing staler (Methods 1 and 2)

The gates once (§11). Then `probe:p371` whole, the parent first, under a lock slot. **The independent steps**: (1) its
own count, not the stand-in's: the process table at 50 ms beside one held cell at each build; (2) the moves table again
by the verifier's own instrument (its own FSEvents tee over HEAD's shipping class, a save after every step) over shapes
the spec step did not use: a linked worktree of a SUBMODULE, a worktree of a reftable repository, a repository on a
case-sensitive APFS image, `includeIf "onbranch:"`, and the second git on this Mac
(`/Library/Developer/CommandLineTools/usr/bin/git`); (3) one hour of nothing but saves over one scratch repository at
HEAD, with a terminal commit at random moments, read by a script of its own: every commit shown, none of the five
started otherwise.

### 10.2 Lens B: the attack

Try to make HEAD show something old: the arms A1 to A8 with shapes of its own; a move between the attach's `resolve` and
the stream's start (the watch held behind 20 others in the queue); a move in the same millisecond as the stamp is read;
two windows of the same project; a project opened, closed and opened 20 times while a terminal commits; a config include
edited in place, replaced, deleted and made again, and a chain of 31 and 33 of them; every D3 clause raced against a
flush; `gitMoved` false forged over the bridge for 30 s and then one true (the page catches up). **The independent
step**: its own ablations of D2, D3, D4, D5, D8, D11, D12 and D13 in a scratch copy (at least one each, not §7's), each
red in the phase's vitest files; and D6's hostile config read at HEAD with main's thread timed by its own instrument.

### 10.3 No regression (both builds, the same session, alternated)

| Row | What | The parent | HEAD must read |
| --- | --- | --- | --- |
| N1 | a saved file to the Explorer's row, Changes' row and the editor's reload | arm N | no higher |
| N2 | `git status`, `show`, `check-ignore` a save; changes a page hears | §2.1 | no higher |
| N3 | a commit, branch, tag, merge, rebase over 200 commits, fetch, push in a terminal, to History and Branches | arm V | within 400 ms of the parent's median |
| N4 | a remote or an upstream changed in a terminal | shown after a save | shown at once, or after the save |
| N5 | ↻, checkout, commit, push, pull, fetch, publish, branch and tag made and deleted in Tortie | arm P | the parent's starts or fewer, shown no later |
| N6 | opening History and Branches for the first time, after a save and before one | the parent loads them on the first change | no later than the parent by more than 400 ms |
| N7 | a change search on screen while an agent writes | never re-run | never re-run |
| N8 | a linked worktree, a folder inside a repository, a folder that is not a repository | a read a change | the parent's starts or fewer |
| N9 | `npm test`, `npm run build`, `typecheck`, `conformance:watcher`, `conformance:samefolder`, `conformance:filehistory`, `conformance:historysearch`, `gate:contract` | the counts at `e424fc64` | the same plus this phase's files, the contract byte for byte, the same four `/bin/ps` failures inside the block |
| N10 | main's thread over 30 s of saves (`--inspect`, a 20 ms interval) | the parent's longest block | no higher by more than the run's own noise |

A row worse than the parent is a defect: fixed, or the part dropped and named. The two costs accepted in advance, both
stated: D12's "up to one walk later" when a walk outlasts the gap between two moves; and §6's extra wakes for `config`,
`config.worktree` and a reftable ref, which are the entry's own.

### 10.4 At the end, once

The Electron count with CLAUDE.md's command, outside the block; every `gmux-p371` socket gone or with no server; no
process naming a run folder; the history stats; the lock slots free.

## 11. The integrator's commands (in order; each with its exit code and PASS line in the report)

1. `npm run typecheck`
2. `node build/contract-inventory.mjs --check` (byte for byte; a diff is a finding)
3. `npm test` (history block, scratch HOME; the four `/bin/ps` tests named as the expected failures)
4. `npm run build` (`gate:electron` 194 against 194; `gate:background`; `gate:checks` with `probe:p371` classified)
5. the phase's vitest files and §7's unedited neighbours by name
6. `npm run conformance:watcher`, `conformance:samefolder`, `conformance:filehistory`, `conformance:historysearch`
7. `git diff --stat e424fc64 -- src` (only §9.1's files), and `git diff e424fc64 -- src/shared src/preload` (`base.ts`
   alone, its two types and their comments)
8. `node build/p371/probe-p371.mjs --grader-self-test` and `--preflight`
9. under a lock slot, `P371_ARMS=M P371_CELLS=<the two own-speed cells>` and `P371_ARMS=V P371_SHAPES=ordinary`, at both
   builds (HEAD needs step 4's `out/`)
10. the Electron count, the socket check, the history stats, the leftovers

`smoke`, `smoke:t1`, `smoke:t3` and the package are the main session's, at landing.

## 12. What is NOT in this phase

- No limit inside `runGit`, and no change to `git status`, `check-ignore`, the editor's `git show`, the tree's status,
  `runs.ts` or `actions/service.ts` (its two `rev-parse` a change for an observed repository stay).
- No change to what History, Branches or the remotes panel draw, to paging, to search or to `git/service.ts`.
- No watch of a linked worktree's common directory (§14 Q1), no re-attach of a dead `.git` watch, no flush on `git init`.
- No taking `index` out of the filter (§14 Q2). No re-read of only the changed folders, no change to either debounce.
- No new setting, surface, sentence, menu row, log line, harness smoke mode, environment variable or drive hook.

## 13. For the main session at landing

1. `HELPER_USER_FLOOR` 193 → 194, naming `build/p371/probe-p371.mjs`.
2. CLAUDE.md gains ONE row, in the probes table, and none in the path-triggered table.
3. `smoke:t1`, and `smoke`, `smoke:t3` and the package in the battery, are yours; this phase's agents ran none of them.
4. The commit body says: the baseline did not move, and why (§0.1 item 2); and D12's and D4's stated costs.
5. §14's three go to him with §2.1's table.
6. Cleanup after the follow-up commit: both worktrees and `/private/var/tmp/tortie-wt/scratch/p371/`.

## 14. Questions for him (the main session asks; the build proceeds on the defaults)

1. **A linked worktree still re-reads on every saved file.** Its branches and remotes live in the main checkout's
   `.git`, which Tortie does not watch from a worktree, so the safe answer is today's: ask on every change, now one at a
   time. Default: leave it. The other choice: a later phase that watches the shared folder, which shows another
   worktree's commits at once and also wakes every open worktree each time one of them commits.
2. **Staging a file counts as git changing**, because `git add` (and a `git status` that refreshes) writes git's index,
   and the entry says so. History does not draw the index, so it could be left out. Default: count it, as written.
3. **The same shape in the push watcher and Runs.** With Runs open, every saved file also asks git for two commits and
   GitHub for its runs. This phase leaves both. Default: leave them. The other choice: a small phase of its own.

## §As built (the integrator, 2026-11-24)

### What landed, and what differs from the text above

`git diff e424fc64 -- src` is §9.1's files and no other: ten edited (556 lines added, 59 taken out), and `git-data.ts`,
`one-behind.ts` and six test files new. `src/shared` moves `ipc/base.ts` alone (the payload, the callback, their doc
lines) and `src/preload` nothing. **The contract baseline did not move**: `contract-inventory --check` is byte for byte,
for §0.1 item 2's reason. The seam is `onChanged(cb: (repoPath, gitMoved?) => void)`; both halves were written against
it and nothing had to be reconciled. No menu row moved. `HELPER_USER_FLOOR` is 194, naming `build/p371/probe-p371.mjs`.

Differences from §4, each the builders', each with a row and a red arm unless it says otherwise:

| | What | Row |
| --- | --- | --- |
| B1 | Every `.git` event in a batch is read; the parent stopped at the first relevant one, so a delete of the git directory behind it was missed | W10 |
| B2 | Config is read with a small copy of git's own tokenizer, not by line (a continued alias line holding `[core]` lost a real include); each accepted text was run through `git config --list` | G3, G9 |
| B3 | Includes, `shallow`, the grafts and the alternates are walked a component at a time with `lstat`, so no stat is led out of HOME, the git directory and the project; the person's own global and system files follow links anywhere | G7, G8 |
| B4 | Nine variables (`GIT_DIR`, `GIT_COMMON_DIR`, `GIT_OBJECT_DIRECTORY`, `GIT_ALTERNATE_OBJECT_DIRECTORIES`, `GIT_GRAFT_FILE`, `GIT_SHALLOW_FILE`, `GIT_REFERENCE_BACKEND`, `GIT_CONFIG_COUNT`, `GIT_CONFIG_PARAMETERS`) in the app's environment make every change count; `GIT_CONFIG_NOSYSTEM` takes the system file out only where git reads it as yes; a HOME of `/` holds nothing | G2 |
| B5 | A reading that cannot be told has a stamp of its own, so becoming whole again counts once; one failed stat keeps the directory's identity and does not latch D3 (W14) | W14 |
| B6 | A file window uses D13's number, not "the newest started owns it", so a first read that answers while a change's read is out still draws | H11 |
| B7 | An older answer landing after a newer failure is drawn and stays owed | H10 |
| B8 | A pinned walk (a search, `loadMore`) never settles the log, and one that ends an unpinned walk leaves the log owed: at the parent the next saved file re-resolved the refs | H13 |
| B9 | A walk the line skips because a change search is on screen is owed (H14); a file window whose rows were walked under another scope is owed (H6); whether a read is still needed is asked as it runs, never when it was marked (H15) | H6, H14, H15 |

Two ablations changed shape because a test could not isolate a term as §7.1 words it: W6 (three sources hold the first
`true`, so the arm removes all three) and W7 (a row with the `.git` watch held in the queue isolates
`dotgitSub === null`).

Known limits, stated and not fixed: a git that exits non-zero inside `graphLog`'s or `remotes`' first round without
rejecting reads as an answer, so HEAD repairs it at the next move where the parent's next save did (`git/service.ts`,
§12); D12's "up to one walk later"; D4's every-change shapes.

### The probe: three edits by the integrator

1. **M counted the warm save's own reads.** The first run read FAIL at HEAD (10 and 15 of the five over 74 changes, 75
   `status` for 74 changes): the page hears a save 150 ms before it asks git, and `quiet` looked back at a long quiet and
   answered at once, so the warm save's reads fell into the cell 117 ms after it began, sooner than a flush can come (300
   ms and 150 ms). It now waits for the warm save's own `status` first.
2. **A7's `lastShownMs` was negative for a pass.** The stand-in sleeps and THEN runs real git, so a read begun 10 s before
   the last move answers it; the truth was drawn 194 ms before `marks.last`, which is read 350 ms after the last move.
   `-1` is the "never shown" word, so the number is clamped at 0 as `shownOf` clamps its own. A state not holding the
   last ref cannot equal the truth.
3. `UNEXPECTED` (a row the PARENT should show differently) is no longer printed for HEAD, where it named only what D7
   makes better.

`rec-P.json` is new (arm P at the parent, as recorded here), with its two rows: 47 raw inputs, 152 values.

### The commands (the history block and a scratch HOME unless it says otherwise; the load beside each)

| Command | Exit | Reading (1 minute load) |
| --- | --- | --- |
| `npm run typecheck` | 0 | 1,460 production files, 0 violations, 0 cycles (6 to 8) |
| `contract-inventory --check` | 0 | byte for byte |
| `npm test` | 1 | 23,859 passed, 5 failed, 24 skipped, 1,242 files, 80.9 s (8 to 138): the four `/bin/ps` tests (`process-table.native` 1, `ps.native` 2, `p269-env-names` 1) and `preview/protocol`'s "sits behind a symlink", which is 36 of 36 with `TMPDIR` under `/var/tmp` |
| `npm run build` | 0 | `gate:electron` 194 of 194 over 605 files, `gate:checks` 297 check scripts, the contract byte for byte; 51.8 s (138 to 92); again on the final tree, 0 |
| the phase's eight files and §7's neighbours, by name (122 files) | 0 | 2,025 passed; every §7 neighbour unedited (85 to 58) |
| `conformance:watcher`, `samefolder`, `filehistory`, `historysearch` | 0 ×4 | every rule; `samefolder` 9 of 9 red; `filehistory` and `historysearch` each ablated red (58 to 50) |
| `probe-p371 --grader-self-test`, `--list-graders`, `--preflight` | 0 ×3 | 19 graders, 55 clauses, 99 needs, 47 raw inputs; 25 checks for both builds |
| M e-real and s-real, P and V ordinary, the whole run, V new-workdir twice and A7 (outside the block: Electron and `/bin/ps`; a lock slot each) | 0 after one 1; 0; **1**; 0 ×2 | below |

Not run: `smoke*`, the package (the main session's), any agent, `conformance:resume*`.

### The app, both builds, parent first

M (30 s a cell, 150 writes, 74 or 75 changes heard, after the warm save, in the whole run):

| Cell | The parent: the five a change, total | Most alive (log / table) | HEAD: the five | Most alive | `status` / `show` / `check-ignore` (both) | Load at the cell, parent / HEAD |
| --- | --- | --- | --- | --- | --- | --- |
| Explorer, own speed | 9.9, 740 | 8 / not seen | **0** | 1 / 0 | 74 / 0 / 3 | 77 / 125 |
| Explorer, held 1 s | 9.9, 734 | 31 / 29 | **0** | 2 / 1 | 29 / 0 / 3 | 51 / 40 |
| Explorer, held 10 s | 8.9, 665 | **259 / 234** | **0** | 2 / 1 | 3 / 0 / 3 | 28 / 20 |
| Source Control + a diff tab, own speed | 15.0, 1,110 | 13 / not seen | **0** | 2 / 2 | 74 / 74 / 0 | 16 / 14 |
| the same, held 1 s | 14.7, 1,102 | 47 / 45 | **0** | 2 / 2 | 29 / 29 / 0 | 14 / 12 |
| the same, held 10 s | 13.6, 1,010 | **388 / 361** | **0** | 2 / 2 | 3 / 3 / 0 | 13 / 10 |

V, 666 tries a build over the eleven shapes: every move the parent showed at once HEAD showed at once, inside the 400 ms.
Remotes, upstreams, `config --worktree` and reftable's moves now show at once in the whole shapes. **One row failed
once**: `new-workdir`, `push` 1, whose save was followed by no git at all, not even `status`, for 8.9 s, then read; the
page was then right. In that shape every change counts at HEAD, and no `status` means
no change reached the page at all, so `gitMoved` cannot have been what held it. Run again twice, both builds, with a one-a-second `ps` beside it: 57 tries a build passed both times; a 3.49
s wait for a save appeared once at HEAD, at the second in which the witness's own `ps` did not answer either (a 4 s gap),
and A7 at HEAD held a 20 s gap in the process table in the same session. The Mac stalls for seconds (`fseventsd` up to
128 percent, load to 188). The 8.9 s itself was not witnessed; the parent's worst in 666 tries was 1.88 s. The whole run
exits 1 for this row and for A7's grader (edit 2, its own run since: PASS).

A1 20 of 20 shown, worst 544 ms; A2 10 of 10, worst 210; A3 4 of 4 (worst 873) and 12 of 12 later saves re-read; A4 8 of 8,
worst 575; A5 533 ms; A6 save shown 591 ms, the next save 0 of the five, 0 alone; A7, 60 moves, alive a repository
walk/branches/remote branches/remotes/file walk/round, parent against HEAD: 4/4/4/4/4/8 against 1/1/1/1/1/2 at 1 s, and
**30/30/30/30/30/60 (log 438, table 409) against 1/1/1/1/1/2 (log 13)** at 10 s; started, 1 s: 59/59/59/59/59 against
11/21/21/11/11. A8 main's longest block 25 ms against the parent's 9 (floor 100), every one of 25 saves re-read (375). P, ten
presses 3 times at 1 s a git, passed twice; in the first run (load 73 to 136): every median as early or earlier (checkout 4,129 against 4,642 ms, commit 4,653 against 5,495,
↻ 2,066 against 2,096), 0 presses more git; 0 walks for a change search while a writer ran. N, 20 saves: Explorer 472 against
475 ms, editor 472 against 475.5, Changes 482 against 497, `status` and `show` 1 a save each, `check-ignore` 0.6, main's block
12 against 14 ms, the five 0 against 300.

4,845 s, 53 launches, 47 verdicts passed, 2 failed. Leftovers: no Electron, process or p371 socket of this role; the three lock
slots free; his history `751928 1795563175` and `23166 1790702242` at the start and after every run (the first had moved
from `751864 1795559147` at 18:32:55 during the builders' step, reported by both).
