/**
 * The document and the check: one of the three action modules behind
 * `useArch` (Phase 172; the bodies are store.ts's own, bytes unchanged).
 *
 * This is the store's reading of the contract itself: the load, the check,
 * the selection, the readonly getters every panel draws from, and the one
 * subscription to main's pushes. The subscription lives here because
 * `arch:checked` is the document's own re-read, and its map and pass
 * reactions reach the sibling modules' helpers rather than duplicating
 * them.
 */

import type { StateCreator } from 'zustand';
import { localPathOf, sameTarget } from '@shared/workspace-target';
import { gmuxBridge } from '../../bridge';
import { archAvailable, archBridge, passBridge } from '../bridge';
import { reloadScopedReads } from './map-actions';
import { patchPass, runningStatus } from './pass-actions';
import { errorText, NO_SELECTION, NONE } from './view-state';
import type { ArchViewState } from './view-state';

/** The document and check slice of {@link ArchViewState}. */
type DocumentActions = Pick<
  ArchViewState,
  | 'syncProject'
  | 'ensureLoaded'
  | 'refresh'
  | 'check'
  | 'select'
  | 'toggleSelected'
  | 'selectAll'
  | 'focused'
  | 'subscribeEvents'
  | 'applyProgress'
  | 'verdicts'
  | 'components'
  | 'edges'
  | 'problems'
  | 'counts'
  | 'freshness'
  | 'changes'
  | 'driftCount'
  | 'nameOf'
>;

export const createDocumentActions: StateCreator<
  ArchViewState,
  [],
  [],
  DocumentActions
