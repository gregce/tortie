/**
 * The map model, being what the level 1 picture is drawn FROM (Phase 160).
 *
 * This is the component's input contract, and it is deliberately small: the
 * composer in main (`src/main/arch/map.ts`) aggregates the fact base into
 * exactly this shape and hands it over the bridge. The types here are
 * STRUCTURAL on purpose, so the shared payload type and this file can be
 * reconciled by the integrator without either side importing the other during
 * the parallel build.
 *
 * Everything in the model is already deterministic upstream: groups come from
 * the skeleton's grouping (files sorted, ranks rounded, merge sorted on exit)
 * and edges from the counted rollup. The layout adds no randomness of its own,
 * so the same model always draws the same SVG, byte for byte.
 */

/** The three bands the import graph computes. Rows of the picture, top down. */
export type ArchMapBand = 'surface' | 'engine' | 'foundation';

/** One level 1 part: a box on the map. */
export interface ArchMapGroup {
  /**
   * The machine identity, being the skeleton's computed group id. It never
   * changes when a contract overlays a person's name, so drill down (Phase
   * 161) and the payload keep meaning across both states.
   */
  id: string;
  /**
   * What the box says on its face: the directory for a computed group, or the
   * person's component name where a contract's anchors matched dominantly.
   */
  label: string;
  /** How many tracked files live in this part. Drawn as SIZE, never a number. */
  fileCount: number;
  /**
   * Which band the part sits in. Values outside the three known bands land in
   * the middle row, because the middle is the only honest place for a part
   * the classifier did not place.
   */
  band: string;
  /** One of the nine provenance words `../provenance.ts` knows. */
  provenance: string;
  /**
   * True when no resolver arm speaks this part's language, so its imports are
   * UNKNOWN rather than absent. The box says so on its face, in the honest
   * grey Phase 63 established.
   */
  unresolved: boolean;
  /** True when a contract component's name replaced the computed label. */
  overlaid?: boolean;
  /**
   * The purpose sentence the hover carries (Phase 158): what this part is
   * FOR, in the contract author's own first sentence. Absent or null on a
   * computed box, and the hover then says the provenance alone.
   */
  description?: string | null;
}

/** One aggregated import edge between two parts. */
export interface ArchMapEdge {
  /** Group id of the importing part. */
  from: string;
  /** Group id of the imported part. */
  to: string;
  /** How many file to file imports the edge aggregates. Drawn as THICKNESS. */
  count: number;
  /**
   * The verdict of a judged promise riding this edge, when the contract has
   * one between the two overlaid parts: `convergent`, `divergent` or
   * `absent`. Absent means the edge colour, not a hidden edge, and a failure
   * reads as one here exactly as it does in the cockpit's list.
   */
  verdict?: string;
}

/** The whole picture, level 1 or a scoped level (Phase 161). */
export interface ArchMapModel {
  groups: readonly ArchMapGroup[];
  edges: readonly ArchMapEdge[];
  /**
   * Phase 161: the crossing edges a scoped picture keeps at its frame, so a
   * person inside one part still sees what leans on it and what it leans on.
   * Absent or empty on the level 1 picture, which has no outside.
   */
  frame?: readonly ArchMapFrameEdge[];
}

/** The band a raw model value lands in. Unknown values go to the middle. */
export function normalizeBand(value: string): ArchMapBand {
  return value === 'surface' || value === 'foundation' ? value : 'engine';
}

/** Top to bottom, the fixed order the rows draw in. */
export const BAND_ORDER: readonly ArchMapBand[] = [
  'surface',
  'engine',
  'foundation'
];

/** The word a band's row label says. User facing, so it is a plain word. */
export function bandWord(band: ArchMapBand): string {
  if (band === 'surface') return 'Surface';
  if (band === 'foundation') return 'Foundation';
  return 'Engine';
}

// ---------------------------------------------------------------------------
// Phase 161: the frame, being what a scoped picture keeps of the outside
// ---------------------------------------------------------------------------

/**
 * One aggregated crossing edge of a scoped picture: an import with exactly
 * one end inside the drilled part. The outside end is a level 1 group, kept
 * with its id AND its label so the frame names real parts and context is
 * never lost.
 *
 * Direction reads from the part's point of view: `out` means a module inside
 * the part imports the outside group, and `in` means the outside group's
 * files import a module inside the part.
 */
export interface ArchMapFrameEdge {
  /** The interior box the crossing touches, by its id in `groups`. */
  boxId: string;
  /** The outside level 1 group's id. */
  outsideId: string;
  /** The outside group's label, the overlay name where one is painted. */
  outsideLabel: string;
  direction: 'in' | 'out';
  /** How many file to file imports the crossing aggregates. Thickness. */
  count: number;
}
