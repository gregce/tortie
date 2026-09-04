#!/usr/bin/env node
/**
 * probe-p207-hue.mjs. The frame takes the hue you choose, driven in the
 * real app and read off the DOM (Phase 207).
 *
 * About a minute after the build. ONE Electron on a scratch profile and the
 * gmux-p207 tmux socket, through build/electron-run.mjs so its whole tree
 * ends in a finally block whatever happens. It opens one scratch folder,
 * creates one shell session, opens one real file in the editor, and takes
 * FIVE readings, every colour read off the DOM as the compositor paints it,
 * the titlebar, the sidebar, the Pierre tree root, the body, the terminal
 * host and its live xterm theme, and the Monaco editor:
 *
 *   1. the default, 222: every token is the shipped byte, and the titlebar,
 *      the tree host, the body, the terminal host, the live xterm theme and
 *      the Monaco editor all paint the shipped canvas or sidebar with the
 *      shipped light text;
 *   2. a hue that reads dark, 30: every neutral is the shipped value turned
 *      in OKLCH by 30 - 222 degrees, computed here with the full culori
 *      entry rather than the trimmed one the app ships, and all six surfaces
 *      agree on the turned canvas, the text still the shipped light family;
 *   3. a ground light enough to flip, hue 30 with the whole ramp lifted 0.6
 *      in OKLCH lightness: the text is dark on every surface, darker than
 *      the ground it sits on, and the six surfaces still agree;
 *   4. the threshold from below, the largest lift whose canvas luminance is
 *      at or under sqrt(0.05 x 1.05) - 0.05: light text;
 *   5. the threshold from above, the next thousandth: dark text.
 *
 * Then the ground goes back to 0 and the hue to 222, and the reading must be
 * the first one again, byte for byte, which is the zero override guarantee
 * driven rather than argued. Last, the hue is set to 30 and left there.
 *
 * A SECOND ELECTRON follows the first, never beside it, on the SAME
 * profile: the hue must come back from the settings file at boot, every
 * neutral on the root the turned one and the frame painted in it before
 * anything is driven, which is the restore the entry's attack list names.
 * In that launch the three appearance settings, a scheme, a contrast level
 * and a hue, are then set in all six orders from the defaults, and the
 * override map the applier publishes must be the same bytes in every order,
 * which is the composition claim driven rather than argued.
 *
 * THE LIFT IS THE ONE THING NO SETTING REACHES. The rotation alone tops out
 * at canvas Y 0.0073 and the flip is at 0.179, so readings 3 to 5 use the
 * harness knob in src/renderer/theme/apply.ts through the Phase 207 drive.
 * Everything else goes through the settings bridge the slider uses.
 *
 * It spawns no agent, spends no token, reads the credentials of nobody and
 * touches no profile but its own. `--self-test` proves the grader on
 * fixtures and launches nothing.
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { schemeDeclarations } from './tokens-css.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOCKET = 'gmux-p207';
const TAG = '[p207]';
const say = (line) => console.log(`${TAG} ${line}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const require = createRequire(import.meta.url);
const { converter, clampChroma, formatHex, parse, wcagLuminance } = require('culori');
const toOklch = converter('oklch');
const toRgb = converter('rgb');

// ---------------------------------------------------------------------------
// The expected colours, computed here with the full library.
// ---------------------------------------------------------------------------

const DEFAULT_HUE = 222;
const THRESHOLD = Math.sqrt(0.05 * 1.05) - 0.05;

function shippedTokens() {
  // The DARK base only (Phase 213 added a light block after it).
  return schemeDeclarations(readFileSync(join(REPO, 'src', 'renderer', 'styles', 'tokens.css'), 'utf8'), 'dark');
}

function hexOf(color) {
  const rgb = toRgb(color);
  return formatHex({
    ...rgb,
    r: Math.min(1, Math.max(0, rgb.r)),
    g: Math.min(1, Math.max(0, rgb.g)),
    b: Math.min(1, Math.max(0, rgb.b))
  });
}

/** The shipped neutral turned by (hue - 222) in OKLCH, then lifted. */
function expectedNeutral(shipped, hue, lift) {
  const ok = toOklch(parse(shipped));
  let out = ok;
  if (hue !== DEFAULT_HUE) {
    out = clampChroma({ ...out, h: ((((out.h ?? 0) + hue - DEFAULT_HUE) % 360) + 360) % 360 }, 'oklch');
  }
  if (lift !== 0) {
    // The app lifts the ROUNDED turned value, so round between the steps.
    out = toOklch(parse(hexOf(out)));
    out = clampChroma({ ...out, l: Math.min(1, out.l + lift) }, 'oklch');
  }
  return hexOf(out);
}

