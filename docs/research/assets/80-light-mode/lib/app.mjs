// Launch and drive helpers for research 80. Every Electron goes through build/electron-run.mjs, which ends the tree in a finally.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { connect, session, sleep } from './cdp.mjs';
export const REPO = '/private/tmp/wt-p213';
export const SOCKET = process.env.P213_SOCKET || 'gmux-p213';
const run = await import(join(REPO, 'build', 'electron-run.mjs'));
export const { withElectron, withoutDevRenderer } = run;
export function launch(label, profile, home, extraEnv = {}, extraArgs = []) {
  return {
    label, userDataDir: profile, tmuxSocket: SOCKET, cwd: REPO,
    args: ['--remote-debugging-port=0', '--use-mock-keychain', ...extraArgs],
    env: withoutDevRenderer({ ...(home ? { HOME: home } : {}), GMUX_TMUX_SOCKET: SOCKET, GMUX_PROBES: '1', GMUX_SHOT: join(profile, 'unused.png'), GMUX_SHOT_DELAY_MS: '1500000', GMUX_SHOT_POPUP_PICK: 'p213 no row carries this label', ...extraEnv }),
    ceilingMs: 25 * 60 * 1000, echo: false
  };
}
export async function browserEndpoint(profile, timeoutMs = 120000, pollMs = 10) {
  const started = Date.now();
  for (;;) {
    let port = 0; try { port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim()); } catch { port = 0; }
    if (port > 0) { try { const v = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); if (v.webSocketDebuggerUrl) return { cdp: await connect(v.webSocketDebuggerUrl), port }; } catch { /* not yet */ } }
    if (Date.now() - started > timeoutMs) throw new Error('no devtools endpoint in time');
    await sleep(pollMs);
  }
}
/** Attach to the app page, whether or not auto attach already paused it. Returns a session. */
export async function appPage(cdp, attached, timeoutMs = 120000) {
  const started = Date.now();
  for (;;) {
    const { targetInfos } = await cdp.call('Target.getTargets');
    const page = targetInfos.find((t) => t.type === 'page' && /index\.html|localhost/.test(t.url) && !/settings/.test(t.url));
    if (page) {
      let sid = attached.get(page.targetId);
      if (!sid) { const r = await cdp.call('Target.attachToTarget', { targetId: page.targetId, flatten: true }); sid = r.sessionId; }
      const s = session(cdp, sid);
      for (;;) {
        try { const ready = await s.eval(`typeof window.gmux === 'object' && typeof window.__gmuxP207 === 'object' && performance.getEntriesByType('navigation')[0]?.loadEventEnd > 0`, 5000); if (ready) return s; } catch { /* not yet */ }
        if (Date.now() - started > timeoutMs) throw new Error('the app page never became ready');
        await sleep(100);
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app page target in time');
    await sleep(50);
  }
}
export async function screenshot(s, file, clip) {
  const r = await s.call('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) }, 60000);
  const buf = Buffer.from(r.data, 'base64'); if (file) writeFileSync(file, buf); return buf;
}
export const FIND_TERMS = `(() => {
  const out = [];
  for (const el of document.querySelectorAll('.gmux-terminal-pane')) {
    const key = Object.keys(el).find((k) => k.startsWith('__reactFiber')); let f = el[key]; let term = null;
    for (let up = 0; f && up < 12 && !term; up += 1) { let h = f.memoizedState; for (let i = 0; h && i < 80 && !term; i += 1) { const c = h.memoizedState && h.memoizedState.current; if (c && c.options && c.buffer && typeof c.refresh === 'function') term = c; h = h.next; } f = f.return; }
    if (term) out.push(term);
  }
  window.__p213Terms = out; return out.length;
})()`;
export const FIND_MONACO = `(() => {
  const el = document.querySelector('.monaco-editor'); if (!el) { window.__p213Editor = null; return 0; }
  const host = el.parentElement; const key = Object.keys(host).find((k) => k.startsWith('__reactFiber')); let f = host[key]; let ed = null;
  for (let up = 0; f && up < 12 && !ed; up += 1) { let h = f.memoizedState; for (let i = 0; h && i < 80 && !ed; i += 1) { const c = h.memoizedState && h.memoizedState.current; if (c && typeof c.getModel === 'function' && typeof c.updateOptions === 'function') ed = c; h = h.next; } f = f.return; }
  window.__p213Editor = ed; return ed ? 1 : 0;
})()`;
export const RECTS = `(() => {
  const sel = { titlebar: '.titlebar', activity: '.activity-bar', sidebar: '.sidebar', tree: 'file-tree-container', terminalHost: '.gmux-terminal-host', terminalPane: '.gmux-terminal-pane', xtermScreen: '.xterm-screen', editorPanel: '.ed-panel', editorTabs: '.ed-tabs', monaco: '.monaco-editor', pierre: '.ed-pierre', body: 'body' };
  const out = {};
  for (const [k, q] of Object.entries(sel)) { const el = document.querySelector(q); if (!el) { out[k] = null; continue; } const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); out[k] = { x: r.x, y: r.y, w: r.width, h: r.height, bg: cs.backgroundColor, color: cs.color }; }
  out.dpr = devicePixelRatio; out.inner = { w: innerWidth, h: innerHeight };
  return out;
})()`;
export function setTokensJs(tokens) {
  return `(() => { const r = document.documentElement.style; const t = ${JSON.stringify(tokens)}; for (const [k, v] of Object.entries(t)) r.setProperty(k, v); return Object.keys(t).length; })()`;
}
export function clearTokensJs(tokens) {
  return `(() => { const r = document.documentElement.style; for (const k of ${JSON.stringify(Object.keys(tokens))}) r.removeProperty(k); return 1; })()`;
}
export { sleep };
