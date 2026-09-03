#!/usr/bin/env node
/**
 * probe-p210-ramp.mjs. The frame goes light as well as round, driven in the
 * real app and read off the DOM (Phase 210).
 *
 * About two minutes after the build. TWO Electrons ONE AFTER THE OTHER and
 * never at once, on one scratch profile and the gmux-p210 tmux socket,
 * through build/electron-run.mjs so each whole tree ends in a finally block
 * whatever happens. It spawns no agent, spends no token, opens no keychain,
 * reads nothing under the person's home and touches no profile but its own.
 *
 * THE FIRST LAUNCH is the app shell. It opens one scratch folder, creates one
 * shell session, opens one real file in the editor, and takes SIX readings,
 * every colour read off the DOM as the compositor paints it: the titlebar,
 * the sidebar, the Pierre tree root, the body, the terminal host with its
 * live xterm theme, and the Monaco editor.
 *
 *   1. the shipped frame, shade 0 depth 0: every token is the shipped byte;
 *   2. the darkest frame a person can choose, shade -4 depth 2;
 *   3. the lightest, shade 2 depth 0;
 *   4. the narrowest depth at the shipped shade;
 *   5. the widest depth at the shipped shade;
 *   6. the darkest AND widest together, which is the corner of the region.
 *
 * At each one every neutral is compared to the value this file computes for
 * itself with the FULL culori entry rather than the trimmed one the app
 * ships, the six surfaces must agree on the ground they share, the ramp must
 * read in order off the DOM, and adjacent rungs must render at least two
 * eight bit levels apart. Then the frame goes back to the shipped pair and
 * the reading must be the first one byte for byte, which is the zero
 * override guarantee driven rather than argued.
 *
 * THE FLIP IS OUT OF REACH AND THE PROBE SAYS SO. Phase 210's entry expected
 * the two new controls to make the text flip reachable. They do not: the git
 * decorations on --bg-active stop the ramp at canvas Y 0.0147, measured over
 * every whole degree at hue 186, shade 2, depth -3, against a flip at Y
 * 0.1791; at the shipped hue that lightest canvas reads 0.0138, which is the
 * number this header quoted before the Phase 210 fix round. So this probe reads the polarity at every frame and requires
 * it to stay light, and drives the flip itself through the Phase 207 harness
 * ground, which is still the only thing that reaches it.
 *
 * THE SECOND LAUNCH is the SETTINGS window on the same profile. It reads the
 * Appearance resting face and asserts THAT NO DEGREE IS DRAWN ON IT, which
 * is the operator's second sentence kept answered after a later round; that
 * the eight starting colours are named; that the frame it left behind came
 * back from the settings file; and that a slider pushed past the last stop
 * that keeps the floors STOPS THERE and says why, rather than accepting the
 * move and clamping it.
 *
 * `--self-test` proves the graders on fixtures and launches nothing.
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOCKET = 'gmux-p210';
const TAG = '[p210]';
const say = (line) => console.log(`${TAG} ${line}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const require = createRequire(import.meta.url);
const { converter, clampChroma, formatHex, parse, wcagLuminance } = require('culori');
const toOklch = converter('oklch');
const toRgb = converter('rgb');

// ---------------------------------------------------------------------------
// The expected colours, computed here with the full library.
// ---------------------------------------------------------------------------

const SHADE_STEP = 0.025;
const DEPTH_FACTORS = [0.5, 0.65, 0.8, 1, 1.25, 1.5, 1.75];
const DEPTH_MIN = -3;
const RAMP = ['--bg-sidebar', '--bg-canvas', '--bg-surface', '--bg-raised', '--bg-active'];
const HAIRLINES = ['--border', '--border-active', '--border-strong'];
const NEUTRALS = [...RAMP, ...HAIRLINES];
const clamp01 = (n) => Math.min(1, Math.max(0, n));

function shippedTokens() {
  const css = readFileSync(join(REPO, 'src', 'renderer', 'styles', 'tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const out = {};
  for (const m of css.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].replace(/\s+/g, ' ').trim();
  return out;
}

function hexOf(color) {
  const rgb = toRgb(clampChroma(color, 'oklch'));
  return formatHex({ ...rgb, r: clamp01(rgb.r), g: clamp01(rgb.g), b: clamp01(rgb.b) });
}

/** The eight neutrals at one shade and depth, at the shipped hue. */
function expectedRamp(shipped, shade, depth) {
  const canvasL = toOklch(parse(shipped['--bg-canvas'])).l;
  const anchor = clamp01(canvasL + shade * SHADE_STEP);
  const factor = DEPTH_FACTORS[depth - DEPTH_MIN];
  const out = {};
  for (const token of NEUTRALS) {
    const ok = toOklch(parse(shipped[token]));
    out[token] = shade === 0 && depth === 0
      ? shipped[token]
      : hexOf({ ...ok, l: clamp01(anchor + (ok.l - canvasL) * factor) });
  }
  return out;
}

