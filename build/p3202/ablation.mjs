#!/usr/bin/env node
/**
 * `npm run ablation:p3202`. THE ATTACK ON CONDITION 54, TURNED AROUND (Phase
 * 320.2, build/p3202/SPEC.md §5.2).
 *
 * About two minutes: sixteen runs of `node build/conformance-machines.mjs`, one
 * control and fifteen arms, at about 7 s each. It launches no Electron, starts
 * no tmux server, runs no ssh, spawns no agent and makes no request. It starts
 * no process but `node`, and waits for each one to end.
 *
 * ## What it proves
 *
 * Phase 320.2 removed the Read Last Lines window everywhere, on the operator's
 * ruling of 2026-09-30 ("Remove it everywhere"), because Phase 320.1 lets a
 * session on another machine scroll back. `conformance:machines` condition 54,
 * which used to FAIL when the window's module was absent, now holds the
 * window's ABSENCE in six sub-clauses: none of its files and no file named like
 * one (54a), `copy-mode` on no ledger row (54b), no spelling of the channel
 * (54c), none of the window, its menu row, its store, its words or its knob
 * (54d), a scanner that reads its own fixtures, read enough files and keeps
 * its one exception matching (54e), and `capture-pane` still a safe read
 * (54f).
 *
 * An absence nobody can put back is an absence nobody tested. This script puts
 * ONE piece of the window back at a time, in the real tree, runs the gate, and
 * asks whether the sub-clause that OWNS that piece is the one that went red. A
 * red on some other condition alone is red for the wrong reason and fails the
 * arm; collateral reds beside the owner are printed and do not fail it. Arms
 * 10 to 12 are what prove the one exception narrow: a different file is not
 * exempt, a different family in the same file is not exempt, and an exception
 * cannot outlive its file.
 *
 * ## The safety, stated because this script edits the working tree
 *
 *   - Every target's bytes are read ONCE, before anything is written, and held
 *     in memory; a file an arm PLANTS is recorded as absent. After every arm
 *     the target is put back and compared by sha256 with those bytes (a planted
 *     file must be absent again, a removed one present again), and a mismatch
 *     stops the run. A `finally`, an `exit` handler and SIGINT, SIGTERM and
 *     SIGHUP put back whatever an arm left and compare every target again.
 *   - SEVERAL BUILDERS SHARE ONE WORKTREE. Before an arm is written the target
 *     must still be the bytes read at the start, and before it is put back it
 *     must still be the bytes the arm left. If either is not so, somebody else
 *     has edited it while this ran, the run stops, NOTHING is written over
 *     their work, the file is named and the exit is 2. The guard is not a lock:
 *     the window between a read and the write after it is one read and one
 *     write wide, which is why it runs in a clone while anybody else is
 *     editing.
 *   - It asks git nothing. A phase build's tree is dirty by definition, so the
 *     right target is "what was here when this started", which is the map.
 *   - While anybody is still editing, run it only in an APFS clone of the
 *     worktree (`cp -Rc`, then `node <clone>/build/p3202/ablation.mjs`): it runs
 *     the gate with `cwd` at ITS OWN repository root, so a clone breaks and
 *     restores only the clone.
 *
 * `--self-test` proves the failure-line parser and the verdict on three
 * in-memory gate outputs (an owner line, an owner beside a collateral line, a
 * PASS) and starts nothing, reads no target and writes nothing.
 *
 * Exit 0 when the control is green and every arm reads red on its owner, 1
 * with each failing arm named, 2 when it refuses or a file is not back.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG = '[ablation:p3202]';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const say = (line) => console.log(`${TAG} ${line}`);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

const EXEC_PLANE = 'src/main/machines/exec-plane.ts';
const STRIP_NOTE = 'src/renderer/app/__tests__/p95-strip-note.test.tsx';

/**
 * The fifteen arms of SPEC.md §5.2, in its order. Each puts ONE piece back.
 * `plant` creates a file that must not be there; `remove` takes a file away for
 * the arm; `append` adds a line at the end; `find` must occur EXACTLY ONCE in
 * the file, or the arm is not applied and fails, because an ablation that
 * cannot be placed proves nothing and a clause that moved needs its arm moved
 * with it.
 */
