#!/usr/bin/env node
/**
 * `npm run probe:p219`. Phase 219 item 9, the GEOMETRY half, measured rather
 * than argued.
 *
 * WHY THIS EXISTS. The round capped the session name column at 22ch and
 * pinned it with `p219-name-cap.test.tsx`, which reads markup and CSS text
 * and takes no geometry reading at all. The verifier then measured the real
 * thing and found the scrollbar still drawn in a narrow pane. Item 9's
 * scrollbar half is Tier 2 BECAUSE it is geometry, and geometry is read off a
 * laid out document or it is not read.
 *
 * WHAT IT READS, in ONE window, over a REAL session with a long real name:
 *
 *   1  the per column widths of the sessions table, so the floor is
 *      attributed to columns rather than guessed
 *   2  the table's own floor, being `.diag-table` scrollWidth, with the cap
 *      as shipped
 *   3  the same floor with the cap rule switched off in the CSSOM, which is
 *      the PARENT reading taken in the same window rather than in another
 *      commit's build
 *   4  the same floor with the cap driven to zero, which is the irreducible
 *      width of the other seven columns and is the number that decides
 *      whether any cap can close this
 *   5  whether the card scrolls sideways at EDITOR_MIN, the narrowest pane
 *      the app will give this tab (src/renderer/state/chrome-geometry.ts)
 *
 * SAFETY. ONE Electron through build/electron-run.mjs on a scratch profile
 * and the scratch tmux socket below, ended in that helper's `finally`. The
 * scratch project lives under the harness directory. No agent is spawned, no
 * request is made, no token is spent, no keychain is opened, and nothing
 * under the person's home is read or written. The reading is taken through
 * GMUX_SHOT_JS rather than GMUX_SHOT_CLIPBOARD, so the person's own
 * pasteboard is never read and never written.
 */

import { mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const TAG = '[probe:p219]';
const say = (line) => console.log(`${TAG} ${line}`);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The editor pane's own floor, READ FROM THE SHIPPING MODULE rather than
 * typed, so this probe cannot go on quoting a number the app has moved past.
 * It is the narrowest pane the app will give any editor tab, and the
 * diagnostics report is an editor tab.
 */
const GEOMETRY = resolve(repoRoot, 'src/renderer/state/chrome-geometry.ts');
const EDITOR_MIN = (() => {
  const m = /export const EDITOR_MIN = (\d+);/.exec(readFileSync(GEOMETRY, 'utf8'));
  if (m === null) throw new Error(`${TAG} EDITOR_MIN is no longer declared in ${GEOMETRY}`);
  return Number(m[1]);
})();

const scratch = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'p219-geometry');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'project');
const profile = join(root, 'profile');
mkdirSync(profile, { recursive: true });
writeFileSync(join(project, 'readme.txt'), 'the p219 fixture\n');
for (const argv of [
  ['init', '-q', '-b', 'main'],
  ['add', '-A'],
  ['-c', 'user.email=p219@example.invalid', '-c', 'user.name=p219 probe', 'commit', '-q', '-m', 'p219 fixture']
]) {
  spawnSync('git', argv, { cwd: project, encoding: 'utf8' });
}

// A name a person really could type. 137 characters, no '.' and no ':', which
// is what tmux refuses. It is the shape the verifier used.
const LONG_NAME = `p219-${'the-refactor-of-the-session-name-column-'.repeat(4)}end`.slice(0, 137);

