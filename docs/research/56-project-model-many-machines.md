# Research 56. The project and session model when there is more than one machine

Author's note on method. Every claim about this tree was checked in the worktree at `50deb20` during
this session, and every claim about the operator's Mac Pro was measured over ssh during this session.
Where an investigator and an adversary disagreed, I re-checked the tree or the machine myself and I
say which of them was right. Section 12 lists what I did not measure.

---

## 0. The answer

**Build model A. A project carries a machine, and a tab is either local or remote. Refuse model B and
refuse model C, and refuse them for different reasons, which is also the answer to the charter's
first question.** Model B says one tab holds the same work in two places, and on the operator's own
two machines there is no such pair to hold. None of his 11 open project folders exists on the Mac
Pro, and the Mac Pro's only Tortie work sits in `/Users/gdc/dev/test-tortie`, a folder holding 0
files. Model C says the sidebars follow the focused session, and in this tree it cannot work as
described, because the four stores a re-target would drive all return early when the path string is
unchanged, so on two Macs that both hold `/Users/gdc/gmux` the badge would flip and the file tree,
the git decorations, the search rows and the Context readout would keep showing this Mac under the
other machine's name, which is the exact defect the round exists to remove. Model A is also cheaper
than both investigators priced it. Research 55 already ruled that a remote project is carried by a
new additive table `remote_projects` with `UNIQUE(machine_id, path)`, so it is not a rebuild of
`projects` and `MANIFEST_MIN_COMPATIBLE_VERSION` stays at 13. Under A every refusal and every label
is keyed on one stable fact, `activeProject().machineId`, which does not change for the life of the
tab, instead of on `activeSession()`, which changes on every press of ⌥⌘↓ and falls back to
`sessions[sessions.length - 1]`. The cost the charter attributes to A, being that one piece of work
is split across two tabs, is not a cost on the operator's machines, because the work over there is
different work in a different folder. The "Files live on `<machine>`" label is permanent and part of
this design, exactly as research 55 ruled, and it ships in the same commit as the per-tab refusal it
explains.

---

## 1. What I measured on the operator's two machines, this session

Read only throughout. His `-L gmux` server on the Mac Pro was listed before and after and the diff is
empty. One probe socket named `zz-r56-probe` was created on a private tmux socket on that machine,
its session was killed by id, and its server was killed. His `~/.ssh/known_hosts` was 2,120 bytes
before and 2,120 bytes after.

### 1.1 The two machines hold no folder in common

| Fact | Measured value |
| --- | --- |
| Local project folders with a live session, counted from `tmux -L gmux list-sessions` on this Mac | 11 folders, 38 sessions |
| Of those 11 folders, how many exist on the Mac Pro | **0** |
| Folders in `/Users/gdc` on the Mac Pro | 13 entries, of which the only Tortie one is `dev` |
| The far folder Tortie's sessions run in | `/Users/gdc/dev/test-tortie` |
| Files in that folder | **0**, it is empty |
| Is it a git repository root | No. `git rev-parse --show-toplevel` answers `/Users/gdc/dev` |
| Git remotes on `/Users/gdc/dev` | **0**. `git remote -v` prints nothing |

This is the measurement that decides the round. There is no second copy of any project. There is
different work, in a folder with a different name, on a machine that has no clone of anything this
Mac holds.

### 1.2 The five live sessions on the Mac Pro, and the stamp that is not there

`tmux -L gmux show-options` was read for each session id.

| tmux id | Name | `session_path` | `@gmux-id` | `@gmux-agent` | `@gmux-name` | `@gmux-project` |
| --- | --- | --- | --- | --- | --- | --- |
| `$0` | gmux-control | `/` | absent | absent | absent | absent |
| `$10` | shell-1 | `/Users/gdc/dev/test-tortie` | present | shell | **absent** | **absent** |
| `$12` | claude-1 | `/Users/gdc/dev/test-tortie` | present | claude | **absent** | **absent** |
| `$13` | claude-2 | `/Users/gdc/dev/test-tortie` | present | claude | **absent** | **absent** |
| `$15` | shell-1-2 | `/Users/gdc/dev` | present | shell | **absent** | **absent** |

Two things follow, and both correct a document in this round.

1. `@gmux-project` does not exist on any session on that machine. The four stamp loop in
   `remoteCreate` landed in commit `17f1dea` dated 2026-08-17, and all five sessions were created on
   15 and 16 August, so they predate it. **The installed base of `@gmux-project` stamps is zero.**
2. `$0 gmux-control` carries no `@gmux-id`, so it is not Tortie's by the rule in
   `src/main/machines/remote-sessions.ts`. Four sessions are Tortie's, not five.

