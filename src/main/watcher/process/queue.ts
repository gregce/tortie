/**
 * THE ONE QUEUE every file watch goes through (Phase 365, build/p365/SPEC.md
 * §4.1, D2 to D4), and the process side of the wire that drives it.
 *
 * ## Why it exists
 *
 * `@parcel/watcher` 2.6.0 is not safe to call while another of its calls is
 * still running. A subscribe's constructor asks the shared-watcher registry for
 * its watcher on the JavaScript thread while a failed subscribe on a libuv
 * worker removes one from it, with no lock (research 143 §2.5: ThreadSanitizer
 * named 17 races there), and the FSEvents thread stops and releases a deleted
 * root's stream with no lock while a worker's unsubscribe stops it again
 * (upstream issue #271). At the parent, Tortie's five sites overlapped up to 17
 * native calls at a boot, and a storm of about 17 subscribes and 17
 * unsubscribes a second damaged the heap within a minute (the spec's §2). So:
 *
 *  1. **One chain, FIFO, ONE native call in flight.** Every subscribe and
 *     every unsubscribe is a turn on one promise chain, and a turn ends only
 *     when its native call has settled.
 *  2. **Never a folder that may not exist.** The existence check is the FIRST
 *     statement of the watch turn and the native subscribe is the NEXT, with
 *     no await between them. A folder that is not there is "nothing to watch":
 *     the answer is `sub: null` and the native module is never called, so the
 *     failed-subscribe path that tears the registry down never runs.
 *  3. **A drop as its folder goes waits.** A close whose folder is already
 *     gone joins the chain only after `WATCH_GONE_GRACE_MS`, by a timer, so
 *     the FSEvents thread's own stop of the deleted root runs first and the
 *     worker's later stop finds no stream (`FSEventsBackend.cc` 189-191 and
 *     331-337). The wait never holds the chain: every other turn runs past it.
 *     The spec step measured the queue and the check alone faulting in 59 s,
 *     and the grace added running 600 s clean (`q1`, `qg1`).
 *
 * ONE MORE RULE, NEW HERE, BECAUSE OF THE GRACE. A watch of a folder whose
 * graced close is still waiting joins the chain after that close does. The
 * library shares one native watcher between subscriptions to the same folder
 * and ignore set, and a watcher whose root was deleted has had its stream
 * stopped by the FSEvents thread while it stays registered, so a subscription
 * made to the re-created folder before the old one is dropped would join that
 * dead stream and hear nothing, ever. At the parent the close ran at once and
 * the new watch got a fresh stream; this keeps that.
 *
 * ## What it is not
 *
 * It is pure: no Electron, no logger, no file system and no clock of its own.
 * Everything it touches arrives in `deps`, so the gate and the unit tests drive
 * it over fakes and `../watcher-process.ts` and `./in-process.ts` drive it over
 * the real module. It imports only `./wire` (the import wall in
 * `build/assert-import-boundaries.mjs`).
 */

import type { FromWatcher, WatcherEvent } from './wire';
import { errorText, toWatcherOf } from './wire';

/** A close whose folder is already gone waits this long before it joins the chain. */
export const WATCH_GONE_GRACE_MS = 2_000;
/** A turn that waited longer than this for the chain is noted. */
export const WATCH_TURN_NOTE_MS = 2_000;
/** At most one note per kind of turn in this long. */
export const WATCH_TURN_NOTE_EVERY_MS = 60_000;

/** One event as the native module reports it. */
export interface NativeEvent {
  readonly type: string;
  readonly path: string;
}

export type NativeCallback = (err: Error | null, events: NativeEvent[]) => unknown;

/** What a native subscribe answers. */
export interface NativeSubscription {
  unsubscribe(): Promise<void>;
}

/** The slice of `@parcel/watcher` the queue calls. */
export interface NativeWatcher {
  subscribe(
    dir: string,
    callback: NativeCallback,
    options: { ignore: (string | RegExp)[] }
  ): Promise<NativeSubscription>;
}

/** A turn that waited past `WATCH_TURN_NOTE_MS`. */
export interface TurnNote {
  readonly op: 'watch' | 'close';
  readonly waitedMs: number;
  /** How many operations were on the chain ahead of it when it joined. */
  readonly behind: number;
}

export interface WatchQueueDeps {
  readonly native: NativeWatcher;
  /** True when `dir` is a directory now. Asked at a watch's turn, and when a close is made. */
  readonly exists: (dir: string) => boolean;
  readonly now: () => number;
  readonly setTimeout: (callback: () => void, ms: number) => unknown;
  readonly note: (note: TurnNote) => void;
}

/** A watch's answer. `sub` null is "nothing to watch": the folder was not there. */
export type WatchAnswer =
  | { readonly kind: 'watching'; readonly sub: number | null; readonly waitedMs: number }
  | { readonly kind: 'refused'; readonly error: string; readonly waitedMs: number };

export interface WatchQueueObservation {
  /** Native subscriptions held now. */
  readonly live: number;
  /** Turns on the chain, the running one included. */
  readonly onChain: number;
  /** Folders with a graced close still waiting to join. */
  readonly graced: number;
}

