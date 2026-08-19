# Research 56, investigator 4. What the source control view and search do when the two copies disagree

Read against the working tree at `wt-r56`, HEAD `50deb20`, on 2026-08-18. Every claim about this
tree names a file and a symbol I opened this session. Numbers I took myself are marked "measured
here". Numbers taken from `docs/research/assets/55-measurements.txt` are marked as such, because that
file is the only real second machine measurement that exists and I did not repeat it.

---

## 1. The answer

| # | Question | Ruling | The one deciding fact |
| --- | --- | --- | --- |
| 1 | What the source control view shows on a remote focus | **Present, read only, and it is one section.** The Changes list plus a header band. History, Branches, Runs and every verb are ABSENT, not disabled | The far machine's answer to `review-list` already carries the whole porcelain status, and `parseRemoteReviewListing` in `src/main/machines/remote-review.ts` throws away the branch, the upstream, the ahead count, the behind count and every untracked file. The section costs no new script, no new git verb and no new round trip |
| 2 | How a person tells at a glance which machine's git they are looking at | **Three signals at once.** The verbs are gone, `MachineBadge` names the machine in that machine's own colour, and the branch name is the far machine's own | Two of the three are free. `MachineBadge` in `src/renderer/app/MachineBadge.tsx` already exists and is drawn at 6 sites, none of them a workspace surface. The branch name is already on the wire |
| 3 | The word the copy may not use | **Not "remote".** The copy names the machine's label, and it lives in `src/renderer/app/machine-copy.ts` | `src/renderer/scm` holds 285 non-test occurrences of "remote" and every one of them means a git remote. Adding a second meaning to that word inside that view is the one copy change that cannot be undone by editing a string |
| 4 | How a local write is stopped from looking like a remote one | **The git contract stops representing a remote path at all.** The repository argument on all 27 `git:*` channels becomes a reference that can only name this Mac, and main refuses anything else | A renderer guard is not enough and this tree already proves it. `src/renderer/scm` contains the word "session" 12 times and all 12 are comments or user copy. Neither the source control view nor the search view can currently tell that a session exists, so a guard keyed on focus has nothing to key on and would have to be repeated in 5 files |
| 5 | What project wide search does on a remote focus | **Refused, with a labelled empty state.** Not followed to the machine, and not silently served from the local copy | ripgrep is not installed on mac-pro. Beyond that, the ripgrep on THIS Mac's own PATH is 15.1.0 and the one Tortie runs is 15.0.0, measured here. "Use the machine's own rg" already disagrees with Tortie's own answers on the machine Tortie is running on |
| 6 | Whether serving the local copy under a label is acceptable | **No, and this is the ruling that is new to round 56.** Under model B a local counterpart exists for the first time, so this option is real, and it is still wrong | A search result is a click that opens a file. A hit produced from the local copy carries no `remote` field, so `src/renderer/editor/store.ts` composes a plain path tab id and opens this Mac's file while the band says another machine. The label does not survive the click |

Rulings 1 and 2 say build something small. Rulings 4, 5 and 6 say do not build something. Ruling 6 is
a refusal of an option that only became available in this round, and refusing it is the point.

**B and C are one design, and my half of the evidence says so.** Model B is not a proposal. It is
what the product already does and has never written down. `sessions-slice.ts` sends
`projectPath: project.path` on every create, including a remote one, and `projectSessions()` filters
on `x.projectPath === project.path`. A remote session therefore already sits in the local project's
tab, joined by this Mac's path string, while its `cwd` holds the far machine's path. The mapping
exists per session today. What model B adds is a name for it and a home on the project row. Model C
is the only thing left to decide, and it is what this document decides.

---

## 2. What is true in this tree today, counted

### 2.1 The local source control view

| Thing | Count | Where I counted it |
| --- | --- | --- |
| `git:*` channels in the shared contract | 28, of which 1 is the event `git:changed`, so 27 are invoke channels | `src/shared/ipc/base.ts` and `src/shared/ipc/git.ts` |
| Of the 27, channels that change a repository | 16 | stage, unstage, discard, commit, init, checkout, createBranch, createTag, cherryPick, checkoutDetached, fetch, checkoutTracking, deleteBranch, push, pull, sync |
| Of the 27, channels that only read | 11 | status, log, showHead, checkIgnore, branches, commitDetail, remoteUrl, remoteBranches, commitFileDiff, remotes, graphLog |
| Preload bridge methods that call `invoke('git:…')` | 27 | `src/preload/git.ts` |
| Renderer files that reach the git bridge at all | 7 | `tree/git-status.ts`, `tree/ignored.ts`, `state/repo-changed.ts`, `state/git.ts`, `scm/depth.ts`, `scm/BranchHeader.tsx`, `editor/tab-io.ts` |
| Renderer files in `src/renderer/scm` that bind a git store action | 5 | `ScmSection.tsx`, `BranchHeader.tsx`, `HistorySection.tsx`, `BranchesView.tsx`, `RunsSection.tsx` |
| `setMenu(` call sites inside `src/renderer/scm` | 13 | Non-test files |
| Menu labels written inside `src/renderer/scm` | 36 | Non-test files |
| Occurrences of "remote" in `src/renderer/scm`, non-test | 285, and every one means a git remote | Whole directory |
| Occurrences of "machine" in `src/renderer/scm`, non-test | 3, and every one means a git clone rather than a Tortie machine | `HistorySection.tsx` says "only on this machine", `scm.css` says "a remote-tracking ref is a snapshot of another machine", `graph/geometry.ts` repeats the first |
| Occurrences of "session" in `src/renderer/scm`, non-test | 12, and 0 of them are code | All 12 are comments or user copy |
| Occurrences of "session" in `src/renderer/search`, non-test | 0 | Whole directory |
| Reads of a focused session id in either directory | 0 | Grep for `activeSessionId`, `focusedSession`, `selectedSessionId` across both |

