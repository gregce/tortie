/**
 * THE COMMIT HISTORY of a folder on another machine (Phase 107).
 *
 * It is the seventh thing the Source Control view can draw and the second one
 * it draws for a tab whose folder is on another computer. It shows the newest
 * commits over there, with the same swimlane picture the local History draws,
 * the same ref marks and the same relative ages. Every row came from that
 * machine's own git and nothing in it changed anything there.
 *
 * ## Four rules this group obeys, and each of them is load bearing
 *
 * 1. IT SHIPS COLLAPSED AND READS NOTHING UNTIL THE FIRST EXPAND. A tab nobody
 *    expanded asks nothing of anybody. That is the rule the two groups below it
 *    already follow and it matters more here, because this read is the largest
 *    one the product makes over a link.
 * 2. NO TIMER, ANYWHERE. A read happens on the first expand, on Load more and
 *    when a person presses Refresh. Nothing polls the machine, and there is no
 *    watch, because main cannot see a commit made on another computer. The
 *    group says on screen that it does not refresh.
 * 3. IT NEVER OFFERS A VERB THAT WRITES. There is no checkout, no branch, no
 *    cherry pick and no revert. The local History has all four. Each of them
 *    would have to write on somebody else's computer, and the group says on
 *    screen that it changes nothing over there.
 * 4. A ROW IS NOT A CONTROL. It does not expand, clicking it opens nothing and
 *    it has no menu. Reading the files one commit changed needs two more reads
 *    and this round shipped one, so a row that lit up under the pointer would
 *    promise something that never happens. `historyFilesElsewhere` says so
 *    under the group.
 *
 * ## The three honesty fields, and why the count is three
 *
 * `hasMore`, `atCeiling` and `divergenceTruncated` each get their own sentence
 * on screen, and condition 57m of build/conformance-machines.mjs fails the
 * build if this file stops naming all three. Phase 99 carried a truncation flag
 * through main that the panel never read, so a list that had been cut was drawn
 * as a whole one. Three flags is three chances to repeat that, so all three are
 * drawn.
 *
 * - `hasMore` means the walk found older commits than the page holds. The
 *   sentence names the count on screen and the Load more button is drawn.
 * - `atCeiling` means Tortie has read every commit it will read from another
 *   machine and there are still older ones. The button is gone and the sentence
 *   names what to do instead.
 * - `divergenceTruncated` means the unpushed and unpulled marks were read for
 *   the page and no further, so an older row with no mark could be either.
 *
 * ## Where each sentence is drawn, and why
 *
 * EVERY SENTENCE THAT DESCRIBES THE ANSWER AS A WHOLE IS DRAWN BELOW THE GROUP
 * AND NOT INSIDE ITS BODY. The body scrolls, so a sentence inside it can sit
 * under its own fold. Phase 105's verifier measured that defect on the Runs
 * group. At ten rows the body was 310 px tall over 352 px of content, the
 * sentence saying the list had been cut spanned y 683 to 727, the body ended at
 * y 691, and 36 of that sentence's 44 px were hidden. THIS BODY IS THE ONE THAT
 * HOLDS THE MOST, because it holds fifty rows at the first read, so the rule
 * matters more here than anywhere else it has been applied.
 *
 * THESE SENTENCES ARE ALSO WHY THE COLUMN SCROLLS. Measured at 1440 by 885 with
 * the default sidebar, they are 480 px of a 748 px column. They belong to no
 * scrolling body, so nothing about the groups can make them fit, and before the
 * fix round of this phase the column met the shortfall by shrinking its groups
 * until the Runs group was under a box with `overflow: hidden`. The rule and the
 * numbers are at `.scm-sections.remote` in ./scm.css.
 *
 * The Load more button is the one thing under the rows that is INSIDE the body,
 * and that is deliberate. It is a control rather than a sentence, the local
 * History puts its own in the same place, and a person who has scrolled to the
 * end of the rows is exactly where it is.
 *
 * ## What is NOT true, said plainly
 *
 * A PAGE IS READ FRESH AND THE PICTURE CAN BE DRAWN DIFFERENTLY AFTER LOAD
 * MORE. `layoutGraph` asks its caller to hold the ref set still between pages,
 * which is what depth.ts does locally with `logRefs`. This door cannot carry
 * one, because the far side resolves its own branches, tags and remote branches
 * on every read. The whole list is replaced rather than added to, so no row
 * tears, and the lines on the left can still move. `historyPagesAreFresh` says
 * so under the group.
 *
 * THE REF MARKS ARE NOT GIVEN AN UPSTREAM NAME. `badgesFromRefs` takes the
 * upstream's SHORT NAME so it can mark the one pill that is the branch HEAD
 * follows, and the answer carries the upstream's SHA rather than its name.
 * Reading the name is a second question this phase does not ask. The effect is
 * one pill's emphasis and nothing else, because the three lane colours come
 * from the three SHAs, which the answer does carry.
 *
 * TORTIE DOES NOT KNOW WHEN THAT MACHINE LAST FETCHED. The pill for a branch on
 * a server carries a tooltip ending in when this clone last fetched, and there
 * is no such reading for a folder on another machine. So the group says once,
 * in `historyRefsAreThatMachines`, that the marks are that machine's own copies
 * and that Tortie did not read when it last fetched.
 *
 * THERE IS NO AUTOMATIC SECOND READ WHEN A MACHINE STARTS ANSWERING. Phase 105
 * and Phase 106 both left this open on purpose and this phase leaves it open
 * too. A person who expands before their machine has connected reads the
 * sentence saying so and presses Refresh, which costs one press.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { GitGraphLogEntry } from '@shared/types';
import type { MachineHistoryMode } from '@shared/ipc';
import type { WorkspaceTarget } from '@shared/workspace-target';
import { targetKey } from '@shared/workspace-target';
import { Codicon } from '../icons';
import {
  HISTORY_LOAD_MORE,
  HISTORY_NO_BRIDGE,
  historyCeiling,
  historyFilesElsewhere,
  historyFolderDenied,
  historyFolderMissing,
  historyMarksCut,
  historyNoAnswer,
  historyNoCommits,
  historyNoWrite,
  historyNotConnected,
  historyNotLive,
  historyNotRepo,
  historyOlderExist,
  historyOnMachineBand,
  historyPagesAreFresh,
  historyReading,
  historyRefsAreThatMachines,
  machineReadAt
} from '../app/machine-copy';
import { CommitGraph, CommitGraphSpacer, useLaneCap } from './graph/CommitGraph';
import { capRow, gutterColumns, layoutGraph, makeRoleResolver } from './graph';
import type { CappedRow, GraphLayout, GraphRow } from './graph';
import { badgesFromRefs, RefPills, refsAriaClause } from './ref-badges';
import type { RefBadge } from './ref-badges';
import { formatRelative, shortSha } from './format';
import {
  machineAnsweredHistory,
  remoteHistoryAvailable,
  remoteHistoryOf,
  useRemoteHistory
} from './remote-history';
import type { RemoteHistoryEntry } from './remote-history';
import { usePersistedBool } from './sections';
import './remote-history.css';

/**
 * The one sentence that stands in place of the rows, or null when there are
 * rows to draw.
 *
 * Every mode except `ok` has exactly one sentence and it is written in
 * machine-copy.ts. This function is the whole mapping, so a mode that gains a
 * sentence gains it in one place and the test reads the same table the group
 * draws from.
 */
