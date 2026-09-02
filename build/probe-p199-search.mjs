#!/usr/bin/env node
/**
 * probe-p199-search.mjs. ONE app run that proves the History section's
 * search field (Phase 199) over a REAL repository, a copy of Tortie's own,
 * and re-measures the keystroke the debounce was chosen from.
 *
 * ## THE NAMED INDEPENDENT METHODS
 *
 * Real data, and a second answer for it. Every row set the section drew is
 * read off the DOM of the running app, and this script asks git itself for
 * the same query with an argv of its own, `--grep=`, `--author=`, `-S` and a
 * literal pathspec over the same refs, with no code of the phase between the
 * two. The two lists must agree sha for sha and in order, for every prefix
 * typed. The attack shapes are typed into the real field: an author with a
 * regex metacharacter, a commit that is not a commit, an operator alone, a
 * path that globs, a burst faster than the debounce, and two walks started
 * back to back on purpose.
 *
 * ## WHAT IT PROVES, every cell read off the running app or re-derived here
 *
 *   #   what must be true                                        read from
 *   --  ------------------------------------------------------   ------------
 *    0  the drive answered with a reading                         the drive
 *    1  the plain walk drew a page with a gutter and a field      the DOM
 *    2  every prefix of the word drew git's rows, no gutter       git + DOM
 *    3  every prefix of the author drew git's rows                git + DOM
 *    4  every prefix of the path drew git's rows, literally       git + DOM
 *    5  a commit, and its bare short sha, drew one row, no more   the DOM
 *    6  a row expanded and a file opened at that commit           the store
 *    7  Load 50 more doubled the page inside the query            git + DOM
 *    8  the changes button ran -S, drew git's rows, printed its   git + DOM
 *       time, and the field offered Search before and after
 *    9  a burst faster than the debounce drew once, the last      the store
 *   10  two walks back to back: the second drew, the first never  the store
 *   11  the attacks drew what they should and raised no toast     the DOM
 *   12  Escape returned the plain walk with its gutter            the DOM
 *   13  the keystroke cost was measured, and the debounce holds   the store
 *   14  a path outside the repository drew only its refusal       the DOM
 *   15  a repository change did not run the change search again   the store
 *   16  the operator's session count did not move                 tmux, read only
 *
 * ## THE FIX ROUND'S TWO ROWS, 14 and 15
 *
 * The verifier typed `file:../gmux-copy/src` and `file:/etc/passwd` into
 * the real field and each drew 50 rows, the plain walk's first page, with
 * the gutter hidden and no sentence: the service refused, and the store
 * fell through to the flat walk. And a line appended to README.md while a
 * change search's rows were on screen started a second `-S` child and
 * flipped the button to Stop. Row 14 types both paths; row 15 writes the
 * spec's `touch` file through the bridge, which is the ONE write this probe
 * makes into the project, and puts the bytes back, so the copy is left as
 * it was found.
 *
 * ## SAFETY, ABSOLUTE
 *
 * Without GMUX_TMUX_SOCKET this script re-runs itself through
 * build/harness-socket.mjs, so the socket is always one that script composed
 * and ends afterwards, never `gmux` or `default`. The app gets its own user
 * data directory under the harness directory. The project it opens is read,
 * apart from row 15's one tracked file, written and put back: the section
 * spawns git log and git show, nothing else, and the script refuses the
 * repository it is itself running from. It spawns no agent and
 * spends no token. `-L gmux` appears in exactly one place, a read only
 * session count taken before and after. The Electron goes through
 * build/electron-run.mjs, whose kill is in a finally block.
 *
 * Usage, from the repository root, with a COPY of a Tortie checkout, or a
 * copy of git's own repository, named in the environment (the harness
 * script reads one command and nothing after it, so a `-- --project` on
 * the npm line never arrives):
 *
 *   P199_PROJECT=/path/to/a/copy/of/gmux npm run probe:p199
 *   P199_PROJECT=/path/to/a/copy/of/git npm run probe:p199
 *
 * Exit 0 when every row passes, 1 otherwise with every failing row named,
 * 2 when the probe refuses to run.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p199search]';

function say(line) {
  console.log(`${TAG} ${line}`);
}
function refuse(why) {
  console.error(`${TAG} ${why}`);
  process.exit(2);
}

/**
 * What is typed, chosen by what the project IS. A copy of a Tortie checkout
 * is the first row; git's own repository, 82,130 commits with no commit
 * graph, is the second, and it is the one the entry names for the keystroke
 * cost. `touch` is a tracked file written through the bridge while the
 * change search's rows are on screen, and put back.
 */
