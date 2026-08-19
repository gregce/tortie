/**
 * The Phase 90.3 fix round harness drive, being the only way its claim can be
 * measured without a second computer.
 *
 * ## The defect it exists to measure
 *
 * On a cold boot with a project tab whose folder is on another machine, the two
 * crossing sidebars read that machine before the link is up. Measured on
 * 2026-08-19 against the operator's Mac Pro: the link read `quiet` at 1 ms, the
 * Explorer's first read was refused and it drew the sentence saying Tortie is
 * not connected to that machine, the link read `connected` at 504 ms, and the
 * same sentence with zero rows was still on screen at 44,694 ms. Source Control
 * had the same race and its sentence was still up at 11.5 s. Pressing Refresh
 * fixed the Explorer in 200 ms, so a person who never pressed it was shown a
 * false statement for the whole run.
 *
 * ## What this drive measures, and it is a COUNT rather than a screenshot
 *
 * It counts READS. One read is one call from a sidebar store to that machine.
 * The fix says exactly one extra read happens each time a machine starts
 * answering, and that nothing else ever causes one, because this product has no
 * timer for a folder on another machine.
 *
 * So the drive moves the link through four moments and the count after each is
 * the whole measurement:
 *
 * ```
 *   A quiet          the tab is opened on a link that is not up      1 read
 *   B connected      the link starts answering                       2 reads
 *   C settled        2.5 s pass with the link unchanged              2 reads
 *   D second sign in the link goes quiet and answers again           3 reads
 * ```
 *
 * Before the fix the count is 1 at every moment, which is the defect stated as
 * a number. A count that keeps climbing at C is the opposite failure, being a
 * timer, and this drive fails on that just as loudly.
 *
 * ## What it does NOT prove, and the report has to say so
 *
 * The machine it injects is not a machine. It has an id nothing is signed in
 * to, so every read is refused and no row ever arrives. What is proven here is
 * WHEN Tortie reads, not what comes back. That a real folder on a real machine
 * lists real rows is proven elsewhere, by `npm run smoke:remote` step 19
 * against a real sign in server and by `build/probe-remote-tree.mjs` against
 * the operator's Mac Pro.
 *
 * ## How it is reached
 *
 * It assigns exactly one function to `window` and changes no behaviour, exactly
 * like `./target-shot-drive.ts` next to it. Outside the harness it is one
 * unused property. `build/probe-remote-project.mjs` calls it through
 * `GMUX_SHOT_JS`, which is an environment name that already exists.
 */

import type { Project } from '@shared/types';
import type { MachineStateView } from '@shared/ipc';
import { targetKey, type WorkspaceTarget } from '@shared/workspace-target';
import { useFileTree } from '../tree/store';
import { useRemoteChanges } from '../scm/remote-changes';
import { useApp } from '../state/store';

export interface RemoteBootProbeSpec {
  /** The machine id the injected tab claims. Defaults to `p903boot`. */
  machineId?: string;
  /** The label that machine reports. Defaults to `Probe Machine`. */
  label?: string;
  /** Which sidebar to hold open, because only a mounted view reads. */
  view?: 'explorer' | 'scm';
  /** Milliseconds to let each moment settle. Defaults to 900. */
  settleMs?: number;
  /** Milliseconds of no link change at moment C. Defaults to 2,500. */
  quietMs?: number;
}

/** The reads counted at one moment, with what was on screen. */
export interface RemoteBootReading {
  name: string;
  /** Reads the Explorer's tree store started, since the tab was opened. */
  treeReads: number;
  /** Reads the Source Control store started, since the tab was opened. */
  changesReads: number;
  /** What the tree store's last answer was, or null on a local tab. */
  treeStatus: string | null;
  /** True when the Source Control store's last read did not land. */
  changesFailed: boolean;
  /** Whether the two refusal sentences are in the document right now. */
  sentences: Record<string, boolean>;
}

export interface RemoteBootProbeResult {
  ok: boolean;
  why?: string;
  machineId?: string;
  view?: string;
  readings?: RemoteBootReading[];
}

