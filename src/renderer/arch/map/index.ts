/**
 * The map module's public face (Phase 160), in the `scm/graph/index.ts`
 * mould: the component, its model, and the pure halves a test or a probe
 * reads without mounting anything.
 */

export { ArchMap, ARCH_MAP_EMPTY, ARCH_MAP_UNKNOWN_WORD } from './ArchMap';
export type { ArchMapProps } from './ArchMap';
export { layoutMap } from './layout';
export type { MapBox, MapLayout, MapRow } from './layout';
export {
  edgeMarkerId,
  edgeStrokeWidth,
  edgeVerdictClass,
  planEdges
} from './geometry';
export type { PlannedEdge } from './geometry';
export { BAND_ORDER, bandWord, normalizeBand } from './types';
export type {
  ArchMapBand,
  ArchMapEdge,
  ArchMapGroup,
  ArchMapModel
} from './types';
