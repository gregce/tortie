#!/usr/bin/env node
/**
 * Phase 205 — the terminal behaves like a terminal, driven in ONE app run.
 *
 * The three defects the operator reported on 2026-09-02, each with its own
 * must-not-change arms, over one real session on a scratch profile and the
 * scratch tmux socket `gmux-p205`. Everything is launched through
 * `build/electron-run.mjs`, so the Electron and the scratch session server are
 * ended in a `finally` block whatever happens, and the socket is removed.
 *
 * WHAT IT READS, AND HOW.
 *
 *   item 1  the scroll position across a blur and a focus, and every byte the
 *           pane sent while that happened
 *   item 2  the glyph on every row of the COMPOSED session menu, matched by
 *           rasterising each name in the closed set and comparing pixels
 *   item 3  the selection after a drag held at the top edge, after a wheel
 *           during a live drag, after a plain scroll with no drag, and after
 *           a click
 *
 * THE READING TECHNIQUE, and it is the one thing to copy from here. The
 * preload bridge is frozen and its window property is not configurable, so
 * nothing can be put in front of it and the Phase 153 trick of swapping the
 * bridge no longer works. Three LOGPOINTS are set in the SHIPPED renderer
 * bundle over the devtools protocol instead, being breakpoints whose
 * condition records a value and evaluates to false, so nothing ever pauses
 * and the code under test is the code that ships.
 *
 * SAFETY. `-L gmux` appears once, in a read only session count taken before
 * and after. The system pasteboard is never touched: the native menu is
 * answered by main under GMUX_SHOT_POPUP_PICK with a label no row carries, so
 * every popup resolves as dismissed and no menu item ever runs. Nothing under
 * the person's home is written.
 *
 * `node build/probe-p205-terminal.mjs --self-test` proves the graders on
 * fixtures and launches nothing at all.
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOCKET = 'gmux-p205';
const TAG = '[p205]';
const t0 = Date.now();
const say = (line) =>
  console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1)}s ${line}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// The graders. Pure, so --self-test can fail them on fixtures.
// ---------------------------------------------------------------------------

/**
 * Item 1. The reader's place survives a blur and a focus, a pane already at
 * the live bottom stays there, and Enter still returns a scrolled pane.
 */
export function gradeItem1(r) {
  const bad = [];
  if (!(r.beforeBlur?.position > 0)) {
    bad.push(`the pane was never scrolled: ${String(r.beforeBlur?.position)}`);
  }
  if (r.afterBlur?.position !== r.beforeBlur?.position) {
    bad.push(
      `blur moved the reader from ${String(r.beforeBlur?.position)} to ` +
        `${String(r.afterBlur?.position)}`
    );
  }
  if (r.afterFocus?.position !== r.beforeBlur?.position) {
    bad.push(
      `focus moved the reader from ${String(r.beforeBlur?.position)} to ` +
        `${String(r.afterFocus?.position)}`
    );
  }
  if (r.afterBlur?.inMode !== true || r.afterFocus?.inMode !== true) {
    bad.push('the pane left copy mode across the window focus change');
  }
  const reports = [
    ...(r.blurReports ?? []).map((b) => b.data),
    ...(r.focusReports ?? []).map((b) => b.data)
  ];
  if (reports.length !== 2) {
    bad.push(
      `the two focus reports were not forwarded: ${JSON.stringify(reports)}`
    );
  }
  if ((r.blurBytes ?? []).length !== 0 || (r.focusBytes ?? []).length !== 0) {
    bad.push('a focus report was treated as a keystroke');
  }
  if (r.liveBottom?.state?.position !== 0) {
    bad.push(
      `a pane at the live bottom moved to ${String(r.liveBottom?.state?.position)}`
    );
  }
  if (!(r.beforeEnter?.position > 0) || r.afterEnter?.position !== 0) {
    bad.push(
      `Enter took ${String(r.beforeEnter?.position)} to ` +
        `${String(r.afterEnter?.position)} rather than to 0`
    );
  }
  return bad;
}

