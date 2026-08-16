/**
 * Scrollback snapshots — the reboot survival layer (Phase 19 item 3).
 *
 * `capture-pane -p -e -J -S -<saved lines>` of each live session is written
 * under <userData>/gmux/snapshots at the capture points listed in
 * FINAL-REPORT §2.4 Step 2:
 *   - app quit           (shutdownGmuxCore → GmuxCore.snapshotAllSessions)
 *   - session close      (GmuxCore.killSession, before kill-session)
 *   - session death      (GmuxCore.reapDeadSession)
 *   - control-client %exit (server-exit handler — best effort)
 *
 * WHAT WAS WRONG BEFORE PHASE 19
 *
 * The old write was `writeFile` to a fixed temporary name, then `rename`. Four
 * separate defects sat in those two lines.
 *  1. No flush. The bytes were in the page cache and the rename was in the
 *     directory's cache, so a power cut could publish a name with no data
 *     behind it. Neither the old copy nor the new one survived.
 *  2. No size or hash check. On a volume filled to ENOSPC the write failed,
 *     the rename returned success, and a zero byte file was published over a
 *     good snapshot. That was measured, not reasoned (research 34 §3.1).
 *  3. One generation. A destructive replace has a moment where the old copy is
 *     gone and the new one is not published. Nothing could fall back.
 *  4. A fixed temporary name, `.<sessionId>.tmp`. The quit path and the %exit
 *     path both exist and can run at once, and they wrote the same file.
 *
 * Every write here now goes through src/main/durable, which owns the sequence
 * in research 34 §4 and is the only place in the product allowed to implement
 * it. This module owns the layout, the records and the locking.
 *
 * THE LAYOUT
 *
 *   <dir>/<sessionId>.txt.000003     body, generation 3, the newest
 *   <dir>/<sessionId>.txt.000002     body, generation 2
 *   <dir>/<sessionId>.capsules.json  the completion record for both
 *   <dir>/<sessionId>.txt            a snapshot written before Phase 19
 *   <dir>/.<name>.<stamp>.part       a staged write, in flight or crashed
 *
 * A body is never overwritten. Each capture writes the next generation and the
 * ring keeps SNAPSHOT_GENERATIONS of them, so a body that fails verification
 * falls back to the one before it.
 *
 * THE ORDER, WHICH IS THE PART THAT IS EASY TO GET BACKWARDS
 *
 *   1. Publish the body durably. Only after its directory flush returns does
 *      the durable module hand back the byte count and the hash.
 *   2. Write the completion record naming it. The record must never become
 *      durable before the thing it points at, which is LevelDB's rule.
 *   3. Prune, and only then. Pruning before the record commits puts back the
 *      single point of failure that generations exist to remove.
 *
 * THE COMPLETION RECORD IS A FILE HERE, AND THE MANIFEST IS ITS HOME
 *
 * Research 34 §4 step 9 says the record belongs in the SQLite manifest, because
 * the manifest is already the source of truth for restore. It is a file, and
 * that is a KNOWN, RECORDED DEVIATION rather than an oversight. Stated plainly
 * so nobody reads agreement into silence.
 *
 * What the deviation costs. There are two durability domains for snapshots
 * instead of one, and item 7 puts the restore journal in the manifest for
 * exactly the reason that a second domain can disagree with the first.
 *
 * Why it is survivable, measured rather than assumed. The index is written
 * through the same durable sequence as a body, so it is published by an atomic
 * rename and a reader sees either the whole previous record or the whole new
 * one. There is no torn-record state to mistake for a real disagreement. The
 * one loss the file domain adds is losing the index outright, which makes every
 * body unreadable at once, and the ring cannot help with that.
 *
 * Why it did not move in the fix round. The move needs a manifest table, a
 * migration, and an injected store handle inside a module that is deliberately
 * a leaf on the quit path. That is a change to the write path that protects the
 * user's scrollback, made at the end of a phase, and it is worth its own round
 * with its own verification. Phase 20 owns it. `readCapsules` and
 * `resolveSnapshot` are still the only two readers, so the store moves behind
 * them without touching a caller.
 *
 * WHY THE CAPSULE CARRIES MORE THAN THE HASH
 *
 * Phase 20 reconstruction cannot be built later from bodies alone (research 33
 * §2.4). It needs to know whose scrollback it is, which generation it is and
 * what it supersedes, why the capture ran, where the pane was, how much text
 * there is, and how to launch that session again. The last one is
 * `SnapshotSessionRecipe` and it was missing until the fix round. None of it is
 * recoverable after the fact, so it is recorded now even though nothing reads
 * it yet.
 *
 * Ownership: src/main/restore/**.
 */

