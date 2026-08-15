/**
 * The symbol index, per project — enumeration, incremental build, watcher
 * invalidation, persistence and eviction, in one place.
 *
 * THE LIFECYCLE IS THE FEATURE (research 19 §5.3), so it is worth stating in
 * full before the code:
 *
 *  1. **Never on project open.** Nothing here runs until `ensure()` is called,
 *     and only the palette calls it — a symbol index nobody asked for is
 *     exactly the battery burn the backlog forbids next to a stack of live
 *     agents.
 *  2. **The first ⌘⇧O (or `#`) builds it, in the background, and the palette
 *     stays usable throughout.** `query()` answers from whatever is already in
 *     the table and reports `indexing / indexed / total` so the UI can say so
 *     honestly. Measured cold builds: 351 ms for gmux, 453 ms for a 285-file
 *     Go repo, 300 ms for a 645-file TS repo at six workers.
 *  3. **Persisted per (repoPath, relPath, mtimeMs, size).** Relaunch re-stats
 *     and re-parses only what drifted, so the second build of a project is
 *     the cost of the diff, not the cost of the repo.
 *  4. **Incremental from the watcher bus**, 300 ms debounce, 1.25 ms per
 *     changed file. A save is free. Unlike content search, this one DOES
 *     update itself silently — it has no visible cursor to disturb.
 *  5. **Evicted after 30 idle minutes.** The threads and the wasm go back; the
 *     SQLite copy survives, so the next ⌘⇧O is a diff, not a rebuild.
 *
 * Everything expensive is off the main thread except the SQLite writes, which
 * are chunked one worker batch at a time precisely so they stay short.
 */

import { stat } from 'node:fs/promises';
import { join, resolve as resolvePath } from 'node:path';
import type {
  SymbolEnsureResult,
  SymbolHit,
  SymbolIndexProgress,
  SymbolQueryResult
} from '@shared/symbols';
import type { ExtractedSymbol } from './extract';
import { listIndexableFiles } from './files';
import { BATCH_SIZE, IDLE_EVICT_MS, SymbolPool } from './pool';
import type { FileStamp, SymbolPersistence } from './persist';
import { SymbolTable } from './store';
import { getLog } from '../log';

/**
 * Scope "symbols" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const symbolsLog = getLog('symbols');


/** Coalescing window for watcher-driven refreshes. */
const WATCH_DEBOUNCE_MS = 300;

/**
 * In-memory tables idle this long give their memory back — the same window
 * after which the worker pool gives its threads back, which is why it is
 * `pool.ts`'s constant rather than a second copy of the number here: the two
 * halves of "an idle project costs nothing" have to expire together
 * (research 25 §3, Tier 3). Re-exported for `symbols/index.ts`.
 */
export { IDLE_EVICT_MS };

/**
 * At most one progress message per repo per this many ms.
 *
 * 120, not 250: measured in the app, a 643-file build reported `0 of 643` for
 * a quarter of a second before the first tick, and a counter that sits at zero
 * is the same sentence as no counter at all. At 120 ms the number visibly
 * climbs, and it is still at most eight small messages per second.
 */
const PROGRESS_THROTTLE_MS = 120;

/** Concurrent `stat` calls while diffing an enumeration against the stamps. */
const STAT_CONCURRENCY = 64;

export interface SymbolServiceDeps {
  pool: SymbolPool;
  persistence: SymbolPersistence;
  /** Push progress to every window. */
  onProgress(progress: SymbolIndexProgress): void;
  /** Subscribe to the ONE repo watcher (src/main/watcher/bus.ts). */
  onRepoChanged?(cb: (repoPath: string) => void): () => void;
  /**
   * Why the index cannot build at all — missing grammars in a packaged app.
   * Returns null when everything is present.
   */
  assetProblem?(): string | null;
}

interface RepoState {
  repoPath: string;
  table: SymbolTable;
  /** Persisted freshness keys, kept in step with the table. */
  stamps: Map<string, FileStamp>;
  /** A build has completed at least once in this app run. */
  built: boolean;
  indexing: boolean;
  indexed: number;
  total: number;
  error: string | null;
  /** Bumped on every new build so a superseded one stops writing. */
  epoch: number;
  lastUsed: number;
  evictTimer: NodeJS.Timeout | null;
  watchTimer: NodeJS.Timeout | null;
  lastProgressAt: number;
  loadedFromDisk: boolean;
}

export class SymbolService {
  private readonly repos = new Map<string, RepoState>();
  private unsubscribeWatcher: (() => void) | null = null;
  private disposed = false;

  constructor(private readonly deps: SymbolServiceDeps) {
    this.unsubscribeWatcher =
      deps.onRepoChanged?.((repoPath) => this.onRepoChanged(repoPath)) ?? null;
  }

