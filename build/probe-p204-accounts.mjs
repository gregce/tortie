#!/usr/bin/env node
/**
 * probe-p204-accounts.mjs. Does the app really keep an account somebody signed
 * out of, and really put it back when it is chosen?
 *
 * ## What it proves, in ONE app run on one scratch profile
 *
 * The operator's words of 2026-09-02: *"if I just switch logged in accounts via
 * going into the agent and typing /login that tortie should just remember
 * that"*. That is a claim about what MAIN does over real directories while the
 * app is running, and about what the app then DRAWS, so this probe:
 *
 *  1. starts the app over FIXTURE stores it made, and reads the login rows off
 *     the real Settings window's DOM;
 *  2. REWRITES THE DEFAULT STORES WHILE THE APP IS RUNNING, which is what the
 *     vendor's own `/login` does, and waits past the five second observation
 *     window;
 *  3. reads the rows again and expects a login of Tortie's own, named from the
 *     address of the account that was replaced, drawn as kept rather than as
 *     never signed in, and saying what choosing it will do;
 *  4. chooses it, chooses the default, and chooses it again, reading every row
 *     off the DOM after each hop;
 *  5. compares the bytes in that login's own directory against the bytes that
 *     were in the default store before the change, on disk, byte for byte;
 *  6. scans the whole profile for the sentinels every fixture credential
 *     carries.
 *
 * ## NOTHING OF THE PERSON IS READ, WRITTEN OR SPENT
 *
 *  - NO KEYCHAIN IS OPENED, for reading or for writing. `GMUX_USAGE_FIXTURE`
 *    makes the store Tortie keeps accounts in a FILE under this probe's own
 *    profile and refuses every `security` call, so every credential in this run
 *    is a synthetic file this probe wrote into a directory this probe made.
 *  - NO VENDOR BINARY RUNS, no session is created and no request is made.
 *  - HIS OWN THREE CREDENTIALS ARE HASHED before and after and the two sets are
 *    printed. Nothing else is ever done with them.
 *  - The Electron goes through build/electron-run.mjs and is ended in its
 *    `finally`. The tmux socket is this probe's own, p204.
 *
 * ## Usage, from the worktree root
 *
 *   npm run probe:p204                              the whole run
 *   node build/probe-p204-accounts.mjs --self-test  the graders alone, which
 *                                                   launches nothing at all
 *
 * Exit 0 when every reading agrees. 1 when one does not. 2 when it refuses.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p204]';
const t0 = Date.now();
const say = (line) => {
  console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1)}s ${line}`);
};

// ---------------------------------------------------------------------------
// THE GRADERS. Pure, and proved on fixtures by --self-test, because a check
// that cannot fail proves nothing.
// ---------------------------------------------------------------------------

/** Is this the row a kept account earns: present false, kept true, offered back? */
export function gradeKeptRow(row) {
  if (row === undefined || row === null) return { ok: false, why: 'no row at all' };
  const fails = [];
  if (row.kept !== '1') fails.push(`kept ${String(row.kept)} rather than 1`);
  if (row.restores !== '1') fails.push(`restores ${String(row.restores)} rather than 1`);
  if (!row.text.includes('Kept by Tortie')) {
    fails.push(`the row does not say it is kept: ${row.text.slice(0, 90)}`);
  }
  if (row.text.includes('Not signed in yet')) {
    fails.push('the row still says it was never signed into');
  }
  if (!row.text.includes('Puts this account back')) {
    fails.push('the row does not say what choosing it will do');
  }
  return fails.length === 0
    ? { ok: true, why: row.text.slice(0, 110) }
    : { ok: false, why: fails.join(', ') };
}

/** Is this the row a login that has just been put back earns? */
export function gradeRestoredRow(row) {
  if (row === undefined || row === null) return { ok: false, why: 'no row at all' };
  const fails = [];
  if (row.restores !== '0') fails.push('it still offers to put the account back');
  if (row.chosen !== true) fails.push('it is not the chosen login');
  if (row.text.includes('Not signed in yet')) fails.push('it says it was never signed into');
  if (row.text.includes('Kept by Tortie')) fails.push('its own store is still empty');
  return fails.length === 0
    ? { ok: true, why: row.text.slice(0, 110) }
    : { ok: false, why: fails.join(', ') };
}