export function historyModeSentence(
  mode: MachineHistoryMode | null,
  label: string
): string | null {
  switch (mode) {
    case null:
    case 'ok':
      return null;
    case 'noCommits':
      return historyNoCommits(label);
    case 'notRepo':
      return historyNotRepo(label);
    case 'missing':
      return historyFolderMissing(label);
    case 'denied':
      return historyFolderDenied(label);
    case 'notConnected':
      return historyNotConnected(label);
    case 'unreachable':
      return historyNoAnswer(label);
  }
}

export interface RemoteHistoryPanelProps {
  entry: RemoteHistoryEntry;
  /** The name the person gave that machine. No sentence composes a host name. */
  label: string;
  /** False on a build whose preload cannot ask a machine anything. */
  available: boolean;
  collapsed: boolean;
  /** Epoch ms, so every relative age in one render reads off one clock. */
  now: number;
  onToggle: () => void;
  onRefresh: () => void;
  onLoadMore: () => void;
}

/**
 * The whole group, pure over its props.
 *
 * It is pure so that ./__tests__/p107-remote-history.test.tsx can render every
 * one of the seven modes and read the sentences back. This repository carries
 * no jsdom and no testing library, so a store connected component cannot be
 * driven by a test at all, which is the shape ./RemoteBranchSection.tsx and
 * ./RemoteRunsSection.tsx already use.
 */
