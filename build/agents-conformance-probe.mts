/**
 * The probe half of `npm run conformance:agents` (Phase 23).
 *
 * It prints, as JSON, everything the checker beside it needs to decide whether
 * an agent Tortie did not compile in is complete enough to LAUNCH, RESUME and
 * RESTORE. The checker (`conformance-agents.mjs`) decides pass or fail and
 * prints the table a person reads.
 *
 * It is a separate file rather than an inline `--eval` because the tables are
 * TypeScript with path aliases, and a probe that cannot resolve `@shared/*`
 * silently prints nothing. That is the same reason `context-matrix-probe.mts`
 * exists next to it.
 *
 * IT SPAWNS NOTHING. It starts no tmux server, opens no manifest, launches no
 * Electron, reads no file under the user's home and writes nothing anywhere.
 * Every function it calls is pure. It is safe to run on a machine with live
 * sessions on it.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT CANNOT PROVE, said here so nobody reads more into a pass
 * ---------------------------------------------------------------------------
 * The confirm gate lives in `src/main/config/confirm.ts`, which imports
 * `electron` because the record is sealed through `safeStorage`. A node probe
 * cannot open that seal, so this gate never proves that a confirmed row starts
 * a process and an unconfirmed one does not. That belongs to the Tier 3
 * verifier, driving the real app.
 *
 * What this gate proves is the pure half, and the pure half is where the
 * durability risk sits: that the merge is faithful, that a bad row is dropped
 * whole with a named field, that the hash a person's agreement is bound to
 * moves when the execution bearing fields move and stays put when they do not,
 * and that a configured row carries every field the create and restore paths
 * read.
 *
 * ---------------------------------------------------------------------------
 * THE OVERLAY SEAM
 * ---------------------------------------------------------------------------
 * Section 4 imports the C1 loader DYNAMICALLY, through the two constants
 * `OVERLAY_SEAM` and `CONFIRM_SEAM` below, and reports `seam: "absent"` when
 * neither import resolves. Sections 1 to 3 need nothing but the compiled tree,
 * so the gate still reaches a verdict and says out loud that section 4 did not
 * run. It never silently passes.
 *
 * It uses four functions and nothing else. `parseAgentOverlay`,
 * `mergeAgentOverlay` and `executionFieldsOf` come from `config/overlay.ts`,
 * and `executionHash` comes from `config/confirm.ts`. All four are pure.
 */

import {
  peekDetectedAgents,
  versionProbeCount
} from '../src/main/agents/detection';
import {
  AGENT_REGISTRY,
  LAUNCHABLE_AGENT_IDS,
  SESSION_ID_SLOT,
  // Phase 269: the env keys an agent's COMPILED row sets. Three agents have any
  // since Phase 331 added Claude Code's inline switch.
  compiledLaunchEnvKeys,
  registryResumeArgv,
  // Phase 331: the two argv builders every create and every resume go through.
  launchArgvFor,
  resumeArgvFor,
  type AgentRegistryEntry
} from '../src/main/agents/registry';
// Phase 269: the ONE spelling of "will Tortie read this variable?", and the
// three denylists its sentences are derived from.
import {
  ENV_PASSTHROUGH_REFUSED,
  ENV_REFUSED_EXACT,
  ENV_REFUSED_PREFIXES,
  OVERLAY_ENV_KEY_PATTERN,
  OVERLAY_LIMITS,
  // Phase 331: the sentence a row carrying `screen` is dropped with.
  REFUSED_ROW_FIELDS,
  envPassthroughRefusal
} from '../src/shared/agent-overlay';
import {
  defaultGmuxSettings,
  envNameKey,
  // Phase 275: the display spelling of a shared key and the shared list's own
  // sanitizer. Both are pure and neither touches a value.
  envSharedKey,
  sanitizeEnvPassthrough,
  sanitizeEnvPassthroughShared,
  type GmuxSettings
} from '../src/shared/settings';
// Phase 269: the union the launch path reads. Pure, like everything here.
import { envPassthroughFor } from '../src/main/sessions/launch-plan';
import {
  buildLaunchSpec,
  buildRecoveryContract,
  SESSION_CONTRACT_VERSION,
  type AgentRecoveryContract
} from '../src/main/manifest/agents';
import {
  parseAgentContract,
  serializeAgentContract
} from '../src/main/manifest/contract';
import { agentShortLabel, buildAgentOptions } from '../src/renderer/state/agents';
import type { AgentsScanResult, DetectedAgent, LaunchableAgentId } from '../src/shared/types';

/** The two lines to change if C1 ever moves the loader or the confirm hash. */
const OVERLAY_SEAM = '../src/main/config/overlay';
const CONFIRM_SEAM = '../src/main/config/confirm';

/** Phase 33: where `paneEnvFor` and `newSessionRecord` live. */
const LAUNCH_PLAN_SEAM = '../src/main/sessions/launch-plan';

/** The id the whole gate is written around: an agent Tortie did not compile. */
const SYNTH_ID = 'tortie-conformance-agent';

/** Stand-ins used everywhere below, so nothing here depends on a real machine. */
const ABS_BIN = '/opt/tortie-conformance/bin/tca';
const EXTRAS = ['--model', 'conformance'];
const CAPTURED_ID = 'c0nf0rmance-0000-4000-8000-000000000001';
const CONTRACT_INPUT = {
  bin: ABS_BIN,
  cwdReal: '/tmp/tortie-conformance/work',
  projectReal: '/tmp/tortie-conformance',
  agentVersion: '0.0.0-conformance',
  at: 0
};

// ---------------------------------------------------------------------------
// Sections 1 and 2 — the create path and the restore path, per agent
// ---------------------------------------------------------------------------

interface AgentReport {
  id: string;
  origin: 'compiled' | 'config';
  /** argv[0] of the launch argv. Must be the absolute path handed in. */
  launchArgv0: string | null;
  /** Every extra flag survived into the launch argv. */
  launchKeepsExtras: boolean;
  idCapture: string;
  /** The recovery contract's keys, sorted. Shape parity is checked on these. */
  contractKeys: string[];
  /** Contract fields whose value came back undefined. Must be empty. */
  contractUndefined: string[];
  resumeStrategy: string;
  resumeTemplate: string[];
  resumeExtrasPosition: string;
  sessionStore: string;
  requiresOriginalCwd: boolean;
  bareResumeIsDangerous: boolean;
  /** The contract survived JSON.stringify then parseAgentContract unchanged. */
  contractRoundTrips: boolean;
  /**
   * `originalCwdRule` would answer from the ROW. It reads `agentContract` first
   * and asks the live registry only when the row has no contract, so a contract
   * whose `requiresOriginalCwd` is a real boolean is what keeps a configured
   * agent off the registry on the restore path.
   */
  cwdBasisIsRow: boolean;
  /** The resume argv composed WITH the registry. Empty when there is none. */
  registryResume: string[];
  /** The resume argv composed from the PARSED ROW, with no registry lookup. */
  contractResume: string[];
  /** Those two are identical. This is what makes an uninstalled row restorable. */
  resumeAgrees: boolean;
  /** A resume argv built from an EMPTY id comes back empty rather than bare. */
  refusesEmptyId: boolean;
  /** No `<sessionId>` survived into the composed resume argv. */
  noUnfilledSlot: boolean;
}

/**
 * Compose a resume argv from the persisted contract ALONE.
 *
 * This is the restore path's leg of the gate. It deliberately re-implements the
 * composition from the contract's fields instead of calling
 * `registryResumeArgv`, because the thing being proved is that those fields are
 * sufficient on their own. The two answers are then compared for every compiled
 * agent, so a divergence between what the registry composes and what the row
 * can compose fails the build.
 */
function resumeFromContract(
  contract: AgentRecoveryContract,
  sessionId: string,
  extraArgs: readonly string[]
): string[] {
  if (contract.resumeStrategy !== 'flag-uuid') return [];
  if (sessionId.length === 0) return [];
  const args = contract.resumeTemplate.map((t) =>
    t === SESSION_ID_SLOT ? sessionId : t
  );
  if (!args.includes(sessionId)) return [];
  return contract.resumeExtrasPosition === 'leading'
    ? [contract.bin, ...extraArgs, ...args]
    : [contract.bin, ...args, ...extraArgs];
}

