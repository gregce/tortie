#!/usr/bin/env node
/**
 * background-fixtures.mjs. The shapes build/assert-background-teardown.mjs is
 * proved on (Phase 206 item 5).
 *
 * THEY LIVE IN THEIR OWN FILE for the reason build/known-hosts-fixtures.mjs
 * does: a new shape that walks past the gate goes in HERE, in the same commit
 * as the fix, so the next round reads it rather than rediscovering it. A
 * checker nobody has seen fail is a checker nobody has seen work.
 *
 * `LAUNCH` and `LOOP` are placeholders substituted immediately before a fixture
 * is written. They are placeholders for one reason: with the real words in
 * place this file's own source would read as a long lived child started with
 * no teardown, and the gate scans every file under build/.
 */

/** The two words a fixture cannot carry literally. */
export function fixture(text) {
  return text
    .replace(/LAUNCH/g, 'spa' + 'wn')
    .replace(/LOOP/g, 'whi' + 'le true; do :; done');
}

/**
 * Every fixture, with the number of findings the scanner must produce.
 *
 * `bad` counts the call sites the scanner must report. A file with a kill in a
 * `finally` produces none however many children it starts.
 */
export const FIXTURES = [
  {
    name: 'the exact shape that leaked on 2026-09-02',
    // Six shell loops started to load the machine for an attack, the probe
    // run, then a kill AFTER it on the happy path. The parent exited before
    // the kill reached them, they reparented to launchd, and they ran for two
    // hours and three minutes at about 550 percent of the operator's CPU.
    bad: 1,
    text: fixture(`
import { LAUNCH } from 'node:child_process';
const loaders = [];
for (let i = 0; i < 6; i += 1) {
  loaders.push(LAUNCH('/bin/sh', ['-c', 'LOOP'], { stdio: 'ignore' }));
}
await runTheProbe();
for (const child of loaders) child.kill('SIGKILL');
`)
  },
  {
    name: 'the same six loads, ended in a finally',
    bad: 0,
    text: fixture(`
import { LAUNCH } from 'node:child_process';
const loaders = [];
try {
  for (let i = 0; i < 6; i += 1) {
    loaders.push(LAUNCH('/bin/sh', ['-c', 'LOOP'], { stdio: 'ignore' }));
  }
  await runTheProbe();
} finally {
  for (const child of loaders) child.kill('SIGKILL');
}
`)
  },
  {
    name: 'a detached child with no kill anywhere',
    bad: 1,
    text: fixture(`
import { LAUNCH } from 'node:child_process';
const server = LAUNCH(process.execPath, ['server.mjs'], { detached: true });
server.unref();
await useTheServer();
`)
  },
  {
    name: 'a detached child ended in a finally',
    bad: 0,
    text: fixture(`
import { LAUNCH } from 'node:child_process';
const server = LAUNCH(process.execPath, ['server.mjs'], { detached: true });
try {
  await useTheServer();
} finally {
  process.kill(-server.pid, 'SIGKILL');
}
`)
  },
  {
    name: 'a finally that tidies up but never ends the child',
    // The shape a rule read by SEARCHING for the word finally would pass.
    bad: 1,
    text: fixture(`
import { LAUNCH } from 'node:child_process';
import { rmSync } from 'node:fs';
const sampler = LAUNCH('/bin/sh', ['-c', 'LOOP']);
try {
  await measure();
} finally {
  rmSync('/tmp/scratch', { recursive: true, force: true });
}
sampler.kill('SIGKILL');
`)
  },
  {
    name: 'a finally whose only kill is inside a comment',
    bad: 1,
    text: fixture(`
import { LAUNCH } from 'node:child_process';
const sampler = LAUNCH('/bin/sh', ['-c', 'LOOP']);
try {
  await measure();
} finally {
  // child.kill('SIGKILL') would go here
  say('done');
}
`)
  },
  {
    name: 'a finally that calls a helper THIS FILE defines, which kills',
    // Discovered per file rather than matched by name, which is the
    // known-hosts gate's own lesson written into this one.
    bad: 0,
    text: fixture(`
import { LAUNCH } from 'node:child_process';
const started = [];
function endEverything() {
  for (const pid of started) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {}
  }
}
const sampler = LAUNCH('/bin/sh', ['-c', 'LOOP']);
started.push(sampler.pid);
try {
  await measure();
} finally {
  endEverything();
}
`)
  },
  {
    name: 'a finally that calls a helper which does NOT kill',
    bad: 1,
    text: fixture(`
import { LAUNCH } from 'node:child_process';
function tidy() {
  say('tidied');
}
const sampler = LAUNCH('/bin/sh', ['-c', 'LOOP']);
try {
  await measure();
} finally {
  tidy();
}
`)
  },
  {
    name: 'a bounded child, which this rule is not about',
    // spawnSync returns when the child has ended, so there is nothing to end.
    bad: 0,
    text: fixture(`
import { LAUNCHSync } from 'node:child_process';
LAUNCHSync('/bin/sh', ['-c', 'LOOP'], { timeout: 5000 });
LAUNCHSync('tmux', ['-L', 'p206', 'new-session', '-d', '-s', 'x', 'LOOP']);
`)
  },
  {
    name: 'an ordinary asynchronous child that ends by itself',
    // A git read is not a long lived child, and a gate that reported one
    // would be a sixteen file refactor rather than a nit.
    bad: 0,
    text: fixture(`
import { LAUNCH } from 'node:child_process';
const child = LAUNCH('/usr/bin/git', ['status', '--porcelain']);
await new Promise((r) => child.on('exit', r));
`)
  },
  {
    name: 'a sleeper held open, which is the same family as a loop',
    bad: 1,
    text: fixture(`
import { LAUNCH } from 'node:child_process';
const holder = LAUNCH('/bin/sh', ['-c', 'sleep 100000']);
await measure();
holder.kill();
`)
  },
  {
    name: 'a load generator started through a wrapper this file defines',
    // The wrapper is discovered from the file, not from a list of call names.
    bad: 1,
    text: fixture(`
import { LAUNCH } from 'node:child_process';
function background(file, args) {
  return LAUNCH(file, args, { stdio: 'ignore' });
}
const loader = background('/bin/sh', ['-c', 'LOOP']);
await measure();
loader.kill('SIGKILL');
`)
  }
];
