/**
 * THE quick-open worker — one resident `worker_threads` Worker per window,
 * owned by coordinator.ts. Everything about ⌘P that costs CPU or memory
 * happens in here, and nothing bigger than fifty rows ever leaves.
 *
 * ── Why a worker at all ────────────────────────────────────────────────────
 * Content search deliberately parses on the MAIN thread (research 19 §2.1):
 * it is IO-bound, streaming, and capped. Quick open is the opposite — a
 * resident ~45 MB index and a synchronous CPU burst on EVERY keystroke — so
 * it is the one search subsystem that earns a resident thread. The worker
 * also spawns its own `rg --files`, so the 50k-270k path strings are born
 * here and never cross a thread boundary at all.
 *
 * ── The two-stage ranker (research 19 §0.1, §3.2) ──────────────────────────
 *   stage 1  `fuzzysort` snapshot  →  the best 512 of the whole list
 *            The only scorer measured fast enough to touch every path
 *            (0.1-10 ms at 50k-272k). Its snapshot is immutable, which is
 *            exactly why the refresh path below rebuilds rather than mutates.
 *   stage 2  the vendored VS Code fuzzy scorer  →  reranks those 512
 *            1-10 ms, and the only configuration measured that put all 26
 *            labelled targets in the top 5.
 * VS Code does the same thing with a worse gate: its
 * `AnythingQuickAccessProvider` keeps the first 512 matches in WALK order,
 * unranked. Ours keeps the top 512 BY SCORE — same budget, strictly better
 * recall.
 *
 * ── How stale the list can be ──────────────────────────────────────────────
 * Agents create and delete files continuously, so "when was this list last
 * true" is a real question and the answer is bounded in exactly two ways:
 *
 *   1. WATCHER PATH (the normal one). The existing @parcel/watcher
 *      subscription — one per repo, already running for git, reused through
 *      src/main/watcher/bus.ts rather than doubled — fires `invalidate` here.
 *      That signal is coalesced to at most one re-enumeration every
 *      REFRESH_COALESCE_MS. Worst case = the watcher's own 300 ms debounce
 *      + 2 s coalesce + one enumeration (16 ms at 12k files, 157 ms at 272k)
 *      ≈ 2.5 s from an agent's write to the path being findable.
 *   2. PALETTE-OPEN PATH (the safety net). `ensureWatcher` in git/ipc.ts is
 *      only called from git IPC, so a project that never took a `git:*` call
 *      — a plain folder, or one whose watcher subscription failed — has NO
 *      watcher and would otherwise never refresh. Every `warm` (the renderer
 *      sends one each time ⌘P opens) re-enumerates a list older than
 *      QUICK_OPEN_WARM_STALE_MS. Worst case there = the age of the list when
 *      you pressed ⌘P, and pressing ⌘P is what fixes it.
 *
 * ── A root this worker cannot enumerate (Phase 99) ─────────────────────────
 * A project can be a folder on ANOTHER MACHINE. This worker cannot spawn
 * anything over there, and handing ripgrep a path that names a folder on that
 * machine would make it read a different folder here or nothing at all. So such
 * a root is told apart by its ROOT KEY, `machine:<machineId>:<path>`, its index
 * is created empty, and its whole name list arrives on a `warm` and is adopted.
 * The freshness rule above does not apply to it, because there is nothing here
 * to re-enumerate: the renderer applies the same QUICK_OPEN_WARM_STALE_MS to
 * its own read of that machine instead. One number, two appliers, and no root
 * is subject to both.
 *
 * Both bounds are deliberately in the worker, not the coordinator: the
 * coordinator does not know when an enumeration finished, and a second timer
 * on the main thread would be a second answer to the same question.
 */

