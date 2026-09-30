/**
 * THE ROWS ALREADY WRITTEN: bringing recorded sessions across to the inline
 * switches.
 *
 * Phase 331 (research 133 and 134, and his ruling of 2026-09-29, "i like the
 * inline mode lets do that"). Tortie now launches and resumes every Codex with
 * `-c tui.fullscreen_transcript=false` and every Claude Code on this Mac with
 * `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1`, both compiled registry data spelled
 * once in `../agents/registry.ts` (`CODEX_SCROLLBACK_ARGS`, `CLAUDE_INLINE_ENV`).
 * That reaches no row already on disk. Restore arms the RECORDED resume argv word
 * for word (`../restore/restore.ts`, `armableResume`) and replays the RECORDED
 * env, so without this pass every session made before the upgrade would restore
 * full screen for good, and the wheel over a restored Codex would go on walking
 * its prompt history.
 *
 * WHAT IT DOES, once per process, over two kinds of row and no other:
 *
 *  - THE ARGV ARM, every Codex row here and on another machine, every status,
 *    `discarded` included because restoring a discarded row is the undo of a
 *    Remove. A row holding a conversation id and a resume argv that lacks the
 *    pair is recomposed through the one composer: `composeResumeArgv` with
 *    `agentExtrasOf` here, the same call the harvest's rescues and Phase 215's
 *    repair make; `registryResumeArgv` with the row's own recorded far
 *    `argv[0]` elsewhere, the same call the remote harvest makes. The result is
 *    written only when it is the recorded argv with the two tokens inserted and
 *    nothing else moved.
 *  - THE ENV ARM, every Claude Code row on this Mac, every status, whatever its
 *    argv. A SpecStory-wrapped row gets the variable too and keeps its argv,
 *    because restore puts `rec.env` on the pane and the wrapper's child
 *    inherits it (measured by research 134). The compiled pair is appended to
 *    the row's `env` unless that `env` already names the variable.
 *
 * WHAT IT NEVER DOES, and these are the rules the phase is judged on (Phase
 * 215's, from ./codex-repair.ts, plus two):
 *
 *  - NO ROW IS EVER EMPTIED. Every verdict but `rewritten` leaves the row
 *    exactly as it was. The argv arm writes only a non-empty composition, and
 *    the env arm only adds a key.
 *  - A CAPTURED ROW IS RE-WRAPPED OR LEFT ALONE, NEVER ARMED BARE. This is where
 *    the pass differs from ./codex-repair.ts, which arms a bare resume when the
 *    wrap cannot be rebuilt: moving a conversation id is worth losing a capture
 *    for, and a scroll fix is not.
 *  - A ROW ALREADY RIGHT IS BYTE IDENTICAL. A Codex row whose inner resume argv
 *    carries the pair ANYWHERE after its binary (a person's own pair, a HEAD
 *    create's harvest, a row this pass wrote) and a Claude row whose env names
 *    the variable WITH ANY VALUE, `"0"` included, which is the person's own
 *    opt-out.
 *  - A ROW WITH NO CONVERSATION ID IS LEFT ALONE. Its harvest or rescue composes
 *    with the new template when it lands.
 *  - EVERY CLAUDE ROW ON ANOTHER MACHINE, AND EVERY ROW OF ANY OTHER AGENT, IS
 *    BYTE IDENTICAL. Neither is read past its `agent` and `machineId`.
 *    `REMOTE_ENV_ALLOWED` sends a far machine no env but Tortie's own two
 *    stamps, so a remote Claude stays as it is today.
 *  - ONE WRITE PER ROW, of `resumeArgv` or `env` alone, through a statement
 *    that names that ONE column (`setResumeArgvColumn`, `setEnvColumn`). Not
 *    `updateSession`, since Phase 331's fix round: that reads the row, decodes
 *    it and writes every column back, so a column this build's decoder refuses
 *    was written NULL (measured by the verifier on planted rows). The id, the
 *    argv, `agentContract` (write once, and it records the template in force
 *    at the launch, which stays true), `resumeCapture`, `resumeProvenance` and
 *    every other byte of the row never move. NO PROVENANCE NOTE is
 *    added: the provenance says where the conversation id came from and how
 *    strongly it is tied to the pane, and this pass touches neither.
 *  - IT WRITES THE MANIFEST AND NOTHING ELSE. It opens no file, reads no
 *    agent's store, spawns nothing and signals no process. A plain write rather
 *    than `updateSessionDurably`: a write lost to a power cut is simply made
 *    again at the next launch.
 *  - A ROW WHOSE RESUME ARGV AN OLDER BUILD OR A PERSON SHAPED DIFFERENTLY is
 *    reported (`recorded-differs`, `binary-differs`) and never rewritten, so the
 *    pass can only ever insert the two tokens.
 *
 * IT IS IDEMPOTENT BY CONSTRUCTION rather than by a flag: after a write the
 * Codex row carries the pair and the Claude row names the variable, so the same
 * two tests answer `already-right` on the next pass, which writes nothing.
 *
 * ONCE PER PROCESS, AND WHY THE LATCH. `resumeIdHarvests` runs at the end of
 * every `GmuxCore.refresh()`, which follows every `sessions-changed` and
 * `connected` event, not once per boot as ./codex-repair.ts's header says.
 * {@link repairInlineSwitchesOnce} runs the pass at the first refresh and sets
 * its latch only after a pass that returned, so "at the next Tortie launch" is
 * literally true, a throw from the store is tried again at the next refresh, and
 * the cost is paid once. It runs AFTER Phase 215's repair, whose recomposition
 * already carries the pair, so a row that repair moves is written once across
 * both passes, and BEFORE the claim seeding and the rescue, so nothing below it
 * reads a row mid-change.
 *
 * ONE ROW'S FAILURE IS THAT ROW'S. Each row's work is inside its own `try`; a
 * throw is `threw`, the row keeps what it had, and the loop goes on. A throw from
 * `listSessions` itself escapes to the caller, whose `catch` keeps the rescue
 * running.
 *
 * STATED LIMITS. A pane whose holder shell started before the pass keeps the
 * view it started with until its next restore; Tortie never ends or restarts a
 * session. A `--config` spelling of the same value is not read as the pair and
 * is recomposed, which is harmless because the value is the same. A Codex or
 * Claude patched by the person's `agents.json` with its own `launch` is not read
 * here at all, because the pass reads the compiled constants only.
 */