function reportOf(
  id: string,
  origin: 'compiled' | 'config',
  spec: { argv: string[]; idCapture: string },
  contract: AgentRecoveryContract,
  registryResume: string[],
  emptyIdResume: string[]
): AgentReport {
  const serialized = serializeAgentContract(contract);
  const parsed = parseAgentContract(serialized);
  const contractResume =
    parsed === undefined ? [] : resumeFromContract(parsed, CAPTURED_ID, EXTRAS);
  const undef: string[] = [];
  for (const [key, value] of Object.entries(contract)) {
    if (value === undefined) undef.push(key);
  }
  return {
    id,
    origin,
    launchArgv0: spec.argv[0] ?? null,
    launchKeepsExtras: EXTRAS.every((flag) => spec.argv.includes(flag)),
    idCapture: spec.idCapture,
    contractKeys: Object.keys(contract).sort(),
    contractUndefined: undef,
    resumeStrategy: contract.resumeStrategy,
    resumeTemplate: [...contract.resumeTemplate],
    resumeExtrasPosition: contract.resumeExtrasPosition,
    sessionStore: contract.sessionStore,
    requiresOriginalCwd: contract.requiresOriginalCwd,
    bareResumeIsDangerous: contract.bareResumeIsDangerous,
    contractRoundTrips:
      parsed !== undefined && JSON.stringify(parsed) === JSON.stringify(contract),
    cwdBasisIsRow:
      parsed !== undefined && typeof parsed.requiresOriginalCwd === 'boolean',
    registryResume,
    contractResume,
    resumeAgrees: JSON.stringify(registryResume) === JSON.stringify(contractResume),
    refusesEmptyId: emptyIdResume.length === 0,
    noUnfilledSlot: !registryResume.includes(SESSION_ID_SLOT)
  };
}

function compiledReport(id: LaunchableAgentId): AgentReport {
  const spec = buildLaunchSpec(id, EXTRAS, ABS_BIN);
  return reportOf(
    id,
    'compiled',
    spec,
    buildRecoveryContract(id, CONTRACT_INPUT, spec),
    registryResumeArgv(id, CAPTURED_ID, EXTRAS, ABS_BIN),
    registryResumeArgv(id, '', EXTRAS, ABS_BIN)
  );
}

// ---------------------------------------------------------------------------
// Section 3 — the renderer picker
// ---------------------------------------------------------------------------

function detectedRow(entry: AgentRegistryEntry): DetectedAgent {
  return {
    id: entry.id,
    displayName: entry.displayName,
    kind: entry.kind,
    launchable: entry.launchable,
    installed: true,
    binPath: `/usr/local/bin/${entry.id}`,
    version: '0.0.0',
    storeDetected: false,
    iconKey: entry.iconKey,
    unverified: entry.unverified === true
  };
}

/**
 * The wire row a configured agent arrives on.
 *
 * The cast is the finding, not a shortcut. `DetectedAgent.id` is the twelve
 * member `AgentRegistryId` union, so a configured agent cannot ride the
 * `agents:list` wire today without one. Widening that union is C1's decision,
 * and the checker prints where it stands.
 */
const SYNTH_DETECTED = {
  id: SYNTH_ID,
  displayName: 'Tortie Conformance Agent',
  kind: 'cli',
  launchable: true,
  installed: true,
  binPath: ABS_BIN,
  version: '0.0.0-conformance',
  storeDetected: false,
  iconKey: 'terminal',
  unverified: true
} as unknown as DetectedAgent;

function rendererReport() {
  const optimistic = { claude: true, codex: true };

  // ORDER MATTERS. The seed answer has to be taken before any scan is handed
  // in, because `agentShortLabel` learns names from every scan it sees.
  const seed = buildAgentOptions(null, optimistic)
    .filter((o) => o.id !== 'shell')
    .map((o) => ({ id: String(o.id), unverified: o.unverified }));

  const registrySeed = AGENT_REGISTRY.filter((e) => e.launchable).map((e) => ({
    id: String(e.id),
    unverified: e.unverified === true
  }));

  const labelBefore = agentShortLabel(SYNTH_ID);

  const scan: AgentsScanResult = {
    agents: [...AGENT_REGISTRY.map(detectedRow), SYNTH_DETECTED],
    scannedAt: 0
  };
  const withOverlay = buildAgentOptions(scan, optimistic);
  const synthOption = withOverlay.find((o) => String(o.id) === SYNTH_ID) ?? null;

  return {
    seed,
    registrySeed,
    launchableIds: LAUNCHABLE_AGENT_IDS.map(String),
    /** The configured agent became a chip with no edit to the renderer. */
    overlayIsOffered: synthOption !== null,
    overlayLabel: synthOption?.label ?? null,
    overlayIconKey: synthOption?.iconKey ?? null,
    overlayUnverified: synthOption?.unverified ?? null,
    /** Its name before any scan (a bare id) and after one (its display name). */
    labelBefore,
    labelAfter: agentShortLabel(SYNTH_ID),
    /** A scan must not overwrite the chosen chip copy for a compiled agent. */
    compiledLabelSurvives: agentShortLabel('cursor'),
    /** Shell is still last, and the capture-only IDE pair is still excluded. */
    lastOption: String(withOverlay.at(-1)?.id ?? ''),
    offeredIds: withOverlay.map((o) => String(o.id))
  };
}

// ---------------------------------------------------------------------------
// Section 4 — the overlay loader
// ---------------------------------------------------------------------------

/** A complete, execution bearing row for an agent this build has never seen. */
const NEW_ROW = {
  id: SYNTH_ID,
  displayName: 'Tortie Conformance Agent',
  binaries: ['tca'],
  launch: { argv: ['tca'], env: { TCA_COLOR: '1' } },
  resume: {
    template: ['--resume', SESSION_ID_SLOT],
    sessionStore: '~/.tca/sessions',
    idCapture: { mode: 'pre-assign', launchFlag: ['--session-id'] },
    resumeExtrasPosition: 'trailing'
  },
  versionProbe: { args: ['--version'] },
  iconKey: 'terminal'
};

/**
 * The row that must be dropped WHOLE.
 *
 * Its resume template has no `<sessionId>` slot. That is the durability rule
 * with the sharpest edge, because an argv that loses its id does not fail. It
 * attaches to somebody else's conversation. The valid rows on either side of it
 * must survive, and the error must name the field and say why.
 */
const BROKEN_ROW = {
  id: 'tortie-conf-broken',
  displayName: 'Broken Row',
  binaries: ['tcb'],
  launch: { argv: ['tcb'] },
  resume: {
    template: ['--resume', '--last'],
    sessionStore: '~/.tcb',
    idCapture: { mode: 'pre-assign', launchFlag: ['--session-id'] }
  }
};

/** A patch of a compiled agent that changes nothing a process would run. */
const PRESENTATION_ROW = { id: 'claude', displayName: 'Claude', iconKey: 'terminal' };

// `install` is excluded to mirror MergedAgentEntry (Phase 49): the merged
// table carries it nullable, and nothing in this probe reads it.
interface MergedEntry extends Omit<AgentRegistryEntry, 'id' | 'install'> {
  id: string;
  source: 'builtin' | 'patched' | 'config';
}

interface OverlayProblem {
  index: number;
  id: string | null;
  field: string;
  message: string;
}

/**
 * The seam, in four pure functions across two modules.
 *
 * `executionFieldsOf` is in `config/overlay.ts` and `executionHash` is in
 * `config/confirm.ts`. `confirm.ts` imports `electron`, but only for the
 * SEALED record, and the electron package resolves to a path string outside an
 * Electron process, so importing it from node succeeds and these two functions
 * stay pure. Nothing in this probe calls anything that reads the seal.
 */
interface OverlayApi {
  parseAgentOverlay(text: string): { rows: unknown[]; problems: OverlayProblem[] };
  mergeAgentOverlay(
    rows: readonly unknown[],
    registry?: readonly AgentRegistryEntry[]
  ): { agents: MergedEntry[]; problems: OverlayProblem[] };
  executionFieldsOf(entry: MergedEntry): unknown;
  executionHash(id: string, fields: unknown): string;
}

/**
 * Everything `buildRecoveryContract` reads off a registry entry, read off a
 * MERGED entry instead.
 *
 * The duplication is the point. When `buildRecoveryContract` grows a field that
 * comes from the entry, this function will not have it, and the key set check
 * in the checker fails. That is the drift alarm. It is the same reason the
 * resume argv above is composed twice.
 */
function contractFromMerged(entry: MergedEntry): AgentRecoveryContract {
  return {
    v: SESSION_CONTRACT_VERSION,
    at: CONTRACT_INPUT.at,
    bin: CONTRACT_INPUT.bin,
    cwdReal: CONTRACT_INPUT.cwdReal,
    projectReal: CONTRACT_INPUT.projectReal,
    requiresOriginalCwd: entry.resume.requiresOriginalCwd === true,
    bareResumeIsDangerous: entry.resume.bareResumeIsDangerous === true,
    resumeStrategy: entry.resume.strategy,
    resumeTemplate: [...entry.resume.template],
    resumeExtrasPosition: entry.resume.resumeExtrasPosition ?? 'trailing',
    idCapture:
      entry.resume.idCapture.mode === 'pre-assign'
        ? 'preassigned'
        : entry.resume.idCapture.mode === 'pre-assign-cmd'
          ? 'preassigned-cmd'
          : 'unsupported',
    sessionStore: entry.resume.sessionStore,
    // A configured agent has measured nothing, so both of these are the honest
    // "never" rather than a claim.
    captureRouteVerified: entry.unverified !== true,
    flagsVerifiedVersion: null,
    flagsVerifiedAgainst: 'never'
  };
}

/** The launch argv the create path would build from a merged entry. */
function launchArgvOf(entry: MergedEntry, id: string): string[] {
  const capture = entry.resume.idCapture;
  const flag = capture.mode === 'pre-assign' ? [...capture.launchFlag, id] : [];
  return [ABS_BIN, ...(entry.launch?.argv.slice(1) ?? []), ...flag, ...EXTRAS];
}

