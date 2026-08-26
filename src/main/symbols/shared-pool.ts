/**
 * THE tree-sitter worker pool, and there is one (Phase 63).
 *
 * Research 19's worker budget is one resident worker for quick open plus at
 * most six transient parse workers, and it says in its own words that a fourth
 * home for this kind of work means deleting one of the others first. Phase 63
 * added a second READER of the same parse, being the arch view's import fact
 * base, and a second reader is not a second budget. Both readers ask this
 * module for the pool, so a machine running an import scan and a ⌘⇧O index at
 * the same time runs at most six workers between them rather than twelve.
 *
 * The pool itself is unchanged and still lazy, still capped at six, still
 * evicted after thirty idle minutes. What moved here is only the decision about
 * WHO OWNS IT, which used to be the symbols IPC registrar by accident of being
 * the first caller.
 */

import { grammarDir, runtimeWasmPath } from './paths';
import { SymbolPool } from './pool';

let pool: SymbolPool | null = null;

/**
 * The pool, created on first use.
 *
 * Creating it compiles no wasm and starts no thread: the workers spawn on the
 * first batch, so a person who never opens the arch view and never presses
 * ⌘⇧O pays nothing for this module at all.
 */
export function sharedSymbolPool(): SymbolPool {
  if (pool === null) {
    pool = new SymbolPool({
      runtimeWasm: runtimeWasmPath(),
      grammarDir: grammarDir()
    });
  }
  return pool;
}

/**
 * End every worker, permanently. Quit time only, and safe to call twice.
 *
 * The reference is dropped BEFORE the shutdown is awaited, so a later caller
 * gets a fresh pool rather than one that has been shut down and answers every
 * batch with an empty list.
 */
export async function shutdownSharedSymbolPool(): Promise<void> {
  const open = pool;
  pool = null;
  await open?.shutdown();
}
