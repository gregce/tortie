/**
 * PHASE 101, REVERSED BY PHASE 336. Opening a file on another machine that is
 * larger than Tortie can save there.
 *
 * Phase 101 REFUSED the open on a machine with saving on, because a tab that
 * could never be saved was worse than a refusal. Research 138's ruling is that
 * a file is never refused for OPENING because of the save cap, so it OPENS,
 * read only, marked `saveCapped`, which is the fifth reason `tabIsReadOnly`
 * gives for a tab on another machine. The read cap is 2,097,152 bytes and the
 * save cap is 90,000, and the save cap still cannot move, because the whole
 * command Tortie sends is capped as well.
 *
 * THE FOUR CASES.
 *
 *  1. In a folder Tortie may write under, over the cap, read whole. Opened,
 *     read only, the mark carrying the measured size.
 *  2. The same, read cut. Opened, read only, the mark saying `over`, because
 *     the size is a floor rather than a measurement.
 *  3. Outside every folder Tortie may write under, over the cap. Opened, as it
 *     always was, and marked too, because the size is a fact about the file.
 *  4. Under the cap. Opened with no mark, which is the ordinary case.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const buffer = vi.hoisted(() => ({ text: 'typed\n' }));
// PHASE 277. ONE model object for the whole file, not a fresh one per call.
// The registry in ../monaco-loader hands the same instance back for the life of
// a tab, and `completeSave` in ../tab-io compares that instance by reference to
// decide whether an acknowledgement still belongs to the tab it was asked for.
// A double that answered with a new object every call is a tab whose lifetime
// ends between the write and its answer, so every completion patched nothing.
const model = vi.hoisted(() => ({ getValue: () => buffer.text }));
vi.mock('../monaco-loader', () => ({
  loadMonaco: async () => ({}),
  rememberLoaded: () => undefined,
  getLoadedMonaco: () => null,
  rekeyTabResources: () => undefined,
  workingModel: () => model,
  getWorkingModel: () => model,
  resetWorkingModel: () => undefined,
  disposeModels: () => undefined,
  saveViewState: () => undefined,
  takeViewState: () => null,
  dropViewState: () => undefined
}));

const reviewFile = vi.fn();

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  gmux: {
    fs: { readFile: vi.fn(), writeFile: vi.fn(), readDir: vi.fn() },
    git: { showHead: vi.fn(), onChanged: () => () => undefined },
    machines: { reviewFile, putFile: vi.fn() }
  }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } }
});

const { useEditor } = await import('../store');
const { useApp } = await import('../../state/store');
const { tabIsReadOnly, remoteTabWriteFolder } = await import('../tab-readonly');
type OpenFileRequest = import('../../state/open-file').OpenFileRequest;
type MachineStateView = import('@shared/ipc').MachineStateView;

const REMOTE = {
  machineId: 'studio',
  machineLabel: 'Studio',
  repoPath: '/home/greg/api'
};
const ROOT = '/home/greg';
const REVIEW_CAP = 2_097_152;

function states(writeRoot: string | null): MachineStateView[] {
  return [
    {
      id: 'studio',
      label: 'Studio',
      color: 'blue',
      link: 'connected',
      everAnswered: true,
      lastAnsweredAt: 0,
      detail: null,
      writeRoot
    }
  ];
}

function pair(bytes: number, truncated = false): unknown {
  return {
    oldContents: 'before\n',
    newContents: 'after\n',
    binary: false,
    truncated,
    note: null,
    bytes
  };
}

const req: OpenFileRequest = {
  repoPath: REMOTE.repoPath,
  relPath: 'src/big.md',
  path: `${REMOTE.repoPath}/src/big.md`,
  mode: 'diff',
  source: 'machine',
  preview: false,
  remote: REMOTE
};

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/** Open the file and answer the tab as the store holds it afterwards. */
async function open(): Promise<{
  error: string | null;
  savedContents: string;
  saveCapped: { bytes: number; over: boolean } | undefined;
  readOnly: boolean;
}> {
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
  useEditor.getState().openFromRequest(req);
  await flush();
  const tab = useEditor.getState().activeTab();
  if (tab === null) throw new Error('no tab');
  const app = useApp.getState();
  return {
    error: tab.error,
    savedContents: tab.savedContents,
    saveCapped: tab.saveCapped,
    readOnly: tabIsReadOnly(
      tab,
      remoteTabWriteFolder(tab, app.machineStates, app.projects)
    )
  };
}

beforeEach(() => {
  useApp.setState({
    machineStates: states(ROOT),
    projects: [],
    toast: () => undefined
  } as never);
  vi.clearAllMocks();
});

describe('a file too large to save, in a folder Tortie may write under', () => {
  it('opens read only, and the mark carries what it measures', async () => {
    reviewFile.mockResolvedValue(pair(1_238_904));
    const tab = await open();
    expect(tab.error).toBe(null);
    expect(tab.savedContents).toBe('after\n');
    expect(tab.saveCapped).toEqual({ bytes: 1_238_904, over: false });
    expect(tab.readOnly).toBe(true);
  });

  it('says over when the read was cut, because the size is a floor', async () => {
    reviewFile.mockResolvedValue(pair(REVIEW_CAP, true));
    const tab = await open();
    expect(tab.error).toBe(null);
    expect(tab.saveCapped).toEqual({ bytes: REVIEW_CAP, over: true });
    expect(tab.readOnly).toBe(true);
  });

  it('opens a file under the cap with no mark, which is the ordinary case', async () => {
    reviewFile.mockResolvedValue(pair(6));
    const tab = await open();
    expect(tab.error).toBe(null);
    expect(tab.savedContents).toBe('after\n');
    expect(tab.saveCapped).toBeUndefined();
    expect(tab.readOnly).toBe(false);
  });
});

describe('the same file outside every folder Tortie may write under', () => {
  it('opens, as it always did, and is read only', async () => {
    useApp.setState({ machineStates: states(null) } as never);
    reviewFile.mockResolvedValue(pair(1_238_904));
    const tab = await open();
    expect(tab.error).toBe(null);
    expect(tab.savedContents).toBe('after\n');
    expect(tab.readOnly).toBe(true);
  });
});