### 1.3 tmux 3.7c on his Mac Pro accepts a folder that is not there

Run on a private socket named `zz-r56-probe`, killed immediately, his `-L gmux` untouched.

```
tmux -L zz-r56-probe new-session -d -c /Users/gdc/gmux -- /bin/sh -c 'sleep 20'
  exit = 0
  session_path      = /Users/gdc/gmux
  pane_current_path = /Users/gdc
```

`/Users/gdc/gmux` does not exist on that machine. tmux exits 0, keeps the requested string in
`session_path`, and starts the process in the home directory. `REMOTE_LIST_FORMAT` reads
`#{q:session_path}`, so Tortie would read the requested string back and believe it.

`createSession` in `src/main/sessions/core.ts` sends `cwd: input.cwd ?? input.projectPath` on the
remote branch, and `CreateSessionModal.tsx` sends `cwd` only when the field is non-empty and blanks
that field when a machine is picked. `CREATE_DIR_EMPTY_HINT` in `machine-copy.ts` reads "Leave this
empty to start in your home directory on that machine." **The promise in that sentence is kept only
because `/Users/gdc/gmux` happens to be absent over there.** The day the operator clones gmux on the
Mac Pro, an empty field starts the agent in a folder he did not choose and the row says nothing.

### 1.4 What a re-target costs on his tailnet

Composed with the same options `sshOptions` in `src/main/machines/ssh.ts` sends, including
`ControlMaster=auto` and `ControlPersist=60s`. All calls warm, meaning the shared connection was
already open. n is 15 unless stated.

| Shape | Median | min | p95 | max |
| --- | --- | --- | --- | --- |
| `true`, one call | 33.0 ms | 27.8 | 122.9 | 158.7 |
| One folder listing, one call | 36.4 ms | 29.9 | 43.6 | 134.3 |
| `git status --porcelain=v2 --branch -z --untracked-files=all` on `/Users/gdc/dev` | 42.3 ms | 34.3 | 57.1 | 126.0 |
| `find -maxdepth 3`, one call | 32.5 ms | 26.6 | 37.8 | 128.2 |
| `tmux -L gmux list-sessions -F` | 47.4 ms | 37.5 | 123.5 | 146.1 |
| Six sidebar calls issued **in series**, n=8 | 310.8 ms | 197.5 | 345.7 | 441.6 |
| The same six issued **at once**, n=8 | **44.0 ms** | 40.6 | 47.0 | 50.9 |
| The same six as **one** command line, n=15 | 60.9 ms | 59.0 | 110.4 | 161.2 |

Two results here are new and they change a design rule the round inherited.

- **Six calls at once cost 44.0 ms and one combined call costs 60.9 ms.** Research 55 ruled "one call
  per gesture, never one call per row", and investigator 2 repeated it as "one subtree listing, not
  one call per folder". The measurement says the rule that matters is **never in series**. Issuing
  the calls concurrently over the shared connection is as cheap as batching them, and it is cheaper
  than a single command line that runs the six steps one after another on the far side.
- The tail is real. A single warm call has a p95 of 122.9 ms against a median of 33.0 ms, which is
  3.7 times. Any budget set on a median will be broken several times a minute.

### 1.5 The concurrency ceiling is 10, reproduced independently

One folder listing, k calls issued at once, 8 repeats at each k. This reproduces the cliff
investigator 2 reported, on a different day, with a monotonic series that answers the adversary's
objection that the cliff was noise.

| k | Median | max | Failures |
| --- | --- | --- | --- |
| 1 | 36.8 ms | 122.4 | 0 of 8 |
| 4 | 40.2 ms | 136.4 | 0 of 32 |
| 8 | 42.7 ms | 145.4 | 0 of 64 |
| 9 | 42.7 ms | 52.3 | 0 of 72 |
| 10 | 46.3 ms | 139.6 | 0 of 80 |
| **11** | **258.8 ms** | 332.1 | 0 of 88 |
| 12 | 317.2 ms | 342.4 | 0 of 96 |
| 16 | 373.3 ms | 382.9 | 0 of 128 |

**The cause is `MaxSessions`, and I closed the adversary's objection by reading the far machine's
include directory.** The adversary was right that `#MaxSessions 10` in `/etc/ssh/sshd_config` is a
commented line and proves nothing on its own. I read `/etc/ssh/sshd_config.d/`, which holds exactly
one file, `100-macos.conf`, 133 bytes, setting `UsePAM`, `AcceptEnv` and `Subsystem` and nothing
else. Nothing overrides `MaxSessions`, so the effective value is the OpenSSH default of 10, and the
step falls between k=10 and k=11. `MaxStartups` cannot be the cause, because `ControlMaster=auto`
gives one authenticated connection per machine. Nothing in `src/main/machines/remote-run.ts` or
`exec-plane.ts` counts calls in flight, so this ceiling is unguarded today.

