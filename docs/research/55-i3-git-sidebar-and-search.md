# Research 55, investigator 3. What the git sidebar and project wide search become

Read against the working tree at `wt-r55`, HEAD `7a665d7`, on 2026-08-18. Every claim below names a
file and a symbol I opened this session. Nothing is quoted from an older document without saying so.

---

## 1. The answer

| # | Question | Ruling | The one deciding fact |
| --- | --- | --- | --- |
| 1 | What the git sidebar becomes on a remote project | **Read only, and the read set is exactly the Changes group.** No git write ever crosses to a machine, in this release or a later one | The catalogue's founding rule is that every script is safe to run twice. `git commit` run twice makes two commits, and the door cannot tell a lost answer from a command that never ran |
| 2 | The refusal that removes finding 15 | **The local git service is reachable only for a project whose machine is this Mac, and one function decides.** `normalizeRepoPath` in `src/main/git/ipc.ts` is the single choke point all 27 git channels pass through | Today `git:discard` calls node's `rm` with `force` and `recursive` on untracked paths. The defect is not only a wrong commit. It is a recursive delete on the wrong computer's copy |
| 3 | What project wide search becomes | **Refused on a remote project.** ripgrep is not required on the far machine and is not shipped to it. Quick Open and the symbol palette are refused with it | The product's own sentence at `src/main/search/args.ts` is that "a search that disagrees with itself between machines is worse than a search that is missing a flag". Using the far machine's own rg is that disagreement |
| 4 | Is the "Files live on \<machine\>" label its own phase | **No.** It is one string, and on its own it discloses a destructive write instead of stopping it. It lands in the same commit as ruling 2, after the check | A label does not remove a write. `discardCopy` in `src/renderer/scm/selection.ts` names a base filename and nothing else, and both machines can hold that filename |

Two of these rulings say that something should not be built. That is the finding, not a gap in it.

---

## 2. What is true in this tree today, counted

### 2.1 The local git sidebar

| Thing | Count | Where I counted it |
| --- | --- | --- |
| `git:*` invoke channels in the shared contract | 27 | `src/shared/ipc/base.ts` and `src/shared/ipc/git.ts`, plus the event `git:changed` which is not a channel |
| Handlers registered | 27 | 9 in `registerGitIpc`, 18 in `registerGitDepthIpc` |
| Preload bridge methods on `gmux.git` | 27, plus `onChanged` | `src/preload/git.ts`, the object `git` |
| Channels that change a repository | 16 | stage, unstage, discard, commit, init, checkout, createBranch, createTag, cherryPick, checkoutDetached, fetch, checkoutTracking, deleteBranch, push, pull, sync |
| Channels that only read | 11 | status, log, showHead, checkIgnore, branches, commitDetail, remoteUrl, remoteBranches, commitFileDiff, remotes, graphLog |
| Distinct git subcommands the local service runs | 23 | Extracted from `src/main/git/service.ts` and `src/main/git/ipc.ts` |
| Of those, subcommands that only read | 11 | check-ignore, for-each-ref, log, merge-base, remote, rev-list, rev-parse, show, show-ref, status, symbolic-ref |
| Of those, subcommands that write | 12 | add, branch, checkout, cherry-pick, commit, fetch, init, pull, push, restore, rm, tag. `fetch` counts as a write because it moves refs inside `.git` |
| Renderer files under `src/renderer/scm` that carry a `repoPath` | 10 | Tests excluded |
| Occurrences of the word "machine" in `src/renderer/scm` | 6, and every one is unrelated prose | Two are a commit graph comment, three are test comments, one is the "only on this machine" label for an unpushed commit |

Where the sidebar's repository comes from, checked this session. `ScmSection` reads
`activeProjectId` from the app store, finds the project, and sets `const repoPath = project?.path ??
null`. `BranchHeader` does the same. `Project` in `src/shared/types.ts` has three fields, being an
id, an absolute path and a name. There is no machine in that type and no session in that decision.

