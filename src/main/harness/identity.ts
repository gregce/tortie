/**
 * Identity smoke — GMUX_SMOKE=identity (Phase 12.7 F1/F2/F3 regression test).
 * Moved out of src/main/index.ts in Phase 42 stage 3, byte for byte.
 *
 * Names are mutable and reusable; ids are not. This harness stages the exact
 * sequence research 21 §6 reproduced against the live server — gmux renames
 * its own session, a FOREIGN session takes the freed name — and asserts that
 * gmux keeps its own session, ignores the stranger, and kills only what it
 * owns. It also asserts the F3 pane markers and the F2 signal record.
 *
 * Every session it creates is `zz-ident-` prefixed, and the only session it
 * kills that gmux did not create is the decoy this harness made itself.
 *
 * Run it through `npm run smoke:identity`, which hands Electron its OWN
 * --user-data-dir. Every harness here shares the user's live tmux socket
 * (research 21 §9.2), and a second gmux polling the SAME manifest will reap
 * this harness's victim first — recording nothing if it is an older build,
 * which reads as a failure of code that is fine. A private manifest means
 * the other instance has no row for these sessions and leaves them alone.
 */

import { app } from 'electron';
import { homedir } from 'node:os';
import { stripAnsi } from '../restore';
import { getGmuxCore, shutdownGmuxCore } from '../sessions';
import * as tmux from '../tmux';
import { armWatchdog, smokeFail, smokeLog } from './support';

const SMOKE_IDENT = 'zz-ident';

/** Is `name` a leftover from this harness (own sessions AND decoys)? */
const isIdentLeftover = (name: string): boolean => name.startsWith(SMOKE_IDENT);

