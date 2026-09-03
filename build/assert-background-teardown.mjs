#!/usr/bin/env node
/**
 * assert-background-teardown.mjs. A process a script under build/ starts and
 * does not wait for is ended in a `finally` block (Phase 206 item 5).
 *
 * ## Why this file exists
 *
 * On 2026-09-02 the Phase 200 verifier started six shell loops to load the
 * machine for an attack, ran its probe, then tried to kill them. The kill did
 * not reach them, the parent exited, they reparented to launchd and ran for
 * two hours and three minutes at about 550 percent of the operator's CPU until
 * he noticed his fans. The machine discipline section of CLAUDE.md said every
 * probe that launches an ELECTRON kills it in a `finally`, and said nothing
 * about anything else a script starts. That rule now covers any process a
 * script starts, being a shell, a server, a sleeper or a load generator, and
 * this gate is what keeps it there, the way build/assert-electron-teardown.mjs
 * keeps the Electron half.
 *
 * ## WHAT A LONG LIVED CHILD IS, and the narrowing is deliberate
 *
 * A gate that asked this of EVERY spawn under build/ would go red on 17 files
 * at HEAD and stop being a nit. So it asks it of the family that leaked, and
 * of nothing else. A long lived child is an ASYNCHRONOUS spawn, being `spawn`,
 * `execFile`, `exec` or `fork` and never the `*Sync` forms, which return when
 * the child has already ended, that is one of:
 *
 *   1. DETACHED, being an options object carrying `detached: true`. That is
 *      the flag that puts a child in its own process group so it is NOT ended
 *      with its parent, which is exactly how the six loops reparented.
 *   2. A RUNNER THAT DOES NOT STOP BY ITSELF, being a call whose argument text
 *      carries a shell loop or a sleeper. `while`, `until`, `sleep <n>` and
 *      `yes` are what a load generator, a sampler and a holder are made of.
 *
 * An ordinary child that ends by itself, being a git read or a tmux command,
 * is not this rule's business and is not reported.
 *
 * ## What it asserts, and every direction matters
 *
 *   1. FORWARD. Every file under build/ that starts a long lived child holds a
 *      `finally` block that reaches a kill. The braces are MATCHED rather than
 *      the word searched, because a file that mentions `finally` in a comment
 *      or in prose is not a file that ends anything. A kill inside a comment
 *      does not count, because comments are stripped before the scan.
 *   2. THE CALL NAMES ARE DISCOVERED PER FILE, not listed. Almost every probe
 *      under build/ declares its own wrapper around a spawn, and a probe that
 *      called its wrapper `background` would be invisible to a hard coded
 *      list. That is build/assert-known-hosts-scoped.mjs's own lesson, written
 *      into this gate rather than rediscovered by it.
 *   3. THE KILL MAY BE IN A HELPER THIS FILE DEFINES, discovered the same way,
 *      so a probe with an `endEverything()` of its own passes and a probe whose
 *      `finally` calls a helper that tidies but never kills does not.
 *   4. REVERSE. Every file on the recorded list below still starts a long
 *      lived child. Without this direction the gate goes on passing after
 *      somebody deletes every such probe, which is the lesson
 *      build/assert-probe-containment.mjs records about itself.
 *   5. THE FIXTURES. The scanner is run over twelve files this gate writes
 *      itself, in build/background-fixtures.mjs, including the exact shape
 *      that leaked. A checker nobody has seen fail is a checker nobody has
 *      seen work, and a NEW shape that walks past this gate goes into that
 *      file in the same commit as the fix.
 *
 * ## What it does not assert
 *
 * It does not read package.json, and it does not follow a command line handed
 * to another program to run, being a tmux pane or a harness line. Those
 * children belong to a server the harness itself ends, which is a different
 * shape from a load generator a probe holds across its own assertions, and it
 * is the same boundary build/assert-electron-teardown.mjs draws.
 *
 * Run it with `npm run gate:background`. It spawns nothing, opens no socket
 * and launches no Electron, and it takes about 0.1 s.
 */

