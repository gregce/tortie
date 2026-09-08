/**
 * THE BRANCH checked out in a folder on another machine (Phase 106).
 *
 * It is the sixth thing the Source Control view can draw and the second one it
 * draws for a tab whose folder is on another computer. It names the branch that
 * is checked out over there, names the branch that one follows, and says how
 * far ahead and how far behind it is. Every number in it came from that
 * machine's own git and nothing in it changed anything there.
 *
 * ## Three rules this group obeys, and each of them is load bearing
 *
 * 1. IT SHIPS COLLAPSED AND READS NOTHING UNTIL THE FIRST EXPAND. A tab nobody
 *    expanded asks nothing of anybody. That is the local Runs section's own
 *    rule and it matters more here, because a read crosses a link.
 * 2. NO TIMER, ANYWHERE. A read happens on the first expand and when a person
 *    presses Refresh. Nothing polls the machine, and there is no watch, because
 *    main cannot see a branch switched on another computer. The group says on
 *    screen that it does not refresh.
 * 3. IT NEVER OFFERS TO SWITCH. There is no row to click, no checkout verb and
 *    no menu item. Switching a branch on another machine is a write and no
 *    write phase has run. The group says on screen that Tortie changes nothing
 *    over there.
 *
 * ## Where each sentence is drawn, and why
 *
 * THERE IS NO BAND ABOVE THE GROUP ANY MORE. Phase 106 drew one over an
 * answer that named a branch, being `mode: 'ok'`, and Phase 229 narrowed it to
 * the open group alone, because its commit box reads the branch answer for its
 * identity precheck without any expand and the verifier measured the band
 * appearing on the resting remote Source control face with no press, a
 * sentence the local face does not carry. Phase 228 then took the band off
 * outright, with every other standing sentence of this group, because the
 * operator's rule for every remote phase is that a remote tab feels almost
 * identical to a local one and the local branch header carries no such line;
 * `branchOnMachineBand` is gone from ../machines/branch.ts and
 * ../machines/__tests__/p228-off-the-face.test.ts pins that nothing draws it
 * again. What Phase 229 wanted still holds, and more simply: a group nobody
 * opened draws its header and nothing else, whatever the store holds, and so
 * does an open one until it has an answer to draw.
 *
 * EVERY SENTENCE THAT DESCRIBES THE ANSWER AS A WHOLE IS DRAWN BELOW THE GROUP
 * AND NOT INSIDE ITS BODY. The body of a group in this column is capped at 45%
 * and it scrolls, so a sentence inside it can be pushed under its own fold.
 * Phase 105's verifier measured that defect on the group below this one: at ten
 * rows the body was 310 px tall over 352 px of content, the sentence saying the
 * list had been cut spanned y 683 to 727, the body ended at y 691, and 36 of
 * that sentence's 44 px were hidden. This group's body holds at most three
 * short lines, so clipping is unlikely here, and the sentences are still drawn
 * below the group, because the rule is about where a sentence may live and not
 * about how tall this particular body happens to be.
 *
 * ## The one sentence this phase exists to get right
 *
 * `branchCountsAreThatMachines` says that Tortie counted against the copy of
 * the followed branch that lives on that machine, and that Tortie never fetches
 * over there. So the two counts can be stale at the moment they are read, which
 * is a different kind of stale from the answer going out of date afterwards.
 * `build/conformance-machines.mjs` condition 56i fails the build if the far
 * side script ever names a verb that fetches, which is what keeps that sentence
 * checkable rather than promised.
 *
 * ## What is NOT true, said plainly
 *
 * THERE IS NO AUTOMATIC SECOND READ WHEN A MACHINE STARTS ANSWERING, and that
 * is a choice rather than an oversight. The Changes group beside this one
 * carries one, because Phase 90.3 shipped with no Refresh button and the only
 * way back from a failed read was to switch tabs. This group has a Refresh
 * button from its first commit. A person who expands it before their machine
 * has connected reads the sentence saying so and presses Refresh, which costs
 * one press. Closing the gap means a read that a person did not ask for,
 * triggered by a connection event, and the rule for this group is that a read
 * happens when a person opens it and when they press Refresh and at no other
 * time. Phase 105 left the same nit open and this phase leaves it open on
 * purpose.
 */

