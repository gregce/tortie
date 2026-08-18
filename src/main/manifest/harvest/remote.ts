/**
 * Reading an agent's own store on ANOTHER machine, decided here and fetched
 * elsewhere (Phase 73, M6, research 51 section 6 row M6).
 *
 * ## What this module is
 *
 * The pure half of connected-only harvest. It has no I/O, no Electron, no
 * timers and no knowledge of ssh. It answers four questions about a machine
 * Tortie is connected to:
 *
 *  1. Which directories on that machine hold this agent's sessions.
 *  2. Which lines of a listing of those directories are candidate records.
 *  3. Whether the first bytes of one record say it belongs to this session.
 *  4. Which candidate wins, and how strongly the claim may be held.
 *
 * The live half is `../../machines/remote-harvest.ts`. It sends the reads and
 * writes the answer to the manifest. The seam is deliberate and it is the same
 * seam ./stores.ts and ./watch.ts already have.
 *
 * ## What is reused rather than restated, and it is most of the module
 *
 * The store layouts are already data. `DESCRIPTORS` in ./stores.ts holds, per
 * agent, the roots to look under, the depth to walk and the rule that turns a
 * path into a conversation id. Two of those three are pure functions of a home
 * directory and an environment, and a home directory on another computer is
 * still a home directory. So `remoteHarvestRoots` calls the descriptor's own
 * `roots(ctx, de)` with the FAR SIDE's home, and `parseRemoteListing` calls the
 * descriptor's own `identify(path)`. Neither is copied here.
 *
 * The third, `confirm(path, ctx)`, is NOT reused. It opens files on this Mac,
 * and there is no file on this Mac to open. {@link confirmRemoteCandidate}
 * re-implements the checks that can be made from head bytes alone, as a switch
 * over the agent id whose default answers `unknown`, so an agent nobody
 * measured never produces a match.
 *
 * ## What this cannot do, said here rather than found later
 *
 * FOUR OF THE THIRTEEN AGENTS ARE HANDLED AND TWO ARE OWED. qwen keys on a
 * process id and antigravity keys on open file descriptors. Both need a read
 * of the far side's process table, and this rung sends no such read. Both are
 * recorded as owed in docs/BACKLOG.md rather than given a weaker answer here.
 * The remaining seven agents pre-assign their conversation id, so they need no
 * harvest at all.
 *
 * ONLY ONE OF THE FOUR PRODUCES AN ARMED RESUME. muse stamps the pane it runs
 * in, and a completed list from that machine already reports that pane's own
 * identifier, so the two can be compared. codex, deepseek and pi key on a
 * FOLDER, and a folder is not an identity. Their answers are recorded and
 * `../../machines/resume-arming.ts` refuses to type them. See
 * {@link remoteKeyConfidence} for why that refusal is by construction.
 *
 * NO PATH IS RESOLVED. `realpath` is a local call, and this Mac cannot resolve
 * a symbolic link on a different computer. So a folder comparison here is a
 * comparison of two strings. A far side that spells one folder two ways
 * produces `mismatch` and therefore no claim, which is a refusal rather than a
 * wrong answer.
 *
 * Ownership: src/main/manifest/**. Pure (no I/O, no Electron, no timers).
 */

import type { LaunchableAgentId } from '@shared/types';
import type { AgentHarvestKey } from '../../agents/registry';
import {
  claimStrengthForKey,
  IDENTITY_HARVEST_KEYS,
  type ClaimStrength
} from './claim-strength';
import { DESCRIPTORS, type HarvestDescriptor } from './stores';

// ---------------------------------------------------------------------------
// What a machine tells Tortie about itself
// ---------------------------------------------------------------------------

/**
 * The far side's own answer about where it keeps things.
 *
 * It is read once per connection by the `machine-facts` script and never
 * composed on this Mac. Tortie does not know another computer's home directory
 * and will not guess one: every root below is built from the value that machine
 * printed.
 */
