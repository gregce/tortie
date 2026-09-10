#!/usr/bin/env node
/**
 * measure-mock.mjs — PHASE 249's DESIGN STEP, read off the mock rather than
 * asserted about it.
 *
 * Phase 249 is RESEARCH ONLY and BUILDS NOTHING. This script touches no file
 * under src/, opens no manifest, starts no tmux server, spawns no agent, spends
 * no token, opens no keychain, makes no request and touches no machine. It
 * launches ONE Electron through build/electron-run.mjs, on a scratch profile
 * outside the repository and outside the person's home, ended in a `finally`
 * whatever happened. It runs NONE of the product's own main: the entry is this
 * file's own five-line window, written into the scratch directory, so nothing
 * of Tortie's is started at all.
 *
 * It drives build/p249/mock-p249.html over every cell of look × base × pane ×
 * wash and reads, off the live DOM:
 *
 *   - the page's width against the scroller's, and the dead space as a
 *     percentage, which is fault 1's own number;
 *   - the PAINTED height of a mark against the line pitch, which is the whole
 *     of fault 2's central question in two numbers;
 *   - how many mark fragments the widest change draws, and how many outlined
 *     boxes the current change's mark draws;
 *   - whether the chip covers a drawn row of the person's prose;
 *   - how many mark fragments cross the column's own content edge;
 *   - every colour the proposal depends on, resolved on the ground it really
 *     sits on, with the WCAG ratio computed here rather than quoted.
 *
 * `--self-test` proves the graders and launches nothing.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const TAG = '[p249-mock]';
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// The graders. Pure, proved under --self-test before any Electron is started.
// ---------------------------------------------------------------------------

/** WCAG 2.x relative luminance of an 8-bit sRGB triple. */
export function luminance(rgb) {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}

/** The contrast ratio of two opaque triples. */
export function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `rgb()` / `rgba()` as an 8-bit triple plus alpha. */
export function parseColor(text) {
  const m = /rgba?\(([^)]+)\)/.exec(String(text));
  if (m === null) return null;
  const p = m[1].split(/[,\s/]+/).filter((s) => s !== '').map(Number);
  return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
}

/** One translucent colour composited over an opaque one. */
export function over(fg, bg) {
  return [0, 1, 2].map((i) => Math.round(fg.rgb[i] * fg.a + bg[i] * (1 - fg.a)));
}

/**
 * Dead space either side of the DOCUMENT, as a percentage of the scroller.
 *
 * ONE DEFINITION, AND THE REVISION ROUND CHANGED WHICH. Research 113 §1
 * defines it as the scroller less the document box, and the first version of
 * this ruler subtracted the PAGE — rail, column, margin and the gaps between
 * them — so a track that holds nothing at rest counted as occupied and the
 * headline number moved by a change of definition rather than by a change of
 * design. Every reading published now subtracts the document box, which is
 * research 113's own; `pageDeadPercent` is kept beside it and printed beside
 * it, so the two are never confused again.
 */
export function deadPercent(scroller, docBox) {
  if (scroller <= 0) return 0;
  return ((scroller - docBox) / scroller) * 100;
}

/** The same arithmetic over the page's own tracks, printed as the second number. */
export function pageDeadPercent(scroller, pageWidth) {
  if (scroller <= 0) return 0;
  return ((scroller - pageWidth) / scroller) * 100;
}

/**
 * The gap between two vertically adjacent PAINTED boxes, and whether the pair
 * is two fragments of one run or two different marks. The seam is asked to be
 * invisible for the first and visible for the second, and this is what says
 * whether one number can do both.
 */
export function adjacentGaps(boxes) {
  const rows = boxes.slice().sort((a, b) => a.top - b.top || a.left - b.left);
  const out = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const a = rows[i];
      const b = rows[j];
      if (b.top < a.bottom - 0.5) continue;
      if (b.top - a.bottom > 12) continue;
      if (b.right <= a.left + 0.5 || b.left >= a.right - 0.5) continue;
      out.push({ gap: b.top - a.bottom, sameRun: a.mark === b.mark, sameKind: a.kind === b.kind });
    }
  }
  return out;
}

/**
 * Whether a set of fragments of ONE run reads as a continuous shape. The rule
 * is the gap: fragments whose painted boxes meet, or overlap, are continuous;
 * a band of unpainted ground between them is what draws a stack of tiles.
 */
