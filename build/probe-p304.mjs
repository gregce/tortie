#!/usr/bin/env node
/**
 * `npm run probe:p304`. The Phase 304 app run: Tortie's own vault is a sealed
 * file, a sign in of any size is kept, and the keychain items an older build
 * kept move over ONE AT A TIME in an order that never leaves zero copies.
 *
 * ## What it reads, in FOUR launches, one at a time and never beside another
 *
 *  1. THE MIGRATION WITH A KILL AT EACH STEP, launches 1 to 3. Three codex
 *     logins are planted in the scratch profile with a record each, and three
 *     scoped `Tortie-credentials-<slot>-<digest>` items, the shape a tree
 *     before this phase kept, are planted in a SCRATCH keychain the probe made.
 *     Each launch names one slot and one step in the seam's `stop` file, the
 *     boot observe reads that slot through, and the app is ended with SIGKILL
 *     at that step: before the sealed file is written, before the file is read
 *     back, and before the item is deleted. After every kill, from OUTSIDE,
 *     the item is still there and the file is present or absent exactly as
 *     the entry's table says, so a copy exists every time. The fourth launch
 *     reads every row `kept`, every sealed file present, and the scratch
 *     keychain holding exactly TWO items, one from each kill that fell AFTER
 *     the rename: a kill before the read-back leaves a complete sealed file
 *     at its final name, so the next `get` hits it and by design asks the
 *     keychain nothing, exactly as a kill before the delete does. Each is a
 *     duplicate beside its file, still holding its planted bytes, which only
 *     the boot pass of the person's own profile sweeps and which every
 *     harness profile is refused (build/p304/SPEC.md §3.5, rows "after
 *     rename, before read-back" and "after read-back, before delete"). The
 *     kill before the write leaves no file, so that slot reads through on
 *     launch 4 and its item goes. The sweep is proved under plain node by
 *     `npm run conformance:credentials` (rule 17e) and over the REAL
 *     `security` by build/probe-p208-migrate.mts.
 *  2. THE SIZE, launch 4. A 4,193 byte payload, what `stat` reads of the
 *     operator's own `~/.codex/auth.json`, and a 1 MB payload are kept through
 *     the shipping `vaultPut` and read back through the shipping `vaultGet`
 *     inside the app, through the REAL `safeStorage` over Chromium's mock
 *     keychain, and compared by sha256 of the answer against sha256 of the
 *     payload. The two sealed files exist, are mode 0600, are not the payload,
 *     hold no 64 byte window of it, and decode to bytes beginning `v10`, which
 *     is Chromium's own seal prefix and the proof the real OSCrypt path ran.
 *  3. THE OBSERVE, launch 4. A fourth codex login whose store holds a 4,193
 *     byte synthetic credential is read `kept` at boot; the store is then
 *     emptied from outside and the login chosen, and the store is read back
 *     holding the plant's bytes by sha256, which is the vault's answer written
 *     back exactly. At the parent the observe is refused, nothing is kept, and
 *     the choice says there is no kept sign in.
 *  4. THE HOSTILE LINKS, launch 4. Before the launch a symbolic link is planted
 *     at that login's `<slot>.cred.writing` and at `<slot>.pending.cred.writing`,
 *     each pointing at a stand in for `~/.codex/auth.json` under the scratch
 *     tree; after the observe the stand in is unchanged by sha256, the slot's
 *     file is a regular file, and both links are gone.
 *  5. THE SAFE STORAGE GUARD, before launch 1 and after launch 4: the count of
 *     `Tortie Safe Storage` items his search list answers, by exit code alone,
 *     is the same, so no launch here made or moved his key.
 *
 * ## Nothing of the person is read, written or spent
 *
 *  - A SCRATCH `HOME` is the default for every `security` call and for the app
 *    (the Phase 287 pattern): `security default-keychain` under it must answer
 *    "could not be found" before anything is created and again at the end, so
 *    a cut line can aim at nothing. His two credential files are read by
 *    `lstat` alone. THE ONE `security` CALL AIMED AT HIS SEARCH LIST is the
 *    guard above, by attributes, exit code only, output never printed, and it
 *    is the entry's own ask. `-g` is never passed; `-w` only against the
 *    scratch file.
 *  - The scratch keychain is made with `security create-keychain` under the
 *    harness directory, never added to the search list, and deleted with
 *    `delete-keychain` in the `finally` below.
 *  - `--use-mock-keychain` is passed, so the real `safeStorage` API runs the
 *    real OSCrypt path over a deterministic in-process key and never reaches
 *    his `Tortie Safe Storage` item (`src/main/index.ts`, the 2026-08-16
 *    incident). The seam refuses to seal without it.
 *  - NO AGENT RUNS, no session is created, no turn is taken and no token is
 *    spent. `CLAUDE_CONFIG_DIR` and `CODEX_HOME` point at directories this
 *    file made. NO PAYLOAD BYTE reaches the log or the report: every reading
 *    is a digest, a length, a mode or a boolean.
 *  - Every Electron goes through build/electron-run.mjs and is ended in that
 *    helper's `finally`; a launch this probe kills on purpose is ended there
 *    too. The tmux socket is the scratch one the harness handed us.
 *
 * ## The parent measurement
 *
 * `P304_PARENT_CHECKOUT=<a BUILT worktree at the parent commit>` points the
 * same four launches at that build. There the vault is the keychain: the
 * seam is absent so the drive line never appears and the size arm is graded
 * `unreadable, the build predates the seam`; the three planted items are read
 * in place and never move; the 4,193 byte store is refused and nothing is
 * kept; the links stay where they were planted. Every reading is the same
 * file's, so the two runs are one measurement.
 *
 * ## Usage, from the worktree root
 *
 *   npm run probe:p304
 *   P304_PARENT_CHECKOUT=/private/tmp/wt-p299 node build/harness-socket.mjs \
 *     --fresh gmux-p304 'node build/probe-p304.mjs'
 *   node build/probe-p304.mjs --self-test    the graders alone, launches nothing
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
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// THE HELPER IS A STATIC IMPORT, the way build/probe-p204-accounts.mjs does
// it, so `build/assert-electron-teardown.mjs` counts this file in the
// population that reaches it and the floor it raised can catch this probe
// being deleted again. Importing it launches nothing; `--self-test` still
// launches nothing. The CDP helpers are imported below the self test instead,
// because build/cdp-target.mjs runs its OWN fixtures and exits when it sees
// `--self-test` on the command line.
import { withElectron } from './electron-run.mjs';

const TAG = '[p304]';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const say = (line) => console.log(`${TAG} ${line}`);
const pass = (line) => console.log(`${TAG} PASS ${line}`);
let failures = 0;
const fail = (line) => {
  failures += 1;
  console.error(`${TAG} FAIL ${line}`);
};

// ---------------------------------------------------------------------------
// The graders, pure, and the only thing --self-test runs.
// ---------------------------------------------------------------------------

/**
 * Where a kill at one step must leave the copies (build/p304/SPEC.md §3.5).
 * `item` is the keychain item, `file` the sealed file at `<slot>.cred`.
 */
