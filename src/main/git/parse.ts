/**
 * Parsers for git plumbing output — ported from the shapes VS Code's
 * `extensions/git` parses (GitStatusParser / parseGitCommits, MIT), adapted
 * to gmux's shared contract types (research 06 §1.1, §5).
 *
 * All commands run with `-z` (NUL termination) so arbitrary filenames —
 * spaces, newlines, UTF-8 — never break parsing.
 */

import type {
  GitBranchInfo,
  GitCommitFileChange,
  GitCommitFileState,
  GitFileState,
  GitFileStatus,
  GitRemoteBranchInfo,
  GitStatusGroups
} from '@shared/types';

// ---------------------------------------------------------------------------
// `git status --porcelain=v2 --branch -z`
// ---------------------------------------------------------------------------

/** VS Code's `git.statusLimit` default — cap parse work on huge repos. */
export const STATUS_LIMIT = 10_000;

export interface ParsedStatus {
  /** Full OID of HEAD, or undefined on an unborn branch (`(initial)`). */
  oid?: string;
  /** Branch name; undefined when detached. */
  branch?: string;
  /** Short SHA shown when detached. */
  detachedAt?: string;
  upstream?: string;
  ahead: number;
  behind: number;
  files: GitFileStatus[];
  groups: GitStatusGroups;
  /** True when any unmerged (`u`) entries exist. */
  hasConflicts: boolean;
  /** True when `files` was capped at STATUS_LIMIT. */
  truncated: boolean;
}

/** First `count` space-separated fields, then the raw remainder. */
function splitFields(
  line: string,
  count: number
): { fields: string[]; rest: string } | null {
  const fields: string[] = [];
  let idx = 0;
  for (let i = 0; i < count; i++) {
    const sp = line.indexOf(' ', idx);
    if (sp === -1) return null;
    fields.push(line.slice(idx, sp));
    idx = sp + 1;
  }
  return { fields, rest: line.slice(idx) };
}

const FILE_STATES: ReadonlySet<string> = new Set([
  'M',
  'A',
  'D',
  'R',
  'C',
  'U',
  '?',
  '!',
  '.'
]);

function toState(ch: string): GitFileState {
  // porcelain v2 also emits T (typechange) and m (submodule) in rare cases;
  // fold anything unknown into 'M' so the UI still shows "modified".
  return (FILE_STATES.has(ch) ? ch : 'M') as GitFileState;
}

/**
 * Parse the NUL-separated output of
 * `git status --porcelain=v2 --branch -z --untracked-files=all`.
 */
export function parsePorcelainV2Status(output: string): ParsedStatus {
  const result: ParsedStatus = {
    ahead: 0,
    behind: 0,
    files: [],
    groups: { merge: [], staged: [], changes: [], untracked: [] },
    hasConflicts: false,
    truncated: false
  };

  const tokens = output.split('\0');
  for (let i = 0; i < tokens.length; i++) {
    const line = tokens[i];
    if (line === undefined || line.length === 0) continue;

    if (line.startsWith('# ')) {
      parseHeader(line, result);
      continue;
    }

    if (result.files.length >= STATUS_LIMIT) {
      result.truncated = true;
      // Keep consuming tokens (a `2` entry's origPath token must not be
      // misread as a new record) but do cheap work only.
      if (line.startsWith('2 ')) i++;
      continue;
    }

    const kind = line.charAt(0);
    if (kind === '1') {
      const parts = splitFields(line, 8);
      if (!parts) continue;
      const xy = parts.fields[1] ?? '..';
      const entry: GitFileStatus = {
        path: parts.rest,
        indexState: toState(xy.charAt(0)),
        worktreeState: toState(xy.charAt(1))
      };
      pushTracked(result, entry);
    } else if (kind === '2') {
      const parts = splitFields(line, 9);
      if (!parts) continue;
      const xy = parts.fields[1] ?? '..';
      // In -z mode the original path follows as its own NUL token.
      const orig = tokens[++i];
      const entry: GitFileStatus = {
        path: parts.rest,
        ...(orig !== undefined && orig.length > 0 ? { origPath: orig } : {}),
        indexState: toState(xy.charAt(0)),
        worktreeState: toState(xy.charAt(1))
      };
      pushTracked(result, entry);
    } else if (kind === 'u') {
      const parts = splitFields(line, 10);
      if (!parts) continue;
      const xy = parts.fields[1] ?? 'UU';
      const entry: GitFileStatus = {
        path: parts.rest,
        indexState: toState(xy.charAt(0)),
        worktreeState: toState(xy.charAt(1))
      };
      result.files.push(entry);
      result.groups.merge.push(entry);
      result.hasConflicts = true;
    } else if (kind === '?') {
      const entry: GitFileStatus = {
        path: line.slice(2),
        indexState: '?',
        worktreeState: '?'
      };
      result.files.push(entry);
      result.groups.untracked.push(entry);
    } else if (kind === '!') {
      // Only present with --ignored; keep it out of the groups.
      result.files.push({
        path: line.slice(2),
        indexState: '!',
        worktreeState: '!'
      });
    }
  }

  return result;
}

