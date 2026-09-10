#!/usr/bin/env node
/**
 * path-open.mjs. THE PHASE 247 AND PHASE 250 APP RUN: a path in a transcript,
 * pressed. `npm run probe:p247` and `npm run probe:p250` are the same run —
 * ONE Electron carries both phases' arms, which is this tree's own rule that a
 * probe launches the app once and drives every claim in that session.
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
 *   G. PHASE 250 LIFT ONE, and it is his own first screenshot: an absolute,
 *      existing path printed at the END of its row, in a pane far wider than
 *      the row. At the parent commit refusal 8 refused it for being the last
 *      thing on its line; at HEAD it opens. The arm asserts FIRST that the
 *      row really does stop short of the pane's width, so a run in which it
 *      happened to reach the edge could not read as a pass.
 *   H. PHASE 250 LIFT TWO: a RELATIVE path mid-sentence with a trailing
 *      colon, which is his second screenshot. It opens the file under the
 *      session's own project. At the parent it was refused `not-absolute`
 *      before a round trip was made.
 *   I. BOTH LIFTS TOGETHER, which is his third screenshot: a relative path at
 *      the END of its row carrying a `:93`. Refusal 8 fires FIRST, so with
 *      only lift two in this span never reaches the relative rule at all.
 *   J. THE ATTACK ON THE BASE: a relative path that CLIMBS OUT of the project
 *      with `..` into a file that really exists. Containment refuses it on the
 *      REALPATH, so nothing opens and nothing is recorded. Its control is arm
 *      H, which is the same gesture inside the tree.
 *   K. THE MAC DOOR, CLOSED TO A RESOLVED SPELLING. A `.pdf` inside the
 *      project, named relatively. Arm B is the same file kind named
 *      absolutely and it IS handed to the Mac; this one opens nothing and
 *      records nothing, and the pair is what makes it a rule about the
 *      spelling rather than a rule about the file.
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
 * ## TWO INSTRUMENTS PER PRESS, and the fix round added the second one
 *
 * Every arm above reads what OPENED, and that single answer cannot tell a
 * press that MISSED the link from a door that REFUSED the file: both read as
 * no tab and no record line. Driven three times on 2026-09-09 this probe
 * passed once. One run left an editor tab open for its whole length and ran
 * arms B to K against a pane 78 columns wide instead of 144, reporting twelve
 * findings none of which said so; another pressed row 23 for a marker the
 * passing run read at 24 and reported "F the path's FIRST cell opens it: []"
 * against a build whose link was exactly right.
 *
 * So there are two now. `closeAllTabs` asks tmux as well as the DOM and
 * RETURNS its answer, `stage` reads the marked row again after the geometry
 * round trip and presses only a row that has not moved, and `pressCell` reads
 * `xterm-cursor-pointer` — xterm's own hover decoration — after the move and
 * before the click. Every arm grades that beside what opened, so refusal 2's
 * promise that a path no door accepts is never underlined is a reading rather
 * than a sentence, and a run that could not press what it meant to press says
 * that instead of reporting the product broken.
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
    // PHASE 250's own guard: does the span really END its row? The `:93` and
    // the trailing spaces a pane pads with must not count as content after it.
    [
      'a span at the end of its row, with a :line after it',
      () => {
        const c = cellOf(['mkI docs/a.md:93'], 'mkI', 'docs/a.md');
        return !/[^\s:0-9]/.test(c.text.slice(c.col + c.width));
      },
      true
    ],
    [
      'a span with words after it does not end its row',
      () => {
        const c = cellOf(['mkH docs/a.md: and then it stopped'], 'mkH', 'docs/a.md');
        return !/[^\s:0-9]/.test(c.text.slice(c.col + c.width));
      },
      false
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
/**
 * PHASE 250's fixtures. `relWrite` puts a file at a path INSIDE the project so
 * the relative spelling an "agent" prints really names it, and `outside` puts
 * one where a `..` climb lands.
 */