import { app } from 'electron';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import {
  generationPath,
  listGenerations,
  pruneGenerations,
  writeDurable
} from '../durable';
import { faultPoint } from '../fault/inject';
import * as tmux from '../tmux';
// DIRECT, not through ../settings — that barrel re-exports its own ipc module,
// which pulls in the menu; a leaf on the quit path must not drag that in.
import { getSettings } from '../settings/store';
import { trimSnapshotText } from './command';

/**
 * Fallback saved depth. The live value is Settings → "Saved scrollback"
 * (`GmuxSettings.savedScrollbackLines`, Phase 13.7); this constant is what a
 * caller gets when settings cannot be read at all.
 *
 * NOT the same number as tmux's `history-limit`, and not derived from it: the
 * two are independent. `history-limit` is how far scrolling and capture can
 * REACH; this is only how much is written into the reboot snapshot. Raising
 * one does not move the other.
 *
 * The cost of raising this is QUIT LATENCY, not disk. Snapshots run under
 * `Promise.allSettled` but serialise inside the single-threaded tmux server:
 * 16 sessions at 10,000 lines is 0.9-1.9 s, at 50,000 it is 4.7-9.0 s.
 */
export const SNAPSHOT_LINES = 10_000;

/**
 * Bodies kept per session.
 *
 * Three, and the number is a disk bill rather than a guess. The operator's own
 * directory is 43 sessions and 1.2 MB, with the largest body at 526 KB, so a
 * ring of three costs 3.6 MB there. At the 25,000 line ceiling the same fleet
 * would cost about 50 MB.
 *
 * Two would be enough to remove the destructive replace. The third is for the
 * case the ring exists for: the newest body fails its hash, the one before it
 * was written by the same crashing run, and the reader still has somewhere to
 * go.
 */
export const SNAPSHOT_GENERATIONS = 3;

/**
 * Record shape of one capsule. Bumped when a field changes meaning.
 *
 * 2 (Phase 21): `session.agentVersion` now holds the AGENT's version. In
 * version 1 it held the SpecStory wrapper's version, which was the only
 * version the manifest recorded at the time. The manifest now records both, so
 * the capsule carries both, and each field is named for the binary it
 * describes. See `SnapshotSessionRecipe`.
 */
export const CAPSULE_VERSION = 2;

/** Extension every body carries, before its generation suffix. */
const BODY_EXTENSION = '.txt';

/** Name of the completion record, appended to the session id. */
const CAPSULE_SUFFIX = '.capsules.json';

/** A body name is the stem, a dot, then this many digits. */
const GENERATION_PATTERN = /^\d+$/;

/**
 * Why a capture ran. Recorded in the capsule so Phase 20 can tell a snapshot
 * taken because the machine was going to sleep from one taken because the pane
 * died, which are worth different amounts during reconstruction.
 */
export type SnapshotReason =
  /** shutdownGmuxCore → snapshotAllSessions. */
  | 'app-quit'
  /** killSession, before the pane goes. */
  | 'session-close'
  /** reapDeadSession, after `remain-on-exit` kept the husk readable. */
  | 'session-death'
  /** The control client saw %exit. */
  | 'server-exit'
  /** The machine is suspending (Phase 19 item 11). */
  | 'system-sleep'
  /** A timed capture (Phase 20). */
  | 'checkpoint'
  /** The resume conformance harness. */
  | 'conformance'
  /** The caller did not say. */
  | 'unknown';

/**
 * The recipe for the session a body belongs to.
 *
 * WHY IT IS IN THE CAPSULE AND NOT LOOKED UP LATER. Phase 20 reconstruction
 * rebuilds a manifest that has been lost, so by definition it cannot read the
 * manifest to find out whose scrollback a file is. Research 33 row 5 states the
 * requirement directly, and its guard is that the metadata must be sufficient
 * for that reconstruction. Until the Phase 19 fix round the capsule carried a
 * session id and a pane working directory and nothing else, so every capsule
 * written between now and Phase 20 would have been unusable for the one job the
 * capsule exists for.
 *
 * Null on a capture whose caller did not have the row, e.g. the `%exit` path
 * racing a server that has gone away. A null field is honest; an invented one
 * would be a recipe that launches the wrong thing.
 */
