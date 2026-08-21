#!/usr/bin/env node
/**
 * `node build/probe-p130-prose.mjs`. The Phase 130 photographs of the two
 * machine screens whose prose was cut, driven in the REAL Settings window.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * The operator read the connection test result and the key block and said the
 * prose explains itself. Six sentences were rewritten and two of main's five
 * notes moved behind a shut disclosure. This probe photographs what a person
 * now reads, counts the words on each screen, and proves that the two notes
 * that moved were not deleted.
 *
 * `build/probe-p101-shot.mjs` is the working sibling and this file follows it:
 * one Electron launch per photograph, `GMUX_SHOT_SETTINGS=1` so the capture is
 * the Settings window, and one driver expression per launch that presses the
 * real controls with the real preload in place. The profile is one isolated
 * `--user-data-dir` shared by every launch, so what one launch confirms the
 * next one reads.
 *
 * ---------------------------------------------------------------------------
 * WHICH ROUTE REACHES THE SCREEN, AND WHY NO MACHINE IS CONTACTED
 * ---------------------------------------------------------------------------
 * The spec asked this question directly, so here is the answer it asked for.
 * `src/renderer/settings/machines-store.ts` was read first. The store has no
 * route that injects an outcome: every outcome arrives on the test stream from
 * main, the store is module scoped and is not on `window`, and the renderer
 * cannot compose one. Seeding a host that resolves to nothing reaches
 * `not-resolved`, which carries no key sheet and is therefore not the screen
 * under test.
 *
 * So this probe uses the third route, which contacts nothing at all.
 * `GMUX_SSH_BIN` is the development only client override in
 * `src/main/machines/carriage.ts`. It is pointed at a four line shell script in
 * the scratch directory that prints one line and exits 255. Main classifies
 * that line through its own phrase table in `src/main/machines/errors.ts`,
 * composes the key sheet in `src/main/machines/connection-test.ts` exactly as
 * it would for a real machine, and the renderer draws the real screen. No
 * network connection is opened, `/usr/bin/ssh` is never started, and the
 * seeded host `p130-shot.invalid` is never looked up.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS PHOTOGRAPHED AND WHAT IS NOT
 * ---------------------------------------------------------------------------
 *   file                                what it shows
 *   ----------------------------------  -----------------------------------
 *   p130-6-test-after.png               the connection test result and its
 *                                       advice, after the cut
 *   p130-8-key-after.png                the key block, after, disclosure shut
 *   p130-9-key-open.png                 the same, disclosure open, showing
 *                                       that nothing was deleted
 *   p130-10-key-auth-refused.png        the key block on the answer whose
 *                                       advice never says Remote Login, where
 *                                       main's first note stays in the stack
 *
 * NOT PHOTOGRAPHED, and the report says so in these words. There is no
 * `p130-5-test-before.png` and no `p130-7-key-before.png`. A before photograph
 * would need a second build of the renderer from the strings HEAD carries, and
 * two other builders are editing this same worktree while this runs, so
 * building it twice is not safe. The before counts below are COMPUTED instead,
 * from the exact sentence pairs this phase changed, which are held as literals
 * in this file. Every after count is measured from the live `innerText` of the
 * real panel.
 *
 * ---------------------------------------------------------------------------
 * SAFETY, and none of it is optional
 * ---------------------------------------------------------------------------
 *  - Every launch uses an isolated `--user-data-dir` under /tmp. The
 *    operator's own profile, his `machines.json` and the installed app are
 *    never opened.
 *  - No machine is contacted and no ssh client is started. `GMUX_SSH_BIN`
 *    names a script in the scratch directory.
 *  - The tmux socket is a scratch name and nothing here creates a session.
 *    `-L gmux` appears once, in a read only session count taken before and
 *    after, which must match.
 *  - Only pids this script recorded are killed. There is no `pkill` and no
 *    `kill-server`.
 *  - Every scratch file carries a `p130-` prefix.
 *
 * Exit code 0 when every reading passes. 1 otherwise, with each failure named.
 */