function pushTracked(result: ParsedStatus, entry: GitFileStatus): void {
  result.files.push(entry);
  if (entry.indexState !== '.') result.groups.staged.push(entry);
  if (entry.worktreeState !== '.') result.groups.changes.push(entry);
}

function parseHeader(line: string, result: ParsedStatus): void {
  if (line.startsWith('# branch.oid ')) {
    const oid = line.slice('# branch.oid '.length);
    if (oid !== '(initial)') result.oid = oid;
  } else if (line.startsWith('# branch.head ')) {
    const head = line.slice('# branch.head '.length);
    if (head === '(detached)') {
      if (result.oid !== undefined) result.detachedAt = result.oid.slice(0, 7);
    } else {
      result.branch = head;
    }
  } else if (line.startsWith('# branch.upstream ')) {
    result.upstream = line.slice('# branch.upstream '.length);
  } else if (line.startsWith('# branch.ab ')) {
    const m = /^# branch\.ab \+(\d+) -(\d+)$/.exec(line);
    if (m) {
      result.ahead = Number(m[1]);
      result.behind = Number(m[2]);
    }
  }
}

// ---------------------------------------------------------------------------
// `git log` parsing lives in graph-parse.ts (Phase 14.5).
//
// The flat `LOG_FORMAT` / `parseLog` pair that stood here was superseded, not
// supplemented: the history walk is now ref-scoped, topologically ordered and
// decoration-carrying, and keeping a second format string for the same command
// is exactly the duplication the growth guardrails forbid. The replacement is
// GRAPH_LOG_FORMAT / parseGraphLog.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// APPENDED by the git-depth stream (dogfood round 1): branch listing,
// commit-detail (meta + name-status + numstat), and GitHub remote
// normalization. Same discipline as above — NUL/US-separated output so
// arbitrary file and branch names never break parsing.
// ---------------------------------------------------------------------------

/**
 * `git for-each-ref refs/heads --format=BRANCH_FORMAT` — one line per local
 * branch, fields separated by US (0x1f). Refnames cannot contain control
 * characters and `%(subject)` is a single line, so newline-delimited records
 * are safe here.
 */
export const BRANCH_FORMAT =
  '%(refname:short)%1f%(HEAD)%1f%(objectname)%1f%(objectname:short)' +
  '%1f%(upstream:short)%1f%(upstream:track,nobracket)%1f%(subject)';

const TRACK_AHEAD_RE = /(?:^|, )ahead (\d+)/;
const TRACK_BEHIND_RE = /(?:^|, )behind (\d+)/;

/** How one branch stands against its upstream, per `%(upstream:track)`. */
export interface UpstreamTrack {
  ahead: number;
  behind: number;
  /** The configured upstream ref no longer exists. */
  gone: boolean;
}

