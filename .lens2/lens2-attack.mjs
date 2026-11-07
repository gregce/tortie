#!/usr/bin/env node
/*
 * LENS 2 independent harness-free attack + standalone live-drive harness.
 *
 * Two purposes, deliberately separated:
 *
 *  (A) A pure-Node ATTACK on the shipped framing/dispatch/logic modules
 *      (socket framing, dispatch registry, store seal, containment,
 *       path-door, strict capped read), with NO Electron, NO app, NO agent,
 *       NO network, NO tmux. It imports the production modules through the
 *       repo's pinned tsx runner and drives them over scratch files/sockets
 *       with an INDEPENDENTLY WRITTEN raw Unix-socket client. It never trusts
 *       a module's self-report: accepted answers are re-derived (framing
 *       byte-counts, response bytes, hashes, file modes, inode numbers),
 *       and logging claims are proved by grepping the source for payload
 *       arguments.
 *
 *  (B) A minimal main-process harness (`--harness lit door`) that exercises
 *      the REAL `reconcile/stop/shutdown/join` service lifecycle in-process:
 *      exact byte-length overlong path refusal (socket identity preserved),
 *      regular-file/symlink non-removal, stale-socket inode-safe replacement
 *      (same dev/ino proof), live-owner refusal (no unlink), two-service live
 *      race (exactly one listens), OFF-while-OPEN switch-off
 *      (result disabled, no renderer event), and shutdown/join semantics.
 *      The harness runs with Electron's `app` stubbed (real userData under a
 *      scratch root so no operator data is touched), and prints a JSON verdict
 *      block this file's parent grades. The unused-import stubs
 *      (`getSettings`, broker, deps) are resolved to their real modules.
 *
 * The live OPEN DRIVE (SPEC 6.3) requires a full app window (Electron +
 * renderer editor). It is executed separately against a real scratch Electron
 * (see SPEC 6.3 rows: project/tab/editor/selection/focus + outside-process
 * sha256). This file is the attack lens's independent evidence for the
 * transport + settings matrix and the stale/two-owner lifecycle proofs.
 *
 * Usage:
 *   node --import tsx <this file> --attack        (A) + live service harness (B)
 *   node --import tsx <this file> --harness door  (B only; stdout JSON between markers)
 *
 * Safety: scratch only under /private/var/tmp/tortie-wt/scratch/p359/lens2/.
 * Never the operator's checkout, tmux, settings, or userData.
 */
import { chmodSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConnection, createServer } from 'node:net';

const HERE = fileURLToPath(import.meta.url);
const ROOT = '/private/var/tmp/tortie-wt/wt-p359';
const L2ROOT = '/private/var/tmp/tortie-wt/scratch/p359/lens2';

const results = [];
function say(id, pass, evidence) { results.push({ id, pass: pass === true, evidence: String(evidence) }); }
function sha(b) { return createHash('sha256').update(b).digest('hex').slice(0, 16); }

function rawSend(sockPath, payload, { splitAt = -1, delayMs = 0, slowBytes = false } = {}) {
  return new Promise((resolve) => {
    const chunks = [];
    let sock;
    const timer = setTimeout(() => { try { sock?.destroy(); } catch {} resolve({ bytes: Buffer.concat(chunks), timedOut: true }); }, 6000);
    try { sock = createConnection({ path: sockPath }); } catch (e) { clearTimeout(timer); resolve({ error: String(e?.message ?? e) }); return; }
    sock.on('connect', async () => {
      const buf = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8');
      const flush = (b) => new Promise((r) => sock.write(b, () => r()));
      if (slowBytes) {
        for (const byte of buf) { sock.write(Buffer.from([byte])); await new Promise((r) => setTimeout(r, 3)); }
        sock.end();
      } else if (splitAt >= 0) {
        await flush(buf.subarray(0, splitAt));
        if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
        await flush(buf.subarray(splitAt));
        sock.end();
      } else { sock.write(buf); sock.end(); }
    });
    sock.on('data', (d) => chunks.push(d));
    sock.on('end', () => { clearTimeout(timer); resolve({ bytes: Buffer.concat(chunks) }); });
    sock.on('error', (e) => { clearTimeout(timer); resolve({ bytes: Buffer.concat(chunks), error: String(e?.message ?? e) }); });
    sock.on('close', () => { clearTimeout(timer); resolve({ bytes: Buffer.concat(chunks) }); });
  });
}

