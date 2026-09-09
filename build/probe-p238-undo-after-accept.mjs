#!/usr/bin/env node
/**
 * probe-p238-undo-after-accept.mjs — PHASE 238's FIX ROUND, in the app.
 *
 * The verifier's finding 1: after an accept, the undo of a rewind is dead for
 * that tab, and the face kept promising it. Rewind a change, so the file is
 * written and the face draws *"Undo the last rewind with ⌥⇧⌫. It lasts for
 * this session."*; accept a DIFFERENT change; press ⌥⇧⌫. The undo refused —
 * correctly, because the journal entry's offset is into a baseline the accept
 * replaced, which is research 83 B.8a — but the promise was still on the face
 * at the moment of the press, the face still drew the button, and the sentence
 * a person got was the rewind map's *"Look again, then rewind"*, which tells
 * whoever pressed the recovery to press the destructive one.
 *
 * WHAT THIS RUN READS, all off the live DOM and the real disk:
 *
 *   F. FINDING 4, MEASURED RATHER THAN INHERITED. Which element the keyboard
 *      is on after the view mounts and after each of the first two ⌥↓, and
 *      whether the ⌥⌫ that follows each one moves the file. The verifier
 *      recorded the first ⌥↓ landing on the contenteditable host rather than
 *      on a change and named it Phase 237's; `probe:p167` reads 36 of 36
 *      accepts landing on the same pair of chords, so the two disagree and
 *      this arm settles it in this tree.
 *   1. THE CONTROL: a rewind and an undo with NO accept between them. The undo
 *      must WRITE and the file must come back byte for byte, or nothing arm 2
 *      says means anything.
 *   2. THE DEFECT AND THE FIX: a rewind, then an accept of a different change,
 *      then the undo. The accept must move NO byte of the file (research 83
 *      B.5); the undo note and the note row's Undo button must be GONE once the
 *      baseline has moved; and the refusal, if the press is made anyway, must
 *      be the undo's own sentence and must leave the file where the rewind
 *      left it.
 *
 * ## SAFETY
 *
 * One Electron, through build/electron-run.mjs, which ends the tree it started
 * in a `finally`. A scratch profile, a scratch HOME and this script's own tmux
 * socket, ended and unlinked by build/harness-socket.mjs; `gmux` and `default`
 * are refused by name and the operator's own -L gmux sessions are counted
 * before and after. No agent, no token, no keychain, no request, no ssh, no
 * machine. Every file written is under GMUX_HARNESS_DIR, and the writes from
 * outside are a plain /bin/sh running cat.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from './electron-run.mjs';
import { cdpEval, wsConnect } from './cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[p238-undo]';
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const failures = [];
const rows = [];
function check(step, claim, pass, detail) {
  rows.push({ step, claim, pass, detail: detail ?? '' });
  if (!pass) failures.push(`${step}. ${claim} — ${detail ?? ''}`);
  say(`${pass ? 'pass' : 'FAIL'}  ${step}. ${claim}${detail ? ' — ' + detail : ''}`);
}
function note(step, claim, detail) {
  rows.push({ step, claim, pass: null, detail: detail ?? '' });
  say(`note  ${step}. ${claim}${detail ? ' — ' + detail : ''}`);
}

/**
 * The grader for arm 2, proved under --self-test so it is seen to fail. A
 * reading is GOOD when the accept moved no byte, the promise came down with
 * the baseline, and the refusal is the undo's own sentence over a file that
 * did not move.
 */
function gradeArm2(r) {
  const bad = [];
  if (r.acceptDigest !== r.rewoundDigest) bad.push('the accept moved a byte of the file');
  if (r.noteBeforeAccept !== true) bad.push('the face never promised the undo in the first place');
  if (r.noteAfterAccept !== false) bad.push('the face still promises an undo that can only refuse');
  if (r.rowUndoBeforeAccept !== true) bad.push('the note row never drew Undo in the first place');
  if (r.rowUndoAfterAccept !== false) bad.push('the note row still draws an Undo that can only refuse');
  if (r.chipUndoEver !== false) bad.push('the chip drew an Undo, which Phase 239 moved off it');
  if (r.undoDigest !== r.rewoundDigest) bad.push('the refused undo moved a byte of the file');
  if (typeof r.said !== 'string' || !r.said.includes('can no longer be undone')) {
    bad.push(`the refusal was not the undo's own sentence: ${JSON.stringify(r.said)}`);
  }
  if (typeof r.said === 'string' && r.said.includes('then rewind')) {
    bad.push('the refusal told a person to rewind');
  }
  return bad;
}

