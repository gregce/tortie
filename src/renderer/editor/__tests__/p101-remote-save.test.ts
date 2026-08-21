/**
 * PHASE 101. Pressing Save on a tab whose file is on another machine.
 *
 * WHAT THIS PROVES, and it is four things.
 *
 *  1. `fs.writeFile` is never called. Not once, in any case below. The bytes
 *     go through `machines.putFile` or they go nowhere, and a path on another
 *     computer handed to this Mac's writer would land on whatever this Mac
 *     happens to hold at that name.
 *  2. A machine with no confirmed folder refuses, sends nothing, and says the
 *     one thing a person can do about it.
 *  3. A machine WITH a confirmed folder saves, and the tab comes back clean.
 *  4. Every refusal word main can answer with reaches the person as its own
 *     sentence, and the tab is left exactly as it was in every one of them.
 *
 * WHAT IT DOES NOT PROVE. Nothing here touches a machine. The far side, the
 * script, the checksum comparison and the folder containment are main's, and
 * they are driven live by the phase's own probe.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Monaco does not run here, so the working buffer is stubbed. It is the ONE
 * thing this file fakes past the bridge, and it fakes only `getValue`, because
 * the buffer's text is the input to the save and nothing else about the editor
 * is read on this path.
 */
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

const writeFile = vi.fn(async () => undefined);
type PutInput = import('@shared/ipc').MachineFilePutInput;
type PutResult = import('@shared/ipc').MachineFilePutResult;
const putFile = vi.fn(
  async (_input: PutInput): Promise<PutResult> => ({
    outcome: 'wrote',
    sha256: 'a'.repeat(64),
    bytes: 6,
    writeRoot: '/home/greg'
  })
);
const reviewFile = vi.fn(async () => ({
  oldContents: 'before\n',
  newContents: 'after\n',
  binary: false,
  truncated: false,
  note: null as string | null,
  bytes: 6
}));

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
const copy = await import('../../app/machine-copy');
type OpenFileRequest = import('../../state/open-file').OpenFileRequest;
type MachineStateView = import('@shared/ipc').MachineStateView;

const REMOTE = {
  machineId: 'studio',
  machineLabel: 'Studio',
  repoPath: '/home/greg/api'
};
const ROOT = '/home/greg';

/** One machine's link state, with or without a folder Tortie may save under. */
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

