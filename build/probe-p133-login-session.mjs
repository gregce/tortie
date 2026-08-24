#!/usr/bin/env node
/**
 * probe-p133-login-session.mjs. The Phase 133 live probe.
 *
 * WHAT IT PROVES. macOS gives every login session a number and puts it in the
 * environment as `SECURITYSESSIONID`. The Security framework uses that number to
 * decide which login session a process belongs to, and a keychain unlock belongs
 * to a session. A tmux server outlives the login session it was started in, so a
 * pane it creates can carry a number that names a session which has ended.
 *
 * Six measurements, each printed with the raw bytes it read:
 *
 *   M1  a pane created with no `-e` pair reports the SERVER's number, not the
 *       client's. That is the defect.
 *   M2  a pane created with `-e SECURITYSESSIONID=<live>` reports the live
 *       number. That is the fix, and it is what src/main/tmux/env.ts now does.
 *   M3a adding SECURITYSESSIONID to `update-environment` refreshes the session
 *       environment when a client attaches.
 *   M3b that refresh reaches a pane made AFTER the attach and does not reach the
 *       pane that was already running. Nothing can change the environment of a
 *       process that is already running.
 *   M3c the same refresh also happens when a session is CREATED, not only when
 *       one is attached, so the option is put back before anything below it
 *       runs. Without that, R2's stale pane and the E1 leg would both carry the
 *       probe's own live number and pass for the wrong reason.
 *   R1  the `security` command line tool inside the stale pane, three ways.
 *   R2  a real Electron process calling safeStorage inside the stale pane, and
 *       then inside the live pane.
 *
 * M1 and M2 together are the pass condition. If either fails, the mechanism is
 * not what the phase says it is, and the phase stops. R2 has three outcomes and
 * section 5 of the phase spec says what each one allows the phase to claim.
 *
 * THE OPTIONAL SEVENTH STEP, `--identity`, is the end to end leg through
 * Tortie's own create path. It leaves the scratch server started with the stale
 * number and runs `GMUX_SMOKE=identity electron .` against it. That harness's
 * last step prints this app process's number, the server's number and the number
 * the pane reported, and it fails when the pane's is not the app's.
 *
 * SAFETY, ABSOLUTE. Every tmux command goes to the socket
 * build/harness-socket.mjs handed this run, which that script refuses to let be
 * `gmux` or `default`. `-L gmux` is named in exactly one function here, being a
 * read only session count taken at the start and again at the end, and both
 * numbers are printed. The probe never uses pkill, never uses kill-server on a
 * socket it was not given, and kills only pids it recorded itself. Every Electron
 * launch gets its own `--user-data-dir` under `$GMUX_HARNESS_DIR`.
 *
 * THE ONE STEP THAT CAN PUT A DIALOG ON THE SCREEN is R2. A macOS keychain
 * prompt that nobody answers queues every later keychain request on the machine,
 * which is the 2026-08-16 incident recorded at src/main/index.ts:155. So R2 runs
 * under a 20 second watchdog, kills only the pid it recorded, and then runs
 * `/usr/bin/security default-keychain` under a 5 second watchdog. That command
 * answering is the proof that nothing is left holding the machine's keychain
 * queue, and the probe prints it as such. `--no-r2` skips the step entirely.
 *
 * Usage, from the repository root. Flags go INSIDE the harness command, because
 * `npm run x -- --flag` appends them after the quoted inner command:
 *
 *   npm run probe:p133
 *
 *   npm run build
 *   node build/harness-socket.mjs gmux-p133 \
 *     'node build/probe-p133-login-session.mjs --identity'
 *
 *   npm run build
 *   node build/harness-socket.mjs gmux-p133 \
 *     'node build/probe-p133-login-session.mjs --server-live --no-r2'
 *
 * `--server-live` starts the scratch server from the LIVE number instead of a
 * stale one, which is the ordinary case. M1 then expects the live number too, so
 * the run shows the probe is not asserting something that is always true.
 *
 * Exit 0 when every gating measurement passed. Exit 1 when one failed. Exit 2
 * when the probe refuses to run at all.
 */

