#!/usr/bin/env node
/**
 * `npm run probe:p211`. The Phase 211 app run: does a switch reach a running
 * session, and is a sign in seen at once?
 *
 * ## What it proves, in ONE app run on one scratch profile and a scratch keychain
 *
 * The operator's words of 2026-09-03: a switch "does not actually change in the
 * terminal session", and a sign in "does not immediately update and refresh".
 * So this probe, over FIXTURE codex stores it wrote into directories it made:
 *
 *  1. opens a session on the DEFAULT login;
 *  2. signs a second account into the default store, which promotes the first
 *     into a login of Tortie's own, and reads the kept row and its switch line
 *     off the real DOM;
 *  3. chooses that kept login while the default session is running, and reads
 *     the default store back ON DISK: it now holds the chosen account, which is
 *     the write that reaches the running session (the DEFAULT LIFT), then
 *     reads the sentence and the `Restart now` off the toast in the DOM;
 *  4. presses `Restart now` and reads the replacement off the session list,
 *     which must carry the chosen login's NAME, and the environment the new
 *     pane really got, recorded by the stub the pane ran, whose `CODEX_HOME`
 *     must be the chosen login's own directory under this profile;
 *  5. writes a fresh sign in into the default store FROM OUTSIDE, the way the
 *     vendor's own `/login` does, and reads the menu redraw off the DOM with NO
 *     hover and NO visit, timing it: the watcher saw the file move and pushed
 *     the change.
 *
 * ## THE FIX ROUND'S OWN ADMISSION, and why steps 3 and 4 were never green
 *
 * As first shipped, every harness launch got a `liveSessions` seam that
 * answered nothing, so the default lift could never fire in any app run, and
 * this probe failed as shipped on its lift reading while the gate's codex arm
 * passed. The harness seams now share the person's own seam, which reads the
 * manifest of THIS profile. The kept row grader read a drive reading that
 * carried neither `kept` nor `restores`, and the `~/.claude.json` hash was
 * graded as a credential when it is the vendor's session state file that
 * every running Claude Code rewrites, this verifier's own included. Both are
 * put right below.
 *
 * ## Nothing of the person is read, written or spent
 *
 *  - The switch and the watcher are driven over CODEX stores, which are FILES
 *    in directories this probe made. No credential of his is written, and the
 *    default lift writes a scratch file, never his own `~/.codex/auth.json`.
 *  - A SCRATCH KEYCHAIN is made with `security create-keychain` under the
 *    harness directory, never added to the search list, and deleted in a
 *    `finally`, exactly as build/probe-p208-vault.mjs does. It exists so his
 *    keychain can be inventoried by attributes before and after, with NO `-g`
 *    and NO `-w` against it, and proved unchanged.
 *  - NO VENDOR BINARY RUNS. `claude` and `codex` on the pane's PATH are two
 *    stub scripts this probe writes, which record the environment their pane
 *    really got and then sleep; the login shell the app asks for its PATH is a
 *    stub too, answering with the stub directory first. `CLAUDE_CONFIG_DIR`
 *    and `CODEX_HOME` point at directories this file made. No token is spent.
 *  - ONE ELECTRON AT A TIME, through build/electron-run.mjs, ended in its
 *    `finally`, and the stubs' sleepers die with the harness tmux server the
 *    helper ends.
 *
 * ## The lock is proved by the gate, not by a log line
 *
 * `src/main/credentials/locks.ts` is in the credentials domain, which
 * `npm run conformance:credentials` forbids from writing a log line, so the
 * lock acquisition cannot be read off an app-run log. The gate's `claudeLock`
 * arm proves a claude write holds both locks instead, over the shipping module,
 * and its ablations go red one clause at a time. This probe proves the OTHER
 * half, being that the write reaches the running session's store.
 *
 * ## Usage
 *
 *   npm run probe:p211
 *   node build/probe-p211-switch.mjs --self-test   the graders alone, no launch
 *
 * Exit 0 when every reading agrees, 1 when one does not, 2 when it refuses.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG = '[p211]';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const say = (line) => console.log(`${TAG} ${line}`);
const pass = (line) => console.log(`${TAG} PASS ${line}`);
let failures = 0;
const fail = (line) => {
  failures += 1;
  console.error(`${TAG} FAIL ${line}`);
};

// ---------------------------------------------------------------------------
// The graders, the only thing --self-test runs.
// ---------------------------------------------------------------------------

/**
 * The kept login the account he left earns: present false, kept true,
 * restores true. These are the row's own booleans as the drive read them off
 * the store every surface draws from; the copy composed from them is pinned by
 * the login-copy tests, not re-derived here.
 */
