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
 * PHASE 221'S FIX ROUND ADDED READING 9 AND GAVE READING 8 A FAILING CASE:
 *
 *   9  the report's own `.diag-head` is sticky at z-index 1 and so, since
 *      Phase 221, is the first column. Nothing between the pinned cell and the
 *      tab makes a stacking context, so the two are SIBLINGS at one z-index
 *      and tree order decides — the table is later, so the pinned column
 *      painted over the head and took its clicks. This walks the ancestors to
 *      prove the context claim, then scrolls a row under the head and asks
 *      `elementFromPoint` who is really there. It is neither narrowed nor
 *      scrolled sideways, because `position: sticky` makes a stacking context
 *      whether or not its scroller overflows and the defect was at every width.
 *
 * AND THE COMMITTER'S ROUND WIDENED READING 9, because as written it could not
 * see the defect the fix for it introduced. Its walk stopped at `.diag` and
 * printed "none, so the two sticky layers are siblings" WITHOUT NAMING the
 * context they are siblings IN. It was the document root: `overflow` makes no
 * stacking context and every ancestor to BODY is static or `position:
 * relative; z-index: auto`, so raising this head to 2 tied it with the editor
 * pane's own `.ed-divider` and, later in tree order, took two of that 5px drag
 * handle's pixels wherever the two overlapped. The walk now runs to the
 * document root and NAMES its answer, enumerates every positioned peer sharing
 * that context, and hit tests the rightmost pixel of the handle inside the
 * head's band. Both go red at the parent of `isolation: isolate` on `.diag`.
 *
 * Readings 6 to 9 exit non zero when they fail, so this is a check and not a
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

  /*
   * PHASE 221 FIX ROUND, reading 9. THE HEAD KEEPS ITS OWN LAYER.
   *
   * .diag-head is position: sticky; z-index: 1 and has been since Phase
   * 163. The pin above is sticky too. Neither .diag-group (overflow hidden)
   * nor .diag-scroll (overflow-x auto) makes a stacking context, so the two
   * are siblings in ONE context at the same z-index and TREE ORDER decides —
   * the table is later, so the pinned column painted over the report's own
   * head and took its clicks. This walks the ancestors to prove the context
   * claim rather than assert it, then scrolls the tab until a row of the
   * sessions table straddles the head's bottom edge and asks
   * elementFromPoint who is really there.
   *
   * It is NOT narrowed and NOT scrolled sideways for this, because the defect
   * is neither: position: sticky makes a stacking context whether or not its
   * scroller overflows.
   */
  root.style.removeProperty('width');
  root.style.removeProperty('flex');
  scroller.scrollLeft = 0;
  await wait(250);

  const layerTh = table.querySelector('thead th');
  if (!layerTh) return { error: 'the sessions table has no head cell' };

  /*
   * THE WALK GOES TO THE DOCUMENT ROOT, and the committer's round is why. As
   * first written it stopped at '.diag' — 'if (el === root) break' — and then
   * printed "none, so the two sticky layers are siblings" without ever naming
   * WHICH context they are siblings in. They were siblings in the ROOT one,
   * because 'overflow' makes no stacking context and every ancestor up to
   * BODY is static or 'position: relative; z-index: auto', so every z-index in
   * diagnostics.css competed app-wide. A walk that cannot name its answer
   * cannot notice that.
   */
  const names = (el) => el.tagName + (el.className ? '.' + String(el.className) : '');
  const makesContext = (el) => {
    const cst = getComputedStyle(el);
    return (
      (cst.position !== 'static' && cst.zIndex !== 'auto') ||
      cst.position === 'fixed' || cst.position === 'sticky' ||
      cst.opacity !== '1' || cst.transform !== 'none' || cst.filter !== 'none' ||
      cst.isolation === 'isolate' || cst.mixBlendMode !== 'normal' ||
      cst.willChange.includes('transform') || cst.willChange.includes('opacity') ||
      cst.contain.includes('paint') || cst.contain.includes('layout')
    );
  };
  const contexts = [];
  let contextRoot = 'HTML';
  let contextIsTab = false;
  for (let el = layerTh.parentElement; el && el !== document.documentElement; el = el.parentElement) {
    if (!makesContext(el)) continue;
    contexts.push(names(el));
    // The FIRST one found is the context this cell's z-index is resolved in,
    // which is the whole question. Everything after it is bookkeeping.
    if (contexts.length === 1) {
      contextRoot = names(el);
      contextIsTab = el === root || root.contains(el);
    }
  }

  /*
   * THE PEERS, enumerated rather than reasoned about. Every positioned element
   * in the document whose own nearest stacking context is the same one this
   * tab's head resolves in, with its z-index. At the parent of the committer's
   * round this listed the editor's drag handle, the sidebar resizer and the
   * xterm layers beside '.diag-head'; after 'isolation: isolate' on '.diag' it
   * lists nothing from this file at all.
   */
  const headForPeers = document.querySelector('.diag-head');
  const contextOf = (el) => {
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      if (makesContext(a)) return a;
    }
    return document.documentElement;
  };
  const headContextEl = headForPeers ? contextOf(headForPeers) : document.documentElement;
  const peers = [];
  for (const el of Array.from(document.querySelectorAll('*'))) {
    if (el === headForPeers) continue;
    const cst = getComputedStyle(el);
    if (cst.position === 'static' || cst.zIndex === 'auto') continue;
    if (contextOf(el) !== headContextEl) continue;
    peers.push({ name: names(el), z: Number(cst.zIndex) });
  }
  peers.sort((a, b) => b.z - a.z || a.name.localeCompare(b.name));

  /*
   * THE EDITOR PANE'S DRAG HANDLE, hit tested where it overlaps this head.
   *
   * '.ed-divider' is 'position: absolute; width: 5px; z-index: 2' and is the
   * only way to resize the editor pane with a pointer. It is rendered at
   * EditorPanel.tsx:819 and this tab at :895, so at the SAME number the head
   * wins on tree order and swallows whatever part of the 5px band it covers.
   * The point is the RIGHTMOST pixel the handle still covers, inside the
   * head's own vertical band, which is the worst case rather than a midpoint
   * that might miss a 2px overlap.
   */
  const divider = document.querySelector('.ed-divider');
  let handle = null;
  if (divider && headForPeers) {
    const db = divider.getBoundingClientRect();
    const hb = headForPeers.getBoundingClientRect();
    const x0 = Math.max(db.left, hb.left);
    const x1 = Math.min(db.right, hb.right);
    const y0 = Math.max(db.top, hb.top);
    const y1 = Math.min(db.bottom, hb.bottom);
    const overlapW = Math.max(0, Math.round(x1 - x0));
    const overlapH = Math.max(0, Math.round(y1 - y0));
    let hit = null;
    if (overlapW > 0 && overlapH > 0) {
      const x = Math.round(x1) - 1;
      const y = Math.round((y0 + y1) / 2);
      const el = document.elementFromPoint(x, y);
      hit = {
        x, y,
        name: el ? names(el) : null,
        isDivider: el ? divider.contains(el) || el === divider : false,
        isHead: el ? headForPeers.contains(el) : false
      };
    }
    handle = {
      dividerZ: getComputedStyle(divider).zIndex,
      divider: { l: Math.round(db.left), r: Math.round(db.right), t: Math.round(db.top), b: Math.round(db.bottom) },
      head: { l: Math.round(hb.left), r: Math.round(hb.right), t: Math.round(hb.top), b: Math.round(hb.bottom) },
      overlapW, overlapH, hit
    };
  }

  // A SHORTER TAB, which is all this is: .diag is height: 100% of an
  // editor pane, so this is exactly the clientHeight a person with a shorter
  // window has. Without it this fixture's one session sits below the fold and
  // the sessions table can never be scrolled under the head at all.
  const wasHeight = root.style.height;
  root.style.height = '420px';
  root.style.flex = '0 0 auto';
  await wait(250);

  const headEl = document.querySelector('.diag-head');
  const rows = () => [layerTh, ...Array.from(table.querySelectorAll('tbody tr td:first-child'))];
  let overlap = null;
  for (let step = 0; step < 300 && headEl; step += 1) {
    const hb = headEl.getBoundingClientRect();
    const y = Math.round(hb.bottom) - 3;
    const tb = layerTh.getBoundingClientRect();
    const x = Math.round(tb.left + tb.width / 2);
    const straddles = rows().some((c) => {
      const b = c.getBoundingClientRect();
      return b.top < y && b.bottom > y;
    });
    if (straddles) {
      const hit = document.elementFromPoint(x, y);
      overlap = {
        x, y,
        hit: hit ? hit.tagName + '.' + String(hit.className || '') : null,
        hitText: hit ? (hit.textContent || '').trim().slice(0, 40) : null,
        hitIsHead: hit ? headEl.contains(hit) : false,
        hitInTable: hit ? table.contains(hit) : false
      };
      break;
    }
    if (root.scrollTop >= root.scrollHeight - root.clientHeight) break;
    root.scrollTop += 8;
    await wait(12);
  }
  const headStyle = headEl ? getComputedStyle(headEl) : null;
  out.layers = {
    headPosition: headStyle ? headStyle.position : null,
    headZ: headStyle ? headStyle.zIndex : null,
    pinZ: getComputedStyle(layerTh).zIndex,
    contexts,
    contextRoot,
    contextIsTab,
    peers,
    handle,
    overlap
  };
  root.style.height = wasHeight;

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
  // --border is resolved the same way, because PHASE 221's FIX ROUND made
  // reading 8 ask whether the sampled pixel IS the hairline rather than
  // whether it merely differs from the fill: with the border taken off every
  // th both samples read a distance of 1 and the old asymmetry rule stayed
  // green, so the check recited instead of gating.
  const resolve1 = (token) => {
    const swatch = document.createElement('div');
    swatch.style.background = 'var(' + token + ')';
    card.appendChild(swatch);
    const v = getComputedStyle(swatch).backgroundColor;
    swatch.remove();
    return v;
  };
  const canvasFill = resolve1('--bg-canvas');
  const borderFill = resolve1('--border');

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
    borderFill,
    // The CARD's own rectangle, so a sample can be required to land INSIDE it.
    // Without this, reading 8 passed over a pin scrolled entirely off the card:
    // under the static ablation both samples read the CANVAS behind the tab,
    // a pixel WAS read, d >= 0 held, and the check went green on a sample
    // taken nowhere near the thing it names.
    cardRect: (() => {
      const b = card.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    })(),
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
  // The BORDER token resolved in the same window, so the question below is
  // 'is the sampled pixel the hairline' rather than 'does it differ from the
  // fill by anything at all'. That distinction is the whole of Phase 221's fix
  // round on this reading: with `border-bottom` taken off every `.diag-table
  // th` both samples read a distance of ONE from the fill and the old rules
  // stayed green, so a hairline that was not painted anywhere read as painted.
  const borderRgb = (/(\d+),\s*(\d+),\s*(\d+)/.exec(String(st.borderFill)) ?? []).slice(1).map(Number);
  const toBorder = (px) =>
    borderRgb.length === 3
      ? Math.abs(px[0] - borderRgb[0]) + Math.abs(px[1] - borderRgb[1]) + Math.abs(px[2] - borderRgb[2])
      : Number.POSITIVE_INFINITY;
  // A sample must land INSIDE the card. Under the `static` ablation the pinned
  // head sits at -281px, entirely off the card, and both samples read the
  // canvas behind the tab: a pixel WAS read, so a `d >= 0` guard passed over a
  // reading taken nowhere near the thing it names.
  const inCard = (cssX) => {
    const c = st.cardRect;
    const y = st.rect.y + st.rect.h;
    return cssX >= c.x && cssX <= c.x + c.w && y >= c.y && y <= c.y + c.h;
  };
  const band = (cssX) => {
    const x = Math.round(cssX * dpr);
    const y0 = Math.round((st.rect.y + st.rect.h) * dpr);
    let best = -1;
    let hex = null;
    let px0 = null;
    for (let y = y0 - 5; y <= y0 + 5; y += 1) {
      if (y < 0 || y >= img.height || x < 0 || x >= img.width) continue;
      const at = pixel(img, x, y);
      const px = rgbOf(at);
      if (px === null) continue;
      if (dist(px) > best) { best = dist(px); hex = at; px0 = px; }
    }
    return { d: best, hex, toBorder: px0 === null ? -1 : toBorder(px0), inCard: inCard(cssX) };
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
    pinned.inCard && beside.inCard,
    `a hairline sample fell OUTSIDE the card (pinned ${String(pinned.inCard)}, beside ${String(beside.inCard)}), so it read the tab behind it rather than the card`
  );
  // THE PIXEL IS THE HAIRLINE OR IT IS NOTHING. `> 0` was the old want and it
  // could not fail: with the border taken off every `th` the strongest
  // departure in the band was still 1, from antialiased text, and 1 > 0. The
  // question is asked against the RESOLVED `--border` instead, so a hairline
  // that is not painted, and a hairline an opaque cell covered, both go red.
  want(
    pinned.toBorder >= 0 && pinned.toBorder < pinned.d,
    `the pixel under the pinned column is not the header hairline: it is ${String(pinned.hex)}, ${String(pinned.toBorder)} from --border ${String(st.borderFill)} and only ${String(pinned.d)} from the card's fill`
  );
  want(
    beside.d <= 0 || pinned.d >= beside.d * 0.5,
    'the pinned cell painted over the collapsed header border: the hairline is there beside it and gone under it'
  );
} catch (err) {
  say(`the capture at ${shotPath} could not be sampled: ${String(err)}`);
  failures.push('the photograph could not be sampled, so the hairline under the pin is unproved');
}