export const STEP_LEAVES = {
  'before-write': { item: true, file: false },
  'before-readback': { item: true, file: true },
  'before-delete': { item: true, file: true }
};

/**
 * Reading 1. After a kill at `step`, the copies are exactly as the table
 * says, and at least one exists. At the parent the vault is the keychain, so
 * nothing is killed, the item stays and no file is ever written.
 */
export function gradeKill(step, r, atParent) {
  const why = [];
  if (atParent) {
    if (r.killed) why.push('the parent build was killed, but it has no seam to kill');
    if (!r.item) why.push('the item is gone at the parent, where nothing moves');
    if (r.file) why.push('a sealed file exists at the parent, which has no sealed vault');
  } else {
    const want = STEP_LEAVES[step];
    if (want === undefined) why.push(`no such step: ${String(step)}`);
    if (!r.killed) why.push('the app was not killed at the step');
    if (want !== undefined && r.item !== want.item) why.push(`the item is ${r.item ? 'present' : 'ABSENT'}`);
    if (want !== undefined && r.file !== want.file) why.push(`the sealed file is ${r.file ? 'present' : 'absent'} where the table says ${want.file ? 'present' : 'absent'}`);
    if (want !== undefined && r.file && r.fileIsRegular !== true) why.push('the sealed file is not a regular file');
  }
  if (!r.item && !r.file) why.push('NO COPY EXISTS');
  return why.length === 0
    ? { ok: true, why: `${step}: item ${r.item ? 'present' : 'absent'}, file ${r.file ? 'present' : 'absent'}, a copy exists` }
    : { ok: false, why: why.join('; ') };
}

/**
 * Reading 1's end. After the clean launch every planted row reads `kept`, and
 * at HEAD every slot has a sealed file while the scratch keychain holds
 * exactly the TWO duplicates the kills after the rename left, the
 * before-readback slot's and the before-delete slot's, each still holding its
 * planted bytes; a harness profile is refused the sweep, so nothing here can
 * remove them, and the product is right to leave them (SPEC §3.5). The
 * before-write slot has no file after its kill, so launch 4 reads it through
 * and its item goes. At the parent the three items are read in place and no
 * file exists.
 */
export function gradeMoved(r, atParent) {
  const why = [];
  if (r.rowsKept !== 3) why.push(`${String(r.rowsKept)} of 3 planted rows read kept`);
  if (atParent) {
    if (r.filesPresent !== 0) why.push(`${String(r.filesPresent)} sealed files at the parent`);
    if (r.itemsLeft !== 3) why.push(`${String(r.itemsLeft)} items left at the parent rather than the 3 planted`);
  } else {
    if (r.filesPresent !== 3) why.push(`${String(r.filesPresent)} of 3 sealed files present`);
    if (r.itemsLeft !== 2) why.push(`${String(r.itemsLeft)} items left rather than the 2 duplicates the kills after the rename leave`);
    if (r.duplicatesAreTheTwoKilledAfterRename !== true) why.push('the items left are not the before-readback and before-delete slots');
    if (r.duplicatesHoldTheirBytes !== true) why.push('a duplicate no longer holds its planted bytes');
  }
  return why.length === 0
    ? { ok: true, why: atParent ? '3 rows kept from items read in place, no file' : '3 rows kept, 3 sealed files, 2 duplicate items left by the kills after the rename, each holding its bytes' }
    : { ok: false, why: why.join('; ') };
}

/**
 * Reading 2. One payload round tripped through the shipping vault inside the
 * app: the answer's digest equals the payload's, the file is not the payload
 * and holds no window of it, it is 0600, and its bytes begin with Chromium's
 * own `v10`. At the parent the drive line is absent, and that is the reading.
 */
export function gradeSize(r, atParent) {
  if (atParent) {
    return r.line === null
      ? { ok: true, why: `${r.name}: unreadable, the build predates the seam` }
      : { ok: false, why: `${r.name}: the parent printed a drive line, but it has no seam` };
  }
  const why = [];
  if (r.line === null) why.push('no drive line');
  if (r.put !== 'ok') why.push(`put=${String(r.put)}`);
  if (r.seal !== 'available') why.push(`seal=${String(r.seal)}`);
  if (r.bytes !== r.wantBytes) why.push(`${String(r.bytes)} bytes answered for ${String(r.wantBytes)}`);
  if (r.sha256 !== r.wantSha256) why.push('the answer digest is not the payload digest');
  if (!r.filePresent) why.push('no sealed file');
  if (r.fileMode !== 0o600) why.push(`file mode ${r.fileMode === null ? 'unreadable' : r.fileMode.toString(8)}`);
  if (r.fileIsPayload) why.push('THE FILE IS THE PAYLOAD');
  if (r.fileHoldsWindow) why.push('THE FILE HOLDS A WINDOW OF THE PAYLOAD');
  if (r.v10 !== true) why.push('the sealed bytes do not begin with v10');
  return why.length === 0
    ? { ok: true, why: `${r.name}: ${String(r.bytes)} bytes round tripped by sha256, sealed v10, 0600` }
    : { ok: false, why: `${r.name}: ${why.join('; ')}` };
}

/**
 * Reading 3. The 4,193 byte store is kept at boot and put back byte exact
 * after the store is emptied and the login chosen; at the parent it is
 * refused and the choice says there is no kept sign in.
 */
