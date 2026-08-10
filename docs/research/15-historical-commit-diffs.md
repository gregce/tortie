# 15 — Historical commit diffs (Phase 12 item 4): diagnosis + fix plan

Read-only source diagnosis of the BACKLOG Phase 12 item 4 bug ("viewing a diff
from a past commit in history does not show the correct diff"), plus the
minimal correct fix. Every git incantation below was verified live against
git 2.50.1 in a throwaway repo (root commit, add, modify, delete, rename,
merge). VS Code's semantics were verified against the current
`microsoft/vscode` `extensions/git` source (`historyProvider.ts`,
`uri.ts`).

---

## 1. What actually happens today (the trace)

1. **History row click / "Open Changes"** —
   `src/renderer/scm/HistorySection.tsx:329-345` (`openCommitFile`):

   ```ts
   requestOpenFile({
     repoPath,
     relPath: file.path,
     path: `${repoPath}/${file.path}`,
     mode: 'diff',
     source: 'history'
   });
   ```

   The commit SHA is **not** in the payload. `file.origPath` (rename) and
   `file.status` are dropped too. `status === 'D'` is short-circuited with a
   toast and never opens at all (lines 331-334).

2. **The bus** — `src/renderer/state/open-file.ts:17-36`. `OpenFileRequest`
   has no commit field; `source: 'history'` is the only trace of provenance
   and its own doc comment says "Safe to ignore in v1".

3. **The editor store** — `src/renderer/editor/store.ts:240-295`
   (`openFromRequest`) **ignores `req.source` entirely**:

   - line 242: `tabs.find((t) => t.path === req.path)` — tab identity is the
     absolute working-tree path, so a history open of an already-open file
     just re-activates the worktree tab.
   - line 293: `loadContents(req.path)` → `gmux.fs.readFile(absPath)` — the
     **working-tree** bytes.
   - line 294: `loadHead(req.path)` → `gmux.git.showHead({repoPath, path:
     relPath})` (store.ts:139-156) → `git:showHead` (main/git/ipc.ts:203-209)
     → `GitService.showHeadBuffer` (main/git/service.ts:148-164), which hard-
     codes `git show HEAD:<rel>`.

4. **The renderer** — `src/renderer/editor/PierreDiff.tsx:96-111`:
   `oldFile.contents = tab.headContents` (HEAD), `newFile.contents =
   workingText` (Monaco model or last on-disk read, line 72).

### The precise defect

> **Opening a file from a historical commit renders `HEAD:<path>` vs the
> working tree — the same pair as clicking that file in Changes — because the
> commit SHA is dropped at `HistorySection.tsx:336-342` and the editor store
> has exactly one loading path (`store.ts:293-294`).**

Observable consequences, all reproducible:

| Case | What gmux shows | What VS Code shows |
|---|---|---|
| File unchanged since HEAD | PierreDiff "No changes" empty state (`PierreDiff.tsx:138`) | the commit's real hunks |
| File changed later | HEAD→worktree diff of unrelated edits | parent→commit hunks |
| File added in that commit | HEAD→worktree (usually "No changes") | empty → commit content |
| File deleted in that commit | never opens (toast, `HistorySection.tsx:331`) | content → empty |
| File renamed in that commit | new path vs HEAD; the old path is never read | `parent:<old>` → `commit:<new>` |
| File deleted/renamed away since | `fs.readFile` rejects → "Could not open this file" | opens fine (history is immutable) |
| Merge commit | HEAD vs worktree | first-parent diff |

The file **list** under an expanded commit is already correct:
`GitService.commitDetail` (`main/git/service.ts:434-489`) runs
`git show <sha> -z --name-status --format= --diff-merges=first-parent --`,
which is root-commit-safe and first-parent-correct. Only the *content pair*
is wrong. (One robustness gap — see §4.5 — it omits an explicit `-M`.)

Two more latent hazards the fix must not walk into:

- `PierreDiff.tsx:51,55` reads `getWorkingModel(tab.path)`. A commit tab keyed
  by the same path would silently pick up the **live Monaco buffer** of the
  worktree tab as its "new" side.
- `store.ts:271-273, 320-322` call `disposeModels(path)` / `dropViewState(path)`.
  Closing a commit tab for a path that is also open as a worktree tab would
  dispose the *worktree* tab's model and lose unsaved edits.
- `refreshRepoTabs` (`store.ts:162-213`) re-reads disk + HEAD on every
  `git:changed`; commit contents are immutable and must be skipped.
- `save()` (`store.ts:372-387`) writes `tab.path` — a commit tab must never
  reach it.

---

## 2. VS Code's semantics (verified)

`extensions/git/src/historyProvider.ts` → `provideHistoryItemChanges`:

```ts
historyItemParentId = historyItemParentId ?? await this.repository.getEmptyTree();
… toMultiFileDiffEditorUris(change, historyItemParentId, historyItemId)
```

`extensions/git/src/uri.ts` → `toMultiFileDiffEditorUris(change, originalRef, modifiedRef)`:

- `INDEX_ADDED` → `originalUri: undefined`, `modifiedUri: git(uri, modifiedRef)`
- `DELETED` → `originalUri: git(uri, originalRef)`, `modifiedUri: undefined`
- `INDEX_RENAMED` → `originalUri: git(change.originalUri, originalRef)`,
  `modifiedUri: git(change.uri, modifiedRef)`
- default → both sides, same path

So: **LEFT = first parent (empty tree for a root commit), RIGHT = the commit**,
with the *old* path on the left for renames, and a genuinely absent side for
add/delete. `@pierre/diffs` supports this natively — `DiffFileInput`
(`node_modules/@pierre/diffs/dist/types.d.ts:38-47`) is
`{oldFile, newFile} | {oldFile: null, newFile} | {oldFile, newFile: null}`.
Pass `null`, not `''`.

---

## 3. Git plumbing — verified behaviours

| Need | Command | Verified result |
|---|---|---|
| Parent of a commit | `git rev-parse --verify --quiet <sha>^1` | prints full parent sha, exit 0; **empty + exit 1 on a root commit**; works with abbreviated shas; on a merge returns the FIRST parent |
| File list (already used) | `git show <sha> -z --name-status -M --format= --diff-merges=first-parent --` | root commit → `A` entries; merge → first-parent only; rename → `R100\0old\0new\0` |
| File list (alternative) | `git diff-tree --no-commit-id --name-status -r -M -z --diff-merges=first-parent <sha>` | identical `-z` shape; **needs `--root`** to emit anything for a root commit |
| Left content | `git show <parent>:<path>` | raw blob bytes |
| Right content | `git show <sha>:<path>` | raw blob bytes |
| Missing path | `git show <sha>:<nope>` | `fatal: path 'nope' does not exist in '<sha>'`, exit 128 |
| Root commit parent | `git show <root>^:<path>` | `fatal: invalid object name '<root>^'` — **never use `^` unguarded** |

Traps found while verifying:

- **`-m --first-parent` is wrong for merges.** On a merge,
  `git diff-tree --no-commit-id --name-status -r -M -m --first-parent <merge>`
  emitted the union of both parents' diffs (3 files where only 1 changed vs
  the first parent). The correct flag is `--diff-merges=first-parent`
  (plain `diff-tree` without it prints nothing for a merge).
