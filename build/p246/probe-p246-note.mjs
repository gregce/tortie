#!/usr/bin/env node
/**
 * probe-p246-note.mjs — PHASE 246's MEASURE step, in the running app.
 *
 * It answers question 3 of the Phase 246 entry, which ruling 4 of
 * src/renderer/editor/redline.ts leaves open: *"Anything skipped is SAID,
 * through the surface's existing `ed-note` banner, rather than silently
 * missing."* The operator's screenshot of 2026-09-09 shows a paragraph drawn
 * whole, red then green, with NO note anywhere on the face.
 *
 * WHAT THIS RUN READS, all off the live DOM:
 *
 *   A. THE GOOD PICTURE. The operator's own bytes with one word deleted. The
 *      redline must draw ONE marked change, and there must be no note.
 *   B. THE BAD PICTURE. The same bytes with his own inserted paragraph above
 *      the edited one. Read every `.ed-note` on the face, its text and its
 *      rectangle, and read the drawn document, so what a person sees and what
 *      the surface says about it are one reading.
 *   C. THE CONTROL, so a run that could never see a note is not mistaken for
 *      a run that found none: a block past REDLINE_MAX_BLOCK_CHARS, which IS
 *      counted as a skip. The note must be drawn, and its rectangle says
 *      WHERE, which is the second half of question 3.
 *
 * IT REPAIRS NOTHING. It reports.
 *
 * ## SAFETY
 *
 * One Electron, through build/electron-run.mjs, which ends the tree it started
 * in a `finally`. A scratch profile, a scratch HOME and this script's own tmux
 * socket, ended and unlinked by build/harness-socket.mjs; `gmux` and `default`
 * are refused by name and the operator's own -L gmux sessions are counted
 * before and after. No agent, no token, no keychain, no request, no ssh, no
 * machine, and nothing written outside GMUX_HARNESS_DIR. The writes from
 * outside are a plain /bin/sh running cat.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p246-note]';
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
 * The grader, proved under --self-test so a reading that could not fail is not
 * mistaken for one that passed. A reading is what this phase claims when the
 * cap case DOES say so and the mis-aligned case does NOT, which together are
 * the finding: the note is reachable, and this picture does not reach it.
 */
function gradeNotes(r) {
  const bad = [];
  if (r.capNoteText === null) bad.push('the cap case drew no note, so this run could not see one at all');
  else if (!r.capNoteText.includes('drawn whole')) bad.push(`the cap note is not the caps note: ${JSON.stringify(r.capNoteText)}`);
  if (r.badNoteText !== null) bad.push(`the mis-aligned picture DID draw a note: ${JSON.stringify(r.badNoteText)}`);
  if (r.badDrawsWhole !== true) bad.push('the mis-aligned picture did not draw the paragraph whole, so it is not the operator’s picture');
  return bad;
}

