/**
 * reconstruct.ts. Rebuild a lost manifest from the snapshot capsules and the
 * identity stamps live tmux sessions carry (Phase 20 item 5).
 *
 * ## The situation this exists for
 *
 * The manifest is the only single file whose loss is total across every
 * project. If it goes, every session is stranded. The tmux processes keep
 * running on the private socket, and Tortie cannot reach them, because a
 * session with no manifest row is a session Tortie correctly refuses to adopt.
 * The backup ring in this phase is the first answer to that. This module is the
 * second one, for the case where the ring is gone too.
 *
 * Two records survive independently of the manifest.
 *
 *  1. The snapshot capsules under `<userData>/gmux/snapshots`. Since the Phase
 *     19 fix round each capsule carries a `SnapshotSessionRecipe`, which is the
 *     name, the tmux name, the project root, the working directory, the agent,
 *     the agent's own conversation id, the launch argv and the resume argv.
 *     That is a manifest row in everything but shape.
 *  2. The `@gmux-id` option, and the `GMUX_SESSION_ID` pane environment stamp,
 *     that every managed tmux session carries. That is the identity, and it is
 *     what says a live session is ours.
 *
 * ## Three refusals, and each one is a refusal rather than a preference
 *
 * **It never runs by itself.** There is no boot path into this file. A caller
 * has to survey first, show a person the plan, and then call
 * `applyReconstruction` with the acknowledgement string and the plan the survey
 * produced. The plan carries a single use token issued by the survey, so a
 * caller cannot synthesise a plan and apply it blind, and cannot apply the same
 * plan twice. A wrong reconstruction adopts sessions that are not ours, so the
 * decision belongs to a person.
 *
 * The person reaches all of that through `reconstruct-operator.ts`, which is
 * the menu item "Rebuild the Session List…" and two native dialogs. That door
 * was missing for the whole of the phase that built this file, and its absence
 * cost more than the missing feature. Rollup tracks the value of a parameter
 * when a function has exactly one call site it can see, and with one caller
 * passing the acknowledgement constant it proved the first refusal above dead
 * and deleted it from `out/main/index.js`. The source had the check, the unit
 * test passed, and the shipped app did not have it.
 * `build/assert-bundle-refusals.mjs` now reads the built artifact and fails the
 * build when any refusal named in this file is missing from it.
 *
 * **It never weakens the identity rule.** A live session that carries neither
 * an `@gmux-id` nor a `GMUX_SESSION_ID` is NOT OURS. It is reported in
 * `plan.foreign` so a person can see it was left alone, and there is no
 * decision, no option and no flag that turns it into a row. Research 33 names
 * the identity rule as one of the five things a well meaning cleanup must not
 * re-litigate, and reconstruction is exactly the place where re-litigating it
 * would be convenient.
 *
 * **It never writes over the live manifest.** Everything goes into a temporary
 * root that the caller names. The output path is refused when it resolves to
 * the live manifest, when it lands in the same directory as the live manifest,
 * and when a file is already there. Putting the rebuilt manifest in place is a
 * separate act by a person who has read the report.
 *
 * ## What it does not touch
 *
 * tmux is read and never written. This module calls `list-sessions` and
 * `show-environment` and nothing else. It never stamps an option, never
 * renames, never kills and never creates. A reconstruction that repaired tmux
 * while it was there would be a reconstruction that can damage the one thing
 * still holding the user's work.
 *
 * ## What a reconstructed row cannot carry, stated plainly
 *
 * The capsule recipe does not carry the launch environment deltas, the
 * SpecStory capture record, or the true creation time. So a reconstructed row
 * restores without its `env` (e.g. `CLAUDE_CONFIG_DIR`), restores without
 * SpecStory capture even if the session had it, and carries a `createdAt`
 * derived from tmux for a live session or from the oldest capsule otherwise.
 * Every one of those is listed in the report under `gaps`, because a person
 * comparing the rebuilt manifest against what they remember needs to know which
 * differences are expected.
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { tableDigests } from '../db/digest';
import { writeDurable } from '../durable';
import {
  classifySnapshotFile,
  readCapsules,
  resolveSnapshot,
  snapshotsDir,
  type SnapshotCapsule,
  type SnapshotSessionRecipe
} from '../restore/snapshots';
import * as tmux from '../tmux';
import {
  ManifestStore,
  defaultManifestDbPath,
  type ManifestSessionRecord
} from './store';
import type { Project } from '@shared/types';

// ---------------------------------------------------------------------------
// The surface a caller has to satisfy before anything is written
// ---------------------------------------------------------------------------

/**
 * The exact string `applyReconstruction` demands.
 *
 * It is a sentence rather than `true` so that it cannot be produced by a
 * default, by a spread, or by a well meaning caller passing an options object
 * through. The type is the literal, so a wrong string is a compile error as
 * well as a runtime refusal.
 */
