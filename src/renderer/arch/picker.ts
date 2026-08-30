/**
 * THE PICKER — one chord inside a session, a native menu, no view switch
 * (Phase 64).
 *
 * ## Why it is a menu and not a panel
 *
 * The pointing verb only beats typing a scope by hand when it never leaves the
 * terminal. That is research 49's own finding against the Aiming Canvas, and
 * it is why this surface opens over the session a person is already in,
 * changes no view, moves no focus except into the pane the text lands in, and
 * closes itself. A panel would be a second place to be.
 *
 * ## It is NATIVE, and that is not a preference
 *
 * CLAUDE.md and DESIGN.md section 3 both say context menus are native macOS
 * menus through `Menu.popup` and never drawn in the DOM. This module composes
 * a `MenuSpec` and hands it to the store's `setMenu`, which is the one door on
 * to `ui:popupMenu` that every other trigger surface in the product already
 * uses. There is no markup in this file and there never may be.
 *
 * The broken-target confirmation is a SECOND NATIVE MENU for the same reason.
 * An in-page sheet would be the DOM menu by another name, and the one dialog
 * channel this product has, `sessions:askRestoreProject`, is a purpose-built
 * question about restoring a project rather than a general confirm.
 *
 * ## The order of operations, and why the guard is asked twice
 *
 * Open, compose, confirm if the target is broken, deliver. `canDeliverTo` is
 * asked before the menu opens so a session that cannot be aimed says why
 * instead of offering rows that would fail, and `deliverPayload` asks it again
 * at the moment of the write, because a native menu can stay open across a
 * session ending and the first answer is stale by exactly that long.
 *
 * ## It never presses Return
 *
 * The block lands in the prompt and stops there. A person reads it and sends
 * it. That is the whole difference between handing an agent a scope and
 * starting a turn on their behalf.
 */

import { archViewGapId, archViewGapIdToChannel } from '@shared/arch-ids';
import type { ArchComposePayloadResult } from '@shared/ipc';
import { localPathOf, targetOfProject } from '@shared/workspace-target';
import type { MenuItemSpec, MenuSpec } from '../menus/spec';
import { useApp } from '../state/store';
import { useSettingsStore } from '../settings/settings-store';
import {
  AIM_BROKEN_TARGET_BODY,
  AIM_BROKEN_TARGET_CANCEL,
  AIM_BROKEN_TARGET_SEND,
  AIM_COMPOSE_FAILED,
  AIM_GROUP_BROKEN,
  AIM_GROUP_GAPS,
  AIM_GROUP_PARTS,
  AIM_NOTHING_SELECTED,
  AIM_NO_COMPOSER,
  AIM_NO_CONTRACT,
  AIM_NOT_DELIVERED,
  AIM_PICKER_SUBLABEL,
  AIM_PICKER_TITLE,
  aimBrokenTargetTitle,
  aimLanded
} from './aim-copy';
import { archBridge, type ArchBridgeApi } from './bridge';
import { verdictWord } from './copy';
import { canDeliverTo, deliverPayload } from './deliver';
import { useArch } from './store';

// ---------------------------------------------------------------------------
// The composer's channel, feature detected
// ---------------------------------------------------------------------------

/**
 * The composer, or null when this build cannot compose one.
 *
 * Feature detected in the shape `./bridge.ts` uses for every other arch
 * method, for the doctrine it states in full: an older preload leaves the
 * surface honest rather than crashing it.
 */
function composeApi(): ArchBridgeApi | null {
  const api = archBridge();
  return typeof api?.composePayload === 'function' ? api : null;
}

/**
 * THE ONE PLACE THE VIEW'S SUBJECT IDS BECOME THE CHANNEL'S THREE LISTS.
 *
 * The Architecture view keys everything on ONE opaque string, being the
 * verdict's own `subjectId` vocabulary: `component:<id>`, `edge:<id>` and
 * `gap:<componentId>:<n>`. The channel takes three separate lists instead,
 * because the composer treats the three kinds differently and a single list
 * would make it re-derive the kind it was already told.
 *
 * TWO SPELLINGS OF A GAP EXIST AND THIS FUNCTION IS THE SEAM BETWEEN THEM.
 * The view has written `gap:<componentId>:<n>` since Phase 63, and it is what
 * `ArchView.tsx` puts on every row of the gap strip and what the prose panel
 * parses back. Phase 64's composer takes `component:<id>#gap:<n>`, because that
 * is the shape the checkers already stamp on every other subject id. NEITHER
 * SPELLING IS WRITTEN OUT IN THIS FILE. Both, and the one translation between
 * them, are in `src/shared/arch-ids.ts`, which both processes name, so a later
 * round that wants one spelling has one file to change rather than five call
 * sites to find.
 */