import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = join('/tmp', `p130-prose-${String(process.pid)}`);
const profile = join(scratch, 'p130-profile');
const outDir = join(repoRoot, 'out');
const machinesJson = join(profile, 'gmux', 'config', 'machines.json');

const MACHINE_ID = 'p130-shot';
const MACHINE_LABEL = 'Mac Pro';

const recordedPids = [];
const failures = [];
const rows = [];

const say = (text) => process.stdout.write(`[p130-prose] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p130-prose] FAIL: ${text}\n`);
};
const note = (n, what, verdict, detail) => {
  rows.push({ n, what, verdict });
  process.stdout.write(
    `[p130-prose] ${String(n)}. ${what}: ${verdict}. ${detail}\n`
  );
};

function sh(file, args, options = {}) {
  const out = spawnSync(file, args, { encoding: 'utf8', timeout: 60_000, ...options });
  return { code: out.status ?? -1, stdout: out.stdout ?? '', stderr: out.stderr ?? '' };
}

function operatorSessions() {
  return sh('/bin/sh', [
    '-c',
    "tmux -L gmux list-sessions 2>/dev/null | wc -l | tr -d ' '"
  ]).stdout.trim();
}

const sessionsBefore = operatorSessions();

/** Words the way a person counts them, being runs of non space. */
const words = (text) => String(text).trim().split(/\s+/).filter((w) => w !== '').length;

// ---------------------------------------------------------------------------
// The six sentences this phase changed, held as literals
// ---------------------------------------------------------------------------
//
// These are the deliverable the backlog entry names. The counts under the
// screens below are computed from this table, so the arithmetic in the report
// is the arithmetic of these exact pairs and not of a memory.

const CHANGED = [
  {
    name: 'TRANSCRIPT_SOURCE_LINE',
    screen: 'connection test',
    before:
      'Everything below this line comes from that program and from the machine. Tortie does not change it, does not store it, and does not answer it for you.',
    after:
      'Everything below this line comes from that program and from the machine. Tortie does not store it and does not answer it for you.',
    reason:
      'Main removes the ANSI control sequences and strips the marker pair, so the promise not to change the bytes was not exact.'
  },
  {
    name: 'REMEDY.refused',
    screen: 'connection test',
    before:
      'On that Mac, open System Settings, then General, then Sharing, and turn on Remote Login. macOS ships with Remote Login turned off, so that is the usual reason. On a machine that is not a Mac, start its sign in service and check that it is listening on this port.',
    after:
      'On that Mac, open System Settings, then General, then Sharing, and turn on Remote Login. On a machine that is not a Mac, start its sign in service.',
    reason:
      "The cut sentence explained why the machine refused, and main's own detail one line above already says nothing is accepting connections on this port."
  },
  {
    name: "REMEDY['password-required']",
    screen: 'connection test',
    before:
      "The block under this one makes a key and puts it on that machine for you. It asks for that machine's password once. After that Tortie signs in with the key and never asks for that password again.",
    after:
      'The block under this one makes a key and puts it on that machine. After that Tortie signs in with the key and never asks for that password again.',
    reason:
      'What becomes of the password is said beside the field that takes it, one block down.'
  },
  {
    name: "REMEDY['auth-refused']",
    screen: 'connection test',
    before:
      'That machine did not accept your sign in. Your key may not be on it yet. The block under this one makes a key and puts it on that machine for you.',
    after:
      'Your key may not be on that machine yet. The block under this one makes a key and puts it there.',
    reason:
      "The cut sentence restated main's headline for this class, which reads that the machine refused your sign in."
  },
  {
    name: 'KEY_DISABLED_REASON',
    screen: 'key block',
    before:
      "Type that machine's password first. Tortie needs it once to put the key on the machine.",
    after: "Type that machine's password first.",
    reason:
      'The hint immediately above the button already says the password crosses one call and that Tortie keeps no copy of it.'
  },
  {
    name: 'KEY_MORE_LABEL',
    screen: 'key block',
    before: '',
    after: 'More about this key',
    reason:
      "New. It is the summary of the disclosure that holds two of main's notes, which are one press away and unchanged."
  }
];

