/**
 * snapshot.ts — record what a session's configuration was at the moment Tortie
 * launched it, without ever being able to affect that launch (Phase 22,
 * research 29 §8.2).
 *
 * ## The one thing to understand before changing anything here
 *
 * This module sits next to the session create path and the restore path, which
 * are the two most durability-critical paths in the application. It is
 * advisory. Its failure mode must be "no snapshot", never "no session".
 *
 * Four mechanisms enforce that, and they are listed in the order they fire.
 *
 * 1. **It is detached.** `recordLaunchContext` returns void and is called
 *    without `await`. The create path does not wait for the scan, so a scan
 *    that takes seven seconds on a cold page cache delays nothing. Research 29
 *    §2.5 measured the warm scan at about 15 ms and the CLI's own equivalent
 *    walk at 7.1 s on a cold cache, so the slow case is real.
 * 2. **It has a deadline.** The resolver is raced against
 *    `CONTEXT_SNAPSHOT_BUDGET_MS`. A resolver that never settles leaves no
 *    pending work behind, because the timer is cleared on both arms.
 * 3. **It cannot throw into its caller.** Every path is inside one try/catch
 *    that logs and returns. There is nothing for a caller to handle, which is
 *    why the function returns void rather than a result nobody would check.
 * 4. **It writes with the ordinary commit, not the durable one.** A lost
 *    snapshot costs an explanation. The durable commits in this codebase are
 *    for the writes whose loss costs a session or a conversation.
 *
 * ## Why the resolver is a port and not an import
 *
 * The thing that walks the agent's configuration directories lives in
 * `src/main/context/scan.ts` and `resolve.ts`, which are a different builder's
 * files in the same phase. Taking it by registration rather than by import
 * does three things at once. The snapshot writer compiles and its tests run
 * with no scanner present. A build where the scanner failed to register
 * degrades to "no snapshot" rather than to a crash on the create path. And the
 * unit tests drive a fake resolver, so the four rules above are tested against
 * a resolver that hangs, a resolver that throws and a resolver that returns
 * nonsense, none of which a real one can be made to do on demand.
 *
 * INTEGRATION SEAM. The scanner's owner calls `setContextResolver` once during
 * main-process boot, passing a function that resolves the effective set for
 * one agent in one directory. Until that call exists, every session gets a
 * NULL snapshot and the readout shows its unrecorded sentence, which is the
 * correct behaviour rather than a stub.
 *
 * ## What is deliberately absent
 *
 * There is no watcher here, no timer that re-snapshots a live session and no
 * event broadcast when a configuration file changes. Research 29 §8.4 refuses
 * all three. The snapshot is a record of THEN, and a record that updated
 * itself would be a record of now with an old timestamp on it.
 */

import {
  CONTEXT_SNAPSHOT_MAX_ENTRIES,
  CONTEXT_SNAPSHOT_VERSION,
  shortContextHash,
  type ContextCategory,
  type ContextEntryLike,
  type ContextSnapshot,
  type ContextSnapshotEntry
} from '@shared/context-snapshot';

/**
 * How long the resolver gets before the snapshot is abandoned.
 *
 * Research 29 §2.5 measured the warm in-process scan at 2.3 ms to 2.8 ms for
 * the filesystem read and about 15 ms for the full resolve, so this is roughly
 * two hundred times the expected cost. It is not a performance budget, it is a
 * leash: the case it exists for is a resolver that never settles at all, e.g.
 * a network mount that has gone away under one of the configuration roots.
 * Nothing waits on this timer, so a session that hits it is not delayed by it.
 */
export const CONTEXT_SNAPSHOT_BUDGET_MS = 3_000;

/** What the resolver is asked. */
export interface ContextResolveInput {
  /** The registry agent id the session launched under. */
  agent: string;
  /** The resolved working directory the session launched in. */
  cwd: string;
}

