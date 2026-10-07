/**
 * ONE PAGE OF A SESSION'S HISTORY, READ FOR THE PHONE (Phase 337.1,
 * build/p3371/SPEC.md §5.3.5, D2, D9 to D15; §Attack B1 to B3, B10).
 *
 * `/v1/scrollback` names a session, the first index and how many rows the
 * phone wants, the history size it last saw (`depth`), the width its index
 * space was read at (`wrap`) and which end of the page matters (`keep`). It is
 * answered AT ONCE, never held, and nothing about it is kept but the session's
 * pace.
 *
 * THE INDEX SPACE IS TMUX'S OWN, numbered from the oldest line it holds (D2):
 * line `i` (0 the oldest) is tmux line `i - history`, and the live screen's top
 * row is index `history`. A line keeps its index while lines scroll in under
 * it; only a trim at the limit, a clear or a rewrap moves it, and each of
 * those is answered `moved` (D12) when main sees it.
 *
 * IN THIS ORDER, each step named below where it happens:
 *
 *   1. THE ROW, re-read by id: not live, or on this Mac with no `$`-id, is
 *      `ended`.
 *   2. THE TURN: one page read in flight per session; a page asked while one
 *      is in flight waits for it, FIFO, behind at most
 *      `SCROLLBACK_QUEUE_MAX - 1` others (one more is `busy` at once); then a
 *      start no sooner than `max(floor, SCREEN_DUTY_FACTOR x the session's last
 *      page compose)` after the session's previous start, the floor
 *      `SCROLLBACK_MIN_GAP_MS` here and `SCROLLBACK_MIN_GAP_REMOTE_MS` on
 *      another machine. Every wait asks `closing()` at every `SCREEN_TICK_MS`
 *      on a timer of its own (as the watcher's polls do, 337 D3), so a page
 *      never outlives the door's stop join (§Attack B3).
 *   3. THE ATTEMPTS, at most `SCROLLBACK_ATTEMPTS`, each asking `closing()`
 *      first, with NO separate first round (§Attack B1): ONE statement of
 *      three lines, the display, `capture-pane -p -e -S <a> -E <b>` and the
 *      display, where `a = from - SCROLLBACK_OVERSCAN - h0` and
 *      `b = min(from + count, h0) - 1 - h0`, `h0` the ask's `depth` at attempt
 *      1 and the previous attempt's last display after it; raced against its
 *      deadline and `closing()`; then THE AGREEMENT (`agree`, the one
 *      comparison, ./read.ts); THE REFUSALS over the agreed frame (D12); THE
 *      COVER; and the composition, a step at a time with the event loop
 *      handed back between steps once they have held it `PAGE_SLICE_MS`
 *      (the fix round), timed for the duty cycle.
 *   4. No attempt agreed and covered: `busy`.
 *   5. The answer: the first row's index, the agreed history size and width,
 *      `spaceOf` the agreed pane, the page's own styles and its rows.
 *
 * `a` MAY NAME A LINE ABOVE THE OLDEST, ON PURPOSE (§Attack B1): tmux then
 * starts at the oldest line, whose index is 0, so the capture's first index is
 * `max(0, a + h1)` whatever arrived between the phone's picture and this read.
 * A start forbidden from reaching above the oldest line could never cover the
 * oldest page once any line arrived between the two (BM2: 0 and 1 of 60 at a
 * far machine's spacing, where this read served 60 of 60).
 *
 * NOTHING HERE WRITES, SIZES, LOGS OR SETS A STATUS (D15): its only verbs are
 * `display-message -p` with `SCREEN_FORMAT` and `capture-pane -p -e` with two
 * whole numbers main computed and checked; it reads no error's text, holds
 * nothing on disk, and drops a refused attempt's capture unsent and unkept.
 */

import {
  POCKET_SCREEN_MAX_COLS,
  POCKET_SCROLLBACK_MAX_COUNT,
  POCKET_SCROLLBACK_MAX_INDEX,
  type PocketScrollbackAbsence,
  type PocketScrollbackAnswer
} from '@shared/ipc/pocket';
import { SCREEN_ENDED, SCREEN_UNREACHABLE, SCROLLBACK_BUSY, SCROLLBACK_MOVED } from '@shared/screen-copy';
import type { Session } from '@shared/types';
import { readScrollbackRemote } from '../machines/remote-screen';
import { screenLive, type PocketScrollbackAsk } from '../pocket/routes';
import { execTmux } from '../tmux';
import { composePageSteps, spaceOf, type ComposedPage } from './compose';
import {
  agree,
  lineOf,
  pageLineCount,
  SCREEN_FORMAT,
  splitScrollbackRead,
  statementOverControl,
  type PageRound,
  type ScreenCore,
  type ScreenSpawn
} from './read';
import {
  SCREEN_DUTY_FACTOR,
  SCREEN_LOCAL_READ_DEADLINE_MS,
  SCREEN_REMOTE_READ_DEADLINE_MS,
  SCREEN_TICK_MS,
  SCREEN_TICK_REMOTE_MS
} from './watch';

