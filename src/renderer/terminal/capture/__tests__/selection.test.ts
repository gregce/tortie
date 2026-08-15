/**
 * Phase 40 item 1 — the copy verbs act on the SNAPSHOT, not on the live model.
 *
 * The gap this closes is a real one and not a theoretical one. The menu is
 * built after an await of up to 150 ms for the scrollback read, and an item's
 * `run` fires later still, after the native menu has closed. Anything that
 * touches the selection in between used to change what Copy wrote. These
 * cases move the live selection underneath the verb on purpose and assert
 * that the bytes on the clipboard are still the snapshot's.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IBufferRange, Terminal } from '@xterm/xterm';

interface RichWrite {
  text: string;
  html: string;
}

const writes: RichWrite[] = [];

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  gmux: {
    capture: {
      writeRich: (payload: RichWrite) => {
        writes.push(payload);
        return Promise.resolve();
      }
    }
  }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  querySelector: () => null
});

const { copySelection, snapshotSelection } = await import('../index');
const { registerTerminal } = await import('../../drop/registry');

const RANGE: IBufferRange = {
  start: { x: 4, y: 100 },
  end: { x: 9, y: 102 }
};

/** A terminal whose selection can be changed between calls. */
function mutableTerminal(initial: string | null): {
  term: Terminal;
  set(text: string | null): void;
} {
  let text = initial;
  return {
    term: {
      hasSelection: () => text !== null,
      getSelection: () => text ?? '',
      getSelectionPosition: () => (text === null ? undefined : RANGE)
    } as unknown as Terminal,
    set(next: string | null) {
      text = next;
    }
  };
}

const ID = 'sess-copy';
let unregister: () => void = () => undefined;

beforeEach(() => {
  writes.length = 0;
  unregister();
  unregister = () => undefined;
});

describe('snapshotSelection', () => {
  it('returns null when nothing is selected', () => {
    unregister = registerTerminal(ID, mutableTerminal(null).term);
    expect(snapshotSelection(ID)).toBeNull();
  });

  it('returns null when no terminal is mounted', () => {
    expect(snapshotSelection('no-such-session')).toBeNull();
  });

  it('returns null for an empty selection rather than an empty snapshot', () => {
    // hasSelection can be true for a range that yields no characters, and a
    // snapshot of one would enable Copy and then write nothing.
    unregister = registerTerminal(ID, mutableTerminal('').term);
    expect(snapshotSelection(ID)).toBeNull();
  });

  it('carries the text and the range read at the same instant', () => {
    unregister = registerTerminal(ID, mutableTerminal('one\ntwo\nthree').term);
    expect(snapshotSelection(ID)).toEqual({
      text: 'one\ntwo\nthree',
      position: RANGE
    });
  });
});

describe('copySelection', () => {
  it('writes the snapshot after the live selection changed underneath it', async () => {
    const live = mutableTerminal('one\ntwo\nthree');
    unregister = registerTerminal(ID, live.term);
    const snapshot = snapshotSelection(ID);
    expect(snapshot).not.toBeNull();

    // Everything a right click used to do to the selection, done here in one
    // line: the live model now holds a single word.
    live.set('three');
    expect(await copySelection(ID, snapshot)).toBe(true);
    expect(writes).toEqual([{ text: 'one\ntwo\nthree', html: '' }]);
  });

  it('writes the snapshot even after the selection is gone entirely', async () => {
    const live = mutableTerminal('alpha\nbeta');
    unregister = registerTerminal(ID, live.term);
    const snapshot = snapshotSelection(ID);
    live.set(null);
    expect(await copySelection(ID, snapshot)).toBe(true);
    expect(writes[0]?.text).toBe('alpha\nbeta');
  });

  it('reads the live selection when no snapshot is given', async () => {
    const live = mutableTerminal('keyboard path');
    unregister = registerTerminal(ID, live.term);
    expect(await copySelection(ID)).toBe(true);
    expect(writes[0]?.text).toBe('keyboard path');
  });

  it('writes nothing when there is no snapshot and no live selection', async () => {
    unregister = registerTerminal(ID, mutableTerminal(null).term);
    expect(await copySelection(ID)).toBe(false);
    expect(writes).toEqual([]);
  });
});
