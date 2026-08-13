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
  AGENT_REGISTRY,
  LAUNCHABLE_AGENT_IDS,
  SESSION_ID_SLOT,
  registryResumeArgv,
  type AgentRegistryEntry
} from '../src/main/agents/registry';
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

interface MergedEntry extends Omit<AgentRegistryEntry, 'id'> {
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

const agents = LAUNCHABLE_AGENT_IDS.map(compiledReport);
const seam = await seamReport();

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
    seam
  })
);
