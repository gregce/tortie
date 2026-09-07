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
 * PHASE 221 ADDED THE RULING'S OWN READINGS TO THE SAME WINDOW, because the
 * five above measure the defect and none of them measures the answer:
 *
 *   6  the floor with the PROJECT column at its own 22ch cap, which this
 *      fixture's seven character directory name cannot reach and which is the
 *      real worst case, 674px rather than the 563px the entry carried
 *   7  the first column pinned at EDITOR_MIN with the card scrolled to its far
 *      end: the head and the cell both holding the card's left edge, the fill
 *      being the CARD's own and not the canvas behind it, the rule that keeps
 *      the row hover on that cell, and the last column reachable beside it
 *   8  the PHOTOGRAPH sampled at the header's hairline, inside the pinned
 *      column and beside it, which is the one question the DOM cannot answer:
 *      `border-collapse: collapse` gives the hairline to the TABLE, painted
 *      before any cell background, so an opaque pinned cell can cover a border
 *      that a computed style still reports as 1px
 *
 * Readings 6 to 8 exit non zero when they fail, so this is a check and not a
 * printout. Readings 1 to 5 are unchanged, so a run at this round's parent
 * compares to a run at its head line for line.
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
import { decodePng, pixel } from './png-read.mjs';

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

  // PHASE 221, reading 6. THE WORST CASE THIS FIXTURE CANNOT REACH ON ITS OWN.
  // The project here is named 'project', seven characters, while '.diag-project'
  // is capped at 22ch and any real repository reaches that cap. The cap is a
  // MAXIMUM, so the column's floor is its own content up to it, and the entry's
  // 563px was read with that column at 56px. Held from the CSSOM the way the
  // name cap above is, so it is this window rather than a second fixture.
  let projectRule = null;
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const r of Array.from(sheet.cssRules)) {
        if (r.selectorText === '.diag-project') projectRule = r;
      }
    } catch (e) {}
  }
  if (projectRule) {
    projectRule.style.minWidth = '22ch';
    out.widths.narrowWorstCase = await at(${EDITOR_MIN});
    projectRule.style.removeProperty('min-width');
  }

  // PHASE 221, reading 7. THE PINNED FIRST COLUMN, read where the finding
  // lives: the narrowest pane, the card scrolled as far right as it goes.
  await at(${EDITOR_MIN});
  // The card is brought into view first, because the reading below is checked
  // against the PHOTOGRAPH and an element under the fold is in no photograph.
  // Vertical only: 'inline: nearest' so nothing here moves the card's own
  // sideways scroll, which is the thing being measured.
  const card0 = document.querySelector('.diag-group-sessions');
  if (card0) card0.scrollIntoView({ block: 'center', inline: 'nearest' });
  await wait(200);
  scroller.scrollLeft = scroller.scrollWidth;
  await wait(300);
  const th0 = table.querySelector('thead th');
  const td0 = table.querySelector('tbody tr td');
  const card = document.querySelector('.diag-group-sessions');
  if (!th0 || !td0 || !card) return { error: 'the sessions table lost its first column' };
  const hs = getComputedStyle(th0);
  const cs = getComputedStyle(td0);
  const box = scroller.getBoundingClientRect();
  const thBox = th0.getBoundingClientRect();
  const heads0 = Array.from(table.querySelectorAll('thead th'));

  // The canvas token RESOLVED, so 'the card's own fill and not the tab behind
  // it' is a comparison of two painted colours rather than of two token names.
  const swatch = document.createElement('div');
  swatch.style.background = 'var(--bg-canvas)';
  card.appendChild(swatch);
  const canvasFill = getComputedStyle(swatch).backgroundColor;
  swatch.remove();

  // The row hover cannot be provoked by a synthetic event, so the rule itself
  // is read out of the CSSOM: an opaque cell paints over the fill the 'tr'
  // carries, and without this rule the pinned column is the one cell that does
  // not light up with its row.
  let hoverRule = null;
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const r of Array.from(sheet.cssRules)) {
        if (typeof r.selectorText === 'string' && r.selectorText.includes('tr:hover td:first-child')) hoverRule = r;
      }
    } catch (e) {}
  }

  out.sticky = {
    scrollLeft: Math.round(scroller.scrollLeft),
    scrollMax: Math.round(scroller.scrollWidth - scroller.clientWidth),
    headLeft: Math.round(thBox.left - box.left),
    cellLeft: Math.round(td0.getBoundingClientRect().left - box.left),
    headPosition: hs.position,
    position: cs.position,
    left: cs.left,
    zIndex: cs.zIndex,
    background: cs.backgroundColor,
    cardBackground: getComputedStyle(card).backgroundColor,
    canvasFill,
    headBorderBottom: hs.borderBottomWidth,
    lastLabel: (heads0[heads0.length - 1].textContent || '').replace(/[^A-Za-z ]/g, '').trim(),
    lastLeft: Math.round(heads0[heads0.length - 1].getBoundingClientRect().left - box.left),
    hoverSelector: hoverRule ? hoverRule.selectorText : null,
    hoverBackground: hoverRule ? hoverRule.style.background : null,
    // The pinned head cell in the window's own CSS pixels, so the capture is
    // sampled where the pin actually is rather than where a number says it is.
    rect: {
      x: Math.round(thBox.left), y: Math.round(thBox.top),
      w: Math.round(thBox.width), h: Math.round(thBox.height)
    },
    // A point INSIDE the card and to the right of the pin, which is where the
    // hairline is compared against. It cannot be the second column's own left
    // edge: scrolled to the far end that column is off the card to the left,
    // and sampling there reads the tab behind the card rather than the card.
    besideX: Math.round(thBox.right + 20),
    dpr: window.devicePixelRatio
  };
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