/** Item 2. Every capture row, and the glyph the composed menu gave it. */
export function gradeItem2(r) {
  const bad = [];
  const rows = (r.rows ?? []).filter((row) => row.type !== 'separator');
  const named = (label) => rows.find((row) => row.label === label) ?? null;
  for (const label of [
    'Capture Screen',
    'Capture Selection',
    'Capture Last 250 Lines',
    'Capture Last 1,000 Lines'
  ]) {
    const row = named(label);
    if (row === null) {
      bad.push(`the menu drew no row labelled ${label}`);
      continue;
    }
    if (row.glyph === null || row.glyph === 'UNKNOWN') {
      bad.push(`${label} wears a glyph the closed set does not name`);
    }
  }
  // Every row that puts an image on the clipboard wears the one camera, and
  // the two rows that put TEXT there wear their own marks. Phase 205 measured
  // the entry's premise false: all four capture rows end at `bridge.image`.
  for (const label of [
    'Capture Screen',
    'Capture Selection',
    'Capture Last 250 Lines',
    'Capture Last 1,000 Lines'
  ]) {
    const row = named(label);
    if (row !== null && row.glyph !== 'device-camera') {
      bad.push(`${label} wears ${String(row.glyph)} rather than device-camera`);
    }
  }
  if (named('Copy')?.glyph !== 'copy') bad.push('Copy lost its own mark');
  if (named('Copy as HTML')?.glyph !== 'code') {
    bad.push('Copy as HTML lost its own mark');
  }
  return bad;
}

/**
 * Item 3. A drag held at the edge scrolls the history and keeps extending, a
 * wheel during a drag extends rather than dropping the selection, a plain
 * scroll with no drag changes no selection, and a click still clears one.
 */
export function gradeItem3(r) {
  const bad = [];
  const edge = r.edgeHold ?? {};
  if (!(edge.positionAfterHolding > edge.positionWhenTheEdgeWasReached)) {
    bad.push(
      `holding at the top edge left the history at ` +
        `${String(edge.positionWhenTheEdgeWasReached)} -> ` +
        `${String(edge.positionAfterHolding)}`
    );
  }
  if (!(edge.selection?.lines > edge.selectionAtTheEdge?.lines)) {
    bad.push(
      `the selection did not grow at the edge: ` +
        `${String(edge.selectionAtTheEdge?.lines)} -> ` +
        `${String(edge.selection?.lines)} lines`
    );
  }
  const wheel = r.wheelDuringDrag ?? {};
  if (!(wheel.positionAfterTheWheel > 0)) {
    bad.push('the wheel during the drag scrolled nothing');
  }
  if (!(wheel.selection?.lines > 1)) {
    bad.push(
      `the wheel during the drag left ${String(wheel.selection?.lines)} lines`
    );
  }
  // The rows that came into view are IN the selection: its last line is text
  // from further back than the line the drag started on.
  if (wheel.selection?.reachedNewRows !== true) {
    bad.push('the selection did not cover the rows that came into view');
  }
  const plain = r.plainScroll ?? {};
  if (plain.before?.lines !== plain.after?.lines || !(plain.after?.lines > 0)) {
    bad.push(
      `a plain scroll with no drag changed the selection from ` +
        `${String(plain.before?.lines)} to ${String(plain.after?.lines)} lines`
    );
  }
  const click = r.clickClears ?? {};
  if (!(click.before?.lines > 0) || click.after?.lines !== 0) {
    bad.push(
      `a click left ${String(click.after?.lines)} lines selected rather than 0`
    );
  }
  return bad;
}

// ---------------------------------------------------------------------------
// --self-test: the graders, on fixtures, with no app at all.
// ---------------------------------------------------------------------------

