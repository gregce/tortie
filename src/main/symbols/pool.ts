/**
 * The symbol worker pool — LAZY, capped at six, evicted when idle.
 *
 * SIX IS MEASURED, NOT GUESSED (research 19 §3.3): indexing specstory-sync
 * took 823 ms at 1 worker, 474 at 2, 407 at 4, **300 at 6**, and 313 at 8.
 * Six is the knee; eight is slower. The pool never exceeds `cpus - 2` either,
 * so indexing cannot starve the main thread and the tmux poll it runs.
 *
 * WHY IT IS LAZY, and this is a product constraint rather than an
 * optimisation: gmux runs on a battery next to a stack of live coding agents.
 * Research 19 §5.3's lifecycle rule 1 is "never on project open" — an index
 * nobody asked for is exactly the burn the guardrail forbids. Workers are
 * created on the first ⌘⇧O for a project and torn down after
 * IDLE_EVICT_MS with no work, giving back both the threads and the ~5 MB of
 * compiled wasm each was holding.
 *
 * THE WORKER BUDGET (research 19 §O5) is 1 resident (quick open) + at most 6
 * transient (these). A fourth home for search work means deleting one of them
 * first.
 */

import { cpus } from 'node:os';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import type {
  IndexedFile,
  SymbolWorkerData,
  SymbolWorkerMessage,
  SymbolWorkerRequest
} from './worker';
import { WORKER_NAMES } from '../proc/identity';
import type { GrammarId } from './languages';

/** Idle time after which the pool gives its threads back. */
export const IDLE_EVICT_MS = 30 * 60 * 1000;

/**
 * Files per batch. Small enough that progress ticks feel live on a big repo,
 * large enough that the postMessage round trip disappears next to ~1.25 ms of
 * parse per file.
 */
export const BATCH_SIZE = 48;

export interface PoolOptions {
  runtimeWasm: string;
  /** Absolute wasm path per grammar, from paths.ts's grammarPaths(). */
  grammarPaths: Record<GrammarId, string>;
  /** Override for tests; production uses the electron-vite emitted entry. */
  workerPath?: string;
  /** Override the worker count (tests use 1 for determinism). */
  size?: number;
}

interface Pending {
  resolve: (files: IndexedFile[]) => void;
  reject: (err: Error) => void;
}

interface Slot {
  worker: Worker;
  ready: Promise<void>;
  busy: boolean;
  pending: Map<number, Pending>;
}

export function defaultPoolSize(): number {
  return Math.max(1, Math.min(6, cpus().length - 2));
}

/**
 * The worker entry as electron-vite emits it. Main is bundled to
 * `out/main/index.js`; `symbols-worker.js` is a second rollup input beside it
 * (see electron.vite.config.ts), so `__dirname` is the right base in both the
 * dev build and the packaged asar — loading a worker from inside app.asar
 * needs no shim, and the measurement that says so sits beside those entries.
 */
function defaultWorkerPath(): string {
  return join(__dirname, 'symbols-worker.js');
}

export class SymbolPool {
  private readonly slots: Slot[] = [];
  private readonly queue: {
    files: { relPath: string; absPath: string }[];
    wantImports: boolean;
    pending: Pending;
  }[] = [];
  private nextBatchId = 1;
  private idleTimer: NodeJS.Timeout | null = null;
  private disposed = false;

  constructor(private readonly options: PoolOptions) {}

  /**
   * Parse a batch of files. Resolves with whatever the worker could read.
   *
   * `options.imports` asks the worker to send the imports back as well
   * (Phase 63). It is off by default and the symbol index never turns it on:
   * the extractor finds imports out of the same walk either way, so this flag
   * decides only what crosses the thread boundary. ONE pool serves both
   * readers, which is research 19's worker budget working as intended rather
   * than a second resident pool.
   */
  run(
    files: { relPath: string; absPath: string }[],
    options: { imports?: boolean } = {}
  ): Promise<IndexedFile[]> {
    if (this.disposed) return Promise.resolve([]);
    this.cancelIdleEviction();
    return new Promise<IndexedFile[]>((resolve, reject) => {
      this.queue.push({
        files,
        wantImports: options.imports === true,
        pending: { resolve, reject }
      });
      this.pump();
    });
  }