Where the view's repository comes from, checked this session. `ScmSection` and `BranchHeader` both
read `activeProjectId` from the app store, find the project, and set `const repoPath = project?.path
?? null`. `Project` in `src/shared/types.ts` has three fields, being an id, an absolute path and a
name. There is no machine on that type.

What the header band draws when the folder IS a repository. A `git-branch` codicon, the branch name,
a chevron, and one network control. It does not draw the folder name, it does not draw the path, and
it draws nothing that could name a machine. The folder name appears only in the two states where
there is no repository to describe.

### 2.2 The keys that a shared path string would collide in

Under model B the two copies can hold the same path string. Research 54 finding 14 records that this
is what happens when the create sheet's Directory field is left empty, and the operator's user name
is `gdc` on both machines. Every one of these is keyed on a bare path today.

| # | Key | Where |
| --- | --- | --- |
| 1 | `repos` in the git store | `src/renderer/state/git.ts`, `repoState` reads `repos[repoPath]` |
| 2 | `messages`, the draft commit text | Same file, `setMessage` writes `messages[repoPath]` |
| 3 | `committing` and `pending` | Same file |
| 4 | `repos` in the git depth store | `src/renderer/scm/depth.ts`, read through `depthRepoState` |
| 5 | The `GitService` instance cache in main | `src/main/git/ipc.ts`, `services.get(key)` where `key` is `normalizeRepoPath(repoPath)` |
| 6 | The debounce timer map | `src/renderer/state/repo-changed.ts`, `timers` in `createRepoChangeBus` |
| 7 | The Changes section collapse flag | `ScmSection`, `usePersistedBool('gmux.scm.changesCollapsed.' + repoPath)` |
| 8 | The search root | `src/renderer/search/store.ts`, a single `repoPath` string |
| 9 | The project row itself | `src/main/manifest/schema.ts`, the `projects` table declares `path TEXT NOT NULL UNIQUE` |

Key 9 is worth its own sentence because it decides more than a cache. `ProjectsRepository.upsertProject`
in `src/main/manifest/projects-repository.ts` runs `INSERT INTO projects … ON CONFLICT(path) DO
UPDATE SET name = excluded.name`, and its own comment says "Path conflicts keep the ORIGINAL row id".
So under model A, adding `/Users/gdc/gmux` on mac-pro when `/Users/gdc/gmux` is already a local
project does not create a second tab. It silently returns the local row and renames it. Model A is
not merely more manual than model B. On the operator's own two machines it does not work.

The editor already solved this class of problem and its solution is the pattern to copy.
`tabIdFor` in `src/renderer/editor/tab-identity.ts` returns `req.path` with no machine on it, but the
open path in `src/renderer/editor/store.ts` never calls it for a remote request. It composes
`machine:${req.remote.machineId}:${req.relPath}` instead. One expression, and the two copies of one
file are two tabs. The same expression is what keys 1 to 8 need, or they need to not exist for
remote data at all, which is ruling 1 below.

### 2.3 What crosses to a machine today

| Thing | Count or value | Where |
| --- | --- | --- |
| Frozen shell scripts in the catalogue | 7, being machine-facts, store-list, store-head, store-copy, image-put, review-list, review-file | `REMOTE_SCRIPTS` in `src/main/machines/remote-scripts.ts` |
| Of those, scripts that write | 1, being `image-put` | Same file, rule 6 of its header |
| git subcommands any script may name | 3, being rev-parse, status and show | `ALLOWED_GIT_VERBS` in `build/conformance-machines.mjs`, inside condition 38 |
| `machines:*` channels | 19, of which 2 are the review reads | `src/shared/ipc/machines.ts` |
| Longest command the door will send | 131,072 bytes | `REMOTE_SCRIPT_MAX_BYTES` |
| Deadline on a review read | 20,000 ms | `REMOTE_REVIEW_TIMEOUT_MS` |
| Files a review lists | 30 | `REMOTE_REVIEW_MAX_FILES` |
| Bytes per side of a remote diff | 2,097,152 | `REMOTE_REVIEW_MAX_BYTES` |
| Shared connection lifetime after the last command | 60 seconds | `SSH_CONTROL_PERSIST_SECONDS` in `src/main/machines/ssh.ts` |
| How often a machine with a focused session is already contacted | every 5,000 ms | `REMOTE_POLL_FOCUSED_MS` in `src/main/machines/remote-sessions.ts` |
| The same when no session there is focused | every 30,000 ms | `REMOTE_POLL_IDLE_MS` |