import { spawn } from 'node:child_process';
import type { ChildProcessByStdio } from 'node:child_process';
import type { Readable } from 'node:stream';
import { parentPort, workerData } from 'node:worker_threads';
import { go, snapshot } from 'fuzzysort';
import type { Snapshot } from 'fuzzysort';
import type { QuickOpenHit, QuickOpenRecent } from '@shared/ipc';
import { QUICK_OPEN_WARM_STALE_MS } from '@shared/ipc';
import { LOCAL_MACHINE_ID, targetOfRootKey } from '@shared/workspace-target';
// THE `rg --files` argv (research 19 §2.3, O2 "one ripgrep, three
// consumers"). It lives in the content-search module because that module owns
// the ripgrep vocabulary; importing the leaf directly rather than the package
// index keeps `registerSearchIpc` — and therefore electron — out of this
// worker's bundle.
import { buildListFilesArgs } from '../search/files-args';
import type {
  QueryMessage,
  QuickOpenRequest,
  QuickOpenResponse,
  QuickOpenWorkerData
} from './protocol';
import { hitOf, recentHitOf, recentMapKeyOf } from './rows';
import {
  compareScored,
  positionsForPath,
  prepareQuery,
  scoreItem,
  splitPath
} from './scorer';
import type { ScoredItem } from './scorer';

// ---------------------------------------------------------------------------
// Budgets — every one of these is a measured number from research 19 §3.2,
// not a guess.
// ---------------------------------------------------------------------------

/**
 * Stage-1 survivors handed to the reranker. VS Code's
 * `AnythingQuickAccessProvider.MAX_RESULTS`. Measured lossless: gating to 512
 * matched whole-list ranking to three decimals, and every disagreement in a
 * top-10 audit was tie-group shuffling among identically-scored files.
 */
const GATE = 512;

/**
 * Paths indexed per project. At 272k the index costs 234 MB, a 297 ms prewarm
 * and a 540 ms refresh; the only tree on this machine that reaches it is
 * 268k `.specstory` history files, which is better solved by excluding
 * history than by paying for it. A capped root still works — it is just
 * missing its tail, and the palette says so.
 */
const MAX_PATHS = 200_000;

/** At most one watcher-driven re-enumeration per this window. */
const REFRESH_COALESCE_MS = 2_000;

/**
 * Recents kept as a tiebreaker map. The renderer sends its list; fifty is far
 * more than anyone scrolls back through and keeps the message trivial.
 */
const MAX_RECENTS = 50;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface RootIndex {
  /** The ROOT KEY, not necessarily a path this Mac has. */
  root: string;
  /**
   * PHASE 99. The root is a folder on another machine, so nothing here may
   * enumerate it and its names are handed to it by a `warm`.
   */
  remote: boolean;
  /** The authoritative list from the last COMPLETED enumeration. */
  paths: string[];
  /** Membership set for the cheap "did anything actually change" diff. */
  set: Set<string>;
  /** fuzzysort's immutable index over `paths`. Null until the first build. */
  snap: Snapshot | null;
  /** The enumeration in flight is accumulating here. */
  building: string[] | null;
  /** stdin is ignored; stdout and stderr are pipes. */
  child: ChildProcessByStdio<null, Readable, Readable> | null;
  /** `Date.now()` of the last completed enumeration; 0 = never. */
  builtAt: number;
  /** A refresh arrived while one was running. */
  pendingRefresh: boolean;
  /** Coalescing timer from `invalidate`. */
  refreshTimer: NodeJS.Timeout | null;
  capped: boolean;
  /** Last enumeration failure, shown once rather than retried in a loop. */
  error: string | null;
}

const indexes = new Map<string, RootIndex>();

/**
 * The renderer's recently opened list, most recent first. The empty query
 * answers from this, in this order.
 *
 * PHASE 121. It used to be read back out of `recentRank` by sorting the map's
 * entries by their value. That sort was a no-op, because the map is filled in
 * list order and the value IS the index, so it always returned the insertion
 * order. The order is held directly now and no ordering rule was dropped.
 */
let recentOrder: readonly QuickOpenRecent[] = [];

/**
 * `recentMapKeyOf(root, relPath)` to the position in that list. The tiebreaker
 * between two paths that scored the same.
 */
let recentRank = new Map<string, number>();

const { rgPath } = workerData as QuickOpenWorkerData;

const port = parentPort;
if (port === null) {
  throw new Error('quick-open worker started without a parent port');
}

function post(message: QuickOpenResponse): void {
  port?.postMessage(message);
}

