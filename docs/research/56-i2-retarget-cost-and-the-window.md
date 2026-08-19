# Research 56, investigator 2. What a re-target costs, and what a person sees while it happens

Measured 2026-08-18 against `gdc@gregs-mac-pro.tail2ddfe1.ts.net` over the operator's tailnet, read
only. Every tree claim below was checked against the worktree this session and carries a file path
and a symbol name.

---

## 1. The answer

**A warm re-target is acceptable and a cold one is not. The number I judged on is 150 ms.**

That number is not borrowed. It is this product's own budget, already written down and already
tested. `OPEN_WITH_MENU_DEADLINE_MS` in `src/renderer/tree/open-with.ts` is 120 ms, and the test
beside it, in `src/renderer/tree/__tests__/open-with.test.ts`, is named "is 120 ms, which leaves room
under the 150 ms budget". The comment above the constant says the budget is enforced in the renderer
"because that is where it is felt". A sidebar re-target is the same kind of event as that menu. A
person did something and a surface has to answer.

| Shape | Median | p95 | n | Against the 150 ms budget |
| --- | --- | --- | --- | --- |
| Local re-target on this Mac, everything at once | 19.8 ms | 24.9 ms | 15 | inside, by 130 ms |
| Remote re-target WARM, 8 calls at once | 80.9 ms | 173.7 ms | 15 | median inside by 69 ms, p95 outside by 24 ms |
| Remote re-target COLD, 8 calls at once | 419.6 ms | 525.0 ms | 10 | outside by 2.8x at the median |
| Remote re-target, the naive port, 12 calls in series | 791.3 ms | 943.3 ms | 8 | outside by 5.3x |

The warm remote re-target is 4.1 times the local one at the median. It is not a thousand times the
local one, and the reason is that the local re-target is not free either. A single local
`git status --porcelain=v2 --branch -z --untracked-files=all` on a 1,471 file repository measured
16.4 ms at the median on this Mac, because spawning git costs more than reading the disk. The remote
penalty rides on top of an operation that already costs 16 ms to 20 ms.

**Two conditions make the warm number the one a person actually sees, and both must be built.**

1. A machine that any tab is targeting is never allowed to go quiet. `SSH_CONTROL_PERSIST_SECONDS`
   in `src/main/machines/ssh.ts` is 60. A freshness poll has to exist anyway, because there is no
   change feed across the connection, and any poll under 60 s keeps the shared connection open. The
   poll is the thing that stops the cold price from ever being paid twice.
2. A re-target fires at most 10 calls at once. The far side's sshd is configured with
   `MaxSessions 10`, which I read this session, and I measured the cliff at exactly that point. See
   section 5.

**What is still true at the warm number.** 80.9 ms of an empty Explorer is 2.7 times longer than the
blanking defect the operator personally reported and Phase 47.1 fixed. Section 6 is about that, and
it is the half of this question that matters more than the milliseconds.

---

## 2. What a re-target actually is, counted from the tree

Only ONE sidebar view is mounted at a time. `src/renderer/app/Sidebar.tsx` renders a single branch of
a four way conditional on `view`, so the Explorer's component tree does not exist while Source
Control is showing. The call set therefore depends on which view is open, and no re-target ever pays
for all four.

`SIDEBAR_VIEW_IDS` in `src/renderer/state/sidebar-views.ts` names the four views.

| Surface | What fires on a project switch | Bridge calls | Symbol I read |
| --- | --- | --- | --- |
| Explorer, root | `setRoot` lists the root and clears the cache | 1 | `useFileTree.setRoot`, `src/renderer/tree/store.ts` |
| Explorer, remembered folders | one `loadDir` per persisted expanded folder, capped at 500 | 0 to 500 | `loadExpanded` and `saveExpanded`, `src/renderer/tree/FileTree.tsx` |
| Explorer, decorations | `setRepo` pulls `git:status` when the SCM store is not feeding it | 1 | `useTreeGitStatus.setRepo`, `src/renderer/tree/git-status.ts` |
| Explorer, dimming | one `git:checkIgnore` over the loaded paths | 1 | `useTreeIgnored.sync`, `src/renderer/tree/ignored.ts` |
| Source Control, Changes | `ensureStatus` pulls `git:status` | 1 | `useGit.ensureStatus`, `src/renderer/state/git.ts` |
| Source Control, History and Branches | `depth.ensure` pulls log, branches, origin url, remote branches and remotes | 5 | `depth.ensure`, `src/renderer/scm/depth.ts` |
| Search | blanks the results and re-runs only when a query is already live | 0 or 1 | `setProject`, `src/renderer/search/store.ts` |
| Quick Open | **nothing** | 0 | see below |
| Context | not measured, see section 9 | unknown | `src/renderer/context/` |

