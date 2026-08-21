/**
 * Restore mechanics — recreate a 'restorable' session in tmux
 * (FINAL-REPORT §2.4 Step 3, research 09 §B.4 / §E.3):
 *
 *   1. `tmux new-session -d -c <cwd>` running $SHELL (fresh interactive
 *      shell — the honest baseline; env/venvs are documented as lost)
 *   2. send-keys the snapshot replay — `cat <snapshot>; printf <separator>`
 *      executed with Enter, so prior scrollback becomes inert history above
 *      a fresh prompt (tmux-resurrect's trick, stolen per the report)
 *   3. TYPE the recorded resume command (claude --resume <uuid> /
 *      codex resume <id>) WITHOUT Enter — ARMED, never auto-fired.
 *      Plain shells and never-harvested codex sessions arm nothing.
 *
 * Step 1 has a precondition Phase 13.5.1 added: the recorded cwd may be gone,
 * and quietly restoring into the project folder instead is only safe for the
 * agents whose conversation lookup is global. See the guard below.
 *
 * The caller (GmuxCore.restoreSession) owns manifest/status bookkeeping.
 *
 * PHASE 19 ITEM 6 CHANGED WHAT THIS MODULE RETURNS, and it is the point of
 * the change rather than a detail of it. Steps 2 and 3 can each fail on their
 * own, and both used to be reported as a boolean and a nullable string that
 * the caller was free to ignore. It did ignore them, on one line, and every
 * failed restore was stored as a healthy running session. The return type is
 * now a union whose failure arm carries no tmux session at all, so the caller
 * cannot read the session without first handling the failure. See
 * {@link RestoreOutcome}.
 *
 * PHASE 21 CHANGED WHERE THIS MODULE GETS ITS ANSWERS, and that is also the
 * point rather than a detail. Restore used to ask the LIVE REGISTRY whether an
 * agent can find its conversation from another folder. The registry describes
 * the agent Tortie launches TODAY; the question is about the session that was
 * created months ago. The two are the same object only by luck, and the old
 * `catch` handed back the PERMISSIVE answer for any id the registry no longer
 * launches. For a pi shaped agent the permissive answer opens an empty session
 * that looks resumed, which is the one outcome this module exists to prevent.
 *
 * So the ladder is now the ROW first, the registry second, and a refusal last.
 * See {@link originalCwdRule}. The display name stays registry backed because
 * it is cosmetic and its fallback is the agent id, which is honest.
 *
 * The same phase added one sentence to the armed resume. When the agent build
 * recorded on the row is not the build installed now, or the binary the armed
 * line names is no longer on disk, the pane says so above the command, before
 * the user presses Enter. Research 30 §2.4 D4 fixes the rule: still arm it,
 * never refuse, never rewrite the argv, and name the agent's own session store
 * so the sentence is something the user can act on.
 */

import { existsSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import type { LaunchableAgentId, SessionRestore } from '@shared/types';
import { listDetectedAgents } from '../agents/detection';
import { getLaunchableEntry } from '../agents/registry';
import { faultPoint } from '../fault/inject';
import type { ManifestSessionRecord } from '../manifest';
// Phase 74. The one login flag definition, shared with the create path so the
// two spawn sites cannot drift apart. It is imported from ../manifest/login-shell
// and NOT from ../manifest/agents, where the create path's shell branch lives:
// agents.ts reaches src/main/config/ on purpose, and Phase 23's boundary rule
// says the restore path may never reach the configuration modules by any route.
// src/main/config/__tests__/boundary.test.ts walks this file's value imports and
// fails on the first one that lands there. ../manifest/login-shell imports
// nothing at all.
import { withLoginShellFlag } from '../manifest/login-shell';
import * as tmux from '../tmux';
import { gmuxError } from '../errors';
import {
  isWrappedArgv,
  resolveSpecstory,
  unwrapArgv,
  wrapWithRecord
} from '../specstory';
import {
  buildArmedCommand,
  buildSnapshotReplayCommand,
  shellQuoteArg
} from './command';
import { resolveSnapshot } from './snapshots';
import { postDurabilityNotice } from '../notice';
// The pane env merge rule, owned by the create path's pure module so that the
// two spawn sites cannot drift (Phase 33). One import of one pure function.
import { paneEnvFor } from '../sessions/launch-plan';

import { getLog } from '../log';

/**
 * Scope "restore" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const restoreLog = getLog('restore');

/**
 * What a restore attempt achieved (Phase 19 item 6).
 *
 * THE SHAPE IS THE FIX. This used to be one interface with three fields, and
 * the caller wrote `const { info } = outcome;` and then `status: 'running'`.
 * Both stage results were computed and then dropped on that line, so a restore
 * whose scrollback replay AND resume arming had both thrown was stored and
 * broadcast as a healthy working session.
 *
 * A discriminated union whose failure arm carries no `info` makes that same
 * line fail to compile. The caller cannot reach the tmux session without first
 * saying what it intends to do about the failure. No runtime library fixes a
 * typing defect, which is why this is four type declarations and not a state
 * machine dependency (research 34 §3.5).
 *
 * The `failed` arm carries the original error rather than a message, so the
 * caller can rethrow the exact `GmuxError` the renderer already knows how to
 * show. Failures are RETURNED rather than thrown for one reason: a thrown
 * failure is a value the caller can forget to record, and the journal entry
 * for this attempt has to be closed either way.
 */
export type RestoreOutcome =
  | {
      kind: 'failed';
      /** Where it stopped. `preflight` means no side effect was taken. */
      stage: 'preflight' | 'create';
      /** One plain sentence, safe to store and to show. */
      reason: string;
      /** The original error. Rethrow this; do not rebuild it. */
      error: unknown;
    }
  | {
      kind: 'shell_only';
      info: tmux.TmuxSessionInfo;
      /**
       * Why the scrollback did not come back. UNDEFINED means there was no
       * snapshot to replay, which is not a failure — it is a session that had
       * nothing saved yet.
       */
      replayFailure?: string;
      /** Why the resume was not armed. Undefined means there was none. */
      armFailure?: string;
      /**
       * PHASE 119. True when this restore honoured `withoutCapture` and armed
       * the bare agent command instead of the recorded wrapped one.
       *
       * The caller writes the durable flip on this field and on nothing else.
       * It is absent on every ordinary restore, and absent when the decline
       * could not be honoured, which is what keeps a failed decline from
       * quietly turning off a person's history saving.
       */
      captureDeclined?: true;
    }
  | {
      kind: 'transcript';
      info: tmux.TmuxSessionInfo;
      /** Why the resume was not armed. Undefined means there was none. */
      armFailure?: string;
      /**
       * PHASE 119. True when this restore honoured `withoutCapture` and armed
       * the bare agent command instead of the recorded wrapped one.
       *
       * The caller writes the durable flip on this field and on nothing else.
       * It is absent on every ordinary restore, and absent when the decline
       * could not be honoured, which is what keeps a failed decline from
       * quietly turning off a person's history saving.
       */
      captureDeclined?: true;
    }
  | {
      kind: 'armed';
      info: tmux.TmuxSessionInfo;
      /** The armed (typed, unexecuted) command line. */
      armedCommand: string;
      /**
       * Why the scrollback did not come back, on the session whose resume WAS
       * armed. The two stages are independent, so the best case for the
       * conversation and the worst case for the history can happen together.
       */
      replayFailure?: string;
      /**
       * One plain sentence about the agent build behind this armed command
       * (Phase 21). Present only when the build recorded on the row is not the
       * build installed now, or when the binary the command names is gone.
       *
       * It is already printed into the pane directly above the armed command,
       * which is where research 30 §2.4 D4 puts it, so a caller that ignores
       * this field still leaves the user informed. It is returned as well so
       * a caller can record or re-show it. Nothing persists it today, and
       * `SessionRestore` would be where that goes.
       */
      versionDrift?: string;
      /**
       * PHASE 119. True when this restore honoured `withoutCapture` and armed
       * the bare agent command instead of the recorded wrapped one.
       *
       * The caller writes the durable flip on this field and on nothing else.
       * It is absent on every ordinary restore, and absent when the decline
       * could not be honoured, which is what keeps a failed decline from
       * quietly turning off a person's history saving.
       */
      captureDeclined?: true;
    };

/** The three arms that created a tmux session. */
export type RestoreSuccess = Extract<
  RestoreOutcome,
  { info: tmux.TmuxSessionInfo }
>;

/** Options for {@link restoreSessionInTmux}. */
export interface RestoreSessionOptions {
  /**
   * Called with the tmux session the INSTANT `new-session` returns, before
   * anything else is done to it.
   *
   * This exists for the restore journal (Phase 19 item 7): the window between
   * a session existing and the manifest knowing it exists is exactly the
   * window where a crash leaves Tortie holding a session it has no record of
   * creating. Kept as a callback so that this module stays pure tmux side
   * effects with no manifest writes of its own.
   *
   * A throwing hook does not fail the restore. The session is already there,
   * and losing the restore over a bookkeeping error would be the larger loss.
   */
  onCreated?: (info: tmux.TmuxSessionInfo) => void;
  /**
   * PHASE 119. Bring this session back with SpecStory turned off.
   *
   * The default, and every caller before this phase, is the ordinary restore:
   * the recorded command is armed exactly as recorded, and a captured session
   * keeps capturing. With this true, a captured session's resume command is
   * taken apart and the bare agent command is armed instead.
   *
   * A row that was never captured ignores it. Nothing is refused, because the
   * recorded command is already the bare one and there is nothing to decline.
   */
  withoutCapture?: boolean;
}

/**
 * The record to store for a restore outcome.
 *
 * The liveness status that goes with it is derived by `restoredStatus` in
 * sessions/core.ts and is deliberately NOT computed here. One question gets
 * one answer in one place, and that one is the caller's, because the caller is
 * what owns the row.
 */
export function restoreRecordOf(
  outcome: RestoreOutcome,
  at: number = Date.now()
): SessionRestore {
  switch (outcome.kind) {
    case 'failed':
      return {
        kind: 'failed',
        at,
        stage: outcome.stage,
        reason: outcome.reason
      };
    case 'shell_only':
      return {
        kind: 'shell_only',
        at,
        ...(outcome.replayFailure !== undefined
          ? { replayFailure: outcome.replayFailure }
          : {}),
        ...(outcome.armFailure !== undefined
          ? { armFailure: outcome.armFailure }
          : {})
      };
    case 'transcript':
      return {
        kind: 'transcript',
        at,
        ...(outcome.armFailure !== undefined
          ? { armFailure: outcome.armFailure }
          : {})
      };
    case 'armed':
      return {
        kind: 'armed',
        at,
        ...(outcome.replayFailure !== undefined
          ? { replayFailure: outcome.replayFailure }
          : {})
      };
  }
}

/**
 * Type literal text into a session's active pane. `-l` sends the string
 * verbatim (no key-name lookup); the trailing named `Enter` is sent only
 * when `pressEnter` — the armed resume command is typed WITHOUT it.
 */
async function typeIntoPane(
  target: string,
  text: string,
  pressEnter: boolean
): Promise<void> {
  await tmux.execTmux(['send-keys', '-t', target, '-l', text]);
  if (pressEnter) {
    await tmux.execTmux(['send-keys', '-t', target, 'Enter']);
  }
}

// ---------------------------------------------------------------------------
// The recovery contract — what the row recorded, read instead of the registry
// (Phase 21 / A8, docs/research/33-durability-reconciliation.md §2.1)
// ---------------------------------------------------------------------------

/**
 * WHY RESTORE READS THE ROW AND NOT THE REGISTRY.
 *
 * Every fact in `ManifestSessionRecord.agentContract` is a fact about the
 * session that was created, not about the agent Tortie ships today. The
 * registry is a live object. A release, a user added agent file, or a deleted
 * entry can change it under a row that has been sitting in the manifest for
 * months. Asking it a correctness question about an old session is asking the
 * wrong object, and the failure is silent.
 *
 * The contract is parsed and validated on the way out of the manifest, in
 * `manifest/contract.ts`, which drops an unreadable value WHOLE rather than in
 * pieces. So a contract this module can see is a contract it can trust, and
 * `undefined` means exactly one thing: nothing was recorded. It is not a
 * licence to go and ask the registry for a permissive answer.
 */

/** Where the answer to "does this agent need its original folder" came from. */
type CwdRuleBasis =
  /** A plain shell. There is no conversation to lose. */
  | 'shell'
  /** The row recorded it. The only source that is a fact about this session. */
  | 'row'
  /** No contract on the row, and the registry still launches this agent. */
  | 'registry'
  /** No contract, and the registry does not know this agent at all. */
  | 'unknown-agent';

interface CwdRule {
  needsOriginalCwd: boolean;
  basis: CwdRuleBasis;
}

/**
 * Whether this session can only find its conversation from the ORIGINAL
 * directory. True for qwen ("No saved session found with ID", loud) and pi (a
 * SILENT new empty session under the same id). Research 22 §3.5.
 *
 * THE LADDER, and the last rung is the Phase 21 fix:
 *
 *  1. `shell` has nothing to resume, so nothing to protect.
 *  2. The row recorded the answer. Use it and stop. A registry that has since
 *     changed its mind about this agent does not get a vote on a session that
 *     already exists.
 *  3. No contract on the row, which is every session created before the
 *     migration. Ask the registry, which is what this function did for all
 *     rows until Phase 21 and is still the best available answer.
 *  4. No contract AND the registry does not launch this id. Refuse. The old
 *     code returned `false` here, and `false` means "go ahead and restore into
 *     a different folder". For a pi shaped agent that is a pane that looks
 *     resumed with an empty conversation behind it. Tortie does not know what
 *     this agent needs, so it says so instead of guessing in the direction
 *     that loses the user's work.
 */
export function originalCwdRule(rec: ManifestSessionRecord): CwdRule {
  if (rec.agent === 'shell') return { needsOriginalCwd: false, basis: 'shell' };
  const contract = rec.agentContract;
  if (contract !== undefined) {
    return { needsOriginalCwd: contract.requiresOriginalCwd, basis: 'row' };
  }
  try {
    const entry = getLaunchableEntry(rec.agent as LaunchableAgentId);
    return {
      needsOriginalCwd: entry.resume.requiresOriginalCwd === true,
      basis: 'registry'
    };
  } catch {
    return { needsOriginalCwd: true, basis: 'unknown-agent' };
  }
}

/**
 * Human name for the agent in an error the user reads.
 *
 * THE ONE THING RESTORE STILL ASKS A LIVE OBJECT FOR, and it stays that way on
 * purpose. It is cosmetic, and its fallback is the bare agent id, which is a
 * true thing to show a user rather than a wrong one. The recovery contract
 * leaves the display name out for the same reason.
 */
function agentDisplayName(rec: ManifestSessionRecord): string {
  if (rec.agent === 'shell') return 'This session';
  try {
    return getLaunchableEntry(rec.agent as LaunchableAgentId).displayName;
  } catch {
    return rec.agent;
  }
}

/**
 * The literal directory prefix of a session-store template.
 *
 * The registry records where an agent keeps its conversations in template form,
 * e.g. `~/.claude/projects/<dashEncode(realpath(cwd))>/<sessionId>.jsonl`. A
 * user reading a sentence in a pane needs the part of that they can open, so
 * the segments are taken until the first one that is a placeholder or an
 * environment variable. Returns null when nothing literal is left.
 *
 * Exported for tests, because getting this wrong puts a path with angle
 * brackets in it into the user's terminal.
 */
export function storeRootOfTemplate(template: string): string | null {
  const literal: string[] = [];
  for (const segment of template.split('/')) {
    if (/[<>$*]/.test(segment)) break;
    literal.push(segment);
  }
  const root = literal.join('/');
  return root.length === 0 || root === '~' ? null : root;
}

/**
 * Root of the agent's own session store, e.g. `~/.claude/projects`.
 *
 * The row's recorded template wins, because it is the store this session was
 * actually written into. The registry fallback takes the first `storeDirs`
 * entry that is a literal path, because several entries lead with an
 * environment variable (`$PI_CODING_AGENT_SESSION_DIR`) that means nothing to
 * a user reading a sentence in a pane.
 */
function agentStoreRoot(rec: ManifestSessionRecord): string | null {
  const recorded = rec.agentContract?.sessionStore;
  if (recorded !== undefined) {
    const root = storeRootOfTemplate(recorded);
    if (root !== null) return root;
  }
  if (rec.agent === 'shell') return null;
  try {
    const dirs = getLaunchableEntry(rec.agent as LaunchableAgentId).storeDirs;
    return dirs.find((dir) => !/[<>$*]/.test(dir)) ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Agent drift — one sentence, on the armed resume (Phase 21, research 30 D4)
// ---------------------------------------------------------------------------

/** How much the agent build moved between launch and now. */
export type AgentVersionChange =
  /** The same build, or a version string that only changed its formatting. */
  | 'same'
  /** A patch bump with the major and minor unchanged. Deliberately silent. */
  | 'patch'
  /** A major or minor change, a calendar dated build, or an unreadable pair. */
  | 'significant';

/** First dotted number group in a version string, as [major, minor, patch]. */
function parseVersionTriple(text: string): [number, number, number] | null {
  const m = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(text);
  if (m === null) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3] ?? '0')];
}

