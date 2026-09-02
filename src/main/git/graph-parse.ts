/**
 * Parsers for the Phase-14.5 ref-scoped graph walk (research 24 §5.2).
 *
 * ONE command feeds the whole history pane:
 *
 *     git log -z --topo-order --decorate=full --stdin \
 *             --max-count=<N+1> --format=GRAPH_LOG_FORMAT
 *
 * Two things separate it from the flat `LOG_FORMAT` walk in parse.ts, and
 * both are the reason the graph is renderable at all:
 *
 *  - **`%P` in topo order.** The swimlane fold's correctness rests on a parent
 *    never preceding any of its children. Git's default reverse-chronological
 *    walk does not guarantee that — clock skew alone breaks it — so the
 *    ordering flag is not a nicety.
 *  - **`%D` with `--decorate=full`.** Refs are pinned to commits BY THE WALK,
 *    so they cannot drift from the log the way a separate SHA cross-reference
 *    can, and tags arrive for free (the history header's long-standing
 *    "no tag badges" gap closes here).
 *
 * Every field is US-separated (0x1f) inside a NUL-separated record, so commit
 * subjects containing anything at all still parse.
 */

import type {
  GitDecorationRef,
  GitGraphLogEntry,
  GitRefKind
} from '@shared/types';
import {
  parseUpstreamTrack,
  readNameStatusChunk,
  remoteOfUpstream
} from './parse';

/**
 * `%D` is deliberately the SECOND-TO-LAST field: the subject is the tail and
 * absorbs any stray 0x1f, and a decoration list can never contain one (git
 * refnames forbid control characters).
 */
export const GRAPH_LOG_FORMAT =
  '%H%x1f%h%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%D%x1f%s';

/** Field count before the subject tail. */
const GRAPH_FIELDS = 7;

const HEADS_PREFIX = 'refs/heads/';
const REMOTES_PREFIX = 'refs/remotes/';
const TAGS_PREFIX = 'refs/tags/';
const HEAD_ARROW = 'HEAD -> ';
const TAG_MARKER = 'tag: ';

export interface ParseGraphLogOptions {
  /**
   * The repo's configured remote names, so `refs/remotes/team/fork/main`
   * attributes to the remote `team/fork` rather than to `team`. Omitted falls
   * back to the first path segment (VS Code's behaviour).
   */
  remoteNames?: string[];
  /**
   * Phase 198. The walk carried `--name-status -M` and a path, so each record
   * is followed by a chunk saying what the commit did to that path. Read it
   * into `entry.file` (see `readNameStatusChunk` for the byte shape). Off by
   * default: the plain walk has no chunks and this loop would skip them
   * anyway, but a reader that is asked for is a reader that can be tested.
   */
  files?: boolean;
}

/**
 * Parse the NUL-separated output of the graph walk.
 *
 * Malformed records are skipped rather than thrown on: one unparseable commit
 * must never blank the whole history pane.
 */
export function parseGraphLog(
  output: string,
  options: ParseGraphLogOptions = {}
): GitGraphLogEntry[] {
  const entries: GitGraphLogEntry[] = [];
  const tokens = output.split('\0');
  for (let i = 0; i < tokens.length; i++) {
    const record = tokens[i] ?? '';
    if (record.length === 0) continue;
    const f = record.split('\x1f');
    if (f.length < GRAPH_FIELDS) continue;

    const hash = f[0] ?? '';
    if (hash.length === 0) continue;
    const shortSha = f[1] ?? '';
    const parents = (f[2] ?? '').split(' ').filter((p) => p.length > 0);
    const authorName = f[3] ?? '';
    const authorEmail = f[4] ?? '';
    const authorDate = Number(f[5] ?? '0') * 1000;
    const refs = parseDecoration(f[6] ?? '', options.remoteNames);
    // A subject containing \x1f would have been split — rejoin the tail.
    const subject = f.slice(GRAPH_FIELDS).join('\x1f');

    const entry: GitGraphLogEntry = {
      hash,
      parents,
      authorName,
      authorEmail,
      authorDate,
      subject,
      sha: hash,
      shortSha,
      author: authorName,
      dateISO: new Date(authorDate).toISOString(),
      refs
    };
    if (options.files === true) {
      const chunk = readNameStatusChunk(tokens, i + 1);
      const first = chunk.entries[0];
      if (first !== undefined) entry.file = first;
      i = chunk.next - 1;
    }
    entries.push(entry);
  }
  return entries;
}

/**
 * Stamp each commit with which side of the divergence it is on.
 *
 * Separate from `parseGraphLog` because the walk and the `rev-list
 * --left-right` that produces these sets run CONCURRENTLY — the sets do not
 * exist yet when the records are parsed. One implementation, so a row's
 * shading is derived exactly once and cannot drift between call sites.
 *
 * Returns the input array untouched when there is nothing to stamp, which is
 * the common case (a branch level with its upstream).
 */
