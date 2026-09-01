/**
 * The Phase 189 harness drive: open a project while the app is already running.
 *
 * WHY IT EXISTS. The phase has to prove the tab row keeps up rather than being
 * right only at mount, which means opening and closing projects with the window
 * narrow, in the SAME app run as everything else. Closing needs nothing from
 * here: `build/probe-p189-tabs.mjs` presses the tab's own × and then the
 * confirm's own button, which is the whole shipped path. Opening is the one
 * step a probe cannot press, because the + opens a native folder picker and a
 * native picker takes an OS mouse grab.
 *
 * SO THIS IS ONE FUNCTION AND IT CALLS ONE STORE ACTION. `addProjectPath` is
 * exactly what `openProject` calls once the picker has answered, so the probe
 * joins the shipped path one step after the dialog rather than replacing it.
 * It adds no route a person does not have and it decides nothing about tabs.
 *
 * IT IS NEVER IN A PERSON'S LAUNCH. `./probe-registry.ts` is reached through
 * one dynamic import that fires only when the renderer's own URL carries
 * `harness=1`, and `build/assert-probe-containment.mjs` reads the built output
 * to prove `__gmuxP189Open` is not in the chunk a launch parses.
 */

import { useApp } from '../state/store';

declare global {
  interface Window {
    __gmuxP189Open?: (path: string) => Promise<{
      count: number;
      names: string[];
      activeId: string | null;
    }>;
  }
}

export function registerP189Probe(): void {
  window.__gmuxP189Open = async (path: string) => {
    await useApp.getState().addProjectPath(path);
    const state = useApp.getState();
    const ordered = state.orderedProjects();
    return {
      count: ordered.length,
      names: ordered.map((p) => p.name),
      activeId: state.activeProjectId
    };
  };
}
