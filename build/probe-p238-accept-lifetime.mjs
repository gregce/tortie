#!/usr/bin/env node
/**
 * probe-p238-accept-lifetime.mjs — PHASE 238's MEASURE STEP, and it measures
 * one thing: HOW MANY ORDINARY ACTS IT TAKES TO LOSE A BASELINE THAT ONLY
 * MEMORY HOLDS, and what a person sees when it goes.
 *
 * ## WHY A BASELINE STANDS IN FOR AN ACCEPT, and it is not an approximation
 *
 * There is no accept in the tree yet; that is the phase this run is measuring
 * for. But research 83 B.3 and B.5 say what an accept IS: it writes THE
 * BASELINE and never the file, so an accept leaves the tab holding a baseline
 * string that exists in no file, in no commit and in no store — exactly the
 * shape an UNTRACKED file's baseline already has today, which
 * `src/renderer/editor/baseline.ts` seeds from the first bytes Tortie read and
 * then never moves however far the disk travels.
 *
 * So the fixture is an UNTRACKED prose file:
 *
 *   1. open it            -> baseline := v1 (BaselineOrigin 'read'), in memory only
 *   2. a shell writes v2  -> the redline draws v1 -> v2 as N changes
 *   3. do one ordinary act
 *   4. bring the file back and count the changes
 *
 * A tab that SURVIVED still draws N changes, because its baseline is still v1.
 * A tab that was destroyed and remade re-seeds its baseline from the bytes on
 * disk, which are now v2, so it draws ZERO. **Zero changes is the detector**,
 * and it fires on precisely the event an accept would die to, because the same
 * field of the same tab object carries both.
 *
 * The direction of the loss differs and the report says so: losing an
 * accept makes marks COME BACK, losing this one makes marks GO. What is
 * measured is identical — whether the tab's `baseline` survived the act.
 *
 * ## SAFETY
 *
 * One Electron, through build/electron-run.mjs, which ends the tree it started
 * in a `finally`. A scratch profile, a scratch HOME and this script's own tmux
 * socket, ended and unlinked by build/harness-socket.mjs; `gmux` and `default`
 * are refused by name and the operator's own -L gmux sessions are counted
 * before and after. No agent, no token, no keychain, no request, no ssh, no
 * machine. Every file written is under GMUX_HARNESS_DIR. The "agent" that
 * writes from outside is a plain /bin/sh running cat.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from './electron-run.mjs';
import { cdpEval, wsConnect } from './cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[p238]';
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

// ---------------------------------------------------------------------------
// The grader, proved under --self-test. A reading says the baseline SURVIVED
// when the redline still draws the marks it drew before the act, and says it
// DIED when the redline is empty while the disk is still different from the
// bytes the baseline was taken at.
// ---------------------------------------------------------------------------
function verdictOf(before, after) {
  if (before === null || after === null) return 'unreadable';
  if (before.changes === 0) return 'no-setup';
  if (after.mounted === false) return 'not-mounted';
  if (after.changes === before.changes && after.docText === before.docText) return 'survived';
  if (after.changes === 0) return 'died';
  return 'moved';
}

if (process.argv.includes('--self-test')) {
  const R = (changes, docText = 'x', mounted = true) => ({ changes, docText, mounted });
  const cases = [
    [verdictOf(R(8), R(8)), 'survived'],
    [verdictOf(R(8), R(0)), 'died'],
    [verdictOf(R(8), R(7, 'y')), 'moved'],
    [verdictOf(R(0), R(0)), 'no-setup'],
    [verdictOf(null, R(0)), 'unreadable'],
    [verdictOf(R(8), null), 'unreadable'],
    [verdictOf(R(8), R(8, 'z')), 'moved'],
    [verdictOf(R(8), { changes: 8, docText: 'x', mounted: false }), 'not-mounted']
  ];
  let bad = 0;
  for (const [got, want] of cases) {
    if (got !== want) { bad += 1; say(`self-test FAIL: got ${got}, want ${want}`); }
  }
  say(`self-test: ${cases.length - bad} of ${cases.length} fixtures behave`);
  process.exit(bad === 0 ? 0 : 1);
}

const socket = process.env['GMUX_TMUX_SOCKET'] ?? '';
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(process.execPath, [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', 'gmux-p238', `node ${process.argv[1]}`], { cwd: REPO, stdio: 'inherit' });
  process.exit(w.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') { console.error(`${TAG} refusing socket ${socket}`); process.exit(2); }
const harnessDir = process.env['GMUX_HARNESS_DIR'] ?? '';
if (harnessDir === '') { console.error(`${TAG} no GMUX_HARNESS_DIR`); process.exit(2); }
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) { console.error(`${TAG} out/main/index.js is missing. Run npm run build.`); process.exit(2); }

const operatorCount = () => (spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' }).stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
const opBefore = operatorCount();
say(`operator sessions on -L gmux before: ${opBefore}`);

mkdirSync(join(harnessDir, 'p238'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p238'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
const readingsFile = join(root, 'p238-readings.json');
for (const d of [home, profile, project]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }

const git = (...a) => {
  const r = spawnSync('git', a, { cwd: project, encoding: 'utf8', env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' } });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout;
};
const shellWrite = (rel, text) => {
  const r = spawnSync('/bin/sh', ['-c', 'cat > "$1"', 'sh', join(project, rel)], { input: text, encoding: 'utf8' });
  if (r.status !== 0) throw new Error('shell write failed');
};

// Prose with several distinct one-word changes per version, so a redline has
// a change count that is stable and easy to read.
const WORDS = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliett'];
const version = (n) => {
  const out = [];
  for (let i = 0; i < 8; i += 1) {
    out.push(`Paragraph ${i + 1} of the draft, whose marker word is ${WORDS[(i + n) % WORDS.length]} and whose body carries enough sentences to make the document worth scrolling through when it is read.`);
    out.push('');
  }
  return out.join('\n');
};

// The FIXTURE. `draft.txt` is UNTRACKED on purpose (see the header): its
// baseline is the first bytes read and lives nowhere else, which is the shape
// an accepted baseline has.
writeFileSync(join(project, 'draft.txt'), version(0));
// Twelve committed filler files, which is what an afternoon opens.
for (let i = 1; i <= 12; i += 1) writeFileSync(join(project, `filler${String(i).padStart(2, '0')}.txt`), `Filler ${i}\n\nA committed prose file with nothing interesting in it.\n`);
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p238@example.invalid');
git('config', 'user.name', 'p238');
git('add', '--', ...Array.from({ length: 12 }, (_, i) => `filler${String(i + 1).padStart(2, '0')}.txt`));
git('commit', '-q', '-m', 'fillers');

// ---------------------------------------------------------------------------
// The reads, all off the LIVE DOM.
// ---------------------------------------------------------------------------
const FACE = `(() => {
  const doc = document.querySelector('.ed-redline-doc');
  const view = document.querySelector('.ed-redline-view');
  const tabs = Array.from(document.querySelectorAll('.ed-tab')).map((t) => ({
    name: (t.querySelector('.ed-tab-name')?.textContent ?? ''),
    preview: t.querySelector('.ed-tab-name')?.classList.contains('preview') ?? null,
    active: t.classList.contains('active')
  }));
  const modes = Array.from(document.querySelectorAll('.ed-mode[role="radiogroup"] .ed-mode-opt')).map((b) => ({
    label: b.getAttribute('aria-label'), on: b.getAttribute('aria-checked') === 'true' || b.classList.contains('on'), disabled: b.disabled
  }));
  return {
    mounted: doc !== null,
    changes: doc === null ? 0 : doc.querySelectorAll('.ed-redline-change').length,
    dels: doc === null ? 0 : doc.querySelectorAll('del').length,
    ins: doc === null ? 0 : doc.querySelectorAll('ins').length,
    docText: doc === null ? null : doc.textContent,
    since: document.querySelector('.ed-redline-since .banner-text')?.textContent ?? null,
    notes: Array.from(document.querySelectorAll('.ed-redline-view .ed-note .banner-text')).map((n) => n.textContent),
    toasts: Array.from(document.querySelectorAll('.toasts .toast-text')).map((t) => t.textContent ?? ''),
    tabCount: tabs.length,
    tabs,
    modes,
    skeleton: view !== null && view.querySelector('.ed-skeleton') !== null
  };
})()`;

const clickMode = (label) => `(() => { const b = document.querySelector('.ed-mode[role=\"radiogroup\"] [aria-label="${label}"]'); if (!b || b.disabled) return false; b.click(); return true; })()`;
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

const until = async (cdp, expr, ms) => { const s = Date.now(); for (;;) { let v = null; try { v = await cdpEval(cdp, expr, 10000); } catch { v = null; } if (v === true) return true; if (Date.now() - s > ms) return false; await sleep(120); } };
const drive = (cdp, spec) => cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify(spec)}).then(() => true)`, 90000);
const face = (cdp) => cdpEval(cdp, FACE, 20000);

async function move(cdp, x, y) {
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0, clickCount: 0, pointerType: 'mouse' });
}
async function clickAt(cdp, x, y) {
  await move(cdp, x, y);
  await sleep(60);
  await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1, pointerType: 'mouse' });
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1, pointerType: 'mouse' });
}

/**
 * Every tree row's path and its point. The Explorer draws through Pierre, so
 * the rows live inside a shadow root; this walks every shadow root under the
 * `.files-tree` host rather than guessing the custom element's name.
 */