/**
 * A four digit leading number in the 2000s is a year, not a major version.
 * cursor ships `2026.08.11-e8db854`, so its "patch" component is a day and a
 * one day move is a whole build. Research 30 §2.4 D4 says to treat any
 * difference in a date stamped version as worth saying.
 */
function looksLikeCalendarYear(major: number): boolean {
  return major >= 2000 && major <= 2999;
}

/**
 * How much two version strings differ, and therefore whether the user hears
 * about it.
 *
 * PATCH BUMPS ARE SILENT, and that is a product decision with a measurement
 * behind it. Research 30 §2.1 re-probed the installed agents three days after
 * the flag catalogue was written and five of nine had moved. A sentence on
 * every patch bump is a sentence the user learns to skip, and then the one
 * that matters is skipped with it.
 *
 * A pair that cannot be parsed is treated as significant when the strings
 * differ. Not being able to compare two builds is a reason to say something,
 * not a reason to stay quiet.
 */
export function agentVersionChange(
  recorded: string,
  live: string
): AgentVersionChange {
  const a = parseVersionTriple(recorded);
  const b = parseVersionTriple(live);
  if (a === null || b === null) {
    return recorded.trim() === live.trim() ? 'same' : 'significant';
  }
  if (a[0] === b[0] && a[1] === b[1] && a[2] === b[2]) return 'same';
  if (a[0] !== b[0] || a[1] !== b[1]) return 'significant';
  if (looksLikeCalendarYear(a[0]) || looksLikeCalendarYear(b[0])) {
    return 'significant';
  }
  return 'patch';
}