  /**
   * Answer from whatever is indexed NOW. Deliberately never starts a build —
   * that is `ensure`'s job, and keeping them separate is what makes "never on
   * project open" enforceable rather than a convention.
   */
  query(input: {
    repoPath: string;
    query: string;
    relPath?: string;
    limit: number;
  }): SymbolQueryResult {
    const key = norm(input.repoPath);
    const state = this.repos.get(key);
    if (state === undefined) {
      return {
        hits: [],
        indexing: false,
        indexed: 0,
        total: 0,
        cold: true
      };
    }
    this.touch(state);
    const hits: SymbolHit[] = state.table.query(
      input.query,
      input.limit,
      input.relPath
    );
    return {
      hits,
      indexing: state.indexing,
      indexed: state.indexed,
      total: state.total,
      cold: !state.built && !state.indexing,
      ...(state.error !== null ? { error: state.error } : {})
    };
  }

  /** Build (or resume building) a project's index. Returns immediately. */
  ensure(repoPath: string): SymbolEnsureResult {
    const key = norm(repoPath);
    let state = this.repos.get(key);
    if (state === undefined) {
      state = this.createState(key);
      this.repos.set(key, state);
    }
    this.touch(state);
    if (state.indexing) {
      return {
        started: false,
        indexing: true,
        indexed: state.indexed,
        total: state.total
      };
    }
    void this.build(state);
    return { started: true, indexing: true, indexed: state.indexed, total: 0 };
  }

  /** Drop a project's in-memory table (its tab closed). SQLite survives. */
  release(repoPath: string): void {
    const key = norm(repoPath);
    const state = this.repos.get(key);
    if (state === undefined) return;
    state.epoch += 1;
    if (state.evictTimer !== null) clearTimeout(state.evictTimer);
    if (state.watchTimer !== null) clearTimeout(state.watchTimer);
    state.table.clear();
    this.repos.delete(key);
  }

  /** Quit-time teardown. */
  async dispose(): Promise<void> {
    this.disposed = true;
    this.unsubscribeWatcher?.();
    this.unsubscribeWatcher = null;
    for (const state of this.repos.values()) {
      state.epoch += 1;
      if (state.evictTimer !== null) clearTimeout(state.evictTimer);
      if (state.watchTimer !== null) clearTimeout(state.watchTimer);
    }
    this.repos.clear();
    await this.deps.pool.shutdown();
  }

  // -------------------------------------------------------------------------
  // Build
  // -------------------------------------------------------------------------

  private createState(repoPath: string): RepoState {
    return {
      repoPath,
      table: new SymbolTable(),
      stamps: new Map(),
      built: false,
      indexing: false,
      indexed: 0,
      total: 0,
      error: null,
      epoch: 0,
      lastUsed: Date.now(),
      evictTimer: null,
      watchTimer: null,
      lastProgressAt: 0,
      loadedFromDisk: false
    };
  }

  private async build(state: RepoState): Promise<void> {
    const problem = this.deps.assetProblem?.() ?? null;
    if (problem !== null) {
      state.error = problem;
      state.indexing = false;
      this.emit(state, true);
      return;
    }

    const epoch = ++state.epoch;
    state.indexing = true;
    state.error = null;
    state.indexed = 0;
    state.total = 0;
    this.emit(state, true);

    try {
      // 1. Seed from SQLite, once per app run. Cheap on a small repo and the
      //    whole reason the SECOND launch of a project is instant.
      if (!state.loadedFromDisk) {
        state.loadedFromDisk = true;
        state.stamps = this.deps.persistence.loadStamps(state.repoPath);
        const persisted = this.deps.persistence.loadSymbols(state.repoPath);
        for (const [relPath, symbols] of persisted) {
          state.table.setFile(relPath, symbols);
        }
        // A file with zero symbols is still indexed; loadSymbols cannot see it.
        for (const relPath of state.stamps.keys()) {
          if (!state.table.has(relPath)) state.table.setFile(relPath, []);
        }
      }

      // 2. Enumerate through the one ripgrep.
      const files = await listIndexableFiles(state.repoPath);
      if (state.epoch !== epoch) return;
      state.total = files.length;
      this.emit(state, true);

      // 3. Forget anything that no longer exists (deletes, renames, a branch
      //    flip). Doing this BEFORE the parse keeps the palette from offering
      //    a jump into a file that is gone.
      const present = new Set(files);
      const vanished = [...state.stamps.keys()].filter((p) => !present.has(p));
      if (vanished.length > 0) {
        for (const relPath of vanished) state.stamps.delete(relPath);
        state.table.retainOnly(present);
        this.deps.persistence.forgetFiles(state.repoPath, vanished);
      }

      // 4. Diff against the stamps: only drifted or unknown files are parsed.
      const drifted = await this.selectDrifted(state, files);
      if (state.epoch !== epoch) return;
      state.indexed = files.length - drifted.length;
      this.emit(state, true);

      // 5. Parse, batch by batch, persisting and reporting as we go.
      for (let i = 0; i < drifted.length; i += BATCH_SIZE) {
        if (state.epoch !== epoch || this.disposed) return;
        const batch = drifted.slice(i, i + BATCH_SIZE).map((relPath) => ({
          relPath,
          absPath: join(state.repoPath, relPath)
        }));
        const parsed = await this.deps.pool.run(batch);
        if (state.epoch !== epoch) return;

        for (const file of parsed) {
          state.table.setFile(file.relPath, file.symbols);
          state.stamps.set(file.relPath, {
            mtimeMs: file.mtimeMs,
            size: file.size
          });
        }
        // Chunked on purpose: better-sqlite3 is synchronous, so this blocks
        // the main thread for as long as it runs. One batch is tens of ms; the
        // whole build in one transaction would freeze the window for seconds.
        try {
          this.deps.persistence.saveFiles(state.repoPath, parsed);
        } catch (err) {
          // Losing the CACHE is survivable — the in-memory table is already
          // correct and the next launch just re-parses. Never fail the build.
          symbolsLog.warn(
            `could not persist symbols for ${state.repoPath}: ${
              (err as Error).message
            }`
          );
        }
        state.indexed += batch.length;
        this.emit(state, false);
      }

      state.built = true;
      state.indexing = false;
      this.emit(state, true);
    } catch (err) {
      if (state.epoch !== epoch) return;
      state.indexing = false;
      state.error = (err as Error).message;
      this.emit(state, true);
    } finally {
      if (state.epoch === epoch) this.scheduleEviction(state);
    }
  }

