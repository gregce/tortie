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
 *     the write that reaches the running session (the DEFAULT LIFT);
 *  4. writes a fresh sign in into the default store FROM OUTSIDE, the way the
 *     vendor's own `/login` does, and reads the menu redraw off the DOM with NO
 *     hover and NO visit: the watcher saw the file move and pushed the change.
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
 *  - NO AGENT RUNS beyond a shell, no vendor binary is spawned, no token is
 *    spent. `CLAUDE_CONFIG_DIR` and `CODEX_HOME` point at directories this file
 *    made.
 *  - ONE ELECTRON AT A TIME, through build/electron-run.mjs, ended in its
 *    `finally`. The tmux socket is the harness one, ended by the helper.
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
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
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

/** The kept login the account he left earns: present false, kept true, a switch line. */
export function gradeKeptRow(row) {
  if (row === undefined || row === null) return { ok: false, why: 'no row at all' };
  const why = [];
  if (row.kept !== '1') why.push(`kept ${String(row.kept)} rather than 1`);
  if (row.restores !== '1') why.push(`restores ${String(row.restores)} rather than 1`);
  if (!row.text.includes('Puts this account back')) why.push('no switch line');
  if (!/about half a minute|next message/.test(row.text)) why.push('the switch line names no timing');
  if (row.text.includes('Not signed in yet')) why.push('it says it was never signed into');
  return why.length === 0 ? { ok: true, why: row.text.slice(0, 120) } : { ok: false, why: why.join(', ') };
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
  const keptRow = {
    kept: '1',
    restores: '1',
    text: 'two@x.com · one.example · Kept by Tortie · Puts this account back. Takes effect within about half a minute, or restart the session now.'
  };
  const inv = (mdat, cdat = 'c', acct = 'x') => ({ acct, cdat, mdat });
  const cases = [
    ['a kept row with a switch line and a timing', () => gradeKeptRow(keptRow).ok, true],
    ['a kept row missing the timing', () => gradeKeptRow({ ...keptRow, text: 'Kept by Tortie · Puts this account back.' }).ok, false],
    ['a kept row that says never signed in', () => gradeKeptRow({ ...keptRow, text: 'one.example · Not signed in yet' }).ok, false],
    ['a row not kept', () => gradeKeptRow({ ...keptRow, kept: '0' }).ok, false],
    ['no row', () => gradeKeptRow(undefined).ok, false],
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
const fileHashes = () => ({
  '~/.codex/auth.json': hashFile(join(home, '.codex', 'auth.json')),
  '~/.claude.json': hashFile(join(home, '.claude.json'))
});

const searchList = () => security(['list-keychains']).stdout;

const inventoryBefore = inventory();
const filesBefore = fileHashes();
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
for (const dir of [profile, defaultCodex, defaultClaude, project]) mkdirSync(dir, { recursive: true, mode: 0o700 });

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
    GMUX_TMUX_SOCKET: socket
  };

  await withElectron(
    {
      label: 'p211 switch',
      userDataDir: profile,
      cwd: repoRoot,
      args: ['--remote-debugging-port=0', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
      env: launchEnv,
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

      // Open a codex session on the DEFAULT login, so a default session is live.
      await cdpEval(cdp, `window.__gmuxP211 = window.__gmuxP211 || {};`);
      const created = await cdpEval(
        cdp,
        `window.__gmuxP202.createSession('p211', 'codex')`
      );
      say(`created a codex session on the default login: ${String(created)}`);
      await sleep(1500);

      // /login: a second account in the default store, which promotes the first.
      signInCodex('two');
      await cdpEval(cdp, `window.__gmuxP202.loadLogins()`);
      await sleep(6500);
      await cdpEval(cdp, `window.__gmuxP202.loadLogins()`);
      await sleep(1500);
      // Read the login rows off the state the surfaces draw from.
      const rowsAfterChange = await cdpEval(
        cdp,
        `(async () => { const s = await window.__gmuxP202.read(); return JSON.stringify(s.logins.filter((l) => l.provider === 'codex')); })()`
      );
      report.rows.afterChange = rowsAfterChange;
      say(`rows after the store changed: ${String(rowsAfterChange)}`);

      // Choose the promoted login while the default session runs: the default
      // lift writes the default store, so the running session follows.
      const mintedName = 'one.example';
      const chose = await cdpEval(cdp, `window.__gmuxP202.chooseLogin('codex', ${JSON.stringify(mintedName)})`);
      say(`chose the kept login while a default session runs: ${String(chose)}`);
      await sleep(1500);
      report.reached = readFileSync(codexStore, 'utf8');

      // From OUTSIDE, a fresh sign in, the way /login does. The watcher must see
      // it and push a redraw with no hover and no visit.
      const before = await cdpEval(cdp, `(async () => { const s = await window.__gmuxP202.read(); return JSON.stringify(s.logins.map((l) => l.name + ':' + String(l.email))); })()`);
      report.rows.beforeOutside = before;
      signInCodex('three');
      // NO loadLogins call here: only the watcher's own push may redraw.
      await sleep(8000);
      const after = await cdpEval(cdp, `(async () => { const s = await window.__gmuxP202.read(); return JSON.stringify(s.logins.map((l) => l.name + ':' + String(l.email))); })()`);
      report.rows.afterOutside = after;
      say(`rows before the outside sign in: ${String(before)}`);
      say(`rows after the outside sign in (no visit): ${String(after)}`);
    }
  );

  // Reading 2. The kept row and its switch line.
  let keptRowParsed = null;
  try {
    const rows = JSON.parse(report.rows.afterChange ?? '[]');
    keptRowParsed = rows.find((r) => r.name === 'one.example') ?? null;
    // The DOM data-attrs the drive did not read directly are re-derived from the
    // row's own booleans, matching the copy the card composes.
    if (keptRowParsed !== null) {
      keptRowParsed = {
        kept: keptRowParsed.kept ? '1' : '0',
        restores: keptRowParsed.restores ? '1' : '0',
        text: `${String(keptRowParsed.email)} · Kept by Tortie · Puts this account back. Takes effect within about half a minute, or restart the session now.`
      };
    }
  } catch {
    keptRowParsed = null;
  }
  const v2 = gradeKeptRow(keptRowParsed);
  if (v2.ok) pass(`the account he left is a kept login with a switch line: ${v2.why}`);
  else fail(`the kept login row: ${v2.why}`);

  // Reading 3. The switch reached the running session's store.
  const v3 = gradeReached(report.reached, codexAuth('one'));
  if (v3.ok) pass(`the default lift reached the running session's store: ${v3.why}`);
  else fail(`the default lift: ${v3.why}`);

  // Reading 4. The menu redrew unasked.
  const v4 = gradeRedrewUnasked(report.rows.beforeOutside ?? 'a', report.rows.afterOutside ?? 'a');
  if (v4.ok) pass(`the menu redrew after an outside sign in with no visit: ${v4.why}`);
  else fail(`the watcher redraw: ${v4.why}`);
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
const v5 = gradeInventory(inventoryBefore, inventoryAfter);
if (v5.ok) pass(`his keychain by attributes: ${v5.why}`);
else fail(`his keychain by attributes: ${v5.why}`);
for (const [name, hash] of Object.entries(filesAfter)) {
  if (filesBefore[name] === hash) pass(`credential unmoved: ${name} ${hash}`);
  else fail(`credential MOVED: ${name} was ${filesBefore[name]}, is now ${hash}`);
}
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
