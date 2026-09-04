#!/usr/bin/env node
// Research 80 app run C: what xterm's minimumContrastRatio does to an interface that hard codes its colours, measured on Claude
// Code's resting face on the light ground. No turn is taken. One Electron on the gmux-p213 socket through build/electron-run.mjs.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sleep } from './lib/cdp.mjs';
import { launch, withElectron, browserEndpoint, appPage, screenshot, FIND_TERMS, RECTS, setTokensJs, clearTokensJs, SOCKET } from './lib/app.mjs';
import { LIGHT, TERM, DARK_TERM } from './palette.mjs';
import { decodePng, pixel } from './lib/png.mjs';
import { ratio } from './lib/colour.mjs';
const OUT = '/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p213';
const say = (l) => console.log(`[p213 C] ${l}`);
const report = { errors: [], readings: [] };
const AGENT = process.env.P213_AGENT || 'claude';
const root = realpathSync(mkdtempSync(join(tmpdir(), 'p213-c-')));
const project = join(root, 'p213-mcr'); const profile = join(root, 'profile');
for (const d of [project, profile]) mkdirSync(d, { recursive: true });
const git = (...a) => execFileSync('git', ['-C', project, ...a], { encoding: 'utf8', env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1' } });
writeFileSync(join(project, 'README.md'), '# p213-mcr\n');
git('init', '-q'); git('config', 'user.email', 'p213@example.invalid'); git('config', 'user.name', 'p213'); git('add', '-A'); git('commit', '-q', '-m', 'seed');
const tmux = (...a) => spawnSync('tmux', ['-L', SOCKET, ...a], { encoding: 'utf8' });
const TERM_DARK = { ...DARK_TERM, cursorAccent: '#131417', selectionBackground: 'rgba(77, 157, 232, 0.30)' };
async function paneText(t) { return tmux('capture-pane', '-p', '-t', t).stdout; }
async function waitStable(target, ms, settleMs = 3000) { let last = ''; let lastChange = Date.now(); const t0 = Date.now(); while (Date.now() - t0 < ms) { const now = await paneText(target); if (now !== last) { last = now; lastChange = Date.now(); } else if (Date.now() - lastChange > settleMs && now.trim().length > 0) return now; await sleep(400); } return last; }
// The cells to read: every cell whose foreground is a 256 colour or an RGB colour, grouped by colour, with one sample cell each.
const CELLS = `(() => {
  const terms = (window.__p213Terms || []).filter((t) => t.element && t.element.offsetParent !== null); const term = terms[terms.length - 1]; if (!term) return null;
  const buf = term.buffer.active; const groups = new Map();
  for (let y = 0; y < term.rows; y += 1) { const line = buf.getLine(buf.viewportY + y); if (!line) continue; for (let x = 0; x < term.cols; x += 1) { const c = line.getCell(x); if (!c) continue; const ch = c.getChars(); if (!ch || ch === ' ' || c.isFgDefault()) continue; if (!/[A-Za-z0-9]/.test(ch)) continue; const code = (c.isFgRGB() ? 'r' : 'p') + c.getFgColor(); const bgcode = c.isBgDefault() ? 'd' : (c.isBgRGB() ? 'r' : 'p') + c.getBgColor(); const k = code + '/' + bgcode + '/' + (c.isBold() ? 'b' : '') + (c.isDim() ? 'd' : ''); if (!groups.has(k)) groups.set(k, { fg: code, bg: bgcode, bold: c.isBold() ? 1 : 0, dim: c.isDim() ? 1 : 0, y, x, ch, text: line.translateToString(true).slice(Math.max(0, x - 8), x + 20).trim(), n: 0 }); groups.get(k).n += 1; } }
  const dims = term._core._renderService.dimensions; const screen = term.element.querySelector('.xterm-screen').getBoundingClientRect();
  return { cell: { w: dims.css.cell.width, h: dims.css.cell.height }, screen: { x: screen.x, y: screen.y }, groups: [...groups.values()], mcr: term.options.minimumContrastRatio, rows: term.rows, cols: term.cols };
})()`;
const CUBE = [0, 95, 135, 175, 215, 255];
const ansi256 = (i) => { if (i < 232) { const n = i - 16; return '#' + [CUBE[Math.floor(n / 36)], CUBE[Math.floor(n / 6) % 6], CUBE[n % 6]].map((v) => v.toString(16).padStart(2, '0')).join(''); } const g = 8 + (i - 232) * 10; return '#' + [g, g, g].map((v) => v.toString(16).padStart(2, '0')).join(''); };
const SLOT = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite'];
const asked = (code, theme, fg) => { if (code === 'd') return fg ? theme.foreground : theme.background; if (code[0] === 'r') return '#' + Number(code.slice(1)).toString(16).padStart(6, '0'); const i = Number(code.slice(1)); return i < 16 ? theme[SLOT[i]] : ansi256(i); };
const dist = (a, b) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]) + Math.abs(x[2] - y[2]); };
async function readDrawn(s, label, theme) {
  const cells = await s.eval(CELLS); if (!cells) throw new Error('no terminal');
  const rects = await s.eval(RECTS); const r = rects.terminalHost;
  const buf = await screenshot(s, join(OUT, 'agents', `mcr-${label}.png`), { x: r.x, y: r.y, width: r.w, height: r.h });
  const img = decodePng(buf); const k = img.width / r.w;
  const rows = [];
  for (const g of cells.groups) {
    const cx = (cells.screen.x - r.x + g.x * cells.cell.w) * k, cy = (cells.screen.y - r.y + g.y * cells.cell.h) * k; const cw = cells.cell.w * k, chh = cells.cell.h * k;
    const bg = asked(g.bg, theme, false); let best = null, bestD = -1;
    for (let yy = 1; yy < chh - 1; yy += 1) for (let xx = 1; xx < cw - 1; xx += 1) { const p = pixel(img, cx + xx, cy + yy); const d = dist(p, bg); if (d > bestD) { bestD = d; best = p; } }
    const ask = asked(g.fg, theme, true);
    rows.push({ code: g.fg + (g.bold ? ' bold' : '') + (g.dim ? ' dim' : ''), on: g.bg, n: g.n, sample: g.text, asked: ask, askedRatio: Math.round(ratio(ask, bg) * 100) / 100, drawn: best, drawnRatio: Math.round(ratio(best, bg) * 100) / 100 });
  }
  rows.sort((a, b) => b.n - a.n);
  const out = { label, mcr: cells.mcr, rows: rows.slice(0, 16) };
  report.readings.push(out); say(label + ' mcr ' + cells.mcr + ': ' + rows.slice(0, 8).map((x) => `${x.code}${x.on !== 'd' ? ' on ' + x.on : ''} ${x.asked} ${x.askedRatio} -> ${x.drawn} ${x.drawnRatio} [${x.sample.slice(0, 18)}]`).join(' | '));
  return out;
}
const T0 = Date.now();
try {
  await withElectron({ ...launch('p213 C', profile, null, { GMUX_SPECSTORY_NO_CLOUD: '1' }) }, async () => {
    const { cdp } = await browserEndpoint(profile); const attached = new Map();
    cdp.on((m) => { if (m.method === 'Target.attachedToTarget') attached.set(m.params.targetInfo.targetId, m.params.sessionId); });
    await cdp.call('Target.setDiscoverTargets', { discover: true });
    const s = await appPage(cdp, attached);
    await s.eval(`window.__gmuxP95.openLocal(${JSON.stringify(project)}).then(() => true)`, 90000);
    const before = tmux('list-sessions', '-F', '#{session_name}').stdout.trim().split('\n');
    await s.eval(`window.__gmuxP95.create({ name: 'p213-mcr', agent: ${JSON.stringify(AGENT)} }).then(() => true)`, 120000);
    const target = tmux('list-sessions', '-F', '#{session_name}').stdout.trim().split('\n').find((n) => n && n !== 'gmux-control' && !before.includes(n)) || '';
    let text = await waitStable(target, 45000); say('first screen: ' + text.split('\n').filter((l) => l.trim()).slice(0, 2).join(' | ').slice(0, 160));
    await s.eval(FIND_TERMS);
    const setTheme = (theme, mcr) => s.eval(`(() => { for (const t of (window.__p213Terms || [])) { t.options.theme = ${JSON.stringify(theme)}; t.options.minimumContrastRatio = ${mcr}; } return 1; })()`);
    const light = () => s.eval(`(() => { ${setTokensJs(LIGHT)}; document.documentElement.style.colorScheme = 'light'; return 1; })()`);
    const dark = () => s.eval(`(() => { ${clearTokensJs(LIGHT)}; document.documentElement.style.colorScheme = 'dark'; return 1; })()`);
    // The trust screen, on both grounds at both settings.
    await light(); await setTheme(TERM, 1); await sleep(400); await readDrawn(s, 'trust-light-1', TERM);
    await setTheme(TERM, 4.5); await sleep(400); await readDrawn(s, 'trust-light-4.5', TERM);
    await setTheme(TERM, 3); await sleep(400); await readDrawn(s, 'trust-light-3', TERM);
    await dark(); await setTheme(TERM_DARK, 1); await sleep(400); await readDrawn(s, 'trust-dark-1', TERM_DARK);
    await setTheme(TERM_DARK, 4.5); await sleep(400); await readDrawn(s, 'trust-dark-4.5', TERM_DARK);
    if (/trust/i.test(text)) { if (/[❯>›]\s*No\b/i.test(text)) { tmux('send-keys', '-t', target, 'Down'); await sleep(300); } tmux('send-keys', '-t', target, 'Enter'); text = await waitStable(target, 30000); say('rest screen: ' + text.split('\n').filter((l) => l.trim()).slice(0, 2).join(' | ').slice(0, 160)); }
    await light(); await setTheme(TERM, 1); await sleep(500); await readDrawn(s, 'rest-light-1', TERM);
    await setTheme(TERM, 4.5); await sleep(500); await readDrawn(s, 'rest-light-4.5', TERM);
    await dark(); await setTheme(TERM_DARK, 1); await sleep(500); await readDrawn(s, 'rest-dark-1', TERM_DARK);
    await setTheme(TERM_DARK, 4.5); await sleep(500); await readDrawn(s, 'rest-dark-4.5', TERM_DARK);
    // The time a live change costs, read as the frame after the option write.
    report.swapMs = await s.eval(`(async () => { const t = (window.__p213Terms || [])[0]; const t0 = performance.now(); t.options.minimumContrastRatio = 1; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0; })()`);
    tmux('send-keys', '-t', target, 'Escape'); await sleep(300);
    try { const st = JSON.parse(await s.eval(`window.__gmuxP95.state().then((st) => JSON.stringify(st))`, 30000)); const sess = (st.sessions || []).find((x) => x.name === 'p213-mcr'); if (sess) await s.eval(`window.__gmuxP95.kill(${JSON.stringify(sess.id)}).then(() => true)`, 30000); } catch (e) { report.errors.push('end: ' + e.message); }
    tmux('kill-session', '-t', target);
    cdp.close();
  });
} finally {
  report.totalMs = Date.now() - T0;
  writeFileSync(join(OUT, 'report-c.json'), JSON.stringify(report, null, 2));
  say('done in ' + report.totalMs + ' ms; errors ' + JSON.stringify(report.errors));
}
