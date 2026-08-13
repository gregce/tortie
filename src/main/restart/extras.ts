/**
 * Recovering the launch flags a session was started with (Phase 19 item 8).
 *
 * THE PROBLEM. Restart rebuilds a session, and the flags the user chose at
 * create time (`--model`, `--add-dir`, a bypass switch they turned on in
 * Settings) are not stored as a field anywhere. The manifest stores the whole
 * launch argv instead, with the generated parts mixed in: the resolved binary
 * path, the registry's own arguments, a pre-assigned conversation id, and for
 * claude a `--settings` path that is keyed to THAT session's id and must not
 * be reused. Passing the recorded argv back into a create would hand the new
 * session the old session's conversation id, which is the one mistake that
 * would silently open the wrong transcript.
 *
 * THE APPROACH. Rebuild the argv the same launch would have produced with NO
 * extras, then take what is left. The rebuild uses the same two registry
 * functions the create path uses, so the two can never drift: a change to how
 * argv is composed changes both sides at once, and the round-trip test in
 * __tests__/extras.test.ts fails if it does not.
 *
 * WHY TWO CANDIDATE SHAPES. Most agents launch with `registryLaunchArgv`,
 * where extras are trailing. Cursor is different: its id comes from a side
 * command, so `resolveLaunchSpec` rewrites its launch argv to the RESUME
 * shape, and a resume argv may put extras leading (deepseek's rule, applied
 * from registry data). Both shapes are tried and the one that matches wins.
 *
 * WHEN NOTHING MATCHES the answer is null, not an empty array. A row written
 * by an older build, an agent that has left the registry, or an argv a human
 * edited are all cases where "there were no flags" would be a guess. The
 * caller restarts without flags and says so in the log rather than claiming
 * the session came back exactly as it was.
 */

import type { LaunchableAgentId } from '@shared/types';
import { claudeHookSettingsPath } from '../activity/hooks';
import {
  getLaunchableEntry,
  registryLaunchArgv,
  registryResumeArgv
} from '../agents/registry';
import type { ManifestSessionRecord } from '../manifest/store';

/** Does `argv` begin with every element of `prefix`, in order? */
function startsWith(argv: readonly string[], prefix: readonly string[]): boolean {
  if (prefix.length > argv.length) return false;
  return prefix.every((part, i) => argv[i] === part);
}

/** Does `argv` end with every element of `suffix`, in order? */
function endsWith(argv: readonly string[], suffix: readonly string[]): boolean {
  if (suffix.length > argv.length) return false;
  const from = argv.length - suffix.length;
  return suffix.every((part, i) => argv[from + i] === part);
}

/**
 * The agent's own argv, unwrapped from SpecStory when it was captured.
 *
 * Under capture the recorded `argv` is the wrapper's — `specstory run
 * <provider> … -c "<the agent command>"` — and re-splitting that `-c` string
 * is the lossy direction, which is exactly why `specstory.agentArgv` is
 * recorded beside it.
 */
function agentArgvOf(rec: ManifestSessionRecord): readonly string[] {
  const inner = rec.specstory?.agentArgv;
  return inner !== undefined && inner.length > 0 ? inner : rec.argv;
}

/**
 * Remove the `--settings <path>` pair main injects for claude's hook channel.
 *
 * It is matched by its exact path, which is derived from the session id, so a
 * `--settings` the USER passed is left alone and comes back as one of their
 * flags. `withClaudeSettingsFlag` inserts the pair directly after the binary
 * and skips injection entirely when the argv already has one, so there is
 * never more than one pair to consider and it is always at index 1.
 */
function withoutHookSettings(
  argv: readonly string[],
  sessionId: string
): readonly string[] {
  if (argv[1] !== '--settings') return argv;
  if (argv[2] !== claudeHookSettingsPath(sessionId)) return argv;
  return [...argv.slice(0, 1), ...argv.slice(3)];
}

/**
 * The extra flags this row's session was launched with, or null when they
 * cannot be proven.
 *
 * Never throws. An agent that is no longer in the registry returns null.
 */
export function recoverLaunchExtras(
  rec: ManifestSessionRecord
): string[] | null {
  const argv = withoutHookSettings(agentArgvOf(rec), rec.id);
  const bin = argv[0];
  if (bin === undefined) return null;

  // A shell pane has no registry entry and no generated arguments at all:
  // everything after the shell itself is the user's.
  if (rec.agent === 'shell') return argv.slice(1);

  // Narrowed by the shell early-return above, and by getLaunchableEntry
  // below, which throws for anything the registry cannot launch.
  const agent = rec.agent as LaunchableAgentId;
  try {
    getLaunchableEntry(agent);
  } catch {
    return null; // not a launchable id — do not guess
  }

  // Shape 1, the ordinary launch: [bin, ...registry args, ...pre-assign,
  // ...extras]. The id is passed so the pre-assign pair is rebuilt in place;
  // it is ignored for every agent that does not take one.
  const launch = registryLaunchArgv(agent, [], bin, rec.agentSessionId);
  if (startsWith(argv, launch)) return argv.slice(launch.length);

  // Shape 2, cursor: the launch argv IS a resume argv, and a resume argv may
  // carry its extras in front of the template rather than behind it.
  const id = rec.agentSessionId;
  if (id !== undefined && id.length > 0) {
    const resume = registryResumeArgv(agent, id, [], bin);
    if (resume.length > 0) {
      const position = getLaunchableEntry(agent).resume.resumeExtrasPosition;
      if (position === 'leading') {
        const tail = resume.slice(1);
        if (argv[0] === resume[0] && endsWith(argv, tail)) {
          return argv.slice(1, argv.length - tail.length);
        }
      } else if (startsWith(argv, resume)) {
        return argv.slice(resume.length);
      }
    }
  }

  return null;
}