/**
 * The confirm hash for one row, taken the way the product takes it.
 *
 * The row goes through the WHOLE path — parse, merge, then the execution
 * fields of the merged entry — because for a patched compiled agent what a
 * person confirms is the compiled command line with their changes in it, not
 * the fields of the row in isolation. Hashing the row alone would be a
 * different question with a different answer.
 */
function hashOf(api: OverlayApi, id: string, over: Record<string, unknown>): string | null {
  const row = id === SYNTH_ID ? { ...NEW_ROW, ...over } : { id, ...over };
  const parsed = api.parseAgentOverlay(JSON.stringify({ schema: 1, agents: [row] }));
  if (parsed.rows.length === 0) return null;
  const entry = api.mergeAgentOverlay(parsed.rows).agents.find((e) => e.id === id);
  if (entry === undefined) return null;
  return api.executionHash(entry.id, api.executionFieldsOf(entry));
}

const SEAM_EXPORTS = [
  'parseAgentOverlay',
  'mergeAgentOverlay',
  'executionFieldsOf',
  'executionHash'
];

async function seamReport(): Promise<Record<string, unknown>> {
  let mod: Record<string, unknown>;
  try {
    const overlay = (await import(OVERLAY_SEAM)) as Record<string, unknown>;
    const confirm = (await import(CONFIRM_SEAM)) as Record<string, unknown>;
    mod = { ...overlay, ...confirm };
  } catch {
    return { state: 'absent', specifier: `${OVERLAY_SEAM} + ${CONFIRM_SEAM}` };
  }
  const missing = SEAM_EXPORTS.filter((name) => typeof mod[name] !== 'function');
  if (missing.length > 0) {
    return {
      state: 'incomplete',
      specifier: `${OVERLAY_SEAM} + ${CONFIRM_SEAM}`,
      missing,
      exports: Object.keys(mod).sort()
    };
  }
  const api = mod as unknown as OverlayApi;
  try {
    return await runSeam(api);
  } catch (err) {
    // A loader that imports but throws when used is a finding, not a crash.
    // Reporting it here means the checker prints one sentence a person can act
    // on instead of a stack trace with no verdict attached.
    return {
      state: 'broken',
      specifier: `${OVERLAY_SEAM} + ${CONFIRM_SEAM}`,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    };
  }
}

async function runSeam(api: OverlayApi): Promise<Record<string, unknown>> {
  const file = { schema: 1, agents: [NEW_ROW, BROKEN_ROW, PRESENTATION_ROW] };
  const parsed = api.parseAgentOverlay(JSON.stringify(file));
  const parsedIds = parsed.rows.map((r) => String((r as { id: string }).id));

  const compiledBefore = AGENT_REGISTRY.length;
  const merged = api.mergeAgentOverlay(parsed.rows);
  const compiledAfter = AGENT_REGISTRY.length;

  const newEntry = merged.agents.find((e) => e.id === SYNTH_ID) ?? null;
  const patchedClaude = merged.agents.find((e) => e.id === 'claude') ?? null;
  const compiledClaude = AGENT_REGISTRY.find((e) => e.id === 'claude') ?? null;
  // claude as the merge produces it with NO overlay at all, for the hash
  // comparison below. It has to come through the same merge, because the hash
  // is taken over a merged entry rather than over a registry entry.
  const compiledClaudeMerged =
    api.mergeAgentOverlay([]).agents.find((e) => e.id === 'claude') ?? null;

  let report: AgentReport | null = null;
  if (newEntry !== null) {
    const contract = contractFromMerged(newEntry);
    report = reportOf(
      SYNTH_ID,
      'config',
      { argv: launchArgvOf(newEntry, CAPTURED_ID), idCapture: 'preassigned' },
      contract,
      resumeFromContract(contract, CAPTURED_ID, EXTRAS),
      resumeFromContract(contract, '', EXTRAS)
    );
  }

  return {
    state: 'present',
    specifier: `${OVERLAY_SEAM} + ${CONFIRM_SEAM}`,
    compiledBefore,
    compiledAfter,
    parsedIds,
    parseProblems: parsed.problems.map((p) => ({ ...p })),
    mergeProblems: merged.problems.map((p) => ({ ...p })),
    mergedIds: merged.agents.map((e) => e.id),
    /** The twelve compiled rows still come first, in registry order. */
    mergedHeadMatchesRegistry:
      merged.agents
        .slice(0, AGENT_REGISTRY.length)
        .map((e) => e.id)
        .join('|') === AGENT_REGISTRY.map((e) => e.id).join('|'),
    newEntry:
      newEntry === null
        ? null
        : {
            source: newEntry.source,
            launchable: newEntry.launchable,
            unverified: newEntry.unverified === true,
            binaries: [...newEntry.binaries],
            launchArgv: [...(newEntry.launch?.argv ?? [])],
            launchEnvKeys: Object.keys(newEntry.launch?.env ?? {}).sort(),
            resumeStrategy: newEntry.resume.strategy,
            resumeTemplate: [...newEntry.resume.template],
            slotCount: newEntry.resume.template.filter((t) => t === SESSION_ID_SLOT).length,
            sessionStore: newEntry.resume.sessionStore,
            idCaptureMode: newEntry.resume.idCapture.mode,
            requiresOriginalCwd: newEntry.resume.requiresOriginalCwd === true,
            bareResumeIsDangerous: newEntry.resume.bareResumeIsDangerous === true
          },
    patched:
      patchedClaude === null || compiledClaude === null
        ? null
        : {
            source: patchedClaude.source,
            displayName: patchedClaude.displayName,
            iconKey: patchedClaude.iconKey,
            /** Presentation moved. Nothing a process would run did. */
            launchUnchanged:
              JSON.stringify(patchedClaude.launch) === JSON.stringify(compiledClaude.launch),
            resumeUnchanged:
              JSON.stringify(patchedClaude.resume) === JSON.stringify(compiledClaude.resume)
          },
    /**
     * The confirm gate's binding, proven on the hash alone. Changing a field
     * that can make a program run must re-arm the gate. Changing a label must
     * not, or a person would be asked again for a rename and would learn to
     * click through the sheet that matters.
     */
    hash: {
      base: hashOf(api, SYNTH_ID, {}),
      sameAgain: hashOf(api, SYNTH_ID, {}),
      // Presentation. None of these may move the hash.
      afterIconChange: hashOf(api, SYNTH_ID, { iconKey: 'claude' }),
      afterDisplayNameChange: hashOf(api, SYNTH_ID, { displayName: 'Renamed' }),
      afterNotesChange: hashOf(api, SYNTH_ID, { notes: 'a line for me' }),
      afterStoreDirsChange: hashOf(api, SYNTH_ID, { storeDirs: ['~/.tca'] }),
      afterSessionStoreChange: hashOf(api, SYNTH_ID, {
        resume: { ...NEW_ROW.resume, sessionStore: '~/somewhere-else' }
      }),
      // Execution bearing. Every one of these must move it.
      afterProbeDirChange: hashOf(api, SYNTH_ID, { extraProbeDirs: ['~/bin'] }),
      afterBinaryChange: hashOf(api, SYNTH_ID, {
        binaries: ['tcb'],
        launch: { argv: ['tcb'], env: { TCA_COLOR: '1' } }
      }),
      afterArgvChange: hashOf(api, SYNTH_ID, {
        launch: { argv: ['tca', '--yolo'], env: { TCA_COLOR: '1' } }
      }),
      afterEnvChange: hashOf(api, SYNTH_ID, {
        launch: { argv: ['tca'], env: { TCA_COLOR: '0' } }
      }),
      afterTemplateChange: hashOf(api, SYNTH_ID, {
        resume: { ...NEW_ROW.resume, template: ['resume', SESSION_ID_SLOT] }
      }),
      afterExtrasPositionChange: hashOf(api, SYNTH_ID, {
        resume: { ...NEW_ROW.resume, resumeExtrasPosition: 'leading' }
      }),
      afterIdCaptureChange: hashOf(api, SYNTH_ID, {
        resume: {
          ...NEW_ROW.resume,
          idCapture: { mode: 'pre-assign-cmd', argv: ['new-chat'] }
        }
      }),
      afterVersionProbeChange: hashOf(api, SYNTH_ID, { versionProbe: { args: ['-V'] } }),
      // A patch of a compiled agent that only renames it must hash to exactly
      // what the untouched compiled agent hashes to.
      compiledClaude:
        compiledClaudeMerged === null
          ? null
          : api.executionHash('claude', api.executionFieldsOf(compiledClaudeMerged)),
      renamedClaude: hashOf(api, 'claude', {
        displayName: 'Claude',
        iconKey: 'terminal'
      })
    },
    report
  };
}

