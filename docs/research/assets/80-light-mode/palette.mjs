// The light base palette for Phase 213, designed on a paper ground and solved to the dark palette's pinned ratios.
import { ratio, solve, mk, oklch, hexOf, over, step, de2000, r2, r3, L, Y } from './lib/colour.mjs';
export const DARK = {
  '--bg-canvas': '#131417', '--bg-sidebar': '#0e0f13', '--bg-surface': '#191b20', '--bg-raised': '#202329', '--bg-active': '#252931',
  '--border': '#25282e', '--border-active': '#2d3038', '--border-strong': '#353943',
  '--text-primary': '#c9cacd', '--text-secondary': '#9ca1ab', '--text-muted': '#838996', '--text-disabled': '#565b66',
  '--accent': '#4d9de8', '--accent-hover': '#63acf0', '--accent-text': '#82bfff', '--on-accent': '#0d1117',
  '--status-working': '#4d9de8', '--status-attention': '#f5b84a', '--status-idle': '#6e7583', '--status-exited': '#6e7583', '--status-failed': '#e5655e',
  '--status-attention-badge-bg': '#f5b84a', '--status-attention-badge-fg': '#131417',
  '--git-modified': '#af9c74', '--git-added': '#6bc46d', '--git-deleted': '#e5655e', '--git-renamed': '#6cb6ff', '--git-conflict': '#f0883e', '--git-ignored': '#565b66',
  '--graph-lane-3': '#56c2c0', '--graph-lane-5': '#d19fe8',
  '--error': '#e5655e', '--warning': '#f5b84a', '--success': '#6bc46d', '--info': '#6cb6ff'
};
export const DARK_TERM = { background: '#131417', foreground: '#d8dbe2', cursor: '#e8eaed',
  black: '#1b1d22', red: '#e5655e', green: '#6bc46d', yellow: '#e2b340', blue: '#6cb6ff', magenta: '#c583d8', cyan: '#56c2c0', white: '#c9cdd6',
  brightBlack: '#4a505c', brightRed: '#f07e78', brightGreen: '#85d488', brightYellow: '#f0c674', brightBlue: '#8fc7ff', brightMagenta: '#d19fe8', brightCyan: '#6fd6d4', brightWhite: '#e8eaed' };

