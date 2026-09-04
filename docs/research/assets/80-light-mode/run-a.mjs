#!/usr/bin/env node
// Research 80 app run A: the light mock injected into a real launch, and the mechanism measurements for sections 3, 4, 5 and 6.
// One Electron, through build/electron-run.mjs, on a scratch profile and the gmux-p213 socket; the report is written in a finally.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connect, session, sleep } from './lib/cdp.mjs';
import { launch, withElectron, browserEndpoint, appPage, screenshot, FIND_TERMS, FIND_MONACO, RECTS, setTokensJs, clearTokensJs, SOCKET } from './lib/app.mjs';
import { LIGHT, TERM, DARK, DARK_TERM } from './palette.mjs';
import { decodePng, dominant, pixel } from './lib/png.mjs';
const OUT = '/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p213';
const say = (l) => console.log(`[p213 A] ${l}`);
const report = { steps: [], errors: [] };
const note = (k, v) => { report[k] = v; say(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v).slice(0, 700)}`); };
async function step(name, fn) { const t = Date.now(); try { const v = await fn(); report.steps.push({ name, ms: Date.now() - t, ok: true }); return v; } catch (e) { report.steps.push({ name, ms: Date.now() - t, ok: false, error: String(e && e.stack || e) }); report.errors.push(`${name}: ${e && e.message || e}`); say(`STEP FAILED ${name}: ${e && e.message || e}`); return null; } }

const root = realpathSync(mkdtempSync(join(tmpdir(), 'p213-a-')));
const project = join(root, 'tortie-sample'); const profile = join(root, 'profile'); const home = join(root, 'home');
for (const d of [project, profile, home, join(project, 'src'), join(project, 'src', 'theme'), join(project, 'docs')]) mkdirSync(d, { recursive: true });
const git = (...a) => execFileSync('git', ['-C', project, ...a], { encoding: 'utf8', env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1' } });
writeFileSync(join(project, 'README.md'), '# tortie-sample\n\nA scratch repository for the research 80 mock.\n');
writeFileSync(join(project, 'package.json'), '{\n  "name": "tortie-sample",\n  "version": "0.1.0",\n  "type": "module"\n}\n');
writeFileSync(join(project, 'tsconfig.json'), '{ "compilerOptions": { "strict": true, "target": "ES2022" } }\n');
writeFileSync(join(project, 'docs', 'notes.md'), '# Notes\n\nLight mode goes here.\n');
writeFileSync(join(project, 'src', 'theme', 'palette.ts'), `/** The palette a scheme selects from. */
export interface Palette {
  canvas: string;
  sidebar: string;
  text: string;
}

export const DARK: Palette = { canvas: '#131417', sidebar: '#0e0f13', text: '#c9cacd' };

export function contrast(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}
`);
writeFileSync(join(project, 'src', 'app.ts'), `import { DARK, contrast } from './theme/palette';

// The scheme a person chose, read once at boot.
export type Scheme = 'dark';

export function paletteFor(scheme: Scheme) {
  if (scheme === 'dark') return DARK;
  throw new Error('unknown scheme: ' + scheme);
}

export function textRatio(): number {
  return contrast(0.58, 0.012);
}
`);
git('init', '-q'); git('config', 'user.email', 'p213@example.invalid'); git('config', 'user.name', 'p213'); git('add', '-A'); git('commit', '-q', '-m', 'seed');
writeFileSync(join(project, 'src', 'app.ts'), `import { DARK, LIGHT, contrast } from './theme/palette';

// The scheme a person chose, read once at boot and again on every broadcast.
export type Scheme = 'dark' | 'light' | 'system';

export function paletteFor(scheme: Scheme, systemDark: boolean) {
  if (scheme === 'dark') return DARK;
  if (scheme === 'light') return LIGHT;
  return systemDark ? DARK : LIGHT;
}

export function textRatio(light: boolean): number {
  return light ? contrast(0.93, 0.04) : contrast(0.58, 0.012);
}
`);
writeFileSync(join(project, 'src', 'theme', 'palette.ts'), `/** The palette a scheme selects from. */
export interface Palette {
  canvas: string;
  sidebar: string;
  text: string;
}

export const DARK: Palette = { canvas: '#131417', sidebar: '#0e0f13', text: '#c9cacd' };
export const LIGHT: Palette = { canvas: '${LIGHT['--bg-canvas']}', sidebar: '${LIGHT['--bg-sidebar']}', text: '${LIGHT['--text-primary']}' };