// ---------------------------------------------------------------------------
// Section 5 — Phase 33, env passthrough
// ---------------------------------------------------------------------------
//
// `launch.envPassthrough` is a list of environment variable NAMES. The names
// are execution bearing and confirmed; the VALUES are read from the login
// shell at each launch and each restore, injected into the pane, and stored
// nowhere. Five facts keep that sentence true, and this section makes each
// one executable: the confirm hash moves on the name set and only on the name
// set, the manifest row carries names and never values, the resume argv is
// unchanged by the field, the sheet prints names and never values, and the
// refused names are refused. The checker prints one table row per assertion.
//
// Everything here is pure, like the rest of this probe. The login shell probe
// itself (`captureLoginShellEnv`) spawns a process, so it is NOT run here; its
// deadline and group kill are proven by the unit tests beside it and by the
// Tier 3 verifier driving the real app.

/** The configured names. Deliberately NOT sorted, to prove reorder is free. */
const P33_NAMES = ['P33_B_NAME', 'P33_A_NAME'];

/** A value that must appear in the pane env and in NOTHING that persists. */
const P33_SENTINEL = 'p33-resolved-value-that-must-never-be-stored';

/** The sheet line prefix pinned by the Phase 33 spec, section 4. */
const P33_SHEET_PREFIX = 'Reads from your shell at each launch: ';

/** The row: NEW_ROW's launch restated, plus the passthrough names. */
function p33Row(names: readonly string[], over: Record<string, unknown> = {}) {
  return {
    ...NEW_ROW,
    launch: { argv: ['tca'], env: { TCA_COLOR: '1' }, envPassthrough: [...names] },
    ...over
  };
}

/** What Phase 33 needs beyond OverlayApi: the sheet builder. */
interface P33ConfirmApi {
  describeExecution(id: string, fields: unknown): { lines: readonly string[] };
}

/** The two launch-plan functions the gate reads. Both pure. */
interface P33LaunchPlanApi {
  paneEnvFor(
    base: Record<string, string> | undefined,
    resolved: Record<string, string>,
    sessionId: string
  ): Record<string, string>;
  newSessionRecord(facts: unknown): Record<string, unknown>;
}

function p33HashOf(
  api: OverlayApi,
  names: readonly string[],
  over: Record<string, unknown> = {}
): string | null {
  const parsed = api.parseAgentOverlay(
    JSON.stringify({ schema: 2, agents: [p33Row(names, over)] })
  );
  if (parsed.rows.length === 0) return null;
  const entry = api.mergeAgentOverlay(parsed.rows).agents.find((e) => e.id === SYNTH_ID);
  if (entry === undefined) return null;
  return api.executionHash(entry.id, api.executionFieldsOf(entry));
}

/** Parse and merge one file; report whether `id` was dropped, and the problem. */
function p33Refusal(
  api: OverlayApi,
  file: Record<string, unknown>,
  id: string
): { dropped: boolean; field: string | null; message: string | null } {
  const parsed = api.parseAgentOverlay(JSON.stringify(file));
  const merged = api.mergeAgentOverlay(parsed.rows);
  const problems = [...parsed.problems, ...merged.problems];
  const named =
    problems.find(
      (p) => p.field.includes('envPassthrough') || p.message.includes('envPassthrough')
    ) ?? null;
  return {
    dropped: !merged.agents.some((e) => e.id === id),
    field: named === null ? null : named.field,
    message: named === null ? null : named.message
  };
}

async function p33Section(): Promise<Record<string, unknown>> {
  let overlay: Record<string, unknown>;
  let confirm: Record<string, unknown>;
  let plan: Record<string, unknown>;
  try {
    overlay = (await import(OVERLAY_SEAM)) as Record<string, unknown>;
    confirm = (await import(CONFIRM_SEAM)) as Record<string, unknown>;
    plan = (await import(LAUNCH_PLAN_SEAM)) as Record<string, unknown>;
  } catch {
    return {
      state: 'absent',
      missing: [`one of ${OVERLAY_SEAM}, ${CONFIRM_SEAM}, ${LAUNCH_PLAN_SEAM} did not import`]
    };
  }
  const missing: string[] = [];
  for (const name of SEAM_EXPORTS) {
    if (typeof { ...overlay, ...confirm }[name] !== 'function') {
      missing.push(`${name} (overlay seam)`);
    }
  }
  if (typeof confirm['describeExecution'] !== 'function') {
    missing.push('describeExecution (config/confirm)');
  }
  if (typeof plan['paneEnvFor'] !== 'function') {
    missing.push('paneEnvFor (sessions/launch-plan)');
  }
  if (typeof plan['newSessionRecord'] !== 'function') {
    missing.push('newSessionRecord (sessions/launch-plan)');
  }
  const api = { ...overlay, ...confirm } as unknown as OverlayApi & P33ConfirmApi;
  const planApi = plan as unknown as P33LaunchPlanApi;
  if (missing.length === 0) {
    // Schema 2 is the shape that carries the field. A loader that still
    // refuses the empty schema 2 file has not grown Phase 33 yet.
    const empty2 = api.parseAgentOverlay(JSON.stringify({ schema: 2, agents: [] }));
    if (empty2.problems.length > 0) {
      missing.push('schema 2 support in the overlay loader');
    }
  }
  if (missing.length > 0) return { state: 'absent', missing };
  try {
    return runP33(api, planApi);
  } catch (err) {
    return {
      state: 'broken',
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    };
  }
}

function runP33(
  api: OverlayApi & P33ConfirmApi,
  plan: P33LaunchPlanApi
): Record<string, unknown> {
  // Assertion 1 inputs: the hash against the name set.
  const hash = {
    base: p33HashOf(api, P33_NAMES),
    sameAgain: p33HashOf(api, P33_NAMES),
    afterAdd: p33HashOf(api, [...P33_NAMES, 'P33_C_NAME']),
    afterRemove: p33HashOf(api, P33_NAMES),
    afterReorder: p33HashOf(api, ['P33_A_NAME', 'P33_B_NAME']),
    afterDisplayName: p33HashOf(api, P33_NAMES, { displayName: 'Renamed' })
  };

  // Assertion 2 inputs: the record from a spec carrying the names, and the
  // pane env from a resolved map carrying the sentinel. The two compositions
  // are separate on purpose: values are not on the spec, so the record CANNOT
  // carry them, and this assertion is what keeps that true.
  const spec33 = {
    ...buildLaunchSpec('claude', EXTRAS, ABS_BIN),
    envPassthrough: [...P33_NAMES]
  };
  const record = plan.newSessionRecord({
    id: CAPTURED_ID,
    input: {
      name: 'p33-conformance',
      projectPath: CONTRACT_INPUT.projectReal,
      agent: 'claude'
    },
    cwd: CONTRACT_INPUT.cwdReal,
    spec: spec33,
    capture: undefined,
    agentVersion: '0.0.0-conformance',
    binPath: ABS_BIN,
    cwdReal: CONTRACT_INPUT.cwdReal,
    projectReal: CONTRACT_INPUT.projectReal,
    now: 0
  });
  const paneEnv = plan.paneEnvFor(spec33.env, { P33_A_NAME: P33_SENTINEL }, CAPTURED_ID);
  const hostile = plan.paneEnvFor(undefined, { GMUX_SESSION_ID: 'evil' }, CAPTURED_ID);

  // Assertions 3 and 4 inputs: the merged passthrough row, its resume report
  // and its sheet.
  const parsed = api.parseAgentOverlay(
    JSON.stringify({ schema: 2, agents: [p33Row(P33_NAMES)] })
  );
  const merged = api.mergeAgentOverlay(parsed.rows);
  const entry = merged.agents.find((e) => e.id === SYNTH_ID) ?? null;
  let report: AgentReport | null = null;
  let mergedNames: string[] | null = null;
  let sheet: { passthroughLines: string[]; valueLeak: boolean } | null = null;
  if (entry !== null) {
    const contract = contractFromMerged(entry);
    report = reportOf(
      'p33-env-passthrough',
      'config',
      { argv: launchArgvOf(entry, CAPTURED_ID), idCapture: 'preassigned' },
      contract,
      resumeFromContract(contract, CAPTURED_ID, EXTRAS),
      resumeFromContract(contract, '', EXTRAS)
    );
    mergedNames =
      ((entry.launch ?? {}) as { envPassthrough?: string[] }).envPassthrough ?? null;
    const summary = api.describeExecution(entry.id, api.executionFieldsOf(entry));
    sheet = {
      passthroughLines: summary.lines.filter((l) => l.startsWith(P33_SHEET_PREFIX)),
      valueLeak: summary.lines.some((l) => l.includes(P33_SENTINEL))
    };
  }

  // Assertion 5 inputs: the two refusals.
  const refusePiDir = p33Refusal(
    api,
    { schema: 2, agents: [p33Row(['PI_CODING_AGENT_DIR'])] },
    SYNTH_ID
  );
  const refuseSchema1 = p33Refusal(
    api,
    { schema: 1, agents: [p33Row(P33_NAMES)] },
    SYNTH_ID
  );

  return {
    state: 'present',
    names: [...P33_NAMES],
    sentinel: P33_SENTINEL,
    sheetPrefix: P33_SHEET_PREFIX,
    hash,
    record: {
      envPassthrough:
        Array.isArray(record['envPassthrough']) ? [...(record['envPassthrough'] as string[])] : null,
      recordJsonHasSentinel: JSON.stringify(record).includes(P33_SENTINEL),
      paneEnvCarriesValue: paneEnv['P33_A_NAME'] === P33_SENTINEL,
      stampSurvives: hostile['GMUX_SESSION_ID'] === CAPTURED_ID
    },
    mergedNames,
    report,
    sheet,
    refusePiDir,
    refuseSchema1
  };
}

