#!/usr/bin/env node
/**
 * `build/probe-p103-shot.mjs`. The Phase 103 photographs, taken by driving the
 * REAL app against a real machine on 127.0.0.1.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT PROVES
 * ---------------------------------------------------------------------------
 * A person turns saving on for one machine by pressing the real controls, opens
 * a folder on that machine as a project tab, and the Source Control panel then
 * draws three groups with a button on each. Every press below is a press on a
 * button in the document. The far side's own porcelain is read before and after
 * each one, so what is reported is what git over there says rather than what
 * the panel says about it.
 *
 *   #   what is read                                        read from
 *   --  -------------------------------------------------  -------------------
 *    0  the operator's session count before                 tmux, read only
 *    1  the machine reaches confirmed with no folder yet    the Settings window
 *    2  a stage with saving off answers writesOff           the machine
 *    3  the panel draws the sentence naming that machine    the app window
 *    4  the row reaches confirmed carrying the folder       the Settings window
 *    5  three groups on screen at once, with their counts   the app window
 *    6  one file in Staged AND in Changes at the same time  the app window
 *    7  the Changes group button stages every row it names  the machine
 *    8  a Staged row's own button unstages that one row     the machine
 *    9  the menu on a staged row offers Unstage             the app window
 *   10  the menu on an unstaged row offers Stage            the app window
 *   11  a conflicted row offers neither verb and says why   the app window
 *   12  the operator's session count after                  tmux, read only
 *
 * Rows 7 and 8 each paste the far side porcelain before and after, which is
 * what makes them evidence rather than assurance.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES NOT PROVE, and the report says so
 * ---------------------------------------------------------------------------
 * IT CANNOT PHOTOGRAPH A NATIVE MENU. Rows 9 and 10 read the exact item list
 * the row hands the menu bridge, through the product's own right click
 * handler, with the bridge call swapped for a recorder. A macOS menu takes an
 * OS mouse grab, so opening one here would hang the run with a menu nobody can
 * dismiss. A photograph of the menu itself is taken by hand and recorded in the
 * phase report.
 *
 * THE FAR SIDE IS THIS MAC. Every answer below is a macOS far side reached over
 * loopback. No Linux machine is contacted.
 *
 * IT MEASURES NO MILLISECONDS. The five timings the phase asks for are produced
 * by `build/probe-p103-stage.mjs`, which drives the two channels directly and
 * is not slowed by a window, a render and a settle wait.
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
 * Every scratch file carries a `p103-` prefix.
 *
 * Usage, from the repository root:
 *
 *   npm run build
 *   npm run probe:p103shot
 *
 * Exit code 0 when every row passes. 1 when one does not. 2 when it refuses.
 */

import { spawnSync } from 'node:child_process';
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

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p103shot]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const refuse = (why) => {
  process.stderr.write(`${TAG} ${why}\n`);
  process.exit(2);
};

// ---------------------------------------------------------------------------
// The socket and the machine
// ---------------------------------------------------------------------------

const CARRIAGE = 'p103-carriage.json';
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
const configRoot = (process.env['GMUX_CONFIG_ROOT'] ?? '').trim();
const carriagePath = configRoot === '' ? '' : join(configRoot, CARRIAGE);