// ---------------------------------------------------------------------------
// Enumeration
// ---------------------------------------------------------------------------

function ensureIndex(root: string): RootIndex {
  let idx = indexes.get(root);
  if (idx === undefined) {
    idx = {
      root,
      // PHASE 99. One string comparison decides whether this worker may run a
      // program for this root at all.
      remote: targetOfRootKey(root).machineId !== LOCAL_MACHINE_ID,
      paths: [],
      set: new Set<string>(),
      snap: null,
      building: null,
      child: null,
      builtAt: 0,
      pendingRefresh: false,
      refreshTimer: null,
      capped: false,
      error: null
    };
    indexes.set(root, idx);
    // A root on another machine starts EMPTY with `builtAt` at 0, and waits for
    // its names. It stays not ready until a `warm` carrying them arrives, which
    // is the honest answer: Tortie holds no names for it yet.
    if (!idx.remote) enumerate(idx);
  }
  return idx;
}

function enumerate(idx: RootIndex): void {
  // PHASE 99, defence in depth. Ripgrep must never be handed a path that names
  // a folder on another computer. It would read a DIFFERENT file here, or none
  // at all, and either answer would be presented as that machine's files.
  if (idx.remote) return;
  if (idx.building !== null) {
    // An enumeration is already running. Remember that its answer will
    // already be stale when it lands, and run exactly one more afterwards —
    // never a queue of them, however hard an agent is writing.
    idx.pendingRefresh = true;
    return;
  }

  const accumulated: string[] = [];
  idx.building = accumulated;
  idx.capped = false;

  let child: ChildProcessByStdio<null, Readable, Readable>;
  try {
    child = spawn(rgPath, buildListFilesArgs(), {
      cwd: idx.root,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (err) {
    idx.building = null;
    idx.error = (err as Error).message;
    return;
  }
  idx.child = child;

  // Line splitting by hand rather than readline: this is the hottest IO in
  // the feature (271,791 paths in 157 ms) and readline's per-line object
  // churn is measurable at that rate.
  let tail = '';
  let stopped = false;
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    if (stopped) return;
    let start = 0;
    let nl = chunk.indexOf('\n');
    if (nl < 0) {
      tail += chunk;
      return;
    }
    // First line completes whatever the previous chunk left dangling.
    accumulated.push(tail + chunk.slice(start, nl));
    tail = '';
    start = nl + 1;
    while ((nl = chunk.indexOf('\n', start)) >= 0) {
      accumulated.push(chunk.slice(start, nl));
      start = nl + 1;
    }
    tail = chunk.slice(start);
    if (accumulated.length >= MAX_PATHS) {
      stopped = true;
      idx.capped = true;
      accumulated.length = MAX_PATHS;
      child.kill('SIGKILL');
    }
  });

  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => {
    if (stderr.length < 4096) stderr += chunk;
  });

  child.on('error', (err: Error) => {
    idx.child = null;
    idx.building = null;
    idx.error = err.message;
  });

  child.on('close', (code) => {
    idx.child = null;
    idx.building = null;
    if (!stopped && tail.length > 0) accumulated.push(tail);

    // Exit 1 from `rg --files` means "no files matched", which for an empty
    // folder is a fact, not a failure. Anything else with stderr is real.
    if (code !== 0 && code !== 1 && !stopped) {
      idx.error = stderr.trim() || `ripgrep exited with code ${String(code)}`;
      // Keep whatever list we already had rather than blanking the palette.
      if (idx.builtAt === 0) idx.builtAt = Date.now();
      return;
    }

    idx.error = null;
    adopt(idx, accumulated);

    if (idx.pendingRefresh) {
      idx.pendingRefresh = false;
      scheduleRefresh(idx);
    }
  });
}

/**
 * Swap a completed enumeration in. The snapshot is rebuilt only when the file
 * set actually changed: a watcher event usually means "a file was SAVED", and
 * re-indexing 50,000 unchanged paths to learn that would burn ~100 ms of
 * background CPU for nothing.
 */
