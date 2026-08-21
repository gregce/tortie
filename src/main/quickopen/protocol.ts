/**
 * The main ↔ quick-open-worker message contract. Types only — imported by
 * both sides so a message shape is stated once.
 *
 * WHY THE WORKER OWNS EVERYTHING: the path list for a 50,000-file project is
 * ~4 MB of strings and its `fuzzysort` index is another ~35 MB. Structured
 * cloning that per query — or even once per refresh — would cost more than
 * the ranking does. So the worker enumerates, indexes, ranks and returns
 * fifty rows; nothing bigger than fifty rows ever crosses the boundary.
 */

import type { QuickOpenHit, QuickOpenRecent } from '@shared/ipc';

/** Boot-time data — the ripgrep path main resolved (search/resolve.ts). */
export interface QuickOpenWorkerData {
  rgPath: string;
}

/** Index this root now (project opened, or the palette just opened). */
export interface WarmMessage {
  type: 'warm';
  /**
   * The ROOT KEY. See `QuickOpenWarmInput` in src/shared/ipc/search.ts. A
   * folder on this Mac is its own absolute path; a folder on another machine is
   * `machine:<machineId>:<path>`.
   */
  root: string;
  /** Re-enumerate even if the index looks fresh. */
  force?: boolean;
  /**
   * PHASE 99, and it is the one field research 57 section 6.5 priced. The whole
   * name list for a root the worker cannot enumerate itself. When it is present
   * `ensureIndex` adopts it and never spawns anything for that root.
   */
  paths?: string[];
}

/** Rank across roots. `id` comes back on the matching QueryDone. */
export interface QueryMessage {
  type: 'query';
  id: number;
  roots: string[];
  query: string;
  limit: number;
}

/** The renderer's recently-opened list changed (tiebreaker + empty query). */
export interface RecentsMessage {
  type: 'recents';
  /**
   * Most recent first, already normalised by the coordinator.
   *
   * PHASE 99 put the machine inside the root, so the same relative path under
   * the same absolute path on two computers is two entries rather than one.
   *
   * PHASE 121 replaced a `string[]` of `${root} ${relPath}` keys. The worker
   * took each one apart at the first space, which is wrong for a root holding
   * one, and dropped the file. Two fields cannot split wrong.
   */
  recents: QuickOpenRecent[];
}

/** A watcher event says this root drifted; refresh on the coalescing timer. */
export interface InvalidateMessage {
  type: 'invalidate';
  root: string;
}

/** Forget this root's index (project closed, or it went idle). */
export interface DropMessage {
  type: 'drop';
  root: string;
}

export type QuickOpenRequest =
  | WarmMessage
  | QueryMessage
  | RecentsMessage
  | InvalidateMessage
  | DropMessage;

/** The answer to one QueryMessage. */
export interface QueryDone {
  type: 'result';
  id: number;
  hits: QuickOpenHit[];
  total: number;
  ready: boolean;
  indexed: number;
  refreshing: boolean;
  capped: boolean;
}

/** Something went wrong in a way the palette should say out loud. */
export interface WorkerFailure {
  type: 'error';
  /** Present when the failure belongs to one in-flight query. */
  id?: number;
  message: string;
}

export type QuickOpenResponse = QueryDone | WorkerFailure;