import { LOCAL_MACHINE_ID } from '@shared/workspace-target';
import {
  CLAUDE_INLINE_ENV,
  CODEX_SCROLLBACK_ARGS,
  ownLaunchFlags,
  registryResumeArgv
} from '../agents/registry';
import { getLog } from '../log';
import type { ManifestSessionRecord, ManifestStore } from '../manifest';
import { isWrappedArgv, unwrapArgv } from '../specstory';
import { agentExtrasOf } from './launch-plan';
import { composeResumeArgv } from './resume-argv';

const sessionsLog = getLog('sessions');

/** Which carriage a row was judged under. */
export type InlineRepairArm = 'argv-here' | 'argv-elsewhere' | 'env';

/** What the pass did to a row, or why it left it alone. */
export type InlineRepairVerdict =
  /** One write of `resumeArgv` or `env`. */
  | 'rewritten'
  /** Byte identical: the pair or the variable is already there. */
  | 'already-right'
  /** A Codex row with no conversation id. Untouched. */
  | 'no-id'
  /** A Codex row with no recorded resume argv, or the composer declined. */
  | 'no-resume-argv'
  /** The wrap could not be rebuilt. Left exactly as it is, never armed bare. */
  | 'capture-lost'
  /** A wrapped argv whose inner command cannot be read back. Untouched. */
  | 'unreadable'
  /** The recorded resume argv names another program than the composer would. */
  | 'binary-differs'
  /** The composition is not the recorded argv plus the pair. Untouched. */
  | 'recorded-differs'
  /** This row's own read or write threw. The row keeps what it had. */
  | 'threw';

