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
 * PHASE 101 SPLIT `save` IN TWO. A review tab whose machine carries a folder a
 * person confirmed Tortie may save under is saved on that machine, through the
 * one channel that can write there. A review tab whose machine carries none is
 * refused, out loud, exactly as it was. Nothing about a history tab moved: the
 * past is not an edit surface on any computer.
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
 */

import { REMOTE_FILE_MAX_BYTES } from '@shared/ipc';
import { errorText, useApp } from '../state/store';
import { machineWriteRootFor } from '../state/machines-slice';
import {
  remoteOpenTooLarge,
  remoteOpenTooLargeOver,
  remoteSaveLostAnswer,
  remoteSaveRefusal,
  remoteSaveRefused
} from '../machines/editor';
import { announceRemoteWrite } from '../machines/remote-writes';
import { requestOpenFile } from '../state/open-file';
import type {
  OpenFileCommitRef,
  OpenFileRemoteRef
} from '../state/open-file';
import { getWorkingModel, resetWorkingModel } from './monaco-loader';
import { nextBaseline } from './baseline';
import { dirOf } from './paths';
import { fileInRepo } from './tab-identity';
import { guardedSave } from './save-write';
import {
  SAVE_COMPARE_LABEL,
  SAVE_OVERWRITE_LABEL,
  STALE_SAVE_BODY,
  saveRefusalSentence,
  staleSaveTitle
} from './save-sentences';
import type { EditorTab } from './tab-types';
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
}

export interface TabIo {
  loadContents(id: string, path: string): Promise<void>;
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
  /** Write one tab to disk. Resolves false when nothing was written. */
  save(id: string): Promise<boolean>;
  refreshRepo(repoPath: string): Promise<void>;
}

