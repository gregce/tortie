/**
 * The ONE place a session on another machine meets the manifest (Phase 72, M5,
 * research 51 section 4.3).
 *
 * ## What changed, and why it is one module
 *
 * Phase 70's central rule was that nothing about a remote session is ever
 * written to the manifest. `./remote-sessions.ts` still carries that rule in its
 * header as the reason it imports nothing from `../manifest/`, and it is the
 * right rule for a build with no `machine_id` column, because a row that cannot
 * say which machine its session is on is a row a later restore can read as local
 * and recreate HERE.
 *
 * Phase 71 added the column. Phase 72 moved `MANIFEST_MIN_COMPATIBLE_VERSION`
 * from 8 to 13 and deleted the refusal that stood in for it, so the row can now
 * say which machine it belongs to and an older build is refused at the open
 * rather than trusted to behave. That makes the write correct, and it makes it
 * necessary: a session on another machine that leaves no record on this Mac
 * cannot be brought back, cannot appear in Past Sessions, and vanishes without
 * trace when Tortie is not running.
 *
 * Every one of those writes goes through this file. That is a boundary rather
 * than a convenience. A later reader checking "what can a remote path do to the
 * manifest" reads one module of about two hundred lines instead of auditing a
 * feed, four verbs and a restore.
 *
 * ## The store handle is injected rather than opened
 *
 * The machine layer must not open a second connection to a database this process
 * already holds open for writing, and it must not import `../manifest/store.ts`
 * eagerly either, because `build/contract-inventory.mjs` bundles that store on
 * its own to read the schema and a wider graph has crashed that gate before
 * (Phase 69). So `../sessions/core.ts` hands its own open store in at
 * construction and takes it away at dispose, and every function here answers
 * honestly when there is none: a unit test, a probe and the window between quit
 * and the next launch all reach this module with no store installed.
 *
 * ## What Phase 73 changed
 *
 * The paragraph that used to stand here said there was no harvest and no resume
 * argv, because Tortie read no agent's own files on another machine. That is no
 * longer true, and {@link writeRemoteHarvest} is the one write that made it
 * untrue. A session on a machine Tortie is CONNECTED to can now have its
 * conversation id read out of that agent's own store over there, and this module
 * is still the only place any of it reaches the manifest.
 *
 * The create time write is unchanged. A row starts life saying that nothing was
 * collected, because at create time nothing has been, and the harvest replaces
 * that record later or never. "Nothing was recorded" and "nothing could be
 * collected" are still different facts, and both are still said out loud.
 *
 * ## What is still NOT here
 *
 * No conversation id is ever written for an agent whose key is a process id or
 * an open file descriptor, being qwen and antigravity, because neither can be
 * checked from this Mac. No id is written while the machine is not answering.
 * No id already on a row is ever replaced by a remote read.
 */

import type { LaunchableAgentId, Session, SessionStatus } from '@shared/types';
import { getLog } from '../log';
// Phase 73. The one composer of a resume command, shared with the local harvest
// and with the launch path. A second composer in this tree would be a second
// answer to "what does resuming this agent look like".
import { registryResumeArgv, type AgentHarvestKey } from '../agents/registry';
// The LEAF modules rather than `../manifest`'s barrel, and every one of these
// but the contract version is a type. The barrel re-exports the recovery ring,
// the reconstruction surface and the boot path, and `build/contract-inventory.mjs`
// bundles the manifest store on its own to read the schema. Phase 69 measured
// what a wider graph costs that gate: one native module reached it and the gate
// crashed rather than diffed.
import type { ManifestStore } from '../manifest/store';
import type {
  MachineTombstone,
  ManifestSessionRecord
} from '../manifest/codecs';
import type { ResumeIdSource, ResumeProvenance } from '../manifest/agents';
// `deriveResumeConfidence` is the ONE function allowed to turn harvest evidence
// into a confidence, and nothing in this phase decides confidence beside it.
import {
  deriveResumeConfidence,
  SESSION_CONTRACT_VERSION
} from '../manifest/agents';
// The one definition of the word `local`. `../manifest/codecs.ts` keeps its own
// copy for the reason above, and `./__tests__/machine-id-migration.test.ts`
// asserts the two are the same string.
import { LOCAL_MACHINE_ID } from './context';