export interface SnapshotSessionRecipe {
  /** The user's own name for it. */
  name: string;
  /** tmux session name, for a reconstruction that has to match a live server. */
  tmuxName: string;
  /** Repository root this session belongs to. */
  projectPath: string;
  /** Working directory it was started in. Not the pane's current one. */
  cwd: string;
  /** Which agent, e.g. `claude`. */
  agent: string;
  /** The agent's own conversation id, when it has one. */
  agentSessionId: string | null;
  /** Full launch argv, absolute binary path, exactly as the manifest holds it. */
  argv: string[];
  /** Full resume argv, or null when this session has no armed resume. */
  resumeArgv: string[] | null;
  /**
   * The version of the AGENT binary this session launched with, when a
   * detection scan recorded one. A `brew upgrade` mid-session changes what a
   * resume means, and a reconstruction that cannot see the version cannot know
   * that.
   *
   * In a version 1 capsule this field held the SpecStory WRAPPER's version
   * instead, under a name that said agent. Phase 21 gave the manifest an
   * `agent_version` column of its own, so the field now carries what it is
   * named for and the wrapper's version has its own field below. Check
   * `SnapshotCapsule.version` before trusting an old one.
   */
  agentVersion: string | null;
  /**
   * The version of the SpecStory wrapper this session launched under, when it
   * launched under one. Recorded so a reconstruction replays the same wrapper
   * binary, which is the reason `sessions.specstory.binVersion` exists.
   */
  specstoryVersion: string | null;
}

/** Everything Phase 20 reconstruction needs about one body. */
export interface SnapshotCapsule {
  /** Record shape. See CAPSULE_VERSION. */
  version: number;
  /** Whose scrollback this is. Identity, never a name. */
  sessionId: string;
  /** This generation's number. Higher is newer. */
  generation: number;
  /** The generation this one supersedes, or null when it is the first. */
  parent: number | null;
  /** Why the capture ran. */
  reason: SnapshotReason;
  /** Absolute path of the body this record describes. */
  path: string;
  /** Working directory of the captured pane, or null when tmux would not say. */
  cwd: string | null;
  /**
   * How to rebuild this session without a manifest. Null when the caller did
   * not have the row. See SnapshotSessionRecipe.
   */
  session: SnapshotSessionRecipe | null;
  /** Newlines in the body. */
  lines: number;
  /** Byte length of the body. */
  bytes: number;
  /** Hex sha256 of the body. */
  sha256: string;
  /** When the capture completed. Epoch milliseconds. */
  capturedAt: number;
}

/** The completion record file, newest capsule first. */
interface CapsuleIndexFile {
  version: number;
  sessionId: string;
  capsules: SnapshotCapsule[];
}

/** What a reader should open for one session, and how much it is trusted. */
export interface SnapshotResolution {
  /** Absolute path of the body to read. */
  path: string;
  /** The record that proved it, or null for an unproven legacy file. */
  capsule: SnapshotCapsule | null;
  /** True when the bytes on disk matched a recorded length and hash. */
  verified: boolean;
  /** Which layout it came from. */
  source: 'generation' | 'legacy';
  /**
   * How many NEWER recorded generations were rejected before this one proved
   * out. Zero on the normal path.
   *
   * Above zero means the ring did its job: the newest capture is unreadable
   * and an earlier one is being used instead. That is a state the user has to
   * be told about, because their most recent scrollback is gone, so item 9's
   * `snapshot-repaired` notice is posted on it.
   */
  rejected: number;
}

export interface CaptureSnapshotOptions {
  /** Why this capture is running. Defaults to 'unknown'. */
  reason?: SnapshotReason;
  /**
   * The pane's working directory, when the caller already knows it. Left out,
   * this module reads it from tmux once per fleet per PANE_CWD_TTL_MS.
   */
  cwd?: string;
  /**
   * The manifest row for this session, so the capsule can carry the recipe.
   *
   * The CALLER passes it rather than this module reading the manifest. This
   * module is a leaf on the quit path and importing the store here would make
   * a cycle with the sessions core, which already holds the row it is about to
   * capture. See SnapshotSessionRecipe for why the field exists at all.
   */
  session?: SnapshotSessionRecipe;
  /**
   * Called once with the pane text this capture read, before anything is
   * written and before the empty-pane early return.
   *
   * Phase 48. The reaper needs the last thing the pane printed and this
   * function is already holding it. A second `capture-pane` on the death path
   * would be a second read of a pane that is about to be killed, so the text
   * is handed over instead. It is called at most once per capture, inside a
   * try/catch, and a sink that throws cannot affect the snapshot.
   */
  onPaneText?: (text: string) => void;
}