  /**
   * Which files need parsing: unknown to the index, or whose `mtimeMs`/`size`
   * no longer match what was recorded. `stat` runs with a small concurrency
   * cap so a 50k-file diff never becomes one synchronous storm.
   */
  private async selectDrifted(
    state: RepoState,
    files: string[]
  ): Promise<string[]> {
    const drifted: string[] = [];
    for (let i = 0; i < files.length; i += STAT_CONCURRENCY) {
      const slice = files.slice(i, i + STAT_CONCURRENCY);
      const results = await Promise.all(
        slice.map(async (relPath) => {
          const known = state.stamps.get(relPath);
          if (known === undefined) return relPath;
          try {
            const st = await stat(join(state.repoPath, relPath));
            if (st.mtimeMs === known.mtimeMs && st.size === known.size) {
              return null;
            }
          } catch {
            // Unreadable right now (an agent mid-write) — try to parse it; the
            // worker will skip it if it still cannot be read.
          }
          return relPath;
        })
      );
      for (const relPath of results) if (relPath !== null) drifted.push(relPath);
    }
    return drifted;
  }

  // -------------------------------------------------------------------------
  // Watcher, eviction, progress
  // -------------------------------------------------------------------------

  /**
   * A repo changed on disk. Only repos with a LIVE index react — a project
   * whose symbols were never asked for stays untouched, which is what keeps
   * rule 1 true while agents write files continuously.
   */
  private onRepoChanged(repoPath: string): void {
    const state = this.repos.get(norm(repoPath));
    if (state === undefined || state.indexing) return;
    if (state.watchTimer !== null) return;
    state.watchTimer = setTimeout(() => {
      state.watchTimer = null;
      if (state.indexing) return;
      void this.build(state);
    }, WATCH_DEBOUNCE_MS);
    state.watchTimer.unref?.();
  }

  private touch(state: RepoState): void {
    state.lastUsed = Date.now();
    this.scheduleEviction(state);
  }

  private scheduleEviction(state: RepoState): void {
    if (state.evictTimer !== null) clearTimeout(state.evictTimer);
    state.evictTimer = setTimeout(() => {
      state.evictTimer = null;
      if (state.indexing) {
        this.scheduleEviction(state);
        return;
      }
      if (Date.now() - state.lastUsed < IDLE_EVICT_MS) {
        this.scheduleEviction(state);
        return;
      }
      // Memory back, SQLite kept: the next ⌘⇧O re-seeds from disk and parses
      // only what drifted since.
      state.epoch += 1;
      state.table.clear();
      state.stamps.clear();
      state.built = false;
      state.loadedFromDisk = false;
      state.indexed = 0;
      state.total = 0;
      this.repos.delete(state.repoPath);
    }, IDLE_EVICT_MS);
    state.evictTimer.unref?.();
  }

  private emit(state: RepoState, force: boolean): void {
    const now = Date.now();
    if (!force && now - state.lastProgressAt < PROGRESS_THROTTLE_MS) return;
    state.lastProgressAt = now;
    this.deps.onProgress({
      repoPath: state.repoPath,
      indexing: state.indexing,
      indexed: state.indexed,
      total: state.total,
      symbols: state.table.symbolCount,
      ...(state.error !== null ? { error: state.error } : {})
    });
  }
}

/** Everything addresses projects by resolved absolute path, once. */
function norm(repoPath: string): string {
  return resolvePath(repoPath);
}

/** Re-exported so tests can build a table without the whole service. */
export type { ExtractedSymbol };
