#!/usr/bin/env node
/**
 * `build/probe-p104-shot.mjs`. The Phase 104 photographs, taken by driving the
 * REAL app against a real machine on 127.0.0.1.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT PROVES, and these are evidence items 10, 12, 14, 15 and 16
 * ---------------------------------------------------------------------------
 * A person turns saving on for one machine by pressing the real controls, opens
 * a folder on that machine as a project tab, types into the real commit box and
 * presses the real button. The far side's own porcelain and its own commit
 * count are read before and after each press, so what is reported is what git
 * over there says rather than what the panel says about it.
 *
 *   #   what is read                                        read from
 *   --  -------------------------------------------------  -------------------
 *    0  the operator's session count before                 tmux, read only
 *    1  the machine reaches confirmed with no folder yet    the Settings window
 *    2  the commit box refuses, naming that machine         the app window
 *    3  the row reaches confirmed carrying the folder       the Settings window
 *    4  the standing line names the machine by its label    the app window
 *    5  a real commit lands and the panel names its sha     the machine
 *    6  a stage over there between the read and the press   the machine
 *    7  no message typed                                    the app window
 *    8  nothing staged on that machine                      the app window
 *    9  a conflicted file in that folder                    the app window
 *   10  that machine is not answering                       the app window
 *   11  no sentence on screen says Tortie changes nothing   the app window
 *   12  the operator's session count after                  tmux, read only
 *
 * Row 5 pastes the far side's own `git log -1 --format=%H` and compares it
 * against the sha the panel drew, which is what makes it evidence. Row 6 runs
 * `git add` on that machine between the panel's read and the press, and proves
 * the commit count over there did not move.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES NOT PROVE, and the report says so
 * ---------------------------------------------------------------------------
 * IT MEASURES NO MILLISECONDS. A window, a render and a settle wait sit between
 * every press and every reading, so any number here would be about the harness.
 * The timings, the byte counts, the hook behaviour, the HEAD guard on a repeat
 * and the message that survives byte for byte are all measured by
 * `build/probe-p104-commit.mjs`, which drives the channel directly.
 *
 * IT EXERCISES NO SIGNING CONFIGURATION. Research 57's second hazard is
 * answered by design and by the one standing sentence row 4 photographs. No key
 * that needs a passphrase was ever set up on any machine here.
 *
 * THE FAR SIDE IS THIS MAC. Every answer below is a macOS far side reached over
 * loopback. No Linux machine is contacted.
 *
 * ROWS 7 TO 10 SUPPLY THE ANSWER RATHER THAN READING ONE for the states that
 * cannot be arranged over a link in one run, and each one reports `seeded` so a
 * reader can never mistake a drawing of a supplied answer for a drawing of a
 * real one.
 *
 * ---------------------------------------------------------------------------
 * SAFETY, AND IT OUTRANKS EVERY RESULT
 * ---------------------------------------------------------------------------
 *  1. The target is 127.0.0.1 and this file names no other host.
 *  2. The socket names `gmux` and `default` are refused before anything starts,
 *     and a run that arrives without a harness socket wraps itself in
 *     `build/harness-socket.mjs` rather than borrowing one.
 *  3. Every launch uses an isolated `--user-data-dir` under this run's own
 *     root. The operator's profile, their machines file and the installed
 *     /Applications/Tortie.app are never opened.
 *  4. Every pid is recorded as it is made and only recorded pids are killed.
 *     There is no `pkill` and no `kill-server` in this file.
 *  5. Every git command this file runs names a repository this run made under
 *     this run's own scratch folder, and it names no path outside it.
 *  6. `-L gmux` appears in exactly one place, a read only session count taken
 *     before and after, which must match.
 *
 * Every scratch file carries a `p104-` prefix.
 *
 * Usage, from the repository root:
 *
 *   npm run build
 *   npm run probe:p104shot
 *
 * Exit code 0 when every row passes. 1 when one does not. 2 when it refuses.
 */