---

## 2. The four things the round got wrong, corrected against the tree

I take the adversaries where they refuted an investigator, and I overrule them in one place where I
could check the machine myself.

### 2.1 Model C is a silent no-op on two machines with the same path

This is the finding that decides against C, and no investigator named it. All four stores a
re-target would drive guard on the path string alone.

| Store | Symbol | The guard |
| --- | --- | --- |
| `src/renderer/tree/store.ts` | `useFileTree.setRoot` | `if (get().rootPath === rootPath) return;` |
| `src/renderer/tree/git-status.ts` | `useTreeGitStatus.setRepo` | `if (get().repoPath === repoPath) return;` |
| `src/renderer/search/store.ts` | `useSearch.syncProject` | `if (repoPath === get().repoPath) return;` |
| `src/renderer/context/store.ts` | `useContext.syncProject` | `if (get().cwd === cwd) return;` |

Investigator 2 named the search symbol `useSearch.setProject`. That symbol does not exist. The
symbol is `syncProject`. Investigator 2 also counted three stores that blank; there are four, because
`useContext.syncProject` sets `scan: null` and Context is one of the four sidebar views.

Investigator 1 wrote that C "needs no model change" and that the re-root mechanism "already exists".
Both statements are false while these four early returns stand. Making C work means re-keying every
one of these stores on the pair `(machine, path)`, which is the same re-keying model A needs and no
less of it.

### 2.2 Model C's input is wrong in the case the create sheet invites

Investigator 1 built C on `{ machine: session.machine, root: session.cwd }` and asserted that "every
remote session in this tree has a `cwd` on the far machine, typed by the person at create time". The
default path through the product produces the opposite, and section 1.3 measures it on the
operator's own machine at his own tmux version. A person who leaves the Directory field empty gets a
session whose `cwd` is this Mac's project folder, whose agent is in `$HOME` over there, and whose row
draws no worktree chip because `cwd` equals `projectPath`.

### 2.3 Model A was priced at the cost of a mechanism research 55 already rejected

Investigator 1 and investigator 5 both priced A as a rebuild of the `projects` table with
`MANIFEST_MIN_COMPATIBLE_VERSION` moving from 13 to 15, and investigator 5 used that price to rank A
as the hardest of the three to reverse. Research 55 ruling 1 says the opposite in one line, and the
row is in this tree at `docs/research/55-remote-project-folder.md` line 46.

> A new table `remote_projects`, migration 015, additive. NOT a rebuild of `projects` and NOT a bump
> of `MANIFEST_MIN_COMPATIBLE_VERSION`.

I checked the schema. `src/main/manifest/schema.ts` holds 14 migrations, 15 `addColumnIfMissing`
calls, 3 `CREATE TABLE IF NOT EXISTS` statements and 0 drops, renames or rebuilds.
`MANIFEST_SCHEMA_VERSION` is 14 and `MANIFEST_MIN_COMPATIBLE_VERSION` is 13. A fourth
`CREATE TABLE IF NOT EXISTS` has the precedent of `restore_attempts`. So A's carrier is the same
shape as work this file has already done three times.

### 2.4 The door investigator 5 asked the round to close should not be closed

Investigator 5 proposed this rule. No phase may change the value written to `sessions.project_path`,
or to the `@gmux-project` stamp, for a session on another machine. It gave three reasons. I checked
all three and none of them survives.

| Reason | What I found |
| --- | --- |
| 12 renderer reads place a session under a tab by comparing that field, so a far path makes every remote session vanish | The count is 8 tab placement comparisons out of 14 occurrences of `projectPath ===` or `projectPath !==` outside tests. They vanish only if the field changes and the comparison does not. Model A changes both in one commit |
| The `@gmux-project` stamp lives on other people's tmux servers and cannot be rewritten on a sleeping machine | Measured in section 1.2. **No session on his Mac Pro carries that stamp at all.** There is nothing to rewrite |
| `writeManifest` in `src/main/manifest/reconstruct.ts` upserts a project for every distinct `projectPath` with no existence check | The missing check is real. `reconstruct.ts` contains 0 occurrences of "remote" or "machine" and rebuilds from local tmux candidates only, so it never sees a remote row |

