#!/usr/bin/env node
/**
 * probe-p237-typing.mjs. Phase 237's app run: typing in the redline, driven in
 * the real app with real key events.
 *
 * ## Why an app run, when the gate already drives the rules
 *
 * `npm run conformance:redline` rule 17 runs the SHIPPING typing rules under
 * node and ablates every clause, and it can hold none of this: that the real
 * `EditorPanel` tree really is editable, that React's own reconciliation
 * survives a wholesale recompose per keystroke (research 97 §8 names that as
 * the thing the measure step could not read), that a cancelled `beforeinput`
 * really reaches the buffer `save` writes, that the file on DISK is what was
 * typed, and that ⌘Z and ⌥⇧⌫ are two different undos.
 *
 * EVERY KEY EVENT GOES THROUGH CDP `Input.dispatchKeyEvent` OR
 * `Input.imeSetComposition`. There is no `execCommand` in this file, because
 * research 83 records that a scripted `execCommand` fires no `beforeinput` in
 * Chromium and produced a wrong conclusion once already.
 *
 * ## What it proves, each read off the running app or held here
 *
 *   #   what must be true                                      read from
 *   --  ----------------------------------------------------   ------------
 *    1  the redline opens with both projections exact, the      the DOM, against
 *       baseline being the committed bytes this file wrote      files this file wrote
 *    2  an outside write under a resting caret leaves the       the DOM selection,
 *       caret in the same word, moved by what moved above it    re-derived here
 *    3  a typed word is drawn as an INSERTION inside a change   the DOM
 *       wrapper, with 0 divs and 0 brs
 *    4  the BASELINE PROJECTION IS UNCHANGED by typing and      the DOM
 *       the generation on every wrapper has not moved
 *    5  Enter is bytes: one more newline, still 0 divs, 0 brs   the DOM
 *    6  ⌘S writes the file, and what is on DISK is what was     node, reading
 *       typed                                                   the file
 *    7  after the save the redline recomposes against the SAME  the DOM
 *       baseline and the typed words are still an insertion
 *    8  a composition commits INSIDE the insertion with both    the DOM
 *       projections exact (research 97 §3.1's deferred arm)
 *    9  ⌘Z takes the typing back and the tab is clean again     the DOM
 *   10  ⌥⌫ rewinds a change and WRITES the file; ⌘Z does not    node + the DOM
 *   11  the face names both undos in one line while both are    the DOM
 *       available
 *   12  ⌥⇧⌫ puts the rewound change back on disk                node
 *   13  the operator's session count did not move               tmux, read only
 *
 * ## Safety
 *
 * Without GMUX_TMUX_SOCKET it refuses, and it refuses `gmux` and `default` by
 * name. Everything it writes is under the harness directory: its own scratch
 * home, its own Electron profile and its own git repository. It creates no
 * session, spawns no agent, spends no token, opens no keychain and touches no
 * machine. The one Electron goes through `build/electron-run.mjs`, whose kill
 * is in a `finally` block. `-L gmux` appears in exactly one place, a read only
 * session count taken before and after.
 *
 * Usage, from the worktree root:
 *   npm run probe:p237
 *
 * Exit 0 when every check passes, 1 otherwise, 2 when the probe refuses.
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

function refuse(message) {
  process.stderr.write(`probe-p237-typing: ${message}\n`);
  process.exit(2);
}

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '' || socket === 'gmux' || socket === 'default' || !socket.startsWith('gmux-')) {
  refuse(`GMUX_TMUX_SOCKET is "${socket}". Run through build/harness-socket.mjs.`);
}
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('GMUX_HARNESS_DIR is not set. Run through build/harness-socket.mjs.');
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) {
  refuse('no build under out/. Run npm run build first.');
}

/** The operator's live server, listed and never written. The ONLY place this file names it. */
function operatorSessions() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' });
  return (out.stdout ?? '').split('\n').filter((line) => line.trim() !== '').length;
}
const sessionsBefore = operatorSessions();

mkdirSync(join(harnessDir, 'p237'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p237'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
for (const d of [home, profile, project]) mkdirSync(d, { recursive: true });

// ---------------------------------------------------------------------------
// The fixture: one prose file, committed, then rewritten the way an agent does.
// ---------------------------------------------------------------------------

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
  [
    '-c',
    'user.email=p237@example.invalid',
    '-c',
    'user.name=p237 probe',
    'commit',
    '-q',
    '-m',
    'p237 fixture'
  ]
]) {
  spawnSync('git', argv, { cwd: project, encoding: 'utf8' });
}
writeFileSync(FILE, AGENT);
const onDisk = () => readFileSync(FILE, 'utf8');

