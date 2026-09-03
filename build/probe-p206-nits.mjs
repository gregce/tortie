#!/usr/bin/env node
/**
 * `npm run probe:p206`. The Phase 206 app run, being ONE launch that reads two
 * of the round's five items off the real DOM.
 *
 * ## What it reads, in one app run on one scratch profile
 *
 *  1. ITEM 1, A LOGIN YOU REMOVE LEAVES NOTHING BEHIND. Over a FIXTURE store
 *     under the probe's own profile, never the person's. The probe adds a
 *     login through the shipped store, plants beside it the exact shape the
 *     Phase 203 verifier found on the operator's disk, being a directory whose
 *     id no row names with a credential file inside it, then presses Remove
 *     through the shipped path. What it reads back: the login list off the
 *     renderer, the rows in `logins.json`, and the directory listing under the
 *     provider root. Nothing of either login may be left.
 *  2. ITEM 3, THE FONT FIELD REFUSES A PLANTED INVISIBLE CHARACTER. The real
 *     Settings window, the real `Custom font family` field, one planted
 *     character per family of the category, typed in and committed the way a
 *     person commits it, and the value read back off the input.
 *
 * ## Nothing of the person is read, written or spent
 *
 *  - NO AGENT RUNS, no session is created, no turn is taken and no token is
 *    spent. The launch points `CLAUDE_CONFIG_DIR` and `CODEX_HOME` at scratch
 *    directories this file made, so the DEFAULT login of this run is a folder
 *    of its own.
 *  - THE KEYCHAIN IS ASKED FOR ATTRIBUTES ONLY, and only about the person's
 *    own item, so the two hashes below can say it did not move. `-g` and `-w`
 *    are never passed, so no password field is ever printed. A delete the
 *    product itself issues can only name a scoped service, being
 *    `Claude Code-credentials-<digest of a directory>`, and every directory in
 *    this run is one this file made.
 *  - THE PERSON'S THREE CREDENTIALS ARE HASHED before and after, and the run
 *    fails if any of them moved.
 *  - ONE ELECTRON, through build/electron-run.mjs, ended in that helper's
 *    `finally` block. The tmux socket is the scratch one the harness handed
 *    us and the helper ends it. Nothing under the person's home is written.
 *
 * ## Usage, from the worktree root
 *
 *   npm run probe:p206
 *   node build/probe-p206-nits.mjs --self-test   the graders alone, which
 *                                                launches nothing at all
 *
 * Exit 0 when every reading agrees, 1 when one does not, 2 when it refuses.
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG = '[p206]';
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

/** Item 1. Nothing of either login is left, in the three places it could be. */
export function gradeRemoval(reading) {
  const left = [];
  if (reading.rowsAfter !== 0) left.push(`${String(reading.rowsAfter)} rows in logins.json`);
  if (reading.dirsAfter.length > 0) left.push(`the folders ${reading.dirsAfter.join(', ')}`);
  const extra = reading.listedAfter.filter((n) => n !== 'Default');
  if (extra.length > 0) left.push(`the listed logins ${extra.join(', ')}`);
  if (left.length > 0) {
    return { ok: false, why: `a removed login left ${left.join('; ')}` };
  }
  if (!reading.strayHeldACredential) {
    return {
      ok: false,
      why: 'the stray held no credential before the remove, so this reading is over an empty world'
    };
  }
  return {
    ok: true,
    why: 'the row, the folder, the planted stray and its credential are all gone'
  };
}

/**
 * Item 3. Every planted character is refused by what Tortie PERSISTED.
 *
 * ## IT GRADES THE PERSISTED FAMILY AND NOT THE FIELD, which is the fix round
 *
 * As first written this read `input.value` and demanded all sixteen say
 * `Menlo`, and it could not pass whatever the sanitizer did. The field is a
 * local draft that resyncs from the persisted family in an effect keyed on it,
 * so once that family is `Menlo` it never changes again and every later row
 * keeps its typed text in the DOM. What Tortie kept is the answer to the
 * question this item asks, and the DOM is carried alongside as a reading
 * rather than as the verdict.
 *
 * ## AND EVERY ROW PROVES ITS OWN COMMIT RAN
 *
 * A grader that only demands `Menlo` passes just as well when nothing was
 * committed at all after the first row, because `Menlo` is what the first row
 * left. So each row commits a family of its own first and reads it back, and a
 * row whose sentinel did not land is a row this probe could not drive rather
 * than a character the sanitizer refused.
 */