const domHex = (value) => {
  if (typeof value !== 'string') return null;
  const parsed = parse(value.trim());
  if (parsed === undefined) return null;
  return formatHex(parsed);
};

const byteStep = (a, b) => {
  const x = toRgb(parse(a));
  const y = toRgb(parse(b));
  return Math.round(Math.max(Math.abs(x.r - y.r), Math.abs(x.g - y.g), Math.abs(x.b - y.b)) * 255);
};

// ---------------------------------------------------------------------------
// The graders. Pure, so --self-test can prove them without an Electron.
// ---------------------------------------------------------------------------

/** One frame reading, judged. Returns the findings, empty when it holds. */
export function gradeFrame(reading, want) {
  const findings = [];
  if (reading.chromeShade !== want.shade) findings.push(`the persisted shade is ${String(reading.chromeShade)}, not ${String(want.shade)}`);
  if (reading.chromeDepth !== want.depth) findings.push(`the persisted depth is ${String(reading.chromeDepth)}, not ${String(want.depth)}`);
  for (const token of NEUTRALS) {
    const got = domHex(reading.tokens[token]);
    const expect = domHex(want.expected[token]);
    if (got !== expect) findings.push(`${token} is ${String(got)}, not ${String(expect)}`);
  }
  // The order, read off the DOM rather than off the arithmetic.
  for (const run of [RAMP, HAIRLINES]) {
    for (let i = 1; i < run.length; i += 1) {
      const lo = domHex(reading.tokens[run[i - 1]]);
      const hi = domHex(reading.tokens[run[i]]);
      if (lo === null || hi === null) continue;
      if (!(wcagLuminance(hi) > wcagLuminance(lo))) findings.push(`${run[i]} does not read lighter than ${run[i - 1]}`);
      if (byteStep(lo, hi) < 2) findings.push(`${run[i]} and ${run[i - 1]} render ${String(byteStep(lo, hi))}/255 apart`);
    }
  }
  // The six surfaces agree on the ground they share and on the text.
  const canvas = domHex(reading.tokens['--bg-canvas']);
  const sidebar = domHex(reading.tokens['--bg-sidebar']);
  const text = domHex(reading.tokens['--text-primary']);
  const surface = (selector, key) => domHex(reading.paint[selector]?.[key]);
  const pairs = [
    ['.titlebar', 'background', sidebar],
    ['.sidebar', 'background', sidebar],
    ['file-tree-container', 'background', sidebar],
    ['body', 'background', canvas],
    ['.gmux-terminal-host', 'background', canvas],
    ['.monaco-editor-background', 'background', canvas]
  ];
  for (const [selector, key, expect] of pairs) {
    const got = surface(selector, key);
    if (got === null) {
      findings.push(`${selector} is not mounted`);
      continue;
    }
    if (got !== expect) findings.push(`${selector} paints ${got} where the token says ${String(expect)}`);
  }
  if (reading.terminal !== null) {
    if (domHex(reading.terminal.background) !== canvas) findings.push(`the live xterm background is ${String(domHex(reading.terminal.background))}, not the canvas ${String(canvas)}`);
  } else {
    findings.push('no terminal is mounted');
  }
  const bodyText = surface('body', 'color');
  if (bodyText !== null && bodyText !== text) findings.push(`the body text is ${bodyText} where the token says ${String(text)}`);
  // THE FLIP IS OUT OF REACH: no frame a person can choose reads dark.
  if (reading.textDark) findings.push('the text family read DARK at a frame a person can choose, which no stop should reach');
  return findings;
}

