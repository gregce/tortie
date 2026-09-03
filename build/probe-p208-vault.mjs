#!/usr/bin/env node
/**
 * `npm run probe:p208`. The Phase 208 app run: ONE launch on a scratch profile
 * over a SCRATCH KEYCHAIN the probe makes, proving that Tortie's own store
 * writes into the profile it is running in and that the person's own items did
 * not move.
 *
 * ## What it reads, in one app run
 *
 *  1. THE ATTACK THE PHASE EXISTS FOR. A scratch profile whose default claude
 *     store holds a PLANTED credential is launched, the boot observe runs, and
 *     the planted credential is read back out of the scoped slot in the scratch
 *     keychain, byte for byte, under a name that carries a digest of THIS
 *     profile's logins root. At the parent that write went to the item the
 *     person's real app reads; here it cannot name it.
 *  2. THE SCRATCH PROFILE MIGRATES NOTHING. An unscoped `Tortie-credentials-
 *     claude.default` is planted in the scratch keychain first, and it is
 *     still there, unchanged, after the run, while the boot line says the
 *     migration was refused.
 *  3. THE MIGRATION MATRIX over the REAL `security` on the same scratch file,
 *     driven under node by build/probe-p208-migrate.mts: present, absent, both
 *     with the record naming either side, a staged leftover, and a profile that
 *     is not the person's own.
 *  4. THE COLD START COST off the `logins.boot` line the app prints, being the
 *     wall time and the number of `security` runs the boot observe made.
 *  5. HIS OWN KEYCHAIN BY ATTRIBUTES. Every item whose service begins with
 *     `Claude Code-credentials` or `Tortie-credentials` is inventoried before
 *     the first action and after the last, by `dump-keychain` with NO `-d`, so
 *     no secret is printed; the set of services, every account and every
 *     creation date must be identical, and every `Tortie-` modification date
 *     must be identical. A `Claude Code-` modification date MAY move, because
 *     the vendor's own hourly refresh and his running app both write those,
 *     and the probe says so when it does. The scoped names this run composed
 *     must be absent from his keychain both before and after.
 *
 * ## Nothing of the person is read, written or spent
 *
 *  - `-g` and `-w` are NEVER passed against his keychain. `-w` is passed only
 *    with the scratch keychain path appended, to read back sentinels this file
 *    wrote.
 *  - The scratch keychain is made with `security create-keychain` under the
 *    harness directory, never added to the search list, which is checked
 *    before and after, and deleted in a `finally` with `delete-keychain`.
 *  - NO AGENT RUNS, no session is created, no turn is taken and no token is
 *    spent. `CLAUDE_CONFIG_DIR` and `CODEX_HOME` point at directories this
 *    file made.
 *  - ONE ELECTRON, through build/electron-run.mjs, ended in that helper's
 *    `finally`. The tmux socket is the scratch one the harness handed us and
 *    the helper ends it.
 *
 * ## The parent measurement is refused on purpose
 *
 * Red at the parent means the planted credential landing in the item his real
 * app reads, which is a write to his keychain by this tooling, so this probe
 * does not run at the parent. `npm run conformance:credentials` carries the
 * ablation that drops the digest from the name, and that is where the parent
 * shape is seen to go red.
 *
 * ## Usage, from the worktree root
 *
 *   npm run probe:p208
 *   node build/probe-p208-vault.mjs --self-test   the graders alone, which
 *                                                 launches nothing at all
 *
 * Exit 0 when every reading agrees, 1 when one does not, 2 when it refuses.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
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

const TAG = '[p208]';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const say = (line) => console.log(`${TAG} ${line}`);
const pass = (line) => console.log(`${TAG} PASS ${line}`);
let failures = 0;
const fail = (line) => {
  failures += 1;
  console.error(`${TAG} FAIL ${line}`);
};

// ---------------------------------------------------------------------------
// The graders, which are the only thing --self-test runs.
// ---------------------------------------------------------------------------

/**
 * Reading 1 and 2. The scoped slot in the scratch keychain holds the planted
 * bytes under the digest of this profile, the unscoped plant is untouched, the
 * boot line refused the migration, and nothing scoped reached his keychain.
 */