export function contrast(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}
`);
writeFileSync(join(project, 'src', 'scheme.ts'), `export const SCHEMES = ['dark', 'light', 'system'] as const;\n`);

const tmux = (...a) => spawnSync('tmux', ['-L', SOCKET, ...a], { encoding: 'utf8' });
const TERM_DARK = { ...DARK_TERM, cursorAccent: '#131417', selectionBackground: 'rgba(77, 157, 232, 0.30)' };
const bare = (h) => h.replace('#', '');
// The Monaco light theme, the same slot map monaco-theme.ts uses over the light syntax ramp.
const SYN_LIGHT = { fg: TERM.foreground, cursor: TERM.cursor, comment: TERM.brightBlack, string: TERM.green, escape: TERM.brightGreen, keyword: TERM.blue, number: TERM.yellow, regexp: TERM.brightRed, type: TERM.cyan, fn: TERM.brightBlue, constant: TERM.brightYellow, punctuation: TERM.white };
const SYN_DARK = { fg: '#d8dbe2', comment: '#6e7583', string: '#6bc46d', escape: '#85d488', keyword: '#6cb6ff', number: '#e2b340', regexp: '#f07e78', type: '#56c2c0', fn: '#8fc7ff', constant: '#f0c674', punctuation: '#a8adb8' };
function monacoLight() {
  const s = SYN_LIGHT; const n = (t) => LIGHT[t]; const canvas = n('--bg-canvas'); const ACC = LIGHT['--accent'];
  return { base: 'vs', inherit: true,
    rules: [ { token: 'comment', foreground: bare(s.comment), fontStyle: 'italic' }, { token: 'string', foreground: bare(s.string) }, { token: 'string.escape', foreground: bare(s.escape) }, { token: 'keyword', foreground: bare(s.keyword) }, { token: 'number', foreground: bare(s.number) }, { token: 'regexp', foreground: bare(s.regexp) }, { token: 'type', foreground: bare(s.type) }, { token: 'type.identifier', foreground: bare(s.type) }, { token: 'identifier', foreground: bare(s.fg) }, { token: 'function', foreground: bare(s.fn) }, { token: 'constant', foreground: bare(s.constant) }, { token: 'variable', foreground: bare(s.fg) }, { token: 'operator', foreground: bare(s.punctuation) }, { token: 'delimiter', foreground: bare(s.punctuation) }, { token: 'tag', foreground: bare(s.keyword) }, { token: 'attribute.name', foreground: bare(s.type) }, { token: 'attribute.value', foreground: bare(s.string) }, { token: 'key', foreground: bare(s.type) }, { token: 'string.key.json', foreground: bare(s.type) }, { token: 'string.value.json', foreground: bare(s.string) } ],
    colors: { 'editor.background': canvas, 'editor.foreground': s.fg, 'editorCursor.foreground': s.cursor, 'editor.lineHighlightBackground': n('--bg-sidebar'), 'editor.lineHighlightBorder': '#00000000', 'editor.selectionBackground': `${ACC}4D`, 'editor.inactiveSelectionBackground': `${ACC}24`, 'editorLineNumber.foreground': n('--text-disabled'), 'editorLineNumber.activeForeground': n('--text-secondary'), 'editorIndentGuide.background1': n('--bg-raised'), 'editorIndentGuide.activeBackground1': n('--border-strong'), 'editorWhitespace.foreground': n('--border'), 'editorGutter.background': canvas, 'editorWidget.background': n('--bg-surface'), 'editorWidget.border': n('--border'), 'editorSuggestWidget.background': n('--bg-surface'), 'editorSuggestWidget.border': n('--border'), 'editorSuggestWidget.selectedBackground': n('--bg-active'), 'editorHoverWidget.background': n('--bg-surface'), 'editorHoverWidget.border': n('--border'), 'input.background': n('--bg-surface'), 'input.border': n('--border-strong'), 'inputOption.activeBorder': ACC, focusBorder: ACC, 'scrollbarSlider.background': `${n('--bg-raised')}99`, 'scrollbarSlider.hoverBackground': `${n('--bg-active')}CC`, 'scrollbarSlider.activeBackground': `${n('--border-strong')}CC`, 'scrollbar.shadow': '#00000000', 'editorOverviewRuler.border': '#00000000', 'editorBracketHighlight.foreground1': s.punctuation, 'editorBracketHighlight.foreground2': s.punctuation, 'editorBracketHighlight.foreground3': s.punctuation, 'editorBracketHighlight.foreground4': s.punctuation, 'editorBracketHighlight.foreground5': s.punctuation, 'editorBracketHighlight.foreground6': s.punctuation, 'editorBracketHighlight.unexpectedBracket.foreground': LIGHT['--error'], 'editorBracketMatch.background': '#00000000', 'editorBracketMatch.border': n('--border-strong'), 'minimap.background': canvas, 'minimap.selectionHighlight': `${ACC}4D`, 'minimap.findMatchHighlight': `${LIGHT['--warning']}66`, 'minimap.errorHighlight': `${LIGHT['--error']}99`, 'minimap.warningHighlight': `${LIGHT['--warning']}99`, 'minimapSlider.background': `${n('--bg-active')}CC`, 'minimapSlider.hoverBackground': `${n('--border-strong')}CC`, 'minimapSlider.activeBackground': `${n('--border-strong')}EE`, 'minimap.foregroundOpacity': '#000000CC' } };
}
// The Pierre switch, done the way the library takes a light theme: its stylesheet reads `--diffs-light*` on the host under
// `light-dark()`, chosen by the host's color-scheme, and every token span carries `--diffs-token-light` inline. A registered
// gmux-light theme would write exactly these, so the mock writes them in the unsafe layer and maps the spans slot for slot.
const PIERRE_HOST = { '--diffs-light': TERM.foreground, '--diffs-light-bg': LIGHT['--bg-canvas'], '--diffs-light-addition-color': LIGHT['--git-added'], '--diffs-light-deletion-color': LIGHT['--git-deleted'], '--diffs-light-modified-color': LIGHT['--git-modified'] };
const TOKEN_MAP = Object.fromEntries(Object.keys(SYN_DARK).map((k) => [SYN_DARK[k].toLowerCase(), SYN_LIGHT[k]]));
const TOKENS_LIGHT = { ...LIGHT };

const injectLight = `(async () => {
  const t0 = performance.now();
  ${setTokensJs(TOKENS_LIGHT)};
  document.documentElement.style.colorScheme = 'light';
  const tree = document.querySelector('file-tree-container'); if (tree) tree.style.colorScheme = 'light';
  const themeLight = ${JSON.stringify(TERM)};
  const tx0 = performance.now();
  for (const term of (window.__p213Terms || [])) term.options.theme = { ...themeLight };
  const xtermMs = performance.now() - tx0;
  const ed = window.__p213Editor; let monacoMs = null; let monacoHow = null;
  if (ed) { const svc = ed._themeService || ed._standaloneThemeService || (ed._instantiationService && ed._instantiationService._services && null); if (svc && svc.defineTheme) { const m0 = performance.now(); svc.defineTheme('gmux-light', ${JSON.stringify(monacoLight())}); svc.setTheme('gmux-light'); monacoMs = performance.now() - m0; monacoHow = 'themeService.defineTheme+setTheme'; } else { monacoHow = 'no theme service on the editor instance: ' + Object.keys(ed).filter((k) => /theme|Theme/.test(k)).join(','); } }
  let pierre = null;
  const host = document.querySelector('.ed-pierre diffs-container') || [...document.querySelectorAll('.ed-pierre *')].find((e) => e.shadowRoot);
  if (host && host.shadowRoot) {
    const p0 = performance.now();
    let st = host.shadowRoot.querySelector('style[data-p213]'); if (!st) { st = document.createElement('style'); st.setAttribute('data-p213', '1'); host.shadowRoot.appendChild(st); }
    st.textContent = '@layer unsafe { :host { color-scheme: light; ' + Object.entries(${JSON.stringify(PIERRE_HOST)}).map(([k, v]) => k + ':' + v + ';').join('') + ' } }';
    const map = ${JSON.stringify(TOKEN_MAP)}; let spans = 0, mapped = 0;
    for (const el of host.shadowRoot.querySelectorAll('[style*="--diffs-token-light"]')) { spans += 1; const cur = el.style.getPropertyValue('--diffs-token-light').trim().toLowerCase(); if (!el.dataset.p213Dark) el.dataset.p213Dark = cur; const next = map[el.dataset.p213Dark]; if (next) { el.style.setProperty('--diffs-token-light', next); mapped += 1; } }
    pierre = { tag: host.tagName.toLowerCase(), spans, mapped, ms: performance.now() - p0 };
  }
  return { totalMs: performance.now() - t0, xtermMs, monacoMs, monacoHow, terms: (window.__p213Terms || []).length, editor: !!ed, pierre };
})()`;
const injectDark = `(async () => {
  ${clearTokensJs(TOKENS_LIGHT)};
  document.documentElement.style.colorScheme = 'dark';
  const tree = document.querySelector('file-tree-container'); if (tree) tree.style.colorScheme = 'dark';
  for (const term of (window.__p213Terms || [])) term.options.theme = ${JSON.stringify(TERM_DARK)};
  const ed = window.__p213Editor; if (ed) { const svc = ed._themeService || ed._standaloneThemeService; if (svc && svc.setTheme) svc.setTheme('gmux-dark'); }
  const host = document.querySelector('.ed-pierre diffs-container') || [...document.querySelectorAll('.ed-pierre *')].find((e) => e.shadowRoot);
  if (host && host.shadowRoot) { const st = host.shadowRoot.querySelector('style[data-p213]'); if (st) st.remove(); for (const el of host.shadowRoot.querySelectorAll('[data-p213-dark]')) el.style.setProperty('--diffs-token-light', el.dataset.p213Dark); }
  return 1;
})()`;

const READ_SURFACES = `(() => {
  const q = (sel, root) => { const el = (root || document).querySelector(sel); if (!el) return null; const cs = getComputedStyle(el); return { bg: cs.backgroundColor, color: cs.color, colorScheme: cs.colorScheme }; };
  const term = (window.__p213Terms || [])[0]; const theme = term ? term.options.theme : null;
  const xv = document.querySelector('.xterm-viewport'); const xs = document.querySelector('.xterm-screen');
  const ed = window.__p213Editor; const svc = ed ? (ed._themeService || ed._standaloneThemeService) : null;
  const host = document.querySelector('.ed-pierre diffs-container') || [...document.querySelectorAll('.ed-pierre *')].find((e) => e.shadowRoot); let pierre = null;
  if (host && host.shadowRoot) { const sr = host.shadowRoot; const cs = getComputedStyle(host); const pre = sr.querySelector('pre') || sr.querySelector('[class*="diff"]'); const tok = sr.querySelector('[style*="--diffs-token-light"]');
    pierre = { hostBg: cs.backgroundColor, hostColor: cs.color, hostColorScheme: cs.colorScheme, lightBgVar: cs.getPropertyValue('--diffs-light-bg').trim(), darkBgVar: cs.getPropertyValue('--diffs-dark-bg').trim(), innerBg: pre ? getComputedStyle(pre).backgroundColor : null, innerColor: pre ? getComputedStyle(pre).color : null, firstTokenColor: tok ? getComputedStyle(tok).color : null, firstTokenVars: tok ? tok.getAttribute('style') : null, styleCount: sr.querySelectorAll('style').length }; }
  const tree = document.querySelector('file-tree-container'); let treeInner = null;
  if (tree && tree.shadowRoot) { const row = tree.shadowRoot.querySelector('[data-item-type]'); treeInner = row ? { bg: getComputedStyle(row).backgroundColor, color: getComputedStyle(row).color } : null; }
  return { html: q('html'), body: q('body'), titlebar: q('.titlebar'), activity: q('.activity-bar'), sidebar: q('.sidebar'), tree: q('file-tree-container'), treeRow: treeInner, terminalHost: q('.gmux-terminal-host'), xtermViewport: xv ? getComputedStyle(xv).backgroundColor : null, xtermScreenBg: xs ? getComputedStyle(xs).backgroundColor : null, term: theme ? { background: theme.background, foreground: theme.foreground, red: theme.red, brightBlack: theme.brightBlack } : null, monacoBg: q('.monaco-editor-background'), monacoLines: q('.monaco-editor .view-lines'), monacoTheme: svc && svc.getColorTheme ? svc.getColorTheme().themeName : null, pierre, edTabs: q('.ed-tabs'), edPanel: q('.ed-panel') };
})()`;

let mainWs = null; let stderrText = '';
const T0 = Date.now();
try {
await withElectron({ ...launch('p213 A', profile, home, { GMUX_SPECSTORY_NO_CLOUD: '1' }, ['--inspect=0']) }, async (handle) => {
  handle.child.stderr.on('data', (c) => { stderrText += String(c); const m = /Debugger listening on (ws:\/\/[^\s]+)/.exec(stderrText); if (m && !mainWs) mainWs = m[1]; });
  handle.child.stdout.on('data', () => {});
  const t0 = Date.now();
  const { cdp, port } = await browserEndpoint(profile);
  const attached = new Map(); const frames = new Map(); const targetsSeen = [];
  cdp.on((m) => {
    if (m.method === 'Target.attachedToTarget') { const { sessionId, targetInfo, waitingForDebugger } = m.params; attached.set(targetInfo.targetId, sessionId); targetsSeen.push({ type: targetInfo.type, url: targetInfo.url.slice(0, 80), waiting: waitingForDebugger, at: Date.now() - t0 });
      if (targetInfo.type === 'page') { frames.set(sessionId, []); (async () => { if (waitingForDebugger) { try { await cdp.call('Runtime.runIfWaitingForDebugger', {}, sessionId); } catch { /* fine */ } } try { await cdp.call('Page.enable', {}, sessionId, 15000); await cdp.call('Page.startScreencast', { format: 'png', everyNthFrame: 1 }, sessionId, 15000); } catch (e) { report.errors.push('screencast: ' + e.message); } })(); }
      else if (waitingForDebugger) { cdp.call('Runtime.runIfWaitingForDebugger', {}, sessionId).catch(() => {}); } }
    if (m.method === 'Page.screencastFrame') { const arr = frames.get(m.sessionId); if (arr) arr.push({ at: Date.now() - t0, ts: m.params.metadata.timestamp, data: m.params.data }); cdp.call('Page.screencastFrameAck', { sessionId: m.params.sessionId }, m.sessionId).catch(() => {}); }
  });
  await cdp.call('Target.setDiscoverTargets', { discover: true });
  await cdp.call('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
  note('devtoolsAt', `${Date.now() - t0} ms after spawn, port ${port}`);
  const s = await appPage(cdp, attached);
  note('appReadyAt', `${Date.now() - t0} ms after spawn; targets seen ${JSON.stringify(targetsSeen)}`);
  await sleep(1500);
  const bootSid = s.sessionId; const bootFrames = frames.get(bootSid) || [];
  await cdp.call('Page.stopScreencast', {}, bootSid).catch(() => {});
  await step('bootFrames', () => { const bootSummary = bootFrames.slice(0, 14).map((f) => { const img = decodePng(Buffer.from(f.data, 'base64')); const d = dominant(img, 0, 0, img.width, img.height, 8); return { at: f.at, colour: d.colour, share: Math.round(d.share * 100) / 100, distinct: d.distinct, w: img.width, h: img.height }; }); note('bootFrames', { count: bootFrames.length, first: bootSummary }); });

  await step('open', async () => {
    await s.eval(`window.__gmuxP95.openLocal(${JSON.stringify(project)}).then(() => true)`, 90000);
    await s.eval(`window.__gmuxP95.create({ name: 'p213', agent: 'shell' }).then(() => true)`, 120000);
    await s.eval(`window.__gmuxP207.openFile(${JSON.stringify({ repoPath: project, relPath: 'docs/notes.md', path: join(project, 'docs', 'notes.md') })})`, 120000);
    await s.eval(`window.__gmuxP207.openFile(${JSON.stringify({ repoPath: project, relPath: 'src/theme/palette.ts', path: join(project, 'src', 'theme', 'palette.ts') })})`, 120000);
  });
  await step('diff', async () => {
    const clicked = await s.eval(`(async () => {
      const host = document.querySelector('file-tree-container'); if (!host || !host.shadowRoot) return 'no tree host';
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const open = async (name) => { for (let i = 0; i < 20; i += 1) { const rows = [...host.shadowRoot.querySelectorAll('[data-item-type]')]; const row = rows.find((r) => (r.textContent || '').trim() === name || (r.getAttribute('data-item-path') || '').endsWith('/' + name) || (r.textContent || '').includes(name)); if (row) { for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) row.dispatchEvent(new MouseEvent(type, { bubbles: true, composed: true, cancelable: true, button: 0 })); return rows.length; } await wait(300); } return -1; };
      const a = await open('src'); await wait(500); const b = await open('app.ts'); await wait(2500);
      return 'rows ' + a + '/' + b + ' pierre ' + (document.querySelector('.ed-pierre') ? 'up' : 'absent') + ' tabs ' + [...document.querySelectorAll('.ed-tab')].map((t) => t.textContent.trim()).join('|');
    })()`, 60000);
    note('diffOpen', clicked);
  });
  await step('terminalScript', async () => {
    const target = tmux('list-sessions', '-F', '#{session_name}').stdout.trim().split('\n').find((n) => n !== 'gmux-control') || '';
    note('tmuxSession', target);
    let ready = false; for (let i = 0; i < 60 && !ready; i += 1) { const cap = tmux('capture-pane', '-p', '-t', target).stdout; if (/[%$#] *$/m.test(cap)) ready = true; else await sleep(250); }
    note('shellReady', ready);
    const script = `clear; for i in 0 1 2 3 4 5 6 7; do printf '\\e[3%sm%-8s\\e[9%sm%-8s\\e[0m ' $i normal$i $i bright$i; done; printf '\\n'; git -c color.ui=always --no-pager diff --stat; git -c color.ui=always --no-pager diff src/scheme.ts src/app.ts | head -20; git -c color.ui=always --no-pager log --oneline --decorate -1; ls -G; printf '\\e[1mbold\\e[0m \\e[2mdim\\e[0m \\e[3mitalic\\e[0m \\e[4munderline\\e[0m \\e[7minverse\\e[0m \\e[38;5;208m256:208\\e[0m \\e[38;2;200;100;50mrgb\\e[0m \\e[33mwarn\\e[0m \\e[31merror\\e[0m \\e[32mok\\e[0m\\n'`;
    const r1 = tmux('send-keys', '-t', target, '-l', script); await sleep(200); const r2 = tmux('send-keys', '-t', target, 'Enter'); await sleep(2000);
    note('sendKeys', { status: [r1.status, r2.status], err: (r1.stderr + r2.stderr).trim(), pane: tmux('capture-pane', '-p', '-t', target).stdout.split('\n').filter((l) => l.trim()).slice(0, 6) });
  });
  const clickTab = async (label) => s.eval(`(async () => { const t = [...document.querySelectorAll('.ed-tab')].find((e) => e.textContent.trim().startsWith(${JSON.stringify(label)})); if (!t) return 'no tab'; t.click(); await new Promise((r) => setTimeout(r, 1500)); return 'clicked'; })()`);
  note('tabPalette', await clickTab('palette.ts'));
  note('findTerms', await s.eval(FIND_TERMS)); note('findMonaco', await s.eval(FIND_MONACO));
  note('monacoServiceKeys', await s.eval(`(() => { const ed = window.__p213Editor; if (!ed) return null; return Object.keys(ed).filter((k) => /theme/i.test(k)).join(',') + ' | proto ' + Object.getOwnPropertyNames(Object.getPrototypeOf(ed)).filter((k) => /theme/i.test(k)).join(','); })()`));
  const darkSurfaces = await s.eval(READ_SURFACES); note('darkSurfaces', darkSurfaces);
  const darkRects = await s.eval(RECTS); note('rects', darkRects);
  const darkEditorSurfaces = await s.eval(READ_SURFACES); note('darkEditorSurfaces', { monacoBg: darkEditorSurfaces.monacoBg, monacoTheme: darkEditorSurfaces.monacoTheme });
  await screenshot(s, join(OUT, 'mock-dark-editor.png'));
  note('tabDiff', await clickTab('app.ts')); await sleep(800);
  const rectsDiff = await s.eval(RECTS); darkRects.pierre = rectsDiff.pierre; note('rectsPierre', rectsDiff.pierre);
  const darkPng = await screenshot(s, join(OUT, 'mock-dark.png'));
  // Section 3 and 6: the swap, screencast on.
  const swapFrames = []; const off = s.on((m) => { if (m.method === 'Page.screencastFrame') { swapFrames.push({ ts: m.params.metadata.timestamp, data: m.params.data }); s.call('Page.screencastFrameAck', { sessionId: m.params.sessionId }).catch(() => {}); } });
  await s.call('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  await sleep(300); const swapStartTs = Date.now() / 1000;
  const inject = await s.eval(`(async () => { const t = performance.now(); const w0 = Date.now() / 1000; const r = await (${injectLight}); await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))); return { ...r, twoFramesMs: performance.now() - t, wallStart: w0 }; })()`);
  note('inject', inject);
  await sleep(1500); await s.call('Page.stopScreencast'); off();
  const lightSurfaces = await s.eval(READ_SURFACES); note('lightSurfaces', lightSurfaces);
  const rects = darkRects; const lightPng = await screenshot(s, join(OUT, 'mock-light.png'));
  const classify = (buf, r) => { const img = decodePng(buf); const k = img.width / r.inner.w; const at = (name) => { const b = r[name]; if (!b) return null; const d = dominant(img, Math.round(b.x * k) + 4, Math.round(b.y * k) + 4, Math.max(8, Math.round(b.w * k) - 8), Math.max(8, Math.round(b.h * k) - 8), 6); return d.colour; }; return { sidebar: at('sidebar'), terminal: at('xtermScreen'), editor: at('monaco'), pierre: at('pierre'), titlebar: at('titlebar'), tabs: at('editorTabs') }; };
  await step('switchFrames', () => { const seq = swapFrames.filter((f) => f.ts >= swapStartTs - 0.05).map((f) => ({ ms: Math.round((f.ts - inject.wallStart) * 1000), ...classify(Buffer.from(f.data, 'base64'), rects) })); note('switchFrames', seq); });
  note('mockColours', { dark: classify(darkPng, rects), light: classify(lightPng, rects) });
  // Photographs of the two halves at full scale for the document, clipped.
  note('tabPalette2', await clickTab('palette.ts'));
  const monacoSwap = await s.eval(`(async () => { const ed = window.__p213Editor; if (!ed) return 'no editor'; const svc = ed._themeService || ed._standaloneThemeService; if (!svc) return 'no service: ' + Object.keys(ed).filter((k) => /theme/i.test(k)).join(','); const bgBefore = getComputedStyle(document.querySelector('.monaco-editor-background')).backgroundColor; const t0 = performance.now(); svc.defineTheme('gmux-light', ${JSON.stringify(monacoLight())}); svc.setTheme('gmux-light'); const defineMs = performance.now() - t0; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); const bgAfter = getComputedStyle(document.querySelector('.monaco-editor-background')).backgroundColor; const ln = document.querySelector('.monaco-editor .line-numbers'); const tok = document.querySelector('.monaco-editor .view-line span span'); return { bgBefore, bgAfter, defineMs, twoFramesMs: performance.now() - t0, theme: svc.getColorTheme ? svc.getColorTheme().themeName : null, lineNumberColor: ln ? getComputedStyle(ln).color : null, firstTokenColor: tok ? getComputedStyle(tok).color : null, editorsAlive: 1 }; })()`);
  note('monacoSwap', monacoSwap);
  await screenshot(s, join(OUT, 'mock-light-editor.png'));
  note('tabDiff2', await clickTab('app.ts')); await sleep(500);
  await screenshot(s, join(OUT, 'mock-light-terminal.png'), { x: rects.terminalHost.x, y: rects.terminalHost.y, width: rects.terminalHost.w, height: Math.min(420, rects.terminalHost.h) });
  // Section 6: the crossfade, a still of the old frame over the swap, faded in 200 ms; then under reduced motion.
  async function crossfade(label, reduced) {
    if (reduced) await s.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await s.eval(injectDark); await sleep(500);
    const fr = []; const off2 = s.on((m) => { if (m.method === 'Page.screencastFrame') { fr.push({ ts: m.params.metadata.timestamp, data: m.params.data }); s.call('Page.screencastFrameAck', { sessionId: m.params.sessionId }).catch(() => {}); } });
    await s.call('Page.startScreencast', { format: 'png', everyNthFrame: 1 }); await sleep(300);
    const still = await s.call('Page.captureScreenshot', { format: 'png' }); const stillAt = Date.now() / 1000;
    const r = await s.eval(`(async () => {
      const t0 = performance.now(); const img = document.createElement('img'); img.src = 'data:image/png;base64,${still.data}'; img.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:999999;pointer-events:none;opacity:1;transition:opacity 200ms linear'; await img.decode(); document.body.appendChild(img);
      await new Promise((res) => requestAnimationFrame(res)); const shown = performance.now();
      const inj = await (${injectLight});
      await new Promise((res) => requestAnimationFrame(res)); img.style.opacity = '0';
      const tp = getComputedStyle(img).transitionProperty; const running = document.getAnimations().filter((a) => a.effect && a.effect.target === img).length;
      await new Promise((res) => setTimeout(res, 260)); img.remove();
      return { stillDecodeMs: shown - t0, injectMs: inj.totalMs, transitionProperty: tp, transitionsRunning: running, totalMs: performance.now() - t0, reducedMotionMatches: matchMedia('(prefers-reduced-motion: reduce)').matches };
    })()`);
    await sleep(700); await s.call('Page.stopScreencast'); off2();
    if (reduced) await s.call('Emulation.setEmulatedMedia', { features: [] });
    const frs = fr.filter((f) => f.ts >= stillAt - 0.05).map((f) => ({ ms: Math.round((f.ts - stillAt) * 1000), ...classify(Buffer.from(f.data, 'base64'), rects) }));
    note(label, { ...r, frames: frs });
  }
  await step('crossfade', () => crossfade('crossfade', false));
  await step('crossfadeReducedMotion', () => crossfade('crossfadeReducedMotion', true));
  await s.eval(injectLight); await sleep(300);
  note('lightSurfacesAgain', await s.eval(READ_SURFACES));
  // Section 4 and 5 through the main process inspector.
  note('mainInspector', mainWs);
  if (mainWs) await step('main', async () => {
    const mc = await connect(mainWs);
    const ev = async (expr) => { const r = await mc.call('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, undefined, 60000); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'main threw'); return r.result?.value; };
    await mc.call('Runtime.enable');
    const req = `(process.mainModule ? process.mainModule.require : require)`;
    note('nativeTheme', await ev(`(() => { const { nativeTheme, BrowserWindow } = ${req}('electron'); const w = BrowserWindow.getAllWindows()[0]; return { shouldUseDarkColors: nativeTheme.shouldUseDarkColors, themeSource: nativeTheme.themeSource, systemIntegratedUI: nativeTheme.shouldUseDarkColorsForSystemIntegratedUI, highContrast: nativeTheme.shouldUseHighContrastColors, reducedTransparency: nativeTheme.prefersReducedTransparency, inForcedColors: nativeTheme.inForcedColorsMode, windowFill: w.getBackgroundColor(), mediaSourceId: w.getMediaSourceId(), bounds: w.getBounds(), electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node }; })()`));
    const flip = await ev(`(async () => { const { nativeTheme, BrowserWindow } = ${req}('electron'); const w = BrowserWindow.getAllWindows()[0]; const out = {}; const was = nativeTheme.themeSource;
      const t0 = Date.now(); const updated = new Promise((res) => nativeTheme.once('updated', () => res(Date.now() - t0)));
      nativeTheme.themeSource = 'light'; out.updatedEventMs = await Promise.race([updated, new Promise((res) => setTimeout(() => res('none in 2000'), 2000))]);
      out.shouldUseDarkAfter = nativeTheme.shouldUseDarkColors;
      out.rendererLightMs = await w.webContents.executeJavaScript('(async () => { const t = performance.now(); for (let i = 0; i < 400; i += 1) { if (matchMedia("(prefers-color-scheme: light)").matches) return performance.now() - t; await new Promise((r) => setTimeout(r, 5)); } return "not within 2000 ms"; })()');
      out.rendererColorScheme = await w.webContents.executeJavaScript('getComputedStyle(document.documentElement).colorScheme');
      const t1 = Date.now(); let events = 0; const h = () => { events += 1; }; nativeTheme.on('updated', h); for (let i = 0; i < 10; i += 1) { nativeTheme.themeSource = i % 2 === 0 ? 'dark' : 'light'; await new Promise((r) => setTimeout(r, 100)); } await new Promise((r) => setTimeout(r, 200)); nativeTheme.off('updated', h); out.tenFlips = { ms: Date.now() - t1, updatedEvents: events };
      nativeTheme.themeSource = was; out.restored = nativeTheme.themeSource; out.rendererDarkAgain = await w.webContents.executeJavaScript('matchMedia("(prefers-color-scheme: dark)").matches');
      const f0 = w.getBackgroundColor(); const s0 = Date.now(); w.setBackgroundColor(${JSON.stringify(LIGHT['--bg-canvas'])}); out.setFillMs = Date.now() - s0; out.fillSet = w.getBackgroundColor(); out.fillWas = f0;
      out.titleBar = { titleBarStyle: 'hiddenInset (src/main/index.ts)', trafficLightPosition: w.getTrafficLightPosition ? w.getTrafficLightPosition() : null, titleBarOverlay: w.titleBarOverlay ?? null, vibrancy: 'none set' };
      return out; })()`);
    note('nativeThemeFollow', flip);
    // The window as macOS composes it, traffic lights included: screencapture by CG window id, from the media source id.
    await step('windowCapture', async () => {
      const id = String((await ev(`${req}('electron').BrowserWindow.getAllWindows()[0].getMediaSourceId()`))).split(':')[1];
      const file = join(OUT, 'mock-light-window.png');
      const r = spawnSync('screencapture', ['-x', '-o', '-l', id, file], { encoding: 'utf8', timeout: 20000 });
      let read = null; try { const img = decodePng(readFileSync(file)); const lights = new Map(); for (let y = 10; y < 70; y += 2) for (let x = 10; x < 160; x += 2) { const c = pixel(img, x, y); lights.set(c, (lights.get(c) ?? 0) + 1); } const top = [...lights.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
        read = { w: img.width, h: img.height, trafficLightRegionTopColours: top, titleStrip: dominant(img, 400, 6, 800, 40, 4).colour, sidebarStrip: dominant(img, 120, 300, 200, 200, 4).colour }; } catch (e) { read = 'unreadable: ' + e.message; }
      note('windowCapture', { status: r.status, err: r.stderr.trim(), id, read });
    });
    // Section 5, window open: a window with the paper fill is SHOWN EMPTY first, so the screencast is running before the
    // document loads; then the Settings document is loaded into it and every frame is read. That is the first paint measured.
    const before = Date.now() / 1000;
    const made = await ev(`(async () => { const { BrowserWindow } = ${req}('electron'); const path = ${req}('node:path'); const w = new BrowserWindow({ width: 760, height: 560, show: false, backgroundColor: ${JSON.stringify(LIGHT['--bg-canvas'])}, title: 'p213 window open', titleBarStyle: 'hiddenInset', webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: false, preload: path.join(${req}('electron').app.getAppPath(), 'out', 'preload', 'index.js') } }); globalThis.__p213win = w; w.show(); await new Promise((r) => setTimeout(r, 1200)); return { id: w.id, fill: w.getBackgroundColor(), shown: w.isVisible() }; })()`);
    await sleep(800);
    const sidsBefore = [...frames.keys()].filter((k) => k !== bootSid);
    const emptyFrames = sidsBefore.flatMap((k) => frames.get(k)).filter((f) => f.ts >= before - 0.05).map((f) => { const img = decodePng(Buffer.from(f.data, 'base64')); const d = dominant(img, 0, 0, img.width, img.height, 8); return { ms: Math.round((f.ts - before) * 1000), colour: d.colour, share: Math.round(d.share * 100) / 100, distinct: d.distinct }; });
    const loadAt = Date.now() / 1000;
    const loaded = await ev(`(async () => { const w = globalThis.__p213win; const path = ${req}('node:path'); const t0 = Date.now(); await w.loadFile(path.join(${req}('electron').app.getAppPath(), 'out', 'renderer', 'settings', 'index.html')); const loadMs = Date.now() - t0; await new Promise((r) => setTimeout(r, 1500)); const out = { loadMs, fill: w.getBackgroundColor(), htmlBg: await w.webContents.executeJavaScript('getComputedStyle(document.documentElement).backgroundColor + " " + getComputedStyle(document.documentElement).colorScheme'), bodyBg: await w.webContents.executeJavaScript('getComputedStyle(document.body).backgroundColor') }; w.close(); return out; })()`);
    await sleep(600);
    const sids = [...frames.keys()].filter((k) => k !== bootSid);
    const openFrames = sids.flatMap((k) => frames.get(k)).filter((f) => f.ts >= loadAt - 0.05).slice(0, 14).map((f) => { const img = decodePng(Buffer.from(f.data, 'base64')); const d = dominant(img, 0, 0, img.width, img.height, 8); return { ms: Math.round((f.ts - loadAt) * 1000), colour: d.colour, share: Math.round(d.share * 100) / 100, distinct: d.distinct, w: img.width }; });
    note('windowOpen', { made, emptyFrames: emptyFrames.slice(0, 6), ...loaded, loadFrames: openFrames, targets: targetsSeen.slice(-3) });
    mc.close();
  });
  const rectsLight = await s.eval(RECTS); note('rectsLight', rectsLight);
  cdp.close();
});
} finally {
  report.stderrTail = stderrText.split('\n').slice(-12).join('\n');
  report.totalMs = Date.now() - T0;
  writeFileSync(join(OUT, 'report-a.json'), JSON.stringify(report, null, 2));
  say('done in ' + report.totalMs + ' ms; errors ' + JSON.stringify(report.errors));
}