/**
 * Parse `%(upstream:track,nobracket)` — "ahead 2, behind 3", "gone", or "".
 *
 * Shared by the BRANCHES listing and the Phase-14.5 divergence read, which
 * ask git the same question about the same ref and must never be able to
 * disagree about the answer (standing guardrail 3: one helper, grepped for
 * before writing a second).
 */
export function parseUpstreamTrack(track: string): UpstreamTrack {
  const ahead = TRACK_AHEAD_RE.exec(track);
  const behind = TRACK_BEHIND_RE.exec(track);
  return {
    ahead: ahead !== null ? Number(ahead[1]) : 0,
    behind: behind !== null ? Number(behind[1]) : 0,
    gone: track === 'gone'
  };
}

/** Parse the output of `git for-each-ref refs/heads --format=BRANCH_FORMAT`. */
export function parseForEachRefBranches(output: string): GitBranchInfo[] {
  const branches: GitBranchInfo[] = [];
  for (const line of output.split('\n')) {
    if (line.length === 0) continue;
    const f = line.split('\x1f');
    if (f.length < 7) continue;
    const track = parseUpstreamTrack(f[5] ?? '');
    const upstream = f[4] ?? '';
    branches.push({
      name: f[0] ?? '',
      current: (f[1] ?? '') === '*',
      sha: f[2] ?? '',
      shortSha: f[3] ?? '',
      ...(upstream.length > 0 ? { upstream } : {}),
      ...(track.gone ? { upstreamGone: true } : {}),
      ahead: track.ahead,
      behind: track.behind,
      // A subject containing \x1f would have been split — rejoin the tail.
      subject: f.slice(6).join('\x1f')
    });
  }
  return branches;
}

// ---------------------------------------------------------------------------
// APPENDED by the branch-management stream (Phase 10 #7):
// `git for-each-ref refs/remotes --format=REMOTE_BRANCH_FORMAT` — one line
// per remote-tracking ref. `%(symref)` is non-empty exactly for the symbolic
// `<remote>/HEAD` entries (they point at the remote's default branch), which
// are presentation noise — deduped here, with a belt-and-braces name check.
// ---------------------------------------------------------------------------

export const REMOTE_BRANCH_FORMAT =
  '%(refname:short)%1f%(objectname)%1f%(objectname:short)%1f%(symref)' +
  '%1f%(subject)';

/** Parse `git for-each-ref refs/remotes --format=REMOTE_BRANCH_FORMAT`. */
export function parseForEachRefRemoteBranches(
  output: string
): GitRemoteBranchInfo[] {
  const branches: GitRemoteBranchInfo[] = [];
  for (const line of output.split('\n')) {
    if (line.length === 0) continue;
    const f = line.split('\x1f');
    if (f.length < 5) continue;
    const name = f[0] ?? '';
    const symref = f[3] ?? '';
    // Skip the symbolic <remote>/HEAD alias (dedupe origin/HEAD).
    if (symref.length > 0) continue;
    const slash = name.indexOf('/');
    if (slash <= 0) continue; // refs/remotes entries are always remote/name
    const shortName = name.slice(slash + 1);
    if (shortName === 'HEAD') continue; // defensive: never render a HEAD row
    branches.push({
      name,
      remote: name.slice(0, slash),
      shortName,
      sha: f[1] ?? '',
      shortSha: f[2] ?? '',
      // A subject containing \x1f would have been split — rejoin the tail.
      subject: f.slice(4).join('\x1f')
    });
  }
  return branches;
}

// ---------------------------------------------------------------------------
// `git log -1 -z --format=COMMIT_META_FORMAT <sha>` — commit metadata for the
// hover card. %aI = strict ISO-8601 author date; %b = full body (which may
// itself contain \x1f-free arbitrary text including blank lines).
// ---------------------------------------------------------------------------

