/**
 * The one ADAPTER between the shared `arch:map` payload and the drawing's own
 * model (Phase 160).
 *
 * The drawing under `./map/` is typed structurally on purpose, so the pure
 * layout stack and the shared ipc contract could be built by different hands
 * in one parallel round without importing each other. This file is where the
 * two shapes meet, and it is the ONLY place: the tab body adapts here and
 * hands the result down, so a change to either side is a change to one
 * function with a test on it.
 *
 * The three translations that are decisions rather than renames:
 *
 *  - **`unresolved`** is true when a part has imports and NOT ONE of them
 *    could be followed or named as a dependency. That is the honest grey of
 *    Phase 63: a part whose language no resolver arm speaks. A part with no
 *    imports at all is not unknown, it is quiet, and a part where some
 *    imports resolved has real edges and earns its normal face.
 *  - **`overlaid`** is true when the contract claimed the box, which the
 *    payload states as a non-null `componentId`. The label already arrives
 *    with the person's name on it; this flag only says why.
 *  - **`verdict`** carries the payload's `status` when a judged promise rides
 *    the edge, and is absent otherwise, so the drawing never has to know what
 *    null means.
 */

import type { ArchMapPartResult, ArchMapResult } from './bridge';
import type { ArchMapModel } from './map';

/** Does the honest grey apply: imports exist and none could be followed. */
export function importsUnknown(group: {
  totalImports: number;
  unresolvedImports: number;
}): boolean {
  return (
    group.totalImports > 0 &&
    group.unresolvedImports === group.totalImports
  );
}

/** The shared payload, reshaped into exactly what the drawing reads. */
export function toMapModel(result: ArchMapResult): ArchMapModel {
  return {
    groups: result.groups.map((g) => ({
      id: g.id,
      label: g.label,
      fileCount: g.fileCount,
      band: g.band,
      provenance: g.provenance,
      unresolved: importsUnknown(g),
      overlaid: g.componentId !== null
    })),
    edges: result.edges.map((e) => ({
      from: e.from,
      to: e.to,
      count: e.count,
      ...(e.status !== null ? { verdict: e.status } : {})
    }))
  };
}

// ---------------------------------------------------------------------------
// Phase 161: the scoped picture, one part as its modules with a frame
// ---------------------------------------------------------------------------

/**
 * What the scoped adapter reads out of the shared `arch:mapPart` answer:
 * exactly the three lists the drawing needs, and nothing of the envelope.
 * Reconciled to the shared wire type after the parallel round, so a change
 * to the payload is a type error here rather than a silent drift.
 */
export type ArchMapPartSlice = Pick<
  ArchMapPartResult,
  'modules' | 'edges' | 'crossings'
>;

/**
 * The scoped payload, reshaped into the drawing's model. The same three
 * translations `toMapModel` makes, plus the frame: crossings become frame
 * edges, and the drawing places one stub per outside part per side.
 */
export function toPartMapModel(part: ArchMapPartSlice): ArchMapModel {
  return {
    groups: part.modules.map((m) => ({
      id: m.id,
      label: m.label,
      fileCount: m.fileCount,
      band: m.band,
      provenance: m.provenance,
      unresolved: importsUnknown(m),
      overlaid: m.componentId !== null
    })),
    edges: part.edges.map((e) => ({
      from: e.from,
      to: e.to,
      count: e.count,
      ...(e.status !== null ? { verdict: e.status } : {})
    })),
    frame: part.crossings.map((c) => ({
      boxId: c.moduleId,
      outsideId: c.outsideId,
      outsideLabel: c.outsideLabel,
      direction: c.direction,
      count: c.count
    }))
  };
}
