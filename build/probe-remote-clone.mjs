/**
 * `npm run probe:remoteclone`. The two Phase 90.2 scripts, run against a real
 * second machine, and the measurement that chooses how deep the walk looks.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT IS FOR
 * ---------------------------------------------------------------------------
 * Phase 90.2 added one read and one write to the frozen catalogue in
 * `src/main/machines/remote-scripts.ts`. `repo-find` walks a machine's own home
 * directory once and prints every git folder under it with its origin address.
 * `git-clone` puts a project into a folder that is not there yet, and it is the
 * SECOND write this product can make on another computer.
 *
 * Unit tests read the text of both. `GMUX_SMOKE=remote-sessions` runs both
 * against a loopback scratch machine, whose far side is this same Mac. Neither
 * of those is a second computer. This probe is.
 *
 * ---------------------------------------------------------------------------
 * TWO MODES
 * ---------------------------------------------------------------------------
 * `--measure` runs `repo-find` at maxdepth 2, 3, 4 and 5, three runs each, and
 * prints the p50, the p90, the answer size and the folder count for each. It
 * then names the depth the decision rule picks. IT WRITES NOTHING ANYWHERE.
 *
 * With no flag it runs the measurement and then drives the copy: a destination
 * that is already there, an address nobody can reach, a copy that can be made,
 * and the same copy again. Every path it writes is under
 * `/tmp/tortie-p902-<runid>/` on the far machine and nowhere else.
 *
 * ---------------------------------------------------------------------------
 * THE DECISION RULE, WRITTEN BEFORE ANY NUMBER WAS SEEN
 * ---------------------------------------------------------------------------
 * Take the LARGEST depth whose p50 is at or under 1,500 ms and whose answer is
 * at or under 32,768 bytes. If no depth qualifies, the rule picks 2 and says so.
 * The constant in the product is `REMOTE_REPO_FIND_DEPTH` in
 * `src/main/machines/project-counterpart.ts`.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES, AND THEY OUTRANK EVERY NUMBER HERE
 * ---------------------------------------------------------------------------
 *  1. `build/real-machine.mjs` asks its five refusals before anything is
 *     contacted. Two environment variables must agree, `CI` must be unset, the
 *     socket must not be a real one, and the host must not be loopback.
 *  2. THIS PROBE CREATES NO SESSION, on either computer. It runs commands on
 *     the far machine's login shell and nothing else. The far machine's session
 *     list is read before and after anyway, and a difference is a failure.
 *  3. The operator's own server on this Mac is counted before and after with
 *     `list-sessions`, read only.
 *  4. EVERY PATH IT WRITES ON THE FAR MACHINE IS UNDER
 *     `/tmp/tortie-p902-<runid>/`. {@link assertScratchPath} refuses anything
 *     else, and the removal at the end goes through it.
 *  5. The removal is this probe's OWN command over its own connection. THE
 *     PRODUCT'S CATALOGUE GAINS NO SCRIPT THAT CAN REMOVE ANYTHING, and Tortie
 *     itself never removes anything on a machine.
 *  6. No `pkill`, no `kill-server`, and nothing under `/Users` or `~/.ssh` on
 *     either computer is written.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT CANNOT SHOW
 * ---------------------------------------------------------------------------
 * It holds no manifest, starts no Electron and draws no sheet. It cannot show
 * that the create sheet fills the Directory field, that the confirm asks before
 * it copies, or that Escape is refused while a copy runs. Those are the live
 * app runs the phase's verification plan names.
 */

import { spawnSync } from 'node:child_process';
import {
  assertReachable,
  closeMaster,
  countOperatorSessions,
  diffSessionLists,
  gate,
  hostKeyFileFacts,
  identityFilesLine,
  identityFilesUnmoved,
  listFarSessions,
  makeReporter,
  nowMs,
  quoteArg,
  REAL_SOCKET,
  runOnMachine,
  shellQuoteArgv
} from './real-machine.mjs';

const TAG = 'p902-clone';
const { say, fail, step, failures } = makeReporter(TAG);

