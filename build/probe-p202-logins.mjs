#!/usr/bin/env node
/**
 * probe-p202-logins.mjs. Does a session run under the login a person chose,
 * and does the meter say whose numbers are on the screen?
 *
 * ## What it proves, in TWO app runs on one scratch profile
 *
 * Phase 202 lets a person keep more than one vendor sign in and choose which
 * one their next session launches under. Everything that can go wrong with
 * that is invisible in a screenshot and invisible in a unit test: a pane that
 * carries the wrong directory, a meter drawing one account's numbers under
 * another account's name, a restore that points a new pane at a folder that is
 * gone, a status line post from a session on the other login moving this
 * login's bar. So this probe drives the shipped app and reads, in order:
 *
 *  1. THE MATRIX. Under the default login and then under a second one, per
 *     provider: the pane environment the session actually got, read from
 *     INSIDE the pane; the login name on its manifest row; and the plan the
 *     meter reached, read from the store main answered.
 *  2. WITHIN ONE POLL. After a switch, an ORDINARY read, not the refresh
 *     control, comes back on the new login. An ordinary read is refused by the
 *     fifteen minute interval, so one that answers came back because the login
 *     moved and for no other reason.
 *  3. THE STALE MARK. A switch to a login whose vendor answers with a failure
 *     leaves the previous login's numbers on screen under the stale mark and
 *     never as current, and the card names the new login beside them.
 *  4. THE CARD. Its login line, its control per provider, and the line that
 *     says how many running sessions are on another login.
 *  5. RESTORE, in the second app run, after the tmux server that held the
 *     sessions is gone: the login NAME on the row is resolved again and the
 *     new pane carries the same directory. A RESTORED PANE IS A SHELL, because
 *     that is what Tortie restores into and the person resumes the
 *     conversation there, so that reading is taken by asking the pane itself
 *     for three variables, which is what the operator does by hand, and it is
 *     checked against what tmux was told at the spawn.
 *     Then the login is removed and the next restore falls back to the default
 *     with one sentence.
 *  6. THE ATTACKS. A switch while a launch is in flight; the chosen directory
 *     deleted under a running session; a hand edited store file naming a
 *     directory Tortie does not own; a status line post from the wrong login;
 *     two logins posting at once.
 *  7. NO TOKEN BYTE. Every synthetic credential in this run carries a sentinel
 *     word, and the whole profile, the manifest, the logs, the hook settings
 *     and every pane command line are scanned for those words at the end.
 *
 * ## NOTHING OF THE PERSON IS READ, WRITTEN OR SPENT
 *
 *  - NO VENDOR BINARY RUNS. `claude` and `codex` here are two stub scripts
 *    this file writes, which record the environment their pane really got and
 *    then sleep. No sign in happens, no turn is taken, no token is spent, and
 *    nothing reaches either vendor.
 *  - NO REAL CREDENTIAL IS OPENED. The usage transport is replaced by a file
 *    through `GMUX_USAGE_FIXTURE`, which also refuses the keychain outright,
 *    and the launch points `CLAUDE_CONFIG_DIR` and `CODEX_HOME` at scratch
 *    directories of its own, so the DEFAULT login of this run is a folder this
 *    file made. The probe waits for main to say the fixture is installed
 *    before it arms a meter, and refuses to go on if it never says so.
 *  - THE PERSON'S OWN THREE CREDENTIAL FILES ARE HASHED before and after and
 *    the two hashes are printed. Nothing else is done with them, ever.
 *  - The one tmux server is the scratch socket the harness handed us, ended in
 *    the finally block `build/electron-run.mjs` owns, and both Electrons go
 *    through that helper and are never concurrent.
 *
 * ## Usage, from the worktree root
 *
 *   npm run probe:p202                      the whole run
 *   node build/probe-p202-logins.mjs --self-test    the graders alone, which
 *                                           launches nothing at all
 *
 * ## Environment it reads
 *
 *   P202_OUT_DIR   where the report goes. Default out/p202.
 *   P202_DEADLINE_MS how long one waited for state may take. Default 30000.
 *
 * Exit 0 when every reading agrees. 1 when one does not. 2 when it refuses.
 */

import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { request as httpRequest } from 'node:http';
import { connect as netConnect } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p202]';
const t0 = Date.now();
const say = (line) => {
  console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1)}s ${line}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// THE GRADERS. Pure, and proved on fixtures by --self-test below, because a
// check that cannot fail proves nothing.
// ---------------------------------------------------------------------------

/**
 * Did this pane get the directory its row promised?
 *
 * `pane` is the record the stub wrote from INSIDE the pane, so this compares
 * the process environment a session really has against the directory the
 * chosen login resolves to. An empty want means the vendor's own location,
 * which in this run is the scratch default directory the app itself carries.
 */
export function gradeEnv(pane, name, want) {
  const got = pane === null ? null : (pane[name] ?? '');
  if (pane === null) return { ok: false, got: null, want, why: 'the pane wrote no record at all' };
  if (got !== want) {
    return { ok: false, got, want, why: `the pane carries ${got} and the login resolves to ${want}` };
  }
  return { ok: true, got, want, why: 'the pane carries the login directory' };
}

/** Is this meter row the one the chosen login earns? */
export function gradeMeter(row, want) {
  if (row === undefined || row === null) {
    return { ok: false, why: 'no meter row for that provider at all' };
  }
  const fails = [];
  if (want.login !== undefined && row.login !== want.login) {
    fails.push(`login ${String(row.login)} rather than ${String(want.login)}`);
  }
  if (want.plan !== undefined && row.plan !== want.plan) {
    fails.push(`plan ${String(row.plan)} rather than ${String(want.plan)}`);
  }
  if (want.state !== undefined && row.state !== want.state) {
    fails.push(`state ${String(row.state)} rather than ${String(want.state)}`);
  }
  if (want.fivePercent !== undefined && row.fivePercent !== want.fivePercent) {
    fails.push(`${String(row.fivePercent)}% rather than ${String(want.fivePercent)}%`);
  }
  return { ok: fails.length === 0, why: fails.join(', ') || 'the row is the chosen login answer' };
}

/**
 * Every file under `dir` holding any of these words, with the word found.
 *
 * It is the no token byte proof, and it is a scan over BYTES rather than over
 * a list of files somebody remembered to name: the manifest, its journals, the
 * logs, the hook settings and the logins file all sit under one root.
 */
export function scanForSentinels(dir, words, out = [], skip = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    // A LOGIN DIRECTORY IS WHERE A CREDENTIAL BELONGS, so it is not a leak and
    // it is the one subtree this scan steps over. Everything else under the
    // profile is scanned, which is the manifest, its journals, the logs, the
    // hook settings files and the logins store itself.
    if (skip.some((s) => full === s || full.startsWith(`${s}/`))) continue;
    if (entry.isDirectory()) {
      scanForSentinels(full, words, out, skip);
      continue;
    }
    if (!entry.isFile()) continue;
    let text;
    try {
      if (statSync(full).size > 8 * 1024 * 1024) continue;
      text = readFileSync(full, 'latin1');
    } catch {
      continue;
    }
    for (const word of words) {
      if (text.includes(word)) out.push({ file: full, word });
    }
  }
  return out;
}

/** The two paths a login row could name that Tortie must refuse. */
export function gradeDropped(snapshot, refusedNames) {
  const names = snapshot.logins.map((l) => `${l.provider}:${l.name}`);
  const leaked = refusedNames.filter((n) => names.includes(n));
  return {
    ok: leaked.length === 0 && snapshot.problems.length > 0,
    leaked,
    problems: snapshot.problems.length,
    why:
      leaked.length > 0
        ? `a refused row reached the list: ${leaked.join(', ')}`
        : snapshot.problems.length === 0
          ? 'a row was dropped and nothing said why'
          : 'every refused row was dropped whole and named'
  };
}