export function annotateDivergence(
  entries: GitGraphLogEntry[],
  unpushed: ReadonlySet<string>,
  unpulled: ReadonlySet<string>
): GitGraphLogEntry[] {
  if (unpushed.size === 0 && unpulled.size === 0) return entries;
  return entries.map((e) => ({
    ...e,
    ...(unpushed.has(e.hash) ? { unpushed: true as const } : {}),
    ...(unpulled.has(e.hash) ? { unpulled: true as const } : {})
  }));
}

/**
 * Turn one `%D` value into TYPED refs.
 *
 * Shapes git emits under `--decorate=full` (verified against git 2.50 on a
 * repo with two remotes, annotated + lightweight tags and a detached HEAD):
 *
 *     HEAD -> refs/heads/dev, tag: refs/tags/v2.8.0, refs/remotes/origin/dev
 *     HEAD                                    ← detached
 *     tag: refs/tags/v1.0
 *     refs/remotes/origin/HEAD                ← symbolic alias, dropped
 *
 * Entries are comma-space separated and refnames cannot contain a space
 * (git check-ref-format forbids it), so the split is unambiguous.
 *
 * Anything outside heads/remotes/tags — `refs/stash`, `refs/notes/commits`,
 * `refs/pull/123/head` on a GitHub clone — is DROPPED rather than rendered as
 * an unknown pill: those are not branches the user reasons about, and the
 * badge row is narrow.
 *
 * Order is preserved except that the current branch is hoisted to the front,
 * because the row's emphasis belongs to the ref the user is standing on.
 */
export function parseDecoration(
  decoration: string,
  remoteNames?: string[]
): GitDecorationRef[] {
  const trimmed = decoration.trim();
  if (trimmed.length === 0) return [];

  const refs: GitDecorationRef[] = [];
  let currentIndex = -1;

  for (const raw of trimmed.split(', ')) {
    const token = raw.trim();
    if (token.length === 0) continue;

    let current = false;
    let full = token;
    if (token.startsWith(HEAD_ARROW)) {
      current = true;
      full = token.slice(HEAD_ARROW.length).trim();
    }

    // Detached HEAD: git decorates the commit with a bare `HEAD`.
    if (full === 'HEAD') {
      refs.push({ kind: 'head', name: 'HEAD', fullName: 'HEAD' });
      continue;
    }

    let kind: GitRefKind;
    let name: string;
    let remote: string | undefined;

    if (full.startsWith(TAG_MARKER)) {
      const tagRef = full.slice(TAG_MARKER.length).trim();
      kind = 'tag';
      name = tagRef.startsWith(TAGS_PREFIX)
        ? tagRef.slice(TAGS_PREFIX.length)
        : tagRef;
      full = tagRef;
    } else if (full.startsWith(HEADS_PREFIX)) {
      kind = 'localBranch';
      name = full.slice(HEADS_PREFIX.length);
    } else if (full.startsWith(REMOTES_PREFIX)) {
      const short = full.slice(REMOTES_PREFIX.length);
      // The symbolic `<remote>/HEAD` alias duplicates the remote's default
      // branch — presentation noise, deduped exactly as
      // parseForEachRefRemoteBranches already does for the BRANCHES section.
      if (short.endsWith('/HEAD') || short === 'HEAD') continue;
      kind = 'remoteBranch';
      name = short;
      remote =
        (remoteNames !== undefined
          ? remoteOfUpstream(short, remoteNames)
          : null) ?? short.slice(0, Math.max(short.indexOf('/'), 0));
    } else if (full.startsWith(TAGS_PREFIX)) {
      // `--decorate=full` normally prefixes tags with `tag: `; be tolerant.
      kind = 'tag';
      name = full.slice(TAGS_PREFIX.length);
    } else {
      continue; // refs/stash, refs/notes/*, refs/pull/* — not history badges
    }

    if (name.length === 0) continue;
    if (current) currentIndex = refs.length;
    refs.push({
      kind,
      name,
      fullName: full,
      ...(current ? { current: true as const } : {}),
      ...(remote !== undefined && remote.length > 0 ? { remote } : {})
    });
  }

  // Hoist the checked-out branch: the row's emphasis is where HEAD is.
  if (currentIndex > 0) {
    const [head] = refs.splice(currentIndex, 1);
    if (head !== undefined) refs.unshift(head);
  }
  return refs;
}

/**
 * Parse `git rev-list --left-right <head>...<upstream>` into the two sides of
 * the divergence: `<sha` is ours (unpushed), `>sha` is theirs (unpulled).
 *
 * This is the SAME set git counts for ahead/behind, which is the point — a row
 * shaded "unpushed" and a header reading "0 ahead" cannot both be produced
 * from one call.
 */
export function parseLeftRight(output: string): {
  unpushed: Set<string>;
  unpulled: Set<string>;
} {
  const unpushed = new Set<string>();
  const unpulled = new Set<string>();
  for (const line of output.split('\n')) {
    if (line.length < 2) continue;
    const side = line.charAt(0);
    const sha = line.slice(1).trim();
    if (sha.length === 0) continue;
    if (side === '<') unpushed.add(sha);
    else if (side === '>') unpulled.add(sha);
  }
  return { unpushed, unpulled };
}

