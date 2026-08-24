/**
 * ⌘⇧O — go to symbol.
 *
 * Chrome is the ⌘J attention-overlay family (backdrop, floating panel under
 * the titlebar, listbox semantics, footer key hints) rather than a new
 * invention: gmux already taught the user what a floating panel under the
 * title bar is, and a second visual language for the same gesture would be
 * one to learn for nothing.
 *
 * TWO THINGS THIS SURFACE MUST NEVER DO, both of them about the index:
 *  - never make you wait to type. It opens instantly, whatever state the index
 *    is in, and the build starts behind it.
 *  - never show an empty list while it is building. "Indexing 1,240 of 4,900
 *    files" is a different sentence from "no symbols here", and the user acts
 *    differently on each.
 */

import React, { useEffect, useRef } from 'react';
import { keyDisplay } from '@shared/keymap';
import { Codicon } from '../icons';
// The palettes share ONE positions→runs implementation. Both pickers are fed
// matched-character indices by the same VS Code fuzzy scorer, so coalescing
// them into spans is one problem, not two — and it is the kind of off-by-one
// that is invisible in review and glaring on screen. quickopen owns the
// fuzzy-match vocabulary (scorer, positions, runs); this is its renderer half.
// An inline copy lived here until Phase 14 integration deleted it.
import { highlightRuns } from '../quickopen/highlight';
import { SYMBOLS_ELSEWHERE_BODY, symbolsElsewhereTitle } from '../machines/search';
import { splitPath } from './rows';
import { symbolIcon, symbolKindLabel } from './symbol-kinds';
import { useSymbols } from './symbols-store';
import { gmuxBridge } from '../bridge';

/** Per-character highlight from the matched indices main handed back. */
function Highlighted({
  text,
  positions
}: {
  text: string;
  positions: readonly number[] | undefined;
}): React.JSX.Element {
  if (positions === undefined || positions.length === 0) {
    return <>{text}</>;
  }
  return (
    <>
      {highlightRuns(text, positions).map((run, i) =>
        run.hit ? (
          // <mark>, not a styled span: the highlight has to survive
          // high-contrast mode and be announced as emphasis.
          <mark key={i} className="search-hit">
            {run.text}
          </mark>
        ) : (
          <React.Fragment key={i}>{run.text}</React.Fragment>
        )
      )}
    </>
  );
}

