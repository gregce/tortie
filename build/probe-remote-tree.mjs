/**
 * `node build/probe-remote-tree.mjs`. Phase 90.3's depth measurement, against a
 * real second machine.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES, AND THEY OUTRANK EVERY NUMBER BELOW
 * ---------------------------------------------------------------------------
 *  1. It goes through `build/real-machine.mjs`, so the person names the machine
 *     TWICE and a loopback address, an unset name and a CI run each refuse
 *     before anything is contacted.
 *  2. IT IS READ ONLY IN BOTH DIRECTIONS. The only command it sends is the
 *     `tree-list` script from the frozen catalogue, plus one `ls` and one
 *     `find` used as the ground truth to compare against. None of them writes.
 *  3. It starts no tmux server, opens no session and touches no manifest. It
 *     never reads the operator's own `-L gmux` socket beyond the count
 *     `real-machine.mjs` takes before and after.
 *  4. It writes nothing on the far machine at all. The only writes on this Mac
 *     are the carriage's own run directory under the temporary folder.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT MEASURES, AND THE RULE IS WRITTEN BEFORE THE NUMBERS ARE READ
 * ---------------------------------------------------------------------------
 *  1. `tree-list` at depths 2, 3, 4 and 5 against one real repository over
 *     there, ten runs each, printing the median, the 90th, the answer size in
 *     bytes and the entry count at every depth.
 *
 *     THE RULE, REWRITTEN TWICE IN THE PHASE 90.3 FIX ROUND, WITH THE REASON
 *     FOR EACH REWRITE, BECAUSE THE REASONS ARE THE USEFUL PART.
 *
 *     THE FIRST RULE read: take the LARGEST depth whose median is at or under
 *     1,500 ms and whose answer is at or under 262,144 bytes, and require the
 *     shipped depth to equal it. That rule measured the probe's own list of
 *     depths rather than the folder. On any folder small enough that neither
 *     ceiling binds, every depth qualifies and the largest always wins, so it
 *     would have picked 5 here and 6 if the list had gone to 6. The run on
 *     2026-08-19 is exactly that case: /Users/gdc/.oh-my-zsh on the operator's
 *     Mac Pro holds 1,492 entries and is exhausted by depth 4, depth 5 measured
 *     104.0 ms and 71,660 bytes, and all four depths sat far inside both
 *     ceilings.
 *
 *     THE SECOND RULE read: take the SMALLEST depth carrying at least 95% of
 *     the entries the deepest allowed depth carries, and require the shipped
 *     depth to equal it. It picked 3 on that folder. It then picked 2 on the
 *     next run, because the probe's own auto-find landed on a different folder,
 *     being /Users/gdc/Desktop/Meditations on Tech, which holds 51 entries and
 *     is exhausted at depth 2. Two rules in a row failed the same way: ONE
 *     FOLDER CANNOT PIN ONE NUMBER. A folder shallower than the walk says
 *     nothing about how deep the walk should go.
 *
 *     THE RULE NOW IS A BOUND RATHER THAN A PICK, and it is fixed here rather
 *     than after the table is read. Let ALLOWED be the depths whose median is
 *     at or under 1,500 ms, whose answer is at or under 262,144 bytes and whose
 *     entry count is at or under 4,000. Then:
 *
 *       1. The shipped depth has to be in ALLOWED. A shipped depth outside the
 *          ceilings costs a person a wait, an oversized answer, or a truncated
 *          tree, and this folder is enough to prove that.
 *       2. The shipped depth has to be at or above FLOOR, being the smallest
 *          allowed depth that carries at least 95% of the entries the deepest
 *          allowed depth carries. Below FLOOR the one call for a tab is missing
 *          a real share of the folder and a person pays extra calls to expand
 *          into it.
 *
 *     WHAT THE RULE DELIBERATELY DOES NOT CLAIM. It does not say the shipped
 *     depth is the best one. One folder on one network cannot say that, and the
 *     two rules above pretended otherwise. Too deep is guarded by the ceilings
 *     in rule 1 and by nothing else here.
 *
 *     WHEN THE FOLDER SAYS NOTHING. If every allowed depth carries the same
 *     entry count, the folder was exhausted before the shallowest depth
 *     measured, so FLOOR is the shallowest depth and rule 2 is satisfied by
 *     anything. The probe PRINTS that it learned nothing about depth from this
 *     folder rather than reporting a pass that sounds like a measurement. Point
 *     it at a deeper folder with GMUX_REMOTE_TREE_ROOT to learn more.
 *
 *     A shipped `REMOTE_TREE_DEPTH` outside the bound goes back to the builder
 *     rather than being written off.
 *
 *  2. ONE SUBTREE CALL AGAINST NINE CALLS IN SERIES, reproduced on the day
 *     rather than quoted from research 55. Nine folders under that repository
 *     are listed one call at a time, and then the same nine answers are taken
 *     from one `tree-list`. Both totals are printed.
 *
 *  3. THE PRUNE IS REAL. The listing is searched for a path holding `/.git/`
 *     and the count has to be zero.
 *
 *  4. THE ROWS ARE THAT MACHINE'S OWN ROWS. The entries directly under the
 *     repository root are compared name for name against a plain `ls -A` of the
 *     same folder over the same connection.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES NOT PROVE
 * ---------------------------------------------------------------------------
 * One machine, one repository, one network, on the day it was run. It says
 * nothing about a Linux machine unless the person named one, and it prints the
 * far side's `uname` so the report can say which it was.
 *
 * Every scratch file carries a `p903-` prefix.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  REAL_SOCKET,
  assertReachable,
  closeMaster,
  countOperatorSessions,
  diffSessionLists,
  endRecordedPids,
  gate,
  listFarSessions,
  makeReporter,
  nowMs,
  runOnMachine,
  shellQuoteArgv
} from './real-machine.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { say, step, fail, failures } = makeReporter('p903-tree');

/** The script text, read out of the catalogue rather than retyped here. */
function treeListText() {
  const src = readFileSync(
    join(repoRoot, 'src', 'main', 'machines', 'remote-scripts.ts'),
    'utf8'
  );
  const head = 'const TREE_LIST = [';
  const start = src.indexOf(head);
  const end = src.indexOf("].join('\\n');", start);
  if (start < 0 || end < 0) {
    throw new Error(
      'the catalogue no longer holds a TREE_LIST constant, so this probe is ' +
        'measuring nothing.'
    );
  }
  // eslint-disable-next-line no-eval
  return eval('[' + src.slice(start + head.length, end) + '].join("\\n")');
}

