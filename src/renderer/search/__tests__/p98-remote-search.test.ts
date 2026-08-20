/**
 * Phase 98. Searching a project that lives on another machine, from the store's
 * side of the call.
 *
 * WHAT IS PROVED HERE, and each of the five is a thing that can silently go
 * wrong:
 *
 *  1. **One call per settled query, and not one per keystroke.** A search on
 *     another machine cannot be cancelled once it has started, so a store that
 *     asked on every keystroke would leave four scans running over there for
 *     one word typed here.
 *  2. **The whole answer folds in with one `set`.** There is no stream and no
 *     merge, so the rows on screen are the rows that machine sent.
 *  3. **A stale answer never paints.** The epoch rule is the only thing that
 *     can stop one, because nothing can call the scan back.
 *  4. **Every one of the six status words has a sentence, and it is the right
 *     one.** Main sends a word and the renderer draws the sentence, so a word
 *     with no sentence would be a blank panel.
 *  5. **An open names the machine and the line.** Without the machine the
 *     editor would read a file of that path on THIS Mac, which is a file
 *     nobody asked for.
 *
 * No process, no window and no view. The bridge is a fake that records what it
 * was asked and answers when this file says so.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  MachineSearchInput,
  MachineSearchMode,
  MachineSearchResult
} from '@shared/ipc';
import type { WorkspaceTarget } from '@shared/workspace-target';

/** Every call to the machine, in order. */
let calls: MachineSearchInput[] = [];
/** Answers held back, so a late one can be shown never to paint. */
let held: { input: MachineSearchInput; send: () => void }[] = [];
/** Hold every answer until this file releases it. */
let holding = false;
/** Every open request the store emitted. */
let opens: Record<string, unknown>[] = [];

/** The answer one machine gives, with the rows this file asks for. */
function answer(
  input: MachineSearchInput,
  over: Partial<MachineSearchResult> = {}
): MachineSearchResult {
  return {
    machineId: input.machineId,
    machineLabel: 'Studio',
    cwd: input.cwd,
    mode: 'repo',
    files: [
      {
        relPath: 'src/there.ts',
        matchCount: 1,
        matches: [
          {
            line: 12,
            text: 'const needle = 1;',
            trimmed: 2,
            ranges: [[6, 12]],
            byteOffset: 0
          }
        ],
        clipped: false
      }
    ],
    totalMatches: 1,
    totalFiles: 1,
    capped: false,
    truncated: false,
    elapsedMs: 203,
    ...over
  };
}

/** What the store hands `requestOpenFile`, without a DOM event class. */
class FakeCustomEvent {
  readonly detail: Record<string, unknown>;
  constructor(_type: string, init: { detail: Record<string, unknown> }) {
    this.detail = init.detail;
  }
}
vi.stubGlobal('CustomEvent', FakeCustomEvent);

