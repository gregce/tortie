/**
 * What the ⌘T sheet needs to know about SpecStory capture, and nothing else.
 *
 * ONE ROUND TRIP, SHARED. `specstory:status` is main's cached answer (binary
 * resolution once per app run, account facts from a stat + parse), so the cost
 * of asking is small — but the sheet opens on ⌘T and must not wait on IPC to
 * lay itself out. So the answer is fetched once per app run into a module
 * cache, refreshed when a sheet opens after the account may have changed, and
 * read synchronously after that.
 *
 * WHAT IT DELIBERATELY DOES NOT DO: poll. Signing in happens about twice a
 * year, in Settings, and the sheet re-reads on open — that is the whole
 * lifecycle.
 */

import { useEffect, useState } from 'react';
import type { GmuxSpecStoryExtras } from '@shared/ipc';
import { captureDefaultFor } from '@shared/settings';
import type { SpecStoryStatus } from '@shared/specstory-status';
import { useSettingsStore } from '../settings/settings-store';

type Bridge = NonNullable<GmuxSpecStoryExtras['specstory']>;

function bridge(): Bridge | null {
  return (
    (window.gmux as (typeof window.gmux & GmuxSpecStoryExtras) | undefined)
      ?.specstory ?? null
  );
}

let cached: SpecStoryStatus | null = null;
let inFlight: Promise<SpecStoryStatus | null> | null = null;
const listeners = new Set<(status: SpecStoryStatus | null) => void>();

function load(): Promise<SpecStoryStatus | null> {
  const b = bridge();
  if (b === null) return Promise.resolve(null);
  if (inFlight !== null) return inFlight;
  inFlight = b
    .status()
    .then((status) => {
      cached = status;
      for (const fn of listeners) fn(status);
      return status;
    })
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/**
 * SpecStory status for the sheet: null while it has never been fetched, and
 * null forever on a build whose preload has no specstory surface — in which
 * case the capture row simply is not drawn, which is the honest outcome.
 *
 * @param active fetch (and re-fetch) while true — the modal passes its own
 *               open state, so a closed sheet costs nothing.
 */
export function useSpecStoryStatus(active: boolean): SpecStoryStatus | null {
  const [status, setStatus] = useState<SpecStoryStatus | null>(cached);
  useEffect(() => {
    listeners.add(setStatus);
    return () => {
      listeners.delete(setStatus);
    };
  }, []);
  useEffect(() => {
    if (!active) return;
    void load();
  }, [active]);
  return status;
}

/**
 * Can this agent be captured with the SpecStory on this machine?
 *
 * Both halves must be true: gmux has a provider for the agent AND a binary
 * was resolved. `captureAgents` comes from main's registry ∩ the CLI's own
 * provider list, so an agent whose provider the installed CLI has never heard
 * of is absent here and the row stays hidden rather than offering a capture
 * that would be declined at spawn.
 */
export function captureAvailableFor(
  status: SpecStoryStatus | null,
  agent: string
): boolean {
  if (status === null || status.binary === null) return false;
  return status.captureAgents.some((a) => a.agentId === agent);
}

/**
 * Does a NO-MODAL create of this agent start captured? The ˅ quick-create
 * board and the per-agent hotkeys inherit the sticky default silently
 * (research 13 §3.1) — the same rule Settings → Launch defaults already
 * follows for flags, so the two no-modal paths agree with the sheet.
 *
 * Reads the store imperatively because both callers are event handlers, not
 * components.
 */
export function captureDefaultForAgent(agentId: string): boolean {
  return captureDefaultFor(useSettingsStore.getState().settings, agentId);
}