export async function runSmokeIdentity(): Promise<void> {
  // Generous: step 8 waits out the 1 Hz reaper before it can conclude
  // anything, and five real sessions are created along the way.
  armWatchdog(90_000);
  const decoys: string[] = [];
  try {
    const core = await getGmuxCore();

    // Deterministic re-runs: clear rows and raw sessions from aborted runs.
    for (const rec of core.listSessionRecords()) {
      if (!isIdentLeftover(rec.name)) continue;
      if (rec.status !== 'exited' && rec.status !== 'restorable') {
        await core.killSession(rec.id).catch(() => undefined);
      }
      core.discardSession(rec.id);
    }
    for (const s of await tmux.listSessions().catch(() => [])) {
      if (isIdentLeftover(s.tmuxName)) {
        await tmux.killSession(s.sessionId).catch(() => undefined);
      }
    }
    smokeLog('1/9 core booted, prior zz-ident traces cleared');

    const home = homedir();
    const name = `${SMOKE_IDENT}-${process.pid}`;
    const session = await core.createSession({
      name,
      projectPath: home,
      cwd: home,
      agent: 'shell',
      // The pane ITSELF reports the markers it was given: macOS `ps` will not
      // print another process's environment, and tmux's own show-environment
      // proves only what tmux was told, not what the process received.
      extraArgs: [
        '-c',
        'echo "MARKERS[$GMUX_MANAGED][$GMUX_SESSION_ID]"; ' +
          'while true; do sleep 1; done'
      ]
    });
    const mine = (await tmux.listSessions()).find(
      (s) => s.tmuxName === session.tmuxName
    );
    if (!mine) throw new Error('created session is not in list-sessions');
    if (mine.gmuxId !== session.id) {
      throw new Error(
        `@gmux-id is "${mine.gmuxId ?? ''}", expected ${session.id}`
      );
    }
    smokeLog(`2/9 session created and stamped: ${mine.sessionId} @gmux-id ok`);

    // F3: the pane markers, read back out of tmux's session environment.
    const markedId = await tmux.getSessionEnv(mine.sessionId, 'GMUX_SESSION_ID');
    const managed = await tmux.getSessionEnv(mine.sessionId, 'GMUX_MANAGED');
    if (markedId !== session.id || managed !== '1') {
      throw new Error(
        `pane env markers missing: GMUX_SESSION_ID=${markedId ?? ''} ` +
          `GMUX_MANAGED=${managed ?? ''}`
      );
    }
    // The manifest row records the pane pid for post-mortems (F2).
    const created = core.listSessionRecords().find((r) => r.id === session.id);
    if (created?.panePid === undefined) {
      throw new Error('pane_pid was not captured at create');
    }
    // …and the markers must reach the PROCESS, not just tmux's idea of the
    // session environment — that is what makes a durable agent identifiable
    // to anyone who has its pid.
    const want = `MARKERS[1][${session.id}]`;
    let echoed = '';
    for (let i = 0; i < 20 && !echoed.includes(want); i++) {
      await new Promise((r) => setTimeout(r, 250));
      echoed = stripAnsi(await tmux.capturePane(mine.sessionId, 20));
    }
    if (!echoed.includes(want)) {
      throw new Error(
        `the pane process did not receive the GMUX_* markers: ` +
          `${echoed.trim().split('\n').slice(-2).join(' / ')}`
      );
    }
    smokeLog(
      `3/9 GMUX_MANAGED/GMUX_SESSION_ID in tmux and in the pane process; ` +
        `pane_pid ${created.panePid} recorded`
    );

    // Identity survives a rename gmux did not make.
    const moved = `${name}-moved`;
    await tmux.execTmux(['rename-session', '-t', mine.sessionId, moved]);
    await core.refresh();
    const afterRename = core.listSessionRecords().find((r) => r.id === session.id);
    if (afterRename?.status !== 'running' || afterRename.tmuxName !== moved) {
      throw new Error(
        `external rename disowned the row (status ${afterRename?.status}, ` +
          `tmux_name ${afterRename?.tmuxName ?? '?'})`
      );
    }
    smokeLog('4/9 external rename: row still claimed, tmux_name re-synced');

    // A FOREIGN session takes the freed name — the reproduced repro.
    const decoy = await tmux.createSession({
      displayName: name,
      cwd: home,
      argv: ['sleep', '600']
    });
    decoys.push(decoy.sessionId);
    if (decoy.tmuxName !== name) {
      throw new Error(`decoy did not take the freed name: ${decoy.tmuxName}`);
    }
    await core.refresh();
    const afterDecoy = core.listSessionRecords().find((r) => r.id === session.id);
    if (afterDecoy?.tmuxName !== moved) {
      throw new Error(
        `the name squatter was adopted: row now points at ${afterDecoy?.tmuxName ?? '?'}`
      );
    }
    smokeLog('5/9 name squatter NOT adopted; row still bound to its own $-id');

    // Kill through gmux: ours dies, the stranger lives.
    await core.killSession(session.id);
    const afterKill = await tmux.listSessions();
    if (afterKill.some((s) => s.sessionId === mine.sessionId)) {
      throw new Error('gmux failed to kill its own session');
    }
    if (!afterKill.some((s) => s.sessionId === decoy.sessionId)) {
      throw new Error('gmux killed a session it did not create — F1 REGRESSION');
    }
    smokeLog('6/9 kill hit only the owned session; the stranger survived');

    // A stale row (its session gone, its name held by the stranger) must go
    // restorable and take nothing with it.
    core.discardSession(session.id);
    const stale = await core.createSession({
      name: `${SMOKE_IDENT}-stale-${process.pid}`,
      projectPath: home,
      cwd: home,
      agent: 'shell',
      extraArgs: ['-c', 'while true; do sleep 1; done']
    });
    const staleLive = (await tmux.listSessions()).find(
      (s) => s.tmuxName === stale.tmuxName
    );
    if (!staleLive) throw new Error('stale-test session missing');
    await tmux.killSession(staleLive.sessionId); // out-of-band death
    const squatter = await tmux.createSession({
      displayName: stale.tmuxName,
      cwd: home,
      argv: ['sleep', '600']
    });
    decoys.push(squatter.sessionId);
    await core.refresh();
    const staleRow = core.listSessionRecords().find((r) => r.id === stale.id);
    if (staleRow?.status !== 'restorable') {
      throw new Error(`stale row is "${staleRow?.status}", expected restorable`);
    }
    if (!(await tmux.listSessions()).some((s) => s.sessionId === squatter.sessionId)) {
      throw new Error('reconcile killed the name squatter — F1 REGRESSION');
    }
    core.discardSession(stale.id);
    smokeLog('7/9 stale row → restorable, and nothing was killed');

    // F2: an external `kill -TERM` on a process that does NOT self-map the
    // signal. tmux reports an EMPTY exit status here — before this phase the
    // row recorded no cause at all and the UI said only "Session ended".
    const victim = await core.createSession({
      name: `${SMOKE_IDENT}-signal-${process.pid}`,
      projectPath: home,
      cwd: home,
      agent: 'shell',
      extraArgs: ['-c', 'exec sleep 600']
    });
    const victimRec = core.listSessionRecords().find((r) => r.id === victim.id);
    const victimPid = victimRec?.panePid;
    if (victimPid === undefined) throw new Error('no pane_pid for the signal test');
    process.kill(victimPid, 'SIGTERM');
    const deadline = Date.now() + 20_000;
    let reaped = core.listSessionRecords().find((r) => r.id === victim.id);
    while (reaped?.status !== 'exited' && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 500));
      reaped = core.listSessionRecords().find((r) => r.id === victim.id);
    }
    if (reaped?.status !== 'exited') {
      throw new Error('the killed session was never reaped');
    }
    if (reaped.exitSignal !== 'term') {
      throw new Error(
        `exit_signal is "${reaped.exitSignal ?? ''}" (exit_code ` +
          `${reaped.exitCode ?? '-'}), expected "term"`
      );
    }
    core.discardSession(victim.id);
    smokeLog('8/9 external SIGTERM recorded as exit_signal=term');

    for (const id of decoys.splice(0)) {
      await tmux.killSession(id).catch(() => undefined);
    }
    await shutdownGmuxCore();
    smokeLog('9/9 PASS (identity) — sessions bind by id, deaths name their cause');
    app.exit(0);
  } catch (err) {
    for (const id of decoys) {
      await tmux.killSession(id).catch(() => undefined);
    }
    smokeFail(err);
  }
}
