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
 *    `finally`, exactly as build/probe-p208-vault.mjs does.
 *  - A SCRATCH `HOME` IS THE DEFAULT (Phase 287), for every `security` call
 *    this file makes AND for the app it launches, so nothing here reads his
 *    keychain preferences, his search list or his default keychain. Before
 *    anything is created, `security default-keychain` under that `HOME` must
 *    answer "could not be found", which is the condition build/p287/SPEC.md §1
 *    measured the buffer under; it is read again at the end and graded the
 *    same. `list-keychains` runs under it too. The `dump-keychain` inventory of
 *    every keychain on the search list is NOT run, because it passes no
 *    keychain and so reads whichever ones his `HOME` names; one line says so.
 *    His two credential files are compared by `lstat` — size, modification
 *    time and inode — and no byte of either is read. The app's args carry
 *    `--use-mock-keychain`, so Chromium's own Safe Storage opens no real
 *    keychain either.
 *  - `P211_REAL_HOME=1` restores the Phase 211 behaviour byte for byte: his
 *    real `HOME`, the `dump-keychain` inventory of every keychain on his search
 *    list, and his credential files hashed rather than stat'd. It is there for
 *    Phase 211's own reruns. NO RUN OF PHASE 287 SETS IT, at the parent or at
 *    HEAD.
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
 * ## THE PHASE 287 ARM, RE-SPECIFIED BY PHASE 304: a sign in of any size is kept
 *
 * Steps 6 to 11 run inside the same launch, after reading 5. `security -i`
 * takes 4,096 bytes of line at most (build/p287/SPEC.md §1), and until Phase
 * 304 Tortie's OWN vault was a keychain item written through that line, so a
 * codex credential of the size his real one has (4,193 bytes) could never be
 * kept and the person's own sign in could be written over and lost. Since Phase
 * 304 Tortie's own vault is a sealed FILE under `<profile>/gmux/logins/kept/`
 * with no ceiling, and the only store that can still refuse for size is the
 * agent's own keychain entry, which no codex login has. So the arm drives, over
 * codex stores it writes:
 *
 *   6. a 4,193 byte codex credential (`BIG4`, the size `stat` read of his real
 *      `~/.codex/auth.json`) is written into the default store from outside.
 *      Both builds promote the account it replaces. AT HEAD the observe then
 *      keeps `BIG4` in `kept/codex.default.cred`, a real file whose bytes are
 *      not the credential; AT THE PARENT there is no such file, because the keep
 *      was refused;
 *   7. the default login is chosen and a codex session is opened on it, so a
 *      default session is live again;
 *   8. a kept login is chosen while that session runs. Both builds write the
 *      chosen account into the default store, so the running session follows.
 *      AT HEAD the account `BIG4` held is first promoted into a row of its own,
 *      `four.example`, kept and restorable, and choosing THAT row puts `BIG4`
 *      back into its own store byte for byte; AT THE PARENT no such row exists
 *      and `BIG4` exists nowhere, which is the loss. That reading is what the
 *      arm exists for, so nothing above it may throw;
 *   9. `BIG5`, a different over-cap credential, is written into a kept login's
 *      own store. AT HEAD it is kept and choosing that login is an ordinary
 *      switch with nothing refused and nothing said; AT THE PARENT the click is
 *      refused for ever;
 *  10. `BIG6`, an over-cap credential for the SAME account a login's store
 *      already held. AT HEAD the store is in place and choosing it is answered;
 *      AT THE PARENT the click is refused for ever. The row promises nothing on
 *      either build: at the parent it is still the chosen row, because step 9's
 *      click was refused, and a chosen row promises nothing; the promise the
 *      parent cannot keep is on step 9's unchosen row, where finding 6 read it;
 *  11. the scratch keychain holds no item whose payload is any of the three on
 *      either build, AT HEAD it holds no `Tortie-credentials-*` item at all,
 *      and every sealed file under `kept/` is a regular 0600 file holding no
 *      window of any credential.
 *
 * EVERY `problem` READING IS GRADED AND NEVER WAITED ON. At the parent the
 * drive does not carry the field, so a wait for it could never succeed there
 * and would stop the arm before the store digests, which are the loss. Each
 * step waits instead on something BOTH builds answer, being a promotion the
 * watcher makes or a change on disk, and a missing field is recorded as
 * "unreadable, the drive predates the field". The too-large sentences a person
 * can read are pinned here by their bytes and must appear on NEITHER build in
 * this arm: no codex store is a keychain entry, so nothing here can meet the
 * one refusal that survives.
 *
 * ## The parent
 *
 * `P211_PARENT_CHECKOUT=<a BUILT worktree at the parent commit>` points THIS
 * run at that checkout's `out/` (its cwd and its build), one Electron at a
 * time, never beside a HEAD run: the two are two invocations. The fixtures,
 * the drive's caller, the graders and every reading stay this file's, which is
 * what makes the two columns one measurement. Run the parent FIRST, so a
 * reading already red there for another reason is recorded as the parent's.
 *
 * ## Usage
 *
 *   npm run probe:p211
 *   P211_PARENT_CHECKOUT=/path/to/parent node build/harness-socket.mjs \
 *     --fresh gmux-p211 'node build/probe-p211-switch.mjs'
 *   node build/probe-p211-switch.mjs --self-test   the graders alone, no launch
 *
 * ## Environment
 *
 *   GMUX_TMUX_SOCKET       The scratch socket. build/harness-socket.mjs sets it.
 *   GMUX_HARNESS_DIR       The scratch directory, from the same wrapper.
 *   P211_PARENT_CHECKOUT   A BUILT worktree at the parent commit. Optional.
 *   P211_REAL_HOME         `1` restores Phase 211's real-`HOME` behaviour.
 *   P211_ECHO              `1` prints the app's own lines.
 *   P211_OUT_DIR           Where the report goes. Default `out/p211`.
 *
 * Exit 0 when every reading agrees, 1 when one does not, 2 when it refuses.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
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

// ---------------------------------------------------------------------------
// PHASE 287. The graders for the arm that drives a credential too large for one
// `security` line. Every one of them is graded rather than waited on, because
// two of the values they read exist only in this build's drive.
// ---------------------------------------------------------------------------

/**
 * What a reading answers when the build under the app does not carry the field
 * at all, which is every `problem` reading at the parent:
 * `src/renderer/app/p202-logins-drive.ts` before Phase 287 does not map it, so
 * the value arrives as `undefined` and the arm records that rather than
 * failing.
 */
export const UNREADABLE = 'unreadable, the drive predates the field';

/**
 * The two too-large sentences, by their exact bytes, from
 * `src/shared/login-copy.ts` as Phase 304 rewrote them (build/p287/SPEC.md
 * §12 and build/p304/SPEC.md §4.1 carry the same table). A probe cannot import
 * `@shared/login-copy`, which is TypeScript, so they are written here and their
 * byte lengths are asserted below: a build whose sentence has drifted fails on
 * the length rather than quietly matching nothing in a toast.
 * `src/renderer/state/__tests__/p287-too-large-say.test.ts` pins the same bytes
 * by sha256. Phase 287's row label is gone: since Phase 304 no row carries a
 * size, because the only store that can refuse for size is the agent's own
 * keychain entry and that is met on a click, never on an observe.
 */
export const TOO_LARGE_SENTENCE =
  'This sign in is too large for Tortie to write into the keychain entry the agent reads, so nothing was put back.';
export const TOO_LARGE_RUNNING =
  'Switched for new sessions. This sign in is too large for Tortie to write into the keychain entry the running session reads, so that session keeps its current sign in.';
for (const [name, text, want] of [
  ['LOGIN_TOO_LARGE_SENTENCE', TOO_LARGE_SENTENCE, 111],
  ['LOGIN_TOO_LARGE_RUNNING', TOO_LARGE_RUNNING, 166]
]) {
  const got = Buffer.byteLength(text, 'utf8');
  if (got !== want) {
    throw new Error(`${name} in this probe is ${String(got)} bytes rather than the words file's ${String(want)}`);
  }
}

/**
 * The scratch `HOME` has no default keychain, which is §1's measured condition
 * and the reason no write here can be aimed at one. Read before anything is
 * created and again at the end.
 */
