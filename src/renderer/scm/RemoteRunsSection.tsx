/**
 * RUNS for a folder on another machine (Phase 105).
 *
 * It is the fifth thing the Source Control view can draw and the second one it
 * draws for a tab whose folder is on another computer. It lists the workflow
 * runs for the branch that is checked out over there. Tortie asks the machine
 * which branch is checked out and which repository the folder is, and it asks
 * GitHub from this Mac with the gh this Mac already has.
 *
 * ## Three rules this section obeys, and each of them is load bearing
 *
 * 1. IT SHIPS COLLAPSED AND READS NOTHING UNTIL THE FIRST EXPAND. That is the
 *    local Runs section's own rule and it matters more here, because the first
 *    read crosses a link and then starts a gh process. A tab nobody expanded
 *    asks nothing of anybody.
 * 2. NO TIMER, ANYWHERE. A read happens on the first expand, when a person
 *    presses Refresh, and, since Phase 230, at the moments the one shared hook
 *    names, being the machine starting to answer over a refused read, the
 *    group being opened again, and the window regaining focus. Nothing polls
 *    the machine and nothing polls GitHub, and there is no watch, because main
 *    cannot see a push made on another computer.
 * 3. A ROW OPENS ON GITHUB AND DOES NOT EXPAND. Reading a run's jobs is a
 *    second channel and a second gh process for every row, and this phase has
 *    one channel. The row's own label says it opens the run, no chevron is
 *    drawn, and the section says once that the steps are not shown here.
 *
 * ## Where each sentence is drawn, and why
 *
 * The band is above the group, so it stays on screen when the group is
 * collapsed, which is what the Changes band above it does. IT IS DRAWN ONLY
 * WHEN gh WAS ASKED, being `mode: 'ok'`. Its words are "Tortie asked Studio
 * which branch is checked out. It asked GitHub from this Mac", and both halves
 * of that are past tense. Drawing it over a section nobody has expanded, or
 * over an answer where Tortie never reached the machine, would state two reads
 * that did not happen. The spec put the band above the group and this is what
 * that placement means once the honesty rule is applied to it.
 *
 * FIVE SENTENCES ARE BELOW THE GROUP AND NOT INSIDE IT, which is where the
 * Changes group above puts its own note and its own read time. They are the
 * branch, the read time, the sentence saying the list does not refresh, the
 * sentence saying the steps are not here, and the sentence saying these are the
 * newest N runs. Each of them describes the list as a whole, and the body of
 * the group scrolls and is capped at 45% of the column, so a sentence inside it
 * can be pushed under its own fold. Two of these were inside it for one round
 * and the verifier measured the result at ten rows. The body was 310 px tall
 * over 352 px of content, the "newest N" sentence spanned y 683 to 727, the
 * body ended at y 691, and 36 of that sentence's 44 px were hidden. The
 * sentence saying the list was cut was itself cut. The same is true of the
 * lines naming rows GitHub sent that the parser refused, so those are below the
 * group as well. All of them are drawn only while the group is open, because
 * every one of them describes rows.
 *
 * The group gives up height to make room for them, because it is the one item
 * in this column that can shrink. That is the trade this section wants. A
 * person can scroll a list to find a row. A person cannot scroll to find a
 * sentence they do not know is there.
 *
 * ## What is NOT true, said plainly
 *
 * PHASE 230 CLOSED THE GAP THIS PHASE RECORDED. There was no automatic second
 * read when a machine started answering, and the cost was one press in each
 * of five places after a sentence that was true when it was written and was
 * not true any more (research 85 section 4.1). The group reads again through
 * ../machines/use-remote-reread.ts now, the same hook every remote view uses.
 * It reads for NONE of Tortie's own writes, because a commit made over there
 * is not a push and GitHub has nothing new to say about it.
 */

