#!/usr/bin/env node
/**
 * Phase 209, the selection is the history, not the screen, driven in ONE app
 * run.
 *
 * The operator reported on 2026-09-03 that a selection extended by scrolling
 * does not copy in full, which was the one limit Phase 205 shipped with and
 * stated: an eight second hold above the top edge travelled 668 lines and
 * copied 43, one screen at the far end. This probe drives that hold and
 * counts the lines on the pasteboard against the lines travelled, then the
 * attacks the entry named, over one real shell session on a scratch profile
 * and the scratch tmux socket `gmux-p209`. Everything is launched through
 * `build/electron-run.mjs`, so the Electron and the scratch session server
 * are ended in a `finally` block whatever happens, and the socket is removed.
 *
 * THE ARMS, and what each one reads.
 *
 *   A  the eight second hold above the top edge, then a real command C: the
 *      pasteboard must hold every line from the anchor to the top of the
 *      travel, consecutive, one screen plus the travel
 *   B  a drag held below the bottom edge from a view parked 100 lines up,
 *      so the anchor leaves through the top and the copy runs down to the
 *      live bottom
 *   R  a drag that reverses past its anchor: held above the top until the
 *      view moves, then below the bottom until it is live again, so the
 *      head ends up below the anchor and the range flips
 *   C  a hold that reaches the top of the history: the travel stops at
 *      history_size and the copy begins at the first line the server holds
 *   D  a streaming pane under a live drag that has taken over: the line the
 *      person anchored on is the last line of the copy, not thirty eight
 *      lines further on. It carries the reading this phase's rule rests on
 *      too, being what the pane's own terminal holds on those rows under
 *      the stream and, as the control, with the stream stopped
 *   E  byte identity between the two paths over the SAME cells: one drag
 *      that never scrolls is copied by xterm, then the same drag is
 *      scrolled under the button and brought back so the range is held, the
 *      button comes up and the view is moved until no row of it is on screen
 *      at all, and the copy taken there can only have come from the server.
 *      The two pasteboards must be identical over a wrapped row and a row of
 *      wide characters; two small in-screen drags pin what xterm alone
 *      produces, so the ordinary case is seen unchanged
 *
 * THE PASTEBOARD. This probe presses command C for real, so the system
 * pasteboard is saved before the run with every flavour of every item and
 * put back in the same `finally`, by build/pasteboard-keep.swift compiled
 * into the run directory. The flavours are printed before and after and
 * must agree.
 *
 * SAFETY. `-L gmux` appears once, in a read only session count taken before
 * and after. The native menu is never opened. Nothing under the person's
 * home is written: HOME is a scratch directory for the run.
 *
 * `node build/probe-p209-selection.mjs --self-test` proves the graders on
 * fixtures and launches nothing at all.
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOCKET = 'gmux-p209';
const TAG = '[p209]';
const HOLD_MS = Number(process.env.P209_HOLD_MS ?? '8000');
/** Which arms to drive, a comma list of A B R C D E; every one by default. */
const ARMS = new Set((process.env.P209_ARMS ?? 'A,B,R,C,D,E').split(','));
const t0 = Date.now();
const say = (line) =>
  console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1)}s ${line}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// The graders. Pure, so --self-test can fail them on fixtures.
// ---------------------------------------------------------------------------

/** The integers on the numbered lines, in order, with their indexes. */
function numbersOf(lines) {
  const out = [];
  lines.forEach((line, i) => {
    const m = /^(\d+)$/.exec(line.trim());
    if (m !== null) out.push({ i, n: Number(m[1]) });
  });
  return out;
}

/** True when every numbered line follows the one before by exactly one. */
function consecutive(nums) {
  for (let k = 1; k < nums.length; k += 1) {
    if (nums[k].n !== nums[k - 1].n + 1) return false;
  }
  return true;
}

/**
 * A. The hold: the copy is the anchor row down to the head at the top of
 * the travel. The head sits past the end of a short numbered line, so the
 * first line is empty, exactly as xterm's own path leaves it, and every
 * line after it is the next integer up to the anchor.
 */
export function gradeHold(r) {
  const bad = [];
  const lines = r.copied ?? [];
  const travel = (r.positionAfterHold ?? 0) - (r.positionAtEdge ?? 0);
  if (travel < 100) bad.push(`the hold travelled only ${String(travel)} lines`);
  const expected = (r.anchorRow ?? 0) + (r.positionAfterHold ?? 0) + 1;
  if (lines.length !== expected) {
    bad.push(
      `copied ${String(lines.length)} lines for a range of ${String(expected)}`
    );
  }
  if (lines[0] !== '') bad.push(`the first line is ${JSON.stringify(lines[0])}`);
  const nums = numbersOf(lines);
  if (nums.length !== Math.max(0, lines.length - 1)) {
    bad.push(`${String(lines.length - 1 - nums.length)} lines are not numbers`);
  }
  if (!consecutive(nums)) bad.push('the numbers are not consecutive');
  if (nums.length > 0 && nums[nums.length - 1].n !== r.anchorNumber) {
    bad.push(
      `the copy ends at ${String(nums[nums.length - 1].n)} and the anchor was ${String(r.anchorNumber)}`
    );
  }
  return bad;
}

/**
 * B. The downward hold from a parked view. The first line is cut at the
 * anchor column and the last is the prompt cut at the head column, and every
 * line between is the next integer.
 */
export function gradeDown(r) {
  const bad = [];
  const lines = r.copied ?? [];
  if (r.positionAfterHold !== 0) {
    bad.push(`the view did not reach live: ${String(r.positionAfterHold)}`);
  }
  const expected = (r.positionAtPress ?? 0) - (r.anchorRow ?? 0) + (r.rows ?? 0);
  if (lines.length !== expected) {
    bad.push(
      `copied ${String(lines.length)} lines for a range of ${String(expected)}`
    );
  }
  const nums = numbersOf(lines.slice(1, -1));
  if (nums.length !== Math.max(0, lines.length - 2)) {
    bad.push(`${String(lines.length - 2 - nums.length)} middle lines are not numbers`);
  }
  if (!consecutive(nums)) bad.push('the numbers are not consecutive');
  return bad;
}