if (process.argv.includes('--self-test')) {
  const OK = {
    rewoundDigest: 'a',
    acceptDigest: 'a',
    undoDigest: 'a',
    noteBeforeAccept: true,
    noteAfterAccept: false,
    rowUndoBeforeAccept: true,
    rowUndoAfterAccept: false,
    chipUndoEver: false,
    said: 'The marking moved, so the last rewind of notes.txt can no longer be undone.'
  };
  const cases = [
    ['the shipping shape', OK, 0],
    ['the accept wrote a byte', { ...OK, acceptDigest: 'b' }, 1],
    ['the note stayed up', { ...OK, noteAfterAccept: true }, 1],
    ['the note was never there', { ...OK, noteBeforeAccept: false }, 1],
    ['the row button stayed up', { ...OK, rowUndoAfterAccept: true }, 1],
    ['the row button was never there', { ...OK, rowUndoBeforeAccept: false }, 1],
    ['the chip grew an Undo again', { ...OK, chipUndoEver: true }, 1],
    ['the undo wrote a byte', { ...OK, undoDigest: 'b' }, 1],
    ['the rewind map answered', { ...OK, said: 'The marking moved while you were reading notes.txt. Look again, then rewind.' }, 2],
    ['nothing was said at all', { ...OK, said: null }, 1],
    ['everything wrong at once', { ...OK, acceptDigest: 'b', noteAfterAccept: true, rowUndoAfterAccept: true, undoDigest: 'c', said: null }, 5]
  ];
  let bad = 0;
  for (const [name, reading, want] of cases) {
    const got = gradeArm2(reading).length;
    const ok = got === want;
    if (!ok) bad += 1;
    say(`${ok ? 'pass' : 'FAIL'}  self-test: ${name} -> ${got} finding(s), wanted ${want}`);
  }
  say(`${cases.length - bad} of ${cases.length} grader fixtures behaved`);
  process.exit(bad === 0 ? 0 : 1);
}