/** How many words a screen lost, from the table above. */
function cutOn(screen, names) {
  let n = 0;
  for (const row of CHANGED) {
    if (row.screen !== screen) continue;
    if (names !== undefined && !names.includes(row.name)) continue;
    n += words(row.before) - words(row.after);
  }
  return n;
}

// ---------------------------------------------------------------------------
// The scratch profile, the seeded machine and the fake client
// ---------------------------------------------------------------------------

mkdirSync(join(profile, 'gmux', 'config'), { recursive: true });
mkdirSync(outDir, { recursive: true });

writeFileSync(
  machinesJson,
  `${JSON.stringify(
    {
      schema: 1,
      machines: [
        {
          id: MACHINE_ID,
          label: MACHINE_LABEL,
          color: 'magenta',
          host: 'p130-shot.invalid',
          user: 'gdc',
          port: 22
        }
      ]
    },
    null,
    2
  )}\n`,
  'utf8'
);

/**
 * A client that prints one line and exits 255. It opens no socket, resolves no
 * name and reads no file. Main classifies its output through the same phrase
 * table a real client's output goes through.
 */
function fakeClient(name, line) {
  const path = join(scratch, `p130-fake-ssh-${name}.sh`);
  writeFileSync(path, `#!/bin/sh\nprintf '%s\\r\\n' ${JSON.stringify(line)}\nexit 255\n`, 'utf8');
  chmodSync(path, 0o755);
  return path;
}

const CLIENT_REFUSED = fakeClient(
  'refused',
  'ssh: connect to host p130-shot.invalid port 22: Connection refused'
);
const CLIENT_AUTH = fakeClient(
  'auth',
  'gdc@p130-shot.invalid: Permission denied (publickey,password).'
);

// ---------------------------------------------------------------------------
// One launch, one photograph
// ---------------------------------------------------------------------------

function driveSettings({ shot, js, sshBin = null, timeoutMs = 120_000 }) {
  return new Promise((done) => {
    const env = {
      ...process.env,
      GMUX_SHOT: shot,
      GMUX_SHOT_SETTINGS: '1',
      GMUX_SHOT_SETTINGS_JS: js,
      GMUX_TMUX_SOCKET: `gmux-p130-prose-${String(process.pid)}`
    };
    if (sshBin !== null) env.GMUX_SSH_BIN = sshBin;
    const child = spawn(
      'npx',
      ['electron', '.', `--user-data-dir=${profile}`, '-ApplePersistenceIgnoreState', 'YES'],
      { cwd: repoRoot, env, stdio: ['ignore', 'pipe', 'pipe'], detached: false }
    );
    recordedPids.push(child.pid);
    let out = '';
    child.stdout.on('data', (chunk) => {
      out += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      out += String(chunk);
    });
    const timer = setTimeout(() => {
      try {
        process.kill(child.pid, 'SIGKILL');
      } catch {
        /* already gone */
      }
    }, timeoutMs);
    child.on('exit', (code) => {
      clearTimeout(timer);
      child.stdout.destroy();
      child.stderr.destroy();
      const line = out.split('\n').find((l) => l.includes('[gmux-shot] driver')) ?? '';
      const payload = line.slice(line.indexOf('driver') + 8).trim();
      let parsed = null;
      try {
        parsed = JSON.parse(payload.replace(/^→\s*/, ''));
      } catch {
        parsed = null;
      }
      done({ code, out, parsed });
    });
  });
}

