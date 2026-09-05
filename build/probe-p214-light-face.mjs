#!/usr/bin/env node
/**
 * probe-p214-light-face.mjs. ONE app run for Phase 214, on ONE Electron over
 * a scratch profile and the gmux-p214 tmux socket. It spawns no agent, spends
 * no token, opens no keychain and reads nothing under the person's home: the
 * repository it opens is one it builds itself under a scratch directory.
 *
 * ## WHAT IT DRIVES, in one session
 *
 *   1  the Appearance face on the DARK base: both stop sliders drawn, at the
 *      frame the person is holding
 *   2  the same face after choosing Light: the Shade row ABSENT, with no
 *      refusal sentence left behind, and the Depth row still drawn and still
 *      speaking
 *   3  the settings FILE across the visit: the shade chosen on dark is not
 *      written by anything on paper
 *   4  the commit graph on paper at SIX LIVE LANES in one row, read off the
 *      DOM as computed strokes and photographed
 *   5  choosing Dark again: the Shade row back, at the stop that was carried
 *      the whole time, and the file still holding it
 *
 * Step 4 is the case Phase 213 stated its limit at and could not fix in the
 * rotation: below six lanes the soft-avoidance map always has a free hue to
 * take, and at six it has none, so the pair it was avoiding gets drawn. The
 * fixture repository is built here with an octopus merge of six branches
 * precisely so that row exists.
 *
 * ## SAFETY
 *
 * Every Electron is started through build/electron-run.mjs, which ends the
 * tree it started in a `finally` block whatever happened, and ends the tmux
 * server on this script's own socket with it. Nothing else is spawned that
 * outlives a call. `--self-test` proves the graders on fixtures and launches
 * nothing at all.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOCKET = 'gmux-p214';
const TAG = '[p214]';
const say = (line) => console.log(`${TAG} ${line}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The seven light lane hues, as tokens.css declares them after Phase 214. */
const LIGHT_LANES = ['#2175bd', '#b62926', '#004f4e', '#823c00', '#613374', '#2c6a3b'];
/** The separation two lanes must clear, in the metric research 24 section 7 used. */
const LANE_FLOOR = 32;

// ---------------------------------------------------------------------------
// Colour arithmetic and the dichromat simulation, small and its own.
// ---------------------------------------------------------------------------

