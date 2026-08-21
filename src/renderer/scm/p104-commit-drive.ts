/**
 * The Phase 104 harness drive, being how the commit box, its standing line,
 * every reason it is disabled and every sentence a commit can leave are
 * photographed and read back.
 *
 * ## What the phase claims, and what this file measures
 *
 * The claim is that a person looking at the Source Control panel for a folder
 * on another machine can type a message, press one button, and have git commit
 * over there with their own hooks and their own signing configuration running
 * on that machine. This drive opens such a tab, types into the real textarea,
 * presses the real button, and hands the probe what the panel drew afterwards.
 *
 * ## Two modes, and the difference between them is the whole point
 *
 *  1. `seed` supplies the answer. Nothing is signed in to the machine it names,
 *     no far side is contacted and no git command runs anywhere. What is proven
 *     is what Tortie DRAWS for such an answer, which is how a disabled reason
 *     for a conflicted file gets photographed without arranging a merge over a
 *     link.
 *  2. With `seed` left out, the tab is opened against a machine the harness has
 *     already confirmed, and every read and every write crosses for real. That
 *     is the mode `build/probe-p104-shot.mjs` uses for the photographs the
 *     phase's evidence items ask for.
 *
 * The result carries `seeded`, so a report can never present a drawing of a
 * supplied answer as a drawing of a real one.
 *
 * ## What it does NOT prove
 *
 * IT MEASURES NO MILLISECONDS. A window, a render and a settle wait sit between
 * every press and every reading here, so any number this file could produce
 * would be about the harness rather than about the link. Every timing the phase
 * reports comes from `build/probe-p104-commit.mjs`, which drives the channel
 * directly.
 *
 * IT CANNOT SEE THE FAR SIDE. Nothing in this file runs a git command anywhere.
 * The probe reads that machine's own porcelain and its own log before and after
 * each press, and that reading is what makes a row evidence rather than a
 * report of what the panel says about itself.
 *
 * IT PRESSES BUTTONS AND IT TYPES. It cannot open a native menu, and the commit
 * box has none.
 *
 * ## Why the seeded entry is written before the tab is opened
 *
 * `RemoteScmSection` calls `ensure` when it mounts, and `ensure` reads a target
 * that has never been read. An entry whose `readAt` is already above zero is
 * one it leaves alone, so seeding first is what keeps the panel from replacing
 * these rows with the sentence saying that machine did not answer.
 *
 * ## Why no sentence this phase writes appears in this file
 *
 * This module ships inside the production renderer bundle, so any sentence it
 * names is greppable in `out/renderer`. The caller supplies the words it wants
 * looked for, through `marks`, exactly as `./p103-stage-drive.ts` does.
 */

import type { Project } from '@shared/types';
import type {
  MachineCommitOutcome,
  MachineReviewFile,
  MachineStateView
} from '@shared/ipc';
import { targetKey, type WorkspaceTarget } from '@shared/workspace-target';
import { useApp } from '../state/store';
import {
  remoteChangesAvailable,
  remoteCommitAvailable,
  useRemoteChanges
} from './remote-changes';

/** One row the caller wants seeded, in the shape main answers with. */
export interface P104SeedFile {
  path: string;
  origPath?: string | null;
  status?: string;
  indexState?: string;
  worktreeState?: string;
}

export interface P104CommitSpec {
  /** The machine id the injected tab claims. Defaults to `p104far`. */
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
    headSha?: string;
    files?: P104SeedFile[];
    untracked?: P104SeedFile[];
    note?: string | null;
  };
  /**
   * Pretend that machine is not answering.
   *
   * The injected machine row is written with a link of `quiet` rather than
   * `connected`, which is the state a real machine that stopped answering
   * reaches, and it is what one of the disabled reasons is about.
   */
  offline?: boolean;
  /**
   * The confirmed folder to put on that machine's row, or null for none.
   *
   * IT IS PRESENTATIONAL AND IT DECIDES ONE BUTTON. Main reads the confirmed
   * folder off the record on disk at call time and refuses there whatever this
   * says, so a caller writing a folder here cannot make a machine writable.
   * What it can do is put the panel into the state where saving is off, which
   * is one of the six reasons the commit button is disabled and is one of the
   * photographs the phase asks for.
   *
   * Left out, THE REAL ROW MAIN PUSHED IS WHAT THE PANEL READS, on an injected
   * tab as well as on a real one. Only when this renderer holds no row for that
   * machine at all does an injected tab fall back to its own folder, so the
   * seeded modes are not all stuck on the saving-off reason.
   *
   * IT DEFAULTED TO THE TAB'S OWN FOLDER ON EVERY INJECTED TAB UNTIL
   * 2026-08-21, and that made one photograph race. The row that photographs
   * saving being off pressed Commit before the real tab had reached the
   * renderer's project list, so the drive injected a tab, wrote the tab's own
   * folder into the row, and the button was PRESSABLE in the picture that is
   * meant to show it refused. Three seconds later the same call reported it
   * disabled with the saving-off reason. Nothing crossed either way, because
   * main refuses on the record on disk, and the commit count over there was 1
   * before and 1 after. A caller that wants the saving-off state now passes
   * `writeRoot: null` and gets it whichever way the race lands.
   */
  writeRoot?: string | null;
  /**
   * Type this into the commit box before anything is pressed.
   *
   * It is typed through the textarea's own change event, so the store records
   * it the way it records a person's keystrokes. A multi-line value is typed
   * whole and no Enter is pressed.
   */
  type?: string;
  /** Press Commit after typing, and wait for the answer. */
  press?: boolean;
  /** Press Check what happened after the commit, and wait for its read. */
  check?: boolean;
  /** Sentences the caller wants looked for on screen. */
  marks?: readonly string[];
}