/*
 * PHASE 221. The ruling, driven. The readings above say the table cannot be
 * drawn in the card and that no cap reaches it; these say what was done about
 * it, which is that the first column is pinned so the numbers scroll under a
 * name that stays. Every one of them can go red.
 */
const st = reading.sticky;
say('');
if (st === undefined || st === null) {
  console.error(`${TAG} the window took no sticky reading`);
  process.exit(1);
}
if (w.narrowWorstCase !== undefined) {
  say(
    `THE WORST CASE. With the project column at its own 22ch cap the table wants ` +
    `${String(w.narrowWorstCase.tableFloor)}px against a ${String(cardAtFloor)}px card, ` +
    `over by ${String(w.narrowWorstCase.tableFloor - cardAtFloor)}px.`
  );
}
say(`scrolled to ${String(st.scrollLeft)} of ${String(st.scrollMax)}, the far end of the card`);
say(`the pinned head is ${String(st.headLeft)}px from the card's left edge, the cell ${String(st.cellLeft)}px`);
say(`position ${st.headPosition}/${st.position}, left ${st.left}, z-index ${st.zIndex}`);
say(`its fill ${st.background}, the card's own ${st.cardBackground}, the canvas behind it ${st.canvasFill}`);
say(`the head's collapsed border reads ${st.headBorderBottom}`);
say(`at that scroll ${st.lastLabel} sits ${String(st.lastLeft)}px in, beside the pinned name`);
say(`the row hover keeps the pinned cell: ${String(st.hoverSelector)} -> ${String(st.hoverBackground)}`);

const failures = [];
const want = (ok, line) => { if (!ok) failures.push(line); };
want(st.scrollMax > 0, 'the card did not scroll sideways at all, so nothing was proved about a pinned column');
// One pixel of tolerance: both numbers are rounded from a fractional scroll.
want(st.scrollLeft >= st.scrollMax - 1, 'the card was not scrolled to its far end');
want(st.headPosition === 'sticky' && st.position === 'sticky', 'the first column is not sticky');
want(st.left === '0px', `the first column's left is ${String(st.left)} rather than 0px`);
want(st.headLeft === 0 && st.cellLeft === 0, 'the first column did not hold the card\'s left edge under a full scroll');
want(st.background === st.cardBackground, 'the pinned cell is not painted in the card\'s own fill');
want(st.background !== st.canvasFill, 'the pinned cell is painted in the canvas fill, which would seam against its card');
want(st.hoverSelector !== null, 'no rule keeps the row hover on the pinned cell, so it is the one cell that does not light up');
want(st.lastLeft > 0, 'the last column never reaches the card, so the scroll does not expose it');