export function continuous(rects, tol) {
  for (let i = 1; i < rects.length; i += 1) {
    if (rects[i].top - rects[i - 1].bottom > tol) return false;
  }
  return true;
}

if (process.argv.includes('--self-test')) {
  const eq = (got, want, what) => {
    const a = JSON.stringify(got);
    const b = JSON.stringify(want);
    if (a !== b) throw new Error(`${what}: got ${a}, wanted ${b}`);
    console.log(`  ok  ${what}`);
  };
  const near = (got, want, tol, what) => {
    if (Math.abs(got - want) > tol) throw new Error(`${what}: got ${got}, wanted ${want}`);
    console.log(`  ok  ${what} (${got.toFixed(3)})`);
  };
  console.log(`${TAG} self-test, launching nothing`);
  near(luminance([255, 255, 255]), 1, 1e-9, 'white luminance is 1');
  near(luminance([0, 0, 0]), 0, 1e-9, 'black luminance is 0');
  near(ratio([255, 255, 255], [0, 0, 0]), 21, 1e-9, 'white on black is 21:1');
  // The three the research document already published, recomputed here.
  near(ratio([0xc9, 0xca, 0xcd], [0x13, 0x14, 0x17]), 11.24, 0.02, '--text-primary on --bg-canvas is 11.24');
  near(ratio([0x83, 0x89, 0x96], [0x13, 0x14, 0x17]), 5.25, 0.02, '--text-muted on --bg-canvas is 5.25');
  near(ratio([0xe5, 0x65, 0x5e], [0x13, 0x14, 0x17]), 5.574, 0.02, '--error on --bg-canvas is 5.574');
  eq(parseColor('rgb(19, 20, 23)'), { rgb: [19, 20, 23], a: 1 }, 'parseColor reads rgb()');
  eq(parseColor('rgba(229, 101, 94, 0.12)'), { rgb: [229, 101, 94], a: 0.12 }, 'parseColor reads rgba()');
  eq(parseColor('none'), null, 'parseColor refuses a non-colour');
  eq(over({ rgb: [255, 255, 255], a: 1 }, [0, 0, 0]), [255, 255, 255], 'an opaque colour composites to itself');
  eq(over({ rgb: [0, 0, 0], a: 0 }, [10, 20, 30]), [10, 20, 30], 'a transparent colour composites to the ground');
  // --error-wash on --bg-canvas, which research 113 §7.4 read at 1.152:1.
  near(ratio(over({ rgb: [229, 101, 94], a: 0.12 }, [19, 20, 23]), [19, 20, 23]), 1.152, 0.01, 'the deletion wash on the canvas is 1.152');
  near(deadPercent(1339, 1339), 0, 1e-9, 'a document that fills the scroller is 0% dead');
  // Research 113 §1's own row, recomputed: the shipped 68ch DOCUMENT BOX in
  // the app's 1339px scroller.
  near(deadPercent(1339, 556.81), 58.42, 0.01, 'the shipped 68ch document is 58.42% dead');
  near(pageDeadPercent(1339, 580.81), 56.62, 0.01, 'the same reading over the page is 56.62%');
  eq(adjacentGaps([]), [], 'no boxes have no adjacent pairs');
  eq(
    adjacentGaps([
      { top: 0, bottom: 15, left: 0, right: 100, mark: 1, kind: 'del' },
      { top: 21.45, bottom: 36.45, left: 0, right: 100, mark: 1, kind: 'del' }
    ]).map((g) => ({ gap: Math.round(g.gap * 100) / 100, sameRun: g.sameRun, sameKind: g.sameKind })),
    [{ gap: 6.45, sameRun: true, sameKind: true }],
    'two fragments of one run are one adjacent pair'
  );
  eq(
    adjacentGaps([
      { top: 0, bottom: 15, left: 0, right: 100, mark: 1, kind: 'del' },
      { top: 21.45, bottom: 36.45, left: 400, right: 500, mark: 2, kind: 'ins' }
    ]),
    [],
    'boxes that do not overlap horizontally are not adjacent'
  );
  eq(continuous([{ top: 0, bottom: 15 }, { top: 21.45, bottom: 36.45 }], 0.5), false, '6.45px of band is not continuous');
  eq(continuous([{ top: 0, bottom: 21.45 }, { top: 21.45, bottom: 42.9 }], 0.5), true, 'meeting boxes are continuous');
  eq(continuous([{ top: 0, bottom: 19.45 }, { top: 21.45, bottom: 40.9 }], 2.5), true, 'a 2px seam still reads as continuous');
  eq(continuous([{ top: 0, bottom: 15 }], 0.5), true, 'one fragment is continuous');
  console.log(`${TAG} self-test: 24 graders ok`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// The run. ONE Electron, its own window, ended in a finally.
// ---------------------------------------------------------------------------
const root = mkdtempSync(join(tmpdir(), 'p249-mock-'));
const profile = join(root, 'profile');
mkdirSync(profile, { recursive: true });

// The entry: this run's own window and nothing of Tortie's. It is a package of
// its own inside the scratch directory, so `electron .` from there starts this
// file's five-line window and no product code at all.
const mainJs = join(root, 'main.cjs');
writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'p249-mock', version: '0.0.0', main: 'main.cjs' }));
writeFileSync(
  mainJs,
  `const { app, BrowserWindow } = require('electron');
app.whenReady().then(() => {
  const w = new BrowserWindow({ width: 1600, height: 1000, show: false, webPreferences: { sandbox: true } });
  w.loadFile(${JSON.stringify(join(HERE, 'mock-p249.html'))});
});
app.on('window-all-closed', () => app.quit());
`
);

