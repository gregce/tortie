/**
 * context-snapshot.ts — what a session's configuration looked like at the
 * moment Tortie launched it, and the honest comparison against what it looks
 * like now (Phase 22, research 29 §8).
 *
 * ## Why this exists at all
 *
 * A transcript does not record what context it loaded. Research 29 §8.1
 * checked: 443 `system` records across a 12 MB Claude Code session on this
 * repository, and not one carries a skills or MCP manifest. No agent writes
 * one. So the question a user asks after something surprising happens, being
 * "why did that agent not use the skill I just wrote", cannot be answered by
 * reading the session.
 *
 * Tortie owns the launch. It is the process that decided this agent starts in
 * this directory at this moment, and it is therefore the only thing on the
 * machine that can record what the configuration was then. That record is what
 * this module describes.
 *
 * ## The four rules, and they are the reason this is safe to keep in the
 * manifest at all
 *
 * 1. Advisory. A missing or failed snapshot must never fail a launch, block a
 *    restore, or change a resume argument. Nothing durability-critical reads
 *    it. See `src/main/context/snapshot.ts`, where the writer is detached from
 *    the create path and every path out of it returns null instead of
 *    throwing.
 * 2. Written once, at launch. The point of the record is that it describes
 *    THEN. A live session is never re-snapshotted, and no refresh in the panel
 *    writes one.
 * 3. A restore re-snapshots, because a restored session genuinely re-reads its
 *    configuration. Carrying the old snapshot forward would be a lie with a
 *    timestamp on it.
 * 4. Deleting it is always safe. It lives in the session row, so it is pruned
 *    with the session and there is nothing else to clean up.
 *
 * ## What is deliberately not here
 *
 * No ambient signal of any kind. Research 29 §8.4 refuses the rail badge, the
 * toast when a watched file changes, the dot on the session tab and the banner
 * over the terminal. A user who edits `.mcp.json` while three sessions run
 * sees nothing, because they already know what they did. The drift information
 * exists only where it is asked for.
 *
 * ## Where the two halves live
 *
 * The types and the comparison are here because both processes need them. Main
 * writes the record. The renderer reads it back and compares it against the
 * rows the Context view already resolved, so the current set is walked once
 * rather than twice.
 */

// ---------------------------------------------------------------------------
// The five categories
// ---------------------------------------------------------------------------

/**
 * The five kinds of configuration the Context view shows.
 *
 * DECLARED HERE, ONCE. `src/shared/context.ts` (the research 29 §4 object
 * model) re-exports this union rather than declaring its own. The declaration
 * lives on this side because these are the records that get PERSISTED in the
 * manifest and version-checked, so a sixth category has to be a deliberate
 * change here before it can be a row anywhere.
 */
export const CONTEXT_CATEGORIES = [
  'skill',
  'mcp',
  'hook',
  'plugin',
  'instruction'
] as const;

export type ContextCategory = (typeof CONTEXT_CATEGORIES)[number];

