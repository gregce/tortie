#!/usr/bin/env node
/**
 * probe-p243-durable.mjs. THE PHASE 243 APP RUN.
 *
 * TWO Electrons, one after the other and NEVER at once, on ONE scratch
 * profile with a scratch HOME and this script's own tmux socket. It spawns no
 * agent, spends no token, opens no keychain, makes no request and reads
 * nothing under the person's home: the repository it opens is one it builds
 * itself, and the "agent" that writes to a file from outside is a plain
 * `/bin/sh` running `cat`, which is the charter's own wording.
 *
 * ## WHAT IT PROVES, and why it has to be a run
 *
 * Phase 238 shipped the accept and measured its own limit: what a person
 * accepts lasts AS LONG AS THE TAB IS OPEN, and dies on a quit, a crash, a
 * window reload, or once ten other files have been opened for keeps. This
 * phase records the baseline, and the only way to show that the marking
 * outlives the tab is to end the app and start it again.
 *
 * So the drive is the FOUR ACTS Phase 238's measure step used, in order, with
 * the second launch reading the same tab back:
 *
 *   A1   a committed prose file, opened as Redline: the baseline is the last
 *        commit, and the face says the marking lasts until this file's last
 *        commit moves rather than as long as the tab is open
 *   A2   a shell writes the file from outside: the changes are drawn
 *   A3   two changes accepted with the real chords, and the file on disk is
 *        UNCHANGED BY DIGEST across both of them (research 83 B.5)
 *   A4   the store holds ONE record for that file, and it names the accept
 *   ---- the app is ended, SIGTERM first, by build/electron-run.mjs's own
 *        teardown, which is how every harness launch ends ----
 *   B1   ACT ONE, THE QUIT. The same file, opened in a new process: the
 *        baseline is the bytes accepted in the last one, the picture holds
 *        the same changes, and the file on disk is still unchanged by digest
 *   B2   the face names the accept and the marking's real lifetime, and says
 *        nothing about anything being kept anywhere
 *   B3   ACT TWO, THE WINDOW RELOAD
 *   B4   ACT THREE, the tab closed with ⌘W and opened again
 *   B5   ACT FOUR, ELEVEN other prose files opened FOR KEEPS, which is past
 *        `MAX_TABS`, so the tab is evicted rather than closed
 *   B6   THE ATTACK: the file is COMMITTED from outside, and the stored
 *        baseline is then refused rather than offered as a narrowing across
 *        the commit. The redline goes empty and names the commit.
 *
 * The baseline's generation and `durable` are read at every step, so "it came
 * back" is a fact rather than an impression.
 *
 * ## SAFETY
 *
 * Both Electrons are started through build/electron-run.mjs, which ends the
 * tree it started in a `finally` block whatever happened, and the second is
 * started only after the first has ended. The tmux socket is this script's
 * own, handed in by build/harness-socket.mjs, and `gmux` and `default` are
 * refused by name. The operator's own `-L gmux` sessions are counted before
 * and after and must not move. EVERY BYTE THIS RUN WRITES is under
 * `GMUX_HARNESS_DIR`: the profile, the HOME and the repository. Every other
 * process it starts is a synchronous `git` or `/bin/sh` that has exited
 * before the call returns. `--self-test` proves the grader on fixtures and
 * launches nothing.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from './electron-run.mjs';
import { cdpEval, wsConnect } from './cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[p243]';
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// The grader, proved under --self-test.
// ---------------------------------------------------------------------------
const failures = [];
function check(step, claim, pass, detail) {
  if (!pass) failures.push(`${step}. ${claim} — ${detail}`);
  say(`${pass ? 'pass' : 'FAIL'}  ${step}. ${claim}${detail ? ' — ' + detail : ''}`);
}

/**
 * Every finding about ONE reading of a restored baseline, as a pure function
 * so the grader can be proved on fixtures rather than trusted.
 *
 * `want` is what the launch before this one left: the bytes of the baseline,
 * the number of changes the picture held, and the digest of the file on disk.
 */
