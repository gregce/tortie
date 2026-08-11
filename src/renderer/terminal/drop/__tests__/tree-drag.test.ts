/**
 * The 12.9 / 12.10 contract, exercised where it is pure logic.
 *
 * The hit-test half (arm over a pane, arm nothing over the tree) needs a DOM
 * and lives in the live-app verification; what is testable here is the part
 * that decides WHETHER a drag is a tree drag at all, what it is carrying, and
 * the guards that stop a refused or stale drag from arming an attach.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  beginTreeDrag,
  endTreeDrag,
  isTreeDragEvent,
  looksLikeImagePath,
  treeDrag,
  treeDragHasImage,
  TREE_DRAG_MIME
} from '../tree-drag';

/** The slice of DataTransfer this module touches. */
function transfer(): DataTransfer & { types: string[] } {
  const types: string[] = [];
  return {
    types,
    // Pierre's own dragstart handler has already run by the time the tree's
    // host sees the event, so the fixture starts where it leaves things.
    effectAllowed: 'move',
    setData(type: string, _value: string) {
      if (!types.includes(type)) types.push(type);
    }
  } as unknown as DataTransfer & { types: string[] };
}

function dragEvent(
  init: { defaultPrevented?: boolean; dataTransfer?: DataTransfer } = {}
): DragEvent {
  return {
    defaultPrevented: init.defaultPrevented ?? false,
    dataTransfer: init.dataTransfer ?? transfer()
  } as unknown as DragEvent;
}

beforeEach(() => {
  endTreeDrag();
});

describe('beginTreeDrag', () => {
  it('arms the session and stamps the identity MIME', () => {
    const dt = transfer();
    const event = dragEvent({ dataTransfer: dt });
    expect(beginTreeDrag(event, ['/repo/src/a.ts'], '/repo')).toBe(true);
    expect(treeDrag()).toEqual({ paths: ['/repo/src/a.ts'], rootPath: '/repo' });
    expect(dt.types).toContain(TREE_DRAG_MIME);
    expect(isTreeDragEvent(event)).toBe(true);
  });

  it('widens Pierre\'s effectAllowed so a copy drop is legal at all', () => {
    // With 'move' left in place the HTML drag model resets the operation to
    // none for the pane's 'copy' dragover and NEVER FIRES the drop — the
    // whole feature would be a lit overlay and nothing else.
    const dt = transfer();
    beginTreeDrag(dragEvent({ dataTransfer: dt }), ['/repo/a.png'], '/repo');
    expect(dt.effectAllowed).toBe('copyMove');
  });

  it('leaves effectAllowed alone when it refuses the drag', () => {
    const dt = transfer();
    beginTreeDrag(
      dragEvent({ dataTransfer: dt, defaultPrevented: true }),
      ['/repo/.git/config'],
      '/repo'
    );
    expect(dt.effectAllowed).toBe('move');
  });

  it('keeps the whole multi-select, in order', () => {
    beginTreeDrag(dragEvent(), ['/r/b.png', '/r/a.png', '/r/c.md'], '/r');
    expect(treeDrag()?.paths).toEqual(['/r/b.png', '/r/a.png', '/r/c.md']);
  });

  it('refuses a drag Pierre already cancelled (canDrag said no)', () => {
    // .git/ and out-of-root are refused by the tree's canDrag, which Pierre
    // enforces by preventing the default on this very dragstart.
    const event = dragEvent({ defaultPrevented: true });
    expect(beginTreeDrag(event, ['/repo/.git/config'], '/repo')).toBe(false);
    expect(treeDrag()).toBeNull();
  });

  it('refuses anything that is not an absolute path', () => {
    expect(beginTreeDrag(dragEvent(), ['src/a.ts'], '/repo')).toBe(false);
    expect(beginTreeDrag(dragEvent(), [], '/repo')).toBe(false);
    expect(treeDrag()).toBeNull();
  });

  it('drops the relative strays from a mixed list', () => {
    beginTreeDrag(dragEvent(), ['src/a.ts', '/repo/src/b.ts'], '/repo');
    expect(treeDrag()?.paths).toEqual(['/repo/src/b.ts']);
  });
});

describe('isTreeDragEvent', () => {
  it('is false for an ordinary Finder drag', () => {
    const dt = transfer();
    dt.setData('Files', '');
    dt.setData('text/uri-list', 'file:///tmp/a.png');
    expect(isTreeDragEvent(dragEvent({ dataTransfer: dt }))).toBe(false);
  });

  it('is false when the event carries no transfer at all', () => {
    expect(
      isTreeDragEvent({ dataTransfer: null } as unknown as DragEvent)
    ).toBe(false);
  });

  it('is the per-EVENT discriminator, so a stale session cannot fake one', () => {
    // The router checks the event, never the singleton, when deciding which
    // branch a drag belongs to — this is what stops a session left behind by
    // a missed dragend from hijacking the next Finder drop.
    beginTreeDrag(dragEvent(), ['/repo/a.ts'], '/repo');
    const finder = transfer();
    finder.setData('Files', '');
    expect(isTreeDragEvent(dragEvent({ dataTransfer: finder }))).toBe(false);
  });
});

describe('endTreeDrag', () => {
  it('disarms', () => {
    beginTreeDrag(dragEvent(), ['/repo/a.ts'], '/repo');
    endTreeDrag();
    expect(treeDrag()).toBeNull();
  });
});

describe('looksLikeImagePath', () => {
  it('accepts every extension main can sniff, case-insensitively', () => {
    for (const ext of [
      'apng',
      'avif',
      'bmp',
      'gif',
      'heic',
      'heif',
      'ico',
      'jpeg',
      'jpg',
      'png',
      'svg',
      'tif',
      'tiff',
      'webp'
    ]) {
      expect(looksLikeImagePath(`/r/shot.${ext}`)).toBe(true);
      expect(looksLikeImagePath(`/r/shot.${ext.toUpperCase()}`)).toBe(true);
    }
  });

  it('rejects source files and extensionless names', () => {
    expect(looksLikeImagePath('/r/src/router.ts')).toBe(false);
    expect(looksLikeImagePath('/r/Makefile')).toBe(false);
    expect(looksLikeImagePath('/r/README.md')).toBe(false);
  });

  it('is not fooled by a dotfile named like an extension', () => {
    expect(looksLikeImagePath('/r/.png')).toBe(false);
  });

  it('is not fooled by a directory whose ancestor looks like an image', () => {
    expect(looksLikeImagePath('/r/assets.png/notes')).toBe(false);
  });

  it('reads the last extension, not the first', () => {
    expect(looksLikeImagePath('/r/diagram.png.bak')).toBe(false);
    expect(looksLikeImagePath('/r/archive.tar.png')).toBe(true);
  });
});

describe('treeDragHasImage', () => {
  it('matches the OS-drag rule: ANY image in the set counts', () => {
    expect(treeDragHasImage(['/r/a.ts', '/r/b.png'])).toBe(true);
    expect(treeDragHasImage(['/r/a.ts', '/r/b.md'])).toBe(false);
    expect(treeDragHasImage([])).toBe(false);
  });
});
