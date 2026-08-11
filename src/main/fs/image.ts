/**
 * The image reader behind `fs:readImage` (Phase 12.10 item 1).
 *
 * Two revisions, two very different answers, one channel:
 *
 *   worktree — STAT ONLY. The pixels reach the renderer over the privileged
 *              `gmux-asset:` scheme built in Phase 12, so this side never
 *              reads a byte: it proves the file exists, that gmux can decode
 *              its type, and that it is under the cap, then hands back the
 *              URL. That is what keeps a 20 MB animated GIF a streamed,
 *              cached decode instead of a 27 MB base64 string in renderer
 *              memory.
 *   HEAD     — `git show HEAD:<relPath>` through the existing GitService
 *              (showAtRefBuffer is already binary-safe and already used by
 *              the text diff), base64'd into a data URL. There is no file on
 *              disk for a blob, so this is the one place bytes cross IPC.
 *
 * Symlinks are resolved before the extension is judged, exactly as the asset
 * protocol does it: a link named `logo.png` pointing at a private key must
 * not become a preview. The extension list itself is shared, not copied —
 * src/shared/image-types.ts is the single answer to "can gmux display this".
 */

import { realpath, stat } from 'node:fs/promises';
import { isAbsolute, resolve as resolvePath } from 'node:path';
import type {
  ImageReadInput,
  ImageReadResult
} from '@shared/image-types';
import { IMAGE_CAP_BYTES, imageMediaType } from '@shared/image-types';
import { assetUrlForPath } from '../assets';
import { gmuxError } from '../tmux/errors';

/** What the reader needs from the outside world (swapped in tests). */
export interface ImageReaderDeps {
  /** Byte size of a regular file; throws when it is not one. */
  statFile(path: string): Promise<{ size: number; isFile: boolean }>;
  /** Resolve symlinks (the extension is re-checked against the target). */
  realPath(path: string): Promise<string>;
  /** `git show <ref>:<relPath>` bytes, or null when the blob is absent. */
  showAtRef(
    repoPath: string,
    ref: string,
    relPath: string
  ): Promise<Buffer | null>;
  /** URL the renderer can load the working copy from. */
  assetUrl(absPath: string): string;
}

export interface ImageReader {
  read(input: ImageReadInput): Promise<ImageReadResult>;
}

export function createImageReader(deps: ImageReaderDeps): ImageReader {
  const read = async (input: ImageReadInput): Promise<ImageReadResult> => {
    if (
      input === null ||
      typeof input !== 'object' ||
      typeof input.path !== 'string' ||
      input.path.trim().length === 0
    ) {
      throw gmuxError('INVALID_INPUT', 'An image path is required.');
    }
    const abs = resolvePath(input.path);
    if (!isAbsolute(abs)) {
      throw gmuxError('INVALID_INPUT', 'An image path must be absolute.');
    }
    const mediaType = imageMediaType(abs);
    if (mediaType === null) {
      // Reached only by a caller that skipped isImagePath(); say which file
      // rather than "unsupported", so the toast is actionable.
      throw gmuxError(
        'FS_FAILED',
        `gmux cannot display ${abs.slice(abs.lastIndexOf('/') + 1)}.`
      );
    }

    return input.rev === 'HEAD'
      ? readAtHead(input, abs, mediaType)
      : readWorktree(abs, mediaType);
  };

  const readWorktree = async (
    abs: string,
    mediaType: string
  ): Promise<ImageReadResult> => {
    let real: string;
    let size: number;
    try {
      real = await deps.realPath(abs);
      // The link target decides: `logo.png -> ~/.ssh/id_rsa` is not an image.
      if (imageMediaType(real) === null) {
        throw gmuxError('FS_FAILED', 'That file is not an image.');
      }
      const info = await deps.statFile(real);
      if (!info.isFile) {
        throw gmuxError('FS_FAILED', 'That path is not a file.');
      }
      size = info.size;
    } catch (err) {
      if (err instanceof Error && err.name === 'GmuxError') throw err;
      return { status: 'missing', path: abs };
    }

    if (size > IMAGE_CAP_BYTES) {
      return {
        status: 'too-large',
        path: abs,
        mediaType,
        bytes: size,
        capBytes: IMAGE_CAP_BYTES
      };
    }
    return {
      status: 'ok',
      path: abs,
      mediaType,
      bytes: size,
      // The pixels come from the asset scheme, not from this reply — see the
      // module header. `real` (not `abs`) so a symlinked asset resolves once
      // here instead of again on every re-render.
      url: deps.assetUrl(real),
      dataUrl: null
    };
  };

  const readAtHead = async (
    input: ImageReadInput,
    abs: string,
    mediaType: string
  ): Promise<ImageReadResult> => {
    const repoPath = input.repoPath;
    const relPath = input.relPath;
    if (
      typeof repoPath !== 'string' ||
      repoPath.length === 0 ||
      typeof relPath !== 'string' ||
      relPath.length === 0
    ) {
      throw gmuxError(
        'INVALID_INPUT',
        'Reading an image at HEAD needs the repository and the path inside it.'
      );
    }
    const buf = await deps.showAtRef(repoPath, 'HEAD', relPath);
    // No blob at HEAD is the normal shape of an ADDED image, not a failure.
    if (buf === null) return { status: 'missing', path: abs };
    if (buf.byteLength > IMAGE_CAP_BYTES) {
      return {
        status: 'too-large',
        path: abs,
        mediaType,
        bytes: buf.byteLength,
        capBytes: IMAGE_CAP_BYTES
      };
    }
    return {
      status: 'ok',
      path: abs,
      mediaType,
      bytes: buf.byteLength,
      url: null,
      dataUrl: `data:${mediaType};base64,${buf.toString('base64')}`
    };
  };

  return { read };
}

/** Production dependencies (real fs, the shared GitService registry). */
export function defaultImageReaderDeps(): ImageReaderDeps {
  return {
    statFile: async (path) => {
      const info = await stat(path);
      return { size: info.size, isFile: info.isFile() };
    },
    realPath: (path) => realpath(path),
    showAtRef: async (repoPath, ref, relPath) => {
      // Lazy: the fs channels must not drag the git service into the module
      // graph at boot, and by the time a user opens an image it has long
      // since resolved. (Same reason file-ops.ts imports the core lazily.)
      const { getGitService } = await import('../git');
      return getGitService(repoPath).showAtRefBuffer(ref, relPath);
    },
    assetUrl: (absPath) => assetUrlForPath(absPath)
  };
}
