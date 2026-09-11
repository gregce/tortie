/**
 * The parser the fact pass asks for call sites (Phase 257).
 *
 * `src/main/arch/tree-facts.ts` takes its parser as an INJECTED seam rather
 * than naming the worker pool itself, for two reasons that are the same
 * reason. `conformance:reading` loads `tree-facts.ts` under plain node from a
 * bare copy of this directory, which carries no `../symbols/pool`, and
 * `src/main/symbols/shared-pool.ts` reaches `paths.ts`, which names electron;
 * either import would end that gate with a module it cannot find rather than
 * with a pin. And the unit suite drives the pass with an in process
 * `SymbolExtractor` and no worker at all, which is what lets it assert the
 * orchestration without a thread.
 *
 * So this module is the one place the shared pool is turned into that seam,
 * and `src/main/arch/check-coordinator.ts` hands it in at its two call sites.
 * It is the SAME pool ⌘⇧O and the import scan use, which is research 19's
 * worker budget working as intended: a third reader of one parse is not a
 * second pool.
 */

import { BATCH_SIZE } from '../symbols/pool';
import { sharedSymbolPool } from '../symbols/shared-pool';
import type { IndexedFile } from '../symbols/worker';

/** What one ask of the parser wants back. `calls` is always on; the fact pass has no other reason to parse. */
export interface FactParseAsk {
  calls: true;
  wrappers: boolean;
}

/** The seam. Structurally the pool's own `run`, plus the batch size the caller slices by. */
export interface ArchFactParser {
  /** Files per ask. */
  batchSize: number;
  run(files: readonly { relPath: string; absPath: string }[], ask: FactParseAsk): Promise<IndexedFile[]>;
}

/** The shared worker pool as the fact pass's parser. */
export function sharedFactParser(): ArchFactParser {
  return {
    batchSize: BATCH_SIZE,
    run: (files, ask) => sharedSymbolPool().run([...files], ask)
  };
}