// ---------------------------------------------------------------------------
// Section 7 — Phase 269, the settings route to a shell variable name
// ---------------------------------------------------------------------------
//
// Phase 33 (section 5 above) built the mechanism and left it unreachable: no
// compiled row sets `launch.envPassthrough`, and the only route to it was an
// `agents.json` file most people do not have. Phase 269 added the second
// route, being Settings then Launch defaults, sealed the way a danger flag is.
//
// This section makes the SHAPE half of that route executable. Everything it
// touches is pure: the refusal, the sanitizer, the union, the compiled table.
// The SEAL itself needs `safeStorage` and therefore an Electron process, so it
// belongs to the unit tests beside the store and to `probe:p269`, exactly as
// the confirm gate belongs to the Tier 3 verifier rather than to this file.
//
// The denylist rows are DERIVED from the three exported arrays rather than
// written out, so a name added to a denylist later is covered here with no
// second edit and no second list to keep in step.

/** Phase 269: where the catalog views are composed. Pure; starts nothing. */
const SETTINGS_IPC_SEAM = '../src/main/settings/ipc';

/** What Phase 269 needs from the settings IPC module. */
interface P269CatalogApi {
  getFlagCatalogViews(): Record<string, { envKeys?: unknown } | undefined>;
}

/** One refusal probe: the name, and the sentence (or null) it earned. */
function p269Refusal(
  name: string,
  ctx?: Parameters<typeof envPassthroughRefusal>[1]
): { name: string; sentence: string | null } {
  return { name, sentence: envPassthroughRefusal(name, ctx) };
}

function p269Section(): Record<string, unknown> {
  // 1. The three denylists, derived.
  const denied = [
    ...ENV_REFUSED_EXACT.map((name) => p269Refusal(name)),
    // A prefix is probed as `<prefix>X`, which is a name the pattern matches
    // and the shape rules accept, so a pass can only come from the denylist.
    ...ENV_REFUSED_PREFIXES.map((prefix) => p269Refusal(`${prefix}X`)),
    ...ENV_PASSTHROUGH_REFUSED.map((row) => p269Refusal(row.name))
  ];

  // 2. What a usable name looks like.
  //
  // A LOWER CASE NAME IS ACCEPTED, and that is deliberate rather than an
  // oversight in this list. `OVERLAY_ENV_KEY_PATTERN` is the one pattern both
  // routes read, it has always admitted a lower case name, and a shell
  // variable is free to be one. The sentence a person gets says "letters,
  // digits and underscores", which is true of `fireworks_api_key`. Narrowing
  // the pattern here would make the two routes disagree about the same name.
  const accepted = ['A_B9', 'FIREWORKS_API_KEY', 'fireworks_api_key'].map((n) =>
    p269Refusal(n)
  );
  const malformed = [
    '9LIVES',
    'A'.repeat(65),
    '',
    'MY-KEY',
    'HAS SPACE'
  ].map((n) => p269Refusal(n));

  // 3. The cap, driven exactly.
  const sixteen = Array.from({ length: 16 }, (_v, i) => `P269_N${i}`);
  const cap = {
    limit: OVERLAY_LIMITS.maxEnvPassthroughNames,
    sixteenth: p269Refusal('P269_N15', { existing: sixteen.slice(0, 15) }),
    seventeenth: p269Refusal('P269_N16', { existing: sixteen })
  };

  // 4. A duplicate, and the agent's own compiled variable. The cursor row is
  // asserted NON-EMPTY first, so this row cannot go vacuous if that row ever
  // loses its `launch.env`.
  const cursorEnvKeys = [...compiledLaunchEnvKeys('cursor')];
  const own = {
    cursorEnvKeys,
    duplicate: p269Refusal('P269_A', { existing: ['P269_A'] }),
    ownKey: p269Refusal(cursorEnvKeys[0] ?? 'P269_NOT_AN_AGENT_KEY', {
      agentEnvKeys: cursorEnvKeys
    }),
    ownKeyOnAnotherAgent: p269Refusal(cursorEnvKeys[0] ?? 'P269_NOT_AN_AGENT_KEY', {
      agentEnvKeys: [...compiledLaunchEnvKeys('claude')]
    })
  };

  // 5. The sanitizer, which is what the settings store calls.
  const launchable = (id: string): boolean =>
    (LAUNCHABLE_AGENT_IDS as readonly string[]).includes(id);
  const sanitize = (raw: unknown): unknown => {
    try {
      return sanitizeEnvPassthrough(raw, launchable, compiledLaunchEnvKeys);
    } catch (err) {
      return { threw: err instanceof Error ? err.message : String(err) };
    }
  };
  const sanitized = {
    unknownId: sanitize({ 'not-an-agent': ['P269_A'] }),
    notAnArray: sanitize({ claude: 'P269_A' }),
    notAnObject: sanitize('P269_A'),
    nullish: sanitize(null),
    nonStringEntry: sanitize({ claude: [7, 'P269_A', null] }),
    refusedNames: sanitize({
      claude: ['P269_A', 'PATH', 'P269_B', 'PI_CODING_AGENT_DIR', 'GMUX_SESSION_ID']
    }),
    overCap: sanitize({ claude: [...sixteen, 'P269_OVER'] }),
    ownKey: sanitize({ cursor: cursorEnvKeys }),
    order: sanitize({ claude: ['P269_Z', 'P269_A', 'P269_M'] })
  };

  // 6. The union the launch path reads.
  const row = ['P269_ROW_A', 'P269_ROW_B'];
  const set = ['P269_ROW_B', 'P269_SET_A'];
  const rowCopy = [...row];
  const setCopy = [...set];
  // PHASE 275 passes the third source EXPLICITLY here, undefined, because that
  // is the shape of a person who has no shared list. These six readings are the
  // Phase 269 ones and they must not move by one byte: the shared source joined
  // the union ON THE END for exactly that reason.
  const union = {
    bothEmpty: envPassthroughFor(undefined, undefined, undefined) ?? null,
    bothEmptyLists: envPassthroughFor([], [], undefined) ?? null,
    rowOnly: envPassthroughFor(row, undefined, undefined) ?? null,
    settingsOnly: envPassthroughFor(undefined, set, undefined) ?? null,
    merged: envPassthroughFor(row, set, undefined) ?? null,
    rowUnchanged: JSON.stringify(row) === JSON.stringify(rowCopy),
    settingsUnchanged: JSON.stringify(set) === JSON.stringify(setCopy)
  };

  // 7. No compiled row names a variable. The Phase 33 promise, asserted over
  // the whole table so it survives the arrival of a second route.
  const compiledNamers = AGENT_REGISTRY.filter(
    (e) => (e.launch?.envPassthrough ?? []).length > 0
  ).map((e) => e.id);

  return {
    state: 'present',
    denied,
    accepted,
    malformed,
    cap,
    own,
    sanitized,
    union,
    compiledNamers
  };
}

/** 8. Every catalog view carries `envKeys`, equal to the compiled row's. */
async function p269CatalogSection(): Promise<Record<string, unknown>> {
  let mod: Record<string, unknown>;
  try {
    mod = (await import(SETTINGS_IPC_SEAM)) as Record<string, unknown>;
  } catch (err) {
    return {
      state: 'absent',
      missing: `${SETTINGS_IPC_SEAM} did not import: ${
        err instanceof Error ? err.message : String(err)
      }`
    };
  }
  if (typeof mod['getFlagCatalogViews'] !== 'function') {
    return { state: 'absent', missing: 'getFlagCatalogViews is not exported' };
  }
  try {
    const views = (mod as unknown as P269CatalogApi).getFlagCatalogViews();
    const rows = Object.entries(views).map(([id, view]) => ({
      id,
      envKeys: view?.envKeys ?? null,
      expected: [...compiledLaunchEnvKeys(id)]
    }));
    return { state: 'present', rows };
  } catch (err) {
    return {
      state: 'broken',
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    };
  }
}