export interface InlineRepairOutcome {
  /** The manifest row. */
  sessionId: string;
  name: string;
  agent: string;
  arm: InlineRepairArm;
  verdict: InlineRepairVerdict;
}

/** The narrow store the pass needs, so a test can wrap it: one read and two one-column writes. */
export type InlineRepairStore = Pick<
  ManifestStore,
  'listSessions' | 'setResumeArgvColumn' | 'setEnvColumn'
>;

/** The verdicts a person is told about, one warning per row. */
const WARNED: ReadonlySet<InlineRepairVerdict> = new Set<InlineRepairVerdict>([
  'capture-lost',
  'unreadable',
  'binary-differs',
  'recorded-differs'
]);

/**
 * Bring every recorded Codex resume argv and every local Claude row's env to
 * what a create at this build records. The pure pass: no latch.
 *
 * Returns one outcome per Codex row and per local Claude row, whether it moved
 * or not. Every other row is absent from the answer because it was never read.
 */
export function repairInlineSwitches(manifest: InlineRepairStore): InlineRepairOutcome[] {
  const outcomes: InlineRepairOutcome[] = [];
  for (const rec of manifest.listSessions()) {
    try {
      const outcome = repairRow(manifest, rec);
      if (outcome !== null) outcomes.push(outcome);
    } catch (err) {
      // THE ROW KEEPS WHAT IT HAD. Each write is one statement, so a throw
      // before or inside it has written nothing, and the loop goes on.
      outcomes.push(outcomeOf(rec, armOf(rec), 'threw'));
      sessionsLog.warn(
        `the inline switch pass left session "${rec.name}" exactly as it is: ` +
          `threw (${reasonWord(err)}). Its next restore runs what it ran before.`
      );
    }
  }
  report(outcomes);
  return outcomes;
}

/** Set only after a pass in this process returned. See the header. */
let passed = false;

/**
 * The pass, once per process. Null, having read nothing, once a pass has
 * returned; the latch is set only after {@link repairInlineSwitches} returned
 * without throwing, so a store that throws is tried again at the next refresh.
 */
export function repairInlineSwitchesOnce(
  manifest: InlineRepairStore
): InlineRepairOutcome[] | null {
  if (passed) return null;
  const outcomes = repairInlineSwitches(manifest);
  passed = true;
  return outcomes;
}

/** Test hook: forget that a pass ran in this process. */
export function resetInlineRepairForTests(): void {
  passed = false;
}

// ---------------------------------------------------------------------------
// One row
// ---------------------------------------------------------------------------

/**
 * One row, dispatched on its `agent` and `machineId` alone. Null for every row
 * the pass does not touch, which is never read any further.
 */
function repairRow(
  manifest: InlineRepairStore,
  rec: ManifestSessionRecord
): InlineRepairOutcome | null {
  if (rec.agent === 'codex') return argvArm(manifest, rec);
  if (rec.agent === 'claude' && isLocalRow(rec)) return envArm(manifest, rec);
  return null;
}

