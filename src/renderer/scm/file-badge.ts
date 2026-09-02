/**
 * The one letter a changed file wears in the SCM pane's history rows, with
 * its class and the word the accessible name uses. Extracted from
 * HistorySection.tsx in Phase 198 so the File history section draws the same
 * letter for the same status.
 */

import type { GitCommitFileState } from '@shared/types';

export function fileBadge(status: GitCommitFileState): {
  letter: string;
  cls: string;
  word: string;
} {
  switch (status) {
    case 'A':
      return { letter: 'A', cls: 'scm-badge-added', word: 'added' };
    case 'D':
      return { letter: 'D', cls: 'scm-badge-deleted', word: 'deleted' };
    case 'R':
      return { letter: 'R', cls: 'scm-badge-renamed', word: 'renamed' };
    case 'C':
      return { letter: 'C', cls: 'scm-badge-renamed', word: 'copied' };
    case 'U':
      return { letter: '!', cls: 'scm-badge-conflict', word: 'conflicted' };
    case 'M':
    case 'T':
    case 'X':
    default:
      return { letter: 'M', cls: 'scm-badge-modified', word: 'modified' };
  }
}
