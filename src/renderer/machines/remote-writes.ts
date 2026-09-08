/**
 * The two moments a remote view cannot see for itself, delivered (Phase 230).
 *
 * A folder on another machine has no watcher, and research 85 section 8 rules
 * it never will: a watcher there is a process Tortie would have to run on
 * somebody else's computer for as long as the tab is open. What a view CAN
 * know is when Tortie itself changed something over there, and when the person
 * came back to the window. This module carries both, and nothing else.
 *
 * THE WRITE MOMENT. Every write this product makes on a machine answers with a
 * word, being `wrote` for a saved or new file, `made` for a folder, `moved` or
 * `done` for a rename, and the Changes store's own re-read after a stage, an
 * unstage or a commit. Until this phase only the store that issued the write
 * re-read anything: the Explorer re-read after its own folder and rename, the
 * Changes group after its own stage, and the editor's save re-read nothing at
 * all, measured in research 89 section 4.4 as a file that never appeared in 30
 * seconds. So each landing site announces here, and every view whose target is
 * on that machine hears it. `by` names the announcer so the store that already
 * re-read itself can leave the announcement alone rather than reading twice.
 *
 * THE LOOKED MOMENT. The window regaining focus, and the document becoming
 * visible again, are the two events a person produces by coming back. One
 * subscription on `window` and one on `document` serve every mounted view,
 * attached on the first subscriber and released with the last one, so a view
 * that unmounts leaves nothing behind. `npm run probe:p167` drives the remote
 * views open and closed and counts listeners for exactly this reason.
 *
 * NOT A TIMER. Neither half fires without a cause outside this module, and
 * neither half can be made to. The local analogue is ../state/repo-changed.ts,
 * which fans out `git:changed` from the watcher; this one fans out what Tortie
 * did and what the person did.
 */

/** Which kind of thing a write changed over there. */
export type RemoteWriteKind =
  /** A file's bytes, a new file, a new folder, or a rename. */
  | 'file'
  /** Which files are staged, being a stage or an unstage. */
  | 'index'
  /** A commit, so the history and the branch moved. */
  | 'commit';

/** One write that landed on one machine. */
export interface RemoteWrite {
  /** The machine it landed on. */
  readonly machineId: string;
  /** The path ON THAT MACHINE the write was about. */
  readonly path: string;
  /** What kind of thing changed. */
  readonly kind: RemoteWriteKind;
  /**
   * Who is announcing, so a store that already re-read itself after its own
   * write can ignore its own announcement. One of `editor`, `explorer`,
   * `changes`.
   */
  readonly by: string;
}

export type RemoteWriteListener = (write: RemoteWrite) => void;

export interface RemoteWriteBus {
  announce(write: RemoteWrite): void;
  subscribe(listener: RemoteWriteListener): () => void;
  /** How many listeners are attached right now. For the leak probe. */
  size(): number;
}

/**
 * Build a bus. Pure over nothing, so a test can drive one without a window.
 */
export function createRemoteWriteBus(): RemoteWriteBus {
  const listeners = new Set<RemoteWriteListener>();
  return {
    announce(write) {
      // Snapshot: a listener may unsubscribe while being run.
      for (const listener of [...listeners]) listener(write);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    size() {
      return listeners.size;
    }
  };
}

const writes = createRemoteWriteBus();

/** Say that one of Tortie's own writes landed on a machine. */
export function announceRemoteWrite(write: RemoteWrite): void {
  writes.announce(write);
}

/** Hear every write that lands on any machine. Returns an unsubscribe. */
export function onRemoteWrite(listener: RemoteWriteListener): () => void {
  return writes.subscribe(listener);
}

/** The listener count, read by the harness only. */
export function remoteWriteListenerCount(): number {
  return writes.size();
}

/** A source of "the person came back" events: attach, get a detach back. */
export type LookedSource = (fire: () => void) => () => void;

export interface LookedBus {
  subscribe(listener: () => void): () => void;
  size(): number;
}

/**
 * Build the looked bus over a source.
 *
 * The source is attached on the FIRST subscriber and detached with the LAST,
 * rather than kept for the app's lifetime the way the repo change bus keeps
 * its bridge, because this one listens on `window` and the leak probe counts
 * listeners on it: a view that unmounts must leave the count where it was.
 */
export function createLookedBus(source: LookedSource): LookedBus {
  const listeners = new Set<() => void>();
  let detach: (() => void) | null = null;
  const fire = (): void => {
    for (const listener of [...listeners]) listener();
  };
  return {
    subscribe(listener) {
      listeners.add(listener);
      if (detach === null) detach = source(fire);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && detach !== null) {
          detach();
          detach = null;
        }
      };
    },
    size() {
      return listeners.size;
    }
  };
}

const looked = createLookedBus((fire) => {
  if (typeof window === 'undefined') return () => undefined;
  const onFocus = (): void => fire();
  const onVisible = (): void => {
    if (document.visibilityState === 'visible') fire();
  };
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisible);
  };
});

/**
 * Hear the person coming back to the window. Returns an unsubscribe.
 *
 * It fires on the window's own `focus` and when the document becomes visible
 * again. A synthetic `focus` dispatched on `window` reaches it too, which is
 * how a harness can drive the moment without a second window.
 */
export function onWindowLooked(listener: () => void): () => void {
  return looked.subscribe(listener);
}

/** The listener count, read by the harness only. */
export function lookedListenerCount(): number {
  return looked.size();
}
