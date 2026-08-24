import { resolve } from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';

/**
 * Phase 145 stage 5: the suite runs in lanes, so a check can state its
 * environment requirement instead of assuming the host.
 *
 *   npm test           both lanes, the full suite, what every battery runs
 *   npm run test:hermetic   only checks that control every effect they use:
 *                      no native file event stream is subscribed and no live
 *                      process table is read. Proved on 2026-08-24 by running
 *                      the whole lane over a watcher binding whose every call
 *                      throws: 9,333 tests passed unchanged.
 *   npm run test:native     only the *.native.test.ts files, the live
 *                      integration lane for the native adapters (FSEvents
 *                      delivery, the live ps table).
 *
 * The lane is picked here rather than by CLI globs so the file naming rule
 * `*.native.test.ts` has exactly one reader.
 */
const lane = process.env.VITEST_LANE ?? 'all';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      // Unit tests never require the electron binary. See the stub's header.
      electron: resolve(__dirname, 'src/test/electron-stub.cjs')
    }
  },
  test: {
    // Phase 58 added the .tsx form. The update ring's renderer test is a
    // component test, and without this second glob vitest would skip the
    // file in silence.
    include:
      lane === 'native'
        ? ['src/**/__tests__/**/*.native.test.ts']
        : [
            'src/**/__tests__/**/*.test.ts',
            'src/**/__tests__/**/*.test.tsx'
          ],
    exclude:
      lane === 'hermetic'
        ? [...configDefaults.exclude, 'src/**/__tests__/**/*.native.test.ts']
        : [...configDefaults.exclude],
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
