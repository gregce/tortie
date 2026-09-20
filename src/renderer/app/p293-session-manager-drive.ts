/**
 * The Phase 293 harness drive, being the renderer half of
 * `build/p293/probe-p293.mjs`, the session manager's app run.
 *
 * ## What the probe does for real, and what this drive supplies
 *
 * Real: every click, every key, the sheet, its panels, the batch, the sessions
 * and their records, the tabs that open and close, and the far machine. The
 * probe presses the pointer and the keyboard over the DevTools protocol and
 * reads the sheet's DOM contract (build/p293/SPEC.md §2.14).
 *
 * Supplied, and each one is something a probe cannot do from outside:
 *
 *  1. THE MENU DOOR. `open(tab)` calls `runMenuAction`, the same function the
 *     native menu's click reaches through `menu:action`, because a probe
 *     cannot click a native menu bar item.
 *  2. THE NATIVE ROW MENU. `menuItemsFor(id)` answers the items the ellipsis
 *     would hand `ui:popupMenu`, as labels and `disabled`, and keeps them;
 *     `runMenuItem(id, label)` runs the KEPT item. A native menu runs the
 *     closure built when it was drawn, so running a kept item late is exactly
 *     how a stale pick is driven. `policyItemsFor(id)` is the policy's own
 *     menu for the same session from the same store, for the matrix.
 *  3. ONE HELD STATUS. A shell never asks for input (the shell oracle answers
 *     idle or working and never needs_input), so `hold(id)` keeps ONE real
 *     session's row reading needs_input, re-applied after each of main's
 *     pushes, exactly as the Phase 93 drive does.
 *  4. SET UP. A folder opened as a tab, a shell session created in it, and a
 *     tab closed, through the store's and the bridge's own verbs.
 *  5. ANY MENU ROW (the fix round). `menu(action)` calls `runMenuAction` with
 *     one of the three actions the fix round's arms press, for the same
 *     reason as the door: a probe cannot click a native menu bar item. The
 *     list is closed, so the drive cannot be asked to run anything else.
 *
 * Nothing here ends, removes, restores or restarts a session: every lifecycle
 * press in the probe is a real click on the sheet. The one exception is named
 * where it lives: `killOutOfBand(id)` ends one session through main's own
 * channel, as another window would, for the arm whose subject is a target that
 * ended between the confirmation and its call.
 *
 * ## How it is reached
 *
 * It assigns exactly one object to `window` and changes nothing else, in the
 * shape of ./p93-attention-drive.ts. The session manager's own modules are
 * imported when a method is called, never at load, so the lazy chunk the sheet
 * lives in is not pulled into the probe registry's.
 */

import type { Session } from '@shared/types';
import { targetKey, targetOfSession } from '@shared/workspace-target';
import { gmuxBridge } from '../bridge';
import { sortProjects, useApp } from '../state/store';
import type { MenuItemSpec } from '../state/store';
import { runMenuAction } from './menu-actions';
import { sessionMenuItems } from './session-actions';
import { statusVisual } from './status';

/** One menu item as a probe can compare it: what a person reads, and whether it is greyed. */
export interface P293Item {
  label: string;
  disabled: boolean;
}

/** One row of the grid or the Past list, read off the DOM. */
export interface P293Row {
  id: string;
  tab: 'managed' | 'past';
  status: string | null;
  group: string | null;
  tabOpen: string | null;
  stateLabel: string | null;
  primary: { verb: string | null; disabled: boolean; title: string | null; text: string } | null;
  checkbox: boolean;
  checked: boolean;
  created: string | null;
  messages: string | null;
  last: string | null;
}

