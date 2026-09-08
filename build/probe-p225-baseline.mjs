#!/usr/bin/env node
/**
 * probe-p225-baseline.mjs. THE PHASE 225 APP RUN, and it is one Electron on
 * a scratch profile, a scratch HOME and this script's own tmux socket. It
 * spawns no agent, spends no token, opens no keychain, makes no request and
 * reads nothing under the person's home: the repository it opens is one it
 * builds itself, and the "agent" that writes to a file from outside is a
 * plain `/bin/sh` running `cat`, which is the charter's own wording.
 *
 * ## WHAT IT PROVES, and why it is a run rather than a reading
 *
 * The phase's whole visible change is one argument at the compose site in
 * src/renderer/editor/RedlineDocument.tsx: the redline's left side is the
 * tab's shadow baseline rather than the HEAD version. The verifier put that
 * argument back to the parent's and every gate stayed green, which is why
 * this file exists and why p225-redline-projection.test.tsx exists beside
 * it. That test pins the property under node over a static render; this run
 * pins it inside the real EditorPanel tree with the real watcher, the real
 * git and the real Monaco, which none of the tests reach.
 *
 * THE INDEPENDENT METHOD, from research 83 D.1 and section 1: the projection
 * property off the live DOM. At every reading, every top level child of
 * `.ed-redline-doc` that is not an INS, concatenated, must equal the tab's
 * baseline byte for byte AND the bytes this script committed or read, and
 * every child that is not a DEL must equal the file as this script wrote it.
 * The live tab is read through the React fiber of the drawn view, so nothing
 * in the tree was changed to expose it.
 *
 * The drive, in one session over a scratch repository with `main` and `alt`:
 *
 *   S1   a committed clean prose file opened as Diff, then Redline: baseline
 *        from the commit, the face names it, the aria label names it, the
 *        baseline line is not a live region
 *   S2   a shell writes the file from outside: recomposed with no click
 *   S3   ATTACK a HEAD move that leaves this file's version alone
 *   S4   ATTACK a look, File and Redline twice over
 *   S5   ATTACK a tab switch
 *   S6   the person types one word into Monaco with real key events: the
 *        dirty limit on the face, the word drawn as an insertion (ruling 1),
 *        the buffer and not the disk on the right; then Cmd-S
 *   S7   `git stash; git checkout alt` under the tab: re-seeded, emptied,
 *        generation moved by exactly one
 *   S8   ATTACK a repeated HEAD version
 *   S9   a fresh HEAD version cannot be stopped from winning
 *   S10  an UNTRACKED prose file opened as File has a Redline tab that draws
 *        from the first read, recomposes on an outside write, is not
 *        re-seeded by the empty HEAD answer on the tick, resets on close and
 *        reopen, and is re-seeded as the commit when committed
 *   S11  close and reopen the tracked file with an uncommitted change: the
 *        baseline is HEAD again and the face says so
 *
 * The generation is read at every step, so the four things that must never
 * move it and the one thing that must are asserted as numbers.
 *
 * ## SAFETY
 *
 * The Electron is started through build/electron-run.mjs, which ends the
 * tree it started in a `finally` block whatever happened. The tmux socket is
 * this script's own, handed in by build/harness-socket.mjs, and `gmux` and
 * `default` are refused by name. The operator's own `-L gmux` sessions are
 * counted before and after and must not move. Every other process this
 * script starts is a synchronous `git` or `/bin/sh` that has exited before
 * the call returns. `--self-test` proves the projection grader on fixtures
 * and launches nothing.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from './electron-run.mjs';
import { cdpEval, wsConnect } from './cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[p225]';
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// The grader, proved under --self-test.
// ---------------------------------------------------------------------------
const failures = [];
const rows = [];
function check(step, claim, pass, detail) {
  rows.push({ step, claim, pass, detail });
  if (!pass) failures.push(`${step}. ${claim} — ${detail}`);
  say(`${pass ? 'pass' : 'FAIL'}  ${step}. ${claim}${detail ? ' — ' + detail : ''}`);
}
const firstDiff = (a, b) => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return `at ${i}: got ${JSON.stringify(String(a).slice(i, i + 30))} want ${JSON.stringify(String(b).slice(i, i + 30))}`;
};
/** The two projections off one reading, as pure findings. */
function projectionFindings(r, wantBase, wantFile) {
  const out = [];
  const nonIns = r.runs ? r.runs.filter((x) => x.kind !== 'ins').map((x) => x.text).join('') : null;
  const nonDel = r.runs ? r.runs.filter((x) => x.kind !== 'del').map((x) => x.text).join('') : null;
  if (nonIns === null) out.push('no document drawn');
  else if (nonIns !== r.tab?.baseline?.text) out.push(`non-INS != tab.baseline.text ${firstDiff(nonIns, r.tab?.baseline?.text ?? '')}`);
  else if (nonIns !== wantBase) out.push(`non-INS != the bytes committed or read ${firstDiff(nonIns, wantBase)}`);
  if (nonDel === null) out.push('no document drawn');
  else if (nonDel !== wantFile) out.push(`non-DEL != the file as written ${firstDiff(nonDel, wantFile)}`);
  return out;
}
/** THE INDEPENDENT METHOD, one call per reading. */
function projection(step, r, wantBase, wantFile) {
  const findings = projectionFindings(r, wantBase, wantFile);
  const nonIns = r.runs ? r.runs.filter((x) => x.kind !== 'ins').map((x) => x.text).join('') : '';
  const nonDel = r.runs ? r.runs.filter((x) => x.kind !== 'del').map((x) => x.text).join('') : '';
  const old = findings.filter((f) => !f.startsWith('non-DEL'));
  const fresh = findings.filter((f) => f.startsWith('non-DEL') || f === 'no document drawn');
  check(`${step}.old`, 'non-INS children === baseline byte for byte', old.length === 0, old.length === 0 ? `${nonIns.length} bytes` : old.join('; '));
  check(`${step}.new`, 'non-DEL children === the file as written', fresh.length === 0, fresh.length === 0 ? `${nonDel.length} bytes` : fresh.join('; '));
}

