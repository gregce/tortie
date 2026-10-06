/**
 * THE SCREEN'S ONE WATCHER: a session's screen, answered to the phone as a long
 * poll (Phase 337, build/p337/SPEC.md §5.3.2, D3, D4, D13 to D15, D40;
 * §Attack A6, A7, A8, A13).
 *
 * `/v1/screen` names a session and, optionally, the revision the phone already
 * holds. The answer goes AT ONCE when the phone holds no revision or an old one;
 * otherwise the poll is HELD until the screen moves or `SCREEN_HOLD_MS`
 * passes, inside the door's 15 s answer timer, and then says `unchanged`.
 *
 * ONE ENTRY PER SESSION WITH A POLL WAITING. However many polls wait on a
 * session, ONE reader reads it, at most once a tick, and every waiting poll is
 * answered from its reading. An entry with no poll waiting is dropped at once,
 * so nothing is read for a session nobody is looking at.
 *
 * THE READS. At most one a tick (`SCREEN_TICK_MS` on this Mac;
 * `SCREEN_TICK_REMOTE_MS` on another machine and while the control client is
 * down, §Attack A8), never sooner than `max(tick, 4 × the last compose)` after
 * the last (the duty cycle, D15), and NEVER WHILE ANOTHER READ OF THE SAME
 * SESSION IS IN FLIGHT (§Attack A7). Every read races its deadline; one past it
 * counts as not read, the entry keeps its last reading, and the slot stays
 * taken until the read settles, so reads never pile up. The composer runs only
 * when the revision moves (D14).
 *
 * A POLL IS ANSWERED FROM ITS OWN TIMER AND NEVER AWAITS A READ (D3, §Attack
 * A7). Each tick of its own `SCREEN_TICK_MS` timer asks `closing()` (the quit,
 * or the door that accepted the request stopping), the hold's end and the
 * session's latest reading, so a remote read in flight (deadline 2 s) can never
 * hold a poll past the door's stop join; a read that lands with a new revision
 * asks every waiting poll the same questions at once.
 *
 * THE SETTLE (D4, §Attack A6). The keys verb nudges the session after its act
 * with the window mark of its own fresh read (`nudge(id, before)`). The next
 * read is `SCREEN_NUDGE_MS` later, and NO POLL OF THE SESSION, held or stale, is
 * answered until the first read started after the nudge whose window mark is
 * not `before`, or the first read starting `SCREEN_SETTLE_MS` or more after the
 * nudge; `closing()` and the hold's end still answer at once. So a picture that
 * answers a key shows the agent's redraw when it redraws within 300 ms, and is
 * never the moved question id over the old window, against which the next key
 * inside a question would be refused.
 *
 * A FLOOR BETWEEN ANSWERS (D40, §Attack A13). A poll HELD on a current revision
 * is answered no sooner than `SCREEN_MIN_ANSWER_GAP_MS` after it arrived, so a
 * spinner is answered about four times a second to each phone, not ten; a poll
 * arriving with a stale revision is answered at once, whatever any other phone
 * was answered; and the answer that ends a settle goes at once, so a typed
 * key's echo is never held for the floor.
 *
 * THE REVISION (D14) is 12 lowercase hex of sha256 over the session's id, the
 * raw styled capture, the second display line, the question id, whether the
 * session waits on him (`needs_input`, which with the capture decides
 * `asking`) and whether it takes keys. An absence's revision is its word's.
 *
 * It logs nothing, reads no error's text, holds nothing on disk and sets no
 * status.
 */

import { createHash } from 'node:crypto';
import type { PocketScreen, PocketScreenAbsence, PocketScreenAnswer } from '@shared/ipc/pocket';
import { SCREEN_ENDED, SCREEN_TOO_LARGE, SCREEN_UNREACHABLE } from '@shared/screen-copy';
import type { Session } from '@shared/types';
import { readScreenRemote } from '../machines/remote-screen';
import { screenLive } from '../pocket/routes';
import type { QuestionIds } from '../reply/question-id';
import { composeScreen } from './compose';
import { readScreenLocal, type ScreenCore, type ScreenReading } from './read';

