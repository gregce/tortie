/**
 * Resolving a markdown image reference to something the renderer may load.
 *
 * The renderer half of the `gmux-asset:` contract; main owns the handler
 * (src/main/assets/protocol.ts) and the URL shape is mirrored here rather
 * than imported, because renderer code cannot reach into main.
 */

import { dirOf } from '../paths';

const ASSET_SCHEME = 'gmux-asset';
const ASSET_HOST = 'local';

/** What a resolved `src` turned out to be. */
export type ResolvedAsset =
  | { kind: 'local'; url: string }
  /** data: URI — allowed by CSP, passed through untouched. */
  | { kind: 'inline'; url: string }
  /** http(s) — blocked on purpose (a badge is a tracking pixel's twin). */
  | { kind: 'remote'; url: string }
  /** Anything else (mailto:, file:, javascript:…): render nothing. */
  | { kind: 'unsupported' };

/** Collapse `.`/`..` segments; the path is already absolute. */
function normalizeAbsolute(path: string): string {
  const out: string[] = [];
  for (const seg of path.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      out.pop();
      continue;
    }
    out.push(seg);
  }
  return '/' + out.join('/');
}

function assetUrl(absPath: string): string {
  const encoded = absPath
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return `${ASSET_SCHEME}://${ASSET_HOST}${encoded}`;
}

/**
 * Resolve one `src`/`href` from a markdown document.
 *
 * @param src      the raw attribute value
 * @param filePath absolute path of the markdown file (relative refs hang off
 *                 its directory, exactly like every markdown renderer)
 * @param rootPath absolute project root — a leading `/` in a README means the
 *                 repository root, not the filesystem root
 */
export function resolveAssetSrc(
  src: string,
  filePath: string,
  rootPath: string
): ResolvedAsset {
  const value = src.trim();
  if (value === '') return { kind: 'unsupported' };
  if (value.startsWith('data:')) return { kind: 'inline', url: value };
  if (/^https?:\/\//i.test(value)) return { kind: 'remote', url: value };
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return { kind: 'unsupported' };

  // Strip a query/hash a static file server would have eaten.
  const clean = value.split(/[?#]/)[0] ?? '';
  if (clean === '') return { kind: 'unsupported' };

  const abs = clean.startsWith('/')
    ? normalizeAbsolute(`${rootPath}/${clean}`)
    : normalizeAbsolute(`${dirOf(filePath)}/${clean}`);
  return { kind: 'local', url: assetUrl(abs) };
}

/**
 * Absolute filesystem path a document-relative LINK points at (used to open
 * a sibling `.md` in the editor instead of navigating). Returns null for
 * anything that is not a document-relative path.
 */
export function resolveLinkPath(
  href: string,
  filePath: string,
  rootPath: string
): string | null {
  const value = href.trim();
  if (value === '' || value.startsWith('#')) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  const clean = value.split(/[?#]/)[0] ?? '';
  if (clean === '') return null;
  return clean.startsWith('/')
    ? normalizeAbsolute(`${rootPath}/${clean}`)
    : normalizeAbsolute(`${dirOf(filePath)}/${clean}`);
}
