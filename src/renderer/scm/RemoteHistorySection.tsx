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
 * 2. NO TIMER, ANYWHERE. A read happens on the first expand, on Load more,
 *    when a person presses Refresh, and, since Phase 230, at the moments the
 *    one shared hook names, being the machine starting to answer over a
 *    refused read, the group being opened again, the window regaining focus,
 *    and a commit Tortie itself made over there. Nothing polls the machine,
 *    and there is no watch, because main cannot see a commit made on another
 *    computer.
 * 3. IT NEVER OFFERS A VERB THAT WRITES. There is no checkout, no branch, no
 *    cherry pick and no revert. The local History has all four. Each of them
 *    would have to write on somebody else's computer, and the group says on
 *    screen that it changes nothing over there.
 * 4. A ROW IS THE LOCAL CONTROL, AND NOTHING MORE. PHASE 233 MADE IT ONE. A
 *    click, Enter or the right arrow expands it into the files that commit
 *    changed, read once from that machine through `useRemoteHistory.detail`,
 *    and a file row opens the two sided diff of the commit's first parent
 *    against the commit through the same request a local file row sends, with
 *    the machine on it so the editor asks that machine rather than this Mac.
 *    The row wears the local row's own classes, `scm-hrow` and `scm-hfile`,
 *    so the two cannot drift apart in shape, and the keyboard is the local
 *    list's, being up, down, Enter, right and left. WHAT IT STILL DOES NOT
 *    HAVE is a menu, because every verb on the local row's menu writes, and
 *    rule 3 above holds. Until Phase 233 this rule read the other way, that
 *    a row was not a control, because the files were not read; Phase 228 had
 *    already taken the sentence saying so off the face.
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
 * PHASE 230 CLOSED THE GAP PHASES 105, 106 AND 107 LEFT OPEN. There was no
 * automatic second read when a machine started answering, and research 85
 * section 4.1 measured what that cost: a sentence saying the machine did not
 * answer still on screen with the link long since connected. The group reads
 * again through ../machines/use-remote-reread.ts now, the same hook every
 * remote view uses, and reads only for a COMMIT among Tortie's own writes,
 * because a saved file and a staged one move no commit.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GitGraphLogEntry } from '@shared/types';
import type { MachineCommitFile, MachineHistoryMode } from '@shared/ipc';
import type { WorkspaceTarget } from '@shared/workspace-target';
import { targetKey } from '@shared/workspace-target';
import { Codicon } from '../icons';
import {
  HISTORY_LOAD_MORE,
  HISTORY_NO_BRIDGE,
  historyCeiling,
  historyFolderDenied,
  historyFolderMissing,
  historyMarksCut,
  historyNoAnswer,
  historyNoCommits,
  historyNotConnected,
  historyNotRepo,
  historyReading
} from '../machines/history';
import { machineReadAt } from '../machines/presentation';
import { heldOfMode } from '../machines/reread';
import { useRemoteReread } from '../machines/use-remote-reread';
import { CommitGraph, CommitGraphSpacer, useLaneCap } from './graph/CommitGraph';
import { capRow, gutterColumns, layoutGraph, makeRoleResolver } from './graph';
import type { CappedRow, GraphLayout, GraphRow } from './graph';
import { badgesFromRefs, RefPills, refsAriaClause } from './ref-badges';
import type { RefBadge } from './ref-badges';
import { fileBadge } from './file-badge';
import { formatRelative, renamedFromTitle, shortSha, splitPath } from './format';
import { requestRemoteCommitFileOpen } from './open-commit-file';
import {
  machineAnsweredHistory,
  remoteHistoryAvailable,
  remoteHistoryOf,
  useRemoteHistory
} from './remote-history';
import type { RemoteCommitDetail, RemoteHistoryEntry } from './remote-history';
import { remoteDetailKey } from './remote-history';
import { usePersistedBool } from './sections';
import './remote-history.css';