export interface RemoteHarvestFacts {
  /** The far side's `HOME`, as it printed it. Always absolute. */
  readonly home: string;
  /**
   * The far side's environment, holding the two names the descriptors read and
   * nothing else, being `CODEX_HOME` and `XDG_DATA_HOME`.
   *
   * A name that machine does not set is absent rather than empty, because the
   * descriptors treat an empty value and a missing one differently.
   */
  readonly env: Record<string, string>;
  /** What that machine's `uname -s` printed, e.g. `Darwin`. */
  readonly platform: string;
}

/**
 * The two environment names a remote harvest carries home.
 *
 * WHAT THIS LEAVES OWED, said here rather than found later. pi's own descriptor
 * reads two more names, being `PI_CODING_AGENT_SESSION_DIR` and
 * `PI_CODING_AGENT_DIR`, and neither crosses. A machine that sets either of
 * them keeps its pi conversations somewhere this rung does not look, so pi
 * produces no candidate there and therefore no claim. That is a miss rather
 * than a wrong answer, and it is recorded in docs/BACKLOG.md with the other
 * four owed lines. Adding a name means adding it to the `machine-facts` script
 * in `../../machines/remote-scripts.ts` as well as here.
 */
export const REMOTE_FACT_ENV_NAMES: readonly string[] = [
  'CODEX_HOME',
  'XDG_DATA_HOME'
];

/**
 * What the `machine-facts` script names each fact, and what it means here.
 *
 * The names are lower case on the wire because the script prints its own labels
 * rather than echoing environment names, so a login file that exports something
 * odd cannot make its own line look like an answer.
 */
const FACT_NAMES: Record<string, string> = {
  home: 'HOME',
  codex_home: 'CODEX_HOME',
  xdg_data_home: 'XDG_DATA_HOME',
  uname: 'UNAME'
};

/**
 * The `machine-facts` payload, parsed.
 *
 * The format is one `name=value` per line, being `home`, `codex_home`,
 * `xdg_data_home` and `uname` in that order. A name Tortie did not ask for is
 * dropped. An EMPTY value means the far side does not set that name, and it is
 * dropped rather than stored, because the store descriptors treat an empty
 * value and a missing one differently: an empty `CODEX_HOME` has to fall back
 * to `$HOME/.codex` and a stored empty string would compose `/sessions`.
 *
 * Returns null when `home` is missing or is not an absolute path. That is a
 * refusal rather than a guess, and it is the rule
 * `../../machines/remote-path.ts` already follows: an answer with no usable
 * value produces no claim.
 */
export function parseMachineFacts(payload: string): RemoteHarvestFacts | null {
  const env: Record<string, string> = {};
  let home = '';
  let platform = '';
  for (const raw of payload.split('\n')) {
    const line = raw.trim();
    const cut = line.indexOf('=');
    if (cut <= 0) continue;
    const name = FACT_NAMES[line.slice(0, cut).toLowerCase()] ?? '';
    const value = line.slice(cut + 1);
    if (value.length === 0) continue;
    if (name === 'HOME') home = value;
    else if (name === 'UNAME') platform = value;
    else if (REMOTE_FACT_ENV_NAMES.includes(name)) env[name] = value;
  }
  if (!home.startsWith('/')) return null;
  return { home, env, platform };
}

// ---------------------------------------------------------------------------
// The agents this rung can ask about
// ---------------------------------------------------------------------------

/**
 * The agents a connection can harvest, and the four are chosen by a rule.
 *
 * The rule: the record's own ownership field has to be readable from the first
 * bytes of one file. codex, muse, deepseek and pi all write one. qwen writes a
 * process id, and antigravity writes nothing at all on disk that links a
 * conversation to a folder, so both need a read of the far side's process
 * table. This rung sends no such read, and giving either of them a folder
 * match instead would be a claim with no evidence behind it.
 */
export const REMOTE_HARVEST_AGENTS: readonly LaunchableAgentId[] = [
  'codex',
  'muse',
  'deepseek',
  'pi'
];

/** True when a connection can look for this agent's records. */
export function remoteHarvestsId(agent: LaunchableAgentId): boolean {
  return REMOTE_HARVEST_AGENTS.includes(agent) && DESCRIPTORS[agent] !== undefined;
}