/** True for a string this build recognises as a category. */
export function isContextCategory(value: string): value is ContextCategory {
  return (CONTEXT_CATEGORIES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// The record
// ---------------------------------------------------------------------------

/**
 * The shape number, written into every snapshot.
 *
 * A reader that does not recognise it drops the record whole and the session
 * reads as one with no snapshot, which is a true statement rather than a
 * half-parsed one. It starts at 1, so a 0 can only come from a value nothing
 * wrote.
 */
export const CONTEXT_SNAPSHOT_VERSION = 1;

/**
 * How many hex characters of a content hash the snapshot keeps.
 *
 * 16 hex characters is 64 bits. The snapshot is compared against the current
 * set to answer "did this file change", and 64 bits is far more than that
 * question needs. The reason to truncate is size: this blob lives in the
 * manifest, which is the one database whose loss costs the user their
 * sessions, and a full 64-character sha256 per entry would roughly double the
 * blob for no gain in the answer.
 *
 * Both sides of every comparison go through `shortContextHash`, so a caller
 * cannot compare a truncated hash against a full one and see a false change.
 */
export const CONTEXT_HASH_CHARS = 16;

/**
 * The largest number of entries a snapshot keeps.
 *
 * The measured resolved set on the operator's machine is 33 rows, so this is
 * roughly twelve times the real figure and no ordinary machine will reach it.
 * It exists because an unbounded advisory blob inside a durability-critical
 * database is a hazard whatever its typical size, and a cap that is never hit
 * costs nothing. A snapshot that hits it is marked `truncated`, and the
 * readout says so rather than quietly showing a short list.
 */
export const CONTEXT_SNAPSHOT_MAX_ENTRIES = 400;

/**
 * The largest serialized snapshot that will be written, in bytes.
 *
 * The second half of the same guard. Entry counts are bounded above, but a
 * single pathological source path or name is not, so the cap that actually
 * binds is on the bytes. 256 KB against a manifest that is measured in single
 * megabytes.
 */
export const CONTEXT_SNAPSHOT_MAX_BYTES = 256 * 1024;

/** One resolved thing, as it was at launch. */
export interface ContextSnapshotEntry {
  /** The §4 stable id: category plus name plus agent scope key. */
  id: string;
  category: ContextCategory;
  /** The user's word for it. */
  name: string;
  /**
   * Which scope won, as the resolver spelled it.
   *
   * A plain string rather than a union ON PURPOSE. Research 29 §2.3 found at
   * least seven mutually incompatible precedence models across twelve agents,
   * and two of them run in opposite directions inside Claude Code alone. A
   * union here would make a scope word this build has never seen unreadable in
   * a record written by a build that had seen it, and the record would be
   * dropped whole. A string survives.
   */
  scope: string;
  /** Absolute path of the file that defined the winner. */
  sourcePath: string;
  /**
   * Content hash, truncated to `CONTEXT_HASH_CHARS`.
   *
   * An EMPTY STRING means the resolver could not hash it. That is not the same
   * as a hash of nothing, and the comparison treats it as "cannot tell" rather
   * than as "unchanged". See `diffContextSnapshot`.
   */
  hash: string;
}

/** What one session's configuration was at the moment it launched. */
export interface ContextSnapshot {
  /** `CONTEXT_SNAPSHOT_VERSION` at the time of writing. */
  v: number;
  /** Epoch ms the scan ran. */
  at: number;
  /** Why it was written. A restore re-snapshots, per rule 3. */
  reason: 'create' | 'restore';
  /** The agent id the session launched under. */
  agent: string;
  /** The resolved working directory the scan ran against. */
  cwd: string;
  /** The resolved set, one row per effective thing. Never the union. */
  entries: ContextSnapshotEntry[];
  /**
   * Categories the scan could not answer for.
   *
   * FIRST CLASS, and it has its own sentence in the readout. Research 29 §2.4
   * has agents whose support for a category is genuinely unverified, and the
   * live reload table carries "unknown" as a real value beside "live" and
   * "next session". A category listed here is one where the snapshot makes no
   * claim, and the readout must not let its absence read as "there were none".
   */
  unknown?: ContextCategory[];
  /** How long the scan took, in ms. Kept so the cost claim stays checkable. */
  tookMs?: number;
  /** True when a cap above cut the entry list short. */
  truncated?: boolean;
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

/** The three ways the current set can differ from the snapshot. */
export type ContextDriftKind = 'changed' | 'added' | 'removed';

/**
 * The sentence each mark gets, verbatim from research 29 §8.3.
 *
 * The copy is precise about the mechanism because the mechanism is the whole
 * point. "Removed" is the one nobody expects and the one that bites: the file
 * is gone from disk and the running session is still running it.
 */
export const CONTEXT_DRIFT_SENTENCES: Readonly<
  Record<ContextDriftKind, string>
> = Object.freeze({
  changed:
    'Changed since this session started. It is still running the old version.',
  added:
    'Added since this session started. This session has not loaded it.',
  removed:
    'Removed since this session started. This session is still running it.'
});

/** One difference between the snapshot and now. */
export interface ContextDriftEntry {
  kind: ContextDriftKind;
  /** The id the two sides were matched on. */
  id: string;
  /**
   * The entry to draw.
   *
   * For `added` and `changed` it is the CURRENT entry, because that is the row
   * the user is looking at in the view. For `removed` there is no current
   * entry, so it is the snapshot's, which is the only record of a file that is
   * no longer on disk.
   */
  entry: ContextSnapshotEntry;
  /** What the snapshot held, present only for `changed`. */
  previous?: ContextSnapshotEntry;
}

/** The whole comparison, with the part it could not answer named. */
export interface ContextDrift {
  entries: ContextDriftEntry[];
  /**
   * Ids present on both sides where at least one hash was missing, so no
   * comparison was possible.
   *
   * These are NOT reported as unchanged. A missing hash is an absence of
   * evidence, and the header sentence says so in its own clause rather than
   * folding them into the "nothing changed" count.
   */
  uncomparable: string[];
}

/**
 * Truncate a hash to the length the snapshot stores.
 *
 * Null and empty both come back empty, which is the recorded way of saying
 * that no hash was taken. `ContextEntry.hash` in `./context.ts` is null when
 * the scan ran with hashing off, so this is the case that arrives most often.
 */
export function shortContextHash(hash: string | null | undefined): string {
  if (typeof hash !== 'string') return '';
  return hash.slice(0, CONTEXT_HASH_CHARS);
}

/**
 * The six fields the snapshot reads off a resolved row.
 *
 * INTEGRATION SEAM, and the widths here are chosen so that no adapter is
 * needed. `ContextEntry` in `./context.ts` carries these six plus `summary`,
 * `agents`, `verdicts`, `state`, `resolution`, `model`, `evidence`, `shadows`,
 * `hashAlgorithm`, `executes`, `problem` and `payload`. Two of its field types
 * are narrower or wider than the record's, so this type accommodates both:
 * `scope` is a union there and a plain string here, and `hash` is `string |
 * null` there and is normalised to '' on the way in. A `ContextEntry` is
 * therefore structurally assignable and the view passes its rows straight in.
 */
export interface ContextEntryLike {
  id: string;
  category: ContextCategory;
  name: string;
  scope: string;
  sourcePath: string;
  hash: string | null;
}

/**
 * Fold resolved rows down to the six fields the snapshot keeps.
 *
 * This is what stops the record growing a copy of the whole object model.
 * Carrying `summary` alone would put a per-session duplicate of every
 * description string into the manifest, which is the one database whose loss
 * costs the user their sessions.
 */
export function toSnapshotEntries(
  rows: readonly ContextEntryLike[]
): ContextSnapshotEntry[] {
  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    name: row.name,
    scope: row.scope,
    sourcePath: row.sourcePath,
    hash: shortContextHash(row.hash)
  }));
}

