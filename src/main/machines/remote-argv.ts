/**
 * Where one machine keeps one program (Phase 72, M5, research 51 section 4.3,
 * rewritten in Phase 84 item 10).
 *
 * ## What Phase 84 changed, and it is the whole reason this file moved
 *
 * Until this phase the question was asked once, as
 * `"$SHELL" -lc 'command -v <name>'`, and the login shell's answer was the only
 * answer. MEASURED on the operator's Mac Pro, 2026-08-18:
 *
 * | What was read | What it said |
 * | --- | --- |
 * | The login shell's list of places it looks for programs | ten folders |
 * | The list a pane on that machine gets | `/usr/bin:/bin:/usr/sbin:/sbin` |
 * | Where `claude` actually is | `~/.local/bin/claude` |
 * | `"$SHELL" -lc 'command -v claude'` | nothing at all |
 *
 * So Tortie refused to create a claude session on a machine where claude is
 * installed and two of Tortie's own claude sessions had been running for days.
 * The refusal happened before anything was written, so there was no pane, no
 * row and no way forward from inside the app.
 *
 * `../tmux/resolve.ts` answers the same question on this Mac by walking THREE
 * lists rather than one:
 *
 * ```
 *   1. the captured login shell PATH          getUserPath()
 *   2. the agent entry's own extraProbeDirs   probeFirst
 *   3. the install dirs a GUI app misses      extraBinDirs()
 * ```
 *
 * This module is that walk, one machine further away, with that machine's own
 * answers in every list. Nothing is hardcoded. List 1 is what
 * `./remote-path.ts` already captured from that machine at connect. Lists 2 and
 * 3 are compiled constants with that machine's own `$HOME` in front of them,
 * and that home comes from the machine's own `machine-facts` answer.
 *
 * ## What is skipped rather than dropped
 *
 * An `extraProbeDirs` entry that is not a plain folder is not sent. That is any
 * entry holding `$`, `*`, `?` or `[`, e.g. codex's `$NVM_BIN` and
 * `~/.nvm/versions/node/*&#47;bin`. Tortie counts them and the count is in the
 * error detail, so a person can see what was not searched. A glob expanded on
 * another computer is a command deciding its own arguments, and this product
 * does not do that.
 *
 * ## Why the answer is recorded, and what Phase 84 does send
 *
 * The manifest is the source of truth for restore, and CLAUDE.md's rule is that
 * `argv` and `resume_argv` always use absolute binary paths. A row for a session
 * on another machine has to obey that rule with THAT MACHINE'S path, because a
 * path read on this Mac names nothing over there. So the captured path goes into
 * the row's `argv[0]` and into the recovery contract's `bin`, both bound to the
 * row's `machine_id`.
 *
 * IT ALSO GOES ON THE LAUNCH LINE NOW, and that is a reversal Phase 84 made
 * with a measurement. An earlier draft of this phase kept the bare name on the
 * far side and put the folder holding the program on the pane's own PATH with
 * one `-e PATH=` pair. Step 17c of `build/probe-execplane.mjs` measured that
 * pair and it does not reach the pane: tmux takes a pane's PATH from the server
 * rather than from the session environment, and `-e FOO=` on the same line DID
 * reach the pane while `-e PATH=` did not. So the absolute path is what both
 * `./remote-sessions.ts` and `./remote-restore.ts` send as `argv[0]`. The cost
 * is written out in full on `remoteCreate` in `./remote-sessions.ts`, and it is
 * that a `pkill -f` over the resolved path RUN ON THAT MACHINE now matches
 * every durable Tortie agent on it.
 *
 * The recorded path is therefore two things at once. It is the instruction the
 * launch uses, and it is still the evidence {@link assertArgvBelongsToMachine}
 * compares before any restore composes anything, so a path read on one machine
 * can never launch on another.
 *
 * ## What is refused rather than quoted
 *
 * A bare name that is not a plain program name. Every agent id Tortie can
 * launch, compiled or configured, is plain by construction, so nothing
 * legitimate is refused here.
 */

