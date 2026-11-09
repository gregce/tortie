// Phase 363 stage B: the BUILT app with the adapter and the real shared dispatcher,
// in a fresh scratch profile. The sender is the probe-only self-send addon loaded
// into the app's main process through driver.cjs (NODE_OPTIONS); it sends only to
// the app's own pid. Compared against the agent socket, with the app's real state
// read independently (renderer bridge and a copy of the manifest).
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { hiddenAgentsBesides, writeHiddenAgents } from '../hidden-agents.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = JSON.stringify;

export async function runStageB(harnessDir, socket) {
  const base = join(harnessDir, 'p');
  const profile = join(base, 'u'), home = join(base, 'h'), cmdDir = join(base, 'cmd');
  const projA = join(base, 'proj-a'), projB = join(base, 'proj-b');
  for (const d of [profile, home, cmdDir, projA, projB, join(harnessDir, 'p', 'x')]) mkdirSync(d, { recursive: true });
  writeHiddenAgents(profile, 'p363', hiddenAgentsBesides([]));
  const env = withoutDevRenderer({
    HOME: home, ZDOTDIR: home, HISTFILE: '/dev/null', TERM_SESSION_ID: undefined,
    GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1', GMUX_LOG_FILE: '1', GMUX_SPECSTORY_NO_CLOUD: '1',
    GMUX_HARNESS_DIR: harnessDir, P363_MODE: 'product', P363_ROOT: ROOT, P363_CMD_DIR: cmdDir,
    NODE_OPTIONS: `--require=${join(ROOT, 'build/p363/driver.cjs')}`
  });
  const out = {};
  try {
    return await withElectron({
      label: 'p363-prod', userDataDir: profile, cwd: ROOT, tmuxSocket: socket,
      args: ['--remote-debugging-port=0', '--use-mock-keychain'], env, graceMs: 8000
    }, async () => {
      const win = await attachWindow(profile);
      const setSwitch = (on) => cdpEval(win, `window.gmux.settingsSet({ agentAccess: ${on ? 'true' : 'false'} }).then(() => true, (e) => String(e && e.message))`);
      out.switchOn = await setSwitch(true);
      for (let i = 0; i < 100 && !existsSync(join(profile, 'gmux', 'agent.sock')); i += 1) await sleep(100);
      await cdpEval(win, `window.gmux.projects.add(${J(projA)}).then((x) => x && x.path)`);
      const session = await cdpEval(win, `window.gmux.sessions.create(${J({ name: 'p363-caller', projectPath: projA, cwd: projA, agent: 'shell' })}).then((s) => s.id)`, 120000);
      out.session = typeof session === 'string' ? 'ok' : session;
      let n = 0;
      const sendEvent = async (event, text, kind = 'text') => {
        const f = `${String(n++).padStart(3, '0')}`;
        writeFileSync(join(cmdDir, `${f}.cmd.json`), J({ event, kind, text }));
        for (let i = 0; i < 200; i += 1) {
          const o = join(cmdDir, `${f}.out.json`);
          if (existsSync(o)) return JSON.parse(readFileSync(o, 'utf8'));
          await sleep(50);
        }
        throw new Error('self-send never answered');
      };
      const aeCall = async (req, { polls = 40 } = {}) => {
        const sub = await sendEvent('subm', typeof req === 'string' ? req : J(req));
        if (sub.code !== 0) return { submit: sub };
        let r = null;
        for (let i = 0; i < polls; i += 1) {
          r = await sendEvent('rslt', sub.body);
          if (JSON.parse(r.body).state !== 'pending') break;
          await sleep(100);
        }
        return { submit: sub, result: JSON.parse(r.body), id: sub.body };
      };
      const sock = (line) => new Promise((res, rej) => {
        const c = connect({ path: join(profile, 'gmux', 'agent.sock') });
        let buf = '';
        c.on('data', (d) => { buf += d; });
        c.on('end', () => res(JSON.parse(buf)));
        c.on('error', rej);
        c.write(line + '\n');
      });
      const req = (operation, extra = {}) => ({ version: 1, operation, session, ...extra });
      // 1. Same dispatcher: capabilities and whoami equal the socket's.
      for (const op of ['capabilities', 'whoami']) {
        const viaAe = await aeCall(req(op));
        const viaSock = await sock(J(req(op)));
        out[op] = { state: viaAe.result?.state, equalToSocket: J(viaAe.result?.response) === J(viaSock), ok: viaSock.ok };
      }
      // 2. Harmless side effect: open project B by path, then read the app's state independently.
      const projectsBefore = JSON.parse(await cdpEval(win, 'window.gmux.projects.list().then((l) => JSON.stringify(l.map((p) => p.path)))'));
      const open = await aeCall(req('open-project', { pathBase64: Buffer.from(projB).toString('base64') }));
      out.openProject = { state: open.result?.state, ok: open.result?.response?.ok, response: open.result?.response?.operation };
      const again = [];
      for (let i = 0; i < 3; i += 1) again.push((await sendEvent('rslt', open.id)).body);
      out.repeatedReadsIdentical = again.every((b) => b === again[0]);
      const projectsAfter = JSON.parse(await cdpEval(win, 'window.gmux.projects.list().then((l) => JSON.stringify(l.map((p) => p.path)))'));
      out.bridge = { before: projectsBefore.length, after: projectsAfter.length, hasB: projectsAfter.some((p) => p.endsWith('proj-b')) };
      const db = join(base, 'manifest-copy.db');
      for (const f of ['manifest.db', 'manifest.db-wal']) if (existsSync(join(profile, 'gmux', f))) copyFileSync(join(profile, 'gmux', f), db + f.slice('manifest.db'.length));
      const sq = spawnSync('/usr/bin/sqlite3', ['-readonly', db, "select count(*) from projects where path like '%proj-b'"], { encoding: 'utf8' });
      out.manifestProjB = sq.stdout.trim();
      // exactly one open-project execution: count the app's own report lines
      const logPath = join(profile, 'logs', 'app.log');
      const log = existsSync(logPath) ? readFileSync(logPath, 'utf8') : '';
      out.openProjectLogLines = log.split('\n').filter((l) => l.includes('agent access request finished') && l.includes('"open-project"')).length;
      // 3. Attacks, all through the one dispatcher or the native bounds.
      out.malformed = (await aeCall('{not json')).result?.response?.error?.code;
      out.endRemoved = (await aeCall(req('end'))).result?.response?.error?.code;
      out.fakeSession = (await aeCall({ version: 1, operation: 'whoami', session: 'not-a-session' })).result?.response?.error?.code;
      out.unknownId = (await sendEvent('rslt', 'ffffffffffffffffffffffffffffffff')).body;
      out.oversize = (await sendEvent('subm', 'x'.repeat(65537))).code;
      out.wrongKind = (await sendEvent('subm', '3', 'int')).code;
      // 4. Disabled switch: the dispatcher says disabled, the transport admits, nothing acts.
      out.logHasPayload = /p363-caller|proj-b/.test(log.split('\n').filter((l) => l.includes('agent access')).join('\n'));
      out.switchOff = await setSwitch(false);
      await sleep(500);
      const off = await aeCall(req('whoami'));
      out.disabled = { state: off.result?.state, code: off.result?.response?.error?.code, socketGone: !existsSync(join(profile, 'gmux', 'agent.sock')) };
      const projectsAfterOff = JSON.parse(await cdpEval(win, 'window.gmux.projects.list().then((l) => JSON.stringify(l.length))'));
      out.disabledNoAction = projectsAfterOff === projectsAfter.length;
      const offOpen = await aeCall(req('open-project', { pathBase64: Buffer.from(join(base, 'proj-c')).toString('base64') }));
      out.disabledOpenCode = offOpen.result?.response?.error?.code;
      return out;
    });
  } finally {
    rmSync(join(base, 'manifest-copy.db'), { force: true });
  }
}

const devtoolsPort = (profile) => {
  try { return Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim()); } catch { return 0; }
};
async function attachWindow(profile, timeoutMs = 120000) {
  const started = Date.now();
  for (;;) {
    const port = devtoolsPort(profile);
    if (port > 0) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
        const picked = pickRendererTarget(list);
        if (picked.target !== null) {
          const cdp = await wsConnect(picked.target.webSocketDebuggerUrl);
          await cdp.call('Runtime.enable');
          for (let i = 0; i < 200; i += 1) {
            if ((await cdpEval(cdp, "typeof window.gmux === 'object' && typeof window.gmux.sessions === 'object'")) === true) return cdp;
            await sleep(300);
          }
        }
      } catch { /* not up yet */ }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window');
    await sleep(300);
  }
}
void readdirSync;
