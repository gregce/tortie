/**
 * Re-export of the canonical open-file bus (Phase 4 integration).
 *
 * The SCM and tree streams originally shipped two different payload shapes
 * on the same CustomEvent name; src/renderer/state/open-file.ts is now the
 * single contract (absolute path + relPath + mode 'diff' | 'file'). This
 * shim keeps the SCM stream's import paths working unchanged.
 */

export {
  OPEN_FILE_EVENT,
  onOpenFile,
  requestOpenFile
} from '../state/open-file';
export type { OpenFileCommitRef, OpenFileRequest } from '../state/open-file';
