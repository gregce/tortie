/**
 * The pure launch decisions (Phase 42 stage 5, audit 2026-08-14).
 *
 * Everything here answers one question with no side effect: given what is
 * already known, what exactly should a launch, a relaunch or a resume be made
 * of? core.ts stays the orchestrator — it resolves binaries, writes the
 * manifest row and spawns the pane — and asks this module for the decisions
 * in between. Each function was moved or extracted VERBATIM from core.ts, so
 * every rule keeps the phase note that earned it.
 *
 * Nothing in this module touches tmux, SQLite, the filesystem or the process
 * table. `newSessionRecord` reads the compiled agent registry through
 * `buildRecoveryContract`, which is deliberate and documented on that
 * function: create time is the one moment the live registry is the truth.
 */

import type { CreateSessionInput, ResumeCapture } from '@shared/types';
import {
  buildRecoveryContract,
  launchProvenance,
  type AgentLaunchSpec,
  type ManifestSessionRecord
} from '../manifest';
import type { SnapshotSessionRecipe } from '../restore/snapshots';
import {
  wrapWithRecord,
  type SpecstoryCaptureRecord
} from '../specstory';
import { managedPaneEnv } from '../tmux/env';
import { sanitizeSessionName } from '../tmux/names';

/**
 * The manifest row as a snapshot capsule carries it.
 *
 * Phase 20 rebuilds a lost manifest from the capsules, so it cannot read the
 * manifest to learn whose scrollback a body is. Everything it needs to launch
 * the session again travels in the capsule at capture time or it is not
 * recoverable at all. See SnapshotSessionRecipe in ../restore/snapshots.
 *
 * `argv` is the manifest's own form, with the ABSOLUTE binary path, which is
 * the form the manifest is the source of truth for. The bare-name launch rule
 * (Phase 12.7 F3) is applied at spawn, not stored.
 *
 * The two versions are two different binaries and each goes under its own
 * name. Until Phase 21 the capsule's `agentVersion` was fed from the SpecStory
 * wrapper's version, because that was the only version the manifest had. The
 * manifest now has an `agent_version` column, so the agent's version goes in
 * the field named for it and the wrapper keeps its own.
 */
export function snapshotRecipeOf(
  rec: ManifestSessionRecord
): SnapshotSessionRecipe {
  return {
    name: rec.name,
    tmuxName: rec.tmuxName,
    projectPath: rec.projectPath,
    cwd: rec.cwd,
    agent: rec.agent,
    agentSessionId: rec.agentSessionId ?? null,
    argv: rec.argv,
    resumeArgv: rec.resumeArgv ?? null,
    agentVersion: rec.agentVersion ?? null,
    specstoryVersion: rec.specstory?.binVersion ?? null
  };
}

/**
 * The launch spec's capture mode, as the ONE thing the user actually cares
 * about: does this session come back with its conversation? Pre-assigned
 * agents are armed before the process exists; harvesters start 'capturing'
 * and flip to 'armed' when their watcher lands; anything gmux has no verified
 * route for says 'unavailable' rather than leaving the question open.
 */
export function resumeCaptureFor(spec: AgentLaunchSpec): ResumeCapture {
  switch (spec.idCapture) {
    case 'preassigned':
      return 'armed';
    case 'preassigned-cmd':
      // The side command either produced an id or it did not; no watcher
      // follows, so there is nothing left to wait for either way.
      return spec.resumeArgv !== undefined ? 'armed' : 'unavailable';
    case 'store-harvest':
      return 'capturing';
    case 'unsupported':
      return 'unavailable';
    case 'none':
      return 'none';
  }
}

/**
 * The launch flags this row's AGENT was started with, recovered from the
 * manifest so a rescued harvest re-appends them to the resume argv.
 *
 * Under capture `argv` is the wrapper's — `run <provider> --no-version-check
 * --silent -c "…"` — and re-appending THOSE to a resume would build nonsense.
 * The unwrapped agent argv is recorded for exactly this reason.
 */
export function agentExtrasOf(rec: ManifestSessionRecord): string[] {
  const inner = rec.specstory?.agentArgv;
  return (inner !== undefined && inner.length > 0 ? inner : rec.argv).slice(1);
}

