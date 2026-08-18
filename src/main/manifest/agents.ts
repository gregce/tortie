/**
 * Per-agent launch/resume specs — how a session's conversation id is fixed or
 * found, and what argv brings that exact conversation back after a reboot.
 *
 * The manifest's job (research 02): capture each agent's conversation id as
 * early as possible so a restore can arm `<agent> resume <id>`. Phase 13.5
 * made that true for every agent that supports it instead of claude alone
 * (docs/research/22-resume-audit.md):
 *
 *  - PRE-ASSIGN (claude, gemini, pi) — gmux generates the uuid, puts it on
 *    the LAUNCH argv, and arms `resumeArgv` before the process exists. No
 *    watcher, no race, no timeout path. pi is the purest case in the set:
 *    `pi --session-id <id>` is idempotent, so launch argv === resume argv.
 *  - PRE-ASSIGN BY SIDE COMMAND (cursor) — `cursor-agent create-chat` prints
 *    a fresh chat id, and `cursor-agent --resume <id>` starts INTO it, so the
 *    first launch and every later restore use the same argv. Async, hence
 *    resolveLaunchSpec(); a failure degrades to a bare launch, never a
 *    failed create.
 *  - HARVEST (codex, muse, qwen, deepseek, antigravity) — the id only exists
 *    once the agent has written it, so a store watcher reads it back and
 *    arms `resumeArgv` a beat later. One watcher for all of them lives in
 *    ./harvest.ts.
 *  - shell — plain $SHELL; argv+cwd only, nothing to resume.
 *
 * WHAT WAS HERE BEFORE, and why it is gone: every agent except claude and
 * codex fell into a `default:` branch that set `idCapture: 'store-watch'` and
 * left `resumeArgv` undefined forever, because no store watcher was ever
 * built. The mode name read like a strategy and was a TODO. There is now no
 * default branch at all — the launch spec is composed from registry DATA
 * (`resume.idCapture`), so an agent whose capture route is unknown says
 * 'unsupported' out loud instead of pretending.
 *
 * Ownership: src/main/manifest/**. Pure Node (no Electron import) so it can
 * be unit-tested outside the app.
 */

import { randomUUID } from 'node:crypto';
import type { LaunchableAgentKind } from '@shared/types';
import { runGuarded } from '../proc/guarded';
import { AGENT_FLAG_PRESETS } from '../agents/flags';
import {
  getLaunchableEntry,
  launchArgvFor,
  registryResumeArgv,
  resumeArgvFor,
  type AgentHarvestKey,
  type LaunchableEntryLike,
  type ResumeStrategy
} from '../agents/registry';
// PHASE 23. These two imports are the create path's whole relationship with
// the configuration file, and it is worth saying exactly what they are.
//
// `launchableAgentEntry` reads MEMORY. It is a lookup in the merged table the
// configuration store built at boot, and it has no code that could open a
// file. The rule this phase is built on is that `agents.json` is read at boot,
// on an explicit reload and on a watcher debounce, and never on the path that
// creates a session. Calling this here does not break that rule, and
// `agentOverlayDiskReads()` is the counter a test uses to prove it.
//
// `assertConfigRowMayLaunch` throws when a person has not agreed to the exact
// bytes that are about to run. It is asked here, immediately before the launch
// spec is built, because this is the last place that still knows the launch is
// about to happen.
import { assertConfigRowMayLaunch } from '../config/confirm';
import { executionFieldsOf } from '../config/overlay';
import { launchableAgentEntry } from '../config/store';
// Phase 74. The login flag a shell session carries. It sits in its own module
// rather than here because the restore path needs the same constant and cannot
// import this file, which reaches the configuration domain on purpose. Its
// header has the whole reason.
import { withLoginShellFlag } from './login-shell';
import type { HarvestedSessionId } from './harvest/stores';
// One identity key set for the whole tree (Phase 34). The claim ladder in
// ./harvest/watch.ts and the confidence math below are two readings of the
// same fact about a key, and a second copy would let them disagree.
import { IDENTITY_HARVEST_KEYS } from './harvest/claim-strength';

// ---------------------------------------------------------------------------
// The one door onto the configured agent table
// ---------------------------------------------------------------------------