/** Did a name get minted from the address rather than from anything else? */
export function gradeMintedName(names, want) {
  return names.includes(want)
    ? { ok: true, why: `${want} is on the list` }
    : { ok: false, why: `the list is ${JSON.stringify(names)} and none is ${want}` };
}

/** Are these two files byte for byte the same? */
export function gradeSameBytes(got, want) {
  if (got === null) return { ok: false, why: 'the file is not there at all' };
  return got === want
    ? { ok: true, why: `${String(got.length)} bytes, identical` }
    : { ok: false, why: `${String(got.length)} bytes against ${String(want.length)}, and they differ` };
}

if (process.argv.includes('--self-test')) {
  const keptRow = {
    kept: '1',
    restores: '1',
    text: 'one@example.com · one.example · Kept by Tortie · Puts this account back for new sessions.'
  };
  const cases = [
    ['a kept row', gradeKeptRow(keptRow), true],
    ['a row that says never signed in', gradeKeptRow({ ...keptRow, text: 'one.example · Not signed in yet' }), false],
    ['a row with no switch line', gradeKeptRow({ ...keptRow, text: 'one@example.com · Kept by Tortie' }), false],
    ['a row that is not kept', gradeKeptRow({ ...keptRow, kept: '0' }), false],
    ['no row', gradeKeptRow(undefined), false],
    ['a restored row', gradeRestoredRow({ restores: '0', chosen: true, text: 'one@example.com · one.example' }), true],
    ['a restored row still offering', gradeRestoredRow({ restores: '1', chosen: true, text: 'x' }), false],
    ['a restored row not chosen', gradeRestoredRow({ restores: '0', chosen: false, text: 'x' }), false],
    ['a minted name', gradeMintedName(['Default', 'one.example'], 'one.example'), true],
    ['a name that was not minted', gradeMintedName(['Default', 'Kept 1'], 'one.example'), false],
    ['bytes that match', gradeSameBytes('abc', 'abc'), true],
    ['bytes that differ', gradeSameBytes('abd', 'abc'), false],
    ['a file that is not there', gradeSameBytes(null, 'abc'), false]
  ];
  let bad = 0;
  for (const [name, got, want] of cases) {
    if (got.ok !== want) {
      bad += 1;
      console.log(`${TAG} SELF TEST FAILED: ${name} answered ${String(got.ok)}`);
    }
  }
  console.log(
    `${TAG} self test: ${String(cases.length - bad)} of ${String(cases.length)} grader fixtures behaved`
  );
  process.exit(bad === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// HIS OWN CREDENTIALS. Hashed, and nothing else, at both ends of the run.
// ---------------------------------------------------------------------------

function hashOf(path) {
  try {
    return createHash('sha256').update(readFileSync(path)).digest('hex');
  } catch {
    return 'absent';
  }
}

/**
 * The keychain item's ATTRIBUTES, with the two dates removed.
 *
 * `-g` IS NEVER PASSED, so no payload is ever asked for. Claude Code rewrites
 * its item roughly hourly, which moves `mdat`, so the date lines are dropped
 * and what is hashed is the item's identity rather than its clock.
 */
function keychainFingerprint(service) {
  try {
    const text = execFileSync(
      '/usr/bin/security',
      ['find-generic-password', '-s', service],
      { encoding: 'utf8', timeout: 10_000, stdio: ['ignore', 'pipe', 'ignore'] }
    );
    const stable = text
      .split('\n')
      .filter((l) => !l.includes('"cdat"') && !l.includes('"mdat"'))
      .join('\n');
    return createHash('sha256').update(stable).digest('hex');
  } catch {
    return 'absent';
  }
}

/** Every keychain item whose service begins with Tortie's own prefix. */
function tortieItemsNamed() {
  // ATTRIBUTES ONLY, and only to prove this run created none of his. A miss is
  // the expected answer.
  return keychainFingerprint('Tortie-credentials-claude.default') === 'absent' &&
    keychainFingerprint('Tortie-credentials-codex.default') === 'absent'
    ? 'none'
    : 'SOME EXIST';
}

/**
 * His own credentials, hashed and nothing else.
 *
 * THE FIRST THREE ARE THE ONES THAT MUST NOT MOVE. The claude credential is a
 * KEYCHAIN ITEM on this machine, so what is hashed is the item's identity with
 * its two dates removed; the codex credential is a file; and the third is the
 * proof that this run created no Tortie owned item in his keychain, which the
 * harness fixture makes impossible and this asserts anyway.
 *
 * `claudeJson` IS INFORMATIONAL AND IS NOT COMPARED. `~/.claude.json` is the
 * vendor's own configuration and session state rather than a credential, and
 * the vendor rewrites it continuously while he works: it moved during this
 * probe's own first run, in the tenth of a second between the two readings of
 * a run that had already refused to start. Comparing it would report his own
 * agent's ordinary writing as a finding of this phase.
 */
function credentialHashes() {
  return {
    claudeKeychainAttributes: keychainFingerprint('Claude Code-credentials'),
    codexAuthFile: hashOf(join(homedir(), '.codex', 'auth.json')),
    tortieOwnItemsInHisKeychain: tortieItemsNamed(),
    claudeJsonInformational: hashOf(join(homedir(), '.claude.json'))
  };
}

/** The part of that reading which must be identical at both ends. */
function credentialsThatMustNotMove(all) {
  const { claudeJsonInformational, ...rest } = all;
  return rest;
}

const hashesBefore = credentialHashes();
say(`his credentials before: ${JSON.stringify(hashesBefore)}`);

// ---------------------------------------------------------------------------
// The scratch world. Every path below is one this file made.
// ---------------------------------------------------------------------------

const outDir = process.env['P204_OUT_DIR'] ?? join(repoRoot, 'out', 'p204');
mkdirSync(outDir, { recursive: true });

const harnessDir = mkdtempSync(join(tmpdir(), 'p204-'));
const profile = join(harnessDir, 'profile');
const defaultClaude = join(harnessDir, 'default-claude');
const defaultCodex = join(harnessDir, 'default-codex');
const fixturePath = join(harnessDir, 'usage-fixture.json');
const projectDir = join(harnessDir, 'project');
// The helper refuses any socket that is not one of ours, and ours are the ones
// named `gmux-*`. This is this probe's own server and it is ended, with its
// socket file, in the helper's `finally`.
const SOCKET = 'gmux-p204';

const stamp = Date.now().toString(36);
/** Values only this probe ever writes. If one appears anywhere, say where. */
const SENTINEL = {
  claudeOne: `P204-CLAUDE-ONE-${stamp}`,
  claudeTwo: `P204-CLAUDE-TWO-${stamp}`,
  codexOne: `P204-CODEX-ONE-${stamp}`,
  codexTwo: `P204-CODEX-TWO-${stamp}`
};

const ADDRESS = {
  claudeOne: 'one.claude@example.com',
  claudeTwo: 'two.claude@example.com',
  codexOne: 'one.codex@example.com',
  codexTwo: 'two.codex@example.com'
};

/** The names Tortie should mint from those addresses, by its own rule. */
const MINTED = {
  claude: 'one.claude.example',
  codex: 'one.codex.example'
};

function writeJson(path, value, mode = 0o600) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value), { encoding: 'utf8', mode });
}