function rgbOf(value) {
  if (typeof value !== 'string') return null;
  const hex = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (hex) return [parseInt(hex[1].slice(0, 2), 16), parseInt(hex[1].slice(2, 4), 16), parseInt(hex[1].slice(4, 6), 16)];
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(value.trim());
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}
const hexOf = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
const lin = (v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
const enc = (l) => {
  const v = Math.min(1, Math.max(0, l));
  return Math.round((v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055) * 255);
};
function simulate(rgb, kind) {
  const [r, g, b] = rgb.map(lin);
  const L = 17.8824 * r + 43.5161 * g + 4.11935 * b;
  const M = 3.45565 * r + 27.1554 * g + 3.86714 * b;
  const S = 0.0299566 * r + 0.184309 * g + 1.46709 * b;
  const l2 = kind === 'protan' ? 2.02344 * M - 2.52581 * S : L;
  const m2 = kind === 'deutan' ? 0.494207 * L + 1.24827 * S : M;
  return [
    enc(0.0809444479 * l2 - 0.130504409 * m2 + 0.116721066 * S),
    enc(-0.0102485335 * l2 + 0.0540193266 * m2 - 0.113614708 * S),
    enc(-0.000365296938 * l2 - 0.00412161469 * m2 + 0.693511405 * S)
  ];
}
function separation(a, b) {
  const one = (kind) => {
    const x = simulate(a, kind);
    const y = simulate(b, kind);
    return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
  };
  return Math.min(one('protan'), one('deutan'));
}

// ---------------------------------------------------------------------------
// The graders. Pure, so --self-test can prove them without an Electron.
// ---------------------------------------------------------------------------

/**
 * STEP 1, 2 AND 5: the Appearance face on each base.
 *
 * On graphite both stop sliders are drawn. On paper the region is one shade
 * row, so the Shade row is ABSENT and carries no sentence, and the Depth row
 * is drawn and does. And the face must draw the frame the window draws: on
 * paper the shipped stop, on graphite the one the person chose.
 */
export function gradeFaces(read) {
  const findings = [];
  if (read === null || read === undefined) return ['the faces were not read'];
  const dark = read.onDark;
  const light = read.onLight;
  const back = read.backOnDark;
  if (dark === null || dark === undefined) return ['the dark face was not read'];
  if (light === null || light === undefined) return ['the light face was not read'];
  if (back === null || back === undefined) return ['the face after choosing Dark again was not read'];
  for (const [name, face] of [['on dark', dark], ['back on dark', back]]) {
    if (face.shade === null) findings.push(`${name} the Shade row is not drawn, where seven stops are offered`);
    else if (face.shade.value !== -2) findings.push(`${name} the Shade slider reads ${String(face.shade.value)} rather than the -2 that was chosen`);
    if (face.depth === null) findings.push(`${name} the Depth row is not drawn`);
    else if (face.depth.value !== 3) findings.push(`${name} the Depth slider reads ${String(face.depth.value)} rather than the 3 that was chosen`);
    // `applyAppearance` REMOVES the attribute on graphite rather than
    // setting it to 'dark', because the dark palette is what tokens.css
    // declares on the bare `:root`. So the reading for graphite is its
    // ABSENCE, and asking for the word 'dark' here would be asking for a
    // thing the product has never written.
    if (face.scheme !== null) findings.push(`${name} the window root carries data-scheme="${String(face.scheme)}", where graphite removes the attribute`);
  }
  if (light.shade !== null) findings.push(`on paper the Shade row is drawn, reading ${String(light.shade.value)}, where the region is one shade row`);
  if ((light.shadeNote ?? '') !== '') findings.push(`on paper a hidden Shade control still says "${String(light.shadeNote)}"`);
  if (light.depth === null) findings.push('on paper the Depth row is not drawn, where four stops are offered');
  else if (light.depth.value !== 0) findings.push(`on paper the Depth slider reads ${String(light.depth.value)} rather than the stop the base draws`);
  if (light.depthAsked === null || light.depthAsked === undefined) findings.push('the Depth slider on paper was never pushed, so its refusal line was never asked for');
  else if (light.depthTook !== light.depth?.value) findings.push(`on paper the Depth slider was asked for ${String(light.depthAsked)} and TOOK ${String(light.depthTook)}, where the range ends at ${String(light.depth?.value)}`);
  if (!/depth/i.test(light.depthNote ?? '')) findings.push(`on paper the Depth refusal line reads "${String(light.depthNote)}"`);
  if (light.scheme !== 'light') findings.push(`the Settings window root is ${String(light.scheme)} rather than light`);
  // The rows the face draws, counted, so a third row appearing is a finding
  // rather than something nobody looked at.
  if (dark.rows !== 2) findings.push(`the dark face draws ${String(dark.rows)} stop slider row(s) rather than two`);
  if (light.rows !== 1) findings.push(`the light face draws ${String(light.rows)} stop slider row(s) rather than one`);
  return findings;
}

/**
 * STEP 3 AND 5: the settings FILE across the visit.
 *
 * `frameForBase` brings a frame paper cannot draw to one it can and persists
 * nothing, so the file must hold the chosen frame at every reading, and Dark
 * must come back to it exactly.
 */
export function gradeRoundTrip(read) {
  const findings = [];
  if (read === null || read === undefined) return ['the settings file was not read'];
  for (const step of ['start', 'onLight', 'afterGraph', 'backOnDark']) {
    const at = read[step];
    if (at === null || at === undefined) {
      findings.push(`the settings file was not read ${step}`);
      continue;
    }
    if (at.chromeShade !== -2) findings.push(`${step} the persisted shade is ${String(at.chromeShade)} rather than the -2 that was chosen on dark`);
    if (at.chromeDepth !== 3) findings.push(`${step} the persisted depth is ${String(at.chromeDepth)} rather than the 3 that was chosen on dark`);
  }
  if (read.onLight?.colorScheme !== 'light') findings.push(`the scheme on paper reads ${String(read.onLight?.colorScheme)}`);
  if (read.backOnDark?.colorScheme !== 'dark') findings.push(`the scheme after choosing Dark reads ${String(read.backOnDark?.colorScheme)}`);
  return findings;
}

/**
 * STEP 4: the graph on paper at six live lanes.
 *
 * Every lane stroke the app painted is read as a computed colour off the DOM,
 * so what is judged is what a person sees rather than what a token file says.
 * The row with the most live lanes must reach six, every colour must be one
 * of the light palette's own, and NO PAIR on that row may fall under the
 * separation floor under the simulation above. That is the case Phase 213
 * could not reach from the rotation.
 */
export function gradeLanes(read) {
  const findings = [];
  if (read === null || read === undefined) return ['the graph was not read'];
  if (read.rows === undefined || read.rows === null || read.rows.length === 0) return ['no graph row was drawn at all'];
  const palette = new Set(LIGHT_LANES);
  let widest = { live: 0, colors: [] };
  for (const row of read.rows) {
    const colors = [...new Set((row.colors ?? []).map((c) => {
      const rgb = rgbOf(c);
      return rgb === null ? String(c) : hexOf(rgb);
    }))];
    if (colors.length > widest.live) widest = { live: colors.length, colors };
    for (const hex of colors) {
      if (!palette.has(hex)) findings.push(`a lane is painted ${hex}, which is not one of the light palette's six`);
    }
  }
  if (widest.live < 6) findings.push(`the widest row carries ${String(widest.live)} live lane colour(s), so six live lanes were never drawn`);
  let worst = { sep: Number.POSITIVE_INFINITY, pair: '' };
  for (let i = 0; i < widest.colors.length; i += 1) {
    for (let j = i + 1; j < widest.colors.length; j += 1) {
      const a = rgbOf(widest.colors[i]);
      const b = rgbOf(widest.colors[j]);
      if (a === null || b === null) continue;
      const sep = separation(a, b);
      if (sep < worst.sep) worst = { sep, pair: `${widest.colors[i]} and ${widest.colors[j]}` };
      if (sep < LANE_FLOOR) {
        findings.push(`on the widest row ${widest.colors[i]} and ${widest.colors[j]} are ${sep.toFixed(1)} apart under dichromacy, under the floor of ${String(LANE_FLOOR)}`);
      }
    }
  }
  if (read.shot !== true) findings.push('the graph was not photographed');
  // A photograph of a collapsed sidebar would be a photograph of nothing.
  const box = read.onScreen;
  if (box === null || box === undefined) findings.push('the graph has no box, so it was not on screen when it was photographed');
  else if (box.w <= 0 || box.h <= 0 || box.x < 0) findings.push(`the graph's box is ${String(box.w)}x${String(box.h)} at ${String(box.x)},${String(box.y)}, so the sidebar was shut when it was photographed`);
  if (read.railPressed !== 'true') findings.push(`the Source control item reads aria-pressed=${String(read.railPressed)}, so the panel that was read was not the one on screen`);
  read.worstPair = worst;
  return findings;
}

function selfTest() {
  let pass = true;
  const ok = (name, findings, want) => {
    const got = findings.length;
    const good = want === 'clean' ? got === 0 : got > 0;
    if (!good) pass = false;
    say(`${good ? 'ok  ' : 'FAIL'} self-test ${name}: ${String(got)} finding(s)${got === 0 ? '' : ` (${findings[0]})`}`);
  };
  const faces = {
    onDark: { scheme: null, shade: { value: -2 }, depth: { value: 3 }, shadeNote: 'x', depthNote: 'y', rows: 2, depthAsked: null, depthTook: null },
    onLight: { scheme: 'light', shade: null, depth: { value: 0 }, shadeNote: '', depthNote: 'More depth puts the file colors under their contrast floor.', rows: 1, depthAsked: 1, depthTook: 0 },
    backOnDark: { scheme: null, shade: { value: -2 }, depth: { value: 3 }, shadeNote: 'x', depthNote: 'y', rows: 2, depthAsked: null, depthTook: null }
  };
  ok('a clean pair of faces', gradeFaces(faces), 'clean');
  ok('nothing read at all', gradeFaces(null), 'red');
  ok('a Shade row drawn on paper', gradeFaces({ ...faces, onLight: { ...faces.onLight, shade: { value: 0 }, rows: 2 } }), 'red');
  ok('a hidden Shade control still speaking', gradeFaces({ ...faces, onLight: { ...faces.onLight, shadeNote: 'Darker puts the accent under its contrast floor.' } }), 'red');
  ok('the Depth row gone from paper too', gradeFaces({ ...faces, onLight: { ...faces.onLight, depth: null, rows: 0 } }), 'red');
  ok('the Shade row gone from graphite', gradeFaces({ ...faces, onDark: { ...faces.onDark, shade: null, rows: 1 } }), 'red');
  ok('the face drawing a shade nobody chose', gradeFaces({ ...faces, backOnDark: { ...faces.backOnDark, shade: { value: 0 } } }), 'red');
  ok('graphite stamping a data-scheme of its own', gradeFaces({ ...faces, backOnDark: { ...faces.backOnDark, scheme: 'dark' } }), 'red');
  ok('the Depth slider on paper never pushed', gradeFaces({ ...faces, onLight: { ...faces.onLight, depthAsked: null, depthTook: null } }), 'red');
  ok('a Depth push on paper that was taken', gradeFaces({ ...faces, onLight: { ...faces.onLight, depthTook: 1 } }), 'red');
  const trip = {
    start: { chromeShade: -2, chromeDepth: 3, colorScheme: 'dark' },
    onLight: { chromeShade: -2, chromeDepth: 3, colorScheme: 'light' },
    afterGraph: { chromeShade: -2, chromeDepth: 3, colorScheme: 'light' },
    backOnDark: { chromeShade: -2, chromeDepth: 3, colorScheme: 'dark' }
  };
  ok('a clean round trip', gradeRoundTrip(trip), 'clean');
  ok('a shade overwritten on paper', gradeRoundTrip({ ...trip, onLight: { chromeShade: 0, chromeDepth: 3, colorScheme: 'light' } }), 'red');
  ok('a depth overwritten while the graph was read', gradeRoundTrip({ ...trip, afterGraph: { chromeShade: -2, chromeDepth: 0, colorScheme: 'light' } }), 'red');
  ok('a scheme that never changed', gradeRoundTrip({ ...trip, onLight: { chromeShade: -2, chromeDepth: 3, colorScheme: 'dark' } }), 'red');
  ok('a round trip that was not read', gradeRoundTrip(null), 'red');
  const onScreen = { w: 14, h: 22, x: 96, y: 210 };
  const wide = { rows: [{ colors: LIGHT_LANES.map((h) => `rgb(${rgbOf(h).join(', ')})`) }], shot: true, onScreen, railPressed: 'true' };
  ok('six lanes that stay apart', gradeLanes(wide), 'clean');
  ok('a graph that never drew', gradeLanes({ rows: [], shot: true, onScreen, railPressed: 'true' }), 'red');
  ok('a graph photographed with the sidebar shut', gradeLanes({ ...wide, onScreen: { w: 0, h: 0, x: 0, y: 0 } }), 'red');
  ok('a graph read off a panel the rail had closed', gradeLanes({ ...wide, railPressed: 'false' }), 'red');
  ok('a graph that was not photographed', gradeLanes({ ...wide, shot: false }), 'red');
  ok('only five lanes ever live', gradeLanes({ rows: [{ colors: LIGHT_LANES.slice(0, 5) }], shot: true, onScreen, railPressed: 'true' }), 'red');
  ok('a lane painted a colour the palette does not have', gradeLanes({ rows: [{ colors: [...LIGHT_LANES.slice(0, 5), '#123456'] }], shot: true, onScreen, railPressed: 'true' }), 'red');
  // The palette Phase 213 shipped, on the same row: the brown and the green
  // at 12.4. This is the fixture that proves the grader can see the defect.
  ok(
    'the palette Phase 213 shipped, at six live lanes',
    gradeLanes({ rows: [{ colors: ['#2175bd', '#b23534', '#004f4e', '#833e00', '#613374', '#00530e'] }], shot: true, onScreen, railPressed: 'true' }),
    'red'
  );
  // And the simulation itself, on facts that are not this file's own.
  const sim = [];
  if (simulate(rgbOf('#808080'), 'protan').join(',') !== '128,128,128') sim.push('a neutral moved under protanopia');
  if (Math.abs(separation(rgbOf('#833e00'), rgbOf('#00530e')) - 12.4) > 0.05) sim.push("Phase 213's 12.4 does not come back");
  if (Math.abs(separation(rgbOf('#4d9de8'), rgbOf('#d19fe8')) - 21.2) > 0.05) sim.push('research 24 section 7.4 21.2 does not come back');
  ok('the simulation reproduces the numbers this codebase publishes', sim, 'clean');
  say(`${pass ? 'ok  ' : 'FAIL'} self-test: 24 fixtures, ${pass ? 'all behaved' : 'one or more did not'}`);
  return pass;
}

if (process.argv.includes('--self-test')) {
  process.exit(selfTest() ? 0 : 1);
}

// ---------------------------------------------------------------------------
// The app run.
// ---------------------------------------------------------------------------

const { withElectron, withoutDevRenderer } = await import(join(REPO, 'build', 'electron-run.mjs'));
const { connectBrowser, pageSession } = await import(join(REPO, 'build', 'cdp-sessions.mjs'));

if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} out/main/index.js is missing. Run npm run build.`);
  process.exit(2);
}

const root = realpathSync(mkdtempSync(join(tmpdir(), 'p214-')));
const project = join(root, 'six-lanes');
const profile = join(root, 'profile');
const home = join(root, 'home');
const shots = join(root, 'shots');
for (const d of [project, profile, home, shots]) mkdirSync(d, { recursive: true });

/**
 * A repository whose graph really reaches SIX LIVE LANES in one row: a root,
 * six branches with a commit each, and an octopus merge of all six. The row
 * under the merge carries six lanes at once, which is the case the rotation
 * cannot rescue and the palette had to.
 */
const git = (...a) =>
  execFileSync('git', ['-C', project, ...a], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }
  });
writeFileSync(join(project, 'README.md'), '# six-lanes\n\nA scratch repository for the Phase 214 app run.\n');
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p214@example.invalid');
git('config', 'user.name', 'p214');
git('add', '-A');
git('commit', '-q', '-m', 'seed');
const branches = ['one', 'two', 'three', 'four', 'five', 'six'];
for (const name of branches) {
  git('checkout', '-q', '-b', name, 'main');
  writeFileSync(join(project, `${name}.txt`), `lane ${name}\n`);
  git('add', '-A');
  git('commit', '-q', '-m', `lane ${name} opens`);
  writeFileSync(join(project, `${name}.txt`), `lane ${name}\nand a second commit on it\n`);
  git('add', '-A');
  git('commit', '-q', '-m', `lane ${name} carries on`);
}
git('checkout', '-q', 'main');
git('merge', '-q', '--no-edit', '-m', 'the six lanes come together', ...branches);

const report = { steps: [], findings: 0 };
let threw = null;

const launch = (label) => ({
  label,
  userDataDir: profile,
  tmuxSocket: SOCKET,
  cwd: REPO,
  args: ['--remote-debugging-port=0', '--use-mock-keychain', '--inspect=0'],
  env: withoutDevRenderer({
    HOME: home,
    GMUX_TMUX_SOCKET: SOCKET,
    GMUX_PROBES: '1',
    GMUX_SHOT: join(root, 'p214-unused.png'),
    GMUX_SHOT_DELAY_MS: '1500000',
    GMUX_SPECSTORY_NO_CLOUD: '1'
  }),
  ceilingMs: 10 * 60 * 1000,
  echo: false
});

async function browserEndpoint(timeoutMs = 120_000) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      port = 0;
    }
    if (port > 0) {
      try {
        const v = await (await fetch(`http://127.0.0.1:${String(port)}/json/version`)).json();
        if (v.webSocketDebuggerUrl) return { cdp: await connectBrowser(v.webSocketDebuggerUrl), port };
      } catch {
        /* not yet */
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no devtools endpoint in time');
    await sleep(20);
  }
}

