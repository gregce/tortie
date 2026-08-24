/**
 * One folder tree on another machine, read in ONE call (Phase 90.3).
 *
 * ## What it is for
 *
 * A project can now be a folder on another machine, and the Explorer in that
 * tab lists that machine's files. Phase 84's `./dir-list.ts` cannot do it. It
 * lists folders and never files, and it answers about one folder per call.
 *
 * ## The rule that decides the design
 *
 * NEVER IN SERIES. Research 55 measured, on the operator's tailnet against his
 * Mac Pro, that nine folders read as nine calls cost 409.7 ms and that the same
 * nine answers in ONE subtree call cost 42.3 ms. Research 56 section 1.4
 * sharpened it: six calls issued at once cost 44.0 ms, so what matters is that
 * the calls are not in series. This module answers a whole subtree, and the
 * Explorer expands from what it already holds rather than asking again.
 *
 * ## What it does not do
 *
 * It carries no file contents, it writes nothing on either computer, and it
 * cannot be reached while Tortie is not connected to the machine, because every
 * byte it moves goes through the one door in `./remote-run.ts`.
 *
 * NO TIMER CALLS IT. There is no poll in this module and none in the renderer
 * path that uses it. A folder is read when a tab is opened, when a person
 * expands past the fetched depth, and when they press Refresh.
 *
 * ## It never throws for something a machine said
 *
 * A folder that is not there, a path that is a file, a folder the account
 * cannot read, a machine that did not answer and a machine Tortie is not signed
 * in to are five ordinary states. Each comes back as a listing carrying its own
 * status word, and the renderer draws the sentence, exactly as `dir-list` has
 * it. No prose crosses this boundary.
 */

import {
  REMOTE_TREE_DEPTH,
  REMOTE_TREE_MAX_ENTRIES,
  type RemoteTreeEntry,
  type RemoteTreeListing
} from '@shared/ipc';
import type { RemoteMachineContext } from './context';
import { machineIsConnected, runRemoteRead } from './remote-run';
import { readyRemoteContext } from './ready-context';

/**
 * How long one tree read gets. 20,000 ms.
 *
 * A DEADLINE AND NOT AN EXPECTATION. It is the same order as the repository
 * walk Phase 90.2 added, and it is longer than the 15,000 ms a `dir-list` gets
 * because this walks a tree rather than one folder. A machine that is answering
 * is far inside it: research 55 measured a whole 1,695 entry repository at
 * 65.5 ms.
 */
export const REMOTE_TREE_TIMEOUT_MS = 20_000;

/** What one machine answered about one folder tree. Pure data. */
export interface RemoteTreeAnswer {
  readonly status: 'ok' | 'missing' | 'notdir' | 'denied';
  /** The root the machine reported, which is its own resolution of the ask. */
  readonly root: string;
  /** How many entries are really under there. Zero for every refusal. */
  readonly total: number;
  /** The absolute paths, with a trailing slash on a directory. */
  readonly lines: readonly string[];
}

/**
 * One `tree-list` payload into its parts, or null. PURE.
 *
 * The first line is the status word, then the count for `ok`, then the root as
 * THE REST OF THE LINE. The root is last because a folder on another computer
 * can hold a space in its name, and a path read as one field in the middle of a
 * line would be cut at the first one. That is the shape `dir-list` already uses.
 *
 * Every line after the first is one absolute path. A line that does not begin
 * with the root is DROPPED rather than guessed at. That is the one defence
 * against a file whose name holds a newline: the second half of such a name does
 * not begin with the root and never reaches a surface. The first half does, and
 * the module header says so.
 */
export function parseTreeList(payload: string): RemoteTreeAnswer | null {
  const lines = payload.split('\n');
  const head = lines[0] ?? '';
  const firstSpace = head.indexOf(' ');
  if (firstSpace <= 0) return null;
  const word = head.slice(0, firstSpace);
  const rest = head.slice(firstSpace + 1);
  if (word === 'missing' || word === 'notdir' || word === 'denied') {
    return { status: word, root: rest.trim(), total: 0, lines: [] };
  }
  if (word !== 'ok') return null;
  const secondSpace = rest.indexOf(' ');
  if (secondSpace <= 0) return null;
  const total = Number(rest.slice(0, secondSpace));
  if (!Number.isFinite(total) || total < 0) return null;
  const root = rest.slice(secondSpace + 1).trim();
  if (!root.startsWith('/')) return null;
  const under = root === '/' ? '/' : root + '/';
  const kept: string[] = [];
  for (const line of lines.slice(1)) {
    if (line.length <= under.length) continue;
    if (!line.startsWith(under)) continue;
    kept.push(line);
  }
  return { status: 'ok', root, total: Math.max(total, kept.length), lines: kept };
}

/** One printed line into one entry. PURE. A trailing slash means a directory. */
export function entryOfLine(line: string): RemoteTreeEntry {
  return line.endsWith('/')
    ? { path: line.slice(0, -1), kind: 'dir' }
    : { path: line, kind: 'file' };
}

/**
 * How deep a caller may ask. One to eight.
 *
 * A depth under one would ask `find -maxdepth 0`, which prints the root and
 * nothing else, and a caller that wanted that asked the wrong question. The
 * ceiling is here so a renderer defect cannot ask one machine to walk a whole
 * home directory to the bottom.
 */
export function clampTreeDepth(depth: number | undefined): number {
  if (depth === undefined || !Number.isFinite(depth)) return REMOTE_TREE_DEPTH;
  return Math.min(Math.max(Math.trunc(depth), 1), 8);
}

/**
 * Ask one machine what is under one folder.
 *
 * @returns a listing carrying `status: 'ok'`, or one of the five refusals. It
 *   never throws for anything the machine said.
 */
export async function listRemoteTree(input: {
  readonly machineId: string;
  readonly root: string;
  readonly depth?: number;
}): Promise<RemoteTreeListing> {
  const root = input.root;
  if (!root.startsWith('/')) {
    // A path that is not absolute names nothing on that machine. It is
    // reported as missing rather than sent, because sending it would ask the
    // far side's shell to resolve it against whatever folder it started in.
    return { status: 'missing', root };
  }
  if (!machineIsConnected(input.machineId)) {
    return { status: 'notConnected', root };
  }
  let ctx: RemoteMachineContext;
  try {
    ctx = readyRemoteContext(input.machineId);
  } catch {
    return { status: 'notConnected', root };
  }
  let answer: RemoteTreeAnswer | null;
  try {
    const out = await runRemoteRead(
      ctx,
      'tree-list',
      [
        root,
        String(clampTreeDepth(input.depth)),
        String(REMOTE_TREE_MAX_ENTRIES)
      ],
      { timeoutMs: REMOTE_TREE_TIMEOUT_MS }
    );
    answer = parseTreeList(out.payload);
  } catch {
    return { status: 'unreachable', root };
  }
  // A payload nothing could read is a machine that did not answer, rather than
  // a guess about a folder. The shape this expected is in `parseTreeList`.
  if (answer === null) return { status: 'unreachable', root };
  if (answer.status !== 'ok') return { status: answer.status, root: answer.root };
  const entries = answer.lines
    .map(entryOfLine)
    .sort((a, b) => (a.path === b.path ? 0 : a.path < b.path ? -1 : 1));
  return {
    status: 'ok',
    root: answer.root,
    entries,
    total: answer.total,
    truncated: answer.total > entries.length,
    readAt: Date.now()
  };
}