/** The descriptor this rung is allowed to use for an agent, or null. */
function remoteDescriptor(agent: LaunchableAgentId): HarvestDescriptor | null {
  if (!REMOTE_HARVEST_AGENTS.includes(agent)) return null;
  return DESCRIPTORS[agent] ?? null;
}

/** Which key proves this agent's record, or null when none can. */
export function remoteHarvestKey(agent: LaunchableAgentId): AgentHarvestKey | null {
  return remoteDescriptor(agent)?.key ?? null;
}

/**
 * What this agent's key is worth OVER A CONNECTION.
 *
 * It is NOT always the descriptor's own rating, and the difference is the whole
 * honesty of this rung. The descriptor rates a key for a watcher that started
 * BEFORE the session did and saw the record appear. Nothing here watched
 * anything. A listing taken minutes or hours after the session started says
 * which records exist now, and for a key that names a FOLDER every session of
 * that agent that ever ran in that folder produces the same answer.
 *
 * So a key that is a true identity keeps the descriptor's rating, and every
 * other key is worth `weak` here whatever it is worth locally. codex's own
 * descriptor rates `cwd-newest` as `exact` locally, because the local watcher
 * is bounded by a spawn instant it observed. Over a connection it is `weak`,
 * and `deriveResumeConfidence` in ../agents.ts then records `weak`, and
 * ../../machines/resume-arming.ts then refuses to type it. That chain is the
 * mechanism behind the one line of the matrix that matters: exactly one of the
 * thirteen agents gets an armed conversation resume on another machine from
 * this rung, and it is muse.
 */
export function remoteKeyConfidence(agent: LaunchableAgentId): 'exact' | 'weak' {
  const descriptor = remoteDescriptor(agent);
  if (descriptor === null) return 'weak';
  return IDENTITY_HARVEST_KEYS.has(descriptor.key) ? descriptor.confidence : 'weak';
}

// ---------------------------------------------------------------------------
// The roots to ask for
// ---------------------------------------------------------------------------

/** What one machine has to be asked for, on behalf of one session. */
export interface RemoteHarvestPlan {
  /** Absolute directories on that machine. They may not exist, and that is fine. */
  readonly roots: string[];
  /** How deep the listing walks. 0 means the direct children of a root. */
  readonly maxDepth: number;
}

/**
 * The directories to list on that machine, from the agent's own descriptor.
 *
 * `roots(ctx, de)` is a pure function of a working directory, a home directory
 * and an environment, so it answers for another computer as readily as for this
 * one. The context it is given carries the far side's working directory and a
 * spawn instant of 0, because no descriptor's `roots` reads the instant and
 * passing a local clock into a question about another machine would be a value
 * nobody could defend.
 *
 * `recurse` is deliberately NOT used. It filters date shards by comparing them
 * with this Mac's own clock, and the listing on the far side is bounded by an
 * mtime floor instead, which is a stronger bound and needs no clock agreement.
 *
 * Returns null for an agent this rung cannot ask about.
 */
export function remoteHarvestRoots(
  agent: LaunchableAgentId,
  cwd: string,
  facts: RemoteHarvestFacts
): RemoteHarvestPlan | null {
  const descriptor = remoteDescriptor(agent);
  if (descriptor === null) return null;
  // The far side lists files. Every descriptor this rung uses has `entry:
  // 'file'`, and a store whose candidates are DIRECTORIES is one of the two
  // this rung leaves owed.
  if (descriptor.entry !== 'file') return null;
  const roots = descriptor.roots(
    { cwd, sinceTs: 0 },
    { home: facts.home, env: { ...facts.env } }
  );
  const usable = roots.filter((root) => root.startsWith('/'));
  if (usable.length === 0) return null;
  return { roots: usable, maxDepth: descriptor.maxDepth };
}

// ---------------------------------------------------------------------------
// The listing
// ---------------------------------------------------------------------------

