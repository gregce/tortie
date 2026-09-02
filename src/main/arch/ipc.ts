/**
 * The ONE `arch:*` registrar (Phase 63), called once from main process boot:
 *
 *     import { registerArchIpc } from './arch/ipc';
 *     registerArchIpc(ipcMain);
 *
 * and on quit:
 *
 *     await disposeArchIpc();
 *
 * Five channels since Phase 64, the map since Phase 160, and the one path in
 * since Phase 158. What is NOT here is still the point.
 *
 * SINCE PHASE 172 THIS FILE IS REGISTRATION AND DISPOSAL. The load, check,
 * last valid document and progress workflow lives in ./check-coordinator.ts,
 * the pass and repair trigger workflow lives in ./enrich-coordinator.ts, and
 * their narrow operations are injected here: the registrar owns the one
 * lazily opened store and hands both coordinators the same `archStore`, and
 * it hands the check coordinator the enrichment coordinator's `repairDrift`
 * so a finished check can hand its drift over without the two workflows
 * naming each other. Every channel name, payload, event and error text is
 * byte for byte what this file produced before the split.
 *
 * THREE CHANNELS WRITE `docs/arch/` SINCE PHASE 158, and no others: the seed,
 * the enrichment on a kept answer, and the accept button's baseline append.
 * All three write through the ONE writer module in ./enrich/write.ts, every
 * path a compiled name, and each write lands as an ordinary uncommitted
 * change in Source Control, per the operator's amendment. `baseline.json`
 * keeps the ArchUnit rule in its amended form: the enrichment pass can never
 * reach it, its validator refuses an answer carrying baseline content, and
 * the accept channel is its only writer, fired only by the person's own
 * button. An agent still cannot accept its own violation.
 *
 * ONE CHANNEL CAN START AN AGENT, being `arch:enrich`, and since Phase 159
 * one finished check can too, through the SAME runner, the same gate and the
 * same one shot spawn. The honest rule Phase 158 wrote into the backlog
 * holds here: Tortie never starts a process from configuration alone, and
 * never one the person has not confirmed in Settings. The confirm gate is
 * re-checked at the spawn, the spawn is the fold's one shot `runFold` and
 * nothing else, and a source change or a freshness number on its own still
 * starts nothing. What changed in Phase 159 is narrow and it is all in
 * `maybeRepairDrift` in ./enrich-coordinator.ts: a check that PUBLISHED a
 * broken promise or a part fallen behind, with an agent chosen and no
 * downgrade held for the settle window's second opinion, hands that drift to
 * the runner, which refuses on its own authority when nothing drifted, when
 * the fold's minimum interval has not passed, when the prompt is the one it
 * already answered, when a pass is in flight, or when the pass is suspended.
 * No timer, no poll and no watcher hook were added; the trigger rides the
 * check the watcher already coalesced. Beyond that the only processes this
 * directory can cause are the five fixed argv git calls in ./argv-guard.ts,
 * and no field of any contract file reaches any of their argv.
 *
 * There is no channel that sets a session's status, opens the manifest or
 * touches tmux, and `build/assert-import-boundaries.mjs` holds the wall that
 * keeps this directory from naming `main/manifest/`, `main/restore/` or
 * `main/context/`, plus the facade rule that keeps this file the one door
 * the rest of main may name.
 *
 * EVERYTHING EXPENSIVE IS LAZY. Registering these handlers opens no database,
 * starts no thread and spawns no git. The store opens on the first arch call
 * and the watcher subscription is armed with it, so a person who never opens
 * the arch view pays three `ipcMain.handle` calls and nothing else.
 */

import type { IpcMain } from 'electron';
import type { ArchCanvasStateResult, ArchCanvasWriteResult } from '@shared/ipc';
import { handle } from '../typed-ipc';
import { getLog } from '../log';
import { shutdownSharedSymbolPool } from '../symbols/shared-pool';
import { ArchStore, archRepoKey } from './db';
import { readArchModuleFiles, readArchModules } from './modules';
import { disarmArchWatch, startArchWatch, stopArchWatch } from './watch';

/**
 * The one thing the settings registrar needs from this domain (Phase 197
 * item 7): when `arch.enabled` flips off, every armed repository stops being
 * re-checked. Re-exported through this door rather than imported from
 * `./watch` directly, because build/assert-import-boundaries.mjs lets only
 * src/main/arch/ read that module.
 */
export { disarmArchWatch };
import { createArchCheckCoordinator } from './check-coordinator';
import { createArchEnrichCoordinator } from './enrich-coordinator';

/**
 * Scope "arch" (Phase 35's pattern). Every warning from this directory is one
 * record in `<userData>/logs/app.log`, because a check that quietly stops
 * running looks exactly like a project whose promises all hold.
 */
const archLog = getLog('arch');

let store: ArchStore | null = null;

/** The store, opened on the first call and closed by the ordered disposer. */
function archStore(): ArchStore {
  if (store === null) store = new ArchStore();
  return store;
}

/**
 * The two coordinators, made once at load. Making them starts nothing and
 * opens nothing: each holds its own small memory and takes the lazy store
 * accessor above. The enrichment coordinator comes first because the check
 * coordinator takes its `repairDrift` injected, which is the one hand off
 * between the two workflows.
 */
const enrichment = createArchEnrichCoordinator({ store: archStore });
const checks = createArchCheckCoordinator({
  store: archStore,
  repairDrift: enrichment.repairDrift
});

