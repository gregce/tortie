/**
 * Filesystem contract beyond the frozen base: the lazy tree reads, the
 * explorer's file operations, duplicate, and the HTML preview channels.
 * Moved verbatim from src/shared/ipc.ts (Phase 42 stage 2).
 */

// ---------------------------------------------------------------------------
// APPENDED by the file-tree stream (Phase 3) — new channels/types only,
// nothing above was modified. Both channels are OPTIONAL bridge extensions:
// the tree feature-detects each (`typeof window.gmux.fs.readDir ===
// 'function'`) and shows a friendly stub / hides the menu item when absent,
// so the app works against the frozen Phase-2 preload unchanged.
//
// INTEGRATOR wiring (no main handler exists yet — both are new):
//   'fs:readDir' → main: fs.promises.readdir(dirPath, { withFileTypes: true })
//                  mapped to FsDirEntry[] with kind =
//                    isDirectory() ? 'dir'
//                    : isSymbolicLink() ? 'symlink'
//                    : isFile() ? 'file' : 'other';
//                  return ALL entries unfiltered/unsorted (the renderer hides
//                  .git, keeps dotfiles, and sorts). Reject paths outside
//                  known project roots if you add validation. Errors throw
//                  GmuxErrorPayload code 'FS_FAILED' (message: "Could not
//                  read <basename>").
//   'fs:reveal'  → main: electron shell.showItemInFolder(path) (void).
// Preload: add to the `fs` object per the GmuxApi pattern:
//   readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', dirPath),
//   reveal:  (path)    => ipcRenderer.invoke('fs:reveal', path)
// ---------------------------------------------------------------------------

import type { ReadDirResult } from '../types';

/** New invoke channels appended by the file-tree stream. */
export interface TreeInvokeChannelMap {
  /** List one directory (lazy tree loading; renderer filters + sorts). */
  'fs:readDir': { req: [dirPath: string]; res: ReadDirResult };
  /** Reveal a file/folder in Finder (tree context menu). */
  'fs:reveal': { req: [path: string]; res: void };
}

/**
 * OPTIONAL extensions to GmuxApi['fs'], feature-detected by the tree
 * (`typeof window.gmux.fs.readDir === 'function'`).
 */
