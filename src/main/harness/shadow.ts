/**
 * The bare-name invariant smoke — GMUX_SMOKE=shadow (Phase 49, Tier 3).
 *
 * WHAT IT PROVES, live, with two planted copies of one binary name. A session
 * created with a SHADOWED binary launches the file the manifest recorded, and
 * the spawn still uses the bare name (Phase 12.7 F3). The two claims pull in
 * opposite directions, which is why the smoke drives both in one run:
 *
 *  1. The captured login-shell PATH is made to begin with two scratch
 *     directories this harness owns, each holding an executable shim named
 *     `droid`. droid is chosen because its row has no identity substring, no
 *     envPassthrough, an empty extraProbeDirs, and a plain ['droid'] launch
 *     argv.
 *  2. A droid session is created. The manifest row must record the FIRST
 *     copy's absolute path, the pane's own printed $0 must resolve to that
 *     same file, and #{pane_start_command} must still begin with the bare
 *     name `droid`.
 *  3. The collect-all resolver, asked directly, must return the first copy
 *     then the second, and the detection scan's `shadowed` list must name the
 *     second copy.
 *
 * SAFETY. Everything runs inside the isolated profile and the isolated tmux
 * socket the runner provides. The stub shell displaces nothing: the real
 * process PATH still merges in behind the two scratch directories. The
 * operator's server on `-L gmux` is touched only by a read-only list-sessions
 * count, taken before and after, and the two counts must be equal. Only the
 * session this run created is killed.
 */

import { app } from 'electron';
import { execFile } from 'node:child_process';
import type { CreateSessionInput } from '@shared/types';
import { chmodSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { rescanAgents } from '../agents';
import { stripAnsi } from '../restore';
import { getGmuxCore, shutdownGmuxCore } from '../sessions';
import * as tmux from '../tmux';
// DIRECT import for the marker literal: the barrel does not carry it, and the
// stub shell below must print exactly what captureLoginShellPath parses.
import { PATH_MARKER } from '../tmux/resolve';
import { armWatchdog, smokeFail, smokeLog } from './support';

const SHADOW_PREFIX = 'smoke-shadow-';

/**
 * Sessions on the operator's real server, read-only. `list-sessions` starts
 * no server: when none is running it errors, and the count is 0.
 */
async function countOperatorSessions(): Promise<number> {
  const bin = tmux.getTmuxContext().bin;
  return new Promise((resolve) => {
    execFile(bin, ['-L', 'gmux', 'list-sessions'], (_err, stdout) => {
      resolve(stdout.split('\n').filter((l) => l.trim().length > 0).length);
    });
  });
}

/** One executable shim. Answers --version at once; otherwise prints $0 and stays alive. */
function writeShim(dir: string): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'droid');
  writeFileSync(
    path,
    '#!/bin/sh\n' +
      'if [ "$1" = "--version" ]; then\n' +
      '  echo "0.0.0-shadow"\n' +
      '  exit 0\n' +
      'fi\n' +
      'echo "SHIM RAN $0"\n' +
      'while :; do sleep 3600; done\n'
  );
  chmodSync(path, 0o755);
  return path;
}

