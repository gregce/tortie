#!/usr/bin/env node
/**
 * probe-p237-attack3.mjs. The verifier's THIRD drive for Phase 237: four
 * questions the first two runs raised and could not answer.
 *
 *  R1/R2. THE REWIND PRESSED INSIDE THE WINDOW THE FIRST KEYSTROKE OPENS.
 *     `useRedlineTyping` marks the tab dirty only AFTER `ensureWorkingModel`
 *     has resolved, and on a redline that has never had a File view that
 *     await is a dynamic import of monaco. `pressRedline` refuses a rewind on
 *     `tab.dirty`, so inside that window a rewind is NOT refused, writes the
 *     file, and the view keeps a current side that never saw it — after which
 *     ⌘S puts the un-rewound text back. R1 presses in the same tick as the
 *     first keystroke, R2 fifty milliseconds after it, and both read the disk.
 *  R4. THE BUILDER'S OWN FIRST DEFECT, CONFIRMED INDEPENDENTLY. Dirty is now
 *     tracked in the model's listener, so ⌘Z back to the saved bytes makes the
 *     tab clean again and `refreshRepo` starts re-reading it. Type, take it
 *     back with ⌘Z, then land an outside write and see whether it reaches the
 *     face.
 *  R5. ⌘Z WITH NOTHING TYPED. The capture handler returns without
 *     `preventDefault()` when no working model exists, so the Edit menu's own
 *     `{ role: 'undo' }` accelerator reaches the contenteditable. Press it on
 *     a resting redline and read both projections afterwards.
 *
 * Same safety rules as the other two: scratch home, scratch profile, scratch
 * project, one Electron through build/electron-run.mjs, no session, no agent,
 * no token, no keychain, no machine, no pasteboard, `-L gmux` read once.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cdpEval, wsConnect } from './cdp-client.mjs';
import { withElectron } from './electron-run.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (l) => process.stdout.write(`${l}\n`);
function refuse(m) { process.stderr.write(`probe-p237-attack3: ${m}\n`); process.exit(2); }
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '' || socket === 'gmux' || socket === 'default' || !socket.startsWith('gmux-')) refuse(`GMUX_TMUX_SOCKET is "${socket}".`);
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('GMUX_HARNESS_DIR is not set.');
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) refuse('no build under out/.');

function operatorSessions() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' });
  return (out.stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
}
const sessionsBefore = operatorSessions();

mkdirSync(join(harnessDir, 'p237v3'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p237v3'));
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
const AGENT = BASELINE.replace('disposable client', 'throwaway viewer').replace('reconstructed from memory', 'rebuilt from notes');
writeFileSync(FILE, BASELINE);
for (const argv of [
  ['init', '-q', '-b', 'main'],
  ['add', '-A'],
  ['-c', 'user.email=p237v@example.invalid', '-c', 'user.name=p237 verifier', 'commit', '-q', '-m', 'fixture']
]) spawnSync('git', argv, { cwd: project, encoding: 'utf8' });
writeFileSync(FILE, AGENT);
const onDisk = () => readFileSync(FILE, 'utf8');

const failures = [];
const check = (p, c, d) => { say(`  ${p ? 'ok  ' : 'FAIL'} ${c}${d === undefined ? '' : ` — ${d}`}`); if (!p) failures.push(c); };
const note = (l) => say(`  ..   ${l}`);

async function cdpForAppWindow(timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try { port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim()); } catch { port = 0; }
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
  undoTyping: { key: 'z', code: 'KeyZ', vk: 90, modifiers: 4 },
  next: { key: 'ArrowDown', code: 'ArrowDown', vk: 40, modifiers: 1 },
  rewind: { key: 'Backspace', code: 'Backspace', vk: 8, modifiers: 1 }
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
const read = async (cdp) => JSON.parse(await cdpEval(cdp, `JSON.stringify(window.__v237.read('live'))`, 30_000));

await withElectron(
  {
    label: 'p237v3',
    userDataDir: profile,
    tmuxSocket: null,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: { HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' },
    ceilingMs: 15 * 60 * 1000
  },
  async () => {
    const { cdp, url } = await cdpForAppWindow(90_000);
    say(`p237v3: app window at ${url}`);
    await cdp.call('Runtime.enable');
    for (;;) {
      if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
      await sleep(50);
    }
    async function openRedline() {
      await cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify({ projectPath: project, openRel: REL, mode: 'diff', editorMode: 'redline' })}).then(() => true)`, 90_000);
      if (!(await waitFor(cdp, `document.querySelector('.ed-redline-doc') !== null`, 40_000))) throw new Error('the redline never drew');
      await cdpEval(cdp, HELPERS, 20_000);
      await sleep(700);
    }
    const clean = () => waitFor(cdp, `!(document.querySelector('.ed-redline-since .banner-text')?.textContent ?? '').includes('unsaved')`, 20_000);

    await openRedline();
    const monacoLoadedAtRest = await cdpEval(cdp, `document.querySelector('.monaco-editor') !== null`, 20_000);
    note(`monaco is mounted before any keystroke: ${String(monacoLoadedAtRest)}`);

    // ---- R1. the rewind pressed in the SAME TICK as the first keystroke ----
    say('\nR1. a rewind pressed in the same tick as the very first keystroke, before any buffer exists');
    writeFileSync(FILE, AGENT);
    await waitFor(cdp, `window.__v237.read('live').current === ${JSON.stringify(AGENT)}`, 20_000);
    await cdpEval(cdp, `window.__v237.put('live', ${String(AGENT.indexOf('throwaway'))})`, 20_000);
    await sleep(300);
    // The chord acts on the change under focus, so focus one first.
    await cdpEval(cdp, `document.querySelector('.ed-redline-scroll')?.focus()`, 20_000);
    await press(cdp, CHORD.next);
    await sleep(300);
    await cdpEval(cdp, `window.__v237.put('live', ${String(AGENT.indexOf('throwaway') + 2)})`, 20_000);
    await sleep(200);
    const typing = typeChar(cdp, 'A');
    const rewinding = press(cdp, CHORD.rewind);
    await typing;
    await rewinding;
    await sleep(2500);
    const r1disk = onDisk();
    const r1 = await read(cdp);
    note(`disk after: rewound=${String(!r1disk.includes('throwaway viewer'))}, holds the typed A=${String(r1disk.includes('Athrowaway') || r1disk.includes('thrAowaway'))}`);
    note(`the face's current side holds the typed A: ${String(r1.current.includes('A'))}`);
    note(`the face says: ${JSON.stringify((r1.since ?? '').slice(-60))}`);
    note(`toast: ${JSON.stringify(r1.toast.slice(0, 160))}`);
    const r1Rewound = !r1disk.includes('throwaway viewer');
    if (r1Rewound) {
      // The dangerous shape: the rewind is on disk and the view never saw it.
      const viewSawIt = !r1.current.includes('throwaway viewer');
      check(viewSawIt, 'R1 if the rewind wrote, the view shows the rewound text (otherwise ⌘S will undo it)', `view current holds "throwaway viewer": ${String(!viewSawIt)}`);
      if (!viewSawIt) {
        await press(cdp, CHORD.save);
        await clean();
        await sleep(600);
        note(`AFTER ⌘S the rewind is ${onDisk().includes('throwaway viewer') ? 'GONE from disk' : 'still on disk'}`);
      }
    } else {
      check(true, 'R1 the rewind did not write, so nothing could be undone by a later save', 'refused or lost the race');
    }

    // ---- R2. the same, fifty milliseconds apart --------------------------
    say('\nR2. the same, with fifty milliseconds between the keystroke and the chord');
    await press(cdp, CHORD.save);
    await clean();
    writeFileSync(FILE, AGENT);
    await waitFor(cdp, `window.__v237.read('live').current === ${JSON.stringify(AGENT)}`, 25_000);
    await cdpEval(cdp, `document.querySelector('.ed-redline-scroll')?.focus()`, 20_000);
    await press(cdp, CHORD.next);
    await sleep(300);
    await cdpEval(cdp, `window.__v237.put('live', ${String(AGENT.indexOf('throwaway') + 2)})`, 20_000);
    await sleep(200);
    await typeChar(cdp, 'B');
    await sleep(50);
    await press(cdp, CHORD.rewind);
    await sleep(2500);
    const r2disk = onDisk();
    const r2 = await read(cdp);
    note(`disk after: rewound=${String(!r2disk.includes('throwaway viewer'))}`);
    note(`toast: ${JSON.stringify(r2.toast.slice(0, 160))}`);
    check(
      r2disk.includes('throwaway viewer'),
      'R2 a rewind fifty milliseconds after a keystroke is REFUSED, because the tab is dirty by then',
      `disk still holds the agent's words: ${String(r2disk.includes('throwaway viewer'))}`
    );

    // ---- R4. ⌘Z back to clean, then an outside write ----------------------
    say('\nR4. ⌘Z back to the saved bytes, then an outside write: does the face start listening again?');
    await press(cdp, CHORD.save);
    await clean();
    writeFileSync(FILE, AGENT);
    await waitFor(cdp, `window.__v237.read('live').current === ${JSON.stringify(AGENT)}`, 25_000);
    await cdpEval(cdp, `window.__v237.put('live', ${String(AGENT.indexOf('throwaway'))})`, 20_000);
    await sleep(200);
    for (const c of 'zzz') { await typeChar(cdp, c); await sleep(60); }
    await sleep(600);
    const dirtyNow = await cdpEval(cdp, `(document.querySelector('.ed-redline-since .banner-text')?.textContent ?? '').includes('unsaved')`, 20_000);
    check(dirtyNow === true, 'R4 typing really made the tab dirty and the face says so');
    for (let i = 0; i < 6; i += 1) { await press(cdp, CHORD.undoTyping); await sleep(250); }
    await sleep(800);
    const backToClean = await clean();
    const afterUndo = await read(cdp);
    check(backToClean === true && afterUndo.current === AGENT, 'R4 ⌘Z took every character back and the tab is clean again', JSON.stringify(afterUndo.current.slice(AGENT.indexOf('throwaway') - 4, AGENT.indexOf('throwaway') + 6)));
    const OUT4 = AGENT.replace('closing the window is safe', 'closing the window is perfectly safe');
    writeFileSync(FILE, OUT4);
    const reached = await waitFor(cdp, `window.__v237.read('live').current.includes('perfectly safe')`, 20_000);
    check(reached, "R4 and an outside write reaches the face again, so the tab is not stuck dirty for ever");

    // ---- R5. ⌘Z with nothing typed ----------------------------------------
    say('\nR5. ⌘Z on a resting redline, where the capture handler has no model to undo');
    writeFileSync(FILE, AGENT);
    await waitFor(cdp, `window.__v237.read('live').current === ${JSON.stringify(AGENT)}`, 25_000);
    await cdpEval(cdp, `window.__v237.put('live', ${String(AGENT.indexOf('throwaway'))})`, 20_000);
    await sleep(300);
    const before5 = await read(cdp);
    for (let i = 0; i < 3; i += 1) { await press(cdp, CHORD.undoTyping); await sleep(300); }
    await sleep(700);
    const after5 = await read(cdp);
    check(after5.baseline === before5.baseline && after5.current === before5.current, 'R5 ⌘Z with nothing typed changed neither projection');
    check(after5.divs === 0 && after5.brs === 0, `R5 and it made no div and no br (${String(after5.divs)}, ${String(after5.brs)})`);
    check(onDisk() === AGENT, 'R5 and it wrote nothing');

    cdp.close();
  }
);

say('\n=== the operator’s own server ===');
const sessionsAfter = operatorSessions();
check(sessionsAfter === sessionsBefore, `the session count on -L gmux did not move (${String(sessionsBefore)} then ${String(sessionsAfter)})`);

if (failures.length > 0) {
  say(`\nprobe-p237-attack3: ${String(failures.length)} check(s) failed:`);
  for (const l of failures) say(`  - ${l}`);
  process.exit(1);
}
say('\nprobe-p237-attack3: every check passed.');
process.exit(0);
