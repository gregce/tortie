/**
 * PHASE 336. A tab on another machine is an edit surface exactly when its file
 * is inside a project open on a confirmed machine, as a tab on this Mac is.
 *
 * His ruling (research 138 section 9): "Zero presses ... I want it to act like
 * i'm operating it locally." So nothing is turned on in Settings: opening the
 * project is the whole of it. Driven through the REAL editor store and tab IO,
 * with Monaco's buffer stubbed and `machines.reviewFile` / `putFile` answering:
 *
 *  1. A file in a project open on a confirmed machine: Monaco takes the
 *     keystroke (`tabIsReadOnly` false through `remoteTabWriteFolder`), the
 *     store lets the tab go dirty, and ⌘S sends it.
 *  2. A file outside every project opened there: read only, never dirty.
 *  3. A file in a project Tortie never writes in (a home itself): read only;
 *     a file in a project directly inside a home (`~/dev`, Phase 336.1) is an
 *     edit surface like any other.
 *  4. A machine whose details changed: read only, even with the project open.
 *  5. A 150,000-byte file in an open project: it OPENS (research 138 section
 *     9: never refused for opening because of the save cap), read only, marked
 *     `saveCapped`, and ⌘S sends nothing; the band the panel draws for it is
 *     the save-cap sentence, read off the panel's source in the order it
 *     stands.
 *
 * WHAT IT DOES NOT PROVE. Nothing here touches a machine; main decides every
 * write again, and the far side compares the folder's identity. The renderer
 * only draws, and this is the drawing's half.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const buffer = vi.hoisted(() => ({ text: 'typed\n' }));
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

type PutInput = import('@shared/ipc').MachineFilePutInput;
type PutResult = import('@shared/ipc').MachineFilePutResult;
const putFile = vi.fn(
  async (_input: PutInput): Promise<PutResult> => ({
    outcome: 'wrote',
    sha256: 'a'.repeat(64),
    bytes: 6,
    writeRoot: '/srv/greg/api'
  })
);
const reviewFile = vi.fn();
const writeFile = vi.fn(async () => undefined);

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  gmux: {
    fs: { readFile: vi.fn(), writeFile, readDir: vi.fn(), readImage: vi.fn() },
    git: { showHead: vi.fn(), onChanged: () => () => undefined },
    machines: { reviewFile, putFile }
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
const copy = await import('../../machines/editor');
type OpenFileRequest = import('../../state/open-file').OpenFileRequest;
type MachineStateView = import('@shared/ipc').MachineStateView;
type EditorTab = import('../tab-types').EditorTab;

const REPO = '/srv/greg/api';
const HOME = '/home/greg';
const HOME_CHILD = '/home/greg/api';
const LABEL = 'Studio';

function machine(over: Partial<MachineStateView> = {}): MachineStateView[] {
  return [
    {
      id: 'studio',
      label: LABEL,
      color: 'blue',
      link: 'connected',
      everAnswered: true,
      lastAnsweredAt: 0,
      detail: null,
      savesInProjects: true,
      writeRoot: null,
      ...over
    }
  ];
}

const project = (path: string) => ({
  id: `p:${path}`,
  path,
  name: 'api',
  machineId: 'studio'
});

function req(repo: string): OpenFileRequest {
  return {
    repoPath: repo,
    relPath: 'src/auth.ts',
    path: `${repo}/src/auth.ts`,
    mode: 'diff',
    source: 'machine',
    preview: false,
    remote: { machineId: 'studio', machineLabel: LABEL, repoPath: repo }
  };
}

function pair(bytes: number): unknown {
  return {
    oldContents: 'before\n',
    newContents: 'after\n',
    binary: false,
    truncated: false,
    note: null,
    bytes
  };
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

let toasts: string[] = [];

/** Open one file, type into it, and read what Monaco and the store say. */
async function openAndType(repo: string): Promise<{
  tab: EditorTab;
  readOnly: boolean;
  dirtyAfterTyping: boolean;
}> {
  useEditor.getState().openFromRequest(req(repo));
  await flush();
  const id = useEditor.getState().activeId as string;
  const app = useApp.getState();
  const tab = useEditor.getState().tabs.find((one) => one.id === id) as EditorTab;
  const readOnly = tabIsReadOnly(
    tab,
    remoteTabWriteFolder(tab, app.machineStates, app.projects)
  );
  useEditor.getState().markDirty(id, true);
  const after = useEditor.getState().tabs.find((one) => one.id === id);
  return { tab, readOnly, dirtyAfterTyping: after?.dirty ?? false };
}

beforeEach(() => {
  toasts = [];
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
  useApp.setState({
    machineStates: machine(),
    projects: [project(REPO)],
    toast: (_kind: string, text: string) => {
      toasts.push(text);
    }
  } as never);
  vi.clearAllMocks();
  reviewFile.mockResolvedValue(pair(6));
});