**Quick Open is not part of a re-target, and that is worth stating plainly because the question
assumed it was.** `warm()` in `src/renderer/quickopen/store.ts` is called from exactly two places,
being `openPalette` and `toggleScope`. Neither runs on a project switch. The index is built on the
first Cmd-P and not before. So the answer to "whatever Quick Open needs" is that it needs nothing at
re-target time, and its cost belongs to the first Cmd-P after the switch instead. Section 7 prices
that separately.

So the two shapes worth measuring are these.

- **Minimal**, the Explorer with no remembered folders. Two calls, being the root listing and the git
  status.
- **Full**, the Explorer's four calls plus Source Control's five, with the History and Branches
  sections open. Eight calls, because `git:status` is shared.

---

## 3. The measurements

Harness. One local `ssh` process per call, carrying ONE quoted argument for the far login shell,
which is the shape `runRemoteRead` in `src/main/machines/remote-run.ts` sends. The options are the
ones `sshOptions` in `src/main/machines/ssh.ts` composes, being `BatchMode=yes`,
`StrictHostKeyChecking=yes`, `ControlMaster=auto`, `ControlPersist=60s`, `ServerAliveInterval=5` and
`ServerAliveCountMax=3`. The known hosts file is one I created in the scratch directory with
`ssh-keyscan`. The operator's own `~/.ssh/known_hosts` was 2,120 bytes before this session and is
2,120 bytes now.

Far side. `gregs-mac-pro.tail2ddfe1.ts.net`, arm64, macOS 15.7.7, git 2.39.5. `command -v rg` answers
nothing, so **ripgrep is confirmed absent on that machine as of 2026-08-18**.

Subject repository. `~/.oh-my-zsh`, being 1,096 tracked files and 1,695 entries in the whole tree.
It is the only repository of that size on the Mac Pro. `~/dev` is a repository with 0 tracked files
and `~/Desktop` is a repository with 1,267 untracked entries and no tracked ones. There is no
checkout of gmux or of any of the operator's working projects on that machine.

### 3.1 One call at a time, warm connection

| What the call does | Median | p95 | Bytes back |
| --- | --- | --- | --- |
| Nothing, the connection alone | 36.8 ms | 58.3 ms | 0 |
| Explorer listing, depth 1 | 40.4 ms | 116.4 ms | 919 |
| Explorer listing, depth 2 | 60.5 ms | 123.6 ms | 29,841 |
| Explorer listing, depth 3 | 74.8 ms | 122.7 ms | 89,268 |
| Explorer listing, whole tree at depth 9 | 69.6 ms | 153.6 ms | 101,739 |
| `review-list`, the git status script that already exists | 57.0 ms | 113.1 ms | 226 |
| `git check-ignore` over the root's 20 names | 45.3 ms | 123.7 ms | 33 |
| `git ls-files`, 1,096 paths, encoded | 50.2 ms | 132.5 ms | 42,620 |

Each row is 10 to 15 readings. The listing script is a `find` with `-maxdepth` and one `stat` per
entry, printed between the `__TORTIE_RUN__` markers, in the shape `STORE_LIST` in
`src/main/machines/remote-scripts.ts` already uses. It carries the file type letter, which the
Explorer needs because `FsDirEntry.kind` in `src/shared/types.ts` distinguishes a directory from a
symbolic link that points at one.

**The whole 1,695 entry tree costs 69.6 ms and the root alone costs 40.4 ms.** The difference is
29.2 ms. That is the price of never making a second call for a folder the person expands.

### 3.2 The three ways to send several calls, warm

| Shape | Median | p95 |
| --- | --- | --- |
| Three calls, one after another | 135.9 ms | 207.0 ms |
| Three calls at once | 59.9 ms | 152.8 ms |
| Three commands inside ONE call | 74.2 ms | 143.2 ms |

The same test on Source Control's five reads.

| Shape | Median | p95 |
| --- | --- | --- |
| Five git reads, one after another | 216.2 ms | 504.3 ms |
| Five git reads at once | 48.4 ms | 145.3 ms |
| Five git reads inside ONE call | 82.6 ms | 186.1 ms |