export function gradeScoped(r) {
  const why = [];
  if (r.scopedHolds !== true) why.push('the scoped slot does not hold the planted credential');
  if (r.scopedName !== r.expectedName) {
    why.push(`the item is named ${String(r.scopedName)} rather than ${String(r.expectedName)}`);
  }
  if (r.unscopedStill !== true) why.push('the unscoped plant in the scratch keychain was changed or removed');
  if (r.migrationRefused !== true) why.push('the boot line did not say the migration was refused');
  if (r.scopedInHisKeychain !== false) why.push('a scoped name this run composed exists in his keychain');
  if (r.stagedLeft !== false) why.push('a staged item was left in the scratch keychain');
  if (r.listedDefaultPresent !== true) why.push('the login list did not read the planted store as present');
  return why.length === 0
    ? { ok: true, why: 'the planted credential landed in the scratch keychain under this profile digest and nowhere else' }
    : { ok: false, why: why.join('; ') };
}

/** Reading 3. Every arm of the matrix over the real security behaved. */
export function gradeMigration(m) {
  const why = [];
  const a = (name) => m[name] ?? {};
  if (!(a('present').result?.moved === 1 && a('present').result?.deleted === 1 && a('present').scopedHolds && a('present').unscopedGone && a('present').stagedGone)) {
    why.push('present: not moved, deleted and read back exact');
  }
  if (!(a('absent').result?.moved === 0 && a('absent').result?.deleted === 0 && a('absent').scopedAbsent && a('absent').unscopedAbsent)) {
    why.push('absent: something was written or deleted');
  }
  if (!(a('bothRecordNamesOld').result?.moved === 1 && a('bothRecordNamesOld').scopedHoldsRecorded && a('bothRecordNamesOld').unscopedGone)) {
    why.push('both with the record naming the old item: the scoped one was not rewritten');
  }
  if (!(a('bothRecordNamesScoped').result?.moved === 0 && a('bothRecordNamesScoped').result?.deleted === 1 && a('bothRecordNamesScoped').scopedKept && a('bothRecordNamesScoped').unscopedGone)) {
    why.push('both with the record naming the scoped item: the scoped one did not win');
  }
  if (!(a('stagedLeftover').result?.deleted === 1 && a('stagedLeftover').residueGone && a('stagedLeftover').nothingMovedIn)) {
    why.push('staged leftover: not deleted without being moved');
  }
  if (!(a('notOwnProfile').result?.refused === true && a('notOwnProfile').unscopedStill && a('notOwnProfile').scopedAbsent)) {
    why.push('not the person own profile: the unscoped item was touched');
  }
  if (!(m.ownProfile?.own === true && m.ownProfile?.scratch === false && m.ownProfile?.probes === false)) {
    why.push('isOwnProfile misread a shape');
  }
  return why.length === 0
    ? { ok: true, why: 'six arms over the real security on the scratch keychain behaved' }
    : { ok: false, why: why.join('; ') };
}

/**
 * Reading 5. His inventory by attributes. Services, accounts and creation
 * dates identical; Tortie modification dates identical; Claude Code
 * modification dates reported when they moved.
 */
export function gradeInventory(before, after) {
  const why = [];
  const notes = [];
  const names = (inv) => Object.keys(inv).sort();
  if (JSON.stringify(names(before)) !== JSON.stringify(names(after))) {
    why.push(`the set of services changed from ${names(before).join(', ')} to ${names(after).join(', ')}`);
  }
  for (const name of names(before)) {
    const b = before[name];
    const a = after[name];
    if (a === undefined) continue;
    if (b.acct !== a.acct) why.push(`${name}: account moved`);
    if (b.cdat !== a.cdat) why.push(`${name}: creation date moved`);
    if (b.mdat !== a.mdat) {
      if (name.startsWith('Tortie-credentials')) why.push(`${name}: MODIFICATION DATE MOVED from ${b.mdat} to ${a.mdat}`);
      else notes.push(`${name}: modification date moved from ${b.mdat} to ${a.mdat}, which the vendor or his running app may do`);
    }
  }
  return {
    ok: why.length === 0,
    why: why.length === 0 ? `${String(names(before).length)} items identical by service, account and creation date` : why.join('; '),
    notes
  };
}

