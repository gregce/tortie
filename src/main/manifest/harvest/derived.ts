/**
 * THE SHARED QUESTION: how is a DERIVED STREAM told from a resumable session?
 *
 * Phase 215, and it exists because the answer used to be per agent or absent.
 * On 2026-09-05 the operator rebooted, went to restore, and codex refused one
 * of his sessions with `cannot resume an unloaded multi-agent v2 sub-agent
 * through its parent`. The id in his manifest row was a SUB AGENT thread. It
 * got there because the codex descriptor keys on `cwd-newest` and its confirm
 * read ONE field of line 1, being `payload.cwd`, which a sub agent inherits
 * from its parent verbatim; the sub agents are also NEWER than the thread that
 * spawned them, so newest-in-folder always preferred one. 165 of 185 rollouts
 * in his September shards are sub agents, so it was nine in ten rather than a
 * one off (docs/research/81-codex-subagent-resume.md).
 *
 * Tortie ALREADY refused this for muse, whose `recurse` dropped `subagent/`,
 * and it missed codex because muse files derived streams in their own
 * DIRECTORY while codex writes them into the same date shard under the same
 * `rollout-<ts>-<uuid>.jsonl` filename shape. Only the CONTENTS tell them
 * apart. So a path rule was enough for one agent and no rule at all existed
 * for the other.
 *
 * WHAT BINDS THE FUTURE, and it is the whole point of this module. Every
 * harvest descriptor DECLARES its answer as data, the field is REQUIRED so a
 * new agent does not compile without it, and `none` is a CLAIM carrying the
 * evidence for it rather than a silence. The pipeline asks the question once,
 * for every agent, BEFORE any key is applied, so a future `cwd-newest` agent
 * inherits the protection instead of re-earning it. `npm run
 * conformance:derived` fails the build when a descriptor does not answer.
 *
 * Ownership: src/main/manifest/**. Pure — no file system, no process, no
 * Electron. Both readers of a store call in here: ./stores.ts reads records
 * off this Mac's disk and ./remote.ts reads them out of head bytes that came
 * over a connection, and one predicate serves both, which is what stops a
 * connected machine taking sub agents after this Mac stopped.
 */

/**
 * How one agent's store tells a derived stream from a resumable session.
 *
 * Three kinds and no default:
 *
 *  - `none` — this store holds no derived streams. `measured` says HOW that
 *    was looked for, because a claim with no evidence is a silence with a
 *    field name on it.
 *  - `path` — the store files derived streams under a path a person can see,
 *    which is muse. Asked per path segment, at every depth.
 *  - `record` — only the contents tell them apart, which is codex. Asked over
 *    the first `lines` parseable JSON records of the candidate, so the same
 *    predicate serves a local file read and a remote head read.
 */
export type DerivedStreamRule =
  | {
      kind: 'none';
      /** How the store was searched for derived streams, and what was found. */
      measured: string;
    }
  | {
      kind: 'path';
      measured: string;
      /** TRUE when this path segment names a derived stream. */
      test(name: string, depth: number, path: string): boolean;
    }
  | {
      kind: 'record';
      measured: string;
      /** How many leading JSON records the test needs. */
      lines: number;
      /** TRUE when these records describe a derived stream. */
      test(records: readonly Record<string, unknown>[]): boolean;
    };

/**
 * The codex payload, which is `line.payload` on a `session_meta` record and
 * the record itself on the older flat shape.
 */
function codexPayload(
  record: Record<string, unknown>
): Record<string, unknown> {
  const payload = record['payload'];
  return payload !== null && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : record;
}

