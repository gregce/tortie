/**
 * The tab vocabulary: `EditorMode` and `EditorTab` (Phase 42 stage 8,
 * re-homed out of ./store.ts).
 *
 * ./store.ts is the state machine over the tab list and ./tab-io.ts is the
 * IO that state machine schedules. tab-io needs the `EditorTab` shape, and
 * while the shape lived in store.ts the two files imported each other. The
 * types are pure vocabulary with no behavior, so they are a leaf both can
 * share. The public surface is unchanged: ./store.ts re-exports both, and
 * every existing import site still works.
 */

import type { ImageReadResult } from '@shared/image-types';
import type { BaselineState } from './baseline';
import type {
  OpenFileCommitRef,
  OpenFileRemoteRef,
  OpenFileSelection
} from '../state/open-file';

/**
 * What the body renders.
 *  - `diff`    @pierre/diffs, read-only (tracked files with changes); for an
 *              IMAGE tab it is the before/after against HEAD instead
 *  - `file`    Monaco — the edit surface; for a .md or .svg tab this is
 *              "Source"
 *  - `preview` rendered markdown, or a rendered SVG — no Monaco
 *  - `split`   Source and Preview side by side (.md / .svg only)
 *  - `image`   the image viewer (Phase 12.10) — the only mode a raster image
 *              has, because there is no text under it to edit
 *  - `redline` the whole document as flowing prose with every change marked
 *              in place, read-only (Phase 194). Offered beside `diff` for a
 *              prose file (./redline isRedlinePath) that has a HEAD version,
 *              and never the default: a modified file still opens as `diff`.
 */
export type EditorMode = 'diff' | 'file' | 'preview' | 'split' | 'image' | 'redline';


