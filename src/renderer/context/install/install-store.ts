/**
 * The install flow, as state. This is the caller the install modules did not
 * have.
 *
 * Phase 22 shipped `InstallDialog`, `PreviewCard`, `evaluateInstall`,
 * `pinBlocker`, `checkPlanShape` and the whole main-process spawn contract, all
 * tested, and nothing anywhere constructed an `InstallPlan`, mounted the
 * confirm, or made either of the two HTTP calls the design depends on. A user
 * could not install, remove, update or re-check a skill from Tortie. This store
 * is the flow that joins them, and every step of it is one of the four
 * requirements made operational.
 *
 * ## The steps, and which requirement each one carries
 *
 *  1. `search`      discovery, `GET skills.sh/api/search` through main.
 *  2. `choose`      reads the SKILL.md and the four-scanner audit BEFORE
 *                   anything is drawn (requirement 4), and runs the
 *                   executable-content scan over what it read.
 *  3. `plan`        main builds the command; the adapter checks that the line
 *                   shown is the line that would run.
 *  4. `requestRun`  opens the confirm, which shows the full command line
 *                   (requirement 3). Nothing spawns until a human presses it.
 *  5. `confirm`     the one call that spawns, then the pin is written from
 *                   Tortie's own hash of what landed (requirement 2), then the
 *                   panel re-reads from disk.
 *
 * ## Three rules this file does not bend
 *
 * - **The renderer never assembles argv.** Every plan comes from
 *   `context:skillsPlan`, and `context:skillsRun` re-plans from the typed
 *   operation before it spawns, so what is on screen is a thing to look at and
 *   never a thing to trust.
 * - **Nothing is claimed until a fresh read confirms it.** A run that exits 0
 *   is followed by a scan of the filesystem. No row is drawn from a run result.
 * - **A failure names the command that produced it.** The dialog stays open and
 *   reports it under the same command line it showed beforehand.
 */

import { create } from 'zustand';
import type {
  ContextSkillPinCheck,
  ContextSkillsRunInput
} from '@shared/ipc';
import type {
  SkillPreviewResult,
  SkillSearchHit,
  SkillsOperation,
  SkillsPlan
} from '@shared/skills';
import type { ContextEntry } from '../model';
import { scanPreview } from '../surface/executable-scan';
import type {
  AuditRecord,
  AuditRisk,
  InstallPlan,
  InstallTarget,
  PreviewSubject
} from '../surface/model';
import { skillsBridge, contextBridge } from '../bridge';
// One sentence, one home: the picker in ../enable shows the same words as
// this sheet's disabled rows, and the shared constant lives in the module
// with no side effects so tests can read it without a DOM.
import { NO_CLI_NAME_REASON } from '../enable/enable-model';
import { useContext } from '../store';

export { NO_CLI_NAME_REASON };
import type { BlockerCode } from './install-gate';
import type { InstallDialogSpec } from './InstallDialog';
import { toInstallPlan } from './plan-adapter';
import {
  enableSkillCopy,
  installSkillCopy,
  removeSkillCopy,
  changedAfterApprovalCopy,
  type ConfirmCopy
} from './install-copy';

/**
 * The agents Tortie will offer as install targets.
 *
 * It is NOT every registry agent. `skillsCliTargets` in main knows which agents
 * the CLI has a name for, and two of Tortie's ten are absent from its table
 * entirely. Rather than duplicate that table here, the sheet offers the agents
 * the current scan actually read and lets main's `installCommand` refuse a name
 * it does not know, which it does by throwing rather than by running a wrong
 * command.
 */
const RISK_WORDS: ReadonlySet<string> = new Set([
  'safe',
  'low',
  'medium',
  'high',
  'critical'
]);

