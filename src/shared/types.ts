/**
 * gmux shared domain types — FROZEN CONTRACT.
 *
 * Every process (main, preload, renderer) and every parallel work stream codes
 * against these shapes. Existing declarations must not be changed; new types
 * may be APPENDED. If you believe an existing shape is wrong, note it for the
 * integrator instead of editing it.
 */

/** Which agent (if any) a session runs. Plain shells are first-class. */
export type AgentKind = 'claude' | 'codex' | 'shell';

/**
 * Session lifecycle status.
 * - running:     the pane's process is alive and producing output / working
 * - idle:        alive but quiet (prompt sitting, agent finished a turn)
 * - needs_input: agent is blocked waiting on the user (bell / hook / heuristic)
 * - exited:      process ended; tmux session may be gone
 * - restorable:  known only from the manifest (e.g. after reboot) — can be
 *                recreated with an ARMED resume command
 */
export type SessionStatus =
  | 'running'
  | 'idle'
  | 'needs_input'
  | 'exited'
  | 'restorable';

/**
 * A named terminal session. The user-visible `name` is the primary UX key;
 * `tmuxName` is its sanitized tmux-side form (gmux rewrites `.`/`:` → `-` at
 * create/rename — tmux 3.7+ no longer sanitizes for us; see FINAL-REPORT §2.4
 * Step 0). Live tmux commands should target immutable `$-ids`, not names.
 */
export interface Session {
  /** gmux-generated UUID, stable for the session's whole life (manifest PK). */
  id: string;
  /** User-visible display name (⌘T / F2). */
  name: string;
  /** Sanitized tmux session name derived from `name`. */
  tmuxName: string;
  /** Absolute path of the project (repo root) this session belongs to. */
  projectPath: string;
  /** Working directory the session was started in. */
  cwd: string;
  agent: AgentKind;
  /**
   * The agent's own conversation/session id when known — e.g. the UUID
   * pre-assigned via `claude --session-id <uuid>`, or a harvested Codex
   * rollout id. Absent for plain shells.
   */
  agentSessionId?: string;
  /**
   * Full argv that resumes the specific conversation after a reboot, e.g.
   * ["claude", "--resume", "<uuid>", ...original flags]. Recorded because
   * `--resume` does not re-apply launch flags. ARMED (pre-typed), never
   * auto-fired, per product decision.
   */
  resumeArgv?: string[];
  status: SessionStatus;
  /** Epoch milliseconds. */
  createdAt: number;
  /**
   * APPENDED (Phase 8 hardening, §6.6 exit-code truth): the exit status of
   * the session's process when known. Populated by main from tmux's dead-pane
   * status (`remain-on-exit failed` keeps failed panes long enough to read
   * `#{pane_dead_status}`). Undefined for clean exits recorded before this
   * field existed, for user-killed sessions, and for live sessions. A defined
   * non-zero value drives the "failed" visual (hollow red dot, error copy).
   */
  exitCode?: number;
  /**
   * APPENDED (Phase 12.7, research 21 §7): the SIGNAL that killed the
   * session's process, as tmux reports it in `#{pane_dead_signal}` (lower
   * case, no SIG prefix — e.g. "term"). A process that dies BY a signal has
   * an empty `pane_dead_status`, so without this field a targeted `kill`
   * looked exactly like a clean exit. Undefined for real exits (including
   * the 128+n codes agents that self-map signals report themselves) and for
   * rows written before this field existed.
   */
  exitSignal?: string;
}

/** A project tab: one repo checkout. */
export interface Project {
  /** gmux-generated UUID. */
  id: string;
  /** Absolute path to the project directory (usually a git repo root). */
  path: string;
  /** Display name (defaults to basename of path). */
  name: string;
}

// ---------------------------------------------------------------------------
// IPC request/response payloads
// ---------------------------------------------------------------------------

export interface CreateSessionInput {
  /** Display name; gmux derives the sanitized tmux name. */
  name: string;
  projectPath: string;
  /** Defaults to projectPath when omitted. */
  cwd?: string;
  agent: AgentKind;
  /** Extra argv appended to the agent command (e.g. --model, --add-dir). */
  extraArgs?: string[];
}