export type { ScreenCore, ScreenReading } from './read';

/** A poll's own timer, and a session's read cadence on this Mac. */
export const SCREEN_TICK_MS = 100;
/** A session's read cadence on another machine, and on this Mac while the control client is down (§Attack A8). */
export const SCREEN_TICK_REMOTE_MS = 400;
/** How long a poll on a current revision is held before it answers `unchanged` (D3). */
export const SCREEN_HOLD_MS = 10_000;
/** A nudged session's next read, after the keys were handed to tmux (D4). */
export const SCREEN_NUDGE_MS = 30;
/** The longest a nudged session's polls wait for the agent's redraw (D4, §Attack A6). */
export const SCREEN_SETTLE_MS = 300;
/** The floor under a held poll's answer (D40, §Attack A13). */
export const SCREEN_MIN_ANSWER_GAP_MS = 250;
/** A read of a session on this Mac past this counts as not read. */
export const SCREEN_LOCAL_READ_DEADLINE_MS = 1_000;
/** A read of a session on another machine past this counts as not read. */
export const SCREEN_REMOTE_READ_DEADLINE_MS = 2_000;
/** The duty cycle (D15): after a read that composed, the next is not before this many composes have passed. */
export const SCREEN_DUTY_FACTOR = 4;

/** What the watcher is built with. Production passes `core` and `turns` alone. */
export interface ScreenWatchDeps {
  core(): ScreenCore | null;
  /** The one question id counter (`replyTurns`). */
  turns: QuestionIds;
  /** Tests inject. Production: `readScreenLocal`. */
  readLocal?: (core: ScreenCore, tmuxId: string) => Promise<ScreenReading | null>;
  /** Tests inject. Production: `readScreenRemote` under `SCREEN_REMOTE_READ_DEADLINE_MS`. */
  readRemote?: (sessionId: string) => Promise<ScreenReading | 'unreachable'>;
  /** A monotonic clock in ms. Production: `performance.now()`. */
  now?(): number;
}

/** The watcher's three verbs. */
export interface ScreenWatch {
  answer(session: Session, since: string | null, closing: () => boolean): Promise<PocketScreenAnswer>;
  /**
   * A keys write just reached this session: read it 30 ms from now, and answer
   * its waiting polls at the first read whose window mark is not `before` (the
   * keys verb's own fresh read's), or at the first read starting
   * SCREEN_SETTLE_MS or more after now (D4).
   */
  nudge(sessionId: string, before: string): void;
  /** For the keys verb's final check: one fresh reading, never cached. */
  readFresh(session: Session): Promise<ScreenReading | 'unreachable' | null>;
}

/** What a session's screen is now, as the polls are answered from it. */
interface State {
  readonly revision: string;
  /** The screen, or null with `why`. */
  readonly screen: PocketScreen | null;
  readonly why: PocketScreenAbsence | null;
  /** The window's mark of the read, or null for an absence (any absence ends a settle). */
  readonly mark: string | null;
  /** Set by the read that ended a settle: its answer is not held for the floor. */
  readonly endsSettle: boolean;
}

/** One waiting poll. */
interface Poll {
  readonly sessionId: string;
  readonly since: string | null;
  readonly arrivedAt: number;
  readonly closing: () => boolean;
  /** Its revision was compared with a reading yet. */
  compared: boolean;
  /** At that first comparison, its revision was current: it is held, and the floor holds it. */
  held: boolean;
  done: boolean;
  readonly resolve: (answer: PocketScreenAnswer) => void;
  timer: ReturnType<typeof setInterval> | null;
  floor: ReturnType<typeof setTimeout> | null;
}

/** One session with a poll waiting. */
interface Entry {
  readonly sessionId: string;
  /** The row the first poll was asked for; the row is read again by id at every read. */
  readonly session: Session;
  readonly polls: Set<Poll>;
  state: State | null;
  timer: ReturnType<typeof setTimeout> | null;
}