export function gradeKeptRow(row) {
  if (row === undefined || row === null) return { ok: false, why: 'no row at all' };
  const why = [];
  if (row.present !== false) why.push('its store reads as present, so nothing was promoted');
  if (row.kept !== true) why.push(`kept ${String(row.kept)} rather than true`);
  if (row.restores !== true) why.push(`restores ${String(row.restores)} rather than true`);
  return why.length === 0
    ? { ok: true, why: `${row.name}: kept, restores, store empty` }
    : { ok: false, why: why.join(', ') };
}

/** The sentence after a switch, and the control beside it, read off the toast. */
export function gradeSwitchToast(toasts, buttons, chosen) {
  const why = [];
  const line = toasts.find((t) => t.startsWith(`${chosen} is switched.`));
  if (line === undefined) why.push('no sentence saying the login is switched');
  else if (!/about half a minute|next message/.test(line)) why.push('the sentence names no timing');
  if (!buttons.includes('Restart now')) why.push('no Restart now beside it');
  return why.length === 0 ? { ok: true, why: line } : { ok: false, why: why.join(', ') };
}

/**
 * The replacement after `Restart now`: one session, carrying the chosen login's
 * NAME on its row, and a new pane whose CODEX_HOME is that login's own
 * directory under this profile, read from inside the pane by the stub.
 */
export function gradeRestarted(before, after, envFiles, chosen, loginsRoot) {
  const why = [];
  if (after.length !== 1) why.push(`${String(after.length)} sessions after the restart rather than one`);
  const row = after[0];
  if (row !== undefined && before[0] !== undefined && row.id === before[0].id) why.push('the session id did not change, so nothing was restarted');
  if (row !== undefined && row.login !== chosen) why.push(`the row carries login ${String(row.login)} rather than ${chosen}`);
  const fresh = envFiles.filter((f) => row !== undefined && f.file.startsWith(row.id));
  if (fresh.length === 0) why.push('no pane environment was recorded for the replacement');
  for (const f of fresh) {
    const home = /^CODEX_HOME=(.*)$/m.exec(f.text)?.[1] ?? '';
    if (!home.startsWith(`${loginsRoot}/codex/`)) why.push(`the new pane's CODEX_HOME is ${home || 'unset'} rather than a login directory under this profile`);
  }
  return why.length === 0 ? { ok: true, why: `row ${chosen}, pane CODEX_HOME under ${loginsRoot}/codex` } : { ok: false, why: why.join('; ') };
}

/** The store reached the running session: its file now holds the chosen account. */
export function gradeReached(fileBytes, want) {
  if (fileBytes === null) return { ok: false, why: 'the store file is gone' };
  return fileBytes === want
    ? { ok: true, why: `${String(fileBytes.length)} bytes, the chosen account` }
    : { ok: false, why: 'the store does not hold the chosen account' };
}

/** The menu redrew unasked: the rows before and after an outside sign in differ. */
export function gradeRedrewUnasked(before, after) {
  if (before === after) return { ok: false, why: 'the rows did not change after an outside sign in' };
  return { ok: true, why: 'the rows changed with no hover and no visit' };
}

