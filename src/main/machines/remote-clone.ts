/**
 * Putting this project on a machine that does not have it (Phase 90.2, item 3).
 *
 * ## What it is, and it is the second write in this product
 *
 * `./remote-image.ts` was the first write this product could make on another
 * computer. This is the second, and this release has no third. It asks git on
 * that machine to copy one project into one folder that is not there yet.
 *
 * ## The order of operations, and the order IS the safety
 *
 * ```
 * 1. connected?                       else 'offline', nothing is sent
 * 2. re-read the origin at localPath  on THIS Mac
 * 3. translate it to a web address
 * 4. equals expectUrl?                else 'changed', nothing is sent
 * 5. web address and full path?       else 'refused', nothing is sent
 * 6. forget the held walk, then
 *    runRemoteWrite('git-clone')      the far side tests, checks, then clones
 * 7. 'exists' -> one repo-find there  the same remote means 'existsSame'
 * ```
 *
 * STEP 6 DROPS THE HELD WALK BECAUSE A COPY MAKES IT WRONG. The create sheet's
 * lookup remembers what one machine answered for the life of one connection.
 * The next lookup after a copy has to ask the machine again, or a person who
 * just copied a project reads that it is not over there.
 *
 * STEPS 2 AND 4 ARE WHY THE RENDERER DOES NOT CHOOSE THE ADDRESS. Main derives
 * the address from the project folder itself and refuses when it does not equal
 * the one the sheet drew. So what crosses is always an address main read from a
 * repository on this Mac, never one that arrived over the bridge. It is the
 * same discipline `machines:add` uses with its confirm hash.
 *
 * STEP 7 EXISTS BECAUSE A LOST ANSWER IS NOT A FAILED COPY. A link that dies
 * after the far side finished leaves a good copy Tortie never heard about, and
 * the retry would then read `exists` for a folder Tortie itself made. Reporting
 * that as a refusal would be wrong, so an `exists` answer is followed by one
 * read at the destination.
 *
 * ## No session exists while this runs
 *
 * NOTHING IS WRITTEN UNTIL THE MACHINE SAYS THE FOLDER IS THERE. No manifest
 * row, no session and no tab. So the question "what happens when the copy fails
 * after the row was written" has one answer, being that it cannot happen. The
 * rejected shape was to create the session first and report the copy into its
 * pane, and it was rejected because a failed copy would leave a live session in
 * a folder that does not exist.
 *
 * ## What CAN be left behind, and the copy says so
 *
 * If the deadline is hit or the link drops part way, the copy may keep running
 * over there and a partly downloaded folder may remain. Tortie names the path.
 * The next attempt refuses that path by name, because the script tests the
 * destination with `-e` before it does anything else.
 *
 * ## No credential crosses
 *
 * Tortie reads none, sends none, caches none and asks for none. That machine
 * signs in with what it already has, or the script answers `unreachable` having
 * written nothing.
 */

import type { RemoteCloneInput, RemoteCloneResult } from '@shared/ipc';
import { type RemoteMachineContext } from './context';
import {
  CLONE_CHANGED,
  CLONE_NOT_WEB_ADDRESS,
  CLONE_PATH_NOT_ABSOLUTE,
  cloneDone,
  cloneExists,
  cloneExistsSame,
  cloneFailed,
  cloneOffline,
  cloneTimedOut,
  cloneUnreachable
} from './remote-copy';
import {
  forgetRemoteProjectWalk,
  readOriginUrl,
  remoteCloneUrl,
  remoteRepoKey,
  walkRemoteRepos
} from './project-counterpart';
import { machineIsConnected, runRemoteWrite } from './remote-run';
import { readyRemoteContext } from './remote-sessions';
import { machineLabelOf, machineRow } from './store';