function claudeCredentialText(token) {
  return JSON.stringify({
    claudeAiOauth: {
      accessToken: token,
      subscriptionType: 'max',
      expiresAt: Date.now() + 3_600_000
    }
  });
}

function codexCredentialText(token, email) {
  const claims = { sub: `user-${stamp}`, email };
  const claim = Buffer.from(JSON.stringify(claims), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return JSON.stringify({
    OPENAI_API_KEY: null,
    tokens: {
      access_token: token,
      account_id: `acct-${stamp}`,
      id_token: `header.${claim}.sig`
    }
  });
}

/** Put one account in the two default stores, the way a vendor sign in does. */
function signInDefaults(who) {
  const claudeText = claudeCredentialText(SENTINEL[`claude${who}`]);
  const codexText = codexCredentialText(
    SENTINEL[`codex${who}`],
    ADDRESS[`codex${who}`]
  );
  mkdirSync(defaultClaude, { recursive: true });
  writeFileSync(join(defaultClaude, '.credentials.json'), claudeText, {
    encoding: 'utf8',
    mode: 0o600
  });
  writeJson(join(defaultClaude, '.claude.json'), {
    numStartups: 9,
    oauthAccount: { emailAddress: ADDRESS[`claude${who}`] }
  });
  mkdirSync(defaultCodex, { recursive: true });
  writeFileSync(join(defaultCodex, 'auth.json'), codexText, {
    encoding: 'utf8',
    mode: 0o600
  });
  return { claudeText, codexText };
}

const beforeChange = signInDefaults('One');
mkdirSync(join(profile, 'gmux', 'logins'), { recursive: true });
mkdirSync(projectDir, { recursive: true });
writeFileSync(fixturePath, JSON.stringify({}), 'utf8');

const launchEnv = {
  ...process.env,
  GMUX_TMUX_SOCKET: SOCKET,
  GMUX_HARNESS_DIR: harnessDir,
  GMUX_USAGE_FIXTURE: fixturePath,
  CLAUDE_CONFIG_DIR: defaultClaude,
  CODEX_HOME: defaultCodex
};

// ---------------------------------------------------------------------------
// The report.
// ---------------------------------------------------------------------------

const report = {
  socket: SOCKET,
  credentials: { before: hashesBefore, after: null },
  rows: [],
  hops: [],
  bytes: [],
  sentinels: [],
  failures: []
};
const fail = (why) => {
  report.failures.push(why);
  say(`FAIL ${why}`);
};
function record(list, name, verdict) {
  list.push({ name, ok: verdict.ok, why: verdict.why });
  if (verdict.ok) say(`ok  ${name}: ${verdict.why}`);
  else fail(`${name}: ${verdict.why}`);
}

/** Every readable file under a directory, so the sentinel scan misses none. */
function walkFiles(dir, into = []) {
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return into;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(path, into);
    else if (entry.isFile()) into.push(path);
  }
  return into;
}

