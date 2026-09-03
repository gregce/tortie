# `InstalledGmuxApi` — complete member catalog

Reference for hardening `demo/bridge/install.ts` into a fully typed `InstalledGmuxApi`
implementation.

**Type:** `src/shared/ipc/index.ts:377` (`InstalledGmuxApi`).
**Runtime truth:** the object literal in `src/preload/index.ts:69-180` — that is what the
mock must structurally match.

Notation: `member(args) -> return — inert mock value`.
`Unsubscribe = () => void` (`src/shared/ipc/base.ts:113`). Every `onX` returns an
unsubscribe function; the renderer tolerates a non-function return
(`src/renderer/state/subscriptions.ts:677`), so `() => {}` is always safe.

Headline: only a handful of members are load-bearing. `projects.list`, `sessions.list`,
`sessions.onChanged`, `sessions.onStatusChanged`, `git.onChanged`, and — once a terminal
mounts — `term.onData`, `term.sendInput`, `sessions.attach`, `sessions.resize`. Everything
else is feature-detected and can be omitted, rejected from, or returned empty. See
[§5 Must-resolve vs safe-to-omit](#5-members-that-must-resolve-vs-members-safe-to-omit).

---

## Table of contents

- [sessions](#sessions--installedsessionsapi-16) · [projects](#projects--installedprojectsapi-11) · [recents](#recents-4) · [specstory](#specstory-6)
- [git](#git--installedgitapi-28) · [fs](#fs--installedfsapi-15) · [term](#term--installedtermapi-4) · [drop](#drop-3--pathforfile) · [capture](#capture-7) · [scroll](#scroll-4)
- [search](#search-4) · [context](#context-11) · [config](#config-3) · [symbols](#symbols-4) · [quickOpen](#quickopen-2) · [scrollback](#scrollback-5)
- [machines](#machines-40) · [notice](#notice-1) · [preview](#preview-2) · [overview](#overview-5) · [arch](#arch-7) · [actions](#actions-5) · [log](#log-5) · [updates](#updates-5) · [meta](#meta-2-properties-not-functions)
- [Top-level functions](#top-level-functions-26)
- Answers: [1 GmuxSettings](#1-gmuxsettings-and-the-reusable-default) · [2 Terminal attach](#2-terminal-attach-flow-end-to-end) · [3 bootBlock](#3-bootblock--tmux-check) · [4 gmux.meta](#4-what-reads-gmuxmeta) · [5 Must-resolve](#5-members-that-must-resolve-vs-members-safe-to-omit) · [6 Minimum surface](#6-minimum-non-crashing-surface)

---

## sessions — `InstalledSessionsApi` (16)

Defined: `src/shared/ipc/base.ts:138-150` + `src/shared/ipc/sessions.ts` + `src/shared/ipc/app.ts:61`.
Installed: `src/preload/sessions.ts:16`.

```
sessions.create(input: CreateSessionInput) -> Promise<Session> — return a fabricated Session
sessions.list() -> Promise<Session[]> — MUST RESOLVE. fixture array
sessions.rename(input: RenameSessionInput) -> Promise<Session> — return the patched Session
sessions.kill(sessionId: string) -> Promise<void> — Promise.resolve()
sessions.attach(sessionId: string) -> Promise<void> — Promise.resolve()   [start the fake byte stream here]
sessions.detach(sessionId: string) -> Promise<void> — Promise.resolve()
sessions.resize(input: ResizeInput) -> Promise<void> — Promise.resolve()
sessions.onChanged(cb: (sessions: Session[]) => void) -> Unsubscribe — MUST BE A FUNCTION. () => {}
sessions.onStatusChanged(cb: (sessionId: string, status: SessionStatus) => void) -> Unsubscribe — MUST BE A FUNCTION. () => {}
sessions.discard(sessionId: string) -> Promise<void> — Promise.resolve()
sessions.restore(sessionId: string, options?: {withoutCapture?: boolean}) -> Promise<Session> — the Session with status 'running'
sessions.restart(sessionId: string, options?: {withoutCapture?: boolean}) -> Promise<Session> — a new Session
sessions.listRemoved() -> Promise<Session[]> — []
sessions.askRestoreProject(input: {sessionName: string, projectPath: string}) -> Promise<'open'|'cancel'> — 'cancel'
sessions.shellPathReady() -> Promise<void> — OMIT THIS MEMBER (see note)
sessions.resumeInPlace(sessionId: string) -> Promise<ResumeInPlaceResult> — {landing: null, refusal: 'not-dropped', before: 0, after: 0}
```

`ResumeInPlaceResult` (`src/shared/ipc/sessions.ts:564`):
`{landing: 'armed'|'twice'|'absent'|'unknown'|null, refusal: 'not-dropped'|'not-here'|'no-conversation'|'running'|'agent-back'|'not-composed'|null, before: number, after: number}`.
Exactly one of `landing` and `refusal` is set.

> **Omit `shellPathReady` deliberately.** `src/renderer/state/sessions-slice.ts:1135` reads
> `shellPathReady: typeof sessionExtras?.shellPathReady !== 'function'` — absent means the
> flag starts `true` and the five Restore controls are enabled immediately instead of
> waiting on a promise.
>
> **`sessions` must at minimum be an object.** `src/renderer/state/subscriptions.ts:264`
> dereferences `gmux.sessions` unguarded inside an `async` function, where the outer
> `try/catch` cannot see the throw.

### `Session` — exact record (`src/shared/types.ts:164-352`)

```ts
{
  id: string;                    // UUID, manifest PK
  name: string;                  // user-visible
  tmuxName: string;              // sanitized: . and : rewritten to -
  projectPath: string;           // absolute repo root
  cwd: string;
  agent: 'claude' | 'codex' | 'shell';          // AgentKind, types.ts:32
  status: 'running'|'idle'|'needs_input'|'exited'|'restorable'|'unknown'|'discarded';
  createdAt: number;             // epoch ms
  // everything below is OPTIONAL
  agentSessionId?: string;
  resumeArgv?: string[];
  resumeCapture?: 'armed' | 'capturing' | 'unavailable' | 'none';
  exitCode?: number;
  exitSignal?: string;           // lower case, no SIG prefix, e.g. "term"
  exitDetail?: string;           // last 5 non-empty lines, ANSI stripped, <=500 bytes
  capture?: { provider: string; bin: string; binVersion?: string; exitCodeApproximate: boolean };
  restore?: {
    kind: 'failed'|'interrupted'|'shell_only'|'transcript'|'armed';
    at: number;
    stage?: 'preflight'|'create'|'replay'|'arm';
    reason?: string; replayFailure?: string; armFailure?: string;
  };
  hasSavedScrollback?: boolean;  // only on 'exited' rows
  removedAt?: number;            // only on 'discarded' rows
  machine?: {
    id: string; label: string;
    color: MachineColor;         // src/shared/machines.ts:124
    answering: boolean; canRestore: boolean; restoreReason: string | null;
    conversationSyncedAt?: number | null;
  };
  machineGone?: { label: string; lastStatus: SessionStatus; lastSeenAt: number; forgottenAt: number };
  savedOutputAt?: number;
  closedProject?: { name: string; path: string; closedAt: number };
  recordPath?: string;
  recordAbsence?: 'shell'|'remote'|'no-id'|'not-yet'|'no-store'|'unsupported';
}
```

`CreateSessionInput` (`types.ts:507`):
`{name, projectPath, cwd?, agent: AgentKind, extraArgs?: string[], capture?: boolean, startAnyway?: boolean, machineId?: string, projectMachineId?: string}`.
`RenameSessionInput`: `{sessionId, name}`. `ResizeInput`: `{sessionId, cols, rows}`.

### What the two subscriptions deliver

- **`onChanged`** — payload is the **full refreshed `Session[]`** (channel `sessions:changed`,
  `base.ts:87`). The renderer calls `applySessions(sessions)` wholesale
  (`subscriptions.ts:681`). To animate a demo, re-emit the whole array.
- **`onStatusChanged`** — **two positional args**: `(sessionId: string, status: SessionStatus)`
  (channel `status:changed`, `base.ts:91`). Cheap per-session flip, no full list.
  `TerminalPane.tsx:394` also listens: an `'exited'` status paints the
  "This session has ended / Reconnect" overlay.
- Excerpts and last-output times ride a **third**, top-level channel — `onActivityChanged`
  (see [Top-level functions](#top-level-functions-26)), not these two.

---

## projects — `InstalledProjectsApi` (11)

`src/shared/ipc/base.ts:151-156` + `src/shared/ipc/projects.ts`. Installed: `src/preload/projects.ts:33`.

```
projects.add(path: string) -> Promise<Project> — a fabricated Project
projects.list() -> Promise<Project[]> — MUST RESOLVE. fixture array (empty [] renders FirstRun, not the shell)
projects.remove(projectId: string) -> Promise<void> — Promise.resolve()
projects.pickDirectory() -> Promise<string|null> — null
projects.pickDirectoryFor(purpose: 'project'|'new-project-parent') -> Promise<string|null> — null
projects.create(input: CreateProjectInput) -> Promise<CreateProjectResult> — reject, or {project, path, isRepo: true}
projects.addRemote(input: {machineId: string, path: string}) -> Promise<AddRemoteProjectResult> — {ok: false, reason: 'notConnected'}
projects.clonePreflight(input: {raw: string}) -> Promise<ClonePreflight> — reject
projects.clone(input: CloneStartInput) -> Promise<{cloneId: string}> — reject
projects.cancelClone(cloneId: string) -> Promise<void> — Promise.resolve()
projects.onCloneProgress(cloneId: string, cb: (p: CloneProgress|CloneDone) => void) -> Unsubscribe — () => {}
```

### `Project` — exact record (`src/shared/types.ts:484-501`)

```ts
{ id: string; path: string; name: string; machineId?: string }
```

Four fields, that is all. `machineId` omitted or `'local'` means this Mac.

Supporting shapes (`src/shared/ipc/projects.ts`):

- `CreateProjectInput` `{parentDir, name, gitInit: boolean}`;
  `CreateProjectResult` `{project: Project, path: string, isRepo: boolean, gitError?: string}`.
- `AddRemoteProjectResult` = `{ok: true, project: Project, alreadyOpen: boolean}` |
  `{ok: false, reason: 'missing'|'notdir'|'denied'|'unreachable'|'notConnected'|'notAbsolute'|'noSuchMachine'}`.
- `ClonePreflight` `{url, host, owner?, repo?, suggestedName, defaultBranch?, rewrittenFromSsh?, strippedCredential?}`;
  `CloneStartInput` `{cloneId, url, parentDir, name}`.
- `CloneProgress` `{cloneId, phase: 'starting'|'enumerating'|'counting'|'compressing'|'receiving'|'resolving'|'checkingOut', percent?, done?, total?, bytes?}`;
  `CloneDone` `{cloneId, done: true, cancelled?, leftoverPath?, project?, path?, defaultBranch?, error?: {kind: CloneFailureKind, message, detail?}}`.
  Discriminate with `frame.done === true`, never `'done' in frame` — a progress frame also
  carries `done` as an object count.

---

## recents (4)

`src/shared/ipc/projects.ts:404`. Installed: `src/preload/projects.ts:62`.

```
recents.list() -> Promise<RecentProject[]> — [] (home screen simply draws no recents block)
recents.missing() -> Promise<string[]> — []
recents.remove(path: string, machineId?: string) -> Promise<RecentProject[]> — []
recents.onChanged(cb: (recents: RecentProject[]) => void) -> Unsubscribe — () => {}
```

`RecentProject` = `{path: string, name: string, lastOpenedAt: number, machineId?: string}`.

---

## specstory (6)

`src/shared/ipc/specstory.ts:74`. Installed inline: `src/preload/index.ts:57`.

```
specstory.status(refresh?: boolean) -> Promise<SpecStoryStatus> — reject (Settings shows one honest line)
specstory.beginLogin() -> Promise<SpecStoryLoginStart> — reject
specstory.cancelLogin() -> Promise<void> — Promise.resolve()
specstory.submitCode(code: string) -> Promise<SpecStoryAuthActionResult> — reject
specstory.signOut() -> Promise<SpecStoryAuthActionResult> — reject
specstory.onNotice(cb: (n: SessionCaptureNotice) => void) -> Unsubscribe — () => {}
```

Types in `src/shared/specstory-status.ts`; `SessionCaptureNotice` =
`{kind: 'sync-failed'|'declined', sessionId, sessionName, message}` (`types.ts:463`).
Fully optional (`src/renderer/state/specstory.ts:26`).

---

## git — `InstalledGitApi` (28)

`src/shared/ipc/base.ts:157-166` + `src/shared/ipc/git.ts`. Installed: `src/preload/git.ts:22`.

```
git.status(repoPath: string) -> Promise<GitStatusResult> — MOST IMPORTANT GIT FIXTURE (shape below)
git.stage(input: {repoPath, paths: string[]}) -> Promise<void> — Promise.resolve()
git.unstage(input: {repoPath, paths: string[]}) -> Promise<void> — Promise.resolve()
git.commit(input: {repoPath, message, amend?}) -> Promise<string> — a fake 40-char sha
git.discard(input: {repoPath, paths: string[]}) -> Promise<void> — Promise.resolve()
git.log(input: {repoPath, maxCount?}) -> Promise<GitLogEntry[]> — []
git.showHead(input: {repoPath, path}) -> Promise<string> — '' (empty = new since HEAD)
git.onChanged(cb: (repoPath: string) => void) -> Unsubscribe — MUST BE A FUNCTION (see §5). () => {}
git.init(repoPath: string) -> Promise<void> — Promise.resolve()
git.branches(repoPath: string) -> Promise<GitBranchInfo[]> — []
git.checkout(input: {repoPath, branch}) -> Promise<void> — Promise.resolve()
git.createBranch(input: {repoPath, name, fromRef?}) -> Promise<void> — Promise.resolve()
git.createTag(input: {repoPath, name, ref}) -> Promise<void> — Promise.resolve()
git.cherryPick(input: {repoPath, sha}) -> Promise<GitCherryPickResult> — {status:'conflict', aborted:true}
git.commitDetail(input: {repoPath, sha}) -> Promise<GitCommitDetail> — reject
git.remoteUrl(repoPath: string) -> Promise<string|null> — null (hides "Open on GitHub")
git.checkoutDetached(input: {repoPath, sha}) -> Promise<void> — Promise.resolve()
git.remoteBranches(repoPath: string) -> Promise<GitRemoteBranchesResult> — {branches: [], lastFetchedAt: null}
git.fetch(repoPath: string) -> Promise<void> — Promise.resolve()
git.checkoutTracking(input: {repoPath, remoteBranch}) -> Promise<void> — Promise.resolve()
git.deleteBranch(input: {repoPath, name, force?}) -> Promise<GitDeleteBranchResult> — {status:'deleted'}
git.commitFileDiff(input: GitCommitFileDiffInput) -> Promise<GitCommitFileDiff> — reject
git.remotes(repoPath: string) -> Promise<GitRemotesResult> — {remotes: [], branch: null, upstream: null}
git.push(input: {repoPath, setUpstream?, remote?}) -> Promise<GitPushResult> — {status:'no-upstream', branch:'main', remote:null}
git.pull(input: {repoPath}) -> Promise<GitPullResult> — {status:'up-to-date', upstream:'origin/main'}
git.sync(input: {repoPath}) -> Promise<GitSyncResult> — {pull:{status:'up-to-date',upstream:'origin/main'}, push:null}
git.graphLog(input: GitGraphLogInput) -> Promise<GitGraphLogResult> — see below
git.checkIgnore(input: {repoPath, paths: string[]}) -> Promise<string[]> — []
```

### `GitStatusResult` — exact (`src/shared/types.ts:603-616`)

```ts
{
  repoPath: string;
  branch?: string;        // undefined when detached
  detachedAt?: string;    // short SHA when detached
  upstream?: string;
  ahead: number;
  behind: number;
  merging: boolean;
  files: GitFileStatus[];
  isRepo: boolean;        // false = friendly "not a repo" state, never an error
}
```

`GitFileStatus` = `{path: string, origPath?: string, indexState: GitFileState, worktreeState: GitFileState}`.
`GitFileState` = `'M'|'A'|'D'|'R'|'C'|'U'|'?'|'!'|'.'` (`'.'` = unchanged on that side).

> **You do NOT need `GitStatusDetailed.groups`.** Main returns the superset, but the
> renderer derives its own groups from `files` via `groupFiles`
> (`src/renderer/scm/groups.ts`, used at `src/renderer/state/git.ts:318`). The frozen shape
> above is sufficient for the SCM view.

`GitLogEntry` (`types.ts:636`): `{hash, parents: string[], authorName, authorEmail, authorDate: number, subject}`
— main actually returns `GitLogEntryDetailed`, which adds `{sha, shortSha, author, dateISO}`.
Include those; they are cheap and some views read them.

`GitGraphLogResult` (`types.ts:1552`):
`{repoPath, scope: 'branch'|'local'|'everything', refs: string[], entries: GitGraphLogEntry[], hasMore: boolean, divergence: GitDivergenceInfo, isRepo: boolean, hasCommitGraph: boolean}`.
Inert:

```js
{ repoPath, scope: 'branch', refs: [], entries: [], hasMore: false,
  divergence: { branch: 'main', upstream: null, upstreamRef: null, upstreamGone: false,
                ahead: 0, behind: 0, headSha: null, upstreamSha: null, mergeBase: null,
                lastFetchedAt: null, truncated: false },
  isRepo: true, hasCommitGraph: true }
```

---

## fs — `InstalledFsApi` (15)

`src/shared/ipc/base.ts:167-170` + `src/shared/ipc/files.ts` + `src/shared/ipc/projects.ts:87`.
Installed: `src/preload/files.ts:18`.

```
fs.readFile(path: string) -> Promise<ReadFileResult> — SECOND MOST IMPORTANT FIXTURE (shape below)
fs.writeFile(path: string, contents: string) -> Promise<void> — Promise.resolve()
fs.readDir(dirPath: string) -> Promise<ReadDirResult> — IMPORTANT FIXTURE (shape below)
fs.reveal(path: string) -> Promise<void> — Promise.resolve()
fs.createFile(input: FsCreateInput) -> Promise<FsOpEntry> — reject
fs.createFolder(input: FsCreateInput) -> Promise<FsOpEntry> — reject
fs.rename(input: FsRenameInput) -> Promise<FsRenameResult> — reject
fs.duplicate(input: FsDuplicateInput) -> Promise<FsOpEntry> — reject
fs.move(input: FsMoveInput) -> Promise<FsMoveResult> — reject
fs.trash(input: FsTrashInput) -> Promise<FsTrashResult> — reject
fs.readImage(input: ImageReadInput) -> Promise<ImageReadResult> — {kind:'missing', ...} or a data-URL ImageReadOk
fs.openWithApps(input: {root, path}) -> Promise<OpenWithApps> — {status:'unavailable'}
fs.openWith(input: {root, path, app: OpenWithHandler}) -> Promise<OpenWithOutcome> — {status:'canceled'}
fs.importPaths(input: FsImportInput) -> Promise<FsImportResult> — reject
fs.startDrag(input: FsStartDragInput) -> Promise<void> — Promise.resolve()
```

### `ReadFileResult` — exact (`src/shared/types.ts:701-707`)

```ts
{ path: string; contents: string; encoding: 'utf8'; truncated: boolean }
```

### `ReadDirResult` / `FsDirEntry` — exact (`src/shared/types.ts:719-740`)

```ts
{ path: string; entries: { name: string; path: string; kind: 'file'|'dir'|'symlink'|'other' }[] }
```

`entries` is **unfiltered and unsorted** — the renderer hides `.git`, keeps dotfiles, and
sorts (directories first, case-insensitive). `path` on each entry is the absolute
`join(dirPath, name)`. `kind` is `'dir'` only for real directories; a symlink to a
directory is `'symlink'` so the tree never follows cycles.

File-ops types live in `src/shared/fs-ops.ts`; image types in `src/shared/image-types.ts`
(`ImageReadResult` = `ImageReadOk | ImageReadTooLarge | ImageReadMissing`); Open With types
in `src/shared/ipc/files.ts:285-347`.

---

## term — `InstalledTermApi` (4)

`src/shared/ipc/base.ts:171-176` + `src/shared/ipc/terminal.ts:66`. Installed: `src/preload/terminal.ts:30`.

```
term.onData(sessionId: string, cb: (data: Uint8Array) => void) -> Unsubscribe — MUST BE A FUNCTION. Push fake PTY bytes here.
term.sendInput(sessionId: string, data: string) -> void   [SYNCHRONOUS, not a promise] — no-op or echo
term.ack(sessionId: string, bytes: number) -> void        [SYNCHRONOUS] — OMIT THIS MEMBER
term.onExit(sessionId: string, cb: (p: TermExitPayload) => void) -> Unsubscribe — OMIT, or () => {}
```

`TermExitPayload` (`src/shared/ipc/terminal.ts:35`):
`{sessionId: string, exitCode: number, signal?: number}`. Sent **only for unexpected
exits** — a clean `sessions.detach` never fires it.

Full flow in [§2 Terminal attach](#2-terminal-attach-flow-end-to-end).

---

## drop (3) + `pathForFile`

`src/shared/ipc/terminal.ts:126`. Installed: `src/preload/terminal.ts:52`.

```
drop.strategies() -> Promise<ImageDropTable> — {agents: {}, fallback: {strategy:'path-text', insert:'paste', verified:false}}
drop.prepare(paths: string[]) -> Promise<DropPrepareResult> — {items: []}
drop.persist(input: DropPersistInput) -> Promise<DropPersistResult> — reject
```

`ImageDropTable` `{agents: Partial<Record<AgentRegistryId, AgentImageDrop>>, fallback: AgentImageDrop}`;
`AgentImageDrop` `{strategy: 'paste-path'|'clipboard-attach'|'path-text', insert: 'paste'|'type', verified: boolean, notes?}`
(`types.ts:1282-1304`).
`DropPreparedItem` `{sourcePath, kind: 'file'|'dir'|'missing', refPath, copied, isImage, bytes}`.

---

## capture (7)

`src/shared/ipc/terminal.ts:260`. Installed: `src/preload/terminal.ts:72`.

```
capture.viewport(input: {rect: {x,y,width,height}, suggestedName: string}) -> Promise<{width,height,bytes}> — reject
capture.image(input: {png: Uint8Array, suggestedName: string}) -> Promise<{width,height,bytes}> — reject
capture.saveLast() -> Promise<{path: string|null}> — {path: null}
capture.pane(input: {tmuxName: string, historyLines: number}) -> Promise<{ansi: string}> — {ansi: ''}
capture.writeRich(input: {text: string, html: string}) -> Promise<void> — Promise.resolve()
capture.paste() -> Promise<void> — Promise.resolve()
capture.clearHistory(tmuxName: string) -> Promise<void> — Promise.resolve()
```

---

## scroll (4)

`src/shared/ipc/terminal.ts:378`. Installed: `src/preload/terminal.ts:87`.

> **Omit the whole object.** The pane then has no gmux scroll surface and every keystroke
> takes the direct `term.sendInput` path
> (`src/renderer/terminal/scroll/surface.ts:91-93, 260-266`).

```
scroll.state(input: {sessionId: string, anchorFrom?: number}) -> Promise<TerminalScrollState>
scroll.by(input: {sessionId: string, lines: number}) -> Promise<TerminalScrollState>
scroll.to(input: {sessionId: string, position: number}) -> Promise<TerminalScrollState>
scroll.live(sessionId: string) -> Promise<TerminalScrollState>
```

`TerminalScrollState` (`terminal.ts:287`):
`{hasPane: boolean, position: number, history: number, rows: number, inMode: boolean, innerAlt: boolean, innerMouse: boolean}`.
If you do keep it, `{hasPane:false, position:0, history:0, rows:0, inMode:false, innerAlt:false, innerMouse:false}`
makes the renderer stop asking.

---

## search (4)

`src/shared/ipc/search.ts:271`. Installed: `src/preload/search.ts:25`.

```
search.onResults(searchId: string, cb: (p: SearchProgress) => void) -> Unsubscribe — () => {}
search.start(input: ContentSearchInput) -> Promise<{searchId: string}> — echo input.searchId, then emit one done frame
search.cancel(searchId: string) -> Promise<void> — Promise.resolve()
search.context(input: SearchContextInput) -> Promise<{lines: {line,text}[]}> — {lines: []}
```

Contract order is **subscribe before start**. `SearchProgress` (`search.ts:183`):
`{searchId, seq, files: SearchFileResult[], totalMatches, totalFiles, done: boolean, capped: boolean, cancelled?, error?, elapsedMs?, ttfrMs?, maxFilesizeBytes?}`.
Inert terminal frame:
`{searchId, seq:0, files:[], totalMatches:0, totalFiles:0, done:true, capped:false}`.

---

## context (11)

`src/shared/ipc/context.ts:266`. Installed: `src/preload/context.ts:24`.
Whole object optional (`src/renderer/context/bridge.ts:42`).

```
context.scan(input: ContextScanInput) -> Promise<ContextScanResult> — reject (view disables itself)
context.skillsCapability() -> Promise<SkillsCapability> — reject
context.skillsPlan(input: {operation: SkillsOperation, projectRoot?: string}) -> Promise<SkillsPlanResult> — reject
context.skillsRun(input: {operation, projectRoot?}) -> Promise<SkillsRunResult> — reject
context.hashSkill(path: string) -> Promise<ContextSkillHash> — {path, hash:null, algorithm:'sha256', problem:'demo'}
context.skillsSearch(input: {query, limit?, owner?}) -> Promise<SkillSearchResult> — reject
context.skillsAudit(input: {source: string, skills: string[]}) -> Promise<SkillAuditResult> — reject
context.skillsPreview(input: {source, skill}) -> Promise<SkillPreviewResult> — reject
context.skillPins(paths: string[]) -> Promise<ContextSkillPinCheck[]> — []
context.skillPinRecord(input: ContextSkillPinInput) -> Promise<ContextSkillPinCheck|null> — null
context.skillPinForget(path: string) -> Promise<void> — Promise.resolve()
```

Types: `src/shared/context.ts`, `src/shared/skills.ts`, plus `ContextSkillHash` /
`ContextSkillPinCheck` in `src/shared/ipc/context.ts:130,185`.

---

## config (3)

`src/shared/ipc/agents.ts:191`. Installed: `src/preload/context.ts:54`.
Called at boot (`src/renderer/settings/settings-store.ts:199`), guarded by
`if (b?.config === undefined) return;`.

```
config.rows() -> Promise<ConfigRowsResult> — {rows: [], errors: [], directory: '/demo/.tortie'}
config.confirm(input: {id, hashRead, linesRead: string[]}) -> Promise<ConfigRowView> — reject
config.forget(id: string) -> Promise<ConfigRowView> — reject
```

`ConfigRowView` (`agents.ts:124`):
`{id, displayName, state: 'confirmed'|'never'|'changed'|'unknown', hash, confirmedHash: string|null, confirmedAt: number|null, confirmedLines: string[], lines: string[], refusal: string|null, warning: string}`.

---

## symbols (4)

`src/shared/ipc/search.ts:348`. Installed: `src/preload/search.ts:45`.

```
symbols.query(input: SymbolQueryInput) -> Promise<SymbolQueryResult> — {hits:[], indexing:false, indexed:0, total:0, cold:true}
symbols.ensure(repoPath: string) -> Promise<SymbolEnsureResult> — {started:false, indexing:false, indexed:0, total:0}
symbols.release(repoPath: string) -> Promise<void> — Promise.resolve()
symbols.onProgress(cb: (p: SymbolIndexProgress) => void) -> Unsubscribe — () => {}
```

Shapes in `src/shared/symbols.ts`.

---

## quickOpen (2)

`src/shared/ipc/search.ts:548`. Installed: `src/preload/search.ts:67`.
Whole object optional (`src/renderer/quickopen/store.ts:56`).

```
quickOpen.query(input: QuickOpenQueryInput) -> Promise<QuickOpenResult>
quickOpen.warm(input: {root: string, paths?: string[]}) -> Promise<void> — Promise.resolve()
```

### Full shapes (`src/shared/ipc/search.ts:389-494`)

```ts
QuickOpenQueryInput {
  roots: string[];      // ROOT KEYS from rootKeyOf(): a bare absolute path locally,
                        //   `machine:<machineId>:<path>` remotely. Active project first.
  query: string;        // already stripped of any ":line" suffix
  seq: number;          // latest-wins; renderer drops answers older than its own
  limit: number;        // 50 is VS Code's number and this build's
  recents?: readonly (QuickOpenRecent | string)[];   // tiebreaker only, never a score bonus
}
QuickOpenRecent { root: string; relPath: string }

QuickOpenResult {
  seq: number;          // ECHO the request's seq or the answer is dropped
  hits: QuickOpenHit[];
  total: number;        // candidates matched before the render limit
  ready: boolean;       // every queried root has a complete path list
  indexed: number;      // paths indexed across queried roots
  refreshing: boolean;
  capped: boolean;      // a root hit the 200,000-path cap
  error?: string;       // ONLY for real failures, never for "still indexing"
}
QuickOpenHit {
  repoPath: string;
  machineId?: string;   // absent = this Mac
  relPath: string;      // POSIX separators, relative to repoPath
  positions: number[];  // matched char offsets into relPath — REQUIRED, ascending, no dups.
                        //   Empty for the recents list (nothing typed, nothing matched).
  score: number;        // comparable across roots, meaningless in isolation
  recent: boolean;
}
```

Fixture note: `positions` drives the highlight in the picker; supply real indices from a
simple substring match or the rows read as unexplained. Inert-but-correct answer:
`{seq: input.seq, hits: [], total: 0, ready: true, indexed: 0, refreshing: false, capped: false}`.
Also exported: `QUICK_OPEN_WARM_STALE_MS = 5_000` (`search.ts:386`).

---

## scrollback (5)

`src/shared/ipc/terminal.ts:489`. Installed: `src/preload/terminal.ts:99`.

```
scrollback.stats() -> Promise<ScrollbackStats> — see shape
scrollback.session(sessionId: string) -> Promise<SessionScrollbackFacts|null> — null
scrollback.report() -> Promise<string> — ''
scrollback.saved(sessionId: string) -> Promise<SavedSessionOutput|null> — null
scrollback.onNotice(cb: (n: GmuxNotice) => void) -> Unsubscribe — () => {}
```

> **Trap:** `src/renderer/state/subscriptions.ts:704` is `scrollbackExtras?.onNotice(...)` —
> the `?.` guards the *object*, not the method. Either omit `scrollback` entirely or make
> sure `onNotice` is present. `{scrollback: {}}` throws.

`ScrollbackStats` (`src/shared/scrollback.ts:131`):
`{sessions: number, lines: number, bytes: number, perLine: BytesPerLine, deepest: {name,lines,limit}|null, saved: {files,bytes,largestBytes}, diskFreeBytes: number}`.
`SessionScrollbackFacts`: `{sessionId, lines, limit, bytes}`.
`SavedSessionOutput` (`terminal.ts:425`):
`{text: string, capturedAt: number, machineId: string|null, verified: boolean, bytes: number, lines: number}`.
`GmuxNotice` = `ScrollbackNotice | DurabilityNotice` (`src/shared/notice.ts:354`);
`ScrollbackNotice` = `{kind: 'discarding'|'saved-large'|'disk-low', sessionName?, limit?, bytes?}`.

---

## machines (40)

`src/shared/ipc/machines.ts:263`, split across `src/shared/ipc/machines/*.ts`.
Installed: `src/preload/machines.ts:48`.

> **Omit the whole object.** Every call site guards it
> (`subscriptions.ts:206`, `sessions-slice.ts:505`, `context/store.ts:62`,
> `quickopen/store.ts:61`), and Settings simply shows no Machines section.

```
# rows.ts
machines.rows() -> Promise<MachinesResult>
machines.reload() -> Promise<MachinesResult>
machines.tailscaleNames() -> Promise<TailscaleSourceResult>
machines.add(input: MachineAddInput) -> Promise<MachineRowView>
machines.confirm(input: MachineConfirmInput) -> Promise<MachineRowView>
machines.acceptVersion(input: MachineAcceptVersionInput) -> Promise<MachineRowView>
machines.forget(id: string) -> Promise<MachineRowView>
machines.remove(id: string) -> Promise<MachinesResult>
machines.prepare(id: string) -> Promise<MachinePrepareResult>
# connection.ts
machines.test(input: MachineTestInput) -> Promise<MachineTestStarted>
machines.testInput(input: {testId: string, data: string}) -> Promise<void>
machines.testCancel(testId: string) -> Promise<void>
machines.installKey(input: MachineKeyInstallInput) -> Promise<MachineKeyInstallResult>
machines.onTestEvent(cb: (e: MachineTestEvent) => void) -> Unsubscribe
# presence.ts
machines.state() -> Promise<MachineStateView[]> — []
machines.onStateChanged(cb: (states: MachineStateView[]) => void) -> Unsubscribe
machines.agents(id: string|null, fresh: boolean) -> Promise<MachineAgentsView[]> — []
machines.onAgentsChanged(cb: (views: MachineAgentsView[]) => void) -> Unsubscribe
# filesystem.ts
machines.putImage(input: MachineImagePutInput) -> Promise<MachineImagePlacement[]>
machines.listDir(input: RemoteDirListInput) -> Promise<RemoteDirListing>
machines.listTree(input: RemoteTreeListInput) -> Promise<RemoteTreeListing>
machines.listFiles(input: MachineFileListInput) -> Promise<MachineFileListResult>
machines.writeSheet(input: MachineWriteSheetInput) -> Promise<MachineConfirmSheet>
machines.allowWrites(input: MachineAllowWritesInput) -> Promise<MachineRowView>
machines.putFile(input: MachineFilePutInput) -> Promise<MachineFilePutResult>
machines.makeDir(input: MachineMakeDirInput) -> Promise<MachineMakeDirResult>
machines.renameEntry(input: MachineRenameInput) -> Promise<MachineRenameResult>
# scm.ts
machines.reviewFiles(input: MachineReviewInput) -> Promise<MachineReviewList>
machines.reviewFile(input: MachineReviewFileInput) -> Promise<MachineReviewPair>
machines.stage(input: MachineIndexWriteInput) -> Promise<MachineIndexWriteResult>
machines.unstage(input: MachineIndexWriteInput) -> Promise<MachineIndexWriteResult>
machines.commit(input: MachineCommitInput) -> Promise<MachineCommitResult>
machines.readRuns(input: MachineRunsInput) -> Promise<MachineRunsResult>
machines.readBranch(input: MachineBranchInput) -> Promise<MachineBranchResult>
machines.readHistory(input: MachineHistoryInput) -> Promise<MachineHistoryResult>
# projects.ts
machines.findProject(input: RemoteProjectFindInput) -> Promise<RemoteProjectFindResult>
machines.cloneProject(input: RemoteCloneInput) -> Promise<RemoteCloneResult>
# sessions.ts
machines.readSessionLines(input: MachineSessionLinesInput) -> Promise<MachineSessionLinesResult>
# search.ts
machines.searchContent(input: MachineSearchInput) -> Promise<MachineSearchResult>
# context.ts
machines.readContext(input: MachineContextInput) -> Promise<MachineContextResult>
```

Boot touches only `state()` and `agents(null, false)` (`subscriptions.ts:168,173`), both
voided with `catch {}`. Inert mock value for everything else: reject.

---

## notice (1)

`src/shared/ipc/sessions.ts:270`. Installed: `src/preload/sessions.ts:53`.

```
notice.pending() -> Promise<DurabilityNotice[]> — [] (drained once at boot, guarded, .then(ok, () => undefined))
```

`DurabilityNotice` is a 14-member discriminated union in `src/shared/notice.ts:334`.

---

## preview (2)

`src/shared/ipc/files.ts:250`. Installed: `src/preload/files.ts:60`.

```
preview.url(input: PreviewUrlInput) -> Promise<PreviewUrlResult> — a PreviewRefusal variant (HTML tab says "Preview is not available")
preview.stats(input: PreviewStatsInput) -> Promise<PreviewStats|null> — null
```

Shapes in `src/shared/preview-types.ts`.

---

## overview (5)

`src/shared/ipc/overview.ts:70`. Installed: `src/preload/overview.ts:28`.

```
overview.project(input: {projectPath: string}) -> Promise<OverviewProject> — good demo fixture
overview.sessions(input: {projectPath, sessionIds: string[], turnLimit?: number}) -> Promise<OverviewProject>
overview.foldOptions() -> Promise<FoldOptions> — {harnesses: [], suggestedAgentId: null, suspended: null}
overview.timeline(sessionId: string) -> Promise<OverviewTimeline> — {sessionId, entries: [], chosen: false, modelChanged: false}
overview.timelineTurns(input: {sessionId, fromTurn, toTurn}) -> Promise<OverviewTurnView[]> — []
```

### Full shapes (`src/shared/overview.ts`)

```ts
OverviewProject {
  projectPath: string;
  projectName: string;
  readAt: number;                              // epoch ms
  isGitRepo: boolean;
  sessions: OverviewSessionView[];
  reads: Record<string, 'full'|'tail'|'suffix'|'none'|'skipped'>;  // diagnostics, never drawn
}

OverviewSessionView {
  sessionId: string;
  name: string;
  agent: string;                               // registry id, or 'shell'
  agentLabel: string;                          // registry displayName
  model: string | null;
  branch: string | null;
  line: 'turns'|'no-turns'|'shell'|'no-store'|'unreadable'|'wrong-conversation'|'remote';
  lineDetail: string | null;                   // shown verbatim for unreadable/wrong-conversation
  askOnly: boolean;                            // gemini
  noTurnClock: boolean;                        // deepseek
  startedAt: number;                           // manifest createdAt, epoch ms
  lastTouchedAt: number | null;
  turns: OverviewTurnView[];                   // ascending index, newest LAST
  summary: string | null;                      // filled ONLY on overview:project
  summaryWrittenAt: number | null;             // null whenever summary is null
}

OverviewTurnView {
  index: number;
  askText: string;            askClipped: boolean;    askAt: string | null;   // ISO 8601
  answerText: string | null;  answerClipped: boolean; answerAt: string | null;
  closed: boolean;  interrupted: boolean;
  notice: string | null;                       // the CLI's own notice, never the agent's words
  git: 'agrees' | 'no-record' | 'nothing-to-check';
  namedOnlyOutside: boolean;
}

OverviewTimelineEntry { text, writtenAt: number, fromTurn: number, toTurn: number,
                        harness: string, model: string, repeated: boolean, gapBefore: boolean }
OverviewTimeline { sessionId, entries: OverviewTimelineEntry[], chosen: boolean, modelChanged: boolean }
```

`FoldOptions` (`src/shared/fold.ts:47`):
`{harnesses: FoldHarnessOption[], suggestedAgentId: string|null, suspended: string|null}`.

---

## arch (7)

`src/shared/ipc/arch.ts:309`. Installed: `src/preload/arch.ts:32`.
Whole object optional (`src/renderer/arch/bridge.ts:30`).

```
arch.load(input: {cwd: string}) -> Promise<ArchLoadResult> — present:false empty state (below)
arch.check(input: {cwd}) -> Promise<ArchCheckResult> — reject
arch.skeleton(input: {cwd}) -> Promise<ArchSkeletonResult> — {cwd, files: [], note: ''}
arch.composePayload(input: ArchComposePayloadInput) -> Promise<ArchComposePayloadResult> — reject
arch.modules(input: ArchModulesInput) -> Promise<ArchModulesResult> — reject
arch.onChecked(cb: (e: ArchCheckedEvent) => void) -> Unsubscribe — () => {}
arch.onProgress(cb: (p: ArchProgressEvent) => void) -> Unsubscribe — () => {}
```

Inert `arch.load`:
`{cwd, present:false, contract:null, components:[], edges:[], baseline:{...}, problems:[], lastValid:false, verdicts:[], freshness:[], counts:{...}, checkedAtCommit:null, narratedAtCommit:null}`.
`present: false` is the *teaching empty state*, not an error — that is the right inert
answer. Shapes in `src/shared/arch.ts` and `src/shared/ipc/arch-modules.ts`.

---

## actions (5)

`src/shared/ipc/actions.ts:41`. Installed: `src/preload/actions.ts:16`.

```
actions.runs(input: ActionsRunsInput) -> Promise<ActionsUpdate> — see shape
actions.jobs(input: ActionsJobsInput) -> Promise<ActionsJobsResult> — reject
actions.observe(repoPath: string) -> Promise<void> — Promise.resolve()
actions.release(repoPath: string) -> Promise<void> — Promise.resolve()
actions.onChanged(cb: (u: ActionsUpdate) => void) -> Unsubscribe — () => {}
```

`ActionsUpdate` (`src/shared/actions.ts:110`):
`{repoPath, branch: string|null, ownerRepo: string|null, runs: ActionsRun[], lastCheckedAt: number|null, health: ActionsHealth, watch: ActionsWatchView, issues: ActionsParseIssue[]}`.

---

## log (5)

`src/shared/ipc/log.ts:45`. Installed: `src/preload/log.ts:20`.
First thing touched at boot (`src/renderer/main.tsx:14`) but fully guarded — safe to omit.

```
log.append(line: {level: 'error'|'warn'|'info'|'debug', scope: 'renderer'|'settings', msg: string, fields?: Record<string, unknown>}) -> Promise<void> — Promise.resolve()
log.level() -> Promise<LogLevel> — 'info'
log.setLevel(level: LogLevel) -> Promise<void> — Promise.resolve()
log.openFolder() -> Promise<void> — Promise.resolve()
log.diagnostics() -> Promise<string> — 'demo build'
```

---

## updates (5)

`src/shared/ipc/app.ts:756`. Installed inline: `src/preload/index.ts:112`.
`src/renderer/app/UpdateRing.tsx:127` returns `null` (no ring) unless `state`, `onChanged`
and top-level `popupMenu` are all present — so omit the object for a clean demo.

```
updates.state() -> Promise<UpdateUiState> — see shape
updates.restartNow() -> Promise<void> — Promise.resolve()
updates.whyFailed() -> Promise<void> — Promise.resolve()
updates.repair() -> Promise<void> — Promise.resolve()
updates.onChanged(cb: (s: UpdateUiState) => void) -> Unsubscribe — () => {}
```

`UpdateUiState` (`app.ts:687`):
`{currentVersion: string, stagedVersion: string|null, lastCheckedAt: number|null, needsUpdateRepair: boolean, ring: 'hidden'|'checking'|'downloading'|'staging'|'ready'|'failed', ringVersion: string|null, ringPercent: number|null, failedDuring: 'checking'|'downloading'|'staging'|null}`.
Inert:
`{currentVersion:'0.0.0-demo', stagedVersion:null, lastCheckedAt:null, needsUpdateRepair:false, ring:'hidden', ringVersion:null, ringPercent:null, failedDuring:null}`.

---

## meta (2 properties, not functions)

`src/shared/ipc/base.ts:177-181`. Installed: `src/preload/index.ts:120`.

```
meta.platform: HostPlatform — 'darwin'
meta.versions: {electron: string, chrome: string, node: string} — {electron:'0', chrome:'0', node:'0'}
```

See [§4](#4-what-reads-gmuxmeta) — **nothing in the renderer reads this.**

---

## Top-level functions (26)

```
pathForFile(file: File) -> string                                   [SYNC] — '' (guarded, terminal/drop/acquire.ts:39)
agentAvailability() -> Promise<{claude: boolean, codex: boolean}>    — {claude:true, codex:true}
agentsList() -> Promise<AgentsScanResult>                            — {agents: [...], scannedAt: Date.now()}
agentsRescan() -> Promise<AgentsScanResult>                          — same as agentsList
agentMultilineKeys() -> Promise<MultilineKeyTable>                   — {agents:{}, fallback:{sequence:'\n', verified:false}}
popupMenu(input: {x: number, y: number, items: PopupMenuItem[]}) -> Promise<string|null> — OMIT (DOM fallback menu is used)
setSessionsPosition(position: 'top'|'right') -> Promise<void>         — Promise.resolve()
setProjectsPosition(position: 'top'|'left') -> Promise<void>          — Promise.resolve()
onQuitRequested(cb: () => void) -> Unsubscribe                        — () => {}   [no payload]
quit() -> Promise<void>                                               — Promise.resolve()
getLoginItem() -> Promise<{openAtLogin: boolean}>                     — {openAtLogin:false}
setLoginItem(openAtLogin: boolean) -> Promise<{openAtLogin: boolean}>  — {openAtLogin}
onMenuAction(cb: (action: MenuActionWithFind) => void) -> Unsubscribe  — () => {}
onActivityChanged(cb: (updates: SessionActivityInfo[]) => void) -> Unsubscribe — () => {}
noteTerminalInput(sessionId: string) -> Promise<void>                 — Promise.resolve()
settingsGet() -> Promise<GmuxSettings>                                — defaultGmuxSettings() (see §1)
settingsSet(patch: Partial<GmuxSettings>) -> Promise<GmuxSettings>     — merge into a module-level object and return it
openSettings() -> Promise<void>                                       — Promise.resolve()
agentFlagPresets() -> Promise<AgentFlagCatalogs>                      — {}
onSettingsChanged(cb: (settings: GmuxSettings) => void) -> Unsubscribe  — keep the cb and call it from settingsSet
onPowerResume(cb: () => void) -> Unsubscribe                           — () => {}   [no payload]
contextSnapshot(sessionId: string) -> Promise<ContextSnapshot|null>     — null
shellCommandStatus() -> Promise<ShellCommandStatus>                     — {state:'not-installed', target:'/usr/local/bin/tortie'}
installShellCommand() -> Promise<ShellCommandStatus>                    — {state:'installed', target:'/usr/local/bin/tortie'}
removeShellCommand() -> Promise<ShellCommandStatus>                     — {state:'not-installed', target:'/usr/local/bin/tortie'}
takePendingOpen() -> Promise<{folder: string, file: string|null}|null>  — null
```

`SessionActivityInfo` (`src/shared/ipc/sessions.ts:170`) — this is the channel that carries
per-session excerpts and ages, **not** `sessions.onChanged`:

```ts
{ sessionId: string; excerpt?: string; lastActivityAt?: number;
  handback?: { state: 'none'|'left'|'returning'|'unconfirmed'; leftAt?: number } }
```

An absent field means "no news"; the renderer keeps what it had.

`MenuActionWithFind` (`app.ts:589`) is a large union: the 16 `MenuActionId` literals plus
`'show-explorer'|'show-scm'|'sessions-top'|'sessions-right'|'new-project'|'quick-open'|'show-search'|'go-to-symbol'|'toggle-editor-fill'|'toggle-session-focus'|'clone-repository'|'past-sessions'|'show-context'|'show-overview'|'show-arch'|'arch-aim'|'shell-open-pending'|'open-remote-project'|'projects-top'|'projects-left'`
plus four template families: `` `launch-agent:${id}` ``, `` `focus-session:${id}` ``,
`` `open-recent:${path}` ``, `` `open-recent-on:${machineId}:${path}` ``. A demo mock can
drive the UI by calling the stored callback with e.g. `'show-search'`.

`PopupMenuItem` (`app.ts:209`):
`{id, label, enabled?, destructive?, hint?, sublabel?, icon?: {dataUrl, template}, type?: 'item'|'separator', submenu?: PopupMenuItem[]}`.

---

# Reference answers

## 1. `GmuxSettings` and the reusable default

**File:** `src/shared/settings.ts:19-107`. Exact shape:

```ts
interface GmuxSettings {
  defaultAgent: LaunchableAgentKind;                          // 'claude' out of the box; 'shell' allowed
  hotkeys: Partial<Record<LaunchableAgentId, string>>;         // Electron accelerator strings, e.g. "Cmd+Shift+C"
  launchDefaults: Partial<Record<LaunchableAgentId, string[]>>;
  dangerAcknowledged: string[];                                // "<agentId> <flag>" keys
  captureDefaults: Partial<Record<LaunchableAgentId, boolean>>;
  scrollbackLines: number;                                     // 1_000 … 100_000
  savedScrollbackLines: number;                                // 500 … 25_000
  highlightScheme: 'blue' | 'teal' | 'purple' | 'slate';
  contrastLevel: 'normal' | 'raised' | 'high';
  workAreaFont: 'system' | 'jetbrains-mono' | 'source-code-pro';
  fold: { agentId: string | null; model: string | null };
}
```

**Reuse the exported factory — do not hand-write the defaults:**
`defaultGmuxSettings(): GmuxSettings` at `src/shared/settings.ts:282`. It returns

```js
{ defaultAgent: 'claude', hotkeys: {}, launchDefaults: {}, dangerAcknowledged: [],
  captureDefaults: {}, scrollbackLines: 25_000, savedScrollbackLines: 10_000,
  highlightScheme: 'blue', contrastLevel: 'normal', workAreaFont: 'system',
  fold: noFoldChosen() }
```

Other reusable constants in the same file: `DEFAULT_HIGHLIGHT_SCHEME`,
`DEFAULT_CONTRAST_LEVEL`, `DEFAULT_WORK_AREA_FONT`, `DEFAULT_SCROLLBACK_LINES` (25 000),
`DEFAULT_SAVED_SCROLLBACK_LINES` (10 000), `MIN`/`MAX_SCROLLBACK_LINES`, `noFoldChosen()`,
and the sanitizers.

`GmuxSettingsPatch = Partial<GmuxSettings>` (shallow — present keys replace wholesale).
`settingsSet` must resolve the **full post-patch settings**, and the theme layer
(`src/renderer/theme/apply.ts:203`) plus the settings store
(`src/renderer/settings/settings-store.ts:159`) both subscribe to `onSettingsChanged`
expecting the full object.

Simplest correct mock: keep one module-level `settings` object, have `settingsSet` merge and
then invoke every registered `onSettingsChanged` callback with the merged result. That makes
the appearance controls (highlight scheme, contrast, work-area font) genuinely work in the
demo, since they are pure CSS-token derivations in the renderer.

## 2. Terminal attach flow, end to end

Everything is one `useEffect` in `src/renderer/terminal/TerminalPane.tsx:206`, guarded by
`if (!container || restorable) return;` (a `'restorable'` session never attaches) and
`if (!gmux) { setOverlay('Terminal bridge unavailable'); return; }`.

**Synchronous phase, in order:**

1. `:235` `agentMultilineKeys()` primed (guarded, catch swallowed).
2. `:237` `new Terminal(...)`; addons (`FitAddon`, `WebLinksAddon`); `new ScrollSurface(sessionId, term)`.
3. `:346` `term.onData(d => { …; noteTerminalInput(sessionId); scroll.sendInput(d) })` — xterm keystrokes.
4. `:358` `term.onResize(({cols, rows}) => void gmux.sessions.resize({sessionId, cols, rows}).catch(() => {}))`.
5. `:366` `const extras = gmux.term;` then `const ack = typeof extras.ack === 'function' ? extras.ack.bind(extras) : null;`
6. `:369` **`gmux.term.onData(sessionId, cb)`** — subscribed **before** attach. The code
   comment at `:364` states the reason: "subscribe BEFORE attach so the initial redraw burst
   is never missed."
7. `:377` `extras.onExit(sessionId, cb)` if present.
8. `:394` `gmux.sessions.onStatusChanged(cb)` — the no-extras fallback for exit.

**Async phase (`:440-495`):**

9. `await document.fonts?.ready` → `term.open(container)` → WebGL addon → `doFit()`.
10. `:481` **`await gmux.sessions.attach(sessionId)`** — inside `try/catch`; a rejection
    becomes an overlay via `friendlyAttachError` (this is where `TMUX_VERSION_MISMATCH`
    surfaces, `:128`), never a boot block.
11. `:483` `doFit()` again, then `:484`
    `void gmux.sessions.resize({sessionId, cols: term.cols, rows: term.rows}).catch(() => undefined)`
    — pushes the real size even if fit produced the 80×24 default.
12. `:490` `term.focus()` if focused; `:492` `scroll.start()` (no-op when `gmux.scroll` is absent).

**So the invoke order is `sessions.attach(id)` → `sessions.resize({id, cols, rows})`, with
`term.onData` subscribed strictly before both.** The mock should not start emitting bytes
until `attach` is called, and it can emit the first burst synchronously inside `attach` —
the listener is already there.

**`term.onData` payload: a real `Uint8Array`.** `TerminalPane.tsx:369-372`:

```js
gmux.term.onData(sessionId, (chunk) => {
  const bytes = chunk.byteLength;
  term.write(chunk, ack ? () => ack(sessionId, bytes) : undefined);
});
```

Bytes go straight into xterm undecoded — xterm's own UTF-8 decoder handles them. Use
`new TextEncoder().encode(ansiString)` in fixtures. A plain string would still render, but
`chunk.byteLength` would be `undefined`.

**Ack / flow control.** `ack(sessionId: string, bytes: number): void` — **synchronous,
returns void**, sent as a fire-and-forget `ipcRenderer.send` in the real preload. It is
called **once per chunk, from xterm's `write` completion callback**, with that chunk's
`byteLength`. There is **no threshold, batching, or debounce in the renderer** — the window
logic lives in main (pause the PTY above 256 KB unacked, resume under 64 KB; if no ack ever
arrives the attach host disables flow control for that client after a grace period rather
than deadlocking). **Omit `ack` from the mock**: `ack` becomes `null` and `term.write(chunk)`
is called with no callback.

**`TermExitPayload`** = `{sessionId: string, exitCode: number, signal?: number}`
(`src/shared/ipc/terminal.ts:35`). `onExit` sets a local overlay only — no bridge call, no
store write: `"This session has ended"` when `exitCode === 0`, otherwise
`"This session ended unexpectedly"` with detail `connection closed (code N)`, and a
"Reconnect" action that clears the overlay and re-runs the whole mount effect. Omitting
`onExit` is fine; `sessions.onStatusChanged` with `'exited'` produces the same overlay.

**Input path:** `term.sendInput(sessionId: string, data: string): void` — **synchronous**.
With no `gmux.scroll` on the mock, `src/renderer/terminal/scroll/surface.ts:260` takes the
direct branch and every keystroke lands in `gmux.term.sendInput` immediately.

## 3. `bootBlock` / tmux check

**There is no tmux-check bridge member.** The block screen is decided entirely by the
**rejection shape** of `Promise.all([gmux.projects.list(), gmux.sessions.list()])` at
`src/renderer/state/subscriptions.ts:113-116`.

`errorPayload()` (`src/renderer/state/errors.ts:10`) finds the first `{` in the rejection's
`.message`, `JSON.parse`s from there, and the result is looked up in `BOOT_BLOCK_BY_CODE`
(`subscriptions.ts:278`):

```
TMUX_NOT_FOUND          -> 'tmux-missing'
TMUX_BUNDLE_INCOMPLETE  -> 'tmux-bundle-incomplete'
TMUX_VERSION_UNTESTED   -> 'tmux-version-blocked'
```

`src/renderer/app/App.tsx:255` then renders `TmuxMissing` / `TmuxBundleIncomplete` /
`TmuxVersionBlocked` from `src/renderer/app/EmptyStates.tsx:417/445/477` instead of the shell.

**"All good" is simply: both `projects.list()` and `sessions.list()` resolve.** There is no
positive value to return. Any *other* rejection is not a block — it sets `ready: true` and
raises a sticky error toast. `TMUX_VERSION_MISMATCH` is deliberately **not** a boot block; it
only appears in the terminal attach-error mapper (`TerminalPane.tsx:128`).

Second gate: `App.tsx:281` renders `<FirstRun />` rather than the shell when
`projects.length === 0`. **For a marketing demo the fixture needs at least one `Project`** or
the screenshot is the empty first-run screen.

## 4. What reads `gmux.meta`

**Nothing.** A thorough grep of `src/renderer` for `gmux.meta`, `meta.platform`,
`meta.versions`, `HostPlatform`, and `'darwin'` returned zero hits. The only producer is
`src/preload/index.ts:120-127`; the only other mention is the type at
`src/shared/ipc/base.ts:177`.

macOS-specific renderer behaviour keys off `event.metaKey` and the `⌘` glyph table in
`@shared/keymap`, **not** off `meta.platform`. So the mock can omit `meta` entirely, or stub
`{platform:'darwin', versions:{electron:'0', chrome:'0', node:'0'}}` purely to satisfy the
type. Nothing breaks on a non-darwin value.

## 5. Members that MUST resolve vs. members safe to omit

**Must exist and must resolve** (absence or rejection breaks the shell):

| Member | Why |
|---|---|
| `projects.list()` | awaited in the boot `Promise.all`; a rejection carrying a tmux code shows a block screen, any other rejection shows a sticky error toast and `FirstRun` |
| `sessions.list()` | same `Promise.all` |
| `sessions.onChanged(cb)` | `subscriptions.ts:681` — **no guard, no try/catch**. Missing → `TypeError` → rejects `bootApp()`, which `App.tsx:213` voids with no `.catch` → unhandled rejection, **no subscriptions attach at all**, and `migrateLegacyLayouts` never runs |
| `sessions.onStatusChanged(cb)` | `subscriptions.ts:684` — same, no guard |
| `git.onChanged(cb)` | `src/renderer/state/repo-changed.ts:102` — **no guard**. The default sidebar view is `'scm'` (`src/renderer/state/sidebar-views.ts:67`), so this fires on the **first render of the normal shell**. A missing `git` object → `TypeError` in a mount effect → the whole window is replaced by `ErrorBoundary`'s "Reload" block |
| `sessions` and `projects` must be **objects** | `subscriptions.ts:264` reads `gmux.sessions` unguarded inside an `async` function, where the outer `try/catch` cannot see the throw |
| `term.onData`, `term.sendInput` | `TerminalPane.tsx:369` and `scroll/surface.ts:265` — **not feature-detected**. Needed the moment a terminal pane mounts |
| `sessions.attach`, `sessions.resize` | `TerminalPane.tsx:359, 481, 484`. `attach` is inside `try/catch` (→ overlay), `resize` is `.catch`ed — so these two need only to *exist*, not to succeed |
| `fs.readFile`, `fs.readDir`, `git.status` | not boot-critical, but the Explorer and SCM views are empty without them |

**Three specific traps beyond the table:**

- `{scrollback: {}}` throws — `subscriptions.ts:704` is `scrollbackExtras?.onNotice(...)`,
  and the `?.` guards the object, not the method. Provide `onNotice` or omit `scrollback`
  entirely.
- `src/renderer/tree/ignored.ts:316` is `gmux?.git.checkIgnore` — the `?.` short-circuits on
  `gmux` only; `.git` is a hard dereference. Another reason `git` must be an object.
- `TerminalPane.tsx:366` `const extras = gmux.term;` throws before the `typeof extras.ack`
  check if `term` is missing.

**Safe to omit entirely** (all feature-detected with `typeof x === 'function'` or a
whole-object `?.`): `log`, `settingsGet`/`settingsSet`/`onSettingsChanged`/`openSettings`/`agentFlagPresets`,
`agentsList`/`agentsRescan`/`agentAvailability`/`agentMultilineKeys`, `config`, `overview`,
`onMenuAction`, `onQuitRequested`/`quit`, `machines` (all 40), `notice`, `specstory`,
`onActivityChanged`/`noteTerminalInput`, `takePendingOpen`/`shellCommandStatus`/`installShellCommand`/`removeShellCommand`,
`sessions.shellPathReady`, `updates`, `popupMenu`, `getLoginItem`/`setLoginItem`,
`onPowerResume`, `scroll`, `term.ack`, `term.onExit`, `recents`, `symbols`, `quickOpen`,
`search`, `actions`, `arch`, `context`, `contextSnapshot`, `preview`, `pathForFile`, `drop`,
`meta`, and every `git`/`fs`/`projects`/`sessions` method beyond the ones listed as required.

## 6. Minimum non-crashing surface

```js
window.gmux = {
  projects: { list: async () => [/* >=1 Project or you get FirstRun */], add, remove, pickDirectory },
  sessions: {
    list: async () => [/* Session[] */],
    attach: async () => {}, resize: async () => {}, kill, create, rename, detach,
    onChanged: (cb) => () => {},
    onStatusChanged: (cb) => () => {}
  },
  term: { onData: (id, cb) => () => {}, sendInput: (id, s) => {} },
  git:  { onChanged: (cb) => () => {},
          status: async () => ({ repoPath, ahead: 0, behind: 0, merging: false, files: [], isRepo: true }) },
  fs:   { readFile, writeFile, readDir }
};
```

Everything else degrades silently by design. Build outward from this and add fixtures per
surface as the demo needs them.