const READ = `(() => {
  const pane = document.getElementById('pane');
  const doc = document.getElementById('doc');
  const page = document.getElementById('page');
  const scroll = document.getElementById('scroll');
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
  const cs = getComputedStyle(doc);
  const ch = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rl-ch'));
  const pad = parseFloat(cs.paddingLeft);
  const dbox = doc.getBoundingClientRect();
  const sbox = scroll.getBoundingClientRect();
  const pbox = page.getBoundingClientRect();
  const marks = Array.from(doc.querySelectorAll('del, ins'));
  const rectsOf = (el) => Array.from(el.getClientRects()).map((r) => ({ top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height, width: r.width }));
  // The widest mark, and every one of its fragments.
  let widest = null;
  for (const m of marks) { const r = rectsOf(m); if (widest === null || r.length > widest.rects.length) widest = { tag: m.tagName, text: m.textContent.slice(0, 40), rects: r, washed: getComputedStyle(m).backgroundColor }; }
  const lineRects = (() => { const r = document.createRange(); r.selectNodeContents(doc); return Array.from(r.getClientRects()); })();
  const lines = new Set(lineRects.map((r) => Math.round(((r.top + r.bottom) / 2) * 2) / 2));
  const edge = dbox.left + dbox.width - pad;
  let crossers = 0; let fragments = 0; let washed = 0;
  for (const m of marks) { const rr = rectsOf(m); fragments += rr.length; const paint = getComputedStyle(m).backgroundColor !== 'rgba(0, 0, 0, 0)'; if (paint) washed += 1; if (!paint) continue; for (const r of rr) if (r.right - edge > 0.5) crossers += 1; }
  const cur = doc.querySelector('.rl-change[data-current]');
  const chip = document.querySelector('.rl-chip');
  const cbox = box(chip);
  let covered = 0;
  if (cbox !== null) { const seen = new Set(); for (const r of lineRects) { if (r.bottom > cbox.top && r.top < cbox.bottom && r.right > cbox.left && r.left < cbox.right) seen.add(Math.round(((r.top + r.bottom) / 2) * 2) / 2); } covered = seen.size; }
  // FAULT 5 AS HE DESCRIBED IT: the rule is the table's own closing pipe.
  // Every '|' glyph is measured one character at a time through a Range, the
  // rightmost one on each drawn row is that row's rule, and a WASHED fragment
  // that ends past it is a crossing. The spread of those rightmost pipes is
  // the second reading: in a proportional face they do not line up at all, so
  // "the rule" is not a rule, which is half of why some marks cross it.
  const pipes = (() => {
    const walk = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT);
    const rows = new Map();
    for (let n = walk.nextNode(); n !== null; n = walk.nextNode()) {
      const t = n.nodeValue ?? '';
      for (let i = 0; i < t.length; i += 1) {
        if (t[i] !== '|') continue;
        const r = document.createRange();
        r.setStart(n, i);
        r.setEnd(n, i + 1);
        const b = r.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) continue;
        const key = Math.round(((b.top + b.bottom) / 2) * 2) / 2;
        const cur = rows.get(key);
        if (cur === undefined || b.right > cur) rows.set(key, b.right);
      }
    }
    return Array.from(rows.entries()).map(([line, right]) => ({ line, right }));
  })();
  let pipeCross = 0;
  for (const m of marks) {
    if (getComputedStyle(m).backgroundColor === 'rgba(0, 0, 0, 0)') continue;
    for (const r of rectsOf(m)) {
      const key = Math.round(((r.top + r.bottom) / 2) * 2) / 2;
      const rule = pipes.find((p) => Math.abs(p.line - key) < 1.5);
      if (rule !== undefined && r.right - rule.right > 0.5) pipeCross += 1;
    }
  }
  const pipeRights = Array.from(new Set(pipes.map((p) => Math.round(p.right * 100) / 100)));
  const railbar = document.getElementById('railbar');
  // THE RESTING BANDS EITHER SIDE OF HIS TEXT, which is the thing fault 1 is
  // actually about: he sees text stop with empty canvas to its right. The
  // first version of this design grew that band and measured only the page.
  const docLeftFree = dbox.left - sbox.left;
  const docRightFree = sbox.right - dbox.right;
  // FAULT 4'S OWN NUMBER, and the first version published no proposed
  // counterpart for it at all: research 113 measured 'Accept all' 355.32px
  // from the column's content edge and this is the same reading on the mock.
  const acceptEl = document.querySelector('.rl-bar-button');
  const acceptBox = box(acceptEl);
  const acceptGap = acceptBox === null ? null : (dbox.right - pad) - acceptBox.right;
  // Every painted box in the document, tagged with which mark it belongs to
  // and which kind that mark is, so the seam can be asked whether it separates
  // two DIFFERENT marks any differently from two fragments of ONE run.
  const paintedBoxes = [];
  marks.forEach((m, idx) => {
    if (getComputedStyle(m).backgroundColor === 'rgba(0, 0, 0, 0)') return;
    for (const r of rectsOf(m)) paintedBoxes.push({ top: r.top, bottom: r.bottom, left: r.left, right: r.right, mark: idx, kind: m.tagName });
  });
  // THE FONT BOX, measured rather than asserted. The --rl-fontbox constant is
  // fitted to -apple-system at 13px and CSS exposes no unit for it, so the
  // wash arithmetic rests on a number that a face substitution moves. Read two
  // ways: an unpadded inline's own client rect, and a one-character Range.
  const fontBox = (() => {
    const probeEl = document.createElement('span');
    probeEl.textContent = 'Hxy';
    probeEl.style.cssText = 'padding:0;margin:0;border:0;background:none';
    doc.appendChild(probeEl);
    const byRect = probeEl.getBoundingClientRect().height;
    const rr = document.createRange();
    rr.selectNodeContents(probeEl);
    const byRange = rr.getBoundingClientRect().height;
    probeEl.remove();
    return { byRect, byRange, declared: parseFloat(cs.fontSize) * 1.1539 };
  })();
  // THE LONE MARK: a change whose only content is whitespace. Under the first
  // version of this design it drew nothing at all. This reads whether it draws.
  const loneEl = doc.querySelector('[data-lone]');
  const lone = loneEl === null ? null : {
    rects: rectsOf(loneEl).length,
    width: rectsOf(loneEl).reduce((n, r) => n + r.width, 0),
    colour: getComputedStyle(loneEl).color,
    wash: getComputedStyle(loneEl).backgroundColor,
    before: (() => { const c = getComputedStyle(loneEl, '::before'); return { content: c.content, width: c.width, height: c.height, background: c.backgroundColor }; })()
  };
  // THE LEAVES, counted in the DOM rather than taken from the composer.
  const leaves = (() => {
    const walk = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT);
    let n = 0;
    for (let x = walk.nextNode(); x !== null; x = walk.nextNode()) n += 1;
    return { textNodes: n, elements: doc.querySelectorAll('*').length };
  })();
  const probe = marks.find((m) => getComputedStyle(m).backgroundColor !== 'rgba(0, 0, 0, 0)') ?? marks[0];
  const pr = probe ? rectsOf(probe)[0] : null;
  const pitch = parseFloat(cs.fontSize) * 1.65;
  const colours = {};
  const sample = (name, sel, prop) => { const el = document.querySelector(sel); if (!el) return; colours[name] = getComputedStyle(el)[prop]; };
  sample('canvas', '.rl-scroll', 'backgroundColor');
  sample('body', '.rl-doc', 'color');
  sample('del', '.rl-doc del', 'color');
  sample('delWash', '.rl-doc del', 'backgroundColor');
  sample('ins', '.rl-doc ins', 'color');
  sample('insWash', '.rl-doc ins', 'backgroundColor');
  sample('rail', '.rl-rail-bar', 'backgroundColor');
  sample('count', '.rl-count', 'color');
  sample('chipFill', '.rl-chip', 'backgroundColor');
  sample('chipText', '.rl-chip-button', 'color');
  sample('note', '.rl-note', 'color');
  const sepEl = doc.querySelector('[data-sep]');
  if (sepEl) { colours.sep = getComputedStyle(sepEl).color; colours.sepWash = getComputedStyle(sepEl).backgroundColor; }
  return {
    scroller: sbox.width,
    page: pbox.width,
    docBox: dbox.width,
    textColumn: dbox.width - pad * 2,
    characters: (dbox.width - pad * 2) / ch,
    docHeight: dbox.height,
    lineBoxes: lines.size,
    marks: marks.length,
    washed,
    fragments,
    crossers,
    pipeRows: pipes.length,
    pipeCross,
    pipeSpread: pipeRights.length <= 1 ? 0 : Math.max(...pipeRights) - Math.min(...pipeRights),
    pipeDistinct: pipeRights.length,
    widest,
    painted: pr === null ? 0 : pr.height,
    pitch,
    currentRects: cur === null ? 0 : cur.getClientRects().length,
    currentOutline: cur === null ? 'none' : getComputedStyle(cur).outlineStyle,
    railbar: railbar && !railbar.hidden ? box(railbar) : null,
    docLeftFree,
    docRightFree,
    acceptGap,
    acceptBox,
    paintedBoxes,
    fontBox,
    lone,
    leaves,
    chip: cbox,
    chipBand: window.P249_MOCK.band(),
    chipWidth: window.P249_MOCK.chipWidth(),
    chipCovers: covered,
    colours,
    stats: window.P249_MOCK.stats()
  };
})()`;

