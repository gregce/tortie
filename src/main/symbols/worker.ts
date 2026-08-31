/**
 * Symbol-index worker — a `worker_threads` entry point, one of at most six,
 * created lazily and evicted after 30 idle minutes.
 *
 * It does exactly two things: boot the tree-sitter wasm runtime once, then
 * turn batches of file paths into symbols. It READS THE FILES ITSELF rather
 * than being handed their contents, because a batch of 500 TypeScript files is
 * ~5 MB of source that would otherwise be structured-cloned across the thread
 * boundary for no reason — the worker has the same filesystem.
 *
 * PURE WASM, and that is the whole reason this design was chosen over
 * universal-ctags or `@ast-grep/napi` (research 19 §0.1): zero native code and
 * zero codesigning burden. Nothing here needs `electron-rebuild`, nothing here
 * gets `dlopen`ed, and nothing here breaks under the hardened runtime.
 */

import { parentPort, workerData } from 'node:worker_threads';
import type { GrammarId } from './languages';
import { SymbolExtractor } from './extract';
import type { ExtractedImport, ExtractedSymbol } from './extract';

/** What the pool hands each worker at construction. */
export interface SymbolWorkerData {
  runtimeWasm: string;
  /**
   * Absolute wasm path per grammar, finished in main by paths.ts. The worker
   * used to join one directory itself; since Phase 180 the vendored grammars
   * live in a second directory in development, and paths.ts is the one module
   * that knows which grammar lives where.
   */
  grammarPaths: Record<GrammarId, string>;
}

/** One batch of work. */
export interface SymbolWorkerRequest {
  batchId: number;
  files: { relPath: string; absPath: string }[];
  /**
   * Send the imports back too (Phase 63). Off by default, and that default is
   * the point: the extractor finds them either way out of the same walk, and
   * this flag decides only whether they are structured cloned back across the
   * thread boundary. ⌘⇧O never asks for them, so it never pays for them.
   */
  imports?: boolean;
}

/** One file's contribution to the index. */
export interface IndexedFile {
  relPath: string;
  mtimeMs: number;
  size: number;
  symbols: ExtractedSymbol[];
  /** Present only when the request asked for imports (Phase 63). */
  imports?: ExtractedImport[];
}

export type SymbolWorkerMessage =
  | { type: 'ready' }
  | { type: 'boot-failed'; message: string }
  | { type: 'result'; batchId: number; files: IndexedFile[]; skipped: number };

const port = parentPort;
if (port !== null) {
  void run(port);
}

async function run(port_: NonNullable<typeof parentPort>): Promise<void> {
  const data = workerData as SymbolWorkerData;
  let extractor: SymbolExtractor;
  try {
    extractor = await SymbolExtractor.create({
      runtimeWasm: data.runtimeWasm,
      grammarPath: (id: GrammarId) => data.grammarPaths[id]
    });
  } catch (err) {
    const message: SymbolWorkerMessage = {
      type: 'boot-failed',
      message: (err as Error).message
    };
    port_.postMessage(message);
    return;
  }

  port_.postMessage({ type: 'ready' } satisfies SymbolWorkerMessage);

  port_.on('message', (raw: SymbolWorkerRequest) => {
    void (async () => {
      const files: IndexedFile[] = [];
      let skipped = 0;
      for (const file of raw.files) {
        // One bad file never fails a batch: a source tree an agent is midway
        // through rewriting WILL contain a half-written file, and losing 499
        // good files to it would make the index feel unreliable.
        try {
          const got = await extractor.extractFile(file.relPath, file.absPath);
          if (got === null) {
            skipped += 1;
            continue;
          }
          files.push({
            relPath: file.relPath,
            mtimeMs: got.mtimeMs,
            size: got.size,
            symbols: got.symbols,
            ...(raw.imports === true ? { imports: got.imports } : {})
          });
        } catch {
          skipped += 1;
        }
      }
      const message: SymbolWorkerMessage = {
        type: 'result',
        batchId: raw.batchId,
        files,
        skipped
      };
      port_.postMessage(message);
    })();
  });
}