const machinesLog = getLog('config');

/**
 * The provenance source for a session on another machine that Tortie never got
 * a conversation id for.
 *
 * WHAT IT MEANS. Nothing was read for this session, so nothing can be checked.
 * It is a WEAKER source than every local one by construction. It is declared on
 * `ResumeIdSource` in `../manifest/agents.ts`, beside the six local sources.
 *
 * PHASE 73 GAVE IT A SIBLING rather than replacing it. The connected time store
 * harvest writes `remote-store-harvest` for the agents whose id can be read on
 * a machine, through `writeRemoteHarvest` below. This constant is what a create
 * writes, and it is what stays on every row the harvest cannot prove an id for.
 */
const REMOTE_NOT_COLLECTED: ResumeIdSource = 'remote-not-collected';

/**
 * The provenance source for a conversation id read off another machine.
 *
 * PHASE 73. It replaces {@link REMOTE_NOT_COLLECTED} on a row when a connected
 * read proved a record out. It is declared on `ResumeIdSource` in
 * `../manifest/agents.ts` beside the seven other sources, and
 * {@link writeRemoteHarvest} is its one producer.
 */
const REMOTE_STORE_HARVEST: ResumeIdSource = 'remote-store-harvest';

// ---------------------------------------------------------------------------
// The injected store
// ---------------------------------------------------------------------------

let store: ManifestStore | null = null;

/**
 * Install the open manifest, or take it away.
 *
 * Called twice per run of the app, by `../sessions/core.ts`: once in the
 * constructor with its own store, and once in `dispose()` with null, so a poll
 * landing after teardown writes to a closed database rather than being allowed
 * to try.
 */
export function setRemoteManifest(next: ManifestStore | null): void {
  store = next;
}

/** True while a store is installed. Every write below asks this first. */
export function remoteManifestInstalled(): boolean {
  return store !== null;
}

/**
 * The installed manifest.
 *
 * @throws Error when nothing is installed. It is a programming error rather than
 *   a state a person can reach: the app installs the store before any machine is
 *   signed in to, and a caller that can run with no store should be asking
 *   {@link remoteManifestInstalled} instead.
 */
export function remoteManifest(): ManifestStore {
  if (store === null) {
    throw new Error(
      'no manifest is installed for the machine layer. ' +
        'setRemoteManifest runs in the session core constructor.'
    );
  }
  return store;
}

// ---------------------------------------------------------------------------
// The reads
// ---------------------------------------------------------------------------

/** One row by Tortie's session id, or null. Null when no store is installed. */
export function remoteRecordOf(sessionId: string): ManifestSessionRecord | null {
  return store?.getSession(sessionId) ?? null;
}

/**
 * Every row recorded as living on one machine, oldest create first.
 *
 * Tombstoned rows are INCLUDED. A caller removing a machine has to see the rows
 * it already tombstoned so it does not write a second tombstone over the first,
 * and Past Sessions reads them through its own path anyway.
 */
export function remoteRecordsForMachine(
  machineId: string
): ManifestSessionRecord[] {
  if (store === null) return [];
  return store
    .listSessions()
    .filter((record) => (record.machineId ?? LOCAL_MACHINE_ID) === machineId);
}

/** True when this row names a machine other than this Mac. */
export function isRemoteRecord(record: ManifestSessionRecord): boolean {
  return (record.machineId ?? LOCAL_MACHINE_ID) !== LOCAL_MACHINE_ID;
}

// ---------------------------------------------------------------------------
// The create time write
// ---------------------------------------------------------------------------

/** What a remote create knows at the moment it writes its row. */
export interface RemoteRowInput {
  readonly sessionId: string;
  readonly machineId: string;
  /** The display name the person typed. */
  readonly name: string;
  /** The name that machine's own server will hold. */
  readonly tmuxName: string;
  /** The project tab's path, ON THAT MACHINE. */
  readonly projectPath: string;
  /** The working directory, ON THAT MACHINE. */
  readonly cwd: string;
  readonly agent: string;
  /**
   * The launch argv with the ABSOLUTE path captured on THAT MACHINE at
   * `argv[0]`. It is a record of which copy of the program the session
   * launched. It is never sent, and the launch stays by bare name.
   */
  readonly argv: readonly string[];
  /** The captured absolute path on its own, for the recovery contract's `bin`. */
  readonly bin: string;
  readonly createdAt: number;
  /** Environment deltas the create put on the line, if any. */
  readonly env?: Readonly<Record<string, string>>;
}