describe('a file in a project open on a confirmed machine', () => {
  it('is an edit surface, goes dirty, and saves with nothing asked', async () => {
    const seen = await openAndType(REPO);
    expect(seen.readOnly).toBe(false);
    expect(seen.dirtyAfterTyping).toBe(true);
    await useEditor.getState().save();
    expect(putFile).toHaveBeenCalledTimes(1);
    expect(writeFile).not.toHaveBeenCalled();
    expect(toasts).toEqual([]);
  });

  // Phase 336.1: the project he reported greyed out, ~/dev on his Mac Pro.
  it('is an edit surface in a project directly inside a home', async () => {
    useApp.setState({ projects: [project(HOME_CHILD)] } as never);
    const seen = await openAndType(HOME_CHILD);
    expect([seen.readOnly, seen.dirtyAfterTyping]).toEqual([false, true]);
    await useEditor.getState().save();
    expect(putFile).toHaveBeenCalledTimes(1);
    expect(toasts).toEqual([]);
  });
});

describe('a file Tortie will not save', () => {
  it('is read only and never dirty outside every project opened there', async () => {
    useApp.setState({ projects: [] } as never);
    const seen = await openAndType(REPO);
    expect([seen.readOnly, seen.dirtyAfterTyping]).toEqual([true, false]);
  });

  it('is read only in a project Tortie never writes in', async () => {
    useApp.setState({ projects: [project(HOME)] } as never);
    const seen = await openAndType(HOME);
    expect([seen.readOnly, seen.dirtyAfterTyping]).toEqual([true, false]);
  });

  it('is read only on a machine whose details changed, project open or not', async () => {
    useApp.setState({
      machineStates: machine({
        link: 'refused',
        confirmNeeded: 'changed',
        savesInProjects: false
      })
    } as never);
    const seen = await openAndType(REPO);
    expect([seen.readOnly, seen.dirtyAfterTyping]).toEqual([true, false]);
    await useEditor.getState().save();
    expect(putFile).not.toHaveBeenCalled();
    expect(toasts).toEqual([copy.remoteSaveUnconfirmed(LABEL)]);
  });
});

describe('a file larger than Tortie can save there', () => {
  it('opens read only with the save-cap mark, and a save sends nothing', async () => {
    reviewFile.mockResolvedValue(pair(150_000));
    const seen = await openAndType(REPO);
    expect(seen.tab.error).toBe(null);
    expect(seen.tab.savedContents).toBe('after\n');
    expect(seen.tab.saveCapped).toEqual({ bytes: 150_000, over: false });
    expect([seen.readOnly, seen.dirtyAfterTyping]).toEqual([true, false]);
    await useEditor.getState().save();
    expect(putFile).not.toHaveBeenCalled();
  });

  it('is read only by the mark alone, whatever folder holds it', () => {
    const tab = {
      deleted: false,
      truncated: false,
      commit: null,
      remote: { machineId: 'studio', machineLabel: LABEL, repoPath: REPO },
      saveCapped: { bytes: 150_000, over: false }
    } as unknown as EditorTab;
    expect(tabIsReadOnly(tab, REPO)).toBe(true);
    expect(tabIsReadOnly({ ...tab, saveCapped: undefined }, REPO)).toBe(false);
  });

  it('draws the save-cap band, before the cut-file band, from the mark', () => {
    // The panel is not rendered here, so its band chain is read off its
    // source: the save-cap band is composed from the mark's own bytes and
    // stands BEFORE the cut-file band, because a remote read cut at its
    // ceiling is also over the save cap and "over" is the true band for it.
    const source = readFileSync(
      resolve(__dirname, '../EditorPanel.tsx'),
      'utf8'
    );
    expect(source).toContain('remoteSaveCapChipOver(\n            activeTab.saveCapped.bytes,');
    expect(source).toContain(': remoteSaveCapChip(\n            activeTab.saveCapped.bytes,');
    const cap = source.indexOf(') : remoteCapBand !== null ? (');
    const cut = source.indexOf(') : activeTab.truncated ? (');
    const refused = source.indexOf(') : remoteRefusedBand !== null ? (');
    expect(cap).toBeGreaterThan(-1);
    expect(cap).toBeLessThan(cut);
    expect(cut).toBeLessThan(refused);
    expect(copy.remoteSaveCapChip(150_000, LABEL)).toBe(
      'That file is 150,000 bytes and Tortie saves files up to 90,000 bytes ' +
        'on Studio, so it is shown read only.'
    );
  });

  it('is the question MonacoHost asks, with the projects as well as the machine', () => {
    const source = readFileSync(resolve(__dirname, '../MonacoHost.tsx'), 'utf8');
    expect(source).toContain(
      'const remoteWriteFolder = remoteTabWriteFolder(tab, machineStates, projects);'
    );
    expect(source).toContain('const readOnly = tabIsReadOnly(tab, remoteWriteFolder);');
  });
});