/** His keychain by attributes: identical services, accounts and creation dates. */
export function gradeInventory(before, after) {
  const why = [];
  const names = (inv) => Object.keys(inv).sort();
  if (JSON.stringify(names(before)) !== JSON.stringify(names(after))) {
    why.push(`services changed from ${names(before).join(',')} to ${names(after).join(',')}`);
  }
  for (const name of names(before)) {
    const b = before[name];
    const a = after[name];
    if (a === undefined) continue;
    if (b.acct !== a.acct) why.push(`${name}: account moved`);
    if (b.cdat !== a.cdat) why.push(`${name}: creation date moved`);
    if (b.mdat !== a.mdat && name.startsWith('Tortie-credentials')) {
      why.push(`${name}: MODIFICATION DATE MOVED`);
    }
  }
  return { ok: why.length === 0, why: why.length === 0 ? `${String(names(before).length)} items identical` : why.join('; ') };
}

if (process.argv.includes('--self-test')) {
  const keptRow = { name: 'one.example', present: false, kept: true, restores: true };
  const inv = (mdat, cdat = 'c', acct = 'x') => ({ acct, cdat, mdat });
  const sess = (id, login) => ({ id, login });
  const env = (id, home) => ({ file: `${id}.codex.1.env`, text: `agent=codex\nCODEX_HOME=${home}\n` });
  const cases = [
    ['a kept row: store empty, kept, restores', () => gradeKeptRow(keptRow).ok, true],
    ['a kept row whose store still reads present', () => gradeKeptRow({ ...keptRow, present: true }).ok, false],
    ['a row not kept', () => gradeKeptRow({ ...keptRow, kept: false }).ok, false],
    ['a row that restores nothing', () => gradeKeptRow({ ...keptRow, restores: false }).ok, false],
    ['no row', () => gradeKeptRow(undefined).ok, false],
    ['the toast with the timing and the control', () => gradeSwitchToast(['one.example is switched. Takes effect within about half a minute, or restart the session now.'], ['Restart now'], 'one.example').ok, true],
    ['the toast with no control', () => gradeSwitchToast(['one.example is switched. Takes effect on the next message.'], [], 'one.example').ok, false],
    ['no toast', () => gradeSwitchToast([], ['Restart now'], 'one.example').ok, false],
    ['a restart under the chosen login with a new pane under the profile', () => gradeRestarted([sess('a', null)], [sess('b', 'one.example')], [env('b', '/p/logins/codex/x1')], 'one.example', '/p/logins').ok, true],
    ['a restart that kept the original login', () => gradeRestarted([sess('a', null)], [sess('b', null)], [env('b', '/p/logins/codex/x1')], 'one.example', '/p/logins').ok, false],
    ['a restart whose pane got the default store', () => gradeRestarted([sess('a', null)], [sess('b', 'one.example')], [env('b', '/scratch/default-codex')], 'one.example', '/p/logins').ok, false],
    ['a restart that restarted nothing', () => gradeRestarted([sess('a', null)], [sess('a', 'one.example')], [env('a', '/p/logins/codex/x1')], 'one.example', '/p/logins').ok, false],
    ['a restart that left two sessions', () => gradeRestarted([sess('a', null)], [sess('a', null), sess('b', 'one.example')], [env('b', '/p/logins/codex/x1')], 'one.example', '/p/logins').ok, false],
    ['the store reached', () => gradeReached('AAA', 'AAA').ok, true],
    ['the store not reached', () => gradeReached('AAA', 'BBB').ok, false],
    ['the store gone', () => gradeReached(null, 'AAA').ok, false],
    ['the menu redrew', () => gradeRedrewUnasked('a', 'b').ok, true],
    ['the menu did not redraw', () => gradeRedrewUnasked('a', 'a').ok, false],
    ['an identical inventory', () => gradeInventory({ x: inv('m') }, { x: inv('m') }).ok, true],
    ['a Tortie item whose mdat moved', () => gradeInventory({ 'Tortie-credentials-x': inv('m1') }, { 'Tortie-credentials-x': inv('m2') }).ok, false],
    ['an item that appeared', () => gradeInventory({}, { 'Tortie-credentials-y': inv('m') }).ok, false],
    ['a creation date that moved', () => gradeInventory({ x: inv('m', 'c1') }, { x: inv('m', 'c2') }).ok, false]
  ];
  let bad = 0;
  for (const [name, run, want] of cases) {
    const got = run();
    const ok = got === want;
    if (!ok) bad += 1;
    console.log(`${TAG} ${ok ? 'PASS' : 'FAIL'} ${name}: graded ${got ? 'green' : 'red'}, wanted ${want ? 'green' : 'red'}`);
  }
  console.log(`${TAG} ${String(cases.length - bad)}/${String(cases.length)} fixtures graded as intended`);
  process.exit(bad === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// The app run.
// ---------------------------------------------------------------------------

const { cdpEval, wsConnect } = await import('./cdp-client.mjs');
const { pickRendererTarget } = await import('./cdp-target.mjs');
const { withElectron } = await import('./electron-run.mjs');

const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};

if (process.platform !== 'darwin') refuse('this probe drives the macOS keychain inventory and runs on macOS only');
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') refuse('no GMUX_TMUX_SOCKET. Run me through the harness: node build/harness-socket.mjs --fresh gmux-p211 "node build/probe-p211-switch.mjs"');
if (socket === 'gmux' || socket === 'default') refuse(`refusing to run on "${socket}", which is not a harness socket`);
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) refuse('out/main/index.js is missing. Run npm run build first.');
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere the app would accept a scratch keychain from');

