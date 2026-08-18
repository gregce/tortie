# Research 55, investigator 1: what carries the machine through the project model

Measured against the worktree at HEAD `7a665d7` on 2026-08-18. Every path and symbol
below was read this session. Nothing is quoted from an earlier document.

## The answer, first

A project can carry a machine identity, and the field itself is nearly free. One optional field on
`Project` in `src/shared/types.ts` breaks no compile in this tree, because only one place outside the
manifest repository builds a `Project` literal, at `writeManifest` in
`src/main/manifest/reconstruct.ts`.

The cost is not the field. The cost is three things the field does not fix.

1. **The manifest cannot hold two projects at the same path.** The `projects` table declares
   `path TEXT NOT NULL UNIQUE` in `src/main/manifest/schema.ts`, and `upsertProject` in
   `src/main/manifest/projects-repository.ts` depends on that constraint through its
   `ON CONFLICT(path)` clause. `/Users/gdc/gmux` here and `/Users/gdc/gmux` on mac-pro are the same
   key. Relaxing it needs a table rebuild, and this manifest has never done one. All 14 migrations in
   `MIGRATIONS` are `addColumnIfMissing` or `CREATE TABLE IF NOT EXISTS`. A rebuild also breaks older
   builds, because their `ON CONFLICT(path)` stops matching any constraint, so
   `MANIFEST_MIN_COMPATIBLE_VERSION` moves from 13 to 15.
2. **12 renderer files turn a project path into a filesystem root, in 34 places.** Each of those
   is a branch that has to be written, and each branch has to end in either a remote transport or a
   refusal. Nothing in the current transport can serve them.
3. **67 of the 161 invoke channels carry a filesystem path that is assumed to be on this Mac.**
   27 of those are git, and 16 of the 27 write.

So the model change is small and the surface change is not. The honest smallest change is the field
plus the manifest rebuild plus 34 branches, and 34 branches that all say "not on a remote project"
is a refusal design, not a feature. Whether that refusal design is worth shipping depends on
investigators 2 and 3. What I can rule on is that **the field is not the hard part, and no amount of
model work removes the need to decide, per surface, between a remote transport and a refusal.**

## 1. What a project is today, exactly

`Project` in `src/shared/types.ts` has three fields.

| Field | Type | Written by |
| --- | --- | --- |
| `id` | string | `randomUUID()` in `addProject`, `src/main/sessions/core.ts` |
| `path` | string | `resolvePath(path)` in the same method, checked with `isDirectory` |
| `name` | string | `projectNameForPath` in `src/main/projects/name.ts` |

`addProject` refuses a path that is not a directory **on this Mac**, with the message "That folder
does not exist." So a remote folder cannot become a project today, and the refusal is one line before
anything else runs.

Sessions already carry a machine. `Session.machine` is `SessionMachine` in `src/shared/types.ts`,
which is `id`, `label`, `color`, `answering`, `canRestore`, `restoreReason` and
`conversationSyncedAt`. The manifest column is `machine_id`, added by the migration at
`src/main/manifest/schema.ts` that also runs `UPDATE sessions SET machine_id = 'local' WHERE
machine_id IS NULL`, and the local sentinel is `LOCAL_MACHINE_ROW` in
`src/main/manifest/codecs.ts`. That is the exact precedent a project would follow, and it is why the
column half of the work is cheap.

### What is already wrong, before any change

A remote session's `projectPath` is the path of the project tab **on this Mac**.
`createSession` in `src/main/sessions/core.ts` passes `projectPath: input.projectPath` straight into
`remoteCreate`, and the renderer fills that from `project.path` at `src/renderer/state/sessions-slice.ts`.
`remoteCreate` in `src/main/machines/remote-sessions.ts` then stamps the far machine's tmux server
with `'@gmux-project': oneLine(input.projectPath)`, one of the four stamps in `REMOTE_STAMPS`.

So mac-pro's own tmux server is, right now, holding a durable record that a session belongs to a
folder that does not exist on mac-pro. This is not a hypothetical cost of the change. It is a defect
the change would fix, and it is the strongest single argument that a project has to carry a machine
rather than a session borrowing a local project's path.

## 2. The count, by three definitions

The backlog says sixty renderer files. The measured number depends on what counts, so here are three
definitions and the count for each. Tests are excluded from all three.