export function gradeDefaultKeychainAbsent(run) {
  if (run.code === 0) {
    return { ok: false, why: 'a default keychain RESOLVED under the scratch HOME' };
  }
  return /could not be found/i.test(run.stdout)
    ? { ok: true, why: 'no default keychain resolves under the scratch HOME' }
    : { ok: false, why: `default-keychain answered something else: ${run.stdout.trim()}` };
}

/**
 * His two credential files, by what the filesystem says they ARE rather than by
 * what they hold: size, modification time and inode. The Phase 211 mode hashes
 * them; this one never opens them.
 */
export function gradeFileIdentity(before, after) {
  const why = [];
  for (const name of Object.keys(before)) {
    const b = JSON.stringify(before[name]);
    const a = JSON.stringify(after[name]);
    if (b !== a) why.push(`${name}: ${b} became ${a}`);
  }
  for (const name of Object.keys(after)) {
    if (!(name in before)) why.push(`${name}: appeared`);
  }
  return why.length === 0
    ? { ok: true, why: `${String(Object.keys(before).length)} file(s) identical by size, mtime and inode` }
    : { ok: false, why: why.join('; ') };
}

/**
 * PHASE 304. One of Tortie's own sealed files, as the filesystem and a digest
 * describe it and never as bytes: present as a regular file with mode 0600,
 * its sha256 none of the credentials it could be holding, no window of the
 * `P287-` sentinel every over-cap credential here carries, and its base64
 * opening on Chromium's own `v10` seal prefix, which is what the real
 * `safeStorage` writes and a plaintext file never does. `want` is `'present'`
 * at HEAD and `'absent'` at the parent, whose vault was the keychain.
 */
export function gradeSealedFile(reading, want, forbiddenDigests) {
  if (want === 'absent') {
    return reading === null
      ? { ok: true, why: 'no sealed file, as a build whose vault was the keychain leaves none' }
      : { ok: false, why: 'a sealed file exists where this build was not supposed to write one' };
  }
  if (reading === null) return { ok: false, why: 'no sealed file at all' };
  const why = [];
  if (reading.regular !== true) why.push('not a regular file');
  if (reading.mode !== 0o600) why.push(`mode ${reading.mode.toString(8)} rather than 600`);
  if (reading.bytes === 0) why.push('empty');
  for (const [name, digest] of Object.entries(forbiddenDigests)) {
    if (reading.sha256 === digest) why.push(`its bytes ARE ${name}, so nothing was sealed`);
  }
  if (reading.sentinel === true) why.push('holds a window of a credential in the clear');
  if (reading.v10 !== true) why.push('does not open on the v10 seal prefix, so the real safeStorage did not write it');
  return why.length === 0
    ? { ok: true, why: `a regular 0600 file of ${String(reading.bytes)} bytes, sealed (v10), none of them a credential` }
    : { ok: false, why: why.join('; ') };
}

/**
 * PHASE 304. No `Tortie-credentials-*` item at all in the scratch keychain,
 * which is the stronger reading a sealed-file vault earns: the app never
 * writes one. `want` is `'none'` at HEAD; at the parent the small keeps land
 * there and the reading is recorded rather than graded.
 */
export function gradeNoTortieItems(items) {
  const tortie = items.filter((i) => i.svce.startsWith('Tortie-credentials'));
  return tortie.length === 0
    ? { ok: true, why: `${String(items.length)} item(s), none of them Tortie's own` }
    : { ok: false, why: `${String(tortie.length)} Tortie-credentials item(s): ${tortie.map((i) => i.svce).join(', ')}` };
}

/** The store's `problem`, being the one sentence the Add login dialog draws. */
export function gradeProblem(value, want) {
  if (want === UNREADABLE) {
    return value === undefined
      ? { ok: true, why: UNREADABLE }
      : { ok: false, why: `read problem ${JSON.stringify(value)}, and this build was not supposed to carry the field` };
  }
  if (value === undefined) return { ok: false, why: UNREADABLE };
  return value === want
    ? { ok: true, why: want === null ? 'problem null, so nothing waits under the Add login name field' : `problem: ${want}` }
    : { ok: false, why: `problem ${JSON.stringify(value)} rather than ${JSON.stringify(want)}` };
}

/**
 * A store still holds the bytes it held, by sha256. The digest is the whole
 * reading: no byte of any credential, synthetic or not, is ever printed.
 */
export function gradeStoreDigest(got, want, what) {
  if (got === null) return { ok: false, why: `${what} is gone` };
  return got === want
    ? { ok: true, why: `${what} holds the credential it held (${want.slice(0, 12)})` }
    : { ok: false, why: `${what} holds ${got.slice(0, 12)} rather than ${want.slice(0, 12)}` };
}

/** Exactly one toast says it. Two that say it is as wrong as none. */
export function gradeToastOnce(toasts, text) {
  const hits = toasts.filter((t) => t.includes(text)).length;
  return hits === 1
    ? { ok: true, why: `one toast says it: ${text}` }
    : { ok: false, why: `${String(hits)} toasts say it` };
}

/** Nothing on screen says this, which is how a forbidden sentence is graded. */
export function gradeToastAbsent(toasts, prefix) {
  const hit = toasts.find((t) => t.startsWith(prefix));
  return hit === undefined
    ? { ok: true, why: `nothing says "${prefix}"` }
    : { ok: false, why: `a toast says "${hit}"` };
}

/** A row's own booleans, compared on the keys the reading names and no others. */
export function gradeRowBooleans(row, want) {
  if (row === undefined || row === null) return { ok: false, why: 'no row at all' };
  const why = [];
  for (const [key, value] of Object.entries(want)) {
    if (row[key] !== value) why.push(`${key} ${String(row[key])} rather than ${String(value)}`);
  }
  return why.length === 0
    ? { ok: true, why: Object.keys(want).map((k) => `${k} ${String(want[k])}`).join(', ') }
    : { ok: false, why: why.join(', ') };
}

/**
 * The scratch keychain holds no item whose payload is one of the over-cap
 * credentials. It is the other half of the refusal: nothing over the cap
 * reached `security -i` on any path, so nothing over the cap is in there.
 */
export function gradeNoBigInKeychain(items, forbidden) {
  const why = [];
  for (const item of items) {
    for (const [name, digest] of Object.entries(forbidden)) {
      if (item.digest === digest) why.push(`${item.svce} holds ${name}`);
    }
  }
  return why.length === 0
    ? { ok: true, why: `${String(items.length)} item(s), none of them an over-cap credential` }
    : { ok: false, why: why.join('; ') };
}

