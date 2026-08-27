/**
 * `arch:map` — the level 1 map of any repository, contract or none (Phase 160).
 *
 * ## The reorientation this channel carries
 *
 * The operator's ruling of 2026-08-27: the map is the product and the contract
 * is annotation on it. So this read answers for EVERY repository, with no
 * gesture, no draft step, no agent and zero tokens. The grouping is the
 * skeleton's own deterministic 5 to 9 parts, the edges are the resolved
 * file-to-file imports rolled up group to group, and a contract, when one
 * exists, overlays the same picture rather than replacing it.
 *
 * ## No second scan, stated as a property
 *
 * The map reads the SAME fact base the checkers read, out of `arch.db`. What
 * Phase 160 changed is that the fact base now exists for a repository with no
 * contract: the check runner grew a fact-only leg that scans and stops, so
 * both readers share one scanner and one stamp table. This channel itself
 * never parses a file. Its one process is the fixed `git ls-files -z` argv the
 * arch guard already composes, so the tracked list the boxes are drawn from is
 * the list the anchors are matched against.
 *
 * ## Never a frozen pane
 *
 * The one-time cold scan on a large repository takes seconds, so this read
 * NEVER waits for it. It answers with whatever the fact base holds right now
 * plus `building: true` while the scan it kicked off is still owed, and the
 * `arch:mapUpdated` push says when to ask again. Every later open in the
 * app's life is the warm path, measured in milliseconds.
 *
 * ## What travels, and what deliberately does not
 *
 * Weight is information: a box carries its file count and an edge carries its
 * import count, because a mental model needs to know what is big and what
 * leans on what. NO COUNT IS EVER PINNED TO A BOX in the drawing; the numbers
 * here are sizing inputs, which is how the dashboard refusal survives. The
 * unresolved counts travel per group so the honest grey of Phase 63 can say
 * "this part's language resolved nothing" on the face of the box.
 *
 * MAIN: src/main/arch/map.ts composes the model, src/main/arch/ipc.ts is the
 * registrar. The channel itself is declared in ./arch.ts in
 * `ArchInvokeChannelMap`, the arch-modules precedent: one arch surface, one
 * map, one bridge object.
 */

import type { ArchProvenance, ArchVerdictStatus } from '../arch';

/** The three bands the skeleton computes, top of the drawing to the bottom. */
export type ArchMapBand = 'surface' | 'engine' | 'foundation';

/** One box of the level 1 drawing. */
export interface ArchMapGroup {
  /**
   * The machine identity, the skeleton's own kebab-case group id. It is stable
   * for the same tree whatever the contract says, so the drill and the overlay
   * can never change what a box IS, only what it is called.
   */
  id: string;
  /** The directory the box stands for, repository relative. */
  dir: string;
  /**
   * What the box says on its face: the directory, or the person's own
   * component name when the contract's anchors land dominantly in this box.
   */
  label: string;
  /**
   * The contract component whose name the box wears, or null when the box is
   * computed only. A component that spans several boxes, or matches nothing,
   * paints NO box: disagreement stays visible in the cockpit rather than being
   * blended into the picture.
   */
  componentId: string | null;
  band: ArchMapBand;
  provenance: ArchProvenance;
  /** How many tracked files sit in this box. The box's visual weight. */
  fileCount: number;
  /** Imports written in this box's files, the honest denominator. */
  totalImports: number;
  /** Of those, the ones that resolved to a tracked file. */
  resolvedImports: number;
  /** Of those, the ones that name a dependency. A definite answer, not a miss. */
  externalImports: number;
  /**
   * Of those, the ones nobody could follow. A box where this is the whole
   * story draws in the honest grey, because a missing edge and an edge nobody
   * could follow must never look the same.
   */
  unresolvedImports: number;
}

/** One aggregated edge: files in `from` import files in `to`, `count` times. */
export interface ArchMapEdge {
  /** Group id, never a component id. */
  from: string;
  /** Group id, never a component id. */
  to: string;
  /** How many resolved imports cross this pair. The edge's visual weight. */
  count: number;
  /**
   * The verdict riding this edge, when the contract judged a promise between
   * the two components overlaid on its endpoints. Null on a computed-only
   * edge. Where several promises are judged between the same pair, the worst
   * status wins, so a broken promise can never hide behind a held one.
   */
  status: ArchVerdictStatus | null;
  /** The contract promise the status came from, or null. */
  edgeId: string | null;
}

/** The picture itself, pure over the fact base. Same facts, same bytes. */
export interface ArchMapModel {
  /** The one line above the drawing, the repository's own name. */
  subject: string;
  /** The 5 to 9 boxes, sorted by id. */
  groups: ArchMapGroup[];
  /** Every cross-group edge, unsliced, heaviest first. */
  edges: ArchMapEdge[];
  /** Every tracked file at HEAD, the denominator the box weights sit under. */
  fileCount: number;
  /** Every import in the fact base, resolved or not. */
  totalImports: number;
  /** Imports that resolved to a tracked file. */
  resolvedImports: number;
  /** Imports nobody could follow, repository wide. */
  unresolvedImports: number;
  /** True when a loadable contract overlays this picture. */
  contractPresent: boolean;
}

/** The map is asked about ONE repository, by its absolute path. */
export interface ArchMapInput {
  cwd: string;
}

/**
 * What the map read answers.
 *
 * `building` is true while the fact base for this repository is still being
 * scanned for the first time. The model is still whatever the store already
 * holds, which may be empty, and the `arch:mapUpdated` push follows when the
 * scan lands. The read itself NEVER waits on a scan.
 */
export interface ArchMapResult extends ArchMapModel {
  cwd: string;
  building: boolean;
  /** The commit the fact base was scanned at, or null before any scan. */
  scannedAtCommit: string | null;
}

/**
 * Main → renderer: the fact base behind one repository's map moved, either
 * because a scan finished or because a check republished verdicts. The view
 * asks `arch:map` again; nothing heavy travels on the event itself.
 */
export const EVT_ARCH_MAP_UPDATED = 'arch:mapUpdated' as const;

/** What moved. */
export interface ArchMapUpdatedEvent {
  cwd: string;
  /** The commit the fact base is now scanned at, or null when still partial. */
  scannedAtCommit: string | null;
}
