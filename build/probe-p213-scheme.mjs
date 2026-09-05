#!/usr/bin/env node
/**
 * probe-p213-scheme.mjs. Light mode, driven in the real app and read off the
 * DOM and off the compositor (Phase 213).
 *
 * About five minutes after the build. FIVE Electrons ONE AFTER THE OTHER and
 * never at once, on one scratch profile and the gmux-p213 tmux socket, through
 * build/electron-run.mjs so each whole tree ends in a finally block whatever
 * happens. It spawns no agent, spends no token, opens no keychain, reads
 * nothing under the person's home and touches no profile but its own. Every
 * photograph is taken through CDP from this file and never with the shot
 * harness. The main process is reached through its own inspector, for the
 * window fill and for nativeTheme, which is what Match the Mac follows; a
 * themeSource set there lives and dies with that process.
 *
 * THE FIRST LAUNCH boots dark, the default. The browser endpoint is attached
 * before the window paints, so the FIRST FRAME is read as one colour. It opens
 * one scratch repository, creates one shell session, opens one file in Monaco,
 * one modified file as a Pierre diff, one modified prose file on the Redline
 * mode, and the Architecture map when the scan lands. It reads every surface
 * on dark, then switches to light through the same settings bridge the
 * Appearance control uses with the screencast running, and reads:
 *
 *   1. the crossfade, frame by frame: every region blends together, no frame
 *      holds one region light and another dark, and the last frame is light;
 *   2. every surface on light, being the titlebar, the sidebar, the tree host
 *      and its first row, the body, the terminal host and the live xterm
 *      theme with its contrast floor, Monaco and its theme name, the Pierre
 *      diff host across its shadow root, the Redline, the Architecture pane
 *      and map, each read as the compositor paints it;
 *   3. THE MOCK, by rectangle and by colour: research 80 section 9 pins the
 *      rectangles and the DOM colours of the light window, and the photograph
 *      is read at the same rectangles allowing one level per channel;
 *   4. the flip: the text family is dark, every text darker than its ground;
 *   5. reduced motion: the switch back to dark under the emulated media
 *      paints no frame between the two palettes, and the dark reading is the
 *      first one again, byte for byte, which is the dark identity driven;
 *   6. the window fill main composes, read from main, on both bases;
 *   7. Match the Mac: the system appearance flipped from main, once and then
 *      ten times in a second, with the renderer following within a second.
 *
 * THE SECOND LAUNCH boots with light persisted and reads its first frame,
 * which must be the paper and never graphite, then opens the Settings window
 * from the app and reads the Appearance face there: the Scheme control with
 * Light pressed, the Frame sliders held at the shipped shade with the refusal
 * line naming what stopped them, and the card's own colours on paper.
 *
 * THE THIRD LAUNCH boots with a hand edited settings file holding a scheme
 * that is not one, and must boot dark with the face reading Dark.
 *
 * THE FOURTH LAUNCH is the fix round's, and it is the ORDINARY PATH: a person
 * holding a shade of -2 on dark, which paper cannot draw, opens Settings,
 * clicks Light on the Scheme control and looks at the Frame group. The window
 * follows and so must the face, at half a second, at two and a half and at
 * five: the Shade slider at the stop the base draws, the refusal line paper's
 * own, the five band strip and all eight colour chips drawn from the light
 * base. Every one of those was left on the dark base by the shipped build,
 * because the applier publishes inside the view transition's commit and that
 * commit lands after React has rendered the same broadcast.
 *
 * THE FIFTH LAUNCH is the committer's, and it reads the settings FILE rather
 * than the face: a person holding shade -2 and depth 3 on dark, which paper
 * can draw on neither axis, switches to Light and then touches the two Frame
 * sliders with real key and mouse events. Neither may write the stop the base
 * brought their frame to, an arrow inside the Depth range must still write,
 * and Dark must come back to the shade that was carried the whole time. At
 * the parent build one ArrowLeft on the inert Shade slider wrote 0 over the
 * -2 and it never came back.
 *
 * `--self-test` proves the graders on fixtures and launches nothing.
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, dominant, shareNear } from './png-read.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOCKET = 'gmux-p213';
const TAG = '[p213]';
const say = (line) => console.log(`${TAG} ${line}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// What the two bases are, from the tree, and what the mock pins.
// ---------------------------------------------------------------------------

/** The eight named starting colours, as the row labels them. */
const FRAME_LABELS = ['Graphite', 'Violet', 'Plum', 'Clay', 'Sand', 'Moss', 'Pine', 'Ocean'];

const DARK = { canvas: '#131417', sidebar: '#0e0f13', text: '#c9cacd', termFg: '#d8dbe2' };
const LIGHT = { canvas: '#f5f7fa', sidebar: '#edeff3', text: '#353639', termFg: '#282a30' };

/**
 * Research 80 section 9: the rectangles and DOM colours of the light window
 * at 1440 by 886 CSS pixels, and the dominant colours of its photograph. The
 * body, the titlebar, the sidebar, the tree host, the terminal host, the
 * editor panel, the editor tabs and the diff host.
 */
const MOCK = {
  rects: {
    body: [0, 0, 1440, 886],
    titlebar: [0, 0, 1440, 38],
    sidebar: [48, 38, 280, 848],
    tree: [52, 82, 271, 800],
    terminalHost: [328, 74, 612, 812],
    editorPanel: [940, 74, 500, 812],
    editorTabs: [941, 74, 499, 36],
    pierre: [941, 140, 499, 746]
  },
  dom: {
    body: 'rgb(245, 247, 250)',
    titlebar: 'rgb(237, 239, 243)',
    sidebar: 'rgb(237, 239, 243)',
    tree: 'rgb(237, 239, 243)',
    terminalHost: 'rgb(245, 247, 250)',
    editorPanel: 'rgb(245, 247, 250)',
    editorTabs: 'rgb(237, 239, 243)',
    pierre: 'rgb(245, 247, 250)'
  },
  text: 'rgb(53, 54, 57)',
  photo: { sidebar: '#eeeff3', terminal: '#f6f7fa', editor: '#f6f7fa', pierre: '#f6f7fa', titlebar: '#eeeff3', tabs: '#eeeff3' }
};

