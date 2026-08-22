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
import { loginSessionEnv, managedPaneEnv } from '../tmux/env';
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
 *
 * PHASE 48 rewrote the words. The old sentence was "claude not found (also
 * tried codew) — install it, or make sure your shell PATH includes it." It
 * used a dash to join two clauses, it did not say where Tortie looked, and it
 * gave an instruction in the same breath as the finding. This one states what
 * was searched and what the search returned, and leaves the recovery to the
 * sheet that draws it.
 */
export function agentNotFoundMessage(candidates: readonly string[]): string {
  const first = candidates[0] ?? 'the agent';
  const rest = candidates.slice(1);
  const also = rest.length > 0 ? ` It also looked for ${andList(rest)}.` : '';
  return (
    `Tortie looked for a program named ${first} on your login shell's PATH ` +
    `and in the places Tortie knows agents install themselves.${also} ` +
    'It found nothing.'
  );
}

/** "a", "a and b", "a, b and c". Used by the sentence above. */
function andList(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * The AGENT_INTERPRETER_MISSING sentence (Phase 48, research 47 section 7).
 *
 * The file exists and Tortie found it. It is a script, its first line names
 * an interpreter, and that interpreter is not on the PATH this pane would
 * get. This is failure modes 1, 2, 6 and 7 of the seven research 47
 * reproduced, and before this phase every one of them arrived as a pane that
 * opened and closed with "Session ended unexpectedly (exit 127)".
 *
 * No install command belongs in this sentence. Printing
 * `npm install -g @anthropic-ai/claude-code` here would name the install kind
 * that just failed, which is the defect this phase removes.
 *
 * @param binPath     the absolute file the launch resolved.
 * @param interpreter the name its first line asks for, e.g. "node".
 */
export function interpreterMissingMessage(
  binPath: string,
  interpreter: string
): string {
  return (
    `The file at ${binPath} is a script, not a program. Its first line asks ` +
    `for ${interpreter}, and ${interpreter} is not on the PATH this session ` +
    'would get. The session would open and close within a second, so Tortie ' +
    'did not start it.'
  );
}

/**
 * Whether the pane may be spawned by bare name (Phase 12.7 F3), given what
 * the login-shell PATH resolves that name to (Phase 49, research 47 §9, §11).
 *
 * The bare name is used ONLY when it is really a bare name AND the file the
 * pane's PATH would pick is byte-for-byte the file the manifest records.
 * A path-shaped candidate (a Phase 23 override such as '~/x' or '/x') never
 * spawns as argv[0]: tmux does no tilde expansion and the absolute argv in
 * the manifest is already the right spawn. When onLoginPath differs from
 * abs, the manifest would record one file while the pane ran another, so the
 * launch stays absolute for exactly that create.
 *
 * HONESTY, so the next editor knows what this is insurance for. For a bare
 * name TODAY the null test this replaced and the equality test coincide,
 * because `getUserPath()` merges `extraBinDirs()` into every captured PATH,
 * and by Phase 81 `createSession` awaits `installUserPath()` before it reads
 * anything, so the PATH those two reads see is one value that never changes,
 * so any hit `resolveBinary(bare)` can find is also a userPath hit and equals
 * `abs`. This function binds the invariant to the create path itself instead
 * of to that merge, which someone tuning boot latency can remove without ever
 * seeing this file. The path-shaped branch is a live fix, not insurance: an
 * overlay row whose binary is written `~/x` or `/x` used to reach tmux as
 * argv[0] and die, because tmux expands no tilde.
 */
export function bareNameFor(
  bare: string,
  abs: string,
  onLoginPath: string | null
): string | undefined {
  if (bare.includes('/')) return undefined;
  return onLoginPath === abs ? bare : undefined;
}

/**
 * The argv the pane actually spawns (Phase 12.7 F3 — LAUNCH BY BARE NAME).
 *
 * The manifest keeps the absolute path (restores must survive PATH drift,
 * Bug A), but the absolute path in argv[0] is also what made a durable gmux
 * agent the ONE process on the machine that `pkill -f "$(command -v claude)"`
 * hits, while every ephemeral `claude` walked away. Bug A's real fix is the
 * login-shell PATH written into this process, the tmux client, at the one
 * assignment in ../tmux/user-path.ts (Phase 81 moved that line out of
 * supervisor.ts), so tmux's execvp resolves the bare name just as the user's
 * own shell does.
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
 * Four sources, and the order between them is the whole function.
 *
 *  0. The macOS login session number this Tortie process is in (Phase 133), and
 *     it is FIRST so it is the WEAKEST. A pane otherwise takes that number from
 *     the tmux server, which is durable and routinely months old, so an agent
 *     used to join a login session that had ended and could not find a keychain.
 *     Tortie never invents a value here. See `loginSessionEnv` in ../tmux/env
 *     for the measurement. `processEnv` is a parameter so a test can pass `{}`
 *     and not pick up the number of the machine it happens to run on.
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
  sessionId: string,
  processEnv: NodeJS.ProcessEnv = process.env
): Record<string, string> {
  return {
    ...loginSessionEnv(processEnv),
    ...base,
    ...resolved,
    ...managedPaneEnv(sessionId)
  };
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

/**
 * The two folders a create bound for another machine sends (Phase 94, item 1).
 *
 * Both fields are paths ON THAT MACHINE. Nothing here is a path on this Mac.
 */
export interface RemoteCreateFolders {
  /** The project folder, as a path on that machine. May be the empty string. */
  readonly projectPath: string;
  /** The working directory. THE KEY IS ABSENT when no folder is to be sent. */
  readonly cwd?: string;
}

/**
 * Which folder a create on another machine runs in (Phase 94, item 1). PURE.
 *
 * THE DEFECT THIS RULE REMOVES. The operator opened a folder on his Mac Pro,
 * got a tab for it, pressed Cmd+T again inside that tab and changed nothing.
 * The sheet drops a Directory value that equals the tab's own folder, so no
 * `cwd` arrived, so no `-c` was composed, so that machine's own tmux fell back
 * to the home directory. The session really ran in his whole home folder, the
 * re-home read that folder from the machine and opened a second tab named
 * after it. The project folder was computed correctly one line above and was
 * then not used to decide where the session runs.
 *
 * The rule, in three sentences.
 *
 *  1. `far` is the project path when the tab is already on the machine this
 *     create is bound for, and it is the typed folder otherwise. This is the
 *     Phase 90.3 expression, moved here unchanged.
 *  2. A typed folder wins. A person who names a subfolder gets that subfolder.
 *  3. Otherwise the tab's own folder is the working directory, but only when
 *     it is an absolute path. When it is not, THE KEY IS ABSENT.
 *
 * PHASE 84 ITEM 5 IS PRESERVED BY STEP 3, AND IT IS THE ROW TO CHECK FIRST.
 * From a tab on this Mac the renderer sends no `projectMachineId`, so `far` is
 * `input.cwd ?? ''`, and with the Directory field cleared that is the empty
 * string. `''.startsWith('/')` is false, so the key is absent, so `-c` is not
 * composed and that machine's own home directory fallback still decides. This
 * function never reads a path that belongs to this Mac, so the fallback Phase
 * 84 deleted is not restored anywhere.
 *
 * The key is ABSENT rather than present and undefined. `remoteCreate` reads
 * `input.cwd ?? ''` and sends `-c` only when the result has length, so the two
 * are the same thing at that call site. They are not the same thing to a
 * person reading the spread at the create, and that spread is what Phase 84
 * item 5 is written about.
 */
export function remoteCreateFolders(input: {
  readonly machineId: string;
  readonly projectMachineId?: string;
  readonly projectPath: string;
  readonly cwd?: string;
}): RemoteCreateFolders {
  const far =
    input.projectMachineId !== undefined &&
    input.projectMachineId === input.machineId
      ? input.projectPath
      : (input.cwd ?? '');
  if (input.cwd !== undefined && input.cwd.length > 0) {
    return { projectPath: far, cwd: input.cwd };
  }
  return far.startsWith('/') ? { projectPath: far, cwd: far } : { projectPath: far };
}

/**
 * Which machine a create actually runs on (Phase 94, item 2). PURE.
 *
 * THE DEFECT THIS RULE REMOVES. The create the agent board and the per-agent
 * hotkeys use sent no machine at all. Pressed inside a tab whose files are on
 * another computer, it started a process on THIS Mac, at a path only that
 * other computer has. The operator got three sessions named the same thing,
 * with no folder and no tab, and an Enter that did nothing.
 *
 * The rule. A create that names a machine runs on it. A create that names none,
 * or names this Mac, in a tab whose files are on a machine, runs on that
 * machine. Anything else runs here.
 *
 * WHY THIS IS SAFE. The renderer sends `projectMachineId` only when the active
 * project's machine is set and is not `local`, so the field names a machine
 * only when the tab's files really are over there. There is no case in this
 * build where a session should run on this Mac in a folder that exists only on
 * another computer, so this rule can take nothing away.
 *
 * IT REFUSES RATHER THAN FALLING BACK. When that machine is not ready,
 * `readyRemoteContext` answers MACHINE_NOT_READY and nothing is started. The
 * renderer's own sentence gets there first for the surfaces this build has, and
 * this is the answer for a surface written later.
 *
 * It is computed as the FIRST statement of `createSession`, above the capture
 * refusal read, for the same reason that read sits above the remote branch: a
 * create path added later must not be composable above it.
 */
export function createMachineIdFor(input: {
  readonly machineId?: string;
  readonly projectMachineId?: string;
}): string | undefined {
  if (input.machineId !== undefined && input.machineId !== 'local') {
    return input.machineId;
  }
  if (input.projectMachineId !== undefined && input.projectMachineId !== 'local') {
    return input.projectMachineId;
  }
  return undefined;
}
