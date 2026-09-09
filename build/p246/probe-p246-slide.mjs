#!/usr/bin/env node
/**
 * probe-p246-slide.mjs — PHASE 246's app run, at HEAD.
 *
 * `build/p246/probe-p246-note.mjs` is the same three arms at the PARENT
 * commit, and its banked output is the parent reading this one is held
 * against. That probe FAILS at HEAD ON PURPOSE: its grader asserts the
 * operator's bad picture, being the paragraph below drawn whole in green with
 * nothing said about it, and this phase is the commit that stops that
 * happening. Do not "fix" it; it is the record of what was wrong.
 *
 * WHAT THIS RUN READS, all off the live DOM of the running app:
 *
 *   A. THE GOOD PICTURE, which must be exactly what it was: one marked
 *      change, the word `micro` struck through, and no note. This is the
 *      CONTROL. A fix that improves one picture and moves the other is not a
 *      fix.
 *   B. THE BAD PICTURE, the same tab and the same baseline after a `/bin/sh`
 *      wrote the file from outside: the paragraph he inserted drawn whole in
 *      green, the ONE WORD he changed in the paragraph below struck through,
 *      and that paragraph NOT drawn twice. At the parent this read nine
 *      marked changes with the paragraph below struck through in pieces
 *      interleaved with a paragraph it has nothing to do with.
 *   C. THE CONTROL FOR THE NOTE, so a run that could never see a banner is
 *      not mistaken for one that found none: a block past
 *      REDLINE_MAX_BLOCK_CHARS, which IS counted as a skip and must still say
 *      so. Ruling 4's promise is not what this phase changed.
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
const TAG = '[p246-slide]';
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
 * The grader, proved under --self-test so a reading that could not fail is
 * not mistaken for one that passed. What this phase claims is three things at
 * once: the good picture is untouched, the bad picture marks the one word and
 * draws the inserted paragraph once, and the cap case still says so.
 */
function gradeSlide(r) {
  const bad = [];
  if (r.goodChanges !== 1) bad.push(`the good picture drew ${String(r.goodChanges)} changes, not 1`);
  if (JSON.stringify(r.goodDel) !== JSON.stringify(['micro'])) {
    bad.push(`the good picture struck ${JSON.stringify(r.goodDel)} rather than ["micro"]`);
  }
  if (JSON.stringify(r.badDel) !== JSON.stringify(['micro', 'simple'])) {
    bad.push(`the bad picture struck ${JSON.stringify(r.badDel)} rather than ["micro","simple"]`);
  }
  if (r.badInsCount !== 1) bad.push(`the bad picture drew ${String(r.badInsCount)} insertions, not 1`);
  if (r.badInsIsInsertedParagraph !== true) {
    bad.push('the one insertion is not the paragraph he inserted');
  }
  if (r.badRedrawsParagraphBelow === true) {
    bad.push('the paragraph below is still drawn whole a second time');
  }
  if (r.badNoteText !== null) bad.push(`the bad picture drew a note: ${JSON.stringify(r.badNoteText)}`);
  if (r.capNoteText === null) bad.push('the cap case drew no note, so this run could not see one at all');
  else if (!r.capNoteText.includes('drawn whole')) {
    bad.push(`the cap note is not the caps note: ${JSON.stringify(r.capNoteText)}`);
  }
  return bad;
}

