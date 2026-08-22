/**
 * Where this project already is on another machine (Phase 90.2, item 2).
 *
 * ## What it does, in one paragraph
 *
 * When a person picks a machine in the create sheet, main reads this project's
 * git remote on this Mac, asks that machine ONCE for every git folder under its
 * own home directory, and matches the two on an address key composed here. When
 * exactly one folder over there matches, the Directory field is filled with it.
 * Six outcomes come back and each one carries its own sentences.
 *
 * ## The boundary, and it is the whole design
 *
 * THE GIT REMOTE IS READ ONCE, AT CREATE TIME, TO FILL ONE FIELD. The session
 * is then bound to a `machineId` and an absolute path exactly like every other
 * session, and the address is never consulted again. It never resolves a file,
 * a git read or a search. Microsoft's `microsoft/vscode` issue 190566 is seven
 * steps of what happens when an address does resolve something, and the filer's
 * own summary is that a person ends up looking at the wrong version of a file
 * while the tab name still looks correct.
 *
 * A MATCH IS A SUGGESTION AND NEVER AN ACTION. The field is filled and stays
 * editable. Nothing is created, copied or opened by a match. Two or more
 * matches fill nothing at all, because Tortie cannot tell which folder holds
 * the work a person means.
 *
 * A SHARED REMOTE IS NOT THE SAME WORK. Tortie compares addresses. It never
 * compares what is in the two folders, and `./remote-copy.ts` says so on
 * screen rather than leaving a person to assume it.
 *
 * ## Why the walk is one call
 *
 * Research 55 measured, on the operator's tailnet against his Mac Pro, that one
 * warm call costs 35.9 ms, nine folders as nine calls cost 409.7 ms, and the
 * same nine as ONE call carrying a subtree cost 42.3 ms. The cost is the round
 * trip and not the work, so a gesture is one call.
 *
 * ## What is remembered, and it is nothing on disk
 *
 * {@link findProjectOnMachine} holds one answer per machine in memory, against
 * the connection generation it was read under. A second lookup in the same
 * connection reuses it. Nothing is written to disk and nothing survives a quit.
 * A folder that was moved or deleted would make a remembered answer wrong, and
 * a wrong answer fills the Directory field of a create.
 */

import { basename } from 'node:path';
import {
  REMOTE_PROJECT_MATCH_MAX,
  type RemoteProjectFindInput,
  type RemoteProjectFindOutcome,
  type RemoteProjectFindResult,
  type RemoteProjectMatch
} from '@shared/ipc';
import { runGit } from '../git/exec';
import { machineGeneration, type RemoteMachineContext } from './context';
import {
  counterpartAbsent,
  counterpartFound,
  counterpartLocalRemote,
  counterpartNoRemote,
  counterpartSearchRule,
  counterpartSeveral,
  counterpartTranslated,
  counterpartUnreachable
} from './remote-copy';
import { remoteMachineHome } from './remote-image';
import { runRemoteRead } from './remote-run';
import { readyRemoteContext } from './remote-sessions';
import { machineLabelOf, machineRow } from './store';

/**
 * How deep under that machine's home a `.git` directory may sit. 5.
 *
 * A MEASUREMENT AND NOT A DEFAULT. The decision rule was written before any
 * number was seen and it is this: run `repo-find` at maxdepth 2, 3, 4 and 5,
 * three runs each, against a real machine, and take the LARGEST depth whose p50
 * is at or under 1,500 ms and whose answer is at or under 32,768 bytes.
 * `npm run probe:remoteclone -- --measure` prints that table and names the
 * depth the rule picks.
 *
 * Run against the operator's Mac Pro over his tailnet on 2026-08-19, every
 * depth qualified, so the rule took the largest one.
 *
 * | maxdepth | p50 ms | p90 ms | answer bytes | git folders |
 * | --- | --- | --- | --- | --- |
 * | 2 | 77 | 157 | 74 | 1 |
 * | 3 | 56 | 82 | 178 | 2 |
 * | 4 | 80 | 148 | 178 | 2 |
 * | 5 | 93 | 172 | 178 | 2 |
 *
 * The measured cost of the last step is 13 ms of p50 and 0 extra bytes on that
 * machine, because depth 4 and depth 5 return the same two folders. The depth
 * is what the rule says rather than what one machine happens to need, because
 * the next machine has a deeper home directory.
 *
 * It is the maxdepth for the `.git` directory ITSELF, so 5 finds a project four
 * folders inside the home directory. {@link remoteRepoFindFolderDepth} is the
 * number a person reads on screen.
 */