/** What one file in the snapshots directory is. */
export type SnapshotFileKind = 'body' | 'index' | 'legacy' | 'staged' | 'other';

// ---------------------------------------------------------------------------
// Names and paths
// ---------------------------------------------------------------------------

/** <userData>/gmux/snapshots — sibling of the manifest DB. */
export function snapshotsDir(): string {
  return join(app.getPath('userData'), 'gmux', 'snapshots');
}

/**
 * The stem every generation of one session hangs off.
 *
 * It keeps the `.txt` so a body is still `<id>.txt.000003` and still opens in
 * anything that guesses by extension.
 */
export function snapshotStem(sessionId: string): string {
  return `${sessionId}${BODY_EXTENSION}`;
}

/** Absolute path of one generation's body. */
export function snapshotBodyPath(sessionId: string, generation: number): string {
  return generationPath(snapshotsDir(), snapshotStem(sessionId), generation);
}

/** Absolute path of one session's completion record. */
export function capsuleIndexPath(sessionId: string): string {
  return join(snapshotsDir(), `${sessionId}${CAPSULE_SUFFIX}`);
}

/**
 * Absolute path of the single file a pre-Phase-19 build wrote.
 *
 * Read as a last resort and deleted once a verified generation replaces it.
 * The operator had 43 of these on the machine the day this landed, so removing
 * the fallback would have cost them their scrollback on the next restore.
 */
export function legacySnapshotPath(sessionId: string): string {
  return join(snapshotsDir(), `${sessionId}${BODY_EXTENSION}`);
}

/**
 * What a file name in the snapshots directory is, and whose it is.
 *
 * Exported because two other modules classify these files: the Settings
 * scrollback card totals what is on disk, and the fault harness reports staged
 * files left by a crash. Neither should carry its own copy of the layout.
 */
export function classifySnapshotFile(name: string): {
  kind: SnapshotFileKind;
  sessionId: string | null;
} {
  if (name.startsWith('.')) {
    return { kind: name.endsWith('.part') ? 'staged' : 'other', sessionId: null };
  }
  if (name.endsWith(CAPSULE_SUFFIX)) {
    return { kind: 'index', sessionId: name.slice(0, -CAPSULE_SUFFIX.length) };
  }
  const lastDot = name.lastIndexOf('.');
  const suffix = lastDot === -1 ? '' : name.slice(lastDot + 1);
  const head = lastDot === -1 ? name : name.slice(0, lastDot);
  if (GENERATION_PATTERN.test(suffix) && head.endsWith(BODY_EXTENSION)) {
    return { kind: 'body', sessionId: head.slice(0, -BODY_EXTENSION.length) };
  }
  if (name.endsWith(BODY_EXTENSION)) {
    return { kind: 'legacy', sessionId: name.slice(0, -BODY_EXTENSION.length) };
  }
  return { kind: 'other', sessionId: null };
}

// ---------------------------------------------------------------------------
// The read path (research 34 §4 steps 11 to 13)
// ---------------------------------------------------------------------------

/**
 * The completion record for one session, newest capsule first.
 *
 * Anything unreadable or malformed is an empty list rather than a throw. A
 * damaged record must degrade to "no verified snapshot", which is a restore
 * without scrollback, and never to a failed restore.
 */