/** What the resolver answers. */
export interface ContextResolveResult {
  /**
   * The RESOLVED set, one row per effective thing, never the union. Research
   * 29 §4: a losing duplicate is not a row.
   *
   * Typed as `ContextEntryLike` so that `ContextEntry` from
   * `src/shared/context.ts` is assignable with no adapter. Every field beyond
   * the six the record keeps is dropped by `normalizeEntry`, including the
   * summary, the shadow list and the executable-content scan.
   */
  entries: readonly ContextEntryLike[];
  /**
   * Categories this resolver could not answer for.
   *
   * A first class value. An agent whose hook support is unverified must appear
   * here rather than be represented by an absence, because an absence reads as
   * "there were none" and that is a claim the resolver did not make.
   */
  unknown?: readonly ContextCategory[];
}

/** Resolve the effective configuration for one agent in one directory. */
export type ContextResolver = (
  input: ContextResolveInput
) => Promise<ContextResolveResult> | ContextResolveResult;

/** What the writer needs from the manifest, and nothing more. */
export interface ContextSnapshotSink {
  setContextSnapshot(id: string, snapshot: ContextSnapshot): unknown;
}

let resolver: ContextResolver | null = null;

/**
 * Install the resolver. Call once during main-process boot.
 *
 * Passing null removes it, which is what the tests do between cases and what a
 * build with no scanner is in permanently. There is no queue of pending
 * snapshots waiting for a resolver to arrive: a session that launched before
 * one was installed has no snapshot, and inventing one later from today's
 * files would put today's configuration under that session's start time.
 */
export function setContextResolver(next: ContextResolver | null): void {
  resolver = next;
}

/** True when a resolver is installed. Settings and the readout both ask. */
export function hasContextResolver(): boolean {
  return resolver !== null;
}

/**
 * Record the configuration this session launched with.
 *
 * CALL IT WITHOUT `await`. It returns void because there is no outcome a
 * caller may act on: a failure here is not the caller's problem and a success
 * changes nothing the caller does next. Awaiting it would make the launch wait
 * on a directory walk, which is the one thing rule 1 forbids.
 *
 * `reason` distinguishes the two legitimate call sites. 'create' is a session
 * being launched for the first time. 'restore' is a session coming back, which
 * re-snapshots because it genuinely re-reads its configuration.
 */
export function recordLaunchContext(
  sink: ContextSnapshotSink,
  input: ContextResolveInput & { sessionId: string; reason: 'create' | 'restore' }
): void {
  void captureAndStore(sink, input);
}

/**
 * The same work, awaitable, for the tests and for a smoke run that has to see
 * the result before it asserts on it.
 *
 * NOT FOR THE LAUNCH PATHS. `recordLaunchContext` is what they call, and the
 * absence of a return value there is what stops somebody awaiting it.
 */
export async function captureAndStore(
  sink: ContextSnapshotSink,
  input: ContextResolveInput & { sessionId: string; reason: 'create' | 'restore' }
): Promise<ContextSnapshot | null> {
  const snapshot = await captureContextSnapshot(input);
  if (snapshot === null) return null;
  try {
    sink.setContextSnapshot(input.sessionId, snapshot);
  } catch (err) {
    // SESSION_NOT_FOUND is the ordinary outcome, not an anomaly: the user can
    // discard a session between the launch and the scan finishing. Logged at
    // debug volume and never surfaced, because there is nothing for them to do
    // about a record of a session they just deleted.
    console.warn(
      `[gmux] context snapshot for ${input.sessionId} was not stored: ` +
        (err as Error).message
    );
    return null;
  }
  return snapshot;
}

/**
 * Run the resolver and build the record. Returns null for every failure.
 *
 * FIVE WAYS THIS RETURNS NULL, and each one is a state the readout has a
 * sentence for. No resolver is installed. The resolver threw. The resolver did
 * not settle inside the budget. The resolver returned something that is not a
 * result. The resolver returned entries but not one of them survived the field
 * checks, which means the scanner is producing a shape this build does not
 * understand and reporting an empty configuration would be a lie about the
 * session rather than about the scanner.
 */
