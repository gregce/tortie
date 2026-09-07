#!/usr/bin/env node
/**
 * probe-p218-dots.mjs. THE PHASE 218 APP RUN, and it is one Electron on a
 * scratch profile and the gmux-p218 tmux socket. It spawns no agent, spends
 * no token, opens no keychain, makes no request and reads nothing under the
 * person's home: HOME is a scratch directory, the repository it opens is one
 * it builds itself, and the two sessions it makes are plain login shells on
 * its own tmux socket.
 *
 * ## WHAT IT READS, and why it is a reading rather than an assertion
 *
 * The `conformance:hue` gate proves the arithmetic: `--status-idle` and
 * `--status-exited` clear 3:1 on `--bg-active` at every frame either base
 * offers. What the gate cannot see is whether those two tokens are what the
 * compositor actually puts on the row, so this run reads the dots off REAL
 * SELECTED ROWS in the running app and computes the ratio against the ground
 * the dot is really drawn on, found by walking up from the dot until an
 * opaque fill is met rather than by trusting a token name.
 *
 * Five readings in ONE session:
 *
 *   A  the shipped frame on graphite, where it reads 4.712:1
 *   B  the WORST frame the dark base offers, being shade -2, depth 3, hue 63
 *      at High, where it reads 3.281:1 and where the shipped `#6e7583` read
 *      2.193:1
 *   C  THE PARENT MEASUREMENT, at that same frame: the two declarations put
 *      back to `#6e7583` on the live root and the same rectangles read
 *      again, which comes back at 2.193:1 and must be UNDER the floor, and
 *      then taken off again so the run proves the app came back to itself
 *   D  the shipped frame on paper, 3.412:1
 *   E  paper's worst offered frame, shade 0 depth 0 hue 301 at High, 3.007:1
 *
 * Every reading selects each session row in turn, because `--bg-active` is
 * the fill a row takes only while it is the selected one, and it reads the
 * WORD the row carries beside the mark, which is the other half of DESIGN.md
 * section 1.3: a tab and a list row are too dense for a visible label, so the
 * state lives on the tooltip and the aria-label.
 *
 * The two marks are read as SHAPES as well as colours: IDLE is a filled disc
 * with no ring and ENDED is a 1.5px inset ring over a transparent middle, and
 * the run fails if either stops being true.
 *
 * ## THE TWO LIMITS, BOTH STATED RATHER THAN HIDDEN
 *
 * C plants the parent's two DECLARATIONS on the live document root; it does
 * not rebuild the app at 4e1b98c. The two declarations are the entire
 * difference between the parent and HEAD in this base's block, which rule 25
 * of `conformance:hue` proves by digest, so the plant reproduces the parent
 * exactly for everything this run can see. The instrument is identical on
 * both sides of it, which is what the charter asked for.
 *
 * The ENDED ring is read by putting the shipping `dot-ended` class on the
 * REAL dot in the REAL selected row rather than by ending a session into it.
 * A local session that ends with status 0 has its pane destroyed, because
 * resources/gmux-tmux.conf sets `remain-on-exit failed`, and Tortie draws
 * what is left as SAVED with the solid disc; a session that ends badly is
 * drawn in `--status-failed`, which is a different token this phase did not
 * move. A clean `exited` row belongs to an unreachable or a removed session,
 * which needs a remote machine this run refuses to touch. So the run really
 * does end a session, reads what that produces, and takes the ring off the
 * shipping stylesheet on the live ground.
 *
 * ## SAFETY
 *
 * The Electron is started through build/electron-run.mjs, which ends the tree
 * it started in a `finally` block whatever happened and ends the tmux server
 * on this script's own socket with it. Nothing else is spawned that outlives
 * a call. `--self-test` proves the graders on fixtures and launches nothing.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOCKET = 'gmux-p218';
const TAG = '[p218]';
const say = (line) => console.log(`${TAG} ${line}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** WCAG 1.4.11's floor for a non text mark, which is what a dot is. */
const FLOOR = 3;
/** The hex both greys carried until this phase, planted in reading C. */
const PARENT_DOT = '#6e7583';

// ---------------------------------------------------------------------------
// Colour arithmetic, hand written from the WCAG definition and its own. The
// gate reaches culori; nothing here does, so the two instruments are not one.
// ---------------------------------------------------------------------------

