/**
 * Screenshot-harness probe for the "Enable for…" picker (Phase 26.1).
 *
 * The picker opens from a native context menu, and a native menu cannot be
 * driven from the renderer. The GMUX_SHOT harness therefore needs the same
 * kind of inert window global the other domains register (see
 * terminal/drop/shot-probe.ts and tree/shot-probe.ts): a function that reaches
 * the store's own `openFor`, so the capture photographs the shipped dialog
 * with a caller-supplied fleet. Never invoked outside the harness — outside it
 * this is one unused property on `window`, and no behavior changes.
 */

import type { ContextEntry } from '../model';
import { useEnableFlow } from './enable-store';

export interface EnableShotSpec {
  /** The skill name shown in the title. */
  name: string;
  /** The pinned source, or null for the no-pin fallback state. */
  source: string | null;
  /** The fleet, exactly as the scan would hand it over. */
  agents: Array<{ id: string; name: string; cliName: string | null }>;
  /** Agent ids that already hold the skill on disk (pre-checked, locked). */
  onDisk: string[];
}

declare global {
  interface Window {
    __gmuxEnableShotOpen?: (spec: EnableShotSpec) => void;
  }
}

export function registerEnableShotProbe(): void {
  window.__gmuxEnableShotOpen = (spec: EnableShotSpec): void => {
    useEnableFlow.getState().openFor({
      entry: {
        name: spec.name,
        scope: 'global',
        agents: spec.onDisk
      } as ContextEntry,
      agents: spec.agents,
      source: spec.source,
      projectRoot: null
    });
  };
}