if (process.argv.includes('--self-test')) {
  const good = {
    scopedHolds: true, scopedName: 'a', expectedName: 'a', unscopedStill: true,
    migrationRefused: true, scopedInHisKeychain: false, stagedLeft: false, listedDefaultPresent: true
  };
  const goodMatrix = {
    present: { result: { moved: 1, deleted: 1 }, scopedHolds: true, unscopedGone: true, stagedGone: true },
    absent: { result: { moved: 0, deleted: 0 }, scopedAbsent: true, unscopedAbsent: true },
    bothRecordNamesOld: { result: { moved: 1 }, scopedHoldsRecorded: true, unscopedGone: true },
    bothRecordNamesScoped: { result: { moved: 0, deleted: 1 }, scopedKept: true, unscopedGone: true },
    stagedLeftover: { result: { deleted: 1 }, residueGone: true, nothingMovedIn: true },
    notOwnProfile: { result: { refused: true }, unscopedStill: true, scopedAbsent: true },
    ownProfile: { own: true, scratch: false, probes: false }
  };
  const inv = (mdat, cdat = 'c', acct = 'x') => ({ acct, cdat, mdat });
  const cases = [
    ['a scoped write that landed', () => gradeScoped(good).ok, true],
    ['the planted bytes missing', () => gradeScoped({ ...good, scopedHolds: false }).ok, false],
    ['the wrong name', () => gradeScoped({ ...good, scopedName: 'b' }).ok, false],
    ['the unscoped plant touched', () => gradeScoped({ ...good, unscopedStill: false }).ok, false],
    ['the migration not refused', () => gradeScoped({ ...good, migrationRefused: false }).ok, false],
    ['a scoped name in his keychain', () => gradeScoped({ ...good, scopedInHisKeychain: true }).ok, false],
    ['a staged item left', () => gradeScoped({ ...good, stagedLeft: true }).ok, false],
    ['the whole matrix', () => gradeMigration(goodMatrix).ok, true],
    ['the present arm not deleting', () => gradeMigration({ ...goodMatrix, present: { ...goodMatrix.present, unscopedGone: false } }).ok, false],
    ['the refused arm touching the item', () => gradeMigration({ ...goodMatrix, notOwnProfile: { ...goodMatrix.notOwnProfile, unscopedStill: false } }).ok, false],
    ['an identical inventory', () => gradeInventory({ 'Tortie-credentials-claude.default': inv('m') }, { 'Tortie-credentials-claude.default': inv('m') }).ok, true],
    ['a Tortie item whose modification date moved', () => gradeInventory({ 'Tortie-credentials-claude.default': inv('m1') }, { 'Tortie-credentials-claude.default': inv('m2') }).ok, false],
    ['a vendor item whose modification date moved, which is allowed and noted', () => { const g = gradeInventory({ 'Claude Code-credentials': inv('m1') }, { 'Claude Code-credentials': inv('m2') }); return g.ok && g.notes.length === 1; }, true],
    ['an item that appeared', () => gradeInventory({}, { 'Tortie-credentials-claude.default-deadbeef': inv('m') }).ok, false],
    ['a creation date that moved', () => gradeInventory({ a: inv('m', 'c1') }, { a: inv('m', 'c2') }).ok, false]
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
// The helpers, imported here for the reason build/probe-p206-nits.mjs gives.
// ---------------------------------------------------------------------------

const { cdpEval, wsConnect } = await import('./cdp-client.mjs');
const { pickRendererTarget } = await import('./cdp-target.mjs');
const { withElectron } = await import('./electron-run.mjs');
const { tsxCli } = await import('./ts-runner.mjs');

const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};

if (process.platform !== 'darwin') refuse('this probe drives the macOS keychain path and runs on macOS only');
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse('no GMUX_TMUX_SOCKET. Run me through the harness: node build/harness-socket.mjs --fresh gmux-p208 "node build/probe-p208-vault.mjs"');
}
if (socket === 'gmux' || socket === 'default') refuse(`refusing to run on "${socket}", which is not a harness socket`);
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) refuse('out/main/index.js is missing. Run npm run build first.');
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere the app would accept a scratch keychain from');