/**
 * Compare a snapshot against the current resolved set.
 *
 * Matching is by `id`, which research 29 §4 defines as the category plus the
 * name plus the agent scope key. A skill that moved from the project scope to
 * the personal one therefore reads as one removal and one addition rather than
 * as a change, and that is correct: the file the session loaded is not the
 * file that would load now, and a single "changed" mark would hide which one
 * it is holding.
 *
 * THREE THINGS THIS DELIBERATELY DOES NOT DO.
 *
 * It does not read the disk. Both sides are already-resolved data, so the
 * current set is walked once by the view and reused here rather than resolved
 * a second time inside a second process.
 *
 * It does not treat a missing hash as unchanged. An entry on both sides where
 * either hash is empty goes to `uncomparable`, because the resolver could not
 * hash it and inventing "unchanged" from that would be the panel being
 * confident about the one thing it does not know.
 *
 * It does not sort by anything other than the current set's own order, so the
 * view's grouping and precedence ordering are untouched. Removals, which have
 * no place in the current order, come last.
 */
export function diffContextSnapshot(
  snapshot: ContextSnapshot,
  current: readonly ContextSnapshotEntry[]
): ContextDrift {
  const before = new Map<string, ContextSnapshotEntry>();
  for (const entry of snapshot.entries) before.set(entry.id, entry);

  const entries: ContextDriftEntry[] = [];
  const uncomparable: string[] = [];
  const seen = new Set<string>();

  for (const row of current) {
    seen.add(row.id);
    const previous = before.get(row.id);
    if (previous === undefined) {
      entries.push({ kind: 'added', id: row.id, entry: row });
      continue;
    }
    const a = shortContextHash(previous.hash);
    const b = shortContextHash(row.hash);
    if (a.length === 0 || b.length === 0) {
      uncomparable.push(row.id);
      continue;
    }
    if (a !== b) {
      entries.push({ kind: 'changed', id: row.id, entry: row, previous });
    }
  }

  for (const entry of snapshot.entries) {
    if (seen.has(entry.id)) continue;
    entries.push({ kind: 'removed', id: entry.id, entry });
  }

  return { entries, uncomparable };
}