// THE NEUTRALS. The dark ramp is a cool graphite whose eight rungs sit at OKLCH hue 264 to 274 with chroma about 0.006.
// The paper keeps that hue and about the same chroma, so the eight named starting colours turn it the same way.
const H = 268, C = 0.004;
export const LIGHT = {};
LIGHT['--bg-canvas'] = mk(0.975, C, H);        // paper, not white
LIGHT['--bg-sidebar'] = mk(0.952, C + 0.002, H); // the frame steps under the work, one rung below the paper
LIGHT['--bg-surface'] = mk(0.992, 0.002, H);     // the sheet a modal, a toast or an input is: one rung above the paper, the shadow carries the lift
LIGHT['--bg-raised'] = mk(0.928, C + 0.004, H);  // hover, chips and badges press INTO the paper: darker, not lighter
LIGHT['--bg-active'] = mk(0.895, C + 0.006, H);  // the selected row, the deepest fill, where every decoration is measured
LIGHT['--border'] = mk(0.868, C + 0.006, H);     // the hairline between regions
LIGHT['--border-active'] = mk(0.820, C + 0.008, H); // the hairline drawn on the selected fill
LIGHT['--border-strong'] = mk(0.760, C + 0.010, H); // input borders and hovered handles
const canvas = LIGHT['--bg-canvas'], side = LIGHT['--bg-sidebar'], surf = LIGHT['--bg-surface'], raised = LIGHT['--bg-raised'], active = LIGHT['--bg-active'];
// THE TEXT, solved dark to the dark palette's own ratio in the same hue, exactly as hue.ts would.
const pinned = (t, g) => ratio(DARK[t], DARK[g]);
LIGHT['--text-primary'] = solve(DARK['--text-primary'], canvas, pinned('--text-primary', '--bg-canvas'), true);
LIGHT['--text-secondary'] = solve(DARK['--text-secondary'], canvas, pinned('--text-secondary', '--bg-canvas'), true);
// muted is pinned on the surface on dark; on light its worst ground is the sidebar, so it is solved to clear 4.5 there and lands at the canvas ratio it can.
LIGHT['--text-muted'] = solve(DARK['--text-muted'], canvas, pinned('--text-muted', '--bg-canvas'), true);
if (ratio(LIGHT['--text-muted'], side) < 4.5) LIGHT['--text-muted'] = solve(DARK['--text-muted'], side, 4.5, true);
LIGHT['--text-disabled'] = solve(DARK['--text-disabled'], canvas, pinned('--text-disabled', '--bg-canvas'), true);
// THE ACCENT keeps the blue's hue and chroma; as text it clears 4.5 on the paper and as a fill it clears 3 on the paper and carries paper coloured text at 4.5.
const accentHue = oklch(DARK['--accent']);
LIGHT['--accent'] = solve(DARK['--accent'], canvas, 4.5, true);
LIGHT['--accent-hover'] = solve(DARK['--accent'], canvas, 5.2, true); // hover DARKENS on paper
LIGHT['--accent-text'] = solve(DARK['--accent-text'], canvas, 5.0, true);
LIGHT['--on-accent'] = canvas; // the paper itself, one material
// THE STATUS DOTS clear 3:1 on the active row, and the badge keeps dark text at 4.5 on the amber.
LIGHT['--status-working'] = LIGHT['--accent'];
LIGHT['--status-attention'] = solve(DARK['--status-attention'], canvas, 4.5, true); // paper text on it at 4.5, so the badge and the dot are ONE amber; 3.5 on the active row follows
LIGHT['--status-idle'] = solve(DARK['--status-idle'], active, 3.4, true);
LIGHT['--status-exited'] = LIGHT['--status-idle'];
LIGHT['--status-failed'] = solve(DARK['--status-failed'], active, 3.4, true);
LIGHT['--status-attention-badge-bg'] = LIGHT['--status-attention'];
LIGHT['--status-attention-badge-fg'] = canvas; // paper on amber, the mirror of graphite on amber
// THE GIT DECORATIONS and the two lanes keep their hue and the ratio they hold on the dark active fill.
for (const t of ['--git-modified', '--git-added', '--git-deleted', '--git-renamed', '--git-conflict', '--graph-lane-3', '--graph-lane-5']) {
  LIGHT[t] = solve(DARK[t], active, Math.max(3.0, pinned(t, '--bg-active')), true);
}
LIGHT['--git-ignored'] = LIGHT['--text-disabled'];
LIGHT['--error'] = LIGHT['--git-deleted']; LIGHT['--warning'] = LIGHT['--status-attention']; LIGHT['--success'] = LIGHT['--git-added']; LIGHT['--info'] = LIGHT['--git-renamed'];
// THE TERMINAL. The foreground is the transcript, one rung darker than --text-primary as it is one rung brighter on dark.
export const TERM = { background: canvas, cursorAccent: canvas };
TERM.foreground = solve(DARK_TERM.foreground, canvas, ratio(DARK_TERM.foreground, DARK_TERM.background), true);
TERM.cursor = solve(DARK_TERM.cursor, canvas, ratio(DARK_TERM.cursor, DARK_TERM.background), true);
// The sixteen: the eight normal slots are TEXT and clear 4.5 on the paper in the dark palette's own hues; the eight bright slots are the same hues
// lighter and more saturated, kept distinct by at least 8 dE2000 and never under 3.2 so a bright colour is still a colour on paper.
const norm = { red: 6.5, green: 6.5, yellow: 6.5, blue: 6.5, magenta: 6.5, cyan: 6.5 };
for (const k of Object.keys(norm)) TERM[k] = solve(DARK_TERM[k], canvas, norm[k], true);
const bright = { brightRed: 4.5, brightGreen: 4.5, brightYellow: 4.5, brightBlue: 4.5, brightMagenta: 4.5, brightCyan: 4.5 };
for (const k of Object.keys(bright)) { const base = DARK_TERM[k]; const o = oklch(base); TERM[k] = solve(hexOf({ mode: 'oklch', l: o.l, c: Math.min(0.22, o.c * 1.5), h: o.h }), canvas, bright[k], true); }
TERM.black = LIGHT['--text-primary'];               // slot 0 is ink on paper, the darkest neutral, used as text by TUIs that ask for black
TERM.brightBlack = solve(DARK_TERM.brightBlack, canvas, 4.6, true); // dim text: comments, hints; text, so 4.5
TERM.white = solve(DARK_TERM.white, canvas, 7.0, true);  // slot 7 is the default foreground of most TUIs: body text, a rung under the ink and two above the dim grey
TERM.brightWhite = TERM.foreground;                       // bold text: the transcript ink
export const SELECTION = (a) => { const [r, g, b] = [LIGHT['--accent']].map((h) => { const c = h.slice(1); return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]; })[0]; return `rgba(${r}, ${g}, ${b}, ${a})`; };
LIGHT['--accent-wash'] = SELECTION(0.14); LIGHT['--drop-wash'] = SELECTION(0.25); LIGHT['--accent-soft'] = SELECTION(0.6); LIGHT['--terminal-selection'] = SELECTION(0.3); LIGHT['--focus-ring'] = `0 0 0 2px ${SELECTION(0.6)}`;
TERM.selectionBackground = SELECTION(0.3);
const rgbTxt = (h) => { const c = h.slice(1); return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)].join(', '); };
LIGHT['--bg-scrim'] = 'rgba(20, 23, 30, 0.40)';
LIGHT['--shadow-1'] = '0 1px 3px rgba(20, 23, 30, 0.12)';
LIGHT['--shadow-2'] = '0 4px 16px rgba(20, 23, 30, 0.14)';
LIGHT['--shadow-3'] = '0 12px 40px rgba(20, 23, 30, 0.18), 0 2px 8px rgba(20, 23, 30, 0.10)';
LIGHT['--error-wash'] = `rgba(${rgbTxt(LIGHT['--error'])}, 0.12)`; LIGHT['--warning-wash'] = `rgba(${rgbTxt(LIGHT['--warning'])}, 0.12)`; LIGHT['--success-wash'] = `rgba(${rgbTxt(LIGHT['--success'])}, 0.12)`;
LIGHT['--focus-wash-attention'] = `rgba(${rgbTxt(LIGHT['--status-attention'])}, 0.14)`; LIGHT['--focus-wash-working'] = SELECTION(0.14); LIGHT['--focus-wash-idle'] = `rgba(${rgbTxt(raised)}, 0.5)`;
const ink = LIGHT['--text-secondary'];
const alphaFor = (target) => { let lo = 0, hi = 1; for (let i = 0; i < 30; i += 1) { const mid = (lo + hi) / 2; if (ratio(over(`rgba(${rgbTxt(ink)}, ${mid})`, canvas), canvas) >= target) hi = mid; else lo = mid; } return Math.ceil(hi * 100) / 100; };
LIGHT['--scroll-thumb'] = `rgba(${rgbTxt(ink)}, ${alphaFor(3.1)})`; LIGHT['--scroll-thumb-away'] = `rgba(${rgbTxt(ink)}, ${alphaFor(3.5)})`; LIGHT['--scroll-thumb-hover'] = `rgba(${rgbTxt(ink)}, ${alphaFor(6.5)})`; LIGHT['--scroll-thumb-active'] = `rgba(${rgbTxt(LIGHT['--text-primary'])}, ${Math.min(1, alphaFor(11.9))})`;
LIGHT['--file-icon-dim'] = '0.72';
LIGHT['--graph-bundle'] = 'var(--text-muted)';
LIGHT['--graph-lane-1'] = 'var(--accent)'; LIGHT['--graph-lane-2'] = 'var(--git-deleted)'; LIGHT['--graph-lane-4'] = 'var(--git-conflict)'; LIGHT['--graph-lane-6'] = 'var(--git-added)';

