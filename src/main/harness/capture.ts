/**
 * Capture smoke — GMUX_SMOKE=capture (Phase 15).
 * Moved out of src/main/index.ts in Phase 42 stage 3, byte for byte.
 *
 * The claim this harness exists to make executable: turning capture ON changes
 * WHO launches the agent and NOTHING ELSE the user depends on. It creates a
 * real captured agent session in a throwaway project and asserts, in order:
 *
 *   1. the manifest carries a capture record with the resolved binary, the
 *      provider, and the UNWRAPPED agent argv (the only non-lossy source for
 *      re-composing a wrap later);
 *   2. argv AND resume_argv are both stored WRAPPED — this is what makes a
 *      restored session keep capturing, and the resume's own id and flags are
 *      still inside the `-c` string where the agent will receive them;
 *   3. the pane is alive, running specstory, with the real agent as its child
 *      (capture that dies in the pane is the failure mode this whole phase is
 *      one flag away from);
 *   4. Phase 12.7 F3 survives the wrap: the AGENT's absolute path is not in
 *      the running command line, so `pkill -f "$(command -v claude)"` still
 *      cannot single out this durable session;
 *   5. `specstory run` really engaged — `.specstory/history` exists in the
 *      project directory that had none a moment ago;
 *   6. ending the session drains the session-end flush (the SIGHUP backstop)
 *      without a failure.
 *
 * Cloud is FORCED OFF here, by the harness rather than by the operator: this
 * creates real captured sessions, and a scratch session must never reach
 * anyone's SpecStory Cloud.
 */

import { app } from 'electron';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CreateSessionInput } from '@shared/types';
import { stripAnsi } from '../restore';
import { getGmuxCore, shutdownGmuxCore } from '../sessions';
// Phase 15 capture smoke: the resolver answers WHICH specstory a captured
// session should be running under, and unwrapArgv reads the inner command
// back out of a wrap for the assertion that the resume survived it.
import { resolveSpecstory, unwrapArgv } from '../specstory';
import * as tmux from '../tmux';
import {
  armWatchdog,
  panePs,
  pgrepFull,
  psChildren,
  smokeFail,
  smokeLog
} from './support';

const SMOKE_CAPTURE_PREFIX = 'smoke-capture-';