/**
 * `git for-each-ref --format=SCOPE_REF_FORMAT` — the refname plus enough type
 * information to keep a walk from failing.
 *
 * `%(objecttype)` is `commit` for a branch or lightweight tag and `tag` for an
 * annotated tag (whose `%(*objecttype)` is then `commit`). A tag pointing at a
 * BLOB or a TREE — rare but legal, and present in real repos — resolves to
 * neither, and feeding it to `git log` is a hard `fatal: not a commit`, which
 * would take the whole history pane down. Those are filtered out here.
 *
 * `%(symref)` is non-empty exactly for the symbolic `<remote>/HEAD` aliases.
 */
export const SCOPE_REF_FORMAT =
  '%(refname)%1f%(objecttype)%1f%(*objecttype)%1f%(symref)';

/** Refnames from SCOPE_REF_FORMAT that a `git log` walk can actually accept. */
export function parseScopeRefs(output: string): string[] {
  const refs: string[] = [];
  for (const line of output.split('\n')) {
    if (line.length === 0) continue;
    const f = line.split('\x1f');
    const refname = f[0] ?? '';
    if (refname.length === 0) continue;
    const objectType = f[1] ?? '';
    const peeledType = f[2] ?? '';
    const symref = f[3] ?? '';
    if (symref.length > 0) continue; // <remote>/HEAD alias
    if (objectType !== 'commit' && peeledType !== 'commit') continue;
    refs.push(refname);
  }
  return refs;
}

/**
 * `git for-each-ref refs/heads --format=LOCAL_REF_FORMAT` — one line per local
 * branch, carrying both halves of what the graph needs from it: the FULL
 * refname (which is what a ref-scoped walk is fed) and the branch's standing
 * against its upstream.
 *
 * One call therefore answers three questions at once — the `local` scope's ref
 * set, the current branch's upstream ref (so the `branch` scope can put the
 * upstream on screen), and ahead/behind — instead of three round trips whose
 * answers could describe three different instants.
 */
export const LOCAL_REF_FORMAT =
  '%(refname)%1f%(objectname)%1f%(upstream)%1f%(upstream:short)' +
  '%1f%(upstream:track,nobracket)';

/** One local branch as the graph walk needs it. */
export interface ParsedLocalRef {
  /** Full refname, e.g. "refs/heads/feat/x". */
  refname: string;
  /** Tip OID. */
  sha: string;
  /** Full upstream refname ("refs/remotes/origin/x"); null when unset. */
  upstreamRef: string | null;
  /** Short upstream name ("origin/x"); null when unset. */
  upstream: string | null;
  ahead: number;
  behind: number;
  /** The configured upstream ref no longer exists. */
  gone: boolean;
}

/** Parse `git for-each-ref refs/heads --format=LOCAL_REF_FORMAT`. */
export function parseLocalRefs(output: string): ParsedLocalRef[] {
  const refs: ParsedLocalRef[] = [];
  for (const line of output.split('\n')) {
    if (line.length === 0) continue;
    const f = line.split('\x1f');
    if (f.length < 5) continue;
    const refname = f[0] ?? '';
    if (refname.length === 0) continue;
    const upstreamRef = f[2] ?? '';
    const upstream = f[3] ?? '';
    const track = parseUpstreamTrack(f[4] ?? '');
    refs.push({
      refname,
      sha: f[1] ?? '',
      upstreamRef: upstreamRef.length > 0 ? upstreamRef : null,
      upstream: upstream.length > 0 ? upstream : null,
      ahead: track.ahead,
      behind: track.behind,
      gone: track.gone
    });
  }
  return refs;
}

/**
 * Refnames a `git log --stdin` walk may be handed.
 *
 * The list normally comes from `for-each-ref`, but it can also be ECHOED BACK
 * by the renderer when paging (GitGraphLogInput.refs — the lane-stability
 * contract), and that path is caller data. A refname starting with `-` would
 * be read as an option; whitespace and control characters cannot occur in a
 * real refname. Rejected entries are dropped, not thrown on: one bad name in a
 * pinned list must degrade to a slightly narrower graph, never a dead pane.
 *
 * The result is deduped and SORTED, because the walk's output order depends on
 * the order its tips are given — pinning the set is only half of the stability
 * promise, pinning the order is the other half.
 */
export function sanitizeRefNames(refs: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const raw of refs) {
    if (typeof raw !== 'string') continue;
    const ref = raw.trim();
    if (ref.length === 0 || ref.startsWith('-')) continue;
    // eslint-disable-next-line no-control-regex
    if (/[\s\x00-\x1f\x7f~^:?*[\\]/.test(ref)) continue;
    if (ref !== 'HEAD' && !ref.startsWith('refs/')) continue;
    seen.add(ref);
  }
  return [...seen].sort();
}
