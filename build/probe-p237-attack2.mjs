#!/usr/bin/env node
/**
 * probe-p237-attack2.mjs. The verifier's SECOND drive for Phase 237, which
 * answers the three questions the first one left open.
 *
 *  1. THE PARENT MEASUREMENT for the one loss the attack found. `save` and
 *     `refreshRepo` in src/renderer/editor/tab-io.ts are BYTE IDENTICAL to the
 *     parent commit (`git diff 33895786..HEAD -- tab-io.ts` is empty), so File
 *     mode at HEAD is the parent's behaviour for that code path. The same
 *     sequence is driven in File mode and in Redline mode in ONE run, so the
 *     two readings are taken by the same code on the same machine in the same
 *     minute and the question "is this new?" is answered rather than argued.
 *  2. D.2's TRAP 2 driven with a caret the KEYBOARD really put at the right
 *     edge of a deletion, being one ArrowRight from just before it, rather
 *     than a Range placed inside a contenteditable=false island, which
 *     Chromium normalises somewhere else. The first drive read that
 *     normalisation and not the trap.
 *  3. TRAP 5's criterion corrected: what D.2 measured is that a pasted
 *     `<del>` becomes a REAL deletion and the BASELINE grows. The number of
 *     drawn deletion runs is not that, because a legitimate insertion
 *     re-diffs and can produce one more run on its own.
 *
 * Same safety rules as probe-p237-attack.mjs: scratch home, scratch profile,
 * scratch project, one Electron through build/electron-run.mjs, no session, no
 * agent, no token, no keychain, no machine, no pasteboard, `-L gmux` read once.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cdpEval, wsConnect } from './cdp-client.mjs';
import { withElectron } from './electron-run.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (line) => process.stdout.write(`${line}\n`);
function refuse(m) {
  process.stderr.write(`probe-p237-attack2: ${m}\n`);
  process.exit(2);
}
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '' || socket === 'gmux' || socket === 'default' || !socket.startsWith('gmux-')) {
  refuse(`GMUX_TMUX_SOCKET is "${socket}".`);
}
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('GMUX_HARNESS_DIR is not set.');
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) refuse('no build under out/.');

function operatorSessions() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' });
  return (out.stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
}
const sessionsBefore = operatorSessions();

mkdirSync(join(harnessDir, 'p237v2'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p237v2'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
for (const d of [home, profile, project]) mkdirSync(d, { recursive: true });

const REL = 'notes.txt';
const FILE = join(project, REL);
const BASELINE =
  'Tortie keeps every session alive in a private tmux server, so closing the window is safe.\n' +
  '\n' +
  'The application is a disposable client: it attaches to whatever is already running, draws\n' +
  'it, and gets out of the way. When you come back the agent still knows what it was doing.\n' +
  '\n' +
  'Nothing you were waiting on has to be reconstructed from memory.\n';
const AGENT = BASELINE.replace('disposable client', 'throwaway viewer').replace(
  'reconstructed from memory',
  'rebuilt from notes'
);
writeFileSync(FILE, BASELINE);
for (const argv of [
  ['init', '-q', '-b', 'main'],
  ['add', '-A'],
  ['-c', 'user.email=p237v@example.invalid', '-c', 'user.name=p237 verifier', 'commit', '-q', '-m', 'fixture']
]) spawnSync('git', argv, { cwd: project, encoding: 'utf8' });
writeFileSync(FILE, AGENT);
const onDisk = () => readFileSync(FILE, 'utf8');

const failures = [];
const check = (pass, claim, detail) => {
  say(`  ${pass ? 'ok  ' : 'FAIL'} ${claim}${detail === undefined ? '' : ` — ${detail}`}`);
  if (!pass) failures.push(claim);
};
const note = (l) => say(`  ..   ${l}`);

async function cdpForAppWindow(timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch { port = 0; }
    if (port > 0) {
      let list = [];
      try { list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json(); } catch { list = []; }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl);
          const a = await cdpEval(cdp, `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? location.href : null`, 5000);
          if (typeof a === 'string') return { cdp, url: a };
          cdp.close();
        } catch { if (cdp !== null) { try { cdp.close(); } catch { /* gone */ } } }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no page answered in time');
    await sleep(200);
  }
}