if (socket === '' || carriagePath === '' || !existsSync(carriagePath)) {
  const inner =
    'export GMUX_CONFIG_ROOT="${GMUX_CONFIG_ROOT:-$GMUX_HARNESS_DIR}"; ' +
    `node build/with-scratch-machine.mjs --carriage ${CARRIAGE} -- ` +
    'node build/probe-p103-shot.mjs';
  say('no harness socket or no machine, so this run wraps itself in both');
  const wrapped = spawnSync(
    process.execPath,
    [
      join(repoRoot, 'build', 'harness-socket.mjs'),
      '--fresh',
      'gmux-p103-shot',
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
// The far side: two repositories under this run's own root
// ---------------------------------------------------------------------------

const runRoot = join(configRoot, 'p103-shot');
rmSync(runRoot, { recursive: true, force: true });
const far = join(runRoot, 'far');
const conflictRepo = join(runRoot, 'farc');
const lineBreakRepo = join(runRoot, 'farn');
const profile = join(runRoot, 'profile');
const outDir = join(repoRoot, 'out');
mkdirSync(join(far, 'src'), { recursive: true });
mkdirSync(conflictRepo, { recursive: true });
mkdirSync(lineBreakRepo, { recursive: true });
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

const sessionsBefore = operatorSessions();
note(0, "the operator's session count before", 'read', sessionsBefore);

// The ordinary repository. Four states at once, which is what makes one
// photograph carry all three groups.
writeFileSync(join(far, 'src', 'kept.ts'), 'export const kept = 1;\n', 'utf8');
writeFileSync(join(far, 'src', 'edited.ts'), 'export const e = 1;\n', 'utf8');
writeFileSync(join(far, 'src', 'both.ts'), 'export const b = 1;\n', 'utf8');
writeFileSync(join(far, 'README.md'), '# p103 fixture\n', 'utf8');
git(far, ['init', '-b', 'main']);
git(far, ['add', '-A']);
git(far, ['commit', '-m', 'p103 base']);
// Staged only, being `M.`
writeFileSync(join(far, 'src', 'kept.ts'), 'export const kept = 2;\n', 'utf8');
git(far, ['add', 'src/kept.ts']);
// Unstaged only, being `.M`
writeFileSync(join(far, 'src', 'edited.ts'), 'export const e = 2;\n', 'utf8');
// Staged AND unstaged, being `MM`, which is the row that appears on two lines
writeFileSync(join(far, 'src', 'both.ts'), 'export const b = 2;\n', 'utf8');
git(far, ['add', 'src/both.ts']);
writeFileSync(join(far, 'src', 'both.ts'), 'export const b = 3;\n', 'utf8');
// Untracked
writeFileSync(join(far, 'src', 'brandnew.ts'), 'export const n = 1;\n', 'utf8');
say(`the fixture repository reads ${porcelain(far)}`);

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

// The repository whose one new file has a line break in its NAME. Git reports
// such a name correctly, because the porcelain this product asks for is NUL
// separated, so the row reaches the panel and a person can press Stage on it.
// Main refuses before anything is composed, because the list of paths travels
// to that machine as one value split on a newline.
const LINE_BREAK_NAME = 'two\nlines.ts';
writeFileSync(join(lineBreakRepo, 'seed.ts'), 'export const s = 1;\n', 'utf8');
git(lineBreakRepo, ['init', '-b', 'main']);
git(lineBreakRepo, ['add', '-A']);
git(lineBreakRepo, ['commit', '-m', 'p103 line break base']);
writeFileSync(join(lineBreakRepo, LINE_BREAK_NAME), 'export const n = 1;\n', 'utf8');
say(`the line break repository reads ${JSON.stringify(porcelain(lineBreakRepo))}`);

const MACHINE_ID = 'p103';
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
  return withElectron(
    {
      label: 'p103-shot',
      userDataDir: profile,
      cwd: repoRoot,
      env: env
    },
    (handle) =>
      new Promise((done) => {
        const child = handle.child;
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
      })
  );
}

const shotPath = (name) => join(outDir, `p103-${name}.png`);
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
  js: settingsDrive(`
    await act('confirm');
    await wait(1200);
    // A CONFIRMED MACHINE WITH NO CONFIRMED FOLDER, which is the state of
    // every machine in every build before Phase 101 and is where the word
    // writesOff comes from.
    try {
      read.push(['stageOff', await m().stage({
        machineId: ${JSON.stringify(MACHINE_ID)},
        cwd: ${JSON.stringify(far)},
        paths: ['src/kept.ts']
      })]);
    } catch (err) {
      read.push(['stageOff', { threw: String((err && err.message) || err) }]);
    }
  `)
});
const readOf = (parsed) => new Map(Array.isArray(parsed) ? parsed : []);
const a1 = readOf(r1.parsed);
const row1 = (a1.get('rows') ?? [])[0] ?? null;
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

const stageOff = a1.get('stageOff') ?? null;
const writesOff = stageOff?.outcome === 'writesOff' && stageOff?.chunks === 0;
note(
  2,
  'a stage with saving off answers writesOff and sends nothing',
  writesOff ? 'pass' : 'FAIL',
  `machines.stage answered ${JSON.stringify(stageOff)}. The far side reads ${porcelain(far)}`
);
if (!writesOff) fail('a stage with saving off did not answer writesOff');

// ---------------------------------------------------------------------------
// 3. The sentence a person reads for that answer
// ---------------------------------------------------------------------------