const ARMS = [
  {
    n: 1,
    owner: '54a',
    file: 'src/main/machines/remote-lines.ts',
    name: "the window's main module is back, holding nothing",
    plant: 'export {};\n'
  },
  {
    n: 2,
    owner: '54a',
    file: 'src/renderer/machines/ReadLinesPanel.tsx',
    name: 'a file named like the window, on no list, holding nothing',
    plant: 'export {};\n'
  },
  {
    n: 3,
    owner: '54b',
    file: EXEC_PLANE,
    name: 'copy-mode is put on the verb ledger as a safe read',
    find: "  {\n    verb: 'capture-pane',\n",
    to:
      "  { verb: 'copy-mode', repeat: 'safe', kind: 'read', reason: 'An ablation plant of Phase 320.2, never shipped.' },\n" +
      "  {\n    verb: 'capture-pane',\n"
  },
  {
    n: 4,
    owner: '54c',
    file: 'src/preload/machines.ts',
    name: 'the preload spells the channel',
    append: "export const p3202Plant = 'machines:readSessionLines';"
  },
  {
    n: 5,
    owner: '54c',
    file: 'src/main/machines/ipc.ts',
    name: 'the registrar spells the channel',
    append: "export const p3202Plant = 'machines:readSessionLines';"
  },
  {
    n: 6,
    owner: '54c',
    file: 'src/shared/ipc/machines/rows.ts',
    name: "the contract declares the channel's result type",
    append: 'export type MachineSessionLinesResult = never;'
  },
  {
    n: 7,
    owner: '54d',
    file: 'src/renderer/terminal/terminal-menu.ts',
    name: 'the session menu spells the row',
    append: "export const p3202Plant = 'Read Last Lines…';"
  },
  {
    n: 8,
    owner: '54d',
    file: 'src/renderer/state/sessions-slice.ts',
    name: "the store spells the window's action",
    append: "export const p3202Plant = 'openRemoteLines';"
  },
  {
    n: 9,
    owner: '54d',
    file: 'src/renderer/app/probe-registry.ts',
    name: 'the harness knob is back',
    append: '// remoteLines?: unknown;'
  },
  {
    n: 10,
    owner: '54d',
    file: 'src/renderer/app/__tests__/p165-lazy-doors.test.ts',
    name: 'a test that is NOT the exception spells the row',
    append: '// Read Last Lines'
  },
  {
    n: 11,
    owner: '54d',
    file: STRIP_NOTE,
    name: "the exception's own file spells ANOTHER family",
    append: '// remote-lines'
  },
  {
    n: 12,
    owner: '54e',
    file: STRIP_NOTE,
    name: "the exception's file is taken away, so the exception names nothing",
    remove: true
  },
  {
    n: 13,
    owner: '54f',
    file: EXEC_PLANE,
    name: 'capture-pane stops being a read',
    find: "    verb: 'capture-pane',\n    repeat: 'safe',\n    kind: 'read',",
    to: "    verb: 'capture-pane',\n    repeat: 'safe',\n    kind: 'mutating',"
  },
  {
    n: 14,
    owner: '54d',
    file: 'src/renderer/machines/presentation.ts',
    name: "the window's words are back",
    append: "export const READ_LINES_TITLE = 'Last lines';"
  },
  {
    n: 15,
    owner: '54d',
    file: 'src/renderer/styles/app.css',
    name: "the window's style is back",
    append: '.remote-lines-modal { display: block; }'
  }
];

// ---------------------------------------------------------------------------
// The gate's output, read
// ---------------------------------------------------------------------------

/** The failure lines a gate run printed after its `FAIL, <n>:` line, without the `  - `. */
function failureLines(stdout) {
  const at = stdout.indexOf('\nFAIL, ');
  if (at === -1) return [];
  return stdout
    .slice(at)
    .split('\n')
    .filter((line) => line.startsWith('  - '))
    .map((line) => line.slice(4));
}

/** What one gate run says about one arm's owner. */
function verdictFor(status, lines, owner) {
  const mine = lines.filter((line) => line.startsWith(`${owner}:`));
  const collateral = lines.filter((line) => !line.startsWith(`${owner}:`));
  let red;
  if (status === 0) red = 'GREEN';
  else if (status === 1 && mine.length > 0) red = 'yes';
  else red = 'wrong reason';
  return { red, mine, collateral };
}

