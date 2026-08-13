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
  registryLaunchArgv,
  registryResumeArgv,
  type AgentHarvestKey,
  type ResumeStrategy
} from '../agents/registry';
import type { HarvestedSessionId } from './harvest/stores';

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
  | 'unavailable';

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
 * The keys that are a true identity, so a second candidate cannot be this
 * pane's session.
 *
 *  - 'tmux-pane' — the agent stamps the pane it runs in, and Tortie spawned
 *    that pane. Two muse sessions in one directory stay separable.
 *  - 'pid' — the record's pid is a descendant of the pane pid.
 *
 * Everything else ('cwd-newest', 'sqlite-index', 'time-only') keys on the
 * DIRECTORY or on nothing, and a directory is not an identity: two sessions of
 * one agent started in one directory both match, and only their timing
 * separates them. That is the case G6 names, and it is why rivals matter.
 */
const IDENTITY_HARVEST_KEYS: ReadonlySet<AgentHarvestKey> = new Set<AgentHarvestKey>([
  'tmux-pane',
  'pid'
]);

/**
 * The confidence a harvest may claim, from the evidence it actually had.
 *
 * Three ways to fall short of 'exact', in the order they are checked:
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
 */
export function deriveResumeConfidence(evidence: {
  key: AgentHarvestKey;
  /** The descriptor's own rating of the key. */
  keyConfidence: 'exact' | 'weak';
  viaGraceTimer: boolean;
  /** Candidates still in play when the winner was accepted, winner included. */
  rivals: number;
}): ResumeConfidence {
  if (evidence.viaGraceTimer) return 'grace-accepted';
  if (evidence.keyConfidence === 'weak') return 'weak';
  if (evidence.rivals > 1 && !IDENTITY_HARVEST_KEYS.has(evidence.key)) {
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
  const entry = getLaunchableEntry(agent);
  // Keyed on the id that was asked for, not on `entry.id`: the flag catalogue
  // covers the ten LAUNCHABLE agents, while a registry entry's id spans all
  // twelve and includes the capture-only IDE pair.
  const catalog = AGENT_FLAG_PRESETS[agent];
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
      rivals: harvested.rivals
    }),
    at: harvested.acceptedAt,
    cwd: input.cwd,
    key: harvested.key,
    keyConfidence: harvested.confidence,
    viaGraceTimer: harvested.viaGraceTimer,
    rivals: harvested.rivals,
    storePath: harvested.storePath,
    storeRoot: harvested.storeRoot,
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
    return { agent, argv: [shell, ...extraArgs], idCapture: 'none' };
  }

  const entry = getLaunchableEntry(agent);
  const capture = entry.resume.idCapture;
  const bin = binPath ?? entry.launch.argv[0] ?? agent;

  const spec: AgentLaunchSpec = {
    agent,
    argv: registryLaunchArgv(agent, extraArgs, binPath),
    idCapture: 'unsupported',
    resumeStrategy: entry.resume.strategy,
    resumeTemplate: [...entry.resume.template]
  };
  if (entry.launch.env !== undefined) spec.env = { ...entry.launch.env };
  if (entry.resume.requiresOriginalCwd === true) spec.requiresOriginalCwd = true;

  switch (capture.mode) {
    case 'pre-assign': {
      // The strongest primitive in the field. One place owns id injection:
      // registryLaunchArgv reads the flag off the same idCapture record.
      const id = randomUUID();
      spec.agentSessionId = id;
      spec.argv = registryLaunchArgv(agent, extraArgs, binPath, id);
      spec.resumeArgv = registryResumeArgv(agent, id, extraArgs, bin);
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

  const capture = getLaunchableEntry(agent).resume.idCapture;
  if (capture.mode !== 'pre-assign-cmd') return spec;
  const bin = binPath ?? getLaunchableEntry(agent).launch.argv[0] ?? agent;
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
    spec.argv = registryResumeArgv(agent, id, extraArgs, bin);
    spec.resumeArgv = registryResumeArgv(agent, id, extraArgs, bin);
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