const CHORD = {
  save: { key: 's', code: 'KeyS', vk: 83, modifiers: 4 },
  right: { key: 'ArrowRight', code: 'ArrowRight', vk: 39, modifiers: 0 }
};
async function press(cdp, { key, code, vk, modifiers, text }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  if (text !== undefined) { base.text = text; base.unmodifiedText = text; }
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}
async function typeChar(cdp, ch) {
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, unmodifiedText: ch, key: ch });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
}
async function waitFor(cdp, expr, ms, every = 100) {
  const started = Date.now();
  for (;;) {
    if ((await cdpEval(cdp, expr, 20_000)) === true) return true;
    if (Date.now() - started > ms) return false;
    await sleep(every);
  }
}

const HELPERS = readFileSync(join(REPO, 'build', 'p237-verify-helpers.js'), 'utf8');
const read = async (cdp, which) =>
  JSON.parse(await cdpEval(cdp, `JSON.stringify(window.__v237.read(${JSON.stringify(which)}))`, 30_000));

await withElectron(
  {
    label: 'p237v2',
    userDataDir: profile,
    tmuxSocket: null,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: { HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' },
    ceilingMs: 15 * 60 * 1000
  },
  async () => {
    const { cdp, url } = await cdpForAppWindow(90_000);
    say(`p237v2: app window at ${url}`);
    await cdp.call('Runtime.enable');
    for (;;) {
      if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
      await sleep(50);
    }

    // =====================================================================
    // 1. THE PARENT MEASUREMENT. File mode first, then Redline mode, the same
    //    sequence, the same fixture, one run.
    // =====================================================================
    async function driveLoss(mode, place, typeIt) {
      writeFileSync(FILE, AGENT);
      await cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify({ projectPath: project, openRel: REL, mode: 'diff', editorMode: mode })}).then(() => true)`, 90_000);
      await sleep(1500);
      await place();
      await typeIt();
      await sleep(600);
      const OUTSIDE = AGENT.replace('closing the window is safe', 'closing the window is entirely safe');
      writeFileSync(FILE, OUTSIDE);
      await sleep(3000);
      const sawIt = readFileSync(FILE, 'utf8') === OUTSIDE;
      await press(cdp, CHORD.save);
      await sleep(2000);
      const after = onDisk();
      return {
        outsideLandedOnDisk: sawIt,
        typedSurvived: after.includes('QQQ'),
        outsideSurvived: after.includes('entirely safe')
      };
    }

    say('\n=== 1. THE PARENT MEASUREMENT: the same loss in File mode, whose save and refreshRepo this phase did not touch ===');
    const fileMode = await driveLoss(
      'file',
      async () => {
        const drew = await waitFor(cdp, `document.querySelector('.monaco-editor .view-lines') !== null`, 40_000);
        if (!drew) throw new Error('File mode never drew a monaco editor');
        // A REAL CLICK, because focusing the textarea by script does not put
        // monaco's own input where a keystroke lands.
        const point = JSON.parse(await cdpEval(cdp, `(() => { const r = document.querySelector('.monaco-editor .view-lines').getBoundingClientRect(); return JSON.stringify({ x: r.left + 40, y: r.top + 8 }); })()`, 20_000));
        for (const type of ['mousePressed', 'mouseReleased']) {
          await cdp.call('Input.dispatchMouseEvent', { type, x: point.x, y: point.y, button: 'left', clickCount: 1, buttons: type === 'mousePressed' ? 1 : 0 });
          await sleep(120);
        }
        await sleep(400);
      },
      async () => {
        for (const c of 'QQQ') { await typeChar(cdp, c); await sleep(80); }
        await sleep(500);
        const drawn = await cdpEval(cdp, `(document.querySelector('.monaco-editor .view-lines')?.textContent ?? '').includes('QQQ')`, 20_000);
        note(`FILE MODE: the editor really shows what was typed: ${String(drawn)}`);
        if (drawn !== true) throw new Error('File mode never took the keystrokes, so the parent measurement would be a fiction');
      }
    );
    check(
      fileMode.typedSurvived,
      `FILE MODE (the parent's code path): what the person typed is on disk (${String(fileMode.typedSurvived)})`
    );
    note(`FILE MODE: the agent's write survived ⌘S: ${String(fileMode.outsideSurvived)}`);

    say('\n=== the same sequence in Redline mode ===');
    await cdpEval(cdp, HELPERS, 20_000);
    const redMode = await driveLoss(
      'redline',
      async () => {
        await waitFor(cdp, `document.querySelector('.ed-redline-doc') !== null`, 30_000);
        await cdpEval(cdp, HELPERS, 20_000);
        await cdpEval(cdp, `window.__v237.put('live', ${String(AGENT.indexOf('throwaway'))})`, 20_000);
        await sleep(300);
      },
      async () => { for (const c of 'QQQ') { await typeChar(cdp, c); await sleep(60); } }
    );
    check(redMode.typedSurvived, `REDLINE MODE: what the person typed is on disk (${String(redMode.typedSurvived)})`);
    note(`REDLINE MODE: the agent's write survived ⌘S: ${String(redMode.outsideSurvived)}`);
    check(
      fileMode.outsideSurvived === redMode.outsideSurvived,
      `THE VERDICT ON THE LOSS: File mode ${fileMode.outsideSurvived ? 'kept' : 'lost'} it and Redline mode ${redMode.outsideSurvived ? 'kept' : 'lost'} it, so it is ${fileMode.outsideSurvived === redMode.outsideSurvived ? 'the SAME behaviour on both surfaces' : 'DIFFERENT and therefore this phase’s'}`
    );

    // =====================================================================
    // 2. TRAP 2, with a caret the keyboard really put at the right edge.
    // =====================================================================
    say('\n=== 2. D.2 TRAP 2, with the caret walked to the right edge of the deletion by a real ArrowRight ===');
    writeFileSync(FILE, AGENT);
    await cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify({ projectPath: project, openRel: REL, mode: 'diff', editorMode: 'redline' })}).then(() => true)`, 90_000);
    await waitFor(cdp, `document.querySelector('.ed-redline-doc') !== null`, 30_000);
    await cdpEval(cdp, HELPERS, 20_000);
    await waitFor(cdp, `window.__v237.read('live').current === ${JSON.stringify(AGENT)}`, 20_000);
    await sleep(400);

    async function trapEdge(which) {
      const span = JSON.parse(await cdpEval(cdp, `JSON.stringify(window.__v237.delSpan(${JSON.stringify(which)}, 6))`, 20_000));
      const before = await read(cdp, which);
      // The caret one character BEFORE the deletion, by a drawn offset the
      // keyboard can reach, then one ArrowRight, which TRAP 1 measured as the
      // press that crosses the whole island at HEAD.
      await cdpEval(cdp, `window.__v237.putDrawn(${JSON.stringify(which)}, ${String(span.start - 1)})`, 20_000);
      await sleep(200);
      const started = await read(cdp, which);
      await press(cdp, CHORD.right);
      await sleep(200);
      const walked = await read(cdp, which);
      await typeChar(cdp, 'Q');
      await sleep(600);
      const after = await read(cdp, which);
      return {
        del: span.text,
        caretBefore: started.caretDrawn,
        caretAfterOnePress: walked.caretDrawn,
        crossedTheIsland: walked.caretDrawn >= span.end,
        baselineExact: after.baseline === before.baseline,
        baselineDelta: after.baseline.length - before.baseline.length,
        qAt: after.current.indexOf('Q'),
        around: after.current.slice(Math.max(0, after.current.indexOf('Q') - 10), after.current.indexOf('Q') + 6),
        insHoldsQ: after.insTexts.some((t) => t.includes('Q'))
      };
    }
    const edgeHead = await trapEdge('live');
    note(`HEAD : ${JSON.stringify(edgeHead)}`);
    await cdpEval(cdp, `window.__v237.plant()`, 20_000);
    await sleep(300);
    const edgePlant = await trapEdge('replica');
    await cdpEval(cdp, `window.__v237.unplant()`, 20_000);
    note(`PLANT: ${JSON.stringify(edgePlant)}`);
    check(
      edgeHead.baselineExact === true,
      `TRAP 2 at HEAD the baseline is untouched by a character typed at the right edge of a deletion (delta ${String(edgeHead.baselineDelta)})`
    );
    check(
      edgeHead.qAt > 0 && edgeHead.insHoldsQ === true,
      `TRAP 2 at HEAD the character landed beside the change and inside an insertion (${JSON.stringify(edgeHead.around)})`
    );
    check(
      edgePlant.baselineExact === false,
      `TRAP 2 the plant really corrupts the baseline (delta ${String(edgePlant.baselineDelta)}, ${JSON.stringify(edgePlant.around)})`
    );

    // =====================================================================
    // 3. TRAP 5, with the criterion D.2 actually measured.
    // =====================================================================
    say('\n=== 3. D.2 TRAP 5, judged on what D.2 measured: the baseline and the rich elements ===');
    writeFileSync(FILE, AGENT);
    await waitFor(cdp, `window.__v237.read('live').current === ${JSON.stringify(AGENT)}`, 25_000);
    const RICH_HTML = '<b>bold</b> and a <del data-redline-del="">fake deletion</del> too';
    const RICH_TEXT = 'bold and a fake deletion too';
    async function trapRich(which) {
      const before = await read(cdp, which);
      const at = AGENT.indexOf('Nothing you were');
      await cdpEval(cdp, `window.__v237.put(${JSON.stringify(which)}, ${String(at)})`, 20_000);
      await sleep(200);
      const point = JSON.parse(await cdpEval(cdp, `JSON.stringify(window.__v237.pointAt(${JSON.stringify(which)}, ${String(at)}))`, 20_000));
      if (point === null) return { skipped: true };
      const data = { items: [{ mimeType: 'text/html', data: RICH_HTML }, { mimeType: 'text/plain', data: RICH_TEXT }], dragOperationsMask: 1 };
      for (const type of ['dragEnter', 'dragOver', 'drop']) {
        await cdp.call('Input.dispatchDragEvent', { type, x: point.x, y: point.y, data });
        await sleep(150);
      }
      await sleep(700);
      const after = await read(cdp, which);
      return {
        skipped: false,
        baselineExact: after.baseline === before.baseline,
        baselineDelta: after.baseline.length - before.baseline.length,
        richElements: after.bolds,
        currentDelta: after.current.length - before.current.length,
        plainTextLanded: after.current.includes(RICH_TEXT)
      };
    }
    const richHead = await trapRich('live');
    note(`HEAD : ${JSON.stringify(richHead)}`);
    writeFileSync(FILE, AGENT);
    await press(cdp, CHORD.save);
    await sleep(1500);
    writeFileSync(FILE, AGENT);
    await waitFor(cdp, `window.__v237.read('live').current === ${JSON.stringify(AGENT)}`, 25_000);
    await cdpEval(cdp, `window.__v237.plant()`, 20_000);
    await sleep(300);
    const richPlant = await trapRich('replica');
    await cdpEval(cdp, `window.__v237.unplant()`, 20_000);
    note(`PLANT: ${JSON.stringify(richPlant)}`);
    check(
      richHead.baselineExact === true && richHead.richElements === 0 && richHead.currentDelta === RICH_TEXT.length,
      `TRAP 5 at HEAD rich content flattened: baseline delta ${String(richHead.baselineDelta)}, ${String(richHead.richElements)} rich elements, current +${String(richHead.currentDelta)} against ${String(RICH_TEXT.length)} plain characters`
    );
    check(
      richPlant.baselineExact === false || richPlant.richElements > 0,
      `TRAP 5 the plant really takes the markup (baseline delta ${String(richPlant.baselineDelta)}, ${String(richPlant.richElements)} rich elements)`
    );

    cdp.close();
  }
);

say('\n=== the operator’s own server ===');
const sessionsAfter = operatorSessions();
check(sessionsAfter === sessionsBefore, `the session count on -L gmux did not move (${String(sessionsBefore)} then ${String(sessionsAfter)})`);

if (failures.length > 0) {
  say(`\nprobe-p237-attack2: ${String(failures.length)} check(s) failed:`);
  for (const l of failures) say(`  - ${l}`);
  process.exit(1);
}
say('\nprobe-p237-attack2: every check passed.');
process.exit(0);