function selfTest() {
  const good1 = {
    blurReports: [{ data: 'OUT' }],
    focusReports: [{ data: 'IN' }],
    blurBytes: [],
    focusBytes: [],
    beforeBlur: { position: 64, inMode: true },
    afterBlur: { position: 64, inMode: true },
    afterFocus: { position: 64, inMode: true },
    liveBottom: { state: { position: 0 } },
    beforeEnter: { position: 65 },
    afterEnter: { position: 0 }
  };
  const good2 = {
    rows: [
      { label: 'Copy', glyph: 'copy' },
      { label: 'Copy as HTML', glyph: 'code' },
      { label: 'Capture Screen', glyph: 'device-camera' },
      { label: 'Capture Selection', glyph: 'device-camera' },
      { label: 'Capture Last 250 Lines', glyph: 'device-camera' },
      { label: 'Capture Last 1,000 Lines', glyph: 'device-camera' }
    ]
  };
  const good3 = {
    edgeHold: {
      positionWhenTheEdgeWasReached: 4,
      positionAfterHolding: 61,
      selectionAtTheEdge: { lines: 5 },
      selection: { lines: 39 }
    },
    wheelDuringDrag: {
      positionAfterTheWheel: 51,
      selection: { lines: 37, reachedNewRows: true }
    },
    plainScroll: { before: { lines: 5 }, after: { lines: 5 } },
    clickClears: { before: { lines: 5 }, after: { lines: 0 } }
  };
  const cases = [
    ['item1 green', gradeItem1, good1, 0],
    [
      'item1 the parent, blur resets the reader',
      gradeItem1,
      {
        ...good1,
        afterBlur: { position: 0, inMode: false },
        blurReports: [],
        focusReports: [],
        blurBytes: [{ data: 'OUT' }],
        focusBytes: [{ data: 'IN' }]
      },
      4
    ],
    [
      'item1 a report that stops being forwarded at all',
      gradeItem1,
      { ...good1, blurReports: [], focusReports: [] },
      1
    ],
    [
      'item1 a pane at the live bottom must not move',
      gradeItem1,
      { ...good1, liveBottom: { state: { position: 7 } } },
      1
    ],
    [
      'item1 Enter must still return to the bottom',
      gradeItem1,
      { ...good1, afterEnter: { position: 40 } },
      1
    ],
    ['item2 green', gradeItem2, good2, 0],
    [
      'item2 a row wearing a name outside the closed set',
      gradeItem2,
      {
        rows: good2.rows.map((r) =>
          r.label === 'Capture Selection' ? { ...r, glyph: 'UNKNOWN' } : r
        )
      },
      2
    ],
    [
      'item2 Copy losing its own mark',
      gradeItem2,
      {
        rows: good2.rows.map((r) =>
          r.label === 'Copy' ? { ...r, glyph: 'device-camera' } : r
        )
      },
      1
    ],
    ['item3 green', gradeItem3, good3, 0],
    [
      'item3 the parent, the edge scrolls nothing',
      gradeItem3,
      {
        ...good3,
        edgeHold: {
          positionWhenTheEdgeWasReached: 0,
          positionAfterHolding: 0,
          selectionAtTheEdge: { lines: 40 },
          selection: { lines: 40 }
        }
      },
      2
    ],
    [
      'item3 the parent, the wheel leaves the selection behind',
      gradeItem3,
      {
        ...good3,
        wheelDuringDrag: {
          positionAfterTheWheel: 51,
          selection: { lines: 37, reachedNewRows: false }
        }
      },
      1
    ],
    [
      'item3 a plain scroll must not change a selection',
      gradeItem3,
      { ...good3, plainScroll: { before: { lines: 5 }, after: { lines: 9 } } },
      1
    ],
    [
      'item3 a click must still clear a selection',
      gradeItem3,
      { ...good3, clickClears: { before: { lines: 5 }, after: { lines: 5 } } },
      1
    ]
  ];
  let failed = 0;
  for (const [name, grade, fixture, want] of cases) {
    const got = grade(fixture).length;
    const ok = got === want;
    if (!ok) failed += 1;
    console.log(
      `${TAG} self-test ${ok ? 'ok  ' : 'FAIL'} ${name}: ` +
        `${String(got)} finding(s), wanted ${String(want)}`
    );
  }
  console.log(
    `${TAG} self-test: ${String(cases.length - failed)} of ` +
      `${String(cases.length)} fixtures behaved`
  );
  return failed === 0;
}

if (process.argv.includes('--self-test')) {
  process.exit(selfTest() ? 0 : 1);
}

// ---------------------------------------------------------------------------
// The app run.
// ---------------------------------------------------------------------------

const { withElectron, withoutDevRenderer } = await import(
  join(REPO, 'build', 'electron-run.mjs')
);
const { cdpEval, wsConnect } = await import(
  join(REPO, 'build', 'cdp-client.mjs')
);

if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} out/main/index.js is missing. Run npm run build.`);
  process.exit(2);
}

const root = realpathSync(mkdtempSync(join(tmpdir(), 'p205-')));
const project = join(root, 'project');
const profile = join(root, 'profile');
const home = join(root, 'home');
for (const dir of [project, profile, home]) mkdirSync(dir, { recursive: true });
writeFileSync(join(project, 'README.md'), '# p205\n', 'utf8');

function operatorSessions() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], {
    encoding: 'utf8'
  });
  return (out.stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
}
const operatorBefore = operatorSessions();
say(`the operator's own session count before: ${String(operatorBefore)}`);

const MENU_CODICONS = (() => {
  const src = readFileSync(
    join(REPO, 'src', 'shared', 'menu-codicons.ts'),
    'utf8'
  );
  const body = src.split('MENU_CODICONS = [')[1].split('] as const')[0];
  return [...body.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);
})();
say(`the closed glyph set holds ${String(MENU_CODICONS.length)} names`);

