/**
 * `gmux-asset:` — the read-only image channel for rendered markdown.
 *
 * A README's `![shot](docs/shot.png)` has to resolve to real bytes. The three
 * alternatives all fail: `file:` is blocked by the renderer's CSP (and in dev
 * the renderer is served over http, so `'self'` never covers it), `fs:readFile`
 * is UTF-8-text-and-capped and refuses binary, and base64 data URIs would hold
 * every screenshot in a README twice in renderer memory.
 *
 * A privileged scheme costs one registration and streams from disk through
 * Chromium's own cache instead:
 *
 *   gmux-asset://local/Users/me/repo/docs/shot.png
 *   └ scheme ──┘ └host┘ └── absolute POSIX path, percent-encoded ──┘
 *
 * Trust boundary: identical to `fs:readFile`, which already serves any absolute
 * path the renderer names — this adds no reach, and narrows it by method (GET
 * only) and by an image/font extension allowlist, so a mis-authored markdown
 * link cannot turn the scheme into a general file reader. Directory traversal
 * is moot (the renderer sends an already-absolute path and we normalize before
 * use), but symlinks are resolved so the extension check cannot be dodged by
 * pointing `x.png` at a private key.
 *
 * Remote (`https:`) images stay blocked by CSP on purpose: a badge is exactly
 * the shape of a tracking pixel and gmux opens arbitrary checked-out repos.
 */

import { net, protocol } from 'electron';
import { realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';
import { IMAGE_EXTENSIONS } from '@shared/image-types';

export const ASSET_SCHEME = 'gmux-asset';

/** Host segment; `standard: true` schemes need an authority to parse. */
const ASSET_HOST = 'local';

/**
 * What this scheme is allowed to serve. `<img>` cannot execute SVG script,
 * and the CSP has no `script-src` allowance for this scheme, so SVG is safe
 * here and common in READMEs (badges, diagrams).
 *
 * Phase 12.10 made the list shared rather than local: the image viewer now
 * serves its working copy through this same scheme, so "what gmux can
 * display" and "what this handler will stream" have to be one list — two
 * would drift into a file the editor offers to open and the protocol then
 * refuses (or worse, the reverse).
 */
const ALLOWED_EXTENSIONS = IMAGE_EXTENSIONS;

/**
 * Build the URL for an absolute POSIX path. Exported for the renderer's
 * mirror (src/renderer/editor/markdown/asset-url.ts) to stay in step —
 * main is the authority on the shape.
 */
export function assetUrlForPath(absPath: string): string {
  const encoded = absPath
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return `${ASSET_SCHEME}://${ASSET_HOST}${encoded.startsWith('/') ? '' : '/'}${encoded}`;
}

/**
 * Must run BEFORE `app.whenReady()` (Electron requirement) — registering it
 * late throws. `standard` gives the URL a parseable host/path; `secure` keeps
 * the renderer a secure context; `supportFetchAPI`/`stream` let `protocol.handle`
 * answer with a streamed Response.
 */
export function registerAssetSchemePrivileged(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: ASSET_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        bypassCSP: false,
        corsEnabled: true
      }
    }
  ]);
}

function notFound(reason: string): Response {
  return new Response(reason, {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8' }
  });
}

/** Register the handler. Call once, after the app is ready. */
export function registerAssetProtocol(): void {
  protocol.handle(ASSET_SCHEME, async (request) => {
    if (request.method !== 'GET') return notFound('method not allowed');

    let abs: string;
    try {
      abs = normalize(decodeURIComponent(new URL(request.url).pathname));
    } catch {
      return notFound('bad asset url');
    }
    if (!isAbsolute(abs)) return notFound('asset path must be absolute');
    if (!ALLOWED_EXTENSIONS.has(extname(abs).toLowerCase())) {
      return notFound('not an image');
    }

    try {
      // Resolve symlinks first, then re-check the extension: a link named
      // `logo.png` pointing at ~/.ssh/id_rsa must not pass.
      const real = await realpath(abs);
      if (!ALLOWED_EXTENSIONS.has(extname(real).toLowerCase())) {
        return notFound('not an image');
      }
      const info = await stat(real);
      if (!info.isFile()) return notFound('not a file');
      return await net.fetch(pathToFileURL(real).toString());
    } catch {
      return notFound('asset not found');
    }
  });
}