The one script that matters to this document is `REVIEW_LIST`. Its text, read this session, runs
`git rev-parse --show-toplevel` and then `git --no-pager status --porcelain=v2 --branch -z
--untracked-files=all`, and base64 encodes both answers.

**What the far machine already sends and Tortie already throws away.** `parseRemoteReviewListing`
hands the second word to `parsePorcelainV2Status` from `src/main/git/parse.ts`, which fills a
`ParsedStatus` carrying `branch`, `upstream`, `ahead`, `behind`, `hasConflicts`, `truncated` and four
grouped file lists. The function then reads `parsed.files` only, and drops every entry whose
`indexState` is `?` or `!`. `MachineReviewList` in `src/shared/ipc/machines.ts` has 6 fields and none
of them is a branch.

| What the far machine sends today | What reaches the window today |
| --- | --- |
| The branch name | discarded |
| The upstream ref | discarded |
| The ahead count | discarded |
| The behind count | discarded |
| Whether the merge is conflicted | discarded |
| Untracked files, asked for by name with `--untracked-files=all` | discarded |
| Staged against unstaged, as separate groups | flattened to one letter per file by `letterOf` |
| The changed file list | kept, capped at 30 |

### 2.4 The only two ways to see a far machine's file content today

| Way | Cap | Where |
| --- | --- | --- |
| The session's context menu item "Review changes on \<label\>" | 30 files, and only files that changed against HEAD | `openRemoteReview` in `src/renderer/app/session-actions.tsx` |
| Typing into the session pane, which is a terminal on that machine | none | The attach host |

There is no third way. The Explorer does not cross in this tree, search does not cross, and Quick
Open does not cross. So an unchanged file on the far machine cannot be opened in Tortie at all today.
That number, being 0, is what ruling 5 has to be weighed against.

### 2.5 Project wide search

| Thing | Count or value | Where |
| --- | --- | --- |
| `search:*` channels | 3, being start, cancel and context, and all 3 read | `src/shared/ipc/search.ts` |
| Consumers of the one ripgrep path | 4 | `ContentSearchEngine`, quick open's ipc, the symbol indexer's `files.ts`, the update self check |
| Flags on every content search | 11 | `buildContentSearchArgs` in `src/main/search/args.ts`, counted this session |
| Flags when whole word, literal, multiline and replace are all in play | 16 | Same function |
| Flags on every `rg --files` listing | 8 | `buildListFilesArgs` in `src/main/search/files-args.ts` |
| Delivery | a stream, on `searchResultsChannel(searchId)` | `src/shared/ipc/search.ts`. There is no invoke that returns a whole result set |
| Flush cadence | every 16 ms or every 200 matches | `FLUSH_MS` and `FLUSH_MATCHES` in `src/main/search/engine.ts` |
| Time to first result | asserted under 60 ms at the median | `src/main/search/__tests__/ttfr.integration.test.ts`. I did not run it, see section 9 |
| Result caps | 20,000 matches, 1,000 per file, 2,000 characters per line, 10,485,760 bytes per file | `SEARCH_LIMITS` |
| Occurrences of "machine" in `src/renderer/search` | 0 | Whole directory including tests |

The engine, weighed this session rather than quoted. The binary at
`/Users/gdc/gmux/node_modules/@vscode/ripgrep-darwin-arm64/bin/rg` is **4,528,512 bytes** and prints
**ripgrep 15.0.0 (rev 3a612f88b8), features:+pcre2**. That closes item 8 of research 55's own
unmeasured list, and the number the header of `src/main/search/resolve.ts` records is correct.

The measurement that decides ruling 6, and it was taken on this Mac. `command -v rg` here answers
`/opt/homebrew/bin/rg`, and that binary prints **ripgrep 15.1.0**. Tortie runs 15.0.0. So the two
ripgreps on the operator's primary machine are already a minor version apart. The rule "use whatever
rg the machine has" does not need a second computer to start producing two different answers.

The same is true of git. This Mac prints `git version 2.50.1 (Apple Git-155)`, measured here.
mac-pro printed `git version 2.39.5 (Apple Git-154)`, recorded in
`docs/research/assets/55-measurements.txt` on 2026-08-18. Eleven minor releases apart, on two
machines the same person owns.

### 2.6 The numbers a re-target would cost

All from `docs/research/assets/55-measurements.txt`, taken against gregs-mac-pro over the operator's
tailnet on 2026-08-18. I did not repeat them and I started no ssh this session.

| What | Median | Ninetieth percentile |
| --- | --- | --- |
| `review-list` against `/Users/gdc/dev`, answer 106 bytes | 57.2 ms | 140.3 ms |
| `review-list` against `/Users/gdc/.oh-my-zsh`, answer 226 bytes | 59.5 ms | 110.8 ms |
| A warm multiplexed call that runs `true` | 35.9 ms | 123.8 ms |
| A cold connection that runs `true` | 210.6 ms | 300.0 ms |
| `review-file` on a 56,438 byte answer | 54.5 ms | 59.8 ms |
| ICMP round trip, 60 packets | 7.98 ms | 89.77 ms |