/**
 * The entry a launch is about to be composed from, and the confirm gate asked
 * before it is handed back.
 *
 * PHASE 23. This is the single place the create path resolves an agent, and
 * every rule the phase makes about launching lives in these few lines.
 *
 * There are three cases and they are deliberately not symmetrical.
 *
 *  1. **A compiled agent nobody configured.** The merged table returns the same
 *     object the compiled registry holds, `executionHash` is null, and the gate
 *     is never asked. This is what happens on every machine with no
 *     `agents.json`, which is nearly all of them, and nothing about it changed.
 *  2. **A row that only renames a compiled agent.** `executionHash` is still
 *     null, because nothing the row supplied can cause a program to run. Giving
 *     Claude Code a nickname must not stop Claude Code launching.
 *  3. **A row that supplies anything executable.** `executionHash` is a value,
 *     and {@link assertConfigRowMayLaunch} throws unless a person has agreed to
 *     that exact value. Change one byte of the argv and the hash moves, so the
 *     old agreement no longer covers it and Tortie asks again.
 *
 * The fallback to the compiled registry is not belt and braces. It is what runs
 * before boot has finished, in every test that never initialises the store, and
 * in the smoke harnesses. `getLaunchableEntry` throws for an unknown id, which
 * is the same loud failure the create path had before this phase.
 */
