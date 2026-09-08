#!/usr/bin/env node
/**
 * save-loss.mjs. THE PHASE 240 PARENT MEASUREMENT, run rather than read.
 *
 * One Electron on a scratch profile, a scratch HOME and this script's own
 * tmux socket, over a git repository this script builds inside its own
 * scratch directory. It spawns no agent, spends no token, opens no keychain
 * and makes no request. The "agent" that writes the file from outside is a
 * plain `/bin/sh` running `cat`, which is the charter's own wording, and
 * every byte it writes lands inside the scratch project.
 *
 * WHAT IT MEASURES, in both editor modes, because Phase 237 stated the loss
 * on both and this step confirms rather than inherits:
 *
 *   1. a prose file is opened and the person types one word into it
 *   2. a shell writes a new paragraph into the file from outside
 *   3. the app is given time for a watcher tick, and the tab is read: a
 *      dirty tab is skipped by `refreshRepo`, so nothing arrives
 *   4. Cmd-S
 *   5. the file is read FROM DISK and compared with what the shell wrote
 *
 * The number is the count of characters the shell wrote that the file no
 * longer holds, taken by a character level LCS between the shell's version
 * and the file after the save, which is an arithmetic and not a fixture
 * constant. Everything the face said in the same window is read too: every
 * toast, every banner and the dirty mark.
 *
 * SAFETY. The Electron is started through build/electron-run.mjs, which ends
 * the tree it started in a `finally` block whatever happened. The tmux socket
 * is this script's own, handed in by build/harness-socket.mjs, and `gmux` and
 * `default` are refused by name; the operator's own `-L gmux` sessions are
 * counted before and after. Every other process this script starts is a
 * synchronous `git` or `/bin/sh` that has exited before the call returns.
 * `--self-test` proves the LCS grader on fixtures and launches nothing.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p240]';
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// The grader: how many characters of `mine` are absent from `theirs`.
// ---------------------------------------------------------------------------
/** Characters of `a` that a character level LCS does not match in `b`. */
function lostChars(a, b) {
  const n = a.length;
  const m = b.length;
  let prev = new Int32Array(m + 1);
  let cur = new Int32Array(m + 1);
  for (let i = 1; i <= n; i++) {
    cur[0] = 0;
    for (let j = 1; j <= m; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    }
    const t = prev; prev = cur; cur = t;
  }
  return n - prev[m];
}