| # | Definition | Files | Command basis |
| --- | --- | --- | --- |
| A | Mentions any of `projectPath`, `project.path`, `projectRoot` | 41 | grep over `src/renderer/**/*.{ts,tsx}` |
| B | Actually reads `.path` off a `Project` object | 26 | pattern `project?.path`, `activeProject()?.path`, `find(...)?.path`, probes excluded |
| C | Touches a project rooted path string under any name, adding `repoPath` and `rootPath` | 85 | union of A with `repoPath|rootPath` |

The renderer has 326 non-test `.ts`/`.tsx` files, so definition C is 26 percent of the renderer and
definition B is 8 percent.

**Definition B is the one that matters**, because it is the set of places where the machine identity
would have to be read. Everything in C but not in B receives a path string as a parameter and never
learns where it came from, so those files change only if the parameter's type changes.

Under definition B there are **64 reads across 26 files**.

## 3. What the 64 reads do

30 of the 64 reads, spread over 14 files, use the path as an opaque key or a comparison. Those would
work unchanged if a machine were added, provided the key stays unique. The other 34, spread over 12
files, turn the path into a filesystem root.

### 3.1 The 30 reads that need no branch

| File | Reads | What it does with the path |
| --- | --- | --- |
| `src/renderer/state/layout.ts` | 7 | Key of the split layout record. `write` refuses any key not starting with `/` |
| `src/renderer/app/Titlebar.tsx` | 3 | Tab tooltip text, and a session filter by equality |
| `src/renderer/app/surfaces.ts` | 3 | Layout lookup and a session filter |
| `src/renderer/app/SessionDock.tsx` | 3 | Passes `projectPath` down as a layout key prop |
| `src/renderer/app/App.tsx` | 2 | `stageGrid` key, and a session filter |
| `src/renderer/app/ActivityBar.tsx` | 2 | Index into the search store and the git store |
| `src/renderer/app/TerminalRegion.tsx` | 2 | Layout `reconcile` key |
| `src/renderer/terminal/terminal-menu.ts` | 2 | Layout `splitWith` and `layouts[...]` key |
| `src/renderer/app/Sidebar.tsx` | 1 | Index into the git store |
| `src/renderer/app/SessionStrip.tsx` | 1 | Layout key prop |
| `src/renderer/app/split/surface-dnd.ts` | 1 | Layout key |
| `src/renderer/editor/EditorPanel.tsx` | 1 | Key of the stored editor panel width |
| `src/renderer/terminal/drop/target.ts` | 1 | Layout `selectLeaf` key |
| `src/renderer/state/clone.ts` | 1 | Reads the path off a freshly created project |

Two of these keys are persisted to `localStorage` and would collide across machines.

| Key | Module | Shape |
| --- | --- | --- |
| `gmux.splitLayouts` | `src/renderer/state/layout.ts` (`LS_LAYOUTS`) | Record keyed by absolute project path |
| `gmux.editorWidth` | `src/renderer/editor/panel-width.ts` (`LS_EDITOR_WIDTH`) | Record keyed by absolute project path |

The other 14 `gmux.*` keys in the renderer are not keyed by a project path, so the collision surface
is exactly two records. Both are presentation state. Losing or crossing them costs a pane arrangement
and a panel width, not work.

### 3.2 The 34 reads that must branch

| File | Reads | Where the path lands | Channels behind it |
| --- | --- | --- | --- |
| `src/renderer/scm/BranchHeader.tsx` | 8 | `repoPath` at line 73, then branch menu, sync, actions menu, refresh, plus two display uses | git |
| `src/renderer/tree/FilesSection.tsx` | 7 | `setRoot`, `setRepo`, `applyExternal`, and `rootPath` on `FileTree` | `fs:readDir`, `git:status`, `git:checkIgnore` |
| `src/renderer/search/symbols-store.ts` | 4 | `symbols.ensure`, `symbols.query`, `symbols.release` | `symbols:*` |
| `src/renderer/app/CreateSessionModal.tsx` | 4 | Prefills the Directory field with `project.path` (3), one session filter | `sessions:create` |
| `src/renderer/state/sessions-slice.ts` | 3 | `projectPath: project.path` on create (2), one session filter | `sessions:create` |
| `src/renderer/state/projects-slice.ts` | 2 | `symbols.release`, `actions.release` on close | `symbols:release`, `actions:release` |
| `src/renderer/scm/ScmSection.tsx` | 1 | `repoPath` at line 586 | git |
| `src/renderer/search/store.ts` | 1 | `repoPath` at line 219 | `search:start`, `search:context` |
| `src/renderer/search/SearchView.tsx` | 1 | Search scope | `search:*` |
| `src/renderer/context/actions.ts` | 1 | `projectRoot` for the skills flow | `context:*` |
| `src/renderer/context/ContextView.tsx` | 1 | `cwd` for the context scan | `context:scan` |
| `src/renderer/settings/integration.ts` | 1 | `projectPath` on a session create | `sessions:create` |