if (process.argv.includes('--self-test')) {
  const OK = { capNoteText: '1 change drawn whole rather than word by word (1 too long).', badNoteText: null, badDrawsWhole: true };
  const cases = [
    ['the shape this phase measured', OK, 0],
    ['no note anywhere, so the run is blind', { ...OK, capNoteText: null }, 1],
    ['the cap note is some other banner', { ...OK, capNoteText: 'Since you opened it.' }, 1],
    ['the bad picture said so after all', { ...OK, badNoteText: '1 change drawn whole rather than word by word (1 rewritten).' }, 1],
    ['the bad picture is not the picture', { ...OK, badDrawsWhole: false }, 1],
    ['everything wrong at once', { capNoteText: null, badNoteText: 'x', badDrawsWhole: false }, 3]
  ];
  let bad = 0;
  for (const [name, reading, want] of cases) {
    const got = gradeNotes(reading).length;
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
    [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', 'gmux-p246', `node ${process.argv[1]}`],
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

mkdirSync(join(harnessDir, 'p246'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p246'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
const readingsFile = join(root, 'p246-note-readings.json');
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
const shellWrite = (rel, text) => {
  const r = spawnSync('/bin/sh', ['-c', 'cat > "$1"', 'sh', join(project, rel)], { input: text, encoding: 'utf8' });
  if (r.status !== 0) throw new Error('shell write failed');
};

const FIX = join(REPO, 'build', 'fixtures', 'redline-p246');
const OLD = readFileSync(join(FIX, 'old.md'), 'utf8');
const GOOD = readFileSync(join(FIX, 'new-good.md'), 'utf8');
const BAD = readFileSync(join(FIX, 'new-bad.md'), 'utf8');

/** The control: one paragraph past REDLINE_MAX_BLOCK_CHARS on both sides. */
const filler = (seedIn) => {
  const out = [];
  let x = seedIn;
  for (let i = 0; i < 900; i++) {
    x = (x * 1103515245 + 12345) % 2147483648;
    out.push(`w${String(x % 500)}`);
  }
  return out.join(' ');
};
const BIG_OLD = `A heading line that never changes.\n\n${filler(11)}\n`;
const BIG_NEW = `A heading line that never changes.\n\n${filler(22)}\n`;

writeFileSync(join(project, 'post.md'), OLD);
writeFileSync(join(project, 'big.md'), BIG_OLD);
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p246@example.invalid');
git('config', 'user.name', 'p246');
git('add', '--', 'post.md', 'big.md');
git('commit', '-q', '-m', 'the committed draft');

/**
 * The face. Every `.ed-note` in the view, with its own rectangle and whether
 * it is inside the scrolling document or a sibling under it, because "the note
 * is per file and off screen" is one of the two answers question 3 allows.
 */
const FACE = `(() => {
  const doc = document.querySelector('.ed-redline-doc');
  const view = document.querySelector('.ed-redline-view');
  const notes = Array.from(document.querySelectorAll('.ed-redline-view .ed-note')).map((n) => {
    const r = n.getBoundingClientRect();
    return {
      className: n.className,
      text: n.querySelector('.banner-text')?.textContent ?? null,
      insideDoc: doc !== null && doc.contains(n),
      rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), width: Math.round(r.width) },
      onScreen: r.height > 0 && r.top < window.innerHeight && r.bottom > 0
    };
  });
  const del = doc === null ? [] : Array.from(doc.querySelectorAll('del')).map((d) => d.textContent ?? '');
  const ins = doc === null ? [] : Array.from(doc.querySelectorAll('ins')).map((d) => d.textContent ?? '');
  return {
    mounted: doc !== null,
    changes: doc === null ? 0 : doc.querySelectorAll('.ed-redline-change').length,
    del, ins,
    notes,
    capsNote: notes.filter((n) => !n.className.includes('ed-redline-since') && !n.className.includes('ed-redline-undo') && !n.className.includes('ed-redline-hint')).map((n) => n.text),
    innerHeight: window.innerHeight,
    skeleton: view !== null && view.querySelector('.ed-skeleton') !== null
  };
})()`;

const clickMode = (label) =>
  `(() => { const b = document.querySelector('.ed-mode[role="radiogroup"] [aria-label="${label}"]'); if (!b || b.disabled) return false; b.click(); return true; })()`;
const docSettled = `(() => document.querySelector('.ed-redline-doc') !== null && document.querySelector('.ed-redline-view .ed-skeleton') === null)()`;

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

async function openRedline(cdp, rel) {
  await drive(cdp, { projectPath: project, openRel: rel, mode: 'file' });
  await sleep(700);
  await cdpEval(cdp, clickMode('Redline'));
  await until(cdp, docSettled, 20000);
  await sleep(700);
  return face(cdp);
}

const readings = {};

await withElectron(
  {
    label: 'p246',
    userDataDir: profile,
    tmuxSocket: null,
    cwd: REPO,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }),
    ceilingMs: 12 * 60 * 1000
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

      // A. THE GOOD PICTURE.
      shellWrite('post.md', GOOD);
      let f = await openRedline(cdp, 'post.md');
      readings.good = f;
      check('A1', 'the good picture draws one marked change', f.changes === 1, `${f.changes} changes, del=${JSON.stringify(f.del)}`);
      check('A2', 'and the one deleted word is his own', f.del.length === 1 && f.del[0].includes('micro'), JSON.stringify(f.del));
      check('A3', 'and there is no note on a clean picture', f.capsNote.length === 0, JSON.stringify(f.capsNote));

      // B. THE BAD PICTURE, with the same tab and the same baseline.
      shellWrite('post.md', BAD);
      await sleep(1500);
      await until(cdp, docSettled, 20000);
      await sleep(900);
      f = await face(cdp);
      readings.bad = f;
      const wholeParagraph = f.ins.some((t) => t.includes('After thousands of hours working this way') && t.length > 200);
      note('B1', 'what the bad picture drew', JSON.stringify({ changes: f.changes, del: f.del.map((t) => t.slice(0, 60)), ins: f.ins.map((t) => t.slice(0, 60)) }));
      check('B2', 'the paragraph below is drawn WHOLE in green, which is his picture', wholeParagraph, `ins runs ${String(f.ins.length)}`);
      note('B3', 'every ed-note on the face at that moment', JSON.stringify(f.notes));
      check('B4', 'THE FINDING: nothing on the face says a block was drawn whole', f.capsNote.length === 0, JSON.stringify(f.capsNote));
      const badNoteText = f.capsNote[0] ?? null;
      const badDrawsWhole = wholeParagraph;

      // C. THE CONTROL: a block the character budget really skips.
      shellWrite('big.md', BIG_NEW);
      f = await openRedline(cdp, 'big.md');
      readings.big = f;
      note('C1', 'every ed-note on the cap case', JSON.stringify(f.notes));
      const capNote = f.notes.find((n) => typeof n.text === 'string' && n.text.includes('drawn whole')) ?? null;
      check('C2', 'the caps note IS drawn when a block is really skipped', capNote !== null, JSON.stringify(f.capsNote));
      if (capNote !== null) {
        note('C3', 'where the note sits', JSON.stringify({ insideDoc: capNote.insideDoc, rect: capNote.rect, onScreen: capNote.onScreen, innerHeight: f.innerHeight }));
        check('C4', 'and it is on screen rather than scrolled away with the document', capNote.onScreen === true && capNote.insideDoc === false, JSON.stringify({ onScreen: capNote.onScreen, insideDoc: capNote.insideDoc }));
      }

      const grade = { capNoteText: capNote?.text ?? null, badNoteText, badDrawsWhole };
      readings.grade = grade;
      const bad = gradeNotes(grade);
      check('C5', 'THE WHOLE ARM: the note path works, and the operator’s picture does not reach it', bad.length === 0, bad.length === 0 ? JSON.stringify(grade) : bad.join('; '));
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
