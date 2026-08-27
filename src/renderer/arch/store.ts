/**
 * Architecture view state: what the contract says, what Tortie made of it, and
 * nothing else.
 *
 * FIVE RULES, and every one of them is a refusal from research 49 rather than
 * a preference.
 *
 *  1. **Nothing here polls and nothing here announces.** Main re-checks on the
 *     watcher's own fan-out and sends `arch:checked`; this store applies the
 *     answer. There is no toast, no rail badge and no dot on a session tab. A
 *     verdict that changed while you were reading a file is a number that
 *     moved, not an interruption.
 *  2. **NO VERDICT EVER TOUCHES A SESSION'S STATUS.** Nothing in this file
 *     imports the sessions slice for a write, and nothing in it may. Status
 *     semantics belong to session behaviour and this surface is not session
 *     behaviour.
 *  3. **A failed read never blanks the panel.** A contract file that will not
 *     parse is a dropped row with the file, the field and the reason on
 *     screen, beside every row that did load.
 *  4. **Tortie reads `baseline.json` and never writes it.** There is no accept
 *     verb here and there is no verb here that writes any file under
 *     `docs/arch/`. Drafting hands unsaved buffers to the editor; a person
 *     presses Save.
 *  5. **The first check is a question, never a stale verdict.** `firstCheck`
 *     renders as "Not checked yet" and never as "changed", because a run that
 *     has not finished has nothing to say about whether anything moved.
 *
 * WHAT IS NOT HERE, so a later round has something to point at: no layout
 * positions, no payload composer, no send to a session, and no count badge for
 * any surface outside this view to draw. The SELECTION lives here (Phase 64
 * widened it to a list) and the sending does not: composing and delivering are
 * in ./deliver.ts and ./picker.ts, behind one guard, so this file still writes
 * nothing to any session.
 */

import { create } from 'zustand';
import type {
  ArchComponent,
  ArchCoverageCounts,
  ArchEdge,
  ArchFreshness,
  ArchProblem,
  ArchVerdict
} from '@shared/arch';
// The channel ANSWER shapes, which are the ipc domain's own and not the
// repository's records.
import type { ArchCheckResult, ArchLoadResult } from '@shared/ipc';
import type { WorkspaceTarget } from '@shared/workspace-target';
import { localPathOf, sameTarget } from '@shared/workspace-target';
import { requestOpenFile } from '../state/open-file';
import { useApp } from '../state/store';
import { gmuxBridge } from '../bridge';
import {
  archAvailable,
  archBridge,
  mapBridge,
  skeletonBridge
} from './bridge';
import type { ArchMapResult } from './bridge';
import { ARCH_MAP_ERROR, ARCH_MAP_NO_BRIDGE } from './copy';
import { ARCH_SEED_COPIED, ARCH_VIEW_TITLE } from './copy';
import { seedPromptText } from './seed-prompt';

/**
 * `elsewhere` carries exactly one meaning, and it is the one Context's store
 * settled on: this build's preload cannot ask another computer anything, so
 * there is nothing to read and the view says so. Reading a contract on a
 * machine is not in this phase.
 */
export type ArchStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error'
  | 'unavailable'
  | 'elsewhere';

/**
 * What the person has selected, as an ORDERED list of opaque strings.
 *
 * Each entry is the verdict's own `subjectId` vocabulary, being
 * `component:<id>`, `edge:<id>` and `gap:<componentId>:<n>`, so the prose
 * panel, the verdict table and the composed payload key on one thing rather
 * than on three that can disagree.
 *
 * PHASE 64 WIDENED IT FROM ONE STRING TO A LIST, and the reason is the verb
 * rather than the view. A scope a person hands to an agent is usually more
 * than one part: two components and the edge between them, or a component and
 * the gap they want closed. Composing that out of one selection at a time
 * would mean composing it out of three separate gestures.
 *
 * THE ORDER IS THE PERSON'S OWN and it is kept. The payload reads in the
 * order they picked, because the first thing they picked is the thing they
 * are thinking about, and a set sorted by id would bury it.
 *
 * IT IS PRESENTATION AND NOTHING ELSE. Nothing here writes to the sessions
 * slice and nothing here sets any session's status. Rule 2 at the head of
 * this file is unchanged by the widening.
 */