export interface P104CommitResult {
  ok: boolean;
  why?: string;
  /** True when this build can read what changed on another machine. */
  available?: boolean;
  /** True when this build carries the commit member at all. */
  committable?: boolean;
  /** True when the answer was supplied rather than read from a machine. */
  seeded?: boolean;
  machineId?: string;
  label?: string;
  path?: string;
  /** True when the commit box is on screen at all. */
  boxDrawn?: boolean;
  /** The words on the commit button, or null when it drew none. */
  button?: string | null;
  /** True when that button is disabled. */
  buttonDisabled?: boolean | null;
  /** The button's tooltip, which is the reason when it is disabled. */
  buttonTitle?: string | null;
  /** The caption under the button, which repeats that reason. */
  disabledWhy?: string | null;
  /** The standing line about hooks and signing, as drawn. */
  standing?: string | null;
  /** The text in the box when it was read. */
  typed?: string | null;
  /** True when Commit was pressed. */
  pressed?: boolean;
  /** The word main answered for the last commit, or null. */
  commitOutcome?: MachineCommitOutcome | null;
  /** The sentences main sent, as the panel drew them. */
  commitSentences?: string[];
  /** What that machine said, as the panel drew it, or null. */
  machineSaid?: string | null;
  /** The full sha the store holds for the guard the commit was sent with. */
  guardSha?: string | null;
  /** The sha the last read reported for HEAD over there. */
  headSha?: string | null;
  /** True when Check what happened is on screen. */
  checkDrawn?: boolean;
  /** The sentence the check left, or null. */
  checkNote?: string | null;
  /** The word the check recorded, or null. */
  checkOutcome?: string | null;
  /** How many rows the panel drew, so a report can say what was on screen. */
  rows?: number;
  /** The marks the caller asked about that ARE on screen. */
  marksOnScreen?: string[];
  /** How many marks the caller asked about. */
  marksGiven?: number;
}