/**
 * How long one copy gets before this Mac stops waiting. 600,000 ms.
 *
 * CHOSEN, NOT MEASURED, and it is a deadline rather than an expectation. A
 * large project over a home connection can take minutes, and the far side has
 * no deadline of its own: `timeout` is GNU coreutils and this kind of machine
 * does not ship it. `execRemoteShell` hands this number to `execFile` with
 * `killSignal: 'SIGKILL'`, so what it kills is this Mac's own side.
 */
export const REMOTE_CLONE_TIMEOUT_MS = 600_000;

/** The same number in minutes, for the sentence a person reads. */
export const REMOTE_CLONE_TIMEOUT_MINUTES = REMOTE_CLONE_TIMEOUT_MS / 60_000;

/** How deep the check at the destination looks. One folder, being its own. */
export const REMOTE_CLONE_CHECK_DEPTH = 1;

/** What the far side printed after it was asked to copy one project. */
export interface RemoteCloneAnswer {
  readonly word: 'exists' | 'cloned' | 'failed' | 'unreachable';
  /** What git printed, decoded, or the empty string. */
  readonly detail: string;
  /** The destination, exactly as the machine printed it. */
  readonly path: string;
}

/**
 * One `git-clone` payload into its three parts, or null. PURE.
 *
 * The word, then base64 of what git said or the empty word, then the path as
 * THE REST OF THE LINE. The path is last because a folder on another computer
 * can hold a space in its name. Anything that is not one of the four words is
 * null, which is one answer to the caller: the machine did not report doing
 * what it was asked.
 */
export function parseCloneAnswer(payload: string): RemoteCloneAnswer | null {
  const line = payload.split('\n')[0] ?? '';
  const firstSpace = line.indexOf(' ');
  if (firstSpace <= 0) return null;
  const word = line.slice(0, firstSpace);
  if (
    word !== 'exists' &&
    word !== 'cloned' &&
    word !== 'failed' &&
    word !== 'unreachable'
  ) {
    return null;
  }
  const rest = line.slice(firstSpace + 1);
  const secondSpace = rest.indexOf(' ');
  if (secondSpace <= 0) return null;
  const encoded = rest.slice(0, secondSpace);
  const path = rest.slice(secondSpace + 1).trim();
  if (path.length === 0) return null;
  let detail = '';
  if (encoded !== 'none') {
    try {
      detail = Buffer.from(encoded, 'base64').toString('utf8');
    } catch {
      detail = '';
    }
  }
  return { word, detail, path };
}

/**
 * How many copies have crossed since the last reset.
 *
 * It exists so a gate can prove a refusal sent NOTHING, rather than believing
 * a sentence that says so. `GMUX_SMOKE=remote-sessions` reads it either side of
 * a refused call and fails when the number moved.
 */
let sends = 0;

/** How many `git-clone` commands have crossed since the last reset. */
export function remoteCloneSendCount(): number {
  return sends;
}

/** Forget the count. Tests and the smoke. */
export function resetRemoteCloneSendCountForTests(): void {
  sends = 0;
}

/** The label a person reads for one machine, or its id when it has no row. */
function labelOf(machineId: string): string {
  const row = machineRow(machineId);
  return row === null ? machineId : machineLabelOf(row);
}

/**
 * Copy one project onto one machine.
 *
 * IT NEVER THROWS FOR ANYTHING A MACHINE SAID. Nine outcomes, each with its own
 * sentences, and a surface never reads prose out of an error.
 */