There is also a contradiction inside one file that the rule would have frozen.
`RemoteCreateInput.projectPath` in `src/main/machines/remote-sessions.ts` is documented as "The
project tab's path, ON THAT MACHINE", and its only caller, `createSession` in
`src/main/sessions/core.ts`, passes this Mac's path. **Model A makes the caller agree with the
declared contract rather than changing the contract.** That is the resolution, and it is the reason
the door stays open.

---

## 3. The options, with the deciding reason on every row

| Option | Verdict | Deciding reason |
| --- | --- | --- |
| **A. A remote project is its own tab**, carried by an additive `remote_projects` table with `UNIQUE(machine_id, path)` | **BUILD** | Every surface in a tab has one machine for the life of the tab, so each refusal and each label reads one stable field. The carrier is additive and `MANIFEST_MIN_COMPATIBLE_VERSION` stays 13. It adds no new re-target trigger. Measured: 0 of the operator's 11 project folders exists on the far machine, so the split across two tabs describes his machines rather than dividing one piece of work |
| **B. A project is a mapping** from one tab to a path on each machine | **REFUSE** | Measured: there is no pair to map. 0 of 11 folders exist on both machines, and the far folder is empty and is not a repository root. B would hold a second copy of two strings the session row already carries, and it would carry them for a relationship that does not exist |
| **C. The sidebars follow the focused session** | **REFUSE** | Four stores return early when the path string is unchanged, so C is a silent no-op in exactly the collision case it exists to solve. Its input, `session.cwd`, is this Mac's path by default. It moves the re-target trigger from the project tab, which a person switches deliberately, to session focus, which fires on 21 non-test `setActiveSession(` call sites and on ⌥⌘↑ and ⌥⌘↓ |
| **B plus C together**, the charter's suggested pairing | **REFUSE** | It inherits both refusals. It is worth saying that B and C are separable, because the two refusals are independent: B fails on the field data and C fails on the tree |
| **C-zero**, investigator 1's fourth shape, being the label shipped first and the re-target deferred | **REFUSE** | Research 55 section 11 already ruled that the label must not ship alone, because on its own it discloses a destructive write instead of stopping it, and the backlog records that ruling twice. Under A there is no re-target to defer, so the shape has nothing left in it |
| **Serve this Mac's copy under the far machine's label**, investigator 4's tempting sixth option | **REFUSE** | A search hit carries no machine, so `src/renderer/editor/store.ts` composes a plain path tab id and opens this Mac's file under the other machine's name. That is the masquerade written down |
| **Rebuild the `projects` table** so one table holds local and remote projects | **REFUSE** | `projects.path` is `TEXT NOT NULL UNIQUE` and `ProjectsRepository.upsertProject` depends on it through `ON CONFLICT(path) DO UPDATE`. Rebuilding it is the only change in this design that a later round could not undo, and research 55 already rejected it |
| **Do nothing and leave the sidebars silently local** | **REFUSE** | It is the state that produced finding 15 of research 54. A remote session's row sits in a local tab today with no statement about what the sidebar reads |

---

## 4. Model A, specified

### 4.1 What a remote project is

A row in a new table.

```
remote_projects (
  id          TEXT PRIMARY KEY,
  machine_id  TEXT NOT NULL,
  path        TEXT NOT NULL,      -- absolute, ON THAT MACHINE
  name        TEXT NOT NULL,
  added_at    INTEGER NOT NULL,
  UNIQUE(machine_id, path)
)
```

Migration 015, additive, `MANIFEST_SCHEMA_VERSION` 14 to 15,
`MANIFEST_MIN_COMPATIBLE_VERSION` stays 13. An older build after a downgrade shows local projects
only, which is true rather than misleading.

### 4.2 How a tab is identified from here on

The renderer's project identity stops being the path string and becomes the pair
`(machineId | null, path)`. One helper composes the key, and every path keyed record uses it.

| Record | Where | Key today |
| --- | --- | --- |
| `gmux.splitLayouts` | `src/renderer/state/layout.ts` | object keyed by project path |
| `gmux.treeOpen.<path>` | `src/renderer/tree/FileTree.tsx`, `LS_OPEN_PREFIX` | path in the key |
| `gmux.context.agent.<cwd>` | `src/renderer/context/ContextView.tsx` | path in the key |
| `gmux.context.bundled.<id>.<cwd>` | same | path in the key |
| `gmux.context.collapsed.<id>.<cwd>` | same | path in the key |
| `gmux.scm.branchesCollapsed.<repoPath>` | `src/renderer/scm` | path in the key |
| `gmux.scm.changesCollapsed.<repoPath>` | `src/renderer/scm/ScmSection.tsx` | path in the key |
| `gmux.scm.historyCollapsed.<repoPath>` | `src/renderer/scm` | path in the key |
| `gmux.scm.historyScope.<repoPath>` | `src/renderer/scm` | path in the key |
| `gmux.scm.runsCollapsed.<repoPath>` | `src/renderer/scm` | path in the key |
| `gmux.quickopen.recents` | `src/renderer/quickopen/recents.ts` | `repoPath` field inside each entry |

