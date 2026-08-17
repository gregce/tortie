/**
 * The machine badge (Phase 70, M3).
 *
 * A session that lives on another machine says so, in that machine's own label
 * and its own colour. A session on this Mac draws nothing at all, because the
 * Mac in front of the person is not a special case that needs announcing, and
 * a badge on every row would cost the dense surfaces their width for a fact
 * that is true by default.
 *
 * WHERE IT APPEARS, and it is four places and no others:
 *  - the session dock row, after the name;
 *  - the rail hover card, on its own line;
 *  - the identity strip, beside the name;
 *  - the tab, when that tab shows a session on another machine.
 *
 * The condition bar draws it too, once per quiet machine, so a person can read
 * which machine went quiet rather than being told that "a machine" did.
 *
 * WHAT DIMMED MEANS. `answering` is false when the last completed check of that
 * machine got no answer. The badge dims and its sentence changes to say the
 * machine did not answer. It never says the session ended, because nothing
 * proved that, and the row's own status carries the rest.
 */

import React from 'react';
import type { SessionMachine } from '@shared/types';
import { badgeQuietTitle, badgeTitle } from './machine-copy';
import './machine-badge.css';

export function MachineBadge({
  machine,
  className,
  title
}: {
  /** The session's machine. Undefined means this Mac, and draws nothing. */
  machine: SessionMachine | undefined;
  /** Extra class for the surface's own placement. Never for colour. */
  className?: string;
  /**
   * The sentence to draw instead of the two below (Phase 71).
   *
   * There is a third case now, and only the caller can tell it apart: a machine
   * that has not answered ONCE since Tortie started. `answering` cannot carry
   * it, because a machine that answered and then stopped and a machine that was
   * never heard from both have `answering` false and they need different words.
   * The default stays exactly what Phase 70 shipped.
   */
  title?: string;
}): React.JSX.Element | null {
  if (machine === undefined) return null;
  const quiet = !machine.answering;
  const sentence =
    title ??
    (quiet ? badgeQuietTitle(machine.label) : badgeTitle(machine.label));
  return (
    <span
      className={['machine-badge', quiet ? 'quiet' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      data-machine-color={machine.color}
      title={sentence}
      aria-label={sentence}
    >
      {machine.label}
    </span>
  );
}
