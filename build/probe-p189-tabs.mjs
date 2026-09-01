#!/usr/bin/env node
/**
 * probe-p189-tabs.mjs. Does the row of project tabs stay readable when there
 * are too many of them (Phase 189)?
 *
 * ---------------------------------------------------------------------------
 * WHAT IT PROVES, AND WHY EACH PART IS HERE
 * ---------------------------------------------------------------------------
 * The operator reported twelve projects on the top row drawing `g…`, `d..`,
 * `h…`, `roo…`, `runs…`, `tortied…`, with only the active tab identifiable and
 * an orange `Greg's Ma` badge competing for the same squeezed space. The
 * parent measurement found two of his twelve tabs showed nothing that told
 * them from another open project, and that the ACTIVE tab drew
 * `extract-agen…en…`, two ellipses in one label.
 *
 * ONE app run drives the whole journey rather than a resting state, because a
 * row that is right only at mount is the defect five earlier phases shipped:
 *
 *   1. three window widths (1512, 1440, 960) at twelve tabs, reading every
 *      drawn label and every rectangle;
 *   2. a LIVE resize sweep through six widths, reading the row at each, so the
 *      row is seen keeping up rather than being right once;
 *   3. a project OPENED while narrow and CLOSED again while narrow;
 *   4. three project counts (12, 8, 2) at all three widths;
 *   5. the ⌘ digit chord onto a tab the row has scrolled away from, proving it
 *      still reaches and that the row brings it back into view;
 *   6. a pointer reorder whose landing gap starts OFF SCREEN, which is exactly
 *      where drag-to-reorder breaks in a scrolling container;
 *   7. a real wheel over the row, injected through the browser's own input
 *      pipeline rather than as a synthetic DOM event, because a synthetic
 *      wheel event does not scroll anything and would have proved nothing;
 *   8. the shipped machine badge element in a real tab, measured before and
 *      after, so "the badge must not be what squeezes the name" is a number.
 *
 * THE INDEPENDENT METHOD, and it is the one the phase named. At every reading
 * the floor is RE-DERIVED off the DOM: canvas measureText with the label's own
 * computed font, walking prefixes to find the longest that still fits with the
 * ellipsis in the measured name box, which is what the browser's own
 * text-overflow does. No width is taken from any component's belief and none
 * from the stylesheet. The drawn label the probe reports is the one that
 * measurement produces, and it is checked against the name element's own
 * scrollWidth and clientWidth, which is a second, independent witness that the
 * label is clipped at all.
 *
 * ---------------------------------------------------------------------------
 * SAFETY
 * ---------------------------------------------------------------------------
 *  1. It refuses to start when the tmux socket it would use is `gmux` or
 *     `default`. `npm run probe:p189` hands it a socket of its own through
 *     build/harness-socket.mjs.
 *  2. The one Electron goes through build/electron-run.mjs, on a scratch
 *     profile of its own, and that helper ends the whole process tree and the
 *     scratch tmux server in a `finally` block whatever this file did.
 *  3. It opens twelve EMPTY FIXTURE FOLDERS it makes itself, named after the
 *     operator's projects. It opens no repository of his, reads nothing under
 *     his home, spawns no agent, spends no token and makes no request.
 *
 * ---------------------------------------------------------------------------
 * THE ONE THING IT ASKS OF THE PRODUCT
 * ---------------------------------------------------------------------------
 * `window.__gmuxP189Open`, from src/renderer/app/p189-probe.ts, which lives in
 * the probe chunk a person's launch never loads. Opening a project is the one
 * step a probe cannot press, because the + opens a native folder picker and a
 * native picker takes an OS mouse grab. Everything else is pressed: the close
 * × and the confirm's own button are real clicks, the chord is the same
 * capture-phase keydown the shipped handler listens for, and the drag and the
 * wheel are injected as browser input.
 *
 *   node build/probe-p189-tabs.mjs --self-test   prove the graders on
 *                                                fixtures; launches nothing
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TAG = '[p189]';
const say = (line) => console.log(`${TAG} ${line}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The operator's own twelve. Nine come from `projects` in his manifest and
 * `dev` from `remote_projects`, all read from a copy, read only. `herdr` and
 * `rookery` are the two his screenshot shows that his manifest no longer
 * holds, and the Phase 189 entry names both of them.
 */
const NAMES = [
  'extract-agentic-engineering',
  'gmux',
  'test-prime-agent',
  'getspecstory',
  'runstory',
  'tortiedotsh',
  'deadreckon',
  'golden-storm-31-aug',
  'get-stats',
  'dev',
  'herdr',
  'rookery'
];

/** The thirteenth, opened while the window is narrow and then closed again. */
const LATE_NAME = 'opened-while-narrow';

/** The floor the shipped stylesheet states, in characters of a name. */
const READABLE_CHARS = 4;

// ---------------------------------------------------------------------------
// The graders. Pure, so --self-test can prove them without a window.
// ---------------------------------------------------------------------------

/**
 * Is one drawn label identifiable? Two answers and both have to hold:
 * the whole name is on screen, or at least `READABLE_CHARS` of it are; AND
 * what is on screen is not shared with another open project.
 *
 * The second half is what makes `h…` a failure rather than a lucky pass. It
 * identified `herdr` at the parent only because nothing else open began with
 * h, which is luck rather than design.
 */
