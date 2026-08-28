/**
 * THE ARCHITECTURE MAP TAB's body (Phase 160, the drill 161): one repository
 * drawn as its parts, and a ladder down into any of them, taking the whole
 * editor surface the way a file does.
 *
 * ## What this file is and is not
 *
 * It is the CONTAINER: it asks the store for the model and for where the
 * ladder stands, keeps the picture honest while main is still reading the
 * code, and mounts the drawing. The drawing itself is `./map`, which is
 * pure, being props in and SVG out, in the `scm/graph/` shape. Nothing here
 * computes a layout and nothing in `./map` touches a bridge, so the two
 * halves can be tested apart.
 *
 * ## The ladder (Phase 161)
 *
 * Level 1 is the whole repository. A click on a box asks the store to drill,
 * the store fetches the scoped reading from main, and this tab draws that
 * part alone as its modules with the crossing edges kept at the frame. A
 * click on a module is level 3, the part's files under Phase 64's caps. The
 * breadcrumb above the drawing names the level and one click walks back up.
 * The drill is VIEW STATE in the store, keyed by repository, so the sidebar
 * pane scopes with it; the tab's identity does not move and stays one tab
 * per repository.
 *
 * ## The tab fills, and the picture measures the tab
 *
 * The drawing wraps its layout against the measured surface, which is what
 * ended the strip in the corner of the operator's 2026-08-27 screenshot.
 * The measuring wrapper is here; the arithmetic is the layout's.
 *
 * ## The overlay is not drawn here
 *
 * The model arrives with the contract already joined onto it in main: a part
 * a contract component claims carries the person's name, and an edge a
 * judged promise rides carries that verdict. One picture for both states.
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { ARCH_CANVAS_ROOT_SCOPE, archCanvasPartScope } from '@shared/ipc';
import { archBridge } from './bridge';
import type { ArchMapResult } from './bridge';
import { ArchMap, type MapViewport } from './map';
import {
  cameraKeyCommand,
  isEditableTarget,
  runCameraCommand
} from './map/camera/keys';
import type { ArchCameraHandle, ArchCanvasSeam } from './map/camera/seam';
import {
  boxElement,
  containerStageRect,
  rectInContainer,
  runDrillStage
} from './map/transitions';
import { toMapModel, toPartMapModel } from './map-model';
import {
  ARCH_MAP_EMPTY_REPO,
  ARCH_MAP_ERROR,
  ARCH_MAP_FLAT_REPO,
  ARCH_MAP_LOADING,
  ARCH_MAP_STALE
} from './copy';
import { ArchDrillFiles } from './ArchModules';
import { canvasKey, DRILL_HOME, partKey, useArch } from './store';
import type { ArchDrill, ArchMapEntry, ArchPartMapEntry } from './store';
import './arch.css';

/** The drilled part vanished from the facts, usually under a rebase. */
export const ARCH_MAP_PART_GONE =
  'This part is no longer on the map. The code under it moved, so go up a level and the map will show where it went.';

/** The actions the body hands to the drawing and the breadcrumb. */
export interface ArchMapDrillHandlers {
  openPart?: (groupId: string) => void;
  openModule?: (moduleId: string) => void;
  up?: () => void;
  home?: () => void;
}

