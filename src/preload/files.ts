/**
 * The filesystem half of the bridge: text and image reads, the tree's lazy
 * directory reads, the explorer's file operations, and the HTML preview's
 * two calls. Moved verbatim from the single preload file (Phase 42 stage 2).
 */

import type { GmuxPreviewExtras, InstalledFsApi } from '../shared/ipc';
import { invoke } from './bridge';

/**
 * fs surface = frozen GmuxApi['fs'] + the appended optional tree extensions
 * (fs:readDir / fs:reveal), feature-detected by the file tree, plus the
 * Phase 12.9 file operations (create/rename/move/trash), feature-detected the
 * same way (`typeof window.gmux.fs.trash === 'function'`), plus the Phase
 * 12.10 image read — a separate channel from readFile precisely because that
 * one is UTF-8-only and refuses binary content.
 */
export const fs: InstalledFsApi = {
  readFile: (path) => invoke('fs:readFile', path),
  writeFile: (path, contents) => invoke('fs:writeFile', path, contents),
  readDir: (dirPath) => invoke('fs:readDir', dirPath),
  reveal: (path) => invoke('fs:reveal', path),
  createFile: (input) => invoke('fs:createFile', input),
  createFolder: (input) => invoke('fs:createFolder', input),
  rename: (input) => invoke('fs:rename', input),
  duplicate: (input) => invoke('fs:duplicate', input),
  move: (input) => invoke('fs:move', input),
  trash: (input) => invoke('fs:trash', input),
  readImage: (input) => invoke('fs:readImage', input),
  // Phase 39 Open With. `openWithApps` only reads a list, and `openWith`
  // starts a process that is NOT a child of Tortie: main spawns
  // /usr/bin/open, which hands the request to LaunchServices and exits.
  openWithApps: (input) => invoke('fs:openWithApps', input),
  openWith: (input) => invoke('fs:openWith', input)
};

/**
 * preview surface (Phase 20.5) — the HTML tab's Preview mode.
 *
 * TWO calls, and the size of this object is the security property. Main mints
 * the frame URL because only main can resolve the real path of a request and
 * the real path of a project root and compare them. `stats` reads back the
 * counts main kept while serving that document, because the line under the
 * frame is the reader's only explanation for a page that renders wrong, and
 * the renderer cannot see a refusal main made. Nothing here reads a file,
 * nothing here opens anything, and neither call takes an address.
 *
 * There is no channel a previewed DOCUMENT can reach. This preload is not
 * loaded into the preview frame at all: that frame is `sandbox=""` with an
 * opaque origin, so it has no `window.gmux` and no parent access. Every call
 * on this object comes from Tortie's own renderer, about a tab the user
 * opened.
 */
export const preview: GmuxPreviewExtras['preview'] = {
  url: (input) => invoke('preview:url', input),
  stats: (input) => invoke('preview:stats', input)
};