const attached = new Map();
function watchTargets(cdp) {
  cdp.on((m) => {
    if (m.method === 'Target.attachedToTarget') {
      attached.set(m.params.targetInfo.targetId, m.params.sessionId);
      if (m.params.waitingForDebugger) {
        void cdp.call('Runtime.runIfWaitingForDebugger', {}, m.params.sessionId).catch(() => {});
      }
    }
  });
}

async function pageFor(cdp, match, timeoutMs = 90_000) {
  const started = Date.now();
  for (;;) {
    const { targetInfos } = await cdp.call('Target.getTargets');
    const page = targetInfos.find((t) => t.type === 'page' && match.test(t.url));
    if (page) {
      let sid = attached.get(page.targetId);
      if (!sid) {
        const r = await cdp.call('Target.attachToTarget', { targetId: page.targetId, flatten: true });
        sid = r.sessionId;
        attached.set(page.targetId, sid);
      }
      return pageSession(cdp, sid);
    }
    if (Date.now() - started > timeoutMs) throw new Error(`no page matching ${String(match)}`);
    await sleep(100);
  }
}

/**
 * The Appearance face, read off the Settings window's own DOM.
 *
 * `pushDepthTo` is a stop to ASK THE DEPTH SLIDER FOR before the reading is
 * taken, or null for no push. The refusal line is not on the resting face:
 * `StopSliderRow` draws it only once a move has been refused, which is the
 * Phase 174.1 rule and the reason a probe that only looked found an empty
 * string. So paper is asked for a stop it cannot give, and what comes back
 * is the stop it stayed at and the sentence it then says. A refused move
 * writes nothing, which is what the settings file read straight after this
 * one proves.
 */
