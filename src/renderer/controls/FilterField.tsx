/**
 * FilterField — the app's ONE filter input with a leading glyph.
 *
 * It exists because the same field was being rebuilt per surface, and one of
 * those rebuilds got the geometry wrong (Phase 14.2): an absolutely-positioned
 * magnifier over an input whose start padding was written as `padding-left`,
 * which `.input`'s own `padding` shorthand clobbers whenever the bundler puts
 * globals.css last — and the glyph landed on the first letter of the
 * placeholder. Both halves of the fix are stated once and only here: the
 * padding is derived from the icon in filter-field.css, and the only way to
 * get a leading glyph is to use this component.
 *
 * The surface is deliberately five props. Everything a filter should do the
 * same way everywhere — Esc clears it, a clear button appears the moment
 * there is something to clear, the placeholder is also the accessible name —
 * is behaviour, not configuration.
 */

import React from 'react';
import { Codicon } from '../icons';
import './filter-field.css';

export interface FilterFieldProps {
  value: string;
  onChange: (next: string) => void;
  /** Placeholder text, and the field's accessible name. */
  placeholder: string;
  /**
   * Leading codicon id: 'search' looks something up, 'filter' narrows a list
   * that is already on screen. The app makes that distinction elsewhere, so
   * the field has to be able to as well.
   */
  icon?: string;
  /** Layout only — width and placement belong to the surface. */
  className?: string;
}

export function FilterField({
  value,
  onChange,
  placeholder,
  icon = 'search',
  className
}: FilterFieldProps): React.JSX.Element {
  return (
    <div
      className={`filter-field${className !== undefined ? ` ${className}` : ''}`}
    >
      <Codicon name={icon} size={14} className="filter-field-icon" />
      <input
        className="input"
        type="text"
        value={value}
        spellCheck={false}
        autoComplete="off"
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Esc empties the field, and stops there. The layer behind a filter
          // is usually something Esc would close, and losing the whole panel
          // because you wanted to undo a query is the wrong trade.
          if (e.key === 'Escape' && value !== '') {
            e.stopPropagation();
            onChange('');
          }
        }}
      />
      {value !== '' ? (
        <button
          type="button"
          className="filter-field-clear"
          aria-label="Clear filter"
          title="Clear filter"
          onClick={() => onChange('')}
        >
          <Codicon name="close" size={12} />
        </button>
      ) : null}
    </div>
  );
}