export function gradeRow(row, allNames) {
  const whole = !row.clipped;
  const enough = whole || row.visibleChars >= READABLE_CHARS;
  const shown = whole ? row.name : row.name.slice(0, row.visibleChars);
  const shared = allNames.some(
    (other) => other !== row.name && other.startsWith(shown)
  );
  return {
    name: row.name,
    drawn: row.drawn,
    visibleChars: whole ? row.name.length : row.visibleChars,
    enough,
    unique: !shared,
    // The phase's own red line, quoted: one letter and an ellipsis.
    oneLetter: !whole && row.visibleChars <= 1,
    ok: enough && !shared
  };
}

/** Every failing row of one reading, as sentences. */
export function gradeReading(reading) {
  const names = reading.rows.map((r) => r.name);
  const graded = reading.rows.map((r) => gradeRow(r, names));
  const problems = [];
  for (const g of graded) {
    if (g.oneLetter) {
      problems.push(
        `${reading.label}: "${g.name}" drew ${JSON.stringify(g.drawn)}, one letter and an ellipsis`
      );
    } else if (!g.enough) {
      problems.push(
        `${reading.label}: "${g.name}" drew ${JSON.stringify(g.drawn)}, ${String(g.visibleChars)} character(s) and the floor is ${String(READABLE_CHARS)}`
      );
    } else if (!g.unique) {
      problems.push(
        `${reading.label}: "${g.name}" drew ${JSON.stringify(g.drawn)}, which another open project shares`
      );
    }
  }
  return { graded, problems };
}

// ---------------------------------------------------------------------------
// --self-test
// ---------------------------------------------------------------------------

if (process.argv.includes('--self-test')) {
  const fixtures = [
    {
      what: 'a whole short name passes',
      reading: { label: 'f1', rows: [{ name: 'dev', drawn: 'dev', clipped: false, visibleChars: 3 }] },
      want: 0
    },
    {
      what: 'one letter and an ellipsis fails',
      reading: { label: 'f2', rows: [{ name: 'gmux', drawn: 'g…', clipped: true, visibleChars: 1 }] },
      want: 1
    },
    {
      what: 'three characters is under the floor',
      reading: { label: 'f3', rows: [{ name: 'rookery', drawn: 'roo…', clipped: true, visibleChars: 3 }] },
      want: 1
    },
    {
      what: 'four characters passes when nothing shares them',
      reading: { label: 'f4', rows: [{ name: 'rookery', drawn: 'rook…', clipped: true, visibleChars: 4 }] },
      want: 0
    },
    {
      what: 'four characters two projects share fails',
      reading: {
        label: 'f5',
        rows: [
          { name: 'getspecstory', drawn: 'gets…', clipped: true, visibleChars: 4 },
          { name: 'getspecstory-two', drawn: 'gets…', clipped: true, visibleChars: 4 }
        ]
      },
      want: 2
    },
    {
      what: 'a bare ellipsis with no letter at all fails',
      reading: { label: 'f6', rows: [{ name: 'dev', drawn: '…', clipped: true, visibleChars: 0 }] },
      want: 1
    }
  ];
  let bad = 0;
  for (const f of fixtures) {
    const got = gradeReading(f.reading).problems.length;
    const ok = got === f.want;
    if (!ok) bad += 1;
    console.log(`${TAG} self-test ${ok ? 'ok  ' : 'FAIL'} ${f.what} (${String(got)} problem(s), wanted ${String(f.want)})`);
  }
  if (bad > 0) {
    console.error(`${TAG} self-test FAILED on ${String(bad)} fixture(s)`);
    process.exit(1);
  }
  console.log(`${TAG} self-test OK: ${String(fixtures.length)} fixtures, nothing launched`);
  process.exit(0);
}

// The three build/ modules this probe leans on are imported HERE rather than at
// the top, because build/cdp-target.mjs runs its own fixture proof at module
// load when the process was given `--self-test`, and that exits 0 before this
// file's own fixtures have run. A self-test that another module's self-test
// short-circuits is a self-test nobody has seen.
const { repoRoot, withElectron } = await import('./electron-run.mjs');
const { wsConnect, cdpEval } = await import('./cdp-client.mjs');
const { pickRendererTarget } = await import('./cdp-target.mjs');

// ---------------------------------------------------------------------------
// Refusals and the fixture
// ---------------------------------------------------------------------------

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '' || socket === 'gmux' || socket === 'default') {
  console.error(
    `${TAG} refusing: this probe needs a scratch tmux socket of its own and GMUX_TMUX_SOCKET is ${JSON.stringify(socket)}. Run it as npm run probe:p189.`
  );
  process.exit(2);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} out/main/index.js is missing; run npm run build`);
  process.exit(2);
}

const root =
  process.env['P189_ROOT'] ??
  process.env['GMUX_HARNESS_DIR'] ??
  mkdtempSync(join(tmpdir(), 'p189-'));
mkdirSync(root, { recursive: true });
const fixtureRoot = realpathSync(
  (() => {
    const dir = join(root, 'p189-projects');
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    return dir;
  })()
);
const paths = new Map();
for (const name of [...NAMES, LATE_NAME]) {
  const dir = join(fixtureRoot, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'README.md'), `# ${name}\n\nPhase 189 fixture folder.\n`, 'utf8');
  paths.set(name, dir);
}
const profile = join(root, 'p189-profile');

// ---------------------------------------------------------------------------
// The renderer side, installed once
// ---------------------------------------------------------------------------

