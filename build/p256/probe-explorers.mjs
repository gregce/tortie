#!/usr/bin/env node
// Phase 256 research probe (question 2). One scratch Electron, ended in a
// finally by build/electron-run.mjs. Reads three as-built explorers off the DOM.
// It launches no agent, spends no token, opens no keychain and makes no request.
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron } from '../electron-run.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const files = process.argv.slice(2).map((p) => resolve(p));
if (files.length === 0) {
  console.error('usage: probe-explorers.mjs <a.html> [b.html ...]');
  process.exit(2);
}

const profile = mkdtempSync(join(tmpdir(), 'p256-explorer-'));
const home = mkdtempSync(join(tmpdir(), 'p256-home-'));
try {
  const out = await withElectron(
    {
      label: 'p256-explorers',
      userDataDir: profile,
      entry: false,
      persistence: false,
      echo: true,
      args: [join(here, 'explorer-app')],
      env: { HOME: home, GMUX_HARNESS_DIR: home, P256_FILES: files.join(',') },
      // PHASE 261. It was `gmux-p256-${process.pid}`, a scratch socket named
      // for the teardown with NOTHING in this child's environment pointing the
      // app at it. This launch opens its own explorer page rather than Tortie
      // main (`entry: false`), so it started no tmux at all and the teardown
      // ended a server nobody had created; had it been Tortie, the app would
      // have used -L gmux while the teardown tidied an empty scratch server.
      // withElectron refuses that pair now, and null is the honest answer.
      tmuxSocket: null,
      ceilingMs: 120000
    },
    async (handle) => {
      await handle.waitForLine(/P256_JSON_END/, 90000);
      return handle.text();
    }
  );
  const body = out.split('P256_JSON_BEGIN')[1].split('P256_JSON_END')[0].trim();
  const target = join(here, 'out-explorers.json');
  writeFileSync(target, JSON.stringify(JSON.parse(body), null, 1));
  console.log(`[p256] wrote ${target}`);
} finally {
  rmSync(profile, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
}