/** `rgb(r, g, b)`, `rgba(r, g, b, a)` or `#rrggbb` to channels plus alpha. */
export function rgbaOf(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const hex6 = /^#([0-9a-f]{6})$/i.exec(text);
  if (hex6) {
    return {
      r: parseInt(hex6[1].slice(0, 2), 16),
      g: parseInt(hex6[1].slice(2, 4), 16),
      b: parseInt(hex6[1].slice(4, 6), 16),
      a: 1
    };
  }
  const hex3 = /^#([0-9a-f]{3})$/i.exec(text);
  if (hex3) {
    const [x, y, z] = hex3[1].split('');
    return { r: parseInt(x + x, 16), g: parseInt(y + y, 16), b: parseInt(z + z, 16), a: 1 };
  }
  const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.%]+)\s*)?\)$/i.exec(text);
  if (fn) {
    const alphaText = fn[4];
    let a = 1;
    if (alphaText !== undefined) {
      a = alphaText.endsWith('%') ? Number(alphaText.slice(0, -1)) / 100 : Number(alphaText);
    }
    return { r: Number(fn[1]), g: Number(fn[2]), b: Number(fn[3]), a: Number.isFinite(a) ? a : 1 };
  }
  if (/^transparent$/i.test(text)) return { r: 0, g: 0, b: 0, a: 0 };
  return null;
}

const hexOf = (c) =>
  c === null ? null : `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/** WCAG 2.x relative luminance, written out from the definition. */
export function luminance(c) {
  const chan = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * chan(c.r) + 0.7152 * chan(c.g) + 0.0722 * chan(c.b);
}

/** WCAG 2.x contrast ratio, in the same shape the specification writes it. */
export function contrast(a, b) {
  if (a === null || b === null) return null;
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** A colour with alpha, composited over an opaque ground. */
export function over(fg, bg) {
  if (fg === null || bg === null) return null;
  if (fg.a >= 1) return { ...fg, a: 1 };
  const mix = (x, y) => x * fg.a + y * (1 - fg.a);
  return { r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b), a: 1 };
}

/**
 * The colour of the MARK a dot draws, and its shape.
 *
 * A solid dot paints a background. A hollow one paints nothing and carries an
 * inset ring in `box-shadow`, which computes as `rgb(r, g, b) 0px 0px 0px
 * 1.5px inset`. Reading both is what lets the run assert that the two states
 * are still told apart by shape, which is the other half of DESIGN.md 1.3.
 */
export function markOf(dot) {
  const fill = rgbaOf(dot.background);
  const ring = rgbaOf(String(dot.boxShadow ?? '').replace(/^(rgba?\([^)]*\)|#[0-9a-f]{3,8}).*$/i, '$1'));
  const filled = fill !== null && fill.a > 0.01;
  const hollow = ring !== null && ring.a > 0.01 && /inset/.test(String(dot.boxShadow ?? ''));
  return {
    shape: filled && !hollow ? 'solid' : !filled && hollow ? 'hollow' : filled && hollow ? 'both' : 'none',
    colour: filled ? fill : hollow ? ring : null
  };
}

// ---------------------------------------------------------------------------
// The graders. Every one of them is proved on fixtures under --self-test.
// ---------------------------------------------------------------------------

/** The dot kinds this phase moved: two hexes, three marks. */
const MOVED = ['dot-idle', 'dot-ended', 'dot-none'];

/**
 * One reading of the running app: every `.dot` on screen with the ground it
 * is really drawn over.
 *
 * `expectFloor` is false for reading C alone, where the parent's colour is
 * planted on purpose and the finding is the ratio going UNDER.
 */
export function gradeReading(reading, { name, expectFloor = true, wantActiveGround = true } = {}) {
  const findings = [];
  if (reading === null || reading === undefined) {
    findings.push(`${name}: nothing was read off the app at all`);
    return findings;
  }
  const dots = (reading.dots ?? []).filter((d) => d.onScreen === true && MOVED.includes(d.kind));
  if (dots.length === 0) {
    findings.push(`${name}: no idle, ended or unknown dot was on screen, so the floor was asked of nothing`);
    return findings;
  }
  const kinds = new Set(dots.map((d) => d.kind));
  if (!kinds.has('dot-idle')) findings.push(`${name}: no IDLE dot was drawn, so the solid mark was not read`);
  if (!kinds.has('dot-ended')) findings.push(`${name}: no ENDED dot was drawn, so the hollow ring was not read`);
  const onActive = new Set();
  for (const dot of dots) {
    const mark = markOf(dot);
    const ground = rgbaOf(dot.ground);
    if (ground === null || ground.a < 0.99) {
      findings.push(`${name}: the ${dot.kind} on ${dot.where} sits on "${String(dot.ground)}", which is not an opaque fill, so no ratio could be taken`);
      continue;
    }
    if (mark.colour === null) {
      findings.push(`${name}: the ${dot.kind} on ${dot.where} draws no mark at all, neither a fill nor a ring`);
      continue;
    }
    if (dot.kind === 'dot-idle' && mark.shape !== 'solid') {
      findings.push(`${name}: the IDLE dot on ${dot.where} is ${mark.shape} where the design says solid, so the two states no longer differ by shape`);
    }
    if ((dot.kind === 'dot-ended' || dot.kind === 'dot-none') && mark.shape !== 'hollow') {
      findings.push(`${name}: the ${dot.kind} mark on ${dot.where} is ${mark.shape} where the design says a 1.5px ring, so the two states no longer differ by shape`);
    }
    const ratio = contrast(over(mark.colour, ground), ground);
    if (dot.groundIsActive === true) onActive.add(dot.kind);
    if (expectFloor && (ratio === null || ratio < FLOOR)) {
      findings.push(
        `${name}: the ${dot.kind} on ${dot.where} reads ${ratio === null ? 'nothing' : `${ratio.toFixed(3)}:1`} against the ${String(hexOf(ground))} it is drawn on, under the ${String(FLOOR)}:1 WCAG 1.4.11 asks of a non text mark`
      );
    }
    if (!expectFloor && ratio !== null && ratio >= FLOOR && dot.groundIsActive === true) {
      findings.push(
        `${name}: the ${dot.kind} on ${dot.where} reads ${ratio.toFixed(3)}:1 on the active fill with the PARENT's colour planted, so the plant did not reproduce the defect and the comparison proves nothing`
      );
    }
  }
  // BOTH marks have to have been read on the fill this phase pins against,
  // not just one of them: the ring and the disc are different elements on
  // different rows, and a run that selected one row alone would have asked
  // the floor of half the claim.
  if (wantActiveGround) {
    for (const kind of ['dot-idle', 'dot-ended']) {
      if (!onActive.has(kind)) {
        findings.push(`${name}: no ${kind} was drawn on the active fill, so the floor this phase pins was never the ground under that mark`);
      }
    }
  }
  return findings;
}

