/**
 * Images never touch the text reader (Phase 12.10 item 1).
 *
 * That is the whole phase in one sentence, and it is invisible from the
 * outside: a regression that quietly routed a .png back through
 * `fs:readFile` would show the user "gmux edits text files only" again —
 * exactly the bug this phase exists to remove. So the tests assert on WHICH
 * BRIDGE METHOD was called, not just on what ended up in the tab.
 *
 * The second half covers the watcher: an agent that regenerates a chart must
 * change the picture on screen, which needs both a fresh read AND a bumped
 * revision (the asset URL is stable per path, so Chromium would otherwise
 * serve the cached bitmap forever).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImageReadResult } from '@shared/image-types';

const readFile = vi.fn();
const readImage = vi.fn();
const showHead = vi.fn();

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  gmux: {
    fs: { readFile, readImage, writeFile: vi.fn(), readDir: vi.fn() },
    git: { showHead, onChanged: () => () => undefined }
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

const { createTabIo } = await import('../tab-io');
type EditorTab = import('../store').EditorTab;

const OK: ImageReadResult = {
  status: 'ok',
  path: '/repo/docs/chart.png',
  mediaType: 'image/png',
  bytes: 4096,
  url: 'gmux-asset://local/repo/docs/chart.png',
  dataUrl: null
};

function imageTab(over: Partial<EditorTab> = {}): EditorTab {
  return {
    id: '/repo/docs/chart.png',
    path: '/repo/docs/chart.png',
    relPath: 'docs/chart.png',
    origRelPath: null,
    repoPath: '/repo',
    name: 'chart.png',
    mode: 'image',
    canDiff: false,
    markdown: false,
    image: true,
    svg: false,
    // Phase 20.5 added `html` to EditorTab. A .png is not a page.
    html: false,
    imageData: null,
    imageHead: null,
    imageRevision: 0,
    preview: false,
    commit: null,
    pendingSelection: null,
    pendingFocus: true,
    dirty: false,
    deleted: false,
    truncated: false,
    loading: true,
    error: null,
    savedContents: '',
    headContents: null,
    lastUsed: 0,
    contextEntry: null,
    ...over
  };
}

/** A tiny store stand-in: the tab list plus the patches applied to it. */
function harness(initial: EditorTab) {
  let tab = initial;
  const io = createTabIo({
    patch: (id, patch) => {
      if (id === tab.id) tab = { ...tab, ...patch };
    },
    byId: (id) => (id === tab.id ? tab : undefined),
    worktreeTabsIn: () => [tab]
  });
  return { io, get: () => tab };
}

beforeEach(() => {
  readFile.mockReset();
  readImage.mockReset();
  showHead.mockReset();
  readImage.mockResolvedValue(OK);
  readFile.mockResolvedValue({
    path: '/repo/docs/chart.png',
    contents: '',
    encoding: 'utf8',
    truncated: false
  });
  showHead.mockResolvedValue('');
});

describe('loading an image', () => {
  it('goes through fs:readImage and never fs:readFile', async () => {
    const h = harness(imageTab());
    await h.io.loadImage(h.get().id, h.get().path);

    expect(readImage).toHaveBeenCalledWith({ path: '/repo/docs/chart.png' });
    expect(readFile).not.toHaveBeenCalled();
    expect(h.get().imageData).toEqual(OK);
    expect(h.get().loading).toBe(false);
    expect(h.get().error).toBeNull();
  });

  it('marks the tab deleted when the file is gone', async () => {
    readImage.mockResolvedValue({ status: 'missing', path: '/x.png' });
    const h = harness(imageTab());
    await h.io.loadImage(h.get().id, h.get().path);
    expect(h.get().deleted).toBe(true);
  });

  it('surfaces a rejection as the tab friendly error', async () => {
    readImage.mockRejectedValue(new Error('boom'));
    const h = harness(imageTab());
    await h.io.loadImage(h.get().id, h.get().path);
    expect(h.get().loading).toBe(false);
    expect(h.get().error).toContain('boom');
  });
});

describe('the HEAD side', () => {
  it('asks for the blob at HEAD, by repo and repo-relative path', async () => {
    const h = harness(imageTab({ canDiff: true, mode: 'diff' }));
    await h.io.loadImageHead(h.get().id);
    expect(readImage).toHaveBeenCalledWith({
      path: '/repo/docs/chart.png',
      rev: 'HEAD',
      repoPath: '/repo',
      relPath: 'docs/chart.png'
    });
    expect(h.get().imageHead).toEqual(OK);
  });

  it("uses a rename's OLD path — the new one has no blob at HEAD", async () => {
    const h = harness(
      imageTab({ canDiff: true, mode: 'diff', origRelPath: 'docs/old.png' })
    );
    await h.io.loadImageHead(h.get().id);
    expect(readImage).toHaveBeenCalledWith(
      expect.objectContaining({ relPath: 'docs/old.png' })
    );
  });

  it('falls back to the plain viewer when HEAD cannot be read', async () => {
    readImage.mockRejectedValue(new Error('git failed'));
    const h = harness(imageTab({ canDiff: true, mode: 'diff' }));
    await h.io.loadImageHead(h.get().id);
    expect(h.get().mode).toBe('image');
    expect(h.get().canDiff).toBe(false);
  });
});

describe('the watcher refresh', () => {
  it('re-reads the image and bumps the revision, never reading text', async () => {
    const h = harness(imageTab({ imageData: OK, loading: false }));
    await h.io.refreshRepo('/repo');

    expect(readImage).toHaveBeenCalledTimes(1);
    // The three text-path calls a normal tab makes on refresh — existence
    // check, contents, HEAD — must all be absent for an image.
    expect(readFile).not.toHaveBeenCalled();
    expect(showHead).not.toHaveBeenCalled();
    expect(h.get().imageRevision).toBe(1);
  });

  it('refreshes the comparison too when the tab has one', async () => {
    const h = harness(
      imageTab({ imageData: OK, canDiff: true, mode: 'diff', loading: false })
    );
    await h.io.refreshRepo('/repo');
    expect(readImage).toHaveBeenCalledTimes(2);
    expect(readImage).toHaveBeenLastCalledWith(
      expect.objectContaining({ rev: 'HEAD' })
    );
  });

  it('leaves an SVG tab on the text path, where its Source mode lives', async () => {
    const h = harness(
      imageTab({
        id: '/repo/docs/d.svg',
        path: '/repo/docs/d.svg',
        relPath: 'docs/d.svg',
        name: 'd.svg',
        mode: 'preview',
        svg: true,
        loading: false
      })
    );
    await h.io.refreshRepo('/repo');
    expect(readImage).not.toHaveBeenCalled();
    expect(readFile).toHaveBeenCalled();
  });
});
