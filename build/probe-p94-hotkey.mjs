#!/usr/bin/env node
/**
 * probe-p94-hotkey.mjs. The Phase 94 fix round live drive.
 *
 * ## WHAT IT PROVES, in the real app, in a real window
 *
 *   1. A per-agent hotkey pressed in a tab on this Mac still starts a session
 *      here. That is the control, and it is the behaviour the fix must not take
 *      away.
 *   2. The same hotkey pressed in a tab whose files are on a machine Tortie
 *      cannot use starts NOTHING, here or anywhere, and leaves one sticky
 *      sentence on screen.
 *   3. The agent board, driven through the store's `quickCreate` in the same
 *      tab, does the same thing.
 *
 * Reading 2 is the charter's own words, being that a per-agent hotkey pressed in
 * a remote tab must never start a process on this Mac. Before the fix round the
 * hotkey composed its own create payload and called the bridge directly, so it
 * carried neither the machine nor the machine its folder belongs to, and it
 * started a session HERE at a path only the other computer has.
 *
 * ## WHAT IT DOES NOT PROVE, and the report has to say so
 *
 * The machine it injects is one nothing is signed in to. This drive measures the
 * refusal half. That the same payload runs on a REAL machine, in the tab's own
 * folder, and starts nothing on this Mac, is measured against a real sign in
 * server by `npm run smoke:remote` at steps 17c to 17e.
 *
 * ## SAFETY, ABSOLUTE
 *
 * It runs on the socket build/harness-socket.mjs gave it, which that script
 * refuses to let be `gmux` or `default`. It uses its own user data directory and
 * its own scratch project, both outside the repository. It names `-L gmux` in
 * exactly one place, a read only session count taken before and after, which
 * must match. It opens no connection to any machine and starts no ssh. It never
 * uses pkill, never uses kill-server, and kills only the pid it spawned.
 *
 * Usage, from the repository root:
 *
 *   npm run probe:p94hotkey
 *
 * Exit code 0 when every reading passes. Exit code 1 otherwise, with every
 * failing reading named. Exit code 2 when the probe refuses to run at all.
 *
 * Every scratch file carries a `p94-` prefix.
 */

import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p94hotkey]';

function say(line) {
  console.log(`${TAG} ${line}`);
}

function refuse(why) {
  console.error(`${TAG} ${why}`);
  process.exit(2);
}

const keep = process.argv.includes('--keep');

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness so I get a socket of ' +
      "my own: node build/harness-socket.mjs gmux-p94-hotkey 'node " +
      "build/probe-p94-hotkey.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to measure on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

/**
 * The operator's live server, listed and never written. This is the ONLY place
 * this file names it.
 */
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
say(`harness socket: ${socket}`);

// ---------------------------------------------------------------------------
// The scratch project, on this Mac. The drive injects a second tab that claims
// a folder on a machine nothing is signed in to.
// ---------------------------------------------------------------------------

const scratch =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'p94-hotkey');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'project');
const profile = join(root, 'profile');
writeFileSync(join(project, 'README.md'), '# p94 hotkey probe\n');

/** A folder that exists on the injected machine and not here. */
const FAR_PATH = '/Users/probe/dev/test-tortie';
const MACHINE_ID = 'p94probe';
const LABEL = 'Probe Machine';

/** The sentence a person reads, word for word. */
const REFUSAL =
  `Tortie is not connected to ${LABEL}, so it started nothing. The files in ` +
  'this tab are on that machine, so a session on this Mac would run in a ' +
  'folder this Mac does not have. Open Settings and then Machines to prepare ' +
  'it, then try again.';

// ---------------------------------------------------------------------------
// One run of the app
// ---------------------------------------------------------------------------

const electronBin = join(repoRoot, 'node_modules', '.bin', 'electron');
const shotPath = join(scratch, 'p94-hotkey.png');
rmSync(shotPath, { force: true });

const child = spawn(
  electronBin,
  ['.', `--user-data-dir=${profile}`, '-ApplePersistenceIgnoreState', 'YES'],
  {
    cwd: repoRoot,
    env: {
      ...process.env,
      GMUX_SHOT: shotPath,
      GMUX_SHOT_VERBOSE: '1',
      GMUX_SHOT_DELAY_MS: '6000',
      GMUX_SHOT_DRIVE: JSON.stringify({ projectPath: project }),
      GMUX_SHOT_JS: `window.__gmuxP94CreateProbe(${JSON.stringify({
        machineId: MACHINE_ID,
        label: LABEL,
        farPath: FAR_PATH,
        settleMs: 2500
      })})`
    }
  }
);

let text = '';
const onText = (chunk) => {
  process.stdout.write(chunk);
  text += chunk;
};
child.stdout.on('data', (b) => onText(b.toString()));
child.stderr.on('data', (b) => onText(b.toString()));