export function registerArchIpc(ipc: IpcMain): void {
  startArchWatch(async (repoPath, signal) => {
    await checks.runOneCheck(repoPath, signal);
  });

  handle(ipc, 'arch:load', async (_event, input) => checks.load(input));
  handle(ipc, 'arch:check', async (_event, input) => checks.check(input));
  handle(ipc, 'arch:skeleton', async (_event, input) =>
    enrichment.draftSkeleton(input)
  );
  // The composed scope (Phase 64). It composes text and hands it back. It
  // writes nothing, it starts no check, and IT TAKES NO SESSION ID: this
  // directory cannot name `main/manifest/`, so it could not decide where a
  // block goes even if it wanted to. That decision is the renderer's one
  // guard.
  handle(ipc, 'arch:composePayload', async (_event, input) =>
    checks.composePayload(input)
  );
  // The computed level 2 view (Phase 64). It runs no checker, writes nothing
  // to the database and composes no sixth argv: the one git call it makes is
  // `lsFilesCall()`, which is already one of the five in ./argv-guard.ts.
  handle(ipc, 'arch:modules', async (_event, input) =>
    readArchModules({ ...input, store: archStore() })
  );
  // The level 1 map of any repository, contract or none (Phase 160). It reads
  // the fact base the checkers already built, parses nothing, judges nothing
  // and writes nothing, and it NEVER waits for a scan: a repository whose
  // fact base is still cold answers with what exists plus a building flag,
  // and the arch:mapUpdated push follows when the scan lands.
  handle(ipc, 'arch:map', async (_event, input) => checks.map(input));
  // The drilled part (Phase 161): one level 1 box opened into its modules,
  // the crossing edges kept at the frame, and the strip's counts scoped, all
  // composed over the SAME fact base through the same envelope as arch:map.
  // It parses nothing, judges nothing, writes nothing and never waits for a
  // scan.
  handle(ipc, 'arch:mapPart', async (_event, input) => checks.mapPart(input));
  // The drilled module (Phase 161): the level 2 answer scoped to one computed
  // directory, through the SAME pure core and the same caps as arch:modules.
  handle(ipc, 'arch:moduleFiles', async (_event, input) =>
    readArchModuleFiles({ ...input, store: archStore() })
  );
  // The canvas (Phase 162): the camera and the kept layout, per repository
  // and per drill scope. All four channels touch ONLY `arch.db`, the
  // disposable database whose loss costs a re-layout: no git call, no scan,
  // no file under the person's repository, no session. An invalid value
  // refuses the whole write with the field named, never a partial merge.
  handle(ipc, 'arch:canvasState', async (_event, input) => {
    const { camera, positions } = archStore().canvasState(
      archRepoKey(input.cwd),
      input.scope
    );
    return {
      cwd: input.cwd,
      scope: input.scope,
      camera,
      positions
    } satisfies ArchCanvasStateResult;
  });
  handle(ipc, 'arch:setCamera', async (_event, input) =>
    canvasWrite(
      archStore().saveCamera(archRepoKey(input.cwd), input.scope, input.camera)
    )
  );
  handle(ipc, 'arch:setLayout', async (_event, input) =>
    canvasWrite(
      archStore().saveLayout(
        archRepoKey(input.cwd),
        input.scope,
        input.positions
      )
    )
  );
  handle(ipc, 'arch:clearLayout', async (_event, input) =>
    canvasWrite(archStore().clearLayout(archRepoKey(input.cwd), input.scope))
  );
  // The one path in (Phase 158). `arch:seed` writes the deterministic
  // skeleton through the one writer module. `arch:enrich` is the ONE channel
  // that can start an agent, and only a person's gesture reaches it: the
  // confirm gate is re-checked at the spawn and the spawn is the fold's.
  // `arch:passStatus` is a read. `arch:acceptDivergence` is the accept
  // button's own append, and it is the only code path that writes
  // baseline.json.
  handle(ipc, 'arch:seed', async (_event, input) => enrichment.seed(input));
  handle(ipc, 'arch:enrich', async (_event, input) => enrichment.enrich(input));
  handle(ipc, 'arch:passStatus', async (_event, input) =>
    enrichment.passStatus(input)
  );
  handle(ipc, 'arch:acceptDivergence', async (_event, input) =>
    enrichment.acceptDivergence(input)
  );
}

/**
 * A refused canvas write is an ANSWER, not an exception: the reason lands in
 * the log and travels back named, so a bad value from a drifted renderer
 * shows up in `app.log` instead of vanishing into a rejected promise.
 */
function canvasWrite(reason: string | null): ArchCanvasWriteResult {
  if (reason !== null) archLog.warn('canvas write refused', { reason });
  return { ok: reason === null, reason };
}

/**
 * Close the store, drop every watch, and end the shared parse workers.
 *
 * It never throws, because it runs inside the ordered disposer and a close that
 * fails on a quitting process leaves nothing to do. The pool shutdown is
 * idempotent and the symbols disposer calls it too, so whichever of the two
 * runs first is the one that ends the threads.
 */
export async function disposeArchIpc(): Promise<void> {
  stopArchWatch();
  checks.dispose();
  enrichment.dispose();
  await shutdownSharedSymbolPool();
  const open = store;
  store = null;
  if (open === null) return;
  try {
    open.close();
  } catch {
    // Nothing to do. The process is on its way out.
  }
}
