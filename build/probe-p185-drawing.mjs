#!/usr/bin/env node
/**
 * probe-p185-drawing.mjs. One app run that proves the diff view's own control
 * actually CHANGES WHAT IS DRAWN (Phase 185).
 *
 * ## Why this probe exists, in one paragraph
 *
 * @pierre/diffs takes `lineDiffType` on the surface's options, and Tortie
 * passes one. It is not what the app reads. `renderers/DiffHunksRenderer.js`
 * getRenderOptions returns `workerManager.getDiffRenderOptions()` WHOLE
 * whenever a working worker pool is attached, and this app always attaches
 * one, so a `lineDiffType` on the options prop alone is accepted and silently
 * ignored. An option that is passed but not honoured looks exactly like one
 * that works. So this probe drives the four segments THROUGH THEIR BUTTONS,
 * with a real diff already open, and counts the `data-diff-span` elements the
 * app really drew each time.
 *
 * ## WHAT IT PROVES, and every cell is read off the running app
 *
 *   #   what must be true                                       read from
 *   --  -----------------------------------------------------   ------------
 *    0  the drive answered with a reading                        the drive
 *    1  the control row is at the head of the diff surface       the document
 *    2  the four segments carry a plain word each                the document
 *    3  Off draws no intra-line highlight at all                 the shadow DOM
 *    4  Words, Phrases and Characters draw THREE DIFFERENT       the shadow DOM
 *       span counts on the same hunk
 *    5  Phrases joins: fewer spans than Words over MORE text     the shadow DOM
 *    6  Characters is the finest: most spans, least text         the shadow DOM
 *    7  a Characters highlight lands inside a word, which is     the shadow DOM
 *       the thing Words cannot do
 *    8  every click was honoured while the diff stayed open      the document
 *    9  backgrounds on: a changed row is coloured differently    getComputedStyle
 *       from a context row
 *   10  backgrounds off: the changed row matches the context row getComputedStyle
 *   11  backgrounds off keeps the change bar AND the inline        getComputedStyle
 *       highlight, so the diff still says which side is which
 *   12  each choice was written to its own localStorage key      localStorage
 *   13  the operator's session count did not move                tmux, read only
 *   18  no control row while a diff is still LOADING, sampled    the document
 *       every 25ms with the skeleton up, over a second file
 *       that is identical to HEAD
 *   19  and none over the "identical either side" panel it       the document
 *       resolves into
 *
 * Then a SECOND launch on the SAME profile, touching nothing:
 *
 *   14  a fresh launch opens a diff in the mode the last one       the document
 *       chose, with no click
 *   15  and it really DREW that mode, span for span                the shadow DOM
 *   16  the backgrounds stayed off across the launch               getComputedStyle
 *   17  the control row fits the panel at its narrow floor         the document
 *
 * ## SAFETY, ABSOLUTE
 *
 * Without GMUX_TMUX_SOCKET this script re-runs itself through
 * build/harness-socket.mjs, so the socket is always one that script composed
 * and ends afterwards, never `gmux` or `default`. The app gets its own user
 * data directory and its own scratch project under the harness directory. It
 * spawns no agent and spends no token. `-L gmux` appears in exactly one place,
 * a read only session count taken before and after, which must match. The
 * Electron goes through build/electron-run.mjs, which ends the tree it started
 * in a finally block.
 *
 * Usage, from the repository root:
 *
 *   npm run probe:p185
 *
 * That script is the way in. It builds, then runs this file through
 * build/harness-socket.mjs so the tmux socket is one that script composed.
 * Running the file directly works and does the same thing, and the script is
 * what makes the probe reachable by name and classifiable: it is the entry in
 * package.json that build/verification-checks.mjs classifies and
 * build/assert-hermetic-checks.mjs then checks in both directions. Without it
 * this probe is a file nothing names, which is how a guard decays.
 *
 * Exit code 0 when every row passes, 1 otherwise with every failing row
 * named, 2 when the probe refuses to run.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p185drawing]';

function say(line) {
  console.log(`${TAG} ${line}`);
}
function refuse(why) {
  console.error(`${TAG} ${why}`);
  process.exit(2);
}

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET, so this run wraps itself in the harness script');
  const wrapped = spawnSync(
    process.execPath,
    [
      join(repoRoot, 'build', 'harness-socket.mjs'),
      '--fresh',
      'gmux-p185-drawing',
      'node build/probe-p185-drawing.mjs'
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

/** The operator's live server, listed and never written. The ONLY place this file names it. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' });
  return (out.stdout ?? '').split('\n').filter((line) => line.trim() !== '').length;
}
const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);

const scratch = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'p185-drawing');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'project');
const profile = join(root, 'profile');

/**
 * The fixture is a REAL pair, being this repository's own PierreDiff.tsx
 * either side of commit d3ee863, which is 53 insertions over 62 deletions and
 * carries plenty of lines edited in the middle rather than replaced whole.
 * That shape is the only one the four modes can disagree about.
 */
