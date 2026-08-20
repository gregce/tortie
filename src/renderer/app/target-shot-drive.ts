/**
 * The Phase 90.1 harness drive, being the only way the claim can be measured.
 *
 * WHAT IT IS FOR. Four sidebar stores now decide whether to do any work by
 * comparing a `WorkspaceTarget` rather than a path string. Proving that needs
 * two project tabs whose paths are equal and whose machines differ, and no
 * product surface can create a project on another machine yet. So this module
 * injects the second tab into the renderer's own store, switches to it, reads
 * what the four stores hold, and switches back.
 *
 * WHAT IT DOES NOT PROVE, and every report has to say so. It does not prove a
 * person creating a project tab on another machine, because nothing in the
 * product can do that. What it proves is what the four stores do on a switch.
 *
 * HOW IT IS REACHED. It assigns exactly one function to `window` and changes no
 * behaviour, exactly like the other shot probes in this tree. Outside the
 * harness it is one unused property. `build/probe-workspace-target.mjs` calls it
 * through `GMUX_SHOT_JS`, which is an environment name that already exists.
 */

import type { Project } from '@shared/types';
import type { MachineStateView } from '@shared/ipc';
import {
  localPathOf,
  targetOfProject,
  type WorkspaceTarget
} from '@shared/workspace-target';
import { useFileTree } from '../tree/store';
import { useTreeGitStatus } from '../tree/git-status';
import { useSearch } from '../search/store';
import { useContext } from '../context/store';
import { useApp } from '../state/store';

export interface TargetProbeSpec {
  /** The machine id the injected second tab claims. Defaults to `p901`. */
  machineId?: string;
  /** The label that machine reports. Defaults to `Probe Machine`. */
  label?: string;
  /** Milliseconds to let each switch settle. Defaults to 600. */
  settleMs?: number;
  /** How many times an equal target is re-set for the no-op count. Defaults to 50. */
  resetCount?: number;
  /**
   * Which tab to leave active when the probe finishes, so the screenshot the
   * harness takes afterwards photographs that state. `local` is the default.
   */
  hold?: 'local' | 'elsewhere';
  /**
   * Which sidebar view to hold open, and it is not optional in practice.
   *
   * The sidebar mounts ONE view at a time, and a store follows the active
   * project only while the view that owns it is mounted. So a run measures the
   * stores of the view it names. The Explorer owns the file tree and its git
   * decorations, Search owns the search store and Context owns the Context
   * store. The view is re-set after every tab switch, because the choice is
   * remembered per project and an injected tab has no remembered choice.
   */
  view?: 'explorer' | 'search' | 'scm' | 'context';
  /** A query to leave in the search box, so a search reading is not empty. */
  query?: string;
}

/** What one store held at one moment. */
export interface StoreReading {
  /** The store's own target, as `machineId` and `path`, or null. */
  target: WorkspaceTarget | null;
  /** The path this Mac may read for that target, or null. */
  localPath: string | null;
  /** How much content the store is holding. The names differ per store. */
  counts: Record<string, number | boolean | string | null>;
}

/** Everything read at one moment. */
export interface TargetProbeReading {
  name: string;
  activeProjectId: string | null;
  fileTree: StoreReading;
  gitStatus: StoreReading;
  search: StoreReading;
  context: StoreReading;
  /** Which of the three sentences the document holds right now. */
  sentences: Record<string, boolean>;
}

export interface TargetProbeResult {
  ok: boolean;
  why?: string;
  machineId?: string;
  /** Notifications each store produced across `resetCount` equal re-sets. */
  noOpSets?: Record<string, number>;
  readings?: TargetProbeReading[];
}