/**
 * The wrapped argv to actually SPAWN, with the agent's bare name inside the
 * `-c` string (Phase 12.7 F3).
 *
 * F3's rule is "the manifest keeps the absolute path, the launch uses the bare
 * name", and it exists because an absolute argv[0] made every durable gmux
 * agent the one process on the machine that `pkill -f "$(command -v claude)"`
 * matched while every ephemeral one walked away. Under capture the agent's
 * path is no longer argv[0] — it is a substring of the wrapper's `-c`
 * argument, which is exactly what `pkill -f` greps. Substituting it there is
 * what keeps the protection.
 *
 * The specstory binary itself stays ABSOLUTE in both places: it is not on
 * PATH when it is the bundled copy, and no pkill pattern is aimed at it.
 */
export function relaunchWrapped(
  wrapped: string[],
  capture: SpecstoryCaptureRecord,
  bareName: string
): string[] {
  const inner = [bareName, ...capture.agentArgv.slice(1)];
  return wrapWithRecord(capture, inner) ?? wrapped;
}

/**
 * The binary names a create should try, in order (Phase 25.5).
 *
 * The WHOLE candidate list, not `binaries[0]` alone. deepseek's npm package
 * renamed itself to codewhale, so one registry row now names three binaries —
 * `codewhale`, `codew`, and the legacy `deepseek`. Detection already walked
 * the list; launch resolved only the first name, which would have thrown
 * AGENT_NOT_FOUND on every machine that has the old install and not the new
 * one. Launch now walks the same list in the same order and takes the first
 * hit.
 *
 * `merged` comes from the MERGED agent table (memory, never the disk), which
 * is also what detection scans. For a compiled id with no overlay that is
 * exactly the registry row; for a patched row it is the user's own
 * `binaries`, which makes agents.json the working escape hatch for the next
 * silent package rename. Unknown ids (never in the registry) keep the
 * id-as-binary behavior so nothing regresses.
 */
export function binaryCandidatesOf(
  agentId: string,
  merged: { readonly binaries: readonly string[] } | null
): readonly string[] {
  return merged !== null && merged.binaries.length > 0
    ? merged.binaries
    : [agentId]; // legacy id-as-binary behavior
}

/**
 * The AGENT_NOT_FOUND sentence, naming every candidate that was tried so the
 * user learns the actual search rather than the first name alone.
 */
export function agentNotFoundMessage(candidates: readonly string[]): string {
  const also =
    candidates.length > 1
      ? ` (also tried ${candidates.slice(1).join(', ')})`
      : '';
  return `${candidates[0]} not found${also} — install it, or make sure your shell PATH includes it.`;
}

/**
 * The argv the pane actually spawns (Phase 12.7 F3 — LAUNCH BY BARE NAME).
 *
 * The manifest keeps the absolute path (restores must survive PATH drift,
 * Bug A), but the absolute path in argv[0] is also what made a durable gmux
 * agent the ONE process on the machine that `pkill -f "$(command -v claude)"`
 * hits, while every ephemeral `claude` walked away. Bug A's real fix is the
 * login-shell PATH injected into the tmux server env (supervisor.ts), so
 * tmux's execvp resolves the bare name just as the user's own shell does.
 *
 * A CAPTURED session gets the same treatment ONE LEVEL IN: argv[0] is the
 * specstory binary (absolute — it is not on PATH when it is the bundled
 * copy), and the agent's own name lives inside the `-c` string, which is
 * exactly what `pkill -f` reads. So the bare name is substituted there
 * instead, and F3's protection survives the wrap.
 *
 * `bareName` is undefined for a plain shell, and for the one measured case
 * where the bare name cannot work at all: a binary that exists ONLY in a
 * directory its own entry names (see the extraProbeDirs note in core.ts).
 * Both keep the manifest's argv unchanged.
 *
 * Named for the SPAWN because `launchArgvFor` already exists in
 * ../agents/registry with a different job: that one composes an agent's argv
 * from its registry entry, this one decides what the pane actually executes.
 */
export function spawnArgvFor(
  argv: string[],
  bareName: string | undefined,
  capture: SpecstoryCaptureRecord | undefined
): string[] {
  return bareName === undefined
    ? argv
    : capture !== undefined
      ? relaunchWrapped(argv, capture, bareName)
      : [bareName, ...argv.slice(1)];
}

/**
 * The pane environment for tmux `-e`, in the one order that is safe (Phase 33).
 *
 * Three sources, and the order between them is the whole function.
 *
 *  1. `base` is the row's own `launch.env`, e.g. cursor's FORCE_COLOR=1. It is
 *     persisted in the manifest row and replayed at restore.
 *  2. `resolved` is what the login shell answered for this row's
 *     `launch.envPassthrough` names, a moment ago. It is never persisted
 *     anywhere and it never travels through `spec.env`.
 *  3. The GMUX stamps go LAST and therefore win. GMUX_MANAGED and
 *     GMUX_SESSION_ID are the second source of session identity, read back by
 *     `getSessionEnv`, and a pane carrying another session's stamp is a
 *     session claiming an identity that is not its own. The overlay loader
 *     already refuses a `GMUX_` name in either list, so this order is the
 *     second answer to the same question rather than the only one.
 *
 * Both spawn sites call it, being the create in ./core.ts and the restore in
 * ../restore/restore.ts, so the merge rule exists once and is tested once.
 */