/** A computed `rgb(r, g, b)` as six digit hex; null for transparent. */
export function domHex(text) {
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(String(text ?? '').trim());
  if (m === null) return null;
  if (m[4] !== undefined && Number(m[4]) === 0) return null;
  const h = (n) => Number(n).toString(16).padStart(2, '0');
  return `#${h(m[1])}${h(m[2])}${h(m[3])}`;
}

const L = (hex) => toOklch(parse(hex))?.l ?? -1;

// ---------------------------------------------------------------------------
// The grader. One reading, one expectation, a list of findings.
// ---------------------------------------------------------------------------

const NEUTRALS = ['--bg-canvas', '--bg-sidebar', '--bg-surface', '--bg-raised', '--bg-active', '--border', '--border-active', '--border-strong'];
const TEXTS = ['--text-primary', '--text-secondary', '--text-muted', '--text-disabled'];

/**
 * @param {object} reading what the drive read
 * @param {object} want { hue, lift, dark, shipped }
 */
export function grade(reading, want) {
  const findings = [];
  const { shipped } = want;
  const canvas = expectedNeutral(shipped['--bg-canvas'], want.hue, want.lift);
  const sidebar = expectedNeutral(shipped['--bg-sidebar'], want.hue, want.lift);

  if (reading.chromeHue !== want.hue) findings.push(`the persisted hue is ${String(reading.chromeHue)}, not ${String(want.hue)}`);
  if (Math.abs(reading.groundLift - want.lift) > 1e-9) findings.push(`the ground lift is ${String(reading.groundLift)}, not ${String(want.lift)}`);

  // The tokens on the root: every neutral is the expected one.
  for (const token of NEUTRALS) {
    const expected = expectedNeutral(shipped[token], want.hue, want.lift);
    if (reading.tokens[token].toLowerCase() !== expected) {
      findings.push(`${token} on the root is ${reading.tokens[token]}, expected ${expected}`);
    }
  }
  if (reading.canvas.toLowerCase() !== canvas) findings.push(`the published canvas is ${reading.canvas}, expected ${canvas}`);
  if (reading.textDark !== want.dark) findings.push(`textDark is ${String(reading.textDark)}, expected ${String(want.dark)}`);

  // The surfaces agree on the ground. A frame only grade, at boot in the
  // second launch, reads the frame and no session or editor.
  const paint = (selector) => reading.paint[selector] ?? null;
  const bg = (selector) => domHex(paint(selector)?.background);
  const fg = (selector) => domHex(paint(selector)?.color);
  const frameOnly = want.frameOnly === true;
  const onCanvas = frameOnly ? ['body'] : ['body', '.gmux-terminal-host', '.monaco-editor-background'];
  for (const selector of onCanvas) {
    if (paint(selector) === null) {
      findings.push(`${selector} is not mounted`);
      continue;
    }
    if (bg(selector) !== canvas) findings.push(`${selector} paints ${String(bg(selector))}, expected the canvas ${canvas}`);
  }
  // The tree HOST is transparent by design and the sidebar shows through
  // it; the Pierre tree ROOT inside it is what the host style paints.
  for (const selector of frameOnly ? ['.titlebar', '.sidebar'] : ['.titlebar', '.sidebar', 'file-tree-container']) {
    if (paint(selector) === null) {
      findings.push(`${selector} is not mounted`);
      continue;
    }
    if (bg(selector) !== sidebar) findings.push(`${selector} paints ${String(bg(selector))}, expected the sidebar ${sidebar}`);
  }
  if (!frameOnly) {
    if (reading.terminal === null) findings.push('no live terminal to read');
    else if (reading.terminal.background.toLowerCase() !== canvas) findings.push(`the terminal theme background is ${reading.terminal.background}, expected the canvas ${canvas}`);
    if (reading.editors < 1) findings.push('no Monaco editor is mounted');
  }

  // The text follows the ground, on every surface at once.
  const primary = reading.tokens['--text-primary'].toLowerCase();
  const bodyText = fg('body');
  if (frameOnly) {
    if (bodyText !== primary) findings.push(`the body text is ${String(bodyText)} where --text-primary is ${primary}`);
    if (fg('.titlebar') !== primary) findings.push(`the titlebar text is ${String(fg('.titlebar'))} where --text-primary is ${primary}`);
    for (const token of TEXTS) {
      if (want.lift === 0 && reading.tokens[token].toLowerCase() !== shipped[token].toLowerCase()) {
        findings.push(`${token} is ${reading.tokens[token]} where the shipped ${shipped[token]} was expected with no ground lift`);
      }
    }
    return findings;
  }
  const treeText = fg('.files-tree');
  const monacoText = fg('.monaco-editor');
  const termText = reading.terminal?.foreground.toLowerCase() ?? null;
  if (bodyText !== primary) findings.push(`the body text is ${String(bodyText)} where --text-primary is ${primary}`);
  if (treeText !== primary) findings.push(`the tree host text is ${String(treeText)} where --text-primary is ${primary}`);
  if (fg('file-tree-container') !== primary) findings.push(`the tree root text is ${String(fg('file-tree-container'))} where --text-primary is ${primary}`);
  // The terminal and the editor are one material with one foreground: the
  // same constant on the same canvas under the same floor, so they agree
  // at every ground, the lift before the flip included.
  if (termText === null || monacoText === null) findings.push('the terminal or the Monaco foreground could not be read');
  else if (termText !== monacoText) findings.push(`the terminal foreground ${termText} and the Monaco foreground ${monacoText} disagree`);
  if (want.dark) {
    for (const [name, text, ground] of [['--text-primary', primary, canvas], ['the terminal foreground', termText, canvas], ['the Monaco foreground', monacoText, canvas], ['the tree host text', treeText, sidebar]]) {
      if (text === null) findings.push(`${name} could not be read`);
      else if (!(L(text) < L(ground))) findings.push(`${name} ${text} is not darker than its ground ${ground}`);
    }
    for (const token of TEXTS) {
      if (reading.tokens[token].toLowerCase() === shipped[token].toLowerCase()) findings.push(`${token} is still the shipped ${shipped[token]} on a light ground`);
    }
  } else {
    for (const token of TEXTS) {
      if (want.lift === 0 && reading.tokens[token].toLowerCase() !== shipped[token].toLowerCase()) {
        findings.push(`${token} is ${reading.tokens[token]} where the shipped ${shipped[token]} was expected with no ground lift`);
      }
    }
    if (want.lift === 0 && termText !== '#d8dbe2') findings.push(`the terminal foreground is ${String(termText)}, expected the shipped #d8dbe2`);
    if (want.lift === 0 && monacoText !== '#d8dbe2') findings.push(`the Monaco foreground is ${String(monacoText)}, expected the shipped #d8dbe2`);
    for (const [name, text, ground] of [['--text-primary', primary, canvas], ['the terminal foreground', termText, canvas], ['the Monaco foreground', monacoText, canvas]]) {
      if (text === null) findings.push(`${name} could not be read`);
      else if (!(L(text) > L(ground))) findings.push(`${name} ${text} is not lighter than its ground ${ground}`);
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// The self test: the grader over fixtures, launching nothing.
// ---------------------------------------------------------------------------

function fixtureReading(hue, lift, dark, shipped, tamper = {}) {
  const tokens = {};
  for (const token of NEUTRALS) tokens[token] = expectedNeutral(shipped[token], hue, lift);
  const text = dark ? { '--text-primary': '#0b0c0d', '--text-secondary': '#2a2c31', '--text-muted': '#3d414a', '--text-disabled': '#7a7f8a' } : {};
  for (const token of TEXTS) tokens[token] = text[token] ?? shipped[token];
  const rgb = (hex) => {
    const c = toRgb(parse(hex));
    return `rgb(${String(Math.round(c.r * 255))}, ${String(Math.round(c.g * 255))}, ${String(Math.round(c.b * 255))})`;
  };
  const canvas = tokens['--bg-canvas'];
  const sidebar = tokens['--bg-sidebar'];
  const primary = tokens['--text-primary'];
  const termFg = dark ? '#000000' : '#D8DBE2';
  const reading = {
    chromeHue: hue,
    groundLift: lift,
    canvas,
    textDark: dark,
    tokens,
    paint: {
      '.titlebar': { background: rgb(sidebar), color: rgb(primary) },
      '.sidebar': { background: rgb(sidebar), color: rgb(primary) },
      '.files-tree': { background: 'rgba(0, 0, 0, 0)', color: rgb(primary) },
      'file-tree-container': { background: rgb(sidebar), color: rgb(primary) },
      body: { background: rgb(canvas), color: rgb(primary) },
      '.gmux-terminal-host': { background: rgb(canvas), color: rgb(primary) },
      '.monaco-editor': { background: rgb(canvas), color: rgb(termFg) },
      '.monaco-editor-background': { background: rgb(canvas), color: rgb(termFg) }
    },
    terminal: { background: canvas, foreground: termFg, cursor: termFg },
    editors: 1,
    ...tamper
  };
  return reading;
}

function selfTest() {
  const shipped = shippedTokens();
  const cases = [
    ['the default reads clean', fixtureReading(222, 0, false, shipped), { hue: 222, lift: 0, dark: false }, 0],
    ['a dark hue reads clean', fixtureReading(30, 0, false, shipped), { hue: 30, lift: 0, dark: false }, 0],
    ['a lifted ground with dark text reads clean', fixtureReading(30, 0.6, true, shipped), { hue: 30, lift: 0.6, dark: true }, 0],
    ['a terminal left graphite is caught', fixtureReading(30, 0, false, shipped, { terminal: { background: '#131417', foreground: '#D8DBE2', cursor: '#E8EAED' } }), { hue: 30, lift: 0, dark: false }, 1],
    ['a tree root left graphite is caught', (() => { const r = fixtureReading(30, 0, false, shipped); r.paint['file-tree-container'] = { background: 'rgb(14, 15, 19)', color: 'rgb(201, 202, 205)' }; return r; })(), { hue: 30, lift: 0, dark: false }, 1],
    ['an editor foreground parting from the terminal is caught', (() => { const r = fixtureReading(30, 0.372, false, shipped); r.terminal.foreground = '#fcfdff'; return r; })(), { hue: 30, lift: 0.372, dark: false }, 1],
    ['light text on a light ground is caught', fixtureReading(30, 0.6, false, shipped), { hue: 30, lift: 0.6, dark: true }, 5],
    ['a missing editor is caught', fixtureReading(222, 0, false, shipped, { editors: 0 }), { hue: 222, lift: 0, dark: false }, 1],
    ['a frame at boot with no session reads clean', fixtureReading(30, 0, false, shipped, { terminal: null, editors: 0 }), { hue: 30, lift: 0, dark: false, frameOnly: true }, 0],
    ['a frame at boot left graphite is caught', (() => { const r = fixtureReading(30, 0, false, shipped, { terminal: null, editors: 0 }); r.paint['.titlebar'] = { background: 'rgb(14, 15, 19)', color: 'rgb(201, 202, 205)' }; return r; })(), { hue: 30, lift: 0, dark: false, frameOnly: true }, 1],
    ['a wrong hue on disk is caught', fixtureReading(31, 0, false, shipped), { hue: 30, lift: 0, dark: false }, 9]
  ];
  let failed = 0;
  for (const [name, reading, want, wantCount] of cases) {
    const got = grade(reading, { ...want, shipped }).length;
    const ok = wantCount === 0 ? got === 0 : got >= 1;
    if (!ok) failed += 1;
    say(`self-test ${ok ? 'ok  ' : 'FAIL'} ${name}: ${String(got)} finding(s)${wantCount === 0 ? '' : ', at least 1 wanted'}`);
  }
  say(`self-test: ${String(cases.length - failed)} of ${String(cases.length)} fixtures behaved`);
  return failed === 0;
}

if (process.argv.includes('--self-test')) {
  process.exit(selfTest() ? 0 : 1);
}

// ---------------------------------------------------------------------------
// The app run.
// ---------------------------------------------------------------------------

const { withElectron, withoutDevRenderer } = await import(join(REPO, 'build', 'electron-run.mjs'));
const { cdpEval, wsConnect } = await import(join(REPO, 'build', 'cdp-client.mjs'));

if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} out/main/index.js is missing. Run npm run build.`);
  process.exit(2);
}

const root = realpathSync(mkdtempSync(join(tmpdir(), 'p207-')));
const project = join(root, 'project');
const profile = join(root, 'profile');
const home = join(root, 'home');
for (const dir of [project, profile, home]) mkdirSync(dir, { recursive: true });
// A plain text file, because a markdown file opens rendered rather than in
// Monaco, and the editor is one of the six surfaces this probe reads.
const FILE = 'notes.txt';
writeFileSync(join(project, FILE), 'p207\nThe frame takes the hue you choose.\n', 'utf8');

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
        list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
      } catch {
        list = [];
      }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl);
          const answer = await cdpEval(cdp, `typeof window.gmux === 'object' && typeof window.__gmuxP207 === 'object' ? location.href : null`, 5000);
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
    if (Date.now() - started > timeoutMs) throw new Error('no page answered for the app window in time');
    await sleep(250);
  }
}

const shipped = shippedTokens();

// The two threshold lifts at hue 30, found by stepping the lifted canvas a
// thousandth at a time until its luminance crosses the tie point.
function thresholdLifts(hue) {
  let below = 0;
  let above = 0;
  for (let i = 0; i <= 1000; i += 1) {
    const lift = i / 1000;
    const y = wcagLuminance(expectedNeutral(shipped['--bg-canvas'], hue, lift));
    if (y <= THRESHOLD) below = lift;
    else {
      above = lift;
      break;
    }
  }
  return { below, above };
}

const DARK_HUE = 30;
const { below, above } = thresholdLifts(DARK_HUE);
say(`the threshold at hue ${String(DARK_HUE)}: light up to lift ${below.toFixed(3)} (canvas ${expectedNeutral(shipped['--bg-canvas'], DARK_HUE, below)}), dark from ${above.toFixed(3)} (canvas ${expectedNeutral(shipped['--bg-canvas'], DARK_HUE, above)})`);

const ARMS = [
  { name: 'the default, 222', hue: 222, lift: 0, dark: false },
  { name: `a hue that reads dark, ${String(DARK_HUE)}`, hue: DARK_HUE, lift: 0, dark: false },
  { name: 'a ground light enough to flip, lift 0.6', hue: DARK_HUE, lift: 0.6, dark: true },
  { name: `the threshold from below, lift ${below.toFixed(3)}`, hue: DARK_HUE, lift: below, dark: false },
  { name: `the threshold from above, lift ${above.toFixed(3)}`, hue: DARK_HUE, lift: above, dark: true }
];

const report = { arms: [], back: null, boot: null, orders: null, findings: 0 };
let threw = null;

const BOOT_HUE = DARK_HUE;

/** The launch options, shared by both runs; one profile, one socket. */
const launch = (label) => ({
  label,
  userDataDir: profile,
  tmuxSocket: SOCKET,
  cwd: REPO,
  args: ['--remote-debugging-port=0', '--use-mock-keychain'],
  env: withoutDevRenderer({
    HOME: home,
    GMUX_TMUX_SOCKET: SOCKET,
    GMUX_PROBES: '1',
    GMUX_SHOT: join(root, 'p207-unused.png'),
    GMUX_SHOT_DELAY_MS: '1500000',
    GMUX_SHOT_POPUP_PICK: 'p207 no row carries this label'
  }),
  ceilingMs: 10 * 60 * 1000,
  echo: false
});

async function appWindowLoaded() {
  const { cdp, url } = await cdpForAppWindow(120_000);
  say(`the app window is at ${url}`);
  await cdp.call('Runtime.enable');
  for (;;) {
    const done = await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`);
    if (done > 0) break;
    await sleep(100);
  }
  return cdp;
}

