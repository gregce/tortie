/**
 * Process-identity harness — GMUX_SMOKE=procid (Phase 13.8).
 * Moved out of src/main/index.ts in Phase 42 stage 3, byte for byte.
 *
 * Prints what the OUTSIDE WORLD sees of this process, from inside it: the
 * name Electron thinks it has, the argv[0] `ps` will show, the executable
 * Activity Monitor reads its label from, and the gmux-owned process list the
 * diagnostics surface consumes. Strictly read-only — it never boots the
 * durable core, never creates or kills a session, and only ever asks tmux to
 * LIST. Safe to run against a machine full of the user's live work.
 *
 * Run it in both worlds; the answers are meant to differ:
 *   npm run smoke:procid
 *   GMUX_SMOKE=procid release/mac-arm64/gmux.app/Contents/MacOS/gmux
 */

import { app } from 'electron';
import { armWatchdog, smokeFail, smokeLog } from './support';

export async function runSmokeProcId(): Promise<void> {
  armWatchdog(20_000);
  try {
    const { listGmuxProcesses } = await import('../diagnostics/owned-processes');
    const { runGuarded } = await import('../proc/guarded');

    smokeLog(`app.getName()      ${app.getName()}`);
    smokeLog(`process.title      ${process.title}`);
    smokeLog(`app.isPackaged     ${String(app.isPackaged)}`);
    smokeLog(`process.execPath   ${process.execPath}`);

    // What `ps` says about US — comm= is the executable (what Activity
    // Monitor's name follows), command= is argv[0] (what pgrep -f matches).
    const self = await runGuarded(
      '/bin/ps',
      ['-p', String(process.pid), '-o', 'comm=,command='],
      { timeoutMs: 5_000 }
    );
    smokeLog(`ps -o comm,command ${self.stdout.trim()}`);

    const rows = await listGmuxProcesses();
    smokeLog(`owned processes    ${rows.length}`);
    for (const r of rows) {
      const mb = (r.rssBytes / (1024 * 1024)).toFixed(1);
      const where = r.sessionName !== undefined ? ` [${r.sessionName}]` : '';
      smokeLog(
        `  ${String(r.pid).padStart(6)} ${r.role.padEnd(14)} ${mb.padStart(7)} MB${where}  ${r.command.slice(0, 96)}`
      );
    }
    // Opt-in second half: run the boot reap this harness otherwise only
    // reports on, so the destructive path is executable and observable
    // WITHOUT starting a whole app. GMUX_PROCID_REAP=1.
    if (process.env['GMUX_PROCID_REAP'] === '1') {
      const { reapOrphanedTmuxClients } = await import('../proc/orphans');
      const before = rows.filter(
        (r) => r.role === 'orphan-client' || r.role === 'orphan-probe'
      ).length;
      const result = await reapOrphanedTmuxClients();
      smokeLog(
        `reap: ${before} stray process(es) before; found ${result.found.length} client(s) + ${result.probes.length} stranded probe(s), signalled ${result.signalled.length}${result.skipped !== undefined ? ` (skipped: ${result.skipped})` : ''}`
      );
      const after = (await listGmuxProcesses()).filter(
        (r) => r.role === 'orphan-client' || r.role === 'orphan-probe'
      ).length;
      smokeLog(`reap: ${after} stray process(es) after`);
    }

    smokeLog(
      process.env['GMUX_PROCID_REAP'] === '1'
        ? 'PASS (procid) — identity printed, strays cleared'
        : 'PASS (procid) — identity printed, nothing was signalled'
    );
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}