const relWrite = (rel, body, mode) => {
  const p = join(project, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, body);
  if (mode !== undefined) chmodSync(p, mode);
  return p;
};
const ENDS_THE_ROW = write('ends-the-row.md', '# printed at the end of a line\n');
const REL_DECISION = 'docs/reviews/fixed-egress-decision.md';
const REL_HANDOFF = 'docs/reviews/running-url-handoff.md';
const REL_PAPER = 'docs/paper.pdf';
relWrite(REL_DECISION, '# a decision\n');
relWrite(REL_HANDOFF, '# a handoff\n');
relWrite(REL_PAPER, '%PDF-1.4 not really\n');
const outsideDir = join(root, 'outside');
rmSync(outsideDir, { recursive: true, force: true });
mkdirSync(outsideDir, { recursive: true });
writeFileSync(join(outsideDir, 'climbed.md'), '# not in the project\n');
const REL_CLIMB = '../outside/climbed.md';

const WARN = '\u26a0\ufe0f';
const WARNED_HEAD = write('warned-head.md', '# pressed at the first cell\n');
const WARNED_PAST = write('warned-past.md', '# pressed one cell past the end\n');

/** marker -> the path its row names. The marker is what tells the rows apart. */
/**
 * marker -> the path its row names, and whether a LINK is drawn on it at all.
 *
 * The last column is the fix round's second instrument: research 107 refusal 2
 * is that a path no door accepts is never underlined, so a refused kind must
 * read `false` here and an accepted one `true`, whatever opens. See `ON_LINK`.
 */
