/**
 * Projects contract beyond the frozen base: create (with the image read
 * that shipped in the same block), clone, recents, and the File-menu ids
 * they added. Moved verbatim from src/shared/ipc.ts (Phase 42 stage 2).
 */

import type { Unsubscribe } from './base';
import type { Project } from '../types';

// ---------------------------------------------------------------------------
// APPENDED by Phase 12.10 item 1 (image preview) and Phase 12.9 item 1 (new
// projects) — new channels and types only. The one existing line touched is
// the GmuxInvokeChannelMap intersection, exactly as that declaration's own
// comment prescribes.
//
// fs:readImage — the image path, deliberately separate from fs:readFile.
//   That channel is UTF-8-only and refuses binary content, which is why an
//   image tab used to read "gmux edits text files only"; nothing about an
//   image ever goes through it again. The full rationale (including why the
//   working copy comes back as a `gmux-asset:` URL while the HEAD side comes
//   back as a data URL) lives in src/shared/image-types.ts, together with the
//   extension allowlist that the viewer, this channel and the asset protocol
//   all share.
//   MAIN: src/main/fs/image-ipc.ts (rules in src/main/fs/image.ts).
//
// projects:create — make a NEW project folder, optionally `git init` it, and
//   add it as a project, as one main-side operation. It cannot be assembled
//   from the Phase 12.9 fs:* channels: those all prove their target is inside
//   an ALREADY-OPEN project root, and a folder that does not exist yet is by
//   definition outside every one of them.
//   MAIN: src/main/projects/index.ts (rules in src/main/projects/create.ts).
//
// PRELOAD: `readImage` joins the existing `fs` object, `create` the existing
// `projects` object — both feature-detected by their callers, so an older
// preload degrades to "no image viewer" / "no New Project…" instead of
// throwing.
// ---------------------------------------------------------------------------

import type { ImageReadInput, ImageReadResult } from '../image-types';

/** How a new project folder should be created (projects:create). */
export interface CreateProjectInput {
  /** Absolute path of the EXISTING parent directory. */
  parentDir: string;
  /** Name of the folder to create inside it (one path segment). */
  name: string;
  /** Run `git init` in the new folder. The dialog defaults this on. */
  gitInit: boolean;
}

/** What `projects:create` made. */
export interface CreateProjectResult {
  project: Project;
  /** Absolute path of the created folder. */
  path: string;
  /**
   * Whether the folder ended up a git repository. False when `gitInit` was
   * off, and false (with `gitError` set) when git itself failed — the
   * project is still created and opened, because a folder without a repo is
   * a perfectly good project (DESIGN.md §6.3).
   */
  isRepo: boolean;
  /** Why `git init` did not run, when it was asked for and failed. */
  gitError?: string;
}

/** New invoke channels appended by the image + new-project stream. */
export interface ImageProjectInvokeChannelMap {
  /** One image, by revision, capped — never the text path. */
  'fs:readImage': { req: [input: ImageReadInput]; res: ImageReadResult };
  /** Create a project folder (optionally a repo) and open it as a tab. */
  'projects:create': {
    req: [input: CreateProjectInput];
    res: CreateProjectResult;
  };
}

/**
 * OPTIONAL extension to GmuxApi['fs'], feature-detected by the editor
 * (`typeof window.gmux.fs.readImage === 'function'`).
 */
export interface GmuxImageExtras {
  /** Read one image for the viewer (worktree or HEAD). */
  readImage?(input: ImageReadInput): Promise<ImageReadResult>;
}

/**
 * OPTIONAL extension to GmuxApi['projects'], feature-detected by the shell
 * (`typeof window.gmux.projects.create === 'function'` hides New Project…).
 */
export interface GmuxProjectCreateExtras {
  create?(input: CreateProjectInput): Promise<CreateProjectResult>;
}

/**
 * The native File menu gained "New Project…" (⇧⌘N). Appended as its own id
 * union rather than edited into MenuActionId, so nothing above changes.
 */
export type ProjectMenuActionId = 'new-project';

// ---------------------------------------------------------------------------
// APPENDED by Phase 18.6. Cloning a repository from the home screen.
//
// Shaped like search:* above and for the same reason. A clone runs for 0.6 s
// on a five object repository and 101 s on microsoft/TypeScript, so the only
// honest contract is a streaming one. `projects:clone` resolves as soon as
// the clone has an id, frames arrive on cloneProgressChannel(cloneId), and
// the last frame carries either the created Project or the failure.
//
// SUBSCRIBE FIRST, same rule as search:start.
//
// The channels are named projects:* and not git:* or clone:*. The operation
// ends in a project tab, which is the projects:* family, and git:* is per
// repository and normalises an existing repository path, which a clone by
// definition does not have. The one existing line touched above is the
// GmuxInvokeChannelMap intersection, exactly as its own comment prescribes.
// ---------------------------------------------------------------------------