export const REMOTE_REPO_FIND_DEPTH = 5;

/** How many git folders one answer may carry. 200. */
export const REMOTE_REPO_FIND_MAX = 200;

/**
 * How long one walk gets before it is killed. 20,000 ms.
 *
 * A DEADLINE AND NOT AN EXPECTATION. Research 55 measured one warm call at
 * 35.9 ms against a machine on a tailnet, and a walk of a whole home directory
 * is more work than that. This number is what stops a sleeping machine holding
 * the create sheet open.
 */
export const REMOTE_REPO_FIND_TIMEOUT_MS = 20_000;

/** The depth a person reads, which is the `.git` depth less one. */
export function remoteRepoFindFolderDepth(): number {
  return REMOTE_REPO_FIND_DEPTH - 1;
}

// ---------------------------------------------------------------------------
// The address, and every part of this is a comparison rather than a resolution
// ---------------------------------------------------------------------------

/** One git address, split into the two parts a comparison needs. */
export interface RemoteRepoAddress {
  /** The host, lowercased. */
  readonly host: string;
  /** The path with no leading slash, exactly as it was written. */
  readonly path: string;
}

/** A scheme, then `://`. `file` is deliberately not one of the answers. */
const SCHEME_RE = /^([a-z][a-z0-9+.-]*):\/\/(.*)$/i;

/** The short form, being `user@host:owner/repo`. */
const SHORT_RE = /^[^/@\s]+@([^/:\s]+):(.+)$/;

/**
 * One address into its host and its path, or null. PURE.
 *
 * The forms that answer are `https://`, `http://`, `ssh://`, `git://` and the
 * short form. A path on this Mac, a `file://` address and anything that does
 * not parse answer null, because none of them names something another computer
 * can reach.
 */
export function parseRepoAddress(url: string): RemoteRepoAddress | null {
  const raw = url.trim();
  if (raw.length === 0) return null;
  const scheme = SCHEME_RE.exec(raw);
  if (scheme !== null) {
    const name = (scheme[1] ?? '').toLowerCase();
    if (name !== 'https' && name !== 'http' && name !== 'ssh' && name !== 'git') {
      return null;
    }
    const rest = scheme[2] ?? '';
    const slash = rest.indexOf('/');
    if (slash <= 0) return null;
    const authority = rest.slice(0, slash);
    const path = rest.slice(slash + 1);
    // The account name and the port are dropped on purpose. A folder cloned
    // over a sign in key and the same repository fetched over the web address
    // differ in exactly those two places and in nothing else.
    const at = authority.lastIndexOf('@');
    const hostPort = at >= 0 ? authority.slice(at + 1) : authority;
    const colon = hostPort.lastIndexOf(':');
    const host = colon > 0 ? hostPort.slice(0, colon) : hostPort;
    if (host.length === 0 || path.length === 0) return null;
    return { host: host.toLowerCase(), path };
  }
  const short = SHORT_RE.exec(raw);
  if (short !== null) {
    const host = (short[1] ?? '').toLowerCase();
    const path = short[2] ?? '';
    if (host.length === 0 || path.length === 0 || path.startsWith('/')) {
      return null;
    }
    return { host, path };
  }
  return null;
}

