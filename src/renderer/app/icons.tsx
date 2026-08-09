/**
 * gmux icon set — one 16px stroke family (Lucide outlines, 1.5px stroke),
 * `--text-secondary` at rest via currentColor. No emoji, no mixed sets
 * (DESIGN.md §3). Agent icons are neutral strokes, not vendor logos.
 */

import React from 'react';

export interface IconProps {
  size?: number;
  className?: string;
}

function makeIcon(
  children: React.ReactNode
): React.FC<IconProps> {
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

export const PlusIcon = makeIcon(
  <>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </>
);

export const XIcon = makeIcon(
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>
);

export const BellIcon = makeIcon(
  <>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </>
);

export const ChevronDownIcon = makeIcon(<path d="m6 9 6 6 6-6" />);

export const ChevronRightIcon = makeIcon(<path d="m9 18 6-6-6-6" />);

export const MoreIcon = makeIcon(
  <>
    <circle cx="5" cy="12" r="0.75" fill="currentColor" />
    <circle cx="12" cy="12" r="0.75" fill="currentColor" />
    <circle cx="19" cy="12" r="0.75" fill="currentColor" />
  </>
);

export const GitBranchIcon = makeIcon(
  <>
    <path d="M6 3v12" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </>
);

export const CopyIcon = makeIcon(
  <>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </>
);

/** Shell agent: terminal prompt. */
export const TerminalIcon = makeIcon(
  <>
    <path d="m4 17 6-6-6-6" />
    <path d="M12 19h8" />
  </>
);

/** Claude Code agent: spark. */
export const SparkIcon = makeIcon(
  <path d="M12 3l1.9 5.1a2 2 0 0 0 1.2 1.2L20.2 11l-5.1 1.9a2 2 0 0 0-1.2 1.2L12 19.2l-1.9-5.1a2 2 0 0 0-1.2-1.2L3.8 11l5.1-1.9a2 2 0 0 0 1.2-1.2z" />
);

/** Codex agent: code chevrons. */
export const CodeIcon = makeIcon(
  <>
    <path d="m18 16 4-4-4-4" />
    <path d="m6 8-4 4 4 4" />
    <path d="m14.5 4-5 16" />
  </>
);

/** Restore / restart. */
export const RotateCcwIcon = makeIcon(
  <>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </>
);

/** Toast icons. */
export const CircleCheckIcon = makeIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 12 2 2 4-4" />
  </>
);

export const CircleAlertIcon = makeIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </>
);

export const InfoIcon = makeIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </>
);