export function splitSubjects(ids: readonly string[]): {
  componentIds: string[];
  gapIds: string[];
  verdictIds: string[];
} {
  const componentIds: string[] = [];
  const gapIds: string[] = [];
  const verdictIds: string[] = [];
  for (const id of ids) {
    if (id.startsWith('component:')) {
      componentIds.push(id.slice('component:'.length));
      continue;
    }
    if (id.startsWith('gap:')) {
      // A gap id with no index, or with an index or a part id the format does
      // not allow, is not a gap. It is dropped rather than sent as something
      // the composer would have to guess at.
      const channelId = archViewGapIdToChannel(id);
      if (channelId !== null) gapIds.push(channelId);
      continue;
    }
    // Everything else is a verdict subject id, exactly as the checkers
    // stamped it, which is what the channel asks for.
    verdictIds.push(id);
  }
  return { componentIds, gapIds, verdictIds };
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

/** A disabled row that is a heading rather than a choice. */
function heading(label: string): MenuItemSpec {
  return { label, disabled: true, run: () => undefined };
}

/** A disabled row carrying one sentence, for every state with no choices. */
function note(text: string): MenuItemSpec {
  return { label: text, disabled: true, run: () => undefined };
}

/**
 * The whole menu, as data.
 *
 * Exported so a test can read the rows without a native menu, which is the
 * only way to assert them at all: a real macOS popup cannot be read or
 * photographed from outside the app, measured three times over in Phases 119,
 * 152 and 153.
 */
export function buildAimMenu(
  at: { x: number; y: number },
  onPick: (subjectIds: readonly string[]) => void
): MenuSpec {
  const arch = useArch.getState();
  const items: (MenuItemSpec | 'sep')[] = [
    { label: AIM_PICKER_TITLE, sublabel: AIM_PICKER_SUBLABEL, disabled: true, run: () => undefined },
    'sep'
  ];

  const components = arch.components();
  const verdicts = arch.verdicts();
  const selected = arch.selected;

  if (components.length === 0) {
    items.push(note(AIM_NO_CONTRACT));
    return { x: at.x, y: at.y, items };
  }

  // The current selection first, when there is one, because a person who has
  // been choosing rows in the view and then reaches for the chord means that
  // selection and should not have to rebuild it here.
  if (selected.length > 1) {
    const ids = [...selected];
    items.push(
      {
        label: `Aim the ${String(ids.length)} selected`,
        run: () => {
          onPick(ids);
        }
      },
      'sep'
    );
  }

  items.push(heading(AIM_GROUP_PARTS));
  for (const c of components) {
    const id = `component:${c.id}`;
    items.push({
      label: c.name,
      run: () => {
        onPick([id]);
      }
    });
  }

  const broken = verdicts.filter(
    (v) => v.status === 'divergent' || v.status === 'absent'
  );
  if (broken.length > 0) {
    items.push('sep', heading(AIM_GROUP_BROKEN));
    for (const v of broken) {
      items.push({
        label: v.subjectId,
        hint: verdictWord(v.status),
        run: () => {
          onPick([v.subjectId]);
        }
      });
    }
  }

  const gaps = components.flatMap((c) =>
    (c.gaps ?? []).map((text, i) => ({ c, text, i }))
  );
  if (gaps.length > 0) {
    items.push('sep', heading(AIM_GROUP_GAPS));
    for (const { c, text, i } of gaps) {
      items.push({
        label: `${c.name}: ${text}`,
        run: () => {
          onPick([archViewGapId(c.id, i)]);
        }
      });
    }
  }

  return { x: at.x, y: at.y, items };
}

/**
 * The broken-target question, as its own native menu.
 *
 * Two rows and a title. The affirmative is spelled out rather than being an OK
 * button, so a person reading only the row they are about to click still knows
 * what it does.
 */
export function buildBrokenTargetMenu(
  at: { x: number; y: number },
  brokenCount: number,
  onConfirm: () => void
): MenuSpec {
  return {
    x: at.x,
    y: at.y,
    items: [
      {
        label: aimBrokenTargetTitle(brokenCount),
        sublabel: AIM_BROKEN_TARGET_BODY,
        disabled: true,
        run: () => undefined
      },
      'sep',
      {
        label: AIM_BROKEN_TARGET_SEND,
        run: onConfirm
      },
      { label: AIM_BROKEN_TARGET_CANCEL, run: () => undefined }
    ]
  };
}

// ---------------------------------------------------------------------------
// Where the menu appears
// ---------------------------------------------------------------------------

/**
 * The top left of the pane the person is in, or the top left of the window.
 *
 * A chord carries no pointer, so the anchor is the surface the text is going
 * into. `[data-split-leaf]` is the same attribute the split surface, the split
 * drop zone and the drop router's hit test already read, so there is one way
 * to find a session's rectangle rather than a second one here.
 */
export function anchorFor(sessionId: string): { x: number; y: number } {
  // A session id is a manifest UUID, so it needs no escaping, and the
  // characters that would need it cannot occur in one. The guard is here
  // anyway, because a selector built out of a value is exactly the shape that
  // stops being safe the day somebody widens what the value can hold.
  if (!/^[A-Za-z0-9_-]+$/.test(sessionId)) return { x: 24, y: 56 };
  const leaf = document.querySelector<HTMLElement>(
    `[data-split-leaf="${sessionId}"]`
  );
  if (leaf === null) return { x: 24, y: 56 };
  const r = leaf.getBoundingClientRect();
  return { x: Math.round(r.left + 12), y: Math.round(r.top + 12) };
}

// ---------------------------------------------------------------------------
// The verb
// ---------------------------------------------------------------------------

/**
 * Open the picker over the session the person is in.
 *
 * Everything it can refuse, it refuses as ONE disabled row carrying the
 * sentence that says what would fix it, rather than as a menu of rows that
 * would all fail or as nothing happening at all.
 */
export async function openAimPicker(): Promise<void> {
  const app = useApp.getState();
  const target = canDeliverTo(app.activeSession()?.id ?? null);
  const at = anchorFor(app.activeSession()?.id ?? '');

  if (!target.ok) {
    app.setMenu({ x: at.x, y: at.y, items: [note(target.reason)] });
    return;
  }

  const project = app.activeProject();
  const workspace = targetOfProject(project ?? null);
  const cwd = workspace === null ? null : localPathOf(workspace);
  if (cwd === null) {
    app.setMenu({ x: at.x, y: at.y, items: [note(AIM_NO_CONTRACT)] });
    return;
  }
  if (composeApi() === null) {
    app.setMenu({ x: at.x, y: at.y, items: [note(AIM_NO_COMPOSER)] });
    return;
  }

  // The scan carries the registry's own launchable answer, and the picker is
  // where it is asked for. Both calls are idempotent; Phase 164 split the
  // scan request out of `init`, so the picker asks for it by name.
  useSettingsStore.getState().init();
  useSettingsStore.getState().ensureScan();
  // NO VIEW SWITCH. This reads the contract into the store the Architecture
  // view also reads from; it does not open that view and it does not move the
  // sidebar. A person who never opens Architecture still gets rows here.
  await useArch.getState().ensureLoaded(workspace);

  const sessionId = target.session.id;
  app.setMenu(
    buildAimMenu(at, (subjectIds) => {
      void aim(sessionId, cwd, subjectIds, at);
    })
  );
}

/** Aim the current selection, which is what the Architecture view's own control uses. */
export async function aimSelection(): Promise<void> {
  const app = useApp.getState();
  const at = anchorFor(app.activeSession()?.id ?? '');
  const selected = [...useArch.getState().selected];
  if (selected.length === 0) {
    app.toast('info', AIM_NOTHING_SELECTED);
    return;
  }
  const target = canDeliverTo(app.activeSession()?.id ?? null);
  if (!target.ok) {
    app.toast('info', target.reason);
    return;
  }
  const workspace = targetOfProject(app.activeProject() ?? null);
  const cwd = workspace === null ? null : localPathOf(workspace);
  if (cwd === null) {
    app.toast('info', AIM_NO_CONTRACT);
    return;
  }
  await aim(target.session.id, cwd, selected, at);
}

/**
 * Compose, confirm if the target is broken, deliver, say one sentence.
 *
 * The selection in the store is moved to what was picked, so the view and the
 * payload cannot disagree about what was aimed. That is presentation only: it
 * sets no session's status and writes nothing to the sessions slice.
 */
async function aim(
  sessionId: string,
  cwd: string,
  subjectIds: readonly string[],
  at: { x: number; y: number }
): Promise<void> {
  const app = useApp.getState();
  const api = composeApi();
  if (api === null) {
    app.toast('error', AIM_NO_COMPOSER);
    return;
  }
  useArch.getState().selectAll(subjectIds);

  let payload: ArchComposePayloadResult;
  try {
    payload = await api.composePayload({ cwd, ...splitSubjects(subjectIds) });
  } catch {
    app.toast('error', AIM_COMPOSE_FAILED, { sticky: true });
    return;
  }
  const text = typeof payload.text === 'string' ? payload.text : '';
  if (text.length === 0) {
    app.toast('error', AIM_NOT_DELIVERED);
    return;
  }

  if (payload.brokenTarget) {
    app.setMenu(
      // The count is what MAIN found broken, not how many things were
      // selected. A person who picked four parts and is told four of them
      // match no files, when one does, has been told something false about
      // their own repository.
      buildBrokenTargetMenu(at, payload.brokenTargetIds.length, () => {
        send(sessionId, text, subjectIds.length);
      })
    );
    return;
  }
  send(sessionId, text, subjectIds.length);
}

/** The write itself, and the one sentence after it. */
function send(sessionId: string, text: string, subjects: number): void {
  const app = useApp.getState();
  const result = deliverPayload(sessionId, text);
  if (!result.ok) {
    app.toast('info', result.reason);
    return;
  }
  app.toast('info', aimLanded(result.session.name, subjects));
}