export function restoredFindings(r, want) {
  const out = [];
  const b = r.baseline;
  if (b === null || b === undefined) return ['no baseline on the tab'];
  if (b.text !== want.text) out.push('the baseline is not the bytes the last launch accepted');
  if (b.from !== 'accept') out.push(`the origin is ${String(b.from)} and not the accept`);
  if (b.durable !== 'restored') out.push(`durable is ${String(b.durable)} and not restored`);
  if (r.changes !== want.changes) {
    out.push(`the picture holds ${String(r.changes)} change(s) and not ${String(want.changes)}`);
  }
  if (r.digest !== want.digest) out.push('the file on disk moved');
  return out;
}

/** The sentence rules: it names the accept, its lifetime, and nothing else. */
export function sentenceFindings(since) {
  const out = [];
  if (typeof since !== 'string' || since.length === 0) return ['no sentence on the face'];
  if (!since.startsWith('Marked since you accepted at ')) {
    out.push('the face does not name the accept and its moment');
  }
  if (!since.includes("until this file's last commit moves")) {
    out.push('the face does not say what really ends the marking');
  }
  if (since.includes('for as long as this tab is open')) {
    out.push('the face still promises the lifetime this phase falsified');
  }
  if (/\b(backup|saved|kept|recovered|restored|history)\b/i.test(since)) {
    out.push(`the face reads as a backup: ${since}`);
  }
  return out;
}

function selfTest() {
  const base = {
    text: 'accepted bytes',
    changes: 2,
    digest: 'abc'
  };
  const reading = (over = {}) => ({
    baseline: { text: 'accepted bytes', from: 'accept', durable: 'restored', generation: 4 },
    changes: 2,
    digest: 'abc',
    ...over
  });
  const fixtures = [
    ['a clean restore passes', reading(), base, 0],
    ['no baseline at all', reading({ baseline: null }), base, 1],
    ['the baseline widened back to the commit', { ...reading(), baseline: { text: 'HEAD', from: 'commit', durable: 'written' } }, base, 3],
    ['it was seeded fresh rather than restored', { ...reading(), baseline: { text: 'accepted bytes', from: 'accept', durable: undefined } }, base, 1],
    ['the picture lost its changes', reading({ changes: 0 }), base, 1],
    ['the file on disk moved', reading({ digest: 'zzz' }), base, 1]
  ];
  const sentences = [
    ["Marked since you accepted at 14:02, until this file's last commit moves.", 0],
    ['Marked since you accepted at 14:02, for as long as this tab is open.', 2],
    ['Marked since the last commit, until this file\'s last commit moves.', 1],
    ["Marked since you accepted at 14:02, until this file's last commit moves. Your text is kept.", 1],
    ['', 1]
  ];
  let ok = true;
  for (const [label, r, want, n] of fixtures) {
    const got = restoredFindings(r, want).length;
    const good = got === n;
    ok = ok && good;
    say(`${good ? 'ok  ' : 'FAIL'} self-test ${label}: ${String(got)} finding(s), wanted ${String(n)}`);
  }
  for (const [text, n] of sentences) {
    const got = sentenceFindings(text).length;
    const good = got === n;
    ok = ok && good;
    say(`${good ? 'ok  ' : 'FAIL'} self-test sentence ${JSON.stringify(text).slice(0, 60)}: ${String(got)} finding(s), wanted ${String(n)}`);
  }
  say(`${ok ? 'ok  ' : 'FAIL'} self-test: ${String(fixtures.length + sentences.length)} fixtures, ${ok ? 'all behaved' : 'one or more did not'}`);
  return ok;
}
if (process.argv.includes('--self-test')) {
  process.exit(selfTest() ? 0 : 1);
}