const socket = process.env['GMUX_TMUX_SOCKET'] ?? '';
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(
    process.execPath,
    [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', 'gmux-p238u', `node ${process.argv[1]}`],
    { cwd: REPO, stdio: 'inherit' }
  );
  process.exit(w.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') { console.error(`${TAG} refusing socket ${socket}`); process.exit(2); }
const harnessDir = process.env['GMUX_HARNESS_DIR'] ?? '';
if (harnessDir === '') { console.error(`${TAG} no GMUX_HARNESS_DIR`); process.exit(2); }
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) { console.error(`${TAG} out/main/index.js is missing. Run npm run build.`); process.exit(2); }

const operatorCount = () =>
  (spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' }).stdout ?? '')
    .split('\n')
    .filter((l) => l.trim() !== '').length;
const opBefore = operatorCount();
say(`operator sessions on -L gmux before: ${opBefore}`);

mkdirSync(join(harnessDir, 'p238u'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p238u'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
const readingsFile = join(root, 'p238-undo-readings.json');
for (const d of [home, profile, project]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }

const git = (...a) => {
  const r = spawnSync('git', a, {
    cwd: project,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }
  });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout;
};
/** The write from outside, which is what an agent's write looks like here. */
const shellWrite = (rel, text) => {
  const r = spawnSync('/bin/sh', ['-c', 'cat > "$1"', 'sh', join(project, rel)], { input: text, encoding: 'utf8' });
  if (r.status !== 0) throw new Error('shell write failed');
};
const digest = (rel) => createHash('sha256').update(readFileSync(join(project, rel))).digest('hex').slice(0, 16);

const NOTES = 'notes.txt';
/**
 * Arm F rewinds too, and a rewind leaves an entry in the tab's journal. The
 * journal is keyed by TAB ID, so arm F gets a file and a tab of its own and
 * the control below starts from an empty one; otherwise C4, which asserts
 * that popping the last entry takes the promise down with it, reads arm F's
 * leftover entry and fails for a reason that is the probe's rather than the
 * product's. That is what the first run of this probe found.
 */
const WALK = 'walk.txt';
const WORDS = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'];
/** Eight paragraphs, each with one word that differs between the versions. */
const version = (n) =>
  WORDS.map(
    (_, i) =>
      `Paragraph ${i + 1} of the draft, whose marker word is ${WORDS[(i + n) % WORDS.length]} and whose body carries enough sentences to make the document worth scrolling through when somebody reads it.\n`
  ).join('\n');

writeFileSync(join(project, NOTES), version(0));
writeFileSync(join(project, WALK), version(0));
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p238u@example.invalid');
git('config', 'user.name', 'p238u');
git('add', '--', NOTES, WALK);
git('commit', '-q', '-m', 'the committed draft');

// ---------------------------------------------------------------------------
// The reads, all off the LIVE DOM.
// ---------------------------------------------------------------------------
const FACE = `(() => {
  const doc = document.querySelector('.ed-redline-doc');
  const view = document.querySelector('.ed-redline-view');
  const chip = document.querySelector('.ed-redline-chip');
  const active = document.activeElement;
  return {
    mounted: doc !== null,
    changes: doc === null ? 0 : doc.querySelectorAll('.ed-redline-change').length,
    docText: doc === null ? null : doc.textContent,
    since: document.querySelector('.ed-redline-since .banner-text')?.textContent ?? null,
    undoNote: document.querySelector('.ed-redline-undo .banner-text')?.textContent ?? null,
    notes: Array.from(document.querySelectorAll('.ed-redline-view .ed-note .banner-text')).map((n) => n.textContent),
    chip: chip === null ? null : Array.from(chip.querySelectorAll('button')).map((b) => (b.getAttribute('title') ?? b.getAttribute('aria-label') ?? '')),
    // PHASE 239 MOVED UNDO OFF THE CHIP into the note row beside the sentence
    // that says what it does, so the button this arm is about is read there.
    // The chip is still read, because "the chip must not draw an Undo" is
    // half of what this arm asserts.
    rowUndo: Array.from(document.querySelectorAll('.ed-redline-undo .ed-redline-note-button')).map((b) => b.textContent ?? ''),
    activeClass: active === null ? null : (active.className || active.tagName),
    activeIsChange: active !== null && typeof active.closest === 'function' && active.closest('.ed-redline-change') !== null,
    generation: doc === null ? null : (doc.querySelector('.ed-redline-change')?.getAttribute('data-change-gen') ?? null),
    toasts: Array.from(document.querySelectorAll('.toasts .toast-text')).map((t) => t.textContent ?? ''),
    skeleton: view !== null && view.querySelector('.ed-skeleton') !== null
  };
})()`;

const clickMode = (label) =>
  `(() => { const b = document.querySelector('.ed-mode[role="radiogroup"] [aria-label="${label}"]'); if (!b || b.disabled) return false; b.click(); return true; })()`;
const docSettled = `(() => document.querySelector('.ed-redline-doc') !== null && document.querySelector('.ed-redline-view .ed-skeleton') === null)()`;
const hasChanges = (n) =>
  `(() => { const d = document.querySelector('.ed-redline-doc'); return d !== null && d.querySelectorAll('.ed-redline-change').length === ${String(n)}; })()`;

async function cdpForAppWindow(timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try { port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim()); } catch { port = 0; }
    if (port > 0) {
      let list = [];
      try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch { list = []; }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl, { collect: ['Runtime.consoleAPICalled', 'Runtime.exceptionThrown'] });
          const a = await cdpEval(cdp, `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? location.href : null`, 5000);
          if (typeof a === 'string') return { cdp, url: a };
          cdp.close();
        } catch { if (cdp) { try { cdp.close(); } catch { /* closed */ } } }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window');
    await sleep(200);
  }
}

