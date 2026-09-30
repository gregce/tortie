#!/usr/bin/env node
/**
 * `npm run conformance:pocket:hostile`. The attack on the door (Phase 313;
 * rebuilt for the door on the internet by Phase 330), and it runs in the
 * ordinary battery.
 *
 * WHY IT IS A CHECK AND NOT A PROBE. It has to cost seconds rather than minutes
 * and need nothing of the host. It does: one plain node through the pinned
 * tsx, the door process's listener run IN THAT PROCESS on `127.0.0.1` on a port
 * the listener chose itself, a throwaway identity and a throwaway sealed
 * record under a `mkdtemp`, all ended in a `finally`. No Electron, no tmux, no
 * ssh, no agent, no token, no Tailscale, no real interface, and nothing under
 * the person's home is read.
 *
 * WHAT IT ASSERTS. Not that the door refuses, but that it refuses FOR THE RIGHT
 * REASON, before the HTTP parser where §9 condition 1 says so, and lets the
 * honest phone through: pair, allowed, handed its certificate, and read over
 * mutual TLS. An attack whose every arm comes back refused proves a door that
 * is off, so the honest arms are in the same table as the attacks and a run
 * where they fail is a FAILED run.
 *
 * PHASE 330 took the harness loopback override away: the door binds loopback
 * by construction now, so this runner sets nothing in the environment.
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
    timeout: 90_000
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
  `\n${TAG} PASS in ${seconds} s. ${String(arms.length)} arms: the honest phone paired by proof, was allowed and ` +
    'handed its certificate, and read the three reads over mutual TLS through the shipping route composer, pinning ' +
    'the QR’s public key; every attack was refused with its own reason, and every refusal before HTTP left the ' +
    'parser counter where it was. One loopback listener in-process and one scratch directory, both gone. ' +
    'No Swift, no Apple, no phone, no Electron, no Tailscale, no real interface.\n'
);
process.exit(0);
