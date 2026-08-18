/**
 * GMUX_SMOKE=power — the sleep and wake handlers, driven in the real app.
 *
 * Phase 19 item 11, Tier 2. It proves the wiring end to end against a real
 * tmux session, a real snapshot on disk and a real renderer.
 *
 * WHAT IT CANNOT PROVE, and why that is the right trade. macOS delivers the
 * `suspend` and `resume` events, and the only way to make it deliver them is
 * to put the machine to sleep. That is not an acceptable thing to do to a
 * machine holding 43 live agent sessions, so the events are injected through
 * the same `PowerMonitorLike` seam the unit tests use. Everything after the
 * event is the real app: the capture writes a real file, the broadcast crosses
 * a real context bridge, and the renderer subscribes through the real preload.
 *
 * PHASE 77 added the second half of a suspend. The handler now takes a manifest
 * generation after the capture, so this harness reads the recovery ring before
 * the first suspend, fires four suspends in all, and prints the span the ring
 * covers afterwards. The ring holds five generations, so four suspends plus the
 * launch generation fill it exactly and the launch generation is still the
 * oldest record. A fifth suspend would prune it, and that is the cost decision 4
 * of the phase names.
 *
 * SAFETY. It refuses to run unless the profile is under GMUX_POWER_ROOT and
 * the tmux socket has been moved off the real one, both checked before a
 * single session is created. Its sessions are `zz-power` prefixed and are
 * killed by exact name.
 */

import { app, BrowserWindow } from 'electron';
import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  assertHarnessIsolation,
  teardownHarnessServer,
  type HarnessIsolation
} from '../harness/isolation';
import { readBackupIndex, type BackupCapsule } from '../manifest/recovery';
import type { RingTakeResult } from '../manifest/ring-schedule';
import { readCapsules, snapshotsDir } from '../restore/snapshots';
import { getGmuxCore } from '../sessions';
import { broadcastEvent } from '../typed-events';
import { EVT_POWER_RESUME } from '@shared/ipc';
import { installPowerHandlers, type PowerMonitorLike } from './index';

function log(line: string): void {
  console.log(`[gmux-power] ${line}`);
}

function emit(kind: string, payload: unknown): void {
  console.log(`[gmux-power] ${kind} ${JSON.stringify(payload)}`);
}

/** Refuse to run against anything the user owns. See ../harness/isolation. */
function assertIsolated(): HarnessIsolation {
  return assertHarnessIsolation('GMUX_POWER_ROOT');
}

/** A powerMonitor whose two events this harness fires by hand. */
function drivableMonitor(): PowerMonitorLike & {
  fire(event: 'suspend' | 'resume'): void;
} {
  const listeners = new Map<string, Set<() => void>>();
  return {
    on(event, listener) {
      const set = listeners.get(event) ?? new Set();
      set.add(listener);
      listeners.set(event, set);
      return this;
    },
    removeListener(event, listener) {
      listeners.get(event)?.delete(listener);
      return this;
    },
    fire(event) {
      for (const listener of [...(listeners.get(event) ?? [])]) listener();
    }
  };
}

const SESSION_NAME = 'zz-power-probe';