/** The two sessions the run needs: one idle, one ended. */
export function gradeSessions(state) {
  const findings = [];
  if (state === null || state === undefined) {
    findings.push('the app never answered with its sessions');
    return findings;
  }
  const statuses = (state.sessions ?? []).map((s) => String(s.status));
  if (statuses.length < 2) findings.push(`only ${String(statuses.length)} session(s) were made, so both states could not be on screen at once`);
  if (!statuses.some((s) => s === 'idle')) findings.push(`no session reached idle; the run saw ${statuses.join(', ') || 'none'}`);
  // A LOCAL SESSION THAT ENDS CLEANLY IS `restorable`, not `exited`, because
  // `remain-on-exit failed` destroys the pane of a command that succeeded and
  // Tortie keeps the row as SAVED. That is the state this run really produces
  // and the one it asks for; the ENDED ring is read separately, by the class
  // swap the reading JS documents.
  if (!statuses.some((s) => s === 'exited' || s === 'ended' || s === 'restorable')) {
    findings.push(`no session finished at all, so only one state was ever on screen; the run saw ${statuses.join(', ') || 'none'}`);
  }
  return findings;
}

/** The frame each reading was really taken at, from the settings bridge. */
export function gradeFrame(got, want, name) {
  const findings = [];
  if (got === null || got === undefined) {
    findings.push(`${name}: the frame it was read at could not be read back`);
    return findings;
  }
  for (const key of Object.keys(want)) {
    if (String(got[key]) !== String(want[key])) {
      findings.push(`${name}: ${key} is ${String(got[key])} where the reading was meant to be taken at ${String(want[key])}`);
    }
  }
  return findings;
}

/** The plant put on and taken off again, so the app came back to itself. */
export function gradeUnplanted(before, after) {
  const findings = [];
  if (before === null || after === null || before === undefined || after === undefined) {
    findings.push('the colour before and after the plant could not both be read');
    return findings;
  }
  if (String(before).toLowerCase() !== String(after).toLowerCase()) {
    findings.push(`the idle grey was ${String(before)} before the plant and ${String(after)} after it, so the run left the app changed`);
  }
  return findings;
}