const INSTALL = `
window.__p189 = (() => {
  const ELL = '\\u2026';
  let ctx = null;
  let font = '';
  const q = (s) => document.querySelector(s);
  const all = (s) => Array.from(document.querySelectorAll(s));
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: +r.left.toFixed(2), right: +r.right.toFixed(2), width: +r.width.toFixed(2) };
  };
  const font_of = (el) => {
    const cs = getComputedStyle(el);
    return cs.fontStyle + ' ' + cs.fontVariant + ' ' + cs.fontWeight + ' ' + cs.fontSize + '/' + cs.lineHeight + ' ' + cs.fontFamily;
  };
  const arm = () => {
    const el = q('.ptab-list .ptab-name');
    if (!el) return false;
    const f = font_of(el);
    if (ctx === null || f !== font) {
      font = f;
      ctx = document.createElement('canvas').getContext('2d');
      ctx.font = font;
    }
    return true;
  };
  const w = (s) => ctx.measureText(s).width;
  /** Longest prefix that still fits with the ellipsis: what text-overflow does. */
  const visibleUnder = (text, px) => {
    if (w(text) <= px + 0.5) return { drawn: text, clipped: false, chars: text.length };
    let best = '';
    for (let i = 1; i <= text.length; i++) {
      const cand = text.slice(0, i);
      if (w(cand + ELL) <= px) best = cand; else break;
    }
    return { drawn: best + ELL, clipped: true, chars: best.length };
  };
  return {
    font: () => font,
    ready: () => q('.ptab-list') !== null,
    /** Every name's own text widths, so a floor can be re-derived from them. */
    widths: () => {
      arm();
      const out = {};
      for (const el of all('.ptab-list .ptab-name')) {
        const n = el.textContent;
        out[n] = {
          whole: +w(n).toFixed(2),
          four: +(n.length <= 4 ? w(n) : w(n.slice(0, 4) + ELL)).toFixed(2),
          ellipsis: +w(ELL).toFixed(2)
        };
      }
      return out;
    },
    read: (label) => {
      arm();
      const list = q('.ptab-list');
      const wraps = all('.ptab-list .ptab-wrap');
      const rows = wraps.map((wrap) => {
        const btn = wrap.querySelector('.ptab');
        const nameEl = wrap.querySelector('.ptab-name');
        const name = nameEl ? nameEl.textContent : '';
        const avail = nameEl ? nameEl.clientWidth : 0;
        const vis = visibleUnder(name, avail);
        const tabBox = btn.getBoundingClientRect();
        const nameBox = nameEl.getBoundingClientRect();
        const badge = wrap.querySelector('.ptab-machine');
        return {
          name,
          projectId: wrap.dataset.projectId,
          selected: wrap.classList.contains('selected'),
          drawn: vis.drawn,
          clipped: vis.clipped,
          visibleChars: vis.chars,
          tabPx: +tabBox.width.toFixed(2),
          namePx: +nameBox.width.toFixed(2),
          nameClient: avail,
          nameScroll: nameEl ? nameEl.scrollWidth : 0,
          cssClipped: nameEl ? nameEl.scrollWidth > nameEl.clientWidth : false,
          chromePx: +(tabBox.width - nameBox.width - (badge ? badge.getBoundingClientRect().width + 4 : 0)).toFixed(2),
          badgePx: badge ? +badge.getBoundingClientRect().width.toFixed(2) : null,
          inView: list
            ? tabBox.left >= list.getBoundingClientRect().left - 0.5 &&
              tabBox.right <= list.getBoundingClientRect().right + 0.5
            : false
        };
      });
      const chevron = q('.ptab-overflow');
      return {
        label,
        windowWidth: window.innerWidth,
        tabCount: rows.length,
        list: list
          ? {
              box: box(list),
              scrollWidth: list.scrollWidth,
              clientWidth: list.clientWidth,
              scrollLeft: Math.round(list.scrollLeft),
              overflowing: list.scrollWidth > list.clientWidth + 1,
              appRegion: getComputedStyle(list).webkitAppRegion ?? getComputedStyle(list).getPropertyValue('-webkit-app-region')
            }
          : null,
        chevron: chevron === null ? null : { box: box(chevron), label: chevron.getAttribute('aria-label') },
        add: box(q('.ptab-add')),
        bell: box(q('.titlebar .bell')),
        band: {
          box: box(q('.titlebar')),
          appRegion: getComputedStyle(q('.titlebar')).webkitAppRegion ?? getComputedStyle(q('.titlebar')).getPropertyValue('-webkit-app-region')
        },
        rows
      };
    },
    /** Tab order as drawn, by name. */
    order: () => all('.ptab-list .ptab-wrap .ptab-name').map((el) => el.textContent),
    scrollTo: (x) => {
      const list = q('.ptab-list');
      if (list) list.scrollLeft = x;
      return list ? Math.round(list.scrollLeft) : null;
    },
    scrollLeft: () => {
      const list = q('.ptab-list');
      return list ? Math.round(list.scrollLeft) : null;
    },
    /** The centre of a tab in viewport coordinates, by index. */
    centreOf: (i) => {
      const wrap = all('.ptab-list .ptab-wrap')[i];
      if (!wrap) return null;
      const r = wrap.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), name: wrap.querySelector('.ptab-name').textContent };
    },
    listEdges: () => {
      const list = q('.ptab-list');
      if (!list) return null;
      const r = list.getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right), y: Math.round(r.top + r.height / 2) };
    },
    /** Where the insertion indicator is, and which gap it sits in. */
    indicator: () => {
      const el = q('.ptab-list .tab-indicator');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const items = all('.ptab-list .ptab-wrap').map((n) => {
        const b = n.getBoundingClientRect();
        return { name: n.querySelector('.ptab-name').textContent, left: +b.left.toFixed(2), right: +b.right.toFixed(2) };
      });
      let after = -1;
      for (let i = 0; i < items.length; i++) if (items[i].right <= r.left + 2) after = i;
      return {
        x: +r.left.toFixed(2),
        visible: r.left >= 0 && r.right <= window.innerWidth,
        after: after === -1 ? null : items[after].name,
        before: items[after + 1] ? items[after + 1].name : null
      };
    },
    /** The shipped ⌘<digit>, on the path ./keyboard.ts listens on. */
    chord: (digit) => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: String(digit), code: 'Digit' + digit, metaKey: true, bubbles: true
      }));
      return true;
    },
    activeName: () => {
      const el = q('.ptab-list .ptab-wrap.selected .ptab-name');
      return el ? el.textContent : null;
    },
    /** Close a project the way a person does: its own ×, then the confirm. */
    close: async (name) => {
      const wrap = all('.ptab-list .ptab-wrap').find(
        (n) => n.querySelector('.ptab-name').textContent === name
      );
      if (!wrap) return { ok: false, why: 'no such tab' };
      wrap.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      await new Promise((r) => setTimeout(r, 60));
      wrap.querySelector('.ptab-close').click();
      await new Promise((r) => setTimeout(r, 250));
      const buttons = Array.from(document.querySelectorAll('.modal button'));
      const confirm = buttons.find((b) => (b.textContent || '').trim() === 'Close project');
      if (!confirm) return { ok: false, why: 'no confirm dialog: ' + buttons.map((b) => b.textContent).join('|') };
      confirm.click();
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 100));
        const still = all('.ptab-list .ptab-name').some((el) => el.textContent === name);
        if (!still) return { ok: true, count: all('.ptab-list .ptab-wrap').length };
      }
      return { ok: false, why: 'the tab is still there' };
    },
    /**
     * The two marks a project tab can carry, put into a REAL tab with the
     * shipped elements and measured at the row's floor, which is the only
     * width at which "the badge must not be what squeezes the name" can fail.
     *
     * The mark list is any of 'machine' and 'attention'. The tab is read
     * before and after, and its own scrollWidth against its clientWidth says
     * whether the marks overflowed the tab and would be drawn over the close.
     */
    marks: async (name, marks) => {
      const wrap = all('.ptab-list .ptab-wrap').find(
        (n) => n.querySelector('.ptab-name').textContent === name
      );
      if (!wrap) return { ok: false, why: 'no such tab' };
      const tab = wrap.querySelector('.ptab');
      const nameEl = wrap.querySelector('.ptab-name');
      arm();
      const before = {
        tab: +tab.getBoundingClientRect().width.toFixed(2),
        name: +nameEl.getBoundingClientRect().width.toFixed(2),
        drawn: visibleUnder(name, nameEl.clientWidth)
      };
      const added = [];
      if (marks.includes('machine')) {
        const b = document.createElement('span');
        b.className = 'machine-badge ptab-machine';
        b.setAttribute('data-machine-color', 'orange');
        b.textContent = "Greg's Mac Pro";
        tab.insertBefore(b, nameEl.nextSibling);
        added.push(b);
      }
      if (marks.includes('attention')) {
        const a = document.createElement('span');
        a.className = 'badge-attention num';
        a.textContent = '12';
        tab.appendChild(a);
        added.push(a);
      }
      await new Promise((r) => setTimeout(r, 120));
      const machine = tab.querySelector('.ptab-machine');
      const attention = tab.querySelector('.badge-attention');
      const out = {
        ok: true,
        marks,
        machineMinWidth: machine ? getComputedStyle(machine).minWidth : null,
        machineMaxWidth: machine ? getComputedStyle(machine).maxWidth : null,
        machinePx: machine ? +machine.getBoundingClientRect().width.toFixed(2) : null,
        attentionPx: attention ? +attention.getBoundingClientRect().width.toFixed(2) : null,
        tabMinWidth: getComputedStyle(tab).minWidth,
        tabBefore: before.tab,
        tabAfter: +tab.getBoundingClientRect().width.toFixed(2),
        nameBefore: before.name,
        nameAfter: +nameEl.getBoundingClientRect().width.toFixed(2),
        drawnBefore: before.drawn.drawn,
        drawnAfter: visibleUnder(name, nameEl.clientWidth).drawn,
        charsAfter: visibleUnder(name, nameEl.clientWidth).chars,
        // With overflow visible, a tab whose marks do not fit reports a
        // scrollWidth past its client box, and that is a mark drawn on top of
        // the close ×.
        overflowPx: Math.max(0, tab.scrollWidth - tab.clientWidth)
      };
      for (const el of added) el.remove();
      await new Promise((r) => setTimeout(r, 80));
      return out;
    }
  };
})(); 'installed'`;