/** One record on that machine that could be this session's conversation. */
export interface RemoteCandidate {
  /** Absolute path ON THAT MACHINE. */
  readonly path: string;
  /** The file's own last write time, from that machine's clock, in ms. */
  readonly mtimeMs: number;
  readonly bytes: number;
  /** The conversation id the path carries. */
  readonly sessionId: string;
  /** The instant the FILENAME carries, when it carries one. */
  readonly nameTs?: number;
  /**
   * The instant this candidate is ordered by, being the filename's instant when
   * there is one and the file's own write time otherwise. It is the same rule
   * `orderTs` follows in ./watch.ts.
   */
  readonly orderTs: number;
}

/** One line of a `store-list` answer: `<mtime seconds> <size bytes> <path>`. */
const LISTING_LINE = /^(\d+)\s+(\d+)\s+(.*)$/;

/**
 * Turn a listing into candidates, using the agent's own `identify`.
 *
 * The freshness rule is ./watch.ts's rule, restated for a listing rather than
 * for a directory scan, and the two must not drift. A filename instant OR the
 * file's own write time at or after `sinceMs` is enough, because a filename
 * instant can lag the write and a write time can move when an old file is
 * archived. The exception is a descriptor whose filename instant IS the
 * session's start time, being pi: there an older name settles the question, and
 * letting the write time re-admit the file is how a conversation from months
 * ago would look like it started with this session.
 *
 * A path with no id in it is not a candidate and is dropped without comment.
 * That is most of a real store: codex's `sessions` tree holds one directory per
 * day and this rung only wants the rollout files inside them. The one word a
 * machine sends when its listing matched nothing is dropped by the same rule,
 * because it is not a line of three fields.
 */
export function parseRemoteListing(
  agent: LaunchableAgentId,
  lines: readonly string[],
  sinceMs: number
): RemoteCandidate[] {
  const descriptor = remoteDescriptor(agent);
  if (descriptor === null) return [];
  const out = new Map<string, RemoteCandidate>();
  for (const raw of lines) {
    const line = raw.trimEnd();
    const parts = LISTING_LINE.exec(line);
    if (parts === null) continue;
    const seconds = Number(parts[1]);
    const bytes = Number(parts[2]);
    const path = parts[3] ?? '';
    if (!Number.isFinite(seconds) || !Number.isFinite(bytes)) continue;
    if (!path.startsWith('/')) continue;
    const parsed = descriptor.identify(path);
    if (parsed === null) continue;
    const mtimeMs = seconds * 1_000;
    const nameTs = parsed.nameTs;
    const nameFresh = nameTs !== undefined && nameTs >= sinceMs;
    const nameDecides = descriptor.nameTsIsAuthoritative === true && nameTs !== undefined;
    if (!nameFresh && nameDecides) continue;
    if (!nameFresh && mtimeMs < sinceMs) continue;
    const candidate: RemoteCandidate = {
      path,
      mtimeMs,
      bytes,
      sessionId: parsed.sessionId,
      ...(nameTs !== undefined ? { nameTs } : {}),
      orderTs: nameTs ?? mtimeMs
    };
    // One candidate per conversation id. A store that lists the same id twice,
    // e.g. an archived copy beside a live one, keeps the newer path, which is
    // the path a read would find something in.
    const held = out.get(parsed.sessionId);
    if (held === undefined || held.mtimeMs <= mtimeMs) {
      out.set(parsed.sessionId, candidate);
    }
  }
  return [...out.values()];
}

// ---------------------------------------------------------------------------
// The confirm, from head bytes alone
// ---------------------------------------------------------------------------

/** 'match' = proven this session's; 'mismatch' = proven not; 'unknown' = cannot tell. */
export type RemoteConfirmVerdict = 'match' | 'mismatch' | 'unknown';

/** What Tortie knows about the session it is harvesting for, on that machine. */
export interface RemoteHarvestSession {
  /** The working directory ON THAT MACHINE, exactly as the row records it. */
  readonly cwd: string;
  /**
   * The far side's own immutable identifier for the session, e.g. `$4`.
   *
   * It comes from a completed list from that machine and from nowhere else. It
   * is what makes muse's key work over a connection: muse stamps the pane it
   * runs in as `$4:@4.%5`, and Tortie knows the `$4`.
   */
  readonly remotePaneKey?: string;
}