function selfTest() {
  const fixtures = [
    ['identical', 'hello world', 'hello world', 0],
    ['a paragraph dropped', 'a\nb\nc\n', 'a\nc\n', 2],
    ['nothing survives', 'abc', 'xyz', 3],
    ['appended tail lost', 'head TAIL', 'head ', 4],
    ['empty against empty', '', '', 0],
    ['everything lost to an empty file', 'abcd', '', 4]
  ];
  let ok = true;
  for (const [label, a, b, want] of fixtures) {
    const got = lostChars(a, b);
    const good = got === want;
    ok = ok && good;
    say(`${good ? 'ok  ' : 'FAIL'} self-test ${label}: ${got}, wanted ${want}`);
  }
  say(`${ok ? 'ok  ' : 'FAIL'} self-test: ${fixtures.length} fixtures`);
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
    [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', `gmux-p240-${process.pid}`, `node ${process.argv[1]}`],
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

mkdirSync(join(harnessDir, 'p240'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p240'));
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
/** What the shell writes while the person is typing: one whole new paragraph. */
const AGENT_ADDED = `\n${para(4, 'written by the agent while you were typing')}\n`;
const V_AGENT = V1 + AGENT_ADDED;

writeFileSync(join(project, 'notes.txt'), V1);
writeFileSync(join(project, 'other.txt'), V1);
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p240@example.invalid');
git('config', 'user.name', 'p240');
git('add', '.');
git('commit', '-q', '-m', 'first');

// ---------------------------------------------------------------------------
// Readers.
// ---------------------------------------------------------------------------
const READ = `(() => {
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
  const tab = fiberTab(document.querySelector('.ed-redline-view'))
    ?? fiberTab(document.querySelector('.ed-tabs-actions .ed-mode'))
    ?? fiberTab(document.querySelector('[role="tab"][aria-selected="true"]'));
  const doc = document.querySelector('.ed-redline-doc');
  const leaves = (el) => Array.from(el.childNodes).flatMap((n) => (n.nodeType === 1 && n.classList.contains('ed-redline-change') ? Array.from(n.childNodes) : [n]));
  const runs = doc ? leaves(doc).map((n) => ({ kind: n.nodeType === 1 ? (n.tagName === 'DEL' ? 'del' : n.tagName === 'INS' ? 'ins' : 'same') : 'same', text: n.textContent ?? '' })) : null;
  return {
    tab: tab ? { name: tab.name, mode: tab.mode, dirty: tab.dirty, savedContents: tab.savedContents } : null,
    model: (() => { try { return window.__gmuxP240Model ? window.__gmuxP240Model() : null; } catch { return null; } })(),
    toasts: Array.from(document.querySelectorAll('.toasts .toast')).map((t) => (t.textContent ?? '').trim()),
    banners: Array.from(document.querySelectorAll('.ed-note, .banner-text, [role="status"], [role="alert"]')).map((b) => (b.textContent ?? '').trim()).filter((s) => s !== ''),
    confirmOpen: document.querySelector('.modal[role="alertdialog"]') !== null,
    confirmTitle: document.querySelector('.modal-title')?.textContent ?? null,
    dirtyOnFace: document.querySelector('[role="tab"][aria-selected="true"] .ed-tab-close.dirty') !== null,
    nonDel: runs ? runs.filter((r) => r.kind !== 'del').map((r) => r.text).join('') : null,
    modeChecked: Array.from(document.querySelectorAll('.ed-tabs-actions .ed-mode [role="radio"]')).find((b) => b.getAttribute('aria-checked') === 'true')?.getAttribute('aria-label') ?? null
  };
})()`;
const clickMode = (label) => `(() => { const b = document.querySelector('.ed-tabs-actions .ed-mode [aria-label="${label}"]'); if (!b) return false; b.click(); return true; })()`;
const monacoUp = `document.querySelector('.monaco-editor .view-lines') !== null`;
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
        } catch { if (cdp) { try { cdp.close(); } catch { /* already closed */ } } }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window');
    await sleep(200);
  }
}
const until = async (cdp, expr, ms) => { const s = Date.now(); for (;;) { if ((await cdpEval(cdp, expr, 10000)) === true) return true; if (Date.now() - s > ms) return false; await sleep(80); } };
const drive = (cdp, spec) => cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify(spec)}).then(() => true)`, 60000);
const read = (cdp) => cdpEval(cdp, READ, 10000);
async function press(cdp, { key, code, vk, modifiers, text }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  await cdp.call('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', ...base, ...(text ? { text, unmodifiedText: text } : {}) });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}
const CMD_S = { key: 's', code: 'KeyS', vk: 83, modifiers: 4 };
const CMD_UP = { key: 'ArrowUp', code: 'ArrowUp', vk: 38, modifiers: 4 };
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
const out = join(root, 'readings.json');

await withElectron(
  {
    label: 'p240',
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

      // ---------------------------------------------------------------- FILE
      await drive(cdp, { projectPath: project, openRel: 'notes.txt', mode: 'file', editorWidth: 1100 });
      await until(cdp, monacoUp, 20000);
      await sleep(800);
      await clickFirstLine(cdp, '.monaco-editor .view-line');
      await press(cdp, CMD_UP);
      await typeInto(cdp, 'PERSON ');
      await until(cdp, `document.querySelector('[role="tab"][aria-selected="true"] .ed-tab-close.dirty') !== null`, 8000);
      const fileTyped = await read(cdp);
      say(`FILE typed: dirty=${fileTyped.dirtyOnFace}`);

      shellWrite('notes.txt', V_AGENT);
      const wroteAt = Date.now();
      await sleep(6000); // several watcher ticks
      const fileBefore = await read(cdp);
      const diskBefore = disk('notes.txt');
      findings.file = {
        agentWroteBytes: Buffer.byteLength(V_AGENT),
        agentAddedChars: AGENT_ADDED.length,
        diskBeforeSave: diskBefore.length,
        diskBeforeSaveIsAgents: diskBefore === V_AGENT,
        savedContentsAfterTick: fileBefore.tab?.savedContents?.length ?? null,
        tabSawTheAgentWrite: (fileBefore.tab?.savedContents ?? '') === V_AGENT,
        waitedMs: Date.now() - wroteAt,
        toastsBeforeSave: fileBefore.toasts,
        bannersBeforeSave: fileBefore.banners
      };

      await press(cdp, CMD_S);
      await sleep(2500);
      const fileAfter = await read(cdp);
      const diskAfter = disk('notes.txt');
      findings.file.diskAfterSave = diskAfter.length;
      findings.file.stillHoldsTheAgentParagraph = diskAfter.includes(para(4, 'written by the agent while you were typing'));
      findings.file.lostChars = lostChars(V_AGENT, diskAfter);
      findings.file.lostBytes = Buffer.byteLength(V_AGENT) - Buffer.byteLength(diskAfter);
      findings.file.toastsAfterSave = fileAfter.toasts;
      findings.file.bannersAfterSave = fileAfter.banners;
      findings.file.confirmOpen = fileAfter.confirmOpen;
      findings.file.dirtyAfterSave = fileAfter.dirtyOnFace;
      findings.file.diskAfterHead = diskAfter.slice(0, 60);
      say(`FILE: agent wrote ${findings.file.agentWroteBytes} B, disk after save ${diskAfter.length} chars, lost ${findings.file.lostChars} chars, toasts ${JSON.stringify(fileAfter.toasts)}`);

      // ------------------------------------------------- HEADCONTENTS ARM C
      // Can `headContents` carry the disk side for a Compare? It is the
      // watcher's field: `refreshRepo` re-runs `git show HEAD:<path>` on
      // every tick for a worktree tab and does NOT skip a dirty one, so a
      // Compare that borrowed it would be overwritten. Measured rather than
      // read: dirty the tab, move HEAD under it, and read the field.
      await clickFirstLine(cdp, '.monaco-editor .view-line');
      await press(cdp, CMD_UP);
      await typeInto(cdp, 'X');
      await until(cdp, `document.querySelector('[role="tab"][aria-selected="true"] .ed-tab-close.dirty') !== null`, 8000);
      const headRead = `(() => {
        const key = (el) => Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
        const el = document.querySelector('[role="tab"][aria-selected="true"]');
        let f = el ? el[key(el)] : null;
        while (f) { const t = f.memoizedProps && f.memoizedProps.tab; if (t && 'headContents' in t) return { head: t.headContents, dirty: t.dirty, name: t.name }; f = f.return; }
        return null;
      })()`;
      const h0 = await cdpEval(cdp, headRead, 8000);
      const V_COMMIT = V1.replace('third', 'committed by somebody else');
      shellWrite('notes.txt', V_COMMIT);
      git('commit', '-q', '-am', 'HEAD moves under a dirty tab');
      await sleep(6000);
      const h1 = await cdpEval(cdp, headRead, 8000);
      findings.headContents = {
        dirtyWhileHeadMoved: h1?.dirty ?? null,
        headBeforeLen: h0?.head?.length ?? null,
        headAfterLen: h1?.head?.length ?? null,
        headFollowedTheCommit: (h1?.head ?? '') === V_COMMIT,
        note: 'headContents is rewritten by refreshRepo on every tick, dirty or not'
      };
      say(`HEADCONTENTS: dirty=${h1?.dirty} followed the commit=${findings.headContents.headFollowedTheCommit}`);

      // ------------------------------------------------------------- REDLINE
      // A second file, so the first arm's state cannot colour this one.
      await drive(cdp, { projectPath: project, openRel: 'other.txt', mode: 'diff', editorWidth: 1100 });
      await sleep(1000);
      await cdpEval(cdp, clickMode('Redline'));
      await until(cdp, docSettled, 20000);
      await sleep(800);
      await clickFirstLine(cdp, '.ed-redline-doc');
      await typeInto(cdp, 'PERSON ');
      await sleep(1200);
      const rlTyped = await read(cdp);
      say(`REDLINE typed: dirty=${rlTyped.dirtyOnFace} mode=${rlTyped.modeChecked}`);

      shellWrite('other.txt', V_AGENT);
      const wroteAt2 = Date.now();
      await sleep(6000);
      const rlBefore = await read(cdp);
      const disk2Before = disk('other.txt');
      findings.redline = {
        typedOnFace: rlTyped.dirtyOnFace,
        agentWroteBytes: Buffer.byteLength(V_AGENT),
        agentAddedChars: AGENT_ADDED.length,
        diskBeforeSave: disk2Before.length,
        diskBeforeSaveIsAgents: disk2Before === V_AGENT,
        redlineRightSideHoldsAgentParagraph: (rlBefore.nonDel ?? '').includes(para(4, 'written by the agent while you were typing')),
        savedContentsAfterTick: rlBefore.tab?.savedContents?.length ?? null,
        waitedMs: Date.now() - wroteAt2,
        toastsBeforeSave: rlBefore.toasts,
        bannersBeforeSave: rlBefore.banners
      };

      await press(cdp, CMD_S);
      await sleep(2500);
      const rlAfter = await read(cdp);
      const disk2After = disk('other.txt');
      findings.redline.diskAfterSave = disk2After.length;
      findings.redline.stillHoldsTheAgentParagraph = disk2After.includes(para(4, 'written by the agent while you were typing'));
      findings.redline.lostChars = lostChars(V_AGENT, disk2After);
      findings.redline.lostBytes = Buffer.byteLength(V_AGENT) - Buffer.byteLength(disk2After);
      findings.redline.toastsAfterSave = rlAfter.toasts;
      findings.redline.bannersAfterSave = rlAfter.banners;
      findings.redline.confirmOpen = rlAfter.confirmOpen;
      findings.redline.dirtyAfterSave = rlAfter.dirtyOnFace;
      findings.redline.diskAfterHead = disk2After.slice(0, 60);
      say(`REDLINE: disk after save ${disk2After.length} chars, lost ${findings.redline.lostChars} chars, toasts ${JSON.stringify(rlAfter.toasts)}`);
    } finally {
      writeFileSync(out, JSON.stringify(findings, null, 2));
      cdp.close();
    }
  }
);

const opAfter = operatorCount();
say(`operator -L gmux sessions ${opBefore} -> ${opAfter}`);
say(`readings written to ${out}`);
console.log(JSON.stringify(findings, null, 2));
process.exit(0);