/**
 * R. The reversal. The anchor is the earlier end now, taken whole from
 * column 0, and the head is the last row of the live screen.
 */
export function gradeReverse(r) {
  const bad = [];
  const lines = r.copied ?? [];
  if (!(r.positionAtTurn > 0)) {
    bad.push(`the view never moved before the turn: ${String(r.positionAtTurn)}`);
  }
  if (r.positionAfterHold !== 0) {
    bad.push(`the view did not come back to live: ${String(r.positionAfterHold)}`);
  }
  const expected = (r.rows ?? 0) - (r.anchorRow ?? 0);
  if (lines.length !== expected) {
    bad.push(
      `copied ${String(lines.length)} lines for a range of ${String(expected)}`
    );
  }
  const nums = numbersOf(lines.slice(0, -1));
  if (nums.length === 0 || nums[0].n !== r.anchorNumber) {
    bad.push(
      `the copy begins at ${JSON.stringify(lines[0])} and the anchor was ${String(r.anchorNumber)}`
    );
  }
  if (!consecutive(nums)) bad.push('the numbers are not consecutive');
  return bad;
}

/**
 * C. The top of the history. The travel stops at history_size, and the copy
 * begins with the first line the server holds, which is the command that
 * printed the numbers, and then 1.
 */
export function gradeTop(r) {
  const bad = [];
  const lines = r.copied ?? [];
  if (r.positionAfterHold !== r.history) {
    bad.push(
      `the hold stopped at ${String(r.positionAfterHold)} with ${String(r.history)} lines of history`
    );
  }
  const expected = (r.anchorRow ?? 0) + (r.positionAfterHold ?? 0) + 1;
  if (lines.length !== expected) {
    bad.push(
      `copied ${String(lines.length)} lines for a range of ${String(expected)}`
    );
  }
  const nums = numbersOf(lines);
  if (nums.length === 0 || nums[0].n !== 1) {
    bad.push(`the lowest number is ${String(nums[0]?.n)} rather than 1`);
  }
  if (!consecutive(nums)) bad.push('the numbers are not consecutive');
  return bad;
}

/**
 * D. The stream. The anchor is a history position, so the line pressed is
 * the last line of the copy however many lines arrived, and the copy is the
 * rows dragged over rather than those plus the growth.
 */
export function gradeStream(r) {
  const bad = [];
  const lines = r.copied ?? [];
  if (!(r.historyGrew >= 20)) {
    bad.push(`the pane did not stream enough: ${String(r.historyGrew)} lines`);
  }
  const last = /STREAM-(\d+)/.exec(lines[lines.length - 1] ?? '');
  const anchors = (r.anchorCandidates ?? []).map((t) =>
    Number(/STREAM-(\d+)/.exec(t)?.[1])
  );
  if (last === null || !anchors.includes(Number(last[1]))) {
    bad.push(
      `the copy ends at ${JSON.stringify(lines[lines.length - 1])} and the anchor was one of ${JSON.stringify(r.anchorCandidates)}`
    );
  }
  const expected = (r.rowsDragged ?? 0) + 1;
  if (Math.abs(lines.length - expected) > 1) {
    bad.push(
      `copied ${String(lines.length)} lines for a drag over ${String(expected)}, so the anchor moved`
    );
  }
  // THE CONTROL. With the stream stopped and the same view parked, the pane's
  // own xterm and the server's grid must say the same thing about the same
  // rows, all but the first, which the reading drag cuts at its start column.
  // That is what makes the under-stream reading beside it mean the paint runs
  // behind rather than the arithmetic being wrong.
  const quiet = (r.xtermQuiet ?? []).slice(1);
  const grid = (r.tmuxQuiet ?? []).slice(1);
  if (grid.length === 0 || JSON.stringify(quiet) !== JSON.stringify(grid)) {
    bad.push(
      `with the pane quiet the server holds ${JSON.stringify(grid)} and the pane's own terminal ${JSON.stringify(quiet)}`
    );
  }
  return bad;
}

/**
 * E. The two paths agree byte for byte over the same range, and the ordinary
 * in-screen drags are xterm's own.
 *
 * The second copy is taken with every row of the range scrolled off the
 * screen, so xterm has no selection to answer with and the text can only have
 * come from the server.
 */
export function gradeIdentity(r) {
  const bad = [];
  if (!(r.positionWhenOffScreen >= r.rows)) {
    bad.push(
      `the view was only ${String(r.positionWhenOffScreen)} lines back over ${String(r.rows)} rows, so some of the range was still on screen`
    );
  }
  if (typeof r.fromScreen !== 'string' || r.fromScreen.length === 0) {
    bad.push('the screen copy is empty');
  }
  if (typeof r.fromHistory !== 'string' || r.fromHistory.length === 0) {
    bad.push('the history copy is empty');
  }
  if (r.fromHistory !== r.fromScreen) {
    bad.push(
      `the history copy (${String(r.fromHistory?.length)} bytes) and the screen copy (${String(r.fromScreen?.length)} bytes) differ`
    );
  }
  if (!(r.fromHistory ?? '').includes('ABCDEFGHIJ'.repeat(40))) {
    bad.push('the wrapped row is not joined into one line');
  }
  if (!(r.fromHistory ?? '').includes('\u65e5\u672c\u8a9e\u30c6\u30ad abc def end')) {
    bad.push('the wide row is not in the copy whole');
  }
  // The emoji pair agrees on everything but the run of spaces the server
  // paints after a character the pane's terminal measures narrower. Both must
  // still carry the row whole.
  const flat = (t) => (t ?? '').replace(/ +/g, ' ');
  if (!flat(r.emojiScreen).includes('pad \ud83d\ude00 end')) {
    bad.push(`the emoji row on screen copied ${JSON.stringify(r.emojiScreen)}`);
  }
  if (flat(r.emojiScreen) !== flat(r.emojiHistory)) {
    bad.push(
      `the emoji row differs by more than spacing: ${JSON.stringify(r.emojiScreen)} against ${JSON.stringify(r.emojiHistory)}`
    );
  }
  if (r.wideInScreen !== '\u8a9e\u30c6\u30ad ab') {
    bad.push(`the in-screen wide drag copied ${JSON.stringify(r.wideInScreen)}`);
  }
  const wrapped = r.wrappedInScreen ?? '';
  if (
    wrapped.includes('\n') ||
    wrapped.length < 100 ||
    !/^[A-J]+$/.test(wrapped)
  ) {
    bad.push(`the in-screen wrapped drag copied ${JSON.stringify(wrapped.slice(0, 30))}`);
  }
  return bad;
}