const ARMS = [
  ['A', 'mkA', NOTES, 'a file Tortie draws', true],
  ['B', 'mkB', PAPER, 'the one kind the Mac draws', true],
  ['C', 'mkC', RUNNER, 'an executable', false],
  ['D', 'mkD', NPMRC, 'a credential by name', false]
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
/**
 * MOVE THE POINTER OFF THE ROW FIRST (Phase 250).
 *
 * xterm's `Linkifier` keeps an `_activeLine` and only asks its providers again
 * when the pointer moves to a DIFFERENT buffer row: `_handleMouseMove` returns
 * early otherwise and reuses the links it already has. Two arms in a row that
 * land on the same row index — which happens as soon as an arm reflows the
 * pane and the row numbering shifts under the next one — would then press the
 * PREVIOUS arm's link set. So every Phase 250 arm parks the pointer somewhere
 * else first, which costs one mouse event and makes each press its own
 * question.
 */
/**
 * A CAPTURE THE PANE HAS STOPPED MOVING UNDER (Phase 250).
 *
 * `closeAllTabs` widens the pane and tmux REFLOWS its whole history when a
 * width changes, and the reflow is not finished when the flat wait there ends:
 * measured across three runs of this probe, the same arm read its marker at
 * row 13 twice and row 11 once, from captures taken at the same point in the
 * same script. A row index read mid-reflow names a different line by the time
 * the pointer gets there, which is the failure mode the Phase 247 fix round
 * already found once in this file under a different cause.
 *
 * So the rows are read until two consecutive reads AGREE, which is what says
 * the reflow has landed rather than that enough milliseconds have passed.
 *
 * THE PANE'S SIZE IS PART OF WHAT HAS TO HOLD STILL (the fix round). The rows
 * alone can read equal across a resize that has not reached tmux's grid yet,
 * and the cell a press computes is `screen width / pane width`, so a size read
 * a moment later than the rows describes a different pane from the one the row
 * index came out of. Both are read in the same breath and compared together.
 */
function paneSize(pane) {
  const line = tmux('list-panes', '-a', '-F', '#{pane_id} #{pane_width} #{pane_height}')
    .split('\n')
    .find((l) => l.startsWith(`${pane} `));
  return line ?? '';
}

async function settledCapture(pane) {
  let last = `${paneSize(pane)}\n${capture(pane).join('\n')}`;
  for (let i = 0; i < 8; i += 1) {
    await sleep(500);
    const now = `${paneSize(pane)}\n${capture(pane).join('\n')}`;
    if (now === last) return now.split('\n').slice(1);
    last = now;
  }
  return last.split('\n').slice(1);
}

/**
 * WHICH SCREEN ROW THE TERMINAL IS DRAWING A CAPTURED ROW ON (the fix round).
 *
 * `capture-pane` is tmux's grid and the coordinates a press uses are xterm's
 * viewport, and the two are not always the same row. Measured over six runs on
 * 2026-09-09 they agreed on every row of four runs and disagreed on two, and
 * not by a constant: in one of them arms at captured rows 1 to 13 pressed
 * their links and the arms at 15 and 23 pressed nothing at all, with the pane
 * 144 columns wide at every one of them and the capture settled and re-read.
 * A reflow lands in tmux's grid and in the app's terminal at its own pace, and
 * a row index is only as good as the moment it names.
 *
 * So the row is ASKED OF THE TERMINAL. The pointer is moved down the middle of
 * the span over a window of seven rows around the captured one and
 * `xterm-cursor-pointer` says which of them the link is really on. It cannot
 * beg the question either arm F or arms C, D, J and K ask: the sweep uses the
 * MIDDLE of the span, which is inside the link under any build that draws one
 * at all, while what those arms grade is a cell at its edge or a link that
 * must not exist.
 *
 * `null` means no row in the window carries a link, which for an arm that
 * expects one is a finding naming exactly that, and never "the file did not
 * open".
 */
/**
 * THE SCREEN ROW FOR ONE ARM, and the control that stops the answer being free.
 *
 * An arm that EXPECTS a link asks about its own row: the sweep either finds it
 * or the arm says no row within three carries a link. An arm that expects NO
 * link has nothing of its own to sweep, so the stage is calibrated on arm A's
 * row — a file Tortie always draws — and the same offset is applied. That
 * control is what stops those arms passing by pressing an empty line: a stage
 * whose mapping cannot be demonstrated at all is a finding rather than four
 * quiet zeroes.
 */
async function screenRowFor(cdp, geo, rows, cell, wantLink) {
  if (wantLink) {
    const found = await rowOnScreen(cdp, geo, cell.row, cell.col, cell.width);
    return found === null
      ? { why: 'no row within three of the captured one carries a link at all' }
      : { row: found, offset: found - cell.row };
  }
  const anchor = cellOf(rows, 'mkA', NOTES);
  if (anchor === null) return { why: 'the calibration row was not in the pane, so the mapping could not be shown to work' };
  const found = await rowOnScreen(cdp, geo, anchor.row, anchor.col, anchor.width);
  if (found === null) {
    return { why: 'the calibration row carries no link either, so this stage cannot tell a refused span from a missed cell' };
  }
  return { row: cell.row + (found - anchor.row), offset: found - anchor.row };
}

async function rowOnScreen(cdp, geo, row, col, width) {
  // THE WINDOW IS FORWARD ONLY, AND BOTH HALVES OF THAT ARE MEASURED.
  //
  // The drift is forward: in the two disagreeing runs the capture read 23 for
  // a marker the agreeing runs read at 24, so the capture LAGS and the row on
  // screen is at or below the index it names.
  //
  // And a backward window is not merely unnecessary, it is wrong. Every line
  // in this transcript used to be typed with `send-keys`, so the row directly
  // ABOVE each marker's output was the shell ECHOING the command — the SAME
  // path, linkified in exactly the same way. `cellOf` skips it by insisting
  // the marker opens the row; a sweep has no text to read, so a window
  // reaching -1 found the echo and pressed a row this probe does not grade,
  // which is what arm B did on 2026-09-09. The transcript is one `cat` now and
  // no command line carries a marker's path, but the window stays forward.
  //
  // AND IT IS TWO ROWS WIDE AND NOT FOUR. Markers sit two rows apart with a
  // BLANK between them, so d=0 and d=+1 can only ever be this marker or the
  // blank above it; a wider window would reach the marker BEFORE this one,
  // which is a link, and would press the wrong file quietly. A drift of two
  // rows has never been read, and if one ever is, the arm's own answer — the
  // wrong file opening — is what says so.
  for (const d of [0, 1]) {
    if (row + d < 0) continue;
    await cdp.call('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: geo.left + (col + width / 2) * geo.cellW,
      y: geo.top + (row + d + 0.5) * geo.cellH
    });
    await sleep(450);
    if ((await cdpEval(cdp, ON_LINK, 10000)) === true) return row + d;
  }
  return null;
}

async function parkPointer(cdp, geo, awayFrom) {
  const row = awayFrom === 0 ? 1 : 0;
  await cdp.call('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: geo.left + geo.cellW / 2,
    y: geo.top + (row + 0.5) * geo.cellH
  });
  await sleep(400);
}