Two local numbers for the same shape, measured here so the far side has something to sit against.
`git --no-pager status --porcelain=v2 --branch -z --untracked-files=all` on the 1,471 file `wt-r56`
checkout takes 26 ms at the median over 10 runs, and 68 ms at the slowest. The same command against
the operator's `/Users/gdc/gmux`, run with `--no-optional-locks` so nothing was written, takes 20 ms
at the median over 7 runs and 27 ms at the slowest, and produced 121 bytes of output.

So one re-target is one round trip. It costs about 57 ms when the connection is warm, about 140 ms at
the ninetieth percentile, and about 211 ms when it has been more than 60 seconds since the last
command to that machine.

---

## 3. Ruling 1. The source control view is present, read only, and it is one section

### 3.1 Not absent

Absent is the cheapest answer and it is wrong here, for a reason that is arithmetic rather than
taste. The whole Changes list, the branch name, the upstream, the ahead count, the behind count and
the untracked group are ALREADY in the bytes the far machine sends back to a `review-list` that
already ships. Making the section absent means paying for the answer and then not drawing it.

| What the section needs | New scripts | New git verbs | New round trips | New bytes on the wire |
| --- | --- | --- | --- | --- |
| The changed file list | 0 | 0 | 0 | 0 |
| The untracked group | 0 | 0 | 0 | 0 |
| Staged against unstaged as two groups | 0 | 0 | 0 | 0 |
| The branch name | 0 | 0 | 0 | 0 |
| The upstream and the ahead and behind counts | 0 | 0 | 0 | 0 |
| A diff of one changed file | 0 | 0 | 1 per file opened | the file, capped at 2,097,152 bytes per side |

The code change is four fields added to `MachineReviewList` in `src/shared/ipc/machines.ts`, and
`parseRemoteReviewListing` keeping what it already computes instead of dropping it.

### 3.2 Not writable, and the reasons were re-checked rather than inherited

| # | Reason | The fact |
| --- | --- | --- |
| 1 | The catalogue's founding rule is that a script is safe to run twice | `runRemoteScript` in `src/main/machines/remote-run.ts` throws when the connection generation moved while a command was in flight, which is exactly the case where Tortie does not know whether the far side ran it. `git commit` run twice is two commits |
| 2 | The deadline is wrong by a factor of 20 | The door allows 15,000 ms, from `REMOTE_RUN_TIMEOUT_MS`. `src/main/git/service.ts` allows 300,000 ms for a commit because the person's own hooks and signing run inside it |
| 3 | Nothing carries credentials to the far side | `ForwardAgent` and `SSH_AUTH_SOCK` appear 0 times under `src/`. A far side push would use whatever that machine happens to have. The local path sets `GIT_TERMINAL_PROMPT=0` in `src/main/git/exec.ts` so it errors instead of hanging, and no such promise exists for a program the far machine's shell starts |
| 4 | The gate forbids the verbs by name | `ALLOWED_GIT_VERBS` permits rev-parse, status and show. Twelve of the 23 git subcommands the local service runs are writes |

### 3.3 What the section contains, and what it does not

| Part | Local focus | Remote focus | Why |
| --- | --- | --- | --- |
| The Changes list, all four groups | live, repainted by FSEvents at 14 to 78 ms | present, a snapshot with its age shown | The answer already carries all four groups |
| The row verbs, being stage, unstage and discard | present | **absent, not disabled** | A disabled verb is a verb a fourth surface can forget to disable. Discard alone is reachable from 3 places inside `ScmSection`, named in the comment on `confirmDiscardRows` |
| The commit box | present | absent | Ruling 1 |
| A diff of one changed file | Pierre diff, both sides local | present, read only, both sides from the machine | `reviewFileOn` already answers it, and `src/renderer/editor/store.ts` already refuses to mark such a tab dirty |
| History and the commit graph | present | absent | Needs `log` and `rev-list`, which are not among the three allowed verbs, and the person could not act on the answer |
| Branches | present | absent | Needs `for-each-ref`, `symbolic-ref`, `show-ref` and `merge-base`, and every verb the list then offers is a write |
| Sync, Publish, Fetch | present | absent | Reason 3 above |
| Runs | present | absent | It is a network read about a git remote, not about a machine, and putting it under a machine badge would be the copy collision of section 2.1 |

The two honest limits, printed rather than assumed. The list stops at 30 files and says so through
`reviewMoreFiles` in `src/main/machines/remote-copy.ts`. The list is a snapshot, because there is no
watcher on the far machine and nothing in this design can make one.

### 3.4 When it refreshes, and what is on screen while it does

| Trigger | Refresh | Why |
| --- | --- | --- |
| Focus moves to a session on a different machine | yes, immediately | This is the re-target |
| The person clicks the refresh control | yes | The control already exists as `branch-refresh` in `BranchHeader` |
| The 5,000 ms remote session poll ticks | **no** | One exec every 5 seconds per machine, forever, buys a list the person cannot tell from a live one. A snapshot with a visible age is honest and a nearly live list is not |
| The local FSEvents watcher fires | **no** | `RepoWatcher` in `src/main/watcher/repo-watcher.ts` watches a folder on this Mac. Letting it repaint a section labelled with another machine is the masquerade this round exists to remove |