// ---------------------------------------------------------------------------
// --self-test. Fixtures, half of which MUST come back red.
// ---------------------------------------------------------------------------

if (process.argv.includes('--self-test')) {
  const scratch = join(tmpdir(), `p202-selftest-${String(process.pid)}`);
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(join(scratch, 'deep'), { recursive: true });
  writeFileSync(join(scratch, 'deep', 'row.json'), '{"t":"P202SENTINELA"}', 'utf8');
  writeFileSync(join(scratch, 'clean.json'), '{"t":"nothing here"}', 'utf8');
  const cases = [
    ['env agrees', () => gradeEnv({ CLAUDE_CONFIG_DIR: '/a/b' }, 'CLAUDE_CONFIG_DIR', '/a/b').ok, true],
    ['env is another login', () => gradeEnv({ CLAUDE_CONFIG_DIR: '/a/c' }, 'CLAUDE_CONFIG_DIR', '/a/b').ok, false],
    ['env is absent where the default is wanted', () => gradeEnv({}, 'CLAUDE_CONFIG_DIR', '').ok, true],
    ['env is set where the default is wanted', () => gradeEnv({ CLAUDE_CONFIG_DIR: '/a/b' }, 'CLAUDE_CONFIG_DIR', '').ok, false],
    ['no record at all', () => gradeEnv(null, 'CLAUDE_CONFIG_DIR', '').ok, false],
    ['meter on the chosen login', () => gradeMeter({ login: 'Work', plan: 'probework', state: 'ok', fivePercent: 33 }, { login: 'Work', plan: 'probework', state: 'ok' }).ok, true],
    ['meter still on the old login', () => gradeMeter({ login: null, plan: 'probedefault', state: 'ok', fivePercent: 11 }, { login: 'Work', plan: 'probework' }).ok, false],
    ['meter drawing the other account numbers', () => gradeMeter({ login: 'Work', plan: 'probework', state: 'ok', fivePercent: 11 }, { login: 'Work', fivePercent: 33 }).ok, false],
    ['a sentinel in a file is found', () => scanForSentinels(scratch, ['P202SENTINELA']).length === 1, true],
    ['a scan of clean bytes finds nothing', () => scanForSentinels(scratch, ['P202SENTINELB']).length === 0, true],
    ['a refused row that reached the list', () => gradeDropped({ logins: [{ provider: 'claude', name: 'Escape' }], problems: ['x'] }, ['claude:Escape']).ok, false],
    ['a refused row dropped with a reason', () => gradeDropped({ logins: [{ provider: 'claude', name: 'Default' }], problems: ['x'] }, ['claude:Escape']).ok, true],
    ['a row dropped in silence', () => gradeDropped({ logins: [], problems: [] }, ['claude:Escape']).ok, false]
  ];
  let bad = 0;
  for (const [name, run, want] of cases) {
    const got = run();
    const ok = got === want;
    if (!ok) bad += 1;
    console.log(`${TAG} ${ok ? 'PASS' : 'FAIL'} ${name}: graded ${got ? 'green' : 'red'}, wanted ${want ? 'green' : 'red'}`);
  }
  rmSync(scratch, { recursive: true, force: true });
  console.log(`${TAG} ${String(cases.length - bad)}/${String(cases.length)} fixtures graded as intended`);
  process.exit(bad === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// The run: refusals first.
// ---------------------------------------------------------------------------

const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness so I get a socket of my ' +
      'own: node build/harness-socket.mjs gmux-p202-logins "node ' +
      'build/probe-p202-logins.mjs"'
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to run on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const deadlineMs = Number(process.env['P202_DEADLINE_MS'] ?? '30000') || 30_000;
const outDir = resolve(repoRoot, (process.env['P202_OUT_DIR'] ?? '').trim() || 'out/p202');
mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------------------
// HIS THREE CREDENTIAL FILES, HASHED. Read only, hashed through shasum in a
// pipe, and the payload never reaches a variable this file holds, a log line
// or the report. An absent file is reported absent, which is its own proof.
// ---------------------------------------------------------------------------

function hashKeychainItem(service) {
  try {
    const out = execFileSync(
      '/bin/sh',
      ['-c', `/usr/bin/security find-generic-password -s ${JSON.stringify(service)} -w 2>/dev/null | /usr/bin/shasum -a 256`],
      { encoding: 'utf8', timeout: 15_000 }
    );
    const hash = out.trim().split(/\s+/)[0] ?? '';
    return hash === '' ? 'unreadable' : hash;
  } catch {
    return 'unreadable';
  }
}

function hashFile(path) {
  if (!existsSync(path)) return 'absent';
  try {
    const out = execFileSync('/usr/bin/shasum', ['-a', '256', path], {
      encoding: 'utf8',
      timeout: 15_000
    });
    return out.trim().split(/\s+/)[0] ?? 'unreadable';
  } catch {
    return 'unreadable';
  }
}

const home = process.env['HOME'] ?? '';
function credentialHashes() {
  return {
    'keychain Claude Code-credentials': hashKeychainItem('Claude Code-credentials'),
    '~/.codex/auth.json': hashFile(join(home, '.codex', 'auth.json')),
    '~/.claude/.credentials.json': hashFile(join(home, '.claude', '.credentials.json'))
  };
}

const hashesBefore = credentialHashes();
for (const [name, hash] of Object.entries(hashesBefore)) {
  say(`credential before: ${name} ${hash}`);
}

// ---------------------------------------------------------------------------
// The scratch world. Everything this run reads and writes is under here.
// ---------------------------------------------------------------------------

const scratchBase = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratchBase, `gmux-p202-logins-${String(process.pid)}`);
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(rawRoot, { recursive: true });
const root = realpathSync(rawRoot);

const project = join(root, 'p202-project');
const profile = join(root, 'profile');
const stubBin = join(root, 'bin');
const paneEnvDir = join(root, 'pane-env');
// The vendor default locations OF THIS RUN. They stand in for `~/.claude` and
// `~/.codex`, which are never opened: the launch carries these two in its own
// environment, so the DEFAULT login of this run is a folder this file made.
const defaultClaude = join(root, 'default-claude');
const defaultCodex = join(root, 'default-codex');
// A directory Tortie does not own, planted beside the logins root, which must
// still be here at the end whatever a hand edited store file names.
const notOurs = join(root, 'not-tortie');
for (const dir of [project, stubBin, paneEnvDir, defaultClaude, defaultCodex, notOurs]) {
  mkdirSync(dir, { recursive: true });
}
writeFileSync(join(project, 'README.md'), '# Phase 202\n', 'utf8');
writeFileSync(join(notOurs, 'keep.txt'), 'this file proves nothing was deleted outside the root\n', 'utf8');

const fixturePath = join(root, 'usage-fixture.json');

/** The four synthetic bearers. Every one of them is scanned for at the end. */
const stamp = randomBytes(4).toString('hex').toUpperCase();
const SENTINEL = {
  claudeDefault: `P202SENTINELCLAUDEDEFAULT${stamp}`,
  claudeWork: `P202SENTINELCLAUDEWORK${stamp}`,
  codexDefault: `P202SENTINELCODEXDEFAULT${stamp}`,
  codexWork: `P202SENTINELCODEXWORK${stamp}`,
  // The credential inside a directory Tortie does not own, reached only by
  // following a link. If this word ever appears in the profile, in a meter row
  // or on a pane, Tortie read a login it does not own.
  claudeLinked: `P202SENTINELCLAUDELINKED${stamp}`
};

function writeClaudeCredential(dir, token, plan) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, '.credentials.json'),
    JSON.stringify({
      claudeAiOauth: {
        accessToken: token,
        subscriptionType: plan,
        expiresAt: Date.now() + 3_600_000
      }
    }),
    { encoding: 'utf8', mode: 0o600 }
  );
}

