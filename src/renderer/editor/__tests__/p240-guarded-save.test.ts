/**
 * PHASE 240. What ⌘S does now, driven over the SHIPPING `save` (issue 16).
 *
 * Sean Johnson's sequence, measured at the parent in research 100 §1.1: a
 * tracked 455 B prose file, the person types seven characters, a `/bin/sh`
 * writes a 173 B paragraph into it from outside, six seconds of watcher ticks
 * pass with `savedContents` still 455 and the tab never seeing the write, then
 * ⌘S — and the file went 628 B to 462 B, the agent's paragraph gone, with zero
 * toasts, zero banners, no dialog, and the tab clean afterwards so nothing was
 * left to see.
 *
 * Every arm below is that sequence with one thing varied, and each one goes red
 * if the clause it names is taken out.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FsGuardedWriteResult } from '@shared/fs-ops';

const readFile = vi.fn(async () => ({ contents: 'on disk\n', truncated: false }));
const showHead = vi.fn(async () => '');
const readImage = vi.fn(async () => ({ status: 'ok' }));
const writeFile = vi.fn(async () => undefined);
const writeGuarded = vi.fn<(input: unknown) => Promise<FsGuardedWriteResult>>();
const readDir = vi.fn(async () => ({ entries: [{ name: 'notes.md' }] }));
const dispatched: unknown[] = [];

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: (e: CustomEvent) => {
    dispatched.push(e.detail);
    return true;
  },
  gmux: {
    fs: { readFile, readImage, writeFile, writeGuarded, readDir },
    git: { showHead, onChanged: () => () => undefined }
  }
});
vi.stubGlobal('CustomEvent', class {
  detail: unknown;
  constructor(_name: string, init: { detail: unknown }) {
    this.detail = init.detail;
  }
});
vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } }
});

const model = { getValue: () => BUFFER };
vi.mock('../monaco-loader', () => ({
  getWorkingModel: () => model,
  resetWorkingModel: () => undefined,
  disposeModels: () => undefined,
  dropViewState: () => undefined,
  loadMonaco: async () => undefined,
  rememberLoaded: () => undefined
}));

const { createTabIo } = await import('../tab-io');
const { useApp } = await import('../../state/store');
const { saveRefusalSentence } = await import('../save-sentences');
type EditorTab = import('../tab-types').EditorTab;
type ConfirmSpec = import('../../state/overlays-slice').ConfirmSpec;

const REPO = '/repo';
const PATH = '/repo/notes.md';
/** What Tortie last read, which is what the buffer was built from. */
const READ = 'The quick brown fox.\n';
/** The person's seven characters on top of it. */
let BUFFER = 'PERSON The quick brown fox.\n';
/** What the agent wrote while they were typing. */
const AGENT_DISK = 'The quick brown fox.\n\nA paragraph the agent added.\n';

function tabOf(over: Partial<EditorTab> = {}): EditorTab {
  return {
    id: PATH,
    path: PATH,
    relPath: 'notes.md',
    origRelPath: null,
    repoPath: REPO,
    name: 'notes.md',
    mode: 'file',
    canDiff: true,
    markdown: true,
    image: false,
    svg: false,
    html: false,
    imageData: null,
    imageHead: null,
    imageRevision: 0,
    preview: false,
    commit: null,
    pendingSelection: null,
    pendingFocus: true,
    dirty: true,
    deleted: false,
    truncated: false,
    loading: false,
    error: null,
    savedContents: READ,
    headContents: null,
    lastUsed: 0,
    contextEntry: null,
    ...over
  } as EditorTab;
}

let patches: Partial<EditorTab>[] = [];
function ioOver(tab: EditorTab): ReturnType<typeof createTabIo> {
  return createTabIo({
    patch: (_id, patch) => {
      patches.push(patch);
    },
    byId: () => tab,
    worktreeTabsIn: () => []
  });
}

const toasts = (): string[] =>
  useApp.getState().toasts.map((t: { text: string }) => t.text);
const confirm = (): ConfirmSpec | null => useApp.getState().confirm;

beforeEach(() => {
  vi.clearAllMocks();
  patches = [];
  dispatched.length = 0;
  BUFFER = 'PERSON The quick brown fox.\n';
  useApp.setState({ toasts: [], confirm: null });
});