if (process.argv.includes('--self-test')) {
  const OK = {
    goodChanges: 1,
    goodDel: ['micro'],
    badDel: ['micro', 'simple'],
    badInsCount: 1,
    badInsIsInsertedParagraph: true,
    badRedrawsParagraphBelow: false,
    badNoteText: null,
    capNoteText: '1 change drawn whole rather than word by word (1 too long).'
  };
  const cases = [
    ['the picture this phase ships', OK, 0],
    ['the parent commit: the paragraph below drawn in pieces', { ...OK, badDel: ['micro', 'After thousands of hours working this way', 'It’s a simple'], badInsCount: 6, badInsIsInsertedParagraph: false, badRedrawsParagraphBelow: true }, 4],
    ['the good picture moved, which is the thing this phase may not do', { ...OK, goodChanges: 3, goodDel: ['micro', 'simple'] }, 2],
    ['the paragraph below drawn twice', { ...OK, badRedrawsParagraphBelow: true }, 1],
    ['the note path is blind, so a silent bad picture proves nothing', { ...OK, capNoteText: null }, 1],
    ['the bad picture grew a banner it should not have', { ...OK, badNoteText: '1 change drawn whole rather than word by word (1 rewritten).' }, 1],
    ['everything wrong at once', { goodChanges: 0, goodDel: [], badDel: [], badInsCount: 0, badInsIsInsertedParagraph: false, badRedrawsParagraphBelow: true, badNoteText: 'x', capNoteText: null }, 8]
  ];
  let bad = 0;
  for (const [name, reading, want] of cases) {
    const got = gradeSlide(reading).length;
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

mkdirSync(join(harnessDir, 'p246s'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p246s'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
const readingsFile = join(root, 'p246-slide-readings.json');
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
  // THE ONE CORRECTNESS CLAIM, taken off the live DOM rather than off the
  // module: drop every <ins> and the page is the old file, drop every <del>
  // and it is the new one.
  const project = (skip) => {
    const walk = (node) => {
      if (node.nodeType === 3) return node.nodeValue ?? '';
      if (node.nodeType !== 1) return '';
      if (node.tagName === skip) return '';
      let s = '';
      for (const c of node.childNodes) s += walk(c);
      return s;
    };
    return doc === null ? '' : walk(doc);
  };
  return {
    mounted: doc !== null,
    changes: doc === null ? 0 : doc.querySelectorAll('.ed-redline-change').length,
    del, ins,
    oldProjection: project('INS'),
    newProjection: project('DEL'),
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
let grade = null;

await withElectron(
  {
    label: 'p246-slide',
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

      // A. THE GOOD PICTURE. The control, and it must be what it always was.
      shellWrite('post.md', GOOD);
      let f = await openRedline(cdp, 'post.md');
      readings.good = f;
      check('A1', 'the good picture draws one marked change', f.changes === 1, `${f.changes} changes, del=${JSON.stringify(f.del)}`);
      check('A2', 'and the one struck word is his own', JSON.stringify(f.del) === JSON.stringify(['micro']), JSON.stringify(f.del));
      check('A3', 'and there is no note on a clean picture', f.capsNote.length === 0, JSON.stringify(f.capsNote));

      // B. THE BAD PICTURE, same tab, same baseline, written from outside.
      shellWrite('post.md', BAD);
      await sleep(1500);
      await until(cdp, docSettled, 20000);
      await sleep(900);
      f = await face(cdp);
      readings.bad = f;
      const redraw = f.ins.filter((t) => t.includes('After thousands of hours working this way') && t.length > 200);
      note('B1', 'what the bad picture drew', JSON.stringify({ changes: f.changes, del: f.del, ins: f.ins.map((t) => t.slice(0, 60)) }));
      check('B2', 'the ONE WORD he changed is struck through and nothing else is', JSON.stringify(f.del) === JSON.stringify(['micro', 'simple']), JSON.stringify(f.del));
      check('B3', 'the paragraph he inserted is drawn once, whole, in green', f.ins.length === 1 && f.ins[0].includes('What context do agents need?'), JSON.stringify(f.ins.map((t) => t.slice(0, 40))));
      check('B4', 'and the paragraph BELOW is not drawn a second time', redraw.length === 0, `${redraw.length} whole-paragraph insertion(s)`);
      check('B5', 'nothing was skipped, so nothing is said, and now that is the truth', f.capsNote.length === 0, JSON.stringify(f.capsNote));
      check('B6', 'drop every insertion off the live page and it is the old file, byte for byte', f.oldProjection === OLD, `${String(f.oldProjection.length)} against ${String(OLD.length)} bytes`);
      check('B7', 'drop every deletion off the live page and it is the new file, byte for byte', f.newProjection === BAD, `${String(f.newProjection.length)} against ${String(BAD.length)} bytes`);

      // C. THE CONTROL FOR THE NOTE. Ruling 4's promise is untouched.
      shellWrite('big.md', BIG_NEW);
      const g = await openRedline(cdp, 'big.md');
      readings.big = g;
      const capNote = g.notes.find((n) => typeof n.text === 'string' && n.text.includes('drawn whole')) ?? null;
      check('C1', 'the caps note IS still drawn when a block is really skipped', capNote !== null, JSON.stringify(g.capsNote));
      if (capNote !== null) {
        note('C2', 'where the note sits', JSON.stringify({ insideDoc: capNote.insideDoc, rect: capNote.rect, onScreen: capNote.onScreen, innerHeight: g.innerHeight }));
        check('C3', 'and it is on screen rather than scrolled away with the document', capNote.onScreen === true && capNote.insideDoc === false, JSON.stringify({ onScreen: capNote.onScreen, insideDoc: capNote.insideDoc }));
      }

      grade = {
        goodChanges: readings.good.changes,
        goodDel: readings.good.del,
        badDel: readings.bad.del,
        badInsCount: readings.bad.ins.length,
        badInsIsInsertedParagraph: readings.bad.ins.length === 1 && readings.bad.ins[0].includes('What context do agents need?'),
        badRedrawsParagraphBelow: redraw.length > 0,
        badNoteText: readings.bad.capsNote[0] ?? null,
        capNoteText: capNote?.text ?? null
      };
      readings.grade = grade;
      const findings = gradeSlide(grade);
      check('C4', 'THE WHOLE ARM: the word-level picture is back and the good one did not move', findings.length === 0, findings.length === 0 ? JSON.stringify(grade) : findings.join('; '));
    } finally {
      writeFileSync(readingsFile, JSON.stringify(readings, null, 2));
      cdp.close();
    }
  }
);

// The operator's own file was never opened, and nothing under his home was
// written: everything above lives inside GMUX_HARNESS_DIR.
const opAfter = operatorCount();
check('X1', 'operator sessions on -L gmux unmoved', opBefore === opAfter, `${opBefore} -> ${opAfter}`);
say('');
say(`${rows.filter((r) => r.pass === true).length} passed, ${failures.length} failed, ${rows.filter((r) => r.pass === null).length} notes`);
say(`readings at ${readingsFile}`);
if (failures.length > 0) { for (const f of failures) say(`FAILURE: ${f}`); process.exit(1); }
process.exit(0);
