#!/usr/bin/env node
// Phase 363 measurement 1: the transport alone, in an isolated real Electron,
// before any product wiring. Run via npm run probe:p363 (harness-socket wrapper).
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron } from '../electron-run.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export async function measureIsolated(harnessDir, socket) {
  const userData = join(harnessDir, 'p363-iso-profile');
  mkdirSync(userData, { recursive: true });
  try {
    return await withElectron({
      label: 'p363-iso', userDataDir: userData, tmuxSocket: socket, cwd: ROOT, entry: false, persistence: false,
      args: [join(ROOT, 'build/p363/driver.cjs'), '--use-mock-keychain'],
      env: { P363_MODE: 'isolated', P363_ROOT: ROOT, P363_USER_DATA: userData, GMUX_TMUX_SOCKET: socket },
      graceMs: 5000
    }, async (h) => {
      const line = await h.waitForLine(/\[p363-iso(-error)?\] /, 60000);
      const m = /\[p363-iso(?:-error)?\] (.*)/.exec(line);
      return m ? m[1] : line;
    });
  } finally {
    rmSync(userData, { recursive: true, force: true });
  }
}