function selfTest() {
  let pass = true;
  const ok = (label, findings, want) => {
    const good = want === 'clean' ? findings.length === 0 : findings.length > 0;
    if (!good) pass = false;
    say(`${good ? 'ok  ' : 'FAIL'} self-test ${label}: ${String(findings.length)} finding(s)${findings.length === 0 ? '' : ` (${findings[0]})`}`);
  };
  const ACTIVE = 'rgb(37, 41, 49)';
  const NEW = 'rgb(139, 147, 161)';
  const OLD = 'rgb(110, 117, 131)';
  // `isActive` is the fill's OWN answer rather than a comparison with this
  // file's graphite constant, because the active fill at a turned frame and
  // the active fill on paper are both different bytes and both still active.
  const dot = (kind, colour, ground = ACTIVE, isActive = true) => ({
    kind,
    where: `a ${kind} row`,
    onScreen: true,
    ground,
    groundIsActive: isActive,
    background: kind === 'dot-idle' ? colour : 'rgba(0, 0, 0, 0)',
    boxShadow: kind === 'dot-idle' ? 'none' : `${colour} 0px 0px 0px 1.5px inset`
  });
  const clean = { dots: [dot('dot-idle', NEW), dot('dot-ended', NEW), dot('dot-none', NEW)] };
  ok('a clean reading', gradeReading(clean, { name: 'A' }), 'clean');
  ok('nothing read', gradeReading(null, { name: 'A' }), 'red');
  ok('no dot on screen', gradeReading({ dots: [] }, { name: 'A' }), 'red');
  ok('no ended dot drawn', gradeReading({ dots: [dot('dot-idle', NEW)] }, { name: 'A' }), 'red');
  ok('no idle dot drawn', gradeReading({ dots: [dot('dot-ended', NEW)] }, { name: 'A' }), 'red');
  // The defect itself, at the frame where it was worst.
  ok(
    'the parent colour on the worst offered fill',
    gradeReading({ dots: [dot('dot-idle', OLD, 'rgb(66, 66, 56)'), dot('dot-ended', OLD, 'rgb(66, 66, 56)')] }, { name: 'B' }),
    'red'
  );
  ok(
    'the same plant, where reading C expects it to be red',
    gradeReading(
      { dots: [dot('dot-idle', OLD, 'rgb(66, 66, 56)'), dot('dot-ended', OLD, 'rgb(66, 66, 56)')] },
      { name: 'C', expectFloor: false }
    ),
    'clean'
  );
  ok(
    'a plant that did NOT reproduce the defect, which makes C prove nothing',
    gradeReading({ dots: [dot('dot-idle', NEW), dot('dot-ended', NEW)] }, { name: 'C', expectFloor: false }),
    'red'
  );
  ok(
    'an idle dot drawn hollow, so shape stops telling the states apart',
    gradeReading({ dots: [{ ...dot('dot-idle', NEW), background: 'rgba(0, 0, 0, 0)', boxShadow: `${NEW} 0px 0px 0px 1.5px inset` }, dot('dot-ended', NEW)] }, { name: 'A' }),
    'red'
  );
  ok(
    'an ended dot filled in, the same loss the other way',
    gradeReading({ dots: [dot('dot-idle', NEW), { ...dot('dot-ended', NEW), background: NEW, boxShadow: 'none' }] }, { name: 'A' }),
    'red'
  );
  ok(
    'a dot over a see through ground, where no ratio can be taken',
    gradeReading({ dots: [{ ...dot('dot-idle', NEW), ground: 'rgba(0, 0, 0, 0)' }, dot('dot-ended', NEW)] }, { name: 'A' }),
    'red'
  );
  ok(
    'every dot on a fill that is not the active one',
    gradeReading({ dots: [dot('dot-idle', NEW, 'rgb(19, 20, 23)', false), dot('dot-ended', NEW, 'rgb(19, 20, 23)', false)] }, { name: 'A' }),
    'red'
  );
  // Paper, where the shipped greys already cleared the floor.
  const PAPER = 'rgb(217, 220, 227)';
  ok(
    'paper at its shipped frame',
    gradeReading({ dots: [dot('dot-idle', 'rgb(110, 116, 130)', PAPER), dot('dot-ended', 'rgb(110, 116, 130)', PAPER)] }, { name: 'D' }),
    'clean'
  );
  ok('two sessions, one idle and one ended', gradeSessions({ sessions: [{ status: 'idle' }, { status: 'exited' }] }), 'clean');
  ok('one session only', gradeSessions({ sessions: [{ status: 'idle' }] }), 'red');
  ok('nothing ever ended', gradeSessions({ sessions: [{ status: 'idle' }, { status: 'idle' }] }), 'red');
  ok('no session answer at all', gradeSessions(null), 'red');
  ok('the frame it was read at', gradeFrame({ chromeShade: -2, chromeDepth: 3 }, { chromeShade: -2, chromeDepth: 3 }, 'B'), 'clean');
  ok('a frame that did not take', gradeFrame({ chromeShade: 0, chromeDepth: 0 }, { chromeShade: -2, chromeDepth: 3 }, 'B'), 'red');
  ok('a frame that could not be read', gradeFrame(null, { chromeShade: 0 }, 'B'), 'red');
  ok('the plant taken off again', gradeUnplanted('#8b93a1', '#8b93a1'), 'clean');
  ok('a plant left behind', gradeUnplanted('#8b93a1', PARENT_DOT), 'red');
  ok('the plant never read', gradeUnplanted(null, '#8b93a1'), 'red');
  // And the arithmetic itself, on numbers this codebase publishes elsewhere.
  const sums = [];
  const r = (a, b) => contrast(rgbaOf(a), rgbaOf(b));
  if (Math.abs(r('#6e7583', '#252931') - 3.149) > 0.001) sums.push(`the shipped 3.149 does not come back, ${String(r('#6e7583', '#252931'))}`);
  if (Math.abs(r('#8b93a1', '#424238') - 3.281) > 0.001) sums.push(`the 3.281 at the binding frame does not come back, ${String(r('#8b93a1', '#424238'))}`);
  if (Math.abs(r('#6e7583', '#424238') - 2.193) > 0.001) sums.push(`the parent's 2.193 does not come back, ${String(r('#6e7583', '#424238'))}`);
  if (Math.abs(r('#6e7482', '#d9dce3') - 3.412) > 0.001) sums.push(`paper's 3.412 does not come back, ${String(r('#6e7482', '#d9dce3'))}`);
  if (Math.abs(r('#ffffff', '#000000') - 21) > 1e-9) sums.push('white on black is not 21:1');
  ok('the arithmetic reproduces the numbers this phase publishes', sums, 'clean');
  say(`${pass ? 'ok  ' : 'FAIL'} self-test: 23 fixtures, ${pass ? 'all behaved' : 'one or more did not'}`);
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

const root = realpathSync(mkdtempSync(join(tmpdir(), 'p218-')));
const project = join(root, 'dots');
const profile = join(root, 'profile');
const home = join(root, 'home');
const shots = join(root, 'shots');
for (const d of [project, profile, home, shots]) mkdirSync(d, { recursive: true });

const git = (...a) =>
  execFileSync('git', ['-C', project, ...a], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }
  });
