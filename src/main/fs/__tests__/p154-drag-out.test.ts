/**
 * `fs:startDrag` — the row you drag OUT to Finder (Phase 154).
 *
 * The Electron surface is injected, so every refusal below is measured
 * without an Electron: what is asserted each time is that `startDrag` was
 * NEVER CALLED, because the only thing that matters about a refusal here is
 * that no path left the process.
 *
 * What this file cannot prove, and the phase says so rather than pretending:
 * a native macOS drag loop needs a real mouse and there is no automation for
 * one in this tree, so the file arriving in Finder is an operator step. What
 * IS proved here is every refusal, the icon fallback, and the exact arguments
 * `startDrag` is reached with.
 */

import {
  mkdtemp,
  mkdir,
  realpath,
  rm,
  symlink,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { GmuxErrorPayload } from '@shared/types';
import { MAX_DRAG_OUT_PATHS } from '@shared/fs-ops';
import type { DragOutItem, DragOutService } from '../drag-out';
import { createDragOut } from '../drag-out';

let scratch: string;
let root: string;
let outside: string;
let started: DragOutItem[];
let iconAsked: string[];
let drag: DragOutService;

/** A NativeImage stand-in: the module only ever asks it `isEmpty`. */
function image(empty: boolean): { isEmpty: () => boolean; tag: string } {
  return { isEmpty: () => empty, tag: empty ? 'empty' : 'real' };
}

function build(over: Partial<Parameters<typeof createDragOut>[0]> = {}): DragOutService {
  return createDragOut({
    listProjectRoots: async () => [root],
    fileIcon: async (path) => {
      iconAsked.push(path);
      return image(false);
    },
    placeholderIcon: () => image(false),
    startDrag: (item) => {
      started.push(item);
    },
    ...over
  });
}

beforeEach(async () => {
  scratch = await realpath(await mkdtemp(join(tmpdir(), 'gmux-p154drag-')));
  root = join(scratch, 'proj');
  outside = join(scratch, 'elsewhere');
  started = [];
  iconAsked = [];
  await mkdir(join(root, 'src'), { recursive: true });
  await mkdir(join(root, '.git', 'hooks'), { recursive: true });
  await mkdir(outside, { recursive: true });
  await writeFile(join(root, 'README.md'), 'readme', 'utf8');
  await writeFile(join(root, 'src', 'index.ts'), 'index', 'utf8');
  await writeFile(join(root, '.git', 'config'), 'secret', 'utf8');
  await writeFile(join(outside, 'id_rsa'), 'A PRIVATE KEY', 'utf8');
  drag = build();
});

afterEach(async () => {
  await rm(scratch, { recursive: true, force: true });
});

async function payloadOf(promise: Promise<unknown>): Promise<GmuxErrorPayload> {
  try {
    await promise;
  } catch (err) {
    return JSON.parse((err as Error).message) as GmuxErrorPayload;
  }
  throw new Error('expected a rejection');
}

describe('what it hands over', () => {
  it('reaches startDrag with absolute paths and a non empty icon', async () => {
    await drag.begin({ root, paths: ['src/index.ts'] });
    expect(started).toHaveLength(1);
    expect(started[0]?.file).toBe(join(root, 'src', 'index.ts'));
    expect(started[0]?.files).toEqual([join(root, 'src', 'index.ts')]);
    expect((started[0]?.icon as { tag: string }).tag).toBe('real');
    expect(iconAsked).toEqual([join(root, 'src', 'index.ts')]);
  });

  it('carries a whole selection, with the first entry as `file`', async () => {
    await drag.begin({ root, paths: ['src/index.ts', 'README.md'] });
    expect(started[0]?.files).toEqual([
      join(root, 'src', 'index.ts'),
      join(root, 'README.md')
    ]);
    expect(started[0]?.file).toBe(join(root, 'src', 'index.ts'));
  });

  it('accepts an absolute path inside the root', async () => {
    await drag.begin({ root, paths: [join(root, 'README.md')] });
    expect(started[0]?.files).toEqual([join(root, 'README.md')]);
  });

  it('accepts a FOLDER, which the operating system copies whole', async () => {
    await drag.begin({ root, paths: ['src'] });
    expect(started[0]?.files).toEqual([join(root, 'src')]);
  });
});

describe('the icon, which macOS throws without', () => {
  it('falls back when the system icon comes back empty', async () => {
    const d = build({ fileIcon: async () => image(true) });
    await d.begin({ root, paths: ['README.md'] });
    expect((started[0]?.icon as { tag: string }).tag).toBe('real');
  });

  it('falls back when the system icon lookup rejects', async () => {
    const d = build({
      fileIcon: async () => {
        throw new Error('LaunchServices said no');
      }
    });
    await d.begin({ root, paths: ['README.md'] });
    expect(started).toHaveLength(1);
    expect(started[0]?.icon).not.toBeNull();
  });

  it('falls back when the lookup misses the deadline, and still drags', async () => {
    const d = createDragOut(
      {
        listProjectRoots: async () => [root],
        fileIcon: () => new Promise(() => undefined),
        placeholderIcon: () => image(false),
        startDrag: (item) => {
          started.push(item);
        }
      },
      { iconDeadlineMs: 5 }
    );
    await d.begin({ root, paths: ['README.md'] });
    expect(started).toHaveLength(1);
  });
});

describe('THE REFUSALS: nothing leaves the process', () => {
  it('refuses a root that is not an open project', async () => {
    const payload = await payloadOf(
      drag.begin({ root: scratch, paths: ['elsewhere/id_rsa'] })
    );
    expect(payload.code).toBe('PROJECT_NOT_FOUND');
    expect(started).toEqual([]);
  });

  it('refuses an absolute path outside the root', async () => {
    const payload = await payloadOf(
      drag.begin({ root, paths: [join(outside, 'id_rsa')] })
    );
    expect(payload.code).toBe('INVALID_INPUT');
    expect(payload.message).toContain('outside the project');
    expect(started).toEqual([]);
  });

  it('refuses a .. escape', async () => {
    const payload = await payloadOf(
      drag.begin({ root, paths: ['../elsewhere/id_rsa'] })
    );
    expect(payload.code).toBe('INVALID_INPUT');
    expect(started).toEqual([]);
  });

  it('refuses an escape through a directory symlink', async () => {
    await symlink(outside, join(root, 'escape'));
    const payload = await payloadOf(
      drag.begin({ root, paths: ['escape/id_rsa'] })
    );
    expect(payload.code).toBe('INVALID_INPUT');
    expect(started).toEqual([]);
  });

  it('refuses .git', async () => {
    const payload = await payloadOf(drag.begin({ root, paths: ['.git'] }));
    expect(payload.code).toBe('INVALID_INPUT');
    expect(payload.message).toContain('.git');
    expect(started).toEqual([]);
  });

  it('refuses anything under .git, at any depth', async () => {
    const payload = await payloadOf(
      drag.begin({ root, paths: ['.git/hooks'] })
    );
    expect(payload.code).toBe('INVALID_INPUT');
    expect(started).toEqual([]);
  });

  it('refuses the project root itself', async () => {
    const payload = await payloadOf(drag.begin({ root, paths: [root] }));
    expect(payload.code).toBe('INVALID_INPUT');
    expect(started).toEqual([]);
  });

  it('refuses a path that is not on disk', async () => {
    const payload = await payloadOf(
      drag.begin({ root, paths: ['src/never-existed.ts'] })
    );
    expect(payload.code).toBe('FS_FAILED');
    expect(payload.detail).toBe('ENOENT');
    expect(started).toEqual([]);
  });

  it('refuses an empty list', async () => {
    const payload = await payloadOf(drag.begin({ root, paths: [] }));
    expect(payload.code).toBe('INVALID_INPUT');
    expect(started).toEqual([]);
  });

  it(`refuses more than ${String(MAX_DRAG_OUT_PATHS)} rows`, async () => {
    const many = Array.from(
      { length: MAX_DRAG_OUT_PATHS + 1 },
      () => 'README.md'
    );
    const payload = await payloadOf(drag.begin({ root, paths: many }));
    expect(payload.code).toBe('INVALID_INPUT');
    expect(started).toEqual([]);
  });

  it('refuses the WHOLE batch when one row is out of bounds', async () => {
    const payload = await payloadOf(
      drag.begin({ root, paths: ['README.md', join(outside, 'id_rsa')] })
    );
    expect(payload.code).toBe('INVALID_INPUT');
    // The legal one did not go on its own: nothing was handed over at all.
    expect(started).toEqual([]);
  });

  it('refuses a project whose root is not on THIS Mac, which is the remote door', async () => {
    // A project on another machine is registered with that machine's path.
    // Resolving it here fails, so it never matches an open project root.
    const d = build({ listProjectRoots: async () => ['/srv/work/site'] });
    const payload = await payloadOf(
      d.begin({ root: '/srv/work/site', paths: ['README.md'] })
    );
    expect(payload.code).toBe('INVALID_INPUT');
    expect(payload.message).toContain('does not exist');
    expect(started).toEqual([]);
  });
});