**What is on screen during the 57 ms to 211 ms.** There is an obvious reuse here and it is wrong, so
it is worth writing down. `src/renderer/search/store.ts` keeps a `replaceOnNextFrame` flag whose
comment says that blanking the list makes a 40 ms query look like a flash of nothing, so the old rows
stay until the new ones exist. That rule is right within one machine and it inverts across machines.

- On a refresh of the SAME machine, keep the rows and swap them when the answer lands.
- On a change of machine, clear the list in the same frame the badge changes, and draw one quiet
  reading line. Machine A's files under machine B's name for 211 ms is precisely the defect.

### 3.5 What "the focused session" must mean, and one correction to model C

Model C says the workspace surfaces follow the focused session. There is already a selector for that,
being `activeSession()` in `src/renderer/state/sessions-slice.ts`, and it returns a `Session` carrying
`machine` and `cwd`. So the hook exists and it is one line.

It has a fallback that model C must not inherit. Read this session, `activeSession()` returns
`sessions.find((x) => x.id === selected) ?? sessions[sessions.length - 1] ?? null`. When the person
has selected nothing in that tab, it hands back the last row in the project's session list. If that
row happens to be a session on another machine, a tab the person just opened would show another
machine's source control view without anyone having asked for it.

The correction, and it is small. **The source control view follows the session the person actually
selected. When nothing is selected it targets this Mac.** The last row in a list is not a focus
anybody expressed, and a surface with 16 write channels behind it is the wrong place to guess.

### 3.6 Where the remote status lives, and it is not the git store

The remote Changes group must NOT be written into `useGit.repos`. Section 2.2 lists 8 keys that are
bare path strings, and a shared path string makes each of them a place where the local answer and the
remote answer become one entry. Putting remote data in its own slice keyed by machine id and repo
path removes all 8 at once, and it is what the editor already does for a remote review tab.

The rule, stated so it is checkable: **no value returned by `machines:reviewFiles` or
`machines:reviewFile` is ever stored under a key that a local path alone can produce.**

---

## 4. Ruling 2. How a person tells at a glance, and the word that may not be used

### 4.1 Three signals, and only one of them is new

| Signal | What it is | What it costs |
| --- | --- | --- |
| The verbs are gone | No stage buttons, no commit box, no History section, no Branches section, no Sync control. The panel's SHAPE is different, and shape is what a glance reads | Nothing. It is ruling 1 |
| `MachineBadge` in the header band | The machine's label in the machine's own colour, from a palette of 6 in `MACHINE_COLORS` in `src/shared/machines.ts`. Nothing is drawn when the focus is this Mac | One import. The component exists and is drawn at 6 sites in 4 files, and every one of those sites is a session surface. No workspace surface renders it |
| The branch name is the far machine's own | The band already draws a branch name. On a remote focus it draws the branch that machine reported | Four fields on `MachineReviewList`, see section 3.1 |

The badge's shipped rule is that this Mac draws nothing at all, and its header states the reason. I
keep that rule here rather than adding a "This Mac" chip, because the person already reads that rule
in the session dock, the identity strip, the rail and the tab. A fourth surface that spells the rule
differently makes the rule harder to learn, not easier.

The badge alone would not be enough on this surface, and that is why there are three signals. The
session dock has no verbs, so a badge there only has to answer "where". The source control view has
16 write channels behind it, so it has to answer "where" and "can I act" in the same glance. Verb
absence answers the second question without being read.

### 4.2 The one word the copy may not use

Every sentence this section adds names the machine's label. None of them uses the word "remote".

`src/renderer/scm` holds 285 non-test occurrences of "remote" and all of them mean a git remote. It
also holds 3 occurrences of "machine" and all of them mean a git clone, in sentences the product
already ships, e.g. "Not pushed yet, only on this machine" in `HistorySection.tsx`. Adding a Tortie
machine to that view means "this machine" has two meanings inside one panel. Naming the label avoids
it, and the labels are the person's own words.

Every new string belongs in `src/renderer/app/machine-copy.ts`, beside `reviewListTitle`,
`reviewItemLabel` and `createDirLabel`. That file's own rule, quoted in `session-actions.tsx`, is
that the vocabulary audit reads one file.

The snapshot age uses the voice `src/renderer/scm/freshness.ts` already established for a claim
measured at a past moment. Its header states the standard, being quiet and factual, never a warning,
never scolding.

---

## 5. Ruling 3. The mechanism that stops a local write looking like a remote one

### 5.1 Why a renderer guard is not enough, proved in this tree

Research 54 finding 2 records restart being guarded in `TerminalRegion.tsx` and in
`session-actions.tsx` and not in `SplitSurface.tsx`. My own count says the same thing about this
surface from a different direction. `src/renderer/scm` contains the word "session" 12 times and
**zero** of them are code. `src/renderer/search` contains it zero times. Neither view can currently
observe focus at all, so a rule keyed on focus would be new code in 5 renderer files, reachable
through 13 menu call sites and 36 menu labels, and it would have to stay correct in all of them
forever.

### 5.2 The mechanism

> **The git contract stops being able to express a remote repository.** The repository argument on
> the 27 `git:*` channels becomes a reference that names this Mac by construction, and main refuses
> anything else at run time as well.

Two properties make it worth the contract churn.