const CELLS = [];
for (const look of ['today', 'new']) {
  for (const scheme of ['dark', 'light']) {
    for (const width of [1349, 699, 319]) {
      for (const wash of look === 'today' ? ['tiles'] : ['tiles', 'ribbon', 'seam']) {
        CELLS.push({ look, scheme, width, wash });
      }
    }
  }
}

const out = { cells: [], ratios: [] };
try {
  await withElectron(
    {
      label: 'p249-mock',
      userDataDir: profile,
      tmuxSocket: null,
      cwd: root,
      args: ['--remote-debugging-port=0', '--use-mock-keychain'],
      env: withoutDevRenderer({ HOME: root }),
      ceilingMs: 8 * 60 * 1000
    },
    async () => {
      // Find the page target through the profile's own DevToolsActivePort.
      const { readFileSync } = await import('node:fs');
      let cdp = null;
      const started = Date.now();
      for (;;) {
        let port = 0;
        try { port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim()); } catch { port = 0; }
        if (port > 0) {
          let list = [];
          try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch { list = []; }
          for (const t of list) {
            if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
            const c = await wsConnect(t.webSocketDebuggerUrl, { collect: ['Runtime.exceptionThrown'] });
            const ok = await cdpEval(c, `typeof window.P249_MOCK === 'object' ? location.href : null`, 5000);
            if (typeof ok === 'string') { cdp = c; break; }
            c.close();
          }
        }
        if (cdp !== null) break;
        if (Date.now() - started > 60000) throw new Error('the mock never came up');
        await sleep(200);
      }
      await cdp.call('Runtime.enable');
      await cdp.call('Page.enable');
      await cdp.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      say('the mock is up');

      for (const cell of CELLS) {
        await cdpEval(cdp, `window.P249_MOCK.set(${JSON.stringify(cell)}), true`);
        await sleep(120);
        const r = await cdpEval(cdp, READ, 30000);
        out.cells.push({ ...cell, ...r });
        say(
          `${cell.look}/${cell.scheme}/${cell.width}/${cell.wash}  doc ${r.docBox.toFixed(1)}  ` +
            `dead ${deadPercent(r.scroller, r.docBox).toFixed(2)}% (tracks ${pageDeadPercent(r.scroller, r.page).toFixed(2)}%)  ` +
            `free ${r.docLeftFree.toFixed(1)}/${r.docRightFree.toFixed(1)}  h ${r.docHeight.toFixed(0)}  ` +
            `lines ${r.lineBoxes}  frags ${r.fragments}  washed ${r.washed}/${r.marks}  ` +
            `painted ${r.painted.toFixed(2)}/${r.pitch.toFixed(2)}  cross ${r.crossers}  ` +
            `chip ${r.chipCovers}${r.chipBand === undefined ? '' : ' band ' + r.chipBand.toFixed(1) + '/' + r.chipWidth.toFixed(1)}  ` +
            `accept ${r.acceptGap === null ? '-' : r.acceptGap.toFixed(1)}  ` +
            `leaves ${r.leaves.textNodes}/${r.leaves.elements}  lone ${r.lone === null ? '-' : r.lone.before.width}  ` +
            `mark ${r.railbar === null ? (r.currentOutline === 'none' ? 'NONE' : 'outline x' + String(r.currentRects)) : 'rail'}  ` +
            `pipe cross ${r.pipeCross}  widest ${r.widest === null ? 0 : r.widest.rects.length}` +
            `${continuous(r.widest?.rects ?? [], 2.5) ? ' CONTINUOUS' : ''}`
        );
      }

      // -----------------------------------------------------------------
      // §1.3'S OWN CLAIM, DRIVEN OVER EVERY CHANGE RATHER THAN OVER THE ONE
      // THAT HAPPENED TO BE CURRENT. The outlined-box count is a property of
      // the WIDEST change, and the first version of this ruler read change 0.
      // -----------------------------------------------------------------
      for (const cell of [
        { look: 'today', scheme: 'dark', width: 1349, wash: 'tiles' },
        { look: 'today', scheme: 'dark', width: 319, wash: 'tiles' },
        { look: 'new', scheme: 'dark', width: 1349, wash: 'seam' },
        { look: 'new', scheme: 'dark', width: 319, wash: 'seam' }
      ]) {
        await cdpEval(cdp, `window.P249_MOCK.set(${JSON.stringify(cell)}), true`);
        await sleep(120);
        const n = await cdpEval(cdp, `window.P249_MOCK.stats().changes`, 10000);
        let worstBoxes = 0;
        let bars = 0;
        for (let k = 0; k < n; k += 1) {
          await cdpEval(cdp, `window.P249_MOCK.set({ current: ${k} }), true`);
          const r = await cdpEval(
            cdp,
            `(() => {
              const cur = document.querySelector('.rl-change[data-current]');
              const bar = document.getElementById('railbar');
              const outlined = cur === null ? 0 : (getComputedStyle(cur).outlineStyle === 'none' ? 0 : cur.getClientRects().length);
              return { outlined, bar: bar && !bar.hidden ? 1 : 0 };
            })()`,
            10000
          );
          if (r.outlined > worstBoxes) worstBoxes = r.outlined;
          bars += r.bar;
        }
        out.currentMark = out.currentMark ?? [];
        out.currentMark.push({ ...cell, changes: n, worstOutlinedBoxes: worstBoxes, changesDrawingARailBar: bars });
        say(`current mark  ${cell.look}/${cell.width}: worst outlined boxes ${worstBoxes}, rail bars ${bars} of ${n} changes`);
        await cdpEval(cdp, `window.P249_MOCK.set({ current: 0 }), true`);
      }
      cdp.close();
    }
  );

  // -------------------------------------------------------------------------
  // Every ratio the proposal depends on, computed here from the colours the
  // live page resolved, on the ground each one really sits on.
  // -------------------------------------------------------------------------
  const PAIRS = [
    ['the deleted words on their own wash', 'del', 'delWash'],
    ['the deleted words on the plain canvas', 'del', null],
    ['the inserted words on their own wash', 'ins', 'insWash'],
    ['the inserted words on the plain canvas', 'ins', null],
    ['the separator row as furniture', 'sep', null],
    ['the change count in the bar', 'count', null],
    ['the note row', 'note', null],
    ['the rail bar (non-text, 3:1)', 'rail', null]
  ];
  for (const cell of out.cells) {
    if (cell.look !== 'new' || cell.width !== 1349 || cell.wash !== 'seam') continue;
    const canvas = parseColor(cell.colours.canvas);
    for (const [what, fg, washKey] of PAIRS) {
      const f = parseColor(cell.colours[fg]);
      if (f === null || canvas === null) continue;
      const ground = washKey === null
        ? canvas.rgb
        : over(parseColor(cell.colours[washKey]) ?? { rgb: canvas.rgb, a: 0 }, canvas.rgb);
      out.ratios.push({ base: cell.scheme, what, value: ratio(over(f, ground), ground) });
    }
    // The chip's own text on the chip's own fill.
    const chipFill = parseColor(cell.colours.chipFill);
    const chipText = parseColor(cell.colours.chipText);
    if (chipFill !== null && chipText !== null) {
      out.ratios.push({ base: cell.scheme, what: 'the chip label on the chip', value: ratio(over(chipText, chipFill.rgb), chipFill.rgb) });
    }
  }
  // -------------------------------------------------------------------------
  // THE SEAM, ASKED THE QUESTION IT WAS RECOMMENDED FOR. §1.2 said a hairline
  // keeps two different marks apart where Ribbon merges them. Inline padding
  // is uniform, so the same number falls between two fragments of ONE run,
  // which must read continuous. This reads both.
  // -------------------------------------------------------------------------
  console.log('');
  say('THE SEAM, over every vertically adjacent painted pair at 1349 on graphite:');
  for (const wash of ['tiles', 'seam', 'ribbon']) {
    const cell = out.cells.find((c) => c.look === 'new' && c.scheme === 'dark' && c.width === 1349 && c.wash === wash);
    if (cell === undefined) continue;
    const pairs = adjacentGaps(cell.paintedBoxes);
    const one = pairs.filter((p) => p.sameRun);
    const two = pairs.filter((p) => !p.sameRun);
    const lo = (list) => (list.length === 0 ? '-' : Math.min(...list.map((p) => p.gap)).toFixed(2));
    const hi = (list) => (list.length === 0 ? '-' : Math.max(...list.map((p) => p.gap)).toFixed(2));
    say(`  ${wash.padEnd(7)} ${String(pairs.length).padStart(3)} pairs  ` +
      `one run ${String(one.length).padStart(3)} (${lo(one)}..${hi(one)}px)  ` +
      `two marks ${String(two.length).padStart(3)} (${lo(two)}..${hi(two)}px)`);
  }
  console.log('');
  say('THE FONT BOX, measured against the constant the wash arithmetic uses:');
  {
    const cell = out.cells.find((c) => c.look === 'new' && c.scheme === 'dark' && c.width === 1349 && c.wash === 'seam');
    if (cell !== undefined) {
      say(`  by an unpadded inline's rect ${cell.fontBox.byRect.toFixed(2)}px  ` +
        `by a one-character Range ${cell.fontBox.byRange.toFixed(2)}px  ` +
        `declared by --rl-fontbox ${cell.fontBox.declared.toFixed(4)}px`);
    }
  }
  console.log('');
  say('THE RATIOS THIS DESIGN DEPENDS ON, computed from the live page:');
  for (const r of out.ratios) {
    const floor = r.what.includes('non-text') ? 3 : 4.5;
    say(`  ${r.base.padEnd(6)} ${r.what.padEnd(40)} ${r.value.toFixed(3)}  ${r.value >= floor ? 'ok' : 'UNDER ' + String(floor)}`);
  }
  writeFileSync(join(HERE, 'out-mock.json'), JSON.stringify(out, null, 2));
  say(`wrote build/p249/out-mock.json (${out.cells.length} cells, ${out.ratios.length} ratios)`);
} finally {
  rmSync(root, { recursive: true, force: true });
}