function toAuditRecord(
  records: Record<string, Record<string, { risk: string; alerts?: number; score?: number; analyzedAt?: string }>>,
  skill: string
): AuditRecord | null {
  const row = records[skill];
  if (row === undefined) return null;
  const out: AuditRecord = {};
  for (const [scanner, result] of Object.entries(row)) {
    if (!RISK_WORDS.has(result.risk)) continue;
    const value = {
      risk: result.risk as AuditRisk,
      ...(result.alerts !== undefined ? { alerts: result.alerts } : {}),
      ...(result.score !== undefined ? { score: result.score } : {}),
      ...(result.analyzedAt !== undefined ? { analyzedAt: result.analyzedAt } : {})
    };
    if (scanner === 'ath') out.ath = value;
    else if (scanner === 'socket') out.socket = value;
    else if (scanner === 'snyk') out.snyk = value;
    else if (scanner === 'zeroleaks') out.zeroleaks = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export type InstallStep = 'search' | 'preview';

export interface InstallFlowState {
  /** The sheet is open. It is a modal, so nothing else is reachable while it is. */
  open: boolean;
  step: InstallStep;

  /** Where the install will land. Global is the CLI's own default. */
  scope: 'global' | 'project';
  /** The project root, for a project-scoped operation. Null disables that scope. */
  projectRoot: string | null;

  query: string;
  searching: boolean;
  hits: SkillSearchHit[];
  searchProblem: string | null;

  /** Tortie id to CLI name, so the command never carries a Tortie id. */
  cliNames: Record<string, string>;

  /** The chosen source and skill. */
  chosen: SkillSearchHit | null;
  loadingSubject: boolean;
  subject: PreviewSubject | null;
  /** Why the preview could not be read. The gate turns this into a refusal. */
  subjectProblem: string | null;

  targets: InstallTarget[];
  acknowledged: BlockerCode[];

  plan: InstallPlan | null;
  /** Main's own plan, kept so the run re-sends the typed operation. */
  operation: SkillsOperation | null;
  planProblem: string | null;
  /** Set when the line shown is not the line that would run. Always hard. */
  commandMismatch: string | null;

  /** The confirm. Null when nothing is being confirmed. */
  confirm: InstallDialogSpec | null;
  /** The operation the confirm will run, kept off the spec so it cannot be forged. */
  confirmOperation: SkillsOperation | null;
  /** After a successful run, the skill directory to pin, and what to call it. */
  confirmPin: { name: string; source: string; agents: string[] } | null;
  /**
   * The directory a re-approval will re-pin. Set only by `reviewPin`, which
   * runs no command: re-approving is Tortie writing down its own hash of what
   * is on disk now, which is exactly what "the user looked and said yes" means.
   */
  pendingPinPath: string | null;

  openSheet(input: {
    query?: string;
    projectRoot: string | null;
    agents: readonly AgentChoice[];
    source?: string;
    skill?: string;
    preselect?: readonly string[];
  }): void;
  close(): void;
  setQuery(next: string): void;
  setScope(next: 'global' | 'project'): void;
  search(): Promise<void>;
  choose(hit: SkillSearchHit): Promise<void>;
  back(): void;
  toggleTarget(agentId: string): void;
  acknowledge(code: BlockerCode, on: boolean): void;
  /** Open the confirm for the plan currently on screen. Never runs anything. */
  requestInstall(): void;
  /** Open the confirm for removing an installed skill. */
  requestRemove(entry: ContextEntry): Promise<void>;
  /**
   * Open the confirm for widening an installed skill to more agents (Phase 26
   * item 3). The picker in `../enable/` decided WHO; this builds the plan and
   * opens the same confirm every other write goes through. `agents` is the
   * full widened set — the agents already on disk plus the ones being added —
   * because the CLI re-run names them all.
   */
  requestEnable(input: {
    name: string;
    source: string;
    scope: 'global' | 'project';
    projectRoot: string | null;
    /** Tortie id and CLI name for every agent the command will name. */
    agents: readonly { id: string; cliName: string }[];
    /** Display names of the agents being ADDED, for the confirm's sentence. */
    addedNames: readonly string[];
  }): Promise<void>;
  /** Open the confirm for updating one installed skill. */
  requestUpdate(entry: ContextEntry): Promise<void>;
  /** Ask again about a skill whose bytes no longer match what was approved. */
  reviewPin(entry: ContextEntry, pin: ContextSkillPinCheck): void;
  cancelConfirm(): void;
  /** The ONE call that spawns. It runs what the confirm showed and nothing else. */
  runConfirmed(): Promise<void>;
}

/**
 * The agent rows the picker shows.
 *
 * `cliName` is the agent's name IN THE SKILLS CLI's vocabulary, which is not
 * Tortie's id: Claude Code is `claude` here and `claude-code` there. A null one
 * cannot be a target, because two of Tortie's launchable agents are absent from
 * the CLI's table of 76 entirely. That row is DISABLED WITH THE REASON rather
 * than hidden, so a user looking for DeepSeek finds out why it is not there.
 */
export interface AgentChoice {
  id: string;
  name: string;
  cliName: string | null;
}

function targetsFrom(
  agents: readonly AgentChoice[],
  preselect: readonly string[]
): InstallTarget[] {
  const chosen = new Set(preselect);
  return agents.map((agent) => ({
    agentId: agent.id,
    agentName: agent.name,
    selected: agent.cliName !== null && chosen.has(agent.id),
    unavailableReason: agent.cliName === null ? NO_CLI_NAME_REASON : null
  }));
}

/** Where the CLI puts a canonical skill. One place, used by the pin. */
function canonicalSkillPath(entry: ContextEntry): string {
  // `realPath` is `…/<name>/SKILL.md` with every symlink resolved, which is the
  // canonical directory the CLI installed into. The pin is keyed by the
  // DIRECTORY, because the hash covers the whole folder including `scripts/`.
  const path = entry.realPath !== '' ? entry.realPath : entry.sourcePath;
  return path.replace(/\/SKILL\.md$/, '');
}

export const useInstallFlow = create<InstallFlowState>((set, get) => {
  /** Ask main for a plan and adapt it, or record why there is none. */
  const buildPlan = async (
    operation: SkillsOperation,
    displayName: string
  ): Promise<{ plan: InstallPlan | null; problem: string | null; mismatch: string | null; skillsPlan: SkillsPlan | null }> => {
    const api = skillsBridge();
    if (api === null) {
      return {
        plan: null,
        skillsPlan: null,
        mismatch: null,
        problem: 'This build of Tortie cannot run the skills CLI, so nothing can be installed from here.'
      };
    }
    const input: ContextSkillsRunInput = {
      operation,
      ...(get().projectRoot !== null ? { projectRoot: get().projectRoot as string } : {})
    };
    const answer = await api.skillsPlan(input);
    if (answer.refused) {
      return { plan: null, skillsPlan: null, mismatch: null, problem: answer.message };
    }
    const adapted = toInstallPlan(answer.plan, { displayName });
    return {
      plan: adapted.plan,
      skillsPlan: answer.plan,
      mismatch: adapted.mismatch,
      problem: null
    };
  };

  /** Re-plan for the current selection. Called whenever the selection moves. */
  const replan = async (): Promise<void> => {
    const { chosen, targets, scope, cliNames } = get();
    if (chosen === null) {
      set({ plan: null, operation: null, planProblem: null, commandMismatch: null });
      return;
    }
    // The CLI's names, never Tortie's ids. `-a claude` names an agent the CLI
    // has never heard of; the name it wants is `claude-code`.
    const agents = targets
      .filter((t) => t.selected)
      .map((t) => cliNames[t.agentId])
      .filter((name): name is string => name !== undefined);
    if (agents.length === 0) {
      set({ plan: null, operation: null, planProblem: null, commandMismatch: null });
      return;
    }
    const operation: SkillsOperation = {
      kind: 'install',
      scope,
      source: chosen.source,
      skills: [chosen.name],
      agents
    };
    const built = await buildPlan(operation, chosen.name);
    set({
      plan: built.plan,
      operation: built.plan === null ? null : operation,
      planProblem: built.problem,
      commandMismatch: built.mismatch
    });
  };

  return {
    open: false,
    step: 'search',
    scope: 'global',
    projectRoot: null,
    query: '',
    cliNames: {},
    searching: false,
    hits: [],
    searchProblem: null,
    chosen: null,
    loadingSubject: false,
    subject: null,
    subjectProblem: null,
    targets: [],
    acknowledged: [],
    plan: null,
    operation: null,
    planProblem: null,
    commandMismatch: null,
    confirm: null,
    confirmOperation: null,
    confirmPin: null,
    pendingPinPath: null,

    openSheet(input) {
      set({
        open: true,
        step: 'search',
        projectRoot: input.projectRoot,
        query: input.query ?? '',
        hits: [],
        searchProblem: null,
        chosen: null,
        subject: null,
        subjectProblem: null,
        acknowledged: [],
        plan: null,
        operation: null,
        planProblem: null,
        commandMismatch: null,
        targets: targetsFrom(input.agents, input.preselect ?? []),
        cliNames: Object.fromEntries(
          input.agents
            .filter((agent) => agent.cliName !== null)
            .map((agent) => [agent.id, agent.cliName as string])
        )
      });
      if ((input.query ?? '').trim() !== '') void get().search();
      // "Enable for…" arrives with a source and a skill already known, so it
      // skips discovery and lands straight on the preview.
      if (input.source !== undefined && input.skill !== undefined) {
        void get().choose({
          id: `${input.source}/${input.skill}`,
          name: input.skill,
          source: input.source,
          installs: null
        });
      }
    },

    close() {
      set({ open: false, confirm: null, confirmOperation: null, confirmPin: null });
    },

    setQuery(next) {
      set({ query: next });
    },

    setScope(next) {
      set({ scope: next });
      void replan();
    },

    async search() {
      const api = contextBridge();
      const query = get().query.trim();
      if (api === null || typeof api.skillsSearch !== 'function') {
        set({ searchProblem: 'This build of Tortie cannot search for skills.', hits: [] });
        return;
      }
      if (query === '') {
        set({ hits: [], searchProblem: null });
        return;
      }
      set({ searching: true, searchProblem: null });
      try {
        const answer = await api.skillsSearch({ query });
        if (get().query.trim() !== query) return;
        set({ hits: answer.hits, searchProblem: answer.problem });
      } catch (err) {
        set({
          hits: [],
          searchProblem: err instanceof Error ? err.message : String(err)
        });
      } finally {
        set({ searching: false });
      }
    },

    async choose(hit) {
      set({
        chosen: hit,
        step: 'preview',
        loadingSubject: true,
        subject: null,
        subjectProblem: null,
        acknowledged: [],
        plan: null,
        operation: null,
        planProblem: null,
        commandMismatch: null
      });
      const api = contextBridge();
      if (api === null || typeof api.skillsPreview !== 'function') {
        set({
          loadingSubject: false,
          subjectProblem: 'This build of Tortie cannot read a skill before installing it.'
        });
        return;
      }

      // REQUIREMENT 4. Both reads happen before anything is drawn, so the scan
      // and the audit are on screen above the install control rather than
      // arriving after the user has already pressed it.
      let preview: SkillPreviewResult;
      try {
        preview = await api.skillsPreview({ source: hit.source, skill: hit.name });
      } catch (err) {
        set({
          loadingSubject: false,
          subjectProblem: err instanceof Error ? err.message : String(err)
        });
        return;
      }
      if (get().chosen?.id !== hit.id) return;

      let audit: AuditRecord | null = null;
      try {
        const answer = await api.skillsAudit({ source: hit.source, skills: [hit.name] });
        audit = toAuditRecord(answer.records, hit.name);
      } catch {
        // A scanner that could not be reached is "not scanned", which the card
        // says out loud. It is never rendered as safe.
        audit = null;
      }
      if (get().chosen?.id !== hit.id) return;

      const scan = scanPreview(preview.body, preview.files, preview.path ?? '');
      const subject: PreviewSubject = {
        category: 'skill',
        name: hit.name,
        source: hit.source,
        // The registry's search response carries no description, so the first
        // non-empty line of the body stands in and it is labelled as the body.
        description: (preview.body ?? '').split('\n').find((l) => l.trim() !== '')?.slice(0, 300) ?? '',
        commit: preview.commit,
        license: null,
        body: preview.body,
        scan,
        audit,
        tokenEstimate:
          preview.body === null
            ? null
            : {
                kind: 'proxy',
                tokens: null,
                descriptionBytes: preview.body.length,
                fileCount: preview.files.length
              }
      };
      set({
        loadingSubject: false,
        subject,
        subjectProblem: preview.problem
      });
      await replan();
    },

    back() {
      set({ step: 'search', chosen: null, subject: null, plan: null, operation: null });
    },

    toggleTarget(agentId) {
      set({
        targets: get().targets.map((t) =>
          t.agentId === agentId ? { ...t, selected: !t.selected } : t
        )
      });
      void replan();
    },

    acknowledge(code, on) {
      const set0 = new Set(get().acknowledged);
      if (on) set0.add(code);
      else set0.delete(code);
      set({ acknowledged: [...set0] });
    },

    requestInstall() {
      const { plan, operation, subject, chosen, targets } = get();
      if (plan === null || operation === null || subject === null || chosen === null) return;
      set({
        confirm: {
          copy: installSkillCopy(chosen.name, chosen.source, subject.scan, subject.audit),
          plan,
          provenance: [
            chosen.source,
            subject.commit === null ? 'commit unknown' : `commit ${subject.commit}`
          ],
          agentGateNote:
            'Your agent may ask again the first time it loads this. Tortie never writes an approval into an agent configuration to skip that.',
          failure: null,
          running: false
        },
        confirmOperation: operation,
        confirmPin: {
          name: chosen.name,
          source: chosen.source,
          agents: targets.filter((t) => t.selected).map((t) => t.agentId)
        }
      });
    },

    async requestRemove(entry) {
      const operation: SkillsOperation = { kind: 'remove', skill: entry.name };
      const built = await buildPlan(operation, entry.name);
      if (built.plan === null) {
        set({
          confirm: {
            copy: removeSkillCopy(entry.name, false),
            plan: null,
            failure: {
              operation: 'removal',
              commandLine: '',
              exitCode: null,
              timedOut: false,
              stderr: built.problem ?? 'Tortie could not build that command.'
            },
            running: false
          },
          confirmOperation: null,
          confirmPin: null
        });
        return;
      }
      set({
        confirm: {
          copy: removeSkillCopy(entry.name, entry.sourcePath !== entry.realPath),
          plan: built.plan,
          failure: null,
          running: false
        },
        confirmOperation: built.mismatch === null ? operation : null,
        confirmPin: null
      });
    },

    async requestEnable(input) {
      // The scope and the project root feed two later reads: `buildPlan`
      // attaches the root to the plan call, and `runConfirmed` records the pin
      // from `get().scope`. Both must describe THIS operation, not whatever
      // the sheet was last opened on.
      set({ scope: input.scope, projectRoot: input.projectRoot });
      const operation: SkillsOperation = {
        kind: 'install',
        scope: input.scope,
        source: input.source,
        skills: [input.name],
        agents: input.agents.map((agent) => agent.cliName)
      };
      const built = await buildPlan(operation, input.name);
      const problem = built.problem ?? built.mismatch;
      set({
        confirm: {
          copy: enableSkillCopy(input.name, input.source, input.addedNames),
          plan: built.plan,
          provenance: [input.source],
          failure:
            problem === null
              ? null
              : {
                  operation: 'enable',
                  commandLine: '',
                  exitCode: null,
                  timedOut: false,
                  stderr: problem
                },
          running: false
        },
        // A plan that failed to build, or a shown line that is not the line
        // that would run, leaves nothing to confirm. Same rule as remove.
        confirmOperation:
          built.plan !== null && built.mismatch === null ? operation : null,
        confirmPin:
          built.plan === null
            ? null
            : {
                name: input.name,
                source: input.source,
                agents: input.agents.map((agent) => agent.id)
              }
      });
    },

    async requestUpdate(entry) {
      const operation: SkillsOperation = { kind: 'update', skill: entry.name };
      const built = await buildPlan(operation, entry.name);
      const copy: ConfirmCopy = {
        title: `Update ${entry.name}?`,
        body: [
          'This fetches the skill from its source again and replaces what is on disk.',
          // The CLI has no way to say whether an update exists without applying
          // it: `check` is a plain alias for `update` in its dispatch switch.
          // So this is an action rather than an indicator, and the copy says so.
          'Tortie cannot tell you in advance whether there is anything new. The skills CLI has no check that does not also apply.'
        ],
        confirmLabel: 'Update',
        cancelLabel: 'Cancel',
        destructive: false
      };
      set({
        confirm: {
          copy,
          plan: built.plan,
          failure:
            built.problem === null
              ? null
              : {
                  operation: 'update',
                  commandLine: '',
                  exitCode: null,
                  timedOut: false,
                  stderr: built.problem
                },
          running: false
        },
        confirmOperation:
          built.plan !== null && built.mismatch === null ? operation : null,
        confirmPin:
          built.plan === null
            ? null
            : { name: entry.name, source: '', agents: [...entry.agents] }
      });
    },

    reviewPin(entry, pin) {
      set({
        confirm: {
          copy: changedAfterApprovalCopy(entry.name),
          plan: null,
          provenance: [
            `You approved ${pin.pinnedHash.slice(0, 12)}`,
            pin.currentHash === null
              ? 'Tortie cannot read it now'
              : `It is now ${pin.currentHash.slice(0, 12)}`
          ],
          blastRadius:
            'It is still on disk, so your agents still load it. Tortie has only switched it off in this list. Remove it if you want it gone.',
          failure: null,
          running: false
        },
        // Re-approving runs no command: it re-records Tortie's own hash.
        confirmOperation: null,
        confirmPin: {
          name: entry.name,
          source: pin.source,
          agents: [...entry.agents]
        },
        pendingPinPath: canonicalSkillPath(entry)
      });
    },

    cancelConfirm() {
      set({
        confirm: null,
        confirmOperation: null,
        confirmPin: null,
        pendingPinPath: null
      });
    },

    async runConfirmed() {
      const { confirm, confirmOperation, confirmPin } = get();
      if (confirm === null) return;
      const api = skillsBridge();

      // Re-approval: no command runs. Tortie re-records its own hash of what is
      // on disk now, which is the whole of "the user looked and said yes".
      if (confirmOperation === null && confirmPin !== null && confirm.plan === null) {
        const path = get().pendingPinPath;
        if (path !== null && api !== null && typeof api.skillPinRecord === 'function') {
          // Re-approval has a path, because it came off a row that is on
          // screen. It re-records Tortie's own hash of what is there NOW.
          await api.skillPinRecord({
            path,
            name: confirmPin.name,
            source: confirmPin.source,
            agents: confirmPin.agents
          });
        }
        set({
          confirm: null,
          confirmOperation: null,
          confirmPin: null,
          pendingPinPath: null
        });
        useContext.getState().refresh();
        return;
      }

      if (api === null || confirmOperation === null) return;

      set({ confirm: { ...confirm, running: true, failure: null } });
      const input: ContextSkillsRunInput = {
        operation: confirmOperation,
        ...(get().projectRoot !== null ? { projectRoot: get().projectRoot as string } : {})
      };
      const result = await api.skillsRun(input);

      if (!result.ok) {
        set({
          confirm: {
            ...confirm,
            running: false,
            failure: {
              operation: labelFor(confirmOperation),
              commandLine: result.commandLine,
              exitCode: result.exitCode,
              timedOut: result.timedOut,
              stderr:
                result.stderrTail.trim() === ''
                  ? (result.failure ?? '')
                  : result.stderrTail
            }
          }
        });
        return;
      }

      // Exit 0. Nothing is claimed yet: the panel re-reads from disk, and the
      // pin is written from Tortie's OWN hash of what actually landed.
      set({
        confirm: null,
        confirmOperation: null,
        confirmPin: null,
        pendingPinPath: null,
        open: false
      });
      const store = useContext.getState();
      store.refresh();

      // REQUIREMENT 2's producer. It runs on the success path only, and it
      // sends the NAME rather than a path: the panel's list is a filesystem
      // read that has not happened yet at this moment, so there is no row here
      // to read a path off. Main resolves the canonical directory with the
      // reader's own home resolution and hashes what actually landed.
      if (confirmPin !== null && typeof api.skillPinRecord === 'function') {
        await api.skillPinRecord({
          name: confirmPin.name,
          source: confirmPin.source,
          agents: confirmPin.agents,
          scope: get().scope,
          ...(get().projectRoot !== null ? { projectRoot: get().projectRoot as string } : {})
        });
      }
      if (confirmOperation.kind === 'remove' && typeof api.skillPinForget === 'function') {
        const path = pinPathFor(confirmOperation.skill);
        if (path !== null) await api.skillPinForget(path);
      }
      // One more read, so the pin the row is drawn against is the one just
      // written rather than the one from before the install.
      store.refresh();
    }
  };
});

/**
 * The canonical directory one skill landed in, read back out of the scan rather
 * than assembled from a home directory here.
 *
 * The CLI installs one canonical copy into `~/.agents/skills/<name>` and
 * symlinks it into each agent's directory, and the reader already resolves
 * every symlink to that copy. Reading the resolved path off the row is what
 * keeps this from being a second opinion about where the CLI puts things.
 */
/** The operation in the user's words, for a failure sentence. */
function labelFor(operation: SkillsOperation): string {
  if (operation.kind === 'install') return 'install';
  if (operation.kind === 'remove') return 'removal';
  if (operation.kind === 'update') return 'update';
  if (operation.kind === 'restoreProject') return 'restore';
  return 'command';
}

function pinPathFor(name: string): string | null {
  const scan = useContext.getState().scan;
  if (scan === null) return null;
  const entry = scan.entries.find(
    (row) => row.category === 'skill' && row.name === name
  );
  return entry === undefined ? null : canonicalSkillPath(entry);
}
