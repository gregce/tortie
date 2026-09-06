/**
 * How a conversation id becomes the argv a restore runs (Phase 215 extracted
 * it; every rule in it is older than this phase).
 *
 * It lived inside the harvest's own `.then()` in ./id-harvest.ts and had
 * exactly one caller. Phase 215's boot repair is the second: a row whose id
 * moves from a sub agent thread to the thread that spawned it has to have its
 * `resume_argv` recomposed the SAME way the harvest would have composed it,
 * or a repaired row runs a different command from a row that was right the
 * first time. Two copies of this is how they come to disagree, so it is one
 * function with two callers rather than two blocks that look alike.
 *
 * THE THREE RULES IT CARRIES, unchanged:
 *
 *  1. Resume with the session's own RECORDED ABSOLUTE binary, never a bare
 *    name and never today's PATH.
 *  2. Under SpecStory capture, `rec.argv[0]` is the WRAPPER and the agent's
 *     own argv lives in the capture record, so the inner resume is composed
 *     from that and the wrapper is put back around it. A harvested session
 *     then restores captured exactly like a pre-assigned one.
 *  3. AN ID-LESS ARGV IS NEVER PERSISTED. `registryResumeArgv` answers empty
 *     when the registry cannot compose one, and an empty answer is a refusal
 *     rather than a resume that attaches to whatever conversation is newest.
 */

import type { LaunchableAgentId } from '@shared/types';
import { agentBinaryName, registryResumeArgv } from '../agents';
import type { ManifestSessionRecord } from '../manifest';
import { wrapWithRecord } from '../specstory';

export interface ComposedResume {
  /** The argv to persist. Never empty. */
  argv: string[];
  /**
   * TRUE when the session was captured and the wrapper could not be rebuilt,
   * so the armed command runs the agent directly. The caller says it out loud:
   * the conversation is what matters, but the capture would otherwise stop at
   * the restore in silence.
   */
  captureLost: boolean;
}

/**
 * The resume argv for this row and this conversation id, or null when the
 * registry cannot compose one.
 */
export function composeResumeArgv(
  rec: ManifestSessionRecord,
  agent: LaunchableAgentId,
  sessionId: string,
  extraArgs: readonly string[]
): ComposedResume | null {
  const capture = rec.specstory;
  const innerBin =
    capture?.agentArgv[0] ?? rec.argv[0] ?? agentBinaryName(agent);
  // `registryResumeArgv` THROWS for an agent the registry holds but cannot
  // launch in a session, e.g. cursoride, whose resume is a row written into
  // another program's database rather than a command. The harvest path never
  // meets that case because `agentRescuesId` filters it out first; the
  // confirmed-id admission and the boot repair have no such filter in front of
  // them, because the agent column is whatever the row records. A throw would
  // land inside something nobody is awaiting, so it is an answer here.
  let innerResume: string[];
  try {
    innerResume = registryResumeArgv(agent, sessionId, extraArgs, innerBin);
  } catch {
    return null;
  }
  if (innerResume.length === 0) return null;
  if (capture?.enabled !== true) return { argv: innerResume, captureLost: false };
  const rewrapped = wrapWithRecord(capture, innerResume);
  return rewrapped !== null
    ? { argv: rewrapped, captureLost: false }
    : { argv: innerResume, captureLost: true };
}