// ---------------------------------------------------------------------------
// The verdict
// ---------------------------------------------------------------------------

const failures = [];
function check(pass, claim, detail) {
  say(`  ${pass ? 'ok  ' : 'FAIL'} ${claim}${detail === undefined ? '' : ` — ${detail}`}`);
  if (!pass) failures.push(claim);
}

// ---------------------------------------------------------------------------
// The connection, and the keys
// ---------------------------------------------------------------------------

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
        list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
      } catch {
        list = [];
      }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl);
          const answer = await cdpEval(
            cdp,
            `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? location.href : null`,
            5000
          );
          if (typeof answer === 'string') return { cdp, url: answer };
          cdp.close();
        } catch {
          if (cdp !== null) {
            try {
              cdp.close();
            } catch {
              /* already gone */
            }
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no page answered for the app window in time');
    await sleep(200);
  }
}

// Modifier bits for Input.dispatchKeyEvent: Alt 1, Ctrl 2, Meta 4, Shift 8.
const CHORD = {
  save: { key: 's', code: 'KeyS', vk: 83, modifiers: 4 },
  undoTyping: { key: 'z', code: 'KeyZ', vk: 90, modifiers: 4 },
  // Enter carries its own text, or Chromium's editor makes no editing
  // command out of it and the page sees no `beforeinput` at all.
  enter: { key: 'Enter', code: 'Enter', vk: 13, modifiers: 0, text: '\r' },
  next: { key: 'ArrowDown', code: 'ArrowDown', vk: 40, modifiers: 1 },
  rewind: { key: 'Backspace', code: 'Backspace', vk: 8, modifiers: 1 },
  undoRewind: { key: 'Backspace', code: 'Backspace', vk: 8, modifiers: 1 | 8 }
};

async function press(cdp, { key, code, vk, modifiers, text }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  if (text !== undefined) {
    base.text = text;
    base.unmodifiedText = text;
  }
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}

/** One printable character, as the char event a page's `beforeinput` sees. */
async function typeChar(cdp, ch) {
  await cdp.call('Input.dispatchKeyEvent', {
    type: 'keyDown',
    text: ch,
    unmodifiedText: ch,
    key: ch
  });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
}
async function typeWord(cdp, word) {
  for (const ch of word) {
    await typeChar(cdp, ch);
    await sleep(30);
  }
}

async function waitFor(cdp, expression, timeoutMs, everyMs = 100) {
  const started = Date.now();
  for (;;) {
    if ((await cdpEval(cdp, expression, 15_000)) === true) return true;
    if (Date.now() - started > timeoutMs) return false;
    await sleep(everyMs);
  }
}

// ---------------------------------------------------------------------------
// The reads, all off the DOM, with the current-side coordinate re-derived HERE
// by a walk of this file's own rather than by the module under test.
// ---------------------------------------------------------------------------

/** The page-side helpers, installed once. */
const HELPERS = `(() => {
  const doc = () => document.querySelector('.ed-redline-doc');
  const inDel = (node) => {
    let at = node;
    while (at !== null && at !== doc()) {
      if (at.nodeType === 1 && at.hasAttribute('data-redline-del')) return true;
      at = at.parentNode;
    }
    return false;
  };
  const nodes = () => {
    const out = [];
    const w = document.createTreeWalker(doc(), NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n !== null; n = w.nextNode()) if (!inDel(n)) out.push(n);
    return out;
  };
  window.__p237 = {
    doc,
    nodes,
    /** The current side: every leaf that is not inside a deletion. */
    current: () => nodes().map((n) => n.nodeValue).join(''),
    /** The baseline side: every leaf that is not inside an insertion. */
    baseline: () => {
      const out = [];
      const w = document.createTreeWalker(doc(), NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n !== null; n = w.nextNode()) {
        let at = n;
        let ins = false;
        while (at !== null && at !== doc()) {
          if (at.nodeType === 1 && at.hasAttribute('data-redline-ins')) ins = true;
          at = at.parentNode;
        }
        if (!ins) out.push(n.nodeValue);
      }
      return out.join('');
    },
    /** Put the caret at a current-side offset. */
    put: (offset) => {
      let total = 0;
      for (const n of nodes()) {
        if (offset <= total + n.length) {
          const r = document.createRange();
          r.setStart(n, offset - total);
          r.collapse(true);
          const s = getSelection();
          s.removeAllRanges();
          s.addRange(r);
          doc().focus();
          return true;
        }
        total += n.length;
      }
      return false;
    },
    /** Where the caret is, as a current-side offset, or -1. */
    at: () => {
      const s = getSelection();
      if (s === null || s.rangeCount === 0) return -1;
      const node = s.focusNode;
      if (node === null || !doc().contains(node)) return -1;
      let total = 0;
      for (const n of nodes()) {
        if (n === node) return total + s.focusOffset;
        total += n.length;
      }
      return total;
    }
  };
  return true;
})()`;