import React, { useEffect, useMemo } from 'react';
import type { WorkspaceTarget } from '@shared/workspace-target';
import { targetKey } from '@shared/workspace-target';
import type { MachineBranchMode } from '@shared/ipc';
import { Codicon } from '../icons';
import {
  BRANCH_NO_BRIDGE,
  branchFolderDenied,
  branchFolderMissing,
  branchFollows,
  branchNoAnswer,
  branchNoDetails,
  branchNone,
  branchNotConnected,
  branchNotRepo,
  branchReading,
  branchTrackUnreadable,
  branchUpstreamGone
} from '../machines/branch';
import { machineReadAt } from '../machines/presentation';
import {
  machineAnsweredBranch,
  remoteBranchAvailable,
  remoteBranchOf,
  useRemoteBranch
} from './remote-branch';
import type { RemoteBranchEntry } from './remote-branch';
import { usePersistedBool } from './sections';
import './remote-branch.css';

/**
 * The one sentence that stands in place of the facts, or null when there are
 * facts to draw.
 *
 * Every mode except `ok` has exactly one sentence and it is written in
 * presentation.ts. This function is the whole mapping, so a mode that gains a
 * sentence gains it in one place and the test reads the same table the group
 * draws from.
 */
export function branchModeSentence(
  mode: MachineBranchMode | null,
  label: string
): string | null {
  switch (mode) {
    case null:
    case 'ok':
      return null;
    case 'noBranch':
      return branchNone(label);
    case 'noDetails':
      return branchNoDetails(label);
    case 'notRepo':
      return branchNotRepo(label);
    case 'missing':
      return branchFolderMissing(label);
    case 'denied':
      return branchFolderDenied(label);
    case 'notConnected':
      return branchNotConnected(label);
    case 'unreachable':
      return branchNoAnswer(label);
  }
}

/**
 * The one sentence about what the branch follows, or null when there is
 * nothing to say.
 *
 * FOUR ANSWERS AND THEY ARE ORDERED. A branch that follows nothing has no pair
 * of counts at all, and since Phase 228 it says nothing either, the way the
 * local header draws no arrows for one. A branch whose upstream that machine
 * no longer has cannot be counted against it. A tracking answer this end could
 * not read must not be drawn as zero and zero, because zero and zero is also
 * what a level branch says. Only when none of those three holds are the two
 * counts a fact, and only then are they drawn; the sentence for that case is
 * the row's hover title rather than a line on the face.
 */
export function branchFollowSentence(
  entry: RemoteBranchEntry,
  label: string
): string | null {
  const branch = entry.branch;
  if (branch === null) return null;
  if (entry.upstream === null) return null;
  if (entry.upstreamGone) {
    return branchUpstreamGone(branch, entry.upstream, label);
  }
  if (entry.trackUnreadable) return branchTrackUnreadable(branch, label);
  return branchFollows(branch, entry.upstream, entry.ahead, entry.behind);
}

export interface RemoteBranchPanelProps {
  entry: RemoteBranchEntry;
  /** The name the person gave that machine. No sentence composes a host name. */
  label: string;
  /** False on a build whose preload cannot ask a machine anything. */
  available: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}

/**
 * The whole group, pure over its props.
 *
 * It is pure so that ./__tests__/p106-remote-branch.test.tsx can render every
 * one of the eight modes and read the sentence back. This repository carries no
 * jsdom and no testing library, so a store connected component cannot be driven
 * by a test at all, which is the shape ./RemoteRunsSection.tsx already uses.
 */
