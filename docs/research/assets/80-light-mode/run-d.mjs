#!/usr/bin/env node
// Research 80 app run D: does an agent ASK the terminal what its ground is, and what does it draw when told? Each agent is
// started by name inside a shell session whose xterm answers the OSC 10 and OSC 11 queries with the light palette, logs every
// query, and is read at rest. No turn is taken except qwen's one, which run B never got to. One Electron on gmux-v213.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sleep } from './lib/cdp.mjs';
import { launch, withElectron, browserEndpoint, appPage, screenshot, FIND_TERMS, RECTS, setTokensJs, SOCKET } from './lib/app.mjs';
import { LIGHT, TERM } from './palette.mjs';
import { ratio, over } from './lib/colour.mjs';
const OUT = '/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p213';
const SHOTS = join(OUT, 'agents'); mkdirSync(SHOTS, { recursive: true });
const say = (l) => console.log(`[p213 D] ${l}`);
const report = { agents: {}, errors: [] };
const AGENTS = (process.env.P213_AGENTS || 'codex,pi,omp,claude,cursor-agent,gemini,muse,grok,qwen,deepseek').split(',');
const TURN_FOR = (process.env.P213_TURN_FOR || 'qwen').split(',');
const PROMPT = 'Append one line reading p213 to the end of README.md. Do nothing else.';
const root = realpathSync(mkdtempSync(join(tmpdir(), 'p213-d-')));
const project = join(root, 'p213-osc'); const profile = join(root, 'profile');
for (const d of [project, profile]) mkdirSync(d, { recursive: true });
const git = (...a) => execFileSync('git', ['-C', project, ...a], { encoding: 'utf8', env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1' } });
writeFileSync(join(project, 'README.md'), '# p213-osc\n\nA scratch repository for the research 80 ground query test.\n');
git('init', '-q'); git('config', 'user.email', 'p213@example.invalid'); git('config', 'user.name', 'p213'); git('add', '-A'); git('commit', '-q', '-m', 'seed');
const tmux = (...a) => spawnSync('tmux', ['-L', SOCKET, ...a], { encoding: 'utf8' });
const hexToOsc = (h) => 'rgb:' + [1, 3, 5].map((i) => h.slice(i, i + 2) + h.slice(i, i + 2)).join('/');
const CUBE = [0, 95, 135, 175, 215, 255];
const ansi256 = (i) => { if (i < 232) { const n = i - 16; return '#' + [CUBE[Math.floor(n / 36)], CUBE[Math.floor(n / 6) % 6], CUBE[n % 6]].map((v) => v.toString(16).padStart(2, '0')).join(''); } const g = 8 + (i - 232) * 10; return '#' + [g, g, g].map((v) => v.toString(16).padStart(2, '0')).join(''); };
const SLOT = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite'];
const READ_CELLS = `(() => {
  const terms = (window.__p213Terms || []).filter((t) => t.element && t.element.offsetParent !== null); const term = terms[terms.length - 1]; if (!term) return null;
  const buf = term.buffer.active; const out = []; for (let y = 0; y < term.rows; y += 1) { const line = buf.getLine(buf.viewportY + y); if (!line) continue; for (let x = 0; x < term.cols; x += 1) { const c = line.getCell(x); if (!c) continue; const ch = c.getChars(); if (!ch || ch === ' ') continue; out.push({ y, x, ch, fg: c.isFgDefault() ? 'd' : c.isFgRGB() ? 'r' + c.getFgColor() : 'p' + c.getFgColor(), bg: c.isBgDefault() ? 'd' : c.isBgRGB() ? 'r' + c.getBgColor() : 'p' + c.getBgColor(), bold: c.isBold() ? 1 : 0, dim: c.isDim() ? 1 : 0, inv: c.isInverse() ? 1 : 0 }); } }
  const text = []; for (let y = 0; y < term.rows; y += 1) { const line = buf.getLine(buf.viewportY + y); text.push(line ? line.translateToString(true) : ''); }
  return { cells: out, text: text.join('\\n').replace(/\\n+$/, ''), theme: term.options.theme, queries: term.__p213Queries || [] };
})()`;
const resolveColour = (code, theme, fg, bold) => { if (code === 'd') return fg ? theme.foreground : theme.background; if (code[0] === 'r') return '#' + Number(code.slice(1)).toString(16).padStart(6, '0'); let i = Number(code.slice(1)); if (fg && bold && i < 8) i += 8; return i < 16 ? theme[SLOT[i]] : ansi256(i); };
function judge(read) {
  const counts = { default: 0, ansi16: 0, ansi256: 0, rgb: 0 }; const bgs = { default: 0, other: 0 }; let worst = null; const hard = new Map();
  for (const c of read.cells) { const cls = c.fg === 'd' ? 'default' : c.fg[0] === 'r' ? 'rgb' : Number(c.fg.slice(1)) < 16 ? 'ansi16' : 'ansi256'; counts[cls] += 1; bgs[c.bg === 'd' ? 'default' : 'other'] += 1; let fg = resolveColour(c.fg, read.theme, true, c.bold); let bg = resolveColour(c.bg, read.theme, false, false); if (c.inv) [fg, bg] = [bg, fg]; if (!fg || !bg) continue; if (cls === 'rgb' || cls === 'ansi256') { const k = `${c.fg} ${fg}`; hard.set(k, (hard.get(k) ?? 0) + 1); } if (/^[─-▟⠀-⣿]+$/.test(c.ch)) continue; if (c.dim) fg = over(fg + '80', bg); const r = ratio(fg, bg); if (worst === null || r < worst.ratio) worst = { ratio: Math.round(r * 100) / 100, fg, bg, code: c.fg, on: c.bg, sample: (read.text.split('\n')[c.y] || '').slice(Math.max(0, c.x - 10), c.x + 20).trim() }; }
  return { counts, bgs, worst, hard: [...hard.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8), textHead: read.text.split('\n').filter((l) => l.trim()).slice(0, 3).map((l) => l.slice(0, 90)) };
}
async function paneText(t) { return tmux('capture-pane', '-p', '-t', t).stdout; }
async function waitStable(target, ms, settleMs = 3000) { let last = ''; let lastChange = Date.now(); const t0 = Date.now(); while (Date.now() - t0 < ms) { const now = await paneText(target); if (now !== last) { last = now; lastChange = Date.now(); } else if (Date.now() - lastChange > settleMs && now.trim().length > 0) return now; await sleep(400); } return last; }
const ARM = `(() => { const terms = (window.__p213Terms || []).filter((t) => t.element && t.element.offsetParent !== null); const term = terms[terms.length - 1]; if (!term || term.__p213Armed) return term ? 'already' : 'none'; term.__p213Armed = true; term.__p213Queries = [];
  const fg = ${JSON.stringify(hexToOsc(TERM.foreground))}, bg = ${JSON.stringify(hexToOsc(TERM.background))};
  term.parser.registerOscHandler(10, (data) => { term.__p213Queries.push({ osc: 10, data, at: Date.now() }); if (data === '?') term.input('\\x1b]10;' + fg + '\\x1b\\\\', false); return true; });
  term.parser.registerOscHandler(11, (data) => { term.__p213Queries.push({ osc: 11, data, at: Date.now() }); if (data === '?') term.input('\\x1b]11;' + bg + '\\x1b\\\\', false); return true; });
  return typeof term.input === 'function' ? 'armed' : 'armed but no input method'; })()`;
async function light(s) { await s.eval(FIND_TERMS); await s.eval(`(() => { ${setTokensJs(LIGHT)}; document.documentElement.style.colorScheme = 'light'; for (const t of (window.__p213Terms || [])) t.options.theme = ${JSON.stringify(TERM)}; return 1; })()`); }
async function reading(s, name) { const read = await s.eval(READ_CELLS); if (!read) return { note: 'no visible terminal' }; const rects = await s.eval(RECTS); const r = rects.terminalHost; await screenshot(s, join(SHOTS, `${name}.png`), { x: r.x, y: r.y, width: r.w, height: r.h }); return { file: `${name}.png`, ...judge(read), queries: read.queries }; }
const T0 = Date.now();
try {
  await withElectron({ ...launch('p213 D', profile, null, { GMUX_SPECSTORY_NO_CLOUD: '1' }) }, async () => {
    const { cdp } = await browserEndpoint(profile); const attached = new Map();
    cdp.on((m) => { if (m.method === 'Target.attachedToTarget') attached.set(m.params.targetInfo.targetId, m.params.sessionId); });
    await cdp.call('Target.setDiscoverTargets', { discover: true });
    const s = await appPage(cdp, attached);
    await s.eval(`window.__gmuxP95.openLocal(${JSON.stringify(project)}).then(() => true)`, 90000);
    for (const bin of AGENTS) {
      const id = bin === 'cursor-agent' ? 'cursor' : bin; const rec = { bin, states: {} }; report.agents[id] = rec;
      try {
        const before = tmux('list-sessions', '-F', '#{session_name}').stdout.trim().split('\n');
        await s.eval(`window.__gmuxP95.create({ name: ${JSON.stringify('osc-' + id)}, agent: 'shell' }).then(() => true)`, 120000);
        const target = tmux('list-sessions', '-F', '#{session_name}').stdout.trim().split('\n').find((n) => n && n !== 'gmux-control' && !before.includes(n)) || '';
        await waitStable(target, 20000, 1500);
        await light(s); rec.armed = await s.eval(ARM); await sleep(200);
        tmux('send-keys', '-t', target, '-l', bin); tmux('send-keys', '-t', target, 'Enter');
        let text = await waitStable(target, 45000, 3000);
        if (/trust/i.test(text) && /[❯>›]\s*No\b/i.test(text)) { tmux('send-keys', '-t', target, 'Down'); await sleep(300); tmux('send-keys', '-t', target, 'Enter'); text = await waitStable(target, 30000, 3000); rec.trustAnswered = true; }
        else if (/Do you trust|Trust this workspace|Workspace Trust/i.test(text)) { tmux('send-keys', '-t', target, /\[a\]/.test(text) ? 'a' : 'Enter'); text = await waitStable(target, 30000, 3000); rec.trustAnswered = true; }
        await light(s); await sleep(300);
        rec.states.rest = await reading(s, `${id}-rest-osc`);
        say(`${id}: armed ${rec.armed}; queries ${JSON.stringify(rec.states.rest.queries)}; fg ${JSON.stringify(rec.states.rest.counts)}; worst ${JSON.stringify(rec.states.rest.worst)}`);
        if (TURN_FOR.includes(id) && !/login|sign in|not authenticated/i.test(text)) {
          tmux('send-keys', '-t', target, '-l', PROMPT); await sleep(400); tmux('send-keys', '-t', target, 'Enter');
          const t0 = Date.now(); let last = await paneText(target); let mid = false; let idleSince = null;
          while (Date.now() - t0 < 75000) { await sleep(700); const now = await paneText(target); const changed = now !== last; last = now; if (!mid && changed && Date.now() - t0 > 1200) { mid = true; rec.states.midTurn = await reading(s, `${id}-midturn-osc`); } if (/\b(yes|allow|approve|confirm)\b|\(y\/n\)|\[y\/n\]/i.test(now.slice(-1200)) && !rec.states.permission) { await sleep(900); rec.states.permission = await reading(s, `${id}-permission-osc`); break; } if (!changed) { if (idleSince === null) idleSince = Date.now(); else if (Date.now() - idleSince > 9000 && Date.now() - t0 > 12000) break; } else idleSince = null; }
          rec.states.afterTurn = await reading(s, `${id}-afterturn-osc`);
          say(`${id} turn: states ${Object.keys(rec.states).join(',')}`);
        }
        tmux('send-keys', '-t', target, 'Escape'); await sleep(200); tmux('send-keys', '-t', target, 'C-c'); await sleep(300); tmux('send-keys', '-t', target, 'C-c'); await sleep(500);
        try { const st = JSON.parse(await s.eval(`window.__gmuxP95.state().then((st) => JSON.stringify(st))`, 30000)); const sess = (st.sessions || []).find((x) => x.name === 'osc-' + id); if (sess) await s.eval(`window.__gmuxP95.kill(${JSON.stringify(sess.id)}).then(() => true)`, 30000); } catch (e) { rec.endError = e.message; }
        tmux('kill-session', '-t', target); await sleep(600);
      } catch (e) { rec.error = String(e.message); report.errors.push(`${id}: ${e.message}`); say(`${id} FAILED ${e.message}`); }
      writeFileSync(join(OUT, 'report-d.json'), JSON.stringify(report, null, 2));
    }
    cdp.close();
  });
} finally {
  report.totalMs = Date.now() - T0;
  writeFileSync(join(OUT, 'report-d.json'), JSON.stringify(report, null, 2));
  say('done in ' + report.totalMs + ' ms; errors ' + JSON.stringify(report.errors));
}