/**
 * Where the conversation id for a remote row came from, which is nowhere.
 *
 * `confidence: 'none'` says no claim is being made about an id, and the source
 * says why there is none. Both are needed: a source with no confidence beside it
 * cannot be rendered as anything honest, and `../manifest/contract.ts` requires
 * all three of `v`, `source` and `confidence` before it will read a record back.
 *
 * `cwd` is the path ON THAT MACHINE, as given. It is not realpath'd, because
 * realpath is a local call and this Mac cannot resolve a path on a different
 * computer.
 */
export function remoteResumeProvenance(input: {
  readonly machineId: string;
  readonly at: number;
  readonly cwd: string;
}): ResumeProvenance {
  return {
    v: SESSION_CONTRACT_VERSION,
    source: REMOTE_NOT_COLLECTED,
    confidence: 'none',
    at: input.at,
    cwd: input.cwd,
    // Which machine the id would have been fixed on. The arming gate reads it to
    // refuse a row whose id belongs to a different machine, without having to
    // read the row's own column a second time.
    machineId: input.machineId
  };
}

/**
 * Write the row for a session about to be created on a machine.
 *
 * CALLED BEFORE THE CREATE LINE IS SENT, which is the same order a local create
 * uses and the same order research 51 section 4.3 asks for. The row is the only
 * record that a session about to exist belongs to Tortie, and a session that
 * starts before its row is written is a session a crash can strand.
 *
 * Returns null when no store is installed, which is a unit test or a probe. The
 * create still runs, and the session is then a feed row with no manifest row,
 * which is exactly the shape every 0.34 and 0.35 remote session has.
 *
 * @throws whatever the insert throws. A row that cannot be written is a create
 *   that must not run, because the alternative is a live agent on another
 *   machine that Tortie has no record of.
 */
export function writeRemoteRow(
  input: RemoteRowInput
): ManifestSessionRecord | null {
  if (store === null) return null;
  const record: ManifestSessionRecord = {
    id: input.sessionId,
    name: input.name,
    tmuxName: input.tmuxName,
    // The paths on that machine, written as given. NO local existsSync runs
    // against either of them anywhere on this path: this Mac cannot answer for
    // a folder on a different computer, and asking would refuse a folder that is
    // perfectly there.
    projectPath: input.projectPath,
    cwd: input.cwd,
    agent: input.agent as Session['agent'],
    status: 'running',
    createdAt: input.createdAt,
    argv: [...input.argv],
    lastSeen: input.createdAt,
    machineId: input.machineId,
    // Nothing to resume. `resumeArgv` is left out rather than written empty, and
    // the provenance below is what says why.
    resumeCapture: 'unavailable',
    resumeProvenance: remoteResumeProvenance({
      machineId: input.machineId,
      at: input.createdAt,
      cwd: input.cwd
    }),
    agentContract: {
      v: SESSION_CONTRACT_VERSION,
      at: input.createdAt,
      // The path on THAT machine. It is what a person reads to see which copy of
      // the program the session launched, and it is bound to `machineId`.
      bin: input.bin,
      // NOT realpath'd, for the reason above. A remote path resolved locally
      // would name a folder on this Mac or nothing at all.
      cwdReal: input.cwd,
      projectReal: input.projectPath,
      // Every resume field says the same thing: there is no conversation to come
      // back. Reading the live registry for these would be the Phase 21 defect,
      // and the answers below are facts about this release rather than guesses
      // about the agent.
      requiresOriginalCwd: false,
      bareResumeIsDangerous: false,
      resumeStrategy: 'none',
      resumeTemplate: [],
      resumeExtrasPosition: 'trailing',
      idCapture: 'none',
      sessionStore: '',
      captureRouteVerified: false,
      flagsVerifiedVersion: null,
      flagsVerifiedAgainst: 'never'
    },
    ...(input.env !== undefined ? { env: { ...input.env } } : {})
  };
  return store.insertSession(record);
}

