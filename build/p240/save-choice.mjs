#!/usr/bin/env node
/**
 * save-choice.mjs. THE PHASE 240 APP RUN: the three answers, pressed.
 *
 * `build/p240/save-loss.mjs` is the PARENT measurement and says what a save
 * destroyed before this phase. This one is its complement: the same sequence
 * at HEAD, with the buttons actually pressed, because a dialog that opens is
 * not yet a dialog that works.
 *
 * One Electron on a scratch profile, a scratch HOME and this script's own tmux
 * socket, over a git repository it builds inside its own scratch directory. It
 * spawns no agent, spends no token, opens no keychain and makes no request.
 * The "agent" writing the file from outside is a plain `/bin/sh` running
 * `cat`, and every byte it writes lands inside the scratch project. The
 * operator's own `-L gmux` sessions are counted before and after, read and
 * never attached.
 *
 * THE SEQUENCE, one file, in the order that keeps each arm's fixture honest:
 *
 *   A. the person types, a shell writes a whole new paragraph from outside,
 *      ⌘S — and the dialog is read off the DOM: its title, its body, its three
 *      buttons in order, which one has focus, and the file UNCHANGED
 *   B. Compare — the tab that opens is read: its name, its read-only band, and
 *      both of its sides, the left being what the shell wrote and the right
 *      being the buffer; the file is still unchanged
 *   C. Cancel — the file is unchanged and the tab is still dirty, so the
 *      person's typing survived being asked about
 *   D. a THIRD writer lands while the dialog is up, then Overwrite — refused,
 *      the same choice offered again, and the third writer's bytes still on
 *      disk. This is the arm the charter says a verifier will attack.
 *   E. Overwrite again — the file now holds what the person typed, the tab is
 *      clean, and nothing was said, because nothing went wrong.
 *
 * THE FIX ROUND ADDED THREE MORE, one per door this phase got wrong, and each
 * of them is a different file so no arm can lean on another's fixture:
 *
 *   F. a SYMBOLIC LINK inside the project. The person types, a shell writes the
 *      link's TARGET from outside, ⌘S — and the same question is asked. At
 *      3efc8db2 this door had no check of any kind and the outside write was
 *      gone with no dialog, no toast and a clean tab, which is issue 16 on a
 *      file that happens to be a link. Overwrite then writes, because the plain
 *      door has no compare-and-swap to offer a second time.
 *   G. a file that is NOT UTF-8, which NOBODY WRITES TO. ⌘S — and the sentence
 *      names the encoding rather than a writer, because the precondition is a
 *      digest of the DECODED text and the channel hashes the RAW BYTES, so the
 *      two can never agree on a file that does not survive the round trip.
 *   H. a DRAFT whose file does not exist, being Phase 63's tab shape. ⌘S — and
 *      the file appears with nothing said. At 3efc8db2 it was refused `missing`
 *      and a person read "it is no longer on disk" about a file that had never
 *      been there. NOTHING IN THIS TREE EMITS A DRAFT OPEN TODAY: Architecture's
 *      "Draft a contract" has main write the seed files itself, so this arm
 *      dispatches the open request the way an emitter would and the shape is a
 *      capability rather than a regression a person met. It is a `.txt` and not
 *      a `.md` because a markdown tab opens in PREVIEW, which has no Monaco
 *      model, and `save` returns false in silence without one — at the parent
 *      exactly as here.
 *
 * SAFETY. The Electron is started through build/electron-run.mjs, which ends
 * the tree it started in a `finally` whatever happened. The socket is handed
 * in by build/harness-socket.mjs and `gmux` and `default` are refused by name.
 * Every other process this script starts is a synchronous `git` or `/bin/sh`
 * that has exited before the call returns. `--self-test` proves the grader on
 * fixtures and launches nothing.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p240-choice]';
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// The grader. Each arm answers a set of facts; this says which are wrong.
// ---------------------------------------------------------------------------
/** Every [label, got, want] that disagrees. */
function grade(rows) {
  return rows
    .filter(([, got, want]) => JSON.stringify(got) !== JSON.stringify(want))
    .map(([label, got, want]) => `${label}: ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}

function selfTest() {
  const fixtures = [
    ['all agree', [['a', 1, 1], ['b', 'x', 'x']], 0],
    ['one number wrong', [['a', 2, 1]], 1],
    ['one string wrong', [['a', 'y', 'x']], 1],
    ['arrays compare by value', [['a', ['p', 'q'], ['p', 'q']]], 0],
    ['array order matters', [['a', ['q', 'p'], ['p', 'q']]], 1],
    ['booleans', [['a', false, true], ['b', true, true]], 1],
    ['null is not undefined', [['a', null, undefined]], 1]
  ];
  let ok = true;
  for (const [label, rows, want] of fixtures) {
    const got = grade(rows).length;
    const good = got === want;
    ok = ok && good;
    say(`${good ? 'ok  ' : 'BAD '} ${label}: ${String(got)} finding(s), want ${String(want)}`);
  }
  say(ok ? 'self-test PASS' : 'self-test FAIL');
  return ok;
}
if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// The socket wrapper.
// ---------------------------------------------------------------------------
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(
    process.execPath,
    [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', `gmux-p240c-${process.pid}`, `node ${process.argv[1]}`],
    { cwd: REPO, stdio: 'inherit' }
  );
  process.exit(w.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') {
  console.error(`${TAG} refusing socket ${socket}`);
  process.exit(2);
}
const harnessDir = process.env['GMUX_HARNESS_DIR'] ?? '';
if (harnessDir === '') { console.error(`${TAG} no GMUX_HARNESS_DIR`); process.exit(2); }
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} out/main/index.js is missing. Run npm run build.`);
  process.exit(2);
}