1. It fails closed at compile time. A caller holding a `SessionMachine['id']` cannot spell a value
   the channel accepts. Under a boolean or an added check, a caller that forgets gets a local write.
2. It has one enforcement point that already exists. `normalizeRepoPath` in `src/main/git/ipc.ts` is
   the choke point every one of the 27 channels passes through, by three routes I checked this
   session, being the 9 handlers in `registerGitIpc`, the 18 handlers in `registerGitDepthIpc` reached
   through the injected `getService`, and `git:init` which calls it directly.

The size of the change is bounded by section 2.1. Seven renderer files touch the git bridge and two
of them are stores that hold nearly all of it.

### 5.3 Why the existing check does not already do this

`normalizeRepoPath` today resolves the path and asserts it is a directory. On the operator's two
machines both copies are at `/Users/gdc/…` under the same user name, so the local copy IS a
directory and the check passes. The check is not weak. It is answering a different question.

---

## 6. Ruling 4. Search is refused on a remote focus

### 6.1 The three options, and what each one loses

| Option | Verdict | What is lost |
| --- | --- | --- |
| **Follow the machine** and run ripgrep over there | **Rejected** | The feature does not work on the only far machine that exists, because rg is not on mac-pro. Where rg does exist it is a different build. Measured here, this Mac's PATH rg is 15.1.0 while Tortie runs 15.0.0. The engine also has the wrong shape, see 6.2 |
| **Stay local and label it** | **Rejected** | Nothing visible is lost, which is exactly the problem. The person gets 20,000 results at 60 ms about a copy that is on a different branch with different uncommitted changes, and clicking one opens this Mac's file with no machine on the tab id |
| **Refuse it, with a labelled empty state** | **Chosen** | Content search, Quick Open and the symbol palette, being 3 surfaces, are unavailable while a remote session is focused. The person searches by typing in the session pane, which is a terminal on the right computer and is not Tortie's search |

### 6.2 Why following the machine fails on shape as well as on availability

Even with a correct ripgrep installed over there, the answer would arrive in the wrong shape.

| Property | Local search | What the door can do |
| --- | --- | --- |
| Delivery | a stream on `searchResultsChannel(searchId)`, flushed every 16 ms or every 200 matches | one answer after the far process exits, because `execRemoteShell` buffers and the markers are parsed at the end |
| Time to first result | asserted under 60 ms at the median | nothing until everything, up to the 15,000 ms deadline |
| Floor per call | not applicable | 35.9 ms warm and 210.6 ms cold, measured on mac-pro |
| Cancel | `search:cancel` sends SIGKILL to the child | no counterpart, and whether closing the ssh channel kills the far command is unmeasured |
| Caps | 20,000 matches with a `capped` flag the view explains | the answer must also fit one buffer, and a clipped answer arrives as a truncated blob rather than as a flag |

The renderer has no non-streaming path to fall back to. `SearchSection` subscribes before it starts
and reads frames.

Two options that look like ways around this and are not.

- **Ship the engine.** 4,528,512 bytes becomes about 6,038,016 base64 bytes against a 131,072 byte
  command limit, which is 47 sends. The catalogue holds exactly 1 write script and condition 35 of
  `build/conformance-machines.mjs` holds it at 1. An append mode script is not safe to run twice,
  which is the property the door's retry depends on.
- **Use `git grep`.** `grep` is not among the three verbs `ALLOWED_GIT_VERBS` permits, so it fails
  condition 38. It would also miss every untracked file, which is precisely the set an agent has just
  created.

### 6.3 Why serving the local copy under a label is the wrong answer, and this is the new ruling

Under model A there was no local counterpart to serve, so this option did not exist. Under model B
there is one, and it is tempting because it costs nothing and it usually looks right. Three measured
reasons say no.

1. **The label does not survive the click.** A search hit is an open request. `src/renderer/editor/store.ts`
   composes a machine prefixed tab id only when `req.remote` is present. A hit produced by the local
   engine has no such field, so the tab is a plain local tab with no machine anywhere on it, and it is
   editable and saveable. The band said one machine and the file is from the other.
2. **The staleness signal points at the wrong computer.** `SearchSection` subscribes to `git.onChanged`
   and flips a "results may be stale" chip. That event comes from `RepoWatcher`, which is FSEvents on a
   folder on this Mac. So a local edit would mark the labelled results stale, and the far agent
   rewriting 40 files would never mark them stale at all. The one freshness signal the view has would
   be an active lie.
3. **The premise of this round is that the copies differ.** The two machines are on different branches
   with different uncommitted changes. A line number from the local copy is a wrong line number in the
   file the person believes they are reading.

### 6.4 What refusal costs, stated in full

Refusing content search refuses Quick Open and the symbol palette with it, because all three list
files through `rgBinaryPath` in `src/main/search/resolve.ts`. Combined with section 2.4, the honest
statement is this. **With search refused and the Explorer not yet crossing, there is no way in Tortie
to open a file on the far machine that has not changed.** The count of ways is 1, being the review
list, and it is capped at 30 changed files.

That is a real cost and it lands on the Explorer rather than on search. The conclusion I draw is that
the Explorer crossing, which research 55 already priced and Phase 90 already carries, is what makes
this refusal liveable. If the Explorer does not cross, refusing search leaves a remote focus with
almost nothing to look at.