const BUNDLE = (() => {
  const dir = join(REPO, 'out', 'renderer', 'assets');
  const name = readFileSync(
    join(REPO, 'out', 'renderer', 'index.html'),
    'utf8'
  ).match(/assets\/(index-[A-Za-z0-9_-]+\.js)/)[1];
  return { path: join(dir, name), url: `file://${join(dir, name)}` };
})();
const BUNDLE_TEXT = readFileSync(BUNDLE.path, 'utf8');
function siteOf(needle) {
  const i = BUNDLE_TEXT.indexOf(needle);
  if (i < 0) {
    throw new Error(`the bundle does not carry ${JSON.stringify(needle)}`);
  }
  const line = BUNDLE_TEXT.slice(0, i).split('\n').length - 1;
  const col = i - (BUNDLE_TEXT.lastIndexOf('\n', i - 1) + 1);
  return { line, col };
}
const SITES = {
  sendInput: siteOf('const gmux = window.gmux;'),
  sendReport: siteOf('window.gmux?.term.sendInput(this.sessionId, data)'),
  popup: siteOf('void popup(input).then('),
  selectionSnapshot: siteOf('event.preventDefault();\n      termRef')
};

const PAGE_KIT = String.raw`
(() => {
  const kit = { input: [], menus: [], sel: [], reports: [] };
  kit.hash = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  };
  kit.reset = () => { kit.input.length = 0; kit.menus.length = 0; kit.sel.length = 0; kit.reports.length = 0; };
  kit.screen = () => document.querySelector('.xterm-screen');
  kit.textarea = () => document.querySelector('.xterm-helper-textarea');
  kit.rect = () => {
    const s = kit.screen();
    if (s === null) return null;
    const b = s.getBoundingClientRect();
    return { left: b.left, top: b.top, width: b.width, height: b.height };
  };
  kit.contextMenuAt = (x, y) => {
    const s = kit.screen();
    if (s === null) return false;
    s.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, composed: true,
      clientX: Math.round(x), clientY: Math.round(y), button: 2, buttons: 2
    }));
    return true;
  };
  kit.wheelAt = (x, y, deltaY, times) => {
    const s = kit.screen();
    if (s === null) return 0;
    for (let i = 0; i < times; i += 1) {
      s.dispatchEvent(new WheelEvent('wheel', {
        deltaY, deltaMode: 0, bubbles: true, cancelable: true,
        clientX: Math.round(x), clientY: Math.round(y)
      }));
    }
    return times;
  };
  kit.redraw = async (names) => {
    try { await document.fonts.load('32px codicon'); } catch { /* no set */ }
    const out = {};
    for (const name of names) {
      const probe = document.createElement('span');
      probe.className = 'codicon codicon-' + name;
      probe.setAttribute('style', 'position:absolute;left:-9999px;top:0;visibility:hidden');
      document.body.appendChild(probe);
      const raw = getComputedStyle(probe, '::before').content;
      probe.remove();
      const m = /^(?:"([^"]*)"|'([^']*)')$/.exec(raw);
      const ch = (m && (m[1] !== undefined ? m[1] : m[2])) || '';
      if (ch === '') continue;
      const c = document.createElement('canvas');
      c.width = 32; c.height = 32;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 32, 32);
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '32px codicon';
      ctx.fillText(ch, 16, 16);
      out[kit.hash(c.toDataURL('image/png'))] = name;
    }
    return out;
  };
  globalThis.__p205 = kit;
  return true;
})()
`;

async function cdpForAppWindow(timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(
        readFileSync(join(profile, 'DevToolsActivePort'), 'utf8')
          .split('\n')[0]
          .trim()
      );
    } catch {
      port = 0;
    }
    if (port > 0) {
      let list = [];
      try {
        list = await (
          await fetch(`http://127.0.0.1:${String(port)}/json/list`)
        ).json();
      } catch {
        list = [];
      }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl);
          const answer = await cdpEval(
            cdp,
            `typeof window.gmux === 'object' && typeof window.__gmuxP95 === 'object' ? location.href : null`,
            5000
          );
          if (typeof answer === 'string') return { cdp, url: answer };
          cdp.close();
        } catch {
          try {
            cdp?.close();
          } catch {
            /* already gone */
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error('no page answered for the app window in time');
    }
    await sleep(250);
  }
}

const report = { item1: {}, item2: {}, item3: {}, notes: [] };
let threw = null;