if (process.argv.includes('--report')) {
  const line = (t, v, note) => console.log(`| ${t} | ${DARK[t] ?? ''} | ${v} | ${note} |`);
  console.log('| token | dark | light | measured |');
  const ramp = ['--bg-active', '--bg-raised', '--bg-sidebar', '--bg-canvas', '--bg-surface'];
  for (const t of ['--bg-canvas', '--bg-sidebar', '--bg-surface', '--bg-raised', '--bg-active']) line(t, LIGHT[t], `OKLCH L ${r3(L(LIGHT[t]))}, Y ${r3(Y(LIGHT[t]))}`);
  console.log('ramp order light to dark: ' + ['--bg-surface', '--bg-canvas', '--bg-sidebar', '--bg-raised', '--bg-active', '--border', '--border-active', '--border-strong'].map((t) => `${t} ${r3(Y(LIGHT[t]))}`).join(' > '));
  const pairs = [['--bg-surface', '--bg-canvas'], ['--bg-canvas', '--bg-sidebar'], ['--bg-sidebar', '--bg-raised'], ['--bg-raised', '--bg-active'], ['--bg-active', '--border'], ['--border', '--border-active'], ['--border-active', '--border-strong']];
  console.log('rendered steps: ' + pairs.map(([a, b]) => `${a}/${b} ${step(LIGHT[a], LIGHT[b])}`).join(', '));
  console.log('hairlines: border on sidebar ' + r3(ratio(LIGHT['--border'], side)) + ', border on canvas ' + r3(ratio(LIGHT['--border'], canvas)) + ', border-active on active ' + r3(ratio(LIGHT['--border-active'], active)) + ', border on active ' + r3(ratio(LIGHT['--border'], active)) + ', raised on surface ' + r3(ratio(raised, surf)) + ', raised on sidebar ' + r3(ratio(raised, side)) + ', active on sidebar ' + r3(ratio(active, side)));
  for (const t of ['--text-primary', '--text-secondary', '--text-muted', '--text-disabled']) line(t, LIGHT[t], ['--bg-canvas', '--bg-sidebar', '--bg-surface', '--bg-raised', '--bg-active'].map((g) => `${g.slice(5)} ${r2(ratio(LIGHT[t], LIGHT[g]))}`).join(', ') + ` (dark pinned ${r2(pinned(t, '--bg-canvas'))} canvas)`);
  for (const t of ['--accent', '--accent-hover', '--accent-text']) line(t, LIGHT[t], `on canvas ${r2(ratio(LIGHT[t], canvas))}, on sidebar ${r2(ratio(LIGHT[t], side))}, on active ${r2(ratio(LIGHT[t], active))}`);
  line('--on-accent', LIGHT['--on-accent'], `on accent ${r2(ratio(LIGHT['--on-accent'], LIGHT['--accent']))}, on accent-hover ${r2(ratio(LIGHT['--on-accent'], LIGHT['--accent-hover']))}`);
  for (const t of ['--status-working', '--status-attention', '--status-idle', '--status-failed']) line(t, LIGHT[t], `on active ${r2(ratio(LIGHT[t], active))}, on sidebar ${r2(ratio(LIGHT[t], side))}, on canvas ${r2(ratio(LIGHT[t], canvas))} (dark on active ${r2(pinned(t, '--bg-active'))})`);
  line('--status-attention-badge-bg', LIGHT['--status-attention-badge-bg'], `badge fg ${LIGHT['--status-attention-badge-fg']} on it ${r2(ratio(LIGHT['--status-attention-badge-fg'], LIGHT['--status-attention-badge-bg']))}`);
  for (const t of ['--git-modified', '--git-added', '--git-deleted', '--git-renamed', '--git-conflict', '--git-ignored', '--graph-lane-3', '--graph-lane-5']) line(t, LIGHT[t], `on active ${r2(ratio(LIGHT[t], active))}, on sidebar ${r2(ratio(LIGHT[t], side))} (dark on active ${r2(pinned(t, '--bg-active'))}), hue ${Math.round(oklch(LIGHT[t]).h)} vs ${Math.round(oklch(DARK[t]).h)}`);
  const lanes = ['--accent', '--git-deleted', '--graph-lane-3', '--git-conflict', '--graph-lane-5', '--git-added'];
  let minLane = 999, atLane = '';
  for (let i = 0; i < 6; i += 1) { const d = de2000(LIGHT[lanes[i]], LIGHT[lanes[(i + 1) % 6]]); if (d < minLane) { minLane = d; atLane = `${lanes[i]}/${lanes[(i + 1) % 6]}`; } }
  console.log(`graph lanes, min consecutive dE2000 ${r2(minLane)} at ${atLane}; attention vs git-modified dE2000 ${r2(de2000(LIGHT['--status-attention'], LIGHT['--git-modified']))}, attention vs terminal yellow ${r2(de2000(LIGHT['--status-attention'], TERM.yellow))}`);
  console.log('washes over canvas: accent ' + over(LIGHT['--accent-wash'], canvas) + ' (' + r2(ratio(over(LIGHT['--accent-wash'], canvas), canvas)) + '), drop ' + over(LIGHT['--drop-wash'], canvas) + ', selection ' + over(TERM.selectionBackground, canvas) + ' fg on it ' + r2(ratio(TERM.foreground, over(TERM.selectionBackground, canvas))) + ', scrim ' + over(LIGHT['--bg-scrim'], canvas) + ', scroll thumb rest ' + r2(ratio(over(LIGHT['--scroll-thumb'], canvas), canvas)) + ' away ' + r2(ratio(over(LIGHT['--scroll-thumb-away'], canvas), canvas)) + ' hover ' + r2(ratio(over(LIGHT['--scroll-thumb-hover'], canvas), canvas)) + ' active ' + r2(ratio(over(LIGHT['--scroll-thumb-active'], canvas), canvas)));
  console.log('\n| slot | dark | light | on paper | vs bright dE2000 |');
  const slots = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
  for (const s of slots) { const b = 'bright' + s[0].toUpperCase() + s.slice(1); console.log(`| ${s} | ${DARK_TERM[s]} | ${TERM[s]} | ${r2(ratio(TERM[s], canvas))} | ${r2(de2000(TERM[s], TERM[b]))} |`); console.log(`| ${b} | ${DARK_TERM[b]} | ${TERM[b]} | ${r2(ratio(TERM[b], canvas))} | |`); }
  console.log(`| foreground | ${DARK_TERM.foreground} | ${TERM.foreground} | ${r2(ratio(TERM.foreground, canvas))} | dark pinned ${r2(ratio(DARK_TERM.foreground, DARK_TERM.background))} |`);
  console.log(`| cursor | ${DARK_TERM.cursor} | ${TERM.cursor} | ${r2(ratio(TERM.cursor, canvas))} | |`);
  console.log('text on the git and status hues as backgrounds is never drawn; the washes: error ' + over(LIGHT['--error-wash'], canvas) + ' warning ' + over(LIGHT['--warning-wash'], canvas) + ' success ' + over(LIGHT['--success-wash'], canvas));
}
