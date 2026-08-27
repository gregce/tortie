/**
 * THE ARCHITECTURE MAP TAB's body (Phase 160): one repository drawn as five to
 * nine parts, taking the whole editor surface the way a file does.
 *
 * ## What this file is and is not
 *
 * It is the CONTAINER: it asks the store for the model, keeps the picture
 * honest while main is still reading the code, and mounts the drawing. The
 * drawing itself is `./map`, which is pure, being props in and SVG out, in the
 * `scm/graph/` shape. Nothing here computes a layout and nothing in `./map`
 * touches a bridge, so the two halves can be tested apart.
 *
 * ## Two facts of the design, said once
 *
 *  - **Opening never blocks on the cold scan.** The first reading of a large
 *    repository is seconds of parsing, measured in the phase spec at 2.3 s on
 *    this repository, and every later reading is about 15 ms because the fact
 *    base is incremental. So this body draws a progress state on the cold
 *    path, the map the moment the facts land, and the warm picture on every
 *    open after that.
 *  - **Closing the tab loses nothing.** The model lives in main's fact base
 *    and in the store's map slice, keyed by repository. Reopening is a
 *    redraw, not a recompute of anything durable.
 *
 * ## The overlay is not drawn here
 *
 * The model arrives with the contract already joined onto it in main: a part
 * a contract component claims carries the person's name, and an edge a
 * judged promise rides carries that verdict. One picture for both states,
 * which is the charter's own rule, falls out of there being one composer.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { archBridge } from './bridge';
import type { ArchMapResult } from './bridge';
import { ArchMap } from './map';
import { toMapModel } from './map-model';
import {
  ARCH_MAP_EMPTY_REPO,
  ARCH_MAP_ERROR,
  ARCH_MAP_FLAT_REPO,
  ARCH_MAP_LOADING,
  ARCH_MAP_STALE
} from './copy';
import { useArch } from './store';
import type { ArchMapEntry } from './store';
import './arch.css';

export function ArchMapTab({
  repoPath
}: {
  repoPath: string;
}): React.JSX.Element {
  const entry = useArch((s) => s.maps[repoPath] ?? null);
  const loadMap = useArch((s) => s.loadMap);
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

  return <ArchMapTabBody entry={entry} progress={progress} />;
}

/**
 * The face, with the answer handed in. Exported for the unit suite in the
 * `ArchModulesBody` shape: this repository carries no jsdom, and a store read
 * under `renderToStaticMarkup` sees only the server snapshot, so the states a
 * screenshot cannot reach are proved by rendering THIS with the entry as a
 * prop.
 */
export function ArchMapTabBody({
  entry,
  progress
}: {
  entry: ArchMapEntry | null;
  progress: { done: number; total: number } | null;
}): React.JSX.Element {
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
    <div className="arch-map-tab" data-slot="arch-map-tab">
      {entry?.status === 'error' ? (
        <p className="arch-map-stale">{ARCH_MAP_STALE}</p>
      ) : null}
      <MapBody model={model} />
    </div>
  );
}

/**
 * The adapter seam, memoized so the drawing's props are reference stable for
 * the same payload. Split out so the reading states above never pay for it.
 */
function MapBody({ model }: { model: ArchMapResult }): React.JSX.Element {
  const drawn = useMemo(() => toMapModel(model), [model]);
  return <ArchMap model={drawn} />;
}
