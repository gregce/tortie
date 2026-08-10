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