The whole SCM subsystem converts the project into a repo path in exactly two lines, at
`ScmSection.tsx:586` and `BranchHeader.tsx:73`. Search converts in one line, at `store.ts:219`. The
Explorer converts in one component, `FilesSection.tsx`. That concentration is the good news in this
count. There is no scattering to hunt.

## 4. The three layers under the renderer

### 4.1 The IPC contract

The shared contract declares 161 invoke channels across the 16 files in `src/shared/ipc/`.
67 of them carry a filesystem path, either as a bare argument or as a field on an input object. I
checked each input type's fields rather than reading only the first argument name.

| Family | Invoke channels | Path bearing | Note |
| --- | --- | --- | --- |
| git | 27 | 27 | Every input carries `repoPath`. 16 of the 27 write. See the split below |
| fs | 13 | 13 | Read, write, list, reveal, six mutations, two Open With, one image |
| context | 12 | 7 | `scan`, two skills runs, `hashSkill`, `skillPins`, `skillPinRecord`, `skillPinForget` |
| projects | 9 | 4 | `add`, `create`, `clonePreflight`, `clone` |
| actions | 4 | 4 | `runs`, `jobs`, `observe`, `release` |
| symbols | 3 | 3 | `query`, `ensure`, `release` |
| search | 3 | 2 | `start` and `context`; `cancel` takes an id |
| quickopen | 2 | 2 | `query` takes `root`, `warm` takes `repoPath` |
| drop | 3 | 2 | `prepare`, `persist` |
| recents | 3 | 1 | `remove` |
| preview | 2 | 1 | `url` |
| sessions | 12 | 1 | `create` carries `projectPath` and `cwd` |
| everything else | 68 | 0 | machines, settings, updates, log, terminal, capture, scrollback, app, ui, clipboard, config, agents, specstory, notice, activity |

The git split, so the 11 and the 16 can be checked rather than taken.

- Read, being 11: `status`, `log`, `showHead`, `branches`, `remoteUrl`, `remoteBranches`, `remotes`,
  `commitDetail`, `commitFileDiff`, `graphLog`, `checkIgnore`.
- Write, being 16: `stage`, `unstage`, `commit`, `discard`, `init`, `checkout`, `createBranch`,
  `createTag`, `cherryPick`, `checkoutDetached`, `checkoutTracking`, `deleteBranch`, `push`, `pull`,
  `sync`, `fetch`.

`fetch` counts as a write because it writes refs under `.git`. `init` counts because it creates a
repository.

`projects:add` is in the FROZEN map at `src/shared/ipc/base.ts`, whose header says existing
declarations must not be changed and new ones may be appended. So a machine bearing add cannot edit
that channel. The precedent for the append is `projects:pickDirectoryFor` in
`src/shared/ipc/projects.ts`, which exists only because the frozen `projects:pickDirectory` takes no
argument.

### 4.2 The spawn chokepoints in main

61 non-test files under `src/main` read a project path or call `listProjects`. They funnel
into a small number of process starts.

| Chokepoint | Symbol and file | Call sites | Serves |
| --- | --- | --- | --- |
| git | `runGit` and `runGitOrThrow`, `src/main/git/exec.ts` | 47 in 6 files | All 27 git channels and 4 actions channels |
| ripgrep | `rgBinaryPath`, `src/main/search/resolve.ts` | 3 spawns | `search:start`, `quickopen:*`, `symbols:*` |
| node fs | `src/main/fs/ipc.ts` and `src/main/fs/file-ops.ts` | 13 handlers | All 13 fs channels |

`runGit` sets `cwd: repoPath` and spawns the system `git`. `rgBinaryPath` resolves a ripgrep binary
**inside the signed bundle**, so search, quick open and the symbol indexer are structurally on this
Mac. The three spawn sites are `src/main/search/engine.ts`, `src/main/quickopen/worker.ts` and
`src/main/symbols/files.ts`.

