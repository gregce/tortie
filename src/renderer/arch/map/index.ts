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

// Phase 162: the camera. The pure halves a test or a probe reads without
// mounting anything, plus the seam types the container names.
export { useCamera } from './camera/useCamera';
export type { ArchMapCamera } from './camera/useCamera';
export type { ArchCameraHandle, ArchCanvasSeam } from './camera/seam';
export {
  CAMERA_IDENTITY,
  cameraApply,
  cameraInvert,
  cameraPanBy,
  cameraToSvg,
  cameraZoomTo,
  wheelZoomDelta
} from './camera/transform';
export type { Camera, CameraPoint } from './camera/transform';
export {
  CAMERA_DRAG_SLOP,
  CAMERA_KEEP_PX,
  CAMERA_KEY_STEP,
  CAMERA_MAX_K,
  CAMERA_MIN_K,
  cameraScaleExtent,
  clampCamera,
  fitCamera,
  frameCamera
} from './geometry';

// Phase 162: the staged drill and the gesture gate, the pure halves and the
// class vocabulary, so the container and a probe name strings rather than
// reaching into the module.
export {
  boxElement,
  containerStageRect,
  DRILL_STAGE_MS,
  GESTURE_CLASS,
  rectInContainer,
  runDrillStage,
  setGesturing,
  STAGE_BOX_CLASS,
  STAGE_HIDE_CLASS,
  STAGE_OUT_CLASS,
  stageTransform,
  STAGE_TRANSFORM_REST
} from './transitions';
export type { DrillStageOptions, StageRect } from './transitions';
export { CAMERA_FLY_MS, flyCameraTo, flyPath } from './camera/animate';
export type { CameraState } from './camera/animate';
