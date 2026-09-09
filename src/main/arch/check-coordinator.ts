/**
 * The CHECK COORDINATOR (Phase 172): the load, check, last valid document
 * and progress workflow that used to live inline in ./ipc.ts, moved whole so
 * the registrar keeps registration and disposal. Every channel answer,
 * event, refusal and log line here is byte for byte what the registrar
 * produced before the move.
 *
 * The coordinator owns the two per repository memories the workflow needs
 * and nothing else: the last document that loaded cleanly, and the moment
 * each repository last had a progress message sent. Both are memory only and
 * `dispose()` clears them. The store stays the registrar's, injected as the
 * lazy `store` operation, and the drift trigger stays the enrichment
 * coordinator's, injected as `repairDrift`, so a finished check hands the
 * drift over without this module naming the pass workflow.
 */

import type {
  ArchCheckResult,
  ArchComposePayloadInput,
  ArchComposePayloadResult,
  ArchLoadResult,
  ArchMapInput,
  ArchMapPartInput,
  ArchMapPartResult,
  ArchMapResult,
  ArchRepoInput
} from '@shared/ipc';
import {
  EVT_ARCH_CHECKED,
  EVT_ARCH_MAP_UPDATED,
  EVT_ARCH_PROGRESS
} from '@shared/ipc';
import type {
  ArchCoverageCounts,
  ArchDocument,
  ArchFreshness,
  ArchVerdict,
  ArchVerdictChanges
} from '@shared/arch';
import { broadcastEvent } from '../typed-events';
import { getLog } from '../log';
import { lsFilesCall, revParseHeadCall, type ArchGitCall } from './argv-guard';
import {
  countByCoverage,
  runCheckers,
  type ArchCheckerVerdict,
  type ArchFactBase
} from './checkers';
import {
  ARCH_SCANNED_NO_HEAD,
  archRepoKey,
  type ArchRepoState,
  type ArchStore
} from './db';
import { readLsFiles } from './git-facts';
import { keepLastValid, loadArchDocument } from './load';
import { archSourceOf, localArchSource, type ArchSource } from './remote-source';
import { composeArchMap, composeArchMapPart } from './map';
import type { ArchMapComposeInput, ArchMapPartVerdictFact } from './map';
import { gatherFacts } from './run';
import { scanArchImports } from './scan';
import { readArchTreeFacts } from './tree-facts';
import { diffArchVerdicts, readArchDrift } from './enrich/drift';
import { driftFace } from './repair-trigger';
import { composeArchPayload } from './payload';
import { readArchManifests } from './resolver/manifest';
import {
  ARCH_PROGRESS_THROTTLE_MS,
  applySettleWindow,
  requestArchCheck,
  watchArchRepo
} from './watch';
import type { ArchRepairInput } from './enrich-coordinator';

const archLog = getLog('arch');

/**
 * The narrow operations the registrar wires to the `arch:load`, `arch:check`,
 * `arch:map`, `arch:mapPart` and `arch:composePayload` channels, plus the
 * `runOneCheck` the watcher callback drives.
 */
export interface ArchCheckCoordinator {
  load(input: ArchRepoInput): Promise<ArchLoadResult>;
  check(input: ArchRepoInput): Promise<ArchCheckResult>;
  runOneCheck(
    repoPath: string,
    signal: AbortSignal | null
  ): Promise<ArchCheckResult | null>;
  map(input: ArchMapInput): Promise<ArchMapResult>;
  mapPart(input: ArchMapPartInput): Promise<ArchMapPartResult>;
  composePayload(
    input: ArchComposePayloadInput
  ): Promise<ArchComposePayloadResult>;
  dispose(): void;
}

