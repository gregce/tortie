/**
 * Phase 107. The History group for a folder on another machine.
 *
 * WHAT THIS FILE IS FOR. Four separate things can go wrong here and none of
 * them is caught by a type.
 *
 * 1. A read nobody asked for. The whole design rests on a collapsed group
 *    asking that machine nothing, and this is the largest read the product
 *    makes over a link.
 * 2. A cut list drawn as a whole one. The answer carries three flags that each
 *    mean something was left out, being `hasMore`, `atCeiling` and
 *    `divergenceTruncated`. Phase 99 carried one such flag through main that
 *    the panel never drew. Three flags is three chances to repeat it.
 * 3. A control that could write on another computer. The local History row menu
 *    offers a checkout, a branch, a cherry pick and a revert, and every one of
 *    those would write over there.
 * 4. A page that grows past the ceiling. The tier of this phase rests on a
 *    person not being able to ask for twenty thousand commits.
 *
 * HOW THIS RENDERS. `environment` is node and this repository carries no jsdom
 * and no @testing-library/react, so the group is rendered with
 * `renderToStaticMarkup`, which is the shape ./p106-remote-branch.test.tsx
 * uses. That is also why `RemoteHistoryPanel` is pure over its props and
 * `RemoteHistorySection` is a store connected wrapper with no markup of its
 * own.
 *
 * WHY EVERY ASSERTION GOES THROUGH `esc`. `renderToStaticMarkup` escapes an
 * apostrophe to `&#x27;`, and one of these sentences holds one. Comparing the
 * raw sentence against the markup would fail on that one and pass on the rest,
 * which is a trap rather than a test, so every comparison escapes the sentence
 * the same way React does.
 *
 * WHAT THIS FILE CANNOT DO, AND IT IS NAMED HERE RATHER THAN LEFT TO BE FOUND.
 * It cannot press a button, because there is no document. So the claims about
 * gestures are proved in the two places a gesture ends up, being the store's
 * own verbs and the plain functions the markup hands to `onClick`. It also
 * cannot measure a pixel, so whether the sentences below the group are on
 * screen is read off a picture by ../p107-history-shot.ts instead.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MachineHistoryMode, MachineHistoryResult } from '@shared/ipc';
import { REMOTE_HISTORY_MAX_COMMITS, REMOTE_HISTORY_PAGE } from '@shared/ipc';
import type { GitGraphLogEntry } from '@shared/types';

/** Repository root, from this file's own location. */
const ROOT = resolve(import.meta.dirname, '../../../..');

const readHistory = vi.fn();

// The store reads window.gmux while zustand builds its initial state, so the
// globals have to exist before the modules under test are ever imported.
vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  requestAnimationFrame: () => 0,
  matchMedia: () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {}
  }),
  gmux: {
    sessions: {
      restore: () => Promise.resolve({}),
      discard: () => Promise.resolve()
    },
    setSessionsPosition: () => Promise.resolve(),
    machines: { readHistory }
  }
});
vi.stubGlobal('requestAnimationFrame', () => 0);
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

const { RemoteHistoryPanel, historyModeSentence } = await import(
  '../RemoteHistorySection'
);
const {
  machineAnsweredHistory,
  nextLimit,
  remoteHistoryAvailable,
  useRemoteHistory
} = await import('../remote-history');
const copy = await import('../../machines/presentation');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const L = 'Studio';
const AT = new Date(2026, 7, 18, 14, 32, 0).getTime();
const NOW = AT + 60_000;
const HEAD = '01167eb9a4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9';

const STUDIO = { machineId: 'studio', path: '/home/greg/api' };
const ATTIC = { machineId: 'attic', path: '/home/greg/api' };

/** The same escaping React applies to text it puts in the markup. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/** A hash that is 40 characters and unique for one index. */
function hashOf(index: number): string {
  return index === 0
    ? HEAD
    : `${String(index).padStart(8, '0')}b9a4c3d2e1f0a9b8c7d6e5f4a3b2c1d0`;
}

/** A straight walk of `n` commits, newest first, of the shape main sends. */
function commits(n: number): GitGraphLogEntry[] {
  const rows: GitGraphLogEntry[] = [];
  for (let i = 0; i < n; i += 1) {
    const at = AT - i * 3_600_000;
    rows.push({
      hash: hashOf(i),
      sha: hashOf(i),
      shortSha: hashOf(i).slice(0, 7),
      parents: i + 1 < n ? [hashOf(i + 1)] : [],
      authorName: i === 0 ? 'Greg' : 'Robin',
      author: i === 0 ? 'Greg' : 'Robin',
      authorEmail: 'nobody@example.com',
      authorDate: at,
      dateISO: new Date(at).toISOString(),
      subject: `Commit number ${String(n - i)}`,
      refs:
        i === 0
          ? [
              {
                kind: 'localBranch',
                name: 'main',
                fullName: 'refs/heads/main',
                current: true
              }
            ]
          : [],
      ...(i === 0 ? { unpushed: true as const } : {})
    } as GitGraphLogEntry);
  }
  return rows;
}

