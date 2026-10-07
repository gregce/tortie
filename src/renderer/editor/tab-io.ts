/**
 * Tab IO — everything that moves bytes between a tab and the outside world:
 * loading its side(s), saving it, and re-reading it when the git watcher says
 * the repo changed.
 *
 * Separated from src/renderer/editor/store.ts during Phase 12 integration.
 * The store is a state machine over a list of tabs (open, activate, close,
 * cycle, pin); this is the IO that state machine schedules. They had grown
 * into one 770-line file with five section banners, which is the split
 * signal in CLAUDE.md's growth guardrails.
 *
 * The three kinds of tab (DESIGN-SPEC S5C, the third added by Phase 73) differ
 * ONLY here:
 *   worktree — loadContents + loadHead, refreshed by `refreshRepo`
 *   history  — loadCommitDiff fills both sides once and nothing else runs
 *   review   — loadRemoteDiff fills both sides once, from another computer
 *   history on a machine (Phase 233) — loadRemoteCommitDiff fills both sides
 *              once, from that computer's object database; the tab carries
 *              both `commit` and `remote` and every refusal of either applies
 * Which is why `refreshRepo` refuses a history tab and a review tab: it is
 * cheaper to state that twice, right where the write would happen, than to
 * rely on every caller remembering.
 *
 * PHASE 101 SPLIT `save` IN TWO. A review tab Tortie may save is saved on that
 * machine, through the one channel that can write there, and any other review
 * tab is refused, out loud. PHASE 336 changed which tabs those are: a file
 * inside a project open on a confirmed machine saves, as a file inside a
 * project open on this Mac does, with nothing asked. Nothing about a history
 * tab moved: the past is not an edit surface on any computer.
 *
 * PHASE 240 SPLIT THE LOCAL HALF IN TWO AS WELL, and it is issue 16, Sean
 * Johnson: "When I edit a file, then save, there's no warning if someone else
 * (presumably an agent) edited it concurrently and I'm overwriting its edits
 * (as VSC does)." A file inside an open project is saved through Phase 226's
 * `fs:writeGuarded`, with the digest of `tab.savedContents` — by definition
 * what Tortie last read — as the precondition, so a save that would land on
 * top of somebody else's write is answered `stale` and asks first. A file
 * outside every open project root keeps the unguarded `fs:writeFile` it has
 * always had, because the guarded channel would refuse such a path outright
 * and that would take away a save a person has today.
 *
 * THE REMOTE SAVE IS UNTOUCHED by that. `saveOnMachine` has carried a
 * precondition through `machines:putFile` since Phase 101 and this is where
 * the pattern came from; Phase 240 only brings the local path level with it,
 * and it deliberately borrows the remote family's sentences rather than
 * inventing a second vocabulary (./save-sentences).
 *
 * `refreshRepo`'s dirty-tab rule is NOT touched either. Skipping a dirty tab
 * is correct — it is what stops the watcher overwriting a person's typing —
 * and it is what makes the warning necessary rather than what the warning
 * replaces.
 *
 * PHASE 277 GAVE THE FOUR SUCCESS ARMS ONE COMPLETION RULE, and it is audit
 * F1. Every one of them patched the literal `{ savedContents: value, dirty:
 * false }` without asking what the buffer holds NOW, so an acknowledgement for
 * text the person had already typed past said the tab was clean. That literal
 * predates Phase 268; the timer only made it easy to reach and added a
 * consequence, because ./auto-save cancels a pending timer on the clean edge.
 * `completeSave` below is the one place a save clears a tab: the baseline
 * always moves to the bytes that were written, and `dirty` is ASKED of the
 * model rather than asserted. It is also where the tab's LIFETIME is checked,
 * because a tab id is an absolute path and a close-and-reopen hands the same
 * id to a different buffer.
 *
 * AND SAVES ARE SERIALISED PER BUFFER HERE, not in the scheduler.
 * `withSaveSlot` holds one slot per open buffer and remembers at most one
 * follow-up, and only ever a person's, so a ⌘S and a timer can no longer submit
 * two writes against the same frozen precondition and have the loser told the
 * file "changed on disk" about a writer that does not exist. A timer that finds
 * the slot held is answered false and ./auto-save re-arms it, so it asks the
 * policy and the dialog again rather than writing a whole save later without
 * asking. ./auto-save keeps no in-flight set of its own; that was a second
 * truth about one fact, kept in the module ⌘S cannot see.
 */

import { REMOTE_FILE_MAX_BYTES } from '@shared/ipc';
import { errorText, useApp } from '../state/store';
import { remoteWriteFolderIn } from '../state/machines-slice';
import {
  remoteOpenTooLarge,
  remoteSaveLostAnswer,
  remoteSaveRefusal,
  remoteSaveRefusedFor
} from '../machines/editor';
import { announceRemoteWrite } from '../machines/remote-writes';
import { requestOpenFile } from '../state/open-file';
import type {
  OpenFileCommitRef,
  OpenFileRemoteRef
} from '../state/open-file';
import {
  getWorkingModel,
  resetWorkingModel,
  type WorkingModel
} from './monaco-loader';
import type { BaselineState } from './baseline';
import { nextBaseline } from './baseline';
// PHASE 243. The durable half of the baseline, decided purely next door. The
// two bridge calls are HERE, beside the file read and the HEAD read, because
// this file already owns every call the editor makes into main and the
// redline family must not grow a second door (conformance:redline rule 9).
import {
  baselineKeyFor,
  keepsBaseline,
  markStored,
  stateFromStored,
  storeInputFor
} from './baseline-durable';
import { dirOf } from './paths';
import { fileInRepo } from './tab-identity';
import { guardedSave } from './save-write';
// PHASE 268. The reason a save was asked for, and the vocabulary of a stop.
// This module holds NO timer state: the controller next door owns the map of
// stops and the whole "shown once" rule, and reaches this side through
// `TabIoDeps.autoStop`.
import type { AutoSaveStopWhy, SaveReason } from './auto-save';
import {
  SAVE_COMPARE_LABEL,
  SAVE_OVERWRITE_LABEL,
  STALE_SAVE_BODY,
  saveRefusalSentence,
  staleSaveTitle
} from './save-sentences';
import type { EditorMode, EditorTab } from './tab-types';
// PHASE 254. A markdown tab past the preview threshold opens in Source, with
// the rendered preview deferred to the mode chip — the demotion happens in the
// SAME patch that lands the bytes, so the preview surface never sees a large
// source (research 116 §2.2 measured that render at ~5 s with no first paint
// until the end). The rule itself is pure and lives next door.
import { openedProseMode, previewDeferred } from './markdown/large-prose';
import { gmuxBridge } from '../bridge';

/**
 * One plain sentence for a person, never a JSON body and never a stack
 * (Phase 26 item 1).
 *
 * `errorText` unwraps main's structured GmuxError payload, and that message
 * is already a sentence. But a rejection can arrive UNCLASSIFIED — Electron
 * wraps a thrown handler error as "Error occurred in handler for
 * 'git:showHead': …{json}…" — and when the unwrap fails, the raw wrapper used
 * to reach the operator's screen whole. Every error this module shows goes
 * through here: keep a clean first line, and fall back to the caller's own
 * sentence for anything that still looks like machinery.
 */
export function errorSentence(err: unknown, fallback: string): string {
  const first = errorText(err).split('\n', 1)[0]?.trim() ?? '';
  const machinery =
    first.length === 0 ||
    first.length > 160 ||
    first.includes('{') ||
    first.includes('Error invoking remote method') ||
    first.includes('Error occurred in handler');
  if (machinery) return fallback;
  return /[.!?]$/.test(first) ? first : `${first}.`;
}

/**
 * A file whose two sides hold bytes no text diff can show.
 *
 * PHASE 73 FIX ROUND. It was written out twice, once for a commit tab and once
 * for a review tab on another machine, and the two copies carried an em dash
 * against the writing rules. One function, one sentence, no dash.
 */
export function binaryFileNote(name: string): string {
  return `${name} is a binary file. There is no text diff to show.`;
}

/** What the store lends the IO layer: read a tab, write a tab. */
export interface TabIoDeps {
  patch(id: string, patch: Partial<EditorTab>): void;
  byId(id: string): EditorTab | undefined;
  /** Open WORKTREE tabs in this repo — history tabs are never refreshed. */
  worktreeTabsIn(repoPath: string): EditorTab[];
  /**
   * PHASE 268. Record that auto save stopped for this tab, and say so ONCE.
   *
   * The guarded door below calls it instead of opening a dialog or raising a
   * toast, because a modal is a question put to somebody who pressed
   * something and a timer pressed nothing. It always answers false, which is
   * "nothing was written", so every `auto` arm is one line. The record itself
   * lives in ./auto-save, which is also what stops the timer re-arming.
   */
  autoStop(id: string, why: AutoSaveStopWhy): false;
}

export interface TabIo {
  loadContents(id: string, path: string): Promise<void>;
  /**
   * PHASE 243. Record this tab's baseline if it has moved and is not recorded
   * yet. Resolves when main has answered or when there was nothing to do; it
   * is never awaited by anything a person is waiting for.
   */
  persistBaseline(id: string): Promise<void>;
  loadHead(id: string): Promise<void>;
  loadCommitDiff(id: string, commit: OpenFileCommitRef): Promise<void>;
  /**
   * Both sides of one file on another machine (Phase 73). No working tree on
   * this Mac is read, and nothing is written on either computer.
   */
  loadRemoteDiff(id: string, remote: OpenFileRemoteRef): Promise<void>;
  /**
   * Both sides of one file OF ONE COMMIT on another machine (Phase 233), the
   * commit's first parent against the commit, out of that machine's object
   * database. No working tree on either computer is read.
   */
  loadRemoteCommitDiff(
    id: string,
    remote: OpenFileRemoteRef,
    commit: OpenFileCommitRef
  ): Promise<void>;
  /** The working copy of an image (Phase 12.10) — never the text reader. */
  loadImage(id: string, path: string): Promise<void>;
  /** The same image at HEAD — the BEFORE side of the comparison. */
  loadImageHead(id: string): Promise<void>;
  /**
   * THE BYTES A CONFIRMED WRITE PUT ON DISK, adopted by the tab that wrote
   * them (2026-09-16).
   *
   * The rewind and the undo write through the one guarded door and know
   * exactly what it wrote; `contents` is that byte string and `was` is what
   * the plan read. A tab that is still holding `was` adopts `contents` now,
   * which is what lets the redline redraw in the same tick rather than after
   * the file watcher's next round trip — measured at 1,139 ms against an
   * accept's 35 ms, PR 28's author's own complaint.
   *
   * TWO REFUSALS, and both are the difference between "the file holds these
   * bytes" and "the file held these bytes when the press was made": a tab
   * that has become DIRTY has a buffer whose text is newer than the plan, and
   * a tab whose saved contents MOVED has a save or a read of its own to
   * believe. Either way the watcher is the honest reader and this does
   * nothing.
   *
   * PHASE 282. DIRTY INCLUDES A KEYSTROKE STILL ON ITS WAY TO THE BUFFER.
   * ./redline-edits marks the tab when the edit is dispatched, before its
   * first model has loaded, because a rewind's whole write fits inside that
   * load and this refusal cannot answer a flag set after it
   * (adopt-written.test.ts drives it through the real typing hook).
   */
  adoptWritten(id: string, contents: string, was: string): void;
  /**
   * Write one tab to disk. Resolves false when nothing was written.
   *
   * PHASE 268. `reason` defaults to `explicit`, so ⌘S and every existing
   * caller are byte-identical to what they were. `auto` is the timer, and it
   * changes exactly two things: it refuses the plain, unguarded door outright
   * (issue 16 is what an unguarded write on a timer costs), and it never opens
   * a dialog — a refusal becomes one stop record and one sentence instead.
   */
  save(id: string, reason?: SaveReason): Promise<boolean>;
  /**
   * Walk every worktree tab of this repo: existence, buffer, HEAD, baseline.
   *
   * PHASE 282'S FIX ROUND. ONE WALK PER REPO AT A TIME, with at most one more
   * queued behind it, so two reads of one tab are never in the air together.
   * The serializer is on the implementation, which says why.
   */
  refreshRepo(repoPath: string): Promise<void>;
}