const FIXTURE = 'PierreDiff.tsx';
/**
 * A second file, committed and then never touched, so opening it as a diff is
 * the "identical either side" state. It is what rows 18 and 19 read: the
 * control row must not be drawn over a diff that is not there, and the state
 * it must not be drawn over includes the LOAD, not just the resolved empty
 * panel.
 */
const SAME = 'Same.tsx';
function gitShow(rev) {
  const out = spawnSync('git', ['show', `${rev}:src/renderer/editor/PierreDiff.tsx`], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024
  });
  if ((out.stdout ?? '') === '') refuse(`git show ${rev} produced nothing`);
  return out.stdout;
}
const before = gitShow('d3ee86352450c4f874f06ccdfba34190ebfb89f5^');
const after = gitShow('d3ee86352450c4f874f06ccdfba34190ebfb89f5');

writeFileSync(join(project, FIXTURE), before);
writeFileSync(join(project, SAME), before);
for (const argv of [
  ['init', '-q', '-b', 'main'],
  ['add', '-A'],
  ['-c', 'user.email=p185@example.invalid', '-c', 'user.name=p185 probe', 'commit', '-q', '-m', 'p185 fixture']
]) {
  spawnSync('git', argv, { cwd: project, encoding: 'utf8' });
}
// The working tree now holds the AFTER, so the tab is a real worktree diff.
writeFileSync(join(project, FIXTURE), after);

let reading = null;
let text = '';
await withElectron(
  {
    label: 'p185-drawing',
    userDataDir: profile,
    tmuxSocket: socket,
    cwd: repoRoot,
    env: {
      GMUX_SHOT: join(scratch, 'p185-drawing.png'),
      GMUX_SHOT_VERBOSE: '1',
      GMUX_SHOT_DELAY_MS: '4000',
      GMUX_SHOT_DRIVE: JSON.stringify({
        projectPath: project,
        openRel: FIXTURE,
        mode: 'diff',
        editorWidth: 1200,
        diffDrawing: 'cycle',
        identicalRel: SAME
      }),
      GMUX_SHOT_JS: 'window.__gmuxP185Drawing'
    }
  },
  async (handle) => {
    say(`launched the app, pid ${String(handle.pid)}`);
    const code = await new Promise((r) => {
      const ceiling = setTimeout(() => {
        console.error(`${TAG} the run passed its ceiling; the teardown ends it.`);
        r(1);
      }, 300_000);
      void handle.exited.then((c) => {
        clearTimeout(ceiling);
        r(c);
      });
    });
    text = handle.text();
    say(`the app exited with ${String(code)}`);
    const marker = '[gmux-shot] probe ';
    const at = text.lastIndexOf(marker);
    if (at !== -1) {
      const line = text.slice(at + marker.length).split('\n')[0] ?? '';
      try {
        reading = JSON.parse(line);
      } catch {
        reading = null;
      }
    }
  }
);

/**
 * THE SECOND LAUNCH, on the SAME user data directory, touching nothing.
 *
 * The first run left the choice at Characters with the backgrounds off. A
 * preference that is written and never read back is not a setting, so this
 * asks the app to open a diff it has never seen in this session and reports
 * what it came up drawing, with no click anywhere. The panel is driven to its
 * narrow floor at the same time, because a control row that overflows puts its
 * last control off the end where nobody can reach it.
 */
