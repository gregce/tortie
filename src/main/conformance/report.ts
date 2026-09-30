/**
 * Resume-conformance results — the pure half: result shapes, the nonce
 * algebra, and the rendering of the per-agent table.
 *
 * Kept free of electron/tmux/fs so the parts that are easy to get subtly
 * wrong (token matching across a wrapped TUI line, verdict arithmetic, the
 * exit code) are unit-testable without launching anything
 * (src/main/conformance/__tests__/report.test.ts).
 *
 * Ownership: src/main/conformance/**.
 */

import { stripAnsi } from '../ansi';
import type { ScreenReading } from './screen-class';

// ---------------------------------------------------------------------------
// Result shapes
// ---------------------------------------------------------------------------

/**
 * Where a case stopped. The names are the harness's own vocabulary, not
 * tmux's, and they read in run order.
 */
export type ConformanceStage =
  | 'install'
  | 'create'
  | 'launch'
  | 'turn'
  | 'capture'
  | 'kill'
  | 'restore'
  | 'fire'
  | 'recall'
  /**
   * Phase 331. The pane's screen, read after create and after the restored
   * resume and judged against the row's compiled screen record
   * (./screen-class.ts). Only a `switch-to-inline` row can fail it.
   */
  | 'screen'
  | 'cleanup';

/**
 * PASS / FAIL / SKIP, plus the one distinction that keeps the harness
 * honest in both directions:
 *
 *  - SKIP     the CLI is not installed here. Nothing was proven, nothing is
 *             claimed, and it is not a failure.
 *  - BLOCKED  the CLI is installed but could not be driven non-interactively
 *             on this machine — a login wall, a trust prompt gmux's bypass
 *             flag did not answer, or a provider error. Requires POSITIVE
 *             evidence (a matched gate pattern); "the agent just never
 *             answered" is a FAIL, not a BLOCKED, or the harness would
 *             launder every real breakage into a shrug.
 */
export type ConformanceVerdict = 'PASS' | 'FAIL' | 'SKIP' | 'BLOCKED';

/** How strongly the restored pane proved it still holds the conversation. */
export type RecallStrength =
  /** The resumed agent emitted <verify nonce><plant nonce> — proof. */
  | 'proven'
  /**
   * The plant nonce is on screen but only where the REPLAYED SCROLLBACK
   * could have put it. Restore always cats the snapshot back into the pane,
   * so a bare "the nonce is visible" assertion passes even when resume did
   * nothing at all — this value exists to name that trap, never to pass.
   */
  | 'scrollback-only'
  | 'absent';

export interface ConformanceStageResult {
  stage: ConformanceStage;
  ok: boolean;
  ms: number;
  detail?: string;
}

export interface AgentConformanceResult {
  agent: string;
  verdict: ConformanceVerdict;
  /** One line saying why this is not a PASS. Absent on PASS. */
  reason?: string;
  /** Resolved absolute binary, when installed. */
  binary?: string;
  /**
   * The agent CLI version this case ran against (Phase 21, research 30 §2.4
   * D5).
   *
   * WHY A PATH WAS NOT ENOUGH. The report recorded `binary` and nothing else,
   * so a green run could not say which BUILD it was green against. Research 30
   * §2.1 re-probed the installed agents three days after the flag catalogue
   * was written and five of nine had moved, which makes "this passed last
   * week" a statement about a binary that may no longer exist at that path.
   *
   * Absent when the agent is not installed here, or when the detection scan
   * had no answer for it. Absent is not a failure and must not be rendered as
   * one.
   */
  agentVersion?: string;
  /** Registry capture route, rendered: 'pre-assign', 'harvest pid/exact', … */
  captureMode: string;
  /** The conversation id gmux actually recorded in the manifest. */
  capturedId?: string;
  /**
   * TRUE when `resume_argv` was armed before the process existed
   * (pre-assign). The registry claims this for claude/gemini/pi; the harness
   * is what makes the claim executable.
   */
  armedAtSpawn?: boolean;
  /**
   * TRUE when the id was in the manifest BEFORE the first turn — the
   * difference between 'session-open' and 'first-turn' harvests, measured
   * rather than quoted.
   */
  capturedBeforeTurn?: boolean;
  /** Exact argv gmux recorded and the harness fired. */
  resumeArgv?: string[];
  /** Exact argv gmux launched with (extras included). */
  launchArgv?: string[];
  recall?: RecallStrength;
  /**
   * Things that are true but do not change the verdict — chiefly registry
   * DATA that the run contradicts while the roundtrip still works (e.g. an
   * `availableAt: 'session-open'` claim for an id that only shows up after
   * the first turn). Kept out of the verdict on purpose: a stale field is a
   * documentation defect, not a dead pane. Kept in the report on purpose:
   * these are what the UI's "capturing…" state is derived from.
   */
  notes?: string[];
  /**
   * Phase 331 (build/p331/SPEC.md §2.8). The row's compiled screen class and
   * what tmux read after create, and after the restored resume in the full
   * run. `mismatch` holds the sentences a reading that disagrees with a class
   * other than `switch-to-inline` produced: recorded, never a failure, because
   * a person's own setting may choose otherwise. A switch that drew on the
   * alternate screen is not a mismatch; it is the case's FAIL reason.
   */
  screen?: {
    class: string;
    create?: ScreenReading;
    resume?: ScreenReading;
    mismatch?: string[];
  };
  /** Milliseconds the whole case took. */
  ms: number;
  stages: ConformanceStageResult[];
  /** Last few pane lines, captured only when something failed. */
  paneTail?: string;
}