How live the local Changes group is. `RepoWatcher` in `src/main/watcher/repo-watcher.ts` watches the
folder with FSEvents and calls back after a 300 ms debounce. `src/main/watcher/bus.ts` records the
measurement, being 14 to 78 ms from a file being created to the event.

What the write path costs in time. `src/main/git/exec.ts` sets a default deadline of 30,000 ms and
sets `GIT_TERMINAL_PROMPT` to `0`. `src/main/git/service.ts` raises it to 300,000 ms for commit and
cherry-pick and to 120,000 ms for fetch, push and pull. The commit path writes the message to a
temporary file and runs `commit -F`, so the person's own hooks and commit signing run.

### 2.2 Project wide search

| Thing | Count or value | Where |
| --- | --- | --- |
| `search:*` channels | 3, being start, cancel and context. All read | `src/shared/ipc/search.ts` |
| Consumers of the vendored binary | 4 | `ContentSearchEngine`, quick open's ipc, the symbol indexer's `files.ts`, and the update self check |
| How results reach the window | A per-search event stream, `searchResultsChannel(searchId)` | `src/shared/ipc/search.ts`. There is no invoke that returns a whole result set |
| Flush cadence | Every 16 ms or every 200 matches | `FLUSH_MS` and `FLUSH_MATCHES` in `src/main/search/engine.ts` |
| Measured time to first result | 2.8 to 5.0 ms, asserted under 60 ms | `src/main/search/__tests__/ttfr.integration.test.ts` |
| Result caps | 20,000 matches, 1,000 per file, 2,000 characters per line, 10,485,760 bytes per file | `SEARCH_LIMITS` in `src/shared/ipc/search.ts` |
| Cancel | `search:cancel` sends SIGKILL to the child | `src/shared/ipc/search.ts` and `ContentSearchEngine` |
| Occurrences of the word "machine" in `src/renderer/search` | 0 | Whole directory, tests included |
| Occurrences of "machine" or "remote" in `src/main/search` | 1, and it is a comment | `src/main/search/args.ts` |

Where the search root comes from. `SearchView` reads
`projects.find((p) => p.id === activeProjectId)?.path ?? null`, and the store seeds the same value
from `useApp.getState().activeProject()?.path`. Same shape as the sidebar, same blindness.

Which engine. `rgBinaryPath` in `src/main/search/resolve.ts` resolves the vendored
`@vscode/ripgrep`, pinned at `1.18.0` in `package.json`. The module's own header records the binary
as 4,528,512 bytes and describes it as "15.0.0, +pcre2". `electron-builder.yml` unpacks and signs one
platform copy, named in its signing rule as `@vscode/ripgrep-darwin-arm64`. The lockfile lists 12
optional platform packages, so a Linux binary exists on the registry and is not in this bundle.

### 2.3 What crosses to a machine today

| Thing | Count | Where |
| --- | --- | --- |
| tmux verbs allowed on the exec plane | 11 | `REMOTE_VERB_LEDGER` in `src/main/machines/exec-plane.ts` |
| tmux verbs refused by name forever | 4, being kill-server, attach-session, send-keys, respawn-pane | `VERBS_THIS_RUNG_REFUSES` |
| Frozen shell scripts | 7 | `REMOTE_SCRIPTS` in `src/main/machines/remote-scripts.ts` |
| Of those, scripts that write | 1, being `image-put` | `remoteWriteScripts()`, and rule 6 of that file's header |
| git subcommands any script may name | 3, being rev-parse, status and show | `ALLOWED_GIT_VERBS` in `build/conformance-machines.mjs`, and the two script texts `REVIEW_LIST` and `REVIEW_FILE` |
| Occurrences of any other git subcommand under `src/main/machines` | 0 | Counted this session across all non-test files |
| `machines:*` channels | 19, of which 2 are the review reads | `src/shared/ipc/machines.ts` |
| Longest command the door will send | 131,072 bytes | `REMOTE_SCRIPT_MAX_BYTES` |
| Answer buffer per exec | 67,108,864 bytes | `MAX_BUFFER_BYTES` in `src/main/machines/exec-plane.ts` |
| Deadline on one script | 15,000 ms | `REMOTE_RUN_TIMEOUT_MS` in `src/main/machines/remote-run.ts` |
| Deadline on a review read | 20,000 ms | `REMOTE_REVIEW_TIMEOUT_MS` |
| Files a review lists | 30, and the clip is stated on screen | `REMOTE_REVIEW_MAX_FILES`, and `reviewMoreFiles` in `src/main/machines/remote-copy.ts` |
| Bytes per side of a remote diff | 2,097,152 | `REMOTE_REVIEW_MAX_BYTES` |
| File copy programs anywhere in `src/` or `build/` | 0 for scp, 0 for rsync, 0 for sftp | Whole tree grep. Every hit for "scp" is the git address form |