describe('the ordinary save', () => {
  it('goes through the guarded channel with the digest of what Tortie last read', async () => {
    writeGuarded.mockResolvedValue({ outcome: 'wrote', sha256: 'new', bytes: 1 });
    expect(await ioOver(tabOf()).save(PATH)).toBe(true);
    expect(writeFile).not.toHaveBeenCalled();
    expect(writeGuarded).toHaveBeenCalledTimes(1);
    const sent = writeGuarded.mock.calls[0]?.[0] as {
      root: string;
      path: string;
      expect: string;
      contents: string;
    };
    expect(sent.root).toBe(REPO);
    expect(sent.path).toBe(PATH);
    expect(sent.contents).toBe(BUFFER);
    // sha256 of READ, computed here rather than copied, so the precondition is
    // re-derived rather than pinned to whatever the code happened to send.
    const want = [
      ...new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(READ))
      )
    ]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    expect(sent.expect).toBe(want);
    expect(patches).toEqual([{ savedContents: BUFFER, dirty: false }]);
    expect(toasts()).toEqual([]);
    expect(confirm()).toBeNull();
  });
});

describe('his sequence: the file changed while he was typing', () => {
  beforeEach(() => {
    writeGuarded.mockResolvedValue({
      outcome: 'stale',
      sha256: 'digest-of-the-agents-bytes',
      reason: 'the file changed'
    });
  });

  it('writes NOTHING, keeps the tab dirty, and asks instead of saying nothing', async () => {
    expect(await ioOver(tabOf()).save(PATH)).toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
    // Nothing was patched, so `dirty` is still true and the person still has
    // their typing. At the parent the tab went clean and there was nothing
    // left to see.
    expect(patches).toEqual([]);
    const spec = confirm();
    expect(spec).not.toBeNull();
    expect(spec?.title).toBe("'notes.md' changed on disk");
    expect(spec?.body).toContain('nothing was saved');
  });

  it('offers three answers, and the default is not Overwrite', async () => {
    // ConfirmDialog focuses the confirm button and a bare Return runs it, so
    // the confirm label IS the default. Cancel is the dialog's own middle
    // button and needs no wiring here.
    await ioOver(tabOf()).save(PATH);
    const spec = confirm();
    expect(spec?.confirmLabel).toBe('Compare');
    expect(spec?.altLabel).toBe('Overwrite');
    expect(spec?.destructive).toBeUndefined();
  });

  it('Cancel leaves the file and the buffer exactly as they were', async () => {
    await ioOver(tabOf()).save(PATH);
    // Cancel runs neither callback — ConfirmDialog just clears the spec.
    useApp.setState({ confirm: null });
    expect(writeGuarded).toHaveBeenCalledTimes(1);
    expect(writeFile).not.toHaveBeenCalled();
    expect(patches).toEqual([]);
  });

  it('Compare opens the two versions, reading the disk side at the press', async () => {
    readFile.mockResolvedValue({ contents: AGENT_DISK, truncated: false });
    await ioOver(tabOf()).save(PATH);
    confirm()?.onConfirm();
    await new Promise((r) => setTimeout(r, 0));
    expect(dispatched.length).toBe(1);
    const req = dispatched[0] as {
      path: string;
      preview: boolean;
      compare: { left: string; right: string };
    };
    expect(req.path).toBe(PATH);
    expect(req.preview).toBe(false);
    expect(req.compare.left).toBe(AGENT_DISK);
    expect(req.compare.right).toBe(BUFFER);
    // A look writes nothing.
    expect(writeGuarded).toHaveBeenCalledTimes(1);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('Compare says so rather than drawing half a file when the read is truncated', async () => {
    readFile.mockResolvedValue({ contents: AGENT_DISK, truncated: true });
    await ioOver(tabOf()).save(PATH);
    confirm()?.onConfirm();
    await new Promise((r) => setTimeout(r, 0));
    expect(dispatched.length).toBe(0);
    expect(toasts()).toEqual([saveRefusalSentence('tooLarge', 'notes.md')]);
  });

  it('Overwrite is a second guarded write, against what was JUST read', async () => {
    await ioOver(tabOf()).save(PATH);
    writeGuarded.mockResolvedValue({ outcome: 'wrote', sha256: 'newer', bytes: 1 });
    confirm()?.onAlt?.();
    await new Promise((r) => setTimeout(r, 0));
    expect(writeGuarded).toHaveBeenCalledTimes(2);
    const second = writeGuarded.mock.calls[1]?.[0] as { expect: string };
    // Not the digest of `savedContents` again — the digest the channel handed
    // back with `stale`, which is what the file holds now. Charter item 3.
    expect(second.expect).toBe('digest-of-the-agents-bytes');
    expect(patches).toEqual([{ savedContents: BUFFER, dirty: false }]);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('a THIRD writer between the choice and the click is caught, not lost', async () => {
    await ioOver(tabOf()).save(PATH);
    // Somebody writes again while the dialog is up. The second guarded write
    // is refused against the digest it was given, and the same choice is
    // offered over the newer bytes rather than the write landing.
    writeGuarded.mockResolvedValue({
      outcome: 'stale',
      sha256: 'a-third-writers-bytes',
      reason: 'the file changed again'
    });
    confirm()?.onAlt?.();
    await new Promise((r) => setTimeout(r, 0));
    expect(patches).toEqual([]);
    expect(confirm()?.title).toBe("'notes.md' changed on disk");
    // And the loop terminates: with no further writer, the next Overwrite goes.
    writeGuarded.mockResolvedValue({ outcome: 'wrote', sha256: 'ok', bytes: 1 });
    confirm()?.onAlt?.();
    await new Promise((r) => setTimeout(r, 0));
    const third = writeGuarded.mock.calls[2]?.[0] as { expect: string };
    expect(third.expect).toBe('a-third-writers-bytes');
    expect(patches).toEqual([{ savedContents: BUFFER, dirty: false }]);
  });
});

describe('the other words each get their own sentence', () => {
  for (const why of [
    'outside',
    'missing',
    'readOnly',
    'tooLarge',
    'notUtf8',
    'raced',
    'input',
    'io'
  ] as const) {
    it(`${why} is said out loud and nothing is written`, async () => {
      writeGuarded.mockResolvedValue({ outcome: 'refused', why, reason: 'x' });
      expect(await ioOver(tabOf()).save(PATH)).toBe(false);
      expect(toasts()).toEqual([saveRefusalSentence(why, 'notes.md')]);
      expect(writeFile).not.toHaveBeenCalled();
      expect(patches).toEqual([]);
    });
  }

  it('never says the generic sentence it replaced', async () => {
    writeGuarded.mockResolvedValue({ outcome: 'refused', why: 'readOnly', reason: 'x' });
    await ioOver(tabOf()).save(PATH);
    expect(toasts()[0]).not.toContain('Could not save this file');
  });
});

describe('the shapes that keep the plain door', () => {
  beforeEach(() => {
    // The plain door reads before it writes now, so every arm here says what
    // the file holds. Unchanged unless the arm says otherwise.
    readFile.mockResolvedValue({ contents: READ, truncated: false });
  });

  it('a file OUTSIDE every open project saves exactly as it does today', async () => {
    const tab = tabOf({ path: '/Users/op/.claude/CLAUDE.md', name: 'CLAUDE.md' });
    expect(await ioOver(tab).save(tab.id)).toBe(true);
    expect(writeGuarded).not.toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalledWith('/Users/op/.claude/CLAUDE.md', BUFFER);
    expect(patches).toEqual([{ savedContents: BUFFER, dirty: false }]);
  });

  it('a SYMBOLIC LINK falls back rather than refusing a save that loses nothing', async () => {
    writeGuarded.mockResolvedValue({ outcome: 'refused', why: 'link', reason: 'x' });
    expect(await ioOver(tabOf()).save(PATH)).toBe(true);
    expect(writeFile).toHaveBeenCalledWith(PATH, BUFFER);
    expect(toasts()).toEqual([]);
    expect(patches).toEqual([{ savedContents: BUFFER, dirty: false }]);
  });
});

/**
 * PHASE 240 FIX ROUND. The four shapes the first round got wrong, each
 * measured before it was fixed and each red without the clause it names.
 */
describe('the fix round', () => {
  it('a SYMBOLIC LINK is checked before the plain write, not written blind', async () => {
    // Measured in the running app at 3efc8db2: typed into a symlinked file, a
    // /bin/sh wrote 17 bytes into the link's target, ⌘S, and the write was
    // gone with no dialog, no toast and a clean tab. It is issue 16 on a file
    // that happens to be a link.
    writeGuarded.mockResolvedValue({ outcome: 'refused', why: 'link', reason: 'x' });
    readFile.mockResolvedValue({ contents: AGENT_DISK, truncated: false });
    expect(await ioOver(tabOf()).save(PATH)).toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
    expect(patches).toEqual([]);
    expect(confirm()?.title).toBe("'notes.md' changed on disk");
  });

  it('and its Overwrite writes, because a plain door has nothing to swap against', async () => {
    writeGuarded.mockResolvedValue({ outcome: 'refused', why: 'link', reason: 'x' });
    readFile.mockResolvedValue({ contents: AGENT_DISK, truncated: false });
    await ioOver(tabOf()).save(PATH);
    confirm()?.onAlt?.();
    await new Promise((r) => setTimeout(r, 0));
    expect(writeFile).toHaveBeenCalledWith(PATH, BUFFER);
    expect(patches).toEqual([{ savedContents: BUFFER, dirty: false }]);
  });

  it('a file OUTSIDE every project is checked too, which is where an agent edits CLAUDE.md', async () => {
    const tab = tabOf({ path: '/Users/op/.claude/CLAUDE.md', name: 'CLAUDE.md' });
    readFile.mockResolvedValue({ contents: AGENT_DISK, truncated: false });
    expect(await ioOver(tab).save(tab.id)).toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
    expect(confirm()?.title).toBe("'CLAUDE.md' changed on disk");
  });

  it('a DRAFT that has never been saved still saves, and asks nothing', async () => {
    // Phase 63's "Draft a contract". The file does not exist, so the guarded
    // channel answers `missing` and the drafted contract could not be saved at
    // all. `readFile` rejecting is what "there is no file there" looks like.
    readFile.mockRejectedValue(new Error('ENOENT'));
    const tab = tabOf({ draft: 'skeleton\n', savedContents: '' });
    expect(await ioOver(tab).save(PATH)).toBe(true);
    expect(writeGuarded).not.toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalledWith(PATH, BUFFER);
    expect(toasts()).toEqual([]);
    expect(patches).toEqual([{ savedContents: BUFFER, dirty: false }]);
  });

  it('a DRAFT whose path grew a file since it opened asks rather than clobbering it', async () => {
    readFile.mockResolvedValue({ contents: AGENT_DISK, truncated: false });
    const tab = tabOf({ draft: 'skeleton\n', savedContents: '' });
    expect(await ioOver(tab).save(PATH)).toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
    expect(confirm()?.title).toBe("'notes.md' changed on disk");
  });

  it('a file that is NOT UTF-8 hears why, and never "changed on disk"', async () => {
    // The precondition is the digest of the DECODED text and the channel
    // hashes the RAW BYTES, so a file that does not survive the round trip is
    // answered `stale` for ever. Measured on a 49 B latin-1 .txt nobody had
    // written to: the dialog said it changed on disk, which is false, and the
    // true sentence only arrived behind Overwrite.
    writeGuarded.mockResolvedValue({
      outcome: 'stale',
      sha256: 'digest-of-the-raw-bytes',
      reason: 'the file changed'
    });
    readFile.mockResolvedValue({ contents: READ, truncated: false });
    expect(await ioOver(tabOf()).save(PATH)).toBe(false);
    expect(confirm()).toBeNull();
    expect(toasts()).toEqual([saveRefusalSentence('notUtf8', 'notes.md')]);
    expect(writeFile).not.toHaveBeenCalled();
    expect(patches).toEqual([]);
  });

  it('and a file that really DID change still gets the choice', async () => {
    writeGuarded.mockResolvedValue({
      outcome: 'stale',
      sha256: 'digest-of-the-agents-bytes',
      reason: 'the file changed'
    });
    readFile.mockResolvedValue({ contents: AGENT_DISK, truncated: false });
    expect(await ioOver(tabOf()).save(PATH)).toBe(false);
    expect(confirm()?.title).toBe("'notes.md' changed on disk");
    expect(toasts()).toEqual([]);
  });

  it('a tab whose PROJECT WAS CLOSED says so and names the remedy', async () => {
    writeGuarded.mockResolvedValue({ outcome: 'refused', why: 'outside', reason: 'x' });
    expect(await ioOver(tabOf()).save(PATH)).toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
    expect(patches).toEqual([]);
    expect(toasts()).toEqual([saveRefusalSentence('outside', 'notes.md')]);
    expect(toasts()[0]).toContain('open it again and save');
  });
});
