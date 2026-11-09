#!/usr/bin/env node
/**
 * probe:p363 — Phase 363's measurements. Verifiers only: it starts Electrons
 * (one at a time, each through build/electron-run.mjs's withElectron, on a
 * scratch profile under the harness directory and a gmux-p363 socket).
 *
 *   Stage A  the transport alone (measure-isolated.mjs): submit -> callback ->
 *            delayed result with self-targeted events, no product code.
 *   Stage B  the built app: the adapter and the real shared dispatcher,
 *            compared with the socket (stage-product.mjs).
 *
 * It requests no Automation consent and sends no event to any other process.
 *   npm run build && P363_WITH_SELF_SEND=1 node build/build-apple-events.mjs && npm run -s probe:p363
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron } from '../electron-run.mjs';
import { measureIsolated } from './measure-isolated.mjs';
import { runStageB } from './stage-product.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOCKET = (process.env.GMUX_TMUX_SOCKET ?? '').trim();
const HARNESS = (process.env.GMUX_HARNESS_DIR ?? '').trim();
if (!SOCKET.startsWith('gmux-p363') || HARNESS === '') {
  console.error('[p363] REFUSED. Run `npm run probe:p363`, which wraps this file in build/harness-socket.mjs.');
  process.exit(2);
}
void withElectron; // counted by gate:electron; stage B launches through it
const problems = [];
const check = (name, ok, got) => { if (!ok) problems.push(`${name}: ${JSON.stringify(got)}`); return ok; };

const raw = await measureIsolated(HARNESS, SOCKET);
let iso;
try { iso = JSON.parse(raw); } catch { console.error('[p363] stage A unreadable:', raw); process.exit(2); }
const body = (r) => { try { return JSON.parse(r.body); } catch { return null; } };
check('A submit returns id synchronously', iso.submit.code === 0 && /^[0-9a-f]{32}$/.test(iso.submit.body), iso.submit);
check('A pending right after submit', body(iso.pendingFirst)?.state === 'pending', iso.pendingFirst);
check('A completed after async work', body(iso.completed)?.state === 'completed' && body(iso.completed)?.response?.ok === true, iso.completed);
check('A repeated read is identical and runs nothing', iso.completedAgain.body === iso.completed.body && iso.callsAfterRepeat === 2, [iso.completedAgain, iso.callsAfterRepeat]);
check('A unknown id missing', body(iso.missing)?.state === 'missing', iso.missing);
check('A wrong descriptor kind refused', iso.wrongKindSubmit.code !== 0 && iso.wrongKindResult.code !== 0, [iso.wrongKindSubmit, iso.wrongKindResult]);
check('A empty and oversize refused, 64 KiB accepted', iso.empty.code !== 0 && iso.oversize.code !== 0 && iso.atCap === 0, [iso.empty, iso.oversize, iso.atCap]);
check('A expired reads missing, late complete ignored', body(iso.expiredRead)?.state === 'missing' && iso.lateCompleteIgnored, iso.expiredRead);
check('A capacity 16 admitted, 17th refused, none evicted', iso.capacity.admitted === 16 && iso.capacity.refusedCode !== 0 && body(iso.firstStillPending)?.state === 'pending', iso.capacity);
check('A shutdown refuses and clears', iso.afterShutdownSubmit.code !== 0 && iso.afterShutdownResult.code !== 0 && iso.afterShutdownJobs === 0, [iso.afterShutdownSubmit, iso.afterShutdownResult, iso.afterShutdownJobs]);
check('A main loop not blocked', iso.mainTicks > 20, iso.mainTicks);
check('A callback saw a live job', iso.dispatchedLiveAtCallback === true, iso.dispatchedLiveAtCallback);

let prod = null;
if (!process.argv.includes('--stage-a-only')) {
  prod = await runStageB(HARNESS, SOCKET);
  const j = JSON.stringify;
  check('B session created', prod.session === 'ok', prod.session);
  for (const op of ['capabilities', 'whoami']) check(`B ${op} equals socket`, prod[op]?.state === 'completed' && prod[op].equalToSocket && prod[op].ok === true, prod[op]);
  check('B open-project completed ok', prod.openProject?.state === 'completed' && prod.openProject.ok === true, prod.openProject);
  check('B repeated reads identical', prod.repeatedReadsIdentical === true, prod.repeatedReadsIdentical);
  check('B project added once (bridge+manifest)', prod.bridge?.hasB && prod.bridge.after === prod.bridge.before + 1 && prod.manifestProjB === '1', [prod.bridge, prod.manifestProjB]);
  check('B one execution, one report line', prod.openProjectLogLines === 1, prod.openProjectLogLines);
  check('B malformed -> bad-request', prod.malformed === 'bad-request', prod.malformed);
  check('B End removed -> unknown-operation', prod.endRemoved === 'unknown-operation', prod.endRemoved);
  check('B fake session refused', typeof prod.fakeSession === 'string', prod.fakeSession);
  check('B unknown id missing', j(prod.unknownId) === j('{"state":"missing"}'), prod.unknownId);
  check('B oversize / wrong kind refused', prod.oversize !== 0 && prod.wrongKind !== 0, [prod.oversize, prod.wrongKind]);
  check('B disabled: completed disabled, socket gone, nothing acts', prod.disabled?.state === 'completed' && prod.disabled.code === 'disabled' && prod.disabledOpenCode === 'disabled' && prod.disabledNoAction === true, [prod.disabled, prod.disabledOpenCode, prod.disabledNoAction]);
  check('B no payload in log', prod.logHasPayload === false, prod.logHasPayload);
}
mkdirSync(join(ROOT, 'out', 'p363'), { recursive: true });
writeFileSync(join(ROOT, 'out', 'p363', 'stage-a.json'), JSON.stringify({ iso, prod, problems }, null, 1));
for (const p of problems) console.error('[p363] FAIL ' + p);
console.log(`[p363] stages A+B ${problems.length === 0 ? 'PASS' : 'FAIL'} submitMs=${iso.submit.ms}`);
process.exit(problems.length === 0 ? 0 : 1);