**Send them at once, and do not merge them into one script.** Merging is 24 percent slower for the
three and 71 percent slower for the five, because a merged script runs its parts one after another on the far side while
separate calls run at the same time. Firing them together also needs no new script text, so the
frozen catalogue in `src/main/machines/remote-scripts.ts` grows by the scripts a phase genuinely
needs and by nothing else.

### 3.3 The two re-target shapes, warm and cold

| Shape | Median | p95 | n |
| --- | --- | --- | --- |
| Minimal, 2 calls, warm | 58.2 ms | 122.5 ms | 15 |
| Minimal, 2 calls, cold | 333.8 ms | 424.5 ms | 8 |
| Full, 8 calls, warm | 80.9 ms | 173.7 ms | 15 |
| Full, 8 calls, cold | 419.6 ms | 525.0 ms | 10 |
| The connection alone, cold | 192.2 ms | 342.8 ms | 10 |

Cold means the shared connection's socket was removed before the call, so the client had to build a
new one. Opening the connection first with a separate empty call and then firing the eight measured
415.8 ms at the median and 833.9 ms at p95, which is no better than firing the eight into a cold
connection. So there is no trick that recovers the cold case. The only answer is not to be cold.

### 3.4 The cold price does NOT grow with silence

I expected it to and it does not. I dropped the shared connection, waited, and timed the first call
after the wait.

| Seconds since the last call | First call after it |
| --- | --- |
| 5 | 181.5 ms |
| 60 | 193.8 ms |
| 150 | 339.3 ms |
| 300 | 193.2 ms |

One reading each. Three of the four sit between 181.5 ms and 193.8 ms and the 150 s reading is a
single high sample rather than the top of a trend, because the 300 s reading came back to 193.2 ms.
**So a cold call costs about 190 ms whether the machine has been quiet for 5 s or for 5 minutes, and
the earlier sentence I was going to write, that a longer silence costs more, is not supported by the
readings.** The design consequence is small and good, being that the cold penalty is a fixed price
paid once rather than one that grows while a person is away.

### 3.5 The local baseline on this Mac, for the ratio

Measured against the worktree, 1,471 tracked files, with `--no-optional-locks` so no git command
could write an index.

| What | Median | p95 |
| --- | --- | --- |
| `readdir` of the repository root | 0.020 ms | 0.050 ms |
| `git status --porcelain=v2 --branch -z --untracked-files=all` | 16.4 ms | 17.9 ms |
| `git log -z --max-count=50` | 11.9 ms | 14.8 ms |
| `git for-each-ref refs/heads` | 10.2 ms | 11.5 ms |
| Minimal re-target, readdir plus status | 17.2 ms | 19.2 ms |
| Full re-target, readdir plus six git reads at once | 19.8 ms | 24.9 ms |

The listing is free locally and the git reads are not. 95 percent of the local minimal re-target is
one `git status`.

---

## 4. The naive port, priced so nobody builds it

The naive port is the one that changes nothing about the shape of the calls and only swaps the
transport. The Explorer fires one listing per folder, because `loadDir` in
`src/renderer/tree/store.ts` takes one directory, and `FileTree.tsx` fires one per remembered folder
in the effect that re-lists persisted expansions.

Priced with nine remembered folders, which is the count research 55 used.

| Shape | Median | p95 | Against the chosen shape |
| --- | --- | --- | --- |
| 12 calls, one after another | 791.3 ms | 943.3 ms | 12.1x |
| The same 12 calls at once | 337.9 ms | 438.1 ms | 5.2x |
| One subtree listing at depth 3, plus status, plus check-ignore, at once | 65.5 ms | 131.2 ms | the chosen shape |
| One listing at depth 1, plus status, plus check-ignore, at once | 61.7 ms | 69.7 ms | cheapest |

Firing the naive 12 at once does not rescue it, and section 5 says why.

---

## 5. The concurrency wall, and it is exactly 10

This is the finding I did not expect and it constrains the design more than the latency does.

The far side's `/etc/ssh/sshd_config` carries `#MaxSessions 10` and `#MaxStartups 10:30:100`, both
commented, so the built in defaults apply and the session default is 10. I read those two lines this
session. Every call Tortie makes over a shared connection is one session on that connection, so ten
is the number of calls that can be in flight at once.

Measured, 8 readings at each level, all against one warm shared connection.