That is 11 persisted records. Investigator 1 said 11 and adversary 1 said 12 and adversary 2 said
nine. I counted 10 key patterns that embed an absolute path plus `gmux.splitLayouts`, whose object
keys are project paths, which is 11.

**Measured: 0 of these collide today**, because 0 of the operator's 11 folders exists on the far
machine. The re-key is therefore protection against the day he clones a repository on the Mac Pro,
not repair of damage already done. It is one helper and 11 call sites, and it must land before the
first remote project tab can be opened, because after that a collision is silent.

In addition, `rootsFor` in `src/renderer/quickopen/store.ts` dedupes roots with
`filter((p) => p !== active.path)`, so two same-path projects on different machines would collapse to
one. Under this design Quick Open never sees a remote project at all, which is section 6.

### 4.3 Where a remote session's row lives

In the tab for its own machine and its own folder. That means two changes made together.

1. `sessions.project_path` for a remote session holds the far path, which is what
   `RemoteCreateInput.projectPath` already says it holds.
2. The 8 tab placement comparisons compare the machine as well as the path.

The `@gmux-project` stamp then records the far project, which is what the file's own header says it
records. Section 1.2 measured that no session in the field carries the stamp, so no machine has to be
reached to correct anything.

### 4.4 What happens to the sessions that exist

A remote session row written before this change carries this Mac's path in `project_path`. On first
run each such row is re-homed to a remote project for its machine, rooted at the folder the poll
reports in `#{q:session_path}`, and rooted at the machine's home directory when that folder does not
exist over there. Applied to the operator's Mac Pro today the outcome is exact and checkable.

| Session | Rehomed to |
| --- | --- |
| shell-1 | remote project `mac-pro:/Users/gdc/dev/test-tortie` |
| claude-1 | the same |
| claude-2 | the same |
| shell-1-2 | remote project `mac-pro:/Users/gdc/dev` |
| gmux-control | nothing. It carries no `@gmux-id`, so it is not Tortie's |

Four sessions and two remote project tabs.

### 4.5 What the create path does after this

The existence check moves off the create and onto the project add, where it happens once instead of
once per session. Adding a remote project asks the machine `test -d` for the folder, one round trip,
36.4 ms at the median measured in section 1.4, and refuses the add with the folder named when the
answer is no. The create sheet's Directory field then defaults to the tab's own folder and no longer
blanks itself, because the tab already names a folder that exists on that machine. `CREATE_DIR_EMPTY_HINT`
is deleted, because after this the empty case cannot arise.

---

## 5. Charter question 3, ruled. How a local project learns its remote counterpart

**It does not. There is no counterpart, and the product must not invent one. A remote project is
added by hand, by naming the machine and the folder, and it is a project in its own right rather than
a copy of a local one.**

The charter offered four mechanisms. I measured each against the only two machines that exist.

| Mechanism | Result on the operator's machines | Verdict |
| --- | --- | --- |
| Same absolute path | 0 of 11 local folders exist on the Mac Pro | Fails 11 times out of 11 |
| Matching basename | `gmux` against `test-tortie`, and no other local basename appears over there | Fails 11 times out of 11 |
| Matching the git remote URL | `/Users/gdc/dev` has 0 git remotes, and `/Users/gdc/dev/test-tortie` is not a repository root | Cannot be attempted |
| Asking the machine | There is nothing on that machine for it to answer with | Cannot be attempted |
| **By hand** | The person names the machine and types the folder | **This one** |

**What happens when the mapping is wrong or absent.** Under model A there is no mapping to be wrong,
which is the point of choosing it. A remote project tab either names a folder that exists on that
machine, checked once at add time by one `test -d`, or it does not get created. A machine that is
unreachable at add time is refused with the machine named, and the person tries again. A folder that
is deleted on that machine later shows the same empty listing a deleted local folder shows, and the
tab is closed by hand.

This also answers the half of the question the round left on the floor. Every automatic mechanism the
charter named would have produced a wrong answer on the operator's own machines on the day the
question was asked, and a wrong mapping is worse than no mapping, because it puts one machine's files
under another machine's name.

---

## 6. Charter questions 4 and 5, affirmed from research 55, with one change

I do not re-open these. Research 55 ruled them and research 56 investigator 4 agreed with both. Model
A changes only what the guard reads.

