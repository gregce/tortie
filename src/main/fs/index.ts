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