// ---------------------------------------------------------------------------
// Section 9 — Phase 275, the SHARED list every agent reads
// ---------------------------------------------------------------------------
//
// Phase 269 (section 7 above) gave a person a route to a shell variable name
// and keyed it by AGENT, so one provider key had to be set once per agent
// through a control that added one name at a time. Phase 275 put a SHARED list
// beside the per-agent map: one list, every launchable agent, including agents
// installed after the name was confirmed.
//
// THAT IS A WIDENING OF WHAT ONE CONFIRMATION COVERS, and it is the only part
// of the phase this file exists for. The seal that stands between a hand-edited
// settings.json and a spawned process has two layers, and exactly one of them
// moves:
//
//   LAYER ONE DOES NOT MOVE. A name no human confirmed is dropped. That is
//   refusal 8 in CLAUDE.md and nothing here touches it.
//
//   LAYER TWO MOVES BY DESIGN. At the parent, a name confirmed for `claude`
//   could not reach `codex`, because `envNameKey` puts the agent id IN the seal
//   key. A shared set means one confirmation covers every agent, so the shared
//   list gets its OWN sealed field, `DangerState.envShared`, holding BARE
//   names.
//
// The two refusals that follow from that are the most important assertions in
// this file, and they are driven rather than reasoned about:
//
//   R-A  a SHARED name sealed PER-AGENT is dropped and reported.
//   R-B  a PER-AGENT name sealed as SHARED is dropped and reported.
//
// Both run against the SHIPPING `withSealedDangerState`, which is pure and
// takes the opened seal as an argument, so no `safeStorage` and no Electron is
// needed for either. What this section still cannot reach is the CIPHERTEXT:
// `sealDangerState` and `openDangerSeal` are not exported and need a keystore.
// The text they seal is `JSON.stringify(dangerStateOf(settings))`, and that
// string IS reachable here, so "the seal moves when a shared name is added" is
// asserted over the exact bytes the keystore would be handed. The ciphertext
// half belongs to `src/main/settings/__tests__/p275-env-shared-seal.test.ts`
// and to the Tier 3 verifier driving the real app.
//
// NO VALUE, ANYWHERE. Every name below is invented in this file, in the shape a
// provider key has and matching none. Nothing here reads an environment
// variable, opens a settings file, or touches anything under a home directory.

/** Where the seal lives. Pure exports only; `getSettings` is never called. */
const SETTINGS_STORE_SEAM = '../src/main/settings/store';

/** The shape of the opened seal, restated so this file needs no type import. */
interface P275DangerState {
  readonly defaults: readonly string[];
  readonly acks: readonly string[];
  readonly fold: string | null;
  readonly arch: string | null;
  readonly env: readonly string[];
  readonly envShared: readonly string[];
}

/** The pure half of the settings store this section drives. */
interface P275StoreApi {
  dangerStateOf(settings: GmuxSettings): P275DangerState;
  isDangerStateEmpty(state: P275DangerState): boolean;
  withSealedDangerState(
    settings: GmuxSettings,
    sealed: P275DangerState
  ): {
    settings: GmuxSettings;
    rejected: string[];
    envRejected: { shared: string[]; perAgent: Record<string, string[] | undefined> };
  };
  sanitizeSettings(raw: unknown): GmuxSettings;
  sharedRefusedEnvKeys(): readonly string[];
}

/**
 * Invented names, in the shape a provider key has and matching none. The two
 * that stand for a real key are deliberately spelled with the phase number in
 * them so a grep for one of these strings can never hit a person's own shell.
 */
const P275_SHARED = 'P275_PROVIDER_KEY';
const P275_SECOND = 'P275_SECOND_KEY';

/** A settings object carrying nothing but the fields one assertion needs. */
function p275Settings(over: Partial<GmuxSettings>): GmuxSettings {
  return { ...defaultGmuxSettings(), ...over };
}

/** A seal covering exactly what it is handed and nothing else. */
function p275Seal(over: Partial<P275DangerState>): P275DangerState {
  return {
    defaults: [],
    acks: [],
    fold: null,
    arch: null,
    env: [],
    envShared: [],
    ...over
  };
}

/**
 * Rule 35c's fixture. The per-agent key space and the shared one have to be
 * disjoint over EVERY launchable id rather than over a convenient one, because
 * the claim is about a closed compiled set.
 */
const P275_KEY_NAMES = [P275_SHARED, 'FORCE_COLOR', 'A', '_9'];

/** The pure half: nothing here needs the settings store. */
function p275PureSection(): Record<string, unknown> {
  // --- rule 33 and rule 35c. The two key spaces, over every launchable id.
  const ids = [...LAUNCHABLE_AGENT_IDS] as string[];
  const collisions: string[] = [];
  const wrongSpaceCount: string[] = [];
  const starting: string[] = [];
  for (const id of ids) {
    for (const name of P275_KEY_NAMES) {
      const key = envNameKey(id, name);
      // The bare name is what the SHARED seal field holds, so a per-agent key
      // equal to one would be admitted as shared. That is R-A with the belts
      // removed, and it is the collision this loop exists to refuse.
      if (key === name || key === envSharedKey(name)) collisions.push(key);
      if ((key.match(/ /g) ?? []).length !== 1) wrongSpaceCount.push(key);
      if (key.startsWith('*')) starting.push(key);
    }
  }
  const keys = {
    ids,
    idCount: ids.length,
    collisions,
    wrongSpaceCount,
    startingWithStar: starting,
    // Belt two, textual: the alphabet forbids a space, so a bare name holds
    // none and a per-agent key holds exactly one.
    patternAdmitsSpace: new RegExp(OVERLAY_ENV_KEY_PATTERN).test('A B'),
    idsNotLowercase: ids.filter((id) => !/^[a-z]/.test(id)),
    sharedKey: envSharedKey(P275_SHARED),
    sharedKeySpaces: (envSharedKey(P275_SHARED).match(/ /g) ?? []).length,
    sampleAgentKey: envNameKey('claude', P275_SHARED)
  };

  // --- rule 18. The two cap sentences, READ FROM the function rather than
  // written out here, so a reworded sentence is caught by the difference and
  // never by a stale copy of the words.
  const sixteen = Array.from({ length: 16 }, (_v, i) => `P275_N${String(i)}`);
  const cap = {
    limit: OVERLAY_LIMITS.maxEnvPassthroughNames,
    agent: envPassthroughRefusal('P275_N16', { existing: sixteen }),
    shared: envPassthroughRefusal('P275_N16', { existing: sixteen, scope: 'shared' }),
    // The default is `'agent'`, so every call site written before Phase 275
    // says the sentence it always said.
    defaulted: envPassthroughRefusal('P275_N16', { existing: sixteen, scope: undefined }),
    // The last check's subject also moves, because the shared list reaches
    // every agent and naming one of them would name an agent the person is not
    // looking at.
    ownAgent: envPassthroughRefusal('FORCE_COLOR', { agentEnvKeys: ['FORCE_COLOR'] }),
    ownShared: envPassthroughRefusal('FORCE_COLOR', {
      agentEnvKeys: ['FORCE_COLOR'],
      scope: 'shared'
    })
  };

  // --- rules 14, 15, 16. The shared sanitizer's shape table.
  const sanitize = (
    raw: unknown,
    refusedKeys: readonly string[] = []
  ): unknown => {
    try {
      return sanitizeEnvPassthroughShared(raw, refusedKeys);
    } catch (err) {
      return { threw: err instanceof Error ? err.message : String(err) };
    }
  };
  const shapeTable = {
    nullish: sanitize(null),
    undef: sanitize(undefined),
    anObject: sanitize({ 0: P275_SHARED }),
    aString: sanitize(P275_SHARED),
    aNumber: sanitize(7),
    // One bad entry never denies the rest: a denial an agent with write access
    // could author in one line would take away every key a person set.
    mixed: sanitize([7, 'P275_A', null, 'P275_B']),
    // A refused name that is SAFE TO DRAW is echoed by name.
    refusedEchoed: sanitize(['PATH', 'P275_A']),
    // A refused name that is NOT safe to draw is counted and never echoed.
    tooLong: sanitize(['A'.repeat(65)]),
    // A THIRD COPY OF THE WRONG CLAIM, corrected by the fix round. This comment
    // used to say `$` matches before a FINAL NEWLINE with no `m` flag, so
    // "NAME\n" passes the pattern on its own. That is Python and Perl; measured
    // on 2026-09-16, `new RegExp('^[A-Za-z_][A-Za-z0-9_]{0,63}$').test('ABC\n')`
    // is false. The build corrected the two copies in src/ and left this one,
    // which is how a wrong comment survives a phase that set out to kill it.
    // The two fixtures stay for the reason `isDrawableEnvName` keeps its two
    // explicit checks: the pattern is a shared constant, and an `m` flag added
    // to it for some other caller would open the hole in silence.
    trailingNewline: sanitize(['P275_NL\n']),
    carriageReturn: sanitize(['P275_CR\r']),
    // Nothing is repaired into an acceptable shape: no trim, no case fold.
    notTrimmed: sanitize([' P275_A ']),
    order: sanitize(['P275_Z', 'P275_A', 'P275_M']),
    duplicate: sanitize(['P275_A', 'P275_A']),
    overCap: sanitize([...sixteen, 'P275_OVER']),
    // R16b, THE FIX ROUND. The echo itself is bounded. `names` was always
    // capped at sixteen by `envPassthroughRefusal`; `refused` was not, because
    // it runs over the RAW file whose length is the file writer's to choose —
    // and since this phase that writer is the exact actor layer one of the seal
    // names. A verifier measured 200,000 junk names becoming a 12,088,932-byte
    // paragraph in the Settings window. Two hundred here, of which sixteen may
    // be echoed and 184 must be a COUNT.
    flood: sanitize(Array.from({ length: 200 }, (_v, i) => `P275_FLOOD_${String(i)}`))
  };

  // --- rule 23. The three source union.
  const row = ['P275_ROW_A', 'P275_ROW_B'];
  const per = ['P275_ROW_B', 'P275_SET_A'];
  const shared = ['P275_SET_A', 'P275_SHR_A'];
  const rowCopy = [...row];
  const perCopy = [...per];
  const sharedCopy = [...shared];
  const union = {
    threeEmpty: envPassthroughFor(undefined, undefined, undefined) ?? null,
    threeEmptyLists: envPassthroughFor([], [], []) ?? null,
    sharedOnly: envPassthroughFor(undefined, undefined, shared) ?? null,
    // The Phase 269 answer, asserted to be BYTE FOR BYTE what it was: the
    // shared source joined on the END so nobody who never uses it sees an
    // argv, a manifest row or a notice list move.
    parentUndefined: envPassthroughFor(row, per, undefined) ?? null,
    parentEmptyList: envPassthroughFor(row, per, []) ?? null,
    merged: envPassthroughFor(row, per, shared) ?? null,
    rowUnchanged: JSON.stringify(row) === JSON.stringify(rowCopy),
    perUnchanged: JSON.stringify(per) === JSON.stringify(perCopy),
    sharedUnchanged: JSON.stringify(shared) === JSON.stringify(sharedCopy)
  };

  // --- rule 12. Empty at install is not a nicety: it is what keeps the union
  // `undefined` for a person who configured nothing, which is what keeps the
  // login-shell probe unspawned on every launch.
  const defaults = {
    shared: defaultGmuxSettings().envPassthroughShared,
    hasField: 'envPassthroughShared' in defaultGmuxSettings()
  };

  return { keys, cap, shapeTable, union, defaults };
}

