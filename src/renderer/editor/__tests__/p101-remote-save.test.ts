/**
 * PHASE 101. Pressing Save on a tab whose file is on another machine.
 *
 * WHAT THIS PROVES, and it is four things.
 *
 *  1. `fs.writeFile` is never called. Not once, in any case below. The bytes
 *     go through `machines.putFile` or they go nowhere, and a path on another
 *     computer handed to this Mac's writer would land on whatever this Mac
 *     happens to hold at that name.
 *  2. A file outside every project opened on that machine, or on a machine
 *     that is not confirmed right now, refuses, sends nothing, and says which
 *     folders Tortie saves in, with no button: PHASE 336 took "Open settings"
 *     off, because nothing in Settings turns saving on any more.
 *  3. A file inside a project open on a confirmed machine saves, with nothing
 *     asked, as on this Mac (Phase 336), and so does a file under a folder a
 *     person typed in an earlier build; the tab comes back clean.
 *  4. Every refusal word main can answer with reaches the person as its own
 *     sentence, and the tab is left exactly as it was in every one of them.
 *
 * WHAT IT DOES NOT PROVE. Nothing here touches a machine. The far side, the
 * script, the checksum comparison and the folder containment are main's, and
 * they are driven live by the phase's own probe.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Monaco does not run here, so the working buffer is stubbed. It is the ONE
 * thing this file fakes past the bridge, and it fakes only `getValue`, because
 * the buffer's text is the input to the save and nothing else about the editor
 * is read on this path.
 */
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

const writeFile = vi.fn(async () => undefined);
/**
 * PHASE 229 gave the refusal toast a button that pressed this. PHASE 336 took
 * the button off, and the bridge keeps the method so a press would be seen.
 */
const openSettings = vi.fn(async () => undefined);
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
    machines: { reviewFile, putFile },
    openSettings
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
const copy = await import('../../machines/editor');
const { onRemoteWrite } = await import('../../machines/remote-writes');
type RemoteWrite = import('../../machines/remote-writes').RemoteWrite;
type OpenFileRequest = import('../../state/open-file').OpenFileRequest;
type MachineStateView = import('@shared/ipc').MachineStateView;

const REMOTE = {
  machineId: 'studio',
  machineLabel: 'Studio',
  repoPath: '/home/greg/code/api'
};
const ROOT = '/home/greg';
/** PHASE 336. The project open on that machine, which holds the file. */
const PROJECT = {
  id: 'p-api',
  path: '/home/greg/code/api',
  name: 'api',
  machineId: 'studio'
};

/**
 * One machine's link state. `writeRoot` is a folder typed in an earlier build,
 * and `saves` is main's statement that the row is confirmed (Phase 336).
 */