export interface ConformanceRun {
  startedAt: number;
  finishedAt: number;
  /** 'full' drives real turns; 'capture' stops after the manifest assertion. */
  mode: 'full' | 'capture';
  /** Bypass flags were passed to keep first-run prompts out of the way. */
  bypassFlags: boolean;
  tmuxSocket: string;
  /**
   * The agent CLI version each agent in this run was on, keyed by agent id.
   * `null` means the version could not be read, which is the honest answer for
   * an agent that is not installed here.
   *
   * At the TOP of the report and not only per result, because the question it
   * answers is asked about the run as a whole. "Is this report still valid?"
   * is a comparison between these versions and the versions on the machine
   * now, and it must be answerable for an agent that SKIPped as well as one
   * that passed (research 30 §2.4 D5). Nothing in this build performs that
   * comparison yet; recording the numbers is the part that has to exist first.
   */
  versions: Record<string, string | null>;
  results: AgentConformanceResult[];
  /**
   * Every install the run may start, read before the first case and after the
   * last, and the agents whose install moved in between (Phase 331's fix round:
   * one full run's Codex updated itself mid-run and nothing said so).
   */
  installs?: {
    before: Record<string, InstallStamp | null>;
    after: Record<string, InstallStamp | null>;
    moved: string[];
  };
}

/** One agent's resolved install: the binary's realpath and that file's mtime and size. */
export interface InstallStamp {
  real: string;
  mtimeMs: number;
  size: number;
}

/**
 * The agents whose install moved between two stamps, each as one line naming
 * the agent and what moved. An install that resolved before and not after
 * counts; one that never resolved does not.
 */