/*
 * PHASE 221 FIX ROUND, reading 9. THE REPORT'S OWN HEAD KEEPS ITS LAYER.
 *
 * Two sticky layers in one stacking context at the same z-index: tree order
 * decides, and the table is later. Measured at the parent of this fix in one
 * window with three arms, the pin as shipped, the pin ablated to `static`, and
 * `.diag-head` lifted to 2 with the pin intact — the first answered the
 * table's Session header at a point three pixels inside the head, and the
 * other two answered `HEADER.diag-head`.
 */
const ly = reading.layers;
say('');
if (ly === undefined || ly === null) {
  console.error(`${TAG} the window took no layer reading`);
  process.exit(1);
}
say(`THE LAYERS. the head is ${String(ly.headPosition)} at z-index ${String(ly.headZ)}, the pinned column at ${String(ly.pinZ)}.`);
say(`the context both of them resolve in is ${String(ly.contextRoot)}, which is ${ly.contextIsTab ? 'INSIDE the tab' : 'OUTSIDE the tab'}`);
say(`stacking contexts on the walk to the document root: ${ly.contexts.length === 0 ? 'NONE, so every z-index in diagnostics.css is app-wide' : JSON.stringify(ly.contexts)}`);
say(`positioned peers sharing that context: ${ly.peers.length === 0 ? 'none' : ly.peers.map((p) => p.name + ' ' + String(p.z)).join(', ')}`);
if (ly.handle === null || ly.handle === undefined) {
  say('the editor pane drew no drag handle in this window, so the handle arm asked nothing');
} else {
  say(`the editor's drag handle is z-index ${String(ly.handle.dividerZ)} at l ${String(ly.handle.divider.l)} r ${String(ly.handle.divider.r)}, the head at l ${String(ly.handle.head.l)} r ${String(ly.handle.head.r)}`);
  say(`they overlap ${String(ly.handle.overlapW)}px wide by ${String(ly.handle.overlapH)}px tall`);
  if (ly.handle.hit !== null) {
    say(`at (${String(ly.handle.hit.x)}, ${String(ly.handle.hit.y)}), the rightmost pixel of the handle inside the head's band, the point belongs to ${String(ly.handle.hit.name)}`);
  }
}
if (ly.overlap === null) {
  say('NO ROW COULD BE SCROLLED UNDER THE HEAD, so the hit test proved nothing.');
} else {
  say(`at (${String(ly.overlap.x)}, ${String(ly.overlap.y)}), three pixels inside the head, the point belongs to ${String(ly.overlap.hit)} "${String(ly.overlap.hitText)}"`);
}
want(ly.headPosition === 'sticky', `the report head is ${String(ly.headPosition)} rather than sticky, so nothing here is about layers any more`);
want(
  Number(ly.headZ) > Number(ly.pinZ),
  `the report head sits at z-index ${String(ly.headZ)} and the pinned column at ${String(ly.pinZ)}: at the same number the column is later in tree order and paints over the head`
);
want(
  ly.overlap !== null,
  'no session row could be scrolled under the report head, so the layer question was never asked of a real pixel'
);
want(
  ly.overlap === null || ly.overlap.hitIsHead,
  `a point three pixels inside the report head belongs to ${String(ly.overlap?.hit)} "${String(ly.overlap?.hitText)}" instead: the pinned column is painted over the head and takes its clicks`
);

