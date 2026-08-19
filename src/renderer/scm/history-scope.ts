/**
 * History scope — Phase 14.5, BACKLOG "This branch + upstream" / "All local
 * branches" / "Everything"; design research
 * docs/research/24-git-graph-d3-visual-design.md §5.5.
 *
 * The vocabulary and the per-repo persistence. The control that renders it is
 * HistoryScopeControl.tsx — split so this half stays free of the app store
 * (and therefore of `window`), which is what lets the copy be unit-tested.
 *
 * WHY THIS CONTROL EXISTS AT ALL. Until now the history pane walked HEAD, so
 * a commit that is on `origin/main` but not on `main` was not in the payload
 * — "you are 3 behind" was unrenderable at any price. The walk is now
 * ref-scoped, and the ref set is a *question the user gets to ask*: the
 * default answers "where am I against my remote?", and the two wider scopes
 * answer "what are my other branches doing?" and "what does this repo look
 * like?". `--all` is deliberately not one of them (research 24 §4.1: 48
 * concurrent lanes at depth on a real repo, plus `refs/stash` and
 * `refs/notes/*`, which are not history anyone is looking at).
 *
 * It belongs to the HISTORY section, not the view band: it changes what this
 * list shows, not what the repo does. It is a hover-revealed accessory in the
 * 28px header — except when the scope is NOT the default, where it stays lit
 * and the header names the scope. A list quietly showing commits from
 * branches you are not on, with no indication why, is the kind of small lie
 * this phase exists to remove.
 *
 * Persisted per repo: the answer is a property of the repository you are
 * looking at, not of the app.
 */

import { useCallback, useState } from 'react';
import type { GitLogScope } from '@shared/types';

/** Menu order, and the order the radio group reads in. */
export const HISTORY_SCOPES: readonly GitLogScope[] = [
  'branch',
  'local',
  'everything'
];

/** The default: the only scope in which divergence is the picture, not noise. */
export const DEFAULT_HISTORY_SCOPE: GitLogScope = 'branch';

const LABELS: Record<GitLogScope, string> = {
  branch: 'This branch + upstream',
  local: 'All local branches',
  everything: 'Everything'
};

/** Second line in the menu — says what the scope will *contain*. */
const HINTS: Record<GitLogScope, string> = {
  branch: 'The branch you are on and where its remote stands',
  local: 'Every local branch, plus this branch’s upstream',
  everything: 'Local branches, remote branches and tags'
};

/** Lower-case form for the header tag, which is not a sentence. */
const TAGS: Record<GitLogScope, string> = {
  branch: '',
  local: 'all local branches',
  everything: 'everything'
};

export const scopeLabel = (scope: GitLogScope): string => LABELS[scope];
export const scopeHint = (scope: GitLogScope): string => HINTS[scope];
export const scopeTag = (scope: GitLogScope): string => TAGS[scope];

const storageKey = (repoPath: string): string =>
  `gmux.scm.historyScope.${repoPath}`;
// PHASE 90.3. This key holds a path and it can never hold a path on another
// machine, and the reason is structural rather than a guard here. History is
// not rendered at all for a tab whose folder is on another machine, so no
// caller of this module exists in that tab. The two readers of this key,
// `HistorySection` and `HistoryScopeControl`, are both children of the local
// branch of `ScmSection`, which is reached only when `localPathOf(target)` is
// a string.

const isScope = (v: string | null): v is GitLogScope =>
  v === 'branch' || v === 'local' || v === 'everything';

function readScope(repoPath: string): GitLogScope {
  try {
    const raw = localStorage.getItem(storageKey(repoPath));
    // Validated against the union on every read, so a hand-edited or
    // since-removed value falls back to the default instead of pinning the
    // walk to a scope the main process no longer understands.
    return isScope(raw) ? raw : DEFAULT_HISTORY_SCOPE;
  } catch {
    return DEFAULT_HISTORY_SCOPE;
  }
}

/**
 * The chosen scope for one repo, persisted.
 *
 * Re-read DURING RENDER when the repo changes, not in an effect. An effect
 * would hand the caller one frame of the previous project's scope, and that
 * frame is not cosmetic here: the History section fires its opening `git log`
 * from this value, so a stale frame is a wasted ref-scoped walk and a visible
 * flip of the list. This is React's sanctioned "adjust state when props
 * change" pattern — the extra render happens before anything is committed.
 */
export function usePersistedScope(
  repoPath: string
): [GitLogScope, (next: GitLogScope) => void] {
  const [state, setState] = useState<{ path: string; scope: GitLogScope }>(
    () => ({ path: repoPath, scope: readScope(repoPath) })
  );
  if (state.path !== repoPath) {
    setState({ path: repoPath, scope: readScope(repoPath) });
  }

  const update = useCallback(
    (next: GitLogScope): void => {
      setState({ path: repoPath, scope: next });
      try {
        localStorage.setItem(storageKey(repoPath), next);
      } catch {
        /* the scope still applies for this session */
      }
    },
    [repoPath]
  );

  return [state.path === repoPath ? state.scope : readScope(repoPath), update];
}
