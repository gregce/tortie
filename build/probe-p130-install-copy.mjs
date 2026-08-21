#!/usr/bin/env node
/**
 * `node build/probe-p130-install-copy.mjs`. Phase 130 item 1, driven in the
 * REAL app window.
 *
 * ---------------------------------------------------------------------------
 * WHAT THE OPERATOR READ
 * ---------------------------------------------------------------------------
 * He pointed at an agent that is not installed on the Sessions screen and read
 * this under the board:
 *
 *   Droid is not installed. Copy this command and run it in a terminal.
 *   curl -f…
 *   Tortie does not run install commands for you.
 *
 * The command was cut to eight characters and there was nothing to press. The
 * sentence above it asked him to do a thing the screen made impossible. This
 * probe is the proof that both halves are fixed.
 *
 * ---------------------------------------------------------------------------
 * THE TABLE, and every cell is read off the running app or off the pasteboard
 * ---------------------------------------------------------------------------
 *   #  what must be true                                     read from
 *   -- --------------------------------------------------    ---------------
 *    1 a tile that is not installed is on the board          the document
 *    2 the caption draws the WHOLE command                   the document
 *    3 the command equals the registry's own command         the registry
 *    4 nothing is cut off, scrollWidth <= clientWidth        the document
 *    5 the caption no longer draws .agent-missing-cmd        the document
 *    6 the copy control names the agent out loud             the document
 *    7 one press puts the command on the system pasteboard   pbpaste
 *    8 the operator's session count did not move             tmux, read only
 *    9 the operator's clipboard is back as he left it        pbpaste
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS PROBE DOES NOT PROVE, and the report has to say so
 * ---------------------------------------------------------------------------
 * IT NEVER INSTALLS ANYTHING. No install command runs, no package manager
 * starts and no network request is made on any agent's behalf. What is proven
 * here is what a person READS and what one press puts on the pasteboard.
 *
 * It also does not decide whether the caption LOOKS right. Two photographs are
 * written, out/p130-1-install-caption.png and out/p130-2-copied.png, and a
 * person reads them. A measured scrollWidth and a human reading the command
 * off the photograph are two different proofs, and this item needs both.
 *
 * ---------------------------------------------------------------------------
 * SAFETY, and none of it is optional
 * ---------------------------------------------------------------------------
 *  - THE OPERATOR'S CLIPBOARD IS SAVED AND PUT BACK. navigator.clipboard
 *    .writeText writes the real system pasteboard, so this probe would
 *    otherwise take his clipboard away from him. It is read with pbpaste
 *    before anything starts and written back with pbcopy at the end, on the
 *    failure path as well as the passing one.
 *  - Without GMUX_TMUX_SOCKET this script re-runs itself through
 *    build/harness-socket.mjs, so the socket is always one that script
 *    composed and it can never be `gmux` or `default`.
 *  - Every launch gets its own --user-data-dir under /tmp. The operator's
 *    profile and the installed app are never opened.
 *  - `-L gmux` appears in exactly one place, a read only session count taken
 *    before and after, which must match.
 *  - Only the pids this run recorded are signalled. No pkill, no kill-server.
 *  - Every scratch file carries a `p130-` prefix.
 *
 * Usage, from the repository root:
 *
 *   npm run build
 *   node build/probe-p130-install-copy.mjs
 *
 * Exit 0 when every row passes, 1 when one does not, 2 when the probe refuses
 * to run at all.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[p130-install-copy]';

const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const refuse = (why) => {
  process.stderr.write(`${TAG} ${why}\n`);
  process.exit(2);
};

// ---------------------------------------------------------------------------
// The socket. Only build/harness-socket.mjs hands one out.
// ---------------------------------------------------------------------------

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET, so this run wraps itself in the harness script');
  const wrapped = spawnSync(
    process.execPath,
    [
      join(repoRoot, 'build', 'harness-socket.mjs'),
      'gmux-p130-shot',
      'node build/probe-p130-install-copy.mjs'
    ],
    { cwd: repoRoot, stdio: 'inherit' }
  );
  process.exit(wrapped.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to measure on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

// ---------------------------------------------------------------------------
// The operator's own things: counted, saved, and put back
// ---------------------------------------------------------------------------

/** The operator's live server, listed and never written. The ONLY use here. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], {
    encoding: 'utf8'
  });
  return (out.stdout ?? '')
    .split('\n')
    .filter((line) => line.trim() !== '').length;
}

const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);

const clipboardBefore =
  spawnSync('pbpaste', [], { encoding: 'utf8' }).stdout ?? '';
say(
  `the operator's clipboard held ${String(clipboardBefore.length)} bytes ` +
    'before this run, and it is put back at the end'
);

let clipboardRestored = false;
function restoreClipboard() {
  if (clipboardRestored) return;
  clipboardRestored = true;
  spawnSync('pbcopy', [], { input: clipboardBefore });
}
process.on('exit', restoreClipboard);
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    restoreClipboard();
    process.exit(1);
  });
}

// ---------------------------------------------------------------------------
// Ground truth: the registry's own command, and the label the board draws
// ---------------------------------------------------------------------------

/** id -> the canonical install command, straight out of the compiled registry. */
function registryCommands() {
  const out = spawnSync(
    'npx',
    [
      'tsx',
      '--tsconfig',
      'tsconfig.node.json',
      'build/installs-conformance-probe.mts'
    ],
    { encoding: 'utf8', cwd: repoRoot }
  );
  if (out.status !== 0) {
    refuse(`the registry probe did not run: ${out.stderr ?? ''}`);
  }
  const rows = JSON.parse(out.stdout ?? '{}').rows ?? [];
  const byId = new Map();
  for (const row of rows) {
    if (row.canonical !== null && row.canonical !== undefined) {
      byId.set(row.id, row.canonical.command);
    }
  }
  return byId;
}

