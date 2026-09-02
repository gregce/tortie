#!/usr/bin/env node
/**
 * probe-p203-account.mjs. Does a login say whose it is, and does a login that
 * has been signed into say so?
 *
 * ## What it proves, in two app runs on one scratch profile
 *
 * The operator reported two things on 2026-09-02. He added a login, completed
 * the vendor's own sign in, and Tortie said `Not signed in yet` for ever; and
 * `Default` was not the account he was signed in as. Both are invisible in a
 * unit test, because both are about what MAIN really answers over real
 * directories and what the app really draws from that answer. So this probe
 * drives the shipped app and reads, in order:
 *
 *  1. THE PER ROW MATRIX. Six fixture logins covering all six shapes a row can
 *     take, being the default and an added login, each signed in with an
 *     address, signed in without one, and not signed in at all. For every one:
 *     what `logins:list` answered, and what the native menu would be handed.
 *  2. THE CARD, opened with a real pointer event, read off the DOM. It must
 *     name the account the numbers came from rather than a login name.
 *  3. THE SETTINGS LIST, in a second run, driven inside the real Settings
 *     window and read off its DOM row by row.
 *  4. NO TOKEN BYTE. Every synthetic credential in this run carries a
 *     sentinel, and the whole profile, every log and every readable file under
 *     it are scanned for those words at the end.
 *
 * ## NOTHING OF THE PERSON IS READ, WRITTEN OR SPENT
 *
 *  - NO KEYCHAIN IS OPENED. `GMUX_USAGE_FIXTURE` refuses the keychain outright
 *    for the meter and, since Phase 203, for the login list as well, so every
 *    presence answer in this run comes from a file this probe wrote.
 *  - NO VENDOR BINARY RUNS and no session is created at all. This probe reads
 *    surfaces; it starts nothing.
 *  - NO REQUEST IS MADE. The usage transport is a file.
 *  - THE PERSON'S OWN THREE CREDENTIAL FILES ARE HASHED before and after and
 *    the two hashes are printed. Nothing else is done with them, ever.
 *  - Both Electrons go through `build/electron-run.mjs`, are never concurrent,
 *    and are ended in its `finally`. The one tmux server is this probe's own
 *    socket, ended in a `finally` with its socket file removed.
 *
 * ## Usage, from the worktree root
 *
 *   npm run probe:p203                          the whole run
 *   node build/probe-p203-account.mjs --self-test   the graders alone, which
 *                                               launches nothing at all
 *
 * ## Environment it reads
 *
 *   P203_OUT_DIR   where the report goes. Default out/p203.
 *
 * Exit 0 when every reading agrees. 1 when one does not. 2 when it refuses.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p203]';
const t0 = Date.now();
const say = (line) => {
  console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1)}s ${line}`);
};

// ---------------------------------------------------------------------------
// THE GRADERS. Pure, and proved on fixtures by --self-test below, because a
// check that cannot fail proves nothing.
// ---------------------------------------------------------------------------

/**
 * Is this login row the one the fixture on disk earns?
 *
 * `want.present` and `want.email` are what the directory this probe wrote
 * really holds, so this compares what main answered against ground truth
 * rather than against what main answered a moment ago.
 */
export function gradeRow(row, want) {
  if (row === undefined || row === null) {
    return { ok: false, why: `no row named ${want.name} at all` };
  }
  const fails = [];
  if (row.present !== want.present) {
    fails.push(`present ${String(row.present)} rather than ${String(want.present)}`);
  }
  if ((row.email ?? null) !== (want.email ?? null)) {
    fails.push(`account ${String(row.email)} rather than ${String(want.email)}`);
  }
  return fails.length === 0
    ? { ok: true, why: `present ${String(row.present)}, account ${String(row.email)}` }
    : { ok: false, why: fails.join(', ') };
}