const WRITES_OFF_MARK = `Tortie has not been given permission to write on ${MACHINE_LABEL}`;
const threeShot = shotPath('3-writes-off-sentence');
const r3 = await launch({
  shot: threeShot,
  delayMs: 14_000,
  js: `(async () => {
    ${preamble(far)}
    const drawn = await window.__gmuxP103Stage({
      machineId: ID,
      label: ${JSON.stringify(MACHINE_LABEL)},
      path: ${JSON.stringify(far)},
      press: { kind: 'group', group: 'changes' },
      marks: [${JSON.stringify(WRITES_OFF_MARK)}]
    });
    return { prepared: prepared && prepared.class, opened: opened && opened.ok, drawn };
  })()`
});
const d3 = r3.parsed?.drawn ?? null;
const sawSentence =
  d3?.writeOutcome === 'writesOff' &&
  (d3?.marksOnScreen ?? []).includes(WRITES_OFF_MARK);
note(
  3,
  'the panel draws the sentence naming that machine',
  sawSentence ? 'pass' : 'FAIL',
  `the word was ${String(d3?.writeOutcome)}, the sentence under the rows read ` +
    `${JSON.stringify(d3?.writeNote ?? null)}. Photograph ${threeShot} at ` +
    `${String(photographed(threeShot))} bytes. The far side reads ${porcelain(far)}`
);
if (!sawSentence) fail('the writes off sentence was not on screen');

// ---------------------------------------------------------------------------
// 4. Turn saving on, with the folder that holds both repositories
// ---------------------------------------------------------------------------

const fourShot = shotPath('4-saving-on');
const r4 = await launch({
  settings: true,
  shot: fourShot,
  js: settingsDrive(`
    await act('open-writes');
    type('[data-machines-field="write-root"]', ${JSON.stringify(runRoot)});
    await wait(1200);
    await act('allow-writes');
    await wait(1600);
  `)
});
const row4 = (readOf(r4.parsed).get('rows') ?? [])[0] ?? null;
const savingOn = row4?.state === 'confirmed' && row4?.writeRoot === runRoot;
note(
  4,
  'the row reaches confirmed carrying the folder',
  savingOn ? 'pass' : 'FAIL',
  `row ${JSON.stringify(row4)}. Photograph ${fourShot} at ${String(photographed(fourShot))} bytes`
);
if (!savingOn) fail('saving was not turned on, so every row below is about a machine that refuses');

// ---------------------------------------------------------------------------
// 5 and 6. Three groups on screen, and one file on two of their lines
// ---------------------------------------------------------------------------

const fiveShot = shotPath('5-three-groups');
const before7 = porcelain(far);
const r5 = await launch({
  shot: fiveShot,
  delayMs: 14_000,
  js: `(async () => {
    ${preamble(far)}
    const drawn = await window.__gmuxP103Stage({
      machineId: ID,
      label: ${JSON.stringify(MACHINE_LABEL)},
      path: ${JSON.stringify(far)}
    });
    return { prepared: prepared && prepared.class, opened: opened && opened.ok, drawn };
  })()`
});
const d5 = r5.parsed?.drawn ?? null;
const labels = (d5?.groups ?? []).map((g) => g.label);
const threeGroups =
  labels.join(',') === 'Staged,Changes,Untracked' && d5?.writable === true;
note(
  5,
  'three groups on screen at once, in the local panel order',
  threeGroups ? 'pass' : 'FAIL',
  `the groups read ${JSON.stringify(d5?.groups ?? null)} and the header count ` +
    `read ${String(d5?.headerCount)}. Photograph ${fiveShot} at ` +
    `${String(photographed(fiveShot))} bytes`
);
if (!threeGroups) fail('the three groups were not drawn');

const rowsOf = (group) =>
  (d5?.rows ?? []).filter((r) => r.group === group).map((r) => r.name);
const inBoth =
  rowsOf('staged').includes('both.ts') && rowsOf('changes').includes('both.ts');
note(
  6,
  'one file is in Staged and in Changes at the same time',
  inBoth ? 'pass' : 'FAIL',
  `Staged drew ${JSON.stringify(rowsOf('staged'))}, Changes drew ` +
    `${JSON.stringify(rowsOf('changes'))} and Untracked drew ` +
    `${JSON.stringify(rowsOf('untracked'))}. The header count is ` +
    `${String(d5?.headerCount)}, which is one lower than the ` +
    `${String((d5?.rows ?? []).length)} lines, because a file edited twice is ` +
    'one changed file on two lines'
);
if (!inBoth) fail('no file was drawn in two groups at once');

// ---------------------------------------------------------------------------
// 7. The Changes group's button, pressed
// ---------------------------------------------------------------------------