export async function captureContextSnapshot(
  input: ContextResolveInput & { reason: 'create' | 'restore' }
): Promise<ContextSnapshot | null> {
  const active = resolver;
  if (active === null) return null;

  const startedAt = Date.now();
  let result: ContextResolveResult | null;
  try {
    result = await withDeadline(
      async () => active({ agent: input.agent, cwd: input.cwd }),
      CONTEXT_SNAPSHOT_BUDGET_MS
    );
  } catch (err) {
    console.warn(
      `[gmux] context snapshot for ${input.agent} in ${input.cwd} failed: ` +
        (err as Error).message
    );
    return null;
  }
  if (result === null) {
    console.warn(
      `[gmux] context snapshot for ${input.agent} in ${input.cwd} gave up ` +
        `after ${String(CONTEXT_SNAPSHOT_BUDGET_MS)} ms`
    );
    return null;
  }
  if (!Array.isArray(result.entries)) return null;

  const entries: ContextSnapshotEntry[] = [];
  for (const row of result.entries as readonly unknown[]) {
    const entry = normalizeEntry(row);
    if (entry === undefined) continue;
    entries.push(entry);
    if (entries.length >= CONTEXT_SNAPSHOT_MAX_ENTRIES) break;
  }
  if (entries.length === 0 && result.entries.length > 0) return null;

  const truncated = entries.length < result.entries.length;
  const unknown = normalizeUnknown(result.unknown);

  return {
    v: CONTEXT_SNAPSHOT_VERSION,
    at: startedAt,
    reason: input.reason,
    agent: input.agent,
    cwd: input.cwd,
    entries,
    ...(unknown.length > 0 ? { unknown } : {}),
    tookMs: Date.now() - startedAt,
    ...(truncated ? { truncated: true } : {})
  };
}

/**
 * One row, checked and folded to the six fields the record keeps.
 *
 * REBUILT RATHER THAN PASSED THROUGH, which is the opposite of what the column
 * codec in `manifest/context-snapshot.ts` does, and the difference is
 * deliberate. That one is reading a record a newer build may have written, so
 * an unknown field has to survive the round trip. This one is reading a live
 * `ResolvedEntry` from the scanner, which carries the summary, the shadow
 * list, the agent list and the executable-content scan. Copying those into the
 * manifest would put a per-session duplicate of the whole object model into
 * the one database whose loss costs the user their sessions.
 */
function normalizeEntry(value: unknown): ContextSnapshotEntry | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const o = value as Record<string, unknown>;
  const id = o['id'];
  const category = o['category'];
  const name = o['name'];
  const scope = o['scope'];
  const sourcePath = o['sourcePath'];
  const hash = o['hash'];
  if (typeof id !== 'string' || id.length === 0) return undefined;
  if (typeof category !== 'string') return undefined;
  if (typeof name !== 'string') return undefined;
  if (typeof scope !== 'string') return undefined;
  if (typeof sourcePath !== 'string') return undefined;
  return {
    id,
    category: category as ContextCategory,
    name,
    scope,
    sourcePath,
    // A row with no hash is kept, with an empty one. It is a real row that the
    // session really loaded, and the comparison reads the empty hash as
    // "cannot tell whether this changed" rather than as "unchanged".
    hash: typeof hash === 'string' ? shortContextHash(hash) : ''
  };
}

/** The unknown list, deduplicated and reduced to strings. */
function normalizeUnknown(
  value: readonly ContextCategory[] | undefined
): ContextCategory[] {
  if (!Array.isArray(value)) return [];
  const out = new Set<string>();
  for (const item of value as readonly unknown[]) {
    if (typeof item === 'string' && item.length > 0) out.add(item);
  }
  return [...out] as ContextCategory[];
}

/**
 * Run `work`, or give up after `ms` and return null.
 *
 * The timer is cleared on both arms, so a resolver that settles quickly leaves
 * no handle holding the event loop open. A resolver that never settles is
 * abandoned rather than cancelled, because a filesystem walk has no cancel and
 * pretending otherwise would be a second lie. It finishes into nothing.
 */
async function withDeadline<T>(
  work: () => Promise<T>,
  ms: number
): Promise<T | null> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race<T | null>([
      work(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          resolve(null);
        }, ms);
        // Do not let the deadline hold the process open at quit. The snapshot
        // is advisory, so losing it to a quit is the correct outcome.
        timer.unref?.();
      })
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