export function ArchMapTab({
  repoPath
}: {
  repoPath: string;
}): React.JSX.Element {
  const entry = useArch((s) => s.maps[repoPath] ?? null);
  const loadMap = useArch((s) => s.loadMap);
  const drill = useArch((s) => s.drills[repoPath] ?? DRILL_HOME);
  const scopedKey =
    drill.level !== 1 ? partKey(repoPath, drill.groupId) : null;
  const part = useArch((s) =>
    scopedKey === null ? null : (s.partMaps[scopedKey] ?? null)
  );
  const drillInto = useArch((s) => s.drillInto);
  const drillIntoModule = useArch((s) => s.drillIntoModule);
  const drillUp = useArch((s) => s.drillUp);
  const drillHome = useArch((s) => s.drillHome);
  const loadPartMap = useArch((s) => s.loadPartMap);

  // PHASE 162. The canvas scope this drill rung draws under: the whole map
  // and each drilled part keep their own camera and their own layout. Level
  // 3 is a file list, not a drawing, and keeps the part's scope so walking
  // down and back does not lose the part's camera.
  const scope =
    drill.level === 1
      ? ARCH_CANVAS_ROOT_SCOPE
      : archCanvasPartScope(drill.groupId);
  const canvasEntry = useArch((s) => s.canvas[canvasKey(repoPath, scope)] ?? null);
  const loadCanvas = useArch((s) => s.loadCanvas);
  const keepCamera = useArch((s) => s.keepCamera);
  const keepLayout = useArch((s) => s.keepLayout);
  useEffect(() => {
    void loadCanvas(repoPath, scope);
  }, [repoPath, scope, loadCanvas]);

  // The live camera, populated by the drawing through the seam while it is
  // mounted. The key set below drives it; before it mounts, every command is
  // a safe no-op.
  const cameraRef = useRef<ArchCameraHandle | null>(null);

  // PHASE 162, the staged drill (integrator wiring). The stage overlay
  // lives on the tab's own element, which survives the model swap that
  // replaces the drawing beneath it. Drilling IN stages first and swaps on
  // resolve; drilling UP swaps first and this ref carries the group id the
  // picture shrinks back into, consumed by the layout effect below once the
  // parent picture is on screen. `runDrillStage` itself is the reduced
  // motion cut, so nothing here checks the preference twice.
  const tabRef = useRef<HTMLDivElement | null>(null);
  const pendingUpStage = useRef<string | null>(null);

  useLayoutEffect(() => {
    const groupId = pendingUpStage.current;
    if (groupId === null) return;
    pendingUpStage.current = null;
    if (drill.level !== 1) return;
    const container = tabRef.current;
    if (container === null) return;
    const box = boxElement(container, groupId);
    if (box === null) return;
    void runDrillStage({
      container,
      groupId,
      from: containerStageRect(container),
      to: rectInContainer(box, container)
    });
  }, [drill]);

  const canvas = useMemo<ArchCanvasSeam>(
    () => ({
      cameraRef,
      camera: canvasEntry?.camera ?? null,
      positions: canvasEntry?.positions ?? null,
      onCameraRest: (camera) => keepCamera(repoPath, scope, camera),
      onLayoutChange: (positions) => keepLayout(repoPath, scope, positions)
    }),
    [canvasEntry, repoPath, scope, keepCamera, keepLayout]
  );

  // THE FIGMA KEY SET, bubble phase on the tab's own element and nowhere
  // wider: F frames, Shift+1 fits all, Shift+2 fits the selection, and the
  // panel zoom chord lands here because `zoom/focus.ts` defers over
  // `.arch-map-tab` (the image viewer precedent). Nothing is taken from a
  // terminal pane, whose keys only arrive while a pane has focus, and a
  // keydown that began in a field is never answered.
  const onCameraKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (isEditableTarget(e.target)) return;
      const command = cameraKeyCommand(e);
      if (command === null) return;
      e.preventDefault();
      e.stopPropagation();
      runCameraCommand(cameraRef.current, command);
    },
    []
  );

  // The scan's own progress FOR THIS REPOSITORY, subscribed here rather than
  // read from the store's `progress`, because that one belongs to the active
  // project and this tab may be drawing a background project's repository.
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    void loadMap(repoPath);
  }, [repoPath, loadMap]);

  // The scoped reading for the drilled part. Idempotent in the store the way
  // `loadMap` is, so the pane, this tab and a finished check can all ask.
  useEffect(() => {
    if (drill.level !== 1) {
      void loadPartMap(repoPath, drill.groupId);
    }
  }, [repoPath, drill, loadPartMap]);

  // The store's two pushes, for as long as this tab is mounted. The sidebar
  // may be showing another view entirely, so the tab cannot lean on the pane
  // having subscribed for it. Subscribing twice is safe: a finished check
  // fires one read and the in flight guard in `loadMap` folds the second ask.
  useEffect(() => useArch.getState().subscribeEvents(), []);

  useEffect(() => {
    const api = archBridge();
    if (api === null || typeof api.onProgress !== 'function') {
      return undefined;
    }
    // Display only. The re-read itself rides `arch:mapUpdated`, which the
    // store subscription above already owns, so nothing here can loop.
    return api.onProgress((p) => {
      if (p.cwd !== repoPath) return;
      setProgress(
        p.done >= p.total ? null : { done: p.done, total: p.total }
      );
    });
  }, [repoPath]);

  // The drawing hands back ids; the container turns them into drill moves,
  // looking labels up in the payload so the breadcrumb says real names.
  const handlers = useMemo<ArchMapDrillHandlers>(() => {
    const model = entry?.model ?? null;
    // The clicked box grows into the frame, then the model swaps. When the
    // stage cannot run (no DOM yet, the box gone, reduced motion) the swap
    // is immediate, which is the end state.
    const stageInto = (groupId: string, swap: () => void): void => {
      const container = tabRef.current;
      const box = container === null ? null : boxElement(container, groupId);
      if (container === null || box === null) {
        swap();
        return;
      }
      void runDrillStage({
        container,
        groupId,
        from: rectInContainer(box, container),
        to: containerStageRect(container),
        hide: box
      }).then(swap);
    };
    // Walking up from the drawn level swaps first; the layout effect above
    // stages the shrink once the parent picture is on screen. Level 3 is a
    // file list, not a drawing, so its walk stays a cut.
    const stageUpFrom = drill.level === 2 ? drill.groupId : null;
    return {
      openPart: (groupId) => {
        const found = model?.groups.find((g) => g.id === groupId);
        stageInto(groupId, () => {
          drillInto(repoPath, groupId, found?.label ?? groupId);
        });
      },
      openModule: (moduleId) => {
        const found = part?.model?.modules.find((m) => m.id === moduleId);
        if (found !== undefined) {
          stageInto(moduleId, () => {
            drillIntoModule(repoPath, found.dir, found.label);
          });
        }
      },
      up: () => {
        pendingUpStage.current = stageUpFrom;
        drillUp(repoPath);
      },
      home: () => {
        pendingUpStage.current = stageUpFrom;
        drillHome(repoPath);
      }
    };
  }, [entry, part, repoPath, drill, drillInto, drillIntoModule, drillUp, drillHome]);

  return (
    <ArchMapTabBody
      entry={entry}
      progress={progress}
      repoPath={repoPath}
      drill={drill}
      part={part}
      handlers={handlers}
      canvas={canvas}
      onCameraKeyDown={onCameraKeyDown}
      tabRef={tabRef}
    />
  );
}