/**
 * WHETHER THE TERMINAL ITSELF THINKS THE POINTER IS ON A LINK (the fix round).
 *
 * Every arm below reads what OPENED, and that answer cannot tell a cell that
 * missed the link from a door that refused the file: both read as no tab and
 * no record line. On 2026-09-09 that cost a whole run — arm F reported "the
 * path's FIRST cell opens it: [] want [warned-head.md]" against a build whose
 * link was exactly right, because the row index it pressed had moved. A false
 * red and a false green are the same defect seen from two sides.
 *
 * xterm answers the question itself. `Linkifier._linkHover` adds
 * `xterm-cursor-pointer` to the terminal's own element while the pointer is
 * over a link, and takes it off again in `_linkLeave`; the decoration defaults
 * to on, which `@xterm/xterm` 6.0.0 spells
 * `pointerCursor: void 0 === link.decorations || link.decorations.pointerCursor`
 * and which this provider never overrides. So it is read AFTER the move and
 * BEFORE the click, and it is a second instrument rather than a restatement:
 * the arms grade it beside what opened, so a miss says "the pointer was not
 * over a link" and a refusal says "it was, and nothing opened".
 */
const ON_LINK = `document.querySelector('.xterm-cursor-pointer') !== null`;

async function pressCell(cdp, geo, row, col, width) {
  const x = geo.left + (col + width / 2) * geo.cellW;
  const y = geo.top + (row + 0.5) * geo.cellH;
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await sleep(1200);
  const onLink = (await cdpEval(cdp, ON_LINK, 10000)) === true;
  await cdp.call('Input.dispatchMouseEvent', {
    type: 'mousePressed', x, y, button: 'left', clickCount: 1
  });
  await cdp.call('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x, y, button: 'left', clickCount: 1
  });
  await sleep(2200);
  return { x, y, onLink };
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
/**
 * IT IS NOT ENOUGH TO CLICK THE CLOSE BUTTONS (the fix round).
 *
 * As it shipped this asked the DOM alone and told nobody when the answer was
 * no. Driven three times on 2026-09-09 it left a tab open for the whole of one
 * run: arm A opened `notes.md` at 144 columns, the strip never emptied, and
 * arms B through K ran against a pane 78 columns wide where every long path
 * wraps. That run reported TWELVE findings — "the marked row was not in the
 * pane" four times over — and not one of them said the pane was half its
 * width, which is the only thing that had gone wrong.
 *
 * So the question is asked of tmux as well as of the DOM, and the answer is
 * returned rather than assumed: the strip must be empty AND the pane must be
 * back at the width it had with no tab open, both read twice in a row. An arm
 * handed `false` says so and presses nothing, which is one honest finding in
 * place of twelve misleading ones.
 */
async function closeAllTabs(cdp, pane, fullCols) {
  let agreed = 0;
  let last = 'nothing was read';
  for (let i = 0; i < 60; i += 1) {
    const empty = await cdpEval(
      cdp,
      `(() => { const b = document.querySelector('.ed-tab-close'); if (b) b.click(); return document.querySelectorAll('.ed-tab').length; })()`,
      10000
    );
    const cols = Number.parseInt(paneSize(pane).split(' ')[1] ?? '', 10);
    last = `${String(empty)} tab(s) and ${String(cols)} columns`;
    // The pane has to be told it is wide again, and tmux has to reflow it, so
    // the two facts have to agree TWICE — once is a reading taken mid-resize.
    if (empty === 0 && cols === fullCols) {
      agreed += 1;
      if (agreed === 2) {
        await sleep(1000);
        return { ok: true, last };
      }
    } else {
      agreed = 0;
    }
    await sleep(300);
  }
  return { ok: false, last };
}

/**
 * THE STAGE EVERY ARM PRESSES FROM, AND WHY IT IS ONE FUNCTION (the fix round).
 *
 * Four arm families repeated the same four lines — close the tabs, settle the
 * capture, read the geometry, find the marked row — and every one of them then
 * pressed a row index that nothing had checked was still there. The geometry
 * read sits BETWEEN the capture and the press and is two round trips of its
 * own, and a reflow landing in that window moves the row under the pointer:
 * measured on 2026-09-09, one run of three pressed row 23 for a marker that
 * the passing runs read at 24, and reported the file as unopenable.
 *
 * So the row is read, the geometry is taken, and the row is read AGAIN, and
 * only a row that answers the same twice is pressed. A row that will not hold
 * still after three tries is a named finding rather than a press into the
 * wrong line — which is the difference between a check that failed and a check
 * that cannot fail.
 */
