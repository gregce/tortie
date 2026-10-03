#!/usr/bin/env node
/**
 * rig.mjs. `npm run probe:p320:rig` (Phase 320.1): the launcher for
 * build/p3201/typing-rig.mts, which is TypeScript and imports the shipping
 * renderer and main modules through the `@shared` alias.
 *
 * It runs the rig under the repository's PINNED tsx, resolved by
 * `tsxCli()` from build/ts-runner.mjs (never npx, `gate:checks`), with
 * `tsconfig.node.json` for the alias, and hands every argument and the whole
 * environment through. It waits for the rig and exits with its code: 0 no
 * finding against the door, 1 findings, 2 a refusal (node-pty that does not
 * load under this node is one, with a sentence).
 *
 * THE RIG STARTS NO ELECTRON. It starts scratch tmux servers, relays and ptys
 * of its own and ends each by its pid in a `finally`; its header says how.
 * This file starts one child, the rig, and waits for it: `spawnSync` returns
 * only when that child has ended.
 *
 * Usage:
 *   npm run probe:p320:rig                               the whole matrix
 *   P3201_RIG_D=0,25 P3201_RIG_J=0 npm run -s probe:p320:rig
 *   node build/p3201/rig.mjs --self-test                 the graders alone
 */

import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tsxCli } from '../ts-runner.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const out = spawnSync(
  process.execPath,
  [tsxCli(), '--tsconfig', join(REPO, 'tsconfig.node.json'), join(REPO, 'build', 'p3201', 'typing-rig.mts'), ...process.argv.slice(2)],
  // His ruling of 2026-10-02: never his Terminal tab's TERM_SESSION_ID, by
  // which /etc/zshrc_Apple_Terminal appends an interactive zsh's history to his
  // own file. The rig gives its scratch servers a scratch HOME and ZDOTDIR.
  { cwd: REPO, stdio: 'inherit', env: { ...process.env, TERM_SESSION_ID: undefined } }
);
if (out.error) {
  process.stderr.write(`[p3201-rig] the rig did not start: ${out.error.message}\n`);
  process.exit(2);
}
process.exit(out.status ?? (out.signal !== null ? 130 : 1));