export interface EditorTab {
  /** Tab identity — see the file header. Absolute path for a file tab. */
  id: string;
  /** Absolute file path. */
  path: string;
  /** Path relative to repoPath (git:showHead input). */
  relPath: string;
  /**
   * Repo-relative path of the LEFT side when it differs — a rename's
   * pre-rename path. null for the overwhelmingly common non-rename case.
   */
  origRelPath: string | null;
  /** Absolute repo/project root. */
  repoPath: string;
  /**
   * PHASE 260 — the PROJECT this tab belongs to (issue 19, research 119 §5.1).
   *
   * Decided once, when the tab opens: the open project whose root contains the
   * file, otherwise the project that was active at the open. Null when no
   * project was active. A tab is drawn in exactly one project's strip;
   * switching projects HIDES it and never closes it, so its Monaco model, its
   * view state, its rewind journal and its shadow baseline all survive the
   * switch. Moved after the open in two cases only, both in ./store and both
   * disposing nothing: the file's own folder becomes a project and the file is
   * opened from it, and a tab opened with no project active meets the first
   * project that becomes active.
   *
   * Optional rather than required, for the reason `remote` is optional: every
   * tab built before this phase, and every fixture in the tests, is still a
   * valid tab. The store sets it on every tab it creates, and every reader
   * treats `undefined` as null (`visibleTabsOf` in ./store).
   */
  projectId?: string | null;
  /** Basename, shown on the tab. */
  name: string;
  mode: EditorMode;
  /** True when a HEAD version exists to diff against (mode chip visible). */
  canDiff: boolean;
  /** Renders as markdown (drives the Preview/Source/Split control). */
  markdown: boolean;
  /**
   * Renders in the image viewer (Phase 12.10). True for every displayable
   * image INCLUDING svg; false for a raster image opened from a commit,
   * which has no image reader for an arbitrary revision yet and keeps the
   * honest "binary — no text diff" state rather than a comparison that would
   * silently show HEAD-vs-worktree under a commit tab.
   */
  image: boolean;
  /**
   * SVG — the one file that is BOTH. It loads through the text path (so
   * Source mode, ⌘S and the text diff are the same code as any other file)
   * and previews through the image viewer, which is exactly markdown's
   * Preview/Source split with a different renderer.
   */
  svg: boolean;
  /**
   * Renders as a web page (Phase 20.5). Same control as markdown and SVG,
   * which is Preview, Source and Split, with the `gmux-preview:` frame behind
   * Preview.
   *
   * Computed once here from `canPreviewPath` in `@shared/preview-types`, the
   * same predicate main's protocol handler uses as its allowlist. One
   * predicate, so a tab cannot offer Preview for a file the handler will
   * refuse to serve. That file also holds the six patterns that must never
   * get a rendered view whatever the allowlist says, and it runs them first.
   *
   * Unlike an SVG, an HTML tab opens in SOURCE. 63% of the 1,052 HTML files
   * tracked in 233 repositories on this machine render blank or nearly blank
   * without script, and a preview that opens blank looks broken rather than
   * safe (research 39 part 2).
   */
  html: boolean;
  /** The `fs:readImage` reply for the working copy (raster tabs). */
  imageData: ImageReadResult | null;
  /** The same, read at HEAD — the BEFORE side of an image comparison. */
  imageHead: ImageReadResult | null;
  /**
   * Bumped whenever the watcher says this image changed on disk. The asset
   * URL is stable per path, so without a changing `?v=` Chromium keeps
   * serving the cached bitmap while an agent rewrites the file underneath.
   */
  imageRevision: number;
  /** Preview tab (italic): replaced by the next open until edited/pinned. */
  preview: boolean;
  /**
   * Set for a HISTORY tab (Phase 12 item 4): this tab shows one file as it
   * was at one commit. Non-null implies read-only in every surface — no
   * save, no watcher refresh, no worktree read.
   */
  commit: OpenFileCommitRef | null;
  /**
   * Phase 14 — where a NAVIGATION open (search hit, symbol, `foo.ts:412`)
   * asked to land, waiting for Monaco to consume it.
   *
   * It has to live on the TAB rather than be applied at open time, for two
   * reasons that both bit in earlier phases: at `openFromRequest` the editor
   * usually is not mounted yet (the Monaco chunk is still loading, the file
   * is still being read), and re-opening an already-open tab has to land too
   * — that path never touched the editor at all before.
   *
   * MonacoHost consumes it exactly once (reveal → select → flash) and calls
   * `clearPendingSelection`. `pendingFocus` travels with it and is only
   * meaningful while it is non-null; the pair is set and cleared together.
   */
  pendingSelection: OpenFileSelection | null;
  /**
   * Whether landing that selection should also move KEYBOARD FOCUS into the
   * editor. False for a preview open from the search list: focus must stay
   * on the list so ↑↓ keep walking hits while the editor previews each one
   * behind them. True for a pinned open (double-click / ⌘↩) and for every
   * gesture that is not a search result.
   */
  pendingFocus: boolean;
  dirty: boolean;
  /** §6.12 — deleted on disk under the open tab. */
  deleted: boolean;
  /** Opened truncated (read cap) — read-only. */
  truncated: boolean;
  /** File contents (and HEAD contents in diff mode) still loading. */
  loading: boolean;
  /** Friendly load-failure line (binary file, permission…). */
  error: string | null;
  /** Last known on-disk contents (dirty = model text !== this). */
  savedContents: string;
  /** HEAD contents for the diff original side (null until loaded). */
  headContents: string | null;
  /** LRU stamp. */
  lastUsed: number;
  /**
   * Phase 22 — the Context row this tab was opened from, or null.
   *
   * Non-null turns the tab into the `context:<id>` DETAIL tab: the panel draws
   * the header card above the body and the body is whatever this file would
   * normally render as. It is a field rather than a tab kind because everything
   * else about the tab is unchanged, and a second tab kind would have needed its
   * own loader, its own identity rule and its own close semantics to end up
   * behaving exactly like this one.
   *
   * Typed `unknown` for the same reason the request field is: this store is
   * imported by every surface in the renderer, and the detail card is the only
   * thing that needs the shape.
   */
  contextEntry: unknown;
  /**
   * PHASE 73. This tab shows a file on another machine.
   *
   * Both sides come from main, exactly as a commit tab's do, and no working
   * tree on this Mac is ever read for it. Present implies read-only in every
   * surface: the store refuses to mark it dirty, tab IO refuses to save it, and
   * the watcher never refreshes it.
   *
   * Optional rather than nullable, so every tab built before this phase, and
   * every fixture in the tests, is still a valid tab.
   */
  remote?: OpenFileRemoteRef;
  /**
   * PHASE 63 — the bytes a DRAFT tab opened with, or null for every other tab.
   *
   * Non-null means the tab was opened from composed text rather than from
   * disk: no read was made, `savedContents` is empty because nothing has been
   * saved, and the tab is dirty from the moment it appears. MonacoHost seeds
   * the model from this rather than from `savedContents`, which is the one
   * place it is read.
   *
   * It stays on the tab after a save rather than being cleared, because the
   * model registry is keyed by tab id and already holds the live text by then;
   * clearing it would buy nothing and would make the tab's history unreadable.
   *
   * Optional rather than required, for the reason `remote` is optional: every
   * tab built before this phase, and every fixture in the tests, is still a
   * valid tab. The store sets it explicitly on every tab it creates, so the
   * `undefined` case only ever reaches a hand written fixture.
   */
  draft?: string | null;
  /**
   * PHASE 160 — this tab is the ARCHITECTURE MAP of one repository.
   *
   * Present means the body is the drawn map rather than any file surface: no
   * Monaco, no diff, no preview and no mode chip. The tab reads nothing from
   * disk when it opens, is never dirty, refuses save, and the watcher never
   * refreshes it, each refusal sitting where the matching `commit` or `remote`
   * refusal already sits. Identity is `arch-map:<repoPath>` so one repository
   * has one map tab and reopening focuses it.
   *
   * Optional rather than nullable, so every tab built before this phase, and
   * every fixture in the tests, is still a valid tab.
   */
  archMap?: {
    /** The repository the map draws. Same value as `repoPath`. */
    repoPath: string;
    /**
     * PHASE 258. Which inner tab of the map tab to land on: the picture, the
     * journeys, the surfaces list or the gates worksheet (Phase 259 added the
     * second). Absent is the picture. The arch store holds the tab as view
     * state and `openArchMap` sets it before the request goes out, so the
     * editor reads nothing from this field.
     */
    tab?: 'map' | 'journeys' | 'surfaces' | 'gates';
  };
  /**
   * PHASE 163. This tab is the DIAGNOSTICS REPORT, one capture of what Tortie
   * is running right now.
   *
   * Present means the body is the report and not any file surface, and every
   * refusal the map tab has applies here for the same reasons: no disk read on
   * open, never dirty, save refused, the watcher never refreshes it. Identity
   * is `diagnostics:report`, so there is one report tab in the whole app and
   * asking again focuses it. The tab is not a reading of any repository. Its
   * `path` carries the active project's root only because a tab needs one,
   * and the tooltip says what the tab actually is.
   *
   * Optional rather than nullable, so every tab built before this phase, and
   * every fixture in the tests, is still a valid tab.
   */
  diagnostics?: {
    /** The one report kind this phase draws. */
    kind: 'report';
  };
  /**
   * PHASE 240. This tab is a COMPARISON of two strings handed in at open, and
   * of nothing on disk (issue 16).
   *
   * Present means the two sides are `headContents` on the left and
   * `savedContents` on the right, both filled once when the tab opened and
   * moved by nothing after: no watcher refresh, no HEAD read, no buffer of its
   * own. Every reader treats it the way it treats `commit` — read-only, never
   * dirty, save refused — for the stronger reason that neither side is what
   * the file says now, so a save could only ever write a dead version over a
   * live file. Identity is `compare:<path>` so a second Compare of one file
   * replaces its sides rather than stacking a tab.
   *
   * Optional rather than nullable, for the reason `remote` is optional: every
   * tab built before this phase, and every fixture in the tests, is still a
   * valid tab.
   */
  compare?: {
    /**
     * The file's OWN name. The tab's `name` is `compareTabName` of it, because
     * a second tab reading `notes.md` beside the `notes.md` it was opened from
     * would be a puzzle, so the plain name has nowhere else to live.
     */
    fileName: string;
  };
  /**
   * PHASE 225. The shadow baseline the redline draws against, with the
   * generation it is at, held in memory and written nowhere.
   *
   * Seeded by the first successful read (./tab-io loadContents), re-seeded by
   * a HEAD version not seen before (loadHead and the watcher tick), and moved
   * by nothing else: not the file changing, not a save, not a look, not a
   * tab switch. ./baseline holds the rule. It dies with the tab, on close,
   * on eviction past MAX_TABS, on reload, quit or crash, and the face says so.
   *
   * Optional rather than nullable, for the reason `remote` is optional: every
   * tab built before this phase, and every fixture in the tests, is still a
   * valid tab. The store sets it on every tab it creates, and every reader
   * treats `undefined` as NO_BASELINE.
   */
  baseline?: BaselineState;
}
