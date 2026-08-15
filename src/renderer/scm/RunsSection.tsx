/**
 * RUNS, the fourth SCM section (Phase 46, research 45).
 *
 * It lists the latest workflow runs for the current branch, read from the gh
 * CLI by main. It ships COLLAPSED and loads nothing until the first expand,
 * which is also the moment main starts noticing pushes for this repository.
 * A repository nobody has expanded spawns no process anywhere.
 *
 * Reads happen on three triggers and no timer of this section's own: the
 * refresh button, a debounced `git:changed`, and the `actions:changed` event
 * main pushes while a watch it armed is running. See ./runs.ts.
 *
 * WHAT THIS SECTION CANNOT DO, and the refusals are load bearing. It cannot
 * cancel a run or re-run one, because those write to GitHub and every argv
 * main can compose is a read. It shows no logs, because GitHub has no public
 * streaming log endpoint. It appears nowhere outside this panel: no badge, no
 * toast on a failure, no window title. It can never set a session's status,
 * because a run is not session behavior.
 *
 * THE GITHUB GATE, and the one place this differs from the spec. The section
 * hides itself when the origin is known not to be github.com. The cached
 * answer to `git:remoteUrl` is the cheap way to know that, but the git-depth
 * store only fills it when HISTORY or BRANCHES has been expanded, and forcing
 * it there would register the repository for a full log walk on every change.
 * So the cached answer is used when it exists, and main's own `no-remote`
 * health rung is the fallback when it does not.
 */

import React, { useEffect, useMemo } from 'react';
import { useNow } from '../app/format';
import { Codicon } from '../icons';
import { depthRepoState, useGitDepth } from './depth';
import { usePersistedBool } from './sections';
import { RunJobs } from './RunJobs';
import { RunRow, RunStatusIcon } from './RunRow';
import { hasActions, runsRepoState, useRuns } from './runs';
import {
  RUNS_EMPTY,
  RUNS_LOOKING,
  headerTooltip,
  healthNote,
  hiddenNotes,
  lastCheckedNote,
  runGlyph,
  watchNote
} from './runs-format';
import './runs.css';

export function RunsSection({
  repoPath
}: {
  repoPath: string;
}): React.JSX.Element | null {
  const observe = useRuns((s) => s.observe);
  const refresh = useRuns((s) => s.refresh);
  const toggleRun = useRuns((s) => s.toggleRun);
  const record = useRuns((s) => runsRepoState(s.repos, repoPath));
  const depthRepo = depthRepoState(
    useGitDepth((s) => s.repos),
    repoPath
  );
  const now = useNow();
  const available = useMemo(() => hasActions(), []);

  // Collapsed by default, per repository, exactly like BRANCHES.
  const [collapsed, setCollapsed] = usePersistedBool(
    `gmux.scm.runsCollapsed.${repoPath}`,
    true
  );

  // First expand: observe, then read. Both are idempotent.
  useEffect(() => {
    if (!collapsed && available) observe(repoPath);
  }, [collapsed, repoPath, observe, available]);

  const update = record.update;

  // A build whose preload predates this phase has no actions bridge, and a
  // repository with no github.com origin has no runs to show. Neither gets a
  // section. Every hook above has already run, so this early return is safe.
  if (!available) return null;
  if (depthRepo.remoteChecked && depthRepo.remoteUrl === null) return null;
  if (update?.health.state === 'no-remote') return null;

  const runs = update?.runs ?? [];
  const latest = runs[0];
  const health = update === null ? null : healthNote(update.health);
  const watch = update === null ? null : watchNote(update.watch);
  const hidden = update === null ? [] : hiddenNotes(update.issues);

  const doRefresh = (): void => {
    // The header is visible while the section is collapsed, so a refresh from
    // there is also the first observe. The second read is dropped by the
    // store's own in-flight guard.
    observe(repoPath);
    void refresh(repoPath);
  };

  return (
    <section
      className={`section-scm-runs${collapsed ? ' collapsed' : ''}`}
      data-section-root="runs"
    >
      <div
        className={`section-header${collapsed ? ' collapsed' : ''}`}
        data-section="runs"
      >
        <button
          type="button"
          className="section-toggle"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className="section-chevron">
            <Codicon name="chevron-down" size={12} />
          </span>
          Runs
          <span className="section-count num">
            {runs.length > 0 ? runs.length : ''}
          </span>
        </button>
        {latest !== undefined ? (
          <RunStatusIcon
            glyph={runGlyph(latest.status, latest.conclusion)}
            title={headerTooltip(latest)}
          />
        ) : null}
        <span className="section-spacer" />
        <button
          type="button"
          className="icon-btn scm-action scm-branch-accessory"
          aria-label="Refresh runs"
          title="Refresh runs"
          disabled={record.loading}
          onClick={doRefresh}
        >
          <Codicon name="refresh" size={14} />
        </button>
        <span className="section-gripper" aria-hidden="true">
          <Codicon name="gripper" size={14} />
        </span>
      </div>
      {!collapsed ? (
        <div className="section-body runs-body">
          {health !== null ? (
            <div className="runs-note">
              {health.line}
              {health.detail !== null ? (
                <span className="runs-note-detail">{health.detail}</span>
              ) : null}
            </div>
          ) : null}
          {update === null && record.loading ? (
            <div className="runs-note">{RUNS_LOOKING}</div>
          ) : null}
          {update !== null && runs.length === 0 && health === null ? (
            <div className="runs-note">{RUNS_EMPTY}</div>
          ) : null}
          {runs.length > 0 ? (
            <div className="runs-list" role="list" aria-label="Workflow runs">
              {runs.map((run) => {
                const expanded = record.expanded.includes(run.id);
                return (
                  <div className="runs-item" role="listitem" key={run.id}>
                    <RunRow
                      run={run}
                      expanded={expanded}
                      now={now}
                      onToggle={() => toggleRun(repoPath, run.id)}
                    />
                    {expanded ? (
                      <RunJobs repoPath={repoPath} run={run} now={now} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          {hidden.map((line) => (
            <div className="runs-note" key={line}>
              {line}
            </div>
          ))}
          {watch !== null ? <div className="runs-note">{watch}</div> : null}
          <div className="runs-caption">
            {lastCheckedNote(update?.lastCheckedAt ?? null, now)}
          </div>
        </div>
      ) : null}
    </section>
  );
}