import { spawn, spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runElectron } from './electron-run.mjs';

const TAG = '[probe:p133]';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function say(line) {
  console.log(`${TAG} ${line}`);
}

function refuse(why) {
  console.error(`${TAG} ${why}`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Refusals, before anything runs
// ---------------------------------------------------------------------------

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness so I get a socket of ' +
      "my own: node build/harness-socket.mjs gmux-p133 'node " +
      "build/probe-p133-login-session.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to measure on "${socket}", which is not a harness socket`);
}

const runIdentity = process.argv.includes('--identity');
const runR2 = !process.argv.includes('--no-r2');
const serverLive = process.argv.includes('--server-live');

if (runIdentity && !existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

/** The number this process is in. Everything the probe claims is relative to it. */
const LIVE = (process.env['SECURITYSESSIONID'] ?? '').trim();
if (LIVE === '') {
  refuse(
    'this process carries no SECURITYSESSIONID, so there is no live login ' +
      'session number to compare against and the measurement cannot run. ' +
      'Run me from a terminal in a normal macOS login session.'
  );
}
/** A number that names no live login session. Chosen here, never read. */
const STALE = 'deadbe';
/** A third number, carried by the client that attaches in M3a. */
const REFRESH = 'cafe99';
if (LIVE === STALE || LIVE === REFRESH) {
  refuse(
    `this process's SECURITYSESSIONID is "${LIVE}", which is one of the two ` +
      'markers this probe plants. The three values must differ.'
  );
}

/** The number the scratch server is started with. */
const SERVER_SID = serverLive ? LIVE : STALE;

// ---------------------------------------------------------------------------
// Counts, versions and scratch space
// ---------------------------------------------------------------------------

/**
 * The operator's live server, listed and never written. This is the ONLY place
 * this file names it, and `list-sessions` is the only verb it ever sends there.
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

const confPath = join(repoRoot, 'resources', 'gmux-tmux.conf');
if (!existsSync(confPath)) refuse(`${confPath} is missing`);

const tmuxVersion = (
  spawnSync('tmux', ['-V'], { encoding: 'utf8' }).stdout ?? ''
).trim();

const scratchRoot =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const dir = join(scratchRoot, 'p133-login-session');
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);
say(`harness socket: ${socket}`);
say(`tmux: ${tmuxVersion}`);
say(`conf: ${confPath}`);
say(`this process's login session number (LIVE): ${LIVE}`);
say(`the number the scratch server is started with: ${SERVER_SID}`);
say(`scratch directory: ${dir}`);

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** One tmux command on the scratch socket. Never on any other socket. */
function tmux(args, env = undefined) {
  return spawnSync('tmux', ['-L', socket, ...args], {
    encoding: 'utf8',
    ...(env === undefined ? {} : { env })
  });
}

/** Wait for a file to exist and be non empty, or give up. */
async function waitForFile(path, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const text = readFileSync(path, 'utf8');
      if (text.trim() !== '') return text;
    } catch {
      /* not there yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

/**
 * The Electron binary itself, not the `node_modules/.bin/electron` shim. The
 * shim is a Node process that spawns Electron as a CHILD, so a watchdog that
 * killed the shim's pid would leave the real process running. R2's watchdog is
 * allowed to kill exactly one recorded pid, so the pane's command has to BE the
 * process that matters.
 */
function electronBinary() {
  const rel = (() => {
    try {
      return readFileSync(
        join(repoRoot, 'node_modules', 'electron', 'path.txt'),
        'utf8'
      ).trim();
    } catch {
      return 'Electron.app/Contents/MacOS/Electron';
    }
  })();
  return join(repoRoot, 'node_modules', 'electron', 'dist', rel);
}

const rows = [];
/** Record one measurement. `gating` rows decide the exit code. */
function record(step, expected, observed, verdict, gating) {
  rows.push({ step, expected, observed, verdict, gating });
  say(`${step}: expected ${expected}, observed ${observed}. ${verdict}`);
}

/**
 * A pane command that writes its OWN SECURITYSESSIONID to a file and then
 * sleeps. It is written this way because macOS `ps` prints no environment for
 * another process, so the only honest reading is the pane reporting itself.
 */
function reporterScript(outFile) {
  return (
    `printf '%s\\n' "\${SECURITYSESSIONID:-<none>}" > '${outFile}'; ` +
    'while true; do sleep 1; done'
  );
}

const created = [];
/** Create a session on the scratch server and remember it for cleanup. */
function newSession(name, command, extraEnv) {
  const args = ['new-session', '-d', '-s', name];
  for (const [key, value] of Object.entries(extraEnv ?? {})) {
    args.push('-e', `${key}=${value}`);
  }
  args.push(command);
  const out = tmux(args);
  if (out.status !== 0) {
    throw new Error(
      `new-session ${name} failed: ${(out.stderr ?? '').trim()}`
    );
  }
  created.push(name);
  return out;
}

// ---------------------------------------------------------------------------
// M0. The scratch server, started from a chosen login session number
// ---------------------------------------------------------------------------

say('');
say('M0. Starting the scratch server');
{
  const out = spawnSync(
    'tmux',
    ['-L', socket, '-f', confPath, 'start-server'],
    {
      encoding: 'utf8',
      env: { ...process.env, SECURITYSESSIONID: SERVER_SID }
    }
  );
  if (out.status !== 0) {
    refuse(`could not start the scratch server: ${(out.stderr ?? '').trim()}`);
  }
}

/**
 * The server's own number, read with `show-environment -g` and NO variable
 * named. Naming a variable tmux does not hold makes it exit 1, which is
 * measured at src/main/machines/pane-env-rescue.ts:30.
 */
function serverLoginSession() {
  const out = tmux(['show-environment', '-g']);
  for (const line of (out.stdout ?? '').split('\n')) {
    if (line.startsWith('SECURITYSESSIONID=')) return line.slice(18);
  }
  return '<none>';
}
const serverSaw = serverLoginSession();
record(
  'M0 the server holds the number it was started with',
  SERVER_SID,
  serverSaw,
  serverSaw === SERVER_SID ? 'PASS' : 'FAIL',
  true
);

const stockUpdateEnv = (
  tmux(['show-options', '-gv', 'update-environment']).stdout ?? ''
).trim();
say(`update-environment on this conf: ${stockUpdateEnv.replace(/\n/g, ' ')}`);

// ---------------------------------------------------------------------------
// M1. The defect, today's shape
// ---------------------------------------------------------------------------

say('');
say('M1. A pane created with no -e pair, from a client carrying the live number');

const staleSid = join(dir, 'm1-pane-sid.txt');
const r1Go = join(dir, 'r1-go');
const r1Done = join(dir, 'r1-done');
const r1Summary = join(dir, 'r1-summary.txt');

/**
 * The stale pane. It reports its own number, waits to be asked, runs the three
 * `security` calls of R1, and then stays alive so M3b can prove that the attach
 * refresh did NOT reach it.
 *
 * Each `security` call runs under an 8 second watchdog written in plain sh,
 * because macOS ships no `timeout`.
 */
const stalePaneScript = join(dir, 'p133-stale-pane.sh');
writeFileSync(
  stalePaneScript,
  `#!/bin/sh
# Phase 133 probe: the stale pane. It reports itself and runs R1 on request.
printf '%s\\n' "\${SECURITYSESSIONID:-<none>}" > '${staleSid}'

run() {
  label="$1"
  shift
  "$@" > '${dir}'/"$label".out 2>&1 &
  pid=$!
  i=0
  while [ $i -lt 80 ]; do
    kill -0 "$pid" 2>/dev/null || break
    sleep 0.1
    i=$((i + 1))
  done
  if kill -0 "$pid" 2>/dev/null; then
    kill -9 "$pid" 2>/dev/null
    printf 'WATCHDOG killed after 8 s\\n' >> '${dir}'/"$label".out
    code=124
  else
    wait "$pid"
    code=$?
  fi
  printf '%s exit=%s out=%s\\n' "$label" "$code" "$(cat '${dir}'/"$label".out | tr '\\n' ' ')" >> '${r1Summary}'
}

while [ ! -f '${r1Go}' ]; do sleep 0.2; done
printf 'pane SECURITYSESSIONID=%s\\n' "\${SECURITYSESSIONID:-<none>}" >> '${r1Summary}'
run r1a /usr/bin/security default-keychain
run r1b env -u SECURITYSESSIONID /usr/bin/security default-keychain
run r1c env SECURITYSESSIONID=${LIVE} /usr/bin/security default-keychain
printf 'done\\n' > '${r1Done}'
while true; do sleep 1; done
`,
  'utf8'
);
chmodSync(stalePaneScript, 0o755);

newSession('p133-stale', `/bin/sh '${stalePaneScript}'`);
const m1 = (await waitForFile(staleSid, 15_000))?.trim() ?? '<no answer>';
record(
  'M1 pane with no -e reports the server\'s number',
  SERVER_SID,
  m1,
  m1 === SERVER_SID ? 'PASS' : 'FAIL',
  true
);
if (!serverLive) {
  record(
    'M1 that number is NOT the one this process is in',
    `not ${LIVE}`,
    m1,
    m1 === LIVE ? 'FAIL' : 'PASS',
    true
  );
}

// ---------------------------------------------------------------------------
// M2. The fix's shape
// ---------------------------------------------------------------------------

say('');
say('M2. The same pane, created with -e SECURITYSESSIONID=<live>');

const liveSid = join(dir, 'm2-pane-sid.txt');
newSession('p133-live', reporterScript(liveSid), {
  SECURITYSESSIONID: LIVE
});
const m2 = (await waitForFile(liveSid, 15_000))?.trim() ?? '<no answer>';
record(
  'M2 pane with -e reports the live number',
  LIVE,
  m2,
  m2 === LIVE ? 'PASS' : 'FAIL',
  true
);

// ---------------------------------------------------------------------------
// M3. Candidate 1, measured rather than read
// ---------------------------------------------------------------------------

say('');
say('M3. update-environment, and what an attach can and cannot reach');

const appended = tmux([
  'set-option',
  '-ga',
  'update-environment',
  'SECURITYSESSIONID'
]);
if (appended.status !== 0) {
  say(`set-option failed: ${(appended.stderr ?? '').trim()}`);
}
const afterAppend = (
  tmux(['show-options', '-gv', 'update-environment']).stdout ?? ''
).trim();
record(
  'M3a update-environment now names SECURITYSESSIONID',
  'the name is in the list',
  afterAppend.includes('SECURITYSESSIONID') ? 'it is' : afterAppend,
  afterAppend.includes('SECURITYSESSIONID') ? 'PASS' : 'FAIL',
  false
);

// A tmux client needs a terminal, so the attach runs under /usr/bin/script.
// Only the pid recorded here is ever killed.
const attach = spawn(
  '/usr/bin/script',
  ['-q', '/dev/null', 'tmux', '-L', socket, 'attach', '-t', 'p133-stale'],
  {
    stdio: 'ignore',
    env: { ...process.env, SECURITYSESSIONID: REFRESH }
  }
);
const attachPid = attach.pid;
say(`attached a client carrying ${REFRESH}, pid ${String(attachPid)}`);
await new Promise((r) => setTimeout(r, 2000));
tmux(['detach-client', '-s', 'p133-stale']);
if (attachPid !== undefined) {
  try {
    process.kill(attachPid, 'SIGKILL');
  } catch {
    /* already gone */
  }
}
await new Promise((r) => setTimeout(r, 500));

const sessionEnv = tmux([
  'show-environment',
  '-t',
  'p133-stale',
  'SECURITYSESSIONID'
]);
const sessionSaw = (sessionEnv.stdout ?? '').trim();
record(
  "M3a the session environment after the attach",
  `SECURITYSESSIONID=${REFRESH}`,
  sessionSaw === '' ? `<exit ${String(sessionEnv.status)}>` : sessionSaw,
  sessionSaw === `SECURITYSESSIONID=${REFRESH}` ? 'PASS' : 'FAIL',
  false
);

const newWindowSid = join(dir, 'm3b-window-sid.txt');
const madeWindow = tmux([
  'new-window',
  '-d',
  '-t',
  'p133-stale:',
  reporterScript(newWindowSid)
]);
if (madeWindow.status !== 0) {
  say(`new-window failed: ${(madeWindow.stderr ?? '').trim()}`);
}
const m3b = (await waitForFile(newWindowSid, 15_000))?.trim() ?? '<no answer>';
record(
  'M3b a pane made AFTER the attach',
  REFRESH,
  m3b,
  m3b === REFRESH ? 'PASS' : 'FAIL',
  false
);
const staleStill = (readFileSync(staleSid, 'utf8') ?? '').trim();
record(
  'M3b the pane that was ALREADY running',
  `${SERVER_SID}, unchanged`,
  staleStill,
  staleStill === SERVER_SID ? 'PASS' : 'FAIL',
  false
);
say(
  'So adding SECURITYSESSIONID to update-environment refreshes the session ' +
    'environment and every pane made after the attach, and it does not reach a ' +
    'process that is already running.'
);

/**
 * M3c. The refresh happens at CREATE as well as at attach. This was found by
 * accident: a later step's pane carried the probe's own number instead of the
 * server's, and the option set above is why. With the name in
 * `update-environment`, a session created by ANY client takes that client's
 * number into the session environment, and the session environment beats the
 * server's. Every step below this one needs a pane that honestly carries the
 * server's number, so the option is put back to what the conf gives and the
 * next pane proves it is back.
 */
const m3cSid = join(dir, 'm3c-pane-sid.txt');
newSession('p133-m3c', reporterScript(m3cSid));
const m3c = (await waitForFile(m3cSid, 15_000))?.trim() ?? '<no answer>';
record(
  'M3c a session CREATED while the option names the variable',
  LIVE,
  m3c,
  m3c === LIVE ? 'PASS' : 'FAIL',
  false
);

tmux(['set-option', '-gu', 'update-environment']);
const restored = (
  tmux(['show-options', '-gv', 'update-environment']).stdout ?? ''
).trim();
record(
  'M3c update-environment put back to the conf\'s own list',
  'SECURITYSESSIONID is no longer in it',
  restored.includes('SECURITYSESSIONID') ? restored : 'it is gone',
  restored.includes('SECURITYSESSIONID') ? 'FAIL' : 'PASS',
  true
);

const m3dSid = join(dir, 'm3d-pane-sid.txt');
newSession('p133-m3d', reporterScript(m3dSid));
const m3d = (await waitForFile(m3dSid, 15_000))?.trim() ?? '<no answer>';
record(
  'M3c a session created AFTER the option was put back',
  SERVER_SID,
  m3d,
  m3d === SERVER_SID ? 'PASS' : 'FAIL',
  true
);

// ---------------------------------------------------------------------------
// R1. The security command line tool inside the stale pane
// ---------------------------------------------------------------------------

say('');
say('R1. /usr/bin/security inside the stale pane, three ways, 8 s each');
writeFileSync(r1Go, 'go\n', 'utf8');
const r1 = await waitForFile(r1Done, 45_000);
const r1Text = (() => {
  try {
    return readFileSync(r1Summary, 'utf8').trim();
  } catch {
    return '<no summary written>';
  }
})();
for (const line of r1Text.split('\n')) say(`  ${line}`);
record(
  'R1 the three security calls finished',
  'three exit codes recorded',
  r1 === null ? 'the pane never finished' : `${r1Text.split('\n').length} lines`,
  r1 === null ? 'FAIL' : 'NOTE',
  false
);

// ---------------------------------------------------------------------------
// R2. The Electron reproduction
// ---------------------------------------------------------------------------

/**
 * Run the throwaway Electron app in one pane and read what it answered.
 *
 * The app is the pane's DIRECT command, so `#{pane_pid}` is the Electron
 * process itself and the watchdog has one pid to kill rather than a shell and
 * an unknown child.
 */
async function runKeychainApp(name, appDir, extraEnv) {
  const resultFile = join(dir, `${name}-result.json`);
  const electronBin = electronBinary();
  if (!existsSync(electronBin)) {
    say(`no electron at ${electronBin}, skipping ${name}`);
    return { skipped: true };
  }
  const profile = join(dir, `${name}-profile`);
  const command =
    `'${electronBin}' '${appDir}' --user-data-dir='${profile}' ` +
    '-ApplePersistenceIgnoreState YES';
  newSession(name, command, { ...extraEnv, P133_RESULT_FILE: resultFile });
  const panePid = (
    tmux(['display-message', '-p', '-t', name, '#{pane_pid}']).stdout ?? ''
  ).trim();
  say(`${name}: pane pid ${panePid}, watchdog 20 s`);
  const answer = await waitForFile(resultFile, 20_000);
  if (answer === null) {
    const pid = Number(panePid);
    if (Number.isInteger(pid) && pid > 0) {
      try {
        process.kill(pid, 'SIGKILL');
        say(`${name}: watchdog expired, killed pid ${panePid} and nothing else`);
      } catch {
        say(`${name}: watchdog expired and pid ${panePid} was already gone`);
      }
    }
    return { hung: true };
  }
  return { answer: answer.trim() };
}

if (runR2) {
  say('');
  say('R2. A real Electron process asking for keychain backed encryption.');
  say(
    'This is the one step that can put a macOS dialog on the screen. If one ' +
      'appears it is dismissed by the watchdog within 20 seconds, and the ' +
      'probe then proves the machine\'s keychain queue is clear.'
  );

  const appDir = join(dir, 'p133-keychain-app');
  mkdirSync(appDir, { recursive: true });
  writeFileSync(
    join(appDir, 'package.json'),
    `${JSON.stringify(
      { name: 'p133-keychain-probe', version: '1.0.0', main: 'main.js' },
      null,
      2
    )}\n`,
    'utf8'
  );
  writeFileSync(
    join(appDir, 'main.js'),
    `// Phase 133 probe. Written by build/probe-p133-login-session.mjs.
// It opens no window, stores nothing, and exits as soon as it has an answer.
const { app, safeStorage } = require('electron');
const { writeFileSync } = require('node:fs');

app.whenReady().then(() => {
  let available = false;
  let bytes = 0;
  let error = '';
  try {
    available = safeStorage.isEncryptionAvailable();
  } catch (err) {
    error += String(err);
  }
  try {
    bytes = safeStorage.encryptString('p133').length;
  } catch (err) {
    error += ' ' + String(err);
  }
  const line = JSON.stringify({
    available,
    bytes,
    error,
    sid: process.env.SECURITYSESSIONID || '<none>'
  });
  console.log('P133 ' + line);
  writeFileSync(process.env.P133_RESULT_FILE, line + '\\n');
  app.exit(0);
});
`,
    'utf8'
  );

  const stale = await runKeychainApp('p133-r2-stale', appDir, undefined);
  const live = await runKeychainApp('p133-r2-live', appDir, {
    SECURITYSESSIONID: LIVE
  });

  // The proof that no dialog is left holding the machine's keychain queue.
  const after = spawnSync('/usr/bin/security', ['default-keychain'], {
    encoding: 'utf8',
    timeout: 5000
  });
  const queueClear = after.status === 0;
  record(
    'R2 the machine\'s keychain queue after the Electron runs',
    'security default-keychain answers within 5 s',
    queueClear
      ? (after.stdout ?? '').trim()
      : `exit ${String(after.status)} ${(after.stderr ?? '').trim()}`,
    queueClear ? 'PASS' : 'FAIL',
    true
  );

  const describe = (r) =>
    r.skipped === true
      ? 'skipped, no electron binary'
      : r.hung === true
        ? 'no answer in 20 s, killed by the watchdog'
        : r.answer;
  const staleText = describe(stale);
  const liveText = describe(live);
  const reproduced =
    stale.hung === true ||
    (typeof staleText === 'string' &&
      staleText.includes('"available":false') &&
      typeof liveText === 'string' &&
      liveText.includes('"available":true'));
  record(
    'R2 the stale pane',
    'an answer, whatever it is',
    staleText,
    'NOTE',
    false
  );
  record('R2 the live pane', 'encryption available', liveText, 'NOTE', false);
  say(
    reproduced
      ? 'R2 REPRODUCED. The stale number is what stopped the keychain answering.'
      : 'R2 did NOT reproduce. Both runs answered, so this probe cannot say the ' +
          'macOS dialog is caused by the stale number. The phase may claim only ' +
          'what M1 and M2 measured.'
  );
} else {
  say('');
  say('R2 skipped by --no-r2. No Electron process asked for a keychain.');
}

// ---------------------------------------------------------------------------
// E1. The end to end leg through Tortie's own create path
// ---------------------------------------------------------------------------

if (runIdentity) {
  say('');
  say('E1. GMUX_SMOKE=identity against this scratch server');
  const profile = join(dir, 'identity-profile');
  mkdirSync(profile, { recursive: true });
  // build/electron-run.mjs owns this launch (Phase 140) and ends the tree it
  // started in a finally block whatever happened. It starts the Electron binary
  // itself rather than the node_modules/.bin/electron shim, which is what the
  // note above asks for.
  const out = await runElectron({
    label: 'p133 identity',
    program: 'app',
    userDataDir: profile,
    cwd: repoRoot,
    env: { ...process.env, GMUX_SMOKE: 'identity' },
    ceilingMs: 180_000
  });
  const text = out.text;
  for (const line of text.split('\n')) {
    if (line.includes('login session') || line.includes('/10 ')) {
      say(`  ${line.trim()}`);
    }
  }
  record(
    'E1 the identity harness',
    'exit 0, and the pane joined the app\'s login session',
    `exit ${String(out.code)}`,
    out.code === 0 ? 'PASS' : 'FAIL',
    true
  );
} else {
  say('');
  say('E1 skipped. Pass --identity to run the end to end leg.');
}

// ---------------------------------------------------------------------------
// Cleanup and summary
// ---------------------------------------------------------------------------

for (const name of created) {
  tmux(['kill-session', '-t', `=${name}`]);
}

const operatorAfter = operatorSessionCount();

say('');
say('SUMMARY');
const width = Math.max(...rows.map((r) => r.step.length));
for (const row of rows) {
  const gate = row.gating ? ' (gating)' : '';
  say(
    `  ${row.step.padEnd(width)}  ${row.verdict.padEnd(4)}  ` +
      `expected ${row.expected} / observed ${row.observed}${gate}`
  );
}
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);
say(`operator sessions on -L gmux after:  ${String(operatorAfter)}`);
if (operatorBefore !== operatorAfter) {
  say('THE OPERATOR SESSION COUNT MOVED. Nothing here writes to that socket.');
}

const failed = rows.filter((r) => r.gating && r.verdict === 'FAIL');
if (failed.length > 0) {
  const word = failed.length === 1 ? 'measurement' : 'measurements';
  say(`FAIL: ${String(failed.length)} gating ${word} failed.`);
  process.exit(1);
}
say('PASS: every gating measurement held.');