/**
 * The one drive, evaluated inside the real Settings window.
 *
 * IT READS THE REAL DOM after every hop, and every change it makes goes
 * through `window.gmux.logins`, which is the same bridge the Settings page and
 * the meter's card invoke. It says `[p204] armed` out loud so this file can
 * rewrite the default stores at a known moment, which is the whole point of
 * the run: the vendor changing a store under a running app.
 */
const DRIVE = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const trail = [];
  const rail = Array.from(document.querySelectorAll('button'))
    .find((n) => (n.textContent || '').trim() === 'Agents');
  if (rail === undefined) return JSON.stringify({ error: 'no Agents section on the rail' });
  rail.click();
  await wait(1500);
  if (document.querySelector('[data-usage-group="1"]') === null) {
    return JSON.stringify({ error: 'the usage group never drew' });
  }
  /**
   * Make the Settings page read the list again, the way a person does.
   *
   * Invoking the logins list over the bridge asks MAIN and answers THIS
   * expression; it does not touch the store the page draws from, so a page
   * read straight after it shows what it showed before. That was the first
   * finding of this run. Leaving the section and coming back remounts the
   * block, whose own effect calls the shipped load, which is the path every
   * surface uses. It is a person's own act rather than a poke at internals,
   * and it is what makes the rows below the app's real answer.
   */
  const reload = async (label) => {
    const pick = (text) =>
      Array.from(document.querySelectorAll('button'))
        .find((n) => (n.textContent || '').trim() === text);
    const away = pick('General') || pick('Appearance') || pick('Machines');
    if (away === undefined) { trail.push('no section to leave to for ' + label); return; }
    away.click();
    await wait(700);
    const back = pick('Agents');
    if (back === undefined) { trail.push('could not come back for ' + label); return; }
    back.click();
    await wait(1500);
  };
  const readRows = () => {
    const rows = [];
    for (const block of document.querySelectorAll('[data-logins]')) {
      for (const el of block.querySelectorAll('[data-login]')) {
        rows.push({
          provider: block.getAttribute('data-logins'),
          name: el.getAttribute('data-login'),
          account: el.getAttribute('data-login-account'),
          kept: el.getAttribute('data-login-kept'),
          restores: el.getAttribute('data-login-restores'),
          chosen: (el.textContent || '').includes('Chosen'),
          text: (el.textContent || '').trim()
        });
      }
    }
    return rows;
  };
  const shots = {};
  shots.before = readRows();
  trail.push('read ' + String(shots.before.length) + ' rows');
  // THE VENDOR REWRITES BOTH DEFAULT STORES DURING THIS WAIT. The probe that
  // started this window does it on a clock rather than on a message, because
  // this window's console does not reach the harness output. The wait is long
  // enough to cover the write AND to pass the five second observation window,
  // so the next list really reads the stores again.
  await wait(16000);
  await reload('the store change');
  shots.afterChange = readRows();
  trail.push('after the store changed: ' + String(shots.afterChange.length) + ' rows');
  const answers = {};
  answers.chooseKept = await window.gmux.logins.choose('codex', ${JSON.stringify(MINTED.codex)});
  await reload('the first hop');
  shots.afterChoose = readRows();
  answers.chooseDefault = await window.gmux.logins.choose('codex', null);
  await reload('the hop back');
  shots.afterDefault = readRows();
  answers.chooseAgain = await window.gmux.logins.choose('codex', ${JSON.stringify(MINTED.codex)});
  await reload('the hop back again');
  shots.afterAgain = readRows();
  return JSON.stringify({ shots, answers, trail });
})()`;

let exitCode = 0;
try {
  say('one app run: the Settings list, a store change under it, and three hops');
  const run = await withElectron(
    {
      label: 'p204-accounts',
      userDataDir: profile,
      cwd: repoRoot,
      tmuxSocket: SOCKET,
      ceilingMs: 240_000,
      env: {
        ...launchEnv,
        GMUX_SHOT: join(outDir, 'p204-settings.png'),
        GMUX_SHOT_DELAY_MS: '4000',
        GMUX_SHOT_SETTINGS: '1',
        GMUX_SHOT_SETTINGS_JS: DRIVE
      }
    },
    async (handle) => {
      let out = '';
      handle.child.stdout.on('data', (c) => {
        out += String(c);
      });
      handle.child.stderr.on('data', (c) => {
        out += String(c);
      });
      // BE THE VENDOR. Wait until the app has said its fixture is installed,
      // which is the moment before the window loads, then wait past the point
      // the drive has taken its first reading, then rewrite both default
      // stores with a different account. That is exactly what the person's own
      // `/login` does, and it happens while the app is running.
      try {
        await handle.waitForLine(/usage fixture installed/, 90_000);
        await new Promise((r) => setTimeout(r, 12_000));
        say('rewriting both default stores as the vendor would');
        signInDefaults('Two');
      } catch {
        say('the app never said its fixture was installed');
      }
      const code = await handle.exited;
      return { code, out };
    }
  );
  writeFileSync(join(outDir, 'p204-run.log'), run.out, 'utf8');
  const marker = '[gmux-shot] driver';
  const line = run.out.split('\n').find((l) => l.includes(marker)) ?? '';
  const payload = line.slice(line.indexOf(marker) + marker.length).trim();
  let reading = null;
  try {
    reading = JSON.parse(payload.replace(/^→\s*/, ''));
  } catch {
    reading = null;
  }

  if (reading === null || reading.error !== undefined || reading.shots === undefined) {
    fail(
      `the drive answered nothing readable: ${String(reading?.error ?? payload.slice(0, 300))}`
    );
  } else {
    say(`trail: ${JSON.stringify(reading.trail)}`);
    const at = (shot, provider, name) =>
      reading.shots[shot].find((r) => r.provider === provider && r.name === name);

    // 1. BEFORE. Two default rows, drawn as their accounts, nothing kept.
    report.rows.push({
      name: 'the rows before the store changed',
      ok: true,
      why: JSON.stringify(reading.shots.before)
    });
    record(report.rows, 'the codex default row is the account signed in', {
      ok: at('before', 'codex', 'Default')?.account === ADDRESS.codexOne,
      why: String(at('before', 'codex', 'Default')?.account)
    });
    record(report.rows, 'the claude default row is the account signed in', {
      ok: at('before', 'claude', 'Default')?.account === ADDRESS.claudeOne,
      why: String(at('before', 'claude', 'Default')?.account)
    });
    record(report.rows, 'nothing is offered back before anything has changed', {
      ok: reading.shots.before.every((r) => r.restores === '0'),
      why: JSON.stringify(reading.shots.before.map((r) => `${r.name}:${r.restores}`))
    });

    // 2. THE STORE CHANGED UNDER THE RUNNING APP, which is the whole feature.
    report.rows.push({
      name: 'the rows after the store changed',
      ok: true,
      why: JSON.stringify(reading.shots.afterChange)
    });
    const names = reading.shots.afterChange.map((r) => r.name);
    record(
      report.rows,
      'the codex account he left has a login named from its address',
      gradeMintedName(names, MINTED.codex)
    );
    record(
      report.rows,
      'and the claude account he left has one too',
      gradeMintedName(names, MINTED.claude)
    );
    record(
      report.rows,
      'the kept codex login is drawn as kept and says what a switch will do',
      gradeKeptRow(at('afterChange', 'codex', MINTED.codex))
    );
    record(
      report.rows,
      'the kept claude login is drawn the same way',
      gradeKeptRow(at('afterChange', 'claude', MINTED.claude))
    );
    record(report.rows, 'the default row now draws the account that replaced it', {
      ok: at('afterChange', 'codex', 'Default')?.account === ADDRESS.codexTwo,
      why: String(at('afterChange', 'codex', 'Default')?.account)
    });

    // 3. THE HOPS. Choose it, choose the default, choose it again.
    record(report.hops, 'choosing the kept login was accepted', {
      ok: reading.answers.chooseKept?.ok === true,
      why: String(reading.answers.chooseKept?.reason ?? 'ok')
    });
    record(
      report.hops,
      'and its row now says the account is in place and in use',
      gradeRestoredRow(at('afterChoose', 'codex', MINTED.codex))
    );
    record(report.hops, 'choosing the default again was accepted', {
      ok: reading.answers.chooseDefault?.ok === true,
      why: String(reading.answers.chooseDefault?.reason ?? 'ok')
    });
    record(report.hops, 'and the kept login is still there and still signed in', {
      ok:
        at('afterDefault', 'codex', MINTED.codex) !== undefined &&
        at('afterDefault', 'codex', MINTED.codex).text.includes('Not signed in yet') === false,
      why: String(at('afterDefault', 'codex', MINTED.codex)?.text ?? 'no row').slice(0, 110)
    });
    record(report.hops, 'choosing it a second time was accepted', {
      ok: reading.answers.chooseAgain?.ok === true,
      why: String(reading.answers.chooseAgain?.reason ?? 'ok')
    });
    record(
      report.hops,
      'and it is chosen again, with nothing left to put back',
      gradeRestoredRow(at('afterAgain', 'codex', MINTED.codex))
    );
    record(report.hops, 'the account he left is still in the default store', {
      ok:
        readFileSync(join(defaultCodex, 'auth.json'), 'utf8') === beforeChange.codexText
          ? false
          : true,
      why: 'the default store holds the account the vendor put there'
    });

    // 4. THE BYTES. What is in the login's own directory is what was in the
    //    default store before the change, byte for byte, on disk.
    const loginsRoot = join(profile, 'gmux', 'logins');
    let file = null;
    try {
      const stored = JSON.parse(readFileSync(join(loginsRoot, 'logins.json'), 'utf8'));
      const row = stored.logins.find(
        (l) => l.provider === 'codex' && l.name === MINTED.codex
      );
      file =
        row === undefined
          ? null
          : readFileSync(join(loginsRoot, 'codex', row.id, 'auth.json'), 'utf8');
    } catch {
      file = null;
    }
    record(
      report.bytes,
      'the login Tortie made holds the credential that was in the default store',
      gradeSameBytes(file, beforeChange.codexText)
    );
    // AND THE PERSON'S OWN DEFAULT STORE STILL HOLDS WHAT THE VENDOR PUT THERE.
    record(report.bytes, 'the default store was never written by Tortie', {
      ok:
        readFileSync(join(defaultCodex, 'auth.json'), 'utf8') ===
        codexCredentialText(SENTINEL.codexTwo, ADDRESS.codexTwo),
      why: 'byte for byte what the vendor wrote'
    });
  }

  // -------------------------------------------------------------------------
  // NO TOKEN BYTE, anywhere under the profile this run wrote.
  // -------------------------------------------------------------------------
  const words = Object.values(SENTINEL);
  // THE STORE TORTIE KEEPS ACCOUNTS IN IS WHERE THEY BELONG, and under this
  // harness it is a file under the profile. So are the login directories the
  // credentials were put back into. Everything else under the profile, being
  // the manifest, the logs, the settings and the stored renderer state, must
  // hold none of them.
  const loginsRoot = join(profile, 'gmux', 'logins');
  const allowed = (path) =>
    path.startsWith(join(loginsRoot, 'kept')) ||
    path.startsWith(join(loginsRoot, 'codex')) ||
    path.startsWith(join(loginsRoot, 'claude'));
  let leaked = 0;
  let scanned = 0;
  for (const path of walkFiles(profile)) {
    if (allowed(path)) continue;
    scanned += 1;
    let text = '';
    try {
      text = readFileSync(path, 'latin1');
    } catch {
      continue;
    }
    for (const word of words) {
      if (text.includes(word)) {
        leaked += 1;
        report.sentinels.push({ path: path.slice(profile.length), word });
      }
    }
  }
  record(report.sentinels, 'no token byte anywhere under the profile', {
    ok: leaked === 0,
    why:
      leaked === 0
        ? `${String(scanned)} files scanned outside the credential store and none holds one`
        : `${String(leaked)} file(s) hold one`
  });
  // AND THE RECORD FILE, which is the one Tortie composes itself.
  try {
    const record204 = readFileSync(join(loginsRoot, 'kept.json'), 'utf8');
    record(report.sentinels, 'the record of kept accounts holds no credential', {
      ok: words.every((w) => !record204.includes(w)) && record204.includes('digest'),
      why: `${String(record204.length)} bytes, digests only`
    });
  } catch {
    fail('there is no record of kept accounts at all');
  }
} catch (err) {
  fail(`the run threw: ${String(err && err.message ? err.message : err)}`);
} finally {
  report.credentials.after = credentialHashes();
  const same =
    JSON.stringify(credentialsThatMustNotMove(report.credentials.before)) ===
    JSON.stringify(credentialsThatMustNotMove(report.credentials.after));
  say(`his credentials after: ${JSON.stringify(report.credentials.after)}`);
  if (!same) fail('HIS OWN CREDENTIALS MOVED DURING THIS RUN');
  if (
    report.credentials.before.claudeJsonInformational !==
    report.credentials.after.claudeJsonInformational
  ) {
    say(
      'note: ~/.claude.json moved during the run. It is the vendor own configuration and session state rather than a credential, and the vendor rewrites it while he works.'
    );
  }
  report.ok = report.failures.length === 0;
  writeFileSync(
    join(outDir, 'p204-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8'
  );
  rmSync(harnessDir, { recursive: true, force: true });
  exitCode = report.failures.length === 0 ? 0 : 1;
  say(
    report.failures.length === 0
      ? 'every reading agrees'
      : `${String(report.failures.length)} reading(s) disagree`
  );
}
process.exit(exitCode);
