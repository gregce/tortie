/**
 * The durable baseline (Phase 243) — the shapes both ends of the door speak.
 *
 * A baseline is the LEFT side the redline draws against: a PREVIOUS state of
 * a file whose CURRENT state is on disk and whose COMMITTED state is in git.
 * Phase 225 held it in memory on the tab and wrote it nowhere, which was the
 * right first step and which research 83 A3.3 recommended in that order.
 * Phase 238 then measured what it costs: what a person accepts lasts as long
 * as the tab is open, and dies on a quit, a crash, a window reload, or once
 * ten other files have been opened for keeps. This is the second step.
 *
 * ## IT IS NOT A BACKUP AND NOTHING HERE MAY READ AS ONE
 *
 * Research 83 A4.2's ruling and A3.4's reason. Losing a baseline loses the
 * NARROWING and nothing on disk: the view widens back to "since the last
 * commit", which is the redline that shipped before any of this. Making the
 * baseline durable makes the marking LAST LONGER; it does not make Tortie a
 * recovery product, and no sentence anywhere may imply the old text is kept
 * somewhere a person can go and get it. A person who believes Tortie is
 * holding their history stops committing, and that is a worse outcome than
 * the feature not existing.
 *
 * ## The key, and why it is a digest
 *
 * `(repo_path, rel_path)` is the shape `symbol_file`
 * (src/main/symbols/persist.ts) and `arch_tree_file` (src/main/arch/db.ts)
 * both already use. Here the key has to become a FILE NAME, so it is carried
 * as two digests and the record holds the two plain strings beside them: a
 * name that resolves to the wrong pair is dropped whole with the field and
 * the reason named, which is this codebase's standing rule for a bad row.
 * Digest naming also means no byte of a person's path ever becomes a path
 * inside their data directory — no traversal, no case collision, no length
 * limit, and nothing to plant.
 */

/** Where the baseline's bytes came from, which is what the face names. */
export type StoredBaselineOrigin = 'commit' | 'read' | 'accept';

/**
 * Why a store or a load answered nothing. Every one of these is a REFUSAL a
 * person could in principle cause, and each is answered as a word plus one
 * sentence naming the field, never as a throw and never as a partial merge.
 *
 *  - `input`      the request did not say which file, or said it in a shape
 *                 the door does not accept
 *  - `remote`     the tab is a file on another machine. A baseline belongs to
 *                 this Mac: two files at the same spelling on two computers
 *                 would otherwise share one key, and the operator's Mac Pro's
 *                 home really is `/Users/gdc` too
 *  - `outside`    the repository is not one of the folders Tortie has open,
 *                 or the file is not inside it
 *  - `prose`      the redline never draws this file, so a baseline for it
 *                 could never be used
 *  - `truncated`  the tab's read stopped at the read cap, so the bytes are
 *                 not the file and the guarded write already refuses to act
 *                 on them
 *  - `tooLarge`   the text is over the read cap
 *  - `record`     there is a record and it is not a record; dropped whole
 *  - `missing`    there is nothing stored for this file, which is the
 *                 ordinary answer and not a fault
 *  - `io`         the operating system refused a step
 */
export type BaselineRefusal =
  | 'input'
  | 'remote'
  | 'outside'
  | 'prose'
  | 'truncated'
  | 'tooLarge'
  | 'record'
  | 'missing'
  | 'io';

/** Which file a baseline belongs to. Both doors take exactly this. */
export interface BaselineKey {
  /** Absolute path of the project folder, which must be one Tortie has open. */
  repoPath: string;
  /** The file's path relative to that folder. */
  relPath: string;
  /**
   * The machine the tab is a file on, or null for this Mac.
   *
   * IT IS A FIELD RATHER THAN AN INFERENCE, and the door refuses any non-null
   * value. The renderer already refuses a remote tab before it asks
   * (`redlineWithoutHead`), and research 106 §2.4 measured why the door may
   * not simply inherit that: `recents.json` holds `/Users/gdc/dev` with
   * `machineId: greg-s-mac-pro` right now, and the operator's Mac Pro's home
   * is also `/Users/gdc`, so a path alone cannot tell the two apart.
   */
  machineId: string | null;
}

/** What a moved baseline asks to have recorded. */
export interface BaselineStoreInput extends BaselineKey {
  /** The baseline's bytes: a PREVIOUS state of the file, never the current one. */
  text: string;
  /**
   * The last HEAD bytes git answered for this file, or null before git has
   * answered once.
   *
   * IT IS STORED BECAUSE IT IS THE CREDIBILITY CHECK, and a record without it
   * is worse than no record at all. At load the renderer replays the current
   * `git show HEAD:<rel>` answer through the shipping `nextBaseline` as a
   * `head` event: an unchanged answer returns the same object and the
   * baseline stands, a moved one re-seeds on the line that already exists and
   * no narrowing across a commit can survive. Restored with `headSeen: null`,
   * that same replay would destroy the record on the first watcher tick,
   * silently, before the person had looked (research 106 §2.3).
   */
  headSeen: string | null;
  /** What the face calls it. */
  origin: StoredBaselineOrigin;
  /** The tab's baseline generation, which every press is bound to. */
  generation: number;
  /** When the baseline was seeded, epoch milliseconds. */
  takenAt: number | null;
  /** When the person accepted, for the one origin that is a person's act. */
  acceptedAt: number | null;
  /** True when the tab's read stopped at the cap. Refused. */
  truncated: boolean;
}

/** A baseline read back out of the store. */
export interface StoredBaseline {
  text: string;
  headSeen: string | null;
  origin: StoredBaselineOrigin;
  generation: number;
  takenAt: number | null;
  acceptedAt: number | null;
  /** When this record was written, from this Mac's clock. */
  storedAt: number;
}

export type BaselineLoadResult =
  | { found: true; baseline: StoredBaseline }
  | { found: false; refused: BaselineRefusal; reason: string };

export type BaselineStoreResult =
  | { stored: true; bytes: number }
  | { stored: false; refused: BaselineRefusal; reason: string };
