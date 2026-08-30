#!/usr/bin/env node
/**
 * cdp-target.mjs. Which devtools target is Tortie's main window (Phase 171).
 *
 * A probe that launches the app with `--remote-debugging-port=0` reads the
 * port from `DevToolsActivePort` in its own profile, asks `/json/list`, and
 * has to pick ONE target out of everything Chromium lists: the main window,
 * the Settings window when it is open, a devtools front end, a service
 * worker, the preview iframes, and a page that is still `about:blank` because
 * the window exists and the load has not started. The Phase 165 paint probe
 * did this pick inline, and when it came back empty the probe reported a
 * budget failure with no number in it, so observer drift read as a product
 * defect. This module is the pick, alone, with the reason it came back empty
 * written down, and a fixture proof any battery can run without a window.
 *
 * It starts nothing, opens no socket and reads no file. It is given the
 * array `/json/list` returned and nothing else.
 *
 *   node build/cdp-target.mjs --self-test    the fixture proof, exit 0 or 1
 */

/**
 * The main window's document, as the built app loads it: `out/renderer/
 * index.html`, with or without the `?harness=1` query. The Settings window is
 * `renderer/settings/index.html`, which this does not match, and a dev server
 * url has no `index.html` at all, which is why the probes launch the build.
 */
export const MAIN_WINDOW_URL = /\/renderer\/index\.html(?:[?#]|$)/;

/**
 * Pick the main window out of a `/json/list` answer.
 *
 * @param {ReadonlyArray<{type?: string, url?: string, title?: string, webSocketDebuggerUrl?: string}>} targets
 * @returns {{ target: object, why: null } | { target: null, why: string }}
 *   The target, or null with the reason: what was listed instead, in enough
 *   words to tell "not loaded yet" from "attached elsewhere" from "no window".
 */
export function pickRendererTarget(targets) {
  if (!Array.isArray(targets)) return { target: null, why: `the target list is ${typeof targets}, not an array` };
  const pages = targets.filter((t) => t && t.type === 'page');
  const windows = pages.filter((t) => MAIN_WINDOW_URL.test(String(t.url ?? '')));
  const open = windows.filter((t) => typeof t.webSocketDebuggerUrl === 'string' && t.webSocketDebuggerUrl !== '');
  if (open.length > 0) return { target: open[0], why: null };
  const seen = targets
    .map((t) => `${String(t?.type ?? '?')} ${String(t?.url ?? '').replace(/^.*\//, '') || '(no url)'}`)
    .join(', ');
  if (windows.length > 0) {
    return { target: null, why: `the main window is listed but another client holds its debugger (no webSocketDebuggerUrl); listed: ${seen}` };
  }
  if (pages.some((t) => String(t.url ?? '') === 'about:blank' || String(t.url ?? '') === '')) {
    return { target: null, why: `a window exists but has not started loading (about:blank); listed: ${seen}` };
  }
  if (targets.length === 0) return { target: null, why: 'the target list is empty; the browser has no window yet' };
  return { target: null, why: `no page target is the main window; listed: ${seen}` };
}

// ---------------------------------------------------------------------------
// The fixture proof. Shapes copied from what Electron 43 returns at
// /json/list, with only the ids shortened.
// ---------------------------------------------------------------------------

const MAIN = {
  description: '',
  devtoolsFrontendUrl: '/devtools/inspector.html?ws=127.0.0.1:53211/devtools/page/A1',
  id: 'A1',
  title: 'Tortie',
  type: 'page',
  url: 'file:///private/tmp/wt/out/renderer/index.html',
  webSocketDebuggerUrl: 'ws://127.0.0.1:53211/devtools/page/A1'
};
const MAIN_HARNESS = { ...MAIN, id: 'A2', url: 'file:///private/tmp/wt/out/renderer/index.html?harness=1', webSocketDebuggerUrl: 'ws://127.0.0.1:53211/devtools/page/A2' };
const MAIN_ENCODED = { ...MAIN, id: 'A3', url: 'file:///Users/some%20one/Library/Application%20Support/Tortie/../out/renderer/index.html', webSocketDebuggerUrl: 'ws://127.0.0.1:53211/devtools/page/A3' };
const SETTINGS = { ...MAIN, id: 'S1', title: 'Settings', url: 'file:///private/tmp/wt/out/renderer/settings/index.html', webSocketDebuggerUrl: 'ws://127.0.0.1:53211/devtools/page/S1' };
const DEVTOOLS = { ...MAIN, id: 'D1', title: 'DevTools', type: 'page', url: 'devtools://devtools/bundled/devtools_app.html?remoteBase=x&can_dock=true', webSocketDebuggerUrl: 'ws://127.0.0.1:53211/devtools/page/D1' };
const WORKER = { description: '', id: 'W1', title: 'Service Worker', type: 'service_worker', url: 'file:///private/tmp/wt/out/renderer/sw.js', webSocketDebuggerUrl: 'ws://127.0.0.1:53211/devtools/page/W1' };
const PREVIEW = { description: '', id: 'F1', title: '', type: 'iframe', url: 'gmux-preview://tok/docs/index.html?v=3', webSocketDebuggerUrl: 'ws://127.0.0.1:53211/devtools/page/F1' };
const BLANK = { ...MAIN, id: 'B1', title: '', url: 'about:blank', webSocketDebuggerUrl: 'ws://127.0.0.1:53211/devtools/page/B1' };
const ATTACHED = { ...MAIN, id: 'A9', webSocketDebuggerUrl: undefined };

const FIXTURES = [
  { name: 'the full list picks the main window and nothing else', list: [WORKER, DEVTOOLS, SETTINGS, PREVIEW, MAIN, BLANK], id: 'A1' },
  { name: 'the harness query on the url still matches', list: [SETTINGS, MAIN_HARNESS], id: 'A2' },
  { name: 'a percent encoded path still matches', list: [MAIN_ENCODED], id: 'A3' },
  { name: 'the settings window alone is not the main window', list: [SETTINGS, WORKER], id: null, why: /no page target is the main window/ },
  { name: 'a window that has not started loading says so', list: [BLANK, WORKER], id: null, why: /not started loading/ },
  { name: 'a main window another client holds says so', list: [ATTACHED, SETTINGS], id: null, why: /another client holds/ },
  { name: 'an empty list says the browser has no window yet', list: [], id: null, why: /no window yet/ },
  { name: 'a devtools front end is never the main window', list: [DEVTOOLS], id: null, why: /no page target/ },
  { name: 'a service worker under renderer/ is not a page', list: [{ ...WORKER, url: 'file:///x/out/renderer/index.html' }], id: null, why: /no page target/ },
  { name: 'a non array answer is refused, not thrown on', list: { error: 'x' }, id: null, why: /not an array/ }
];

/** Run every fixture. Returns { ok, failures } and throws on nothing. */
export function selfTest() {
  const failures = [];
  for (const f of FIXTURES) {
    let r;
    try {
      r = pickRendererTarget(f.list);
    } catch (e) {
      failures.push(`${f.name}: threw ${String(e)}`);
      continue;
    }
    const got = r.target ? r.target.id : null;
    if (got !== f.id) failures.push(`${f.name}: picked ${String(got)}, expected ${String(f.id)}`);
    if (f.id === null && !(f.why instanceof RegExp && f.why.test(r.why ?? ''))) {
      failures.push(`${f.name}: reason "${String(r.why)}" does not match ${String(f.why)}`);
    }
    if (f.id !== null && r.why !== null) failures.push(`${f.name}: a pick carried a reason: ${String(r.why)}`);
  }
  return { ok: failures.length === 0, failures, count: FIXTURES.length };
}

if (process.argv.includes('--self-test')) {
  const r = selfTest();
  for (const f of r.failures) console.error(`[cdp-target] FAIL ${f}`);
  console.log(`[cdp-target] ${r.ok ? 'PASS' : 'FAIL'}: ${String(r.count - r.failures.length)} of ${String(r.count)} target discovery fixtures`);
  process.exit(r.ok ? 0 : 1);
}