// ---------------------------------------------------------------------------
// --self-test: the parser and the verdict, in memory, starting nothing
// ---------------------------------------------------------------------------

if (process.argv.includes('--self-test')) {
  const cases = [
    {
      name: 'an owner line',
      status: 1,
      stdout:
        'the carriage door holds: ...\n\nFAIL, 1:\n' +
        "  - 54c: src/preload/machines.ts:412 spells the channel Phase 320.2 removed (export const p3202Plant = 'machines:readSessionLines';)\n",
      lines: 1,
      verdicts: [
        ['54c', 'yes', 1, 0],
        ['54d', 'wrong reason', 0, 1]
      ]
    },
    {
      name: 'an owner beside a collateral line',
      status: 1,
      stdout:
        'a line before\n\nFAIL, 2:\n' +
        '  - condition 88l: a literal call site moved, which says 54d: in its own words.\n' +
        "  - 54d: src/renderer/styles/app.css:900 spells the Read Last Lines window, its menu row, its store, its words or its knob (.remote-lines-modal { display: block; })\n",
      lines: 2,
      verdicts: [
        ['54d', 'yes', 1, 1],
        ['54a', 'wrong reason', 0, 2]
      ]
    },
    {
      name: 'a PASS output',
      status: 0,
      stdout:
        'the Read Last Lines window is gone: none of its 7 files ...\n\n' +
        'PASS. A machine confirmation is bound to the six fields that decide what runs.\n',
      lines: 0,
      verdicts: [['54a', 'GREEN', 0, 0]]
    }
  ];
  const wrong = [];
  for (const one of cases) {
    const lines = failureLines(one.stdout);
    if (lines.length !== one.lines) {
      wrong.push(`${one.name}: the parser read ${String(lines.length)} failure line(s), not ${String(one.lines)}`);
    }
    for (const [owner, red, mine, collateral] of one.verdicts) {
      const got = verdictFor(one.status, lines, owner);
      if (got.red !== red || got.mine.length !== mine || got.collateral.length !== collateral) {
        wrong.push(
          `${one.name}, owner ${owner}: read ${got.red} with ${String(got.mine.length)} owner and ` +
            `${String(got.collateral.length)} collateral line(s), not ${red} with ${String(mine)} and ${String(collateral)}`
        );
      }
    }
  }
  if (wrong.length > 0) {
    for (const line of wrong) process.stderr.write(`${TAG} self-test: ${line}\n`);
    process.stderr.write(`${TAG} self-test FAILED: ${String(wrong.length)} finding(s).\n`);
    process.exit(1);
  }
  say(
    `self-test: the parser and the verdict read all ${String(cases.length)} in-memory gate outputs right ` +
      `(${String(cases.reduce((n, one) => n + one.verdicts.length, 0))} verdicts); nothing was started, read or written.`
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// The bytes, read once. `null` is a file that is not there.
// ---------------------------------------------------------------------------

const readOrNull = (full) => {
  try {
    return readFileSync(full);
  } catch (err) {
    if (err && err.code === 'ENOENT') return null;
    throw err;
  }
};
const same = (a, b) => (a === null || b === null ? a === b : sha(a) === sha(b));

const targets = [...new Set(ARMS.map((arm) => arm.file))];
const originals = new Map();
for (const rel of targets) {
  try {
    originals.set(rel, readOrNull(join(repoRoot, rel)));
  } catch (err) {
    console.error(`${TAG} ${rel} could not be read: ${String(err)}`);
    process.exit(2);
  }
}
/** What an arm last left in a file and has not yet taken back (`null`: it left it absent). */
const written = new Map();
/** Files somebody else edited while this ran. Nothing is ever written over them. */
const foreign = new Set();

/** Put a file back to the bytes read at the start, or absent if it was absent. */
function putBack(rel) {
  const full = join(repoRoot, rel);
  const start = originals.get(rel);
  if (start === null) {
    if (existsSync(full)) unlinkSync(full);
  } else {
    writeFileSync(full, start);
  }
}

/**
 * Put back whatever an arm left, but ONLY over what that arm left. A file that
 * is neither the arm's nor the original's was edited by somebody else in the
 * meantime, and is named rather than overwritten.
 */
function restoreGuarded() {
  for (const [rel, left] of [...written]) {
    let now;
    try {
      now = readOrNull(join(repoRoot, rel));
    } catch {
      foreign.add(rel);
      written.delete(rel);
      continue;
    }
    if (same(now, left)) putBack(rel);
    else if (!same(now, originals.get(rel))) foreign.add(rel);
    written.delete(rel);
  }
}

/** Every target compared with what was read at the start, by sha256 (absent must be absent). */
function unrestored() {
  const out = [];
  for (const [rel, start] of originals) {
    let now;
    try {
      now = readOrNull(join(repoRoot, rel));
    } catch {
      out.push(rel);
      continue;
    }
    if (!same(now, start)) out.push(rel);
  }
  return out;
}

let signalled = false;
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    signalled = true;
    restoreGuarded();
    const wrong = unrestored();
    process.stderr.write(
      `${TAG} stopped by ${sig}; ` +
        (wrong.length === 0
          ? `every one of the ${String(originals.size)} targets is back, checked by sha256.\n`
          : `THESE TARGETS ARE NOT WHAT WAS READ AT THE START: ${wrong.join(', ')}` +
            (foreign.size > 0 ? ` (edited by somebody else while this ran: ${[...foreign].join(', ')})` : '') +
            '\n')
    );
    process.exit(130);
  });
}
// The last resort for a throw that escapes everything below: `exit` runs
// synchronously, and the guarded restore is synchronous.
process.on('exit', () => restoreGuarded());

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

