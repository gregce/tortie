/**
 * SCM-stream icons — same single 16px Lucide-outline family as
 * src/renderer/app/icons.tsx (1.5px stroke, currentColor). Only icons the
 * shell set doesn't have live here; shared ones are imported from the shell.
 */

import React from 'react';

export interface IconProps {
  size?: number;
  className?: string;
}

function makeIcon(children: React.ReactNode): React.FC<IconProps> {
  const Icon: React.FC<IconProps> = ({ size = 16, className }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...(className !== undefined ? { className } : {})}
    >
      {children}
    </svg>
  );
  return Icon;
}

/** Unstage (−). */
export const MinusIcon = makeIcon(<path d="M5 12h14" />);

/** Discard (↩ undo arrow). */
export const UndoIcon = makeIcon(
  <>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11" />
  </>
);

/** Branch-header refresh. */
export const RefreshIcon = makeIcon(
  <>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M3 21v-5h5" />
  </>
);

/** History section. */
export const HistoryIcon = makeIcon(
  <>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </>
);