function reviewReq(over: Partial<OpenFileRequest> = {}): OpenFileRequest {
  return {
    repoPath: REMOTE.repoPath,
    relPath: 'src/auth.ts',
    path: `${REMOTE.repoPath}/src/auth.ts`,
    mode: 'diff',
    source: 'machine',
    preview: false,
    remote: REMOTE,
    ...over
  };
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

let toasts: { kind: string; text: string }[] = [];

/** Open the tab, with a buffer holding text the person typed. */
async function openDirty(): Promise<string> {
  useEditor.getState().openFromRequest(reviewReq());
  await flush();
  return useEditor.getState().activeId as string;
}

beforeEach(() => {
  toasts = [];
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
  useApp.setState({
    machineStates: states(null),
    toast: (kind: string, text: string) => {
      toasts.push({ kind, text });
    }
  } as never);
  vi.clearAllMocks();
});

describe('a machine nobody has let Tortie save on', () => {
  it('sends nothing and names the one thing a person can do', async () => {
    await openDirty();
    await useEditor.getState().save();
    expect(putFile).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
    expect(toasts).toEqual([
      { kind: 'error', text: copy.remoteSaveRefused('Studio') }
    ]);
  });

  it('reads an empty folder as no folder at all', async () => {
    useApp.setState({ machineStates: states('') } as never);
    await openDirty();
    await useEditor.getState().save();
    expect(putFile).not.toHaveBeenCalled();
  });
});

describe('a machine that carries a confirmed folder', () => {
  beforeEach(() => {
    useApp.setState({ machineStates: states(ROOT) } as never);
  });

  it('saves through the one channel that can write over there', async () => {
    const id = await openDirty();
    await useEditor.getState().save();
    expect(writeFile).not.toHaveBeenCalled();
    expect(putFile).toHaveBeenCalledTimes(1);
    const sent = putFile.mock.calls[0]?.[0] as PutInput;
    expect(sent.machineId).toBe('studio');
    expect(sent.path).toBe('/home/greg/api/src/auth.ts');
    expect(sent.contents).toBe('typed\n');
    // The checksum of what Tortie READ, and never of what it is sending.
    expect(sent.expect).toMatch(/^[0-9a-f]{64}$/);
    expect(sent.expect).not.toBe('new');
    const tab = useEditor.getState().tabs.find((one) => one.id === id);
    expect([tab?.dirty, tab?.savedContents]).toEqual([false, 'typed\n']);
  });

  it('shows nothing at all when the save lands', async () => {
    await openDirty();
    await useEditor.getState().save();
    expect(toasts).toEqual([]);
  });

  it('never sends a folder, because main reads the confirmed one', async () => {
    // The call carries four things and none of them is the folder. Main reads
    // the confirmed folder off the row on disk at call time, which is the only
    // reading of it that an agreement covers. The path below starts with the
    // folder because the file is inside it, and that is a fact about the file
    // rather than a field.
    await openDirty();
    await useEditor.getState().save();
    expect(Object.keys(putFile.mock.calls[0]?.[0] ?? {}).sort()).toEqual([
      'contents',
      'expect',
      'machineId',
      'path'
    ]);
  });

  const refusals = [
    ['stale', copy.remoteSaveStale('Studio')],
    ['missing', copy.remoteSaveMissing('Studio')],
    ['exists', copy.remoteCreateExists(ROOT, 'Studio')],
    ['nomode', copy.remoteSaveNoMode('Studio')],
    ['nosum', copy.remoteSaveNoSum('Studio')],
    ['outsideRoot', copy.remoteSaveOutsideRoot(ROOT, 'Studio')],
    ['writesOff', copy.remoteSaveRefused('Studio')]
  ] as const;

  for (const [word, sentence] of refusals) {
    it(`says the sentence for ${word} and leaves the tab dirty`, async () => {
      putFile.mockResolvedValueOnce({
        outcome: word,
        sha256: null,
        bytes: null,
        writeRoot: ROOT
      });
      const id = await openDirty();
      await useEditor.getState().save();
      expect(toasts).toEqual([{ kind: 'error', text: sentence }]);
      const tab = useEditor.getState().tabs.find((one) => one.id === id);
      expect(tab?.savedContents).toBe('after\n');
    });
  }

  // FIX ROUND. `build/probe-p101-save.mjs` leg 14 killed a real ssh over a real
  // link while the far side was decoding an 89,000 byte payload, and the far
  // side replaced the file in full. So a save whose answer never arrived may
  // not be reported as a save that did not happen.
  it('never says the save failed when the answer was lost', async () => {
    putFile.mockRejectedValueOnce(
      new Error(
        'Command failed: /usr/bin/ssh -o BatchMode=yes -o ConnectTimeout=10 ' +
          '-o StrictHostKeyChecking=yes -o UserKnownHostsFile="/tmp/x" -o ' +
          'ControlMaster=auto -o ControlPath=/tmp/y -o ControlPersist=60s'
      )
    );
    await openDirty();
    await useEditor.getState().save();
    expect(toasts).toEqual([
      { kind: 'error', text: copy.remoteSaveLostAnswer('Studio') }
    ]);
    expect(toasts[0]?.text).not.toContain('Nothing was written');
    expect(toasts[0]?.text).not.toContain('Could not save');
  });

  it("shows main's own sentence when the answer carries one", async () => {
    putFile.mockRejectedValueOnce(
      new Error(
        'Studio did not answer while this file was being saved, so it may ' +
          'have been saved there. Open it again to read what it says now.'
      )
    );
    await openDirty();
    await useEditor.getState().save();
    expect(toasts[0]?.text).toBe(
      'Studio did not answer while this file was being saved, so it may have ' +
        'been saved there. Open it again to read what it says now.'
    );
  });

  it('names the file size main measured when it is too large', async () => {
    putFile.mockResolvedValueOnce({
      outcome: 'tooLarge',
      sha256: null,
      bytes: 96_231,
      writeRoot: ROOT
    });
    await openDirty();
    await useEditor.getState().save();
    expect(toasts).toEqual([
      { kind: 'error', text: copy.remoteSaveTooLarge(96_231, 'Studio') }
    ]);
  });
});
