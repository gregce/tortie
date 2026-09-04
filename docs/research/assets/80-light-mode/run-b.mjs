#!/usr/bin/env node
// Research 80 app run B: every registry agent's own interface on the light terminal ground, read cell by cell.
// One Electron through build/electron-run.mjs on a scratch profile and the gmux-v213 socket. HOME is NOT overridden, so each
// agent runs under the default login exactly as npm run conformance:resume does, and each agent takes at most ONE short turn.
// Nothing here reads, copies or writes a credential; the agents read their own the way they do in any terminal.
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
const say = (l) => console.log(`[p213 B] ${l}`);
const report = { agents: {}, errors: [], steps: [] };
const AGENTS = (process.env.P213_AGENTS || 'claude,codex,gemini,cursor,qwen,pi,omp,muse,grok,antigravity,deepseek,droid').split(',');
const PROMPT = process.env.P213_PROMPT || 'Append one line reading p213 to the end of README.md. Do nothing else.';
const TURN_MS = Number(process.env.P213_TURN_MS || 75000);

const root = realpathSync(mkdtempSync(join(tmpdir(), 'p213-b-')));
const project = join(root, 'p213-agents'); const profile = join(root, 'profile');
for (const d of [project, profile]) mkdirSync(d, { recursive: true });
const git = (...a) => execFileSync('git', ['-C', project, ...a], { encoding: 'utf8', env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1' } });
writeFileSync(join(project, 'README.md'), '# p213-agents\n\nA scratch repository for the research 80 agent matrix.\n');
writeFileSync(join(project, 'notes.txt'), 'nothing here\n');
git('init', '-q'); git('config', 'user.email', 'p213@example.invalid'); git('config', 'user.name', 'p213'); git('add', '-A'); git('commit', '-q', '-m', 'seed');
const tmux = (...a) => spawnSync('tmux', ['-L', SOCKET, ...a], { encoding: 'utf8' });

// The xterm 256 colour table beyond the sixteen, as xterm builds it.
const CUBE = [0, 95, 135, 175, 215, 255];
function ansi256(i) { if (i < 16) return null; if (i < 232) { const n = i - 16; return '#' + [CUBE[Math.floor(n / 36)], CUBE[Math.floor(n / 6) % 6], CUBE[n % 6]].map((v) => v.toString(16).padStart(2, '0')).join(''); } const g = 8 + (i - 232) * 10; return '#' + [g, g, g].map((v) => v.toString(16).padStart(2, '0')).join(''); }
const SLOT = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite'];
const READ_CELLS = `(() => {
  const terms = (window.__p213Terms || []).filter((t) => t.element && t.element.offsetParent !== null);
  const term = terms[terms.length - 1]; if (!term) return null;
  const buf = term.buffer.active; const out = []; const rows = term.rows, cols = term.cols;
  for (let y = 0; y < rows; y += 1) { const line = buf.getLine(buf.viewportY + y); if (!line) continue; for (let x = 0; x < cols; x += 1) { const c = line.getCell(x); if (!c) continue; const ch = c.getChars(); if (!ch || ch === ' ') { if (!(c.isBgDefault())) out.push({ y, x, ch: '', fg: 'd', bg: c.isBgRGB() ? 'r' + c.getBgColor() : 'p' + c.getBgColor(), inv: c.isInverse() ? 1 : 0 }); continue; }
    out.push({ y, x, ch, fg: c.isFgDefault() ? 'd' : c.isFgRGB() ? 'r' + c.getFgColor() : 'p' + c.getFgColor(), bg: c.isBgDefault() ? 'd' : c.isBgRGB() ? 'r' + c.getBgColor() : 'p' + c.getBgColor(), bold: c.isBold() ? 1 : 0, dim: c.isDim() ? 1 : 0, inv: c.isInverse() ? 1 : 0 }); } }
  const text = []; for (let y = 0; y < rows; y += 1) { const line = buf.getLine(buf.viewportY + y); text.push(line ? line.translateToString(true) : ''); }
  return { rows, cols, cells: out, text: text.join('\\n').replace(/\\n+$/, ''), theme: term.options.theme, drawBold: term.options.drawBoldTextInBrightColors, minimumContrastRatio: term.options.minimumContrastRatio };
})()`;
const hexRgb = (n) => '#' + Number(n).toString(16).padStart(6, '0');
function resolve(code, theme, isFg, bold) {
  if (code === 'd') return isFg ? theme.foreground : theme.background;
  if (code[0] === 'r') return hexRgb(code.slice(1));
  let i = Number(code.slice(1));
  if (isFg && bold && i < 8 && theme.__drawBold) i += 8;
  if (i < 16) return theme[SLOT[i]];
  return ansi256(i);
}
function judge(read) {
  const theme = { ...read.theme, __drawBold: read.drawBold !== false };
  const counts = { fg: { default: 0, ansi16: 0, ansi256: 0, rgb: 0 }, bg: { default: 0, ansi16: 0, ansi256: 0, rgb: 0 } };
  const hard = new Map(); let worst = null; const slotsUsed = new Set();
  for (const c of read.cells) {
    const cls = (code) => (code === 'd' ? 'default' : code[0] === 'r' ? 'rgb' : Number(code.slice(1)) < 16 ? 'ansi16' : 'ansi256');
    counts.bg[cls(c.bg)] += 1;
    if (c.ch === '') continue;
    counts.fg[cls(c.fg)] += 1;
    if (cls(c.fg) === 'ansi16') slotsUsed.add(SLOT[Number(c.fg.slice(1)) + (c.bold && Number(c.fg.slice(1)) < 8 ? 8 : 0)]);
    let fg = resolve(c.fg, theme, true, c.bold); let bg = resolve(c.bg, theme, false, false);
    if (c.inv) [fg, bg] = [bg, fg];
    if (!fg || !bg) continue;
    if (cls(c.fg) !== 'default' && cls(c.fg) !== 'ansi16') { const k = `${cls(c.fg)} ${c.fg} ${fg}`; hard.set(k, (hard.get(k) ?? 0) + 1); }
    if (cls(c.bg) !== 'default' && cls(c.bg) !== 'ansi16') { const k = `bg ${cls(c.bg)} ${c.bg} ${bg}`; hard.set(k, (hard.get(k) ?? 0) + 1); }
    if (c.dim) fg = over(fg.replace(/^#/, '#') + '80', bg);
    const r = ratio(fg, bg);
    if (/^[─-▟⠀-⣿]+$/.test(c.ch)) continue; // box drawing and braille are marks, not text
    if (worst === null || r < worst.ratio) worst = { ratio: Math.round(r * 100) / 100, fg, bg, fgCode: c.fg, bgCode: c.bg, ch: c.ch, dim: c.dim, bold: c.bold, y: c.y, x: c.x, context: (read.text.split('\n')[c.y] || '').slice(Math.max(0, c.x - 16), c.x + 24).trim() };
  }
  const under3 = []; const seen = new Set();
  for (const c of read.cells) { if (c.ch === '' || /^[─-▟⠀-⣿]+$/.test(c.ch)) continue; let fg = resolve(c.fg, theme, true, c.bold); let bg = resolve(c.bg, theme, false, false); if (c.inv) [fg, bg] = [bg, fg]; if (!fg || !bg) continue; if (c.dim) fg = over(fg + '80', bg); const r = ratio(fg, bg); const k = `${c.fg}/${c.bg}/${c.dim}/${c.bold}/${c.inv}`; if (r < 3 && !seen.has(k)) { seen.add(k); under3.push({ ratio: Math.round(r * 100) / 100, fg, bg, fgCode: c.fg, bgCode: c.bg, dim: c.dim, bold: c.bold, inv: c.inv, sample: (read.text.split('\n')[c.y] || '').slice(Math.max(0, c.x - 10), c.x + 20).trim() }); } }
  return { counts, slotsUsed: [...slotsUsed], hardCoded: [...hard.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24), worst, under3: under3.slice(0, 12), textCells: read.cells.filter((c) => c.ch !== '').length };
}
const PROMPT_RE = /\b(yes|allow|approve|accept|permission|proceed|confirm|apply|trust)\b|\(y\/n\)|\[y\/n\]|❯ *1\.|› *1\.|\b1\. +Yes/i;
const DIFF_RE = /^\s*[+-] .*|\+\+\+|---|@@ /m;

let session; let cdpRef;
async function setLight(s) {
  await s.eval(FIND_TERMS);
  await s.eval(`(() => { ${setTokensJs(LIGHT)}; document.documentElement.style.colorScheme = 'light'; const tree = document.querySelector('file-tree-container'); if (tree) tree.style.colorScheme = 'light'; for (const term of (window.__p213Terms || [])) term.options.theme = ${JSON.stringify(TERM)}; return (window.__p213Terms || []).length; })()`);
}
async function reading(s, label, agentId, state) {
  const read = await s.eval(READ_CELLS); if (!read) return { state, note: 'no visible terminal' };
  const rects = await s.eval(RECTS); const r = rects.terminalHost;
  const file = join(SHOTS, `${agentId}-${state}.png`);
  await screenshot(s, file, { x: r.x, y: r.y, width: r.w, height: r.h });
  const j = judge(read);
  return { state, file, at: Date.now(), ...j, textHead: read.text.split('\n').filter((l) => l.trim()).slice(0, 4).map((l) => l.slice(0, 100)), textTail: read.text.split('\n').filter((l) => l.trim()).slice(-6).map((l) => l.slice(0, 120)), rows: read.rows, cols: read.cols, textSha: read.text.length };
}
async function paneText(target) { return tmux('capture-pane', '-p', '-t', target).stdout; }
async function waitStable(target, ms, settleMs = 2500) { let last = ''; let lastChange = Date.now(); const t0 = Date.now(); while (Date.now() - t0 < ms) { const now = await paneText(target); if (now !== last) { last = now; lastChange = Date.now(); } else if (Date.now() - lastChange > settleMs && now.trim().length > 0) return { stable: true, text: now, ms: Date.now() - t0 }; await sleep(400); } return { stable: false, text: last, ms: Date.now() - t0 }; }
function sessionTarget(before) { const now = tmux('list-sessions', '-F', '#{session_name}').stdout.trim().split('\n').filter((n) => n && n !== 'gmux-control'); return now.find((n) => !before.includes(n)) || now[now.length - 1] || ''; }

async function driveAgent(s, agentId) {
  const rec = { agent: agentId, states: {}, notes: [] };
  report.agents[agentId] = rec;
  const before = tmux('list-sessions', '-F', '#{session_name}').stdout.trim().split('\n');
  let created;
  try { created = await s.eval(`window.__gmuxP95.create({ name: ${JSON.stringify('p213-' + agentId)}, agent: ${JSON.stringify(agentId)} }).then((st) => JSON.stringify(st).slice(0, 400))`, 120000); }
  catch (e) { rec.unmeasured = 'the app could not create the session: ' + e.message; say(`${agentId}: ${rec.unmeasured}`); return rec; }
  rec.created = created;
  const target = sessionTarget(before); rec.tmuxTarget = target;
  if (!target) { rec.unmeasured = 'no tmux session appeared for the create'; return rec; }
  await setLight(s);
  const rest = await waitStable(target, 45000, 3000); rec.restWait = { stable: rest.stable, ms: rest.ms };
  await setLight(s); await sleep(300);
  rec.states.rest = await reading(s, 'rest', agentId, 'rest');
  const restText = rest.text;
  // A first run dialog that is not the agent's own face: a trust or onboarding question answered with Enter, and read again.
  if (/trust|Do you want to|onboarding|select .*theme|Press Enter|login|log in|sign in|api key|API key/i.test(restText)) {
    rec.notes.push('first screen carried a question or a login: ' + restText.split('\n').filter((l) => l.trim()).slice(0, 3).join(' | ').slice(0, 200));
    if (/login|log in|sign in|api key|API key|not authenticated|unauthorized/i.test(restText) && !/trust/i.test(restText)) { rec.unmeasured = 'the agent asked for a login or a key on the default login, and this run signs nobody in'; rec.states.rest.note = rec.unmeasured; return rec; }
    if (/trust/i.test(restText)) { rec.states.trust = { ...rec.states.rest, state: 'trust' }; if (/[❯>›]\s*No\b/i.test(restText)) { tmux('send-keys', '-t', target, 'Down'); await sleep(300); rec.notes.push('the trust question highlighted No first, so Down was pressed before Enter'); } tmux('send-keys', '-t', target, 'Enter'); await waitStable(target, 30000, 3000); rec.notes.push('answered the trust question with Enter'); await setLight(s); await sleep(300); rec.states.rest = await reading(s, 'rest', agentId, 'rest'); }
  }
  if (/login|log in|sign in|api key|API key|not authenticated|unauthorized|command not found|No such file/i.test(await paneText(target))) { rec.unmeasured = 'the agent did not reach its interface on the default login: ' + (await paneText(target)).split('\n').filter((l) => l.trim()).slice(0, 3).join(' | ').slice(0, 240); return rec; }
  // ONE short turn.
  tmux('send-keys', '-t', target, '-l', PROMPT); await sleep(400); tmux('send-keys', '-t', target, 'Enter');
  const t0 = Date.now(); let sawMid = false, sawPrompt = false, sawDiff = false; let last = await paneText(target); let idleSince = null;
  while (Date.now() - t0 < TURN_MS) {
    await sleep(700);
    const now = await paneText(target);
    const changed = now !== last; last = now;
    if (!sawMid && changed && Date.now() - t0 > 1200) { sawMid = true; rec.states.midTurn = await reading(s, 'midturn', agentId, 'midturn'); }
    if (!sawPrompt && PROMPT_RE.test(now.slice(-1400))) { await sleep(900); sawPrompt = true; rec.states.permission = await reading(s, 'permission', agentId, 'permission'); if (DIFF_RE.test(now)) { sawDiff = true; rec.states.diff = { ...rec.states.permission, state: 'diff', note: 'the permission prompt carries the diff' }; } }
    if (sawPrompt && !sawDiff && DIFF_RE.test(now)) { sawDiff = true; rec.states.diff = await reading(s, 'diff', agentId, 'diff'); }
    if (sawPrompt) { break; }
    if (!changed) { if (idleSince === null) idleSince = Date.now(); else if (Date.now() - idleSince > 9000 && Date.now() - t0 > 12000) break; } else idleSince = null;
  }
  rec.turn = { ms: Date.now() - t0, sawMid, sawPrompt, sawDiff };
  if (!sawPrompt) { rec.states.afterTurn = await reading(s, 'afterturn', agentId, 'afterturn'); const now = await paneText(target); if (DIFF_RE.test(now) && !sawDiff) rec.states.diff = { ...rec.states.afterTurn, state: 'diff', note: 'a diff was drawn without a prompt' }; }
  // Decline whatever is up and end the session.
  tmux('send-keys', '-t', target, 'Escape'); await sleep(500); tmux('send-keys', '-t', target, 'Escape'); await sleep(300);
  try { const st = await s.eval(`window.__gmuxP95.state().then((st) => JSON.stringify(st))`, 30000); const parsed = JSON.parse(st); const sess = (parsed.sessions || parsed.list || []).find((x) => x.name === 'p213-' + agentId) || null; rec.sessionId = sess ? sess.id : null; if (sess) await s.eval(`window.__gmuxP95.kill(${JSON.stringify(sess.id)}).then(() => true)`, 30000); } catch (e) { rec.notes.push('end by app failed: ' + e.message); }
  tmux('kill-session', '-t', target);
  await sleep(800);
  return rec;
}

const T0 = Date.now();
try {
  await withElectron({ ...launch('p213 B', profile, null, { GMUX_SPECSTORY_NO_CLOUD: '1' }) }, async () => {
    const { cdp } = await browserEndpoint(profile); cdpRef = cdp;
    const attached = new Map();
    cdp.on((m) => { if (m.method === 'Target.attachedToTarget') attached.set(m.params.targetInfo.targetId, m.params.sessionId); });
    await cdp.call('Target.setDiscoverTargets', { discover: true });
    const s = await appPage(cdp, attached); session = s;
    await s.eval(`window.__gmuxP95.openLocal(${JSON.stringify(project)}).then(() => true)`, 90000);
    await setLight(s);
    for (const id of AGENTS) {
      const t = Date.now();
      try { await driveAgent(s, id); } catch (e) { report.errors.push(`${id}: ${e.message}`); (report.agents[id] ||= { agent: id, states: {}, notes: [] }).error = String(e.stack || e); }
      report.steps.push({ agent: id, ms: Date.now() - t });
      say(`${id}: ${JSON.stringify({ unmeasured: report.agents[id]?.unmeasured, turn: report.agents[id]?.turn, states: Object.keys(report.agents[id]?.states || {}) })}`);
      writeFileSync(join(OUT, 'report-b.json'), JSON.stringify(report, null, 2));
    }
    cdp.close();
  });
} finally {
  report.totalMs = Date.now() - T0;
  writeFileSync(join(OUT, 'report-b.json'), JSON.stringify(report, null, 2));
  say('done in ' + report.totalMs + ' ms; errors ' + JSON.stringify(report.errors));
}
