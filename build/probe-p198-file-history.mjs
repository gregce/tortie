#!/usr/bin/env node
/**
 * probe-p198-file-history.mjs. ONE app run that proves the File history
 * section (Phase 198) over a REAL repository, the one research 76 section 8
 * named: a copy of Tortie's own, with src/renderer/machines/presentation.ts
 * as the fixture, because that file is two commits old without --follow and
 * thirty one with it, having been src/renderer/app/machine-copy.ts first.
 *
 * ## THE NAMED INDEPENDENT METHOD
 *
 * Real data, and a second answer for it. Every row the section drew is read
 * off the DOM of the running app, and this script asks git itself for the
 * same walk, `git log --follow -M --format=%H -- <path>`, with no code of the
 * phase between the two. The two lists must agree sha for sha and in order,
 * for the fixture and for the second file's hundred rows. The boundary row
 * is then CLICKED, and the tab it opened is read back from the editor store
 * with the byte count of each of its two sides, which is the two sided diff
 * the entry asks for.
 *
 * ## WHAT IT PROVES, every cell read off the running app or re-derived here
 *
 *   #   what must be true                                        read from
 *   --  ------------------------------------------------------   ------------
 *    0  the drive answered with a reading                         the drive
 *    1  the Explorer row's menu OFFERED History, and main ran     main's own
 *       that row and no other                                     popup line
 *    2  the row opened the file and showed Source Control          the store
 *    3  the section is headed with the file's name and folder     the DOM
 *    4  it draws 31 rows and says 31                              the DOM
 *    5  the rows are git's own answer, sha for sha, in order      git + DOM
 *    6  exactly one boundary row, R, whose directory span reads   the DOM
 *       the old path and whose title says renamed from it
 *    7  the boundary row opens a diff with TWO SIDES, old path    the store
 *       on the left and new on the right
 *    8  every row above the boundary opens with two sides         the store
 *    9  the first row below the boundary opens under the old      the store
 *       path, both sides present
 *   10  the list stayed put through every click                   the DOM
 *   11  a single click previews and a double click pins           the store
 *   12  a second file moves the section, one page of 50 with      the DOM
 *       Load 50 more offered
 *   13  Load 50 more grows the window to 100, and those hundred   git + DOM
 *       are git's first hundred, in order
 *   14  a row of the second file opens its diff and the section   the store +
 *       stays on the second file                                  the DOM
 *   15  the header collapses and opens again                      the DOM
 *   16  closing every tab lets the section go                     the DOM
 *   17  no lane gutter is drawn, because --follow drops merges    the DOM
 *   18  the operator's session count did not move                 tmux, read only
 *
 * ## SAFETY, ABSOLUTE
 *
 * Without GMUX_TMUX_SOCKET this script re-runs itself through
 * build/harness-socket.mjs, so the socket is always one that script composed
 * and ends afterwards, never `gmux` or `default`. The app gets its own user
 * data directory under the harness directory. The project it opens is READ:
 * the section spawns git log and git show, nothing else, and the script
 * refuses the repository it is itself running from, so an operator's checkout
 * is never the fixture. It spawns no agent and spends no token. `-L gmux`
 * appears in exactly one place, a read only session count taken before and
 * after, which must match. The Electron goes through build/electron-run.mjs,
 * whose kill is in a finally block.
 *
 * Usage, from the repository root, with a COPY of a Tortie checkout. The
 * copy is named in the environment, because `npm run probe:p198` hands the
 * command line to build/harness-socket.mjs, which reads its socket name and
 * its one command and nothing after them, so a `-- --project` on the npm
 * line never reaches this script:
 *
 *   P198_PROJECT=/path/to/a/copy/of/gmux npm run probe:p198
 *
 * Run directly, the flag works too, and the script wraps itself in the
 * harness with the flag inside the one command:
 *
 *   node build/probe-p198-file-history.mjs --project /path/to/a/copy/of/gmux
 *
 * Exit 0 when every row passes, 1 otherwise with every failing row named,
 * 2 when the probe refuses to run.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p198filehistory]';

function say(line) {
  console.log(`${TAG} ${line}`);
}
function refuse(why) {
  console.error(`${TAG} ${why}`);
  process.exit(2);
}

const REL = 'src/renderer/machines/presentation.ts';
const OLD = 'src/renderer/app/machine-copy.ts';
const SECOND = 'docs/BACKLOG.md';
const PAGE = 50;

const argv = process.argv.slice(2);
const at = argv.indexOf('--project');
const projectArg = at === -1 ? (process.env['P198_PROJECT'] ?? '') : (argv[at + 1] ?? '');

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET, so this run wraps itself in the harness script');
  const wrapped = spawnSync(
    process.execPath,
    [
      join(repoRoot, 'build', 'harness-socket.mjs'),
      '--fresh',
      'gmux-p198-filehist',
      `node build/probe-p198-file-history.mjs --project ${JSON.stringify(projectArg)}`
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
  refuse('name the copy of a Tortie checkout to open: --project <path>');
}
if (!existsSync(projectArg)) refuse(`${projectArg} does not exist`);
const project = realpathSync(projectArg);
if (project === realpathSync(repoRoot)) {
  refuse('the project must be a COPY, not the repository this probe runs from');
}
if (!existsSync(join(project, REL))) refuse(`${project} has no ${REL}, so it is not a Tortie checkout`);
if (!existsSync(join(project, '.git'))) refuse(`${project} is not a git repository`);

/** The operator's live server, listed and never written. The ONLY place this file names it. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' });
  return (out.stdout ?? '').split('\n').filter((line) => line.trim() !== '').length;
}
const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);

/** git's own answer for one file, followed, newest first: the shas. */
function gitFollow(rel, max) {
  const out = spawnSync(
    'git',
    ['-C', project, 'log', '--follow', '-M', `--max-count=${String(max)}`, '--format=%H', '--', rel],
    { encoding: 'utf8' }
  );
  if (out.status !== 0) refuse(`git log --follow over ${rel} failed: ${out.stderr}`);
  return out.stdout.split('\n').filter((l) => l !== '');
}
const truthFirst = gitFollow(REL, 200);
const truthSecond = gitFollow(SECOND, 2 * PAGE + 1);
say(`git says ${String(truthFirst.length)} rows for ${REL} and at least ${String(truthSecond.length)} for ${SECOND}`);