/** The repository's own name for the breadcrumb, from the model or the path. */
function subjectOf(entry: ArchMapEntry | null, repoPath: string): string {
  const subject = entry?.model?.subject;
  if (subject !== undefined && subject !== '') return subject;
  const tail = repoPath.split('/').filter((s) => s !== '').pop();
  return tail ?? repoPath;
}

/**
 * The breadcrumb over the drawing: every earlier rung is a button, the rung
 * a person stands on is plain words. It renders at every level, so the level
 * is always named.
 */
export function ArchMapCrumbs({
  subject,
  drill,
  handlers
}: {
  subject: string;
  drill: ArchDrill;
  handlers: ArchMapDrillHandlers;
}): React.JSX.Element {
  const crumbs: React.JSX.Element[] = [];
  const sep = (key: string): React.JSX.Element => (
    <span key={key} className="arch-map-crumb-sep" aria-hidden="true">
      ›
    </span>
  );
  const here = (key: string, word: string): React.JSX.Element => (
    <span key={key} className="arch-map-crumb arch-map-crumb-here" title={word}>
      {word}
    </span>
  );
  const back = (
    key: string,
    word: string,
    go: (() => void) | undefined,
    title: string
  ): React.JSX.Element =>
    go === undefined ? (
      here(key, word)
    ) : (
      <button
        key={key}
        type="button"
        className="arch-map-crumb"
        onClick={go}
        title={title}
      >
        {word}
      </button>
    );

  if (drill.level === 1) {
    crumbs.push(here('subject', subject));
  } else if (drill.level === 2) {
    crumbs.push(
      back('subject', subject, handlers.home, 'Back to the whole map')
    );
    crumbs.push(sep('s1'), here('part', drill.groupLabel));
  } else {
    crumbs.push(
      back('subject', subject, handlers.home, 'Back to the whole map')
    );
    crumbs.push(
      sep('s1'),
      back('part', drill.groupLabel, handlers.up, 'Back to this part')
    );
    crumbs.push(sep('s2'), here('module', drill.moduleLabel));
  }

  return (
    <nav className="arch-map-crumbs" aria-label="Where you are in the map">
      {crumbs}
    </nav>
  );
}