// ---------------------------------------------------------------------------
// The window
// ---------------------------------------------------------------------------

async function attach(timeoutMs) {
  const started = Date.now();
  for (;;) {
    try {
      const portFile = execFileSync('/bin/cat', [join(profile, 'DevToolsActivePort')], { encoding: 'utf8' });
      const port = Number(portFile.split('\n')[0].trim());
      if (Number.isFinite(port) && port > 0) {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        const picked = pickRendererTarget(list);
        if (picked.target !== null) {
          const ws = await wsConnect(picked.target.webSocketDebuggerUrl);
          say(`attached over the devtools protocol on port ${String(port)}`);
          return ws;
        }
      }
    } catch {
      /* not up yet */
    }
    if (Date.now() - started > timeoutMs) throw new Error('no devtools page target in time');
    await sleep(400);
  }
}

const ev = (cdp, expr) => cdpEval(cdp, `(async () => { ${expr} })()`, 120_000);

/**
 * One devtools call, THROWING when the protocol refuses.
 *
 * `cdp.call` resolves with the whole message, error and all, so a refusal
 * looks exactly like a success to a caller that only reads `.result`. That is
 * how a probe reports a step it never took.
 */
async function callOk(cdp, method, params, timeoutMs = 8_000) {
  const msg = await cdp.call(method, params, timeoutMs);
  if (msg?.error !== undefined) {
    throw new Error(`${method}: ${msg.error.message ?? JSON.stringify(msg.error)}`);
  }
  return msg?.result ?? {};
}