function adopt(idx: RootIndex, paths: string[]): void {
  idx.builtAt = Date.now();

  let changed = paths.length !== idx.set.size;
  if (!changed) {
    for (const path of paths) {
      if (!idx.set.has(path)) {
        changed = true;
        break;
      }
    }
  }
  if (!changed && idx.snap !== null) return;

  idx.paths = paths;
  idx.set = new Set(paths);
  idx.snap = snapshot(paths);
  prewarm(idx.snap);
}

/**
 * MANDATORY, not an optimisation (research 19 §3.2). fuzzysort's per-target
 * preparation is lazy and lands on the first `go()` — 322-384 ms at 272k
 * paths, i.e. on the user's first keystroke. One throwaway query pays it here
 * instead, on a background thread, before ⌘P is pressed. The needle is
 * deliberately one that matches almost nothing: the walk is what costs, and
 * we do not want to also build a big result array.
 */
function prewarm(snap: Snapshot): void {
  go('zqxjv', snap, { limit: 1, threshold: 0 });
}

function scheduleRefresh(idx: RootIndex): void {
  if (idx.refreshTimer !== null) return;
  idx.refreshTimer = setTimeout(() => {
    idx.refreshTimer = null;
    enumerate(idx);
  }, REFRESH_COALESCE_MS);
  // A coalescing timer must never hold the process open.
  idx.refreshTimer.unref?.();
}