export function gradeFont(rows) {
  if (rows.length === 0) return { ok: false, why: 'the field was never driven' };
  const dead = rows.filter((r) => r.sentinelOk !== true);
  if (dead.length > 0) {
    return {
      ok: false,
      why: `${String(dead.length)} of ${String(rows.length)} rows never committed, being ${dead
        .map((r) => r.name)
        .join(', ')}, so nothing under them is a reading about the sanitizer`
    };
  }
  const through = rows.filter((r) => r.after !== 'Menlo');
  if (through.length > 0) {
    return {
      ok: false,
      why: `${String(through.length)} of ${String(rows.length)} planted characters survived, being ${through
        .map((r) => r.name)
        .join(', ')}`
    };
  }
  return {
    ok: true,
    why: `all ${String(rows.length)} planted characters were refused, every row committed a family of its own first, and what Tortie kept reads Menlo`
  };
}

if (process.argv.includes('--self-test')) {
  const cases = [
    [
      'a complete removal',
      () =>
        gradeRemoval({
          rowsAfter: 0,
          dirsAfter: [],
          listedAfter: ['Default'],
          strayHeldACredential: true
        }).ok,
      true
    ],
    [
      'a row left in the file',
      () =>
        gradeRemoval({
          rowsAfter: 1,
          dirsAfter: [],
          listedAfter: ['Default'],
          strayHeldACredential: true
        }).ok,
      false
    ],
    [
      'a folder left on disk',
      () =>
        gradeRemoval({
          rowsAfter: 0,
          dirsAfter: ['3215d54b2ba60318'],
          listedAfter: ['Default'],
          strayHeldACredential: true
        }).ok,
      false
    ],
    [
      'a login still drawn',
      () =>
        gradeRemoval({
          rowsAfter: 0,
          dirsAfter: [],
          listedAfter: ['Default', 'Itavero'],
          strayHeldACredential: true
        }).ok,
      false
    ],
    [
      'a stray that held nothing, so the arm proves nothing',
      () =>
        gradeRemoval({
          rowsAfter: 0,
          dirsAfter: [],
          listedAfter: ['Default'],
          strayHeldACredential: false
        }).ok,
      false
    ],
    [
      'every character refused',
      () => gradeFont([{ name: 'ALM', after: 'Menlo', sentinelOk: true }]).ok,
      true
    ],
    [
      'a row whose own commit never landed',
      () =>
        gradeFont([
          { name: 'ALM', after: 'Menlo', sentinelOk: true },
          { name: 'SHY', after: 'Menlo', sentinelOk: false }
        ]).ok,
      false
    ],
    [
      'one character through',
      () =>
        gradeFont([
          { name: 'ALM', after: 'Menlo', sentinelOk: true },
          { name: 'VS16', after: 'Men️lo', sentinelOk: true }
        ]).ok,
      false
    ],
    ['a field never driven', () => gradeFont([]).ok, false]
  ];
  let bad = 0;
  for (const [name, run, want] of cases) {
    const got = run();
    const ok = got === want;
    if (!ok) bad += 1;
    console.log(
      `${TAG} ${ok ? 'PASS' : 'FAIL'} ${name}: graded ${got ? 'green' : 'red'}, wanted ${want ? 'green' : 'red'}`
    );
  }
  console.log(`${TAG} ${String(cases.length - bad)}/${String(cases.length)} fixtures graded as intended`);
  process.exit(bad === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// The three helpers, imported HERE rather than at the top on purpose:
// build/cdp-target.mjs runs its own fixture proof and exits when `--self-test`
// is on the command line, so a static import would end this file's self test
// before its own graders ever ran.
// ---------------------------------------------------------------------------

const { cdpEval, wsConnect } = await import('./cdp-client.mjs');
const { pickRendererTarget } = await import('./cdp-target.mjs');
const { withElectron } = await import('./electron-run.mjs');

// ---------------------------------------------------------------------------
// Refusals first.
// ---------------------------------------------------------------------------

const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness so I get a socket of my ' +
      'own: node build/harness-socket.mjs gmux-p206 "node build/probe-p206-nits.mjs"'
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to run on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const deadlineMs = Number(process.env['P206_DEADLINE_MS'] ?? '60000') || 60_000;
const outDir = resolve(repoRoot, (process.env['P206_OUT_DIR'] ?? '').trim() || 'out/p206');
mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------------------
// The person's credentials, hashed. ATTRIBUTES ONLY for the keychain item, so
// no password field is ever printed; a write to the item moves its modification
// date, which is inside what is hashed here.
// ---------------------------------------------------------------------------

function hashKeychainAttributes(service) {
  try {
    const out = execFileSync(
      '/bin/sh',
      [
        '-c',
        `/usr/bin/security find-generic-password -s ${JSON.stringify(service)} 2>/dev/null | /usr/bin/shasum -a 256`
      ],
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
const credentialHashes = () => ({
  'keychain Claude Code-credentials, attributes': hashKeychainAttributes(
    'Claude Code-credentials'
  ),
  '~/.codex/auth.json': hashFile(join(home, '.codex', 'auth.json')),
  '~/.claude/.credentials.json': hashFile(join(home, '.claude', '.credentials.json'))
});

const hashesBefore = credentialHashes();
for (const [name, hash] of Object.entries(hashesBefore)) {
  say(`credential before: ${name} ${hash}`);
}

// ---------------------------------------------------------------------------
// The scratch world.
// ---------------------------------------------------------------------------

const scratchBase = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratchBase, `gmux-p206-${String(process.pid)}`);
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(rawRoot, { recursive: true });
const root = realpathSync(rawRoot);

const profile = join(root, 'profile');
const defaultClaude = join(root, 'default-claude');
const defaultCodex = join(root, 'default-codex');
for (const dir of [profile, defaultClaude, defaultCodex]) {
  mkdirSync(dir, { recursive: true });
}

// The field is on screen at boot, which is what lets one drive reach it.
writeFileSync(
  join(profile, 'settings.json'),
  `${JSON.stringify(
    { version: 1, settings: { workAreaFont: 'custom', workAreaFontCustom: '' } },
    null,
    2
  )}\n`,
  'utf8'
);

/** The logins root of THIS RUN, which is the only store this probe touches. */
const loginsRoot = join(profile, 'gmux', 'logins');
const claudeRoot = join(loginsRoot, 'claude');

/** The stray: a directory whose id no row names, holding a credential. */
const STRAY_ID = '3215d54b2ba60318';
const STRAY_TOKEN = 'P206-STRAY-CREDENTIAL-DO-NOT-KEEP';

function loginRows() {
  try {
    const parsed = JSON.parse(readFileSync(join(loginsRoot, 'logins.json'), 'utf8'));
    return Array.isArray(parsed.logins) ? parsed.logins : [];
  } catch {
    return [];
  }
}

function loginDirs() {
  try {
    return readdirSync(claudeRoot).sort();
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// The characters, one per family the two Unicode properties are made of.
// ---------------------------------------------------------------------------

const PLANTED = [
  ['U+061C Arabic letter mark', 0x061c],
  ['U+00AD soft hyphen', 0x00ad],
  ['U+200B zero width space', 0x200b],
  ['U+202E right to left override', 0x202e],
  ['U+2028 line separator', 0x2028],
  ['U+2060 word joiner', 0x2060],
  ['U+0600 Arabic number sign', 0x0600],
  ['U+180E Mongolian vowel separator', 0x180e],
  ['U+3164 Hangul filler', 0x3164],
  ['U+FE0F variation selector sixteen', 0xfe0f],
  ['U+FEFF byte order mark', 0xfeff],
  ['U+FFF9 interlinear annotation anchor', 0xfff9],
  ['U+13430 Egyptian hieroglyph vertical joiner', 0x13430],
  ['U+1D173 musical symbol begin beam', 0x1d173],
  ['U+E0061 tag latin small letter a', 0xe0061],
  ['U+E0100 variation selector seventeen', 0xe0100]
];

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------

const launchEnv = {
  ...process.env,
  GMUX_PROBES: '1',
  CLAUDE_CONFIG_DIR: defaultClaude,
  CODEX_HOME: defaultCodex,
  GMUX_TMUX_SOCKET: socket
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function targetsFor(profileDir) {
  const port = Number(
    readFileSync(join(profileDir, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim()
  );
  if (!Number.isFinite(port) || port <= 0) throw new Error('no devtools port yet');
  return await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
}

/** Attach to the main window, waiting for it. */
async function attachMain(profileDir, timeoutMs) {
  const started = Date.now();
  for (;;) {
    try {
      const picked = pickRendererTarget(await targetsFor(profileDir));
      if (picked.target !== null && picked.target.webSocketDebuggerUrl) {
        return await wsConnect(picked.target.webSocketDebuggerUrl);
      }
    } catch {
      // Not up yet.
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(`no main window target within ${String(timeoutMs / 1000)} s`);
    }
    await sleep(400);
  }
}

/** Attach to the Settings window, which is a second page of its own. */
async function attachSettings(profileDir, timeoutMs) {
  const started = Date.now();
  for (;;) {
    try {
      const listed = await targetsFor(profileDir);
      const page = listed.find(
        (t) =>
          t &&
          t.type === 'page' &&
          /settings\/index\.html/.test(t.url ?? '') &&
          t.webSocketDebuggerUrl
      );
      if (page !== undefined) return await wsConnect(page.webSocketDebuggerUrl);
    } catch {
      // Not up yet.
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(`no Settings window target within ${String(timeoutMs / 1000)} s`);
    }
    await sleep(400);
  }
}

const report = {
  at: new Date().toISOString(),
  credentialsBefore: hashesBefore,
  credentialsAfter: null,
  removal: null,
  font: null
};

await withElectron(
  {
    label: 'p206 nits',
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
    say(`launched the built app, pid ${String(handle.pid)}`);
    const cdp = await attachMain(profile, 120_000);
    say('attached to the main window');
    for (let waited = 0; waited < 90_000; waited += 500) {
      const armed = await cdpEval(cdp, "typeof window.__gmuxP202 === 'object'");
      if (armed === true) break;
      await sleep(500);
    }
    const armed = await cdpEval(cdp, "typeof window.__gmuxP202 === 'object'");
    if (armed !== true) throw new Error('the Phase 202 drive never armed');

    // -----------------------------------------------------------------------
    // ITEM 1. A login the person removes leaves nothing behind.
    // -----------------------------------------------------------------------
    const added = await cdpEval(
      cdp,
      "(window.__p206 = window.__gmuxP202.addLogin('claude', 'Itavero'))"
    );
    if (added !== true) throw new Error('the add of a fixture login was refused');
    const rowsAfterAdd = loginRows();
    say(`the fixture store holds ${String(rowsAfterAdd.length)} row after the add`);

    // THE PLANT, which is the shape the Phase 203 verifier found on his disk:
    // a directory whose id no row names, holding a credential.
    mkdirSync(join(claudeRoot, STRAY_ID), { recursive: true, mode: 0o700 });
    writeFileSync(
      join(claudeRoot, STRAY_ID, '.credentials.json'),
      JSON.stringify({ claudeAiOauth: { accessToken: STRAY_TOKEN } }),
      { encoding: 'utf8', mode: 0o600 }
    );
    const strayHeldACredential = existsSync(
      join(claudeRoot, STRAY_ID, '.credentials.json')
    );
    const dirsBefore = loginDirs();
    say(`before the remove the provider root holds ${dirsBefore.join(', ')}`);

    const removed = await cdpEval(
      cdp,
      "(window.__p206 = window.__gmuxP202.removeLogin('claude', 'Itavero'))"
    );
    if (removed !== true) throw new Error('the remove was refused');
    await cdpEval(cdp, '(window.__p206 = window.__gmuxP202.loadLogins())');
    const reading = await cdpEval(cdp, '(window.__p206 = window.__gmuxP202.read())');
    const listedAfter = (reading?.logins ?? [])
      .filter((l) => l.provider === 'claude')
      .map((l) => l.name);
    report.removal = {
      strayHeldACredential,
      dirsBefore,
      rowsAfterAdd: rowsAfterAdd.length,
      rowsAfter: loginRows().length,
      dirsAfter: loginDirs(),
      listedAfter
    };
    const verdict = gradeRemoval(report.removal);
    if (verdict.ok) pass(`item 1: ${verdict.why}`);
    else fail(`item 1: ${verdict.why}`);
    say(`the login list now draws ${listedAfter.join(', ')}`);

    // -----------------------------------------------------------------------
    // ITEM 3. The font field refuses a planted invisible character.
    // -----------------------------------------------------------------------
    await cdpEval(cdp, '(window.__p206 = window.gmux.openSettings())');
    const settings = await attachSettings(profile, 60_000);
    say('attached to the Settings window');
    const driver = `(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      // THE WINDOW IS ATTACHED TO BEFORE IT HAS DRAWN, so the rail is waited
      // for rather than assumed. The label is matched at the END of the
      // button's text because the button also carries its icon.
      const railFor = () =>
        Array.from(document.querySelectorAll('.set-nav-item, button')).find((n) =>
          (n.textContent || '').trim().endsWith('Appearance')
        );
      let rail = null;
      for (let waited = 0; waited < 30000; waited += 250) {
        rail = railFor();
        if (rail) break;
        await wait(250);
      }
      if (!rail) {
        return {
          error:
            'no Appearance item in the rail; the rail drew ' +
            JSON.stringify(
              Array.from(document.querySelectorAll('.set-nav-item')).map((n) =>
                (n.textContent || '').trim()
              )
            )
        };
      }
      rail.click();
      let input = null;
      for (let waited = 0; waited < 30000; waited += 250) {
        input = document.querySelector('input[aria-label="Custom font family"]');
        if (input) break;
        await wait(250);
      }
      if (!input) return { error: 'no custom font field' };
      const setValue = (el, v) => {
        const desc = Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(el),
          'value'
        );
        desc.set.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      if (!window.gmux || typeof window.gmux.settingsGet !== 'function') {
        return { error: 'the Settings window has no settings bridge to read' };
      }
      const persisted = async () => {
        const s = await window.gmux.settingsGet();
        return s.workAreaFontCustom;
      };
      // COMMITTED THE WAY A PERSON COMMITS IT, being Enter, and the reason it
      // is Enter rather than blur is the fix round's whole finding. React maps
      // the blur handler to the native focusout event, and a Settings window
      // that never took real OS focus was never focused, so input.blur() fired
      // nothing and the commit never ran. The key handler is routed from a
      // dispatched keydown whatever has focus. A focusout is dispatched too,
      // because that is the other way a person leaves the field and a commit
      // that ran twice with the same draft settles on the same value.
      const commit = async () => {
        input.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
        );
        input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
        await wait(350);
      };
      const planted = ${JSON.stringify(PLANTED)};
      const rows = [];
      for (const [i, entry] of planted.entries()) {
        const name = entry[0];
        const cp = entry[1];
        // A DISTINCT FAMILY FIRST, and this is the other half of the finding.
        // The field resyncs from the PERSISTED family in an effect keyed on
        // it, so once the persisted value is Menlo it never changes again
        // and rows two onward keep the typed text in the DOM whatever the
        // sanitizer did. Committing a family of its own between rows makes
        // every row's reading its own, and its own reading back proves the
        // commit path really ran on THIS row rather than on an earlier one.
        input.focus();
        setValue(input, 'Probe' + String(i));
        await commit();
        const sentinel = await persisted();
        input.focus();
        const typed = 'Men' + String.fromCodePoint(cp) + 'lo';
        setValue(input, typed);
        await commit();
        // GRADED ON WHAT WAS PERSISTED, never on what the input still shows.
        // The field is a local draft until a commit lands, so its value is
        // what was typed rather than what Tortie kept.
        const after = await persisted();
        rows.push({
          name,
          cp,
          typedLength: typed.length,
          sentinel,
          sentinelOk: sentinel === 'Probe' + String(i),
          after,
          afterLength: after.length,
          dom: input.value
        });
      }
      return { rows };
    })()`;
    const font = await cdpEval(settings, driver);
    if (font === null || font.error !== undefined) {
      fail(`item 3: the Settings driver said ${String(font && font.error)}`);
      report.font = { rows: [], error: font && font.error };
    } else {
      report.font = font;
      const fontVerdict = gradeFont(font.rows);
      if (fontVerdict.ok) pass(`item 3: ${fontVerdict.why}`);
      else fail(`item 3: ${fontVerdict.why}`);
      for (const row of font.rows) {
        say(
          `field: ${row.name} typed ${String(row.typedLength)} chars, its own family came back ${String(row.sentinelOk === true)}, Tortie kept ${JSON.stringify(row.after)}, the field still shows ${JSON.stringify(row.dom)}`
        );
      }
    }
  }
);

// ---------------------------------------------------------------------------
// After.
// ---------------------------------------------------------------------------

const hashesAfter = credentialHashes();
report.credentialsAfter = hashesAfter;
for (const [name, hash] of Object.entries(hashesAfter)) {
  const before = hashesBefore[name];
  if (before === hash) pass(`credential unmoved: ${name} ${hash}`);
  else fail(`credential MOVED: ${name} was ${before}, is now ${hash}`);
}

// The planted token must not be anywhere in the profile that survived.
let tokenLeft = 0;
const walk = (dir) => {
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.isFile()) {
      try {
        if (readFileSync(path, 'utf8').includes(STRAY_TOKEN)) {
          tokenLeft += 1;
          fail(`the planted credential is still in ${path}`);
        }
      } catch {
        // Not text.
      }
    }
  }
};
walk(profile);
if (tokenLeft === 0) pass('the planted credential is nowhere in the profile');
report.tokenLeft = tokenLeft;

const reportPath = join(outDir, 'p206-report.json');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
say(`wrote ${reportPath}`);
rmSync(root, { recursive: true, force: true });

if (failures > 0) {
  console.error(`${TAG} ${String(failures)} reading(s) disagreed`);
  process.exit(1);
}
say('every reading agreed');