const TREE_ROWS = `(() => {
  const host = document.querySelector('.files-tree');
  if (host === null) return null;
  const out = [];
  const walk = (node, depth) => {
    if (depth > 8 || node === null) return;
    for (const el of Array.from(node.querySelectorAll('*'))) {
      if (el.hasAttribute && el.hasAttribute('data-item-path')) {
        const r = el.getBoundingClientRect();
        out.push({ path: el.getAttribute('data-item-path'), x: r.left + Math.min(60, r.width / 2), y: r.top + r.height / 2, w: r.width, h: r.height });
      }
      if (el.shadowRoot) walk(el.shadowRoot, depth + 1);
    }
  };
  walk(host, 0);
  return out;
})()`;

/** Put the sidebar on the Explorer, which is where the file rows are. */
const SHOW_EXPLORER = `(() => {
  const b = Array.from(document.querySelectorAll('.activitybar .ab-item')).find((x) => (x.getAttribute('aria-label') ?? '').startsWith('Explorer'));
  if (!b) return false;
  b.click();
  return true;
})()`;

/** Open `rel` in Redline FOR KEEPS (the double-click / Enter gesture). */
async function openRedline(cdp, rel) {
  await drive(cdp, { projectPath: project, openRel: rel, mode: 'file' });
  await sleep(700);
  await cdpEval(cdp, clickMode('Redline'));
  await until(cdp, docSettled, 20000);
  await sleep(500);
  return face(cdp);
}

