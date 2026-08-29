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
 * `maybeRepairDrift` below: a check that PUBLISHED a broken promise or a
 * part fallen behind, with an agent chosen and no downgrade held for the
 * settle window's second opinion, hands that drift to the runner, which
 * refuses on its own authority when nothing drifted, when the fold's minimum
 * interval has not passed, when the prompt is the one it already answered,
 * when a pass is in flight, or when the pass is suspended. No timer, no
 * poll and no watcher hook were added; the trigger rides the check the
 * watcher already coalesced. Beyond that the only processes this module can
 * cause are the five fixed argv git calls in `./argv-guard.ts`, and no field
 * of any contract file reaches any of their argv.
 *
 * There is no channel that sets a session's status, opens the manifest or
 * touches tmux, and `build/assert-import-boundaries.mjs` holds the wall that
 * keeps this directory from naming `main/manifest/`, `main/restore/` or
 * `main/context/`.
 *
 * EVERYTHING EXPENSIVE IS LAZY. Registering these handlers opens no database,
 * starts no thread and spawns no git. The store opens on the first arch call
 * and the watcher subscription is armed with it, so a person who never opens
 * the arch view pays three `ipcMain.handle` calls and nothing else.
 */

import type { IpcMain } from 'electron';
import type {
  ArchAcceptDivergenceInput,
  ArchAcceptDivergenceResult,
  ArchCanvasStateResult,
  ArchCanvasWriteResult,
  ArchCheckResult,
  ArchComposePayloadInput,
  ArchComposePayloadResult,
  ArchDraftFile,
  ArchEnrichInput,
  ArchEnrichResult,
  ArchLoadResult,
  ArchMapInput,
  ArchMapPartInput,
  ArchMapPartResult,
  ArchMapResult,
  ArchPassRunFace,
  ArchPassScope,
  ArchPassStatusResult,
  ArchPassTrigger,
  ArchRepoInput,
  ArchSeedResult,
  ArchSkeletonResult
} from '@shared/ipc';
import {
  EVT_ARCH_CHECKED,
  EVT_ARCH_MAP_UPDATED,
  EVT_ARCH_PASS,
  EVT_ARCH_PROGRESS
} from '@shared/ipc';
import type {
  ArchCoverageCounts,
  ArchDocument,
  ArchDrift,
  ArchFreshness,
  ArchVerdict,
  ArchVerdictChanges
} from '@shared/arch';
import { handle } from '../typed-ipc';
import { broadcastEvent } from '../typed-events';
import { getLog, logEvent } from '../log';
import { shutdownSharedSymbolPool } from '../symbols/shared-pool';
import { lsFilesCall, revParseHeadCall, type ArchGitCall } from './argv-guard';
import {
  countByCoverage,
  runCheckers,
  type ArchCheckerVerdict,
  type ArchFactBase
} from './checkers';
import {
  ARCH_SCANNED_NO_HEAD,
  ArchStore,
  archRepoKey,
  type ArchRepoState
} from './db';
import { createArchGitRunner, readLsFiles } from './git-facts';
import {
  createArchFileSystem,
  keepLastValid,
  loadArchDocument
} from './load';
import { composeArchMap, composeArchMapPart } from './map';
import type { ArchMapComposeInput, ArchMapPartVerdictFact } from './map';
import { readArchModuleFiles, readArchModules } from './modules';
import { gatherFacts } from './run';
import { scanArchImports } from './scan';
import { draftSkeleton as draftSkeletonBuffers } from './skeleton';
import {
  ArchPassRunner,
  type ArchPassChoice,
  type ArchPassInput,
  type ArchPassOutcome,
  type ArchPassRunRecord
} from './enrich/run';
import type { ArchEnrichImport } from './enrich/compose';
import { diffArchVerdicts, readArchDrift } from './enrich/drift';
import { driftFace, firstPartyPairs, repairSkipReason } from './repair-trigger';
import {
  appendAcceptedDivergence,
  planSkeletonWrite,
  writeArchFiles
} from './enrich/write';
import { getSettings } from '../settings/store';
import type { StoredArchPassRun } from './db';
import { composeArchPayload } from './payload';
import { readArchManifests } from './resolver/manifest';
import {
  ARCH_PROGRESS_THROTTLE_MS,
  applySettleWindow,
  requestArchCheck,
  startArchWatch,
  stopArchWatch,
  watchArchRepo
} from './watch';

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
 * The last document that loaded cleanly, per repository.
 *
 * A half written or conflicted file never blanks the view. The previous valid
 * contract keeps rendering under a banner naming the failure, which is the last
 * valid contract graft from research 49 section 4.9. It is memory only, so a
 * relaunch starts from whatever is on disk.
 */
const lastValid = new Map<string, ArchDocument>();

/** When each repository last had a progress message sent, for the throttle. */
const lastProgressAt = new Map<string, number>();