// ---------------------------------------------------------------------------
// The writes a completed list makes
// ---------------------------------------------------------------------------

/**
 * Record what one completed list from a machine said about one row.
 *
 * TWO DIFFERENT WRITES, and the difference is the point.
 *
 * The status is written ONLY WHEN IT CHANGES. A machine on a live connection
 * reports an event every time anything happens on it, and a status write per
 * event would be the busiest write in the product for a value that did not move.
 *
 * `last_seen` is written on EVERY completed list that holds the row, through a
 * one column statement. It is what the tombstone reads later to say when Tortie
 * last saw the session, and a value that is only refreshed on a change would
 * name the last time the status moved rather than the last time the session was
 * seen.
 *
 * A silent no-op when no store is installed or the id has no row. A remote
 * session created by 0.34 or 0.35 has no manifest row and the feed still reports
 * it on every pass.
 */
export function noteRemoteRowSeen(
  sessionId: string,
  status: SessionStatus,
  seenAt: number
): void {
  if (store === null) return;
  const record = store.getSession(sessionId);
  if (record === undefined) return;
  // A tombstoned row is not moved by a list. The machine was removed, and a late
  // pass from a connection that has not closed yet must not undo that.
  if (record.status === 'discarded') return;
  if (record.status === status) {
    store.setLastSeen(sessionId, seenAt);
    return;
  }
  store.setStatus(sessionId, status);
}

/**
 * Tombstone one row because a person removed the machine it runs on.
 *
 * Returns false when there is no store or no row, which is how a feed row with
 * no manifest row is handled: there is nothing to tombstone, and dropping it
 * from memory is the whole of what can be done for it.
 */
export function tombstoneRemoteRow(
  sessionId: string,
  tombstone: MachineTombstone
): boolean {
  if (store === null) return false;
  const record = store.getSession(sessionId);
  if (record === undefined) return false;
  if (record.status === 'discarded' && record.machineTombstone !== undefined) {
    // Already tombstoned by an earlier removal of the same machine. Writing a
    // second one would replace what Tortie last knew with what it knows now,
    // which is less.
    return false;
  }
  try {
    store.markMachineForgotten(sessionId, tombstone);
    return true;
  } catch (err) {
    machinesLog.warn(
      `could not record what Tortie last knew about ${sessionId} on ` +
        `${tombstone.machineId}: ${(err as Error).message}`
    );
    return false;
  }
}

// ---------------------------------------------------------------------------
// The write a connected harvest makes (Phase 73, M6)
// ---------------------------------------------------------------------------

/** What one connected read of an agent's own store on a machine produced. */
export interface RemoteHarvestWrite {
  readonly sessionId: string;
  readonly machineId: string;
  readonly agent: LaunchableAgentId;
  /** The conversation id the record on that machine carried. */
  readonly conversationId: string;
  /** The working directory ON THAT MACHINE, as the row records it. */
  readonly cwd: string;
  /** Local epoch ms this Mac accepted the answer. */
  readonly at: number;
  /** Which key proved the record. */
  readonly key: AgentHarvestKey;
  /**
   * What that key is worth OVER A CONNECTION.
   *
   * It is not always the descriptor's own rating, and
   * `../manifest/harvest/remote.ts` holds the rule and the reason. A key that
   * is not a true identity is worth 'weak' here whatever it is worth locally,
   * which is what makes the arming gate refuse three of the four agents this
   * rung can read.
   */
  readonly keyConfidence: 'exact' | 'weak';
  /** Candidates still in play when the winner was chosen, the winner included. */
  readonly rivals: number;
  /** The record's absolute path ON THAT MACHINE. */
  readonly storePath: string;
  /** The store root it was found under, on that machine. */
  readonly storeRoot: string;
}

