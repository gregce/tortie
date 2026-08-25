/**
 * Where an agent keeps the record of one conversation, stamped on the session
 * projection (Phase 152).
 *
 * WHY THIS FILE HOLDS NO RESOLVER OF ITS OWN. Tortie already has exactly one
 * thing that turns a manifest row into a path on disk, being
 * `resolveSessionLog` in ../overview/reader. That function is the measured
 * output of research 63 and Phase 137: eleven providers, the manifest's own
 * store path hint first, then path arithmetic from the resolved cwd, then the
 * glob fallback, and a stat before it will call anything resolved. Writing a
 * second one here is what the growth guardrail in CLAUDE.md refuses, and it
 * would also mean two answers to one question. So this file is a cache and a
 * mapping, and every path it reports came from that resolver.
 *
 * WHY THERE IS A CACHE. The projection this stamps is `listSessions()`, which
 * runs on every broadcast, and a full resolve is a directory walk for some
 * providers. A resolved answer is re-checked with one `statSync`, which is the
 * same order of cost the neighbouring `savedOutputAt` already pays per row.
 *
 * WHY AN EMPTY ANSWER IS NOT SIMPLY RE-ASKED ON A FIXED CLOCK. The first
 * version of this file gave every empty answer the same twenty second window
 * and refreshed the clock on every row in the same pass, so every unresolved
 * row came due together and the walk they share ran again for all of them
 * inside one tick of the main process. Measured on the operator's own list on
 * 2026-08-25, that is one unresolved claude row costing 15.9 ms because
 * `~/.claude/projects` holds 2,642 directories and the resolver stats a
 * candidate in each of them, and thirteen such rows landing in the same pass.
 * The main process also runs one pty per attached session and flushes its
 * output on about an eight millisecond window, so a block there is stalled
 * terminal output and stalled keystrokes. Three things fix it and all three
 * are here: the wait carries a stable per session offset, so rows that once
 * came due together drift apart and stay apart; the wait grows after a row has
 * missed several times running, because a session that has had no record for a
 * minute is not the case the short window was written for; and a PASS over the
 * whole list carries a budget for re-asking, which the offset cannot give on
 * its own because a handful of rows still land together now and then. Over a
 * list shaped like the operator's own, the worst pass went from 541 ms to
 * 40 ms and the total over ten minutes from 13.6 s to 4.5 s.
 *
 * It writes nothing, opens no manifest and starts no process.
 */

import { statSync } from 'node:fs';
import type { Session, SessionRecordAbsence } from '@shared/types';
import { resolveSessionLog } from '../overview/reader';

/**
 * The longest an answer of "there is nothing on disk" stands before it is asked
 * again, while the session is still new. A claude conversation with no turns
 * yet becomes a file the moment the person sends their first message, so the
 * answer has to be able to change while the app stays open, and twenty seconds
 * is short enough that a person who sends a message and then opens the menu
 * sees the truth.
 */
const TTL_MS = 20_000;

/**
 * How many empty answers in a row a session gets at the full rate before the
 * wait starts growing. Three of them is a minute of asking every twenty
 * seconds, which covers the case the short window exists for, being a session
 * a person has just started and is about to type into.
 */
const STEADY_MISSES = 3;

/** The longest Tortie ever waits before asking again. */
const MAX_WAIT_MS = 120_000;

/**
 * A small stable number from a session id. It is not a hash for any security
 * purpose, it only has to spread ids apart and give the same answer every time
 * for the same id, so two rows that missed in the same pass stop coming due in
 * the same pass. FNV-1a, kept here rather than reaching for node:crypto,
 * because this runs once per row per broadcast.
 */
