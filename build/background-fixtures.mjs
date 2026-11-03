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
 * `LAUNCH`, `LOOP` and `SLEEPER` are placeholders substituted immediately
 * before a fixture is written. They are placeholders for one reason: with the
 * real words in place this file's own source would read as a long lived child
 * started with no teardown, and the gate scans every file under build/.
 */

/** The three words a fixture cannot carry literally. */
export function fixture(text) {
  return text
    .replace(/LAUNCH/g, 'spa' + 'wn')
    .replace(/LOOP/g, 'whi' + 'le true; do :; done')
    .replace(/SLEEPER/g, 'sle' + 'ep 900');
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
  },

  // ------------------------------------------------------------------------
  // PHASE 307: A CALL IS READ BY WHAT IT IS. A regular expression's own
  // `exec` was read as `child_process.exec`, and the header that declares a
  // function as a call of it. The first three shapes are what the gate drops
  // now; the last three are what it must still find, because a gate that
  // stopped reading member calls, spreads or a receiver it cannot prove is a
  // gate made permissive.
  // ------------------------------------------------------------------------
  {
    name: "a regular expression's own exec beside a name that collides, which starts nothing",
    // RED BEFORE PHASE 307, held as nothing at all, so no finally could ever
    // clear it, and build/p293/probe-p293.mjs was routed around the gate.
    bad: 0,
    text: fixture(`
const raw = 'SLEEPER';
export const parts = /^rgba?\\(([^)]*)\\)$/i.exec(raw);
`)
  },
  {
    name: 'the same regular expression held in a name the file assigns nothing else',
    bad: 0,
    text: fixture(`
const raw = 'SLEEPER';
const RGB = /^rgba?\\(([^)]*)\\)$/i;
export const parts = RGB.exec(raw);
`)
  },
  {
    name: 'a declaration header beside the real start inside it',
    // TWO findings on one line before Phase 307, the header and the call. The
    // start inside is real and nothing holds it, so it is the one finding.
    bad: 1,
    text: fixture(`
import { LAUNCH } from 'node:child_process';
const cmd = 'LOOP';
export function other(cmd) {
  return LAUNCH('/bin/sh', ['-c', cmd]);
}
`)
  },
  {
    name: 'a member-form detached loop, which must stay found',
    bad: 1,
    text: fixture(`
import * as cp from 'node:child_process';
const server = cp.LAUNCH('/bin/sh', ['-c', 'LOOP'], { detached: true });
await drive();
server.kill();
`)
  },
  {
    name: 'a spread of a starter whose argument holds a loop, which must stay found',
    bad: 1,
    text: fixture(`
import { LAUNCH } from 'node:child_process';
const BURN = 'LOOP';
function startLoaders(cmd) {
  return [LAUNCH('/bin/sh', ['-c', cmd], { stdio: 'ignore' })];
}
const kids = [...startLoaders(BURN)];
await drive();
for (const kid of kids) kid.kill('SIGKILL');
`)
  },
  {
    name: 'a regular expression reached through a parameter, which stays reported',
    // THE RESIDUE, and the gate fails closed on it: nothing in this file says
    // `re` is a regular expression, so its `exec` is still read as a start.
    bad: 1,
    text: fixture(`
const raw = 'SLEEPER';
function channel(re) {
  return re.exec(raw);
}
export const parts = channel(/^rgba?\\(([^)]*)\\)$/i);
`)
  },
  // ── The probe review of Phase 352. A name the file assigns nothing but a
  //    regular expression by `=`, bound to a child process another way where
  //    the start is made. Each walked past the gate at Phase 307's first build
  //    (its receiver test read the name as a regular expression) and was found
  //    at the parent. ──
  {
    name: 'a regular expression name rebound by a destructuring declaration, which must stay found',
    bad: 1,
    text: fixture(`
import * as child from 'node:child_process';
const proc = /^x$/i;
export const looks = (s) => proc.test(s);
export function go() {
  const { proc } = { proc: child };
  proc.LAUNCH('/bin/sh', ['-c', 'LOOP'], { detached: true });
}
`)
  },
  {
    name: 'a regular expression name rebound by a for head, which must stay found',
    bad: 1,
    text: fixture(`
import * as child from 'node:child_process';
const handle = /^y$/;
export const matches = (s) => handle.test(s);
export function go() {
  for (const handle of [child]) handle.LAUNCH('/bin/sh', ['-c', 'SLEEPER'], { detached: true });
}
`)
  },
  {
    name: 'a regular expression name rebound by a catch clause, which must stay found',
    bad: 1,
    text: fixture(`
import * as child from 'node:child_process';
const job = /^z$/;
export const seen = (s) => job.exec(s);
export function go() {
  try {
    throw child;
  } catch (job) {
    job.LAUNCH('/bin/sh', ['-c', 'LOOP'], { detached: true });
  }
}
`)
  },
  // ── The fix round of Phase 352: the verify lens's hostile fixtures, each
  //    found at the parent and walked past by Phase 307's first build. ──
  {
    name: 'a regular expression name rebound by a destructuring ASSIGNMENT of an array, which must stay found',
    // v01: no `const`, `let` or `var` in front of the bracket.
    bad: 1,
    text: fixture(`
import * as child from 'node:child_process';
let proc = /x/;
[proc] = [child];
const BURN = 'LOOP';
proc.LAUNCH('/bin/sh', ['-c', BURN], { detached: true });
`)
  },
  {
    name: 'a regular expression name rebound by a destructuring ASSIGNMENT of an object, which must stay found',
    // v02.
    bad: 1,
    text: fixture(`
import * as child from 'node:child_process';
let proc = /x/;
({ proc } = { proc: child });
const BURN = 'LOOP';
proc.LAUNCH('/bin/sh', ['-c', BURN], { detached: true });
`)
  },
  {
    name: 'two functions with byte-identical bodies, the second taking the regex’s name as a parameter, which must stay found',
    // v03: the second body was asked at the first one's place, where `re` is
    // the file's regular expression, so `b` was no starter.
    bad: 1,
    text: fixture(`
import * as child from 'node:child_process';
const re = /x/;
function a(cmd) { return re.exec(cmd); }
function b(re, cmd) { return re.exec(cmd); }
const BURN = 'LOOP';
export const one = a('abc');
b(child, BURN);
`)
  },
  {
    name: 'a division after a postfix ++ whose divisor is a member call on a namespace named with flag letters, which must stay found',
    // v04: the slash after `i++` was read as a literal and its flag run.
    bad: 1,
    text: fixture(`
import * as ms from 'node:child_process';
let i = 0;
export const n = i++ / 2 /ms.LAUNCH('/bin/sh', ['-c', 'LOOP'], { detached: true });
`)
  }
];