/**
 * The version string with the agent's own name taken back out of it.
 *
 * The recorded version is the raw `--version` output, which several agents
 * decorate with their own name. claude answers `2.1.229 (Claude Code)` and
 * muse answers `Muse Code 0.1.0 (0.1.0-R708.1)`. A sentence that already says
 * "Claude Code" and then says it again inside the version reads as a mistake.
 *
 * Deliberately narrow. Only an exact leading `<name> ` or an exact trailing
 * ` (<name>)` is removed, and if that leaves nothing the original is kept.
 * Anything cleverer would start editing version strings it does not
 * understand, and a wrong version in this sentence is worse than a clumsy one.
 */
export function trimVersionLabel(version: string, displayName: string): string {
  let out = version.trim();
  const suffix = ` (${displayName})`;
  if (out.endsWith(suffix)) out = out.slice(0, -suffix.length).trim();
  const prefix = `${displayName} `;
  if (out.startsWith(prefix)) out = out.slice(prefix.length).trim();
  return out.length === 0 ? version.trim() : out;
}

/** What the drift sentence is built from. All of it is already in hand. */
export interface DriftFacts {
  /** What to call the agent in the sentence. */
  displayName: string;
  /** The agent binary the armed command names, when it is an absolute path. */
  binary: string | null;
  /** True when `binary` is absolute and is not on disk. */
  binaryMissing: boolean;
  /** The build recorded on the row, or null on a pre-migration row. */
  recordedVersion: string | null;
  /** The build detected now, or null when nothing could be detected. */
  liveVersion: string | null;
  /** e.g. `~/.claude/projects`, or null when it is not known. */
  storeRoot: string | null;
}

/**
 * The one sentence, or null when there is nothing worth saying.
 *
 * Two things get said and nothing else does. The binary the armed command
 * names is gone, which means the line will answer "no such file or directory"
 * the moment it is fired. Or the build has moved far enough that the resume
 * semantics may have moved with it. Both end by naming the agent's own session
 * store, because that is the user's real backstop and a sentence they can act
 * on beats a sentence they can only read.
 *
 * Pure, and exported, so the wording is testable without a tmux server.
 */
export function agentDriftSentence(facts: DriftFacts): string | null {
  const store =
    facts.storeRoot === null
      ? ''
      : ` The conversation is still in ${facts.storeRoot}.`;

  if (facts.binaryMissing && facts.binary !== null) {
    return (
      `This session ran ${facts.binary}, and that file is not there now. ` +
      `The command below will not run until ${facts.displayName} is ` +
      `installed again.${store}`
    );
  }

  if (facts.recordedVersion === null || facts.liveVersion === null) return null;
  if (agentVersionChange(facts.recordedVersion, facts.liveVersion) !== 'significant') {
    return null;
  }
  const was = trimVersionLabel(facts.recordedVersion, facts.displayName);
  const now = trimVersionLabel(facts.liveVersion, facts.displayName);
  return (
    `This session ran under ${facts.displayName} ${was}. Version ${now} is ` +
    'installed now. If the conversation does not come back, it is still in ' +
    `${facts.storeRoot ?? "the agent's own store"}.`
  );
}

