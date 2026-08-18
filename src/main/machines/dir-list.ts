/**
 * The folders inside one folder on another machine (Phase 84, item 6).
 *
 * ## What it is for, and the two callers are different
 *
 * The create sheet's Directory field names a folder on the other computer.
 * Until this phase a person had to know that path by heart and type it, because
 * the picker beside the field walks THIS Mac's disk and a path chosen here
 * names nothing over there. {@link listRemoteDir} is what the picker draws.
 *
 * The second caller is the create itself. MEASURED 2026-08-18 on tmux 3.6a over
 * a scratch socket: `new-session -c /a-path-that-is-not-there` exits 0, prints
 * `$0`, makes a live session and puts the pane in the home directory, and tmux
 * prints no error at all. So a folder that is not there could not be caught by
 * reading what the create threw, because the create throws nothing.
 * {@link assertRemoteDirUsable} asks the machine BEFORE the create line is
 * composed, which is what gives {@link REMOTE_DIR_MISSING} its first live
 * caller.
 *
 * ## What it does not do
 *
 * It lists folders and never files, so it is a folder chooser and not a file
 * browser. It writes nothing on either computer and it carries no file
 * contents. It cannot be reached while Tortie is not connected to the machine,
 * because every byte it moves goes through the one door in `./remote-run.ts`.
 *
 * ## The count and the listing are two different numbers
 *
 * The far side counts every folder and then lists at most
 * {@link REMOTE_DIR_LIST_MAX} of them. A picker that only had the listing would
 * present 500 as all of them. `total` is what keeps the number honest on screen.
 */

import {
  REMOTE_DIR_LIST_MAX,
  type RemoteDirEntry,
  type RemoteDirListing,
  type RemoteDirRefusal
} from '@shared/ipc';
import { gmuxError } from '../errors';
import type { RemoteMachineContext } from './context';
import {
  REMOTE_DIR_DENIED,
  REMOTE_DIR_MISSING,
  REMOTE_DIR_NOT_A_FOLDER,
  dirListUnreachable
} from './remote-copy';
import { runRemoteRead } from './remote-run';
import { readyRemoteContext } from './remote-sessions';
import { machineLabelOf, machineRow } from './store';

/**
 * How long one listing gets. 15,000 ms.
 *
 * CHOSEN, not measured. It is the same budget `./remote-run.ts` gives any
 * script by default. One `ls` of one folder on a machine that is answering is
 * far inside it, and the number is a deadline rather than an expectation.
 */
export const REMOTE_DIR_TIMEOUT_MS = 15_000;

/**
 * How many entries the folder CHECK asks for. One.
 *
 * The check only wants the status word. It cannot ask for none, because BSD
 * `head -n 0` refuses with "illegal line count", and a script that prints an
 * error on the ordinary path is a script whose answer nobody can read.
 */
export const REMOTE_DIR_CHECK_CAP = 1;

/** What one machine answered about one folder. */
export interface RemoteDirAnswer {
  readonly status: 'ok' | 'missing' | 'notdir' | 'denied';
  /** The path the machine reported, which is its own resolution of the ask. */
  readonly path: string;
  /** How many folders are really in there. Zero for every refusal. */
  readonly total: number;
  /** The folder names, in the order the machine listed them. */
  readonly names: readonly string[];
}

/**
 * One `dir-list` payload into its four parts, or null. PURE.
 *
 * The first line is the status word, then the count for `ok`, then the path as
 * THE REST OF THE LINE. The path is last because a folder on another computer
 * can hold a space in its name, and a path read as one field in the middle of a
 * line would be cut at the first one.
 *
 * Every line after the first is one folder name and ends in a slash, which is
 * what `ls -A -p` marks a directory with. A line that does not is not a folder
 * and is dropped rather than guessed at. A file name holding a newline is the
 * one case that produces such a line, and dropping it is why this parse cannot
 * be made to name a file.
 */
export function parseDirList(payload: string): RemoteDirAnswer | null {
  const lines = payload.split('\n');
  const head = lines[0] ?? '';
  const firstSpace = head.indexOf(' ');
  if (firstSpace <= 0) return null;
  const word = head.slice(0, firstSpace);
  const rest = head.slice(firstSpace + 1);
  if (word === 'missing' || word === 'notdir' || word === 'denied') {
    return { status: word, path: rest.trim(), total: 0, names: [] };
  }
  if (word !== 'ok') return null;
  const secondSpace = rest.indexOf(' ');
  if (secondSpace <= 0) return null;
  const total = Number(rest.slice(0, secondSpace));
  if (!Number.isFinite(total) || total < 0) return null;
  const names: string[] = [];
  for (const line of lines.slice(1)) {
    if (!line.endsWith('/') || line.length < 2) continue;
    names.push(line.slice(0, -1));
  }
  return {
    status: 'ok',
    path: rest.slice(secondSpace + 1).trim(),
    total: Math.max(total, names.length),
    names
  };
}