export async function cloneProjectOnMachine(
  input: RemoteCloneInput
): Promise<RemoteCloneResult> {
  const label = labelOf(input.machineId);
  const from = Date.now();
  const answer = (
    outcome: RemoteCloneResult['outcome'],
    url: string,
    detail: string,
    sentences: readonly string[]
  ): RemoteCloneResult => ({
    outcome,
    path: input.path,
    url,
    detail,
    sentences,
    tookMs: Date.now() - from
  });

  // 1. Connected only, asked before anything is read or composed.
  if (!machineIsConnected(input.machineId)) {
    return answer('offline', '', '', [cloneOffline(label)]);
  }
  let ctx: RemoteMachineContext;
  try {
    ctx = readyRemoteContext(input.machineId);
  } catch {
    return answer('offline', '', '', [cloneOffline(label)]);
  }

  // 2 and 3. Main's OWN read of this project's remote, translated here.
  const originUrl = await readOriginUrl(input.localPath);
  const url = originUrl === null ? null : remoteCloneUrl(originUrl);

  // 4. The sheet's address has to be the one main just derived.
  if (url === null || url !== input.expectUrl) {
    return answer('changed', '', '', [CLONE_CHANGED]);
  }

  // 5. Two refusals in TypeScript, before anything is composed.
  //
  //    NEITHER IS REACHABLE FROM THE SHEET, and that is why both are pinned in
  //    build/assert-bundle-refusals.mjs. `remoteCloneUrl` composes a `https://`
  //    address or none at all, so step 4 already caught anything else, and the
  //    destination is composed from that machine's own home directory. They
  //    stand anyway, because a later change to either composer would otherwise
  //    put an address that begins with a dash, or a relative path, in front of
  //    git on somebody else's computer.
  if (!url.startsWith('https://')) {
    return answer('refused', '', '', [CLONE_NOT_WEB_ADDRESS]);
  }
  if (!input.path.startsWith('/')) {
    return answer('refused', url, '', [CLONE_PATH_NOT_ABSOLUTE]);
  }

  // 6. The one write.
  //
  //    THE HELD WALK GOES FIRST. `findProjectOnMachine` remembers what one
  //    machine answered for the life of one connection, and that answer stops
  //    being true the moment a folder lands over there. Dropping it here rather
  //    than on success alone covers a copy that hit the deadline or lost its
  //    link part way, because either of those can leave a folder behind too.
  //    Without this a person who copies into the suggested folder and opens the
  //    sheet again on the same connection is told that no folder over there has
  //    this project's git remote, and is offered the copy a second time.
  let said: RemoteCloneAnswer | null;
  forgetRemoteProjectWalk(input.machineId);
  sends += 1;
  try {
    const out = await runRemoteWrite(ctx, 'git-clone', [url, input.path], {
      timeoutMs: REMOTE_CLONE_TIMEOUT_MS
    });
    said = parseCloneAnswer(out.payload);
  } catch (err) {
    // A deadline that was hit and a link that dropped are two different things
    // to a person. The elapsed time is what tells them apart here, because the
    // door reports both as one refusal.
    if (Date.now() - from >= REMOTE_CLONE_TIMEOUT_MS) {
      return answer('timeout', url, '', [
        cloneTimedOut(label, input.path, REMOTE_CLONE_TIMEOUT_MINUTES)
      ]);
    }
    return answer('failed', url, (err as Error).message, [
      cloneFailed(label, url)
    ]);
  }
  if (said === null) {
    return answer('failed', url, '', [cloneFailed(label, url)]);
  }
  if (said.word === 'cloned') {
    return answer('cloned', url, '', [cloneDone(label, said.path)]);
  }
  if (said.word === 'unreachable') {
    return answer('unreachable', url, '', [cloneUnreachable(label, url)]);
  }
  if (said.word === 'failed') {
    return answer('failed', url, said.detail, [cloneFailed(label, url)]);
  }

  // 7. Something is already there. One read at that folder decides whether it
  //    is a copy of this same project, which is what a retry after a lost
  //    answer looks like.
  const key = remoteRepoKey(url);
  let same = false;
  try {
    const rows = await walkRemoteRepos(ctx, said.path, REMOTE_CLONE_CHECK_DEPTH);
    same = rows.some((row) => remoteRepoKey(row.url) === key);
  } catch {
    same = false;
  }
  return same
    ? answer('existsSame', url, '', [cloneExistsSame(label, said.path)])
    : answer('exists', url, '', [cloneExists(label, said.path)]);
}