// ---------------------------------------------------------------------------
// --self-test: the graders, on fixtures, with no app at all.
// ---------------------------------------------------------------------------

function selfTest() {
  const seq = (from, to) => {
    const out = [];
    for (let n = from; n <= to; n += 1) out.push(String(n));
    return out;
  };
  const hold = {
    anchorRow: 39,
    anchorNumber: 898,
    positionAtEdge: 0,
    positionAfterHold: 324,
    copied: ['', ...seq(898 - 362, 898)]
  };
  const cases = [
    ['A green', () => gradeHold(hold).length === 0],
    [
      'A red on one screen',
      () => gradeHold({ ...hold, copied: ['', ...seq(857, 898)] }).length > 0
    ],
    [
      'A red on a gap',
      () =>
        gradeHold({
          ...hold,
          copied: ['', ...seq(536, 700), ...seq(702, 898), '899']
        }).length > 0
    ],
    [
      'A red on the wrong anchor',
      () => gradeHold({ ...hold, anchorNumber: 899 }).length > 0
    ],
    [
      'B green',
      () =>
        gradeDown({
          rows: 43,
          anchorRow: 5,
          positionAtPress: 100,
          positionAfterHold: 0,
          copied: ['5', ...seq(806, 941), 'sh-']
        }).length === 0
    ],
    [
      'B red short',
      () =>
        gradeDown({
          rows: 43,
          anchorRow: 5,
          positionAtPress: 100,
          positionAfterHold: 0,
          copied: ['5', ...seq(900, 941), 'sh-']
        }).length > 0
    ],
    [
      'R green',
      () =>
        gradeReverse({
          rows: 43,
          anchorRow: 20,
          anchorNumber: 878,
          positionAtTurn: 60,
          positionAfterHold: 0,
          copied: [...seq(878, 899), 'sh-3.2$ ']
        }).length === 0
    ],
    [
      'R red when the anchor slid',
      () =>
        gradeReverse({
          rows: 43,
          anchorRow: 20,
          anchorNumber: 878,
          positionAtTurn: 60,
          positionAfterHold: 0,
          copied: [...seq(818, 899), 'sh-3.2$ ']
        }).length > 0
    ],
    [
      'C green',
      () =>
        gradeTop({
          anchorRow: 39,
          history: 861,
          positionAfterHold: 861,
          copied: ['', ...seq(1, 900)]
        }).length === 0
    ],
    [
      'C red when it ran past or stopped short',
      () =>
        gradeTop({
          anchorRow: 39,
          history: 861,
          positionAfterHold: 800,
          copied: ['', ...seq(1, 900)]
        }).length > 0
    ],
    [
      'D green',
      () =>
        gradeStream({
          historyGrew: 38,
          rowsDragged: 12,
          anchorCandidates: ['STREAM-9', 'STREAM-10'],
          copied: [...seq(1, 12).map((n) => `STREAM-${String(Number(n) - 3)}`), 'STREAM-9'],
          tmuxQuiet: ['STREAM-31', 'STREAM-32', 'STREAM-33'],
          xtermQuiet: ['TREAM-31', 'STREAM-32', 'STREAM-33']
        }).length === 0
    ],
    [
      'D red when the anchor slid',
      () =>
        gradeStream({
          historyGrew: 38,
          rowsDragged: 12,
          anchorCandidates: ['STREAM-9'],
          copied: [...seq(1, 48).map((n) => `STREAM-${n}`)],
          tmuxQuiet: ['STREAM-31', 'STREAM-32', 'STREAM-33'],
          xtermQuiet: ['TREAM-31', 'STREAM-32', 'STREAM-33']
        }).length > 0
    ],
    [
      'D red when the quiet control disagrees',
      () =>
        gradeStream({
          historyGrew: 38,
          rowsDragged: 12,
          anchorCandidates: ['STREAM-9', 'STREAM-10'],
          copied: [...seq(1, 12).map((n) => `STREAM-${String(Number(n) - 3)}`), 'STREAM-9'],
          tmuxQuiet: ['STREAM-31', 'STREAM-32', 'STREAM-33'],
          xtermQuiet: ['TREAM-31', 'STREAM-32', '861']
        }).length > 0
    ],
    [
      'E red when the emoji row differs by more than spacing',
      () =>
        gradeIdentity({
          rows: 43,
          positionWhenOffScreen: 63,
          fromHistory: `x\n${'ABCDEFGHIJ'.repeat(40)}\n日本語テキ abc def end`,
          fromScreen: `x\n${'ABCDEFGHIJ'.repeat(40)}\n日本語テキ abc def end`,
          wideInScreen: '語テキ ab',
          wrappedInScreen: 'ABCDEFGHIJ'.repeat(14),
          emojiScreen: 'pad 😀  end',
          emojiHistory: 'pad 😀 en'
        }).length > 0
    ],
    [
      'E green',
      () =>
        gradeIdentity({
          rows: 43,
          positionWhenOffScreen: 63,
          fromHistory: `x\n${'ABCDEFGHIJ'.repeat(40)}\n日本語テキ abc def end`,
          fromScreen: `x\n${'ABCDEFGHIJ'.repeat(40)}\n日本語テキ abc def end`,
          wideInScreen: '語テキ ab',
          wrappedInScreen: 'ABCDEFGHIJ'.repeat(14),
          emojiScreen: 'pad 😀  end',
          emojiHistory: 'pad 😀 end'
        }).length === 0
    ],
    [
      'E red when the paths differ by one byte',
      () =>
        gradeIdentity({
          rows: 43,
          positionWhenOffScreen: 63,
          fromHistory: `x\n${'ABCDEFGHIJ'.repeat(40)}\n日本語テキ abc def end`,
          fromScreen: `x\n${'ABCDEFGHIJ'.repeat(40)}\n日本語テキ abc def end `,
          wideInScreen: '語テキ ab',
          wrappedInScreen: 'ABCDEFGHIJ'.repeat(14),
          emojiScreen: 'pad 😀  end',
          emojiHistory: 'pad 😀 end'
        }).length > 0
    ],
    [
      'E red when the second copy was taken with the range still on screen',
      () =>
        gradeIdentity({
          rows: 43,
          positionWhenOffScreen: 40,
          fromHistory: `${'ABCDEFGHIJ'.repeat(40)}\n日本語テキ abc def end`,
          fromScreen: `${'ABCDEFGHIJ'.repeat(40)}\n日本語テキ abc def end`,
          wideInScreen: '語テキ ab',
          wrappedInScreen: 'ABCDEFGHIJ'.repeat(14),
          emojiScreen: 'pad 😀  end',
          emojiHistory: 'pad 😀 end'
        }).length > 0
    ],
    [
      'E red when a wrapped row is joined with a newline',
      () =>
        gradeIdentity({
          rows: 43,
          positionWhenOffScreen: 63,
          fromHistory: `${'ABCDEFGHIJ'.repeat(14)}\n${'ABCDEFGHIJ'.repeat(26)}\n日本語テキ abc def end`,
          fromScreen: `${'ABCDEFGHIJ'.repeat(14)}\n${'ABCDEFGHIJ'.repeat(26)}\n日本語テキ abc def end`,
          wideInScreen: '語テキ ab',
          wrappedInScreen: 'ABCDEFGHIJ'.repeat(14),
          emojiScreen: 'pad 😀  end',
          emojiHistory: 'pad 😀 end'
        }).length > 0
    ]
  ];
  let failed = 0;
  for (const [name, check] of cases) {
    const ok = check();
    if (!ok) failed += 1;
    console.log(`${TAG} self-test ${ok ? 'ok  ' : 'FAIL'} ${name}`);
  }
  console.log(
    `${TAG} self-test: ${String(cases.length - failed)} of ${String(cases.length)} fixtures behaved`
  );
  return failed === 0;
}

