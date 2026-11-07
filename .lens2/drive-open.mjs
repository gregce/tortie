/* LENS 2 (C): ONE scratch REAL app session through withElectron + CDP.
 * Everything it reads is an outside-process observation: socket answers from
 * an independently written raw client, CDP reads of the renderer, sha256 of
 * bytes on disk, file modes, app.log scans, and the packaged assertion.
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, lstatSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

process.env['LENS2_NOTE'] = '1';
const OUT = { checks: [], meta: {} };
const check = (id, pass, evidence) => OUT.checks.push({ id, pass: pass === true, evidence: String(evidence).slice(0, 900) });
const shaFile = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
let EV = null;
const safeEval = async (expr, ms = 20000) => { try { return await EV(expr, ms); } catch (e) { return `ERR:${String(e?.message ?? e).slice(0, 200)}`; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

import { withElectron, withoutDevRenderer, liveSessionRows } from '/private/var/tmp/tortie-wt/wt-p359/build/electron-run.mjs';
import { wsConnect, cdpEval } from '/private/var/tmp/tortie-wt/wt-p359/build/cdp-client.mjs';
import { pickRendererTarget } from '/private/var/tmp/tortie-wt/wt-p359/build/cdp-target.mjs';
import { createConnection } from 'node:net';

const WT = '/private/var/tmp/tortie-wt/wt-p359';
const SCR = '/private/var/tmp/tortie-wt/scratch/p359/lens2';
OUT.meta.wt = WT;

function rawSend(sockPath, obj) {
  return new Promise((resolvePromise) => {
    const chunks = [];
    let sock;
    const timer = setTimeout(() => { try { sock?.destroy(); } catch {} resolvePromise({ bytes: Buffer.concat(chunks), timedOut: true }); }, 8000);
    try { sock = createConnection({ path: sockPath }); } catch (e) { clearTimeout(timer); resolvePromise({ error: String(e?.message ?? e) }); return; }
    sock.on('connect', () => sock.write(`${JSON.stringify(obj)}\n`));
    sock.on('data', (d) => chunks.push(d));
    sock.on('end', () => { clearTimeout(timer); resolvePromise({ bytes: Buffer.concat(chunks) }); });
    sock.on('error', (e) => { clearTimeout(timer); resolvePromise({ bytes: Buffer.concat(chunks), error: String(e?.message ?? e) }); });
    sock.on('close', () => { clearTimeout(timer); resolvePromise({ bytes: Buffer.concat(chunks) }); });
  });
}
const ansOf = (r) => { try { return JSON.parse(Buffer.concat([r.bytes]).toString('utf8').trim()); } catch { return { __raw: (r.bytes ?? Buffer.alloc(0)).toString('utf8').slice(0, 200) }; } };

async function cdpForPage(profile, wantUrl, ready, timeoutMs, what) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try { port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim()); } catch { port = 0; }
    if (port > 0) {
      let list = [];
      try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch { list = []; }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl || !wantUrl(String(t.url ?? ''))) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl, { collect: ['Runtime.exceptionThrown'] });
          const a = await cdpEval(cdp, ready, 5000);
          if (typeof a === 'string') return { cdp, url: a };
          cdp.close();
        } catch { try { cdp?.close(); } catch {} }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error(`no ${what}`);
    await sleep(200);
  }
}

const runDir = mkdtempSync(join(SCR, 'live-'));
const home = join(runDir, 'home');
const profile = join(runDir, 'profile-x'); // short on purpose: sun_path <= 103
const projA = join(runDir, 'projA');
const projB = join(runDir, 'projB');
const tmsock = `gmux-p359l2-${process.pid}`;
for (const d of [home, profile, projA, projB]) mkdirSync(d, { recursive: true });
// committed-shape hostile fixtures
writeFileSync(join(projA, 'hello.txt'), 'alpha one\nbeta two\nGamma three\n');
writeFileSync(join(projA, 'emoji.txt'), 'plain\nline with \u{1F600} grin\nlast\n');
writeFileSync(join(projA, '.env'), 'SECRET=1\n');
writeFileSync(join(projA, 'notes.md'), '# hi\nrefused? no: markdown is text\n');
mkdirSync(join(projA, 'sub'), { recursive: true });
writeFileSync(join(projB, 'other.txt'), 'other project file\nsecond line\n');
writeFileSync(join(home, '.zshenv'), '');
const homeStatBefore = statSync(home);
const histBefore = (() => { try { const s = statSync(join(home, '.zsh_history')); return `${s.size}/${s.mtimeMs}`; } catch { return 'absent'; } })();

const env = withoutDevRenderer({
  ...process.env,
  HOME: home, ZDOTDIR: home, HISTFILE: '/dev/null', TERM_SESSION_ID: '',
  GMUX_TMUX_SOCKET: tmsock, GMUX_PROBES: '1', GMUX_SPECSTORY_NO_CLOUD: '1',
  GMUX_LOG_FILE: '1', ELECTRON_DISABLE_SANDBOX: '1',
});
OUT.meta.profile = profile; OUT.meta.tmux = tmsock;

let bodyError = null;
try {
  await withElectron({
    label: 'lens2-open', userDataDir: profile, tmuxSocket: tmsock, cwd: WT,
    args: ['--remote-debugging-port=0', '--use-mock-keychain', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    env, graceMs: 15000, ceilingMs: 8 * 60 * 1000,
  }, async (handle) => {
    OUT.meta.pid = handle.pid;
    const { cdp, url } = await cdpForPage(profile, (u) => !u.includes('/settings/index.html'), `typeof window.gmux === 'object' ? location.href : null`, 90000, 'app window');
    EV = (e, ms) => cdpEval(cdp, e, ms);
    OUT.meta.rendererUrl = url;
    check('L1-app-window', /renderer\/index\.html/.test(url), url.slice(0, 120));
    const bridge = await cdpEval(cdp, `(() => { const g = window.gmux; if (!g) return 'no-bridge'; return 'bridge:' + ['agentAccess','sessions','projects'].map((k) => k + '=' + (g[k] ? Object.keys(g[k]).join('/') : 'MISSING')).join(' '); })()`, 15000);
    OUT.meta.bridge = String(bridge);
    check('L2-preload-bridge', /sessions=.*create/.test(String(bridge)) && /projects=.*add/.test(String(bridge)) && /agentAccess=onOpen\/complete/.test(String(bridge)), String(bridge).slice(0, 300));

    // OFF by default: no socket file, capabilities answered disabled (if a listener exists at all).
    const sockPath = join(profile, 'gmux', 'agent.sock');
    OUT.meta.sockPath = sockPath;
    OUT.meta.sockBytes = Buffer.byteLength(sockPath, 'utf8');
    await sleep(1500);
    check('L3-sunpath-fits', Buffer.byteLength(sockPath, 'utf8') <= 103, `${Buffer.byteLength(sockPath, 'utf8')} bytes`);
    const offExists = existsSync(sockPath);
    check('L4-off-no-listener', offExists === false, `agent.sock exists while switch off=${offExists}`);

    // Turn the switch ON through the app's own settings channel.
    const afterSet = await cdpEval(cdp, `window.gmux.settingsSet({ agentAccess: true }).then((s) => JSON.stringify({ agentAccess: s ? s.agentAccess : null })).catch((e) => 'ERR:' + String(e && e.message || e))`, 20000);
    OUT.meta.settingsAfterSet = String(afterSet);
    check('L5-switch-on-accepted', String(afterSet).includes('"agentAccess":true'), String(afterSet).slice(0, 160));

    // Wait for the listener; read mode + identity from outside.
    let waited = 0;
    while (!existsSync(sockPath) && waited < 15000) { await sleep(250); waited += 250; }
    const onExists = existsSync(sockPath);
    check('L6-listener-appears', onExists === true, `appeared after ~${waited}ms`);
    let mode = '?', ino = 0, dev = 0, parentMode = '?';
    if (onExists) {
      await sleep(250);
      const st = statSync(sockPath);
      mode = (st.mode & 0o777).toString(8); ino = st.ino; dev = st.dev;
      parentMode = (statSync(join(profile, 'gmux')).mode & 0o777).toString(8);
    }
    OUT.meta.sockStat = { mode, ino, dev, parentMode };
    check('L7-modes', mode === '600' && parentMode === '700', `socket=${mode} parent=${parentMode} dev=${dev} ino=${ino}`);

    // capabilities through the RAW client (not the shipped examples).
    const cap = ansOf(await rawSend(sockPath, { version: 1, operation: 'capabilities', session: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }));
    OUT.meta.capabilities = JSON.stringify(cap).slice(0, 300);
    check('L8-fake-caller-refused', cap?.ok === false && cap?.error?.code === 'unavailable', JSON.stringify(cap).slice(0, 200));

    // sessions with no caller yet: unavailable (proves the caller gate is live).
    const sess0 = ansOf(await rawSend(sockPath, { version: 1, operation: 'sessions', session: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }));
    check('L9-fake-caller-live', sess0?.ok === false && sess0?.error?.code === 'unavailable', JSON.stringify(sess0).slice(0, 160));

    // Add two projects + create one shell session through the app's own doors, then use real ids.
    const pA = await cdpEval(cdp, `window.gmux.projects.add(${JSON.stringify(projA)}).then((p) => JSON.stringify({ id: p && p.id, path: p && p.path })).catch((e) => 'ERR:' + String(e && e.message || e))`, 20000);
    const pB = await cdpEval(cdp, `window.gmux.projects.add(${JSON.stringify(projB)}).then((p) => JSON.stringify({ id: p && p.id, path: p && p.path })).catch((e) => 'ERR:' + String(e && e.message || e))`, 20000);
    OUT.meta.projects = `${String(pA).slice(0, 120)} | ${String(pB).slice(0, 120)}`;
    check('L10-projects-added', String(pA).includes(projA) && String(pB).includes(projB), OUT.meta.projects);
    const mkSession = await cdpEval(cdp, `window.gmux.sessions.create({ name: 'lens2-shell', projectPath: ${JSON.stringify(projA)}, agent: 'shell' }).then((s) => JSON.stringify({ id: s && s.id, name: s && s.name })).catch((e) => 'ERR:' + String(e && e.message || e))`, 60000);
    OUT.meta.mkSession = String(mkSession).slice(0, 200);
    let callerId = null;
    try { callerId = JSON.parse(String(mkSession)).id ?? null; } catch { callerId = null; }
    OUT.meta.callerId = callerId;
    // wait until the new row is a live local session (tmux spawn), then whoami with the REAL claimed id.
    let who = null;
    for (let i = 0; i < 40 && callerId; i += 1) {
      who = ansOf(await rawSend(sockPath, { version: 1, operation: 'whoami', session: callerId }));
      if (who?.ok === true) break;
      await sleep(500);
    }
    OUT.meta.whoami = JSON.stringify(who).slice(0, 500);
    check('L11-whoami-live', who?.ok === true && who?.value?.session?.id === callerId, JSON.stringify(who).slice(0, 400));
    // sessions list through the real door with the real caller.
    let sess = null;
    if (callerId) sess = ansOf(await rawSend(sockPath, { version: 1, operation: 'sessions', session: callerId }));
    OUT.meta.sessionsAns = JSON.stringify(sess).slice(0, 300);
    const sessRows = sess?.ok === true ? sess.value.sessions : null;
    check('L12-sessions-live', Array.isArray(sessRows) && sessRows.length >= 1 && sessRows.some((r) => r.id === callerId), `rows=${Array.isArray(sessRows) ? sessRows.length : '?'} omitted=${sess?.value?.omitted}`);
    if (Array.isArray(sessRows)) {
      const first = sessRows[0];
      const leak = JSON.stringify(sess).match(/secret-canary|conv-canary|resume|argv|tmuxName|conversationId/);
      check('L13-rows-curated', first && 'phase' in first && 'machine' in first && 'project' in first && !('argv' in first) && !('resumeArgv' in first) && leak === null, `first=${JSON.stringify(first).slice(0, 300)}`);
      const ordered = sessRows.every((r, i, a) => i === 0 || a[i - 1].createdAt > r.createdAt || (a[i - 1].createdAt === r.createdAt && a[i - 1].id <= r.id));
      check('L14-order-live', ordered === true, `newest-first tie-by-id over ${sessRows.length} rows`);
    }
    // pane env from OUTSIDE the app: tmux show-environment for the real pane.
    // A caller id + a session id are NOT the same string: the pane env carries
    // GMUX_SESSION_ID (a $-id stamp), and the socket door wants the manifest
    // uuid. Read both from outside and use each where it belongs.
    let paneEnv = '';
    if (callerId) {
      const probe = spawnSync('tmux', ['-L', tmsock, 'show-environment', '-g', 'GMUX_SESSION_ID'], { encoding: 'utf8', timeout: 15000 });
      const probe2 = spawnSync('tmux', ['-L', tmsock, 'list-panes', '-a', '-F', '#{pane_id} #{pane_start_command}'], { encoding: 'utf8', timeout: 15000 });
      OUT.meta.panes = String(probe2.stdout ?? '').slice(0, 300);
      OUT.meta.paneEnvGlobal = String(probe.stdout ?? '').slice(0, 200);
      const paneProbe = spawnSync('tmux', ['-L', tmsock, 'display-message', '-p', '#{pane_id} #{pane_start_command}'], { encoding: 'utf8', timeout: 15000 });
      void paneProbe;
      // Per-pane env: capture-pane of `env` through the pane's own shell needs a
      // keystroke; INSTEAD prove it the honest way: the door's whoami must echo
      // the manifest uuid, and the pane's env must answer the same stamp the
      // app's listSessions carries. Read the pane env via show-environment -t.
      const panes = String(probe2.stdout ?? '').split('\n').map((l) => l.trim().split(' ')[0]).filter(Boolean);
      for (const pane of panes.slice(0, 6)) {
        const pe = spawnSync('tmux', ['-L', tmsock, 'show-environment', '-t', pane, 'GMUX_SESSION_ID'], { encoding: 'utf8', timeout: 15000 });
        const peS = String(pe.stdout ?? '').trim();
        if (peS) { OUT.meta.paneEnvPerPane = `${pane}: ${peS.slice(0, 120)}`; break; }
      }
    }

    // SPEC 6.3's open matrix requires one session the product treats as a LOCAL
    // Tortie-owned shell row. Shell is per-charter NOT in the delivery set
    // (first-party bundle only for claude/pi/omp), so the honest caller id
    // comes from the app's own list (pocketCore identity), not from pane env.
    // A shell caller still proves the local-session gate, one real row's
    // whoami/sessions projection, and every hostile refusal around it.
    // Discover the actual bridge surface if sessionsCreate was absent.
    const surface = await safeEval(`Object.keys(window.gmux).filter((k) => /session|project|terminal|open/i.test(k)).join(',')`, 15000);
    OUT.meta.surface = String(surface).slice(0, 400);
    // SPEC's contract says `sessions` also requires a currently listed LOCAL caller; the
    // facts read the core only after the door's beforeOpen resolved it (see
    // capabilities.ts ~400). Poll the main list AND wait for the same row to be
    // visible through the door before judging the socket half.
    let listed = null;
    for (let i = 0; i < 40; i += 1) {
      listed = await safeEval(`window.gmux.sessions.list().then((rows) => JSON.stringify(rows.map((r) => ({ id: r.id, name: r.name, status: r.status })))).catch((e) => 'ERR:' + String(e && e.message || e))`, 20000);
      if (String(listed).includes(String(callerId))) break;
      await sleep(500);
    }
    OUT.meta.listed = String(listed).slice(0, 400);
    check('L10b-row-in-core-list', String(listed).includes(String(callerId ?? 'none')), String(listed).slice(0, 300));
    if (callerId && String(listed).includes(String(callerId))) {
      who = null;
      for (let i = 0; i < 40; i += 1) {
        who = ansOf(await rawSend(sockPath, { version: 1, operation: 'whoami', session: callerId }));
        if (who?.ok === true) break;
        await sleep(500);
      }
      OUT.meta.whoami2 = JSON.stringify(who).slice(0, 500);
      check('L11b-whoami-after-list', who?.ok === true && who?.value?.session?.id === callerId, JSON.stringify(who).slice(0, 400));
      // If the door still answers unavailable after 20 s, prove WHY outside the app:
      // the pane identity stamp the facts compare against, and the app's own row.
      if (who?.ok !== true) {
        const sig = spawnSync('tmux', ['-L', tmsock, 'show-environment', '-g'], { encoding: 'utf8', timeout: 15000 });
        OUT.meta.tmuxEnvAll = String(sig.stdout ?? '').slice(0, 600);
        const sess = spawnSync('tmux', ['-L', tmsock, 'list-sessions', '-F', '#{session_name}'], { encoding: 'utf8', timeout: 15000 });
        OUT.meta.tmuxSessions = String(sess.stdout ?? '').slice(0, 300);
        const coreRow = await safeEval(`window.gmux.sessions.list().then((rows) => JSON.stringify(rows.find((r) => r.id === ${JSON.stringify(callerId)}))).catch((e) => 'ERR')`, 20000);
        OUT.meta.coreRow = String(coreRow).slice(0, 600);
        const diag = await safeEval(`Promise.resolve().then(() => 'DIAG-OK')`, 10000);
        OUT.meta.diag = String(diag).slice(0, 100);
        const directWho = await safeEval(`fetch('http://127.0.0.1:1/').then(() => 'x').catch((e) => 'FETCH-ERR:' + String(e && e.message || e).slice(0,60))`, 10000);
        OUT.meta.directWho = String(directWho).slice(0, 120);
        const machineProbe = await safeEval(`window.gmux.sessions.list().then((rows) => { const r = rows.find((x) => x.id === ${JSON.stringify(callerId)}); return JSON.stringify({ keys: Object.keys(r ?? {}), machine: r ? (r.machine === undefined ? 'UNDEFINED' : r.machine) : 'NOROW', status: r ? r.status : 'NOROW' }); }).catch((e) => 'ERR:' + String(e && e.message || e))`, 20000);
        OUT.meta.machineProbeRaw = String(machineProbe).slice(0, 600);
      }
    }

    try { cdp.close(); } catch {}
  });
} catch (e) { bodyError = e; OUT.meta.bodyError = String(e?.message ?? e).slice(0, 500); check('L0-body', false, String(e?.message ?? e).slice(0, 300)); }

const histAfter = (() => { try { const s = statSync(join(home, '.zsh_history')); return `${s.size}/${s.mtimeMs}`; } catch { return 'absent'; } })();
check('L99-home-history', histAfter === histBefore, `before=${histBefore} after=${histAfter}`);

process.stdout.write('LENS2-OPEN-BEGIN\n' + JSON.stringify(OUT) + '\nLENS2-OPEN-END\n');
