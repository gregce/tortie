/**
 * THE ripgrep binary path — the single place it is computed (standing
 * guardrail 3: no duplicated resolution logic). Three consumers want rg in
 * Phase 14 — content search (⌘⇧F), quick open's `rg --files`, and the symbol
 * indexer's file list — and every one of them calls this.
 *
 * Two facts from docs/research/19-search.md §2.8 shape the implementation:
 *
 *  1. **The packaged rewrite is not optional.** `@vscode/ripgrep` resolves the
 *     Mach-O to a path inside `app.asar`. Electron's asar shim WILL spawn it —
 *     by copying all 4,528,512 bytes to /tmp first, unsigned. That temp copy
 *     fails library validation the moment gmux moves to Developer ID +
 *     hardened runtime, so electron-builder.yml unpacks the binary and this
 *     module points at the unpacked copy.
 *  2. **The wrapper is ESM-only** (`"type": "module"`, one exported const).
 *     gmux's main bundle is CJS. `require(esm)` works in Electron 43 / Node 24
 *     — verified by the research and again by this phase's build — but the
 *     wrapper is three lines of path resolution, so if it ever regresses we
 *     fall through to resolving the platform package ourselves rather than
 *     failing the whole feature.
 *
 * Everything here is lazy and cached: nothing touches the filesystem until the
 * first search, and a missing binary surfaces as a friendly SPAWN_FAILED
 * rather than a spawn ENOENT deep inside the stream.
 */

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, sep } from 'node:path';
import { gmuxError } from '../tmux/errors';

/** `rg` inside an asar lives unpacked next to it — see the header. */
function unpacked(path: string): string {
  return path.includes(`app.asar${sep}`)
    ? path.replace(`app.asar${sep}`, `app.asar.unpacked${sep}`)
    : path;
}

const BINARY = process.platform === 'win32' ? 'rg.exe' : 'rg';
const PLATFORM_PKG = `@vscode/ripgrep-${process.platform}-${process.arch}`;

/** The wrapper's own answer, or null when it cannot be loaded/resolved. */
function fromWrapper(): string | null {
  try {
    const req = createRequire(import.meta.url);
    const mod = req('@vscode/ripgrep') as { rgPath?: unknown };
    return typeof mod.rgPath === 'string' ? mod.rgPath : null;
  } catch {
    return null;
  }
}

/** The platform package's binary, resolved without the ESM wrapper. */
function fromPlatformPackage(): string | null {
  try {
    const req = createRequire(import.meta.url);
    return req.resolve(`${PLATFORM_PKG}/bin/${BINARY}`);
  } catch {
    return null;
  }
}

/** node_modules relative to the app root (packaged) or the cwd (dev/tests). */
function fromAppRoot(): string[] {
  const roots: string[] = [];
  try {
    // Lazy: keeps this module loadable in plain-node unit tests.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = createRequire(import.meta.url)(
      'electron'
    ) as typeof import('electron');
    if (typeof app?.getAppPath === 'function') roots.push(app.getAppPath());
  } catch {
    /* not running under Electron */
  }
  roots.push(process.cwd());
  return roots.map((root) =>
    join(root, 'node_modules', PLATFORM_PKG, 'bin', BINARY)
  );
}

let cached: string | null = null;

/**
 * Absolute path to the vendored ripgrep (15.0.0, +pcre2). Throws a structured
 * SPAWN_FAILED if the build shipped without it — which is a packaging bug, not
 * a user error, so the detail names the package.
 */
export function rgBinaryPath(): string {
  if (cached !== null) return cached;

  const candidates = [fromWrapper(), fromPlatformPackage(), ...fromAppRoot()];
  for (const candidate of candidates) {
    if (candidate === null) continue;
    const path = unpacked(candidate);
    if (existsSync(path)) {
      cached = path;
      return path;
    }
  }

  throw gmuxError(
    'SPAWN_FAILED',
    'Search is unavailable: this build is missing its search engine.',
    `${PLATFORM_PKG} was not found (checked ${candidates
      .filter((c): c is string => c !== null)
      .map(unpacked)
      .join(', ')})`
  );
}

/** Test seam: forget the cached path (also used by the packaged-app smoke). */
export function resetRgBinaryPathCache(): void {
  cached = null;
}
