#!/usr/bin/env node
/**
 * `build/probe-p102-shot.mjs`. The Phase 102 photographs, taken by driving the
 * REAL app against a real machine on 127.0.0.1.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT PROVES
 * ---------------------------------------------------------------------------
 * A person turns saving on for one machine by pressing the real controls, opens
 * a folder on that machine as a project tab, and the Explorer then draws a New
 * folder button they can press. The two new channels are then driven through
 * the real preload against that machine, and every answer word this phase can
 * produce is read back and reported with the far side's own state beside it.
 *
 *   #   what is read                                     read from
 *   --  ----------------------------------------------  --------------------
 *    0  the operator's session count before             tmux, read only
 *    1  the row reaches confirmed with the folder on it the Settings window
 *    2  the folder on the machine opens as a tab        the app window
 *    3  New folder is pressable and its title is plain  the document
 *    4  makeDir answers made, with the parent's mode    the machine
 *    5  the same call again answers exists              the machine
 *    6  a parent at mode 500 answers denied             the machine
 *    7  a path outside the folder answers outsideRoot   main, nothing sent
 *    8  a parent that is gone answers noparent          the machine
 *    9  renameEntry answers moved, and ls agrees        the machine
 *   10  the same call again answers done                the machine
 *   11  a taken destination answers exists, both intact the machine
 *   12  a source that is gone answers gone              the machine
 *   13  a case only rename answers moved, one entry     the machine
 *   14  the tree draws the new folder after a refresh   the document
 *   15  both verbs answer writesOff with no folder yet   the machine
 *   16  a move another hand made answers done            the machine
 *   17  Stop saving clears it and the next write refuses the machine
 *   18  the operator's session count after               tmux, read only
 *
 * Rows 15 to 17 are the backlog entry's evidence items 17 and 14, driven in the
 * app rather than argued from a unit test.
 *
 * Row 15 is read between the confirm and the folder in the first launch,
 * because that is the only state where a machine is confirmed and no folder is.
 * Row 17 measured something nobody predicted, being that Stop saving takes the
 * folder out of the fields the confirm hash covers, so the machine reads
 * unconfirmed afterwards and the next write is refused by the connection gate
 * rather than by the folder gate.
 *
 * Row 16's move is made from this process with `/bin/mv` rather than through
 * Tortie, which is the end state a lost answer leaves behind.
 *
 * WHAT ROWS 15 AND 17 DO NOT READ. `remoteEntrySendCount` lives in main and no
 * renderer can read it, so it is read by `build/probe-p102-entry.mjs` leg 18
 * and by `src/main/machines/__tests__/p102-remote-entry.test.ts`. What these
 * rows prove is the answer word and that the far side did not change.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES NOT PROVE, and the report says so
 * ---------------------------------------------------------------------------
 * IT DRIVES THE CHANNELS, NOT THE GESTURES. The context menu is a native macOS
 * menu, so a window capture cannot photograph it, and the inline rename editor
 * is opened by @pierre/trees from a real key press this harness cannot deliver.
 * What is proven here is that the two channels cross from the real renderer,
 * through the real preload, to a real machine, and what each answer word is.
 * That the menu offers the verbs is proved by
 * `src/renderer/tree/__tests__/p903-b-tree-menu-remote.test.ts`, and that each
 * answer draws its own sentence by
 * `src/renderer/tree/__tests__/p102-remote-entry.test.ts`.
 *
 * THE FAR SIDE IS THIS MAC. Every answer below is a macOS far side reached over
 * loopback. No Linux machine is contacted, so the `stat` spellings and the
 * `${d%/*}` expansion are unverified off macOS.
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
 *  5. Every file written on the far side sits under this run's own scratch
 *     folder. Nothing under the operator's home is written.
 *  6. `-L gmux` appears in exactly one place, a read only session count taken
 *     before and after, which must match.
 *  7. The one `/bin/mv` in this file moves a file this run made, inside this
 *     run's own scratch folder, and it names no path outside it.
 *
 * Every scratch file carries a `p102-` prefix.
 *
 * Usage, from the repository root:
 *
 *   npm run build
 *   npm run probe:p102shot
 *
 * Exit code 0 when every row passes. 1 when one does not. 2 when it refuses.
 */

