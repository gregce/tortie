/**
 * The one gate that decides whether this renderer loads its harness drives
 * (Phase 127).
 *
 * HOW IT IS GATED. The gate is a query string on the renderer's own URL, read
 * once, synchronously, at module evaluation. Main appends `harness=1` when
 * `isHarnessLaunch(process.env)` answers true, and appends nothing otherwise.
 * Nothing polls and nothing races, and the renderer asks no bridge member for
 * the answer, so the shared IPC contract does not move.
 *
 *   main                                    renderer
 *   ----                                    --------
 *   isHarnessLaunch(process.env)?
 *     yes -> loadFile(index.html,
 *              { search: 'harness=1' })  -> ARMED, read at module scope here
 *     no  -> loadFile(index.html)        -> not armed
 *
 * WHAT IT BUYS. `./probe-registry.ts` statically imports fourteen probe
 * modules, being 224,900 bytes of source that a person's launch used to load
 * inside the single entry chunk. `import(...)` below is the only reference to
 * that file in production, so Rollup emits it as its own chunk and the entry
 * chunk carries none of it. `build/assert-probe-containment.mjs` reads the
 * built output and fails if that stops being true.
 *
 * WHAT IT DOES NOT CHANGE. The probes themselves are untouched and stay on the
 * shipped implementation path. Every existing harness sets at least one of the
 * four terms `isHarnessLaunch` reads, so no harness behaves differently. The
 * only launch that changes is a person's real one.
 */

/**
 * True when this renderer was told to load its probes.
 *
 * Read once at module scope. `location.search` cannot change under this app,
 * because the window navigates nowhere after the initial load, and reading it
 * later would invite a race with the first render.
 */
const ARMED = ((): boolean => {
  try {
    return new URLSearchParams(window.location.search).get('harness') === '1';
  } catch {
    // A window with no parseable URL is not a harness window.
    return false;
  }
})();

/**
 * Load and install the harness drives, or do nothing at all.
 *
 * A failed chunk load is reported and swallowed. A harness that ran undriven
 * with nothing on the console is the failure mode src/main/harness/shot.ts
 * already writes a paragraph about, so this says so out loud instead.
 */
export async function loadProbes(): Promise<void> {
  if (!ARMED) return;
  const w = window as unknown as { __gmuxProbeLoad?: string };
  try {
    const registry = await import('./probe-registry');
    registry.installProbes();
    // One word on `window`, written only on an armed launch. A harness that
    // came back empty needs to be able to tell "the chunk never loaded" from
    // "the chunk loaded and the drive was deleted", and a console line is not
    // readable from another process. build/probe-p127-probes.mjs reads this.
    w.__gmuxProbeLoad = 'ok';
  } catch (err) {
    w.__gmuxProbeLoad = `failed: ${String(err)}`;
    console.error(
      '[gmux] the harness probes did not load, so every drive on this ' +
        'launch will time out waiting for a window property that is never ' +
        'set.',
      err
    );
  }
}

/** Whether this renderer is armed. Exported for the probe-loader test. */
export function probesArmed(): boolean {
  return ARMED;
}
