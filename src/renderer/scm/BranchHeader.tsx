/**
 * S3A Source Control view header [h:36] — round 1: the branch is a MENU.
 *
 * ⎇ branch ˅ (click → native menu: local branches with the current one
 * checked, then "Create branch…") · the SYNC control (↑n ↓n) · spacer ·
 * ⋯ actions · refresh. Detached HEAD renders the git-commit glyph + short
 * SHA in the warning color. Right-click on the button copies the branch name
 * (round 0's click-to-copy moved here — click now opens the menu).
 *
 * Phase 12 item 3 turned the ahead/behind readout into the primary network
 * affordance (VS Code parity): one click syncs (pull, then push), and a
 * branch with no upstream shows Publish Branch instead of a dead counter.
 * Everything else — pull, push, fetch, and the remotes list with URLs and
 * the tracking marker — lives in the ⋯ menu, so the 36px band gains exactly
 * two controls. A network verb in flight swaps its glyph for a spinner and
 * disables the others; failures are sticky toasts carrying git's own words
 * (auth, unreachable host, rejected push) — never a silent no-op.
 *
 * The dirty count moved to the activity bar's SCM badge (round 1); it no
 * longer renders here. Non-git folders show the folder name, muted.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { localPathOf, targetOfProject } from '@shared/workspace-target';
import { useApp } from '../state/store';
import { machineLabelFor } from '../state/machines-slice';
import type { MenuItemSpec } from '../state/store';
import { gitErrorLine, repoState, useGit } from '../state/git';
import { displayPath, useNow } from '../format';
import { Codicon, menuGlyph } from '../icons';
import { depthRepoState, hasGitDepth, hasGitSync, useGitDepth } from './depth';
import { shortenRemoteUrl } from './format';
import {
  fetchAgeCaption,
  fetchAgeShort,
  fetchIsStale,
  honestSyncTooltip
} from './freshness';
import { remoteChangesOf, useRemoteChanges } from './remote-changes';
import { readClockTime, remoteReadAt } from '../machines/presentation';
import { requestManageBranches } from './manage-branches';
import { MiniModal } from './MiniModal';
import type { MiniModalSpec } from './MiniModal';
import { gmuxBridge } from '../bridge';

export function BranchHeader(): React.JSX.Element {
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const toast = useApp((s) => s.toast);
  const setMenu = useApp((s) => s.setMenu);

  const repos = useGit((s) => s.repos);
  const init = useGit((s) => s.init);
  const ensureStatus = useGit((s) => s.ensureStatus);
  const refreshAll = useGit((s) => s.refreshAll);

  const checkoutBranch = useGitDepth((s) => s.checkoutBranch);
  const createBranch = useGitDepth((s) => s.createBranch);
  const refreshDepth = useGitDepth((s) => s.refresh);
  const loadRemotes = useGitDepth((s) => s.loadRemotes);
  const loadFetchAge = useGitDepth((s) => s.loadFetchAge);
  const runSync = useGitDepth((s) => s.sync);
  const runPush = useGitDepth((s) => s.push);
  const runPull = useGitDepth((s) => s.pull);
  const runPublish = useGitDepth((s) => s.publish);
  const fetchAll = useGitDepth((s) => s.fetchAll);

  const [modal, setModal] = useState<MiniModalSpec | null>(null);
  const [menuBusy, setMenuBusy] = useState(false);
  const depthAvailable = useMemo(() => hasGitDepth(), []);
  const syncAvailable = useMemo(() => hasGitSync(), []);

  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );
  // PHASE 90.3. The conversion site, and it is the whole fix for this header.
  // `repoPath` is the path THIS MAC may act on, so it is null for a tab whose
  // folder is on another machine. Every git verb below hangs off it, so a
  // machine tab reaches none of them by construction rather than by a guard on
  // each one.
  const target = useMemo(() => targetOfProject(project), [project]);
  const repoPath = localPathOf(target);
  const repo = repoState(repos, repoPath);
  const status = repo.status;

  const machineStates = useApp((s) => s.machineStates);
  const remoteEntry = useRemoteChanges((s) => remoteChangesOf(s.byTarget, target));
  const refreshRemote = useRemoteChanges((s) => s.refresh);
  const ensureRemote = useRemoteChanges((s) => s.ensure);
  const onMachine = project !== null && target !== null && repoPath === null;

  useEffect(() => {
    if (target !== null && repoPath === null) ensureRemote(target);
  }, [target, repoPath, ensureRemote]);

  const depthRepo = depthRepoState(
    useGitDepth((s) => s.repos),
    repoPath
  );
  const syncOp = depthRepo.syncOp;
  const remotes = depthRepo.remotes ?? [];
  const now = useNow();
  /**
   * When this clone last heard from a remote. Every ahead/behind number in
   * this header is measured against a remote-tracking ref, which is a
   * snapshot taken then — so "nothing to pull" is a claim about that moment,
   * not about now (BACKLOG 14.5, research 24 §6.3). See freshness.ts.
   */
  const lastFetchedAt = depthRepo.lastFetchedAt;
  /**
   * `undefined` until the age has actually been read — distinct from `null`,
   * which means "read, and this clone has never fetched". Conflating them
   * would make the header assert "nothing fetched yet" for the first frames
   * of every project switch.
   */
  const knownFetchAge: number | null | undefined =
    depthRepo.remoteBranches !== null || depthRepo.divergence !== null
      ? lastFetchedAt
      : undefined;

  useEffect(() => {
    init();
    if (repoPath !== null) ensureStatus(repoPath);
  }, [init, ensureStatus, repoPath]);

  // The remotes list powers the ⋯ menu and the Publish affordance, and the
  // last-fetch age qualifies the sync counter — so the header loads both
  // itself rather than waiting for HISTORY or BRANCHES to be expanded.
  useEffect(() => {
    if (repoPath !== null && syncAvailable) void loadRemotes(repoPath);
  }, [repoPath, syncAvailable, loadRemotes]);

  useEffect(() => {
    if (repoPath !== null) void loadFetchAge(repoPath);
  }, [repoPath, loadFetchAge]);

  const copyBranch = (name: string): void => {
    void navigator.clipboard.writeText(name).then(
      () => toast('info', 'Branch name copied'),
      () => toast('error', 'Could not copy the branch name')
    );
  };

  const openCreateBranchModal = (path: string): void => {
    setModal({
      title: 'Create branch',
      placeholder: 'branch-name',
      submit: (name) => createBranch(path, name)
    });
  };

  /** Click → native branch menu (list + checkout + create). */
  const openBranchMenu = async (
    e: React.MouseEvent,
    path: string,
    currentLabel: string
  ): Promise<void> => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!depthAvailable) {
      // Older preload: the menu is impossible — keep round 0's copy gesture.
      copyBranch(currentLabel);
      return;
    }
    if (menuBusy) return;
    setMenuBusy(true);
    let items: (MenuItemSpec | 'sep')[];
    try {
      const bridge = gmuxBridge()?.git;
      const branches = (await bridge?.branches?.(path)) ?? [];
      items = branches.map((b) => ({
        // ui:popupMenu has no native check state — the ✓ prefix (with an
        // em-space aligning the others) marks the current branch.
        label: `${b.current ? '✓ ' : ' '}${b.name}`,
        run: (): void => {
          if (!b.current) void checkoutBranch(path, b.name);
        }
      }));
      if (items.length > 0) items.push('sep');
      items.push({
        label: 'Create branch…',
        // The branch rows above it carry no mark, because every one of them
        // would carry the SAME mark and a glyph repeated down a list names the
        // menu rather than the row. The two verbs under the separator do
        // differ from each other, so they get theirs.
        //
        // `git-branch` rather than `git-branch-create`: the shipped codicon
        // stylesheet binds create, delete and the plain branch to ONE
        // codepoint, U+EC6F, so all three draw the same picture.
        // build/assert-menu-glyphs.mjs is the gate that found it and keeps it
        // found. The glyph names the thing this row makes.
        ...menuGlyph('git-branch'),
        run: () => openCreateBranchModal(path)
      });
      // Round 2: the menu stays the one-keystroke switcher; the BRANCHES
      // section is the full UI — this expands + focuses it.
      items.push('sep', {
        label: 'Manage branches',
        // A CHOSEN mark: no surface draws `list-selection`. It is right here
        // because this row leaves the one-keystroke switcher for the whole
        // list. The reason sits with every other chosen mark in the table in
        // src/renderer/icons/codicon-menu-icon.ts.
        ...menuGlyph('list-selection'),
        run: () => {
          useApp.getState().setSidebarView('scm');
          requestManageBranches();
        }
      });
    } catch (err) {
      toast('error', `Could not list branches — ${gitErrorLine(err)}`, {
        sticky: true
      });
      setMenuBusy(false);
      return;
    }
    setMenuBusy(false);
    setMenu({ x: rect.left, y: rect.bottom + 2, items });
  };

  const copyRemoteUrl = (name: string, url: string): void => {
    void navigator.clipboard.writeText(url).then(
      () => toast('info', `${name} URL copied`),
      () => toast('error', 'Could not copy the remote URL')
    );
  };

  /** Publish: `git push -u`. One remote → go; several → ask which. */
  const publishBranch = (path: string): void => {
    if (remotes.length <= 1) {
      void runPublish(path);
      return;
    }
    setMenu({
      x: Math.round(window.innerWidth / 2),
      y: 120,
      items: remotes.map((r) => ({
        label: `Publish to ${r.name}`,
        ...menuGlyph('cloud-upload'),
        hint: shortenRemoteUrl(r.pushUrl),
        run: () => void runPublish(path, r.name)
      }))
    });
  };

  /**
   * The ⋯ menu: every network verb the header doesn't have room for, plus
   * the remotes themselves (name + URL in the hint column, ✓ on the one this
   * branch tracks) — BACKLOG 12 item 3's "visible list of remotes reachable
   * from the branch UI". Flat by necessity: ui:popupMenu has no submenus.
   */
  const openActionsMenu = (e: React.MouseEvent, path: string): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    const busy = syncOp !== null;
    const hasUpstream = status?.upstream !== undefined;
    const items: (MenuItemSpec | 'sep')[] = [
      {
        label: 'Pull',
        // The three sync verbs wear the marks the header's own buttons wear
        // for them: down from the remote, up to it, and both ways.
        ...menuGlyph('cloud-download'),
        disabled: busy || !hasUpstream,
        run: () => void runPull(path)
      },
      {
        label: 'Push',
        ...menuGlyph('cloud-upload'),
        disabled: busy || !hasUpstream,
        run: () => {
          void runPush(path).then((result) => {
            if (result?.status === 'no-upstream') publishBranch(path);
          });
        }
      },
      {
        label: 'Sync',
        ...menuGlyph('sync'),
        disabled: busy || !hasUpstream,
        run: () => void runSync(path)
      },
      'sep',
      {
        label: 'Fetch',
        // It re-reads the remote without changing this branch, which is what
        // the refresh buttons on every SCM section header mean.
        ...menuGlyph('refresh'),
        disabled: busy || depthRepo.fetching || remotes.length === 0,
        // The menu is where the user comes to act on the remote, so it says
        // how old the picture they are acting on is — plainly, in the hint
        // column, with no warning colour.
        ...(remotes.length > 0 && knownFetchAge !== undefined
          ? { hint: fetchAgeCaption(knownFetchAge, now) }
          : {}),
        run: () => void fetchAll(path)
      }
    ];
    if (!hasUpstream && remotes.length > 0) {
      items.push({
        label: 'Publish Branch…',
        ...menuGlyph('cloud-upload'),
        disabled: busy,
        run: () => publishBranch(path)
      });
    }
    if (remotes.length > 0) {
      items.push('sep', { label: 'Remotes', disabled: true, run: () => {} });
      for (const r of remotes) {
        items.push({
          label: `${r.tracked ? '✓ ' : '  '}${r.name} — Copy URL`,
          hint: shortenRemoteUrl(r.fetchUrl),
          run: () => copyRemoteUrl(r.name, r.fetchUrl)
        });
      }
    }
    setMenu({ x: rect.right - 8, y: rect.bottom + 2, items });
  };

  if (!project) {
    return (
      <div className="branch-header" data-slot="branch-header">
        <Codicon name="git-branch" size={14} />
        <span className="branch-folder">No project open</span>
      </div>
    );
  }

  // PHASE 90.3. A tab whose folder is on another machine. The band carries the
  // folder, the machine, the time of the last read and one Refresh button, and
  // it carries nothing else.
  //
  // PHASE 104 REWROTE THE SENTENCE THAT USED TO FOLLOW, because it had been
  // false for two phases. It read "Tortie never writes on that machine".
  // Phase 103 made that false by staging and unstaging there, and Phase 104
  // made it further false by committing there. What is true is narrower, and it
  // is what decides this header: every control this header would otherwise draw
  // names a verb this product refuses on another machine. The branch menu
  // switches branches, the sync control pushes and pulls, and the actions menu
  // holds pull, push and fetch. None of those is built, none is authorised, and
  // push, pull and fetch are not on research 57's list at all. They are ABSENT
  // rather than disabled, because a disabled Push would say Tortie could push
  // there under some condition, and there is no such condition.
  //
  // THE THREE VERBS THAT DO WRITE ARE NOT IN THIS HEADER. Stage and Unstage are
  // buttons on the rows in ./ScmSection.tsx, and Commit is the box above those
  // rows. This band draws no verb of its own.
  if (onMachine && project !== null && target !== null) {
    const label = machineLabelFor(machineStates, target.machineId);
    const busy = remoteEntry.loading || remoteEntry.refreshing;
    return (
      <div className="branch-header" data-slot="branch-header">
        <Codicon name="git-branch" size={14} />
        <span className="branch-folder" title={`${project.path} on ${label}`}>
          {project.name}
        </span>
        <span className="branch-spacer" />
        {remoteEntry.readAt > 0 ? (
          <span className="scm-remote-read" title={remoteReadAt(remoteEntry.readAt)}>
            {readClockTime(remoteEntry.readAt)}
          </span>
        ) : null}
        <button
          type="button"
          className={`icon-btn branch-refresh${busy ? ' busy' : ''}`}
          aria-label="Read what changed on that machine again"
          title={
            remoteEntry.readAt > 0
              ? remoteReadAt(remoteEntry.readAt)
              : 'Read what changed on that machine'
          }
          disabled={busy}
          onClick={() => void refreshRemote(target)}
        >
          <Codicon name="refresh" size={14} />
        </button>
      </div>
    );
  }

  // Not a repo (or still unknown): folder name, muted — §6.3 body lives in
  // the Changes section, the header stays quiet.
  if (!status || !status.isRepo) {
    return (
      <div className="branch-header" data-slot="branch-header">
        <Codicon name="git-branch" size={14} />
        <span className="branch-folder" title={project.path}>
          {displayPath(project.path)}
        </span>
      </div>
    );
  }

  const detached = status.branch === undefined;
  const branchLabel = status.branch ?? status.detachedAt ?? 'HEAD';

  /**
   * The one network control in the band. Three shapes, never two at once:
   * Sync (has an upstream) · Publish Branch (has remotes, no upstream) ·
   * nothing (no remotes, or detached HEAD — pushing a detached HEAD is not a
   * gesture this header offers). The counter lives INSIDE the button, so the
   * number the user reads is the thing they click.
   */
  const syncControl = (path: string): React.JSX.Element | null => {
    if (!syncAvailable || detached) return null;
    const busy = syncOp !== null;
    const busyWord =
      syncOp === 'pull'
        ? 'Pulling…'
        : syncOp === 'push'
          ? 'Pushing…'
          : syncOp === 'publish'
            ? 'Publishing…'
            : 'Syncing…';

    if (status.upstream === undefined) {
      if (remotes.length === 0) return null; // no remote is a state, not an error
      const target = remotes.find((r) => r.name === 'origin') ?? remotes[0];
      const where = remotes.length === 1 && target ? ` to ${target.name}` : '';
      return (
        <button
          type="button"
          className={`scm-sync-btn publish${busy ? ' busy' : ''}`}
          disabled={busy}
          aria-busy={busy}
          aria-label={busy ? busyWord : `Publish branch ${branchLabel}${where}`}
          title={
            busy
              ? busyWord
              : `Publish '${branchLabel}'${where} — pushes it and tracks it from now on`
          }
          onClick={() => publishBranch(path)}
        >
          {busy ? (
            <span className="scm-branch-spinner" aria-hidden="true" />
          ) : (
            <Codicon name="cloud-upload" size={12} />
          )}
          <span className="scm-sync-label">Publish</span>
        </button>
      );
    }

    const what = honestSyncTooltip(
      status.ahead,
      status.behind,
      status.upstream ?? null,
      knownFetchAge,
      now
    );
    const counts = status.ahead > 0 || status.behind > 0;
    /**
     * The one state where silence is a lie: level with the upstream, so the
     * control shows no number at all, while the ref it was measured against
     * is hours old. Show the age of the measurement in the slot the counter
     * would occupy — the band gains no control, and "up to date" stops being
     * asserted about a moment we cannot see. When there ARE counts the
     * tooltip carries it instead; "↑2 ↓1 3h" is three numbers arguing.
     */
    const staleAge =
      !counts && knownFetchAge !== undefined && fetchIsStale(knownFetchAge, now)
        ? fetchAgeShort(knownFetchAge, now)
        : null;
    return (
      <button
        type="button"
        className={`scm-sync-btn${busy ? ' busy' : ''}${counts ? '' : ' quiet'}`}
        disabled={busy}
        aria-busy={busy}
        aria-label={busy ? busyWord : what}
        title={busy ? busyWord : what}
        onClick={() => void runSync(path)}
      >
        {busy ? (
          <span className="scm-branch-spinner" aria-hidden="true" />
        ) : (
          <Codicon name="sync" size={12} />
        )}
        {counts ? (
          <span className="branch-arrows num">
            {status.ahead > 0 ? `↑${status.ahead}` : ''}
            {status.ahead > 0 && status.behind > 0 ? ' ' : ''}
            {status.behind > 0 ? `↓${status.behind}` : ''}
          </span>
        ) : staleAge !== null ? (
          <span className="scm-sync-age num">{staleAge}</span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="branch-header" data-slot="branch-header">
      <button
        type="button"
        className={`branch-menu-btn${detached ? ' detached' : ''}`}
        title={
          detached
            ? `Detached at ${branchLabel} — click to switch branches`
            : `${branchLabel} — click to switch branches`
        }
        aria-label={
          detached
            ? `Detached at ${branchLabel}, open branch menu`
            : `Branch ${branchLabel}, open branch menu`
        }
        aria-haspopup="menu"
        onClick={(e) => void openBranchMenu(e, project.path, branchLabel)}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({
            x: e.clientX,
            y: e.clientY,
            items: [
              {
                label: detached ? 'Copy commit SHA' : 'Copy branch name',
                ...menuGlyph('copy'),
                run: () => copyBranch(branchLabel)
              }
            ]
          });
        }}
      >
        <Codicon name={detached ? 'git-commit' : 'git-branch'} size={14} />
        <span className="branch-name">{branchLabel}</span>
        <Codicon name="chevron-down" size={12} className="branch-caret" />
      </button>
      {status.merging ? (
        <span className="chip chip-sm scm-chip-merge">merging</span>
      ) : null}
      {syncControl(project.path)}
      <span className="branch-spacer" />
      {syncAvailable ? (
        <button
          type="button"
          className="icon-btn branch-refresh"
          aria-label="Git actions"
          aria-haspopup="menu"
          title="Pull, push, fetch, remotes"
          onClick={(e) => openActionsMenu(e, project.path)}
        >
          <Codicon name="ellipsis" size={14} />
        </button>
      ) : null}
      <button
        type="button"
        className={`icon-btn branch-refresh${repo.refreshing ? ' busy' : ''}`}
        aria-label="Refresh git status"
        title="Refresh"
        onClick={() => {
          void refreshAll(project.path);
          void refreshDepth(project.path);
        }}
      >
        <Codicon name="refresh" size={14} />
      </button>
      {modal !== null ? (
        <MiniModal spec={modal} onClose={() => setModal(null)} />
      ) : null}
    </div>
  );
}