export function createArchCheckCoordinator(deps: {
  /** The one lazily opened store, owned by the registrar. */
  store: () => ArchStore;
  /** The enrichment coordinator's drift trigger, injected by the registrar. */
  repairDrift: (input: ArchRepairInput) => Promise<void>;
}): ArchCheckCoordinator {
  const archStore = deps.store;

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

  /**
   * WHERE EACH REPOSITORY'S BYTES COME FROM (Phase 234).
   *
   * Keyed by `source.repoPath`, which is the folder itself for a folder on this
   * Mac and the MIRROR for a folder on a machine. It exists because
   * `runOneCheck` is also reached from the watcher's own callback, which knows
   * a path and nothing else, so a run scheduled by `requestArchCheck` has to be
   * able to find the source the load registered. A path this map does not hold
   * is a folder on this Mac, which is what every path was before this phase.
   */
  const sources = new Map<string, ArchSource>();

  /**
   * The repositories this session has already touched.
   *
   * `watchArchRepo` answers true the first time it arms a repository, and the
   * launch catch up rides that answer. A folder on a machine has no watch to
   * arm, so this set gives it the same ONE run per session: the first load
   * schedules the catch up and every load after it reads what the store holds.
   * Everything after that is the person's own `Read the code again`, which is
   * the local face's own control and needs no new word on the face.
   */
  const touched = new Set<string>();

  /**
   * The source for one channel's input, remembered so a scheduled run can find
   * it again.
   */
  function sourceFor(input: { cwd: string; machineId?: string | null }): ArchSource {
    const source = archSourceOf(input);
    sources.set(source.repoPath, source);
    return source;
  }

  /** The source a scheduled run belongs to, or a folder on this Mac. */
  function sourceOf(repoPath: string): ArchSource {
    return sources.get(repoPath) ?? localArchSource(repoPath);
  }

  /**
   * Arm whatever this source has, and answer whether this is its first touch.
   *
   * BOTH KINDS ARE REGISTERED WITH THE WATCH MODULE, and the first build of
   * this phase registered only one, which is the defect the app run found: the
   * remote face drew its boxes from the tracked list and every row read
   * "0 lines" and "nothing this build reads", because `requestArchCheck`
   * returns at once for a repository `watchArchRepo` never armed, so the scan
   * that carries the bytes never ran.
   *
   * `watchArchRepo` starts no FSEvents stream. It puts an entry in a map, and
   * the fan out that fires against that map is `emitRepoChanged`, which the one
   * RepoWatcher per PROJECT ROOT calls. A mirror lives under
   * `<userData>/gmux` and is never a project root, so nothing will ever fire
   * for it and the only thing that can schedule a run on a folder on a machine
   * is this module: the first load, and the person's own Read the code again.
   * That is what `source.watchable` records, and it is a fact about the bus
   * rather than a switch.
   */
  function armSource(source: ArchSource): boolean {
    const armed = watchArchRepo(source.repoPath);
    if (source.watchable) return armed;
    if (touched.has(source.repoPath)) return false;
    touched.add(source.repoPath);
    return true;
  }

  // -------------------------------------------------------------------------
  // The read
  // -------------------------------------------------------------------------

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
   *
   * PHASE 175 RECORDED A SEAM HERE and deliberately did not move it. That
   * phase's switch decides what Architecture SHOWS, not what it RUNS, by its
   * own charter refusal. PHASE 197 ITEM 7 CLOSED THE RUNNING HALF: the
   * settings registrar calls `disarmArchWatch` when `arch.enabled` flips off,
   * so a repository armed here stops being re-checked on file changes, and
   * the next load after the switch comes back on re-arms through this same
   * call exactly as a first load does.
   */
  async function readArch(input: ArchRepoInput): Promise<ArchLoadResult> {
    const source = sourceFor(input);
    const repoPath = source.repoPath;
    const armed = armSource(source);
    const fresh = await loadArchDocument(await source.fileSystem());
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
      // The folder the person named, never the mirror a machine folder is read
      // through. Every `cwd` that leaves this module is the outward one.
      cwd: source.farPath,
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

  // -------------------------------------------------------------------------
  // The run
  // -------------------------------------------------------------------------

  /**
   * The `arch:check` answer: one check, or when no run happened, what the
   * store holds.
   */
  async function checkNow(input: ArchRepoInput): Promise<ArchCheckResult> {
    const result = await runOneCheck(sourceFor(input).repoPath, null);
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
  }

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
    const source = sourceOf(repoPath);
    const db = archStore();
    const repoKey = archRepoKey(repoPath);
    const before = db.repoState(repoKey);
    const document = keepLastValid(
      lastValid.get(repoPath) ?? null,
      await loadArchDocument(await source.fileSystem())
    );
    if (document.contract === null) {
      // THE FACT-ONLY LEG (Phase 160). The map draws for any repository, so a
      // repository with no contract still gets its fact base built and kept
      // fresh here, through the SAME scanner and the same stamp table the
      // checker path reads. No checker runs, no verdict is composed, no
      // generation is claimed and nothing is published, so a contract added
      // later reuses every fact this leg wrote.
      await scanFactsOnly(source, db, repoKey, before, signal);
      return null;
    }
    lastValid.set(repoPath, document);

    const generation = db.claimGeneration(repoKey, repoPath);
    const git = source.git();
    const record: ArchGitCall[] = [];
    let overBudget: string | null = null;
    // PHASE 244, finding F3. The SOURCE's own incompleteness, kept apart from
    // the parser's. They read the same way to a person and they do not behave
    // the same way to a rescan: a parser budget is picked up where it left off
    // by the next run, and a mirror ceiling is not something any number of
    // reruns gets past.
    let sourceIncomplete: string | null = null;
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
        // PHASE 234. For a folder on this Mac this does nothing at all. For a
        // folder on a machine it brings the mirror up to what that machine
        // holds, because the scanner hands paths to parser workers and the tree
        // read counts lines with `node:fs`, and parsing over there would be a
        // process on that machine.
        const synced = await source.syncTree({
          trackedFiles,
          ...(signal === null ? {} : { signal })
        });
        if (synced.overBudget !== null) {
          overBudget = synced.overBudget;
          sourceIncomplete = synced.overBudget;
        }
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
        // The reading's one read of the tree (Phase 201), stamped like the
        // import rows, so a warm run reads only what drifted.
        if (signal?.aborted !== true) {
          await readArchTreeFacts({
            repoPath,
            repoKey,
            store: db,
            trackedFiles,
            ...(signal === null ? {} : { signal })
          });
        }
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
    //
    // PHASE 244, finding F3. WHICH mark is used says what the answer is about.
    // This path already kept the source's sentence for the check result, and
    // then stamped a COMPLETE scan over it anyway, so the map went on to draw a
    // settled answer over a fact base that had never seen part of the folder.
    if (scannedFiles >= 0 && checkedAtCommit.length > 0) {
      if (sourceIncomplete !== null) {
        db.markScanPartial(repoKey, repoPath, checkedAtCommit, sourceIncomplete);
      } else {
        db.markScanned(repoKey, repoPath, checkedAtCommit);
      }
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
      cwd: source.farPath,
      machineId: source.machineId,
      checkedAtCommit,
      generation,
      broke,
      unchecked
    });
    // The map listens too (Phase 160): a re-check moves the fact base and the
    // verdict colours riding the edges, and the map tab is not always the
    // surface that asked for the run.
    broadcastEvent(EVT_ARCH_MAP_UPDATED, {
      cwd: source.farPath,
      machineId: source.machineId,
      scannedAtCommit: wireScannedAt(db.repoState(repoKey).scannedAtCommit)
    });

    // THE DRIFT TRIGGER (Phase 159). The drift is read once from what this
    // run published, answers the ribbon through `drift.count`, and is handed
    // to the runner only when an agent is chosen and nothing is held. It is
    // not awaited: the check is finished, and the pass is the runner's.
    const drift = readArchDrift(document, settled.publish, freshness);
    // NOT FOR A FOLDER ON A MACHINE, and it is a refusal rather than an
    // oversight (Phase 234). The pass WRITES contract files, and the only
    // thing this Mac can write is the mirror, which nothing reads back and
    // which the next sync overwrites. A repair that silently went nowhere is
    // worse than no repair, so the trigger is not fired at all and nothing on
    // the face claims it was.
    if (source.machineId === null) {
      void deps.repairDrift({
        repoPath,
        document,
        facts,
        held: settled.held,
        verdicts: settled.publish,
        freshness,
        drift
      });
    }

    return {
      cwd: source.farPath,
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
   * Build the fact base for a repository with no contract, and stop.
   *
   * The scanner, the budget rule and the progress push are the checker path's
   * own, so NO SECOND SCAN exists: `scanArchImports` stays the single scanner
   * and the stamp table is shared, which is what makes a contract added later
   * reuse everything this leg wrote. The repo-level scanned stamp is recorded
   * only when the scan finished whole, so a cancelled or over-budget pass leaves
   * `building` true and the next run reads the rest.
   *
   * PHASE 244, audit finding F3. THE SOURCE'S COMPLETENESS IS CARRIED TOO, and
   * it is a different thing from the parser's budget. `syncTree`'s answer used
   * to be discarded here — the call was awaited and its typed result bound to
   * nothing — so a remote mirror that stopped at its file or byte ceiling was
   * stamped as a complete scan at the supplied commit and the map drew a settled
   * answer over a fact base that had never seen part of the folder. It is bound
   * now, and it chooses which mark records the run. The stamp is still written,
   * because a mirror ceiling is not something a rescan can get past and
   * `building` schedules the next check on every map read; the reason travels
   * to the person instead of the loop running for ever.
   */
  async function scanFactsOnly(
    source: ArchSource,
    db: ArchStore,
    repoKey: string,
    before: ArchRepoState,
    signal: AbortSignal | null
  ): Promise<void> {
    const repoPath = source.repoPath;
    const git = source.git();
    const listed = await git.run(lsFilesCall());
    const trackedFiles = listed.code === 0 ? readLsFiles(listed.stdout) : [];
    // PHASE 234, the same one line the checker leg carries: a no-op on this
    // Mac, and the mirror brought up to date for a folder on a machine.
    //
    // PHASE 244, finding F3. Its ANSWER is bound now. This line used to discard
    // a typed result: a mirror that stopped at its file or byte ceiling said so
    // here, nothing read it, and the stamp below then called the run a complete
    // scan of the folder.
    const synced = await source.syncTree({
      trackedFiles,
      ...(signal === null ? {} : { signal })
    });
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
    // The reading's one read of the tree (Phase 201), after the scan and
    // before the stamp, so the sentence behind a box never waits on a second
    // pass the map read would have to know about.
    await readArchTreeFacts({
      repoPath,
      repoKey,
      store: db,
      trackedFiles,
      ...(signal === null ? {} : { signal })
    });
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
      //
      // PHASE 244, finding F3. The stamp is still written when the SOURCE was
      // incomplete, for that same measured reason — a mirror ceiling is not
      // something a rescan gets past, so leaving `building` true would ask for
      // an impossible full read for ever — but it is written through the other
      // door, which says the answer is about PART of the folder and why.
      const stamp = headCommit.length > 0 ? headCommit : ARCH_SCANNED_NO_HEAD;
      if (synced.overBudget !== null) {
        db.markScanPartial(repoKey, repoPath, stamp, synced.overBudget);
      } else {
        db.markScanned(repoKey, repoPath, stamp);
      }
    }
    broadcastEvent(EVT_ARCH_MAP_UPDATED, {
      cwd: source.farPath,
      machineId: source.machineId,
      scannedAtCommit: wireScannedAt(db.repoState(repoKey).scannedAtCommit)
    });
  }

  // -------------------------------------------------------------------------
  // The map (Phase 160)
  // -------------------------------------------------------------------------

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
    const { envelope, compose } = await archMapReadFacts(sourceFor(input));
    return { ...envelope, ...composeArchMap(compose) };
  }

  /**
   * The one envelope both map reads share (extracted by the integrator, Phase
   * 161): arm the watch, schedule the coalesced catch up when the watch was
   * cold or the fact base is still owed, and gather the compose inputs from
   * the stored facts plus the one fixed `git ls-files -z`. It NEVER waits for
   * a scan.
   */
  async function archMapReadFacts(source: ArchSource): Promise<{
    envelope: {
      cwd: string;
      building: boolean;
      scannedAtCommit: string | null;
      scanIncomplete: string | null;
    };
    compose: ArchMapComposeInput & {
      /**
       * The stored rows carry coverage and offences, which the SCOPED compose
       * needs to re-derive `accepted`; the level 1 compose reads the narrower
       * fact and the extra fields simply do not travel into its output.
       */
      verdicts: readonly ArchMapPartVerdictFact[];
    };
  }> {
    const repoPath = source.repoPath;
    const armed = armSource(source);
    const db = archStore();
    const repoKey = archRepoKey(repoPath);
    const state = db.repoState(repoKey);
    const building = state.scannedAtCommit === null;
    // The launch catch up, the map's own: Tortie was closed while somebody
    // rebased, and the stored facts are about a tree that may have moved.
    // Scheduled rather than awaited, and coalesced with anything the watcher
    // already owes, so opening the map twice costs one run and not two.
    if (armed || building) requestArchCheck(repoPath);

    const fresh = await loadArchDocument(await source.fileSystem());
    const document = keepLastValid(lastValid.get(repoPath) ?? null, fresh);
    if (document.contract !== null && fresh.contract !== null) {
      lastValid.set(repoPath, document);
    }
    const listed = await source.git().run(lsFilesCall());
    const trackedFiles = listed.code === 0 ? readLsFiles(listed.stdout) : [];
    const manifests = readArchManifests(repoPath);
    return {
      envelope: {
        cwd: source.farPath,
        building,
        scannedAtCommit: wireScannedAt(state.scannedAtCommit),
        // PHASE 244, finding F3. One sentence when the scan behind these facts
        // did not see the whole folder, and null when it did.
        scanIncomplete: state.scanIncomplete
      },
      compose: {
        // Rule R (Phase 201): the package name, then the root crate's own
        // name, then the checkout directory.
        // Rule R's last resort is the checkout DIRECTORY, and for a folder on
        // a machine that is the folder over there rather than the mirror it is
        // read through, whose name is a digest and names nothing a person has
        // ever seen.
        subject:
          manifests.packageName ??
          manifests.crateName ??
          source.farPath.split('/').filter((part) => part.length > 0).pop() ??
          'this project',
        trackedFiles,
        imports: db.imports(repoKey),
        workspaces: [...manifests.workspaces.values()].map((w) => w.dir),
        crates:
          manifests.cargo === null
            ? []
            : [...manifests.cargo.crates.values()].map((c) => c.dir).filter((d) => d !== ''),
        definitions: db.definitions(repoKey),
        treeFacts: db.treeFacts(repoKey),
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
    const { envelope, compose } = await archMapReadFacts(sourceFor(input));
    return {
      ...envelope,
      ...composeArchMapPart({ ...compose, groupId: input.groupId })
    };
  }

  /** One progress message per repository per 120 ms, the symbols precedent. */
  function publishProgress(repoPath: string, done: number, total: number): void {
    const now = Date.now();
    const last = lastProgressAt.get(repoPath) ?? 0;
    if (done < total && now - last < ARCH_PROGRESS_THROTTLE_MS) return;
    lastProgressAt.set(repoPath, now);
    const source = sourceOf(repoPath);
    broadcastEvent(EVT_ARCH_PROGRESS, {
      cwd: source.farPath,
      machineId: source.machineId,
      done,
      total
    });
  }

  // -------------------------------------------------------------------------
  // The composed scope
  // -------------------------------------------------------------------------

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
    const source = sourceFor(input);
    const repoPath = source.repoPath;
    const document = keepLastValid(
      lastValid.get(repoPath) ?? null,
      await loadArchDocument(await source.fileSystem())
    );
    const db = archStore();
    const repoKey = archRepoKey(repoPath);
    const state = db.repoState(repoKey);
    const listed = await source.git().run(lsFilesCall());
    const trackedFiles = listed.code === 0 ? readLsFiles(listed.stdout) : [];
    const block = composeArchPayload({
      // The repository's own folder name, never a path. A block is read by an
      // agent whose working directory is already the repository, and on a
      // session running on another machine a local absolute path names nothing.
      repoName:
        source.farPath.split('/').filter((part) => part.length > 0).pop() ??
        source.farPath,
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
    return { cwd: source.farPath, ...block };
  }

  function dispose(): void {
    lastValid.clear();
    lastProgressAt.clear();
    sources.clear();
    touched.clear();
  }

  return {
    load: readArch,
    check: checkNow,
    runOneCheck,
    map: readArchMap,
    mapPart: readArchMapPart,
    composePayload,
    dispose
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
