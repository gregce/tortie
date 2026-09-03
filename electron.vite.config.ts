import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * Phase 17: stamp the building commit into the main bundle so the About panel
 * can say which build is installed (src/main/build-info.ts). `-dirty` when the
 * tree has uncommitted changes — a build from an edited tree is not the commit
 * it names. Never fails a build: no git, no repo, no problem, just 'dev'.
 *
 * THE ONE SUBTLETY, measured rather than assumed: electron-vite loads this
 * file by bundling it to `electron.vite.config.<timestamp>.mjs` **in the repo
 * root** and importing that, so a plain `git status --porcelain` run from in
 * here reports its own loader's scratch file and every build comes out
 * `-dirty`. Caught by polling `git status` during a build on a verifiably
 * clean tree:
 *
 *     CAUGHT: ?? electron.vite.config.1786512084859.mjs
 *
 * So that one filename is filtered out. It is also in .gitignore, which alone
 * would fix the symptom — the filter stays because the correctness of the
 * stamp should not depend on a line in a different file. Untracked files are
 * otherwise still counted: an uncommitted source file that got compiled in is
 * exactly the case this stamp exists to catch, so `-uno` would be the wrong
 * shortcut.
 */
const VITE_CONFIG_SCRATCH = /electron\.vite\.config\.\d+\.mjs$/;

function buildCommit(): string {
  const git = (...args: string[]): string =>
    execFileSync('git', args, {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  try {
    const sha = git('rev-parse', '--short', 'HEAD');
    if (!sha) return 'dev';
    const dirty = git('status', '--porcelain')
      .split('\n')
      .some((line) => line.trim() !== '' && !VITE_CONFIG_SCRATCH.test(line));
    return dirty ? `${sha}-dirty` : sha;
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  main: {
    // Keep native/node deps (node-pty, better-sqlite3, @parcel/watcher…)
    // as runtime requires — never bundle .node addons. culori is the one
    // exception (Phase 207): it is ESM only, main is emitted as CommonJS,
    // and src/shared/chrome-hue.ts needs it in main to paint the window's
    // fill before any renderer exists, so it is bundled rather than required.
    plugins: [externalizeDepsPlugin({ exclude: ['culori'] })],
    define: {
      __TORTIE_BUILD_COMMIT__: JSON.stringify(buildCommit())
    },
    resolve: {
      alias: { '@shared': resolve(__dirname, 'src/shared') }
    },
    build: {
      rollupOptions: {
        input: {
          // THE TWO MAIN-PROCESS WORKERS, and the one thing to know about
          // loading them (measured at Phase 14 integration, Electron 43.3.0 /
          // darwin-arm64, against the real packaged archive):
          //
          //   `new Worker('<…>/app.asar/out/main/<name>-worker.js')` WORKS.
          //
          // These entries emit CJS, so Node's worker bootstrap resolves them
          // through the module loader that Electron's asar shim patches. Both
          // sites therefore load the plain way and neither needs a bootstrap
          // shim. Verified from Contents/Resources/app.asar, not from out/:
          // the symbols worker booted the wasm runtime and parsed a real file,
          // and the quick-open worker enumerated 556 paths through the
          // unpacked ripgrep and ranked them. If a future Electron breaks
          // this, fix it in BOTH places — do not let one grow a workaround.
          index: resolve(__dirname, 'src/main/index.ts'),
          // Phase 14: quick open's resident worker_threads Worker. A worker
          // needs its own file on disk, so it needs its own entry — the main
          // bundle cannot start a thread that is inside itself. Emitted as
          // out/main/quickopen-worker.js, loaded by src/main/quickopen/ipc.ts.
          'quickopen-worker': resolve(
            __dirname,
            'src/main/quickopen/worker.ts'
          ),
          // Phase 14: the symbol indexer's worker — the other half of the
          // worker budget (research 19 §O5: one resident for quick open, at
          // most six TRANSIENT for symbols, and no third resident pool
          // without deleting one of these). Emitted as
          // out/main/symbols-worker.js, loaded by src/main/symbols/pool.ts.
          'symbols-worker': resolve(__dirname, 'src/main/symbols/worker.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: { '@shared': resolve(__dirname, 'src/shared') }
    }
  },
  renderer: {
    plugins: [react()],
    // Comments and whitespace do not ship. electron-vite defaults `minify` to
    // off, and esbuild 0.25 keeps a line comment that sits inside an object
    // literal, so every long comment in src/renderer/state rode into the eager
    // chunk and counted against the startup budget: measured at 901 comment
    // lines and 512 bytes of headroom on 2026-09-03. Identifiers and syntax are
    // left alone on purpose, so nothing that reads a name or a shape changes.
    esbuild: { minifyIdentifiers: false, minifySyntax: false, minifyWhitespace: true, legalComments: 'none' },
    // Inline workers (the only kind that can start from a file:// renderer —
    // see src/renderer/editor/monaco-impl.ts) are emitted as one IIFE chunk,
    // so a worker containing a dynamic import fails the build. @pierre/diffs'
    // highlight worker has one (shiki's optional wasm engine, which we do not
    // use); folding it in keeps every worker single-chunk. Monaco's workers
    // have no dynamic imports and are unaffected.
    worker: {
      rollupOptions: { output: { inlineDynamicImports: true } }
    },
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
        '@renderer': resolve(__dirname, 'src/renderer')
      }
    },
    build: {
      minify: 'esbuild',
      // JS only. The stylesheet keeps its comments, because assert-css-order
      // reads a marker out of the shipped CSS to prove surface.css lands first.
      cssMinify: false,
      // monaco-editor is heavy; raise the warning ceiling rather than split
      // hairs in the scaffold. Editor stream owns real chunking later.
      chunkSizeWarningLimit: 6000,
      rollupOptions: {
        input: {
          // Main window (the app shell).
          index: resolve(__dirname, 'src/renderer/index.html'),
          // Settings window (S13) — second BrowserWindow, own entry.
          settings: resolve(__dirname, 'src/renderer/settings/index.html')
        }
      }
    }
  }
});