/** The half that needs the settings store, which imports `electron`. */
async function p275SealSection(): Promise<Record<string, unknown>> {
  let mod: Record<string, unknown>;
  try {
    mod = (await import(SETTINGS_STORE_SEAM)) as Record<string, unknown>;
  } catch (err) {
    return {
      state: 'absent',
      missing: `${SETTINGS_STORE_SEAM} did not import: ${
        err instanceof Error ? err.message : String(err)
      }`
    };
  }
  const wanted = [
    'dangerStateOf',
    'isDangerStateEmpty',
    'withSealedDangerState',
    'sanitizeSettings',
    'sharedRefusedEnvKeys'
  ];
  const absent = wanted.filter((name) => typeof mod[name] !== 'function');
  if (absent.length > 0) {
    return { state: 'absent', missing: `${absent.join(', ')} is not exported` };
  }
  const api = mod as unknown as P275StoreApi;

  try {
    // --- rule 7 and its ablation, rule 31. `getSettings` short-circuits on
    // `isDangerStateEmpty` and returns the file VERBATIM, WITHOUT OPENING THE
    // SEAL. It is a boolean expression over an object, so a field added to
    // `DangerState` and forgotten here leaves the function COMPILING AND
    // WRONG, and a settings.json whose only danger value is a shared name
    // would be admitted unsealed. That is a complete bypass of layer one, and
    // it is the single most important line in this phase.
    const onlyShared = p275Settings({ envPassthroughShared: [P275_SHARED] });
    const nothing = p275Settings({});
    const empty = {
      withOnlyASharedName: api.isDangerStateEmpty(api.dangerStateOf(onlyShared)),
      withNothing: api.isDangerStateEmpty(api.dangerStateOf(nothing)),
      // The control: the per-agent field has had this clause since Phase 269.
      withOnlyAPerAgentName: api.isDangerStateEmpty(
        api.dangerStateOf(p275Settings({ envPassthrough: { claude: [P275_SHARED] } }))
      )
    };

    // --- rules 2 and 30. The sealed TEXT is what `sealDangerState` encrypts,
    // so comparing these strings compares the bytes the keystore is handed.
    const text = (s: GmuxSettings): string => JSON.stringify(api.dangerStateOf(s));
    const seal = {
      base: text(nothing),
      afterAdd: text(onlyShared),
      afterRemove: text(p275Settings({})),
      // Sorted, so two orders of the same set seal to one text and a person is
      // never asked to re-approve a reorder.
      twoNamesOneOrder: text(
        p275Settings({ envPassthroughShared: [P275_SHARED, P275_SECOND] })
      ),
      twoNamesOtherOrder: text(
        p275Settings({ envPassthroughShared: [P275_SECOND, P275_SHARED] })
      ),
      // BARE names, never `envSharedKey`'s display form, and never an agent id.
      sharedField: [...api.dangerStateOf(onlyShared).envShared]
    };

    // --- R-A, rule 27. A SHARED name sealed PER-AGENT.
    const raIn = p275Settings({ envPassthroughShared: [P275_SHARED] });
    const ra = api.withSealedDangerState(
      raIn,
      p275Seal({ env: [envNameKey('claude', P275_SHARED)] })
    );

    // --- R-B, rule 28. A PER-AGENT name sealed as SHARED.
    const rbIn = p275Settings({ envPassthrough: { claude: [P275_SHARED] } });
    const rb = api.withSealedDangerState(rbIn, p275Seal({ envShared: [P275_SHARED] }));

    // --- The control beside both: sealed the RIGHT way, the name survives, so
    // neither refusal above can be passing because the seal drops everything.
    const okShared = api.withSealedDangerState(
      raIn,
      p275Seal({ envShared: [P275_SHARED] })
    );
    const okAgent = api.withSealedDangerState(
      rbIn,
      p275Seal({ env: [envNameKey('claude', P275_SHARED)] })
    );

    // --- rule 32. A seal written before this phase has no `envShared` member
    // at all. It must cover no shared name rather than throw or admit one.
    const oldSealState = { defaults: [], acks: [], fold: null, arch: null, env: [] };
    const oldSeal = api.withSealedDangerState(
      raIn,
      oldSealState as unknown as P275DangerState
    );

    // --- rule 17. The shared list refuses every name any launchable agent's
    // compiled `launch.env` sets, and the gate DERIVES that union itself from
    // the registry rather than reading the store's answer twice.
    const derived = [
      ...new Set(LAUNCHABLE_AGENT_IDS.flatMap((id) => [...compiledLaunchEnvKeys(id)]))
    ].sort();
    const stored = [...api.sharedRefusedEnvKeys()].sort();
    const refusedUnion = {
      derived,
      stored,
      // Each one, put on the shared list by hand, must come back refused.
      sanitized: sanitizeEnvPassthroughShared(derived, stored)
    };

    // --- rule 18, the SEPARATE budgets, driven through the door a settings
    // file actually comes in at. Sixteen shared names and sixteen claude names
    // must BOTH survive: one sixteen split between the two lists would mean a
    // shared name silently shrinks what an agent may add on its own card.
    const sixteenShared = Array.from({ length: 16 }, (_v, i) => `P275_S${String(i)}`);
    const sixteenAgent = Array.from({ length: 16 }, (_v, i) => `P275_A${String(i)}`);
    const both = api.sanitizeSettings({
      envPassthroughShared: sixteenShared,
      envPassthrough: { claude: sixteenAgent }
    });
    const budgets = {
      shared: both.envPassthroughShared.length,
      agent: (both.envPassthrough.claude ?? []).length
    };

    // --- rule 13. `sanitizeSettings` fills the field through the shared
    // sanitizer, so a hand-edited file is bounded before the seal is asked.
    const sanitized = api.sanitizeSettings({
      envPassthroughShared: ['P275_KEEP', 7, 'PATH', 'A'.repeat(65), 'P275_ALSO']
    }).envPassthroughShared;

    return {
      state: 'present',
      empty,
      seal,
      ra: {
        kept: ra.settings.envPassthroughShared,
        rejected: ra.rejected,
        reportedShared: ra.envRejected.shared,
        reportedPerAgent: ra.envRejected.perAgent['claude'] ?? []
      },
      rb: {
        kept: rb.settings.envPassthrough.claude ?? [],
        rejected: rb.rejected,
        reportedShared: rb.envRejected.shared,
        reportedPerAgent: rb.envRejected.perAgent['claude'] ?? []
      },
      okShared: {
        kept: okShared.settings.envPassthroughShared,
        rejected: okShared.rejected
      },
      okAgent: {
        kept: okAgent.settings.envPassthrough.claude ?? [],
        rejected: okAgent.rejected
      },
      oldSeal: { kept: oldSeal.settings.envPassthroughShared, rejected: oldSeal.rejected },
      refusedUnion,
      budgets,
      sanitized,
      expectShared: envSharedKey(P275_SHARED),
      expectAgent: envNameKey('claude', P275_SHARED),
      name: P275_SHARED
    };
  } catch (err) {
    return {
      state: 'broken',
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    };
  }
}

