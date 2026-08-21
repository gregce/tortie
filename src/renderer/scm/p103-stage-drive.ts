/**
 * The Phase 103 harness drive, being how the three groups, the two verbs and
 * every sentence a write can leave are photographed and read back.
 *
 * ## What the phase claims, and what this file measures
 *
 * The claim is that a person looking at the Source Control panel for a folder
 * on another machine can choose what goes into the next commit over there.
 * This drive opens such a tab, reads what the panel drew, and can press a
 * group's button or one row's button and hand the probe what the panel drew
 * afterwards.
 *
 * ## Two modes, and the difference between them is the whole point
 *
 *  1. `seed` supplies the answer. Nothing is signed in to the machine it
 *     names, no far side is contacted and no git command runs anywhere. What
 *     is proven is what Tortie DRAWS for such an answer, which is how a file
 *     in Staged and in Changes at once gets photographed without arranging one
 *     over a link.
 *  2. With `seed` left out, the tab is opened against a machine the harness has
 *     already confirmed, and every read and every write crosses for real. That
 *     is the mode `build/probe-p103-shot.mjs` uses for the photographs the
 *     phase's evidence items ask for.
 *
 * The result carries `seeded`, so a report can never present a drawing of a
 * supplied answer as a drawing of a real one.
 *
 * ## What it does NOT prove
 *
 * IT PRESSES BUTTONS AND IT CANNOT OPEN A NATIVE MENU. The row menu is a
 * macOS menu drawn by the main process through the `ui:popupMenu` bridge, so
 * no window capture can photograph it and no click here can open it. What this
 * drive reads instead is the exact item list the row would send, through
 * `menuOfRow`, which reads the same code path the right click uses. A
 * photograph of the menu itself is taken by hand and recorded in the phase
 * report.
 *
 * ## Why the seeded entry is written before the tab is opened
 *
 * `RemoteScmSection` calls `ensure` when it mounts, and `ensure` reads a
 * target that has never been read. An entry whose `readAt` is already above
 * zero is one it leaves alone, so seeding first is what keeps the panel from
 * replacing these rows with the sentence saying that machine did not answer.
 *
 * ## Why no sentence this phase writes appears in this file
 *
 * This module ships inside the production renderer bundle, so any sentence it
 * names is greppable in `out/renderer`. The caller supplies the words it wants
 * looked for, through `marks`, exactly as `./p97-untracked-drive.ts` does.
 */

import type { Project } from '@shared/types';
import type {
  MachineIndexWriteOutcome,
  MachineReviewFile,
  MachineStateView
} from '@shared/ipc';
import { targetKey, type WorkspaceTarget } from '@shared/workspace-target';
import { useApp } from '../state/store';
import {
  remoteChangesAvailable,
  remoteIndexWriteAvailable,
  useRemoteChanges
} from './remote-changes';

/** One row the caller wants seeded, in the shape main answers with. */
export interface P103SeedFile {
  path: string;
  origPath?: string | null;
  status?: string;
  indexState?: string;
  worktreeState?: string;
}

export interface P103StageSpec {
  /** The machine id the injected tab claims. Defaults to `p103far`. */
  machineId?: string;
  /** The label that machine reports. Defaults to `Studio`. */
  label?: string;
  /** The folder ON THAT MACHINE. Defaults to the active project's path. */
  path?: string;
  /** Milliseconds to let the panel settle before it is read. Defaults to 900. */
  settleMs?: number;
  /**
   * The answer to put in the store instead of reading one.
   *
   * Leave it out to read the real machine. Its presence is reported back as
   * `seeded`, so no report can mistake one mode for the other.
   */
  seed?: {
    repoPath?: string;
    files?: P103SeedFile[];
    untracked?: P103SeedFile[];
    note?: string | null;
  };
  /**
   * Press one button before reading the panel.
   *
   *  - `group` presses the button on the named group's row.
   *  - `row` presses the button on the first row of the named group.
   *
   * Left out, nothing is pressed and the panel is read as it stands.
   */
  press?: { kind: 'group' | 'row'; group: 'staged' | 'changes' | 'untracked' };
  /** Read the menu the first row of this group would open. */
  menuOf?: 'staged' | 'changes' | 'untracked';
  /** Sentences the caller wants looked for on screen. */
  marks?: readonly string[];
}

/** One group as the panel drew it. */
export interface P103GroupReading {
  label: string | null;
  count: number | null;
  /** The words on the group's own button, or null when it drew none. */
  button: string | null;
}

/** One row as the panel drew it. */
export interface P103RowReading {
  group: string | null;
  name: string;
  badge: string;
  /** The words on the row's own button, or null when it drew none. */
  button: string | null;
  /** The row's tooltip, which is the refusal sentence on a conflicted row. */
  title: string | null;
}