export type ArchSelection = readonly string[];

/** The empty selection, as ONE frozen array. See `NONE` below for why. */
const NO_SELECTION: ArchSelection = Object.freeze([]);

/**
 * PHASE 160 — one repository's reading of the MAP model.
 *
 * The last good model stays through a reload, for the reason the contract's
 * own `lastValid` rows stay through a bad read: a picture that blinks blank on
 * every refresh is unusable in the exact minute agents are writing under it.
 * `error` beside a non-null `model` means the newest read failed and what is
 * on screen is the read before it.
 */
export interface ArchMapEntry {
  status: 'loading' | 'ready' | 'error';
  model: ArchMapResult | null;
  error: string | null;
}

export interface ArchViewState {
  /** Which folder, on which computer, this reading belongs to. */
  target: WorkspaceTarget | null;
  status: ArchStatus;
  /** The whole `arch:load` answer, or null before one has landed. */
  load: ArchLoadResult | null;
  /** The last `arch:check` answer, which supersedes the loaded verdicts. */
  lastCheck: ArchCheckResult | null;
  /** A re-check in flight, and how far along main says it is. */
  checking: boolean;
  progress: { done: number; total: number } | null;
  /** A read that failed outright. One sentence, never a blank panel. */
  error: string | null;
  /** The selected subjects, in the order the person picked them. */
  selected: ArchSelection;
  /** Drafting in flight, so the control cannot be pressed twice. */
  drafting: boolean;
  /**
   * PHASE 160 — the map models this window holds, keyed by repository root.
   *
   * Keyed by repository rather than living beside `load`, because a map tab
   * outlives the active project: a person can switch projects and the tab for
   * the first repository is still on screen and still has to draw. Nothing in
   * an entry writes to any session and nothing in it touches the contract.
   */
  maps: Readonly<Record<string, ArchMapEntry>>;

  syncProject(target: WorkspaceTarget | null): void;
  /**
   * Make sure this project's contract is loaded, and answer when it is.
   *
   * `syncProject` is what the VIEW calls, and it fires the read without
   * waiting because a view has a loading state to draw. Phase 64's picker has
   * no view: it opens a native menu straight out of a session, so it has to be
   * able to wait for the rows it is about to draw. This is that wait, over the
   * same `refresh`, so there is still one read of a contract and not two.
   *
   * It starts no process and it opens no view.
   */
  ensureLoaded(target: WorkspaceTarget | null): Promise<void>;
  refresh(): Promise<void>;
  check(): Promise<void>;
  /** Replace the whole selection with one subject, or clear it with null. */
  select(id: string | null): void;
  /**
   * Add a subject to the selection, or take it out again.
   *
   * This is what a ⌘-click reaches. It appends rather than inserting in any
   * sorted position, so the list stays in the order the person built it.
   */
  toggleSelected(id: string): void;
  /**
   * Replace the whole selection with these subjects, in this order.
   *
   * The picker uses it so that what a person picked in the native menu and
   * what the view shows selected cannot disagree about what was aimed. It is
   * presentation and nothing else, like every other write in this file.
   */
  selectAll(ids: readonly string[]): void;
  /**
   * The subject the prose panel draws, being the LAST one picked.
   *
   * One panel and several selected subjects needs a rule, and the rule is
   * recency: the thing a person just clicked is the thing they are reading
   * about. The other selected rows keep their selected mark, so nothing about
   * the wider selection is hidden by the panel showing one of them.
   */
  focused(): string | null;
  /**
   * PHASE 160 — read one repository's map model from main, or read it again.
   *
   * Idempotent while a read is in flight, so the tab body, the cockpit and a
   * finished check can all ask without stacking calls. It starts no process:
   * `arch:map` composes over the fact base the checkers already build, and
   * the one scan behind it is main's own, shared with the checker path.
   */
  loadMap(repoPath: string): Promise<void>;
  /** The held entry for one repository, or null before the first read. */
  mapFor(repoPath: string): ArchMapEntry | null;
  /** Compose the skeleton and open it as unsaved editor buffers. */
  draft(): Promise<void>;
  /** Put the seeding prompt on the clipboard and open the new session sheet. */
  seed(): void;
  /**
   * Subscribe to main's two pushes for as long as the view is mounted.
   *
   * A finished re-check re-reads rather than patching verdicts in place,
   * because `arch:checked` carries counts and not the rows: main is the one
   * place the verdicts live and a second assembly of them here would be a
   * second answer to the same question. NOTHING IS ANNOUNCED. No toast, no
   * badge, no dot on a session tab. A verdict that changed while a person was
   * reading a file is a number that moved, not an interruption.
   */
  subscribeEvents(): () => void;
  applyProgress(cwd: string, done: number, total: number): void;

