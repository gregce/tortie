#!/usr/bin/env node
/**
 * `npm run probe:p208`. The Phase 208 app run: ONE launch on a scratch profile
 * over a SCRATCH KEYCHAIN the probe makes, proving that Tortie's own store
 * writes into the profile it is running in and that the person's own items did
 * not move.
 *
 * ## What it reads, in one app run
 *
 *  1. THE ATTACK THE PHASE EXISTS FOR, as Phase 304 left it. A scratch profile
 *     whose default claude store holds a PLANTED credential is launched, the
 *     boot observe runs, and the planted credential is kept in TORTIE'S OWN
 *     STORE, which since Phase 304 is a `safeStorage`-sealed FILE under the
 *     profile, `<profile>/gmux/logins/kept/claude.default.cred`: a regular
 *     file, mode 0600, whose sha256 is not the plant's and which holds no 64
 *     byte window of it. The scratch keychain holds NO `Tortie-credentials-*`
 *     item at all after the run, because the app writes no such item any
 *     more, and the vendor item planted for the store is exactly what it was.
 *     Until Phase 304 the same reading was a scoped keychain item under this
 *     profile's digest; at Phase 208's parent that write went to the item the
 *     person's real app reads, and here it can name nothing of his.
 *  2. THE SCRATCH PROFILE MIGRATES NOTHING. The boot line says the migration
 *     was refused, as every harness profile is; the unscoped plant Phase 208
 *     kept beside it is gone, because with no `Tortie-credentials-*` item
 *     written by the app the stronger reading is that none appears at all.
 *  3. THE MIGRATION MATRIX over the REAL `security` on the same scratch file,
 *     driven under node by build/probe-p208-migrate.mts over the SEALED vault
 *     and the real legacy arm: present, absent, both with the record naming
 *     either side, a staged leftover, a profile that is not the person's own,
 *     and Phase 304's two, the read-through of a scoped item and the boot pass
 *     sweeping a scoped duplicate beside a sealed file; every arm writes no
 *     `Tortie-credentials-*` item.
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
 *  6. HIS TWO CREDENTIAL FILES BY `lstat` ALONE, `~/.codex/auth.json` and
 *     `~/.claude/.credentials.json`: size, modification time and inode at
 *     both ends, or absent at both ends. Until the Phase 304 fix round this
 *     reading was a sha256 of each file, which opened and read a credential of
 *     his to grade it; a digest is not a token byte, but the rule every
 *     verifier runs under is that `stat` is the most a probe may do to a
 *     credential file of his, so the reading is the one build/probe-p304.mjs
 *     makes.
 *
 * ## Nothing of the person is read, written or spent
 *
 *  - `-g` and `-w` are NEVER passed against his keychain. `-w` is passed only
 *    with the scratch keychain path appended, to read back sentinels this file
 *    wrote. No credential file of his is opened: reading 6 is `lstat`.
 *  - `--use-mock-keychain` is passed (Phase 304), so the real `safeStorage`
 *    seals Tortie's own store over Chromium's deterministic in-process key and
 *    never reaches his `Tortie Safe Storage` item; the harness seal refuses to
 *    seal without it.
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

import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
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
 * Reading 1 and 2 (Phase 304). The planted credential is kept in the sealed
 * file under the profile, which is a regular 0600 file that is not the plant
 * and holds no window of it; the scratch keychain holds no `Tortie-credentials-*`
 * item at all; the vendor plant is what it was; the boot line refused the
 * migration; and nothing this run composed reached his keychain.
 */
export function gradeScoped(r) {
  const why = [];
  if (r.filePresent !== true) why.push('no sealed file for the default claude slot');
  if (r.fileIsRegular !== true) why.push('the sealed file is not a regular file');
  if (r.fileMode !== 0o600) why.push(`the sealed file is mode ${r.fileMode === null ? 'unreadable' : r.fileMode.toString(8)} rather than 600`);
  if (r.fileIsPlant !== false) why.push('THE SEALED FILE IS THE PLANT IN THE CLEAR');
  if (r.fileHoldsWindow !== false) why.push('THE SEALED FILE HOLDS A WINDOW OF THE PLANT');
  if (r.tortieItems !== 0) why.push(`${String(r.tortieItems)} Tortie-credentials item(s) in the scratch keychain, where the app writes none`);
  if (r.vendorStill !== true) why.push('the vendor plant in the scratch keychain was changed or removed');
  if (r.migrationRefused !== true) why.push('the boot line did not say the migration was refused');
  if (r.scopedInHisKeychain !== false) why.push('a name this run composed exists in his keychain');
  if (r.stagedLeft !== false) why.push('a staged file was left beside the slot');
  if (r.listedDefaultPresent !== true) why.push('the login list did not read the planted store as present');
  return why.length === 0
    ? { ok: true, why: 'the planted credential is kept in a sealed 0600 file under this profile, no Tortie item exists in the scratch keychain, and nothing reached his' }
    : { ok: false, why: why.join('; ') };
}