import React, { useEffect, useMemo } from 'react';
import type { WorkspaceTarget } from '@shared/workspace-target';
import { targetKey } from '@shared/workspace-target';
import type { MachineRunsMode } from '@shared/ipc';
import { useNow } from '../format';
import { Codicon } from '../icons';
import {
  RUNS_NO_BRIDGE,
  runsFolderDenied,
  runsFolderMissing,
  runsNoAnswer,
  runsNoBranch,
  runsNotConnected,
  runsNotRepo,
  runsReadingBranch
} from '../machines/runs';
import { heldOfMode } from '../machines/reread';
import { useRemoteReread } from '../machines/use-remote-reread';
import { RunRow } from './RunRow';
import {
  remoteRunsAvailable,
  remoteRunsOf,
  useRemoteRuns
} from './remote-runs';
import type { RemoteRunsEntry } from './remote-runs';
import { RUNS_EMPTY, healthNote, hiddenNotes } from './runs-format';
import { usePersistedBool } from './sections';
import './runs.css';

/**
 * The one sentence that stands in place of rows, or null when there are rows.
 *
 * Every mode except `ok` and `notGitHub` has exactly one sentence and it is
 * written in presentation.ts. This function is the whole mapping, so a mode
 * that gains a sentence gains it in one place and the test reads the same
 * table the section draws from. PHASE 228 MADE `notGitHub` SILENT: a
 * repository with no GitHub origin draws no Runs group at all, which is what
 * the local section does for the same repository, so there is no body to put
 * a sentence in.
 */
export function runsModeSentence(
  mode: MachineRunsMode | null,
  label: string
): string | null {
  switch (mode) {
    case null:
    case 'ok':
    case 'notGitHub':
      return null;
    case 'notRepo':
      return runsNotRepo(label);
    case 'noBranch':
      return runsNoBranch(label);
    case 'missing':
      return runsFolderMissing(label);
    case 'denied':
      return runsFolderDenied(label);
    case 'notConnected':
      return runsNotConnected(label);
    case 'unreachable':
      return runsNoAnswer(label);
  }
}

export interface RemoteRunsPanelProps {
  entry: RemoteRunsEntry;
  /** The name the person gave that machine. No sentence composes a host name. */
  label: string;
  /** The instant ages are measured against. */
  now: number;
  /** False on a build whose preload cannot ask a machine anything. */
  available: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}

/**
 * The whole section, pure over its props.
 *
 * It is pure so that ./__tests__/p105-remote-runs.test.tsx can render every one
 * of the eight modes and read the sentence back. This repository carries no
 * jsdom and no testing library, so a store connected component cannot be driven
 * by a test at all, which is the shape ../app/RemoteLinesModal.tsx already uses.
 */
