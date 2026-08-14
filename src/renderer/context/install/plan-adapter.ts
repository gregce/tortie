/**
 * The adapter between main's `SkillsPlan` and the surface's `InstallPlan`, and
 * the check that the two renderings of one command line can never disagree.
 *
 * ## Why the two shapes exist
 *
 * Main builds `SkillsPlan` because it owns the CLI resolution, the lock guard
 * and the argv. The surface takes `InstallPlan` because the confirm has to
 * render the pieces separately: the executable, the entry point, the added
 * environment and the arguments each get their own place on the line, and the
 * agent list and the scope are what the gate reasons about. `InstallPlan`'s own
 * comment said "Main builds this", and main did not, so the confirm had no
 * producer and the install path had no caller.
 *
 * ## The rule that matters
 *
 * There are now two pieces of code that render one command line:
 * `plan.commandLine` in main and `formatCommandLine` in the surface. A confirm
 * that shows one thing while another runs is worse than no confirm, so this
 * module compares them TOKEN BY TOKEN and reports a mismatch. A mismatch is a
 * HARD blocker in the install gate. It cannot be acknowledged away, because a
 * command line the user did not actually see is not a command line the user
 * approved.
 *
 * The comparison is on tokens rather than on the two formatted strings on
 * purpose. The formatted strings differ legitimately: main quotes for a shell
 * and the surface masks credential-shaped arguments before it prints them. The
 * tokens are what will be passed to `execvp`, and those must be identical.
 */

import type { ContextCategory } from '../model';
import type { SkillsOperation, SkillsPlan } from '@shared/skills';
import type { InstallOperation, InstallPlan } from '../surface/model';

export interface AdaptedPlan {
  /** What the surface renders and what the gate reasons about. */
  plan: InstallPlan;
  /** Null when the two renderings agree. A sentence when they do not. */
  mismatch: string | null;
}

/** The CLI's kinds, in the surface's vocabulary. */
function operationOf(kind: SkillsPlan['kind']): InstallOperation {
  switch (kind) {
    case 'install':
      return 'install';
    case 'remove':
      return 'remove';
    case 'update':
      return 'update';
    case 'restoreProject':
      return 'restore';
    default:
      return 'enumerate';
  }
}

function sourceOf(operation: SkillsOperation): string {
  if (operation.kind === 'install' || operation.kind === 'enumerate') return operation.source;
  if (operation.kind === 'remove') return operation.skill;
  if (operation.kind === 'update') return operation.skill ?? '';
  return '';
}

function scopeOf(operation: SkillsOperation): 'global' | 'project' {
  if (operation.kind === 'install') return operation.scope;
  if (operation.kind === 'remove') return operation.scope ?? 'global';
  if (operation.kind === 'restoreProject') return 'project';
  return 'global';
}

function agentsOf(operation: SkillsOperation): string[] {
  if (operation.kind === 'install') return [...operation.agents];
  if (operation.kind === 'remove' && operation.agent !== undefined) return [operation.agent];
  return [];
}

/**
 * Turn one plan from main into the plan the surface shows.
 *
 * `argv` on `InstallPlan` is everything AFTER the entry point, so the spawned
 * command is `executable cliPath ...argv`. Main's `argv` is executable-first and
 * carries the invocation's prefix arguments in the middle, so the split is
 * recovered by length rather than by guessing which token is a path.
 */
export function toInstallPlan(
  skillsPlan: SkillsPlan,
  options: { displayName?: string; category?: ContextCategory } = {}
): AdaptedPlan {
  const full = [...skillsPlan.argv];
  const commandArgs = [...skillsPlan.commandArgs];
  const executable = full[0] ?? '';
  const prefix = full.slice(1, Math.max(1, full.length - commandArgs.length));
  const category: ContextCategory = options.category ?? 'skill';

  const plan: InstallPlan = {
    id: `${skillsPlan.kind}:${skillsPlan.commandLine}`,
    operation: operationOf(skillsPlan.kind),
    category,
    displayName: options.displayName ?? sourceOf(skillsPlan.operation),
    source: sourceOf(skillsPlan.operation),
    scope: scopeOf(skillsPlan.operation),
    executable,
    cliPath: prefix[0] ?? '',
    argv: commandArgs,
    cwd: skillsPlan.cwd,
    agents: agentsOf(skillsPlan.operation),
    addedEnv: { ...skillsPlan.copy.invocation.env }
  };

  return { plan, mismatch: commandMismatch(skillsPlan, plan) };
}

/**
 * The tokens the surface's plan will produce, in spawn order.
 *
 * An empty `cliPath` is a copy of the CLI found on PATH, which needs no entry
 * point in front of its arguments. It contributes no token, and
 * `formatCommandLine` drops it for the same reason.
 */
export function planTokens(plan: InstallPlan): string[] {
  return [
    plan.executable,
    ...(plan.cliPath === '' ? [] : [plan.cliPath]),
    ...plan.argv
  ];
}

/**
 * Compare what the surface will show against what main will run. Null when they
 * agree; a sentence naming both when they do not.
 */
export function commandMismatch(
  skillsPlan: SkillsPlan,
  plan: InstallPlan
): string | null {
  const shown = planTokens(plan);
  const running = [...skillsPlan.argv];
  if (shown.length === running.length && shown.every((token, i) => token === running[i])) {
    return null;
  }
  return (
    'Tortie will not offer this install, because the command it would show is ' +
    `not the command it would run. It would show ${shown.join(' ')} and it would ` +
    `run ${running.join(' ')}. Nothing ran.`
  );
}
