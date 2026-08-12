/**
 * The image contract (Phase 12.10 item 1) — what counts as an image, what
 * media type it carries, and the shape of `fs:readImage`.
 *
 * Shared by main, preload and the renderer for the same reason fs-ops.ts is:
 * "can gmux preview this file" must be ONE answer. The editor asks it to
 * decide whether a click opens the image viewer or the text editor; the
 * `gmux-asset:` protocol handler asks it as a security allowlist before it
 * streams any bytes; the main-side reader asks it to name the media type.
 * Three copies of that list would drift into a file the tree offers to open
 * and the protocol then refuses to serve.
 *
 * WHY IMAGES NEVER TOUCH `fs:readFile`. That channel is UTF-8-only and
 * refuses anything with a NUL byte in its first 8 KB — which is exactly why
 * a .png tab used to read "gmux edits text files only". Images take this
 * contract instead, and the two paths never meet. The ONE deliberate overlap
 * is SVG, which is genuinely both: its PREVIEW comes from here, its SOURCE
 * from the text path, mirroring markdown's Preview/Source split.
 *
 * WHY THE WORKING COPY COMES BACK AS A URL AND NOT AS BYTES. The renderer
 * can already load a local image through the privileged `gmux-asset:` scheme
 * (built in Phase 12 for markdown), which streams from disk through
 * Chromium's own cache and decoder. Sending the same bytes over IPC as
 * base64 would hold every screenshot twice in renderer memory, break
 * animated GIF streaming, and buy nothing. So this channel does the two
 * things a URL cannot: it enforces the size cap BEFORE anything is read (a
 * stat, not a read), and it answers for a revision the working tree no
 * longer has — the HEAD side of a modified image, which only git can
 * produce and which therefore does arrive as a data URL.
 */

/** Lowercase extension (with dot) → IANA media type gmux can display. */
export const IMAGE_MEDIA_TYPES: Readonly<Record<string, string>> = {
  '.apng': 'image/apng',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

/**
 * Every extension the viewer and the asset protocol accept.
 *
 * TIFF is deliberately absent: Chromium has no TIFF decoder, so listing it
 * would trade "gmux edits text files only" for a broken image icon — a
 * worse answer, because it looks like a bug rather than a boundary.
 */
export const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set(
  Object.keys(IMAGE_MEDIA_TYPES)
);

/**
 * Lowercase extension of a path, with its dot; '' when there is none.
 *
 * `dot <= 0` is doing real work: it rejects both "no extension at all" and a
 * DOTFILE like `.png`, which is a file NAMED .png and not a PNG. Exported
 * because the drop router asks the same question of the same paths (see
 * `looksLikeImagePath`) and two hand-rolled copies of this rule is exactly
 * one too many.
 */
export function extensionOf(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? '' : name.slice(dot);
}

/** True when this path names an image gmux can display. */
export function isImagePath(path: string): boolean {
  return IMAGE_EXTENSIONS.has(extensionOf(path));
}

/**
 * True for SVG — the one image that is also text. It previews like an image
 * and edits like a file, so both surfaces have to recognize it.
 */
export function isSvgPath(path: string): boolean {
  return extensionOf(path) === '.svg';
}

/** Media type for a path, or null when gmux cannot display it. */
export function imageMediaType(path: string): string | null {
  return IMAGE_MEDIA_TYPES[extensionOf(path)] ?? null;
}

/**
 * Refuse to display anything larger than this.
 *
 * It is a PRE-DECODE guard, not a memory budget: the working copy never
 * enters renderer memory as base64 (it streams from `gmux-asset:`), so what
 * this actually bounds is Chromium's decode — a decoded bitmap costs
 * width × height × 4 bytes regardless of how well the file compressed, and
 * file size is the only cheap proxy for that available before decoding. 32 MB
 * clears every design asset, screenshot and long animated GIF a repository
 * realistically holds, while still catching the mis-click on a multi-hundred-
 * megapixel scan that would otherwise stall the renderer. The HEAD side —
 * the one path that really does base64 — is bounded by the same number.
 */
export const IMAGE_CAP_BYTES = 32 * 1024 * 1024;

/**
 * Largest single file gmux will copy into the drop store — the cap on a
 * dropped or pasted image that has no file of its own, checked on BOTH sides:
 * the renderer refuses before it reads the bytes, main refuses before it
 * writes them (src/main/drop/store.ts, src/renderer/terminal/drop/acquire.ts).
 * Both sides used to declare it, and a cap enforced twice at two different
 * numbers is a renderer that ships 25 MB main then rejects — or worse, a
 * renderer that accepts what main will not store (research 25 §3, Tier 3).
 *
 * Deliberately SMALLER than IMAGE_CAP_BYTES: that one bounds a decode of a
 * file the user already has, this one bounds a copy gmux is about to own the
 * lifetime of, in userData, for as long as a conversation can be resumed.
 */
export const MAX_DROP_BYTES = 25 * 1024 * 1024;

/** Which revision of an image to read. */
export type ImageRev = 'worktree' | 'HEAD';

export interface ImageReadInput {
  /** Absolute path of the image in the working tree. */
  path: string;
  /**
   * Read the blob as of HEAD instead of the working tree — the BEFORE side
   * of a modified image. Defaults to 'worktree'.
   */
  rev?: ImageRev;
  /** Absolute repo root. Required when `rev` is 'HEAD'. */
  repoPath?: string;
  /** Repo-relative path of the blob. Required when `rev` is 'HEAD'. */
  relPath?: string;
}

/** One image, ready to render — or the honest reason it is not. */
export type ImageReadResult =
  | ImageReadOk
  | ImageReadTooLarge
  | ImageReadMissing;

export interface ImageReadOk {
  status: 'ok';
  /** Absolute path that was read. */
  path: string;
  /** IANA media type from the extension. */
  mediaType: string;
  /** Byte length of the file (worktree) or blob (HEAD). */
  bytes: number;
  /**
   * `gmux-asset://` URL for the working copy — streamed, cached, decoded by
   * Chromium. Null for a HEAD read, which has no file on disk.
   */
  url: string | null;
  /**
   * `data:<mediaType>;base64,…` for a HEAD read. Null for the working copy,
   * whose bytes deliberately never cross IPC.
   */
  dataUrl: string | null;
}

/** Over the cap. Dimensions are unknown — knowing them means decoding it. */
export interface ImageReadTooLarge {
  status: 'too-large';
  path: string;
  mediaType: string;
  bytes: number;
  capBytes: number;
}

/**
 * No such blob at that revision. Not an error: it is what an ADDED image
 * looks like from HEAD, and the comparison renders it as "new".
 */
export interface ImageReadMissing {
  status: 'missing';
  path: string;
}