Only the four fs mutation families go through the containment guard `resolveInsideRoot` in
`src/main/fs/paths.ts`. The four reads do not. `fs:readDir`, `fs:readFile`, `fs:writeFile` and
`fs:reveal` in `src/main/fs/ipc.ts` take a bare absolute path with no root check at all. That matters
here for one reason: **there is no place in the fs layer where main could tell a local path from a
remote one**, because the channel never learns which project the path belongs to. Any machine aware
fs layer has to change those four signatures or add new channels beside them.

### 4.3 The recents store

`src/main/recents/store.ts` is a plain JSON file at `<userData>/recents.json`. Three functions would
need work.

| Symbol | What breaks for a remote project |
| --- | --- |
| `sanitizeRecents` | Dedupes on `path` alone, so the same path on two machines collapses to one row |
| `missingRecents` | Calls `stat` on every row's path on this Mac. Every remote row reports missing on every launch |
| `rememberProject` | Takes the whole `Project`, so it already receives any new field. This one is free |

`RecentProject` in `src/shared/ipc/projects.ts` is `path`, `name`, `lastOpenedAt`. The home screen at
`src/renderer/app/HomeScreen.tsx` renders `missing` as a `Set<string>` of paths, so the same
collision appears there. Its row menu also calls `reveal(entry.path)`, which reaches
`shell.showItemInFolder` on this Mac.

`openRecentMenuItem` in `src/main/recents/open-recent-menu.ts` builds the native `File > Open Recent`
submenu with the parent folder as the sublabel and the absolute path as the tooltip. Both strings
would be about the wrong machine for a remote row, and the module's own comment already records that
it does not stat rows because that would put the filesystem in the way of opening a menu.

## 5. The price of the smallest honest change

I priced one design. `Project` gains `machineId?: string`, absent meaning this Mac, reusing the
sentinel `LOCAL_MACHINE_ROW` that sessions already use.

| # | Change | Size | Risk |
| --- | --- | --- | --- |
| 1 | `Project.machineId?: string` in `src/shared/types.ts` | 1 field | None. Additive, and only one literal exists outside the repository |
| 2 | `projects` table gains `machine_id TEXT`, backfilled `'local'` | 1 migration, matches the 14 already there | Low |
| 3 | `projects.path UNIQUE` becomes unique on `(machine_id, path)` | Table rebuild, first of its kind in this manifest | **High.** Breaking, `MANIFEST_MIN_COMPATIBLE_VERSION` 13 to 15 |
| 4 | New appended channel beside the frozen `projects:add` | 1 channel, precedent `projects:pickDirectoryFor` | Low |
| 5 | `addProject` in `src/main/sessions/core.ts` stops calling `isDirectory` for a remote row | 1 branch | Medium. The existence check is the only thing stopping a typo becoming a tab |
| 6 | `RecentProject` gains the field; `sanitizeRecents` dedupe key; `missingRecents` skips or asks | 3 functions | Low |
| 7 | Two `localStorage` records keyed by `(machineId, path)` | 2 modules | Low, and a one time loss of pane arrangement |
| 8 | 34 branches in 12 renderer files | 34 sites | **The whole question.** Each ends in a transport or a refusal |
| 9 | `@gmux-project` stamp on the far machine becomes the remote path | 1 line in `remote-sessions.ts` | Medium. `writeManifest` in `reconstruct.ts` builds project rows from `projectPath`, so a rebuild would then create rows for folders that are not here |

Items 1, 2, 4, 6 and 7 are about one day of work with tests. Item 3 is a breaking manifest migration
and needs its own verification tier. Item 8 is the feature.

### The cheaper variant of item 3, and why I do not recommend it

Keep `path UNIQUE` and add `machine_id` anyway. That gives one project per path across all machines,
so the operator could open `/Users/gdc/gmux` here or on mac-pro but not both. It avoids the rebuild
and keeps `MANIFEST_MIN_COMPATIBLE_VERSION` at 13. I do not recommend it, for one reason I can state
plainly: the operator's remote machine is a Mac with the same home directory layout, so the collision
is the ordinary case rather than the edge case, and a product that silently refuses to open the
second one has a worse failure than the one it is fixing.

## 6. What must refuse rather than adapt

I split the surfaces by whether anything in the current transport could serve them. The transport
today has two halves.

The first is `REMOTE_VERB_LEDGER` at `src/main/machines/exec-plane.ts`. It holds 11 tmux verbs. Five
are reads, being `list-sessions`, `display-message`, `show-options`, `show-environment` and
`capture-pane`. Three are server setup. Three mutate a session.

