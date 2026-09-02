/**
 * Open one file OF ONE COMMIT in the editor, as a diff of that commit's
 * parent against that commit (Phase 12 item 4). Extracted from
 * HistorySection.tsx in Phase 198 so the File history section opens a row
 * through exactly the request a file row in an expanded commit sends: the
 * SHA decides which two blobs get diffed, the old path makes a rename
 * boundary read old against new, and `preview` is the single click against
 * the double click.
 */

import type { GitCommitFileChange, GitLogEntry } from '@shared/types';
import { requestOpenFile } from './open-file';
import { shortSha } from './format';

/** The three fields of a commit's file change an open needs. */
export type CommitFileRef = Pick<GitCommitFileChange, 'path' | 'origPath' | 'status'>;

export function requestCommitFileOpen(
  repoPath: string,
  file: CommitFileRef,
  entry: GitLogEntry,
  preview = true
): void {
  requestOpenFile({
    repoPath,
    relPath: file.path,
    path: `${repoPath}/${file.path}`,
    mode: 'diff',
    source: 'history',
    preview,
    commit: {
      sha: entry.hash,
      shortSha: shortSha(entry.hash),
      status: file.status,
      ...(file.origPath !== undefined ? { origPath: file.origPath } : {}),
      subject: entry.subject
    }
  });
}