const operatorCount = () =>
  (spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' }).stdout ?? '')
    .split('\n').filter((l) => l.trim() !== '').length;
const opBefore = operatorCount();

mkdirSync(join(harnessDir, 'p240c'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p240c'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
for (const d of [home, profile, project]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }

const git = (...a) => {
  const r = spawnSync('git', a, { cwd: project, encoding: 'utf8', env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' } });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout;
};
/** A plain shell writes the file from outside; the charter's word for an agent. */
const shellWrite = (rel, text) => {
  const r = spawnSync('/bin/sh', ['-c', 'cat > "$1"', 'sh', join(project, rel)], { input: text, encoding: 'utf8' });
  if (r.status !== 0) throw new Error('shell write failed');
};
const disk = (rel) => readFileSync(join(project, rel), 'utf8');

const para = (n, w) => `Paragraph ${n} of the notes, ${w}, keeps going for a while so that the document has a body worth reading and a sentence that can change.`;
const V1 = ['The quick brown fox jumped over the lazy dog.', '', para(1, 'first'), '', para(2, 'second'), '', para(3, 'third'), ''].join('\n');
const AGENT_1 = `\n${para(4, 'written by the agent while you were typing')}\n`;
const AGENT_2 = `\n${para(5, 'written by a THIRD writer while the question was on screen')}\n`;
const V_AGENT = V1 + AGENT_1;
const V_THIRD = V_AGENT + AGENT_2;
const TYPED = 'PERSON ';

writeFileSync(join(project, 'notes.txt'), V1);
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p240@example.invalid');
git('config', 'user.name', 'p240');
git('add', '.');
git('commit', '-q', '-m', 'first');

// ---------------------------------------------------------------------------
// Readers.
// ---------------------------------------------------------------------------
/** The dialog, read off the DOM exactly as a person meets it. */
const DIALOG = `(() => {
  const modal = document.querySelector('.modal[role="alertdialog"]');
  if (!modal) return { open: false };
  const buttons = Array.from(modal.querySelectorAll('.modal-actions button'));
  return {
    open: true,
    title: modal.querySelector('.modal-title')?.textContent ?? null,
    body: modal.querySelector('.modal-body')?.textContent ?? null,
    buttons: buttons.map((b) => (b.textContent ?? '').trim()),
    focused: (document.activeElement && document.activeElement.textContent || '').trim(),
    destructive: buttons.some((b) => b.classList.contains('btn-destructive'))
  };
})()`;

/** The active tab, its two sides, and everything the face is saying. */
const FACE = `(() => {
  const fiberTab = (el) => {
    if (!el) return null;
    const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
    let f = key ? el[key] : null;
    while (f) {
      const t = f.memoizedProps && f.memoizedProps.tab;
      if (t && typeof t === 'object' && 'savedContents' in t) return t;
      f = f.return;
    }
    return null;
  };
  const tab = fiberTab(document.querySelector('[role="tab"][aria-selected="true"]'));
  return {
    tabName: document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim() ?? null,
    isCompare: tab ? tab.compare !== undefined : null,
    left: tab ? tab.headContents : null,
    right: tab ? tab.savedContents : null,
    mode: tab ? tab.mode : null,
    modeButtons: Array.from(document.querySelectorAll('.ed-tabs-actions .ed-mode [role="radio"]')).map((b) => b.getAttribute('aria-label')),
    banners: Array.from(document.querySelectorAll('.banner-text')).map((b) => (b.textContent ?? '').trim()),
    toasts: Array.from(document.querySelectorAll('.toasts .toast')).map((t) => (t.textContent ?? '').trim()),
    dirtyOnFace: document.querySelector('[role="tab"][aria-selected="true"] .ed-tab-close.dirty') !== null,
    tabNames: Array.from(document.querySelectorAll('[role="tab"]')).map((t) => (t.textContent ?? '').trim())
  };
})()`;

const clickButton = (label) => `(() => {
  const b = Array.from(document.querySelectorAll('.modal[role="alertdialog"] .modal-actions button'))
    .find((x) => (x.textContent ?? '').trim() === ${JSON.stringify(label)});
  if (!b) return false;
  b.click();
  return true;
})()`;
const clickTab = (needle) => `(() => {
  const t = Array.from(document.querySelectorAll('[role="tab"]'))
    .find((x) => (x.textContent ?? '').includes(${JSON.stringify(needle)}));
  if (!t) return false;
  t.click();
  return true;
})()`;
const monacoUp = `document.querySelector('.monaco-editor .view-lines') !== null`;

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
        } catch { if (cdp) { try { cdp.close(); } catch { /* already closed */ } } }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window');
    await sleep(200);
  }
}
const until = async (cdp, expr, ms) => { const s = Date.now(); for (;;) { if ((await cdpEval(cdp, expr, 10000)) === true) return true; if (Date.now() - s > ms) return false; await sleep(80); } };
const drive = (cdp, spec) => cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify(spec)}).then(() => true)`, 60000);
async function press(cdp, { key, code, vk, modifiers, text }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  await cdp.call('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', ...base, ...(text ? { text, unmodifiedText: text } : {}) });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}
const CMD_S = { key: 's', code: 'KeyS', vk: 83, modifiers: 4 };
const CMD_UP = { key: 'ArrowUp', code: 'ArrowUp', vk: 38, modifiers: 4 };
const ESCAPE = { key: 'Escape', code: 'Escape', vk: 27, modifiers: 0 };
const typeInto = async (cdp, word) => {
  for (const ch of word) {
    await press(cdp, { key: ch, code: ch === ' ' ? 'Space' : 'Key' + ch.toUpperCase(), vk: ch === ' ' ? 32 : ch.toUpperCase().charCodeAt(0), modifiers: 0, text: ch });
    await sleep(30);
  }
};
async function clickFirstLine(cdp, selector) {
  const box = await cdpEval(cdp, `(() => { const l = document.querySelector(${JSON.stringify(selector)}); if (!l) return null; const r = l.getBoundingClientRect(); return { x: r.left + 3, y: r.top + r.height / 2 }; })()`);
  if (box === null) return false;
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y });
  await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await sleep(200);
  return true;
}

const findings = {};
const problems = [];
const out = join(root, 'readings.json');

await withElectron(
  {
    label: 'p240-choice',
    userDataDir: profile,
    tmuxSocket: null,
    cwd: REPO,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }),
    ceilingMs: 12 * 60 * 1000
  },
  async (handle) => {
    const { cdp, url } = await cdpForAppWindow(60000);
    say(`app window at ${url}, pid ${handle.appPid()}`);
    try {
      await cdp.call('Runtime.enable');
      await cdp.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      for (;;) { if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break; await sleep(50); }
      await drive(cdp, { projectPath: project });
      await sleep(1500);

      // ------------------------------------------------------------- ARM A
      await drive(cdp, { projectPath: project, openRel: 'notes.txt', mode: 'file', editorWidth: 1100 });
      await until(cdp, monacoUp, 20000);
      await sleep(800);
      await clickFirstLine(cdp, '.monaco-editor .view-line');
      await press(cdp, CMD_UP);
      await typeInto(cdp, TYPED);
      await until(cdp, `document.querySelector('[role="tab"][aria-selected="true"] .ed-tab-close.dirty') !== null`, 8000);
      const BUFFER = TYPED + V1;

      shellWrite('notes.txt', V_AGENT);
      await sleep(6000); // several watcher ticks; a dirty tab is skipped
      await press(cdp, CMD_S);
      await until(cdp, `document.querySelector('.modal[role="alertdialog"]') !== null`, 8000);
      const dlg = await cdpEval(cdp, DIALOG, 10000);
      const faceA = await cdpEval(cdp, FACE, 10000);
      findings.A = {
        dialog: dlg,
        diskUnchanged: disk('notes.txt') === V_AGENT,
        stillDirty: faceA.dirtyOnFace,
        toasts: faceA.toasts
      };
      problems.push(...grade([
        ['A the dialog opened', dlg.open, true],
        ['A the title names the file and what happened', dlg.title, "'notes.txt' changed on disk"],
        ['A the body says nothing was saved and points at Compare', dlg.body,
          'Something wrote to it after Tortie read it, so nothing was saved. Compare to see what your version would replace.'],
        ['A three buttons, Overwrite leading-left', dlg.buttons, ['Overwrite', 'Cancel', 'Compare']],
        ['A the default is Compare, not Overwrite', dlg.focused, 'Compare'],
        ['A nothing is painted destructive', dlg.destructive, false],
        ['A the file was not written', findings.A.diskUnchanged, true],
        ['A the typing survives', findings.A.stillDirty, true],
        ['A no toast, because a question is not an error', findings.A.toasts, []]
      ]));
      say(`A: ${JSON.stringify(dlg)}`);

      // ------------------------------------------------------------- ARM B
      await cdpEval(cdp, clickButton('Compare'), 10000);
      await sleep(2500);
      const faceB = await cdpEval(cdp, FACE, 10000);
      findings.B = {
        tabName: faceB.tabName,
        isCompare: faceB.isCompare,
        leftIsTheAgents: faceB.left === V_AGENT,
        rightIsTheBuffer: faceB.right === BUFFER,
        mode: faceB.mode,
        modeButtons: faceB.modeButtons,
        band: faceB.banners.find((b) => b.startsWith('What is on disk')) ?? null,
        diskUnchanged: disk('notes.txt') === V_AGENT,
        tabNames: faceB.tabNames
      };
      problems.push(...grade([
        ['B a compare tab opened', findings.B.isCompare, true],
        ['B it does not wear the file’s own name', findings.B.tabName, 'notes.txt — disk vs yours'],
        ['B the left side is what the shell wrote', findings.B.leftIsTheAgents, true],
        ['B the right side is the buffer', findings.B.rightIsTheBuffer, true],
        ['B it is the diff and offers no other mode', findings.B.mode, 'diff'],
        ['B no mode chip at all', findings.B.modeButtons, []],
        ['B the band says which side is which', findings.B.band,
          'What is on disk now, on the left. Your unsaved version, on the right.'],
        ['B a look writes nothing', findings.B.diskUnchanged, true]
      ]));
      say(`B: ${JSON.stringify(findings.B)}`);

      // ------------------------------------------------------------- ARM C
      await cdpEval(cdp, clickTab('notes.txt —') , 5000); // make sure we leave the compare tab
      await cdpEval(cdp, `(() => { const t = Array.from(document.querySelectorAll('[role="tab"]')).find((x) => (x.textContent ?? '').trim().startsWith('notes.txt') && !(x.textContent ?? '').includes('disk vs yours')); if (!t) return false; t.click(); return true; })()`, 5000);
      await sleep(1200);
      await press(cdp, CMD_S);
      await until(cdp, `document.querySelector('.modal[role="alertdialog"]') !== null`, 8000);
      await press(cdp, ESCAPE);
      await sleep(1200);
      const faceC = await cdpEval(cdp, FACE, 10000);
      findings.C = {
        dialogGone: (await cdpEval(cdp, DIALOG, 10000)).open === false,
        diskUnchanged: disk('notes.txt') === V_AGENT,
        stillDirty: faceC.dirtyOnFace,
        toasts: faceC.toasts
      };
      problems.push(...grade([
        ['C Escape closes the question', findings.C.dialogGone, true],
        ['C the file is untouched', findings.C.diskUnchanged, true],
        ['C the typing survives a Cancel', findings.C.stillDirty, true],
        ['C nothing was said', findings.C.toasts, []]
      ]));
      say(`C: ${JSON.stringify(findings.C)}`);

      // ------------------------------------------------------------- ARM D
      await press(cdp, CMD_S);
      await until(cdp, `document.querySelector('.modal[role="alertdialog"]') !== null`, 8000);
      // A THIRD writer lands while the question is on screen.
      shellWrite('notes.txt', V_THIRD);
      await sleep(400);
      await cdpEval(cdp, clickButton('Overwrite'), 10000);
      await sleep(2500);
      const dlgD = await cdpEval(cdp, DIALOG, 10000);
      const faceD = await cdpEval(cdp, FACE, 10000);
      findings.D = {
        askedAgain: dlgD.open,
        title: dlgD.title,
        diskIsTheThirdWriters: disk('notes.txt') === V_THIRD,
        thirdWritersParagraphSurvives: disk('notes.txt').includes(para(5, 'written by a THIRD writer while the question was on screen')),
        stillDirty: faceD.dirtyOnFace
      };
      problems.push(...grade([
        ['D the third writer is caught, not written over', findings.D.diskIsTheThirdWriters, true],
        ['D its paragraph survives', findings.D.thirdWritersParagraphSurvives, true],
        ['D the same choice is offered again', findings.D.askedAgain, true],
        ['D over the newer bytes', findings.D.title, "'notes.txt' changed on disk"],
        ['D the typing still survives', findings.D.stillDirty, true]
      ]));
      say(`D: ${JSON.stringify(findings.D)}`);

      // ------------------------------------------------------------- ARM E
      await cdpEval(cdp, clickButton('Overwrite'), 10000);
      await sleep(2500);
      const faceE = await cdpEval(cdp, FACE, 10000);
      const after = disk('notes.txt');
      findings.E = {
        diskIsTheBuffer: after === BUFFER,
        head: after.slice(0, 20),
        clean: faceE.dirtyOnFace === false,
        dialogGone: (await cdpEval(cdp, DIALOG, 10000)).open === false,
        toasts: faceE.toasts
      };
      problems.push(...grade([
        ['E the deliberate second act writes', findings.E.diskIsTheBuffer, true],
        ['E it is the person’s own typing that landed', findings.E.head, 'PERSON The quick bro'],
        ['E the tab goes clean', findings.E.clean, true],
        ['E the question is gone', findings.E.dialogGone, true],
        ['E nothing was said, because nothing went wrong', findings.E.toasts, []]
      ]));
      say(`E: ${JSON.stringify(findings.E)}`);

      // ------------------------------------------------------------- ARM F
      // A symbolic link inside the project. `fs:writeGuarded` refuses `link`
      // and will not turn one into a regular file, so this save takes the
      // plain door — which now reads before it writes.
      const TARGET_1 = ['A file something else points at.', '', para(1, 'first'), ''].join('\n');
      writeFileSync(join(project, 'target.txt'), TARGET_1);
      spawnSync('ln', ['-s', 'target.txt', join(project, 'linked.txt')]);
      await drive(cdp, { projectPath: project, openRel: 'linked.txt', mode: 'file', editorWidth: 1100 });
      await until(cdp, monacoUp, 20000);
      await sleep(800);
      await clickFirstLine(cdp, '.monaco-editor .view-line');
      await press(cdp, CMD_UP);
      await typeInto(cdp, TYPED);
      await until(cdp, `document.querySelector('[role="tab"][aria-selected="true"] .ed-tab-close.dirty') !== null`, 8000);
      const TARGET_2 = TARGET_1 + `\n${para(9, 'written into the link’s target from outside')}\n`;
      shellWrite('target.txt', TARGET_2);
      await sleep(6000);
      await press(cdp, CMD_S);
      await until(cdp, `document.querySelector('.modal[role="alertdialog"]') !== null`, 8000);
      const dlgF = await cdpEval(cdp, DIALOG, 10000);
      findings.F = {
        asked: dlgF.open,
        title: dlgF.title,
        targetUntouched: disk('target.txt') === TARGET_2,
        outsideWriteSurvives: disk('target.txt').includes(para(9, 'written into the link’s target from outside'))
      };
      problems.push(...grade([
        ['F a link is asked about rather than written over', findings.F.asked, true],
        ['F and the question names the link', findings.F.title, "'linked.txt' changed on disk"],
        ['F the outside write is still on disk', findings.F.targetUntouched, true],
        ['F its paragraph survives', findings.F.outsideWriteSurvives, true]
      ]));
      // Overwrite on this door is unconditional, and it must still work.
      await cdpEval(cdp, clickButton('Overwrite'), 10000);
      await sleep(2000);
      const faceF = await cdpEval(cdp, FACE, 10000);
      findings.F.overwroteThroughTheLink = disk('target.txt') === TYPED + TARGET_1;
      findings.F.linkIsStillALink = existsSync(join(project, 'linked.txt'));
      findings.F.clean = faceF.dirtyOnFace === false;
      problems.push(...grade([
        ['F Overwrite writes through the link', findings.F.overwroteThroughTheLink, true],
        ['F the link is still there', findings.F.linkIsStillALink, true],
        ['F the tab goes clean', findings.F.clean, true]
      ]));
      say(`F: ${JSON.stringify(findings.F)}`);

      // ------------------------------------------------------------- ARM G
      // A file that is not UTF-8 and that nobody writes to.
      const LATIN = Buffer.from('caf\xe9 na\xefve resum\xe9 and a plain ascii tail\n', 'latin1');
      writeFileSync(join(project, 'latin.txt'), LATIN);
      const latinBefore = readFileSync(join(project, 'latin.txt'));
      await drive(cdp, { projectPath: project, openRel: 'latin.txt', mode: 'file', editorWidth: 1100 });
      await until(cdp, monacoUp, 20000);
      await sleep(800);
      await clickFirstLine(cdp, '.monaco-editor .view-line');
      await press(cdp, CMD_UP);
      await typeInto(cdp, TYPED);
      await until(cdp, `document.querySelector('[role="tab"][aria-selected="true"] .ed-tab-close.dirty') !== null`, 8000);
      await press(cdp, CMD_S);
      await sleep(2500);
      const dlgG = await cdpEval(cdp, DIALOG, 10000);
      const faceG = await cdpEval(cdp, FACE, 10000);
      findings.G = {
        noQuestion: dlgG.open === false,
        toasts: faceG.toasts,
        bytesUnchanged: readFileSync(join(project, 'latin.txt')).equals(latinBefore),
        sizeBefore: latinBefore.length,
        sizeAfter: readFileSync(join(project, 'latin.txt')).length,
        stillDirty: faceG.dirtyOnFace
      };
      problems.push(...grade([
        ['G nothing wrote to it, so it is not asked about', findings.G.noQuestion, true],
        ['G the sentence names the encoding', findings.G.toasts,
          ['Tortie did not save latin.txt, because it is not UTF-8 text and writing it whole would damage it. Nothing was written.']],
        ['G not one byte moved', findings.G.bytesUnchanged, true],
        ['G the file did not grow', findings.G.sizeAfter, findings.G.sizeBefore],
        ['G the typing survives', findings.G.stillDirty, true]
      ]));
      say(`G: ${JSON.stringify(findings.G)}`);

      // ------------------------------------------------------------- ARM H
      // A draft, the shape Phase 63's "Draft a contract" opens: composed text
      // whose file does not exist, dirty from the moment it appears.
      // A .txt rather than a .md ON PURPOSE. A markdown tab opens in PREVIEW,
      // which has no Monaco model, and `save` asks `getWorkingModel(id)` and
      // returns false in silence when there is none — at the parent commit
      // exactly as here, so it is a limit of the preview mode rather than
      // anything this phase touched, and this arm is about the door.
      const DRAFT_REL = 'docs/arch/drafted.txt';
      mkdirSync(join(project, 'docs', 'arch'), { recursive: true });
      const DRAFT_TEXT = 'A drafted contract.\n\nComposed in main, written by nobody yet.\n';
      // G's refusal is a sticky toast and it would still be on screen, so it
      // is dismissed the way a person dismisses it. "Nothing was said" then
      // means nothing, rather than nothing new.
      await cdpEval(cdp, `(() => {
        for (const b of document.querySelectorAll('.toasts .toast button[aria-label="Dismiss"]')) b.click();
        return true;
      })()`, 10000);
      await sleep(400);
      await cdpEval(cdp, `(() => {
        window.dispatchEvent(new CustomEvent('gmux:open-file', { detail: {
          repoPath: ${JSON.stringify(project)},
          relPath: ${JSON.stringify(DRAFT_REL)},
          path: ${JSON.stringify(join(project, DRAFT_REL))},
          mode: 'file',
          source: 'tree',
          preview: false,
          draft: ${JSON.stringify(DRAFT_TEXT)}
        } }));
        return true;
      })()`, 10000);
      await until(
        cdp,
        `(document.querySelector('[role="tab"][aria-selected="true"]')?.textContent ?? '').trim().startsWith('drafted.txt')`,
        20000
      );
      // AND WAIT FOR THE MODEL, not just the tab. `save` asks
      // `getWorkingModel(id)` and returns false in silence when there is
      // none, which is exactly what a tab drawn before Monaco has mounted
      // looks like: no toast, no write, still dirty.
      await until(
        cdp,
        `(document.querySelector('.monaco-editor .view-lines')?.textContent ?? '').includes('A drafted contract')`,
        20000
      );
      await sleep(800);
      await clickFirstLine(cdp, '.monaco-editor .view-line');
      await sleep(400);
      const draftExistedBefore = existsSync(join(project, DRAFT_REL));
      const draftTab = await cdpEval(cdp, `(() => {
        const el = document.querySelector('[role="tab"][aria-selected="true"]');
        const key = el && Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
        let f = key ? el[key] : null;
        while (f) {
          const t = f.memoizedProps && f.memoizedProps.tab;
          if (t && typeof t === 'object' && 'savedContents' in t) {
            return { id: t.id, path: t.path, repoPath: t.repoPath, draft: t.draft, saved: t.savedContents.length, dirty: t.dirty, deleted: t.deleted, truncated: t.truncated, error: t.error, mode: t.mode };
          }
          f = f.return;
        }
        return null;
      })()`, 10000);
      say(`H tab: ${JSON.stringify(draftTab)}`);
      await press(cdp, CMD_S);
      await sleep(2500);
      const dlgH = await cdpEval(cdp, DIALOG, 10000);
      const faceH = await cdpEval(cdp, FACE, 10000);
      findings.H = {
        existedBefore: draftExistedBefore,
        existsAfter: existsSync(join(project, DRAFT_REL)),
        contents: existsSync(join(project, DRAFT_REL)) ? disk(DRAFT_REL) : null,
        noQuestion: dlgH.open === false,
        toasts: faceH.toasts,
        clean: faceH.dirtyOnFace === false
      };
      problems.push(...grade([
        ['H the draft tab is the one on screen', faceH.tabName, 'drafted.txt'],
        ['H it has a model, so a save can reach the door at all', draftTab.mode, 'file'],
        ['H and it really is a draft with nothing read', [draftTab.draft, draftTab.saved], [DRAFT_TEXT, 0]],
        ['H the file was not there', findings.H.existedBefore, false],
        ['H a draft saves', findings.H.existsAfter, true],
        ['H and it holds what was composed', findings.H.contents, DRAFT_TEXT],
        ['H nothing was asked', findings.H.noQuestion, true],
        ['H nothing was said', findings.H.toasts, []],
        ['H the tab goes clean', findings.H.clean, true]
      ]));
      say(`H: ${JSON.stringify(findings.H)}`);
    } finally {
      findings.problems = problems;
      writeFileSync(out, JSON.stringify(findings, null, 2));
      cdp.close();
    }
  }
);

const opAfter = operatorCount();
say(`operator -L gmux sessions ${String(opBefore)} -> ${String(opAfter)}`);
say(`readings written to ${out}`);
console.log(JSON.stringify(findings, null, 2));
if (problems.length > 0) {
  for (const p of problems) process.stderr.write(`${TAG} FINDING ${p}\n`);
  process.stderr.write(`${TAG} FAILED: ${String(problems.length)} finding(s).\n`);
  process.exit(1);
}
say(`PASS: 55 readings across eight arms, 0 findings.`);
process.exit(0);