export function SymbolPalette(): React.JSX.Element | null {
  const open = useSymbols((s) => s.open);
  const query = useSymbols((s) => s.query);
  const mode = useSymbols((s) => s.mode);
  const fileScope = useSymbols((s) => s.fileScope);
  const hits = useSymbols((s) => s.hits);
  const selected = useSymbols((s) => s.selected);
  const indexing = useSymbols((s) => s.indexing);
  const indexed = useSymbols((s) => s.indexed);
  const total = useSymbols((s) => s.total);
  const cold = useSymbols((s) => s.cold);
  const error = useSymbols((s) => s.error);
  const elsewhere = useSymbols((s) => s.elsewhere);

  const close = useSymbols((s) => s.close);
  const setQuery = useSymbols((s) => s.setQuery);
  const move = useSymbols((s) => s.move);
  const setSelected = useSymbols((s) => s.setSelected);
  const accept = useSymbols((s) => s.accept);
  const applyProgress = useSymbols((s) => s.applyProgress);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el === null) return;
      el.focus();
      // Caret after the prefix, nothing selected — the next keystroke should
      // extend the query, not replace the mode character.
      const at = el.value.length;
      el.setSelectionRange(at, at);
    });
  }, [open]);

  useEffect(() => {
    const symbols = gmuxBridge()?.symbols;
    if (symbols === undefined) return;
    return symbols.onProgress(applyProgress);
  }, [applyProgress]);

  useEffect(() => {
    if (!open) return;
    const row = listRef.current?.children[selected];
    if (row instanceof HTMLElement) row.scrollIntoView({ block: 'nearest' });
  }, [open, selected]);

  if (!open) return null;

  const scopeLabel =
    mode === '@'
      ? fileScope === null
        ? 'this file'
        : splitPath(fileScope).name
      : 'this project';

  return (
    <>
      <div className="attention-backdrop" onMouseDown={close} />
      <div
        className="attention-panel symbol-palette"
        role="dialog"
        aria-label="Go to symbol"
      >
        <div className="symbol-input-row">
          <Codicon name="symbol-method" size={16} />
          <input
            ref={inputRef}
            className="symbol-input"
            type="text"
            spellCheck={false}
            autoComplete="off"
            aria-label={`Go to symbol in ${scopeLabel}`}
            aria-controls="gmux-symbol-list"
            placeholder={
              mode === '@' ? 'Symbol in this file' : 'Symbol in this project'
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                move(1);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                move(-1);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                accept();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                close();
              }
            }}
          />
          <span className="symbol-scope">{scopeLabel}</span>
        </div>

        {indexing ? (
          <div className="symbol-status" aria-live="polite">
            <span className="symbol-progress-line" />
            {total > 0
              ? `Reading this project's code — ${indexed.toLocaleString()} of ${total.toLocaleString()} files.`
              : "Reading this project's code…"}
          </div>
        ) : null}

        {error !== null ? (
          <div className="symbol-status symbol-status-error" role="alert">
            {error}
          </div>
        ) : null}

        <div
          id="gmux-symbol-list"
          ref={listRef}
          role="listbox"
          aria-label="Symbols"
          className="symbol-list"
        >
          {hits.map((hit, i) => {
            const { name: fileName, dir } = splitPath(hit.relPath);
            return (
              <button
                key={`${hit.relPath}:${hit.line}:${hit.column}:${hit.name}`}
                type="button"
                role="option"
                aria-selected={i === selected}
                aria-label={`${hit.name}, ${symbolKindLabel(hit.kind)}${
                  hit.container !== null ? ` in ${hit.container}` : ''
                }, ${hit.relPath} line ${hit.line}`}
                className={`symbol-row${i === selected ? ' selected' : ''}`}
                onMouseEnter={() => setSelected(i)}
                onClick={() => accept(i)}
              >
                <Codicon name={symbolIcon(hit.kind)} size={16} />
                <span className="symbol-name">
                  <Highlighted text={hit.name} positions={hit.positions} />
                </span>
                {hit.container !== null ? (
                  <span className="symbol-container">· {hit.container}</span>
                ) : null}
                <span className="symbol-spacer" />
                {mode === '#' ? (
                  <span className="symbol-path" title={hit.relPath}>
                    {fileName}
                    {dir.length > 0 ? (
                      <span className="symbol-dir"> {dir}</span>
                    ) : null}
                  </span>
                ) : null}
                <span className="symbol-line num">{hit.line}</span>
              </button>
            );
          })}

          {/* PHASE 90.3. Said FIRST, before anything about the index or the
              query. Nothing here can be read, so nothing else in this panel is
              worth saying. Two lines: what does not reach that machine, then
              what Tortie does read. */}
          {elsewhere !== null ? (
            <div className="symbol-empty">
              {symbolsElsewhereTitle(elsewhere)}
              <br />
              {SYMBOLS_ELSEWHERE_BODY}
            </div>
          ) : hits.length === 0 && !indexing ? (
            <div className="symbol-empty">
              {cold
                ? 'No symbol index for this project yet.'
                : query.length > 1
                  ? 'No matching symbol.'
                  : `No symbols found in ${scopeLabel}.`}
            </div>
          ) : null}
        </div>

        <div className="attention-footer">
          <span className="key">↩</span> go to symbol
          <span className="key">@</span> this file
          <span className="key">#</span> project
          <span className="key">Esc</span> close
          <span className="symbol-spacer" />
          <span className="symbol-footer-hint">
            {keyDisplay('view.symbols')}
          </span>
        </div>
      </div>
    </>
  );
}