| Calls at once | Median | p95 | Failures |
| --- | --- | --- | --- |
| 1 | 81.0 ms | 144.8 ms | 0 of 8 |
| 4 | 140.3 ms | 186.2 ms | 0 of 32 |
| 8 | 50.4 ms | 496.6 ms | 0 of 64 |
| 9 | 64.4 ms | 147.5 ms | 0 of 72 |
| 10 | 48.9 ms | 143.7 ms | 0 of 80 |
| 11 | 334.1 ms | 430.1 ms | 0 of 88 |
| 12 | 336.3 ms | 448.1 ms | 0 of 96 |
| 16 | 457.1 ms | 501.8 ms | 0 of 128 |

The step from 10 to 11 is 6.8 times, and nothing fails. The eleventh call waits for a slot, which is
worse than failing, because a wait is invisible and a failure is not.

**Research 55 saw this cliff and put it between 10 and 12 without naming the cause. The cause is
`MaxSessions`, it is a setting on the other person's machine, and Tortie does not get to change it.**

**Nothing in the product counts.** I grepped `src/main/machines/remote-run.ts` and
`src/main/machines/exec-plane.ts` for `inFlight`, `semaphore` and `queue`, and both files contain
zero occurrences. Three modules keep a private per-machine `inFlight` Set of their own, being
`remote-capsule.ts`, `remote-harvest.ts` and `remote-store-sync.ts`, and each allows one pass at a
time for itself alone. So the product's own background traffic is already up to three sessions, and
nothing adds them together.

Three rules follow, and a phase that ignores them will ship the 334 ms number instead of the 81 ms
one.

1. The door counts. `runRemoteRead` gains a per-machine ceiling, because it is the one place every
   read passes through, and a ceiling anywhere else can be walked around.
2. The ceiling is under 10, not at 10. The freshness poll, the harvest, the capsule writer and the
   store sync all take slots, and two tabs re-targeting at the same moment take two full sets.
3. The full re-target is 8 calls and that is already too close to the ceiling. Send the Explorer's
   listing as ONE subtree call instead of one call per folder, which section 4 shows is faster
   anyway, and hold Source Control's five reads behind its own view being open, which
   `depth.ensure`'s `if (!collapsed)` guard in `src/renderer/scm/HistorySection.tsx` already does.

---

## 6. What the person sees, and the product has already learned this lesson once

### 6.1 There is no progressive fill to be had

I measured when each of the eight answers arrives inside one warm re-target.

| Answer | Median arrival |
| --- | --- |
| Explorer listing | 73.3 ms |
| git status | 73.3 ms |
| check-ignore | 73.3 ms |
| log | 73.3 ms |
| branches | 73.4 ms |
| origin url | 73.4 ms |
| remote branches | 73.4 ms |
| remotes | 73.4 ms |

First answer and last answer are 0.1 ms apart. The round trip dominates so completely that a design
which fills the panel piece by piece as answers land would show one paint, not eight. So the choice
is not between a fast partial fill and a slow complete one. **The surface is in one state for 73 ms
and then it is complete.** The whole design question is what that one state looks like.

### 6.2 Blanking is not available, and that is a measured statement

The header of `src/renderer/tree/ignored.ts` records a defect the operator reported against 0.24.2
and Phase 47.1 fixed. The ignored set used to be emptied on every revalidation, so every dimmed row
repainted at full brightness for the 13 ms to 30 ms the replacement call took. Measured on the
shipped build, it was 84 bad frames out of 3,601 over 31.0 s, in 15 flashes exactly 2,000 ms apart.
The operator called it a strobe.

A remote re-target blanks for 80.9 ms warm and 419.6 ms cold. That is 2.7 times and 14 times the
defect he already reported.

**Three renderer stores blank on a project switch today.** Each is one line, each is invisible
locally, and each becomes visible at 80.9 ms.

| Store | The line | What goes blank |
| --- | --- | --- |
| `useFileTree.setRoot`, `src/renderer/tree/store.ts` | `entriesByDir: {}` | every row in the Explorer |
| `useTreeGitStatus.setRepo`, `src/renderer/tree/git-status.ts` | `isRepo: false, files: NO_FILES` | every colour and badge on those rows |
| `useSearch.setProject`, `src/renderer/search/store.ts` | `...blankResults()` | every search result |

**Two stores already do the right thing, and they are the pattern to copy.**

- `useGit`, in `src/renderer/state/git.ts`, sets `loading: prev?.status == null`. A repository that
  already has a status refreshes without ever entering the loading state, so the skeleton in
  `ScmSection.tsx` is shown on the first read and never again.
