/**
 * The drop store — <userData>/gmux/dropped-images.
 *
 * Where bytes go when a dropped or pasted image has no file of its own: a
 * browser drag, ⌘V of raw pasteboard image data, or the rescue copy for a
 * filename containing a newline (research 16 §3/§5).
 *
 * userData, NEVER app.getPath('temp'): macOS purges /var/folders on its own
 * schedule, but a `path-text` agent may read the file at submit time and a
 * resumed conversation may re-read it tomorrow. We own the lifetime, so we
 * own the directory — sibling of restore/snapshots (src/main/restore/
 * snapshots.ts, same shape on purpose).
 *
 * Cleanup is deliberately lazy: prune at app ready and once a day, never
 * within the session that wrote the file.
 *
 * Ownership: src/main/drop/**.
 */

import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { MAX_DROP_BYTES } from '@shared/image-types';
import { gmuxError } from '../errors';

/**
 * Largest single file we will copy into the store (one image, not a corpus).
 * Declared in `@shared/image-types` because the renderer enforces the same cap
 * before it reads the bytes; re-exported here so `main/drop/index.ts` and this
 * module's callers are unchanged.
 */
export { MAX_DROP_BYTES };

/** Files older than this are pruned. Long enough to survive a resume. */
const MAX_AGE_MS = 7 * 24 * 3600_000;

/** Directory ceiling; oldest files go first once it is exceeded. */
const MAX_DIR_BYTES = 200 * 1024 * 1024;

/** Prune cadence for a long-running app. */
const PRUNE_INTERVAL_MS = 24 * 3600_000;

/** <userData>/gmux/dropped-images — sibling of snapshots/. */
export function droppedImagesDir(): string {
  return join(app.getPath('userData'), 'gmux', 'dropped-images');
}

// ---------------------------------------------------------------------------
// Content sniffing — magic bytes, never the claimed filename
// ---------------------------------------------------------------------------

/** What the first bytes of a file actually are. */
export interface SniffResult {
  /** Extension INCLUDING the dot, e.g. '.png'. */
  ext: string;
  isImage: boolean;
}

function ascii(head: Uint8Array, from: number, length: number): string {
  let out = '';
  for (let i = from; i < from + length && i < head.length; i++) {
    out += String.fromCharCode(head[i] ?? 0);
  }
  return out;
}

function startsWith(head: Uint8Array, bytes: number[]): boolean {
  if (head.length < bytes.length) return false;
  return bytes.every((b, i) => head[i] === b);
}

/**
 * Identify an image from its leading bytes. Agents sniff attachments by
 * EXTENSION, and a browser drag routinely supplies a junk name, so the
 * extension we write must come from the content.
 */
export function sniffImage(head: Uint8Array): SniffResult | null {
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { ext: '.png', isImage: true };
  }
  if (startsWith(head, [0xff, 0xd8, 0xff])) return { ext: '.jpg', isImage: true };
  if (ascii(head, 0, 4) === 'GIF8') return { ext: '.gif', isImage: true };
  if (ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 4) === 'WEBP') {
    return { ext: '.webp', isImage: true };
  }
  if (ascii(head, 0, 2) === 'BM') return { ext: '.bmp', isImage: true };
  if (startsWith(head, [0x49, 0x49, 0x2a, 0x00]) ||
      startsWith(head, [0x4d, 0x4d, 0x00, 0x2a])) {
    return { ext: '.tiff', isImage: true };
  }
  if (startsWith(head, [0x00, 0x00, 0x01, 0x00])) {
    return { ext: '.ico', isImage: true };
  }
  if (ascii(head, 4, 4) === 'ftyp') {
    const brand = ascii(head, 8, 4);
    if (brand === 'avif' || brand === 'avis') return { ext: '.avif', isImage: true };
    if (['heic', 'heix', 'hevc', 'heim', 'mif1', 'msf1'].includes(brand)) {
      return { ext: '.heic', isImage: true };
    }
  }
  // SVG is text; only the unambiguous openings count.
  const text = ascii(head, 0, 200).trimStart();
  if (text.startsWith('<svg') || (text.startsWith('<?xml') && text.includes('<svg'))) {
    return { ext: '.svg', isImage: true };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Naming
// ---------------------------------------------------------------------------

/** Filesystem-safe stem: [A-Za-z0-9._-] only, 40 chars, never empty. */
export function safeStem(name: string): string {
  const base = name.replace(/^.*[/\\]/, '').replace(/\.[^.]*$/, '');
  const cleaned = base
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[-.]+/, '')
    .replace(/[-.]+$/, '');
  const capped = cleaned.slice(0, 40).replace(/[-.]+$/, '');
  return capped.length > 0 ? capped : 'image';
}