import { join } from 'node:path';
import { gmuxError } from '../errors';
import { extraBinDirsFor } from '../tmux/resolve';
import { REMOTE_PATH_MARKER } from './carriage';
import { machineGeneration, type RemoteMachineContext } from './context';
import { execRemoteShell } from './exec-plane';
import {
  RESTORE_WRONG_MACHINE,
  noRemoteProgramRefusal
} from './remote-copy';
// Phase 84. That machine's own home directory, read once per connection. It is
// the one value lists 2 and 3 are composed against, and Tortie never composes a
// home path for another computer out of anything but the machine's own answer.
import { remoteMachineHome } from './remote-image';
import { runRemoteRead } from './remote-run';
import { REMOTE_SCRIPT_EMPTY } from './remote-scripts';

/** The refusal sentence, re-exported so one import reaches the whole seam. */
export { noRemoteProgramRefusal };

const REMOTE_ARGV_RE = /__TORTIE_PATH__(.*?)__TORTIE_PATH__/s;

/**
 * The characters a bare program name may hold.
 *
 * Letters, digits, dot, underscore, plus and minus. No slash, because a bare
 * name is what the machine's own search list resolves and a path is not that. No
 * quote, no space and no shell metacharacter, because the name crosses as a
 * positional parameter and a name that could end a word is a name this product
 * refuses rather than escapes.
 */
const PLAIN_PROGRAM_NAME = /^[A-Za-z0-9._+-]+$/;

/**
 * How long the far side gets to answer.
 *
 * 10,000 ms, the same budget {@link REMOTE_PATH_TIMEOUT_MS} gives the same
 * machine on the same connection. The script tests a list of folders with one
 * `[ -x ]` each and does no more work than that.
 */
export const REMOTE_ARGV_TIMEOUT_MS = 10_000;

/**
 * The characters that make an entry something other than a plain folder.
 *
 * `$` is a value another computer would expand. The next three are a glob
 * another computer would expand. Both are a command deciding its own arguments.
 *
 * PHASE 109 ADDED THE COLON. Every folder list this module sends is JOINED
 * WITH COLONS, in {@link findRemoteProgram} and in the per record lists the
 * batched scan composes, and `pathTemplate` in `src/main/config/overlay.ts`
 * permits a colon in a configured path. So an entry holding one used to split
 * into two wrong folders on the far side. Research 58 section 2.5 is the
 * record of that, and the fix is to refuse the entry whole and count it, the
 * same answer a glob gets.
 */