/*
 * THE COMMITTER'S ROUND, and it is the other half of the same question. The
 * two clauses above hold the head over the pin; these hold the head's number
 * INSIDE this tab, which it was not. `.diag` has `isolation: isolate` for the
 * reason written at that rule; without it the head's 2 tied with the editor
 * pane's `.ed-divider` and, being later in tree order, took two of the drag
 * handle's five pixels wherever the two overlapped.
 *
 * The context clause is what makes the handle clause more than one geometry's
 * luck: an overlap that happens to be zero in this window would let a handle
 * arm pass while the numbers were still app-wide.
 */
want(
  ly.contextIsTab === true,
  `the layers in diagnostics.css resolve in ${String(ly.contextRoot)}, which is outside the tab: every z-index in that file is competing app-wide, and its head at ${String(ly.headZ)} ties with whatever else in the app sits at that number`
);
want(
  ly.handle !== null && ly.handle !== undefined,
  'the editor pane drew no drag handle, so the one control the report head can overlap was never asked about'
);
if (ly.handle !== null && ly.handle !== undefined) {
  want(
    ly.handle.overlapW === 0 || ly.handle.hit !== null,
    'the handle and the head overlap but no point in the overlap was hit tested'
  );
  want(
    ly.handle.hit === null || ly.handle.hit.isDivider,
    `the rightmost pixel of the editor's drag handle inside the report head belongs to ${String(ly.handle.hit?.name)} instead of the handle: ${String(ly.handle.overlapW)}px of a 5px resize target does not start a drag`
  );
}

say('');
if (failures.length > 0) {
  for (const f of failures) console.error(`${TAG} FAIL ${f}`);
  process.exit(1);
}
say('THE PIN HOLDS. The card scrolls, the name stays, and every column is reachable with the row still named.');