export const RECONSTRUCTION_ACKNOWLEDGEMENT =
  'I have read the plan and I am rebuilding the manifest';

/** What a person decided about one candidate. */
export interface CandidateDecision {
  /** True writes a row for it. False leaves it out. */
  include: boolean;
  /**
   * Facts no capsule recorded, supplied by the person.
   *
   * This is how a candidate with no recipe becomes writable. A row needs a
   * name, a project root, a working directory and an agent, and inventing any
   * of them would be a guess about which session the user is looking at.
   */
  fill?: {
    name?: string;
    agent?: string;
    projectPath?: string;
    cwd?: string;
  };
}

/** Everything `applyReconstruction` needs from the person who decided. */
export interface ReconstructionConsent {
  /** Exactly {@link RECONSTRUCTION_ACKNOWLEDGEMENT}. */
  acknowledgement: typeof RECONSTRUCTION_ACKNOWLEDGEMENT;
  /** Who decided. Recorded in the report, never used to make a decision. */
  decidedBy: string;
  /** The temporary root to write into. Absolute. Never the live manifest. */
  outputRoot: string;
  /** Per candidate decisions, keyed by session id. Missing means excluded. */
  decisions?: Readonly<Record<string, CandidateDecision>>;
}

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------

/** Where a session id was found. A candidate can have more than one. */
export type IdentitySource =
  /** A snapshot capsule on disk names it. */
  | 'capsule'
  /** A live session carries the `@gmux-id` option. */
  | 'session-option'
  /** A live session carries the `GMUX_SESSION_ID` pane environment stamp. */
  | 'pane-env';

/** One live tmux session that proved it is ours. */
export interface LiveIdentity {
  /** Immutable tmux id, e.g. `$7`. */
  tmuxId: string;
  tmuxName: string;
  /** Session creation time as tmux reports it. Epoch milliseconds. */
  createdAt: number;
  source: 'session-option' | 'pane-env';
}

/** One live tmux session carrying no identity at all. Never written. */
export interface ForeignTmuxSession {
  tmuxId: string;
  tmuxName: string;
}

/** What the capsules say about one session, flattened for the report. */
export interface CapsuleEvidence {
  /** Number of capsules on record for this session. */
  count: number;
  /** Generation of the newest capsule. */
  newestGeneration: number;
  /** When the newest capture completed. Epoch milliseconds. */
  newestAt: number;
  /** When the oldest capture on record completed. Epoch milliseconds. */
  oldestAt: number;
  /** Why the newest capture ran. */
  reason: string;
  /**
   * The captured pane's working directory, when tmux told the capture what it
   * was. This is a second source for a row's `cwd`, independent of the recipe.
   */
  paneCwd: string | null;
}

/** One session reconstruction could write a row for. */
export interface ReconstructionCandidate {
  sessionId: string;
  /** Every place this id was found. */
  identity: IdentitySource[];
  /** The newest recipe on record, or null when no capsule carried one. */
  recipe: SnapshotSessionRecipe | null;
  /** What the capsules say, or null when this id came only from tmux. */
  capsules: CapsuleEvidence | null;
  /**
   * What scrollback this session would come back with.
   *
   * `verified` is a body that matched the length and the hash a capsule
   * recorded. `unproven` is a snapshot written before Phase 19, which has no
   * record at all and is replayed anyway because refusing it would throw away
   * every snapshot taken before that build. `none` is no readable body.
   */
  scrollback: 'verified' | 'unproven' | 'none';
  /** The live sessions carrying this id. Normally none or one. */
  live: LiveIdentity[];
  /**
   * True when this candidate is written only if a person says so explicitly.
   *
   * Set for a candidate with no recipe, because a row would have to be filled
   * in by hand, and for a candidate two live sessions claim, because only a
   * person can say which one they meant.
   */
  decisionRequired: boolean;
  /** What a person needs to know before deciding. Plain sentences. */
  notes: string[];
}

/** The read only survey. Nothing has been written when this is returned. */
export interface ReconstructionPlan {
  /** Single use, issued here, consumed by `applyReconstruction`. */
  token: string;
  /** When the survey ran. Epoch milliseconds. */
  at: number;
  /**
   * The directory the capsules were read from.
   *
   * Recorded so the report says where the evidence came from. The reading is
   * done by `restore/snapshots`, which owns the layout and the validation, so
   * this is the profile's own snapshots directory and not a setting.
   */
  snapshotsDirectory: string;
  /** The manifest a person would eventually replace with this rebuild. */
  liveManifestPath: string;
  /**
   * How many session rows the live manifest holds right now, or null when it
   * could not be read. Read only, and never written to.
   *
   * Above zero means the live manifest is not empty, and reconstruction is
   * probably not what the person wants. It is reported rather than refused,
   * because the output goes to a temporary root either way.
   */
  liveManifestSessions: number | null;
  candidates: ReconstructionCandidate[];
  /**
   * Session ids that have a snapshot body on disk and nothing else. No record
   * describes them and no live session carries the identity.
   *
   * They are not candidates, because an id and some text is not a session. They
   * are counted here so a person can see how much scrollback is on the disk
   * that no reconstruction can place. The operator's own profile held 30 of
   * these the day this was written, all of them written before Phase 19 started
   * recording capsules.
   */
  unrecordedScrollback: string[];
  /** Live sessions carrying no identity. Left strictly alone. */
  foreign: ForeignTmuxSession[];
  /** False when tmux could not be listed. The capsules are then the only source. */
  tmuxReachable: boolean;
}

