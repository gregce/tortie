/**
 * The main-thread owner of the quick-open worker: one resident worker per
 * app, created on the first ⌘P and never on boot, plus the three things the
 * worker cannot see for itself — where ripgrep is, when a repo changed, and
 * which projects are still open.
 *
 * It is deliberately thin. Every decision about ranking, indexing and
 * staleness lives in worker.ts; this file is lifecycle, addressing and the
 * promise plumbing that turns a postMessage into an `await`.
 */

import { Worker } from 'node:worker_threads';
import { resolve as resolvePath } from 'node:path';
import type { QuickOpenQueryInput, QuickOpenResult } from '@shared/ipc';
import type { QuickOpenRequest, QuickOpenResponse } from './protocol';
import { WORKER_NAMES } from '../proc/identity';

import { getLog } from '../log';

/**
 * Scope "quickopen" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const quickopenLog = getLog('quickopen');

export interface QuickOpenDeps {
  /** Absolute path to the ripgrep binary (src/main/search/resolve.ts). */
  rgPath(): string;
  /** Absolute path to the built worker entry (out/main/quickopen-worker.js). */
  workerEntry(): string;
  /**
   * Subscribe to "this repo changed on disk". Wired to the ONE @parcel/watcher
   * subscription per repo that already runs for git (src/main/watcher/bus.ts).
   * Optional so the coordinator stays unit-testable, and because a project
   * that never took a `git:*` call genuinely has no watcher — the worker's
   * warm-time freshness check is the backstop for exactly that case.
   */
  onRepoChanged?(cb: (repoPath: string) => void): () => void;
}

/**
 * A query that has not come back in this long has hit something pathological
 * (a wedged ripgrep, a worker mid-crash). Answer honestly instead of leaving
 * the palette spinning: an empty not-ready result reads as "still indexing",
 * which is both true and recoverable on the next keystroke.
 */
const QUERY_TIMEOUT_MS = 5_000;

/** Roots with no query and no warm for this long give their memory back. */
const IDLE_EVICT_MS = 10 * 60 * 1000;

/** How often idle roots are swept. Cheap; an unref'd timer never holds quit. */
const EVICT_SWEEP_MS = 60_000;

interface Pending {
  resolve(result: QuickOpenResult): void;
  timer: NodeJS.Timeout;
  seq: number;
}

export interface QuickOpenCoordinator {
  warm(repoPath: string): void;
  query(input: QuickOpenQueryInput): Promise<QuickOpenResult>;
  dispose(): Promise<void>;
}

