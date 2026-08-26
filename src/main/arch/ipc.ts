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
 * Three channels, and what is NOT here is the point.
 *
 * There is no channel that writes `docs/arch/`. The skeleton channel drafts
 * bytes and hands them back for unsaved editor buffers, so recording a contract
 * and recording a new baseline are always a person editing a file. That is the
 * ArchUnit `allowStoreUpdate=false` pattern, and it is what stops an agent
 * silently accepting its own violation.
 *
 * There is no channel that starts an agent, and no code path here that starts
 * one either. A source change, a verdict change and a freshness number are
 * facts about files. The only processes this module can cause are the five
 * fixed argv git calls in `./argv-guard.ts`, and no field of any contract file
 * reaches any of their argv.
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
  ArchCheckResult,
  ArchDraftFile,
  ArchLoadResult,
  ArchRepoInput,
  ArchSkeletonResult
} from '@shared/ipc';
import { EVT_ARCH_CHECKED, EVT_ARCH_PROGRESS } from '@shared/ipc';
import type {
  ArchCoverageCounts,
  ArchDocument,
  ArchFreshness,
  ArchVerdict
} from '@shared/arch';
import { handle } from '../typed-ipc';
import { broadcastEvent } from '../typed-events';
import { getLog } from '../log';
import { shutdownSharedSymbolPool } from '../symbols/shared-pool';
import { lsFilesCall, type ArchGitCall } from './argv-guard';
import {
  countByCoverage,
  runCheckers,
  type ArchCheckerVerdict,
  type ArchFactBase
} from './checkers';
import { ArchStore, archRepoKey } from './db';
import { createArchGitRunner, readLsFiles } from './git-facts';
import {
  createArchFileSystem,
  keepLastValid,
  loadArchDocument
} from './load';
import { gatherFacts } from './run';
import { scanArchImports } from './scan';
import { draftSkeleton as draftSkeletonBuffers } from './skeleton';
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
      durationMs: 0
    } satisfies ArchCheckResult;
  });
  handle(ipc, 'arch:skeleton', async (_event, input) => draftSkeleton(input));
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
    freshness: db.freshness(repoKey),
    counts: state.counts ?? emptyCounts(),
    checkedAtCommit: state.checkedAtCommit,
    // Tortie never calls a model, so this is a fact about what a person's own
    // agent did and never a thing Tortie can cause. Nothing writes it yet.
    narratedAtCommit: null
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
  if (document.contract === null) return null;
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
        budgetMs: before.scannedAtCommit === null ? null : 5_000,
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

  const settled = applySettleWindow(repoPath, db.verdicts(repoKey), verdicts);
  const freshness = freshnessRows(facts);
  const counts = countByCoverage(run.verdicts, facts);
  const published = db.publish({
    repoKey,
    repoPath,
    generation,
    checkedAtCommit,
    verdicts: settled.publish,
    freshness,
    counts
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

  return {
    cwd: repoPath,
    verdicts: settled.publish,
    freshness,
    counts,
    checkedAtCommit,
    generation,
    overBudget,
    durationMs: Date.now() - started
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
// The draft
// ---------------------------------------------------------------------------

/**
 * Draft a contract from the fact base, and write nothing.
 *
 * The bytes come back for unsaved editor buffers. Main creating the files
 * itself would make "Tortie never writes docs/arch" a habit of this function
 * rather than a property of the design, and the next round would find the
 * habit easy to break.
 */
async function draftSkeleton(input: ArchRepoInput): Promise<ArchSkeletonResult> {
  const repoPath = input.cwd;
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
  const manifests = readArchManifests(repoPath);
  const files: ArchDraftFile[] = draftSkeletonBuffers({
    subject: manifests.packageName ?? repoPath.split('/').pop() ?? 'this project',
    trackedFiles,
    // Only the imports that resolved to a tracked file describe a part talking
    // to another part. An unresolved one names something this build could not
    // find, and drafting a promise from it would put a guess in a person's
    // contract.
    imports: scan.imports.flatMap((row) =>
      row.toPath === null ? [] : [{ fromPath: row.fromPath, toPath: row.toPath }]
    ),
    workspaces: [...manifests.workspaces.values()].map((w) => w.dir)
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