const code = await new Promise((r) => {
  const watchdog = setTimeout(() => {
    console.error(`${TAG} the run passed its ceiling. Ending the pid I started.`);
    child.kill('SIGTERM');
  }, 180_000);
  child.on('error', (err) => {
    clearTimeout(watchdog);
    console.error(`${TAG} electron could not start: ${err.message}`);
    r(1);
  });
  child.on('exit', (c) => {
    clearTimeout(watchdog);
    setTimeout(() => r(c ?? 1), 750);
  });
});
// The app starts a tmux server that inherits these two pipes, so they are
// destroyed by hand. Without this node never exits. See the same note in
// build/probe-remote-project.mjs.
child.stdout.destroy();
child.stderr.destroy();

const marker = '[gmux-shot] probe ';
const at = text.lastIndexOf(marker);
let result = null;
if (at !== -1) {
  const line = text.slice(at + marker.length).split('\n')[0] ?? '';
  try {
    result = JSON.parse(line);
  } catch {
    result = null;
  }
}

// ---------------------------------------------------------------------------
// Reading the evidence back
// ---------------------------------------------------------------------------

const failures = [];

if (result === null) {
  failures.push(`the run printed no result, so nothing was measured (exit ${String(code)})`);
} else if (result.ok !== true) {
  failures.push(`the drive refused: ${String(result.why)}`);
} else {
  const readings = result.readings ?? [];
  console.log('');
  say('what each surface did, counted in sessions');
  console.log(
    '  surface                             before  after  main  toasts'
  );
  console.log(
    '  ----------------------------------  ------  -----  ----  ------'
  );
  for (const one of readings) {
    console.log(
      `  ${String(one.surface).padEnd(34)}  ${String(one.before).padStart(6)}  ` +
        `${String(one.after).padStart(5)}  ${String(one.mainAfter).padStart(4)}  ` +
        `${String(one.toasts.length).padStart(6)}`
    );
  }

  const control = readings.find((o) => o.surface === 'hotkey in a local tab');
  const hotkey = readings.find(
    (o) => o.surface === 'hotkey in a tab on a machine'
  );
  const board = readings.find(
    (o) => o.surface === 'agent board in a tab on a machine'
  );

  if (control === undefined) {
    failures.push('the control reading is missing');
  } else {
    if (control.after !== control.before + 1) {
      failures.push(
        `the hotkey in a LOCAL tab moved the window from ` +
          `${String(control.before)} to ${String(control.after)} session(s). ` +
          'It owes exactly one, and this is the behaviour the fix must not ' +
          'take away.'
      );
    }
    if (control.newestMachine !== null) {
      failures.push(
        `the session the hotkey started in a local tab came back on ` +
          `${String(control.newestMachine)} rather than on this Mac`
      );
    }
    if (control.newestPath !== project) {
      failures.push(
        `the session the hotkey started in a local tab is recorded at ` +
          `${JSON.stringify(control.newestPath)} rather than at ` +
          `${JSON.stringify(project)}`
      );
    }
    if (control.toasts.length !== 0) {
      failures.push(
        `the hotkey in a local tab said ${JSON.stringify(control.toasts)}, ` +
          'and it owes no sentence at all'
      );
    }
  }

  for (const one of [hotkey, board]) {
    if (one === undefined) {
      failures.push('a refusal reading is missing');
      continue;
    }
    if (one.after !== one.before) {
      failures.push(
        `${one.surface} moved the window from ${String(one.before)} to ` +
          `${String(one.after)} session(s). It owes none, because the tab's ` +
          'files are on a machine Tortie cannot use.'
      );
    }
    if (one.mainAfter !== 1) {
      failures.push(
        `${one.surface} left main holding ${String(one.mainAfter)} session(s). ` +
          'It owes 1, being the one the control started on this Mac.'
      );
    }
    if (one.toasts.length !== 1 || one.toasts[0] !== REFUSAL) {
      failures.push(
        `${one.surface} said ${JSON.stringify(one.toasts)} and it owes exactly ` +
          `one sentence, being ${JSON.stringify(REFUSAL)}`
      );
    }
  }

  console.log('');
  say('the sentence each refusal left on screen');
  for (const one of [hotkey, board]) {
    if (one === undefined) continue;
    say(`  ${one.surface}: ${JSON.stringify(one.toasts)}`);
  }
}

if (existsSync(shotPath)) {
  say(`screenshot ${shotPath}`);
} else {
  failures.push('no screenshot was written');
}

const operatorAfter = operatorSessionCount();
say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
if (operatorAfter !== operatorBefore) {
  failures.push(
    `the operator's server went from ${String(operatorBefore)} sessions to ` +
      `${String(operatorAfter)}. This probe must never touch it. The count is ` +
      'taken while the operator is using the app, so read it again by hand ' +
      'before treating a difference as a violation'
  );
}

if (!keep) rmSync(root, { recursive: true, force: true });

const named = [...new Set(failures)];
if (named.length > 0) {
  console.error('');
  for (const failure of named) console.error(`${TAG} FAIL ${failure}`);
  process.exit(1);
}
console.log('');
say(
  'the hotkey started a session in a local tab, and in a tab whose files are ' +
    'on a machine Tortie cannot use it started nothing and said one sentence. ' +
    'The agent board did the same.'
);