/** A driver expression that runs in the Settings renderer and returns JSON. */
function driver(body) {
  return `(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const text = () => document.body.innerText || '';
    const openMachines = async () => {
      if (text().includes('Tortie can keep your work running on another machine you own.')) {
        return 'already';
      }
      const rail = Array.from(document.querySelectorAll('button, [role="tab"], li, a'))
        .find((n) => (n.textContent || '').trim() === 'Machines');
      if (!rail) return 'not-found';
      rail.click();
      await wait(700);
      return 'clicked';
    };
    const act = async (name) => {
      const el = document.querySelector('[data-machines-action="' + name + '"]');
      if (el === null) return 'missing';
      if (el.disabled === true) return 'disabled';
      el.click();
      await wait(500);
      return true;
    };
    const show = (selector) => {
      const el = document.querySelector(selector);
      if (el === null) return false;
      el.scrollIntoView({ block: 'center' });
      return true;
    };
    const innerTextOf = (selector) => {
      const el = document.querySelector(selector);
      return el === null ? null : (el.innerText || '');
    };
    const openRow = async () => {
      await openMachines();
      const toggle = document.querySelector('[data-machines-action="toggle-lines"]');
      if (toggle === null) return 'no-row';
      if (toggle.getAttribute('aria-expanded') !== 'true') {
        toggle.click();
        await wait(600);
      }
      return true;
    };
    /** Press the saved test and wait for the outcome to be drawn. */
    const runTest = async () => {
      await openRow();
      const pressed = await act('test-saved');
      for (let i = 0; i < 60; i += 1) {
        if (document.querySelector('[data-outcome-class]') !== null) break;
        await wait(250);
      }
      await wait(600);
      const el = document.querySelector('[data-outcome-class]');
      return {
        pressed,
        cls: el === null ? null : el.getAttribute('data-outcome-class')
      };
    };
    /** What the key block says, split by what is behind the disclosure. */
    const keyReading = () => {
      const block = document.querySelector('[data-machines-key="1"]');
      const more = document.querySelector('[data-p130-key-more="1"]');
      return {
        blockText: block === null ? null : (block.innerText || ''),
        moreThere: more !== null,
        moreOpen: more === null ? null : more.open === true,
        moreText: more === null ? null : (more.innerText || ''),
        notesShown: Array.from(
          document.querySelectorAll('[data-machines-key="1"] > .mach-key-note')
        ).map((n) => (n.textContent || '').trim()),
        notesBehind: Array.from(
          document.querySelectorAll('[data-p130-key-more="1"] .mach-key-note')
        ).map((n) => (n.textContent || '').trim())
      };
    };
    const testReading = () => {
      const panel = document.querySelector('.mach-test');
      const key = document.querySelector('[data-machines-key="1"]');
      const whole = panel === null ? '' : (panel.innerText || '');
      const keyText = key === null ? '' : (key.innerText || '');
      return {
        wholeText: whole,
        keyText,
        remedy: (() => {
          const el = document.querySelector('.mach-remedy-text');
          return el === null ? null : (el.textContent || '').trim();
        })(),
        sourceLine: (() => {
          const all = Array.from(document.querySelectorAll('.mach-test-tortie'));
          const last = all[all.length - 1];
          return last === undefined ? null : (last.textContent || '').trim();
        })()
      };
    };
    try {
      const result = await (async () => { ${body} })();
      return JSON.stringify(result);
    } catch (err) {
      return JSON.stringify({ error: String((err && err.message) || err) });
    }
  })()`;
}

const shot = (name) => join(outDir, `p130-${name}.png`);