/** The rows read above the page's first row, so lines arriving since the phone's picture still leave it covered (D9). */
export const SCROLLBACK_OVERSCAN = 128;
/** The most statements one page reads before it says `busy` (D9). */
export const SCROLLBACK_ATTEMPTS = 3;
/** This Mac's floor between two page starts of one session (D14). */
export const SCROLLBACK_MIN_GAP_MS = 250;
/** A far session's floor between page starts: the far poll's own tick (§Attack B2). */
export const SCROLLBACK_MIN_GAP_REMOTE_MS = SCREEN_TICK_REMOTE_MS;
/** The most pages one session holds waiting their turn; one more is `busy` at once (§Attack B3). */
export const SCROLLBACK_QUEUE_MAX = 4;
/**
 * The most a page's composition holds main before it hands the event loop
 * back (the fix round). A page of per-cell truecolor at 300 columns composed
 * in 80 to 98 ms in one block, about three a second while the phone paged, and
 * main's lag rose to a p99 of 62 ms where the phone's door had never cost it
 * more than 30 (Lens 1's measurement, beside the parent). Composed in steps it
 * holds main at most this and one step (`PAGE_STEP_ROWS` rows, ./compose.ts)
 * at a time; the work is the same, and the duty cycle still spaces the pages
 * by its whole cost.
 */
export const PAGE_SLICE_MS = 4;

/** What the page reader is built with. Production passes `core` alone. */
export interface ScreenScrollbackDeps {
  core(): ScreenCore | null;
  /**
   * One round on this Mac: the three lines as ONE control-client statement,
   * or ONE spawned list when the client is down. Null when it could not be
   * read. Tests inject.
   */
  readLocalRounds?: (core: ScreenCore, tmuxId: string, a: number, b: number) => Promise<PageRound | null>;
  /** One round on another machine: one `execOn` through ../machines/remote-screen.ts. Tests inject. */
  readRemoteRounds?: (sessionId: string, a: number, b: number) => Promise<PageRound | 'unreachable' | null>;
  /** A monotonic clock in ms. Production: `performance.now()`. */
  now?(): number;
  /** Hand the event loop back between two steps of a composition. Production: `setImmediate`. Tests inject. */
  handBack?(): Promise<void>;
}

export interface ScreenScrollback {
  page(session: Session, ask: PocketScrollbackAsk, closing: () => boolean): Promise<PocketScrollbackAnswer>;
}

/** Main's words for an absence. */
const ABSENCE_SENTENCES: Readonly<Record<PocketScrollbackAbsence, string>> = Object.freeze({
  ended: SCREEN_ENDED,
  unreachable: SCREEN_UNREACHABLE,
  moved: SCROLLBACK_MOVED,
  busy: SCROLLBACK_BUSY
});

/** An absence's answer: nothing read is carried. */
function absent(sessionId: string, why: PocketScrollbackAbsence): PocketScrollbackAnswer {
  return {
    sessionId,
    at: Date.now(),
    from: null,
    depth: null,
    wrap: null,
    space: null,
    styles: [],
    rows: [],
    why,
    sentence: ABSENCE_SENTENCES[why]
  };
}

/** True for a whole number in `[lo, hi]`. */
function wholeIn(n: unknown, lo: number, hi: number): n is number {
  return typeof n === 'number' && Number.isSafeInteger(n) && n >= lo && n <= hi;
}

/** The ask as D7 bounds it. The door's query reader already holds this; it is asked again because a number reaches an argv. */
function askHolds(ask: PocketScrollbackAsk): boolean {
  return (
    wholeIn(ask.from, 0, POCKET_SCROLLBACK_MAX_INDEX) &&
    wholeIn(ask.count, 1, POCKET_SCROLLBACK_MAX_COUNT) &&
    wholeIn(ask.depth, 0, POCKET_SCROLLBACK_MAX_INDEX) &&
    ask.from + ask.count <= ask.depth &&
    wholeIn(ask.wrap, 1, POCKET_SCREEN_MAX_COLS) &&
    (ask.keep === 'top' || ask.keep === 'bottom')
  );
}