const READ = `(() => {
  const d = window.__p237.doc();
  if (d === null) return JSON.stringify({ drawn: false });
  const wrappers = [...d.querySelectorAll('.ed-redline-change')];
  const since = document.querySelector('.ed-redline-since .banner-text');
  const undo = document.querySelector('.ed-redline-undo .banner-text');
  const current = window.__p237.current();
  const at = window.__p237.at();
  return JSON.stringify({
    drawn: true,
    editable: d.isContentEditable === true,
    contentEditable: d.getAttribute('contenteditable'),
    baseline: window.__p237.baseline(),
    current,
    changes: wrappers.length,
    generations: [...new Set(wrappers.map((w) => w.dataset.changeGen))],
    delsNotEditable: [...d.querySelectorAll('[data-redline-del]')].every(
      (el) => el.getAttribute('contenteditable') === 'false'
    ),
    insTexts: [...d.querySelectorAll('[data-redline-ins]')].map((el) => el.textContent),
    insInsideAChange: [...d.querySelectorAll('[data-redline-ins]')].every(
      (el) => el.closest('.ed-redline-change') !== null
    ),
    divs: d.querySelectorAll('div').length,
    brs: d.querySelectorAll('br').length,
    since: since === null ? null : since.textContent,
    undoNote: undo === null ? null : undo.textContent,
    caret: at,
    caretContext: at < 0 ? null : current.slice(Math.max(0, at - 8), at) + '|' + current.slice(at, at + 8)
  });
})()`;

const read = async (cdp) => JSON.parse(await cdpEval(cdp, READ, 20_000));

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