function dropIndex(root: string): void {
  const idx = indexes.get(root);
  if (idx === undefined) return;
  if (idx.refreshTimer !== null) clearTimeout(idx.refreshTimer);
  idx.child?.kill('SIGKILL');
  indexes.delete(root);
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

interface Row extends ScoredItem {
  /** The ROOT KEY the path came from. `./rows.ts` takes it apart. */
  repoPath: string;
  relPath: string;
  recentRank: number;
}

/** Stage 1: the best GATE paths of one root, or [] when there is no query. */
function gate(idx: RootIndex, query: string): readonly string[] {
  if (idx.snap !== null) {
    const results = go(query, idx.snap, { limit: GATE, threshold: 0 });
    const out: string[] = new Array<string>(results.length);
    for (let i = 0; i < results.length; i++) out[i] = results[i]!.target;
    return out;
  }
  // No snapshot yet — the first enumeration is still streaming in. Ranking a
  // plain array is slower per path, but the array is also partial, and the
  // alternative is a palette that refuses to answer for its first 40 ms.
  const partial = idx.building;
  if (partial === null || partial.length === 0) return [];
  const results = go(query, partial, { limit: GATE, threshold: 0 });
  const out: string[] = new Array<string>(results.length);
  for (let i = 0; i < results.length; i++) out[i] = results[i]!.target;
  return out;
}

/**
 * Sort: score first (VS Code's own comparator), and recency ONLY as the
 * tiebreaker between equally-scored paths.
 *
 * The temptation is to add a frecency bonus to the score. That is wrong for a
 * picker: it floats a file you once opened above a file that matches what you
 * are typing right now, and the user cannot see why. Equal score, though, is
 * a genuine coin toss — and there the file you were just in is the better
 * guess than the one that happens to sort earlier alphabetically.
 */
function compareRows(a: Row, b: Row): number {
  if (a.score !== b.score) return compareScored(a, b);
  if (a.recentRank !== b.recentRank) return a.recentRank - b.recentRank;
  return compareScored(a, b);
}

/**
 * The empty query answers with recents, in the renderer's own order.
 *
 * The membership test is on the ROOT KEY, so a recent file only answers inside
 * the root it was opened from. `./rows.ts` then turns the root into the path
 * and the machine, which is the one place that decomposition happens.
 *
 * PHASE 121. The root used to be recovered by splitting a joined key at its
 * first space, so `/Users/gdc/My Projects/app` was tested as
 * `/Users/gdc/My`, no root matched it, and every file in that project was
 * skipped. The root is its own field now and is compared whole.
 */
function recentsFor(roots: readonly string[], limit: number): QuickOpenHit[] {
  const rootSet = new Set(roots);
  const hits: QuickOpenHit[] = [];
  for (const entry of recentOrder) {
    if (!rootSet.has(entry.root)) continue;
    const hit = recentHitOf(entry);
    if (hit === null) continue;
    hits.push(hit);
    if (hits.length >= limit) break;
  }
  return hits;
}

function runQuery(msg: QueryMessage): void {
  const roots = msg.roots;
  let indexed = 0;
  let refreshing = false;
  let ready = true;
  let capped = false;

  const gathered: { idx: RootIndex; targets: readonly string[] }[] = [];
  for (const root of roots) {
    const idx = ensureIndex(root);
    indexed += idx.paths.length > 0 ? idx.paths.length : (idx.building?.length ?? 0);
    if (idx.building !== null) refreshing = true;
    if (idx.builtAt === 0) ready = false;
    if (idx.capped) capped = true;
    gathered.push({
      idx,
      targets: msg.query.length === 0 ? [] : gate(idx, msg.query)
    });
  }

  if (msg.query.length === 0) {
    const hits = recentsFor(roots, msg.limit);
    post({
      type: 'result',
      id: msg.id,
      hits,
      total: hits.length,
      ready,
      indexed,
      refreshing,
      capped
    });
    return;
  }

  const prepared = prepareQuery(msg.query);
  const rows: Row[] = [];
  for (const { idx, targets } of gathered) {
    for (const relPath of targets) {
      const { label, description } = splitPath(relPath);
      const scored = scoreItem(label, description, relPath, prepared, true);
      if (scored.score === 0) continue;
      rows.push({
        ...scored,
        label,
        description,
        path: relPath,
        repoPath: idx.root,
        relPath,
        recentRank:
          recentRank.get(recentMapKeyOf(idx.root, relPath)) ?? MAX_RECENTS
      });
    }
  }

  rows.sort(compareRows);
  const total = rows.length;
  rows.length = Math.min(rows.length, msg.limit);

  post({
    type: 'result',
    id: msg.id,
    hits: rows.map((row) =>
      hitOf(
        row.repoPath,
        row.relPath,
        positionsForPath(row.relPath, row),
        row.score,
        row.recentRank < MAX_RECENTS
      )
    ),
    total,
    ready,
    indexed,
    refreshing,
    capped
  });
}

// ---------------------------------------------------------------------------
// Message loop
// ---------------------------------------------------------------------------

port.on('message', (msg: QuickOpenRequest) => {
  try {
    switch (msg.type) {
      case 'warm': {
        const idx = ensureIndex(msg.root);
        // PHASE 99. A name list arrived for a root this worker cannot
        // enumerate. `adopt` sets `builtAt`, and it skips rebuilding the
        // snapshot when the set did not change, so a re-read that found nothing
        // new costs no CPU at all.
        if (msg.paths !== undefined) {
          adopt(idx, msg.paths);
          return;
        }
        // A remote root with no paths on this message has nothing to do here.
        // `enumerate` refuses it anyway, and the staleness rule below is about
        // a list this worker built.
        const stale = Date.now() - idx.builtAt > QUICK_OPEN_WARM_STALE_MS;
        if (idx.builtAt > 0 && (msg.force === true || stale)) enumerate(idx);
        return;
      }
      case 'query':
        runQuery(msg);
        return;
      case 'recents': {
        // One entry per key, keeping the first, which is the most recent. The
        // renderer's own `noteOpened` already drops an older duplicate, so this
        // normally removes nothing. It is here because the map this list also
        // fills can hold one entry per key either way, and the two have to
        // agree or the empty query could list one file twice.
        const order: QuickOpenRecent[] = [];
        const next = new Map<string, number>();
        for (const entry of msg.recents) {
          if (order.length >= MAX_RECENTS) break;
          const key = recentMapKeyOf(entry.root, entry.relPath);
          if (next.has(key)) continue;
          next.set(key, order.length);
          order.push(entry);
        }
        recentOrder = order;
        recentRank = next;
        return;
      }
      case 'invalidate': {
        const idx = indexes.get(msg.root);
        if (idx !== undefined) scheduleRefresh(idx);
        return;
      }
      case 'drop':
        dropIndex(msg.root);
        return;
    }
  } catch (err) {
    post({
      type: 'error',
      id: msg.type === 'query' ? msg.id : undefined,
      message: (err as Error).message
    });
  }
});
