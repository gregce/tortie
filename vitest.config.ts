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
  // Phase 364 (build/p364/SPEC.md §6, D1): the suite runs the NORMAL build's
  // flag, as electron.vite.config.ts defines it without TORTIE_DIAGNOSTIC=1.
  // Vitest hands a define to the module as a global rather than rewriting the
  // text, so a test that drives the diagnostic build stubs it with
  // vi.stubGlobal('__TORTIE_DIAGNOSTIC__', true). conformance:diagnostic D1.d
  // holds this line.
  define: {
    __TORTIE_DIAGNOSTIC__: 'false'
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
    // A test budget wide enough to survive a loaded runner.
    //
    // Vitest's own default is 5,000 ms, and that number is what has cost
    // this repository two whole runs. Neither test was slow: the release
    // build for 0.105.0 lost `harvest-claim-race` at 5,014 ms, and Phase
    // 80.1 lost `src/main/symbols/__tests__/store.test.ts` at 5,011 ms.
    // Both sit far below the budget on a quiet machine — the slowest test
    // body in the suite measures well under it — and both overran by a few
    // milliseconds only because a CI runner starved a worker at the wrong
    // moment.
    //
    // Raising this rather than the two tests is deliberate. The two are in
    // unrelated domains, so the pair is evidence about the RUNNER and not
    // about either test, and there is no way to predict which test a loaded
    // runner starves next. A per-test budget would have to be guessed onto
    // all 14,189 of them.
    //
    // The cost is bounded and it is the only cost: a test that genuinely
    // hangs now fails in 15 s instead of 5 s. Nothing that passes today
    // behaves differently, because a timeout is a ceiling and never a wait.
    // A file needing more still says so itself — `vi.setConfig` and the
    // third argument to `it` both still win, in either direction.
    testTimeout: 15_000,
    hookTimeout: 15_000,
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
