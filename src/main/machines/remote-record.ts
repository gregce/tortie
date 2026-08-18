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
 * ## What is NOT here
 *
 * No resume argv, and no harvest. Tortie reads no agent's own files on another
 * machine in this release, so no conversation id was ever obtained for a remote
 * session and `resume_argv` is NULL on every remote row. The provenance says
 * exactly that rather than leaving the column empty, because "nothing was
 * recorded" and "nothing could be collected" are different facts and only one of
 * them is true here.
 */

import type { Session, SessionStatus } from '@shared/types';
import { getLog } from '../log';
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
import { SESSION_CONTRACT_VERSION } from '../manifest/agents';
// The one definition of the word `local`. `../manifest/codecs.ts` keeps its own
// copy for the reason above, and `./__tests__/machine-id-migration.test.ts`
// asserts the two are the same string.
import { LOCAL_MACHINE_ID } from './context';

const machinesLog = getLog('config');

/**
 * The provenance source for a session on another machine.
 *
 * WHAT IT MEANS. The session runs on another machine and Tortie has no route to
 * that machine's agent store in this release, so no conversation id was ever
 * obtained. It is a WEAKER source than every local one by construction: nothing
 * was read, so nothing can be checked. It is declared on `ResumeIdSource` in
 * `../manifest/agents.ts`, beside the six local sources, and this is its one
 * producer.
 */
const REMOTE_NOT_COLLECTED: ResumeIdSource = 'remote-not-collected';

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