/** Set by a test to shape the next answer. */
let shape: Partial<MachineSearchResult> = {};

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent(event: unknown) {
    opens.push((event as FakeCustomEvent).detail);
    return true;
  },
  setTimeout,
  clearTimeout,
  gmux: {
    search: {
      start: () => Promise.resolve(),
      cancel: () => Promise.resolve(),
      onResults: () => () => undefined,
      context: () => Promise.resolve({ lines: [] })
    },
    machines: {
      searchContent: (input: MachineSearchInput) => {
        calls.push(input);
        if (!holding) return Promise.resolve(answer(input, shape));
        return new Promise<MachineSearchResult>((resolve) => {
          held.push({ input, send: () => resolve(answer(input, shape)) });
        });
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
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

const {
  machineEmptyLine,
  machineNoteLine,
  openSearchResult,
  remoteRefOf,
  remoteSearchAvailable,
  useSearch
} = await import('../store');
const {
  SEARCH_ANSWER_TOO_LARGE,
  SEARCH_NOT_A_REPOSITORY,
  searchFirstMatches,
  searchFolderMissing,
  searchNoAnswer,
  searchNotConnected,
  searchOnMachineLine,
  searchPatternRefused
} = await import('../../app/machine-copy');

const REMOTE: WorkspaceTarget = { machineId: 'p98', path: '/home/greg/api' };
const LOCAL: WorkspaceTarget = { machineId: 'local', path: '/l1' };

const store = (): ReturnType<typeof useSearch.getState> => useSearch.getState();

beforeEach(() => {
  vi.useFakeTimers();
  calls = [];
  held = [];
  opens = [];
  holding = false;
  shape = {};
  store().clear();
  useSearch.setState({ target: null, remoteMode: null, machineLabel: null });
});

/**
 * Let every held answer land before the next test starts.
 *
 * The store keeps one call on the wire at a time, and that record is module
 * state rather than store state, because it is not something a view draws. A
 * test that leaves an answer held would therefore make the NEXT test's search
 * wait for it. In the product every one of these calls settles, because
 * `ipcRenderer.invoke` always answers, so this is the harness paying a debt
 * the product does not have.
 */
afterEach(async () => {
  holding = false;
  for (let i = 0; i < 5 && held.length > 0; i += 1) {
    for (const one of held.splice(0, held.length)) one.send();
    await vi.advanceTimersByTimeAsync(600);
  }
});

describe('one call, and only when the typing stops', () => {
  it('asks the machine once for a word typed one letter at a time', async () => {
    useSearch.setState({ target: REMOTE });

    for (const q of ['n', 'ne', 'nee', 'need', 'needl', 'needle']) {
      store().setQuery(q);
      await vi.advanceTimersByTimeAsync(60);
    }
    await vi.advanceTimersByTimeAsync(600);

    expect(calls.length).toBe(1);
    expect(calls[0]).toEqual({
      machineId: 'p98',
      cwd: '/home/greg/api',
      query: 'needle',
      isRegex: false,
      isCaseSensitive: false,
      matchWholeWord: false,
      maxResults: 20_000
    });
  });

  it('waits 400 ms there, where this Mac waits 150', async () => {
    useSearch.setState({ target: REMOTE });
    store().setQuery('needle');

    await vi.advanceTimersByTimeAsync(200);
    expect(calls).toEqual([]);
    await vi.advanceTimersByTimeAsync(300);
    expect(calls.length).toBe(1);
  });

  it('keeps one call on the wire, then runs once more for the newer query', async () => {
    holding = true;
    useSearch.setState({ target: REMOTE });
    store().setQuery('needle');
    await vi.advanceTimersByTimeAsync(600);
    expect(calls.length).toBe(1);

    // The query moves while that call is still out there. Nothing new is sent.
    store().setQuery('haystack');
    await vi.advanceTimersByTimeAsync(600);
    expect(calls.length).toBe(1);

    // The first answer lands. One more call goes, for what is in the box now.
    held[0]?.send();
    await vi.advanceTimersByTimeAsync(0);
    expect(calls.length).toBe(2);
    expect(calls[1]?.query).toBe('haystack');
  });

  it('carries the three modifiers to that machine', async () => {
    useSearch.setState({
      target: REMOTE,
      isRegex: true,
      isCaseSensitive: true,
      matchWholeWord: true
    });
    store().setQuery('need.e');
    await vi.advanceTimersByTimeAsync(600);

    expect(calls[0]?.isRegex).toBe(true);
    expect(calls[0]?.isCaseSensitive).toBe(true);
    expect(calls[0]?.matchWholeWord).toBe(true);
  });
});

describe('the answer', () => {
  it('folds the whole answer in at once', async () => {
    useSearch.setState({ target: REMOTE });
    store().setQuery('needle');
    await vi.advanceTimersByTimeAsync(600);

    const s = store();
    expect(s.status).toBe('done');
    expect(s.files.map((f) => f.relPath)).toEqual(['src/there.ts']);
    expect(s.totalMatches).toBe(1);
    expect(s.totalFiles).toBe(1);
    expect(s.remoteMode).toBe('repo');
    expect(s.machineLabel).toBe('Studio');
    expect(s.truncated).toBe(false);
    expect(s.elapsedMs).toBe(203);
  });

  it('records both cuts as the machine reported them', async () => {
    shape = { capped: true, truncated: true, totalMatches: 20_000 };
    useSearch.setState({ target: REMOTE });
    store().setQuery('needle');
    await vi.advanceTimersByTimeAsync(600);

    expect(store().capped).toBe(true);
    expect(store().truncated).toBe(true);
  });

  it('never paints an answer the query has moved past', async () => {
    holding = true;
    useSearch.setState({ target: REMOTE });
    store().setQuery('needle');
    await vi.advanceTimersByTimeAsync(600);

    // Stop is pressed. The scan over there runs to the end and its answer
    // arrives anyway, which is exactly the frame that must not paint.
    store().cancel();
    held[0]?.send();
    await vi.advanceTimersByTimeAsync(0);

    expect(store().files).toEqual([]);
    expect(store().remoteMode).toBeNull();
  });

  it('drops the machine note when the target moves back to this Mac', async () => {
    useSearch.setState({ target: REMOTE });
    store().setQuery('needle');
    await vi.advanceTimersByTimeAsync(600);
    expect(store().remoteMode).toBe('repo');

    store().syncProject(LOCAL);

    expect(store().remoteMode).toBeNull();
    expect(store().machineLabel).toBeNull();
    expect(store().truncated).toBe(false);
    expect(store().files).toEqual([]);
  });

  it('reads no surrounding lines for a row that came from a machine', async () => {
    useSearch.setState({ target: REMOTE });
    store().setQuery('needle');
    await vi.advanceTimersByTimeAsync(600);

    store().toggleContext('src/there.ts', 12);

    // Nothing expanded, so no row can sit in a loading state that never ends.
    expect(store().expanded.size).toBe(0);
    expect(store().context.size).toBe(0);
  });
});

describe('the sentence for every one of the six words', () => {
  const L = 'Studio';

  it('says how the folder was read, for the two words that carry rows', () => {
    expect(
      machineNoteLine({
        mode: 'repo',
        label: L,
        totalMatches: 3,
        capped: false,
        truncated: false
      })
    ).toBeNull();
    expect(
      machineNoteLine({
        mode: 'walk',
        label: L,
        totalMatches: 3,
        capped: false,
        truncated: false
      })
    ).toBe(SEARCH_NOT_A_REPOSITORY);
    // The engine line is said for both of them, and it names no program of
    // this Mac's.
    expect(searchOnMachineLine(L)).toContain('Studio');
  });

  it('names whichever cap cut the list', () => {
    expect(
      machineNoteLine({
        mode: 'repo',
        label: L,
        totalMatches: 20_000,
        capped: true,
        truncated: false
      })
    ).toBe(searchFirstMatches(20_000));
    expect(
      machineNoteLine({
        mode: 'repo',
        label: L,
        totalMatches: 12,
        capped: false,
        truncated: true
      })
    ).toBe(SEARCH_ANSWER_TOO_LARGE);
  });

  it('answers the four words that mean no rows at all', () => {
    expect(machineEmptyLine('missing', L)).toBe(searchFolderMissing(L));
    expect(machineEmptyLine('badPattern', L)).toBe(searchPatternRefused(L));
    expect(machineEmptyLine('notConnected', L)).toBe(searchNotConnected(L));
    expect(machineEmptyLine('unreachable', L)).toBe(searchNoAnswer(L));
  });

  it('never says the same thing in both places', () => {
    // The note row is silent for the four refusals and the results area is
    // silent for the two reads, so no sentence can appear twice.
    const modes: MachineSearchMode[] = [
      'repo',
      'walk',
      'missing',
      'badPattern',
      'notConnected',
      'unreachable'
    ];
    for (const mode of modes) {
      const note = machineNoteLine({
        mode,
        label: L,
        totalMatches: 1,
        capped: false,
        truncated: false
      });
      const empty = machineEmptyLine(mode, L);
      expect(note === null || empty === null).toBe(true);
    }
  });
});

describe('opening a row', () => {
  it('names the machine, the folder over there and the line', async () => {
    useSearch.setState({ target: REMOTE });
    store().setQuery('needle');
    await vi.advanceTimersByTimeAsync(600);

    const remote = remoteRefOf(store());
    expect(remote).toEqual({ machineId: 'p98', machineLabel: 'Studio' });

    const file = store().files[0];
    const match = file?.matches[0];
    expect(file).toBeDefined();
    expect(match).toBeDefined();
    if (file === undefined || match === undefined) return;
    openSearchResult(REMOTE.path, file.relPath, match, true, remote);

    expect(opens.length).toBe(1);
    expect(opens[0]).toMatchObject({
      repoPath: '/home/greg/api',
      relPath: 'src/there.ts',
      path: '/home/greg/api/src/there.ts',
      mode: 'file',
      source: 'search',
      remote: {
        machineId: 'p98',
        machineLabel: 'Studio',
        repoPath: '/home/greg/api'
      },
      // 6 and 12 in the row, plus the 2 units main stripped off the front.
      selection: { line: 12, column: 8, endColumn: 14 }
    });
  });

  it('names no machine for a row from this Mac', () => {
    useSearch.setState({ target: LOCAL, machineLabel: null });
    expect(remoteRefOf(store())).toBeNull();

    openSearchResult(
      '/l1',
      'src/here.ts',
      { line: 4, trimmed: 0, ranges: [[0, 3]] },
      true,
      null
    );
    expect(opens[0]?.remote).toBeUndefined();
  });

  it('walks the rows a machine sent, and takes the machine with it', async () => {
    useSearch.setState({ target: REMOTE });
    store().setQuery('needle');
    await vi.advanceTimersByTimeAsync(600);
    opens = [];

    expect(store().stepResult(1)).toBe(true);
    expect(opens[0]).toMatchObject({
      relPath: 'src/there.ts',
      remote: { machineId: 'p98', machineLabel: 'Studio' }
    });
  });
});

describe('a build that cannot ask a machine anything', () => {
  it('says the bridge is there in this one', () => {
    expect(remoteSearchAvailable()).toBe(true);
  });

  it('sends nothing when the bridge has no way to search a machine', async () => {
    const gmux = (window as unknown as { gmux: { machines: Record<string, unknown> } })
      .gmux;
    const kept = gmux.machines.searchContent;
    delete gmux.machines.searchContent;
    try {
      expect(remoteSearchAvailable()).toBe(false);
      useSearch.setState({ target: REMOTE });
      store().setQuery('needle');
      await vi.advanceTimersByTimeAsync(600);
      expect(calls).toEqual([]);
      expect(store().status).toBe('idle');
    } finally {
      gmux.machines.searchContent = kept;
    }
  });
});