export async function runSmokeCapture(): Promise<void> {
  armWatchdog(120_000);
  let dir: string | null = null;
  try {
    process.env['GMUX_SPECSTORY_NO_CLOUD'] = '1';
    const agent = process.env['GMUX_SMOKE_AGENT'] ?? 'claude';
    const core = await getGmuxCore();
    smokeLog('1/8 core booted; cloud sync FORCED OFF for this harness');

    const { active } = await resolveSpecstory();
    if (active === null) {
      throw new Error(
        'no specstory binary resolved — run `npm run vendor:specstory` (bundled) ' +
          'or install the CLI'
      );
    }
    smokeLog(`2/8 specstory resolved: ${active.path} ${active.version ?? '?'} (${active.source})`);

    for (const rec of core.listSessionRecords()) {
      if (!rec.name.startsWith(SMOKE_CAPTURE_PREFIX)) continue;
      if (rec.status !== 'exited' && rec.status !== 'restorable') {
        await core.killSession(rec.id).catch(() => undefined);
      }
      core.discardSession(rec.id);
    }

    dir = mkdtempSync(join(tmpdir(), 'gmux-capture-smoke-'));
    const session = await core.createSession({
      name: `${SMOKE_CAPTURE_PREFIX}${process.pid}`,
      projectPath: dir,
      cwd: dir,
      agent: agent as CreateSessionInput['agent'],
      capture: true
    });

    const rec = core.listSessionRecords().find((r) => r.id === session.id);
    const cap = rec?.specstory;
    if (rec === undefined || cap === undefined || !cap.enabled) {
      throw new Error(
        `capture was requested and not recorded: ${JSON.stringify(rec?.specstory)}`
      );
    }
    if (cap.bin !== active.path || cap.agentArgv[0]?.startsWith('/') !== true) {
      throw new Error(
        `capture record is not restore-grade: ${JSON.stringify(cap)}`
      );
    }
    smokeLog(
      `3/8 manifest records capture: provider=${cap.provider} bin=${cap.bin} ` +
        `agentArgv[0]=${cap.agentArgv[0]} exitCodes=${cap.exitCodeFidelity}`
    );

    // (2) BOTH argvs wrapped — the resume is the one that matters after a
    // reboot, and its id and flags must still be inside the -c string.
    const wrappedLaunch = rec.argv[0] === active.path && rec.argv.includes('-c');
    if (!wrappedLaunch) {
      throw new Error(`launch argv is not wrapped: ${JSON.stringify(rec.argv)}`);
    }
    const resume = rec.resumeArgv;
    if (resume !== undefined && resume.length > 0) {
      if (resume[0] !== active.path || !resume.includes('-c')) {
        throw new Error(
          `resume argv is NOT wrapped — a restore would stop capturing: ${JSON.stringify(resume)}`
        );
      }
      const inner = unwrapArgv(resume);
      if (!inner.includes('--resume') && !inner.includes('resume')) {
        throw new Error(
          `wrapped resume lost its resume verb: ${JSON.stringify(inner)}`
        );
      }
      smokeLog(`4/8 resume argv wrapped, inner command intact: ${inner.join(' ')}`);
    } else {
      smokeLog('4/8 no pre-assigned resume argv for this agent (harvest arms it later)');
    }

    // (3) the pane, and the agent under the wrapper.
    await new Promise((r) => setTimeout(r, 6_000));
    const live = (await tmux.listSessions()).find(
      (s) => s.tmuxName === session.tmuxName
    );
    const after = core.listSessionRecords().find((r) => r.id === session.id);
    if (!live || !after || after.status === 'exited') {
      throw new Error(
        `captured session died right after spawn (status ${after?.status}, ` +
          `exit ${after?.exitCode ?? '?'}) — capture must never cost a launch`
      );
    }
    const paneText = stripAnsi(await tmux.capturePane(live.sessionId, 200));
    if (/command not found|not a valid provider|Update Available/i.test(paneText)) {
      throw new Error(`wrapper complained in the pane:\n${paneText.slice(-600)}`);
    }
    const pane = await panePs(live.sessionId);
    const children = await psChildren(pane.pid);
    if (!pane.command.includes('specstory')) {
      throw new Error(`pane process is not specstory: ${pane.command}`);
    }
    // The agent must be a REAL process under the wrapper, not merely the
    // provider word inside the wrapper's own command line — which is why the
    // match excludes any process that is itself a specstory.
    const agentProc = children.find(
      (c) => !c.includes('specstory') && c.includes(agent)
    );
    if (agentProc === undefined) {
      throw new Error(
        `no ${agent} process under the wrapper — capture swallowed the agent: ` +
          JSON.stringify(children)
      );
    }
    smokeLog(
      `5/8 pane alive: ${pane.command.slice(0, 80)} … → agent ${agentProc.slice(0, 70)}`
    );

    // (4) F3 under the wrap: the agent's ABSOLUTE path must not be greppable.
    const abs = cap.agentArgv[0] as string;
    const matched = await pgrepFull(abs);
    if (matched.includes(pane.pid)) {
      throw new Error(
        `pgrep -f "${abs}" matches this captured session (pid ${pane.pid}) — F3 lost to the wrap`
      );
    }
    smokeLog(`6/8 F3 holds under capture: pgrep -f "${abs}" does not match this pane`);

    // (5) specstory really engaged in THIS directory.
    const historyDir = join(dir, '.specstory', 'history');
    if (!existsSync(historyDir)) {
      throw new Error(
        `${historyDir} was never created — the wrapper did not start capturing`
      );
    }
    smokeLog('7/8 .specstory/history exists in the project — capture is live');

    // (6) the session-end flush drains.
    await core.killSession(session.id);
    await core.captureSyncsIdle();
    core.discardSession(session.id);

    await shutdownGmuxCore();
    smokeLog('8/8 PASS (capture) — wrapped launch, wrapped resume, live capture, flushed on end');
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  } finally {
    if (dir !== null) rmSync(dir, { recursive: true, force: true });
  }
}