const FACE_JS = (pushDepthTo) => `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const nav = [...document.querySelectorAll('button, [role="tab"], a')].find((el) => (el.textContent || '').trim() === 'Appearance');
  if (nav) nav.click();
  await wait(1000);
  const section = document.querySelector('section[aria-label="Appearance"]');
  if (!section) return JSON.stringify(null);
  const read = (label) => { const el = section.querySelector('input[aria-label="' + label + '"]'); return el === null ? null : { value: Number(el.value), min: Number(el.min), max: Number(el.max) }; };
  const note = (label) => { const el = section.querySelector('input[aria-label="' + label + '"]'); if (el === null) return ''; const n = el.parentElement.querySelector('.set-frame-note'); if (n === null) return ''; return n.classList.contains('blank') ? '' : n.textContent.trim(); };
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  const ask = async (label, value) => { const el = section.querySelector('input[aria-label="' + label + '"]'); if (el === null) return null; setter.call(el, String(value)); el.dispatchEvent(new Event('input', { bubbles: true })); await wait(900); const back = section.querySelector('input[aria-label="' + label + '"]'); return back === null ? null : Number(back.value); };
  const askedDepth = ${String(pushDepthTo === null || pushDepthTo === undefined ? 'null' : String(pushDepthTo))};
  const depthTook = askedDepth === null ? null : await ask('Depth', askedDepth);
  return JSON.stringify({
    depthAsked: askedDepth,
    depthTook,
    shade: read('Shade'),
    depth: read('Depth'),
    shadeNote: note('Shade'),
    depthNote: note('Depth'),
    rows: [...section.querySelectorAll('input.set-hue-slider[aria-label="Shade"], input.set-hue-slider[aria-label="Depth"]')].length,
    scheme: document.documentElement.getAttribute('data-scheme')
  });
})()`;