export async function runPowerSmoke(): Promise<void> {
  const watchdog = setTimeout(() => {
    console.error('[gmux-power] FAIL: 90s watchdog expired');
    app.exit(1);
  }, 90_000);
  watchdog.unref?.();

  let sessionId: string | null = null;
  // Set only once the isolation guard has PASSED. A guard that refuses must
  // leave the machine exactly as it found it, so the failure path below tears
  // nothing down until this is true. See ../harness/isolation.
  let isolated = false;
  try {
    const iso = assertIsolated();
    isolated = true;
    log(`start pid=${String(process.pid)} socket=-L ${iso.socket}`);

    // A real window, because the resume half has to cross the context bridge.
    const win = new BrowserWindow({
      width: 900,
      height: 600,
      show: false,
      webPreferences: {
        preload: `${app.getAppPath()}/out/preload/index.js`,
        contextIsolation: true,
        sandbox: false
      }
    });
    await win.loadURL('data:text/html,<title>power</title>');
    // Subscribe through the REAL preload bridge, exactly as TerminalPane does.
    const bridged = (await win.webContents.executeJavaScript(
      `(() => {
         window.__powerHits = 0;
         const sub = window.gmux && window.gmux.onPowerResume;
         if (typeof sub !== 'function') return 'no-bridge';
         sub(() => { window.__powerHits += 1; });
         return 'subscribed';
       })()`,
      true
    )) as string;
    emit('bridge', { result: bridged });
    if (bridged !== 'subscribed') {
      throw new Error(`preload does not expose onPowerResume (${bridged})`);
    }

    const core = await getGmuxCore();
    const home = homedir();
    // A line the pane prints once and then stays alive, so a snapshot can be
    // shown to be whole rather than merely non-empty.
    const marker = `GMUX-POWER-MARKER-${String(process.pid)}`;
    const session = await core.createSession({
      name: `${SESSION_NAME}-${String(process.pid)}`,
      projectPath: home,
      cwd: home,
      agent: 'shell',
      extraArgs: ['-c', `echo ${marker}; while true; do sleep 1; done`]
    });
    sessionId = session.id;
    log(`created session ${session.id}`);

    // Let the pane print, then reconcile. `snapshotAllSessions` captures only
    // panes it can prove are ours, and the map it proves that from is rebuilt
    // by reconcile, so a session created a moment ago is not in it yet.
    await new Promise((r) => setTimeout(r, 1_200));
    await core.refresh();

    // Remove every snapshot this session already has, so any file found below
    // can only be the one the suspend handler wrote.
    //
    // The check is a DIRECTORY LISTING rather than one known path on purpose.
    // Phase 19 item 3 is giving snapshots generation numbers in the same
    // round, so the filename is not this harness's business. What is its
    // business is that the suspend event produced a file holding the marker.
    const dir = snapshotsDir();
    const snapsFor = (): string[] => {
      try {
        return readdirSync(dir).filter((f) => f.includes(session.id));
      } catch {
        return [];
      }
    };
    for (const f of snapsFor()) rmSync(join(dir, f), { force: true });
    emit('before-suspend', {
      dir,
      files: snapsFor(),
      status: core.listSessions().find((s) => s.id === session.id)?.status
    });

    // --- the suspend half -----------------------------------------------
    const monitor = drivableMonitor();
    let resumeCalls = 0;
    // One holder rather than two `let`s, because both are written inside the
    // dependency below and read out here.
    const takes: { last: RingTakeResult | null; calls: number } = {
      last: null,
      calls: 0
    };
    const dispose = installPowerHandlers({
      captureAll: async () => {
        // The same argument the real suspend handler passes, so what this
        // harness proves is what the app does.
        await core.snapshotAllSessions('system-sleep');
      },
      // Phase 77. The same call the real suspend handler makes, for the same
      // reason as the line above it. The result is kept so the run can print
      // the generation number rather than only the outcome the handler reads.
      // Phase 73.1, row 19. The mapping is the one src/main/index.ts uses, byte
      // for byte, so this harness still proves what the app does.
      takeManifestGeneration: async () => {
        const result = await core.takeManifestGenerationOnSuspend();
        takes.last = result;
        takes.calls += 1;
        if (result === null) return 'unchanged';
        return result.ok ? 'taken' : 'failed';
      },
      onResume: () => {
        resumeCalls += 1;
        broadcastEvent(EVT_POWER_RESUME);
        core.scheduleRefresh();
      },
      monitor
    });

    /** The ring's records, oldest first. */
    const ringRecords = (): BackupCapsule[] =>
      [...readBackupIndex()].sort((a, b) => a.generation - b.generation);

    // What the boot left behind, read before any suspend so the span below can
    // be read against it. One `launch` record is the expected shape.
    const ringBefore = ringRecords();
    emit('ring-before', {
      records: ringBefore.length,
      reasons: ringBefore.map((c) => c.reason)
    });

    const suspendAt = Date.now();
    monitor.fire('suspend');
    // Wait for a file to appear rather than for a fixed delay.
    for (let i = 0; i < 60 && snapsFor().length === 0; i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
    const written = snapsFor();
    const body = written
      .map((f) => readFileSync(join(dir, f), 'utf8'))
      .join('\n');
    const captured = written.length > 0;
    // The capture must record WHY it ran. A sleep capture that says 'app-quit'
    // is a record Phase 20 cannot use, and both call sites were defaulting.
    const reason = readCapsules(session.id)[0]?.reason ?? null;
    emit('suspend', {
      snapshotsWritten: written,
      containsMarker: body.includes(marker),
      capsuleReason: reason,
      bytes: body.length,
      tookMs: Date.now() - suspendAt
    });

    // --- the manifest generation half (Phase 77) ---------------------------
    //
    // The take runs after the capture, so the file above can be on disk while
    // the take is still going. Wait for the take rather than for a delay.
    const waitForTake = async (before: number): Promise<void> => {
      for (let i = 0; i < 50 && takes.calls === before; i++) {
        await new Promise((r) => setTimeout(r, 100));
      }
      // One more turn, so the handler's own in-flight flag is clear before the
      // next suspend is fired. Without it a suspend fired too early is refused
      // with "a capture is already running" and this run would prove nothing.
      await new Promise((r) => setTimeout(r, 100));
    };
    await waitForTake(0);

    const ringAfterFirst = ringRecords();
    const firstGeneration = takes.last?.generation ?? null;
    const firstCapsule =
      firstGeneration === null
        ? undefined
        : ringAfterFirst.find((c) => c.generation === firstGeneration);
    emit('suspend-generation', {
      generation: firstGeneration,
      reason: firstCapsule?.reason ?? null,
      records: ringAfterFirst.length,
      ok: takes.last?.ok ?? false,
      detail: takes.last?.detail ?? null
    });

    // Three more suspends, four in all. Each one is preceded by a change to
    // the manifest, because the change test skips a take that would copy the
    // same bytes again, and a rename is the cheapest change this harness can
    // make. Each is awaited to completion before the next is fired.
    const probeName = `${SESSION_NAME}-${String(process.pid)}`;
    for (let round = 2; round <= 4; round++) {
      const before = takes.calls;
      await core.renameSession({
        sessionId: session.id,
        name: `${probeName}-${String(round)}`
      });
      monitor.fire('suspend');
      await waitForTake(before);
    }

    const span = ringRecords();
    const reasonsInRing = span.map((c) => c.reason);
    const oldest = span[0];
    const oldestPredatesSession =
      oldest !== undefined && oldest.capturedAt < session.createdAt;
    emit('ring-span', {
      takes: takes.calls,
      records: span.map((c) => ({
        generation: c.generation,
        reason: c.reason,
        takenAt: c.capturedAt
      })),
      reasons: reasonsInRing,
      sessionCreatedAt: session.createdAt,
      oldestPredatesSession
    });

    // --- the resume half --------------------------------------------------
    monitor.fire('resume');
    // One turn of the event loop is enough for an IPC send to land.
    await new Promise((r) => setTimeout(r, 300));
    const hits = (await win.webContents.executeJavaScript(
      'window.__powerHits',
      true
    )) as number;
    emit('resume', { mainHandlerRuns: resumeCalls, rendererEventsSeen: hits });

    dispose();
    // After dispose, neither event may reach anything.
    monitor.fire('suspend');
    monitor.fire('resume');
    await new Promise((r) => setTimeout(r, 200));
    const hitsAfter = (await win.webContents.executeJavaScript(
      'window.__powerHits',
      true
    )) as number;
    emit('after-dispose', {
      mainHandlerRuns: resumeCalls,
      rendererEventsSeen: hitsAfter
    });

    const pass =
      captured &&
      body.includes(marker) &&
      reason === 'system-sleep' &&
      resumeCalls === 1 &&
      hits === 1 &&
      hitsAfter === 1 &&
      // Phase 77. A suspend that captured but took no generation is the defect
      // this phase repaired, so the run fails when the ring holds no `suspend`
      // record, and it fails when four suspends have shortened the span the
      // ring covers past the session it was watching.
      reasonsInRing.includes('suspend') &&
      oldestPredatesSession;

    // Teardown: kill our own session by id, then the isolated server, then
    // remove the socket file the dead server leaves on disk. Asking tmux for
    // its own socket path first means the unlink can only ever reach the
    // socket this run created.
    await core.killSession(session.id).catch(() => undefined);
    sessionId = null;
    await teardownHarnessServer();

    log(pass ? 'PASS' : 'FAIL');
    app.exit(pass ? 0 : 1);
  } catch (err) {
    console.error(`[gmux-power] FAIL: ${(err as Error).message}`);
    // Nothing is torn down when the isolation guard is what threw. At that
    // point this process has proved nothing about which server it is talking
    // to, and the only safe action is none.
    if (isolated) {
      if (sessionId !== null) {
        const core = await getGmuxCore().catch(() => null);
        await core?.killSession(sessionId).catch(() => undefined);
      }
      await teardownHarnessServer().catch(() => undefined);
    }
    app.exit(1);
  }
}