export interface GmuxFsExtras {
  /** List a directory for the file tree. */
  readDir?(dirPath: string): Promise<ReadDirResult>;
  /** Reveal a path in Finder. */
  reveal?(path: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 12.9 (file operations in the explorer) — new channels and
// types only. The one existing line touched above is the GmuxInvokeChannelMap
// intersection, exactly as that declaration's own comment prescribes.
//
// The request/response SHAPES live in src/shared/fs-ops.ts (a new file, so
// this contract stays append-only) together with `isProtectedFsPath` — the
// single `.git` rule the tree's canDrag guard and the main-process guard both
// call, so the two can never drift.
//
// Contract summary the builders need:
//   - Every input carries `root`, the absolute project root. Main refuses a
//     root that is not an OPEN PROJECT (PROJECT_NOT_FOUND), and refuses any
//     path that leaves it — '..', an absolute path outside, or an escape
//     through a directory symlink (INVALID_INPUT, message already friendly).
//   - `.git` is refused at any depth, as source and as destination.
//   - fs:trash is the ONLY deletion, and it is `shell.trashItem` — recoverable
//     from Finder. It reports per entry (`trashed` / `failed`) instead of
//     throwing, because a partial trash cannot be rolled back.
//   - fs:move detects every collision BEFORE moving anything and resolves
//     `{ status: 'would-overwrite', conflicts }`; the UI prompts and re-sends
//     with `overwrite: true`, which trashes each displaced entry before the
//     rename. fs:rename never overwrites at all (VS Code's rule).
//   - Real errno failures reject with GmuxErrorPayload code 'FS_FAILED',
//     `message` already written for a toast, and `detail` set to the bare
//     errno token (FsOpErrno) so the UI can branch without parsing prose.
//   - Moves/renames are plain fs.rename: git infers the rename.
//
// MAIN: registered in src/main/fs/ipc.ts (rules in fs/file-ops.ts + fs/paths.ts).
// PRELOAD: five methods appended to the existing `fs` object per the GmuxApi
// pattern — feature-detected by the tree (`typeof window.gmux.fs.trash ===
// 'function'`), so an older preload simply hides the mutation menu items.
// ---------------------------------------------------------------------------

import type {
  FsCreateInput,
  FsMoveInput,
  FsMoveResult,
  FsOpEntry,
  FsRenameInput,
  FsRenameResult,
  FsTrashInput,
  FsTrashResult
} from '../fs-ops';

/** New invoke channels appended by the file-operations stream (Phase 12.9). */
export interface FileOpsInvokeChannelMap {
  /** Create an empty file (parents created as needed); EEXIST is refused. */
  'fs:createFile': { req: [input: FsCreateInput]; res: FsOpEntry };
  /** Create a folder; an existing folder is refused rather than reused. */
  'fs:createFolder': { req: [input: FsCreateInput]; res: FsOpEntry };
  /** Rename in place. `name` is a basename; never overwrites. */
  'fs:rename': { req: [input: FsRenameInput]; res: FsRenameResult };
  /** Move entries into a folder; may resolve 'would-overwrite'. */
  'fs:move': { req: [input: FsMoveInput]; res: FsMoveResult };
  /** Send entries to the macOS Trash. Reports per entry. */
  'fs:trash': { req: [input: FsTrashInput]; res: FsTrashResult };
}

/**
 * OPTIONAL extensions to GmuxApi['fs'], feature-detected by the tree
 * (`typeof window.gmux.fs.trash === 'function'`).
 */
export interface GmuxFsOpsExtras {
  createFile?(input: FsCreateInput): Promise<FsOpEntry>;
  createFolder?(input: FsCreateInput): Promise<FsOpEntry>;
  rename?(input: FsRenameInput): Promise<FsRenameResult>;
  move?(input: FsMoveInput): Promise<FsMoveResult>;
  trash?(input: FsTrashInput): Promise<FsTrashResult>;
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 12.9 items 2-4 (the explorer's file management) — one new
// channel only. The foundations commit shipped create/rename/move/trash; the
// context menu's DUPLICATE verb is the one it has no primitive for, and a
// renderer-side read-then-write would corrupt every binary and could not copy
// a folder at all.
//
// fs:duplicate — recursive `fs.cp` beside the original, under a name main
//   picks by statting the directory (Finder's "notes copy.md", then "notes
//   copy 2.md"). It goes through the same `resolveInsideRoot` guard as every
//   other mutation, so `.git`, '..' and symlink escapes are refused
//   identically, and it never overwrites: the free name is found first.
//   MAIN: src/main/fs/ipc.ts → src/main/fs/file-ops.ts.
// ---------------------------------------------------------------------------

import type { FsDuplicateInput } from '../fs-ops';

/** New invoke channel appended by Phase 12.9's context menu. */
export interface FsDuplicateInvokeChannelMap {
  /** Copy an entry beside itself under the first free "copy" name. */
  'fs:duplicate': { req: [input: FsDuplicateInput]; res: FsOpEntry };
}

/**
 * OPTIONAL extension to GmuxApi['fs'], feature-detected by the tree
 * (`typeof window.gmux.fs.duplicate === 'function'` hides the menu item).
 */
export interface GmuxFsDuplicateExtras {
  duplicate?(input: FsDuplicateInput): Promise<FsOpEntry>;
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 20.5 (the HTML preview) — one new invoke channel and one
// optional preload extra. The one existing line touched above is the
// GmuxInvokeChannelMap intersection, exactly as that declaration's own comment
// prescribes.
//
// preview:url — mint the frame URL for one HTML document, and start that
//   document's request budget. It is a GET-shaped call with no side effect the
//   user can see, and it is the ONLY thing the renderer may ask about a
//   preview.
//
//   WHY THE RENDERER DOES NOT BUILD THE URL. Containment is decided by
//   resolving the real path of the request and the real path of the project
//   root and comparing them, and only main can do that. A prefix check over
//   joined paths was measured serving the real /etc/passwd through a symlink
//   named docs/notes.html. If this process could spell its own preview URL
//   there would be two opinions about which bytes belong to a project.
//
//   WHAT DOES NOT EXIST HERE, and its absence is the point. There is no
//   channel that a previewed DOCUMENT can reach. An earlier draft of this
//   phase rewrote external links to a sentinel URL so main could open them in
//   a browser, and a one pixel nested iframe fired that on load, with no
//   script and no click, carrying an address the page author chose. Nothing
//   inside the frame can call anything: the frame is `sandbox=""`, it has no
//   preload, and its own response policy is `default-src 'none'`. Every call
//   on this channel comes from Tortie's own renderer, about a tab the user
//   opened.
//   MAIN: src/main/preview/ipc.ts (rules in src/main/preview/protocol.ts).
//
// PRELOAD: a new top-level `preview` object, feature-detected by the viewer
// (`typeof window.gmux.preview?.url === 'function'`). Without it the HTML tab
// shows "Preview is not available" and the Source pane is unaffected.
// ---------------------------------------------------------------------------

// preview:stats — read back what the handler refused while serving the
//   document this renderer opened. Added in the Phase 20.5 fix round, and it
//   is a correctness fix rather than a feature. The line under the frame is
//   the reader's only explanation for a page that renders wrong, and before
//   this channel the renderer wrote that line from patterns over the source
//   text. Three cases were measured in the app where it read "Nothing in this
//   page was blocked" while the handler had refused 501 requests, 12
//   subresources, or the whole document.
//
//   It is read only. It takes a token and a generation and returns six
//   numbers. It opens nothing, reads no file and acts on no address. As with
//   `preview:url`, nothing inside a previewed DOCUMENT can reach it, because
//   that frame is `sandbox=""` with an opaque origin, has no preload and
//   carries `default-src 'none'`.
//   MAIN: src/main/preview/ipc.ts (rules in src/main/preview/protocol.ts).

import type {
  PreviewStats,
  PreviewStatsInput,
  PreviewUrlInput,
  PreviewUrlResult
} from '../preview-types';

/** The two channels the HTML preview needs. */
export interface PreviewInvokeChannelMap {
  /** Mint a `gmux-preview:` URL for one document, or say why not. */
  'preview:url': { req: [input: PreviewUrlInput]; res: PreviewUrlResult };
  /** What the handler refused for that document. Null once superseded. */
  'preview:stats': {
    req: [input: PreviewStatsInput];
    res: PreviewStats | null;
  };
}

/**
 * OPTIONAL top-level extra on window.gmux, feature-detected by the HTML
 * viewer. It is top-level rather than folded into `fs` on purpose: `fs` is the
 * text and file-management surface, and nothing about a preview is a file
 * operation.
 */
export interface GmuxPreviewExtras {
  preview?: {
    url(input: PreviewUrlInput): Promise<PreviewUrlResult>;
    stats(input: PreviewStatsInput): Promise<PreviewStats | null>;
  };
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 39 (Open With on every file row) — two new invoke channels
// and one optional preload extra. Append only, per the src/shared rule.
//
// fs:openWithApps — which apps macOS registers for this file. Only main can
//   answer it: the list comes from LaunchServices, read by spawning
//   /usr/bin/osascript, and a renderer spawns nothing. Main races the lookup
//   against a deadline and answers 'unavailable' when the deadline wins, so
//   the menu is never held open waiting on a busy machine. The renderer then
//   shows the degraded submenu, which is "Open in Default App" plus "Other…".
//
// fs:openWith — launch the file. Only main can spawn /usr/bin/open, and only
//   main can raise the system's application panel (NSOpenPanel, through
//   Electron's dialog.showOpenDialog). Nothing is ever loaded into a Tortie
//   process: the chosen app is started by LaunchServices as its own process.
//
// Both inputs carry `root`, the absolute project root, and go through the
// same resolveProjectRoot + resolveInsideRoot guards as fs:trash, so a root
// that is not an open project, a '..' escape, an absolute path outside the
// root, an escape through a directory symlink and '.git' at any depth are all
// refused before anything is spawned.
//
// MAIN: registered in src/main/fs/ipc.ts (rules in src/main/fs/open-with.ts).
// PRELOAD: two methods appended to the existing `fs` object, feature-detected
// by the tree (`typeof window.gmux.fs.openWithApps === 'function'`), so an
// older preload simply hides the Open With item.
// ---------------------------------------------------------------------------

/** One app macOS registers as able to open a file. */
export interface OpenWithApp {
  /** Absolute path of the .app bundle. */
  path: string;
  /** The name Finder shows, e.g. "Preview". */
  name: string;
  /** Bundle identifier, or null for a bundle that carries none. */
  bundleId: string | null;
}

/**
 * Which app a launch should use.
 *
 * 'app' is a row the user picked out of the submenu. 'default' is the
 * degraded item, which lets LaunchServices choose. 'choose' raises the
 * system's own application panel first, and the user picks there.
 */
export type OpenWithHandler =
  | { kind: 'app'; appPath: string }
  | { kind: 'default' }
  | { kind: 'choose' };

/**
 * The answer to fs:openWithApps.
 *
 * 'ready' is a lookup that finished. It may still carry no apps at all, which
 * is the honest answer for an extension nothing on this Mac claims.
 * 'unavailable' means the lookup did not finish inside the deadline, could
 * not be spawned, exited non zero, or returned output that did not parse.
 */
export type OpenWithApps =
  | {
      status: 'ready';
      /** The app macOS would use, or null when nothing claims the file. */
      defaultApp: OpenWithApp | null;
      /** Every other registered app, deduped and sorted by name. */
      apps: OpenWithApp[];
    }
  | { status: 'unavailable' };

export interface OpenWithAppsInput {
  /** Absolute path of the open project the file lives in. */
  root: string;
  /** The file, absolute or relative to the root. */
  path: string;
}

export interface OpenWithInput {
  root: string;
  path: string;
  /** Which app opens it. */
  app: OpenWithHandler;
}

/**
 * What a launch did. A failure REPORTS rather than throws, matching the
 * fs:trash precedent: an app that has been deleted since the menu was built
 * is an environmental fact, not a programming error. `message` is a complete
 * sentence, because the renderer may show it on its own.
 */
export type OpenWithOutcome =
  | { status: 'opened' }
  | { status: 'canceled' }
  | { status: 'failed'; message: string };

/** The two channels Open With needs. */
export interface OpenWithInvokeChannelMap {
  /** Which apps macOS registers for one file (cached per extension). */
  'fs:openWithApps': { req: [input: OpenWithAppsInput]; res: OpenWithApps };
  /** Open one file with one app, or raise the system's app panel first. */
  'fs:openWith': { req: [input: OpenWithInput]; res: OpenWithOutcome };
}

/**
 * OPTIONAL extensions to GmuxApi['fs'], feature-detected by the tree
 * (`typeof window.gmux.fs.openWithApps === 'function'` hides the menu item).
 */
export interface GmuxOpenWithExtras {
  openWithApps?(input: OpenWithAppsInput): Promise<OpenWithApps>;
  openWith?(input: OpenWithInput): Promise<OpenWithOutcome>;
}