One more fact that matters to both rulings. The far side's status is parsed by
`parsePorcelainV2Status` from `src/main/git/parse.ts`, imported directly by
`src/main/machines/remote-review.ts`. A remote Changes group needs no second parser.

---

## 3. Ruling 1. The git sidebar is read only on a remote project

### 3.1 Why full git over ssh is refused

| # | Reason | The number |
| --- | --- | --- |
| 1 | It breaks the rule the door is built on | Every script must leave the machine the same after two runs as after one, because a link can die after the far side ran the command and before the answer arrives. `runRemoteScript` step 8 throws when the connection generation moved while a command was in flight, which is exactly the case where Tortie does not know what happened. `git commit` twice is two commits. `git cherry-pick` twice is two commits |
| 2 | The deadline is wrong by a factor of 20 | The door allows 15,000 ms. The local commit path allows 300,000 ms because the person's hooks and signing run inside it. A commit cut off at 15 s leaves Tortie unable to say whether it landed |
| 3 | Nothing carries the credentials | `IdentityFile` and a bare `-i` appear 0 times under `src/main/machines`, and `ForwardAgent` and `SSH_AUTH_SOCK` appear 0 times in `src/`. A far side `git push` would use whatever that machine already has. The local path sets `GIT_TERMINAL_PROMPT=0` so it errors instead of hanging. No such promise exists for a program the far side's shell starts |
| 4 | The size of the work | 3 of the 23 git subcommands cross today. Read only needs 8 more. Full git needs 20 more, and 12 of those change a repository. Each one is a new constant script, a new row in the catalogue, and a new sentence explaining why it is safe to run twice |
| 5 | The scope guardrail in CLAUDE.md | The git sidebar is named there as the price of admission rather than the product. Twenty new verbs over a transport is the largest parity build in the tree |

Refusal 4 in CLAUDE.md does not forbid this, and I am not pretending it does. The refusal is mine and
it rests on rows 1 to 3. Rows 4 and 5 say it would also be expensive, which is the weaker argument.

### 3.2 What read only contains

| Section of the sidebar | On a local project | On a remote project | Why |
| --- | --- | --- | --- |
| Changes, the file list | Live, refreshed by the FSEvents watcher at 14 to 78 ms | Present, read only, refreshed when the person asks and when that session's status moves | The script already exists, and `parsePorcelainV2Status` already reads its answer |
| Changes, the row verbs, being stage, unstage and discard | Present | Absent, not disabled | A verb that is only greyed out is a verb a fourth surface can forget to grey out. Finding 2 of research 54 is that exact bug in the split leaf |
| The commit box | Present | Absent, with one sentence naming the machine | Ruling 1 |
| A diff of one changed file | Pierre diff, both sides local | Present, both sides from the machine, read only | `reviewFileOn` already answers it. Whether the editor tab says it is read only belongs to the investigator who owns the editor |
| History and the commit graph | Present | Absent, with one sentence | It needs `log` and `rev-list` as new verbs, and the person cannot act on the answer. `git log` inside the session pane already answers it, on the machine it belongs to |
| Branches | Present | Absent, with one sentence | It needs `for-each-ref`, `symbolic-ref`, `show-ref` and `merge-base`, and every verb the branch list offers is a write |
| Sync, being push, pull and fetch | Present | Absent, with one sentence | Ruling 1, and reason 3 above |