  // READONLY on purpose. Every one of these hands back a live reference into
  // the store, and `NONE` below is one frozen array shared by every empty
  // answer. A caller that could push into either would be writing to state
  // through a getter, which is the kind of thing that is found weeks later.
  /** The verdicts in force, being the last check's if there was one. */
  verdicts(): readonly ArchVerdict[];
  /** The contract's components, in the contract's own order. */
  components(): readonly ArchComponent[];
  /** The contract's edges, which are the promises. */
  edges(): readonly ArchEdge[];
  /** Every row that would not load, with its file, its field and its reason. */
  problems(): readonly ArchProblem[];
  /** The strip's counts, reported by coverage so a total cannot flatter. */
  counts(): ArchCoverageCounts | null;
  /** One freshness row per component. */
  freshness(): readonly ArchFreshness[];
  /** A component's display name, or its id when it is not in the contract. */
  nameOf(componentId: string): string;
}

/**
 * Repositories whose map should be read AGAIN the moment the read in flight
 * settles (Phase 160). Module scope rather than store state because it is
 * bookkeeping about calls, not something any surface renders.
 */
const pendingMapReads = new Set<string>();

/**
 * The one empty array every "nothing yet" answer returns.
 *
 * NOT COSMETIC. A selector that builds a fresh `[]` on every call returns a
 * different reference each time, and `useSyncExternalStore` compares snapshots
 * with `Object.is`. React then re-renders, calls the selector again, gets
 * another new array, and the component loops until React aborts it with "the
 * result of getSnapshot should be cached". Every empty answer below hands back
 * this one frozen array instead.
 */
const NONE: readonly never[] = Object.freeze([]);

function errorText(err: unknown): string {
  if (err instanceof Error && err.message.length > 0) return err.message;
  return 'The contract could not be read.';
}

