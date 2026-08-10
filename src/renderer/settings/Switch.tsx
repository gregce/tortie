/**
 * Switch (DESIGN.md §3 component): 26×16 track r:8, 12px knob.
 * on: --accent track; off: --bg-raised + 1px --border-strong; disabled 50%;
 * :focus-visible ring. Rendered as a real button with role="switch" so it is
 * keyboard-operable (Space/Enter) and announces its state.
 */

import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Accessible name (the visible row label is separate). */
  label: string;
  /** Danger-tinted ON state (Launch defaults danger presets). */
  danger?: boolean;
}

export function Switch({
  checked,
  onChange,
  disabled = false,
  label,
  danger = false
}: SwitchProps): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`set-switch${checked ? ' on' : ''}${danger ? ' danger' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="set-switch-knob" aria-hidden="true" />
    </button>
  );
}