- **`<rev>:<path>` is repo-top-level relative**, not cwd relative, unless it
  starts with `./`. `assertRelPath` already strips `./`, and porcelain-v2 /
  name-status paths are also top-level relative, so the existing convention is
  self-consistent. (Separately: `${repoPath}/${relPath}` in the renderer is
  only right when the project folder *is* the git top level — pre-existing,
  out of scope here.)
- **Rename detection depends on the user's `diff.renames`.** With
  `-c diff.renames=false` the rename in the test repo degraded to `D keep.txt`
  + `A renamed.txt`; adding `-M` restored `R100 keep.txt renamed.txt`.
- `git show <sha>:<dir>` prints a *tree listing*, not an error. Only call it
  for blob paths (name-status output guarantees this except for gitlinks).

---

## 4. The fix

### 4.1 Shared types (`src/shared/types.ts`, append)

```ts
export interface GitCommitFileDiffInput {
  repoPath: string;
  /** Commit whose change to render (full or abbreviated sha). */
  sha: string;
  /** New-side path relative to the repo root (GitCommitFileChange.path). */
  path: string;
  /** Old-side path when the commit renamed/copied it. */
  origPath?: string;
  /** Status letter from GitCommitFileChange — decides which sides exist. */
  status: GitCommitFileState;
}

/** The exact pair VS Code renders for one file of one commit. */
export interface GitCommitFileDiff {
  /** Full sha of the commit (input may have been abbreviated). */
  sha: string;
  /** First parent's full sha; null for a root commit. */
  parentSha: string | null;
  /** Parent-side path; null when the commit ADDED the file. */
  oldPath: string | null;
  /** Commit-side path; null when the commit DELETED the file. */
  newPath: string | null;
  /** UTF-8 contents at the parent; null when there is no old side. */
  oldContents: string | null;
  /** UTF-8 contents at the commit; null when there is no new side. */
  newContents: string | null;
  /** Either side is binary — the renderer shows a notice, not text. */
  binary: boolean;
}
```