/**
 * How long the detection scan gets to answer before restore stops waiting.
 *
 * Research 30 §2.3 measured one version probe at 26 ms to 673 ms and the whole
 * fleet in parallel at about 0.7 s, so this budget is generous. It exists
 * because a restore must never be held up by a probe: an agent CLI that hangs
 * is exactly the kind of thing that would otherwise stall the one path the
 * user is waiting on.
 */
export const LIVE_VERSION_BUDGET_MS = 2_000;

/**
 * The version detected for this agent right now, or null.
 *
 * Reads the detection CACHE (`listDetectedAgents`), which is the same source
 * the create path records from, so no subprocess is started here on the normal
 * path. NOT VERIFIED FRESH, and the limitation is worth naming: an agent
 * upgraded in a terminal while Tortie stayed open reports its old version
 * until the next scan. That is a missed sentence and never a wrong one,
 * because both sides of the comparison come from the same cache. Refreshing
 * the cache on a trigger is research 30's D2 and is not this phase.
 */
async function liveAgentVersion(
  agent: ManifestSessionRecord['agent']
): Promise<string | null> {
  let timer: NodeJS.Timeout | undefined;
  try {
    const scan = await Promise.race([
      listDetectedAgents(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), LIVE_VERSION_BUDGET_MS);
      })
    ]);
    if (scan === null) return null;
    return scan.agents.find((a) => a.id === agent)?.version ?? null;
  } catch {
    return null;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * The AGENT binary an armed command will actually run.
 *
 * A captured session's argv[0] is the SpecStory wrapper, and the agent it
 * wraps is inside the `-c` string, so the naive read tests the wrong file.
 * `armableResumeArgv` has already healed the wrapper itself by the time this
 * is called; this answers the other half, which nothing checked before Phase
 * 21 (research 33 §2.2, M6 check 2).
 */
function armedAgentBinary(argv: readonly string[]): string | null {
  const inner = isWrappedArgv(argv) ? unwrapArgv([...argv]) : [...argv];
  const bin = inner[0];
  return bin === undefined || bin.length === 0 ? null : bin;
}

/**
 * The line printed into the pane above the armed command.
 *
 * Executed with Enter, so it becomes inert history exactly like the snapshot
 * separator, and the armed command is still the last thing on the screen with
 * the cursor on it. It will be captured into the next snapshot and replayed by
 * the next restore, which is the same deal the separator already makes.
 */
function buildDriftNoticeCommand(sentence: string): string {
  return ` printf 'Tortie: %s\\n\\n' ${shellQuoteArg(sentence)}`;
}

/**
 * The resume argv to ARM, with a captured session's dead SpecStory binary
 * healed first.
 *
 * WHY THIS EXISTS. A captured session records its resume argv wrapped in the
 * ABSOLUTE path of the specstory binary it launched under
 * (`specstory.bin`), and restore types that argv verbatim. The path is a
 * promise about the future that gmux cannot keep:
 *
 *  - renaming the app (Phase 16.5, gmux.app → Tortie.app) invalidates the
 *    recorded `/Applications/gmux.app/Contents/Resources/bin/specstory` for
 *    EVERY captured session at once;
 *  - a `git clean` removes `build/vendor/specstory`, which is the bin every
 *    dev-created row recorded;
 *  - an uninstalled Homebrew copy does the same for anyone who resolved to
 *    `installed`.
 *
 * Measured, the armed line then answers `…/specstory: No such file or
 * directory` and exits 127, so the user presses Enter on their restored
 * session and their conversation does not come back. That is the one thing a
 * restore may not do, and it is worth healing rather than reporting.
 *
 * The ladder, in order of how much it preserves:
 *
 *  1. bin still there → the recorded argv, untouched (the normal path).
 *  2. bin gone, a specstory resolvable now → RE-WRAP the same inner resume
 *     command with today's binary. Capture continues, under the session's own
 *     recorded provider and no-cloud choice — never a freshly re-read one.
 *  3. no specstory at all → arm the BARE agent resume. The conversation comes
 *     back, capture does not continue, and the log says so.
 *
 * The inner command comes from {@link unwrapArgv} because the resume argv is
 * composed after the fact (the harvest arms it once the agent's id exists) and
 * the manifest's verbatim copy — `specstory.agentArgv` — is the LAUNCH argv,
 * not this one. Re-splitting is the lossy direction (see specstory/wrap.ts),
 * but every alternative here is "the resume does not run at all".
 *
 * Exported so the rename migration's harness can PROVE the first bullet
 * (`GMUX_SMOKE=migrate`, Phase 16.5a) against a row recorded under the old
 * bundle path, rather than asserting that it is handled.
 *
 * PHASE 119 made this a thin wrapper over {@link armableResume}, which is the
 * same three rung ladder plus a fourth answer for a person who asked to come
 * back without SpecStory. This signature and both of its callers are unchanged.
 */
export async function armableResumeArgv(
  rec: ManifestSessionRecord
): Promise<string[]> {
  return (await armableResume(rec)).argv;
}

/**
 * PHASE 119. The one sentence a person reads when a decline could not be
 * honoured. It names the thing that stopped rather than the code that stopped.
 *
 * WHERE IT GOES, corrected in this phase's fix round. It is written to the
 * main log, it is stored on the outcome and travels to the renderer on the
 * row's `restore.armFailure`, and `runRestore` in
 * `src/renderer/state/sessions-slice.ts` shows it as a sticky error toast in
 * place of the success toast. It is NOT the restore shortfall notice, which
 * carries a stage and no sentence and speaks only once per app run.
 */
export const DECLINE_UNWRAP_FAILED =
  "Tortie could not separate this session's resume command from SpecStory, " +
  'so nothing was armed in the pane.';

/** What {@link armableResume} was asked for. */
export interface ArmableResumeOptions {
  /**
   * PHASE 119. Arm the bare agent command rather than the recorded wrapped
   * one. See {@link RestoreSessionOptions.withoutCapture}.
   */
  withoutCapture?: boolean;
}

/** What {@link armableResume} decided. */
export interface ArmableResume {
  /**
   * The argv to arm. Empty means arm nothing, which happens only when a
   * decline was asked for and the recorded command could not be taken apart.
   */
  argv: string[];
  /**
   * True when the decline was honoured and `argv` is the bare agent command.
   * The caller writes the durable capture flip on this and on nothing else.
   */
  captureDeclined: boolean;
  /**
   * One plain sentence, present only when a decline was asked for and could
   * not be honoured. The caller reports it as the restore's arm failure.
   */
  declineFailure?: string;
}

/**
 * The resume argv to ARM, and whether a person's decline of capture was
 * honoured (Phase 119).
 *
 * {@link armableResumeArgv} is this function with the option omitted, which is
 * the ordinary restore and is unchanged in every respect.
 *
 * THE DECLINE ARM, and why it is not the missing-binary arm with a different
 * trigger. A missing binary is Tortie repairing something behind the person's
 * back, so it prefers to keep capture running under whatever specstory it can
 * find. A decline is the person asking for the opposite, so it never resolves
 * a binary, never re-wraps, and never reaches the ladder below at all. When
 * the recorded command cannot be taken apart it arms NOTHING, because arming
 * the recorded line would run the very wrapper that was just declined.
 */
export async function armableResume(
  rec: ManifestSessionRecord,
  options: ArmableResumeOptions = {}
): Promise<ArmableResume> {
  const recorded = [...(rec.resumeArgv ?? [])];
  const capture = rec.specstory;
  const wrappedCapture =
    recorded.length > 0 && capture?.enabled === true && isWrappedArgv(recorded);

  if (options.withoutCapture === true) {
    // A row with nothing wrapped to decline is a no-op rather than a refusal.
    // The recorded command is already the bare one, so honouring the request
    // and doing nothing are the same answer, and nothing is flipped.
    if (!wrappedCapture) return { argv: recorded, captureDeclined: false };

    const declinedInner = unwrapArgv(recorded);
    if (declinedInner.length === 0) {
      restoreLog.warn(
        `"${rec.name}": a restore without saving history was asked for and ` +
          'the recorded resume command could not be separated from SpecStory. ' +
          'Nothing was armed and the capture setting was left unchanged.'
      );
      return {
        argv: [],
        captureDeclined: false,
        declineFailure: DECLINE_UNWRAP_FAILED
      };
    }
    restoreLog.warn(
      `"${rec.name}": restored without SpecStory at the person's request. ` +
        'The armed command runs the agent directly and this session no ' +
        'longer saves its history.'
    );
    return { argv: declinedInner, captureDeclined: true };
  }

  if (!wrappedCapture || capture === undefined || existsSync(capture.bin)) {
    return { argv: recorded, captureDeclined: false };
  }

  const inner = unwrapArgv(recorded);
  if (inner.length === 0) {
    // Not a shape this function can take apart; arming the recorded line at
    // least fails loudly in the pane rather than silently arming nothing.
    restoreLog.warn(
      `"${rec.name}": recorded SpecStory binary is gone (${capture.bin}) ` +
        'and its resume command could not be unwrapped — arming it as recorded'
    );
    return { argv: recorded, captureDeclined: false };
  }

  const { active } = await resolveSpecstory();
  if (active !== null) {
    const rewrapped = wrapWithRecord({ ...capture, bin: active.path }, inner);
    if (rewrapped !== null) {
      restoreLog.warn(
        `"${rec.name}": recorded SpecStory binary is gone ` +
          `(${capture.bin}) — re-armed under ${active.path}, capture continues`
      );
      return { argv: rewrapped, captureDeclined: false };
    }
  }

  restoreLog.warn(
    `"${rec.name}": recorded SpecStory binary is gone (${capture.bin}) ` +
      'and no SpecStory CLI is available — armed the agent directly, so this ' +
      'session resumes but is no longer captured'
  );
  // NOT a decline. Nothing was asked for, so nothing is flipped on the row:
  // put the binary back and the next restore captures again.
  return { argv: inner, captureDeclined: false };
}

/**
 * Recreate one manifested session in tmux with replayed scrollback and an
 * armed resume command. Pure tmux side effects — no manifest writes here.
 *
 * NEVER THROWS FOR A RESTORE THAT FAILED. It returns the `failed` arm carrying
 * the original error, and the caller rethrows it after recording the attempt.
 * The `GmuxError` the renderer shows is the same object it was before, so the
 * friendly "that folder is gone" state is unchanged.
 */
export async function restoreSessionInTmux(
  rec: ManifestSessionRecord,
  options: RestoreSessionOptions = {}
): Promise<RestoreOutcome> {
  // PHASE 81. Restore becomes clickable before the capture lands now, so the
  // wait that used to be free has to be asked for. A restored pane that got
  // the launchd PATH shows `command not found` for a tool that works in
  // Terminal, and the only cure is killing the session.
  await tmux.installUserPath();
  const originalCwdGone = !existsSync(rec.cwd);

  // THE SUBSTITUTION IS NOT ALWAYS SAFE (research 22 §3.5, unimplemented
  // until Phase 13.5.1). Falling back rec.cwd -> projectPath is fine for the
  // agents whose lookup is global (claude, muse), and it is the failure this
  // whole phase exists to prevent for the cwd-scoped ones: `pi --session-id
  // <id>` run from the wrong project does not error, it starts an EMPTY
  // session under the same id, so the pane LOOKS resumed and the conversation
  // is not there. Refuse instead, and say what to do about it.
  //
  // Only when a resume is actually armed: with nothing to type into the pane
  // there is no false resume to prevent, and the user should still get their
  // directory and scrollback back rather than a refusal.
  //
  // Phase 21: the answer comes from the ROW when the row has one. See
  // originalCwdRule for the whole ladder.
  const cwdRule = originalCwdRule(rec);
  if (
    originalCwdGone &&
    (rec.resumeArgv?.length ?? 0) > 0 &&
    cwdRule.needsOriginalCwd
  ) {
    const reason =
      cwdRule.basis === 'unknown-agent'
        ? `"${rec.name}" was in ${rec.cwd}, and that folder is gone. Tortie ` +
          `has no record of how ${rec.agent} finds a conversation, so ` +
          'restoring it somewhere else could open an empty session that looks ' +
          'resumed. Put the folder back and restore again, or start a new ' +
          'session.'
        : `"${rec.name}" was in ${rec.cwd}, and that folder is gone. ` +
          `${agentDisplayName(rec)} can only find this ` +
          'conversation from its original folder, so restoring it somewhere ' +
          'else would open an empty session that looks resumed. Put the ' +
          'folder back and restore again, or start a new session.';
    return {
      kind: 'failed',
      stage: 'preflight',
      reason,
      error: gmuxError('INVALID_INPUT', reason, rec.cwd)
    };
  }

  const cwd = !originalCwdGone
    ? rec.cwd
    : existsSync(rec.projectPath)
      ? rec.projectPath
      : null;
  if (cwd === null) {
    const reason = `The folder for "${rec.name}" no longer exists.`;
    return {
      kind: 'failed',
      stage: 'preflight',
      reason,
      error: gmuxError('INVALID_INPUT', reason, rec.cwd)
    };
  }

  // GUI-launched Electron inherits a minimal env; SHELL may be unset.
  const shell = process.env['SHELL'] ?? '/bin/zsh';

  // PHASE 74. Two things happen on this line, and the second one was a defect
  // nobody had reported.
  //
  // ISSUE 8, and the gate. A shell session starts as a LOGIN shell, so the
  // person's own ~/.zprofile runs and completion behaves the way it does in
  // Terminal.app. The flag is added for `shell` rows ONLY, because this
  // function opens a holder shell for EVERY row. An ungated flag would run
  // agent writable rc code before every agent restore, which is the shape
  // Phase 33 rejected at docs/BACKLOG.md:3378. Phase 33's other reason, that a
  // login shell deepens the process tree and endangers the bare name pkill
  // property, does not apply: `zsh -l` execs in place and adds no process.
  //
  // THE SECOND DEFECT. This spawned `[shell]` and never read `rec.argv`, so a
  // restored shell session lost every flag it was launched with. On that one
  // path the manifest was not the source of truth. The row is what the session
  // ran, so the row is what restore spawns.
  //
  // The flag is added on the way out and never written back, so a restore
  // still writes no argv to the manifest. A row from an older build carries no
  // flag and comes back as a login shell anyway, with no migration.
  let shellArgv: string[] = [shell];
  if (rec.agent === 'shell') {
    const recorded = rec.argv[0];
    const usable = recorded !== undefined && existsSync(recorded);
    if (recorded !== undefined && !usable) {
      restoreLog.warn(
        `"${rec.name}" was launched with ${recorded}, which is no longer ` +
          `there. Restoring it with ${shell}.`
      );
    }
    shellArgv = withLoginShellFlag(usable ? rec.argv : [shell]);
  }

  // PHASE 33. Re-resolve, never replay. The row carries the NAMES its agent
  // asked Tortie to read from the login shell, and no value, so the only way
  // to fill them is to ask the shell again. That is also the better answer:
  // a key the user rotated since the create arrives correct, and a fresh pane
  // and a restored pane see the same environment for the first time. A row
  // written before this phase names nothing, spawns no probe, and behaves
  // exactly as it did.
  let resolvedEnv: Record<string, string> = {};
  let envProbe: tmux.CaptureEnvResult | null = null;
  if (rec.envPassthrough !== undefined && rec.envPassthrough.length > 0) {
    envProbe = await tmux.captureLoginShellEnv(rec.envPassthrough);
    resolvedEnv = envProbe.values;
  }

  faultPoint('restore.before-spawn');
  let info: tmux.TmuxSessionInfo;
  try {
    info = await tmux.createSession({
      displayName: rec.name,
      cwd,
      argv: shellArgv,
      // Same markers a fresh create stamps (Phase 12.7 F3): a restored session
      // is just as managed, and identity must survive the round trip. The
      // stamps stay last, over both the row's own env and the resolved
      // passthrough. See paneEnvFor.
      env: paneEnvFor(rec.env, resolvedEnv, rec.id)
    });
  } catch (err) {
    return {
      kind: 'failed',
      stage: 'create',
      reason: `"${rec.name}" could not be recreated: ${(err as Error).message}`,
      error: err
    };
  }

  // The journal's second write, before anything else touches the pane. A
  // failure here is logged and swallowed: the session exists, and the restore
  // is worth more than the bookkeeping.
  try {
    options.onCreated?.(info);
  } catch (err) {
    restoreLog.warn(
      `could not record the restore of "${rec.name}": ${(err as Error).message}`
    );
  }

  faultPoint('restore.after-spawn');

  // PHASE 33. The same sentence a fresh create says, for the same reason. The
  // pane exists, and it is running without a variable its row promises.
  if (envProbe !== null && (envProbe.missing.length > 0 || envProbe.probeFailed)) {
    postDurabilityNotice({
      kind: 'env-unresolved',
      sessionId: rec.id,
      sessionName: rec.name,
      names: envProbe.missing,
      probeFailed: envProbe.probeFailed
    });
  }

  // From here on, target the immutable $-id (rename-proof addressing).
  const target = info.sessionId;

  // Step 2 — replay the snapshot as inert history (executed).
  let replayed = false;
  let replayFailure: string | undefined;
  const resolved = resolveSnapshot(rec.id);
  const snapshot = resolved?.path ?? null;
  if (resolved !== null && resolved.rejected > 0) {
    // Items 3 and 9. The newest capture did not prove out and the ring gave
    // an earlier one instead. The restore succeeds, so nothing else on this
    // path would say a word, and the user is about to look at scrollback that
    // stops earlier than the one they remember.
    restoreLog.warn(
      `"${rec.name}" restored from an earlier snapshot: ` +
        `${String(resolved.rejected)} newer generation(s) did not verify`
    );
    postDurabilityNotice({ kind: 'snapshot-repaired', sessionName: rec.name });
  }
  if (snapshot !== null) {
    try {
      await typeIntoPane(target, buildSnapshotReplayCommand(snapshot), true);
      replayed = true;
    } catch (err) {
      // A failed replay must not lose the restore itself. It must not be
      // forgotten either, which is what used to happen one line below this
      // one: the boolean was dropped and the session was stored as 'running'.
      replayFailure = (err as Error).message;
      restoreLog.warn(
        `snapshot replay failed for "${rec.name}": ${replayFailure}`
      );
    }
  }

  faultPoint('restore.after-replay');

  // Step 3 — arm the resume command (typed, NOT executed).
  let armedCommand: string | null = null;
  let armFailure: string | undefined;
  let versionDrift: string | undefined;
  // PHASE 119. The decision about the wrapper, and whether a decline was
  // honoured, is made in one place and read here. `argv` is empty only when a
  // decline was asked for and the recorded command could not be taken apart,
  // and in that case `declineFailure` carries the sentence that says so.
  const armable = await armableResume(rec, {
    ...(options.withoutCapture === true ? { withoutCapture: true } : {})
  });
  const armableArgv = armable.argv;
  if (armable.declineFailure !== undefined) {
    armFailure = armable.declineFailure;
  }
  const captureDeclined = armable.captureDeclined
    ? ({ captureDeclined: true } as const)
    : {};
  const armed = buildArmedCommand(armableArgv);
  if (armed.length > 0) {
    // Phase 21, research 30 §2.4 D4. One sentence, printed above the armed
    // command, before the user's one keypress. The resume is still armed
    // exactly as recorded: nothing here refuses a restore or rewrites an argv.
    const binary = armedAgentBinary(armableArgv);
    const facts: DriftFacts = {
      displayName: agentDisplayName(rec),
      binary,
      binaryMissing:
        binary !== null && isAbsolute(binary) && !existsSync(binary),
      recordedVersion: rec.agentVersion ?? null,
      // The scan is only worth waiting for when there is a recorded version to
      // compare it against. A pre-migration row has nothing to compare, so it
      // costs nothing and starts nothing.
      liveVersion:
        rec.agentVersion === undefined ? null : await liveAgentVersion(rec.agent),
      storeRoot: agentStoreRoot(rec)
    };
    const sentence = agentDriftSentence(facts);
    if (sentence !== null) {
      versionDrift = sentence;
      restoreLog.warn(`"${rec.name}": ${sentence}`);
      try {
        await typeIntoPane(target, buildDriftNoticeCommand(sentence), true);
      } catch (err) {
        // Best effort by design. Losing the restore over a warning would cost
        // the user more than the warning is worth.
        restoreLog.warn(
          `could not print the agent notice for "${rec.name}": ` +
            (err as Error).message
        );
      }
    }
    try {
      await typeIntoPane(target, armed, false);
      armedCommand = armed;
    } catch (err) {
      armFailure = (err as Error).message;
      restoreLog.warn(
        `could not arm resume for "${rec.name}": ${armFailure}`
      );
    }
  }

  faultPoint('restore.after-arm');

  // The kind names the BEST thing that came back, and the two failure fields
  // say what did not. The two stages are independent: a session with no saved
  // snapshot can still arm its resume perfectly, and reporting that one as
  // `shell_only` would hide the one thing the user cares about most.
  if (armedCommand !== null) {
    return {
      kind: 'armed',
      info,
      armedCommand,
      ...(replayFailure !== undefined ? { replayFailure } : {}),
      ...(versionDrift !== undefined ? { versionDrift } : {}),
      ...captureDeclined
    };
  }
  if (replayed) {
    return {
      kind: 'transcript',
      info,
      ...(armFailure !== undefined ? { armFailure } : {}),
      ...captureDeclined
    };
  }
  return {
    kind: 'shell_only',
    info,
    ...(replayFailure !== undefined ? { replayFailure } : {}),
    ...(armFailure !== undefined ? { armFailure } : {}),
    ...captureDeclined
  };
}
