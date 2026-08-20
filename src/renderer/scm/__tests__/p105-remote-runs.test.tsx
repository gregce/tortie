/**
 * Phase 105. The Runs group for a folder on another machine.
 *
 * WHAT THIS FILE IS FOR. Two separate things can go wrong here and neither is
 * caught by a type. The first is a read nobody asked for, because the whole
 * design rests on a collapsed group asking that machine nothing and starting no
 * gh process on this Mac. The second is a sentence that claims more than the
 * answer supports, which is exactly the shape Phase 99 shipped when it carried a
 * cut through main that the panel never drew.
 *
 * HOW THIS RENDERS. `environment` is node and this repository carries no jsdom
 * and no @testing-library/react, so the section is rendered with
 * `renderToStaticMarkup`, which is the shape ../../app/__tests__/
 * p100-remote-lines.test.tsx uses. That is also why `RemoteRunsPanel` is pure
 * over its props and `RemoteRunsSection` is a store connected wrapper with no
 * markup of its own.
 *
 * WHAT THIS FILE CANNOT DO, AND IT IS NAMED HERE RATHER THAN LEFT TO BE FOUND.
 * It cannot press a button, because there is no document. So the three claims
 * about gestures are proved in the two places a gesture ends up, being the
 * store's own verbs and the two plain functions the markup hands to `onClick`.
 * The one claim that only a running app can settle, which is that the effect
 * behind the first expand is guarded by the collapsed state, is read off the
 * source of the section and is also row 1 of build/probe-p105-runs.mjs.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ActionsHealth, ActionsParseIssue, ActionsRun } from '@shared/actions';
import type { MachineRunsMode, MachineRunsResult } from '@shared/ipc';

/** Repository root, from this file's own location. */
const ROOT = resolve(import.meta.dirname, '../../../..');

const readRuns = vi.fn();
const opened: string[] = [];