/** Run the gate at this repository's root; answer its exit and its failure lines. */
function runGate() {
  const started = Date.now();
  const run = spawnSync(process.execPath, ['build/conformance-machines.mjs'], {
    encoding: 'utf8',
    cwd: repoRoot,
    maxBuffer: 64 * 1024 * 1024,
    timeout: 180_000,
    killSignal: 'SIGKILL'
  });
  return {
    status: run.status,
    signal: run.signal,
    ms: Date.now() - started,
    lines: failureLines(`${run.stdout ?? ''}`),
    stderr: `${run.stderr ?? ''}`.trim()
  };
}

const occurrences = (text, needle) => {
  let count = 0;
  for (let at = text.indexOf(needle); at !== -1; at = text.indexOf(needle, at + 1)) count += 1;
  return count;
};

/** The bytes an arm leaves in its file (`null`: absent), or a sentence saying why it cannot be placed. */
function composeArm(arm, start) {
  if (arm.plant !== undefined) {
    if (start !== null) return { why: 'the file it plants is already there' };
    if (!existsSync(dirname(join(repoRoot, arm.file)))) return { why: 'the directory it plants into is not there' };
    return { bytes: Buffer.from(arm.plant, 'utf8') };
  }
  if (start === null) return { why: 'the file it edits is not there' };
  if (arm.remove === true) return { bytes: null };
  const text = start.toString('utf8');
  if (arm.append !== undefined) {
    return { bytes: Buffer.from(`${text}${text.endsWith('\n') ? '' : '\n'}${arm.append}\n`, 'utf8') };
  }
  const count = occurrences(text, arm.find);
  if (count !== 1) return { why: `its text occurs ${String(count)} times rather than once` };
  return { bytes: Buffer.from(text.replace(arm.find, () => arm.to), 'utf8') };
}

const tick = () => new Promise((done) => setImmediate(done));
const problems = [];
const table = [];