/** A string field, or null. Never a number, never an object. */
function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Is this codex record a DERIVED stream — a sub agent — rather than a thread a
 * person can resume?
 *
 * FOUR TESTS ASKED TOGETHER, and any one of them is enough. The phase does not
 * get to assume which fields a later codex keeps, and the counts below are
 * over all 25,973 rollouts in the operator's own store (research 81 §1):
 *
 *  T1 `thread_source === 'subagent'` — 453 records. Absent on 68 written by
 *     0.116.0 to 0.128.0, before the column existed.
 *  T2 `source.subagent` present — 521 records, a superset of the other three
 *     in his store TODAY. It is not asked alone because that is exactly the
 *     assumption T1 and T3 exist to survive.
 *  T3 `parent_thread_id` differs from the record's own `id` — 404 records, and
 *     it NEVER fires alone in 25,973. It carries the only untested false
 *     positive risk in the set, because `forked_from_id` exists and a
 *     deliberate FORK of a resumable thread would plausibly carry a parent
 *     too, so it is narrowed below.
 *  T4 a top level `agent_nickname` — 519 of the 521 derived records and 0 of
 *     the 25,452 sessions. The measurement's addition to the entry's three,
 *     and the broadest single field after `source.subagent`. Narrowed with T3
 *     for the same reason: codex has custom agents, and a person's own named
 *     agent thread is a session.
 *
 * THE NARROWING. T3 and T4 are asked only when the record does not say
 * `thread_source: 'user'`. Over his store that changes nothing, because there
 * is no `user` record that either would have flagged, and it is what stops a
 * future fork or a future named session being refused. A refusal here costs a
 * conversation that never arms, which is why it is narrowed rather than
 * widened.
 *
 * FALSE POSITIVES MEASURED: zero, over 25,452 session records.
 *
 * `source` IS NOT ALWAYS AN OBJECT. On a modern session record it is a plain
 * STRING, and only a derived record makes it an object carrying `subagent`, so
 * the typeof guard below is required rather than defensive.
 */
export function codexDerivedRecord(
  records: readonly Record<string, unknown>[]
): boolean {
  const first = records[0];
  if (first === undefined) return false;
  const payload = codexPayload(first);

  const threadSource = payload['thread_source'];
  // T1.
  if (threadSource === 'subagent') return true;

  // T2. The typeof guard is the required one: `source` is a STRING on a
  // modern session record.
  const source = payload['source'];
  if (
    source !== null &&
    typeof source === 'object' &&
    !Array.isArray(source) &&
    (source as Record<string, unknown>)['subagent'] !== undefined
  ) {
    return true;
  }

  // The narrowing. A record that says it is a person's own thread is not
  // refused by a field that only SUGGESTS derivation.
  if (threadSource === 'user') return false;

  // T3.
  const own = str(payload['id']);
  const parent = str(payload['parent_thread_id']);
  if (parent !== null && own !== null && parent.toLowerCase() !== own.toLowerCase()) {
    return true;
  }

  // T4.
  if (str(payload['agent_nickname']) !== null) return true;

  return false;
}

/**
 * The thread this derived codex record was spawned from, or null.
 *
 * IT READS BOTH PLACES, and that is not tidiness. Over his 521 derived
 * records the parent id lives in both and agrees 404 times, in the NESTED
 * place only 115 times, and in the top level place only 0 times. A repair
 * reading `payload.parent_thread_id` alone would fail on 22 per cent of them
 * (research 81 §2). Two records carry neither, and those are the LEFT ALONE
 * case rather than a bug.
 */
export function codexParentThreadId(
  record: Record<string, unknown>
): string | null {
  const payload = codexPayload(record);
  const top = str(payload['parent_thread_id']);
  if (top !== null) return top;
  const source = payload['source'];
  if (source === null || typeof source !== 'object' || Array.isArray(source)) {
    return null;
  }
  const subagent = (source as Record<string, unknown>)['subagent'];
  if (subagent === null || typeof subagent !== 'object' || Array.isArray(subagent)) {
    return null;
  }
  const spawn = (subagent as Record<string, unknown>)['thread_spawn'];
  if (spawn === null || typeof spawn !== 'object' || Array.isArray(spawn)) {
    return null;
  }
  return str((spawn as Record<string, unknown>)['parent_thread_id']);
}

/** The id line 1 of a codex rollout names, or null. */
export function codexRecordId(
  record: Record<string, unknown>
): string | null {
  return str(codexPayload(record)['id']);
}

/**
 * THE ONE PLACE A PATH IS ASKED. Every segment of `path` below whichever of
 * `roots` contains it, at its own depth, with depth 0 being a direct child of
 * the root — the same numbering `HarvestDescriptor.recurse` uses.
 *
 * Asked per SEGMENT rather than per name so a candidate discovered by the fast
 * channel, which never walked the directories above it, is refused by the same
 * rule that stops the scan descending.
 */
export function derivedByPath(
  rule: DerivedStreamRule,
  roots: readonly string[],
  path: string
): boolean {
  if (rule.kind !== 'path') return false;
  for (const root of roots) {
    const prefix = root.endsWith('/') ? root : `${root}/`;
    if (!path.startsWith(prefix)) continue;
    const segments = path.slice(prefix.length).split('/').filter((s) => s.length > 0);
    let walked = root.endsWith('/') ? root.slice(0, -1) : root;
    for (const [depth, name] of segments.entries()) {
      walked = `${walked}/${name}`;
      if (rule.test(name, depth, walked)) return true;
    }
  }
  return false;
}