/** What the preflight learned about a pasted string, before anything is created. */
export interface ClonePreflight {
  /** The https URL Tortie will actually clone. Never carries a password. */
  url: string;
  /** Host, for the copy in error messages, e.g. "github.com". */
  host: string;
  owner?: string;
  repo?: string;
  /** Suggested folder name, which is the last path segment without `.git`. */
  suggestedName: string;
  /** From `git ls-remote --symref`, e.g. "main". Absent when the server did not say. */
  defaultBranch?: string;
  /** Set when the input was rewritten to https from an scp or ssh form. */
  rewrittenFromSsh?: boolean;
  /** Set when a user:password was removed from the pasted URL. */
  strippedCredential?: boolean;
}

export interface ClonePreflightInput {
  /** Exactly what the user pasted or typed. */
  raw: string;
}

export interface CloneStartInput {
  /** Mint this in the renderer and subscribe before calling clone. */
  cloneId: string;
  /** The url from ClonePreflight, not the raw paste. */
  url: string;
  /** Absolute path of the EXISTING parent directory, from the native picker. */
  parentDir: string;
  /** Folder name to create inside it, one path segment. */
  name: string;
}

/** The named steps of a clone, in the order git performs them. Any may be skipped. */
export type ClonePhase =
  | 'starting' // spawned, nothing parsed yet
  | 'enumerating' // remote: Enumerating objects: N, done.
  | 'counting' // remote: Counting objects: P% (n/t)
  | 'compressing' // remote: Compressing objects: P% (n/t)
  | 'receiving' // Receiving objects: P% (n/t), X MiB | Y MiB/s
  | 'resolving' // Resolving deltas: P% (n/t)
  | 'checkingOut'; // Updating files: P% (n/t)

/**
 * One progress frame. `percent` is HONEST ONLY WITHIN `phase`. There is no
 * overall percentage and the renderer must not synthesize one (research 35
 * §3.10): git prints a percentage per phase and never an overall one, so a
 * single monotonic bar is a number nothing produced. The bar shows this
 * phase's own number and resets when `phase` changes.
 */
export interface CloneProgress {
  cloneId: string;
  phase: ClonePhase;
  /** 0 to 100 within this phase. Absent for 'starting' and 'enumerating'. */
  percent?: number;
  done?: number;
  total?: number;
  /** Receiving only, e.g. "18.25 MiB". Straight from git, in git's own unit. */
  bytes?: string;
}

/**
 * The last frame on the stream. Exactly one of `project` or `error` is set.
 *
 * DISCRIMINATE WITH `frame.done === true`, never with `'done' in frame`. A
 * progress frame carries a `done` COUNT of objects, so the key is present on
 * both members of the union and only the value tells them apart. This was
 * got wrong once already, in the driver written to verify it.
 */
export interface CloneDone {
  cloneId: string;
  done: true;
  /** True when the user cancelled. Not an error state. */
  cancelled?: boolean;
  /**
   * Cancel only. What main actually did on disk, because the renderer must
   * not assert a cleanup it did not perform (research 35 §3.11). Absent when
   * the temporary directory was removed; set to the path that is still there
   * when the removal failed.
   */
  leftoverPath?: string;
  /** Present on success. Already added to the manifest, ready to open. */
  project?: Project;
  /** Absolute path of the cloned folder, on success. */
  path?: string;
  /** Branch git checked out, for the line under the address. */
  defaultBranch?: string | null;
  /**
   * Present on failure. `kind` picks the copy and `detail` is git's own
   * text, which belongs behind `Show details` rather than in the user's
   * face. `message` may contain a newline: the unauthenticated case adds a
   * second line about `gh`, and the unknown case prints git's own last line
   * under a generic heading rather than inventing a diagnosis. Render each
   * line as its own line.
   */
  error?: {
    kind: CloneFailureKind;
    message: string;
    detail?: string;
  };
}

/**
 * Which failure happened, so the renderer picks copy rather than parsing
 * text. Main classifies by matching stable substrings of git's stderr
 * (research 35 §3.12). Anything unmatched becomes 'unknown', and the message
 * then carries git's own last line rather than a guess.
 */
export type CloneFailureKind =
  | 'badUrl'
  | 'network' // Could not resolve host
  | 'unreachable' // Failed to connect
  | 'notFound' // Repository not found, or private; the host will not say which
  | 'unauthenticated' // could not read Username
  | 'authRejected' // Authentication failed
  | 'destinationExists'
  | 'permission'
  | 'diskFull'
  | 'interrupted' // early EOF, invalid index-pack output, or our stall timeout
  | 'gitMissing'
  | 'unknown';