- `useTreeIgnored`, in `src/renderer/tree/ignored.ts`, keeps showing the last answer while it fetches
  the new one and swaps in one `set` call. Its header states the rule in capitals, being that
  `invalidate` must never empty the rendered set.

### 6.3 The cheapest change is a cache the git store already has

`useGit.repos` is a map keyed by repository path, so returning to a project you left shows its real
status with no skeleton and no call. `useFileTree` holds ONE root and throws its listings away on
every switch. That asymmetry is the whole difference between a re-target that costs 80.9 ms every
time and one that costs 80.9 ms once per project.

The change is small and I counted it. `entriesByDir` is referenced 18 times across 3 files, being
`store.ts`, `FileTree.tsx` and `shot-probe.ts`. `useFileTree` is imported by 7 files.
`src/renderer/tree/store.ts` is 173 lines. Giving it the same map shape `useGit.repos` has is a
change to one store and its three readers.

### 6.4 The states, and what each one draws

The surfaces the product already has are the skeleton in `TreeSkeleton`, at
`src/renderer/tree/FilesSection.tsx`, and the one in `ScmSection.tsx`. Both are three grey bars.
There is no held state, no dimmed state and no machine label on any sidebar surface.

| Moment | What the Explorer draws | Why |
| --- | --- | --- |
| The click | the machine's name and its colour, at once, in the section header | The label must never lag the body. A body from one machine under another machine's name is the masquerade this round exists to remove |
| The click, when this target was visited before | its remembered rows, dimmed, and no click lands | The rows are that machine's rows, so they are honest. Dimming says they are not confirmed yet, and refusing the click stops an action reaching a path nobody has re-checked |
| The click, first visit | the existing three bar skeleton | There is nothing honest to draw |
| 73 ms, warm | the real rows, undimmed | measured in section 6.1 |
| 120 ms, nothing back | a line naming the machine and saying Tortie is waiting for it | 120 ms is `OPEN_WITH_MENU_DEADLINE_MS`, this product's own answer to the same question |
| 15 s, nothing back | a line saying the machine did not answer, and a way to try again | 15 s is `REMOTE_RUN_TIMEOUT_MS` in `src/main/machines/remote-run.ts` |

Between 120 ms and 15 s there is nothing in the product today. That gap is 14.88 s wide and a phase
has to fill it.

### 6.5 The label does not exist anywhere in the sidebar

`MachineBadge`, at `src/renderer/app/MachineBadge.tsx`, already draws a machine's label in its own
colour and already has a quiet state for a machine that is not answering. It has 6 call sites and
every one of them is in `src/renderer/app`, being `SessionDock.tsx`, `SessionStrip.tsx`,
`SessionRail.tsx` and `TerminalRegion.tsx`.

It has 0 call sites in `src/renderer/tree`, `src/renderer/scm`, `src/renderer/search` and
`src/renderer/quickopen`. I grepped those four directories for the word machine and got 9 hits.
Eight are comments about the computer the app is running on. The ninth is a user-visible string, and
it is wrong the moment the view shows another computer's repository.

`src/renderer/scm/HistorySection.tsx` returns `'Not pushed yet — only on this machine'`.

That is research 54's finding 15 stated exactly, being that the label was specified in research 51
and never written.

---

## 7. Quick Open, priced separately because it is not in the window

Quick Open pays nothing at re-target time. It pays on the first Cmd-P after it.

The index comes from `rg --files`. `buildListFilesArgs` in `src/main/search/files-args.ts` composes
the argv, `src/main/quickopen/worker.ts` spawns it, and the file's own header says ripgrep is the
only thing in the product that knows what is ignored. **Ripgrep is not on the Mac Pro.**

I measured the two substitutes and the transfer.

| What | Median | p95 | Bytes |
| --- | --- | --- | --- |
| `git ls-files`, 1,096 paths, encoded | 50.2 ms | 132.5 ms | 42,620 |
| A payload of 32 KB coming back | 43.8 ms | 127.9 ms | 43,693 |
| A payload of 128 KB coming back | 49.5 ms | 151.7 ms | 174,765 |
| A payload of 512 KB coming back | 65.9 ms | 139.1 ms | 699,053 |
| A payload of 2,048 KB coming back | 167.1 ms | 212.4 ms | 2,796,205 |