// The stores read window.gmux while zustand builds their initial state, so the
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
  open: (url: string) => {
    opened.push(url);
    return null;
  },
  gmux: {
    sessions: {
      restore: () => Promise.resolve({}),
      discard: () => Promise.resolve()
    },
    setSessionsPosition: () => Promise.resolve(),
    machines: { readRuns }
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

const { RemoteRunsPanel, runsModeSentence } = await import(
  '../RemoteRunsSection'
);
const { machineAnsweredRuns, remoteRunsAvailable, shortSha, useRemoteRuns } =
  await import('../remote-runs');
const { openLabel, RUNS_EMPTY, hiddenNotes, healthNote } = await import(
  '../runs-format'
);
const { runRowClick } = await import('../RunRow');
const copy = await import('../../app/machine-copy');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const L = 'Studio';
const AT = new Date(2026, 7, 18, 14, 32, 0).getTime();
const SHA = '1f2e3d4c5b6a798877665544332211aabbccddee';

const STUDIO = { machineId: 'studio', path: '/home/greg/api' };
const ATTIC = { machineId: 'attic', path: '/home/greg/api' };

function run(over: Partial<ActionsRun> = {}): ActionsRun {
  return {
    id: 7,
    number: 7,
    workflowName: 'gates',
    displayTitle: 'a commit over there',
    status: 'completed',
    statusRaw: 'completed',
    conclusion: 'success',
    conclusionRaw: 'success',
    event: 'push',
    headBranch: 'main',
    headSha: SHA,
    createdAt: AT - 600_000,
    startedAt: AT - 590_000,
    updatedAt: AT - 400_000,
    url: 'https://github.com/itavero/tortie/actions/runs/7',
    ...over
  };
}

/** One store entry, of the shape a good answer leaves behind. */
function entry(over: Record<string, unknown> = {}): Parameters<
  typeof RemoteRunsPanel
>[0]['entry'] {
  return {
    machineId: 'studio',
    path: '/home/greg/api',
    machineLabel: L,
    mode: 'ok' as MachineRunsMode,
    ownerRepo: 'itavero/tortie',
    branch: 'main',
    headSha: SHA,
    limit: 10,
    runs: [run()],
    issues: [] as readonly ActionsParseIssue[],
    health: { state: 'ready' } as ActionsHealth,
    loading: false,
    refreshing: false,
    readAt: AT,
    elapsedMs: 400,
    ...over
  } as Parameters<typeof RemoteRunsPanel>[0]['entry'];
}

/** The section's markup for one entry, expanded, with a live bridge. */
function draw(
  over: Record<string, unknown> = {},
  props: Record<string, unknown> = {}
): string {
  return renderToStaticMarkup(
    <RemoteRunsPanel
      entry={entry(over)}
      label={L}
      now={AT}
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
 * A sentence that says the list is short and cannot be read is worth nothing.
 */
function bodyOnly(html: string): string {
  const start = html.indexOf('section-body runs-body');
  const end = html.indexOf('</section>', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return html.slice(start, end);
}

/** One answer of the shape main sends. */
function answer(over: Record<string, unknown> = {}): MachineRunsResult {
  return {
    machineId: 'studio',
    machineLabel: L,
    cwd: '/home/greg/api',
    mode: 'ok',
    ownerRepo: 'itavero/tortie',
    branch: 'main',
    headSha: SHA,
    limit: 10,
    runs: [run()],
    issues: [],
    health: { state: 'ready' },
    readAt: AT,
    elapsedMs: 400,
    ...over
  } as MachineRunsResult;
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  useRemoteRuns.setState({ byTarget: {} });
  readRuns.mockReset();
  readRuns.mockResolvedValue(answer());
  opened.length = 0;
});

// ---------------------------------------------------------------------------
// The store: who asks, how often, and under which key
// ---------------------------------------------------------------------------

describe('the store asks once, and only when it is asked to', () => {
  it('says the bridge is there', () => {
    expect(remoteRunsAvailable()).toBe(true);
  });

  it('asks nothing until something calls ensure', () => {
    // Building the store is not a read. The section calls `ensure` from an
    // effect that only runs while the group is open, which is the guard the
    // last describe in this file reads off the source.
    expect(readRuns).toHaveBeenCalledTimes(0);
  });

  it('asks exactly once for a target, however many expands there are', async () => {
    useRemoteRuns.getState().ensure(STUDIO);
    await flush();
    useRemoteRuns.getState().ensure(STUDIO);
    await flush();
    expect(readRuns).toHaveBeenCalledTimes(1);
    expect(readRuns).toHaveBeenCalledWith({
      machineId: 'studio',
      cwd: '/home/greg/api'
    });
  });

  it('asks again on Refresh', async () => {
    useRemoteRuns.getState().ensure(STUDIO);
    await flush();
    await useRemoteRuns.getState().refresh(STUDIO);
    expect(readRuns).toHaveBeenCalledTimes(2);
  });

  it('drops a second Refresh while one is still in flight', async () => {
    let answerFirst: (r: MachineRunsResult) => void = () => undefined;
    readRuns.mockReturnValueOnce(
      new Promise<MachineRunsResult>((r) => {
        answerFirst = r;
      })
    );
    const first = useRemoteRuns.getState().refresh(STUDIO);
    await flush();
    await useRemoteRuns.getState().refresh(STUDIO);
    expect(readRuns).toHaveBeenCalledTimes(1);
    answerFirst(answer());
    await first;
  });

  it('holds two entries for one path on two machines', async () => {
    useRemoteRuns.getState().ensure(STUDIO);
    await flush();
    useRemoteRuns.getState().ensure(ATTIC);
    await flush();
    expect(Object.keys(useRemoteRuns.getState().byTarget).sort()).toEqual([
      'attic:/home/greg/api',
      'studio:/home/greg/api'
    ]);
  });

  it('never schedules a read of its own', async () => {
    vi.useFakeTimers();
    useRemoteRuns.getState().ensure(STUDIO);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(readRuns).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('turns a channel that threw into a state and not a crash', async () => {
    readRuns.mockRejectedValueOnce(new Error('no'));
    await useRemoteRuns.getState().refresh(STUDIO);
    const held = useRemoteRuns.getState().byTarget['studio:/home/greg/api'];
    expect(held?.mode).toBe('unreachable');
    expect(held?.readAt).toBe(0);
  });

  it('forgets one target and keeps the other', async () => {
    useRemoteRuns.getState().ensure(STUDIO);
    await flush();
    useRemoteRuns.getState().ensure(ATTIC);
    await flush();
    useRemoteRuns.getState().forget(STUDIO);
    expect(Object.keys(useRemoteRuns.getState().byTarget)).toEqual([
      'attic:/home/greg/api'
    ]);
  });
});

// ---------------------------------------------------------------------------
// The eight modes, each with its own sentence
// ---------------------------------------------------------------------------

describe('every mode says its own sentence, and it comes from machine-copy', () => {
  const table: [MachineRunsMode, string | null][] = [
    ['ok', null],
    ['notRepo', copy.runsNotRepo(L)],
    ['notGitHub', copy.runsNotGitHub(L)],
    ['noBranch', copy.runsNoBranch(L)],
    ['missing', copy.runsFolderMissing(L)],
    ['denied', copy.runsFolderDenied(L)],
    ['notConnected', copy.runsNotConnected(L)],
    ['unreachable', copy.runsNoAnswer(L)]
  ];

  it('maps all eight of them and invents none', () => {
    for (const [mode, sentence] of table) {
      expect(runsModeSentence(mode, L)).toBe(sentence);
    }
    expect(runsModeSentence(null, L)).toBe(null);
  });

  it('draws each of the seven that stand in place of rows', () => {
    for (const [mode, sentence] of table) {
      if (sentence === null) continue;
      const html = draw({ mode, runs: [], branch: null, headSha: null });
      expect(html).toContain(sentence);
      // A mode that is not `ok` draws no row and no list.
      expect(html).not.toContain('runs-list');
    }
  });

  it('says a read is in flight rather than drawing an empty list', () => {
    expect(draw({ mode: null, runs: [], loading: true })).toContain(
      copy.runsReadingBranch(L)
    );
  });

  it('says a build with no bridge cannot do this at all', () => {
    expect(draw({}, { available: false })).toContain(copy.RUNS_NO_BRIDGE);
  });

  it('says there are no runs rather than saying nothing', () => {
    expect(draw({ runs: [] })).toContain(RUNS_EMPTY);
  });
});

// ---------------------------------------------------------------------------
// The honesty sentences. Phase 99 is why each of them is asserted
// ---------------------------------------------------------------------------

describe('what the panel admits about its own answer', () => {
  it('names the machine, the branch and the commit checked out over there', () => {
    const html = draw();
    expect(html).toContain(copy.runsBranchAt('main', L, '1f2e3d4'));
    expect(shortSha(SHA)).toBe('1f2e3d4');
  });

  it('draws no branch sentence when there is no branch to name', () => {
    const html = draw({ mode: 'noBranch', runs: [], branch: null, headSha: null });
    expect(html).not.toContain('The branch checked out on');
  });

  it('says when it was read, for every mode the machine answered', () => {
    for (const mode of [
      'ok',
      'notRepo',
      'notGitHub',
      'noBranch',
      'missing',
      'denied'
    ] as MachineRunsMode[]) {
      expect(machineAnsweredRuns(mode)).toBe(true);
      expect(draw({ mode, runs: [] })).toContain(copy.runsReadAt(L, AT));
    }
  });

  it('claims no read for the two modes where nothing was read', () => {
    // THIS IS THE HONESTY RULE, AND IT IS THE POINT OF `machineAnsweredRuns`.
    // `notConnected` means nothing was asked and `unreachable` means nothing
    // came back. Drawing "Tortie read this from Studio at 14:32" under either
    // would state a read that never happened.
    for (const mode of ['notConnected', 'unreachable'] as MachineRunsMode[]) {
      expect(machineAnsweredRuns(mode)).toBe(false);
      expect(draw({ mode, runs: [], readAt: 0 })).not.toContain(
        'Tortie read this from'
      );
    }
  });

  it('says the list does not refresh, wherever there is a list', () => {
    expect(draw()).toContain(copy.RUNS_NOT_LIVE);
  });

  it('says once that the steps are not shown here', () => {
    expect(draw()).toContain(copy.RUNS_STEPS_ELSEWHERE);
    // No rows, nothing to say about their steps.
    expect(draw({ runs: [] })).not.toContain(copy.RUNS_STEPS_ELSEWHERE);
  });

  it('says the rows are the newest ones when the limit was reached', () => {
    const three = [run({ id: 1 }), run({ id: 2 }), run({ id: 3 })];
    expect(draw({ runs: three, limit: 3 })).toContain(copy.runsNewest(3));
    // One under the limit means there is nothing older to warn about.
    expect(draw({ runs: three, limit: 4 })).not.toContain('These are the newest');
  });

  it('says which rows GitHub sent that the parser refused', () => {
    const issues: ActionsParseIssue[] = [
      { kind: 'run', field: 'databaseId', reason: 'missing' }
    ];
    const line = hiddenNotes(issues)[0];
    expect(line).toBeDefined();
    expect(draw({ issues })).toContain(line as string);
  });

  it('draws every sentence about the whole list outside the scrolling body', () => {
    // THE FIX ROUND IS WHY THIS TEST EXISTS. Two of these five were inside the
    // body, and the verifier measured the "newest N" one at ten rows as 36 of
    // its 44 px hidden under a body that ended 8 px above it. The sentence
    // saying the list was cut was itself cut.
    const issues: ActionsParseIssue[] = [
      { kind: 'run', field: 'databaseId', reason: 'missing' }
    ];
    const three = [run({ id: 1 }), run({ id: 2 }), run({ id: 3 })];
    const html = draw({ runs: three, limit: 3, issues });
    const inside = bodyOnly(html);
    const outside = [
      copy.RUNS_STEPS_ELSEWHERE,
      copy.runsNewest(3),
      copy.RUNS_NOT_LIVE,
      copy.runsBranchAt('main', L, '1f2e3d4'),
      copy.runsReadAt(L, AT),
      hiddenNotes(issues)[0] as string
    ];
    for (const sentence of outside) {
      expect(html).toContain(sentence);
      expect(inside).not.toContain(sentence);
    }
    // The rows themselves stay inside, because the body is what scrolls.
    expect(inside).toContain('runs-list');
  });

  it("says gh's own rung when gh could not answer", () => {
    const health: ActionsHealth = { state: 'logged-out' };
    const note = healthNote(health);
    expect(note).not.toBe(null);
    expect(draw({ health, runs: [] })).toContain(
      (note as { line: string }).line
    );
  });

  it('draws the band only where both halves of it are true', () => {
    // The band says Tortie asked that machine AND asked GitHub. Both are past
    // tense, so it is drawn for the one mode where both happened.
    expect(draw()).toContain(copy.runsOnMachineBand(L));
    expect(draw({ mode: 'notGitHub', runs: [] })).not.toContain(
      copy.runsOnMachineBand(L)
    );
    expect(draw({ mode: null, runs: [], loading: true })).not.toContain(
      copy.runsOnMachineBand(L)
    );
  });
});

// ---------------------------------------------------------------------------
// The rows themselves
// ---------------------------------------------------------------------------

describe('a run row opens the run and does not expand it', () => {
  it('carries the label that says so', () => {
    const html = draw();
    expect(html).toContain(openLabel(run()));
    expect(openLabel(run())).toBe('Open gates run 7 on GitHub');
  });

  it('draws no chevron and claims no expanded state', () => {
    const html = draw();
    expect(html).not.toContain('runs-chevron');
    expect(html).not.toContain('aria-expanded="false"><span class="runs-icon');
  });

  it('opens the run URL when it is clicked', () => {
    runRowClick(run(), 'open');
    expect(opened).toEqual([
      'https://github.com/itavero/tortie/actions/runs/7'
    ]);
  });

  it('leaves the local list expanding, which is the default', () => {
    const toggled: number[] = [];
    runRowClick(run(), 'expand', (id) => toggled.push(id));
    expect(toggled).toEqual([7]);
    expect(opened).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The collapsed group, and the sentence Phase 105 rewrote
// ---------------------------------------------------------------------------

describe('a group nobody opened', () => {
  it('draws its header and none of the body', () => {
    const html = draw({}, { collapsed: true });
    expect(html).toContain('data-section="remote-runs"');
    expect(html).toContain('Refresh runs');
    expect(html).not.toContain('runs-list');
    expect(html).not.toContain(copy.RUNS_NOT_LIVE);
  });

  it('reads nothing until it is opened, and the guard is in the source', () => {
    // The effect is what a running app runs, and there is no document here to
    // run it in. The guard is read off the source instead, and row 1 of
    // build/probe-p105-runs.mjs is the same claim measured in a real window.
    const source = readFileSync(
      resolve(ROOT, 'src/renderer/scm/RemoteRunsSection.tsx'),
      'utf8'
    );
    expect(source).toContain('if (!collapsed && available) ensure(target);');
    // `ensure` is called from exactly one place.
    expect(source.split('ensure(target)').length - 1).toBe(1);
  });

  it('no longer says Tortie cannot show runs on another machine', () => {
    // The sentence used to name three sections it does not show and Runs was
    // one of them. It names runs among the things it DOES show now.
    expect(copy.REMOTE_SCM_SECTIONS_ABSENT).not.toMatch(
      /does not show[^.]*\bruns\b/i
    );
    expect(copy.REMOTE_SCM_SECTIONS_ABSENT).toMatch(/shows[^.]*\bruns\b/i);
    expect(copy.REMOTE_SCM_SECTIONS_ABSENT).toContain('history');
    // PHASE 106 CHANGED THE LINE BELOW, and it is the only line in this file
    // that phase touched. It read `toContain('branches')`, which was the
    // refusal clause naming the Branches section. Phase 106 draws a Branch
    // group for a folder on another machine, so that clause is gone and the
    // sentence names the branch among the things Tortie does show. History is
    // the one section the sentence still refuses, and the assertion above
    // already reads it.
    expect(copy.REMOTE_SCM_SECTIONS_ABSENT).toMatch(/shows[^.]*\bbranch\b/i);
  });
});
