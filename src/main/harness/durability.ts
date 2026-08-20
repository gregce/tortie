/**
 * The durability acceptance harnesses (Phase 42 stage 3, moved byte for byte
 * out of src/main/index.ts):
 *
 *  - GMUX_SMOKE=create   create durable 'smoke-keeper' session, assert term
 *                        bytes arrive in main, exit LEAVING IT RUNNING
 *  - GMUX_SMOKE=verify   assert smoke-keeper survived (tmux ls + manifest),
 *                        re-attach, receive bytes, kill it, exit 0
 *    (create → verify across two processes = the P1/T1 restart acceptance test)
 *  - GMUX_SMOKE=t3-prep / t3-verify  the T3 reboot-survival acceptance test
 *                        (FINAL-REPORT §2.4 Steps 2–3), detailed below.
 */

import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import type { ManifestSessionRecord } from '../manifest';
import { snapshotPath } from '../restore';
import { getGmuxCore, shutdownGmuxCore } from '../sessions';
import type { GmuxCore } from '../sessions';
import * as tmux from '../tmux';
import {
  armWatchdog,
  receiveTermBytes,
  smokeFail,
  smokeLog,
  waitForPaneText
} from './support';

const SMOKE_KEEPER = 'smoke-keeper';

/** GMUX_SMOKE=create — first half of the T1 restart acceptance test. */
export async function runSmokeCreate(): Promise<void> {
  armWatchdog(30_000);
  try {
    const core = await getGmuxCore();
    smokeLog('1/5 core booted: tmux server + manifest + control client + reconcile');

    // Deterministic re-runs: discard any smoke-keeper left by aborted runs.
    for (const rec of core.listSessionRecords()) {
      if (rec.name === SMOKE_KEEPER && rec.status !== 'exited') {
        await core.killSession(rec.id);
      }
      if (rec.name === SMOKE_KEEPER) core.discardSession(rec.id);
    }

    const home = homedir();
    const session = await core.createSession({
      name: SMOKE_KEEPER,
      projectPath: home,
      cwd: home,
      agent: 'shell',
      extraArgs: ['-c', 'while true; do date; sleep 1; done']
    });
    smokeLog(
      `2/5 session created: "${session.name}" (tmux ${session.tmuxName}, id ${session.id})`
    );

    const bytes = await receiveTermBytes(core, session.id);
    smokeLog(`3/5 term data flowing: ${bytes} bytes arrived in main`);

    smokeLog('4/5 detached — tmux session left RUNNING for the verify pass');
    await shutdownGmuxCore();
    smokeLog('5/5 PASS (create)');
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}

/** GMUX_SMOKE=verify — second half: the session must have SURVIVED. */
export async function runSmokeVerify(): Promise<void> {
  armWatchdog(30_000);
  try {
    const core = await getGmuxCore();
    smokeLog('1/6 core booted (fresh process — simulated app restart)');

    const live = await tmux.listSessions();
    const keeper = live.find((s) => s.tmuxName === SMOKE_KEEPER);
    if (!keeper) {
      throw new Error(
        `"${SMOKE_KEEPER}" missing from tmux list-sessions — T1 durability FAILED`
      );
    }
    smokeLog(`2/6 tmux still runs ${SMOKE_KEEPER} (${keeper.sessionId})`);

    const rec = core
      .listSessionRecords()
      .find((r) => r.name === SMOKE_KEEPER && r.status !== 'exited');
    if (!rec) throw new Error(`"${SMOKE_KEEPER}" missing from the manifest`);
    if (rec.status !== 'running') {
      throw new Error(
        `manifest status is "${rec.status}", expected "running" after reconcile`
      );
    }
    smokeLog(`3/6 manifest row reconciled to running (id ${rec.id})`);

    const bytes = await receiveTermBytes(core, rec.id);
    smokeLog(`4/6 re-attach works: ${bytes} bytes arrived in main`);

    await core.killSession(rec.id);
    const after = await tmux.listSessions();
    if (after.some((s) => s.tmuxName === SMOKE_KEEPER)) {
      throw new Error(`"${SMOKE_KEEPER}" still alive after kill`);
    }
    core.discardSession(rec.id);
    smokeLog('5/6 killed smoke-keeper; tmux and manifest both clean');

    await shutdownGmuxCore();
    smokeLog('6/6 PASS (verify) — T1 restart acceptance test complete');
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}

// ---------------------------------------------------------------------------
// T3 smoke — reboot-survival acceptance test (FINAL-REPORT §2.4 Steps 2–3)
//
//   GMUX_SMOKE=t3-prep    create a durable session with a known scrollback
//                         marker, plant a deterministic resume argv (a FAKE
//                         claude uuid — armed commands are typed, never run,
//                         so no real agent is involved), quit so the app-quit
//                         snapshot is written, leave the session running.
//   GMUX_SMOKE=t3-verify  kill ONLY that tmux session OUT-OF-BAND (simulating
//                         the reboot for that session), boot fresh, assert the
//                         manifest row shows 'restorable', restore it, and
//                         assert capture-pane shows BOTH the replayed marker
//                         and the armed resume command line.
// ---------------------------------------------------------------------------

const SMOKE_T3 = 'smoke-t3';
/**
 * The second T3 row, and the reason it exists: until Phase 13.5.1 the ONLY
 * restore this gate ever exercised was claude's, so "restore works" was a
 * claim about one tenth of the registry — the exact regression BACKLOG 13.5
 * item 6 was written to prevent, sitting uncovered inside the battery that
 * was supposed to prevent it. Nothing here launches a real agent: the pane is
 * a shell, the row is relabelled, and the planted argv is a pi one, because
 * what must not regress is that restore arms WHATEVER the manifest recorded
 * rather than something claude-shaped. (A real per-agent roundtrip is a
 * different, heavier test — `npm run conformance:resume`.)
 */
const SMOKE_T3_AGENT = 'smoke-t3-agent';
const T3_MARKER_RE = /GMUX-T3-MARKER-\d+/;

/** The two rows this gate restores, and the argv shape each must come back with. */
const T3_CASES: readonly { name: string; agent: string; argvRe: RegExp }[] = [
  { name: SMOKE_T3, agent: 'claude', argvRe: /^claude --resume / },
  { name: SMOKE_T3_AGENT, agent: 'pi', argvRe: /^pi --session-id / }
];

/** Kill + discard every prior smoke-t3 trace (manifest rows AND raw tmux). */
async function cleanupT3Leftovers(core: GmuxCore): Promise<void> {
  for (const rec of core.listSessionRecords()) {
    if (rec.name !== SMOKE_T3 && rec.name !== SMOKE_T3_AGENT) continue;
    if (rec.status !== 'exited' && rec.status !== 'restorable') {
      await core.killSession(rec.id).catch(() => undefined);
    }
    core.discardSession(rec.id);
  }
  // Raw leftovers from aborted runs (deduped names included).
  const live = await tmux.listSessions().catch(() => []);
  for (const s of live) {
    if (s.tmuxName === SMOKE_T3 || s.tmuxName.startsWith(`${SMOKE_T3}-`)) {
      await tmux.killSession(s.sessionId).catch(() => undefined);
    }
  }
}

/** GMUX_SMOKE=t3-prep — first half of the T3 acceptance test. */
export async function runSmokeT3Prep(): Promise<void> {
  // PHASE 111 raised this from 60 s. The prep now waits for each planted
  // marker to reach the pane, and each of those two waits may take 25 s. Boot
  // plus two creates measures about 5 s on this Mac, so the worst case is
  // about 55 s and the old ceiling left 5 s of room. A runner slow enough to
  // have produced this failure would have hit the watchdog first and printed
  // "60s watchdog expired", which says nothing, instead of the wait's own
  // message, which names the string that never arrived and prints the last 15
  // lines of the pane.
  armWatchdog(90_000);
  try {
    const core = await getGmuxCore();
    smokeLog('1/6 core booted');

    await cleanupT3Leftovers(core);
    smokeLog('2/6 prior smoke-t3 traces cleaned');

    const home = homedir();
    const planted: { id: string; marker: string }[] = [];
    for (const kase of T3_CASES) {
      const marker = `GMUX-T3-MARKER-${Date.now()}`;
      const session = await core.createSession({
        name: kase.name,
        projectPath: home,
        cwd: home,
        agent: 'shell',
        extraArgs: ['-c', `echo ${marker}; while true; do date; sleep 1; done`]
      });
      const bytes = await receiveTermBytes(core, session.id);
      // PHASE 111. THE BYTES ARE NOT THE MARKER. `receiveTermBytes` resolves on
      // the first %output chunk of any size, and that chunk is the attach
      // client redrawing the pane. It arrives whether the shell has printed or
      // not. Nothing may quit until the marker is really on the screen the
      // app-quit capture is about to read, or that capture reads an empty pane,
      // writes nothing, and the snapshot read below fails with ENOENT.
      await waitForPaneText(session.tmuxName, [marker], { label: kase.name });
      smokeLog(
        `3/6 ${kase.name} created: ${session.tmuxName} (${session.id}), ` +
          `${bytes} bytes of term data, marker on screen`
      );

      // The row is relabelled to the agent under test so restore takes that
      // agent's path (including the original-cwd guard), while the pane stays
      // a shell — no agent binary, no network, no first-run prompt.
      if (kase.agent !== 'shell') {
        core.manifest.updateSession(session.id, {
          agent: kase.agent as ManifestSessionRecord['agent']
        });
      }
      // Simulated agent id: restore ARMS this command without running it, so
      // a fake uuid exercises the full path with zero real-agent side effects.
      const fakeId = randomUUID();
      const resumeArgv =
        kase.agent === 'claude'
          ? ['claude', '--resume', fakeId]
          : ['pi', '--session-id', fakeId];
      core.manifest.setAgentSessionId(session.id, fakeId, resumeArgv);
      smokeLog(`4/6 armed resume argv planted (${resumeArgv.join(' ')})`);
      planted.push({ id: session.id, marker });
    }

    // Quit path writes the app-quit snapshot; prove it landed with content.
    await shutdownGmuxCore();
    for (const p of planted) {
      const snapText = await readFile(snapshotPath(p.id), 'utf8');
      if (!snapText.includes(p.marker)) {
        throw new Error(`app-quit snapshot ${p.id} missing the scrollback marker`);
      }
    }
    smokeLog(`5/6 ${planted.length} snapshots on disk, each with its marker`);
    smokeLog('6/6 PASS (t3-prep) — sessions left RUNNING');
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}

/**
 * One restored row, proven end to end: the manifest offers it, restore
 * recreates it, and the pane shows the replayed scrollback with the recorded
 * resume command TYPED but not run.
 */
async function verifyT3Case(
  core: GmuxCore,
  kase: (typeof T3_CASES)[number]
): Promise<string> {
  const rec = core
    .listSessionRecords()
    .find((r) => r.name === kase.name && r.status !== 'exited');
  if (!rec) throw new Error(`"${kase.name}" missing from the manifest`);
  if (rec.status !== 'restorable') {
    throw new Error(
      `${kase.name}: manifest status is "${rec.status}", expected ` +
        '"restorable" — the sidebar would not offer [Restore]'
    );
  }
  if (rec.agent !== kase.agent) {
    throw new Error(`${kase.name}: row agent is "${rec.agent}"`);
  }

  const marker = T3_MARKER_RE.exec(rec.argv.join(' '))?.[0];
  const armed = (rec.resumeArgv ?? []).join(' ');
  if (!marker) throw new Error(`${kase.name}: marker missing from recorded argv`);
  if (!kase.argvRe.test(armed)) {
    throw new Error(`${kase.name}: recorded resume argv wrong: "${armed}"`);
  }

  const restored = await core.restoreSession(rec.id);
  // Phase 19 item 6 changed what a restore may claim, and this gate changed
  // with it. The old assertion was `=== 'running'`, which is the exact word
  // the item removed: a restored pane holds a fresh shell at a prompt with
  // nothing executing, and that word was written just as loudly when every
  // stage had thrown. What the gate asserts now is the property that matters,
  // which is that the row is LIVE and carries a record of what came back.
  if (restored.status !== 'idle' && restored.status !== 'running') {
    throw new Error(
      `${kase.name}: restore left status "${restored.status}", expected a live one`
    );
  }
  if (restored.restore === undefined) {
    throw new Error(`${kase.name}: restore stored no record of what came back`);
  }
  if (restored.restore.kind !== 'armed') {
    throw new Error(
      `${kase.name}: restore recorded "${restored.restore.kind}", expected ` +
        '"armed" — this case plants a resume argv and a snapshot'
    );
  }
  if (restored.restore.replayFailure !== undefined) {
    throw new Error(
      `${kase.name}: the scrollback replay failed: ${restored.restore.replayFailure}`
    );
  }

  // Capture by immutable $-id: on tmux 3.6a capture-pane does NOT honor
  // the '=' exact-name prefix in target-pane resolution (verified).
  const restoredLive = (await tmux.listSessions()).find(
    (s) => s.tmuxName === restored.tmuxName
  );
  if (!restoredLive) {
    throw new Error(`restored session "${restored.tmuxName}" not in tmux ls`);
  }

  // The pane runs the user's real interactive shell; poll capture-pane
  // until the replayed marker AND the armed (typed, unexecuted) resume
  // command are both visible. Phase 111 moved this poll into
  // `waitForPaneText`, because the T3 prep needs the same wait and two copies
  // of it is how the prep ended up with none.
  const lastCapture = await waitForPaneText(
    restoredLive.sessionId,
    [marker, armed],
    { label: kase.name }
  );

  // The armed line must be TYPED, not executed — the fake uuid would have
  // errored loudly if the agent had actually run. Cheap negative check:
  if (/No conversation found|command not found|No project session/i.test(lastCapture)) {
    throw new Error(`${kase.name}: armed command appears to have EXECUTED`);
  }

  await core.killSession(rec.id);
  core.discardSession(rec.id);
  return armed;
}

/** GMUX_SMOKE=t3-verify — second half: restorable → restore → armed. */
export async function runSmokeT3Verify(): Promise<void> {
  armWatchdog(120_000);
  try {
    // OUT-OF-BAND kill BEFORE the core boots: the manifest never hears about
    // it — exactly the state a reboot leaves behind for these sessions.
    await tmux.ensureServer();
    const preLive = await tmux.listSessions();
    for (const kase of T3_CASES) {
      const keeper = preLive.find((s) => s.tmuxName === kase.name);
      if (!keeper) {
        throw new Error(
          `"${kase.name}" not running — run GMUX_SMOKE=t3-prep first`
        );
      }
      await tmux.killSession(keeper.sessionId);
    }
    smokeLog(
      `1/3 killed ${T3_CASES.length} sessions out-of-band (simulated reboot)`
    );

    const core = await getGmuxCore();
    smokeLog('2/3 core booted fresh — reconcile ran');

    for (const kase of T3_CASES) {
      const armed = await verifyT3Case(core, kase);
      smokeLog(
        `    ${kase.agent}: restorable → restored → pane shows replayed ` +
          `scrollback and the armed, unexecuted "${armed}"`
      );
    }

    await shutdownGmuxCore();
    smokeLog('3/3 PASS (t3-verify) — T3 reboot-restore acceptance test complete');
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}
