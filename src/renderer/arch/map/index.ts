/**
 * The map module's public face (Phase 160), in the `scm/graph/index.ts`
 * mould: the component, its model, and the pure halves a test or a probe
 * reads without mounting anything.
 */

export { ArchMap, ARCH_MAP_EMPTY, ARCH_MAP_UNKNOWN_WORD } from './ArchMap';
export type { ArchMapProps } from './ArchMap';
export { layoutMap, MAP_DEFAULT_VIEWPORT } from './layout';
export type { MapBox, MapLayout, MapRow, MapStub, MapViewport } from './layout';
export {
  edgeMarkerId,
  edgeMaxCount,
  edgeStrokeWidth,
  edgeVerdictClass,
  planEdges,
  planFrameEdges,
  stubKey
} from './geometry';
export type { PlannedEdge, PlannedFrameEdge } from './geometry';
export { BAND_ORDER, bandWord, normalizeBand } from './types';
export type {
  ArchMapBand,
  ArchMapEdge,
  ArchMapFrameEdge,
  ArchMapGroup,
  ArchMapModel
} from './types';