// ---------------------------------------------------------------------------
// The app run.
// ---------------------------------------------------------------------------
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(
    process.execPath,
    [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', 'gmux-p243', `node ${process.argv[1]}`],
    { cwd: REPO, stdio: 'inherit' }
  );
  process.exit(w.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') {
  console.error(`${TAG} refusing socket ${socket}`);
  process.exit(2);
}
const harnessDir = process.env['GMUX_HARNESS_DIR'] ?? '';
if (harnessDir === '') {
  console.error(`${TAG} no GMUX_HARNESS_DIR`);
  process.exit(2);
}
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} out/main/index.js is missing. Run npm run build.`);
  process.exit(2);
}

const operatorCount = () =>
  (spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' }).stdout ?? '')
    .split('\n')
    .filter((l) => l.trim() !== '').length;
const opBefore = operatorCount();

mkdirSync(join(harnessDir, 'p243'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p243'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
for (const d of [home, profile, project]) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}

const git = (...a) => {
  const r = spawnSync('git', a, {
    cwd: project,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }
  });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout;
};
/** A plain shell writes the file from outside — the charter's wording for an agent's write. */
const shellWrite = (rel, text) => {
  const r = spawnSync('/bin/sh', ['-c', 'cat > "$1"', 'sh', join(project, rel)], {
    input: text,
    encoding: 'utf8'
  });
  if (r.status !== 0) throw new Error('shell write failed');
};
const digestOf = (rel) =>
  createHash('sha256').update(readFileSync(join(project, rel))).digest('hex');

/** The records the store holds, read off this run's own scratch profile. */
const storeRecords = () => {
  try {
    const dir = join(profile, 'gmux', 'baselines');
    return readdirSync(dir)
      .filter((n) => n.endsWith('.json'))
      .map((n) => JSON.parse(readFileSync(join(dir, n), 'utf8')));
  } catch {
    return [];
  }
};

const para = (n, w) =>
  `Paragraph ${n} of the notes, ${w}, keeps going for a while so the document has a body worth reading and a sentence that can change.`;
const V1 = [
  'The quick brown fox jumped over the lazy dog.',
  '',
  para(1, 'first'),
  '',
  para(2, 'second'),
  '',
  para(3, 'third'),
  ''
].join('\n');
const V2 = V1.replace('brown fox jumped', 'red fox leapt').replace(
  'second',
  'rewritten by an agent'
);

writeFileSync(join(project, 'notes.txt'), V1);
// Eleven other prose files, so act four can open past MAX_TABS for keeps.
const OTHERS = [];
for (let i = 0; i < 11; i += 1) {
  const rel = `other${String(i)}.md`;
  OTHERS.push(rel);
  writeFileSync(join(project, rel), `# Other ${String(i)}\n\nA paragraph.\n`);
}
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p243@example.invalid');
git('config', 'user.name', 'p243');
git('add', '.');
git('commit', '-q', '-m', 'first');

// ---------------------------------------------------------------------------
// Renderer side readers, evaluated over CDP.
// ---------------------------------------------------------------------------
const READ = `(() => {
  const fiberTab = (el) => {
    if (!el) return null;
    const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
    let f = key ? el[key] : null;
    const pick = (a, b) => { if (!a) return b; if (!b) return a; return (b.baseline?.generation ?? 0) > (a.baseline?.generation ?? 0) ? b : a; };
    while (f) {
      const t = f.memoizedProps && f.memoizedProps.tab;
      const u = f.alternate && f.alternate.memoizedProps && f.alternate.memoizedProps.tab;
      if (t && typeof t === 'object' && 'savedContents' in t) return pick(t, u && u.id === t.id ? u : null);
      f = f.return;
    }
    return null;
  };
  const drawn = fiberTab(document.querySelector('.ed-redline-view'));
  const chip = fiberTab(document.querySelector('.ed-tabs-actions .ed-mode'));
  const tab = drawn ?? chip;
  const doc = document.querySelector('.ed-redline-doc');
  return {
    baseline: tab && tab.baseline ? {
      text: tab.baseline.text,
      from: tab.baseline.from,
      generation: tab.baseline.generation,
      durable: tab.baseline.durable ?? null
    } : null,
    savedContents: tab ? tab.savedContents : null,
    changes: doc ? doc.querySelectorAll('.ed-redline-change').length : -1,
    drawn: doc !== null,
    since: document.querySelector('.ed-redline-view .ed-redline-since .banner-text')?.textContent ?? null,
    detail: document.querySelector('.ed-redline-view .ed-redline-since')?.getAttribute('title') ?? null,
    tabCount: document.querySelectorAll('[role="tab"]').length
  };
})()`;
const clickMode = (label) =>
  `(() => { const b = document.querySelector('.ed-tabs-actions .ed-mode [aria-label="${label}"]'); if (!b) return false; b.click(); return true; })()`;
