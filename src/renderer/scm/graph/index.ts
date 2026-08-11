/**
 * Commit-graph layout (Phase 14.5) — pure, synchronous, no React, no DOM.
 *
 * The one entry point is `layoutGraph`. Everything else here supports it:
 * `makeRoleResolver` fixes the three divergence colours, `capRow` folds a wide
 * graph into a narrow pane, `laneColorVar` turns a lane colour into a token
 * reference. Rendering lives elsewhere; this module never emits markup.
 */

export { layoutGraph } from './layout';
export type { LayoutOptions } from './layout';

export { makeRoleResolver } from './roles';
export type { RoleAnchors } from './roles';

export {
  LANE_COLOR_VARS,
  ROLE_COLOR_VARS,
  createLaneCycler,
  hueKeyOf,
  laneColorVar,
  liveHues,
  sameColor
} from './colors';
export type { HueKey, LaneCycler } from './colors';

export { DEFAULT_LANE_CAP, capRow, gutterColumns } from './cap';
export type { CappedRow } from './cap';

export { CYCLE_LENGTH } from './types';
export type {
  GraphCommit,
  GraphLayout,
  GraphRow,
  Lane,
  LaneColor,
  LaneRole,
  RoleResolver
} from './types';