export function createTabIo(deps: TabIoDeps): TabIo {
  const gmux = gmuxBridge();
  const fsExtras = gmux ? gmux.fs : null;
  const imageFs = gmux ? gmux.fs : null;

  const loadContents = async (id: string, path: string): Promise<void> => {
    if (!gmux) return;
    try {
      const result = await gmux.fs.readFile(path);
      // PHASE 225. The first successful read seeds the shadow baseline from
      // the same bytes `savedContents` gets, HERE and not when Redline mode is
      // chosen: a baseline captured from whatever the file said when the view
      // was first opened may be mid rewrite and is then wrong for ever
      // (research 83 A1.2 property 3). `nextBaseline` refuses every read after
      // the first, so a re-run of this loader cannot move it either.
      const baseline = nextBaseline(deps.byId(id)?.baseline, {
        kind: 'read',
        contents: result.contents
      });
      deps.patch(id, {
        savedContents: result.contents,
        truncated: result.truncated,
        loading: false,
        error: null,
        deleted: false,
        baseline
      });
    } catch (err) {
      deps.patch(id, {
        loading: false,
        error: errorSentence(err, 'The file could not be read.')
      });
    }
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
      deps.patch(id, { mode: tab.markdown ? 'preview' : 'file', canDiff: false });
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
    } catch (err) {
      // Diff base unavailable (repo vanished, git failed): fall back to a
      // plain editor rather than a broken diff, and say so in sentences a
      // person can read (Phase 26 item 1).
      deps.patch(id, { mode: tab.markdown ? 'preview' : 'file', canDiff: false });
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
       * PHASE 101. A file Tortie could never save is not opened at all, on a
       * machine where saving is on.
       *
       * WHY THE OPEN AND NOT THE SAVE. The read cap is 2,097,152 bytes and the
       * save cap is 90,000. The save cap cannot be raised to meet the read cap,
       * because the whole command Tortie sends is capped as well and a file
       * that size does not fit at any encoding. So the choice is between
       * refusing the open and shipping a tab that can never be saved, and a tab
       * that can never be saved is the defect Phase 96 fixed by accident.
       *
       * IT IS REFUSED ONLY WHEN SAVING IS ON. With saving off the tab is read
       * only anyway, so refusing the open would take away a read a person has
       * today and give nothing back.
       *
       * TWO SENTENCES, because a cut read gives a floor rather than a
       * measurement. `pair.bytes` is the file's real size when the read was
       * whole, and it is the read cap when the read was cut, so the second
       * sentence says over and never prints the floor as the size.
       */
      const writeRoot = machineWriteRootFor(
        useApp.getState().machineStates,
        remote.machineId
      );
      if (
        writeRoot !== null &&
        writeRoot.length > 0 &&
        pair.bytes > REMOTE_FILE_MAX_BYTES
      ) {
        deps.patch(id, {
          loading: false,
          error: pair.truncated
            ? remoteOpenTooLargeOver(pair.bytes, remote.machineLabel)
            : remoteOpenTooLarge(pair.bytes, remote.machineLabel)
        });
        return;
      }
      deps.patch(id, {
        headContents: pair.oldContents,
        savedContents: pair.newContents,
        loading: false,
        error: null
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
   * IT IS REFUSED WHETHER OR NOT SAVING IS ON, which is where it parts from
   * the review tab above. That refusal exists so a person is not handed a tab
   * whose every save would be refused, so with saving off it does not apply
   * and the whole 2 MiB read is shown. Here BOTH SIDES ARE CUT at the ceiling
   * by the script itself, so a file over it cannot be shown whole at all and
   * a tab drawn from the cut bytes would be a diff of two files neither of
   * which is the one that was asked for.
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
   * Save one tab whose file is on another machine (Phase 101).
   *
   * THE ORDER MATTERS AND IT IS THE SAFETY PROPERTY. Saving off is answered
   * here, on this Mac, before anything is composed. Everything past that is
   * main's decision: main reads the confirmed folder off the row on disk at
   * call time, checks the machine's agreement, refuses a path outside the
   * folder, and refuses a payload over the cap. This function never sends a
   * folder and never chooses one, so the folder that decides what may be
   * written is the one a person read on a sheet and confirmed.
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
    const writeRoot = machineWriteRootFor(
      useApp.getState().machineStates,
      remote.machineId
    );
    if (writeRoot === null || writeRoot.length === 0) {
      // PHASE 229. The toast carries the button its own sentence names.
      // `settings:openWindow` takes no argument, so the button opens the
      // Settings window and the sentence still says which section.
      useApp.getState().toast('error', remoteSaveRefused(label), {
        ...sticky,
        action: {
          label: 'Open settings',
          run: () => {
            void gmux?.openSettings?.();
          }
        }
      });
      return false;
    }
    // The three tabs that are not edit surfaces on any computer. They are
    // checked after the refusal above so that a machine with saving off still
    // says the one thing a person can act on.
    if (tab.deleted || tab.truncated || tab.error !== null) return false;
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
        deps.patch(id, { savedContents: value, dirty: false });
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
        return true;
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
   * NOTHING CALLS IT DIRECTLY except `saveOutsideProject` below and the
   * Overwrite it offers, so every plain write in this file is answered for by
   * the reading in front of it.
   */
  const writePlain = async (
    id: string,
    tab: EditorTab,
    value: string
  ): Promise<boolean> => {
    if (!gmux) return false;
    try {
      await gmux.fs.writeFile(tab.path, value);
      deps.patch(id, { savedContents: value, dirty: false });
      return true;
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
   * PHASE 240 FIX ROUND. What the file says NOW, against what the buffer was
   * built from.
   *
   * `same` means the text on disk is still `tab.savedContents`, `changed`
   * carries what it says instead, and `unknown` is a file that could not be
   * read at all or came back truncated. A draft that has never been saved
   * reads `unknown`, because its file does not exist yet and that is the point
   * of it.
   *
   * IT IS A TEXT COMPARISON AND NOT A DIGEST, because that is the only
   * question this side of the bridge can ask: `fs:readFile` hands the renderer
   * a DECODED string and never the bytes. The two callers below each need a
   * different half of that, and both reasons are worth writing down.
   */
  const diskReading = async (
    tab: EditorTab
  ): Promise<
    { kind: 'same' } | { kind: 'changed'; text: string } | { kind: 'unknown' }
  > => {
    if (!gmux) return { kind: 'unknown' };
    let disk;
    try {
      disk = await gmux.fs.readFile(tab.path);
    } catch {
      return { kind: 'unknown' };
    }
    if (disk.truncated) return { kind: 'unknown' };
    return disk.contents === tab.savedContents
      ? { kind: 'same' }
      : { kind: 'changed', text: disk.contents };
  };

  /**
   * The plain door, with a reading in front of it (Phase 240 fix round).
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
   * So the plain door now READS the file first and asks the same question the
   * guarded channel asks, and offers the same three answers when it differs.
   * THE STATED LIMIT IS THE WINDOW, and it is wider than the guarded channel's:
   * there is no compare-and-swap here, so a write landing between this reading
   * and the write below is lost. That window is one IPC round trip rather than
   * two system calls. It is not closed here because closing it means giving
   * the guarded channel a mode for a link and for a file in no project, which
   * is a change to the channel and this phase changes nothing about it.
   *
   * AND THE OVERWRITE IT OFFERS IS UNCONDITIONAL, deliberately. Overwrite
   * means "put my version over what is there", so re-reading before it would
   * find the same difference again and offer the same choice for ever.
   */
  const saveOutsideProject = async (
    id: string,
    tab: EditorTab,
    value: string
  ): Promise<boolean> => {
    if (!gmux) return false;
    const disk = await diskReading(tab);
    if (disk.kind !== 'changed') return writePlain(id, tab, value);
    offerStaleChoice(tab, value, () => {
      void writePlain(id, tab, value);
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
   * digest the channel handed back. The plain door's is an unconditional
   * write, because there is no compare-and-swap on that path at all; see
   * `saveOutsideProject` for the window that leaves and why it stays.
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

  /** The deliberate second write, guarded against what was just read. */
  const overwrite = async (
    id: string,
    tab: EditorTab,
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
      deps.patch(id, { savedContents: value, dirty: false });
      return true;
    }
    if (result.outcome === 'unguarded') return saveOutsideProject(id, tab, value);
    if (result.outcome === 'stale') {
      const again = result.sha256;
      offerStaleChoice(tab, value, () => {
        void overwrite(id, tab, value, again);
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
   */
  const saveInProject = async (
    id: string,
    tab: EditorTab,
    value: string
  ): Promise<boolean> => {
    const expect = await sha256Hex(tab.savedContents);
    if (expect === null) return saveOutsideProject(id, tab, value);
    const result = await guardedSave({
      root: tab.repoPath,
      path: tab.path,
      expect,
      contents: value
    });
    if (result.outcome === 'wrote') {
      deps.patch(id, { savedContents: value, dirty: false });
      return true;
    }
    // A symbolic link, which the channel will not turn into a regular file.
    // It takes the plain door, which now reads the file first.
    // ./save-sentences SaveRefusalWord carries the argument.
    if (result.outcome === 'unguarded') return saveOutsideProject(id, tab, value);
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
      if ((await diskReading(tab)).kind === 'same') {
        useApp
          .getState()
          .toast('error', saveRefusalSentence('notUtf8', tab.name), {
            sticky: true
          });
        return false;
      }
      const again = result.sha256;
      offerStaleChoice(tab, value, () => {
        void overwrite(id, tab, value, again);
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
   * Write one tab to disk. Resolves false when nothing was written.
   *
   * PHASE 240: this function no longer names a write at all. It is the ladder
   * of refusals it has always been, and the write itself is one of the three
   * doors below — the machine, the guarded channel, or the plain one. That is
   * what `npm run conformance:save` reads by matching braces: `save`'s own
   * body must not name `fs:writeFile`.
   */
  const save = async (id: string): Promise<boolean> => {
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
    // A DRAFT THAT HAS NEVER BEEN SAVED TAKES THE PLAIN DOOR, and this is the
    // one shape Phase 240 broke outright. Phase 63's "Draft a contract" opens
    // a tab holding composed text whose file DOES NOT EXIST, with
    // `savedContents` empty, so the guarded channel opens nothing and answers
    // `missing`: the drafted contract could not be saved at all, and the
    // sentence a person read said it was "no longer on disk" about a file that
    // was never there. The predicate is `refreshRepo`'s own, below, so the two
    // agree by construction, and the plain door reads the path first, which is
    // the question that matters for a draft — has somebody put a file here
    // since it opened.
    const neverSaved = tab.draft != null && tab.savedContents === '';
    return !neverSaved && fileInRepo(tab.repoPath, tab.path)
      ? saveInProject(id, tab, value)
      : saveOutsideProject(id, tab, value);
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
      if (!tab.dirty) {
        try {
          const result = await gmux.fs.readFile(tab.path);
          if (result.contents !== tab.savedContents) {
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
      } catch {
        /* non-repo or git failure — plain mode keeps working */
      }
    }
  };

  return {
    loadContents,
    loadHead,
    loadCommitDiff,
    loadRemoteDiff,
    loadRemoteCommitDiff,
    loadImage,
    loadImageHead,
    save,
    refreshRepo
  };
}