From those five points, the link adds about 65 ms for each megabyte of payload before encoding, on top
of the 36.8 ms floor. The 1,096 path list I measured was 29.2 bytes per path, so a 50,000 file
repository is about 1.46 MB, and its index would arrive in roughly 130 ms plus whatever the far
side's walk costs. **The transfer is affordable. The semantics are the problem, and they are not mine to settle.**
`git ls-files` returns tracked files only, so a file you just created would not be findable, and
`find` returns everything including build output because it honours no ignore file.

I could not measure how far apart those two answers are on a real checkout. On `~/.oh-my-zsh` both
answer 1,096, because the working tree is clean and has no ignored content. There is no repository on
the Mac Pro where they would differ.

---

## 8. Verdict, and the one number

**Acceptable, at 80.9 ms warm, judged against the 150 ms budget this product already wrote down at
`OPEN_WITH_MENU_DEADLINE_MS`.**

| Question | Answer | The number |
| --- | --- | --- |
| Is a warm re-target acceptable? | Yes | 80.9 ms median, 173.7 ms p95, against 150 ms |
| Is a cold one acceptable? | No | 419.6 ms median, 525.0 ms p95, 2.8x the budget |
| Is the naive port acceptable? | No | 791.3 ms in series, 337.9 ms at once |
| Does Quick Open belong in the window? | No | 0 calls fire on a project switch |
| Does search belong in the window? | Only with a live query | 0 or 1 call |
| Should the answers fill in progressively? | No | first and last answer are 0.1 ms apart |
| May the surfaces blank? | No | the defect the operator reported was 13 ms to 30 ms of blanking |
| How many calls may a re-target fire at once? | Fewer than 10 | 10 costs 48.9 ms and 11 costs 334.1 ms |

Four things must be built together, and none of them is optional.

1. **One subtree listing, not one call per folder.** 61.7 ms against 337.9 ms, and it keeps the
   re-target under the session ceiling.
2. **A per-machine ceiling in `runRemoteRead`.** There is no counter in the product today.
3. **A poll that keeps the connection open while a tab targets a machine.** The poll has to exist for
   freshness anyway, and any interval under `SSH_CONTROL_PERSIST_SECONDS` turns every re-target after
   the first into the warm case.
4. **A listing cache in `useFileTree`, keyed the way `useGit.repos` is keyed.** 18 references across
   3 files, and it makes a return visit cost nothing.

---

## 9. What I did not measure, and what would measure it

| Not measured | Why | What would measure it |
| --- | --- | --- |
| A real working checkout on the Mac Pro | There is none. `~/.oh-my-zsh` was the only repository of size, at 1,096 tracked files against the worktree's 1,471 | Clone one of the operator's repositories there once, with his say so, and repeat section 3.3 |
| How many folders the operator actually has remembered per project | It lives in his localStorage under `gmux.treeOpen.<root>`, inside userData, which this round may not read | Read the key from a build he is running, or ask him |
| The re-target with a machine that is asleep or has gone away | I could not put his Mac Pro to sleep | Drive it with the machine's network turned off, and measure to the 15 s `REMOTE_RUN_TIMEOUT_MS` and to the 19.3 s the keepalive pair was measured at |
| Anything on Linux | No Linux machine was contacted, which is also true of every earlier round | A Linux host on the tailnet, with the `stat -c` branch of the listing exercised |
| The Context view's re-target cost | It is one of the four sidebar views and I ran out of question | Count what `src/renderer/context/` fires on a project switch, then price it the way section 3 prices the others |
| Why the 150 s gap read 339.3 ms when the 300 s gap read 193.2 ms | One reading per gap, and no packet capture | Repeat section 3.4 with 10 readings per gap, and take `tailscale status` before each |
| Two tabs re-targeting at the same moment | I measured one | Fire two full 8 call sets together and compare against the section 5 table at 16 |
| The far side under load | The Mac Pro was quiet throughout | Repeat with a build running on it |

**What I did to that machine.** I ran read only commands over ssh. `find`, `stat`, `ls`, `wc`,
`head`, `base64`, `printf`, `uname`, `sw_vers`, `command -v`, `grep` on one config file, and git
limited to `rev-parse`, `status`, `log`, `ls-files`, `for-each-ref`, `check-ignore` and `remote` in
its read forms. No write, no tmux, no `sudo`, and nothing under his manifest or userData. His
`~/.ssh/known_hosts` was 2,120 bytes before and 2,120 bytes after. Locally I ran git only with
`--no-optional-locks`, and only inside my own worktree.