export function createTabIo(deps: TabIoDeps): TabIo {
  const gmux = gmuxBridge();
  const fsExtras = gmux ? gmux.fs : null;
  const imageFs = gmux ? gmux.fs : null;

  /**
   * PHASE 243. Record a moved baseline, and mark it recorded when main
   * answers.
   *
   * The identity check after the await is the whole safety of it: main's
   * receipt is applied only when the tab still holds THE SAME baseline object
   * that was sent, so an accept or a HEAD move that landed while the write was
   * in flight is never labelled with a receipt for older bytes. A state that
   * already carries `durable` needs nothing: it was either just written or it
   * came out of the store, and `nextBaseline` drops the field on every move.
   *
   * Every failure is silent by design. A baseline that could not be recorded
   * is a baseline that lasts as long as the tab, which is exactly what shipped
   * before this phase, and there is nothing for a person to do about it.
   */
  const persistBaseline = async (id: string): Promise<void> => {
    const store = gmux?.baselines;
    if (store === undefined) return;
    const tab = deps.byId(id);
    if (tab === undefined || !keepsBaseline(tab)) return;
    // NOT BEFORE THE FIRST READ HAS LANDED, because `truncated` is not known
    // until then and the two loaders land in either order: a HEAD answer that
    // arrives first would otherwise record a baseline for a tab whose bytes
    // turn out to be a truncated read. The read's own patch calls this again,
    // so nothing is lost by waiting for it.
    if (tab.loading) return;
    const state = tab.baseline;
    if (state === undefined || state.durable !== undefined) return;
    const input = storeInputFor(tab, state);
    if (input === null) return;
    let result;
    try {
      result = await store.store(input);
    } catch {
      return;
    }
    if (!result.stored) return;
    const current = deps.byId(id);
    if (current === undefined || current.baseline !== state) return;
    deps.patch(id, { baseline: markStored(state) });
  };

  /**
   * PHASE 243. The stored baseline for this tab, or null.
   *
   * Issued BESIDE the file read rather than after it, so a tab opens in
   * max(read, store) and not read + store, and nothing on the draw path gains
   * an await: the tab still holds the baseline in memory and
   * `redlineBaseSide` still reads that field with no await at all.
   */
  const loadStoredBaseline = (id: string): Promise<BaselineState | null> | null => {
    const store = gmux?.baselines;
    const tab = deps.byId(id);
    if (store === undefined || tab === undefined || !keepsBaseline(tab)) return null;
    // The refusal is attached HERE rather than at the await, so a store that
    // rejects can never become an unhandled rejection while the file read is
    // still in flight.
    return store.load(baselineKeyFor(tab)).then(
      (answer) => (answer.found ? stateFromStored(answer.baseline) : null),
      () => null
    );
  };

  const loadContents = async (id: string, path: string): Promise<void> => {
    if (!gmux) return;
    // Started before the read and awaited after it, so a tab opens in
    // max(read, store) rather than read + store. A tab with nothing to ask —
    // no store on the bridge, a history tab, a file the redline never draws —
    // answers null with no promise at all, so its open is byte for byte the
    // sequence Phase 225 shipped and the two loaders still race exactly as
    // they did.
    const pending = loadStoredBaseline(id);
    try {
      const result = await gmux.fs.readFile(path);
      const restored = pending === null ? null : await pending;
      // PHASE 225. The first successful read seeds the shadow baseline from
      // the same bytes `savedContents` gets, HERE and not when Redline mode is
      // chosen: a baseline captured from whatever the file said when the view
      // was first opened may be mid rewrite and is then wrong for ever
      // (research 83 A1.2 property 3). `nextBaseline` refuses every read after
      // the first, so a re-run of this loader cannot move it either.
      // PHASE 243. A STORED BASELINE IS OFFERED HERE AND NOWHERE ELSE, and it
      // is offered only when nothing has seeded this tab yet, which is the
      // same condition `nextBaseline` puts on the read seed. What makes it
      // CREDIBLE is not a rule of its own: the record carries the HEAD version
      // it was taken against, and `loadHead` below replays git's current
      // answer through `nextBaseline` as a `head` event, so a committed
      // version that has moved re-seeds the baseline on the line that already
      // exists, before the picture is ever drawn (research 106 section 2.3).
      //
      // A TRUNCATED read stores nothing and restores nothing: its bytes are
      // not the file, the tab is read-only, and research 83 E.7a measured what
      // acting on them costs.
      const current = deps.byId(id);
      const held = current?.baseline;
      // THE CREDIBILITY RULE IS `nextBaseline` REPLAYED, and it is replayed
      // here so that it is the same rule in BOTH landing orders. When the HEAD
      // read has already answered, the stored baseline is handed that answer
      // as a `head` event: an unchanged committed version returns the SAME
      // object and the stored baseline stands, and a moved one answers a
      // different object, which is exactly the clause that would have
      // re-seeded it a moment later. Either way no narrowing across a commit
      // survives, and the rule that decides it is the one `conformance:redline`
      // already ablates.
      const headKnown = current?.headContents ?? null;
      const credible =
        restored === null || headKnown === null
          ? restored
          : nextBaseline(restored, { kind: 'head', contents: headKnown }) === restored
            ? restored
            : null;
      // A restored baseline is taken when nothing has seeded this tab, and
      // when the only thing that has is the HEAD version it was just proved
      // credible against — a baseline the person accepted is NEWER than the
      // commit it was accepted over, and losing it to a race between two
      // loaders is the whole defect this phase is here to remove.
      const baseline =
        credible !== null &&
        !result.truncated &&
        ((held?.text ?? null) === null || held?.from === 'commit')
          ? credible
          : nextBaseline(held, { kind: 'read', contents: result.contents });
      // PHASE 254, RE-DERIVED BY PHASE 255. The rendered preview used to
      // cost ~5 s for the operator's two files with no first paint until the
      // whole document rendered (research 116); it now draws a first window
      // and streams the rest (research 117), so ordinary prose opens rendered
      // at any size. Only a markdown tab whose source draws in ONE PIECE
      // (large-prose.ts) opens in Source instead, with Preview DEFERRED to
      // the mode chip, which states the cost in one clause. The demotion rides
      // the same patch as `savedContents`, so React never renders the preview
      // surface holding a large source; it runs only here, on the tab's first
      // read, so a mode the person picks on the chip afterwards is final.
      // Everything else about the open is unchanged: the baseline above still
      // seeds, the durable store below still records, the redline and the
      // diff still work when asked.
      const opened =
        current === undefined
          ? null
          : openedProseMode(current.mode, current.markdown, result.contents);
      deps.patch(id, {
        savedContents: result.contents,
        truncated: result.truncated,
        loading: false,
        error: null,
        deleted: false,
        baseline,
        ...(opened !== null && current !== undefined && opened !== current.mode
          ? { mode: opened }
          : {})
      });
      void persistBaseline(id);
    } catch (err) {
      deps.patch(id, {
        loading: false,
        error: errorSentence(err, 'The file could not be read.')
      });
    }
  };

  /**
   * PHASE 254. The mode a tab falls back to when its diff base cannot exist
   * or cannot be fetched. It was `tab.markdown ? 'preview' : 'file'`, and for
   * a large prose file that put the ~5 s markdown render back on the open
   * path through the one door `loadContents`' demotion does not guard. It
   * asks the same predicate, which Phase 255 re-derived. The
   * tab is re-read at the call, because the fallback can land before or after
   * the read; when it lands first the contents are still '' and the read's
   * own demotion finishes the job.
   */
  const fallbackMode = (id: string, tab: EditorTab): EditorMode => {
    const held = deps.byId(id) ?? tab;
    return held.markdown && !previewDeferred(held.savedContents)
      ? 'preview'
      : 'file';
  };

  const loadHead = async (id: string): Promise<void> => {
    const tab = deps.byId(id);
    if (!gmux || tab === undefined) return;
    // Phase 26 item 1: a file outside the repository has no HEAD version and
    // git is never asked about it. The rule is decided where the tab is
    // created (store.openFromRequest / setMode), so reaching this line is
    // already a caller's mistake — fall back to the plain view without a git
    // call and without a toast, because nothing is wrong with the file.
    if (!fileInRepo(tab.repoPath, tab.path)) {
      deps.patch(id, { mode: fallbackMode(id, tab), canDiff: false });
      return;
    }
    try {
      const head = await gmux.git.showHead({
        repoPath: tab.repoPath,
        // A rename's LEFT side lives at the OLD path. Asking HEAD for the new
        // path returns nothing, and the diff then reads as a whole-file
        // addition — the Phase 11 carried finding (a).
        path: tab.origRelPath ?? tab.relPath
      });
      // PHASE 225. A HEAD version not seen before becomes the baseline
      // outright. Read the tab again after the await, because the read may
      // have seeded it meanwhile and the two loaders land in either order.
      deps.patch(id, {
        headContents: head,
        baseline: nextBaseline(deps.byId(id)?.baseline, {
          kind: 'head',
          contents: head
        })
      });
      // PHASE 243. A HEAD version not seen before is a MOVED baseline, so it
      // is recorded exactly as an accept is. A repeated one answers the same
      // object, which already carries its receipt, so this writes nothing.
      void persistBaseline(id);
    } catch (err) {
      // Diff base unavailable (repo vanished, git failed): fall back to a
      // plain editor rather than a broken diff, and say so in sentences a
      // person can read (Phase 26 item 1).
      deps.patch(id, { mode: fallbackMode(id, tab), canDiff: false });
      useApp
        .getState()
        .toast(
          'error',
          `Could not load the last committed version of this file. ${errorSentence(
            err,
            'Showing it on its own.'
          )}`
        );
    }
  };

  /**
   * A HISTORY tab's two sides (Phase 12 item 4) — `<sha>^ → <sha>`, from the
   * one main-process reader that already knows how to resolve a first parent,
   * a root commit and a rename. Both sides are text here; the working-tree
   * loaders are never used for this tab.
   *
   * An absent side (add / delete / root commit) is an EMPTY string, not an
   * error: that is what makes the diff render all-green or all-red the way
   * VS Code does. Binary is the one case with nothing to show.
   */
  const loadCommitDiff = async (
    id: string,
    commit: OpenFileCommitRef
  ): Promise<void> => {
    const git = gmux ? gmux.git : null;
    const tab = deps.byId(id);
    if (git === null || tab === undefined) return;
    if (typeof git.commitFileDiff !== 'function') {
      deps.patch(id, {
        loading: false,
        error: 'This build cannot open historical commits.'
      });
      return;
    }
    try {
      const pair = await git.commitFileDiff({
        repoPath: tab.repoPath,
        sha: commit.sha,
        path: tab.relPath,
        ...(tab.origRelPath !== null ? { origPath: tab.origRelPath } : {}),
        status: commit.status
      });
      if (pair.binary) {
        deps.patch(id, {
          loading: false,
          error: binaryFileNote(tab.name)
        });
        return;
      }
      deps.patch(id, {
        headContents: pair.oldContents ?? '',
        savedContents: pair.newContents ?? '',
        loading: false,
        error: null
      });
    } catch (err) {
      deps.patch(id, {
        loading: false,
        error: errorSentence(err, 'The commit could not be read.')
      });
    }
  };

  /**
   * A REVIEW tab's two sides (Phase 73, M6, item 4) — the HEAD copy and the
   * working copy of one file, both read ON THE MACHINE the session runs on.
   *
   * It is `loadCommitDiff` with one call swapped, and that is the whole point
   * of the item: the read-only diff surface, the two content fields, the binary
   * answer and the error sentences are the ones the editor has had since
   * Phase 12. `src/renderer/editor/PierreDiff.tsx` is not edited by this phase.
   *
   * The two ways this differs from every other loader in this file are worth
   * stating, because both are safety properties rather than details.
   *
   *  1. NO PATH ON THIS MAC IS READ. `tab.path` is a path on another computer.
   *     Handing it to `fs:readFile` would open whatever this Mac happens to
   *     hold at that name, which in the phase's own probes is a real file.
   *  2. The call can REFUSE, and the refusal is a sentence rather than an empty
   *     tab. Main refuses when Tortie is not connected to that machine, and
   *     refuses again when the connection changed while the read was in
   *     flight. Both arrive here as an error with main's own sentence on it.
   */
  const loadRemoteDiff = async (
    id: string,
    remote: OpenFileRemoteRef
  ): Promise<void> => {
    const machines = gmux ? gmux.machines : undefined;
    const tab = deps.byId(id);
    if (tab === undefined) return;
    if (machines === undefined || typeof machines.reviewFile !== 'function') {
      deps.patch(id, {
        loading: false,
        error: 'This build cannot show files from another machine.'
      });
      return;
    }
    try {
      const pair = await machines.reviewFile({
        machineId: remote.machineId,
        repoPath: remote.repoPath,
        path: tab.relPath,
        origPath: tab.origRelPath
      });
      if (pair.binary) {
        deps.patch(id, {
          loading: false,
          error: binaryFileNote(tab.name)
        });
        return;
      }
      /**
       * PHASE 336. A file larger than Tortie can save on that machine OPENS,
       * read only, where Phase 101 refused the open on a machine with saving
       * on. Research 138's ruling is that a file is never refused for OPENING
       * because of the save cap.
       *
       * WHY THE CAP CANNOT MOVE INSTEAD. The read cap is 2,097,152 bytes and
       * the save cap is 90,000. The whole command Tortie sends is capped as
       * well and a file that size does not fit at any encoding, so a tab over
       * the save cap can never be saved. It is marked `saveCapped`, which is
       * the fifth reason `tabIsReadOnly` gives for a tab on another machine,
       * and the band says why typing changes nothing.
       *
       * TWO SENTENCES, because a cut read gives a floor rather than a
       * measurement. `pair.bytes` is the file's real size when the read was
       * whole, and it is the read cap when the read was cut, so the band says
       * over and never prints the floor as the size. A tab under the cap
       * carries no mark, so a re-read of a file that shrank clears it.
       */
      deps.patch(id, {
        headContents: pair.oldContents,
        savedContents: pair.newContents,
        loading: false,
        error: null,
        saveCapped:
          pair.bytes > REMOTE_FILE_MAX_BYTES
            ? { bytes: pair.bytes, over: pair.truncated }
            : undefined
      });
      // The cap is a fact about what is on screen, so it is said once here
      // rather than drawn as a permanent banner. `truncated` also puts the tab
      // into its existing read-only state, which a review already is.
      if (pair.truncated) {
        deps.patch(id, { truncated: true });
        if (pair.note !== null) useApp.getState().toast('info', pair.note);
      }
    } catch (err) {
      deps.patch(id, {
        loading: false,
        error: errorSentence(
          err,
          'That file could not be read on the machine.'
        )
      });
    }
  };

  /**
   * A HISTORY tab whose commit lives on another machine (Phase 233).
   *
   * It is `loadCommitDiff` with one call swapped, exactly as `loadRemoteDiff`
   * is: the two content fields, the binary answer and the error sentence are
   * the ones a local commit tab has had since Phase 12, and the one call asks
   * that machine's object database for `<sha>^` and `<sha>` rather than this
   * Mac's git. `tab.origRelPath` is the pre-rename path, so the old side is
   * read at the old path, which is the Phase 11 carried finding (a).
   *
   * THE CEILING. Each side crosses cut at REMOTE_FILE_MAX_BYTES, and the far
   * side counts each side's WHOLE size beside it with a second read, so the
   * number in the refusal is a measurement and never a floor. A file whose
   * larger side is over the ceiling is refused with the sentence the editor
   * already uses for a large remote file, naming that size, and the tab shows
   * nothing else.
   *
   * IT IS REFUSED WHATEVER FOLDER HOLDS IT, which is where it parts from the
   * review tab above: since Phase 336 a review tab over the save cap opens
   * read only, and the whole 2 MiB read is shown. Here BOTH SIDES ARE CUT at
   * the ceiling by the script itself, so a file over it cannot be shown whole
   * at all and a tab drawn from the cut bytes would be a diff of two files
   * neither of which is the one that was asked for.
   */
  const loadRemoteCommitDiff = async (
    id: string,
    remote: OpenFileRemoteRef,
    commit: OpenFileCommitRef
  ): Promise<void> => {
    const machines = gmux ? gmux.machines : undefined;
    const tab = deps.byId(id);
    if (tab === undefined) return;
    if (
      machines === undefined ||
      typeof machines.readCommitFile !== 'function'
    ) {
      deps.patch(id, {
        loading: false,
        error: 'This build cannot show files from another machine.'
      });
      return;
    }
    try {
      const pair = await machines.readCommitFile({
        machineId: remote.machineId,
        cwd: remote.repoPath,
        sha: commit.sha,
        path: tab.relPath,
        origPath: tab.origRelPath
      });
      if (pair.binary) {
        deps.patch(id, {
          loading: false,
          error: binaryFileNote(tab.name)
        });
        return;
      }
      const bytes = Math.max(pair.oldBytes, pair.newBytes);
      if (bytes > REMOTE_FILE_MAX_BYTES) {
        deps.patch(id, {
          loading: false,
          error: remoteOpenTooLarge(bytes, remote.machineLabel)
        });
        return;
      }
      deps.patch(id, {
        headContents: pair.oldContents,
        savedContents: pair.newContents,
        loading: false,
        error: null
      });
    } catch (err) {
      deps.patch(id, {
        loading: false,
        error: errorSentence(err, 'The commit could not be read.')
      });
    }
  };

  // -- images (Phase 12.10) --------------------------------------------------
  // A separate reader, not a variant of loadContents: fs:readFile is UTF-8
  // and refuses binary, so routing an image through it is what produced
  // "gmux edits text files only" on every .png in the tree.

  const loadImage = async (id: string, path: string): Promise<void> => {
    if (typeof imageFs?.readImage !== 'function') {
      deps.patch(id, {
        loading: false,
        error: 'This build cannot preview images.'
      });
      return;
    }
    try {
      const data = await imageFs.readImage({ path });
      deps.patch(id, {
        imageData: data,
        loading: false,
        error: null,
        deleted: data.status === 'missing'
      });
    } catch (err) {
      deps.patch(id, {
        loading: false,
        error: errorSentence(err, 'The image could not be read.')
      });
    }
  };

  const loadImageHead = async (id: string): Promise<void> => {
    const tab = deps.byId(id);
    if (tab === undefined || typeof imageFs?.readImage !== 'function') return;
    // Phase 26 item 1: same rule as loadHead — no HEAD version exists for a
    // file outside the repository, so git is never asked.
    if (!fileInRepo(tab.repoPath, tab.path)) {
      deps.patch(id, { mode: 'image', canDiff: false });
      return;
    }
    try {
      const head = await imageFs.readImage({
        path: tab.path,
        rev: 'HEAD',
        repoPath: tab.repoPath,
        // A rename's LEFT side lives at the OLD path — the same rule the
        // text diff follows (Phase 11 carried finding (a)).
        relPath: tab.origRelPath ?? tab.relPath
      });
      deps.patch(id, { imageHead: head });
    } catch (err) {
      // No comparison is available: fall back to the plain viewer rather
      // than an empty half-diff, and say why once.
      deps.patch(id, { mode: 'image', canDiff: false });
      useApp
        .getState()
        .toast(
          'error',
          `Could not load the last committed version of this image. ${errorSentence(
            err,
            'Showing it on its own.'
          )}`
        );
    }
  };

  // -- saving ----------------------------------------------------------------

  /**
   * The one sentence for a build that cannot do this at all (Phase 101).
   *
   * It covers a preload with no `machines.putFile` and a page with no digest
   * program, because both mean the same thing to a person: this build cannot
   * save a file on another computer. Nothing is sent in either case.
   */
  const NO_REMOTE_SAVE = 'This build cannot save files on another machine.';

  /**
   * The lowercase hex sha256 of one string of text, as `shasum -a 256` spells
   * it (Phase 101).
   *
   * WHY THE RENDERER COMPUTES IT. `expect` is the checksum of the file AS
   * TORTIE LAST READ IT, and the only copy of those bytes is the tab's own
   * `savedContents`. Main never had them. The far side computes the same
   * digest over the same bytes, and a mismatch is exactly the answer that
   * refuses the write, so a wrong digest here can only ever refuse a save. It
   * can never cause one.
   *
   * Null when this page has no digest program at all, which is a build
   * question rather than a machine question.
   */
  const sha256Hex = async (text: string): Promise<string | null> => {
    const subtle = globalThis.crypto?.subtle;
    if (subtle === undefined) return null;
    const digest = await subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  };

  /**
   * PHASE 277, audit F1. THE ONE PLACE A SAVE CLEARS A TAB.
   *
   * `savedContents` is a fact about the FILE: the write answered `wrote`, so
   * the file holds `value` and the baseline moves, always. `dirty` is a fact
   * about the BUFFER, and it is not ours to assert — it is asked of the model,
   * with the same question MonacoHost.tsx:311 asks on every keystroke
   * (`model.getValue() !== current.savedContents`), so this product holds one
   * definition of dirty rather than two that agree until they do not.
   *
   * WHAT IT STOPS, MEASURED AT b4569686. Each of the four success arms below
   * moved `savedContents` and then asserted a CLEAN tab from a literal, with no
   * question put to the buffer at all. The
   * auditor's fixture (docs/audits/fixtures/2026-09-14) drives the sequence: a
   * save of `first edit` is in flight, the person types `first edit plus newer
   * typing`, a second timer is armed, and then the FIRST acknowledgement
   * arrives and says the tab is clean. `notePatched` in ./auto-save reads
   * that clean edge and cancels the pending timer, so the reading is a newer
   * model, older saved text, `dirty:false` and 0 pending timers.
   *
   * From there the tab is unsaved work that nothing in the product knows is
   * unsaved. `closeTab` in ./store prompts only when `dirty` is true, so
   * the question that exists to save a person's work is never asked. The
   * eviction filter in `openFromRequest` drops a clean, untouched tab whole,
   * model and all. And `refreshRepo` below reloads a tab only `if (!tab.dirty)`
   * — that skip is what stops the watcher writing an agent's bytes over a
   * person's typing, and a falsely clean tab walks straight through it, which
   * is a quieter loss than any close.
   *
   * AND THE LIFETIME COMES FIRST. A tab id is an absolute path
   * (`tabIdFor` in ./tab-identity), so closing a file and reopening it hands the id
   * straight back, and before this the previous lifetime's acknowledgement
   * patched the NEW tab: measured `{"saved":"first edit","dirty":false}` over a
   * buffer holding what the file says now. `model` is the instance this save
   * read `value` from; `forceCloseTab` disposes it and drops the key
   * (./monaco-loader `disposeModels`), and reopening creates a fresh one, so
   * two lifetimes of one path are two objects and `===` is the whole test. If
   * the key now holds a different instance, or none, the tab this write
   * belonged to is gone and there is nothing here to say about the one that
   * took its place.
   *
   * THE COST IS ONE RETAINED REFERENCE for the length of one write, and that is
   * all this identity costs. The three alternatives are refused by name in
   * build/p277/SPEC.md §1.2: `model.id` answers the same question in a Monaco
   * vocabulary this codebase uses nowhere else, `getAlternativeVersionId()`
   * would give this product a second definition of dirty for the sake of an
   * O(1) compare of a buffer a person has just stopped typing into, and a
   * generation counter on `EditorTab` is new durable state for a fact the model
   * already holds.
   *
   * IT RETURNS `true` IN BOTH ARMS. A write really happened, and a dead
   * lifetime does not make it a failure. And `true` is NOT "the tab is clean":
   * in the live arm the tab stays dirty when typing arrived during the write.
   * The fix round found `promptDirtyClose` in ./store closing a tab on that
   * `true` with the newer typing still in it, so that caller now asks the tab
   * again — the same buffer, and clean — before it closes anything.
   */
  const completeSave = (
    id: string,
    model: WorkingModel,
    value: string
  ): true => {
    const now = getWorkingModel(id);
    if (now === null || now !== model) return true;
    deps.patch(id, { savedContents: value, dirty: now.getValue() !== value });
    return true;
  };

  /**
   * Save one tab whose file is on another machine (Phase 101).
   *
   * THE ORDER MATTERS AND IT IS THE SAFETY PROPERTY. A file outside every
   * project open on that machine is answered here, on this Mac, before
   * anything is composed. Everything past that is main's decision: main checks
   * the machine's agreement, chooses the folder from that machine's open
   * projects by the same shared rule this renderer read, refuses a `.git` or
   * `.ssh` path and a payload over the cap, and has that machine compare the
   * folder's identity with the one it read when the project was opened, in
   * the same call as the write. This function never sends a folder and never
   * chooses one (Phase 336).
   *
   * A SUCCESS SHOWS NOTHING. The dirty dot clears, which is exactly what a save
   * on this Mac does. Two behaviours on one surface are harder to learn than
   * one, so there is no success toast, not even for the first save on a
   * machine.
   */
  const saveOnMachine = async (
    id: string,
    tab: EditorTab,
    remote: OpenFileRemoteRef
  ): Promise<boolean> => {
    const label = remote.machineLabel;
    const sticky = { sticky: true } as const;
    const app = useApp.getState();
    const folder = remoteWriteFolderIn(
      app.machineStates,
      app.projects,
      remote.machineId,
      tab.path,
      'file'
    );
    if ('refused' in folder) {
      // PHASE 336. The toast says which folders Tortie saves in on that
      // machine, and carries NO button. Phase 229 gave it "Open settings",
      // because the one door that turned saving on was there; that door is
      // gone, and a project open on a confirmed machine saves with nothing
      // asked, so there is nothing in Settings for a person to do.
      app.toast('error', remoteSaveRefusedFor(folder.refused, label), sticky);
      return false;
    }
    // The tabs that are not edit surfaces on any computer, and a file larger
    // than Tortie can save there (Phase 336), whose band already says so. They
    // are checked after the refusal above so that a file outside every
    // project still says the one thing a person can act on.
    if (
      tab.deleted ||
      tab.truncated ||
      tab.saveCapped !== undefined ||
      tab.error !== null
    ) {
      return false;
    }
    const machines = gmux ? gmux.machines : undefined;
    if (machines === undefined || typeof machines.putFile !== 'function') {
      useApp.getState().toast('error', NO_REMOTE_SAVE, sticky);
      return false;
    }
    const model = getWorkingModel(id);
    if (model === null) return false;
    const value = model.getValue();
    const bytes = new TextEncoder().encode(value).length;
    const expect = await sha256Hex(tab.savedContents);
    if (expect === null) {
      useApp.getState().toast('error', NO_REMOTE_SAVE, sticky);
      return false;
    }
    try {
      const result = await machines.putFile({
        machineId: remote.machineId,
        path: tab.path,
        contents: value,
        expect
      });
      if (result.outcome === 'wrote') {
        // PHASE 277. The same completion rule as the three local doors, and
        // this arm is why the audit asked for the remote one to be inspected
        // too: it already held the model instance in `model` above and threw
        // the answer away. Nothing about the write, the precondition or the
        // announcement below moves.
        const done = completeSave(id, model, value);
        // PHASE 230. The one write in this product that re-read nothing
        // afterwards: research 89 section 4.4 measured a file saved by this
        // door absent from Source control for 30 s and from the Explorer when
        // it was looked at. Every remote view on that machine hears this.
        announceRemoteWrite({
          machineId: remote.machineId,
          path: tab.path,
          kind: 'file',
          by: 'editor'
        });
        return done;
      }
      useApp
        .getState()
        .toast(
          'error',
          remoteSaveRefusal(
            result.outcome,
            label,
            result.writeRoot,
            result.bytes ?? bytes
          ),
          sticky
        );
      return false;
    } catch (err) {
      // NO "Could not save this file." HERE, AND THAT IS THE POINT.
      // `build/probe-p101-save.mjs` leg 14 killed a real ssh over a real link
      // while the far side was decoding an 89,000 byte payload, and the far
      // side replaced the file in full. Only the answer was lost. A sentence
      // saying the save failed would then be false about a file on somebody's
      // other computer.
      //
      // Main's own sentence for that case is shorter than 160 characters, so
      // `errorSentence` shows it. Anything longer, or anything shaped like
      // machinery, is a link failure with no sentence for a person, and the
      // fallback below is what they read.
      useApp
        .getState()
        .toast('error', errorSentence(err, remoteSaveLostAnswer(label)), sticky);
      return false;
    }
  };

  /**
   * The unconditional write this product has had since Phase 5, unchanged.
   *
   * `fs:writeFile` is NOT removed and NOT modified. It is what a file OUTSIDE
   * every open project root takes — the Context detail tab on a global
   * `~/.claude/CLAUDE.md` is the ordinary case — because the guarded channel
   * would refuse such a path `outside`, and refusing it here would take away a
   * save a person has today.
   *
   * NOTHING CALLS IT DIRECTLY except `saveOutsideProject` below, and the
   * Overwrite that door offers is that same door called again rather than a
   * write of its own, so every plain write in this file is answered for by the
   * reading in front of it. `npm run conformance:save` rule 2b is what keeps
   * that true, and the committer's round is why it is one caller rather than
   * two.
   */
  const writePlain = async (
    id: string,
    tab: EditorTab,
    model: WorkingModel,
    value: string
  ): Promise<boolean> => {
    if (!gmux) return false;
    try {
      await gmux.fs.writeFile(tab.path, value);
      // PHASE 277. The same completion rule as the other three doors. This one
      // is the widest window of the local writes that are not behind a dialog:
      // `fs:writeFile` has no compare-and-swap, so the await is one IPC round
      // trip a person can type through.
      return completeSave(id, model, value);
    } catch (err) {
      useApp
        .getState()
        .toast(
          'error',
          `Could not save this file. ${errorSentence(err, 'The write failed.')}`,
          { sticky: true }
        );
      return false;
    }
  };

  /**
   * PHASE 240 FIX ROUND. What the file says NOW, against a text it is expected
   * to still hold.
   *
   * `same` means the text on disk is still `expect`, `changed` carries what it
   * says instead, `absent` is a file that could not be read at all, and
   * `oversize` is one that came back truncated. A draft that has never been
   * saved reads `absent`, because its file does not exist yet and that is the
   * point of it.
   *
   * THE EXPECTED TEXT IS THE CALLER'S, and the committer's round is why. Both
   * of the first callers asked "is it still `tab.savedContents`", and the plain
   * door's Overwrite has to ask a different question: is the file still the
   * text the person was SHOWN when they were asked. Comparing against
   * `savedContents` there would answer `changed` for ever and re-ask a question
   * that was already answered.
   *
   * THE TWO UNREADABLE ANSWERS ARE TOLD APART for the same round's reason. They
   * were one word, and the plain door wrote on both: a file that grew past the
   * read cap while somebody typed was replaced by the buffer whole, with its
   * tail gone and nothing said, where the guarded channel refuses it
   * `tooLarge`. A file that is not there is the opposite — writing it is the
   * whole point of a draft.
   *
   * IT IS A TEXT COMPARISON AND NOT A DIGEST, because that is the only question
   * this side of the bridge can ask: `fs:readFile` hands the renderer a DECODED
   * string and never the bytes.
   */
  const diskReading = async (
    tab: EditorTab,
    expect: string
  ): Promise<
    | { kind: 'same' }
    | { kind: 'changed'; text: string }
    | { kind: 'absent' }
    | { kind: 'oversize' }
  > => {
    if (!gmux) return { kind: 'absent' };
    let disk;
    try {
      disk = await gmux.fs.readFile(tab.path);
    } catch {
      return { kind: 'absent' };
    }
    if (disk.truncated) return { kind: 'oversize' };
    return disk.contents === expect
      ? { kind: 'same' }
      : { kind: 'changed', text: disk.contents };
  };

  /**
   * PHASE 240 COMMITTER'S ROUND. The one thing a decoded string can say about
   * the bytes underneath it.
   *
   * `fs:readFile` decodes with `Buffer.toString('utf8')`, which turns every
   * byte sequence that is not UTF-8 into U+FFFD and never says that it did. So
   * a text carrying U+FFFD is a text whose bytes may not survive being written
   * back, and writing the buffer whole puts EF BF BD where the file had
   * something else. That is research 83 E.7b's loss, and it was measured on
   * this very door in the running app at 5077ed65: a 49 B latin-1 `.txt`
   * reached through a symbolic link inside a project, typed into and saved,
   * went to 58 B with four U+FFFD written into it, no dialog and no toast. The
   * guarded channel refuses exactly that by comparing raw bytes; the plain door
   * has no bytes, so this is the question it can ask instead.
   *
   * THE STATED LIMIT IS THE FALSE POSITIVE, and it is deliberate. A file that
   * really is UTF-8 and really holds a U+FFFD character is refused a save on
   * this door and told it is not UTF-8, which is wrong about that one file. The
   * other direction destroys somebody's bytes with nothing said, and this way
   * the two doors answer the same word about the same file.
   */
  const decodeLost = (text: string): boolean => text.includes('\uFFFD');

  /**
   * The plain door, with a reading in front of it (Phase 240 fix round) and the
   * same reading in front of its Overwrite (Phase 240 committer's round).
   *
   * WHAT THIS CLOSES. As Phase 240 first shipped, three shapes reached
   * `fs:writeFile` with no check of any kind, and the header of
   * ./save-sentences said of the first of them that "nothing is lost by it".
   * That sentence was refuted by measurement in the running app: a file inside
   * a project that is a SYMBOLIC LINK was typed into, a `/bin/sh` wrote 17
   * bytes into the link's target, ⌘S — and the outside write was gone with no
   * dialog, no toast and a clean tab. It is issue 16 exactly, on a file that
   * happens to be a link. The other two are a file outside every open project,
   * which is where an agent edits `~/.claude/CLAUDE.md`, and a draft that has
   * never been saved, whose path may have grown a file since the draft opened.
   *
   * AND THE OVERWRITE IT OFFERED WAS UNCONDITIONAL, WHICH WAS THIS PHASE'S OWN
   * SUBJECT LINE UNMET ON THREE OF THE FOUR DOORS A ⌘S CAN TAKE. The reason
   * written down for it was that "re-reading before it would find the same
   * difference for ever", and the guarded door ten lines below refutes it: it
   * re-reads against the digest of what was SHOWN rather than against
   * `savedContents`, and it terminates. Measured in the running app at
   * 5077ed65, a third writer landing while the question was on screen lost 38
   * characters here and was refused on the guarded door in the same run, and at
   * node level 500 of 500 against 0 of 500. So this door carries the text it
   * showed into its Overwrite, reads the file again at the press, and writes
   * only if the file is still what the person was looking at. Every round needs
   * another writer to arrive, so it terminates for the guarded door's reason.
   *
   * THE STATED LIMIT IS THE WINDOW, and it is wider than the guarded channel's:
   * there is no compare-and-swap here, so a write landing between the reading
   * and the write below is lost. That window is one IPC round trip rather than
   * two system calls, and it is no longer however long a person looks at a
   * dialog. It is not closed here because closing it means giving the guarded
   * channel a mode for a link and for a file in no project, which is a change
   * to the channel and this phase changes nothing about it.
   *
   * PHASE 277. `model` is the instance `value` was read from, carried down to
   * `writePlain` so the acknowledgement can ask that buffer whether it is still
   * dirty rather than asserting that it is not. The Overwrite this door offers
   * re-reads the model at the PRESS instead, because a dialog is the one place
   * the value and the buffer are taken at different moments — the value is what
   * the person was shown and it must not move, and the buffer is whatever they
   * have now.
   */
  const saveOutsideProject = async (
    id: string,
    tab: EditorTab,
    model: WorkingModel,
    value: string,
    shown: string
  ): Promise<boolean> => {
    if (!gmux) return false;
    const disk = await diskReading(tab, shown);
    if (disk.kind === 'oversize') {
      useApp
        .getState()
        .toast('error', saveRefusalSentence('tooLarge', tab.name), {
          sticky: true
        });
      return false;
    }
    // A file that is not there holds no bytes to damage, which is the whole
    // point of a draft, so it reads as the empty string here and passes.
    const onDisk =
      disk.kind === 'changed' ? disk.text : disk.kind === 'same' ? shown : '';
    if (decodeLost(onDisk)) {
      useApp
        .getState()
        .toast('error', saveRefusalSentence('notUtf8', tab.name), {
          sticky: true
        });
      return false;
    }
    if (disk.kind !== 'changed') return writePlain(id, tab, model, value);
    const again = disk.text;
    offerStaleChoice(tab, value, () => {
      // PHASE 277. The press is a fresh save request, so it takes the slot the
      // same way ⌘S does, and it re-reads the buffer here rather than carrying
      // the one this call read: a person can look at this dialog for as long as
      // they like, and `value` is what they were SHOWN. A `null` model is a tab
      // that was closed under the dialog — the press writes nothing and says
      // nothing new, because there is no buffer left for the answer to be about.
      const now = getWorkingModel(id);
      if (now === null) return;
      void withSaveSlot(id, 'explicit', () =>
        saveOutsideProject(id, tab, now, value, again)
      );
    });
    return false;
  };

  /**
   * PHASE 240. Open the comparison a `stale` answer offers, being what the
   * file says on disk RIGHT NOW against the buffer that was refused.
   *
   * The disk side is read here rather than carried from the refusal, because
   * the person may have read the dialog for a while and the honest left side
   * is the one at the moment they pressed Compare. Nothing is written by any
   * path through this function.
   */
  const openCompare = async (tab: EditorTab, value: string): Promise<void> => {
    if (!gmux) return;
    let disk;
    try {
      disk = await gmux.fs.readFile(tab.path);
    } catch {
      useApp
        .getState()
        .toast('error', saveRefusalSentence('io', tab.name), { sticky: true });
      return;
    }
    if (disk.truncated) {
      // A partial left side would read as "the agent deleted the second half",
      // which is a worse answer than saying the file is too large.
      useApp
        .getState()
        .toast('error', saveRefusalSentence('tooLarge', tab.name), {
          sticky: true
        });
      return;
    }
    requestOpenFile({
      repoPath: tab.repoPath,
      relPath: tab.relPath,
      path: tab.path,
      mode: 'diff',
      source: 'tree',
      // Never a preview tab: it would be consumed by the next single click,
      // and a person reading a comparison is deciding something.
      preview: false,
      compare: { left: disk.contents, right: value }
    });
  };

  /**
   * PHASE 240 ITEM 2. `stale` IS A CHOICE, NOT A REFUSAL.
   *
   * He named VS Code and VS Code offers three: overwrite, compare, cancel.
   * This is the same three in Tortie's own words, in the shape the house
   * already has for a decision — `ConfirmSpec.altLabel`, whose one other user
   * is `promptDirtyClose` and whose comment reads "the one dialog in gmux with
   * three answers. A two-button destructive confirm on a dirty buffer can only
   * lose work." That is this dialog's argument word for word.
   *
   * THE DEFAULT IS NOT OVERWRITE, and the layout is forced by `ConfirmDialog`:
   * it focuses the confirm button on open and a bare Return runs it. So
   * Compare is the confirm, Overwrite is the alt drawn leading-left away from
   * it, and Cancel sits between them and is what Escape and a scrim click
   * already do. Nothing is `destructive`, because the primary is a look.
   *
   * ITEM 3. OVERWRITE IS A SECOND, DELIBERATE ACT and it goes through the SAME
   * channel with the digest of what was JUST READ, which the channel hands
   * back on `stale` for exactly this reason. So a THIRD writer arriving
   * between the dialog appearing and the button being pressed is answered
   * `stale` again and offered the same choice against the newer bytes, rather
   * than being written over. The loop terminates because every round needs
   * another write to arrive.
   *
   * PHASE 240 FIX ROUND. THE OVERWRITE IS THE CALLER'S, handed in rather than
   * composed here, because there are two doors now and each owns a different
   * second write. The guarded door's is `overwrite` below, guarded against the
   * digest the channel handed back. The plain door's is `saveOutsideProject`
   * called again with the text it showed, which reads the file at the press and
   * only writes if it is still what the person was looking at.
   *
   * PHASE 240 COMMITTER'S ROUND. THAT SECOND SENTENCE USED TO SAY THE PLAIN
   * DOOR'S OVERWRITE WAS UNCONDITIONAL, and this dialog's own promise above —
   * that a third writer is offered the same choice rather than written over —
   * was true of one door and false of three. Measured in the running app, 38
   * characters destroyed on the plain door while the guarded one re-asked in
   * the same run.
   */
  const offerStaleChoice = (
    tab: EditorTab,
    value: string,
    onOverwrite: () => void
  ): void => {
    useApp.getState().setConfirm({
      title: staleSaveTitle(tab.name),
      body: STALE_SAVE_BODY,
      confirmLabel: SAVE_COMPARE_LABEL,
      onConfirm: () => {
        void openCompare(tab, value);
      },
      altLabel: SAVE_OVERWRITE_LABEL,
      onAlt: onOverwrite
    });
  };

  /**
   * The deliberate second write, guarded against what was just read.
   *
   * PHASE 277. It takes `model` like every other door, and `pressOverwrite`
   * below is the only thing that calls it — that is where the buffer is
   * re-read, at the press, because this write's `value` is the text the person
   * was shown on the dialog and the dialog may have been open for a while.
   * Its own second `stale` goes back through the same press, so a third writer
   * is still asked about rather than written over.
   */
  const overwrite = async (
    id: string,
    tab: EditorTab,
    model: WorkingModel,
    value: string,
    onDisk: string
  ): Promise<boolean> => {
    const result = await guardedSave({
      root: tab.repoPath,
      path: tab.path,
      expect: onDisk,
      contents: value
    });
    if (result.outcome === 'wrote') {
      return completeSave(id, model, value);
    }
    if (result.outcome === 'unguarded') {
      return saveOutsideProject(id, tab, model, value, tab.savedContents);
    }
    if (result.outcome === 'stale') {
      const again = result.sha256;
      offerStaleChoice(tab, value, () => {
        pressOverwrite(id, tab, value, again);
      });
      return false;
    }
    useApp
      .getState()
      .toast('error', saveRefusalSentence(result.why, tab.name), {
        sticky: true
      });
    return false;
  };

  /**
   * PHASE 277. Somebody pressed Overwrite on the guarded door's stale dialog.
   *
   * IT IS A DIALOG PRESS, WHICH IS WHY IT IS HERE AND NOT INLINE. A press is a
   * fresh save request arriving from a click, so it takes the buffer's save
   * slot the same way ⌘S does rather than racing whatever is in flight, and it
   * re-reads the buffer at the moment of the press. `value` deliberately does
   * NOT move:
   * it is the text the person was shown when they were asked, and re-reading it
   * here would write something they were never asked about. The BUFFER is a
   * different question — it is what the completion rule compares against to
   * decide whether the tab is still dirty afterwards.
   *
   * A `null` model is a tab that was closed while the dialog was open. The
   * press writes nothing and says nothing new: there is no buffer left for an
   * answer to be about, and the file is whatever the other writer made it.
   *
   * Both stale arms that can reach an Overwrite of a guarded write funnel here
   * — `saveInProject`'s first refusal and `overwrite`'s own second one — so
   * there is exactly one spelling of what a press does.
   */
  const pressOverwrite = (
    id: string,
    tab: EditorTab,
    value: string,
    onDisk: string
  ): void => {
    const now = getWorkingModel(id);
    if (now === null) return;
    void withSaveSlot(id, 'explicit', () =>
      overwrite(id, tab, now, value, onDisk)
    );
  };

  /**
   * PHASE 240 ITEM 1. Save a file INSIDE an open project through the guarded
   * channel, with the digest of `tab.savedContents` as the precondition.
   *
   * `savedContents` is BY DEFINITION what Tortie last read, so the digest of
   * it is the answer to "is the file still what the buffer was built from".
   * That is the whole of issue 16: `refreshRepo` deliberately stops re-reading
   * a tab from the first keystroke (research 83 A4.3), so from that moment the
   * tab holds bytes the disk no longer has, and the old save landed on top of
   * whatever an agent had written with nothing said.
   *
   * The digest is computed here rather than in ./save-write because
   * `saveOnMachine` above already has one for the remote precondition, and a
   * third copy of a sha256 helper is the growth guardrail's own example. A
   * page with no digest program at all cannot be guarded and takes the old
   * door, exactly as it does today.
   *
   * PHASE 277, AND THIS IS THE ARM THE AUDIT NAMED. Its `wrote` arm was the
   * unconditional clean patch the fixture drives, and the digest above is also
   * the whole of the window the stated limit is about: `run` in ./auto-save
   * re-reads the policy in the last synchronous moment it owns, and this single
   * `await` is what stands between that read and the bridge call. A switch to
   * Off landing inside it does not interrupt the write, and it stops every
   * timer that has not reached here. A timer never reaches here LATER than
   * that: one that finds a save already running is answered false by
   * `withSaveSlot` and re-armed, rather than waiting a whole write for its turn
   * with the policy it read before the wait (the fix round's finding).
   */
  const saveInProject = async (
    id: string,
    tab: EditorTab,
    model: WorkingModel,
    value: string,
    reason: SaveReason
  ): Promise<boolean> => {
    const expect = await sha256Hex(tab.savedContents);
    // PHASE 268. A page with no digest program at all cannot be guarded, so
    // there is no precondition to write behind and a timer stops rather than
    // falling through. ⌘S is unchanged.
    if (expect === null) {
      if (reason === 'auto') return deps.autoStop(id, { kind: 'link' });
      return saveOutsideProject(id, tab, model, value, tab.savedContents);
    }
    const result = await guardedSave({
      root: tab.repoPath,
      path: tab.path,
      expect,
      contents: value
    });
    if (result.outcome === 'wrote') {
      // PHASE 277, audit F1. THE LINE THE AUDIT NAMED (tab-io.ts:1239 at the
      // parent), where one `deps.patch` moved the baseline and asserted a clean
      // tab in the same breath.
      return completeSave(id, model, value);
    }
    // A symbolic link, which the channel will not turn into a regular file.
    // It takes the plain door, which now reads the file first.
    // ./save-sentences SaveRefusalWord carries the argument.
    //
    // PHASE 268. IT IS THE ONE DOOR AUTO SAVE MAY NOT TAKE, and this is the
    // arm a later round reopens for convenience. The plain door's own stale
    // answer opens a DIALOG, and its read-then-write window is one IPC round
    // trip wide (./save-sentences, the stated limit). A timer opens no dialog
    // and does not get an unguarded write, so it stops here and says so once.
    // `conformance:save` rule 11b is what keeps this test in front of the
    // door name.
    if (result.outcome === 'unguarded') {
      if (reason === 'auto') return deps.autoStop(id, { kind: 'link' });
      return saveOutsideProject(id, tab, model, value, tab.savedContents);
    }
    if (result.outcome === 'stale') {
      // PHASE 240 FIX ROUND. A `stale` ANSWER IS NOT ALWAYS A CHANGE ON DISK,
      // and as this phase first shipped it was always read as one.
      //
      // The precondition above is the digest of the DECODED text, because a
      // decoded string is all `fs:readFile` ever hands this side of the
      // bridge, and the channel hashes the RAW BYTES. For every file that
      // survives a UTF-8 round trip those are the same digest. For a file
      // that does not — a latin-1 `.txt`, measured in the running app — they
      // can never be equal, so the channel answered `stale` on a file NOBODY
      // HAD WRITTEN TO and the person read "'latin.txt' changed on disk /
      // Something wrote to it after Tortie read it", which is false, and the
      // true sentence only arrived if they pressed Overwrite, because the
      // channel decides `stale` at step 5 and `notUtf8` at step 6.
      //
      // So the disk is read once more. If the text is still exactly what the
      // buffer was built from then nothing wrote to this file, and the only
      // thing that can differ is the bytes underneath the same text, which is
      // precisely the round trip the channel refuses. The person hears that
      // instead, and still nothing is written.
      //
      // THE ONE MISREPORT THIS CAN MAKE is a writer that put the file back to
      // exactly the text Tortie read, between the channel's read and this
      // one: the sentence would name the encoding rather than the writer.
      // Nothing is written either way, and the next ⌘S answers `wrote`.
      if ((await diskReading(tab, tab.savedContents)).kind === 'same') {
        if (reason === 'auto') {
          return deps.autoStop(id, { kind: 'refused', why: 'notUtf8' });
        }
        useApp
          .getState()
          .toast('error', saveRefusalSentence('notUtf8', tab.name), {
            sticky: true
          });
        return false;
      }
      // PHASE 268. Something really did write under the buffer, which is issue
      // 16's own event. The choice stays the explicit save's: `offerStaleChoice`
      // is a question, and the timer that reached here asked nobody anything.
      if (reason === 'auto') return deps.autoStop(id, { kind: 'stale' });
      const again = result.sha256;
      offerStaleChoice(tab, value, () => {
        pressOverwrite(id, tab, value, again);
      });
      return false;
    }
    if (reason === 'auto') {
      return deps.autoStop(id, { kind: 'refused', why: result.why });
    }
    useApp
      .getState()
      .toast('error', saveRefusalSentence(result.why, tab.name), {
        sticky: true
      });
    return false;
  };

  /**
   * ONE save of one tab, from the top: the ladder of refusals, then one of the
   * three doors.
   *
   * PHASE 240: this function names no write at all. It is the ladder of
   * refusals it has always been, and the write itself is one of the three doors
   * above — the machine, the guarded channel, or the plain one. That is what
   * `npm run conformance:save` reads by matching braces: this body must not
   * name `fs:writeFile`.
   *
   * PHASE 277 RENAMED IT FROM `save`, and the rename is the point rather than
   * tidying. `save` is now the serializer below, because the serializer has to
   * be the function the store calls; this is the ladder, because the ladder has
   * to be the function the gate reads. `conformance:save` rules 1 and 11 moved
   * to this name in the same commit, and rule 1 gained a second half asking the
   * serializer the same question, which is strictly stronger than asking one of
   * them.
   *
   * IT RE-READS EVERYTHING IT NEEDS. The tab, the buffer and the model are
   * taken here and nowhere earlier, so a follow-up that ran because a first
   * save was in flight writes what the person holds NOW rather than what they
   * held when they asked.
   */
  const saveOnce = async (
    id: string,
    reason: SaveReason = 'explicit'
  ): Promise<boolean> => {
    const tab = deps.byId(id);
    if (!gmux || tab === undefined) return false;
    // History is immutable: ⌘S on a commit tab is a no-op, never a write of
    // an old revision over the live file. Phase 73: a review tab is refused
    // here too, and for a stronger reason. Its path names a file on another
    // computer, so a write would land on whatever this Mac holds at that path.
    if (tab.commit !== null) return false;
    // Phase 160. The architecture map is a drawing, not a file: there are no
    // bytes to write and its `path` is a repository root, so a save could only
    // ever try to write a file over a directory. Refused silently, like a
    // commit tab, because the tab can never be dirty and ⌘S over it means
    // nothing rather than something that failed.
    if (tab.archMap !== undefined) return false;
    // Phase 163. The diagnostics report is a capture, not a file, and its
    // path is a project root. Refused silently for the map's reason.
    if (tab.diagnostics !== undefined) return false;
    // PHASE 240. A comparison holds two versions of a file and NEITHER is what
    // the file says now: the left is what was on disk when a save was refused,
    // the right is the buffer that was refused. Writing either one back would
    // be this phase's own defect wearing a different tab. Refused silently,
    // like the map, because the tab can never be dirty.
    if (tab.compare !== undefined) return false;
    // PHASE 343. A tab the Explorer opened through a link to a folder is read
    // only on both computers. Refused silently, like the map and the
    // comparison, and BEFORE the remote branch: an explicit ⌘S on a CLEAN tab
    // still writes (below), so without this a ⌘S with no typing replaced the
    // file an in-project link points at, and through a link out of the project
    // it raised the `outside` sentence a person should never meet.
    if (tab.throughLink === true) return false;
    // PHASE 90.3. A review tab was refused here silently since Phase 73, so a
    // person who typed and pressed Save was told nothing at all, which reads as
    // a save that worked. It was refused OUT LOUD from that phase, naming the
    // machine.
    //
    // PHASE 101. It is a save now, on the machines a person has confirmed a
    // folder for, and it is still the same refusal on every other machine.
    // `saveOnMachine` below owns both halves, and every sentence it says is in
    // ./../machines/editor.ts with every other sentence this renderer says
    // about a machine, so the vocabulary audit reads one file.
    if (tab.remote !== undefined) return saveOnMachine(id, tab, tab.remote);
    if (tab.deleted || tab.truncated || tab.error !== null) return false;
    const model = getWorkingModel(id);
    if (model === null) return false;
    const value = model.getValue();
    // PHASE 240. TWO DOORS, and which one a save takes is decided by a
    // predicate that already ships. `fs:writeGuarded` requires an OPEN project
    // root with the path inside it, resolved through the same gate
    // `fs:createFile`, `fs:rename`, `fs:move` and `fs:trash` ask. Two shapes
    // of tab save fine today and would be refused `outside` if every save went
    // through it (research 100 §2.1): a Context detail tab on a global
    // `~/.claude/CLAUDE.md`, which `openFileAt` opens as an ordinary editable
    // tab carrying the project's `repoPath`, and any file outside the
    // repository. `fileInRepo` is the discriminator `refreshRepo` already uses
    // to decide which tabs may be asked about HEAD.
    //
    // PHASE 240 FIX ROUND, AND IT CORRECTS THIS COMMENT'S OWN LAST SENTENCE,
    // which read "and it is the same question here". IT IS NOT THE SAME
    // QUESTION. `fileInRepo` is a pure prefix test on `tab.repoPath`, while
    // the guarded channel asks `resolveOpenProjectRoot` against the projects
    // Tortie has OPEN, and closing a project does not close its tabs. So a
    // dirty tab whose project was closed is inside its repoPath, takes the
    // guarded door, and is refused `outside` where the parent commit wrote the
    // file. That refusal STANDS, because every other mutation in this product
    // — create, rename, move, trash — asks the same gate and refuses the same
    // way, and nothing is lost by it: the buffer keeps the typing and
    // reopening the project saves it. What was wrong was the sentence, which
    // said "not inside an open project" and named no remedy; ./save-sentences
    // carries the one a person can act on.
    //
    // A DRAFT THAT HAS NEVER BEEN SAVED TAKES THE PLAIN DOOR. Phase 63's draft
    // tab holds composed text whose file DOES NOT EXIST, with `savedContents`
    // empty, so the guarded channel opens nothing and answers `missing`, and a
    // person would read "it is no longer on disk" about a file that was never
    // there — driven in the running app at 3efc8db2 and read off the toast.
    //
    // IT IS A CAPABILITY THIS PHASE BROKE RATHER THAN A REGRESSION ANYBODY
    // MET, and the fix round found that by driving it: NOTHING in this tree
    // emits a draft open. Architecture's "Draft a contract" has main write the
    // seed files itself, and `OpenFileRequest.draft` has no emitter at all. The
    // door is right either way and it is three words, so it is fixed here
    // rather than left for whoever writes the first emitter to rediscover.
    //
    // The predicate is `refreshRepo`'s own, below, so the two agree by
    // construction, and the plain door reads the path first, which is the
    // question that matters for a draft — has somebody put a file here since
    // it opened.
    const neverSaved = tab.draft != null && tab.savedContents === '';
    const guarded = !neverSaved && fileInRepo(tab.repoPath, tab.path);
    // PHASE 268. AUTO SAVE NEVER TAKES THE PLAIN DOOR. It is unguarded, and
    // issue 16 measured what an unguarded write costs when somebody else got
    // there first: 173 bytes of an agent's paragraph, with nothing said. A
    // person's ⌘S still takes it, with the reading and the three answers in
    // front of it; a timer stops instead and the buffer keeps the typing.
    // build/p268/SPEC.md section 0, and `conformance:save` rule 11.
    if (reason === 'auto' && !guarded) return false;
    return guarded
      ? saveInProject(id, tab, model, value, reason)
      : saveOutsideProject(id, tab, model, value, tab.savedContents);
  };

  /**
   * PHASE 277, audit F1's third clause. ONE SAVE AT A TIME PER BUFFER, and a
   * person's second request is REMEMBERED rather than raced or dropped.
   *
   * WHAT IT REPLACES, AND BOTH HALVES WERE BROKEN. The scheduler kept an
   * in-flight set of its own (./auto-save, deleted in this phase), which was a
   * second truth about one fact kept in the module ⌘S cannot see, so it stopped
   * a timer racing a timer and nothing else. Measured at b4569686:
   *
   *   - ⌘S while a timer's save is in flight submitted TWO guarded writes
   *     against the same frozen precondition, and the loser was answered
   *     `stale`. The person read "'notes.md' changed on disk / Something wrote
   *     to it after Tortie read it" about a writer that does not exist, and in
   *     the auto direction it also recorded a permanent stop and a sticky
   *     toast. Spending issue 16's one sentence on Tortie's own timer teaches a
   *     person to press Overwrite on the dialog that exists to stop them.
   *   - A second timer expiring during a held write was DROPPED rather than
   *     deferred — `run` deleted the handle before its in-flight check and
   *     nothing re-armed. Reading: `writes=1, pending=0`, newer model, older
   *     saved text, `dirty:false`. That arm reaches the audit's exact end state
   *     with the clean-edge cancellation never involved at all.
   *
   * A TIMER'S REQUEST IS NEVER REMEMBERED HERE, and the fix round is why. As
   * this phase first built it, a timer that found the slot held was queued, and
   * the queued request ran a whole write later without asking anything again:
   * it wrote after the person switched auto save Off, it wrote under "Save
   * changes to 'notes.md'?", and it wrote into a tab reopened in the meantime.
   * `run` in ./auto-save had asked the policy, the dialog and the tab before
   * the request was queued, not before it ran. So an `auto` request that finds
   * the slot held is answered false at once, and `run` RE-ARMS a tab its save
   * left dirty, through `arm`, which asks every question again when the timer
   * next falls due. Deferred rather than dropped, and never unasked.
   *
   * A PERSON'S FOLLOW-UP IS AT MOST ONE. Extra ⌘S presses JOIN the one already
   * queued rather than stacking, and they hand back its promise, so ten presses
   * during one write are one extra save and ten callers with the same answer.
   *
   * THE SLOT BELONGS TO A BUFFER, NOT TO A PATH. A tab id is an absolute path
   * and a close and reopen hands the same id to a different model, so the slot
   * records the model instance that took it — the same identity
   * `completeSave` compares. A slot held by a buffer that is gone blocks
   * nothing: before the fix round, one write that never answered (the local
   * channel has no deadline, and a remote put can take 60 s) held the slot for
   * every later lifetime of that path, and every ⌘S on the reopened file joined
   * a queue that could not drain and said nothing. And a queued request whose
   * buffer is gone by the time it would run writes nothing and answers false,
   * so a ⌘S made in one lifetime can never write the typing of the next.
   *
   * IT IS DEADLOCK-FREE BY CALL SITE, NOT BY LUCK. `withSaveSlot` is called
   * from exactly three places — `save`, `pressOverwrite` and the plain door's
   * Overwrite — and from nothing that runs INSIDE a slot. The two presses fire
   * from a click, long after the `save` that raised their dialog resolved
   * false. A call from inside a body would queue a follow-up that can only run
   * when that body returns, and the body would be waiting on it.
   *
   * THE ONE CORNER, STATED, AND IT IS REACHABLE. A queue entry carries no body,
   * so a follow-up always runs the ladder fresh as a ⌘S. A person who presses
   * ⌘S twice and whose first press is answered `stale` gets the dialog, and the
   * second press starts the moment the first releases the slot — under that
   * dialog, because it is their own request, made before the question was
   * asked, and it may raise the same question again. An Overwrite pressed while
   * that second save is in the air joins it as an ordinary save, so the person
   * is asked again rather than overwritten. That is the safe direction. Nothing
   * a TIMER asked for ever runs under a dialog, because a timer never waits
   * here.
   */
  type SaveSlot = {
    /** The buffer this slot's saves read from: the tab's lifetime. */
    readonly model: WorkingModel | null;
    /** At most one person's request, waiting for this slot to be released. */
    next: { done: Promise<boolean>; settle: (ok: boolean) => void } | null;
  };
  const slots = new Map<string, SaveSlot>();

  /** Take the slot for one buffer, run the body, release it in a `finally`, then drain. */
  const holdSlot = async (
    id: string,
    model: WorkingModel | null,
    body: () => Promise<boolean>
  ): Promise<boolean> => {
    const slot: SaveSlot = { model, next: null };
    slots.set(id, slot);
    try {
      return await body();
    } finally {
      // THE RELEASE COMES BEFORE THE DRAIN, so the follow-up finds the slot
      // free and takes it rather than queueing behind itself for ever. And it
      // releases only ITS OWN slot: a later lifetime of this path may hold the
      // key by now, and that save is not this one's to end.
      if (slots.get(id) === slot) slots.delete(id);
      drainQueue(id, slot);
    }
  };

  const drainQueue = (id: string, slot: SaveSlot): void => {
    const next = slot.next;
    if (next === null) return;
    slot.next = null;
    // THE LIFETIME COMES FIRST, as it does in `completeSave`. Another buffer
    // holding the key, or a different model under the id, means the tab this
    // request was made in is gone: nothing is written, and false is the honest
    // answer, because `promptDirtyClose` closes a tab on true.
    if (slots.has(id) || getWorkingModel(id) !== slot.model) {
      next.settle(false);
      return;
    }
    const tab = deps.byId(id);
    if (tab === undefined) {
      next.settle(false);
      return;
    }
    // THE ONE PLACE A SAVE IS SKIPPED FOR BEING CLEAN, and it is deliberate
    // that there is only one. This follow-up exists to catch typing that
    // happened DURING the write, and with `completeSave`'s rule above a clean
    // tab is one whose buffer is already on disk. An explicit ⌘S on a clean tab
    // still writes, exactly as it always has: main has no identical-bytes short
    // circuit, it stages and renames, so skipping would be a visible change to
    // a gesture nobody complained about.
    if (!tab.dirty) {
      next.settle(true);
      return;
    }
    // `explicit`, and never a stored reason: `withSaveSlot` answers a timer's
    // request before it can reach the queue, so everything waiting here is a
    // person's.
    void holdSlot(id, slot.model, () => saveOnce(id, 'explicit')).then(
      (ok) => {
        next.settle(ok);
      },
      () => {
        next.settle(false);
      }
    );
  };

  const withSaveSlot = async (
    id: string,
    reason: SaveReason,
    body: () => Promise<boolean>
  ): Promise<boolean> => {
    const model = getWorkingModel(id);
    const held = slots.get(id);
    // Free, or held only by a buffer that has since been closed.
    if (held === undefined || held.model !== model) {
      return holdSlot(id, model, body);
    }
    // A timer never waits. See the doc comment above: ./auto-save re-arms.
    if (reason === 'auto') return false;
    if (held.next === null) {
      let settle!: (ok: boolean) => void;
      const done = new Promise<boolean>((resolve) => {
        settle = resolve;
      });
      held.next = { done, settle };
    }
    return held.next.done;
  };

  /**
   * Write one tab to disk. Resolves false when nothing was written.
   *
   * PHASE 277. This is the serializer and nothing else, so it still names no
   * write — the ladder is `saveOnce` above and the doors are above that.
   *
   * TRUE MEANS A WRITE LANDED, NOT THAT THE TAB IS CLEAN, and the fix round
   * corrected this comment, which had promised the second. Typing that arrives
   * while the write is in the air keeps the tab dirty (`completeSave`), and the
   * save still answers true, because the bytes it read are on disk. So a caller
   * that acts on true asks the tab again: `promptDirtyClose` in ./store closes
   * only a tab that is still the same buffer and is clean, and asks again
   * otherwise. A timer's request that finds a save of the same buffer running
   * answers false at once (`withSaveSlot`).
   */
  const save = async (
    id: string,
    reason: SaveReason = 'explicit'
  ): Promise<boolean> => {
    return withSaveSlot(id, reason, () => saveOnce(id, reason));
  };

  const refreshRepo = async (repoPath: string): Promise<void> => {
    if (!gmux) return;
    // History tabs are excluded by construction: `<sha>^ → <sha>` cannot
    // change, and re-running the worktree refresh over one would replace a
    // commit's contents with the live file's.
    const tabs = deps.worktreeTabsIn(repoPath);
    for (const tab of tabs) {
      // PHASE 63. A DRAFT THAT HAS NEVER BEEN SAVED IS SKIPPED WHOLE.
      //
      // Its file does not exist yet, which is the point of it. The existence
      // check below would find nothing at that path and mark the tab
      // `deleted`, which makes it read only and puts "deleted on disk" over a
      // buffer the person is still typing into. `savedContents === ''` is what
      // says it has never been saved: the moment it is, that string holds the
      // bytes, the file is on disk, and this tab refreshes like any other.
      if (tab.draft != null && tab.savedContents === '') continue;
      // An image tab re-reads through the image channel and bumps its
      // revision, which is what re-fetches the asset URL: an agent that
      // regenerates a chart must change the picture on screen, and the URL
      // alone is stable enough for Chromium to serve the old bitmap forever.
      if (tab.image && !tab.svg) {
        await loadImage(tab.id, tab.path);
        const current = deps.byId(tab.id);
        if (current === undefined) continue;
        deps.patch(tab.id, { imageRevision: current.imageRevision + 1 });
        if (current.canDiff) await loadImageHead(tab.id);
        continue;
      }
      // Existence check (feature-detected; skipped without fs:readDir).
      if (typeof fsExtras?.readDir === 'function') {
        try {
          const dir = await fsExtras.readDir(dirOf(tab.path));
          const exists = dir.entries.some((e) => e.name === tab.name);
          if (!exists) {
            deps.patch(tab.id, { deleted: true });
            continue;
          }
          if (tab.deleted) deps.patch(tab.id, { deleted: false });
        } catch {
          /* parent unreadable — leave the tab as-is */
        }
      }
      // Reload clean buffers so the editor tracks the agent's edits.
      //
      // PHASE 277 FIX ROUND. THE CLEAN TEST IS ASKED OF THE LIVE TAB, BEFORE
      // AND AFTER THE READ. It was asked once, of the snapshot `tabs` took
      // before this loop, and then the directory read above, the file read
      // below and every earlier tab's reads in this same loop were awaited
      // before the baseline moved and the buffer was replaced. Typing that
      // landed in any of those waits was written over by the agent's bytes, and
      // because `savedContents` moved first, MonacoHost then worked the tab out
      // as CLEAN — the watcher's own version of the false clean this phase
      // exists to end, and the one this file's header says the skip prevents.
      // The attack verifier measured it at the parent and at this phase's first
      // build alike: the buffer held the agent's bytes and the tab read clean.
      //
      // So the buffer must still be untouched when the bytes arrive: the LIVE
      // tab is still clean, and the id still holds the model this read started
      // with, because a close and reopen loads its own bytes. MonacoHost marks
      // a tab dirty inside the model's own change event, synchronously, so the
      // live flag already carries every keystroke that reached the model.
      //
      // The model's TEXT is deliberately not compared with the baseline here.
      // Monaco normalises a file's line endings when it builds a model, so a
      // clean tab over a file with mixed endings reads differently from the
      // bytes it was loaded from, and that compare would stop the watcher
      // following such a file for good.
      //
      // PHASE 282. AND THE BASELINE THE READ STARTED FROM IS STILL THE TAB'S.
      // `adoptWritten` below moves `savedContents` and the model's text while
      // leaving the tab clean and the instance the same, so it passes both
      // questions above. A read whose descriptor was opened before the guarded
      // write's `renameSync` answers the OLD inode's bytes, and when it
      // answered after the adoption it rolled `savedContents` and the buffer
      // back to the pre-rewind text while the disk held the rewind — 37 of 500
      // interleavings over the real main handlers, 0 of 500 with the adoption
      // taken out. A read that raced a newer baseline is dropped, and the
      // rename's own file event reads again. The same clause closes the same
      // race for a ⌘S, whose `completeSave` moves `savedContents` the same way:
      // a read opened on a clean tab before the person typed and saved put the
      // pre-save bytes back into the buffer at 9217ae0d with no adoption
      // anywhere. p282-watcher-race.test.ts drives both writers over real
      // files. So the clause names the fact, not the writer; comparing the
      // bytes with the adoption's `was` would answer for one writer only.
      const before = deps.byId(tab.id);
      if (before !== undefined && !before.dirty) {
        const model = getWorkingModel(tab.id);
        const savedBefore = before.savedContents;
        try {
          const result = await gmux.fs.readFile(tab.path);
          const live = deps.byId(tab.id);
          if (
            live !== undefined &&
            !live.dirty &&
            live.savedContents === savedBefore &&
            result.contents !== live.savedContents &&
            getWorkingModel(tab.id) === model
          ) {
            deps.patch(tab.id, {
              savedContents: result.contents,
              truncated: result.truncated
            });
            resetWorkingModel(tab.id, result.contents);
          }
        } catch {
          /* transient read failure — keep the buffer */
        }
      }
      // Keep the diff base honest (HEAD moves on commit) and let a
      // freshly-modified file grow its Diff|File toggle.
      // Phase 26 item 1: never for a file outside this repository. It has no
      // HEAD version, and asking git for one with an absolute path is exactly
      // the refusal that reached the operator raw — this loop used to issue
      // that doomed call on every watcher tick for an open context detail
      // tab. Its buffer still refreshes above; it has no diff base to keep
      // honest.
      if (!fileInRepo(tab.repoPath, tab.path)) continue;
      try {
        const head = await gmux.git.showHead({
          repoPath: tab.repoPath,
          path: tab.origRelPath ?? tab.relPath
        });
        const current = deps.byId(tab.id);
        if (current === undefined) continue;
        // PHASE 225. When the HEAD bytes differ from the last HEAD bytes seen
        // for this tab, the baseline becomes the new HEAD version and the
        // generation moves. A branch switch, a pull, a stash and a rebase all
        // turn the picture research 83 A4.1 drew, the person's own committed
        // word struck through, into an empty redline. The file re-read above
        // never touches it: whatever advances the baseline, it is never the
        // file changing.
        const patch: Partial<EditorTab> = {
          headContents: head,
          baseline: nextBaseline(current.baseline, {
            kind: 'head',
            contents: head
          })
        };
        if (!current.canDiff && head !== current.savedContents) {
          patch.canDiff = true;
        }
        deps.patch(tab.id, patch);
        // PHASE 243. The same rule as the two loaders: a watcher tick that
        // moved the baseline records it, and a tick that changed nothing
        // answers the same object and writes nothing at all.
        void persistBaseline(tab.id);
      } catch {
        /* non-repo or git failure — plain mode keeps working */
      }
    }
  };

  /**
   * PHASE 282'S FIX ROUND. ONE WALK OF A REPO AT A TIME, with at most one more
   * queued behind it.
   *
   * `refreshRepo` above is fire and forget from ./store's `onRepoChanged`
   * (`void io.refreshRepo(repoPath)`), the bus that wakes it debounces only
   * 150 ms (../state/repo-changed), and one walk awaits a directory read, a
   * file read and a `git show HEAD` PER TAB. So two walks of the same repo
   * overlapped, and with them two READS OF ONE TAB: the older read answered
   * first and moved `savedContents`, and the newer one — issued later, so
   * carrying bytes at least as new — then failed the clause above, was dropped
   * whole, and left the tab on the older bytes with nothing scheduled to read
   * again. The verifier drove it through this module and measured the parent
   * applying the newer read, so it is this phase's own regression.
   *
   * THE CLAUSE ABOVE IS RIGHT AND STAYS. What was wrong is that two reads of
   * one tab could be in the air at once: with one walk at a time, the only
   * thing that can move `savedContents` under a read is a writer — an
   * adoption or a save — and that writer leaves the tab holding the NEWEST
   * bytes, which is exactly the interleaving the clause was written to drop.
   *
   * At most ONE walk is queued, because a second and a third would re-read the
   * same files for the same reason; they join the one already waiting. The
   * running walk is forgotten in a `finally`, so a walk that throws never
   * blocks the next one.
   *
   * STATED LIMIT (Phase 282.1's reverify, reasoned rather than driven). A walk
   * that never SETTLES is not a walk that throws. `fs:readFile` has no deadline
   * on the local channel (the `git:showHead` call beside it does), so a read
   * that hangs on a stalled network volume holds `refreshRunning` for the life
   * of the renderer and every later tick of that repository queues behind it:
   * the editor stops following the agent's edits in that project until the app
   * is restarted, with nothing said. Before the serializer that read cost one
   * tick. Not reproducible on a local disk; written down so the failure mode
   * is known rather than bounded here. A deadline that forgot the running walk
   * is a design decision for its own entry: the clause above would drop the
   * late answer when a fresh walk had moved `savedContents` under it, and
   * apply nothing when it had not, so the road is open.
   */
  const refreshRunning = new Map<string, Promise<void>>();
  const refreshQueued = new Map<string, Promise<void>>();

  const queuedRefresh = (repoPath: string): Promise<void> => {
    const running = refreshRunning.get(repoPath);
    if (running === undefined) {
      const run = refreshRepo(repoPath).finally(() => {
        if (refreshRunning.get(repoPath) === run) refreshRunning.delete(repoPath);
      });
      refreshRunning.set(repoPath, run);
      return run;
    }
    const waiting = refreshQueued.get(repoPath);
    if (waiting !== undefined) return waiting;
    const next = running.catch(() => undefined).then(() => {
      // Cleared BEFORE the walk starts, so an event that arrives while THIS
      // walk is running queues a fresh one rather than joining the walk that
      // is already reading.
      if (refreshQueued.get(repoPath) === next) refreshQueued.delete(repoPath);
      return queuedRefresh(repoPath);
    });
    refreshQueued.set(repoPath, next);
    return next;
  };

  /**
   * A CONFIRMED WRITE'S OWN BYTES, adopted. The guards and the reason are on
   * the interface above; the short version is that this is the read the
   * watcher would have made, minus the round trip.
   */
  const adoptWritten = (id: string, contents: string, was: string): void => {
    const tab = deps.byId(id);
    if (tab === undefined) return;
    if (tab.dirty || tab.savedContents !== was) return;
    deps.patch(id, { savedContents: contents });
    // The working model moves with it, and it is not optional: with the model
    // left holding the old text, the next ⌘S would write that old text back
    // over the bytes this door just wrote, with `savedContents` as its
    // precondition and therefore nothing to refuse it.
    resetWorkingModel(id, contents);
  };

  return {
    loadContents,
    persistBaseline,
    loadHead,
    loadCommitDiff,
    loadRemoteDiff,
    loadRemoteCommitDiff,
    loadImage,
    loadImageHead,
    adoptWritten,
    save,
    // PHASE 282'S FIX ROUND. The serializer above is what callers get: the
    // walk itself is never re-entered for one repo.
    refreshRepo: queuedRefresh
  };
}