const outDir = resolve(repoRoot, (process.env['P208_OUT_DIR'] ?? '').trim() || 'out/p208');
mkdirSync(outDir, { recursive: true });

const SECURITY = '/usr/bin/security';

/** The scratch keychain file, once it has a name. The `-w` guard reads it. */
let keychainFile = '';

/** One `security` call. NEVER `-g`, and `-w` only with the scratch path appended. */
function security(args, input) {
  if (args.includes('-g')) throw new Error('this probe never passes -g');
  if (args.includes('-w') && (keychainFile === '' || args[args.length - 1] !== keychainFile)) {
    throw new Error('this probe passes -w only against the scratch keychain');
  }
  const run = spawnSync(SECURITY, args, { encoding: 'utf8', input, timeout: 15_000 });
  return { code: run.status ?? 1, stdout: run.stdout ?? '' };
}

// ---------------------------------------------------------------------------
// His keychain, by attributes. `dump-keychain` with NO `-d` prints attributes
// and never a secret; only the two Tortie shaped families are kept.
// ---------------------------------------------------------------------------

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
  '~/.claude/.credentials.json': hashFile(join(home, '.claude', '.credentials.json'))
});

const searchList = () => security(['list-keychains']).stdout;

const inventoryBefore = inventory();
const filesBefore = fileHashes();
const searchBefore = searchList();
say(`his keychain before: ${String(Object.keys(inventoryBefore).length)} items in the two families, by attributes`);
for (const [svce, a] of Object.entries(inventoryBefore)) say(`  ${svce}  acct=${a.acct} cdat=${a.cdat} mdat=${a.mdat}`);
for (const [name, hash] of Object.entries(filesBefore)) say(`credential before: ${name} ${hash}`);

// ---------------------------------------------------------------------------
// The scratch world, all of it under the harness directory.
// ---------------------------------------------------------------------------

const rawRoot = join(harnessDir, `gmux-p208-${String(process.pid)}`);
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(rawRoot, { recursive: true });
const root = realpathSync(rawRoot);
const profile = join(root, 'profile');
const defaultClaude = join(root, 'default-claude');
const defaultCodex = join(root, 'default-codex');
const migrateRoot = join(root, 'migrate');
for (const dir of [profile, defaultClaude, defaultCodex, migrateRoot]) mkdirSync(dir, { recursive: true, mode: 0o700 });

keychainFile = join(root, 'scratch.keychain-db');
const keychainPassword = randomBytes(12).toString('hex');

const digest8 = (text) => createHash('sha256').update(text).digest('hex').slice(0, 8);
/** The logins root the app will compute for THIS profile, and its digest. */
const loginsRoot = join(profile, 'gmux', 'logins');
const profileDigest = digest8(loginsRoot);
const SCOPED_DEFAULT = `Tortie-credentials-claude.default-${profileDigest}`;
const UNSCOPED_DEFAULT = 'Tortie-credentials-claude.default';
const VENDOR_SCOPED = `Claude Code-credentials-${digest8(defaultClaude)}`;
const PLANTED = JSON.stringify({ claudeAiOauth: { accessToken: 'P208-PLANTED-IN-THE-SCRATCH-DEFAULT-STORE', subscriptionType: 'max' } });
const UNSCOPED_PLANT = JSON.stringify({ claudeAiOauth: { accessToken: 'P208-UNSCOPED-PLANT-NEVER-MIGRATED-BY-A-SCRATCH-PROFILE' } });