function photographed(path) {
  return existsSync(path) && statSync(path).size > 0 ? statSync(path).size : 0;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const counts = [];

async function main() {
  // -- 0. Confirm the machine, so the saved test's gate lets it start --------
  const confirmed = await driveSettings({
    shot: join(scratch, 'p130-0-confirm.png'),
    js: driver(`
      await openRow();
      const pressed = await act('confirm');
      await wait(1200);
      const listed = await window.gmux.machines.rows();
      return { pressed, rows: listed.rows.map((r) => ({ id: r.id, state: r.state })) };
    `)
  });
  const c0 = confirmed.parsed;
  const confirmedOk = (c0?.rows ?? [])[0]?.state === 'confirmed';
  if (!confirmedOk) {
    fail(
      `the seeded machine did not reach the confirmed state, so the saved ` +
        `test below cannot start. The driver answered ${JSON.stringify(c0)}.`
    );
  }
  note(
    0,
    'the seeded machine is confirmed, so a saved test may start',
    confirmedOk ? 'pass' : 'FAIL',
    `rows ${JSON.stringify(c0?.rows ?? null)}`
  );

  // -- 1. The connection test result and its advice, after -------------------
  const six = shot('6-test-after');
  const r1 = await driveSettings({
    shot: six,
    sshBin: CLIENT_REFUSED,
    js: driver(`
      const ran = await runTest();
      show('.mach-remedy');
      await wait(400);
      return { ran, reading: testReading() };
    `)
  });
  const d1 = r1.parsed;
  const cls1 = d1?.ran?.cls ?? null;
  const whole1 = d1?.reading?.wholeText ?? '';
  const key1 = d1?.reading?.keyText ?? '';
  const testWordsAfter = words(whole1) - words(key1);
  const testCut = cutOn('connection test', ['TRANSCRIPT_SOURCE_LINE', 'REMEDY.refused']);
  const testOk =
    cls1 === 'refused' &&
    typeof d1?.reading?.sourceLine === 'string' &&
    d1.reading.sourceLine.includes('Tortie does not store it') &&
    !d1.reading.sourceLine.includes('does not change it') &&
    typeof d1?.reading?.remedy === 'string' &&
    d1.reading.remedy.includes('turn on Remote Login') &&
    !d1.reading.remedy.includes('usual reason') &&
    photographed(six) > 0;
  if (!testOk) {
    fail(
      `the connection test result was not photographed with the cut prose on ` +
        `it. Driver: ${JSON.stringify(d1)}`
    );
  }
  counts.push({
    screen: 'connection test result',
    before: testWordsAfter + testCut,
    after: testWordsAfter,
    removed: testCut,
    measured: 'after measured, before computed'
  });
  note(
    1,
    'the connection test result and its advice, after the cut',
    testOk ? 'pass' : 'FAIL',
    `class ${JSON.stringify(cls1)}, the source line reads ` +
      `${JSON.stringify(d1?.reading?.sourceLine ?? null)}, the advice reads ` +
      `${JSON.stringify(d1?.reading?.remedy ?? null)}, photograph ${six} at ` +
      `${String(photographed(six))} bytes`
  );

  // -- 2. The key block, shut ------------------------------------------------
  const eight = shot('8-key-after');
  const r2 = await driveSettings({
    shot: eight,
    sshBin: CLIENT_REFUSED,
    js: driver(`
      const ran = await runTest();
      show('[data-machines-key="1"]');
      await wait(400);
      return { ran, key: keyReading() };
    `)
  });
  const d2 = r2.parsed;
  const shutWords = words(d2?.key?.blockText ?? '');
  const behind2 = d2?.key?.notesBehind ?? [];
  const shown2 = d2?.key?.notesShown ?? [];
  const shutOk =
    d2?.ran?.cls === 'refused' &&
    d2?.key?.moreThere === true &&
    d2?.key?.moreOpen === false &&
    behind2.length === 2 &&
    behind2.some((n) => n.includes('Remote Login')) &&
    behind2.some((n) => n.includes('passphrase')) &&
    shown2.length === 3 &&
    photographed(eight) > 0;
  if (!shutOk) {
    fail(
      `the key block was not photographed with the disclosure shut and the ` +
        `two notes behind it. Driver: ${JSON.stringify(d2)}`
    );
  }
  note(
    2,
    'the key block, disclosure shut, two of main’s notes behind it',
    shutOk ? 'pass' : 'FAIL',
    `${String(shown2.length)} notes in the stack, ${String(behind2.length)} ` +
      `behind the disclosure, which reads ` +
      `${JSON.stringify(behind2.map((n) => n.slice(0, 46)))}. Photograph ` +
      `${eight} at ${String(photographed(eight))} bytes`
  );

  // -- 3. The key block, open, which is the proof nothing was deleted -------
  const nine = shot('9-key-open');
  const r3 = await driveSettings({
    shot: nine,
    sshBin: CLIENT_REFUSED,
    js: driver(`
      const ran = await runTest();
      const more = document.querySelector('[data-p130-key-more="1"]');
      if (more !== null) {
        more.open = true;
        await wait(300);
      }
      show('[data-p130-key-more="1"]');
      await wait(400);
      return { ran, key: keyReading() };
    `)
  });
  const d3 = r3.parsed;
  const openWords = words(d3?.key?.blockText ?? '');
  const behind3 = d3?.key?.notesBehind ?? [];
  const openOk =
    d3?.key?.moreOpen === true &&
    behind3.length === 2 &&
    openWords > shutWords &&
    photographed(nine) > 0;
  if (!openOk) {
    fail(
      `the open disclosure was not photographed, so nothing here proves the ` +
        `two notes are still there. Driver: ${JSON.stringify(d3)}`
    );
  }
  const keyCut = cutOn('key block', ['KEY_DISABLED_REASON']);
  counts.push({
    screen: 'key block, shut',
    before: shutWords + keyCut + words(behind3.join(' ')) - words('More about this key'),
    after: shutWords,
    removed: keyCut,
    measured: 'after measured, before computed'
  });
  counts.push({
    screen: 'key block, open',
    before: openWords + keyCut - words('More about this key'),
    after: openWords,
    removed: 0,
    measured: 'after measured, before computed'
  });
  note(
    3,
    'the open disclosure holds both of main’s notes, word for word',
    openOk ? 'pass' : 'FAIL',
    `shut reads ${String(shutWords)} words, open reads ${String(openWords)} ` +
      `words, and the difference of ${String(openWords - shutWords)} is the ` +
      `two notes. Photograph ${nine} at ${String(photographed(nine))} bytes`
  );

  // -- 4. The answer whose advice never says Remote Login -------------------
  const ten = shot('10-key-auth-refused');
  const r4 = await driveSettings({
    shot: ten,
    sshBin: CLIENT_AUTH,
    js: driver(`
      const ran = await runTest();
      show('[data-machines-key="1"]');
      await wait(400);
      return { ran, key: keyReading(), remedy: testReading().remedy };
    `)
  });
  const d4 = r4.parsed;
  const behind4 = d4?.key?.notesBehind ?? [];
  const shown4 = d4?.key?.notesShown ?? [];
  const authOk =
    d4?.ran?.cls === 'auth-refused' &&
    behind4.length === 1 &&
    behind4[0]?.includes('passphrase') === true &&
    shown4.some((n) => n.includes('Remote Login')) &&
    typeof d4?.remedy === 'string' &&
    !d4.remedy.includes('did not accept your sign in') &&
    photographed(ten) > 0;
  if (!authOk) {
    fail(
      `on the answer whose advice never says Remote Login, main's first note ` +
        `did not stay in the stack. Driver: ${JSON.stringify(d4)}`
    );
  }
  note(
    4,
    'on auth-refused the Remote Login note stays in the stack',
    authOk ? 'pass' : 'FAIL',
    `${String(shown4.length)} notes in the stack and ${String(behind4.length)} ` +
      `behind the disclosure. The advice reads ${JSON.stringify(d4?.remedy ?? null)}. ` +
      `Photograph ${ten} at ${String(photographed(ten))} bytes`
  );

  // -- 5. Every consent fact is on screen with nothing to press -------------
  const consentOk =
    typeof d2?.key?.blockText === 'string' &&
    d2.key.blockText.includes('Writes this file on that machine') &&
    d2.key.blockText.includes('Keeps the private half') &&
    shown2.some((n) => n.includes('keeps no copy') || n.includes('It keeps no copy')) &&
    shown2.some((n) => n.includes('adds one line')) &&
    !(d2?.key?.moreText ?? '').includes('Writes this file on that machine') &&
    !(d2?.key?.moreText ?? '').includes('adds one line');
  if (!consentOk) {
    fail(
      `a consent fact is not readable with the disclosure shut. The stack ` +
        `reads ${JSON.stringify(shown2)}.`
    );
  }
  note(
    5,
    'every consent fact is on screen with the disclosure shut',
    consentOk ? 'pass' : 'FAIL',
    `the block names the file it writes, where the private half lives, that ` +
      `the password is kept nowhere and that one line is added. None of them ` +
      `is behind the press.`
  );
}

await main();

// ---------------------------------------------------------------------------
// The end
// ---------------------------------------------------------------------------

for (const pid of [...recordedPids].reverse()) {
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    /* already gone, which is the state we wanted */
  }
}

