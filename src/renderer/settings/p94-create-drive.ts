/**
 * The Phase 94 fix round harness drive, being the only way to SEE the per-agent
 * hotkey refuse in the real app.
 *
 * ## Why it exists
 *
 * The first build of this phase put the tab machine rule in the store and never
 * launched a window. The verifier found that the per-agent hotkey did not call
 * the store at all, so the rule never ran for it, and the surface had never been
 * seen doing anything. A unit test against a fake bridge proves the rule. It
 * cannot prove that a person pressing the key gets the sentence.
 *
 * So this drive calls the product's own `launchAgent`, which is the function the
 * `launch-agent:<id>` menu action calls, and the store's own `quickCreate`,
 * which is the agent board. It runs them in a tab whose files are on a machine
 * and reads what happened.
 *
 * ## The three readings
 *
 *   local control   the hotkey in a tab on this Mac starts a session here
 *   hotkey refused  the hotkey in a tab on a machine Tortie cannot use starts
 *                   nothing and leaves one sticky sentence
 *   board refused   the same, driven through `quickCreate`
 *
 * The order matters. The control runs first so the two refusals are the last
 * thing that happened, and the screenshot the harness takes next photographs the
 * refusal rather than a terminal.
 *
 * ## What it does NOT prove, and the report says so
 *
 * The machine it injects is one nothing is signed in to, so it proves the
 * refusal half and not the half where the machine is usable. That the same
 * payload runs on a real machine, in the tab's own folder, and starts nothing on
 * this Mac, is measured against a real sign in server by `npm run smoke:remote`
 * at steps 17c to 17e.
 *
 * ## How it is reached
 *
 * It assigns exactly one function to `window` and changes no behaviour, the same
 * shape as `../app/remote-boot-drive.ts`. Outside the harness it is one unused
 * property. `build/probe-p94-hotkey.mjs` calls it through `GMUX_SHOT_JS`.
 */

import type { Project } from '@shared/types';
import type { MachineStateView } from '@shared/ipc';
import { useApp } from '../state/store';
import { launchAgent } from './launch-agent';

export interface P94CreateProbeSpec {
  /** The machine id the injected tab claims. Nothing is signed in to it. */
  machineId?: string;
  /** The label a person gave it, which the refusal sentence names. */
  label?: string;
  /** The folder the injected tab claims, as a path on that machine. */
  farPath?: string;
  /** How long to let a create settle before reading. */
  settleMs?: number;
}

/** One surface, driven once. */
export interface P94Reading {
  /** Which surface was driven. */
  surface: string;
  /** Sessions the window held before the drive. */
  before: number;
  /** Sessions the window held after it. */
  after: number;
  /** Sessions MAIN holds after it, read over the bridge. */
  mainAfter: number;
  /** Every toast text on screen after the drive. */
  toasts: string[];
  /** The machine of the newest session, or null when it is on this Mac. */
  newestMachine: string | null;
  /** The folder of the newest session. */
  newestPath: string | null;
}

export interface P94CreateProbeResult {
  ok: boolean;
  why?: string;
  machineId?: string;
  readings?: P94Reading[];
}

declare global {
  interface Window {
    __gmuxP94CreateProbe?: (
      spec?: P94CreateProbeSpec
    ) => Promise<P94CreateProbeResult>;
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

export function registerP94CreateDrive(): void {
  window.__gmuxP94CreateProbe = async (
    spec?: P94CreateProbeSpec
  ): Promise<P94CreateProbeResult> => {
    const machineId = spec?.machineId ?? 'p94probe';
    const label = spec?.label ?? 'Probe Machine';
    const settleMs = spec?.settleMs ?? 2_500;
    const bridge = window.gmux;
    if (bridge === undefined) {
      return { ok: false, why: 'no bridge, so nothing could be driven' };
    }
    const localProject = useApp.getState().activeProject();
    if (localProject === null) {
      return {
        ok: false,
        why: 'no active project, so there is no tab to drive a create in'
      };
    }
    const farPath = spec?.farPath ?? localProject.path;

    /** Read the window and main after one drive. */
    const read = async (
      surface: string,
      before: number
    ): Promise<P94Reading> => {
      const sessions = useApp.getState().sessions;
      const newest = sessions[sessions.length - 1];
      let mainAfter = -1;
      try {
        mainAfter = (await bridge.sessions.list()).length;
      } catch {
        mainAfter = -1;
      }
      return {
        surface,
        before,
        after: sessions.length,
        mainAfter,
        toasts: useApp.getState().toasts.map((one) => one.text),
        newestMachine: newest?.machine?.id ?? null,
        newestPath: newest?.projectPath ?? null
      };
    };

    const readings: P94Reading[] = [];

    // -- 1. THE CONTROL. The hotkey in the tab this window really opened -----
    useApp.setState({ toasts: [] });
    const controlBefore = useApp.getState().sessions.length;
    await launchAgent('shell');
    await wait(settleMs);
    readings.push(await read('hotkey in a local tab', controlBefore));

    // -- 2. THE TAB ON A MACHINE --------------------------------------------
    const projectsBefore = useApp.getState().projects;
    const machinesBefore = useApp.getState().machineStates;
    const injected: Project = {
      id: `${machineId}-injected`,
      path: farPath,
      name: `${localProject.name} on ${label}`,
      machineId
    };
    const machineRow: MachineStateView = {
      id: machineId,
      label,
      color: 'magenta',
      link: 'connected',
      everAnswered: true,
      lastAnsweredAt: Date.now(),
      detail: null
    };
    useApp.setState({
      projects: [...projectsBefore, injected],
      machineStates: [...machinesBefore, machineRow]
    });
    useApp.getState().setActiveProject(injected.id);
    await wait(500);

    // -- 3. THE HOTKEY, IN THAT TAB -----------------------------------------
    useApp.setState({ toasts: [] });
    const hotkeyBefore = useApp.getState().sessions.length;
    await launchAgent('shell');
    await wait(settleMs);
    readings.push(await read('hotkey in a tab on a machine', hotkeyBefore));

    // -- 4. THE AGENT BOARD, IN THE SAME TAB --------------------------------
    useApp.setState({ toasts: [] });
    const boardBefore = useApp.getState().sessions.length;
    await useApp.getState().quickCreate('shell');
    await wait(settleMs);
    readings.push(await read('agent board in a tab on a machine', boardBefore));

    // The tab and its sentence stay on screen, so the screenshot the harness
    // takes next photographs the refusal.
    return { ok: true, machineId, readings };
  };
}