export function movedInstalls(
  before: Readonly<Record<string, InstallStamp | null>>,
  after: Readonly<Record<string, InstallStamp | null>>
): string[] {
  const out: string[] = [];
  for (const [agent, was] of Object.entries(before)) {
    if (was === null) continue;
    const now = after[agent] ?? null;
    if (now === null) out.push(`${agent} (${was.real} no longer resolves)`);
    else if (now.real !== was.real) out.push(`${agent} (now ${now.real}, was ${was.real})`);
    else if (now.mtimeMs !== was.mtimeMs || now.size !== was.size) out.push(`${agent} (${was.real} was rewritten)`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Nonce algebra
// ---------------------------------------------------------------------------

/**
 * A nonce is a string a language model has to copy back EXACTLY, so its
 * alphabet is a design decision, not a detail. Two measurements shaped this
 * one, both on 2026-08-11:
 *
 *  - NO DIGITS. Several of these CLIs open on a numbered dialog ("1. Yes,
 *    continue / 2. No, quit"). A nonce containing a `2`, typed into codex's
 *    first-run trust dialog, picked "No, quit" and killed the pane — a
 *    harness bug that reads exactly like a launch regression.
 *  - ALTERNATING CONSONANT/VOWEL. The first fix used hex letters, and codex
 *    was asked to echo `aaeffbff` and produced `aaeeffbff` — one extra `e`.
 *    Runs of repeated letters are genuinely hard to copy, so the harness
 *    reported a working resume as a failure. Alternating C/V makes a
 *    pronounceable token ("kobitema") with no repeated-letter runs by
 *    construction, and models copy those reliably.
 *
 * 13 consonants x 5 vowels alternating is ~1.8e8 at length 8, and the
 * assertion that matters is two nonces ADJACENT, so the collision budget is
 * enormous either way.
 */
const NONCE_CONSONANTS = 'bdfgkmnprstvz';
const NONCE_VOWELS = 'aeiou';

/**
 * A short, pronounceable, digit-free token. Short on purpose: it has to
 * survive being re-emitted by a language model and rendered inside a TUI
 * that may wrap it, box it, or colour it.
 */
export function makeNonce(length = 8, rand: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    const set = i % 2 === 0 ? NONCE_CONSONANTS : NONCE_VOWELS;
    out += set[Math.floor(rand() * set.length)] ?? set[0];
  }
  return out;
}

/**
 * Reduce a pane capture to bare lowercase alphanumerics.
 *
 * This is the whole trick behind reading an answer out of a TUI. A reply can
 * arrive wrapped across two rows, gutter-prefixed with `│ `, colourised, or
 * spaced out by a model that likes tidy formatting — every one of which
 * breaks a naive `capture.includes(token)`. Dropping everything that is not
 * [0-9a-z] rejoins the token no matter which of those happened. Two 8-char
 * hex nonces make an accidental 16-char collision a non-event.
 */
export function normalizeForToken(text: string): string {
  return stripAnsi(text)
    .toLowerCase()
    .replace(/[^0-9a-z]/g, '');
}

/**
 * Did the pane produce `first` immediately followed by `second`?
 *
 * Adjacency is the entire assertion. Both nonces appear SEPARATELY all over
 * a conformance pane — in the prompt gmux typed, in the replayed scrollback,
 * in the agent's own echo of the user turn. Only an agent that has the
 * conversation and is answering right now can put them next to each other.
 */
export function containsJoined(
  capture: string,
  first: string,
  second: string
): boolean {
  return normalizeForToken(capture).includes(
    `${first.toLowerCase()}${second.toLowerCase()}`
  );
}

/** Is this token anywhere in the capture at all (the WEAK signal)? */
export function containsToken(capture: string, token: string): boolean {
  return normalizeForToken(capture).includes(token.toLowerCase());
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + ' '.repeat(width - value.length);
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

const TICK: Record<ConformanceVerdict, string> = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  SKIP: 'SKIP',
  BLOCKED: 'BLOCK'
};

const YESNO = (v: boolean | undefined): string =>
  v === undefined ? '—' : v ? 'yes' : 'NO';

const RECALL_LABEL: Record<RecallStrength, string> = {
  proven: 'proven',
  'scrollback-only': 'REPLAY-ONLY',
  absent: 'absent'
};

/** `alternate/mouse` as tmux reads them, e.g. `0/0`. */
const pair = (r: ScreenReading): string =>
  `${r.alternateOn ? '1' : '0'}/${r.mouseAny ? '1' : '0'}`;

/**
 * Phase 331's table cell: the class, then `create a/m`, then `resume a/m`,
 * and a `!` when any reading disagreed with the class.
 */
function screenCell(screen: AgentConformanceResult['screen']): string {
  if (screen === undefined) return '—';
  const parts = [screen.class];
  if (screen.create !== undefined) parts.push(`create ${pair(screen.create)}`);
  if (screen.resume !== undefined) parts.push(`resume ${pair(screen.resume)}`);
  return `${parts.join(' ')}${(screen.mismatch ?? []).length > 0 ? ' !' : ''}`;
}

/**
 * The headline table. One row per agent, widths derived from the data so it
 * stays readable when an agent id or an id format changes under us.
 */
export function renderTable(results: readonly AgentConformanceResult[]): string {
  const header = [
    'AGENT',
    'VERDICT',
    'CAPTURE',
    'ID CAPTURED',
    'ARMED@SPAWN',
    'PRE-TURN',
    'ROUNDTRIP',
    'SCREEN',
    'TIME'
  ];
  const rows = results.map((r) => [
    r.agent,
    TICK[r.verdict],
    r.captureMode,
    r.capturedId === undefined ? '—' : truncate(r.capturedId, 38),
    YESNO(r.armedAtSpawn),
    YESNO(r.capturedBeforeTurn),
    r.recall === undefined ? '—' : RECALL_LABEL[r.recall],
    screenCell(r.screen),
    `${(r.ms / 1000).toFixed(1)}s`
  ]);
  const widths = header.map((h, i) =>
    Math.max(h.length, ...rows.map((row) => (row[i] ?? '').length))
  );
  const line = (cells: string[]): string =>
    cells.map((c, i) => pad(c, widths[i] ?? 0)).join('  ').trimEnd();
  return [
    line(header),
    widths.map((w) => '-'.repeat(w)).join('  '),
    ...rows.map(line)
  ].join('\n');
}

/**
 * Per-agent detail: the exact argv gmux launched and the exact argv it
 * recorded to bring the conversation back. This is the part a human reads
 * when an agent CLI has drifted — a wrong verb (`--resume` vs `resume`) is
 * visible here at a glance.
 */
export function renderDetail(results: readonly AgentConformanceResult[]): string {
  const out: string[] = [];
  for (const r of results) {
    out.push(`${r.agent} — ${r.verdict}${r.reason === undefined ? '' : `: ${r.reason}`}`);
    if (r.binary !== undefined) out.push(`  binary       ${r.binary}`);
    // Directly under the binary, because the two are one fact: this file, at
    // this version. A human reading a stale report needs both to know whether
    // it still describes the machine in front of them.
    if (r.agentVersion !== undefined) {
      out.push(`  version      ${r.agentVersion}`);
    }
    if (r.launchArgv !== undefined) {
      out.push(`  launch argv  ${r.launchArgv.join(' ')}`);
    }
    if (r.capturedId !== undefined) out.push(`  captured id  ${r.capturedId}`);
    if (r.resumeArgv !== undefined) {
      out.push(`  resume argv  ${r.resumeArgv.join(' ')}`);
    }
    // Phase 331: one line per agent that was read, the reading beside its
    // class, and each disagreement on a line of its own.
    if (r.screen !== undefined) {
      const readings = [
        r.screen.create === undefined
          ? null
          : `create alternate ${r.screen.create.alternateOn ? '1' : '0'} mouse ${r.screen.create.mouseAny ? '1' : '0'} history ${String(r.screen.create.historySize)}`,
        r.screen.resume === undefined
          ? null
          : `resume alternate ${r.screen.resume.alternateOn ? '1' : '0'} mouse ${r.screen.resume.mouseAny ? '1' : '0'} history ${String(r.screen.resume.historySize)}`
      ].filter((x): x is string => x !== null);
      out.push(`  screen       ${[r.screen.class, ...readings].join(' · ')}`);
      for (const m of r.screen.mismatch ?? []) out.push(`  MISMATCH     ${m}`);
    }
    for (const note of r.notes ?? []) out.push(`  NOTE         ${note}`);
    const stages = r.stages
      .map((s) => `${s.stage}${s.ok ? '' : '!'}=${(s.ms / 1000).toFixed(1)}s`)
      .join(' ');
    if (stages.length > 0) out.push(`  stages       ${stages}`);
    for (const s of r.stages) {
      if (s.detail !== undefined) out.push(`  ${pad(s.stage, 12)} ${s.detail}`);
    }
    if (r.paneTail !== undefined && r.paneTail.length > 0) {
      out.push('  pane tail    |');
      for (const l of r.paneTail.split('\n')) out.push(`               | ${l}`);
    }
    out.push('');
  }
  return out.join('\n');
}

/** One-line summary, e.g. "6 PASS · 1 FAIL · 1 BLOCKED · 1 SKIP". */
export function renderSummary(results: readonly AgentConformanceResult[]): string {
  const count = (v: ConformanceVerdict): number =>
    results.filter((r) => r.verdict === v).length;
  return (
    `${count('PASS')} PASS · ${count('FAIL')} FAIL · ` +
    `${count('BLOCKED')} BLOCKED · ${count('SKIP')} SKIP`
  );
}

/**
 * The gate's answer. FAIL is the only red: it means gmux (or a registry row
 * gmux trusts) is wrong — no id captured, a resume argv the CLI rejects, a
 * conversation that did not come back. SKIP and BLOCKED are facts about this
 * machine, reported loudly and not fatal, because a harness that goes red
 * when the operator is logged out of one provider stops being run at all —
 * and one nobody runs catches no drift.
 *
 * `strict` (GMUX_CONF_STRICT=1) promotes BLOCKED to red for a CI box where
 * every agent is expected to be usable.
 */
export function exitCodeFor(
  results: readonly AgentConformanceResult[],
  strict = false
): number {
  const bad = results.some(
    (r) => r.verdict === 'FAIL' || (strict && r.verdict === 'BLOCKED')
  );
  return bad ? 1 : 0;
}
