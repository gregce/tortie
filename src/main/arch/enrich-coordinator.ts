/**
 * The ENRICHMENT COORDINATOR (Phase 172): the pass and repair trigger
 * workflow that used to live inline in ./ipc.ts, moved whole so the
 * registrar keeps registration and disposal. Every channel answer, event,
 * refusal and log line here is byte for byte what the registrar produced
 * before the move.
 *
 * This is the one path in (Phase 158) plus the automatic drift trigger
 * (Phase 159). `arch:seed` writes the deterministic skeleton through the one
 * writer module. `arch:enrich` is the ONE channel that can start an agent,
 * and only a person's gesture reaches it: the confirm gate is re-checked at
 * the spawn and the spawn is the fold's one shot `runFold`.
 * `arch:passStatus` is a read. `arch:acceptDivergence` is the accept
 * button's own append, and it is the only code path that writes
 * baseline.json. The drift trigger rides a finished check and is handed in
 * here through `repairDrift`, injected into the check coordinator by the
 * registrar, so there is still exactly one place a pass begins and ends.
 *
 * The coordinator holds no timer and no child. Its one piece of state is the
 * lazily made pass runner, and `dispose()` drops it: a pass in flight is a
 * runGuarded child, and reapGuardedChildren on before-quit ends it.
 */

import type {
  ArchAcceptDivergenceInput,
  ArchAcceptDivergenceResult,
  ArchDraftFile,
  ArchEnrichInput,
  ArchEnrichResult,
  ArchPassRunFace,
  ArchPassScope,
  ArchPassStatusResult,
  ArchPassTrigger,
  ArchRepoInput,
  ArchSeedResult,
  ArchSkeletonResult
} from '@shared/ipc';
import { EVT_ARCH_PASS } from '@shared/ipc';
import type {
  ArchDocument,
  ArchDrift,
  ArchFreshness,
  ArchVerdict
} from '@shared/arch';
import { broadcastEvent } from '../typed-events';
import { getLog, logEvent } from '../log';
import { lsFilesCall } from './argv-guard';
import type { ArchFactBase } from './checkers';
import { archRepoKey, type ArchStore, type StoredArchPassRun } from './db';
import { createArchGitRunner, readLsFiles } from './git-facts';
import { createArchFileSystem, loadArchDocument } from './load';
import { composeArchMap } from './map';
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
import { firstPartyPairs, repairSkipReason } from './repair-trigger';
import {
  appendAcceptedDivergence,
  planSkeletonWrite,
  writeArchFiles
} from './enrich/write';
import { getSettings } from '../settings/store';
import { readArchManifests } from './resolver/manifest';
import { requestArchCheck } from './watch';

const archLog = getLog('arch');

/** What one finished check hands the drift trigger. */
export interface ArchRepairInput {
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
 * The narrow operations the registrar wires to the `arch:seed`,
 * `arch:enrich`, `arch:passStatus`, `arch:acceptDivergence` and
 * `arch:skeleton` channels, plus the drift hand off the check coordinator
 * takes injected.
 */
export interface ArchEnrichCoordinator {
  seed(input: ArchRepoInput): Promise<ArchSeedResult>;
  enrich(input: ArchEnrichInput): Promise<ArchEnrichResult>;
  passStatus(input: ArchRepoInput): Promise<ArchPassStatusResult>;
  acceptDivergence(
    input: ArchAcceptDivergenceInput
  ): Promise<ArchAcceptDivergenceResult>;
  draftSkeleton(input: ArchRepoInput): Promise<ArchSkeletonResult>;
  repairDrift(input: ArchRepairInput): Promise<void>;
  dispose(): void;
}

export function createArchEnrichCoordinator(deps: {
  /** The one lazily opened store, owned by the registrar. */
  store: () => ArchStore;
}): ArchEnrichCoordinator {
  const archStore = deps.store;

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

  function dispose(): void {
    // The pass runner holds no timer and no child of its own: a pass in flight
    // is a runGuarded child, and reapGuardedChildren on before-quit ends it.
    passRunner = null;
  }

  return {
    seed: seedContract,
    enrich: runEnrichPass,
    passStatus,
    acceptDivergence,
    draftSkeleton,
    repairDrift: maybeRepairDrift,
    dispose
  };
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
