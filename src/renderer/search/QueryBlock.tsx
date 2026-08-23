/**
 * The query block — the box, the three modifiers, and the include/exclude
 * fields behind a disclosure.
 *
 * The three modifiers are icon TOGGLES rather than a settings row because
 * they change what the number in the summary means, and a person scanning
 * "412 results" needs to be able to see, without clicking anything, whether
 * that count was case-sensitive. `aria-pressed` plus a filled background plus
 * a tooltip that names the chord is the whole affordance.
 *
 * Include/exclude hide behind "…" for the reason VS Code learned the hard
 * way: a stale filter is the single most common cause of "search is broken".
 * They are hidden when empty and PINNED OPEN whenever either has a value, so
 * a filter can never be silently in force behind a collapsed disclosure — and
 * the no-results state names them again on the way out.
 *
 * PHASE 98 DREW THREE CONTROLS OFF, and only on a tab whose folder is on
 * another machine. The three modifiers all work there, because each of them is
 * a letter this app hands to that machine's own grep. Include, exclude and the
 * ignore files toggle do not. A search over there has no glob machinery, and
 * its file list comes from git. They are drawn OFF rather than removed, which is
 * the rule the rest of this app follows, and their title says why.
 */

import React from 'react';
import { keyDisplay } from '@shared/keymap';
import type { KeymapId } from '@shared/keymap';
import { localPathOf } from '@shared/workspace-target';
import { Codicon } from '../icons';
import { SEARCH_FILTERS_ON_THIS_MAC } from '../machines/presentation';
import { focusResultsList } from './results-focus';
import { useSearch } from './store';

function Toggle({
  icon,
  label,
  chordId,
  on,
  onClick
}: {
  icon: string;
  label: string;
  chordId?: KeymapId;
  on: boolean;
  onClick: () => void;
}): React.JSX.Element {
  const chord = chordId !== undefined ? keyDisplay(chordId) : '';
  const title = chord.length > 0 ? `${label} (${chord})` : label;
  return (
    <button
      type="button"
      className={`icon-btn search-toggle${on ? ' on' : ''}`}
      aria-pressed={on}
      aria-label={title}
      title={title}
      onClick={onClick}
    >
      <Codicon name={icon} size={16} />
    </button>
  );
}

