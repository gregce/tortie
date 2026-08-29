/**
 * The arch enrichment runner (Phase 158): one gesture, one confirmed child,
 * one validated write.
 *
 * THERE IS NO TIMER, NO POLL, NO WATCHER HOOK AND NO SCHEDULER CLASS HERE.
 * The fold's `FoldScheduler` is turn boundary driven and keyed by session;
 * this pass is a PERSON'S GESTURE on one repository, so the runner keeps only
 * the small state that shape needs: one run in flight per repository, a
 * second gesture refused while one runs, and the fold's own suspension
 * discipline, composed from fold/suspension.ts, being three consecutive
 * failures or a turned rate window suspending the pass for the fold's own
 * blind window.
 * Phase 159, not this one, is where the settle and interval numbers start
 * doing automatic work.
 *
 * THE SPAWN IS THE FOLD'S. `runFold` in ../../overview/fold/spawn.ts is the
 * one path to a model, it inherits Bound C unchanged, and writing any other
 * spawn here would be the phase failing the growth guardrail. The child runs
 * in the fold's own home directory; the repository reaches the model only
 * inside the prompt, never as a working directory.
 *
 * THE GATE IS RE-CHECKED AT SPAWN, not only when Settings drew the list. The
 * agent must be on the merged table, launchable, and either compiled in or
 * confirmed by the Phase 23 gate RIGHT NOW, so an agreement withdrawn while
 * the app is running stops the next pass. Nothing about a source change, a
 * verdict change or a freshness number reaches this module: the only caller
 * is the gesture's own channel.
 *
 * MAP BINDING RULE 2 IS COUNTED HERE. After a kept write the runner recomposes
 * the map over the same facts and counts how many enriched components painted
 * a box. A kept run that painted nothing is recorded FAILED with the reason
 * `no-painted-box`, because an enrichment the picture cannot show is not an
 * enrichment.
 */

import type { ArchDocument } from '@shared/arch';
import { logEvent } from '../../log';
import { configRowStatus } from '../../config/confirm';
import { currentAgentTable } from '../../config/store';
import { harnessConfirmedNow } from '../../overview/fold/options';
import { archRecipeFor, recipeHasModel } from '../../overview/fold/recipes';
import {
  runFold,
  type FoldRun,
  type FoldSpawnInput
} from '../../overview/fold/spawn';
import { HarnessSuspension } from '../../overview/fold/suspension';
import {
  composeArchEnrichPrompt,
  ARCH_ENRICH_SYSTEM_PROMPT,
  type ArchEnrichImport
} from './compose';
import { validateArchAnswer, type ArchEnrichAnswer } from './validate';
import { planEnrichedWrite, writeArchFiles } from './write';

/** The person's arch choice, read from the sealed settings value. */
export interface ArchPassChoice {
  agentId: string | null;
  model: string | null;
}

/** Why a gesture was refused before anything spawned. */
export type ArchPassRefusal =
  | 'no-choice'
  | 'not-confirmed'
  | 'no-recipe'
  | 'in-flight'
  | 'suspended';

/** What one recorded run looks like, on the run's face and in the store. */
export interface ArchPassRunRecord {
  verdict: 'kept' | 'refused' | 'failed';
  /** The refusal or failure name. Null on kept. */
  reason: string | null;
  /**
   * The validator's own sentence on a refusal, naming the field and the
   * reason, or the thrown error's text on a failed run. Null on kept. The
   * token alone is a name; this is what a person can act on.
   */
  detail: string | null;
  agentId: string;
  model: string;
  recipeVersion: number;
  startedAt: number;
  wallMs: number;
  /** How many enriched parts painted a box, on a kept write. */
  painted: number | null;
  /** How many boxes the map holds, beside the painted count. */
  groupsTotal: number | null;
  /** How many parts the answer enriched. */
  components: number | null;
  /** The model's explicit regroup suggestions, never written to docs/arch/. */
  suggestions: string[];
}

/** What one gesture came back with. */
export interface ArchPassOutcome {
  /** False when the gesture was refused before any spawn. */
  started: boolean;
  /** The refusal when `started` is false, or null. */
  refusal: ArchPassRefusal | null;
  /** The recorded run when one happened. */
  run: ArchPassRunRecord | null;
}

/** Everything one run needs, gathered by the caller before the gate. */
export interface ArchPassInput {
  repoPath: string;
  /** The drafted or current contract the model enriches in place. */
  document: ArchDocument;
  trackedFiles: readonly string[];
  imports: readonly ArchEnrichImport[];
  /** The repository's own name, for the painted coverage recompose. */
  subject: string;
  /** Workspace directories, for the same recompose. */
  workspaces: readonly string[];
}