export const COMMIT_META_FORMAT = '%H%x1f%h%x1f%an%x1f%ae%x1f%aI%x1f%s%x1f%b';

export interface ParsedCommitMeta {
  sha: string;
  shortSha: string;
  author: string;
  email: string;
  dateISO: string;
  subject: string;
  body: string;
}

/** Parse the single -z record produced by COMMIT_META_FORMAT. Null = empty. */
export function parseCommitMeta(output: string): ParsedCommitMeta | null {
  // Commit messages cannot contain NUL, so the first NUL ends the record.
  const record = output.split('\0')[0] ?? '';
  if (record.length === 0) return null;
  const f = record.split('\x1f');
  if (f.length < 7) return null;
  return {
    sha: f[0] ?? '',
    shortSha: f[1] ?? '',
    author: f[2] ?? '',
    email: f[3] ?? '',
    dateISO: f[4] ?? '',
    subject: f[5] ?? '',
    // The body is the tail; a \x1f inside it would have split — rejoin, and
    // drop git's trailing newline.
    body: f.slice(6).join('\x1f').replace(/\n+$/, '')
  };
}

// ---------------------------------------------------------------------------
// `git show <sha> -z --name-status --format=` and
// `git show <sha> -z --numstat --format=` — the changed files of one commit.
//
// -z token shapes (verified against git 2.50):
//   name-status:  "M" NUL "path" NUL          |  "R100" NUL "old" NUL "new" NUL
//   numstat:      "ins TAB del TAB path" NUL  |  "ins TAB del TAB" NUL "old" NUL "new" NUL
//   binary files: numstat counts are "-" "-".
// ---------------------------------------------------------------------------

const COMMIT_FILE_STATES: ReadonlySet<string> = new Set([
  'A',
  'M',
  'D',
  'R',
  'C',
  'T',
  'U'
]);

function toCommitState(ch: string): GitCommitFileState {
  return (COMMIT_FILE_STATES.has(ch) ? ch : 'X') as GitCommitFileState;
}

export interface NameStatusEntry {
  path: string;
  origPath?: string;
  status: GitCommitFileState;
}

/** Parse `-z --name-status` output into per-file status letters. */
export function parseNameStatusZ(output: string): NameStatusEntry[] {
  const entries: NameStatusEntry[] = [];
  const tokens = output.split('\0');
  for (let i = 0; i < tokens.length; i++) {
    const status = tokens[i];
    if (status === undefined || status.length === 0) continue;
    const kind = status.charAt(0);
    if (kind === 'R' || kind === 'C') {
      // Rename/copy score entries consume TWO path tokens: old, then new.
      const orig = tokens[++i];
      const path = tokens[++i];
      if (path === undefined || path.length === 0) continue;
      entries.push({
        path,
        ...(orig !== undefined && orig.length > 0 ? { origPath: orig } : {}),
        status: kind as GitCommitFileState
      });
    } else {
      const path = tokens[++i];
      if (path === undefined || path.length === 0) continue;
      entries.push({ path, status: toCommitState(kind) });
    }
  }
  return entries;
}

/**
 * Phase 198. Read the `--name-status -M` chunk that follows ONE record of a
 * `git log -z --format=<fields> --name-status` walk, and say where the next
 * record starts.
 *
 * The byte shape, read from real output rather than from the manual: after
 * the record's own NUL, git emits a status token that BEGINS WITH A NEWLINE
 * ("\nM", "\nR100"), then NUL, the path, NUL, and for R and C a second path
 * and NUL; the next record starts immediately with no separator of its own.
 * A merge commit on the plain path walk has no chunk at all. So
 * `parseNameStatusZ` cannot be handed the chunk raw: the leading newline
 * would make the kind '\n' and the answer 'X'. This reads tokens from
 * `start` for as long as they begin with a newline, strips it, and reads the
 * one or two path tokens each status consumes. `next` is the index of the
 * first token that is not part of the chunk.
 */