/** The Appearance resting face, judged. */
export function gradeFace(face, want) {
  const findings = [];
  if (face === null) return ['the settings driver returned nothing'];
  if (face.degrees.length > 0) findings.push(`a degree is drawn on the resting face: ${face.degrees.join(', ')}`);
  for (const name of want.names) {
    if (!face.colourNames.includes(name)) findings.push(`the starting colour "${name}" is not on the face`);
  }
  if (face.shade === null) findings.push('no Shade slider on the face');
  else if (face.shade.value !== want.shade) findings.push(`the Shade slider reads ${String(face.shade.value)}, not the persisted ${String(want.shade)}`);
  if (face.depth === null) findings.push('no Depth slider on the face');
  else if (face.depth.value !== want.depth) findings.push(`the Depth slider reads ${String(face.depth.value)}, not the persisted ${String(want.depth)}`);
  if (face.noteAtRest !== '') findings.push(`the refusal line speaks at rest: "${face.noteAtRest}"`);
  if (face.refusedAt === null) findings.push('pushing the Shade slider past its edge was not driven');
  else {
    if (face.refusedAt.value === face.refusedAt.asked) findings.push(`the slider took the refused stop ${String(face.refusedAt.asked)} rather than stopping`);
    if (face.refusedAt.note === '') findings.push('the slider stopped and said nothing');
  }
  return findings;
}