await withElectron(
  launch('p207 hue'),
  async () => {
    const cdp = await appWindowLoaded();
    await cdpEval(cdp, `window.__gmuxP95.openLocal(${JSON.stringify(project)}).then(() => true)`, 90_000);
    await cdpEval(cdp, `window.__gmuxP95.create({ name: 'p207', agent: 'shell' }).then(() => true)`, 120_000);
    const opened = await cdpEval(
      cdp,
      `window.__gmuxP207.openFile(${JSON.stringify({ repoPath: project, relPath: FILE, path: join(project, FILE) })})`,
      120_000
    );
    say(`a session and an editor are up: ${String(opened.editors)} editor(s), terminal ${opened.terminal === null ? 'absent' : 'present'}`);

    for (const arm of ARMS) {
      await cdpEval(cdp, `window.__gmuxP207.hue(${String(arm.hue)})`, 30_000);
      const reading = await cdpEval(cdp, `window.__gmuxP207.ground(${String(arm.lift)})`, 30_000);
      const findings = grade(reading, { hue: arm.hue, lift: arm.lift, dark: arm.dark, shipped });
      report.arms.push({ name: arm.name, reading, findings });
      report.findings += findings.length;
      const p = reading.paint;
      const hex = (sel, key) => domHex(p[sel]?.[key]) ?? 'none';
      say(`${findings.length === 0 ? 'ok  ' : 'FAIL'} ${arm.name}: canvas ${reading.tokens['--bg-canvas']} sidebar ${reading.tokens['--bg-sidebar']} text ${reading.tokens['--text-primary']} dark ${String(reading.textDark)}`);
      say(`     titlebar ${hex('.titlebar', 'background')}/${hex('.titlebar', 'color')}  sidebar ${hex('.sidebar', 'background')}/${hex('.sidebar', 'color')}  tree ${hex('file-tree-container', 'background')}/${hex('file-tree-container', 'color')}  body ${hex('body', 'background')}/${hex('body', 'color')}  terminal ${reading.terminal?.background ?? 'none'}/${reading.terminal?.foreground ?? 'none'}  editor ${hex('.monaco-editor-background', 'background')}/${hex('.monaco-editor', 'color')}`);
      for (const f of findings) say(`     finding: ${f}`);
    }

    // Back to the shipped bytes: the ground first, then the hue.
    await cdpEval(cdp, `window.__gmuxP207.ground(0)`, 30_000);
    const back = await cdpEval(cdp, `window.__gmuxP207.hue(222)`, 30_000);
    const first = report.arms[0].reading;
    const same = JSON.stringify(back.tokens) === JSON.stringify(first.tokens) && back.terminal?.foreground === first.terminal?.foreground && domHex(back.paint['.monaco-editor']?.color) === domHex(first.paint['.monaco-editor']?.color);
    report.back = { same, tokens: back.tokens };
    if (!same) report.findings += 1;
    say(`${same ? 'ok  ' : 'FAIL'} back at 222 with no lift: ${same ? 'every token, the terminal and the editor are the first reading again' : 'the reading differs from the first'}`);
    // Left at a hue other than the default, for the second launch to find.
    await cdpEval(cdp, `window.__gmuxP207.hue(${String(BOOT_HUE)})`, 30_000);
    cdp.close();
  }
).catch((error) => {
  threw = error;
});