await withElectron(
  {
    label: 'p237',
    userDataDir: profile,
    tmuxSocket: null,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: { HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' },
    ceilingMs: 12 * 60 * 1000
  },
  async () => {
    const { cdp, url } = await cdpForAppWindow(90_000);
    say(`p237: app window at ${url}`);
    await cdp.call('Runtime.enable');
    for (;;) {
      if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
      await sleep(50);
    }
    await cdpEval(
      cdp,
      `window.__gmuxShotDrive(${JSON.stringify({
        projectPath: project,
        openRel: REL,
        mode: 'diff',
        editorMode: 'redline'
      })}).then(() => true)`,
      90_000
    );
    if (!(await waitFor(cdp, `document.querySelector('.ed-redline-doc') !== null`, 30_000))) {
      throw new Error('the redline never drew');
    }
    await cdpEval(cdp, HELPERS, 15_000);
    await sleep(500);

    // -- 1. the resting face -------------------------------------------------
    say('\n1. the redline at rest, both projections against the files this probe wrote');
    let r = await read(cdp);
    check(r.baseline === BASELINE, 'the non-INS projection is the committed bytes, byte for byte');
    check(r.current === AGENT, "the non-DEL projection is the agent's file, byte for byte");
    check(r.editable === true, `the document is editable (${String(r.contentEditable)})`);
    check(r.delsNotEditable === true, 'every deletion is an atomic island (contenteditable=false)');
    check(r.changes >= 2, `the agent's two edits are drawn as changes (${String(r.changes)})`);
    const generation = r.generations.join(',');
    say(`  the baseline generation on every wrapper is ${generation}`);

    // -- 2. an outside write under a resting caret ---------------------------
    say('\n2. an outside write while a caret rests mid-word, with nothing typed yet');
    const word = 'reconstructed';
    const mid = AGENT.indexOf('gets out of the way') + 5;
    await cdpEval(cdp, `window.__p237.put(${String(mid)})`, 15_000);
    await sleep(200);
    const beforeWrite = await read(cdp);
    check(beforeWrite.caret === mid, `the caret went where it was asked (${String(beforeWrite.caret)})`);
    const ABOVE = AGENT.replace('Tortie keeps every session alive', 'Tortie now keeps every one of your sessions alive');
    writeFileSync(FILE, ABOVE);
    const moved = await waitFor(
      cdp,
      `window.__p237.current().includes('every one of your sessions')`,
      15_000
    );
    check(moved, "the outside write reached the redline's face");
    const afterWrite = await read(cdp);
    const shift = ABOVE.length - AGENT.length;
    check(
      afterWrite.caret === mid + shift,
      `the caret moved with its own text, by exactly what arrived above it (${String(afterWrite.caret)}, expected ${String(mid + shift)})`
    );
    check(
      afterWrite.caretContext === beforeWrite.caretContext,
      `the caret is between the same characters it was (${String(afterWrite.caretContext)})`
    );
    check(afterWrite.baseline === BASELINE, 'the baseline projection is still the committed bytes');
    check(
      afterWrite.generations.join(',') === generation,
      `an outside write did not move the generation (${afterWrite.generations.join(',')})`
    );
    // Put the file back so the rest of the run works from one known text.
    writeFileSync(FILE, AGENT);
    await waitFor(cdp, `window.__p237.current() === ${JSON.stringify(AGENT)}`, 15_000);

    // -- 3, 4 and 5. typing --------------------------------------------------
    say('\n3. a typed word, and what it does to the marks');
    const typeAt = AGENT.indexOf('throwaway viewer');
    await cdpEval(cdp, `window.__p237.put(${String(typeAt)})`, 15_000);
    await sleep(200);
    await typeWord(cdp, 'really ');
    await sleep(400);
    r = await read(cdp);
    const TYPED = `${AGENT.slice(0, typeAt)}really ${AGENT.slice(typeAt)}`;
    check(r.current === TYPED, 'the current side is the file with the word typed into it');
    check(
      r.insTexts.some((t) => t.includes('really')),
      `the typed word is drawn as an INSERTION (${JSON.stringify(r.insTexts.filter((t) => t.includes('really')))})`
    );
    check(r.insInsideAChange === true, 'every insertion sits inside a change wrapper');
    check(r.divs === 0 && r.brs === 0, `no div and no br in the document (${String(r.divs)}, ${String(r.brs)})`);
    check(r.caret === typeAt + 7, `the caret is after what was typed (${String(r.caret)})`);

    say('\n4. and the baseline did not move');
    check(r.baseline === BASELINE, 'the non-INS projection is still the committed bytes, byte for byte');
    check(
      r.generations.join(',') === generation,
      `the generation on every wrapper is unchanged (${r.generations.join(',')})`
    );
    check(
      (r.since ?? '').includes('unsaved edits'),
      `the face says it is not refreshed from disk while there are unsaved edits (${String(r.since)})`
    );

    say('\n5. Enter is bytes');
    await press(cdp, CHORD.enter);
    await sleep(400);
    const withEnter = await read(cdp);
    check(
      withEnter.current === `${TYPED.slice(0, typeAt + 7)}\n${TYPED.slice(typeAt + 7)}`,
      'Enter put one newline into the current side and nothing else',
      JSON.stringify(withEnter.current.slice(typeAt, typeAt + 12))
    );
    check(
      withEnter.divs === 0 && withEnter.brs === 0,
      `still no div and no br (${String(withEnter.divs)}, ${String(withEnter.brs)})`
    );

    // -- 6 and 7. the save ---------------------------------------------------
    say('\n6. the ordinary save, and what is on disk');
    const wanted = withEnter.current;
    await press(cdp, CHORD.save);
    const saved = await waitFor(cdp, `!(document.querySelector('.ed-redline-since .banner-text')?.textContent ?? '').includes('unsaved')`, 15_000);
    check(saved, 'the face stopped saying there are unsaved edits');
    check(onDisk() === wanted, 'the file on disk is what was typed, byte for byte');

    say('\n7. and the redline recomposes against the SAME baseline');
    await sleep(600);
    const afterSave = await read(cdp);
    check(afterSave.baseline === BASELINE, 'the non-INS projection is still the committed bytes');
    check(
      afterSave.generations.join(',') === generation,
      `the generation still has not moved (${afterSave.generations.join(',')})`
    );
    check(
      afterSave.insTexts.some((t) => t.includes('really')),
      'what was typed is still drawn as an insertion'
    );

    // -- 8. a composition ----------------------------------------------------
    say('\n8. a composition, committed inside the insertion');
    const imeAt = wanted.indexOf('really');
    await cdpEval(cdp, `window.__p237.put(${String(imeAt)})`, 15_000);
    await sleep(200);
    await cdp.call('Input.imeSetComposition', { text: 'に', selectionStart: 1, selectionEnd: 1 });
    await sleep(120);
    await cdp.call('Input.imeSetComposition', { text: 'にほん', selectionStart: 3, selectionEnd: 3 });
    await sleep(120);
    await cdp.call('Input.insertText', { text: '日本' });
    await sleep(500);
    const ime = await read(cdp);
    check(
      ime.current === `${wanted.slice(0, imeAt)}日本${wanted.slice(imeAt)}`,
      `the composition committed into the current side (${JSON.stringify(ime.current.slice(imeAt - 4, imeAt + 6))})`
    );
    check(ime.baseline === BASELINE, 'and the baseline projection is exact after it');
    check(
      ime.insTexts.some((t) => t.includes('日本')),
      'the committed text is inside an insertion'
    );
    check(ime.insInsideAChange === true, 'and that insertion is inside a change wrapper');

    // -- 9. the two undos ----------------------------------------------------
    say('\n9. ⌘Z takes the typing back');
    await press(cdp, CHORD.undoTyping);
    await sleep(600);
    const undone = await read(cdp);
    check(
      undone.current === wanted,
      `⌘Z put the buffer back to what was saved (${JSON.stringify(undone.current.slice(imeAt - 4, imeAt + 6))})`
    );
    check(onDisk() === wanted, 'and it wrote nothing: the file on disk is untouched');

    say('\n10. ⌥⌫ rewinds a change and WRITES the file');
    await cdpEval(cdp, `document.querySelector('.ed-redline-scroll')?.focus()`, 15_000);
    await press(cdp, CHORD.next);
    await sleep(300);
    await press(cdp, CHORD.rewind);
    await sleep(1200);
    const rewound = onDisk();
    check(rewound !== wanted, 'the file changed on disk');
    check(
      rewound.includes('disposable client') || !rewound.includes('rebuilt from notes'),
      `one phrase went back to the baseline (${rewound.includes('disposable client') ? 'disposable client' : 'rebuilt from notes gone'})`
    );

    say('\n11. the face names both undos while both are available');
    await cdpEval(cdp, `window.__p237.put(0)`, 15_000);
    await sleep(200);
    await typeChar(cdp, 'X');
    await sleep(500);
    const both = await read(cdp);
    check(
      (both.undoNote ?? '').includes('⌘Z') && (both.undoNote ?? '').includes('⌥⇧⌫'),
      `one line names both keys (${String(both.undoNote)})`
    );
    check((both.undoNote ?? '').split('\n').length === 1, 'and it is one line');

    say('\n12. ⌥⇧⌫ puts the rewound change back on disk');
    await press(cdp, CHORD.undoTyping);
    await sleep(600);
    await cdpEval(cdp, `document.querySelector('.ed-redline-scroll')?.focus()`, 15_000);
    await press(cdp, CHORD.undoRewind);
    await sleep(1200);
    check(onDisk() === wanted, 'the file is byte for byte what it was before the rewind');

    const last = await read(cdp);
    check(last.baseline === BASELINE, 'and the baseline projection is STILL the committed bytes');
    check(
      last.generations.join(',') === generation,
      `nothing in this whole run moved the generation (${last.generations.join(',')})`
    );
    cdp.close();
  }
);

say('\n13. the operator’s own server');
const sessionsAfter = operatorSessions();
check(
  sessionsAfter === sessionsBefore,
  `the session count on -L gmux did not move (${String(sessionsBefore)} then ${String(sessionsAfter)})`
);

if (failures.length > 0) {
  say(`\nprobe-p237-typing: ${String(failures.length)} check(s) failed:`);
  for (const line of failures) say(`  - ${line}`);
  process.exit(1);
}
say('\nprobe-p237-typing: every check passed.');
process.exit(0);
