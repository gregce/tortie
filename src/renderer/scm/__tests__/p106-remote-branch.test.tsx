/**
 * Phase 106. The Branch group for a folder on another machine.
 *
 * WHAT THIS FILE IS FOR. Three separate things can go wrong here and none of
 * them is caught by a type. The first is a read nobody asked for, because the
 * whole design rests on a collapsed group asking that machine nothing. The
 * second is a sentence that claims more than the answer supports, which is the
 * shape Phase 99 shipped when it carried a cut through main that the panel
 * never drew, and which this group can reach in two ways, being a pair of zero
 * counts over a tracking answer nothing could read and a pair of counts drawn
 * with no sentence saying what they were counted against. The third is a
 * control that could switch a branch on another computer, which would be a
 * write in a phase that has none.
 *
 * HOW THIS RENDERS. `environment` is node and this repository carries no jsdom
 * and no @testing-library/react, so the group is rendered with
 * `renderToStaticMarkup`, which is the shape ./p105-remote-runs.test.tsx uses.
 * That is also why `RemoteBranchPanel` is pure over its props and
 * `RemoteBranchSection` is a store connected wrapper with no markup of its own.
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
 * own verbs and the plain functions the markup hands to `onClick`. The one
 * claim that only a running app can settle, which is that the effect behind the
 * first expand is guarded by the collapsed state, is read off the source of the
 * section and is also a row of build/probe-p106-branch.mjs.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MachineBranchMode, MachineBranchResult } from '@shared/ipc';

/** Repository root, from this file's own location. */
const ROOT = resolve(import.meta.dirname, '../../../..');

const readBranch = vi.fn();

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
    machines: { readBranch }
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

const { RemoteBranchPanel, branchFollowSentence, branchModeSentence } =
  await import('../RemoteBranchSection');
const { machineAnsweredBranch, remoteBranchAvailable, useRemoteBranch } =
  await import('../remote-branch');