export function readCapsules(sessionId: string): SnapshotCapsule[] {
  let raw: string;
  try {
    raw = readFileSync(capsuleIndexPath(sessionId), 'utf8');
  } catch {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const file = parsed as Partial<CapsuleIndexFile> | null;
  if (file === null || typeof file !== 'object' || !Array.isArray(file.capsules)) return [];
  const capsules: SnapshotCapsule[] = [];
  for (const candidate of file.capsules) {
    const capsule = sanitizeCapsule(candidate, sessionId);
    if (capsule !== null) capsules.push(capsule);
  }
  capsules.sort((a, b) => b.generation - a.generation);
  return capsules;
}

/**
 * The body a reader should open for one session, or null when there is none.
 *
 * Steps 11 to 13 of the sequence: walk the records newest first, check the
 * byte length before the hash because the length is free, and fall through to
 * the next record on either failure. A body with no record is never returned,
 * because replaying bytes nothing vouched for is how a user is shown half of
 * one session and half of another.
 *
 * The one exception is a snapshot written before Phase 19. It has no record
 * and it is returned with `verified: false`, because refusing it would have
 * thrown away every snapshot on the machine the day this shipped.
 *
 * SYNCHRONOUS ON PURPOSE. Every caller is already inside a restore that spawns
 * a tmux session, and the work is one read plus one hash of a file whose
 * largest real example is 526 KB. Keeping it synchronous is what let
 * `existingSnapshotPath` keep the signature every caller already has.
 */
export function resolveSnapshot(sessionId: string): SnapshotResolution | null {
  let rejected = 0;
  for (const capsule of readCapsules(sessionId)) {
    // The path is DERIVED from the session and the generation rather than read
    // out of the record. The record is a file in a directory the app writes,
    // and a reader that follows a path out of it would `cat` whatever a
    // damaged or edited record named. The recorded path is still kept, because
    // Phase 20 wants to know where the body was written.
    const path = snapshotBodyPath(sessionId, capsule.generation);
    if (!bodyVerifies(path, capsule)) {
      rejected += 1;
      continue;
    }
    return { path, capsule, verified: true, source: 'generation', rejected };
  }
  const legacy = legacySnapshotPath(sessionId);
  try {
    if (statSync(legacy).size > 0) {
      return {
        path: legacy,
        capsule: null,
        verified: false,
        source: 'legacy',
        rejected
      };
    }
  } catch {
    /* no legacy file is the normal case after the first capture */
  }
  return null;
}

/**
 * Read one body back and prove it against its record.
 *
 * The length is checked first. It is free, and it rejects the truncation case
 * without hashing a file that cannot be right.
 */
function bodyVerifies(path: string, capsule: SnapshotCapsule): boolean {
  let data: Buffer;
  try {
    data = readFileSync(path);
  } catch {
    return false;
  }
  if (data.length !== capsule.bytes) return false;
  return createHash('sha256').update(data).digest('hex') === capsule.sha256;
}

/**
 * The snapshot path when one exists on disk, else null.
 *
 * Same signature it has always had. It now returns the newest body that proves
 * out rather than a name that may or may not be a file.
 */
export function existingSnapshotPath(sessionId: string): string | null {
  return resolveSnapshot(sessionId)?.path ?? null;
}

/**
 * Does saved scrollback MATERIAL exist for this session at all? (Phase 26.3)
 *
 * Presence, not proof. This is two statSync calls — the completion record, or
 * failing that the pre-Phase-19 body — with no read and no hash, because it
 * runs for every ended row on every sessions broadcast. The renderer uses it
 * to decide whether an ended session may OFFER Restore; whether the recorded
 * bytes actually verify stays where it belongs, inside `resolveSnapshot`
 * during the restore itself, which is already honest about a body that fails
 * its hash.
 *
 * Any error is `false`, including a stat that failed for a reason other than
 * absence: material that cannot be stat-ed is material a restore cannot
 * replay, and a session with a recorded resume argv still offers Restore on
 * the strength of the argv alone.
 */
export function snapshotMaterialExists(sessionId: string): boolean {
  try {
    if (statSync(capsuleIndexPath(sessionId)).size > 0) return true;
  } catch {
    /* no completion record — fall through to the legacy layout */
  }
  try {
    return statSync(legacySnapshotPath(sessionId)).size > 0;
  } catch {
    return false;
  }
}

/**
 * The path a reader should open for this session.
 *
 * Kept because callers outside this module already had it. It answers with the
 * resolved body when there is one and with the legacy name otherwise, so a
 * caller that opens it and fails is in the same position it was before. New
 * code should call `resolveSnapshot`, which says whether the bytes were
 * proven.
 */
export function snapshotPath(sessionId: string): string {
  return resolveSnapshot(sessionId)?.path ?? legacySnapshotPath(sessionId);
}

// ---------------------------------------------------------------------------
// The write path
// ---------------------------------------------------------------------------

// Pane-target resolution (`=name` is not a valid target-PANE on tmux 3.6a)
// now lives in src/main/tmux/sessions.ts — promoted there when terminal
// capture became its second caller (standing guardrail 3: one copy).
const resolvePaneTarget = tmux.resolvePaneTarget;

/** Lines to write into a snapshot, from settings, clamped. */
function savedLines(): number {
  try {
    return getSettings().savedScrollbackLines;
  } catch {
    return SNAPSHOT_LINES;
  }
}

/**
 * Capture one live session's scrollback and publish it as the next generation.
 *
 * Durable by contract. When this returns true the bytes are on disk, they have
 * been read back and hashed, their directory has been flushed, and a record
 * naming them is itself durable. When it throws, nothing was recorded and the
 * previous generation is still the newest one a reader will find.
 *
 * Best effort by contract for the CALLER: quit and kill paths must not fail
 * the user-visible operation because a capture failed. The out of space case
 * arrives as a `DurableWriteError` that `isOutOfSpace` recognises, which is
 * what Phase 19 item 4 turns into the notice the user sees.
 *
 * Serialised per session. The quit path and the %exit path can both reach one
 * session at the same moment, and before Phase 19 they wrote the same
 * temporary file.
 */
export async function captureSessionSnapshot(
  target: string,
  sessionId: string,
  options: CaptureSnapshotOptions = {}
): Promise<boolean> {
  return withSessionLock(sessionId, () => captureLocked(target, sessionId, options));
}

async function captureLocked(
  target: string,
  sessionId: string,
  options: CaptureSnapshotOptions
): Promise<boolean> {
  const paneTarget = await resolvePaneTarget(target);
  const text = trimSnapshotText(await tmux.capturePane(paneTarget, savedLines()));
  // Phase 48. Hand the text over BEFORE the early return, because a pane that
  // died on its first line is exactly the pane whose last words matter and it
  // is also the one most likely to be short. A sink that throws is the sink's
  // problem, never the snapshot's.
  if (options.onPaneText !== undefined) {
    try {
      options.onPaneText(text);
    } catch {
      /* a reader of the text may not break the writer of the snapshot */
    }
  }
  if (text.length === 0) return false; // nothing worth replaying
  const body = Buffer.from(text, 'utf8');
  const cwd = options.cwd ?? (await paneCwd(paneTarget));

  const dir = snapshotsDir();
  const stem = snapshotStem(sessionId);
  const existing = await listGenerations(dir, stem);
  // The number comes off the DISK, so it cannot collide with a body a crash
  // left behind. The parent comes off the RECORD, so the chain of capsules
  // Phase 20 walks never points at a generation that has no capsule.
  const recorded = readCapsules(sessionId);
  const generation = (existing[0]?.generation ?? 0) + 1;
  const parent = recorded[0]?.generation ?? null;
  const path = generationPath(dir, stem, generation);

  faultPoint('snapshot.before-write');
  // Steps 1 to 8. Throws rather than publishing a file it cannot prove.
  const receipt = await writeDurable({ path, data: body });
  // The torn window is now here rather than around a rename: the body is
  // published and flushed, and nothing records it. A reader falls back to the
  // previous generation, which is the whole point of the ring. Fault matrix
  // row 9.
  faultPoint('snapshot.after-write');

  const capsule: SnapshotCapsule = {
    version: CAPSULE_VERSION,
    sessionId,
    generation,
    parent,
    reason: options.reason ?? 'unknown',
    path: receipt.path,
    cwd,
    session: options.session ?? null,
    lines: countLines(body),
    bytes: receipt.bytes,
    sha256: receipt.sha256,
    capturedAt: Date.now()
  };

  // Step 9. The record, and it may not become durable before step 8 returned.
  // `writeDurable` returns only after the body's directory flush, so this line
  // running at all is the proof of that ordering.
  let survivors: number[];
  try {
    survivors = await writeCapsuleIndex(sessionId, capsule, recorded);
  } catch (err) {
    // An unrecorded body is unreadable by design, and leaving it would let it
    // crowd a recorded generation out of the ring. Take it back out.
    await rm(path, { force: true }).catch(() => undefined);
    throw err;
  }
  faultPoint('snapshot.after-rename');

  // Step 10, and only now. The survivor list is the RECORD's, not the
  // directory's, which is the fix round's correction. This also sweeps staged
  // files an earlier crash left behind, anywhere in the directory.
  await pruneGenerations(dir, stem, SNAPSHOT_GENERATIONS, {
    recorded: survivors
  }).catch(() => undefined);
  // The pre-Phase-19 file is superseded by bytes that have been proven. It is
  // removed here rather than at boot so it is never removed before its
  // replacement exists.
  await rm(legacySnapshotPath(sessionId), { force: true }).catch(() => undefined);
  return true;
}

/**
 * Write the completion record for one session, newest capsule first, and
 * return the generations it names.
 *
 * THE SURVIVORS COME FROM THE RECORD, NOT FROM THE DIRECTORY, and getting that
 * backwards was measured to destroy the fallback the ring exists to provide.
 * The earlier version picked survivors from a directory listing. A crash inside
 * `snapshot.after-write` leaves an UNRECORDED body on disk, and unrecorded
 * bodies are unreadable by design because nothing vouches for their bytes. With
 * the directory as the source, one recorded generation plus two crash orphans
 * plus one good capture left generations 2, 3 and 4 on disk with only 4
 * recorded. The recorded and verified generation 1 was deleted, and the number
 * of bodies a reader could fall back to went from one to zero. That is exactly
 * the case SNAPSHOT_GENERATIONS = 3 is documented to exist for.
 */
async function writeCapsuleIndex(
  sessionId: string,
  capsule: SnapshotCapsule,
  recordedBefore: readonly SnapshotCapsule[]
): Promise<number[]> {
  const kept = recordedBefore
    .filter((old) => old.generation !== capsule.generation)
    .sort((a, b) => b.generation - a.generation)
    .slice(0, SNAPSHOT_GENERATIONS - 1);
  const file: CapsuleIndexFile = {
    version: CAPSULE_VERSION,
    sessionId,
    capsules: [capsule, ...kept]
  };
  await writeDurable({
    path: capsuleIndexPath(sessionId),
    data: `${JSON.stringify(file, null, 2)}\n`
  });
  return file.capsules.map((c) => c.generation);
}

/**
 * Remove every trace of one session's snapshots (discard / cleanup).
 *
 * Takes the same lock a capture takes, so a discard racing the quit-time
 * capture of the same session cannot leave one file of a set behind.
 */
export async function deleteSnapshot(sessionId: string): Promise<void> {
  await withSessionLock(sessionId, async () => {
    const dir = snapshotsDir();
    const stem = snapshotStem(sessionId);
    for (const found of await listGenerations(dir, stem)) {
      await rm(found.path, { force: true }).catch(() => undefined);
    }
    await rm(capsuleIndexPath(sessionId), { force: true }).catch(() => undefined);
    await rm(legacySnapshotPath(sessionId), { force: true }).catch(() => undefined);
  });
}

// ---------------------------------------------------------------------------
// The per-session write lock
// ---------------------------------------------------------------------------

/**
 * One promise chain per session, dropped when the chain drains.
 *
 * Module scope rather than a class, because every caller of this module is a
 * free function and giving them an object to hold would be a second way to
 * reach the same files.
 */
const writeLocks = new Map<string, Promise<void>>();

function withSessionLock<T>(sessionId: string, work: () => Promise<T>): Promise<T> {
  const prior = writeLocks.get(sessionId) ?? Promise.resolve();
  // `then(work, work)` rather than `then(work)`: a failed capture must not
  // stop the next one from running.
  const run = prior.then(work, work);
  const tail = run.then(
    () => undefined,
    () => undefined
  );
  writeLocks.set(sessionId, tail);
  void tail.then(() => {
    if (writeLocks.get(sessionId) === tail) writeLocks.delete(sessionId);
  });
  return run;
}

/** Sessions with a capture or a delete in flight. Test and diagnostic use. */
export function snapshotWritesInFlight(): number {
  return writeLocks.size;
}

// ---------------------------------------------------------------------------
// Pane working directory, read once per fleet
// ---------------------------------------------------------------------------

/**
 * How long one fleet read of `pane_current_path` is reused.
 *
 * A quit captures 43 sessions at once and every one of them wants a working
 * directory. One `list-panes -a` answers all of them for the price of a single
 * tmux client spawn, and two seconds of drift in a metadata field nothing acts
 * on is not worth 42 more spawns on the quit path.
 */
const PANE_CWD_TTL_MS = 2_000;

const CWD_FORMAT = ['#{session_id}', '#{pane_active}', '#{pane_current_path}'].join('\t');

let paneCwdCache: { at: number; byTarget: Map<string, string> } | null = null;
/**
 * The read that is happening right now, shared by everyone waiting on it.
 *
 * Without this the cache is useless on the path it was built for: a quit fires
 * 43 captures in one tick, all of them miss a cache that nothing has filled
 * yet, and all 43 spawn a tmux client.
 */
let paneCwdInFlight: Promise<Map<string, string> | null> | null = null;

/** The active pane's working directory for a `$-id`, or null. */
async function paneCwd(paneTarget: string): Promise<string | null> {
  const fresh = Date.now() - (paneCwdCache?.at ?? -Infinity) <= PANE_CWD_TTL_MS;
  if (paneCwdCache !== null && fresh) return paneCwdCache.byTarget.get(paneTarget) ?? null;

  paneCwdInFlight ??= readFleetCwds().finally(() => {
    paneCwdInFlight = null;
  });
  const read = await paneCwdInFlight;
  // A failed read is not cached. The server going away during a %exit capture
  // must not blank the field for every session behind it.
  if (read === null) return null;
  paneCwdCache = { at: Date.now(), byTarget: read };
  return read.get(paneTarget) ?? null;
}

async function readFleetCwds(): Promise<Map<string, string> | null> {
  let out: string;
  try {
    out = await tmux.execTmux(['list-panes', '-a', '-F', CWD_FORMAT]);
  } catch {
    return null; // no server, or it just went away
  }
  const byTarget = new Map<string, string>();
  for (const line of out.split('\n')) {
    const [tmuxId, active, cwd] = line.split('\t');
    if (tmuxId === undefined || cwd === undefined || cwd.length === 0) continue;
    if (active !== '1') continue; // capture-pane photographs the active pane
    byTarget.set(tmuxId, cwd);
  }
  return byTarget;
}

/** Test hook: forget the fleet read so the next capture takes a fresh one. */
export function resetPaneCwdCacheForTests(): void {
  paneCwdCache = null;
  paneCwdInFlight = null;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Newlines in a body. `trimSnapshotText` guarantees a trailing one. */
function countLines(body: Buffer): number {
  let lines = 0;
  for (let at = body.indexOf(0x0a); at !== -1; at = body.indexOf(0x0a, at + 1)) lines += 1;
  return lines;
}

/**
 * One recipe, or null when the record does not carry a usable one.
 *
 * A recipe with no `argv` cannot launch anything, so a partial one is refused
 * outright rather than handed to Phase 20 as if it were a recipe. A capsule
 * written before this field existed reaches here as `undefined` and gets null,
 * which is the honest answer for it.
 */
function sanitizeRecipe(value: unknown): SnapshotSessionRecipe | null {
  if (value === null || typeof value !== 'object') return null;
  const r = value as Record<string, unknown>;
  const argv = r['argv'];
  if (!Array.isArray(argv) || !argv.every((a) => typeof a === 'string')) return null;
  if (argv.length === 0) return null;
  const text = (key: string): string =>
    typeof r[key] === 'string' ? (r[key] as string) : '';
  const optional = (key: string): string | null =>
    typeof r[key] === 'string' ? (r[key] as string) : null;
  const resumeArgv = r['resumeArgv'];
  return {
    name: text('name'),
    tmuxName: text('tmuxName'),
    projectPath: text('projectPath'),
    cwd: text('cwd'),
    agent: text('agent'),
    agentSessionId: optional('agentSessionId'),
    argv: argv as string[],
    resumeArgv:
      Array.isArray(resumeArgv) && resumeArgv.every((a) => typeof a === 'string')
        ? (resumeArgv as string[])
        : null,
    agentVersion: optional('agentVersion'),
    specstoryVersion: optional('specstoryVersion')
  };
}

/** One capsule, or null when the record on disk cannot be trusted. */
function sanitizeCapsule(value: unknown, sessionId: string): SnapshotCapsule | null {
  if (value === null || typeof value !== 'object') return null;
  const c = value as Record<string, unknown>;
  if (typeof c['path'] !== 'string' || c['path'].length === 0) return null;
  if (typeof c['sha256'] !== 'string' || c['sha256'].length !== 64) return null;
  if (typeof c['bytes'] !== 'number' || !Number.isFinite(c['bytes']) || c['bytes'] < 0) {
    return null;
  }
  if (typeof c['generation'] !== 'number' || !Number.isInteger(c['generation'])) return null;
  const parent = c['parent'];
  return {
    version: typeof c['version'] === 'number' ? c['version'] : 0,
    sessionId: typeof c['sessionId'] === 'string' ? c['sessionId'] : sessionId,
    generation: c['generation'],
    parent: typeof parent === 'number' && Number.isInteger(parent) ? parent : null,
    reason: typeof c['reason'] === 'string' ? (c['reason'] as SnapshotReason) : 'unknown',
    path: c['path'],
    cwd: typeof c['cwd'] === 'string' ? c['cwd'] : null,
    session: sanitizeRecipe(c['session']),
    lines: typeof c['lines'] === 'number' ? c['lines'] : 0,
    bytes: c['bytes'],
    sha256: c['sha256'],
    capturedAt: typeof c['capturedAt'] === 'number' ? c['capturedAt'] : 0
  };
}