writeFileSync(join(project, 'README.md'), '# dots\n\nA scratch repository for the Phase 218 app run.\n');
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p218@example.invalid');
git('config', 'user.name', 'p218');
git('add', '-A');
git('commit', '-q', '-m', 'seed');

const report = { steps: [], findings: 0 };
let threw = null;

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
    GMUX_SHOT: join(root, 'p218-unused.png'),
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
 * Every `.dot` on screen, with the ground it is REALLY drawn over.
 *
 * The ground is found by walking up from the dot until a fill with alpha is
 * met, rather than by naming `--bg-active` and trusting it: the dot is the
 * thing that has to be seen, and what is behind it is whatever the compositor
 * put there. `groundIsActive` records whether that fill happened to be the
 * token this phase pins against, which is what makes the pinned floor the
 * floor a person actually meets.
 */
const DOTS_JS = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const root = getComputedStyle(document.documentElement);
  const tok = (n) => root.getPropertyValue(n).trim();
  const asRgb = (v) => { const el = document.createElement('span'); el.style.color = v; document.body.appendChild(el); const out = getComputedStyle(el).color; el.remove(); return out; };
  const activeRgb = asRgb(tok('--bg-active'));
  const same = (a, b) => a !== null && b !== null && a.replace(/\\s+/g, '') === b.replace(/\\s+/g, '');
  // The ground a mark is REALLY drawn on: the first ancestor whose own fill
  // is opaque, rather than a token name taken on trust.
  const opaque = (el) => {
    for (let node = el.parentElement; node !== null; node = node.parentElement) {
      const bg = getComputedStyle(node).backgroundColor;
      const m = /^rgba?\\(\\s*[\\d.]+[\\s,]+[\\d.]+[\\s,]+[\\d.]+\\s*(?:[,/]\\s*([\\d.]+))?\\s*\\)$/.exec(bg);
      if (m === null) continue;
      const a = m[1] === undefined ? 1 : Number(m[1]);
      if (a > 0.99) return { bg, where: node.className && typeof node.className === 'string' ? node.className : node.tagName.toLowerCase() };
    }
    return { bg: null, where: 'nothing opaque above it' };
  };
  const readOne = (el, kind, synthetic) => {
    const cs = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    // THE WORD THE ROW CARRIES, which is the other half of DESIGN.md 1.3: a
    // tab and a list row are too dense for a visible label, so the state is
    // on the tooltip and the aria-label. Reading it here proves the mark is
    // not the only carrier at the same moment the mark is measured.
    const row = el.closest('.srow, .stab, .ptab, .rail-item') ?? el.parentElement;
    const up = opaque(el);
    return {
      kind,
      synthetic,
      label: row === null ? null : (row.getAttribute('aria-label') ?? row.getAttribute('title')),
      where: up.where,
      onScreen: box.width > 0 && box.height > 0 && box.top >= 0 && box.left >= 0,
      background: cs.backgroundColor,
      boxShadow: cs.boxShadow,
      ground: up.bg,
      groundIsActive: same(up.bg, activeRgb)
    };
  };
  const seen = [...document.querySelectorAll('.dot')];
  const dots = [];
  for (const el of seen) dots.push(readOne(el, [...el.classList].find((c) => c.startsWith('dot-')) ?? '', false));
  // THE HOLLOW RING, ON THE SAME ELEMENT AND THE SAME GROUND.
  //
  // A local session that ends with status 0 has its pane destroyed, because
  // resources/gmux-tmux.conf sets remain-on-exit failed, and Tortie draws
  // what is left as SAVED with the solid disc. An exited row with a clean end
  // belongs to an unreachable or a removed session, which needs a remote
  // machine this run refuses to touch. So the ring is read by putting the
  // SHIPPING class the ENDED state maps to onto the REAL dot in the REAL
  // selected row, letting the fill transition finish, reading it, and putting
  // the row's own class straight back. Everything but the class is the
  // running app: the element, the row, the ground under it, the stylesheet
  // and the live token.
  const was = seen.map((el) => el.className);
  for (const el of seen) el.className = 'dot dot-ended';
  await wait(500);
  for (const el of seen) dots.push(readOne(el, 'dot-ended', true));
  seen.forEach((el, i) => { el.className = was[i]; });
  await wait(500);
  return JSON.stringify({
    dots,
    scheme: document.documentElement.getAttribute('data-scheme'),
    tokens: {
      idle: tok('--status-idle'),
      exited: tok('--status-exited'),
      active: tok('--bg-active'),
      canvas: tok('--bg-canvas'),
      muted: tok('--text-muted')
    }
  });
})()`;

/** Put the parent's two declarations on the live root, or take them off. */
const PLANT_JS = (hex) =>
  hex === null
    ? `(() => { document.documentElement.style.removeProperty('--status-idle'); document.documentElement.style.removeProperty('--status-exited'); return true; })()`
    : `(() => { document.documentElement.style.setProperty('--status-idle', '${hex}'); document.documentElement.style.setProperty('--status-exited', '${hex}'); return true; })()`;

await withElectron(launch('p218 the dots keep their floor'), async () => {
  const { cdp } = await browserEndpoint();
  watchTargets(cdp);
  await cdp.call('Target.setDiscoverTargets', { discover: true });
  await cdp.call('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
  const app = await pageFor(cdp, /index\.html(?!.*settings)/);
  await sleep(2500);
  await app.call('Page.stopScreencast').catch(() => {});

  const frameNow = async () => {
    const text = await app.eval(
      `window.gmux.settingsGet().then((v) => JSON.stringify({ colorScheme: v.colorScheme, chromeHue: v.chromeHue, chromeShade: v.chromeShade, chromeDepth: v.chromeDepth, contrastLevel: v.contrastLevel }))`,
      30_000
    );
    return text === null || text === undefined ? null : JSON.parse(text);
  };
  /**
   * Persist one frame and WAIT FOR THE APPLIER, rather than sleeping a fixed
   * time and hoping. The first run of this probe read `--bg-active` at
   * `#2a2f37`, which is shade 0 depth 1, while the settings bridge already
   * answered depth 0: the settings had landed and the override map had not.
   * So the wait is on the FILL going still, three readings 400 ms apart that
   * agree, and the reading that follows is taken off a settled document.
   */
  const setFrame = async (patch) => {
    await app.eval(
      `(window.__gmuxP207 === undefined ? window.gmux.settingsSet(${JSON.stringify(patch)}) : window.__gmuxP207.appearance(${JSON.stringify(patch)})).then(() => true)`,
      60_000
    );
    const fillNow = () =>
      app.eval(`getComputedStyle(document.documentElement).getPropertyValue('--bg-active').trim()`, 30_000);
    let settled = 0;
    let last = null;
    for (let i = 0; i < 40; i += 1) {
      await sleep(400);
      const now = await fillNow();
      settled = now === last ? settled + 1 : 0;
      last = now;
      if (settled >= 2) break;
    }
    const frame = await frameNow();
    return frame === null ? null : { ...frame, fill: last };
  };
  const readOnce = async () => {
    const text = await app.eval(DOTS_JS, 60_000);
    return text === null || text === undefined || text === 'null' ? null : JSON.parse(text);
  };
  const shot = async (file) => {
    const png = await app.call('Page.captureScreenshot', { format: 'png' }, 60_000);
    if (png === null || png === undefined || typeof png.data !== 'string') return null;
    writeFileSync(file, Buffer.from(png.data, 'base64'));
    return file;
  };
  const check = (name, findings, said) => {
    report.findings += findings.length;
    report.steps.push({ name, findings });
    say(`${findings.length === 0 ? 'ok  ' : 'FAIL'} ${name}: ${said}`);
    for (const f of findings) say(`     - ${f}`);
  };

  // The right hand list is where a session row takes `--bg-active`, which is
  // the fill both greys are pinned against, so the run puts the sessions
  // there rather than on the top strip whose active tab melts into the canvas.
  await app.eval(`window.__gmuxP95.openLocal(${JSON.stringify(project)}).then(() => true)`, 120_000);
  await app.eval(`window.__gmuxP95.orientation('right').then(() => true)`, 60_000);
  await app.eval(`window.__gmuxP95.create({ name: 'quiet', agent: 'shell' }).then(() => true)`, 120_000);
  await app.eval(`window.__gmuxP95.create({ name: 'over', agent: 'shell' }).then(() => true)`, 120_000);
  await sleep(2500);

  // The second session is ENDED the way a person ends one, by typing at it.
  // `exit 0` and not a bare `exit`: a shell that ends on a signal or a
  // non zero code draws the FAILED ring instead, which is a different token
  // and not the one this phase moved.
  await app.eval(`window.__gmuxP95.type('exit 0\\n').then(() => true)`, 60_000);
  // POLLED CLOSELY AND READ AT ONCE. A session that has ended is reaped,
  // captured and eventually stops being a row, so the run takes its bearings
  // the moment the status turns rather than on a fixed sleep.
  let state = null;
  for (let i = 0; i < 100; i += 1) {
    await sleep(300);
    const text = await app.eval(`window.__gmuxP95.state().then((s) => JSON.stringify({ sessions: s.sessions }))`, 30_000);
    state = text === null || text === undefined ? null : JSON.parse(text);
    if ((state?.sessions ?? []).some((s) => s.status === 'exited' || s.status === 'ended')) break;
  }
  say(`the sessions after the exit: ${(state?.sessions ?? []).map((s) => `${String(s.name)}=${String(s.status)}`).join(' ') || 'none'}`);
  check(
    'one quiet session and one that ended',
    gradeSessions(state),
    (state?.sessions ?? []).map((s) => `${String(s.name)} ${String(s.status)}`).join(', ') || 'none'
  );
  // BOTH ROWS ARE SELECTED IN TURN, and that is the whole point of the run.
  // The fill this phase pins against is `--bg-active`, which a session row
  // takes only while it is the selected one, so a reading that selected the
  // quiet session alone would have asked the floor of the solid disc and
  // never of the hollow ring.
  const quiet = (state?.sessions ?? []).find((s) => s.status === 'idle');
  const ended = (state?.sessions ?? []).find((s) => s.status === 'exited' || s.status === 'ended');
  const select = async (session) => {
    if (session === undefined) return;
    await app.eval(`window.__gmuxP95.select(${JSON.stringify(session.id)}).then(() => true)`, 60_000);
    await sleep(1000);
  };
  /** One frame's reading: every dot on screen with each row selected in turn. */
  const readDots = async () => {
    const all = { dots: [], tokens: null, scheme: null };
    for (const session of [quiet, ended]) {
      await select(session);
      const one = await readOnce();
      if (one === null) continue;
      all.tokens = one.tokens;
      all.scheme = one.scheme;
      for (const dot of one.dots) all.dots.push({ ...dot, selected: session?.name ?? 'nothing' });
    }
    return all.tokens === null ? null : all;
  };

  // READING A: the shipped frame on graphite.
  const frameA = await setFrame({ colorScheme: 'dark', chromeHue: 222, chromeShade: 0, chromeDepth: 0, contrastLevel: 'normal' });
  const A = await readDots();
  const shotA = await shot(join(shots, 'p218-A-dark-shipped.png'));
  check('the frame reading A was taken at', gradeFrame(frameA, { colorScheme: 'dark', chromeShade: 0, chromeDepth: 0, contrastLevel: 'normal' }, 'A'), JSON.stringify(frameA));
  check(
    'A the dots on graphite at the shipped frame',
    gradeReading(A, { name: 'A' }),
    `${String((A?.dots ?? []).length)} dot(s), idle ${String(A?.tokens?.idle)} on active ${String(A?.tokens?.active)}; photograph ${String(shotA)}`
  );

  // READING B: the worst frame the dark base offers.
  const wantB = { colorScheme: 'dark', chromeHue: 63, chromeShade: -2, chromeDepth: 3, contrastLevel: 'high' };
  const frameB = await setFrame(wantB);
  const B = await readDots();
  const shotB = await shot(join(shots, 'p218-B-dark-worst.png'));
  check('the frame reading B was taken at', gradeFrame(frameB, wantB, 'B'), JSON.stringify(frameB));
  check(
    'B the dots at the worst frame graphite offers',
    gradeReading(B, { name: 'B' }),
    `${String((B?.dots ?? []).length)} dot(s), idle ${String(B?.tokens?.idle)} on active ${String(B?.tokens?.active)}; photograph ${String(shotB)}`
  );

  // READING C: THE PARENT, at that same frame, by the same instrument.
  const beforePlant = B?.tokens?.idle ?? null;
  await app.eval(PLANT_JS(PARENT_DOT), 30_000);
  await sleep(600);
  const C = await readDots();
  const shotC = await shot(join(shots, 'p218-C-parent-plant.png'));
  check(
    'C the parent colour at the same frame, which must be UNDER the floor',
    gradeReading(C, { name: 'C', expectFloor: false }),
    `idle ${String(C?.tokens?.idle)} on active ${String(C?.tokens?.active)}; photograph ${String(shotC)}`
  );
  await app.eval(PLANT_JS(null), 30_000);
  await sleep(600);
  const afterPlant = (await readDots())?.tokens?.idle ?? null;
  check('the plant taken off again', gradeUnplanted(beforePlant, afterPlant), `${String(beforePlant)} then ${String(afterPlant)}`);

  // READING D: paper at its shipped frame.
  const wantD = { colorScheme: 'light', chromeHue: 222, chromeShade: 0, chromeDepth: 0, contrastLevel: 'normal' };
  const frameD = await setFrame(wantD);
  await sleep(1200);
  const D = await readDots();
  const shotD = await shot(join(shots, 'p218-D-light-shipped.png'));
  check('the frame reading D was taken at', gradeFrame(frameD, wantD, 'D'), JSON.stringify(frameD));
  check(
    'D the dots on paper at the shipped frame',
    gradeReading(D, { name: 'D' }),
    `${String((D?.dots ?? []).length)} dot(s), idle ${String(D?.tokens?.idle)} on active ${String(D?.tokens?.active)}; photograph ${String(shotD)}`
  );

  // READING E: paper's worst offered frame.
  const wantE = { colorScheme: 'light', chromeHue: 301, chromeShade: 0, chromeDepth: 0, contrastLevel: 'high' };
  const frameE = await setFrame(wantE);
  const E = await readDots();
  const shotE = await shot(join(shots, 'p218-E-light-worst.png'));
  check('the frame reading E was taken at', gradeFrame(frameE, wantE, 'E'), JSON.stringify(frameE));
  check(
    'E the dots at the worst frame paper offers',
    gradeReading(E, { name: 'E' }),
    `${String((E?.dots ?? []).length)} dot(s), idle ${String(E?.tokens?.idle)} on active ${String(E?.tokens?.active)}; photograph ${String(shotE)}`
  );

  // And the numbers themselves, printed so the verdict carries evidence.
  for (const [name, reading] of [['A', A], ['B', B], ['C', C], ['D', D], ['E', E]]) {
    for (const dot of reading?.dots ?? []) {
      const mark = markOf(dot);
      const ground = rgbaOf(dot.ground);
      const ratio = contrast(over(mark.colour, ground), ground);
      say(
        `     ${name} ${dot.kind.padEnd(14)} ${String(hexOf(mark.colour)).padEnd(7)} (${mark.shape.padEnd(6)}) on ${dot.groundIsActive === true ? 'the ACTIVE' : 'the       '} ${String(hexOf(ground))} reads ${ratio === null ? 'nothing' : `${ratio.toFixed(3)}:1`}, drawn in "${String(dot.where).slice(0, 30)}"${dot.synthetic === true ? ' (the ENDED class on the real dot)' : ` saying "${String(dot.label).slice(0, 30)}"`}${dot.onScreen === true ? '' : ' OFF SCREEN'}`
      );
    }
  }
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