export function QueryBlock(): React.JSX.Element {
  const query = useSearch((s) => s.query);
  const isRegex = useSearch((s) => s.isRegex);
  const isCaseSensitive = useSearch((s) => s.isCaseSensitive);
  const matchWholeWord = useSearch((s) => s.matchWholeWord);
  const includes = useSearch((s) => s.includes);
  const excludes = useSearch((s) => s.excludes);
  const useIgnoreFiles = useSearch((s) => s.useIgnoreFiles);
  const detailsOpen = useSearch((s) => s.detailsOpen);
  const status = useSearch((s) => s.status);
  const error = useSearch((s) => s.error);
  const target = useSearch((s) => s.target);
  const remoteMode = useSearch((s) => s.remoteMode);

  const setQuery = useSearch((s) => s.setQuery);
  const setIncludes = useSearch((s) => s.setIncludes);
  const setExcludes = useSearch((s) => s.setExcludes);
  const toggleRegex = useSearch((s) => s.toggleRegex);
  const toggleCaseSensitive = useSearch((s) => s.toggleCaseSensitive);
  const toggleWholeWord = useSearch((s) => s.toggleWholeWord);
  const toggleUseIgnoreFiles = useSearch((s) => s.toggleUseIgnoreFiles);
  const setDetailsOpen = useSearch((s) => s.setDetailsOpen);
  const run = useSearch((s) => s.run);

  const hasFilters = includes.trim().length > 0 || excludes.trim().length > 0;
  const showDetails = detailsOpen || hasFilters;
  const onMachine = target !== null && localPathOf(target) === null;
  // Only a regex error belongs on the input: everything else (an unreadable
  // root, a missing binary) is about the search, not about what was typed.
  //
  // PHASE 98 ADDED THE SECOND HALF. A machine's grep can refuse a pattern this
  // Mac would have accepted, and that refusal is about what was typed too. The
  // sentence for it is drawn in the results area, so the box is marked and no
  // second message is written here.
  const badPattern =
    (status === 'error' && isRegex && error !== null) ||
    remoteMode === 'badPattern';

  return (
    <div className="search-query" data-slot="search-query">
      <div className="search-row">
        <input
          className={`input search-input${badPattern ? ' invalid' : ''}`}
          data-slot="search-input"
          type="text"
          spellCheck={false}
          autoComplete="off"
          placeholder="Search"
          aria-label="Search this project"
          aria-invalid={badPattern}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              run();
              return;
            }
            // ↓ walks out of the box and into the results — the keyboard path
            // between typing and picking. VS Code does the same, and without
            // it the only way into the list is the mouse.
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              focusResultsList();
            }
          }}
        />
        <Toggle
          icon="case-sensitive"
          label="Match case"
          chordId="search.matchCase"
          on={isCaseSensitive}
          onClick={toggleCaseSensitive}
        />
        <Toggle
          icon="whole-word"
          label="Match whole word"
          chordId="search.wholeWord"
          on={matchWholeWord}
          onClick={toggleWholeWord}
        />
        <Toggle
          icon="regex"
          label="Use regular expression"
          chordId="search.regex"
          on={isRegex}
          onClick={toggleRegex}
        />
      </div>

      {badPattern && error !== null ? (
        <p className="search-invalid" role="alert">
          {error}
        </p>
      ) : null}

      {/* Disabled — not hidden — while a filter has a value, because the
          fields are pinned open in that state and a button that visibly does
          nothing is worse than one that says why. */}
      <button
        type="button"
        className={`icon-btn search-details-toggle${showDetails ? ' on' : ''}`}
        aria-expanded={showDetails}
        aria-label={
          hasFilters
            ? 'File filters stay visible while they have a value'
            : showDetails
              ? 'Hide file filters'
              : 'Show file filters'
        }
        title={
          hasFilters
            ? 'File filters stay visible while they have a value — clear them to hide this.'
            : showDetails
              ? 'Hide file filters'
              : 'Show file filters'
        }
        disabled={hasFilters}
        onClick={() => setDetailsOpen(!detailsOpen)}
      >
        <Codicon name="ellipsis" size={16} />
      </button>

      {showDetails ? (
        <div className="search-details">
          <label className="search-field">
            <span className="search-field-label">files to include</span>
            <input
              className="input search-glob"
              type="text"
              spellCheck={false}
              autoComplete="off"
              placeholder="src/**, *.ts"
              value={includes}
              disabled={onMachine}
              title={onMachine ? SEARCH_FILTERS_ON_THIS_MAC : undefined}
              onChange={(e) => setIncludes(e.target.value)}
            />
          </label>
          <label className="search-field">
            <span className="search-field-label">files to exclude</span>
            <input
              className="input search-glob"
              type="text"
              spellCheck={false}
              autoComplete="off"
              placeholder="**/dist/**"
              value={excludes}
              disabled={onMachine}
              title={onMachine ? SEARCH_FILTERS_ON_THIS_MAC : undefined}
              onChange={(e) => setExcludes(e.target.value)}
            />
          </label>
          <button
            type="button"
            className={`search-ignore${useIgnoreFiles ? '' : ' off'}`}
            aria-pressed={!useIgnoreFiles}
            disabled={onMachine}
            title={
              onMachine
                ? SEARCH_FILTERS_ON_THIS_MAC
                : useIgnoreFiles
                  ? 'Ignored files are being skipped. Including them is 12–80× slower.'
                  : 'Ignored files are being searched — 12–80× slower than skipping them.'
            }
            onClick={toggleUseIgnoreFiles}
          >
            <Codicon name={useIgnoreFiles ? 'exclude' : 'eye'} size={16} />
            <span>
              {useIgnoreFiles ? 'Skipping ignored files' : 'Searching ignored files'}
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
