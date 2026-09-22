#!/usr/bin/env node
/**
 * `npm run conformance:pocket:hostile`. The attack on the door (Phase 313), and
 * it runs in the ordinary battery.
 *
 * WHY IT IS A CHECK AND NOT A PROBE. Phase 313's entry names "the scripted
 * hostile client, in the ordinary battery" as the phase's proof, with "no
 * Swift, no Apple, no phone" — so it has to cost seconds rather than minutes
 * and it has to need nothing of the host. It does: one plain node through the
 * pinned tsx, one TLS listener on `127.0.0.1` on a port it found for itself, a
 * throwaway self-signed identity under a `mkdtemp`, and all three ended in a
 * `finally`. No Electron, no tmux, no ssh, no agent, no token, no real
 * interface, and nothing under the person's home is read.
 *
 * WHAT IT ASSERTS. Not that the door refuses, but that it refuses FOR THE RIGHT
 * REASON and lets the honest phone through. An attack whose every arm comes
 * back refused proves a door that is off, so the honest arms are in the same
 * table as the attacks and a run where the honest arms fail is a FAILED run.
 *
 *   node build/p313/hostile-client.mjs
 */

import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tsxCli } from '../ts-runner.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[conformance:pocket:hostile]';
const t0 = Date.now();

const probe = spawnSync(
  process.execPath,
  [tsxCli(), '--tsconfig', 'tsconfig.node.json', join('build', 'p313', 'hostile-client.mts')],
  {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 90_000,
    // THE LOOPBACK BIND, AND IT IS THE ONLY WAY THIS RUNS. `src/main/pocket/
    // bind.ts` reads this variable and binds `127.0.0.1` instead of asking
    // `os.networkInterfaces()` for a tailnet address. Nothing in this check may
    // touch a real interface, and the door refuses to bind one it did not find.
    env: { ...process.env, GMUX_POCKET_LOOPBACK: '1' }
  }
);

const text = `${probe.stdout ?? ''}${probe.stderr ?? ''}`;
const line = (probe.stdout ?? '').split('\n').find((l) => l.startsWith('P313_HOSTILE:'));
if (line === undefined) {
  process.stdout.write(`${TAG} FAIL: the client printed no answer (exit ${String(probe.status)}).\n`);
  for (const l of text.trim().split('\n').slice(-20)) process.stdout.write(`  ${l}\n`);
  process.exit(1);
}

const { arms, problems } = JSON.parse(line.slice('P313_HOSTILE:'.length));
for (const arm of arms) {
  process.stdout.write(
    `${arm.ok ? 'ok  ' : 'FAIL'} ${String(arm.n).padEnd(14)} ${String(arm.got).padEnd(14)} ${arm.name}\n`
  );
}
const seconds = ((Date.now() - t0) / 1000).toFixed(2);
if (problems.length > 0) {
  process.stdout.write(`\n${TAG} FAIL, ${String(problems.length)} in ${seconds} s:\n`);
  for (const p of problems) process.stdout.write(`  - [p313 hostile] ${p}\n`);
  process.exit(1);
}
process.stdout.write(
  `\n${TAG} PASS in ${seconds} s. ${String(arms.length)} arms: the honest phone read the three reads and every ` +
    'attack was refused with its own reason. Two loopback listeners — the door, and arm 15’s second door ' +
    'with the self-origin refusal turned ON — and one scratch directory, all gone. ' +
    'No Swift, no Apple, no phone, no Electron, no real interface.\n'
);
process.exit(0);
