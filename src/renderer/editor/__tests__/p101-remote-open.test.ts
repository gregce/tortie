/**
 * PHASE 101. Opening a file on a machine Tortie may save on.
 *
 * WHY THE OPEN IS REFUSED AND NOT THE SAVE. The read cap is 2,097,152 bytes
 * and the save cap is 90,000. The save cap cannot be raised to meet the read
 * cap, because the whole command Tortie sends is capped as well and a file that
 * size does not fit at any encoding. So the choice is between refusing the open
 * and shipping a tab that can never be saved, and a tab that can never be saved
 * is the defect Phase 96 fixed by accident.
 *
 * THE FOUR CASES, and the third is the one that would be easy to get wrong.
 *
 *  1. Saving on, file over the cap, read whole. Refused, naming the size.
 *  2. Saving on, file over the cap, read cut. Refused, saying over, because the
 *     size is a floor rather than a measurement.
 *  3. Saving OFF, file over the cap. OPENED. The tab is read only anyway, so
 *     refusing would take away a read a person has today and give nothing back.
 *  4. Saving on, file under the cap. Opened, which is the ordinary case.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const buffer = vi.hoisted(() => ({ text: 'typed\n' }));
vi.mock('../monaco-loader', () => ({
  loadMonaco: async () => ({}),
  rememberLoaded: () => undefined,
  getLoadedMonaco: () => null,
  rekeyTabResources: () => undefined,
  workingModel: () => ({ getValue: () => buffer.text }),
  getWorkingModel: () => ({ getValue: () => buffer.text }),
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
const copy = await import('../../machines/presentation');
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
async function open(): Promise<{ error: string | null; savedContents: string }> {
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
  useEditor.getState().openFromRequest(req);
  await flush();
  const tab = useEditor.getState().activeTab();
  return {
    error: tab?.error ?? null,
    savedContents: tab?.savedContents ?? ''
  };
}

beforeEach(() => {
  useApp.setState({ machineStates: states(ROOT), toast: () => undefined } as never);
  vi.clearAllMocks();
});

describe('a file too large to save, on a machine that can be saved to', () => {
  it('is not opened, and the sentence names what it measures', async () => {
    reviewFile.mockResolvedValue(pair(1_238_904));
    const tab = await open();
    expect(tab.error).toBe(copy.remoteOpenTooLarge(1_238_904, 'Studio'));
    expect(tab.savedContents).toBe('');
  });

  it('says over when the read was cut, because the size is a floor', async () => {
    reviewFile.mockResolvedValue(pair(REVIEW_CAP, true));
    const tab = await open();
    expect(tab.error).toBe(copy.remoteOpenTooLargeOver(REVIEW_CAP, 'Studio'));
    expect(tab.error).toContain('over');
    expect(tab.savedContents).toBe('');
  });

  it('opens a file under the cap, which is the ordinary case', async () => {
    reviewFile.mockResolvedValue(pair(6));
    const tab = await open();
    expect(tab.error).toBe(null);
    expect(tab.savedContents).toBe('after\n');
  });
});

describe('the same file on a machine nobody has let Tortie save on', () => {
  it('opens, because refusing would take away a read a person has', async () => {
    useApp.setState({ machineStates: states(null) } as never);
    reviewFile.mockResolvedValue(pair(1_238_904));
    const tab = await open();
    expect(tab.error).toBe(null);
    expect(tab.savedContents).toBe('after\n');
  });
});
