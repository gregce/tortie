/**
 * Open one file OF ONE COMMIT in the editor, as a diff of that commit's
 * parent against that commit (Phase 12 item 4). Extracted from
 * HistorySection.tsx in Phase 198 so the File history section opens a row
 * through exactly the request a file row in an expanded commit sends: the
 * SHA decides which two blobs get diffed, the old path makes a rename
 * boundary read old against new, and `preview` is the single click against
 * the double click.
 *
 * PHASE 233 ADDED THE MACHINE, and it is ONE composer with two doors rather
 * than two composers. A commit's file on another machine is the same request
 * with `remote` on it: `commit` still says which two blobs, and `remote` says
 * which computer holds them, so the editor asks that machine's object
 * database rather than this Mac's git. Composing it here rather than in
 * ../scm/RemoteHistorySection.tsx is what stops the two rows drifting into
 * two request shapes, which is the defect this module was extracted for.
 */

import type { GitCommitFileChange, GitLogEntry } from '@shared/types';
import type { OpenFileRequest } from './open-file';
import { requestOpenFile } from './open-file';
import { shortSha } from './format';

/** The three fields of a commit's file change an open needs. */
export type CommitFileRef = Pick<GitCommitFileChange, 'path' | 'origPath' | 'status'>;

/** The two fields of a commit an open needs, whichever walk drew the row. */
export type CommitOpenRef = Pick<GitLogEntry, 'hash' | 'subject'>;

/** The request both doors send, before the machine is put on it. */
function commitFileRequest(
  repoPath: string,
  file: CommitFileRef,
  entry: CommitOpenRef,
  preview: boolean
): OpenFileRequest {
  return {
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
  };
}

export function requestCommitFileOpen(
  repoPath: string,
  file: CommitFileRef,
  entry: CommitOpenRef,
  preview = true
): void {
  requestOpenFile(commitFileRequest(repoPath, file, entry, preview));
}

/**
 * PHASE 233. The same open for a commit in a folder on ANOTHER MACHINE.
 *
 * `repoPath` is the folder over there, which is where the far side runs `git
 * show`, and every path the walk printed is relative to the repository root,
 * which is how `git show <sha>:<path>` reads it. The pre-rename path goes on
 * BOTH halves: `commit.origPath` is what the diff header says, and
 * `remote.origPath` is what the tab's own `origRelPath` is taken from, which
 * is the path the parent's side is read at.
 */
export function requestRemoteCommitFileOpen(
  machineId: string,
  machineLabel: string,
  repoPath: string,
  file: CommitFileRef,
  entry: CommitOpenRef,
  preview = true
): void {
  requestOpenFile({
    ...commitFileRequest(repoPath, file, entry, preview),
    remote: {
      machineId,
      machineLabel,
      repoPath,
      ...(file.origPath !== undefined ? { origPath: file.origPath } : {})
    }
  });
}