export interface WatchQueue {
  /** Watch `dir` at its turn. `onEvents` is called with this subscription's batches. */
  watch(
    dir: string,
    ignore: readonly (string | RegExp)[],
    onEvents: NativeCallback
  ): Promise<WatchAnswer>;
  /**
   * Close a subscription. Settles when its native close has run. `onGraced`
   * is called at once, synchronously, when the folder is already gone and the
   * close therefore waits out the grace first.
   */
  close(sub: number, onGraced?: () => void): Promise<void>;
  observe(): WatchQueueObservation;
}

interface WatchOp {
  readonly sub: number;
  readonly dir: string;
  readonly ignore: (string | RegExp)[];
  /** A function of this subscription's own: the library keys callbacks by identity. */
  readonly deliver: NativeCallback;
}

interface Held {
  readonly dir: string;
  readonly handle: NativeSubscription;
  closing: Promise<void> | null;
}

export function createWatchQueue(deps: WatchQueueDeps): WatchQueue {
  const held = new Map<number, Held>();
  /** The latest graced close of each folder, by the promise that ends its wait. */
  const graces = new Map<string, Promise<void>>();
  const lastNote = new Map<'watch' | 'close', number>();
  let tail: Promise<void> = Promise.resolve();
  let onChain = 0;
  let nextSub = 1;

  function noteWait(op: 'watch' | 'close', waitedMs: number, behind: number): void {
    const now = deps.now();
    const last = lastNote.get(op);
    if (last !== undefined && now - last < WATCH_TURN_NOTE_EVERY_MS) return;
    lastNote.set(op, now);
    try {
      deps.note({ op, waitedMs, behind });
    } catch {
      /* a note never stops a turn */
    }
  }

  /** Put a turn on the ONE chain. It starts when every turn before it has settled. */
  function join<T>(op: 'watch' | 'close', turn: (waitedMs: number) => Promise<T>): Promise<T> {
    const joinedAt = deps.now();
    const behind = onChain;
    onChain += 1;
    const run = tail.then(() => {
      const waitedMs = Math.max(0, Math.round(deps.now() - joinedAt));
      if (waitedMs > WATCH_TURN_NOTE_MS) noteWait(op, waitedMs, behind);
      return turn(waitedMs);
    });
    const settled = (): void => {
      onChain -= 1;
    };
    tail = run.then(settled, settled);
    return run;
  }

  /** THE WATCH TURN. The check, then the native subscribe, with nothing between. */
  async function watchTurn(op: WatchOp, waitedMs: number): Promise<WatchAnswer> {
    if (!deps.exists(op.dir)) return { kind: 'watching', sub: null, waitedMs };
    const subscribing = deps.native.subscribe(op.dir, op.deliver, { ignore: op.ignore });
    const handle = await subscribing;
    held.set(op.sub, { dir: op.dir, handle, closing: null });
    return { kind: 'watching', sub: op.sub, waitedMs };
  }

  /** THE CLOSE TURN. A close that fails leaves nothing to close. */
  async function closeTurn(sub: number, entry: Held): Promise<void> {
    try {
      await entry.handle.unsubscribe();
    } catch {
      /* the library has already dropped it */
    } finally {
      held.delete(sub);
    }
  }

  /** A timer of its own for this folder's grace, recorded as the latest. */
  function graceFor(dir: string): Promise<void> {
    const over = new Promise<void>((resolve) => {
      deps.setTimeout(resolve, WATCH_GONE_GRACE_MS);
    });
    graces.set(dir, over);
    void over.then(() => {
      if (graces.get(dir) === over) graces.delete(dir);
    });
    return over;
  }

  return {
    watch(dir, ignore, onEvents): Promise<WatchAnswer> {
      const sub = nextSub;
      nextSub += 1;
      const op: WatchOp = {
        sub,
        dir,
        ignore: [...ignore],
        deliver: (err, events) => {
          try {
            onEvents(err, events);
          } catch {
            // A throw here would reach the library's own callback, which
            // answers it with napi_fatal_exception and ends the process.
          }
        }
      };
      const start = (): Promise<WatchAnswer> =>
        join('watch', (waitedMs) =>
          watchTurn(op, waitedMs).catch(
            (err: unknown): WatchAnswer => ({ kind: 'refused', error: errorText(err), waitedMs })
          )
        );
      // A graced close of this very folder goes first (see the header).
      const grace = graces.get(dir);
      return grace === undefined ? start() : grace.then(start);
    },

    close(sub, onGraced): Promise<void> {
      const entry = held.get(sub);
      if (entry === undefined) return Promise.resolve();
      if (entry.closing !== null) return entry.closing;
      if (deps.exists(entry.dir)) {
        entry.closing = join('close', () => closeTurn(sub, entry));
        return entry.closing;
      }
      // The folder is already gone: wait out the grace BEFORE joining, so the
      // wait holds no other turn.
      try {
        onGraced?.();
      } catch {
        /* the caller's answer is its own */
      }
      const over = graceFor(entry.dir);
      entry.closing = over.then(() => join('close', () => closeTurn(sub, entry)));
      return entry.closing;
    },

    observe(): WatchQueueObservation {
      return { live: held.size, onChain, graced: graces.size };
    }
  };
}