### 4.2 IPC (`src/shared/ipc.ts`)

Append **into the existing `GitDepthInvokeChannelMap`** (~line 600) — no new
superset alias is needed, because `DepthInvokeChannelMap ⊂ RegistryInvokeChannelMap
⊂ GmuxInvokeChannelMap`, so the single preload wrapper and `depth-ipc.ts`'s
existing typed `handle()` both pick it up for free (standing guardrail 1):

```ts
  /** Parent→commit content pair for ONE file of ONE commit (VS Code
   *  semantics: null side for pure add/delete, old path for renames,
   *  first parent for merges, empty left for root commits). */
  'git:commitFileDiff': {
    req: [input: GitCommitFileDiffInput];
    res: GitCommitFileDiff;
  };
```

and one line in `GmuxGitDepthExtras` (~line 631):

```ts
  commitFileDiff?(input: GitCommitFileDiffInput): Promise<GitCommitFileDiff>;
```

### 4.3 Preload (`src/preload/index.ts`, in the existing `git` object ~line 135)

```ts
  commitFileDiff: (input) => invoke('git:commitFileDiff', input),
```

### 4.4 Main handler (`src/main/git/depth-ipc.ts`, beside `git:commitDetail`)

```ts
  handle(ipc, 'git:commitFileDiff', (_e, input) =>
    svcFor(input.repoPath).commitFileDiff(input)
  );
```

Read-only — no `deps.broadcast`.

### 4.5 GitService (`src/main/git/service.ts`)

**(a) Generalize the existing blob reader instead of adding a second one**
(guardrail 3). `showHeadBuffer` (lines 148-164) becomes a thin caller:

```ts
/** Contents of `path` at `ref` as raw bytes; null when the path is absent
 *  there (added/deleted/unborn/non-repo). */
async showAtRefBuffer(ref: string, path: string): Promise<Buffer | null> {
  const rel = this.assertRelPath(path);
  const rev = ref === 'HEAD' ? 'HEAD' : this.assertSha(ref);
  const r = await runGit(this.repoPath, ['show', `${rev}:${rel}`]);
  if (r.code === 0) return r.stdout;
  if (MISSING_IN_REV_RE.test(r.stderr) || UNBORN_HEAD_RE.test(r.stderr) ||
      NOT_A_REPO_RE.test(r.stderr)) return null;
  throw gmuxError('GIT_FAILED', 'Could not read the file at that commit.',
                  r.stderr.trim() || undefined);
}

async showHeadBuffer(path: string): Promise<Buffer | null> {
  return this.showAtRefBuffer('HEAD', path);
}
```

`MISSING_AT_HEAD_RE` (line 45) is HEAD-specific — its `does not exist in` arm
requires a literal `HEAD` after it, so it will **not** match
`fatal: path 'x' does not exist in '<sha>'`. Widen it (keep the old name as a
caller or replace both uses):

```ts
const MISSING_IN_REV_RE =
  /does not exist in|exists on disk, but not in|invalid object name|unknown revision|bad revision/i;
```

**(b) First parent:**

```ts
/** First parent of `sha`; null for a root commit. */
async firstParent(sha: string): Promise<string | null> {
  const ref = this.assertSha(sha);
  const r = await runGit(this.repoPath, [
    'rev-parse', '--verify', '--quiet', `${ref}^1`
  ]);
  const out = r.stdout.toString('utf8').trim();
  return r.code === 0 && out.length > 0 ? out : null;
}
```

**(c) The pair:**

```ts
async commitFileDiff(input: GitCommitFileDiffInput): Promise<GitCommitFileDiff> {
  const ref = this.assertSha(input.sha);
  const sha = (await runGitOrThrow(this.repoPath, ['rev-parse', ref],
    'Could not read the commit.')).stdout.toString('utf8').trim();
  const parentSha = await this.firstParent(sha);

  const isAdd    = input.status === 'A';
  const isDelete = input.status === 'D';
  const oldPath  = isAdd    ? null : (input.origPath ?? input.path);
  const newPath  = isDelete ? null : input.path;

  const [oldBuf, newBuf] = await Promise.all([
    oldPath !== null && parentSha !== null
      ? this.showAtRefBuffer(parentSha, oldPath) : Promise.resolve(null),
    newPath !== null ? this.showAtRefBuffer(sha, newPath) : Promise.resolve(null)
  ]);

  const binary = isBinary(oldBuf) || isBinary(newBuf);
  return {
    sha, parentSha,
    oldPath: oldBuf === null ? null : oldPath,
    newPath: newBuf === null ? null : newPath,
    oldContents: binary || oldBuf === null ? null : oldBuf.toString('utf8'),
    newContents: binary || newBuf === null ? null : newBuf.toString('utf8'),
    binary
  };
}
```

