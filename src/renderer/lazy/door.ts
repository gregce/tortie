/**
 * A lazy door: one chunk, fetched on first need, drawn without React's
 * fallback throttle (Phase 165).
 *
 * ## Why this is not React.lazy
 *
 * `React.lazy` inside `<Suspense>` is the shape Phase 160 used for the map
 * tab and Phase 163 for the diagnostics tab, and it is the shape this phase
 * started with. It costs 300 ms on every first open, and the cost is not the
 * chunk. When a boundary commits its fallback, React holds the content back
 * until 300 ms have passed since the most recent fallback was shown, so a
 * chunk that arrives in 10 ms is drawn at 300 ms. That is react-dom's own
 * `FALLBACK_THROTTLE_MS`, and it is why the map tab opened in 306 ms on the
 * parent commit with a 61 KB chunk, and why the Architecture subject went
 * from 55 ms to 307 ms when it was first made lazy with Suspense. Measured
 * on 2026-08-29 by build/probe-p165-paint.mjs, online and offline alike.
 *
 * This door holds the loaded module itself. While the chunk is in flight the
 * component draws its own fallback; when the chunk lands the door bumps a
 * render and the component draws the real thing. No boundary, no throttle,
 * and a mount after the first pays nothing, because the module is held at
 * module scope for the life of the window.
 *
 * ## What it keeps
 *
 *  - One fetch, shared by `use` and `preload`.
 *  - A failed fetch is forgotten, so the next need tries again rather than
 *    the surface being broken for the life of the window, and the failure is
 *    thrown from render so the nearest error boundary draws the recovery
 *    surface exactly as it would have for a Suspense boundary.
 *  - Nothing runs at import. The chunk is asked for on the first render that
 *    wants it, or by an explicit `preload`.
 */

import { useEffect, useReducer, useState } from 'react';

export interface LazyDoor<M> {
  /** Fetch the chunk now. Resolves once the module is held. */
  preload(): Promise<void>;
  /**
   * A hook. Returns the module once it is held, and null while it is not
   * wanted or not yet landed. Rendering with `wanted` true is what starts
   * the fetch.
   */
  use(wanted: boolean): M | null;
}

export function lazyDoor<M>(importer: () => Promise<M>): LazyDoor<M> {
  let loading: Promise<M> | null = null;
  let loaded: M | null = null;

  const load = (): Promise<M> => {
    if (loading === null) {
      loading = importer().then(
        (m) => {
          loaded = m;
          return m;
        },
        (err: unknown) => {
          loading = null;
          throw err;
        }
      );
    }
    return loading;
  };

  return {
    preload: () => load().then(() => undefined),
    use(wanted: boolean): M | null {
      const [, bump] = useReducer((n: number) => n + 1, 0);
      const [failure, setFailure] = useState<unknown>(null);
      useEffect(() => {
        if (!wanted || loaded !== null) return undefined;
        let live = true;
        load().then(
          () => {
            if (live) bump();
          },
          (err: unknown) => {
            if (live) setFailure(err instanceof Error ? err : new Error(String(err)));
          }
        );
        return () => {
          live = false;
        };
      }, [wanted]);
      if (failure !== null) throw failure;
      return wanted ? loaded : null;
    }
  };
}