/** Choose one segment of the Scheme control, with a real click. */
const CHOOSE_JS = (label) => `(async () => {
  const group = document.querySelector('[role="radiogroup"][aria-label="Scheme"]');
  const one = group === null ? null : [...group.querySelectorAll('[role="radio"]')].find((r) => r.getAttribute('aria-label') === '${label}');
  if (one === null) return false;
  one.click();
  await new Promise((r) => setTimeout(r, 2500));
  return true;
})()`;

/** The commit graph, read as computed strokes, one entry per drawn row. */
const GRAPH_JS = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // THE RAIL ITEM IS A TOGGLE ON THE VIEW THAT IS ALREADY SHOWING, and
  // 'scm' is SIDEBAR_VIEW_DEFAULT, so a blind click here COLLAPSES the
  // sidebar rather than opening it. The lanes stay mounted when it does, so
  // the reading still succeeds and the photograph shows an empty window,
  // which is how the first run of this probe read six lanes off a sidebar
  // nobody could see. It is pressed only when it says it is not pressed.
  const rail = [...document.querySelectorAll('[data-slot="activity-bar"] .ab-item')].find((b) => (b.getAttribute('aria-label') || '').startsWith('Source control'));
  if (rail !== undefined && rail.getAttribute('aria-pressed') !== 'true') rail.click();
  // The History section carries the graph and it can be collapsed, so its own
  // toggle is pressed when it says it is closed. The wait is for a LANE and
  // not for the section, because the section exists before git has answered.
  for (let i = 0; i < 90; i += 1) {
    const toggle = document.querySelector('[data-section-root="history"] .section-toggle');
    if (toggle !== null && toggle.getAttribute('aria-expanded') === 'false') toggle.click();
    if (document.querySelector('[data-section-root="history"] .scm-graph-lane')) break;
    await wait(500);
  }
  const rows = [];
  for (const svg of document.querySelectorAll('[data-section-root="history"] svg.scm-graph')) {
    const colors = [];
    for (const path of svg.querySelectorAll('.scm-graph-lane')) {
      colors.push(getComputedStyle(path).stroke);
    }
    if (colors.length > 0) rows.push({ colors, hues: [...svg.querySelectorAll('[data-hue]')].map((el) => Number(el.getAttribute('data-hue'))) });
  }
  // AND WHERE IT IS ON SCREEN, so the photograph is provably of the thing
  // that was read rather than of a window with the sidebar shut.
  const first = document.querySelector('[data-section-root="history"] svg.scm-graph');
  const box = first === null ? null : first.getBoundingClientRect();
  return JSON.stringify({
    rows,
    scheme: document.documentElement.getAttribute('data-scheme'),
    onScreen: box === null ? null : { w: Math.round(box.width), h: Math.round(box.height), x: Math.round(box.left), y: Math.round(box.top) },
    railPressed: rail === undefined ? null : rail.getAttribute('aria-pressed')
  });
})()`;

await withElectron(launch('p214 the light face and its lanes'), async () => {
  const { cdp } = await browserEndpoint();
  watchTargets(cdp);
  await cdp.call('Target.setDiscoverTargets', { discover: true });
  await cdp.call('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
  const app = await pageFor(cdp, /index\.html(?!.*settings)/);
  await sleep(2500);
  await app.call('Page.stopScreencast').catch(() => {});

  const persisted = async () => {
    const all = await app.eval(
      `window.gmux.settingsGet().then((v) => JSON.stringify({ chromeShade: v.chromeShade, chromeDepth: v.chromeDepth, colorScheme: v.colorScheme }))`,
      30_000
    );
    return all === null || all === undefined ? null : JSON.parse(all);
  };

  // The frame the person is holding on dark: one of the 35 the dark base
  // offers and one of the 31 paper cannot draw, on BOTH axes.
  await app.eval(
    `window.gmux.settingsSet({ colorScheme: 'dark', chromeShade: -2, chromeDepth: 3 }).then(() => true)`,
    30_000
  );
  // THE PROJECT IS OPENED THROUGH THE SHIPPED STORE ACTION. `__gmuxP189Open`
  // is one line over `addProjectPath`, which is exactly what the folder
  // picker calls once it has answered, so this joins the shipped path one
  // step after a dialog no probe can press. It is loaded only under
  // `harness=1`, which `GMUX_PROBES=1` puts on the renderer's URL.
  const opened = await app.eval(
    `(window.__gmuxP189Open === undefined ? Promise.resolve(null) : window.__gmuxP189Open(${JSON.stringify(project)})).then((r) => JSON.stringify(r))`,
    120_000
  );
  if (opened === null || opened === undefined || opened === 'null') {
    throw new Error('the project was not opened: window.__gmuxP189Open answered nothing');
  }
  say(`the fixture repository is open: ${String(opened)}`);
  await sleep(1500);

  const trip = { start: await persisted() };
  const faces = {};

  await app.eval(`window.gmux.openSettings().then(() => true)`, 30_000);
  const sp = await pageFor(cdp, /settings/);
  await sleep(1500);
  await sp.call('Page.stopScreencast').catch(() => {});
  const readFace = async (pushDepthTo = null) => {
    const text = await sp.eval(FACE_JS(pushDepthTo), 60_000);
    return text === null || text === undefined ? null : JSON.parse(text);
  };
  // Graphite is read at rest: both its axes have room, so a push there would
  // be accepted and would move the frame this run is carrying.
  faces.onDark = await readFace();

  await sp.eval(CHOOSE_JS('Light'), 60_000);
  await sleep(1500);
  // Paper's Depth range is -3..0 and the base draws 0, so 1 is one stop past
  // the end. It must be refused, must leave the slider where it was, and
  // must make the row speak.
  faces.onLight = await readFace(1);
  trip.onLight = await persisted();

  // The graph, on paper, at six live lanes.
  const graphText = await app.eval(GRAPH_JS, 120_000);
  const graph = graphText === null || graphText === undefined ? { rows: [] } : JSON.parse(graphText);
  await sleep(500);
  const png = await app.call('Page.captureScreenshot', { format: 'png' });
  if (png !== null && png !== undefined && typeof png.data === 'string') {
    writeFileSync(join(shots, 'p214-graph-on-paper.png'), Buffer.from(png.data, 'base64'));
    graph.shot = true;
  } else {
    graph.shot = false;
  }
  trip.afterGraph = await persisted();

  await sp.eval(CHOOSE_JS('Dark'), 60_000);
  await sleep(1500);
  faces.backOnDark = await readFace();
  trip.backOnDark = await persisted();

  const check = (name, findings, said) => {
    report.findings += findings.length;
    report.steps.push({ name, findings });
    say(`${findings.length === 0 ? 'ok  ' : 'FAIL'} ${name}: ${said}`);
    for (const f of findings) say(`     - ${f}`);
  };
  check(
    'the Appearance face on both bases',
    gradeFaces(faces),
    `dark draws ${String(faces.onDark?.rows)} row(s) at shade ${String(faces.onDark?.shade?.value)} depth ${String(faces.onDark?.depth?.value)}; paper draws ${String(faces.onLight?.rows)} row(s), Shade ${faces.onLight?.shade === null ? 'ABSENT' : 'drawn'} saying "${String(faces.onLight?.shadeNote)}", Depth at ${String(faces.onLight?.depth?.value)} saying "${String(faces.onLight?.depthNote)}"`
  );
  check(
    'the frame the person chose, across the visit',
    gradeRoundTrip(trip),
    `${['start', 'onLight', 'afterGraph', 'backOnDark'].map((k) => `${k} ${String(trip[k]?.chromeShade)}/${String(trip[k]?.chromeDepth)} ${String(trip[k]?.colorScheme)}`).join(', ')}`
  );
  const laneFindings = gradeLanes(graph);
  check(
    'the graph on paper at six live lanes',
    laneFindings,
    `${String(graph.rows.length)} row(s) drawn, the widest carrying ${String(Math.max(0, ...graph.rows.map((r) => new Set(r.colors).size)))} lane colour(s); worst pair ${graph.worstPair === undefined ? 'unmeasured' : `${graph.worstPair.pair} at ${graph.worstPair.sep.toFixed(1)}`}, floor ${String(LANE_FLOOR)}; photograph ${graph.shot === true ? join(shots, 'p214-graph-on-paper.png') : 'NOT TAKEN'}`
  );
  cdp.close();
}).catch((error) => {
  threw = error;
});

if (threw !== null) {
  console.error(`${TAG} the run threw: ${String(threw && threw.stack ? threw.stack : threw)}`);
  process.exit(1);
}
say(`${report.findings === 0 ? 'ok  ' : 'FAIL'} ${String(report.steps.length)} step(s), ${String(report.findings)} finding(s); scratch ${root}`);
process.exit(report.findings === 0 ? 0 : 1);