const sevenShot = shotPath('7-after-group-stage');
const r7 = await launch({
  shot: sevenShot,
  delayMs: 16_000,
  js: `(async () => {
    ${preamble(far)}
    const drawn = await window.__gmuxP103Stage({
      machineId: ID,
      label: ${JSON.stringify(MACHINE_LABEL)},
      path: ${JSON.stringify(far)},
      press: { kind: 'group', group: 'changes' }
    });
    return { drawn };
  })()`
});
const d7 = r7.parsed?.drawn ?? null;
const after7 = porcelain(far);
const staged7 = after7.includes('M  src/edited.ts') && after7.includes('M  src/both.ts');
note(
  7,
  'the Changes group button stages every row it names',
  staged7 ? 'pass' : 'FAIL',
  `pressed ${JSON.stringify(d7?.pressed ?? null)} and the word was ` +
    `${String(d7?.writeOutcome)}. Before: ${before7}. After: ${after7}. ` +
    `Photograph ${sevenShot} at ${String(photographed(sevenShot))} bytes`
);
if (!staged7) fail('the Changes group button did not stage its rows');

// ---------------------------------------------------------------------------
// 8. One Staged row's own button, pressed
// ---------------------------------------------------------------------------

const before8 = porcelain(far);
const eightShot = shotPath('8-after-row-unstage');
const r8 = await launch({
  shot: eightShot,
  delayMs: 16_000,
  js: `(async () => {
    ${preamble(far)}
    const drawn = await window.__gmuxP103Stage({
      machineId: ID,
      label: ${JSON.stringify(MACHINE_LABEL)},
      path: ${JSON.stringify(far)},
      press: { kind: 'row', group: 'staged' }
    });
    return { drawn };
  })()`
});
const d8 = r8.parsed?.drawn ?? null;
const after8 = porcelain(far);
const movedOne =
  before8 !== after8 && after8.split(' | ').length === before8.split(' | ').length;
note(
  8,
  "a Staged row's own button unstages that one row",
  movedOne ? 'pass' : 'FAIL',
  `pressed ${JSON.stringify(d8?.pressed ?? null)} and the word was ` +
    `${String(d8?.writeOutcome)}. Before: ${before8}. After: ${after8}. ` +
    `Photograph ${eightShot} at ${String(photographed(eightShot))} bytes`
);
if (!movedOne) fail('one row of the Staged group did not move');

// ---------------------------------------------------------------------------
// 9 and 10. The two menus
// ---------------------------------------------------------------------------

const nineShot = shotPath('9-row-menus');
const r9 = await launch({
  shot: nineShot,
  delayMs: 16_000,
  js: `(async () => {
    ${preamble(far)}
    const staged = await window.__gmuxP103Stage({
      machineId: ID,
      label: ${JSON.stringify(MACHINE_LABEL)},
      path: ${JSON.stringify(far)},
      menuOf: 'staged'
    });
    const changes = await window.__gmuxP103Stage({
      machineId: ID,
      label: ${JSON.stringify(MACHINE_LABEL)},
      path: ${JSON.stringify(far)},
      menuOf: 'changes'
    });
    const untracked = await window.__gmuxP103Stage({
      machineId: ID,
      label: ${JSON.stringify(MACHINE_LABEL)},
      path: ${JSON.stringify(far)},
      menuOf: 'untracked'
    });
    return {
      staged: staged.menu, changes: changes.menu, untracked: untracked.menu
    };
  })()`
});
const stagedMenu = r9.parsed?.staged ?? null;
const changesMenu = r9.parsed?.changes ?? null;
const untrackedMenu = r9.parsed?.untracked ?? null;
const menuOk =
  Array.isArray(stagedMenu) &&
  stagedMenu.includes('Unstage') &&
  !stagedMenu.includes('Open in New Tab');
note(
  9,
  'the menu on a staged row offers Unstage and no Open in New Tab',
  menuOk ? 'pass' : 'FAIL',
  `it read ${JSON.stringify(stagedMenu)}. Open in New Tab is absent because ` +
    'every open from this panel is already a kept tab. Photograph ' +
    `${nineShot} at ${String(photographed(nineShot))} bytes`
);
if (!menuOk) fail('the staged row menu was wrong');

const changesOk =
  Array.isArray(changesMenu) &&
  changesMenu.includes('Stage') &&
  Array.isArray(untrackedMenu) &&
  untrackedMenu.includes('Stage') &&
  untrackedMenu.includes('Open file');
