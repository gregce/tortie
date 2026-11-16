/**
 * Phase 368, item 6 (issue 44, D12): the Edit menu's Copy copies what command
 * C copies, and every copy verb writes the text that is drawn.
 *
 * The menu's Copy row is the system's copy action, which fires a DOM `copy`
 * event on the focused terminal, and xterm answered that event itself, on its
 * `.xterm` element, with its own unbounded selection text. `routePaneCopy`
 * puts a capture-phase listener on the pane's mount, an ancestor of that
 * element, so it runs first: with something to copy it cancels the system's
 * copy, stops the event before xterm's listener, and calls `copySelection`,
 * which is what command C calls (../../keys/index.ts).
 *
 * The verbs are driven over the SHIPPING xterm's buffer, unopened, narrowed
 * from 140 to 96 columns the way a pane narrows, behind a terminal whose
 * selection methods answer as an opened one would. Its own selection text
 * answers a sentinel, so a verb that read it again would put the sentinel on
 * the clipboard and fail here.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IBufferRange, Terminal as XTerm } from '@xterm/xterm';

interface RichWrite {
  text: string;
  html: string;
}

const writes: RichWrite[] = [];
const paneReads: Record<string, unknown>[] = [];
let paneAnswer = { ansi: '', firstLine: 0 };

// xterm's browser bundle touches window at import, and the bridge is read
// from `window.gmux`, so the window is the global object carrying both.
vi.stubGlobal('window', globalThis);
vi.stubGlobal('navigator', { userAgent: 'node', platform: 'MacIntel' });
vi.stubGlobal('gmux', {
  capture: {
    writeRich: (payload: RichWrite) => {
      writes.push(payload);
      return Promise.resolve();
    },
    pane: (input: Record<string, unknown>) => {
      paneReads.push(input);
      return Promise.resolve(paneAnswer);
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
  documentElement: {},
  querySelector: () => null
});
// The coloured copy resolves the live terminal theme, which reads computed
// custom properties; every token answers empty, the shipped fallback path.
vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '' }));

vi.mock('../../../state/store', () => ({
  errorText: (e: unknown) => String(e),
  useApp: {
    getState: () => ({
      sessions: [{ id: 'sess-p368', name: 'one', tmuxName: 'gmux-one', cellWidths: '3.7b' }],
      toast: () => undefined
    })
  }
}));

// The width provider is the widths builder's, and a no-op here: this file is
// about which text is copied, not how wide a cell is.
vi.mock('../../tmux-widths', () => ({ registerTmuxWidths: () => undefined }));

const { Terminal } = await import('@xterm/xterm');
const { copySelection, copySelectionAsHtml, routePaneCopy, snapshotSelection } =
  await import('../index');
const { holdHistorySelection } = await import('../history-selection');
const { registerTerminal } = await import('../../drop/registry');

const ID = 'sess-p368';
const SENTINEL = 'XTERM-OWN-SELECTION-TEXT';

function write(term: XTerm, data: string): Promise<void> {
  return new Promise((resolve) => term.write(data, resolve));
}

/**
 * A pane drawn at 140 columns and narrowed to 96: the first row redrawn with
 * a command and spaces after it, the other rows still holding Chinese text in
 * columns 96 to 139 that nobody can see.
 */
async function narrowedBuffer(): Promise<XTerm> {
  const term = new Terminal({ cols: 140, rows: 4, allowProposedApi: true });
  await write(term, '\u001b[?1049h');
  for (let r = 0; r < 4; r += 1) {
    await write(term, `\u001b[${r + 1};1H${`row ${r}`.padEnd(96, '.')}${'界'.repeat(22)}`);
  }
  term.resize(96, 4);
  await write(term, '\u001b[1;1Hgit push   \u001b[K');
  return term;
}

/** The pane's terminal as the verbs see it: xterm's buffer, a live selection. */
function selecting(buffer: XTerm, range: IBufferRange | undefined): XTerm {
  return {
    cols: buffer.cols,
    rows: buffer.rows,
    buffer: buffer.buffer,
    hasSelection: () => range !== undefined,
    getSelectionPosition: () => range,
    getSelection: () => SENTINEL
  } as unknown as XTerm;
}

const WHOLE: IBufferRange = { start: { x: 0, y: 0 }, end: { x: 96, y: 3 } };
const DRAWN = ['git push', ...[1, 2, 3].map((r) => `row ${r}`.padEnd(96, '.'))].join('\n');

/** A mount that records the listener it is handed and the phase it asked for. */
function recordingMount() {
  const added: { type: string; listener: (event: Event) => void; capture: unknown }[] = [];
  const removed: { type: string; listener: (event: Event) => void; capture: unknown }[] = [];
  const mount = {
    addEventListener: (type: string, listener: (event: Event) => void, capture: unknown) =>
      added.push({ type, listener, capture }),
    removeEventListener: (type: string, listener: (event: Event) => void, capture: unknown) =>
      removed.push({ type, listener, capture })
  } as unknown as HTMLElement;
  return { mount, added, removed };
}