/** Everything the probe reads between two gestures. */
export interface P293State {
  sheet: boolean;
  tab: string | null;
  counts: { managed: string | null; past: string | null };
  toolbar: { mode: string | null; height: number | null };
  titleHeight: number | null;
  rows: P293Row[];
  inline: { id: string | null; kind: string | null; text: string; error: string | null } | null;
  batch: {
    phase: string | null;
    heading: string;
    targets: { id: string; outcome: string | null; text: string }[];
    skipped: string | null;
    confirmDisabled: boolean | null;
  } | null;
  selectAll: { checked: boolean; indeterminate: boolean; label: string | null } | null;
  empty: string | null;
  foot: string | null;
  focus: { inSheet: boolean; desc: string; terminal: boolean };
  store: {
    sessions: { id: string; name: string; status: string; projectPath: string; machineId: string | null }[];
    past: string[];
    projects: { id: string; path: string; machineId: string | null }[];
    activeProjectId: string | null;
    activeSessionId: string | null;
    renamingSessionId: string | null;
    confirm: string | null;
    toasts: { kind: string; text: string }[];
    /** The layers the fix round's arms open around the sheet. */
    overview: boolean;
    attention: boolean;
  };
}

/** One matrix line, SPEC §8.1, for the rows this run can stand up. */
export interface P293MatrixRow {
  id: string;
  tab: 'managed' | 'past';
  status: string;
  machineId: string | null;
  groupDrawn: string | null;
  groupWant: string;
  stateDrawn: string | null;
  stateWant: string;
  primary: P293Row['primary'];
  checkbox: boolean;
  eligibility: string | null;
  /** The sheet's menu minus its own two rows, against the policy's, item for item. */
  menuSheet: P293Item[];
  menuPolicy: P293Item[];
}

declare global {
  interface Window {
    __p293?: P293Drive;
  }
}

/** The menu rows the fix round's arms press, and no other (the drive's item 5). */
export const P293_MENU_ROWS = ['show-overview', 'attention', 'end-session'] as const;

export interface P293Drive {
  open(tab: 'managed' | 'past'): Promise<P293State>;
  menu(action: (typeof P293_MENU_ROWS)[number]): Promise<P293State>;
  state(): Promise<P293State>;
  addProject(path: string): Promise<string | null>;
  createSession(spec: { path: string; name: string; machineId?: string }): Promise<string | null>;
  closeTab(path: string, machineId?: string | null): Promise<boolean>;
  hold(sessionId: string): Promise<boolean>;
  release(): Promise<boolean>;
  menuItemsFor(sessionId: string): Promise<P293Item[]>;
  policyItemsFor(sessionId: string): Promise<P293Item[]>;
  runMenuItem(sessionId: string, label: string): Promise<boolean>;
  killOutOfBand(sessionId: string): Promise<boolean>;
  matrix(): Promise<P293MatrixRow[]>;
}

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const q = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null =>
  root.querySelector<T>(sel);
const text = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const cssId = (id: string): string => (typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(id) : id);

function rowOf(el: HTMLElement, tab: 'managed' | 'past'): P293Row {
  const id = el.getAttribute('data-manage-row') ?? '';
  // The group's heading is the first row of the row's own tbody on Managed,
  // and the first child of the row's own section on Past when the project
  // filter names one project. The Past tab is otherwise ONE list with no
  // heading (the operator's ruling, 2026-09-19), so a Past row carries its
  // group on itself and that is what is read there.
  const group =
    tab === 'managed'
      ? (el.closest('tbody')?.querySelector('tr.sm-group') ?? null)
      : (el.closest('.sm-past-group')?.querySelector('[data-manage-group]') ?? null);
  const primaryEl = q<HTMLButtonElement>(`[data-manage-primary="${cssId(id)}"]`, el);
  const check = q<HTMLInputElement>(`[data-manage-check="${cssId(id)}"]`, el);
  return {
    id,
    tab,
    status: el.getAttribute('data-status'),
    group:
      tab === 'managed'
        ? (group?.getAttribute('data-manage-group') ?? null)
        : el.getAttribute('data-row-group'),
    tabOpen: group?.getAttribute('data-tab-open') ?? null,
    stateLabel: text(q('.sm-state-label', el)) || null,
    primary:
      primaryEl === null
        ? null
        : {
            verb: primaryEl.getAttribute('data-verb'),
            disabled: primaryEl.disabled,
            title: primaryEl.getAttribute('title'),
            text: text(primaryEl)
          },
    checkbox: check !== null,
    checked: check?.checked === true,
    created: text(q('.sm-col-created', el)) || null,
    messages: text(q('.sm-col-messages', el)) || null,
    last: text(q('.sm-col-last', el)) || null
  };
}

