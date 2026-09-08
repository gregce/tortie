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
// PHASE 233. The second read, and the only other thing this store asks for.
const readCommitFiles = vi.fn();

// The store reads window.gmux while zustand builds its initial state, so the
// globals have to exist before the modules under test are ever imported.
/** PHASE 233. Every open request the group sends, in order. */
const opened: unknown[] = [];

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: (e: { detail?: unknown }) => {
    opened.push(e.detail);
    return true;
  },
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
    machines: { readHistory, readCommitFiles }
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
// PHASE 233. ONE composer, beside the local file row's own.
const { requestRemoteCommitFileOpen } = await import('../open-commit-file');
const {
  machineAnsweredHistory,
  nextLimit,
  remoteDetailKey,
  remoteHistoryAvailable,
  useRemoteHistory
} = await import('../remote-history');
type RemoteCommitDetail = import('../remote-history').RemoteCommitDetail;
// Three files. The history's own words are in machines/history.ts, the note above
// the groups is in machines/scm.ts, and the instant every group prints is in
// machines/presentation.ts.
const copy = {
  ...(await import('../../machines/history')),
  ...(await import('../../machines/presentation')),
  ...(await import('../../machines/scm'))
};

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
    refused: false,
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
      onLoadMore={() => undefined}
      // PHASE 233. A row expands into the files its commit changed, so the
      // panel takes the open set, what each open commit changed, and the two
      // gestures. The defaults are "nothing is open", which is the resting
      // face this file was written against, so every assertion above this
      // phase reads exactly what it read before.
      expanded={(props.expanded as ReadonlySet<string>) ?? new Set<string>()}
      details={
        (props.details as Readonly<Record<string, RemoteCommitDetail>>) ?? {}
      }
      onToggleRow={() => undefined}
      onOpenFile={() => undefined}
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
  useRemoteHistory.setState({ byTarget: {}, details: {} });
  readHistory.mockReset();
  readHistory.mockResolvedValue(answer());
  readCommitFiles.mockReset();
  readCommitFiles.mockResolvedValue(filesAnswer());
});

/** What one machine answers about one commit's files (Phase 233). */
function filesAnswer(over: Record<string, unknown> = {}): unknown {
  return {
    machineId: 'studio',
    machineLabel: L,
    cwd: '/home/greg/api',
    sha: hashOf(1),
    mode: 'ok',
    files: [{ path: 'docs/changelog.md', status: 'A' }],
    answerBytes: 42,
    elapsedMs: 7,
    ...over
  };
}

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
    readHistory.mockRejectedValueOnce(new Error('no'));
    await useRemoteHistory.getState().refresh(STUDIO);
    const held = useRemoteHistory.getState().byTarget['studio:/home/greg/api'];
    expect(held?.mode).toBe('unreachable');
    expect(held?.readAt).toBe(0);
    // With no earlier answer there is nothing to keep, so the sentence is
    // drawn over nothing.
    expect(held?.entries).toEqual([]);
    expect(held?.hasMore).toBe(false);
    expect(held?.atCeiling).toBe(false);
    expect(held?.divergenceTruncated).toBe(false);
    expect(held?.markedCount).toBe(0);
    expect(held?.headSha).toBe(null);
    expect(held?.refused).toBe(false);
  });

  it('keeps the last good answer when a re-read is refused by the link (Phase 230)', async () => {
    // THE STALE SENTENCE BECOMES NOTHING. Until this phase every row and flag
    // was cleared on a thrown re-read, because a picture under a sentence
    // saying nothing was read was a claim the group would not make. No
    // sentence is drawn now: the rows stay, marked refused so the shared hook
    // reads again when the machine starts answering, and a good answer
    // clears the mark.
    await useRemoteHistory.getState().refresh(STUDIO);
    readHistory.mockRejectedValueOnce(new Error('no'));
    await useRemoteHistory.getState().refresh(STUDIO);
    let held = useRemoteHistory.getState().byTarget['studio:/home/greg/api'];
    expect(held?.mode).toBe('ok');
    expect(held?.entries).toHaveLength(3);
    expect(held?.headSha).toBe(HEAD);
    expect(held?.readAt).toBe(AT);
    expect(held?.refused).toBe(true);
    expect(held?.refreshing).toBe(false);
    readHistory.mockResolvedValueOnce(
      answer({ mode: 'notConnected', entries: [], headSha: null })
    );
    await useRemoteHistory.getState().refresh(STUDIO);
    held = useRemoteHistory.getState().byTarget['studio:/home/greg/api'];
    expect(held?.entries).toHaveLength(3);
    expect(held?.refused).toBe(true);
    await useRemoteHistory.getState().refresh(STUDIO);
    held = useRemoteHistory.getState().byTarget['studio:/home/greg/api'];
    expect(held?.refused).toBe(false);
    // The folder's own answer is not a refusal and replaces the rows.
    readHistory.mockResolvedValueOnce(answer({ mode: 'noCommits', entries: [] }));
    await useRemoteHistory.getState().refresh(STUDIO);
    held = useRemoteHistory.getState().byTarget['studio:/home/greg/api'];
    expect(held?.mode).toBe('noCommits');
    expect(held?.entries).toHaveLength(0);
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
    // PHASE 233 ADDED TWO AND NEITHER WRITES. `details` holds what one commit
    // changed and `detail` reads it once, on the FIRST EXPAND of a row and at
    // no other moment, which is why the three timer names above still appear
    // nowhere in this file.
    expect(Object.keys(useRemoteHistory.getState()).sort()).toEqual([
      'byTarget',
      'detail',
      'details',
      'ensure',
      'forget',
      'loadMore',
      'refresh'
    ]);
  });
});