### 6.5 What the person sees

The search view, Quick Open and the symbol palette each show the same sentence in the same words,
naming the machine, and each says what does work. The sentence lives in `machine-copy.ts`. Today the
empty state names the local project, which is a wrong answer rather than a missing one.

---

## 7. Which of these is cheapest to reverse

| Ruling | Cheap to reverse? | Why |
| --- | --- | --- |
| Search refused | **Yes, and it is the cheapest thing here.** | It is one empty state and no stored data. Nothing depends on the absence |
| History and Branches absent on a remote focus | Yes | Read only sections are cheap to add and impossible to remove once someone depends on them, so absent is the reversible direction |
| The Changes section present and read only | Yes for the drawing, no for the four fields on `MachineReviewList` | Once a field is on the wire it is hard to take back. It is 4 fields |
| The word "remote" not used for a machine | **No.** | Copy that ships teaches a meaning. Undoing it means the same word meant two things for a release |
| The git contract naming only this Mac | **No, and this is the one to get right now.** | It touches 27 channels and 7 renderer files. Doing it before the model change costs 7 files. Doing it after costs the same 7 files plus every surface built on the wrong shape in between |

---

## 8. What would reopen each ruling

| Ruling | What would reopen it |
| --- | --- |
| No git write crosses | Nothing about latency. It needs a carriage that can tell "the command ran" from "the answer was lost", which is a receipt on the far machine, which is a resident process there, which is the Tortie Host decision research 51 section 5 rejected |
| History and Branches absent | A measured tailnet number under about 50 ms for one round trip, plus a person asking twice. The current number is 57.2 ms at the median and 140.3 ms at the ninetieth percentile |
| Search refused | A streaming carriage AND a way to state the far engine's identity beside the results. Both are absent, and the first is the same resident process question |
| Local-copy search under a label | It would take a tab identity that carries a machine for every open path rather than only for review opens, plus a freshness signal that comes from the far machine. Both are real designs and neither exists |
| The remote status kept out of the git store | It would take every one of the 8 keys in section 2.2 becoming a machine and path pair, at which point the separate slice stops paying for itself |

---

## 9. What I did not measure

Counted honestly, because the unmeasured parts being named is most of what this document is worth.

1. **No round trip against any second machine.** I started no ssh, contacted no machine, and ran no
   probe. Every far side number here is quoted from `docs/research/assets/55-measurements.txt`, taken
   on 2026-08-18. What would measure it. Re-run `docs/research/assets/55-probe-real-machine.mjs` with
   a loop that times 20 `review-list` runs against a real repository over there.
2. **`git status` on a working tree with many changed files, on either machine.** Both of my status
   measurements were on nearly clean trees, producing 79 and 121 bytes. What would measure it. Time
   the same command against a tree with 200 changed files. My arithmetic says a porcelain v2 record
   is roughly 60 bytes plus the path, so 200 files is about 20,000 bytes and about 27,000 base64
   bytes, which is far inside every cap. That is arithmetic and not a measurement.
3. **Whether any machine other than mac-pro has ripgrep.** One read script running `command -v rg`
   would answer it, and that script does not exist. `MACHINE_FACTS` returns four values, being home,
   codex_home, xdg_data_home and uname, and none of them is a program list. Ruling 5 does not depend
   on the answer, because 6.2 and 6.3 stand even where rg is present.
4. **Whether closing the local ssh client kills the far command.** It decides whether a remote search
   could ever be cancelled. Unmeasured.
5. **The conformance gate did not run.** `node build/conformance-machines.mjs` fails in this worktree
   with "Cannot find module 'electron'", because the worktree has no `node_modules`. Every claim about
   the catalogue comes from reading `remote-scripts.ts`, `exec-plane.ts` and
   `build/conformance-machines.mjs`, not from the gate's output.
6. **The search time to first result was not run.** 60 ms is the assertion in
   `src/main/search/__tests__/ttfr.integration.test.ts`, read this session, not a number I produced.
7. **I drove no application.** No Electron process was started, no tmux command was run, and the
   operator's tmux server was not contacted at all, not even for a list.
8. **Nothing was written to the operator's tree.** The one command I ran against `/Users/gdc/gmux`
   was `git --no-optional-locks status`, chosen so the index could not be rewritten.
9. **I did not price the contract change in ruling 3 by counting its call sites one by one.** I
   counted the 7 renderer files that touch the git bridge and the 27 preload methods. The number of
   individual argument sites is unmeasured.

---

## 10. Paths and symbols this document relies on