/**
 * Record a conversation id read off another machine, with everything about how
 * good the evidence was.
 *
 * ## Five refusals, and every one of them returns null rather than throwing
 *
 * A harvest is a convenience. It may never fail anything a person asked for, so
 * a refusal here is a quiet null and the next pass asks again.
 *
 *  0. The read names this Mac. A remote path may never arm a local row.
 *  1. No store is installed. That is a unit test, a probe, or the window
 *     between quit and the next launch.
 *  2. There is no row. A session created on a machine by 0.34 or 0.35 has none,
 *     and the feed still reports it on every pass.
 *  3. The row is tombstoned. A person removed the machine, and a late answer
 *     from a connection that has not closed yet must not undo that.
 *  4. The row is not on the machine the read came from. An id read on one
 *     machine means nothing on another, and writing it onto a row that names a
 *     different machine is the mistake `./resume-arming.ts` exists to catch
 *     after the fact. It is refused before the fact here as well.
 *  5. The row already has a conversation id. A remote read NEVER replaces one.
 *     The local claim ladder can take an id from a weaker holder because both
 *     sides of that trade are watches this process owns and can correct. A read
 *     over a connection owns nothing and can correct nothing, so it only ever
 *     fills an empty column.
 *
 * ## What is written, in ONE durable commit
 *
 * The id, the resume command and the claim about the id go into one transaction
 * through `setAgentSessionId`, so no power cut can leave a row that is armed and
 * silent about where its id came from. That is the local path's rule and it is
 * not relaxed here.
 *
 * The resume command is composed by `registryResumeArgv`, which is the same
 * function the local harvest and the launch path use. `argv[0]` is THAT
 * MACHINE'S own absolute path, taken from the row, for the reason
 * `./remote-argv.ts` gives: the manifest records absolute paths, bound to the
 * machine they were read on, and the launch puts the bare name back. An argv
 * the registry declines to build, which is what an agent with no resume
 * mechanics gets, is never persisted, because an id with no command to type is
 * a row that claims something it cannot do.
 */
export function writeRemoteHarvest(
  input: RemoteHarvestWrite
): ManifestSessionRecord | null {
  if (store === null) return null;
  // A remote read may never write onto a LOCAL row, and the refusal is
  // structural rather than a matter of every caller passing the right id. The
  // local harvest is the only thing allowed to arm a local row, and it has its
  // own ladder, its own claim map and its own reclaim handler. None of that
  // exists here.
  if (input.machineId === LOCAL_MACHINE_ID) return null;
  const record = store.getSession(input.sessionId);
  if (record === undefined) return null;
  if (record.status === 'discarded') return null;
  if ((record.machineId ?? LOCAL_MACHINE_ID) !== input.machineId) {
    machinesLog.warn(
      `a read from ${input.machineId} offered a conversation id for ` +
        `${input.sessionId}, whose row is on ` +
        `${String(record.machineId ?? LOCAL_MACHINE_ID)}. Nothing was written.`
    );
    return null;
  }
  if ((record.agentSessionId ?? '').length > 0) return null;

  const resumeArgv = registryResumeArgv(
    input.agent,
    input.conversationId,
    record.argv.slice(1),
    record.argv[0]
  );
  if (resumeArgv.length === 0) return null;

  const provenance: ResumeProvenance = {
    v: SESSION_CONTRACT_VERSION,
    source: REMOTE_STORE_HARVEST,
    confidence: deriveResumeConfidence({
      key: input.key,
      keyConfidence: input.keyConfidence,
      // There is no grace timer over a connection. A pass with nothing
      // confirmed writes nothing at all, so this is false by construction
      // rather than by choice at the call site.
      viaGraceTimer: false,
      rivals: input.rivals
    }),
    at: input.at,
    // The path ON THAT MACHINE, written as given. It is not realpath'd, because
    // realpath is a local call and this Mac cannot resolve a link on a
    // different computer.
    cwd: input.cwd,
    machineId: input.machineId,
    key: input.key,
    keyConfidence: input.keyConfidence,
    viaGraceTimer: false,
    rivals: input.rivals,
    storePath: input.storePath,
    storeRoot: input.storeRoot
  };
  const written = store.setAgentSessionId(
    input.sessionId,
    input.conversationId,
    resumeArgv,
    provenance
  );
  if (provenance.confidence !== 'exact') {
    // Recorded, and not proven to be this session's conversation. Said out loud
    // in the log because the alternative is a row that looks armed to a reader
    // and is refused by the gate.
    machinesLog.warn(
      `${input.agent} conversation id ${input.conversationId} on ` +
        `${input.machineId} matched on '${input.key}' with ` +
        `${String(input.rivals)} candidate(s) in play ` +
        `(${provenance.confidence}). It is recorded and it will not be typed.`
    );
  }
  return written;
}