const NOT_A_PLAIN_FOLDER = /[$*?[:]/;

/**
 * The stand in home used when a machine did not state one.
 *
 * Every folder composed against it is dropped, so a machine that would not say
 * where its home is contributes only the folders that do not depend on one,
 * being `/opt/homebrew/bin` and `/usr/local/bin`. Tortie does not guess at
 * `/Users/<somebody>` or `/home/<somebody>` on another computer.
 */
const NO_HOME = '/__tortie-no-home__';

// ---------------------------------------------------------------------------
// The lists, composed. Pure.
// ---------------------------------------------------------------------------

/**
 * One `extraProbeDirs` entry, rebased on that machine's home, or null. PURE.
 *
 * Null means the entry was not sent. That is an entry that would be expanded on
 * the other computer, an entry that is neither absolute nor `~/` anchored, and
 * a `~/` entry on a machine that stated no home.
 */
export function rebaseRemoteDir(entry: string, home: string): string | null {
  const dir = entry.trim();
  if (dir.length === 0) return null;
  if (NOT_A_PLAIN_FOLDER.test(dir)) return null;
  if (dir === '~') return home.length > 0 ? home : null;
  if (dir.startsWith('~/')) {
    return home.length > 0 ? join(home, dir.slice(2)) : null;
  }
  return dir.startsWith('/') ? dir : null;
}

/** The folders one program search walks, and how many entries it would not send. */
export interface RemoteSearchDirs {
  /** Sources 2 and 3, in that order, deduped and never empty of meaning. */
  readonly dirs: readonly string[];
  /** How many `extraProbeDirs` entries were not plain folders. */
  readonly skipped: number;
}

/**
 * Sources 2 and 3 for one agent on one machine. PURE.
 *
 * The order is `resolveBinary`'s order, being the entry's own folders and then
 * the install folders Tortie knows, so the file a search finds here is the file
 * a search would find on this Mac for the same agent.
 */
export function remoteSearchDirs(
  probeDirs: readonly string[],
  home: string
): RemoteSearchDirs {
  const out: string[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const entry of probeDirs) {
    const dir = rebaseRemoteDir(entry, home);
    if (dir === null) {
      skipped += 1;
      continue;
    }
    if (seen.has(dir)) continue;
    seen.add(dir);
    out.push(dir);
  }
  const leaves =
    home.length > 0
      ? extraBinDirsFor(home)
      : extraBinDirsFor(NO_HOME).filter((dir) => !dir.startsWith(NO_HOME));
  for (const dir of leaves) {
    if (seen.has(dir)) continue;
    seen.add(dir);
    out.push(dir);
  }
  return { dirs: out, skipped };
}

/** How many distinct folders a walk over these two lists would test. PURE. */
export function remoteSearchCount(
  loginPath: string,
  installDirs: readonly string[]
): number {
  const seen = new Set<string>();
  for (const dir of loginPath.split(':')) {
    if (dir.length > 0) seen.add(dir);
  }
  for (const dir of installDirs) {
    if (dir.length > 0) seen.add(dir);
  }
  return seen.size;
}

// ---------------------------------------------------------------------------
// The answer, parsed. Pure.
// ---------------------------------------------------------------------------

/** What one machine said about one program. */
export interface RemoteProgramAnswer {
  /** The absolute path of the file, on that machine. */
  readonly path: string;
  /** The folder holding it, which is what goes on the pane's own PATH. */
  readonly dir: string;
  /** Which of the two lists it was found in. */
  readonly source: 'path' | 'install';
  /** How many folders the walk tested. */
  readonly searched: number;
  /** How many entries were not sent because they were not plain folders. */
  readonly skipped: number;
}

/**
 * One `program-find` payload into the two values, or null. PURE.
 *
 * The list word comes first and the path is the rest of the line, because a
 * folder on another computer can hold a space in its name. `none none` and
 * anything that is not an absolute path are one answer to the caller, being
 * that the machine did not find the program.
 */
export function parseProgramFind(
  payload: string
): { source: 'path' | 'install'; path: string } | null {
  const line = payload.split('\n')[0]?.trim() ?? '';
  const at = line.indexOf(' ');
  if (at <= 0) return null;
  const source = line.slice(0, at);
  const path = line.slice(at + 1).trim();
  if (source !== 'path' && source !== 'install') return null;
  if (path === REMOTE_SCRIPT_EMPTY || !path.startsWith('/')) return null;
  return { source, path };
}

// ---------------------------------------------------------------------------
// The read
// ---------------------------------------------------------------------------

/**
 * Find ONE program on ONE machine, by walking that machine's own three lists.
 *
 * A read, so it starts nothing and writes nothing on either computer.
 *
 * @throws GmuxError INVALID_INPUT when the name is not a plain program name,
 *   and AGENT_NOT_ON_MACHINE when the walk found nothing. Both are refusals
 *   rather than fallbacks: a guessed path is how the wrong copy of a program
 *   runs, and the operator would have no way to see that happening. The second
 *   carries its own code (Phase 109, the `AGENT_INTERPRETER_MISSING`
 *   precedent) so the create sheet can draw it as a full block naming the
 *   machine instead of one generic error line, and so `remoteBinFor` can fold
 *   a positive absent back into the per machine agent map.
 */
export async function findRemoteProgram(
  ctx: RemoteMachineContext,
  bare: string,
  probeDirs: readonly string[] = []
): Promise<RemoteProgramAnswer> {
  // Phase 109, fix 5. The sentence names the label the person typed, and the
  // id only for a context written before the label crossed.
  const label = ctx.label ?? ctx.machineId;
  if (!PLAIN_PROGRAM_NAME.test(bare)) {
    throw gmuxError(
      'INVALID_INPUT',
      noRemoteProgramRefusal(bare, label, 0),
      `${JSON.stringify(bare)} is not a plain program name, so Tortie will ` +
        `not ask ${ctx.machineId} about it`
    );
  }
  const loginPath = machineGeneration(ctx.machineId).remotePath ?? '';
  const home = await remoteMachineHome(ctx);
  const { dirs, skipped } = remoteSearchDirs(probeDirs, home);
  const searched = remoteSearchCount(loginPath, dirs);
  const answer = await runRemoteRead(
    ctx,
    'program-find',
    [bare, loginPath, dirs.join(':')],
    { timeoutMs: REMOTE_ARGV_TIMEOUT_MS }
  );
  const found = parseProgramFind(answer.payload);
  if (found === null) {
    throw gmuxError(
      'AGENT_NOT_ON_MACHINE',
      noRemoteProgramRefusal(bare, label, searched),
      `${ctx.machineId} was asked about ${bare} in ${String(searched)} ` +
        `folder(s) and found none. It looked in ${loginPath || '(no login list)'} ` +
        `and then in ${dirs.join(':') || '(no install folders)'}. ` +
        `${String(skipped)} folder(s) the agent names were not searched, ` +
        `because they are not plain folders and Tortie does not expand a ` +
        `pattern on another computer.`
    );
  }
  const at = found.path.lastIndexOf('/');
  return {
    path: found.path,
    dir: at > 0 ? found.path.slice(0, at) : '/',
    source: found.source,
    searched,
    skipped
  };
}

/**
 * The absolute path alone, for a caller that only wants to know it is there.
 *
 * `./remote-restore.ts` asks it before it composes a restore, and
 * `./remote-smoke.ts` asks it to drive the read end to end. Neither needs the
 * folder or the counts.
 */
export async function captureRemoteArgv(
  ctx: RemoteMachineContext,
  bare: string,
  probeDirs: readonly string[] = []
): Promise<string> {
  return (await findRemoteProgram(ctx, bare, probeDirs)).path;
}

/**
 * The command Phase 72 sent, kept because two probes still print its answer.
 *
 * NOTHING IN PRODUCTION CALLS IT. It is the one question measurement showed to
 * be too narrow, and `build/probe-real-unknowns.mjs` prints what it answers on
 * a real machine beside what the walk above answers, so the defect this phase
 * closed stays visible rather than becoming a story.
 */
export function remoteWhichCommand(bare: string): string {
  return (
    `"$SHELL" -lc 'printf ${REMOTE_PATH_MARKER}%s${REMOTE_PATH_MARKER} ` +
    `"$(command -v ${bare} 2>/dev/null)"'`
  );
}

/** The answer to {@link remoteWhichCommand}, or null. PURE. */
export function parseRemoteWhich(text: string): string | null {
  const match = REMOTE_ARGV_RE.exec(text);
  if (match === null) return null;
  const value = (match[1] ?? '').trim();
  if (value.length < 2) return null;
  if (!value.startsWith('/')) return null;
  // One line only. A printf of a multi line value means the shell answered
  // something other than one path and Tortie will not pick a line out of it.
  if (value.includes('\n')) return null;
  return value;
}

/**
 * Ask one machine's login shell where it keeps one program, the Phase 72 way.
 *
 * Kept for the probes, for the reason {@link remoteWhichCommand} is kept.
 * Production goes through {@link findRemoteProgram}.
 */
export async function captureRemoteWhich(
  ctx: RemoteMachineContext,
  bare: string
): Promise<string | null> {
  if (!PLAIN_PROGRAM_NAME.test(bare)) return null;
  const out = await execRemoteShell(ctx, remoteWhichCommand(bare), {
    timeoutMs: REMOTE_ARGV_TIMEOUT_MS
  });
  return parseRemoteWhich(out);
}

/**
 * Refuse to act on a row whose recorded machine is not the machine in hand.
 *
 * Called on every remote restore, and on every local restore of a row that
 * carries a machine other than this Mac. A path captured on one machine can
 * never be used to launch on another, and the sentence says exactly that.
 *
 * @throws GmuxError INVALID_INPUT with {@link RESTORE_WRONG_MACHINE}.
 */
export function assertArgvBelongsToMachine(
  recordedMachineId: string,
  targetMachineId: string
): void {
  if (recordedMachineId === targetMachineId) return;
  throw gmuxError(
    'INVALID_INPUT',
    RESTORE_WRONG_MACHINE,
    `the row records machine ${JSON.stringify(recordedMachineId)} and the ` +
      `restore would run on ${JSON.stringify(targetMachineId)}`
  );
}