/** The argv arm: Codex, on this Mac and on another machine. */
function argvArm(
  manifest: InlineRepairStore,
  rec: ManifestSessionRecord
): InlineRepairOutcome {
  const here = isLocalRow(rec);
  const left = (verdict: InlineRepairVerdict): InlineRepairOutcome =>
    outcomeOf(rec, here ? 'argv-here' : 'argv-elsewhere', verdict);

  const id = rec.agentSessionId ?? '';
  if (id.length === 0) return left('no-id');
  // THE PASS NEVER ARMS A ROW THAT WAS NOT ARMED.
  const recorded = rec.resumeArgv ?? [];
  if (recorded.length === 0) return left('no-resume-argv');
  const recordedInner = isWrappedArgv(recorded) ? unwrapArgv(recorded) : recorded;
  if (recordedInner.length === 0) return left('unreadable');
  if (carriesPair(recordedInner)) return left('already-right');

  let next: string[];
  if (here) {
    // The composition the harvest's rescues and Phase 215's repair make, so the
    // person's own flags come from the one helper that sets the fixed tokens
    // aside and a captured row is wrapped again from its own record.
    const composed = composeResumeArgv(rec, 'codex', id, agentExtrasOf(rec));
    if (composed === null) return left('no-resume-argv');
    if (composed.captureLost) return left('capture-lost');
    next = composed.argv;
  } else {
    // No session on another machine is captured today, and the pass refuses to
    // guess what a record there would mean.
    if (rec.specstory !== undefined) return left('unreadable');
    // THE FAR BINARY IS THE ROW'S OWN. `argv[0]` of a remote row is a path on
    // that machine, and the remote arm types `[binOnMachine,
    // ...recordedResumeArgv.slice(1)]`, so only the tail is recomposed.
    const own = ownLaunchFlags('codex', rec.argv);
    const composed = registryResumeArgv('codex', id, own, recorded[0]);
    if (composed.length === 0) return left('no-resume-argv');
    next = composed;
  }

  const differs = differsFromRecordedPlusPair(recorded, recordedInner, next);
  if (differs !== null) return left(differs);
  manifest.setResumeArgvColumn(rec.id, next);
  return left('rewritten');
}

/** The env arm: Claude Code, on this Mac only. */
function envArm(
  manifest: InlineRepairStore,
  rec: ManifestSessionRecord
): InlineRepairOutcome {
  const left = (verdict: InlineRepairVerdict): InlineRepairOutcome =>
    outcomeOf(rec, 'env', verdict);
  const env = rec.env ?? {};
  // ONE NAME, read off the compiled constant rather than spelled a second time.
  const [name] = Object.keys(CLAUDE_INLINE_ENV) as [keyof typeof CLAUDE_INLINE_ENV];
  // ANY VALUE COUNTS, "0" included: that is the person's own opt-out, and a
  // row already holding "1" needs no write.
  if (Object.hasOwn(env, name)) return left('already-right');
  // Appended last, every other key kept in its order. An absent env gains the
  // one-key record a create at this build writes.
  const merged: Record<string, string> = { ...env, ...CLAUDE_INLINE_ENV };
  manifest.setEnvColumn(rec.id, merged);
  return left('rewritten');
}

// ---------------------------------------------------------------------------
// The two tests the argv arm is built on
// ---------------------------------------------------------------------------

/**
 * TRUE when some `i >= 1` holds the constant's two tokens in order. Any position
 * counts, leading or trailing, so a person's own pair, the repair's composition
 * and a row this pass already wrote are all left byte identical.
 */
function carriesPair(argv: readonly string[]): boolean {
  return firstPairAt(argv) !== -1;
}

/** Where the pair starts, at or after index 1, or -1. */
function firstPairAt(argv: readonly string[]): number {
  const [flag, value] = CODEX_SCROLLBACK_ARGS;
  for (let i = 1; i + 1 < argv.length; i += 1) {
    if (argv[i] === flag && argv[i + 1] === value) return i;
  }
  return -1;
}

/**
 * Null when `composed` is exactly `recorded` with the pair inserted and nothing
 * else moved, and otherwise the verdict that leaves the row alone.
 *
 *  - The inner binary must be the recorded one. A hand-edited binary is left
 *    alone; the composer never reads today's PATH anyway.
 *  - Wrapped against bare, either way round, is a different shape.
 *  - Two wraps must agree on the wrapper's own words: bin, `run`, provider,
 *    flags, `-c`. Everything but the quoted inner command, which is last.
 *  - The inner composition with its FIRST pair at `i >= 1` taken out must be the
 *    recorded inner argv. A composition carrying no pair is not "the recorded
 *    argv plus the pair" either, and is refused rather than written unchanged.
 */