/** Is this the label and second line the row's account earns? */
export function gradeMenu(item, want) {
  if (item === undefined || item === null) {
    return { ok: false, why: `no menu item for ${want.name}` };
  }
  const label = item.label.replace(/^[✓ ]{2}/, '');
  const fails = [];
  if (label !== want.label) fails.push(`label ${label} rather than ${want.label}`);
  if ((item.sublabel ?? '') !== want.sublabel) {
    fails.push(`second line ${String(item.sublabel)} rather than ${want.sublabel}`);
  }
  return fails.length === 0
    ? { ok: true, why: `${label} over ${String(item.sublabel)}` }
    : { ok: false, why: fails.join(', ') };
}

/** Did any drawn line carry the reserved manifest key as a word? */
export function gradeNoReservedWord(lines) {
  const bad = lines.filter((l) => /(^|[^A-Za-z])Default([^A-Za-z]|$)/.test(l));
  return bad.length === 0
    ? { ok: true, why: `${String(lines.length)} lines and none says the reserved word` }
    : { ok: false, why: `these lines still say it: ${JSON.stringify(bad)}` };
}

/** Does the card name the account rather than a login name? */
export function gradeCard(lines, want) {
  const hit = lines.find((l) => l.startsWith('Login: '));
  if (hit === undefined) {
    return { ok: false, why: `the card drew no login line at all: ${JSON.stringify(lines)}` };
  }
  return hit === `Login: ${want}`
    ? { ok: true, why: hit }
    : { ok: false, why: `the card says ${hit} and the account is ${want}` };
}

// ---------------------------------------------------------------------------
// The self test. It launches nothing at all.
// ---------------------------------------------------------------------------