function writeCodexCredential(dir, token) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'auth.json'),
    JSON.stringify({
      OPENAI_API_KEY: null,
      tokens: { access_token: token, account_id: `acct-${stamp}` }
    }),
    { encoding: 'utf8', mode: 0o600 }
  );
}

writeClaudeCredential(defaultClaude, SENTINEL.claudeDefault, 'probedefault');
writeCodexCredential(defaultCodex, SENTINEL.codexDefault);

/** The vendor, as a file. Keyed by the bearer the credential reader found. */
function claudeBody(fivePct, sevenPct) {
  const iso = (ms) => new Date(Date.now() + ms).toISOString();
  return {
    five_hour: { utilization: fivePct, resets_at: iso(3 * 3600_000) },
    seven_day: { utilization: sevenPct, resets_at: iso(4 * 86_400_000) }
  };
}

function codexBody(plan, fivePct, weekPct) {
  return {
    plan_type: plan,
    rate_limit: {
      primary_window: {
        limit_window_seconds: 604_800,
        used_percent: weekPct,
        reset_after_seconds: 86_400
      },
      secondary_window: {
        limit_window_seconds: 18_000,
        used_percent: fivePct,
        reset_after_seconds: 3_600
      }
    }
  };
}

/** Rewrite the fixture. `over` replaces one row, e.g. to make a vendor fail. */
function writeFixture(over = {}, delayMs = 0) {
  const bag = {
    __delayMs: delayMs,
    [SENTINEL.claudeDefault]: { status: 200, body: claudeBody(11, 21) },
    [SENTINEL.claudeWork]: { status: 200, body: claudeBody(33, 43) },
    [SENTINEL.codexDefault]: { status: 200, body: codexBody('codexdefault', 12, 22) },
    [SENTINEL.codexWork]: { status: 200, body: codexBody('codexwork', 34, 44) },
    ...over
  };
  writeFileSync(fixturePath, JSON.stringify(bag), 'utf8');
}
writeFixture();

/**
 * The two stubs. NO VENDOR BINARY RUNS IN THIS PROBE.
 *
 * Each one records the environment its pane really got, which is the reading
 * the matrix is made of, and then sleeps so the session is a running session.
 * A version or help question is answered and exited, because agent detection
 * asks one and a stub that slept on it would hang the launch.
 */
function writeStub(name) {
  const path = join(stubBin, name);
  const lines = [
    '#!/bin/sh',
    'case " $* " in',
    '  *" --version "*|*" -v "*|*" --help "*) echo "0.0.0-p202-stub"; exit 0;;',
    'esac',
    'id="${GMUX_SESSION_ID:-unknown}"',
    `out="$P202_ENV_DIR/$id.${name}.env"`,
    '{',
    `  echo "agent=${name}"`,
    '  echo "CLAUDE_CONFIG_DIR=${CLAUDE_CONFIG_DIR-}"',
    '  echo "CODEX_HOME=${CODEX_HOME-}"',
    '  echo "GMUX_SESSION_ID=${GMUX_SESSION_ID-}"',
    '  echo "argv=$*"',
    '} > "$out"',
    'exec sleep 100000',
    ''
  ];
  writeFileSync(path, lines.join('\n'), 'utf8');
  chmodSync(path, 0o755);
}
writeStub('claude');
writeStub('codex');

/**
 * A login shell that answers with THIS run's PATH and nothing else.
 *
 * Tortie asks the person's login shell for its PATH and every pane gets that
 * answer, so without this the stubs above would lose to whatever is installed
 * on this Mac. Anything that is not the PATH question is handed to /bin/sh, so
 * this stays a working shell for any other use.
 */
/**
 * The three variables a restored pane is asked to print, and nothing else.
 *
 * It is named one variable at a time on purpose: a `printenv` with no argument
 * would put this process's whole environment into a file, and this process
 * inherits the operator's shell.
 */
const reportEnvScript = join(root, 'report-env.sh');
writeFileSync(
  reportEnvScript,
  [
    '#!/bin/sh',
    'out="$1"',
    '{',
    '  echo "CLAUDE_CONFIG_DIR=${CLAUDE_CONFIG_DIR-}"',
    '  echo "CODEX_HOME=${CODEX_HOME-}"',
    '  echo "GMUX_SESSION_ID=${GMUX_SESSION_ID-}"',
    '} > "$out"',
    ''
  ].join('\n'),
  'utf8'
);
chmodSync(reportEnvScript, 0o755);

const fakeShell = join(root, 'p202-shell');
const stubPath = [stubBin, '/usr/bin', '/bin', '/usr/sbin', '/sbin', '/opt/homebrew/bin', '/usr/local/bin'].join(':');
writeFileSync(
  fakeShell,
  [
    '#!/bin/sh',
    'case "$1" in',
    `  -lic|-lc|-ic) printf "__GMUX_PATH__%s__GMUX_PATH__" ${JSON.stringify(stubPath)}; exit 0;;`,
    'esac',
    'exec /bin/sh "$@"',
    ''
  ].join('\n'),
  'utf8'
);
chmodSync(fakeShell, 0o755);

const launchEnv = {
  ...process.env,
  GMUX_PROBES: '1',
  GMUX_USAGE_FIXTURE: fixturePath,
  P202_ENV_DIR: paneEnvDir,
  CLAUDE_CONFIG_DIR: defaultClaude,
  CODEX_HOME: defaultCodex,
  SHELL: fakeShell,
  PATH: stubPath
};

// ---------------------------------------------------------------------------
// A minimal DevTools protocol client, the same shape the other CDP probes in
// this directory carry, copied rather than shared for the reason p150 states.
// ---------------------------------------------------------------------------

function wsClientFrame(payload) {
  const data = Buffer.from(payload, 'utf8');
  const mask = randomBytes(4);
  let header;
  if (data.length < 126) {
    header = Buffer.from([0x81, 0x80 | data.length]);
  } else if (data.length < 65_536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(data.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(data.length), 2);
  }
  const masked = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 1) masked[i] = data[i] ^ mask[i & 3];
  return Buffer.concat([header, mask, masked]);
}