/*
 * THE PIXEL HALF, and it is the one the DOM cannot answer. `.diag-table` is
 * `border-collapse: collapse`, where the header's hairline belongs to the TABLE
 * and is painted before any cell background, so an opaque pinned cell can cover
 * the very border a computed style still reports as 1px. This samples the
 * photograph: the strongest departure from the card's fill in a six pixel band
 * at the head's bottom edge, inside the pinned column and again in the column
 * beside it. If the pin ate the hairline, the first is flat and the second is not.
 */
const shotPath = join(root, 'p219-geometry.png');
try {
  const img = decodePng(readFileSync(shotPath));
  const dpr = Number(st.dpr) || 1;
  const fill = (/(\d+),\s*(\d+),\s*(\d+)/.exec(String(st.cardBackground)) ?? []).slice(1).map(Number);
  const rgbOf = (hex) => {
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex));
    return m === null ? null : [1, 2, 3].map((i) => parseInt(m[i], 16));
  };
  const dist = (px) => Math.abs(px[0] - fill[0]) + Math.abs(px[1] - fill[1]) + Math.abs(px[2] - fill[2]);
  // -1 means NOTHING WAS SAMPLED, which is a failure and not a flat reading.
  // The first version of this returned 0 for a band entirely off the image and
  // printed 'no departure from the fill' over a card that was under the fold.
  const band = (cssX) => {
    const x = Math.round(cssX * dpr);
    const y0 = Math.round((st.rect.y + st.rect.h) * dpr);
    let best = -1;
    let hex = null;
    for (let y = y0 - 5; y <= y0 + 5; y += 1) {
      if (y < 0 || y >= img.height || x < 0 || x >= img.width) continue;
      const at = pixel(img, x, y);
      const px = rgbOf(at);
      if (px === null) continue;
      if (dist(px) > best) { best = dist(px); hex = at; }
    }
    return { d: best, hex };
  };
  const pinned = band(st.rect.x + Math.round(st.rect.w / 2));
  const beside = band(st.besideX);
  say('');
  say(
    `THE HAIRLINE IN THE PHOTOGRAPH, sampled at the head's bottom edge as a distance from the card's own fill ` +
    `${st.cardBackground}: under the pinned column ${String(pinned.d)} at ${String(pinned.hex)}, ` +
    `${String(Math.round(st.besideX - st.rect.x))}px to its right ${String(beside.d)} at ${String(beside.hex)}.`
  );
  want(
    fill.length === 3,
    `the card's fill did not parse as rgb: ${String(st.cardBackground)}`
  );
  want(
    pinned.d >= 0 && beside.d >= 0,
    'the pinned head cell was outside the photograph, so the hairline was sampled nowhere'
  );
  want(
    pinned.d > 0,
    'the header hairline is not painted under the pinned column at all'
  );
  want(
    beside.d <= 0 || pinned.d >= beside.d * 0.5,
    'the pinned cell painted over the collapsed header border: the hairline is there beside it and gone under it'
  );
} catch (err) {
  say(`the capture at ${shotPath} could not be sampled: ${String(err)}`);
  failures.push('the photograph could not be sampled, so the hairline under the pin is unproved');
}

say('');
if (failures.length > 0) {
  for (const f of failures) console.error(`${TAG} FAIL ${f}`);
  process.exit(1);
}
say('THE PIN HOLDS. The card scrolls, the name stays, and every column is reachable with the row still named.');
