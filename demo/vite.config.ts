import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The browser demo build (tortie.sh hero). Runs the REAL renderer — the same
 * src/renderer the Electron window loads — against demo/bridge, a fixture
 * implementation of `InstalledGmuxApi` installed on `window.gmux` before
 * main.tsx evaluates. No Electron, no preload, no main process.
 *
 * The renderer settings mirror electron.vite.config.ts where the renderer
 * cares: the @shared/@renderer aliases and the single-chunk worker output
 * (@pierre/diffs' highlight worker carries a dynamic import that an IIFE
 * worker chunk cannot hold).
 */
export default defineConfig(({ command }) => {
  // The operator's shell exports NODE_ENV=development, and Vite honours an
  // existing NODE_ENV even for `vite build` — which shipped DEV React
  // (StrictMode double-running the boot, jsxDEV/production runtime
  // mismatches, a fatter bundle). A demo build is a production build, always.
  if (command === 'build') process.env.NODE_ENV = 'production';
  return {
  root: __dirname,
  base: './',
  plugins: [react()],
  worker: {
    rollupOptions: { output: { inlineDynamicImports: true } }
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../src/shared'),
      '@renderer': resolve(__dirname, '../src/renderer')
    }
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 6000,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        settings: resolve(__dirname, 'settings.html')
      }
    }
  },
  server: {
    fs: { allow: [resolve(__dirname, '..')] }
  }
  };
});