function describe(el: Element | null): string {
  if (el === null) return 'null';
  if (el === document.body) return 'body';
  const attrs = ['data-manage-name', 'data-manage-primary', 'data-sm', 'id', 'aria-label']
    .map((a) => (el.hasAttribute(a) ? `${a}=${el.getAttribute(a) ?? ''}` : null))
    .filter((a): a is string => a !== null);
  return `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? `.${el.className.split(' ').join('.')}` : ''}${attrs.length > 0 ? `[${attrs.join(' ')}]` : ''}`;
}

function readState(): P293State {
  const app = useApp.getState();
  const sheetEl = q('.modal.session-sheet');
  const toolbar = q('[data-sm="toolbar"]');
  const inlineEl = q('[data-manage-inline]') ?? q('.sm-inline-row');
  const batchEl = q('section.sm-batch');
  const selectAll = q<HTMLInputElement>('#sm-select-all');
  const active = document.activeElement;
  const activeProjectId = app.activeProjectId;
  const selected = q('.session-sheet [role="tab"][aria-selected="true"]');
  return {
    sheet: sheetEl !== null,
    tab: selected?.id ?? null,
    counts: {
      managed: text(q('#sm-tab-managed .sm-count')) || null,
      past: text(q('#sm-tab-past .sm-count')) || null
    },
    toolbar: {
      mode: toolbar?.getAttribute('data-mode') ?? null,
      height: toolbar === null ? null : toolbar.getBoundingClientRect().height
    },
    titleHeight: sheetEl === null ? null : (q('header.sm-title', sheetEl)?.getBoundingClientRect().height ?? null),
    rows: [
      ...[...document.querySelectorAll<HTMLElement>('tr.sm-row[data-manage-row]')].map((el) => rowOf(el, 'managed')),
      ...[...document.querySelectorAll<HTMLElement>('.sm-past-row[data-manage-row]')].map((el) => rowOf(el, 'past'))
    ],
    inline:
      inlineEl === null
        ? null
        : {
            id: inlineEl.getAttribute('data-manage-inline'),
            kind: inlineEl.getAttribute('data-kind'),
            text: text(inlineEl).slice(0, 400),
            error: text(q('[role="alert"]', inlineEl)) || null
          },
    batch:
      batchEl === null
        ? null
        : {
            phase: batchEl.getAttribute('data-phase'),
            heading: text(q('#sm-batch-title', batchEl)),
            targets: [...batchEl.querySelectorAll<HTMLElement>('[data-batch-target]')].map((li) => ({
              id: li.getAttribute('data-batch-target') ?? '',
              outcome: li.getAttribute('data-outcome'),
              text: text(li)
            })),
            skipped: text(q('.sm-batch-skipped', batchEl)) || null,
            confirmDisabled: q<HTMLButtonElement>('[data-sm="batch-confirm"]', batchEl)?.disabled ?? null
          },
    selectAll:
      selectAll === null
        ? null
        : { checked: selectAll.checked, indeterminate: selectAll.indeterminate, label: selectAll.getAttribute('aria-label') },
    empty: text(q('.sm-state-block')) || null,
    foot: text(q('[data-sm="foot"]')) || null,
    focus: {
      inSheet: sheetEl !== null && active !== null && sheetEl.contains(active),
      desc: describe(active),
      // The house reading of "a terminal owns the keyboard" (term-focus.ts):
      // inside a mount. Naming xterm's textarea here would be a sixth spelling
      // of the door p289-focus-terminal.test.ts keeps to one helper.
      terminal: active instanceof HTMLElement && active.closest('.gmux-terminal-mount') !== null
    },
    store: {
      sessions: app.sessions.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        projectPath: s.projectPath,
        machineId: s.machine?.id ?? null
      })),
      past: app.pastSessions.map((s) => s.id),
      projects: app.projects.map((p) => ({ id: p.id, path: p.path, machineId: p.machineId ?? null })),
      activeProjectId,
      activeSessionId: activeProjectId === null ? null : (app.activeSessionByProject[activeProjectId] ?? null),
      renamingSessionId: app.renamingSessionId ?? null,
      confirm: app.confirm?.title ?? null,
      toasts: app.toasts.map((t) => ({ kind: t.kind, text: t.text })),
      overview: app.overview !== null,
      attention: app.attentionOpen
    }
  };
}

