/**
 * Clone state (Phase 18.6) — its own store, not a room in the app store.
 *
 * It is a small state machine with a network call, a child process and a
 * cancel in it, and none of that belongs beside tab order and session
 * selection. The app store is told exactly one thing, once, at the end: open
 * this path as a project. Everything before that is private to this module.
 *
 * THE SHAPE IS SEARCH'S (research 35 §3.14). A clone runs for 0.6 s on a five
 * object repository and 101 s on microsoft/TypeScript, so the contract is a
 * stream: the renderer mints the id, SUBSCRIBES FIRST, then invokes, and the
 * last frame carries either the project or the failure. `projects:clone`
 * itself resolves in milliseconds and says nothing about the outcome.
 *
 * FOUR RULES THIS MODULE EXISTS TO KEEP, each of them measured (research 35
 * §3.4, §3.5, §3.10, §3.11).
 *
 *  1. **The bar is per phase.** Every percentage git prints belongs to one
 *     phase and git never prints an overall one. This store keeps the current
 *     phase's own number and drops it the moment the phase WORD changes. It
 *     never synthesizes a total. A weighted bar was measured to put its last
 *     15 percent over 192 of 505 frames.
 *  2. **Preflight never runs on its own.** The Repository field is prefilled
 *     from the clipboard, so a check on open would fire a network request, and
 *     whatever credential the keychain holds for that host, at whatever
 *     address happened to be copied. It runs on blur and on submit, both of
 *     which are the user acting.
 *  3. **Sign in details never reach the field.** The address rules are applied
 *     to the clipboard BEFORE the string is put on screen, not only before the
 *     clone, because anything on screen ends up in a screenshot.
 *  4. **Cancel reports what main did.** The renderer never claims a directory
 *     was removed. Main sends the leftover path when the removal failed, and
 *     the sentence is built from that fact.
 */

import { create } from 'zustand';
import type {
  CloneDone,
  CloneFailureKind,
  ClonePreflight,
  CloneProgress,
  InstalledGmuxApi
} from '@shared/ipc';
import { CLONE_GH_HINT, cloneFailureMessage } from '@shared/clone-copy';
import { normalizeCloneUrl } from '@shared/clone-url';
import type { NormalizedCloneUrl } from '@shared/clone-url';
import { validateProjectName } from '@shared/project-create';
import { CLONE_PHASE_WORDS, cloneCancelledNote } from '../app/clone-copy';
// The keyboard handoff and the "where does a new project go" guess are shared
// with NewProjectModal.tsx — one definition each, extracted at the Phase 18.6
// integration (research 35 §4.1).
import { focusFleetPrimary } from '../app/focus-trap';
import {
  errorPayload,
  errorText,
  suggestedProjectParent,
  useApp
} from './store';
import { gmuxBridge } from '../bridge';

// ---------------------------------------------------------------------------
// The bridge
// ---------------------------------------------------------------------------

type ProjectsBridge = InstalledGmuxApi['projects'];

function bridge(): ProjectsBridge | undefined {
  return gmuxBridge()?.projects;
}

/**
 * Whether this build can clone at all. The three channels are optional on the
 * preload surface, so an older preload hides the Clone row rather than
 * offering a button that throws.
 */
export function cloneAvailable(): boolean {
  const projects = bridge();
  return (
    typeof projects?.clone === 'function' &&
    typeof projects.clonePreflight === 'function' &&
    typeof projects.onCloneProgress === 'function'
  );
}

/**
 * Open the clone dialog. A no-op on a build that cannot clone, so a caller
 * that forgot to feature detect cannot open a dialog with nothing behind it.
 *
 * This is the whole surface the three entry points need: the Clone row on the
 * home screen, the `+` menu at the end of the tab strip, and File > Clone
 * Repository. It is a module function and not a hook, so its identity is
 * stable and a caller can put it straight in a dependency list.
 */
export function openCloneDialog(): void {
  if (!cloneAvailable()) return;
  useClone.getState().openDialog();
}

/**
 * The Clone verb for a surface that offers it, or undefined where the build
 * cannot clone. `HomeScreen`'s `onClone` prop takes this directly, and an
 * undefined result is what hides the row.
 */