/** Every path this run may write on the far machine begins with this. */
const SCRATCH_PREFIX = '/tmp/tortie-p902-';

const MEASURE_ONLY = process.argv.includes('--measure');

/** The decision rule's two limits, written before any number was seen. */
const DEPTH_P50_LIMIT_MS = 1_500;
const DEPTH_BYTES_LIMIT = 32_768;
const DEPTHS = [2, 3, 4, 5];
const RUNS_PER_DEPTH = 3;

/** How many git folders one answer may carry, matching the product constant. */
const REPO_FIND_MAX = 200;

// ---------------------------------------------------------------------------
// The script texts, taken from the product rather than copied
// ---------------------------------------------------------------------------

/**
 * The catalogue, read out of the product's own module.
 *
 * `build/machines-conformance-probe.mts` already imports it and prints every
 * script's text as JSON. Reading it from there is what keeps this probe honest:
 * a copy of a script text in this file could drift from the one the product
 * sends, and then every number below would be about the copy.
 */
function catalogue() {
  const out = spawnSync(
    'npx',
    [
      'tsx',
      '--tsconfig',
      'tsconfig.node.json',
      'build/machines-conformance-probe.mts'
    ],
    { encoding: 'utf8', cwd: process.cwd(), maxBuffer: 32 * 1024 * 1024 }
  );
  if (out.status !== 0) {
    process.stderr.write(out.stderr || 'the catalogue probe did not run\n');
    process.exit(1);
  }
  const data = JSON.parse(out.stdout);
  const rows = data.remoteRun?.scripts ?? [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const id of ['repo-find', 'git-clone']) {
    if (!byId.has(id)) {
      process.stderr.write(`the catalogue holds no script called ${id}\n`);
      process.exit(1);
    }
  }
  return byId;
}

const SCRIPTS = catalogue();
const MARKER = '__TORTIE_RUN__';

/**
 * Run one catalogue script on the far machine, the way the product sends it.
 *
 * ONE QUOTED ARGUMENT, composed by the same `shellQuoteArgv` the product uses,
 * with the script text as one element and every value as its own element. No
 * value is ever part of the script text.
 */
function runScript(machine, id, args, timeoutMs = 60_000) {
  const script = SCRIPTS.get(id);
  const command = shellQuoteArgv([
    '/bin/sh',
    '-c',
    script.text,
    `tortie-${id}`,
    ...args
  ]);
  const from = nowMs();
  const out = runOnMachine(machine, command, { timeoutMs });
  const tookMs = nowMs() - from;
  const at = out.stdout.indexOf(MARKER);
  const to = out.stdout.lastIndexOf(MARKER);
  const payload =
    at >= 0 && to > at ? out.stdout.slice(at + MARKER.length, to) : null;
  return { out, payload, tookMs, bytes: out.stdout.length };
}

/** The middle value of a list of numbers, and the value nine tenths in. */
function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round((sorted.length - 1) * fraction))
  );
  return sorted[at];
}