declare global {
  interface Window {
    __gmuxRemoteBootProbe?: (
      spec?: RemoteBootProbeSpec
    ) => Promise<RemoteBootProbeResult>;
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/**
 * The two sentences, matched on a distinctive fragment rather than the whole
 * string. Both whole strings live in ./machine-copy.ts and unit tests pin them
 * there. This reading only has to answer whether the words are on screen.
 */
const SENTENCE_MARKS: Readonly<Record<string, string>> = {
  treeNotConnected: 'so it cannot read that folder',
  changesUnreachable: 'did not answer, so Tortie could not read what changed'
};

function readSentences(): Record<string, boolean> {
  const text = document.body.innerText;
  const found: Record<string, boolean> = {};
  for (const [name, mark] of Object.entries(SENTENCE_MARKS)) {
    found[name] = text.includes(mark);
  }
  return found;
}

export function registerRemoteBootDrive(): void {
  window.__gmuxRemoteBootProbe = async (
    spec?: RemoteBootProbeSpec
  ): Promise<RemoteBootProbeResult> => {
    const machineId = spec?.machineId ?? 'p903boot';
    const label = spec?.label ?? 'Probe Machine';
    const view = spec?.view ?? 'explorer';
    const settleMs = spec?.settleMs ?? 900;
    const quietMs = spec?.quietMs ?? 2_500;

    const app = useApp.getState();
    const localProject = app.activeProject();
    if (localProject === null) {
      return {
        ok: false,
        why: 'no active project, so there is no window to inject a tab into'
      };
    }

    const machineRow = (link: MachineStateView['link']): MachineStateView => ({
      id: machineId,
      label,
      color: 'magenta',
      link,
      everAnswered: link === 'connected',
      lastAnsweredAt: link === 'connected' ? Date.now() : null,
      detail: null
    });
    const injectedProject: Project = {
      id: `${machineId}-injected`,
      path: localProject.path,
      name: `${localProject.name} on ${label}`,
      machineId
    };
    const target: WorkspaceTarget = {
      machineId,
      path: localProject.path
    };
    const key = targetKey(target);

    const projectsBefore = useApp.getState().projects;
    const machinesBefore = useApp.getState().machineStates;

    /**
     * Reads counted as they START, rather than as they land.
     *
     * A read that fails still counted, because the question is when Tortie
     * decides to ask, and a refusal is an answer.
     */
    let treeReads = 0;
    let changesReads = 0;
    let treeBusy = false;
    let changesBusy = false;
    const stop = [
      useFileTree.subscribe((now) => {
        const busy = now.remote?.loading === true;
        if (busy && !treeBusy) treeReads += 1;
        treeBusy = busy;
      }),
      useRemoteChanges.subscribe((now) => {
        const one = now.byTarget[key];
        const busy = one !== undefined && (one.loading || one.refreshing);
        if (busy && !changesBusy) changesReads += 1;
        changesBusy = busy;
      })
    ];

    const reading = (name: string): RemoteBootReading => {
      const one = useRemoteChanges.getState().byTarget[key];
      return {
        name,
        treeReads,
        changesReads,
        treeStatus: useFileTree.getState().remote?.status ?? null,
        changesFailed: one?.failed === true,
        sentences: readSentences()
      };
    };

    const holdView = (): void => {
      useApp.getState().setSidebarView(view);
    };

    try {
      // -- A. the tab is opened while the link is not up --------------------
      useApp.setState({
        projects: [...projectsBefore, injectedProject],
        machineStates: [...machinesBefore, machineRow('quiet')]
      });
      useApp.getState().setActiveProject(injectedProject.id);
      holdView();
      await wait(settleMs);
      const readings: RemoteBootReading[] = [reading('A quiet')];

      // -- B. the link starts answering -------------------------------------
      useApp.setState({
        machineStates: [...machinesBefore, machineRow('connected')]
      });
      holdView();
      await wait(settleMs);
      readings.push(reading('B connected'));

      // -- C. time passes and nothing changes -------------------------------
      await wait(quietMs);
      readings.push(reading('C settled'));

      // -- D. the machine drops and signs in again --------------------------
      useApp.setState({
        machineStates: [...machinesBefore, machineRow('quiet')]
      });
      await wait(settleMs);
      useApp.setState({
        machineStates: [...machinesBefore, machineRow('connected')]
      });
      holdView();
      await wait(settleMs);
      readings.push(reading('D second sign in'));

      // The tab and its machine row stay, so the screenshot the harness takes
      // next photographs this state rather than the local tree.
      return { ok: true, machineId, view, readings };
    } finally {
      for (const off of stop) off();
    }
  };
}