function selfTest() {
  const shipped = shippedTokens();
  const expected = expectedRamp(shipped, 0, 0);
  const ok = (name, findings, want) => {
    const got = findings.length;
    const pass = want === 'clean' ? got === 0 : got > 0;
    say(`${pass ? 'ok  ' : 'FAIL'} self-test ${name}: ${String(got)} finding(s)${got === 0 ? '' : ` (${findings[0]})`}`);
    return pass;
  };
  const good = {
    chromeShade: 0,
    chromeDepth: 0,
    textDark: false,
    tokens: { ...expected, '--text-primary': shipped['--text-primary'] },
    paint: {
      '.titlebar': { background: expected['--bg-sidebar'], color: shipped['--text-primary'] },
      '.sidebar': { background: expected['--bg-sidebar'], color: shipped['--text-primary'] },
      'file-tree-container': { background: expected['--bg-sidebar'], color: shipped['--text-primary'] },
      body: { background: expected['--bg-canvas'], color: shipped['--text-primary'] },
      '.gmux-terminal-host': { background: expected['--bg-canvas'], color: shipped['--text-primary'] },
      '.monaco-editor-background': { background: expected['--bg-canvas'], color: shipped['--text-primary'] }
    },
    terminal: { background: expected['--bg-canvas'], foreground: '#d8dbe2', cursor: '#d8dbe2' }
  };
  const want = { shade: 0, depth: 0, expected };
  let pass = true;
  pass = ok('a clean frame', gradeFrame(good, want), 'clean') && pass;
  pass = ok('a wrong persisted shade', gradeFrame({ ...good, chromeShade: 1 }, want), 'red') && pass;
  pass = ok('a token that did not move', gradeFrame({ ...good, tokens: { ...good.tokens, '--bg-canvas': '#000000' } }, want), 'red') && pass;
  pass = ok('a surface that disagrees', gradeFrame({ ...good, paint: { ...good.paint, body: { background: '#101010', color: '#ffffff' } } }, want), 'red') && pass;
  pass = ok('a terminal that did not follow', gradeFrame({ ...good, terminal: { background: '#131417', foreground: '#fff', cursor: '#fff' } }, { ...want, expected: expectedRamp(shipped, 2, 0) }), 'red') && pass;
  pass = ok('a frame that read dark', gradeFrame({ ...good, textDark: true }, want), 'red') && pass;
  pass = ok('an inverted ramp', gradeFrame({ ...good, tokens: { ...good.tokens, '--bg-sidebar': '#ffffff' } }, want), 'red') && pass;

  const face = {
    degrees: [],
    colourNames: ['Graphite', 'Violet', 'Plum', 'Clay', 'Sand', 'Moss', 'Pine', 'Ocean'],
    shade: { value: -2, min: -4, max: 2 },
    depth: { value: 1, min: -3, max: 3 },
    noteAtRest: '',
    refusedAt: { asked: -4, value: -3, note: 'Darker needs more depth.' }
  };
  const faceWant = { names: ['Graphite', 'Ocean'], shade: -2, depth: 1 };
  pass = ok('a clean face', gradeFace(face, faceWant), 'clean') && pass;
  pass = ok('a degree on the face', gradeFace({ ...face, degrees: ['222°'] }, faceWant), 'red') && pass;
  pass = ok('a missing starting colour', gradeFace({ ...face, colourNames: ['Graphite'] }, faceWant), 'red') && pass;
  pass = ok('a slider that did not restore', gradeFace({ ...face, shade: { value: 0, min: -4, max: 2 } }, faceWant), 'red') && pass;
  pass = ok('a slider that took the refused stop', gradeFace({ ...face, refusedAt: { asked: -4, value: -4, note: 'x' } }, faceWant), 'red') && pass;
  pass = ok('a slider that stopped in silence', gradeFace({ ...face, refusedAt: { asked: -4, value: -3, note: '' } }, faceWant), 'red') && pass;
  pass = ok('a face the driver could not read', gradeFace(null, faceWant), 'red') && pass;
  say(`${pass ? 'ok  ' : 'FAIL'} self-test: 14 fixtures, ${pass ? 'all behaved' : 'one or more did not'}`);
  return pass;
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

const root = realpathSync(mkdtempSync(join(tmpdir(), 'p210-')));
const project = join(root, 'project');
const profile = join(root, 'profile');
const home = join(root, 'home');
for (const dir of [project, profile, home]) mkdirSync(dir, { recursive: true });
const FILE = 'notes.txt';
writeFileSync(join(project, FILE), 'p210\nThe frame goes light as well as round.\n', 'utf8');

const shipped = shippedTokens();

/** The frames driven, all inside the offered region the gate pins. */
const FRAMES = [
  { name: 'the shipped frame', shade: 0, depth: 0 },
  { name: 'the darkest frame', shade: -4, depth: 2 },
  { name: 'the lightest frame', shade: 2, depth: 0 },
  { name: 'the narrowest depth', shade: 0, depth: -3 },
  { name: 'the widest depth', shade: 0, depth: 1 },
  { name: 'dark and wide together', shade: -3, depth: 3 }
];
const BOOT = { shade: -2, depth: 2 };

const report = { frames: [], back: null, flip: null, face: null, findings: 0 };
let threw = null;

const launch = (label, extraEnv = {}) => ({
  label,
  userDataDir: profile,
  tmuxSocket: SOCKET,
  cwd: REPO,
  args: ['--remote-debugging-port=0', '--use-mock-keychain'],
  env: withoutDevRenderer({
    HOME: home,
    GMUX_TMUX_SOCKET: SOCKET,
    GMUX_PROBES: '1',
    GMUX_SHOT: join(root, 'p210-unused.png'),
    GMUX_SHOT_DELAY_MS: '1500000',
    GMUX_SHOT_POPUP_PICK: 'p210 no row carries this label',
    ...extraEnv
  }),
  ceilingMs: 10 * 60 * 1000,
  echo: false
});

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

await withElectron(launch('p210 ramp'), async () => {
  const { cdp, url } = await cdpForAppWindow(120_000);
  say(`the app window is at ${url}`);
  await cdp.call('Runtime.enable');
  for (;;) {
    const done = await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`);
    if (done > 0) break;
    await sleep(100);
  }
  await cdpEval(cdp, `window.__gmuxP95.openLocal(${JSON.stringify(project)}).then(() => true)`, 90_000);
  await cdpEval(cdp, `window.__gmuxP95.create({ name: 'p210', agent: 'shell' }).then(() => true)`, 120_000);
  const opened = await cdpEval(
    cdp,
    `window.__gmuxP207.openFile(${JSON.stringify({ repoPath: project, relPath: FILE, path: join(project, FILE) })})`,
    120_000
  );
  say(`a session and an editor are up: ${String(opened.editors)} editor(s), terminal ${opened.terminal === null ? 'absent' : 'present'}`);

  for (const frame of FRAMES) {
    const reading = await cdpEval(
      cdp,
      `window.__gmuxP207.appearance({ chromeShade: ${String(frame.shade)}, chromeDepth: ${String(frame.depth)} })`,
      30_000
    );
    const expected = expectedRamp(shipped, frame.shade, frame.depth);
    const findings = gradeFrame(reading, { shade: frame.shade, depth: frame.depth, expected });
    report.frames.push({ name: frame.name, shade: frame.shade, depth: frame.depth, reading, findings });
    report.findings += findings.length;
    const hex = (sel, key) => domHex(reading.paint[sel]?.[key]) ?? 'none';
    say(`${findings.length === 0 ? 'ok  ' : 'FAIL'} ${frame.name} (shade ${String(frame.shade)}, depth ${String(frame.depth)}): canvas ${reading.tokens['--bg-canvas']} sidebar ${reading.tokens['--bg-sidebar']} active ${reading.tokens['--bg-active']} border ${reading.tokens['--border']} text ${reading.tokens['--text-primary']} dark ${String(reading.textDark)}`);
    say(`     titlebar ${hex('.titlebar', 'background')}/${hex('.titlebar', 'color')}  sidebar ${hex('.sidebar', 'background')}/${hex('.sidebar', 'color')}  tree ${hex('file-tree-container', 'background')}/${hex('file-tree-container', 'color')}  body ${hex('body', 'background')}/${hex('body', 'color')}  terminal ${reading.terminal?.background ?? 'none'}/${reading.terminal?.foreground ?? 'none'}  editor ${hex('.monaco-editor-background', 'background')}/${hex('.monaco-editor', 'color')}`);
    for (const f of findings) say(`     finding: ${f}`);
  }

  // The flip, which no stop reaches, driven through the Phase 207 ground so
  // the rule stays exercised in the real app rather than only under node.
  await cdpEval(cdp, `window.__gmuxP207.appearance({ chromeShade: 0, chromeDepth: 0 })`, 30_000);
  const flipped = await cdpEval(cdp, `window.__gmuxP207.ground(0.6)`, 30_000);
  const flipFindings = [];
  if (!flipped.textDark) flipFindings.push('the synthetic ground did not flip the text');
  const flipText = domHex(flipped.paint['body']?.color);
  const flipGround = domHex(flipped.tokens['--bg-canvas']);
  if (flipText !== null && flipGround !== null && wcagLuminance(flipText) >= wcagLuminance(flipGround)) {
    flipFindings.push(`the body text ${flipText} is not darker than its ground ${flipGround}`);
  }
  report.flip = { reading: flipped, findings: flipFindings };
  report.findings += flipFindings.length;
  say(`${flipFindings.length === 0 ? 'ok  ' : 'FAIL'} the flip, reached only by the harness ground: canvas ${flipped.tokens['--bg-canvas']} text ${flipped.tokens['--text-primary']} terminal ${flipped.terminal?.foreground ?? 'none'} dark ${String(flipped.textDark)}`);
  for (const f of flipFindings) say(`     finding: ${f}`);

  // Back to the shipped pair with no lift: the first reading again, exactly.
  await cdpEval(cdp, `window.__gmuxP207.ground(0)`, 30_000);
  const back = await cdpEval(cdp, `window.__gmuxP207.appearance({ chromeShade: 0, chromeDepth: 0 })`, 30_000);
  const first = report.frames[0].reading;
  const same =
    JSON.stringify(back.tokens) === JSON.stringify(first.tokens) &&
    back.terminal?.foreground === first.terminal?.foreground &&
    Object.keys(back.overrides).length === 0;
  report.back = { same, tokens: back.tokens, overrides: Object.keys(back.overrides).length };
  if (!same) report.findings += 1;
  say(`${same ? 'ok  ' : 'FAIL'} back at the shipped frame: ${same ? 'every token is the first reading again and the override map is empty' : `the reading differs, ${String(Object.keys(back.overrides).length)} override(s)`}`);

  // Left off the default, for the second launch to find on the face.
  await cdpEval(cdp, `window.__gmuxP207.appearance({ chromeShade: ${String(BOOT.shade)}, chromeDepth: ${String(BOOT.depth)} })`, 30_000);
  cdp.close();
}).catch((error) => {
  threw = error;
});

// ---------------------------------------------------------------------------
// The second launch: the SETTINGS window, on the same profile, after the
// first has ended and never beside it.
// ---------------------------------------------------------------------------

const FACE_JS = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const nav = [...document.querySelectorAll('button, [role="tab"], a')].find((el) => (el.textContent || '').trim() === 'Appearance');
  if (nav) nav.click();
  await wait(1200);
  const section = document.querySelector('section[aria-label="Appearance"]');
  if (!section) return JSON.stringify(null);
  const html = section.innerHTML;
  const text = section.innerText || '';
  const degrees = (text.match(/[0-9]+\\s*\\u00b0/g) || []).concat(html.includes('\\u00b0') && !(text.match(/\\u00b0/g) || []).length ? ['a degree in the markup'] : []);
  const colourNames = [...section.querySelectorAll('.set-frame-color-name')].map((el) => el.textContent.trim());
  const readSlider = (label) => {
    const el = section.querySelector('input[aria-label="' + label + '"]');
    return el === null ? null : { value: Number(el.value), min: Number(el.min), max: Number(el.max) };
  };
  const noteOf = (label) => {
    const el = section.querySelector('input[aria-label="' + label + '"]');
    if (el === null) return '';
    const note = el.parentElement.querySelector('.set-frame-note');
    if (note === null) return '';
    return note.classList.contains('blank') ? '' : note.textContent.trim();
  };
  const face = {
    degrees,
    colourNames,
    shade: readSlider('Shade'),
    depth: readSlider('Depth'),
    noteAtRest: noteOf('Shade') + noteOf('Depth'),
    refusedAt: null
  };
  // The native value setter plus an input event is how React sees a real drag.
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  const drag = async (label, value) => {
    const el = section.querySelector('input[aria-label="' + label + '"]');
    if (el === null) return null;
    setter.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(900);
    return Number(section.querySelector('input[aria-label="' + label + '"]').value);
  };
  // NARROW THE DEPTH FIRST. At the widest depths the darkest shade is legal,
  // so a refusal has to be asked for where one exists: at the narrowest depth
  // the ramp runs out of eight bit room long before the shade axis does.
  face.depthAfterNarrow = await drag('Depth', -3);
  const asked = -4;
  const took = await drag('Shade', asked);
  face.refusedAt = { asked, value: took, edge: null, note: noteOf('Shade') };
  return JSON.stringify(face);
})()`;

if (threw === null) {
  await withElectron(
    launch('p210 the resting face', {
      GMUX_SHOT_SETTINGS: '1',
      GMUX_SHOT_SETTINGS_JS: FACE_JS,
      GMUX_SHOT_DELAY_MS: '9000'
    }),
    (handle) =>
      new Promise((done) => {
        let out = '';
        handle.child.stdout.on('data', (c) => {
          out += String(c);
        });
        handle.child.stderr.on('data', (c) => {
          out += String(c);
        });
        handle.child.on('exit', () => {
          const marker = '[gmux-shot] driver';
          const line = out.split('\n').find((l) => l.includes(marker)) ?? '';
          const payload = line.slice(line.indexOf(marker) + marker.length).replace(/^\s*→\s*/, '').trim();
          let face = null;
          try {
            face = JSON.parse(JSON.parse(payload));
          } catch {
            try {
              face = JSON.parse(payload);
            } catch {
              face = null;
            }
          }
          report.face = face;
          done();
        });
      })
  ).catch((error) => {
    threw = error;
  });
}

if (threw === null) {
  const NAMES = ['Graphite', 'Violet', 'Plum', 'Clay', 'Sand', 'Moss', 'Pine', 'Ocean'];
  const findings = gradeFace(report.face, { names: NAMES, shade: BOOT.shade, depth: BOOT.depth });
  if (report.face !== null && report.face.refusedAt !== null) {
    const { asked, value, note } = report.face.refusedAt;
    const bad = value === asked || note === '';
    say(`${bad ? 'FAIL' : 'ok  '} the refusal at the control: with the depth narrowed to ${String(report.face.depthAfterNarrow)}, the Shade slider was asked for ${String(asked)}, stopped at ${String(value)}, and said "${note}"`);
  }
  report.findings += findings.length;
  say(`${findings.length === 0 ? 'ok  ' : 'FAIL'} the resting face: ${report.face === null ? 'unread' : `${String(report.face.degrees.length)} degree(s) drawn, ${String(report.face.colourNames.length)} named colours (${(report.face.colourNames || []).join(', ')}), Shade ${String(report.face.shade?.value)} of ${String(report.face.shade?.min)}..${String(report.face.shade?.max)}, Depth ${String(report.face.depth?.value)} of ${String(report.face.depth?.min)}..${String(report.face.depth?.max)}`}`);
  for (const f of findings) say(`     finding: ${f}`);
}

writeFileSync(join(root, 'p210-report.json'), JSON.stringify(report, null, 2), 'utf8');
say(`the report is at ${join(root, 'p210-report.json')}`);
if (threw !== null) {
  console.error(`${TAG} the run threw: ${String(threw)}`);
  process.exit(1);
}
say(report.findings === 0 ? 'OK: every frame agrees on all six surfaces, the ramp keeps its order, the flip is out of reach, no degree is drawn and a refused stop is refused at the control' : `${String(report.findings)} finding(s)`);
process.exit(report.findings === 0 ? 0 : 1);
