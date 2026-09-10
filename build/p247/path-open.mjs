#!/usr/bin/env node
/**
 * path-open.mjs. THE PHASE 247 APP RUN: a path in a transcript, pressed.
 *
 * ONE Electron on a scratch profile, a scratch HOME and this script's own tmux
 * socket, over a project it builds inside its own scratch directory. It spawns
 * no agent, spends no token, opens no keychain and makes no request. The
 * session is a plain shell and the "agent" writing paths into the transcript
 * is that shell echoing them.
 *
 * **NOTHING IS EVER OPENED BY macOS.** `GMUX_PATH_OPEN_RECORD` is set for the
 * whole run, so the external door appends one JSON line naming the path and
 * STARTS NOTHING. LaunchServices is never handed a byte, no application of the
 * operator's is launched, and nothing of his is executed. That is not a
 * convenience — it is the rule this phase runs under, and the record file is
 * what makes an arm that must open something readable without opening it.
 *
 * ## The arms
 *
 *   R. THE RESTING FACE. Before the pointer has been anywhere near a path,
 *      no editor tab is open and the record file does not exist. Research 107
 *      refusal 4: nothing is decorated until somebody points at it.
 *   A. A PATH TORTIE DRAWS. Hover the cell the path really occupies, click,
 *      and an editor tab opens wearing that file's name. The record file is
 *      still empty, because a kind Tortie draws never leaves.
 *   B. A PATH THE MAC DRAWS. The same gesture over a `.pdf`, and the record
 *      file holds exactly one line naming the REALPATH — which is what
 *      LaunchServices would have been handed.
 *   C. AN EXECUTABLE. The same gesture over a `.sh` with mode 0755. No tab
 *      opens and the record file does not grow. This is the arm that says the
 *      mode rule is live in the running app rather than only in a unit test.
 *   D. A CREDENTIAL BY NAME. The same gesture over the `.npmrc` Phase 247
 *      added to `NEVER_PREVIEW`. No tab, no record line.
 *   E. A PATH THAT RUNS OFF THE ROW. A file buried deep enough that its
 *      absolute path is longer than the pane is wide, so the row wraps. The
 *      same gesture over the fragment, and nothing happens — refusal 8, which
 *      this phase did NOT lift, live in the running app. It is the shape of
 *      the screenshot in issue 18, and the honest answer to that screenshot is
 *      that it stays unclickable: research 111 section 4.2 measured that a
 *      blind rejoin produces a path that really exists 57 times while tmux
 *      confirms 18 of them, so 39 of 57 are joins that never happened.
 *   F. THE UNDERLINE IS DRAWN IN CELLS AND NOT IN STRING INDICES, which is the
 *      Phase 247 FIX ROUND's confirmed defect. Two rows, each carrying a
 *      `⚠️ ` between the marker and the path, which is ordinary agent output
 *      and which a person reads as ONE thing while the terminal spends TWO
 *      cells on it. So the row's string index and its cell column disagree,
 *      and the range the provider shipped was drawn one cell off the path:
 *      its first character was dead and the cell PAST its end handed the file
 *      over. THE COLUMN IS ASKED OF tmux and never modelled — the fix round
 *      modelled it and was wrong by exactly the cell this arm looks for, so
 *      the arm failed against a tree whose link was right. The arm presses
 *      the path's FIRST cell on one file, which must open it, and the cell one
 *      PAST the end on a SECOND file, which must open nothing — two files
 *      because a tab already open cannot be opened again and the two presses
 *      would not be told apart. At the parent both readings are the other way
 *      round. It asserts FIRST that the column it computed really differs from
 *      the string index, so a run where the decoration did not land could not
 *      read as a pass.
 *
 * WHICH CELL IS WHICH IS ANSWERED BY tmux AND NOT BY THIS SCRIPT. `capture-pane`
 * prints the rows the pane really holds, so the row and column of a path are
 * read from the terminal's own server rather than counted here, and xterm's own
 * character measure element gives the cell size. A second instrument answering
 * the geometry is the point: a probe that computed where it thought a path was
 * would be grading its own arithmetic.
 *
 * ## What this run does NOT measure, stated rather than hidden
 *
 * REFUSAL 5, the remote pane. No session in this run can be on another
 * machine: this phase touches no machine and starts no ssh, and
 * `remote_projects` reads 0 rows on this Mac anyway (research 107 refusal 11).
 * The refusal is driven by `src/renderer/terminal/__tests__/p247-path-links.test.ts`
 * over the shipping provider, where a remote pane offers nothing AND main is
 * not asked at all, and by `conformance:pathdoors` rules 7 and 8, which read
 * the closure and its position. It is inherited reasoning here, exactly as
 * research 107 section 13 labels its own.
 *
 * SAFETY. The Electron is started through build/electron-run.mjs, which ends
 * the tree it started in a `finally` whatever happened. The socket is handed in
 * by build/harness-socket.mjs and `gmux` and `default` are refused by name.
 * Every other process this script starts is a synchronous `tmux` or `/bin/sh`
 * that has exited before the call returns. The operator's own `-L gmux`
 * sessions are counted before and after, listed and never attached.
 * `--self-test` proves the grader and the cell reader on fixtures and launches
 * nothing.
 */
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p247]';
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// The grader, and the cell reader. Both proved on fixtures below.
// ---------------------------------------------------------------------------