const asItems = (items: (MenuItemSpec | 'sep')[]): P293Item[] =>
  items
    .filter((i): i is MenuItemSpec => i !== 'sep')
    .map((i) => ({ label: i.label, disabled: i.disabled === true }));

function sessionById(id: string): { session: Session; tab: 'managed' | 'past' } | null {
  const s = useApp.getState();
  const live = s.sessions.find((one) => one.id === id);
  if (live !== undefined) return { session: live, tab: 'managed' };
  const past = s.pastSessions.find((one) => one.id === id);
  return past === undefined ? null : { session: past, tab: 'past' };
}

/** The items each ellipsis was last drawn with, kept so a late pick runs THEM. */
const kept = new Map<string, (MenuItemSpec | 'sep')[]>();
/** The one subscription {@link P293Drive.hold} owns. */
let held: (() => void) | null = null;

export function registerP293SessionManagerDrive(): void {
  const drive: P293Drive = {
    async open(tab) {
      runMenuAction(tab === 'past' ? 'past-sessions' : 'manage-sessions');
      for (let i = 0; i < 40 && q('.modal.session-sheet') === null; i += 1) await wait(100);
      await wait(250);
      return readState();
    },

    async menu(action) {
      if (!(P293_MENU_ROWS as readonly string[]).includes(action)) return readState();
      runMenuAction(action);
      await wait(400);
      return readState();
    },

    async state() {
      return readState();
    },

    async addProject(path) {
      const project = await useApp.getState().addProjectPath(path);
      await wait(400);
      return project?.id ?? null;
    },

    async createSession({ path, name, machineId }) {
      const sessions = gmuxBridge()?.sessions;
      if (sessions === undefined) return null;
      const made = await sessions.create({
        name,
        projectPath: path,
        cwd: path,
        agent: 'shell',
        ...(machineId === undefined ? {} : { machineId })
      });
      for (let i = 0; i < 60; i += 1) {
        if (useApp.getState().sessions.some((one) => one.id === made.id)) break;
        await wait(150);
      }
      return made.id;
    },

    async closeTab(path, machineId = null) {
      const s = useApp.getState();
      const project = s.projects.find((p) => p.path === path && (p.machineId ?? null) === machineId);
      if (project === undefined) return false;
      s.closeProject(project.id);
      const confirm = useApp.getState().confirm;
      if (confirm === null) return false;
      useApp.getState().setConfirm(null);
      confirm.onConfirm();
      await wait(500);
      return !useApp.getState().projects.some((p) => p.id === project.id);
    },

    async hold(sessionId) {
      held?.();
      const apply = (): void => {
        const app = useApp.getState();
        const row = app.sessions.find((x) => x.id === sessionId);
        // Only over a LIVE status main pushed. A session that has ended reads
        // ended, whatever this hold was asked: a hold that painted an ended
        // row live again would put a session back under Running that main
        // says has stopped, and the batch arms would read a lie.
        if (row === undefined || (row.status !== 'running' && row.status !== 'idle')) return;
        useApp.setState({
          sessions: app.sessions.map((x) => (x.id === sessionId ? { ...x, status: 'needs_input' as const } : x))
        });
      };
      apply();
      held = useApp.subscribe(apply);
      await wait(150);
      return useApp.getState().sessions.some((x) => x.id === sessionId && x.status === 'needs_input');
    },

    async release() {
      held?.();
      held = null;
      await wait(100);
      return true;
    },

    async menuItemsFor(sessionId) {
      const found = sessionById(sessionId);
      if (found === null) return [];
      const { manageMenuItems } = await import('../session-manager/actions');
      const { buildManageProjection } = await import('../session-manager/projection');
      const s = useApp.getState();
      const projection = buildManageProjection({
        sessions: s.sessions,
        pastSessions: s.pastSessions,
        projects: sortProjects(s.projects, s.tabOrder),
        machineStates: s.machineStates,
        handbacks: s.handbacks,
        activity: s.sessionSheet?.activity ?? {},
        restoringIds: s.restoringIds,
        shellPathReady: s.shellPathReady,
        canRestore: s.canRestore(),
        canDiscard: s.canDiscard()
      });
      const row = [...projection.managed, ...projection.past]
        .flatMap((g) => g.rows)
        .find((r) => r.id === sessionId);
      if (row === undefined) return [];
      const items = manageMenuItems(row);
      kept.set(sessionId, items);
      return asItems(items);
    },

    async policyItemsFor(sessionId) {
      const found = sessionById(sessionId);
      return found === null ? [] : asItems(sessionMenuItems(found.session, sessionId));
    },

    async runMenuItem(sessionId, label) {
      const item = (kept.get(sessionId) ?? []).find(
        (i): i is MenuItemSpec => i !== 'sep' && i.label === label
      );
      if (item === undefined || item.disabled === true) return false;
      item.run();
      await wait(300);
      return true;
    },

    async killOutOfBand(sessionId) {
      const sessions = gmuxBridge()?.sessions;
      if (sessions === undefined) return false;
      try {
        await sessions.kill(sessionId);
        return true;
      } catch {
        return false;
      }
    },

    async matrix() {
      const { batchEligibility } = await import('../session-manager/batch-end');
      const { sessionActionGates } = await import('../state/resume');
      const { sessionGateEnv } = await import('./session-actions');
      const s = useApp.getState();
      const known = new Set(s.machineStates.map((m) => m.id));
      const drawn = new Map(readState().rows.map((r) => [r.id, r]));
      const out: P293MatrixRow[] = [];
      for (const [tab, list] of [
        ['managed', s.sessions],
        ['past', s.pastSessions]
      ] as const) {
        for (const session of list) {
          const row = drawn.get(session.id);
          const gates = sessionActionGates(session, session.status, sessionGateEnv(session.id));
          const gone = session.machineGone;
          const sheetItems = await drive.menuItemsFor(session.id);
          out.push({
            id: session.id,
            tab,
            status: session.status,
            machineId: session.machine?.id ?? null,
            groupDrawn: row?.group ?? null,
            groupWant:
              gone !== undefined
                ? `!gone:${gone.label}:${session.projectPath}`
                : targetKey(targetOfSession(session) ?? { machineId: 'local', path: session.projectPath }),
            stateDrawn: row?.stateLabel ?? null,
            stateWant: statusVisual(session.status, session).label,
            primary: row?.primary ?? null,
            checkbox: row?.checkbox ?? false,
            eligibility: tab === 'managed' ? batchEligibility(session, gates, (id) => known.has(id)) : null,
            // The sheet's own two rows and their separator lead its menu.
            menuSheet: sheetItems.filter((i) => i.label !== 'Session details' && i.label !== 'Go to session'),
            menuPolicy: await drive.policyItemsFor(session.id)
          });
        }
      }
      return out;
    }
  };
  window.__p293 = drive;
}