let restRead = null;
await withElectron(
  {
    label: 'p185-reload',
    userDataDir: profile,
    tmuxSocket: socket,
    cwd: repoRoot,
    env: {
      GMUX_SHOT: join(scratch, 'p185-reload.png'),
      GMUX_SHOT_VERBOSE: '1',
      GMUX_SHOT_DELAY_MS: '4000',
      GMUX_SHOT_DRIVE: JSON.stringify({
        projectPath: project,
        openRel: FIXTURE,
        mode: 'diff',
        editorWidth: 320,
        diffDrawing: 'read'
      }),
      GMUX_SHOT_JS: 'window.__gmuxP185Drawing'
    }
  },
  async (handle) => {
    say(`relaunched on the same profile, pid ${String(handle.pid)}`);
    await new Promise((r) => {
      const ceiling = setTimeout(() => r(1), 300_000);
      void handle.exited.then((c) => {
        clearTimeout(ceiling);
        r(c);
      });
    });
    const t = handle.text();
    const marker = '[gmux-shot] probe ';
    const at = t.lastIndexOf(marker);
    if (at !== -1) {
      try {
        restRead = JSON.parse(t.slice(at + marker.length).split('\n')[0] ?? '');
      } catch {
        restRead = null;
      }
    }
  }
);

const failures = [];
const results = [];
function check(step, claim, pass, detail) {
  results.push({ step, claim, verdict: pass ? 'pass' : 'FAIL', detail });
  if (!pass) failures.push(`${String(step)}. ${claim}. ${detail}`);
}