// ---------------------------------------------------------------------------
// The result
// ---------------------------------------------------------------------------

/** One candidate that was asked for and could not be written. */
export interface ReconstructionRefusal {
  sessionId: string;
  reason: string;
}

/** What `applyReconstruction` did, and what it did not do. */
export interface ReconstructionResult {
  /** The rebuilt manifest. Never the live one. */
  manifestPath: string;
  /** The report file written beside it. */
  reportPath: string;
  at: number;
  decidedBy: string;
  /** Session ids written, in the order they were inserted. */
  written: string[];
  /** Project rows written, by path. */
  projects: string[];
  /** Candidates a person asked for that could not be composed. */
  refused: ReconstructionRefusal[];
  /** Candidates left out, either by decision or by having no decision. */
  excluded: string[];
  /**
   * Live sessions carrying no identity, exactly as the survey saw them. They
   * were not read again, not written and not touched.
   */
  foreignUntouched: ForeignTmuxSession[];
  /** Facts that were assumed rather than read. One sentence each. */
  assumptions: string[];
  /** Facts no capsule carries, so no reconstructed row can carry them. */
  gaps: string[];
  /** Per table content hash of the rebuilt manifest (Phase 19 `db/digest`). */
  digests: Record<string, string>;
  /**
   * True when every row was read back from a second connection and matched the
   * row that was intended, field for field.
   */
  verified: boolean;
  /** Rows that did not read back as written. Empty when `verified` is true. */
  mismatches: string[];
}

// ---------------------------------------------------------------------------
// tmux, read only and injectable so a test never needs a server
// ---------------------------------------------------------------------------

/**
 * The two tmux reads this module is allowed to make.
 *
 * It is an interface rather than a direct call so a test can drive the whole
 * survey without a tmux server, and so the read only claim above is checkable
 * by reading this declaration. There is no write on it.
 */
export interface ReconstructionTmux {
  listSessions(): Promise<readonly tmux.TmuxSessionInfo[]>;
  getSessionEnv(target: string, name: string): Promise<string | null>;
}

function defaultTmux(): ReconstructionTmux {
  return {
    listSessions: () => tmux.listSessions(),
    getSessionEnv: (target, name) => tmux.getSessionEnv(target, name)
  };
}

export interface SurveyOptions {
  /** Defaults to the real private socket, read only. */
  tmux?: ReconstructionTmux;
  /** Defaults to `defaultManifestDbPath()`. Opened read only, for a count. */
  liveManifestPath?: string;
}

// ---------------------------------------------------------------------------
// Survey
// ---------------------------------------------------------------------------

/**
 * Tokens issued by a survey and not yet spent. Module private on purpose.
 *
 * Bounded, because a person can survey as many times as they like and only one
 * of those plans is ever applied. The oldest is dropped rather than kept
 * forever, and a caller holding a dropped plan is told to survey again.
 */
const openTokens = new Set<string>();
const MAX_OPEN_PLANS = 8;

/**
 * Read the capsules and the live sessions and say what a reconstruction would
 * write. Writes nothing, anywhere.
 *
 * Every candidate carries its own evidence, so the person deciding sees where
 * each row would come from rather than a count.
 */
export async function surveyReconstruction(
  options: SurveyOptions = {}
): Promise<ReconstructionPlan> {
  const api = options.tmux ?? defaultTmux();
  const directory = snapshotsDir();
  const liveManifestPath = options.liveManifestPath ?? defaultManifestDbPath();

  const { live, foreign, reachable } = await readLiveSessions(api);
  const found = scanSnapshotDirectory(directory);

  const ids = [...new Set([...found.recorded, ...live.keys()])].sort();
  const candidates: ReconstructionCandidate[] = [];
  for (const sessionId of ids) {
    candidates.push(buildCandidate(sessionId, live.get(sessionId) ?? []));
  }
  const placed = new Set(ids);
  const unrecordedScrollback = found.legacy.filter((id) => !placed.has(id)).sort();

  const token = randomUUID();
  openTokens.add(token);
  while (openTokens.size > MAX_OPEN_PLANS) {
    const oldest = openTokens.values().next();
    if (oldest.done === true) break;
    openTokens.delete(oldest.value);
  }
  return {
    token,
    at: Date.now(),
    snapshotsDirectory: directory,
    liveManifestPath,
    liveManifestSessions: countSessionsReadOnly(liveManifestPath),
    candidates,
    unrecordedScrollback,
    foreign,
    tmuxReachable: reachable
  };
}