import { spawn, spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p102shot]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const refuse = (why) => {
  process.stderr.write(`${TAG} ${why}\n`);
  process.exit(2);
};

// ---------------------------------------------------------------------------
// The socket and the machine. Only build/harness-socket.mjs may hand out a
// socket, and only build/with-scratch-machine.mjs may start the machine, so a
// run that arrives without either wraps itself in both and inherits their
// teardown.
// ---------------------------------------------------------------------------

const CARRIAGE = 'p102-carriage.json';
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
const configRoot = (process.env['GMUX_CONFIG_ROOT'] ?? '').trim();
const carriagePath = configRoot === '' ? '' : join(configRoot, CARRIAGE);

if (socket === '' || carriagePath === '' || !existsSync(carriagePath)) {
  const inner =
    'export GMUX_CONFIG_ROOT="${GMUX_CONFIG_ROOT:-$GMUX_HARNESS_DIR}"; ' +
    `node build/with-scratch-machine.mjs --carriage ${CARRIAGE} -- ` +
    'node build/probe-p102-shot.mjs';
  say('no harness socket or no machine, so this run wraps itself in both');
  const wrapped = spawnSync(
    process.execPath,
    [join(repoRoot, 'build', 'harness-socket.mjs'), '--fresh', 'gmux-p102-shot', inner],
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
// The far side, which is a scratch folder under this run's own root
// ---------------------------------------------------------------------------

const runRoot = join(configRoot, 'p102-shot');
rmSync(runRoot, { recursive: true, force: true });
const far = join(runRoot, 'far');
const profile = join(runRoot, 'profile');
const outDir = join(repoRoot, 'out');
mkdirSync(join(far, 'src'), { recursive: true });
mkdirSync(join(far, 'taken'), { recursive: true });
mkdirSync(join(far, 'locked'), { recursive: true });
mkdirSync(join(profile, 'gmux', 'config'), { recursive: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(join(far, 'README.md'), '# p102 fixture\n', 'utf8');
writeFileSync(join(far, 'src', 'a.ts'), 'export const a = 1;\n', 'utf8');
writeFileSync(join(far, 'taken', 'keep.txt'), 'keep me\n', 'utf8');
chmodSync(join(far, 'locked'), 0o500);

const outside = join(runRoot, 'outside');
mkdirSync(outside, { recursive: true });

const MACHINE_ID = 'p102';
const MACHINE_LABEL = 'Scratch';
const machinesJson = join(profile, 'gmux', 'config', 'machines.json');
writeFileSync(
  machinesJson,
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

// The machine's identity, in TORTIE'S OWN known hosts file, seeded the way
// src/main/harness/p93-remote-clear.ts seeds it. Tortie never reads the
// person's ~/.ssh/known_hosts and never writes to it. Without this file the
// app's ssh refuses an unknown host key in about 23 ms, and prepare then
// answers version-unmeasured while the machine is perfectly reachable.
mkdirSync(join(profile, 'gmux', 'machines'), { recursive: true });
writeFileSync(
  join(profile, 'gmux', 'machines', 'known-machines'),
  spawnSync('/usr/bin/ssh-keyscan', ['-p', String(carriage.port), carriage.host], {
    encoding: 'utf8',
    timeout: 30_000
  }).stdout ?? '',
  'utf8'
);

const recordedPids = [];
const failures = [];
const rows = [];

function note(n, what, verdict, detail) {
  rows.push({ n, what, verdict, detail });
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

const sessionsBefore = operatorSessions();
note(0, "the operator's session count before", 'read', sessionsBefore);

/** `ls -ld` in octal, or null when the path is not there. */
function modeOf(path) {
  if (!existsSync(path)) return null;
  return (statSync(path).mode & 0o7777).toString(8);
}
function listing(path) {
  return sh('/bin/sh', ['-c', `ls -A ${JSON.stringify(path)} 2>/dev/null`])
    .stdout.split('\n')
    .map((one) => one.trim())
    .filter((one) => one !== '');
}

// ---------------------------------------------------------------------------
// One launch, one photograph
// ---------------------------------------------------------------------------

function launch({ shot, js, settings, timeoutMs = 180_000, delayMs = 8000 }) {
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

const shotPath = (name) => join(outDir, `p102-${name}.png`);
const photographed = (path) =>
  existsSync(path) && statSync(path).size > 0 ? statSync(path).size : 0;

// ---------------------------------------------------------------------------
// 1. Turn saving on by pressing the real controls
// ---------------------------------------------------------------------------

const one = shotPath('1-saving-on');
const r1 = await launch({
  settings: true,
  shot: one,
  js: `(async () => {
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
    try {
      const rail = Array.from(document.querySelectorAll('button, [role="tab"], li, a'))
        .find((n) => (n.textContent || '').trim() === 'Machines');
      if (rail) { rail.click(); await wait(800); }
      const toggle = document.querySelector('[data-machines-action="toggle-lines"]');
      if (toggle && toggle.getAttribute('aria-expanded') !== 'true') {
        toggle.click();
        await wait(600);
      }
      await act('confirm');
      await wait(1200);
      // BOTH VERBS ON A CONFIRMED MACHINE WITH NO CONFIRMED FOLDER, which is
      // the state of every machine in every build before Phase 101 and is the
      // backlog entry's evidence item 17. It is read here rather than after a
      // Stop saving, because Stop saving clears the folder from the hashed
      // fields and the machine then needs confirming again, which is a
      // different refusal.
      const off = [];
      const call = async (name, fn) => {
        try { off.push([name, await fn()]); }
        catch (err) { off.push([name, { threw: String((err && err.message) || err) }]); }
      };
      await call('makeDirOff', () => m().makeDir({
        machineId: ${JSON.stringify(MACHINE_ID)}, path: ${JSON.stringify(far)} + '/before-writes'
      }));
      await call('renameOff', () => m().renameEntry({
        machineId: ${JSON.stringify(MACHINE_ID)},
        from: ${JSON.stringify(far)} + '/README.md',
        to: ${JSON.stringify(far)} + '/REFUSED.md',
        kind: 'file'
      }));
      await act('open-writes');
      type('[data-machines-field="write-root"]', ${JSON.stringify(far)});
      await wait(1200);
      await act('allow-writes');
      await wait(1600);
      const listed = await m().rows();
      return JSON.stringify({
        off,
        rows: listed.rows.map((r) => ({
          id: r.id, state: r.state, usable: r.usable, writeRoot: r.writeRoot
        }))
      });
    } catch (err) {
      return JSON.stringify({ error: String((err && err.message) || err) });
    }
  })()`
});
const row1 = (r1.parsed?.rows ?? [])[0] ?? null;
const savingOn = row1?.state === 'confirmed' && row1?.writeRoot === far;
if (!savingOn) {
  fail(
    'the machine did not reach the confirmed state carrying the folder, so ' +
      `nothing below is driven through a confirmed row. The driver answered ${JSON.stringify(r1.parsed)}`
  );
}
note(
  1,
  'the row reaches confirmed carrying the folder',
  savingOn ? 'pass' : 'FAIL',
  `row ${JSON.stringify(row1)}. Photograph ${one} at ${String(photographed(one))} bytes`
);

// ---------------------------------------------------------------------------
// 2 to 14. The tab, the button and every answer word, in one driven launch
// ---------------------------------------------------------------------------

const two = shotPath('2-explorer-after-write');
const r2 = await launch({
  shot: two,
  delayMs: 12_000,
  js: `(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const M = () => window.gmux.machines;
    const FAR = ${JSON.stringify(far)};
    const OUT = ${JSON.stringify(outside)};
    const ID = ${JSON.stringify(MACHINE_ID)};
    const read = [];
    try {
      // The connection first. addRemote reads that folder over the same link,
      // so a machine that has not been prepared answers notConnected.
      const prepared = await M().prepare(ID);
      read.push(['prepared', prepared && prepared.class === 'prepared'
        ? 'ok'
        : JSON.stringify(prepared)]);
      await wait(2000);
      const opened = await window.gmux.projects.addRemote({
        machineId: ID, path: FAR
      });
      read.push(['opened', opened && opened.ok === true
        ? 'ok'
        : JSON.stringify(opened)]);
      await wait(3000);
      // Opening a folder makes the tab. It does not make that tab the ACTIVE
      // one, so the Explorer is not on screen until the recent row is pressed
      // and the Explorer button in the activity rail is pressed after it.
      const recent = document.querySelector('.home-row.home-recent');
      read.push(['recentFound', recent !== null]);
      if (recent !== null) { recent.click(); await wait(6000); }
      const explorer = Array.from(document.querySelectorAll('button'))
        .find((n) => (n.getAttribute('aria-label') || '').startsWith('Explorer'));
      read.push(['explorerFound', explorer !== undefined]);
      if (explorer) { explorer.click(); await wait(5000); }
      const button = Array.from(document.querySelectorAll('button'))
        .find((n) => n.getAttribute('aria-label') === 'New folder');
      read.push(['newFolderButton', button === undefined ? null : {
        title: button.getAttribute('title'),
        disabled: button.disabled === true
      }]);
      const call = async (name, fn) => {
        try { read.push([name, await fn()]); }
        catch (err) { read.push([name, { threw: String((err && err.message) || err) }]); }
      };
      await call('madeOnce', () => M().makeDir({ machineId: ID, path: FAR + '/notes' }));
      await call('madeTwice', () => M().makeDir({ machineId: ID, path: FAR + '/notes' }));
      await call('denied', () => M().makeDir({ machineId: ID, path: FAR + '/locked/x' }));
      await call('outsideRoot', () => M().makeDir({ machineId: ID, path: OUT + '/x' }));
      await call('noparent', () => M().makeDir({ machineId: ID, path: FAR + '/gone/x' }));
      await call('moved', () => M().renameEntry({
        machineId: ID, from: FAR + '/README.md', to: FAR + '/NOTES.md', kind: 'file'
      }));
      await call('movedAgain', () => M().renameEntry({
        machineId: ID, from: FAR + '/README.md', to: FAR + '/NOTES.md', kind: 'file'
      }));
      await call('renameExists', () => M().renameEntry({
        machineId: ID, from: FAR + '/NOTES.md', to: FAR + '/taken/keep.txt', kind: 'file'
      }));
      await call('renameGone', () => M().renameEntry({
        machineId: ID, from: FAR + '/nothing.md', to: FAR + '/still-nothing.md', kind: 'file'
      }));
      await call('caseOnly', () => M().renameEntry({
        machineId: ID, from: FAR + '/NOTES.md', to: FAR + '/notes.md', kind: 'file'
      }));
      const refresh = Array.from(document.querySelectorAll('button'))
        .find((n) => (n.getAttribute('aria-label') || '') === 'Refresh files');
      read.push(['refreshFound', refresh !== undefined]);
      if (refresh) { refresh.click(); await wait(3000); }
      // The parent folder re-read, timed on its own. That is evidence 20.
      const t0 = performance.now();
      const listed = await M().listTree({ machineId: ID, root: FAR, depth: 1 });
      read.push(['listTreeMs', Math.round(performance.now() - t0)]);
      // The tree rows are drawn by @pierre/trees inside a shadow root, so
      // document.body.innerText cannot see them. This walks every open shadow
      // root once and reads their text.
      const shadowText = (() => {
        let text = '';
        const walk = (node) => {
          for (const el of node.querySelectorAll('*')) {
            if (el.shadowRoot) { text += el.shadowRoot.textContent || ''; walk(el.shadowRoot); }
          }
        };
        walk(document);
        return text;
      })();
      read.push(['treeText',
        (document.body.innerText || '').includes('notes') || shadowText.includes('notes')]);
      return read;
    } catch (err) {
      read.push(['error', String((err && err.message) || err)]);
      return read;
    }
  })()`
});

const answers = new Map(Array.isArray(r2.parsed) ? r2.parsed : []);
const word = (name) => {
  const value = answers.get(name);
  return value !== undefined && value !== null && typeof value === 'object'
    ? (value.outcome ?? JSON.stringify(value))
    : String(value);
};

say(`machines.prepare answered ${JSON.stringify(answers.get('prepared') ?? null)}`);
say(
  `the recent row was found: ${String(answers.get('recentFound') ?? null)}, and ` +
    `the Explorer button was found: ${String(answers.get('explorerFound') ?? null)}`
);

note(
  2,
  'the folder on the machine opens as a project tab',
  answers.get('opened') === 'ok' ? 'pass' : 'FAIL',
  `projects.addRemote answered ${JSON.stringify(answers.get('opened') ?? null)}`
);
if (answers.get('opened') !== 'ok') {
  fail('the tab did not open, so every row below is about a tab that is not there');
}

const button = answers.get('newFolderButton') ?? null;
const buttonOk = button !== null && button.disabled === false && button.title === 'New folder';
if (!buttonOk) fail(`the New folder button reads ${JSON.stringify(button)}`);
note(
  3,
  'New folder is pressable and its title is the plain one',
  buttonOk ? 'pass' : 'FAIL',
  `the button reads ${JSON.stringify(button)}. Before this phase its title was ` +
    `"Tortie cannot make a folder on ${MACHINE_LABEL}." and it was off`
);

const cases = [
  [4, 'madeOnce', 'made', () => `the folder is ${String(modeOf(join(far, 'notes')))} and its parent is ${String(modeOf(far))}`],
  [5, 'madeTwice', 'exists', () => `the folder is still ${String(modeOf(join(far, 'notes')))}`],
  [6, 'denied', 'denied', () => `${join(far, 'locked')} is mode ${String(modeOf(join(far, 'locked')))} and holds ${JSON.stringify(listing(join(far, 'locked')))}`],
  [7, 'outsideRoot', 'outsideRoot', () => `${outside} holds ${JSON.stringify(listing(outside))}`],
  [8, 'noparent', 'noparent', () => `${join(far, 'gone')} exists: ${String(existsSync(join(far, 'gone')))}`],
  [9, 'moved', 'moved', () => `the folder holds ${JSON.stringify(listing(far))}`],
  [10, 'movedAgain', 'done', () => `the folder still holds ${JSON.stringify(listing(far))}`],
  [11, 'renameExists', 'exists', () => `taken holds ${JSON.stringify(listing(join(far, 'taken')))}`],
  [12, 'renameGone', 'gone', () => `nothing.md exists: ${String(existsSync(join(far, 'nothing.md')))}`],
  [13, 'caseOnly', 'moved', () => `the folder holds ${JSON.stringify(listing(far))}`]
];
for (const [n, name, want, detail] of cases) {
  const got = word(name);
  const ok = got === want;
  if (!ok) fail(`${name} answered ${got} and the design says ${want}`);
  note(n, `${name} answers ${want}`, ok ? 'pass' : 'FAIL', `${got}. ${detail()}`);
}

const drew = answers.get('treeText') === true && photographed(two) > 0;
if (!drew) fail('the Explorer did not draw the new folder after a refresh');
note(
  14,
  'the tree draws the new folder after a refresh',
  drew ? 'pass' : 'FAIL',
  `the window text names it: ${String(answers.get('treeText'))}. The Refresh ` +
    `files button was found: ${String(answers.get('refreshFound') ?? null)}. The ` +
    `parent folder re-read took ${String(answers.get('listTreeMs') ?? 'unmeasured')} ms. ` +
    `Photograph ${two} at ${String(photographed(two))} bytes`
);

// ---------------------------------------------------------------------------
// 15. Both verbs on a confirmed machine with no confirmed folder, read out of
// the first launch, which attempted them between the confirm and the folder.
// ---------------------------------------------------------------------------

{
  const pairs = new Map(Array.isArray(r1.parsed?.off) ? r1.parsed.off : []);
  const wordOf = (name) => {
    const value = pairs.get(name);
    return value !== undefined && value !== null && typeof value === 'object'
      ? (value.outcome ?? JSON.stringify(value))
      : String(value);
  };
  const made = wordOf('makeDirOff');
  const renamed = wordOf('renameOff');
  const untouched =
    !existsSync(join(far, 'before-writes')) && !existsSync(join(far, 'REFUSED.md'));
  const ok = made === 'writesOff' && renamed === 'writesOff' && untouched;
  if (!ok) {
    fail(
      `on a machine with no confirmed folder, makeDir answered ${made} and ` +
        `renameEntry answered ${renamed}, and the far side untouched reads ` +
        String(untouched)
    );
  }
  note(
    15,
    'both verbs answer writesOff with no confirmed folder',
    ok ? 'pass' : 'FAIL',
    `makeDir ${made} and renameEntry ${renamed}. before-writes exists: ` +
      `${String(existsSync(join(far, 'before-writes')))} and REFUSED.md exists: ` +
      `${String(existsSync(join(far, 'REFUSED.md')))}`
  );
}

// ---------------------------------------------------------------------------
// 16 and 17. A move somebody else already made, and what Stop saving leaves.
// One launch, and it is the Settings window because that is where the Stop
// saving control is.
// ---------------------------------------------------------------------------

// The lost answer, reproduced without cutting a live connection. This `mv` runs
// from THIS process rather than through Tortie, so when the app is asked to do
// the same rename the machine already holds the end state and no answer from
// Tortie's own send was ever seen. That is what a lost answer leaves behind.
writeFileSync(join(far, 'hand.md'), '# moved by another hand\n', 'utf8');
const byHand = sh('/bin/mv', [join(far, 'hand.md'), join(far, 'hand-moved.md')]);
say(`the move made outside Tortie exited ${String(byHand.code)}`);

const three = shotPath('3-stop-saving');
const r3 = await launch({
  settings: true,
  shot: three,
  delayMs: 10_000,
  js: `(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const M = () => window.gmux.machines;
    const FAR = ${JSON.stringify(far)};
    const ID = ${JSON.stringify(MACHINE_ID)};
    const read = [];
    const call = async (name, fn) => {
      try { read.push([name, await fn()]); }
      catch (err) { read.push([name, { threw: String((err && err.message) || err) }]); }
    };
    try {
      // The machine still carries its confirmed folder here, so this is the
      // repeat of a rename another hand already completed.
      await call('lostAnswer', () => M().renameEntry({
        machineId: ID, from: FAR + '/hand.md', to: FAR + '/hand-moved.md', kind: 'file'
      }));
      const rail = Array.from(document.querySelectorAll('button, [role="tab"], li, a'))
        .find((n) => (n.textContent || '').trim() === 'Machines');
      if (rail) { rail.click(); await wait(800); }
      const toggle = document.querySelector('[data-machines-action="toggle-lines"]');
      if (toggle && toggle.getAttribute('aria-expanded') !== 'true') {
        toggle.click();
        await wait(600);
      }
      const stop = document.querySelector('[data-machines-action="stop-saving"]');
      read.push(['stopFound', stop !== null]);
      if (stop !== null) { stop.click(); await wait(2000); }
      const listed = await M().rows();
      const row = (listed.rows || [])[0] || null;
      read.push(['writeRootAfterStop', row === null ? 'no row' : String(row.writeRoot)]);
      read.push(['stateAfterStop', row === null ? 'no row' : String(row.state)]);
      await call('makeDirAfterStop', () => M().makeDir({
        machineId: ID, path: FAR + '/after-stop'
      }));
      // A SETTINGS driver's answer is printed with String(), so an array comes
      // back comma joined and unparseable. Every settings driver in this repo
      // returns a JSON string for that reason.
      return JSON.stringify(read);
    } catch (err) {
      read.push(['error', String((err && err.message) || err)]);
      return JSON.stringify(read);
    }
  })()`
});

const off = new Map(Array.isArray(r3.parsed) ? r3.parsed : []);
const offWord = (name) => {
  const value = off.get(name);
  return value !== undefined && value !== null && typeof value === 'object'
    ? (value.outcome ?? JSON.stringify(value))
    : String(value);
};

{
  const got = offWord('lostAnswer');
  const ok = got === 'done' && !existsSync(join(far, 'hand.md'))
    && existsSync(join(far, 'hand-moved.md'));
  if (!ok) fail(`a rename another hand had already made answered ${got}`);
  note(
    16,
    'a rename another hand already made answers done',
    ok ? 'pass' : 'FAIL',
    `${got}. hand.md is there: ${String(existsSync(join(far, 'hand.md')))} and ` +
      `hand-moved.md is there: ${String(existsSync(join(far, 'hand-moved.md')))}`
  );
}

{
  // MEASURED HERE AND NOT PREDICTED. Stop saving takes the folder out of the
  // fields the confirm hash covers, so the agreement no longer matches the row
  // and the machine reads unconfirmed. A write attempted afterwards is refused
  // by the connection gate rather than by the folder gate, and the sentence a
  // person reads says nobody has confirmed the machine. Both refusals leave the
  // far side untouched, which is what this row proves.
  const stopped = off.get('stopFound') === true;
  const cleared = String(off.get('writeRootAfterStop') ?? '') === 'null';
  const after = offWord('makeDirAfterStop');
  const untouched = !existsSync(join(far, 'after-stop'));
  const refused = after !== 'made' && after !== 'exists';
  const ok = stopped && cleared && refused && untouched;
  if (!ok) {
    fail(
      `Stop saving was found: ${String(stopped)}, the folder cleared: ` +
        `${String(cleared)}, and makeDir afterwards answered ${after}`
    );
  }
  note(
    17,
    'Stop saving clears the folder and the next write is refused',
    ok ? 'pass' : 'FAIL',
    `the row reads writeRoot ${String(off.get('writeRootAfterStop') ?? null)} and ` +
      `state ${String(off.get('stateAfterStop') ?? null)}. makeDir answered ` +
      `${after}. after-stop exists: ${String(existsSync(join(far, 'after-stop')))}. ` +
      `Photograph ${three} at ${String(photographed(three))} bytes`
  );
}

// ---------------------------------------------------------------------------
// The end
// ---------------------------------------------------------------------------

for (const pid of [...recordedPids].reverse()) {
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    /* already gone, which is the state we wanted */
  }
}

const sessionsAfter = operatorSessions();
const same = sessionsBefore === sessionsAfter;
if (!same) {
  fail(
    `the operator's server held ${sessionsBefore} session(s) before this probe ` +
      `and ${sessionsAfter} after it`
  );
}
note(18, "the operator's session count after", same ? 'pass' : 'FAIL', sessionsAfter);

process.stdout.write('\n#   what                                                          verdict\n');
process.stdout.write('-'.repeat(90) + '\n');
for (const row of rows) {
  process.stdout.write(
    `${String(row.n).padEnd(4)}${String(row.what).padEnd(62)}${row.verdict}\n`
  );
}

say(`profile: ${profile}, and the operator's own was never opened`);
say(`far side: ${far}, and nothing outside this run's root was written`);
say(
  'NOT DRIVEN HERE: the native context menu cannot be photographed and the ' +
    'inline rename editor needs a key press this harness cannot deliver. The ' +
    'menu is proved by the tree menu test and the sentences by the entry test.'
);

if (!process.argv.includes('--keep')) {
  try {
    rmSync(runRoot, { recursive: true, force: true });
  } catch {
    /* a scratch directory that will not go is not a result */
  }
}

if (failures.length > 0) {
  process.stdout.write(`\nFAIL, ${String(failures.length)}:\n`);
  for (const one of failures) process.stdout.write(`  - ${one}\n`);
  process.exit(1);
}

process.stdout.write(
  '\nPASS. A person turned saving on for one machine by pressing the real ' +
    'controls, opened a folder on that machine, and the Explorer drew a New ' +
    'folder button they can press. Both new channels crossed to that machine ' +
    'and every answer word this phase can produce was read back with the far ' +
    "side's own state beside it.\n"
);
process.exit(0);
