/**
 * The pass and the repair: one of the three action modules behind `useArch`
 * (Phase 172; the bodies are store.ts's own, bytes unchanged).
 *
 * Every verb here is a person's gesture that asks MAIN to act: draft the
 * skeleton, run the enriching pass, repair what drifted, append one accepted
 * divergence. This module holds no path and composes no bytes, per rule 4 at
 * the head of ../store.ts: it asks, and it reads back what landed.
 */

import type { StateCreator } from 'zustand';
import type { ArchPassScope } from '@shared/ipc';
import { localPathOf } from '@shared/workspace-target';
import { useApp } from '../../state/store';
import { acceptBridge, passBridge, seedBridge } from '../bridge';
import type { ArchPassStatusResult } from '../bridge';
import { errorText } from './view-state';
import type { ArchPassEntry, ArchViewState } from './view-state';

/** The one shape every pass patch goes through, so an entry is never torn. */
export type PassSetter = (
  fn: (s: ArchViewState) => Pick<ArchViewState, 'passes'>
) => void;

export function patchPass(
  set: PassSetter,
  cwd: string,
  patch: Partial<ArchPassEntry>
): void {
  set((s) => {
    const held = s.passes[cwd] ?? { status: null, refusal: null };
    return { passes: { ...s.passes, [cwd]: { ...held, ...patch } } };
  });
}

/**
 * The held status marked running the moment the started event lands, so the
 * face says so without waiting a round trip. A pass that started was chosen,
 * whether or not this window ever read the status, and whether or not the
 * status it holds predates the choice: main gated the spawn on the choice,
 * so `chosen` is true by the fact of the event. The Phase 158 verifier
 * watched a face keep saying "pick one in Settings" beside the spinner of
 * the run that choice had started, because this kept the stale false.
 */
export function runningStatus(
  held: ArchPassStatusResult | null,
  cwd: string
): ArchPassStatusResult {
  return held === null
    ? { cwd, running: true, suspended: null, chosen: true, lastRun: null }
    : { ...held, running: true, chosen: true };
}

/** The pass and repair slice of {@link ArchViewState}. */
type PassActions = Pick<
  ArchViewState,
  | 'draft'
  | 'enrich'
  | 'repairDrift'
  | 'loadPass'
  | 'reloadPass'
  | 'passFor'
  | 'acceptDivergence'
>;

export const createPassActions: StateCreator<
  ArchViewState,
  [],
  [],
  PassActions
> = (set, get) => ({
  async draft() {
    const target = get().target;
    const api = seedBridge();
    if (target === null || api === null || get().drafting) return;
    const cwd = localPathOf(target);
    if (cwd === null) return;
    set({ drafting: true });
    try {
      // MAIN WRITES, this store does not: the skeleton lands under
      // `docs/arch/` as an ordinary uncommitted change, which is the
      // operator's amendment. Source Control sees it through the watcher.
      await api.seed({ cwd });
      // Read the contract back so the cockpit draws what just landed.
      await get().refresh();
    } catch (err) {
      useApp.getState().toast('error', errorText(err), { sticky: true });
      set({ drafting: false });
      return;
    }
    set({ drafting: false });
    // THE SAME ONE GESTURE CONTINUES INTO THE PASS, where this build has
    // one. There is no second button and no fork: main holds the Settings
    // choice and the confirm gate, so with no agent picked this ask comes
    // back idle, the record says so, and the skeleton is the whole story.
    if (passBridge() !== null) await get().enrich();
  },

  async enrich(scope: ArchPassScope = 'whole') {
    const target = get().target;
    const api = passBridge();
    if (target === null || api === null || get().enriching) return;
    const cwd = localPathOf(target);
    if (cwd === null) return;
    set({ enriching: true });
    try {
      // The whole pass sends exactly what it sent before Phase 159; only the
      // drift scope adds a field, so the shipped button's bytes are unchanged.
      const result = await api.enrich(
        scope === 'drift' ? { cwd, scope } : { cwd }
      );
      // The refusal that stopped the gesture before any spawn is kept
      // beside the status, because it never becomes a run record and the
      // face still owes the person a sentence about it.
      patchPass(set, cwd, { refusal: result.started ? null : result.refusal });
      // Whatever happened, main's status read is the truth the face draws.
      await get().reloadPass(cwd);
      // A kept run wrote the contract, so read it back, and read the map
      // again where this window holds one: painted coverage is the proof
      // surface and the picture must move with the files. The seed a
      // contractless enrich performed lands the same way.
      if (result.run?.verdict === 'kept' || result.seeded.length > 0) {
        await get().refresh();
        if (get().maps[cwd] !== undefined) void get().loadMap(cwd);
      }
    } catch (err) {
      // A refused or failed run is a RECORD in main, not a throw, so a throw
      // here is the ask itself failing. One sentence, never a blank face.
      useApp.getState().toast('error', errorText(err), { sticky: true });
    } finally {
      set({ enriching: false });
    }
  },

  async repairDrift() {
    await get().enrich('drift');
  },

  async loadPass(repoPath) {
    if (get().passes[repoPath] !== undefined) return;
    await get().reloadPass(repoPath);
  },

  async reloadPass(repoPath) {
    const api = passBridge();
    if (api === null) return;
    try {
      const status = await api.passStatus({ cwd: repoPath });
      patchPass(set, repoPath, { status });
    } catch {
      // No status is an honest state the face already draws. Nothing to say.
    }
  },

  passFor(repoPath) {
    return get().passes[repoPath] ?? null;
  },

  async acceptDivergence(input) {
    const target = get().target;
    const api = acceptBridge();
    if (target === null || api === null) {
      return { ok: false, reason: 'This build cannot accept a divergence.' };
    }
    const cwd = localPathOf(target);
    if (cwd === null) {
      return { ok: false, reason: 'This repository is not on this computer.' };
    }
    const result = await api.acceptDivergence({ cwd, ...input });
    // A kept write moved the baseline, so the strip's accepted list and the
    // verdict counts are read back rather than patched here: main is the
    // one place those live.
    if (result.ok) await get().refresh();
    return result;
  },
});

// `ensureDraftFolders` LIVED HERE UNTIL PHASE 158 and is gone on purpose:
// the seed write happens in main, whose one writer module makes the folders
// itself, so the renderer creates nothing and holds no path at all.