const SPECS = [
  { marker: 'src/main/git', word: 'docs', author: 'Greg', path: 'src/main/git', change: 'runGit', burst: 'the redline', touch: 'README.md' },
  { marker: 'builtin/log.c', word: 'fix', author: 'Junio', path: 'builtin/log.c', change: 'strbuf_addstr', burst: 'the strbuf', touch: 'README.md' }
];
const PAGE = 50;

const argv = process.argv.slice(2);
const at = argv.indexOf('--project');
const projectArg = at === -1 ? (process.env['P199_PROJECT'] ?? '') : (argv[at + 1] ?? '');

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET, so this run wraps itself in the harness script');
  const wrapped = spawnSync(
    process.execPath,
    [
      join(repoRoot, 'build', 'harness-socket.mjs'),
      '--fresh',
      'gmux-p199-search',
      `node build/probe-p199-search.mjs --project ${JSON.stringify(projectArg)}`
    ],
    { cwd: repoRoot, stdio: 'inherit' }
  );
  process.exit(wrapped.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to run on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}
if (projectArg === '') {
  refuse('name the copy of a Tortie checkout to open: P199_PROJECT=<path> or --project <path>');
}
if (!existsSync(projectArg)) refuse(`${projectArg} does not exist`);
const project = realpathSync(projectArg);
if (project === realpathSync(repoRoot)) {
  refuse('the project must be a COPY, not the repository this probe runs from');
}
const SPEC = SPECS.find((s) => existsSync(join(project, s.marker))) ?? null;
if (SPEC === null) refuse(`${project} is neither a Tortie checkout nor git's own repository (no ${SPECS.map((s) => s.marker).join(', no ')})`);
if (!existsSync(join(project, SPEC.touch))) refuse(`${project} has no ${SPEC.touch} to write while the change search is on screen`);
if (!existsSync(join(project, '.git'))) refuse(`${project} is not a git repository`);

/** The operator's live server, listed and never written. The ONLY place this file names it. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' });
  return (out.stdout ?? '').split('\n').filter((line) => line.trim() !== '').length;
}
const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);

/**
 * git's own answer, with this script's own argv: the refs the pane walked,
 * fed on stdin as the pane does, and this script's own flags. A filtered
 * walk is not topo ordered, so neither is the truth for one.
 */
function gitRows(refs, extra, max, topo) {
  const args = [
    '-C',
    project,
    'log',
    ...(topo ? ['--topo-order'] : []),
    '--stdin',
    `--max-count=${String(max)}`,
    '--format=%H',
    ...extra
  ];
  const out = spawnSync('git', args, { encoding: 'utf8', input: `${refs.join('\n')}\n`, maxBuffer: 64 * 1024 * 1024 });
  if (out.status !== 0) refuse(`git ${args.slice(2).join(' ')} failed: ${out.stderr}`);
  return out.stdout.split('\n').filter((l) => l !== '');
}
const grep = (v) => [`--grep=${v}`, '--fixed-strings', '--regexp-ignore-case'];
const author = (v) => [`--author=${v}`, '--fixed-strings', '--regexp-ignore-case'];
const path = (v) => ['--', `:(literal)${v}`];

const scratch = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'p199-search');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(rawRoot, { recursive: true });
const root = realpathSync(rawRoot);
const profile = join(root, 'profile');

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------