/**
 * The key two addresses are compared on, or null. PURE.
 *
 * The lowercase host, a slash, then the path with its leading and trailing
 * slashes and ONE trailing `.git` removed. The account name and the port are
 * already gone, so an address written for a sign in key matches the same
 * repository written as a web address.
 *
 * THIS KEY IS A COMPARISON AND NOTHING ELSE. No file read, no git read and no
 * search is ever built from it.
 */
export function remoteRepoKey(url: string): string | null {
  const parsed = parseRepoAddress(url);
  if (parsed === null) return null;
  let path = parsed.path;
  while (path.startsWith('/')) path = path.slice(1);
  while (path.endsWith('/')) path = path.slice(0, -1);
  if (path.endsWith('.git')) path = path.slice(0, -4);
  while (path.endsWith('/')) path = path.slice(0, -1);
  if (path.length === 0) return null;
  return `${parsed.host}/${path}`;
}

/**
 * The web address Tortie would send to a machine, or null. PURE.
 *
 * MEASURED on the operator's Mac Pro on 2026-08-18. Its `~/.ssh` holds only
 * `authorized_keys` and no key of its own, so an address written for a sign in
 * key cannot authenticate from there and a web address can. So every form is
 * rewritten to `https://` before anything crosses, and the trailing `.git` is
 * kept because that is how the address was written.
 */
export function remoteCloneUrl(url: string): string | null {
  const parsed = parseRepoAddress(url);
  if (parsed === null) return null;
  let path = parsed.path;
  while (path.startsWith('/')) path = path.slice(1);
  if (path.length === 0) return null;
  return `https://${parsed.host}/${path}`;
}

// ---------------------------------------------------------------------------
// The answer from the machine
// ---------------------------------------------------------------------------

/** One git folder that machine reported. */
export interface RemoteRepoRow {
  /** The origin address, decoded. */
  readonly url: string;
  /** The folder, exactly as the machine printed it. */
  readonly path: string;
}

/**
 * One `repo-find` payload into its rows. PURE.
 *
 * Each line is the base64 of the origin address, one space, and then the path
 * as THE REST OF THE LINE. The path is last because a folder on another
 * computer can hold a space in its name. A line that does not carry both parts
 * is dropped rather than guessed at.
 *
 * TWO DECODED ADDRESSES ARE DROPPED AND NO OTHERS, being one that decodes to
 * nothing and one that holds a newline. Every other byte survives into
 * `row.url`, control bytes included, and that is deliberate rather than
 * missed. The address is turned into a comparison key by
 * {@link remoteRepoKey} and is never sent to a machine, never handed to a
 * shell and never resolved, so an odd byte inside one can reach nothing. A
 * newline is dropped because it would split one row into two.
 */