function states(
  writeRoot: string | null,
  saves?: boolean
): MachineStateView[] {
  return [
    {
      id: 'studio',
      label: 'Studio',
      color: 'blue',
      link: 'connected',
      everAnswered: true,
      lastAnsweredAt: 0,
      detail: null,
      writeRoot,
      ...(saves === undefined ? {} : { savesInProjects: saves })
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
/**
 * PHASE 229. The options each toast was shown with, in the same order, so the
 * refusal's button can be read and pressed.
 */
type ToastOpts = {
  sticky?: boolean;
  action?: { label: string; run: () => void };
};
let toastOpts: (ToastOpts | undefined)[] = [];

/** Open the tab, with a buffer holding text the person typed. */
async function openDirty(): Promise<string> {
  useEditor.getState().openFromRequest(reviewReq());
  await flush();
  return useEditor.getState().activeId as string;
}

beforeEach(() => {
  toasts = [];
  toastOpts = [];
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
  useApp.setState({
    machineStates: states(null),
    projects: [],
    toast: (kind: string, text: string, opts?: ToastOpts) => {
      toasts.push({ kind, text });
      toastOpts.push(opts);
    }
  } as never);
  vi.clearAllMocks();
});

describe('a file outside every project opened on a confirmed machine', () => {
  beforeEach(() => {
    useApp.setState({ machineStates: states(null, true), projects: [] } as never);
  });

  it('sends nothing and says which folders Tortie saves in', async () => {
    await openDirty();
    await useEditor.getState().save();
    expect(putFile).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
    expect(toasts).toEqual([
      { kind: 'error', text: copy.remoteSaveOutsideProjects('Studio') }
    ]);
  });

  /**
   * PHASE 336 TOOK THE BUTTON OFF. Phase 229 gave this toast "Open settings",
   * because the one door that turned saving on was in Settings. That door is
   * gone, so the toast carries no action at all, stays sticky, and names no
   * Settings.
   */
  it('carries no button and names no Settings', async () => {
    await openDirty();
    await useEditor.getState().save();
    expect(toastOpts).toHaveLength(1);
    const opts = toastOpts[0];
    expect(opts?.sticky).toBe(true);
    expect(opts?.action).toBeUndefined();
    expect(toasts[0]?.text).not.toContain('Settings');
    expect(openSettings).not.toHaveBeenCalled();
  });

  it('reads an empty typed folder as no folder at all', async () => {
    useApp.setState({ machineStates: states('', true) } as never);
    await openDirty();
    await useEditor.getState().save();
    expect(putFile).not.toHaveBeenCalled();
  });
});

describe('a machine that is not confirmed right now (Phase 336)', () => {
  it('sends nothing even with the project open, and says so', async () => {
    useApp.setState({
      machineStates: states(null, false),
      projects: [PROJECT]
    } as never);
    await openDirty();
    await useEditor.getState().save();
    expect(putFile).not.toHaveBeenCalled();
    expect(toasts).toEqual([
      { kind: 'error', text: copy.remoteSaveUnconfirmed('Studio') }
    ]);
    expect(toasts[0]?.text).not.toContain('Settings');
  });
});

describe('a project open on a confirmed machine (Phase 336)', () => {
  it('saves with nothing asked, as on this Mac', async () => {
    useApp.setState({
      machineStates: states(null, true),
      projects: [PROJECT]
    } as never);
    const id = await openDirty();
    await useEditor.getState().save();
    expect(writeFile).not.toHaveBeenCalled();
    expect(putFile).toHaveBeenCalledTimes(1);
    expect(toasts).toEqual([]);
    const tab = useEditor.getState().tabs.find((one) => one.id === id);
    expect([tab?.dirty, tab?.savedContents]).toEqual([false, 'typed\n']);
  });

  it("does not let another machine's project stand in for this one's", async () => {
    useApp.setState({
      machineStates: states(null, true),
      projects: [{ ...PROJECT, machineId: 'elsewhere' }]
    } as never);
    await openDirty();
    await useEditor.getState().save();
    expect(putFile).not.toHaveBeenCalled();
  });
});

describe('a machine that carries a folder typed in an earlier build', () => {
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
    expect(sent.path).toBe('/home/greg/code/api/src/auth.ts');
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

  it('never sends a folder, because main chooses it', async () => {
    // The call carries four things and none of them is the folder. Main
    // chooses the folder at call time from the machine's row and the projects
    // open on it (Phase 336). The path below starts with the folder because
    // the file is inside it, and that is a fact about the file rather than a
    // field.
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
    // PHASE 336. `writesOff` naming a folder is the never-list; with none it
    // is outside every project (the next test). The two new words.
    ['writesOff', copy.remoteSaveNever('Studio')],
    ['folderChanged', copy.remoteSaveFolderChanged(ROOT, 'Studio')],
    ['protected', copy.remoteSaveProtected('Studio')]
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

  it('says outside every project for writesOff naming no folder', async () => {
    putFile.mockResolvedValueOnce({
      outcome: 'writesOff',
      sha256: null,
      bytes: null,
      writeRoot: null
    });
    await openDirty();
    await useEditor.getState().save();
    expect(toasts).toEqual([
      { kind: 'error', text: copy.remoteSaveOutsideProjects('Studio') }
    ]);
  });

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

/**
 * PHASE 230, AND THIS BLOCK IS THE FIX ROUND'S. A save that lands on a machine
 * announces itself, so every remote view of that machine reads again.
 *
 * WHY IT IS HERE RATHER THAN IN THE APP RUN. Research 89 section 4.4 measured
 * a file saved by this door absent from Source control for 30 seconds, and it
 * is the one write flavour the phase's app run could not reach: Monaco never
 * mounted under the harness, the verifier read `.ed-host` at 50 ms and then no
 * editor, and the fix round's own drive read the same, so `Cmd+S` on a real
 * remote file is measured by nothing live. This file already drives the REAL
 * `save` in ../tab-io.ts with the buffer stubbed and `putFile` answering, so
 * the announcement is pinned where the save actually happens. What it does not
 * prove is the editor, the far side or the redraw; the redraw from an
 * announcement is ../../machines/__tests__/p230-reread.test.ts's.
 *
 * The four cases are the charter's rule, being that a write announces when it
 * ANSWERS with one of its landing words. A refusal announces nothing, because
 * nothing changed over there. A lost answer announces nothing either, and that
 * is deliberate rather than an oversight: `putFile` throwing means the file MAY
 * have been written, the person is told exactly that, and the view reads again
 * the moment they look at it, which is the whole of this phase.
 */
describe('the announcement a landed save makes (Phase 230)', () => {
  let heard: RemoteWrite[] = [];
  let stop: () => void = () => undefined;

  beforeEach(() => {
    heard = [];
    stop = onRemoteWrite((one) => {
      heard.push(one);
    });
    useApp.setState({ machineStates: states(ROOT) } as never);
  });
  afterEach(() => {
    stop();
  });

  it('hands every remote view one write, naming the file and the editor', async () => {
    await openDirty();
    await useEditor.getState().save();
    expect(putFile).toHaveBeenCalledTimes(1);
    expect(heard).toEqual([
      {
        machineId: 'studio',
        path: '/home/greg/code/api/src/auth.ts',
        kind: 'file',
        by: 'editor'
      }
    ]);
  });

  it('announces nothing when the machine refused the write', async () => {
    putFile.mockResolvedValueOnce({
      outcome: 'stale',
      sha256: null,
      bytes: null,
      writeRoot: ROOT
    });
    await openDirty();
    await useEditor.getState().save();
    expect(toasts).toEqual([
      { kind: 'error', text: copy.remoteSaveStale('Studio') }
    ]);
    expect(heard).toEqual([]);
  });

  it('announces nothing for a file outside every project, because nothing was sent', async () => {
    useApp.setState({ machineStates: states(null, true) } as never);
    await openDirty();
    await useEditor.getState().save();
    expect(putFile).not.toHaveBeenCalled();
    expect(heard).toEqual([]);
  });

  it('announces nothing when the answer was lost, and says so instead', async () => {
    // The shape a killed ssh really answers with, the same one the lost
    // answer case above is driven by, machinery and all.
    putFile.mockRejectedValueOnce(
      new Error(
        'Command failed: /usr/bin/ssh -o BatchMode=yes -o ConnectTimeout=10 ' +
          '-o StrictHostKeyChecking=yes -o UserKnownHostsFile="/tmp/x" -o ' +
          'ControlMaster=auto -o ControlPath=/tmp/y -o ControlPersist=60s'
      )
    );
    await openDirty();
    await useEditor.getState().save();
    expect(heard).toEqual([]);
    expect(toasts).toEqual([
      { kind: 'error', text: copy.remoteSaveLostAnswer('Studio') }
    ]);
  });
});