/**
 * One attempt's tmux line numbers (D9): `a = from - SCROLLBACK_OVERSCAN - h0`,
 * which may name a line above the oldest, and `b = min(from + count, h0) - 1 -
 * h0`, always in the history. Null when either is not a whole number or `b` is
 * not above the live screen, so nothing but checked whole numbers reaches an
 * argv.
 */
function pageRange(from: number, count: number, h0: number): { a: number; b: number } | null {
  const a = from - SCROLLBACK_OVERSCAN - h0;
  const b = Math.min(from + count, h0) - 1 - h0;
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || !(b <= -1) || !(a < b)) return null;
  return { a, b };
}

/** A round's two argvs (D9, D15): the display with the one format, and the capture of tmux lines `a` to `b`. */
function roundArgvs(tmuxId: string, a: number, b: number): { display: string[]; capture: string[] } {
  return {
    display: ['display-message', '-p', '-t', tmuxId, SCREEN_FORMAT],
    capture: ['capture-pane', '-p', '-e', '-t', tmuxId, '-S', String(a), '-E', String(b)]
  };
}

/**
 * ONE ROUND ON THIS MAC: over the control client, the three lines written in
 * ONE statement (a `;` list on that client would desync its queue, ./read.ts);
 * with the client down, ONE spawned `tmux` carrying the three as a `;` list,
 * split by count from its first display. Null on any failure.
 */
async function readLocalRound(
  core: ScreenCore,
  tmuxId: string,
  a: number,
  b: number,
  spawn: ScreenSpawn
): Promise<PageRound | null> {
  const { display, capture } = roundArgvs(tmuxId, a, b);
  if (core.control.connected) {
    // ./read.ts's one statement: display, capture, display, in one tick.
    const three = await statementOverControl(core.control, lineOf(display), lineOf(capture));
    return three === null ? null : { first: three.first, rows: three.captured, last: three.last };
  }
  let stdout: string;
  try {
    stdout = await spawn([...display, ';', ...capture, ';', ...display], { timeoutMs: SCREEN_LOCAL_READ_DEADLINE_MS });
  } catch {
    return null;
  }
  return splitScrollbackRead(stdout, a, b);
}

/** What one raced round came to. */
type RoundOutcome = PageRound | 'unreachable' | null | 'late' | 'closing';

/**
 * Wait for `ready` while asking `closing()` at every `SCREEN_TICK_MS`, and at
 * most `limit` ms when one is given: its value, `'closing'`, or `'late'`.
 * Never rejects; `ready` must not either.
 */
function raced<T>(ready: Promise<T>, closing: () => boolean, limit: number | null): Promise<T | 'closing' | 'late'> {
  return new Promise((resolve) => {
    let done = false;
    let deadline: ReturnType<typeof setTimeout> | null = null;
    const finish = (value: T | 'closing' | 'late'): void => {
      if (done) return;
      done = true;
      clearInterval(ticker);
      if (deadline !== null) clearTimeout(deadline);
      resolve(value);
    };
    const ticker = setInterval(() => {
      if (closing()) finish('closing');
    }, SCREEN_TICK_MS);
    if (limit !== null) deadline = setTimeout(() => finish('late'), limit);
    void ready.then((value) => finish(value));
    if (closing()) finish('closing');
  });
}

/** A wait of `ms`, raced against `closing()` at every tick: true when it ran out, false when closing. */
async function waitOrClosing(ms: number, closing: () => boolean): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const slept = new Promise<'slept'>((resolve) => {
    timer = setTimeout(() => resolve('slept'), ms);
  });
  const outcome = await raced(slept, closing, null);
  if (timer !== null) clearTimeout(timer);
  return outcome === 'slept';
}