export interface RenameSessionInput {
  sessionId: string;
  /** New display name. */
  name: string;
}

export interface ResizeInput {
  sessionId: string;
  cols: number;
  rows: number;
}

// ---------------------------------------------------------------------------
// Git
// ---------------------------------------------------------------------------

/**
 * Single-letter state as reported by `git status --porcelain=v2 -z`
 * (XY fields): M=modified, A=added, D=deleted, R=renamed, C=copied,
 * U=unmerged, '?'=untracked, '!'=ignored, '.'=unchanged on that side.
 */
export type GitFileState =
  | 'M'
  | 'A'
  | 'D'
  | 'R'
  | 'C'
  | 'U'
  | '?'
  | '!'
  | '.';

export interface GitFileStatus {
  /** Path relative to the repo root. */
  path: string;
  /** Original path when renamed/copied. */
  origPath?: string;
  /** Index (staged) side of the XY pair. */
  indexState: GitFileState;
  /** Worktree (unstaged) side of the XY pair. */
  worktreeState: GitFileState;
}

export interface GitStatusResult {
  repoPath: string;
  /** Undefined when detached HEAD; then `detachedAt` carries the short SHA. */
  branch?: string;
  detachedAt?: string;
  upstream?: string;
  ahead: number;
  behind: number;
  /** True while a merge/rebase/cherry-pick is in progress. */
  merging: boolean;
  files: GitFileStatus[];
  /** False when the directory is not a git repository (friendly UI state). */
  isRepo: boolean;
}

export interface GitPathsInput {
  repoPath: string;
  /** Paths relative to repoPath. */
  paths: string[];
}

export interface GitCommitInput {
  repoPath: string;
  message: string;
  amend?: boolean;
}

export interface GitLogInput {
  repoPath: string;
  /** Default 200. */
  maxCount?: number;
}

export interface GitLogEntry {
  hash: string;
  parents: string[];
  authorName: string;
  authorEmail: string;
  /** Epoch milliseconds. */
  authorDate: number;
  subject: string;
}

export interface GitShowHeadInput {
  repoPath: string;
  /** Path relative to repoPath. */
  path: string;
}

// ---------------------------------------------------------------------------
// APPENDED by the git-service stream (Phase 3) — new types only, nothing
// above was modified. The `git:status` / `git:log` invoke channels keep their
// frozen response types; the git service actually returns these SUPERSETS
// (structurally compatible), so renderers may narrow or feature-detect.
// ---------------------------------------------------------------------------

/**
 * VS Code-style resource groups derived from the same porcelain-v2 entries in
 * `GitStatusResult.files` (a file with both staged and worktree edits appears
 * in `staged` AND `changes`, exactly like VS Code's SCM view).
 */
export interface GitStatusGroups {
  /** Unmerged/conflicted entries (porcelain `u` lines). */
  merge: GitFileStatus[];
  /** Entries whose index side changed (M/A/D/R/C staged). */
  staged: GitFileStatus[];
  /** Tracked entries whose worktree side changed. */
  changes: GitFileStatus[];
  /** Untracked files (`?`). */
  untracked: GitFileStatus[];
}

/** What `git:status` actually resolves to: the frozen shape + groups. */
export interface GitStatusDetailed extends GitStatusResult {
  groups: GitStatusGroups;
  /**
   * True when the repo had more changed files than the status limit
   * (10 000, VS Code's `git.statusLimit` default) and `files` was capped.
   */
  truncated?: boolean;
}

/** What `git:log` entries actually resolve to: the frozen shape + extras. */
export interface GitLogEntryDetailed extends GitLogEntry {
  /** Alias of `hash` (full 40-char SHA). */
  sha: string;
  /** Abbreviated SHA (`%h`). */
  shortSha: string;
  /** Alias of `authorName`. */
  author: string;
  /** `authorDate` as an ISO-8601 string. */
  dateISO: string;
}

// ---------------------------------------------------------------------------
// fs
// ---------------------------------------------------------------------------