/** A session's pace, kept across its entries so a new poll cannot step around the duty cycle. */
interface Pace {
  /** When the last read started. */
  lastReadAt: number;
  /** The earliest the next read may start. */
  nextReadAt: number;
  /** What the last composition cost, in ms. */
  lastComposeMs: number;
  /** The last screen state composed, so an unchanged revision is not composed twice. */
  last: State | null;
  /**
   * The session's latest state, whatever it was, and when the read that made it
   * started: a poll that arrives within a tick of it is answered from it as a
   * poll on a live entry would be, so a phone's next poll is neither read for
   * early nor held without its floor.
   */
  latest: { readonly state: State; readonly at: number } | null;
}

/** A nudged session, until its settle ends. */
interface Settle {
  readonly before: string;
  readonly at: number;
  /** The reads started before the nudge, by their order: none of them may end the settle. */
  readonly afterRead: number;
}

/** The revision of anything: sha256 over length-prefixed parts, 12 lowercase hex (D14). */
export function screenRevisionOf(parts: readonly string[]): string {
  const hash = createHash('sha256');
  for (const part of parts) hash.update(`${String(part.length)}:${part};`, 'utf8');
  return hash.digest('hex').slice(0, 12);
}

/** A reading's revision (D14). */
export function readingRevisionOf(
  sessionId: string,
  reading: ScreenReading,
  turn: string,
  waitsOnHim: boolean,
  typable: boolean
): string {
  return screenRevisionOf([
    sessionId,
    'screen',
    reading.styled,
    reading.displayLine,
    turn,
    waitsOnHim ? '1' : '0',
    typable ? '1' : '0'
  ]);
}

/** Main's words for an absence. */
const ABSENCE_SENTENCES: Readonly<Record<PocketScreenAbsence, string>> = Object.freeze({
  ended: SCREEN_ENDED,
  unreachable: SCREEN_UNREACHABLE,
  large: SCREEN_TOO_LARGE
});

/** An absence's state. */
function absence(sessionId: string, why: PocketScreenAbsence, revision?: string): State {
  return {
    revision: revision ?? screenRevisionOf([sessionId, why]),
    screen: null,
    why,
    mark: null,
    endsSettle: false
  };
}