export function createQuickOpenCoordinator(
  deps: QuickOpenDeps
): QuickOpenCoordinator {
  let worker: Worker | null = null;
  let nextId = 1;
  const pending = new Map<number, Pending>();
  /** Root → when it was last queried or warmed, for idle eviction. */
  const lastUsed = new Map<string, number>();
  /** Last recents list forwarded, so a per-keystroke list is sent once. */
  let lastRecentsKey = '';
  let unsubscribeWatcher: (() => void) | null = null;
  let sweep: NodeJS.Timeout | null = null;
  let disposed = false;
  /** Why the worker could not start, if it could not. Shown to the user. */
  let startupError: string | null = null;

  /** Everything addresses roots by their resolved absolute path, once. */
  const norm = (p: string): string => resolvePath(p);

  /**
   * The honest answer when there is nothing to say yet: no rows, not ready,
   * still working. The palette renders that as "Indexing…", which is right
   * for a slow first enumeration and for a query that overtook its answer.
   */
  function emptyResult(seq: number): QuickOpenResult {
    return {
      seq,
      hits: [],
      total: 0,
      ready: false,
      indexed: 0,
      refreshing: true,
      capped: false
    };
  }

  /**
   * The honest answer when quick open cannot work AT ALL. Distinct from the
   * one above on purpose: "indexing" invites you to wait, and waiting will
   * never help if the search binary is missing from the build.
   */
  function failedResult(seq: number, message: string): QuickOpenResult {
    return {
      seq,
      hits: [],
      total: 0,
      ready: true,
      indexed: 0,
      refreshing: false,
      capped: false,
      error: message
    };
  }

  /** Fail every in-flight query honestly — never leave the palette hanging. */
  function drainPending(): void {
    for (const [, p] of pending) {
      clearTimeout(p.timer);
      p.resolve(emptyResult(p.seq));
    }
    pending.clear();
  }

  function ensureWorker(): Worker | null {
    if (disposed) return null;
    if (worker !== null) return worker;

    let entry: string;
    let rgPath: string;
    try {
      entry = deps.workerEntry();
      rgPath = deps.rgPath();
    } catch (err) {
      startupError = (err as Error).message;
      quickopenLog.warn(`quick open unavailable: ${startupError}`);
      return null;
    }

    // Loaded straight from the path, which is inside app.asar in a packaged
    // build — see the note in electron.vite.config.ts for the measurement
    // that says this is safe, and symbols/pool.ts for the other worker that
    // does exactly the same thing. This site used to carry an eval+require
    // bootstrap to dodge an asar trap that does not exist on our Electron;
    // it was removed at Phase 14 integration so there is ONE way a
    // main-process worker starts.
    const w = new Worker(entry, {
      workerData: { rgPath },
      // Phase 13.8: a named thread is an attributable CPU spike. Node appends
      // this to the worker's title, so an inspector target or a thread dump
      // says WHICH subsystem is hot instead of "worker 1".
      name: WORKER_NAMES.quickOpen,
      // The worker is a background helper; it must never be the reason the
      // app takes an extra beat to quit.
      stdout: false,
      stderr: false
    });
    w.unref();

    w.on('message', (msg: QuickOpenResponse) => {
      if (msg.type === 'error') {
        quickopenLog.warn(`quick open worker: ${msg.message}`);
        if (msg.id === undefined) return;
        const p = pending.get(msg.id);
        if (p === undefined) return;
        pending.delete(msg.id);
        clearTimeout(p.timer);
        p.resolve(emptyResult(p.seq));
        return;
      }
      const p = pending.get(msg.id);
      if (p === undefined) return; // superseded, or timed out already
      pending.delete(msg.id);
      clearTimeout(p.timer);
      p.resolve({
        seq: p.seq,
        hits: msg.hits,
        total: msg.total,
        ready: msg.ready,
        indexed: msg.indexed,
        refreshing: msg.refreshing,
        capped: msg.capped
      });
    });

    w.on('error', (err) => {
      quickopenLog.warn(`quick open worker crashed: ${err.message}`);
    });

    w.on('exit', () => {
      if (worker === w) worker = null;
      // Every index died with it. Forget what was warm so the next query
      // rebuilds rather than reporting a list that no longer exists.
      lastUsed.clear();
      lastRecentsKey = '';
      drainPending();
    });

    worker = w;
    return w;
  }

  function send(msg: QuickOpenRequest): boolean {
    const w = ensureWorker();
    if (w === null) return false;
    w.postMessage(msg);
    return true;
  }

  function startSweep(): void {
    if (sweep !== null) return;
    sweep = setInterval(() => {
      const cutoff = Date.now() - IDLE_EVICT_MS;
      for (const [root, at] of lastUsed) {
        if (at >= cutoff) continue;
        lastUsed.delete(root);
        worker?.postMessage({ type: 'drop', root });
      }
    }, EVICT_SWEEP_MS);
    sweep.unref?.();
  }

  if (typeof deps.onRepoChanged === 'function') {
    unsubscribeWatcher = deps.onRepoChanged((repoPath) => {
      const root = norm(repoPath);
      // Only roots we actually hold an index for: an invalidate for anything
      // else would make the worker index a project nobody has opened in ⌘P.
      if (!lastUsed.has(root)) return;
      worker?.postMessage({ type: 'invalidate', root });
    });
  }

  return {
    warm(repoPath) {
      const root = norm(repoPath);
      lastUsed.set(root, Date.now());
      startSweep();
      send({ type: 'warm', root });
    },

    query(input) {
      const roots = input.roots.map(norm).filter((r, i, all) => all.indexOf(r) === i);
      const now = Date.now();
      for (const root of roots) lastUsed.set(root, now);
      startSweep();

      const w = ensureWorker();
      if (w === null) {
        return Promise.resolve(
          failedResult(
            input.seq,
            startupError ?? 'Quick open could not start its ranking worker.'
          )
        );
      }

      // Recents change only when a file is opened, not on every keystroke.
      const recents = input.recents ?? [];
      const key = recents.join('\n');
      if (key !== lastRecentsKey) {
        lastRecentsKey = key;
        w.postMessage({ type: 'recents', keys: recents });
      }

      const id = nextId++;
      return new Promise<QuickOpenResult>((resolveQuery) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          resolveQuery(emptyResult(input.seq));
        }, QUERY_TIMEOUT_MS);
        timer.unref?.();
        pending.set(id, { resolve: resolveQuery, timer, seq: input.seq });
        w.postMessage({
          type: 'query',
          id,
          roots,
          query: input.query,
          limit: input.limit
        });
      });
    },

    async dispose() {
      disposed = true;
      unsubscribeWatcher?.();
      unsubscribeWatcher = null;
      if (sweep !== null) clearInterval(sweep);
      sweep = null;
      drainPending();
      const w = worker;
      worker = null;
      if (w !== null) await w.terminate();
    }
  };
}
