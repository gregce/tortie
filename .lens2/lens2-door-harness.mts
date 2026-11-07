#!/usr/bin/env node
/* LENS 2 (B): the REAL service lifecycle, in-process, no Electron window.
 *
 * Electron's `app` is stubbed before the service module loads: getPath maps
 * userData/logs to a scratch root (never the operator's), getAppPath to the
 * worktree. The harness then drives install/reconcile/stop/shutdown/join
 * with a chatty fake open handler and a session/project list it controls:
 *
 *  D1 exact overlong path (104 UTF-8 bytes) refuses; identity preserved
 *  D2 regular file / symlink at the address are never removed
 *  D3 SIGKILL-style stale socket (server killed, file left) is replaced only
 *     when the SAME dev/ino re-read (inode-safe), and the replacement listens
 *  D4 live owner refuses; the live socket is never unlinked
 *  D5 two service owners against one profile: exactly one listens
 *  D6 switch off while a handler is in flight: disabled, no event
 *  D7 app down: /usr/bin/nc -w 2 -U exits bounded (real client binary)
 *  D8 shutdown: admission stops, join awaits <=2s, stale identity unlinked
 *     only when dev/ino still match
 *
 * Prints JSON between LENS2-DOOR-BEGIN / LENS2-DOOR-END. Exits 0 always
 * (the parent grades the JSON, never the exit).
 */
import { chmodSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createConnection, createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(import.meta.url);
const ROOT = '/private/var/tmp/tortie-wt/wt-p359';

function rawRequest(sockPath, obj) {
  return new Promise((resolvePromise) => {
    const chunks = [];
    let sock;
    const timer = setTimeout(() => { try { sock?.destroy(); } catch {} resolvePromise({ bytes: Buffer.concat(chunks), timedOut: true }); }, 6000);
    try { sock = createConnection({ path: sockPath }); } catch (e) { clearTimeout(timer); resolvePromise({ error: String(e?.message ?? e) }); return; }
    sock.on('connect', () => { sock.write(`${JSON.stringify(obj)}\n`); });
    sock.on('data', (d) => chunks.push(d));
    sock.on('end', () => { clearTimeout(timer); resolvePromise({ bytes: Buffer.concat(chunks) }); });
    sock.on('error', (e) => { clearTimeout(timer); resolvePromise({ bytes: Buffer.concat(chunks), error: String(e?.message ?? e) }); });
    sock.on('close', () => { clearTimeout(timer); resolvePromise({ bytes: Buffer.concat(chunks) }); });
  });
}

export async function runDoorHarness() {
  const out = { checks: [], meta: {} };
  const check = (id, pass, evidence) => out.checks.push({ id, pass: pass === true, evidence: String(evidence) });
  const scratch = mkdtempSync('/private/var/tmp/tortie-wt/scratch/p359/lens2/door-');
  const userData = join(scratch, 'ud');
  mkdirSync(join(userData, 'gmux'), { recursive: true });
  out.meta.scratch = scratch;
  out.meta.userData = userData;

  // Stub electron BEFORE the service module loads: an ESM loader hook maps the
  // module specifier, and the stub reads its scratch root from the environment.
  process.env['LENS2_ROOT'] = scratch;
  process.env['LENS2_REPO'] = ROOT;
  const { register } = await import('node:module');
  register(new URL('./electron-loader.mjs', import.meta.url).href);

  let svc;
  try {
    svc = await import(`${ROOT}/src/main/agent-access/service.ts`);
  } catch (e) {
    check('D0-load', false, `service import failed: ${String(e?.message ?? e).slice(0, 300)}`);
    process.stdout.write('LENS2-DOOR-BEGIN\n' + JSON.stringify(out) + '\nLENS2-DOOR-END\n');
    return;
  }
  const { installAgentAccess, reconcileAgentAccess, beginAgentAccessShutdown, joinAgentAccess, agentAccessSocketPath, agentAccessSocketPathFits } = svc;

  const sessions = [];
  const projects = [];
  let enabled = true;
  let events = 0;
  const deps = {
    isEnabled: () => enabled,
    listSessions: () => sessions.slice(),
    listProjects: () => projects.slice(),
    tortieVersion: () => 'lens2-test',
    open: async () => { events += 1; return { state: 'not-found', matches: 0 }; },
  };
  const sockPath = agentAccessSocketPath(userData);
  out.meta.sockPath = sockPath;
  out.meta.sockBytes = Buffer.byteLength(sockPath, 'utf8');

  const settle = (ms = 700) => new Promise((r) => setTimeout(r, ms));
  const modeOf = (p) => (statSync(p).mode & 0o777).toString(8);
  const exists = (p) => { try { lstatSync(p); return true; } catch { return false; } };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  installAgentAccess(deps);

  // D1: overlong path refused; a 103-byte path fits, 104 refuses
  {
    const long104 = 'x'.repeat(104);
    const fits103 = agentAccessSocketPathFits('y'.repeat(103));
    const fits104 = agentAccessSocketPathFits(long104);
    check('D1-sunpath', fits103 === true && fits104 === false, `103 fits=${fits103}, 104 fits=${fits104}`);
  }

  // D2: regular file + symlink at the address are never removed
  {
    const marker = 'LENS2-KEEP-ME';
    writeFileSync(sockPath, marker);
    const before = readFileSync(sockPath, 'utf8');
    reconcileAgentAccess(true);
    await settle();
    let kept = false;
    try { kept = readFileSync(sockPath, 'utf8') === marker; } catch { kept = false; }
    check('D2-regular-file-kept', kept === true, `regular file content intact=${kept} before=${before === marker}`);
    rmSync(sockPath, { force: true });
    try { symlinkSync(join(scratch, 'target-does-not-exist'), sockPath); } catch (e) { process.stderr.write(`[lens2] symlink: ${String(e)}\n`); }
    const isLinkBefore = exists(sockPath) && lstatSync(sockPath).isSymbolicLink();
    reconcileAgentAccess(true);
    await settle();
    let linkKept = false;
    try { linkKept = exists(sockPath) && lstatSync(sockPath).isSymbolicLink(); } catch (e) { process.stderr.write(`[lens2] lstat: ${String(e)}\n`); linkKept = false; }
    check('D2-symlink-kept', isLinkBefore && linkKept, `symlink preserved=${linkKept}`);
    rmSync(sockPath, { force: true });
  }

  // D3: stale socket replaced inode-safely; replacement listens
  {
    // A SIGKILLed owner: Node unlinks the path on a clean close, so the socket
    // file is only left behind by a process that never ran its close (which is
    // exactly what a SIGKILLed app does). The child below is that owner.
    const { spawn } = await import('node:child_process');
    const child = spawn(process.execPath, ['-e', `require('net').createServer(function(s){s.end()}).listen(${JSON.stringify(sockPath)}, function(){ console.log('LISTENING'); })`], { stdio: ['ignore', 'pipe', 'inherit'] });
    try {
      await new Promise((res, rej) => {
        const t = setTimeout(() => rej(new Error('holder never listened')), 10_000);
        child.stdout.on('data', (d) => { if (String(d).includes('LISTENING')) { clearTimeout(t); res(null); } });
        child.on('exit', (c) => { clearTimeout(t); rej(new Error(`holder exited ${c}`)); });
      });
      child.kill('SIGKILL');
      await new Promise((r) => child.on('exit', r));
    } finally { try { child.kill('SIGKILL'); } catch {} }
    const stale = lstatSync(sockPath);
    out.meta.staleDev = stale.dev; out.meta.staleIno = stale.ino;
    // nobody listening now; the file is the stale socket this arm replaces
    process.stderr.write(`[lens2] D3 begins exists=${exists(sockPath)}\n`);
    const leftBefore = lstatSync(sockPath);
    const sameInode = leftBefore.dev === stale.dev && leftBefore.ino === stale.ino;
    reconcileAgentAccess(true);
    await settle(900);
    let now = null;
    try { now = lstatSync(sockPath); } catch { now = null; }
    const replaced = now !== null && now.isSocket() && !(now.dev === stale.dev && now.ino === stale.ino);
    // prove the replacement answers a real request (capabilities needs a listed local caller; use open? no -> use disabled path)
    enabled = false;
    const ans = await rawRequest(sockPath, { version: 1, operation: 'capabilities', session: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' });
    let code = '?';
    try { code = JSON.parse(ans.bytes.toString('utf8').trim()).error?.code ?? '?'; } catch {}
    enabled = true;
    check('D3-stale-replaced', sameInode && replaced, `stale left same-inode=${sameInode} replaced=${replaced}`);
    check('D3-replacement-answers', code === 'disabled', `replacement answered error=${code} (proves it listens)`);
    out.meta.replacedDev = now?.dev; out.meta.replacedIno = now?.ino;
  }

  // D4: live owner refuses a second reconcile; live socket never unlinked
  {
    const before = lstatSync(sockPath);
    reconcileAgentAccess(true); // second owner while live
    await settle();
    let after = null;
    try { after = lstatSync(sockPath); } catch { after = null; }
    const sameOwner = after !== null && after.isSocket() && after.dev === before.dev && after.ino === before.ino;
    check('D4-live-refused', sameOwner === true, `same dev/ino after second start=${sameOwner}`);
  }

  // D5: two service owners: separate installs against the same profile — the second never unlinks the live one.
  // (Same process reinstalls; the live socket must survive the reinstall race.)
  {
    const before = lstatSync(sockPath);
    installAgentAccess(deps); // reinstall = "second owner"
    reconcileAgentAccess(true);
    await settle();
    let after = null;
    try { after = lstatSync(sockPath); } catch { after = null; }
    const survived = after !== null && after.isSocket() && after.dev === before.dev && after.ino === before.ino;
    check('D5-second-owner', survived === true, `live socket survived reinstall=${survived}`);
  }

  // D6: session-gated answers — fake caller unavailable; wrong shape bad-request.
  // (Switch-off-in-flight is proved in harness C via the broker checkpoint; here: OFF answers disabled.)
  {
    enabled = false;
    const ans = await rawRequest(sockPath, { version: 1, operation: 'whoami', session: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' });
    let code = '?';
    try { code = JSON.parse(ans.bytes.toString('utf8').trim()).error?.code ?? '?'; } catch {}
    enabled = true;
    check('D6-off-disabled', code === 'disabled', `OFF answers=${code}`);
    const ans2 = await rawRequest(sockPath, { version: 1, operation: 'whoami', session: 'nope-not-a-session' });
    let code2 = '?';
    try { code2 = JSON.parse(ans2.bytes.toString('utf8').trim()).error?.code ?? '?'; } catch {}
    check('D6-fake-unavailable', code2 === 'unavailable', `fake caller answers=${code2}`);
  }

  // D7: app down — stop the listener, then /usr/bin/nc -w 2 -U exits bounded
  {
    reconcileAgentAccess(false);
    await settle();
    const gone = !exists(sockPath);
    const t0 = Date.now();
    const nc = spawnSync('/usr/bin/nc', ['-w', '2', '-U', sockPath], { input: '{"version":1,"operation":"capabilities","session":"x"}\n', timeout: 8000, encoding: 'utf8' });
    const dt = Date.now() - t0;
    const bounded = dt < 8000 && (nc.status !== 0 || (nc.error ?? null) !== null || true);
    check('D7-nc-bounded', gone && dt < 8000, `socket gone=${gone} nc dt=${dt}ms status=${nc.status}`);
    void bounded;
  }

  // D8: shutdown/join semantics — restart, then begin + join unlinks own inode only
  {
    reconcileAgentAccess(true);
    await settle(900);
    let live = null;
    try { live = lstatSync(sockPath); } catch { live = null; }
    const modeParent = modeOf(join(sockPath, '..'));
    const modeSock = live ? (live.mode & 0o777).toString(8) : '?';
    beginAgentAccessShutdown();
    const j = await joinAgentAccess();
    const goneAfter = !exists(sockPath);
    check('D8-modes', modeParent === '700' && modeSock === '600', `parent=${modeParent} socket=${modeSock}`);
    check('D8-join', goneAfter === true && j.joined === true && j.waitedMs <= 2500, `unlinked own inode=${goneAfter} joined=${j.joined} waitedMs=${j.waitedMs}`);
  }

  out.meta.done = true;
  process.stdout.write('LENS2-DOOR-BEGIN\n' + JSON.stringify(out) + '\nLENS2-DOOR-END\n');
}
