import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      // Unit tests never require the electron binary. See the stub's header.
      electron: resolve(__dirname, 'src/test/electron-stub.cjs')
    }
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'node',
    env: {
      // The alias above only covers OUR imports, because Vite rewrites the
      // modules it transforms. A dependency that requires electron itself is
      // externalised and resolves through plain Node, so it reaches the real
      // package. Exactly one does: electron-log/main, at its line 3, pulled
      // in by src/main/log/index.ts.
      //
      // That matters because electron 43 ships no install script. Its
      // index.js downloads the 100 MB binary LAZILY, inside whichever
      // process requires it first, with no retry. In `npm test` that is a
      // vitest worker, and one failed download killed release run
      // 31907886517 with 3787 of 3788 tests passing.
      //
      // This variable is electron's own escape hatch. getElectronPath()
      // returns early when it is set, with no existence check and no
      // download, so every importer gets a path string and nothing reaches
      // the network. Measured: with the variable pointed at a directory that
      // does not exist, require('electron') still returns cleanly.
      ELECTRON_OVERRIDE_DIST_PATH: resolve(__dirname, 'node_modules/electron/dist')
    }
  }
});