The honest limits to print on the remote Changes group, because both are already true in the code.
The list stops at 30 files and says so through `reviewMoreFiles`. The list is a snapshot rather than
a live view, because no watcher exists on the far machine and nothing in the thin design can create
one. A live remote Changes group needs a resident process over there, which is the Tortie Host
decision research 51 section 5 rejected. This is the one place where my two rulings touch that
question, and my answer is that a snapshot with a visible age is enough, so the question stays shut.

---

## 4. Ruling 2. The refusal that removes finding 15

### 4.1 The defect, stated exactly

A remote session hangs off a project whose folder is on this Mac, because `Project` has no machine.
The sidebar keys on `project.path` and nothing else. So with a session on another machine in front of
the person, all 16 write channels are live against this Mac's copy of a folder with the same name.

The worst of the 16 is not commit. `GitService.discard` deletes untracked paths with node's `rm`,
passing `force` and `recursive`, and restores tracked paths from the index. The confirm the person
sees comes from `discardCopy` in `src/renderer/scm/selection.ts`. It reads "Delete 'name'?" or
"Discard changes to 'name'?" and names no folder and no machine. When the far folder and the project
folder share a path string, which research 54 finding 14 says is what happens when the Directory
field is left empty, the two copies also share every filename in that confirm.

### 4.2 The refusal

> **A git write may only run against a folder on the machine the person is looking at. A repository
> path that belongs to a project on another machine never reaches the local git service, and exactly
> one function decides.**

It is mechanical rather than promised, and here is the mechanism in this tree.

1. Every one of the 27 channels reaches a repository through `getGitService`, which calls
   `normalizeRepoPath`. The 9 handlers in `registerGitIpc` call it directly. The 18 handlers in
   `registerGitDepthIpc` call it through the `getService` dependency they are handed. `git:init`
   calls `normalizeRepoPath` itself. I checked all three routes this session.
2. `normalizeRepoPath` today does two things, being a resolve to an absolute path and a check that
   the path is a directory. It gains a third, being that the path belongs to a project whose machine
   is this Mac. Anything else throws `INVALID_INPUT` with a sentence naming the machine.
3. The renderer gets the same fact and hides the write affordances, so the refusal is not how a
   person normally learns it. The renderer is the second line and never the only one.

### 4.3 Why main and not the renderer

Research 54 finding 2 is the proof. Restart is guarded by a remote test in `TerminalRegion.tsx` and
in `session-actions.tsx`, and not in `SplitSurface.tsx`, and the split modules contain the word
"machine" zero times. Three surfaces, two guards. Discard alone is reachable from 3 places inside `ScmSection`, and
the comment on `confirmDiscardRows` names them, being the row's hover action, the context menu and
the listbox's Backspace binding. A guard that has to be repeated per surface will be missed the same
way.

### 4.4 What it depends on, and it is not mine to decide

The check needs a project to carry a machine. Today it cannot.

| Layer | Today | What it needs |
| --- | --- | --- |
| `Project` in `src/shared/types.ts` | 3 fields, being id, path and name | One more field |
| The `projects` table | 3 columns, created in migration `001` in `src/main/manifest/schema.ts` | One column. The `sessions` table already gained `machine_id` the same way, with `addColumnIfMissing` and one `UPDATE` that writes `'local'` into every existing row |
| `normalizeRepoPath` | Resolves and checks it is a directory | One lookup and one throw |

If the phase that carries the machine through the project model does not land, ruling 2 cannot be
keyed on the project. In that case the check keys on the focused session instead, and it is worse in
a way worth stating. A project tab can hold a local session and a remote session at the same time,
so a rule keyed on focus turns the sidebar's verbs on and off as the person moves between sessions.
That is a confusing surface and it is still better than a silent recursive delete.

### 4.5 The label question, ruled