export interface ReadFileResult {
  path: string;
  contents: string;
  encoding: 'utf8';
  /** True when the file exceeded the read cap and was truncated. */
  truncated: boolean;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// APPENDED by the file-tree stream (fs:readDir / fs:reveal) — new types only,
// nothing above was modified.
// ---------------------------------------------------------------------------

/** One entry of a directory listing (`fs:readDir`). */
export interface FsDirEntry {
  /** Base name within the directory. */
  name: string;
  /** Absolute path (`join(dirPath, name)`). */
  path: string;
  /**
   * 'dir' ONLY for real directories (`Dirent.isDirectory()`); symlinks are
   * reported as 'symlink' even when they target directories, so the tree
   * never follows link cycles. 'other' covers sockets/FIFOs/devices.
   */
  kind: 'file' | 'dir' | 'symlink' | 'other';
}

export interface ReadDirResult {
  /** The directory that was listed (absolute). */
  path: string;
  /**
   * Unfiltered and unsorted — the renderer hides `.git` and sorts
   * (directories first, case-insensitive by name). Dotfiles are included.
   */
  entries: FsDirEntry[];
}

// ---------------------------------------------------------------------------
// APPENDED by the git-depth stream (dogfood round 1) — new types only, nothing
// above was modified. Powers branch switching, the per-commit context menu,
// and the rich commit hover card (git:branches / git:checkout /
// git:createBranch / git:createTag / git:cherryPick / git:commitDetail /
// git:remoteUrl / git:checkoutDetached).
// ---------------------------------------------------------------------------

/** One local branch, from `git for-each-ref refs/heads`. */
export interface GitBranchInfo {
  /** Short branch name (e.g. "main", "feature/x"). */
  name: string;
  /** True for the branch HEAD points at (`%(HEAD)` marker). */
  current: boolean;
  /** Full OID of the branch tip. */
  sha: string;
  /** Abbreviated tip OID. */
  shortSha: string;
  /** Upstream short name (e.g. "origin/main"); absent when none is set. */
  upstream?: string;
  /** True when the configured upstream branch no longer exists ("gone"). */
  upstreamGone?: boolean;
  /** Commits ahead of upstream (0 when no upstream). */
  ahead: number;
  /** Commits behind upstream (0 when no upstream). */
  behind: number;
  /** Subject line of the tip commit. */
  subject: string;
}

export interface GitCheckoutInput {
  repoPath: string;
  /** Local branch name to switch to. */
  branch: string;
}

export interface GitCreateBranchInput {
  repoPath: string;
  /** New branch name (validated by git itself). */
  name: string;
  /** Start point (SHA/branch/tag); defaults to HEAD. */
  fromRef?: string;
}

export interface GitCreateTagInput {
  repoPath: string;
  /** New (lightweight) tag name. */
  name: string;
  /** The commit to tag (SHA/branch). */
  ref: string;
}

export interface GitCherryPickInput {
  repoPath: string;
  /** Commit SHA to cherry-pick onto HEAD. */
  sha: string;
}

export interface GitCommitDetailInput {
  repoPath: string;
  /** Commit SHA (full or abbreviated). */
  sha: string;
}

export interface GitCheckoutDetachedInput {
  repoPath: string;
  /** Commit SHA to check out detached. */
  sha: string;
}

/**
 * Cherry-pick outcome — conflicts are a TYPED STATE, not an exception.
 * On conflict gmux always runs `git cherry-pick --abort` first (the repo is
 * never left mid-cherry-pick); `aborted` is false only when even the abort
 * failed (detail then carries git's own text so the user can recover).
 */
export type GitCherryPickResult =
  | { status: 'applied'; sha: string }
  | { status: 'conflict'; aborted: boolean; detail?: string };

/**
 * Per-file status letter within one commit (`--name-status`):
 * A=added, M=modified, D=deleted, R=renamed, C=copied, T=typechange,
 * U=unmerged, X=unknown.
 */
export type GitCommitFileState =
  | 'A'
  | 'M'
  | 'D'
  | 'R'
  | 'C'
  | 'T'
  | 'U'
  | 'X';

/** One changed file within a commit (hover card / Open Changes). */
export interface GitCommitFileChange {
  /** Path relative to the repo root (the NEW path for renames). */
  path: string;
  /** Original path when renamed/copied. */
  origPath?: string;
  status: GitCommitFileState;
  /** Lines added in this file (0 for binary files). */
  insertions: number;
  /** Lines removed in this file (0 for binary files). */
  deletions: number;
  /** True when git reported the file as binary (`-` numstat counts). */
  binary?: boolean;
}

/** Everything the rich commit hover card needs, in one response. */
export interface GitCommitDetail {
  /** Full 40-char SHA. */
  sha: string;
  shortSha: string;
  /** Author name. */
  author: string;
  /** Author email. */
  email: string;
  /** Author date, strict ISO-8601 (`%aI`). */
  dateISO: string;
  /** First line of the commit message. */
  subject: string;
  /** Rest of the message after the subject (may be empty). */
  body: string;
  files: GitCommitFileChange[];
  /** Total insertions across all files (binary files count 0). */
  insertions: number;
  /** Total deletions across all files (binary files count 0). */
  deletions: number;
}

// ---------------------------------------------------------------------------
// APPENDED by the Phase-10 registry+detection stream — new types only, nothing
// above was modified. The 12-agent registry (docs/research/11-agent-registry.md)
// lives in src/main/agents/registry.ts; these are the wire shapes shared with
// the renderer (agents:list / agents:rescan) plus the widened agent-id unions.
//
// INTEGRATOR note: `AgentKind` ('claude'|'codex'|'shell') is frozen above, so
// Session.agent / CreateSessionInput.agent cannot yet carry the new registry
// agents end-to-end. When reconciling, widen AgentKind to LaunchableAgentKind
// (below) — src/main/manifest/agents.ts buildLaunchSpec already accepts it,
// and src/main/ipc.ts createSession must resolve the binary via
// agentBinaryName(agent) from src/main/agents/registry (cursor's binary is
// `cursor-agent`, antigravity's is `agy` — the bare id is NOT the binary).
// ---------------------------------------------------------------------------

/** Every agent in the gmux registry (research 11 — all 12 entries). */
export type AgentRegistryId =
  | 'claude'
  | 'cursor'
  | 'codex'
  | 'gemini'
  | 'droid'
  | 'deepseek'
  | 'antigravity'
  | 'muse'
  | 'qwen'
  | 'pi'
  | 'cursoride'
  | 'copilotide';

/**
 * Registry agents gmux can launch in a tmux pane — everything except the
 * IDE capture-only pair (cursoride/copilotide). pi is launchable per
 * BACKLOG Phase-10 item 1 but carries `unverified` mechanics.
 */
export type LaunchableAgentId = Exclude<AgentRegistryId, 'cursoride' | 'copilotide'>;

/** AgentKind widened with the new launchable registry agents (Phase 10). */
export type LaunchableAgentKind = AgentKind | LaunchableAgentId;

/** One row of the agents:list / agents:rescan detection result. */
export interface DetectedAgent {
  id: AgentRegistryId;
  displayName: string;
  /** 'cli' = tmux-launchable terminal agent; 'ide' = app watcher. */
  kind: 'cli' | 'ide';
  /** False for the capture-only IDE pair — never offered for launch. */
  launchable: boolean;
  /**
   * CLI: an executable was resolved (and the identity probe, when one
   * exists, did not contradict it). IDE: the session store exists.
   */
  installed: boolean;
  /** Resolved absolute executable path; null when not found. */
  binPath: string | null;
  /** Version string from the registry versionCmd; null when unknown. */
  version: string | null;
  /** The agent's session-store root exists (installed AND in-use signal). */
  storeDetected: boolean;
  /** AgentIcon key (unknown keys render the terminal-glyph fallback). */
  iconKey: string;
  /** True when the registry marks this agent's mechanics UNVERIFIED (pi). */
  unverified: boolean;
}

/** Full detection result (agents:list / agents:rescan). */
export interface AgentsScanResult {
  /** All 12 registry agents, in registry order (installed or not). */
  agents: DetectedAgent[];
  /** Epoch ms when this scan ran (cache timestamp for the Settings UI). */
  scannedAt: number;
}

// ---------------------------------------------------------------------------
// APPENDED by the branch-management stream (Phase 10 #7) — new types only,
// nothing above was modified. Powers the BRANCHES sidebar section: remote
// refs enumeration (git:remoteBranches), network fetch (git:fetch),
// tracking checkout of a remote branch (git:checkoutTracking), and local
// branch deletion with a typed unmerged state (git:deleteBranch).
// ---------------------------------------------------------------------------

/** One remote-tracking branch, from `git for-each-ref refs/remotes`. */
export interface GitRemoteBranchInfo {
  /** Full short refname including the remote (e.g. "origin/feat/x"). */
  name: string;
  /** The remote's name (e.g. "origin"). */
  remote: string;
  /** Branch name without the remote prefix (e.g. "feat/x"). */
  shortName: string;
  /** Full OID of the branch tip. */
  sha: string;
  /** Abbreviated tip OID. */
  shortSha: string;
  /** Subject line of the tip commit. */
  subject: string;
}

/** git:remoteBranches result — refs plus the repo's last-fetch timestamp. */
export interface GitRemoteBranchesResult {
  /** All remote-tracking branches; symbolic <remote>/HEAD entries deduped. */
  branches: GitRemoteBranchInfo[];
  /**
   * mtime of .git/FETCH_HEAD in epoch ms — when this clone last talked to a
   * remote (fetch or pull). Null before any fetch (fresh clone counts: clone
   * writes no FETCH_HEAD) or when unreadable.
   */
  lastFetchedAt: number | null;
}

export interface GitCheckoutTrackingInput {
  repoPath: string;
  /** Remote-tracking ref to check out, e.g. "origin/feat/x". */
  remoteBranch: string;
}

export interface GitDeleteBranchInput {
  repoPath: string;
  /** Local branch name to delete. */
  name: string;
  /** True runs `git branch -D` (discard unmerged commits). */
  force?: boolean;
}

/**
 * Delete outcome — "not fully merged" is a TYPED STATE, not an exception,
 * so the UI can offer the force option exactly when git would need it.
 */
export type GitDeleteBranchResult =
  | { status: 'deleted' }
  | { status: 'unmerged' };

/**
 * Structured error shape. Main-process handlers throw Error whose `message`
 * is `JSON.stringify(GmuxErrorPayload)` when they can classify the failure;
 * renderers may fall back to the raw message for unclassified errors.
 */
export interface GmuxErrorPayload {
  code:
    | 'TMUX_NOT_FOUND'
    | 'TMUX_UNREACHABLE'
    | 'SESSION_NOT_FOUND'
    | 'PROJECT_NOT_FOUND'
    | 'NOT_A_GIT_REPO'
    | 'GIT_FAILED'
    | 'FS_FAILED'
    | 'SPAWN_FAILED'
    | 'INVALID_INPUT'
    // APPENDED (Phase 9.2 Bug A): the agent CLI for a new session could not
    // be resolved to an executable — surfaced as a friendly create-modal
    // message, never a dead pane. `detail` carries the bare binary name.
    | 'AGENT_NOT_FOUND'
    | 'UNKNOWN';
  message: string;
  detail?: string;
}

// ---------------------------------------------------------------------------
// APPENDED by the Phase-12 git stream — new types only, nothing above was
// modified. Two capabilities:
//
//  (a) BACKLOG 12 item 4 — historical commit diffs. Opening a file from the
//      HISTORY section must render `<sha>^ → <sha>` (DESIGN-SPEC S3A), not
//      HEAD → worktree. git:commitFileDiff returns that pair for ONE file of
//      ONE commit, with a null side for adds/deletes (VS Code's semantics,
//      and @pierre/diffs' DiffFileInput accepts null directly).
//  (b) BACKLOG 12 item 3 — push / pull / sync + the remotes list.
// ---------------------------------------------------------------------------

/** What the renderer knows about a file row in a commit (the click gesture). */
export interface GitCommitFileDiffInput {
  repoPath: string;
  /** The commit to show (full or abbreviated SHA). */
  sha: string;
  /** Path AS OF this commit (the NEW path for renames), repo-root relative. */
  path: string;
  /** Pre-rename path for R/C entries — the left side's path. */
  origPath?: string;
  /**
   * name-status letter from the commit's file list. A HINT only: whether a
   * side exists is decided by whether git can read that blob, so a stale
   * letter degrades to a correct add/delete instead of a wrong diff.
   */
  status: GitCommitFileState;
}

/** The parent→commit content pair for one file (git:commitFileDiff). */
export interface GitCommitFileDiff {
  /** Full SHA of the commit being shown. */
  sha: string;
  shortSha: string;
  /** First parent's full SHA; null for a ROOT commit (left side is empty). */
  parentSha: string | null;
  /** Left path; null when the file did not exist in the parent (added). */
  oldPath: string | null;
  /** Right path; null when the file is gone at this commit (deleted). */
  newPath: string | null;
  /** Left contents; null when that side is absent OR the file is binary. */
  oldContents: string | null;
  /** Right contents; null when that side is absent OR the file is binary. */
  newContents: string | null;
  /** Either side contains NUL in its first 8000 bytes (git's own heuristic). */
  binary: boolean;
}

/** One configured remote (`git remote -v`), with its tracking marker. */
export interface GitRemoteInfo {
  /** Remote name, e.g. "origin". */
  name: string;
  /** URL git fetches from. */
  fetchUrl: string;
  /** URL git pushes to (equals fetchUrl unless a pushurl is configured). */
  pushUrl: string;
  /** True when the CURRENT branch's upstream lives on this remote. */
  tracked: boolean;
}

/** git:remotes result — the configured remotes plus the tracking context. */
export interface GitRemotesResult {
  /** Configured remotes, name-sorted; empty for a repo with no remotes. */
  remotes: GitRemoteInfo[];
  /** Current branch name; null when detached, unborn, or not a repo. */
  branch: string | null;
  /** Upstream ref of the current branch ("origin/main"); null when none. */
  upstream: string | null;
}

export interface GitPushInput {
  repoPath: string;
  /**
   * Publish: run `git push -u <remote> <branch>` and set the upstream. Only
   * meaningful when the branch has none — that case otherwise resolves with
   * `{status:'no-upstream'}` so the UI can offer "Publish Branch" instead of
   * guessing a remote behind the user's back.
   */
  setUpstream?: boolean;
  /** Remote to publish to; defaults to the repo's only/origin remote. */
  remote?: string;
}

/**
 * Push outcome. "This branch has no upstream" is a TYPED STATE, not an
 * exception — it is the normal state of a fresh branch, and the answer is a
 * Publish affordance, not an error toast.
 */
export type GitPushResult =
  | { status: 'pushed'; remote: string; branch: string }
  | { status: 'up-to-date'; remote: string; branch: string }
  | { status: 'no-upstream'; branch: string; remote: string | null };

export interface GitPullInput {
  repoPath: string;
}

/**
 * Pull outcome. Conflicts are a typed state (the repo is left mid-merge on
 * purpose, exactly as on the CLI — the Changes section shows the conflicts),
 * and "no upstream" mirrors GitPushResult.
 */
export type GitPullResult =
  | { status: 'pulled'; upstream: string }
  | { status: 'up-to-date'; upstream: string }
  | { status: 'no-upstream'; branch: string }
  | { status: 'conflict'; detail?: string };

export interface GitSyncInput {
  repoPath: string;
}

/** Sync = pull, then push (VS Code's Sync Changes). */
export interface GitSyncResult {
  pull: GitPullResult;
  /** null when the pull did not succeed — a broken pull is never pushed over. */
  push: GitPushResult | null;
}

// ---------------------------------------------------------------------------
// APPENDED by the image-drop stream (Phase 12 item 8, research 16) — new types
// only, nothing above was modified. Dropping (or ⌘V-ing) a file onto a session
// inserts a reference to it at the caret; how that reference is inserted is
// per-agent DATA that lives once, in the main-process agent registry.
// ---------------------------------------------------------------------------

/**
 * How a file reference reaches one agent's prompt (research 16 §2):
 *  - 'paste-path'       bracket-paste the absolute path; the agent turns it
 *                       into a real attachment (Claude's `[Image #N]`).
 *  - 'clipboard-attach' the agent only reads IMAGE DATA off the system
 *                       pasteboard (deepseek, antigravity). ⌘V works as-is;
 *                       a drop degrades to path text until the guarded
 *                       pasteboard write ships (research 16 §7, Stage 2).
 *  - 'path-text'        insert the path as ordinary text. No attachment, but
 *                       every CLI can read it. The default for anything
 *                       unverified, for shells, and for non-image files.
 */
export type ImageDropStrategy = 'paste-path' | 'clipboard-attach' | 'path-text';

/** One agent's file-reference behavior. */
export interface AgentImageDrop {
  strategy: ImageDropStrategy;
  /**
   * How path TEXT is inserted when we insert path text at all. 'type' exists
   * solely for antigravity, whose completion popup swallows the next
   * keystroke after a bracketed paste (research 16 §2).
   */
  insert: 'paste' | 'type';
  /** true = observed hands-on 2026-08-10 (research 16); false = inherited. */
  verified: boolean;
  notes?: string;
}

/** drop:strategies — the whole per-agent table (static per build). */
export interface ImageDropTable {
  /** Registry agents that carry an explicit strategy. */
  agents: Partial<Record<AgentRegistryId, AgentImageDrop>>;
  /** Used for shells and for any agent absent from `agents`. */
  fallback: AgentImageDrop;
}

/** One dropped path after main classified it (drop:prepare). */
export interface DropPreparedItem {
  /** The path the renderer resolved (webUtils, or the drop store). */
  sourcePath: string;
  kind: 'file' | 'dir' | 'missing';
  /**
   * The path to reference in the prompt. Identical to `sourcePath` except
   * when the original filename contained a newline — those are copied into
   * the drop store under a safe name, because a CR inside a bracketed paste
   * can submit half a prompt (research 16 §3).
   */
  refPath: string;
  /** True when `refPath` is a copy main made in the drop store. */
  copied: boolean;
  /** Magic-byte sniff — drives "Drop to attach" vs "Drop to insert path". */
  isImage: boolean;
  /** Size in bytes; 0 for directories and missing paths. */
  bytes: number;
}

export interface DropPrepareResult {
  items: DropPreparedItem[];
}

/** drop:persist — bytes with no filesystem path of their own (⌘V, browser drags). */
export interface DropPersistInput {
  /** Suggested filename from the DataTransfer; may be junk or empty. */
  name: string;
  /** Claimed MIME type. The extension comes from magic bytes regardless. */
  mime: string;
  bytes: Uint8Array;
}

export interface DropPersistResult {
  /** Absolute path inside <userData>/gmux/dropped-images. */
  path: string;
  isImage: boolean;
}

// ---------------------------------------------------------------------------
// APPENDED by the Shift+Enter stream (Phase 12.5/12.6, research 20) — new
// types only. The per-agent multiline table is registry DATA, exactly like
// AgentImageDrop above, and reaches the renderer over `agents:multilineKeys`.
// ---------------------------------------------------------------------------

/** How Shift+Enter reaches one agent's prompt. */
export interface AgentMultilineKey {
  /**
   * The literal bytes Shift+Enter writes into the pane. `null` means this
   * agent has no multiline input, so gmux leaves the key alone rather than
   * risk a stray submit — plain Enter must never break.
   */
  sequence: string | null;
  /** true = a newline was observed hands-on (research 20 §5). */
  verified: boolean;
  notes?: string;
}

/** agents:multilineKeys — the whole per-agent table (static per build). */
export interface MultilineKeyTable {
  /** Registry agents that carry an explicit row. */
  agents: Partial<Record<AgentRegistryId, AgentMultilineKey>>;
  /** Used for shells and for any agent absent from `agents`. */
  fallback: AgentMultilineKey;
}