async function main() {
  const control = runGate();
  if (control.status !== 0) {
    problems.push(
      `the CONTROL run is not green (exit ${String(control.status)}${control.signal ? `, ${control.signal}` : ''}), ` +
        'so every reading below would be about a tree that was already failing. Its failures: ' +
        (control.lines.map((line) => line.slice(0, 200)).join(' | ') || control.stderr.slice(0, 400) || 'none printed')
    );
    return;
  }
  say(`control: the gate is green on the unedited tree (${String(control.ms)} ms)`);

  for (const arm of ARMS) {
    if (signalled) return;
    const full = join(repoRoot, arm.file);
    const start = originals.get(arm.file);
    const row = { n: arm.n, owner: arm.owner, file: arm.file, name: arm.name, red: 'no', back: '-', collateral: [] };
    table.push(row);

    const composed = composeArm(arm, start);
    if (composed.why !== undefined) {
      problems.push(
        `arm ${String(arm.n)} (${arm.owner}) "${arm.name}": ${composed.why} in ${arm.file}, so it was not applied. ` +
          'A clause that moved needs its arm moved with it.'
      );
      row.red = 'not applied';
      continue;
    }

    // The check stands on the line before the write, with the edit already
    // composed, so the window in which another editor's save could be lost is
    // one read and one write wide.
    if (!same(readOrNull(full), start)) {
      foreign.add(arm.file);
      problems.push(
        `${arm.file} is no longer what was read at the start, so somebody else is editing it. ` +
          'The run stops here and writes nothing over their work.'
      );
      row.red = 'not run';
      return;
    }
    if (composed.bytes === null) unlinkSync(full);
    else writeFileSync(full, composed.bytes);
    written.set(arm.file, composed.bytes);
    const got = runGate();
    restoreGuarded();
    const back = same(readOrNull(full), start);
    row.back = back ? 'yes' : 'NO';
    row.ms = got.ms;
    if (foreign.has(arm.file) || !back) {
      problems.push(
        `${arm.file} did NOT come back byte for byte after arm ${String(arm.n)}` +
          (foreign.has(arm.file) ? ', because somebody else edited it while the gate ran; it was left as they left it' : '') +
          '. Stopping.'
      );
      return;
    }

    const verdict = verdictFor(got.status, got.lines, arm.owner);
    row.red = verdict.red;
    row.collateral = verdict.collateral;
    if (verdict.red === 'GREEN') {
      problems.push(
        `arm ${String(arm.n)} (${arm.owner}) "${arm.name}": the gate stayed GREEN with a piece of the window back. ` +
          'A clause that cannot be made to fail has stopped asking.'
      );
    } else if (verdict.red !== 'yes') {
      problems.push(
        `arm ${String(arm.n)} (${arm.owner}) "${arm.name}": the gate exited ${String(got.status)}` +
          `${got.signal ? ` (${got.signal})` : ''} and went red on ` +
          `${got.lines.map((line) => line.slice(0, 12)).join(', ') || got.stderr.slice(0, 200) || 'nothing it printed'} ` +
          `rather than on ${arm.owner}. That is red for the wrong reason.`
      );
    }
    say(
      `${row.red === 'yes' ? 'ok  ' : 'FAIL'} arm ${String(arm.n).padStart(2)}  ${arm.owner}  ${arm.file}  ` +
        `${arm.name}  (${String(got.ms)} ms, back by sha256: ${row.back})`
    );
    for (const line of verdict.mine.slice(0, 2)) say(`       owner:      ${line.slice(0, 220)}`);
    for (const line of verdict.collateral) say(`       collateral: ${line.slice(0, 220)}`);
    await tick();
  }
}

try {
  await main();
} finally {
  restoreGuarded();
  const wrong = unrestored();
  if (wrong.length > 0) {
    process.stderr.write(
      `${TAG} THESE TARGETS ARE NOT WHAT WAS READ AT THE START: ${wrong.join(', ')}` +
        (foreign.size > 0
          ? `. Somebody else edited ${[...foreign].join(', ')} while this ran, and nothing was written over it.`
          : '') +
        '\n'
    );
    process.exitCode = 2;
  } else {
    say(`every one of the ${String(originals.size)} targets came back, checked by sha256 (a planted file absent again)`);
  }
}

const red = table.filter((row) => row.red === 'yes').length;
say('');
say(' #  owner  red on owner   back   arm');
for (const row of table) {
  say(
    `${String(row.n).padStart(2)}  ${row.owner.padEnd(5)}  ${row.red.padEnd(13)}  ${row.back.padEnd(5)}  ${row.name}` +
      (row.collateral.length > 0 ? `  [+${String(row.collateral.length)} collateral]` : '')
  );
}

if (problems.length > 0 || process.exitCode === 2) {
  for (const problem of problems) process.stderr.write(`${TAG} ${problem}\n`);
  process.stderr.write(`${TAG} FAILED: ${String(problems.length)} finding(s).\n`);
  process.exit(process.exitCode === 2 ? 2 : 1);
}
say(
  `OK: the control is green, and ${String(red)} of ${String(ARMS.length)} arms went red on the ` +
    'sub-clause of condition 54 that owns them, one piece of the Read Last Lines window put back each.'
);
process.exit(0);