/** One store entry, of the shape a good answer leaves behind. */
function entry(over: Record<string, unknown> = {}): Parameters<
  typeof RemoteHistoryPanel
>[0]['entry'] {
  return {
    machineId: 'studio',
    path: '/home/greg/api',
    machineLabel: L,
    mode: 'ok' as MachineHistoryMode,
    entries: commits(3),
    limit: REMOTE_HISTORY_PAGE,
    maxCount: REMOTE_HISTORY_PAGE,
    ceiling: REMOTE_HISTORY_MAX_COMMITS,
    hasMore: false,
    atCeiling: false,
    headSha: HEAD,
    upstreamSha: hashOf(2),
    mergeBase: hashOf(2),
    markedCount: 1,
    divergenceTruncated: false,
    answerBytes: 810,
    loading: false,
    refreshing: false,
    readAt: AT,
    elapsedMs: 412,
    ...over
  } as Parameters<typeof RemoteHistoryPanel>[0]['entry'];
}

/** The group's markup for one entry, expanded, with a live bridge. */
function draw(
  over: Record<string, unknown> = {},
  props: Record<string, unknown> = {}
): string {
  return renderToStaticMarkup(
    <RemoteHistoryPanel
      entry={entry(over)}
      label={L}
      available={true}
      collapsed={false}
      now={NOW}
      onToggle={() => undefined}
      onRefresh={() => undefined}
      onLoadMore={() => undefined}
      {...props}
    />
  );
}

/**
 * The markup INSIDE the group's scrolling body, and nothing else.
 *
 * The body is the last child of the section, so it runs from the class name
 * that marks it to the closing tag of the section. This exists because a
 * sentence's placement is not cosmetic here. The body scrolls and it holds fifty
 * rows at the first read inside 92 px of the column, so a sentence drawn inside
 * it sits under its own fold on the ordinary path rather than on a rare one.
 */
function bodyOnly(html: string): string {
  const start = html.indexOf('section-body rhist-body');
  const end = html.indexOf('</section>', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return html.slice(start, end);
}

/** One answer of the shape main sends. */
function answer(over: Record<string, unknown> = {}): MachineHistoryResult {
  return {
    machineId: 'studio',
    machineLabel: L,
    cwd: '/home/greg/api',
    mode: 'ok',
    entries: commits(3),
    maxCount: REMOTE_HISTORY_PAGE,
    ceiling: REMOTE_HISTORY_MAX_COMMITS,
    hasMore: false,
    atCeiling: false,
    headSha: HEAD,
    upstreamSha: hashOf(2),
    mergeBase: hashOf(2),
    markedCount: 1,
    divergenceTruncated: false,
    answerBytes: 810,
    readAt: AT,
    elapsedMs: 412,
    ...over
  } as MachineHistoryResult;
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  useRemoteHistory.setState({ byTarget: {} });
  readHistory.mockReset();
  readHistory.mockResolvedValue(answer());
});

// ---------------------------------------------------------------------------
// The store: who asks, how often, for how many, and under which key
// ---------------------------------------------------------------------------