export function cloneAction(): (() => void) | undefined {
  return cloneAvailable() ? openCloneDialog : undefined;
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/**
 * `editing`  the fields are live and the dialog can be dismissed.
 * `checking` preflight is in flight; the dialog stays fully editable.
 * `running`  git is spawned; the fields are static text and only Cancel ends it.
 * `stopping` cancel was sent; waiting for the terminal frame.
 */
export type CloneStatus = 'editing' | 'checking' | 'running' | 'stopping';

/** Which control the dialog should put the keyboard on. */
export type CloneField = 'address' | 'name' | 'parent';

/**
 * A focus move the store asked for. The nonce is what makes a repeat of the
 * same request take effect — two failures in a row on the same field are two
 * moves, not one.
 */
export interface CloneFocusRequest {
  field: CloneField;
  /** Select the field's contents, so typing replaces the address. */
  select: boolean;
  nonce: number;
}

export interface CloneFailure {
  kind: CloneFailureKind;
  /**
   * The sentence, from the one shared table. It may carry a second line: the
   * `gh` hint under a credential failure, and git's own last line under an
   * unclassified one.
   */
  message: string;
  /** Git's raw stderr, behind [Show details]. */
  detail: string | null;
}

interface CloneState {
  open: boolean;
  status: CloneStatus;

  /** The Repository field, exactly as typed or pasted. */
  address: string;
  /** The Folder name field. */
  name: string;
  /** Absolute parent directory from the picker. */
  parentDir: string;
  /** The name field has been typed in, so a new address must not overwrite it. */
  nameEdited: boolean;
  /** The name field has been touched, so its error may show. */
  nameTouched: boolean;

  /**
   * The address string whose verdict is on screen right now, whether that
   * verdict was a resolved URL or a failure. It is what stops a blur from
   * checking a string that has already been answered. See `checkAddress`.
   */
  checkedAddress: string | null;
  /** The https address Tortie will actually clone, once preflight has run. */
  resolvedUrl: string | null;
  rewrittenFromSsh: boolean;
  strippedCredential: boolean;

  /** Current phase word, and its own percentage. Never an overall figure. */
  phaseWord: string | null;
  percent: number | null;
  /** Git's cumulative byte figure during Downloading, in git's own unit. */
  bytes: string | null;

  failure: CloneFailure | null;
  detailsOpen: boolean;
  /** What main reported it did on disk after a cancel. */
  cancelNote: string | null;

  focusRequest: CloneFocusRequest | null;
  /**
   * The next address check is the STORE'S own doing, not the user's, so skip
   * it. See the `focus` helper for why this exists at all.
   */
  suppressAddressCheck: boolean;

  openDialog(): void;
  close(): void;
  setAddress(value: string): void;
  setName(value: string): void;
  setParentDir(value: string): void;
  chooseParent(): void;
  /** Check the address now (the Repository field lost focus). */
  checkAddress(): void;
  submit(): void;
  cancel(): void;
  toggleDetails(): void;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** `owner/repo` and nothing else, which is the one address form the clipboard
 *  prefill refuses. See `clipboardAddress` below for why. */
const BARE_SHORTHAND = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

/**
 * The clipboard, when it holds a repository address.
 *
 * TWO RULES, and both are about doing something to the field without being
 * asked. The address rules run first, so a `user:password@` is gone before the
 * string reaches the screen (research 35 §3.4 rule 10) — when they removed
 * one, the field gets the resolved https address rather than the paste, since
 * that is the only form guaranteed to carry no token. And a bare `owner/repo`
 * is refused here even though the rules accept it when a person TYPES it: half
 * the paths on a developer's clipboard have that shape, and prefilling
 * `src/main` would be noise.
 *
 * Reading the clipboard can be denied, and a refusal is not worth reporting:
 * the field stays empty and the user pastes it themselves.
 */
async function clipboardAddress(): Promise<{
  address: string;
  strippedCredential: boolean;
} | null> {
  let text: string;
  try {
    text = await navigator.clipboard.readText();
  } catch {
    return null;
  }
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > 512) return null;
  if (BARE_SHORTHAND.test(trimmed)) return null;
  const parsed = normalizeCloneUrl(trimmed);
  if (parsed === null) return null;
  const stripped = parsed.strippedCredential === true;
  return { address: stripped ? parsed.url : trimmed, strippedCredential: stripped };
}

/** Git's own last line, for the one failure that has no sentence of its own. */
function detailOf(err: unknown): string | null {
  const payload = errorPayload(err);
  return typeof payload?.detail === 'string' ? payload.detail : null;
}

const FAILURE_KINDS: ReadonlySet<string> = new Set<CloneFailureKind>([
  'badUrl',
  'network',
  'unreachable',
  'notFound',
  'unauthenticated',
  'authRejected',
  'destinationExists',
  'permission',
  'diskFull',
  'interrupted',
  'gitMissing',
  'unknown'
]);

function isFailureKind(value: unknown): value is CloneFailureKind {
  return typeof value === 'string' && FAILURE_KINDS.has(value);
}

/**
 * Distinguish the terminal frame from a progress frame. `CloneProgress.done`
 * is an object COUNT, so only the literal true can be the discriminator.
 */
function isTerminal(frame: CloneProgress | CloneDone): frame is CloneDone {
  return (frame as CloneDone).done === true;
}

// ---------------------------------------------------------------------------
// The live clone, outside the store
// ---------------------------------------------------------------------------

/**
 * The subscription and the id of the clone running now. Kept out of the store
 * because nothing renders them, and because a stale frame must be dropped by
 * identity rather than by a re-render.
 */
const live: { cloneId: string | null; unsubscribe: (() => void) | null } = {
  cloneId: null,
  unsubscribe: null
};

/** The address check running now, so a blur and the click that caused it do
 *  not both spend a round trip on the same string. */
const inFlight: {
  raw: string | null;
  promise: Promise<ClonePreflight | null> | null;
} = { raw: null, promise: null };

function stopLive(): void {
  live.unsubscribe?.();
  live.unsubscribe = null;
  live.cloneId = null;
}

// ---------------------------------------------------------------------------
// The store
// ---------------------------------------------------------------------------

const BLANK = {
  status: 'editing' as CloneStatus,
  address: '',
  name: '',
  parentDir: '',
  nameEdited: false,
  nameTouched: false,
  checkedAddress: null,
  resolvedUrl: null,
  rewrittenFromSsh: false,
  strippedCredential: false,
  phaseWord: null,
  percent: null,
  bytes: null,
  failure: null,
  detailsOpen: false,
  cancelNote: null,
  focusRequest: null,
  suppressAddressCheck: false
};

let focusNonce = 0;

export const useClone = create<CloneState>((set, get) => {
  /**
   * Ask the dialog to move the keyboard.
   *
   * MOVING THE KEYBOARD OFF THE ADDRESS FIELD BLURS IT, AND THE BLUR IS WHAT
   * RUNS THE PREFLIGHT. That composition shipped a network request the
   * specification explicitly cut: research 35 §3.5 and §5.9 say the preflight
   * runs on an explicit user action and never when the dialog opens, because
   * the field is prefilled from the clipboard and a check on open sends a
   * request, plus whatever credential the keychain offers for that host, to
   * whatever address the user happened to have copied. Driving the real dialog
   * at the Phase 18.6 integration is what caught it: opening it fired a
   * `git ls-remote` at an unrelated host from the operator's clipboard.
   *
   * So a store-driven move off the address field suppresses exactly one check.
   * A user who tabs or clicks away themselves still gets one, because they
   * moved the keyboard and the store did not. The flag is cleared again the
   * moment the user edits the field, so it can never swallow a later check,
   * and `submit()` runs its own preflight regardless — an untouched prefilled
   * address is still checked before a single byte is written.
   */
  const focus = (field: CloneField, select = false): void => {
    focusNonce += 1;
    set({
      focusRequest: { field, select, nonce: focusNonce },
      ...(field === 'address' ? {} : { suppressAddressCheck: true })
    });
  };

  /**
   * What the copy needs to name the thing that failed. The host comes from the
   * shared address rules, so it is known for every string that parses at all —
   * and the one kind that has no host, `badUrl`, is the one whose sentence
   * does not use it.
   */
  const context = (
    stderr: string | null,
    ghHint: boolean
  ): Parameters<typeof cloneFailureMessage>[1] => {
    const s = get();
    const parsed: NormalizedCloneUrl | null = normalizeCloneUrl(s.address);
    return {
      host: parsed?.host ?? '',
      ...(parsed?.owner !== undefined ? { owner: parsed.owner } : {}),
      ...(parsed?.repo !== undefined ? { repo: parsed.repo } : {}),
      name: s.name.trim(),
      ...(stderr !== null ? { stderr } : {}),
      ...(ghHint ? { ghHint: CLONE_GH_HINT } : {})
    };
  };

  /**
   * Build the on-screen failure from the kind main classified.
   *
   * The sentence is ours, from the shared table, and never main's text parsed
   * back apart. The one thing read out of main's message is whether the `gh`
   * hint applies, because only main can run `gh auth status`.
   */
  const failureFor = (
    kind: CloneFailureKind,
    fromMain: string | null,
    detail: string | null
  ): CloneFailure => ({
    kind,
    message: cloneFailureMessage(
      kind,
      context(detail ?? fromMain, (fromMain ?? '').includes(CLONE_GH_HINT))
    ),
    detail
  });

  /**
   * A rejected invoke, which is how preflight reports a failure. Main puts the
   * `CloneFailureKind` on the payload for exactly this reason, so an address
   * failure and the same failure during a clone print the same sentence.
   */
  const failureFromRejection = (err: unknown): CloneFailure => {
    const payload = errorPayload(err) as { kind?: unknown } | null;
    const detail = detailOf(err);
    if (isFailureKind(payload?.kind)) {
      return failureFor(payload.kind, errorText(err), detail);
    }
    // Main did not classify it, which today means an input guard such as "A
    // clone needs an id." Its own sentence is the specific one; there is no
    // generic message to fall back to and none is invented.
    return { kind: 'unknown', message: errorText(err), detail };
  };

  /** Run `git ls-remote` through main. Resolves null when it failed. */
  const doPreflight = async (raw: string): Promise<ClonePreflight | null> => {
    const projects = bridge();
    if (projects?.clonePreflight === undefined) return null;
    set({ status: 'checking', failure: null, cancelNote: null });
    try {
      const result = await projects.clonePreflight({ raw });
      if (!get().open) return null;
      set((s) => ({
        status: 'editing',
        checkedAddress: raw,
        resolvedUrl: result.url,
        rewrittenFromSsh: result.rewrittenFromSsh === true,
        // Either side may have removed a token: the clipboard prefill does it
        // before the string reaches the field, and main does it again on the
        // address the user typed.
        strippedCredential:
          s.strippedCredential || result.strippedCredential === true,
        name: s.nameEdited ? s.name : result.suggestedName
      }));
      return result;
    } catch (err) {
      if (!get().open) return null;
      // A FAILURE IS AN ANSWER FOR THIS STRING, AND IT IS RECORDED AS ONE.
      //
      // Leaving `checkedAddress` null here cost the user the failure screen
      // entirely, and it was measured. After a failure the field takes the
      // keyboard, so the next mousedown anywhere in the dialog blurs it, and
      // the blur ran `checkAddress` again because the string did not match a
      // null `checkedAddress`. That re-check opened with `failure: null`,
      // which unmounted the error block and the [Show details] button inside
      // it, so the mouseup landed on nothing and no click was ever delivered.
      // The new failure moved the keyboard back to the field and the loop
      // closed. Three clicks on [Show details] and six presses of Tab each
      // spent one more `git ls-remote` at the host, ten round trips for one
      // bad address, and git's raw stderr was never once readable.
      //
      // Recording the string keeps the verdict on screen until the user edits
      // the field, and `setAddress` clears it, so a corrected address is
      // checked again on the next blur. Nothing is cloned on a stale answer
      // either, because `resolvedUrl` stays null and `submit` runs its own
      // check whenever that is so.
      const repeat = get().checkedAddress === raw;
      set({
        status: 'editing',
        checkedAddress: raw,
        resolvedUrl: null,
        failure: failureFromRejection(err)
      });
      // The keyboard goes to the field with its contents selected so typing
      // replaces the address (research 35 line 685). That is for a failure the
      // user has not seen yet. When the same address fails a second time the
      // keyboard stays where the user put it, because taking it back would
      // pull them off the [Show details] button they are reading.
      if (!repeat) focus('address', true);
      return null;
    }
  };

  /**
   * The same check, deduplicated by address.
   *
   * THE DEFECT THIS EXISTS TO PREVENT. Clicking [Clone repository] blurs the
   * Repository field first, and the blur is what starts the check. Without the
   * reuse below, the click that follows would either be dropped or would fire
   * a second `git ls-remote` at the same server, so the user's first click
   * would appear to do nothing and their second would work.
   */
  const runPreflight = (raw: string): Promise<ClonePreflight | null> => {
    if (inFlight.raw === raw && inFlight.promise !== null) {
      return inFlight.promise;
    }
    const promise = doPreflight(raw).finally(() => {
      if (inFlight.raw === raw) {
        inFlight.raw = null;
        inFlight.promise = null;
      }
    });
    inFlight.raw = raw;
    inFlight.promise = promise;
    return promise;
  };

  /** One progress frame. Rule 1 lives here. */
  const applyProgress = (frame: CloneProgress): void => {
    const word = CLONE_PHASE_WORDS[frame.phase];
    set((s) => {
      const changed = s.phaseWord !== word;
      return {
        phaseWord: word,
        // The bar carries THIS phase's number. A new word starts empty and
        // still: there is no indeterminate bar, and no total was invented.
        percent: frame.percent ?? (changed ? null : s.percent),
        // Only Downloading carries a byte figure, and it is git's own
        // cumulative one with no denominator, because git never prints one.
        bytes:
          frame.bytes ??
          (frame.phase === 'receiving' && !changed ? s.bytes : null)
      };
    });
  };

  /** The last frame on the stream. */
  const applyTerminal = (frame: CloneDone): void => {
    stopLive();
    if (frame.cancelled === true) {
      // Back to editable with every field intact, and one line saying what
      // main actually did on disk.
      set({
        status: 'editing',
        phaseWord: null,
        percent: null,
        bytes: null,
        cancelNote: cloneCancelledNote(frame.leftoverPath)
      });
      return;
    }
    if (frame.error !== undefined) {
      set({
        status: 'editing',
        phaseWord: null,
        percent: null,
        bytes: null,
        failure: failureFor(
          frame.error.kind,
          frame.error.message,
          frame.error.detail ?? null
        )
      });
      focus('address', true);
      return;
    }
    // Success. The tab appearing is the confirmation, so there is no toast.
    const path = frame.path ?? frame.project?.path ?? null;
    set({ open: false, ...BLANK });
    if (path !== null) {
      // Main already wrote the manifest row; this is the idempotent open that
      // lists the projects again and focuses the new tab.
      void useApp.getState().addProjectPath(path);
      focusFleetPrimary();
    }
  };

  /** Subscribe first, then spawn git. */
  const start = (url: string): void => {
    const projects = bridge();
    if (
      projects?.clone === undefined ||
      projects.onCloneProgress === undefined
    ) {
      return;
    }
    const s = get();
    const cloneId = crypto.randomUUID();
    stopLive();
    live.cloneId = cloneId;
    set({
      status: 'running',
      failure: null,
      cancelNote: null,
      detailsOpen: false,
      phaseWord: CLONE_PHASE_WORDS.starting,
      percent: null,
      bytes: null
    });
    live.unsubscribe = projects.onCloneProgress(cloneId, (frame) => {
      if (live.cloneId !== cloneId) return; // a superseded stream never paints
      if (isTerminal(frame)) applyTerminal(frame);
      else applyProgress(frame);
    });
    void projects
      .clone({
        cloneId,
        url,
        parentDir: s.parentDir.trim(),
        name: s.name.trim()
      })
      .catch((err: unknown) => {
        if (live.cloneId !== cloneId) return;
        stopLive();
        set({
          status: 'editing',
          phaseWord: null,
          percent: null,
          bytes: null,
          failure: failureFromRejection(err)
        });
        focus('address', true);
      });
  };

  return {
    open: false,
    ...BLANK,

    openDialog() {
      stopLive();
      set({ open: true, ...BLANK, parentDir: suggestedProjectParent() });
      // The first field is the first unknown, so it takes the keyboard until
      // the clipboard says otherwise.
      focus('address');
      void clipboardAddress().then((found) => {
        if (found === null || !get().open || get().address.length > 0) return;
        set({
          address: found.address,
          strippedCredential: found.strippedCredential,
          // Filled the moment the address parses, which is here rather than
          // after the preflight: the name comes from the address itself and
          // waiting on a network call to show it would be a lie about where
          // it came from.
          name: normalizeCloneUrl(found.address)?.suggestedName ?? ''
        });
        // The address is settled and the folder is not, so the keyboard moves
        // to the thing that is still missing. With a folder already guessed it
        // stays on the address, selected, so typing replaces the paste.
        if (get().parentDir.trim().length === 0) focus('parent');
        else focus('address', true);
      });
    },

    close() {
      // Esc and the scrim are inert during a clone, because a reflex keystroke
      // must not end a two minute download. Checking the address leaves the
      // dialog fully editable, so it closes normally.
      const status = get().status;
      if (status === 'running' || status === 'stopping') return;
      stopLive();
      set({ open: false, ...BLANK });
    },

    setAddress(value) {
      // Editing the address clears everything the previous one produced. The
      // resolved line, both notes and any failure all belonged to a string
      // that is no longer in the field.
      set((s) => ({
        address: value,
        checkedAddress: null,
        resolvedUrl: null,
        rewrittenFromSsh: false,
        strippedCredential: false,
        failure: null,
        cancelNote: null,
        // The user is typing in this field, so the next blur is theirs and a
        // check owed to a store-driven focus move is no longer owed.
        suppressAddressCheck: false,
        // The folder name follows the address until the user types in it.
        name: s.nameEdited
          ? s.name
          : (normalizeCloneUrl(value)?.suggestedName ?? '')
      }));
    },

    setName(value) {
      set({
        name: value,
        nameEdited: true,
        nameTouched: true,
        failure: null,
        cancelNote: null
      });
    },

    setParentDir(value) {
      set({ parentDir: value, failure: null, cancelNote: null });
    },

    chooseParent() {
      const projects = bridge();
      if (projects === undefined) return;
      void projects.pickDirectory().then((dir) => {
        if (dir === null || !get().open) return;
        set({ parentDir: dir, failure: null, cancelNote: null });
        focus(get().name.trim().length === 0 ? 'name' : 'address');
      });
    },

    checkAddress() {
      const s = get();
      if (s.status !== 'editing') return;
      // The store moved the keyboard, so this blur is not the user leaving the
      // field. One check is skipped and the flag is spent.
      if (s.suppressAddressCheck) {
        set({ suppressAddressCheck: false });
        return;
      }
      const raw = s.address.trim();
      if (raw.length === 0 || raw === s.checkedAddress) return;
      // A string that cannot be an address is answered here, with no network
      // call and no keychain lookup. The rules are the shared ones, so the
      // dialog and main refuse exactly the same strings.
      if (normalizeCloneUrl(raw) === null) {
        // Recorded for the same reason a network failure is. This verdict
        // belongs to this string, so a later blur must not rebuild it and
        // churn the error block the user is trying to click into.
        set({ checkedAddress: raw, failure: failureFor('badUrl', null, null) });
        return;
      }
      void runPreflight(raw);
    },

    submit() {
      const s = get();
      // 'checking' is accepted, not refused. The blur that starts the check is
      // caused by the click on [Clone repository], so refusing here would drop
      // the user's first click and work on their second.
      if (s.status === 'running' || s.status === 'stopping') return;
      const raw = s.address.trim();
      if (raw.length === 0) {
        focus('address');
        return;
      }
      if (normalizeCloneUrl(raw) === null) {
        set({ failure: failureFor('badUrl', null, null) });
        focus('address', true);
        return;
      }
      if (s.parentDir.trim().length === 0) {
        // There is nothing to say that the field does not already say. The
        // keyboard moves to the one thing that is missing.
        focus('parent');
        return;
      }
      if (validateProjectName(s.name) !== null) {
        set({ nameTouched: true });
        focus('name');
        return;
      }
      // Preflight is what moves almost every failure to before anything exists
      // on disk. Reuse the one that already ran for this exact address;
      // otherwise run it now and clone on its result.
      if (raw === s.checkedAddress && s.resolvedUrl !== null) {
        start(s.resolvedUrl);
        return;
      }
      void runPreflight(raw).then((result) => {
        if (result === null || !get().open) return;
        if (validateProjectName(get().name) !== null) {
          set({ nameTouched: true });
          focus('name');
          return;
        }
        start(result.url);
      });
    },

    cancel() {
      const cloneId = live.cloneId;
      if (get().status !== 'running' || cloneId === null) return;
      // The button says Stopping… and nothing else changes. The stream's own
      // terminal frame is what returns the dialog to editable, because only
      // main knows whether the temporary directory was removed.
      set({ status: 'stopping' });
      const pending = bridge()?.cancelClone?.(cloneId);
      void pending?.catch(() => undefined);
    },

    toggleDetails() {
      set((s) => ({ detailsOpen: !s.detailsOpen }));
    }
  };
});