Research 54 item 15 asks for a "Files live on \<machine\>" label on the Explorer, the git sidebar,
search and Quick Open. Research 51 section 4.5 specified that string and nobody wrote it.

My ruling is that the label is not its own phase, for two reasons.

- On its own it does not remove the defect. It tells the person that a delete will land here and then
  lets it land. The refusal removes it, and the refusal is one condition in one function.
- It is worth writing, and it is worth writing in the same commit as the refusal, because a surface
  that refuses without saying why is worse than one that explains itself. The order is the check
  first and the string second.

The machine badge already exists as a component. `MachineBadge.tsx` is rendered from 4 other files
and at 6 sites, and every one of them is a session surface, being the strip, the dock, the rail and
the terminal region. No workspace surface renders it. That is the whole gap, and it is small.

---

## 5. Ruling 3. Search is refused on a remote project

### 5.1 May Tortie require ripgrep on the far machine

No.

Tortie's search is defined by a pinned engine and a fixed argv, not by the word ripgrep. The header
of `src/main/search/args.ts` says why `--no-config` is not taste, in the product's own words, being
that "a search that disagrees with itself between machines is worse than a search that is missing a
flag". Reading the far machine's own rg puts back exactly what that flag removes, and adds two more
sources of disagreement.

| What differs | Consequence |
| --- | --- |
| The version | `buildContentSearchArgs` passes 11 flags on every search and up to 16 when the person uses whole word, regex off, multiline or a replace preview. A flag an older rg does not know is an exit 2 and an error the person cannot act on |
| The build features | The vendored binary is recorded in `resolve.ts` as PCRE2 enabled, and `--engine auto` relies on it. A far side build without PCRE2 fails a lookaround query that works here |
| The person's own configuration | `--no-config` protects the local run. It protects the remote run only if the script also carries it, and every such promise is one more thing that has to be true on a computer Tortie did not install |

There is a second, plainer reason. Requiring a program on the far machine ends the property the whole
remote design is sold on, which is that nothing has to be installed over there. The tmux version gate
already shows what that costs. `decideRemoteVersionGate` accepts an exact string from a measured list
and Phase 83 had to be a whole phase to add one entry to it.

### 5.2 May Tortie ship ripgrep to the far machine

No, and the arithmetic is short.

| Step | Number |
| --- | --- |
| The binary recorded in `resolve.ts` | 4,528,512 bytes |
| The same bytes as base64, which is how the one write script carries a payload | 6,038,016 bytes |
| The longest command the door will send | 131,072 bytes |
| Sends needed | 47 |
| Write scripts in the catalogue | 1, and rule 6 of `remote-scripts.ts` holds it at 1 |
| File copy programs available anywhere in this product | 0 |

A 47 part upload needs an append mode script. Appending is not safe to run twice, which is the
property that lets the door retry after a dropped link. So shipping the engine costs the catalogue's
founding rule, and it also makes Tortie an installer on a machine whose design promise is that
nothing is installed. The far machine's own architecture is knowable, because the `machine-facts`
script already returns `uname`, so the choice of which binary to send is not the hard part. The hard
part is that sending any binary at all is a different product.

### 5.3 Even if the engine were there, the answer has the wrong shape

| Property | Local search | What the remote door can do |
| --- | --- | --- |
| Delivery | A stream. Frames every 16 ms or every 200 matches, on `searchResultsChannel(searchId)` | One answer after the process exits. `execRemoteShell` buffers with `execFile` and the markers are parsed only at the end |
| Time to first result | 2.8 to 5.0 ms measured, asserted under 60 ms | Nothing until everything, up to the 15,000 ms deadline |
| Floor per call before any network | Not applicable | 11 ms warm and 40 ms cold, measured on the loopback carriage where the far machine is this same Mac. `docs/research/assets/phase83/p83-execplane-3.7c.txt` line 6 |
| Cancel | SIGKILL the child | No counterpart. Whether closing the ssh channel kills the far command is not measured anywhere |
| Caps | 20,000 matches with a `capped` flag the view explains | The answer must also fit the 67,108,864 byte buffer, and a capped answer would arrive as a truncated blob rather than as a flag |