function differsFromRecordedPlusPair(
  recorded: readonly string[],
  recordedInner: readonly string[],
  composed: readonly string[]
): InlineRepairVerdict | null {
  const recordedWrapped = isWrappedArgv(recorded);
  const composedWrapped = isWrappedArgv(composed);
  const composedInner = composedWrapped ? unwrapArgv(composed) : composed;
  if (composedInner[0] !== recordedInner[0]) return 'binary-differs';
  if (recordedWrapped !== composedWrapped) return 'recorded-differs';
  if (recordedWrapped && !sameArgv(recorded.slice(0, -1), composed.slice(0, -1))) {
    return 'recorded-differs';
  }
  const at = firstPairAt(composedInner);
  if (at === -1) return 'recorded-differs';
  const withoutPair = [
    ...composedInner.slice(0, at),
    ...composedInner.slice(at + CODEX_SCROLLBACK_ARGS.length)
  ];
  return sameArgv(withoutPair, recordedInner) ? null : 'recorded-differs';
}

function sameArgv(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((token, i) => token === b[i]);
}

// ---------------------------------------------------------------------------
// Small helpers and the report
// ---------------------------------------------------------------------------

/** A row on this Mac. An absent `machineId` reads as this Mac, as everywhere. */
function isLocalRow(rec: ManifestSessionRecord): boolean {
  return (rec.machineId ?? LOCAL_MACHINE_ID) === LOCAL_MACHINE_ID;
}

/** The arm a row that threw was being judged under. Only codex and claude get here. */
function armOf(rec: ManifestSessionRecord): InlineRepairArm {
  if (rec.agent !== 'codex') return 'env';
  return isLocalRow(rec) ? 'argv-here' : 'argv-elsewhere';
}

function outcomeOf(
  rec: ManifestSessionRecord,
  arm: InlineRepairArm,
  verdict: InlineRepairVerdict
): InlineRepairOutcome {
  return { sessionId: rec.id, name: rec.name, agent: rec.agent, arm, verdict };
}

/**
 * One word for why a row threw, and never its message: a manifest error's
 * message carries a detail string, and the rule for this pass's lines is no
 * argv token and no env value.
 */
function reasonWord(err: unknown): string {
  if (!(err instanceof Error)) return 'not an Error';
  try {
    const code = (JSON.parse(err.message) as { code?: unknown }).code;
    if (typeof code === 'string' && /^[A-Z_]+$/.test(code)) return code;
  } catch {
    /* not a manifest error */
  }
  return err.name;
}

/**
 * Counts, and one warning per row left for a reason a person should know about.
 * No argv token and no env value in any line.
 */
function report(outcomes: readonly InlineRepairOutcome[]): void {
  const rewrote = (arm: InlineRepairArm): number =>
    outcomes.filter((o) => o.arm === arm && o.verdict === 'rewritten').length;
  const here = rewrote('argv-here');
  const elsewhere = rewrote('argv-elsewhere');
  const env = rewrote('env');
  if (here + elsewhere + env > 0) {
    const left = new Map<InlineRepairVerdict, number>();
    for (const o of outcomes) {
      if (o.verdict === 'rewritten') continue;
      left.set(o.verdict, (left.get(o.verdict) ?? 0) + 1);
    }
    const leftWords = [...left].map(([verdict, n]) => `${verdict} ${n}`).join(', ');
    sessionsLog.info(
      `the inline switch pass gave ${here} Codex row(s) on this Mac and ` +
        `${elsewhere} on other machines the scrollback pair, and ${env} ` +
        `Claude Code row(s) the inline variable. Left as they were: ` +
        `${leftWords.length > 0 ? leftWords : 'none'}.`
    );
  }
  for (const o of outcomes) {
    if (!WARNED.has(o.verdict)) continue;
    sessionsLog.warn(
      `the inline switch pass left session "${o.name}" exactly as it is: ` +
        `${o.verdict}. Its next restore runs what it ran before.`
    );
  }
}