/** A copy event that records what the listener did with it. */
function copyEvent() {
  const done = { prevented: false, stopped: false };
  const event = {
    type: 'copy',
    preventDefault: () => {
      done.prevented = true;
    },
    stopPropagation: () => {
      done.stopped = true;
    }
  } as unknown as Event;
  return { event, done };
}

/** Let `void copySelection(...)` finish its writes. */
async function settled(): Promise<void> {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

let unregister: () => void = () => undefined;

beforeEach(() => {
  writes.length = 0;
  paneReads.length = 0;
  paneAnswer = { ansi: '', firstLine: 0 };
  holdHistorySelection(ID, null);
});

afterEach(() => {
  unregister();
  unregister = () => undefined;
});

describe('the Edit menu\'s Copy is routed to the verb command C uses', () => {
  it('listens for copy on the mount in the capture phase, and its disposer removes that listener', () => {
    const { mount, added, removed } = recordingMount();
    const dispose = routePaneCopy(mount, ID, selecting({} as XTerm, undefined));
    expect(added).toHaveLength(1);
    expect(added[0]?.type).toBe('copy');
    // The capture phase is the only one that runs before xterm's own copy
    // listener, which sits on `.xterm`, below the mount.
    expect(added[0]?.capture).toBe(true);
    dispose();
    expect(removed).toEqual(added);
  });

  it('copies the drawn selection, and keeps the event from the system and from xterm', async () => {
    const buffer = await narrowedBuffer();
    const term = selecting(buffer, WHOLE);
    unregister = registerTerminal(ID, term);
    const { mount, added } = recordingMount();
    routePaneCopy(mount, ID, term);
    const { event, done } = copyEvent();
    added[0]?.listener(event);
    expect(done).toEqual({ prevented: true, stopped: true });
    await vi.waitFor(() => expect(writes).toHaveLength(1));
    expect(writes).toEqual([{ text: DRAWN, html: '' }]);
    buffer.dispose();
  });

  it('copies a range held in the history even with nothing selected on screen, through -J', async () => {
    unregister = registerTerminal(ID, selecting(await narrowedBuffer(), undefined));
    holdHistorySelection(ID, {
      start: { line: 40, col: 0 },
      end: { line: 41, col: 30 },
      cols: 96,
      redraw: () => undefined
    });
    paneAnswer = {
      ansi: 'https://downloads.example.com/releases/acme-platform/2026/11/14/rc1.tar.gz   \nnext  \n',
      firstLine: 40
    };
    const { mount, added } = recordingMount();
    routePaneCopy(mount, ID, selecting({} as XTerm, undefined));
    const { event, done } = copyEvent();
    added[0]?.listener(event);
    expect(done).toEqual({ prevented: true, stopped: true });
    await vi.waitFor(() => expect(writes).toHaveLength(1));
    expect(paneReads.map((read) => read.join)).toEqual([true]);
    expect(writes).toEqual([
      {
        text: 'https://downloads.example.com/releases/acme-platform/2026/11/14/rc1.tar.gz\nnext',
        html: ''
      }
    ]);
  });

  it('lets the event pass untouched when nothing is selected, as it did', async () => {
    unregister = registerTerminal(ID, selecting(await narrowedBuffer(), undefined));
    const { mount, added } = recordingMount();
    routePaneCopy(mount, ID, selecting({} as XTerm, undefined));
    const { event, done } = copyEvent();
    added[0]?.listener(event);
    expect(done).toEqual({ prevented: false, stopped: false });
    await settled();
    expect(writes).toEqual([]);
  });
});

describe('every copy verb writes the text that is drawn, never xterm\'s own', () => {
  it('the snapshot the menu is built from', async () => {
    const buffer = await narrowedBuffer();
    unregister = registerTerminal(ID, selecting(buffer, WHOLE));
    expect(snapshotSelection(ID)).toEqual({ text: DRAWN, position: WHOLE });
    buffer.dispose();
  });

  it('command C', async () => {
    const buffer = await narrowedBuffer();
    unregister = registerTerminal(ID, selecting(buffer, WHOLE));
    expect(await copySelection(ID)).toBe(true);
    expect(writes).toEqual([{ text: DRAWN, html: '' }]);
    buffer.dispose();
  });

  it('Copy as HTML, whose markup ends at the edge too', async () => {
    const buffer = await narrowedBuffer();
    unregister = registerTerminal(ID, selecting(buffer, WHOLE));
    await copySelectionAsHtml(ID);
    expect(writes).toHaveLength(1);
    expect(writes[0]?.text).toBe(DRAWN);
    expect(writes[0]?.html).toContain('git push');
    expect(writes[0]?.html).not.toContain('界');
    expect(writes[0]?.html).not.toContain(SENTINEL);
    buffer.dispose();
  });

  it('refuses a selection of nothing but the spaces a line ends in, as it refuses an empty one', async () => {
    const buffer = await narrowedBuffer();
    // Columns 8 to 10 of the first row: the three spaces after `git push`.
    unregister = registerTerminal(
      ID,
      selecting(buffer, { start: { x: 8, y: 0 }, end: { x: 11, y: 0 } })
    );
    expect(snapshotSelection(ID)).toBeNull();
    expect(await copySelection(ID)).toBe(false);
    expect(writes).toEqual([]);
    buffer.dispose();
  });
});