function launchEntryFor(
  // Not `LaunchableAgentKind`: every caller has already dealt with 'shell',
  // which has no registry entry and no configuration row. Excluding it here
  // leaves exactly `LaunchableAgentId`, so the compiled fallback below needs no
  // cast. A configured id is a string outside that union and reaches this
  // function at runtime through the same widened path every registry agent
  // after claude and codex already takes — see the note on `AgentKind` in
  // src/shared/types.ts, which has been open since Phase 10 and is not this
  // phase's to close.
  agent: Exclude<LaunchableAgentKind, 'shell'>
): LaunchableEntryLike {
  const merged = launchableAgentEntry(agent);
  if (merged === null) return getLaunchableEntry(agent);
  // Null means the row supplied nothing that can run, so there is nothing for
  // a person to have agreed to and nothing to refuse.
  if (merged.executionHash !== null) {
    assertConfigRowMayLaunch(merged.id, executionFieldsOf(merged));
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Launch specs
// ---------------------------------------------------------------------------

/**
 * How this session's conversation id is obtained — the strategy ACTUALLY in
 * force, recorded so the UI and the conformance harness can tell the truth
 * about a session before a reboot rather than after one.
 */
export type IdCaptureMode =
  /** gmux generated the id and passed it on the launch argv. */
  | 'preassigned'
  /** gmux got the id from a side command before spawn (cursor create-chat). */
  | 'preassigned-cmd'
  /** The id will be read out of the agent's store after spawn. */
  | 'store-harvest'
  /**
   * gmux has NO verified capture route for this agent, so nothing was armed.
   * Honest "not yet" — never conflated with "this agent cannot resume".
   * Currently droid alone (not installed on any audited machine).
   */
  | 'unsupported'
  /** No conversation id exists (plain shells). */
  | 'none';

/**
 * Everything the sessions service needs to spawn an agent and everything the
 * manifest needs to resurrect it later.
 */
export interface AgentLaunchSpec {
  agent: LaunchableAgentKind;
  /** Full argv to launch now (argv[0] is the command). */
  argv: string[];
  /** Known at launch for pre-assigned agents; harvested later otherwise. */
  agentSessionId?: string;
  /**
   * Full argv that resumes this exact conversation after a reboot. Armed at
   * spawn for pre-assigned agents; undefined for harvest agents until the
   * watcher in ./harvest.ts resolves (then written by the sessions service).
   */
  resumeArgv?: string[];
  /** Environment deltas to apply at spawn (cursor-agent: FORCE_COLOR=1). */
  env?: Record<string, string>;
  /**
   * Environment variable NAMES to read from the user's login shell at spawn
   * (Phase 33). Empty or absent for every compiled agent.
   *
   * IT CARRIES NAMES AND NEVER VALUES, which is what makes persisting it safe
   * by construction rather than by care. `env` above is written into the
   * manifest row verbatim and replayed at restore, and that is exactly why the
   * resolved values must not travel through it. They are resolved beside the
   * spawn, merged into the tmux `-e` set, and dropped.
   */
  envPassthrough?: string[];
  idCapture: IdCaptureMode;
  /**
   * For harvest agents: which key proves a store record is this pane's, and
   * whether that key is a true identity. 'weak' means two panes started
   * together in one directory are not separable (deepseek, antigravity) and
   * the UI must say so.
   */
  harvestKey?: AgentHarvestKey;
  harvestConfidence?: 'exact' | 'weak';
  /**
   * How a harvested id becomes a resume argv — feed both to
   * registryResumeArgv. Mirrors the registry's resume.strategy / template.
   */
  resumeStrategy?: ResumeStrategy;
  resumeTemplate?: string[];
  /**
   * TRUE when resume only works from the ORIGINAL cwd (pi, qwen). The
   * restore path must NOT substitute a fallback directory for these: qwen
   * fails loudly, pi silently opens a new EMPTY session under the same id.
   *
   * PHASE 21 CHANGED WHAT THIS FIELD IS FOR. It used to be advisory, because
   * it was read at create time and thrown away, and restore re-derived the
   * answer by asking the live registry for the recorded agent id. That is the
   * A8 defect: the registry answers for the agent Tortie launches TODAY, and
   * its `catch` returned `false` for any id the registry no longer launches.
   * For a pi shaped agent `false` means restore opens an empty session that
   * looks resumed. The flag now travels into {@link AgentRecoveryContract} and
   * is persisted with the row, so restore reads what was true at create.
   */
  requiresOriginalCwd?: boolean;
}

// ---------------------------------------------------------------------------
// The recovery contract and the resume provenance — A8 and G6, one shape
// version, one migration (docs/research/33 §2.1)
// ---------------------------------------------------------------------------

/**
 * Shape version of {@link AgentRecoveryContract} and {@link ResumeProvenance}.
 *
 * Both records are written by the same migration and read by the same restore
 * path, so one number covers both. It is stamped on each record rather than
 * held only in the schema, because a row read on its own (a reconstruction, a
 * support dump, a backup capsule) has to be able to say what it may assume.
 */
export const SESSION_CONTRACT_VERSION = 1;

/**
 * How a session's conversation id was obtained, as a fact about THIS session
 * rather than a fact about the agent.
 */
export type ResumeIdSource =
  /** Tortie generated the id and put it on the launch argv. */
  | 'preassigned'
  /** A side command printed a fresh id before spawn (cursor create-chat). */
  | 'preassign-command'
  /** A watcher started at create read the id out of the agent's store. */
  | 'store-harvest'
  /**
   * The same watcher, started at a LATER launch against a remembered spawn
   * time rather than a fresh one. Weaker by construction, and kept separate
   * from 'store-harvest' for that reason: the pane it would have correlated
   * against is gone, so a cwd keyed store is being separated by time alone.
   */
  | 'boot-rescue'
  /** No conversation id exists for this session (plain shells). */
  | 'none'
  /** Tortie has no verified capture route for this agent, so nothing tried. */
  | 'unavailable'
  /**
   * PHASE 72. The session runs on another machine and no conversation id was
   * ever obtained for it.
   *
   * It is a WEAKER source than every local one by construction: nothing was
   * read, so nothing can be checked. `./machines/resume-arming.ts` refuses to
   * type a resume command for a row carrying it, and that refusal has no
   * exception.
   *
   * PHASE 73 NARROWED WHAT IT COVERS and did not remove it. The connected time
   * store harvest reads an agent's own store on a machine while Tortie is
   * connected to it, so four of the thirteen agents can now get an id there and
   * they record `remote-store-harvest` below. This source is what the other
   * nine record, and it is also what every row written before Phase 73 records.
   */
  | 'remote-not-collected'
  /**
   * PHASE 73. A connected-time read of an agent's own store on another machine.
   *
   * It is weaker than 'store-harvest' by construction, in three separate ways,
   * and each one is a fact about the read rather than a caution:
   *
   *  1. No process on that machine was correlated against. A key that names a
   *     process id or an open file descriptor cannot be checked from here, so
   *     the two agents whose keys are those are never read at all.
   *  2. The read happened AFTER the session started rather than beside it. A
   *     local watcher is bounded by a spawn instant it observed. A listing over
   *     a connection is a photograph taken later, so for a key that names a
   *     folder every session of that agent that ever ran in that folder gives
   *     the same answer.
   *  3. The answer is only as fresh as the last connected moment, and the row
   *     records which moment that was.
   *
   * `../machines/remote-harvest.ts` is its one producer, and
   * `../manifest/harvest/remote.ts` is what decides that a key which is not a
   * true identity records 'weak' here whatever it records locally. So the only
   * agent this source ever arms is muse, whose records carry the pane they ran
   * in, and every other row it writes is refused by the arming gate.
   */
  | 'remote-store-harvest';

/**
 * How strongly the recorded conversation id is tied to THIS session.
 *
 * The invariant this type exists to carry: **ambiguity produces 'weak' or
 * 'unknown', never 'exact'.** See {@link deriveResumeConfidence}, which is the
 * only function allowed to produce it from harvest evidence.
 */
export type ResumeConfidence =
  /** Proven. An id Tortie chose, or a key that is a true identity. */
  | 'exact'
  /** Armed, not proven. The tie was broken by time, or the key is weak. */
  | 'weak'
  /** Nothing ever confirmed the record; a timer accepted it. */
  | 'grace-accepted'
  /** An id exists and how it was obtained was not recorded. */
  | 'unknown'
  /** No id, so no claim is being made about one. */
  | 'none';

/**
 * The confidence a harvest may claim, from the evidence it actually had.
 *
 * Four ways to fall short of 'exact', in the order they are checked:
 *
 *  1. A grace timer accepted the record. Nothing confirmed it, so the answer
 *     is 'grace-accepted' whatever the key would have been worth.
 *  2. The descriptor's key is weak by construction (deepseek, antigravity).
 *  3. The key confirmed, but more than one candidate was still in play and
 *     the key is not an identity. Two codex rollouts in one directory both
 *     carry that directory, so both confirm, and the winner was chosen by
 *     being the earliest record at or after the spawn. That is a timing
 *     guess wearing a confirmed key, and it is exactly the case where a
 *     restore hands the user somebody else's conversation with full
 *     confidence.
 *  4. Phase 34. The key confirmed, the directory held exactly one record, and
 *     another watch of the same agent was waiting IN THE SAME FOLDER. That
 *     watch's own record had not been written yet, and when it is, either
 *     session could have been the one that wrote the record this one just
 *     took. `rivals` cannot see that, because the rival is a pane rather than
 *     a file. Without this clause the two pane codex race records 'exact'.
 *
 * The identity key set lives in ./harvest/claim-strength.ts, because the claim
 * ladder reads the same fact about a key and the two must not drift.
 */
export function deriveResumeConfidence(evidence: {
  key: AgentHarvestKey;
  /** The descriptor's own rating of the key. */
  keyConfidence: 'exact' | 'weak';
  viaGraceTimer: boolean;
  /** Candidates still in play when the winner was accepted, winner included. */
  rivals: number;
  /** Other watches of this agent pending in this folder at acceptance. */
  sameCwdWatches?: number;
}): ResumeConfidence {
  if (evidence.viaGraceTimer) return 'grace-accepted';
  if (evidence.keyConfidence === 'weak') return 'weak';
  if (
    !IDENTITY_HARVEST_KEYS.has(evidence.key) &&
    (evidence.rivals > 1 || (evidence.sameCwdWatches ?? 0) > 0)
  ) {
    return 'weak';
  }
  return 'exact';
}

/**
 * Where the conversation id came from, persisted with the row (G6).
 *
 * The raw evidence is kept ALONGSIDE the derived confidence rather than being
 * collapsed into it. `confidence` is what copy and preflight read;
 * `key`, `keyConfidence`, `viaGraceTimer` and `rivals` are what a later
 * investigation reads, and they are the difference between "this was an exact
 * correlation" and "this was the earliest of two files in one folder".
 */
export interface ResumeProvenance {
  v: number;
  source: ResumeIdSource;
  confidence: ResumeConfidence;
  /** Epoch ms the id was fixed (create, or the moment the harvest landed). */
  at: number;
  /** The cwd the correlation was made against, realpath'd. */
  cwd: string;
  /**
   * PHASE 72. Which machine the id was fixed on. Absent means this Mac.
   *
   * A conversation id means something on the machine whose agent store holds
   * it and nowhere else, so the machine is recorded beside the id rather than
   * inferred later from the row's own `machine_id`. The two can disagree: a
   * row can be moved, and a record that carries its own machine says which
   * answer is the older one. `./machines/resume-arming.ts` refuses to arm when
   * this field names a machine other than the one being restored on.
   */
  machineId?: string;
  /** Which key proved the record. Absent for the pre-assigned sources. */
  key?: AgentHarvestKey;
  /** The descriptor's own rating of that key, before rivals were counted. */
  keyConfidence?: 'exact' | 'weak';
  /** TRUE when a timer accepted a record no key ever confirmed. */
  viaGraceTimer?: boolean;
  /**
   * Candidates still in play when the winner was accepted, winner included.
   * 1 means there was nothing to confuse it with. Anything above 1 with a
   * directory key means the answer was separated by time.
   */
  rivals?: number;
  /** Absolute path of the store record that carried the id. */
  storePath?: string;
  /** The store root that record was found under. */
  storeRoot?: string;
  /** The agent CLI version in force when the id was fixed. */
  agentVersion?: string;
  /**
   * Phase 32. On a grace acceptance: how many OTHER watches for the same
   * agent were still pending at that moment. Above 0 the guess was contested,
   * and the boot claim in sessions/core.ts keeps such a row provisional so a
   * rival's exact confirm can still correct it after a restart.
   */
  contestedByWatches?: number;
  /**
   * Phase 34. On any winner: how many OTHER watches of the same agent were
   * pending in the SAME folder at that moment. Above 0 with a folder key
   * means the answer was separated by time even when the store held one
   * record, so `confidence` reads 'weak'. The boot claim keeps such a row
   * takeable, because a folder match is not proof of ownership.
   */
  sameCwdWatches?: number;
  /**
   * Phase 32. On a winner: whose weaker claim this acceptance displaced. The
   * named session's row was corrected at the same moment.
   */
  reclaimedFrom?: string;
  /**
   * Phase 32. On a corrected loser: which session proved ownership of the id
   * this row used to carry, and when. Written with `confidence: 'none'` by
   * the reclaim handler, alongside the fields that describe the withdrawn
   * guess.
   */
  reclaimedBy?: string;
  /** Phase 32. Epoch ms of that correction. */
  reclaimedAt?: number;
}

/**
 * What was true about the agent when this session was created, persisted so
 * restore never has to ask the live registry (A8, plus M9's residue).
 *
 * Every field here is one restore reads for CORRECTNESS. The display name is
 * deliberately absent: it is cosmetic, its fallback is the agent id, and an
 * agent id is an honest thing to show.
 */
export interface AgentRecoveryContract {
  v: number;
  /** Epoch ms this contract was recorded (session create). */
  at: number;
  /** Absolute path of the agent binary this session launched. */
  bin: string;
  /**
   * TRUE when resume only finds the conversation from the ORIGINAL cwd.
   * The field the A8 defect is named for.
   */
  requiresOriginalCwd: boolean;
  /**
   * TRUE when a resume argv that LOST its id attaches to the wrong
   * conversation instead of failing (gemini's bare `--resume` opens the most
   * recent session). A composed resume must never emit an empty slot.
   */
  bareResumeIsDangerous: boolean;
  /** How a conversation id becomes a resume argv. */
  resumeStrategy: ResumeStrategy;
  /** The resume template in force at launch, SESSION_ID_SLOT included. */
  resumeTemplate: string[];
  /**
   * WHERE the original launch flags go in a composed resume argv. deepseek
   * needs 'leading', and the difference is a dead pane versus a restored
   * conversation.
   */
  resumeExtrasPosition: 'leading' | 'trailing';
  /** How this session's id was to be obtained, as decided at launch. */
  idCapture: IdCaptureMode;
  /**
   * The agent's session store in the registry's template form. This is the
   * user's own backstop, and naming it is what makes a drift warning
   * actionable: "the conversation is still in ~/.claude/projects".
   */
  sessionStore: string;
  /** realpath() of the launch cwd — the store key for five of eleven agents. */
  cwdReal: string;
  /**
   * realpath() of the project root at launch. A moved or re-cloned checkout
   * changes this, which is the most likely resume failure after version drift.
   * It is NOT a repository identity: a re-clone at the SAME path is
   * indistinguishable here, and recording a remote URL was left out of this
   * migration deliberately rather than overlooked.
   */
  projectReal: string;
  /**
   * FALSE when the registry says this agent's core mechanics have never been
   * exercised on a real machine. The honest, shipped conformance stamp: the
   * `conformance:resume` report is a build artefact and is not in the bundle,
   * so a session cannot carry its verdict yet.
   */
  captureRouteVerified: boolean;
  /**
   * The build the flag catalogue was read against, or null when nothing was
   * ever verified for this agent.
   */
  flagsVerifiedVersion: string | null;
  /**
   * Whether the flag catalogue had been verified against the build that
   * actually launched this session. 'other-version' is information, not an
   * error: five of nine agents drifted in three days and every load bearing
   * flag survived. Note that two agents print their version in more than one
   * format, so a format change alone can read as 'other-version'.
   */
  flagsVerifiedAgainst: 'this-version' | 'other-version' | 'never' | 'unknown';
}

/** Everything the contract needs that the registry cannot supply. */
export interface RecoveryContractInput {
  /** Absolute path of the agent binary, or the shell. */
  bin: string;
  /** realpath() of the launch cwd. */
  cwdReal: string;
  /** realpath() of the project root. */
  projectReal: string;
  /** The detected agent CLI version, or null when the scan had no answer. */
  agentVersion: string | null;
  /** Epoch ms. */
  at: number;
}

/**
 * Record what was true about the agent at create time.
 *
 * Reading the live registry HERE is correct and is the whole point: the
 * registry describes the agent Tortie is launching in this moment, and this is
 * that moment. Reading it later, on the restore path, is the defect.
 *
 * A plain shell gets a contract too. It costs one small JSON value and it
 * means no reader ever has to fall back to code for any row.
 */
export function buildRecoveryContract(
  agent: LaunchableAgentKind,
  input: RecoveryContractInput,
  spec?: AgentLaunchSpec
): AgentRecoveryContract {
  const base = {
    v: SESSION_CONTRACT_VERSION,
    at: input.at,
    bin: input.bin,
    cwdReal: input.cwdReal,
    projectReal: input.projectReal
  };
  if (agent === 'shell') {
    return {
      ...base,
      requiresOriginalCwd: false,
      bareResumeIsDangerous: false,
      resumeStrategy: 'none',
      resumeTemplate: [],
      resumeExtrasPosition: 'trailing',
      idCapture: 'none',
      sessionStore: '',
      captureRouteVerified: true,
      flagsVerifiedVersion: null,
      flagsVerifiedAgainst: 'never'
    };
  }
  // PHASE 23: the same entry the launch spec was composed from, so a session
  // created by a configured agent records ITS resume mechanics rather than a
  // compiled agent's. This is what makes Phase 21's promise hold for a
  // configured agent too: restore reads the row, and the row has to be right.
  const entry = launchEntryFor(agent);
  // Keyed on the id that was asked for, not on `entry.id`: the flag catalogue
  // covers the eleven LAUNCHABLE agents, while a registry entry's id spans all
  // thirteen and includes the capture-only IDE pair. A configured id is in
  // neither, so `catalog` is undefined and the contract records 'never'
  // verified, which is the honest answer for flags Tortie has not checked.
  const catalog = AGENT_FLAG_PRESETS[agent as keyof typeof AGENT_FLAG_PRESETS];
  const verifiedVersion = catalog?.helpVerifiedVersion ?? null;
  return {
    ...base,
    requiresOriginalCwd: entry.resume.requiresOriginalCwd === true,
    bareResumeIsDangerous: entry.resume.bareResumeIsDangerous === true,
    resumeStrategy: entry.resume.strategy,
    resumeTemplate: [...entry.resume.template],
    resumeExtrasPosition: entry.resume.resumeExtrasPosition ?? 'trailing',
    idCapture: spec?.idCapture ?? 'unsupported',
    sessionStore: entry.resume.sessionStore,
    captureRouteVerified: entry.unverified !== true,
    flagsVerifiedVersion: verifiedVersion,
    flagsVerifiedAgainst: flagVerificationState(verifiedVersion, input.agentVersion)
  };
}

function flagVerificationState(
  verifiedVersion: string | null,
  liveVersion: string | null
): AgentRecoveryContract['flagsVerifiedAgainst'] {
  if (verifiedVersion === null) return 'never';
  if (liveVersion === null) return 'unknown';
  return verifiedVersion === liveVersion ? 'this-version' : 'other-version';
}

/**
 * The provenance of an id fixed BEFORE the process existed, or the honest
 * record that no id was fixed at all.
 *
 * `preassigned` and `preassign-command` are 'exact' and nothing else could be
 * right: Tortie generated the uuid, or a side command minted a fresh chat that
 * has never held anyone else's conversation. A pre-assign command that came
 * back with nothing leaves `idCapture: 'preassigned-cmd'` and no id, and that
 * is recorded as 'unavailable' rather than as a weak claim.
 */
export function launchProvenance(
  spec: AgentLaunchSpec,
  input: { cwd: string; at: number; agentVersion: string | null }
): ResumeProvenance {
  const base = {
    v: SESSION_CONTRACT_VERSION,
    at: input.at,
    cwd: input.cwd,
    ...(input.agentVersion !== null ? { agentVersion: input.agentVersion } : {})
  };
  switch (spec.idCapture) {
    case 'preassigned':
      return { ...base, source: 'preassigned', confidence: 'exact' };
    case 'preassigned-cmd':
      return spec.agentSessionId !== undefined
        ? { ...base, source: 'preassign-command', confidence: 'exact' }
        : { ...base, source: 'unavailable', confidence: 'none' };
    case 'store-harvest':
      // The watcher has not landed. No id, so no claim — harvestProvenance
      // replaces this record the moment there is something to say.
      return {
        ...base,
        source: 'store-harvest',
        confidence: 'none',
        ...(spec.harvestKey !== undefined ? { key: spec.harvestKey } : {}),
        ...(spec.harvestConfidence !== undefined
          ? { keyConfidence: spec.harvestConfidence }
          : {})
      };
    case 'unsupported':
      return { ...base, source: 'unavailable', confidence: 'none' };
    case 'none':
      return { ...base, source: 'none', confidence: 'none' };
  }
}

/**
 * The provenance of an id the store watcher found.
 *
 * `atCreate` distinguishes the watcher started with the pane from the one a
 * later launch starts against a remembered spawn time. The second cannot
 * correlate against a live process, so it is recorded as 'boot-rescue' and a
 * reader can tell the two apart forever.
 */
export function harvestProvenance(
  harvested: HarvestedSessionId,
  input: { cwd: string; agentVersion: string | null; atCreate: boolean }
): ResumeProvenance {
  return {
    v: SESSION_CONTRACT_VERSION,
    source: input.atCreate ? 'store-harvest' : 'boot-rescue',
    confidence: deriveResumeConfidence({
      key: harvested.key,
      keyConfidence: harvested.confidence,
      viaGraceTimer: harvested.viaGraceTimer,
      rivals: harvested.rivals,
      ...(harvested.sameCwdWatches !== undefined
        ? { sameCwdWatches: harvested.sameCwdWatches }
        : {})
    }),
    at: harvested.acceptedAt,
    cwd: input.cwd,
    key: harvested.key,
    keyConfidence: harvested.confidence,
    viaGraceTimer: harvested.viaGraceTimer,
    rivals: harvested.rivals,
    storePath: harvested.storePath,
    storeRoot: harvested.storeRoot,
    ...(harvested.contestedByWatches !== undefined
      ? { contestedByWatches: harvested.contestedByWatches }
      : {}),
    ...(harvested.sameCwdWatches !== undefined
      ? { sameCwdWatches: harvested.sameCwdWatches }
      : {}),
    ...(harvested.reclaimedFrom !== undefined
      ? { reclaimedFrom: harvested.reclaimedFrom }
      : {}),
    ...(input.agentVersion !== null ? { agentVersion: input.agentVersion } : {})
  };
}

/**
 * Build the launch spec for a new session.
 *
 * Synchronous and pure — cursor's side-command pre-assignment cannot happen
 * here, so cursor comes back as a plain launch with `idCapture:
 * 'preassigned-cmd'` and no id. Callers that can await should use
 * {@link resolveLaunchSpec}, which fills it in.
 *
 * @param agent      which agent to run
 * @param extraArgs  user-supplied extra flags (e.g. --model, --add-dir).
 *                   Recorded into BOTH argv and resumeArgv because resume
 *                   does not re-apply launch flags — MEASURED on claude,
 *                   codex, muse and qwen (research 22 §3.4 rule 3).
 * @param binPath    RESOLVED absolute path of the agent binary (Bug A: the
 *                   manifest stores absolute paths in argv AND resume_argv
 *                   so restores survive PATH drift).
 */
export function buildLaunchSpec(
  agent: LaunchableAgentKind,
  extraArgs: readonly string[] = [],
  binPath?: string
): AgentLaunchSpec {
  if (agent === 'shell') {
    // GUI-launched Electron inherits a minimal env; SHELL may be unset.
    const shell = binPath ?? process.env['SHELL'] ?? '/bin/zsh';
    // PHASE 74, GitHub issue 8. A shell session is a LOGIN shell. Without the
    // flag the person's own ~/.zprofile never runs, so a completion search
    // path set there is missing, and zsh prints "_eza: function definition
    // file not found" while completing a path and then finds no matches for a
    // directory that exists. tmux starts default-shell as a login shell on its
    // no-command branch and Terminal.app starts one too; Tortie always passes
    // an argv, so it passes the flag. Two call sites, this one and
    // src/main/restore/restore.ts, rather than a list of variable names
    // somebody has to keep current.
    return {
      agent,
      argv: withLoginShellFlag([shell, ...extraArgs]),
      idCapture: 'none'
    };
  }

  // PHASE 23: this is the confirm gate's call site. `launchEntryFor` throws
  // with the refusal sentence when a configured row supplies something
  // executable that nobody has agreed to, and it throws BEFORE any argv is
  // composed, so a refused row never becomes a command line at all.
  const entry = launchEntryFor(agent);
  const capture = entry.resume.idCapture;
  const bin = binPath ?? entry.launch.argv[0] ?? agent;

  const spec: AgentLaunchSpec = {
    agent,
    argv: launchArgvFor(entry, extraArgs, binPath),
    idCapture: 'unsupported',
    resumeStrategy: entry.resume.strategy,
    resumeTemplate: [...entry.resume.template]
  };
  if (entry.launch.env !== undefined) spec.env = { ...entry.launch.env };
  // Phase 33. Copied only when the row actually names something, so a spec for
  // one of the twelve compiled agents is byte for byte what it was before this
  // phase and no launch pays for a feature it does not use.
  if (entry.launch.envPassthrough !== undefined && entry.launch.envPassthrough.length > 0) {
    spec.envPassthrough = [...entry.launch.envPassthrough];
  }
  if (entry.resume.requiresOriginalCwd === true) spec.requiresOriginalCwd = true;

  switch (capture.mode) {
    case 'pre-assign': {
      // The strongest primitive in the field. One place owns id injection:
      // launchArgvFor reads the flag off the same idCapture record. The gate
      // is not asked again here, because `entry` is the object it already
      // cleared and re-asking would only add a second chance to disagree.
      const id = randomUUID();
      spec.agentSessionId = id;
      spec.argv = launchArgvFor(entry, extraArgs, binPath, id);
      spec.resumeArgv = resumeArgvFor(entry, id, extraArgs, bin);
      spec.idCapture = 'preassigned';
      break;
    }
    case 'pre-assign-cmd':
      // resolveLaunchSpec() runs the side command and rewrites this spec.
      spec.idCapture = 'preassigned-cmd';
      break;
    case 'harvest':
      spec.idCapture = 'store-harvest';
      spec.harvestKey = capture.key;
      spec.harvestConfidence = capture.confidence;
      break;
    case 'unverified':
    case 'none':
      spec.idCapture = 'unsupported';
      break;
  }
  return spec;
}

/**
 * buildLaunchSpec plus the one capture route that needs a subprocess:
 * cursor's `cursor-agent create-chat`, which prints a fresh chat id that
 * `--resume <id>` then starts INTO.
 *
 * A failure here is never fatal — the session still launches, it just comes
 * back as a directory instead of a conversation, and `idCapture` stays
 * 'preassigned-cmd' with no id so the UI can say which of the two happened.
 */
export async function resolveLaunchSpec(
  agent: LaunchableAgentKind,
  extraArgs: readonly string[] = [],
  binPath?: string
): Promise<AgentLaunchSpec> {
  const spec = buildLaunchSpec(agent, extraArgs, binPath);
  if (agent === 'shell' || spec.idCapture !== 'preassigned-cmd') return spec;

  // PHASE 23: the same entry again, so the side command that mints an id comes
  // off the row that was confirmed. `buildLaunchSpec` above already asked the
  // gate and would have thrown, so reaching this line means the row is cleared.
  // The pre-assignment command's own argv is one of the twelve fields the hash
  // covers, which is why running it here is inside what a person agreed to.
  const entry = launchEntryFor(agent);
  const capture = entry.resume.idCapture;
  if (capture.mode !== 'pre-assign-cmd') return spec;
  const bin = binPath ?? entry.launch.argv[0] ?? agent;
  // runGuarded, not execFile (Phase 13.8): this runs on the SESSION-CREATE
  // path, and execFile's callback fires on stdio CLOSE — a create-chat that
  // forks anything holding stdout would hang session creation forever and
  // orphan the fork. runGuarded always settles and kills the process group.
  const probe = await runGuarded(bin, capture.argv, {
    timeoutMs: PRE_ASSIGN_CMD_TIMEOUT_MS,
    ...(spec.env !== undefined ? { env: { ...process.env, ...spec.env } } : {})
  });
  try {
    if (probe.spawnError !== null || probe.timedOut || probe.code !== 0) {
      return spec; // create-chat unavailable (offline, signed out) — bare launch
    }
    const id = probe.stdout.trim().split('\n').pop()?.trim() ?? '';
    if (!isPlausibleSessionId(id)) return spec;
    spec.agentSessionId = id;
    // Cursor's launch argv IS its resume argv: start into the empty chat.
    spec.argv = resumeArgvFor(entry, id, extraArgs, bin);
    spec.resumeArgv = resumeArgvFor(entry, id, extraArgs, bin);
  } catch {
    /* an unusable id or argv rewrite — the bare launch still stands */
  }
  return spec;
}

/** `cursor-agent create-chat` returns in well under a second when healthy. */
const PRE_ASSIGN_CMD_TIMEOUT_MS = 15_000;

/**
 * A pre-assignment command must hand back an ID, not a banner, a prompt, or
 * an error sentence. Anything that fails this is dropped rather than baked
 * into a launch argv.
 */
function isPlausibleSessionId(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 128 &&
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)
  );
}

/**
 * `claude --resume <uuid>` + the original extra flags (not auto-restored).
 * Kept as a named builder because the resume path reads better for it; the
 * template itself lives in the registry, so there is exactly one definition.
 */
export function claudeResumeArgv(
  sessionId: string,
  extraArgs: readonly string[] = [],
  bin = 'claude'
): string[] {
  return registryResumeArgv('claude', sessionId, extraArgs, bin);
}

/** `codex resume <uuid>` + the original extra flags. */
export function codexResumeArgv(
  sessionId: string,
  extraArgs: readonly string[] = [],
  bin = 'codex'
): string[] {
  return registryResumeArgv('codex', sessionId, extraArgs, bin);
}
