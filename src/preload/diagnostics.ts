/**
 * The diagnostics half of the bridge (Phase 163).
 *
 * Three invokes and one local read. `begin` and `finish` are the two ends of
 * one capture window, and `saveHeapSnapshot` is the opt in artifact behind
 * its own action. `rendererMemory` never crosses to main: the preload runs
 * inside the renderer process, so `process.getProcessMemoryInfo`,
 * `process.getHeapStatistics` and `process.getBlinkMemoryInfo` answer for
 * THIS renderer here, and main could not ask them for us. Every number is
 * turned from Electron's KB into bytes once, at this one door.
 *
 * Nothing here subscribes to anything and nothing here runs on a timer.
 */

import type {
  DiagnosticsRendererMemory,
  GmuxDiagnosticsExtras
} from '../shared/ipc';
import { invoke } from './bridge';

const KB = 1024;

async function rendererMemory(): Promise<DiagnosticsRendererMemory | null> {
  try {
    const info = await process.getProcessMemoryInfo();
    const heap = process.getHeapStatistics();
    const blink = process.getBlinkMemoryInfo();
    return {
      privateBytes: info.private * KB,
      sharedBytes: info.shared * KB,
      heapUsedBytes: heap.usedHeapSize * KB,
      heapTotalBytes: heap.totalHeapSize * KB,
      heapLimitBytes: heap.heapSizeLimit * KB,
      mallocedBytes: heap.mallocedMemory * KB,
      blinkAllocatedBytes: blink.allocated * KB,
      blinkTotalBytes: blink.total * KB
    };
  } catch {
    return null;
  }
}

export const diagnostics: GmuxDiagnosticsExtras['diagnostics'] = {
  begin: () => invoke('diagnostics:begin'),
  finish: (id, facts) => invoke('diagnostics:finish', id, facts),
  rendererMemory,
  saveHeapSnapshot: (target) => invoke('diagnostics:saveHeapSnapshot', target)
};