/** The `dir-list` text, for the nine calls in series. */
function dirListText() {
  const src = readFileSync(
    join(repoRoot, 'src', 'main', 'machines', 'remote-scripts.ts'),
    'utf8'
  );
  const head = 'const DIR_LIST = [';
  const start = src.indexOf(head);
  const end = src.indexOf("].join('\\n');", start);
  // eslint-disable-next-line no-eval
  return eval('[' + src.slice(start + head.length, end) + '].join("\\n")');
}

const MARKER = '__TORTIE_RUN__';

/** The payload between the marker pair, or null. The product's own rule. */
function payloadOf(text) {
  const first = text.indexOf(MARKER);
  if (first < 0) return null;
  const second = text.indexOf(MARKER, first + MARKER.length);
  if (second < 0) return null;
  const value = text.slice(first + MARKER.length, second);
  return value.length === 0 ? null : value;
}

/** One command line, composed exactly as `remote-run.ts` composes it. */
function scriptCommand(text, id, args) {
  return shellQuoteArgv(['/bin/sh', '-c', text, `tortie-${id}`, ...args]);
}

const median = (list) => {
  const sorted = [...list].sort((a, b) => a - b);
  const at = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[at]
    : (sorted[at - 1] + sorted[at]) / 2;
};
const percentile = (list, p) => {
  const sorted = [...list].sort((a, b) => a - b);
  const at = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[at];
};

/** The rule, written here so it cannot be adjusted after the table is read. */
const MEDIAN_CEILING_MS = 1_500;
const BYTES_CEILING = 262_144;
/** The listing's own entry cap, being REMOTE_TREE_MAX_ENTRIES. */
const ENTRIES_CEILING = 4_000;
/**
 * How much of the deepest allowed walk a depth has to carry to be enough.
 *
 * 0.95. Above this the extra levels are adding a handful of rows, and one more
 * call is what an expansion past the fetched depth costs anyway.
 */
const COVERAGE = 0.95;
/** Depths measured, shallowest first. The table and the rule both read it. */
const DEPTHS = [2, 3, 4, 5];
const SHIPPED_DEPTH = 3;

const machine = await gate('p903-tree');
const operatorBefore = countOperatorSessions();
const farBefore = listFarSessions(machine, REAL_SOCKET).names;

