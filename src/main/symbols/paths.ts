/**
 * Where the ten grammars and the tree-sitter runtime actually live at runtime
 * — the ONE place that answers it, for the same reason `resolve.ts` is the one
 * place that answers it for the ripgrep binary.
 *
 * THE PACKAGED-APP TRAP THIS MODULE EXISTS FOR (research 19 §2.8, §7.2):
 * `electron-builder.yml` unpacks `**\/*.node` and nothing else. A `.wasm` is
 * not a `.node`, so a build that resolves grammars out of `node_modules`
 * works perfectly in `out/` and dies in the `.app` — the exact failure the
 * phase's go/no-go check is aimed at. Packaged, the grammars are copied to
 * `<resources>/tree-sitter/` by `extraResources` and read from there.
 *
 * TWO SOURCE DIRECTORIES SINCE PHASE 180, ONE PACKAGED DESTINATION. Seven
 * grammars ship inside `@vscode/tree-sitter-wasm` and resolve out of
 * node_modules in development; the Swift, Kotlin and Objective-C wasm are
 * vendored whole in the repo's `resources/tree-sitter/` (pinned by sha256 in
 * GRAMMAR-PINS.json there) because no package the bundle carries ships them.
 * `electron-builder.yml` copies BOTH sets into `<resources>/tree-sitter/`, so
 * a packaged app has one directory and this module is the only thing that
 * remembers there were ever two.
 *
 * `missingGrammars()` turns that into a diagnosis instead of a crash: the
 * palette can say which files are missing rather than reporting "no symbols".
 */

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { GrammarId } from './languages';
import { GRAMMARS } from './languages';

/**
 * The grammars vendored in `resources/tree-sitter/` rather than shipped by
 * `@vscode/tree-sitter-wasm`. Phase 180's deliberate act; the pin lives beside
 * the files. The set lives HERE and not in languages.ts because it is a fact
 * about where bytes sit on disk, and languages.ts holds no paths.
 */
const VENDORED_GRAMMARS: ReadonlySet<GrammarId> = new Set<GrammarId>([
  'swift',
  'kotlin',
  'objc'
]);

const require_ = createRequire(import.meta.url);

/**
 * True only inside a packaged .app. electron is required lazily so this
 * module — and the extractor behind it — stay loadable in a plain-node test.
 */
function packaged(): boolean {
  try {
    const { app } = require_('electron') as typeof import('electron');
    return app?.isPackaged === true;
  } catch {
    return false;
  }
}

/** `<resources>/tree-sitter` when packaged, else the node_modules wasm dir. */
export function grammarDir(): string {
  if (packaged()) return join(process.resourcesPath, 'tree-sitter');
  // require.resolve honours the package's "main": wasm/tree-sitter.js.
  return dirname(require_.resolve('@vscode/tree-sitter-wasm'));
}

/**
 * The repo's `resources/tree-sitter` in development — the vendored grammars'
 * home. Electron answers with `app.getAppPath()`, which is the repo root in
 * dev, the same way resolveConfPath finds gmux-tmux.conf. A plain node test
 * has no electron, so it walks up from this module's own directory, which
 * works from `src/` under vitest and from `out/` however the bundle nests.
 */
function vendoredGrammarDir(): string {
  try {
    const { app } = require_('electron') as typeof import('electron');
    if (app !== undefined) return join(app.getAppPath(), 'resources', 'tree-sitter');
  } catch {
    // Plain node: fall through to the walk.
  }
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i += 1) {
    const candidate = join(dir, 'resources', 'tree-sitter');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return join(process.cwd(), 'resources', 'tree-sitter');
}

/** Absolute path of one grammar's `.wasm`. */
export function grammarPath(id: GrammarId): string {
  if (!packaged() && VENDORED_GRAMMARS.has(id)) {
    return join(vendoredGrammarDir(), `tree-sitter-${id}.wasm`);
  }
  return join(grammarDir(), `tree-sitter-${id}.wasm`);
}

/**
 * Every grammar's absolute wasm path, keyed by id — what the worker pool
 * boots with. The worker used to join one directory itself; since Phase 180
 * there are two source directories in development, and handing the worker the
 * finished map keeps this module the only place that knows that.
 */
export function grammarPaths(): Record<GrammarId, string> {
  const out = {} as Record<GrammarId, string>;
  for (const id of GRAMMARS) out[id] = grammarPath(id);
  return out;
}

/**
 * The `web-tree-sitter` RUNTIME wasm — a different file from the grammars, and
 * a documented foot-gun: `@vscode/tree-sitter-wasm` bundles its own OLDER
 * `tree-sitter.wasm` runtime beside the grammars, and letting emscripten pick
 * that one up yields `ENOENT: web-tree-sitter.wasm` (research 19 §7.3). Always
 * point `locateFile` at web-tree-sitter's own.
 */
export function runtimeWasmPath(): string {
  if (packaged()) {
    return join(process.resourcesPath, 'tree-sitter', 'web-tree-sitter.wasm');
  }
  return require_.resolve('web-tree-sitter/web-tree-sitter.wasm');
}

/** Grammar ids whose `.wasm` is not on disk. Empty is the healthy answer. */
export function missingGrammars(): GrammarId[] {
  return GRAMMARS.filter((id) => !existsSync(grammarPath(id)));
}

/** Human-readable reason the index cannot build, or null when it can. */
export function assetProblem(): string | null {
  if (!existsSync(runtimeWasmPath())) {
    return 'The code-parsing runtime is missing from this build.';
  }
  const missing = missingGrammars();
  if (missing.length === GRAMMARS.length) {
    return 'The language grammars are missing from this build.';
  }
  if (missing.length > 0) {
    return `Some language grammars are missing from this build (${missing.join(', ')}).`;
  }
  return null;
}
