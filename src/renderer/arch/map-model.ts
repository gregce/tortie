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

import type {
  ArchMapGroup,
  ArchMapPartResult,
  ArchMapRegion,
  ArchMapResult,
  ArchMapStart,
  ArchMapTransport
} from './bridge';
import type { ArchMapModel } from './map';
import type { ArchMapRegionModel, ArchMapTransportModel } from './map/types';
import { archStartsLine } from '@shared/ipc';
import { archTransportTitle, archTransportWord } from './copy';

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

/**
 * PHASE 258. The one box shape both levels draw, with the rung and the region
 * carried when the composer handed them and left off when it did not, so a
 * model an older main composed draws exactly as Phase 201 left it.
 */
function toBox(g: ArchMapGroup): ArchMapModel['groups'][number] {
  return {
    id: g.id,
    label: g.label,
    fileCount: g.fileCount,
    band: g.band,
    provenance: g.provenance,
    unresolved: importsUnknown(g),
    overlaid: g.componentId !== null,
    description: g.description,
    ...(g.rung !== undefined ? { rung: g.rung } : {}),
    ...(g.regionId !== undefined ? { regionId: g.regionId } : {})
  };
}

/**
 * PHASE 258. The starts line of one region (SPEC §3.1 Q5): counts by kind in
 * the fixed order worker, thread, process, service, then the units that own
 * no box, on one line; the `file:line` list rides the hover.
 */
export function startsOf(starts: readonly ArchMapStart[]): {
  line: string | null;
  title: string | null;
} {
  if (starts.length === 0) return { line: null, title: null };
  // ONE composer, `archStartsLine` in src/shared/ipc/arch-map.ts, read by
  // this face and by npm run conformance:evidence, so the two cannot count
  // or word the line differently (the integrator removed a second copy that
  // said `services` where the shared one says `compose services`).
  const line = archStartsLine(starts) || null;
  const title = starts
    .map((s) => `${s.kind === 'unit' ? s.label : s.kind} · ${s.file}:${String(s.line)}`)
    .join('\n');
  return { line, title };
}

/** The wire's region, reshaped for the drawing. */
export function toRegionModel(r: ArchMapRegion): ArchMapRegionModel {
  const starts = startsOf(r.starts);
  return {
    id: r.id,
    kind: r.kind,
    label: r.label,
    sub: r.sub,
    groupIds: r.groupIds,
    startsLine: starts.line,
    startsTitle: starts.title
  };
}

/** The wire's transport, reshaped with its label and its hover. */
export function toTransportModel(
  t: ArchMapTransport,
  labelOf: (id: string) => string
): ArchMapTransportModel {
  return {
    from: t.from,
    to: t.to,
    kind: t.kind,
    count: t.count,
    label: `${archTransportWord(t.kind)} · ${t.count.toLocaleString('en-US')}`,
    title: archTransportTitle(t.kind, t.count, labelOf(t.from), labelOf(t.to))
  };
}

/** The shared payload, reshaped into exactly what the drawing reads. */
export function toMapModel(result: ArchMapResult): ArchMapModel {
  const regions = (result.regions ?? []).map(toRegionModel);
  const labelOf = (id: string): string =>
    regions.find((r) => r.id === id)?.label ?? id;
  // A transport whose count is zero draws nothing (SPEC §3.2).
  const transports = (result.transports ?? [])
    .filter((t) => t.count > 0)
    .map((t) => toTransportModel(t, labelOf));
  return {
    groups: result.groups.map(toBox),
    edges: result.edges.map((e) => ({
      from: e.from,
      to: e.to,
      count: e.count,
      ...(e.status !== null ? { verdict: e.status } : {})
    })),
    ...(regions.length > 0 ? { regions, transports } : {})
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
    groups: part.modules.map(toBox),
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