import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p104shot]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const refuse = (why) => {
  process.stderr.write(`${TAG} ${why}\n`);
  process.exit(2);
};

// ---------------------------------------------------------------------------
// The socket and the machine
// ---------------------------------------------------------------------------

const CARRIAGE = 'p104-carriage.json';
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
const configRoot = (process.env['GMUX_CONFIG_ROOT'] ?? '').trim();
const carriagePath = configRoot === '' ? '' : join(configRoot, CARRIAGE);

if (socket === '' || carriagePath === '' || !existsSync(carriagePath)) {
  const inner =
    'export GMUX_CONFIG_ROOT="${GMUX_CONFIG_ROOT:-$GMUX_HARNESS_DIR}"; ' +
    `node build/with-scratch-machine.mjs --carriage ${CARRIAGE} -- ` +
    'node build/probe-p104-shot.mjs';
  say('no harness socket or no machine, so this run wraps itself in both');
  const wrapped = spawnSync(
    process.execPath,
    [
      join(repoRoot, 'build', 'harness-socket.mjs'),
      '--fresh',
      'gmux-p104-shot',
      inner
    ],
    { cwd: repoRoot, stdio: 'inherit' }
  );
  process.exit(wrapped.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to run on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const carriage = JSON.parse(readFileSync(carriagePath, 'utf8'));
if (carriage.host !== '127.0.0.1') {
  refuse(
    `the carriage names ${String(carriage.host)} and this probe only ever ` +
      'contacts 127.0.0.1'
  );
}

// ---------------------------------------------------------------------------
// The far side: three repositories under this run's own root
// ---------------------------------------------------------------------------

const runRoot = join(configRoot, 'p104-shot');
rmSync(runRoot, { recursive: true, force: true });
const far = join(runRoot, 'far');
const raceRepo = join(runRoot, 'farrace');
const conflictRepo = join(runRoot, 'farc');
const profile = join(runRoot, 'profile');
const outDir = join(repoRoot, 'out');
mkdirSync(join(far, 'src'), { recursive: true });
mkdirSync(join(raceRepo, 'src'), { recursive: true });
mkdirSync(conflictRepo, { recursive: true });
mkdirSync(join(profile, 'gmux', 'config'), { recursive: true });
mkdirSync(outDir, { recursive: true });

const recordedPids = [];
const failures = [];

function note(n, what, verdict, detail) {
  process.stdout.write(`${TAG} ${String(n)}. ${what}: ${verdict}. ${detail}\n`);
}
function fail(text) {
  failures.push(text);
  process.stdout.write(`${TAG} FAIL: ${text}\n`);
}
function sh(file, args, options = {}) {
  const out = spawnSync(file, args, {
    encoding: 'utf8',
    timeout: 60_000,
    ...options
  });
  return {
    code: out.status ?? -1,
    stdout: out.stdout ?? '',
    stderr: out.stderr ?? ''
  };
}

/** The operator's live server, listed and never written. The ONLY mention. */
function operatorSessions() {
  return sh('/bin/sh', [
    '-c',
    "tmux -L gmux list-sessions 2>/dev/null | wc -l | tr -d ' '"
  ]).stdout.trim();
}

/** git inside one of this run's own repositories, with an identity of its own. */
function git(repo, args) {
  return sh(
    '/usr/bin/git',
    [
      '-c',
      'user.name=Tortie Probe',
      '-c',
      'user.email=probe@example.invalid',
      '-c',
      'commit.gpgsign=false',
      ...args
    ],
    { cwd: repo }
  );
}

/** The far side's own answer about one repository, printed one row per line. */
function porcelain(repo) {
  return git(repo, ['status', '--porcelain=v1'])
    .stdout.split('\n')
    .filter((one) => one.trim() !== '')
    .join(' | ');
}

/** That machine's own HEAD, in full. Empty when the branch is unborn. */
function headOf(repo) {
  return git(repo, ['rev-parse', 'HEAD']).stdout.trim();
}

/** How many commits that machine's own git counts on HEAD. */
function commitCount(repo) {
  const out = git(repo, ['rev-list', '--count', 'HEAD']).stdout.trim();
  return out === '' ? '0' : out;
}

const sessionsBefore = operatorSessions();
note(0, "the operator's session count before", 'read', sessionsBefore);

// The ordinary repository, with one file staged and ready to be committed.
writeFileSync(join(far, 'src', 'kept.ts'), 'export const kept = 1;\n', 'utf8');
writeFileSync(join(far, 'README.md'), '# p104 fixture\n', 'utf8');
git(far, ['init', '-b', 'main']);
git(far, ['add', '-A']);
git(far, ['commit', '-m', 'p104 base']);
writeFileSync(join(far, 'src', 'kept.ts'), 'export const kept = 2;\n', 'utf8');
git(far, ['add', 'src/kept.ts']);
say(`the fixture repository reads ${porcelain(far)} at ${headOf(far)}`);

// The repository row 6 races. One file is staged before the panel reads it and
// a second is staged AFTER, which is the fourth hazard: HEAD does not move when
// somebody or an agent runs `git add` over there.
writeFileSync(join(raceRepo, 'src', 'a.ts'), 'export const a = 1;\n', 'utf8');
writeFileSync(join(raceRepo, 'src', 'b.ts'), 'export const b = 1;\n', 'utf8');
git(raceRepo, ['init', '-b', 'main']);
git(raceRepo, ['add', '-A']);
git(raceRepo, ['commit', '-m', 'p104 race base']);
writeFileSync(join(raceRepo, 'src', 'a.ts'), 'export const a = 2;\n', 'utf8');
writeFileSync(join(raceRepo, 'src', 'b.ts'), 'export const b = 2;\n', 'utf8');
git(raceRepo, ['add', 'src/a.ts']);
say(`the race repository reads ${porcelain(raceRepo)}`);

// The conflicted repository, made by a merge that cannot be resolved.
writeFileSync(join(conflictRepo, 'c.txt'), 'base\n', 'utf8');
git(conflictRepo, ['init', '-b', 'main']);
git(conflictRepo, ['add', '-A']);
git(conflictRepo, ['commit', '-m', 'base']);
git(conflictRepo, ['checkout', '-b', 'other']);
writeFileSync(join(conflictRepo, 'c.txt'), 'other\n', 'utf8');
git(conflictRepo, ['commit', '-am', 'other']);
git(conflictRepo, ['checkout', 'main']);
writeFileSync(join(conflictRepo, 'c.txt'), 'main\n', 'utf8');
git(conflictRepo, ['commit', '-am', 'main']);
git(conflictRepo, ['merge', 'other']);
say(`the conflicted repository reads ${porcelain(conflictRepo)}`);

const MACHINE_ID = 'p104';
const MACHINE_LABEL = 'Scratch';
writeFileSync(
  join(profile, 'gmux', 'config', 'machines.json'),
  `${JSON.stringify(
    {
      schema: 1,
      machines: [
        {
          id: MACHINE_ID,
          label: MACHINE_LABEL,
          color: 'magenta',
          host: carriage.host,
          user: carriage.user,
          port: carriage.port,
          remoteTmuxPath: carriage.remoteTmuxPath
        }
      ]
    },
    null,
    2
  )}\n`,
  'utf8'
);

// The machine's identity, in TORTIE'S OWN known machines file. Tortie never
// reads the person's own one and never writes to it.
mkdirSync(join(profile, 'gmux', 'machines'), { recursive: true });
writeFileSync(
  join(profile, 'gmux', 'machines', 'known-machines'),
  spawnSync(
    '/usr/bin/ssh-keyscan',
    ['-p', String(carriage.port), carriage.host],
    { encoding: 'utf8', timeout: 30_000 }
  ).stdout ?? '',
  'utf8'
);

// ---------------------------------------------------------------------------
// One launch, one photograph
// ---------------------------------------------------------------------------

function launch({ shot, js, settings, timeoutMs = 240_000, delayMs = 8000 }) {
  return new Promise((done) => {
    const env = {
      ...process.env,
      GMUX_SHOT: shot,
      GMUX_SHOT_DELAY_MS: String(delayMs),
      GMUX_TMUX_SOCKET: socket
    };
    if (settings) {
      env['GMUX_SHOT_SETTINGS'] = '1';
      env['GMUX_SHOT_SETTINGS_JS'] = js;
    } else {
      env['GMUX_SHOT_JS'] = js;
    }
    const child = spawn(
      join(repoRoot, 'node_modules', '.bin', 'electron'),
      ['.', `--user-data-dir=${profile}`, '-ApplePersistenceIgnoreState', 'YES'],
      { cwd: repoRoot, env, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    recordedPids.push(child.pid);
    let out = '';
    const take = (chunk) => {
      out += String(chunk);
    };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    const timer = setTimeout(() => {
      try {
        process.kill(child.pid, 'SIGKILL');
      } catch {
        /* already gone */
      }
    }, timeoutMs);
    child.on('exit', (code) => {
      clearTimeout(timer);
      child.stdout.destroy();
      child.stderr.destroy();
      const marker = settings ? '[gmux-shot] driver' : '[gmux-shot] probe ';
      const at = out.lastIndexOf(marker);
      let parsed = null;
      if (at !== -1) {
        const line = out.slice(at + marker.length).split('\n')[0] ?? '';
        try {
          parsed = JSON.parse(line.replace(/^\s*→\s*/, '').trim());
        } catch {
          parsed = null;
        }
      }
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          /* the driver answered a plain string */
        }
      }
      done({ code, out, parsed });
    });
  });
}

const shotPath = (name) => join(outDir, `p104-${name}.png`);
const photographed = (path) =>
  existsSync(path) && statSync(path).size > 0 ? statSync(path).size : 0;

/** The opening of every probe expression: connect, then open the folder. */
const preamble = (path) => `
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const M = () => window.gmux.machines;
  const ID = ${JSON.stringify(MACHINE_ID)};
  const prepared = await M().prepare(ID);
  await wait(1500);
  const opened = await window.gmux.projects.addRemote({
    machineId: ID, path: ${JSON.stringify(path)}
  });
  await wait(2500);
`;

// ---------------------------------------------------------------------------
// 1 and 2. Confirmed, with saving still off
// ---------------------------------------------------------------------------

const settingsDrive = (extra) => `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const m = () => window.gmux.machines;
  const act = async (name) => {
    const el = document.querySelector('[data-machines-action="' + name + '"]');
    if (el === null) return 'missing';
    if (el.disabled === true) return 'disabled';
    el.click();
    await wait(600);
    return true;
  };
  const type = (selector, value) => {
    const el = document.querySelector(selector);
    if (el === null) return false;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };
  const read = [];
  try {
    const rail = Array.from(document.querySelectorAll('button, [role="tab"], li, a'))
      .find((n) => (n.textContent || '').trim() === 'Machines');
    if (rail) { rail.click(); await wait(800); }
    const toggle = document.querySelector('[data-machines-action="toggle-lines"]');
    if (toggle && toggle.getAttribute('aria-expanded') !== 'true') {
      toggle.click();
      await wait(600);
    }
    ${extra}
    const listed = await m().rows();
    read.push(['rows', listed.rows.map((r) => ({
      id: r.id, state: r.state, usable: r.usable, writeRoot: r.writeRoot
    }))]);
    return JSON.stringify(read);
  } catch (err) {
    read.push(['error', String((err && err.message) || err)]);
    return JSON.stringify(read);
  }
})()`;

const oneShot = shotPath('1-confirmed-no-folder');
const r1 = await launch({
  settings: true,
  shot: oneShot,
  js: settingsDrive(`await act('confirm'); await wait(1200);`)
});
const readOf = (parsed) => new Map(Array.isArray(parsed) ? parsed : []);
const row1 = (readOf(r1.parsed).get('rows') ?? [])[0] ?? null;
const confirmedNoFolder =
  row1?.state === 'confirmed' &&
  (row1?.writeRoot === null || row1?.writeRoot === undefined);
note(
  1,
  'the machine reaches confirmed with no folder yet',
  confirmedNoFolder ? 'pass' : 'FAIL',
  `row ${JSON.stringify(row1)}. Photograph ${oneShot} at ${String(photographed(oneShot))} bytes`
);
if (!confirmedNoFolder) fail('the machine never reached confirmed with no folder');

// ---------------------------------------------------------------------------
// 2. EVIDENCE ITEM 12. Saving is off, and the box says so and sends nothing.
// ---------------------------------------------------------------------------
//
// THE REFUSAL COMES FROM `confirmedWriteRoot` AND NOT FROM THE DOOR. There is
// no writes gate inside `runRemoteWrite`, and this phase did not put one there.
// Eight callers each ask that one shared function. `build/probe-p104-commit.mjs`
// proves the send counter did not move; what this row proves is that a person
// reads which machine and where to give the word.

const WRITES_OFF_MARK = `Tortie has not been given permission to write on ${MACHINE_LABEL}`;
const twoShot = shotPath('2-writes-off');
const beforeTwo = commitCount(far);
const r2 = await launch({
  shot: twoShot,
  delayMs: 14_000,
  js: `(async () => {
    ${preamble(far)}
    const drawn = await window.__gmuxP104Commit({
      machineId: ID,
      label: ${JSON.stringify(MACHINE_LABEL)},
      path: ${JSON.stringify(far)},
      // SAID RATHER THAN LEFT TO A DEFAULT. This row photographs the state
      // where saving is off, so the confirmed folder it wants on the row is
      // none. Leaving it out read the row this renderer holds, and until the
      // real tab reaches the project list there is no row, so the drive fell
      // back to the tab's own folder and the button was pressable in the
      // picture meant to show it refused.
      writeRoot: null,
      type: 'a message nobody should be able to send',
      press: true,
      marks: [${JSON.stringify(WRITES_OFF_MARK)}]
    });
    return { prepared: prepared && prepared.class, opened: opened && opened.ok, drawn };
  })()`
});
const d2 = r2.parsed?.drawn ?? null;
const afterTwo = commitCount(far);
const refusedOff =
  d2?.buttonDisabled === true &&
  (d2?.marksOnScreen ?? []).includes(WRITES_OFF_MARK) &&
  d2?.pressed === false &&
  beforeTwo === afterTwo;
note(
  2,
  'the commit box refuses on a machine whose writes are off, and names it',
  refusedOff ? 'pass' : 'FAIL',
  `the button read ${JSON.stringify(d2?.button ?? null)}, its reason read ` +
    `${JSON.stringify(d2?.disabledWhy ?? null)} and it was ` +
    `${d2?.buttonDisabled === true ? 'disabled' : 'pressable'}. The commit ` +
    `count over there was ${beforeTwo} before and ${afterTwo} after. ` +
    `Photograph ${twoShot} at ${String(photographed(twoShot))} bytes`
);
if (!refusedOff) fail('the commit box did not refuse with saving off');

// ---------------------------------------------------------------------------
// 3. Turn saving on, with the folder that holds every repository
// ---------------------------------------------------------------------------

const threeShot = shotPath('3-saving-on');
const r3 = await launch({
  settings: true,
  shot: threeShot,
  js: settingsDrive(`
    await act('open-writes');
    type('[data-machines-field="write-root"]', ${JSON.stringify(runRoot)});
    await wait(1200);
    await act('allow-writes');
    await wait(1600);
  `)
});
const row3 = (readOf(r3.parsed).get('rows') ?? [])[0] ?? null;
const savingOn = row3?.state === 'confirmed' && row3?.writeRoot === runRoot;
note(
  3,
  'the row reaches confirmed carrying the folder',
  savingOn ? 'pass' : 'FAIL',
  `row ${JSON.stringify(row3)}. Photograph ${threeShot} at ${String(photographed(threeShot))} bytes`
);
if (!savingOn) fail('saving was not turned on, so every row below is about a machine that refuses');

// ---------------------------------------------------------------------------
// 4 and 5. EVIDENCE ITEMS 14 AND 1. The standing line, and a real commit.
// ---------------------------------------------------------------------------

const STANDING_MARK = `Hooks and signing run on ${MACHINE_LABEL}.`;
const beforeFive = commitCount(far);
const headBeforeFive = headOf(far);
const fiveShot = shotPath('5-committed');
const r5 = await launch({
  shot: fiveShot,
  delayMs: 18_000,
  js: `(async () => {
    ${preamble(far)}
    const drawn = await window.__gmuxP104Commit({
      machineId: ID,
      label: ${JSON.stringify(MACHINE_LABEL)},
      path: ${JSON.stringify(far)},
      type: 'p104 from the panel',
      press: true,
      marks: [${JSON.stringify(STANDING_MARK)}]
    });
    return { drawn };
  })()`
});
const d5 = r5.parsed?.drawn ?? null;
const afterFive = commitCount(far);
const headAfterFive = headOf(far);
const standingOk =
  typeof d5?.standing === 'string' &&
  d5.standing.startsWith(STANDING_MARK) &&
  (d5?.marksOnScreen ?? []).includes(STANDING_MARK);
note(
  4,
  'the standing line names the machine by its own label',
  standingOk ? 'pass' : 'FAIL',
  `it read ${JSON.stringify(d5?.standing ?? null)}. It is drawn BEFORE a ` +
    'person commits, and it is the one visible answer to the signing hazard. ' +
    `Photograph ${fiveShot} at ${String(photographed(fiveShot))} bytes`
);
if (!standingOk) fail('the standing line was not on screen with the real label');

const drewSha = (d5?.commitSentences ?? []).join(' ');
const committedOk =
  d5?.commitOutcome === 'committed' &&
  Number(afterFive) === Number(beforeFive) + 1 &&
  headAfterFive !== headBeforeFive &&
  drewSha.includes(headAfterFive.slice(0, 7));
note(
  5,
  'a real commit lands over there and the panel names its sha',
  committedOk ? 'pass' : 'FAIL',
  `the word was ${String(d5?.commitOutcome)} and the panel said ` +
    `${JSON.stringify(d5?.commitSentences ?? null)}. That machine's own ` +
    `git log -1 --format=%H reads ${headAfterFive}, and it read ` +
    `${headBeforeFive} before. The commit count went from ${beforeFive} to ` +
    `${afterFive}. The box now holds ${JSON.stringify(d5?.typed ?? null)}, ` +
    'which is empty because a commit that landed clears it'
);
if (!committedOk) fail('the commit did not land, or the panel named the wrong sha');

// ---------------------------------------------------------------------------
// 6. EVIDENCE ITEM 10. A stage over there between the read and the press.
// ---------------------------------------------------------------------------
//
// THE FOURTH HAZARD, WHICH IS NOT ON RESEARCH 57'S LIST. HEAD does not move
// when somebody or an agent runs `git add` in that folder. A HEAD guard alone
// would let a person commit content they never read in the Changes list, so
// main compares the staged set it re-reads against the set the panel drew.

const STAGED_CHANGED_MARK = 'changed after Tortie read it';
const beforeSix = commitCount(raceRepo);
const sixShot = shotPath('6-staged-changed');
const r6 = await launch({
  shot: sixShot,
  delayMs: 20_000,
  js: `(async () => {
    ${preamble(raceRepo)}
    // The panel reads the folder and draws one staged file. The message is
    // typed, and NOTHING is pressed yet.
    const drew = await window.__gmuxP104Commit({
      machineId: ID,
      label: ${JSON.stringify(MACHINE_LABEL)},
      path: ${JSON.stringify(raceRepo)},
      type: 'p104 into a moving index'
    });
    // The second file is staged over there, between the draw and the press.
    await window.gmux.machines.stage({
      machineId: ID,
      cwd: ${JSON.stringify(raceRepo)},
      paths: ['src/b.ts']
    });
    // Now press, with the panel still holding the set it drew a moment ago.
    const drawn = await window.__gmuxP104Commit({
      machineId: ID,
      label: ${JSON.stringify(MACHINE_LABEL)},
      path: ${JSON.stringify(raceRepo)},
      press: true,
      marks: [${JSON.stringify(STAGED_CHANGED_MARK)}]
    });
    return { drew: drew && drew.rows, drawn };
  })()`
});
const d6 = r6.parsed?.drawn ?? null;
const afterSix = commitCount(raceRepo);
const raceOk =
  d6?.commitOutcome === 'staged-changed' &&
  beforeSix === afterSix &&
  (d6?.marksOnScreen ?? []).includes(STAGED_CHANGED_MARK);
note(
  6,
  'a stage over there between the read and the press commits nothing',
  raceOk ? 'pass' : 'FAIL',
  `the word was ${String(d6?.commitOutcome)} and the panel said ` +
    `${JSON.stringify(d6?.commitSentences ?? null)}. The commit count over ` +
    `there was ${beforeSix} before and ${afterSix} after, so nothing was ` +
    `committed. The far side reads ${porcelain(raceRepo)}. Photograph ` +
    `${sixShot} at ${String(photographed(sixShot))} bytes`
);
if (!raceOk) fail('the staged set guard did not fire, or something was committed');

// ---------------------------------------------------------------------------
// 7 to 10. EVIDENCE ITEM 15. Every reason the button is disabled.
// ---------------------------------------------------------------------------
//
// Four of the five reasons are photographed here and the fifth is row 2, which
// was arranged for real by leaving saving off. Rows 8, 9 and 10 supply the
// answer rather than reading one, and each reports `seeded`.

const disabledCase = async (n, name, spec, expect_, what) => {
  const shot = shotPath(`${String(n)}-${name}`);
  const r = await launch({
    shot,
    delayMs: 14_000,
    js: `(async () => {
      ${preamble(far)}
      const drawn = await window.__gmuxP104Commit(${JSON.stringify({
        machineId: MACHINE_ID,
        label: MACHINE_LABEL,
        path: far,
        ...spec
      })});
      return { drawn };
    })()`
  });
  const d = r.parsed?.drawn ?? null;
  const ok =
    d?.buttonDisabled === true &&
    String(d?.disabledWhy ?? '') === expect_ &&
    String(d?.buttonTitle ?? '') === expect_;
  note(
    n,
    what,
    ok ? 'pass' : 'FAIL',
    `the reason read ${JSON.stringify(d?.disabledWhy ?? null)} and the ` +
      `tooltip read ${JSON.stringify(d?.buttonTitle ?? null)}. Seeded: ` +
      `${String(d?.seeded === true)}. Photograph ${shot} at ` +
      `${String(photographed(shot))} bytes`
  );
  if (!ok) fail(`${what} was not drawn`);
};

await disabledCase(
  7,
  'no-message',
  {
    seed: {
      repoPath: far,
      headSha: headOf(far),
      files: [{ path: 'src/kept.ts', indexState: 'M', worktreeState: '.' }]
    }
  },
  'Enter a commit message',
  'the box asks for a message when nothing is typed'
);

await disabledCase(
  8,
  'nothing-staged',
  {
    seed: {
      repoPath: far,
      headSha: headOf(far),
      files: [{ path: 'src/kept.ts', indexState: '.', worktreeState: 'M' }]
    },
    type: 'a message with nothing staged under it'
  },
  `Nothing is staged on ${MACHINE_LABEL}`,
  'the box says nothing is staged on that machine'
);

await disabledCase(
  9,
  'conflicts',
  {
    seed: {
      repoPath: far,
      headSha: headOf(far),
      files: [{ path: 'c.txt', indexState: 'U', worktreeState: 'U' }]
    },
    type: 'a message over a conflicted file'
  },
  `Resolve the conflicts on ${MACHINE_LABEL} first`,
  'the box says the conflicts have to be resolved over there'
);

await disabledCase(
  10,
  'not-connected',
  {
    offline: true,
    seed: {
      repoPath: far,
      headSha: headOf(far),
      files: [{ path: 'src/kept.ts', indexState: 'M', worktreeState: '.' }]
    },
    type: 'a message to a machine that is not answering'
  },
  `Tortie is not connected to ${MACHINE_LABEL} right now`,
  'the box says that machine is not answering'
);

// ---------------------------------------------------------------------------
// 11. EVIDENCE ITEM 16. No false sentence is left on that panel.
// ---------------------------------------------------------------------------

const FALSE_SENTENCES = [
  'Tortie can stage and unstage them there',
  'The only thing this view changes on that machine is which files are staged',
  'Tortie never writes on that machine',
  'nothing in this view changes that folder'
];
const TRUE_SENTENCES = [
  'Tortie can stage them, unstage them and commit them there',
  'which files are staged and whether they are committed'
];
const elevenShot = shotPath('11-band-and-note');
const r11 = await launch({
  shot: elevenShot,
  delayMs: 14_000,
  js: `(async () => {
    ${preamble(far)}
    const drawn = await window.__gmuxP104Commit({
      machineId: ID,
      label: ${JSON.stringify(MACHINE_LABEL)},
      path: ${JSON.stringify(far)},
      marks: ${JSON.stringify([...FALSE_SENTENCES, ...TRUE_SENTENCES])}
    });
    return { drawn };
  })()`
});
const d11 = r11.parsed?.drawn ?? null;
const seen = d11?.marksOnScreen ?? [];
const falseLeft = FALSE_SENTENCES.filter((one) => seen.includes(one));
const trueDrawn = TRUE_SENTENCES.filter((one) => seen.includes(one));
const bandOk = falseLeft.length === 0 && trueDrawn.length === TRUE_SENTENCES.length;
note(
  11,
  'no sentence on screen says this view cannot change that machine',
  bandOk ? 'pass' : 'FAIL',
  `the sentences that must be gone and are still there: ` +
    `${JSON.stringify(falseLeft)}. The sentences that must be there and are: ` +
    `${JSON.stringify(trueDrawn)}. Photograph ${elevenShot} at ` +
    `${String(photographed(elevenShot))} bytes`
);
if (!bandOk) fail('a false sentence is still on that panel, or a true one is missing');

// ---------------------------------------------------------------------------
// 12. Teardown
// ---------------------------------------------------------------------------

for (const pid of recordedPids) {
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    /* already gone */
  }
}

const sessionsAfter = operatorSessions();
note(
  12,
  "the operator's session count after",
  sessionsAfter === sessionsBefore ? 'pass' : 'FAIL',
  `before ${sessionsBefore}, after ${sessionsAfter}`
);
if (sessionsAfter !== sessionsBefore) {
  fail("the operator's session count moved, which this probe must never do");
}

say(`${String(recordedPids.length)} pids were recorded and every one was killed`);
if (failures.length > 0) {
  say(`${String(failures.length)} rows failed`);
  process.exit(1);
}
say('every row passed');
process.exit(0);