const outDir = resolve(repoRoot, (process.env['P211_OUT_DIR'] ?? '').trim() || 'out/p211');
mkdirSync(outDir, { recursive: true });

const SECURITY = '/usr/bin/security';
let keychainFile = '';
function security(args, input) {
  if (args.includes('-g')) throw new Error('this probe never passes -g');
  if (args.includes('-w') && (keychainFile === '' || args[args.length - 1] !== keychainFile)) {
    throw new Error('this probe passes -w only against the scratch keychain');
  }
  const run = spawnSync(SECURITY, args, { encoding: 'utf8', input, timeout: 15_000 });
  return { code: run.status ?? 1, stdout: run.stdout ?? '' };
}

function inventory() {
  const { stdout } = security(['dump-keychain']);
  const items = {};
  for (const block of stdout.split(/\nkeychain: /)) {
    const svce = /"svce"<blob>="([^"\n]*)"/.exec(block)?.[1] ?? '';
    if (!svce.startsWith('Claude Code-credentials') && !svce.startsWith('Tortie-credentials')) continue;
    items[svce] = {
      acct: /"acct"<blob>="([^"\n]*)"/.exec(block)?.[1] ?? '',
      cdat: /"cdat"<timedate>=0x[0-9A-F]+\s+"([^"]*)"/.exec(block)?.[1] ?? '',
      mdat: /"mdat"<timedate>=0x[0-9A-F]+\s+"([^"]*)"/.exec(block)?.[1] ?? ''
    };
  }
  return items;
}

function hashFile(path) {
  if (!existsSync(path)) return 'absent';
  try {
    return execFileSync('/usr/bin/shasum', ['-a', '256', path], { encoding: 'utf8', timeout: 15_000 }).trim().split(/\s+/)[0] ?? 'unreadable';
  } catch {
    return 'unreadable';
  }
}

const home = process.env['HOME'] ?? '';
/**
 * His credential files, hashed before and after. `~/.claude.json` is NOT a
 * credential: it is the vendor's session state, rewritten by every running
 * Claude Code under his account, so it is read for the record and not graded.
 */
const fileHashes = () => ({
  '~/.codex/auth.json': hashFile(join(home, '.codex', 'auth.json')),
  '~/.claude/.credentials.json': hashFile(join(home, '.claude', '.credentials.json'))
});
const claudeJsonHash = () => hashFile(join(home, '.claude.json'));

const searchList = () => security(['list-keychains']).stdout;