export interface P103StageResult {
  ok: boolean;
  why?: string;
  /** True when this build can read what changed on another machine. */
  available?: boolean;
  /** True when this build carries the two verbs. */
  writable?: boolean;
  /** True when the answer was supplied rather than read from a machine. */
  seeded?: boolean;
  machineId?: string;
  label?: string;
  path?: string;
  /** What was pressed, or null. */
  pressed?: string | null;
  /** The number in the section header. */
  headerCount?: number | null;
  /** The group rows, in the order the panel drew them. */
  groups?: P103GroupReading[];
  /** Every row, in the order the panel drew them. */
  rows?: P103RowReading[];
  /** The sentence under the rows that the last write left, or null. */
  writeNote?: string | null;
  /** The word main answered for the last write, or null. */
  writeOutcome?: MachineIndexWriteOutcome | null;
  /** The sentence main refused the last write with, or null. */
  writeRefusal?: string | null;
  /** The verb of the last write, or null. */
  writeVerb?: string | null;
  /** The item labels the named group's first row would put in its menu. */
  menu?: string[] | null;
  /** The marks the caller asked about that ARE on screen. */
  marksOnScreen?: string[];
  /** How many marks the caller asked about. */
  marksGiven?: number;
}

declare global {
  interface Window {
    __gmuxP103Stage?: (spec?: P103StageSpec) => Promise<P103StageResult>;
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

function textOf(el: Element | null | undefined): string {
  return (el?.textContent ?? '').trim();
}

function numberOf(el: Element | null | undefined): number | null {
  const raw = textOf(el);
  if (raw === '') return null;
  const n = Number(raw.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** A seeded row, filled out into the shape the contract carries. */
function fileOf(one: P103SeedFile): MachineReviewFile {
  return {
    path: one.path,
    origPath: one.origPath ?? null,
    status: (one.status ?? 'M') as MachineReviewFile['status'],
    indexState: (one.indexState ??
      '.') as unknown as MachineReviewFile['indexState'],
    worktreeState: (one.worktreeState ??
      'M') as unknown as MachineReviewFile['worktreeState']
  };
}

/** The Source Control panel as it stands right now, read out of the document. */
function readPanel(marks: readonly string[]): {
  headerCount: number | null;
  groups: P103GroupReading[];
  rows: P103RowReading[];
  writeNote: string | null;
  marksOnScreen: string[];
  marksGiven: number;
} {
  const section = document.querySelector('[data-section-root="changes"]');
  const groups: P103GroupReading[] = [];
  for (const row of Array.from(
    section?.querySelectorAll('.scm-group-row') ?? []
  )) {
    groups.push({
      label: textOf(row.querySelector('.scm-group-label')) || null,
      count: numberOf(row.querySelector('.scm-group-count')),
      button:
        row.querySelector('.scm-group-action')?.getAttribute('title') ?? null
    });
  }
  const rows: P103RowReading[] = [];
  for (const row of Array.from(section?.querySelectorAll('.scm-hfile') ?? [])) {
    rows.push({
      group: row.getAttribute('data-scm-group'),
      name: textOf(row.querySelector('.scm-row-name')),
      badge: textOf(row.querySelector('.scm-badge')),
      button:
        row.querySelector('.scm-row-actions button')?.getAttribute('title') ??
        null,
      title: row.getAttribute('title')
    });
  }
  const onScreen = document.body.innerText;
  return {
    headerCount: numberOf(section?.querySelector('.section-count')),
    groups,
    rows,
    writeNote:
      textOf(document.querySelector('[data-scm-write-note="1"]')) || null,
    marksGiven: marks.length,
    marksOnScreen: marks.filter((mark) => onScreen.includes(mark))
  };
}

/** The first row of one group, or null. */
function rowOf(group: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `.scm-hfile[data-scm-group="${group}"]`
  );
}

export function registerP103StageDrive(): void {
  window.__gmuxP103Stage = async (
    spec?: P103StageSpec
  ): Promise<P103StageResult> => {
    const machineId = spec?.machineId ?? 'p103far';
    const label = spec?.label ?? 'Studio';
    const settleMs = spec?.settleMs ?? 900;
    const marks = spec?.marks ?? [];

    // PHASE 103 FIX ROUND. A tab opened through `projects.addRemote` a moment
    // ago is not always the active one yet, and on a fresh profile there is no
    // local project at all. The old code refused in both cases and the probe
    // photographed the Home screen. A caller that names the folder needs no
    // local project, because the folder is the only thing the local one was
    // read for.
    const localProject = useApp.getState().activeProject();
    const path = spec?.path ?? localProject?.path ?? null;
    if (path === null) {
      return {
        ok: false,
        why: 'no active project and no path was given, so there is no folder'
      };
    }
    const target: WorkspaceTarget = { machineId, path };
    const key = targetKey(target);

    const machineRow: MachineStateView = {
      id: machineId,
      label,
      color: 'magenta',
      link: 'connected',
      everAnswered: true,
      lastAnsweredAt: Date.now(),
      detail: null
    };
    const injectedProject: Project = {
      id: `${machineId}-p103`,
      path,
      name: `${path.split('/').filter(Boolean).pop() ?? path} on ${label}`,
      machineId
    };

    if (spec?.seed !== undefined) {
      const files = (spec.seed.files ?? []).map(fileOf);
      const untracked = (spec.seed.untracked ?? []).map(fileOf);
      useRemoteChanges.setState((now) => ({
        byTarget: {
          ...now.byTarget,
          [key]: {
            machineId,
            path,
            repoPath: spec.seed?.repoPath ?? path,
            files,
            total: files.length,
            untracked,
            untrackedTotal: untracked.length,
            note: spec.seed?.note ?? null,
            notRepo: false,
            loading: false,
            refreshing: false,
            failed: false,
            readAt: Date.now(),
            writing: false,
            writeVerb: null,
            writeOutcome: null,
            writeRefusal: null
          }
        }
      }));
    }

    // A tab opened the real way, through `projects.addRemote`, is preferred
    // over an injected one. Injecting a second row for a folder that is
    // already open would draw two tabs for one folder, and the store is keyed
    // by the pair of the machine and the path, so both tabs would read the
    // same entry and a reader could not tell which one was photographed.
    const open = useApp
      .getState()
      .projects.find(
        (one) => one.machineId === machineId && one.path === path
      );
    if (open === undefined) {
      useApp.setState({
        projects: [...useApp.getState().projects, injectedProject],
        machineStates: [
          ...useApp
            .getState()
            .machineStates.filter((one) => one.id !== machineId),
          machineRow
        ]
      });
    }
    useApp.getState().setActiveProject(open?.id ?? injectedProject.id);
    useApp.getState().setSidebarView('scm');
    await wait(settleMs);

    // What was pressed, if anything. The button is found by the same two data
    // attributes a person's pointer would land on, so this presses the product
    // rather than calling the store behind it.
    let pressed: string | null = null;
    if (spec?.press !== undefined) {
      const { kind, group } = spec.press;
      const button =
        kind === 'group'
          ? document.querySelector<HTMLButtonElement>(
              `.scm-group-row[data-scm-group="${group}"] .scm-group-action`
            )
          : (rowOf(group)?.querySelector<HTMLButtonElement>(
              '.scm-row-actions button'
            ) ?? null);
      if (button === null) {
        pressed = `no ${kind} button on ${group}`;
      } else {
        pressed = `${kind} ${group}: ${button.getAttribute('title') ?? ''}`;
        button.click();
        // Two round trips over a link, being the write and the read after it.
        await wait(settleMs * 4);
      }
    }

    // The item list the first row of one group would put in its menu.
    //
    // IT DOES NOT OPEN THE MENU AND IT MUST NOT. `setMenu` pops a real macOS
    // menu through the `ui:popupMenu` bridge, which takes an OS mouse grab and
    // would hang the harness with a menu nobody can dismiss. So the store's own
    // `setMenu` is swapped for one that records its argument, the row's real
    // right click handler runs, and the original is put back. What is read is
    // the exact list a person's right click would have opened, composed by the
    // product's own code path and not by this file.
    let menu: string[] | null = null;
    if (spec?.menuOf !== undefined) {
      const row = rowOf(spec.menuOf);
      if (row !== null) {
        const real = useApp.getState().setMenu;
        let seen: string[] | null = null;
        useApp.setState({
          setMenu: (shown) => {
            seen = (shown?.items ?? []).map((item) =>
              item === 'sep' ? '-' : item.label
            );
          }
        });
        // The row read `setMenu` at its last render, so the swap has to reach
        // the screen before the click is sent.
        await wait(200);
        row.dispatchEvent(
          new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
        );
        await wait(120);
        useApp.setState({ setMenu: real });
        await wait(120);
        menu = seen;
      }
    }

    const entry = useRemoteChanges.getState().byTarget[key];
    return {
      ok: true,
      available: remoteChangesAvailable(),
      writable: remoteIndexWriteAvailable(),
      seeded: spec?.seed !== undefined,
      machineId,
      label,
      path,
      pressed,
      menu,
      writeOutcome: entry?.writeOutcome ?? null,
      writeVerb: entry?.writeVerb ?? null,
      writeRefusal: entry?.writeRefusal ?? null,
      ...readPanel(marks)
    };
  };
}
