/**
 * Parsers for git plumbing output — ported from the shapes VS Code's
 * `extensions/git` parses (GitStatusParser / parseGitCommits, MIT), adapted
 * to gmux's shared contract types (research 06 §1.1, §5).
 *
 * All commands run with `-z` (NUL termination) so arbitrary filenames —
 * spaces, newlines, UTF-8 — never break parsing.
 */

import type {
  GitFileState,
  GitFileStatus,
  GitLogEntryDetailed,
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
// `git log -z --format=%H%x1f%h%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%s`
// ---------------------------------------------------------------------------

/** Unit separator between fields; records are NUL-separated via `-z`. */
export const LOG_FORMAT = '%H%x1f%h%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%s';

export function parseLog(output: string): GitLogEntryDetailed[] {
  const entries: GitLogEntryDetailed[] = [];
  for (const record of output.split('\0')) {
    if (record.length === 0) continue;
    const f = record.split('\x1f');
    if (f.length < 7) continue;
    const hash = f[0] ?? '';
    const shortSha = f[1] ?? '';
    const parents = (f[2] ?? '').split(' ').filter((p) => p.length > 0);
    const authorName = f[3] ?? '';
    const authorEmail = f[4] ?? '';
    const authorDate = Number(f[5] ?? '0') * 1000;
    // A subject containing \x1f would have been split — rejoin the tail.
    const subject = f.slice(6).join('\x1f');
    entries.push({
      hash,
      parents,
      authorName,
      authorEmail,
      authorDate,
      subject,
      sha: hash,
      shortSha,
      author: authorName,
      dateISO: new Date(authorDate).toISOString()
    });
  }
  return entries;
}
