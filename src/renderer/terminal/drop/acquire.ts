/**
 * Getting absolute paths out of a drop or a paste.
 *
 * The ladder (research 16 §4.2), in order:
 *   1. `webUtils.getPathForFile(file)` via the preload → a real path, zero I/O.
 *      NEVER copy, wrap or re-`new File()` the File first: that is what
 *      actually breaks path resolution.
 *   2. '' (browser drag, synthesized File) → read the bytes and have main
 *      write them into the drop store under userData.
 *   3. no files at all, but a text/uri-list or text/plain URL → insert the URL
 *      verbatim; agents fetch URLs themselves and the renderer CSP forbids us.
 *
 * THE most likely bug in this whole feature is doing any of it too late:
 * after the first `await` in a drop handler, `dataTransfer.items` and
 * `.files` both read empty (VERIFIED on Electron 43). `extractDrop` is
 * synchronous for exactly that reason — the File objects it captures survive
 * the await, the DataTransfer does not.
 */

import type { GmuxDropExtras } from '@shared/ipc';
import type { DropPersistResult, DropPrepareResult } from '@shared/types';

/** Mirror of the main-side cap (src/main/drop/store.ts MAX_DROP_BYTES). */
export const MAX_DROP_BYTES = 25 * 1024 * 1024;

/** The optional drop surface on the preload bridge (feature-detected). */
export function dropBridge(): NonNullable<GmuxDropExtras['drop']> | null {
  const api = window.gmux as (GmuxDropExtras & object) | undefined;
  return api?.drop ?? null;
}

/** `webUtils.getPathForFile` through the preload; '' when unavailable. */
export function pathForFile(file: File): string {
  const api = window.gmux as (GmuxDropExtras & object) | undefined;
  const resolve = api?.pathForFile;
  if (typeof resolve !== 'function') return '';
  try {
    return resolve(file);
  } catch {
    return '';
  }
}

/** Everything a DataTransfer holds, read synchronously. */
export interface ExtractedTransfer {
  files: File[];
  uriList: string;
  text: string;
}

/** SYNCHRONOUS read of a drop's payload — never await before calling this. */
export function extractDrop(event: DragEvent): ExtractedTransfer {
  const dt = event.dataTransfer;
  if (!dt) return { files: [], uriList: '', text: '' };
  return {
    files: Array.from(dt.files),
    uriList: dt.getData('text/uri-list'),
    text: dt.getData('text/plain')
  };
}

/** SYNCHRONOUS read of a paste's image files (⌘V). */
export function extractPasteImages(data: DataTransfer | null): File[] {
  if (!data) return [];
  const out: File[] = [];
  for (const item of Array.from(data.items)) {
    if (item.kind !== 'file') continue;
    const file = item.getAsFile();
    if (file && file.type.startsWith('image/')) out.push(file);
  }
  return out;
}

/** True when the drag (dragover time — no data readable yet) carries files. */
export function dragHasFiles(event: DragEvent): boolean {
  const types = Array.from(event.dataTransfer?.types ?? []);
  return types.includes('Files') || types.includes('text/uri-list');
}

/** True when at least one dragged item announces an image MIME type. */
export function dragLooksLikeImage(event: DragEvent): boolean {
  const items = Array.from(event.dataTransfer?.items ?? []);
  return items.some((i) => i.kind === 'file' && i.type.startsWith('image/'));
}

/**
 * How many files the drag carries, at dragover time. `items` exposes kind and
 * type throughout the drag even though `getData` is locked (protected mode),
 * so the overlay can name the count before the user commits. 0 when the drag
 * announces no items at all (a bare text/uri-list).
 */
export function dragFileCount(event: DragEvent): number {
  const items = Array.from(event.dataTransfer?.items ?? []);
  return items.filter((i) => i.kind === 'file').length;
}

/**
 * Resolve one File to an absolute path, writing it into the drop store when
 * it has none of its own. Returns '' when nothing usable came back.
 */
export async function resolveFilePath(file: File): Promise<string> {
  const direct = pathForFile(file);
  if (direct.length > 0) return direct;
  const bridge = dropBridge();
  if (!bridge) return '';
  // Checked here as well as in main so an oversized browser drag never gets
  // copied across the IPC boundary just to be refused on the other side.
  if (file.size > MAX_DROP_BYTES) {
    throw new Error('That image is too large to attach (25 MB max).');
  }
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    // Directories throw NotFoundError here — but a directory always has a
    // path, so it never reaches this branch.
    return '';
  }
  const res: DropPersistResult = await bridge.persist({
    name: file.name,
    mime: file.type,
    bytes
  });
  return res.path;
}

/** Classify resolved paths in main (dir vs file, image sniff, newline rescue). */
export async function preparePaths(paths: string[]): Promise<DropPrepareResult> {
  const bridge = dropBridge();
  if (!bridge || paths.length === 0) return { items: [] };
  return bridge.prepare(paths);
}

/** First http(s) URL in a uri-list / text payload, or ''. */
export function firstUrl(transfer: ExtractedTransfer): string {
  const source = transfer.uriList.length > 0 ? transfer.uriList : transfer.text;
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
  }
  return '';
}
