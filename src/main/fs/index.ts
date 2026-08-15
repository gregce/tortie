/** fs module — file-tree bridge handlers (fs:readDir / fs:reveal). */

export { registerFsIpc } from './ipc';
/** The image path (Phase 12.10) — deliberately not part of registerFsIpc. */
export { registerImageIpc } from './image-ipc';
export {
  createImageReader,
  defaultImageReaderDeps,
  type ImageReader,
  type ImageReaderDeps
} from './image';
/** Open With (Phase 39) — the app list and the launch. */
export {
  createOpenWith,
  defaultOpenWithDeps,
  isAppBundleOnDisk,
  launchRecorder,
  normalizeLookup,
  parseLookup,
  APP_LOOKUP_SCRIPT,
  OPEN_WITH_DEADLINE_MS,
  type AppChooser,
  type OpenWithDeps,
  type OpenWithService
} from './open-with';