export function readNameStatusChunk(
  tokens: readonly string[],
  start: number
): { entries: NameStatusEntry[]; next: number } {
  const entries: NameStatusEntry[] = [];
  let i = start;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token === undefined || !token.startsWith('\n')) break;
    const status = token.slice(1);
    const kind = status.charAt(0);
    if (kind === 'R' || kind === 'C') {
      const orig = tokens[i + 1];
      const path = tokens[i + 2];
      i += 3;
      if (path === undefined || path.length === 0) continue;
      entries.push({
        path,
        ...(orig !== undefined && orig.length > 0 ? { origPath: orig } : {}),
        status: kind as GitCommitFileState
      });
    } else {
      const path = tokens[i + 1];
      i += 2;
      if (path === undefined || path.length === 0) continue;
      entries.push({ path, status: toCommitState(kind) });
    }
  }
  return { entries, next: i };
}

export interface NumstatEntry {
  path: string;
  origPath?: string;
  insertions: number;
  deletions: number;
  binary: boolean;
}

export interface ParsedNumstat {
  files: NumstatEntry[];
  /** Totals across all files (binary files contribute 0). */
  insertions: number;
  deletions: number;
}

/** Parse `-z --numstat` output into per-file line counts + totals. */
export function parseNumstatZ(output: string): ParsedNumstat {
  const files: NumstatEntry[] = [];
  let insertions = 0;
  let deletions = 0;
  const tokens = output.split('\0');
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok === undefined || tok.length === 0) continue;
    const t1 = tok.indexOf('\t');
    if (t1 === -1) continue;
    const t2 = tok.indexOf('\t', t1 + 1);
    if (t2 === -1) continue;
    const insRaw = tok.slice(0, t1);
    const delRaw = tok.slice(t1 + 1, t2);
    const rest = tok.slice(t2 + 1);
    const binary = insRaw === '-' || delRaw === '-';
    const ins = binary ? 0 : Number(insRaw) || 0;
    const del = binary ? 0 : Number(delRaw) || 0;

    let path = rest;
    let origPath: string | undefined;
    if (rest.length === 0) {
      // Rename/copy: counts token has a trailing TAB; old and new paths
      // follow as their own NUL tokens.
      origPath = tokens[++i];
      const newPath = tokens[++i];
      if (newPath === undefined || newPath.length === 0) continue;
      path = newPath;
    }

    insertions += ins;
    deletions += del;
    files.push({
      path,
      ...(origPath !== undefined && origPath.length > 0
        ? { origPath }
        : {}),
      insertions: ins,
      deletions: del,
      binary
    });
  }
  return { files, insertions, deletions };
}

/**
 * Join name-status letters with numstat counts (keyed by new path) into the
 * hover card's per-file shape. Files only one side knows about still appear
 * (counts default 0 / status defaults 'X' never happens — name-status is the
 * driving list).
 */
export function mergeCommitFiles(
  nameStatus: NameStatusEntry[],
  numstat: ParsedNumstat
): GitCommitFileChange[] {
  const byPath = new Map(numstat.files.map((f) => [f.path, f]));
  return nameStatus.map((entry) => {
    const counts = byPath.get(entry.path);
    return {
      path: entry.path,
      ...(entry.origPath !== undefined ? { origPath: entry.origPath } : {}),
      status: entry.status,
      insertions: counts?.insertions ?? 0,
      deletions: counts?.deletions ?? 0,
      ...(counts?.binary === true ? { binary: true } : {})
    };
  });
}

// ---------------------------------------------------------------------------
// GitHub remote normalization — `git remote get-url origin` → https URL.
// ---------------------------------------------------------------------------

/** scp-like syntax: [user@]github.com:owner/repo[.git] */
const SCP_LIKE_RE = /^(?:[^@/\s]+@)?github\.com:(.+)$/i;