note(
  10,
  'the menu on an unstaged row and on an untracked row offers Stage',
  changesOk ? 'pass' : 'FAIL',
  `Changes read ${JSON.stringify(changesMenu)} and Untracked read ` +
    `${JSON.stringify(untrackedMenu)}`
);
if (!changesOk) fail('the unstaged row menu was wrong');

// ---------------------------------------------------------------------------
// 11. The conflicted row
// ---------------------------------------------------------------------------

const CONFLICT_MARK = 'Tortie will not stage a conflicted file on another machine.';
const elevenShot = shotPath('11-conflicted-row');
const r11 = await launch({
  shot: elevenShot,
  delayMs: 16_000,
  js: `(async () => {
    ${preamble(conflictRepo)}
    const drawn = await window.__gmuxP103Stage({
      machineId: ID,
      label: ${JSON.stringify(MACHINE_LABEL)},
      path: ${JSON.stringify(conflictRepo)},
      menuOf: 'changes'
    });
    return { drawn };
  })()`
});
const d11 = r11.parsed?.drawn ?? null;
const conflicted = (d11?.rows ?? []).find((r) => r.name === 'c.txt') ?? null;
const conflictOk =
  conflicted !== null &&
  conflicted.badge === '!' &&
  conflicted.button === null &&
  String(conflicted.title ?? '').startsWith(CONFLICT_MARK) &&
  Array.isArray(d11?.menu) &&
  !d11.menu.includes('Stage') &&
  !d11.menu.includes('Unstage');
note(
  11,
  'a conflicted row offers neither verb and says why',
  conflictOk ? 'pass' : 'FAIL',
  `the row read ${JSON.stringify(conflicted)}, its menu read ` +
    `${JSON.stringify(d11?.menu ?? null)} and the groups read ` +
    `${JSON.stringify(d11?.groups ?? null)}. The far side reads ` +
    `${porcelain(conflictRepo)}. Photograph ${elevenShot} at ` +
    `${String(photographed(elevenShot))} bytes`
);
if (!conflictOk) fail('the conflicted row was not refused both verbs');

// ---------------------------------------------------------------------------
// 12. The line break refusal, on screen
// ---------------------------------------------------------------------------
//
// EVIDENCE ITEM 15, THIRD BULLET. Three of this phase's refusals are decided in
// main and thrown, and until the fix round every one of them reached the panel
// as the word `unsure`, whose sentence says Tortie asked that machine and it
// did not say it had. That sentence is false for all three, because nothing was
// sent. The store now carries main's own sentence and the panel draws it.

const LINE_BREAK_MARK =
  'Tortie will not stage a file whose name holds a line break';
const twelveShot = shotPath('12-line-break-refusal');
const beforeLineBreak = porcelain(lineBreakRepo);
const r12 = await launch({
  shot: twelveShot,
  delayMs: 16_000,
  js: `(async () => {
    ${preamble(lineBreakRepo)}
    const drawn = await window.__gmuxP103Stage({
      machineId: ID,
      label: ${JSON.stringify(MACHINE_LABEL)},
      path: ${JSON.stringify(lineBreakRepo)},
      press: { kind: 'group', group: 'untracked' },
      marks: [${JSON.stringify(LINE_BREAK_MARK)}]
    });
    return { drawn };
  })()`
});
const d12 = r12.parsed?.drawn ?? null;
const afterLineBreak = porcelain(lineBreakRepo);
const lineBreakOk =
  String(d12?.writeRefusal ?? '').startsWith(LINE_BREAK_MARK) &&
  (d12?.marksOnScreen ?? []).includes(LINE_BREAK_MARK) &&
  beforeLineBreak === afterLineBreak;
note(
  12,
  'a name holding a line break is refused by name, and nothing is sent',
  lineBreakOk ? 'pass' : 'FAIL',
  `pressed ${JSON.stringify(d12?.pressed ?? null)}, the sentence under the ` +
    `rows read ${JSON.stringify(d12?.writeNote ?? null)} and the word was ` +
    `${String(d12?.writeOutcome)}. Before: ${beforeLineBreak}. After: ` +
    `${afterLineBreak}. Photograph ${twelveShot} at ` +
    `${String(photographed(twelveShot))} bytes`
);
if (!lineBreakOk) fail('the line break refusal was not on screen');

// ---------------------------------------------------------------------------
// 13. Teardown
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
  13,
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