export function createScreenWatch(deps: ScreenWatchDeps): ScreenWatch {
  const now = deps.now ?? ((): number => performance.now());
  const readLocal = deps.readLocal ?? ((core: ScreenCore, tmuxId: string) => readScreenLocal(core, tmuxId));
  const readRemote =
    deps.readRemote ?? ((sessionId: string) => readScreenRemote(sessionId, SCREEN_REMOTE_READ_DEADLINE_MS));

  const entries = new Map<string, Entry>();
  /** ONE read in flight per session, held from its start until it settles, whatever its deadline said. */
  const inFlight = new Set<string>();
  const paces = new Map<string, Pace>();
  const settles = new Map<string, Settle>();
  /** Every read, and every check of a row, in the order it started: a settle asks for one started AFTER its nudge. */
  let reads = 0;

  const rowOf = (core: ScreenCore | null, entry: Entry): Session | null =>
    core === null ? entry.session : (core.listSessions().find((s) => s.id === entry.sessionId) ?? null);

  const remoteRow = (row: Session): boolean => row.machine !== undefined;

  const tickOf = (core: ScreenCore | null, row: Session | null): number =>
    row !== null && !remoteRow(row) && core !== null && core.control.connected ? SCREEN_TICK_MS : SCREEN_TICK_REMOTE_MS;

  const paceOf = (sessionId: string): Pace => {
    let pace = paces.get(sessionId);
    if (pace === undefined) {
      pace = { lastReadAt: -Infinity, nextReadAt: -Infinity, lastComposeMs: 0, last: null, latest: null };
      paces.set(sessionId, pace);
    }
    return pace;
  };

  /** Forget the pace and settle of sessions nobody has looked at for a whole hold. */
  const prune = (t: number): void => {
    for (const [id, pace] of paces) {
      if (!entries.has(id) && !inFlight.has(id) && t - pace.lastReadAt > SCREEN_HOLD_MS) paces.delete(id);
    }
    for (const [id, settle] of settles) {
      if (t - settle.at > SCREEN_HOLD_MS) settles.delete(id);
    }
  };

  const answerOf = (sessionId: string, state: State, unchanged: boolean): PocketScreenAnswer => ({
    sessionId,
    revision: state.revision,
    at: Date.now(),
    unchanged,
    screen: unchanged ? null : state.screen,
    why: unchanged ? null : state.why,
    sentence: unchanged || state.why === null ? null : ABSENCE_SENTENCES[state.why]
  });

  const finish = (poll: Poll, answer: PocketScreenAnswer): void => {
    if (poll.done) return;
    poll.done = true;
    if (poll.timer !== null) clearInterval(poll.timer);
    if (poll.floor !== null) clearTimeout(poll.floor);
    poll.timer = null;
    poll.floor = null;
    const entry = entries.get(poll.sessionId);
    if (entry !== undefined) {
      entry.polls.delete(poll);
      if (entry.polls.size === 0) drop(entry);
    }
    poll.resolve(answer);
  };

  /** No poll waits on this session: nothing more is read for it. */
  const drop = (entry: Entry): void => {
    if (entry.timer !== null) clearTimeout(entry.timer);
    entry.timer = null;
    if (entries.get(entry.sessionId) === entry) entries.delete(entry.sessionId);
  };

  /** The answer at the hold's end or under `closing()`: what was last read. */
  const lastAnswer = (poll: Poll, entry: Entry | undefined): PocketScreenAnswer => {
    const state = entry?.state ?? null;
    if (state === null) {
      // No reading at all by the hold's end: a live row is unreachable.
      return answerOf(poll.sessionId, absence(poll.sessionId, 'unreachable'), false);
    }
    return answerOf(poll.sessionId, state, state.revision === poll.since);
  };

  /**
   * ONE POLL'S QUESTIONS, asked by its own timer and after every read that
   * lands. It awaits nothing.
   */
  const evaluate = (poll: Poll): void => {
    if (poll.done) return;
    const entry = entries.get(poll.sessionId);
    const t = now();
    if (poll.closing() || t - poll.arrivedAt >= SCREEN_HOLD_MS) {
      finish(poll, lastAnswer(poll, entry));
      return;
    }
    const state = entry?.state ?? null;
    if (state === null) return;
    if (!poll.compared) {
      poll.compared = true;
      poll.held = poll.since === state.revision;
    }
    // THE SETTLE: nothing of a nudged session is answered until its redraw.
    if (settles.has(poll.sessionId)) return;
    if (state.revision === poll.since) return;
    // THE FLOOR: a held poll waits out its gap, unless this answers a key.
    if (poll.held && t - poll.arrivedAt < SCREEN_MIN_ANSWER_GAP_MS && !state.endsSettle) return;
    finish(poll, answerOf(poll.sessionId, state, false));
  };

  const evaluateAll = (entry: Entry): void => {
    for (const poll of [...entry.polls]) evaluate(poll);
  };

  /** A new state for a session, from the read numbered `read` that started at `startedAt`, and the settle it may end. */
  const settleWith = (entry: Entry, state: State, read: number, startedAt: number): void => {
    const settle = settles.get(entry.sessionId);
    let ends = false;
    if (settle !== undefined && read > settle.afterRead) {
      if (state.mark === null || state.mark !== settle.before || startedAt - settle.at >= SCREEN_SETTLE_MS) {
        settles.delete(entry.sessionId);
        ends = true;
      }
    }
    entry.state = ends ? { ...state, endsSettle: true } : state.endsSettle ? { ...state, endsSettle: false } : state;
    paceOf(entry.sessionId).latest = { state: entry.state, at: startedAt };
    evaluateAll(entry);
  };

  /** What a read brought, applied to the session's entry if a poll still waits on it. */
  const apply = (sessionId: string, outcome: ScreenReading | 'unreachable' | null, read: number, startedAt: number): void => {
    const entry = entries.get(sessionId);
    if (entry === undefined || outcome === null) return;
    if (outcome === 'unreachable') {
      settleWith(entry, absence(sessionId, 'unreachable'), read, startedAt);
      return;
    }
    const core = deps.core();
    const row = rowOf(core, entry);
    if (row === null || !screenLive(row)) {
      settleWith(entry, absence(sessionId, 'ended'), read, startedAt);
      return;
    }
    const pace = paceOf(sessionId);
    const turn = deps.turns.current(sessionId).id;
    // A read that succeeded is a session that takes keys now: live, not
    // unknown, and on another machine read through its live address.
    const typable = true;
    const revision = readingRevisionOf(sessionId, outcome, turn, row.status === 'needs_input', typable);
    let state: State;
    if (pace.last !== null && pace.last.revision === revision) {
      state = pace.last;
    } else {
      const t0 = now();
      const composed = composeScreen(outcome, { turn, status: row.status, typable });
      const ms = Math.max(0, now() - t0);
      pace.lastComposeMs = ms;
      pace.nextReadAt = Math.max(pace.nextReadAt, startedAt + Math.max(tickOf(core, row), SCREEN_DUTY_FACTOR * ms));
      state =
        composed === 'large'
          ? absence(sessionId, 'large', revision)
          : { revision, screen: composed.screen, why: null, mark: composed.mark, endsSettle: false };
      pace.last = state;
    }
    settleWith(entry, state, read, startedAt);
  };

  /** Start one read of the session, raced against its deadline; the slot is held until it settles. */
  const startRead = (entry: Entry, core: ScreenCore, row: Session): void => {
    const sessionId = entry.sessionId;
    const remote = remoteRow(row);
    const tmuxId = remote ? null : core.tmuxIdOf(sessionId);
    if (!remote && tmuxId === null) return;
    const pace = paceOf(sessionId);
    const startedAt = now();
    reads += 1;
    const read = reads;
    pace.lastReadAt = startedAt;
    pace.nextReadAt = startedAt + Math.max(tickOf(core, row), SCREEN_DUTY_FACTOR * pace.lastComposeMs);
    inFlight.add(sessionId);
    const reading: Promise<ScreenReading | 'unreachable' | null> =
      tmuxId === null ? readRemote(sessionId) : readLocal(core, tmuxId);
    const settled = reading.then(
      (value) => value,
      () => null
    );
    let deadline: ReturnType<typeof setTimeout> | null = null;
    const late = new Promise<'late'>((resolve) => {
      deadline = setTimeout(() => resolve('late'), remote ? SCREEN_REMOTE_READ_DEADLINE_MS : SCREEN_LOCAL_READ_DEADLINE_MS);
    });
    // The slot is given back when the read itself settles, never at its deadline.
    void settled.finally(() => {
      inFlight.delete(sessionId);
    });
    void Promise.race([settled, late]).then((outcome) => {
      if (deadline !== null) clearTimeout(deadline);
      // Past its deadline a read counts as not read; the entry keeps its last reading.
      if (outcome === 'late') return;
      apply(sessionId, outcome, read, startedAt);
    });
  };

  const schedule = (entry: Entry, delay: number): void => {
    if (entries.get(entry.sessionId) !== entry) return;
    if (entry.timer !== null) clearTimeout(entry.timer);
    entry.timer = setTimeout(() => {
      entry.timer = null;
      pump(entry);
    }, Math.max(0, delay));
  };

  /** The session's read loop: the row asked again, then at most one read, never two at once. */
  const pump = (entry: Entry): void => {
    if (entries.get(entry.sessionId) !== entry) return;
    if (entry.polls.size === 0) {
      drop(entry);
      return;
    }
    const core = deps.core();
    const row = rowOf(core, entry);
    if (row === null || !screenLive(row)) {
      // Not running: `ended`, read from the row and never from tmux.
      reads += 1;
      settleWith(entry, absence(entry.sessionId, 'ended'), reads, now());
      schedule(entry, tickOf(core, row));
      return;
    }
    const tick = tickOf(core, row);
    if (core === null || inFlight.has(entry.sessionId)) {
      // A nudged session asks again soon, so its first read after the act is
      // not a whole tick behind a read that was already out.
      schedule(entry, settles.has(entry.sessionId) ? SCREEN_NUDGE_MS : tick);
      return;
    }
    const pace = paceOf(entry.sessionId);
    const t = now();
    if (t < pace.nextReadAt) {
      schedule(entry, pace.nextReadAt - t);
      return;
    }
    startRead(entry, core, row);
    schedule(entry, Math.max(tick, pace.nextReadAt - t));
  };

  return {
    answer(session: Session, since: string | null, closing: () => boolean): Promise<PocketScreenAnswer> {
      return new Promise<PocketScreenAnswer>((resolve) => {
        const t = now();
        prune(t);
        const poll: Poll = {
          sessionId: session.id,
          since,
          arrivedAt: t,
          closing,
          compared: false,
          held: false,
          done: false,
          resolve,
          timer: null,
          floor: null
        };
        let entry = entries.get(session.id);
        const fresh = entry === undefined;
        if (entry === undefined) {
          entry = { sessionId: session.id, session, polls: new Set(), state: null, timer: null };
          entries.set(session.id, entry);
          const pace = paceOf(session.id);
          // A new entry after a nudge waits for the nudge's read, as an entry would have.
          const settle = settles.get(session.id);
          if (settle !== undefined) pace.nextReadAt = Math.max(pace.nextReadAt, settle.at + SCREEN_NUDGE_MS);
          // A reading younger than a tick is what a live entry would answer from.
          const core = deps.core();
          if (pace.latest !== null && t - pace.latest.at <= tickOf(core, rowOf(core, entry))) entry.state = pace.latest.state;
        }
        entry.polls.add(poll);
        // ITS OWN TIMER: each tick asks closing(), the hold's end and the latest reading, and awaits nothing.
        poll.timer = setInterval(() => evaluate(poll), SCREEN_TICK_MS);
        poll.floor = setTimeout(() => evaluate(poll), SCREEN_MIN_ANSWER_GAP_MS);
        evaluate(poll);
        if (fresh && !poll.done) pump(entry);
      });
    },

    nudge(sessionId: string, before: string): void {
      const t = now();
      prune(t);
      settles.set(sessionId, { before, at: t, afterRead: reads });
      const pace = paceOf(sessionId);
      // The next read is SCREEN_NUDGE_MS from now, and none before it.
      pace.nextReadAt = t + SCREEN_NUDGE_MS;
      const entry = entries.get(sessionId);
      if (entry !== undefined) schedule(entry, SCREEN_NUDGE_MS);
    },

    async readFresh(session: Session): Promise<ScreenReading | 'unreachable' | null> {
      const core = deps.core();
      if (core === null) return null;
      if (session.machine !== undefined) {
        return raceDeadline(readRemote(session.id), SCREEN_REMOTE_READ_DEADLINE_MS, 'unreachable' as const);
      }
      const tmuxId = core.tmuxIdOf(session.id);
      if (tmuxId === null) return null;
      return raceDeadline(readLocal(core, tmuxId), SCREEN_LOCAL_READ_DEADLINE_MS, null);
    }
  };
}

/** A read raced against its deadline: past it, or failed, it answers `late`. */
async function raceDeadline<T, L>(read: Promise<T>, ms: number, late: L): Promise<T | L> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const deadline = new Promise<L>((resolve) => {
    timer = setTimeout(() => resolve(late), ms);
  });
  try {
    return await Promise.race([read.catch(() => late), deadline]);
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}