/**
 * The folder one level up, or null when there is no level up. PURE.
 *
 * It is composed here rather than asked of the machine, and that is safe for
 * one reason: every character of it came from the path the machine itself
 * reported. Tortie is cutting the machine's own answer rather than inventing a
 * path on another computer.
 */
export function parentOfRemoteDir(path: string): string | null {
  if (!path.startsWith('/') || path === '/') return null;
  const trimmed = path.endsWith('/') ? path.slice(0, -1) : path;
  const at = trimmed.lastIndexOf('/');
  if (at < 0) return null;
  return at === 0 ? '/' : trimmed.slice(0, at);
}

/** The sentence for one refusal. PURE. */
export function dirRefusalText(
  refusal: RemoteDirRefusal,
  label: string
): string {
  switch (refusal) {
    case 'missing':
      return REMOTE_DIR_MISSING;
    case 'notdir':
      return REMOTE_DIR_NOT_A_FOLDER;
    case 'denied':
      return REMOTE_DIR_DENIED;
    case 'unreachable':
      return dirListUnreachable(label);
  }
}

/** The label a person reads for one machine, or its id when it has no row. */
function labelOf(machineId: string): string {
  const row = machineRow(machineId);
  return row === null ? machineId : machineLabelOf(row);
}

/**
 * Ask one machine what is inside one folder.
 *
 * It never throws for anything the machine said. A folder that is not there, a
 * path that is not a folder and a folder the account cannot read are all
 * ordinary states, and each comes back as a listing carrying its refusal and
 * its sentence. A machine that did not answer comes back the same way, carrying
 * `unreachable`, because the picker has a panel to draw either way.
 */
export async function listRemoteDir(input: {
  readonly machineId: string;
  readonly path: string;
}): Promise<RemoteDirListing> {
  const label = labelOf(input.machineId);
  const empty = (refusal: RemoteDirRefusal, path: string): RemoteDirListing => ({
    path,
    parent: parentOfRemoteDir(path),
    entries: [],
    total: 0,
    refusal,
    refusalText: dirRefusalText(refusal, label)
  });
  let ctx: RemoteMachineContext;
  try {
    ctx = readyRemoteContext(input.machineId);
  } catch {
    return empty('unreachable', input.path);
  }
  let answer: RemoteDirAnswer | null;
  try {
    const out = await runRemoteRead(
      ctx,
      'dir-list',
      [input.path, String(REMOTE_DIR_LIST_MAX)],
      { timeoutMs: REMOTE_DIR_TIMEOUT_MS }
    );
    answer = parseDirList(out.payload);
  } catch {
    return empty('unreachable', input.path);
  }
  if (answer === null) return empty('unreachable', input.path);
  if (answer.status !== 'ok') return empty(answer.status, answer.path);
  const entries: RemoteDirEntry[] = [...answer.names]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name }));
  return {
    path: answer.path,
    parent: parentOfRemoteDir(answer.path),
    entries,
    total: answer.total,
    refusal: null,
    refusalText: null
  };
}

/**
 * Refuse a create whose folder is not a folder on that machine.
 *
 * Asked BEFORE the `new-session` line is composed, so a refusal here means
 * nothing was started and nothing was written. An empty path is not checked at
 * all, because there is nothing to check: no `-c` is sent and tmux's own
 * fallback is that machine's home directory.
 *
 * A machine that did not answer the question does NOT refuse the create. THIS
 * IS A DELIBERATE FAIL OPEN and it is the one hole in this check. A machine
 * that stops answering between the poll and this read skips the check entirely
 * and the create goes ahead, so a folder that is not there can still reach
 * `new-session` on a machine that went quiet at exactly the wrong moment. It is
 * taken because the create is about to talk to the same machine and will fail on
 * its own terms if it cannot, and because refusing here would turn one slow
 * answer into a create a person cannot make. The cost is a pane in the home
 * directory instead of a sentence, which is the state this whole check exists
 * to improve on rather than to guarantee.
 *
 * @throws GmuxError INVALID_INPUT with the sentence for what the machine said.
 */
export async function assertRemoteDirUsable(
  ctx: RemoteMachineContext,
  path: string
): Promise<void> {
  if (path.length === 0) return;
  let answer: RemoteDirAnswer | null;
  try {
    const out = await runRemoteRead(
      ctx,
      'dir-list',
      [path, String(REMOTE_DIR_CHECK_CAP)],
      { timeoutMs: REMOTE_DIR_TIMEOUT_MS }
    );
    answer = parseDirList(out.payload);
  } catch {
    // The fail open named in this function's header. Nothing is known about the
    // folder, so nothing is refused.
    return;
  }
  // A payload that does not parse is treated the same way, and for the same
  // reason: Tortie will not refuse a person's create on an answer it could not
  // read.
  if (answer === null || answer.status === 'ok') return;
  throw gmuxError(
    'INVALID_INPUT',
    dirRefusalText(answer.status, labelOf(ctx.machineId)),
    `${ctx.machineId} answered ${answer.status} for ${JSON.stringify(path)}, ` +
      `so nothing was started there`
  );
}
