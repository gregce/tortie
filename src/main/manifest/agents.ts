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
import {
  getLaunchableEntry,
  registryLaunchArgv,
  registryResumeArgv,
  type AgentHarvestKey,
  type ResumeStrategy
} from '../agents/registry';

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
   * ADVISORY ONLY — this spec is consumed at create time and the flag is not
   * persisted to the manifest, so restore cannot read it back. The enforcement
   * lives in src/main/restore/restore.ts, which re-derives the answer from the
   * registry entry for the recorded agent. Do not add a second reader here
   * expecting it to survive a reboot.
   */
  requiresOriginalCwd?: boolean;
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
