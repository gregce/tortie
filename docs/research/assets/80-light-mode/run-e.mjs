#!/usr/bin/env node
// Research 80 app run E: what it takes for the FIRST FRAME of a window to carry the chosen scheme. Three scratch documents are
// opened in scratch windows of the running app, each with a paper compositor fill, screencast from before the load:
//   A. the shipped shape: an inline `html { background: #131417 }` and nothing else;
//   B. no inline background at all, so the compositor fill is what shows until a stylesheet paints;
//   C. an inline rule keyed on a root attribute a scratch PRELOAD stamps from its own argv before the document parses.
// The preload and the documents are harness files under the scratch directory, not production code.
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connect, sleep } from './lib/cdp.mjs';
import { launch, withElectron, browserEndpoint, appPage } from './lib/app.mjs';
import { LIGHT } from './palette.mjs';
import { decodePng, dominant } from './lib/png.mjs';
const OUT = '/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p213';
const say = (l) => console.log(`[p213 E] ${l}`);
const report = { errors: [], cases: {} };
const root = realpathSync(mkdtempSync(join(tmpdir(), 'p213-e-'))); const profile = join(root, 'profile'); const docs = join(root, 'docs');
mkdirSync(profile, { recursive: true }); mkdirSync(docs, { recursive: true });
const PAPER = LIGHT['--bg-canvas'];
writeFileSync(join(docs, 'a.html'), `<!doctype html><html><head><meta charset="utf-8"><style>html{background:#131417;color-scheme:dark}</style></head><body><p style="color:#ccc">A</p></body></html>`);
writeFileSync(join(docs, 'b.html'), `<!doctype html><html><head><meta charset="utf-8"><style>body{color:#333}</style></head><body><p>B</p></body></html>`);
writeFileSync(join(docs, 'c.html'), `<!doctype html><html><head><meta charset="utf-8"><style>html{background:#131417;color-scheme:dark}html[data-scheme=light]{background:${PAPER};color-scheme:light}</style></head><body><p>C</p></body></html>`);
writeFileSync(join(docs, 'preload.cjs'), `const { contextBridge } = require('electron');
const scheme = (process.argv.find((a) => a.startsWith('--p213-scheme=')) || '').slice(14);
const had = { documentElement: !!document.documentElement, readyState: document.readyState, argvHasScheme: scheme, at: Date.now() };
let stampedAt = null;
if (scheme && document.documentElement) { document.documentElement.setAttribute('data-scheme', scheme); stampedAt = 'preload'; }
else if (scheme) { document.addEventListener('readystatechange', () => { if (!stampedAt && document.documentElement) { document.documentElement.setAttribute('data-scheme', scheme); stampedAt = 'readystatechange ' + document.readyState; } }); }
contextBridge.exposeInMainWorld('__p213', { had, read: () => ({ had, stampedAt }) });`);
const T0 = Date.now();
let mainWs = null; let stderrText = '';
try {
  await withElectron({ ...launch('p213 E', profile, null, {}, ['--inspect=0']) }, async (handle) => {
    handle.child.stderr.on('data', (c) => { stderrText += String(c); const m = /Debugger listening on (ws:\/\/[^\s]+)/.exec(stderrText); if (m && !mainWs) mainWs = m[1]; });
    handle.child.stdout.on('data', () => {});
    const { cdp } = await browserEndpoint(profile);
    const attached = new Map(); const frames = new Map();
    cdp.on((m) => {
      if (m.method === 'Target.attachedToTarget') { const { sessionId, targetInfo, waitingForDebugger } = m.params; attached.set(targetInfo.targetId, sessionId); if (targetInfo.type === 'page') { frames.set(sessionId, []); (async () => { if (waitingForDebugger) { try { await cdp.call('Runtime.runIfWaitingForDebugger', {}, sessionId); } catch { /* fine */ } } try { await cdp.call('Page.enable', {}, sessionId, 15000); await cdp.call('Page.startScreencast', { format: 'png', everyNthFrame: 1 }, sessionId, 15000); } catch (e) { report.errors.push('screencast: ' + e.message); } })(); } else if (waitingForDebugger) cdp.call('Runtime.runIfWaitingForDebugger', {}, sessionId).catch(() => {}); }
      if (m.method === 'Page.screencastFrame') { const arr = frames.get(m.sessionId); if (arr) arr.push({ ts: m.params.metadata.timestamp, data: m.params.data }); cdp.call('Page.screencastFrameAck', { sessionId: m.params.sessionId }, m.sessionId).catch(() => {}); }
    });
    await cdp.call('Target.setDiscoverTargets', { discover: true });
    await cdp.call('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
    const s = await appPage(cdp, attached); const appSid = s.sessionId;
    for (let i = 0; i < 100 && !mainWs; i += 1) await sleep(100);
    const mc = await connect(mainWs);
    const ev = async (expr) => { const r = await mc.call('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, undefined, 60000); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'main threw'); return r.result?.value; };
    await mc.call('Runtime.enable');
    const req = `(process.mainModule ? process.mainModule.require : require)`;
    for (const [label, file, scheme] of [['A shipped inline fill', 'a.html', ''], ['B no inline fill', 'b.html', ''], ['C preload stamps the root', 'c.html', 'light']]) {
      const seen = new Set(frames.keys());
      const made = await ev(`(async () => { const { BrowserWindow } = ${req}('electron'); const w = new BrowserWindow({ width: 700, height: 500, show: false, backgroundColor: ${JSON.stringify(PAPER)}, title: 'p213 E', titleBarStyle: 'hiddenInset', webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: false, preload: ${JSON.stringify(join(docs, 'preload.cjs'))}, additionalArguments: ${JSON.stringify(scheme ? ['--p213-scheme=' + scheme] : [])} } }); globalThis.__p213win = w; w.show(); await new Promise((r) => setTimeout(r, 1200)); return { fill: w.getBackgroundColor() }; })()`);
      await sleep(600);
      const loadAt = Date.now() / 1000;
      const loaded = await ev(`(async () => { const w = globalThis.__p213win; const t0 = Date.now(); await w.loadFile(${JSON.stringify(join(docs, file))}); const loadMs = Date.now() - t0; await new Promise((r) => setTimeout(r, 1200)); const out = { loadMs, htmlBg: await w.webContents.executeJavaScript('getComputedStyle(document.documentElement).backgroundColor'), preload: await w.webContents.executeJavaScript('JSON.stringify(globalThis.__p213 ? globalThis.__p213.read() : null)'), attr: await w.webContents.executeJavaScript('document.documentElement.getAttribute("data-scheme")') }; w.close(); return out; })()`);
      await sleep(600);
      const sids = [...frames.keys()].filter((k) => !seen.has(k) && k !== appSid);
      const fr = sids.flatMap((k) => frames.get(k)).filter((f) => f.ts >= loadAt - 0.05).slice(0, 8).map((f) => { const img = decodePng(Buffer.from(f.data, 'base64')); const d = dominant(img, 0, 0, img.width, img.height, 8); return { ms: Math.round((f.ts - loadAt) * 1000), colour: d.colour, share: Math.round(d.share * 100) / 100, distinct: d.distinct }; });
      report.cases[label] = { ...made, ...loaded, frames: fr };
      say(`${label}: ${JSON.stringify(report.cases[label])}`);
    }
    mc.close(); cdp.close();
  });
} finally {
  report.totalMs = Date.now() - T0;
  writeFileSync(join(OUT, 'report-e.json'), JSON.stringify(report, null, 2));
  say('done in ' + report.totalMs + ' ms; errors ' + JSON.stringify(report.errors));
}