export function registerArchIpc(ipc: IpcMain): void {
  startArchWatch(async (repoPath, signal) => {
    await runOneCheck(repoPath, signal);
  });

  handle(ipc, 'arch:load', async (_event, input) => readArch(input));
  handle(ipc, 'arch:check', async (_event, input) => {
    const result = await runOneCheck(input.cwd, null);
    if (result !== null) return result;
    // A repository with no contract, or a run a newer one superseded. Neither
    // is an error, and both answer with what the store holds rather than
    // throwing at a view that has nothing better to draw.
    const loaded = await readArch(input);
    return {
      cwd: loaded.cwd,
      verdicts: loaded.verdicts,
      freshness: loaded.freshness,
      counts: loaded.counts,
      checkedAtCommit: loaded.checkedAtCommit ?? '',
      generation: 0,
      overBudget: null,
      durationMs: 0,
      drift: loaded.drift,
      changes: loaded.changes
    } satisfies ArchCheckResult;
  });
  handle(ipc, 'arch:skeleton', async (_event, input) => draftSkeleton(input));
  // The composed scope (Phase 64). It composes text and hands it back. It
  // writes nothing, it starts no check, and IT TAKES NO SESSION ID: this
  // directory cannot name `main/manifest/`, so it could not decide where a
  // block goes even if it wanted to. That decision is the renderer's one
  // guard.
  handle(ipc, 'arch:composePayload', async (_event, input) =>
    composePayload(input)
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
  handle(ipc, 'arch:map', async (_event, input) => readArchMap(input));
  // The drilled part (Phase 161): one level 1 box opened into its modules,
  // the crossing edges kept at the frame, and the strip's counts scoped, all
  // composed over the SAME fact base through the same envelope as arch:map.
  // It parses nothing, judges nothing, writes nothing and never waits for a
  // scan.
  handle(ipc, 'arch:mapPart', async (_event, input) => readArchMapPart(input));
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
  handle(ipc, 'arch:seed', async (_event, input) => seedContract(input));
  handle(ipc, 'arch:enrich', async (_event, input) => runEnrichPass(input));
  handle(ipc, 'arch:passStatus', async (_event, input) => passStatus(input));
  handle(ipc, 'arch:acceptDivergence', async (_event, input) =>
    acceptDivergence(input)
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
  lastValid.clear();
  lastProgressAt.clear();
  // The pass runner holds no timer and no child of its own: a pass in flight
  // is a runGuarded child, and reapGuardedChildren on before-quit ends it.
  passRunner = null;
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

// ---------------------------------------------------------------------------
// The read
// ---------------------------------------------------------------------------

/**
 * Read the contract and whatever the last completed check concluded.
 *
 * It starts no check and spawns nothing. Arming the watch here is what makes
 * the view live: from this moment a burst of file changes produces one
 * re-check, coalesced on the watcher's own window.
 *
 * THE LAUNCH CATCH UP is the one line below that compares the commit the stored
 * verdicts were computed at against the commit the repository is on now. Tortie
 * was closed while somebody rebased, so the honest answer is a re-check rather
 * than a replayed delta: a delta this build never recorded cannot be told apart
 * from no change at all, and reporting the second when it means the first is
 * exactly the false green this design refuses.
 */
async function readArch(input: ArchRepoInput): Promise<ArchLoadResult> {
  const repoPath = input.cwd;
  const armed = watchArchRepo(repoPath);
  const fresh = await loadArchDocument(createArchFileSystem(repoPath));
  const previous = lastValid.get(repoPath) ?? null;
  const document = keepLastValid(previous, fresh);
  const showingLastValid = fresh.contract === null && document.contract !== null;
  if (document.contract !== null && fresh.contract !== null) {
    lastValid.set(repoPath, document);
  }

  const db = archStore();
  const repoKey = archRepoKey(repoPath);
  const state = db.repoState(repoKey);
  const verdicts = db.verdicts(repoKey);
  const freshness = db.freshness(repoKey);

  if (armed && document.contract !== null) {
    // The FIRST load of this project in this session schedules one run, and
    // that one run is the launch catch up. Tortie was closed while somebody
    // rebased, pulled or switched branch, and the stored verdicts are about a
    // commit that is no longer HEAD. Comparing commits here would mean
    // spawning git on every load to decide whether to spawn git, and it would
    // still answer wrong for a working tree edited while the app was shut,
    // because nothing recorded that either.
    //
    // It is scheduled rather than awaited, so opening the view stays a
    // directory read, and it is coalesced with anything the watcher has
    // already asked for, so a project opened during a burst gets one run and
    // not two.
    requestArchCheck(repoPath);
  }

  return {
    cwd: repoPath,
    present: fresh.contract !== null || fresh.problems.length > 0,
    contract: document.contract,
    components: document.components,
    edges: document.edges,
    baseline: document.baseline,
    problems: fresh.problems,
    lastValid: showingLastValid,
    verdicts,
    freshness,
    counts: state.counts ?? emptyCounts(),
    checkedAtCommit: state.checkedAtCommit,
    // Tortie never calls a model, so this is a fact about what a person's own
    // agent did and never a thing Tortie can cause. Nothing writes it yet.
    narratedAtCommit: null,
    // Phase 159. The drift is counted here from the same rows the view
    // draws, and the last burst is read back rather than recomputed, so a
    // load never disagrees with the check that wrote them.
    drift: driftFace(readArchDrift(document, verdicts, freshness)),
    changes: db.verdictChanges(repoKey)
  };
}

function emptyCounts(): ArchCoverageCounts {
  return {
    checkedHold: 0,
    broke: 0,
    cannotCheck: 0,
    accepted: 0,
    unresolvedImports: 0,
    totalImports: 0
  };
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

/**
 * One check, end to end.
 *
 * It claims a generation before it starts and publishes under it in one
 * transaction. A run whose generation is no longer the newest throws its own
 * results away rather than writing them over a newer answer, and a run that was
 * cancelled publishes nothing at all. Both of those are what stop a slow read
 * of a half written tree from landing after the tree has settled.
 */
async function runOneCheck(
  repoPath: string,
  signal: AbortSignal | null
): Promise<ArchCheckResult | null> {
  const started = Date.now();
  const db = archStore();
  const repoKey = archRepoKey(repoPath);
  const before = db.repoState(repoKey);
  const document = keepLastValid(
    lastValid.get(repoPath) ?? null,
    await loadArchDocument(createArchFileSystem(repoPath))
  );
  if (document.contract === null) {
    // THE FACT-ONLY LEG (Phase 160). The map draws for any repository, so a
    // repository with no contract still gets its fact base built and kept
    // fresh here, through the SAME scanner and the same stamp table the
    // checker path reads. No checker runs, no verdict is composed, no
    // generation is claimed and nothing is published, so a contract added
    // later reuses every fact this leg wrote.
    await scanFactsOnly(repoPath, db, repoKey, before, signal);
    return null;
  }
  lastValid.set(repoPath, document);

  const generation = db.claimGeneration(repoKey, repoPath);
  const git = createArchGitRunner(repoPath);
  const record: ArchGitCall[] = [];
  let overBudget: string | null = null;
  let scannedFiles = 0;

  const facts = await gatherFacts({
    document,
    git,
    record,
    imports: async () => {
      // The scan wants the tracked list too. It composes the SAME fixed argv
      // through the same guard and records it, so every process this run
      // starts is still visible in one list.
      const call = lsFilesCall();
      record.push(call);
      const listed = await git.run(call);
      const trackedFiles = listed.code === 0 ? readLsFiles(listed.stdout) : [];
      const scan = await scanArchImports({
        repoPath,
        repoKey,
        store: db,
        trackedFiles,
        signal: signal ?? undefined,
        // The one time cold scan is EXEMPT from the incremental budget, per
        // research 49 fix 5, which found one budget over the whole 11,000 to
        // 50,000 file range contradicts itself.
        budgetMs: neverScannedAtACommit(before) ? null : 5_000,
        onProgress: (done, total) => publishProgress(repoPath, done, total)
      });
      if (scan.overBudget !== null) overBudget = scan.overBudget;
      scannedFiles = scan.parsed;
      return { imports: scan.imports, unparsed: scan.unparsed };
    }
  });
  if (facts === null) return null;
  if (signal?.aborted === true) return null;

  const run = runCheckers(facts);
  const checkedAtCommit = facts.headCommit;
  // The commit the fact base was scanned at is recorded only once the scan has
  // finished and the head is known, so a scan that was cancelled halfway leaves
  // the previous stamp and the next run reads the whole tree rather than
  // trusting a partial one.
  if (scannedFiles >= 0 && checkedAtCommit.length > 0) {
    db.markScanned(repoKey, repoPath, checkedAtCommit);
  }
  const firstCheck = before.checkedAtCommit === null;
  const verdicts = run.verdicts.map((verdict) =>
    toStoredVerdict(verdict, checkedAtCommit, generation, firstCheck, run.durationMs)
  );

  // The previous set is read ONCE, here, and handed to both readers: the
  // settle window that decides what this run may publish, and the diff that
  // says what moved (Phase 159). The store keeps no history, so this is the
  // only moment both sets exist.
  const previousVerdicts = db.verdicts(repoKey);
  const previousFreshness = db.freshness(repoKey);
  const settled = applySettleWindow(repoPath, previousVerdicts, verdicts);
  const freshness = freshnessRows(facts);
  const counts = countByCoverage(run.verdicts, facts);
  // The burst is stamped with the state read BEFORE this run claimed its
  // generation (`before`, above), because `claimGeneration` already moved the
  // row, and a first check has no check before it to diff against, so it
  // leaves no burst: every subject would read as new and the section would
  // draw one row per subject over nothing that moved.
  const changes = firstCheck
    ? null
    : stampChanges(
        diffArchVerdicts(previousVerdicts, settled.publish, previousFreshness, freshness),
        before,
        generation,
        checkedAtCommit
      );
  const published = db.publish({
    repoKey,
    repoPath,
    generation,
    checkedAtCommit,
    verdicts: settled.publish,
    freshness,
    counts,
    changes
  });
  if (!published) {
    // A newer run has already claimed the answer. Saying so is worth one line,
    // because a person watching a check that seems to do nothing deserves an
    // explanation in the log rather than silence.
    archLog.info('a check was superseded by a newer one', {
      repoPath,
      generation
    });
    return null;
  }

  const broke = settled.publish.filter(
    (v) => v.status === 'divergent' || v.status === 'absent'
  ).length;
  const unchecked = settled.publish.filter(
    (v) => v.coverage === 'unverifiable'
  ).length;
  broadcastEvent(EVT_ARCH_CHECKED, {
    cwd: repoPath,
    checkedAtCommit,
    generation,
    broke,
    unchecked
  });
  // The map listens too (Phase 160): a re-check moves the fact base and the
  // verdict colours riding the edges, and the map tab is not always the
  // surface that asked for the run.
  broadcastEvent(EVT_ARCH_MAP_UPDATED, {
    cwd: repoPath,
    scannedAtCommit: wireScannedAt(db.repoState(repoKey).scannedAtCommit)
  });

  // THE DRIFT TRIGGER (Phase 159). The drift is read once from what this
  // run published, answers the ribbon through `drift.count`, and is handed
  // to the runner only when an agent is chosen and nothing is held. It is
  // not awaited: the check is finished, and the pass is the runner's.
  const drift = readArchDrift(document, settled.publish, freshness);
  void maybeRepairDrift({
    repoPath,
    document,
    facts,
    held: settled.held,
    verdicts: settled.publish,
    freshness,
    drift
  });

  return {
    cwd: repoPath,
    verdicts: settled.publish,
    freshness,
    counts,
    checkedAtCommit,
    generation,
    overBudget,
    durationMs: Date.now() - started,
    drift: driftFace(drift),
    // Read back rather than returned as computed, so a check that moved
    // nothing answers with the last burst the store kept, the same answer a
    // load gives.
    changes: db.verdictChanges(repoKey)
  };
}

/**
 * Stamp a diff with the two generations and commits it sits between, or
 * null when nothing moved. A null keeps the store's last burst on screen,
 * which is the rule a quiet check follows. `prior` is the repository state
 * as it stood before this run claimed its generation.
 */
function stampChanges(
  diff: ReturnType<typeof diffArchVerdicts>,
  prior: ArchRepoState,
  generation: number,
  checkedAtCommit: string
): ArchVerdictChanges | null {
  if (diff.verdicts.length === 0 && diff.parts.length === 0) return null;
  return {
    ...diff,
    fromGeneration: prior.generation,
    toGeneration: generation,
    fromCommit: prior.checkedAtCommit,
    toCommit: checkedAtCommit,
    at: Date.now()
  };
}

/**
 * Build the fact base for a repository with no contract, and stop.
 *
 * The scanner, the budget rule and the progress push are the checker path's
 * own, so NO SECOND SCAN exists: `scanArchImports` stays the single scanner
 * and the stamp table is shared, which is what makes a contract added later
 * reuse everything this leg wrote. The repo-level scanned stamp is recorded
 * only when the scan finished whole, so a cancelled or over-budget pass leaves
 * `building` true and the next run reads the rest.
 */
async function scanFactsOnly(
  repoPath: string,
  db: ArchStore,
  repoKey: string,
  before: ArchRepoState,
  signal: AbortSignal | null
): Promise<void> {
  const git = createArchGitRunner(repoPath);
  const listed = await git.run(lsFilesCall());
  const trackedFiles = listed.code === 0 ? readLsFiles(listed.stdout) : [];
  const scan = await scanArchImports({
    repoPath,
    repoKey,
    store: db,
    trackedFiles,
    signal: signal ?? undefined,
    // The one time cold scan is EXEMPT from the incremental budget, the same
    // exemption the checker path carries from research 49 fix 5.
    budgetMs: neverScannedAtACommit(before) ? null : 5_000,
    onProgress: (done, total) => publishProgress(repoPath, done, total)
  });
  if (signal?.aborted === true) return;
  if (scan.overBudget === null) {
    const head = await git.run(revParseHeadCall());
    const headCommit =
      head.code === 0 ? head.stdout.toString('utf8').trim().slice(0, 40) : '';
    // A repository with no commits yet has no HEAD to name, and the whole of
    // it has still been read. The stamp is recorded either way, with the
    // no-head sentinel where no commit exists, because a stamp left null kept
    // `building` true forever and closed a loop: every `arch:mapUpdated`
    // push made the renderer re-read `arch:map`, whose building flag
    // scheduled the next scan, about thirty times a second until quit. The
    // first real commit moves the stamp to a real hash through this same
    // line.
    db.markScanned(
      repoKey,
      repoPath,
      headCommit.length > 0 ? headCommit : ARCH_SCANNED_NO_HEAD
    );
  }
  broadcastEvent(EVT_ARCH_MAP_UPDATED, {
    cwd: repoPath,
    scannedAtCommit: wireScannedAt(db.repoState(repoKey).scannedAtCommit)
  });
}

/**
 * Whether this repository has never had a completed scan over a real commit.
 *
 * The no-head stamp counts as never: it is what an empty repository wears, so
 * the first scan after its first real commit is still the cold scan and keeps
 * research 49 fix 5's budget exemption.
 */
function neverScannedAtACommit(state: ArchRepoState): boolean {
  return (
    state.scannedAtCommit === null ||
    state.scannedAtCommit === ARCH_SCANNED_NO_HEAD
  );
}

/**
 * The scanned stamp as the renderer may see it: a real commit or null. The
 * no-head sentinel is the store's own bookkeeping and never a commit, so it
 * does not travel.
 */
function wireScannedAt(scannedAtCommit: string | null): string | null {
  return scannedAtCommit === ARCH_SCANNED_NO_HEAD ? null : scannedAtCommit;
}

// ---------------------------------------------------------------------------
// The map (Phase 160)
// ---------------------------------------------------------------------------

/**
 * The level 1 map, composed from whatever the fact base holds RIGHT NOW.
 *
 * It never waits for a scan. The first open of a repository in this session
 * arms the watch and schedules one run, which is the full check when a
 * contract exists and the fact-only leg when none does, and the cold scan
 * lands as an `arch:mapUpdated` push rather than as a frozen pane. Every
 * later open is the warm path: one directory read, one fixed `git ls-files
 * -z`, and a pure compose over stored rows, measured in milliseconds.
 */
async function readArchMap(input: ArchMapInput): Promise<ArchMapResult> {
  const { envelope, compose } = await archMapReadFacts(input.cwd);
  return { ...envelope, ...composeArchMap(compose) };
}

/**
 * The one envelope both map reads share (extracted by the integrator, Phase
 * 161): arm the watch, schedule the coalesced catch up when the watch was
 * cold or the fact base is still owed, and gather the compose inputs from
 * the stored facts plus the one fixed `git ls-files -z`. It NEVER waits for
 * a scan.
 */
async function archMapReadFacts(repoPath: string): Promise<{
  envelope: { cwd: string; building: boolean; scannedAtCommit: string | null };
  compose: ArchMapComposeInput & {
    /**
     * The stored rows carry coverage and offences, which the SCOPED compose
     * needs to re-derive `accepted`; the level 1 compose reads the narrower
     * fact and the extra fields simply do not travel into its output.
     */
    verdicts: readonly ArchMapPartVerdictFact[];
  };
}> {
  const armed = watchArchRepo(repoPath);
  const db = archStore();
  const repoKey = archRepoKey(repoPath);
  const state = db.repoState(repoKey);
  const building = state.scannedAtCommit === null;
  // The launch catch up, the map's own: Tortie was closed while somebody
  // rebased, and the stored facts are about a tree that may have moved.
  // Scheduled rather than awaited, and coalesced with anything the watcher
  // already owes, so opening the map twice costs one run and not two.
  if (armed || building) requestArchCheck(repoPath);

  const fresh = await loadArchDocument(createArchFileSystem(repoPath));
  const document = keepLastValid(lastValid.get(repoPath) ?? null, fresh);
  if (document.contract !== null && fresh.contract !== null) {
    lastValid.set(repoPath, document);
  }
  const listed = await createArchGitRunner(repoPath).run(lsFilesCall());
  const trackedFiles = listed.code === 0 ? readLsFiles(listed.stdout) : [];
  const manifests = readArchManifests(repoPath);
  return {
    envelope: {
      cwd: repoPath,
      building,
      scannedAtCommit: wireScannedAt(state.scannedAtCommit)
    },
    compose: {
      subject:
        manifests.packageName ?? repoPath.split('/').pop() ?? 'this project',
      trackedFiles,
      imports: db.imports(repoKey),
      workspaces: [...manifests.workspaces.values()].map((w) => w.dir),
      document: document.contract === null ? null : document,
      verdicts: db.verdicts(repoKey)
    }
  };
}

/**
 * The drilled part, composed from whatever the fact base holds RIGHT NOW
 * (Phase 161).
 *
 * The same envelope as `readArchMap` above: it arms the watch, schedules the
 * coalesced catch up when the watch was cold or the fact base is still owed,
 * and NEVER waits for a scan. The level 1 partition is recomposed inside the
 * scoped compose from the same facts, which is what resolves the clicked
 * group id without any file list crossing the wire, and a group id the
 * current partition no longer holds answers `known: false` so the drill pops
 * rather than freezing.
 */
async function readArchMapPart(
  input: ArchMapPartInput
): Promise<ArchMapPartResult> {
  const { envelope, compose } = await archMapReadFacts(input.cwd);
  return {
    ...envelope,
    ...composeArchMapPart({ ...compose, groupId: input.groupId })
  };
}

/** One checker's verdict, stamped with the run it belongs to. */
function toStoredVerdict(
  verdict: ArchCheckerVerdict,
  checkedAtCommit: string,
  generation: number,
  firstCheck: boolean,
  durationMs: number
): ArchVerdict {
  return {
    subjectId: verdict.subjectId,
    status: verdict.status,
    coverage: verdict.coverage,
    ...(verdict.offending === undefined ? {} : { offending: verdict.offending }),
    checkedAtCommit,
    generation,
    // A first check renders as "not yet checked" and never as "changed". A
    // person opening a project for the first time has not broken anything.
    firstCheck,
    reason: verdict.reason,
    durationMs
  };
}

/** The freshness sentence's two numbers, per component. */
function freshnessRows(facts: ArchFactBase): ArchFreshness[] {
  return facts.components.map((component) => ({
    componentId: component.id,
    commitsBehind: facts.commitsBehind.get(component.id) ?? 0,
    uncommittedFiles: facts.uncommittedFiles.get(component.id) ?? 0
  }));
}

/** One progress message per repository per 120 ms, the symbols precedent. */
function publishProgress(repoPath: string, done: number, total: number): void {
  const now = Date.now();
  const last = lastProgressAt.get(repoPath) ?? 0;
  if (done < total && now - last < ARCH_PROGRESS_THROTTLE_MS) return;
  lastProgressAt.set(repoPath, now);
  broadcastEvent(EVT_ARCH_PROGRESS, { cwd: repoPath, done, total });
}

// ---------------------------------------------------------------------------
// The composed scope
// ---------------------------------------------------------------------------

/**
 * Compose one scope and hand back the bytes.
 *
 * IT DELIBERATELY DOES NOT GO THROUGH `readArch`. That function arms the watch
 * and schedules the launch catch up check, which is right when a person opens
 * the view and wrong when they press a chord inside a session: composing a
 * block is not a reason to start a git run. So this reads the contract, asks
 * for the tracked file list with the one fixed argv the anchors are matched
 * against, and takes everything else from what the last completed check
 * already wrote.
 *
 * The verdicts it carries are therefore as fresh as the last check and no
 * fresher, which is the same thing the view is drawing at that moment, and the
 * block says which commit they were computed at.
 */
async function composePayload(
  input: ArchComposePayloadInput
): Promise<ArchComposePayloadResult> {
  const repoPath = input.cwd;
  const document = keepLastValid(
    lastValid.get(repoPath) ?? null,
    await loadArchDocument(createArchFileSystem(repoPath))
  );
  const db = archStore();
  const repoKey = archRepoKey(repoPath);
  const state = db.repoState(repoKey);
  const listed = await createArchGitRunner(repoPath).run(lsFilesCall());
  const trackedFiles = listed.code === 0 ? readLsFiles(listed.stdout) : [];
  const block = composeArchPayload({
    // The repository's own folder name, never a path. A block is read by an
    // agent whose working directory is already the repository, and on a
    // session running on another machine a local absolute path names nothing.
    repoName:
      repoPath.split('/').filter((part) => part.length > 0).pop() ?? repoPath,
    document,
    trackedFiles,
    verdicts: db.verdicts(repoKey),
    freshness: db.freshness(repoKey),
    counts: state.counts ?? emptyCounts(),
    checkedAtCommit: state.checkedAtCommit,
    selection: {
      componentIds: input.componentIds,
      gapIds: input.gapIds,
      verdictIds: input.verdictIds
    }
  });
  return { cwd: repoPath, ...block };
}

// ---------------------------------------------------------------------------
// The one path in (Phase 158)
// ---------------------------------------------------------------------------

/**
 * The person's arch choice, read from the sealed settings value at every
 * gesture and never cached. `getSettings` answers the seal checked view, so
 * a hand edited or replayed choice reaches here as None, and None starts
 * nothing.
 */
function archChoiceNow(): ArchPassChoice {
  const { arch } = getSettings();
  return { agentId: arch.agentId, model: arch.model };
}

/** The one live runner, made on first use. It holds no timer and no child. */
let passRunner: ArchPassRunner | null = null;

function archPassRunner(): ArchPassRunner {
  if (passRunner !== null) return passRunner;
  passRunner = new ArchPassRunner({
    choice: archChoiceNow,
    // Map binding rule 2: recompose the map over the same facts with the
    // enriched document and count the boxes that wear a component. A kept
    // write that paints nothing is recorded FAILED by the runner.
    paint: (document, input) => {
      const model = composeArchMap({
        subject: input.subject,
        trackedFiles: input.trackedFiles,
        imports: input.imports.map((edge) => ({
          fromPath: edge.fromPath,
          toPath: edge.toPath,
          resolution: 'first-party'
        })),
        workspaces: [...input.workspaces],
        document,
        verdicts: []
      });
      return {
        painted: model.groups.filter((group) => group.componentId !== null)
          .length,
        groupsTotal: model.groups.length
      };
    },
    append: (record) => {
      archStore().appendPassRun({
        repoKey: archRepoKey(record.repoPath),
        ...record
      });
    },
    // Phase 159. The newest row's input hash, whatever its verdict, so the
    // automatic trigger refuses the prompt it already answered: a kept write
    // moves docs/arch, the watcher fires a check, and the drift is either
    // gone or the same bytes. Without this seam the interval alone would
    // spawn once a minute over a refused answer forever.
    latestInputHash: (repoPath) =>
      archStore().latestPassRun(archRepoKey(repoPath))?.inputHash ?? null
  });
  return passRunner;
}

/** Everything the seed and the pass share, gathered once per gesture. */
interface ArchGatheredFacts {
  trackedFiles: string[];
  /** Resolved first party pairs, the skeleton's own slice. */
  pairs: ArchEnrichImport[];
  subject: string;
  workspaces: string[];
}

/**
 * The same gather the draft channel does: the one fixed `git ls-files -z`,
 * the one scanner over the shared stamp table, and the manifest read. No
 * second scan exists; a fact this wrote is a fact the next check reuses.
 */
async function gatherEnrichFacts(repoPath: string): Promise<ArchGatheredFacts> {
  const db = archStore();
  const repoKey = archRepoKey(repoPath);
  const git = createArchGitRunner(repoPath);
  const listed = await git.run(lsFilesCall());
  const trackedFiles = listed.code === 0 ? readLsFiles(listed.stdout) : [];
  const scan = await scanArchImports({
    repoPath,
    repoKey,
    store: db,
    trackedFiles,
    budgetMs: null
  });
  return {
    trackedFiles,
    // Only the imports that resolved to a tracked file describe a part
    // talking to another part. An unresolved one names something this build
    // could not find, and drafting or enriching a promise from it would put
    // a guess in a person's contract.
    pairs: firstPartyPairs(scan.imports),
    ...manifestFacts(repoPath)
  };
}

/**
 * The repository's own name and its workspace directories, read from the
 * dependency files. One directory read and no process; the gesture and the
 * drift trigger both take it, so it lives once.
 */
function manifestFacts(repoPath: string): Pick<ArchGatheredFacts, 'subject' | 'workspaces'> {
  const manifests = readArchManifests(repoPath);
  return {
    subject:
      manifests.packageName ?? repoPath.split('/').pop() ?? 'this project',
    workspaces: [...manifests.workspaces.values()].map((w) => w.dir)
  };
}

/**
 * Write the deterministic skeleton under `docs/arch/`, minus `baseline.json`.
 *
 * The operator's amendment: the write lands as an ordinary uncommitted change
 * in Source Control, never unsaved buffers a person must save. A repository
 * that already has a contract gets nothing written and says so.
 */
async function seedContract(input: ArchRepoInput): Promise<ArchSeedResult> {
  const repoPath = input.cwd;
  const fresh = await loadArchDocument(createArchFileSystem(repoPath));
  if (fresh.contract !== null) {
    return { cwd: repoPath, ok: false, reason: 'contract-exists', wrote: [] };
  }
  const facts = await gatherEnrichFacts(repoPath);
  const buffers = draftSkeletonBuffers({
    subject: facts.subject,
    trackedFiles: facts.trackedFiles,
    imports: facts.pairs,
    workspaces: facts.workspaces
  });
  const wrote = await writeArchFiles(repoPath, planSkeletonWrite(buffers));
  // The watcher fan out picks the write up anyway; asking now just makes the
  // first verdicts arrive without waiting for the debounce.
  requestArchCheck(repoPath);
  return { cwd: repoPath, ok: true, reason: null, wrote: wrote.sort() };
}

/**
 * One enrichment gesture, end to end: seed when no contract exists, gate,
 * spawn the one confirmed agent through the fold's one shot spawn, validate
 * whole, write on a kept answer, and count the painted boxes.
 */
async function runEnrichPass(input: ArchEnrichInput): Promise<ArchEnrichResult> {
  const repoPath = input.cwd;
  // The scope is the renderer's; the trigger is decided HERE from where the
  // call came, so a page cannot claim to be a check. Absent means the whole
  // pass, which keeps the shipped button's bytes unchanged.
  const scope: ArchPassScope = input.scope === 'drift' ? 'drift' : 'whole';
  const trigger: ArchPassTrigger = scope === 'drift' ? 'ribbon' : 'gesture';
  const facts = await gatherEnrichFacts(repoPath);
  let seeded: string[] = [];
  let document = await loadArchDocument(createArchFileSystem(repoPath));
  if (document.contract === null) {
    const seed = await seedContract(input);
    seeded = seed.wrote;
    document = await loadArchDocument(createArchFileSystem(repoPath));
  }
  if (document.contract === null) {
    // The seed could not produce a loadable contract, which means the write
    // failed or the tree is unreadable. Refusing here is honest; nothing has
    // spawned.
    return {
      cwd: repoPath,
      started: false,
      refusal: 'no-contract',
      run: null,
      seeded
    };
  }
  const db = archStore();
  const repoKey = archRepoKey(repoPath);
  const outcome = await drivePass({
    repoPath,
    document,
    trackedFiles: facts.trackedFiles,
    imports: facts.pairs,
    subject: facts.subject,
    workspaces: facts.workspaces,
    scope,
    trigger,
    // The drift scope is read from what the last check published. A press
    // before any check has run carries an empty set and the runner refuses
    // it `no-drift`, spawning nothing.
    verdicts: db.verdicts(repoKey),
    freshness: db.freshness(repoKey)
  });
  return {
    cwd: repoPath,
    started: outcome.started,
    refusal: outcome.refusal,
    run: toPassFace(outcome.run),
    seeded
  };
}

/**
 * The one drive every pass takes, whatever started it: the started push,
 * the runner, the finished push, and the re-check a kept write is owed.
 * The gesture, the ribbon and the drift trigger all come through here, so
 * there is exactly one place a pass begins and ends.
 */
async function drivePass(passInput: ArchPassInput): Promise<ArchPassOutcome> {
  const repoPath = passInput.repoPath;
  broadcastEvent(EVT_ARCH_PASS, { cwd: repoPath, phase: 'started', run: null });
  const outcome = await archPassRunner().run(passInput);
  broadcastEvent(EVT_ARCH_PASS, {
    cwd: repoPath,
    phase: 'finished',
    run: toPassFace(outcome.run)
  });
  if (outcome.run?.verdict === 'kept') {
    // The write moved the contract, so the verdicts are owed a re-check. The
    // watcher would coalesce one anyway; asking now is prompt rather than new.
    requestArchCheck(repoPath);
  }
  return outcome;
}

/** What one finished check hands the drift trigger. */
interface ArchRepairInput {
  repoPath: string;
  document: ArchDocument;
  /** The fact base the check built. The trigger never scans again. */
  facts: ArchFactBase;
  /** The subjects the settle window is holding for a second opinion. */
  held: readonly string[];
  /** The published set and its freshness rows, the drift's own source. */
  verdicts: readonly ArchVerdict[];
  freshness: readonly ArchFreshness[];
  drift: ArchDrift | null;
}

/**
 * THE AUTOMATIC PATH (Phase 159), fired by a finished check and by nothing
 * else. No timer, no poll, no watcher hook of its own: it rides the check
 * the watcher already coalesced and the settle window already judged.
 *
 * What stops a storm of drift becoming a storm of spawns, in order: the
 * watcher's coalescing window, one check in flight per repository, the
 * settle hold (`held` non empty skips here), the runner's own `in-flight`
 * refusal, the fold's minimum interval, the same input hash, and the
 * suspension after three failures. Every one of those after the hold is the
 * runner's, re-checked at the spawn exactly as a person's gesture is, and
 * the confirm gate is read RIGHT NOW: an agent withdrawn in Settings stops
 * the next drift.
 *
 * It never throws into the check. A check that finished is finished
 * whatever the pass did.
 */
async function maybeRepairDrift(input: ArchRepairInput): Promise<void> {
  const { repoPath } = input;
  try {
    const choice = archChoiceNow();
    const skip = repairSkipReason({
      chosen: choice.agentId !== null && choice.model !== null,
      held: input.held,
      drift: input.drift
    });
    if (skip === 'held') {
      // The one skip worth a line: a repair was owed and deferred until the
      // second opinion the settle window is waiting for.
      logEvent('arch', 'info', 'arch.pass.skipped', 'a drift repair waits for the settle window', {
        repoPath,
        reason: skip,
        held: [...input.held]
      });
      return;
    }
    if (skip !== null) return;
    await drivePass({
      repoPath,
      document: input.document,
      trackedFiles: input.facts.trackedFiles,
      imports: firstPartyPairs(input.facts.imports),
      ...manifestFacts(repoPath),
      scope: 'drift',
      trigger: 'drift',
      verdicts: input.verdicts,
      freshness: input.freshness
    });
  } catch (err) {
    archLog.warn('the drift trigger threw', { repoPath, error: String(err) });
  }
}

/**
 * A pass run as the run's face draws it. The runner's fresh record and the
 * store's read back row both carry the face's fields plus `recipeVersion`,
 * which the face does not show, so one projection serves the gesture's
 * answer and the status read alike.
 */
function toPassFace(
  row: StoredArchPassRun | ArchPassRunRecord | null
): ArchPassRunFace | null {
  if (row === null) return null;
  return {
    verdict: row.verdict,
    reason: row.reason,
    detail: row.detail,
    agentId: row.agentId,
    model: row.model,
    startedAt: row.startedAt,
    wallMs: row.wallMs,
    painted: row.painted,
    groupsTotal: row.groupsTotal,
    components: row.components,
    suggestions: row.suggestions,
    scope: row.scope,
    trigger: row.trigger
  };
}

/** What the pass is doing and what last ran. A read; it starts nothing. */
async function passStatus(input: ArchRepoInput): Promise<ArchPassStatusResult> {
  const repoPath = input.cwd;
  const runner = archPassRunner();
  const choice = archChoiceNow();
  return {
    cwd: repoPath,
    running: runner.running(repoPath),
    suspended: runner.suspension(),
    chosen: choice.agentId !== null && choice.model !== null,
    lastRun: toPassFace(archStore().latestPassRun(archRepoKey(repoPath)))
  };
}

/**
 * The accept button's own append (Phase 158, the operator's second
 * amendment). `at` is composed HERE, in main, as today's date in the
 * `dayField` shape, and every other field is validated whole by the writer.
 */
async function acceptDivergence(
  input: ArchAcceptDivergenceInput
): Promise<ArchAcceptDivergenceResult> {
  const at = new Date().toISOString().slice(0, 10);
  const result = await appendAcceptedDivergence(input.cwd, {
    ...(input.edgeId === undefined ? {} : { edgeId: input.edgeId }),
    fromPath: input.fromPath,
    toPath: input.toPath,
    because: input.because,
    at
  });
  if (result.ok) {
    // The baseline moved, so the strip's accepted count is owed a re-check.
    requestArchCheck(input.cwd);
  }
  return { cwd: input.cwd, ok: result.ok, reason: result.reason };
}

// ---------------------------------------------------------------------------
// The draft
// ---------------------------------------------------------------------------

/**
 * Draft a contract from the fact base, and write nothing.
 *
 * The bytes come back for callers that want them as text, and the probes
 * that pin the draft's determinism drive this channel. Since Phase 158 the
 * WRITING path is `arch:seed`, which writes the same buffers through the one
 * writer module in ./enrich/write.ts, minus `baseline.json`.
 */
async function draftSkeleton(input: ArchRepoInput): Promise<ArchSkeletonResult> {
  const repoPath = input.cwd;
  const facts = await gatherEnrichFacts(repoPath);
  const files: ArchDraftFile[] = draftSkeletonBuffers({
    subject: facts.subject,
    trackedFiles: facts.trackedFiles,
    imports: facts.pairs,
    workspaces: facts.workspaces
  }).map((buffer) => ({ path: buffer.path, content: buffer.text }));
  return {
    cwd: repoPath,
    files,
    note:
      'This draft is a starting point, not a contract. A healthy promise set ' +
      'is five to ten promises, so delete the ones that say nothing and write ' +
      'the reason beside the ones that matter. Nothing is saved until you ' +
      'save it.'
  };
}