function selfTest() {
  const runsOf = (parts) => parts.map(([kind, text]) => ({ kind, text }));
  const fixtures = [
    {
      label: 'a clean reading passes both projections',
      r: { runs: runsOf([['same', 'a '], ['del', 'b'], ['ins', 'c'], ['same', ' d']]), tab: { baseline: { text: 'a b d' } } },
      base: 'a b d', file: 'a c d', want: 0
    },
    {
      label: 'an unchanged document passes',
      r: { runs: runsOf([['same', 'a b d']]), tab: { baseline: { text: 'a b d' } } },
      base: 'a b d', file: 'a b d', want: 0
    },
    {
      label: 'the view composed against HEAD, so the non-INS side is empty (the C3 shape)',
      r: { runs: runsOf([['ins', 'a c d']]), tab: { baseline: { text: 'a b d' } } },
      base: 'a b d', file: 'a c d', want: 1
    },
    {
      label: 'the tab holds one baseline and the picture another',
      r: { runs: runsOf([['same', 'a '], ['del', 'b'], ['ins', 'c'], ['same', ' d']]), tab: { baseline: { text: 'a x d' } } },
      base: 'a b d', file: 'a c d', want: 1
    },
    {
      label: 'the picture matches the tab but not the bytes the script committed',
      r: { runs: runsOf([['same', 'a '], ['del', 'b'], ['ins', 'c'], ['same', ' d']]), tab: { baseline: { text: 'a b d' } } },
      base: 'a B d', file: 'a c d', want: 1
    },
    {
      label: 'the right side is one byte off the file as written',
      r: { runs: runsOf([['same', 'a '], ['del', 'b'], ['ins', 'c'], ['same', ' d']]), tab: { baseline: { text: 'a b d' } } },
      base: 'a b d', file: 'a c d\n', want: 1
    },
    {
      label: 'no document drawn fails both',
      r: { runs: null, tab: { baseline: { text: 'a b d' } } },
      base: 'a b d', file: 'a c d', want: 2
    }
  ];
  let ok = true;
  for (const f of fixtures) {
    const got = projectionFindings(f.r, f.base, f.file).length;
    const good = got === f.want;
    ok = ok && good;
    say(`${good ? 'ok  ' : 'FAIL'} self-test ${f.label}: ${String(got)} finding(s), wanted ${String(f.want)}`);
  }
  say(`${ok ? 'ok  ' : 'FAIL'} self-test: ${String(fixtures.length)} fixtures, ${ok ? 'all behaved' : 'one or more did not'}`);
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
  const w = spawnSync(process.execPath, [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', 'gmux-p225', `node ${process.argv[1]}`], { cwd: REPO, stdio: 'inherit' });
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

const operatorCount = () => (spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' }).stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
const opBefore = operatorCount();

mkdirSync(join(harnessDir, 'p225'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p225'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
const readingsFile = join(root, 'app-run-readings.json');
for (const d of [home, profile, project]) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}

const git = (...a) => {
  const r = spawnSync('git', a, { cwd: project, encoding: 'utf8', env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' } });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout;
};
/** A plain shell writes the file from outside, which is the charter's wording for an agent's write. */
const shellWrite = (rel, text) => {
  const r = spawnSync('/bin/sh', ['-c', 'cat > "$1"', 'sh', join(project, rel)], { input: text, encoding: 'utf8' });
  if (r.status !== 0) throw new Error('shell write failed');
};
const disk = (rel) => readFileSync(join(project, rel), 'utf8');

const para = (n, w) => `Paragraph ${n} of the notes, ${w}, keeps going for a while so that the document has a body worth reading and a sentence that can change.`;
const V1 = ['The quick brown fox jumped over the lazy dog.', '', para(1, 'first'), '', para(2, 'second'), '', para(3, 'third'), ''].join('\n');
const V2 = V1.replace('brown fox jumped', 'red fox leapt').replace('second', 'rewritten by an agent');
const ALT = ['The quick brown fox jumped over the lazy dog.', '', para(1, 'first'), '', para(2, 'the other branch'), '', para(3, 'third'), ''].join('\n');
const D1 = 'A draft that git has never seen.\n\nIts second paragraph says one thing.\n';
const D2 = 'A draft that git has never seen.\n\nIts second paragraph now says another thing.\n';
const D3 = 'A draft that git has never seen.\n\nIts second paragraph now says a third thing entirely.\n';

writeFileSync(join(project, 'notes.txt'), V1);
writeFileSync(join(project, 'guide.md'), '# Guide\n\nA sentence in the guide.\n');
writeFileSync(join(project, 'other.txt'), 'other one\n');
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p225@example.invalid');
git('config', 'user.name', 'p225');
git('add', '.');
git('commit', '-q', '-m', 'first');
git('checkout', '-q', '-b', 'alt');
writeFileSync(join(project, 'notes.txt'), ALT);
git('commit', '-q', '-am', 'alt notes');
git('checkout', '-q', 'main');
if (disk('notes.txt') !== V1) throw new Error('fixture');
// The guide is modified in the worktree so it opens as a real diff for the tab switch.
writeFileSync(join(project, 'guide.md'), '# Guide\n\nA changed sentence in the guide.\n');

// ---------------------------------------------------------------------------
// Renderer side readers, evaluated over CDP.
// ---------------------------------------------------------------------------
const READ = `(() => {
  const fiberTab = (el) => {
    if (!el) return null;
    const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
    let f = key ? el[key] : null;
    // React keeps two fibers per node; the DOM key may point at the stale
    // alternate. The generation is monotonic on a tab, so the newer of the two
    // committed props is the one with the higher generation.
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
  const button = fiberTab(document.querySelector('[role="tab"][aria-selected="true"]'));
  const tab = drawn ?? chip ?? button;
  const doc = document.querySelector('.ed-redline-doc');
  // PHASE 227 wrapped each change in one span.ed-redline-change, so the
  // projection is read at the LEAVES: a wrapper contributes its children.
  const leaves = (el) => Array.from(el.childNodes).flatMap((n) => (n.nodeType === 1 && n.classList.contains('ed-redline-change') ? Array.from(n.childNodes) : [n]));
  const runs = doc ? leaves(doc).map((n) => ({ kind: n.nodeType === 1 ? (n.tagName === 'DEL' ? 'del' : n.tagName === 'INS' ? 'ins' : 'same') : 'same', text: n.textContent ?? '' })) : null;
  const buttons = Array.from(document.querySelectorAll('.ed-tabs-actions .ed-mode [role="radio"]'));
  return {
    tab: tab ? { id: tab.id, name: tab.name, mode: tab.mode, dirty: tab.dirty, canDiff: tab.canDiff, savedContents: tab.savedContents, headContents: tab.headContents, baseline: tab.baseline ?? null } : null,
    tabCount: document.querySelectorAll('[role="tab"]').length,
    gens: { drawn: drawn?.baseline?.generation ?? null, chip: chip?.baseline?.generation ?? null, button: button?.baseline?.generation ?? null },
    runs,
    dels: runs ? runs.filter((r) => r.kind === 'del').map((r) => r.text) : null,
    inss: runs ? runs.filter((r) => r.kind === 'ins').map((r) => r.text) : null,
    skeleton: document.querySelector('.ed-redline-view .ed-skeleton') !== null,
    note: document.querySelector('.ed-redline-view .ed-note[role="status"] .banner-text')?.textContent ?? null,
    since: document.querySelector('.ed-redline-view .ed-redline-since .banner-text')?.textContent ?? null,
    sinceRole: document.querySelector('.ed-redline-view .ed-redline-since')?.getAttribute('role') ?? null,
    aria: document.querySelector('.ed-redline-scroll')?.getAttribute('aria-label') ?? null,
    options: buttons.map((b) => b.getAttribute('aria-label')),
    checked: buttons.find((b) => b.getAttribute('aria-checked') === 'true')?.getAttribute('aria-label') ?? null,
    monaco: document.querySelector('.monaco-editor .view-lines') !== null
  };
})()`;
const clickMode = (label) => `(() => { const b = document.querySelector('.ed-tabs-actions .ed-mode [aria-label="${label}"]'); if (!b) return false; b.click(); return true; })()`;
const clickTab = (name) => `(() => { const t = Array.from(document.querySelectorAll('[role="tab"]')).find((e) => (e.textContent ?? '').includes(${JSON.stringify(name)})); if (!t) return false; t.click(); return true; })()`;
const docHasChange = `(() => { const d = document.querySelector('.ed-redline-doc'); return d !== null && (d.querySelector('del,ins') !== null); })()`;
const docSettled = `(() => document.querySelector('.ed-redline-doc') !== null && document.querySelector('.ed-redline-view .ed-skeleton') === null)()`;
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
const read = (cdp) => cdpEval(cdp, READ, 10000);
async function press(cdp, { key, code, vk, modifiers, text }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  await cdp.call('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', ...base, ...(text ? { text, unmodifiedText: text } : {}) });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}
const CMD_S = { key: 's', code: 'KeyS', vk: 83, modifiers: 4 };
const CMD_W = { key: 'w', code: 'KeyW', vk: 87, modifiers: 4 };
const CMD_UP = { key: 'ArrowUp', code: 'ArrowUp', vk: 38, modifiers: 4 };

const genOf = (r) => r.tab?.baseline?.generation ?? -1;
// The selected tab's close button carries the dirty class, EditorTabs.tsx:189.
const DIRTY_ON_FACE = `document.querySelector('[role="tab"][aria-selected="true"] .ed-tab-close.dirty') !== null`;
const readings = {};
const SINCE_COMMIT = 'Marked since the last commit, for as long as this tab is open.';
const SINCE_OPEN = 'Marked since you opened this file, for as long as this tab is open.';

await withElectron(
  {
    label: 'p225',
    userDataDir: profile,
    tmuxSocket: null,
    cwd: REPO,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }),
    ceilingMs: 15 * 60 * 1000
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

      // S1: a committed, clean prose file opened as Diff, then Redline.
      await drive(cdp, { projectPath: project, openRel: 'notes.txt', mode: 'diff', editorWidth: 1100 });
      await sleep(800);
      check('S1.offered', 'Redline is offered beside Diff', await cdpEval(cdp, clickMode('Redline')), '');
      await until(cdp, docSettled, 15000);
      await sleep(500);
      let r = readings.S1 = await read(cdp);
      check('S1.doc', 'the redline drew with no change (clean file)', r.runs !== null && r.dels.length === 0 && r.inss.length === 0, `runs ${r.runs?.length}`);
      check('S1.base', 'baseline is the HEAD version, named as the commit', r.tab?.baseline?.from === 'commit' && r.tab?.baseline?.text === V1, JSON.stringify({ from: r.tab?.baseline?.from, gen: genOf(r) }));
      check('S1.face', 'the face names the baseline and its lifetime', r.since === SINCE_COMMIT, JSON.stringify(r.since));
      check('S1.aria', 'aria-label names the baseline', r.aria === 'Redline since the last commit, notes.txt', JSON.stringify(r.aria));
      check('S1.role', 'the baseline line is not a live region', r.sinceRole === null, JSON.stringify(r.sinceRole));
      check('S1.note', 'no caps note on a clean file', r.note === null, JSON.stringify(r.note));
      projection('S1', r, V1, V1);
      const g1 = genOf(r);

      // S2: a plain shell writes the file from outside; the redline recomposes with no click.
      shellWrite('notes.txt', V2);
      const t0 = Date.now();
      const recomposed = await until(cdp, docHasChange, 15000);
      await sleep(600);
      r = readings.S2 = await read(cdp);
      check('S2.recomposed', 'outside write recomposed the redline with no click', recomposed, `${Date.now() - t0} ms`);
      projection('S2', r, V1, V2);
      check('S2.words', "the agent's words are the deletions and insertions", r.dels.join('|').includes('brown') && r.inss.join('|').includes('red') && r.inss.join('|').includes('rewritten by an agent'), JSON.stringify({ dels: r.dels, inss: r.inss }));
      check('S2.gen', 'ATTACK a file change: the generation did not move', genOf(r) === g1, `${g1} -> ${genOf(r)}`);
      check('S2.face', 'the face still says since the last commit', r.since === SINCE_COMMIT, JSON.stringify(r.since));

      // S3: ATTACK a HEAD move that does not touch this file (another file committed).
      writeFileSync(join(project, 'other.txt'), 'other two\n');
      git('add', 'other.txt');
      git('commit', '-q', '-m', 'other file only');
      await sleep(3000);
      r = readings.S3 = await read(cdp);
      check('S3.gen', "ATTACK a HEAD move that leaves this file's HEAD version alone: generation unchanged", genOf(r) === g1 && r.tab?.baseline?.text === V1, `${g1} -> ${genOf(r)}`);
      projection('S3', r, V1, V2);

      // S4: ATTACK a look (File -> Redline -> File -> Redline).
      await cdpEval(cdp, clickMode('File')); await until(cdp, monacoUp, 15000);
      await cdpEval(cdp, clickMode('Redline')); await until(cdp, docSettled, 15000);
      await cdpEval(cdp, clickMode('File')); await until(cdp, monacoUp, 15000);
      await cdpEval(cdp, clickMode('Redline')); await until(cdp, docSettled, 15000);
      await sleep(400);
      r = readings.S4 = await read(cdp);
      check('S4.gen', 'ATTACK a look: generation unchanged', genOf(r) === g1, `${g1} -> ${genOf(r)}`);
      projection('S4', r, V1, V2);

      // S5: ATTACK a tab switch.
      await drive(cdp, { projectPath: project, openRel: 'guide.md', mode: 'diff' });
      await sleep(1000);
      check('S5.switched', 'guide.md is the active tab', (await read(cdp)).tab?.name === 'guide.md', '');
      check('S5.back', 'notes.txt tab clicked', await cdpEval(cdp, clickTab('notes.txt')), '');
      await until(cdp, docSettled, 15000);
      await sleep(400);
      r = readings.S5 = await read(cdp);
      check('S5.gen', 'ATTACK a tab switch: generation unchanged', r.tab?.name === 'notes.txt' && genOf(r) === g1, `${g1} -> ${genOf(r)} (${r.tab?.name})`);
      projection('S5', r, V1, V2);

      // S6: the person edits one word in Source (real typing into Monaco) and the dirty face.
      await cdpEval(cdp, clickMode('File')); await until(cdp, monacoUp, 15000);
      await sleep(500);
      const box = await cdpEval(cdp, `(() => { const l = document.querySelector('.monaco-editor .view-line'); if (!l) return null; const r = l.getBoundingClientRect(); return { x: r.left + 2, y: r.top + r.height / 2 }; })()`);
      check('S6.editor', 'Monaco drew a first line to click into', box !== null, JSON.stringify(box));
      await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y });
      await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
      await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
      await sleep(200);
      await press(cdp, CMD_UP);
      for (const ch of 'Person ') await press(cdp, { key: ch, code: ch === ' ' ? 'Space' : 'Key' + ch.toUpperCase(), vk: ch === ' ' ? 32 : ch.toUpperCase().charCodeAt(0), modifiers: 0, text: ch });
      // Waited for on the DOM and not through the fiber read: READ reaches the
      // tab through a fiber whose memoizedProps can be the stale alternate, and
      // pick() chooses by generation, which is monotonic while dirty is not, so
      // a stale false could win for the whole wait (the verifier read one red
      // S6.dirty over a tab whose next reading was dirty). The close button's
      // class is what EditorTabs.tsx draws from tab.dirty, and it is committed.
      const dirty = await until(cdp, DIRTY_ON_FACE, 8000);
      check('S6.dirty', 'typing made the tab dirty', dirty, '');
      await cdpEval(cdp, clickMode('Redline')); await until(cdp, docSettled, 15000);
      await sleep(700);
      r = readings.S6 = await read(cdp);
      const V2P = 'Person ' + V2;
      const nonIns6 = r.runs ? r.runs.filter((x) => x.kind !== 'ins').map((x) => x.text).join('') : '';
      const nonDel6 = r.runs ? r.runs.filter((x) => x.kind !== 'del').map((x) => x.text).join('') : '';
      check('S6.face', 'the dirty limit is stated on the face', r.since === `${SINCE_COMMIT} Not refreshed from disk while there are unsaved edits.`, JSON.stringify(r.since));
      check('S6.own', "the person's own word is drawn as an insertion too (ruling 1)", r.inss.some((t) => t.includes('Person')), JSON.stringify(r.inss));
      check('S6.old', 'non-INS children === baseline while dirty', nonIns6 === V1, nonIns6 === V1 ? '' : firstDiff(nonIns6, V1));
      check('S6.new', 'non-DEL children === the buffer (not the disk) while dirty', nonDel6 === V2P && disk('notes.txt') === V2, nonDel6 === V2P ? '' : firstDiff(nonDel6, V2P));
      check('S6.gen', 'ATTACK typing: generation unchanged', genOf(r) === g1, `${g1} -> ${genOf(r)}`);
      // Save with Cmd-S from the redline view.
      await press(cdp, CMD_S);
      const saved = await until(cdp, `!(${DIRTY_ON_FACE})`, 8000);
      await sleep(700);
      r = readings.S6save = await read(cdp);
      check('S6.saved', "Cmd-S saved and the disk holds the person's word", saved && disk('notes.txt') === V2P, `dirty=${r.tab?.dirty} disk=${disk('notes.txt').slice(0, 20)}`);
      check('S6.faceClean', 'the dirty clause left the face after the save', r.since === SINCE_COMMIT, JSON.stringify(r.since));
      check('S6.stillDrawn', 'the saved word is still drawn as a change', r.inss.some((t) => t.includes('Person')), JSON.stringify(r.inss));
      projection('S6save', r, V1, V2P);
      check('S6save.gen', 'ATTACK a save: generation unchanged', genOf(r) === g1, `${g1} -> ${genOf(r)}`);

      // S7: git checkout another branch under it (stash the worktree change first, as a person would).
      git('stash', '-q');
      git('checkout', '-q', 'alt');
      if (disk('notes.txt') !== ALT) throw new Error('checkout fixture');
      const t1 = Date.now();
      const emptied = await until(cdp, `(() => { const r = ${READ}; return r.tab && r.tab.baseline && r.tab.baseline.text === ${JSON.stringify(ALT)} && r.tab.savedContents === ${JSON.stringify(ALT)}; })()`, 20000);
      await sleep(800);
      r = readings.S7 = await read(cdp);
      check('S7.reseed', 'checkout re-seeded the baseline to the new HEAD version', emptied && r.tab?.baseline?.from === 'commit', `${Date.now() - t1} ms`);
      check('S7.empty', 'the redline emptied', r.dels.length === 0 && r.inss.length === 0, JSON.stringify({ dels: r.dels, inss: r.inss }));
      check('S7.gen', 'the generation moved by exactly one', genOf(r) === g1 + 1, `${g1} -> ${genOf(r)}`);
      check('S7.head', 'headContents is the new HEAD version', r.tab?.headContents === ALT, '');
      projection('S7', r, ALT, ALT);
      const g2 = genOf(r);

      // S8: ATTACK a repeated HEAD answer (HEAD moves again, file version unchanged).
      writeFileSync(join(project, 'other.txt'), 'other three\n');
      git('add', 'other.txt');
      git('commit', '-q', '-m', 'other again');
      await sleep(3000);
      r = readings.S8 = await read(cdp);
      check('S8.gen', 'ATTACK a repeated HEAD version: generation unchanged', genOf(r) === g2 && r.tab?.baseline?.text === ALT, `${g2} -> ${genOf(r)}`);

      // S9: a fresh HEAD version must win: the agent writes V3 and it is committed.
      const V3 = ALT.replace('third', 'committed third');
      shellWrite('notes.txt', V3);
      await until(cdp, docHasChange, 15000);
      r = readings.S9a = await read(cdp);
      check('S9a.drawn', 'the uncommitted write is drawn against the alt baseline', r.inss.some((t) => t.includes('committed')) && genOf(r) === g2, `gen ${genOf(r)}`);
      projection('S9a', r, ALT, V3);
      git('commit', '-q', '-am', 'notes v3');
      const won = await until(cdp, `(${READ}).tab.baseline.text === ${JSON.stringify(V3)}`, 20000);
      await sleep(800);
      r = readings.S9 = await read(cdp);
      check('S9.won', 'ATTACK: a fresh HEAD version was NOT prevented from winning', won && r.tab?.baseline?.from === 'commit', '');
      check('S9.gen', 'the generation moved by exactly one', genOf(r) === g2 + 1, `${g2} -> ${genOf(r)}`);
      check('S9.empty', 'the redline emptied after the commit', r.dels.length === 0 && r.inss.length === 0, '');
      projection('S9', r, V3, V3);
      const g3 = genOf(r);

      // S10: an UNTRACKED prose file, opened as File, then Redline.
      shellWrite('draft.txt', D1);
      await sleep(1500);
      await drive(cdp, { projectPath: project, openRel: 'draft.txt', mode: 'file' });
      await sleep(1200);
      r = readings.S10open = await read(cdp);
      check('S10.options', 'an untracked prose file offers Redline (no Diff)', r.tab?.name === 'draft.txt' && r.options.includes('Redline') && !r.options.includes('Diff'), JSON.stringify({ options: r.options, canDiff: r.tab?.canDiff, gen: genOf(r), from: r.tab?.baseline?.from }));
      await cdpEval(cdp, clickMode('Redline'));
      const drew = await until(cdp, docSettled, 15000);
      await sleep(600);
      r = readings.S10 = await read(cdp);
      check('S10.draws', "the untracked file's redline draws (no skeleton)", drew && r.runs !== null && !r.skeleton, `skeleton=${r.skeleton} head=${JSON.stringify(r.tab?.headContents)}`);
      check('S10.base', 'baseline is the first read, named as the open', r.tab?.baseline?.from === 'read' && r.tab?.baseline?.text === D1, JSON.stringify({ from: r.tab?.baseline?.from, gen: genOf(r) }));
      check('S10.face', 'the face says since you opened this file', r.since === SINCE_OPEN, JSON.stringify(r.since));
      check('S10.aria', 'aria names the open', r.aria === 'Redline since you opened this file, draft.txt', JSON.stringify(r.aria));
      projection('S10', r, D1, D1);
      const gd = genOf(r);
      shellWrite('draft.txt', D2);
      const drewChange = await until(cdp, docHasChange, 15000);
      await sleep(600);
      r = readings.S10b = await read(cdp);
      check('S10b.recomposed', 'outside write to the untracked file recomposed the redline', drewChange, '');
      projection('S10b', r, D1, D2);
      check('S10b.gen', 'ATTACK the empty HEAD answer on the tick: generation unchanged', genOf(r) === gd && r.tab?.baseline?.text === D1, `${gd} -> ${genOf(r)} headSeen=${JSON.stringify(r.tab?.baseline?.headSeen)} head=${JSON.stringify(r.tab?.headContents)} options=${JSON.stringify(r.options)}`);
      // A stated limit rather than a claim: after the first tick the tab grows
      // a Diff option too, because the tick flips canDiff when the frozen ''
      // HEAD answer differs from the file (tab-io.ts, unchanged from the
      // parent). It is recorded here so the reading is on the record.
      say(`S10b.limit  the untracked tab's options after the first tick: ${JSON.stringify(r.options)}`);

      // S10c: close the untracked tab and reopen: the baseline resets to the current bytes.
      await press(cdp, CMD_W);
      const closed = await until(cdp, `Array.from(document.querySelectorAll('[role="tab"]')).every((t) => !(t.textContent ?? '').includes('draft.txt'))`, 8000);
      check('S10c.closed', 'Cmd-W closed the draft tab', closed, '');
      await drive(cdp, { projectPath: project, openRel: 'draft.txt', mode: 'file' });
      await sleep(1000);
      await cdpEval(cdp, clickMode('Redline'));
      await until(cdp, docSettled, 15000);
      await sleep(600);
      r = readings.S10c = await read(cdp);
      check('S10c.reset', 'reopened: the baseline reset to the bytes now on disk, generation fresh, redline empty', r.tab?.baseline?.text === D2 && r.tab?.baseline?.from === 'read' && genOf(r) === 1 && r.dels.length === 0 && r.inss.length === 0, JSON.stringify({ gen: genOf(r), from: r.tab?.baseline?.from }));
      check('S10c.face', 'the face says so', r.since === SINCE_OPEN, JSON.stringify(r.since));
      projection('S10c', r, D2, D2);
      // and a commit of the untracked file re-seeds it as the commit
      shellWrite('draft.txt', D3);
      await until(cdp, docHasChange, 15000);
      r = readings.S10d = await read(cdp);
      projection('S10d', r, D2, D3);
      git('add', 'draft.txt');
      git('commit', '-q', '-m', 'draft committed');
      const committed = await until(cdp, `(${READ}).tab.baseline.from === 'commit'`, 20000);
      await sleep(600);
      r = readings.S10e = await read(cdp);
      check('S10e.commit', 'committing the untracked file re-seeded the baseline as the commit', committed && r.tab?.baseline?.text === D3 && genOf(r) === 2 && r.dels.length === 0 && r.inss.length === 0, JSON.stringify({ gen: genOf(r), from: r.tab?.baseline?.from, since: r.since }));
      check('S10e.face', 'the face now says since the last commit', r.since === SINCE_COMMIT, JSON.stringify(r.since));

      // S11: close and reopen the tracked file: the baseline resets to HEAD.
      await cdpEval(cdp, clickTab('notes.txt'));
      await until(cdp, docSettled, 15000);
      const V4 = V3.replace('first', 'uncommitted first');
      shellWrite('notes.txt', V4);
      await until(cdp, docHasChange, 15000);
      r = readings.S11a = await read(cdp);
      check('S11a.before', 'before the close: V3 -> V4 drawn at the same generation', genOf(r) === g3 && r.inss.some((t) => t.includes('uncommitted')), `gen ${genOf(r)}`);
      await press(cdp, CMD_W);
      await until(cdp, `Array.from(document.querySelectorAll('[role="tab"]')).every((t) => !(t.textContent ?? '').includes('notes.txt'))`, 8000);
      await drive(cdp, { projectPath: project, openRel: 'notes.txt', mode: 'diff' });
      await sleep(1000);
      await cdpEval(cdp, clickMode('Redline'));
      await until(cdp, docSettled, 15000);
      await sleep(600);
      r = readings.S11 = await read(cdp);
      check('S11.reset', 'reopened: baseline is HEAD (V3), from the commit, generation fresh', r.tab?.baseline?.text === V3 && r.tab?.baseline?.from === 'commit' && genOf(r) <= 2, JSON.stringify({ gen: genOf(r), from: r.tab?.baseline?.from }));
      check('S11.face', 'the face says since the last commit', r.since === SINCE_COMMIT, JSON.stringify(r.since));
      projection('S11', r, V3, V4);

      // The resting markup: the document element itself has no attribute this phase added.
      await cdpEval(cdp, clickTab('draft.txt'));
      await until(cdp, docSettled, 15000);
      const restingHtml = await cdpEval(cdp, `document.querySelector('.ed-redline-doc')?.outerHTML ?? null`);
      readings.restingHtml = restingHtml;
      check('X.resting', "the resting document markup is Phase 194's", typeof restingHtml === 'string' && restingHtml.startsWith('<div class="ed-redline ed-redline-doc" data-redline="">'), JSON.stringify(restingHtml).slice(0, 80));
      const viewChildren = await cdpEval(cdp, `(() => { const v = document.querySelector('.ed-redline-view'); return v ? Array.from(v.children).map((c) => c.className + (c.getAttribute('role') ? ' role=' + c.getAttribute('role') : '')) : null; })()`);
      readings.viewChildren = viewChildren;
      say(`view children: ${JSON.stringify(viewChildren)}`);
    } finally {
      writeFileSync(readingsFile, JSON.stringify(readings, null, 2));
      cdp.close();
    }
  }
);

const opAfter = operatorCount();
check('X.operator', 'operator sessions on -L gmux unmoved', opBefore === opAfter, `${opBefore} -> ${opAfter}`);
say(`readings written to ${readingsFile}`);
say(`${rows.filter((r) => r.pass).length} pass, ${failures.length} fail`);
for (const f of failures) console.log(`${TAG} FAIL ${f}`);
process.exit(failures.length === 0 ? 0 : 1);