// ---------------------------------------------------------------------------
// Colour arithmetic, small and its own.
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
const same = (a, b) => {
  const x = rgbOf(a);
  const y = rgbOf(b);
  return x !== null && y !== null && x.every((v, i) => v === y[i]);
};
const within = (a, b, levels) => {
  const x = rgbOf(a);
  const y = rgbOf(b);
  return x !== null && y !== null && x.every((v, i) => Math.abs(v - y[i]) <= levels);
};
function luminance(value) {
  const rgb = rgbOf(value);
  if (rgb === null) return -1;
  const lin = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
/**
 * CIE L*, the PERCEPTUAL lightness of a colour, 0 at black and 100 at white.
 *
 * This is here because the first run of this probe read a real crossfade and
 * called it a flash. Relative luminance is linear light, so the frames the
 * fade actually paints, being #17181b, #2a2c2f and #4e4f52 between #131417
 * and #f5f7fa, sit at 0.008, 0.026 and 0.079 of the way across by luminance
 * and every one of them reads as "still dark". By L* the same three frames
 * are at 0.06, 0.20 and 0.30, which is what a person sees. A fade is judged
 * by eye, so it is judged in the space that models the eye.
 */
function lstar(value) {
  const y = luminance(value);
  if (y < 0) return -1;
  return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : y * (24389 / 27);
}
/** Where a colour sits between two ends, 0 at the first and 1 at the second, by L*. */
function progress(value, from, to) {
  const y = lstar(value);
  const a = lstar(from);
  const b = lstar(to);
  if (y < 0 || a < 0 || b < 0 || a === b) return null;
  return (y - a) / (b - a);
}

// ---------------------------------------------------------------------------
// The graders. Pure, so --self-test can prove them without an Electron.
// ---------------------------------------------------------------------------

/** One reading of every surface on one base, judged. */
export function gradeSurfaces(reading, scheme) {
  const findings = [];
  const want = scheme === 'light' ? LIGHT : DARK;
  if (reading.scheme !== scheme) findings.push(`the applier says ${String(reading.scheme)}, not ${scheme}`);
  if (scheme === 'light' && reading.rootScheme !== 'light') findings.push(`the root carries data-scheme=${String(reading.rootScheme)}, not light`);
  if (scheme === 'dark' && reading.rootScheme !== null) findings.push(`the root carries data-scheme=${String(reading.rootScheme)} on the dark base`);
  if (reading.rootColorScheme !== scheme) findings.push(`the root's color-scheme computes to ${String(reading.rootColorScheme)}, not ${scheme}`);
  if (!same(reading.tokens['--bg-canvas'], want.canvas)) findings.push(`--bg-canvas is ${String(reading.tokens['--bg-canvas'])}, not ${want.canvas}`);
  if (!same(reading.tokens['--bg-sidebar'], want.sidebar)) findings.push(`--bg-sidebar is ${String(reading.tokens['--bg-sidebar'])}, not ${want.sidebar}`);
  if (!same(reading.tokens['--text-primary'], want.text)) findings.push(`--text-primary is ${String(reading.tokens['--text-primary'])}, not ${want.text}`);
  if (reading.textDark !== (scheme === 'light')) findings.push(`textDark is ${String(reading.textDark)} on the ${scheme} base`);
  const paint = (sel) => reading.paint[sel] ?? null;
  const pairs = [
    ['.titlebar', want.sidebar],
    ['.sidebar', want.sidebar],
    ['file-tree-container', want.sidebar],
    ['body', want.canvas],
    ['.gmux-terminal-host', want.canvas],
    ['.monaco-editor-background', want.canvas],
    ['.ed-panel', want.canvas],
    ['.ed-tabs', want.sidebar]
  ];
  for (const [sel, expect] of pairs) {
    const p = paint(sel);
    if (p === null) {
      findings.push(`${sel} is not mounted`);
      continue;
    }
    if (!same(p.background, expect)) findings.push(`${sel} paints ${p.background} where the base says ${expect}`);
  }
  const body = paint('body');
  if (body !== null && !same(body.color, want.text)) findings.push(`the body text is ${body.color}, not ${want.text}`);
  // The text is on the right side of its ground, everywhere it was read.
  for (const sel of ['.titlebar', '.sidebar', 'body', '.ed-panel', '.set-card', 'section[aria-label="Appearance"]']) {
    const p = paint(sel);
    if (p === null) continue;
    const darker = luminance(p.color) < luminance(p.background);
    if (darker !== (scheme === 'light')) findings.push(`${sel} text ${p.color} is on the wrong side of its ground ${p.background} for the ${scheme} base`);
  }
  if (reading.terminal === null) findings.push('no terminal is mounted');
  else {
    if (!same(reading.terminal.background, want.canvas)) findings.push(`the live xterm background is ${reading.terminal.background}, not ${want.canvas}`);
    if (!same(reading.terminal.foreground, want.termFg)) findings.push(`the live xterm foreground is ${reading.terminal.foreground}, not ${want.termFg}`);
    const floor = scheme === 'light' ? 4.5 : 1;
    if (reading.terminalContrastFloor !== floor) findings.push(`xterm's minimumContrastRatio is ${String(reading.terminalContrastFloor)}, not ${String(floor)} on the ${scheme} base`);
  }
  if (reading.treeRow === null) findings.push('no tree row is drawn in the Explorer');
  else if (luminance(reading.treeRow.color) < luminance(reading.treeRow.background) !== (scheme === 'light')) {
    findings.push(`the tree row text ${reading.treeRow.color} is on the wrong side of its row ${reading.treeRow.background}`);
  }
  if (reading.editors > 0 && reading.monacoTheme !== null && reading.monacoTheme !== (scheme === 'light' ? 'gmux-light' : 'gmux-dark')) {
    findings.push(`Monaco holds theme ${reading.monacoTheme} on the ${scheme} base`);
  }
  if (reading.pierre === null) findings.push('no Pierre diff is mounted');
  else {
    const p = reading.pierre;
    if (p.hostColorScheme !== scheme) findings.push(`the diff host's color-scheme is ${p.hostColorScheme}, not ${scheme}`);
    if (p.innerBackground !== null && !same(p.innerBackground, want.canvas)) findings.push(`the diff paints ${p.innerBackground} inside, not ${want.canvas}`);
    if (p.innerColor !== null && luminance(p.innerColor) < luminance(want.canvas) !== (scheme === 'light')) findings.push(`the diff text ${p.innerColor} is on the wrong side of ${want.canvas}`);
    if (!same(p.lightBg, LIGHT.canvas) || !same(p.darkBg, DARK.canvas)) findings.push(`the diff host carries --diffs-light-bg ${p.lightBg} and --diffs-dark-bg ${p.darkBg}; both themes must be present`);
    if (p.firstTokenLight !== null && p.firstTokenDark !== null && same(p.firstTokenLight, p.firstTokenDark)) findings.push(`a token span carries the same colour for both themes, ${p.firstTokenLight}`);
  }
  return findings;
}

/**
 * The crossfade, judged over the frames after the switch. Every frame is a
 * per region progress from dark to light by luminance. No frame may hold one
 * region far ahead of another, the run must end light, and at least one
 * frame must sit BETWEEN the two, which is what makes it a fade.
 */
export function gradeCrossfade(frames) {
  const findings = [];
  const regions = ['sidebar', 'terminal', 'editor'];
  if (frames.length === 0) return ['no frame arrived after the switch'];
  let between = 0;
  for (const f of frames) {
    const ps = regions.map((r) => progress(f[r], DARK.sidebar, LIGHT.sidebar) ?? progress(f[r], DARK.canvas, LIGHT.canvas)).filter((p) => p !== null);
    if (ps.length < 2) continue;
    const spread = Math.max(...ps) - Math.min(...ps);
    if (spread > 0.35) findings.push(`at ${String(f.ms)} ms one region is ${spread.toFixed(2)} ahead of another (${regions.map((r) => f[r]).join(' ')}), a half palette`);
    if (ps.every((p) => p > 0.12 && p < 0.88)) between += 1;
  }
  const last = frames[frames.length - 1];
  for (const r of regions) {
    const p = progress(last[r], DARK.canvas, LIGHT.canvas);
    if (p !== null && p < 0.9) findings.push(`the last frame's ${r} is ${last[r]}, not light`);
  }
  if (between === 0) findings.push('no frame sat between the two palettes, so nothing faded');
  return findings;
}

/** Reduced motion: every frame is wholly one palette or the other. */
export function gradeOneFrameSwitch(frames) {
  const findings = [];
  if (frames.length === 0) return ['no frame arrived after the switch'];
  for (const f of frames) {
    for (const r of ['sidebar', 'terminal', 'editor']) {
      const p = progress(f[r], DARK.canvas, LIGHT.canvas);
      if (p !== null && p > 0.12 && p < 0.88) findings.push(`at ${String(f.ms)} ms the ${r} is ${f[r]}, between the two palettes under reduced motion`);
    }
  }
  const last = frames[frames.length - 1];
  const p = progress(last.terminal, DARK.canvas, LIGHT.canvas);
  if (p !== null && p > 0.1) findings.push(`the last frame's terminal is ${last.terminal}, not dark`);
  return findings;
}

/** The mock: rectangles within a few pixels, DOM colours exact, the photograph within one level. */
export function gradeMock(rects, photo) {
  const findings = [];
  for (const [name, [x, y, w, h]] of Object.entries(MOCK.rects)) {
    const r = rects[name];
    if (!r) {
      findings.push(`${name} is not on screen`);
      continue;
    }
    const off = Math.max(Math.abs(r.x - x), Math.abs(r.y - y), Math.abs(r.w - w), Math.abs(r.h - h));
    if (off > 8) findings.push(`${name} sits at ${[r.x, r.y, r.w, r.h].map((n) => String(Math.round(n))).join(',')} where the mock has ${[x, y, w, h].join(',')}`);
    if (!same(r.bg, MOCK.dom[name])) findings.push(`${name} paints ${r.bg} where the mock paints ${MOCK.dom[name]}`);
    if (name !== 'pierre' && !same(r.color, MOCK.text)) findings.push(`${name} text is ${r.color} where the mock has ${MOCK.text}`);
  }
  for (const [name, want] of Object.entries(MOCK.photo)) {
    const got = photo[name];
    if (got === null || got === undefined) {
      findings.push(`the photograph has no ${name}`);
      continue;
    }
    if (!within(got, want, 1)) findings.push(`the photograph's ${name} is ${got} where the mock's is ${want}, more than one level off`);
  }
  return findings;
}

/**
 * A boot's first frame. The property is that the chosen ground is what
 * paints, and that the OTHER base's ground never appears: a window that has
 * already drawn its whole chrome by the first frame the screencast delivers
 * is right, and holding it to one flat colour would be holding it to how
 * fast this machine attached rather than to what it painted. So the frame's
 * dominant colour is the chosen ground within one level, and under one
 * pixel in fifty is the other base's ground.
 */
export function gradeFirstFrame(frame, scheme) {
  const findings = [];
  if (frame === null) return ['no first frame was read'];
  const want = scheme === 'light' ? LIGHT.canvas : DARK.canvas;
  const other = scheme === 'light' ? DARK.canvas : LIGHT.canvas;
  if (!within(frame.colour, want, 1)) findings.push(`the first frame is ${frame.colour}, not ${want}`);
  if (frame.share < 0.5) findings.push(`the first frame's ${frame.colour} covers ${(frame.share * 100).toFixed(0)} percent, under half the window`);
  if (typeof frame.otherShare === 'number' && frame.otherShare > 0.02) {
    findings.push(`${(frame.otherShare * 100).toFixed(0)} percent of the first frame is ${other}, the other base's ground`);
  }
  return findings;
}

/**
 * The surfaces a scheme reaches that are not in the pairs above, being the
 * Redline, the Architecture pane and its map. Each is graded only when it is
 * mounted, and the finding names it when it is not, so a surface that could
 * not be driven is UNMEASURED in the log rather than silently green.
 */
export function gradeExtraSurfaces(paint, scheme) {
  const findings = [];
  const other = scheme === 'light' ? DARK : LIGHT;
  for (const sel of ['.ed-redline-scroll', '.ed-redline-doc', '[data-view="arch"]', '[data-slot="arch-map-tab"]', '.arch-map-box rect']) {
    const p = paint[sel] ?? null;
    if (p === null) {
      findings.push(`${sel} is not mounted`);
      continue;
    }
    for (const [what, value] of [['background', p.background], ['text', p.color]]) {
      if (same(value, other.canvas) || same(value, other.sidebar) || same(value, other.text)) {
        findings.push(`${sel} draws its ${what} ${value}, which is the ${scheme === 'light' ? 'dark' : 'light'} base's own colour`);
      }
    }
    // The side rule is asked of the two surfaces that draw TEXT on a ground.
    // A map box is a fill and a stroke, where the stroke is a hairline rather
    // than a letter, so it is held to the colour rule above and no more.
    if (sel !== '.arch-map-box rect' && sel !== '[data-slot="arch-map-tab"]' && sel !== '[data-view="arch"]') {
      const bg = rgbOf(p.background);
      const fg = rgbOf(p.color);
      const opaque = bg !== null && !/^rgba\(.*,\s*0\)$/.test(p.background);
      if (opaque && fg !== null && luminance(p.color) !== luminance(p.background)) {
        const darker = luminance(p.color) < luminance(p.background);
        if (darker !== (scheme === 'light')) findings.push(`${sel} draws ${p.color} on ${p.background}, the wrong side for the ${scheme} base`);
      }
    }
  }
  return findings;
}

/** The Appearance face on the light base. */
export function gradeFace(face, want) {
  const findings = [];
  if (face === null) return ['the face was not read'];
  if (face.checked !== want.checked) findings.push(`the Scheme control has ${String(face.checked)} pressed, not ${want.checked}`);
  if (face.labels.join('|') !== 'Light|Dark|Match the Mac') findings.push(`the Scheme control reads ${face.labels.join(', ')}`);
  if (want.checked === 'Light') {
    // PHASE 214. Paper carries one shade, so the row is ABSENT rather than
    // present and inert, and its refusal sentence goes with it. Phase 213
    // asked here that the slider read the shipped stop and refuse a push;
    // the honest question now is that there is nothing to push.
    if (face.shade !== null) findings.push(`paper draws a Shade slider reading ${String(face.shade.value)}, where the region is one shade row`);
    if (face.refusedAt !== null && face.refusedAt.value !== null) findings.push(`a Shade slider on paper took ${String(face.refusedAt.value)}`);
    if (face.refusedAt !== null && face.refusedAt.note !== '') findings.push(`a hidden Shade control still says "${face.refusedAt.note}"`);
    // Depth still moves on paper, so it is still drawn and still refuses.
    if (face.depth === null) findings.push('no Depth slider on paper, where four stops are offered');
    if (face.depthRefusedAt === null) findings.push('the Depth slider was not pushed');
    else if (!/status dots|accent|file colors|panels/.test(face.depthRefusedAt.note)) findings.push(`the Depth refusal line says "${face.depthRefusedAt.note}"`);
    if (!same(face.card.background, '#fcfcfe')) findings.push(`the card paints ${face.card.background}, not the sheet #fcfcfe`);
    if (luminance(face.card.color) >= luminance(face.card.background)) findings.push(`the card text ${face.card.color} is not darker than the card`);
    if (face.sectionRootScheme !== 'light') findings.push(`the Settings window root is ${String(face.sectionRootScheme)}, not light`);
  } else if (face.sectionRootScheme !== null) findings.push(`the Settings window root carries data-scheme=${String(face.sectionRootScheme)} on dark`);
  return findings;
}

/**
 * THE FACE AFTER AN IN-SESSION SWITCH (Phase 213 fix round, finding 1).
 *
 * The window is not the only thing that has to follow the scheme. A person
 * who chooses Light is usually about to choose a frame colour, and the face
 * they choose it from is the Frame group: the two sliders, the line that says
 * why one stopped, the five band strip and the eight colour chips. All of it
 * is derived from the base in effect, and none of it re-rendered when the
 * applier's publish was deferred into a view transition, so paper was chosen
 * and eight near black ramps were offered on a light card.
 *
 * The reading is taken three times after the click, because the defect was
 * NOT a transient: it held at half a second, at two and a half and at five,
 * and only something else forcing a render repaired it.
 */
export function gradeSwitchedFace(before, after) {
  const findings = [];
  if (before === null || after === null) return ['the face was not read on both sides of the switch'];
  const dark = (value) => luminance(value) < 0.1;
  const light = (value) => luminance(value) > 0.6;
  if (before.shade?.value !== -2) findings.push(`before the switch the Shade slider reads ${String(before.shade?.value)}, not the -2 that was persisted`);
  if (!(before.bands ?? []).every(dark)) findings.push(`before the switch the band strip is ${(before.bands ?? []).join(' ')}, which is not the dark ramp`);
  if (after.rootScheme !== 'light') findings.push(`after the switch the Settings root carries data-scheme=${String(after.rootScheme)}`);
  if (!light(after.canvas ?? '')) findings.push(`after the switch the Settings window's --bg-canvas is ${String(after.canvas)}, not the paper`);
  if (after.checked !== 'Light') findings.push(`after the switch the Scheme control has ${String(after.checked)} pressed`);
  // The face itself, which is the finding.
  for (const reading of after.readings ?? []) {
    const at = `${String(reading.ms)} ms after the click`;
    // PHASE 214: on paper the Shade row is not drawn at all, so the reading
    // is its absence and the empty sentence that goes with it.
    if (reading.shade !== null) findings.push(`${at} paper draws a Shade slider reading ${String(reading.shade?.value)}`);
    if ((reading.note ?? '') !== '') findings.push(`${at} a hidden Shade control still says "${String(reading.note)}"`);
    if (reading.depth?.value !== 0) findings.push(`${at} the Depth slider reads ${String(reading.depth?.value)} where the window draws the shipped stop`);
    const bands = reading.bands ?? [];
    if (bands.length !== 5) findings.push(`${at} the band strip has ${String(bands.length)} bands`);
    else if (!bands.every(light)) findings.push(`${at} the band strip is ${bands.join(' ')}, which is the dark ramp on a light card`);
    const chips = reading.chips ?? [];
    if (chips.length < 8) findings.push(`${at} only ${String(chips.length)} colour chips were read`);
    else if (!chips.every((chip) => (chip.bands ?? []).every(light))) {
      const bad = chips.filter((chip) => !(chip.bands ?? []).every(light)).map((chip) => chip.label);
      findings.push(`${at} the chips ${bad.join(', ')} are drawn as dark ramps, so a person choosing a frame colour on paper is offered a colour they cannot get`);
    }
  }
  const [first, ...rest] = after.readings ?? [];
  for (const reading of rest) {
    if (JSON.stringify(reading.bands) !== JSON.stringify(first?.bands) || reading.depth?.value !== first?.depth?.value) {
      findings.push(`the face is still moving at ${String(reading.ms)} ms, so what it says depends on when it is read`);
    }
  }
  return findings;
}

/**
 * LAUNCH E'S GRADER (Phase 213 committer's round): THE FRAME A PERSON IS
 * HOLDING SURVIVES A VISIT TO A BASE THAT CANNOT DRAW IT.
 *
 * `frameForBase` brings a carried frame to the nearest stop the new base
 * offers and its header says NOTHING IS PERSISTED, so going back to the base
 * that could draw it brings it back exactly. The two Frame sliders were the
 * hole in that promise: a slider drew the BROUGHT stop and persisted whatever
 * a move clamped to, so on paper, where the whole region is one shade row,
 * one arrow key or one stray click on the inert Shade slider wrote the
 * shipped stop over the shade the person chose on dark, and it was gone.
 *
 * The reading is the persisted settings, taken from the app window's own
 * bridge rather than from the face, because the face is a clamp and the file
 * is the promise. Four arms:
 *
 *   1. arrows and a click on the INERT Shade slider on paper persist nothing;
 *   2. an arrow past the Depth edge on paper persists nothing;
 *   3. an arrow INSIDE the Depth range persists, so the fix did not make a
 *      live control dead;
 *   4. Dark comes back to the shade that was carried the whole time, with
 *      the depth the person really moved.
 */
export function gradeCarriedFrame(read) {
  const findings = [];
  if (read === null || read === undefined) return ['launch E read nothing'];
  const shadeOf = (step) => read[step]?.chromeShade;
  const depthOf = (step) => read[step]?.chromeDepth;
  if (read.start?.chromeShade !== -2 || read.start?.chromeDepth !== 3) {
    findings.push(`the frame did not start at shade -2 depth 3: it reads ${String(read.start?.chromeShade)} and ${String(read.start?.chromeDepth)}`);
  }
  // PHASE 214 CHANGED ARM 1 FROM A GUARD TO AN ABSENCE. The inert Shade
  // slider is not drawn on paper at all, so there is no control for an arrow
  // or a stray click to reach. Its track must be missing, and the arms below
  // still fire their real key and mouse events at the place it used to be,
  // because what they prove is that the persisted shade does not move.
  if (read.tracks !== undefined && read.tracks.shade !== null) {
    findings.push('paper draws a Shade slider, where the region is one shade row and the control is not shown');
  }
  if (read.face?.depth !== 0) {
    findings.push(`on paper the Depth slider draws ${String(read.face?.depth)}, not the shipped stop the base is drawing`);
  }
  for (const step of ['shadeLeft', 'shadeRight', 'shadeClick']) {
    if (shadeOf(step) !== -2) {
      findings.push(`after ${step} where the Shade slider used to be, the persisted shade is ${String(shadeOf(step))}, so the shade chosen on dark was overwritten`);
    }
    if (depthOf(step) !== 3) {
      findings.push(`after ${step} the persisted depth is ${String(depthOf(step))}, not the 3 that was carried`);
    }
  }
  if (depthOf('depthPast') !== 3) {
    findings.push(`an arrow past the Depth edge persisted ${String(depthOf('depthPast'))}, so a refused move at the drawn stop still wrote`);
  }
  if (shadeOf('depthPast') !== -2) findings.push(`the Depth slider moved the persisted shade to ${String(shadeOf('depthPast'))}`);
  if (depthOf('depthIn') !== -1) {
    findings.push(`an arrow inside the Depth range persisted ${String(depthOf('depthIn'))} rather than -1, so the guard made a live control dead`);
  }
  if (shadeOf('depthIn') !== -2) findings.push(`a real Depth move moved the persisted shade to ${String(shadeOf('depthIn'))}`);
  if (read.backOnDark?.shade !== -2 || read.backOnDark?.depth !== -1) {
    findings.push(`back on dark the sliders read shade ${String(read.backOnDark?.shade)} depth ${String(read.backOnDark?.depth)}, not the carried -2 with the depth that really moved`);
  }
  if (read.backOnDark?.scheme !== 'dark') findings.push(`the window did not go back to dark: it reads ${String(read.backOnDark?.scheme)}`);
  return findings;
}

function selfTest() {
  let pass = true;
  const ok = (name, findings, want) => {
    const got = findings.length;
    const good = want === 'clean' ? got === 0 : got > 0;
    say(`${good ? 'ok  ' : 'FAIL'} self-test ${name}: ${String(got)} finding(s)${got === 0 ? '' : ` (${findings[0]})`}`);
    pass = pass && good;
  };
  const lightReading = {
    scheme: 'light',
    rootScheme: 'light',
    rootColorScheme: 'light',
    textDark: true,
    tokens: { '--bg-canvas': '#f5f7fa', '--bg-sidebar': '#edeff3', '--text-primary': '#353639' },
    paint: Object.fromEntries(
      ['.titlebar', '.sidebar', 'file-tree-container', 'body', '.gmux-terminal-host', '.monaco-editor-background', '.ed-panel', '.ed-tabs'].map((s) => [
        s,
        { background: /titlebar|sidebar|tree|tabs/.test(s) ? 'rgb(237, 239, 243)' : 'rgb(245, 247, 250)', color: 'rgb(53, 54, 57)' }
      ])
    ),
    terminal: { background: '#f5f7fa', foreground: '#282a30', cursor: '#1e1f22' },
    terminalContrastFloor: 4.5,
    treeRow: { background: 'rgb(237, 239, 243)', color: 'rgb(53, 54, 57)' },
    editors: 1,
    monacoTheme: 'gmux-light',
    pierre: { hostBackground: 'rgb(245, 247, 250)', hostColorScheme: 'light', lightBg: '#f5f7fa', darkBg: '#131417', innerBackground: 'rgb(245, 247, 250)', innerColor: 'rgb(40, 42, 48)', firstTokenLight: '#025b9e', firstTokenDark: '#6CB6FF' }
  };
  ok('a clean light reading', gradeSurfaces(lightReading, 'light'), 'clean');
  ok('a light reading whose terminal kept its dark floor', gradeSurfaces({ ...lightReading, terminalContrastFloor: 1 }, 'light'), 'red');
  ok('a light reading whose diff kept the dark host', gradeSurfaces({ ...lightReading, pierre: { ...lightReading.pierre, hostColorScheme: 'dark', innerBackground: 'rgb(19, 20, 23)' } }, 'light'), 'red');
  ok('a light reading with light text', gradeSurfaces({ ...lightReading, paint: { ...lightReading.paint, body: { background: 'rgb(245, 247, 250)', color: 'rgb(201, 202, 205)' } } }, 'light'), 'red');
  ok('a light reading read as dark', gradeSurfaces(lightReading, 'dark'), 'red');
  const fade = [
    { ms: 20, sidebar: '#0e0f12', terminal: '#131417', editor: '#131417' },
    { ms: 60, sidebar: '#4c4d50', terminal: '#4e4f52', editor: '#4e4f52' },
    { ms: 120, sidebar: '#a9aaad', terminal: '#acadb0', editor: '#acadb0' },
    { ms: 260, sidebar: '#eeeff3', terminal: '#f6f7fa', editor: '#f6f7fa' }
  ];
  ok('a clean crossfade', gradeCrossfade(fade), 'clean');
  // THE FRAMES THE FIRST RUN ACTUALLY PAINTED. Judged in linear luminance
  // the three middle ones sit at 0.008, 0.026 and 0.079 of the way across and
  // the grader said nothing faded; judged in L* they are at 0.06, 0.20 and
  // 0.30, which is the fade a person sees.
  ok(
    'the crossfade the first run painted',
    gradeCrossfade([
      { ms: 0, sidebar: '#0e0f12', terminal: '#131417', editor: '#131417' },
      { ms: 33, sidebar: '#0e0f12', terminal: '#131417', editor: '#131417' },
      { ms: 66, sidebar: '#141518', terminal: '#17181b', editor: '#17181b' },
      { ms: 100, sidebar: '#272829', terminal: '#2a2c2f', editor: '#2a2c2f' },
      { ms: 133, sidebar: '#4b4c4f', terminal: '#4e4f52', editor: '#4e4f52' },
      { ms: 233, sidebar: '#eeeff3', terminal: '#f6f7fa', editor: '#f6f7fa' },
      { ms: 266, sidebar: '#eeeff3', terminal: '#f6f7fa', editor: '#f6f7fa' }
    ]),
    'clean'
  );
  ok('a half palette frame', gradeCrossfade([fade[0], { ms: 60, sidebar: '#eeeff3', terminal: '#131417', editor: '#131417' }, fade[3]]), 'red');
  ok('a switch that never faded', gradeCrossfade([fade[0], fade[3]]), 'red');
  ok('a switch that ended dark', gradeCrossfade([fade[0], fade[1], fade[0]]), 'red');
  ok('a clean one frame switch', gradeOneFrameSwitch([fade[3], fade[0], fade[0]]), 'clean');
  ok('a reduced motion switch that faded', gradeOneFrameSwitch([fade[3], fade[2], fade[0]]), 'red');
  const rects = Object.fromEntries(Object.entries(MOCK.rects).map(([k, [x, y, w, h]]) => [k, { x, y, w, h, bg: MOCK.dom[k], color: MOCK.text }]));
  ok('the mock met', gradeMock(rects, { ...MOCK.photo }), 'clean');
  ok('the mock met within one level', gradeMock(rects, { ...MOCK.photo, terminal: '#f5f7fa' }), 'clean');
  ok('a sidebar three pixels wider than the mock', gradeMock({ ...rects, sidebar: { ...rects.sidebar, w: 283 } }, MOCK.photo), 'clean');
  ok('a sidebar twenty pixels wider than the mock', gradeMock({ ...rects, sidebar: { ...rects.sidebar, w: 300 } }, MOCK.photo), 'red');
  ok('a diff that kept the dark ground', gradeMock({ ...rects, pierre: { ...rects.pierre, bg: 'rgb(19, 20, 23)' } }, MOCK.photo), 'red');
  ok('a photograph two levels off', gradeMock(rects, { ...MOCK.photo, terminal: '#f4f5f8' }), 'red');
  ok('a dark first frame', gradeFirstFrame({ colour: '#131417', share: 1, otherShare: 0 }, 'dark'), 'clean');
  ok('a light first frame', gradeFirstFrame({ colour: '#f6f7fa', share: 0.99, otherShare: 0 }, 'light'), 'clean');
  ok('a light boot that painted graphite first', gradeFirstFrame({ colour: '#131417', share: 1, otherShare: 1 }, 'light'), 'red');
  // The first run of this probe attached late enough on a cold profile that
  // the window had already drawn its sidebar, and the old grader called the
  // right ground a failure for covering 74 percent rather than the window.
  ok('a dark first frame that had already drawn the chrome', gradeFirstFrame({ colour: '#131417', share: 0.74, otherShare: 0 }, 'dark'), 'clean');
  ok('a light first frame with a graphite panel left in it', gradeFirstFrame({ colour: '#f6f7fa', share: 0.8, otherShare: 0.19 }, 'light'), 'red');
  const lightExtras = {
    '.ed-redline-scroll': { background: 'rgb(245, 247, 250)', color: 'rgb(79, 83, 92)' },
    '.ed-redline-doc': { background: 'rgba(0, 0, 0, 0)', color: 'rgb(53, 54, 57)' },
    '[data-view="arch"]': { background: 'rgba(0, 0, 0, 0)', color: 'rgb(53, 54, 57)' },
    '[data-slot="arch-map-tab"]': { background: 'rgb(245, 247, 250)', color: 'rgb(53, 54, 57)' },
    '.arch-map-box rect': { background: 'rgb(252, 252, 254)', color: 'rgb(209, 211, 218)' }
  };
  ok('the extra surfaces on paper', gradeExtraSurfaces(lightExtras, 'light'), 'clean');
  ok('a Redline that kept the dark canvas', gradeExtraSurfaces({ ...lightExtras, '.ed-redline-scroll': { background: 'rgb(19, 20, 23)', color: 'rgb(201, 202, 205)' } }, 'light'), 'red');
  ok('a map box that kept the dark sheet', gradeExtraSurfaces({ ...lightExtras, '.arch-map-box rect': { background: 'rgb(19, 20, 23)', color: 'rgb(53, 54, 57)' } }, 'light'), 'red');
  ok('a Redline that was never mounted', gradeExtraSurfaces({ ...lightExtras, '.ed-redline-scroll': null }, 'light'), 'red');
  // PHASE 214: paper has no Shade row, so a clean light face reads null for
  // it and a null value back from the drag that found nothing to push.
  const face = {
    checked: 'Light',
    labels: ['Light', 'Dark', 'Match the Mac'],
    shade: null,
    depth: { value: 0, min: -3, max: 3 },
    refusedAt: { asked: -1, value: null, note: '' },
    depthRefusedAt: { asked: 2, value: 0, note: 'More depth puts the file colors under their contrast floor.' },
    card: { background: 'rgb(252, 252, 254)', color: 'rgb(53, 54, 57)' },
    sectionRootScheme: 'light'
  };
  ok('a clean light face', gradeFace(face, { checked: 'Light' }), 'clean');
  ok('a face with Dark pressed on a light launch', gradeFace({ ...face, checked: 'Dark' }, { checked: 'Light' }), 'red');
  ok('a Shade slider drawn on paper at all', gradeFace({ ...face, shade: { value: 0, min: -4, max: 2 } }, { checked: 'Light' }), 'red');
  ok('a Shade slider on paper that took a darker shade', gradeFace({ ...face, refusedAt: { asked: -1, value: -1, note: '' } }, { checked: 'Light' }), 'red');
  ok('a hidden Shade control still speaking', gradeFace({ ...face, refusedAt: { asked: -1, value: null, note: 'Darker puts the accent under its contrast floor.' } }, { checked: 'Light' }), 'red');
  ok('the Depth row gone from paper too', gradeFace({ ...face, depth: null }, { checked: 'Light' }), 'red');
  ok('a clean dark face', gradeFace({ ...face, checked: 'Dark', sectionRootScheme: null }, { checked: 'Dark' }), 'clean');
  const strip = (hexes) => hexes;
  const chipsAt = (hexes) => FRAME_LABELS.map((label) => ({ label, bands: hexes }));
  const LIGHT_BANDS = ['#edeff3', '#f5f7fa', '#fcfcfe', '#e5e7ed', '#d9dce3'];
  const DARK_BANDS = ['#0e0f13', '#131417', '#191b20', '#202329', '#252931'];
  const before = { shade: { value: -2 }, bands: strip(DARK_BANDS) };
  const afterOk = {
    rootScheme: 'light',
    canvas: '#f5f7fa',
    checked: 'Light',
    readings: [500, 2500, 5000].map((ms) => ({
      ms,
      shade: null,
      depth: { value: 0 },
      note: '',
      bands: strip(LIGHT_BANDS),
      chips: chipsAt(LIGHT_BANDS)
    }))
  };
  ok('a face that followed the switch', gradeSwitchedFace(before, afterOk), 'clean');
  ok(
    'the face the defect drew: the sliders and the strip left on dark',
    gradeSwitchedFace(before, {
      ...afterOk,
      readings: afterOk.readings.map((r) => ({
        ...r,
        shade: { value: -2 },
        note: 'Lighter puts the file colors under their contrast floor.',
        bands: strip(DARK_BANDS),
        chips: chipsAt(DARK_BANDS)
      }))
    }),
    'red'
  );
  ok(
    'eight chips still drawn as dark ramps on a light card',
    gradeSwitchedFace(before, {
      ...afterOk,
      readings: afterOk.readings.map((r) => ({ ...r, chips: chipsAt(DARK_BANDS) }))
    }),
    'red'
  );
  ok(
    'a face that repaired itself between two readings',
    gradeSwitchedFace(before, {
      ...afterOk,
      readings: [
        { ...afterOk.readings[0], depth: { value: 3 }, bands: strip(DARK_BANDS) },
        afterOk.readings[1],
        afterOk.readings[2]
      ]
    }),
    'red'
  );
  ok('a switch the window itself did not follow', gradeSwitchedFace(before, { ...afterOk, rootScheme: null, canvas: '#131417' }), 'red');
  // Launch E: the carried frame. One clean fixture and one per clause, so a
  // grader that stopped asking is seen to stop.
  const carried = {
    start: { chromeShade: -2, chromeDepth: 3 },
    // PHASE 214: no Shade track on paper, and the Depth slider at the stop
    // the base draws.
    tracks: { shade: null, depth: { value: 0 } },
    face: { shade: undefined, depth: 0 },
    shadeLeft: { chromeShade: -2, chromeDepth: 3 },
    shadeRight: { chromeShade: -2, chromeDepth: 3 },
    shadeClick: { chromeShade: -2, chromeDepth: 3 },
    depthPast: { chromeShade: -2, chromeDepth: 3 },
    depthIn: { chromeShade: -2, chromeDepth: -1 },
    backOnDark: { scheme: 'dark', shade: -2, depth: -1 }
  };
  ok('a carried frame that survived the visit', gradeCarriedFrame(carried), 'clean');
  ok('launch E read nothing', gradeCarriedFrame(null), 'red');
  ok('the frame did not start where it was set', gradeCarriedFrame({ ...carried, start: { chromeShade: 0, chromeDepth: 0 } }), 'red');
  ok('the Depth slider draws the persisted stop on paper', gradeCarriedFrame({ ...carried, face: { shade: undefined, depth: 3 } }), 'red');
  ok('paper drew a Shade slider at all', gradeCarriedFrame({ ...carried, tracks: { shade: { value: 0 }, depth: { value: 0 } } }), 'red');
  ok('an arrow on the inert Shade slider wrote', gradeCarriedFrame({ ...carried, shadeLeft: { chromeShade: 0, chromeDepth: 3 } }), 'red');
  ok('a click on the inert Shade slider wrote', gradeCarriedFrame({ ...carried, shadeClick: { chromeShade: 0, chromeDepth: 3 } }), 'red');
  ok('the Shade slider took the depth with it', gradeCarriedFrame({ ...carried, shadeRight: { chromeShade: -2, chromeDepth: 0 } }), 'red');
  ok('a refused Depth move wrote', gradeCarriedFrame({ ...carried, depthPast: { chromeShade: -2, chromeDepth: 0 } }), 'red');
  ok('the guard made the Depth slider dead', gradeCarriedFrame({ ...carried, depthIn: { chromeShade: -2, chromeDepth: 0 } }), 'red');
  ok('a live Depth move moved the shade', gradeCarriedFrame({ ...carried, depthIn: { chromeShade: 0, chromeDepth: -1 } }), 'red');
  ok('dark came back to the wrong frame', gradeCarriedFrame({ ...carried, backOnDark: { scheme: 'dark', shade: 0, depth: -1 } }), 'red');
  ok('the window never went back to dark', gradeCarriedFrame({ ...carried, backOnDark: { scheme: 'light', shade: -2, depth: -1 } }), 'red');
  say(`${pass ? 'ok  ' : 'FAIL'} self-test: 52 fixtures, ${pass ? 'all behaved' : 'one or more did not'}`);
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

const root = realpathSync(mkdtempSync(join(tmpdir(), 'p213-')));
const project = join(root, 'tortie-sample');
const profile = join(root, 'profile');
const home = join(root, 'home');
const shots = join(root, 'shots');
for (const d of [project, profile, home, shots, join(project, 'src'), join(project, 'docs')]) mkdirSync(d, { recursive: true });
const git = (...a) =>
  execFileSync('git', ['-C', project, ...a], { encoding: 'utf8', env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1' } });
writeFileSync(join(project, 'README.md'), '# tortie-sample\n\nA scratch repository for the Phase 213 app run.\n');
writeFileSync(join(project, 'package.json'), '{\n  "name": "tortie-sample",\n  "version": "0.1.0",\n  "type": "module"\n}\n');
writeFileSync(join(project, 'notes.txt'), 'p213\nLight mode, and the whole app follows it.\n');
writeFileSync(join(project, 'docs', 'notes.md'), '# Notes\n\nThe scheme a person chose is read once at boot.\n\nA dark frame around dark terminals is the shipped look.\n');
writeFileSync(
  join(project, 'src', 'app.ts'),
  "export type Scheme = 'dark';\n\nexport function paletteFor(scheme: Scheme): string {\n  if (scheme === 'dark') return '#131417';\n  throw new Error('unknown scheme: ' + scheme);\n}\n"
);
git('init', '-q');
git('config', 'user.email', 'p213@example.invalid');
git('config', 'user.name', 'p213');
git('add', '-A');
git('commit', '-q', '-m', 'seed');
writeFileSync(join(project, 'docs', 'notes.md'), '# Notes\n\nThe scheme a person chose is read once at boot and again on every broadcast.\n\nA dark frame around dark terminals is the shipped look, and a light one is the paper.\n');
writeFileSync(
  join(project, 'src', 'app.ts'),
  "export type Scheme = 'dark' | 'light' | 'system';\n\nexport function paletteFor(scheme: Scheme, systemDark: boolean): string {\n  if (scheme === 'dark') return '#131417';\n  if (scheme === 'light') return '#f5f7fa';\n  return systemDark ? '#131417' : '#f5f7fa';\n}\n"
);

const report = { launches: [], findings: 0 };
let threw = null;

/**
 * Which launches to drive, for the fix round's before and after. Empty, the
 * default, drives all five; `P213_ONLY=D` drives the in-session switch alone,
 * which is what a measurement at the parent build needs and takes about a
 * minute and a half. It changes nothing about what any launch asserts.
 */
const ONLY = (process.env.P213_ONLY ?? '').toUpperCase();
const driving = (name) => ONLY === '' || ONLY.includes(name);

const launch = (label, extraEnv = {}) => ({
  label,
  userDataDir: profile,
  tmuxSocket: SOCKET,
  cwd: REPO,
  args: ['--remote-debugging-port=0', '--use-mock-keychain', '--inspect=0'],
  env: withoutDevRenderer({
    HOME: home,
    GMUX_TMUX_SOCKET: SOCKET,
    GMUX_PROBES: '1',
    GMUX_SHOT: join(root, 'p213-unused.png'),
    GMUX_SHOT_DELAY_MS: '1500000',
    GMUX_SHOT_POPUP_PICK: 'p213 no row carries this label',
    GMUX_SPECSTORY_NO_CLOUD: '1',
    ...extraEnv
  }),
  ceilingMs: 12 * 60 * 1000,
  echo: false
});

/** The browser endpoint, polled from the moment the profile writes its port. */
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
    await sleep(10);
  }
}

/**
 * Attach to every target as it appears, resume the ones paused at start, and
 * screencast every page from its first frame. Returns the frame store.
 */
function watchTargets(cdp) {
  const attached = new Map();
  const frames = new Map();
  const info = new Map();
  cdp.on((m) => {
    if (m.method === 'Target.attachedToTarget') {
      const { sessionId, targetInfo, waitingForDebugger } = m.params;
      attached.set(targetInfo.targetId, sessionId);
      info.set(sessionId, targetInfo);
      if (targetInfo.type === 'page') {
        frames.set(sessionId, []);
        void (async () => {
          try {
            await cdp.call('Page.enable', {}, sessionId, 15_000);
            await cdp.call('Page.startScreencast', { format: 'png', everyNthFrame: 1 }, sessionId, 15_000);
          } catch {
            /* a target that went away */
          }
          if (waitingForDebugger) cdp.call('Runtime.runIfWaitingForDebugger', {}, sessionId).catch(() => {});
        })();
      } else if (waitingForDebugger) {
        cdp.call('Runtime.runIfWaitingForDebugger', {}, sessionId).catch(() => {});
      }
    }
    if (m.method === 'Page.screencastFrame') {
      const arr = frames.get(m.sessionId);
      if (arr) arr.push({ at: Date.now(), ts: m.params.metadata.timestamp, data: m.params.data });
      cdp.call('Page.screencastFrameAck', { sessionId: m.params.sessionId }, m.sessionId).catch(() => {});
    }
  });
  return { attached, frames, info };
}

/** The app page's session, once the drives are up. */
async function appPage(cdp, watch, timeoutMs = 120_000) {
  const started = Date.now();
  for (;;) {
    const { targetInfos } = await cdp.call('Target.getTargets');
    const page = targetInfos.find((t) => t.type === 'page' && /index\.html|localhost/.test(t.url) && !/settings/.test(t.url));
    if (page) {
      let sid = watch.attached.get(page.targetId);
      if (!sid) {
        const r = await cdp.call('Target.attachToTarget', { targetId: page.targetId, flatten: true });
        sid = r.sessionId;
      }
      const s = pageSession(cdp, sid);
      for (;;) {
        try {
          const ready = await s.eval(
            `typeof window.gmux === 'object' && typeof window.__gmuxP207 === 'object' && performance.getEntriesByType('navigation')[0]?.loadEventEnd > 0`,
            5000
          );
          if (ready) return s;
        } catch {
          /* not yet */
        }
        if (Date.now() - started > timeoutMs) throw new Error('the app page never became ready');
        await sleep(100);
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app page target in time');
    await sleep(50);
  }
}

const RECTS = `(() => {
  const sel = { titlebar: '.titlebar', sidebar: '.sidebar', tree: 'file-tree-container', terminalHost: '.gmux-terminal-host', xtermScreen: '.xterm-screen', editorPanel: '.ed-panel', editorTabs: '.ed-tabs', monaco: '.monaco-editor', pierre: '.ed-pierre', redline: '.ed-redline-scroll', arch: '[data-view="arch"]', map: '[data-slot="arch-map-tab"]', body: 'body' };
  const out = {};
  for (const [k, q] of Object.entries(sel)) { const el = document.querySelector(q); if (!el) { out[k] = null; continue; } const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); out[k] = { x: r.x, y: r.y, w: r.width, h: r.height, bg: cs.backgroundColor, color: cs.color }; }
  out.dpr = devicePixelRatio; out.inner = { w: innerWidth, h: innerHeight };
  return out;
})()`;

function classify(png, rects) {
  const img = decodePng(png);
  const k = img.width / rects.inner.w;
  const at = (name) => {
    const b = rects[name];
    if (!b) return null;
    return dominant(img, Math.round(b.x * k) + 4, Math.round(b.y * k) + 4, Math.max(8, Math.round(b.w * k) - 8), Math.max(8, Math.round(b.h * k) - 8), 6).colour;
  };
  return { sidebar: at('sidebar'), terminal: at('xtermScreen'), editor: at('monaco') ?? at('editorPanel'), pierre: at('pierre'), titlebar: at('titlebar'), tabs: at('editorTabs') };
}

function firstFrameOf(frames, scheme) {
  const f = frames[0];
  if (!f) return null;
  const img = decodePng(Buffer.from(f.data, 'base64'));
  const d = dominant(img, 0, 0, img.width, img.height, 8);
  const other = scheme === 'light' ? DARK.canvas : LIGHT.canvas;
  return {
    colour: d.colour,
    share: d.share,
    otherShare: shareNear(img, 0, 0, img.width, img.height, other, 1, 8),
    distinct: d.distinct,
    w: img.width,
    h: img.height,
    frames: frames.length
  };
}

async function screenshot(s, file) {
  const r = await s.call('Page.captureScreenshot', { format: 'png' }, 60_000);
  const buf = Buffer.from(r.data, 'base64');
  writeFileSync(file, buf);
  return buf;
}

/** Main's inspector, from the child's stderr. */
function mainInspector(handle) {
  return new Promise((resolveWs) => {
    let text = '';
    const onData = (c) => {
      text += String(c);
      const m = /Debugger listening on (ws:\/\/[^\s]+)/.exec(text);
      if (m) {
        handle.child.stderr.off('data', onData);
        resolveWs(m[1]);
      }
    };
    handle.child.stderr.on('data', onData);
    setTimeout(() => resolveWs(null), 60_000);
  });
}

async function mainEval(ws, expression) {
  const mc = await connectBrowser(ws);
  try {
    await mc.call('Runtime.enable');
    const r = await mc.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, undefined, 60_000);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'main threw');
    return r.result?.value;
  } finally {
    mc.close();
  }
}
const REQ = `(process.mainModule ? process.mainModule.require : require)`;

const check = (launchReport, findings, line) => {
  launchReport.findings += findings.length;
  report.findings += findings.length;
  say(`${findings.length === 0 ? 'ok  ' : 'FAIL'} ${line}`);
  for (const f of findings) say(`     finding: ${f}`);
};

const press = (s, { key, code, vk, modifiers }) =>
  (async () => {
    const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
    await s.call('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
    await s.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  })();

// ---------------------------------------------------------------------------
// Launch A: dark boot, every surface, the switch, the mock, the Mac.
// ---------------------------------------------------------------------------

const A = { name: 'A dark boot and the switch', findings: 0 };
report.launches.push(A);
if (driving('A')) await withElectron(launch('p213 A'), async (handle) => {
  const mainWsPromise = mainInspector(handle);
  const { cdp } = await browserEndpoint();
  const watch = watchTargets(cdp);
  await cdp.call('Target.setDiscoverTargets', { discover: true });
  await cdp.call('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
  const s = await appPage(cdp, watch);
  await sleep(1500);
  await s.call('Page.stopScreencast').catch(() => {});
  const boot = firstFrameOf(watch.frames.get(s.sessionId) ?? [], 'dark');
  A.boot = boot;
  check(A, gradeFirstFrame(boot, 'dark'), `the first frame at a dark boot: ${boot === null ? 'none' : `${boot.colour} over ${(boot.share * 100).toFixed(0)} percent`}`);

  const FILE = { repoPath: project, relPath: 'notes.txt', path: join(project, 'notes.txt') };
  const DIFF = { repoPath: project, relPath: 'src/app.ts', path: join(project, 'src', 'app.ts') };
  const PROSE = { repoPath: project, relPath: 'docs/notes.md', path: join(project, 'docs', 'notes.md') };

  await s.eval(`window.__gmuxP95.openLocal(${JSON.stringify(project)}).then(() => true)`, 90_000);
  await s.eval(`window.__gmuxP95.create({ name: 'p213', agent: 'shell' }).then(() => true)`, 120_000);
  await s.eval(`window.__gmuxP207.openFile(${JSON.stringify(FILE)})`, 120_000);
  await s.eval(`window.__gmuxP207.openDiff(${JSON.stringify(DIFF)})`, 120_000);
  await s.eval(`window.__gmuxP207.redline(${JSON.stringify(PROSE)})`, 120_000);
  const redlineUp = (await s.eval(`document.querySelector('.ed-redline-doc') !== null`, 15_000)) === true;
  say(`${redlineUp ? 'ok  ' : 'note'} the Redline ${redlineUp ? 'is up' : 'is UNMEASURED: the mode did not open on docs/notes.md'}`);
  A.redlineUp = redlineUp;

  // The Architecture map, when the scan of the scratch repository lands. It
  // takes the sidebar for its own pane, which is why every reading below
  // asks for the Explorer back first.
  let mapUp = false;
  try {
    await s.eval(`(async () => { const before = await window.gmux.settingsGet(); await window.gmux.settingsSet({ arch: { enabled: true, agentId: before.arch.agentId, model: before.arch.model } }); return true; })()`, 30_000);
    await sleep(800);
    await press(s, { key: 'A', code: 'KeyA', vk: 65, modifiers: 2 | 8 });
    const started = Date.now();
    while (Date.now() - started < 90_000) {
      const state = await s.eval(`(() => { const pane = document.querySelector('[data-view="arch"]'); const open = document.querySelector('.arch-map-open'); return { pane: pane !== null, open: open !== null && !open.disabled }; })()`, 15_000);
      if (state.open) break;
      await sleep(500);
    }
    await s.eval(`(() => { const b = document.querySelector('.arch-map-open'); if (b) b.click(); return true; })()`, 15_000);
    const t2 = Date.now();
    while (Date.now() - t2 < 60_000) {
      if (await s.eval(`document.querySelector('[data-slot="arch-map-tab"] svg') !== null`, 15_000)) {
        mapUp = true;
        break;
      }
      await sleep(500);
    }
  } catch (error) {
    say(`     the Architecture map did not come up: ${String(error)}`);
  }
  say(`${mapUp ? 'ok  ' : 'note'} the Architecture map ${mapUp ? 'is up' : 'is UNMEASURED: the scan did not land in time'}`);
  A.mapUp = mapUp;

  /**
   * ONE reading of every surface on one base. The editor panel draws the
   * ACTIVE tab and nothing else, so a single read can never hold Monaco, the
   * diff, the Redline and the map at once: the four are activated in turn,
   * each read as the compositor paints it, and the four readings are merged
   * into one that the grader judges. The last activation is the diff, so the
   * app is left in the state the mock pins. The Explorer is asked for first
   * because the Architecture pane takes the sidebar.
   */
  const fullRead = async () => {
    const readings = [];
    if (mapUp) readings.push(['archPane', await s.eval(`window.__gmuxP207.archPane()`, 60_000)]);
    readings.push(['explorer', await s.eval(`window.__gmuxP207.explorer()`, 60_000)]);
    readings.push(['monaco', await s.eval(`window.__gmuxP207.activate(${JSON.stringify(FILE.path)})`, 60_000)]);
    if (mapUp) readings.push(['map', await s.eval(`window.__gmuxP207.archMap()`, 60_000)]);
    if (redlineUp) readings.push(['redline', await s.eval(`window.__gmuxP207.activate(${JSON.stringify(PROSE.path)})`, 60_000)]);
    const base = await s.eval(`window.__gmuxP207.activate(${JSON.stringify(DIFF.path)})`, 60_000);
    const merged = { ...base, paint: { ...base.paint } };
    for (const [, r] of readings) {
      for (const [sel, value] of Object.entries(r.paint)) {
        if (merged.paint[sel] === null && value !== null) merged.paint[sel] = value;
      }
      if (merged.monacoTheme === null && r.monacoTheme !== null) merged.monacoTheme = r.monacoTheme;
      if (merged.editors === 0 && r.editors > 0) merged.editors = r.editors;
      if (merged.treeRow === null && r.treeRow !== null) merged.treeRow = r.treeRow;
    }
    return merged;
  };

  const dark = await fullRead();
  say(`a session, an editor and a diff are up: ${String(dark.editors)} editor(s), terminal ${dark.terminal === null ? 'absent' : 'present'}, diff host ${dark.pierre === null ? 'absent' : dark.pierre.hostColorScheme}`);
  check(A, gradeSurfaces(dark, 'dark'), 'every surface on the dark base, before the switch');
  check(A, gradeExtraSurfaces(dark.paint, 'dark'), 'the Redline, the Architecture pane and its map on the dark base');
  A.dark = dark;
  const darkRects = await s.eval(RECTS, 30_000);
  const darkPng = await screenshot(s, join(shots, 'a-dark.png'));
  A.darkPhoto = classify(darkPng, darkRects);
  say(`the dark photograph reads ${JSON.stringify(A.darkPhoto)}`);

  // THE SWITCH, with the screencast running.
  const swap = [];
  const off = s.on((m) => {
    if (m.method === 'Page.screencastFrame') {
      swap.push({ ts: m.params.metadata.timestamp, data: m.params.data });
      s.call('Page.screencastFrameAck', { sessionId: m.params.sessionId }).catch(() => {});
    }
  });
  await s.call('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  await sleep(300);
  const t0 = Date.now() / 1000;
  await s.eval(`window.gmux.settingsSet({ colorScheme: 'light' }).then(() => true)`, 30_000);
  await sleep(1500);
  await s.call('Page.stopScreencast');
  off();
  const fadeFrames = swap.filter((f) => f.ts >= t0 - 0.02).map((f) => ({ ms: Math.round((f.ts - t0) * 1000), ...classify(Buffer.from(f.data, 'base64'), darkRects) }));
  A.fade = fadeFrames;
  check(A, gradeCrossfade(fadeFrames), `the crossfade: ${String(fadeFrames.length)} frames, terminal ${fadeFrames.map((f) => f.terminal).join(' ')}`);

  const light = await fullRead();
  A.light = light;
  check(A, gradeSurfaces(light, 'light'), 'every surface on the light base, after the switch');
  check(A, gradeExtraSurfaces(light.paint, 'light'), 'the Redline, the Architecture pane and its map on the light base');
  say(`     light: canvas ${light.tokens['--bg-canvas']} text ${light.tokens['--text-primary']} terminal ${light.terminal?.background ?? 'none'}/${light.terminal?.foreground ?? 'none'} floor ${String(light.terminalContrastFloor)} monaco ${String(light.monacoTheme)} diff ${light.pierre?.innerBackground ?? 'none'}/${light.pierre?.innerColor ?? 'none'} token ${light.pierre?.firstTokenLight ?? 'none'} tree row ${light.treeRow?.background ?? 'none'}/${light.treeRow?.color ?? 'none'}`);
  for (const sel of ['.ed-redline-scroll', '.ed-redline-doc', '[data-view="arch"]', '[data-slot="arch-map-tab"]', '.arch-map-box rect']) {
    const p = light.paint[sel];
    say(`     ${sel}: ${p === null ? 'not mounted' : `${p.background} / ${p.color}`}`);
  }
  const lightRects = await s.eval(RECTS, 30_000);
  const lightPng = await screenshot(s, join(shots, 'a-light.png'));
  A.lightPhoto = classify(lightPng, lightRects);
  A.lightRects = lightRects;
  check(A, gradeMock(lightRects, A.lightPhoto), `the mock, by rectangle and by colour: photograph ${JSON.stringify(A.lightPhoto)}`);

  // The flip: the text is dark on paper, and every text sits under its ground.
  const flipFindings = [];
  if (!light.textDark) flipFindings.push('the text family did not read dark on the paper');
  for (const sel of ['body', '.titlebar', '.sidebar', '.ed-panel']) {
    const p = light.paint[sel];
    if (p !== null && luminance(p.color) >= luminance(p.background)) flipFindings.push(`${sel} text ${p.color} is not darker than ${p.background}`);
  }
  if (light.terminal !== null && luminance(light.terminal.foreground) >= luminance(light.terminal.background)) flipFindings.push('the terminal foreground is not darker than its canvas');
  check(A, flipFindings, `the flip: text dark ${String(light.textDark)}, body ${light.paint.body?.color ?? 'none'} on ${light.paint.body?.background ?? 'none'}`);

  // Reduced motion: back to dark in one frame, and the dark reading again.
  await s.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const swap2 = [];
  const off2 = s.on((m) => {
    if (m.method === 'Page.screencastFrame') {
      swap2.push({ ts: m.params.metadata.timestamp, data: m.params.data });
      s.call('Page.screencastFrameAck', { sessionId: m.params.sessionId }).catch(() => {});
    }
  });
  await s.call('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  await sleep(300);
  const t1 = Date.now() / 1000;
  const motion = await s.eval(`(async () => { const p = window.gmux.settingsSet({ colorScheme: 'dark' }); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); const running = document.getAnimations().length; await p; return { running, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches }; })()`, 30_000);
  await sleep(1200);
  await s.call('Page.stopScreencast');
  off2();
  await s.call('Emulation.setEmulatedMedia', { features: [] });
  const oneFrames = swap2.filter((f) => f.ts >= t1 - 0.02).map((f) => ({ ms: Math.round((f.ts - t1) * 1000), ...classify(Buffer.from(f.data, 'base64'), darkRects) }));
  A.reduced = { motion, frames: oneFrames };
  const rmFindings = gradeOneFrameSwitch(oneFrames);
  if (!motion.reduced) rmFindings.push('the reduced motion media did not take');
  if (motion.running !== 0) rmFindings.push(`${String(motion.running)} animation(s) were running two frames after the switch under reduced motion`);
  check(A, rmFindings, `reduced motion: ${String(oneFrames.length)} frames, terminal ${oneFrames.map((f) => f.terminal).join(' ')}, animations running ${String(motion.running)}`);
  const darkAgain = await s.eval(`window.__gmuxP207.read()`, 30_000);
  const identity = [];
  if (JSON.stringify(darkAgain.tokens) !== JSON.stringify(A.dark.tokens)) identity.push('a token differs from the first dark reading');
  if (darkAgain.terminal?.foreground !== A.dark.terminal?.foreground || darkAgain.terminal?.background !== A.dark.terminal?.background) identity.push('the terminal theme differs from the first dark reading');
  if (Object.keys(darkAgain.overrides).length !== 0) identity.push(`${String(Object.keys(darkAgain.overrides).length)} override(s) on the dark base`);
  if (darkAgain.rootScheme !== null) identity.push(`the root still carries data-scheme=${String(darkAgain.rootScheme)}`);
  if (darkAgain.terminalContrastFloor !== 1) identity.push(`xterm's floor is ${String(darkAgain.terminalContrastFloor)} back on dark`);
  check(A, identity, 'back on dark: every token, the terminal theme and the empty override map are the first reading again');

  // The window fill main composes, on both bases, and Match the Mac.
  const mainWs = await mainWsPromise;
  A.mainInspector = mainWs !== null;
  if (mainWs === null) {
    check(A, ['main did not announce its inspector'], 'the window fill through main');
  } else {
    const fillDark = await mainEval(mainWs, `${REQ}('electron').BrowserWindow.getAllWindows()[0].getBackgroundColor()`);
    await s.eval(`window.gmux.settingsSet({ colorScheme: 'light' }).then(() => true)`, 30_000);
    await sleep(600);
    const fillLight = await mainEval(mainWs, `${REQ}('electron').BrowserWindow.getAllWindows()[0].getBackgroundColor()`);
    const fillFindings = [];
    if (!same(fillDark, DARK.canvas)) fillFindings.push(`the fill on dark is ${String(fillDark)}`);
    if (!same(fillLight, LIGHT.canvas)) fillFindings.push(`the fill on light is ${String(fillLight)}`);
    check(A, fillFindings, `the window fill through main: dark ${String(fillDark)}, light ${String(fillLight)}`);

    await s.eval(`window.gmux.settingsSet({ colorScheme: 'system' }).then(() => true)`, 30_000);
    await sleep(600);
    const mac = await mainEval(
      mainWs,
      `(async () => { const { nativeTheme, BrowserWindow } = ${REQ}('electron'); const w = BrowserWindow.getAllWindows()[0]; const out = { was: nativeTheme.themeSource, darkBefore: nativeTheme.shouldUseDarkColors };
        const t0 = Date.now(); nativeTheme.themeSource = nativeTheme.shouldUseDarkColors ? 'light' : 'dark';
        for (let i = 0; i < 200; i += 1) { const scheme = await w.webContents.executeJavaScript('document.documentElement.getAttribute("data-scheme")'); const wantLight = !nativeTheme.shouldUseDarkColors; if ((scheme === 'light') === wantLight) { out.followedMs = Date.now() - t0; break; } await new Promise((r) => setTimeout(r, 5)); }
        out.fillAfterOne = w.getBackgroundColor(); out.darkAfterOne = nativeTheme.shouldUseDarkColors;
        // Primed to the value the loop does NOT open with, so all ten
        // assignments below are real changes. Without this the first one
        // repeats what the single flip above already set and fires nothing,
        // and the count reads nine.
        nativeTheme.themeSource = 'light'; await new Promise((r) => setTimeout(r, 250));
        const t1 = Date.now(); let events = 0; const h = () => { events += 1; }; nativeTheme.on('updated', h);
        for (let i = 0; i < 10; i += 1) { nativeTheme.themeSource = i % 2 === 0 ? 'dark' : 'light'; await new Promise((r) => setTimeout(r, 100)); }
        await new Promise((r) => setTimeout(r, 300)); nativeTheme.off('updated', h);
        out.tenFlips = { ms: Date.now() - t1, events, darkAtEnd: nativeTheme.shouldUseDarkColors, fill: w.getBackgroundColor(), rendererScheme: await w.webContents.executeJavaScript('document.documentElement.getAttribute("data-scheme")') };
        nativeTheme.themeSource = 'system'; await new Promise((r) => setTimeout(r, 400)); out.restored = nativeTheme.themeSource; out.rendererAfterRestore = await w.webContents.executeJavaScript('document.documentElement.getAttribute("data-scheme")'); out.darkAfterRestore = nativeTheme.shouldUseDarkColors;
        return out; })()`
    );
    A.mac = mac;
    const macFindings = [];
    if (typeof mac.followedMs !== 'number') macFindings.push('the renderer did not follow a system flip within a second');
    else if (mac.followedMs > 1000) macFindings.push(`the renderer followed in ${String(mac.followedMs)} ms, over a second`);
    if (!same(mac.fillAfterOne, mac.darkAfterOne ? DARK.canvas : LIGHT.canvas)) macFindings.push(`after one flip the fill is ${String(mac.fillAfterOne)} while the Mac is ${mac.darkAfterOne ? 'dark' : 'light'}`);
    if (mac.tenFlips.events < 10) macFindings.push(`ten flips fired ${String(mac.tenFlips.events)} updated events`);
    if ((mac.tenFlips.rendererScheme === 'light') !== !mac.tenFlips.darkAtEnd) macFindings.push(`after ten flips the renderer is ${String(mac.tenFlips.rendererScheme)} while the Mac is ${mac.tenFlips.darkAtEnd ? 'dark' : 'light'}`);
    if (!same(mac.tenFlips.fill, mac.tenFlips.darkAtEnd ? DARK.canvas : LIGHT.canvas)) macFindings.push(`after ten flips the fill is ${String(mac.tenFlips.fill)}`);
    if ((mac.rendererAfterRestore === 'light') !== !mac.darkAfterRestore) macFindings.push('after restoring the system source the renderer disagrees with the Mac');
    check(A, macFindings, `Match the Mac: one flip followed in ${String(mac.followedMs)} ms, ten flips in ${String(mac.tenFlips.ms)} ms fired ${String(mac.tenFlips.events)} events and left the renderer ${String(mac.tenFlips.rendererScheme ?? 'dark')} with the Mac ${mac.tenFlips.darkAtEnd ? 'dark' : 'light'}`);
  }
  // Leave LIGHT persisted for the second launch.
  await s.eval(`window.gmux.settingsSet({ colorScheme: 'light' }).then(() => true)`, 30_000);
  await sleep(500);
  cdp.close();
}).catch((error) => {
  threw = error;
});

// ---------------------------------------------------------------------------
// Launch B: light persisted. The first frame, and the Settings face.
// ---------------------------------------------------------------------------

const FACE_JS = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const nav = [...document.querySelectorAll('button, [role="tab"], a')].find((el) => (el.textContent || '').trim() === 'Appearance');
  if (nav) nav.click();
  await wait(1200);
  const section = document.querySelector('section[aria-label="Appearance"]');
  if (!section) return JSON.stringify(null);
  const group = section.querySelector('[role="radiogroup"][aria-label="Scheme"]');
  const radios = group ? [...group.querySelectorAll('[role="radio"]')] : [];
  const readSlider = (label) => { const el = section.querySelector('input[aria-label="' + label + '"]'); return el === null ? null : { value: Number(el.value), min: Number(el.min), max: Number(el.max) }; };
  const noteOf = (label) => { const el = section.querySelector('input[aria-label="' + label + '"]'); if (el === null) return ''; const note = el.parentElement.querySelector('.set-frame-note'); if (note === null) return ''; return note.classList.contains('blank') ? '' : note.textContent.trim(); };
  const card = section.querySelector('.set-card'); const cs = card ? getComputedStyle(card) : null;
  const face = {
    checked: radios.find((r) => r.getAttribute('aria-checked') === 'true')?.getAttribute('aria-label') ?? null,
    labels: radios.map((r) => r.getAttribute('aria-label')),
    titles: radios.map((r) => r.getAttribute('title')),
    shade: readSlider('Shade'), depth: readSlider('Depth'), noteAtRest: noteOf('Shade') + noteOf('Depth'),
    card: cs ? { background: cs.backgroundColor, color: getComputedStyle(section).color } : null,
    sectionRootScheme: document.documentElement.getAttribute('data-scheme'),
    refusedAt: null
  };
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  const drag = async (label, value) => { const el = section.querySelector('input[aria-label="' + label + '"]'); if (el === null) return null; setter.call(el, String(value)); el.dispatchEvent(new Event('input', { bubbles: true })); await wait(900); return Number(section.querySelector('input[aria-label="' + label + '"]').value); };
  const took = await drag('Shade', -1);
  face.refusedAt = { asked: -1, value: took, note: noteOf('Shade') };
  const depthTook = await drag('Depth', 2);
  face.depthRefusedAt = { asked: 2, value: depthTook, note: noteOf('Depth') };
  await drag('Depth', 0);
  return JSON.stringify(face);
})()`;

async function settingsPage(cdp, watch, timeoutMs = 60_000) {
  const started = Date.now();
  for (;;) {
    const { targetInfos } = await cdp.call('Target.getTargets');
    const page = targetInfos.find((t) => t.type === 'page' && /settings/.test(t.url));
    if (page) {
      let sid = watch.attached.get(page.targetId);
      if (!sid) {
        const r = await cdp.call('Target.attachToTarget', { targetId: page.targetId, flatten: true });
        sid = r.sessionId;
      }
      const s = pageSession(cdp, sid);
      for (;;) {
        try {
          if (await s.eval(`document.querySelector('section') !== null`, 5000)) return s;
        } catch {
          /* not yet */
        }
        if (Date.now() - started > timeoutMs) throw new Error('the settings page never became ready');
        await sleep(100);
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no settings page target in time');
    await sleep(50);
  }
}

async function bootAndFace(label, scheme, wantChecked) {
  const L = { name: label, findings: 0 };
  report.launches.push(L);
  await withElectron(launch(label), async (handle) => {
    const mainWsPromise = mainInspector(handle);
    const { cdp } = await browserEndpoint();
    const watch = watchTargets(cdp);
    await cdp.call('Target.setDiscoverTargets', { discover: true });
    await cdp.call('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
    const s = await appPage(cdp, watch);
    await sleep(1500);
    await s.call('Page.stopScreencast').catch(() => {});
    const boot = firstFrameOf(watch.frames.get(s.sessionId) ?? [], scheme);
    L.boot = boot;
    check(L, gradeFirstFrame(boot, scheme), `the first frame at a ${scheme} boot: ${boot === null ? 'none' : `${boot.colour} over ${(boot.share * 100).toFixed(0)} percent`}`);
    const reading = await s.eval(`window.__gmuxP207.read()`, 30_000);
    L.reading = reading;
    const bootFindings = [];
    if (reading.scheme !== scheme) bootFindings.push(`the applier says ${String(reading.scheme)}`);
    if (!same(reading.tokens['--bg-canvas'], scheme === 'light' ? LIGHT.canvas : DARK.canvas)) bootFindings.push(`--bg-canvas is ${String(reading.tokens['--bg-canvas'])}`);
    check(L, bootFindings, `the app came up ${scheme}: scheme ${String(reading.scheme)}, persisted ${String(reading.colorScheme)}, canvas ${String(reading.tokens['--bg-canvas'])}`);
    // The Settings window, from the app, and its own first frame.
    await s.eval(`window.gmux.openSettings().then(() => true)`, 30_000);
    const sp = await settingsPage(cdp, watch);
    await sleep(1500);
    await sp.call('Page.stopScreencast').catch(() => {});
    const settingsBoot = firstFrameOf(watch.frames.get(sp.sessionId) ?? [], scheme);
    L.settingsBoot = settingsBoot;
    if (settingsBoot !== null) {
      check(L, gradeFirstFrame(settingsBoot, scheme), `the Settings window's first frame: ${settingsBoot.colour} over ${(settingsBoot.share * 100).toFixed(0)} percent`);
    } else {
      // A window opened LATER cannot be screencast before it paints: this
      // probe learns the target exists only after main has made it, so on the
      // runs where no frame arrives the reading is taken where research 80
      // section 5 measured the first frame to come from, being the compositor
      // fill main composed for that window. It is the same number, taken one
      // layer down, and the log says which was read.
      const mainWs = await mainWsPromise;
      const fill =
        mainWs === null
          ? null
          : await mainEval(
              mainWs,
              `(() => { const { BrowserWindow } = ${REQ}('electron'); const w = BrowserWindow.getAllWindows().find((x) => /settings/.test(x.webContents.getURL())); return w ? w.getBackgroundColor() : null; })()`
            );
      L.settingsFill = fill;
      check(
        L,
        fill === null ? ['neither a first frame nor a window fill was read for the Settings window'] : gradeFirstFrame({ colour: fill, share: 1, otherShare: 0 }, scheme),
        `the Settings window's ground, read as the compositor fill main composed because no frame arrived before it painted: ${String(fill)}`
      );
    }
    const faceText = await sp.eval(FACE_JS, 60_000);
    const face = faceText === null ? null : JSON.parse(faceText);
    L.face = face;
    check(L, gradeFace(face, { checked: wantChecked }), `the Appearance face: ${face === null ? 'unread' : `${String(face.checked)} pressed of ${face.labels.join(', ')}; Shade asked -1 took ${String(face.refusedAt?.value)} and said "${String(face.refusedAt?.note)}"; Depth asked 2 took ${String(face.depthRefusedAt?.value)} and said "${String(face.depthRefusedAt?.note)}"; card ${face.card?.background ?? 'none'} / ${face.card?.color ?? 'none'}`}`);
    await screenshot(sp, join(shots, `${label.replace(/\s+/g, '-')}-settings.png`));
    await screenshot(s, join(shots, `${label.replace(/\s+/g, '-')}-app.png`));
    cdp.close();
  }).catch((error) => {
    threw = error;
  });
}