const probeJs = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (test) => { for (let i = 0; i < 80 && !test(); i++) await wait(100); return test(); };
  await until(() => document.querySelector('.diag-group-sessions .diag-table tbody tr') !== null);
  await wait(400);

  const root = document.querySelector('.diag');
  const scroller = document.querySelector('.diag-group-sessions .diag-scroll');
  const table = scroller ? scroller.querySelector('.diag-table') : null;
  if (!root || !scroller || !table) return { error: 'no sessions table drawn' };

  // The cap rule, found in the CSSOM so it can be moved and put back inside
  // one window. A reading taken against another build is a different build.
  let capRule = null;
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const r of Array.from(sheet.cssRules)) {
        if (r.selectorText === '.diag-session-name') capRule = r;
      }
    } catch (e) {}
  }
  if (!capRule) return { error: 'the .diag-session-name rule is in no stylesheet' };
  const shipped = capRule.style.maxWidth;

  const heads = () => Array.from(table.querySelectorAll('thead th')).map((th) => ({
    label: (th.textContent || '').replace(/[^A-Za-z ]/g, '').trim(),
    width: Math.round(th.getBoundingClientRect().width)
  }));
  const read = () => ({
    tableFloor: table.scrollWidth,
    scrollerClient: scroller.clientWidth,
    scrollerScroll: scroller.scrollWidth,
    scrolls: scroller.scrollWidth > scroller.clientWidth,
    columns: heads()
  });

  const out = { longName: null, shipped, widths: {} };
  const firstCell = table.querySelector('tbody tr .diag-session-name');
  out.longName = firstCell ? (firstCell.getAttribute('title') || '').length : 0;
  out.titleIsWholeName = firstCell ? (firstCell.getAttribute('title') || '').length > 40 : false;

  // The pane is narrowed by giving the tab's own root an explicit width, which
  // is what a narrow editor pane does to it. EDITOR_MIN is the floor the app
  // itself will not go under, so it is the fair worst case rather than a
  // width chosen to make a point.
  const at = async (px) => {
    if (px === null) root.style.removeProperty('width');
    else { root.style.width = px + 'px'; root.style.flex = '0 0 auto'; }
    await wait(250);
    return read();
  };

  out.widths.naturalCapped = await at(null);
  out.widths.narrowCapped = await at(${EDITOR_MIN});

  capRule.style.removeProperty('max-width');
  out.widths.narrowUncapped = await at(${EDITOR_MIN});
  out.widths.naturalUncapped = await at(null);

  capRule.style.maxWidth = '0px';
  out.widths.narrowZeroCap = await at(${EDITOR_MIN});
  out.widths.naturalZeroCap = await at(null);

  capRule.style.maxWidth = shipped;
  await at(null);
  return out;
})()`;

const socket = process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p219-${String(process.pid)}`;
let text = '';
await withElectron(
  {
    label: 'p219-geometry',
    userDataDir: profile,
    tmuxSocket: socket,
    cwd: repoRoot,
    ceilingMs: 240_000,
    env: {
      GMUX_SHOT: join(root, 'p219-geometry.png'),
      GMUX_SHOT_VERBOSE: '1',
      GMUX_SHOT_DELAY_MS: '2000',
      GMUX_SHOT_DRIVE: JSON.stringify({
        projectPath: project,
        session: { agent: 'shell', name: LONG_NAME },
        diagnosticsReport: true
      }),
      GMUX_SHOT_JS: probeJs,
      GMUX_TMUX_SOCKET: socket
    }
  },
  async (handle) => {
    say(`launched the app, pid ${String(handle.pid)}`);
    const code = await handle.exited;
    text = handle.text();
    say(`the app exited with ${String(code)}`);
    if (code !== 0) {
      // A NON ZERO EXIT IS PRINTED RATHER THAN SWALLOWED. The reading is taken
      // before the capture, so it can be complete while a later step failed,
      // and a probe that hides that is a probe whose reading nobody can trust.
      for (const line of text.split('\n').slice(-14)) {
        say(`  | ${line.trim()}`);
      }
    }
  }
);

const readOne = (marker) => {
  const at = text.lastIndexOf(marker);
  if (at === -1) return null;
  try { return JSON.parse(text.slice(at + marker.length).split('\n')[0] ?? ''); } catch { return null; }
};
const reading = readOne('[gmux-shot] probe ');
writeFileSync(join(root, 'p219-reading.json'), JSON.stringify(reading, null, 2));
if (reading === null || reading.error !== undefined) {
  console.error(`${TAG} the driven window answered ${JSON.stringify(reading)}`);
  console.error(text.split('\n').slice(-40).join('\n'));
  process.exit(1);
}

const w = reading.widths;
say(`the session name on the row is ${String(reading.longName)} characters, whole name on the title: ${String(reading.titleIsWholeName)}`);
say(`the shipped cap is ${reading.shipped}`);
for (const [name, r] of Object.entries(w)) {
  say(
    `${name.padEnd(18)} table floor ${String(r.tableFloor).padStart(5)}px  ` +
    `card ${String(r.scrollerScroll).padStart(5)}/${String(r.scrollerClient).padStart(4)}  ` +
    `sideways: ${r.scrolls ? 'YES' : 'no'}`
  );
}
say('columns at the shipped cap, natural width:');
for (const c of w.naturalCapped.columns) say(`  ${c.label.padEnd(12)} ${String(c.width).padStart(4)}px`);

const nameCol = w.naturalCapped.columns[0]?.width ?? 0;
// THE INTRINSIC FLOOR IS THE NARROW READING, not the natural one. The table
// fills a card wider than it needs, so `naturalZeroCap` reports the CARD's
// width rather than what the columns want. The narrow reading is the number
// the columns actually ask for.
const others = Math.min(w.narrowZeroCap.tableFloor, w.naturalZeroCap.tableFloor);
// The card is narrower than the pane by the group's own padding, so the width
// the table is really given at EDITOR_MIN is what was measured, not the pane.
const cardAtFloor = w.narrowCapped.scrollerClient;
say('');
say(`THE FLOOR. With the cap the table cannot be drawn under ${String(w.narrowCapped.tableFloor)}px.`);
say(`Of that, the name column is ${String(nameCol)}px and the other seven want ${String(others)}px.`);
say(`The editor pane's own floor is ${String(EDITOR_MIN)}px (EDITOR_MIN, read from src/renderer/state/chrome-geometry.ts),`);
say(`and at that pane this card is ${String(cardAtFloor)}px wide.`);
say(
  others > cardAtFloor
    ? `SO NO CAP CLOSES IT: with the name column at zero the other seven are still ${String(others - cardAtFloor)}px wider than the card, and the card scrolls sideways anyway.`
    : `A CAP COULD CLOSE IT: the other seven fit the card at the app's narrowest pane with ${String(cardAtFloor - others)}px to spare.`
);
say(`The cap is worth ${String(w.narrowUncapped.tableFloor - w.narrowCapped.tableFloor)}px on this name (uncapped floor ${String(w.narrowUncapped.tableFloor)}px).`);
say(`It is a real ${String(w.narrowUncapped.tableFloor - w.narrowCapped.tableFloor)}px and it is not the whole finding.`);
say(`reading written to ${join(root, 'p219-reading.json')}`);