/** Refuse any path this run is not allowed to touch. */
function assertScratchPath(path, verb) {
  if (typeof path === 'string' && path.startsWith(SCRATCH_PREFIX)) return path;
  fail(
    `refused to ${verb} ${JSON.stringify(path)}. Every path this probe writes ` +
      `or removes on that machine begins ${SCRATCH_PREFIX}, and nothing else ` +
      `is ever offered to it.`
  );
  throw new Error(`refused to ${verb} ${String(path)}`);
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const machine = await gate(TAG);
const runId = `${String(process.pid)}-${String(Date.now()).slice(-6)}`;
const scratch = `${SCRATCH_PREFIX}${runId}`;

say(`the machine is ${machine.host}, resolved to ${machine.addresses.join(', ')}`);
say(`every path this run writes over there is under ${scratch}`);
say(MEASURE_ONLY ? 'mode: --measure, which writes nothing at all' : 'mode: the full drive');

const identityBefore = hostKeyFileFacts();
const operatorBefore = countOperatorSessions();
step(0, "the operator's server on this Mac, before", `${operatorBefore} session(s)`);

const reachable = assertReachable(machine);
say(`the connection signed in, exit ${String(reachable.code)}`);

const farBefore = listFarSessions(machine, REAL_SOCKET);
step(
  1,
  "the far machine's sessions, before",
  farBefore.names.length === 0
    ? 'no session'
    : `${String(farBefore.names.length)}: ${farBefore.names.join(', ')}`
);

// ===========================================================================
// The measurement. It writes nothing.
// ===========================================================================

process.stdout.write(`\n[${TAG}] the walk, at four depths, three runs each\n`);
const measured = [];
for (const depth of DEPTHS) {
  const times = [];
  let bytes = 0;
  let folders = 0;
  let ok = true;
  for (let run = 0; run < RUNS_PER_DEPTH; run += 1) {
    const answer = runScript(machine, 'repo-find', ['', String(depth), String(REPO_FIND_MAX)], 120_000);
    if (answer.payload === null) {
      ok = false;
      break;
    }
    times.push(answer.tookMs);
    bytes = Math.max(bytes, answer.payload.length);
    folders =
      answer.payload === 'none' ? 0 : answer.payload.split('\n').filter((one) => one.length > 0).length;
  }
  if (!ok) {
    fail(`the walk at maxdepth ${String(depth)} printed nothing usable`);
    continue;
  }
  measured.push({
    depth,
    p50: percentile(times, 0.5),
    p90: percentile(times, 0.9),
    bytes,
    folders
  });
}

process.stdout.write('| maxdepth | p50 ms | p90 ms | answer bytes | git folders |\n');
process.stdout.write('| --- | --- | --- | --- | --- |\n');
for (const row of measured) {
  process.stdout.write(
    `| ${String(row.depth)} | ${String(row.p50)} | ${String(row.p90)} | ` +
      `${String(row.bytes)} | ${String(row.folders)} |\n`
  );
}

const qualifying = measured.filter(
  (row) => row.p50 <= DEPTH_P50_LIMIT_MS && row.bytes <= DEPTH_BYTES_LIMIT
);
const picked = qualifying.length === 0 ? 2 : Math.max(...qualifying.map((row) => row.depth));
say(
  qualifying.length === 0
    ? `no depth met the rule, being a p50 at or under ${String(DEPTH_P50_LIMIT_MS)} ms ` +
        `and an answer at or under ${String(DEPTH_BYTES_LIMIT)} bytes. The rule picks 2.`
    : `the rule picks maxdepth ${String(picked)}, being the largest whose p50 is at or ` +
        `under ${String(DEPTH_P50_LIMIT_MS)} ms and whose answer is at or under ` +
        `${String(DEPTH_BYTES_LIMIT)} bytes. Set REMOTE_REPO_FIND_DEPTH to it, or say ` +
        `in the phase report why not.`
);

if (MEASURE_ONLY) {
  const identityAfterMeasure = hostKeyFileFacts();
  if (!identityFilesUnmoved(identityBefore, identityAfterMeasure)) {
    fail('an identity record file changed during this run');
  }
  const operatorAfterMeasure = countOperatorSessions();
  if (operatorAfterMeasure !== operatorBefore) {
    fail(
      `the operator's own server held ${operatorBefore} session(s) before and ` +
        `${operatorAfterMeasure} after`
    );
  }
  say(`identity record files: ${identityFilesLine(identityAfterMeasure)}`);
  closeMaster(machine);
  if (failures.length > 0) {
    process.stdout.write(`[${TAG}] FAILED with ${String(failures.length)} problem(s)\n`);
    for (const one of failures) process.stdout.write(`[${TAG}]   ${one}\n`);
    process.exit(1);
  }
  process.stdout.write(`[${TAG}] PASS. Nothing was written on either computer.\n`);
  process.exit(0);
}

// ===========================================================================
// The copy. Every path is under the scratch prefix.
// ===========================================================================

const bare = assertScratchPath(`${scratch}/bare.git`, 'make');
const seed = assertScratchPath(`${scratch}/seed`, 'make');
const taken = assertScratchPath(`${scratch}/taken`, 'make');
const dest = assertScratchPath(`${scratch}/copied`, 'write');
const nowhere = assertScratchPath(`${scratch}/nowhere`, 'write');
const takenFile = assertScratchPath(`${taken}/mine.txt`, 'write');

/** One command of this probe's own, over its own connection. */
function farShell(command, timeoutMs = 120_000) {
  return runOnMachine(machine, command, { timeoutMs });
}

process.stdout.write(`\n[${TAG}] the copy, against ${machine.host}\n`);

// A repository to copy FROM, made by this probe under its own prefix. It is
// not a product script and it is not the product's catalogue.
const setup = farShell(
  `set -e; mkdir -p ${quoteArg(seed)}; cd ${quoteArg(seed)}; ` +
    `git init -q .; git -c user.email=p902@tortie.test -c user.name=p902 ` +
    `commit -q --allow-empty -m one; git init -q --bare ${quoteArg(bare)}; ` +
    `git push -q ${quoteArg(bare)} HEAD:refs/heads/main; ` +
    `mkdir -p ${quoteArg(taken)}; printf 'do not touch\\n' > ${quoteArg(takenFile)}; ` +
    `wc -c < ${quoteArg(takenFile)} | tr -d ' '`
);
if (setup.code !== 0) {
  fail(`the scratch repository could not be made over there: ${setup.both.trim()}`);
}
const takenBytesBefore = setup.stdout.trim();
step(2, 'a scratch repository and a folder that is already taken', `${bare}, ${taken}`);

// 3. A destination that is already there is never opened.
const existsRun = runScript(machine, 'git-clone', [bare, taken], 120_000);
const existsWord = (existsRun.payload ?? '').split(' ')[0];
if (existsWord !== 'exists') {
  fail(`the copy into ${taken} answered ${JSON.stringify(existsWord)} rather than exists`);
}
const takenAfter = farShell(
  `wc -c < ${quoteArg(takenFile)} | tr -d ' '; ls -A ${quoteArg(taken)} | wc -l | tr -d ' '`
);
step(
  3,
  'a destination that is already there',
  `${existsWord}, and the file in it was ${takenBytesBefore} bytes before and ` +
    `${takenAfter.stdout.trim().split('\n')[0]} bytes after`
);

// 4. An address nobody can reach writes nothing, and does not wait for a
//    password. The repository name below does not exist under any account.
const unreachableFrom = nowMs();
const unreachableRun = runScript(
  machine,
  'git-clone',
  ['https://github.com/gregce/no-such-repository-p902.git', nowhere],
  120_000
);
const unreachableMs = nowMs() - unreachableFrom;
const unreachableWord = (unreachableRun.payload ?? '').split(' ')[0];
if (unreachableWord !== 'unreachable') {
  fail(
    `a copy from an address nobody can reach answered ` +
      `${JSON.stringify(unreachableWord)} rather than unreachable`
  );
}
const nowhereThere = farShell(`test -e ${quoteArg(nowhere)} && echo there || echo gone`);
if (nowhereThere.stdout.trim() !== 'gone') {
  fail(`the refused copy created ${nowhere}`);
}
step(
  4,
  'an address nobody can reach',
  `${unreachableWord} in ${String(unreachableMs)} ms, and ${nowhere} is ` +
    `${nowhereThere.stdout.trim()}`
);

// 5. A copy that can be made is made.
const clonedRun = runScript(machine, 'git-clone', [bare, dest], 600_000);
const clonedWord = (clonedRun.payload ?? '').split(' ')[0];
if (clonedWord !== 'cloned') {
  fail(`the copy answered ${JSON.stringify(clonedWord)} rather than cloned`);
}
const destThere = farShell(
  `test -d ${quoteArg(`${dest}/.git`)} && echo there || echo gone`
);
if (destThere.stdout.trim() !== 'there') {
  fail(`the copy said cloned and there is no repository at ${dest}`);
}
step(5, 'a copy that can be made', `${clonedWord} in ${String(clonedRun.tookMs)} ms, ${dest} holds a repository`);

// 6. The same copy again is the same folder, and the read at the destination
//    is what turns that answer into existsSame in the product.
const againRun = runScript(machine, 'git-clone', [bare, dest], 120_000);
const againWord = (againRun.payload ?? '').split(' ')[0];
if (againWord !== 'exists') {
  fail(`the second copy answered ${JSON.stringify(againWord)} rather than exists`);
}
const atDest = runScript(machine, 'repo-find', [dest, '1', '5'], 60_000);
const atDestRows = (atDest.payload ?? '') === 'none' ? [] : (atDest.payload ?? '').split('\n');
const sawOrigin = atDestRows.some((line) => {
  const encoded = line.split(' ')[0] ?? '';
  try {
    return Buffer.from(encoded, 'base64').toString('utf8') === bare;
  } catch {
    return false;
  }
});
if (!sawOrigin) {
  fail(
    `the read at ${dest} did not recognise the folder this run made, so a ` +
      `retry after a lost answer would be reported as a refusal`
  );
}
step(
  6,
  'the same copy again',
  `${againWord}, and one read at that folder found its origin, which is what ` +
    `the product turns into existsSame`
);

// 7. The cleanup, by exact path, through the guard.
let guardRefused = false;
try {
  assertScratchPath('/Users/gdc', 'remove');
} catch {
  guardRefused = true;
  // The guard also records a failure, and this is the one place that is
  // expected. It is taken back out below.
  failures.pop();
}
const listedBefore = farShell(`ls -A ${quoteArg(scratch)} | wc -l | tr -d ' '`);
const removed = farShell(`rm -rf ${quoteArg(assertScratchPath(scratch, 'remove'))}`);
const listedAfter = farShell(`test -e ${quoteArg(scratch)} && echo there || echo gone`);
if (removed.code !== 0 || listedAfter.stdout.trim() !== 'gone') {
  fail(`the scratch folder ${scratch} is still on that machine`);
}
step(
  7,
  'the cleanup, by exact path',
  `${scratch} held ${listedBefore.stdout.trim()} entries and is now ` +
    `${listedAfter.stdout.trim()}. The guard refused /Users/gdc: ` +
    `${guardRefused ? 'yes' : 'NO'}`
);
if (!guardRefused) {
  fail('the cleanup guard accepted a path outside the scratch prefix');
}

// ===========================================================================
// What has to be true after everything
// ===========================================================================

const farAfter = listFarSessions(machine, REAL_SOCKET);
const drift = diffSessionLists(farBefore.names, farAfter.names);
if (drift.lost.length > 0 || drift.gained.length > 0 || drift.leftBehind.length > 0) {
  fail(
    `the far machine's session list moved. Lost ${drift.lost.join(', ') || 'none'}, ` +
      `gained ${drift.gained.join(', ') || 'none'}, left behind ` +
      `${drift.leftBehind.join(', ') || 'none'}. This probe creates no session.`
  );
}
step(
  8,
  "the far machine's sessions, after",
  `${String(farAfter.names.length)}, and this probe created none`
);

const operatorAfter = countOperatorSessions();
if (operatorAfter !== operatorBefore) {
  fail(
    `the operator's own server held ${operatorBefore} session(s) before and ` +
      `${operatorAfter} after`
  );
}
step(9, "the operator's server on this Mac, after", `${operatorAfter} session(s)`);

const identityAfter = hostKeyFileFacts();
if (!identityFilesUnmoved(identityBefore, identityAfter)) {
  fail('an identity record file changed during this run');
}
say(`identity record files: ${identityFilesLine(identityAfter)}`);

closeMaster(machine);

if (failures.length > 0) {
  process.stdout.write(`[${TAG}] FAILED with ${String(failures.length)} problem(s)\n`);
  for (const one of failures) process.stdout.write(`[${TAG}]   ${one}\n`);
  process.exit(1);
}
process.stdout.write(
  `[${TAG}] PASS. Everything this run wrote on ${machine.host} was under ` +
    `${scratch}, and it is gone.\n`
);