const docSettled = `(() => document.querySelector('.ed-redline-doc') !== null && document.querySelector('.ed-redline-view .ed-skeleton') === null)()`;

async function cdpForAppWindow(timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      port = 0;
    }
    if (port > 0) {
      let list = [];
      try {
        list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      } catch {
        list = [];
      }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl, {
            collect: ['Runtime.consoleAPICalled', 'Runtime.exceptionThrown']
          });
          const a = await cdpEval(
            cdp,
            `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? location.href : null`,
            5000
          );
          if (typeof a === 'string') return { cdp, url: a };
          cdp.close();
        } catch {
          if (cdp) {
            try {
              cdp.close();
            } catch {
              /* already closed */
            }
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window');
    await sleep(200);
  }
}
const until = async (cdp, expr, ms) => {
  const s = Date.now();
  for (;;) {
    if ((await cdpEval(cdp, expr, 10000)) === true) return true;
    if (Date.now() - s > ms) return false;
    await sleep(80);
  }
};
const drive = (cdp, spec) =>
  cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify(spec)}).then(() => true)`, 90000);
const read = (cdp) => cdpEval(cdp, READ, 10000);
async function press(cdp, { key, code, vk, modifiers }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  await cdp.call('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}
const NEXT_CHANGE = { key: 'ArrowDown', code: 'ArrowDown', vk: 40, modifiers: 1 };
const ACCEPT = { key: 'Enter', code: 'Enter', vk: 13, modifiers: 1 };
const CMD_W = { key: 'w', code: 'KeyW', vk: 87, modifiers: 4 };

const LAUNCH = {
  userDataDir: profile,
  tmuxSocket: null,
  cwd: REPO,
  args: ['--remote-debugging-port=0', '--use-mock-keychain'],
  env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }),
  ceilingMs: 12 * 60 * 1000
};

/** Open notes.txt as a redline and read it, from a clean tab list. */
async function openRedline(cdp) {
  await drive(cdp, { projectPath: project, openRel: 'notes.txt', mode: 'diff', editorWidth: 1100 });
  await sleep(600);
  await cdpEval(cdp, clickMode('Redline'));
  await until(cdp, docSettled, 20000);
  await sleep(900);
  return read(cdp);
}

/** What launch A left, filled in below and read back by launch B. */
const want = { text: '', changes: 0, digest: '' };
let generationA = -1;

// ---- LAUNCH A -------------------------------------------------------------
await withElectron({ label: 'p243-a', ...LAUNCH }, async (handle) => {
  const { cdp, url } = await cdpForAppWindow(60000);
  say(`launch A: app window at ${url}, pid ${handle.appPid()}`);
  try {
    await cdp.call('Runtime.enable');
    await cdp.call('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
    });
    for (;;) {
      if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
      await sleep(50);
    }
    await drive(cdp, { projectPath: project });
    await sleep(1500);

    // A1. The committed file, opened as Redline.
    let r = await openRedline(cdp);
    check(
      'A1.base',
      'the baseline is the last commit',
      r.baseline?.from === 'commit' && r.baseline?.text === V1,
      JSON.stringify({ from: r.baseline?.from, gen: r.baseline?.generation })
    );
    // The receipt lands a moment after the seed; it is main's answer rather
    // than a frame, so it is waited for rather than assumed. THE FACE IS WHAT
    // IS ASSERTED: a receipt is not something a person sees, and what they do
    // see is the lifetime the marking claims. On an EMPTY picture the visible
    // line is Phase 239's "Nothing has changed since ..." and carries no
    // lifetime at all, so the claim is read off the hover, which always does.
    await until(
      cdp,
      `(() => { const v = document.querySelector('.ed-redline-since'); return v !== null && (v.getAttribute('title') ?? '').includes('last commit moves'); })()`,
      15000
    );
    r = await read(cdp);
    check(
      'A1.durable',
      'the baseline was recorded, and the face says what really ends the marking',
      r.baseline?.durable === 'written' &&
        (r.detail ?? '').includes("The marking lasts until this file's last commit moves."),
      JSON.stringify({ durable: r.baseline?.durable, detail: r.detail })
    );

    // A2. A shell writes the file from outside.
    shellWrite('notes.txt', V2);
    const drew = await until(
      cdp,
      `document.querySelectorAll('.ed-redline-change').length >= 2`,
      20000
    );
    r = await read(cdp);
    check('A2.drawn', "the agent's rewrite is drawn", drew && r.changes >= 2, `${String(r.changes)} change(s)`);

    // A3. Two accepts with the real chords, and the file must not move.
    const beforeDigest = digestOf('notes.txt');
    let count = r.changes;
    for (let i = 0; i < 2; i += 1) {
      await press(cdp, NEXT_CHANGE);
      await sleep(200);
      await press(cdp, ACCEPT);
      const dropped = await until(
        cdp,
        `document.querySelectorAll('.ed-redline-change').length === ${String(count - 1)}`,
        10000
      );
      check(`A3.accept${String(i + 1)}`, 'the accept narrowed the marking by one change', dropped, `to ${String(count - 1)}`);
      count -= 1;
    }
    // The receipt for the accepted bytes, read off the face for the reason A1
    // gives. Here the picture still holds a change, so the visible line is the
    // one that carries the lifetime.
    const receipted = await until(
      cdp,
      `(() => { const v = document.querySelector('.ed-redline-since .banner-text'); return v !== null && v.textContent.includes("until this file's last commit moves"); })()`,
      15000
    );
    r = await read(cdp);
    check(
      'A3.disk',
      'an accept wrote no byte of the person\'s file',
      digestOf('notes.txt') === beforeDigest,
      beforeDigest.slice(0, 12)
    );
    check(
      'A3.base',
      'the baseline moved to what was accepted, and the face says the marking outlives the tab',
      r.baseline?.from === 'accept' && receipted,
      JSON.stringify({ from: r.baseline?.from, since: r.since, gen: r.baseline?.generation })
    );

    // A4. The store, read off this run's own profile.
    const records = storeRecords();
    const notes = records.filter((rec) => rec.relPath === 'notes.txt');
    check(
      'A4.record',
      'the store holds one record for this file, naming the accept',
      notes.length === 1 && notes[0]?.entries?.[0]?.origin === 'accept',
      JSON.stringify({ files: records.map((x) => x.relPath), origin: notes[0]?.entries?.[0]?.origin })
    );
    check(
      'A4.ring',
      'and the ring holds at most two bodies for it',
      (notes[0]?.entries?.length ?? 0) <= 2,
      `${String(notes[0]?.entries?.length ?? 0)} entries`
    );

    want.text = r.baseline?.text ?? '';
    want.changes = r.changes;
    want.digest = digestOf('notes.txt');
    generationA = r.baseline?.generation ?? -1;
    say(
      `launch A left a baseline of ${String(want.text.length)} bytes at generation ` +
        `${String(generationA)}, with ${String(want.changes)} change(s) still marked`
    );
  } finally {
    cdp.close();
  }
});

say('launch A ended; the second launch starts only now, so the two are never up at once');
await sleep(1500);

// ---- LAUNCH B -------------------------------------------------------------
await withElectron({ label: 'p243-b', ...LAUNCH }, async (handle) => {
  const { cdp, url } = await cdpForAppWindow(60000);
  say(`launch B: app window at ${url}, pid ${handle.appPid()}`);
  try {
    await cdp.call('Runtime.enable');
    await cdp.call('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
    });
    for (;;) {
      if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
      await sleep(50);
    }
    await drive(cdp, { projectPath: project });
    await sleep(1500);

    // B1 and B2. ACT ONE: the quit.
    let r = await openRedline(cdp);
    r.digest = digestOf('notes.txt');
    let findings = restoredFindings(r, want);
    check(
      'B1.quit',
      'ACT ONE, THE QUIT: the marking came back in a new process',
      findings.length === 0,
      findings.length === 0
        ? JSON.stringify({ from: r.baseline?.from, durable: r.baseline?.durable, changes: r.changes })
        : findings.join('; ')
    );
    const said = sentenceFindings(r.since);
    check(
      'B2.face',
      'the face names the accept and the marking\'s real lifetime, and reads as no backup',
      said.length === 0,
      said.length === 0 ? JSON.stringify(r.since) : said.join('; ')
    );
    check(
      'B2.detail',
      'the hover says the marking is from an earlier session, once',
      (r.detail ?? '').includes('This marking is from an earlier session.'),
      JSON.stringify(r.detail)
    );

    // B3. ACT TWO: the window reload.
    await cdpEval(cdp, `(() => { location.reload(); return true; })()`).catch(() => undefined);
    await sleep(2500);
    cdp.close();
    const again = await cdpForAppWindow(60000);
    const cdp2 = again.cdp;
    await cdp2.call('Runtime.enable');
    for (;;) {
      if ((await cdpEval(cdp2, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
      await sleep(50);
    }
    await drive(cdp2, { projectPath: project });
    await sleep(1500);
    r = await openRedline(cdp2);
    r.digest = digestOf('notes.txt');
    findings = restoredFindings(r, want);
    check(
      'B3.reload',
      'ACT TWO, THE WINDOW RELOAD: the marking came back',
      findings.length === 0,
      findings.length === 0 ? `${String(r.changes)} change(s)` : findings.join('; ')
    );

    // B4. ACT THREE: the tab closed and opened again.
    await press(cdp2, CMD_W);
    await until(cdp2, `document.querySelector('.ed-redline-doc') === null`, 10000);
    r = await openRedline(cdp2);
    r.digest = digestOf('notes.txt');
    findings = restoredFindings(r, want);
    check(
      'B4.close',
      'ACT THREE, THE TAB CLOSED AND OPENED AGAIN: the marking came back',
      findings.length === 0,
      findings.length === 0 ? `${String(r.changes)} change(s)` : findings.join('; ')
    );

    // B5. ACT FOUR: eleven other files opened for keeps, which is past MAX_TABS.
    await drive(cdp2, { projectPath: project, openRels: OTHERS });
    await sleep(1200);
    const evicted = await cdpEval(
      cdp2,
      `Array.from(document.querySelectorAll('[role="tab"]')).every((t) => !(t.textContent ?? '').includes('notes.txt'))`,
      10000
    );
    check(
      'B5.evicted',
      'eleven files opened for keeps evicted the tab, which is the act Phase 238 measured',
      evicted === true,
      `${String((await read(cdp2)).tabCount)} tab(s)`
    );
    r = await openRedline(cdp2);
    r.digest = digestOf('notes.txt');
    findings = restoredFindings(r, want);
    check(
      'B5.lru',
      'ACT FOUR, THE ELEVENTH FILE: the marking came back after the eviction',
      findings.length === 0,
      findings.length === 0 ? `${String(r.changes)} change(s)` : findings.join('; ')
    );

    // B6. THE ATTACK: commit the file underneath the stored baseline.
    await press(cdp2, CMD_W);
    await until(cdp2, `document.querySelector('.ed-redline-doc') === null`, 10000);
    git('commit', '-q', '-am', 'the agent\'s rewrite, committed');
    await sleep(1500);
    r = await openRedline(cdp2);
    check(
      'B6.attack',
      'THE ATTACK: a stored baseline from before a commit is refused, not offered as a narrowing across it',
      r.baseline?.from === 'commit' && r.baseline?.text === V2 && r.changes === 0,
      JSON.stringify({ from: r.baseline?.from, changes: r.changes, gen: r.baseline?.generation })
    );
    check(
      'B6.face',
      'and the face says so, naming the commit rather than the accept',
      (r.since ?? '').includes('the last commit'),
      JSON.stringify(r.since)
    );
    cdp2.close();
  } catch (err) {
    check('B.run', 'launch B drove to the end', false, String(err));
  }
});

const opAfter = operatorCount();
check(
  'Z.tmux',
  "the operator's own -L gmux sessions did not move",
  opBefore === opAfter,
  `${String(opBefore)} before, ${String(opAfter)} after`
);

say(`${String(failures.length)} failure(s)`);
for (const f of failures) say(`  ${f}`);
process.exit(failures.length === 0 ? 0 : 1);