const scratch = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'p198-filehist');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(rawRoot, { recursive: true });
const root = realpathSync(rawRoot);
const profile = join(root, 'profile');

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------

let reading = null;
let picks = [];
let text = '';
await withElectron(
  {
    label: 'p198-filehist',
    userDataDir: profile,
    tmuxSocket: socket,
    cwd: repoRoot,
    ceilingMs: 420_000,
    env: {
      GMUX_SHOT: join(scratch, 'p198-filehist.png'),
      GMUX_SHOT_VERBOSE: '1',
      GMUX_SHOT_DELAY_MS: '3000',
      GMUX_SHOT_POPUP_PICK: 'History',
      GMUX_SHOT_DRIVE: JSON.stringify({
        projectPath: project,
        sidebarWidth: 360,
        fileHistory: { rel: REL, secondRel: SECOND }
      }),
      GMUX_SHOT_JS: 'window.__gmuxP198FileHistory'
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
    const readOne = (marker) => {
      const at2 = text.lastIndexOf(marker);
      if (at2 === -1) return null;
      const line = text.slice(at2 + marker.length).split('\n')[0] ?? '';
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    };
    reading = readOne('[gmux-shot] probe ');
    for (const line of text.split('\n')) {
      const m = line.indexOf('[gmux-shot] popup-pick ');
      if (m === -1) continue;
      try {
        picks.push(JSON.parse(line.slice(m + '[gmux-shot] popup-pick '.length)));
      } catch {
        /* a line that is not the knob's own */
      }
    }
    writeFileSync(join(scratch, 'p198-filehist-reading.json'), JSON.stringify({ reading, picks }, null, 2));
    writeFileSync(join(scratch, 'p198-filehist-app.log'), text);
    for (const line of text.split('\n')) {
      if (line.includes('[shot-drive] filehistory ')) say(line.slice(line.indexOf('[shot-drive]')));
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
const twoSided = (tab) =>
  tab !== null &&
  tab !== undefined &&
  tab.found === true &&
  tab.error === null &&
  (tab.oldBytes ?? 0) > 0 &&
  (tab.newBytes ?? 0) > 0 &&
  tab.diffMounted === true;

if (reading === null || typeof reading !== 'object') {
  failures.push('0. the drive printed no reading, so nothing was measured.');
} else {
  check(0, 'the drive answered with a reading', true, `${String(reading.ms)} ms`);

  const pick = picks[0] ?? null;
  check(
    1,
    'the Explorer row menu offered History and main ran that row',
    pick !== null && Array.isArray(pick.labels) && pick.labels.includes('History') && typeof pick.id === 'string' && picks.length === 1,
    pick === null ? 'no popup was raised' : `labels ${JSON.stringify(pick.labels)}, picked ${String(pick.id)}, ${String(picks.length)} popup(s)`
  );

  const opened = reading.menuOpened ?? {};
  check(
    2,
    'the row opened the file and showed Source Control',
    opened.opened === true && opened.activeRel === REL && opened.tab?.preview === false,
    `active ${String(opened.activeRel)}, preview ${String(opened.tab?.preview)}, after ${String(opened.ms)} ms`
  );

  const header = reading.header ?? {};
  check(
    3,
    'the section is headed with the file name and its folder',
    header.label === basename(REL) && header.dir === dirname(REL) && header.file === REL,
    `label "${String(header.label)}", dir "${String(header.dir)}", file ${String(header.file)}`
  );

  const rows = Array.isArray(reading.rows) ? reading.rows : [];
  check(4, 'it draws 31 rows and says 31', rows.length === 31 && header.count === '31', `${String(rows.length)} rows, count "${String(header.count)}"`);

  const domShas = rows.map((r) => r.sha);
  const same = domShas.length === truthFirst.length && domShas.every((s, i) => s === truthFirst[i]);
  check(
    5,
    'the rows are git own answer, sha for sha, in order',
    same,
    same ? `${String(domShas.length)} shas agree` : `DOM ${String(domShas.length)} vs git ${String(truthFirst.length)}; first disagreement at ${String(domShas.findIndex((s, i) => s !== truthFirst[i]))}`
  );

  const boundaries = rows.filter((r) => r.status === 'R');
  const b = boundaries[0] ?? null;
  const bi = reading.boundaryIndex;
  check(
    6,
    'exactly one boundary row, R, reading the old path with a renamed from title',
    boundaries.length === 1 && b !== null && b.thenPath === OLD && typeof b.title === 'string' && b.title.includes(`renamed from ${OLD}`) && b.title.startsWith(REL) && bi === 1,
    b === null ? 'no R row' : `${String(boundaries.length)} R row(s) at index ${String(bi)}, span "${String(b.thenPath)}", title "${String(b.title)}"`
  );

  const opens = Array.isArray(reading.opens) ? reading.opens : [];
  const bOpen = opens.find((o) => o.index === bi) ?? null;
  check(
    7,
    'the boundary row opens a diff with two sides, old path left and new path right',
    bOpen !== null && twoSided(bOpen.tab) && bOpen.tab.sha === b?.sha && bOpen.tab.relPath === REL && bOpen.tab.origRelPath === OLD && bOpen.tab.status === 'R',
    bOpen === null ? 'the boundary row was not opened' : `sha ${String(bOpen.tab.sha).slice(0, 8)} rel ${String(bOpen.tab.relPath)} orig ${String(bOpen.tab.origRelPath)} old ${String(bOpen.tab.oldBytes)} B new ${String(bOpen.tab.newBytes)} B mounted ${String(bOpen.tab.diffMounted)} state ${String(bOpen.tab.stateTitle)} error ${String(bOpen.tab.error)}`
  );

  const above = opens.filter((o) => typeof bi === 'number' && o.index < bi);
  check(
    8,
    'every row above the boundary opens with two sides',
    typeof bi === 'number' && above.length === bi && above.every((o) => twoSided(o.tab) && o.tab.relPath === REL && o.tab.origRelPath === null),
    `${String(above.length)} of ${String(bi)} row(s) above: ${above.map((o) => `${String(o.tab.sha).slice(0, 8)} ${String(o.tab.oldBytes)}/${String(o.tab.newBytes)} B`).join(', ')}`
  );

  const below = opens.find((o) => typeof bi === 'number' && o.index === bi + 1) ?? null;
  check(
    9,
    'the first row below the boundary opens under the old path, both sides present',
    below !== null && twoSided(below.tab) && below.tab.relPath === OLD && below.tab.origRelPath === null,
    below === null ? 'no row below the boundary was opened' : `rel ${String(below.tab.relPath)} orig ${String(below.tab.origRelPath)} old ${String(below.tab.oldBytes)} B new ${String(below.tab.newBytes)} B`
  );

  check(
    10,
    'the list stayed put through every click',
    opens.length > 0 && opens.every((o) => o.after?.file === REL && o.after?.rows === 31),
    opens.map((o) => `${String(o.after?.file === REL)}/${String(o.after?.rows)}`).join(' ')
  );

  const pv = reading.preview ?? {};
  check(
    11,
    'a single click previews and a double click pins',
    pv.previewed?.preview === true && pv.previewed?.commitTabs === 1 && pv.pinned?.preview === false && pv.pinned?.sha === pv.previewed?.sha,
    `preview ${String(pv.previewed?.preview)} with ${String(pv.previewed?.commitTabs)} commit tab(s), then pinned ${String(pv.pinned?.preview === false)}`
  );

  const second = reading.second ?? {};
  check(
    12,
    'a second file moves the section, one page of 50 with Load 50 more offered',
    second.header?.file === SECOND && second.header?.label === basename(SECOND) && second.firstPage === PAGE && second.hadMore === true,
    `file ${String(second.header?.file)}, label "${String(second.header?.label)}", ${String(second.firstPage)} rows, more ${String(second.hadMore)}`
  );

  const shas2 = Array.isArray(second.shas) ? second.shas : [];
  const same2 = shas2.length === 2 * PAGE && shas2.every((s, i) => s === truthSecond[i]);
  check(
    13,
    'Load 50 more grows the window to 100, git first hundred in order',
    same2 && second.grown?.count === String(2 * PAGE) && second.grown?.more === (truthSecond.length > 2 * PAGE),
    `${String(shas2.length)} rows, count "${String(second.grown?.count)}", more ${String(second.grown?.more)}, agree ${String(same2)}`
  );

  check(
    14,
    'a row of the second file opens its diff and the section stays on it',
    twoSided(second.open) && second.open?.relPath === SECOND && second.after?.file === SECOND && second.after?.rows === 2 * PAGE,
    `rel ${String(second.open?.relPath)} old ${String(second.open?.oldBytes)} B new ${String(second.open?.newBytes)} B, section on ${String(second.after?.file)} with ${String(second.after?.rows)} rows`
  );

  const col = reading.collapse ?? {};
  check(
    15,
    'the header collapses and opens again',
    col.collapsed?.collapsed === true && col.collapsed?.rows === 0 && col.collapsed?.expanded === 'false' && col.reopened?.collapsed === false && col.reopened?.rows === 2 * PAGE,
    `collapsed ${String(col.collapsed?.collapsed)} with ${String(col.collapsed?.rows)} rows, reopened ${String(col.reopened?.collapsed === false)} with ${String(col.reopened?.rows)} rows`
  );

  const closed = reading.closed ?? {};
  check(
    16,
    'closing every tab lets the section go',
    closed.tabs === 0 && closed.header?.file === null && closed.header?.collapsed === true && closed.header?.disabled === true && closed.header?.label === 'File history' && closed.header?.rows === 0,
    `${String(closed.tabs)} tab(s), file ${String(closed.header?.file)}, collapsed ${String(closed.header?.collapsed)}, disabled ${String(closed.header?.disabled)}, label "${String(closed.header?.label)}"`
  );

  check(17, 'no lane gutter is drawn', header.gutter === false && second.grown?.gutter === false, `gutter ${String(header.gutter)}`);
}

const operatorAfter = operatorSessionCount();
check(18, 'the operator session count did not move', operatorAfter === operatorBefore, `${String(operatorBefore)} before, ${String(operatorAfter)} after`);

say('');
for (const r of results) say(`${r.verdict.padEnd(4)} ${String(r.step).padStart(2)}. ${r.claim} (${r.detail})`);
say('');
if (failures.length > 0) {
  say(`${String(failures.length)} row(s) failed:`);
  for (const f of failures) say(`  ${f}`);
  process.exit(1);
}
say(`every row passed over ${project}`);