try {
  assertReachable(machine);

  const uname = runOnMachine(machine, 'uname -s').stdout.trim();
  step(0, 'the far side', `${machine.host} reports ${uname}`);

  // -- which folder to walk -------------------------------------------------
  //
  // The person names it, or the probe asks that machine for the first git
  // folder under its own home directory. Nothing is composed from this Mac's
  // idea of where a home directory is.
  const named = (process.env['GMUX_REMOTE_TREE_ROOT'] ?? '').trim();
  let root = named;
  if (root === '') {
    const found = runOnMachine(
      machine,
      'find "$HOME" -maxdepth 3 -name .git -type d 2>/dev/null | head -n 1'
    ).stdout.trim();
    root = found.replace(/\/\.git$/, '');
  }
  if (root === '' || !root.startsWith('/')) {
    fail(
      'no repository was found on that machine and none was named. Set ' +
        'GMUX_REMOTE_TREE_ROOT to an absolute folder over there.'
    );
    throw new Error('no root');
  }
  const isRepo =
    runOnMachine(
      machine,
      `test -d ${shellQuoteArgv([root + '/.git'])} && echo yes || echo no`
    ).stdout.trim() === 'yes';
  step(
    1,
    'the folder being walked',
    `${root} on ${machine.host}, and it ${isRepo ? 'IS' : 'is NOT'} a git ` +
      `repository`
  );

  const tree = treeListText();
  const dirList = dirListText();

  /** One `tree-list` call, timed, with what came back. */
  const readTree = (depth, cap = 4000) => {
    const command = scriptCommand(tree, 'tree-list', [
      root,
      String(depth),
      String(cap)
    ]);
    const from = nowMs();
    const out = runOnMachine(machine, command, { timeoutMs: 120_000 });
    const took = nowMs() - from;
    const payload = payloadOf(out.both);
    return { took, payload, bytes: out.both.length, code: out.code };
  };

  // -- 2. the depth table ---------------------------------------------------
  const rows = [];
  for (const depth of DEPTHS) {
    const times = [];
    let bytes = 0;
    let entries = 0;
    for (let run = 0; run < 10; run += 1) {
      const one = readTree(depth);
      if (one.payload === null) {
        fail(`depth ${String(depth)} answered nothing usable between markers`);
        break;
      }
      times.push(one.took);
      bytes = one.bytes;
      entries = one.payload.split('\n').length - 1;
    }
    if (times.length === 0) continue;
    rows.push({
      depth,
      p50: median(times),
      p90: percentile(times, 90),
      bytes,
      entries
    });
  }

  say('');
  say('depth  p50 ms  p90 ms   bytes   entries');
  say('-----------------------------------------');
  for (const row of rows) {
    say(
      `${String(row.depth).padEnd(6)} ${row.p50.toFixed(1).padStart(6)} ` +
        `${row.p90.toFixed(1).padStart(7)} ${String(row.bytes).padStart(7)} ` +
        `${String(row.entries).padStart(9)}`
    );
  }
  say('');

  const allowed = rows.filter(
    (row) =>
      row.p50 <= MEDIAN_CEILING_MS &&
      row.bytes <= BYTES_CEILING &&
      row.entries <= ENTRIES_CEILING
  );
  const deepest = allowed[allowed.length - 1] ?? null;
  const enough = deepest === null ? 0 : Math.ceil(deepest.entries * COVERAGE);
  const floor =
    deepest === null
      ? null
      : (allowed.find((row) => row.entries >= enough) ?? deepest).depth;

  // The coverage column, printed so the bound can be checked by eye.
  if (deepest !== null) {
    say('depth  entries  share of the deepest allowed walk');
    say('---------------------------------------------------');
    for (const row of allowed) {
      const share = (row.entries / deepest.entries) * 100;
      say(
        `${String(row.depth).padEnd(6)} ${String(row.entries).padStart(7)}  ` +
          `${share.toFixed(1)}%`
      );
    }
    say('');
  }

  const shippedRow = allowed.find((row) => row.depth === SHIPPED_DEPTH) ?? null;
  step(
    2,
    'the bound the rule sets on the shipped depth',
    deepest === null
      ? 'none, because no depth was inside all three ceilings'
      : `at or above ${String(floor)} and inside the ceilings, which the ` +
        `deepest allowed depth ${String(deepest.depth)} sets. The shipped ` +
        `REMOTE_TREE_DEPTH is ${String(SHIPPED_DEPTH)}`
  );
  if (deepest === null) {
    fail(
      `no depth was at or under ${String(MEDIAN_CEILING_MS)} ms, ` +
        `${String(BYTES_CEILING)} bytes and ${String(ENTRIES_CEILING)} ` +
        `entries, so this folder cannot be read in one call at any depth`
    );
  } else if (shippedRow === null) {
    fail(
      `depth ${String(SHIPPED_DEPTH)} is not inside the ceilings on this ` +
        `folder, so the shipped depth costs a person a wait, an oversized ` +
        `answer or a truncated tree here`
    );
  } else if (floor !== null && SHIPPED_DEPTH < floor) {
    fail(
      `the shipped REMOTE_TREE_DEPTH is ${String(SHIPPED_DEPTH)} and the ` +
        `smallest depth carrying at least ` +
        `${String(Math.round(COVERAGE * 100))}% of this folder is ` +
        `${String(floor)}. One call for a tab is missing a real share of the ` +
        `folder. This goes back to the builder rather than being written off ` +
        `here.`
    );
  }

  // What this folder could and could not say, printed rather than implied.
  const spread =
    deepest === null
      ? 0
      : deepest.entries - (allowed[0]?.entries ?? deepest.entries);
  if (spread === 0) {
    say(
      `the folder holds the same ${String(deepest?.entries ?? 0)} entries at ` +
        `every allowed depth, so it was exhausted before depth ` +
        `${String(DEPTHS[0])} and THIS RUN LEARNED NOTHING ABOUT DEPTH. The ` +
        `ceilings were still checked. Set GMUX_REMOTE_TREE_ROOT to a deeper ` +
        `folder over there to learn more.`
    );
    say('');
  }

  // -- 3. one call against nine in series -----------------------------------
  const one = readTree(SHIPPED_DEPTH);
  const dirs = (one.payload ?? '')
    .split('\n')
    .slice(1)
    .filter((line) => line.endsWith('/'))
    .slice(0, 9)
    .map((line) => line.slice(0, -1));
  if (dirs.length < 2) {
    say(
      'fewer than two folders are under that root, so the series comparison ' +
        'was skipped and the report says so.'
    );
  } else {
    const from = nowMs();
    for (const dir of dirs) {
      runOnMachine(machine, scriptCommand(dirList, 'dir-list', [dir, '500']), {
        timeoutMs: 60_000
      });
    }
    const series = nowMs() - from;
    const subtree = readTree(SHIPPED_DEPTH).took;
    step(
      3,
      'one subtree call against calls in series',
      `${String(dirs.length)} folders cost ${series.toFixed(1)} ms one call at ` +
        `a time, and one tree-list carrying the same answers cost ` +
        `${subtree.toFixed(1)} ms`
    );
  }

  // -- 4. the prune is real -------------------------------------------------
  const gitLines = (one.payload ?? '')
    .split('\n')
    .filter((line) => line.includes('/.git/') || line.endsWith('/.git/'));
  step(
    4,
    'the .git prune',
    `${String(gitLines.length)} line(s) of the answer are inside a .git folder`
  );
  if (gitLines.length !== 0) {
    fail(
      'the listing carried paths inside .git, so a repository\'s internals ' +
        'crossed the link.'
    );
  }

  // -- 5. the rows are that machine's own rows ------------------------------
  const truth = runOnMachine(
    machine,
    `cd ${shellQuoteArgv([root])} && ls -A -p`
  ).stdout
    .split('\n')
    .map((line) => (line.endsWith('/') ? line.slice(0, -1) : line))
    .filter((line) => line.length > 0 && line !== '.git')
    .sort();
  const under = root.endsWith('/') ? root : root + '/';
  const drawn = (one.payload ?? '')
    .split('\n')
    .slice(1)
    .filter((line) => line.startsWith(under))
    .map((line) => (line.endsWith('/') ? line.slice(0, -1) : line))
    .filter((line) => !line.slice(under.length).includes('/'))
    .map((line) => line.slice(under.length))
    .sort();
  const same =
    truth.length === drawn.length && truth.every((one2, at) => one2 === drawn[at]);
  step(
    5,
    'the top level rows against a plain ls of the same folder',
    `${String(drawn.length)} row(s) from tree-list and ${String(truth.length)} ` +
      `from ls, and they are ${same ? 'the same, name for name' : 'DIFFERENT'}`
  );
  if (!same) {
    fail(
      `tree-list drew ${JSON.stringify(drawn.slice(0, 10))} and ls answered ` +
        `${JSON.stringify(truth.slice(0, 10))}`
    );
  }
} finally {
  const farAfter = listFarSessions(machine, REAL_SOCKET).names;
  const drift = diffSessionLists(farBefore, farAfter);
  const drifted =
    drift.lost.length + drift.gained.length + drift.leftBehind.length;
  const operatorAfter = countOperatorSessions();
  say(
    `this Mac's own server held ${String(operatorBefore)} session(s) before ` +
      `and ${String(operatorAfter)} after.`
  );
  say(
    drifted === 0
      ? `${machine.host} holds exactly the sessions it held before.`
      : `${machine.host} DRIFTED: lost ${drift.lost.join(', ')}, gained ` +
        `${drift.gained.join(', ')}, left behind ${drift.leftBehind.join(', ')}`
  );
  if (operatorAfter !== operatorBefore || drifted > 0) {
    fail('a session count moved during a probe that opens no session');
  }
  closeMaster(machine);
  endRecordedPids(machine);
}

if (failures.length > 0) {
  process.stdout.write(`[p903-tree] FAIL, ${String(failures.length)}\n`);
  process.exit(1);
}
process.stdout.write('[p903-tree] PASS\n');
