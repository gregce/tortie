/**
 * symbols:* IPC — the per-domain registrar (growth guardrail 2), called once
 * from main-process boot:
 *
 *     import { registerSymbolsIpc } from './symbols';
 *     registerSymbolsIpc(ipcMain);
 *
 * and on quit:
 *
 *     await disposeSymbolsIpc();
 *
 * Everything expensive is LAZY. Registering these handlers opens no database,
 * starts no thread and compiles no wasm: the service, the pool and the SQLite
 * file are all created on the first `symbols:ensure`, which only happens when
 * a user actually presses ⌘⇧O. A gmux session that never asks for a symbol
 * pays nothing for this module beyond three `ipcMain.handle` calls.
 */

import { BrowserWindow } from 'electron';
import type { IpcMain } from 'electron';
import { EVT_SYMBOLS_PROGRESS } from '@shared/ipc';
import type { SymbolIndexProgress } from '@shared/symbols';
import { handle } from '../typed-ipc';
import { onRepoChanged } from '../watcher';
import { assetProblem, grammarDir, runtimeWasmPath } from './paths';
import { SymbolPersistence } from './persist';
import { SymbolPool } from './pool';
import { SymbolService } from './service';

let service: SymbolService | null = null;
let persistence: SymbolPersistence | null = null;

function broadcast(progress: SymbolIndexProgress): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(EVT_SYMBOLS_PROGRESS, progress);
    }
  }
}

/** The service, created on first use. */
function getService(): SymbolService {
  if (service !== null) return service;
  persistence = new SymbolPersistence();
  const pool = new SymbolPool({
    runtimeWasm: runtimeWasmPath(),
    grammarDir: grammarDir()
  });
  service = new SymbolService({
    pool,
    persistence,
    onProgress: broadcast,
    onRepoChanged,
    assetProblem
  });
  return service;
}

export function registerSymbolsIpc(ipc: IpcMain): void {
  handle(ipc, 'symbols:query', (_e, input) => {
    // NEVER starts a build — see the lifecycle note in src/shared/ipc.ts. A
    // project nobody has asked about answers `cold: true` and costs nothing.
    if (service === null) {
      return { hits: [], indexing: false, indexed: 0, total: 0, cold: true };
    }
    return service.query(input);
  });

  handle(ipc, 'symbols:ensure', (_e, repoPath) => {
    try {
      return getService().ensure(repoPath);
    } catch (err) {
      // A build that cannot even start (no database, no grammars) must not
      // reject the palette's call — the UI has a place to say so.
      console.warn(
        `[gmux] symbol index unavailable: ${(err as Error).message}`
      );
      return { started: false, indexing: false, indexed: 0, total: 0 };
    }
  });

  handle(ipc, 'symbols:release', (_e, repoPath) => {
    service?.release(repoPath);
  });
}

/** Quit-time teardown: terminate workers, close the database. */
export async function disposeSymbolsIpc(): Promise<void> {
  const current = service;
  service = null;
  await current?.dispose();
  persistence?.close();
  persistence = null;
}