/** Every [label, got, want] that disagrees. */
function grade(rows) {
  return rows
    .filter(([, got, want]) => JSON.stringify(got) !== JSON.stringify(want))
    .map(([l, got, want]) => `${l}: ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}

/**
 * Where a marked path sits in the rows tmux printed.
 *
 * The marker is what makes this unambiguous: the shell ECHOES the command that
 * printed the line, so the path appears twice in the pane and only the output
 * row opens with the marker.
 */
export function cellOf(rows, marker, path) {
  for (const [row, text] of rows.entries()) {
    if (!text.startsWith(`${marker} `)) continue;
    const col = text.indexOf(path);
    if (col === -1) continue;
    return { row, col, width: path.length, text };
  }
  return null;
}

/**
 * HOW MANY THINGS A PERSON SEES BEFORE THE PATH (the committer's round).
 *
 * The fix round put a hand written width rule here, `columnOf`, and it was
 * wrong by exactly the cell this arm exists to find. It gave a variation
 * selector no column of its own, so it read `mkF1 ⚠️ ` as 7 cells; **tmux
 * reads it as 8**, measured on this run's own server with
 * `#{cursor_x}` — tmux gives `U+26A0 U+FE0F` TWO cells. So arm F pressed one
 * cell to the LEFT of the path on every run and failed on a tree where the
 * product was right.
 *
 * A MODEL IS WHAT BROKE IT, so there is no model any more: the column comes
 * from `prefixColumns` below, which asks tmux. What is counted HERE is
 * something else and it is the arm's own guard — the GRAPHEME CLUSTERS a
 * person sees before the path. On an ASCII row that number equals the column;
 * on a decorated one it is smaller, because a glyph a person reads as one
 * thing takes more than one cell. Arm F refuses to run when the two are equal,
 * which is what stops a run whose decoration never landed reading as a pass.
 */
export function graphemesBefore(text, stringIndex) {
  const head = text.slice(0, stringIndex);
  const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
  let n = 0;
  for (const _ of seg.segment(head)) n += 1;
  return n;
}

/** Arm F's row: the marker, then a decorated prefix, then the path. */
export function decoratedCellOf(rows, marker, path) {
  for (const [row, text] of rows.entries()) {
    if (!text.startsWith(`${marker} `)) continue;
    const at = text.indexOf(path);
    if (at === -1) continue;
    return {
      row,
      at,
      graphemes: graphemesBefore(text, at),
      width: path.length,
      text
    };
  }
  return null;
}

function selfTest() {
  const fixtures = [
    ['all agree', () => grade([['a', 1, 1]]).length, 0],
    ['one wrong', () => grade([['a', 2, 1]]).length, 1],
    ['arrays by value', () => grade([['a', ['p'], ['p']]]).length, 0],
    ['array order matters', () => grade([['a', ['q', 'p'], ['p', 'q']]]).length, 1],
    [
      'the marked row wins over the echoed command',
      () => cellOf(['$ echo "m1 /a/b.md z"', 'm1 /a/b.md z'], 'm1', '/a/b.md')?.row,
      1
    ],
    [
      'the column is where the path really starts',
      () => cellOf(['m1 /a/b.md z'], 'm1', '/a/b.md')?.col,
      3
    ],
    ['no such marker', () => cellOf(['nothing here'], 'm1', '/a/b.md'), null],
    ['the marker must open the row', () => cellOf([' m1 /a/b.md'], 'm1', '/a/b.md'), null],
    ['the path must be on the marked row', () => cellOf(['m1 nothing'], 'm1', '/a/b.md'), null],
    // The committer's round's instrument. A string index is not a column and
    // neither is a count of graphemes — this counts what a PERSON sees, which
    // is what tells a decorated row from an ASCII one.
    ['an ASCII row: every unit is its own grapheme', () => graphemesBefore('abc /a/b.md', 4), 4],
    [
      'a variation selector joins the glyph before it: 5 units, 4 graphemes',
      () => graphemesBefore('m \u26a0\ufe0f /a/b.md', 5),
      4
    ],
    [
      'a zero-width joiner joins too',
      () => graphemesBefore('\u{1f469}\u200d\u{1f4bb}x', 5),
      1
    ],
    [
      'the decorated row reports fewer graphemes than units',
      () => {
        const c = decoratedCellOf(['mkF1 \u26a0\ufe0f /a/b.md end'], 'mkF1', '/a/b.md');
        return [c?.at, c?.graphemes];
      },
      [8, 7]
    ],
    [
      'and the plain row reports the same number twice',
      () => {
        const c = decoratedCellOf(['mkF1 xy /a/b.md end'], 'mkF1', '/a/b.md');
        return [c?.at, c?.graphemes];
      },
      [8, 8]
    ]
  ];
  let ok = true;
  for (const [label, run, want] of fixtures) {
    const got = run();
    const good = JSON.stringify(got) === JSON.stringify(want);
    ok = ok && good;
    say(`${good ? 'ok  ' : 'BAD '} ${label}: ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
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
    [
      join(REPO, 'build', 'harness-socket.mjs'),
      '--fresh',
      `gmux-p247-${process.pid}`,
      `node ${process.argv[1]}`
    ],
    { cwd: REPO, stdio: 'inherit' }
  );
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

const operatorCount = () =>
  (spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' }).stdout ?? '')
    .split('\n')
    .filter((l) => l.trim() !== '').length;
const opBefore = operatorCount();

// ---------------------------------------------------------------------------
// The scratch world, and the four fixtures.
// ---------------------------------------------------------------------------
mkdirSync(join(harnessDir, 'p247'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p247'));
const home = join(root, 'h');
const profile = join(root, 'p');
const project = join(root, 'w');
for (const d of [home, profile, project]) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}
const record = join(root, 'opened.jsonl');
rmSync(record, { force: true });

const write = (name, body, mode) => {
  const p = join(project, name);
  writeFileSync(p, body);
  if (mode !== undefined) chmodSync(p, mode);
  return p;
};

/**
 * A file whose absolute path is longer than the pane is wide, so the row it is
 * printed on WRAPS. It is Jake's own screenshot's shape and it is what refusal
 * 8 refuses.
 */
const deepDir = join(project, 'a'.repeat(40), 'b'.repeat(40), 'c'.repeat(40));
mkdirSync(deepDir, { recursive: true });
writeFileSync(join(deepDir, 'wrapped.md'), '# too far from the left edge\n');
const WRAPPED = join(deepDir, 'wrapped.md');

const NOTES = write('notes.md', '# what the agent wrote\n');
const PAPER = write('paper.pdf', '%PDF-1.4 not really\n');
const RUNNER = write('run.sh', '#!/bin/sh\necho hi\n', 0o755);
const NPMRC = write('.npmrc', '//registry.npmjs.org/:_authToken=redacted\n');

/**
 * ARM F's two files. The row that names each carries a `⚠️ ` in front of the
 * path — ORDINARY agent output — which a person reads as one thing and which
 * tmux spends TWO cells on, so from there on the row's string index and its
 * cell column disagree. Two files rather than one, because a tab that is
 * already open cannot be opened again and the two presses would not be told
 * apart.
 */
const WARN = '\u26a0\ufe0f';
const WARNED_HEAD = write('warned-head.md', '# pressed at the first cell\n');
const WARNED_PAST = write('warned-past.md', '# pressed one cell past the end\n');

/** marker -> the path its row names. The marker is what tells the rows apart. */
const ARMS = [
  ['A', 'mkA', NOTES, 'a file Tortie draws'],
  ['B', 'mkB', PAPER, 'the one kind the Mac draws'],
  ['C', 'mkC', RUNNER, 'an executable'],
  ['D', 'mkD', NPMRC, 'a credential by name']
];

/**
 * ARM E is not in the table above because its path CANNOT be on one row, which
 * is the whole point of it: `cellOf` looks for the whole path on the marked
 * row and this one is not there to find.
 */
const WRAPPED_MARK = 'mkE';

const recordLines = () => {
  if (!existsSync(record)) return [];
  return readFileSync(record, 'utf8').split('\n').filter((l) => l.trim() !== '');
};

const tmux = (...a) =>
  (spawnSync('tmux', ['-L', socket, ...a], { encoding: 'utf8' }).stdout ?? '').trimEnd();

/**
 * WHERE THE PATH REALLY STARTS, ASKED OF tmux (the committer's round).
 *
 * A pane's grid belongs to tmux, and tmux is the thing that decides which cell
 * a path printed after a decoration lands in. So this asks it, in a session of
 * its own on this run's own scratch server, by printing EXACTLY the prefix
 * arm F prints and reading `#{cursor_x}` — which is the column the next
 * character will occupy, and therefore the path's own first cell.
 *
 * It replaces a hand written width rule that read `mkF1 ⚠️ ` as 7 cells where
 * tmux reads 8, and that one cell is the whole of arm F: the arm pressed the
 * cell to the LEFT of the path on every run, so it FAILED on a tree where the
 * product was right, which is the mirror of the vacuous arms the fix round
 * found. The measuring session is 200 columns wide so the prefix cannot wrap,
 * it carries none of Tortie's own session options so Tortie never adopts it,
 * and it is killed here rather than left for the harness.
 */
function prefixColumns(prefix) {
  const name = `p247-measure-${String(process.pid)}`;
  // `=<session name>` is a target-SESSION and tmux will not read it as a
  // target-pane, which is the same trap `paneIdOf` below carries. So the pane
  // id is taken from the creation itself.
  // One argument, and tmux hands it to /bin/sh itself. The prefix holds no
  // single quote, so single quoting it is exact.
  const pane = tmux(
    'new-session', '-d', '-P', '-F', '#{pane_id}', '-s', name, '-x', '200', '-y', '5',
    `printf %s '${prefix}'; sleep 20`
  );
  if (!pane.startsWith('%')) return null;
  try {
    // The printf has to have run before the cursor means anything, so poll for
    // a column that is not the one an empty pane starts on.
    for (let i = 0; i < 60; i += 1) {
      const x = Number(tmux('display-message', '-p', '-t', pane, '#{cursor_x}'));
      if (Number.isInteger(x) && x > 0) return x;
      spawnSync('sleep', ['0.1']);
    }
    return null;
  } finally {
    tmux('kill-session', '-t', `=${name}`);
  }
}

/**
 * The pane a session's window is showing, as tmux's own `%N` id.
 *
 * A target of `=<session name>` is a target-SESSION and tmux does not read it
 * as a target-pane: measured in this run at an empty capture and a send-keys
 * that moved nothing, with the pane alive and holding two lines of history the
 * whole time. The `%N` id is unambiguous and is what every call below uses.
 */
const paneIdOf = (name) => {
  const row = tmux('list-panes', '-a', '-F', '#{session_name}\t#{pane_id}')
    .split('\n')
    .find((l) => l.startsWith(`${name}\t`));
  return row === undefined ? null : (row.split('\t')[1] ?? null);
};

const capture = (pane) =>
  (
    spawnSync('tmux', ['-L', socket, 'capture-pane', '-p', '-t', pane], {
      encoding: 'utf8'
    }).stdout ?? ''
  ).split('\n');

// ---------------------------------------------------------------------------
// Readers.
// ---------------------------------------------------------------------------
// EDITOR tabs, which is `.ed-tab` and not every [role="tab"] on the page:
// the session strip wears the same role and the session this run creates is
// one of them, so the wider selector would read a session as an open file.
const TABS = `Array.from(document.querySelectorAll('.ed-tab .ed-tab-name')).map((t) => (t.textContent ?? '').trim())`;

/**
 * The screen's own rectangle. The CELL size is not read here.
 *
 * xterm under the WebGL renderer keeps no per-cell element and no character
 * measure element in the DOM — this run measured 3 canvases, 0 `.xterm-rows`
 * and 0 `.xterm-char-measure-element` — so the cell size comes from tmux's own
 * `pane_width` and `pane_height` divided into this rectangle. That is the
 * second instrument again: tmux says how many cells the pane holds and the DOM
 * says how big it is drawn.
 */
const SCREEN = `(() => {
  const screen = document.querySelector('.gmux-terminal-pane .xterm-screen');
  if (!screen) return null;
  const r = screen.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
})()`;

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
        list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      } catch {
        list = [];
      }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl, {
            collect: ['Runtime.consoleAPICalled', 'Runtime.exceptionThrown']
          });
          const a = await cdpEval(
            cdp,
            `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? location.href : null`,
            5000
          );
          if (typeof a === 'string') return { cdp, url: a };
          cdp.close();
        } catch {
          if (cdp) {
            try {
              cdp.close();
            } catch {
              /* already closed */
            }
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window');
    await sleep(200);
  }
}

const drive = (cdp, spec) =>
  cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify(spec)}).then(() => true)`, 180000);

/** Hover a cell, let the provider answer, then press it. */
async function pressCell(cdp, geo, row, col, width) {
  const x = geo.left + (col + width / 2) * geo.cellW;
  const y = geo.top + (row + 0.5) * geo.cellH;
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await sleep(1200);
  await cdp.call('Input.dispatchMouseEvent', {
    type: 'mousePressed', x, y, button: 'left', clickCount: 1
  });
  await cdp.call('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x, y, button: 'left', clickCount: 1
  });
  await sleep(2200);
  return { x, y };
}

/**
 * CLOSE EVERY EDITOR TAB, AND WHY THAT IS NOT TIDINESS.
 *
 * An open editor tab SPLITS THE WINDOW and the terminal pane narrows: measured
 * in this run at 144 columns with no tab and 78 with one, and tmux REFLOWS a
 * pane's history when its width changes. So after the first arm opens a file,
 * every row already in the pane is re-wrapped and every cell this script had
 * computed names something else.
 *
 * That is the shape the FIX ROUND found in this probe's own first version,
 * where arms C, D and E pressed a stale geometry against reflowed rows and
 * passed by pressing nothing at all — the failure mode the phase conventions
 * call a check that cannot fail. Arm B is what caught it, being the only arm
 * whose expectation is that something HAPPENS.
 *
 * So each arm starts from an empty tab strip, and re-reads the geometry and
 * the rows for itself.
 */
async function closeAllTabs(cdp) {
  for (let i = 0; i < 12; i += 1) {
    const empty = await cdpEval(
      cdp,
      `(() => { const b = document.querySelector('.ed-tab-close'); if (b) b.click(); return document.querySelectorAll('.ed-tab').length === 0; })()`,
      10000
    );
    if (empty === true) break;
    await sleep(250);
  }
  // The pane has to be told it is wide again, and tmux has to reflow it.
  await sleep(1500);
}

/** The pane's geometry AS IT IS NOW, from the DOM and from tmux together. */
async function geometryNow(cdp, pane) {
  const screen = await cdpEval(cdp, SCREEN, 10000);
  const line = tmux('list-panes', '-a', '-F', '#{pane_id} #{pane_width} #{pane_height}')
    .split('\n')
    .find((l) => l.startsWith(`${pane} `));
  const size = (line ?? '').split(' ').slice(1).map((n) => Number.parseInt(n, 10));
  if (screen === null || !Number.isFinite(size[0]) || size[0] <= 0) return null;
  return {
    left: screen.left,
    top: screen.top,
    cellW: screen.width / size[0],
    cellH: screen.height / size[1],
    cols: size[0]
  };
}

const findings = {};
const problems = [];
const SESSION = 'p247-shell';

await withElectron(
  {
    label: 'p247-paths',
    userDataDir: profile,
    tmuxSocket: null,
    cwd: REPO,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({
      HOME: home,
      GMUX_TMUX_SOCKET: socket,
      GMUX_PROBES: '1',
      // THE WHOLE REASON NOTHING IS EVER OPENED. See this file's header.
      GMUX_PATH_OPEN_RECORD: record
    }),
    ceilingMs: 12 * 60 * 1000
  },
  async (handle) => {
    const { cdp, url } = await cdpForAppWindow(60000);
    say(`app window at ${url}, pid ${handle.appPid()}`);
    try {
      await cdp.call('Runtime.enable');
      await cdp.call('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
      });
      for (;;) {
        if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
        await sleep(50);
      }

      await drive(cdp, {
        projectPath: project,
        session: { agent: 'shell', name: SESSION }
      });
      await sleep(3000);

      // THE TRANSCRIPT IS WRITTEN THROUGH tmux ITSELF, into the real pane of
      // the real session, which is what an agent printing a path is. It goes
      // through `send-keys` rather than the harness drive so that this run
      // depends on the pty and not on a renderer helper.
      const pane = paneIdOf(SESSION);
      if (pane === null) throw new Error('the session this run created has no pane');
      say(`the pane is ${pane}: ${tmux('list-panes', '-a', '-F', '#{session_name} #{pane_id} #{pane_width}x#{pane_height} dead=#{pane_dead}')}`);
      for (const [, marker, path] of [...ARMS, ['E', WRAPPED_MARK, WRAPPED]]) {
        tmux('send-keys', '-t', pane, `echo ${marker} ${path} end`, 'Enter');
        await sleep(700);
      }
      // ARM F's two rows, each with a `⚠️ ` between the marker and the path.
      for (const [marker, path] of [['mkF1', WARNED_HEAD], ['mkF2', WARNED_PAST]]) {
        tmux('send-keys', '-t', pane, `echo ${marker} ${WARN} ${path} end`, 'Enter');
        await sleep(700);
      }
      await sleep(2500);

      // ------------------------------------------------------------- ARM R
      findings.R = {
        tabs: await cdpEval(cdp, TABS, 10000),
        recorded: recordLines()
      };
      problems.push(
        ...grade([
          ['R nothing is open before anybody points at anything', findings.R.tabs, []],
          ['R nothing has been handed to the Mac', findings.R.recorded, []]
        ])
      );
      say(`R: ${JSON.stringify(findings.R)}`);

      // WHAT THE PANE'S DOM ACTUALLY HOLDS, printed rather than assumed. The
      // WebGL renderer keeps no per-cell element: this reads 3 canvases, 0
      // `.xterm-rows` and 0 `.xterm-char-measure-element`, which is why the
      // cell size below comes from tmux and not from a measured glyph. A run
      // that cannot press anything says which half was missing.
      const dom = await cdpEval(
        cdp,
        `(() => ({
          panes: document.querySelectorAll('.gmux-terminal-pane').length,
          screens: document.querySelectorAll('.xterm-screen').length,
          measures: document.querySelectorAll('.xterm-char-measure-element').length,
          rowsEl: document.querySelectorAll('.xterm-rows').length,
          canvases: document.querySelectorAll('.gmux-terminal-pane canvas').length
        }))()`,
        10000
      );
      say(`the pane's own DOM: ${JSON.stringify(dom)}`);
      // THE GEOMETRY IS READ ONCE HERE FOR THE RECORD AND AGAIN PER ARM. See
      // closeAllTabs for why once is not enough: an open editor tab narrows
      // the pane and tmux reflows its history under it.
      const geo = await geometryNow(cdp, pane);
      say(`geometry with no tab open: ${JSON.stringify(geo)}`);
      if (geo === null) {
        problems.push('the terminal geometry could not be read, so no cell could be pressed');
      }
      const rows = capture(pane);
      say(`the pane holds ${String(rows.length)} rows, last: ${JSON.stringify(rows.slice(-8))}`);

      for (const [arm, marker, path, what] of ARMS) {
        // EVERY ARM STARTS FROM AN EMPTY STRIP AND READS ITS OWN GEOMETRY. See
        // closeAllTabs: an open tab narrows the pane and tmux reflows its
        // history, so a cell computed before one was opened names something
        // else afterwards.
        await closeAllTabs(cdp);
        const geoNow = await geometryNow(cdp, pane);
        const rowsNow = capture(pane);
        const cell = geoNow === null ? null : cellOf(rowsNow, marker, path);
        if (cell === null) {
          problems.push(`${arm} the marked row for ${what} was not in the pane, so nothing was pressed`);
          findings[arm] = { pressed: false, cols: geoNow?.cols ?? null };
          continue;
        }
        // REFUSAL 8 must not be what refuses this row: the span has to have
        // the word `end` after it, or the arm proves the wrong thing.
        if (!cell.text.slice(cell.col + cell.width).includes('end')) {
          problems.push(`${arm} the row wrapped, so refusal 8 and not the door would decide it`);
        }
        const tabsBefore = await cdpEval(cdp, TABS, 10000);
        const recordedBefore = recordLines();
        await pressCell(cdp, geoNow, cell.row, cell.col, cell.width);
        const tabsAfter = await cdpEval(cdp, TABS, 10000);
        const recordedAfter = recordLines();
        findings[arm] = {
          what,
          cols: geoNow.cols,
          row: cell.row,
          col: cell.col,
          openedTabs: tabsAfter.filter((t) => !tabsBefore.includes(t)),
          newlyRecorded: recordedAfter.slice(recordedBefore.length)
        };
        say(`${arm}: ${JSON.stringify(findings[arm])}`);
      }

      // ------------------------------------------------------------- ARM E
      // REFUSAL 8, live. The row the path starts on runs off the right edge of
      // the pane, so the span's end is not known and it is never offered. This
      // is the shape of the screenshot in issue 18, and the honest answer to
      // it is that it stays unclickable — no rejoin can be written that never
      // lies (research 111 section 4.2).
      {
        await closeAllTabs(cdp);
        const geoE = await geometryNow(cdp, pane);
        const rowsE = capture(pane);
        const at = rowsE.findIndex((r) => r.startsWith(`${WRAPPED_MARK} `));
        const head = at === -1 ? '' : rowsE[at];
        const fragment = head.slice(WRAPPED_MARK.length + 1);
        const wrapped = at !== -1 && !head.includes(' end') && fragment.length > 20;
        const tabsBefore = await cdpEval(cdp, TABS, 10000);
        const recordedBefore = recordLines();
        if (wrapped && geoE !== null) {
          await pressCell(cdp, geoE, at, WRAPPED_MARK.length + 1, fragment.length);
        }
        findings.E = {
          cols: geoE?.cols ?? null,
          row: at,
          reallyWrapped: wrapped,
          openedTabs: (await cdpEval(cdp, TABS, 10000)).filter((t) => !tabsBefore.includes(t)),
          newlyRecorded: recordLines().slice(recordedBefore.length)
        };
        say(`E: ${JSON.stringify(findings.E)}`);
        problems.push(
          ...grade([
            ['E the fixture really did run off the row', findings.E.reallyWrapped, true],
            ['E a span whose end is unknown opens nothing', findings.E.openedTabs, []],
            ['E and reaches the Mac not at all', findings.E.newlyRecorded, []]
          ])
        );
      }

      // ------------------------------------------------------------- ARM F
      // THE UNDERLINE IS DRAWN IN CELLS AND NOT IN STRING INDICES, read off
      // the running app. This is the Phase 247 fix round's confirmed defect.
      //
      // The provider shipped building xterm's link range out of the STRING
      // indices the span grammar returns, and xterm underlines and hit-tests
      // in CELL COLUMNS. A `⚠️ ` in front of a path — ordinary agent output —
      // makes the two disagree, so the range was drawn one cell off the path:
      // the first character of the path was dead and the cell PAST its end
      // handed the file over.
      //
      // So the arm is two presses on two files, and the pair is what makes it
      // a measurement rather than a reading: at the parent F1 opens nothing
      // and F2 opens a tab, and at HEAD it is the other way round.
      //
      // THE COLUMN COMES FROM tmux AND IS NEVER MODELLED (the committer's
      // round). The fix round computed it here with a hand written width rule
      // that gave `U+FE0F` no cell of its own, reading `mkF1 ⚠️ ` as 7 cells
      // where tmux reads 8 — so this arm pressed one cell LEFT of the path on
      // every run and reported two findings against a tree whose link was
      // exactly right. Swept live at HEAD, the link's first cell is 8 and
      // tmux's `#{cursor_x}` after the same prefix is 8: they agree, and the
      // model agreed with neither. The GUARD is what is left of that
      // arithmetic and it is a different question — tmux's column against the
      // GRAPHEME CLUSTERS a person sees before the path, 8 against 7 here and
      // equal on an ASCII row, so a run whose decoration never landed refuses
      // to press anything instead of passing.
      {
        findings.F = {};
        const prefix = `mkF1 ${WARN} `;
        const col0 = prefixColumns(prefix);
        say(`F tmux says "${prefix}" is ${String(col0)} cells`);
        for (const [half, marker, path, offset, want] of [
          ['firstCell', 'mkF1', WARNED_HEAD, 0, ['warned-head.md']],
          ['pastTheEnd', 'mkF2', WARNED_PAST, 1, []]
        ]) {
          await closeAllTabs(cdp);
          const geoF = await geometryNow(cdp, pane);
          const rowsF = capture(pane);
          const cell = decoratedCellOf(rowsF, marker, path);
          if (col0 === null) {
            problems.push(`F tmux would not say how wide "${prefix}" is, so nothing was pressed`);
            continue;
          }
          if (cell === null || geoF === null) {
            say(`F saw rows: ${JSON.stringify(rowsF.filter((r) => r.trim() !== ''))}`);
            problems.push(`F the decorated row for ${half} was not in the pane, so nothing was pressed`);
            continue;
          }
          if (!cell.text.slice(cell.at + cell.width).includes('end')) {
            problems.push(`F the ${half} row wrapped, so refusal 8 and not the columns would decide it`);
          }
          // THE INSTRUMENT, PROVED ABLE TO SEE THE THING IT IS LOOKING FOR: a
          // run in which the decoration did not land reads the same number
          // twice and fails here rather than passing on an ASCII row.
          problems.push(
            ...grade([
              [
                `F the ${half} row’s decoration really takes more cells than a person sees characters`,
                col0 > cell.graphemes,
                true
              ]
            ])
          );
          const before = await cdpEval(cdp, TABS, 10000);
          // offset 0 is the path's FIRST cell; offset 1 is the cell one PAST
          // its last. At the parent both readings are the other way round.
          const col = offset === 0 ? col0 : col0 + cell.width;
          await pressCell(cdp, geoF, cell.row, col, 1);
          const got = (await cdpEval(cdp, TABS, 10000)).filter((t) => !before.includes(t));
          findings.F[half] = {
            cols: geoF.cols,
            row: cell.row,
            col,
            tmuxColumn: col0,
            graphemes: cell.graphemes,
            stringIndex: cell.at,
            got
          };
          problems.push(
            ...grade([
              [
                offset === 0
                  ? 'F the path’s FIRST cell opens it'
                  : 'F and the cell one PAST its end opens nothing',
                got,
                want
              ]
            ])
          );
        }
        say(`F: ${JSON.stringify(findings.F)}`);
      }

      problems.push(
        ...grade([
          ['A a click on a file Tortie draws opens it in Tortie', findings.A?.openedTabs, ['notes.md']],
          ['A and hands the Mac nothing', findings.A?.newlyRecorded, []],
          ['B a click on a .pdf hands the Mac exactly that file', findings.B?.newlyRecorded, [JSON.stringify({ open: PAPER })]],
          ['B and opens no tab in Tortie', findings.B?.openedTabs, []],
          ['C an executable opens nothing', findings.C?.openedTabs, []],
          ['C and reaches the Mac not at all', findings.C?.newlyRecorded, []],
          ['D a credential by name opens nothing', findings.D?.openedTabs, []],
          ['D and reaches the Mac not at all', findings.D?.newlyRecorded, []]
        ])
      );
    } finally {
      try {
        await cdpEval(cdp, `window.__gmuxShotCleanup ? window.__gmuxShotCleanup().then(() => true) : true`, 30000);
      } catch {
        /* the cleanup hook is best effort; withElectron ends the tree anyway */
      }
      cdp.close();
    }
  }
);

writeFileSync(join(root, 'readings.json'), `${JSON.stringify(findings, null, 2)}\n`);
const opAfter = operatorCount();
say(`the operator's own -L gmux sessions: ${String(opBefore)} before, ${String(opAfter)} after`);
if (opBefore !== opAfter) problems.push('the operator’s own tmux server changed under this run');
say(`the Mac was handed ${String(recordLines().length)} path(s), and opened none of them`);

if (problems.length > 0) {
  for (const p of problems) process.stderr.write(`${TAG} ${p}\n`);
  process.stderr.write(`${TAG} FAILED: ${String(problems.length)} finding(s).\n`);
  process.exit(1);
}
say('PASS: every arm behaved.');
process.exit(0);
