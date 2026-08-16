/**
 * GMUX_SMOKE=shim (Phase 51) — the shim install and removal proof.
 *
 * Runs entirely against a fresh mkdtemp directory, injected through the
 * shim module's deps parameter, so it can never touch a real PATH
 * directory or the operator's installed shim. Sequence: compose, install,
 * byte-compare content, check mode 0755, remove, check gone, then write a
 * foreign file and prove remove refuses it.
 *
 * Prints `SMOKE SHIM PASS` or the failing step, and exits accordingly.
 */

import { app } from 'electron';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ShimDeps } from '../shell/shim';
import {
  composeShimContent,
  installShim,
  removeShim,
  SHIM_NAME,
  shimStatus
} from '../shell/shim';
import { TORTIE_BUNDLE_ID } from '../updates/shipit-state';
import { armWatchdog, smokeFail, smokeLog } from './support';

export async function runSmokeShim(): Promise<void> {
  armWatchdog(30_000);
  try {
    // The whole run lives under one throwaway directory. It is both the
    // only candidate and the only PATH entry, so no real directory can
    // qualify even by accident.
    const dir = await mkdtemp(join(tmpdir(), 'gmux-shim-smoke-'));
    const deps: ShimDeps = {
      candidates: [dir],
      userPath: () => Promise.resolve(dir),
      bundleId: TORTIE_BUNDLE_ID
    };
    const target = join(dir, SHIM_NAME);
    smokeLog(`1/7 temp install dir ${dir}`);

    const before = await shimStatus(deps);
    if (before.state !== 'not-installed' || before.target !== target) {
      throw new Error(
        `expected not-installed at ${target}, got ${before.state} at ${String(before.target)}`
      );
    }
    smokeLog('2/7 status before install: not-installed, target computed');

    const installed = await installShim(deps);
    if (installed.state !== 'installed') {
      throw new Error(`install reported ${installed.state}`);
    }
    const written = await readFile(target, 'utf8');
    const expected = composeShimContent(TORTIE_BUNDLE_ID);
    if (written !== expected) {
      throw new Error('the written shim does not byte-compare to the composed content');
    }
    smokeLog('3/7 installed; content byte-compares equal');

    const mode = (await stat(target)).mode & 0o777;
    if (mode !== 0o755) {
      throw new Error(`mode is 0${mode.toString(8)}, expected 0755`);
    }
    smokeLog('4/7 mode is 0755');

    const removed = await removeShim(deps);
    if (removed.state !== 'not-installed') {
      throw new Error(`remove reported ${removed.state}`);
    }
    const gone = await stat(target).then(
      () => false,
      () => true
    );
    if (!gone) throw new Error('the shim file is still present after remove');
    smokeLog('5/7 removed; file is gone');

    await writeFile(target, '#!/bin/sh\necho not ours\n', {
      encoding: 'utf8',
      mode: 0o755
    });
    const foreign = await shimStatus(deps);
    if (foreign.state !== 'foreign') {
      throw new Error(`a marker-less file reported ${foreign.state}, expected foreign`);
    }
    smokeLog('6/7 a marker-less file at the target reports foreign');

    let refused = false;
    try {
      await removeShim(deps);
    } catch {
      refused = true;
    }
    const survived = await stat(target).then(
      () => true,
      () => false
    );
    if (!refused || !survived) {
      throw new Error('remove did not refuse the foreign file');
    }
    smokeLog('7/7 remove refused the foreign file and left it alone');

    smokeLog('SMOKE SHIM PASS');
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}