/** The first JSON object on a line of the head bytes, or null. */
function firstJsonLine(head: string): Record<string, unknown> | null {
  for (const line of head.split('\n')) {
    const text = line.trim();
    if (text.length === 0) continue;
    try {
      const parsed: unknown = JSON.parse(text);
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null; // truncated or not JSON. The caller degrades to 'unknown'.
    }
    return null;
  }
  return null;
}

/** Every parseable JSON object in the head bytes, in order. */
function jsonLines(head: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const line of head.split('\n')) {
    const text = line.trim();
    if (text.length === 0) continue;
    try {
      const parsed: unknown = JSON.parse(text);
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        out.push(parsed as Record<string, unknown>);
      }
    } catch {
      // A truncated trailing line is expected: the read is capped at 8 KB.
      break;
    }
  }
  return out;
}

/** The whole head parsed as one JSON document, or null. */
function jsonDocument(head: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(head);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null; // capped before the closing brace, or still being written
  }
}

/**
 * Two folder paths, compared as strings.
 *
 * There is no `realpath` here and there cannot be. Both paths belong to another
 * computer and this Mac cannot resolve a link there. A trailing slash is the one
 * difference removed, because it is spelling rather than a different folder.
 */
function sameRemotePath(a: string, b: string): boolean {
  const trim = (value: string): string =>
    value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value;
  return trim(a) === trim(b);
}

/**
 * Does this record belong to this session? Decided from head bytes alone.
 *
 * It is a switch over the agent id, and the `default` answers `unknown`. That
 * shape is the safety property: an agent nobody measured can never produce a
 * match, so it can never produce a claim, so a later reader can never be handed
 * somebody else's conversation because a thirteenth agent was added to a list.
 *
 * muse is the only arm that can answer from an IDENTITY. It reads the pane the
 * agent stamped and compares it with the pane the far side's own list reported.
 * It deliberately has NO fallback to the folder and NO fallback to a process id.
 * A folder fallback would be a folder match wearing an identity key, and a
 * process id on another machine cannot be walked from here. Both would turn
 * `weak` evidence into an `exact` record, which is the one mistake this whole
 * rung is arranged to avoid.
 */
export function confirmRemoteCandidate(
  agent: LaunchableAgentId,
  head: string,
  ctx: RemoteHarvestSession
): RemoteConfirmVerdict {
  switch (agent) {
    case 'codex': {
      const first = firstJsonLine(head);
      if (first === null) return 'unknown';
      const payload = first['payload'];
      const cwdRaw =
        payload !== null && typeof payload === 'object'
          ? (payload as Record<string, unknown>)['cwd']
          : first['cwd'];
      if (typeof cwdRaw !== 'string') return 'unknown';
      return sameRemotePath(cwdRaw, ctx.cwd) ? 'match' : 'mismatch';
    }
    case 'muse': {
      const facts = museRouteFacts(head);
      if (facts === null) return 'unknown';
      const pane = facts['tmux_pane'];
      if (typeof pane !== 'string' || ctx.remotePaneKey === undefined) {
        return 'unknown';
      }
      // "$4:@4.%5". Tortie gives every session exactly one pane, so the
      // session part of that identifier is a complete identity.
      return pane.startsWith(`${ctx.remotePaneKey}:`) ? 'match' : 'mismatch';
    }
    case 'deepseek': {
      const doc = jsonDocument(head);
      const meta = doc?.['metadata'];
      if (meta === null || meta === undefined || typeof meta !== 'object') {
        return 'unknown';
      }
      const workspace = (meta as Record<string, unknown>)['workspace'];
      if (typeof workspace !== 'string') return 'unknown';
      return sameRemotePath(workspace, ctx.cwd) ? 'match' : 'mismatch';
    }
    case 'pi': {
      const first = firstJsonLine(head);
      if (first === null || first['type'] !== 'session') return 'unknown';
      const cwd = first['cwd'];
      if (typeof cwd !== 'string') return 'unknown';
      return sameRemotePath(cwd, ctx.cwd) ? 'match' : 'mismatch';
    }
    default:
      return 'unknown';
  }
}

