/**
 * Classify the absolute paths a drop produced (drop:prepare).
 *
 * Two decisions belong in main, not in the renderer (research 16 §4.2):
 *  1. directory vs file — one stat(), two very different outcomes (a folder
 *     dropped on a session adds a PROJECT; a file inserts a reference).
 *     The renderer must never guess: `File.arrayBuffer()` on a directory
 *     throws NotFoundError, which is not a classification.
 *  2. the newline rescue — macOS permits \r and \n in filenames, and xterm
 *     rewrites \n → \r before bracketing, so such a path pasted into an
 *     agent prompt can submit half a prompt. Those files are copied into the
 *     drop store under a safe name and the copy is referenced instead.
 *
 * Ownership: src/main/drop/**.
 */

import { copyFile, open, stat } from 'node:fs/promises';
import { isAbsolute, resolve as resolvePath } from 'node:path';
import type { DropPreparedItem, DropPrepareResult } from '@shared/types';
import { ensureDropStore, rescueCopyPath, sniffImage } from './store';

/** Bytes read to sniff content type — every signature we test fits in 256. */
const HEAD_BYTES = 256;

/** A filename gmux refuses to paste verbatim. */
export function needsRescueCopy(path: string): boolean {
  return /[\r\n]/.test(path);
}

async function readHead(path: string): Promise<Uint8Array> {
  const handle = await open(path, 'r');
  try {
    const buf = Buffer.alloc(HEAD_BYTES);
    const { bytesRead } = await handle.read(buf, 0, HEAD_BYTES, 0);
    return new Uint8Array(buf.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
}

async function prepareOne(raw: string): Promise<DropPreparedItem> {
  const missing: DropPreparedItem = {
    sourcePath: raw,
    kind: 'missing',
    refPath: raw,
    copied: false,
    isImage: false,
    bytes: 0
  };
  if (raw.length === 0 || !isAbsolute(raw)) return missing;
  const path = resolvePath(raw);

  let st;
  try {
    st = await stat(path);
  } catch {
    return { ...missing, sourcePath: path, refPath: path };
  }
  if (st.isDirectory()) {
    return {
      sourcePath: path,
      kind: 'dir',
      refPath: path,
      copied: false,
      isImage: false,
      bytes: 0
    };
  }
  if (!st.isFile()) return { ...missing, sourcePath: path, refPath: path };

  let isImage = false;
  try {
    isImage = sniffImage(await readHead(path)) !== null;
  } catch {
    /* unreadable head — treat as a non-image file, the path still inserts */
  }

  let refPath = path;
  let copied = false;
  if (needsRescueCopy(path)) {
    try {
      await ensureDropStore();
      const target = rescueCopyPath(path);
      await copyFile(path, target);
      refPath = target;
      copied = true;
    } catch {
      // The copy is a safety measure; if it fails the caller still gets the
      // original path and can decide to refuse it (the renderer does).
    }
  }

  return {
    sourcePath: path,
    kind: 'file',
    refPath,
    copied,
    isImage,
    bytes: st.size
  };
}

/** Classify every path in one round trip (drops are small lists). */
export async function preparePaths(paths: string[]): Promise<DropPrepareResult> {
  const items = await Promise.all(paths.map((p) => prepareOne(p)));
  return { items };
}