// ---------------------------------------------------------------------------
// When a conversation on another machine was last copied here (Phase 73, M6)
// ---------------------------------------------------------------------------
//
// WHY THIS IS IN THIS MODULE, said plainly, because it is the one fact here
// that is not a manifest column.
//
// The instant lives on disk beside the bytes it describes, in
// `<userData>/gmux/remote-stores/<machineId>/<sessionId>/sync.json`, and
// `./remote-store-sync.ts` owns that directory, that format and the copy. What
// lives here is the small map every surface reads and the two accessors that
// read it, for the same reason every other remote fact about a row is read
// here: `./remote-sessions.ts` projects one row from one place, and a second
// import into that file for one number would put the machine layer's two
// biggest modules in a loop.
//
// It is deliberately NOT a manifest column. A column would need a migration and
// would move `docs/audits/contract-baseline.txt`, and it could claim a copy
// that is not on disk. The record and the bytes are written into one directory
// together, so a person reading "last copied at" is reading a fact about a file
// that is right there.

/** What happened the last time Tortie asked for one session's conversation. */
export type RemoteStoreOutcome =
  /** The whole file is on this Mac and its checksum matched. */
  | 'copied'
  /** The file on that machine is larger than the cap, so none of it was kept. */
  | 'too-large'
  /** The bytes that arrived did not match what the machine said it sent. */
  | 'not-whole';

/** The record written beside a copy, and read back by every surface. */
export interface RemoteStoreRecord {
  readonly outcome: RemoteStoreOutcome;
  /** Local epoch ms Tortie finished the copy, or finished refusing it. */
  readonly at: number;
  readonly machineId: string;
  readonly sessionId: string;
  /** The record's absolute path ON THAT MACHINE. */
  readonly remotePath: string;
  /** The file's own name, which is the name the copy carries here. */
  readonly name: string;
  /** How many bytes that machine said the whole file is. */
  readonly remoteBytes: number;
  /** How many bytes landed here. 0 when nothing was kept. */
  readonly localBytes: number;
  /** The far side's checksum, or null when it had no tool to make one. */
  readonly remoteSha256: string | null;
  /** This Mac's checksum of what landed, or null when nothing was kept. */
  readonly localSha256: string | null;
}

const storeRecords = new Map<string, RemoteStoreRecord>();

/** Remember one record. Called by `./remote-store-sync.ts` and by nothing else. */
export function noteRemoteStoreRecord(record: RemoteStoreRecord): void {
  storeRecords.set(record.sessionId, record);
}

/** Forget one session's record, when its copies are pruned off the disk. */
export function forgetRemoteStoreRecord(sessionId: string): void {
  storeRecords.delete(sessionId);
}

/** Every record held right now, oldest session id first. */
export function remoteStoreRecords(): RemoteStoreRecord[] {
  return [...storeRecords.values()].sort((a, b) =>
    a.sessionId.localeCompare(b.sessionId)
  );
}

/** The whole record for one session, copied or refused, or null. */
export function remoteStoreRecordOf(sessionId: string): RemoteStoreRecord | null {
  return storeRecords.get(sessionId) ?? null;
}

/**
 * When Tortie last copied this session's conversation, or null.
 *
 * NULL MEANS THERE IS NO COPY. A refusal is not a copy, so a conversation file
 * that was too large to bring home answers null here and the panel says what
 * happened from {@link remoteStoreRecordOf} instead. Answering with the instant
 * of a refusal would be the one thing the staleness promise may never do, which
 * is to let a person read "last copied" over something that was never copied.
 */
export function conversationSyncedAt(sessionId: string): number | null {
  const record = storeRecords.get(sessionId);
  if (record === undefined || record.outcome !== 'copied') return null;
  return record.at;
}

/** Drop every remembered record. Tests, the smoke and the probe. */
export function resetRemoteStoreRecordsForTests(): void {
  storeRecords.clear();
}
