/**
 * The paint observer's target discovery, proved without a window (Phase 171).
 *
 * Check type: fixture proof of a build helper, hermetic lane. It spawns one
 * node process on build/cdp-target.mjs, which starts nothing, opens no socket
 * and reads no file; it is handed the shapes `/json/list` returns and picks
 * the main window, or says why it could not. The Phase 165 paint probe runs
 * the same proof before it spends an Electron, so a pick that drifts fails in
 * one millisecond with a reason and never as a paint budget with no number in
 * it. This file is what makes `npm test` run that proof too.
 */

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = resolve(__dirname, '..', '..', '..', '..', 'build', 'cdp-target.mjs');

describe('build/cdp-target.mjs', () => {
  it('passes every target discovery fixture', () => {
    const r = spawnSync(process.execPath, [SCRIPT, '--self-test'], { encoding: 'utf8' });
    expect(r.stderr).toBe('');
    expect(r.stdout).toMatch(/\[cdp-target\] PASS: (\d+) of \1 target discovery fixtures/);
    expect(r.status).toBe(0);
  });
});