if (process.argv.includes('--self-test')) {
  process.exit(selfTest() ? 0 : 1);
}

// ---------------------------------------------------------------------------
// The app run.
// ---------------------------------------------------------------------------

const { withElectron, withoutDevRenderer } = await import(
  join(REPO, 'build', 'electron-run.mjs')
);
const { cdpEval, wsConnect } = await import(join(REPO, 'build', 'cdp-client.mjs'));

if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} out/main/index.js is missing. Run npm run build.`);
  process.exit(2);
}

const root = realpathSync(mkdtempSync(join(tmpdir(), 'p209-')));
const project = join(root, 'project');
const profile = join(root, 'profile');
const home = join(root, 'home');
const pbDir = join(root, 'pasteboard');
for (const dir of [project, profile, home, pbDir]) {
  mkdirSync(dir, { recursive: true });
}
writeFileSync(join(project, 'README.md'), '# p209\n', 'utf8');

// The pasteboard keeper, compiled into this run and never shipped.
const PB = join(root, 'pb');
{
  const built = spawnSync(
    'swiftc',
    ['-O', '-o', PB, join(REPO, 'build', 'pasteboard-keep.swift')],
    { encoding: 'utf8' }
  );
  if (built.status !== 0) {
    console.error(`${TAG} the pasteboard keeper did not compile:\n${built.stderr}`);
    process.exit(2);
  }
}
const pb = (...args) =>
  (spawnSync(PB, args, { encoding: 'utf8' }).stdout ?? '').trim();
const pbpaste = () => spawnSync('pbpaste', [], { encoding: 'utf8' }).stdout ?? '';
const pbFlavours = (info) => info.replace(/^changeCount=\d+\n?/, '');

function operatorSessions() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], {
    encoding: 'utf8'
  });
  return (out.stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
}
function processCount() {
  const out = spawnSync(
    '/bin/sh',
    [
      '-c',
      'ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct | wc -l'
    ],
    { encoding: 'utf8' }
  );
  return Number((out.stdout ?? '0').trim());
}
function tmux(...args) {
  const r = spawnSync('tmux', ['-L', SOCKET, ...args], { encoding: 'utf8' });
  return (r.stdout ?? '').replace(/\n$/, '');
}

const PAGE_KIT = String.raw`
(() => {
  const kit = {};
  kit.screen = () => document.querySelector('.xterm-screen');
  kit.textarea = () => document.querySelector('.xterm-helper-textarea');
  kit.rect = () => {
    const s = kit.screen();
    if (s === null) return null;
    const b = s.getBoundingClientRect();
    return { left: b.left, top: b.top, width: b.width, height: b.height };
  };
  globalThis.__p209 = kit;
  return true;
})()
`;

async function cdpForAppWindow(timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(
        readFileSync(join(profile, 'DevToolsActivePort'), 'utf8')
          .split('\n')[0]
          .trim()
      );
    } catch {
      port = 0;
    }
    if (port > 0) {
      let list = [];
      try {
        list = await (
          await fetch(`http://127.0.0.1:${String(port)}/json/list`)
        ).json();
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
            `typeof window.gmux === 'object' && typeof window.__gmuxP95 === 'object' ? location.href : null`,
            5000
          );
          if (typeof answer === 'string') return { cdp, url: answer };
          cdp.close();
        } catch {
          try {
            cdp?.close();
          } catch {
            /* already gone */
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error('no page answered for the app window in time');
    }
    await sleep(250);
  }
}

const report = { hold: {}, down: {}, reverse: {}, top: {}, stream: {}, identity: {}, notes: [] };
let threw = null;

const processesBefore = processCount();
const operatorBefore = operatorSessions();
say(`the operator session count before: ${String(operatorBefore)}`);
say(`processes of the Electron family before: ${String(processesBefore)}`);
const pbBefore = pb('info');
say(`pasteboard saved: ${pb('save', pbDir)}`);
writeFileSync(join(root, 'pasteboard-before.txt'), pbBefore, 'utf8');