export interface ArchPassDeps {
  /** The person's choice, re-read at every gesture. */
  choice(): ArchPassChoice;
  /** Injected so a test builds the gate without a config file. */
  table?: typeof currentAgentTable;
  /** Injected so a test answers the confirm gate without a keystore. */
  status?: typeof configRowStatus;
  /** The spawn. Injected so every test runs without one. Defaults to runFold. */
  run?(input: FoldSpawnInput): Promise<FoldRun>;
  /** The write. Injected so a test proves a refusal writes nothing. */
  write?(
    repoPath: string,
    answer: ArchEnrichAnswer
  ): Promise<string[]>;
  /**
   * Count painted boxes for the enriched document over the same facts, being
   * map binding rule 2. Injected because the map composer lives above this
   * module's imports in ipc.ts.
   */
  paint(document: ArchDocument, input: ArchPassInput): {
    painted: number;
    groupsTotal: number;
  };
  /** The one record write, and it only ever appends. */
  append(record: ArchPassRunRecord & { repoPath: string }): void;
  now?(): number;
}

/**
 * Is this agent allowed to run RIGHT NOW under the Phase 23 gate? The same
 * reading the offer list uses (fold/options.ts), asked again at the spawn.
 */
export function archAgentConfirmed(
  agentId: string,
  table: typeof currentAgentTable = currentAgentTable,
  status: typeof configRowStatus = configRowStatus
): boolean {
  const entry = table().find((row) => row.id === agentId);
  return entry !== undefined && harnessConfirmedNow(entry, status);
}

/** One runner per process, held by the arch registrar. */
export class ArchPassRunner {
  private readonly deps: ArchPassDeps;
  private readonly now: () => number;
  private readonly inFlight = new Set<string>();
  /** The fold's suspension discipline, the one copy (fold/suspension.ts). */
  private readonly suspender: HarnessSuspension;

  constructor(deps: ArchPassDeps) {
    this.deps = deps;
    this.now = deps.now ?? ((): number => Date.now());
    this.suspender = new HarnessSuspension({
      threeFailuresSentence:
        'Three passes in a row did not finish, so Tortie has stopped the pass for now.',
      now: this.now,
      onSuspend: (report) => {
        logEvent('arch', 'warn', 'arch.pass.suspended', 'the enrichment pass is suspended', {
          repoPath: report.key,
          because: report.cause,
          untilMs: report.untilMs,
          consecutiveFailures: report.consecutiveFailures
        });
      }
    });
  }

  /** Is a pass running for this repository right now? */
  running(repoPath: string): boolean {
    return this.inFlight.has(repoPath);
  }

  /** One sentence when the pass is suspended, null otherwise. */
  suspension(): string | null {
    return this.suspender.suspension();
  }