export function RemoteRunsPanel({
  entry,
  label,
  now,
  available,
  collapsed,
  onToggle,
  onRefresh
}: RemoteRunsPanelProps): React.JSX.Element | null {
  const runs = entry.runs;
  const health = healthNote(entry.health);
  const hidden = hiddenNotes(entry.issues);
  const sentence = runsModeSentence(entry.mode, label);
  const busy = entry.loading || entry.refreshing;
  // PHASE 228. A repository with no GitHub origin has no runs to show and the
  // local section is not drawn for one (./RunsSection.tsx returns null for
  // it), so neither is this group. The answer is known only after the first
  // read, which happens on the first expand, so the group is there until a
  // person opens it and gone once the machine has said there is nothing to
  // list, which is a section that is not there rather than a sentence saying
  // so.
  if (entry.mode === 'notGitHub') return null;
  // True on the one path where the body draws rows, being a live bridge, an
  // answer that came back, and a mode that has no sentence of its own. The
  // three list sentences below the group are drawn on that path and on no
  // other, which is the condition they carried while they lived in the body.
  const rowsRead = available && entry.mode === 'ok' && !entry.loading;

  const body = (): React.JSX.Element => {
    if (!available) {
      return <div className="runs-note">{RUNS_NO_BRIDGE}</div>;
    }
    if (entry.mode === null || entry.loading) {
      return <div className="runs-note">{runsReadingBranch(label)}</div>;
    }
    if (sentence !== null) {
      return <div className="runs-note">{sentence}</div>;
    }
    return (
      <>
        {health !== null ? (
          <div className="runs-note">
            {health.line}
            {health.detail !== null ? (
              <span className="runs-note-detail">{health.detail}</span>
            ) : null}
          </div>
        ) : null}
        {runs.length === 0 && health === null ? (
          <div className="runs-note">{RUNS_EMPTY}</div>
        ) : null}
        {runs.length > 0 ? (
          <div className="runs-list" role="list" aria-label="Workflow runs">
            {runs.map((run) => (
              <div className="runs-item" role="listitem" key={run.id}>
                {/* `open` is the whole difference from the local list. The row
                    draws no chevron, its label says it opens the run, and a
                    click sends the person to github.com. */}
                <RunRow run={run} mode="open" now={now} />
              </div>
            ))}
          </div>
        ) : null}
      </>
    );
  };

  return (
    <>
      <section
        className={`section-scm-remote-runs${collapsed ? ' collapsed' : ''}`}
        data-section-root="remote-runs"
      >
        <div
          className={`section-header${collapsed ? ' collapsed' : ''}`}
          data-section="remote-runs"
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
            Runs
            <span className="section-count num">
              {runs.length > 0 ? runs.length : ''}
            </span>
          </button>
          <span className="section-spacer" />
          <button
            type="button"
            className="icon-btn scm-action"
            aria-label="Refresh runs"
            title="Refresh runs"
            disabled={!available || busy}
            onClick={onRefresh}
          >
            <Codicon name="refresh" size="md" />
          </button>
        </div>
        {!collapsed ? (
          <div className="section-body runs-body">{body()}</div>
        ) : null}
      </section>
      {/* THE LINES BELOW THE GROUP, outside the body that scrolls, because a
          line about the list as a whole must not sit under its own fold; the
          fix round of Phase 105 measured 36 of the 44 px of one hidden there.
          PHASE 228 TOOK FIVE SENTENCES OUT OF THIS PLACE, being the band
          above the group and the four standing lines under it, because the
          local Runs section carries no paragraph; the record is in
          ../machines/runs.ts. The hidden row notes stay, because the local
          section draws the same ones from the same file. */}
      {!collapsed && rowsRead
        ? hidden.map((line) => (
            <p className="scm-remote-note runs-hidden" key={line}>
              {line}
            </p>
          ))
        : null}
      {/* PHASE 228 LEFT THE READ-AT CLOCK HERE and PHASE 230 TOOK IT OFF,
          because the group reads again by itself when it is looked at. */}
    </>
  );
}

/**
 * The store connected section, with no markup of its own.
 *
 * The first expand is the only automatic read. `ensure` is idempotent and the
 * store drops a second read while one is in flight, so a person pressing the
 * chevron twice sends one request.
 */
export function RemoteRunsSection({
  target,
  label
}: {
  target: WorkspaceTarget;
  /** The machine's label as the view above already resolved it. */
  label: string;
}): React.JSX.Element {
  const entry = useRemoteRuns((s) => remoteRunsOf(s.byTarget, target));
  const ensure = useRemoteRuns((s) => s.ensure);
  const refresh = useRemoteRuns((s) => s.refresh);
  const now = useNow();
  // Read once per mount. The bridge is a property of the build, not of state.
  const available = useMemo(() => remoteRunsAvailable(), []);
  // Collapsed by default, per target, exactly like the local Runs section. The
  // `gmux.scm.runsCollapsed.` prefix is the one that section already uses and
  // a local repository's key is its bare path, so no stored answer moves.
  const [collapsed, setCollapsed] = usePersistedBool(
    `gmux.scm.runsCollapsed.${targetKey(target)}`,
    true
  );

  useEffect(() => {
    if (!collapsed && available) ensure(target);
  }, [collapsed, target, ensure, available]);

  // PHASE 230. The other moments this group reads at; the header says which.
  useRemoteReread({
    target,
    held:
      entry.loading || entry.refreshing
        ? 'reading'
        : entry.refused
          ? 'refused'
          : heldOfMode(entry.mode, false),
    active: !collapsed && available,
    writes: [],
    read: () => void refresh(target)
  });

  return (
    <RemoteRunsPanel
      entry={entry}
      // Main sends that machine's own label with every answer. Before the first
      // answer there is none, so the view's own resolved label stands in. The
      // two are the same string, and this order means no sentence is ever drawn
      // with an empty name in it.
      label={entry.machineLabel !== '' ? entry.machineLabel : label}
      now={now}
      available={available}
      collapsed={collapsed}
      onToggle={() => setCollapsed(!collapsed)}
      onRefresh={() => void refresh(target)}
    />
  );
}