declare global {
  interface Window {
    __gmuxP104Commit?: (spec?: P104CommitSpec) => Promise<P104CommitResult>;
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

function textOf(el: Element | null | undefined): string {
  return (el?.textContent ?? '').trim();
}

/** A seeded row, filled out into the shape the contract carries. */
function fileOf(one: P104SeedFile): MachineReviewFile {
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

/**
 * Type a value into the real textarea, the way a person's keystrokes reach the
 * store.
 *
 * React holds its own value on the element, so setting `.value` alone is
 * ignored on the next render. The prototype setter is what a controlled input
 * has to be driven through, which is the same technique
 * `build/probe-p103-shot.mjs` uses on the Settings fields.
 */
function typeInto(el: HTMLTextAreaElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value'
  )?.set;
  if (setter === undefined) return;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

export function registerP104CommitDrive(): void {
  window.__gmuxP104Commit = async (
    spec?: P104CommitSpec
  ): Promise<P104CommitResult> => {
    const machineId = spec?.machineId ?? 'p104far';
    const label = spec?.label ?? 'Studio';
    const settleMs = spec?.settleMs ?? 900;
    const marks = spec?.marks ?? [];

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
      link: spec?.offline === true ? 'quiet' : 'connected',
      everAnswered: true,
      lastAnsweredAt: Date.now(),
      detail: null,
      // The real row when this renderer has one, so an injected tab reads the
      // same confirmed folder a real tab reads. The tab's own folder is the
      // fallback only when there is no row for this machine at all.
      writeRoot:
        spec?.writeRoot !== undefined
          ? spec.writeRoot
          : (useApp.getState().machineStates.find((one) => one.id === machineId)
              ?.writeRoot ?? path)
    };
    const injectedProject: Project = {
      id: `${machineId}-p104`,
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
            writeRefusal: null,
            headSha: spec.seed?.headSha ?? '',
            committing: false,
            commitOutcome: null,
            commitSentences: [],
            commitMachineSaid: null,
            commitGuardSha: '',
            checking: false,
            checkOutcome: null,
            checkHeadSha: ''
          }
        }
      }));
    }

    // A tab opened the real way, through `projects.addRemote`, is preferred
    // over an injected one, for the reason ./p103-stage-drive.ts states: two
    // tabs for one folder would read one entry and a reader could not tell
    // which one was photographed.
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
    } else if (spec?.offline === true || spec?.writeRoot !== undefined) {
      // The tab is real and the caller wants the link down, or wants the
      // confirmed folder changed. Only the machine's own row is rewritten, so
      // the tab and its rows stay exactly as they were. A caller that asked for
      // neither leaves the row main pushed exactly as main pushed it.
      const real = useApp
        .getState()
        .machineStates.find((one) => one.id === machineId);
      useApp.setState({
        machineStates: [
          ...useApp
            .getState()
            .machineStates.filter((one) => one.id !== machineId),
          {
            ...(real ?? machineRow),
            ...(spec?.offline === true ? { link: 'quiet' as const } : {}),
            ...(spec?.writeRoot !== undefined
              ? { writeRoot: spec.writeRoot }
              : {})
          }
        ]
      });
    }
    useApp.getState().setActiveProject(open?.id ?? injectedProject.id);
    useApp.getState().setSidebarView('scm');
    await wait(settleMs);

    const box = (): HTMLElement | null =>
      document.querySelector<HTMLElement>('[data-scm-remote-commit="1"]');
    const input = (): HTMLTextAreaElement | null =>
      document.querySelector<HTMLTextAreaElement>(
        '[data-scm-remote-commit-input="1"]'
      );
    const commitBtn = (): HTMLButtonElement | null =>
      document.querySelector<HTMLButtonElement>(
        '[data-scm-remote-commit-btn="1"]'
      );

    if (typeof spec?.type === 'string') {
      const el = input();
      if (el !== null) {
        typeInto(el, spec.type);
        await wait(300);
      }
    }

    let pressed = false;
    if (spec?.press === true) {
      const btn = commitBtn();
      if (btn !== null && !btn.disabled) {
        btn.click();
        pressed = true;
        // A commit is one round trip out and one read back, and a hook over
        // there can take longer than either. The caller raises `settleMs` when
        // it has arranged a slow hook.
        await wait(settleMs * 6);
      }
    }

    if (spec?.check === true) {
      const btn = document.querySelector<HTMLButtonElement>(
        '[data-scm-commit-check="1"]'
      );
      if (btn !== null && !btn.disabled) {
        btn.click();
        await wait(settleMs * 4);
      }
    }

    const entry = useRemoteChanges.getState().byTarget[key];
    const btn = commitBtn();
    const onScreen = document.body.innerText;
    const section = document.querySelector('[data-section-root="changes"]');
    return {
      ok: true,
      available: remoteChangesAvailable(),
      committable: remoteCommitAvailable(),
      seeded: spec?.seed !== undefined,
      machineId,
      label,
      path,
      boxDrawn: box() !== null,
      button: btn === null ? null : textOf(btn),
      buttonDisabled: btn === null ? null : btn.disabled,
      buttonTitle: btn?.getAttribute('title') ?? null,
      disabledWhy:
        textOf(document.querySelector('[data-scm-remote-commit-why="1"]')) ||
        null,
      standing:
        textOf(document.querySelector('[data-scm-commit-standing="1"]')) ||
        null,
      typed: input()?.value ?? null,
      pressed,
      commitOutcome: entry?.commitOutcome ?? null,
      commitSentences: Array.from(
        document.querySelectorAll('[data-scm-commit-note="1"]')
      ).map((one) => textOf(one)),
      machineSaid:
        (document.querySelector('[data-scm-commit-said="1"]')?.textContent ??
          null),
      guardSha: entry?.commitGuardSha ?? null,
      headSha: entry?.headSha ?? null,
      checkDrawn: document.querySelector('[data-scm-commit-check="1"]') !== null,
      checkNote:
        textOf(document.querySelector('[data-scm-commit-check-note="1"]')) ||
        null,
      checkOutcome: entry?.checkOutcome ?? null,
      rows: (section?.querySelectorAll('.scm-hfile') ?? []).length,
      marksGiven: marks.length,
      marksOnScreen: marks.filter((mark) => onScreen.includes(mark))
    };
  };
}
