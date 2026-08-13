/**
 * The command line the confirm shows, and the guard that refuses to show a
 * malformed one.
 *
 * Two jobs, and the second one is the reason this file is not just a `join`.
 *
 * The skills CLI parser has three traps, read out of `dist/cli.mjs` line 5045.
 * A command that falls into any of them RUNS, exits 0, and does something other
 * than what was asked. So an exit code is not evidence and the shape has to be
 * checked before the command is ever put in front of a person to approve.
 *
 *  1. The source must come immediately after `add`. `-s` and `-a` are variadic
 *     and greedily consume every following argument that does not begin with
 *     `-`, so a source placed after either flag is swallowed as a skill name or
 *     an agent name.
 *  2. The `--flag=value` form matches nothing. The parser compares whole flag
 *     tokens, so `--skill=foo` matches no flag, begins with `-` so it is not
 *     read as a source, and is discarded without an error. The command then
 *     runs with a wider meaning than intended.
 *  3. `-a '*'` works for `add` and fails for `remove`. `removeCommand` has no
 *     wildcard branch, so it reports `Invalid agents: *` and exits 1.
 *
 * `checkPlanShape` returns the problems it found. The install dialog will not
 * render its primary control while that list is non-empty, and no
 * acknowledgement can clear it, because a malformed command is not a risk the
 * user can accept on Tortie's behalf.
 */

import type { InstallPlan } from './model';
import { isSecretKey, maskInlineAssignment, MASK } from './secrets';

/** Flags that swallow every following non-flag argument. */
const VARIADIC = new Set(['-s', '--skill', '-a', '--agent']);

export interface PlanProblem {
  /** Stable id, so a test names the trap rather than matching prose. */
  code:
    | 'source-after-variadic'
    | 'equals-form'
    | 'wildcard-remove'
    | 'missing-source'
    | 'missing-yes'
    | 'empty-variadic'
    | 'no-agents';
  message: string;
}

/**
 * Check a plan's argv against the three parser traps plus the two shapes that
 * would hang the child process (a missing `-y`) or install nothing (an empty
 * `-s` group).
 */
export function checkPlanShape(plan: InstallPlan): PlanProblem[] {
  const problems: PlanProblem[] = [];
  const argv = plan.argv;
  const verb = argv[0] ?? '';

  for (const token of argv) {
    if (token.startsWith('--') && token.includes('=')) {
      problems.push({
        code: 'equals-form',
        message: `"${token}" uses the --flag=value form, which this CLI discards without an error.`
      });
    }
  }

  if (verb === 'add') {
    const source = argv[1];
    if (source === undefined || source.startsWith('-')) {
      problems.push({
        code: 'missing-source',
        message: 'The source must come immediately after "add".'
      });
    }
    // Trap 1, stated as a position rather than an absence: any bare word that
    // is not inside a variadic group is a source that landed in the wrong slot.
    let group: string | null = null;
    for (let i = 2; i < argv.length; i += 1) {
      const token = argv[i] ?? '';
      if (token.startsWith('-')) {
        group = VARIADIC.has(token) ? token : null;
        continue;
      }
      if (group === null) {
        problems.push({
          code: 'source-after-variadic',
          message: `"${token}" sits after a flag that will swallow it. The source belongs immediately after "add".`
        });
      }
    }
  }

  if (verb === 'remove' || verb === 'rm') {
    for (let i = 0; i < argv.length; i += 1) {
      if ((argv[i] === '-a' || argv[i] === '--agent') && argv[i + 1] === '*') {
        problems.push({
          code: 'wildcard-remove',
          message:
            '"remove" has no wildcard branch. Use --all, or name every agent.'
        });
      }
    }
  }

  if (
    verb === 'add' ||
    verb === 'remove' ||
    verb === 'rm' ||
    verb === 'update'
  ) {
    if (!argv.includes('-y') && !argv.includes('--yes')) {
      problems.push({
        code: 'missing-yes',
        message:
          'Without -y the CLI waits for an answer on a stream Tortie never allocates.'
      });
    }
  }

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i] ?? '';
    if (!VARIADIC.has(token)) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('-')) {
      problems.push({
        code: 'empty-variadic',
        message: `"${token}" was given nothing to act on.`
      });
    }
  }

  if (plan.operation === 'install' && plan.agents.length === 0) {
    problems.push({ code: 'no-agents', message: 'No agent was chosen.' });
  }

  return problems;
}

/**
 * The short readable form, for a heading: `skills add owner/repo -g -y …`.
 * It is the same tokens as the full form with the two paths collapsed, so the
 * two can never describe different commands.
 */
export function formatShortCommand(plan: InstallPlan): string {
  return ['skills', ...plan.argv]
    .map(quote)
    .map(maskInlineAssignment)
    .join(' ');
}

/**
 * The full child-process command line, which is what the confirm shows and
 * what the copy control copies. It names the environment, the Electron binary
 * and the CLI entry point, because that is the process that will actually run
 * and a shortened form would be a second description of it.
 */
export function formatCommandLine(plan: InstallPlan): string {
  // `ELECTRON_RUN_AS_NODE=1` is named first because it rides on every bundled
  // invocation and a reader checking this line against the command table has to
  // see it. It is then filtered out of the copy's own additions, or the line
  // printed it twice, which a Phase 22 capture caught.
  const env = Object.entries(plan.addedEnv)
    .filter(([k]) => k !== 'ELECTRON_RUN_AS_NODE')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${isSecretKey(k) ? MASK : quote(v)}`);

  // The arguments stay on ONE line. They are the part a reader checks against
  // the command table, and splitting them across eleven lines turns an
  // inspectable command into a wall.
  const lines = [
    [...['ELECTRON_RUN_AS_NODE=1', ...env]].join(' '),
    quote(plan.executable),
    // An empty entry point is a copy of the CLI found on PATH, which takes its
    // arguments directly. It contributes no token to the spawn, so it must
    // contribute no token here either, or the line shown and the line run stop
    // being the same command.
    ...(plan.cliPath === '' ? [] : [quote(plan.cliPath)]),
    plan.argv.map(quote).map(maskInlineAssignment).join(' ')
  ];
  return lines.join(' \\\n  ');
}

/** POSIX single-quoting, so a copied line pastes into a shell unchanged. */
export function quote(token: string): string {
  if (token.length > 0 && /^[A-Za-z0-9_@%+=:,./-]+$/.test(token)) return token;
  return `'${token.replace(/'/g, `'\\''`)}'`;
}