const inventoryBefore = inventory();
const filesBefore = fileHashes();
const claudeJsonBefore = claudeJsonHash();
const searchBefore = searchList();
say(`his keychain before: ${String(Object.keys(inventoryBefore).length)} items in the two families`);
for (const [name, hash] of Object.entries(filesBefore)) say(`credential before: ${name} ${hash}`);

// ---------------------------------------------------------------------------
// The scratch world, all under the harness directory.
// ---------------------------------------------------------------------------

const rawRoot = join(harnessDir, `gmux-p211-${String(process.pid)}`);
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(rawRoot, { recursive: true });
const root = realpathSync(rawRoot);
const profile = join(root, 'profile');
const defaultCodex = join(root, 'default-codex');
const defaultClaude = join(root, 'default-claude');
const project = join(root, 'project');
const stubBin = join(root, 'bin');
const envDir = join(root, 'pane-env');
for (const dir of [profile, defaultCodex, defaultClaude, project, stubBin, envDir]) mkdirSync(dir, { recursive: true, mode: 0o700 });

// THE STUBS. `claude` and `codex` record the environment their pane really
// got and then sleep, so a "session" is a pane with no vendor in it. The login
// shell the app asks for its PATH answers with the stub directory first.
for (const name of ['claude', 'codex']) {
  writeFileSync(
    join(stubBin, name),
    [
      '#!/bin/sh',
      'case " $* " in',
      '  *" --version "*|*" -v "*|*" --help "*) echo "0.0.0-p211-stub"; exit 0;;',
      'esac',
      'id="${GMUX_SESSION_ID:-unknown}"',
      `out="$P211_ENV_DIR/$id.${name}.$$.env"`,
      '{',
      `  echo "agent=${name}"`,
      '  echo "CLAUDE_CONFIG_DIR=${CLAUDE_CONFIG_DIR-}"',
      '  echo "CODEX_HOME=${CODEX_HOME-}"',
      '  echo "GMUX_SESSION_ID=${GMUX_SESSION_ID-}"',
      '  echo "pid=$$"',
      '} > "$out"',
      'exec sleep 100000',
      ''
    ].join('\n')
  );
  chmodSync(join(stubBin, name), 0o755);
}
// The stub directory first, then the system, then the two places tmux is
// installed from, because the app resolves tmux against this same answer.
const stubPath = [stubBin, '/usr/bin', '/bin', '/usr/sbin', '/sbin', '/opt/homebrew/bin', '/usr/local/bin'].join(':');
const fakeShell = join(root, 'p211-shell');
writeFileSync(
  fakeShell,
  [
    '#!/bin/sh',
    'case "$1" in',
    `  -lic|-lc|-ic) printf "__GMUX_PATH__%s__GMUX_PATH__" ${JSON.stringify(stubPath)}; exit 0;;`,
    'esac',
    'exec /bin/sh "$@"',
    ''
  ].join('\n')
);
chmodSync(fakeShell, 0o755);
const paneEnvFiles = () => readdirSync(envDir).map((f) => ({ file: f, text: readFileSync(join(envDir, f), 'utf8') }));

keychainFile = join(root, 'scratch.keychain-db');
const keychainPassword = randomBytes(12).toString('hex');