| Surface | Ruling | What model A changes |
| --- | --- | --- |
| Explorer | Crosses. One frozen read script taking a root, a depth and a cap | The root is the tab's folder rather than a focused session's `cwd` |
| Git sidebar | Present and read only. One section, being Changes plus a header band. History, Branches, Runs and every write verb absent rather than disabled | The guard is `activeProject().machineId !== null`, read once per tab, instead of a focus test in 5 files behind 13 menu sites |
| Search | Refused, with a labelled empty state | Same |
| Quick Open | Refused with it | The remote project is excluded from `rootsFor`, one line |
| Symbol palette | Refused with it | Same |
| Context | Refused for a remote tab | `ContextView` computes `cwd` from the active project, so the guard is the same one field |

Three facts I checked myself that support keeping the search refusal.

1. Tortie's vendored ripgrep at `node_modules/@vscode/ripgrep-darwin-arm64/bin/rg` is 4,528,512 bytes
   at version 15.0.0, and this Mac's PATH ripgrep is 15.1.0. Two versions already disagree on one
   computer, before a second computer is involved.
2. `src/renderer/scm` holds 285 occurrences of the word "remote" outside tests in `.ts` and `.tsx`,
   and every one of them means a git remote. The copy for these surfaces must name the machine's own
   label and must never say "remote".
3. The word "machine" appears 2 times in `src/renderer/scm`, 0 times in `src/renderer/search`, 6
   times in `src/renderer/tree` and 1 time in `src/renderer/quickopen`, all of them prose. None of
   these four surfaces can observe a machine today.

**One correction to investigator 4.** It offered the editor's `machine:${machineId}:${relPath}` tab
id as "the pattern that already solved it". Research 55 section 9.2 records that same line as a
defect, because two repositories on one machine holding the same relative path collide to one id.
Under model A the key is the project pair from section 4.2 plus the relative path, which fixes both.

**One correction to investigator 4's ruling 4.** It proposed that main refuse a remote path at
`normalizeRepoPath` in `src/main/git/ipc.ts`. That function takes one string and checks
`isDirectory` on this Mac. On two Macs with the same home layout `/Users/gdc/gmux` passes, because it
is a real local repository. The refusal would fire only in the harmless case. Under model A the guard
sits where the machine is known, being the tab.

---

## 7. Charter question 6. The tab spine and the session list

**A remote session's row sits in the remote project's tab, and the project tab carries the machine
badge.** That is the whole change, and it follows from model A rather than being a separate decision.

Four items in the session list still need work, and they are cheap.

| # | Item | Evidence |
| --- | --- | --- |
| 1 | Delete the worktree chip for a remote row. One line in `isOutsideProject` in `src/renderer/app/session-actions.tsx` | The function is `session.cwd !== session.projectPath && !session.cwd.startsWith(...)`. Under model A a remote row's `projectPath` becomes the far folder, so the chip stops firing for the ordinary case by itself. The explicit machine test still belongs there, so the chip can never mean two things |
| 2 | Draw `MachineBadge` in the split surface | `src/renderer/app/split/SplitSurface.tsx` imports `isOutsideProject` and draws it at line 129, and it does not import `MachineBadge`. `MachineBadge` renders at 6 sites in 4 files, all under `src/renderer/app`, and the split surface is not one of them |
| 3 | Guard Split Terminal on a remote session | `canSplit` in `src/renderer/terminal/terminal-menu.ts` has no machine test, and `quickCreate` in `src/renderer/state/sessions-slice.ts` composes a `createSession` call with no `machineId`, so main takes the local branch. Splitting a remote pane creates a local session beside it with no sentence saying so. This is the same shape as Phase 84 item 1, which guards Restart in a split leaf and does not mention Split Terminal |
| 4 | Fix `displayPath` for a far path | `displayPath` in `src/renderer/app/format.ts` matches `/^\/Users\/[^/]+(\/.*)?$/` and replaces it with a tilde. It has 9 call sites, and 2 of them can receive a path on another machine. A second Mac's `/Users/them/proj` is drawn as `~/proj` |

Add the four files to the 13 file list in `src/renderer/app/__tests__/machine-vocabulary.test.ts` in
the same commit.

**One thing investigator 5 proposed that should not be built as written.** It asked for
`#{q:pane_current_path}` to be added to `REMOTE_LIST_FORMAT`. Adversary 1 measured that
`pane_current_path` follows the active pane and changes on every `cd`, so a chip or a tooltip driven
off it would appear and disappear during ordinary use, and remote rows would behave differently from
local rows whose `cwd` comes from a fixed manifest field. Under model A the field is not needed for
display, because the tab names the folder. It is still worth reading **once**, at the moment a
pre-model-A session is re-homed in section 4.4, as a second opinion about where that session actually
is.