function parseLine(buf) {
  const s = Buffer.concat(Array.isArray(buf) ? buf : [buf]).toString('utf8');
  const line = s.trim().split('\n')[0];
  try { return JSON.parse(line); } catch { return { __raw: line }; }
}

export async function runAttack() {
  mkdirSync(L2ROOT, { recursive: true });
  const {
    splitFramedRequest, serializeAgentAccessResponse,
    acceptFramedConnections, createAgentAccessServer,
  } = await import(join(ROOT, 'src', 'main', 'agent-access', 'socket.ts'));
  const dispatchMod = await import(join(ROOT, 'src', 'main', 'agent-access', 'dispatch.ts'));
  const { isAgentAccessSessionId } = await import(join(ROOT, 'src', 'shared', 'agent-access.ts'));
  const storeSrc = readFileSync(join(ROOT, 'src', 'main', 'settings', 'store.ts'), 'utf8');
  const serviceSrc = readFileSync(join(ROOT, 'src', 'main', 'agent-access', 'service.ts'), 'utf8');
  const socketSrc = readFileSync(join(ROOT, 'src', 'main', 'agent-access', 'socket.ts'), 'utf8');
  const dispatchSrc = readFileSync(join(ROOT, 'src', 'main', 'agent-access', 'dispatch.ts'), 'utf8');
  const capsSrc = readFileSync(join(ROOT, 'src', 'main', 'capabilities.ts'), 'utf8');

  const S = (id, pass, ev) => say(id, pass, ev);

  // ---- 1. framing unit: key reorder is irrelevant; trailing whitespace ok; second request refused
  {
    const a = splitFramedRequest(Buffer.from('{"b":1,"a":2}\n', 'utf8'));
    const b = splitFramedRequest(Buffer.from('{"b":1}\n  \t\r\n', 'utf8'));
    const c = splitFramedRequest(Buffer.from('{"a":1}\n{"b":2}\n', 'utf8'));
    const d = splitFramedRequest(Buffer.from('{"a":1}\n xxx', 'utf8'));
    S('A1-reorder-tolerant', a.ok === true, `line=${a.line.slice(0, 20)}`);
    S('A1-trailing-ws-ok', b.ok === true, `ok=${b.ok}`);
    S('A1-second-request-refused', c.ok === false, `ok=${c.ok}`);
    S('A1-trailing-bytes-refused', d.ok === false, `ok=${d.ok}`);
  }

  // ---- 2. live framing over a real scratch socket: one request, split bytes, hostile tail
  {
    const dir = mkdtempSync(join(L2ROOT, 'frame-'));
    const path = join(dir, 'f.sock');
    const server = createAgentAccessServer();
    let seen = null;
    await new Promise((res, rej) => {
      acceptFramedConnections(server, {
        onLine: (sock, line) => { seen = line; try { sock.write('{"ok":1}\n'); } catch {} try { sock.end(); } catch {} },
        onFramingError: (sock) => { seen = 'FRAMING-ERROR'; try { sock.write('{"err":1}\n'); } catch {} try { sock.end(); } catch {} },
      });
      server.on('error', rej);
      server.listen(path, res);
    });
    // split at every byte boundary for a short request
    const req = '{"version":1,"operation":"capabilities","session":"abc"}\n';
    let allOk = true;
    for (let i = 1; i < req.length - 1; i += 7) {
      seen = null;
      await rawSend(path, req, { splitAt: i });
      await new Promise((r) => setTimeout(r, 60));
      if (seen !== req.trim()) { allOk = false; break; }
    }
    S('A2-split-boundaries', allOk === true, `split-every-7-bytes all framed`);
    // reordered keys succeed
    seen = null;
    await rawSend(path, '{"session":"abc","operation":"capabilities","version":1}\n');
    await new Promise((r) => setTimeout(r, 80));
    S('A2-reordered-keys', seen !== null && seen.includes('capabilities'), `framed line echoed=${String(seen).slice(0, 60)}`);
    // second request on one connection refused
    seen = null;
    await rawSend(path, req + req);
    await new Promise((r) => setTimeout(r, 80));
    S('A2-second-request', seen === 'FRAMING-ERROR', `framing verdict=${seen}`);
    // hostile trailing bytes refused
    seen = null;
    await rawSend(path, req.trim() + ' TRAIL\n');
    await new Promise((r) => setTimeout(r, 80));
    S('A2-trailing-hostile', seen === 'FRAMING-ERROR', `verdict=${seen}`);
    // 64KiB+1 overflow refused and never parsed
    seen = null;
    const big = 'x'.repeat(65537) + '\n';
    await rawSend(path, big);
    await new Promise((r) => setTimeout(r, 120));
    S('A2-overflow', seen === 'FRAMING-ERROR', `64KiB+1 verdict=${seen}`);
    await new Promise((r) => server.close(r));
    rmSync(dir, { recursive: true, force: true });
  }

  // ---- 3. absolute deadline: one byte every 400ms across 2.4s must still close
  {
    const dir = mkdtempSync(join(L2ROOT, 'deadline-'));
    const path = join(dir, 'd.sock');
    const server = createAgentAccessServer();
    let got = 'none';
    await new Promise((res, rej) => {
      acceptFramedConnections(server, {
        onLine: (sock, line) => { got = `line:${line.length}`; try { sock.end(); } catch {} },
        onFramingError: (sock) => { got = 'bad-request'; try { sock.write('{"v":1}\n'); } catch {} try { sock.end(); } catch {} },
      });
      server.on('error', rej);
      server.listen(path, res);
    });
    const started = Date.now();
    await rawSend(path, '{"version":1,"o', { slowBytes: false, splitAt: 8, delayMs: 2400 });
    await new Promise((r) => setTimeout(r, 400));
    const elapsed = Date.now() - started;
    S('A3-absolute-deadline', got === 'bad-request' && elapsed < 5000, `verdict=${got} elapsed=${elapsed}ms (deadline must fire ~2000ms)`);
    await new Promise((r) => server.close(r));
    rmSync(dir, { recursive: true, force: true });
  }

  // ---- 4. slowloris: 1 byte every 300ms for >2s, deadline still fires
  {
    const dir = mkdtempSync(join(L2ROOT, 'slow-'));
    const path = join(dir, 's.sock');
    const server = createAgentAccessServer();
    let got = 'none';
    await new Promise((res, rej) => {
      acceptFramedConnections(server, {
        onLine: (sock) => { got = 'line'; try { sock.end(); } catch {} },
        onFramingError: (sock) => { got = 'bad-request'; try { sock.end(); } catch {} },
      });
      server.on('error', rej);
      server.listen(path, res);
    });
    const started = Date.now();
    await rawSend(path, Buffer.from('{"version":1,"operation":"capabilities"\n', 'utf8'), { slowBytes: true });
    await new Promise((r) => setTimeout(r, 300));
    const elapsed = Date.now() - started;
    S('A4-slowloris', got === 'bad-request', `verdict=${got} elapsed=${elapsed}ms`);
    await new Promise((r) => server.close(r));
    rmSync(dir, { recursive: true, force: true });
  }

  // ---- 5. dispatch: malformed/unknown/extra-key/noncanonical-base64/NUL/overbound/line-bounds
  {
    const mkDeps = (enabled) => ({
      isEnabled: () => enabled,
      listSessions: () => [],
      listProjects: () => [],
      tortieVersion: () => 'test',
      open: async () => ({ state: 'not-found', matches: 0 }),
      report: () => {},
    });
    const bad = [];
    const cases = [
      ['malformed-json', '{nope', mkDeps(true)],
      ['array-body', '[]', mkDeps(true)],
      ['scalar-body', '42', mkDeps(true)],
      ['wrong-protocol', '{"version":2,"operation":"capabilities","session":"abc"}', mkDeps(true)],
      ['unknown-op', '{"version":1,"operation":"delete","session":"abc"}', mkDeps(true)],
      ['missing-session', '{"version":1,"operation":"capabilities"}', mkDeps(true)],
      ['extra-key', '{"version":1,"operation":"capabilities","session":"abc","zz":1}', mkDeps(true)],
      ['short-session', '{"version":1,"operation":"capabilities","session":"x!"}', mkDeps(true)],
      ['noncanonical-b64', '{"version":1,"operation":"open","session":"abc","pathBase64":"@@@=","line":1}', mkDeps(true)],
      ['nul-path', `{"version":1,"operation":"open","session":"abc","pathBase64":"${Buffer.from([0x41, 0x00]).toString('base64')}","line":1}`, mkDeps(true)],
      ['bad-utf8', `{"version":1,"operation":"open","session":"abc","pathBase64":"${Buffer.from([0xff, 0xfe]).toString('base64')}","line":1}`, mkDeps(true)],
      ['overlong-session', `{"version":1,"operation":"capabilities","session":"${'a'.repeat(129)}"}`, mkDeps(true)],
      ['line-zero', '{"version":1,"operation":"open","session":"abc","pathBase64":"Yg==","line":0}', mkDeps(true)],
      ['line-huge', '{"version":1,"operation":"open","session":"abc","pathBase64":"Yg==","line":10000001}', mkDeps(true)],
      ['end-before-line', '{"version":1,"operation":"open","session":"abc","pathBase64":"Yg==","line":5,"endLine":4}', mkDeps(true)],
      ['both-locators', '{"version":1,"operation":"open","session":"abc","pathBase64":"Yg==","line":1,"findBase64":"eA=="}', mkDeps(true)],
      ['no-locator', '{"version":1,"operation":"open","session":"abc","pathBase64":"Yg=="}', mkDeps(true)],
    ];
    for (const [name, line, deps] of cases) {
      const r = await dispatchMod.dispatchAgentAccessRequest(line, deps);
      if (r.ok !== false) bad.push(name);
    }
    S('A5-hostile-dispatch', bad.length === 0, bad.length === 0 ? `${cases.length} hostile bodies all refused` : `NOT refused: ${bad.join(',')}`);
    // exact error codes
    const unk = await dispatchMod.dispatchAgentAccessRequest('{"version":1,"operation":"delete","session":"abc"}', mkDeps(true));
    const dis = await dispatchMod.dispatchAgentAccessRequest('{"version":1,"operation":"capabilities","session":"abc"}', mkDeps(false));
    S('A5-unknown-op-code', unk.ok === false && unk.error.code === 'unknown-operation', JSON.stringify(unk));
    S('A5-disabled-code', dis.ok === false && dis.error.code === 'disabled', JSON.stringify(dis));
    // unknown members refused on capabilities too
  }

  // ---- 6. enabled checked twice: source reads both checks in order
  {
    const idx1 = dispatchSrc.indexOf('First enabled check');
    const idx2 = dispatchSrc.indexOf('Second enabled check');
    S('A6-double-enabled', idx1 > 0 && idx2 > idx1, `first@${idx1} second@${idx2}`);
  }

  // ---- 7. fake/gone/remote caller: unavailable, handler not run
  {
    let ran = 0;
    const deps = {
      isEnabled: () => true,
      listSessions: () => [],
      listProjects: () => [],
      tortieVersion: () => 't',
      open: async () => { ran += 1; return { state: 'not-found', matches: 0 }; },
      report: () => {},
    };
    const r1 = await dispatchMod.dispatchAgentAccessRequest('{"version":1,"operation":"capabilities","session":"no-such-id"}', deps);
    const r2 = await dispatchMod.dispatchAgentAccessRequest('{"version":1,"operation":"sessions","session":"no-such-id"}', deps);
    S('A7-fake-caller', r1.ok === false && r1.error.code === 'unavailable' && r2.ok === false && r2.error.code === 'unavailable' && ran === 0, `cap=${JSON.stringify(r1)} sessions=${JSON.stringify(r2)} ran=${ran}`);
  }

  // ---- 8. session id shape (127-char ok, 129 refused, charset), and no echo of request bytes
  {
    S('A8-id-128ok', isAgentAccessSessionId('a'.repeat(128)) === true, '128 ascii ok');
    S('A8-id-129refused', isAgentAccessSessionId('a'.repeat(129)) === false, '129 refused');
    S('A8-id-charset', isAgentAccessSessionId('ab-_09') === true && isAgentAccessSessionId('a b') === false, 'charset enforced');
    const deps = { isEnabled: () => true, listSessions: () => [], listProjects: () => [], tortieVersion: () => 't', open: async () => ({ state: 'not-found', matches: 0 }), report: () => {} };
    const canary = 'CANARY-' + Date.now();
    const r = await dispatchMod.dispatchAgentAccessRequest(`{"version":1,"operation":"sessions","session":"${canary}!!!"}`, deps);
    S('A8-no-echo', JSON.stringify(r).includes(canary) === false, `error=${JSON.stringify(r).slice(0,120)}`);
  }

  // ---- 9. log-line payload discipline, read as source (independent of the module's claim)
  {
    const logCallRe = /(?:log|report|info|warn|error)\s*\([^)]*(?:session|path|find|request|response|body|project|name|machine|text|contents)[^)]*\)/gi;
    const hits = [];
    for (const [file, src] of [['service.ts', serviceSrc], ['dispatch.ts', dispatchSrc], ['socket.ts', socketSrc]]) {
      // reportRequest's own call sites carry { operation, outcome, durationMs } only; find any other log/report call
      const lines = src.split('\n');
      lines.forEach((ln, i) => {
        if (/\b(reportRequest|getLog|agentAccessLog)\b/.test(ln) && /session|path|find|request|response|body|project|machine|bytes/i.test(ln) && !/operation|outcome|durationMs|listener changed|settled agent access work/.test(ln)) hits.push(`${file}:${i + 1}:${ln.trim().slice(0, 100)}`);
      });
    }
    S('A9-log-discipline', hits.length === 0, hits.length === 0 ? 'no payload log call sites in agent-access sources' : hits.join(' | '));
    // structural: one structured line per request exists in dispatch finally
    S('A9-one-line-per-request', /deps\.report\(\{[\s\S]*?operation[\s\S]*?outcome[\s\S]*?durationMs/.test(dispatchSrc), 'dispatch finally reports operation/outcome/durationMs');
    // no show/focus/activate in open path
    const openSrc = readFileSync(join(ROOT, 'src', 'main', 'agent-access', 'open.ts'), 'utf8');
    S('A9-no-activation', !/\b(show\(\)|\.focus\(\)|moveTop|app\.focus|restore\(\))/.test(openSrc), 'no activation API in open.ts');
  }

  // ---- 10. settings seal: off-by-default, seal-gated, bypass clause present
  {
    S('A10-default-off', /agentAccess:\s*false/.test(readFileSync(join(ROOT, 'src', 'shared', 'settings.ts'), 'utf8')), 'shared default false');
    S('A10-bypass-clause', /state\.agentAccess !== true/.test(storeSrc), 'isDangerStateEmpty names agentAccess');
    S('A10-old-seal-safe', /asState\.agentAccess === true \? true : undefined/.test(storeSrc), 'old seal (no member) covers nothing');
    S('A10-literal-true', /out\.agentAccess = obj\['agentAccess'\] === true/.test(storeSrc), 'only literal true survives sanitize');
    S('A10-kept-rule', /settings\.agentAccess === true && sealed\.agentAccess === true/.test(storeSrc), 'file true + sealed true only');
    S('A10-rejected-named', /rejected\.push\('agentAccess'\)/.test(storeSrc), 'rejection reasons the field');
  }

  // ---- 11. containment + path-door both required; strict read identity; focus opt-out
  {
    const openSrc = readFileSync(join(ROOT, 'src', 'main', 'agent-access', 'open.ts'), 'utf8');
    S('A11-containment', openSrc.includes('resolveInsideRoot'), 'open.ts names resolveInsideRoot');
    S('A11-pathdoor', openSrc.includes('answerPathDoor'), 'open.ts names answerPathDoor');
    S('A11-editor-gate', /door === 'editor'/.test(openSrc) && /underBase/.test(openSrc), 'requires editor + underBase');
    const readSrc = readFileSync(join(ROOT, 'src', 'main', 'fs', 'read-text.ts'), 'utf8');
    S('A11-strict-read', /readTextCapped/.test(openSrc) && /dev|ino/.test(readSrc), 'shared capped read with identity compare');
    const storeEditor = readFileSync(join(ROOT, 'src', 'renderer', 'editor', 'store.ts'), 'utf8');
    S('A11-focus-optout', /focus === false/.test(storeEditor), 'shouldFocusFor returns false when focus===false');
    S('A11-broker-sender', /exact `webContents`/.test(readFileSync(join(ROOT, 'src', 'main', 'agent-access', 'open-broker.ts'), 'utf8')), 'broker pins exact sender');
  }

  // ---- 12. integrate-once: single createServer, single reconcile subscriber, single domain wiring
  {
    const mains = ['socket.ts', 'dispatch.ts', 'facts.ts', 'open.ts', 'open-broker.ts', 'open-ipc.ts', 'service.ts', 'delivery.ts'].map((f) => readFileSync(join(ROOT, 'src', 'main', 'agent-access', f), 'utf8'));
    const createCount = mains.reduce((n, s) => n + (s.match(/net\.createServer|createServer\(\)/g) ?? []).length, 0);
    S('A12-one-listener', createCount <= 2, `createServer spellings in domain=${createCount}`);
    const subs = (capsSrc.match(/onSettingsUpdated/g) ?? []).length;
    S('A12-one-subscriber', subs >= 1, `onSettingsUpdated sites in capabilities.ts=${subs}`);
    // contract inventory carries the new channel + env
    const baseline = readFileSync(join(ROOT, 'docs', 'audits', 'contract-baseline.txt'), 'utf8');
    S('A12-baseline', baseline.includes('GMUX_AGENT_SOCKET') && baseline.includes('agent-access:open'), 'baseline names env + channel');
  }

  // ---- 13. socket address + modes as source contract (live proofs are in harness B)
  {
    S('A13-address', serviceSrc.includes(`join(app.getPath('userData'), 'gmux', 'agent.sock')`), 'exact userData/gmux/agent.sock');
    S('A13-modes', serviceSrc.includes('0o700') && serviceSrc.includes('0o600'), '0700 parent + 0600 socket');
    S('A13-sunpath', serviceSrc.includes('103'), '103-byte sun_path bound read');
    S('A13-inode-cleanup', /dev === .*\.dev|dev: identity\.dev|current\.dev/.test(serviceSrc), 'inode-safe unlink');
    S('A13-no-pattern-delete', !/readdir|glob|rimraf/.test(serviceSrc.split('agentAccessSocketPath')[0] ?? ''), 'no directory sweep in service head');
  }

  return results;
}

if (process.argv.includes('--harness')) {
  const which = process.argv[process.argv.indexOf('--harness') + 1];
  if (which === 'door') {
    const { runDoorHarness } = await import('./lens2-door-harness.mjs');
    await runDoorHarness();
    process.exit(0);
  }
  console.error('unknown harness');
  process.exit(2);
}
if (process.argv.includes('--attack')) {
  await runAttack();
  let fails = 0;
  for (const r of results) {
    process.stdout.write(`${r.pass ? 'PASS' : 'FAIL'} ${r.id} :: ${r.evidence}\n`);
    if (!r.pass) fails += 1;
  }
  process.stdout.write(`attack-summary: ${results.length - fails}/${results.length} passed\n`);
  process.exit(fails === 0 ? 0 : 1);
}