export function RemoteHistoryPanel({
  entry,
  label,
  available,
  collapsed,
  now,
  onToggle,
  onRefresh,
  onLoadMore
}: RemoteHistoryPanelProps): React.JSX.Element {
  /**
   * The list's own node, held in state rather than in a ref.
   *
   * `useLaneCap` explains why. The group is conditionally rendered, so an
   * effect keyed on a stable ref object would never attach an observer to a
   * body that mounted collapsed, and would keep observing a detached one after
   * a collapse.
   */
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null);

  const sentence = historyModeSentence(entry.mode, label);
  const answered = machineAnsweredHistory(entry.mode);
  const busy = entry.loading || entry.refreshing;
  // True on the one path where the body draws rows, being a live bridge, an
  // answer that came back, and the mode that has no sentence of its own. Every
  // sentence below the group is drawn on that path and on no other.
  const factsRead = available && entry.mode === 'ok' && !entry.loading;
  /** True on the one path where the body holds commit rows. */
  const drawsRows = factsRead && entry.entries.length > 0;

  // -- the picture ----------------------------------------------------------
  //
  // Three pure steps, in this order, and every one of them is code that already
  // exists. Assemble, never reimplement.
  //
  //   layoutGraph  swimlane fold over the walk        -> lanes and colours
  //   useLaneCap   how many columns this pane affords -> cap
  //   capRow       fold the surplus into one marker   -> what the SVG draws

  /** Fixes the three lane colours from the three SHAs the answer carried. */
  const roleOf = useMemo(
    () =>
      makeRoleResolver({
        headSha: entry.headSha,
        upstreamSha: entry.upstreamSha,
        mergeBase: entry.mergeBase
      }),
    [entry.headSha, entry.upstreamSha, entry.mergeBase]
  );

  const layout: GraphLayout = useMemo(
    () =>
      layoutGraph(entry.entries, roleOf === undefined ? {} : { roleOf }),
    [entry.entries, roleOf]
  );

  const cap = useLaneCap(listEl, layout.maxLanes);
  const columns = gutterColumns(layout, cap);

  const graphBySha = useMemo(() => {
    const map = new Map<string, { full: GraphRow; capped: CappedRow }>();
    for (const row of layout.rows) {
      map.set(row.hash, { full: row, capped: capRow(row, columns) });
    }
    return map;
  }, [layout, columns]);

  /**
   * The ref marks per commit, computed once for the window.
   *
   * The upstream's short name is not known here, so no pill is marked as the
   * branch HEAD follows. The header says why, and it changes one pill's
   * emphasis and nothing about the picture.
   */
  const badgesBySha = useMemo(() => {
    const map = new Map<string, RefBadge[]>();
    for (const row of entry.entries) {
      const badges = badgesFromRefs(row.refs, null);
      if (badges.length > 0) map.set(row.hash, badges);
    }
    return map;
  }, [entry.entries]);

  const renderRow = (commit: GitGraphLogEntry): React.JSX.Element => {
    const graph = graphBySha.get(commit.hash);
    const badges = badgesBySha.get(commit.hash) ?? [];
    const sync =
      commit.unpushed === true
        ? 'unpushed'
        : commit.unpulled === true
          ? 'unpulled'
          : undefined;
    // Quiet prose, not jargon: the row says what is true about it, once.
    const syncWord =
      sync === 'unpushed'
        ? 'not pushed yet'
        : sync === 'unpulled'
          ? 'not pulled yet'
          : '';
    const age = formatRelative(commit.authorDate, now);
    return (
      <div
        key={commit.hash}
        role="listitem"
        // The gutter is aria-hidden and the age can be shed for width, so the
        // accessible name is where the whole row lives.
        aria-label={`${commit.subject}, ${commit.authorName}, ${age}${
          commit.parents.length > 1
            ? `, merge of ${String(commit.parents.length)} parents`
            : ''
        }${refsAriaClause(badges)}${sync !== undefined ? `, ${syncWord}` : ''}${
          graph !== undefined && graph.capped.bundleColumn >= 0
            ? ', more branches than fit'
            : ''
        }`}
        className="rhist-row"
        data-rhist={shortSha(commit.hash)}
        {...(sync !== undefined ? { 'data-sync': sync } : {})}
      >
        {graph !== undefined ? (
          <CommitGraph
            row={graph.capped}
            sha={commit.hash}
            parentCount={commit.parents.length}
            columns={columns}
            color={graph.full.color}
            isHead={entry.headSha !== null && commit.hash === entry.headSha}
            unpushed={commit.unpushed === true}
          />
        ) : null}
        <span className="rhist-subject">{commit.subject}</span>
        <span className="rhist-author">{commit.authorName}</span>
        <span className="rhist-space" />
        {/* The pill for a branch on a server carries a tooltip ending in when
            this clone last fetched, and there is no such reading over there.
            Null is the honest value and `historyRefsAreThatMachines` under the
            group is where a person reads what it means. */}
        <RefPills badges={badges} lastFetchedAt={null} now={now} />
        <span className="rhist-age num">{age}</span>
      </div>
    );
  };

  const body = (): React.JSX.Element => {
    if (!available) {
      return <div className="rhist-note">{HISTORY_NO_BRIDGE}</div>;
    }
    if (entry.mode === null || entry.loading) {
      return <div className="rhist-note">{historyReading(label)}</div>;
    }
    if (sentence !== null) {
      return <div className="rhist-note">{sentence}</div>;
    }
    return (
      <div role="list" className="rhist-list">
        {entry.entries.map(renderRow)}
        {entry.hasMore && !entry.atCeiling ? (
          <button
            type="button"
            className="rhist-more"
            disabled={busy}
            onClick={onLoadMore}
          >
            {/* The open lanes run THROUGH the paging row, so the picture reads
                as continuing into the next page rather than stopping at the
                button. */}
            <CommitGraphSpacer lanes={layout.tailLanes} columns={columns} />
            {/* The label does not change while a read is running. It is
                disabled instead, so the one string a person reads on this
                control is the one named in machine-copy.ts. */}
            {HISTORY_LOAD_MORE}
          </button>
        ) : layout.tailLanes.length > 0 ? (
          /* The walk ended and lanes are still open. They await commits the
             page did not reach or the walk never saw. Fading says "elsewhere";
             a hard stop would say "this branch ends here", which is false. */
          <div className="rhist-tail" aria-hidden="true">
            <CommitGraphSpacer
              lanes={layout.tailLanes}
              columns={columns}
              fade
            />
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      {drawsRows ? (
        <p className="scm-remote-band rhist-band">
          {historyOnMachineBand(label)}
        </p>
      ) : null}
      <section
        className={`section-scm-remote-history${collapsed ? ' collapsed' : ''}`}
        data-section-root="remote-history"
      >
        <div
          className={`section-header${collapsed ? ' collapsed' : ''}`}
          data-section="remote-history"
        >
          <button
            type="button"
            className="section-toggle"
            aria-expanded={!collapsed}
            onClick={onToggle}
          >
            <span className="section-chevron">
              <Codicon name="chevron-down" size={12} />
            </span>
            History
          </button>
          <span className="section-spacer" />
          <button
            type="button"
            className="icon-btn scm-action"
            aria-label="Refresh history"
            title="Refresh history"
            disabled={!available || busy}
            onClick={onRefresh}
          >
            <Codicon name="refresh" size={14} />
          </button>
        </div>
        {!collapsed ? (
          <div className="section-body rhist-body" ref={setListEl}>
            {body()}
          </div>
        ) : null}
      </section>
      {/* THE SENTENCES BELOW THE GROUP. Every one of them describes the answer
          as a whole rather than one row, so none of them may sit inside a body
          that scrolls. This body holds fifty rows at the first read, which is
          the tallest thing this column draws, so a sentence placed inside it
          would be hidden on the ordinary path rather than on a rare one. */}
      {!collapsed && answered && entry.readAt > 0 ? (
        <p className="scm-remote-note rhist-read-at">
          {machineReadAt(label, entry.readAt)}
        </p>
      ) : null}
      {!collapsed && factsRead ? (
        <p className="scm-remote-note rhist-not-live">{historyNotLive(label)}</p>
      ) : null}
      {/* THE FIRST CUT. Older commits exist and the ceiling is not in the way,
          so the count is named and the button under the rows is drawn. */}
      {!collapsed && factsRead && entry.hasMore && !entry.atCeiling ? (
        <p className="scm-remote-note rhist-older">
          {historyOlderExist(entry.entries.length)}
        </p>
      ) : null}
      {/* THE FAR END. Every commit Tortie will read has been read and there are
          still older ones. The button is gone and this says what to do. */}
      {!collapsed && factsRead && entry.atCeiling ? (
        <p className="scm-remote-note rhist-ceiling">
          {historyCeiling(entry.ceiling, label)}
        </p>
      ) : null}
      {/* THE SECOND CUT. The marks were read for the page and no further. */}
      {!collapsed && factsRead && entry.divergenceTruncated ? (
        <p className="scm-remote-note rhist-marks-cut">
          {historyMarksCut(entry.markedCount, label)}
        </p>
      ) : null}
      {!collapsed && factsRead ? (
        <p className="scm-remote-note rhist-refs">
          {historyRefsAreThatMachines(label)}
        </p>
      ) : null}
      {!collapsed && factsRead ? (
        <p className="scm-remote-note rhist-pages-fresh">
          {historyPagesAreFresh(label)}
        </p>
      ) : null}
      {!collapsed && factsRead ? (
        <p className="scm-remote-note rhist-no-write">{historyNoWrite(label)}</p>
      ) : null}
      {!collapsed && factsRead ? (
        <p className="scm-remote-note rhist-files">
          {historyFilesElsewhere(label)}
        </p>
      ) : null}
    </>
  );
}

/**
 * The store connected group, with no markup of its own.
 *
 * The first expand is the only automatic read. `ensure` is idempotent and the
 * store drops a second read while one is in flight, so a person pressing the
 * chevron twice sends one request.
 */
export function RemoteHistorySection({
  target,
  label
}: {
  target: WorkspaceTarget;
  /** The machine's label as the view above already resolved it. */
  label: string;
}): React.JSX.Element {
  const entry = useRemoteHistory((s) => remoteHistoryOf(s.byTarget, target));
  const ensure = useRemoteHistory((s) => s.ensure);
  const refresh = useRemoteHistory((s) => s.refresh);
  const loadMore = useRemoteHistory((s) => s.loadMore);
  // Read once per mount. The bridge is a property of the build, not of state.
  const available = useMemo(() => remoteHistoryAvailable(), []);
  // Collapsed by default, per target, exactly like the local History section.
  // The `gmux.scm.historyCollapsed.` prefix is the one that section already
  // uses and a local repository's key is its bare path, so no stored answer
  // moves and this phase adds no new key to the contract inventory.
  const [collapsed, setCollapsed] = usePersistedBool(
    `gmux.scm.historyCollapsed.${targetKey(target)}`,
    true
  );

  useEffect(() => {
    if (!collapsed && available) ensure(target);
  }, [collapsed, target, ensure, available]);

  return (
    <RemoteHistoryPanel
      entry={entry}
      // Main sends that machine's own label with every answer. Before the first
      // answer there is none, so the view's own resolved label stands in. The
      // two are the same string, and this order means no sentence is ever drawn
      // with an empty name in it.
      label={entry.machineLabel !== '' ? entry.machineLabel : label}
      available={available}
      collapsed={collapsed}
      // One clock for the whole render, so two rows an hour apart cannot be
      // measured against two different instants.
      now={Date.now()}
      onToggle={() => setCollapsed(!collapsed)}
      onRefresh={() => void refresh(target)}
      onLoadMore={() => void loadMore(target)}
    />
  );
}
