/**
 * The session manager's counts (Phase 293): `overview:activity`.
 *
 * One call answers the sessions it is handed BY ID, one row per asked id in
 * the asked order, whatever project or machine each belongs to and whether or
 * not it was removed. For each it says how many messages the current
 * conversation holds and when the last one was, or says why it cannot.
 *
 * Like every read in this directory it lists manifest rows READ ONLY, opens
 * agent logs read only through the keep map, and writes only Tortie's own
 * overview store. It never opens the manifest writable, never spawns an
 * agent, never touches tmux, never runs git and never changes a session's
 * state. It carries no text of any conversation: the store counts inside
 * SQLite and hands back numbers and clocks.
 *
 * THE SHAPE, in order.
 *
 *  1. Refuse an input that is not a list of at most
 *     OVERVIEW_ACTIVITY_MAX_IDS members. Refused whole, because a clipped
 *     answer would leave the rows past the clip waiting with no reason.
 *  2. Read each asked id's manifest row by id, a removed row INCLUDED. The
 *     page's read and the fold's read skip removed rows and still do. This
 *     one does not, because Details on a Past row asks about exactly those.
 *     What that changes is stated: the store gains rows for removed
 *     sessions, which the manifest prunes after its own window and this
 *     store never prunes.
 *  3. Decide what needs no read at all: an id this Mac does not know, a
 *     session on another machine, a shell, a session with no conversation id.
 *  4. Bring every other row up to date through the ONE read path, one row at
 *     a time, yielding to the event loop between rows. The read is
 *     synchronous file work, and a hundred rows in one task would hold main
 *     still for as long as they take.
 *  5. Ask the store for the aggregate of those ids, in one read transaction.
 *  6. Map each row through the truth table in ./activity-map.ts.
 *
 * CALLS RUN ONE AT A TIME. Step 4 yields, so without a queue a second call
 * could start reading between two rows of the first. They would race the same
 * store rows, and a session both calls named would be read twice at once. One
 * module-level chain serialises them. A call that rejects does not poison the
 * chain, and the next one runs.
 */

import {
  OVERVIEW_ACTIVITY_MAX_IDS,
  type OverviewActivity,
  type OverviewActivityInput,
  type OverviewSessionActivity
} from '@shared/overview';
import { LOCAL_MACHINE_ID } from '@shared/workspace-target';
import { gmuxError } from '../errors';
import type { ManifestSessionRecord } from '../manifest';
import {
  classifyActivityRow,
  toActivity,
  type ActivityRowFacts
} from './activity-map';
import { refreshRowForActivity, type OverviewServiceDeps } from './service';
import type { StoredActivity } from './store';

/** The tail of the queue. It never rejects, so a failed call cannot stop the next. */
let queue: Promise<void> = Promise.resolve();

/**
 * One row per asked id, in the asked order.
 *
 * @throws INVALID_INPUT for an input that holds no array, or an array longer
 *   than OVERVIEW_ACTIVITY_MAX_IDS. A member that is not a string is dropped,
 *   and a repeated id is answered once, at its first position.
 */
export function sessionActivity(
  deps: OverviewServiceDeps,
  input: OverviewActivityInput
): Promise<OverviewActivity> {
  let ids: string[];
  try {
    ids = askedIds(input);
  } catch (err) {
    // A refusal costs nothing and reads nothing, so it does not wait its turn.
    return Promise.reject(err);
  }
  const run = queue.then(() => readActivity(deps, ids));
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

/** The ids as asked: strings only, first position wins. */
function askedIds(input: unknown): string[] {
  const list =
    typeof input === 'object' && input !== null
      ? (input as { sessionIds?: unknown }).sessionIds
      : undefined;
  if (!Array.isArray(list)) {
    throw gmuxError(
      'INVALID_INPUT',
      'Tortie was asked for session activity with no list of sessions.'
    );
  }
  if (list.length > OVERVIEW_ACTIVITY_MAX_IDS) {
    throw gmuxError(
      'INVALID_INPUT',
      `Tortie was asked for the activity of ${String(list.length)} sessions ` +
        `at once. The most one call may name is ${String(OVERVIEW_ACTIVITY_MAX_IDS)}.`
    );
  }
  const seen = new Set<string>();
  for (const member of list) {
    if (typeof member === 'string') seen.add(member);
  }
  return [...seen];
}

/** What the manifest says about one asked id, or that it says nothing. */
function factsOf(
  id: string,
  row: ManifestSessionRecord | undefined
): ActivityRowFacts {
  if (row === undefined) {
    return {
      id,
      agent: '',
      machineId: LOCAL_MACHINE_ID,
      agentSessionId: null,
      known: false
    };
  }
  return {
    id,
    agent: row.agent,
    machineId: row.machineId ?? LOCAL_MACHINE_ID,
    agentSessionId: row.agentSessionId ?? null,
    known: true
  };
}

/** One turn of the event loop, so main can answer something else between rows. */
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

async function readActivity(
  deps: OverviewServiceDeps,
  ids: readonly string[]
): Promise<OverviewActivity> {
  const now = (deps.now ?? Date.now)();
  if (ids.length === 0) return { readAt: now, sessions: [] };

  const manifest = await deps.manifest();

  // Steps 2 and 3. The manifest is asked by id, so one asked id costs one
  // indexed row and the call never decodes every session Tortie has recorded.
  const facts = new Map<string, ActivityRowFacts>();
  const settled = new Map<string, OverviewSessionActivity>();
  const toRead: ManifestSessionRecord[] = [];
  for (const id of ids) {
    const row = manifest.getSession(id);
    const rowFacts = factsOf(id, row);
    facts.set(id, rowFacts);
    const classified = classifyActivityRow(rowFacts);
    if (classified !== null) settled.set(id, classified);
    else if (row !== undefined) toRead.push(row);
  }

  // Steps 4 and 5. The store opens here and not above, so a call made wholly
  // of shells and sessions on other machines never opens it.
  const stored = new Map<string, StoredActivity>();
  if (toRead.length > 0) {
    const store = deps.store();
    const recordedProviders = new Set<string>();
    let first = true;
    for (const row of toRead) {
      if (!first) await yieldToEventLoop();
      first = false;
      refreshRowForActivity(deps, store, row, recordedProviders, now);
    }
    for (const found of store.listActivity(toRead.map((row) => row.id))) {
      stored.set(found.sessionId, found);
    }
  }

  // Step 6, in the asked order.
  const sessions: OverviewSessionActivity[] = [];
  for (const id of ids) {
    const rowFacts = facts.get(id);
    if (rowFacts === undefined) continue;
    sessions.push(settled.get(id) ?? toActivity(rowFacts, stored.get(id)));
  }
  return { readAt: now, sessions };
}