/**
 * The measuring wrapper: the layout wraps against this element's size, so
 * the picture fills the tab and recentres on every resize. The measurement
 * is quantised to 16px so a drag of the divider re-lays the picture out a
 * handful of times rather than per pixel. Without a DOM (the unit suite) the
 * drawing takes its one default viewport and stays deterministic.
 */
function MeasuredMap({
  model,
  onOpenGroup,
  canvas
}: {
  model: ReturnType<typeof toMapModel>;
  onOpenGroup?: (groupId: string) => void;
  /**
   * PHASE 162, THE SEAM: the kept camera and layout in, the live camera
   * handle and the at-rest writes out. The INTEGRATOR wires this into
   * `ArchMap`'s camera props when the camera lands in `./map`; until then
   * the drawing renders exactly as Phase 161 left it and every key command
   * is a safe no-op through the null handle.
   */
  canvas?: ArchCanvasSeam;
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState<MapViewport | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (el === null || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const measure = (): void => {
      const rect = el.getBoundingClientRect();
      const w = Math.round(rect.width / 16) * 16;
      const h = Math.round(rect.height / 16) * 16;
      if (w <= 0 || h <= 0) return;
      setViewport((prev) =>
        prev !== null && prev.width === w && prev.height === h
          ? prev
          : { width: w, height: h }
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // PHASE 162, integrated: the seam flows through, the camera engine in
  // ./map/camera reads the kept state and publishes its handle back into
  // `canvas.cameraRef`. Without a seam the drawing stays as static as the
  // Phase 161 suites expect.
  return (
    <div className="arch-map-fill" ref={ref}>
      <ArchMap
        model={model}
        viewport={viewport ?? undefined}
        onOpenGroup={onOpenGroup}
        canvas={canvas}
      />
    </div>
  );
}

const NO_HANDLERS: ArchMapDrillHandlers = Object.freeze({});

/**
 * The face, with the answer handed in. Exported for the unit suite in the
 * `ArchModulesBody` shape: this repository carries no jsdom, and a store read
 * under `renderToStaticMarkup` sees only the server snapshot, so the states a
 * screenshot cannot reach are proved by rendering THIS with the entry as a
 * prop. The drill props are optional so a caller that knows only level 1,
 * like the Phase 160 suite, still renders the whole map.
 */
export function ArchMapTabBody({
  entry,
  progress,
  repoPath = '',
  drill = DRILL_HOME,
  part = null,
  handlers = NO_HANDLERS,
  canvas,
  onCameraKeyDown,
  tabRef
}: {
  entry: ArchMapEntry | null;
  progress: { done: number; total: number } | null;
  repoPath?: string;
  drill?: ArchDrill;
  part?: ArchPartMapEntry | null;
  handlers?: ArchMapDrillHandlers;
  /** PHASE 162: the canvas seam, absent in suites that predate the camera. */
  canvas?: ArchCanvasSeam;
  /** PHASE 162: the key set's bubble handler, attached at the drawing levels. */
  onCameraKeyDown?: (e: React.KeyboardEvent) => void;
  /** PHASE 162: the container element the staged drill rides on. */
  tabRef?: React.Ref<HTMLDivElement>;
}): React.JSX.Element {
  const subject = subjectOf(entry, repoPath);

  if (drill.level === 2) {
    return (
      <div
        className="arch-map-tab"
        data-slot="arch-map-tab"
        ref={tabRef}
        // PHASE 162. Focusable so the key set works after a plain click on
        // the ground, the image viewer's own pattern; -1 keeps it out of the
        // tab order, where the boxes already are.
        tabIndex={onCameraKeyDown === undefined ? undefined : -1}
        onKeyDown={onCameraKeyDown}
      >
        <ArchMapCrumbs subject={subject} drill={drill} handlers={handlers} />
        <ScopedBody part={part} handlers={handlers} canvas={canvas} />
      </div>
    );
  }

  if (drill.level === 3) {
    return (
      <div className="arch-map-tab" data-slot="arch-map-tab">
        <ArchMapCrumbs subject={subject} drill={drill} handlers={handlers} />
        <ArchDrillFiles
          repoPath={repoPath}
          groupId={drill.groupId}
          groupLabel={drill.groupLabel}
          dir={drill.moduleDir}
          label={drill.moduleLabel}
        />
      </div>
    );
  }

  const model = entry?.model ?? null;

  if (model === null || model.groups.length === 0) {
    const failed = entry?.status === 'error';
    // An empty picture that is NOT still building and did not fail is a
    // repository with nothing to draw, and the reading sentence would then be
    // a spinner that never ends. `building` is main's own word for the cold
    // scan still being owed.
    const reading = model === null || model.building;
    return (
      <div className="arch-map-tab" data-slot="arch-map-tab">
        <div className="ed-state">
          <div className="ed-state-title">
            {failed
              ? ARCH_MAP_ERROR
              : reading
                ? ARCH_MAP_LOADING
                : model !== null && model.fileCount > 0
                  ? // Tracked files exist and none of them sits in a folder,
                    // so the grouping has nothing to draw. Claiming no
                    // tracked files were found here would be false.
                    ARCH_MAP_FLAT_REPO
                  : ARCH_MAP_EMPTY_REPO}
          </div>
          {failed && entry?.error != null ? (
            <div className="ed-state-body">{entry.error}</div>
          ) : null}
          {!failed && reading && progress !== null && progress.total > 0 ? (
            <div className="ed-state-body" aria-live="polite">
              {`${String(progress.done)} of ${String(progress.total)} files read`}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className="arch-map-tab"
      data-slot="arch-map-tab"
      ref={tabRef}
      tabIndex={onCameraKeyDown === undefined ? undefined : -1}
      onKeyDown={onCameraKeyDown}
    >
      <ArchMapCrumbs subject={subject} drill={drill} handlers={handlers} />
      {entry?.status === 'error' ? (
        <p className="arch-map-stale">{ARCH_MAP_STALE}</p>
      ) : null}
      <MapBody model={model} onOpenGroup={handlers.openPart} canvas={canvas} />
    </div>
  );
}

/** The scoped level 2 face: one part as its modules, framed by the rest. */
function ScopedBody({
  part,
  handlers,
  canvas
}: {
  part: ArchPartMapEntry | null;
  handlers: ArchMapDrillHandlers;
  canvas?: ArchCanvasSeam;
}): React.JSX.Element {
  const model = part?.model ?? null;

  if (model !== null && model.known === false) {
    return (
      <div className="ed-state">
        <div className="ed-state-title">{ARCH_MAP_PART_GONE}</div>
      </div>
    );
  }

  if (model === null || model.modules.length === 0) {
    const failed = part?.status === 'error';
    const reading = model === null || model.building === true;
    return (
      <div className="ed-state">
        <div className="ed-state-title">
          {failed
            ? ARCH_MAP_ERROR
            : reading
              ? ARCH_MAP_LOADING
              : ARCH_MAP_EMPTY_REPO}
        </div>
        {failed && part?.error != null ? (
          <div className="ed-state-body">{part.error}</div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {part?.status === 'error' ? (
        <p className="arch-map-stale">{ARCH_MAP_STALE}</p>
      ) : null}
      <ScopedMapBody
        part={model}
        onOpenGroup={handlers.openModule}
        canvas={canvas}
      />
    </>
  );
}

/**
 * The adapter seam, memoized so the drawing's props are reference stable for
 * the same payload. Split out so the reading states above never pay for it.
 */
function MapBody({
  model,
  onOpenGroup,
  canvas
}: {
  model: ArchMapResult;
  onOpenGroup?: (groupId: string) => void;
  canvas?: ArchCanvasSeam;
}): React.JSX.Element {
  const drawn = useMemo(() => toMapModel(model), [model]);
  return <MeasuredMap model={drawn} onOpenGroup={onOpenGroup} canvas={canvas} />;
}

/** The same seam for the scoped payload. */
function ScopedMapBody({
  part,
  onOpenGroup,
  canvas
}: {
  part: NonNullable<ArchPartMapEntry['model']>;
  onOpenGroup?: (moduleId: string) => void;
  canvas?: ArchCanvasSeam;
}): React.JSX.Element {
  const drawn = useMemo(() => toPartMapModel(part), [part]);
  return <MeasuredMap model={drawn} onOpenGroup={onOpenGroup} canvas={canvas} />;
}