import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FIXTURES } from './background-fixtures.mjs';
import { blockAt, callArguments, lineAt, namedFunctions, stripComments } from './scan-source.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = join(repoRoot, 'build');

/**
 * The files that started a long lived child when this gate landed. When one is
 * deleted on purpose, delete its row here in the same commit and say so in the
 * commit body. Do not delete a row to make a red gate green.
 */
const STARTERS = ['probe-remote-env.mjs'];

/** The asynchronous spawn calls node itself offers. Never the Sync forms. */
const NODE_SPAWNS = ['spawn', 'execFile', 'exec', 'fork'];

/**
 * A command line that does not stop by itself.
 *
 * FOUR TERMS AND NOT FIVE. A bare `yes` was tried and taken out: it appears in
 * `KbdInteractiveAuthentication yes` in an sshd configuration this tree really
 * writes, so it reported a line of configuration as a load generator. The four
 * that remain are what a loop, a sampler and a holder are actually made of.
 */
const NEVER_STOPS =
  /(^|[^A-Za-z_$])(while|until)[\s:(]|\bsleep\s+[0-9]|for\s*\(\s*;;/;

/** An options object that puts the child in its own process group. */
const DETACHED = /\bdetached\s*:\s*true\b/;

/**
 * Which names in this file start a process, being node's own plus every
 * function the file defines whose body reaches one of them.
 *
 * DISCOVERED RATHER THAN LISTED, which is the whole of rule 2.
 *
 * ONE LEVEL, AND THE TRANSITIVE CLOSURE WAS TRIED AND REFUSED. Following
 * callers of callers reads almost every function in a large probe as a
 * spawner, because `fail()` reaches a cleanup that reaches a spawn: measured
 * on build/update-rehearsal.mjs, two rounds made 36 of its functions spawners
 * and one round makes none. A wrapper in this tree calls the real thing
 * directly, which is what one level is for.
 */
export function spawnersIn(code) {
  const names = new Set(NODE_SPAWNS);
  for (const [name, body] of namedFunctions(code)) {
    if (names.has(name)) continue;
    for (const known of NODE_SPAWNS) {
      if (new RegExp(`\\b${known}\\s*\\(`).test(body)) {
        names.add(name);
        break;
      }
    }
  }
  return names;
}

/** Every long lived child one file starts, with the line it starts on. */
export function longLivedStarts(name, source) {
  const code = stripComments(source);
  const spawners = spawnersIn(code);
  const hits = [];
  const call = new RegExp(`\\b(${[...spawners].join('|')})\\s*\\(`, 'g');
  let m;
  while ((m = call.exec(code)) !== null) {
    // A name followed by `Sync` is a different call and this rule is not about
    // it: it returns when the child has already ended.
    const open = m.index + m[0].length - 1;
    const args = callArguments(code, open).join(' ');
    if (!NEVER_STOPS.test(args) && !DETACHED.test(args)) continue;
    hits.push({
      file: name,
      line: lineAt(code, m.index),
      why: DETACHED.test(args) ? 'detached' : 'a runner that does not stop by itself'
    });
  }
  return hits;
}

/**
 * Whether this file ends what it started inside a `finally` block.
 *
 * The braces are matched from the `finally` keyword. A kill counts when it is
 * in the block itself, or in a function this file defines that the block
 * calls, which is rule 3.
 */
export function killsInFinally(source) {
  const code = stripComments(source);
  const bodies = namedFunctions(code);
  const kill = /\bkill\s*\(/;
  const word = /\bfinally\b/g;
  let m;
  while ((m = word.exec(code)) !== null) {
    const open = code.indexOf('{', m.index);
    if (open === -1) continue;
    // The keyword must be followed by its own block and nothing else between.
    if (/[^\s]/.test(code.slice(m.index + 'finally'.length, open))) continue;
    const body = blockAt(code, open);
    if (body === null) continue;
    if (kill.test(body)) return true;
    for (const [name, fnBody] of bodies) {
      if (!new RegExp(`\\b${name}\\s*\\(`).test(body)) continue;
      if (kill.test(fnBody)) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// The fixtures
// ---------------------------------------------------------------------------

function runFixtures(failures) {
  const dir = mkdtempSync(join(tmpdir(), 'p206-gate-'));
  let behaved = 0;
  try {
    for (const [i, f] of FIXTURES.entries()) {
      const path = join(dir, `fixture-${String(i)}.mjs`);
      writeFileSync(path, f.text, 'utf8');
      const text = readFileSync(path, 'utf8');
      const starts = longLivedStarts(`fixture-${String(i)}.mjs`, text);
      const ended = killsInFinally(text);
      const found = ended ? 0 : starts.length;
      if (found === f.bad) {
        behaved += 1;
        continue;
      }
      failures.push({
        what: `the fixture "${f.name}" was misread`,
        detail:
          `The scanner found ${String(starts.length)} long lived start(s) and ` +
          `read the teardown as ${ended ? 'inside' : 'outside'} a finally, so ` +
          `it reported ${String(found)} finding(s) rather than ${String(f.bad)}. ` +
          'A scanner that misreads a fixture cannot be trusted on a real file.'
      });
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return behaved;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

function main() {
  const failures = [];
  const files = readdirSync(buildDir).filter(
    (n) => n.endsWith('.mjs') || n.endsWith('.cjs') || n.endsWith('.mts')
  );

  // Rule 1, forward.
  let scanned = 0;
  let starters = 0;
  for (const name of files) {
    const source = readFileSync(join(buildDir, name), 'utf8');
    scanned += 1;
    const starts = longLivedStarts(name, source);
    if (starts.length === 0) continue;
    starters += 1;
    if (killsInFinally(source)) continue;
    for (const hit of starts) {
      failures.push({
        what: `build/${hit.file}:${String(hit.line)} starts a process it does not wait for and does not end in a finally`,
        detail:
          `The child is ${hit.why}. On 2026-09-02 six of these outlived the ` +
          'script that started them, reparented to launchd and ran for two ' +
          'hours at about 550 percent of the CPU. Put the whole run in a ' +
          '`try` and end the child by its own pid in the `finally`.'
      });
    }
  }

  // Rule 4, reverse.
  for (const name of STARTERS) {
    let source;
    try {
      source = readFileSync(join(buildDir, name), 'utf8');
    } catch {
      failures.push({
        what: `build/${name} is on the recorded list and is not on disk`,
        detail:
          'Either it was deleted and STARTERS in this file went stale, or it ' +
          'was renamed. Edit the list on purpose rather than deleting the row ' +
          'to make this gate green.'
      });
      continue;
    }
    if (longLivedStarts(name, source).length === 0) {
      failures.push({
        what: `build/${name} no longer starts a long lived child`,
        detail:
          'The recorded list is what stops this gate passing while it checks ' +
          'nothing. Take the row out on purpose if the probe really changed.'
      });
    }
  }

  // Rule 5, the fixtures.
  const behaved = runFixtures(failures);

  if (failures.length > 0) {
    console.error(
      '[background-teardown] a process started under build/ is not ended in a finally.'
    );
    for (const { what, detail } of failures) {
      console.error(`  ${what}`);
      console.error(`    ${detail}`);
    }
    process.exit(1);
  }

  console.log(
    `[background-teardown] ${String(scanned)} files under build/ were read, ` +
      `${String(starters)} start a process they do not wait for and every one ` +
      `of them ends it inside a finally block. ${String(behaved)} of ` +
      `${String(FIXTURES.length)} fixtures behaved.`
  );
}

// Run only when this file IS the command. It exports its scanners so another
// checker and a debug session can read them without launching a scan.
if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