The renderer has no non-streaming path to fall back to. `GmuxSearchExtras` subscribes before it
starts and reads `SearchProgress` frames.

### 5.4 The two surfaces that ride with it

`rgBinaryPath` has 4 consumers. Refusing content search refuses Quick Open and the symbol palette
with it, because both list files with the same binary. The symbol indexer is the worst fit of the
three, because after listing it reads each candidate file with `readFileSync` in
`src/main/symbols/extract.ts`.

| Measurement of that cost, taken on this repository | Number |
| --- | --- |
| Tracked files | 1,452 |
| Files in the 6 grammars the indexer ships | 1,165 |
| One exec per file at the measured 11 ms warm floor, before any network | 12,815 ms |
| Total tracked bytes, if instead the whole tree were fetched in one answer | 30,863,573 |
| The same as base64 | 41,151,432, which is 61.3% of the answer buffer for one project |

The one shot fetch is the only shape the door supports, and it is a copy of the project onto this Mac
that is stale as soon as the agent writes a file. That is a sync product, and it is not this one.

### 5.5 What the person gets instead

On a remote project the search box, Quick Open and the symbol palette are absent, and each says the
same thing in the same words, naming the machine. The empty state today names the local project,
which is the wrong answer rather than a missing one.

The sentence should also say what does work, because it is true and it is one keystroke away. The
session is a terminal on that machine, so a search typed in the session searches the right computer.

---

## 6. What would reopen each ruling

Stated so a later round does not have to guess what would change my mind.

| Ruling | What would reopen it |
| --- | --- |
| No git write crosses | Nothing about latency. It would take a carriage that can tell "the command ran" from "the answer was lost", which means a receipt on the far machine rather than a faster link. That is a resident process over there, which is the Host decision |
| History and Branches stay absent on a remote project | A measured tailnet number showing that one exec round trip is under about 50 ms, plus a person who asks for them twice. Read only sections are cheap to add later and impossible to remove once someone depends on them |
| Search stays refused | A design where the engine's identity is measured and shown beside the results, and a streaming carriage exists. Both are absent today, and the second one is the same resident process question |

---

## 7. What I did not measure

Counted honestly, because the value of this document is that the unmeasured parts are named rather
than trusted.

1. **Any round trip against a real second machine.** Nothing here was measured against mac-pro or
   any tailnet host. The only exec timings that exist in this tree are on the loopback carriage where
   the far side is this same Mac, being 40 ms for the first verb and 11 ms for the second with the
   shared connection warm. What would measure it. Run `npm run probe:realmachine` with
   `GMUX_REAL_MACHINE_HOST` and `GMUX_REAL_MACHINE_CONFIRM` set to the same host, extended by a loop
   that times 20 runs of the `review-list` script against a real repository over there and prints the
   median and the slowest.
2. **How long `git status --porcelain=v2 -z --untracked-files=all` takes on a large repository**, on
   either machine. No test or probe in this tree times it. It decides whether a remote Changes group
   refresh is one second or ten.
3. **Whether any machine the operator owns has ripgrep at all, and at which version.** One read
   script running `command -v rg` and `rg --version` would answer it. That script does not exist, and
   ruling 3 does not depend on the answer.
4. **Whether closing the local ssh client kills the far side's command.** It decides whether a remote
   search could ever be cancelled, and it is unmeasured.
5. **The conformance gate did not run.** `node build/conformance-machines.mjs` fails in this worktree
   with "Cannot find module 'electron'", because the worktree has no `node_modules`. So every claim
   about the catalogue comes from reading `remote-scripts.ts`, `exec-plane.ts` and
   `build/conformance-machines.mjs` directly, not from the gate's own output.
6. **The 4,528,512 byte size of ripgrep is quoted from the header of `src/main/search/resolve.ts`**,
   not weighed this session, for the same reason. If that comment is stale the arithmetic in 5.2
   moves, and 47 sends would have to be a lot smaller than 1 for the ruling to change.