/** Resize the window for real when the browser allows it, and say which. */
async function makeResizer(cdp) {
  try {
    const { windowId } = await callOk(cdp, 'Browser.getWindowForTarget', {});
    await callOk(cdp, 'Browser.setWindowBounds', { windowId, bounds: { width: 1200, height: 900 } });
    await sleep(400);
    const inner = await cdpEval(cdp, 'window.innerWidth', 8_000);
    if (typeof inner !== 'number' || Math.abs(inner - 1200) > 40) {
      throw new Error(`the window reported ${String(inner)}px after a 1200px bounds call`);
    }
    say('resizing through Browser.setWindowBounds, which moves the real window');
    return {
      how: 'Browser.setWindowBounds',
      async set(width, height = 900) {
        await callOk(cdp, 'Browser.setWindowBounds', { windowId, bounds: { width, height } });
        await sleep(400);
      }
    };
  } catch (err) {
    say(`Browser.setWindowBounds refused (${String(err && err.message)}); using Emulation.setDeviceMetricsOverride, which resizes the viewport and fires the same resize`);
    return {
      how: 'Emulation.setDeviceMetricsOverride',
      async set(width, height = 900) {
        await callOk(cdp, 'Emulation.setDeviceMetricsOverride', {
          width,
          height,
          deviceScaleFactor: 0,
          mobile: false
        });
        await sleep(400);
        const inner = await cdpEval(cdp, 'window.innerWidth', 8_000);
        if (typeof inner !== 'number' || Math.abs(inner - width) > 2) {
          throw new Error(`asked for ${String(width)}px and the window reports ${String(inner)}px`);
        }
      }
    };
  }
}

/** One trusted wheel over a point, through the browser's own input pipeline. */
async function wheel(cdp, x, y, deltaX) {
  await callOk(cdp, 'Input.dispatchMouseEvent', {
    type: 'mouseWheel',
    x,
    y,
    deltaX,
    deltaY: 0,
    button: 'none',
    clickCount: 0,
    modifiers: 0
  });
  await sleep(250);
}

/** A trusted pointer drag along the row, through the same pipeline. */
async function dragAlong(cdp, from, to, y, steps) {
  await callOk(cdp, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: from, y, button: 'left', buttons: 1, clickCount: 1 });
  await sleep(40);
  for (let i = 1; i <= steps; i++) {
    const x = Math.round(from + ((to - from) * i) / steps);
    await callOk(cdp, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 });
    await sleep(45);
  }
  return {
    async release(x) {
      await callOk(cdp, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 });
      await sleep(40);
      await callOk(cdp, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
      await sleep(300);
    }
  };
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const readings = [];
const problems = [];
const notes = [];

async function readAt(cdp, label) {
  const reading = await ev(cdp, `return window.__p189.read(${JSON.stringify(label)});`);
  const { graded, problems: found } = gradeReading(reading);
  reading.graded = graded;
  readings.push(reading);
  problems.push(...found);
  const shortest = graded.reduce(
    (a, g) => (g.visibleChars < a ? g.visibleChars : a),
    Number.POSITIVE_INFINITY
  );
  say(
    `${label}: ${String(reading.tabCount)} tabs at ${String(reading.windowWidth)}px, ` +
      `${reading.list?.overflowing ? 'scrolling' : 'all on screen'}, chevron ${reading.chevron === null ? 'absent' : 'present'}, ` +
      `shortest drawn label ${String(shortest)} character(s), ` +
      `${String(found.length)} unreadable`
  );
  return reading;
}

async function main() {
  say(`fixture folders under ${fixtureRoot}`);
  await withElectron(
    {
      label: 'p189',
      userDataDir: profile,
      cwd: repoRoot,
      tmuxSocket: socket,
      args: ['--remote-debugging-port=0', '--use-mock-keychain'],
      env: {
        ...process.env,
        GMUX_TMUX_SOCKET: socket,
        // A harness launch that ARMS the probe chunk and runs the app
        // normally: no capture, no quit-after-drive, no updater rehearsal.
        GMUX_PROBES: '1',
        GMUX_SPECSTORY_NO_CLOUD: '1'
      }
    },
    async (handle) => {
      say(`launched the app, pid ${String(handle.child.pid)}`);
      const cdp = await attach(120_000);
      try {
        await drive(cdp);
      } finally {
        cdp.close();
      }
    }
  );
}