const hex = (text) => Buffer.from(text, 'utf8').toString('hex');
function plantInScratch(service, account, payload) {
  const { code } = security(['-i'], `add-generic-password -U -a "${account}" -s "${service}" -X "${hex(payload)}" "${keychainFile}"\n`);
  if (code !== 0) throw new Error(`the scratch keychain refused ${service}`);
}
const readScratch = (service) => {
  const { code, stdout } = security(['find-generic-password', '-s', service, '-w', keychainFile]);
  return code === 0 ? stdout.replace(/\n$/, '') : null;
};
const hasScratch = (service) => security(['find-generic-password', '-s', service, keychainFile]).code === 0;
const hasHis = (service) => security(['find-generic-password', '-s', service]).code === 0;

const report = {
  at: new Date().toISOString(),
  profileDigest,
  inventoryBefore,
  filesBefore,
  boot: null,
  scoped: null,
  migration: null,
  inventoryAfter: null,
  filesAfter: null
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function targetsFor(profileDir) {
  const { readFileSync } = await import('node:fs');
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
      // Not up yet.
    }
    if (Date.now() - started > timeoutMs) throw new Error(`no main window target within ${String(timeoutMs / 1000)} s`);
    await sleep(400);
  }
}

try {
  // THE SCRATCH KEYCHAIN. Made here, never added to the search list, deleted
  // in the finally below. The password is random and is nobody's.
  if (security(['create-keychain', '-p', keychainPassword, keychainFile]).code !== 0) throw new Error('create-keychain failed');
  security(['unlock-keychain', '-p', keychainPassword, keychainFile]);
  security(['set-keychain-settings', keychainFile]);
  if (searchList().includes(keychainFile)) throw new Error('the scratch keychain is in the search list, which this probe never does');
  say(`scratch keychain made under the harness directory, not in the search list`);

  // THE PLANTS. The vendor scoped item for the scratch default store, holding
  // the planted credential, and the unscoped Tortie item, which the scratch
  // profile must leave exactly as it is.
  plantInScratch(VENDOR_SCOPED, 'gdc', PLANTED);
  plantInScratch(UNSCOPED_DEFAULT, 'tortie', UNSCOPED_PLANT);
  writeFileSync(join(defaultClaude, '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: 'probe@example.com', accountUuid: 'p208-uuid' } }), { mode: 0o600 });
  say(`planted ${VENDOR_SCOPED} and ${UNSCOPED_DEFAULT} in the scratch keychain`);

  const launchEnv = {
    ...process.env,
    GMUX_PROBES: '1',
    GMUX_HARNESS_KEYCHAIN: keychainFile,
    CLAUDE_CONFIG_DIR: defaultClaude,
    CODEX_HOME: defaultCodex,
    GMUX_TMUX_SOCKET: socket
  };

  let listed = null;
  await withElectron(
    {
      label: 'p208 vault',
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
      say('the app installed the scratch keychain seam');
      // `waitForLine` resolves with everything the child has written, so the
      // line itself is picked out of it.
      const text = await handle.waitForLine(/\[gmux-logins\] logins\.boot /, 120_000);
      const bootLine = /\[gmux-logins\] logins\.boot (\{[^\n]*\})/.exec(text)?.[1] ?? '';
      try {
        report.boot = JSON.parse(bootLine);
      } catch {
        report.boot = { raw: bootLine.slice(0, 300) };
      }
      say(`boot observe: ${JSON.stringify(report.boot)}`);
      const cdp = await attachMain(profile, 120_000);
      for (let waited = 0; waited < 90_000; waited += 500) {
        if ((await cdpEval(cdp, "typeof window.__gmuxP202 === 'object'")) === true) break;
        await sleep(500);
      }
      await cdpEval(cdp, '(window.__p208 = window.__gmuxP202.loadLogins())');
      const reading = await cdpEval(cdp, '(window.__p208 = window.__gmuxP202.read())');
      listed = (reading?.logins ?? []).filter((l) => l.provider === 'claude');
      say(`the login list draws ${listed.map((l) => `${l.name} present=${String(l.present)} email=${String(l.email)}`).join('; ')}`);
    }
  );

  // READING 1 AND 2, off the scratch keychain after the app has gone.
  const scopedHolds = readScratch(SCOPED_DEFAULT) === PLANTED;
  const scopedName = hasScratch(SCOPED_DEFAULT) ? SCOPED_DEFAULT : null;
  const { stdout: dump } = security(['dump-keychain', keychainFile]);
  const scratchServices = [...dump.matchAll(/"svce"<blob>="([^"\n]*)"/g)].map((m) => m[1]).sort();
  report.scoped = {
    expectedName: SCOPED_DEFAULT,
    scopedName,
    scopedHolds,
    unscopedStill: readScratch(UNSCOPED_DEFAULT) === UNSCOPED_PLANT,
    vendorStill: readScratch(VENDOR_SCOPED) === PLANTED,
    migrationRefused: report.boot?.migration?.refused === true,
    scopedInHisKeychain: hasHis(SCOPED_DEFAULT) || hasHis(VENDOR_SCOPED),
    stagedLeft: scratchServices.some((s) => s.includes('pending')),
    listedDefaultPresent: listed !== null && listed.some((l) => l.name === 'Default' && l.present === true),
    scratchServices
  };
  const v1 = gradeScoped(report.scoped);
  if (v1.ok) pass(`scoped vault: ${v1.why}`); else fail(`scoped vault: ${v1.why}`);
  say(`the scratch keychain now holds ${scratchServices.join(', ')}`);

  // READING 4. The cost.
  if (report.boot !== null && typeof report.boot.ms === 'number') {
    pass(`cold start cost: the boot observe took ${String(report.boot.ms)} ms and made ${String(report.boot.securityCalls)} security runs, off the critical path`);
  } else {
    fail('the boot line carried no timing');
  }

  // READING 3. The migration matrix over the real security on the scratch file.
  const matrix = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/probe-p208-migrate.mts'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, P208_KEYCHAIN: keychainFile, P208_ROOT: migrateRoot },
    timeout: 120_000
  });
  try {
    report.migration = JSON.parse(matrix.stdout.trim().split('\n').pop() ?? '{}');
  } catch {
    report.migration = { error: `${matrix.stdout.slice(-300)} ${matrix.stderr.slice(-300)}` };
  }
  const v3 = gradeMigration(report.migration);
  if (v3.ok) pass(`migration matrix: ${v3.why}`); else fail(`migration matrix: ${v3.why} ${JSON.stringify(report.migration).slice(0, 600)}`);
} finally {
  // THE SCRATCH KEYCHAIN GOES, whatever happened above.
  const deleted = security(['delete-keychain', keychainFile]);
  say(`scratch keychain deleted: rc ${String(deleted.code)}, file ${existsSync(keychainFile) ? 'still there' : 'gone'}`);
  rmSync(root, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// After.
// ---------------------------------------------------------------------------

const inventoryAfter = inventory();
const filesAfter = fileHashes();
report.inventoryAfter = inventoryAfter;
report.filesAfter = filesAfter;
const v5 = gradeInventory(inventoryBefore, inventoryAfter);
if (v5.ok) pass(`his keychain by attributes: ${v5.why}`); else fail(`his keychain by attributes: ${v5.why}`);
for (const note of v5.notes) say(note);
for (const [svce, a] of Object.entries(inventoryAfter)) say(`  after ${svce}  acct=${a.acct} cdat=${a.cdat} mdat=${a.mdat}`);
for (const [name, hash] of Object.entries(filesAfter)) {
  if (filesBefore[name] === hash) pass(`credential unmoved: ${name} ${hash}`);
  else fail(`credential MOVED: ${name} was ${filesBefore[name]}, is now ${hash}`);
}
if (searchList() === searchBefore && !searchBefore.includes(keychainFile)) pass('the keychain search list is what it was, and never held the scratch file');
else fail('the keychain search list changed');

// Count what is left, once, at the end.
const left = spawnSync('/bin/sh', ['-c', 'ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct | wc -l'], { encoding: 'utf8' });
say(`electron shaped processes on the machine at the end: ${(left.stdout ?? '').trim()} (his running app and any other workflow included)`);

const reportPath = join(outDir, 'p208-report.json');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
say(`wrote ${reportPath}`);

if (failures > 0) {
  console.error(`${TAG} ${String(failures)} reading(s) disagreed`);
  process.exit(1);
}
say('every reading agreed');