/** Reading 3. Every arm of the matrix over the real security behaved, and none wrote a Tortie item. */
export function gradeMigration(m) {
  const why = [];
  const a = (name) => m[name] ?? {};
  if (!(a('present').result?.moved === 1 && a('present').result?.deleted === 1 && a('present').fileHolds && a('present').unscopedGone && a('present').stagedGone && a('present').tortieItemsLeft === 0)) {
    why.push('present: not moved into the sealed file, deleted and left with no item');
  }
  if (!(a('absent').result?.moved === 0 && a('absent').result?.deleted === 0 && a('absent').filesWritten === 0 && a('absent').unscopedAbsent && a('absent').tortieItemsLeft === 0)) {
    why.push('absent: something was written or deleted');
  }
  if (!(a('bothRecordNamesOld').result?.moved === 1 && a('bothRecordNamesOld').fileHoldsRecorded && a('bothRecordNamesOld').unscopedGone && a('bothRecordNamesOld').tortieItemsLeft === 0)) {
    why.push('both with the record naming the old item: the sealed file was not rewritten');
  }
  if (!(a('bothRecordNamesScoped').result?.moved === 0 && a('bothRecordNamesScoped').result?.deleted === 1 && a('bothRecordNamesScoped').fileKept && a('bothRecordNamesScoped').unscopedGone && a('bothRecordNamesScoped').tortieItemsLeft === 0)) {
    why.push('both with the record naming the sealed file: the file did not win');
  }
  if (!(a('stagedLeftover').result?.deleted === 1 && a('stagedLeftover').residueGone && a('stagedLeftover').nothingMovedIn && a('stagedLeftover').tortieItemsLeft === 0)) {
    why.push('staged leftover: not deleted without being moved');
  }
  if (!(a('notOwnProfile').result?.refused === true && a('notOwnProfile').unscopedStill && a('notOwnProfile').filesWritten === 0)) {
    why.push('not the person own profile: the unscoped item was touched');
  }
  if (!(a('readThrough').answered && a('readThrough').fileHolds && a('readThrough').itemGone && a('readThrough').secondAnswered && a('readThrough').tortieItemsLeft === 0)) {
    why.push('read-through: the scoped item was not answered, sealed, read back and deleted');
  }
  if (!(a('duplicateSwept').result?.deleted === 1 && a('duplicateSwept').itemGone && a('duplicateSwept').fileHolds && a('duplicateSwept').tortieItemsLeft === 0)) {
    why.push('duplicate sweep: the scoped twin beside a sealed file was not deleted with the file intact');
  }
  if (!(m.ownProfile?.own === true && m.ownProfile?.scratch === false && m.ownProfile?.probes === false)) {
    why.push('isOwnProfile misread a shape');
  }
  return why.length === 0
    ? { ok: true, why: 'eight arms over the real security on the scratch keychain behaved, and none wrote a Tortie item' }
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

/**
 * Reading 6. One of his credential files by what it IS, unchanged: the same
 * size, modification time and inode at both ends, or absent at both ends.
 * Compared field by field, so a reading is never a digest of any byte of his.
 */
export function gradeFileIdentity(before, after) {
  if (before === 'absent' || after === 'absent') {
    return before === after
      ? { ok: true, why: 'absent at both ends' }
      : { ok: false, why: `${before === 'absent' ? 'APPEARED' : 'DISAPPEARED'} during the run` };
  }
  const moved = ['size', 'mtimeMs', 'ino'].filter((k) => before[k] !== after[k]);
  return moved.length === 0
    ? { ok: true, why: 'size, mtime and inode unchanged' }
    : { ok: false, why: `MOVED: ${moved.join(', ')}` };
}

if (process.argv.includes('--self-test')) {
  const good = {
    filePresent: true, fileIsRegular: true, fileMode: 0o600, fileIsPlant: false, fileHoldsWindow: false,
    tortieItems: 0, vendorStill: true, migrationRefused: true, scopedInHisKeychain: false,
    stagedLeft: false, listedDefaultPresent: true
  };
  const goodMatrix = {
    present: { result: { moved: 1, deleted: 1 }, fileHolds: true, unscopedGone: true, stagedGone: true, tortieItemsLeft: 0 },
    absent: { result: { moved: 0, deleted: 0 }, filesWritten: 0, unscopedAbsent: true, tortieItemsLeft: 0 },
    bothRecordNamesOld: { result: { moved: 1 }, fileHoldsRecorded: true, unscopedGone: true, tortieItemsLeft: 0 },
    bothRecordNamesScoped: { result: { moved: 0, deleted: 1 }, fileKept: true, unscopedGone: true, tortieItemsLeft: 0 },
    stagedLeftover: { result: { deleted: 1 }, residueGone: true, nothingMovedIn: true, tortieItemsLeft: 0 },
    notOwnProfile: { result: { refused: true }, unscopedStill: true, filesWritten: 0 },
    readThrough: { answered: true, fileHolds: true, itemGone: true, secondAnswered: true, tortieItemsLeft: 0 },
    duplicateSwept: { result: { deleted: 1 }, itemGone: true, fileHolds: true, tortieItemsLeft: 0 },
    ownProfile: { own: true, scratch: false, probes: false }
  };
  const inv = (mdat, cdat = 'c', acct = 'x') => ({ acct, cdat, mdat });
  const cases = [
    ['a sealed file that landed', () => gradeScoped(good).ok, true],
    ['no sealed file', () => gradeScoped({ ...good, filePresent: false, fileIsRegular: false, fileMode: null }).ok, false],
    ['the file at 0644', () => gradeScoped({ ...good, fileMode: 0o644 }).ok, false],
    ['the file in the clear', () => gradeScoped({ ...good, fileIsPlant: true, fileHoldsWindow: true }).ok, false],
    ['a Tortie item in the scratch keychain', () => gradeScoped({ ...good, tortieItems: 1 }).ok, false],
    ['the vendor plant touched', () => gradeScoped({ ...good, vendorStill: false }).ok, false],
    ['the migration not refused', () => gradeScoped({ ...good, migrationRefused: false }).ok, false],
    ['a name in his keychain', () => gradeScoped({ ...good, scopedInHisKeychain: true }).ok, false],
    ['a staged file left', () => gradeScoped({ ...good, stagedLeft: true }).ok, false],
    ['the whole matrix', () => gradeMigration(goodMatrix).ok, true],
    ['the present arm not deleting', () => gradeMigration({ ...goodMatrix, present: { ...goodMatrix.present, unscopedGone: false } }).ok, false],
    ['the present arm writing an item', () => gradeMigration({ ...goodMatrix, present: { ...goodMatrix.present, tortieItemsLeft: 1 } }).ok, false],
    ['the refused arm touching the item', () => gradeMigration({ ...goodMatrix, notOwnProfile: { ...goodMatrix.notOwnProfile, unscopedStill: false } }).ok, false],
    ['the read-through deleting before the file', () => gradeMigration({ ...goodMatrix, readThrough: { ...goodMatrix.readThrough, fileHolds: false } }).ok, false],
    ['the duplicate left beside the file', () => gradeMigration({ ...goodMatrix, duplicateSwept: { ...goodMatrix.duplicateSwept, itemGone: false, tortieItemsLeft: 1 } }).ok, false],
    ['an identical inventory', () => gradeInventory({ 'Tortie-credentials-claude.default': inv('m') }, { 'Tortie-credentials-claude.default': inv('m') }).ok, true],
    ['a Tortie item whose modification date moved', () => gradeInventory({ 'Tortie-credentials-claude.default': inv('m1') }, { 'Tortie-credentials-claude.default': inv('m2') }).ok, false],
    ['a vendor item whose modification date moved, which is allowed and noted', () => { const g = gradeInventory({ 'Claude Code-credentials': inv('m1') }, { 'Claude Code-credentials': inv('m2') }); return g.ok && g.notes.length === 1; }, true],
    ['an item that appeared', () => gradeInventory({}, { 'Tortie-credentials-claude.default-deadbeef': inv('m') }).ok, false],
    ['a creation date that moved', () => gradeInventory({ a: inv('m', 'c1') }, { a: inv('m', 'c2') }).ok, false],
    ['his file unchanged by lstat', () => gradeFileIdentity({ size: 4193, mtimeMs: 1, ino: 2 }, { size: 4193, mtimeMs: 1, ino: 2 }).ok, true],
    ['his file absent at both ends', () => gradeFileIdentity('absent', 'absent').ok, true],
    ['his file rewritten in place, same size', () => gradeFileIdentity({ size: 4193, mtimeMs: 1, ino: 2 }, { size: 4193, mtimeMs: 3, ino: 2 }).ok, false],
    ['his file replaced by rename', () => gradeFileIdentity({ size: 4193, mtimeMs: 1, ino: 2 }, { size: 4193, mtimeMs: 1, ino: 9 }).ok, false],
    ['his file appeared', () => gradeFileIdentity('absent', { size: 1, mtimeMs: 1, ino: 2 }).ok, false]
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

/**
 * His two credential files by what they ARE, never by what they hold: `lstat`
 * alone, the way build/probe-p304.mjs reads them, so no byte of either is
 * read to hash. Size, modification time and inode together move on any
 * rewrite, which is the reading; a digest would say the same and would need
 * the file open to say it.
 */
function statOf(path) {
  try {
    const st = lstatSync(path);
    return { size: st.size, mtimeMs: st.mtimeMs, ino: st.ino };
  } catch {
    return 'absent';
  }
}

const home = process.env['HOME'] ?? '';
const fileIdentities = () => ({
  '~/.codex/auth.json': statOf(join(home, '.codex', 'auth.json')),
  '~/.claude/.credentials.json': statOf(join(home, '.claude', '.credentials.json'))
});

const searchList = () => security(['list-keychains']).stdout;

const inventoryBefore = inventory();
const filesBefore = fileIdentities();
const searchBefore = searchList();
say(`his keychain before: ${String(Object.keys(inventoryBefore).length)} items in the two families, by attributes`);
for (const [svce, a] of Object.entries(inventoryBefore)) say(`  ${svce}  acct=${a.acct} cdat=${a.cdat} mdat=${a.mdat}`);
for (const [name, reading] of Object.entries(filesBefore)) say(`credential before, by lstat: ${name} ${JSON.stringify(reading)}`);

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
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
/** The logins root the app will compute for THIS profile, and its digest. */
const loginsRoot = join(profile, 'gmux', 'logins');
const profileDigest = digest8(loginsRoot);
/** The name a tree before Phase 304 would have written, which must now appear nowhere. */
const SCOPED_DEFAULT = `Tortie-credentials-claude.default-${profileDigest}`;
/** Where Tortie's own store keeps the default claude slot since Phase 304. */
const SEALED_DEFAULT = join(loginsRoot, 'kept', 'claude.default.cred');
const SEALED_STAGED = join(loginsRoot, 'kept', 'claude.default.pending.cred');
const VENDOR_SCOPED = `Claude Code-credentials-${digest8(defaultClaude)}`;
const PLANTED = JSON.stringify({ claudeAiOauth: { accessToken: 'P208-PLANTED-IN-THE-SCRATCH-DEFAULT-STORE', subscriptionType: 'max' } });

const hex = (text) => Buffer.from(text, 'utf8').toString('hex');
function plantInScratch(service, account, payload) {
  const { code } = security(['-i'], `add-generic-password -U -a "${account}" -s "${service}" -X "${hex(payload)}" "${keychainFile}"\n`);
  if (code !== 0) throw new Error(`the scratch keychain refused ${service}`);
}
const readScratch = (service) => {
  const { code, stdout } = security(['find-generic-password', '-s', service, '-w', keychainFile]);
  return code === 0 ? stdout.replace(/\n$/, '') : null;
};
const hasHis = (service) => security(['find-generic-password', '-s', service]).code === 0;
const modeOf = (path) => {
  try {
    return lstatSync(path).mode & 0o777;
  } catch {
    return null;
  }
};
const isRegular = (path) => {
  try {
    return lstatSync(path).isFile();
  } catch {
    return false;
  }
};

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

  // THE PLANT. The vendor scoped item for the scratch default store, holding
  // the planted credential. Phase 208 planted an unscoped Tortie item beside
  // it to prove a scratch profile left it alone; since Phase 304 the app
  // writes no `Tortie-credentials-*` item at all, so the stronger reading is
  // that none appears, and the plant would only have weakened it.
  plantInScratch(VENDOR_SCOPED, 'gdc', PLANTED);
  writeFileSync(join(defaultClaude, '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: 'probe@example.com', accountUuid: 'p208-uuid' } }), { mode: 0o600 });
  say(`planted ${VENDOR_SCOPED} in the scratch keychain`);

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
      args: [
        '--remote-debugging-port=0',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-timer-throttling',
        // PHASE 304. Tortie's own store seals through `safeStorage`, and the
        // harness seal refuses to seal without Chromium's mock keychain.
        '--use-mock-keychain'
      ],
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

  // READING 1 AND 2, off the sealed file and the scratch keychain after the
  // app has gone. The file is read for its digest and for the absence of any
  // window of the plant; no byte of it is printed.
  const { stdout: dump } = security(['dump-keychain', keychainFile]);
  const scratchServices = [...dump.matchAll(/"svce"<blob>="([^"\n]*)"/g)].map((m) => m[1]).sort();
  const sealedText = existsSync(SEALED_DEFAULT) ? readFileSync(SEALED_DEFAULT, 'utf8') : null;
  const windows = [0, Math.floor(PLANTED.length / 2) - 32, PLANTED.length - 64].map((at) => PLANTED.slice(Math.max(0, at), Math.max(0, at) + 64));
  report.scoped = {
    sealedFile: SEALED_DEFAULT.slice(profile.length),
    filePresent: sealedText !== null,
    fileIsRegular: isRegular(SEALED_DEFAULT),
    fileMode: modeOf(SEALED_DEFAULT),
    fileIsPlant: sealedText !== null && sha256(sealedText) === sha256(PLANTED),
    fileHoldsWindow: sealedText !== null && windows.some((w) => sealedText.includes(w)),
    tortieItems: scratchServices.filter((s) => s.startsWith('Tortie-credentials-')).length,
    neverWrittenName: SCOPED_DEFAULT,
    vendorStill: readScratch(VENDOR_SCOPED) === PLANTED,
    migrationRefused: report.boot?.migration?.refused === true,
    scopedInHisKeychain: hasHis(SCOPED_DEFAULT) || hasHis(VENDOR_SCOPED),
    stagedLeft: existsSync(SEALED_STAGED) || scratchServices.some((s) => s.includes('pending')),
    listedDefaultPresent: listed !== null && listed.some((l) => l.name === 'Default' && l.present === true),
    scratchServices
  };
  const v1 = gradeScoped(report.scoped);
  if (v1.ok) pass(`sealed vault: ${v1.why}`); else fail(`sealed vault: ${v1.why}`);
  say(`the scratch keychain now holds ${scratchServices.join(', ')}; the sealed file is ${sealedText === null ? 'absent' : `${String(sealedText.length)} bytes`}`);

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
const filesAfter = fileIdentities();
report.inventoryAfter = inventoryAfter;
report.filesAfter = filesAfter;
const v5 = gradeInventory(inventoryBefore, inventoryAfter);
if (v5.ok) pass(`his keychain by attributes: ${v5.why}`); else fail(`his keychain by attributes: ${v5.why}`);
for (const note of v5.notes) say(note);
for (const [svce, a] of Object.entries(inventoryAfter)) say(`  after ${svce}  acct=${a.acct} cdat=${a.cdat} mdat=${a.mdat}`);
for (const [name, reading] of Object.entries(filesAfter)) {
  const v = gradeFileIdentity(filesBefore[name], reading);
  if (v.ok) pass(`credential unmoved, by lstat: ${name} ${JSON.stringify(reading)}`);
  else fail(`credential MOVED, by lstat: ${name} was ${JSON.stringify(filesBefore[name])}, is now ${JSON.stringify(reading)}`);
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