async function stage(cdp, pane, fullCols, find, what) {
  const closed = await closeAllTabs(cdp, pane, fullCols);
  if (!closed.ok) {
    return {
      why: `the pane never came back to an empty strip at ${String(fullCols)} columns (last read ${closed.last}), so ${what} was not pressed`
    };
  }
  let moved = '';
  for (let i = 0; i < 3; i += 1) {
    const rowsA = await settledCapture(pane);
    const geo = await geometryNow(cdp, pane);
    if (geo === null) {
      return { why: `the terminal geometry could not be read, so ${what} was not pressed` };
    }
    const cellA = find(rowsA);
    if (cellA === null) {
      return { why: `the marked row for ${what} was not in the pane, so nothing was pressed`, rows: rowsA, geo };
    }
    const rowsB = await settledCapture(pane);
    const cellB = find(rowsB);
    if (cellB !== null && cellB.row === cellA.row) return { rows: rowsB, geo, cell: cellB };
    moved = `${String(cellA.row)} and then ${cellB === null ? 'nowhere' : String(cellB.row)}`;
  }
  return { why: `the pane would not hold still for ${what}: the marked row read ${moved}` };
}

/** The pane's geometry AS IT IS NOW, from the DOM and from tmux together. */
async function geometryNow(cdp, pane) {
  const screen = await cdpEval(cdp, SCREEN, 10000);
  const size = paneSize(pane).split(' ').slice(1).map((n) => Number.parseInt(n, 10));
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
      // through the pty rather than the harness drive so that this run depends
      // on the terminal and not on a renderer helper.
      //
      // ONE `cat` AND NOT TWELVE `echo`s (the fix round), and the reason is the
      // sweep in `rowOnScreen` rather than tidiness. A line typed with
      // `send-keys` is ECHOED by the shell before it runs, so every marker row
      // had a row directly above it carrying the SAME path — a second link, on
      // a row `cellOf` deliberately skips and a sweep cannot tell apart. Driven
      // with a window that reached backwards on 2026-09-09, arm B swept onto
      // the echoed command's row and pressed a cell with no link on it at all.
      //
      // So the lines are written to a file and printed with one command. The
      // only path on a command line is the file's own, which no marker names,
      // and A BLANK LINE BETWEEN EVERY TWO MARKERS leaves the sweep a row that
      // carries no link either way. What reaches the pty is unchanged: these
      // are the same bytes an agent would have printed.
      const pane = paneIdOf(SESSION);
      if (pane === null) throw new Error('the session this run created has no pane');
      say(`the pane is ${pane}: ${tmux('list-panes', '-a', '-F', '#{session_name} #{pane_id} #{pane_width}x#{pane_height} dead=#{pane_dead}')}`);
      const lines = [
        ...[...ARMS, ['E', WRAPPED_MARK, WRAPPED]].map(([, marker, path]) => `${marker} ${path} end`),
        // PHASE 250's rows. G and I END their rows on purpose, which is what
        // refusal 8 used to refuse and what lift one narrowed; H, I, J and K
        // are relative and are what lift two resolves.
        `mkG ${ENDS_THE_ROW}`,
        `mkH ${REL_DECISION}: and then it end`,
        `mkI ${REL_HANDOFF}:93`,
        `mkJ ${REL_CLIMB} end`,
        `mkK ${REL_PAPER} end`,
        // ARM F's two rows, each with a `⚠️ ` between the marker and the path.
        `mkF1 ${WARN} ${WARNED_HEAD} end`,
        `mkF2 ${WARN} ${WARNED_PAST} end`
      ];
      const transcript = join(project, 'transcript.txt');
      writeFileSync(transcript, `${lines.join('\n\n')}\n`);
      tmux('send-keys', '-t', pane, `cat ${transcript}`, 'Enter');
      await sleep(4000);

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
      // THE WIDTH WITH NO TAB OPEN, recorded once and asked of every stage
      // below. An arm that runs at any other width is reading a pane tmux has
      // reflowed under it, and that is a finding rather than a press.
      const fullCols = geo?.cols ?? 0;
      const rows = capture(pane);
      say(`the pane holds ${String(rows.length)} rows, last: ${JSON.stringify(rows.slice(-8))}`);

      for (const [arm, marker, path, what, wantLink] of ARMS) {
        // EVERY ARM STARTS FROM AN EMPTY STRIP AND READS ITS OWN GEOMETRY. See
        // closeAllTabs: an open tab narrows the pane and tmux reflows its
        // history, so a cell computed before one was opened names something
        // else afterwards.
        // PHASE 250. The rows are read until two reads agree AND the row is
        // read again after the geometry, because a flat wait is not enough and
        // this arm family read a stale layout on one run of three. See
        // `stage`, `closeAllTabs` and `settledCapture`.
        const at = await stage(cdp, pane, fullCols, (rs) => cellOf(rs, marker, path), what);
        if (at.cell === undefined) {
          problems.push(`${arm} ${at.why}`);
          findings[arm] = { pressed: false, why: at.why, cols: at.geo?.cols ?? null };
          continue;
        }
        const { geo: geoNow, cell } = at;
        // REFUSAL 8 must not be what refuses this row: the span has to have
        // the word `end` after it, or the arm proves the wrong thing.
        if (!cell.text.slice(cell.col + cell.width).includes('end')) {
          problems.push(`${arm} the row wrapped, so refusal 8 and not the door would decide it`);
        }
        const tabsBefore = await cdpEval(cdp, TABS, 10000);
        const recordedBefore = recordLines();
        // WHICH ROW THE TERMINAL IS DRAWING THIS ON. See `screenRowFor`.
        const on = await screenRowFor(cdp, geoNow, at.rows, cell, wantLink);
        if (on.row === undefined) {
          problems.push(`${arm} ${on.why}, so ${what} was not pressed`);
          findings[arm] = { pressed: false, why: on.why, cols: geoNow.cols, row: cell.row };
          continue;
        }
        await parkPointer(cdp, geoNow, on.row);
        const press = await pressCell(cdp, geoNow, on.row, cell.col, cell.width);
        const tabsAfter = await cdpEval(cdp, TABS, 10000);
        const recordedAfter = recordLines();
        findings[arm] = {
          what,
          cols: geoNow.cols,
          row: on.row,
          rowOffset: on.offset,
          col: cell.col,
          onLink: press.onLink,
          openedTabs: tabsAfter.filter((t) => !tabsBefore.includes(t)),
          newlyRecorded: recordedAfter.slice(recordedBefore.length)
        };
        say(`${arm}: ${JSON.stringify(findings[arm])}`);
        // THE SECOND INSTRUMENT. `onLink` is xterm's own answer to whether the
        // pointer was over a link at all, so a cell that missed reads
        // differently from a door that refused. See `ON_LINK`.
        problems.push(
          ...grade([
            [`${arm} the terminal drew a link where ${what} is`, press.onLink, wantLink]
          ])
        );
      }

      // ------------------------------------------------------------- ARM E
      // REFUSAL 8, live. The row the path starts on runs off the right edge of
      // the pane, so the span's end is not known and it is never offered. This
      // is the shape of the screenshot in issue 18, and the honest answer to
      // it is that it stays unclickable — no rejoin can be written that never
      // lies (research 111 section 4.2).
      {
        const stageE = await stage(
          cdp,
          pane,
          fullCols,
          (rs) => {
            const row = rs.findIndex((r) => r.startsWith(`${WRAPPED_MARK} `));
            return row === -1 ? null : { row, text: rs[row] ?? '' };
          },
          'a path that runs off its row'
        );
        const geoE = stageE.geo ?? null;
        const at = stageE.cell?.row ?? -1;
        const head = stageE.cell?.text ?? '';
        const fragment = head.slice(WRAPPED_MARK.length + 1);
        const wrapped = at !== -1 && !head.includes(' end') && fragment.length > 20;
        const tabsBefore = await cdpEval(cdp, TABS, 10000);
        const recordedBefore = recordLines();
        let press = { onLink: false };
        let onE = { offset: null };
        if (stageE.cell === undefined) problems.push(`E ${stageE.why}`);
        if (wrapped && geoE !== null && stageE.rows !== undefined) {
          onE = await screenRowFor(cdp, geoE, stageE.rows, { row: at }, false);
          if (onE.row === undefined) {
            problems.push(`E ${onE.why}, so the fragment was not pressed`);
          } else {
            await parkPointer(cdp, geoE, onE.row);
            press = await pressCell(cdp, geoE, onE.row, WRAPPED_MARK.length + 1, fragment.length);
          }
        }
        findings.E = {
          cols: geoE?.cols ?? null,
          row: onE.row ?? at,
          rowOffset: onE.offset,
          reallyWrapped: wrapped,
          onLink: press.onLink,
          openedTabs: (await cdpEval(cdp, TABS, 10000)).filter((t) => !tabsBefore.includes(t)),
          newlyRecorded: recordLines().slice(recordedBefore.length)
        };
        say(`E: ${JSON.stringify(findings.E)}`);
        problems.push(
          ...grade([
            ['E the fixture really did run off the row', findings.E.reallyWrapped, true],
            ['E nothing is underlined on a span whose end is unknown', findings.E.onLink, false],
            ['E a span whose end is unknown opens nothing', findings.E.openedTabs, []],
            ['E and reaches the Mac not at all', findings.E.newlyRecorded, []]
          ])
        );
      }

      // ------------------------------------------- ARMS G, H, I, J and K
      //
      // PHASE 250. Two lifts, driven on the real face: a path that merely ENDS
      // its row, and a relative path joined to the session's own project.
      //
      // `endsTheRow` is what tells the two families apart. Arms A to D assert
      // the word `end` after the span, because refusal 8 and not the door had
      // to be out of the way for them; G and I assert the OPPOSITE — the span
      // really is the last thing on its line — and then assert that it still
      // stops short of the pane's width, which is what the lift is bounded by.
      // Without that second reading a run in a narrow window would pass by
      // pressing a span the edge rule had already refused for the right
      // reason.
      for (const [arm, marker, span, endsTheRow, wantTabs, wantMac, wantLink, what] of [
        ['G', 'mkG', ENDS_THE_ROW, true, ['ends-the-row.md'], [], true, 'an absolute path at the end of its line'],
        ['H', 'mkH', REL_DECISION, false, ['fixed-egress-decision.md'], [], true, 'a relative path mid-sentence'],
        ['I', 'mkI', REL_HANDOFF, true, ['running-url-handoff.md'], [], true, 'a relative path at the end of its line, with a :line'],
        ['J', 'mkJ', REL_CLIMB, false, [], [], false, 'a relative path that climbs out of the project'],
        ['K', 'mkK', REL_PAPER, false, [], [], false, 'a resolved .pdf, which arm B opens on the Mac when it is named absolutely']
      ]) {
        const at = await stage(cdp, pane, fullCols, (rs) => cellOf(rs, marker, span), what);
        if (process.env['P250_ROWS'] === '1' && at.rows !== undefined) {
          say(
            `${arm} sees: ${JSON.stringify(
              at.rows.map((r, i) => `${String(i)}:${r}`).filter((r) => r.slice(r.indexOf(':') + 1).trim() !== '')
            )}`
          );
        }
        if (at.cell === undefined) {
          problems.push(`${arm} ${at.why}`);
          findings[arm] = { pressed: false, why: at.why, cols: at.geo?.cols ?? null };
          continue;
        }
        const { geo: geoNow, cell } = at;
        const after = cell.text.slice(cell.col + cell.width);
        const reallyEnds = !/[^\s:0-9]/.test(after);
        if (endsTheRow) {
          // THE INSTRUMENT, PROVED ABLE TO SEE THE THING IT IS LOOKING FOR.
          problems.push(
            ...grade([
              [`${arm} the span really is the last thing on its row`, reallyEnds, true],
              [
                `${arm} and the row still stops short of the pane's width, so this is the lift and not a wrap`,
                cell.text.length < geoNow.cols,
                true
              ]
            ])
          );
        } else if (!after.includes('end')) {
          problems.push(`${arm} the row wrapped, so refusal 8 and not the door would decide it`);
        }
        const tabsBefore = await cdpEval(cdp, TABS, 10000);
        const recordedBefore = recordLines();
        const on = await screenRowFor(cdp, geoNow, at.rows, cell, wantLink);
        if (on.row === undefined) {
          problems.push(`${arm} ${on.why}, so ${what} was not pressed`);
          findings[arm] = { pressed: false, why: on.why, cols: geoNow.cols, row: cell.row };
          continue;
        }
        await parkPointer(cdp, geoNow, on.row);
        const press = await pressCell(cdp, geoNow, on.row, cell.col, cell.width);
        findings[arm] = {
          what,
          cols: geoNow.cols,
          row: on.row,
          rowOffset: on.offset,
          col: cell.col,
          rowText: cell.text,
          rowLength: cell.text.length,
          endsTheRow: reallyEnds,
          onLink: press.onLink,
          openedTabs: (await cdpEval(cdp, TABS, 10000)).filter((t) => !tabsBefore.includes(t)),
          newlyRecorded: recordLines().slice(recordedBefore.length)
        };
        say(`${arm}: ${JSON.stringify(findings[arm])}`);
        problems.push(
          ...grade([
            [`${arm} the terminal drew a link where ${what} is`, press.onLink, wantLink],
            [`${arm} ${what} opens what it should`, findings[arm].openedTabs, wantTabs],
            [`${arm} and hands the Mac what it should`, findings[arm].newlyRecorded, wantMac]
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
        for (const [half, marker, path, offset, want, wantLink] of [
          ['firstCell', 'mkF1', WARNED_HEAD, 0, ['warned-head.md'], true],
          ['pastTheEnd', 'mkF2', WARNED_PAST, 1, [], false]
        ]) {
          if (col0 === null) {
            problems.push(`F tmux would not say how wide "${prefix}" is, so nothing was pressed`);
            continue;
          }
          // THE ROW IS READ TWICE WITH THE GEOMETRY BETWEEN THEM (the fix
          // round). This half is what a stale row index costs: on 2026-09-09
          // one run of three pressed row 23 for a marker the passing runs read
          // at 24, and reported "the path's FIRST cell opens it: []" against a
          // build whose link was exactly right. See `stage`.
          const at = await stage(
            cdp, pane, fullCols, (rs) => decoratedCellOf(rs, marker, path), `the ${half} row`
          );
          if (at.cell === undefined) {
            if (at.rows !== undefined) say(`F saw rows: ${JSON.stringify(at.rows.filter((r) => r.trim() !== ''))}`);
            problems.push(`F ${at.why}`);
            continue;
          }
          const geoF = at.geo;
          const cell = at.cell;
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
          // WHICH ROW THE TERMINAL DRAWS THIS ON, swept down the MIDDLE of the
          // path — which is inside the link on any build that draws one — so
          // the two cells this half really grades, the first and the one past
          // the end, are still its own question. Both halves sweep their own
          // row: `pastTheEnd` names a file whose link must exist for the cell
          // beside it to mean anything.
          const on = await rowOnScreen(cdp, geoF, cell.row, col0, cell.width);
          if (on === null) {
            problems.push(`F no row within three of the ${half} row carries a link at all, so nothing was pressed`);
            continue;
          }
          // offset 0 is the path's FIRST cell; offset 1 is the cell one PAST
          // its last. At the parent both readings are the other way round.
          const col = offset === 0 ? col0 : col0 + cell.width;
          await parkPointer(cdp, geoF, on);
          const press = await pressCell(cdp, geoF, on, col, 1);
          const got = (await cdpEval(cdp, TABS, 10000)).filter((t) => !before.includes(t));
          findings.F[half] = {
            cols: geoF.cols,
            row: on,
            rowOffset: on - cell.row,
            col,
            tmuxColumn: col0,
            graphemes: cell.graphemes,
            stringIndex: cell.at,
            onLink: press.onLink,
            got
          };
          problems.push(
            ...grade([
              [
                // THE READING THAT SAYS WHICH FAILURE IT IS (the fix round).
                // What OPENED cannot tell a cell that missed the link from a
                // door that refused, and this arm is entirely about which cell
                // the link is on — so xterm's own hover answer is graded
                // beside it. `firstCell` must be ON the link and `pastTheEnd`
                // must be OFF it, which at the parent is the other way round.
                offset === 0
                  ? 'F the path’s FIRST cell is inside the drawn link'
                  : 'F and the cell one PAST its end is outside it',
                press.onLink,
                wantLink
              ],
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