Notes:
- `parentSha === null` (root commit) collapses the left side to "nothing" —
  exactly VS Code's empty tree, without needing the
  `4b825dc6…` constant (which differs under SHA-256 repos anyway).
- Trust the caller's `status`/`origPath` only as a hint: a `null` buffer is
  the authority for which side exists, so a stale status letter degrades to
  a correct add/delete rather than a wrong diff.
- `isBinary(buf)` = `buf.subarray(0, 8000).includes(0)` (git's own
  heuristic). This is a genuine improvement over the worktree path, which
  currently renders binary bytes as mojibake.

**(d) One-line robustness fix in `commitDetail` (lines 456-464):** add `-M` to
`showArgs` so rename pairing does not depend on the user's `diff.renames`:

```ts
const showArgs = (mode: string): string[] =>
  ['show', ref, '-z', mode, '-M', '--format=', '--diff-merges=first-parent', '--'];
```

Both the `--name-status` and `--numstat` calls go through it, so
`mergeCommitFiles` keys stay aligned.

### 4.6 The bus (`src/renderer/state/open-file.ts`)

Add ONE optional field — every existing emitter keeps compiling:

```ts
export interface OpenFileRequest {
  …
  /** Present when the gesture came from a commit in HISTORY: the editor
   *  loads parent→commit instead of HEAD→worktree. */
  commit?: {
    sha: string;
    shortSha: string;
    status: GitCommitFileState;
    /** Old path when the commit renamed/copied the file. */
    origPath?: string;
  };
}
```

### 4.7 `HistorySection.tsx` (`openCommitFile`, lines 329-345)

Drop the `status === 'D'` early return (deletions must open, VS Code shows
them) and pass the commit block:

```ts
const openCommitFile = useCallback(
  (entry: GitLogEntry, file: GitCommitFileChange): void => {
    requestOpenFile({
      repoPath,
      relPath: file.path,
      path: `${repoPath}/${file.path}`,
      mode: 'diff',
      source: 'history',
      commit: {
        sha: entry.hash,
        shortSha: shortSha(entry.hash),
        status: file.status,
        ...(file.origPath !== undefined ? { origPath: file.origPath } : {})
      }
    });
  },
  [repoPath]
);
```

Its three call sites need the entry threaded through: line 526 (Enter key —
`entryBySha.get(current.sha)`), line 646 (file row click — `entry` is in
scope), and `openChanges` (line 352). Update the file header comment
(lines 16-19), which documents the old "diff-vs-HEAD, the feasible minimum
today" behaviour.

### 4.8 Editor store (`src/renderer/editor/store.ts`)

1. **Tab identity must include the commit.** Add `id: string` to `EditorTab`
   (`${sha}:${relPath}` for commit tabs, `path` otherwise) and switch
   `activePath`, `patchTab`, `activate`, `closeTab`, `forceCloseTab`,
   `cycleTab`, `setMode`, `pin`, `markDirty`, `activeTab` and the
   `openFromRequest` dedupe (line 242) from `path` to `id`. Key the Monaco
   model registry and view-state maps by `id` too
   (`monaco-loader.ts` + `MonacoHost.tsx:100,105,121,131,136,140,154`), so a
   commit tab can never share (or dispose) the worktree tab's buffer.
2. **Add commit state to the tab:**
   ```ts
   commit?: { sha: string; shortSha: string; status: GitCommitFileState;
              origPath?: string };
   /** Diff sides when `commit` is set (null = side absent). */
   oldContents: string | null;
   newContents: string | null;
   binary: boolean;
   ```
   `headContents` stays for worktree tabs; commit tabs never touch it.