// The second launch, after the first has ended and never beside it. The
// tmux server on the socket was ended with the first, so no session comes
// back; the FRAME is what this launch reads.
if (threw === null) {
  await withElectron(
    launch('p207 hue at boot'),
    async () => {
      const cdp = await appWindowLoaded();
      const boot = await cdpEval(cdp, `window.__gmuxP207.read()`, 30_000);
      const findings = grade(boot, { hue: BOOT_HUE, lift: 0, dark: false, frameOnly: true, shipped });
      report.boot = { reading: boot, findings };
      report.findings += findings.length;
      const hex = (sel, key) => domHex(boot.paint[sel]?.[key]) ?? 'none';
      say(`${findings.length === 0 ? 'ok  ' : 'FAIL'} restored at boot, hue ${String(boot.chromeHue)}: canvas ${boot.tokens['--bg-canvas']} sidebar ${boot.tokens['--bg-sidebar']} text ${boot.tokens['--text-primary']}`);
      say(`     titlebar ${hex('.titlebar', 'background')}/${hex('.titlebar', 'color')}  sidebar ${hex('.sidebar', 'background')}/${hex('.sidebar', 'color')}  body ${hex('body', 'background')}/${hex('body', 'color')}`);
      for (const f of findings) say(`     finding: ${f}`);

      // The three settings in every order, from the defaults each time.
      const target = { highlightScheme: 'teal', contrastLevel: 'high', chromeHue: 120 };
      const defaults = { highlightScheme: 'blue', contrastLevel: 'normal', chromeHue: 222 };
      const keys = Object.keys(target);
      const orders = [];
      const permute = (head, rest) => {
        if (rest.length === 0) {
          orders.push(head);
          return;
        }
        for (let i = 0; i < rest.length; i += 1) permute([...head, rest[i]], [...rest.slice(0, i), ...rest.slice(i + 1)]);
      };
      permute([], keys);
      const maps = [];
      for (const order of orders) {
        await cdpEval(cdp, `window.__gmuxP207.appearance(${JSON.stringify(defaults)})`, 30_000);
        let reading = null;
        for (const key of order) reading = await cdpEval(cdp, `window.__gmuxP207.appearance(${JSON.stringify({ [key]: target[key] })})`, 30_000);
        maps.push({ order: order.join(', '), overrides: JSON.stringify(reading.overrides), count: Object.keys(reading.overrides).length, canvas: reading.tokens['--bg-canvas'] });
      }
      const distinct = new Set(maps.map((m) => m.overrides)).size;
      const same = distinct === 1 && maps[0].count > 8;
      report.orders = { maps, same };
      if (!same) report.findings += 1;
      say(`${same ? 'ok  ' : 'FAIL'} teal, high and hue 120 in all ${String(orders.length)} orders: ${String(distinct)} distinct override map(s), ${String(maps[0].count)} token(s) each, canvas ${maps[0].canvas}`);
      if (!same) for (const m of maps) say(`     ${m.order}: ${m.overrides}`);
      await cdpEval(cdp, `window.__gmuxP207.appearance(${JSON.stringify(defaults)})`, 30_000);
      cdp.close();
    }
  ).catch((error) => {
    threw = error;
  });
}

writeFileSync(join(root, 'p207-report.json'), JSON.stringify(report, null, 2));
say(`report: ${join(root, 'p207-report.json')}`);
if (threw !== null) {
  console.error(`${TAG} the run threw: ${threw instanceof Error ? threw.stack ?? threw.message : String(threw)}`);
  process.exit(1);
}
if (report.findings > 0) {
  console.error(`${TAG} ${String(report.findings)} finding(s)`);
  process.exit(1);
}
say(`OK: five readings at four hues and the synthetic ground, six surfaces agreeing on the ground and the text at every one, the shipped bytes back at the end, the hue restored at boot in a second launch, and one override map in every order`);