  /**
   * Run one enrichment. Never throws: the caller branches on the outcome,
   * and a refused gesture is an answer rather than an exception.
   */
  async run(input: ArchPassInput): Promise<ArchPassOutcome> {
    const refusal = this.gate(input.repoPath);
    if (refusal !== null) {
      logEvent('arch', 'info', 'arch.pass.refused', 'an enrichment gesture was refused', {
        repoPath: input.repoPath,
        reason: refusal
      });
      return { started: false, refusal, run: null };
    }
    const choice = this.deps.choice();
    const agentId = choice.agentId ?? '';
    const model = choice.model ?? '';
    const recipe = archRecipeFor(agentId);
    if (recipe === null || !recipeHasModel(recipe, model)) {
      return { started: false, refusal: 'no-recipe', run: null };
    }

    this.inFlight.add(input.repoPath);
    const startedAt = this.now();
    try {
      const composed = composeArchEnrichPrompt({
        document: input.document,
        trackedFiles: input.trackedFiles,
        imports: input.imports
      });
      const spawnOne = this.deps.run ?? runFold;
      const run = await spawnOne({
        recipe,
        model,
        systemPrompt: ARCH_ENRICH_SYSTEM_PROMPT,
        prompt: composed.prompt
      });
      this.suspender.readWindow(run, input.repoPath);

      const base = {
        repoPath: input.repoPath,
        agentId,
        model,
        recipeVersion: recipe.version,
        startedAt,
        wallMs: this.now() - startedAt
      };
      const finish = (
        verdict: 'kept' | 'refused' | 'failed',
        reason: string | null,
        detail: string | null,
        painted: number | null,
        groupsTotal: number | null,
        components: number | null,
        suggestions: string[]
      ): ArchPassOutcome => {
        const record: ArchPassRunRecord & { repoPath: string } = {
          ...base,
          verdict,
          reason,
          detail,
          painted,
          groupsTotal,
          components,
          suggestions
        };
        this.deps.append(record);
        logEvent('arch', 'info', 'arch.pass.ran', 'an enrichment pass finished', {
          repoPath: input.repoPath,
          agentId,
          model,
          verdict,
          reason,
          detail,
          wallMs: record.wallMs,
          painted,
          costUsd: run.costUsd
        });
        const { repoPath: _repoPath, ...face } = record;
        return { started: true, refusal: null, run: face };
      };

      if (run.outcome !== 'ok' || run.text === null) {
        this.suspender.noteFailure(run, input.repoPath);
        return finish(
          'failed',
          run.reason ?? run.outcome,
          null,
          null,
          null,
          null,
          []
        );
      }
      const ruling = validateArchAnswer(run.text, {
        document: input.document,
        factBlock: composed.factBlock
      });
      if (ruling.kept === null) {
        // A refusal is the validator doing its job, not the harness failing,
        // so it does not count toward the suspension. It IS recorded with its
        // name, the fold's rule that refusals are rows and never silence.
        // The detail travels with it: the token says WHICH rule, and the
        // validator's sentence says WHERE, being the field and the reason.
        this.suspender.reset();
        return finish(
          'refused',
          ruling.refusal ?? 'refused',
          ruling.detail,
          null,
          null,
          null,
          []
        );
      }
      this.suspender.reset();

      const write =
        this.deps.write ??
        (async (repoPath: string, answer: ArchEnrichAnswer): Promise<string[]> =>
          writeArchFiles(repoPath, planEnrichedWrite(answer)));
      await write(input.repoPath, ruling.kept);

      // Map binding rule 2: the map is a proof surface, so the painted count
      // is computed on every kept write and a write that painted nothing is
      // recorded FAILED even though every file landed.
      const enriched: ArchDocument = {
        contract: ruling.kept.contract,
        components: ruling.kept.components,
        edges: ruling.kept.edges,
        baseline: input.document.baseline,
        problems: []
      };
      const coverage = this.deps.paint(enriched, input);
      if (coverage.painted === 0) {
        return finish(
          'failed',
          'no-painted-box',
          null,
          coverage.painted,
          coverage.groupsTotal,
          ruling.kept.components.length,
          ruling.kept.suggestions
        );
      }
      return finish(
        'kept',
        null,
        null,
        coverage.painted,
        coverage.groupsTotal,
        ruling.kept.components.length,
        ruling.kept.suggestions
      );
    } catch (err) {
      this.suspender.countFailure(input.repoPath);
      logEvent('arch', 'warn', 'arch.pass.ran', 'an enrichment pass threw', {
        repoPath: input.repoPath,
        error: String(err)
      });
      const record: ArchPassRunRecord = {
        verdict: 'failed',
        reason: 'error',
        detail: String(err),
        agentId,
        model,
        recipeVersion: recipe.version,
        startedAt,
        wallMs: this.now() - startedAt,
        painted: null,
        groupsTotal: null,
        components: null,
        suggestions: []
      };
      // A thrown run is a row like every other run: the store is what makes
      // a failure rate readable after a restart. The append is guarded so
      // this method keeps its own promise of never throwing.
      try {
        this.deps.append({ ...record, repoPath: input.repoPath });
      } catch {
        // The record still reaches the caller's face below.
      }
      return {
        started: true,
        refusal: null,
        run: record
      };
    } finally {
      this.inFlight.delete(input.repoPath);
    }
  }

  // -------------------------------------------------------------------------
  // The gate, taken before anything spawns
  // -------------------------------------------------------------------------

  private gate(repoPath: string): ArchPassRefusal | null {
    const choice = this.deps.choice();
    if (choice.agentId === null || choice.model === null) return 'no-choice';
    if (this.suspension() !== null) return 'suspended';
    if (this.inFlight.has(repoPath)) return 'in-flight';
    const confirmed = archAgentConfirmed(
      choice.agentId,
      this.deps.table ?? currentAgentTable,
      this.deps.status ?? configRowStatus
    );
    if (!confirmed) return 'not-confirmed';
    const recipe = archRecipeFor(choice.agentId);
    if (recipe === null || !recipeHasModel(recipe, choice.model)) {
      return 'no-recipe';
    }
    return null;
  }

}