/**
 * Normalize a GitHub `origin` remote URL to `https://github.com/owner/repo`.
 * Handles https, ssh://, git://, and scp-like `git@github.com:owner/repo`
 * forms (with or without `.git`). Returns null for anything that is not a
 * github.com remote — the caller hides "Open on GitHub".
 */
export function normalizeGitHubRemote(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed.length === 0) return null;

  let path: string | null = null;

  const scp = SCP_LIKE_RE.exec(trimmed);
  if (scp !== null) {
    path = scp[1] ?? null;
  } else {
    try {
      const u = new URL(trimmed);
      const proto = u.protocol;
      if (
        proto !== 'https:' &&
        proto !== 'http:' &&
        proto !== 'ssh:' &&
        proto !== 'git:'
      ) {
        return null;
      }
      if (u.hostname.toLowerCase() !== 'github.com') return null;
      path = u.pathname;
    } catch {
      return null;
    }
  }

  if (path === null) return null;
  const cleaned = path
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\.git$/i, '');
  // owner/repo (repo may itself contain no further slashes on GitHub).
  if (!/^[^/]+\/[^/]+$/.test(cleaned)) return null;
  return `https://github.com/${cleaned}`;
}

// ---------------------------------------------------------------------------
// `git remote -v` (Phase 12 item 3)
// ---------------------------------------------------------------------------

/** One remote as git prints it, before the tracking marker is applied. */
export interface ParsedRemote {
  name: string;
  fetchUrl: string;
  pushUrl: string;
}

/**
 * Parse `git remote -v`:
 *
 *     origin\thttps://github.com/o/r.git (fetch)
 *     origin\thttps://github.com/o/r.git (push)
 *
 * Two lines per remote (more when a `pushurl` differs); the name and URL are
 * TAB-separated and the role is a trailing parenthesised word. Remotes are
 * returned name-sorted with `origin` first — the order the UI lists them in.
 * A remote with no URL for one role reuses the other (git never prints both
 * empty). Unparseable lines are skipped rather than throwing: an odd remote
 * must not take down the remotes list.
 */
export function parseRemoteVerbose(stdout: string): ParsedRemote[] {
  const byName = new Map<string, { fetchUrl: string; pushUrl: string }>();
  for (const raw of stdout.split('\n')) {
    const line = raw.trimEnd();
    if (line.length === 0) continue;
    const tab = line.indexOf('\t');
    if (tab <= 0) continue;
    const name = line.slice(0, tab);
    const rest = line.slice(tab + 1);
    const roleMatch = /\s+\((fetch|push)\)$/.exec(rest);
    const url = (roleMatch === null ? rest : rest.slice(0, roleMatch.index)).trim();
    if (url.length === 0) continue;
    const entry = byName.get(name) ?? { fetchUrl: '', pushUrl: '' };
    if (roleMatch === null || roleMatch[1] === 'fetch') {
      entry.fetchUrl = url;
      if (entry.pushUrl === '') entry.pushUrl = url;
    } else {
      entry.pushUrl = url;
      if (entry.fetchUrl === '') entry.fetchUrl = url;
    }
    byName.set(name, entry);
  }
  return [...byName.entries()]
    .map(([name, urls]) => ({ name, ...urls }))
    .sort((a, b) =>
      a.name === b.name
        ? 0
        : a.name === 'origin'
          ? -1
          : b.name === 'origin'
            ? 1
            : a.name.localeCompare(b.name)
    );
}

/**
 * Which remote an upstream ref belongs to: `origin/feat/x` → `origin`.
 * Matched against the repo's ACTUAL remote names (longest first), because a
 * remote name may itself contain a slash — splitting on the first `/` would
 * mis-attribute `team/fork/main`. Null when no configured remote owns it.
 */
export function remoteOfUpstream(
  upstream: string,
  remoteNames: string[]
): string | null {
  let best: string | null = null;
  for (const name of remoteNames) {
    if (!upstream.startsWith(`${name}/`)) continue;
    if (best === null || name.length > best.length) best = name;
  }
  return best;
}