const stamp = Date.now().toString(36);
function codexAuth(who) {
  const claims = { sub: `u-${who}-${stamp}`, email: `${who}@example.com` };
  const claim = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return JSON.stringify({ OPENAI_API_KEY: null, tokens: { access_token: `P211-${who}-${stamp}`, account_id: `acct-${who}`, id_token: `h.${claim}.s` } });
}
const codexStore = join(defaultCodex, 'auth.json');
function signInCodex(who) {
  writeFileSync(codexStore, codexAuth(who), { mode: 0o600 });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function targetsFor(profileDir) {
  const port = Number(readFileSync(join(profileDir, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
  if (!Number.isFinite(port) || port <= 0) throw new Error('no devtools port yet');
  return await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
}
async function attachMain(profileDir, timeoutMs) {
  const started = Date.now();
  for (;;) {
    try {
      const picked = pickRendererTarget(await targetsFor(profileDir));
      if (picked.target !== null && picked.target.webSocketDebuggerUrl) return await wsConnect(picked.target.webSocketDebuggerUrl);
    } catch {
      /* not up */
    }
    if (Date.now() - started > timeoutMs) throw new Error(`no main window target within ${String(timeoutMs / 1000)} s`);
    await sleep(400);
  }
}

const report = { at: new Date().toISOString(), inventoryBefore, filesBefore, rows: {}, reached: null };

try {
  if (security(['create-keychain', '-p', keychainPassword, keychainFile]).code !== 0) throw new Error('create-keychain failed');
  security(['unlock-keychain', '-p', keychainPassword, keychainFile]);
  security(['set-keychain-settings', keychainFile]);
  if (searchList().includes(keychainFile)) throw new Error('the scratch keychain is in the search list');
  say('scratch keychain made under the harness directory, not in the search list');

  // The first account, in the default codex store.
  signInCodex('one');

  const launchEnv = {
    ...process.env,
    GMUX_PROBES: '1',
    GMUX_HARNESS_KEYCHAIN: keychainFile,
    CLAUDE_CONFIG_DIR: defaultClaude,
    CODEX_HOME: defaultCodex,
    GMUX_TMUX_SOCKET: socket,
    SHELL: fakeShell,
    PATH: stubPath,
    P211_ENV_DIR: envDir
  };

  await withElectron(
    {
      label: 'p211 switch',
      userDataDir: profile,
      cwd: repoRoot,
      args: ['--remote-debugging-port=0', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
      env: launchEnv,
      // `P211_ECHO=1` prints the app's own lines, for reading a refusal.
      ...(process.env['P211_ECHO'] === '1' ? { echo: true } : {}),
      graceMs: 15_000,
      ceilingMs: 300_000,
      tmuxSocket: socket
    },
    async (handle) => {
      say(`launched the built app, pid ${String(handle.pid)}`);
      await handle.waitForLine(/harness keychain installed/, 60_000);
      const cdp = await attachMain(profile, 120_000);
      for (let waited = 0; waited < 90_000; waited += 500) {
        if ((await cdpEval(cdp, "typeof window.__gmuxP202 === 'object'")) === true) break;
        await sleep(500);
      }

      const readState = async () =>
        JSON.parse(
          await cdpEval(
            cdp,
            `(async () => { const s = await window.__gmuxP202.read(); return JSON.stringify({ logins: s.logins.filter((l) => l.provider === 'codex'), sessions: s.sessions, toasts: s.toasts }); })()`
          )
        );
      const waitUntil = async (pred, maxMs) => {
        const t0 = Date.now();
        for (;;) {
          const st = await readState();
          if (pred(st)) return { ms: Date.now() - t0, state: st };
          if (Date.now() - t0 > maxMs) return { ms: -1, state: st };
          await sleep(150);
        }
      };

      // Open a codex session on the DEFAULT login, so a default session is live.
      await cdpEval(cdp, `window.__gmuxP189Open(${JSON.stringify(project)})`);
      await sleep(1000);
      const created = await cdpEval(cdp, `window.__gmuxP202.createSession('p211', 'codex')`);
      say(`created a codex session on the default login: ${String(created)}`);
      for (let waited = 0; waited < 30_000 && paneEnvFiles().length === 0; waited += 500) await sleep(500);
      await sleep(1000);
      const start = await readState();
      report.sessionsAtStart = start.sessions;
      report.paneEnvAtStart = paneEnvFiles();
      say(`session at start: ${JSON.stringify(start.sessions)}; pane env files ${String(report.paneEnvAtStart.length)}`);

      // /login: a second account in the default store, which promotes the first.
      // The WATCHER sees it; no list is asked for. Timed.
      signInCodex('two');
      const promoted = await waitUntil((st) => st.logins.some((l) => l.name === 'one.example'), 20_000);
      report.promotedAfterMs = promoted.ms;
      report.rows.afterChange = JSON.stringify(promoted.state.logins);
      say(`the account he left was promoted after ${String(promoted.ms)} ms: ${report.rows.afterChange}`);

      // Choose the promoted login while the default session runs: the default
      // lift writes the default store, so the running session follows, and the
      // store's sentence with `Restart now` is on the toast.
      const mintedName = 'one.example';
      const chose = await cdpEval(cdp, `window.__gmuxP202.chooseLogin('codex', ${JSON.stringify(mintedName)})`);
      say(`chose the kept login while a default session runs: ${String(chose)}`);
      const toasted = await waitUntil((st) => st.toasts.some((t) => t.startsWith(`${mintedName} is switched.`)), 10_000);
      report.reached = readFileSync(codexStore, 'utf8');
      report.toasts = toasted.state.toasts;
      report.toastButtons = await cdpEval(
        cdp,
        `Array.from(document.querySelectorAll('.toast .btn-text')).map((b) => b.textContent)`
      );
      say(`toasts: ${JSON.stringify(report.toasts)}; controls: ${JSON.stringify(report.toastButtons)}`);

      // Restart now: the replacement comes back under the CHOSEN login, and the
      // new pane's environment says so from inside.
      const clicked = await cdpEval(
        cdp,
        `(() => { const b = Array.from(document.querySelectorAll('.toast .btn-text')).find((x) => x.textContent === 'Restart now'); if (!b) return false; b.click(); return true; })()`
      );
      say(`pressed Restart now: ${String(clicked)}`);
      const restarted = await waitUntil(
        (st) => st.sessions.length === 1 && st.sessions[0].id !== start.sessions[0]?.id && paneEnvFiles().some((f) => f.file.startsWith(st.sessions[0].id)),
        30_000
      );
      await sleep(500);
      report.sessionsAfterRestart = restarted.state.sessions;
      report.paneEnvAfterRestart = paneEnvFiles();
      say(`after restart (${String(restarted.ms)} ms): ${JSON.stringify(report.sessionsAfterRestart)}; pane env files ${String(report.paneEnvAfterRestart.length)}`);

      // From OUTSIDE, a fresh sign in, the way /login does. The watcher must see
      // it and push a redraw with no hover and no visit. Timed.
      // The rows are keyed on the ADDRESS as well: after the lift the default
      // store holds the chosen account, so a third sign in changes the default
      // row's address and mints nothing, and presence alone would read the same.
      const rowKey = (l) => `${l.name}:${String(l.email)}:${String(l.present)}`;
      const before = JSON.stringify((await readState()).logins.map(rowKey));
      report.rows.beforeOutside = before;
      signInCodex('three');
      // NO loadLogins call here: only the watcher's own push may redraw.
      const redrew = await waitUntil((st) => JSON.stringify(st.logins.map(rowKey)) !== before, 20_000);
      report.redrewAfterMs = redrew.ms;
      report.rows.afterOutside = JSON.stringify(redrew.state.logins.map(rowKey));
      say(`rows before the outside sign in: ${before}`);
      say(`rows after the outside sign in (no visit, ${String(redrew.ms)} ms): ${report.rows.afterOutside}`);
    }
  );

  // Reading 1. The session was there, on the default login, and its pane got
  // the default store.
  const first = report.sessionsAtStart?.[0];
  if (first !== undefined && (first.login === null || first.login === undefined) && report.paneEnvAtStart.length > 0) {
    pass(`a codex session ran on the default login and its pane recorded its environment from inside`);
  } else fail(`the session at start: ${JSON.stringify(report.sessionsAtStart)}, ${String(report.paneEnvAtStart?.length ?? 0)} pane env files`);

  // Reading 2. The kept row, promoted by the watcher with no list asked for.
  let keptRowParsed = null;
  try {
    keptRowParsed = JSON.parse(report.rows.afterChange ?? '[]').find((r) => r.name === 'one.example') ?? null;
  } catch {
    keptRowParsed = null;
  }
  const v2 = gradeKeptRow(keptRowParsed);
  if (v2.ok && report.promotedAfterMs >= 0) pass(`the account he left is a kept login, promoted by the watcher after ${String(report.promotedAfterMs)} ms with no list asked for: ${v2.why}`);
  else fail(`the kept login row: ${v2.why}${report.promotedAfterMs < 0 ? ', and it was not seen within 20 s' : ''}`);

  // Reading 3. The switch reached the running session's store, and said so.
  const v3 = gradeReached(report.reached, codexAuth('one'));
  if (v3.ok) pass(`the default lift reached the running session's store: ${v3.why}`);
  else fail(`the default lift: ${v3.why}`);
  const v3b = gradeSwitchToast(report.toasts ?? [], report.toastButtons ?? [], 'one.example');
  if (v3b.ok) pass(`the sentence and Restart now: ${v3b.why}`);
  else fail(`the switch toast: ${v3b.why}`);

  // Reading 4. Restart now restored the session under the chosen login.
  const v4 = gradeRestarted(
    report.sessionsAtStart ?? [],
    report.sessionsAfterRestart ?? [],
    report.paneEnvAfterRestart ?? [],
    'one.example',
    join(profile, 'gmux', 'logins')
  );
  if (v4.ok) pass(`Restart now brought the session back under the chosen login: ${v4.why}`);
  else fail(`Restart now: ${v4.why}`);

  // Reading 5. The menu redrew unasked.
  const v5 = gradeRedrewUnasked(report.rows.beforeOutside ?? 'a', report.rows.afterOutside ?? 'a');
  if (v5.ok) pass(`the menu redrew after an outside sign in with no visit, after ${String(report.redrewAfterMs)} ms: ${v5.why}`);
  else fail(`the watcher redraw: ${v5.why}`);
} finally {
  const deleted = security(['delete-keychain', keychainFile]);
  say(`scratch keychain deleted: rc ${String(deleted.code)}, file ${existsSync(keychainFile) ? 'still there' : 'gone'}`);
  rmSync(root, { recursive: true, force: true });
}

// After.
const inventoryAfter = inventory();
const filesAfter = fileHashes();
report.inventoryAfter = inventoryAfter;
report.filesAfter = filesAfter;
const v6 = gradeInventory(inventoryBefore, inventoryAfter);
if (v6.ok) pass(`his keychain by attributes: ${v6.why}`);
else fail(`his keychain by attributes: ${v6.why}`);
for (const [name, hash] of Object.entries(filesAfter)) {
  if (filesBefore[name] === hash) pass(`credential unmoved: ${name} ${hash}`);
  else fail(`credential MOVED: ${name} was ${filesBefore[name]}, is now ${hash}`);
}
const claudeJsonAfter = claudeJsonHash();
report.claudeJson = { before: claudeJsonBefore, after: claudeJsonAfter };
say(
  `~/.claude.json ${claudeJsonBefore === claudeJsonAfter ? 'unchanged' : 'moved'} (${claudeJsonBefore} to ${claudeJsonAfter}); it is the vendor's session state, rewritten by any running Claude Code, and not a credential, so it is recorded and not graded`
);
if (searchList() === searchBefore && !searchBefore.includes(keychainFile)) pass('the keychain search list is what it was, and never held the scratch file');
else fail('the keychain search list changed');

const left = spawnSync('/bin/sh', ['-c', 'ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct | wc -l'], { encoding: 'utf8' });
say(`electron shaped processes on the machine at the end: ${(left.stdout ?? '').trim()}`);

const reportPath = join(outDir, 'p211-report.json');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
say(`wrote ${reportPath}`);

if (failures > 0) {
  console.error(`${TAG} ${String(failures)} reading(s) disagreed`);
  process.exit(1);
}
say('every reading agreed');