> = (set, get) => ({
  syncProject(target) {
    if (target !== null && sameTarget(get().target, target)) return;
    set({
      target,
      load: null,
      lastCheck: null,
      progress: null,
      error: null,
      selected: NO_SELECTION,
      status: target === null ? 'idle' : 'loading'
    });
    if (target !== null) void get().refresh();
  },

  async ensureLoaded(target) {
    if (target === null) return;
    if (!sameTarget(get().target, target)) {
      set({
        target,
        load: null,
        lastCheck: null,
        progress: null,
        error: null,
        selected: NO_SELECTION,
        status: 'loading'
      });
    }
    if (get().load !== null) return;
    await get().refresh();
  },

  async refresh() {
    const target = get().target;
    if (target === null) return;
    if (!archAvailable()) {
      set({ status: 'unavailable' });
      return;
    }
    const cwd = localPathOf(target);
    if (cwd === null) {
      // Reading a contract on another computer is not in this phase, and the
      // view says that rather than drawing an empty state that would read as
      // "this repository has no contract".
      set({ status: 'elsewhere' });
      return;
    }
    const api = archBridge();
    if (api === null) {
      set({ status: 'unavailable' });
      return;
    }
    set({ status: 'loading', error: null });
    try {
      const load = await api.load({ cwd });
      // The project may have changed under a slow read. Land nothing then.
      if (!sameTarget(get().target, target)) return;
      set({ load, lastCheck: null, status: 'ready', error: null });
    } catch (err) {
      if (!sameTarget(get().target, target)) return;
      set({ status: 'error', error: errorText(err) });
    }
  },

  async check() {
    const target = get().target;
    const api = archBridge();
    if (target === null || api === null || get().checking) return;
    const cwd = localPathOf(target);
    if (cwd === null || typeof api.check !== 'function') return;
    set({ checking: true, progress: null });
    try {
      const result = await api.check({ cwd });
      if (!sameTarget(get().target, target)) return;
      set({ lastCheck: result, checking: false, progress: null });
    } catch (err) {
      if (!sameTarget(get().target, target)) return;
      set({ checking: false, progress: null, error: errorText(err) });
    }
  },

  select(id) {
    set({ selected: id === null ? NO_SELECTION : [id] });
  },

  toggleSelected(id) {
    const current = get().selected;
    const next = current.includes(id)
      ? current.filter((s2) => s2 !== id)
      : [...current, id];
    set({ selected: next.length === 0 ? NO_SELECTION : next });
  },

  selectAll(ids) {
    set({ selected: ids.length === 0 ? NO_SELECTION : [...ids] });
  },

  focused() {
    const { selected } = get();
    return selected.length === 0 ? null : (selected[selected.length - 1] ?? null);
  },

  subscribeEvents() {
    const api = archBridge();
    if (api === null) return () => undefined;
    const offChecked =
      typeof api.onChecked === 'function'
        ? api.onChecked((event) => {
            // Phase 160. A finished check may have moved the facts the map is
            // drawn from, so any held model for that repository is read again,
            // whether or not it belongs to the active project: a map tab for a
            // background project is still on screen. Nothing is announced; the
            // picture moves the way the numbers do.
            if (get().maps[event.cwd] !== undefined) {
              void get().loadMap(event.cwd);
            }
            reloadScopedReads(get(), event.cwd);
            const target = get().target;
            if (target === null || localPathOf(target) !== event.cwd) return;
            set({ checking: false, progress: null });
            void get().refresh();
          })
        : () => undefined;
    const offProgress =
      typeof api.onProgress === 'function'
        ? api.onProgress((p) => {
            get().applyProgress(p.cwd, p.done, p.total);
          })
        : () => undefined;
    // Phase 160. The fact base behind a map moved, being a cold scan landing
    // or a check republishing. Nothing heavy travels on the push; the store
    // asks `arch:map` again for any repository it holds a picture of, and the
    // in flight guard in `loadMap` folds a burst into one read.
    const offMapUpdated =
      typeof api.onMapUpdated === 'function'
        ? api.onMapUpdated((event) => {
            if (get().maps[event.cwd] !== undefined) {
              void get().loadMap(event.cwd);
            }
            // Phase 161. A scoped picture is a reading of the same fact
            // base, so it moves when the base does. Only the scopes the
            // drill can still reach are held, and the in flight fold in
            // each read keeps a burst at two asks.
            reloadScopedReads(get(), event.cwd);
          })
        : () => undefined;
    // Phase 158. The pass says where it stands while it runs, the way a
    // session row says written and the time. Nothing is announced, no toast
    // and no badge, because a pass that finished is a face that changed,
    // not an interruption.
    const pass = passBridge();
    // THE CHOICE IS MADE IN SETTINGS, AND THE PANE MUST LEARN OF IT. The pass
    // status is main's reading of the sealed choice, and it is read once per
    // repository and then held, so a person who picked an agent in Settings
    // with the pane already open used to keep the "pick one in Settings"
    // face and no run control until a relaunch (the Phase 158 verifier's
    // blocking finding). The settings broadcast is the one signal that the
    // choice moved, so every held status is read again on it. A read, never
    // a spawn: main answers from the seal checked value and starts nothing.
    const settingsBridge = gmuxBridge();
    const offSettings =
      pass !== null && typeof settingsBridge?.onSettingsChanged === 'function'
        ? settingsBridge.onSettingsChanged(() => {
            for (const cwd of Object.keys(get().passes)) {
              void get().reloadPass(cwd);
            }
          })
        : () => undefined;
    const offPass =
      pass !== null
        ? pass.onPass((event) => {
            if (event.phase === 'started') {
              patchPass(set, event.cwd, {
                refusal: null,
                status: runningStatus(
                  get().passes[event.cwd]?.status ?? null,
                  event.cwd
                )
              });
              return;
            }
            // Finished: main's status read is the truth the face draws, and
            // a kept run moved `docs/arch/`, so the contract and any held
            // map are read back the way a finished check is.
            void get().reloadPass(event.cwd);
            if (event.run?.verdict === 'kept') {
              if (get().maps[event.cwd] !== undefined) {
                void get().loadMap(event.cwd);
              }
              const target = get().target;
              if (target !== null && localPathOf(target) === event.cwd) {
                void get().refresh();
              }
            }
          })
        : () => undefined;
    return () => {
      offChecked();
      offProgress();
      offMapUpdated();
      offSettings();
      offPass();
    };
  },

  applyProgress(cwd, done, total) {
    const target = get().target;
    if (target === null || localPathOf(target) !== cwd) return;
    set({ checking: done < total, progress: { done, total } });
  },

  verdicts() {
    const { lastCheck, load } = get();
    return lastCheck?.verdicts ?? load?.verdicts ?? NONE;
  },

  components() {
    return get().load?.components ?? NONE;
  },

  edges() {
    return get().load?.edges ?? NONE;
  },

  problems() {
    return get().load?.problems ?? NONE;
  },

  counts() {
    const { lastCheck, load } = get();
    return lastCheck?.counts ?? load?.counts ?? null;
  },

  freshness() {
    const { lastCheck, load } = get();
    return lastCheck?.freshness ?? load?.freshness ?? NONE;
  },

  changes() {
    const { lastCheck, load } = get();
    return lastCheck?.changes ?? load?.changes ?? null;
  },

  driftCount() {
    const { lastCheck, load } = get();
    return lastCheck?.drift.count ?? load?.drift.count ?? 0;
  },

  nameOf(componentId) {
    return (
      get().load?.components.find((c) => c.id === componentId)?.name ??
      componentId
    );
  }
});
