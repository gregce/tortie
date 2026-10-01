#!/usr/bin/env node
/**
 * `npm run ablation:p326`. THE ATTACK ON PHASE 326'S OWN CLAUSES
 * (build/p326/SPEC.md §7, the Phase 326 entry in docs/BACKLOG.md).
 *
 * About a minute. It launches no Electron, starts no tmux server, no ssh, no
 * agent, makes no request and spends no token. It starts nothing but `cp`,
 * `node` running build/conformance-farattach.mjs, and `node` running vitest,
 * each through `spawnSync`, and it reads nothing under the person's home.
 *
 * ## Why it exists
 *
 * `conformance:farattach` reads eleven rules out of the source. A rule that
 * reads green over the shipping tree has proved nothing until it has been seen
 * to go red when the clause it owns is taken away. So this script takes each
 * clause away, one at a time, from the SHIPPING source, and requires THE RULE
 * THAT OWNS IT red and every other rule exactly as the unedited control read
 * it. For four arms (the pass's `$-id` skip, the deferral put back, the
 * flights judged by the parse instant, and the far attach's liveness check
 * after its last await) it also runs the p326 vitest file that drives that
 * behaviour and requires it red, so the behaviour tests are proved able to
 * fail, not only the text rules.
 *
 * ## It never writes into the working tree
 *
 * Three builders work in one worktree during a phase, and a harness that
 * writes into `src/` even for the milliseconds a gate takes can lose another
 * builder's edit. So it builds a CLONE, `build/p321/ablation.mjs`'s shape:
 * `cp -Rc` (APFS clonefile) of `src/` under `/private/tmp/p326-ablation-<pid>-…`,
 * `build/assert-bundle-refusals.mjs` copied because rule FA10 reads it,
 * `package.json`, `vitest.config.ts` and every tsconfig copied, `node_modules`
 * symlinked. The gate is THIS worktree's `build/conformance-farattach.mjs`,
 * pointed at the clone with `--root`. Each edited clone file is put back and
 * CHECKED BY SHA256 against the worktree's bytes in a `finally` before the next
 * arm; the clone is removed in a `finally` and on SIGINT, SIGTERM and SIGHUP;
 * and the run ends by asserting that the worktree's own bytes never moved.
 *
 * ## The rules each arm is held to
 *
 *   - Its needle matches the shipping source EXACTLY ONCE. Zero means the
 *     clause moved and this arm moves with it in the same commit; two means an
 *     edit could land on the wrong occurrence and prove nothing. Either FAILS
 *     by name; an arm never skips.
 *   - Every rule it names as an OWNER goes red; every other rule reads what the
 *     unedited control read.
 *   - Where it names a vitest file, that file has at least one red row, where
 *     the unedited control ran it all green.
 *   - An UNEDITED CONTROL is green first (gate and the three vitest files), and
 *     the gate is green again at the end.
 *
 * Usage:
 *   node build/p326/ablation.mjs
 *   P326_ONLY=A4,A13 node build/p326/ablation.mjs       named arms only
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeOf } from '../scan-source.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATE = join(REPO, 'build', 'conformance-farattach.mjs');
const TAG = '[ablation:p326]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

const CORE = 'src/main/sessions/core.ts';
const FAR = 'src/main/sessions/far-attach.ts';
const REMOTE = 'src/main/machines/remote-sessions.ts';
const INFLIGHT = 'src/main/machines/create-inflight.ts';

const INFLIGHT_TEST = 'src/main/machines/__tests__/p326-inflight-create.test.ts';
const FAR_TEST = 'src/main/sessions/__tests__/p326-far-attach.test.ts';
const UNBOUND_TEST = 'src/main/sessions/__tests__/p326-attach-far-unbound.test.ts';
const TESTS = [INFLIGHT_TEST, FAR_TEST, UNBOUND_TEST];

// ---------------------------------------------------------------------------
// The edits. Each answers the edited text, or throws a sentence naming why its
// needle did not match exactly once.
// ---------------------------------------------------------------------------

const count = (text, needle) => (typeof needle === 'string' ? text.split(needle).length - 1 : [...text.matchAll(new RegExp(needle.source, needle.flags.includes('g') ? needle.flags : `${needle.flags}g`))].length);

function once(text, needle) {
  const n = count(text, needle);
  if (n !== 1) throw new Error(`its needle ${JSON.stringify(String(needle)).slice(0, 90)} matches ${String(n)} times, not exactly once`);
}

/** Replace the one match of `needle` with `to`. */
const replace = (needle, to) => (text) => {
  once(text, needle);
  return text.replace(needle, () => to);
};

