/**
 * `npm run probe:p182` — the live proof of the Phase 182 status line tap.
 *
 * It runs build/p182-tap-probe.mts under the repository's pinned tsx. That
 * probe writes Tortie's own generated managed script and settings file into a
 * scratch directory, binds a loopback server on an ephemeral port, launches
 * the REAL claude in a tmux pane on a scratch socket of its own stamped the
 * way `paneEnvFor` stamps one, spends ONE short turn, and reads what arrives.
 *
 * IT IS NOT IN THE COMMIT BATTERY, because it spends a real turn on the
 * person's own subscription window. Run it once per phase and after any
 * Claude Code upgrade, which is the same rule `conformance:resume` follows.
 *
 * It reads no credential, prints no usage value, touches nothing under
 * `~/.claude`, and ends its tmux server and removes its scratch directory in
 * a finally block whatever happened. It launches no Electron.
 */

import { spawnSync } from 'node:child_process';
import { tsxCli } from './ts-runner.mjs';

const res = spawnSync(
  process.execPath,
  [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/p182-tap-probe.mts'],
  { stdio: 'inherit' }
);
process.exit(res.status ?? 1);
