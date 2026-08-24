/**
 * Every file name in one folder on another machine (Phase 99).
 *
 * ## What it is for
 *
 * A project can be a folder on another machine, and until this phase the Quick
 * Open palette on that tab drew a sentence saying it does not reach over there.
 * It does now. A person presses the palette chord, types part of a file name,
 * and the file opens in the read only tab Phase 90.3 shipped.
 *
 * ## The rule that decides the design
 *
 * THE ENUMERATION HAPPENS WHERE THE FILES ARE, for the reason `./remote-search
 * .ts` states at length. Research 57 section 2 measured shipping a ripgrep to
 * the machine and refused it, and measured copying the files here and refused
 * that too. So one read script crosses, being `repo-files` from the frozen
 * catalogue in `./remote-scripts.ts`, and that machine's own `git` or `find`
 * reads its own disk.
 *
 * ## What crosses the link, and what does not
 *
 * NAMES CROSS AND CONTENTS DO NOT. A person's source stays on the computer it
 * is on. Opening one of these names is a separate read through the surfaces
 * Phase 90.3 built, and it lands in a tab that cannot be saved.
 *
 * ## Where the ranking happens, and why it is not here
 *
 * The ranking worker in `src/main/quickopen/worker.ts` holds one index per
 * root, and it builds a local root's index by spawning ripgrep in it. It cannot
 * spawn anything on another computer, and a path that names a folder over there
 * would make ripgrep read a DIFFERENT folder here or nothing at all. So the
 * renderer reads the names through this module and hands the whole list to the
 * worker on a `warm`, and the worker adopts it instead of enumerating. The two
 * kinds of root are told apart by the ROOT KEY, from `rootKeyOf` in
 * `@shared/workspace-target`.
 *
 * ## What it does not do
 *
 *  - IT DOES NOT STREAM. One call, one answer. The far side has finished
 *    listing before the first byte comes back.
 *  - NO TIMER CALLS IT. The palette asks when a person opens it, and it skips a
 *    root it read less than `QUICK_OPEN_WARM_STALE_MS` ago.
 *  - IT WRITES NOTHING, on either computer.
 *  - IT READS NO FILE'S CONTENTS, on either computer.
 *
 * ## Where this list and the local one differ, stated rather than left to be
 * found
 *
 *  - THE CAP IS SMALLER. The palette holds 200,000 paths per project on this
 *    Mac and `REMOTE_FILE_LIST_MAX` is 50,000, because these names cross a
 *    link.
 *  - THE WALK BRANCH PRUNES TWO DIRECTORIES AND NO IGNORE FILE. `rg --files`
 *    on this Mac reads `.gitignore` even outside a repository. `repo-files`
 *    outside a repository prunes `.git` and `node_modules` and nothing else, so
 *    its answer can hold build output. The palette says so.
 *  - A FILE NAME HOLDING A NEWLINE IS DROPPED rather than guessed at. See
 *    {@link relPathsFrom}.
 *
 * ## It never throws for anything a machine said
 *
 * A folder that is not there, a machine that did not answer and a machine
 * Tortie is not signed in to are three ordinary states. Each comes back as a
 * result carrying its own mode word, and the renderer draws the sentence from
 * `src/renderer/machines/explorer.ts`. No prose crosses this boundary, and
 * nothing in this module throws at all.
 */

import {
  REMOTE_FILE_LIST_MAX,
  type MachineFileListInput,
  type MachineFileListMode,
  type MachineFileListResult
} from '@shared/ipc';
import type { RemoteMachineContext } from './context';
import { machineIsConnected, runRemoteRead } from './remote-run';
import { readyRemoteContext } from './ready-context';
import { machineLabelOf, machineRow } from './store';

/**
 * How long one name list read gets on the machine. 30,000 ms.
 *
 * A DEADLINE AND NOT AN EXPECTATION. Research 57 section 6.3 measured 15,581
 * names in 108.6 to 201.0 ms and 289,980 names in 8,218 to 10,563 ms over the
 * operator's own tailnet. The deadline is here so a machine that went to sleep
 * mid answer does not hold a call open forever. It is the same number
 * `REMOTE_SEARCH_TIMEOUT_MS` carries, for the same reason.
 */
export const REMOTE_FILE_LIST_TIMEOUT_MS = 30_000;

/** The far side prints one of these three words. `none` is an empty body. */
const MODE_WORDS: Readonly<Record<string, 'repo' | 'walk' | 'missing'>> = {
  repo: 'repo',
  walk: 'walk',
  missing: 'missing'
};

const BASE64_ONLY = /^[A-Za-z0-9+/=]*$/;

/**
 * The mode word, the cut answer and the decoded body, or null when nothing
 * parsed. PURE.
 *
 * The answer is `<word> <0 or 1> <base64 or none>`, which is `repo-search`'s
 * shape. The base64 word is checked before it is decoded, for the reason
 * `./remote-review.ts` states about its own answers: `Buffer.from` DROPS a
 * character it does not know and hands back plausible nonsense, and a person
 * reading a list of file names cannot tell nonsense from a file.
 *
 * THE MIDDLE WORD IS THE FAR SIDE'S OWN ANSWER about the byte ceiling. Asking
 * whether the body ends in a newline answers a different question, because
 * `head -c` cuts at a byte offset and about one cut in every average line
 * length lands on one. A word that is neither `0` nor `1` makes the whole
 * answer unreadable, which is the same treatment every other malformed field
 * gets here.
 */