7. **I drove no application.** No Electron process was started, no ssh was started, no tmux command
   was run, and the operator's server was not contacted even to list sessions.

---

## 8. Paths and symbols this document relies on

| Area | File | Symbols |
| --- | --- | --- |
| The git contract | `src/shared/ipc/base.ts`, `src/shared/ipc/git.ts` | The 27 `git:*` channels and `EVT_GIT_CHANGED` |
| The git bridge | `src/preload/git.ts` | `git` |
| The one choke point | `src/main/git/ipc.ts` | `normalizeRepoPath`, `getGitService`, `registerGitIpc` |
| The other 18 handlers | `src/main/git/depth-ipc.ts` | `registerGitDepthIpc`, `GitDepthDeps.getService` |
| What the verbs run | `src/main/git/service.ts`, `src/main/git/exec.ts` | `GitService.discard`, `GitService.commit`, `GitService.unstage`, the commit and fetch deadlines |
| The status parser both sides use | `src/main/git/parse.ts` | `parsePorcelainV2Status` |
| The sidebar's root | `src/renderer/scm/ScmSection.tsx`, `src/renderer/scm/BranchHeader.tsx` | `ScmSection`, `confirmDiscardRows` |
| The discard confirm | `src/renderer/scm/selection.ts` | `discardCopy` |
| The branch and sync store | `src/renderer/scm/depth.ts` | `push`, `pull`, `sync`, `checkoutTracking`, `deleteBranch` |
| The watcher | `src/main/watcher/repo-watcher.ts`, `src/main/watcher/bus.ts` | `RepoWatcher`, `DEFAULT_DEBOUNCE_MS` |
| The search contract | `src/shared/ipc/search.ts` | `SEARCH_LIMITS`, `searchResultsChannel`, `GmuxSearchExtras` |
| The engine | `src/main/search/engine.ts`, `src/main/search/args.ts`, `src/main/search/resolve.ts` | `ContentSearchEngine`, `FLUSH_MS`, `buildContentSearchArgs`, `rgBinaryPath` |
| The search root | `src/renderer/search/SearchView.tsx`, `src/renderer/search/store.ts` | The `activeProjectId` lookup |
| The symbol indexer | `src/main/symbols/files.ts`, `src/main/symbols/extract.ts`, `src/main/symbols/languages.ts` | `MAX_INDEXED_FILE_BYTES`, `GRAMMARS`, `grammarFor` |
| The exec plane | `src/main/machines/exec-plane.ts` | `REMOTE_VERB_LEDGER`, `VERBS_THIS_RUNG_REFUSES`, `execRemoteShell`, `MAX_BUFFER_BYTES` |
| The script catalogue | `src/main/machines/remote-scripts.ts` | `REMOTE_SCRIPTS`, `REMOTE_SCRIPT_MAX_BYTES`, `remoteWriteScripts`, `REVIEW_LIST`, `REVIEW_FILE` |
| The door | `src/main/machines/remote-run.ts` | `runRemoteRead`, `runRemoteWrite`, `runRemoteScript`, `REMOTE_RUN_TIMEOUT_MS` |
| The remote review | `src/main/machines/remote-review.ts`, `src/main/machines/remote-copy.ts` | `reviewFilesOn`, `reviewFileOn`, `REMOTE_REVIEW_MAX_FILES`, `reviewMoreFiles` |
| The connection | `src/main/machines/ssh.ts` | `sshOptions`, `SSH_CONTROL_PERSIST_SECONDS`, `REQUIRED_SSH_OPTIONS` |
| The project record | `src/shared/types.ts`, `src/main/manifest/schema.ts` | `Project`, the `projects` table, the `machine_id` migration on `sessions` |
| The badge | `src/renderer/app/MachineBadge.tsx` | `MachineBadge` |
| The measured exec timings | `docs/research/assets/phase83/p83-execplane-3.7c.txt` | Line 6 |
