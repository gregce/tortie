/**
 * run.ts — the spawn contract for the skills CLI, and the plan-then-execute
 * shape that makes the confirmation requirement structural.
 *
 * ## Plan, then execute, and why it is two calls
 *
 * Nothing installs without a human confirming it, and the confirm shows the
 * full command line. {@link planSkillsCommand} builds the whole thing without
 * running anything: the argv, the working directory, the command line as a
 * string, the lock-file verdict and whether it needs a network. The renderer
 * shows that. {@link executeSkillsPlan} is the only thing that spawns, and it
 * re-checks the lock guard immediately before it does, so a plan that sat on
 * screen while the file changed underneath cannot slip through.
 *
 * A one-call `install()` would make the confirmation a convention that a later
 * round could forget. Two calls make it the only route.
 *
 * ## The spawn contract, one place, no exceptions
 *
 * - Executable and prefix arguments come from the resolved copy
 *   (`resolve.ts`): the Electron binary plus the bundled entry point, or the
 *   user's own `skills` on PATH.
 * - `ELECTRON_RUN_AS_NODE=1` on every bundled call. It rides on the copy's own
 *   invocation so it cannot be forgotten at a call site.
 * - The recovered login-shell environment, passed through rather than scrubbed.
 * - Working directory: the project root for project scope, the user's home for
 *   global scope. Never the app's inherited cwd, which under a GUI launch is
 *   `/` and from a terminal is very plausibly a repository the user is working
 *   in.
 * - `['ignore', 'pipe', 'pipe']`, never a pseudo-terminal. With `-y` and the
 *   flags fully specified the CLI completes without prompting.
 * - **Success is the exit code, never the text.** Only two outputs are ever
 *   parsed, being `list --json` and `--version`. Everything else is
 *   box-drawing characters and ANSI escapes.
 *
 * ## The five failures, and the two rules that bind all of them
 *
 * 1. The bundled CLI is missing or will not start. {@link planSkillsCommand}
 *    returns a refusal naming the path that was tried, and nothing is spawned.
 *    The list still renders, because the list is a filesystem read that never
 *    touches this module.
 * 2. A command exits non-zero. The result carries the exact command line and
 *    the last lines of stderr.
 * 3. A command hangs. 120 s for `add` and `update`, 15 s for `--version` and
 *    `-l`, from `OPERATION_TRAITS`. The child's whole process group is killed
 *    and the result says the command was stopped.
 * 4. The output format changes. `parseSkillsListJson` treats anything
 *    unexpected as a failed probe rather than an empty list.
 * 5. There is no network. `plan.requiresNetwork` says which operations need one
 *    in advance, so the panel can say it in one line rather than disabling a
 *    whole section.
 * 6. A remove exits 0 with the skill still on disk (Phase 30). The CLI reports
 *    "No matching skills found" and returns without a non-zero exit, so for
 *    remove alone the exit code is checked against the filesystem. See
 *    {@link removeResidueFailure}.
 *
 * **The panel never shows a state it has not re-read from disk.** That is why
 * {@link SkillsRunResult} carries no skills, no names and no counts: there is
 * nothing in it a row could be drawn from. The caller re-reads the filesystem.
 *
 * **Every failure names the command that produced it.** `commandLine` is on the
 * plan and on the result, in success and in failure, because a hidden
 * subprocess that fails without naming itself is unfixable by the person
 * looking at it.
 */

import { lstatSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { runGuarded } from '../proc/guarded';
import {
  OPERATION_TRAITS,
  SkillsCommandError,
  commandFor,
  parseSkillsListJson,
  type SkillsListProbe,
  type SkillsOperation
} from './commands';
import { checkLocksBeforeWrite } from './lock';
import {
  resolveSkillsCli,
  skillsEnv,
  skillsUnavailableMessage,
  type SkillsEnvOptions
} from './resolve';

/** How many lines of stderr a failure shows. Enough to see the CLI's message. */
const STDERR_TAIL_LINES = 12;
/** Cap on buffered output. `add -l` on a large source is the biggest case. */
const MAX_OUTPUT_BYTES = 512 * 1024;

export interface SkillsRunContext {
  /**
   * Required when the operation's scope is the project, and it is the working
   * directory the CLI runs in. Global operations run in the user's home.
   */
  readonly projectRoot?: string;
  readonly env?: SkillsEnvOptions;
  /**
   * Verification seam: SHORTEN the deadline. It is clamped to the operation's
   * own timeout and can only lower it, never raise it, so no caller can give a
   * command longer than the failure table allows. It exists because the hang
   * row of that table is otherwise only drivable by waiting two minutes.
   */
  readonly shortenTimeoutMs?: number;
}

/**
 * The plan, the refusal and the result are DECLARED IN `src/shared/skills.ts`
 * and re-exported here.
 *
 * All three cross IPC, because the confirm a person ticks is drawn in the
 * renderer while the spawn happens here. That is safe in exactly one direction:
 * main builds the plan and the renderer displays it, and `executeSkillsPlan`
 * below rebuilds the argv from `plan.operation` before running anything, so a
 * plan that was edited on the way back cannot change what is spawned.
 */
export type {
  SkillsPlan,
  SkillsPlanResult,
  SkillsRefusal,
  SkillsRunResult
} from '@shared/skills';

import type {
  SkillsPlan,
  SkillsPlanResult,
  SkillsRefusal,
  SkillsRunResult
} from '@shared/skills';

/** Quote an argument the way a shell would need it, for display only. */
function quote(arg: string): string {
  return /^[A-Za-z0-9_@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`;
}

function commandLineOf(argv: readonly string[]): string {
  return argv.map(quote).join(' ');
}

function tail(text: string, lines: number): string {
  const trimmed = text.replace(/\s+$/, '');
  if (trimmed.length === 0) return '';
  const split = trimmed.split('\n');
  return split.slice(Math.max(0, split.length - lines)).join('\n');
}

/** Global operations run in the user's home, project ones in the project root. */
function scopeOf(operation: SkillsOperation): 'global' | 'project' {
  if (operation.kind === 'install') return operation.scope;
  if (operation.kind === 'remove') return operation.scope ?? 'global';
  if (operation.kind === 'restoreProject') return 'project';
  return 'global';
}

/**
 * The post-run check for remove, and nothing else (Phase 30).
 *
 * The pinned CLI exits 0 when a remove matches nothing: `resolveSkillsToRemove`
 * prints "No matching skills found" and returns without `process.exit(1)`. So
 * for remove alone, exit 0 is not evidence that anything was removed. This
 * checks the one fact that decides it, being whether the canonical directory is
 * still on disk. It is a filesystem check, not output parsing, so the "success
 * is the exit code, never the text" rule holds: the exit code decides whether
 * the command FAILED, and this decides whether a passing remove REMOVED.
 *
 * Returns the failure sentence when the directory is still there, null when it
 * is gone. `lstat` rather than `stat`, so a leftover symlink also counts as
 * residue rather than being followed to nowhere.
 */
export function removeResidueFailure(skill: string, canonicalDir: string): string | null {
  try {
    lstatSync(canonicalDir);
  } catch {
    return null;
  }
  return (
    `The skills CLI exited 0, but "${skill}" is still on disk at ${canonicalDir}. ` +
    `Tortie does not treat this as removed.`
  );
}

/**
 * Build the whole command without running it. Returns a refusal instead of
 * throwing, because every one of these is a state the panel has to render.
 */
export async function planSkillsCommand(
  operation: SkillsOperation,
  context: SkillsRunContext = {}
): Promise<SkillsPlanResult> {
  const resolution = await resolveSkillsCli();
  const copy = resolution.active;
  if (copy === null) {
    return {
      refused: true,
      reason: 'no-usable-cli',
      triedPath: resolution.bundledEntryPath,
      message: skillsUnavailableMessage(resolution)
    };
  }

  const scope = scopeOf(operation);
  if (scope === 'project' && (context.projectRoot === undefined || context.projectRoot.length === 0)) {
    return {
      refused: true,
      reason: 'missing-project-root',
      message: 'This is a project operation and no project directory was given, so nothing ran.'
    };
  }

  let commandArgs: string[];
  try {
    commandArgs = commandFor(operation);
  } catch (err) {
    if (err instanceof SkillsCommandError) {
      return { refused: true, reason: 'bad-command', message: `Tortie did not run this: ${err.message}.` };
    }
    throw err;
  }

  const traits = OPERATION_TRAITS[operation.kind];
  const cwd = scope === 'project' ? (context.projectRoot as string) : homedir();
  const argv = [copy.invocation.bin, ...copy.invocation.prefixArgs, ...commandArgs];

  // The guard must read the file the SPAWN would write, so it gets the same
  // environment the spawn gets rather than the app's own. `XDG_STATE_HOME`
  // moves the global lock, and a guard reading a different file than the CLI
  // writes is worse than no guard.
  const env = await skillsEnv(context.env ?? {});
  const lockGuard = traits.writes
    ? checkLocksBeforeWrite({
        scope,
        env,
        ...(context.projectRoot !== undefined ? { projectRoot: context.projectRoot } : {})
      })
    : null;
  if (lockGuard !== null && !lockGuard.safe) {
    return {
      refused: true,
      reason: 'lock-guard',
      lockGuard,
      message: lockGuard.message ?? 'The skills lock file would be discarded, so nothing ran.'
    };
  }

  return {
    refused: false,
    plan: {
      operation,
      kind: operation.kind,
      label: traits.label,
      copy,
      argv,
      commandArgs,
      cwd,
      commandLine: commandLineOf(argv),
      displayCommand: `skills ${commandArgs.map(quote).join(' ')}`,
      timeoutMs:
        context.shortenTimeoutMs !== undefined
          ? Math.min(traits.timeoutMs, Math.max(1, context.shortenTimeoutMs))
          : traits.timeoutMs,
      requiresNetwork: traits.requiresNetwork,
      writes: traits.writes,
      lockGuard
    }
  };
}

/**
 * Run a plan. The ONLY thing in Tortie that spawns the skills CLI.
 *
 * It does NOT run the argv it is handed. It rebuilds the plan from the
 * operation and refuses if the command line has changed. Two things fall out of
 * that, and both matter:
 *
 *  - The lock guard, the CLI resolution and the argument validation all run
 *    again at the moment of execution. A plan is a thing a human looked at, and
 *    a human takes time; the file can move underneath it.
 *  - A plan is a plain object that crosses IPC to be shown in the confirm. If
 *    the argv were trusted on the way back, a forged plan would be a way to run
 *    an arbitrary command. Rebuilding means the only thing that can influence
 *    what runs is the typed operation, which `commands.ts` validates.
 *
 * Never throws: a refusal at this point comes back as `ok: false` with the
 * sentence, so the caller has one shape to render.
 */
export async function executeSkillsPlan(
  plan: SkillsPlan,
  context: SkillsRunContext = {}
): Promise<SkillsRunResult> {
  const started = Date.now();
  const fail = (failure: string, extra: Partial<SkillsRunResult> = {}): SkillsRunResult => ({
    ok: false,
    commandLine: plan.commandLine,
    displayCommand: plan.displayCommand,
    cwd: plan.cwd,
    exitCode: null,
    timedOut: false,
    spawnError: null,
    stderrTail: '',
    stdout: '',
    durationMs: Date.now() - started,
    failure,
    ...extra
  });

  const replanned = await planSkillsCommand(plan.operation, context);
  if (replanned.refused) return fail(replanned.message);
  const fresh = replanned.plan;
  if (fresh.commandLine !== plan.commandLine) {
    return fail(
      `Tortie did not run this, because the command changed after it was shown. ` +
        `The confirmation said ${plan.commandLine} and the command now would be ` +
        `${fresh.commandLine}. Nothing ran.`
    );
  }

  const env = { ...(await skillsEnv(context.env ?? {})), ...fresh.copy.invocation.env };
  const run = await runGuarded(fresh.argv[0] as string, fresh.argv.slice(1), {
    timeoutMs: fresh.timeoutMs,
    maxOutputBytes: MAX_OUTPUT_BYTES,
    cwd: fresh.cwd,
    env
  });

  const stderrTail = tail(run.stderr, STDERR_TAIL_LINES);
  const durationMs = Date.now() - started;

  if (run.spawnError !== null) {
    return {
      ...fail(`Tortie could not start the skills CLI. It ran ${plan.commandLine} and got ${run.spawnError}.`),
      spawnError: run.spawnError,
      durationMs
    };
  }
  if (run.timedOut) {
    return {
      ...fail(
        `Tortie stopped the command after ${Math.round(plan.timeoutMs / 1000)} seconds. ` +
          `It ran ${plan.commandLine}. Whatever it had already written is on disk, so the ` +
          `list has been read again.`
      ),
      timedOut: true,
      stderrTail,
      stdout: run.stdout,
      durationMs
    };
  }
  if (run.code !== 0) {
    return {
      ...fail(
        `The skills CLI exited with code ${run.code ?? 'none'}. It ran ${plan.commandLine}.` +
          (stderrTail.length > 0 ? `\n${stderrTail}` : '')
      ),
      exitCode: run.code,
      stderrTail,
      stdout: run.stdout,
      durationMs
    };
  }

  // Remove only: exit 0 with the folder still on disk is the silent no-op
  // class, and it comes back as a visible failure rather than a closed dialog.
  // The canonical directory is `<home or cwd>/.agents/skills/<name>`, the same
  // join the CLI performs, and `fresh.cwd` is the home for a global remove and
  // the project root for a project one.
  if (fresh.operation.kind === 'remove') {
    const residue = removeResidueFailure(
      fresh.operation.skill,
      join(fresh.cwd, '.agents', 'skills', fresh.operation.skill)
    );
    if (residue !== null) {
      return {
        ...fail(residue),
        exitCode: 0,
        stderrTail,
        stdout: run.stdout,
        durationMs
      };
    }
  }

  return {
    ok: true,
    commandLine: plan.commandLine,
    displayCommand: plan.displayCommand,
    cwd: plan.cwd,
    exitCode: 0,
    timedOut: false,
    spawnError: null,
    stderrTail,
    stdout: run.stdout,
    durationMs,
    failure: null
  };
}

/** Plan and run in one call. For read-only operations and for tests. */
export async function runSkillsOperation(
  operation: SkillsOperation,
  context: SkillsRunContext = {}
): Promise<{ readonly refusal: SkillsRefusal | null; readonly result: SkillsRunResult | null }> {
  const planned = await planSkillsCommand(operation, context);
  if (planned.refused) return { refusal: planned, result: null };
  return { refusal: null, result: await executeSkillsPlan(planned.plan, context) };
}

/**
 * Run `skills ls -g --json` and report whether its shape is still the one
 * Tortie was written against. A DIAGNOSTIC, not a data path: the panel's list
 * is a filesystem read. This is what a pin bump adds a probe against, and what
 * the "the output format changed under us" row of the failure table is driven
 * through.
 */
export async function probeListShape(
  context: SkillsRunContext = {}
): Promise<{
  readonly probe: SkillsListProbe;
  readonly result: SkillsRunResult | null;
  readonly refusal: SkillsRefusal | null;
}> {
  const { refusal, result } = await runSkillsOperation({ kind: 'listProbe' }, context);
  if (result === null || !result.ok) {
    return {
      probe: {
        parsed: false,
        entries: 0,
        fields: [],
        problem: result?.failure ?? refusal?.message ?? 'the command did not run'
      },
      result,
      refusal
    };
  }
  return { probe: parseSkillsListJson(result.stdout), result, refusal: null };
}