export function parseFileListAnswer(payload: string): {
  mode: 'repo' | 'walk' | 'missing';
  cut: boolean;
  body: string;
} | null {
  const words = payload.trim().split(/[ \t\n]+/);
  const first = words[0] ?? '';
  const mode = MODE_WORDS[first];
  if (mode === undefined) return null;
  const second = words[1] ?? '';
  if (second !== '0' && second !== '1') return null;
  const cut = second === '1';
  const third = words[2] ?? '';
  if (third.length === 0) return null;
  if (third === 'none') return { mode, cut, body: '' };
  if (!BASE64_ONLY.test(third)) return null;
  return { mode, cut, body: Buffer.from(third, 'base64').toString('utf8') };
}

/**
 * The decoded body into repository relative paths, and whether the cap bit.
 * PURE.
 *
 * THE TEXT AFTER THE FINAL NEWLINE IS DROPPED. It is the empty string for a
 * body that ended cleanly, and a path cut in the middle otherwise. Either way
 * it is not a file anybody has.
 *
 * THE CAP IS READ BEFORE ANYTHING IS DROPPED, because the far side was asked
 * for the cap PLUS ONE. A body with more lines than the cap is proof the cap
 * bit, and counting after the filters below would turn one dropped name into a
 * list that says it is complete when it is not.
 *
 * A LEADING `./` IS STRIPPED, because the walk branch prints it and the
 * repository branch does not.
 *
 * A LINE BEGINNING WITH `"` IS DROPPED. Git quotes a name holding a byte it
 * cannot print plainly, e.g. a newline, and this end drops such a line rather
 * than guessing at it. That is the rule `tree-list` already carries. The walk
 * branch has no such quoting, so a name holding a newline arrives there as two
 * lines and both of them are wrong. That is stated rather than fixed.
 *
 * An empty line is dropped.
 */
export function relPathsFrom(
  body: string,
  cap: number
): { paths: string[]; capped: boolean } {
  const lines = body.split('\n');
  lines.pop();
  let capped = false;
  let kept = lines;
  if (kept.length > cap) {
    kept = kept.slice(0, cap);
    capped = true;
  }
  const paths: string[] = [];
  for (const line of kept) {
    if (line.length === 0) continue;
    if (line.startsWith('"')) continue;
    paths.push(line.startsWith('./') ? line.slice(2) : line);
  }
  return { paths, capped };
}

/** The label this machine's row carries, or its id when there is no row. */
function labelOf(machineId: string): string {
  const row = machineRow(machineId);
  return row === null ? machineId : machineLabelOf(row);
}

/** Everything but the names, for the three answers that carry none. */
function emptyResult(
  input: MachineFileListInput,
  mode: MachineFileListMode,
  started: number
): MachineFileListResult {
  const now = Date.now();
  return {
    machineId: input.machineId,
    machineLabel: labelOf(input.machineId),
    cwd: input.cwd,
    mode,
    paths: [],
    capped: false,
    truncated: false,
    readAt: now,
    elapsedMs: now - started
  };
}

/**
 * Ask one machine which files are in one folder.
 *
 * @returns a result carrying `repo` or `walk` and its paths, or one of the
 *   three refusals. It NEVER THROWS for anything the machine said, and it never
 *   throws at all: there is no caller error this call can make, because the one
 *   value it takes beside the machine is a folder, and a folder that is not
 *   absolute is answered rather than refused.
 */
export async function listFilesOnMachine(
  input: MachineFileListInput
): Promise<MachineFileListResult> {
  const started = Date.now();
  // A path that is not absolute names nothing on that machine. It is reported
  // rather than sent, because the far side's shell would resolve it against
  // whatever folder it started in.
  if (typeof input.cwd !== 'string' || !input.cwd.startsWith('/')) {
    return emptyResult(input, 'missing', started);
  }
  if (!machineIsConnected(input.machineId)) {
    return emptyResult(input, 'notConnected', started);
  }
  let ctx: RemoteMachineContext;
  try {
    ctx = readyRemoteContext(input.machineId);
  } catch {
    return emptyResult(input, 'notConnected', started);
  }
  const cap = Math.max(
    1,
    Math.min(
      Math.trunc(input.maxPaths ?? REMOTE_FILE_LIST_MAX),
      REMOTE_FILE_LIST_MAX
    )
  );
  let answer: { mode: 'repo' | 'walk' | 'missing'; cut: boolean; body: string } | null;
  try {
    const out = await runRemoteRead(
      ctx,
      'repo-files',
      [
        input.cwd,
        // The cap PLUS ONE. A body holding more lines than the cap is proof the
        // cap bit, so nothing has to walk the tree a second time to count.
        String(cap + 1)
      ],
      { timeoutMs: REMOTE_FILE_LIST_TIMEOUT_MS }
    );
    answer = parseFileListAnswer(out.payload);
  } catch {
    return emptyResult(input, 'unreachable', started);
  }
  // A payload nothing could read is a machine that did not answer, rather than
  // a guess about a folder. The shape this expected is in
  // `parseFileListAnswer`.
  if (answer === null) return emptyResult(input, 'unreachable', started);
  if (answer.mode === 'missing') return emptyResult(input, 'missing', started);
  const built = relPathsFrom(answer.body, cap);
  const now = Date.now();
  return {
    machineId: input.machineId,
    machineLabel: labelOf(input.machineId),
    cwd: input.cwd,
    mode: answer.mode,
    paths: built.paths,
    capped: built.capped,
    // THE FAR SIDE SAID WHETHER IT CUT, and this end does not guess.
    truncated: answer.cut,
    readAt: now,
    elapsedMs: now - started
  };
}