if (reading === null || typeof reading !== 'object') {
  failures.push('0. the drive printed no reading, so nothing was measured.');
  console.error(text.split('\n').slice(-40).join('\n'));
} else {
  const r = reading;
  const m = r.modes ?? {};
  const off = m['Off'] ?? {};
  const words = m['Words'] ?? {};
  const phrases = m['Phrases'] ?? {};
  const chars = m['Characters'] ?? {};

  check(0, 'the drive answered with a reading', true, `${Object.keys(m).length} modes read`);
  check(1, 'the control row is at the head of the diff surface', r.bar === true, `bar ${String(r.bar)}`);
  check(
    2,
    'the four segments carry a plain word each',
    JSON.stringify(r.labels) === JSON.stringify(['Off', 'Words', 'Phrases', 'Characters']),
    `labels ${JSON.stringify(r.labels)}`
  );
  check(3, 'Off draws no intra-line highlight at all', off.spans === 0, `${String(off.spans)} spans`);
  const three = [words.spans, phrases.spans, chars.spans];
  check(
    4,
    'Words, Phrases and Characters draw three different span counts',
    three.every((n) => typeof n === 'number' && n > 0) && new Set(three).size === 3,
    // `settled` false means the count never left the previous mode's, which is
    // exactly the shape of the defect this row exists for: the option reached
    // the surface and never the worker pool, so every mode drew the same thing.
    `Words ${String(words.spans)}, Phrases ${String(phrases.spans)}, Characters ${String(chars.spans)}` +
      ` (settled ${[words, phrases, chars].map((x) => String(x.settled)).join('/')})`
  );
  check(
    5,
    'Phrases joins: fewer spans than Words over more text',
    phrases.spans < words.spans && phrases.chars > words.chars,
    `Words ${String(words.spans)} spans / ${String(words.chars)} chars, Phrases ${String(phrases.spans)} / ${String(phrases.chars)}`
  );
  check(
    6,
    'Characters is the finest: most spans, least text',
    chars.spans > words.spans && chars.chars < words.chars,
    `Characters ${String(chars.spans)} spans / ${String(chars.chars)} chars`
  );
  // A char-mode highlight that is a fragment of a word, with no word boundary
  // on either end, is a thing word mode structurally cannot produce.
  const fragment = (chars.sample ?? []).some(
    (t) => typeof t === 'string' && t.length > 0 && /^[A-Za-z]+$/.test(t)
  ) && (chars.sample ?? []).some((t) => typeof t === 'string' && t.length <= 3 && /^[A-Za-z]+$/.test(t));
  check(
    7,
    'a Characters highlight lands inside a word',
    fragment,
    `sample ${JSON.stringify((chars.sample ?? []).slice(0, 8))}`
  );
  check(
    8,
    'every click was honoured while the diff stayed open',
    [off, words, phrases, chars].every((x) => x.clicked === true && x.pressed === 'true'),
    [off, words, phrases, chars].map((x) => `${String(x.clicked)}/${String(x.pressed)}`).join(' ')
  );

  const on = r.backgroundsOn ?? {};
  const offBg = r.backgroundsOff ?? {};
  check(
    9,
    'backgrounds on: a changed row is coloured differently from a context row',
    on.attr === true && on.addition !== on.context && on.deletion !== on.context,
    `addition ${String(on.addition)}, deletion ${String(on.deletion)}, context ${String(on.context)}`
  );
  check(
    10,
    'backgrounds off: the changed row matches the context row',
    offBg.attr === false && offBg.addition === offBg.context && offBg.deletion === offBg.context,
    `addition ${String(offBg.addition)}, deletion ${String(offBg.deletion)}, context ${String(offBg.context)}`
  );
  check(
    11,
    'backgrounds off keeps the change bar and the inline highlight',
    typeof offBg.bars === 'string' &&
      offBg.bars !== 'none' &&
      offBg.bars !== offBg.context &&
      offBg.bars === on.bars &&
      offBg.spans === on.spans &&
      offBg.spans > 0,
    `bars on ${String(on.bars)}, off ${String(offBg.bars)}; spans ${String(on.spans)} then ${String(offBg.spans)}`
  );
  check(
    12,
    'each choice was written to its own key',
    chars.stored === 'char' && on.stored !== offBg.stored && offBg.stored === '0',
    `mode ${String(chars.stored)}, backgrounds ${String(on.stored)} then ${String(offBg.stored)}`
  );
}
if (restRead === null || typeof restRead !== 'object') {
  failures.push('14. the second launch printed no reading.');
} else {
  const rest = restRead.atRest ?? {};
  const chars = (reading?.modes ?? {})['Characters'] ?? {};
  check(
    14,
    'a fresh launch opens a diff in the mode the last one chose, with no click',
    JSON.stringify(rest.pressed) === JSON.stringify(['Characters']),
    `pressed ${JSON.stringify(rest.pressed)}`
  );
  check(
    15,
    'and it really drew that mode, not just marked the button',
    rest.spans === chars.spans && rest.chars === chars.chars,
    `${String(rest.spans)} spans / ${String(rest.chars)} chars at rest, ${String(chars.spans)} / ${String(chars.chars)} when it was chosen`
  );
  check(
    16,
    'the backgrounds stayed off across the launch',
    (restRead.backgroundsOn ?? {}).attr === false &&
      (restRead.backgroundsOn ?? {}).addition === (restRead.backgroundsOn ?? {}).context,
    `data-background ${String((restRead.backgroundsOn ?? {}).attr)}, addition ${String((restRead.backgroundsOn ?? {}).addition)}`
  );
  check(
    17,
    'the control row fits the panel at its narrow floor',
    restRead.barFits === true,
    `the row needs ${String(restRead.barNeeds)}px and has ${String(restRead.barWidth)}px in a ${String(restRead.panelWidth)}px panel, fits ${String(restRead.barFits)}`
  );
}

{
  const id = (reading ?? {}).identical ?? null;
  if (id === null) {
    failures.push('18. the drive never opened the file that matches HEAD.');
  } else {
    check(
      18,
      'no control row over a diff that is still loading',
      id.skeletonSamples > 0 && id.barWithSkeleton === false,
      `the skeleton was up for ${String(id.skeletonSamples)} sample(s) of 25ms and the row was ${id.barWithSkeleton === true ? 'THERE' : 'absent'}`
    );
    check(
      19,
      'no control row over the "identical either side" panel',
      id.resolved === true && id.state === 'No changes' && id.barAfter === false,
      `state ${JSON.stringify(id.state)}, row after ${String(id.barAfter)}`
    );
  }
}

const operatorAfter = operatorSessionCount();
check(13, 'the operator session count did not move', operatorAfter === operatorBefore, `${String(operatorBefore)} before, ${String(operatorAfter)} after`);

for (const row of results) say(`${String(row.step).padStart(2)}  ${row.verdict.padEnd(4)}  ${row.claim}  (${row.detail})`);
if (failures.length > 0) {
  console.error(`${TAG} ${String(failures.length)} row(s) failed:`);
  for (const f of failures) console.error(`${TAG}   ${f}`);
  process.exit(1);
}
say('every row passed.');
process.exit(0);