await withElectron(
  {
    label: 'p205 terminal',
    userDataDir: profile,
    tmuxSocket: SOCKET,
    cwd: REPO,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({
      HOME: home,
      GMUX_TMUX_SOCKET: SOCKET,
      GMUX_PROBES: '1',
      GMUX_SHOT: join(root, 'p205-unused.png'),
      GMUX_SHOT_DELAY_MS: '1500000',
      GMUX_SHOT_POPUP_PICK: 'p205 no row carries this label'
    }),
    ceilingMs: 25 * 60 * 1000,
    echo: false
  },
  async (handle) => {
    const { cdp, url } = await cdpForAppWindow(120_000);
    say(`the app window is at ${url}`);
    await cdp.call('Runtime.enable');
    await cdp.call('Debugger.enable');
    await cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true });
    for (;;) {
      const done = await cdpEval(
        cdp,
        `performance.getEntriesByType('navigation')[0].loadEventEnd`
      );
      if (done > 0) break;
      await sleep(100);
    }
    await cdpEval(cdp, PAGE_KIT);

    const setLogpoint = async (name, site, condition) => {
      const r = await cdp.call('Debugger.setBreakpointByUrl', {
        url: BUNDLE.url,
        lineNumber: site.line,
        columnNumber: site.col,
        condition
      });
      const count = (r.result?.locations ?? []).length;
      say(`logpoint ${name}: ${String(count)} location(s)`);
      report.notes.push(`logpoint ${name}: ${String(count)} location(s)`);
      if (count === 0) throw new Error(`logpoint ${name} bound nothing`);
    };
    await setLogpoint(
      'sendInput',
      SITES.sendInput,
      '(globalThis.__p205.input.push({ data, pos: this.state.position, inMode: this.state.inMode }), false)'
    );
    // The forward path for item 1. The two focus reports must still LEAVE, or
    // an application inside the pane that asked tmux for focus events stops
    // hearing about them; only their treatment as input is refused.
    await setLogpoint(
      'sendReport',
      SITES.sendReport,
      '(globalThis.__p205.reports.push({ data, pos: this.state.position, inMode: this.state.inMode }), false)'
    );
    await setLogpoint(
      'popup',
      SITES.popup,
      '(globalThis.__p205.menus.push(JSON.parse(JSON.stringify(input))), false)'
    );
    await setLogpoint(
      'selectionSnapshot',
      SITES.selectionSnapshot,
      '(globalThis.__p205.sel.push(selection === null ? null : { text: selection.text }), false)'
    );

    await cdpEval(
      cdp,
      `window.__gmuxP95.openLocal(${JSON.stringify(project)}).then(() => true)`,
      90_000
    );
    await cdpEval(
      cdp,
      `window.__gmuxP95.create({ name: 'p205', agent: 'shell' }).then(() => true)`,
      120_000
    );
    const state = await cdpEval(cdp, `window.__gmuxP95.state()`);
    const row = state.sessions[0];
    if (row === undefined) throw new Error('no session was created');
    const S = JSON.stringify(row.id);
    say(`session ${row.name} on ${row.tmuxName}`);

    // Numbered lines, so a selection can be read back as a range of history.
    await cdpEval(cdp, `window.gmux.term.sendInput(${S}, 'seq 1 900\\r'), true`);
    const stateOf = () =>
      cdpEval(cdp, `window.gmux.scroll.state({ sessionId: ${S} })`);
    for (let i = 0; i < 60; i += 1) {
      const st = await stateOf();
      if ((st?.history ?? 0) >= 400) break;
      await sleep(500);
    }
    const seeded = await stateOf();
    say(`seeded: ${JSON.stringify(seeded)}`);
    const rect = await cdpEval(cdp, `window.__p205.rect()`);
    // The WebGL renderer draws no row elements, so the cell box comes from the
    // row count tmux reports for the pane and the screen's own height.
    const rows = seeded.rows;
    const cellHeight = rect.height / rows;
    const yOf = (r) => rect.top + (r + 0.5) * cellHeight;
    const xAt = (f) => rect.left + rect.width * f;
    const focusPane = async () => {
      await cdpEval(cdp, `window.__p205.textarea()?.focus(), true`);
      await sleep(400);
    };
    const live = async () => {
      await cdpEval(cdp, `window.__gmuxP95.live(${S}).then(() => true)`, 60_000);
      await sleep(800);
    };
    const mouse = (type, x, y, extra = {}) =>
      cdp.call('Input.dispatchMouseEvent', {
        type,
        x: Math.round(x),
        y: Math.round(y),
        button: extra.button ?? 'left',
        buttons: extra.buttons ?? 0,
        clickCount: extra.clickCount ?? 0,
        modifiers: 0
      });

    // -------------------------------------------------------------------
    // ITEM 1. Coming back to the window keeps where you were.
    // -------------------------------------------------------------------
    await focusPane();
    await cdpEval(cdp, `window.__gmuxP95.wheel(10, -120).then(() => true)`, 60_000);
    await sleep(1500);
    report.item1.beforeBlur = await stateOf();
    await cdpEval(cdp, `window.__p205.reset(), true`);
    await cdpEval(
      cdp,
      `(() => { window.dispatchEvent(new Event('blur')); window.__p205.textarea()?.blur(); return true; })()`
    );
    await sleep(2500);
    report.item1.afterBlur = await stateOf();
    report.item1.blurBytes = await cdpEval(cdp, `window.__p205.input`);
    report.item1.blurReports = await cdpEval(cdp, `window.__p205.reports`);
    await cdpEval(cdp, `window.__p205.reset(), true`);
    await cdpEval(
      cdp,
      `(() => { window.__p205.textarea()?.focus(); window.dispatchEvent(new Event('focus')); return true; })()`
    );
    await sleep(2500);
    report.item1.afterFocus = await stateOf();
    report.item1.focusBytes = await cdpEval(cdp, `window.__p205.input`);
    report.item1.focusReports = await cdpEval(cdp, `window.__p205.reports`);
    say(
      `item1: position ${String(report.item1.beforeBlur?.position)} -> ` +
        `${String(report.item1.afterBlur?.position)} -> ` +
        `${String(report.item1.afterFocus?.position)}`
    );
    say(
      `item1: as input ${JSON.stringify(report.item1.blurBytes)} then ` +
        `${JSON.stringify(report.item1.focusBytes)}; forwarded as a report ` +
        `${JSON.stringify(report.item1.blurReports)} then ` +
        `${JSON.stringify(report.item1.focusReports)}`
    );

    // Must not change: a pane at the live bottom stays there.
    await live();
    await focusPane();
    await cdpEval(cdp, `window.__p205.input.length = 0, true`);
    await cdpEval(cdp, `(() => { window.__p205.textarea()?.blur(); return true; })()`);
    await sleep(1500);
    await cdpEval(cdp, `window.__p205.textarea()?.focus(), true`);
    await sleep(1500);
    report.item1.liveBottom = {
      state: await stateOf(),
      bytes: await cdpEval(cdp, `window.__p205.input`)
    };
    say(`item1: at the live bottom ${JSON.stringify(report.item1.liveBottom)}`);

    // Must not change: Enter returns a scrolled pane to the bottom.
    await focusPane();
    await cdpEval(cdp, `window.__gmuxP95.wheel(10, -120).then(() => true)`, 60_000);
    await sleep(1500);
    report.item1.beforeEnter = await stateOf();
    const key = {
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13,
      text: '\r',
      unmodifiedText: '\r'
    };
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...key });
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...key });
    await sleep(2500);
    report.item1.afterEnter = await stateOf();
    say(
      `item1: Enter took ${String(report.item1.beforeEnter?.position)} to ` +
        `${String(report.item1.afterEnter?.position)}`
    );

    // -------------------------------------------------------------------
    // ITEM 2. Every glyph, read off the COMPOSED menu.
    // -------------------------------------------------------------------
    await live();
    await focusPane();
    await mouse('mousePressed', xAt(0.03), yOf(2), {
      buttons: 1,
      clickCount: 1
    });
    for (let i = 1; i <= 6; i += 1) {
      await mouse('mouseMoved', xAt(0.03 + 0.4 * (i / 6)), yOf(2 + i * 0.5), {
        buttons: 1
      });
      await sleep(40);
    }
    await mouse('mouseReleased', xAt(0.43), yOf(5), {
      buttons: 0,
      clickCount: 1
    });
    await sleep(500);
    await cdpEval(cdp, `window.__p205.menus.length = 0, true`);
    await cdpEval(cdp, `window.__p205.contextMenuAt(${xAt(0.2)}, ${yOf(3)})`);
    for (let i = 0; i < 60; i += 1) {
      if ((await cdpEval(cdp, `window.__p205.menus.length`)) > 0) break;
      await sleep(150);
    }
    const hashToName = await cdpEval(
      cdp,
      `window.__p205.redraw(${JSON.stringify(MENU_CODICONS)})`,
      180_000
    );
    const drawn = await cdpEval(
      cdp,
      `(() => { const m = window.__p205.menus[0]; if (!m) return null;
        return m.items.map((it) => ({
          label: it.label ?? '(separator)',
          type: it.type ?? 'item',
          enabled: it.enabled !== false,
          iconHash: it.icon ? window.__p205.hash(it.icon.dataUrl) : null
        })); })()`
    );
    report.item2.rows = (drawn ?? []).map((r) => ({
      ...r,
      glyph: r.iconHash === null ? null : (hashToName[r.iconHash] ?? 'UNKNOWN')
    }));
    say('item2: the composed session menu, row by row');
    for (const r of report.item2.rows) {
      if (r.type === 'separator') {
        console.log('          ----');
        continue;
      }
      console.log(
        `        ${r.enabled ? ' ' : '~'} ${String(r.label).padEnd(34)} ` +
          `${String(r.glyph)}`
      );
    }

    // -------------------------------------------------------------------
    // ITEM 3. A selection that keeps growing.
    // -------------------------------------------------------------------
    const readSelection = async (label) => {
      await cdpEval(cdp, `window.__p205.sel.length = 0, true`);
      await cdpEval(cdp, `window.__p205.menus.length = 0, true`);
      await cdpEval(cdp, `window.__p205.contextMenuAt(${xAt(0.2)}, ${yOf(3)})`);
      for (let i = 0; i < 60; i += 1) {
        if ((await cdpEval(cdp, `window.__p205.menus.length`)) > 0) break;
        await sleep(150);
      }
      const snap = await cdpEval(cdp, `window.__p205.sel[0] ?? null`);
      const text = snap === null ? '' : snap.text;
      const lines = text === '' ? [] : text.split('\n');
      // The seeded lines are the numbers 1..900, so the smallest number in the
      // selection says how far back through the history it actually reaches.
      const numbers = lines
        .map((l) => Number(l.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
      const out = {
        lines: lines.length,
        bytes: text.length,
        lowest: numbers.length === 0 ? null : Math.min(...numbers),
        highest: numbers.length === 0 ? null : Math.max(...numbers),
        first: (lines[0] ?? '').slice(0, 24),
        last: (lines[lines.length - 1] ?? '').slice(0, 24)
      };
      say(`item3 ${label}: ${JSON.stringify(out)}`);
      return out;
    };

    // Arm A, the edge hold. Start the drag near the bottom, walk up to the
    // top edge, read the selection there, then hold outside for three seconds
    // and read it again. The pane must have scrolled and the selection grown.
    await live();
    await focusPane();
    await mouse('mousePressed', xAt(0.02), yOf(rows - 4), {
      buttons: 1,
      clickCount: 1
    });
    for (let i = 1; i <= 8; i += 1) {
      await mouse('mouseMoved', xAt(0.3), yOf(rows - 4 - i * 2), {
        buttons: 1
      });
      await sleep(60);
    }
    const edgeStart = await stateOf();
    // Released and re-read, because the snapshot is taken by a right click and
    // a right click during a drag is not the gesture under test.
    await mouse('mouseReleased', xAt(0.3), yOf(rows - 20), {
      buttons: 0,
      clickCount: 1
    });
    await sleep(400);
    const atEdge = await readSelection('A, before the edge hold');
    // Now the same drag again, held outside the top edge.
    await mouse('mousePressed', xAt(0.02), yOf(rows - 4), {
      buttons: 1,
      clickCount: 1
    });
    for (let i = 1; i <= 8; i += 1) {
      await mouse('mouseMoved', xAt(0.3), yOf(rows - 4 - i * 2), {
        buttons: 1
      });
      await sleep(60);
    }
    for (let i = 0; i < 30; i += 1) {
      await mouse('mouseMoved', xAt(0.3), rect.top - 20, { buttons: 1 });
      await sleep(100);
    }
    const edgeEnd = await stateOf();
    await mouse('mouseReleased', xAt(0.3), rect.top - 20, {
      buttons: 0,
      clickCount: 1
    });
    await sleep(500);
    report.item3.edgeHold = {
      positionWhenTheEdgeWasReached: edgeStart?.position,
      positionAfterHolding: edgeEnd?.position,
      selectionAtTheEdge: atEdge,
      selection: await readSelection('A, after holding three seconds')
    };

    // Arm B, a wheel during a live drag.
    await live();
    await focusPane();
    await mouse('mousePressed', xAt(0.02), yOf(rows - 6), {
      buttons: 1,
      clickCount: 1
    });
    for (let i = 1; i <= 4; i += 1) {
      await mouse('mouseMoved', xAt(0.2), yOf(rows - 6 - i), { buttons: 1 });
      await sleep(60);
    }
    const beforeWheel = await stateOf();
    await cdpEval(cdp, `window.__p205.wheelAt(${xAt(0.3)}, ${yOf(5)}, -120, 8)`);
    await sleep(2000);
    const midDrag = await stateOf();
    for (let i = 1; i <= 5; i += 1) {
      await mouse('mouseMoved', xAt(0.4), yOf(6 - i), { buttons: 1 });
      await sleep(80);
    }
    await mouse('mouseReleased', xAt(0.4), yOf(1), {
      buttons: 0,
      clickCount: 1
    });
    await sleep(500);
    const afterWheel = await readSelection('B, a wheel during the drag');
    report.item3.wheelDuringDrag = {
      positionBeforeTheWheel: beforeWheel?.position,
      positionAfterTheWheel: midDrag?.position,
      selection: {
        ...afterWheel,
        // The rows that came into view are further back than anything that
        // was on screen when the drag began, so the lowest number selected
        // must be below what the bottom of the live screen was showing.
        reachedNewRows:
          afterWheel.lowest !== null &&
          afterWheel.highest !== null &&
          afterWheel.highest - afterWheel.lowest >= 20
      }
    };

    // Must not change: a plain scroll with no drag changes no selection.
    await live();
    await focusPane();
    await mouse('mousePressed', xAt(0.02), yOf(4), {
      buttons: 1,
      clickCount: 1
    });
    for (let i = 1; i <= 4; i += 1) {
      await mouse('mouseMoved', xAt(0.02 + 0.4 * (i / 4)), yOf(4 + i), {
        buttons: 1
      });
      await sleep(50);
    }
    await mouse('mouseReleased', xAt(0.42), yOf(8), {
      buttons: 0,
      clickCount: 1
    });
    await sleep(400);
    const beforePlain = await readSelection('before a plain scroll');
    await cdpEval(cdp, `window.__p205.wheelAt(${xAt(0.3)}, ${yOf(5)}, -120, 4)`);
    await sleep(2000);
    report.item3.plainScroll = {
      before: beforePlain,
      after: await readSelection('after a plain scroll')
    };

    // Must not change: a click with no drag still clears a selection.
    await live();
    await focusPane();
    await mouse('mousePressed', xAt(0.02), yOf(4), {
      buttons: 1,
      clickCount: 1
    });
    for (let i = 1; i <= 4; i += 1) {
      await mouse('mouseMoved', xAt(0.02 + 0.4 * (i / 4)), yOf(4 + i), {
        buttons: 1
      });
      await sleep(50);
    }
    await mouse('mouseReleased', xAt(0.42), yOf(8), {
      buttons: 0,
      clickCount: 1
    });
    await sleep(400);
    const beforeClick = await readSelection('before a click');
    await mouse('mousePressed', xAt(0.6), yOf(12), {
      buttons: 1,
      clickCount: 1
    });
    await mouse('mouseReleased', xAt(0.6), yOf(12), {
      buttons: 0,
      clickCount: 1
    });
    await sleep(600);
    report.item3.clickClears = {
      before: beforeClick,
      after: await readSelection('after a click')
    };

    report.notes.push(
      `popup-pick lines main printed: ` +
        `${String((handle.text().match(/popup-pick/g) ?? []).length)}`
    );
    await cdpEval(cdp, `window.__gmuxP95.kill(${S}).then(() => true)`, 90_000);
    try {
      cdp.close();
    } catch {
      /* already gone */
    }
    writeFileSync(join(root, 'p205-app.log'), handle.text(), 'utf8');
    return true;
  }
).catch((err) => {
  threw = err;
  console.error(`${TAG} threw: ${String(err?.stack ?? err)}`);
});

const reportPath = join(root, 'p205-report.json');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
say(`the readings are at ${reportPath}`);

const operatorAfter = operatorSessions();
say(`the operator's own session count after: ${String(operatorAfter)}`);

const findings = [
  ...(threw === null ? [] : [`the run threw: ${String(threw?.message ?? threw)}`]),
  ...gradeItem1(report.item1).map((f) => `item1: ${f}`),
  ...gradeItem2(report.item2).map((f) => `item2: ${f}`),
  ...gradeItem3(report.item3).map((f) => `item3: ${f}`),
  ...(operatorAfter === operatorBefore
    ? []
    : [
        `the operator's session count moved from ` +
          `${String(operatorBefore)} to ${String(operatorAfter)}`
      ])
];
for (const f of findings) console.error(`${TAG} FINDING ${f}`);
if (findings.length === 0) {
  say('all three items are green, and every must-not-change arm held');
  // The readings stay; the scratch profile, project and home do not.
  for (const dir of [profile, project, home]) {
    rmSync(dir, { recursive: true, force: true });
  }
}
process.exit(findings.length === 0 ? 0 : 1);