export interface CloneInvokeChannelMap {
  /**
   * Normalise a pasted string and ask the server about it, which takes about
   * 0.23 s. NEVER call this when the dialog opens: the Repository field is
   * prefilled from the clipboard, and a preflight on open would send a
   * request, with whatever credential the keychain offers for that host, to
   * whatever address happened to be on the clipboard (research 35 §3.5).
   */
  'projects:clonePreflight': {
    req: [input: ClonePreflightInput];
    res: ClonePreflight;
  };
  /** Spawn git. Frames arrive on cloneProgressChannel(cloneId). */
  'projects:clone': { req: [input: CloneStartInput]; res: { cloneId: string } };
  /** SIGTERM the child and close the stream with cancelled:true. */
  'projects:cancelClone': { req: [cloneId: string]; res: void };
}

/** Per clone stream, following searchResultsChannel(searchId). */
export const cloneProgressChannel = (cloneId: string): string =>
  `projects:cloneProgress:${cloneId}`;

/**
 * OPTIONAL surface on window.gmux.projects, feature detected by the home
 * screen (`typeof window.gmux.projects.clone === 'function'`) so an older
 * preload hides the Clone row instead of throwing. Same pattern as the
 * create extras.
 */
export interface GmuxProjectCloneExtras {
  clonePreflight?(input: ClonePreflightInput): Promise<ClonePreflight>;
  clone?(input: CloneStartInput): Promise<{ cloneId: string }>;
  cancelClone?(cloneId: string): Promise<void>;
  /** Subscribe BEFORE calling clone(), with an id you minted. */
  onCloneProgress?(
    cloneId: string,
    cb: (p: CloneProgress | CloneDone) => void
  ): Unsubscribe;
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 18.6. The recent projects list on the home screen.
//
// Three calls and one event. Nothing here is polled and nothing rises on its
// own. The two existing lines touched above are the GmuxInvokeChannelMap
// intersection and the AllEventPayloadMap intersection, exactly as their own
// comments prescribe.
//
// WHERE THE DATA LIVES. A plain JSON file at <userData>/recents.json, owned by
// src/main/recents/store.ts. It is NOT in the manifest. The manifest holds
// session restore state, which is the product's promise, and a recents list is
// disposable convenience data that costs nothing to lose. Research 35 section
// 4.2 carries the whole argument, including the fact that the first reason
// given for rejecting localStorage was wrong. The real reason is that main
// builds the native File > Open Recent menu and main cannot read localStorage.
//
//   recents:list     the rows, newest first, at most 20. One small JSON read,
//                    already in memory after the first one.
//   recents:missing  the paths whose folder has been moved or deleted. The
//                    home screen calls this AFTER its first paint and never
//                    before it, so the screen never waits on the filesystem
//                    (research 35 section 1.9).
//   recents:remove   Remove from Recent, on one row. Resolves with the list
//                    that is left, so the caller needs no second round trip.
//   recents:changed  main wrote the file. Sent so a home screen that is
//                    already open stays honest when a project is opened or
//                    closed, or when the native menu's Clear Menu is used.
//
// PRELOAD (guardrail 1, folded into the one typed bridge, no new wrapper
// generation):
//
//   const recents: NonNullable<GmuxRecentsExtras['recents']> = {
//     list: () => invoke('recents:list'),
//     missing: () => invoke('recents:missing'),
//     remove: (path) => invoke('recents:remove', path),
//     onChanged: (cb) => on(EVT_RECENTS_CHANGED, cb)
//   };
//
// then add `recents,` to the api object and `GmuxRecentsExtras` to its type
// intersection. The renderer feature-detects
// `typeof window.gmux.recents?.list === 'function'` and draws no recents block
// at all without it, which is exactly the screen a first launch shows.
// ---------------------------------------------------------------------------

/** One remembered project. Newest first wherever a list of these appears. */
export interface RecentProject {
  /** Absolute path of the project folder. */
  path: string;
  /** What the project is called. The manifest's name, which a rename edits. */
  name: string;
  /** Epoch milliseconds of the last open or close. */
  lastOpenedAt: number;
}

/** New invoke channels appended by the recent projects stream. */
export interface RecentsInvokeChannelMap {
  /** Every remembered project, newest first, at most 20. */
  'recents:list': { req: []; res: RecentProject[] };
  /**
   * The paths whose folder is gone or is no longer a directory. One stat per
   * row. Called after the first paint, so a slow disk cannot delay the screen.
   */
  'recents:missing': { req: []; res: string[] };
  /** Forget one row. Resolves with the list that is left. */
  'recents:remove': { req: [path: string]; res: RecentProject[] };
}

/** Main to renderers: the recents file changed. Payload is the whole list. */
export const EVT_RECENTS_CHANGED = 'recents:changed' as const;

export interface RecentsEventPayloadMap {
  'recents:changed': [recents: RecentProject[]];
}

/**
 * OPTIONAL top-level extra on window.gmux, feature-detected by the renderer
 * (`typeof window.gmux.recents?.list === 'function'`). Without it the home
 * screen simply has no recents block, which is a state the screen already has
 * and already looks right in.
 */
export interface GmuxRecentsExtras {
  recents?: {
    list(): Promise<RecentProject[]>;
    missing(): Promise<string[]>;
    remove(path: string): Promise<RecentProject[]>;
    onChanged(cb: (recents: RecentProject[]) => void): Unsubscribe;
  };
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 18.6 (the home screen) — two new menu action ids and
// nothing else. The one existing line touched above is the
// AnyMenuActionWithProjects alias, exactly the one-line fold ProjectMenuActionId
// and FindMenuActionId already document.
//
// Both are File-menu ids, and both exist because the File menu is built in
// MAIN from ids while the thing they do lives in the RENDERER: the clone
// dialog is a React modal, and opening a project is one store call that
// already handles the manifest row, the tab and the focus.
// ---------------------------------------------------------------------------

/**
 * File > Clone Repository…, the third project verb. No accelerator: every
 * built-in chord is one the user can no longer record as a per-agent hotkey,
 * and that is a bad trade for a weekly action (research 35 §0).
 */
export type CloneMenuActionId = 'clone-repository';

/**
 * File > Open Recent > a row. A TEMPLATE family, handled by prefix before the
 * dispatcher's switch ever sees it, the way `launch-agent:*` and
 * `focus-session:*` already are — a path cannot be a member of a union.
 *
 * The path is absolute and is passed through verbatim. A row whose folder has
 * gone is still listed (statting ten paths on every menu rebuild would put the
 * filesystem in the way of opening a menu), so the open can fail, and it fails
 * with the same "That folder does not exist." every other route to a missing
 * folder produces.
 */
export type OpenRecentActionId = `open-recent:${string}`;

/** The prefix above, so main and the renderer split the id the same way. */
export const OPEN_RECENT_PREFIX = 'open-recent:' as const;

// ---------------------------------------------------------------------------
// APPENDED by Phase 74 (GitHub issue 6). One folder picker channel that takes
// an argument.
//
// WHY A NEW CHANNEL. `projects:pickDirectory` is declared in the FROZEN
// src/shared/ipc/base.ts, whose header says existing declarations must not be
// changed and new ones may be appended. It takes no argument, so its native
// panel says the same sentence to every caller. New Project is asking a
// different question from Open Project. It needs the folder that the new
// project folder is created INSIDE. The question is therefore the argument,
// and the frozen channel keeps its behaviour and every one of its callers.
//
// THE RENDERER SENDS THE QUESTION, NEVER THE SENTENCE. Main owns the copy of
// every native surface, so a renderer cannot put its own words into a native
// panel, and one file decides what the panel says.
//
// MAIN: src/main/ipc.ts, copy in src/main/projects/picker.ts.
// PRELOAD: `pickDirectoryFor` joins the existing `projects` object. The New
// Project dialog feature detects it and falls back to `pickDirectory()`.
//
// The one existing line touched is the GmuxInvokeChannelMap intersection in
// ./index.ts, plus the InstalledProjectsApi intersection beside it, exactly
// as those declarations' own comments prescribe.
// ---------------------------------------------------------------------------

/** Which question the native folder panel is asking. */
export type DirectoryPickPurpose =
  /** The folder to open as a project. */
  | 'project'
  /** The folder that a NEW project folder is created inside. */
  | 'new-project-parent';

/** The invoke channel appended by Phase 74. */
export interface ProjectPickerInvokeChannelMap {
  /** Native directory picker, worded for the question. Null when the person cancels. */
  'projects:pickDirectoryFor': {
    req: [purpose: DirectoryPickPurpose];
    res: string | null;
  };
}

/**
 * OPTIONAL extension to GmuxApi['projects'], feature detected by the New
 * Project dialog. Without it the dialog opens the frozen picker rather than
 * hiding its button.
 */
export interface GmuxProjectPickerExtras {
  pickDirectoryFor?(purpose: DirectoryPickPurpose): Promise<string | null>;
}