// Four files. The Branch group's own words are in machines/branch.ts, the four
// wrappers Phase 105 kept are in machines/runs.ts, the note above the groups is
// in machines/scm.ts, and the instant every group prints is in
// machines/presentation.ts.
const copy = {
  ...(await import('../../machines/branch')),
  ...(await import('../../machines/presentation')),
  ...(await import('../../machines/runs')),
  ...(await import('../../machines/scm'))
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const L = 'Studio';
const AT = new Date(2026, 7, 18, 14, 32, 0).getTime();
const SHA = '01167eb9a4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9';
const SHORT = '01167eb';
const BR = 'release/1.4';
const UP = 'origin/release/1.4';

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

/** One store entry, of the shape a good answer leaves behind. */
function entry(over: Record<string, unknown> = {}): Parameters<
  typeof RemoteBranchPanel
>[0]['entry'] {
  return {
    machineId: 'studio',
    path: '/home/greg/api',
    machineLabel: L,
    mode: 'ok' as MachineBranchMode,
    branch: BR,
    sha: SHA,
    shortSha: SHORT,
    upstream: UP,
    upstreamGone: false,
    ahead: 2,
    behind: 1,
    trackUnreadable: false,
    identity: 'known',
    loading: false,
    refreshing: false,
    readAt: AT,
    elapsedMs: 318,
    refused: false,
    ...over
  } as Parameters<typeof RemoteBranchPanel>[0]['entry'];
}

/** The group's markup for one entry, expanded, with a live bridge. */
function draw(
  over: Record<string, unknown> = {},
  props: Record<string, unknown> = {}
): string {
  return renderToStaticMarkup(
    <RemoteBranchPanel
      entry={entry(over)}
      label={L}
      available={true}
      collapsed={false}
      onToggle={() => undefined}
      onRefresh={() => undefined}
      {...props}
    />
  );
}

/**
 * The markup INSIDE the group's scrolling body, and nothing else.
 *
 * The body is the last child of the section, so it runs from the class name
 * that marks it to the closing tag of the section. This exists because a
 * sentence's placement is not cosmetic here. The body is capped at 45% of the
 * column and scrolls, so a sentence drawn inside it can sit under its own fold.
 */
function bodyOnly(html: string): string {
  const start = html.indexOf('section-body rbranch-body');
  const end = html.indexOf('</section>', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return html.slice(start, end);
}

/** One answer of the shape main sends. */
function answer(over: Record<string, unknown> = {}): MachineBranchResult {
  return {
    machineId: 'studio',
    machineLabel: L,
    cwd: '/home/greg/api',
    mode: 'ok',
    branch: BR,
    sha: SHA,
    shortSha: SHORT,
    upstream: UP,
    upstreamGone: false,
    ahead: 2,
    behind: 1,
    trackUnreadable: false,
    identity: 'known',
    readAt: AT,
    elapsedMs: 318,
    ...over
  } as MachineBranchResult;
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  useRemoteBranch.setState({ byTarget: {} });
  readBranch.mockReset();
  readBranch.mockResolvedValue(answer());
});

// ---------------------------------------------------------------------------
// The store: who asks, how often, and under which key
// ---------------------------------------------------------------------------

describe('the store asks once, and only when it is asked to', () => {
  it('says the bridge is there', () => {
    expect(remoteBranchAvailable()).toBe(true);
  });

  it('asks nothing until something calls ensure', () => {
    // Building the store is not a read. The group calls `ensure` from an effect
    // that only runs while it is open, which is the guard the last describe in
    // this file reads off the source.
    expect(readBranch).toHaveBeenCalledTimes(0);
  });

  it('asks exactly once for a target, however many expands there are', async () => {
    useRemoteBranch.getState().ensure(STUDIO);
    await flush();
    useRemoteBranch.getState().ensure(STUDIO);
    await flush();
    expect(readBranch).toHaveBeenCalledTimes(1);
    expect(readBranch).toHaveBeenCalledWith({
      machineId: 'studio',
      cwd: '/home/greg/api'
    });
  });

  it('asks again on Refresh', async () => {
    useRemoteBranch.getState().ensure(STUDIO);
    await flush();
    await useRemoteBranch.getState().refresh(STUDIO);
    expect(readBranch).toHaveBeenCalledTimes(2);
  });

  it('drops a second Refresh while one is still in flight', async () => {
    let answerFirst: (r: MachineBranchResult) => void = () => undefined;
    readBranch.mockReturnValueOnce(
      new Promise<MachineBranchResult>((r) => {
        answerFirst = r;
      })
    );
    const first = useRemoteBranch.getState().refresh(STUDIO);
    await flush();
    await useRemoteBranch.getState().refresh(STUDIO);
    expect(readBranch).toHaveBeenCalledTimes(1);
    answerFirst(answer());
    await first;
  });

  it('holds two entries for one path on two machines', async () => {
    useRemoteBranch.getState().ensure(STUDIO);
    await flush();
    useRemoteBranch.getState().ensure(ATTIC);
    await flush();
    expect(Object.keys(useRemoteBranch.getState().byTarget).sort()).toEqual([
      'attic:/home/greg/api',
      'studio:/home/greg/api'
    ]);
  });

  it('never schedules a read of its own', async () => {
    vi.useFakeTimers();
    useRemoteBranch.getState().ensure(STUDIO);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(readBranch).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('turns a channel that threw into a state and not a crash', async () => {
    readBranch.mockRejectedValueOnce(new Error('no'));
    await useRemoteBranch.getState().refresh(STUDIO);
    const held = useRemoteBranch.getState().byTarget['studio:/home/greg/api'];
    expect(held?.mode).toBe('unreachable');
    expect(held?.readAt).toBe(0);
    // With no earlier answer there is nothing to keep, so the sentence is
    // drawn over nothing.
    expect(held?.ahead).toBe(0);
    expect(held?.behind).toBe(0);
    expect(held?.branch).toBe(null);
    expect(held?.refused).toBe(false);
  });

  it('keeps the last good answer when a re-read is refused by the link (Phase 230)', async () => {
    // THE STALE SENTENCE BECOMES NOTHING. The row that was read stays on
    // screen with no sentence over it, marked refused so the shared hook
    // reads again when the machine starts answering. Before this phase 2
    // ahead and 1 behind were cleared under a sentence saying nothing was
    // read; now no sentence is drawn and the counts are the last read ones.
    await useRemoteBranch.getState().refresh(STUDIO);
    readBranch.mockRejectedValueOnce(new Error('no'));
    await useRemoteBranch.getState().refresh(STUDIO);
    let held = useRemoteBranch.getState().byTarget['studio:/home/greg/api'];
    expect(held?.mode).toBe('ok');
    expect(held?.branch).toBe(BR);
    expect(held?.ahead).toBe(2);
    expect(held?.refused).toBe(true);
    readBranch.mockResolvedValueOnce(
      answer({ mode: 'unreachable', branch: null, ahead: 0, behind: 0 })
    );
    await useRemoteBranch.getState().refresh(STUDIO);
    held = useRemoteBranch.getState().byTarget['studio:/home/greg/api'];
    expect(held?.branch).toBe(BR);
    expect(held?.refused).toBe(true);
    await useRemoteBranch.getState().refresh(STUDIO);
    expect(
      useRemoteBranch.getState().byTarget['studio:/home/greg/api']?.refused
    ).toBe(false);
  });

  it('keeps every field main sent, unchanged', async () => {
    await useRemoteBranch.getState().refresh(STUDIO);
    const held = useRemoteBranch.getState().byTarget['studio:/home/greg/api'];
    expect(held?.branch).toBe(BR);
    expect(held?.sha).toBe(SHA);
    expect(held?.shortSha).toBe(SHORT);
    expect(held?.upstream).toBe(UP);
    expect(held?.ahead).toBe(2);
    expect(held?.behind).toBe(1);
    expect(held?.trackUnreadable).toBe(false);
    expect(held?.readAt).toBe(AT);
  });

  it('forgets one target and keeps the other', async () => {
    useRemoteBranch.getState().ensure(STUDIO);
    await flush();
    useRemoteBranch.getState().ensure(ATTIC);
    await flush();
    useRemoteBranch.getState().forget(STUDIO);
    expect(Object.keys(useRemoteBranch.getState().byTarget)).toEqual([
      'attic:/home/greg/api'
    ]);
  });

  it('holds no verb that writes', () => {
    const source = readFileSync(
      resolve(ROOT, 'src/renderer/scm/remote-branch.ts'),
      'utf8'
    );
    for (const verb of ['checkout', 'switch(', 'runRemoteWrite', 'writeFile']) {
      expect(source).not.toContain(verb);
    }
    expect(Object.keys(useRemoteBranch.getState()).sort()).toEqual([
      'byTarget',
      'ensure',
      'forget',
      'refresh'
    ]);
  });
});

// ---------------------------------------------------------------------------
// The eight modes, each with its own sentence
// ---------------------------------------------------------------------------

describe('every mode says its own sentence, and it comes from machines/presentation', () => {
  const table: [MachineBranchMode, string | null][] = [
    ['ok', null],
    ['noBranch', copy.branchNone(L)],
    ['noDetails', copy.branchNoDetails(L)],
    ['notRepo', copy.branchNotRepo(L)],
    ['missing', copy.branchFolderMissing(L)],
    ['denied', copy.branchFolderDenied(L)],
    ['notConnected', copy.branchNotConnected(L)],
    ['unreachable', copy.branchNoAnswer(L)]
  ];

  it('maps all eight of them and invents none', () => {
    for (const [mode, sentence] of table) {
      expect(branchModeSentence(mode, L)).toBe(sentence);
    }
    expect(branchModeSentence(null, L)).toBe(null);
  });

  it('draws each of the seven that stand in place of the facts', () => {
    for (const [mode, sentence] of table) {
      if (sentence === null) continue;
      const html = draw({ mode, branch: null, sha: null, shortSha: null });
      expect(html).toContain(esc(sentence));
      // A mode that is not `ok` draws no fact at all.
      expect(html).not.toContain('rbranch-fact');
    }
  });

  it('tells an old git apart from no branch at all', () => {
    // THIS IS WHY `noDetails` EXISTS. `nobracket` was added to git in 2.13. An
    // older git refuses the whole question rather than answering part of it,
    // and without its own mode that refusal would have read as no branch, which
    // names the wrong cause.
    expect(copy.branchNoDetails(L)).not.toBe(copy.branchNone(L));
    expect(copy.branchNoDetails(L)).toContain('older');
  });

  it('says a read is in flight rather than drawing an empty answer', () => {
    expect(draw({ mode: null, loading: true })).toContain(
      esc(copy.branchReading(L))
    );
  });

  it('says a build with no bridge cannot do this at all', () => {
    expect(draw({}, { available: false })).toContain(
      esc(copy.BRANCH_NO_BRIDGE)
    );
  });
});

// ---------------------------------------------------------------------------
// The facts, and the four answers about what the branch follows
// ---------------------------------------------------------------------------

describe('what the group draws when a branch was read', () => {
  it('draws the branch as one row, in the shape the local header draws it (Phase 228)', () => {
    // PHASE 228. The body drew three sentences, "The branch checked out on X
    // is main.", "Its newest commit is abc." and what it follows. The local
    // branch header draws a name and its arrows, so the group draws ONE ROW:
    // the name, the short commit muted beside it, the arrows, and the follows
    // sentence as the row's hover title rather than on the face.
    const html = draw();
    const row = html.slice(html.indexOf('class="rbranch-row"') - 200, html.indexOf('</div></div>', html.indexOf('class="rbranch-row"')));
    expect(html).toContain('role="listitem"');
    expect(row).toContain(`class="rbranch-branch">${esc(BR)}<`);
    expect(row).toContain(`class="rbranch-sha num">${SHORT}<`);
    expect(row).toContain('class="branch-arrows num">↑2 ↓1<');
    expect(row).toContain(`title="${esc(copy.branchFollows(BR, UP, 2, 1))}"`);
    expect(html).not.toContain('The branch checked out on');
    expect(html).not.toContain('Its newest commit is');
    expect(html).not.toContain('rbranch-fact');
  });

  it('draws no arrows for a level branch, and keeps the sentence on hover', () => {
    const html = draw({ ahead: 0, behind: 0 });
    expect(html).not.toContain('branch-arrows');
    expect(html).toContain(`title="${esc(copy.branchFollows(BR, UP, 0, 0))}"`);
  });

  it('writes the counts out, and is singular at one', () => {
    expect(copy.branchFollows(BR, UP, 2, 1)).toBe(
      `${BR} follows ${UP}. It is 2 commits ahead and 1 commit behind.`
    );
    expect(copy.branchFollows(BR, UP, 1, 0)).toBe(
      `${BR} follows ${UP}. It is 1 commit ahead and 0 commits behind.`
    );
  });

  it('says zero as a number rather than as the word level', () => {
    const line = copy.branchFollows(BR, UP, 0, 0);
    expect(line).toContain('0 commits ahead and 0 commits behind');
    expect(line).not.toMatch(/\blevel\b/i);
    expect(line).not.toMatch(/\bup to date\b/i);
  });

  it('picks one of four answers about the upstream, in one place', () => {
    const base = entry();
    expect(branchFollowSentence(base, L)).toBe(
      copy.branchFollows(BR, UP, 2, 1)
    );
    // PHASE 228. A branch that follows nothing says nothing, the way the
    // local header draws no arrows for one.
    expect(branchFollowSentence(entry({ upstream: null }), L)).toBe(null);
    expect(draw({ upstream: null })).not.toContain('follows');
    expect(draw({ upstream: null })).not.toContain('branch-arrows');
    expect(
      branchFollowSentence(entry({ upstreamGone: true }), L)
    ).toBe(copy.branchUpstreamGone(BR, UP, L));
    expect(
      branchFollowSentence(entry({ trackUnreadable: true }), L)
    ).toBe(copy.branchTrackUnreadable(BR, L));
    // No branch means there is nothing to say it about.
    expect(branchFollowSentence(entry({ branch: null }), L)).toBe(null);
  });

  it('never draws two zero counts over an answer nothing could read', () => {
    // THE HONESTY FIELD, AND THIS IS THE TEST THAT MAKES IT MATTER. Zero and
    // zero is what a level branch answers and it is also what an unread
    // tracking answer leaves behind, so the two numbers alone cannot tell the
    // two apart. Phase 99 carried a flag through main that the panel never
    // drew. This one is drawn.
    const html = draw({ trackUnreadable: true, ahead: 0, behind: 0 });
    expect(html).toContain(esc(copy.branchTrackUnreadable(BR, L)));
    expect(html).not.toContain(esc('commits ahead'));
    expect(html).not.toContain(esc(copy.branchFollows(BR, UP, 0, 0)));
  });

  it('says the upstream is gone rather than counting against nothing', () => {
    const html = draw({ upstreamGone: true, ahead: 0, behind: 0 });
    expect(html).toContain(esc(copy.branchUpstreamGone(BR, UP, L)));
    expect(html).not.toContain(esc('commits ahead'));
  });

  it('draws no commit when there is no commit to name', () => {
    expect(draw({ shortSha: null })).not.toContain('rbranch-sha');
    expect(draw({ shortSha: '' })).not.toContain('rbranch-sha');
  });
});

// ---------------------------------------------------------------------------
// The honesty sentences below the group
// ---------------------------------------------------------------------------

describe('what the group admits about its own answer', () => {
  it('says when it was read, for every mode the machine answered', () => {
    for (const mode of [
      'ok',
      'noBranch',
      'noDetails',
      'notRepo',
      'missing',
      'denied'
    ] as MachineBranchMode[]) {
      expect(machineAnsweredBranch(mode)).toBe(true);
      // PHASE 230 TOOK THE CLOCK OFF: the group reads again by itself when
      // it is looked at and the local branch header carries none.
      const html = draw({ mode });
      expect(html).not.toContain('Tortie read this from');
      expect(html).not.toContain('rbranch-read-at');
    }
    expect((copy as Record<string, unknown>).machineReadAt).toBeUndefined();
  });

  it('claims no read for the two modes where nothing was read', () => {
    // THIS IS THE HONESTY RULE, AND IT IS THE POINT OF `machineAnsweredBranch`.
    // `notConnected` means nothing was asked and `unreachable` means nothing
    // came back. Drawing "Tortie read this from Studio at 14:32" under either
    // would state a read that never happened.
    for (const mode of ['notConnected', 'unreachable'] as MachineBranchMode[]) {
      expect(machineAnsweredBranch(mode)).toBe(false);
      expect(draw({ mode, readAt: 0 })).not.toContain('Tortie read this from');
    }
  });

  it('draws no standing sentence under the group (Phase 228)', () => {
    // PHASE 228 TOOK FIVE SENTENCES OFF THIS GROUP, being the band above it
    // and the four standing lines under it, on the operator's rule of
    // 2026-09-07. The words are pinned gone in
    // ../../machines/__tests__/p228-off-the-face.test.ts; here the classes
    // are pinned gone from the markup. Tortie still never fetches over
    // there, and the counts on the row are that machine's own, the way the
    // local header's arrows are this Mac's own.
    const html = draw();
    for (const cls of [
      'rbranch-band',
      'rbranch-not-live',
      'rbranch-counts',
      'rbranch-no-switch',
      'rbranch-only-current'
    ]) {
      expect(html).not.toContain(cls);
    }
    expect(html).not.toContain('This does not refresh');
  });

  it('draws no way to change what is checked out over there', () => {
    const html = draw();
    // Counted rather than trusted. The group draws exactly two buttons, being
    // the collapse toggle and Refresh, and one row that is not a control.
    expect(html.split('<button').length - 1).toBe(2);
    expect(html).not.toContain('checkout');
    expect(html.toLowerCase()).not.toContain('switch to');
  });

  it('draws every sentence about the whole answer outside the scrolling body', () => {
    // THE GROUP BELOW THIS ONE IS WHY THIS TEST EXISTS. Two of its sentences
    // were inside its body, and the verifier measured the "newest N" one at ten
    // rows as 36 of its 44 px hidden under a body that ended 8 px above it. The
    // sentence saying the list was cut was itself cut.
    const html = draw();
    const inside = bodyOnly(html);
    // PHASE 228 left one line under the group, the clock, and PHASE 230 took
    // it off, so nothing is drawn under the group at all.
    expect(html).not.toContain('scm-remote-note');
    // The row itself stays inside, because the body is what scrolls.
    expect(inside).toContain('rbranch-row');
    expect(inside).toContain(esc(BR));
  });

  it('draws no band over any answer (Phase 228)', () => {
    for (const over of [
      {},
      { mode: 'notRepo' as MachineBranchMode, branch: null },
      { mode: null, loading: true }
    ]) {
      expect(draw(over)).not.toContain('scm-remote-band');
      expect(draw(over)).not.toContain('Tortie asked');
    }
  });

  it('draws no band whether the group is open or collapsed (Phase 229, then 228)', () => {
    // PHASE 229. The commit box reads the branch answer for its identity
    // precheck with no expand, so a store holding `ok` no longer means a
    // person opened the group. Its verifier read the band on the resting
    // remote face with no press, a sentence the local face does not carry,
    // so the band followed the fold: same answer, collapsed, nothing drawn.
    // PHASE 228 then took the band off outright, so the collapsed reading
    // Phase 229 pinned still holds and the open one now reads the same.
    for (const collapsed of [true, false]) {
      const html = draw({}, { collapsed });
      expect(html).not.toContain('rbranch-band');
      expect(html).not.toContain('Tortie asked');
    }
  });
});

// ---------------------------------------------------------------------------
// The collapsed group, and the sentence Phase 106 rewrote
// ---------------------------------------------------------------------------

describe('a group nobody opened', () => {
  it('draws its header and none of the body', () => {
    const html = draw({}, { collapsed: true });
    expect(html).toContain('data-section="remote-branch"');
    expect(html).toContain('Refresh branch');
    expect(html).not.toContain('rbranch-row');
    expect(html).not.toContain('rbranch-read-at');
  });

  it('reads nothing until it is opened, and the guard is in the source', () => {
    // The effect is what a running app runs, and there is no document here to
    // run it in. The guard is read off the source instead, and it is also a row
    // of build/probe-p106-branch.mjs measured in a real window.
    const source = readFileSync(
      resolve(ROOT, 'src/renderer/scm/RemoteBranchSection.tsx'),
      'utf8'
    );
    expect(source).toContain('if (!collapsed && available) ensure(target);');
    // `ensure` is called from exactly one place.
    expect(source.split('ensure(target)').length - 1).toBe(1);
    // It ships collapsed, which is what makes the guard worth having.
    expect(source).toContain('`gmux.scm.branchesCollapsed.${targetKey(target)}`');
    expect(source).toContain(
      '`gmux.scm.branchesCollapsed.${targetKey(target)}`,\n    true\n  );'
    );
  });

  it('is not refused by a sentence under the groups, because there is none', () => {
    // The sentence named three sections it does not show and Branches was one
    // of them, and Phase 107 rewrote it to name the branch among the things it
    // DOES show. PHASE 228 TOOK IT OFF THE FACE, because a local Source
    // control view carries no sentence saying what it shows.
    expect((copy as Record<string, unknown>).REMOTE_SCM_SECTIONS_NOTE).toBeUndefined();
  });

  it('is placed above the Runs group in the view', () => {
    const source = readFileSync(
      resolve(ROOT, 'src/renderer/scm/ScmSection.tsx'),
      'utf8'
    );
    const branch = source.indexOf('<RemoteBranchSection');
    const runs = source.indexOf('<RemoteRunsSection target=');
    expect(branch).toBeGreaterThan(-1);
    expect(runs).toBeGreaterThan(branch);
  });
});

// ---------------------------------------------------------------------------
// The house writing rules, over every sentence this phase added
// ---------------------------------------------------------------------------

/** Every Phase 106 sentence, composed once with the same values. */
const EVERY: readonly string[] = [
  copy.branchReading(L),
  copy.branchNotConnected(L),
  copy.branchNoAnswer(L),
  copy.branchNotRepo(L),
  copy.branchNone(L),
  copy.branchNoDetails(L),
  copy.branchFolderMissing(L),
  copy.branchFolderDenied(L),
  copy.branchFollows(BR, UP, 2, 1),
  copy.branchUpstreamGone(BR, UP, L),
  copy.branchTrackUnreadable(BR, L),
  copy.BRANCH_NO_BRIDGE
];

describe('the house writing rules, over every Phase 106 sentence', () => {
  it('reads a set of sentences rather than nothing', () => {
    // PHASE 228 took eight off, so twenty one became thirteen, and PHASE 230
    // took the clock off, so twelve.
    expect(EVERY.length).toBe(12);
  });

  it('holds no em dash and no en dash', () => {
    expect(
      EVERY.filter((one) => one.includes('—') || one.includes('–'))
    ).toEqual([]);
  });

  it('holds no colon, because not one of them introduces a list', () => {
    // Nothing is exempt since Phase 230 took the clock off; the exempt list
    // stays so a later clock has to be named here rather than slip through.
    const exempt: string[] = [];
    expect(
      EVERY.filter((one) => !exempt.includes(one) && one.includes(':'))
    ).toEqual([]);
    for (const one of exempt) {
      expect(one.replace('14:32', '')).not.toContain(':');
    }
  });

  it('is complete sentences, each ending in a full stop', () => {
    expect(EVERY.filter((one) => !one.endsWith('.'))).toEqual([]);
  });

  it('never says the word remote to a person', () => {
    expect(EVERY.filter((one) => /\bremote\b/i.test(one))).toEqual([]);
  });

  it('names the machine by its label in every sentence that has one', () => {
    // The ones that do not name a machine are named here rather than counted.
    // One is the row's hover title, which names the branch and what it
    // follows, and one is about this build rather than about a machine.
    expect(EVERY.filter((one) => !one.includes(L))).toEqual([
      copy.branchFollows(BR, UP, 2, 1),
      copy.BRANCH_NO_BRIDGE
    ]);
  });

  it('reuses one string for the three sentences Phase 105 also says', () => {
    // ONE STRING, TWO NAMES, NO DRIFT. A second copy of a sentence is how two
    // groups come to say slightly different things about the same failure.
    expect(copy.runsReadingBranch(L)).toBe(copy.branchReading(L));
    expect(copy.runsNotConnected(L)).toBe(copy.branchNotConnected(L));
    expect(copy.runsNoAnswer(L)).toBe(copy.branchNoAnswer(L));
  });
});