---

## 8. The "Files live on `<machine>`" label. The ruling the backlog asks for

**It is permanent and it is part of this design. It is not a stopgap, and it is not its own phase.**
This affirms research 55 section 11, which the backlog already records at two places, and it refuses
investigator 1's C-zero, which proposed shipping the label first with the behaviour deferred.

Three facts and then the shape.

| Fact | Value |
| --- | --- |
| Occurrences of the string "Files live on" in `src/` | **0**. It appears only in `docs/BACKLOG.md`, `docs/research/51-remote-machines.md`, `docs/research/54-remote-parity.md` and this round's documents |
| Surfaces that can observe a machine today | 0 of the 4 named. The counts are in section 6 |
| Research 55's ruling on shipping it alone | "On its own it discloses a destructive write instead of stopping it" |

Under model A the label changes shape in one way that makes it better. It is a statement about the
**tab**, so it is written once in the sidebar header and it does not change while the tab is open. It
does not need to be repeated on four surfaces, and it does not need to flicker as focus moves,
because focus no longer moves it. The two refused surfaces still carry their own sentence, because a
refusal with no reason on it is worse than the label.

It ships in the same commit as the per-tab refusal, it is written once in
`src/renderer/app/machine-copy.ts` beside the 19 sentences already there, and it names the machine's
own label rather than the word "remote".

---

## 9. Charter question 7. Which choice is cheapest to reverse

| Candidate | Durable bytes it writes | To undo it | What would be stranded |
| --- | --- | --- | --- |
| The workspace refusals and the label | none, derived at render | delete the branches | nothing |
| The re-key of the 11 persisted records | 11 localStorage keys change shape | old keys are ignored and re-created | collapsed and expanded state, which the person re-sets in seconds |
| **Model A's `remote_projects` table** | one additive table, migration 015 | stop reading it, or drop the table | remote project rows and the tab order, both re-creatable by hand from a list the machine still answers |
| Model A's change to `sessions.project_path` for remote rows | one field per remote session | re-home them back from `#{q:session_path}` | nothing, because section 1.2 measured that no far machine carries a `@gmux-project` stamp to correct |
| A rebuild of the `projects` table, **not chosen** | the table itself, plus `MANIFEST_MIN_COMPATIBLE_VERSION` 13 to 15 | a second rebuild, and reaching every machine | every project row, and every older build the person might run |

**The answer is that model A as specified is reversible and the rejected form of A is not.** The
distinction is the additive table, and both investigators missed it because they priced A as the
rebuild.

---

## 10. The order of work for Phase 90

Each item names its verification tier under the rule in CLAUDE.md.

| # | Item | Tier | Gate it must add |
| --- | --- | --- | --- |
| 1 | The four session list items in section 7 | Tier 1 for items 2 and 4, **Tier 3 for item 3** because Split Terminal starts a process on the wrong computer | `conformance:machines` for item 3 |
| 2 | The project key helper and the 11 persisted records | Tier 2 | none |
| 3 | Migration 015, `remote_projects`, and the add flow with its one `test -d` | **Tier 3**, it touches the manifest | `conformance:machines` |
| 4 | Tab placement on the pair, and the re-home in section 4.4 | **Tier 3**, it touches durability and restore | `conformance:machines`, `conformance:resume:capture` |
| 5 | The per-tab refusals, the read only git section, and the label, in one commit | Tier 2 | `conformance:context` for the Context guard |
| 6 | The Explorer crossing, one frozen subtree script, calls issued concurrently under a per-machine ceiling of 10 | **Tier 3**, universality across machines is claimed | `conformance:machines` |

Item 6 carries one rule that the measurement in section 1.4 changed. **Never issue the sidebar's
calls in series**, because six in series cost 310.8 ms and the same six at once cost 44.0 ms. Batching
into one command line is not required and is slower than concurrency here, at 60.9 ms. A per-machine
ceiling of 10 in flight is required, because the far machine's effective `MaxSessions` is 10 and
nothing in `src/main/machines` counts.

---

## 11. Defects found this session that are not blocked on the model