// ---------------------------------------------------------------------------
// Section 11 — Phase 331, the screen record and the two inline switches
// ---------------------------------------------------------------------------
//
// build/p331/SPEC.md §2.9. Phase 331 compiles an inline switch for exactly two
// agents: Codex's `-c tui.fullscreen_transcript=false` on its launch argv AND
// its resume template, and Claude Code's `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN`
// in its compiled `launch.env`. Section 2 cannot see either one go, because the
// registry and the parsed contract move together, so this block prints the
// registry's OWN exports for the checker to hold them to: every compiled row's
// screen record, launch argv, launch env and resume template; the two argv
// builders composed over the switched argv row with an extra of the person's
// own; the compiled env keys per launchable id and the shared refused set; the
// refusal sentence; the confirm hash of the merged codex and claude entries with
// and without `screen`; and five rows DRIVEN through the shipping
// `parseAgentOverlay`, one parse each. Nothing here is written anywhere and
// nothing is started.

/** A flag of the person's own, invented here so it can never be a real one. */
const P331_OWN = '--p331-own';
const P331_ID = 'P331-ID';
/** A screen record as a configuration row would carry one: well formed, and refused anyway. */
const P331_SCREEN = { class: 'inline-already', measured: 'p331 conformance', notes: [] };
const P331_NEW_AGENT = {
  id: 'tortie-conf-p331',
  displayName: 'Tortie Conformance P331',
  binaries: ['tortie-conf-p331'],
  launch: { argv: ['tortie-conf-p331'] }
};
/** Each row, what it must come back as, and the field a refusal must name. */
const P331_CASES = [
  { name: 'a new agent carrying screen', expect: 'refused', row: { ...P331_NEW_AGENT, screen: P331_SCREEN } },
  { name: 'codex patched with screen', expect: 'refused', row: { id: 'codex', screen: P331_SCREEN } },
  { name: 'claude patched with screen', expect: 'refused', row: { id: 'claude', screen: P331_SCREEN } },
  { name: 'control: the same new agent without screen', expect: 'accepted', row: { ...P331_NEW_AGENT } },
  { name: 'control: codex patched with a display name only', expect: 'accepted', row: { id: 'codex', displayName: 'Codex' } }
];

/** The screen record exactly as the compiled row carries it, or null. */
function p331ScreenOf(entry: AgentRegistryEntry): unknown {
  const screen = (entry as unknown as { screen?: unknown }).screen;
  return screen === undefined ? null : JSON.parse(JSON.stringify(screen));
}

async function p331Section(): Promise<Record<string, unknown>> {
  const rows = AGENT_REGISTRY.map((e) => ({
    id: e.id,
    launchable: e.launchable,
    screen: p331ScreenOf(e),
    launchArgv: e.launch === null ? null : [...e.launch.argv],
    launchEnv: e.launch === null ? null : { ...(e.launch.env ?? {}) },
    resumeTemplate: [...e.resume.template],
    resumeExtrasPosition: e.resume.resumeExtrasPosition ?? 'trailing'
  }));

  // The two builders over every row whose record carries its switch in the
  // argv (codex today), handed one flag of the person's own, as a create and a
  // restore would hand it.
  const composed: Record<string, { bin: string; launch: string[]; resume: string[] }> = {};
  for (const e of AGENT_REGISTRY) {
    const screen = p331ScreenOf(e) as { class?: string; carriage?: string } | null;
    if (!e.launchable || e.launch === null || screen?.class !== 'switch-to-inline' || screen.carriage !== 'argv') continue;
    const entry = e as AgentRegistryEntry & { launch: NonNullable<AgentRegistryEntry['launch']> };
    const bin = `/abs/${e.id}`;
    composed[e.id] = {
      bin,
      launch: launchArgvFor(entry, [P331_OWN], bin),
      resume: resumeArgvFor(entry, P331_ID, [P331_OWN], bin)
    };
  }

  const compiledEnvKeys = Object.fromEntries(
    LAUNCHABLE_AGENT_IDS.map((id) => [id, [...compiledLaunchEnvKeys(id)]])
  );

  // The shared refused set, from the settings store's own export. It imports
  // `electron`, which resolves to a path string outside an Electron process,
  // exactly as section 9's seal half reads it.
  let sharedRefused: string[] | null = null;
  let sharedWhy = '';
  try {
    const store = (await import(SETTINGS_STORE_SEAM)) as Record<string, unknown>;
    if (typeof store['sharedRefusedEnvKeys'] === 'function') {
      sharedRefused = [...(store['sharedRefusedEnvKeys'] as () => readonly string[])()];
    } else {
      sharedWhy = 'sharedRefusedEnvKeys is not exported';
    }
  } catch (err) {
    sharedWhy = `${SETTINGS_STORE_SEAM} did not import: ${err instanceof Error ? err.message : String(err)}`;
  }

  // The overlay loader and the confirm hash, from the same seam section 4 uses.
  let overlay: Record<string, unknown> | null = null;
  let overlayWhy = '';
  try {
    overlay = {
      ...((await import(OVERLAY_SEAM)) as Record<string, unknown>),
      ...((await import(CONFIRM_SEAM)) as Record<string, unknown>)
    };
  } catch (err) {
    overlayWhy = `${OVERLAY_SEAM} + ${CONFIRM_SEAM} did not import: ${err instanceof Error ? err.message : String(err)}`;
  }
  const missing = ['parseAgentOverlay', 'mergeAgentOverlay', 'executionFieldsOf', 'executionHash'].filter(
    (name) => overlay === null || typeof overlay[name] !== 'function'
  );

  let hashes: Record<string, unknown> | null = null;
  let cases: unknown[] | null = null;
  let emptyExecutionHasScreen: boolean | null = null;
  if (overlay !== null && missing.length === 0) {
    const api = overlay as unknown as OverlayApi;
    try {
      // Merged with NO overlay, which is what every person without an
      // agents.json runs, and what a patch spreads its fields over.
      const merged = api.mergeAgentOverlay([]).agents;
      hashes = {};
      for (const id of ['codex', 'claude']) {
        const entry = merged.find((e) => e.id === id);
        if (entry === undefined) {
          hashes[id] = null;
          continue;
        }
        const { screen: _dropped, ...without } = entry as MergedEntry & { screen?: unknown };
        hashes[id] = {
          mergedCarriesScreen: (entry as { screen?: unknown }).screen !== undefined,
          withScreen: api.executionHash(id, api.executionFieldsOf(entry)),
          withoutScreen: api.executionHash(id, api.executionFieldsOf(without as MergedEntry))
        };
      }
      cases = P331_CASES.map((c) => {
        const parsed = api.parseAgentOverlay(JSON.stringify({ schema: 2, agents: [c.row] }));
        return {
          name: c.name,
          expect: c.expect,
          id: c.row.id,
          rows: parsed.rows.map((r) => String((r as { id: string }).id)),
          problems: parsed.problems.map((p) => ({ index: p.index, field: p.field, message: p.message }))
        };
      });
      const empty = overlay['EMPTY_EXECUTION_FIELDS'];
      emptyExecutionHasScreen =
        typeof empty === 'object' && empty !== null ? Object.prototype.hasOwnProperty.call(empty, 'screen') : null;
    } catch (err) {
      overlayWhy = `the loader threw: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`;
    }
  } else if (overlayWhy === '') {
    overlayWhy = `${missing.join(', ')} is not exported`;
  }

  return {
    own: P331_OWN,
    id: P331_ID,
    slot: SESSION_ID_SLOT,
    rows,
    composed,
    compiledEnvKeys,
    sharedRefused,
    sharedWhy,
    refusal: REFUSED_ROW_FIELDS['screen'] ?? null,
    hashes,
    cases,
    emptyExecutionHasScreen,
    overlayWhy
  };
}

// ---------------------------------------------------------------------------

const agents = LAUNCHABLE_AGENT_IDS.map(compiledReport);
const seam = await seamReport();
const p33 = await p33Section();
const p269 = p269Section();
const p269Catalog = await p269CatalogSection();
// PHASE 275. The pure half runs whatever the settings store does; the seal
// half reports `absent` out loud if the store has not landed, so the gate
// still reaches a verdict and never silently passes.
const p275Pure = p275PureSection();
const p275SealData = await p275SealSection();
// PHASE 331. The screen record and the two inline switches, read from the
// registry's own exports and driven through the shipping loader.
const p331 = await p331Section();

// ---------------------------------------------------------------------------
// Phase 49 — the version probe is unreachable from the create path
// ---------------------------------------------------------------------------
//
// Everything above composed the FULL create-path spec for every launchable
// agent, plus the renderer seed, the overlay merge and the passthrough row.
// If any of it could reach a version probe, the counter below would have
// moved and the peek would hold a resolved scan. Asserting both here makes
// the claim executable on every future commit that touches the agent table,
// not once.
const probeBudget = {
  versionProbeCount: versionProbeCount(),
  scanResolved: peekDetectedAgents() !== null
};

process.stdout.write(
  JSON.stringify({
    synthId: SYNTH_ID,
    absBin: ABS_BIN,
    extras: EXTRAS,
    capturedId: CAPTURED_ID,
    slot: SESSION_ID_SLOT,
    compiledRows: AGENT_REGISTRY.length,
    agents,
    renderer: rendererReport(),
    seam,
    p33,
    p269,
    p269Catalog,
    p275: { ...p275Pure, seal: p275SealData },
    p331,
    probeBudget
  })
);