const until = async (cdp, expr, ms) => {
  const s = Date.now();
  for (;;) {
    let v = null;
    try { v = await cdpEval(cdp, expr, 10000); } catch { v = null; }
    if (v === true) return true;
    if (Date.now() - s > ms) return false;
    await sleep(120);
  }
};
const drive = (cdp, spec) => cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify(spec)}).then(() => true)`, 90000);
const face = (cdp) => cdpEval(cdp, FACE, 20000);

// CDP modifier bits: Alt 1, Ctrl 2, Meta 4, Shift 8.
const CHORD = {
  next: { key: 'ArrowDown', code: 'ArrowDown', vk: 40, modifiers: 1 },
  prev: { key: 'ArrowUp', code: 'ArrowUp', vk: 38, modifiers: 1 },
  rewind: { key: 'Backspace', code: 'Backspace', vk: 8, modifiers: 1 },
  undo: { key: 'Backspace', code: 'Backspace', vk: 8, modifiers: 1 | 8 },
  accept: { key: 'Enter', code: 'Enter', vk: 13, modifiers: 1 }
};
async function press(cdp, { key, code, vk, modifiers }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  await sleep(250);
}

/** Click the nth change wrapper, which is a real gesture and sets the caret. */
async function clickChange(cdp, n) {
  const r = await cdpEval(
    cdp,
    `(() => { const e = document.querySelectorAll('.ed-redline-change')[${String(n)}]; if (!e) return null; const b = e.getClientRects()[0]; return b ? { x: b.left + Math.min(6, b.width / 2), y: b.top + b.height / 2 } : null; })()`,
    20000
  );
  if (r === null) return false;
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y, button: 'none', buttons: 0, clickCount: 0, pointerType: 'mouse' });
  await sleep(60);
  await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', buttons: 1, clickCount: 1, pointerType: 'mouse' });
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', buttons: 0, clickCount: 1, pointerType: 'mouse' });
  await sleep(300);
  return true;
}

const clearToasts = (cdp) =>
  cdpEval(cdp, `(() => { for (const b of Array.from(document.querySelectorAll('.toasts .toast-close'))) b.click(); return true; })()`, 20000).catch(() => null);

/** Open one of the fixture files in Redline, for keeps. */
async function openRedline(cdp, rel) {
  await drive(cdp, { projectPath: project, openRel: rel, mode: 'file' });
  await sleep(700);
  await cdpEval(cdp, clickMode('Redline'));
  await until(cdp, docSettled, 20000);
  await sleep(500);
  return face(cdp);
}

const readings = {};

await withElectron(
  {
    label: 'p238u',
    userDataDir: profile,
    tmuxSocket: null,
    cwd: REPO,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }),
    ceilingMs: 15 * 60 * 1000
  },
  async (handle) => {
    const { cdp, url } = await cdpForAppWindow(90000);
    say(`app window at ${url}, pid ${handle.appPid()}`);
    try {
      await cdp.call('Runtime.enable');
      await cdp.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      for (;;) { if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break; await sleep(50); }
      await drive(cdp, { projectPath: project, editorWidth: 1000, sidebarWidth: 300 });
      await sleep(1500);

      // -------------------------------------------------------------------
      // F. FINDING 4, MEASURED. Where the keyboard is after the mount and
      // after each of the first two ⌥↓, and whether the ⌥⌫ after each one
      // moves the file. Nothing is fixed here; this arm reports.
      // -------------------------------------------------------------------
      shellWrite(WALK, version(1));
      let f = await openRedline(cdp, WALK);
      await until(cdp, hasChanges(8), 30000);
      f = await face(cdp);
      check('F0', 'the redline drew the eight agent edits against HEAD', f.changes === 8, `${f.changes} changes`);
      const walk = [{ at: 'after the mount', activeClass: f.activeClass, activeIsChange: f.activeIsChange, digest: digest(NOTES) }];
      for (let i = 1; i <= 2; i += 1) {
        await press(cdp, CHORD.next);
        const g = await face(cdp);
        const before = digest(WALK);
        await press(cdp, CHORD.rewind);
        await sleep(900);
        walk.push({
          at: `after ⌥↓ number ${String(i)}`,
          activeClass: g.activeClass,
          activeIsChange: g.activeIsChange,
          rewindMovedTheFile: digest(WALK) !== before
        });
        if (digest(WALK) !== before) break;
      }
      readings.walk = walk;
      note('F1', 'where the keyboard lands, and whether the ⌥⌫ after it writes', JSON.stringify(walk));
      const firstWorked = walk[1]?.rewindMovedTheFile === true;
      note(
        'F2',
        firstWorked
          ? "the verifier's finding 4 did NOT reproduce here: the first ⌥↓ reached a change and the ⌥⌫ after it wrote"
          : "the verifier's finding 4 REPRODUCED: the first ⌥↓ did not reach a change and the ⌥⌫ after it wrote nothing",
        `first ⌥↓ landed on ${JSON.stringify(walk[1]?.activeClass)}`
      );

      // Arm F's tab is closed and left behind: its journal dies with its id,
      // so the control below starts from an empty one.
      const closedWalk = await cdpEval(cdp, `(() => {
        const t = Array.from(document.querySelectorAll('.ed-tab')).find((x) => (x.querySelector('.ed-tab-name')?.textContent ?? '').includes('walk'));
        const b = t?.querySelector('.ed-tab-close');
        if (!b) return false;
        b.click();
        return true;
      })()`, 20000);
      await sleep(900);
      note('F3', "arm F's tab was closed, so the control starts with an empty journal", `closed=${String(closedWalk)}`);

      // -------------------------------------------------------------------
      // 1. THE CONTROL: a rewind and an undo with no accept between them.
      // -------------------------------------------------------------------
      shellWrite(NOTES, version(1));
      await openRedline(cdp, NOTES);
      await until(cdp, hasChanges(8), 30000);
      await clearToasts(cdp);
      const startDigest = digest(NOTES);
      const clicked = await clickChange(cdp, 2);
      const beforeRewind = await face(cdp);
      check('C0', 'the control starts with no rewind to undo', beforeRewind.undoNote === null, JSON.stringify(beforeRewind.undoNote));
      await press(cdp, CHORD.rewind);
      await until(cdp, hasChanges(7), 20000);
      const rewound1 = digest(NOTES);
      const afterRewind1 = await face(cdp);
      check('C1', 'the rewind wrote the file and dropped one change', clicked && rewound1 !== startDigest && afterRewind1.changes === 7, `${beforeRewind.changes} -> ${afterRewind1.changes} changes, digest ${startDigest} -> ${rewound1}`);
      check('C2', 'the face offers the undo', typeof afterRewind1.undoNote === 'string' && afterRewind1.undoNote.includes('Undo the last rewind'), JSON.stringify(afterRewind1.undoNote));
      await press(cdp, CHORD.undo);
      await until(cdp, hasChanges(8), 20000);
      const undone1 = digest(NOTES);
      const afterUndo1 = await face(cdp);
      readings.control = { startDigest, rewound1, undone1, afterUndo1 };
      check('C3', 'THE CONTROL: the undo wrote, and the file came back byte for byte', undone1 === startDigest && afterUndo1.changes === 8, `digest ${rewound1} -> ${undone1} (start ${startDigest}), ${afterUndo1.changes} changes`);
      check('C4', 'and the promise came down with the last entry', afterUndo1.undoNote === null, JSON.stringify(afterUndo1.undoNote));

      // -------------------------------------------------------------------
      // 2. THE DEFECT AND THE FIX.
      // -------------------------------------------------------------------
      await clearToasts(cdp);
      await clickChange(cdp, 2);
      await press(cdp, CHORD.rewind);
      await until(cdp, hasChanges(7), 20000);
      const rewoundDigest = digest(NOTES);
      const beforeAccept = await face(cdp);
      check('D1', 'a rewind was made, so there is an undo to lose', rewoundDigest !== startDigest && typeof beforeAccept.undoNote === 'string', `digest ${rewoundDigest}, note ${JSON.stringify(beforeAccept.undoNote)}`);
      // The chip, read while a change holds the keyboard, which is when it is
      // drawn at all (Phase 236: the resting face draws no control).
      await clickChange(cdp, 4);
      const chipBefore = await face(cdp);
      const rowUndoBeforeAccept =
        Array.isArray(chipBefore.rowUndo) && chipBefore.rowUndo.some((t) => t.includes('Undo'));
      note('D2', 'the chip and the note row, before the accept', JSON.stringify({ chip: chipBefore.chip, row: chipBefore.rowUndo }));

      // The accept, of the change the keyboard is on, which is NOT the one
      // that was rewound.
      await press(cdp, CHORD.accept);
      await until(cdp, hasChanges(6), 20000);
      const acceptDigest = digest(NOTES);
      const afterAccept = await face(cdp);
      check('D3', 'the accept moved NOT ONE BYTE of the file (research 83 B.5)', acceptDigest === rewoundDigest, `digest ${rewoundDigest} -> ${acceptDigest}`);
      check('D4', 'and it dropped exactly the change it was pressed on', afterAccept.changes === 6, `${beforeAccept.changes} -> ${afterAccept.changes} changes`);
      note('D5', 'the sentence the face carries after the accept', JSON.stringify(afterAccept.since));
      check('D6', 'the face names the accept and its moment', typeof afterAccept.since === 'string' && afterAccept.since.includes('you accepted at'), JSON.stringify(afterAccept.since));

      // THE FIX: the promise is gone, on the face and on the chip.
      await clickChange(cdp, 1);
      const chipAfter = await face(cdp);
      const rowUndoAfterAccept =
        Array.isArray(chipAfter.rowUndo) && chipAfter.rowUndo.some((t) => t.includes('Undo'));
      // Phase 239's ruling, held here because this arm is the one that reads
      // both surfaces in one breath: the chip carries change verbs only.
      const chipUndoEver = [chipBefore.chip, chipAfter.chip].some(
        (list) => Array.isArray(list) && list.some((t) => t.includes('Undo'))
      );
      note('D7', 'the chip and the note row, after the accept', JSON.stringify({ chip: chipAfter.chip, row: chipAfter.rowUndo }));

      // And the press a person already had in their fingers.
      await clearToasts(cdp);
      await press(cdp, CHORD.undo);
      await sleep(1200);
      const afterUndo2 = await face(cdp);
      const undoDigest = digest(NOTES);
      const said = afterUndo2.toasts.find((t) => t.includes('notes.txt')) ?? afterUndo2.toasts[0] ?? null;
      const arm2 = {
        rewoundDigest,
        acceptDigest,
        undoDigest,
        noteBeforeAccept: typeof beforeAccept.undoNote === 'string',
        noteAfterAccept: typeof afterAccept.undoNote === 'string',
        rowUndoBeforeAccept,
        rowUndoAfterAccept,
        chipUndoEver,
        said
      };
      readings.arm2 = arm2;
      const bad = gradeArm2(arm2);
      note('D8', 'the sentence the refused undo said', JSON.stringify(said));
      check('D9', 'the whole arm: the accept wrote nothing, the promise came down, and the refusal is the undo’s own sentence over a file that did not move', bad.length === 0, bad.length === 0 ? JSON.stringify(arm2) : bad.join('; '));
    } finally {
      writeFileSync(readingsFile, JSON.stringify(readings, null, 2));
      cdp.close();
    }
  }
);

const opAfter = operatorCount();
check('X1', 'operator sessions on -L gmux unmoved', opBefore === opAfter, `${opBefore} -> ${opAfter}`);
say('');
say(`${rows.filter((r) => r.pass === true).length} passed, ${failures.length} failed, ${rows.filter((r) => r.pass === null).length} notes`);
say(`readings at ${readingsFile}`);
if (failures.length > 0) { for (const f of failures) say(`FAILURE: ${f}`); process.exit(1); }
process.exit(0);