/** Drift by id, for a view that draws one mark per row it is already drawing. */
export function driftById(
  drift: ContextDrift
): Map<string, ContextDriftEntry> {
  const out = new Map<string, ContextDriftEntry>();
  for (const entry of drift.entries) out.set(entry.id, entry);
  return out;
}

/** The removals, which have no row in the current set and need their own. */
export function removedEntries(drift: ContextDrift): ContextDriftEntry[] {
  return drift.entries.filter((e) => e.kind === 'removed');
}

// ---------------------------------------------------------------------------
// The header line
// ---------------------------------------------------------------------------

/**
 * The sentences above the readout, ready to render.
 *
 * Returned as a list rather than one joined string so the view can put them on
 * separate lines at 220px and on one line at 400px, which is the same
 * responsive decision every other multi-clause line in the sidebar makes.
 */
export interface SessionContextHeader {
  lines: string[];
  /** How many differences there are. Zero means the `Show all` control is off. */
  driftCount: number;
  /** True when Tortie has no record of what this session loaded. */
  unrecorded: boolean;
}

/**
 * Write the header for the session readout.
 *
 * `age` is a pre-formatted string such as "3h", supplied by the caller from
 * `formatAge` in `src/renderer/app/format.ts`. It is a parameter rather than
 * something computed here because there is already one age formatter in the
 * codebase and a second one in shared code would drift from it. Pass null when
 * there is no start time to describe.
 *
 * EVERY BRANCH SAYS WHAT IS TRUE, INCLUDING THE ONES THAT SAY NOTHING IS.
 * "Nothing has changed since" is a real answer to the question the user asked
 * and it is the answer most of the time, so it gets a sentence rather than an
 * empty header. A snapshot that was never written gets its own sentence too,
 * naming the two reasons it can be missing, because "no drift" and "no record"
 * look identical on screen and mean opposite things.
 */
export function describeSessionContext(input: {
  snapshot: ContextSnapshot | null;
  drift: ContextDrift | null;
  /** Pre-formatted age of the snapshot, e.g. "3h". Null when unknown. */
  age: string | null;
}): SessionContextHeader {
  const { snapshot, drift, age } = input;

  if (snapshot === null) {
    return {
      lines: [
        'Tortie has no record of what this session loaded. It either started ' +
          'before Tortie kept one, or the scan did not finish.'
      ],
      driftCount: 0,
      unrecorded: true
    };
  }

  const started =
    age === null || age === 'now'
      ? 'Started just now.'
      : `Started ${age} ago.`;
  const lines: string[] = [started];

  const count = drift?.entries.length ?? 0;
  if (count === 0) {
    lines.push('Nothing has changed since.');
  } else {
    lines.push(
      count === 1
        ? 'One thing has changed since.'
        : `${String(count)} things have changed since.`
    );
  }

  const cannotTell = drift?.uncomparable.length ?? 0;
  if (cannotTell > 0) {
    lines.push(
      cannotTell === 1
        ? 'Tortie cannot tell whether one more has changed, because it could ' +
          'not read that file.'
        : `Tortie cannot tell whether ${String(cannotTell)} more have ` +
          'changed, because it could not read those files.'
    );
  }

  const unknown = snapshot.unknown ?? [];
  if (unknown.length > 0) {
    lines.push(describeUnknownCategories(unknown));
  }

  if (snapshot.truncated === true) {
    lines.push(
      'This record was cut short, so some of what the session loaded is not ' +
        'listed.'
    );
  }

  return { lines, driftCount: count, unrecorded: false };
}

/**
 * The honest sentence for the categories the scan could not answer for.
 *
 * Research 29's live reload table makes "unknown" a first class value with its
 * own sentence, and guessing here is worse than saying nothing. The sentence
 * names the categories so the reader knows exactly which part of the list is
 * silent, rather than distrusting all of it.
 */
export function describeUnknownCategories(
  categories: readonly ContextCategory[]
): string {
  const words = categories.map(categoryPlural);
  const list =
    words.length === 1
      ? (words[0] ?? '')
      : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1] ?? ''}`;
  return `Tortie could not read this agent's ${list}, so none are listed here.`;
}

/** The word the user reads for a category, in the plural. */
export function categoryPlural(category: ContextCategory): string {
  switch (category) {
    case 'skill':
      return 'skills';
    case 'mcp':
      return 'MCP servers';
    case 'hook':
      return 'hooks';
    case 'plugin':
      return 'plugins';
    case 'instruction':
      return 'instructions';
  }
}