/**
 * The ORDINARY gesture: ONE single click on a row in the Explorer, which
 * `src/renderer/tree/FileTree.tsx:510` emits as `preview: !keep`, i.e. a
 * PREVIEW open. Returns null when the row is not on screen.
 */
async function clickTreeRow(cdp, rel) {
  const rowsNow = await cdpEval(cdp, TREE_ROWS, 20000);
  if (!Array.isArray(rowsNow)) return null;
  const r = rowsNow.find((x) => (x.path ?? '').endsWith(rel));
  if (r === undefined) return null;
  await clickAt(cdp, r.x, r.y);
  await sleep(1400);
  return r;
}

/** Single-click `rel` in the Explorer and put it in Redline. */
async function openRedlineViaTree(cdp, rel) {
  const r = await clickTreeRow(cdp, rel);
  if (r === null) return null;
  await cdpEval(cdp, clickMode('Redline'));
  await until(cdp, docSettled, 20000);
  await sleep(500);
  return face(cdp);
}

/** Wait for the redline to draw at least one change. */
const hasChanges = `(() => { const d = document.querySelector('.ed-redline-doc'); return d !== null && d.querySelectorAll('.ed-redline-change').length > 0; })()`;

const readings = { acts: [] };

await withElectron(
  {
    label: 'p238',
    userDataDir: profile,
    tmuxSocket: null,
    cwd: REPO,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }),
    ceilingMs: 20 * 60 * 1000
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
      const onExplorer = await cdpEval(cdp, SHOW_EXPLORER, 20000);
      await sleep(1200);
      note('S-1', 'the sidebar was put on the Explorer', `clicked=${onExplorer}, rows=${JSON.stringify((await cdpEval(cdp, TREE_ROWS, 20000) ?? []).map((r) => r.path))}`);

      // -------------------------------------------------------------------
      // S. THE SET-UP: a baseline that only memory holds.
      // -------------------------------------------------------------------
      // The ORDINARY gesture: one single click on the row in the Explorer.
      let f = await openRedlineViaTree(cdp, 'draft.txt');
      if (f === null) { f = await openRedline(cdp, 'draft.txt'); note('S0', 'the Explorer row was not reachable; opened for keeps instead', ''); }
      readings.seed = f;
      check('S1', 'the redline mounted on the untracked draft', f.mounted === true, `mounted=${f.mounted}`);
      note('S1b', 'the tab a single Explorer click made', JSON.stringify(f.tabs));
      note('S2', 'the sentence with the baseline at the bytes it was opened at', JSON.stringify(f.since));
      check('S3', 'it draws NOTHING yet, because the baseline IS the file', f.changes === 0, `${f.changes} changes`);

      // The agent writes. This is the state an accept leaves behind: a baseline
      // that is neither the disk nor HEAD, held only by this tab.
      shellWrite('draft.txt', version(1));
      const drew = await until(cdp, hasChanges, 30000);
      f = await face(cdp);
      readings.marked = f;
      check('S4', 'after the outside write the redline draws the agent edits', drew && f.changes > 0, `${f.changes} changes, ${f.dels} del, ${f.ins} ins`);
      note('S5', 'the sentence while the marks are up', JSON.stringify(f.since));
      const N = f.changes;

      // A helper that re-establishes the same shape after a loss.
      let ver = 1;
      async function reseed() {
        ver += 1;
        shellWrite('draft.txt', version(ver));
        const ok = await until(cdp, hasChanges, 30000);
        const g = await face(cdp);
        return { ok, g };
      }

      // -------------------------------------------------------------------
      // ACT 1. THE PREVIEW RECYCLE — one single click on another file.
      // -------------------------------------------------------------------
      readings.treeRows = await cdpEval(cdp, TREE_ROWS, 20000);
      const before1 = await face(cdp);
      let act1 = { name: 'ONE single click on another file in the Explorer', verdict: 'unrun', before: before1, after: null };
      note('A1a', 'the draft tab before the click', JSON.stringify(before1.tabs));
      const row = await clickTreeRow(cdp, 'filler01.txt');
      if (row === null) {
        note('A1', 'the Explorer row for filler01.txt was not reachable; act 1 not driven', JSON.stringify((readings.treeRows ?? []).slice(0, 8)));
      } else {
        const mid = await face(cdp);
        note('A1b', 'the strip after ONE single click on filler01.txt', `${mid.tabCount} tabs: ${JSON.stringify(mid.tabs)}`);
        const after1 = await openRedlineViaTree(cdp, 'draft.txt') ?? await openRedline(cdp, 'draft.txt');
        act1 = { name: 'ONE single click on another file in the Explorer', verdict: verdictOf(before1, after1), before: before1, after: after1, strip: mid.tabs };
        check('A1', `one single click on another file: the baseline ${act1.verdict}`, act1.verdict === 'survived' || act1.verdict === 'died', `${before1.changes} changes -> ${after1.changes}`);
        note('A1c', 'the sentence AFTER the act', JSON.stringify(after1.since));
      }
      readings.acts.push(act1);
      if (act1.verdict === 'died') { const r = await reseed(); note('A1d', 're-established the marked state for the next act', `${r.g.changes} changes`); }

      // -------------------------------------------------------------------
      // C. THE CONTROL, and it is what makes every "died" above a reading
      // rather than a detector that only ever says one thing. The same
      // journey with the tab PINNED and the cap not reached: three other
      // files opened for keeps, then back to the draft. The baseline must
      // SURVIVE, or nothing this probe reports means anything.
      // -------------------------------------------------------------------
      await drive(cdp, { projectPath: project, openRel: 'draft.txt', mode: 'file' });
      await sleep(600);
      await cdpEval(cdp, clickMode('Redline'));
      await until(cdp, docSettled, 20000);
      await sleep(400);
      let beforeC = await face(cdp);
      if (beforeC.changes === 0) { const r = await reseed(); beforeC = r.g; }
      for (const rel of ['filler01.txt', 'filler02.txt', 'filler03.txt']) {
        await drive(cdp, { projectPath: project, openRel: rel, mode: 'file' });
        await sleep(400);
      }
      const midC = await face(cdp);
      const afterC = await openRedline(cdp, 'draft.txt');
      const actC = { name: 'THE CONTROL: three other files opened for keeps, under the cap', verdict: verdictOf(beforeC, afterC), before: beforeC, after: afterC, strip: midC.tabs };
      readings.acts.push(actC);
      check('C1', 'the control: with the tab pinned and the cap not reached, the baseline SURVIVED', actC.verdict === 'survived', `${beforeC.changes} changes -> ${afterC.changes}, ${midC.tabCount} tabs at the widest`);

      // -------------------------------------------------------------------
      // P. THE ONE-LINE MITIGATION, MEASURED RATHER THAN REASONED. The store
      // already has `pin` (src/renderer/editor/store.ts:742), and a pinned tab
      // is not what the preview slot recycles (`tabs.find((t) => t.preview &&
      // !t.dirty)` at :544). So: the SAME act 1, with the draft tab pinned.
      // If it survives, an accept that pins its own tab turns act 1 from a
      // loss into nothing, with no new state and no durability.
      // -------------------------------------------------------------------
      await drive(cdp, { projectPath: project, openRel: 'draft.txt', mode: 'file' });
      await sleep(600);
      await cdpEval(cdp, clickMode('Redline'));
      await until(cdp, docSettled, 20000);
      await sleep(400);
      let beforeP = await face(cdp);
      if (beforeP.changes === 0) { const r = await reseed(); beforeP = r.g; }
      note('P0', 'the draft tab, pinned, before the single click', JSON.stringify(beforeP.tabs));
      const rowP = await clickTreeRow(cdp, 'filler02.txt');
      const midP = await face(cdp);
      note('P1', 'the strip after ONE single click with the draft PINNED', `${midP.tabCount} tabs: ${JSON.stringify(midP.tabs)}`);
      const afterP = await openRedline(cdp, 'draft.txt');
      const actP = { name: 'THE PIN: the same single click, with the draft tab pinned', verdict: verdictOf(beforeP, afterP), before: beforeP, after: afterP, strip: midP.tabs, rowFound: rowP !== null };
      readings.acts.push(actP);
      check('P2', 'with the tab PINNED the same single click leaves the baseline alone', rowP !== null && actP.verdict === 'survived', `${beforeP.changes} changes -> ${afterP.changes}, verdict ${actP.verdict}`);

      // -------------------------------------------------------------------
      // ACT 2. LRU EVICTION — files opened FOR KEEPS past MAX_TABS.
      // -------------------------------------------------------------------
      // Open the draft for keeps first, so the preview slot is not the thing
      // being measured. This act is about the cap alone.
      await drive(cdp, { projectPath: project, openRel: 'draft.txt', mode: 'file' });
      await sleep(600);
      await cdpEval(cdp, clickMode('Redline'));
      await until(cdp, docSettled, 20000);
      await sleep(400);
      let before2 = await face(cdp);
      if (before2.changes === 0) { const r = await reseed(); before2 = r.g; }
      note('A2a', 'the strip before the eviction act', `${before2.tabCount} tabs, ${before2.changes} changes`);
      const evictSteps = [];
      let lostAt = 0;
      for (let i = 1; i <= 12; i += 1) {
        const rel = `filler${String(i).padStart(2, '0')}.txt`;
        await drive(cdp, { projectPath: project, openRel: rel, mode: 'file' });
        await sleep(400);
        const g = await face(cdp);
        const stillThere = g.tabs.some((t) => (t.name ?? '').includes('draft'));
        evictSteps.push({ opened: rel, tabCount: g.tabCount, draftStillOnStrip: stillThere });
        if (!stillThere && lostAt === 0) { lostAt = i; break; }
      }
      readings.evictSteps = evictSteps;
      const after2 = await openRedline(cdp, 'draft.txt');
      const act2 = { name: 'files opened for keeps until the ten-tab cap evicts the draft', verdict: verdictOf(before2, after2), before: before2, after: after2, lostAt, evictSteps };
      readings.acts.push(act2);
      check('A2', `the draft tab left the strip on pinned open number ${lostAt}`, lostAt > 0, `strip reached ${evictSteps[evictSteps.length - 1]?.tabCount ?? '?'} tabs`);
      check('A2b', `after the eviction the baseline ${act2.verdict}`, act2.verdict === 'survived' || act2.verdict === 'died', `${before2.changes} changes -> ${after2.changes}`);
      note('A2c', 'the sentence AFTER the eviction', JSON.stringify(after2.since));
      note('A2d', 'the mode the reopened tab came back in', JSON.stringify(after2.modes));

      // -------------------------------------------------------------------
      // ACT 3. CLOSE THE TAB and open the file again.
      // -------------------------------------------------------------------
      let before3 = await face(cdp);
      if (before3.changes === 0) { const r = await reseed(); before3 = r.g; }
      const closed = await cdpEval(cdp, `(() => {
        const tabs = Array.from(document.querySelectorAll('.ed-tab'));
        const t = tabs.find((x) => (x.querySelector('.ed-tab-name')?.textContent ?? '').includes('draft'));
        if (!t) return false;
        const b = t.querySelector('.ed-tab-close');
        if (!b) return false;
        b.click();
        return true;
      })()`, 20000);
      await sleep(900);
      const after3 = await openRedline(cdp, 'draft.txt');
      const act3 = { name: 'closing the tab and opening the file again', verdict: verdictOf(before3, after3), before: before3, after: after3, closed };
      readings.acts.push(act3);
      check('A3', `closing the tab: the baseline ${act3.verdict}`, closed === true && (act3.verdict === 'survived' || act3.verdict === 'died'), `${before3.changes} changes -> ${after3.changes}`);
      note('A3b', 'the sentence AFTER the close and reopen', JSON.stringify(after3.since));

      // -------------------------------------------------------------------
      // ACT 4. A WINDOW RELOAD.
      // -------------------------------------------------------------------
      let before4 = await face(cdp);
      if (before4.changes === 0) { const r = await reseed(); before4 = r.g; }
      await cdpEval(cdp, `(() => { setTimeout(() => location.reload(), 30); return true; })()`, 20000).catch(() => undefined);
      await sleep(4000);
      let after4 = null;
      try {
        for (;;) { const v = await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`); if (typeof v === 'number' && v > 0) break; await sleep(200); }
        await drive(cdp, { projectPath: project, editorWidth: 1000, sidebarWidth: 300 });
        await sleep(1500);
        after4 = await openRedline(cdp, 'draft.txt');
      } catch (err) { note('A4x', 'the reload reading could not be taken', String(err).slice(0, 200)); }
      const act4 = { name: 'a window reload', verdict: verdictOf(before4, after4), before: before4, after: after4 };
      readings.acts.push(act4);
      check('A4', `a window reload: the baseline ${act4.verdict}`, act4.verdict === 'survived' || act4.verdict === 'died', `${before4.changes} changes -> ${after4 === null ? 'unread' : after4.changes}`);
      if (after4 !== null) note('A4b', 'the sentence AFTER the reload', JSON.stringify(after4.since));

      // -------------------------------------------------------------------
      // W. WHAT THE PERSON IS TOLD. Nothing in the app may WARN that the
      // baseline went: no toast, and no sentence claiming anything was kept.
      //
      // W3 ASKED FOR THE SAME STRING UNTIL PHASE 239 LANDED, and the change
      // is that phase's own subject rather than a defect here. A picture with
      // no marks in it now says `Nothing has changed since you opened this
      // file at HH:MM.` where before it repeated the `Marked since …` promise,
      // which research 99 section 6.2 measured as a promise about the future
      // said over a picture that shows nothing. So a lost baseline reads as
      // exactly what it is, a file freshly opened with the comparison
      // starting now, and the rule asks for THAT: every post-act face is the
      // empty sentence naming its moment, never the marked promise and never
      // a word about anything Tortie kept, because it kept nothing.
      // -------------------------------------------------------------------
      const sentences = readings.acts.filter((a) => a.after !== null).map((a) => a.after.since);
      const toastsSeen = readings.acts.filter((a) => a.after !== null).flatMap((a) => a.after.toasts);
      check('W1', 'no toast of any kind was raised by any of the acts', toastsSeen.length === 0, JSON.stringify(toastsSeen));
      note('W2', 'every sentence the face carried after an act', JSON.stringify(sentences));
      const lost = readings.acts.filter((a) => a.after !== null && a.verdict === 'died').map((a) => a.after.since);
      const emptyFace = (t) =>
        typeof t === 'string' &&
        t.startsWith('Nothing has changed since ') &&
        /\bat \d{2}:\d{2}\.$/.test(t) &&
        !/backup|saved|kept|restore|lost|gone/i.test(t);
      check(
        'W3',
        'every face after a lost baseline is the ordinary opening one, naming its moment and claiming nothing was kept',
        lost.length >= 3 && lost.every(emptyFace),
        `${String(lost.length)} losses: ${JSON.stringify(lost)}`
      );
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