The second is `REMOTE_SCRIPTS` at `src/main/machines/remote-scripts.ts`. It holds 7 shell scripts,
whose ids are `machine-facts`, `store-list`, `store-head`, `store-copy`, `image-put`, `review-list`
and `review-file`. Six are `mode: 'read'` and one is `mode: 'write'`. A script answer is capped at
`REMOTE_SCRIPT_MAX_BYTES`, which is 131,072 bytes.

| Surface | Entry point | Verdict | Reason |
| --- | --- | --- | --- |
| Split layout, tabs, session grouping | `src/renderer/state/layout.ts` | Adapts free | Opaque key. Only needs uniqueness |
| Editor panel width | `src/renderer/editor/panel-width.ts` | Adapts free | Opaque key |
| Titlebar tooltip, branch folder text | `Titlebar.tsx`, `BranchHeader.tsx` | Adapts cheaply | Display only. Needs the machine name in the string |
| Explorer | `src/renderer/tree/FilesSection.tsx` | Needs a new script | `store-list` returns files only, no directories, and is mtime filtered. A tree needs per level expansion |
| Quick Open | `src/renderer/quickopen/store.ts` | **Refuses** | ripgrep is inside the bundle. `rgBinaryPath` cannot run there |
| Search | `src/renderer/search/store.ts` | **Refuses** | Same binary, same reason |
| Symbol palette | `src/renderer/search/symbols-store.ts` | **Refuses** | Same binary, plus a SQLite index written here |
| SCM, the 11 read verbs | `ScmSection.tsx:586`, `BranchHeader.tsx:73` | Needs new scripts | `review-list` already proves the shape for status. Log, branches and remotes do not exist |
| SCM, the 16 write verbs | Same two lines | **Refuses** | Six of the seven scripts are `mode: 'read'`, and `ALLOWED_GIT_VERBS` in `build/conformance-machines.mjs` is `['rev-parse', 'status', 'show']` |
| Editor open | `src/renderer/state/open-file.ts` | Partly exists | `review-file` opens one file, capped at `REMOTE_REVIEW_MAX_BYTES`, being 2 MiB, from a list capped at `REMOTE_REVIEW_MAX_FILES`, being 30 |
| Editor save | `save` in `src/renderer/editor/tab-io.ts` | **Refuses, and must say so** | See section 7 |
| Context view, skills install | `src/renderer/context/actions.ts` | **Refuses** | Installing a skill is a write to the far machine's home directory. Refusal 8 in CLAUDE.md binds this |
| GitHub Actions | `src/renderer/scm/runs.ts` | **Refuses for now** | It reads a remote URL out of the local repo, then talks to GitHub. The URL would have to come from the machine |
| Session create | `sessions-slice.ts`, `CreateSessionModal.tsx` | Already works | This is the one surface a machine bearing project would simplify rather than complicate |
| Recents and home screen | `src/main/recents/store.ts` | Adapts with care | The stat must not run for a remote row |
| Reveal in Finder | `HomeScreen.tsx`, `fs:reveal` | **Refuses** | There is no Finder there |

Every verdict above is a verdict against **today's** transport, not a permanent one. Quick Open,
Search and the symbol palette are marked as refusing because `rgBinaryPath` resolves a binary inside
the signed bundle, so ripgrep is only ever on this Mac. A path list built by `find` on the far
machine is conceivable, and it is a new script plus a new index rather than a change to any of the
three. That trade is investigator 3's to price, not mine.

Counted, over the 16 rows above:

- 3 adapt for free or nearly free, being the split layout, the editor panel width and the display strings.
- 2 need a script that does not exist, being the Explorer listing and the git read verbs.
- 8 must refuse.
- 1 partly exists already, being the editor open.
- 1 already works, being session create.
- 1 adapts with care, being recents.

Eight refusals out of sixteen surfaces is the number this research has to sit with. A remote project
tab that refuses search, quick open, symbols, every git write, the editor save, skills install,
Actions and Reveal is a tab holding an Explorer, a read only git status and a read only editor. That
is close to what `review-list` and `review-file` already give without a project at all.

## 7. Two defects the count uncovered

Both are in the current tree and neither depends on this feature shipping.

### 7.1 A remote review tab is editable and its save is silent

`OpenFileRemoteRef` in `src/renderer/state/open-file.ts` carries a doc comment saying "Non-null
implies read-only in every surface". The code does not do that.

