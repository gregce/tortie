/**
 * Diff-parse worker — runs @pierre/diffs' `parseDiffFromFile` off the main
 * thread (Phase 12.0).
 *
 * WHY A WORKER: parseDiffFromFile is jsdiff's Myers algorithm, O((N+M)·D) in
 * the edit distance. A 10k-line file whose every line changed measures 7.1 s;
 * 20k lines measures 33 s (docs/BACKLOG.md item 0 — the ~23 s hang the user
 * hit daily). Nothing in the library can bound that cost — its own large
 * content levers (worker pool, tokenizeMaxLength, render windows) all act on
 * highlighting, downstream of the parse. So the parse moves here, where a
 * slow diff costs a background core instead of the window, and the host can
 * paint an approximate comparison in the meantime (see diff-metadata.ts).
 *
 * One request per worker: the host spawns, posts, reads one reply and
 * terminates. That makes cancellation (tab closed, contents changed
 * mid-parse) a hard guarantee rather than a cooperative one.
 */

import { parseDiffFromFile } from '@pierre/diffs';
import type { FileContents, FileDiffMetadata } from '@pierre/diffs';

export interface DiffParseRequest {
  oldFile: FileContents;
  newFile: FileContents;
}

export type DiffParseResponse =
  | { ok: true; meta: FileDiffMetadata }
  | { ok: false; error: string };

/** DedicatedWorkerGlobalScope is absent from the DOM lib this project uses. */
const scope = self as unknown as {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<DiffParseRequest>) => void
  ): void;
  postMessage(message: DiffParseResponse): void;
};

scope.addEventListener('message', (event) => {
  const { oldFile, newFile } = event.data;
  try {
    scope.postMessage({ ok: true, meta: parseDiffFromFile(oldFile, newFile) });
  } catch (err) {
    scope.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : String(err)
    });
  }
});