/** Extension from a claimed filename, sanitized; '' when there is nothing usable. */
function claimedExt(name: string): string {
  const ext = extname(name).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : '';
}

/**
 * A unique, unguessable, sortable filename inside the store. Time first so
 * pruning can read age off the name even if mtimes get rewritten.
 */
export function dropFileName(stem: string, ext: string): string {
  return `${Date.now()}-${randomUUID().slice(0, 8)}-${stem}${ext}`;
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

export interface StoredDrop {
  path: string;
  isImage: boolean;
}

/**
 * Write bytes into the store and return the absolute path. The extension is
 * taken from the content; the claimed name only supplies the stem (and, for
 * non-images, a fallback extension).
 */
export async function persistDroppedBytes(input: {
  name: string;
  mime: string;
  bytes: Uint8Array;
}): Promise<StoredDrop> {
  const { name, bytes } = input;
  if (bytes.byteLength === 0) {
    throw gmuxError('INVALID_INPUT', 'That file is empty.');
  }
  if (bytes.byteLength > MAX_DROP_BYTES) {
    throw gmuxError(
      'INVALID_INPUT',
      'That image is too large to attach (25 MB max).'
    );
  }
  const sniff = sniffImage(bytes.subarray(0, 256));
  const sniffed = sniff?.ext ?? claimedExt(name);
  const ext = sniffed.length > 0 ? sniffed : '.bin';
  const dir = await ensureDropStore();
  const path = join(dir, dropFileName(safeStem(name), ext));
  await writeFile(path, bytes, { mode: 0o600 });
  return { path, isImage: sniff !== null };
}

/** Absolute path for a rescue copy of `sourceName` (caller does the copy). */
export function rescueCopyPath(sourceName: string): string {
  const ext = claimedExt(sourceName);
  return join(droppedImagesDir(), dropFileName(safeStem(sourceName), ext));
}

/** Make sure the store directory exists (before a copyFile into it). */
export async function ensureDropStore(): Promise<string> {
  const dir = droppedImagesDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// Pruning
// ---------------------------------------------------------------------------

/**
 * Delete files older than 7 days, then oldest-first until the directory is
 * under 200 MB. Never touches anything written in this run's lifetime beyond
 * those rules — an attached path must stay readable for as long as the
 * conversation might re-read it.
 */
export async function pruneDroppedImages(now = Date.now()): Promise<void> {
  const dir = droppedImagesDir();
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return; // nothing written yet
  }
  const entries: { path: string; mtime: number; size: number }[] = [];
  for (const name of names) {
    const path = join(dir, name);
    try {
      const st = await stat(path);
      if (!st.isFile()) continue;
      entries.push({ path, mtime: st.mtimeMs, size: st.size });
    } catch {
      /* vanished under us — fine */
    }
  }

  const survivors: typeof entries = [];
  for (const entry of entries) {
    if (now - entry.mtime > MAX_AGE_MS) {
      await rm(entry.path, { force: true }).catch(() => undefined);
    } else {
      survivors.push(entry);
    }
  }

  let total = survivors.reduce((sum, e) => sum + e.size, 0);
  if (total <= MAX_DIR_BYTES) return;
  survivors.sort((a, b) => a.mtime - b.mtime);
  for (const entry of survivors) {
    if (total <= MAX_DIR_BYTES) break;
    await rm(entry.path, { force: true }).catch(() => undefined);
    total -= entry.size;
  }
}

/**
 * Prune now and once a day after that. Called from the app-ready sequence;
 * the timer is unref'd so it never holds the process open.
 */
export function startDropStorePruning(): void {
  void pruneDroppedImages().catch(() => undefined);
  const timer = setInterval(() => {
    void pruneDroppedImages().catch(() => undefined);
  }, PRUNE_INTERVAL_MS);
  timer.unref?.();
}