if (threw === null && driving('B')) await bootAndFace('B light boot', 'light', 'Light');

// ---------------------------------------------------------------------------
// Launch C: a hand edited settings file holding a scheme that is not one.
// ---------------------------------------------------------------------------

if (threw === null && driving('C')) {
  const settingsFile = join(profile, 'settings.json');
  try {
    const file = JSON.parse(readFileSync(settingsFile, 'utf8'));
    file.settings.colorScheme = 'paper';
    writeFileSync(settingsFile, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
    say('the settings file now says colorScheme "paper"');
  } catch (error) {
    say(`could not edit the settings file: ${String(error)}`);
  }
  await bootAndFace('C garbage boot', 'dark', 'Dark');
}

// ---------------------------------------------------------------------------
// Launch D: the ordinary in-session switch, read on the FACE (fix round).
//
// A person holding a shade of -2 on dark opens Settings, clicks Light, and
// looks at the Frame group. The window follows; the question this launch asks
// is whether the face does, because the applier publishes inside the view
// transition's own commit and that commit lands after React has already
// rendered the settings broadcast.
// ---------------------------------------------------------------------------

const SWITCH_JS = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const nav = [...document.querySelectorAll('button, [role="tab"], a')].find((el) => (el.textContent || '').trim() === 'Appearance');
  if (nav) nav.click();
  await wait(1200);
  const section = document.querySelector('section[aria-label="Appearance"]');
  if (!section) return JSON.stringify(null);
  const bandsOf = (root) => [...root.querySelectorAll('.set-frame-band')].map((el) => getComputedStyle(el).backgroundColor);
  const chipsOf = () => [...section.querySelectorAll('.set-frame-color')].map((el) => ({
    label: el.getAttribute('aria-label'),
    bands: [...el.querySelectorAll('.set-frame-chip-band')].map((b) => getComputedStyle(b).backgroundColor)
  }));
  const readSlider = (label) => { const el = section.querySelector('input[aria-label="' + label + '"]'); return el === null ? null : { value: Number(el.value), min: Number(el.min), max: Number(el.max) }; };
  const noteOf = (label) => { const el = section.querySelector('input[aria-label="' + label + '"]'); if (el === null) return ''; const note = el.parentElement.querySelector('.set-frame-note'); return note === null ? '' : note.textContent.trim(); };
  const faceNow = (ms) => ({ ms, shade: readSlider('Shade'), depth: readSlider('Depth'), note: noteOf('Shade'), bands: bandsOf(section), chips: chipsOf() });
  const before = faceNow(0);
  const group = section.querySelector('[role="radiogroup"][aria-label="Scheme"]');
  const lightRadio = group === null ? null : [...group.querySelectorAll('[role="radio"]')].find((r) => r.getAttribute('aria-label') === 'Light');
  if (lightRadio === null || lightRadio === undefined) return JSON.stringify({ before, after: null });
  lightRadio.click();
  const readings = [];
  let waited = 0;
  for (const ms of [500, 2500, 5000]) {
    await wait(ms - waited);
    waited = ms;
    readings.push(faceNow(ms));
  }
  const groupNow = section.querySelector('[role="radiogroup"][aria-label="Scheme"]');
  const after = {
    rootScheme: document.documentElement.getAttribute('data-scheme'),
    canvas: getComputedStyle(document.documentElement).getPropertyValue('--bg-canvas').trim(),
    checked: [...(groupNow ? groupNow.querySelectorAll('[role="radio"]') : [])].find((r) => r.getAttribute('aria-checked') === 'true')?.getAttribute('aria-label') ?? null,
    readings
  };
  return JSON.stringify({ before, after });
})()`;

if (threw === null && driving('D')) {
  const L = { name: 'D in-session switch', findings: 0 };
  report.launches.push(L);
  await withElectron(launch('D in-session switch'), async (handle) => {
    const { cdp } = await browserEndpoint();
    const watch = watchTargets(cdp);
    await cdp.call('Target.setDiscoverTargets', { discover: true });
    await cdp.call('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
    const s = await appPage(cdp, watch);
    await sleep(1500);
    await s.call('Page.stopScreencast').catch(() => {});
    // The frame a person is holding on dark: shade -2 at depth 0 is one of
    // the 35 pairs the dark base offers and one of the 31 paper cannot draw.
    await s.eval(
      `window.gmux.settingsSet({ colorScheme: 'dark', chromeShade: -2, chromeDepth: 0 }).then(() => true)`,
      30_000
    );
    await sleep(800);
    await s.eval(`window.gmux.openSettings().then(() => true)`, 30_000);
    const sp = await settingsPage(cdp, watch);
    await sleep(1500);
    await sp.call('Page.stopScreencast').catch(() => {});
    const text = await sp.eval(SWITCH_JS, 60_000);
    const read = text === null ? null : JSON.parse(text);
    L.switch = read;
    check(
      L,
      gradeSwitchedFace(read?.before ?? null, read?.after ?? null),
      `the face after an in-session switch: Shade ${String(read?.before?.shade?.value)} then ${String(read?.after?.readings?.[0]?.shade?.value)}, "${String(read?.after?.readings?.[0]?.note)}", the strip ${(read?.after?.readings?.[0]?.bands ?? []).join(' ')}`
    );
    // The window the face belongs to really did move, which is the control:
    // a face that agrees with a window that did not switch proves nothing.
    const app = await s.eval(`window.__gmuxP207.read()`, 30_000);
    check(
      L,
      app.scheme === 'light' ? [] : [`the app window is on the ${String(app.scheme)} base after the switch`],
      `the app window followed the same click: scheme ${String(app.scheme)}, canvas ${String(app.tokens['--bg-canvas'])}`
    );
    await screenshot(sp, join(shots, 'D-in-session-switch-settings.png'));
    cdp.close();
  }).catch((error) => {
    threw = error;
  });
}

// ---------------------------------------------------------------------------
// Launch E: THE CARRIED FRAME, and what the two sliders do to it (Phase 213,
// the committer's round).
//
// The verification's one open finding. `frameForBase` brings a frame the new
// base cannot draw to the nearest stop it does offer and persists nothing, so
// going back brings it back exactly. On paper the whole region is one shade
// row, so the Shade slider is inert; the slider drew the BROUGHT stop and
// persisted whatever a move clamped to, so one arrow key or one stray click
// on that inert control wrote the shipped stop over the shade the person
// chose on dark. The depth had the same shape one stop wider.
//
// This launch drives it with REAL key and mouse events through the Input
// domain rather than a synthesised change, and reads the PERSISTED settings
// from the app window's own bridge rather than the face, because the face is
// a clamp and the file is the promise. Arm 3 is the control: an arrow INSIDE
// the Depth range must still persist, or the guard has made a live control
// dead.
// ---------------------------------------------------------------------------

/** Focus one slider on the Appearance card, and answer its track rectangle. */
const SLIDER_JS = (label) => `(() => {
  const section = document.querySelector('section[aria-label="Appearance"]');
  const el = section === null ? null : section.querySelector('input[aria-label="${label}"]');
  if (el === null) return null;
  el.focus();
  const r = el.getBoundingClientRect();
  return JSON.stringify({ value: Number(el.value), min: Number(el.min), max: Number(el.max), x: r.left, y: r.top, w: r.width, h: r.height });
})()`;

if (threw === null && driving('E')) {
  const L = { name: 'E the carried frame', findings: 0 };
  report.launches.push(L);
  await withElectron(launch('E the carried frame'), async (handle) => {
    const { cdp } = await browserEndpoint();
    const watch = watchTargets(cdp);
    await cdp.call('Target.setDiscoverTargets', { discover: true });
    await cdp.call('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
    const s = await appPage(cdp, watch);
    await sleep(1500);
    await s.call('Page.stopScreencast').catch(() => {});
    const persisted = async () => {
      const all = await s.eval(`window.gmux.settingsGet().then((v) => JSON.stringify({ chromeShade: v.chromeShade, chromeDepth: v.chromeDepth, colorScheme: v.colorScheme }))`, 30_000);
      return all === null || all === undefined ? null : JSON.parse(all);
    };
    // The frame a person is holding on dark: shade -2 at depth 3, one of the
    // 35 pairs the dark base offers and one of the 31 paper cannot draw, and
    // it is outside the light region on BOTH axes.
    await s.eval(
      `window.gmux.settingsSet({ colorScheme: 'dark', chromeShade: -2, chromeDepth: 3 }).then(() => true)`,
      30_000
    );
    await sleep(800);
    const read = { start: await persisted() };
    await s.eval(`window.gmux.openSettings().then(() => true)`, 30_000);
    const sp = await settingsPage(cdp, watch);
    await sleep(1200);
    await sp.call('Page.stopScreencast').catch(() => {});
    await sp.eval(`(async () => {
      const nav = [...document.querySelectorAll('button, [role="tab"], a')].find((el) => (el.textContent || '').trim() === 'Appearance');
      if (nav) nav.click();
      await new Promise((r) => setTimeout(r, 1200));
      const group = document.querySelector('[role="radiogroup"][aria-label="Scheme"]');
      const light = group === null ? null : [...group.querySelectorAll('[role="radio"]')].find((r) => r.getAttribute('aria-label') === 'Light');
      if (light) light.click();
      return true;
    })()`, 30_000);
    await sleep(3000);
    const shadeText = await sp.eval(SLIDER_JS('Shade'), 30_000);
    const depthText = await sp.eval(SLIDER_JS('Depth'), 30_000);
    const shadeBox = shadeText === null ? null : JSON.parse(shadeText);
    const depthBox = depthText === null ? null : JSON.parse(depthText);
    read.face = { shade: shadeBox?.value, depth: depthBox?.value };
    read.tracks = { shade: shadeBox, depth: depthBox };
    // The settle time is HUE_COMMIT_MS plus the broadcast and the disk write,
    // which is one order of magnitude under this.
    const settle = 900;
    const arrow = async (label, key) => {
      await sp.eval(SLIDER_JS(label), 30_000);
      await press(sp, key === 'left'
        ? { key: 'ArrowLeft', code: 'ArrowLeft', vk: 37, modifiers: 0 }
        : { key: 'ArrowRight', code: 'ArrowRight', vk: 39, modifiers: 0 });
      await sleep(settle);
      return persisted();
    };
    read.shadeLeft = await arrow('Shade', 'left');
    read.shadeRight = await arrow('Shade', 'right');
    // A stray click on the track, which is the shape the fix round named. The
    // point is nine tenths along, which on a seven stop track is the far end.
    if (shadeBox !== null) {
      const x = shadeBox.x + shadeBox.w * 0.9;
      const y = shadeBox.y + shadeBox.h / 2;
      const at = { x, y, button: 'left', clickCount: 1, buttons: 1 };
      await sp.call('Input.dispatchMouseEvent', { type: 'mousePressed', ...at });
      await sp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at, buttons: 0 });
    }
    await sleep(settle);
    read.shadeClick = await persisted();
    read.depthPast = await arrow('Depth', 'right');
    read.depthIn = await arrow('Depth', 'left');
    // Back to the base that can draw it.
    await sp.eval(`(() => {
      const group = document.querySelector('[role="radiogroup"][aria-label="Scheme"]');
      const dark = group === null ? null : [...group.querySelectorAll('[role="radio"]')].find((r) => r.getAttribute('aria-label') === 'Dark');
      if (dark) dark.click();
      return true;
    })()`, 30_000);
    await sleep(3000);
    const backShade = await sp.eval(SLIDER_JS('Shade'), 30_000);
    const backDepth = await sp.eval(SLIDER_JS('Depth'), 30_000);
    const app = await s.eval(`window.__gmuxP207.read()`, 30_000);
    read.backOnDark = {
      scheme: app?.scheme,
      shade: backShade === null ? null : JSON.parse(backShade).value,
      depth: backDepth === null ? null : JSON.parse(backDepth).value
    };
    L.carried = read;
    check(
      L,
      gradeCarriedFrame(read),
      `the carried frame across a visit to paper: set ${String(read.start?.chromeShade)}/${String(read.start?.chromeDepth)}, drawn ${String(read.face?.shade)}/${String(read.face?.depth)}, after the arrows and the click ${String(read.shadeClick?.chromeShade)}/${String(read.shadeClick?.chromeDepth)}, a refused depth ${String(read.depthPast?.chromeDepth)}, a real one ${String(read.depthIn?.chromeDepth)}, back on dark ${String(read.backOnDark?.shade)}/${String(read.backOnDark?.depth)}`
    );
    await screenshot(sp, join(shots, 'E-carried-frame-settings.png'));
    cdp.close();
  }).catch((error) => {
    threw = error;
  });
}

writeFileSync(join(root, 'p213-report.json'), JSON.stringify(report, null, 2), 'utf8');
say(`the report is at ${join(root, 'p213-report.json')}, photographs under ${shots}`);
if (threw !== null) {
  console.error(`${TAG} the run threw: ${String(threw?.stack ?? threw)}`);
  process.exit(1);
}
say(
  report.findings === 0
    ? 'OK: dark boots dark and light boots light from the first frame, every surface follows the base, the switch crossfades with no half palette and reduced motion switches in one frame, the mock is met by rectangle and by colour, the fill follows through main, Match the Mac follows the system within a second, garbage in the settings file reads as dark, the Appearance face follows an in-session switch at every reading, and a frame paper cannot draw survives the visit untouched while a move inside the range still writes'
    : `${String(report.findings)} finding(s)`
);
process.exit(report.findings === 0 ? 0 : 1);