/**
 * muse stamps the pane into `runtime.session.route_facts`, which it writes at
 * session open, before any prompt. ./stores.ts reads the same record from a
 * file. This reads it from bytes that came over a connection.
 */
function museRouteFacts(head: string): Record<string, unknown> | null {
  for (const line of jsonLines(head)) {
    if (line['payload_type'] !== 'runtime.session.route_facts') continue;
    const payload = line['payload'];
    if (payload === null || typeof payload !== 'object') continue;
    const record = (payload as Record<string, unknown>)['record'];
    if (record === null || record === undefined || typeof record !== 'object') {
      continue;
    }
    return record as Record<string, unknown>;
  }
  return null;
}

// ---------------------------------------------------------------------------
// The decision
// ---------------------------------------------------------------------------

/** The winner of one pass, and everything a manifest row needs to say about it. */
export interface RemoteHarvestWinner {
  readonly candidate: RemoteCandidate;
  readonly key: AgentHarvestKey;
  readonly keyConfidence: 'exact' | 'weak';
  readonly strength: ClaimStrength;
  /**
   * Candidates still in play when this one was chosen, this one included.
   *
   * A candidate the read RULED OUT is not counted. Everything else is, an
   * unclassified record included, because for a folder keyed store a record
   * nobody could classify could equally be this session's. Understating this
   * number is the one direction it may not fail in, which is ./watch.ts's rule
   * and it is not restated differently here.
   */
  readonly rivals: number;
}

/**
 * Which record this session gets, or null.
 *
 * THERE IS NO GRACE TIMER HERE, and its absence is deliberate. Locally, a grace
 * timer accepts a record nothing confirmed, because the watcher was there from
 * before the session started and knows nothing else appeared. A connection knows
 * no such thing: the listing is a photograph taken later, and accepting an
 * unconfirmed record from it would be a guess with no bound on how wrong it
 * could be. So a pass with no `match` writes nothing and the next pass asks
 * again.
 *
 * The pick among the matches is the EARLIEST record at or after the floor, which
 * is ./watch.ts's pick, for the same reason: a session's own record is written
 * at or just after it starts, so the earliest one that is still in play is the
 * best answer available. Ties break on the path, so two runs over one listing
 * give one answer.
 */
export function decideRemoteHarvest(
  agent: LaunchableAgentId,
  candidates: readonly RemoteCandidate[],
  verdicts: ReadonlyMap<string, RemoteConfirmVerdict>
): RemoteHarvestWinner | null {
  const descriptor = remoteDescriptor(agent);
  if (descriptor === null) return null;
  const inPlay = candidates.filter(
    (one) => verdicts.get(one.path) !== 'mismatch'
  );
  if (inPlay.length === 0) return null;
  const matches = inPlay
    .filter((one) => verdicts.get(one.path) === 'match')
    .sort((a, b) => {
      if (a.orderTs !== b.orderTs) return a.orderTs - b.orderTs;
      return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
    });
  const winner = matches[0];
  if (winner === undefined) return null;
  return {
    candidate: winner,
    key: descriptor.key,
    keyConfidence: remoteKeyConfidence(agent),
    // Never `provisional`, because nothing here rides a timer. An identity key
    // gives `confirmed` and a folder key gives `matched`, which is exactly what
    // the local ladder says about the same two keys.
    strength: claimStrengthForKey(descriptor.key, false),
    rivals: inPlay.length
  };
}

/**
 * Which root a winning path was found under, or the first root.
 *
 * The manifest records both the record's path and the root it was found under,
 * so a person reading a row later can see which of an agent's two stores
 * answered. codex and deepseek each have two.
 */
export function rootOfRemotePath(
  path: string,
  roots: readonly string[]
): string {
  const holding = roots
    .filter((root) => path === root || path.startsWith(`${root}/`))
    .sort((a, b) => b.length - a.length);
  return holding[0] ?? roots[0] ?? '';
}
