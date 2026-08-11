import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  main: {
    // Keep native/node deps (node-pty, better-sqlite3, @parcel/watcher…)
    // as runtime requires — never bundle .node addons.
    plugins: [externalizeDepsPlugin()],
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