3. **Branch the load** (replacing lines 293-294):
   ```ts
   if (req.commit !== undefined) void loadCommitDiff(tab.id, req.commit);
   else { void loadContents(req.path); if (req.mode === 'diff') void loadHead(req.path); }
   ```
   where `loadCommitDiff` calls the feature-detected
   `gmux.git.commitFileDiff?.(…)` (older preload → toast "needs a newer gmux
   build", same discipline as `depth.ts:396`).
4. **Commit tabs are read-only:** force `mode: 'diff'`, `canDiff: true`,
   never `preview`-reuse a dirty tab, `setMode(…, 'file')` is a no-op,
   `save()` returns early when `tab.commit !== undefined`, and
   `refreshRepoTabs` (line 164) filters them out (`t.commit === undefined`) —
   commit contents are immutable and a git:changed refresh must not clobber
   them.

### 4.9 `PierreDiff.tsx`

- Skip the Monaco-model subscription entirely when `tab.commit !== undefined`
  (lines 50-72) — otherwise a same-path worktree buffer leaks into the new side.
- Build the pair from `tab.oldContents` / `tab.newContents`, passing **`null`**
  for an absent side (Pierre's `DiffFileInput` accepts it) and using
  `tab.commit.origPath ?? tab.name` for `oldFile.name` so renames read
  `old → new`. Cache keys become `${sha}^:${oldPath}` / `${sha}:${newPath}`.
- `aria-label` / empty-state copy is currently hard-wired to "vs HEAD"
  (lines 134, 141-143): for commit tabs say "Changes in <shortSha>", and when
  both sides are identical (pure rename or mode change) say so rather than
  "matches HEAD".
- `binary === true` → render a "Binary file not shown" state instead of
  `MultiFileDiff`.

### 4.10 `EditorPanel.tsx`

- Hide `ModeToggle` for commit tabs (line 401) — there is no File mode for a
  historical blob.
- Tab title/tooltip: `name` + a `shortSha` chip; tooltip
  `"<path> — <shortSha> (parent → commit)"` (line 91-95).
- Key the rendered tab list by `tab.id`, not `tab.path` (line 395).

---

## 5. Multi-file commits (BACKLOG item 5 dependency)

`openChanges` (`HistorySection.tsx:347-359`) opens **only `detail.files[0]`**.
Looping it today would still leave one tab open, because
`openFromRequest` (`store.ts:267-289`) reuses the single preview tab for every
open and `MAX_TABS = 5` LRU-evicts the rest. So "Open Changes shows the whole
commit" is genuinely blocked on item 5's tab model. Two coherent endpoints:

- **Item-5 route (matches the BACKLOG text):** once tabs accumulate, open
  every file of the commit as a pinned (non-preview) tab in `name-status`
  order, activate the first, and cap with a confirm above ~20 files. Also
  raise/replace `MAX_TABS`.
- **VS Code-parity route (worth considering):** VS Code opens *one*
  multi-file diff editor per commit. gmux could open a single commit tab that
  stacks one `FileDiff` per changed file — `@pierre/diffs` renders these
  independently, and a single tab sidesteps tab explosion entirely. Cheaper
  than N tabs and closer to the screenshot in the BACKLOG.

Either way item 4's per-file correctness (§4) is the prerequisite and is
independently shippable.

---

## 6. Test matrix

Main-side, `src/main/git/__tests__/depth.integration.test.ts` (reuse
`harness.ts` — it isolates `GIT_CONFIG_GLOBAL/SYSTEM`, so add an explicit
`diff.renames=false` case to prove the `-M` fix):

| Case | Expected `GitCommitFileDiff` |
|---|---|
| modify | both sides non-null, both paths equal, `parentSha` set |
| add | `oldContents: null`, `oldPath: null` |
| delete | `newContents: null`, `newPath: null` |
| rename | `oldPath === origPath !== newPath`, both contents non-null |
| rename with `diff.renames=false` in repo config | still `R` in `commitDetail` after the `-M` fix |
| **root commit** | `parentSha: null`, `oldContents: null` (must not throw on `<root>^`) |
| **merge commit** | first-parent pair; file list matches `--diff-merges=first-parent` |
| binary blob | `binary: true`, both contents null |
| path absent in that commit | resolves with a null side, does not throw |
| bad sha / bad path | `INVALID_INPUT` from `assertSha` / `assertRelPath` |

Manual acceptance (operator seat): expand an old commit → click a modified
file → hunks match `git show <sha> -- <path>`; click an added file → whole
file green; click a deleted file → whole file red (and it opens at all);
click a renamed file → old path on the left; open the same path from two
different commits → two tabs, each correct; open a file from a commit while
that file is dirty in a worktree tab → the worktree tab's unsaved edits are
untouched after closing the commit tab.
