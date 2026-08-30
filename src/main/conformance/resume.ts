/**
 * `npm run conformance:resume` — the resume-conformance harness (Phase 13.5
 * item 5, docs/research/22-resume-audit.md).
 *
 * WHAT IT IS FOR. gmux's promise is that a session comes back WITH ITS
 * CONVERSATION. Until Phase 13.5 that was true for claude alone, and nothing
 * in the repo could tell you so: the registry's resume column was prose, and
 * prose does not fail CI. This harness makes every resume claim EXECUTABLE.
 * For each installed agent it drives GMUX'S OWN create/capture/restore path —
 * never a hand-typed command, because the thing under test is our capture,
 * not the CLI's documentation — and answers one question per agent:
 *
 *   if the machine rebooted right now, would this session come back with its
 *   conversation, using the argv gmux actually recorded?
 *
 * THE RUN, per agent:
 *   1. resolve the binary            → SKIP when not installed
 *   2. create a session through GmuxCore.createSession in a fresh scratch cwd
 *   3. plant a nonce turn            → "remember <plant>", reply "ready-<plant>"
 *   4. ASSERT gmux captured an agent session id + a resume argv INTO THE
 *      MANIFEST — the step muse/qwen/pi silently failed before this phase
 *   5. snapshot, then kill the tmux session OUT OF BAND (the reboot)
 *   6. restore through GmuxCore.restoreSession — scrollback replayed, resume
 *      argv ARMED (typed, not fired), exactly as the user would see it
 *   7. press Enter (the user's one keypress) and ask for the token back,
 *      joined to a fresh verify nonce
 *   8. clean up everything it made
 *
 * WHY STEP 7 IS SHAPED LIKE THAT — the trap that makes a naive version of
 * this harness worthless. Restore REPLAYS the pre-kill scrollback into the
 * pane. So "assert the nonce is present in the restored transcript" passes
 * even when resume did nothing at all: the nonce is right there in the
 * replayed text. The harness therefore demands `<verify><plant>` adjacent,
 * where the verify nonce is generated after the kill and has never been on
 * that screen. Only a process holding the conversation can put them
 * together. (See ./report.ts containsJoined.)
 *
 * SAFETY. Private socket `-L gmux` only. Every session it creates is named
 * `zz-conf-…`, and it will not kill a tmux session whose name lacks that
 * prefix even if its own manifest points at one. It runs against its OWN
 * --user-data-dir (see the npm script), so the user's live gmux has no
 * manifest row for anything here and, per its reconcile, ignores it: rows are
 * claimed by @gmux-id, never by name. It never kills the tmux server.
 *
 * COST. Steps 3 and 7 are real model turns — two short ones per agent. The
 * prompts ask for a token to be echoed and forbid tool use, and the cwd is an
 * empty temp directory, so the run cannot do work anywhere. `GMUX_CONF_MODE=
 * capture` skips both turns (and the roundtrip) when you only need the
 * manifest assertion.
 *
 * Env knobs (all optional):
 *   GMUX_CONF_AGENTS=claude,pi   subset; default = every launchable agent
 *   GMUX_CONF_MODE=capture       stop after the manifest assertion (fast)
 *   GMUX_CONF_CAPTURE=1          launch every case under SpecStory capture
 *                                (`npm run conformance:resume:specstory`) —
 *                                the phrase "a restored session KEEPS
 *                                capturing" is only executable when the argv
 *                                under test is the wrapped one
 *   GMUX_CONF_CONCURRENCY=3      agents in flight at once
 *   GMUX_CONF_BYPASS=0           do not pass first-run bypass flags
 *   GMUX_CONF_STRICT=1           BLOCKED counts as red
 *   GMUX_CONF_KEEP=1             leave sessions + scratch dirs for inspection
 *   GMUX_CONF_JSON=<path>        machine-readable results
 *   GMUX_CONF_TURN_MS / _CAPTURE_MS / _AGENT_MS / _WATCHDOG_MS
 *
 * Ownership: src/main/conformance/**.
 */

