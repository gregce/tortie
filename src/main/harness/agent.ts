/**
 * Agent-launch smoke — GMUX_SMOKE=agent (Phase 9.2 Bug A regression test).
 * Moved out of src/main/index.ts in Phase 42 stage 3, byte for byte.
 *
 * Creates a REAL agent session (GMUX_SMOKE_AGENT=claude|codex, default
 * claude) and asserts the whole Bug A fix chain: login-shell PATH injected
 * into the tmux server env, manifest argv[0] recorded ABSOLUTE, and the
 * pane alive with no "command not found" — then cleans up completely.
 */

import { app } from 'electron';
import { homedir } from 'node:os';
import { stripAnsi } from '../restore';
import { getGmuxCore, shutdownGmuxCore } from '../sessions';
import * as tmux from '../tmux';
import { armWatchdog, panePs, pgrepFull, smokeFail, smokeLog } from './support';

const SMOKE_AGENT_PREFIX = 'smoke-agent-';

export async function runSmokeAgent(): Promise<void> {
  armWatchdog(60_000);
  try {
    const agent =
      process.env['GMUX_SMOKE_AGENT'] === 'codex' ? 'codex' : 'claude';
    const core = await getGmuxCore();
    // PHASE 81 corrected this line. The core booting no longer means the login
    // shell PATH has been captured, because `ensureServer` starts that capture
    // and does not wait for it.
    smokeLog('1/7 core booted');

    // The server's global env must now carry the user's install dirs. Since
    // Phase 81 the write is chained on the install rather than awaited inside
    // the start loop, so this waits for the handle the supervisor exports.
    // Nothing in the product reads that value to decide anything.
    await tmux.serverPathPublished();
    const serverPath = await tmux.execTmux(['show-environment', '-g', 'PATH']);
    if (!/(\.local\/bin|homebrew)/.test(serverPath)) {
      throw new Error(`tmux server PATH not injected: ${serverPath.trim()}`);
    }
    smokeLog('2/7 tmux server global PATH carries user install dirs');

    // Deterministic re-runs: clear leftovers from aborted runs.
    for (const rec of core.listSessionRecords()) {
      if (!rec.name.startsWith(SMOKE_AGENT_PREFIX)) continue;
      if (rec.status !== 'exited' && rec.status !== 'restorable') {
        await core.killSession(rec.id).catch(() => undefined);
      }
      core.discardSession(rec.id);
    }

    const home = homedir();
    const session = await core.createSession({
      name: `${SMOKE_AGENT_PREFIX}${process.pid}`,
      projectPath: home,
      cwd: home,
      agent
    });
    // Bug A lives in the MANIFEST RECORD, not in the launch (Phase 12.7 F3):
    // restores must survive PATH drift, so argv/resume_argv stay absolute —
    // but the process itself is launched by bare name, asserted below.
    const rec = core.listSessionRecords().find((r) => r.id === session.id);
    if (!rec || rec.argv[0]?.startsWith('/') !== true) {
      throw new Error(
        `manifest argv[0] is not absolute: ${JSON.stringify(rec?.argv)}`
      );
    }
    if (agent === 'claude' && rec.resumeArgv?.[0] !== rec.argv[0]) {
      throw new Error(
        `resume argv[0] not absolute/matching: ${JSON.stringify(rec.resumeArgv)}`
      );
    }
    smokeLog(
      `3/7 ${agent} session recorded with absolute argv[0]=${rec.argv[0]}`
    );

    // Give the CLI a beat to boot (or die), then assert the pane survived.
    await new Promise((r) => setTimeout(r, 5_000));
    const live = (await tmux.listSessions()).find(
      (s) => s.tmuxName === session.tmuxName
    );
    const after = core.listSessionRecords().find((r) => r.id === session.id);
    if (!live || !after || after.status === 'exited') {
      throw new Error(
        `agent session died right after spawn (status ${after?.status}, ` +
          `exit ${after?.exitCode ?? '?'}) — Bug A regression`
      );
    }
    const paneState = await tmux.execTmux([
      'list-panes',
      '-t',
      live.sessionId,
      '-F',
      '#{pane_dead} #{pane_dead_status} #{pane_dead_signal}'
    ]);
    if (paneState.trim().startsWith('1')) {
      throw new Error(`pane is dead: ${paneState.trim()}`);
    }
    const capture = stripAnsi(await tmux.capturePane(live.sessionId, 200));
    if (/command not found/i.test(capture)) {
      throw new Error(
        `"command not found" in pane:\n${capture.slice(-500)}`
      );
    }
    smokeLog('4/7 pane alive after 5s — no "command not found", not dead');

    // F3 (research 21 §8): the RUNNING process must not carry the absolute
    // path, or `pkill -f "$(command -v <agent>)"` singles out exactly the
    // durable gmux session and misses every ephemeral copy of the agent.
    // The assertion is the real one — what `pgrep -f` (i.e. `pkill -f`)
    // matches — read-only, and never `pkill`.
    const pane = await panePs(live.sessionId);
    const abs = rec.argv[0] as string;
    if (pane.command.includes(abs)) {
      throw new Error(
        `pane process still launched by ABSOLUTE path — a pattern kill would ` +
          `hit this durable session and nothing else: ${pane.command}`
      );
    }
    const matched = await pgrepFull(abs);
    if (matched.includes(pane.pid)) {
      throw new Error(
        `pgrep -f "${abs}" matches this durable session (pid ${pane.pid})`
      );
    }
    smokeLog(
      `5/7 pane runs by bare name (${pane.command}); ` +
        `pgrep -f "${abs}" matched ${matched.length} process(es), none of them this one`
    );

    await core.killSession(session.id);
    core.discardSession(session.id);
    smokeLog('6/7 agent session killed + discarded (clean)');

    await shutdownGmuxCore();
    smokeLog('7/7 PASS (agent) — Bug A launch chain verified, argv[0] bare');
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}
