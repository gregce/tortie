/**
 * SEAM 4 — opening the `context:<id>` detail tab (§7.1).
 *
 * NAMED `open-detail`, NOT `detail`, and the name is load bearing: the detail
 * SURFACE is a directory in this module (`./surface`, and the install flow
 * imports it as `../detail`). A `detail.ts` file beside a `detail/` directory
 * resolves to the file under every bundler in this tree, which is a silent
 * wrong-module import rather than an error. This file requests the tab; that
 * directory draws it.
 *
 * The detail surface is a third tab kind in the editor panel alongside the two
 * diff kinds S5C already defines, so the tab model is being populated rather
 * than extended. That panel is not this builder's file, so the request crosses
 * as a renderer-internal event, exactly the way `state/open-file.ts` already
 * carries open-file and open-diff requests between streams that do not import
 * each other.
 *
 * THE FALLBACK IS THE POINT. `state/open-file.ts` can afford to drop a request
 * when no editor is mounted, because a row click has no other meaning there. A
 * context row click does: the user wants to see the thing. So while no detail
 * host is registered, a click opens the file that DEFINES the entry, which is
 * the honest 90% of the detail tab and needs nothing new. When the host lands
 * it registers, `hasDetailHost()` flips, and the fallback stops firing without
 * anything in this directory changing.
 */

import { requestOpenFile } from '../state/open-file';
import type { ContextEntry } from './model';

export const OPEN_CONTEXT_EVENT = 'gmux:open-context';

export interface OpenContextRequest {
  /** The entry to render. `context:<id>` is the tab key. */
  entry: ContextEntry;
  /** The project the view was showing when the row was clicked. */
  repoPath: string;
  /** Preview tab semantics — a single click previews, ⌘-click keeps. */
  preview: boolean;
}

let hosts = 0;

/** True once a detail host has subscribed. */
export function hasDetailHost(): boolean {
  return hosts > 0;
}

/** Subscribe a detail host. Returns the unsubscribe. */
export function onOpenContext(
  cb: (req: OpenContextRequest) => void
): () => void {
  const handler = (e: Event): void => {
    cb((e as CustomEvent<OpenContextRequest>).detail);
  };
  hosts += 1;
  window.addEventListener(OPEN_CONTEXT_EVENT, handler);
  return () => {
    hosts -= 1;
    window.removeEventListener(OPEN_CONTEXT_EVENT, handler);
  };
}

/** Open an entry's detail tab, or its source file while no host exists. */
export function requestOpenContext(req: OpenContextRequest): void {
  if (hosts > 0) {
    window.dispatchEvent(
      new CustomEvent<OpenContextRequest>(OPEN_CONTEXT_EVENT, { detail: req })
    );
    return;
  }
  openSourceFile(req.entry, req.repoPath, req.preview);
}

/**
 * Open one absolute path in the editor, landing on `line` when there is one.
 *
 * Most context files live OUTSIDE the project — `~/.claude/skills/…` is the
 * common case here, not the edge one — so `relPath` is only relative when it
 * actually is. That is the same rule the markdown preview applies to a link
 * that escapes its document's root, and it is stated once, here.
 */
export function openFileAt(
  path: string,
  repoPath: string,
  opts: { preview?: boolean; line?: number; contextEntry?: unknown } = {}
): void {
  requestOpenFile({
    repoPath,
    relPath: path.startsWith(`${repoPath}/`)
      ? path.slice(repoPath.length + 1)
      : path,
    path,
    mode: 'file',
    source: 'tree',
    preview: opts.preview ?? true,
    // Set by the detail host and by nothing else. Present turns the tab into
    // the `context:<id>` detail tab, which wears the header card over the same
    // body; absent opens the plain file. Threaded through this ONE function so
    // the relative-path rule above is written once for this directory.
    ...(opts.contextEntry !== undefined ? { contextEntry: opts.contextEntry } : {}),
    ...(opts.line !== undefined ? { selection: { line: opts.line } } : {})
  });
}

/** Open the file that defines an entry, at its problem line where there is one. */
export function openSourceFile(
  entry: ContextEntry,
  repoPath: string,
  preview = true
): void {
  openFileAt(entry.sourcePath, repoPath, {
    preview,
    // The parse error's own line, when the reader found one. Clicking a broken
    // row should land on the bad line, not on line 1 of a file the user then
    // has to search (§11 item 4).
    ...(entry.problem?.line != null ? { line: entry.problem.line } : {})
  });
}