| # | Defect | Evidence |
| --- | --- | --- |
| 1 | Split Terminal on a remote session silently creates a local session in the same split | `canSplit` in `src/renderer/terminal/terminal-menu.ts` has no machine test. `quickCreate` in `src/renderer/state/sessions-slice.ts` sends no `machineId` |
| 2 | The empty Directory field promise is kept by luck | `CREATE_DIR_EMPTY_HINT` promises the home directory. `createSession` in `src/main/sessions/core.ts` sends `cwd: input.cwd ?? input.projectPath`. Measured in section 1.3, tmux 3.7c on his Mac Pro accepts the absent path and starts in `/Users/gdc`, so the promise holds only while that folder is absent |
| 3 | The split surface draws the worktree chip and no machine badge | `src/renderer/app/split/SplitSurface.tsx` line 129 |
| 4 | `displayPath` rewrites another person's home path to a tilde | `src/renderer/app/format.ts`, 9 call sites, 2 reachable with a far path |
| 5 | Nothing counts calls in flight to one machine | `remote-run.ts` and `exec-plane.ts` hold no counter. Three modules keep private per-machine sets. The ceiling is 10 and it is unguarded |

Defect 2 overlaps Phase 84, which already decided a read only pre-create check. Model A moves that
check to the project add, so Phase 84 and this phase must agree on one check rather than write two.

---

## 12. What is not true, and what nobody checked

**What is not true.**

- It is not true that model C needs no model change. Section 2.1.
- It is not true that model A rebuilds the `projects` table. Section 2.3.
- It is not true that the far machine holds a durable record of a folder it does not have. Measured in
  section 1.2, no session there carries `@gmux-project`. Investigator 1's defect 3 describes what
  future creates would do, not what exists.
- It is not true that the "Files live on `<machine>`" label was written. It appears 0 times in `src/`.
- It is not true that Quick Open fires no work on a project switch. `QuickOpenPalette.tsx` has a
  `useEffect` keyed on `[activeProjectId]` that calls `warm()` through `requestIdleCallback`.
- It is not true that the Context readout can be opened for a remote session. `showLoadedItem` in
  `src/renderer/app/session-actions.tsx` returns the verb disabled when `session.machine !==
  undefined`, and that is its only product call site. The Context **sidebar** is still local, and
  that is the thing model A fixes.
- It is not true that "one call per gesture" is the batching rule. Concurrency is what matters.
  Section 1.4.

**What nobody checked, including me.**

1. I did not drive the app. No screenshot was taken and no interface was exercised.
2. I ran no gate, no test and no conformance script. This worktree has no `node_modules`, so
   `npm run typecheck`, `npm run build` and `npm run conformance:machines` could not run here. Every
   claim about what a test asserts is a claim about its source text.
3. I did not open the operator's manifest or his userData, so I do not know how many remote session
   rows exist in it, nor how many of his projects are open in the app right now. The 11 folders in
   section 1.1 come from live tmux sessions, which is a lower bound on his open tabs.
4. I measured no Linux host, no sleeping machine and no wide area link. `tailscale ping` was reported
   by research 55 as a direct local path, and every number in section 1.4 is a same building number.
5. I did not measure the cold connection case at all. Every timing in section 1.4 is warm. The
   product polls each machine at 5,000 ms focused or 30,000 ms idle and `ControlPersist` is 60
   seconds, so a machine Tortie is watching should always be warm, and I did not verify that claim
   against a running app.
6. I did not measure the Explorer's real listing cost on a large far repository, because no checkout
   of any of his repositories exists on that machine. The 36.4 ms folder listing was against
   `/Users/gdc/dev`, which holds few entries.
7. I did not measure `context:scan` on a far machine and I did not price the Context refusal.
8. I did not count the cost of the 11 record re-key in files changed or lines, and I did not check
   whether any of the 11 has a reader outside the file that writes it.
9. I did not measure the re-home in section 4.4 against a real manifest, so the outcome table in that
   section is derived from the tmux listing rather than from his stored rows.
10. I did not verify `MaxSessions` with `sshd -T`, which needs root on his machine. I read
    `/etc/ssh/sshd_config` and the one file in `/etc/ssh/sshd_config.d/`, and I inferred the effective
    value from the absence of an override plus the measured step between k=10 and k=11.
11. I did not test what happens when two Tortie windows re-target the same machine at the same time.
12. I did not check whether `git status` on the far machine behaves the same on a repository with
    hundreds of changed files. `/Users/gdc/dev` is small.

**Safety, stated plainly.** Every ssh command was a read, except the one probe in section 1.3, which
ran on a private socket named `zz-r56-probe`, created one session, killed it by its tmux id and then
killed that server. His `-L gmux` server was listed before and after and the diff is empty, with the
same 5 sessions and the same 5 tmux ids. His `~/.ssh/known_hosts` is 2,120 bytes before and after. No
git command that writes was run anywhere. Nothing was written outside
`docs/research/` in this worktree.