export function RemoteBranchPanel({
  entry,
  label,
  available,
  collapsed,
  onToggle,
  onRefresh
}: RemoteBranchPanelProps): React.JSX.Element {
  const sentence = branchModeSentence(entry.mode, label);
  const answered = machineAnsweredBranch(entry.mode);
  const busy = entry.loading || entry.refreshing;
  // True on the one path where the body draws facts, being a live bridge, an
  // answer that came back, and a mode that has no sentence of its own. The
  // sentences below the group are drawn on that path and on no other.
  const factsRead = available && entry.mode === 'ok' && !entry.loading;
  const follows = factsRead ? branchFollowSentence(entry, label) : null;
  // The counts are on screen only when all three of the answers above are no.
  // That is the one state where the sentence about what they were counted
  // against says something a person needs.
  const countsDrawn =
    factsRead &&
    entry.upstream !== null &&
    !entry.upstreamGone &&
    !entry.trackUnreadable;

  const body = (): React.JSX.Element => {
    if (!available) {
      return <div className="rbranch-note">{BRANCH_NO_BRIDGE}</div>;
    }
    if (entry.mode === null || entry.loading) {
      return <div className="rbranch-note">{branchReading(label)}</div>;
    }
    if (sentence !== null) {
      return <div className="rbranch-note">{sentence}</div>;
    }
    // PHASE 228. THE BRANCH IS ONE ROW, in the shape the local branch header
    // draws it: the name, the short commit beside it, and the local header's
    // own arrows when the branch follows one, with the follows sentence as
    // the row's hover title. Until this phase the body drew three sentences,
    // "The branch checked out on X is main.", "Its newest commit is abc."
    // and what it follows, and the local face draws no such paragraph. A
    // read failure about the counts is one line under the row, because zero
    // and zero is also what a level branch answers.
    const failure =
      entry.upstreamGone || entry.trackUnreadable ? follows : null;
    const arrows =
      countsDrawn && (entry.ahead > 0 || entry.behind > 0)
        ? `${entry.ahead > 0 ? `↑${String(entry.ahead)}` : ''}${
            entry.ahead > 0 && entry.behind > 0 ? ' ' : ''
          }${entry.behind > 0 ? `↓${String(entry.behind)}` : ''}`
        : null;
    const sha =
      entry.shortSha !== null && entry.shortSha !== '' ? entry.shortSha : null;
    return (
      <>
        {entry.branch !== null ? (
          <div role="list" className="rbranch-list">
            <div
              role="listitem"
              className="rbranch-row"
              aria-label={`${entry.branch}${sha !== null ? `, at ${sha}` : ''}${
                arrows !== null ? `, ${arrows}` : ''
              }`}
              {...(countsDrawn && follows !== null ? { title: follows } : {})}
            >
              <Codicon name="git-branch" size="sm" />
              <span className="rbranch-branch">{entry.branch}</span>
              {sha !== null ? (
                <span className="rbranch-sha num">{sha}</span>
              ) : null}
              {arrows !== null ? (
                <span className="branch-arrows num">{arrows}</span>
              ) : null}
            </div>
          </div>
        ) : null}
        {failure !== null ? (
          <div className="rbranch-note rbranch-failure">{failure}</div>
        ) : null}
      </>
    );
  };

  return (
    <>
      <section
        className={`section-scm-remote-branch${collapsed ? ' collapsed' : ''}`}
        data-section-root="remote-branch"
      >
        <div
          className={`section-header${collapsed ? ' collapsed' : ''}`}
          data-section="remote-branch"
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
            Branch
          </button>
          <span className="section-spacer" />
          <button
            type="button"
            className="icon-btn scm-action"
            aria-label="Refresh branch"
            title="Refresh branch"
            disabled={!available || busy}
            onClick={onRefresh}
          >
            <Codicon name="refresh" size="md" />
          </button>
        </div>
        {!collapsed ? (
          <div className="section-body rbranch-body">{body()}</div>
        ) : null}
      </section>
      {/* THE ONE LINE BELOW THE GROUP, outside the body that scrolls. PHASE
          228 TOOK FIVE SENTENCES OUT OF THIS PLACE, being the band above the
          group and the four standing lines under it, because the local face
          carries no paragraph; the record is in ../machines/branch.ts. */}
      {/* PHASE 228 LEFT THIS CLOCK and PHASE 230 REMOVES IT, once the group
          reads again by itself when it is looked at. */}
      {!collapsed && answered && entry.readAt > 0 ? (
        <p className="scm-remote-note rbranch-read-at">
          {machineReadAt(label, entry.readAt)}
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
export function RemoteBranchSection({
  target,
  label
}: {
  target: WorkspaceTarget;
  /** The machine's label as the view above already resolved it. */
  label: string;
}): React.JSX.Element {
  const entry = useRemoteBranch((s) => remoteBranchOf(s.byTarget, target));
  const ensure = useRemoteBranch((s) => s.ensure);
  const refresh = useRemoteBranch((s) => s.refresh);
  // Read once per mount. The bridge is a property of the build, not of state.
  const available = useMemo(() => remoteBranchAvailable(), []);
  // Collapsed by default, per target, exactly like the local Branches section.
  // The `gmux.scm.branchesCollapsed.` prefix is the one that section already
  // uses and a local repository's key is its bare path, so no stored answer
  // moves and this phase adds no new key to the contract inventory.
  const [collapsed, setCollapsed] = usePersistedBool(
    `gmux.scm.branchesCollapsed.${targetKey(target)}`,
    true
  );

  useEffect(() => {
    if (!collapsed && available) ensure(target);
  }, [collapsed, target, ensure, available]);

  return (
    <RemoteBranchPanel
      entry={entry}
      // Main sends that machine's own label with every answer. Before the first
      // answer there is none, so the view's own resolved label stands in. The
      // two are the same string, and this order means no sentence is ever drawn
      // with an empty name in it.
      label={entry.machineLabel !== '' ? entry.machineLabel : label}
      available={available}
      collapsed={collapsed}
      onToggle={() => setCollapsed(!collapsed)}
      onRefresh={() => void refresh(target)}
    />
  );
}