/** THE ONE PLACE RECORDS ARE ASKED. */
export function derivedByRecords(
  rule: DerivedStreamRule,
  records: readonly Record<string, unknown>[]
): boolean {
  return rule.kind === 'record' && rule.test(records);
}

/**
 * How many leading JSON records this rule needs read, or 0 when it needs none.
 * A `none` or `path` rule reads no bytes at all, which is what keeps the
 * question free for the six agents that answer `none`.
 */
export function derivedRecordLines(rule: DerivedStreamRule): number {
  return rule.kind === 'record' ? rule.lines : 0;
}

// ---------------------------------------------------------------------------
// The chain
// ---------------------------------------------------------------------------

/** What a store can say about one thread id. */
export type ThreadClassification =
  /** A thread a person can resume. */
  | 'session'
  /** A derived stream. Not resumable, and it names a parent. */
  | 'derived'
  /** Nothing on disk or in a store can say. */
  | 'unknown'
  /** No record for this id exists at all. */
  | 'absent';

export interface ChainLookup {
  classify(id: string): ThreadClassification;
  parentOf(id: string): string | null;
}

export type ChainVerdict =
  | 'already-a-session'
  | 'repaired'
  | 'cannot-tell'
  | 'absent'
  | 'no-parent-named'
  | 'cycle'
  | 'over-bound'
  | 'parent-missing';

export interface ChainResult {
  verdict: ChainVerdict;
  /** The thread to resume. ONLY set on 'repaired'. */
  resolved: string | null;
  hops: number;
}

/**
 * How many parent hops a walk may take.
 *
 * EIGHT, and the number is a measurement rather than caution. Over the
 * operator's 521 derived records the deepest real chain is THREE hops (491
 * resolve in 1, 25 in 2, 3 in 3) and the vendor's own declared `depth` agrees
 * exactly, though the walk is what is trusted because `depth` is a number the
 * vendor writes and the walk is a fact about the files. Eight is 2.6x that,
 * each hop is one bounded head read of a file already in the page cache, so a
 * generous bound costs nothing while a bound of 3 would silently stop
 * repairing the day codex nests deeper.
 */
export const MAX_PARENT_HOPS = 8;

/**
 * Walk from a thread to the nearest ancestor a person can actually resume.
 *
 * PURE, and it is pure so that every one of its refusals can be ablated one
 * clause at a time by `npm run conformance:derived`. It reads no file and
 * opens no database: the caller injects both voices through `lookup`.
 *
 * EVERY REFUSAL LEAVES THE CALLER WITH NOTHING TO WRITE. `resolved` is null on
 * every verdict but `repaired`, so a caller cannot half-apply a walk that
 * stopped, and the bound in particular is a refusal rather than a truncation:
 * it never answers with the last id it happened to reach.
 */
export function walkToResumableThread(
  start: string,
  lookup: ChainLookup,
  maxHops: number = MAX_PARENT_HOPS
): ChainResult {
  const stop = (verdict: ChainVerdict, hops: number): ChainResult => ({
    verdict,
    resolved: null,
    hops
  });
  const first = lookup.classify(start);
  if (first === 'session') return stop('already-a-session', 0);
  if (first === 'absent') return stop('absent', 0);
  if (first === 'unknown') return stop('cannot-tell', 0);

  // Compared lower case, so a cycle spelled in two cases is caught by the SET
  // rather than by the counter.
  const visited = new Set<string>([start.toLowerCase()]);
  let cursor = start;
  let hops = 0;
  for (;;) {
    const parent = lookup.parentOf(cursor);
    if (parent === null) return stop('no-parent-named', hops);
    if (visited.has(parent.toLowerCase())) return stop('cycle', hops);
    hops += 1;
    if (hops > maxHops) return stop('over-bound', hops);
    const step = lookup.classify(parent);
    // A parent nothing can vouch for is not a parent this walk will hand over.
    // Proving it exists is the whole difference between a repair and a guess.
    if (step === 'absent') return stop('parent-missing', hops);
    if (step === 'unknown') return stop('cannot-tell', hops);
    if (step === 'session') return { verdict: 'repaired', resolved: parent, hops };
    visited.add(parent.toLowerCase());
    cursor = parent;
  }
}