if (process.argv.includes('--self-test')) {
  const cases = [
    ['a row that agrees', gradeRow({ present: true, email: 'a@b.com' }, { name: 'x', present: true, email: 'a@b.com' }), true],
    ['a row that says not signed in', gradeRow({ present: false, email: null }, { name: 'x', present: true, email: null }), false],
    ['a row with the wrong account', gradeRow({ present: true, email: 'a@b.com' }, { name: 'x', present: true, email: 'c@d.com' }), false],
    ['a missing row', gradeRow(undefined, { name: 'x', present: true, email: null }), false],
    ['a menu item that agrees', gradeMenu({ label: '✓ a@b.com', sublabel: 'Work' }, { name: 'x', label: 'a@b.com', sublabel: 'Work' }), true],
    ['a menu item with no second line wanted', gradeMenu({ label: '  a@b.com' }, { name: 'x', label: 'a@b.com', sublabel: '' }), true],
    ['a menu item still labelled by name', gradeMenu({ label: '  Work', sublabel: 'Work' }, { name: 'x', label: 'a@b.com', sublabel: 'Work' }), false],
    ['lines with no reserved word', gradeNoReservedWord(['a@b.com', 'Your own sign in']), true],
    ['lines that still say it', gradeNoReservedWord(['  Default', 'Your own sign in']), false],
    ['a word that merely contains it', gradeNoReservedWord(['Defaults are fine', 'Undefaulted']), true],
    ['a card naming the account', gradeCard(['Claude', 'Login: a@b.com'], 'a@b.com'), true],
    ['a card naming a login name', gradeCard(['Claude', 'Login: Work'], 'a@b.com'), false],
    ['a card with no login line', gradeCard(['Claude'], 'a@b.com'), false]
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
 * its item roughly hourly, which moves `mdat`, so the two date lines are
 * dropped and what is hashed is the item's identity rather than its clock.
 */
function keychainFingerprint() {
  try {
    const text = execFileSync(
      '/usr/bin/security',
      ['find-generic-password', '-s', 'Claude Code-credentials'],
      { encoding: 'utf8', timeout: 10_000 }
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

function credentialHashes() {
  return {
    claudeKeychainAttributes: keychainFingerprint(),
    claudeCredentialsFile: hashOf(join(homedir(), '.claude', '.credentials.json')),
    codexAuthFile: hashOf(join(homedir(), '.codex', 'auth.json'))
  };
}

const hashesBefore = credentialHashes();
say(`his credentials before: ${JSON.stringify(hashesBefore)}`);

// ---------------------------------------------------------------------------
// The scratch world. Every path below is one this file made.
// ---------------------------------------------------------------------------

const outDir = process.env['P203_OUT_DIR'] ?? join(repoRoot, 'out', 'p203');
mkdirSync(outDir, { recursive: true });

const harnessDir = mkdtempSync(join(tmpdir(), 'p203-'));
const profile = join(harnessDir, 'profile');
const defaultClaude = join(harnessDir, 'default-claude');
const defaultCodex = join(harnessDir, 'default-codex');
const fixturePath = join(harnessDir, 'usage-fixture.json');
/** An empty folder to open as a project, so a dock with a meter in it exists. */
const projectDir = join(harnessDir, 'project');
const SOCKET = 'p203';

/** Values only this probe ever writes. If one appears anywhere, say where. */
const stamp = Date.now().toString(36);
const SENTINEL = {
  claudeDefault: `P203-CLAUDE-DEFAULT-${stamp}`,
  claudeWork: `P203-CLAUDE-WORK-${stamp}`,
  claudeFresh: `P203-CLAUDE-FRESH-${stamp}`,
  codexDefault: `P203-CODEX-DEFAULT-${stamp}`,
  codexSpare: `P203-CODEX-SPARE-${stamp}`
};

/** The addresses the fixture files name. They are example.com and nothing else. */
const ADDRESS = {
  claudeDefault: 'own.claude@example.com',
  claudeWork: 'work.claude@example.com',
  codexDefault: 'own.codex@example.com'
};

function writeJson(path, value, mode = 0o600) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value), { encoding: 'utf8', mode });
}

/** A claude credential, as the vendor writes one into a file. */
function writeClaudeCredential(dir, token) {
  writeJson(join(dir, '.credentials.json'), {
    claudeAiOauth: {
      accessToken: token,
      subscriptionType: 'max',
      expiresAt: Date.now() + 3_600_000
    }
  });
}

/** The vendor's own account record, which is where the address really is. */
function writeClaudeAccount(dir, email) {
  writeJson(
    join(dir, '.claude.json'),
    email === null
      ? { numStartups: 1, installMethod: 'native' }
      : { numStartups: 9, oauthAccount: { emailAddress: email } }
  );
}

/** A codex credential. Its id token is where codex keeps the address. */
function writeCodexCredential(dir, token, email) {
  const claims = { sub: `user-${stamp}`, ...(email === null ? {} : { email }) };
  const payload = Buffer.from(JSON.stringify(claims), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  writeJson(join(dir, 'auth.json'), {
    OPENAI_API_KEY: null,
    tokens: {
      access_token: token,
      account_id: `acct-${stamp}`,
      ...(email === null ? {} : { id_token: `header.${payload}.sig` })
    }
  });
}

// THE DEFAULT LOGIN OF THIS RUN IS A FOLDER THIS FILE MADE. The launch points
// CLAUDE_CONFIG_DIR and CODEX_HOME at these, so nothing under the person's own
// home is the default of the app this probe starts.
writeClaudeCredential(defaultClaude, SENTINEL.claudeDefault);
writeClaudeAccount(defaultClaude, ADDRESS.claudeDefault);
writeCodexCredential(defaultCodex, SENTINEL.codexDefault, ADDRESS.codexDefault);
// AND THE DECOY, planted deliberately. `~/.claude/.claude.json` exists on his
// machine and holds no account, so a reader that composed the default account
// file the way the credential file is composed would find this one and answer
// "not known" for the default login. If the matrix below reads the default
// account as not known, this file is what it found.
writeJson(join(defaultClaude, '.claude', '.claude.json'), { numStartups: 3 });

// The six fixture logins, one per shape a row can take.
const loginsRoot = join(profile, 'gmux', 'logins');
const ID = {
  work: 'a1a1a1a1a1a1a1a1',
  fresh: 'b2b2b2b2b2b2b2b2',
  empty: 'c3c3c3c3c3c3c3c3',
  spare: 'd4d4d4d4d4d4d4d4'
};
const workDir = join(loginsRoot, 'claude', ID.work);
const freshDir = join(loginsRoot, 'claude', ID.fresh);
const emptyDir = join(loginsRoot, 'claude', ID.empty);
const spareDir = join(loginsRoot, 'codex', ID.spare);

writeClaudeCredential(workDir, SENTINEL.claudeWork);
writeClaudeAccount(workDir, ADDRESS.claudeWork);
writeClaudeCredential(freshDir, SENTINEL.claudeFresh);
// A LOGIN THAT HAS TAKEN NO TURN. The vendor wrote the file and it names no
// account yet, which is honest rather than broken.
writeClaudeAccount(freshDir, null);
mkdirSync(emptyDir, { recursive: true, mode: 0o700 });
writeCodexCredential(spareDir, SENTINEL.codexSpare, null);

writeJson(
  join(loginsRoot, 'logins.json'),
  {
    v: 1,
    chosen: {},
    logins: [
      { provider: 'claude', id: ID.work, name: 'Work', createdAt: 1 },
      { provider: 'claude', id: ID.fresh, name: 'Fresh', createdAt: 2 },
      { provider: 'claude', id: ID.empty, name: 'Empty', createdAt: 3 },
      { provider: 'codex', id: ID.spare, name: 'Spare', createdAt: 4 }
    ]
  },
  0o600
);

/** The vendor, as a file, keyed by the bearer the credential reader found. */
function claudeBody(five, week) {
  const iso = (ms) => new Date(Date.now() + ms).toISOString();
  return {
    five_hour: { utilization: five, resets_at: iso(3 * 3_600_000) },
    seven_day: { utilization: week, resets_at: iso(4 * 86_400_000) }
  };
}
function codexBody(plan, five, week) {
  return {
    plan_type: plan,
    rate_limit: {
      primary_window: {
        limit_window_seconds: 604_800,
        used_percent: week,
        reset_after_seconds: 86_400
      },
      secondary_window: {
        limit_window_seconds: 18_000,
        used_percent: five,
        reset_after_seconds: 3_600
      }
    }
  };
}
writeFileSync(
  fixturePath,
  JSON.stringify({
    [SENTINEL.claudeDefault]: { status: 200, body: claudeBody(11, 21) },
    [SENTINEL.codexDefault]: { status: 200, body: codexBody('probeplan', 12, 22) }
  }),
  'utf8'
);

mkdirSync(projectDir, { recursive: true });

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
  matrix: [],
  menu: [],
  card: [],
  settings: [],
  sentinels: [],
  failures: []
};
const fail = (why) => {
  report.failures.push(why);
  say(`FAIL ${why}`);
};
function record(list, name, verdict, extra = {}) {
  list.push({ name, ok: verdict.ok, why: verdict.why, ...extra });
  if (verdict.ok) say(`ok  ${name}: ${verdict.why}`);
  else fail(`${name}: ${verdict.why}`);
}

/** One Electron, driven by one expression, its printed JSON read back. */
function driveWindow({ label, env, shotPath, js, settings = false }) {
  return withElectron(
    {
      label,
      userDataDir: profile,
      cwd: repoRoot,
      env: {
        ...env,
        GMUX_SHOT: shotPath,
        GMUX_SHOT_DELAY_MS: '9000',
        ...(settings
          ? { GMUX_SHOT_SETTINGS: '1', GMUX_SHOT_SETTINGS_JS: js }
          : { GMUX_SHOT_JS: js })
      }
    },
    (handle) =>
      new Promise((done) => {
        let out = '';
        handle.child.stdout.on('data', (c) => {
          out += String(c);
        });
        handle.child.stderr.on('data', (c) => {
          out += String(c);
        });
        handle.child.on('exit', (code) => {
          const marker = settings ? '[gmux-shot] driver' : '[gmux-shot] probe';
          const line = out.split('\n').find((l) => l.includes(marker)) ?? '';
          const payload = line.slice(line.indexOf(marker) + marker.length).trim();
          let parsed = null;
          try {
            parsed = JSON.parse(payload.replace(/^→\s*/, ''));
          } catch {
            parsed = null;
          }
          done({ code, out, payload, parsed });
        });
      })
  );
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

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------

let exitCode = 0;
try {
  // -------------------------------------------------------------------------
  // RUN ONE. The list, the menu and the card, in the app shell.
  // -------------------------------------------------------------------------
  say('run one: the meter card and the login list');
  const one = await driveWindow({
    label: 'p203-card',
    env: launchEnv,
    shotPath: join(outDir, 'p203-card.png'),
    js: `window.__gmuxP203 === undefined ? { trail: ['no drive'] } : window.__gmuxP203.arm(${JSON.stringify(projectDir)})`
  });
  writeFileSync(join(outDir, 'p203-run-one.log'), one.out, 'utf8');
  const reading = one.parsed;
  if (reading === null || !Array.isArray(reading.logins)) {
    fail(`the drive answered nothing readable: ${one.payload.slice(0, 300)}`);
  } else {
    say(`trail: ${JSON.stringify(reading.trail)}`);
    const rowOf = (provider, name) =>
      reading.logins.find((l) => l.provider === provider && l.name === name);
    const itemOf = (provider, name) =>
      reading.menu.find((m) => m.provider === provider && m.id === `login:pick:${name}`);

    // THE SIX SHAPES, against what the directories on disk really hold.
    const WANT = [
      {
        provider: 'claude',
        name: 'Default',
        present: true,
        email: ADDRESS.claudeDefault,
        label: ADDRESS.claudeDefault,
        sublabel: 'Your own sign in',
        note: 'the default login, signed in, account known'
      },
      {
        provider: 'claude',
        name: 'Work',
        present: true,
        email: ADDRESS.claudeWork,
        label: ADDRESS.claudeWork,
        sublabel: 'Work',
        note: 'an added login whose credential is a FILE, account known'
      },
      {
        provider: 'claude',
        name: 'Fresh',
        present: true,
        email: null,
        label: 'Fresh',
        sublabel: 'Account not known yet',
        note: 'signed in, and the vendor names no account yet'
      },
      {
        provider: 'claude',
        name: 'Empty',
        present: false,
        email: null,
        label: 'Empty',
        sublabel: 'Not signed in yet',
        note: 'added and never signed into'
      },
      {
        provider: 'codex',
        name: 'Default',
        present: true,
        email: ADDRESS.codexDefault,
        label: ADDRESS.codexDefault,
        sublabel: 'Your own sign in',
        note: 'CODEX PARITY: the address out of the id token claim'
      },
      {
        provider: 'codex',
        name: 'Spare',
        present: true,
        email: null,
        label: 'Spare',
        sublabel: 'Account not known yet',
        note: 'a codex login whose token carries no address'
      }
    ];
    for (const want of WANT) {
      record(
        report.matrix,
        `${want.provider} ${want.name}: ${want.note}`,
        gradeRow(rowOf(want.provider, want.name), want),
        { provider: want.provider, name: want.name }
      );
      record(
        report.menu,
        `${want.provider} ${want.name} on the menu`,
        gradeMenu(itemOf(want.provider, want.name), want),
        { provider: want.provider, name: want.name }
      );
    }

    // THE RESERVED KEY IS ON NO FACE AND ON EVERY ID.
    record(
      report.menu,
      'the reserved manifest key is on no menu label',
      gradeNoReservedWord(reading.menu.map((m) => `${m.label} ${String(m.sublabel ?? '')}`))
    );
    const ids = reading.menu.map((m) => m.id);
    record(report.menu, 'and it is still the id every pick carries', {
      ok: ids.filter((id) => id === 'login:pick:Default').length === 2,
      why: `${String(ids.filter((id) => id === 'login:pick:Default').length)} of the ids name it`
    });

    // THE CARD. Its login line must name the account.
    record(report.card, 'the card opened under a real pointer', {
      ok: reading.cardOpen === true,
      why: `card open ${String(reading.cardOpen)}, lines ${String(reading.cardText.length)}`
    });
    report.card.push({ name: 'the lines the card drew', ok: true, why: JSON.stringify(reading.cardText) });
    record(
      report.card,
      'the card names the account the numbers came from',
      gradeCard(reading.cardText, ADDRESS.claudeDefault)
    );
    record(
      report.card,
      'and no line on the card says the reserved word',
      gradeNoReservedWord(reading.cardText)
    );
  }

  // -------------------------------------------------------------------------
  // RUN TWO. The Settings list, read off the real Settings window's DOM.
  // -------------------------------------------------------------------------
  say('run two: the Settings list');
  const settingsJs = `(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const rail = Array.from(document.querySelectorAll('button'))
      .find((n) => (n.textContent || '').trim() === 'Agents');
    if (rail === undefined) return JSON.stringify({ error: 'no Agents section on the rail' });
    rail.click();
    await wait(1200);
    const group = document.querySelector('[data-usage-group="1"]');
    if (group === null) return JSON.stringify({ error: 'the usage group never drew' });
    const rows = [];
    for (const block of document.querySelectorAll('[data-logins]')) {
      for (const el of block.querySelectorAll('[data-login]')) {
        rows.push({
          provider: block.getAttribute('data-logins'),
          name: el.getAttribute('data-login'),
          account: el.getAttribute('data-login-account'),
          text: (el.textContent || '').trim(),
          hasRemove: el.querySelector('[data-login-remove]') !== null
        });
      }
    }
    return JSON.stringify({ rows, groupText: (group.textContent || '').trim().slice(0, 1200) });
  })()`;
  const two = await driveWindow({
    label: 'p203-settings',
    env: launchEnv,
    shotPath: join(outDir, 'p203-settings.png'),
    js: settingsJs,
    settings: true
  });
  writeFileSync(join(outDir, 'p203-run-two.log'), two.out, 'utf8');
  const settings = two.parsed;
  if (settings === null || !Array.isArray(settings.rows)) {
    fail(`the Settings drive answered nothing readable: ${two.payload.slice(0, 300)}`);
  } else {
    report.settings.push({
      name: 'the rows the Settings list drew',
      ok: true,
      why: JSON.stringify(settings.rows)
    });
    record(report.settings, 'the Settings list drew all six rows', {
      ok: settings.rows.length === 6,
      why: `${String(settings.rows.length)} rows`
    });
    for (const want of [
      { name: 'Default', provider: 'claude', account: ADDRESS.claudeDefault, leads: ADDRESS.claudeDefault },
      { name: 'Work', provider: 'claude', account: ADDRESS.claudeWork, leads: ADDRESS.claudeWork },
      { name: 'Fresh', provider: 'claude', account: '', leads: 'Fresh' },
      { name: 'Empty', provider: 'claude', account: '', leads: 'Empty' },
      { name: 'Default', provider: 'codex', account: ADDRESS.codexDefault, leads: ADDRESS.codexDefault },
      { name: 'Spare', provider: 'codex', account: '', leads: 'Spare' }
    ]) {
      const row = settings.rows.find(
        (r) => r.provider === want.provider && r.name === want.name
      );
      record(report.settings, `${want.provider} ${want.name} in Settings`, {
        ok: row !== undefined && row.account === want.account && row.text.startsWith(want.leads),
        why:
          row === undefined
            ? 'no row'
            : `account ${row.account} and the row leads with ${row.text.slice(0, 60)}`
      });
    }
    // THE DEFAULT ROW HAS NO REMOVE, which is the surface saying what the code
    // says: it is the person's own and Tortie never touches it.
    record(report.settings, 'no default row offers Remove and every added one does', {
      ok:
        settings.rows.filter((r) => r.name === 'Default').every((r) => !r.hasRemove) &&
        settings.rows.filter((r) => r.name !== 'Default').every((r) => r.hasRemove),
      why: JSON.stringify(settings.rows.map((r) => `${r.name}:${String(r.hasRemove)}`))
    });
    record(
      report.settings,
      'no row in the Settings list says the reserved word',
      gradeNoReservedWord(settings.rows.map((r) => r.text))
    );
  }

  // -------------------------------------------------------------------------
  // NO TOKEN BYTE, anywhere under the profile this run wrote.
  // -------------------------------------------------------------------------
  const words = Object.values(SENTINEL);
  const scanned = [];
  // THE FIXTURE CREDENTIALS THEMSELVES ARE WHERE THE SENTINELS BELONG. This
  // probe wrote them into the login directories on purpose, and they are the
  // vendor's own files as far as the app is concerned. Everything else under
  // the profile, being the manifest, the logs, the settings, the hook files
  // and the stored renderer state, must hold none of them.
  const ownFixtures = new Set([
    join(workDir, '.credentials.json'),
    join(freshDir, '.credentials.json'),
    join(spareDir, 'auth.json')
  ]);
  for (const path of walkFiles(profile)) {
    if (ownFixtures.has(path)) continue;
    let size = 0;
    try {
      size = statSync(path).size;
    } catch {
      continue;
    }
    if (size > 8 * 1024 * 1024) continue;
    let text = '';
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      continue;
    }
    for (const word of words) {
      if (text.includes(word)) scanned.push({ path: path.slice(profile.length), word });
    }
  }
  report.sentinels = scanned;
  record(report.card, 'no synthetic token reached the profile', {
    ok: scanned.length === 0,
    why:
      scanned.length === 0
        ? `${String(walkFiles(profile).length)} files scanned, none holds one`
        : JSON.stringify(scanned)
  });
} finally {
  // THE TMUX SERVER THIS RUN STARTED, ended whatever happened, and its socket
  // file removed. It is this probe's own socket and never the app's.
  try {
    execFileSync('tmux', ['-L', SOCKET, 'kill-server'], { stdio: 'ignore', timeout: 10_000 });
  } catch {
    /* it may never have started, which is the ordinary case here */
  }
  for (const base of [
    join(process.env['TMPDIR'] ?? '/tmp', `tmux-${String(process.getuid?.() ?? 0)}`),
    `/tmp/tmux-${String(process.getuid?.() ?? 0)}`
  ]) {
    try {
      rmSync(join(base, SOCKET), { force: true });
    } catch {
      /* nothing to remove */
    }
  }
  report.credentials.after = credentialHashes();
  say(`his credentials after:  ${JSON.stringify(report.credentials.after)}`);
  const same =
    JSON.stringify(report.credentials.before) === JSON.stringify(report.credentials.after);
  if (!same) fail('HIS OWN CREDENTIALS MOVED DURING THIS RUN');
  exitCode = report.failures.length === 0 ? 0 : 1;
  writeFileSync(
    join(outDir, 'p203-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8'
  );
  say(`report written to ${join(outDir, 'p203-report.json')}`);
  say(
    report.failures.length === 0
      ? 'PASS: every row, every menu item, every card line and every Settings row agrees'
      : `FAIL with ${String(report.failures.length)} finding(s)`
  );
  // The scratch world goes, whatever happened. Nothing of the person's is in
  // it, and nothing of it is left behind.
  try {
    rmSync(harnessDir, { recursive: true, force: true });
  } catch {
    /* a directory already gone */
  }
}

process.exit(exitCode);