  private pump(): void {
    while (this.queue.length > 0) {
      const slot = this.freeSlot();
      if (slot === null) return;
      const job = this.queue.shift();
      if (job === undefined) return;
      const batchId = this.nextBatchId++;
      slot.busy = true;
      slot.pending.set(batchId, job.pending);
      void slot.ready.then(
        () =>
          slot.worker.postMessage({
            batchId,
            files: job.files,
            imports: job.wantImports
          } satisfies SymbolWorkerRequest),
        (err: unknown) => {
          slot.pending.delete(batchId);
          slot.busy = false;
          job.pending.reject(err as Error);
        }
      );
    }
    this.scheduleIdleEviction();
  }

  private freeSlot(): Slot | null {
    const free = this.slots.find((s) => !s.busy);
    if (free !== undefined) return free;
    const size = this.options.size ?? defaultPoolSize();
    if (this.slots.length >= size) return null;
    return this.spawn();
  }

  private spawn(): Slot {
    const workerData: SymbolWorkerData = {
      runtimeWasm: this.options.runtimeWasm,
      grammarPaths: this.options.grammarPaths
    };
    const worker = new Worker(this.options.workerPath ?? defaultWorkerPath(), {
      workerData,
      // Phase 13.8: name the thread so a tree-sitter parse storm is
      // attributable to symbols rather than to "the main process".
      name: WORKER_NAMES.symbols
    });
    const slot: Slot = {
      worker,
      busy: false,
      pending: new Map(),
      ready: Promise.resolve()
    };
    slot.ready = new Promise<void>((resolve, reject) => {
      const onMessage = (msg: SymbolWorkerMessage): void => {
        if (msg.type === 'ready') resolve();
        else if (msg.type === 'boot-failed') reject(new Error(msg.message));
      };
      worker.once('error', reject);
      worker.on('message', onMessage);
    });

    worker.on('message', (msg: SymbolWorkerMessage) => {
      if (msg.type !== 'result') return;
      const pending = slot.pending.get(msg.batchId);
      slot.pending.delete(msg.batchId);
      slot.busy = false;
      pending?.resolve(msg.files);
      this.pump();
    });
    worker.on('error', (err) => {
      // A dead worker fails only ITS batches; the pool re-spawns on the next
      // job so one bad file cannot permanently break indexing for the session.
      for (const pending of slot.pending.values()) pending.reject(err);
      slot.pending.clear();
      this.drop(slot);
      this.pump();
    });
    worker.on('exit', () => {
      for (const pending of slot.pending.values()) pending.resolve([]);
      slot.pending.clear();
      this.drop(slot);
    });

    this.slots.push(slot);
    return slot;
  }

  private drop(slot: Slot): void {
    const i = this.slots.indexOf(slot);
    if (i !== -1) this.slots.splice(i, 1);
  }

  private scheduleIdleEviction(): void {
    if (this.idleTimer !== null || this.slots.length === 0) return;
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      if (this.queue.length > 0 || this.slots.some((s) => s.busy)) {
        this.scheduleIdleEviction();
        return;
      }
      void this.dispose();
    }, IDLE_EVICT_MS);
    this.idleTimer.unref?.();
  }

  private cancelIdleEviction(): void {
    if (this.idleTimer === null) return;
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  /** Terminate every worker. The pool is reusable — `run` re-spawns. */
  async dispose(): Promise<void> {
    this.cancelIdleEviction();
    const slots = [...this.slots];
    this.slots.length = 0;
    await Promise.all(
      slots.map((s) => s.worker.terminate().catch(() => undefined))
    );
  }

  /** Permanent teardown (app quit). */
  async shutdown(): Promise<void> {
    this.disposed = true;
    for (const job of this.queue) job.pending.resolve([]);
    this.queue.length = 0;
    await this.dispose();
  }
}