// ---------------------------------------------------------------------------
// PHASE 233. The files one commit changed, read once, on the first expand
// ---------------------------------------------------------------------------

describe('what one commit changed, read once', () => {
  it('asks the machine once and holds the answer under target and commit', async () => {
    const held = await useRemoteHistory.getState().detail(STUDIO, hashOf(1));
    expect(readCommitFiles).toHaveBeenCalledTimes(1);
    expect(readCommitFiles).toHaveBeenCalledWith({
      machineId: 'studio',
      cwd: '/home/greg/api',
      sha: hashOf(1)
    });
    expect(held?.files).toEqual([{ path: 'docs/changelog.md', status: 'A' }]);
    expect(
      useRemoteHistory.getState().details[remoteDetailKey(STUDIO, hashOf(1))]
    ).toBe(held);
  });

  it('asks nothing the second time the same row is expanded', async () => {
    await useRemoteHistory.getState().detail(STUDIO, hashOf(1));
    await useRemoteHistory.getState().detail(STUDIO, hashOf(1));
    expect(readCommitFiles).toHaveBeenCalledTimes(1);
  });

  it('sends ONE read when two expands land in the same tick', async () => {
    const both = await Promise.all([
      useRemoteHistory.getState().detail(STUDIO, hashOf(1)),
      useRemoteHistory.getState().detail(STUDIO, hashOf(1))
    ]);
    expect(readCommitFiles).toHaveBeenCalledTimes(1);
    expect(both[0]).toBe(both[1]);
  });

  it('keys by the folder as well as the commit', async () => {
    await useRemoteHistory.getState().detail(STUDIO, hashOf(1));
    await useRemoteHistory.getState().detail(ATTIC, hashOf(1));
    // The same commit name in two folders is two answers, which is the
    // collision research 55 section 9.2 found for the editor's own tab ids.
    expect(readCommitFiles).toHaveBeenCalledTimes(2);
    expect(Object.keys(useRemoteHistory.getState().details).sort()).toEqual([
      remoteDetailKey(ATTIC, hashOf(1)),
      remoteDetailKey(STUDIO, hashOf(1))
    ].sort());
  });

  it('holds nothing a machine refused, so the next expand asks again', async () => {
    readCommitFiles.mockResolvedValue(
      filesAnswer({ mode: 'unreachable', files: [] })
    );
    expect(await useRemoteHistory.getState().detail(STUDIO, hashOf(1))).toBe(
      null
    );
    expect(useRemoteHistory.getState().details).toEqual({});
    await useRemoteHistory.getState().detail(STUDIO, hashOf(1));
    expect(readCommitFiles).toHaveBeenCalledTimes(2);
  });

  it('turns a channel that threw into null and not a crash', async () => {
    readCommitFiles.mockRejectedValueOnce(new Error('no'));
    expect(await useRemoteHistory.getState().detail(STUDIO, hashOf(1))).toBe(
      null
    );
    expect(useRemoteHistory.getState().details).toEqual({});
  });

  it('drops a target\'s commit details when the target is forgotten', async () => {
    await useRemoteHistory.getState().detail(STUDIO, hashOf(1));
    await useRemoteHistory.getState().detail(ATTIC, hashOf(1));
    useRemoteHistory.getState().forget(STUDIO);
    expect(Object.keys(useRemoteHistory.getState().details)).toEqual([
      remoteDetailKey(ATTIC, hashOf(1))
    ]);
  });
});

