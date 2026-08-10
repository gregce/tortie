/**
 * Terminal capture — main-process surface (Phase 12 items 1 + 2).
 *
 * Wiring (src/main/index.ts, beside the other domain registrars):
 *   import { registerCaptureIpc } from './capture';
 *   registerCaptureIpc(ipcMain);
 */

export { registerCaptureIpc } from './ipc';
export {
  captureImage,
  capturePaneText,
  captureViewport,
  clearHistory,
  resetCaptureState,
  saveLastCapture,
  saveLastCaptureTo,
  writeRichClipboard
} from './service';