function spread(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * How long this session's empty answer stands. It never exceeds
 * {@link TTL_MS} while the session is new, so the promise above still holds,
 * and the offset only ever makes the wait SHORTER than the ceiling it is taken
 * from. Every session has its own offset and its own period, so rows that once
 * came due together drift apart and stay apart.
 */
function waitFor(id: string, misses: number): number {
  const doublings = Math.min(Math.max(misses - STEADY_MISSES, 0), 8);
  const ceiling = Math.min(TTL_MS * 2 ** doublings, MAX_WAIT_MS);
  const half = Math.floor(ceiling / 2);
  return ceiling - (spread(id) % half);
}

interface Cached {
  /** Everything the answer depends on. A change to any of it recomputes. */
  key: string;
  at: number;
  path: string | null;
  absence: SessionRecordAbsence | null;
  /** Empty answers in a row for this key. Zero once a path is found. */
  misses: number;
}

const cache = new Map<string, Cached>();

/** Test seam. The projection never passes one. */
export function clearRecordPathCache(): void {
  cache.clear();
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function computed(session: Session): { path: string | null; absence: SessionRecordAbsence | null } {
  // A shell has no conversation, so there is nothing an agent could have
  // written and no lookup to do.
  if (session.agent === 'shell') return { path: null, absence: 'shell' };
  // PHASE 72 AND 152 TOGETHER. A session on another machine keeps its record on
  // that machine. Looking on this Mac would at best find nothing and at worst
  // find a file that carries the same id under this home directory, and a path
  // that opens the wrong conversation is worse than no path. The overview
  // service refuses the same row for the same reason.
  if (session.machine !== undefined) return { path: null, absence: 'remote' };
  const id = session.agentSessionId;
  if (id === undefined || id === '') return { path: null, absence: 'no-id' };
  // DEFENCE IN DEPTH, and it is not reachable today. The resolver joins the id
  // into a path and stats the result, so an id shaped like `../../..` would
  // name a file under no agent store at all, and this phase is what would then
  // put that path in front of a person and on their clipboard. Nothing can put
  // such an id in the manifest, because every harvest anchors it to `UUID_RE`
  // and the pre-assigned ids are generated. This is here so that stays true
  // whatever a later round does to the harvest, and it refuses only shapes no
  // agent has ever used.
  if (id.includes('/') || id.includes('\\') || id === '.' || id === '..') {
    return { path: null, absence: 'no-id' };
  }

  const location = resolveSessionLog({
    agent: session.agent,
    agentSessionId: id,
    cwd: session.cwd,
    createdAt: session.createdAt,
    // The projection carries no provenance, so the hint is skipped and the
    // resolver falls through to its path arithmetic. That is the same answer
    // by a longer road rather than a different answer.
    storePathHint: null
  });

  switch (location.state) {
    case 'resolved':
      return { path: location.file, absence: null };
    // The record exists and it is this conversation's. What is wrong is that
    // the conversation names a different folder, which is a fact about the
    // agent rather than about the file, and the path still opens. Catch Me Up
    // says the rest; a copy verb hands over the path it proved.
    case 'wrong-conversation':
      return { path: location.file, absence: null };
    case 'no-file':
      return { path: null, absence: 'not-yet' };
    case 'no-store':
      return { path: null, absence: 'no-store' };
    case 'unsupported':
      return { path: null, absence: 'unsupported' };
  }
}

/**
 * How long ONE pass over the whole list may spend re-asking about rows it has
 * already asked about. It bounds the block whatever the list holds, which the
 * spreading above cannot do on its own: eighteen unresolved claude rows spread
 * across a twenty second window still land four or five deep in the same second
 * now and then, measured at 160 ms on 2026-08-25. It is a budget on RE-asking
 * only. A row Tortie has never asked about is always asked, because there is no
 * earlier answer to stand in for it and a made up one would tell a person
 * something untrue.
 *
 * WHAT IT BOUNDS THE PASS TO, said honestly. The budget is checked before a row
 * is re-asked and not while it is being asked, so one row may always start on
 * the last tenth of a millisecond and run to the end. The bound is therefore
 * this budget plus the cost of ONE resolve, which over the shape measured on
 * 2026-08-25 is a worst pass of 39 ms against 160 ms with the spreading alone
 * and 106 ms before either. Getting under one resolve means making the resolve
 * itself cheaper, which is Phase 137's resolver and its own conformance gate
 * rather than this phase's file.
 */
const REFRESH_BUDGET_MS = 20;

interface Budget {
  left: number;
}

/**
 * One session in, the same session plus `recordPath` or `recordAbsence` out.
 *
 * Exactly one of the two is always set, so a surface that draws neither is
 * looking at a bug rather than at a quiet row.
 */
export function stampRecordLocation(session: Session, now = Date.now()): Session {
  return stampOne(session, now, null);
}

/**
 * The whole list in one call, which is what the projection uses. It is a
 * separate entry point because the budget above belongs to a PASS rather than
 * to a row, and a row on its own has no pass to spend from.
 */
export function stampRecordLocations(sessions: readonly Session[], now = Date.now()): Session[] {
  const budget: Budget = { left: REFRESH_BUDGET_MS };
  return sessions.map((one) => stampOne(one, now, budget));
}

function stampOne(session: Session, now: number, budget: Budget | null): Session {
  const key = [
    session.agent,
    session.agentSessionId ?? '',
    session.cwd,
    session.machine?.id ?? ''
  ].join(' ');
  const prior = cache.get(session.id);
  const same = prior !== undefined && prior.key === key;
  let answer: { path: string | null; absence: SessionRecordAbsence | null } | null = null;
  if (same) {
    if (prior.path !== null) {
      // One stat, so a file the agent deleted stops being offered.
      if (isFile(prior.path)) answer = { path: prior.path, absence: null };
    } else if (now - prior.at < waitFor(session.id, prior.misses)) {
      answer = { path: null, absence: prior.absence };
    }
  }
  if (answer === null && same && prior.path === null && budget !== null && budget.left <= 0) {
    // This pass has spent its budget. The row keeps the answer it already had
    // and comes due again on the next pass, which is a delay of one broadcast
    // rather than a wrong answer. Its clock is deliberately NOT reset, so it
    // stays at the front of the queue.
    answer = { path: null, absence: prior.absence };
  }
  if (answer === null) {
    const started = performance.now();
    answer = computed(session);
    if (budget !== null) budget.left -= performance.now() - started;
    cache.set(session.id, {
      key,
      at: now,
      path: answer.path,
      absence: answer.absence,
      // A run of empty answers for one unchanged key is what slows the asking
      // down. Anything else starts the count again: a found path, a changed
      // key, a session Tortie has not seen before.
      misses: answer.path !== null ? 0 : same ? prior.misses + 1 : 1
    });
  }
  return answer.path !== null
    ? { ...session, recordPath: answer.path }
    : { ...session, recordAbsence: answer.absence ?? 'not-yet' };
}