// ---------------------------------------------------------------------------
// PHASE 233. What a file row asks the editor for
// ---------------------------------------------------------------------------

describe('opening one file of one commit over there', () => {
  beforeEach(() => {
    opened.length = 0;
  });

  it('carries BOTH the commit and the machine, so the editor asks that machine', () => {
    requestRemoteCommitFileOpen(
      STUDIO.machineId,
      L,
      STUDIO.path,
      { path: 'docs/changelog.md', status: 'A' },
      commits(3)[1]!,
      true
    );
    expect(opened).toHaveLength(1);
    const req = opened[0] as Record<string, unknown>;
    expect(req.repoPath).toBe('/home/greg/api');
    expect(req.relPath).toBe('docs/changelog.md');
    expect(req.path).toBe('/home/greg/api/docs/changelog.md');
    expect(req.mode).toBe('diff');
    expect(req.source).toBe('history');
    expect(req.preview).toBe(true);
    // THE COMMIT decides which two blobs are diffed.
    expect(req.commit).toEqual({
      sha: hashOf(1),
      shortSha: hashOf(1).slice(0, 7),
      status: 'A',
      subject: 'Commit number 2'
    });
    // THE MACHINE decides which computer holds them.
    expect(req.remote).toEqual({
      machineId: 'studio',
      machineLabel: L,
      repoPath: '/home/greg/api'
    });
  });

  it('carries the pre-rename path on both halves, or on neither', () => {
    requestRemoteCommitFileOpen(
      STUDIO.machineId,
      L,
      STUDIO.path,
      {
        path: 'docs/design-renamed.md',
        origPath: 'docs/design.md',
        status: 'R'
      },
      commits(3)[1]!,
      false
    );
    const req = opened[0] as Record<string, Record<string, unknown>>;
    expect(req.commit!.origPath).toBe('docs/design.md');
    expect(req.remote!.origPath).toBe('docs/design.md');
    expect(req.preview).toBe(false);
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
    // PHASE 233 gave the row the LOCAL row's classes, so `rhist-row` is one
    // name in a list rather than the whole attribute. The marker is counted
    // where it is, which is what the probes read off the DOM too.
    expect(html.split('rhist-row').length - 1).toBe(3);
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

  it('gives a row the local row\'s control, and still no menu', () => {
    // PHASE 233 INVERTED THE FIRST HALF OF THIS TEST AND KEPT THE SECOND. A
    // row expands into the files its commit changed, so it is an `option` in
    // a `listbox` carrying `aria-expanded`, exactly as the local History row
    // is. What it still has is no menu, because every verb on the local row's
    // menu writes on the other computer and rule 3 of the component holds.
    const html = draw();
    expect(html).toContain('role="option"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('role="listbox"');
    // The four verbs the LOCAL row's menu offers appear nowhere.
    for (const verb of ['checkout', 'cherry', 'revert', 'create branch']) {
      expect(html.toLowerCase()).not.toContain(verb);
    }
  });

  it('expands one row into the files that commit changed', () => {
    // The whole of gap 17, read off the markup: an open row draws a file row
    // per name-status line, with the local badge letter, the local word and
    // the local title, and a rename says where it came from.
    const html = draw(
      {},
      {
        expanded: new Set([hashOf(1)]),
        details: {
          [hashOf(1)]: {
            files: [
              { path: 'docs/changelog.md', status: 'A' },
              {
                path: 'docs/design-renamed.md',
                origPath: 'docs/design.md',
                status: 'R'
              },
              { path: 'tests/core.test.ts', status: 'D' }
            ]
          }
        }
      }
    );
    expect(html).toContain('aria-expanded="true"');
    expect(html.split('class="scm-hfile"').length - 1).toBe(3);
    expect(html).toContain('changelog.md');
    expect(html).toContain('design-renamed.md');
    expect(html).toContain(esc('docs/design-renamed.md'));
    // The rename's title is the LOCAL one, composed by ../format.ts.
    expect(html).toContain(esc('renamed from docs/design.md'));
    // A deletion is struck through by the local class, not by a sentence.
    expect(html).toContain('scm-row-name deleted');
  });

  it('draws the waiting shape while a row\'s files are being read', () => {
    // Expanded with nothing held is the local skeleton, not a sentence, and
    // not an empty list pretending the commit changed nothing.
    const html = draw({}, { expanded: new Set([hashOf(1)]) });
    expect(html).toContain('scm-hfile-loading');
    expect(html).toContain('scm-skeleton-row');
    expect(html).not.toContain('scm-hfile-empty');
  });

  it('says a commit changed nothing in the local three words', () => {
    const html = draw(
      {},
      { expanded: new Set([hashOf(1)]), details: { [hashOf(1)]: { files: [] } } }
    );
    expect(html).toContain('scm-hfile-empty');
    expect(html).toContain('No files changed');
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

  it('offers the one control that reads older commits, and no sentence beside it', () => {
    // PHASE 228. The Load more button is the local shape for a list with
    // more behind it, and the sentence that said the same thing came off.
    const html = draw({ hasMore: true });
    expect(html).toContain('rhist-more');
    expect(html).toContain(esc(copy.HISTORY_LOAD_MORE));
    expect(html).not.toContain('rhist-older');
    expect(html).not.toContain('There are older ones');
  });

  it('draws no control over a whole list', () => {
    const html = draw({ hasMore: false });
    expect(html).not.toContain('rhist-older');
    expect(html).not.toContain('rhist-more');
  });

  it('at the ceiling the control stays, cannot be pressed, and says why on hover', () => {
    // THE FAR END. There are older commits and Tortie does not read them here.
    // PHASE 228 made this the disabled control with one short label rather
    // than a three sentence paragraph under the group.
    const html = draw({ hasMore: true, atCeiling: true });
    expect(html).toContain('rhist-more');
    expect(html).toContain(`title="${esc(copy.historyCeiling(REMOTE_HISTORY_MAX_COMMITS))}"`);
    expect(html).not.toContain('rhist-ceiling');
    const button = html.slice(html.indexOf('class="rhist-more"') - 80, html.indexOf('class="rhist-more"') + 200);
    expect(button).toContain('disabled=""');
    // A label of a few words, not a sentence.
    expect(copy.historyCeiling(REMOTE_HISTORY_MAX_COMMITS).endsWith('.')).toBe(false);
    expect(copy.historyCeiling(REMOTE_HISTORY_MAX_COMMITS).split(/\s+/).length).toBeLessThanOrEqual(10);
  });

  it('reads the ceiling out of the answer rather than writing the number', () => {
    // The number main applies and the number on screen are one number. A
    // label that wrote its own would drift the first time the rule moved.
    const html = draw({ hasMore: true, atCeiling: true, ceiling: 250 });
    expect(html).toContain(esc(copy.historyCeiling(250)));
    expect(copy.historyCeiling(250)).toContain('250');
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
      // PHASE 230 TOOK THE CLOCK OFF: the group reads again by itself when
      // it is looked at and the local History carries none.
      const html = draw({ mode, entries: mode === 'ok' ? commits(3) : [] });
      expect(html).not.toContain('Tortie read this from');
      expect(html).not.toContain('rhist-read-at');
    }
    expect((copy as Record<string, unknown>).machineReadAt).toBeUndefined();
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

  it('draws no standing sentence under the group (Phase 228)', () => {
    // PHASE 228 TOOK SIX SENTENCES OFF THIS GROUP, being the band above it
    // and the five standing lines under it, on the operator's rule of
    // 2026-09-07. The local History carries no paragraph, so neither does
    // this one. The words are pinned gone in
    // ../../machines/__tests__/p228-off-the-face.test.ts; here the classes
    // are pinned gone from the markup.
    const html = draw({ hasMore: true });
    for (const cls of [
      'rhist-band',
      'rhist-not-live',
      'rhist-older',
      'rhist-ceiling',
      'rhist-refs',
      'rhist-pages-fresh',
      'rhist-no-write',
      'rhist-files'
    ]) {
      expect(html).not.toContain(cls);
    }
    expect(html).not.toContain('This does not refresh');
  });

  it('draws no way to change anything over there', () => {
    const html = draw({ hasMore: true });
    // Counted rather than trusted. With older commits behind the page the
    // group draws exactly two buttons, being the collapse toggle and Load
    // more; they were three until Phase 230 took the group's Refresh off.
    expect(html.split('<button').length - 1).toBe(2);
    expect(draw().split('<button').length - 1).toBe(1);
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

  it('draws a row that expands the way the local row expands', () => {
    // THE GAP PHASE 107 LEFT OPEN IS CLOSED. Phase 233 gave the row the local
    // chevron, which is the affordance, and it points down when the row is
    // open. There is still no second set of file-row classes: the rows are
    // `.scm-hfile` from ./scm.css, so the two Histories cannot drift apart.
    const closed = draw();
    expect(closed).toContain('chevron-right');
    expect(closed).not.toContain('rhist-files');
    const open = draw(
      {},
      {
        expanded: new Set([hashOf(1)]),
        details: { [hashOf(1)]: { files: [{ path: 'a.ts', status: 'M' }] } }
      }
    );
    expect(open).toContain('chevron-down');
    expect(open).not.toContain('rhist-files');
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
    // PHASE 228. Two lines were left under the group, the clock and the marks
    // cut sentence; PHASE 230 took the clock off, so the marks cut sentence
    // is what is left, because it names a list on screen that was cut.
    const outside = [copy.historyMarksCut(2, L)];
    for (const sentence of outside) {
      expect(html).toContain(esc(sentence));
      expect(inside).not.toContain(esc(sentence));
    }
    // The rows themselves stay inside, because the body is what scrolls, and so
    // does the one control that reads another page.
    expect(inside).toContain('rhist-row');
    expect(inside).toContain('rhist-more');
  });

  it('draws no band over any answer (Phase 228)', () => {
    for (const over of [
      {},
      { mode: 'notRepo' as MachineHistoryMode, entries: [] },
      { mode: null, loading: true, entries: [] }
    ]) {
      expect(draw(over)).not.toContain('scm-remote-band');
      expect(draw(over)).not.toContain('Tortie asked');
    }
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
    // The class is a direct child of the flex column. Without this a column
    // with more content than height shrinks it and one sentence draws over the
    // next, which is a third way to reach a sentence a person cannot read.
    // PHASE 228 removed `.scm-remote-band` from beside it, because no band is
    // drawn over any group any more, and pins that it stays gone.
    expect(ruleOf(cssOf('scm.css'), '.scm-remote-note {')).toContain('flex: 0 0 auto;');
    expect(cssOf('scm.css')).not.toContain('.scm-remote-band {');
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
    // PHASE 230 TOOK THE BUTTON OFF. The group reads again by itself, and the
    // local History group carries none.
    expect(html).not.toContain('Refresh history');
    expect(html).not.toContain('codicon-refresh');
    expect(html).not.toContain('rhist-row');
    expect(html).not.toContain('rhist-read-at');
    expect(html).not.toContain('rhist-marks-cut');
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

  it('is not refused by a sentence under the groups, because there is none', () => {
    // The sentence named three sections it does not show and History was the
    // last one left, and this phase rewrote it to name the history among the
    // things it DOES show. PHASE 228 TOOK IT OFF THE FACE, because a local
    // Source control view carries no sentence saying what it shows. The one
    // read it still refused, the files one commit changed, is a section that
    // is not there rather than a sentence saying so.
    expect((copy as Record<string, unknown>).REMOTE_SCM_SECTIONS_NOTE).toBeUndefined();
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
  copy.historyMarksCut(50, L),
  // PHASE 233. The one sentence the file half added, and it is a TOAST
  // rather than a line on the face: the local History says
  // "Could not load the commit" the same way when its own detail read fails.
  copy.historyFilesNoAnswer(L)
];

/** The one label, which is a control's hover title and not a sentence. */
const LABELS: readonly string[] = [copy.historyCeiling(REMOTE_HISTORY_MAX_COMMITS)];

describe('the house writing rules, over every Phase 107 sentence', () => {
  it('reads a set of sentences rather than nothing', () => {
    // PHASE 228 took seven off, so seventeen became nine, plus one label.
    // PHASE 233 added one, the toast a failed file read raises.
    expect(EVERY.length).toBe(10);
    expect(LABELS.length).toBe(1);
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
    // The one that does not name a machine is named here rather than counted.
    // It is about this build rather than about a machine.
    expect(EVERY.filter((one) => !one.includes(L))).toEqual([
      copy.HISTORY_NO_BRIDGE
    ]);
    // The label is a label: no full stop, no colon, no dash, no "remote".
    for (const label of LABELS) {
      expect(label.endsWith('.')).toBe(false);
      expect(label.includes(':')).toBe(false);
      expect(/—|–/.test(label)).toBe(false);
      expect(/\bremote\b/i.test(label)).toBe(false);
    }
  });

  it('writes the button label as one plain instruction', () => {
    expect(copy.HISTORY_LOAD_MORE).toBe('Load 50 more');
    expect(copy.HISTORY_LOAD_MORE).toContain(String(REMOTE_HISTORY_PAGE));
  });
});