/**
 * Session ids the snapshots directory knows about, split by what it holds.
 *
 * `recorded` has a completion record, which is the only thing that can carry a
 * recipe. `legacy` is a snapshot written before Phase 19, which is a body and a
 * file name and nothing else.
 *
 * The classifier in `restore/snapshots` owns the layout, so this asks it rather
 * than matching a suffix here. A directory that is not there at all is two
 * empty lists, which is the honest answer for a profile that never captured
 * anything.
 */
function scanSnapshotDirectory(directory: string): {
  recorded: string[];
  legacy: string[];
} {
  let names: string[];
  try {
    names = readdirSync(directory);
  } catch {
    return { recorded: [], legacy: [] };
  }
  const recorded = new Set<string>();
  const legacy = new Set<string>();
  for (const name of names) {
    const classified = classifySnapshotFile(name);
    const id = classified.sessionId;
    if (id === null || id.length === 0) continue;
    if (classified.kind === 'index') recorded.add(id);
    else if (classified.kind === 'legacy') legacy.add(id);
  }
  return { recorded: [...recorded], legacy: [...legacy] };
}

/**
 * Every live session, split into the ones that proved they are ours and the
 * ones that did not.
 *
 * The `@gmux-id` option rides along in the one `list-sessions` this already
 * runs. The pane environment stamp is read only for a session that has no
 * option, which is one extra read for each unrecognised session. Unlike the
 * running app's own identify pass, this one cannot check the id against the
 * manifest, because the manifest being empty is the reason this code is
 * running. A stamp is therefore taken as identity on its own, which is what it
 * has always meant.
 */
async function readLiveSessions(api: ReconstructionTmux): Promise<{
  live: Map<string, LiveIdentity[]>;
  foreign: ForeignTmuxSession[];
  reachable: boolean;
}> {
  const live = new Map<string, LiveIdentity[]>();
  const foreign: ForeignTmuxSession[] = [];
  let infos: readonly tmux.TmuxSessionInfo[];
  try {
    infos = await api.listSessions();
  } catch {
    return { live, foreign, reachable: false };
  }

  for (const info of infos) {
    let id = info.gmuxId;
    let source: LiveIdentity['source'] = 'session-option';
    if (id === undefined) {
      const stamped = await api
        .getSessionEnv(info.sessionId, 'GMUX_SESSION_ID')
        .catch(() => null);
      if (stamped !== null && stamped.length > 0) {
        id = stamped;
        source = 'pane-env';
      }
    }
    if (id === undefined) {
      // Neither stamp. NOT OURS. It is named here so a person can see it was
      // left alone, and there is no path from this list into a manifest row.
      foreign.push({ tmuxId: info.sessionId, tmuxName: info.tmuxName });
      continue;
    }
    const entry: LiveIdentity = {
      tmuxId: info.sessionId,
      tmuxName: info.tmuxName,
      createdAt: info.createdAt,
      source
    };
    const existing = live.get(id);
    if (existing === undefined) live.set(id, [entry]);
    else existing.push(entry);
  }
  return { live, foreign, reachable: true };
}

/** Fold one session's capsules and live sessions into a candidate. */
function buildCandidate(
  sessionId: string,
  live: LiveIdentity[]
): ReconstructionCandidate {
  const capsules = readCapsules(sessionId);
  const recipe = capsules.find((c) => c.session !== null)?.session ?? null;
  const identity: IdentitySource[] = [];
  if (capsules.length > 0) identity.push('capsule');
  for (const entry of live) {
    if (!identity.includes(entry.source)) identity.push(entry.source);
  }

  const notes: string[] = [];
  let decisionRequired = false;

  if (recipe === null) {
    decisionRequired = true;
    if (capsules.length > 0) {
      notes.push(
        'The capsules for this session were written before they carried a ' +
          'launch recipe, so the row has to be filled in by hand.'
      );
    } else if (live.length > 0) {
      notes.push(
        'No snapshot capsule names this session, so the only evidence is the ' +
          'identity stamp on the live tmux session.'
      );
    } else {
      notes.push(
        'The snapshots directory has a record file for this session and ' +
          'nothing readable inside it, and no live session carries the ' +
          'identity. There is no evidence left about this session at all.'
      );
    }
    notes.push(
      'Include it only with a decision that supplies a name, an agent, a ' +
        'project folder and a working directory.'
    );
  }
  if (live.length > 1) {
    decisionRequired = true;
    notes.push(
      `${String(live.length)} live tmux sessions carry this identity ` +
        `(${live.map((l) => `${l.tmuxId} ${l.tmuxName}`).join(', ')}). ` +
        'Only a person can say which one was meant.'
    );
  }
  if (live.length === 0 && recipe !== null) {
    notes.push(
      'No live tmux session carries this identity, so the row is written as ' +
        'restorable rather than running.'
    );
  }

  // `resolveSnapshot` walks the generations newest first and proves the bytes
  // against the recorded length and hash, then falls back to a pre-Phase-19
  // file. It is the reader every restore uses, so the answer here is the answer
  // a restore would get.
  const resolved = resolveSnapshot(sessionId);
  const scrollback =
    resolved === null ? 'none' : resolved.verified ? 'verified' : 'unproven';
  if (scrollback === 'unproven') {
    notes.push(
      'The scrollback for this session was written before Phase 19, so ' +
        'nothing vouches for its bytes. It is replayed anyway, which is what ' +
        'a restore does today.'
    );
  }

  return {
    sessionId,
    identity,
    recipe,
    capsules: summarizeCapsules(capsules),
    scrollback,
    live,
    decisionRequired,
    notes
  };
}

