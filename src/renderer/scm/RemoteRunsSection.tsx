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
 * 2. NO TIMER, ANYWHERE. A read happens on the first expand and when a person
 *    presses Refresh. Nothing polls the machine and nothing polls GitHub, and
 *    there is no watch, because main cannot see a push made on another
 *    computer. The panel says on screen that the list does not refresh.
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
 * There is no automatic second read when a machine starts answering. The
 * Changes group beside this one carries one, because Phase 90.3 shipped without
 * a Refresh button and the only way back from a failed read was to switch tabs.
 * This section has a Refresh button in its header from the first commit, so a
 * person who expanded it before their machine had connected reads a sentence
 * saying so and presses Refresh. The cost is one press, and it is recorded here
 * rather than left to be discovered.
 */

import React, { useEffect, useMemo } from 'react';
import type { WorkspaceTarget } from '@shared/workspace-target';
import { targetKey } from '@shared/workspace-target';
import type { MachineRunsMode } from '@shared/ipc';
import { useNow } from '../app/format';
import { Codicon } from '../icons';
import {
  RUNS_NOT_LIVE,
  RUNS_NO_BRIDGE,
  RUNS_STEPS_ELSEWHERE,
  runsBranchAt,
  runsFolderDenied,
  runsFolderMissing,
  runsNewest,
  runsNoAnswer,
  runsNoBranch,
  runsNotConnected,
  runsNotGitHub,
  runsNotRepo,
  runsOnMachineBand,
  runsReadAt,
  runsReadingBranch
} from '../app/machine-copy';
import { RunRow } from './RunRow';
import {
  machineAnsweredRuns,
  remoteRunsAvailable,
  remoteRunsOf,
  shortSha,
  useRemoteRuns
} from './remote-runs';
import type { RemoteRunsEntry } from './remote-runs';
import { RUNS_EMPTY, healthNote, hiddenNotes } from './runs-format';
import { usePersistedBool } from './sections';
import './runs.css';

/**
 * The one sentence that stands in place of rows, or null when there are rows.
 *
 * Every mode except `ok` has exactly one sentence and it is written in
 * machine-copy.ts. This function is the whole mapping, so a mode that gains a
 * sentence gains it in one place and the test reads the same table the section
 * draws from.
 */
export function runsModeSentence(
  mode: MachineRunsMode | null,
  label: string
): string | null {
  switch (mode) {
    case null:
    case 'ok':
      return null;
    case 'notRepo':
      return runsNotRepo(label);
    case 'notGitHub':
      return runsNotGitHub(label);
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
}: RemoteRunsPanelProps): React.JSX.Element {
  const runs = entry.runs;
  const health = healthNote(entry.health);
  const hidden = hiddenNotes(entry.issues);
  const sentence = runsModeSentence(entry.mode, label);
  const answered = machineAnsweredRuns(entry.mode);
  const sha = shortSha(entry.headSha);
  const busy = entry.loading || entry.refreshing;
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
      {entry.mode === 'ok' ? (
        <p className="scm-remote-band runs-band">{runsOnMachineBand(label)}</p>
      ) : null}
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
              <Codicon name="chevron-down" size={12} />
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
            <Codicon name="refresh" size={14} />
          </button>
        </div>
        {!collapsed ? (
          <div className="section-body runs-body">{body()}</div>
        ) : null}
      </section>
      {/* THE SENTENCES BELOW THE GROUP. Every one of them describes the list as
          a whole rather than one row, so none of them may sit inside a body
          that scrolls. Two of them did until the fix round, and the defect was
          measured off the live document at ten rows. The body was 310 px tall
          over 352 px of content, the "newest N" sentence spanned y 683 to 727,
          and the body ended at y 691, so 36 of its 44 px were hidden. The
          sentence saying the list was cut was itself cut. They are here now,
          beside the three that were already outside. The group gives up height
          for them, and that is the trade this section wants. A person may lose
          a row off the bottom of a list that scrolls. A person must not lose
          the sentence saying the list is short. */}
      {!collapsed && rowsRead
        ? hidden.map((line) => (
            <p className="scm-remote-note runs-hidden" key={line}>
              {line}
            </p>
          ))
        : null}
      {!collapsed && rowsRead && runs.length > 0 ? (
        <p className="scm-remote-note runs-steps-elsewhere">
          {RUNS_STEPS_ELSEWHERE}
        </p>
      ) : null}
      {/* The row limit was reached, so there are older runs and they are not
          here. Phase 99 carried a cut through main that the panel never drew,
          and this is the sentence that stops the same shape happening. Phase
          120 made the comparison `>=` rather than `===`, because the cap in
          main keeps a run at the branch tip past the limit, so the merged
          list can hold one row more than the limit in exactly the case that
          has extra rows. */}
      {!collapsed &&
      rowsRead &&
      entry.limit > 0 &&
      runs.length >= entry.limit ? (
        <p className="scm-remote-note runs-newest">{runsNewest(runs.length)}</p>
      ) : null}
      {!collapsed && entry.branch !== null && sha !== '' ? (
        <p className="scm-remote-note runs-branch-line">
          {runsBranchAt(entry.branch, label, sha)}
        </p>
      ) : null}
      {!collapsed && answered && entry.readAt > 0 ? (
        <p className="scm-remote-note runs-read-at">
          {runsReadAt(label, entry.readAt)}
        </p>
      ) : null}
      {!collapsed && entry.mode === 'ok' ? (
        <p className="scm-remote-note runs-not-live">{RUNS_NOT_LIVE}</p>
      ) : null}
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