| Area | File | Symbols |
| --- | --- | --- |
| The git contract | `src/shared/ipc/base.ts`, `src/shared/ipc/git.ts` | the 27 `git:*` channels and `EVT_GIT_CHANGED` |
| The git bridge | `src/preload/git.ts` | `git` |
| The one choke point | `src/main/git/ipc.ts` | `normalizeRepoPath`, `getGitService`, `registerGitIpc`, the `services` map |
| The other 18 handlers | `src/main/git/depth-ipc.ts` | `registerGitDepthIpc`, `GitDepthDeps.getService` |
| What the verbs run | `src/main/git/service.ts`, `src/main/git/exec.ts` | `GitService.discard`, `GitService.commit`, the commit deadline, `GIT_TERMINAL_PROMPT` |
| The status parser both sides use | `src/main/git/parse.ts` | `parsePorcelainV2Status`, `ParsedStatus.branch`, `ParsedStatus.upstream`, `ParsedStatus.ahead`, `ParsedStatus.behind`, `parseHeader` |
| The view's root | `src/renderer/scm/ScmSection.tsx`, `src/renderer/scm/BranchHeader.tsx` | `ScmSection`, `BranchHeader`, `confirmDiscardRows` |
| The discard confirm | `src/renderer/scm/selection.ts` | `discardCopy` |
| The freshness voice | `src/renderer/scm/freshness.ts` | `fetchAgeShort`, `fetchAgeCaption`, `fetchIsStale`, `FETCH_STALE_MS` |
| The git store and its keys | `src/renderer/state/git.ts` | `repoState`, `repos`, `messages`, `setMessage`, `committing`, `pending` |
| The depth store | `src/renderer/scm/depth.ts` | `depthRepoState` |
| The change bus | `src/renderer/state/repo-changed.ts` | `createRepoChangeBus`, `REPO_CHANGED_DEBOUNCE_MS` |
| The local watcher | `src/main/watcher/repo-watcher.ts` | `RepoWatcher` |
| The search contract | `src/shared/ipc/search.ts` | `SEARCH_LIMITS`, `searchResultsChannel` |
| The engine and its argv | `src/main/search/engine.ts`, `src/main/search/args.ts`, `src/main/search/files-args.ts`, `src/main/search/resolve.ts` | `ContentSearchEngine`, `FLUSH_MS`, `FLUSH_MATCHES`, `buildContentSearchArgs`, `buildListFilesArgs`, `rgBinaryPath` |
| The search root and its reset | `src/renderer/search/SearchView.tsx`, `src/renderer/search/store.ts` | `SearchSection`, `syncProject`, `noteRepoChanged`, `replaceOnNextFrame` |
| The exec plane | `src/main/machines/exec-plane.ts` | `REMOTE_VERB_LEDGER`, `VERBS_THIS_RUNG_REFUSES`, `execRemoteShell`, `MAX_BUFFER_BYTES` |
| The script catalogue | `src/main/machines/remote-scripts.ts` | `REMOTE_SCRIPTS`, `REMOTE_SCRIPT_MAX_BYTES`, `REVIEW_LIST`, `REVIEW_FILE`, `MACHINE_FACTS`, `remoteWriteScripts` |
| The door | `src/main/machines/remote-run.ts` | `runRemoteRead`, `runRemoteScript`, `REMOTE_RUN_TIMEOUT_MS` |
| The remote review | `src/main/machines/remote-review.ts`, `src/main/machines/remote-copy.ts` | `parseRemoteReviewListing`, `letterOf`, `reviewFilesOn`, `reviewFileOn`, `REMOTE_REVIEW_MAX_FILES`, `reviewMoreFiles` |
| The remote review's only surface today | `src/renderer/app/session-actions.tsx` | `openRemoteReview`, `openReviewTab`, `reviewChangesItem` |
| The review shapes | `src/shared/ipc/machines.ts` | `MachineReviewList`, `MachineReviewFile`, `MachineReviewFileInput`, `MachineReviewPair` |
| The connection | `src/main/machines/ssh.ts` | `sshOptions`, `SSH_CONTROL_PERSIST_SECONDS` |
| The poll cadence | `src/main/machines/remote-sessions.ts` | `REMOTE_POLL_FOCUSED_MS`, `REMOTE_POLL_IDLE_MS` |
| The gate | `build/conformance-machines.mjs` | `ALLOWED_GIT_VERBS`, condition 35, condition 38 |
| The badge and the vocabulary | `src/renderer/app/MachineBadge.tsx`, `src/renderer/app/machine-copy.ts`, `src/shared/machines.ts` | `MachineBadge`, `reviewListTitle`, `reviewItemLabel`, `createDirLabel`, `MACHINE_COLORS` |
| The editor's machine aware identity | `src/renderer/editor/store.ts`, `src/renderer/editor/tab-identity.ts`, `src/renderer/editor/tab-io.ts` | the `machine:` tab id expression, `tabIdFor`, `loadRemoteDiff`, the save refusal at `tab.remote !== undefined` |
| The project record | `src/shared/types.ts`, `src/main/manifest/schema.ts`, `src/main/manifest/projects-repository.ts` | `Project`, `Session.projectPath`, `Session.cwd`, `SessionMachine`, the `projects` table's UNIQUE path, `ProjectsRepository.upsertProject` |
| Where a session joins a tab | `src/renderer/state/sessions-slice.ts` | `activeSession`, `projectSessions`, the `projectPath: project.path` on create |
| The create sheet's machine field | `src/renderer/app/CreateSessionModal.tsx` | the machine select and the directory field |
| The sidebar's views | `src/renderer/state/sidebar-views.ts` | `SIDEBAR_VIEW_IDS`, `SIDEBAR_VIEW_LABELS` |
| The far side measurements | `docs/research/assets/55-measurements.txt` | the `review-list`, warm, cold and rg lines |