async function drive(cdp) {
  // --- wait for the shell and the probe chunk -----------------------------
  const deadline = Date.now() + 120_000;
  for (;;) {
    const there = await ev(cdp, 'return typeof window.__gmuxP189Open === "function" && document.querySelector(".titlebar") !== null;');
    if (there === true) break;
    if (Date.now() > deadline) throw new Error('the shell and the probe chunk never arrived');
    await sleep(400);
  }
  await cdpEval(cdp, INSTALL, 20_000);
  const resize = await makeResizer(cdp);

  // --- twelve tabs, his own names -----------------------------------------
  for (const name of NAMES) {
    const out = await ev(cdp, `return await window.__gmuxP189Open(${JSON.stringify(paths.get(name))});`);
    if (!out.names.includes(name)) throw new Error(`opening ${name} did not put a tab on the row: ${JSON.stringify(out.names)}`);
  }
  await sleep(800);
  // The first project stays the active one, as his screenshot had it: the
  // longest name of the twelve, which is the tab that drew two ellipses at
  // the parent.
  await ev(cdp, `return window.__p189.chord(1);`);
  await sleep(300);

  // --- the floor, re-derived off the DOM ----------------------------------
  await resize.set(1512);
  const widths = await ev(cdp, 'return window.__p189.widths();');
  const font = await ev(cdp, 'return window.__p189.font();');
  const fourNeeds = Object.entries(widths)
    .map(([name, w]) => ({ name, four: w.four }))
    .sort((a, b) => b.four - a.four);
  const measuredFloor = fourNeeds[0];
  say(`the label's own computed font is ${font}`);
  say(
    `the floor, re-derived off the DOM: the first ${String(READABLE_CHARS)} characters of every one of his names need ` +
      `${measuredFloor.four.toFixed(2)}px of name box, set by "${measuredFloor.name}". The stylesheet declares 46px.`
  );
  if (measuredFloor.four > 46) {
    problems.push(
      `the shipped 46px floor is under the measured ${measuredFloor.four.toFixed(2)}px that "${measuredFloor.name}" needs for ${String(READABLE_CHARS)} characters`
    );
  }

  // --- 1. three widths at twelve tabs -------------------------------------
  await readAt(cdp, '12 tabs @ 1512');
  await resize.set(1440);
  await readAt(cdp, '12 tabs @ 1440');
  await resize.set(960);
  await readAt(cdp, '12 tabs @ 960');

  // --- 2. a live resize sweep ---------------------------------------------
  const sweep = [];
  for (const width of [960, 1100, 1240, 1380, 1512, 1024]) {
    await resize.set(width);
    const r = await ev(cdp, `return window.__p189.read("sweep ${String(width)}");`);
    const { problems: found } = gradeReading(r);
    problems.push(...found.map((p) => `live resize ${p}`));
    sweep.push({
      width: r.windowWidth,
      listPx: r.list?.box.width ?? 0,
      scrolling: r.list?.overflowing ?? false,
      chevron: r.chevron !== null,
      narrowestTabPx: Math.min(...r.rows.map((x) => x.tabPx)),
      unreadable: found.length
    });
  }
  say(`live resize sweep: ${sweep.map((s) => `${String(s.width)}px → ${s.scrolling ? 'scrolls' : 'fits'}, narrowest tab ${s.narrowestTab ?? s.narrowestTabPx}px, ${String(s.unreadable)} unreadable`).join('; ')}`);

  // --- 3. open and close while narrow -------------------------------------
  await resize.set(960);
  const opened = await ev(cdp, `return await window.__gmuxP189Open(${JSON.stringify(paths.get(LATE_NAME))});`);
  await sleep(500);
  const afterOpen = await readAt(cdp, `${String(opened.count)} tabs @ 960 (one opened while narrow)`);
  const openedRow = afterOpen.rows.find((r) => r.name === LATE_NAME);
  notes.push(
    `opened while narrow: the row went to ${String(afterOpen.tabCount)} tabs, ` +
      `${afterOpen.list?.overflowing ? 'kept scrolling' : 'still fits'}, and the new tab is ` +
      `${openedRow?.inView ? 'on screen' : 'off screen'} drawing ${JSON.stringify(openedRow?.drawn)}`
  );
  const closedLate = await ev(cdp, `return await window.__p189.close(${JSON.stringify(LATE_NAME)});`);
  if (closedLate.ok !== true) problems.push(`closing "${LATE_NAME}" while narrow failed: ${String(closedLate.why)}`);
  await sleep(400);
  await readAt(cdp, '12 tabs @ 960 (after the close)');

  // --- 5. the chord onto a tab the row has scrolled away from -------------
  await ev(cdp, 'return window.__p189.scrollTo(0);');
  await sleep(200);
  const beforeChord = await ev(cdp, 'return window.__p189.read("before the chord");');
  const lastRow = beforeChord.rows[beforeChord.rows.length - 1];
  await ev(cdp, 'return window.__p189.chord(9);');
  await sleep(500);
  const afterChord = await ev(cdp, 'return window.__p189.read("after the chord");');
  const lastAfter = afterChord.rows[afterChord.rows.length - 1];
  const chordProof = {
    digit: 9,
    reached: lastAfter.selected,
    tabName: lastAfter.name,
    inViewBefore: lastRow.inView,
    inViewAfter: lastAfter.inView,
    scrollLeftBefore: beforeChord.list.scrollLeft,
    scrollLeftAfter: afterChord.list.scrollLeft
  };
  if (!chordProof.reached) problems.push('⌘9 did not select the last tab');
  if (chordProof.inViewBefore) notes.push('note: the last tab was already on screen before ⌘9, so the reveal was not exercised by this press');
  if (!chordProof.inViewAfter) problems.push('⌘9 selected the last tab and the row did not bring it into view');
  say(
    `⌘9 → "${chordProof.tabName}", on screen before: ${String(chordProof.inViewBefore)}, after: ${String(chordProof.inViewAfter)}, ` +
      `scrollLeft ${String(chordProof.scrollLeftBefore)} → ${String(chordProof.scrollLeftAfter)}`
  );
  // ⌘1 back to the first, which is also scrolled away now.
  await ev(cdp, 'return window.__p189.chord(1);');
  await sleep(500);
  const afterFirst = await ev(cdp, 'return window.__p189.read("after ⌘1");');
  const firstRow = afterFirst.rows[0];
  chordProof.firstReached = firstRow.selected;
  chordProof.firstInView = firstRow.inView;
  chordProof.firstScrollLeft = afterFirst.list.scrollLeft;
  if (!firstRow.selected) problems.push('⌘1 did not select the first tab');
  if (!firstRow.inView) problems.push('⌘1 selected the first tab and the row did not bring it into view');
  say(`⌘1 → "${firstRow.name}", on screen: ${String(firstRow.inView)}, scrollLeft ${String(afterFirst.list.scrollLeft)}`);

  // --- 7. a real wheel over the row ---------------------------------------
  await ev(cdp, 'return window.__p189.scrollTo(0);');
  await sleep(150);
  const edges = await ev(cdp, 'return window.__p189.listEdges();');
  const wheelBefore = await ev(cdp, 'return window.__p189.scrollLeft();');
  await wheel(cdp, Math.round((edges.left + edges.right) / 2), edges.y, 240);
  const wheelAfter = await ev(cdp, 'return window.__p189.scrollLeft();');
  const bandRegion = (await ev(cdp, 'return window.__p189.read("regions");')).band.appRegion;
  const listRegion = (await ev(cdp, 'return window.__p189.read("regions");')).list.appRegion;
  const wheelProof = { before: wheelBefore, after: wheelAfter, moved: wheelAfter > wheelBefore, bandRegion, listRegion };
  if (!wheelProof.moved) problems.push(`a wheel over the row did not scroll it (scrollLeft stayed ${String(wheelBefore)})`);
  say(`wheel over the row: scrollLeft ${String(wheelBefore)} → ${String(wheelAfter)}; the band is app-region ${String(bandRegion)} and the list is ${String(listRegion)}`);

  // --- 6. pointer reorder onto a landing gap that starts off screen -------
  await ev(cdp, 'return window.__p189.scrollTo(0);');
  await sleep(200);
  const orderBefore = await ev(cdp, 'return window.__p189.order();');
  const grabbed = await ev(cdp, 'return window.__p189.centreOf(0);');
  const dragEdges = await ev(cdp, 'return window.__p189.listEdges();');
  const scrollBeforeDrag = await ev(cdp, 'return window.__p189.scrollLeft();');
  const drag = await dragAlong(cdp, grabbed.x, dragEdges.right - 8, dragEdges.y, 8);
  // Sit at the right edge so the edge auto-scroll runs and carries the row
  // to a landing gap that was off screen when the press started.
  let indicator = null;
  for (let i = 0; i < 14; i++) {
    await callOk(cdp, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x: dragEdges.right - 8, y: dragEdges.y, button: 'left', buttons: 1 });
    await sleep(60);
    indicator = await ev(cdp, 'return window.__p189.indicator();');
  }
  const scrollMidDrag = await ev(cdp, 'return window.__p189.scrollLeft();');
  await drag.release(dragEdges.right - 8);
  await sleep(500);
  const orderAfter = await ev(cdp, 'return window.__p189.order();');
  const dragProof = {
    grabbed: grabbed.name,
    scrollBefore: scrollBeforeDrag,
    scrollMidDrag,
    autoScrolled: scrollMidDrag > scrollBeforeDrag,
    indicator,
    orderBefore,
    orderAfter,
    moved: orderBefore.join('|') !== orderAfter.join('|'),
    landedLast: orderAfter[orderAfter.length - 1] === grabbed.name
  };
  if (!dragProof.autoScrolled) problems.push(`the drag reached the row's right edge and the row did not auto-scroll (scrollLeft stayed ${String(scrollBeforeDrag)})`);
  if (!dragProof.moved) problems.push(`the pointer drag of "${grabbed.name}" changed no order`);
  if (indicator !== null && indicator.visible !== true) problems.push('the insertion indicator was drawn outside the window while the row was scrolled');
  say(
    `pointer reorder: grabbed "${grabbed.name}", scrollLeft ${String(scrollBeforeDrag)} → ${String(scrollMidDrag)} while dragging, ` +
      `indicator between ${JSON.stringify(indicator?.after)} and ${JSON.stringify(indicator?.before)}, order ${dragProof.moved ? 'changed' : 'unchanged'}, ` +
      `it landed ${dragProof.landedLast ? 'last' : `at index ${String(orderAfter.indexOf(grabbed.name))}`}`
  );

  // --- 8. the two marks in a real tab, at the row's floor -----------------
  // 960 with twelve tabs is the only width at which every tab is AT its floor,
  // which is the only place "the badge must not be what squeezes the name" can
  // fail. A mark is put into a real tab with the shipped element.
  await resize.set(960);
  await sleep(300);
  const marks = {};
  for (const set of [['machine'], ['attention'], ['machine', 'attention']]) {
    const key = set.join('+');
    const m = await ev(cdp, `return await window.__p189.marks("deadreckon", ${JSON.stringify(set)});`);
    marks[key] = m;
    if (m.ok !== true) {
      problems.push(`the ${key} mark measurement failed: ${String(m.why)}`);
      continue;
    }
    if (m.nameAfter < m.nameBefore - 0.5) {
      problems.push(
        `the ${key} mark took ${(m.nameBefore - m.nameAfter).toFixed(2)}px from the name (${m.nameBefore.toFixed(2)} → ${m.nameAfter.toFixed(2)}) at the row's floor`
      );
    }
    if (m.charsAfter < READABLE_CHARS) {
      problems.push(`with the ${key} mark the name drew ${String(m.charsAfter)} character(s): ${JSON.stringify(m.drawnAfter)}`);
    }
    if (m.overflowPx > 0.5) {
      problems.push(`the ${key} mark overflowed its tab by ${m.overflowPx.toFixed(2)}px, so it is drawn over the close ×`);
    }
    say(
      `${key} at the floor: the tab's own min-width became ${m.tabMinWidth} and it grew ${m.tabBefore.toFixed(2)} → ${m.tabAfter.toFixed(2)}; ` +
        `the name stayed ${m.nameBefore.toFixed(2)} → ${m.nameAfter.toFixed(2)} drawing ${JSON.stringify(m.drawnAfter)}; ` +
        `machine badge ${m.machinePx === null ? 'absent' : `${m.machinePx.toFixed(2)}px (min ${m.machineMinWidth}, max ${m.machineMaxWidth})`}, ` +
        `amber count ${m.attentionPx === null ? 'absent' : `${m.attentionPx.toFixed(2)}px`}, overflow ${m.overflowPx.toFixed(2)}px`
    );
  }

  // --- 4. three project counts at three widths ----------------------------
  for (const name of ['rookery', 'herdr', 'dev', 'get-stats']) {
    const out = await ev(cdp, `return await window.__p189.close(${JSON.stringify(name)});`);
    if (out.ok !== true) problems.push(`closing "${name}" failed: ${String(out.why)}`);
  }
  await sleep(400);
  await readAt(cdp, '8 tabs @ 960');
  await resize.set(1440);
  await readAt(cdp, '8 tabs @ 1440');
  await resize.set(1512);
  await readAt(cdp, '8 tabs @ 1512');

  for (const name of ['golden-storm-31-aug', 'deadreckon', 'tortiedotsh', 'runstory', 'getspecstory', 'test-prime-agent']) {
    const out = await ev(cdp, `return await window.__p189.close(${JSON.stringify(name)});`);
    if (out.ok !== true) problems.push(`closing "${name}" failed: ${String(out.why)}`);
  }
  await sleep(400);
  await readAt(cdp, '2 tabs @ 1512');
  await resize.set(1440);
  await readAt(cdp, '2 tabs @ 1440');
  await resize.set(960);
  await readAt(cdp, '2 tabs @ 960');

  // --- the record ---------------------------------------------------------
  const report = {
    font,
    measuredFourCharFloor: measuredFloor,
    perName: widths,
    resizedBy: resize.how,
    sweep,
    chord: chordProof,
    wheel: wheelProof,
    drag: dragProof,
    marks,
    notes,
    problems,
    readings
  };
  const out = join(root, 'p189-head-report.json');
  writeFileSync(out, JSON.stringify(report, null, 2), 'utf8');
  say(`the whole record is ${out}`);

  console.log('');
  console.log(`${TAG} HEAD TABLE`);
  for (const r of readings) {
    const worst = r.graded.reduce((a, g) => (g.visibleChars < a.visibleChars ? g : a), r.graded[0]);
    console.log(
      `${TAG}   ${r.label.padEnd(42)} ${String(r.tabCount).padStart(2)} tabs  ${String(r.windowWidth).padStart(4)}px  ` +
        `${r.list?.overflowing ? 'scrolls' : 'fits   '}  chevron ${r.chevron === null ? 'no ' : 'yes'}  ` +
        `narrowest tab ${String(Math.min(...r.rows.map((x) => x.tabPx)).toFixed(1)).padStart(6)}px  ` +
        `shortest label "${worst.drawn}" (${String(worst.visibleChars)} chars)  unreadable ${String(r.graded.filter((g) => !g.ok).length)}`
    );
  }
  console.log('');
  for (const n of notes) console.log(`${TAG} note: ${n}`);
  if (problems.length > 0) {
    console.error(`${TAG} FAIL: ${String(problems.length)} problem(s)`);
    for (const p of problems) console.error(`${TAG}   - ${p}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `${TAG} OK: ${String(readings.length)} readings across ${String(new Set(readings.map((r) => r.windowWidth)).size)} widths and ` +
      `${String(new Set(readings.map((r) => r.tabCount)).size)} project counts, every drawn label at least ${String(READABLE_CHARS)} characters and ` +
      `unique among the open projects, the chord reaches a scrolled-out tab, the drag auto-scrolls to its landing gap, ` +
      `a wheel scrolls the row and the machine badge takes nothing from the name`
  );
}

await main();