function summarizeCapsules(
  capsules: readonly SnapshotCapsule[]
): CapsuleEvidence | null {
  const newest = capsules[0];
  const oldest = capsules[capsules.length - 1];
  if (newest === undefined || oldest === undefined) return null;
  return {
    count: capsules.length,
    newestGeneration: newest.generation,
    newestAt: newest.capturedAt,
    oldestAt: oldest.capturedAt,
    reason: newest.reason,
    paneCwd: capsules.find((c) => c.cwd !== null)?.cwd ?? null
  };
}

/**
 * How many session rows the live manifest holds, without writing to it.
 *
 * Read only, `fileMustExist`, and every failure is null rather than a throw. A
 * manifest that cannot be read is the situation this module exists for, so it
 * must not be the thing that stops the survey.
 */
function countSessionsReadOnly(path: string): number | null {
  if (!existsSync(path)) return null;
  let db: Database.Database | null = null;
  try {
    db = new Database(path, { readonly: true, fileMustExist: true });
    const row = db
      .prepare<[], { c: number }>('SELECT COUNT(*) AS c FROM sessions')
      .get();
    return row?.c ?? null;
  } catch {
    return null;
  } finally {
    db?.close();
  }
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

/**
 * What the rebuilt manifest is called inside the output root.
 *
 * IT DOES NOT END IN `.db`, and that is the same decision `recovery.ts` made
 * for the ring bodies one file away, for the same reason. `migrate/userdata.ts`
 * walks the whole profile and treats every `*.db` it finds as a database to
 * copy with `VACUUM INTO`. The output root sits inside the profile, so a
 * rebuild called `manifest.db` would be picked up by that walk. The stem is
 * kept so the file is still recognisable, and the report says what to rename it
 * to when a person puts it in place.
 */
export const RECONSTRUCTION_BODY_NAME = 'manifest.db.rebuilt';

/** A human readable default root, inside the profile and never beside the DB. */
export function defaultReconstructionRoot(at: Date = new Date()): string {
  const stamp = at.toISOString().replace(/[:.]/g, '-');
  return join(
    app.getPath('userData'),
    'gmux',
    'reconstructions',
    `rebuild-${stamp}`
  );
}

/**
 * Write the rebuilt manifest into a temporary root, and a report beside it.
 *
 * Refuses, before touching anything, when the acknowledgement is not exact,
 * when the plan did not come from a survey in this process, when the plan has
 * already been applied, when the output root is not absolute, when the output
 * would land in the live manifest's own directory, and when a manifest is
 * already there.
 *
 * Never writes to the live manifest and never writes to tmux.
 */
export async function applyReconstruction(
  plan: ReconstructionPlan,
  consent: ReconstructionConsent
): Promise<ReconstructionResult> {
  if (consent.acknowledgement !== RECONSTRUCTION_ACKNOWLEDGEMENT) {
    throw new Error(
      'Reconstruction needs an explicit decision. Pass ' +
        'RECONSTRUCTION_ACKNOWLEDGEMENT exactly.'
    );
  }
  if (consent.decidedBy.trim().length === 0) {
    throw new Error('Reconstruction needs the name of who decided.');
  }
  if (!openTokens.has(plan.token)) {
    throw new Error(
      'This plan did not come from surveyReconstruction in this process, or ' +
        'it has already been applied. Survey again, read the plan, and decide ' +
        'on the new one.'
    );
  }

  const { manifestPath, reportPath } = prepareOutput(consent.outputRoot);
  // Spent here, after the paths are known to be safe and before the first
  // write. A refused path is a typed path, and making a person survey and read
  // the plan again over a typo would teach them to skim it.
  openTokens.delete(plan.token);

  const decisions = consent.decisions ?? {};
  const rows: ManifestSessionRecord[] = [];
  const refused: ReconstructionRefusal[] = [];
  const excluded: string[] = [];
  const assumptions: string[] = [];

  for (const candidate of plan.candidates) {
    const decision = decisions[candidate.sessionId];
    // A candidate that needs a decision is written only when a person said
    // include. A candidate with a full recipe is written unless a person said
    // exclude. Silence never turns into a guess in the direction of adopting.
    const wanted = candidate.decisionRequired
      ? decision?.include === true
      : decision?.include !== false;
    if (!wanted) {
      excluded.push(candidate.sessionId);
      continue;
    }
    const composed = composeRow(candidate, decision);
    if ('missing' in composed) {
      refused.push({
        sessionId: candidate.sessionId,
        reason:
          'Nothing on record says what this session\'s ' +
          `${composed.missing.join(', ')} was. Decide it and supply it in ` +
          'the decision\'s fill, or leave the session out.'
      });
      continue;
    }
    rows.push(composed.row);
    assumptions.push(...composed.assumptions);
  }

  if (rows.length === 0) {
    // The reasons travel in the message. This is the error a person reads when
    // they asked for a session and got nothing, and a count would send them
    // back to the plan to work out why.
    throw new Error(
      ['No candidate was included, so there is nothing to reconstruct.']
        .concat(refused.map((r) => `${r.sessionId}: ${r.reason}`))
        .join(' ')
    );
  }

  const projects = writeManifest(manifestPath, rows);
  const { digests, verified, mismatches } = verifyWritten(manifestPath, rows);

  const result: ReconstructionResult = {
    manifestPath,
    reportPath,
    at: Date.now(),
    decidedBy: consent.decidedBy,
    written: rows.map((r) => r.id),
    projects,
    refused,
    excluded,
    foreignUntouched: plan.foreign,
    assumptions,
    gaps: [...GAPS],
    digests,
    verified,
    mismatches
  };

  await writeDurable({
    path: reportPath,
    data: `${JSON.stringify({ plan, result }, null, 2)}\n`
  });
  return result;
}

/**
 * What a reconstructed row can never carry, because nothing outside the
 * manifest ever recorded it.
 */
const GAPS: readonly string[] = [
  'The launch environment deltas are not in a capsule, so a reconstructed ' +
    'row restores without them. A session that needed CLAUDE_CONFIG_DIR ' +
    'comes back without it.',
  'The SpecStory capture record is not in a capsule, so a session that was ' +
    'capturing comes back not capturing.',
  'The true creation time is not in a capsule. A live session takes the ' +
    'creation time tmux reports. Every other row takes the time of its ' +
    'oldest capture, which is later than the truth.',
  'The agent binary version recorded in the capsule has no column in the ' +
    'manifest, so it is dropped.',
  'Exit codes, exit signals, pane pids and the last restore result are not ' +
    'in a capsule. Those columns come back empty.'
];

/**
 * Resolve and check the output paths.
 *
 * The three refusals are separate on purpose. Each one has failed somewhere in
 * this product before, and a person reading a refusal should be told which of
 * them stopped the run.
 */
function prepareOutput(root: string): {
  manifestPath: string;
  reportPath: string;
} {
  if (root.trim().length === 0 || !isAbsolute(root)) {
    throw new Error(
      `The reconstruction root must be an absolute path. Got "${root}".`
    );
  }
  mkdirSync(root, { recursive: true });
  const manifestPath = join(root, RECONSTRUCTION_BODY_NAME);
  const live = defaultManifestDbPath();
  // One test rather than two, and it is the DIRECTORY rather than the file.
  // The rebuild's own name no longer collides with the live manifest's, so a
  // file test would let a rebuild land beside the live database and its write
  // ahead log. The directory test refuses that, and it is what the refusal was
  // always for.
  if (
    resolved(manifestPath) === resolved(live) ||
    resolved(dirname(manifestPath)) === resolved(dirname(live))
  ) {
    throw new Error(
      'Refusing to write the rebuild into the live manifest\'s own directory ' +
        `(${dirname(live)}). The live manifest is at ${live}. Choose a ` +
        'temporary root.'
    );
  }
  if (existsSync(manifestPath)) {
    throw new Error(
      `A manifest is already at ${manifestPath}. Refusing to overwrite it.`
    );
  }
  return { manifestPath, reportPath: join(root, 'reconstruction.json') };
}

/**
 * Resolve symlinks before comparing two paths.
 *
 * The same reason `harness/isolation.ts` does it. On macOS the temporary
 * directory answers as `/var/folders/...` in one API and
 * `/private/var/folders/...` in another, and a plain string compare then either
 * refuses a safe run or, far worse, fails to recognise the live directory. A
 * path that cannot be resolved is returned unchanged and still faces the same
 * comparison.
 */
function resolved(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

/** One candidate, turned into a row, or the list of facts nobody recorded. */
function composeRow(
  candidate: ReconstructionCandidate,
  decision: CandidateDecision | undefined
): { row: ManifestSessionRecord; assumptions: string[] } | { missing: string[] } {
  const fill = decision?.fill ?? {};
  const recipe = candidate.recipe;
  // The first live session, when a person decided to include a candidate two
  // of them claim. The row itself binds nothing: reconcile claims a live
  // session by `@gmux-id` at the next refresh, and it already refuses to let
  // two sessions claim one row.
  const live = candidate.live[0] ?? null;
  const assumptions: string[] = [];

  const name = firstText([fill.name, recipe?.name, live?.tmuxName]);
  const projectPath = firstText([fill.projectPath, recipe?.projectPath]);
  const agent = firstText([fill.agent, recipe?.agent]);
  // Four sources for the working directory, in order of how directly each one
  // was recorded. The pane directory in the capsule is real evidence and is
  // tried before the project root, which is a substitution rather than a
  // reading and is recorded as one below.
  const cwd = firstText([
    fill.cwd,
    recipe?.cwd,
    candidate.capsules?.paneCwd,
    projectPath
  ]);

  const missing: string[] = [];
  if (name === null) missing.push('name');
  if (projectPath === null) missing.push('project folder');
  if (cwd === null) missing.push('working directory');
  if (agent === null) missing.push('agent');
  if (name === null || projectPath === null || cwd === null || agent === null) {
    return { missing };
  }

  const tmuxName = firstText([live?.tmuxName, recipe?.tmuxName]);
  const createdAt = live?.createdAt ?? candidate.capsules?.oldestAt ?? Date.now();
  const lastSeen =
    live !== null ? Date.now() : (candidate.capsules?.newestAt ?? createdAt);

  if (recipe === null) {
    assumptions.push(
      `${candidate.sessionId} was written from a decision rather than from a ` +
        'capsule, so it has no launch command. It restores as a folder and a ' +
        'shell.'
    );
  }
  if (live === null && recipe !== null && recipe.resumeArgv === null) {
    assumptions.push(
      `${candidate.sessionId} has no resume command on record, so its ` +
        'conversation does not come back.'
    );
  }
  if (fill.agent !== undefined && recipe !== null && recipe.agent.length > 0) {
    assumptions.push(
      `${candidate.sessionId} was recorded as agent "${fill.agent}" by ` +
        `decision, over the capsule's "${recipe.agent}".`
    );
  }
  const recordedCwd = firstText([
    fill.cwd,
    recipe?.cwd,
    candidate.capsules?.paneCwd
  ]);
  if (recordedCwd === null) {
    assumptions.push(
      `${candidate.sessionId} has no working directory on record, so the ` +
        'project folder was used. A session started in a subfolder comes back ' +
        'one level up.'
    );
  }

  const row: ManifestSessionRecord = {
    id: candidate.sessionId,
    name,
    // tmux is truth for names when the session is live. Falling back to the
    // recipe and then to the display name keeps the column non empty, which
    // the schema requires.
    tmuxName: tmuxName ?? tmux.sanitizeSessionName(name),
    projectPath,
    cwd,
    agent: agent as ManifestSessionRecord['agent'],
    // A live session is running. Everything else is a restore candidate, and
    // reconcile is the authority the moment the app next refreshes.
    status: live !== null ? 'running' : 'restorable',
    createdAt,
    argv: recipe?.argv ?? [],
    lastSeen
  };
  if (recipe?.agentSessionId !== undefined && recipe.agentSessionId !== null) {
    row.agentSessionId = recipe.agentSessionId;
  }
  if (recipe?.resumeArgv != null && recipe.resumeArgv.length > 0) {
    row.resumeArgv = recipe.resumeArgv;
    row.resumeCapture = 'armed';
  } else {
    // `none` for a plain shell, which has nothing to resume. `unavailable`
    // for an agent, which had something and it is not on record. The
    // difference is what the user reads in the session list, so it is not
    // flattened into one value.
    row.resumeCapture = agent === 'shell' ? 'none' : 'unavailable';
  }
  return { row, assumptions };
}

/** The first value that is a non empty string, or null. */
function firstText(values: readonly (string | null | undefined)[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return null;
}

/**
 * Create the rebuilt manifest and fill it.
 *
 * `ManifestStore` is the only writer, so the rebuilt file is created by the
 * same opener, the same migrations and the same insert statement as a manifest
 * the app made itself. A second insert path here would be a second thing to
 * keep in step with the schema.
 *
 * A project row is written for every distinct project folder, because without
 * them the rebuilt manifest has sessions and no tabs to show them in.
 */
function writeManifest(
  manifestPath: string,
  rows: readonly ManifestSessionRecord[]
): string[] {
  const store = new ManifestStore(manifestPath);
  const projects: string[] = [];
  try {
    for (const path of new Set(rows.map((r) => r.projectPath))) {
      const project: Project = {
        id: randomUUID(),
        path,
        name: basename(path) || path
      };
      store.upsertProject(project);
      projects.push(path);
    }
    for (const row of rows) store.insertSession(row);
  } finally {
    store.close();
  }
  return projects;
}

/**
 * Read every row back from a second connection and compare it to what was
 * intended.
 *
 * A second connection, opened after the writing one closed, is the part that
 * matters. Reading back through the connection that wrote proves the rows are
 * in that connection's cache and nothing more.
 *
 * The per table content hash from Phase 19 is recorded as well, so a later
 * comparison against another generation of this manifest is a hash comparison
 * rather than a row count. Research 34 §3.2 measured a copy with identical row
 * counts in every table and stale values in 40 of them.
 */
function verifyWritten(
  manifestPath: string,
  intended: readonly ManifestSessionRecord[]
): {
  digests: Record<string, string>;
  verified: boolean;
  mismatches: string[];
} {
  const mismatches: string[] = [];
  const store = new ManifestStore(manifestPath);
  try {
    const back = new Map(store.listSessions().map((r) => [r.id, r]));
    for (const row of intended) {
      const found = back.get(row.id);
      if (found === undefined) {
        mismatches.push(`${row.id}: no row came back`);
        continue;
      }
      for (const field of COMPARED_FIELDS) {
        const a = JSON.stringify(row[field]);
        const b = JSON.stringify(found[field]);
        if (a !== b) mismatches.push(`${row.id}: ${field} is ${b}, wrote ${a}`);
      }
    }
    if (back.size !== intended.length) {
      mismatches.push(
        `the rebuilt manifest holds ${String(back.size)} rows, wrote ` +
          String(intended.length)
      );
    }
  } finally {
    store.close();
  }

  let digests: Record<string, string> = {};
  let db: Database.Database | null = null;
  try {
    db = new Database(manifestPath, { readonly: true, fileMustExist: true });
    digests = tableDigests(db);
  } catch (err) {
    mismatches.push(`digest failed: ${(err as Error).message}`);
  } finally {
    db?.close();
  }

  return { digests, verified: mismatches.length === 0, mismatches };
}

/**
 * The fields the read back compares.
 *
 * Named rather than deep comparing the whole record, because `lastSeen` is a
 * clock reading and a future column could be written by the store itself. Every
 * field here is one a reconstruction claims to have restored.
 */
const COMPARED_FIELDS = [
  'name',
  'tmuxName',
  'projectPath',
  'cwd',
  'agent',
  'status',
  'createdAt',
  'argv',
  'agentSessionId',
  'resumeArgv',
  'resumeCapture'
] as const satisfies readonly (keyof ManifestSessionRecord)[];

// ---------------------------------------------------------------------------
// Reading the plan out loud
// ---------------------------------------------------------------------------

/**
 * The plan as lines a person can read in a terminal or a dialog.
 *
 * It exists so the caller that shows the plan and the caller that logs it
 * cannot drift into describing the same plan two different ways.
 */
export function summarizePlan(plan: ReconstructionPlan): string[] {
  const lines: string[] = [];
  lines.push(`snapshots read from ${plan.snapshotsDirectory}`);
  lines.push(
    plan.tmuxReachable
      ? `tmux answered. ${String(plan.foreign.length)} live sessions carry no identity and are not ours.`
      : 'tmux did not answer, so the capsules are the only evidence.'
  );
  lines.push(
    plan.liveManifestSessions === null
      ? `the live manifest at ${plan.liveManifestPath} could not be read`
      : `the live manifest holds ${String(plan.liveManifestSessions)} session rows`
  );
  for (const c of plan.candidates) {
    const where = c.live.length > 0 ? `live as ${c.live[0]?.tmuxName ?? ''}` : 'not live';
    const shape = c.recipe === null ? 'no recipe' : `agent ${c.recipe.agent}`;
    const gate = c.decisionRequired ? 'DECISION NEEDED' : 'ready';
    lines.push(`  ${c.sessionId}  ${gate}  ${where}  ${shape}`);
    for (const note of c.notes) lines.push(`      ${note}`);
  }
  for (const f of plan.foreign) {
    lines.push(`  not ours, untouched: ${f.tmuxId} ${f.tmuxName}`);
  }
  if (plan.unrecordedScrollback.length > 0) {
    lines.push(
      `${String(plan.unrecordedScrollback.length)} sessions have scrollback on ` +
        'disk that no record describes and no live session claims. Nothing can ' +
        'be rebuilt for them.'
    );
  }
  return lines;
}