/**
 * The short chip label the board draws -> the registry id. Read out of
 * SEED_AGENTS in src/renderer/state/agents.ts, which is the one table those
 * labels come from.
 */
function labelToId() {
  const source = readFileSync(
    join(repoRoot, 'src', 'renderer', 'state', 'agents.ts'),
    'utf8'
  );
  const map = new Map();
  const pattern = /\{\s*id:\s*'([^']+)',\s*label:\s*'([^']+)'/g;
  for (;;) {
    const hit = pattern.exec(source);
    if (hit === null) break;
    map.set(hit[2], hit[1]);
  }
  return map;
}

const COMMANDS = registryCommands();
const IDS = labelToId();

// ---------------------------------------------------------------------------
// The scratch project and profile
// ---------------------------------------------------------------------------

const scratch = join('/tmp', `p130-shot-${String(process.pid)}`);
const project = join(scratch, 'p130-project');
const profile = join(scratch, 'p130-profile');
const outDir = join(repoRoot, 'out');
mkdirSync(project, { recursive: true });
mkdirSync(profile, { recursive: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(join(project, 'README.md'), '# p130 install caption fixture\n');

const recordedPids = [];
const failures = [];
const rows = [];

function check(n, claim, pass, detail) {
  rows.push({ n, claim, verdict: pass ? 'pass' : 'FAIL', detail });
  if (!pass) failures.push(`${String(n)}. ${claim}. ${detail}`);
  say(`${String(n)}. ${claim}: ${pass ? 'pass' : 'FAIL'}. ${detail}`);
}

// ---------------------------------------------------------------------------
// One launch, one photograph, one reading
// ---------------------------------------------------------------------------

const electronBin = join(repoRoot, 'node_modules', '.bin', 'electron');

/**
 * The pid that owns the window. node_modules/.bin/electron is a Node shim
 * that spawns the Electron binary as its one child. The pid is read so the
 * window can be raised, which is what makes document.hasFocus() true, which
 * is what the clipboard write needs. It is never killed here: the shot
 * harness quits the app itself.
 */
function guiPid(shimPid) {
  const out = spawnSync('pgrep', ['-P', String(shimPid)], { encoding: 'utf8' });
  const first = (out.stdout ?? '')
    .split('\n')
    .map((line) => Number(line.trim()))
    .find((n) => Number.isInteger(n) && n > 0);
  return first ?? shimPid;
}

function raise(shimPid) {
  const pid = guiPid(shimPid);
  spawnSync(
    'osascript',
    [
      '-e',
      'tell application "System Events" to set frontmost of (first ' +
        `process whose unix id is ${String(pid)}) to true`
    ],
    { encoding: 'utf8', timeout: 10_000 }
  );
}

function drive({ shot, js, timeoutMs = 180_000 }) {
  return new Promise((done) => {
    const child = spawn(
      electronBin,
      ['.', `--user-data-dir=${profile}`, '-ApplePersistenceIgnoreState', 'YES'],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          GMUX_SHOT: shot,
          GMUX_SHOT_DELAY_MS: '5000',
          GMUX_SHOT_DRIVE: JSON.stringify({ projectPath: project }),
          GMUX_SHOT_JS: js
        },
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    recordedPids.push(child.pid);
    // The window is raised three times while the app settles. The clipboard
    // write refuses on a document that is not focused, and the harness only
    // raises the window AFTER the driver has run.
    const raises = [4_000, 9_000, 15_000].map((ms) =>
      setTimeout(() => raise(child.pid), ms)
    );
    let text = '';
    const onText = (chunk) => {
      text += String(chunk);
    };
    child.stdout.on('data', onText);
    child.stderr.on('data', onText);
    const watchdog = setTimeout(() => {
      try {
        process.kill(child.pid, 'SIGKILL');
      } catch {
        /* already gone, which is the state we wanted */
      }
    }, timeoutMs);
    child.on('exit', (code) => {
      clearTimeout(watchdog);
      for (const timer of raises) clearTimeout(timer);
      // The session server inherits these pipes and outlives the app, so they
      // are destroyed by hand. Without this node never exits.
      child.stdout.destroy();
      child.stderr.destroy();
      const marker = '[gmux-shot] probe ';
      const at = text.lastIndexOf(marker);
      let reading = null;
      if (at !== -1) {
        const line = text.slice(at + marker.length).split('\n')[0] ?? '';
        try {
          reading = JSON.parse(line);
        } catch {
          reading = null;
        }
      }
      setTimeout(() => done({ code, text, reading }), 750);
    });
  });
}

/** The shared driver preamble, wrapped so one expression is handed to main. */
function driver(body) {
  return `(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (fn, ms) => {
      const deadline = Date.now() + ms;
      for (;;) {
        const hit = fn();
        if (hit) return hit;
        if (Date.now() > deadline) return null;
        await wait(200);
      }
    };
    try {
      return await (async () => { ${body} })();
    } catch (err) {
      return { error: String((err && err.stack) || err) };
    }
  })()`;
}

const READ_CAPTION = `
  const tile = await until(
    () => document.querySelector('button.agent-tile.missing'),
    30000
  );
  if (tile === null) return { error: 'no tile on this board is uninstalled' };
  const label = (tile.querySelector('.agent-tile-name') || {}).textContent || '';
  tile.click();
  const code = await until(() => document.querySelector('.onb-cmd'), 10000);
  if (code === null) return { error: 'the caption drew no command', label };
  await wait(600);
  const rect = code.getBoundingClientRect();
  const button = document.querySelector('[data-p130-copy-install="1"]');
  return {
    label: label.trim(),
    command: code.textContent,
    scrollWidth: code.scrollWidth,
    clientWidth: code.clientWidth,
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    oldClassDrawn: document.querySelector('.agent-missing-cmd') !== null,
    ariaLabel: button === null ? null : button.getAttribute('aria-label'),
    title: button === null ? null : button.getAttribute('title'),
    captionDirection: getComputedStyle(
      document.querySelector('.onb-caption')
    ).flexDirection
  };
`;

const PRESS_COPY = `
  const tile = await until(
    () => document.querySelector('button.agent-tile.missing'),
    30000
  );
  if (tile === null) return { error: 'no tile on this board is uninstalled' };
  tile.click();
  const button = await until(
    () => document.querySelector('[data-p130-copy-install="1"]'),
    10000
  );
  if (button === null) return { error: 'the caption drew no copy control' };
  const command = (document.querySelector('.onb-cmd') || {}).textContent;
  const focused = await until(() => document.hasFocus(), 20000);
  button.click();
  await wait(800);
  const toast = document.querySelector('.toast, [class*="toast"]');
  return {
    command,
    focused: focused === true,
    toast: toast === null ? null : (toast.textContent || '').trim()
  };
`;

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const oneShot = join(outDir, 'p130-1-install-caption.png');
const twoShot = join(outDir, 'p130-2-copied.png');
rmSync(oneShot, { force: true });
rmSync(twoShot, { force: true });

const photographed = (path) =>
  existsSync(path) && statSync(path).size > 0 ? statSync(path).size : 0;

say('launch 1: the photograph and the measurement');
const one = await drive({ shot: oneShot, js: driver(READ_CAPTION) });
const r1 = one.reading;

if (r1 === null || r1.error !== undefined) {
  check(
    1,
    'a tile that is not installed is on the board and pins the caption',
    false,
    `the driver answered ${JSON.stringify(r1)}. Electron exited ${String(one.code)}.`
  );
} else {
  check(
    1,
    'a tile that is not installed is on the board and pins the caption',
    typeof r1.label === 'string' && r1.label.length > 0,
    `the tile reads ${JSON.stringify(r1.label)}`
  );

  const id = IDS.get(r1.label) ?? null;
  const truth = id === null ? null : (COMMANDS.get(id) ?? null);

  check(
    2,
    'the caption draws a command, and the caption is a column',
    typeof r1.command === 'string' &&
      r1.command.length > 0 &&
      r1.captionDirection === 'column',
    `command ${JSON.stringify(r1.command)}, flex-direction ` +
      `${JSON.stringify(r1.captionDirection)}`
  );
  check(
    3,
    "the command equals the registry's own command byte for byte",
    truth !== null && r1.command === truth,
    id === null
      ? `no registry id is known for the label ${JSON.stringify(r1.label)}`
      : `registry(${id}) is ${JSON.stringify(truth)}, the screen has ` +
        `${JSON.stringify(r1.command)}`
  );
  check(
    4,
    'nothing is cut off: scrollWidth <= clientWidth',
    Number(r1.scrollWidth) <= Number(r1.clientWidth),
    `scrollWidth ${String(r1.scrollWidth)}, clientWidth ` +
      `${String(r1.clientWidth)}, drawn ${String(r1.width)} by ` +
      `${String(r1.height)} px`
  );
  check(
    5,
    'the caption no longer draws .agent-missing-cmd, the class that clipped it',
    r1.oldClassDrawn === false,
    `.agent-missing-cmd present: ${String(r1.oldClassDrawn)}`
  );
  check(
    6,
    'the copy control names the agent out loud and carries the short tooltip',
    r1.ariaLabel === `Copy the install command for ${String(r1.label)}` &&
      r1.title === 'Copy the install command',
    `aria-label ${JSON.stringify(r1.ariaLabel)}, title ${JSON.stringify(r1.title)}`
  );
}

check(
  7,
  'the harness photographed the caption',
  photographed(oneShot) > 0,
  `${oneShot} at ${String(photographed(oneShot))} bytes. A person reads it.`
);

say('launch 2: the press, and the pasteboard read from outside the renderer');
const two = await drive({ shot: twoShot, js: driver(PRESS_COPY) });
const r2 = two.reading;

const pasteboard = spawnSync('pbpaste', [], { encoding: 'utf8' }).stdout ?? '';

if (r2 === null || r2.error !== undefined) {
  check(
    8,
    'one press puts the command on the system pasteboard',
    false,
    `the driver answered ${JSON.stringify(r2)}. Electron exited ${String(two.code)}.`
  );
} else {
  check(
    8,
    'one press puts the command on the system pasteboard',
    typeof r2.command === 'string' &&
      r2.command.length > 0 &&
      pasteboard === r2.command,
    `the screen showed ${JSON.stringify(r2.command)}, the pasteboard holds ` +
      `${JSON.stringify(pasteboard)}. The window was focused: ` +
      `${String(r2.focused)}. This is read with pbpaste, OUTSIDE the ` +
      'renderer, because a readText() inside the page proves only that the ' +
      'page can read back what the page just wrote.'
  );
}

check(
  9,
  'the harness photographed the moment after the press',
  photographed(twoShot) > 0,
  `${twoShot} at ${String(photographed(twoShot))} bytes`
);

// ---------------------------------------------------------------------------
// The end: put everything back
// ---------------------------------------------------------------------------

for (const pid of [...recordedPids].reverse()) {
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    /* already gone, which is the state we wanted */
  }
}

restoreClipboard();
const clipboardAfter =
  spawnSync('pbpaste', [], { encoding: 'utf8' }).stdout ?? '';
check(
  10,
  "the operator's clipboard is back as he left it",
  clipboardAfter === clipboardBefore,
  `${String(clipboardBefore.length)} bytes before, ` +
    `${String(clipboardAfter.length)} bytes after`
);

const operatorAfter = operatorSessionCount();
check(
  11,
  "the operator's session count did not move",
  operatorAfter === operatorBefore,
  `${String(operatorBefore)} before, ${String(operatorAfter)} after`
);

try {
  rmSync(scratch, { recursive: true, force: true });
} catch {
  /* a scratch directory that will not go is not a result */
}

process.stdout.write('\n#   what                                                            verdict\n');
process.stdout.write(`${'-'.repeat(92)}\n`);
for (const row of rows) {
  process.stdout.write(
    `${String(row.n).padEnd(4)}${String(row.claim).slice(0, 62).padEnd(64)}${row.verdict}\n`
  );
}

say(`profile: ${profile}, and the operator's own was never opened`);
say(
  'NOT PROVEN HERE: no install command ran, and whether the caption LOOKS ' +
    'right is decided by a person reading out/p130-1-install-caption.png.'
);

if (failures.length > 0) {
  process.stdout.write(`\nFAIL, ${String(failures.length)}:\n`);
  for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
  process.exit(1);
}

process.stdout.write(
  '\nPASS. The caption drew the whole install command, the measurement says ' +
    'nothing was cut off, and one press on the real control put that command ' +
    'on the system pasteboard character for character.\n'
);
process.exit(0);