function wsConnect(url) {
  const m = /^ws:\/\/([^:/]+):(\d+)(\/.*)$/.exec(url);
  if (m === null) throw new Error(`not a ws url: ${url}`);
  return new Promise((resolvePromise, reject) => {
    const sock = netConnect(Number(m[2]), m[1]);
    const key = randomBytes(16).toString('base64');
    let upgraded = false;
    let buf = Buffer.alloc(0);
    let fragments = [];
    const pending = new Map();
    let nextId = 1;
    sock.on('connect', () => {
      sock.write(
        `GET ${m[3]} HTTP/1.1\r\nHost: ${m[1]}:${m[2]}\r\n` +
          'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
          `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
      );
    });
    sock.on('error', (err) => reject(err));
    sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      if (!upgraded) {
        const idx = buf.indexOf('\r\n\r\n');
        if (idx === -1) return;
        const head = buf.subarray(0, idx).toString('utf8');
        buf = buf.subarray(idx + 4);
        if (!/ 101 /.test(head)) {
          reject(new Error(`websocket upgrade refused:\n${head}`));
          sock.destroy();
          return;
        }
        upgraded = true;
        resolvePromise(api);
      }
      for (;;) {
        if (buf.length < 2) return;
        const fin = (buf[0] & 0x80) !== 0;
        const op = buf[0] & 0x0f;
        let len = buf[1] & 0x7f;
        let off = 2;
        if (len === 126) {
          if (buf.length < 4) return;
          len = buf.readUInt16BE(2);
          off = 4;
        } else if (len === 127) {
          if (buf.length < 10) return;
          len = Number(buf.readBigUInt64BE(2));
          off = 10;
        }
        if (buf.length < off + len) return;
        const payload = buf.subarray(off, off + len);
        buf = buf.subarray(off + len);
        if (op === 0x9) {
          const mask = randomBytes(4);
          const masked = Buffer.alloc(payload.length);
          for (let i = 0; i < payload.length; i += 1) masked[i] = payload[i] ^ mask[i & 3];
          sock.write(Buffer.concat([Buffer.from([0x8a, 0x80 | payload.length]), mask, masked]));
          continue;
        }
        if (op !== 0x1 && op !== 0x0) continue;
        fragments.push(payload);
        if (!fin) continue;
        const text = Buffer.concat(fragments).toString('utf8');
        fragments = [];
        let msg;
        try {
          msg = JSON.parse(text);
        } catch {
          continue;
        }
        const waiter = pending.get(msg.id);
        if (waiter !== undefined) {
          pending.delete(msg.id);
          waiter(msg);
        }
      }
    });
    const api = {
      call(method, params, timeoutMs = 30_000) {
        const id = nextId;
        nextId += 1;
        sock.write(wsClientFrame(JSON.stringify({ id, method, params: params ?? {} })));
        return new Promise((res, rej) => {
          pending.set(id, res);
          setTimeout(() => {
            if (pending.has(id)) {
              pending.delete(id);
              rej(new Error(`${method} timed out after ${timeoutMs / 1000} s`));
            }
          }, timeoutMs);
        });
      },
      close() {
        sock.destroy();
      }
    };
  });
}

async function cdpForProfile(profileDir, timeoutMs) {
  const started = Date.now();
  for (;;) {
    try {
      const port = Number(
        readFileSync(join(profileDir, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim()
      );
      if (Number.isFinite(port) && port > 0) {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        const page = list.find((t) => t.type === 'page' && /index\.html/.test(t.url ?? ''));
        if (page !== undefined && page.webSocketDebuggerUrl) {
          const ws = await wsConnect(page.webSocketDebuggerUrl);
          say(`attached to the main window renderer over CDP (port ${port})`);
          return ws;
        }
      }
    } catch {
      // Not up yet. Keep polling.
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(`no DevTools page target within ${timeoutMs / 1000} s`);
    }
    await sleep(500);
  }
}

async function cdpEval(cdp, expression, awaitPromise = true) {
  const reply = await cdp.call('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise
  });
  if (reply.error !== undefined) throw new Error(JSON.stringify(reply.error));
  if (reply.result?.exceptionDetails !== undefined) {
    throw new Error(JSON.stringify(reply.result.exceptionDetails));
  }
  return reply.result?.result?.value ?? null;
}

// ---------------------------------------------------------------------------
// Reading what a pane really got, and what the logins directory really holds.
// ---------------------------------------------------------------------------

function paneRecordPath(sessionId, agent) {
  return join(paneEnvDir, `${sessionId}.${agent}.env`);
}

/** The record the stub wrote from inside the pane, or null. */
function paneRecord(sessionId, agent) {
  const path = paneRecordPath(sessionId, agent);
  if (!existsSync(path)) return null;
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    out[line.slice(0, eq)] = line.slice(eq + 1);
  }
  return out;
}

async function waitForPane(sessionId, agent, ms = deadlineMs) {
  const started = Date.now();
  for (;;) {
    const rec = paneRecord(sessionId, agent);
    if (rec !== null) return rec;
    if (Date.now() - started > ms) return null;
    await sleep(250);
  }
}

const loginsRoot = () => join(profile, 'gmux', 'logins');

/** The one directory Tortie made for this provider, or null. */
function ownedLoginDir(provider) {
  const dir = join(loginsRoot(), provider);
  try {
    const kids = readdirSync(dir).filter((n) => /^[0-9a-f]{16}$/.test(n));
    return kids.length === 1 ? join(dir, kids[0]) : null;
  } catch {
    return null;
  }
}

/**
 * The tmux session name holding this Tortie session, by its immutable id.
 *
 * `@gmux-id` is the session option Tortie stamps and the only honest way to
 * name a live session, which is the rule CLAUDE.md states: address by identity
 * and never by a bare name.
 */
function tmuxSessionNameFor(sessionId) {
  try {
    const out = execFileSync(
      'tmux',
      ['-L', socket, 'list-sessions', '-F', '#{session_name}\t#{@gmux-id}'],
      { encoding: 'utf8', env: { ...process.env, PATH: stubPath } }
    );
    for (const line of out.trim().split('\n')) {
      const [name, id] = line.split('\t');
      if (id === sessionId) return name;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * The pane id of the one pane in that session, or null.
 *
 * A pane id (`%3`) rather than a name, because a session name here is a
 * person's own words and holds spaces, and `-t` reads a name with a space in
 * it as a target it cannot find. The id is unambiguous and it is what tmux
 * itself hands back.
 */
function paneIdFor(sessionId) {
  const name = tmuxSessionNameFor(sessionId);
  if (name === null) return null;
  try {
    const out = execFileSync(
      'tmux',
      ['-L', socket, 'list-panes', '-a', '-F', '#{session_name}\t#{pane_id}'],
      { encoding: 'utf8', env: { ...process.env, PATH: stubPath } }
    );
    for (const line of out.trim().split('\n')) {
      const [paneSession, id] = line.split('\t');
      if (paneSession === name) return id ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * WHAT TORTIE HANDED THE PANE, read out of tmux itself.
 *
 * `new-session -e K=V` sets the session environment and every pane in it is
 * spawned with it, so this is the second source beside the pane's own process:
 * it is what Tortie SAID, and the reading below is what the pane GOT.
 */
function tmuxSessionEnv(sessionId) {
  const name = tmuxSessionNameFor(sessionId);
  if (name === null) return null;
  try {
    const out = execFileSync(
      'tmux',
      ['-L', socket, 'show-environment', '-t', name],
      { encoding: 'utf8', env: { ...process.env, PATH: stubPath } }
    );
    const env = {};
    for (const line of out.trim().split('\n')) {
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      env[line.slice(0, eq)] = line.slice(eq + 1);
    }
    return env;
  } catch {
    return null;
  }
}

/**
 * THE RESTORED PANE'S OWN PROCESS ENVIRONMENT, asked of the pane itself.
 *
 * WHY THERE ARE TWO READERS. A session Tortie CREATES runs the agent in its
 * pane, so the stub records its own environment as it starts and that is the
 * strongest possible reading. A session Tortie RESTORES opens a SHELL in the
 * pane and the person resumes the conversation into it, so there is no agent
 * process to record anything.
 *
 * SO THE PANE IS ASKED, which is exactly what the operator does by hand in the
 * acceptance script: a line is typed into the shell that prints three
 * variables into a file. `ps eww` was tried first and refused: on this macOS
 * it prints no environment for any process, its own included, so it can prove
 * nothing. Nothing else is typed into any pane in this run, and the three
 * variables are named one at a time rather than dumping an environment, so
 * nothing else this process holds can reach that file.
 */
async function restoredPaneEnv(sessionId, ms = deadlineMs) {
  const pane = paneIdFor(sessionId);
  if (pane === null) return null;
  const out = join(paneEnvDir, `${sessionId}.restored.env`);
  rmSync(out, { force: true });
  try {
    // KILL THE LINE FIRST, and this is a real finding rather than a nicety. A
    // restored claude session comes back with its resume command ALREADY
    // TYPED into the shell and not entered, waiting for the person to press
    // return, so a line appended to it runs neither. A codex session whose
    // conversation id was never harvested has an empty line, which is why the
    // two behaved differently before this. `C-u` is what a person would press.
    execFileSync(
      'tmux',
      ['-L', socket, 'send-keys', '-t', pane, 'C-u'],
      { encoding: 'utf8', env: { ...process.env, PATH: stubPath } }
    );
    execFileSync(
      'tmux',
      ['-L', socket, 'send-keys', '-t', pane, `sh ${reportEnvScript} ${out}`, 'Enter'],
      { encoding: 'utf8', env: { ...process.env, PATH: stubPath } }
    );
  } catch {
    return null;
  }
  const started = Date.now();
  for (;;) {
    if (existsSync(out)) {
      const env = {};
      for (const line of readFileSync(out, 'utf8').split('\n')) {
        const eq = line.indexOf('=');
        if (eq < 0) continue;
        env[line.slice(0, eq)] = line.slice(eq + 1);
      }
      if (env.GMUX_SESSION_ID === sessionId) return env;
    }
    if (Date.now() - started > ms) return null;
    await sleep(400);
  }
}

/** Wait for the restored pane to exist, then ask it what it carries. */
async function waitForPaneProcess(sessionId, ms = deadlineMs) {
  const started = Date.now();
  for (;;) {
    if (paneIdFor(sessionId) !== null) {
      const env = await restoredPaneEnv(sessionId, Math.min(ms, 8_000));
      if (env !== null) return env;
    }
    if (Date.now() - started > ms) return null;
    await sleep(500);
  }
}

/** What the scratch server holds right now, for a reading that disagrees. */
function tmuxPanes() {
  try {
    return execFileSync(
      'tmux',
      ['-L', socket, 'list-panes', '-a', '-F', '#{session_name} #{pane_dead} #{pane_start_command}'],
      { encoding: 'utf8', env: { ...process.env, PATH: stubPath } }
    ).trim().split('\n');
  } catch (err) {
    return [`tmux could not be read: ${String(err)}`];
  }
}

/** The loopback port and one session's token, as the status line script reads them. */
function tapAddress(sessionId) {
  const portPath = join(profile, 'gmux', 'hooks', 'port');
  const settings = join(profile, 'gmux', 'hooks', 'claude', `${sessionId}.json`);
  if (!existsSync(portPath) || !existsSync(settings)) return null;
  const port = Number(readFileSync(portPath, 'utf8').trim());
  const token = /\/[hu]\/([0-9a-f]{32})/.exec(readFileSync(settings, 'utf8'))?.[1] ?? null;
  if (!Number.isFinite(port) || token === null) return null;
  return { port, token };
}

/** One status line post, exactly as the managed script sends one. */
function postTap(address, sessionId, configDir, fivePct) {
  const body = [
    'v=1',
    `s=${encodeURIComponent(sessionId)}`,
    `cfg=${Buffer.from(configDir, 'utf8').toString('base64url')}`,
    `five_pct=${String(fivePct)}`,
    `five_reset=${String(Math.floor((Date.now() + 3_600_000) / 1000))}`
  ].join('&');
  return new Promise((res) => {
    const req = httpRequest(
      {
        host: '127.0.0.1',
        port: address.port,
        path: `/u/${address.token}`,
        method: 'POST',
        headers: {
          host: `127.0.0.1:${String(address.port)}`,
          'content-type': 'application/x-www-form-urlencoded',
          'content-length': Buffer.byteLength(body)
        }
      },
      (r) => {
        r.resume();
        r.on('end', () => res(r.statusCode ?? 0));
      }
    );
    req.on('error', () => res(0));
    req.end(body);
  });
}

// ---------------------------------------------------------------------------
// The report.
// ---------------------------------------------------------------------------

const report = {
  socket,
  credentials: { before: hashesBefore, after: null },
  matrix: [],
  dom: [],
  attacks: [],
  restores: [],
  sentinels: [],
  failures: []
};
const fail = (why) => {
  report.failures.push(why);
  say(`FAIL ${why}`);
};
const pass = (what) => say(`ok  ${what}`);

function record(list, name, verdict, extra = {}) {
  list.push({ name, ok: verdict.ok, why: verdict.why, ...extra });
  if (verdict.ok) pass(`${name}: ${verdict.why}`);
  else fail(`${name}: ${verdict.why}`);
}

// ---------------------------------------------------------------------------
// RUN ONE. Everything that happens while the sessions are alive.
// ---------------------------------------------------------------------------

/** Wait until both harness drives are on the window. */
async function armDrives(cdp) {
  for (let waited = 0; waited < 90_000; waited += 500) {
    const ready = await cdpEval(
      cdp,
      "typeof window.__gmuxP202 === 'object' && typeof window.__gmuxP189Open === 'function'",
      false
    );
    if (ready === true) return;
    await sleep(500);
  }
  throw new Error('the Phase 202 drive never armed, so the probe chunk did not load');
}

/**
 * One drive call, with the promise HELD on the window while it runs.
 *
 * `Runtime.evaluate` with `awaitPromise` fails with "Promise was collected"
 * when the page drops its only reference to the promise before it settles,
 * which a long create under garbage collection really does. Assigning it to a
 * property first is the strong reference that cannot be collected, and it
 * costs one property on a window only a harness launch ever has.
 *
 * `slot` exists for the one call that is deliberately left in flight while
 * another one runs, being the switch mid launch, so the two cannot overwrite
 * each other and collect the one still waiting.
 */
const call = (cdp, expr, slot = '__p202keep') =>
  cdpEval(cdp, `(window.${slot} = window.__gmuxP202.${expr})`);

/** The session row with this name, or null. */
function rowNamed(reading, name) {
  return reading.sessions.find((s) => s.name === name) ?? null;
}

/** Create one session and wait for the pane to record its own environment. */
async function startSession(cdp, name, agent, login) {
  const args = login === undefined ? '' : `, ${JSON.stringify(login)}`;
  const made = await call(cdp, `createSession(${JSON.stringify(name)}, ${JSON.stringify(agent)}${args})`);
  if (made !== true) throw new Error(`the create of ${name} was refused`);
  for (let waited = 0; waited < deadlineMs; waited += 250) {
    const reading = await call(cdp, 'read()');
    const row = rowNamed(reading, name);
    if (row !== null) {
      const pane = await waitForPane(row.id, agent, deadlineMs);
      return { row, pane };
    }
    await sleep(250);
  }
  throw new Error(`the session ${name} never appeared in the list`);
}

const meterRow = (reading, provider) => reading.meter.find((m) => m.provider === provider);

const NAMES = {
  claudeDefault: 'claude on default',
  codexDefault: 'codex on default',
  claudeWork: 'claude on work',
  codexWork: 'codex on work',
  claudeKeep: 'claude kept for removal',
  claudeRace: 'claude started mid switch'
};

let ids = {};
let workClaude = null;
let workCodex = null;

await withElectron(
  {
    label: 'p202 logins, run one',
    userDataDir: profile,
    cwd: repoRoot,
    args: [
      '--remote-debugging-port=0',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling'
    ],
    env: launchEnv,
    graceMs: 15_000,
    ceilingMs: 900_000,
    tmuxSocket: socket
  },
  async (handle) => {
    say(`launched the dev app, pid ${String(handle.pid)}`);
    // THE INTERLOCK. Nothing arms a meter until main has said the vendor is a
    // file, because a meter armed before that would ask the person's keychain.
    await handle.waitForLine(/usage fixture installed/, 120_000);
    pass('main installed the usage fixture, so no keychain and no vendor is reachable');
    const cdp = await cdpForProfile(profile, 120_000);
    await armDrives(cdp);
    await cdpEval(cdp, `window.__gmuxP189Open(${JSON.stringify(project)})`);
    await sleep(1500);

    // 1. THE DEFAULT LOGIN, per provider.
    await call(cdp, "setUsageOn('claude', true)");
    await call(cdp, "setUsageOn('codex', true)");
    await call(cdp, 'refreshUsage()');
    let reading = await call(cdp, 'read()');
    record(report.matrix, 'claude meter on the default login', gradeMeter(meterRow(reading, 'claude'), { login: null, plan: 'probedefault', state: 'ok', fivePercent: 11 }));
    record(report.matrix, 'codex meter on the default login', gradeMeter(meterRow(reading, 'codex'), { login: null, plan: 'codexdefault', state: 'ok', fivePercent: 12 }));

    const cd = await startSession(cdp, NAMES.claudeDefault, 'claude');
    ids.claudeDefault = cd.row.id;
    record(report.matrix, 'claude session on the default login', gradeEnv(cd.pane, 'CLAUDE_CONFIG_DIR', defaultClaude), { rowLogin: cd.row.login });
    record(report.matrix, 'claude default row names no login', { ok: cd.row.login === null, why: `the row says ${String(cd.row.login)}` });

    const xd = await startSession(cdp, NAMES.codexDefault, 'codex');
    ids.codexDefault = xd.row.id;
    record(report.matrix, 'codex session on the default login', gradeEnv(xd.pane, 'CODEX_HOME', defaultCodex), { rowLogin: xd.row.login });

    // 2. ADD A LOGIN. It starts nothing and it is empty until the vendor writes.
    const addedClaude = await call(cdp, "addLogin('claude', 'Work')");
    const addedCodex = await call(cdp, "addLogin('codex', 'Work')");
    reading = await call(cdp, 'read()');
    const emptyRow = reading.logins.find((l) => l.provider === 'claude' && l.name === 'Work');
    record(report.matrix, 'a login added is empty until the person signs in', {
      ok: addedClaude === true && addedCodex === true && emptyRow !== undefined && emptyRow.present === false && emptyRow.chosen === false,
      why: emptyRow === undefined ? 'the login was not listed' : `present ${String(emptyRow.present)}, chosen ${String(emptyRow.chosen)}`
    });
    workClaude = ownedLoginDir('claude');
    workCodex = ownedLoginDir('codex');
    record(report.matrix, 'the login directory is one Tortie owns', {
      ok: workClaude !== null && workCodex !== null && workClaude.startsWith(`${loginsRoot()}/claude/`) && workCodex.startsWith(`${loginsRoot()}/codex/`),
      why: `claude ${String(workClaude)}, codex ${String(workCodex)}`
    });

    // The vendor signs in. In this run that is this file writing the shape a
    // sign in leaves behind, because no agent may sign anybody in.
    writeClaudeCredential(workClaude, SENTINEL.claudeWork, 'probework');
    writeCodexCredential(workCodex, SENTINEL.codexWork);
    await call(cdp, 'loadLogins()');
    reading = await call(cdp, 'read()');
    const signedIn = reading.logins.find((l) => l.provider === 'claude' && l.name === 'Work');
    record(report.matrix, 'the login reads as signed in once the file exists', {
      ok: signedIn?.present === true,
      why: `present ${String(signedIn?.present)}`
    });

    // 3. WITHIN ONE POLL. An ORDINARY read, which the fifteen minute interval
    //    would refuse, answers because the login moved.
    await call(cdp, "chooseLogin('claude', 'Work')");
    const polled = await call(cdp, 'pollUsage()');
    record(report.matrix, 'the claude meter follows the chosen login within one poll', gradeMeter(polled.find((p) => p.provider === 'claude'), { login: 'Work', plan: 'probework', state: 'ok', fivePercent: 33 }));

    await call(cdp, "chooseLogin('codex', 'Work')");
    const polledCodex = await call(cdp, 'pollUsage()');
    record(report.matrix, 'the codex meter follows the chosen login within one poll', gradeMeter(polledCodex.find((p) => p.provider === 'codex'), { login: 'Work', plan: 'codexwork', state: 'ok', fivePercent: 34 }));

    // 4. THE STALE MARK. The login moves and the new read cannot answer, so the
    //    previous login's numbers stay under the mark rather than as current.
    writeFixture({ [SENTINEL.claudeDefault]: { status: 500, body: {} } });
    await call(cdp, "chooseLogin('claude', null)");
    const stale = await call(cdp, 'pollUsage()');
    const staleRow = stale.find((p) => p.provider === 'claude');
    record(report.matrix, 'a snapshot from the previous login is marked stale', gradeMeter(staleRow, { login: null, state: 'stale', fivePercent: 33 }));
    writeFixture();
    await call(cdp, "chooseLogin('claude', 'Work')");
    await call(cdp, 'refreshUsage()');
    reading = await call(cdp, 'read()');
    record(report.matrix, 'the next read replaces the stale numbers', gradeMeter(meterRow(reading, 'claude'), { login: 'Work', plan: 'probework', state: 'ok', fivePercent: 33 }));

    // 5. THE SESSIONS ON THE SECOND LOGIN.
    const cw = await startSession(cdp, NAMES.claudeWork, 'claude');
    ids.claudeWork = cw.row.id;
    record(report.matrix, 'claude session on the second login', gradeEnv(cw.pane, 'CLAUDE_CONFIG_DIR', workClaude), { rowLogin: cw.row.login });
    record(report.matrix, 'the row records the login by name', { ok: cw.row.login === 'Work', why: `the row says ${String(cw.row.login)}` });

    const xw = await startSession(cdp, NAMES.codexWork, 'codex');
    ids.codexWork = xw.row.id;
    record(report.matrix, 'codex session on the second login', gradeEnv(xw.pane, 'CODEX_HOME', workCodex), { rowLogin: xw.row.login });

    const keep = await startSession(cdp, NAMES.claudeKeep, 'claude');
    ids.claudeKeep = keep.row.id;

    // 6. THE CARD, read off the DOM.
    const opened = await call(cdp, 'hover()');
    const card = await call(cdp, 'read()');
    report.dom.push({ cardOpen: card.cardOpen, lines: card.cardText, controls: card.cardControls, providers: card.cardControlProviders });
    record(report.dom, 'the card opens and names the login', {
      ok: opened === true && card.cardText.includes('Login: Work'),
      why: `lines ${JSON.stringify(card.cardText)}`
    });
    record(report.dom, 'the card offers a login control per provider', {
      ok: card.cardControls.length === 2 && card.cardControls.every((c) => c === 'Choose login') && card.cardControlProviders.join(',') === 'claude,codex',
      why: `controls ${JSON.stringify(card.cardControls)} for ${JSON.stringify(card.cardControlProviders)}`
    });
    record(report.dom, 'the card says which sessions are on another login', {
      ok: card.cardText.some((l) => /session[s]? on Default/.test(l)),
      why: `lines ${JSON.stringify(card.cardText)}`
    });
    await call(cdp, 'leave()');

    // 7. THE STATUS LINE TAP, on the real route the managed script posts to.
    const workAddress = tapAddress(ids.claudeWork);
    const defaultAddress = tapAddress(ids.claudeDefault);
    if (workAddress === null || defaultAddress === null) {
      fail('the tap: no port file or no session settings file, so no post could be made');
    } else {
      const okStatus = await postTap(workAddress, ids.claudeWork, workClaude, 71);
      await sleep(800);
      reading = await call(cdp, 'read()');
      record(report.attacks, 'a post from the chosen login moves the meter', gradeMeter(meterRow(reading, 'claude'), { fivePercent: 71, login: 'Work' }), { status: okStatus });

      await postTap(defaultAddress, ids.claudeDefault, defaultClaude, 88);
      await sleep(800);
      reading = await call(cdp, 'read()');
      record(report.attacks, 'a post from the other login is dropped', gradeMeter(meterRow(reading, 'claude'), { fivePercent: 71, login: 'Work' }));

      await Promise.all([
        postTap(defaultAddress, ids.claudeDefault, defaultClaude, 55),
        postTap(workAddress, ids.claudeWork, workClaude, 66)
      ]);
      await sleep(1000);
      reading = await call(cdp, 'read()');
      record(report.attacks, 'two logins posting at once, and only the chosen one lands', gradeMeter(meterRow(reading, 'claude'), { fivePercent: 66, login: 'Work' }));
    }

    // 8. ATTACK: a switch while a launch is in flight. The row and the pane
    //    must AGREE, whichever answer the race gave.
    const racing = call(cdp, `createSession(${JSON.stringify(NAMES.claudeRace)}, "claude")`, '__p202race');
    await sleep(60);
    await call(cdp, "chooseLogin('claude', null)");
    await racing;
    let raceRow = null;
    for (let waited = 0; waited < deadlineMs; waited += 250) {
      reading = await call(cdp, 'read()');
      raceRow = rowNamed(reading, NAMES.claudeRace);
      if (raceRow !== null) break;
      await sleep(250);
    }
    const racePane = raceRow === null ? null : await waitForPane(raceRow.id, 'claude', deadlineMs);
    const wantRace = raceRow?.login === 'Work' ? workClaude : defaultClaude;
    record(report.attacks, 'a switch while a launch is in flight leaves the row and the pane agreeing', gradeEnv(racePane, 'CLAUDE_CONFIG_DIR', wantRace), { rowLogin: raceRow?.login ?? null });

    // 9. ATTACK: the chosen directory deleted under a running session.
    await call(cdp, "chooseLogin('claude', 'Work')");
    rmSync(workClaude, { recursive: true, force: true });
    await call(cdp, 'loadLogins()');
    await call(cdp, 'refreshUsage()');
    reading = await call(cdp, 'read()');
    record(report.attacks, 'the chosen directory is gone, so the meter falls back to the default', gradeMeter(meterRow(reading, 'claude'), { login: null, plan: 'probedefault' }));
    const stillThere = paneRecord(ids.claudeWork, 'claude');
    record(report.attacks, 'the running session keeps the login it started with', gradeEnv(stillThere, 'CLAUDE_CONFIG_DIR', workClaude));

    // The vendor signs in again, so the restore arms in run two have a login.
    writeClaudeCredential(workClaude, SENTINEL.claudeWork, 'probework');
    await call(cdp, 'loadLogins()');
    await call(cdp, 'refreshUsage()');
    reading = await call(cdp, 'read()');
    record(report.attacks, 'the directory comes back and so does the chosen login', gradeMeter(meterRow(reading, 'claude'), { login: 'Work', plan: 'probework' }));

    // 10. ATTACK: a hand edited store file naming a directory Tortie does not own.
    const storePath = join(loginsRoot(), 'logins.json');
    const before = readFileSync(storePath, 'utf8');
    const edited = JSON.parse(before);
    edited.logins.push({ provider: 'claude', id: '../../../../tmp', name: 'Escape', createdAt: 1 });
    edited.logins.push({ provider: 'codex', id: notOurs, name: 'Absolute', createdAt: 2 });
    writeFileSync(storePath, JSON.stringify(edited, null, 2), 'utf8');
    await call(cdp, 'loadLogins()');
    const hostile = await call(cdp, 'read()');
    record(report.attacks, 'a row naming a directory Tortie does not own is dropped whole', gradeDropped({ logins: hostile.logins, problems: hostile.problems }, ['claude:Escape', 'codex:Absolute']), { problems: hostile.problems });
    writeFileSync(storePath, before, 'utf8');
    await call(cdp, 'loadLogins()');

    // 10b. ATTACK: a login directory that is a LINK out of the owned root.
    //
    //      THE ONE THE SPELLED SHAPES ABOVE CANNOT EXPRESS, and the one the
    //      Phase 202 verifier found in this same app. `resolve` does not
    //      follow a link, so an entry named by sixteen hex characters that is
    //      really a symlink to any directory on the machine is spelled inside
    //      the root and passed every test there was. It was listed as
    //      present, chosen, put on a pane as `CLAUDE_CONFIG_DIR` and read by
    //      the meter. It is planted here the way it was planted then, being
    //      on disk before Tortie next reads the store, with a credential
    //      inside it carrying a sentinel of its own.
    const linkedTarget = join(notOurs, 'linked-claude');
    writeClaudeCredential(linkedTarget, SENTINEL.claudeLinked, 'probelinked');
    const linkedId = 'dead1234beef5678';
    const linkedPath = join(loginsRoot(), 'claude', linkedId);
    rmSync(linkedPath, { recursive: true, force: true });
    symlinkSync(linkedTarget, linkedPath);
    const linkedStore = JSON.parse(readFileSync(storePath, 'utf8'));
    linkedStore.logins.push({ provider: 'claude', id: linkedId, name: 'Planted', createdAt: 3 });
    linkedStore.chosen = { ...(linkedStore.chosen ?? {}), claude: 'Planted' };
    writeFileSync(storePath, JSON.stringify(linkedStore, null, 2), 'utf8');
    await call(cdp, 'loadLogins()');
    const linked = await call(cdp, 'read()');
    record(report.attacks, 'a login directory that is a link is dropped whole', gradeDropped({ logins: linked.logins, problems: linked.problems }, ['claude:Planted']), { problems: linked.problems });
    const linkedRow = (linked.logins ?? []).find((l) => l.name === 'Planted') ?? null;
    record(report.attacks, 'a linked login is never reported as signed in', {
      ok: linkedRow === null,
      why: linkedRow === null ? 'it is not on the list at all' : `it is listed with present ${String(linkedRow.present)}`
    });
    const linkedChoice = await call(cdp, "chooseLogin('claude', 'Planted')");
    record(report.attacks, 'a linked login cannot be chosen', {
      ok: linkedChoice?.ok !== true,
      why: linkedChoice?.ok === true ? 'the choice was accepted' : `refused: ${String(linkedChoice?.reason ?? 'no such login')}`
    });
    await call(cdp, 'refreshUsage()');
    reading = await call(cdp, 'read()');
    record(report.attacks, 'the meter never reads a credential behind a link', gradeMeter(meterRow(reading, 'claude'), { login: null, plan: 'probedefault' }));
    // AND NOTHING OUTSIDE THE ROOT WAS DELETED by any of those refusals.
    record(report.attacks, 'the directory the link pointed at is untouched', {
      ok: existsSync(join(linkedTarget, '.credentials.json')),
      why: existsSync(join(linkedTarget, '.credentials.json')) ? 'its credential file is still there' : 'A REFUSAL DELETED SOMETHING OUTSIDE THE ROOT'
    });
    rmSync(linkedPath, { force: true });
    writeFileSync(storePath, before, 'utf8');
    await call(cdp, 'loadLogins()');
    await call(cdp, "chooseLogin('claude', 'Work')");

    // 11. NOTHING ON A COMMAND LINE. Every pane the server holds, and the one
    //     variable a login sets, read out of tmux itself as a second source.
    try {
      const panes = execFileSync('tmux', ['-L', socket, 'list-panes', '-a', '-F', '#{session_name}\t#{pane_start_command}'], { encoding: 'utf8', env: { ...process.env, PATH: stubPath } });
      report.attacks.push({ name: 'tmux pane command lines', ok: true, why: `${String(panes.trim().split('\n').length)} panes read` });
      const leaked = Object.values(SENTINEL).filter((word) => panes.includes(word));
      record(report.attacks, 'no synthetic token is on any pane command line', { ok: leaked.length === 0, why: leaked.length === 0 ? 'no argv holds a credential' : `argv holds ${leaked.join(', ')}` });
    } catch (err) {
      say(`note: tmux could not be read for the argv scan (${String(err)})`);
    }
    return 0;
  }
);

say('run one is over, and the tmux server that held its sessions is gone');

// ---------------------------------------------------------------------------
// RUN TWO. Restore, re-resolution by name, and the fallback with its sentence.
// ---------------------------------------------------------------------------

await withElectron(
  {
    label: 'p202 logins, run two',
    userDataDir: profile,
    cwd: repoRoot,
    args: [
      '--remote-debugging-port=0',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling'
    ],
    env: launchEnv,
    graceMs: 15_000,
    ceilingMs: 600_000,
    tmuxSocket: socket
  },
  async (handle) => {
    say(`launched the dev app again, pid ${String(handle.pid)}`);
    await handle.waitForLine(/usage fixture installed/, 120_000);
    const cdp = await cdpForProfile(profile, 120_000);
    await armDrives(cdp);
    await sleep(2500);

    // Every pane record is deleted first, so a record that exists afterwards
    // was written by the RESTORED pane and by nothing else.
    for (const [key, id] of Object.entries(ids)) {
      const agent = key.startsWith('codex') ? 'codex' : 'claude';
      rmSync(paneRecordPath(id, agent), { force: true });
    }

    let reading = await call(cdp, 'read()');
    const rows = Object.fromEntries(reading.sessions.map((s) => [s.id, s]));
    record(report.restores, 'the rows survived the quit with their login names', {
      ok: rows[ids.claudeWork]?.login === 'Work' && rows[ids.claudeDefault]?.login === null,
      why: `the second login row says ${String(rows[ids.claudeWork]?.login)} and the default row says ${String(rows[ids.claudeDefault]?.login)}`
    });

    for (const [key, want, name, second] of [
      ['claudeWork', workClaude, 'CLAUDE_CONFIG_DIR', true],
      ['codexWork', workCodex, 'CODEX_HOME', true],
      ['claudeDefault', defaultClaude, 'CLAUDE_CONFIG_DIR', false]
    ]) {
      const answered = await call(cdp, `restoreSession(${JSON.stringify(ids[key])})`);
      const pane = await waitForPaneProcess(ids[key], deadlineMs);
      const told = tmuxSessionEnv(ids[key]);
      record(report.restores, `restore re-resolves the login by name for ${key}`, gradeEnv(pane, name, want), { restored: answered });
      // WHAT TORTIE SAID, beside what the pane got, and the two differ for the
      // DEFAULT login on purpose. A second login is one variable Tortie sets on
      // the spawn, so tmux was told the directory. The default login is Tortie
      // NOT BEING INVOLVED, so tmux is told nothing at all and the pane carries
      // the vendor's own location because it inherited it. A variable set to a
      // default path would be the difference between those two erased.
      record(
        report.restores,
        `and tmux was told ${second ? 'the same' : 'nothing at all'} for ${key}`,
        gradeEnv(told, name, second ? want : '')
      );
    }

    // The login is removed. Only Tortie's own directory goes.
    await call(cdp, 'clearToasts()');
    const removed = await call(cdp, "removeLogin('claude', 'Work')");
    record(report.restores, 'removing a login deletes only the directory Tortie made', {
      ok: removed === true && !existsSync(workClaude) && existsSync(notOurs) && existsSync(join(notOurs, 'keep.txt')) && existsSync(defaultClaude) && existsSync(join(defaultClaude, '.credentials.json')),
      why: `the login directory ${existsSync(workClaude) ? 'is still there' : 'is gone'}, the planted directory ${existsSync(notOurs) ? 'survived' : 'WAS DELETED'}, the default login ${existsSync(join(defaultClaude, '.credentials.json')) ? 'is untouched' : 'WAS DELETED'}`
    });

    await call(cdp, `restoreSession(${JSON.stringify(ids.claudeKeep)})`);
    const fellBack = await waitForPaneProcess(ids.claudeKeep, deadlineMs);
    record(report.restores, 'a session whose login is gone comes back on the default', gradeEnv(fellBack, 'CLAUDE_CONFIG_DIR', defaultClaude));
    await sleep(1200);
    reading = await call(cdp, 'read()');
    record(report.restores, 'and one sentence says so', {
      ok: reading.toasts.some((t) => /came back on the default login/.test(t)),
      why: `toasts ${JSON.stringify(reading.toasts)}`
    });
    const keptRow = reading.sessions.find((s) => s.id === ids.claudeKeep);
    record(report.restores, 'the row is not rewritten by the fallback', {
      ok: keptRow?.login === 'Work',
      why: `the row says ${String(keptRow?.login)}`
    });

    await call(cdp, 'refreshUsage()');
    reading = await call(cdp, 'read()');
    record(report.restores, 'the meter is back on the default login', gradeMeter(meterRow(reading, 'claude'), { login: null, plan: 'probedefault' }));
    // A reading that disagreed in this run is worth the app's own output, which
    // is the only place a refused restore says why.
    if (report.failures.length > 0) {
      const log = join(outDir, 'p202-run-two.log');
      writeFileSync(log, handle.text(), 'utf8');
      say(`a reading disagreed, so the app own output is at ${log}`);
    }
    return 0;
  }
);

// ---------------------------------------------------------------------------
// NO TOKEN BYTE, and the person's own files, hashed again.
// ---------------------------------------------------------------------------

const hits = scanForSentinels(profile, Object.values(SENTINEL), [], [loginsRoot()]);
// AND THE OTHER HALF OF THE SAME PROOF: the store file that sits AT the logins
// root, which is the one file in that subtree Tortie itself writes, holds names
// and ids and never a credential.
const storeHits = scanForSentinels(loginsRoot(), Object.values(SENTINEL), [], [
  join(loginsRoot(), 'claude'),
  join(loginsRoot(), 'codex')
]);
hits.push(...storeHits);
report.sentinels = hits.map((h) => ({ file: h.file.replace(profile, '<profile>'), word: h.word.slice(0, 12) }));
record(report.attacks, 'no synthetic token reached the profile, the manifest or a log', {
  ok: hits.length === 0,
  why:
    hits.length === 0
      ? `the whole profile was scanned and holds none of the ${String(Object.keys(SENTINEL).length)}`
      : `found in ${hits.map((h) => h.file).join(', ')}`
});

const hashesAfter = credentialHashes();
report.credentials.after = hashesAfter;
for (const [name, hash] of Object.entries(hashesAfter)) {
  const same = hashesBefore[name] === hash;
  say(`credential after:  ${name} ${hash} ${same ? '(identical)' : '(MOVED)'}`);
  if (!same) fail(`${name} is not byte identical: ${hashesBefore[name]} then ${hash}`);
}

writeFileSync(join(outDir, 'p202-logins.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
say(`report written to ${join(outDir, 'p202-logins.json')}`);
if (report.failures.length === 0) {
  say('every reading agrees');
  process.exit(0);
}
say(`${String(report.failures.length)} readings disagree`);
for (const why of report.failures) console.error(`${TAG} FAIL ${why}`);
process.exit(1);