let reading = null;
let text = '';
await withElectron(
  {
    label: 'p199-search',
    userDataDir: profile,
    tmuxSocket: socket,
    cwd: repoRoot,
    ceilingMs: 420_000,
    env: {
      GMUX_SHOT: join(scratch, 'p199-search.png'),
      GMUX_SHOT_VERBOSE: '1',
      GMUX_SHOT_DELAY_MS: '3000',
      GMUX_SHOT_DRIVE: JSON.stringify({
        projectPath: project,
        sidebarWidth: 360,
        historySearch: SPEC
      }),
      GMUX_SHOT_JS: 'window.__gmuxP199HistorySearch'
    }
  },
  async (handle) => {
    say(`launched the app, pid ${String(handle.pid)}`);
    const code = await new Promise((r) => {
      const ceiling = setTimeout(() => {
        console.error(`${TAG} the run passed its ceiling; the teardown ends it.`);
        r(1);
      }, 400_000);
      void handle.exited.then((c) => {
        clearTimeout(ceiling);
        r(c);
      });
    });
    text = handle.text();
    say(`the app exited with ${String(code)}`);
    const marker = '[gmux-shot] probe ';
    const at2 = text.lastIndexOf(marker);
    if (at2 !== -1) {
      try {
        reading = JSON.parse(text.slice(at2 + marker.length).split('\n')[0] ?? '');
      } catch {
        reading = null;
      }
    }
    writeFileSync(join(scratch, 'p199-search-reading.json'), JSON.stringify(reading, null, 2));
    writeFileSync(join(scratch, 'p199-search-app.log'), text);
    for (const line of text.split('\n')) {
      if (line.includes('[shot-drive] historysearch ')) say(line.slice(line.indexOf('[shot-drive]')));
    }
    say(`the reading and the app output are under ${scratch}`);
  }
);

// ---------------------------------------------------------------------------
// The judgement.
// ---------------------------------------------------------------------------

const failures = [];
const results = [];
function check(step, claim, pass, detail) {
  results.push({ step, claim, verdict: pass ? 'pass' : 'FAIL', detail });
  if (!pass) failures.push(`${String(step)}. ${claim}. ${detail}`);
}
const same = (a, b) => a.length === b.length && a.every((s, i) => s === b[i]);
const agree = (label, rows, truth) =>
  same(rows, truth)
    ? `${label} ${String(rows.length)} agree`
    : `${label} DOM ${String(rows.length)} vs git ${String(truth.length)}, first disagreement at ${String(rows.findIndex((s, i) => s !== truth[i]))}`;

const timings = [];