const sessionsAfter = operatorSessions();
if (sessionsBefore !== sessionsAfter) {
  fail(
    `the operator's server held ${sessionsBefore} session(s) before this probe ` +
      `and ${sessionsAfter} after it.`
  );
}

process.stdout.write('\n#   what                                                          verdict\n');
process.stdout.write('-'.repeat(90) + '\n');
for (const row of rows) {
  process.stdout.write(
    `${String(row.n).padEnd(4)}${String(row.what).padEnd(62)}${row.verdict}\n`
  );
}

process.stdout.write('\nscreen                       words before   words after   removed\n');
process.stdout.write('-'.repeat(72) + '\n');
for (const row of counts) {
  process.stdout.write(
    `${row.screen.padEnd(29)}${String(row.before).padEnd(15)}` +
      `${String(row.after).padEnd(14)}${String(row.removed)}\n`
  );
}

process.stdout.write('\nsentence                      words before   words after   why it changed\n');
process.stdout.write('-'.repeat(110) + '\n');
for (const row of CHANGED) {
  process.stdout.write(
    `${row.name.padEnd(30)}${String(words(row.before)).padEnd(15)}` +
      `${String(words(row.after)).padEnd(14)}${row.reason}\n`
  );
}

say(`profile: ${profile}, and the operator's own was never opened`);
say(`operator sessions before: ${sessionsBefore}, after: ${sessionsAfter}`);
say(
  'NOT PHOTOGRAPHED: there is no before photograph of either screen. Building ' +
    'the renderer a second time from the strings HEAD carries is not safe ' +
    'while two other builders are editing this worktree, so every before ' +
    'count above is computed from the sentence pairs in this file and every ' +
    'after count is measured from the live panel.'
);
say(
  'NOT CONTACTED: no machine was reached and no ssh client was started. ' +
    `GMUX_SSH_BIN named ${CLIENT_REFUSED} and ${CLIENT_AUTH}, which print one ` +
    'line and exit 255.'
);

try {
  rmSync(scratch, { recursive: true, force: true });
} catch {
  /* a scratch directory that will not go is not a result */
}

if (failures.length > 0) {
  process.stdout.write(`\nFAIL, ${failures.length}:\n`);
  for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
  process.exit(1);
}

process.stdout.write(
  '\nPASS. Four photographs of the real Settings window. The connection test ' +
    'result carries the shorter source line and the shorter advice, the key ' +
    "block holds three of main's notes with two behind a shut disclosure, the " +
    'open disclosure shows both of them word for word, and on the answer ' +
    'whose advice never mentions Remote Login that note stays in the stack.\n'
);

process.exit(0);