// ---------------------------------------------------------------------------
// The process side of the wire
// ---------------------------------------------------------------------------

/** What the process side needs: the queue's deps, less the note it makes itself. */
export type WatcherServerDeps = Omit<WatchQueueDeps, 'note'>;

export interface WatcherServer {
  /** One message from main, validated here; a malformed one is dropped and counted. */
  receive(raw: unknown): void;
  /** Stop answering, and close every subscription held (the in-process kill). */
  stop(): void;
  /** Messages from main that did not validate. */
  dropped(): number;
  observe(): WatchQueueObservation;
}

interface Delivery {
  sub: number | null;
  /** True once `watching` has been posted, so no batch can reach main before it. */
  open: boolean;
  closed: boolean;
  readonly early: { readonly err: Error | null; readonly events: NativeEvent[] }[];
}

function isEventType(type: string): type is WatcherEvent['type'] {
  return type === 'create' || type === 'update' || type === 'delete';
}

/** Each event reduced to its two fields, as written. */
function wireEvents(events: readonly NativeEvent[]): WatcherEvent[] {
  const out: WatcherEvent[] = [];
  for (const event of events) {
    if (isEventType(event.type) && typeof event.path === 'string' && event.path.length > 0) {
      out.push({ type: event.type, path: event.path });
    }
  }
  return out;
}

/**
 * Answer main's messages over the one queue. Used by the process entry
 * (`../watcher-process.ts`) and by the in-process port (`./in-process.ts`), so
 * both run exactly this. It posts `ready` last, once it can receive.
 */
export function serveWatchQueue(deps: WatcherServerDeps, post: (message: FromWatcher) => void): WatcherServer {
  let stopped = false;
  let dropped = 0;
  const deliveries = new Map<number, Delivery>();

  const send = (message: FromWatcher): void => {
    if (stopped) return;
    try {
      post(message);
    } catch {
      /* a port that is gone takes nothing; main's bounds notice */
    }
  };

  const queue = createWatchQueue({
    ...deps,
    note: (note) => send({ kind: 'note', what: 'turn-wait', op: note.op, waitedMs: note.waitedMs, behind: note.behind })
  });

  function forward(delivery: Delivery, err: Error | null, events: NativeEvent[]): void {
    if (stopped || delivery.closed) return;
    if (!delivery.open || delivery.sub === null) {
      delivery.early.push({ err, events });
      return;
    }
    send({ kind: 'events', sub: delivery.sub, error: err === null ? null : errorText(err), events: wireEvents(events) });
  }

  function watch(req: number, dir: string, ignorePaths: readonly string[], ignorePatterns: readonly string[]): void {
    const delivery: Delivery = { sub: null, open: false, closed: false, early: [] };
    // The patterns were checked by the validator, so this cannot throw.
    const ignore: (string | RegExp)[] = [...ignorePaths, ...ignorePatterns.map((source) => new RegExp(source))];
    void queue
      .watch(dir, ignore, (err, events) => forward(delivery, err, events))
      .then((answer) => {
        if (answer.kind === 'refused') {
          delivery.closed = true;
          send({ kind: 'refused', req, error: answer.error });
          return;
        }
        if (answer.sub === null) {
          delivery.closed = true;
          send({ kind: 'watching', req, sub: null, waitedMs: answer.waitedMs });
          return;
        }
        if (stopped) {
          void queue.close(answer.sub);
          return;
        }
        delivery.sub = answer.sub;
        deliveries.set(answer.sub, delivery);
        send({ kind: 'watching', req, sub: answer.sub, waitedMs: answer.waitedMs });
        delivery.open = true;
        for (const batch of delivery.early.splice(0)) forward(delivery, batch.err, batch.events);
      });
  }

  function close(req: number, sub: number): void {
    const delivery = deliveries.get(sub);
    if (delivery !== undefined) {
      // No batch of this subscription reaches main from here on.
      delivery.closed = true;
      delivery.early.length = 0;
      deliveries.delete(sub);
    }
    let answered = false;
    const answer = (): void => {
      if (answered) return;
      answered = true;
      send({ kind: 'closed', req });
    };
    // A graced close is answered at once: main forgot the watch when it asked,
    // and the native close it owes runs after the grace, in here.
    void queue.close(sub, answer).then(answer, answer);
  }

  const server: WatcherServer = {
    receive(raw: unknown): void {
      if (stopped) return;
      const message = toWatcherOf(raw);
      if (message === null) {
        dropped += 1;
        return;
      }
      if (message.kind === 'watch') {
        watch(message.req, message.dir, message.ignorePaths, message.ignorePatterns);
      } else {
        close(message.req, message.sub);
      }
    },
    stop(): void {
      if (stopped) return;
      stopped = true;
      for (const [sub, delivery] of deliveries) {
        delivery.closed = true;
        void queue.close(sub);
      }
      deliveries.clear();
    },
    dropped: () => dropped,
    observe: () => queue.observe()
  };
  send({ kind: 'ready' });
  return server;
}