/** The event loop handed back: whatever waits on it runs before the next step. */
function nextTurn(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

/**
 * A page's composition driven to its end a step at a time (the fix round):
 * each step timed, the event loop handed back once the steps since the last
 * hand-back have held it `PAGE_SLICE_MS`, and `closing()` asked after every
 * hand-back, so a composition never outlives the door's stop. Answers the
 * page and the ms its steps took, or null when closing.
 */
async function composeInSteps(
  steps: Generator<void, ComposedPage, undefined>,
  closing: () => boolean,
  now: () => number,
  handBack: () => Promise<void>
): Promise<{ page: ComposedPage; ms: number } | null> {
  let spent = 0;
  let slice = 0;
  for (;;) {
    const t0 = now();
    const step = steps.next();
    const took = Math.max(0, now() - t0);
    spent += took;
    slice += took;
    if (step.done === true) return { page: step.value, ms: spent };
    if (slice >= PAGE_SLICE_MS) {
      await handBack();
      slice = 0;
      if (closing()) return null;
    }
  }
}

/** One page waiting its turn. */
interface Waiter {
  go(): void;
}

/** One session's turn and pace, kept across its pages. */
interface Lane {
  /** A page holds the session's turn: its floor, its rounds, and any round still settling after it answered. */
  held: boolean;
  /** The pages waiting their turn, FIFO. */
  readonly waiting: Waiter[];
  /** When the session's last page started its first round. */
  lastStartAt: number;
  /** What the last page's composition cost, in ms. */
  lastComposeMs: number;
}

export function createScreenScrollback(deps: ScreenScrollbackDeps): ScreenScrollback {
  const now = deps.now ?? ((): number => performance.now());
  const handBack = deps.handBack ?? nextTurn;
  const readLocalRounds =
    deps.readLocalRounds ??
    ((core: ScreenCore, tmuxId: string, a: number, b: number) => readLocalRound(core, tmuxId, a, b, execTmux));
  const readRemoteRounds =
    deps.readRemoteRounds ??
    ((sessionId: string, a: number, b: number) => readScrollbackRemote(sessionId, a, b, SCREEN_REMOTE_READ_DEADLINE_MS));
  const lanes = new Map<string, Lane>();

  const laneOf = (sessionId: string): Lane => {
    let lane = lanes.get(sessionId);
    if (lane === undefined) {
      lane = { held: false, waiting: [], lastStartAt: -Infinity, lastComposeMs: 0 };
      lanes.set(sessionId, lane);
    }
    return lane;
  };

  /** The turn handed to the next page in line, or the session left idle. */
  const release = (lane: Lane): void => {
    const next = lane.waiting.shift();
    if (next !== undefined) {
      next.go();
      return;
    }
    lane.held = false;
  };

  /**
   * Forget the lanes nobody holds or waits on whose floor and duty cycle have
   * long passed, so the pace kept is only that of sessions paged lately; a
   * lane forgotten could have imposed no wait on its next page.
   */
  const prune = (t: number): void => {
    for (const [sessionId, lane] of lanes) {
      const quiet = SCROLLBACK_MIN_GAP_REMOTE_MS + SCREEN_DUTY_FACTOR * lane.lastComposeMs;
      if (!lane.held && lane.waiting.length === 0 && t - lane.lastStartAt > quiet) lanes.delete(sessionId);
    }
  };

  /** Wait for the session's turn, FIFO, asking `closing()` at every tick: true when it is ours. */
  const waitTurn = (lane: Lane, closing: () => boolean): Promise<boolean> =>
    new Promise((resolve) => {
      const waiter: Waiter = {
        go: () => {
          clearInterval(ticker);
          resolve(true);
        }
      };
      const ticker = setInterval(() => {
        if (!closing()) return;
        clearInterval(ticker);
        const at = lane.waiting.indexOf(waiter);
        if (at >= 0) lane.waiting.splice(at, 1);
        resolve(false);
      }, SCREEN_TICK_MS);
      lane.waiting.push(waiter);
    });

  async function page(session: Session, ask: PocketScrollbackAsk, closing: () => boolean): Promise<PocketScrollbackAnswer> {
    const id = session.id;
    const core = deps.core();
    if (core === null) return absent(id, 'unreachable');
    // 1. THE ROW, re-read by id, and the gates' one live set.
    const row = core.listSessions().find((s) => s.id === id);
    if (row === undefined || !screenLive(row)) return absent(id, 'ended');
    const remote = row.machine !== undefined;
    const tmuxId = remote ? null : core.tmuxIdOf(id);
    if (!remote && tmuxId === null) return absent(id, 'ended');
    if (!askHolds(ask)) return absent(id, 'busy');
    if (closing()) return absent(id, 'unreachable');

    // 2. THE TURN: one page in flight per session, FIFO, the queue bounded.
    prune(now());
    const lane = laneOf(id);
    if (lane.held) {
      if (lane.waiting.length >= SCROLLBACK_QUEUE_MAX) return absent(id, 'busy');
      if (!(await waitTurn(lane, closing))) return absent(id, 'unreachable');
    } else {
      lane.held = true;
    }
    // From here this page holds the turn. It is given back once the page has
    // answered AND every round it started has settled, so a round left past
    // its deadline or the door's stop still holds the session's slot.
    let rounds = 0;
    let answered = false;
    const answer = (out: PocketScrollbackAnswer): PocketScrollbackAnswer => {
      answered = true;
      if (rounds === 0) release(lane);
      return out;
    };
    const settled = (): void => {
      rounds -= 1;
      if (answered && rounds === 0) release(lane);
    };

    // THE FLOOR, and the duty cycle after a costly page (§Attack B2, B10).
    const floor = remote ? SCROLLBACK_MIN_GAP_REMOTE_MS : SCROLLBACK_MIN_GAP_MS;
    const gap = Math.max(floor, SCREEN_DUTY_FACTOR * lane.lastComposeMs);
    // Asked again on waking: a timer counts whole milliseconds on the loop's own
    // clock and can fire up to a millisecond before `now()` reaches the floor,
    // so a start is never earlier than the floor by the clock it is stamped with.
    for (let wait = lane.lastStartAt + gap - now(); wait > 0; wait = lane.lastStartAt + gap - now()) {
      if (!(await waitOrClosing(wait, closing))) return answer(absent(id, 'unreachable'));
    }
    lane.lastStartAt = now();

    // 3. THE ATTEMPTS, with no separate first round (§Attack B1).
    let h0 = ask.depth;
    let previous: number | null = null;
    for (let attempt = 1; attempt <= SCROLLBACK_ATTEMPTS; attempt += 1) {
      if (closing()) return answer(absent(id, 'unreachable'));
      const range = pageRange(ask.from, ask.count, h0);
      if (range === null) return answer(absent(id, 'busy'));
      const { a, b } = range;
      // THE STATEMENT, ONE round of three lines, raced against its deadline and closing().
      rounds += 1;
      const round: Promise<PageRound | 'unreachable' | null> = (
        tmuxId === null ? readRemoteRounds(id, a, b) : readLocalRounds(core, tmuxId, a, b)
      ).then(
        (value) => value,
        () => null
      );
      void round.finally(settled);
      const outcome: RoundOutcome = await raced(
        round,
        closing,
        remote ? SCREEN_REMOTE_READ_DEADLINE_MS : SCREEN_LOCAL_READ_DEADLINE_MS
      );
      if (outcome === 'closing') return answer(absent(id, 'unreachable'));
      if (outcome === 'late' || outcome === 'unreachable') {
        // Past its deadline a far round is the machine not answering; here,
        // the next attempt.
        if (remote) return answer(absent(id, 'unreachable'));
        continue;
      }
      if (outcome === null) continue;
      const { first, rows, last } = outcome;
      // THE AGREEMENT: the two displays frame one picture (D5's five fields).
      if (!agree(first, last)) {
        h0 = last.history;
        previous = last.history;
        continue;
      }
      // THE REFUSALS over the agreed frame (D12): the capture is dropped unsent.
      const h1 = last.history;
      if (
        last.alternate ||
        last.cols !== ask.wrap ||
        h1 < ask.depth ||
        (previous !== null && h1 < previous) ||
        ask.from >= h1
      ) {
        return answer(absent(id, 'moved'));
      }
      // THE COVER: the capture holds exactly the lines the agreed frame names,
      // from the first index to the last row asked. The last clause is implied
      // by the count and the refusals above (h1 >= depth >= from + count, and
      // the count reaches b + h1): Lens 1's ablation K2 stayed green on every
      // gate and its arithmetic shows why. It stays as the cover's own words,
      // stated redundancy that a later change to the count cannot lose.
      const firstIndex = Math.max(0, a + h1);
      const end = Math.min(ask.from + ask.count, h1);
      if (rows.length !== pageLineCount(a, b, h1) || firstIndex > ask.from || firstIndex + rows.length < end) {
        h0 = h1;
        previous = h1;
        continue;
      }
      // COMPOSE, a step at a time, handing the event loop back once the steps
      // have held it PAGE_SLICE_MS, and timed for the duty cycle (the fix
      // round): the time is the steps' own, never the waits between them.
      const steps = composePageSteps(rows.join('\n'), firstIndex, last.cols, {
        from: ask.from,
        count: Math.min(ask.count, h1 - ask.from),
        keep: ask.keep
      });
      const composing = composeInSteps(steps, closing, now, handBack).then(
        (value) => value,
        () => null
      );
      const done = await raced(composing, closing, null);
      if (done === null || done === 'closing' || done === 'late') return answer(absent(id, 'unreachable'));
      lane.lastComposeMs = done.ms;
      const composed = done.page;
      // 5. THE ANSWER.
      return answer({
        sessionId: id,
        at: Date.now(),
        from: composed.from,
        depth: h1,
        wrap: last.cols,
        space: spaceOf(last.paneId),
        styles: composed.styles,
        rows: composed.rows,
        why: null,
        sentence: null
      });
    }
    // 4. No attempt agreed and covered.
    return answer(absent(id, 'busy'));
  }

  return { page };
}