export const useArch = create<ArchViewState>((set, get) => ({
  target: null,
  status: 'idle',
  load: null,
  lastCheck: null,
  checking: false,
  progress: null,
  error: null,
  selected: NO_SELECTION,
  drafting: false,
  maps: {},

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

  async loadMap(repoPath) {
    const held = get().maps[repoPath];
    // One read in flight per repository. An ask that lands while one is out
    // is NOT dropped: the facts may have moved between the send and the
    // answer, so it queues exactly one follow up read, which runs when the
    // current one settles. A burst of pushes still folds to two reads.
    if (held?.status === 'loading') {
      pendingMapReads.add(repoPath);
      return;
    }
    const api = mapBridge();
    const patch = (entry: ArchMapEntry): void => {
      set((s) => ({ maps: { ...s.maps, [repoPath]: entry } }));
    };
    if (api === null) {
      patch({ status: 'error', model: held?.model ?? null, error: ARCH_MAP_NO_BRIDGE });
      return;
    }
    patch({ status: 'loading', model: held?.model ?? null, error: null });
    try {
      const model = await api.map({ cwd: repoPath });
      patch({ status: 'ready', model, error: null });
    } catch (err) {
      // The last good model stays on screen, with the failure named beside
      // it, for the reason the entry's comment gives.
      patch({
        status: 'error',
        model: get().maps[repoPath]?.model ?? null,
        error:
          err instanceof Error && err.message.length > 0
            ? err.message
            : ARCH_MAP_ERROR
      });
    }
    if (pendingMapReads.delete(repoPath)) {
      void get().loadMap(repoPath);
    }
  },

  mapFor(repoPath) {
    return get().maps[repoPath] ?? null;
  },

  async draft() {
    const target = get().target;
    const api = skeletonBridge();
    if (target === null || api === null || get().drafting) return;
    const cwd = localPathOf(target);
    if (cwd === null) return;
    set({ drafting: true });
    try {
      const result = await api.skeleton({ cwd });
      // The directories the drafts would be saved into. Creating them is the
      // ONLY write this gesture makes, `ARCH_DRAFT_BODY` in ./copy.ts names it
      // before the button is pressed, and without it the person's first Save
      // fails with ENOENT on a folder that has never existed. Main still writes no contract file: every byte of
      // the skeleton arrives as text and lands in an editor buffer that is
      // dirty from the moment it opens.
      await ensureDraftFolders(
        cwd,
        result.files.map((f) => f.path)
      );
      for (const file of result.files) {
        requestOpenFile({
          repoPath: cwd,
          relPath: file.path,
          path: `${cwd}/${file.path}`,
          mode: 'file',
          source: 'tree',
          preview: false,
          draft: file.content
        });
      }
    } catch (err) {
      useApp.getState().toast('error', errorText(err), { sticky: true });
    } finally {
      set({ drafting: false });
    }
  },

  seed() {
    const target = get().target;
    if (target === null) return;
    const cwd = localPathOf(target);
    if (cwd === null) return;
    const text = seedPromptText(cwd);
    void navigator.clipboard.writeText(text).then(
      () => {
        useApp.getState().toast('info', ARCH_SEED_COPIED);
      },
      () => {
        // A refused clipboard is not a reason to hide the sheet: the prompt is
        // on screen in the view and a person can select it by hand.
        useApp
          .getState()
          .toast(
            'error',
            `${ARCH_VIEW_TITLE} could not reach the clipboard. The prompt is on screen and can be selected.`
          );
      }
    );
    // THE ORDINARY NEW SESSION SHEET, and nothing else. This is the same
    // `setCreateOpen` the ⌘T chord and the dock's + button reach, so the
    // person picks the agent, the launch flags and the capture setting exactly
    // as they would for any other session. Tortie starts nothing here, and
    // nothing is typed into any session: sending a composed payload to a
    // running agent is a later slice's verb and this phase refuses it.
    useApp.getState().setCreateOpen(true);
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
          })
        : () => undefined;
    return () => {
      offChecked();
      offProgress();
      offMapUpdated();
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

  nameOf(componentId) {
    return (
      get().load?.components.find((c) => c.id === componentId)?.name ??
      componentId
    );
  }
}));

/**
 * Create the folders the drafts will be saved into, and say nothing when they
 * already exist.
 *
 * It uses `fs:createFolder`, the verb the Explorer's own New Folder command
 * already reaches, rather than anything new, and it goes through the typed
 * bridge rather than around it. A folder that is already there answers with a
 * rejection this swallows, because "it is already there" is the success case.
 *
 * THIS IS THE ONLY WRITE THE DRAFT GESTURE MAKES, and the control says so
 * before it is pressed. Without it a person's first Save fails on a folder
 * that has never existed, which reads as Tortie losing what they just wrote.
 */
async function ensureDraftFolders(
  cwd: string,
  relPaths: readonly string[]
): Promise<void> {
  const fs = gmuxBridge()?.fs;
  if (typeof fs?.createFolder !== 'function') return;
  const dirs = new Set<string>();
  for (const rel of relPaths) {
    const parts = rel.split('/');
    parts.pop();
    // Every ancestor, shallowest first, so `docs` exists before `docs/arch`.
    for (let i = 1; i <= parts.length; i += 1) {
      dirs.add(parts.slice(0, i).join('/'));
    }
  }
  for (const dir of [...dirs].sort((a, b) => a.length - b.length)) {
    try {
      await fs.createFolder({ root: cwd, path: dir });
    } catch {
      /* already there is the success case */
    }
  }
}