export function parseRepoFind(payload: string): RemoteRepoRow[] {
  if (payload === 'none') return [];
  const out: RemoteRepoRow[] = [];
  for (const line of payload.split('\n')) {
    const space = line.indexOf(' ');
    if (space <= 0) continue;
    const encoded = line.slice(0, space);
    const path = line.slice(space + 1);
    if (path.length === 0) continue;
    let url: string;
    try {
      url = Buffer.from(encoded, 'base64').toString('utf8');
    } catch {
      continue;
    }
    if (url.length === 0 || url.includes('\n')) continue;
    out.push({ url, path });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The one read, and what is held between two of them
// ---------------------------------------------------------------------------

/** What one machine last reported, and the connection it reported it on. */
interface HeldWalk {
  readonly generation: number;
  readonly rows: readonly RemoteRepoRow[];
  readonly tookMs: number;
}

const walks = new Map<string, HeldWalk>();

/**
 * Forget what ONE machine last answered.
 *
 * The held answer stops being true the moment a folder appears over there, and
 * this product has exactly one thing that makes a folder appear over there,
 * being the copy in `./remote-clone.ts`. That module calls this the moment it
 * sends the copy. Without it a person who copies into the suggested folder and
 * opens the create sheet again on the same connection reads that no folder over
 * there has this project's git remote, and is offered the copy a second time.
 * Nothing would be copied twice, because the script tests the destination
 * first, but the sentence would be wrong.
 *
 * It is called on every outcome after the copy is sent and not only on the
 * ones that worked, because a copy that hit the deadline or lost its link can
 * leave a folder behind too.
 */
export function forgetRemoteProjectWalk(machineId: string): void {
  walks.delete(machineId);
}

/** Forget every remembered walk. Tests and the smoke. */
export function resetRemoteProjectFindForTests(): void {
  walks.clear();
}

/** How many times a machine was asked since the last reset. The smoke reads it. */
let walksSent = 0;

/** How many `repo-find` calls have crossed since the last reset. */
export function remoteProjectWalkCount(): number {
  return walksSent;
}

/** Forget the count as well. Tests and the smoke. */
export function resetRemoteProjectWalkCountForTests(): void {
  walksSent = 0;
}

/** The label a person reads for one machine, or its id when it has no row. */
function labelOf(machineId: string): string {
  const row = machineRow(machineId);
  return row === null ? machineId : machineLabelOf(row);
}

/**
 * This project's origin address on THIS Mac, or null.
 *
 * `git config --get remote.origin.url` and nothing else. A folder that is not
 * inside a repository, and a repository with no origin, both answer null, which
 * is the same thing to a caller: there is nothing to look for over there.
 */
export async function readOriginUrl(localPath: string): Promise<string | null> {
  if (localPath.length === 0) return null;
  try {
    const out = await runGit(
      localPath,
      ['config', '--get', 'remote.origin.url'],
      { timeoutMs: 5_000 }
    );
    if (out.code !== 0) return null;
    const url = out.stdout.toString('utf8').trim();
    return url.length === 0 ? null : url;
  } catch {
    return null;
  }
}

/**
 * Ask one machine for every git folder under one root.
 *
 * An empty root is that machine's own `$HOME`, resolved by that machine's own
 * shell. Tortie composes no home path for another computer.
 */
export async function walkRemoteRepos(
  ctx: RemoteMachineContext,
  root: string,
  depth: number
): Promise<readonly RemoteRepoRow[]> {
  walksSent += 1;
  const answer = await runRemoteRead(
    ctx,
    'repo-find',
    [root, String(depth), String(REMOTE_REPO_FIND_MAX)],
    { timeoutMs: REMOTE_REPO_FIND_TIMEOUT_MS }
  );
  return parseRepoFind(answer.payload);
}

/**
 * The destination a copy would use, or null. PURE.
 *
 * `<that machine's own home>/<the basename of the project folder here>`. The
 * home is that machine's own answer and never a guess, so a machine that did
 * not say what its home is produces no destination and the sheet asks the
 * person to type one.
 */
export function suggestedClonePath(
  home: string,
  localPath: string
): string | null {
  if (!home.startsWith('/')) return null;
  const leaf = basename(localPath);
  if (leaf.length === 0 || leaf === '/' || leaf === '.') return null;
  const base = home.endsWith('/') ? home.slice(0, -1) : home;
  return `${base}/${leaf}`;
}

/** The whole answer for one outcome that contacted nothing. */
function noMachine(
  outcome: RemoteProjectFindOutcome,
  originUrl: string | null,
  sentences: readonly string[]
): RemoteProjectFindResult {
  return {
    outcome,
    originUrl,
    cloneUrl: null,
    translated: false,
    matches: [],
    matchTotal: 0,
    searched: 0,
    suggestedPath: null,
    sentences,
    tookMs: 0
  };
}

/**
 * Where this project is on one machine, and what to say about it.
 *
 * IT NEVER THROWS FOR ANYTHING A MACHINE SAID. Every state comes back as a
 * typed outcome with sentences, the way `./dir-list.ts` already answers with a
 * refusal rather than an exception. A surface never reads prose out of an
 * error.
 *
 * The order is the design. The local read happens FIRST, so a project with no
 * remote and a project whose remote is a folder on this Mac each contact the
 * machine ZERO times.
 */
export async function findProjectOnMachine(
  input: RemoteProjectFindInput
): Promise<RemoteProjectFindResult> {
  const label = labelOf(input.machineId);

  // 1. This Mac's own answer, before any machine is contacted at all.
  const originUrl = await readOriginUrl(input.localPath);
  if (originUrl === null) {
    return noMachine('noRemote', null, [counterpartNoRemote(label)]);
  }
  const key = remoteRepoKey(originUrl);
  const cloneUrl = remoteCloneUrl(originUrl);
  if (key === null || cloneUrl === null) {
    return noMachine('localRemote', originUrl, [counterpartLocalRemote(label)]);
  }
  const translated = !originUrl.startsWith('https://');

  // 2. The machine, once.
  const unreachable = (): RemoteProjectFindResult => ({
    outcome: 'unreachable',
    originUrl,
    cloneUrl,
    translated,
    matches: [],
    matchTotal: 0,
    searched: 0,
    suggestedPath: null,
    sentences: [counterpartUnreachable(label)],
    tookMs: 0
  });
  let ctx: RemoteMachineContext;
  try {
    ctx = readyRemoteContext(input.machineId);
  } catch {
    return unreachable();
  }
  const generation = machineGeneration(input.machineId).generation;
  const held = walks.get(input.machineId);
  let rows: readonly RemoteRepoRow[];
  let tookMs: number;
  if (held !== undefined && held.generation === generation) {
    rows = held.rows;
    tookMs = held.tookMs;
  } else {
    const from = Date.now();
    try {
      rows = await walkRemoteRepos(ctx, '', REMOTE_REPO_FIND_DEPTH);
    } catch {
      return unreachable();
    }
    tookMs = Date.now() - from;
    walks.set(input.machineId, { generation, rows, tookMs });
  }

  // 3. The match, which is a comparison of two keys and nothing else.
  const hits = rows.filter((row) => remoteRepoKey(row.url) === key);
  const matches: RemoteProjectMatch[] = hits
    .slice(0, REMOTE_PROJECT_MATCH_MAX)
    .map((row) => ({ path: row.path }));
  const searchRule = counterpartSearchRule(label, remoteRepoFindFolderDepth());

  if (hits.length === 1) {
    const one = matches[0]?.path ?? '';
    return {
      outcome: 'found',
      originUrl,
      cloneUrl,
      translated,
      matches,
      matchTotal: hits.length,
      searched: rows.length,
      suggestedPath: null,
      sentences: [counterpartFound(label, one), searchRule],
      tookMs
    };
  }
  if (hits.length > 1) {
    return {
      outcome: 'several',
      originUrl,
      cloneUrl,
      translated,
      matches,
      matchTotal: hits.length,
      searched: rows.length,
      suggestedPath: null,
      sentences: [counterpartSeveral(label, hits.length), searchRule],
      tookMs
    };
  }

  // 4. Nothing over there matches. This is the ONE outcome that offers a write,
  //    so the destination is composed from that machine's own home directory.
  let home = '';
  try {
    home = await remoteMachineHome(ctx);
  } catch {
    home = '';
  }
  const sentences = [counterpartAbsent(label, rows.length), searchRule];
  if (translated) {
    sentences.push(counterpartTranslated(originUrl, cloneUrl, label));
  }
  return {
    outcome: 'absent',
    originUrl,
    cloneUrl,
    translated,
    matches: [],
    matchTotal: 0,
    searched: rows.length,
    suggestedPath: suggestedClonePath(home, input.localPath),
    sentences,
    tookMs
  };
}