if (reading === null || typeof reading !== 'object') {
  failures.push('0. the drive printed no reading, so nothing was measured.');
} else {
  check(0, 'the drive answered with a reading', true, `${String(reading.ms)} ms, ${String(reading.walks)} walks drew`);

  const plain = reading.plain ?? {};
  const refs = Array.isArray(plain.refs) ? plain.refs : [];
  const plainTruth = gitRows(refs, [], PAGE, true);
  check(
    1,
    'the plain walk drew a page with a gutter and a field',
    plain.ready === true && same(plain.rows ?? [], plainTruth) && plain.gutter === true && plain.fieldText === '' && plain.button === null,
    `${String((plain.rows ?? []).length)} rows over ${String(refs.length)} refs, gutter ${String(plain.gutter)}, ${agree('plain', plain.rows ?? [], plainTruth)}`
  );

  const perKey = (list, argvFor, label) => {
    const notes = [];
    let ok = list.length > 0;
    for (const k of list) {
      const truth = gitRows(refs, argvFor(k), PAGE, false);
      const good = k.drew === true && same(k.rows, truth) && k.gutter === false;
      ok = ok && good;
      timings.push({ label, text: k.text, walkMs: k.walkMs, wallMs: k.wallMs, rows: k.rows.length });
      notes.push(`${JSON.stringify(k.text)} ${String(k.rows.length)} rows walk ${String(k.walkMs)} ms wall ${String(k.wallMs)} ms${good ? '' : ` MISMATCH (git ${String(truth.length)}, drew ${String(k.drew)}, gutter ${String(k.gutter)})`}`);
    }
    return { ok, notes };
  };

  const word = perKey(reading.word ?? [], (k) => grep(k.text), 'message');
  check(2, 'every prefix of the word drew git own rows with no gutter', word.ok, word.notes.join('; '));

  const auth = perKey(reading.author ?? [], (k) => author(k.text.slice('author:'.length)), 'author');
  check(3, 'every prefix of the author drew git own rows', auth.ok, auth.notes.join('; '));

  const paths = perKey(reading.path ?? [], (k) => path(k.text.slice('file:'.length)), 'file');
  const firstPath = (reading.path ?? [])[0] ?? null;
  check(
    4,
    'every prefix of the path drew git own rows, whole components only',
    paths.ok && firstPath !== null && firstPath.rows.length === 0,
    `${paths.notes.join('; ')}; the one letter prefix drew ${String(firstPath?.rows.length)}`
  );

  const commit = reading.commit ?? {};
  const bare = reading.bareSha ?? {};
  const target = String(commit.text ?? '').slice('commit:'.length);
  check(
    5,
    'a commit, and its bare short sha, drew one row and no Load more',
    commit.drew === true && same(commit.rows ?? [], [target]) && commit.more === false && bare.drew === true && same(bare.rows ?? [], [target]) && bare.more === false,
    `commit ${String((commit.rows ?? []).length)} row(s) more ${String(commit.more)} walk ${String(commit.walkMs)} ms; bare ${String((bare.rows ?? []).length)} row(s) walk ${String(bare.walkMs)} ms`
  );
  timings.push({ label: 'commit', text: commit.text, walkMs: commit.walkMs, wallMs: commit.wallMs, rows: (commit.rows ?? []).length });
  timings.push({ label: 'bare sha', text: bare.text, walkMs: bare.walkMs, wallMs: bare.wallMs, rows: (bare.rows ?? []).length });

  const ex = reading.expand ?? {};
  check(
    6,
    'a row expanded and a file opened at that commit, with no lane spacer',
    ex.expanded === 'true' && ex.fileRows > 0 && ex.tab?.sha === ex.sha && ex.tab?.error === null && ex.spacerSvgs === 0 && ex.after?.gutter === false,
    `expanded ${String(ex.expanded)}, ${String(ex.fileRows)} file row(s), tab ${String(ex.tab?.relPath)} at ${String(ex.tab?.sha).slice(0, 8)} error ${String(ex.tab?.error)}, spacer svgs ${String(ex.spacerSvgs)}`
  );

  const more = reading.more ?? {};
  const moreTruth = gitRows(refs, grep(SPEC.word), 2 * PAGE, false);
  check(
    7,
    'Load 50 more doubled the page inside the query, git first hundred in order',
    more.before === PAGE && same(more.rows ?? [], moreTruth) && more.query?.message === SPEC.word && more.fieldText === SPEC.word && more.limit === 2 * PAGE && more.gutter === false,
    `${String(more.before)} then ${String((more.rows ?? []).length)} rows, ${agree('more', more.rows ?? [], moreTruth)}, query ${JSON.stringify(more.query?.message)}, field ${JSON.stringify(more.fieldText)}, walk ${String(more.walkMs)} ms`
  );

  const ch = reading.change ?? {};
  const changeTruth = gitRows(refs, [`-S${SPEC.change}`], PAGE, false);
  const printed = String(ch.msText ?? '');
  const printedMs = printed.endsWith(' s') ? Math.round(parseFloat(printed) * 1000) : parseInt(printed, 10);
  check(
    8,
    'the changes button ran -S, drew git own rows, printed its time',
    ch.offered?.button === 'Search' && ch.running === true && ch.whileRunning?.button === 'Stop' && ch.finished === true && same(ch.rows ?? [], changeTruth) && ch.button === null && Number.isFinite(printedMs) && Math.abs(printedMs - ch.walkMs) <= 60 && ch.gutter === false,
    `offered ${JSON.stringify(ch.offered?.button)}, running ${String(ch.running)} with ${JSON.stringify(ch.whileRunning?.button)}, finished ${String(ch.finished)}, ${agree('change', ch.rows ?? [], changeTruth)}, printed ${JSON.stringify(ch.msText)} against walk ${String(ch.walkMs)} ms, wall ${String(ch.wallMs)} ms`
  );
  timings.push({ label: 'change (button)', text: `change:${SPEC.change}`, walkMs: ch.walkMs, wallMs: ch.wallMs, rows: (ch.rows ?? []).length });

  const burst = reading.burst ?? {};
  const burstTruth = gitRows(refs, grep(SPEC.burst), PAGE, false);
  check(
    9,
    'a burst faster than the debounce drew once, the last query, and stayed',
    burst.settled === true && burst.walks >= 1 && burst.walks < burst.keystrokes && same(burst.rows ?? [], burstTruth) && same(burst.rowsLater ?? [], burstTruth) && burst.query?.message === SPEC.burst,
    `${String(burst.keystrokes)} keystrokes, ${String(burst.walks)} walk(s) drew, ${agree('burst', burst.rows ?? [], burstTruth)}, still so 1.5 s later ${String(same(burst.rowsLater ?? [], burstTruth))}, wall ${String(burst.wallMs)} ms`
  );

  const race = reading.race ?? {};
  const raceTruth = gitRows(refs, grep(SPEC.word), PAGE, false);
  check(
    10,
    'two walks back to back: the second drew and the first never did',
    race.settled === true && race.walks === 1 && same(race.rows ?? [], raceTruth) && same(race.rowsLater ?? [], raceTruth) && race.query?.message === SPEC.word,
    `${String(race.walks)} walk(s) drew, ${agree('race', race.rows ?? [], raceTruth)}, still so 1 s later ${String(same(race.rowsLater ?? [], raceTruth))}`
  );

  const a = reading.attacks ?? {};
  const bracketTruth = gitRows(refs, author(`${SPEC.author} [`), PAGE, false);
  const bracketOnlyTruth = gitRows(refs, author(`${SPEC.author}[`), PAGE, false);
  const globTruth = gitRows(refs, path(`${SPEC.path}/*`), PAGE, false);
  const noToast = (k) => Array.isArray(k?.toasts) && k.toasts.length === 0;
  check(
    11,
    'the attacks drew what they should and raised no toast',
    a.bracket?.drew === true && same(a.bracket.rows, bracketTruth) && a.bracket.rows.length === 0 && a.bracket.stub === 'No commit matches.' && noToast(a.bracket) &&
      a.bracketBare?.drew === true && same(a.bracketBare.rows, bracketOnlyTruth) && a.bracketBare.rows.length === 0 && noToast(a.bracketBare) &&
      a.notACommit?.drew === true && a.notACommit.rows.length === 0 && a.notACommit.stub === 'No commit matches.' && noToast(a.notACommit) &&
      a.operatorAlone?.drew === true && same(a.operatorAlone.rows, plainTruth) && a.operatorAlone.query === null && a.operatorAlone.gutter === true &&
      a.glob?.drew === true && same(a.glob.rows, globTruth) && a.glob.rows.length === 0 && noToast(a.glob),
    `bracket ${String(a.bracket?.rows?.length)} row(s) stub ${JSON.stringify(a.bracket?.stub)}, unquoted ${String(a.bracketBare?.rows?.length)} row(s); not a commit ${String(a.notACommit?.rows?.length)} row(s); operator alone ${String(a.operatorAlone?.rows?.length)} row(s) query ${String(a.operatorAlone?.query)} gutter ${String(a.operatorAlone?.gutter)}; glob ${String(a.glob?.rows?.length)} row(s); toasts ${String((a.bracket?.toasts ?? []).length + (a.notACommit?.toasts ?? []).length + (a.glob?.toasts ?? []).length)}`
  );

  const esc = reading.escape ?? {};
  check(
    12,
    'Escape cleared the field and returned the plain walk with its gutter',
    esc.escaped === true && esc.fieldText === '' && esc.query === null && same(esc.rows ?? [], plainTruth) && esc.gutter === true,
    `escaped ${String(esc.escaped)}, field ${JSON.stringify(esc.fieldText)}, ${agree('escape', esc.rows ?? [], plainTruth)}, gutter ${String(esc.gutter)}`
  );

  // Fix round, finding 1. A path that leaves the repository draws the
  // service's refusal and nothing else: zero rows, the sentence where the
  // rows would be, the query still applied, the gutter hidden, no toast.
  // At the parent commit both drew the plain walk's first page.
  const esc2 = reading.escapes ?? {};
  const REFUSAL = 'Paths must be relative to the repository root.';
  const refused = (k) => k?.drew === true && Array.isArray(k.rows) && k.rows.length === 0 && k.stub === REFUSAL && k.searchError === REFUSAL && k.query !== null && k.gutter === false && noToast(k);
  check(
    14,
    'a path outside the repository drew nothing but its refusal',
    refused(esc2.parent) && refused(esc2.absolute),
    `parent ${String(esc2.parent?.rows?.length)} row(s) stub ${JSON.stringify(esc2.parent?.stub)}; absolute ${String(esc2.absolute?.rows?.length)} row(s) stub ${JSON.stringify(esc2.absolute?.stub)}; toasts ${String((esc2.parent?.toasts ?? []).length + (esc2.absolute?.toasts ?? []).length)}`
  );

  // Fix round, finding 2. A tracked file written while the change search's
  // rows are on screen is a repository change the renderer heard, and it
  // ran nothing: no walk drew, no Stop, no spinner, the rows and the
  // printed time as the button left them. At the parent commit the same
  // write started a second -S child and flipped the button to Stop.
  const rr = reading.reread ?? {};
  check(
    15,
    'a repository change did not run the change search again',
    rr.written === true && rr.heard === true && rr.heardBefore === false && rr.walks === 0 && rr.sawStop === false && rr.sawLoading === false && rr.msBefore !== null && rr.msAfter === rr.msBefore && same(rr.rowsBefore ?? [], rr.rowsAfter ?? []) && same(rr.rowsAfter ?? [], changeTruth) && rr.buttonAfter === null && rr.query?.change === SPEC.change,
    `written ${String(rr.written)}, heard ${String(rr.heard)} (before ${String(rr.heardBefore)}), ${String(rr.walks)} walk(s) drew, Stop ${String(rr.sawStop)}, loading ${String(rr.sawLoading)}, time ${JSON.stringify(rr.msBefore)} then ${JSON.stringify(rr.msAfter)}, rows ${String((rr.rowsBefore ?? []).length)} then ${String((rr.rowsAfter ?? []).length)}, states seen ${String((rr.seen ?? []).length)}`
  );

  const keyWalks = timings.filter((t) => !t.label.startsWith('change')).map((t) => t.walkMs).filter((n) => typeof n === 'number');
  const maxWalk = Math.max(...keyWalks);
  const medWalk = [...keyWalks].sort((x, y) => x - y)[Math.floor(keyWalks.length / 2)];
  // The median is the keystroke; the max is whatever else main was doing at
  // that instant (a status refresh, the watcher), and the queue is what
  // handles that one. Both are printed.
  check(
    13,
    'the keystroke cost was measured and the 150 ms debounce holds its median',
    keyWalks.length >= 10 && medWalk < 150,
    `${String(keyWalks.length)} keystroke walks, median ${String(medWalk)} ms, max ${String(maxWalk)} ms, debounce 150 ms`
  );
}

const operatorAfter = operatorSessionCount();
check(16, 'the operator session count did not move', operatorAfter === operatorBefore, `${String(operatorBefore)} before, ${String(operatorAfter)} after`);

say('');
say('keystroke timings, walk = the bridge round trip read off the store, wall = keystroke to rows on screen (debounce included):');
for (const t of timings) say(`  ${t.label.padEnd(16)} ${JSON.stringify(t.text).padEnd(28)} rows ${String(t.rows).padStart(3)}  walk ${String(t.walkMs).padStart(5)} ms  wall ${String(t.wallMs).padStart(5)} ms`);
say('');
for (const r of results) say(`${r.verdict.padEnd(4)} ${String(r.step).padStart(2)}. ${r.claim} (${r.detail})`);
say('');
if (failures.length > 0) {
  say(`${String(failures.length)} row(s) failed:`);
  for (const f of failures) say(`  ${f}`);
  process.exit(1);
}
say(`every row passed over ${project}`);