export function gradeObserve(r, atParent) {
  const why = [];
  if (atParent) {
    if (r.keptAtBoot !== false) why.push('the parent read the 4,193 byte store as kept');
    if (r.itemForSlot) why.push('the parent added an item for the over-cap store');
    if (r.storeAfterChoose !== null) why.push('the parent put something back');
  } else {
    if (r.keptAtBoot !== true) why.push('the 4,193 byte store was not kept at boot');
    if (r.restoresAtBoot !== false) why.push('the row offered to put back a store that holds the account');
    if (r.restoresAfterEmpty !== true) why.push('the row did not offer the account back once the store was emptied');
    if (r.chooseOk !== true) why.push('the choice was refused');
    if (r.storeAfterChoose !== r.plantSha256) why.push('the store put back is not the plant by sha256');
    if (r.itemForSlot) why.push('an item was added to the keychain for the kept store');
    if (r.filePresent !== true) why.push('no sealed file for the kept store');
  }
  return why.length === 0
    ? { ok: true, why: atParent ? 'refused at boot, nothing kept, nothing put back' : 'kept at boot, offered back once emptied, put back byte exact by sha256' }
    : { ok: false, why: why.join('; ') };
}

/** Reading 4. The stand in is untouched; at HEAD the links are gone and the file is regular. */
export function gradeLinks(r, atParent) {
  const why = [];
  if (r.standInSha256 !== r.standInBefore) why.push('THE STAND IN CHANGED');
  if (!atParent) {
    if (r.writingLinkLeft) why.push('the link at <slot>.cred.writing is still there');
    if (r.pendingLinkLeft) why.push('the link at <slot>.pending.cred.writing is still there');
    if (r.fileIsRegular !== true) why.push('<slot>.cred is not a regular file');
  }
  return why.length === 0
    ? { ok: true, why: atParent ? 'the stand in is untouched' : 'the stand in is untouched, both links gone, the slot a regular file' }
    : { ok: false, why: why.join('; ') };
}

/** Reading 5. The Safe Storage count is the same at both ends. */
export function gradeSafeStorage(before, after) {
  return before === after
    ? { ok: true, why: `his Tortie Safe Storage count is what it was (${String(before)})` }
    : { ok: false, why: `HIS TORTIE SAFE STORAGE COUNT MOVED from ${String(before)} to ${String(after)}` };
}

/** The scratch HOME has no default keychain (Phase 287's measured condition). */
export function gradeDefaultKeychainAbsent(run) {
  if (run.code === 0) return { ok: false, why: 'a default keychain RESOLVED under the scratch HOME' };
  return /could not be found/i.test(run.stdout)
    ? { ok: true, why: 'no default keychain resolves under the scratch HOME' }
    : { ok: false, why: `default-keychain answered something else: ${run.stdout.trim()}` };
}

/** His two credential files, by what they ARE, unchanged. */
export function gradeFileIdentity(before, after) {
  const moved = Object.keys(before).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
  return moved.length === 0
    ? { ok: true, why: 'both by lstat, unchanged' }
    : { ok: false, why: `MOVED: ${moved.join(', ')}` };
}

/** One drive line, parsed. Null when there is none for that name. */
export function parseDriveLine(text, name) {
  const re = new RegExp(`\\[gmux\\] vault-drive ${name} put=(ok|refused) bytes=(\\d+) sha256=([0-9a-f]+|none) seal=(available|unavailable)`);
  const m = re.exec(text);
  if (m === null) return null;
  return { put: m[1], bytes: Number(m[2]), sha256: m[3], seal: m[4] };
}

