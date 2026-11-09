// Phase 363 PROBE-ONLY main-process driver. Two modes, chosen by P363_MODE:
//  isolated: run as the Electron main script. Loads the production addon with a
//            stand-in ASYNC dispatcher and measures submit -> callback ->
//            delayed result with self-targeted events. No product code.
//  product:  loaded with NODE_OPTIONS=--require into the built Tortie. Loads the
//            probe-only self-send addon and serves commands from P363_CMD_DIR.
// The production addon has no send API; self-send.node is built only for this.
const path = require('node:path');
const fs = require('node:fs');
const mode = process.env.P363_MODE;
if (!mode) return;
if (!process.versions.electron || process.type === 'renderer') return;
let app = null;
const root = process.env.P363_ROOT;
const NATIVE = path.join(root, 'out', 'native');
const load = (n) => { const m = { exports: {} }; process.dlopen(m, path.join(NATIVE, n)); return m.exports; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 'TrtE';

function sendP(sender, ev, kind, text) {
  return new Promise((res) => sender.send(T, ev, kind, text, (body, code) => res({ code, body })));
}

async function isolated() {
  const ae = load('apple-events.node');
  const sender = load('self-send.node');
  let ticks = 0;
  setInterval(() => ticks++, 20).unref();
  const calls = [];
  const live = [];
  // Stand-in async dispatcher: completes later, via the same complete() the product uses.
  ae.install((id, text) => {
    calls.push(text);
    live.push(ae.isLive(id));
    setTimeout(() => {
      if (text === 'hang') return;
      const ok = ae.complete(id, JSON.stringify({ version: 1, ok: true, echo: text.length }));
      calls.push('complete:' + ok);
    }, text === 'slow' ? 700 : 150);
  }, 500);
  const out = {};
  const t0 = Date.now();
  const sub = await sendP(sender, 'subm', 'text', 'héllo');
  out.submit = { ...sub, ms: Date.now() - t0 };
  const id = sub.body;
  out.pendingFirst = await sendP(sender, 'rslt', 'text', id);
  await sleep(300);
  out.completed = await sendP(sender, 'rslt', 'text', id);
  out.completedAgain = await sendP(sender, 'rslt', 'text', id);
  out.callsAfterRepeat = calls.length; // one dispatch, one complete
  out.missing = await sendP(sender, 'rslt', 'text', 'deadbeef');
  out.wrongKindSubmit = await sendP(sender, 'subm', 'int', '7');
  out.wrongKindResult = await sendP(sender, 'rslt', 'int', '7');
  out.empty = await sendP(sender, 'subm', 'text', '');
  out.oversize = await sendP(sender, 'subm', 'text', 'x'.repeat(65537));
  out.atCap = (await sendP(sender, 'subm', 'text', 'y'.repeat(65536))).code;
  await sleep(300);
  // Expiry: a slow job outlives the 500 ms ttl; its late completion must be ignored.
  const slow = await sendP(sender, 'subm', 'text', 'slow');
  await sleep(900);
  out.expiredRead = await sendP(sender, 'rslt', 'text', slow.body);
  out.lateCompleteIgnored = calls.filter((c) => c === 'complete:false').length >= 1;
  // Capacity: 16 held jobs admitted (hangs), the 17th refused, nothing evicted.
  await sleep(600);
  const ids = [];
  for (let i = 0; i < 17; i++) ids.push(await sendP(sender, 'subm', 'text', 'hang'));
  out.capacity = { admitted: ids.filter((r) => r.code === 0).length, refusedCode: ids[16].code, jobCount: ae.jobCount() };
  out.firstStillPending = await sendP(sender, 'rslt', 'text', ids[0].body);
  out.mainTicks = ticks;
  ae.shutdown();
  out.afterShutdownSubmit = await sendP(sender, 'subm', 'text', 'x');
  out.afterShutdownResult = await sendP(sender, 'rslt', 'text', ids[0].body);
  out.afterShutdownJobs = ae.jobCount();
  out.dispatchedLiveAtCallback = live.every(Boolean);
  console.log('[p363-iso] ' + JSON.stringify(out));
  app.quit();
}

async function product() {
  const dir = process.env.P363_CMD_DIR;
  let sender = null;
  fs.mkdirSync(dir, { recursive: true });
  const seen = new Set();
  setInterval(async () => {
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.cmd.json') || seen.has(f)) continue;
      seen.add(f);
      const outFile = path.join(dir, f.replace('.cmd.json', '.out.json'));
      try {
        const cmd = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        sender = sender || load('self-send.node');
        const r = await sendP(sender, cmd.event, cmd.kind || 'text', cmd.text);
        fs.writeFileSync(outFile, JSON.stringify(r));
      } catch (e) {
        fs.writeFileSync(outFile, JSON.stringify({ code: -1, body: 'driver error: ' + String(e && e.message) }));
      }
    }
  }, 50).unref();
}

function boot() {
  let electron = null;
  // A require resolved from the repository would find the npm package (a path string); from / it finds the builtin.
  try { electron = require('node:module').createRequire('/x.js')('electron'); } catch { /* not yet */ }
  if (!electron || !electron.app) { setTimeout(boot, 25); return; }
  app = electron.app;
  start();
}
function start() {
if (mode === 'isolated') {
  app.setPath('userData', process.env.P363_USER_DATA);
  app.on('window-all-closed', () => {});
  app.whenReady().then(() => { app.setActivationPolicy && app.setActivationPolicy('prohibited'); return isolated(); })
    .catch((e) => { console.log('[p363-iso-error] ' + String(e && e.message)); app.quit(); });
} else if (mode === 'product') {
  app.whenReady().then(product);
}
}
boot();
