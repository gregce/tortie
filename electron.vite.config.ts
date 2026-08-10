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