if (process.argv.includes('--self-test')) {
  const cases = [
    ['a kill before the write', () => gradeKill('before-write', { killed: true, item: true, file: false }, false).ok, true],
    ['a kill before the read back', () => gradeKill('before-readback', { killed: true, item: true, file: true, fileIsRegular: true }, false).ok, true],
    ['a kill before the delete', () => gradeKill('before-delete', { killed: true, item: true, file: true, fileIsRegular: true }, false).ok, true],
    ['a kill that lost the item', () => gradeKill('before-write', { killed: true, item: false, file: false }, false).ok, false],
    ['a kill before the write that left a file', () => gradeKill('before-write', { killed: true, item: true, file: true, fileIsRegular: true }, false).ok, false],
    ['a kill before the delete whose file is a link', () => gradeKill('before-delete', { killed: true, item: true, file: true, fileIsRegular: false }, false).ok, false],
    ['no kill at HEAD', () => gradeKill('before-write', { killed: false, item: true, file: false }, false).ok, false],
    ['the parent, item in place, no file', () => gradeKill('before-write', { killed: false, item: true, file: false }, true).ok, true],
    ['the parent moved an item', () => gradeKill('before-write', { killed: false, item: false, file: false }, true).ok, false],
    ['everything moved, two duplicates, both after the rename', () => gradeMoved({ rowsKept: 3, filesPresent: 3, itemsLeft: 2, duplicatesAreTheTwoKilledAfterRename: true, duplicatesHoldTheirBytes: true }, false).ok, true],
    ['a row not kept', () => gradeMoved({ rowsKept: 2, filesPresent: 3, itemsLeft: 2, duplicatesAreTheTwoKilledAfterRename: true, duplicatesHoldTheirBytes: true }, false).ok, false],
    ['one item left, which the build round graded as right', () => gradeMoved({ rowsKept: 3, filesPresent: 3, itemsLeft: 1, duplicatesAreTheTwoKilledAfterRename: false, duplicatesHoldTheirBytes: true }, false).ok, false],
    ['three items left', () => gradeMoved({ rowsKept: 3, filesPresent: 3, itemsLeft: 3, duplicatesAreTheTwoKilledAfterRename: false, duplicatesHoldTheirBytes: true }, false).ok, false],
    ['a duplicate that is not one of the two', () => gradeMoved({ rowsKept: 3, filesPresent: 3, itemsLeft: 2, duplicatesAreTheTwoKilledAfterRename: false, duplicatesHoldTheirBytes: true }, false).ok, false],
    ['a duplicate whose bytes moved', () => gradeMoved({ rowsKept: 3, filesPresent: 3, itemsLeft: 2, duplicatesAreTheTwoKilledAfterRename: true, duplicatesHoldTheirBytes: false }, false).ok, false],
    ['zero items left, which the harness cannot do', () => gradeMoved({ rowsKept: 3, filesPresent: 3, itemsLeft: 0, duplicatesAreTheTwoKilledAfterRename: false, duplicatesHoldTheirBytes: false }, false).ok, false],
    ['the parent, three items in place', () => gradeMoved({ rowsKept: 3, filesPresent: 0, itemsLeft: 3 }, true).ok, true],
    ['a round trip', () => gradeSize({ name: 'a', line: 'x', put: 'ok', seal: 'available', bytes: 4193, wantBytes: 4193, sha256: 'd', wantSha256: 'd', filePresent: true, fileMode: 0o600, fileIsPayload: false, fileHoldsWindow: false, v10: true }, false).ok, true],
    ['a digest that differs', () => gradeSize({ name: 'a', line: 'x', put: 'ok', seal: 'available', bytes: 4193, wantBytes: 4193, sha256: 'd', wantSha256: 'e', filePresent: true, fileMode: 0o600, fileIsPayload: false, fileHoldsWindow: false, v10: true }, false).ok, false],
    ['a file that is the payload', () => gradeSize({ name: 'a', line: 'x', put: 'ok', seal: 'available', bytes: 4193, wantBytes: 4193, sha256: 'd', wantSha256: 'd', filePresent: true, fileMode: 0o600, fileIsPayload: true, fileHoldsWindow: true, v10: false }, false).ok, false],
    ['a file at 0644', () => gradeSize({ name: 'a', line: 'x', put: 'ok', seal: 'available', bytes: 4193, wantBytes: 4193, sha256: 'd', wantSha256: 'd', filePresent: true, fileMode: 0o644, fileIsPayload: false, fileHoldsWindow: false, v10: true }, false).ok, false],
    ['the seal unavailable', () => gradeSize({ name: 'a', line: 'x', put: 'refused', seal: 'unavailable', bytes: 0, wantBytes: 4193, sha256: 'none', wantSha256: 'd', filePresent: false, fileMode: null, fileIsPayload: false, fileHoldsWindow: false, v10: false }, false).ok, false],
    ['the parent with no drive line', () => gradeSize({ name: 'a', line: null }, true).ok, true],
    ['the parent printing a drive line', () => gradeSize({ name: 'a', line: 'x' }, true).ok, false],
    ['kept and put back', () => gradeObserve({ keptAtBoot: true, restoresAtBoot: false, restoresAfterEmpty: true, chooseOk: true, storeAfterChoose: 'p', plantSha256: 'p', itemForSlot: false, filePresent: true }, false).ok, true],
    ['put back differently', () => gradeObserve({ keptAtBoot: true, restoresAtBoot: false, restoresAfterEmpty: true, chooseOk: true, storeAfterChoose: 'q', plantSha256: 'p', itemForSlot: false, filePresent: true }, false).ok, false],
    ['an item added for the kept store', () => gradeObserve({ keptAtBoot: true, restoresAtBoot: false, restoresAfterEmpty: true, chooseOk: true, storeAfterChoose: 'p', plantSha256: 'p', itemForSlot: true, filePresent: true }, false).ok, false],
    ['the parent refusing', () => gradeObserve({ keptAtBoot: false, itemForSlot: false, storeAfterChoose: null }, true).ok, true],
    ['the parent keeping it', () => gradeObserve({ keptAtBoot: true, itemForSlot: false, storeAfterChoose: null }, true).ok, false],
    ['the links gone', () => gradeLinks({ standInSha256: 's', standInBefore: 's', writingLinkLeft: false, pendingLinkLeft: false, fileIsRegular: true }, false).ok, true],
    ['the stand in changed', () => gradeLinks({ standInSha256: 't', standInBefore: 's', writingLinkLeft: false, pendingLinkLeft: false, fileIsRegular: true }, false).ok, false],
    ['a link left at HEAD', () => gradeLinks({ standInSha256: 's', standInBefore: 's', writingLinkLeft: true, pendingLinkLeft: false, fileIsRegular: true }, false).ok, false],
    ['the parent, links left, stand in untouched', () => gradeLinks({ standInSha256: 's', standInBefore: 's', writingLinkLeft: true, pendingLinkLeft: true, fileIsRegular: false }, true).ok, true],
    ['the Safe Storage count held', () => gradeSafeStorage(1, 1).ok, true],
    ['the Safe Storage count moved', () => gradeSafeStorage(1, 2).ok, false],
    ['no default keychain under the scratch HOME', () => gradeDefaultKeychainAbsent({ code: 1, stdout: 'security: SecKeychainCopyDefault: A default keychain could not be found.' }).ok, true],
    ['a default keychain resolved', () => gradeDefaultKeychainAbsent({ code: 0, stdout: '"/Users/x/Library/Keychains/login.keychain-db"' }).ok, false],
    ['his files unchanged', () => gradeFileIdentity({ a: { size: 1, ino: 2 } }, { a: { size: 1, ino: 2 } }).ok, true],
    ['his file moved', () => gradeFileIdentity({ a: { size: 1, ino: 2 } }, { a: { size: 2, ino: 2 } }).ok, false],
    ['a drive line parsed', () => JSON.stringify(parseDriveLine('x\n[gmux] vault-drive a put=ok bytes=4193 sha256=abc seal=available\n', 'a')) === JSON.stringify({ put: 'ok', bytes: 4193, sha256: 'abc', seal: 'available' }), true],
    ['a drive line for another name', () => parseDriveLine('[gmux] vault-drive a put=ok bytes=4193 sha256=abc seal=available\n', 'b') === null, true]
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
// The CDP helpers, imported here for the reason given beside the helper's
// import above, and then the refusals, in order, before anything is made.
// ---------------------------------------------------------------------------

const { cdpEval, wsConnect } = await import('./cdp-client.mjs');
const { pickRendererTarget } = await import('./cdp-target.mjs');

/** The scratch tree, once it has a name, so a refusal can take it with it. */
let scratchRoot = '';
const refuse = (why) => {
  if (scratchRoot !== '') rmSync(scratchRoot, { recursive: true, force: true });
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};

if (process.platform !== 'darwin') refuse('this probe drives the macOS keychain and runs on macOS only');
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') refuse('no GMUX_TMUX_SOCKET. Run me through the harness: node build/harness-socket.mjs --fresh gmux-p304 "node build/probe-p304.mjs"');
if (socket === 'gmux' || socket === 'default') refuse(`refusing to run on "${socket}", which is not a harness socket`);
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere the app would accept a scratch keychain from');

const parentCheckout = (process.env['P304_PARENT_CHECKOUT'] ?? '').trim();
const checkout = parentCheckout !== '' ? resolve(parentCheckout) : repoRoot;
const tag = parentCheckout !== '' ? 'parent' : 'head';
const atParent = parentCheckout !== '';
if (!existsSync(join(checkout, 'out', 'main', 'index.js'))) {
  refuse(
    `${join(checkout, 'out', 'main', 'index.js')} is missing. ` +
      (atParent ? 'P304_PARENT_CHECKOUT must name a BUILT worktree: run npm run build in that checkout first.' : 'Run npm run build first.')
  );
}

const outDir = resolve(repoRoot, (process.env['P304_OUT_DIR'] ?? '').trim() || 'out/p304');
mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------------------
// The scratch world, all under the harness directory, made BEFORE the first
// `security` call because the scratch HOME is one of its directories.
// ---------------------------------------------------------------------------

const rawRoot = join(harnessDir, `gmux-p304-${String(process.pid)}`);
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(rawRoot, { recursive: true });
const root = realpathSync(rawRoot);
scratchRoot = root;
const profile = join(root, 'profile');
const defaultCodex = join(root, 'default-codex');
const defaultClaude = join(root, 'default-claude');
const driveDir = join(root, 'drive');
const standInDir = join(root, 'stand-in');
/** The HOME every `security` call and the app itself get. */
const scratchHome = join(root, 'home');
for (const dir of [profile, defaultCodex, defaultClaude, driveDir, standInDir, scratchHome]) mkdirSync(dir, { recursive: true, mode: 0o700 });

const SECURITY = '/usr/bin/security';
const keychainFile = join(root, 'scratch.keychain-db');
const keychainPassword = randomBytes(12).toString('hex');
/** Every command that can reach an ITEM rather than a setting. */
const ITEM_COMMANDS = new Set(['dump-keychain', 'find-generic-password', 'add-generic-password', 'delete-generic-password']);
/** HIS home, only ever asked ABOUT and never used as a `HOME`, except by the one guard below. */
const hisHome = process.env['HOME'] ?? '';

function security(args, input) {
  if (args.includes('-g')) throw new Error('this probe never passes -g');
  if (args.includes('-w') && args[args.length - 1] !== keychainFile) throw new Error('this probe passes -w only against the scratch keychain');
  if (ITEM_COMMANDS.has(args[0]) && args[args.length - 1] !== keychainFile) throw new Error(`${args[0]} must name the scratch keychain`);
  const run = spawnSync(SECURITY, args, { encoding: 'utf8', input, timeout: 15_000, env: { ...process.env, HOME: scratchHome } });
  return { code: run.status ?? 1, stdout: run.stdout ?? '', err: run.stderr ?? '' };
}

/**
 * THE SAFE STORAGE GUARD (build/p304/SPEC.md §5.7), the one call aimed at his
 * search list. Attributes only, never `-g` or `-w`, under his real HOME, and
 * only the EXIT CODE is kept: 0 means an item exists, anything else means
 * none does. Nothing it prints is read or written anywhere.
 */
function hisSafeStorageCount() {
  const run = spawnSync(SECURITY, ['find-generic-password', '-s', 'Tortie Safe Storage'], {
    stdio: ['ignore', 'ignore', 'ignore'],
    timeout: 15_000,
    env: { ...process.env, HOME: hisHome }
  });
  return run.status === 0 ? 1 : 0;
}

const defaultKeychain = () => {
  const run = security(['default-keychain']);
  return { code: run.code, stdout: `${run.stdout}${run.err}` };
};
const searchList = () => security(['list-keychains']).stdout;
const statOf = (path) => {
  try {
    const st = lstatSync(path);
    return { size: st.size, mtimeMs: st.mtimeMs, ino: st.ino };
  } catch {
    return 'absent';
  }
};
const hisFiles = () => ({
  '~/.codex/auth.json': statOf(join(hisHome, '.codex', 'auth.json')),
  '~/.claude/.credentials.json': statOf(join(hisHome, '.claude', '.credentials.json'))
});

// NOTHING IS CREATED UNTIL THE SCRATCH HOME HAS NO DEFAULT KEYCHAIN.
const defaultKeychainBefore = defaultKeychain();
{
  const v = gradeDefaultKeychainAbsent(defaultKeychainBefore);
  if (!v.ok) refuse(`the scratch HOME ${scratchHome} answers a default keychain: ${v.why}`);
  say(`before anything is created, default-keychain under the scratch HOME: ${defaultKeychainBefore.stdout.trim()}`);
}
const filesBefore = hisFiles();
const searchBefore = searchList();
const safeStorageBefore = hisSafeStorageCount();
say(`his Tortie Safe Storage item, by exit code alone: ${String(safeStorageBefore)}`);
for (const [name, reading] of Object.entries(filesBefore)) say(`credential before: ${name} ${JSON.stringify(reading)}`);

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const digest8 = (text) => sha256(text).slice(0, 8);
const hex = (text) => Buffer.from(text, 'utf8').toString('hex');
const loginsRoot = join(profile, 'gmux', 'logins');
const keptDir = join(loginsRoot, 'kept');
const profileDigest = digest8(loginsRoot);
const scopedName = (slot) => `Tortie-credentials-${slot}-${profileDigest}`;
const credPath = (slot) => join(keptDir, `${slot}.cred`);
const stamp = Date.now().toString(36);

/** A codex credential of EXACTLY `bytes` bytes for one account (the Phase 287 shape). */
function bigCodexAuth(who, bytes) {
  const claim = Buffer.from(JSON.stringify({ sub: `u-${who}-${stamp}`, email: `${who}@example.com` }), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const base = { tokens: { access_token: `P304-${who}-${stamp}`, account_id: `acct-${who}`, id_token: `h.${claim}.s` }, p304_pad: '' };
  const need = bytes - Buffer.byteLength(JSON.stringify(base), 'utf8');
  if (need < 9) throw new Error(`${String(bytes)} bytes is too small`);
  base.p304_pad = `P304-pad-${'x'.repeat(need - 9)}`;
  const text = JSON.stringify(base);
  if (Buffer.byteLength(text, 'utf8') !== bytes) throw new Error('composed the wrong size');
  return text;
}

/** The three logins the migration arm moves, and the fourth the observe arm keeps. */
const LOGINS = [
  { id: 'a1'.repeat(8), name: 'one.example', step: 'before-write' },
  { id: 'b2'.repeat(8), name: 'two.example', step: 'before-readback' },
  { id: 'c3'.repeat(8), name: 'three.example', step: 'before-delete' }
];
const OBSERVE = { id: 'd4'.repeat(8), name: 'four.example' };
const slotOf = (id) => `codex.${id}`;
const PLANTED = Object.fromEntries(LOGINS.map((l) => [l.id, bigCodexAuth(l.name.split('.')[0], 1_200 + LOGINS.indexOf(l) * 7)]));
const OBSERVE_PLANT = bigCodexAuth('four', 4_193);
const OBSERVE_SHA = sha256(OBSERVE_PLANT);

mkdirSync(loginsRoot, { recursive: true, mode: 0o700 });
const now = Date.now();
writeFileSync(
  join(loginsRoot, 'logins.json'),
  JSON.stringify({ v: 1, logins: [...LOGINS, OBSERVE].map((l) => ({ provider: 'codex', id: l.id, name: l.name, createdAt: now })), chosen: {} }, null, 2),
  { mode: 0o600 }
);
const kept = { v: 1, slots: {} };
for (const l of LOGINS) {
  mkdirSync(join(loginsRoot, 'codex', l.id), { recursive: true, mode: 0o700 });
  kept.slots[slotOf(l.id)] = { email: `${l.name.split('.')[0]}@example.com`, subject: `u-${l.name.split('.')[0]}-${stamp}`, digest: sha256(PLANTED[l.id]), account: null, from: null, at: now, superseded: null };
}
writeFileSync(join(loginsRoot, 'kept.json'), JSON.stringify(kept, null, 2), { mode: 0o600 });
// THE OBSERVE LOGIN: a directory holding the 4,193 byte store, no record.
mkdirSync(join(loginsRoot, 'codex', OBSERVE.id), { recursive: true, mode: 0o700 });
writeFileSync(join(loginsRoot, 'codex', OBSERVE.id, 'auth.json'), OBSERVE_PLANT, { mode: 0o600 });
// A small default codex store, so the default row is an ordinary one.
writeFileSync(join(defaultCodex, 'auth.json'), bigCodexAuth('own', 600), { mode: 0o600 });

// THE HOSTILE LINKS, planted before any launch, at the observe login's two
// staged names, pointing at a stand in for ~/.codex/auth.json.
mkdirSync(keptDir, { recursive: true, mode: 0o700 });
const standIn = join(standInDir, 'auth.json');
writeFileSync(standIn, JSON.stringify({ tokens: { access_token: `P304-STAND-IN-${stamp}` } }), { mode: 0o600 });
const standInBefore = sha256(readFileSync(standIn, 'utf8'));
const writingLink = `${credPath(slotOf(OBSERVE.id))}.writing`;
const pendingLink = `${credPath(`${slotOf(OBSERVE.id)}.pending`)}.writing`;
symlinkSync(standIn, writingLink);
symlinkSync(standIn, pendingLink);

// THE SIZE ARM'S PAYLOADS: random hex, so no window is guessable.
const PAYLOADS = { a: randomBytes(2_097).toString('hex').slice(0, 4_193), b: randomBytes(524_288).toString('hex') };
for (const [name, text] of Object.entries(PAYLOADS)) writeFileSync(join(driveDir, `${name}.payload`), text, { mode: 0o600 });

const hasScratch = (service) => security(['find-generic-password', '-s', service, keychainFile]).code === 0;
const readScratch = (service) => {
  const r = security(['find-generic-password', '-s', service, '-w', keychainFile]);
  return r.code === 0 ? r.stdout.replace(/\n$/, '') : null;
};
const scratchTortieItems = () => {
  const { stdout } = security(['dump-keychain', keychainFile]);
  return [...stdout.matchAll(/"svce"<blob>="([^"\n]*)"/g)].map((m) => m[1]).filter((s) => s.startsWith('Tortie-credentials-')).sort();
};
const isRegular = (path) => {
  try {
    return lstatSync(path).isFile();
  } catch {
    return false;
  }
};
const isLink = (path) => {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
};
const modeOf = (path) => {
  try {
    return lstatSync(path).mode & 0o777;
  } catch {
    return null;
  }
};

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

const report = { at: new Date().toISOString(), tag, checkout, defaultKeychainBefore, filesBefore, safeStorageBefore, kills: [], moved: null, size: [], observe: null, links: null };

const launchEnv = {
  ...process.env,
  GMUX_PROBES: '1',
  GMUX_HARNESS_KEYCHAIN: keychainFile,
  GMUX_HARNESS_VAULT_DRIVE: driveDir,
  CLAUDE_CONFIG_DIR: defaultClaude,
  CODEX_HOME: defaultCodex,
  GMUX_TMUX_SOCKET: socket,
  HOME: scratchHome
};
const launchArgs = ['--remote-debugging-port=0', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--use-mock-keychain'];

/** One launch through the one helper that ends what it started. */
async function launch(label, body) {
  return withElectron(
    { label: `p304 ${label} (${tag})`, userDataDir: profile, cwd: checkout, args: launchArgs, env: launchEnv, ...(process.env['P304_ECHO'] === '1' ? { echo: true } : {}), graceMs: 15_000, ceilingMs: 240_000, tmuxSocket: socket },
    body
  );
}

/**
 * The boot line or the exit, whichever comes first, polled rather than raced
 * against `waitForLine` so no long timer is left pending after a launch the
 * probe killed on purpose has gone.
 */
async function untilBootOrExit(handle, maxMs) {
  let exitCode = null;
  void handle.exited.then((code) => {
    exitCode = code;
  });
  const started = Date.now();
  for (;;) {
    if (exitCode !== null) return { exited: exitCode };
    if (/\[gmux-logins\] logins\.boot /.test(handle.text())) return { booted: true };
    if (Date.now() - started > maxMs) return { booted: false };
    await sleep(250);
  }
}

try {
  if (security(['create-keychain', '-p', keychainPassword, keychainFile]).code !== 0) throw new Error('create-keychain failed');
  security(['unlock-keychain', '-p', keychainPassword, keychainFile]);
  security(['set-keychain-settings', keychainFile]);
  if (searchList().includes(keychainFile)) throw new Error('the scratch keychain is in the search list');
  say('scratch keychain made under the harness directory, not in the search list');

  // THE THREE SCOPED ITEMS, the shape a tree before Phase 304 kept.
  for (const l of LOGINS) {
    const { code } = security(['-i'], `add-generic-password -U -a "tortie" -s "${scopedName(slotOf(l.id))}" -X "${hex(PLANTED[l.id])}" "${keychainFile}"\n`);
    if (code !== 0) throw new Error(`the scratch keychain refused ${scopedName(slotOf(l.id))}`);
  }
  say(`planted 3 scoped items under this profile's digest ${profileDigest}`);

  // -------------------------------------------------------------------------
  // LAUNCHES 1 TO 3. A kill at each step of the read-through.
  // -------------------------------------------------------------------------
  for (const l of LOGINS) {
    const slot = slotOf(l.id);
    writeFileSync(join(driveDir, 'stop'), `${l.step}:${slot}\n`);
    const result = await launch(l.step, async (handle) => {
      say(`launched (${l.step} on ${l.name}), pid ${String(handle.pid)}`);
      // The boot line, or the exit, whichever comes first. A HEAD launch is
      // killed before the boot line; a parent launch has no seam and boots.
      const outcome = await untilBootOrExit(handle, 150_000);
      const text = handle.text();
      return { outcome, driveInstalled: /vault drive installed, stopping /.test(text), text };
    });
    const killed = 'exited' in result.outcome;
    const reading = {
      step: l.step,
      slot,
      killed,
      driveInstalled: result.driveInstalled,
      item: hasScratch(scopedName(slot)),
      file: existsSync(credPath(slot)),
      fileIsRegular: isRegular(credPath(slot))
    };
    report.kills.push(reading);
    const v = gradeKill(l.step, reading, atParent);
    if (v.ok) pass(`kill ${v.why}`); else fail(`kill ${v.why} ${JSON.stringify(reading)}`);
  }
  rmSync(join(driveDir, 'stop'), { force: true });

  // -------------------------------------------------------------------------
  // LAUNCH 4. Clean: the migration's end, the size arm, the observe arm and
  // the hostile links, in one session.
  // -------------------------------------------------------------------------
  const observeStore = join(loginsRoot, 'codex', OBSERVE.id, 'auth.json');
  const four = await launch('clean', async (handle) => {
    say(`launched (clean), pid ${String(handle.pid)}`);
    await handle.waitForLine(/harness keychain installed/, 60_000);
    const text = await handle.waitForLine(/\[gmux-logins\] logins\.boot /, 150_000);
    const bootLine = /\[gmux-logins\] logins\.boot (\{[^\n]*\})/.exec(text)?.[1] ?? '';
    let boot = null;
    try {
      boot = JSON.parse(bootLine);
    } catch {
      boot = { raw: bootLine.slice(0, 200) };
    }
    say(`boot observe: ${JSON.stringify(boot)}`);
    const cdp = await attachMain(profile, 120_000);
    for (let waited = 0; waited < 90_000; waited += 500) {
      if ((await cdpEval(cdp, "typeof window.__gmuxP202 === 'object'")) === true) break;
      await sleep(500);
    }
    const readRows = async () => {
      await cdpEval(cdp, `window.__gmuxP202.loadLogins()`);
      return JSON.parse(await cdpEval(cdp, `(async () => { const s = await window.__gmuxP202.read(); return JSON.stringify(s.logins.filter((l) => l.provider === 'codex')); })()`));
    };
    const rowsAtBoot = await readRows();
    say(`rows at boot: ${JSON.stringify(rowsAtBoot.map((r) => `${r.name}:kept=${String(r.kept)}:restores=${String(r.restores)}`))}`);
    // THE DRIVE LINES, waited for with a deadline, and the absence recorded
    // rather than waited out at the parent.
    let driveText = handle.text();
    if (!atParent) {
      try {
        driveText = await handle.waitForLine(/\[gmux\] vault-drive b put=/, 90_000);
      } catch {
        driveText = handle.text();
      }
    }
    // THE OBSERVE ARM: empty the store from outside, wait for the row to offer
    // the account back, choose the login, and read the store from outside.
    rmSync(observeStore, { force: true });
    let rowsAfterEmpty = rowsAtBoot;
    for (let waited = 0; waited < 30_000; waited += 1_000) {
      rowsAfterEmpty = await readRows();
      const row = rowsAfterEmpty.find((r) => r.name === OBSERVE.name);
      if (row !== undefined && row.restores === true) break;
      if (atParent && row !== undefined && row.present === false) break;
      await sleep(1_000);
    }
    const chooseOk = await cdpEval(cdp, `window.__gmuxP202.chooseLogin('codex', ${JSON.stringify(OBSERVE.name)})`);
    await sleep(1_500);
    const rowsAfterChoose = await readRows();
    return { boot, rowsAtBoot, rowsAfterEmpty, chooseOk, rowsAfterChoose, driveText };
  });

  // READING 1's END. The two kills that fell AFTER the rename each left a
  // complete sealed file, so on launch 4 those two slots HIT and their items
  // are duplicates the harness profile is refused the sweep of; the kill
  // before the write left no file, so that slot read through and its item
  // went. `-w` here is against the SCRATCH keychain file only (readScratch).
  const plantedRows = four.rowsAtBoot.filter((r) => LOGINS.some((l) => l.name === r.name));
  const itemsLeft = scratchTortieItems().filter((s) => LOGINS.some((l) => s === scopedName(slotOf(l.id))));
  const killedAfterRename = LOGINS.filter((l) => l.step === 'before-readback' || l.step === 'before-delete');
  const wantLeft = killedAfterRename.map((l) => scopedName(slotOf(l.id))).sort();
  const moved = {
    rowsKept: plantedRows.filter((r) => r.kept === true).length,
    filesPresent: LOGINS.filter((l) => isRegular(credPath(slotOf(l.id)))).length,
    itemsLeft: itemsLeft.length,
    duplicatesAreTheTwoKilledAfterRename: JSON.stringify([...itemsLeft].sort()) === JSON.stringify(wantLeft),
    duplicatesHoldTheirBytes: killedAfterRename.every((l) => readScratch(scopedName(slotOf(l.id))) === PLANTED[l.id]),
    migrationRefused: four.boot?.migration?.refused === true
  };
  report.moved = moved;
  const vMoved = gradeMoved(moved, atParent);
  if (vMoved.ok) pass(`moved: ${vMoved.why}`); else fail(`moved: ${vMoved.why} ${JSON.stringify(moved)}`);
  if (moved.migrationRefused) pass('the boot line says the migration was refused, as every harness profile is'); else fail('the boot line did not say the migration was refused');

  // READING 2. THE SIZE.
  for (const [name, text] of Object.entries(PAYLOADS)) {
    const line = parseDriveLine(four.driveText, name);
    const slot = `codex.${sha256(name).slice(0, 16)}`;
    const file = credPath(slot);
    const fileText = existsSync(file) ? readFileSync(file, 'utf8') : null;
    let v10 = false;
    if (fileText !== null) {
      try {
        v10 = Buffer.from(fileText, 'base64').subarray(0, 3).toString('latin1') === 'v10';
      } catch {
        v10 = false;
      }
    }
    const windows = [0, Math.floor(text.length / 2) - 32, text.length - 64].map((at) => text.slice(at, at + 64));
    const reading = {
      name,
      line: line === null ? null : 'present',
      put: line?.put ?? null,
      seal: line?.seal ?? null,
      bytes: line?.bytes ?? null,
      wantBytes: Buffer.byteLength(text, 'utf8'),
      sha256: line?.sha256 ?? null,
      wantSha256: sha256(text),
      filePresent: fileText !== null,
      fileMode: modeOf(file),
      fileIsPayload: fileText !== null && sha256(fileText) === sha256(text),
      fileHoldsWindow: fileText !== null && windows.some((w) => fileText.includes(w)),
      v10
    };
    report.size.push(reading);
    const v = gradeSize(reading, atParent);
    if (v.ok) pass(`size ${v.why}`); else fail(`size ${v.why}`);
  }

  // READING 3. THE OBSERVE.
  const rowBoot = four.rowsAtBoot.find((r) => r.name === OBSERVE.name);
  const rowEmpty = four.rowsAfterEmpty.find((r) => r.name === OBSERVE.name);
  const storeAfter = existsSync(observeStore) ? sha256(readFileSync(observeStore, 'utf8')) : null;
  const observe = {
    keptAtBoot: rowBoot?.kept ?? null,
    restoresAtBoot: rowBoot?.restores ?? null,
    restoresAfterEmpty: rowEmpty?.restores ?? null,
    chooseOk: four.chooseOk,
    storeAfterChoose: storeAfter,
    plantSha256: OBSERVE_SHA,
    itemForSlot: hasScratch(scopedName(slotOf(OBSERVE.id))),
    filePresent: isRegular(credPath(slotOf(OBSERVE.id)))
  };
  report.observe = observe;
  const vObs = gradeObserve(observe, atParent);
  if (vObs.ok) pass(`observe: ${vObs.why}`); else fail(`observe: ${vObs.why} ${JSON.stringify(observe)}`);

  // READING 4. THE LINKS.
  const links = {
    standInBefore,
    standInSha256: sha256(readFileSync(standIn, 'utf8')),
    writingLinkLeft: isLink(writingLink),
    pendingLinkLeft: isLink(pendingLink),
    fileIsRegular: isRegular(credPath(slotOf(OBSERVE.id)))
  };
  report.links = links;
  const vLinks = gradeLinks(links, atParent);
  if (vLinks.ok) pass(`links: ${vLinks.why}`); else fail(`links: ${vLinks.why} ${JSON.stringify(links)}`);
} finally {
  // THE SCRATCH KEYCHAIN GOES, whatever happened above, and the scratch HOME
  // is read one last time while it is still there: it must resolve no default
  // keychain at the end either, and the search list under it must be what it
  // was and never have held the scratch file.
  const deleted = security(['delete-keychain', keychainFile]);
  say(`scratch keychain deleted: rc ${String(deleted.code)}, file ${existsSync(keychainFile) ? 'still there' : 'gone'}`);
  if (searchList() === searchBefore && !searchBefore.includes(keychainFile)) pass('the keychain search list under the scratch HOME is what it was, and never held the scratch file');
  else fail('the keychain search list changed');
  const defaultKeychainAfter = defaultKeychain();
  report.defaultKeychainAfter = defaultKeychainAfter;
  const v = gradeDefaultKeychainAbsent(defaultKeychainAfter);
  if (v.ok) pass(`at the end, ${v.why}`); else fail(`at the end, ${v.why}`);
  rmSync(root, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// After. His files by lstat and the Safe Storage guard.
// ---------------------------------------------------------------------------

const filesAfter = hisFiles();
report.filesAfter = filesAfter;
const vFiles = gradeFileIdentity(filesBefore, filesAfter);
if (vFiles.ok) pass(`his credential files: ${vFiles.why}`); else fail(`his credential files: ${vFiles.why}`);
const safeStorageAfter = hisSafeStorageCount();
report.safeStorageAfter = safeStorageAfter;
const vSafe = gradeSafeStorage(safeStorageBefore, safeStorageAfter);
if (vSafe.ok) pass(vSafe.why); else fail(vSafe.why);

// Count what is left, once, at the end.
const left = spawnSync('/bin/sh', ['-c', 'ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct | wc -l'], { encoding: 'utf8' });
say(`electron shaped processes on the machine at the end: ${(left.stdout ?? '').trim()} (his running app and any other workflow included)`);

const reportPath = join(outDir, `p304-report-${tag}.json`);
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
say(`wrote ${reportPath}`);

if (failures > 0) {
  console.error(`${TAG} ${String(failures)} reading(s) disagreed`);
  process.exit(1);
}
say('every reading agreed');
process.exit(0);