declare global {
  interface Window {
    __gmuxTargetProbe?: (spec?: TargetProbeSpec) => Promise<TargetProbeResult>;
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/**
 * The three sentences, matched on a distinctive fragment rather than the whole
 * string. The whole string is in machine-copy.ts and a unit test pins it there.
 * This reading only has to answer whether the words are on screen.
 *
 * PHASE 98 MOVED THE SEARCH MARK. It read "Tortie searches files on this Mac
 * only", which was the second line of the refusal Phase 90.1 gave the Search
 * view. Phase 98 deleted that refusal, because the Search view searches a
 * folder on a machine now, so the mark named a sentence no build draws. What
 * the injected tab reaches instead is a machine main has never heard of, and
 * the panel says so. The fragment is the tail of `searchNotConnected` in
 * machine-copy.ts and it appears in no other sentence in this renderer.
 *
 * THE EXPLORER MARK IS STALE TOO and this phase leaves it alone rather than
 * quietly widening its own edit. Phase 90.3 changed that second line to
 * "Tortie lists files on this Mac only", and the two Explorer failures in this
 * probe are on HEAD as well as here.
 */
const SENTENCE_MARKS: Readonly<Record<string, string>> = {
  filesElsewhere: 'Tortie reads files on this Mac only',
  searchElsewhere: 'so it searched nothing',
  contextElsewhere: 'Tortie reads skills, servers and hooks from this Mac only'
};

function readSentences(): Record<string, boolean> {
  const text = document.body.innerText;
  const found: Record<string, boolean> = {};
  for (const [name, mark] of Object.entries(SENTENCE_MARKS)) {
    found[name] = text.includes(mark);
  }
  return found;
}

function reading(name: string): TargetProbeReading {
  const tree = useFileTree.getState();
  const git = useTreeGitStatus.getState();
  const search = useSearch.getState();
  const context = useContext.getState();
  const treeLocal = localPathOf(tree.root);
  return {
    name,
    activeProjectId: useApp.getState().activeProjectId,
    fileTree: {
      target: tree.root,
      localPath: treeLocal,
      counts: {
        listedDirs: Object.keys(tree.entriesByDir).length,
        rootEntries:
          treeLocal === null
            ? 0
            : (tree.entriesByDir[treeLocal]?.length ?? 0),
        rootLoaded: tree.rootLoaded
      }
    },
    gitStatus: {
      target: git.repo,
      localPath: localPathOf(git.repo),
      counts: { isRepo: git.isRepo, statusFiles: git.files.length }
    },
    search: {
      target: search.target,
      localPath: localPathOf(search.target),
      counts: { status: search.status, searchFiles: search.files.length }
    },
    context: {
      target: context.target,
      localPath: localPathOf(context.target),
      counts: {
        status: context.status,
        entries: context.scan?.entries.length ?? 0
      }
    },
    sentences: readSentences()
  };
}

/**
 * How many times each store REPLACED ITS TARGET across `count` re-sets of a
 * freshly composed but EQUAL target.
 *
 * Every one of these must be 0. A non zero count means the early return is
 * comparing by reference, and the four sidebars would rebuild themselves on
 * every render of the view above them.
 *
 * It counts a change of the target field rather than every `set`, and the
 * distinction is measured rather than cosmetic. A driven app has work in
 * flight, e.g. a directory listing landing or a Context scan finishing, and
 * each of those performs a `set` of its own that has nothing to do with the
 * early return. A first run of this probe recorded 3, 2, 1 and 2 stray sets
 * from that work alone. The target field is written by the setter and by
 * nothing else, so counting it answers exactly the question being asked.
 */
async function countNoOpSets(
  target: WorkspaceTarget | null,
  count: number
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {
    fileTree: 0,
    gitStatus: 0,
    search: 0,
    context: 0
  };
  // PRIME FIRST. Only the view that is mounted syncs its own store, so the
  // other three still hold null and their first re-set would be a real change.
  // Setting all four once, before the count starts, is what makes the count
  // about the early return rather than about which view happened to be open.
  await useFileTree.getState().setRoot(target);
  await useTreeGitStatus.getState().setRepo(target);
  useSearch.getState().syncProject(target);
  useContext.getState().syncProject(target);
  await new Promise((r) => setTimeout(r, 250));

  const stop = [
    useFileTree.subscribe((now, before) => {
      if (now.root !== before.root) {
        counts['fileTree'] = (counts['fileTree'] ?? 0) + 1;
      }
    }),
    useTreeGitStatus.subscribe((now, before) => {
      if (now.repo !== before.repo) {
        counts['gitStatus'] = (counts['gitStatus'] ?? 0) + 1;
      }
    }),
    useSearch.subscribe((now, before) => {
      if (now.target !== before.target) {
        counts['search'] = (counts['search'] ?? 0) + 1;
      }
    }),
    useContext.subscribe((now, before) => {
      if (now.target !== before.target) {
        counts['context'] = (counts['context'] ?? 0) + 1;
      }
    })
  ];
  try {
    for (let i = 0; i < count; i += 1) {
      // A FRESH object every time, and equal to the one the stores hold. This
      // is exactly what each view composes during render.
      const fresh =
        target === null
          ? null
          : { machineId: target.machineId, path: target.path };
      await useFileTree.getState().setRoot(fresh);
      await useTreeGitStatus.getState().setRepo(fresh);
      useSearch.getState().syncProject(fresh);
      useContext.getState().syncProject(fresh);
    }
  } finally {
    for (const off of stop) off();
  }
  return counts;
}

export function registerTargetShotDrive(): void {
  window.__gmuxTargetProbe = async (
    spec?: TargetProbeSpec
  ): Promise<TargetProbeResult> => {
    const machineId = spec?.machineId ?? 'p901';
    const label = spec?.label ?? 'Probe Machine';
    const settleMs = spec?.settleMs ?? 600;
    const resetCount = spec?.resetCount ?? 50;

    const app = useApp.getState();
    const localProject = app.activeProject();
    if (localProject === null) {
      return { ok: false, why: 'no active project, so there is nothing to switch away from' };
    }
    /** The sidebar mounts one view at a time, so the view is re-set per tab. */
    const holdView = (): void => {
      if (spec?.view !== undefined) useApp.getState().setSidebarView(spec.view);
    };
    holdView();
    if (spec?.query !== undefined) useSearch.getState().setQuery(spec.query);
    await wait(settleMs);

    const noOpSets = await countNoOpSets(
      targetOfProject(localProject),
      resetCount
    );

    // The injected machine row and the injected tab. Both are removed before
    // this function returns, unless `hold` asks for the tab to stay.
    const injectedMachine: MachineStateView = {
      id: machineId,
      label,
      color: 'magenta',
      link: 'connected',
      everAnswered: true,
      lastAnsweredAt: Date.now(),
      detail: null
    };
    const injectedProject: Project = {
      id: `${machineId}-injected`,
      path: localProject.path,
      name: `${localProject.name} on ${label}`,
      machineId
    };

    const projectsBefore = useApp.getState().projects;
    const machinesBefore = useApp.getState().machineStates;
    useApp.setState({
      projects: [...projectsBefore, injectedProject],
      machineStates: [...machinesBefore, injectedMachine]
    });

    const readings: TargetProbeReading[] = [];
    holdView();
    await wait(settleMs);
    readings.push(reading('A local'));

    useApp.getState().setActiveProject(injectedProject.id);
    holdView();
    await wait(settleMs);
    readings.push(reading('B elsewhere'));

    useApp.getState().setActiveProject(localProject.id);
    holdView();
    await wait(settleMs);
    readings.push(reading('C local again'));

    if (spec?.hold === 'elsewhere') {
      // The injected tab and its machine row stay, so the screenshot the
      // harness takes next photographs the sentence rather than the tree.
      useApp.getState().setActiveProject(injectedProject.id);
      holdView();
      await wait(settleMs);
      readings.push(reading('D elsewhere held'));
      return { ok: true, machineId, noOpSets, readings };
    }

    useApp.setState({
      projects: projectsBefore,
      machineStates: machinesBefore
    });
    await wait(settleMs);
    return { ok: true, machineId, noOpSets, readings };
  };
}