if (process.argv.includes('--self-test')) {
  const keptRow = { name: 'one.example', present: false, kept: true, restores: true };
  const inv = (mdat, cdat = 'c', acct = 'x') => ({ acct, cdat, mdat });
  const sess = (id, login) => ({ id, login });
  const st = (size, mtimeMs, ino) => ({ size, mtimeMs, ino });
  const env = (id, home) => ({ file: `${id}.codex.1.env`, text: `agent=codex\nCODEX_HOME=${home}\n` });
  const sealed = (over = {}) => ({ regular: true, mode: 0o600, bytes: 5_600, sha256: 'sealed', sentinel: false, v10: true, ...over });
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
    ['a creation date that moved', () => gradeInventory({ x: inv('m', 'c1') }, { x: inv('m', 'c2') }).ok, false],

    // PHASE 287. The Phase 287 arm's own readings.
    ['no default keychain under the scratch HOME', () => gradeDefaultKeychainAbsent({ code: 1, stdout: 'security: SecKeychainCopyDefault: A default keychain could not be found.' }).ok, true],
    ['a default keychain that resolves', () => gradeDefaultKeychainAbsent({ code: 0, stdout: '    "/Users/somebody/Library/Keychains/login.keychain-db"' }).ok, false],
    ['a non-zero exit saying something else', () => gradeDefaultKeychainAbsent({ code: 1, stdout: 'security: SecKeychainCopyDefault: User interaction is not allowed.' }).ok, false],
    ['two credential files by lstat, unmoved', () => gradeFileIdentity({ a: st(10, 5, 7), b: 'absent' }, { a: st(10, 5, 7), b: 'absent' }).ok, true],
    ['a credential file whose size moved', () => gradeFileIdentity({ a: st(10, 5, 7) }, { a: st(11, 5, 7) }).ok, false],
    ['a credential file whose inode moved', () => gradeFileIdentity({ a: st(10, 5, 7) }, { a: st(10, 5, 8) }).ok, false],
    ['a credential file that appeared', () => gradeFileIdentity({ b: 'absent' }, { b: st(1, 1, 1) }).ok, false],
    // PHASE 304. The sealed file and the keychain that holds none of Tortie's own.
    ['a sealed file: regular, 0600, v10, none of the credentials', () => gradeSealedFile(sealed(), 'present', { BIG4: 'b4' }).ok, true],
    ['no sealed file at the parent', () => gradeSealedFile(null, 'absent', { BIG4: 'b4' }).ok, true],
    ['no sealed file where one was wanted', () => gradeSealedFile(null, 'present', { BIG4: 'b4' }).ok, false],
    ['a sealed file where the parent was supposed to write none', () => gradeSealedFile(sealed(), 'absent', { BIG4: 'b4' }).ok, false],
    ['a sealed file whose bytes are the credential', () => gradeSealedFile(sealed({ sha256: 'b4' }), 'present', { BIG4: 'b4' }).ok, false],
    ['a sealed file holding a window in the clear', () => gradeSealedFile(sealed({ sentinel: true }), 'present', { BIG4: 'b4' }).ok, false],
    ['a sealed file with the wrong mode', () => gradeSealedFile(sealed({ mode: 0o644 }), 'present', { BIG4: 'b4' }).ok, false],
    ['a sealed file that is a link', () => gradeSealedFile(sealed({ regular: false }), 'present', { BIG4: 'b4' }).ok, false],
    ['a sealed file without the v10 prefix', () => gradeSealedFile(sealed({ v10: false }), 'present', { BIG4: 'b4' }).ok, false],
    ['a keychain with none of Tortie’s items', () => gradeNoTortieItems([{ svce: 'Claude Code-credentials', acct: 'x', digest: 'd' }]).ok, true],
    ['an empty keychain', () => gradeNoTortieItems([]).ok, true],
    ['a keychain with one of Tortie’s items', () => gradeNoTortieItems([{ svce: 'Tortie-credentials-codex.default-abcd1234', acct: 'tortie', digest: 'd' }]).ok, false],
    ['problem carrying the sentence', () => gradeProblem(TOO_LARGE_SENTENCE, TOO_LARGE_SENTENCE).ok, true],
    ['problem null after a switch that stood', () => gradeProblem(null, null).ok, true],
    ['problem unreadable at the parent', () => gradeProblem(undefined, UNREADABLE).ok, true],
    ['problem null where the sentence was wanted', () => gradeProblem(null, TOO_LARGE_SENTENCE).ok, false],
    ['problem left set after a switch that stood', () => gradeProblem(TOO_LARGE_SENTENCE, null).ok, false],
    ['a store still holding the credential it held', () => gradeStoreDigest('d1', 'd1', 'the default codex store').ok, true],
    ['a store written over', () => gradeStoreDigest('d2', 'd1', 'the default codex store').ok, false],
    ['a store that is gone', () => gradeStoreDigest(null, 'd1', 'the default codex store').ok, false],
    ['one toast saying it', () => gradeToastOnce(['x', TOO_LARGE_RUNNING], TOO_LARGE_RUNNING).ok, true],
    ['no toast saying it', () => gradeToastOnce(['x'], TOO_LARGE_RUNNING).ok, false],
    ['two toasts saying it', () => gradeToastOnce([TOO_LARGE_RUNNING, TOO_LARGE_RUNNING], TOO_LARGE_RUNNING).ok, false],
    ['no switched line beside it', () => gradeToastAbsent([TOO_LARGE_RUNNING], 'two.example is switched.').ok, true],
    ['a switched line that disagrees with it', () => gradeToastAbsent([TOO_LARGE_RUNNING, 'two.example is switched. Takes effect within about half a minute, or restart the session now.'], 'two.example is switched.').ok, false],
    ['a row with the booleans wanted', () => gradeRowBooleans({ kept: true, isDefault: false, chosen: true }, { kept: true, isDefault: false, chosen: true }).ok, true],
    ['a row with one boolean out', () => gradeRowBooleans({ kept: false, isDefault: false, chosen: true }, { kept: true, isDefault: false, chosen: true }).ok, false],
    ['no row where one was wanted', () => gradeRowBooleans(undefined, { kept: true }).ok, false],
    ['a scratch keychain holding none of the three', () => gradeNoBigInKeychain([{ svce: 'Tortie-credentials-x', acct: 'tortie', digest: 'small' }], { BIG4: 'b4', BIG5: 'b5', BIG6: 'b6' }).ok, true],
    ['an empty scratch keychain', () => gradeNoBigInKeychain([], { BIG4: 'b4' }).ok, true],
    ['a scratch keychain holding one of them', () => gradeNoBigInKeychain([{ svce: 'Tortie-credentials-x', acct: 'tortie', digest: 'b5' }], { BIG4: 'b4', BIG5: 'b5' }).ok, false]
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

/** The scratch tree, once it has a name, so a refusal can take it with it. */
let scratchRoot = '';
const refuse = (why) => {
  if (scratchRoot !== '') rmSync(scratchRoot, { recursive: true, force: true });
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};

if (process.platform !== 'darwin') refuse('this probe drives the macOS keychain and runs on macOS only');
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') refuse('no GMUX_TMUX_SOCKET. Run me through the harness: node build/harness-socket.mjs --fresh gmux-p211 "node build/probe-p211-switch.mjs"');
if (socket === 'gmux' || socket === 'default') refuse(`refusing to run on "${socket}", which is not a harness socket`);
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere the app would accept a scratch keychain from');

// PHASE 287. The checkout whose BUILD is measured: this one, or the parent's.
// Only the app's cwd and its out/ move; every fixture, grader and reading below
// stays this file's, which is what makes the two runs one measurement.
const parentCheckout = (process.env['P211_PARENT_CHECKOUT'] ?? '').trim();
const checkout = parentCheckout !== '' ? resolve(parentCheckout) : repoRoot;
const tag = parentCheckout !== '' ? 'parent' : 'head';
const atParent = parentCheckout !== '';
if (!existsSync(join(checkout, 'out', 'main', 'index.js'))) {
  refuse(
    `${join(checkout, 'out', 'main', 'index.js')} is missing. ` +
      (atParent
        ? 'P211_PARENT_CHECKOUT must name a BUILT worktree: run npm run build in that checkout first.'
        : 'Run npm run build first.')
  );
}

/**
 * PHASE 287. A scratch `HOME` is the default, and the Phase 211 behaviour has
 * to be asked for. The safe path being the default is the point: there is
 * nothing here anybody has to remember to switch off.
 */
const realHome = process.env['P211_REAL_HOME'] === '1';

const outDir = resolve(repoRoot, (process.env['P211_OUT_DIR'] ?? '').trim() || 'out/p211');
mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------------------
// The scratch world, all under the harness directory. It is made BEFORE the
// first `security` call, because the scratch `HOME` is one of its directories.
// ---------------------------------------------------------------------------

const rawRoot = join(harnessDir, `gmux-p211-${String(process.pid)}`);
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(rawRoot, { recursive: true });
const root = realpathSync(rawRoot);
scratchRoot = root;
const profile = join(root, 'profile');
const defaultCodex = join(root, 'default-codex');
const defaultClaude = join(root, 'default-claude');
const project = join(root, 'project');
const stubBin = join(root, 'bin');
const envDir = join(root, 'pane-env');
/** The `HOME` every `security` call and the app itself get (Phase 287). */
const scratchHome = join(root, 'home');
for (const dir of [profile, defaultCodex, defaultClaude, project, stubBin, envDir, scratchHome]) mkdirSync(dir, { recursive: true, mode: 0o700 });

const SECURITY = '/usr/bin/security';
const keychainFile = join(root, 'scratch.keychain-db');
const keychainPassword = randomBytes(12).toString('hex');
/** Every command that can reach an ITEM rather than a setting (Phase 287). */
const ITEM_COMMANDS = new Set([
  'dump-keychain',
  'find-generic-password',
  'add-generic-password',
  'delete-generic-password'
]);
function security(args, input) {
  if (args.includes('-g')) throw new Error('this probe never passes -g');
  if (args.includes('-w') && args[args.length - 1] !== keychainFile) {
    throw new Error('this probe passes -w only against the scratch keychain');
  }
  // PHASE 287. Under the scratch `HOME` a command that reaches an item must
  // NAME the scratch file. `dump-keychain` with no argument is the call that
  // made the Phase 211 inventory read whichever keychains his own HOME names,
  // so the rule is structural here rather than a promise in a comment.
  if (!realHome && ITEM_COMMANDS.has(args[0]) && args[args.length - 1] !== keychainFile) {
    throw new Error(`${args[0]} must name the scratch keychain under a scratch HOME`);
  }
  const run = spawnSync(SECURITY, args, {
    encoding: 'utf8',
    input,
    timeout: 15_000,
    env: { ...process.env, HOME: realHome ? (process.env['HOME'] ?? '') : scratchHome }
  });
  // `stdout` is kept exactly as the program printed it, because one caller
  // hashes a payload read back from the scratch keychain. The message
  // `default-keychain` writes goes to stderr, so it is carried beside it.
  return { code: run.status ?? 1, stdout: run.stdout ?? '', err: run.stderr ?? '' };
}

/** `security default-keychain` under whichever `HOME` this run uses. */
const defaultKeychain = () => {
  const run = security(['default-keychain']);
  return { code: run.code, stdout: `${run.stdout}${run.err}` };
};

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

/** HIS home, which is only ever asked ABOUT and never used as a `HOME`. */
const home = process.env['HOME'] ?? '';

/**
 * PHASE 287. What the filesystem says a file IS, rather than what it holds.
 * `size`, `mtimeMs` and `ino` between them move on any write, and reading them
 * opens nothing, which is why his two credential files are compared this way
 * unless `P211_REAL_HOME` asks for the Phase 211 hashes.
 */
const statOf = (path) => {
  try {
    const st = lstatSync(path);
    return { size: st.size, mtimeMs: st.mtimeMs, ino: st.ino };
  } catch {
    return 'absent';
  }
};

/**
 * His credential files, before and after. `~/.claude.json` is NOT a credential:
 * it is the vendor's session state, rewritten by every running Claude Code
 * under his account, so it is read for the record and not graded.
 */
const hisFiles = () => {
  const paths = {
    '~/.codex/auth.json': join(home, '.codex', 'auth.json'),
    '~/.claude/.credentials.json': join(home, '.claude', '.credentials.json')
  };
  const out = {};
  for (const [name, path] of Object.entries(paths)) out[name] = realHome ? hashFile(path) : statOf(path);
  return out;
};
const claudeJsonReading = () => {
  const path = join(home, '.claude.json');
  return realHome ? hashFile(path) : statOf(path);
};

const searchList = () => security(['list-keychains']).stdout;

// PHASE 287. NOTHING IS CREATED UNTIL THE SCRATCH `HOME` HAS NO DEFAULT
// KEYCHAIN. That is the condition build/p287/SPEC.md §1 measured the `security`
// buffer under, and it is also what makes a cut line harmless here: a line that
// loses its trailing keychain path under a `HOME` with a default keychain would
// aim at that one instead.
const defaultKeychainBefore = defaultKeychain();
if (!realHome) {
  const v = gradeDefaultKeychainAbsent(defaultKeychainBefore);
  if (!v.ok) refuse(`the scratch HOME ${scratchHome} answers a default keychain: ${v.why}`);
  say(`before anything is created, default-keychain under the scratch HOME: ${defaultKeychainBefore.stdout.trim()}`);
} else {
  say('P211_REAL_HOME=1: his own HOME, his search list and his keychain attributes, as Phase 211 ran it');
}

const filesBefore = hisFiles();
const claudeJsonBefore = claudeJsonReading();
const searchBefore = searchList();
// PHASE 287. The `dump-keychain` inventory of every keychain on the search list
// passes NO keychain, so it reads whichever ones the `HOME` in force names. It
// is not run under the scratch HOME, and this line says so rather than leaving
// a reading that quietly became about nothing.
const inventoryBefore = realHome ? inventory() : null;
say(
  inventoryBefore === null
    ? 'the dump-keychain inventory of the search list is NOT run: it names no keychain, so it would read his. His two credential files are compared by lstat instead, and no byte of either is read'
    : `his keychain before: ${String(Object.keys(inventoryBefore).length)} items in the two families`
);
for (const [name, reading] of Object.entries(filesBefore)) say(`credential before: ${name} ${JSON.stringify(reading)}`);

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

const stamp = Date.now().toString(36);
const b64url = (text) =>
  Buffer.from(text, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const codexClaim = (who) => `h.${b64url(JSON.stringify({ sub: `u-${who}-${stamp}`, email: `${who}@example.com` }))}.s`;
function codexAuth(who) {
  return JSON.stringify({ OPENAI_API_KEY: null, tokens: { access_token: `P211-${who}-${stamp}`, account_id: `acct-${who}`, id_token: codexClaim(who) } });
}

/**
 * PHASE 287. A codex credential of EXACTLY `bytes` bytes for one account.
 *
 * 4,193 is what `stat` read of his own `~/.codex/auth.json` (build/p287/SPEC.md
 * §0, finding 4), so this is the real size rather than an invented one. The
 * vault stage line for a payload of P bytes is the overhead plus 2P, the hex
 * doubling it, so 4,193 bytes is a line of about 8,500 against a 4,000 byte cap
 * and it cannot reach `security -i` on any path.
 *
 * The claims are the SAME shape {@link codexAuth} writes, so `who` decides the
 * subject and the address and nothing else: `bigCodexAuth('two')` is a
 * different credential for the account `codexAuth('two')` names, which is what
 * `sameAccountProven` has to see for step 10. `OPENAI_API_KEY` is absent, not
 * null, because a store naming it is API key billing rather than a sign in. The
 * padding is one ASCII field, so the byte count and the character count agree
 * and the size asked for is the size written.
 */
function bigCodexAuth(who, bytes) {
  const base = {
    tokens: { access_token: `P287-${who}-${stamp}`, account_id: `acct-${who}`, id_token: codexClaim(who) },
    p287_pad: ''
  };
  const need = bytes - Buffer.byteLength(JSON.stringify(base), 'utf8');
  if (need < 9) throw new Error(`${String(bytes)} bytes is too small for a p287 credential`);
  base.p287_pad = `P287-pad-${'x'.repeat(need - 9)}`;
  const text = JSON.stringify(base);
  const got = Buffer.byteLength(text, 'utf8');
  if (got !== bytes) throw new Error(`composed ${String(got)} bytes rather than ${String(bytes)}`);
  return text;
}

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
/** A store's bytes by digest, or null when the file is gone. Nothing is printed. */
const storeDigest = (path) => {
  try {
    return sha256(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
};

const codexStore = join(defaultCodex, 'auth.json');
function signInCodex(who) {
  writeFileSync(codexStore, codexAuth(who), { mode: 0o600 });
}

/**
 * PHASE 287. The three over-cap credentials, at 4,193 bytes each. BIG6 is for
 * the SAME account BIG4 and the small `two` are not: it is the account
 * two.example's own store already holds, which is what makes step 10 L6 rather
 * than L2.
 */
const BIG4 = bigCodexAuth('four', 4_193);
const BIG5 = bigCodexAuth('five', 4_193);
const BIG6 = bigCodexAuth('two', 4_193);
const BIG_DIGESTS = { BIG4: sha256(BIG4), BIG5: sha256(BIG5), BIG6: sha256(BIG6) };

/**
 * PHASE 287. One added login's own directory under this profile, by NAME, read
 * out of the logins file the app wrote. The file holds ids and names and no
 * path, so the directory is derived here the way the product derives it.
 */
const loginsRootIn = () => join(profile, 'gmux', 'logins');
function loginIdOf(name) {
  try {
    const file = JSON.parse(readFileSync(join(loginsRootIn(), 'logins.json'), 'utf8'));
    const row = (file.logins ?? []).find((l) => l.provider === 'codex' && l.name === name);
    return row === undefined ? null : row.id;
  } catch {
    return null;
  }
}
function loginDirOf(name) {
  const id = loginIdOf(name);
  return id === null ? null : join(loginsRootIn(), 'codex', id);
}

/**
 * PHASE 304. Tortie's own sealed file for one codex slot, `kept/codex.<id>.cred`
 * under this profile (`default` for the person's own store), as the filesystem
 * and a digest describe it. The bytes are read to be hashed and searched for
 * the `P287-` sentinel and never printed; `v10` is whether the base64 opens on
 * Chromium's own seal prefix, which the real `safeStorage` writes.
 */
const keptDir = () => join(loginsRootIn(), 'kept');
const sealedPathOf = (id) => join(keptDir(), `codex.${id ?? 'default'}.cred`);
function sealedReading(path) {
  let st;
  try {
    st = lstatSync(path);
  } catch {
    return null;
  }
  const regular = st.isFile();
  let text = '';
  try {
    text = regular ? readFileSync(path, 'utf8') : '';
  } catch {
    text = '';
  }
  let v10 = false;
  try {
    v10 = Buffer.from(text.trim(), 'base64').subarray(0, 3).toString('latin1') === 'v10';
  } catch {
    v10 = false;
  }
  return {
    regular,
    mode: st.mode & 0o777,
    bytes: st.size,
    sha256: sha256(text),
    sentinel: text.includes('P287-'),
    v10
  };
}
/** Every sealed file under `kept/`, by name, or an empty list when the directory is not there. */
function sealedFiles() {
  try {
    return readdirSync(keptDir()).filter((f) => f.endsWith('.cred')).sort();
  } catch {
    return [];
  }
}

/**
 * PHASE 287. What `find-generic-password -w` printed, as the bytes the item
 * holds. It is `decodeKeychainPayload`'s rule: `security` prints a payload
 * verbatim unless it holds a byte outside 0x20–0x7E, in which case it prints
 * hex, and it adds exactly one newline either way. Every credential in this
 * probe is printable ASCII JSON, so the hex arm is here for completeness.
 */
function decodePrinted(raw) {
  const text = raw.endsWith('\n') ? raw.slice(0, -1) : raw;
  if (text.length === 0 || text.length % 2 !== 0 || !/^[0-9a-f]+$/.test(text)) return text;
  const decoded = Buffer.from(text, 'hex').toString('utf8');
  return /[^\x20-\x7e]/.test(decoded) ? decoded : text;
}

/**
 * PHASE 287. Every item in the SCRATCH keychain, by attributes and then by the
 * digest of its payload. `-w` is passed against the scratch file alone, which
 * the helper's own guard enforces, and no byte of any payload is printed.
 */
function scratchKeychainItems() {
  const { stdout } = security(['dump-keychain', keychainFile]);
  const items = [];
  for (const block of stdout.split(/\nkeychain: /)) {
    const svce = /"svce"<blob>="([^"\n]*)"/.exec(block)?.[1] ?? '';
    if (svce === '') continue;
    const acct = /"acct"<blob>="([^"\n]*)"/.exec(block)?.[1] ?? '';
    const read = security([
      'find-generic-password',
      '-s',
      svce,
      ...(acct === '' ? [] : ['-a', acct]),
      '-w',
      keychainFile
    ]);
    items.push({ svce, acct, digest: read.code === 0 ? sha256(decodePrinted(read.stdout)) : null });
  }
  return items;
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

const report = {
  at: new Date().toISOString(),
  tag,
  realHome,
  checkout,
  inventoryBefore,
  filesBefore,
  defaultKeychainBefore,
  rows: {},
  reached: null,
  /** PHASE 287. Every reading of the too-large arm, filled in by steps 6 to 11. */
  p287: { steps: {} }
};

/**
 * What is read once the app has gone: his own files, the search list and, under
 * the scratch `HOME`, that it still resolves no default keychain. Under
 * `P211_REAL_HOME` it also compares his keychain by attributes, which is the
 * Phase 211 reading.
 */
function afterReadings() {
  const inventoryAfter = realHome ? inventory() : null;
  const filesAfter = hisFiles();
  report.inventoryAfter = inventoryAfter;
  report.filesAfter = filesAfter;
  if (inventoryBefore !== null && inventoryAfter !== null) {
    const v = gradeInventory(inventoryBefore, inventoryAfter);
    if (v.ok) pass(`his keychain by attributes: ${v.why}`);
    else fail(`his keychain by attributes: ${v.why}`);
  }
  // PHASE 287. His two credential files, by what they ARE. Under the scratch
  // HOME this is the whole reading: nothing here opened either file, and nothing
  // here could have named a keychain of his, so there is no inventory to compare.
  const vFiles = gradeFileIdentity(filesBefore, filesAfter);
  if (vFiles.ok) pass(`his credential files: ${vFiles.why}`);
  else fail(`his credential files: ${vFiles.why}`);
  const claudeJsonAfter = claudeJsonReading();
  report.claudeJson = { before: claudeJsonBefore, after: claudeJsonAfter };
  const moved = JSON.stringify(claudeJsonBefore) !== JSON.stringify(claudeJsonAfter);
  say(
    `~/.claude.json ${moved ? 'moved' : 'unchanged'} (${JSON.stringify(claudeJsonBefore)} to ${JSON.stringify(claudeJsonAfter)}); it is the vendor's session state, rewritten by any running Claude Code, and not a credential, so it is recorded and not graded`
  );
  if (searchList() === searchBefore && !searchBefore.includes(keychainFile)) {
    pass(`the keychain search list ${realHome ? '' : 'under the scratch HOME '}is what it was, and never held the scratch file`);
  } else fail('the keychain search list changed');
  // PHASE 287. And the scratch HOME still resolves no default keychain, which is
  // what makes this run the one §1 measured the buffer under.
  const defaultKeychainAfter = defaultKeychain();
  report.defaultKeychainAfter = defaultKeychainAfter;
  if (!realHome) {
    const v = gradeDefaultKeychainAbsent(defaultKeychainAfter);
    if (v.ok) pass(`at the end, ${v.why}`);
    else fail(`at the end, ${v.why}`);
  }
}

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
    P211_ENV_DIR: envDir,
    // PHASE 287. Every `security` child the app starts inherits this, which is
    // §1's measured condition exactly, and no read of his keychain preferences
    // can happen inside the app either.
    ...(realHome ? {} : { HOME: scratchHome })
  };

  await withElectron(
    {
      label: `p211 switch (${tag})`,
      userDataDir: profile,
      // PHASE 287. The checkout being measured, which is this one unless
      // P211_PARENT_CHECKOUT named the parent's.
      cwd: checkout,
      args: [
        '--remote-debugging-port=0',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-timer-throttling',
        // PHASE 287. Chromium's own Safe Storage opens no real keychain either.
        ...(realHome ? [] : ['--use-mock-keychain'])
      ],
      env: launchEnv,
      // `P211_ECHO=1` prints the app's own lines, for reading a refusal.
      ...(process.env['P211_ECHO'] === '1' ? { echo: true } : {}),
      graceMs: 15_000,
      // PHASE 287. The arm adds five more steps with two twenty second waits on
      // a promotion, so the ceiling is raised to leave the readings room. A
      // ceiling that ends the app mid-arm loses the store digests, which are
      // the whole measurement.
      ceilingMs: 420_000,
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
            // PHASE 287. `problem` rides along and is GRADED rather than waited
            // on: at `a4f44588` the drive does not map it, so the key is simply
            // absent there and the reading records that.
            `(async () => { const s = await window.__gmuxP202.read(); return JSON.stringify({ logins: s.logins.filter((l) => l.provider === 'codex'), sessions: s.sessions, toasts: s.toasts, problem: s.problem }); })()`
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
      const codexRow = (st, name) => st.logins.find((l) => l.name === name);
      const clearToasts = async () => {
        await cdpEval(cdp, `window.__gmuxP202.clearToasts()`);
      };
      const toastButtons = async () =>
        await cdpEval(cdp, `Array.from(document.querySelectorAll('.toast .btn-text')).map((b) => b.textContent)`);
      /**
       * PHASE 287. An ordinary list read, asked until `pred` holds or the time
       * is up, ANSWERING EITHER WAY. Step 10 changes a store without changing
       * anything the parent's drive can report, so there is nothing both builds
       * could wait on; a bounded ask that never throws is the honest shape.
       */
      const askUntil = async (pred, maxMs) => {
        const t0 = Date.now();
        for (;;) {
          await cdpEval(cdp, `window.__gmuxP202.loadLogins()`);
          const st = await readState();
          if (pred(st) || Date.now() - t0 > maxMs) return { ms: Date.now() - t0, state: st };
          await sleep(1000);
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

      // ---------------------------------------------------------------------
      // PHASE 287, RE-SPECIFIED BY PHASE 304. A credential larger than one
      // `security` line, steps 6 to 10, in this same launch: since Phase 304
      // Tortie's own vault keeps it in a sealed file, so the person's own sign
      // in is kept and offered back where the parent lost it.
      // ---------------------------------------------------------------------
      const steps = report.p287.steps;

      // STEP 6. BIG4 into the default codex store, from outside, the way the
      // vendor's own `/login` writes it. The default slot holds `three` after
      // step 5, so this observe promotes `three` into a login of its own, which
      // is a small put, and then keeps BIG4 (HEAD: `kept/codex.default.cred`,
      // sealed) or cannot (PARENT: the `-i` line cannot carry it). BOTH BUILDS
      // MAKE THAT PROMOTION, which is why the wait is on it.
      writeFileSync(codexStore, BIG4, { mode: 0o600 });
      const promotedThree = await waitUntil((st) => st.logins.some((l) => l.name === 'three.example'), 20_000);
      // The sealed write lands inside the same observe that made the promotion;
      // a short settle so the file is read after the rename and not during it.
      await sleep(1000);
      steps.six = {
        promotedAfterMs: promotedThree.ms,
        defaultRow: promotedThree.state.logins.find((l) => l.isDefault === true) ?? null,
        rows: promotedThree.state.logins,
        defaultSealed: sealedReading(sealedPathOf(null))
      };
      say(`step 6: BIG4 (${String(Buffer.byteLength(BIG4, 'utf8'))} bytes) in the default store; three.example after ${String(promotedThree.ms)} ms; the default row reads ${JSON.stringify(steps.six.defaultRow)}; kept/codex.default.cred ${steps.six.defaultSealed === null ? 'absent' : `present, ${String(steps.six.defaultSealed.bytes)} bytes`}`);

      // STEP 7. The default login again, and a codex session on it, so a DEFAULT
      // SESSION IS LIVE: after Restart now in step 4 the earlier session runs
      // under one.example, and the default lift only happens when one is.
      await cdpEval(cdp, `window.__gmuxP202.chooseLogin('codex', null)`);
      await sleep(800);
      const madeDefault = await cdpEval(cdp, `window.__gmuxP202.createSession('p211-default', 'codex')`);
      const liveDefault = await waitUntil(
        (st) => st.sessions.some((s) => s.agent === 'codex' && (s.login === null || s.login === undefined)),
        30_000
      );
      steps.seven = { created: madeDefault, ms: liveDefault.ms, sessions: liveDefault.state.sessions };
      say(`step 7: a codex session on the default login (${String(madeDefault)}) after ${String(liveDefault.ms)} ms: ${JSON.stringify(liveDefault.state.sessions)}`);

      const twoDir = loginDirOf('two.example');
      const twoStore = twoDir === null ? null : join(twoDir, 'auth.json');

      // STEP 8. A kept login chosen while that default session runs. The own
      // lift writes `two`; the default lift then gives the account BIG4 holds a
      // login of its own BEFORE writing `two` over it. AT HEAD that promotion
      // succeeds, because Tortie's own vault is a sealed file, so a row
      // `four.example` appears kept and restorable and the running session
      // follows the switch; AT THE PARENT the promotion cannot keep BIG4, the
      // lift writes `two` over it anyway, and the person's own sign in is gone.
      // The digests below are the reading the arm exists for, so nothing above
      // them may throw.
      await clearToasts();
      const choseTwo = await cdpEval(cdp, `window.__gmuxP202.chooseLogin('codex', 'two.example')`);
      // BOTH BUILDS POST THE SWITCHED TOAST HERE, because on both the default
      // store was written and the row promised a restore, so the wait succeeds
      // either way.
      const said8 = await waitUntil((st) => st.toasts.length > 0, 15_000);
      await sleep(500);
      const after8 = await readState();
      steps.eight = {
        chose: choseTwo,
        ms: said8.ms,
        defaultStore: storeDigest(codexStore),
        ownStore: twoStore === null ? null : storeDigest(twoStore),
        toasts: after8.toasts,
        buttons: await toastButtons(),
        problem: after8.problem,
        row: codexRow(after8, 'two.example') ?? null,
        fourRow: codexRow(after8, 'four.example') ?? null
      };
      say(`step 8: chose two.example with a default session running (${String(choseTwo)}); toasts ${JSON.stringify(steps.eight.toasts)}; controls ${JSON.stringify(steps.eight.buttons)}; four.example ${JSON.stringify(steps.eight.fourRow)}`);

      // STEP 8b. THE ACCOUNT OFFERED BACK. Choosing four.example puts BIG4 back
      // into its own store byte for byte at HEAD, which is the whole of what
      // Phase 304 buys a person. At the parent there is no such row and the
      // choose is refused by name, which is graded rather than skipped so both
      // builds run the same steps.
      await clearToasts();
      const choseFour = await cdpEval(cdp, `window.__gmuxP202.chooseLogin('codex', 'four.example')`);
      const said8b = await waitUntil((st) => st.toasts.length > 0, 10_000);
      await sleep(500);
      const after8b = await readState();
      const fourDir = loginDirOf('four.example');
      const fourStore = fourDir === null ? null : join(fourDir, 'auth.json');
      steps.eightB = {
        chose: choseFour,
        ms: said8b.ms,
        ownStore: fourStore === null ? null : storeDigest(fourStore),
        toasts: after8b.toasts,
        buttons: await toastButtons(),
        problem: after8b.problem,
        row: codexRow(after8b, 'four.example') ?? null
      };
      say(`step 8b: chose four.example (${String(choseFour)}); its own store ${steps.eightB.ownStore === null ? 'is absent' : `holds ${steps.eightB.ownStore.slice(0, 12)}`}; toasts ${JSON.stringify(steps.eightB.toasts)}`);

      // STEP 9. BIG5, a DIFFERENT over-cap account, into one.example's own
      // store. The observe promotes the `one` it was holding into a login of its
      // own — both builds do — and then keeps BIG5 (HEAD) or cannot (PARENT).
      // Choosing one.example is then an ordinary switch at HEAD, in place with
      // nothing to say, and the refusal a person meets for ever at the parent.
      const oneDir = loginDirOf('one.example');
      const oneStore = oneDir === null ? null : join(oneDir, 'auth.json');
      if (oneStore !== null) writeFileSync(oneStore, BIG5, { mode: 0o600 });
      const promotedOne2 = await waitUntil((st) => st.logins.some((l) => l.name === 'one.example 2'), 20_000);
      await clearToasts();
      const choseOne = await cdpEval(cdp, `window.__gmuxP202.chooseLogin('codex', 'one.example')`);
      // NEITHER BUILD IS PROMISED A TOAST HERE (a refusal posts nothing at the
      // parent; an in-place row posts nothing at HEAD), so this settles on a
      // sleep rather than on a toast.
      await sleep(1500);
      const after9 = await readState();
      steps.nine = {
        promotedAfterMs: promotedOne2.ms,
        chose: choseOne,
        ownStore: oneStore === null ? null : storeDigest(oneStore),
        toasts: after9.toasts,
        problem: after9.problem,
        row: codexRow(after9, 'one.example') ?? null
      };
      say(`step 9: BIG5 in one.example's own store; one.example 2 after ${String(promotedOne2.ms)} ms; chose one.example (${String(choseOne)}); toasts ${JSON.stringify(steps.nine.toasts)}`);

      // STEP 10. BIG6, over the cap for the account two.example's own store
      // ALREADY HOLDS. Nothing needs writing there. At the parent the keep is
      // refused and the click is refused for ever (build/p287/SPEC.md §0
      // finding 6); at HEAD the keep lands in the sealed file and the click is
      // answered. THE ROW PROMISES NOTHING ON EITHER BUILD: at the parent step
      // 9's click was refused, so two.example is still the CHOSEN row here and a
      // chosen row answers `restores: false` whatever its store holds; at HEAD
      // step 9 chose one.example, and two.example's store is in place. No
      // promotion happens and nothing the parent's drive reports moves, so the
      // wait is on the one thing that does change, the sealed file's digest at
      // HEAD, bounded either way.
      const twoId = loginIdOf('two.example');
      const twoSealedBefore = sealedReading(sealedPathOf(twoId))?.sha256 ?? null;
      if (twoStore !== null) writeFileSync(twoStore, BIG6, { mode: 0o600 });
      const asked10 = await askUntil(
        () => (sealedReading(sealedPathOf(twoId))?.sha256 ?? null) !== twoSealedBefore,
        12_000
      );
      steps.ten = { askMs: asked10.ms, rowBefore: codexRow(asked10.state, 'two.example') ?? null };
      await clearToasts();
      const choseTwoAgain = await cdpEval(cdp, `window.__gmuxP202.chooseLogin('codex', 'two.example')`);
      await sleep(1500);
      const after10 = await readState();
      steps.ten.chose = choseTwoAgain;
      steps.ten.toasts = after10.toasts;
      steps.ten.buttons = await toastButtons();
      steps.ten.problem = after10.problem;
      steps.ten.ownStore = twoStore === null ? null : storeDigest(twoStore);
      steps.ten.defaultStore = storeDigest(codexStore);
      steps.ten.row = codexRow(after10, 'two.example') ?? null;
      say(`step 10: BIG6 for the same account; the row read ${JSON.stringify(steps.ten.rowBefore)}; chose two.example again (${String(choseTwoAgain)}); toasts ${JSON.stringify(steps.ten.toasts)}`);

      // STEP 11's file half, read while the profile is still here: every sealed
      // file under kept/, by name, and the four this arm made, each as the
      // filesystem and a digest describe it.
      await sleep(1000);
      steps.sealed = {
        files: sealedFiles(),
        byName: {
          default: sealedReading(sealedPathOf(null)),
          'one.example': sealedReading(sealedPathOf(loginIdOf('one.example'))),
          'two.example': sealedReading(sealedPathOf(twoId)),
          'four.example': sealedReading(sealedPathOf(loginIdOf('four.example')))
        }
      };
      say(`sealed files under kept/: ${JSON.stringify(steps.sealed.files)}`);

      // The app's own lines, kept so the parent's refusal sentence can be looked
      // for. It is not there today: `logins/ipc.ts` logs the outcome and not the
      // sentence, so the reading below says "not read" rather than failing.
      report.p287.appTextHasParentRefusal = handle
        .text()
        .includes('Tortie could not keep the sign in that is there');
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

  // -------------------------------------------------------------------------
  // PHASE 287, RE-SPECIFIED BY PHASE 304. Readings 6 to 11. Every `problem` is
  // graded against what THIS build is supposed to be able to answer, which at
  // the parent is nothing: the drive there does not map the field. The sealed
  // files are graded present at HEAD and absent at the parent, whose vault was
  // the keychain.
  // -------------------------------------------------------------------------
  const steps = report.p287.steps;
  const wantField = (head) => (atParent ? UNREADABLE : head);
  const wantSealed = atParent ? 'absent' : 'present';
  const small = { two: sha256(codexAuth('two')) };

  // Reading 6. The account BIG4 replaced was promoted on both builds, and at
  // HEAD BIG4 itself was kept in a sealed file rather than refused.
  const s6 = steps.six ?? {};
  if (s6.promotedAfterMs >= 0) pass(`step 6: the account BIG4 replaced was promoted after ${String(s6.promotedAfterMs)} ms, so the observe over BIG4 ran`);
  else fail('step 6: three.example was not promoted within 20 s, so the observe over BIG4 was never seen');
  const v6a = gradeSealedFile(s6.defaultSealed ?? null, wantSealed, BIG_DIGESTS);
  if (v6a.ok) pass(`step 6: kept/codex.default.cred ${atParent ? 'at the parent' : 'after the observe'}: ${v6a.why}`);
  else fail(`step 6: kept/codex.default.cred: ${v6a.why}`);
  say(`step 6: the default row reads email ${String(s6.defaultRow?.email)} present ${String(s6.defaultRow?.present)}; ${atParent ? 'the keep of BIG4 was refused and nothing says so' : 'BIG4 is kept and the row draws its address'}`);

  // Reading 7. A default session is live again, which is what makes the default
  // lift happen at all.
  const s7 = steps.seven ?? {};
  if (s7.created === true && (s7.sessions ?? []).some((s) => s.agent === 'codex' && (s.login === null || s.login === undefined))) {
    pass(`step 7: a codex session runs on the default login again after ${String(s7.ms)} ms`);
  } else fail(`step 7: no codex session on the default login: ${JSON.stringify(s7)}`);

  // Reading 8. THE SWITCH REACHES THE SESSION ON BOTH BUILDS, and what differs
  // is whether the account it wrote over still exists anywhere: at HEAD it was
  // promoted into four.example first; at the parent it is gone, THE LOSS.
  const s8 = steps.eight ?? {};
  const v8a = gradeStoreDigest(s8.defaultStore ?? null, small.two, 'the default codex store');
  if (v8a.ok) pass(`step 8: the default lift reached the running session on the ${tag}: ${v8a.why}`);
  else fail(`step 8: the default codex store: ${v8a.why}`);
  const v8b = gradeStoreDigest(s8.ownStore ?? null, small.two, "two.example's own store");
  if (v8b.ok) pass(`step 8: the chosen login's own store was written on both builds: ${v8b.why}`);
  else fail(`step 8: ${v8b.why}`);
  const v8c = gradeToastAbsent(s8.toasts ?? [], TOO_LARGE_RUNNING);
  if (v8c.ok) pass(`step 8: nothing was refused for size, because Tortie's own vault is not a keychain entry${atParent ? ' (and the parent had no such sentence)' : ''}: ${v8c.why}`);
  else fail(`step 8: ${v8c.why}`);
  const v8d = gradeToastOnce(s8.toasts ?? [], 'two.example is switched.');
  if (v8d.ok) pass(`step 8: ONE SWITCH SAYS ONE THING, the switched line: ${v8d.why}`);
  else fail(`step 8: the switched line: ${v8d.why}`);
  if ((s8.buttons ?? []).includes('Restart now')) pass(`step 8: the controls beside it: ${JSON.stringify(s8.buttons ?? [])}`);
  else fail(`step 8: no Restart now beside the sentence: ${JSON.stringify(s8.buttons ?? [])}`);
  const v8e = gradeProblem(s8.problem, wantField(null));
  if (v8e.ok) pass(`step 8: ${v8e.why}`);
  else fail(`step 8: ${v8e.why}`);
  // THE ROW THE LOSS WOULD HAVE BEEN. At HEAD the account BIG4 held has a login
  // of its own, kept and restorable, with an empty store; at the parent there
  // is no such row, because the promotion could not keep BIG4 and the lift
  // wrote over it anyway.
  if (atParent) {
    if (s8.fourRow === null || s8.fourRow === undefined) pass('step 8: AT THE PARENT no four.example row exists: the account BIG4 held was written over and kept nowhere, which is the loss this phase closes');
    else fail(`step 8: the parent minted a four.example row, which it was not supposed to be able to keep: ${JSON.stringify(s8.fourRow)}`);
  } else {
    const v8f = gradeRowBooleans(s8.fourRow ?? null, { kept: true, restores: true, present: false, isDefault: false });
    if (v8f.ok) pass(`step 8: the account BIG4 held was promoted into four.example before the lift wrote over it: ${v8f.why}`);
    else fail(`step 8: four.example: ${v8f.why}`);
  }

  // Reading 8b. THE ACCOUNT PUT BACK. At HEAD choosing four.example writes BIG4
  // into its own store byte for byte, out of the sealed vault; at the parent
  // the choose is refused by name, because there is nothing to choose.
  const s8b = steps.eightB ?? {};
  if (atParent) {
    if (s8b.chose === false) pass('step 8b: AT THE PARENT four.example cannot be chosen, because it does not exist');
    else fail(`step 8b: choosing four.example answered ${String(s8b.chose)} at the parent`);
    if (s8b.ownStore === null || s8b.ownStore === undefined) pass('step 8b: AT THE PARENT BIG4 is in no store at all');
    else fail(`step 8b: a store holds ${String(s8b.ownStore).slice(0, 12)} at the parent, where BIG4 was supposed to be gone`);
  } else {
    if (s8b.chose === true) pass('step 8b: four.example was chosen');
    else fail(`step 8b: choosing four.example answered ${String(s8b.chose)}`);
    const v8g = gradeStoreDigest(s8b.ownStore ?? null, BIG_DIGESTS.BIG4, "four.example's own store");
    if (v8g.ok) pass(`step 8b: THE SIGN IN OF 4,193 BYTES WAS PUT BACK byte for byte out of the sealed vault: ${v8g.why}`);
    else fail(`step 8b: ${v8g.why}`);
    const v8h = gradeToastOnce(s8b.toasts ?? [], 'four.example is switched.');
    if (v8h.ok) pass(`step 8b: ${v8h.why}`);
    else fail(`step 8b: the switched line: ${v8h.why}`);
    const v8i = gradeToastAbsent(s8b.toasts ?? [], TOO_LARGE_RUNNING);
    if (v8i.ok) pass(`step 8b: ${v8i.why}`);
    else fail(`step 8b: ${v8i.why}`);
    const v8j = gradeProblem(s8b.problem, null);
    if (v8j.ok) pass(`step 8b: ${v8j.why}`);
    else fail(`step 8b: ${v8j.why}`);
  }

  // Reading 9. A different over-cap account in a kept login's own store. At
  // HEAD it is kept and the switch is an ordinary one, in place, with nothing
  // refused and nothing said; at the parent the click is refused for ever.
  const s9 = steps.nine ?? {};
  const v9a = gradeStoreDigest(s9.ownStore ?? null, BIG_DIGESTS.BIG5, "one.example's own store");
  if (v9a.ok) pass(`step 9: the store was not written over on either build: ${v9a.why}`);
  else fail(`step 9: ${v9a.why}`);
  if (s9.chose === !atParent) pass(`step 9: choosing one.example answered ${String(s9.chose)}, which is ${atParent ? 'the refusal a person meets for ever at the parent' : 'an ordinary switch, because BIG5 was kept'}`);
  else fail(`step 9: choosing one.example answered ${String(s9.chose)} at the ${tag}`);
  const v9b = gradeToastAbsent(s9.toasts ?? [], TOO_LARGE_SENTENCE);
  if (v9b.ok) pass(`step 9: no too-large sentence on either build, because a codex store is a file and Tortie's own vault refuses nothing for size: ${v9b.why}`);
  else fail(`step 9: ${v9b.why}`);
  const v9c = gradeToastAbsent(s9.toasts ?? [], 'one.example is switched.');
  if (v9c.ok) pass(`step 9: nothing claims a restore happened on either build: ${v9c.why}`);
  else fail(`step 9: ${v9c.why}`);
  const v9d = gradeProblem(s9.problem, wantField(null));
  if (v9d.ok) pass(`step 9: ${v9d.why}`);
  else fail(`step 9: ${v9d.why}`);
  const v9e = gradeRowBooleans(s9.row ?? null, atParent ? { kept: true, present: true, restores: true } : { kept: true, present: true, restores: false });
  if (v9e.ok) pass(`step 9: one.example's row ${atParent ? 'promises "Puts this account back." about a click it refuses' : 'is in place and promises nothing'}: ${v9e.why}`);
  else fail(`step 9: one.example's row: ${v9e.why}`);
  say(
    `step 9: the parent's own refusal sentence is ${report.p287.appTextHasParentRefusal === true ? 'in the app output' : 'NOT READ'}: src/main/logins/ipc.ts logs the outcome and not the sentence, so it is recorded rather than graded`
  );

  // Reading 10. The login that GREW under the same account. At HEAD the keep
  // lands in the sealed file and the click is answered; at the parent the keep
  // is refused and the click is refused for ever. THE PROMISE IS NOT ON THIS
  // ROW ON EITHER BUILD: at the parent it is still the CHOSEN row, because step
  // 9's click was refused, and `listLoginsAsking` answers `restores: false` for
  // a chosen row; "Puts this account back." belongs to the UNCHOSEN row of step
  // 9, where finding 6 measured it. Phase 287's own run read it the same way.
  const s10 = steps.ten ?? {};
  const v10a = gradeRowBooleans(s10.rowBefore ?? null, atParent ? { kept: true, present: true, chosen: true, restores: false } : { kept: true, present: true, chosen: false, restores: false });
  if (v10a.ok) pass(`step 10: two.example's row after BIG6 ${atParent ? 'is the chosen row, kept and promising nothing, about a click the parent refuses' : 'is in place and promises nothing'}: ${v10a.why}`);
  else fail(`step 10: two.example's row: ${v10a.why}`);
  if (s10.chose === !atParent) pass(`step 10: choosing it answered ${String(s10.chose)}, which is ${atParent ? 'the refusal that can never succeed' : 'the choice being recorded'}`);
  else fail(`step 10: choosing it answered ${String(s10.chose)} at the ${tag}`);
  const v10c = gradeToastAbsent(s10.toasts ?? [], TOO_LARGE_RUNNING);
  if (v10c.ok) pass(`step 10: ${v10c.why}`);
  else fail(`step 10: ${v10c.why}`);
  const v10d = gradeToastAbsent(s10.toasts ?? [], 'two.example is switched.');
  if (v10d.ok) pass(`step 10: no switched line either build, because the store is in place: ${v10d.why}`);
  else fail(`step 10: ${v10d.why}`);
  const v10e = gradeStoreDigest(s10.ownStore ?? null, BIG_DIGESTS.BIG6, "two.example's own store");
  if (v10e.ok) pass(`step 10: the store that grew was not written over: ${v10e.why}`);
  else fail(`step 10: ${v10e.why}`);
  // The default store: at HEAD the click was answered and the default lift
  // carried BIG6 to the running session, because nothing refused it; at the
  // parent the click was refused and the store is as step 8 left it.
  const v10f = gradeStoreDigest(s10.defaultStore ?? null, atParent ? small.two : BIG_DIGESTS.BIG6, 'the default codex store');
  if (v10f.ok) pass(`step 10: the default store ${atParent ? 'is as step 8 left it, because the click was refused' : 'followed the switch, because nothing refused it'}: ${v10f.why}`);
  else fail(`step 10: ${v10f.why}`);
  const v10g = gradeProblem(s10.problem, wantField(null));
  if (v10g.ok) pass(`step 10: ${v10g.why}`);
  else fail(`step 10: ${v10g.why}`);

  // Reading 11. Nothing over the cap ever reached `security -i`, read off the
  // scratch keychain itself; at HEAD nothing of Tortie's own reached it at
  // all, and every sealed file is a regular 0600 file holding no credential.
  report.p287.keychain = scratchKeychainItems();
  const v11 = gradeNoBigInKeychain(report.p287.keychain, BIG_DIGESTS);
  if (v11.ok) pass(`step 11: the scratch keychain holds no over-cap credential: ${v11.why}`);
  else fail(`step 11: ${v11.why}`);
  const v11b = gradeNoTortieItems(report.p287.keychain);
  if (atParent) say(`step 11: at the parent the scratch keychain ${v11b.ok ? 'holds none of' : 'holds'} Tortie's own items (${v11b.why}), which is recorded and not graded: its vault was the keychain`);
  else if (v11b.ok) pass(`step 11: the app wrote no Tortie-credentials item at all: ${v11b.why}`);
  else fail(`step 11: ${v11b.why}`);
  const sealed = steps.sealed ?? { files: [], byName: {} };
  say(`step 11: sealed files under kept/ at the ${tag}: ${JSON.stringify(sealed.files)}`);
  for (const [name, reading] of Object.entries(sealed.byName)) {
    const v = gradeSealedFile(reading ?? null, wantSealed, BIG_DIGESTS);
    if (v.ok) pass(`step 11: the sealed file for ${name}: ${v.why}`);
    else fail(`step 11: the sealed file for ${name}: ${v.why}`);
  }

  // PHASE 287. The readings that close the run are taken HERE rather than after
  // the finally, because the scratch `HOME` is one of the directories the
  // finally removes and every `security` call below has to be asked under the
  // same `HOME` the first ones were.
  afterReadings();
} finally {
  const deleted = security(['delete-keychain', keychainFile]);
  say(`scratch keychain deleted: rc ${String(deleted.code)}, file ${existsSync(keychainFile) ? 'still there' : 'gone'}`);
  rmSync(root, { recursive: true, force: true });
}

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
