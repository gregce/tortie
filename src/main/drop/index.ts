/**
 * drop domain (Phase 12 item 8) — the main-process half of "drop a file onto
 * a session". Path classification, the pathless-bytes store under userData,
 * and its pruning policy.
 *
 * INTEGRATOR wiring (src/main/index.ts):
 *   registerDropIpc(ipcMain);      // beside registerAgentsIpc, at app ready
 *   startDropStorePruning();       // after the window exists; unref'd timer
 * and, in createWindow(), the navigation guard that keeps a missed
 * preventDefault() from replacing the app with file:///…:
 *   win.webContents.on('will-navigate', (e, url) => {
 *     if (url !== win.webContents.getURL()) e.preventDefault();
 *   });
 */

export { registerDropIpc } from './ipc';
export { needsRescueCopy, preparePaths } from './prepare';
export {
  droppedImagesDir,
  MAX_DROP_BYTES,
  persistDroppedBytes,
  pruneDroppedImages,
  safeStem,
  sniffImage,
  startDropStorePruning
} from './store';