/** Remove the one match of `needle`. */
const remove = (needle) => replace(needle, '');

/** Take the one match of `needle` out, and put it back after the one match of `after`. */
const move = (needle, after) => (text) => {
  once(text, needle);
  const m = typeof needle === 'string' ? needle : text.match(needle)[0];
  const without = text.replace(needle, () => '');
  once(without, after);
  const a = typeof after === 'string' ? after : without.match(after)[0];
  const at = without.indexOf(a) + a.length;
  return `${without.slice(0, at)}\n${m.replace(/\n$/, '')}\n${without.slice(at)}`;
};

/** Remove the whole `if (…) { … }` statement whose header is the one match of `head`. */
const removeIf = (head) => (text) => {
  once(text, head);
  const at = text.indexOf(head);
  const paren = text.indexOf('(', at);
  const close = closeOf(text, paren);
  if (close === -1) throw new Error(`the condition after ${JSON.stringify(head)} does not close`);
  let i = close + 1;
  while (/\s/.test(text[i])) i += 1;
  let end;
  if (text[i] === '{') {
    end = closeOf(text, i);
    if (end === -1) throw new Error(`the block after ${JSON.stringify(head)} does not close`);
  } else {
    end = text.indexOf(';', i);
  }
  return `${text.slice(0, at)}${text.slice(end + 1)}`;
};

/** Insert `what` before the one match of `before`. */
const insertBefore = (before, what) => (text) => {
  once(text, before);
  const at = text.indexOf(before);
  return `${text.slice(0, at)}${what}${text.slice(at)}`;
};

/** Apply `edit` only inside the region from the one match of `start` to the next `end` after it. */
const within = (start, end, edit) => (text) => {
  once(text, start);
  const from = text.indexOf(start);
  const to = text.indexOf(end, from + start.length);
  if (to === -1) throw new Error(`nothing ends the region that ${JSON.stringify(start)} opens`);
  return `${text.slice(0, from)}${edit(text.slice(from, to))}${text.slice(to)}`;
};

// ---------------------------------------------------------------------------
// The arms, SPEC §7's list first and in its order, then five of this file's own
// ---------------------------------------------------------------------------