import { app } from 'electron';
import { mkdtemp, mkdir, realpath, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { AgentKind, LaunchableAgentId, Session } from '@shared/types';
import { listDetectedAgents } from '../agents/detection';
import {
  LAUNCHABLE_AGENT_IDS,
  agentBinaryCandidates,
  getLaunchableEntry
} from '../agents/registry';
import { getGmuxCore, shutdownGmuxCore, type GmuxCore } from '../sessions';
import { drainWatcherCloses } from '../watcher/teardown';
import type { ManifestSessionRecord } from '../manifest';
import { buildArmedCommand } from '../restore/command';
import { captureSessionSnapshot } from '../restore/snapshots';
import { captureSupportFor } from '../specstory';
import * as tmux from '../tmux';
import {
  ARGV_REJECTED_PATTERNS,
  BYPASS_FLAGS,
  INTERACTIVE_GATE_PATTERNS,
  assertBypassFlagsAreCataloged,
  bypassEnvProblems,
  firstMatch,
  plantPrompt,
  recallPrompt
} from './cases';
import { publishBypassEnv } from './bypass-env';
import {
  clearTrustGate,
  currentScreen,
  driveTurn,
  pollPane,
  tail,
  waitForQuiet
} from './pane';
import {
  CONF_PREFIX,
  SCRATCH_ROOT,
  cleanupCase,
  killOwnSession,
  pollManifest,
  sweepLeftovers,
  tmuxIdFor,
  waitForStatus
} from './scratch';
import {
  containsJoined,
  containsToken,
  exitCodeFor,
  makeNonce,
  normalizeForToken,
  renderDetail,
  renderSummary,
  renderTable,
  type AgentConformanceResult,
  type ConformanceRun,
  type ConformanceStage,
  type ConformanceStageResult,
  type ConformanceVerdict,
  type RecallStrength
} from './report';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Quiet time between the planted turn and the out-of-band kill. Agents write
 * their transcripts asynchronously — pi's user message reaches disk about two
 * seconds after the keystroke, sometimes after its own reply is already on
 * screen — so killing the instant the answer appears is a race the harness
 * loses at random, and the case it fails is the agent's write latency rather
 * than gmux's resume.
 */
const PRE_KILL_FLUSH_MS = 2_500;

const envNum = (name: string, fallback: number): number => {
  const raw = process.env[name];
  const n = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const envFlag = (name: string, fallback: boolean): boolean => {
  const raw = process.env[name];
  if (raw === undefined || raw.length === 0) return fallback;
  return raw !== '0' && raw.toLowerCase() !== 'false';
};

interface Config {
  agents: LaunchableAgentId[];
  mode: 'full' | 'capture';
  /**
   * Create every case with SpecStory capture ON (`GMUX_CONF_CAPTURE=1`).
   *
   * Named for the FEATURE, not for `mode: 'capture'` above — that one is
   * about capturing the agent's session ID, this one is about SpecStory
   * capture, and the two words collide in this file only.
   *
   * It is what makes Phase 15's central claim executable: with capture on,
   * the argv this harness kills, restores, arms and fires is the WRAPPED one,
   * so "a restored session keeps capturing" is proven by the same steps that
   * already prove the conversation comes back — instead of by a verifier
   * doing it once by hand.
   */
  specstoryCapture: boolean;
  concurrency: number;
  bypass: boolean;
  strict: boolean;
  keep: boolean;
  jsonPath: string;
  /** Per model turn (plant / recall), including one retype. */
  turnMs: number;
  /** How long a harvest gets to put an id in the manifest after the turn. */
  captureMs: number;
  /** Ceiling for one agent's whole case. */
  agentMs: number;
  watchdogMs: number;
}

function readConfig(): Config {
  const requested = (process.env['GMUX_CONF_AGENTS'] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const all = LAUNCHABLE_AGENT_IDS;
  const agents =
    requested.length === 0
      ? [...all]
      : requested.filter((r): r is LaunchableAgentId =>
          (all as readonly string[]).includes(r)
        );
  return {
    agents,
    mode: process.env['GMUX_CONF_MODE'] === 'capture' ? 'capture' : 'full',
    specstoryCapture: envFlag('GMUX_CONF_CAPTURE', false),
    concurrency: Math.max(1, Math.floor(envNum('GMUX_CONF_CONCURRENCY', 3))),
    bypass: envFlag('GMUX_CONF_BYPASS', true),
    strict: envFlag('GMUX_CONF_STRICT', false),
    keep: envFlag('GMUX_CONF_KEEP', false),
    jsonPath:
      process.env['GMUX_CONF_JSON'] ??
      join(process.cwd(), 'out', 'conformance-resume.json'),
    turnMs: envNum('GMUX_CONF_TURN_MS', 150_000),
    captureMs: envNum('GMUX_CONF_CAPTURE_MS', 90_000),
    agentMs: envNum('GMUX_CONF_AGENT_MS', 8 * 60_000),
    watchdogMs: envNum('GMUX_CONF_WATCHDOG_MS', 40 * 60_000)
  };
}

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

const delay = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

function log(agent: string, line: string): void {
  // Stable prefix, parsed by CI the same way [gmux-smoke] is.
  console.log(`[gmux-conf] ${agent.padEnd(12)} ${line}`);
}

// ---------------------------------------------------------------------------
// One agent's case
// ---------------------------------------------------------------------------

interface CaseContext {
  core: GmuxCore;
  cfg: Config;
  /**
   * Agent id to the CLI version detected for this run (Phase 21).
   *
   * Read ONCE, before the pool starts, from the same cached detection scan the
   * create path records from. Doing it per case would run the same probes
   * three times over and, worse, would let two cases in one run disagree about
   * what version they proved against.
   */
  versions: Record<string, string | null>;
}

/** Accumulates stage timings so the report can show where the time went. */
class Stages {
  readonly list: ConformanceStageResult[] = [];
  private mark = Date.now();

  add(stage: ConformanceStage, ok: boolean, detail?: string): void {
    const now = Date.now();
    this.list.push({
      stage,
      ok,
      ms: now - this.mark,
      ...(detail !== undefined ? { detail } : {})
    });
    this.mark = now;
  }
}

/** Rendered capture route, e.g. "harvest pid/exact" — straight from data. */
function captureModeLabel(agent: LaunchableAgentId): string {
  const capture = getLaunchableEntry(agent).resume.idCapture;
  switch (capture.mode) {
    case 'pre-assign':
      return `pre-assign ${capture.launchFlag.join(' ')}`;
    case 'pre-assign-cmd':
      return `pre-assign-cmd ${capture.argv.join(' ')}`;
    case 'harvest':
      return `harvest ${capture.key}/${capture.confidence}`;
    case 'unverified':
      return 'unverified';
    case 'none':
      return 'none';
  }
}

async function runCase(
  agent: LaunchableAgentId,
  ctx: CaseContext
): Promise<AgentConformanceResult> {
  const { core, cfg } = ctx;
  const started = Date.now();
  const stages = new Stages();
  const result: AgentConformanceResult = {
    agent,
    verdict: 'FAIL',
    captureMode: captureModeLabel(agent),
    ms: 0,
    stages: stages.list
  };
  const finish = (
    verdict: ConformanceVerdict,
    reason?: string
  ): AgentConformanceResult => {
    result.verdict = verdict;
    if (reason !== undefined) result.reason = reason;
    result.ms = Date.now() - started;
    return result;
  };

  // --- 1. installed? -------------------------------------------------------
  // Phase 25.5: walk the WHOLE candidate list, first hit wins — the same
  // order detection and session create use. On this machine deepseek's row
  // resolves its legacy third name; on a fresh machine it resolves codewhale.
  const candidates = agentBinaryCandidates(agent);
  let resolvedName: string | null = null;
  let binPath: string | null = null;
  for (const candidate of candidates) {
    binPath = await tmux.resolveBinary(candidate);
    if (binPath !== null) {
      resolvedName = candidate;
      break;
    }
  }
  if (binPath === null) {
    const names = candidates.join(', ');
    stages.add('install', true, `${names} not on PATH`);
    log(agent, `SKIP — ${names} is not installed`);
    return finish('SKIP', `${names} not installed on this machine`);
  }
  result.binary = binPath;
  const detectedVersion = ctx.versions[agent];
  if (detectedVersion !== undefined && detectedVersion !== null) {
    result.agentVersion = detectedVersion;
  }
  stages.add(
    'install',
    true,
    resolvedName === candidates[0] ? undefined : `resolved fallback name ${resolvedName}`
  );

  await mkdir(SCRATCH_ROOT, { recursive: true });
  // realpath: qwen and pi key their store on the RESOLVED cwd (research 22
  // §1.3), and on macOS /var → /private/var, so a literal tmpdir() path would
  // make the harness disagree with the harvester about which directory this
  // session is in.
  const cwd = await realpath(await mkdtemp(join(SCRATCH_ROOT, `${agent}-`)));

  let session: Session | null = null;

  try {
    // --- 2. create through the REAL path ---------------------------------
    const extraArgs = cfg.bypass ? [...(BYPASS_FLAGS[agent] ?? [])] : [];
    log(agent, `creating in ${cwd}${extraArgs.length > 0 ? ` (${extraArgs.join(' ')})` : ''}`);
    session = await core.createSession({
      name: `${CONF_PREFIX}${agent}-${process.pid}`,
      projectPath: cwd,
      cwd,
      // The wire type is still the frozen AgentKind trio; the renderer store
      // carries the same cast for exactly the same reason (see the INTEGRATOR
      // note in src/shared/types.ts). buildLaunchSpec already accepts every
      // launchable id.
      agent: agent as AgentKind,
      ...(extraArgs.length > 0 ? { extraArgs } : {}),
      ...(cfg.specstoryCapture ? { capture: true } : {})
    });
    const created = core
      .listSessionRecords()
      .find((r) => r.id === session?.id) as ManifestSessionRecord | undefined;
    result.launchArgv = created?.argv ?? [];
    const tmuxId = await tmuxIdFor(session.tmuxName);
    // With capture requested, whether it was actually APPLIED is part of the
    // case: a session that quietly launched bare would sail through every
    // later stage and prove nothing about capture surviving a restore. An
    // agent SpecStory cannot capture here is not a failure — it is said out
    // loud in the stage detail and the case continues uncaptured.
    const wrapped = created?.specstory?.enabled === true;
    const captureNote = !cfg.specstoryCapture
      ? ''
      : wrapped
        ? ` specstory=${created?.specstory?.provider ?? '?'}`
        : ' specstory=DECLINED';
    stages.add(
      'create',
      true,
      `tmux "${session.tmuxName}" ${tmuxId ?? '(gone)'}${captureNote}`
    );
    if (cfg.specstoryCapture && !wrapped) {
      const support = await captureSupportFor(agent);
      if (support.supported) {
        stages.add('launch', false, 'capture requested but not applied');
        return finish(
          'FAIL',
          'SpecStory capture is available for this agent here, but the ' +
            'session launched unwrapped — the manifest row has no capture record'
        );
      }
      (result.notes ??= []).push(
        `SpecStory capture is not available for ${agent} on this machine ` +
          `(${support.reason}); this case ran uncaptured`
      );
    }
    if (tmuxId === null) {
      stages.add('launch', false, 'session vanished immediately after create');
      return finish('FAIL', 'the pane was gone before the harness could read it');
    }

    // --- 3. did it even start? -------------------------------------------
    // Capped low on purpose: several of these TUIs animate a spinner from
    // the first frame and would never go quiet, and driveTurn already
    // retypes a prompt that a still-painting TUI swallowed.
    const booted = await waitForQuiet(tmuxId, 2_500, 20_000);
    const bootError = firstMatch(booted, ARGV_REJECTED_PATTERNS);
    if (bootError !== null) {
      result.paneTail = tail(booted);
      stages.add('launch', false, bootError);
      return finish('FAIL', `launch argv rejected: ${bootError}`);
    }
    stages.add('launch', true);

    // Pre-assign agents must be armed BEFORE the process exists. Asserting
    // it here — not after the turn — is what makes "no watcher, no race" a
    // measurement instead of a claim.
    const preTurn = core.listSessionRecords().find((r) => r.id === session?.id);
    const preTurnArmed =
      preTurn?.agentSessionId !== undefined &&
      (preTurn.resumeArgv?.length ?? 0) > 0;
    const idCapture = getLaunchableEntry(agent).resume.idCapture;
    if (idCapture.mode === 'pre-assign' || idCapture.mode === 'pre-assign-cmd') {
      result.armedAtSpawn = preTurnArmed;
      if (!preTurnArmed) {
        stages.add('capture', false, 'nothing armed at spawn');
        return finish(
          'FAIL',
          `registry says ${idCapture.mode}, but the manifest row has no ` +
            `resume argv at spawn`
        );
      }
    } else {
      result.armedAtSpawn = false;
    }
    result.capturedBeforeTurn = preTurnArmed;
    // Record what is already known, so a case that later goes BLOCKED still
    // reports the id and argv gmux captured — those were proven before the
    // provider refused, and hiding them would understate the coverage.
    if (preTurn?.agentSessionId !== undefined) {
      result.capturedId = preTurn.agentSessionId;
      result.resumeArgv = [...(preTurn.resumeArgv ?? [])];
    }

    const plant = makeNonce();

    // --- 4. plant the nonce turn -----------------------------------------
    if (cfg.mode === 'full') {
      if (await clearTrustGate(tmuxId)) {
        log(agent, 'answered the workspace-trust dialog');
      }
      log(agent, `planting nonce ${plant}`);
      const turn = await driveTurn(
        tmuxId,
        plantPrompt(plant),
        (capture) => containsJoined(capture, 'ready', plant),
        cfg.turnMs
      );
      if (!turn.ok) {
        result.paneTail = tail(turn.capture);
        const screen = currentScreen(turn.capture);
        const gate = firstMatch(screen, INTERACTIVE_GATE_PATTERNS);
        const rejected = firstMatch(screen, ARGV_REJECTED_PATTERNS);
        stages.add('turn', false, gate ?? rejected ?? 'no reply');
        if (gate !== null) {
          return finish('BLOCKED', `waiting on a human: ${gate}`);
        }
        return finish(
          'FAIL',
          rejected !== null
            ? `agent errored: ${rejected}`
            : `no reply to the nonce turn within ${Math.round(cfg.turnMs / 1000)}s ` +
              `(no login/trust prompt on screen)`
        );
      }
      stages.add('turn', true, `ready-${plant}`);
    } else {
      stages.add('turn', true, 'skipped (capture mode)');
    }

    // --- 5. THE assertion: is the id in the manifest? --------------------
    // capture mode plants no turn, so an agent that only writes its record at
    // the first turn (codex, deepseek — availableAt, straight from the
    // registry) genuinely cannot have an id yet. Reporting that as FAIL would
    // be the harness lying about its own coverage.
    if (
      cfg.mode === 'capture' &&
      idCapture.mode === 'harvest' &&
      idCapture.availableAt === 'first-turn'
    ) {
      stages.add('capture', true, 'not assertable without a turn');
      log(agent, 'SKIP — capture mode plants no turn; this id arrives at the first turn');
      return finish(
        'SKIP',
        `capture mode plants no turn and ${agent} writes its id at the first ` +
          `turn — run the full mode to cover it`
      );
    }
    const captured = await pollManifest(
      core,
      session.id,
      cfg.mode === 'full' ? cfg.captureMs : Math.min(cfg.captureMs, 45_000)
    );
    if (captured === null) {
      const rec = core.listSessionRecords().find((r) => r.id === session?.id);
      stages.add('capture', false, `resumeCapture=${rec?.resumeCapture ?? '?'}`);
      // Name the two very different causes rather than one generic sentence:
      // in capture mode there was no turn, so a 'session-open' claim that
      // produced nothing is a claim about REGISTRY DATA, and saying "gmux
      // captured no id" would send the reader hunting in the harvester.
      if (
        cfg.mode === 'capture' &&
        idCapture.mode === 'harvest' &&
        idCapture.availableAt === 'session-open'
      ) {
        return finish(
          'FAIL',
          `the registry claims availableAt 'session-open', but no id appeared ` +
            `in ${Math.round(Math.min(cfg.captureMs, 45_000) / 1000)}s without a ` +
            `turn — either the harvester is missing it or that field is wrong`
        );
      }
      return finish(
        'FAIL',
        'gmux captured NO session id — this session would come back as a ' +
          'bare directory after a reboot'
      );
    }
    result.capturedId = captured.agentSessionId;
    result.resumeArgv = [...(captured.resumeArgv ?? [])];
    if (
      idCapture.mode === 'harvest' &&
      idCapture.availableAt === 'session-open' &&
      !preTurnArmed
    ) {
      // MEASURED 2026-08-11 on antigravity: the roundtrip works, so this is
      // not a FAIL — but the registry's availableAt drives how long the UI
      // is allowed to say "capturing…", so a wrong value there is how a
      // session sits hopeful forever.
      (result.notes ??= []).push(
        `registry says the id is readable at session-open, but it only ` +
          `appeared AFTER the first turn — availableAt should be 'first-turn'`
      );
    }
    stages.add('capture', true, `id=${captured.agentSessionId}`);
    log(agent, `captured id ${captured.agentSessionId}`);
    log(agent, `resume argv: ${result.resumeArgv.join(' ')}`);

    if (cfg.mode === 'capture') {
      return finish('PASS');
    }

    // --- 6. the reboot ----------------------------------------------------
    // Let the agent finish writing the turn before pulling the power.
    // MEASURED 2026-08-11: pi's user message reaches its JSONL about two
    // seconds AFTER the keystroke, and the reply can land on screen first —
    // so a kill fired the instant the answer appeared made this case a coin
    // flip (pi PASS then FAIL on identical stage timings, with NO session
    // file anywhere on disk for the failing run, only the one the resumed
    // process created). That flake is the AGENT's write latency, not gmux's
    // capture, and a gate that fails at random teaches nobody anything.
    // It is a real property worth knowing — an agent killed a heartbeat
    // after a turn can lose it — but the thing to measure there is the
    // agent's durability, not gmux's resume.
    await waitForQuiet(tmuxId, 1_500, 15_000);
    await delay(PRE_KILL_FLUSH_MS);
    await captureSessionSnapshot(tmuxId, session.id, {
      reason: 'conformance'
    }).catch(() => false);
    await killOwnSession(session.tmuxName);
    const restorable = await waitForStatus(core, session.id, 'restorable', 30_000);
    if (!restorable) {
      const rec = core.listSessionRecords().find((r) => r.id === session?.id);
      stages.add('kill', false, `status stuck at ${rec?.status ?? '?'}`);
      return finish(
        'FAIL',
        `after an out-of-band kill the row is "${rec?.status ?? '?'}", not ` +
          `"restorable" — the sidebar would not offer Restore`
      );
    }
    stages.add('kill', true, 'row flipped to restorable');

    // --- 7. restore through the real path ---------------------------------
    const restored = await core.restoreSession(session.id);
    session = restored;
    const restoredTmuxId = await tmuxIdFor(restored.tmuxName);
    if (restoredTmuxId === null) {
      stages.add('restore', false, 'restored session not in tmux');
      return finish('FAIL', 'restore did not produce a live tmux session');
    }
    const armedText = buildArmedCommand(result.resumeArgv);
    const armedSeen = await pollPane(
      restoredTmuxId,
      (capture) =>
        normalizeForToken(capture).includes(normalizeForToken(armedText)),
      20_000
    );
    if (!armedSeen.ok) {
      result.paneTail = tail(armedSeen.capture);
      stages.add('restore', false, 'armed command never appeared in the pane');
      return finish(
        'FAIL',
        'restore recorded a resume argv but never typed it into the pane'
      );
    }
    stages.add('restore', true, 'resume argv typed, not fired');

    // --- 8. the user's one keypress ---------------------------------------
    await tmux.execTmux(['send-keys', '-t', restoredTmuxId, 'Enter']);
    const afterFire = await waitForQuiet(restoredTmuxId, 3_000, 60_000);
    const rejected = firstMatch(
      currentScreen(afterFire, captured.agentSessionId ?? ''),
      ARGV_REJECTED_PATTERNS
    );
    if (rejected !== null) {
      result.paneTail = tail(afterFire);
      result.recall = 'absent';
      stages.add('fire', false, rejected);
      return finish(
        'FAIL',
        `the recorded resume argv was REJECTED — dead pane: ${rejected}`
      );
    }
    stages.add('fire', true);

    // --- 9. does it still hold the conversation? --------------------------
    // A resumed agent can re-ask for workspace trust; same dialog, same
    // answer, same reason it is safe. Scanned from the resume command line
    // onwards — the replayed scrollback still holds the PRE-KILL session's
    // trust dialog, and answering that ghost would inject a stray keystroke
    // into a perfectly healthy conversation.
    const sinceResume = captured.agentSessionId ?? '';
    await clearTrustGate(restoredTmuxId, sinceResume);
    const verify = makeNonce();
    log(agent, `verifying recall with ${verify}`);
    const recall = await driveTurn(
      restoredTmuxId,
      recallPrompt(verify),
      (capture) => containsJoined(capture, verify, plant),
      cfg.turnMs
    );
    if (!recall.ok) {
      result.paneTail = tail(recall.capture);
      const weak = containsToken(recall.capture, plant);
      const strength: RecallStrength = weak ? 'scrollback-only' : 'absent';
      result.recall = strength;
      // Classify only what the RESUMED process has on screen NOW — see
      // currentScreen(). Reading the whole capture here mistook a replayed
      // scrollback (cursor) and an already-answered trust dialog (codex) for
      // live human gates on 2026-08-11, which is the harness lying in the
      // direction that hurts most.
      const gate = firstMatch(
        currentScreen(recall.capture, sinceResume),
        INTERACTIVE_GATE_PATTERNS
      );
      stages.add('recall', false, gate ?? strength);
      if (gate !== null) {
        return finish('BLOCKED', `resumed pane is waiting on a human: ${gate}`);
      }
      return finish(
        'FAIL',
        weak
          ? 'the token is on screen only where the REPLAYED SCROLLBACK put it — ' +
            'the resumed agent could not repeat it, so the conversation did not come back'
          : 'the resumed agent never answered — the conversation did not come back'
      );
    }
    result.recall = 'proven';
    stages.add('recall', true, `${verify}${plant}`);
    log(agent, 'PASS — conversation came back');
    return finish('PASS');
  } catch (err) {
    stages.add('cleanup', false, (err as Error).message);
    return finish('FAIL', (err as Error).message);
  } finally {
    if (!cfg.keep) {
      await cleanupCase(core, session, cwd).catch((err: unknown) => {
        log(agent, `cleanup warning: ${(err as Error).message}`);
      });
    } else if (session !== null) {
      log(agent, `KEPT: tmux "${session.tmuxName}", cwd ${cwd}`);
    }
    result.ms = Date.now() - started;
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/** Run `cases` with at most `limit` in flight, preserving input order. */
async function runPool<T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await run(items[i] as T);
    }
  });
  await Promise.all(workers);
  return out;
}

/**
 * GMUX_SMOKE=conformance-resume — the whole run. Prints the table, writes the
 * JSON, and exits 1 when any agent FAILs (see exitCodeFor for why BLOCKED and
 * SKIP are not red by default).
 */
export async function runResumeConformance(): Promise<void> {
  const cfg = readConfig();
  const startedAt = Date.now();
  const watchdog = setTimeout(() => {
    console.error(
      `[gmux-conf] FAIL: watchdog expired after ${Math.round(cfg.watchdogMs / 1000)}s`
    );
    app.exit(1);
  }, cfg.watchdogMs);
  watchdog.unref?.();
  let undoBypassEnv: () => Promise<void> = async () => undefined;

  try {
    const flagProblems = assertBypassFlagsAreCataloged(cfg.agents);
    if (cfg.bypass && flagProblems.length > 0) {
      throw new Error(
        `bypass flags have drifted from AGENT_FLAG_PRESETS:\n  ${flagProblems.join('\n  ')}`
      );
    }
    const envProblems = bypassEnvProblems();
    if (cfg.bypass && envProblems.length > 0) {
      throw new Error(`bypass env is not writable:\n  ${envProblems.join('\n  ')}`);
    }

    console.log(
      `[gmux-conf] resume conformance — mode=${cfg.mode} ` +
        `concurrency=${cfg.concurrency} bypass=${cfg.bypass ? 'on' : 'off'} ` +
        `specstory=${cfg.specstoryCapture ? 'capture' : 'off'} ` +
        `socket=-L ${tmux.activeTmuxSocket()}`
    );
    console.log(
      `[gmux-conf] userData=${app.getPath('userData')} ` +
        `(private manifest — the user's gmux has no row for anything here)`
    );

    const core = await getGmuxCore();
    const swept = await sweepLeftovers(core);
    if (swept > 0) console.log(`[gmux-conf] swept ${swept} leftover(s)`);
    undoBypassEnv = await publishBypassEnv(cfg.agents, cfg.bypass);

    // Phase 21. The report has to be able to say WHICH BUILD it passed
    // against, so the versions are read before any case runs and the same
    // answer is used by every case. The scan is the cached one the create path
    // already uses, so this costs one parallel sweep of `--version` probes,
    // measured at about 0.7 s for the whole fleet (research 30 §2.3).
    const versions: Record<string, string | null> = {};
    for (const agent of cfg.agents) versions[agent] = null;
    try {
      const scan = await listDetectedAgents();
      const wanted = new Set<string>(cfg.agents);
      for (const detected of scan.agents) {
        if (wanted.has(detected.id)) versions[detected.id] = detected.version;
      }
    } catch (err) {
      console.warn(
        `[gmux-conf] could not read agent versions: ${(err as Error).message}`
      );
    }
    console.log(
      `[gmux-conf] versions ${cfg.agents
        .map((a) => `${a}=${versions[a] ?? '?'}`)
        .join(' ')}`
    );

    const results = await runPool(cfg.agents, cfg.concurrency, (agent) =>
      withTimeout(runCase(agent, { core, cfg, versions }), cfg.agentMs, agent)
    );

    const run: ConformanceRun = {
      startedAt,
      finishedAt: Date.now(),
      mode: cfg.mode,
      bypassFlags: cfg.bypass,
      tmuxSocket: tmux.activeTmuxSocket(),
      versions,
      results
    };

    console.log('');
    console.log(renderTable(results));
    console.log('');
    console.log(renderDetail(results));
    console.log(
      `[gmux-conf] ${renderSummary(results)} in ` +
        `${((run.finishedAt - startedAt) / 1000).toFixed(1)}s`
    );
    if (cfg.mode === 'capture') {
      console.log(
        '[gmux-conf] NOTE: capture mode asserted the manifest only — no turn ' +
          'was planted, no reboot simulated, no conversation proven. ' +
          'Run `npm run conformance:resume` for the roundtrip.'
      );
    }

    await mkdir(dirname(cfg.jsonPath), { recursive: true }).catch(() => undefined);
    await writeFile(cfg.jsonPath, `${JSON.stringify(run, null, 2)}\n`, 'utf8').catch(
      (err: unknown) => {
        console.warn(`[gmux-conf] could not write JSON: ${(err as Error).message}`);
      }
    );
    console.log(`[gmux-conf] results: ${cfg.jsonPath}`);

    await sweepLeftovers(core).catch(() => 0);
    await undoBypassEnv();
    await shutdownGmuxCore();
    // Phase 36: GmuxCore.dispose() cancels the harvest watches, and every
    // one of those unsubscribes is now TRACKED (src/main/watcher/teardown).
    // app.exit() below skips before-quit, so this harness drains the closes
    // itself; otherwise an FSEvents completion can land during RunCleanup —
    // napi_throw, SIGABRT, and an exit code that says nothing about the run.
    // This used to be a blind 1.5 s delay (the old BUILD-STATUS.md #1);
    // it is now an awaited drain under the same bound.
    await drainWatcherCloses(1_500);
    const code = exitCodeFor(results, cfg.strict);
    console.log(code === 0 ? '[gmux-conf] PASS' : '[gmux-conf] FAIL');
    app.exit(code);
  } catch (err) {
    console.error(`[gmux-conf] FAIL: ${(err as Error).message}`);
    await undoBypassEnv().catch(() => undefined);
    app.exit(1);
  }
}

/** One agent must never eat the whole run's budget. */
async function withTimeout(
  promise: Promise<AgentConformanceResult>,
  ms: number,
  agent: string
): Promise<AgentConformanceResult> {
  let timer: NodeJS.Timeout | undefined;
  const bail = new Promise<AgentConformanceResult>((resolve) => {
    timer = setTimeout(() => {
      resolve({
        agent,
        verdict: 'FAIL',
        reason: `case exceeded its ${Math.round(ms / 1000)}s budget`,
        captureMode: '—',
        ms,
        stages: []
      });
    }, ms);
    timer.unref?.();
  });
  try {
    return await Promise.race([promise, bail]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