export function paneEnvFor(
  base: Record<string, string> | undefined,
  resolved: Record<string, string>,
  sessionId: string
): Record<string, string> {
  return { ...base, ...resolved, ...managedPaneEnv(sessionId) };
}

/** Everything already resolved that the new manifest row is composed from. */
export interface LaunchRecordFacts {
  /** The fresh session uuid. */
  id: string;
  /** The create request as the renderer sent it. */
  input: CreateSessionInput;
  /** The working directory the create validated (input.cwd or the project). */
  cwd: string;
  /** The resolved launch spec, with every flag edit already applied. */
  spec: AgentLaunchSpec;
  /** The SpecStory wrap record, when capture was applied. */
  capture: SpecstoryCaptureRecord | undefined;
  /** The detected agent CLI version, or null when the scan had no answer. */
  agentVersion: string | null;
  /** Absolute path of the agent binary; undefined for a plain shell. */
  binPath: string | undefined;
  /** realpath() of the launch cwd. */
  cwdReal: string;
  /** realpath() of the project root. */
  projectReal: string;
  /** Epoch ms of the create. */
  now: number;
}

/**
 * The manifest row a create writes BEFORE the process exists (§2.4 Step 0).
 *
 * Every field restore depends on is decided here, while it is still true
 * (Phase 21, A8 + G6): the recovery contract, the launch half of the
 * provenance chain, the resume capture answer and the agent's version all go
 * into the same row, in the same transaction, before the spawn.
 *
 * `tmuxName` is PREDICTED; the caller replaces it with the name tmux actually
 * applied (dedupe may append "-2"). The provenance records the route and
 * makes no claim for a harvesting agent — the watcher replaces it with the
 * evidence it actually had (see startIdCapture in core.ts).
 */
export function newSessionRecord(facts: LaunchRecordFacts): ManifestSessionRecord {
  const { id, input, cwd, spec, capture, agentVersion, binPath, cwdReal, projectReal, now } = facts;
  return {
    id,
    name: input.name,
    tmuxName: sanitizeSessionName(input.name),
    projectPath: input.projectPath,
    cwd,
    agent: input.agent,
    status: 'running',
    createdAt: now,
    argv: spec.argv,
    lastSeen: now,
    ...(spec.agentSessionId !== undefined
      ? { agentSessionId: spec.agentSessionId }
      : {}),
    ...(spec.resumeArgv !== undefined ? { resumeArgv: spec.resumeArgv } : {}),
    // Phase 13.5: say NOW whether this session will come back with its
    // conversation. Written with the row, before the process exists.
    resumeCapture: resumeCaptureFor(spec),
    ...(spec.env !== undefined ? { env: spec.env } : {}),
    // Phase 33. The NAMES this session's row asked for, so a restore knows
    // which variables to read again. The spec carries no values, so there is
    // no path by which one could land in this record.
    ...(spec.envPassthrough !== undefined && spec.envPassthrough.length > 0
      ? { envPassthrough: [...spec.envPassthrough] }
      : {}),
    ...(capture !== undefined ? { specstory: capture } : {}),
    // Phase 21 (A8 + G6). The three fields migration 008 adds, written with
    // the row, before the process exists — same moment and same transaction
    // as everything else a restore depends on.
    ...(agentVersion !== null ? { agentVersion } : {}),
    agentContract: buildRecoveryContract(
      input.agent,
      {
        // The AGENT's binary, never the SpecStory wrapper's. `binPath` is
        // set for every non-shell agent or the create has already thrown,
        // so `spec.argv[0]` is only reached for a plain shell, and a shell
        // is never wrapped.
        bin: binPath ?? spec.argv[0] ?? input.agent,
        cwdReal,
        projectReal,
        agentVersion,
        at: now
      },
      spec
    ),
    // The launch half of the provenance chain. A harvesting agent has no id
    // yet, so this records the route and makes no claim; the watcher
    // replaces it with the evidence it actually had. See startIdCapture.
    resumeProvenance: launchProvenance(spec, {
      cwd: cwdReal,
      at: now,
      agentVersion
    })
  };
}