export const ARMS = [
  {
    n: 'A1',
    name: 'the flight registered after writeRemoteRow',
    file: REMOTE,
    owners: ['FA5'],
    edit: move(/^[ \t]*const flight = beginRemoteCreate\(sessionId, input\.machineId\);\n/m, /writeRemoteRow\(\{[\s\S]*?\n {4}\}\);/)
  },
  {
    n: 'A2',
    name: 'the finally that ends the flight removed',
    file: REMOTE,
    owners: ['FA5'],
    edit: replace(/\}\s*finally\s*\{\s*flight\.end\(\);?\s*\}/, '}')
  },
  {
    n: 'A3',
    name: '.answered( removed, so the flight never learns its $-id',
    file: REMOTE,
    owners: ['FA5'],
    edit: remove(/^[ \t]*flight\.answered\([^\n]*\n/m)
  },
  {
    n: 'A4',
    name: 'the pass skip tests parsed.tmuxName, deciding by name',
    file: REMOTE,
    owners: ['FA6'],
    tests: [INFLIGHT_TEST],
    edit: replace('flights.beingBound.has(parsed.tmuxId)', 'flights.beingBound.has(parsed.tmuxName)')
  },
  {
    n: 'A5',
    name: 'the pass skip adds the row to seen, so an unstamped session could be shown',
    file: REMOTE,
    owners: ['FA6'],
    edit: replace('if (flights.beingBound.has(parsed.tmuxId)) continue;', 'if (flights.beingBound.has(parsed.tmuxId)) { seen.set(parsed.tmuxId, parsed as never); continue; }')
  },
  {
    n: 'A6',
    name: 'the deferral put back: a never-probed row held back while a create on the machine awaits its answer',
    file: REMOTE,
    owners: ['FA6'],
    // THE FIX ROUND removed this arm from the shipping source, because it held
    // back the rescue of another lost-answer session of this run (worse than
    // the parent). Putting it back must turn FA6 red AND the behaviour tests
    // that pin the parent's handling, the tie among them.
    tests: [INFLIGHT_TEST],
    edit: within(
      'async function onePass(',
      '\nasync function ',
      insertBefore(
        '      foreign += 1;\n',
        '      if (flights.beingBound.size === 0 && issuedRemoteIdsFor(machineId).some((one) => flights.owns(one.id)) && rescueNeeded(parsed, foreignRemoteIds(machineId))) continue;\n'
      )
    )
  },
  {
    n: 'A7',
    name: 'rescuePending reads more than unclaimed, as the build did',
    file: REMOTE,
    owners: ['FA6'],
    edit: replace('const rescuePending = unclaimed.length > 0;', 'const rescuePending = unclaimed.length > 0 || flights.beingBound.size > 0;')
  },
  {
    n: 'A8',
    name: 'the write-back skip removed, so a pass writes restorable over a running create',
    file: REMOTE,
    owners: ['FA7'],
    edit: remove(/^[ \t]*if \(pass\.flights\.owns\(record\.id\)\) continue;\n/m)
  },
  {
    n: 'A9',
    name: 'the drop skip removed, so a pass forgets a running create',
    file: REMOTE,
    owners: ['FA7'],
    edit: remove(/^[ \t]*if \(flights\.owns\(one\.id\)\) continue;\n/m)
  },
  {
    n: 'A10',
    name: "remoteRecordStatus's in-flight arm removed",
    file: REMOTE,
    owners: ['FA7'],
    edit: remove(/^[ \t]*if \(remoteCreateInFlight\(sessionId\)\) return 'unknown';\n/m)
  },
  {
    n: 'A11',
    name: 'the far branch removed from attachSessionAdmitted, so a far record reaches this Mac\'s list',
    file: CORE,
    owners: ['FA1'],
    edit: removeIf('if (far !== null && isRemoteRecord(far))')
  },
  {
    n: 'A12',
    name: 'the ticket taken after the first await',
    file: CORE,
    owners: ['FA2'],
    edit: move(/^[ \t]*const ticket = this\.attachTickets\.take\(sessionId\);\n/m, 'const live = await tmux.listSessions();')
  },
  {
    n: 'A13',
    name: 'the liveness check removed before attachListedRemote, so a waited attach spawns for a pane that has gone',
    file: CORE,
    owners: ['FA3'],
    tests: [UNBOUND_TEST],
    edit: remove(/^[ \t]*if \(!this\.attachStillWanted\([^)]*\)\) return;\n/m)
  },
  {
    n: 'A14',
    name: 'invalidate removed from detachSession',
    file: CORE,
    owners: ['FA2'],
    edit: remove(/^[ \t]*this\.attachTickets\.invalidate\(sessionId\);\n/m)
  },
  {
    n: 'A15',
    name: 'shutdown removed from beginShutdown',
    file: CORE,
    owners: ['FA2'],
    edit: remove(/^[ \t]*this\.attachTickets\.shutdown\(\);\n/m)
  },
  {
    n: 'A16',
    name: 'a second copy of the remote attach',
    file: CORE,
    owners: ['FA4'],
    edit: insertBefore(
      '\n  detachSession(sessionId: string): void {\n',
      '\n  private p326SecondCopy(sessionId: string, remote: RemoteSessionRow, sender: WebContents): void {\n' +
        '    const machine: RemoteMachineContext = readyRemoteContext(remote.machineId);\n' +
        '    this.attachHost.attach({ sessionId, tmuxName: remote.tmuxId, sender, machine });\n  }\n'
    )
  },
  {
    n: 'A17',
    name: 'a new method deciding remote-ness from the feed maps alone',
    file: CORE,
    owners: ['FA8'],
    edit: insertBefore(
      '\n  detachSession(sessionId: string): void {\n',
      '\n  private p326FeedOnly(sessionId: string): boolean {\n    return isRemoteSessionId(sessionId) && remoteSessionRow(sessionId) !== null;\n  }\n'
    )
  },
  {
    n: 'A18',
    name: 'the bound set to 12,000, past the quit join',
    file: FAR,
    owners: ['FA9'],
    edit: replace(/export const REMOTE_ATTACH_BIND_WAIT_MS = [0-9_]+;/, 'export const REMOTE_ATTACH_BIND_WAIT_MS = 12_000;')
  },
  {
    n: 'A19',
    name: 'the new sentence thrown as SESSION_NOT_FOUND, with no Try again',
    file: FAR,
    owners: ['FA10'],
    edit: replace("gmuxError('TMUX_UNREACHABLE', ATTACH_NOT_HEARD", "gmuxError('SESSION_NOT_FOUND', ATTACH_NOT_HEARD")
  },
  {
    n: 'A20',
    name: 'create-inflight.ts given a runtime import, which could close a cycle',
    file: INFLIGHT,
    owners: ['FA11'],
    edit: (text) => `import { getLog } from '../log';\n${text}`
  },
  {
    n: 'A21',
    name: "far-attach.ts importing this Mac's tmux layer",
    file: FAR,
    owners: ['FA1'],
    edit: insertBefore("import { gmuxError, type GmuxError } from '../errors';", "import { listSessions as p326Local } from '../tmux';\n")
  },
  {
    n: 'A22',
    name: 'the flights read before the list answered, so an answer that arrived while the list was out is not seen',
    file: REMOTE,
    owners: ['FA6'],
    edit: within('async function onePass(', '\nasync function ', move(/^[ \t]*const flights = remoteCreateFlightsFor\([\s\S]*?\);\n/m, 'const snapshotAt = Date.now();'))
  },
  {
    n: 'A23',
    name: 'attachStillWanted no longer reads disposed',
    file: CORE,
    owners: ['FA3'],
    edit: within('private attachStillWanted(', '\n  }\n', replace(/\s*&&\s*this\.disposed !== true/, ''))
  },
  {
    n: 'A24',
    name: 'the ticket holder made a plain field, which an Object.create seam object never runs',
    file: CORE,
    owners: ['FA2'],
    edit: replace('private attachTicketsSlot: AttachTickets | null = null;', 'private attachTicketsField = new AttachTickets();')
  },
  {
    // THE FIX ROUND, from the attack verifier's X5: with the flights judged by
    // the PARSE instant, every p326 vitest row stayed green and only FA6 went
    // red, although a list issued before a create ended and parsed after it
    // counts, probes and writes over that create. The inflight file now drives
    // that clock, and this arm proves it can fail.
    n: 'A25',
    name: 'the flights judged by when the list was parsed, not when it was issued',
    file: REMOTE,
    owners: ['FA6'],
    tests: [INFLIGHT_TEST],
    edit: within('async function onePass(', '\nasync function ', replace(/remoteCreateFlightsFor\(\s*machineId,\s*snapshotAt,/, 'remoteCreateFlightsFor(\n    machineId,\n    Date.now(),'))
  }
];