describe('the store asks once, and only when it is asked to', () => {
  it('says the bridge is there', () => {
    expect(remoteHistoryAvailable()).toBe(true);
  });

  it('asks nothing until something calls ensure', () => {
    // Building the store is not a read. The group calls `ensure` from an effect
    // that only runs while it is open, which is the guard the last describe in
    // this file reads off the source.
    expect(readHistory).toHaveBeenCalledTimes(0);
  });

  it('asks exactly once for a target, however many expands there are', async () => {
    useRemoteHistory.getState().ensure(STUDIO);
    await flush();
    useRemoteHistory.getState().ensure(STUDIO);
    await flush();
    expect(readHistory).toHaveBeenCalledTimes(1);
    expect(readHistory).toHaveBeenCalledWith({
      machineId: 'studio',
      cwd: '/home/greg/api',
      maxCount: REMOTE_HISTORY_PAGE
    });
  });

  it('asks again on Refresh, for the same window', async () => {
    useRemoteHistory.getState().ensure(STUDIO);
    await flush();
    await useRemoteHistory.getState().refresh(STUDIO);
    expect(readHistory).toHaveBeenCalledTimes(2);
    expect(readHistory).toHaveBeenLastCalledWith({
      machineId: 'studio',
      cwd: '/home/greg/api',
      maxCount: REMOTE_HISTORY_PAGE
    });
  });

  it('raises the window by one page on Load more', async () => {
    readHistory.mockResolvedValue(answer({ hasMore: true }));
    useRemoteHistory.getState().ensure(STUDIO);
    await flush();
    readHistory.mockResolvedValue(
      answer({ hasMore: true, maxCount: REMOTE_HISTORY_PAGE * 2 })
    );
    await useRemoteHistory.getState().loadMore(STUDIO);
    expect(readHistory).toHaveBeenLastCalledWith({
      machineId: 'studio',
      cwd: '/home/greg/api',
      maxCount: REMOTE_HISTORY_PAGE * 2
    });
    expect(
      useRemoteHistory.getState().byTarget['studio:/home/greg/api']?.limit
    ).toBe(REMOTE_HISTORY_PAGE * 2);
  });

  it('never asks for more than the ceiling, however many presses there are', () => {
    // THIS IS WHY THE TIER OF THIS PHASE IS 2. A person cannot ask for 20,000
    // commits, so the largest answer main ever buffers is about 135,000 bytes
    // rather than 5,400,000. `nextLimit` is the whole rule and it is pure, so
    // the ceiling is provable without a machine.
    expect(nextLimit(REMOTE_HISTORY_PAGE)).toBe(100);
    expect(nextLimit(450)).toBe(REMOTE_HISTORY_MAX_COMMITS);
    expect(nextLimit(REMOTE_HISTORY_MAX_COMMITS)).toBe(
      REMOTE_HISTORY_MAX_COMMITS
    );
    let window = REMOTE_HISTORY_PAGE;
    for (let i = 0; i < 500; i += 1) window = nextLimit(window);
    expect(window).toBe(REMOTE_HISTORY_MAX_COMMITS);
  });

  it('remembers the window main actually read, not the one it asked for', async () => {
    // Main clamps as well. Without this a person who pressed Load more past the
    // ceiling would press it again and see nothing change.
    readHistory.mockResolvedValue(
      answer({ maxCount: REMOTE_HISTORY_MAX_COMMITS, hasMore: true })
    );
    await useRemoteHistory.getState().refresh(STUDIO);
    expect(
      useRemoteHistory.getState().byTarget['studio:/home/greg/api']?.limit
    ).toBe(REMOTE_HISTORY_MAX_COMMITS);
  });

  it('drops a second read while one is still in flight', async () => {
    let answerFirst: (r: MachineHistoryResult) => void = () => undefined;
    readHistory.mockReturnValueOnce(
      new Promise<MachineHistoryResult>((r) => {
        answerFirst = r;
      })
    );
    const first = useRemoteHistory.getState().refresh(STUDIO);
    await flush();
    await useRemoteHistory.getState().loadMore(STUDIO);
    expect(readHistory).toHaveBeenCalledTimes(1);
    answerFirst(answer());
    await first;
  });

  it('holds two entries for one path on two machines', async () => {
    useRemoteHistory.getState().ensure(STUDIO);
    await flush();
    useRemoteHistory.getState().ensure(ATTIC);
    await flush();
    expect(Object.keys(useRemoteHistory.getState().byTarget).sort()).toEqual([
      'attic:/home/greg/api',
      'studio:/home/greg/api'
    ]);
  });

  it('never schedules a read of its own', async () => {
    vi.useFakeTimers();
    useRemoteHistory.getState().ensure(STUDIO);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(readHistory).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('replaces the whole list rather than adding to it', async () => {
    // A PAGE IS READ FRESH. The far side resolved its own refs again for the
    // second page, so a row from the first page and a row from the second are
    // not answers to the same question and must not be joined.
    await useRemoteHistory.getState().refresh(STUDIO);
    readHistory.mockResolvedValue(answer({ entries: commits(5) }));
    await useRemoteHistory.getState().loadMore(STUDIO);
    const held = useRemoteHistory.getState().byTarget['studio:/home/greg/api'];
    expect(held?.entries.length).toBe(5);
  });

  it('turns a channel that threw into a state and not a crash', async () => {
    await useRemoteHistory.getState().refresh(STUDIO);
    readHistory.mockRejectedValueOnce(new Error('no'));
    await useRemoteHistory.getState().refresh(STUDIO);
    const held = useRemoteHistory.getState().byTarget['studio:/home/greg/api'];
    expect(held?.mode).toBe('unreachable');
    expect(held?.readAt).toBe(0);
    // Every row and every flag a previous answer left behind is cleared. A
    // picture under a sentence saying nothing was read is exactly the claim
    // this phase is trying not to make.
    expect(held?.entries).toEqual([]);
    expect(held?.hasMore).toBe(false);
    expect(held?.atCeiling).toBe(false);
    expect(held?.divergenceTruncated).toBe(false);
    expect(held?.markedCount).toBe(0);
    expect(held?.headSha).toBe(null);
  });

  it('keeps every field main sent, unchanged', async () => {
    readHistory.mockResolvedValue(
      answer({
        hasMore: true,
        atCeiling: true,
        divergenceTruncated: true,
        markedCount: 7,
        answerBytes: 135_000,
        maxCount: REMOTE_HISTORY_MAX_COMMITS
      })
    );
    await useRemoteHistory.getState().refresh(STUDIO);
    const held = useRemoteHistory.getState().byTarget['studio:/home/greg/api'];
    expect(held?.hasMore).toBe(true);
    expect(held?.atCeiling).toBe(true);
    expect(held?.divergenceTruncated).toBe(true);
    expect(held?.markedCount).toBe(7);
    expect(held?.answerBytes).toBe(135_000);
    expect(held?.ceiling).toBe(REMOTE_HISTORY_MAX_COMMITS);
    expect(held?.headSha).toBe(HEAD);
    expect(held?.upstreamSha).toBe(hashOf(2));
    expect(held?.mergeBase).toBe(hashOf(2));
    expect(held?.readAt).toBe(AT);
  });

  it('forgets one target and keeps the other', async () => {
    useRemoteHistory.getState().ensure(STUDIO);
    await flush();
    useRemoteHistory.getState().ensure(ATTIC);
    await flush();
    useRemoteHistory.getState().forget(STUDIO);
    expect(Object.keys(useRemoteHistory.getState().byTarget)).toEqual([
      'attic:/home/greg/api'
    ]);
  });

  it('holds no verb that writes, and no way to schedule one', () => {
    const source = readFileSync(
      resolve(ROOT, 'src/renderer/scm/remote-history.ts'),
      'utf8'
    );
    for (const verb of [
      'checkout',
      'cherry',
      'revert',
      'runRemoteWrite',
      'writeFile'
    ]) {
      expect(source).not.toContain(verb);
    }
    // The same three names condition 57l of build/conformance-machines.mjs
    // reads. No timer means no read a person did not ask for.
    for (const timer of [
      'setInterval',
      'setTimeout',
      'requestAnimationFrame'
    ]) {
      expect(source).not.toContain(timer);
    }
    expect(Object.keys(useRemoteHistory.getState()).sort()).toEqual([
      'byTarget',
      'ensure',
      'forget',
      'loadMore',
      'refresh'
    ]);
  });
});

// ---------------------------------------------------------------------------
// The seven modes, each with its own sentence
// ---------------------------------------------------------------------------

describe('every mode says its own sentence, and it comes from machines/presentation', () => {
  const table: [MachineHistoryMode, string | null][] = [
    ['ok', null],
    ['noCommits', copy.historyNoCommits(L)],
    ['notRepo', copy.historyNotRepo(L)],
    ['missing', copy.historyFolderMissing(L)],
    ['denied', copy.historyFolderDenied(L)],
    ['notConnected', copy.historyNotConnected(L)],
    ['unreachable', copy.historyNoAnswer(L)]
  ];

  it('maps all seven of them and invents none', () => {
    for (const [mode, sentence] of table) {
      expect(historyModeSentence(mode, L)).toBe(sentence);
    }
    expect(historyModeSentence(null, L)).toBe(null);
  });

  it('draws each of the six that stand in place of the rows', () => {
    for (const [mode, sentence] of table) {
      if (sentence === null) continue;
      const html = draw({ mode, entries: [] });
      expect(html).toContain(esc(sentence));
      // A mode that is not `ok` draws no row at all.
      expect(html).not.toContain('rhist-row');
    }
  });

  it('names both causes of an empty walk', () => {
    // ONE WORD FOR TWO CAUSES. A repository nobody has committed in and a
    // repository with nothing to walk from answer with the same word, and a
    // person cannot tell them apart from the outside, so the sentence says
    // both rather than picking one.
    expect(copy.historyNoCommits(L)).toContain('no commits yet');
    expect(copy.historyNoCommits(L)).toContain('no branches, tags or');
  });

  it('says a read is in flight rather than drawing an empty answer', () => {
    expect(draw({ mode: null, loading: true, entries: [] })).toContain(
      esc(copy.historyReading(L))
    );
  });

  it('says a build with no bridge cannot do this at all', () => {
    expect(draw({}, { available: false })).toContain(
      esc(copy.HISTORY_NO_BRIDGE)
    );
  });
});

// ---------------------------------------------------------------------------
// The rows, and the picture beside them
// ---------------------------------------------------------------------------

describe('what the group draws when commits were read', () => {
  it('draws one row per commit, with its subject, author and age', () => {
    const html = draw();
    expect(html.split('class="rhist-row"').length - 1).toBe(3);
    expect(html).toContain('Commit number 3');
    expect(html).toContain('Commit number 1');
    expect(html).toContain('Robin');
    // The newest commit is a minute old in this fixture, so it reads as 1m.
    expect(html).toContain('>1m<');
  });

  it('draws the swimlane picture beside every row', () => {
    // ASSEMBLE, NEVER REIMPLEMENT. The gutter is the same `layoutGraph`,
    // `capRow` and `CommitGraph` the local History draws with, so a row here
    // and a row there cannot disagree about topology.
    const html = draw();
    expect(html.split('class="scm-graph"').length - 1).toBeGreaterThanOrEqual(3);
    expect(html).toContain('scm-graph-dot');
  });

  it('draws the ref marks the walk carried', () => {
    expect(draw()).toContain('main');
    expect(draw()).toContain('scm-refs');
  });

  it('marks the newest commit as not pushed yet, in words as well', () => {
    const html = draw();
    expect(html).toContain('data-sync="unpushed"');
    expect(html).toContain('not pushed yet');
  });

  it('never gives a row a control or a menu', () => {
    // A ROW IS NOT AN AFFORDANCE. Reading the files one commit changed is a
    // second read this phase does not make, so a row that could be pressed
    // would promise something that never happens.
    const html = draw();
    expect(html).not.toContain('role="option"');
    expect(html).not.toContain('aria-expanded="false" class="rhist-row"');
    expect(html).not.toContain('onclick');
  });
});

// ---------------------------------------------------------------------------
// The three cuts, and the paging control
// ---------------------------------------------------------------------------

describe('the three honesty fields, each drawn', () => {
  it('names them all in the section, which is what condition 57m reads', () => {
    const source = readFileSync(
      resolve(ROOT, 'src/renderer/scm/RemoteHistorySection.tsx'),
      'utf8'
    );
    for (const field of ['hasMore', 'atCeiling', 'divergenceTruncated']) {
      expect(source).toContain(field);
    }
  });

  it('says older commits exist, and offers the one control that reads them', () => {
    const html = draw({ hasMore: true });
    expect(html).toContain(esc(copy.historyOlderExist(3)));
    expect(html).toContain('rhist-more');
    expect(html).toContain(esc(copy.HISTORY_LOAD_MORE));
  });

  it('draws neither the sentence nor the control over a whole list', () => {
    const html = draw({ hasMore: false });
    expect(html).not.toContain('rhist-older');
    expect(html).not.toContain('rhist-more');
  });

  it('at the ceiling it says so and takes the control away', () => {
    // THE FAR END. There are older commits and Tortie does not read them here.
    // A button that could be pressed again would be a button that does nothing.
    const html = draw({ hasMore: true, atCeiling: true });
    expect(html).toContain(esc(copy.historyCeiling(REMOTE_HISTORY_MAX_COMMITS, L)));
    expect(html).not.toContain('rhist-more');
    expect(html).not.toContain(esc(copy.historyOlderExist(3)));
  });

  it('reads the ceiling out of the answer rather than writing the number', () => {
    // The number main applies and the number on screen are one number. A
    // sentence that wrote its own would drift the first time the rule moved.
    const html = draw({ hasMore: true, atCeiling: true, ceiling: 250 });
    expect(html).toContain(esc(copy.historyCeiling(250, L)));
  });

  it('says the ahead and behind marks were cut, when they were', () => {
    const html = draw({ divergenceTruncated: true, markedCount: 50 });
    expect(html).toContain(esc(copy.historyMarksCut(50, L)));
    expect(copy.historyMarksCut(50, L)).toContain('50 commits');
    expect(copy.historyMarksCut(1, L)).toContain('1 commit as');
  });

  it('says nothing about cut marks when nothing was cut', () => {
    expect(draw()).not.toContain('rhist-marks-cut');
  });
});

// ---------------------------------------------------------------------------
// The honesty sentences below the group
// ---------------------------------------------------------------------------

describe('what the group admits about its own answer', () => {
  it('says when it was read, for every mode the machine answered', () => {
    for (const mode of [
      'ok',
      'noCommits',
      'notRepo',
      'missing',
      'denied'
    ] as MachineHistoryMode[]) {
      expect(machineAnsweredHistory(mode)).toBe(true);
      expect(draw({ mode, entries: mode === 'ok' ? commits(3) : [] })).toContain(
        esc(copy.machineReadAt(L, AT))
      );
    }
  });

  it('claims no read for the two modes where nothing was read', () => {
    // THIS IS THE HONESTY RULE, AND IT IS THE POINT OF `machineAnsweredHistory`.
    // `notConnected` means nothing was asked and `unreachable` means nothing
    // came back. Drawing "Tortie read this from Studio at 14:32" under either
    // would state a read that never happened.
    for (const mode of ['notConnected', 'unreachable'] as MachineHistoryMode[]) {
      expect(machineAnsweredHistory(mode)).toBe(false);
      expect(draw({ mode, entries: [], readAt: 0 })).not.toContain(
        'Tortie read this from'
      );
    }
  });

  it('says the answer does not refresh', () => {
    expect(draw()).toContain(esc(copy.historyNotLive(L)));
  });

  it('says a page is read fresh, so the lines on the left can move', () => {
    // `layoutGraph` asks its caller to hold the ref set still between pages and
    // this door cannot carry one, because the far side resolves its own refs on
    // every read. The whole list is replaced so nothing tears, and the picture
    // can still be drawn differently.
    expect(draw()).toContain(esc(copy.historyPagesAreFresh(L)));
  });

  it('says what the ref marks are, and what Tortie did not read', () => {
    // The pill for a branch on a server carries a tooltip ending in when this
    // clone last fetched, and there is no such reading for a folder on another
    // machine. This is that gap in words.
    expect(draw()).toContain(esc(copy.historyRefsAreThatMachines(L)));
    expect(copy.historyRefsAreThatMachines(L)).toContain('did not read when');
  });

  it('says Tortie changes nothing over there, and draws no way to', () => {
    const html = draw({ hasMore: true });
    expect(html).toContain(esc(copy.historyNoWrite(L)));
    // The sentence counted rather than trusted. With older commits behind the
    // page the group draws exactly three buttons, being the collapse toggle,
    // Refresh and Load more.
    expect(html.split('<button').length - 1).toBe(3);
    expect(draw().split('<button').length - 1).toBe(2);
    // The four verbs the LOCAL History row menu offers, read against the
    // GROUP's own markup rather than the whole render. The sentence below the
    // group names three of them on purpose, which is why the search is bounded
    // to the section a person can press things in.
    const group = html.slice(
      html.indexOf('<section'),
      html.indexOf('</section>')
    );
    for (const verb of ['checkout', 'cherry', 'revert', 'create branch']) {
      expect(group.toLowerCase()).not.toContain(verb);
    }
  });

  it('says the files one commit changed are not read', () => {
    // THE GAP THIS PHASE LEAVES OPEN, ON SCREEN. A row does not expand and
    // clicking one opens nothing, so the sentence says where to go instead.
    expect(draw()).toContain(esc(copy.historyFilesElsewhere(L)));
  });

  it('draws every sentence about the whole answer outside the scrolling body', () => {
    // THE RUNS GROUP IS WHY THIS TEST EXISTS. Two of its sentences were inside
    // its body, and the verifier measured the "newest N" one at ten rows as 36
    // of its 44 px hidden under a body that ended 8 px above it. This body
    // holds fifty rows at the first read, so the same defect here would be on
    // the ordinary path rather than a rare one.
    const html = draw({
      hasMore: true,
      divergenceTruncated: true,
      markedCount: 2
    });
    const inside = bodyOnly(html);
    const outside = [
      copy.machineReadAt(L, AT),
      copy.historyNotLive(L),
      copy.historyOlderExist(3),
      copy.historyMarksCut(2, L),
      copy.historyRefsAreThatMachines(L),
      copy.historyPagesAreFresh(L),
      copy.historyNoWrite(L),
      copy.historyFilesElsewhere(L)
    ];
    for (const sentence of outside) {
      expect(html).toContain(esc(sentence));
      expect(inside).not.toContain(esc(sentence));
    }
    // The rows themselves stay inside, because the body is what scrolls, and so
    // does the one control that reads another page.
    expect(inside).toContain('rhist-row');
    expect(inside).toContain('rhist-more');
  });

  it('draws the band only over an answer that carried commits', () => {
    // The band is past tense in both halves, so it is drawn for the one state
    // where both halves happened.
    expect(draw()).toContain(esc(copy.historyOnMachineBand(L)));
    expect(draw({ mode: 'notRepo', entries: [] })).not.toContain(
      esc(copy.historyOnMachineBand(L))
    );
    expect(draw({ mode: 'noCommits', entries: [] })).not.toContain(
      esc(copy.historyOnMachineBand(L))
    );
    expect(draw({ mode: null, loading: true, entries: [] })).not.toContain(
      esc(copy.historyOnMachineBand(L))
    );
  });
});

// ---------------------------------------------------------------------------
// The rules that decide whether anything is on screen
// ---------------------------------------------------------------------------

describe('the height rules this column runs under', () => {
  // THE FIX ROUND OF THIS PHASE IS WHY THIS BLOCK EXISTS. Every group in this
  // column carried `flex: 0 1 auto`, so the column met a shortfall by shrinking
  // them. MEASURED at 1440 by 885 with the default sidebar and fifty rows in the
  // page: the column is 748 px and its content is 1170 px. The History group
  // came out 0 px tall with 50 rows inside it, its body came out 6 px, 0 rows
  // were on screen, and its own header drew over the first sentence below it.
  // The Changes group came out 0 px with its own sentence cut through the
  // middle. The Runs group and the closing sentence were pushed past the bottom
  // of a box carrying `overflow: hidden`, where no gesture could reach them.
  //
  // A test here cannot measure a pixel. What it can do is hold the shipped rules
  // that decide the pixels, so a later round cannot quietly put back the one
  // value that caused all of it.

  const cssOf = (file: string): string =>
    readFileSync(resolve(ROOT, 'src/renderer/scm', file), 'utf8');

  const ruleOf = (css: string, selector: string): string => {
    const at = css.indexOf(selector);
    expect(at).toBeGreaterThan(-1);
    return css.slice(at, css.indexOf('}', at));
  };

  it('never lets a group be shrunk below its own content', () => {
    const groups: [string, string][] = [
      ['remote-history.css', '.section-scm-remote-history {'],
      ['remote-branch.css', '.section-scm-remote-branch {'],
      ['runs.css', '.section-scm-remote-runs {']
    ];
    for (const [file, selector] of groups) {
      expect(ruleOf(cssOf(file), selector)).toContain('flex: 0 0 auto;');
    }
    // The Changes group shares its class with the local column, so its own rule
    // is written against the remote column instead.
    expect(
      ruleOf(cssOf('scm.css'), '.scm-sections.remote > .section-scm {')
    ).toContain('flex-shrink: 0;');
  });

  it('caps each group at 45% of the column so one cannot take it all', () => {
    const caps: [string, string][] = [
      ['remote-history.css', '.section-scm-remote-history:not(.collapsed) {'],
      ['remote-branch.css', '.section-scm-remote-branch:not(.collapsed) {'],
      ['runs.css', '.section-scm-remote-runs:not(.collapsed) {']
    ];
    for (const [file, selector] of caps) {
      expect(ruleOf(cssOf(file), selector)).toContain('max-height: 45%;');
    }
  });

  it('never lets a sentence between the groups be squashed', () => {
    // Both classes are direct children of the flex column. Without this a column
    // with more content than height shrinks them and one sentence draws over the
    // next, which is a third way to reach a sentence a person cannot read.
    for (const selector of ['.scm-remote-band {', '.scm-remote-note {']) {
      expect(ruleOf(cssOf('scm.css'), selector)).toContain('flex: 0 0 auto;');
    }
  });

  it('scrolls the column for a folder on another machine, and only that one', () => {
    expect(ruleOf(cssOf('scm.css'), '.scm-sections.remote {')).toContain(
      'overflow-y: auto;'
    );
    // The local column is unchanged and still manages its scrolling per section.
    expect(ruleOf(cssOf('scm.css'), '.scm-sections {')).not.toContain('overflow');
    const view = readFileSync(
      resolve(ROOT, 'src/renderer/scm/ScmSection.tsx'),
      'utf8'
    );
    expect(view).toContain('className="scm-sections remote"');
    // One column carries it and the other does not.
    expect(view.split('className="scm-sections remote"').length - 1).toBe(1);
    expect(view).toContain('className="scm-sections"');
  });
});

// ---------------------------------------------------------------------------
// The collapsed group, and the sentence Phase 107 renamed
// ---------------------------------------------------------------------------

describe('a group nobody opened', () => {
  it('draws its header and none of the body', () => {
    const html = draw({}, { collapsed: true });
    expect(html).toContain('data-section="remote-history"');
    expect(html).toContain('Refresh history');
    expect(html).not.toContain('rhist-row');
    expect(html).not.toContain(esc(copy.historyNotLive(L)));
    expect(html).not.toContain(esc(copy.historyNoWrite(L)));
  });

  it('reads nothing until it is opened, and the guard is in the source', () => {
    // The effect is what a running app runs, and there is no document here to
    // run it in. The guard is read off the source instead, and it is also a row
    // of build/probe-p107-history.mjs measured in a real window.
    const source = readFileSync(
      resolve(ROOT, 'src/renderer/scm/RemoteHistorySection.tsx'),
      'utf8'
    );
    expect(source).toContain('if (!collapsed && available) ensure(target);');
    // `ensure` is called from exactly one place.
    expect(source.split('ensure(target)').length - 1).toBe(1);
    // It ships collapsed, which is what makes the guard worth having, and it
    // reuses the key the local History section already writes, so this phase
    // adds no line to the contract inventory.
    expect(source).toContain(
      '`gmux.scm.historyCollapsed.${targetKey(target)}`,\n    true\n  );'
    );
  });

  it('is placed under Changes and above the Branch group in the view', () => {
    // ONE ORDER RATHER THAN TWO. The local panel draws changes, history,
    // branches and runs, and this view now draws the same four in the same
    // order for a folder on another machine.
    const source = readFileSync(
      resolve(ROOT, 'src/renderer/scm/ScmSection.tsx'),
      'utf8'
    );
    const history = source.indexOf('<RemoteHistorySection');
    const branch = source.indexOf('<RemoteBranchSection');
    const runs = source.indexOf('<RemoteRunsSection target=');
    expect(history).toBeGreaterThan(-1);
    expect(branch).toBeGreaterThan(history);
    expect(runs).toBeGreaterThan(branch);
  });

  it('no longer says Tortie cannot show history on another machine', () => {
    // The sentence named three sections it does not show and History was the
    // last one left. It names the history among the things it DOES show now,
    // and what it refuses is one read rather than a section.
    expect(copy.REMOTE_SCM_SECTIONS_NOTE).not.toMatch(
      /does not show[^.]*\bhistory\b/i
    );
    expect(copy.REMOTE_SCM_SECTIONS_NOTE).toMatch(/shows[^.]*\bhistory\b/i);
    expect(copy.REMOTE_SCM_SECTIONS_NOTE).toContain(
      'the files one commit changed'
    );
  });
});

// ---------------------------------------------------------------------------
// The house writing rules, over every sentence this phase added
// ---------------------------------------------------------------------------

/** Every Phase 107 sentence, composed once with the same values. */
const EVERY: readonly string[] = [
  copy.historyReading(L),
  copy.historyNoCommits(L),
  copy.historyNotRepo(L),
  copy.historyFolderMissing(L),
  copy.historyFolderDenied(L),
  copy.historyNotConnected(L),
  copy.historyNoAnswer(L),
  copy.HISTORY_NO_BRIDGE,
  copy.historyOnMachineBand(L),
  copy.historyNotLive(L),
  copy.historyOlderExist(50),
  copy.historyCeiling(REMOTE_HISTORY_MAX_COMMITS, L),
  copy.historyMarksCut(50, L),
  copy.historyRefsAreThatMachines(L),
  copy.historyPagesAreFresh(L),
  copy.historyNoWrite(L),
  copy.historyFilesElsewhere(L),
  copy.REMOTE_SCM_SECTIONS_NOTE
];

describe('the house writing rules, over every Phase 107 sentence', () => {
  it('reads a set of sentences rather than nothing', () => {
    expect(EVERY.length).toBe(18);
  });

  it('holds no em dash and no en dash', () => {
    expect(
      EVERY.filter((one) => one.includes('—') || one.includes('–'))
    ).toEqual([]);
  });

  it('holds no colon, because not one of them introduces a list', () => {
    expect(EVERY.filter((one) => one.includes(':'))).toEqual([]);
  });

  it('is complete sentences, each ending in a full stop', () => {
    expect(EVERY.filter((one) => !one.endsWith('.'))).toEqual([]);
  });

  it('never says the word remote to a person, with one named exception', () => {
    // ONE SENTENCE IS EXEMPT AND IT IS NAMED RATHER THAN FILTERED OUT BY A
    // PATTERN. The rule exists because "remote" is the transport word for
    // another computer, and a person must never read it in that sense. In
    // `historyNoCommits` it is git's own noun for a branch copied from a
    // server, and the local History's own scope menu already says "Local
    // branches, remote branches and tags" on this very surface. Naming only two
    // of the three kinds of ref the walk reads would make the sentence wrong.
    const exempt = [copy.historyNoCommits(L)];
    expect(
      EVERY.filter((one) => !exempt.includes(one) && /\bremote\b/i.test(one))
    ).toEqual([]);
    expect(copy.historyNoCommits(L)).toContain('remote branches to read from');
  });

  it('never says the word paging or the word cursor', () => {
    // Both are words about the mechanism. A person reads a button that says
    // what it does and a sentence that says what is missing.
    for (const word of ['paging', 'cursor', 'base64', 'walk']) {
      expect(EVERY.filter((one) => one.toLowerCase().includes(word))).toEqual(
        []
      );
    }
  });

  it('names the machine by its label in every sentence that has one', () => {
    // The ones that do not name a machine are named here rather than counted.
    // One is about Tortie's own row limit, one is about this build rather than
    // about a machine, and one is about what the view shows for any machine.
    expect(EVERY.filter((one) => !one.includes(L))).toEqual([
      copy.HISTORY_NO_BRIDGE,
      copy.historyOlderExist(50),
      copy.REMOTE_SCM_SECTIONS_NOTE
    ]);
  });

  it('writes the button label as one plain instruction', () => {
    expect(copy.HISTORY_LOAD_MORE).toBe('Load 50 more');
    expect(copy.HISTORY_LOAD_MORE).toContain(String(REMOTE_HISTORY_PAGE));
  });
});