- `readOnly` in `src/renderer/editor/MonacoHost.tsx` is `tab.deleted || tab.truncated ||
  tab.commit !== null`. `tab.remote` is not one of the three.
- `modeOptions` in `src/renderer/editor/EditorPanel.tsx` offers a `File` button on any tab with
  `canDiff`, and its tooltip reads "Edit the file" whenever `tab.commit` is null. A review tab has
  `canDiff: true` and `commit: null`, so it gets that button and that sentence.
- `setMode` in `src/renderer/editor/store.ts` refuses only a move **into** diff mode. Nothing refuses
  a move into file mode for a review tab.
- `save` in `src/renderer/editor/tab-io.ts` returns `false` when `tab.remote !== undefined`, with no
  toast and no banner.
- The three read only banners at the foot of `EditorPanel.tsx` cover `deleted`, `truncated` and
  `commit`. There is no fourth for `remote`.

So a person can open a review tab, press the button labelled "Edit the file", type, press command S,
and watch nothing happen with nothing said. This is the constraint the charter names, that a remote
project must never let a local write masquerade as a remote one, failing in its quietest form.

### 7.2 Every remote session is marked as a worktree

`isOutsideProject` in `src/renderer/app/session-actions.tsx` is
`session.cwd !== session.projectPath && !session.cwd.startsWith(session.projectPath + '/')`. For a
remote session, `projectPath` is a path on this Mac and `cwd` is a path on the far machine, so the
test is true unless the two strings happen to match. Three surfaces then draw the worktree chip
beside the machine badge: `SessionDock.tsx`, `SessionStrip.tsx` and `split/SplitSurface.tsx`.

The chip's tooltip shows `session.cwd`, which is at least honest. The chip itself says the session
runs outside the project checkout, which is not what happened.

## 8. What I did not measure

Named so nothing here is silently trusted.

| Item | Why not, and what would measure it |
| --- | --- |
| Latency of a listing or a tree expansion on the operator's tailnet | Investigator 2's question. `build/probe-remote-*` harnesses and a real mac-pro run would measure it |
| Whether a `find` based listing of a real repo fits the 131,072 byte answer cap | I measured only this repo's tracked path list at 53,162 bytes for 1,452 files, which fits. A listing carrying stat fields per row would be larger, and an untracked heavy tree larger again |
| The wall clock of the manifest table rebuild on a real manifest | Would need the operator's manifest, which I may not open. A synthetic one with 20 project rows and a few thousand session rows would measure it |
| Whether any older Tortie build is still installed anywhere | Decides how much the `MANIFEST_MIN_COMPATIBLE_VERSION` move actually costs. I did not look at the installed app |
| Whether `git status` over `review-list` is fast enough to drive a live SCM sidebar | Investigator 4's question |
| The 85 file count under definition C, file by file | I verified the count and the diff against definition A. I did not open all 44 files that are in C and not in A to confirm each one's `repoPath` really descends from a project |
| Whether `reconstruct.ts` would produce sensible rows if `@gmux-project` became a remote path | I read `writeManifest` and reasoned about it. I ran nothing |

## 9. Ruling on the research 54 item 15 label

The charter asks whether the "Files live on `<machine>`" label is a stopgap for a design about to
replace it.

**Ship the label, and do not treat it as a stopgap.** The reasoning is the count in section 6. Eight
of sixteen surfaces must refuse even with a machine on the project, and two more need a script that
does not exist. A remote project tab is therefore far off at best and not worth building at worst,
so the operator would spend that time looking at this Mac's Explorer while a session runs on mac-pro,
with nothing on screen saying so.

The label is also not wasted work under either outcome. Research 54 item 15 names four surfaces,
being the Explorer, the git sidebar, search and Quick Open. If a machine bearing project ships, all
four still need a machine name in their chrome, and the label is where it goes. If it does not ship,
the label is the whole fix.

Two things should ship with it rather than after it, because both are defects rather than absences.

1. Add `tab.remote` to the `readOnly` expression in `MonacoHost.tsx`, add the fourth banner in
   `EditorPanel.tsx`, and change the `File` tooltip so it does not say "Edit the file" for a tab that
   cannot be edited. Section 7.1.
2. Suppress the worktree chip for a session with a machine, in the three surfaces that draw it.
   Section 7.2.

Neither needs a project model change, and both are cases of Tortie saying something that is not true.