/**
 * The one sentence that stands in place of the rows, or null when there are
 * rows to draw.
 *
 * Every mode except `ok` has exactly one sentence and it is written in
 * presentation.ts. This function is the whole mapping, so a mode that gains a
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
  /** PHASE 233. The commits whose file rows are drawn. */
  expanded: ReadonlySet<string>;
  /** PHASE 233. What each expanded commit changed, keyed by its sha. */
  details: Readonly<Record<string, RemoteCommitDetail>>;
  /** PHASE 233. A row was pressed. The section reads on the first expand. */
  onToggleRow: (sha: string) => void;
  /** PHASE 233. A file row was pressed. `preview` is single against double. */
  onOpenFile: (file: MachineCommitFile, commit: GitGraphLogEntry, preview: boolean) => void;
}

/** The keyboard model, being the local History's own three kinds of row. */
type HistItem =
  | { kind: 'commit'; sha: string }
  | { kind: 'file'; sha: string; index: number }
  | { kind: 'more' };

const itemId = (item: HistItem): string =>
  item.kind === 'commit'
    ? `c:${item.sha}`
    : item.kind === 'file'
      ? `f:${item.sha}:${item.index}`
      : 'more';

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
  onLoadMore,
  expanded,
  details,
  onToggleRow,
  onOpenFile
}: RemoteHistoryPanelProps): React.JSX.Element {
  /** PHASE 233. The row the keyboard is on, as the local list keeps it. */
  const [cursor, setCursor] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
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

  // -- the keyboard, the local list's own -----------------------------------
  const items = useMemo<HistItem[]>(() => {
    const list: HistItem[] = [];
    for (const commit of entry.entries) {
      list.push({ kind: 'commit', sha: commit.hash });
      if (expanded.has(commit.hash)) {
        const detail = details[commit.hash];
        if (detail !== undefined) {
          detail.files.forEach((_f, i) =>
            list.push({ kind: 'file', sha: commit.hash, index: i })
          );
        }
      }
    }
    if (entry.hasMore && !entry.atCeiling) list.push({ kind: 'more' });
    return list;
  }, [entry.entries, entry.hasMore, entry.atCeiling, expanded, details]);

  const entryBySha = useMemo(() => {
    const map = new Map<string, GitGraphLogEntry>();
    for (const commit of entry.entries) map.set(commit.hash, commit);
    return map;
  }, [entry.entries]);

  const moveCursor = useCallback(
    (delta: 1 | -1): void => {
      if (items.length === 0) return;
      const idx = items.findIndex((it) => itemId(it) === cursor);
      const nextIdx =
        idx === -1
          ? delta === 1
            ? 0
            : items.length - 1
          : Math.min(Math.max(idx + delta, 0), items.length - 1);
      const next = items[nextIdx];
      if (next === undefined) return;
      const id = itemId(next);
      setCursor(id);
      listRef.current
        ?.querySelector(`[data-hist="${CSS.escape(id)}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    },
    [items, cursor]
  );

  const onListKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      moveCursor(e.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    const current = items.find((it) => itemId(it) === cursor) ?? items[0];
    if (current === undefined) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (current.kind === 'commit') onToggleRow(current.sha);
      else if (current.kind === 'file') {
        const file = details[current.sha]?.files[current.index];
        const commit = entryBySha.get(current.sha);
        // Enter is an explicit activation, so the tab is kept, as locally.
        if (file !== undefined && commit !== undefined) {
          onOpenFile(file, commit, false);
        }
      } else if (!busy) onLoadMore();
    } else if (e.key === 'ArrowRight' && current.kind === 'commit') {
      e.preventDefault();
      if (!expanded.has(current.sha)) onToggleRow(current.sha);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (current.kind === 'commit' && expanded.has(current.sha)) {
        onToggleRow(current.sha);
      } else if (current.kind === 'file') {
        const id = itemId({ kind: 'commit', sha: current.sha });
        setCursor(id);
        listRef.current
          ?.querySelector(`[data-hist="${CSS.escape(id)}"]`)
          ?.scrollIntoView({ block: 'nearest' });
      }
    }
  };

  const renderRow = (commit: GitGraphLogEntry): React.JSX.Element => {
    const sha = commit.hash;
    const graph = graphBySha.get(sha);
    const badges = badgesBySha.get(sha) ?? [];
    const isExpanded = expanded.has(sha);
    const id = itemId({ kind: 'commit', sha });
    const detail = details[sha];
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
    /**
     * The gutter for this commit's file rows: every lane still live below it,
     * drawn as a plain pass through, so expanding a commit does not sever the
     * spine. It is the local row's own rule.
     */
    const laneSpacer =
      graph === undefined ? null : (
        <CommitGraphSpacer lanes={graph.full.out} columns={columns} />
      );
    return (
      <React.Fragment key={sha}>
        <div
          role="option"
          aria-selected={cursor === id}
          aria-expanded={isExpanded}
          // The gutter is aria-hidden and the age can be shed for width, so
          // the accessible name is where the whole row lives.
          aria-label={`${commit.subject}, ${commit.authorName}, ${age}${
            commit.parents.length > 1
              ? `, merge of ${String(commit.parents.length)} parents`
              : ''
          }${refsAriaClause(badges)}${sync !== undefined ? `, ${syncWord}` : ''}${
            graph !== undefined && graph.capped.bundleColumn >= 0
              ? ', more branches than fit'
              : ''
          }`}
          // The local row's own classes, so the two rows share one shape in
          // ./scm.css; `rhist-row` is the marker the probes and tests read.
          className={[
            'scm-hrow',
            'rhist-row',
            cursor === id ? 'selected' : '',
            isExpanded ? 'expanded' : ''
          ]
            .filter(Boolean)
            .join(' ')}
          data-hist={id}
          data-rhist={shortSha(sha)}
          {...(sync !== undefined ? { 'data-sync': sync } : {})}
          onClick={() => {
            setCursor(id);
            onToggleRow(sha);
          }}
        >
          {graph !== undefined ? (
            <CommitGraph
              row={graph.capped}
              sha={sha}
              parentCount={commit.parents.length}
              columns={columns}
              color={graph.full.color}
              isHead={entry.headSha !== null && sha === entry.headSha}
              unpushed={commit.unpushed === true}
            />
          ) : null}
          <span className="scm-hchevron" aria-hidden="true">
            <Codicon
              name={isExpanded ? 'chevron-down' : 'chevron-right'}
              size="sm"
            />
          </span>
          <span className="scm-hsubject">{commit.subject}</span>
          <span className="scm-hauthor">{commit.authorName}</span>
          <span className="scm-row-space" />
          {/* The pill for a branch on a server carries a tooltip ending in when
              this clone last fetched, and there is no such reading over there.
              Null is the honest value. Phase 107 drew a sentence under the group
              saying what it means, and Phase 228 took it off, because the local
              History carries no paragraph about its marks either. */}
          <RefPills badges={badges} lastFetchedAt={null} now={now} />
          <span className="scm-hage num">{age}</span>
        </div>
        {isExpanded
          ? detail === undefined
            ? (
              <div className="scm-hfile scm-hfile-loading" aria-hidden="true">
                {laneSpacer}
                <span className="scm-skeleton-row" style={{ width: '56%' }} />
              </div>
            )
            : detail.files.length === 0
              ? (
                <div className="scm-hfile scm-hfile-empty">
                  {laneSpacer}
                  No files changed
                </div>
              )
              : detail.files.map((file, index) => {
                  const fid = itemId({ kind: 'file', sha, index });
                  const badge = fileBadge(file.status);
                  const { dir, base } = splitPath(file.path);
                  return (
                    <div
                      key={fid}
                      role="option"
                      aria-selected={cursor === fid}
                      aria-label={`${base}, ${badge.word}`}
                      data-hist={fid}
                      data-rhist-file={shortSha(sha)}
                      className={`scm-hfile${cursor === fid ? ' selected' : ''}`}
                      title={
                        file.origPath !== undefined
                          ? renamedFromTitle(file.path, file.origPath, file.status)
                          : file.path
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        setCursor(fid);
                        onOpenFile(file, commit, true);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onOpenFile(file, commit, false);
                      }}
                    >
                      {laneSpacer}
                      <span
                        className={`scm-badge ${badge.cls}`}
                        aria-hidden="true"
                      >
                        {badge.letter}
                      </span>
                      <span
                        className={`scm-row-name${file.status === 'D' ? ' deleted' : ''}`}
                      >
                        {base}
                      </span>
                      {dir !== '' ? (
                        <span className="scm-row-dir">{dir}</span>
                      ) : null}
                    </div>
                  );
                })
          : null}
      </React.Fragment>
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
      <div
        ref={listRef}
        role="listbox"
        aria-label="Commit history"
        tabIndex={0}
        className="rhist-list"
        onKeyDown={onListKeyDown}
      >
        {entry.entries.map(renderRow)}
        {/* PHASE 228. THE FAR END IS THIS CONTROL DRAWN DISABLED. Every commit
            Tortie will read from another machine has been read and older ones
            remain, so the button stays where it was, cannot be pressed, and
            says why in a label of a few words on hover. It was a three
            sentence paragraph under the group, and the local History carries
            no paragraph about how far it reads. */}
        {entry.hasMore || entry.atCeiling ? (
          <button
            type="button"
            className="rhist-more"
            disabled={busy || entry.atCeiling}
            {...(entry.atCeiling ? { title: historyCeiling(entry.ceiling) } : {})}
            onClick={onLoadMore}
          >
            {/* The open lanes run THROUGH the paging row, so the picture reads
                as continuing into the next page rather than stopping at the
                button. */}
            <CommitGraphSpacer lanes={layout.tailLanes} columns={columns} />
            {/* The label does not change while a read is running. It is
                disabled instead, so the one string a person reads on this
                control is the one named in presentation.ts. */}
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
              <Codicon name="chevron-down" size="sm" />
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
            <Codicon name="refresh" size="md" />
          </button>
        </div>
        {!collapsed ? (
          <div className="section-body rhist-body" ref={setListEl}>
            {body()}
          </div>
        ) : null}
      </section>
      {/* THE TWO LINES BELOW THE GROUP. Each describes the answer as a whole
          rather than one row, so neither may sit inside a body that scrolls.
          This body holds fifty rows at the first read, which is the tallest
          thing this column draws, so a line placed inside it would be hidden
          on the ordinary path rather than on a rare one. PHASE 228 TOOK SIX
          SENTENCES OUT OF THIS PLACE, being the band above the group and the
          five standing lines under it, because the local History carries no
          paragraph; the record is in ../machines/history.ts. */}
      {/* PHASE 228 LEFT THIS CLOCK and PHASE 230 REMOVES IT, once the group
          reads again by itself when it is looked at. */}
      {!collapsed && answered && entry.readAt > 0 ? (
        <p className="scm-remote-note rhist-read-at">
          {machineReadAt(label, entry.readAt)}
        </p>
      ) : null}
      {/* THE SECOND CUT. The marks were read for the page and no further. It
          stays because it says a list on screen is incomplete, and a cut list
          drawn as a whole one is the Phase 99 defect. */}
      {!collapsed && factsRead && entry.divergenceTruncated ? (
        <p className="scm-remote-note rhist-marks-cut">
          {historyMarksCut(entry.markedCount, label)}
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
  const detail = useRemoteHistory((s) => s.detail);
  const heldDetails = useRemoteHistory((s) => s.details);
  // PHASE 233. Which rows are open, per mount, exactly as the local section
  // keeps its own set. Nothing about it is persisted.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggleRow = useCallback(
    (sha: string): void => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(sha)) {
          next.delete(sha);
        } else {
          next.add(sha);
          void detail(target, sha);
        }
        return next;
      });
    },
    [detail, target]
  );
  // The details this target holds, keyed by sha for the panel.
  const details = useMemo(() => {
    const out: Record<string, RemoteCommitDetail> = {};
    for (const sha of expanded) {
      const held = heldDetails[remoteDetailKey(target, sha)];
      if (held !== undefined) out[sha] = held;
    }
    return out;
  }, [expanded, heldDetails, target]);
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

  // PHASE 230. The other moments this group reads at; the header says which.
  useRemoteReread({
    target,
    held: heldOfMode(entry.mode, entry.loading || entry.refreshing),
    active: !collapsed && available,
    writes: ['commit'],
    read: () => void refresh(target)
  });

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
      expanded={expanded}
      details={details}
      onToggleRow={toggleRow}
      onOpenFile={(file, commit, preview) =>
        // ONE COMPOSER, in ./open-commit-file.ts, which is where the LOCAL
        // file row's open is composed too. The label is the one that machine
        // sent with the last answer, or the tab's own until it has.
        requestRemoteCommitFileOpen(
          target.machineId,
          entry.machineLabel !== '' ? entry.machineLabel : label,
          target.path,
          file,
          commit,
          preview
        )
      }
    />
  );
}
