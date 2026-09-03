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
 * `bad` counts the call sites the scanner must report. It is asked PER START
 * and not per file: a file that ends one child in a `finally` and starts a
 * second that nothing ends produces exactly one finding, which is the shape a
 * verifier walked past on 2026-09-03 and the likeliest real regression there
 * is.
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
  },

  // ------------------------------------------------------------------------
  // THE SIX SHAPES THE FIX ROUND ADDED, five of which walked past the gate as
  // it first shipped. Four are the file level reading of a `finally` and the
  // unread value of a name; the fifth is a sleeper spelled as a program rather
  // than as a shell word.
  // ------------------------------------------------------------------------
  {
    name: 'a kill in a finally belonging to an unrelated inner block',
    // WENT GREEN AS FIRST SHIPPED. `killsInFinally` was file level, so a
    // helper ending its own short lived `git status` child properly cleared
    // the top level sampler that is ended nowhere.
    bad: 1,
    text: fixture(`
import { LAUNCH } from 'node:child_process';
const sampler = LAUNCH('/bin/sh', ['-c', 'LOOP'], { detached: true });
await drive();
sampler.kill('SIGKILL');

function readStatus() {
  const child = LAUNCH('git', ['status']);
  try {
    return collect(child);
  } finally {
    child.kill('SIGTERM');
  }
}
`)
  },
  {
    name: 'one loop ended correctly and a second below it ended nowhere',
    // WENT GREEN AS FIRST SHIPPED, and it is the likeliest real regression:
    // a probe that already does the right thing adds a child and leaks it in
    // silence, because the file still holds a `finally` that kills.
    bad: 1,
    text: fixture(`
import { LAUNCH } from 'node:child_process';
const one = LAUNCH('/bin/sh', ['-c', 'LOOP']);
try {
  await drive();
} finally {
  one.kill('SIGKILL');
}
const two = LAUNCH('/bin/sh', ['-c', 'LOOP'], { detached: true });
await more();
`)
  },
  {
    name: 'the burner with its command line held in a name',
    // WENT GREEN AS FIRST SHIPPED. The argument text read `BURN` and the
    // gate never asked what `BURN` holds.
    bad: 1,
    text: fixture(`
import { LAUNCH } from 'node:child_process';
const BURN = 'LOOP';
const kids = [];
for (let i = 0; i < 6; i += 1) kids.push(LAUNCH('/bin/sh', ['-c', BURN], { stdio: 'ignore' }));
await drive();
for (const kid of kids) kid.kill('SIGKILL');
`)
  },
  {
    name: 'the same burner with its command line in a name, ended in a finally',
    bad: 0,
    text: fixture(`
import { LAUNCH } from 'node:child_process';
const BURN = 'LOOP';
const kids = [];
try {
  for (let i = 0; i < 6; i += 1) kids.push(LAUNCH('/bin/sh', ['-c', BURN], { stdio: 'ignore' }));
  await drive();
} finally {
  for (const kid of kids) kid.kill('SIGKILL');
}
`)
  },
  {
    name: 'detached true held in a named options object',
    // WENT GREEN AS FIRST SHIPPED, for the same reason as the one above.
    bad: 1,
    text: fixture(`
import { LAUNCH } from 'node:child_process';
const OPTS = { detached: true, stdio: 'ignore' };
const server = LAUNCH('/bin/sh', ['-c', 'node server.mjs'], OPTS);
await drive();
server.kill();
`)
  },
  {
    name: 'a sleeper spelled as a program rather than as a shell word',
    // WENT GREEN AS FIRST SHIPPED. `sleep <n>` needed a space, and this holds
    // the number in its own argument, so nothing matched. The gate's other
    // sleeper fixture spells it inside a `-c` line, which is why the gap
    // survived a fixture that claimed to cover a sleeper.
    bad: 1,
    text: fixture(`
import { LAUNCH } from 'node:child_process';
const held = LAUNCH('/bin/sleep', ['100000']);
await drive();
held.kill();
`)
  },
  {
    name: 'a child nobody holds at all, which nothing can ever end',
    bad: 1,
    text: fixture(`
import { LAUNCH } from 'node:child_process';
try {
  LAUNCH('/bin/sh', ['-c', 'LOOP'], { detached: true });
  await drive();
} finally {
  say('nothing to end, because nothing was kept');
}
`)
  }
];
