/**
 * Phase 230. The remote Source control view keeps the two refresh controls
 * the local one keeps, and no more.
 *
 * Research 89 section 4.6 counted them on his Mac Pro: remote five, local
 * two. The five were the header band's "Read what changed on that machine
 * again" and one button on each of the four groups. Every group reads again
 * by itself now, at the moments ../../machines/use-remote-reread.ts names, so
 * the header band's button carries the local band's own label and title,
 * the Branch group's carries the local Branches group's, and the Changes,
 * History and Runs groups carry none, which is what the local Changes and
 * History groups carry.
 *
 * Three things are proved. The labels, read off the SOURCE of both faces with
 * comments stripped, are the same two strings, so a later round cannot give
 * the remote face a third or a different one without editing this file. The
 * three panels that lost their button draw none. And the one press that is
 * left reads what Phase 229 said it reads, the Changes group and the Branch
 * group when that branch has been read, driven over the shipping stores.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';

const readBranch = vi.fn();
const reviewFiles = vi.fn();

// The stores read window.gmux while zustand builds their initial state, so
// the globals have to exist before the modules under test are ever imported.
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
    machines: { readBranch, reviewFiles }
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

const { refreshRemoteScm } = await import('../remote-refresh');
const { useRemoteBranch } = await import('../remote-branch');
const { useRemoteChanges } = await import('../remote-changes');
const { RemoteHistoryPanel } = await import('../RemoteHistorySection');
const { RemoteRunsPanel } = await import('../RemoteRunsSection');
const { RemoteBranchPanel } = await import('../RemoteBranchSection');

const ROOT = resolve(import.meta.dirname, '../../../..');
const STUDIO = { machineId: 'studio', path: '/home/greg/api' };
const L = 'Studio';

/** The text with every comment removed, so a record cannot read as code. */
function withoutComments(text: string): string {
  return text
    .replace(/(^|[\s{(=,;])\/\*[\s\S]*?\*\//g, '$1')
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}

/** Every `aria-label="Refresh …"` or `"Read … again"` literal in a file. */
function refreshLabelsOf(rel: string): string[] {
  const src = withoutComments(
    readFileSync(resolve(ROOT, 'src/renderer/scm', rel), 'utf8')
  );
  return [...src.matchAll(/aria-label="((?:Refresh|Read )[^"]*)"/g)].map(
    (m) => m[1] as string
  );
}

describe('the labels, read off both faces', () => {
  it('the remote face carries exactly the two the local face carries', () => {
    // The local view: the branch header's button and the Branches group's.
    // The Runs group's "Refresh runs" is drawn only with a GitHub origin and
    // is the one control the local face has that the remote does not, which
    // is a control fewer and never a sentence more.
    // BranchHeader draws "Refresh git status" on BOTH faces from two
    // literals, one in its remote branch and one in its local branch, so
    // each face gets one of them.
    const header = refreshLabelsOf('BranchHeader.tsx');
    expect(header).toEqual(['Refresh git status', 'Refresh git status']);
    const local = [header[1] as string, ...refreshLabelsOf('BranchesView.tsx')];
    expect(local.sort()).toEqual(['Refresh branches', 'Refresh git status']);
    // The remote view: the same header's remote branch and the four groups.
    const remote = [
      header[0] as string,
      ...refreshLabelsOf('ScmSection.tsx'),
      ...refreshLabelsOf('RemoteHistorySection.tsx'),
      ...refreshLabelsOf('RemoteBranchSection.tsx'),
      ...refreshLabelsOf('RemoteRunsSection.tsx')
    ];
    expect(remote.sort()).toEqual(local.sort());
    // Nothing on the remote face says "again" any more.
    for (const rel of [
      'BranchHeader.tsx',
      'ScmSection.tsx',
      'RemoteHistorySection.tsx',
      'RemoteBranchSection.tsx',
      'RemoteRunsSection.tsx'
    ]) {
      expect(refreshLabelsOf(rel).some((l) => /again/.test(l))).toBe(false);
    }
  });

  it('the remote header carries the local header\'s title too', () => {
    const src = withoutComments(
      readFileSync(resolve(ROOT, 'src/renderer/scm/BranchHeader.tsx'), 'utf8')
    );
    expect(src.match(/title="Refresh"/g)?.length).toBe(2);
    expect(src).not.toContain('Read what changed on that machine');
  });

  it('can fail: the scanner reads a label out of code and not out of a comment', () => {
    const planted =
      '{/* aria-label="Refresh runs" */}\n<button aria-label="Refresh branches" />';
    const labels = [
      ...withoutComments(planted).matchAll(/aria-label="((?:Refresh|Read )[^"]*)"/g)
    ].map((m) => m[1]);
    expect(labels).toEqual(['Refresh branches']);
  });
});

describe('the three panels that lost their button', () => {
  const history = {
    machineId: 'studio',
    path: '/home/greg/api',
    machineLabel: L,
    mode: 'ok',
    entries: [],
    limit: 50,
    maxCount: 50,
    ceiling: 2000,
    hasMore: false,
    atCeiling: false,
    headSha: null,
    upstreamSha: null,
    mergeBase: null,
    markedCount: 0,
    divergenceTruncated: false,
    answerBytes: 0,
    loading: false,
    refreshing: false,
    readAt: 1,
    elapsedMs: 1,
    refused: false
  } as Parameters<typeof RemoteHistoryPanel>[0]['entry'];
  const runs = {
    machineId: 'studio',
    path: '/home/greg/api',
    machineLabel: L,
    mode: 'ok',
    ownerRepo: 'itavero/tortie',
    branch: 'main',
    headSha: null,
    limit: 10,
    runs: [],
    issues: [],
    health: { state: 'ready' },
    loading: false,
    refreshing: false,
    readAt: 1,
    elapsedMs: 1,
    refused: false
  } as Parameters<typeof RemoteRunsPanel>[0]['entry'];
  const branch = {
    machineId: 'studio',
    path: '/home/greg/api',
    machineLabel: L,
    mode: 'ok',
    branch: 'main',
    sha: null,
    shortSha: null,
    upstream: null,
    upstreamGone: false,
    ahead: 0,
    behind: 0,
    trackUnreadable: false,
    identity: 'known',
    loading: false,
    refreshing: false,
    readAt: 1,
    elapsedMs: 1,
    refused: false
  } as Parameters<typeof RemoteBranchPanel>[0]['entry'];

  it('History and Runs draw no refresh control, Branch draws the local label', () => {
    const h = renderToStaticMarkup(
      <RemoteHistoryPanel
        entry={history}
        label={L}
        available={true}
        collapsed={true}
        now={0}
        onToggle={() => undefined}
        onLoadMore={() => undefined}
        // PHASE 233 added the expand gesture under this phase. Nothing is
        // open, which is the resting face this file was written against, so
        // the reading below is exactly the reading it took before.
        expanded={new Set<string>()}
        details={{}}
        onToggleRow={() => undefined}
        onOpenFile={() => undefined}
      />
    );
    expect(h).not.toContain('codicon-refresh');
    expect(h).not.toContain('aria-label="Refresh');
    const r = renderToStaticMarkup(
      <RemoteRunsPanel
        entry={runs}
        label={L}
        now={0}
        available={true}
        collapsed={true}
        onToggle={() => undefined}
      />
    );
    expect(r).not.toContain('codicon-refresh');
    expect(r).not.toContain('aria-label="Refresh');
    const b = renderToStaticMarkup(
      <RemoteBranchPanel
        entry={branch}
        label={L}
        available={true}
        collapsed={true}
        onToggle={() => undefined}
        onRefresh={() => undefined}
      />
    );
    expect(b.match(/codicon-refresh/g)?.length).toBe(1);
    expect(b).toContain('aria-label="Refresh branches"');
  });

  it('the Runs heading waits for the first answer and stays once it is there', () => {
    const unread = { ...runs, mode: null, readAt: 0, loading: true };
    expect(
      renderToStaticMarkup(
        <RemoteRunsPanel
          entry={unread as typeof runs}
          label={L}
          now={0}
          available={true}
          collapsed={true}
          onToggle={() => undefined}
        />
      )
    ).toBe('');
    const rereading = { ...runs, refreshing: true };
    expect(
      renderToStaticMarkup(
        <RemoteRunsPanel
          entry={rereading}
          label={L}
          now={0}
          available={true}
          collapsed={true}
          onToggle={() => undefined}
        />
      )
    ).toContain('data-section="remote-runs"');
  });
});

describe('the one press that is left', () => {
  beforeEach(() => {
    useRemoteBranch.setState({ byTarget: {} });
    useRemoteChanges.setState({ byTarget: {} });
    readBranch.mockReset();
    reviewFiles.mockReset();
    reviewFiles.mockResolvedValue({
      machineId: 'studio',
      machineLabel: L,
      repoPath: '/home/greg/api',
      headSha: '',
      files: [],
      total: 0,
      untracked: [],
      untrackedTotal: 0,
      note: null
    });
    readBranch.mockResolvedValue({
      machineId: 'studio',
      machineLabel: L,
      cwd: '/home/greg/api',
      mode: 'ok',
      branch: 'main',
      sha: null,
      shortSha: null,
      upstream: null,
      upstreamGone: false,
      ahead: 0,
      behind: 0,
      trackUnreadable: false,
      identity: 'known',
      readAt: 1,
      elapsedMs: 1
    });
  });

  it('reads the Changes group, and the Branch group only once that branch has been read', async () => {
    await refreshRemoteScm(STUDIO);
    expect(reviewFiles).toHaveBeenCalledTimes(1);
    expect(readBranch).toHaveBeenCalledTimes(0);

    await useRemoteBranch.getState().refresh(STUDIO);
    expect(readBranch).toHaveBeenCalledTimes(1);
    await refreshRemoteScm(STUDIO);
    expect(reviewFiles).toHaveBeenCalledTimes(2);
    expect(readBranch).toHaveBeenCalledTimes(2);
  });

  it('is what the header band presses', () => {
    const src = withoutComments(
      readFileSync(resolve(ROOT, 'src/renderer/scm/BranchHeader.tsx'), 'utf8')
    );
    expect(src).toContain('onClick={() => void refreshRemoteScm(target)}');
    // And the Changes group presses nothing of its own any more.
    const scm = withoutComments(
      readFileSync(resolve(ROOT, 'src/renderer/scm/ScmSection.tsx'), 'utf8')
    );
    expect(scm).not.toContain('Refresh changes');
  });
});