// ---------------------------------------------------------------------------
// The clone, the gate and vitest inside it
// ---------------------------------------------------------------------------

let scratch = null;

function buildClone() {
  scratch = mkdtempSync(join('/private/tmp', `p326-ablation-${String(process.pid)}-`));
  const r = spawnSync('cp', ['-Rc', join(REPO, 'src'), join(scratch, 'src')], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`cp -Rc src failed: ${r.stderr}`);
  mkdirSync(join(scratch, 'build'), { recursive: true });
  writeFileSync(join(scratch, 'build', 'assert-bundle-refusals.mjs'), readFileSync(join(REPO, 'build', 'assert-bundle-refusals.mjs')));
  const configs = ['package.json', 'vitest.config.ts', ...readdirSync(REPO).filter((f) => /^tsconfig(\.[a-z]+)?\.json$/.test(f))];
  for (const name of configs) writeFileSync(join(scratch, name), readFileSync(join(REPO, name)));
  symlinkSync(join(REPO, 'node_modules'), join(scratch, 'node_modules'));
}

/** The gate over the clone: `{ rule: [problems] }`, or null when it printed nothing readable. */
function runGate() {
  const r = spawnSync(process.execPath, [GATE, '--root', scratch, '--json'], { encoding: 'utf8', timeout: 60_000, maxBuffer: 16 * 1024 * 1024 });
  const line = (r.stdout ?? '').trim().split('\n').pop() ?? '';
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

/** Run the named test files in the clone; answer every failed row by full name. */
function runTests(files) {
  const out = join(scratch, `vitest-${String(Date.now())}.json`);
  const r = spawnSync(
    process.execPath,
    [join('node_modules', 'vitest', 'vitest.mjs'), 'run', '--no-cache', '--reporter=json', `--outputFile=${out}`, ...files],
    { cwd: scratch, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300_000 }
  );
  let report = null;
  try {
    report = JSON.parse(readFileSync(out, 'utf8'));
  } catch {
    report = null;
  }
  rmSync(out, { force: true });
  if (report === null) return { failed: null, ran: 0, tail: `${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n').slice(-12).join('\n') };
  const failed = [];
  let ran = 0;
  for (const file of report.testResults ?? []) {
    for (const a of file.assertionResults ?? []) {
      ran += 1;
      if (a.status === 'failed') failed.push([...(a.ancestorTitles ?? []), a.title].join(' > '));
    }
    // A file that failed to load has no rows; name it so it is not read as green.
    if ((file.assertionResults ?? []).length === 0 && file.status === 'failed') failed.push(`${file.name} (did not load)`);
  }
  return { failed, ran, tail: '' };
}

/** Put one clone file back and prove it by sha256 against the worktree. */
function restore(rel) {
  const want = readFileSync(join(REPO, rel));
  writeFileSync(join(scratch, rel), want);
  const got = readFileSync(join(scratch, rel));
  if (sha(got) !== sha(want)) throw new Error(`${rel} did not restore: sha256 ${sha(got)} against ${sha(want)}`);
}

let cleaned = false;
const clean = () => {
  if (cleaned || scratch === null) return;
  cleaned = true;
  try {
    rmSync(scratch, { recursive: true, force: true });
  } catch {
    /* under /private/tmp; not fatal */
  }
};
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    clean();
    process.exit(130);
  });
}

const rulesRed = (results) => Object.entries(results).filter(([, p]) => p.length > 0).map(([r]) => r);

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const problems = [];
  const table = [];
  const started = Date.now();
  let ran = 0;
  let owned = 0;
  let behaviour = 0;
  const WATCHED = [CORE, FAR, REMOTE, INFLIGHT, ...TESTS, 'build/conformance-farattach.mjs', 'build/assert-bundle-refusals.mjs'];
  const before = new Map(WATCHED.filter((f) => existsSync(join(REPO, f))).map((f) => [f, sha(readFileSync(join(REPO, f)))]));

  try {
    buildClone();
    say(`clone at ${scratch}, node_modules symlinked, nothing under a home touched`);
    const only = (process.env['P326_ONLY'] ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
    for (const name of only) {
      if (!ARMS.some((a) => a.n === name)) problems.push(`P326_ONLY names ${JSON.stringify(name)}, which is no arm`);
    }

    const control = runGate();
    if (control === null || rulesRed(control).length > 0) {
      problems.push(`the UNEDITED control gate is not green (${control === null ? 'no reading' : `red: ${rulesRed(control).join(', ')}`}), so every arm below would mean nothing`);
      throw new Error('control red');
    }
    const missingTests = TESTS.filter((t) => !existsSync(join(REPO, t)));
    if (missingTests.length > 0) problems.push(`the p326 vitest files ${missingTests.join(', ')} do not exist, so the behaviour arms cannot be proved`);
    const presentTests = TESTS.filter((t) => existsSync(join(REPO, t)));
    const controlTests = presentTests.length > 0 ? runTests(presentTests) : { failed: [], ran: 0 };
    if (controlTests.failed === null || controlTests.failed.length > 0) {
      problems.push(
        `the UNEDITED control's p326 vitest files are not green (${controlTests.failed === null ? `no report. ${controlTests.tail}` : controlTests.failed.slice(0, 5).join(' | ')})`
      );
      throw new Error('control red');
    }
    say(`control: ${String(Object.keys(control).length)} rules green, ${String(controlTests.ran)} vitest rows green over ${String(presentTests.length)} p326 files`);

    for (const arm of ARMS) {
      if (only.length > 0 && !only.includes(arm.n)) continue;
      const path = join(scratch, arm.file);
      if (!existsSync(path)) {
        problems.push(`${arm.n} "${arm.name}": ${arm.file} does not exist`);
        table.push([arm.n, 'NO FILE', arm.name]);
        continue;
      }
      const shipping = readFileSync(join(REPO, arm.file), 'utf8');
      let edited;
      try {
        edited = arm.edit(shipping);
      } catch (err) {
        problems.push(`${arm.n} "${arm.name}": ${err instanceof Error ? err.message : String(err)}. A clause that moved moves its arm in the same commit.`);
        table.push([arm.n, 'NEEDLE', arm.name]);
        continue;
      }
      if (edited === shipping) {
        problems.push(`${arm.n} "${arm.name}": the edit changed nothing`);
        table.push([arm.n, 'NO EDIT', arm.name]);
        continue;
      }
      writeFileSync(path, edited, 'utf8');
      ran += 1;
      let reading;
      let tested = null;
      try {
        reading = runGate();
        if (arm.tests !== undefined) tested = runTests(arm.tests.filter((t) => existsSync(join(REPO, t))));
      } finally {
        restore(arm.file);
      }
      const armProblems = [];
      if (reading === null) armProblems.push('the gate printed no reading');
      else {
        const red = rulesRed(reading);
        const stayedGreen = arm.owners.filter((o) => !red.includes(o));
        const moved = red.filter((r) => !arm.owners.includes(r));
        if (stayedGreen.length > 0) armProblems.push(`its owner ${stayedGreen.join(', ')} stayed GREEN, so the clause is decoration to the gate`);
        if (moved.length > 0) armProblems.push(`${moved.join(', ')} went red as well, where the control read green`);
      }
      if (arm.tests !== undefined) {
        const missing = arm.tests.filter((t) => !existsSync(join(REPO, t)));
        if (missing.length > 0) armProblems.push(`its vitest owner ${missing.join(', ')} does not exist`);
        else if (tested === null || tested.failed === null) armProblems.push(`vitest produced no report. ${tested?.tail ?? ''}`);
        else if (tested.failed.length === 0) armProblems.push(`its vitest owner ${arm.tests.join(', ')} stayed GREEN over ${String(tested.ran)} rows, so the behaviour this clause buys is not tested`);
      }
      if (armProblems.length > 0) {
        problems.push(`${arm.n} "${arm.name}": ${armProblems.join('; ')}`);
        table.push([arm.n, 'FAIL', arm.name]);
      } else {
        owned += 1;
        if (tested !== null) behaviour += 1;
        const vit = tested === null ? '' : `, and ${String(tested.failed.length)} of ${String(tested.ran)} vitest rows red`;
        table.push([arm.n, 'owner red', `${arm.name} (${arm.owners.join(', ')}${vit})`]);
      }
      say(`${arm.n.padEnd(4)} ${armProblems.length === 0 ? 'ok  ' : 'FAIL'} ${arm.name}: red ${reading === null ? '?' : rulesRed(reading).join(', ') || 'nothing'}${tested !== null && tested.failed !== null ? `; vitest ${String(tested.failed.length)} red of ${String(tested.ran)}` : ''}`);
    }

    const after = runGate();
    if (after === null || rulesRed(after).length > 0) {
      problems.push('after every file was restored the control gate is not green again, so a restore did not land');
    } else {
      say('restored: every edited clone file matched the worktree by sha256, and the control gate is green again');
    }
  } catch (err) {
    if (!(err instanceof Error && err.message === 'control red')) {
      problems.push(`the harness threw: ${err instanceof Error ? err.message : String(err)}`);
    }
  } finally {
    clean();
  }

  for (const [file, was] of before) {
    const now = existsSync(join(REPO, file)) ? sha(readFileSync(join(REPO, file))) : 'gone';
    if (now !== was) {
      problems.push(`${file} in the WORKTREE changed during the run (${was.slice(0, 12)} to ${now.slice(0, 12)}); this harness writes only its clone, so another hand moved it and this reading is stale`);
    }
  }

  process.stdout.write('\n');
  for (const [n, verdict, name] of table) process.stdout.write(`${TAG}   ${n.padEnd(4)} ${verdict.padEnd(10)} ${name}\n`);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (problems.length > 0) {
    process.stdout.write(`\n${TAG} FAIL, ${String(problems.length)} in ${seconds} s:\n`);
    for (const p of problems) process.stdout.write(`  - ${p}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `\n${TAG} PASS in ${seconds} s. ${String(ran)} arms, one clause each, and every one turned THE RULE THAT OWNS IT red ` +
      `and no other (${String(owned)} of ${String(ran)}); the ${String(behaviour)} behaviour arms also turned their p326 vitest file red. Every clone ` +
      'file was restored and proved by sha256, the worktree was never written, and the clone is gone. No Electron, no tmux, no ssh, no agent, no token.\n'
  );
  process.exit(0);
}