try {
  await withElectron(
    {
      label: 'p209 selection',
      userDataDir: profile,
      tmuxSocket: SOCKET,
      cwd: REPO,
      args: ['--remote-debugging-port=0', '--use-mock-keychain'],
      env: withoutDevRenderer({
        HOME: home,
        GMUX_TMUX_SOCKET: SOCKET,
        GMUX_PROBES: '1',
        GMUX_SHOT: join(root, 'p209-unused.png'),
        GMUX_SHOT_DELAY_MS: '1500000',
        GMUX_SHOT_POPUP_PICK: 'p209 no row carries this label'
      }),
      ceilingMs: 15 * 60 * 1000,
      echo: false
    },
    async (handle) => {
      const { cdp, url } = await cdpForAppWindow(120_000);
      say(`the app window is at ${url}`);
      await cdp.call('Runtime.enable');
      await cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true });
      for (;;) {
        const done = await cdpEval(
          cdp,
          `performance.getEntriesByType('navigation')[0].loadEventEnd`
        );
        if (done > 0) break;
        await sleep(100);
      }
      await cdpEval(cdp, PAGE_KIT);
      await cdpEval(
        cdp,
        `window.__gmuxP95.openLocal(${JSON.stringify(project)}).then(() => true)`,
        90_000
      );
      await cdpEval(
        cdp,
        `window.__gmuxP95.create({ name: 'p209', agent: 'shell' }).then(() => true)`,
        120_000
      );
      const state = await cdpEval(cdp, `window.__gmuxP95.state()`);
      const row = state.sessions[0];
      if (row === undefined) throw new Error('no session was created');
      const S = JSON.stringify(row.id);
      const T = row.tmuxName;
      say(`session ${row.name} on ${T}`);

      // -- readers ----------------------------------------------------------
      const tmuxState = () => {
        const out = tmux(
          'display-message',
          '-p',
          '-t',
          T,
          '-F',
          '#{pane_in_mode}\t#{scroll_position}\t#{history_size}\t#{pane_height}\t#{pane_width}'
        ).split('\t');
        return {
          inMode: out[0] === '1',
          position: Number(out[1]) || 0,
          history: Number(out[2]) || 0,
          rows: Number(out[3]) || 0,
          cols: Number(out[4]) || 0
        };
      };
      /** The rows on screen under a view parked `position` lines up. */
      const viewRows = (position, rows) =>
        tmux(
          'capture-pane',
          '-p',
          '-t',
          T,
          '-S',
          String(-position),
          '-E',
          String(rows - 1 - position)
        ).split('\n');
      const appState = () =>
        cdpEval(cdp, `window.gmux.scroll.state({ sessionId: ${S} })`);
      const send = (text) =>
        cdpEval(
          cdp,
          `window.gmux.term.sendInput(${S}, ${JSON.stringify(text)}), true`
        );
      const scrollBy = (lines) =>
        cdpEval(
          cdp,
          `window.gmux.scroll.by({ sessionId: ${S}, lines: ${String(lines)} }).then(() => true)`,
          30_000
        );
      const scrollTo = (position) =>
        cdpEval(
          cdp,
          `window.gmux.scroll.to({ sessionId: ${S}, position: ${String(position)} }).then(() => true)`,
          30_000
        );
      const live = async () => {
        await cdpEval(cdp, `window.__gmuxP95.live(${S}).then(() => true)`, 60_000);
        await sleep(800);
      };
      const focusPane = async () => {
        await cdpEval(cdp, `window.__p209.textarea()?.focus(), true`);
        await sleep(300);
      };
      const mouse = (type, x, y, extra = {}) =>
        cdp.call('Input.dispatchMouseEvent', {
          type,
          x: Math.round(x),
          y: Math.round(y),
          button: extra.button ?? 'left',
          buttons: extra.buttons ?? 0,
          clickCount: extra.clickCount ?? 0,
          modifiers: 0
        });
      const cmdC = async () => {
        spawnSync('pbcopy', [], { input: 'p209 sentinel' });
        const key = {
          key: 'c',
          code: 'KeyC',
          modifiers: 4,
          windowsVirtualKeyCode: 67,
          nativeVirtualKeyCode: 67
        };
        await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...key });
        await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...key });
        // A copy from the history is a round trip and a compose; give a long
        // one time to land, and stop as soon as the sentinel is gone.
        for (let i = 0; i < 60; i += 1) {
          await sleep(100);
          const text = pbpaste();
          if (text !== 'p209 sentinel') return text;
        }
        return pbpaste();
      };
      const linesOf = (text) => text.split('\n');

      // -- seed --------------------------------------------------------------
      await send('seq 1 900\r');
      for (let i = 0; i < 60; i += 1) {
        if ((await appState())?.history >= 400) break;
        await sleep(500);
      }
      await sleep(800);
      const seeded = tmuxState();
      const rect = await cdpEval(cdp, `window.__p209.rect()`);
      const rows = seeded.rows;
      const cols = seeded.cols;
      const cellHeight = rect.height / rows;
      const cellWidth = rect.width / cols;
      const yOf = (r) => rect.top + (r + 0.5) * cellHeight;
      const xOf = (c) => rect.left + (c + 0.5) * cellWidth;
      /**
       * The x a drag is PRESSED at, a fifth of the way into the cell rather
       * than at its middle. xterm maps a pixel to a selection cell with
       * `ceil((x + width / 2) / width)`, so the middle of a cell is exactly
       * the tipping point between it and the next one, and a rounding either
       * way puts xterm's own drag one column off this module's: measured on
       * 2026-09-03 the same press pixel gave xterm column 1 and cellAtPoint
       * column 0, and the two copies of arm E differed by that one leading
       * character. The END of a drag keeps the middle, where the two agree.
       */
      const xStart = (c) => rect.left + (c + 0.2) * cellWidth;
      const xAt = (f) => rect.left + rect.width * f;
      const bottom = rect.top + rect.height;
      say(
        `seeded ${String(seeded.history)} lines of history, ${String(rows)}x${String(cols)}, cell ${cellWidth.toFixed(2)}x${cellHeight.toFixed(2)}`
      );

      /** Hold the pointer at `y` with the button down until `until` says so. */
      const holdAt = async (x, y, until, capMs) => {
        const started = Date.now();
        for (;;) {
          await mouse('mouseMoved', x, y, { buttons: 1 });
          await sleep(50);
          if (await until()) return;
          if (Date.now() - started > capMs) return;
        }
      };
      const dragInside = async (c0, r0, c1, r1) => {
        await mouse('mousePressed', xStart(c0), yOf(r0), {
          buttons: 1,
          clickCount: 1
        });
        await sleep(60);
        for (let i = 1; i <= 4; i += 1) {
          await mouse(
            'mouseMoved',
            xOf(c0 + ((c1 - c0) * i) / 4),
            yOf(r0 + ((r1 - r0) * i) / 4),
            { buttons: 1 }
          );
          await sleep(40);
        }
      };
      const releaseAt = async (x, y) => {
        await mouse('mouseReleased', x, y, { buttons: 0, clickCount: 1 });
        await sleep(400);
      };
      const clickAway = async () => {
        await mouse('mousePressed', xStart(1), yOf(1), {
          buttons: 1,
          clickCount: 1
        });
        await mouse('mouseReleased', xOf(1), yOf(1), { buttons: 0, clickCount: 1 });
        await sleep(200);
      };

      // -- A: the eight second hold ---------------------------------------
      if (ARMS.has('A')) {
        await live();
        await focusPane();
        const anchorRow = rows - 4;
        const anchorNumber = Number(viewRows(0, rows)[anchorRow]);
        // Pressed past the three digits, so the anchor line is copied whole:
        // the anchor is the END of this range and the copy stops at its cell.
        await dragInside(3, anchorRow, 12, anchorRow - 8);
        const atEdge = tmuxState();
        const holdStarted = Date.now();
        await holdAt(xAt(0.3), rect.top - 20, () => false, HOLD_MS);
        const holdTook = Date.now() - holdStarted;
        const after = tmuxState();
        await releaseAt(xAt(0.3), rect.top - 20);
        const app = await appState();
        const copied = await cmdC();
        report.hold = {
          holdMs: holdTook,
          anchorRow,
          anchorNumber,
          positionAtEdge: atEdge.position,
          positionAfterHold: after.position,
          travelled: after.position - atEdge.position,
          appAfterHold: app,
          copiedLines: linesOf(copied).length,
          copied: linesOf(copied),
          parent: {
            note: 'measured at a87a826 on 2026-09-03 by the same gesture',
            travelled: 324,
            copiedLines: 43
          }
        };
        say(
          `A: travelled ${String(report.hold.travelled)}, copied ${String(report.hold.copiedLines)} lines, ` +
            `${JSON.stringify(report.hold.copied[1])} to ${JSON.stringify(report.hold.copied.at(-1))}`
        );
        writeFileSync(join(root, 'A-copied.txt'), copied, 'utf8');
        await clickAway();
      }

      // -- B: a hold below the bottom from a parked view ------------------
      if (ARMS.has('B')) {
        await live();
        await focusPane();
        await scrollTo(100);
        await sleep(600);
        const parked = tmuxState();
        const anchorRow = 5;
        await dragInside(2, anchorRow, 6, anchorRow + 6);
        await holdAt(xOf(2), bottom + 60, async () => tmuxState().position === 0, 8000);
        await sleep(300);
        const after = tmuxState();
        await releaseAt(xOf(2), bottom + 60);
        const copied = await cmdC();
        report.down = {
          rows,
          anchorRow,
          positionAtPress: parked.position,
          positionAfterHold: after.position,
          copiedLines: linesOf(copied).length,
          copied: linesOf(copied)
        };
        say(
          `B: parked ${String(parked.position)}, ended ${String(after.position)}, copied ${String(report.down.copiedLines)} lines`
        );
        writeFileSync(join(root, 'B-copied.txt'), copied, 'utf8');
        await clickAway();
      }

      // -- R: a drag that reverses past its anchor -------------------------
      if (ARMS.has('R')) {
        await live();
        await focusPane();
        const anchorRow = 20;
        const anchorNumber = Number(viewRows(0, rows)[anchorRow]);
        await dragInside(0, anchorRow, 8, anchorRow - 6);
        await holdAt(xOf(0), rect.top - 20, async () => tmuxState().position >= 40, 6000);
        const atTurn = tmuxState();
        await holdAt(xOf(0), bottom + 60, async () => tmuxState().position === 0, 8000);
        await sleep(300);
        const after = tmuxState();
        await releaseAt(xOf(0), bottom + 60);
        const copied = await cmdC();
        report.reverse = {
          rows,
          anchorRow,
          anchorNumber,
          positionAtTurn: atTurn.position,
          positionAfterHold: after.position,
          copiedLines: linesOf(copied).length,
          copied: linesOf(copied)
        };
        say(
          `R: turned at ${String(atTurn.position)}, ended ${String(after.position)}, copied ${String(report.reverse.copiedLines)} lines from ${JSON.stringify(report.reverse.copied[0])}`
        );
        writeFileSync(join(root, 'R-copied.txt'), copied, 'utf8');
        await clickAway();
      }

      // -- C: the top of the history ---------------------------------------
      if (ARMS.has('C')) {
        await live();
        await focusPane();
        const anchorRow = rows - 4;
        await dragInside(3, anchorRow, 12, anchorRow - 8);
        let same = 0;
        let last = -1;
        await holdAt(
          xAt(0.3),
          rect.top - 300,
          async () => {
            const p = tmuxState().position;
            same = p === last ? same + 1 : 0;
            last = p;
            return same >= 6;
          },
          40_000
        );
        const after = tmuxState();
        await releaseAt(xAt(0.3), rect.top - 300);
        const copied = await cmdC();
        report.top = {
          anchorRow,
          history: after.history,
          positionAfterHold: after.position,
          copiedLines: linesOf(copied).length,
          copied: linesOf(copied)
        };
        say(
          `C: stopped at ${String(after.position)} of ${String(after.history)}, copied ${String(report.top.copiedLines)} lines, first numbered ${JSON.stringify(report.top.copied[1])}`
        );
        writeFileSync(join(root, 'C-copied.txt'), copied, 'utf8');
        await clickAway();
      }

      // -- D: a streaming pane under a live drag ---------------------------
      if (ARMS.has('D')) {
        await live();
        await focusPane();
        await send('i=0; while :; do i=$((i+1)); echo STREAM-$i; sleep 0.1; done\r');
        await sleep(1500);
        const anchorRow = rows - 6;
        const rowsDragged = 6;
        const beforePress = viewRows(0, rows);
        await mouse('mousePressed', xStart(12), yOf(anchorRow), {
          buttons: 1,
          clickCount: 1
        });
        const afterPress = viewRows(0, rows);
        await sleep(60);
        for (let i = 1; i <= rowsDragged; i += 1) {
          await mouse('mouseMoved', xOf(6), yOf(anchorRow - i), { buttons: 1 });
          await sleep(40);
        }
        // Six lines from the wheel path while the button is down: the takeover.
        await scrollBy(6);
        const takeover = tmuxState();
        for (let i = 0; i < 40; i += 1) {
          await mouse('mouseMoved', xOf(6), yOf(anchorRow - rowsDragged), { buttons: 1 });
          await sleep(100);
        }
        const after = tmuxState();
        const appAfter = await appState();
        const rowsUnderHighlight = viewRows(after.position, rows).slice(
          anchorRow - rowsDragged,
          anchorRow + 1
        );
        await releaseAt(xOf(6), yOf(anchorRow - rowsDragged));
        const copied = await cmdC();
        // WHY A HELD RANGE IS NEVER ANSWERED FROM THE SCREEN, read rather
        // than asserted. What does the pane's own xterm hold on those rows
        // right now? A fresh in-screen drag that never scrolls holds nothing,
        // so what it copies is xterm's own text and nothing else.
        await clickAway();
        const tmuxUnderStream = viewRows(tmuxState().position, rows).slice(
          anchorRow - rowsDragged,
          anchorRow + 1
        );
        await dragInside(0, anchorRow - rowsDragged, 20, anchorRow);
        await releaseAt(xOf(20), yOf(anchorRow));
        const xtermUnderStream = await cmdC();
        // The interrupt has to reach the shell rather than the copy mode key
        // table, so the pane leaves copy mode first and the loop is seen to
        // stop before the next arm types anything. This goes over the scratch
        // socket rather than through the app, because a stream still running
        // under arm E would make its two copies describe different bytes and
        // the identity would be meaningless.
        await live();
        tmux('send-keys', '-t', T, '-X', 'cancel');
        await sleep(200);
        tmux('send-keys', '-t', T, 'C-c');
        let stopped = false;
        for (let i = 0; i < 25; i += 1) {
          const a = tmuxState().history;
          await sleep(400);
          if (tmuxState().history === a) {
            stopped = true;
            break;
          }
          tmux('send-keys', '-t', T, 'C-c');
        }
        if (!stopped) report.notes.push('the streaming loop did not stop');
        // THE CONTROL for the reading above: the same two rows with the pane
        // QUIET and parked, which must agree exactly. That is what says the
        // gap under a stream is the client's paint running behind tmux's grid
        // rather than this phase's arithmetic.
        await scrollTo(40);
        await sleep(1500);
        const quietPos = tmuxState().position;
        const tmuxQuiet = viewRows(quietPos, rows).slice(
          anchorRow - rowsDragged,
          anchorRow + 1
        );
        await clickAway();
        await dragInside(0, anchorRow - rowsDragged, 20, anchorRow);
        await releaseAt(xOf(20), yOf(anchorRow));
        const xtermQuiet = await cmdC();
        report.stream = {
          appAfterHold: appAfter,
          rowsUnderHighlight,
          tmuxUnderStream,
          xtermUnderStream: linesOf(xtermUnderStream),
          quietPosition: quietPos,
          tmuxQuiet,
          xtermQuiet: linesOf(xtermQuiet),
          anchorCandidates: [beforePress[anchorRow], afterPress[anchorRow]],
          rowsDragged,
          positionAtTakeover: takeover.position,
          historyAtTakeover: takeover.history,
          positionAfterHold: after.position,
          historyAfterHold: after.history,
          historyGrew: after.history - takeover.history,
          copiedLines: linesOf(copied).length,
          copied: linesOf(copied)
        };
        say(
          `D: ${String(report.stream.historyGrew)} lines arrived, copied ${String(report.stream.copiedLines)} lines ending ${JSON.stringify(report.stream.copied.at(-1))}, anchor ${JSON.stringify(report.stream.anchorCandidates)}`
        );
        writeFileSync(join(root, 'D-copied.txt'), copied, 'utf8');
        await clickAway();
      }

      // -- E: the two paths over the same range ----------------------------
      if (ARMS.has('E')) {
        await live();
        await focusPane();
        await send(
          'yes ABCDEFGHIJ | head -40 | tr -d "\\n"; echo; ' +
            'printf "\\033[31m\u65e5\u672c\u8a9e\u30c6\u30ad\\033[0m abc def end\\n"; ' +
            'printf "pad \ud83d\ude00 end\\n"; seq 1 20\r'
        );
        await sleep(1500);
        const screen = viewRows(0, rows);
        const wrapRow = screen.findIndex((l) =>
          l.startsWith('ABCDEFGHIJABCDEFGHIJ')
        );
        // AFTER the wrapped block, because the echoed command line carries
        // both words too and findIndex would answer with it.
        const wideRow = screen.findIndex(
          (l, i) => i > wrapRow && l.includes('abc') && l.includes('end')
        );
        const emojiRow = screen.findIndex(
          (l, i) => i > wrapRow && l.startsWith('pad ')
        );
        say(
          `E: the wrapped row is ${String(wrapRow)}, the wide row is ${String(wideRow)} and the emoji row is ${String(emojiRow)}`
        );
        // The two small pins of what xterm alone produces, so the ordinary
        // case is seen unchanged: a wide drag that starts on the second half
        // of a character, and a drag across a wrapped row end.
        await dragInside(3, wideRow, 12, wideRow);
        await releaseAt(xOf(12), yOf(wideRow));
        const wideInScreen = await cmdC();
        await clickAway();
        await dragInside(0, wrapRow, 4, wrapRow + 1);
        await releaseAt(xOf(4), yOf(wrapRow + 1));
        const wrappedInScreen = await cmdC();
        await clickAway();
        // PATH A, xterm's own. A drag that never scrolls holds nothing, so
        // this is exactly the code the parent ran.
        await dragInside(0, wrapRow, 30, wideRow);
        await releaseAt(xOf(30), yOf(wideRow));
        const fromScreen = await cmdC();
        await clickAway();
        // PATH B, the history. The SAME cells, then a wheel scroll under the
        // button that takes the drag over and a scroll back to where it was,
        // so the head lands on the line it started on and the range is the
        // one path A copied. The button comes up, and only then is the view
        // moved far enough that no row of the range is on screen at all: the
        // highlight is gone, xterm has nothing to answer with, and a copy
        // that still carries the text can only have come from the server.
        await dragInside(0, wrapRow, 30, wideRow);
        await scrollBy(5);
        await sleep(700);
        await mouse('mouseMoved', xOf(30), yOf(wideRow), { buttons: 1 });
        await scrollTo(0);
        await sleep(700);
        await mouse('mouseMoved', xOf(30), yOf(wideRow), { buttons: 1 });
        await sleep(200);
        await releaseAt(xOf(30), yOf(wideRow));
        await scrollTo(rows + 20);
        await sleep(900);
        const away = tmuxState();
        const fromHistory = await cmdC();
        await scrollTo(0);
        await sleep(400);
        // THE ONE THING THAT DOES NOT AGREE, measured rather than avoided. A
        // character the pane's terminal measures NARROWER than the session
        // server does, being an emoji beyond the Unicode 6 table xterm ships
        // with, is painted by the server with a pad cell after it, and
        // `capture-pane` answers the character with no pad. So the screen
        // copy carries one more space than the composed one and the two agree
        // on everything else. It is read here so a later round finds the
        // number rather than the claim.
        await clickAway();
        await dragInside(0, emojiRow, 30, emojiRow);
        await releaseAt(xOf(30), yOf(emojiRow));
        const emojiScreen = await cmdC();
        await clickAway();
        await dragInside(0, emojiRow, 30, emojiRow);
        await scrollBy(5);
        await sleep(700);
        await mouse('mouseMoved', xOf(30), yOf(emojiRow), { buttons: 1 });
        await scrollTo(0);
        await sleep(700);
        await mouse('mouseMoved', xOf(30), yOf(emojiRow), { buttons: 1 });
        await sleep(200);
        await releaseAt(xOf(30), yOf(emojiRow));
        await scrollTo(rows + 20);
        await sleep(900);
        const emojiHistory = await cmdC();
        await scrollTo(0);
        await sleep(400);
        await clickAway();
        report.identity = {
          rows,
          wrapRow,
          wideRow,
          emojiRow,
          emojiScreen,
          emojiHistory,
          wideInScreen,
          wrappedInScreen,
          positionWhenOffScreen: away.position,
          fromHistory,
          fromScreen,
          identical: fromHistory === fromScreen,
          bytes: fromHistory.length
        };
        say(
          `E: with the range ${String(away.position)} lines off the screen, ` +
            `${String(fromHistory.length)} bytes from the history and ${String(fromScreen.length)} from the screen, ` +
            `${fromHistory === fromScreen ? 'IDENTICAL' : 'DIFFERENT'}`
        );
        writeFileSync(join(root, 'E-history.txt'), fromHistory, 'utf8');
        writeFileSync(join(root, 'E-screen.txt'), fromScreen, 'utf8');
        await clickAway();
      }

      report.thrown = cdp
        .events()
        .filter((e) => e.method === 'Runtime.exceptionThrown')
        .map((e) => e.params?.exceptionDetails?.text ?? '')
        .slice(0, 10);
      await cdpEval(cdp, `window.__gmuxP95.kill(${S}).then(() => true)`, 90_000);
      try {
        cdp.close();
      } catch {
        /* already gone */
      }
      writeFileSync(join(root, 'p209-app.log'), handle.text(), 'utf8');
      return true;
    }
  );
} catch (err) {
  threw = err;
  console.error(`${TAG} threw: ${String(err?.stack ?? err)}`);
} finally {
  say(`pasteboard restored: ${pb('restore', pbDir)}`);
  const pbAfter = pb('info');
  const same = pbFlavours(pbBefore) === pbFlavours(pbAfter);
  report.notes.push(
    `pasteboard flavours after the restore are ${same ? 'identical to' : 'DIFFERENT from'} before`
  );
  if (!same) console.error(`${TAG} before:\n${pbBefore}\nafter:\n${pbAfter}`);
  writeFileSync(join(root, 'pasteboard-after.txt'), pbAfter, 'utf8');
}