export async function runSmokeShadow(): Promise<void> {
  // The detection scan probes every agent on the machine and two probes hit
  // shims; generous, because a slow machine must not turn a pass into a flake.
  armWatchdog(180_000);
  try {
    // 0. Isolation, refused before anything exists. The socket must not be
    // the real one, and the profile must be this harness's own scratch one.
    const socket = tmux.getTmuxContext().socket;
    if (socket === tmux.TMUX_SOCKET) {
      throw new Error(
        `tmux socket is "${socket}", the real one. Run through npm run smoke:t3:shadow.`
      );
    }
    const userData = app.getPath('userData');
    if (!basename(userData).includes('gmux-smoke-shadow')) {
      throw new Error(
        `userData ${userData} is not the shadow scratch profile. Refusing to run.`
      );
    }
    const operatorBefore = await countOperatorSessions();
    smokeLog(
      `1/8 isolated (socket ${socket}); operator server holds ${operatorBefore} session(s)`
    );

    // 1. Two copies of `droid`, and a stub shell that puts their directories
    // first on the captured login-shell PATH. The real process PATH still
    // merges in behind them, so nothing of the machine's own is displaced.
    const d1 = join(userData, 'shadow-bins', 'd1');
    const d2 = join(userData, 'shadow-bins', 'd2');
    const d1Droid = writeShim(d1);
    const d2Droid = writeShim(d2);
    // The stub answers ONLY the PATH probe, recognised by its marker in the
    // command string. Everything else is delegated to the real /bin/sh,
    // because tmux runs a one-word pane command through `$SHELL -c`, and a
    // stub that swallowed that call would close every pane at once with
    // exit 0. A live run proved exactly that before this case line existed.
    const stubShell = join(userData, 'shadow-shell.sh');
    writeFileSync(
      stubShell,
      '#!/bin/sh\n' +
        'case "$*" in\n' +
        `  *${PATH_MARKER}*)\n` +
        `    printf '${PATH_MARKER}%s${PATH_MARKER}' "${d1}:${d2}"\n` +
        '    exit 0\n' +
        '    ;;\n' +
        'esac\n' +
        'exec /bin/sh "$@"\n'
    );
    chmodSync(stubShell, 0o755);
    process.env['SHELL'] = stubShell;
    smokeLog(`2/8 two droid shims planted (${d1Droid}, ${d2Droid}); SHELL stubbed`);

    // 2. Boot. The PATH capture runs the stub shell, so every resolve below
    // sees D1 before D2.
    const core = await getGmuxCore();
    const userPath = await tmux.getUserPath();
    const dirs = userPath.split(':');
    if (dirs[0] !== d1 || dirs[1] !== d2) {
      throw new Error(
        `captured PATH does not begin with the scratch dirs: ${userPath.slice(0, 200)}`
      );
    }
    smokeLog('3/8 core booted; captured PATH begins D1:D2');

    // Deterministic re-runs: clear leftovers from aborted runs.
    for (const rec of core.listSessionRecords()) {
      if (!rec.name.startsWith(SHADOW_PREFIX)) continue;
      if (rec.status !== 'exited' && rec.status !== 'restorable') {
        await core.killSession(rec.id).catch(() => undefined);
      }
      core.discardSession(rec.id);
    }

    // 3. Create the droid session in a scratch project directory.
    const proj = join(userData, 'shadow-proj');
    mkdirSync(proj, { recursive: true });
    const session = await core.createSession({
      name: `${SHADOW_PREFIX}${process.pid}`,
      projectPath: proj,
      cwd: proj,
      // The wire type is still the frozen AgentKind trio; the resume
      // conformance harness carries the same cast for the same reason (see
      // the INTEGRATOR note in src/shared/types.ts).
      agent: 'droid' as CreateSessionInput['agent']
    });
    const rec = core.listSessionRecords().find((r) => r.id === session.id);
    if (rec === undefined) throw new Error('the created session has no manifest row');

    // 4. The manifest recorded the FIRST copy, absolutely, in both places.
    if (rec.argv[0] !== d1Droid) {
      throw new Error(
        `manifest argv[0] is ${JSON.stringify(rec.argv[0])}, expected ${d1Droid}`
      );
    }
    if (rec.agentContract?.bin !== d1Droid) {
      throw new Error(
        `contract bin is ${JSON.stringify(rec.agentContract?.bin)}, expected ${d1Droid}`
      );
    }
    smokeLog(`4/8 manifest row records the D1 copy absolutely (${d1Droid})`);

    // 5. The pane ran the file the manifest recorded: its own printed $0
    // resolves to the same file. Polled, because the shim needs a beat.
    const live = (await tmux.listSessions()).find(
      (s) => s.tmuxName === session.tmuxName
    );
    if (live === undefined) throw new Error('created session not in tmux list-sessions');
    let ranPath: string | null = null;
    for (let i = 0; i < 40 && ranPath === null; i++) {
      const text = stripAnsi(await tmux.capturePane(live.sessionId, 100));
      const m = /SHIM RAN (\S+)/.exec(text);
      if (m?.[1] !== undefined) ranPath = m[1];
      else await new Promise((r) => setTimeout(r, 250));
    }
    if (ranPath === null) throw new Error('the pane never printed SHIM RAN');
    if (realpathSync(ranPath) !== realpathSync(rec.argv[0] ?? '')) {
      throw new Error(
        `the pane ran ${ranPath}, not the file the manifest recorded (${rec.argv[0]})`
      );
    }
    smokeLog(`5/8 the pane ran the recorded file ($0 = ${ranPath})`);

    // 6. F3 still holds: the spawn used the bare name.
    const startCommand = (
      await tmux.execTmux([
        'list-panes',
        '-t',
        live.sessionId,
        '-F',
        '#{pane_start_command}'
      ])
    ).trim();
    if (!startCommand.startsWith('droid')) {
      throw new Error(
        `pane_start_command is ${JSON.stringify(startCommand)}, expected the bare name droid`
      );
    }
    smokeLog(`6/8 pane_start_command begins with the bare name (${startCommand})`);

    // 7. The collect-all resolver returns D1 then D2, and the scan's shadowed
    // list names the D2 copy with the version its probe answered.
    const hits = tmux.resolveBinaryAllAgainst('droid', userPath);
    if (hits[0] !== d1Droid || hits[1] !== d2Droid) {
      throw new Error(
        `collect-all resolver answered ${JSON.stringify(hits.slice(0, 3))}, expected D1 then D2`
      );
    }
    const scan = await rescanAgents();
    const row = scan.agents.find((a) => a.id === 'droid');
    if (row?.binPath !== d1Droid) {
      throw new Error(`scan row binPath is ${JSON.stringify(row?.binPath)}`);
    }
    const shadowEntry = (row.shadowed ?? []).find((s) => s.path === d2Droid);
    if (shadowEntry === undefined) {
      throw new Error(
        `scan row shadowed does not name the D2 copy: ${JSON.stringify(row.shadowed)}`
      );
    }
    if (shadowEntry.version !== '0.0.0-shadow') {
      throw new Error(
        `the shadowed copy's probed version is ${JSON.stringify(shadowEntry.version)}`
      );
    }
    smokeLog('7/8 collect-all answers D1 then D2; scan names the shadowed D2 copy');

    // 8. Clean up the one session this run created, and only it.
    await core.killSession(session.id);
    core.discardSession(session.id);
    await shutdownGmuxCore();
    const operatorAfter = await countOperatorSessions();
    if (operatorAfter !== operatorBefore) {
      throw new Error(
        `operator session count moved: ${operatorBefore} before, ${operatorAfter} after`
      );
    }
    smokeLog(
      `8/8 PASS (shadow) — the pane ran the recorded file, by bare name; operator count unchanged (${operatorAfter})`
    );
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}
