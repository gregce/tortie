/**
 * actions:* IPC (Phase 46) — the per-domain registrar (growth guardrail 2),
 * called once from src/main/capabilities.ts:
 *
 *     registerActionsIpc(ipcMain);
 *
 * and, on quit:
 *
 *     disposeActionsIpc();
 *
 * Four channels, every one of them a read. Registering them costs four
 * closures: `actions:observe` is the first thing that creates any state at
 * all, and it creates a record and reads one git ref. A user who never
 * expands the Runs section never pays for anything here.
 */

import type { IpcMain } from 'electron';
import { handle } from '../typed-ipc';
import {
  disposeActionsService,
  observeRepo,
  readJobs,
  readRuns,
  releaseRepo
} from './service';

export function registerActionsIpc(ipc: IpcMain): void {
  handle(ipc, 'actions:runs', (_event, input) => readRuns(input));
  handle(ipc, 'actions:jobs', (_event, input) => readJobs(input));
  handle(ipc, 'actions:observe', (_event, repoPath) => observeRepo(repoPath));
  handle(ipc, 'actions:release', (_event, repoPath) => {
    releaseRepo(repoPath);
  });
}

/** Quit-time teardown: stop every watch timer and forget every record. */
export function disposeActionsIpc(): void {
  disposeActionsService();
}
