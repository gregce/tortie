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
    | 'UNKNOWN';
  message: string;
  detail?: string;
}