const reportPath = join(root, 'p209-report.json');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
say(`the readings are at ${reportPath}`);

const operatorAfter = operatorSessions();
const processesAfter = processCount();
say(`the operator session count after: ${String(operatorAfter)}`);
say(
  `processes of the Electron family after: ${String(processesAfter)} (before ${String(processesBefore)})`
);
say(`socket left: ${existsSync(`/private/tmp/tmux-501/${SOCKET}`) ? 'YES' : 'no'}`);

const graded = (arm, grade, readings) =>
  ARMS.has(arm) ? grade(readings).map((f) => `${arm}: ${f}`) : [];
const findings = [
  ...(threw === null ? [] : [`the run threw: ${String(threw?.message ?? threw)}`]),
  ...graded('A', gradeHold, report.hold),
  ...graded('B', gradeDown, report.down),
  ...graded('R', gradeReverse, report.reverse),
  ...graded('C', gradeTop, report.top),
  ...graded('D', gradeStream, report.stream),
  ...graded('E', gradeIdentity, report.identity),
  ...(report.notes.every((n) => n.includes('identical'))
    ? []
    : ['the pasteboard after the restore is not the pasteboard before']),
  ...(operatorAfter === operatorBefore
    ? []
    : [
        `the operator session count moved from ${String(operatorBefore)} to ${String(operatorAfter)}`
      ])
];
for (const f of findings) console.error(`${TAG} FINDING ${f}`);
if (findings.length === 0) {
  say('every arm is green: the selection is the history, and the ordinary case is unchanged');
  for (const dir of [profile, project, home]) {
    rmSync(dir, { recursive: true, force: true });
  }
}
process.exit(findings.length === 0 ? 0 : 1);
