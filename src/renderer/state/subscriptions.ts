/**
 * The renderer's ONE lifecycle owner (Phase 42 stage 4, audit §target
 * lifecycle paths): hydration and event subscription, separated so a retry
 * can hydrate again WITHOUT attaching a second set of bridge handlers.
 *
 * Before this module existed, `boot()` did both in one body, and every call
 * re-registered sessions.onChanged, the notice channel and the rest. The
 * single-boot path never noticed; the tmux-missing retry path accumulated a
 * duplicate handler set per click of "Check again", so one notice could
 * toast twice. Now:
 *
 *   boot()      → hydrateAppState() then startAppSubscriptions()
 *   retryBoot() → the same, and the start is a NO-OP while handlers are live
 *
 * `startAppSubscriptions` returns its disposer. The store's boot path keeps
 * the subscriptions for the life of the window (there is nothing to hand
 * them back to — the window IS the lifetime); the disposer exists for tests
 * and for any future owner that unmounts the shell.
 *
 * The notice SENTENCES live here with the channel they arrive on: main sends
 * the fact, this module writes the words, the notices slice only queues the
 * toast.
 */

import type { StoreApi } from 'zustand';
import type {
  GmuxActivityExtras,
  GmuxFsExtras,
  GmuxNoticeExtras,
  GmuxScrollbackExtras,
  GmuxSettingsExtras,
  GmuxSpecStoryExtras
} from '@shared/ipc';
import type { DurabilityNotice, GmuxNotice } from '@shared/notice';
import { isDurabilityNotice } from '@shared/notice';
import { formatScrollbackBytes } from '@shared/scrollback';
import type { AppState } from './app-state';
import { errorPayload, errorText } from './errors';
import { loadLocal } from './local';
import { LS_ACTIVE_PROJECT } from './projects-slice';

type AppStore = StoreApi<AppState>;

/**
 * Fetch main's truth (projects + sessions) and adopt it, including the boot
 * toasts and the tmux-missing block. Safe to call again: a retry re-fetches
 * and re-adopts, and the union below means a project added while the list
 * was in flight is never dropped.
 */
export async function hydrateAppState(store: AppStore): Promise<void> {
  const gmux = window.gmux as typeof window.gmux | undefined;
  if (!gmux) return;
  const { getState, setState } = store;
  try {
    const [projects, sessions] = await Promise.all([
      gmux.projects.list(),
      gmux.sessions.list()
    ]);
    // A project added WHILE this list was in flight is also main's truth
    // — it went through projects:add and is in the manifest; it is just
    // newer than the snapshot. Overwriting would silently drop it, which
    // is what a ⌘O (or the screenshot harness) in the first second used
    // to do. Union, keeping the manifest's order and appending the ones
    // this read could not have seen.
    const known = new Set(projects.map((p) => p.id));
    const merged = [
      ...projects,
      ...getState().projects.filter((p) => !known.has(p.id))
    ];
    const savedActive = loadLocal<string | null>(LS_ACTIVE_PROJECT, null);
    const activeProjectId =
      getState().activeProjectId ??
      merged.find((p) => p.id === savedActive)?.id ??
      merged[0]?.id ??
      null;
    setState({
      ready: true,
      bootBlock: null,
      bootErrorDetail: null,
      projects: merged,
      activeProjectId
    });
    getState().applySessions(sessions);
    // §6.7 — T1 restore moment: sessions were running while gmux was
    // closed. One calm toast, no friction.
    if (sessions.some((x) => x.status === 'running')) {
      getState().toast(
        'success',
        'Restored. Your sessions were never interrupted.'
      );
    }
    const restorable = sessions.filter((x) => x.status === 'restorable');
    if (restorable.length > 0) {
      getState().toast(
        'info',
        restorable.length === 1
          ? '1 session is saved and ready to restore.'
          : `${restorable.length} sessions are saved and ready to restore.`
      );
    }
  } catch (err) {
    const payload = errorPayload(err);
    if (payload?.code === 'TMUX_NOT_FOUND') {
      setState({
        ready: true,
        bootBlock: 'tmux-missing',
        bootErrorDetail: payload.detail ?? null
      });
    } else {
      setState({ ready: true });
      getState().toast('error', errorText(err), { sticky: true });
    }
  }
}

// ---------------------------------------------------------------------------
// The notice sentences
// ---------------------------------------------------------------------------

const shortName = (name: string): string =>
  name.length > 16 ? `${name.slice(0, 15)}…` : name;

/**
 * The degraded states, kept in their own function so the `never` at the
 * foot of it is a real exhaustiveness check. It cannot cover the three
 * scrollback kinds handled in `showNotice`, which share one interface with a
 * union-typed `kind` rather than being a discriminated union.
 */
function showDegraded(store: AppStore, notice: DurabilityNotice): void {
  const { getState } = store;
  const gmux = window.gmux as typeof window.gmux | undefined;
  if (notice.kind === 'snapshot-failed') {
    // Disk full first: it is the one cause the user can clear, and the
    // sentence tells them what to do regardless of which pass failed.
    if (notice.outOfSpace) {
      getState().toast(
        'error',
        'The disk is full. Your sessions are not being saved.',
        { sticky: true }
      );
      return;
    }
    // Phase 26.3 — the end confirm promised "saved first", so when the
    // end-time capture fails the sentence must name the session and
    // say what a later Restore still does. The full sentence ("its
    // scrollback could not be saved. Restore will bring back the
    // conversation only") is 111 characters and the toast physically
    // holds 58, so it is compressed: "was not saved" is the scrollback
    // loss, and "Restore resumes it" is the half that still works.
    if (notice.atSessionEnd === true && notice.sessionName !== undefined) {
      getState().toast(
        'error',
        `"${shortName(notice.sessionName)}" was not saved. Restore resumes it.`,
        { sticky: true }
      );
      return;
    }
    getState().toast(
      'error',
      `${notice.sessions === 1 ? '1 session' : `${notice.sessions} sessions`} could not be saved.`,
      { sticky: true }
    );
    return;
  }
  if (notice.kind === 'snapshot-repaired') {
    getState().toast(
      'info',
      `"${shortName(notice.sessionName)}" came back from an earlier save.`,
      { sticky: true }
    );
    return;
  }
  if (notice.kind === 'manifest-unreadable') {
    // NOT the damaged sentence. The file is intact and Tortie could not
    // open it, which is a permission or a read only volume, and the user
    // needs to look at the folder rather than hunt for a quarantine.
    const fsExtras = gmux
      ? (gmux.fs as typeof gmux.fs & GmuxFsExtras)
      : null;
    const reveal = fsExtras?.reveal;
    getState().toast('error', 'Tortie cannot read your session list.', {
      sticky: true,
      ...(typeof reveal === 'function'
        ? {
            action: {
              label: 'Show the file',
              run: () => void reveal(notice.path)
            }
          }
        : {})
    });
    return;
  }
  if (notice.kind === 'restore-shortfall') {
    // Two lines beside no button, so about 29 characters a line. The
    // session name is shortened first and the sentence names the ONE
    // thing that did not come back.
    const short = shortName(notice.sessionName);
    getState().toast(
      'error',
      notice.stage === 'both'
        ? `"${short}" came back empty.`
        : notice.stage === 'scrollback'
          ? `"${short}" lost its saved output.`
          : `"${short}" came back without its agent.`,
      { sticky: true }
    );
    return;
  }
  if (notice.kind === 'manifest-quarantined') {
    // The path is the point of this one. A quarantine the user cannot
    // find reads exactly like a delete, so the toast carries the reveal
    // rather than the path, which would not fit in two lines.
    //
    // THE SENTENCES ARE SHORT BECAUSE THE COLUMN IS NARROW. With the
    // action button beside it the text column measured 182 px, which is
    // two lines of about 26 characters. The first drafts were 57 and 56
    // characters and both clamped, so the user read "Your session list
    // was damaged. An earlier copy is…" and never saw the outcome. These
    // are 42 and 39.
    const fsExtras = gmux
      ? (gmux.fs as typeof gmux.fs & GmuxFsExtras)
      : null;
    const reveal = fsExtras?.reveal;
    getState().toast(
      'error',
      notice.recoveredAt !== null
        ? 'Session list damaged. It was rebuilt.'
        : 'Session list damaged. None came back.',
      {
        sticky: true,
        ...(typeof reveal === 'function'
          ? {
              action: {
                label: 'Show the file',
                run: () => void reveal(notice.quarantinePath)
              }
            }
          : {})
      }
    );
    return;
  }
  if (notice.kind === 'depth-degraded') {
    getState().toast(
      'error',
      `Sessions are keeping ${notice.actualLines.toLocaleString()} lines, ` +
        `not ${notice.requestedLines.toLocaleString()}.`,
      { sticky: true }
    );
    return;
  }
  if (notice.kind === 'backup-failing') {
    // Two lines of about 29 characters with no button beside it. The
    // sentence has to say that the copies stopped, and NOT that the
    // session list is damaged, because it is not: what has been lost is
    // the copy that would bring it back. 38 characters.
    getState().toast('error', 'Session list backups are failing.', {
      sticky: true
    });
    return;
  }
  if (notice.kind === 'restore-incomplete') {
    getState().toast(
      'error',
      `"${shortName(notice.sessionName)}" did not finish coming back.`,
      { sticky: true }
    );
    return;
  }
  if (notice.kind === 'update-incomplete') {
    // Phase 24. The post update self check found the swapped bundle
    // missing a resource. The reinstall sentence is honest because no
    // user data lives in the bundle: sessions are on the tmux server
    // and the manifest is in userData, so putting a fresh Tortie.app
    // in place recovers everything. The missing labels are in the log.
    getState().toast(
      'error',
      'This update is missing files. Reinstall Tortie to repair it.',
      { sticky: true }
    );
    return;
  }
  // A kind added to the shared union without a sentence here fails the
  // build, rather than shipping a degraded state nobody is told about.
  const unhandled: never = notice;
  return unhandled;
}

function showNotice(store: AppStore, notice: GmuxNotice): void {
  const { getState } = store;
  if (isDurabilityNotice(notice)) {
    showDegraded(store, notice);
    return;
  }
  const gmux = window.gmux as typeof window.gmux | undefined;
  const openSettings = (): void => {
    void (
      gmux as (typeof gmux & GmuxSettingsExtras) | undefined
    )?.openSettings?.();
  };
  if (notice.kind === 'discarding') {
    // A toast is clamped to TWO LINES (S10, .toast-text) and beside the
    // action button and the dismiss × that is about 29 characters a
    // line — MEASURED in the running app, where the first two drafts of
    // this sentence were cut off mid-word with the remedy missing
    // entirely. So the toast carries only the session and the loss.
    // What the user must not misunderstand — that a deeper setting
    // helps the NEXT session, not this one — is the first sentence of
    // the card [Change depth] opens, which is where they can act on it.
    const short = shortName(notice.sessionName ?? '');
    getState().toast('info', `"${short}" is discarding old output.`, {
      sticky: true,
      action: { label: 'Change depth', run: openSettings }
    });
    return;
  }
  if (notice.kind === 'saved-large') {
    getState().toast(
      'info',
      `Saved scrollback is using ${formatScrollbackBytes(notice.bytes ?? 0)}. ` +
        'You can save less of each session.',
      {
        sticky: true,
        action: { label: 'Open settings', run: openSettings }
      }
    );
    return;
  }
  getState().toast(
    'error',
    'Low disk space. Sessions may not be saved when you quit.',
    { sticky: true }
  );
}

// ---------------------------------------------------------------------------
// The subscriptions
// ---------------------------------------------------------------------------

let activeDispose: (() => void) | null = null;

/**
 * Attach every bridge event handler the shell lives on, exactly once.
 *
 * Idempotent: while a handler set is live, calling this again registers
 * NOTHING and returns the live disposer — that is what lets retryBoot() go
 * through the same boot() body as the first attempt. Disposing detaches
 * every handler and re-arms the next start (which will also re-drain: the
 * pending queue is destructive on main's side, so a second drain only ever
 * returns notices posted since).
 */
export function startAppSubscriptions(store: AppStore): () => void {
  if (activeDispose !== null) return activeDispose;
  const gmux = window.gmux as typeof window.gmux | undefined;
  if (!gmux) return () => undefined;
  const { getState, setState } = store;

  const activityExtras = gmux as typeof gmux & GmuxActivityExtras;
  const scrollbackExtras =
    (gmux as typeof gmux & GmuxScrollbackExtras).scrollback ?? null;
  const specstoryExtras =
    (gmux as typeof gmux & GmuxSpecStoryExtras).specstory ?? null;
  // Phase 19 item 9. Only the backlog drain lives here; the notices
  // themselves arrive on scrollback.onNotice, the channel they all share.
  const noticeExtras = (gmux as typeof gmux & GmuxNoticeExtras).notice ?? null;

  const unsubs: Array<() => void> = [];
  const keep = (unsub: (() => void) | undefined): void => {
    if (typeof unsub === 'function') unsubs.push(unsub);
  };

  keep(gmux.sessions.onChanged((sessions) => {
    getState().applySessions(sessions);
  }));
  keep(gmux.sessions.onStatusChanged((sessionId, status) => {
    getState().applySessionStatus(sessionId, status);
  }));

  // ⌘J excerpts and last-output times (Phase 13). These used to be
  // scraped off the visible pane's byte stream; main now sources them
  // from the same poll that decides status, so HIDDEN sessions have
  // them too.
  // Phase 13.7 — the two things scrollback is allowed to say unasked.
  // Both are durability EVENTS with an irreversible consequence, not
  // readings: output is being thrown away, or it may not be saveable at
  // all. Each speaks once (main latches them), names what it is about,
  // and offers the action. There is no counterpart that reports a
  // healthy state, by design.
  //
  // Phase 19 item 9 widened this one subscription to carry the degraded
  // durability states as well (src/shared/notice.ts). The rule is the same
  // rule, which is why they share a channel rather than getting a second
  // one: a notice exists only when a layer is degraded, it speaks once,
  // and there is nothing that reports a healthy state.
  keep(scrollbackExtras?.onNotice((notice) => showNotice(store, notice)));
  // Drain the notices main had to post before this window existed. The
  // manifest integrity check is the reason: it runs while the database is
  // being opened, which is before there is anything to broadcast to. The
  // drain is destructive and happens once, so nothing is ever said twice.
  if (typeof noticeExtras?.pending === 'function') {
    void noticeExtras.pending().then(
      (pending) => {
        for (const notice of pending) showNotice(store, notice);
      },
      () => undefined
    );
  }

  // Phase 15 — SpecStory capture, failures only. Main runs the flush that
  // recovers the tail of a captured conversation when a session ends, and
  // says nothing when it works. These are the two cases where the user
  // asked for capture and did not get it, and each is said ONCE.
  //
  // The toast carries the session and the consequence, in the two lines
  // (~29 characters each, beside the dismiss ×) that S10 actually gives —
  // main's longer sentence, with the CLI's own reason in it, is in the
  // app log where a diagnosis belongs.
  keep(
    specstoryExtras?.onNotice?.((notice) => {
      const name = shortName(notice.sessionName);
      if (notice.kind === 'declined') {
        // Said at create time, next to the session it is about, because the
        // alternative is finding an empty .specstory/history days later.
        getState().toast(
          'info',
          `"${name}" is running without SpecStory capture.`
        );
        return;
      }
      getState().toast(
        'error',
        `SpecStory may not have saved the end of "${name}".`,
        { sticky: true }
      );
    })
  );

  keep(
    activityExtras.onActivityChanged?.((updates) => {
      setState((s) => {
        const excerpts = { ...s.excerpts };
        const lastActivity = { ...s.lastActivity };
        for (const u of updates) {
          if (u.excerpt !== undefined) excerpts[u.sessionId] = u.excerpt;
          if (u.lastActivityAt !== undefined) {
            lastActivity[u.sessionId] = u.lastActivityAt;
          }
        }
        return { excerpts, lastActivity };
      });
    })
  );

  const dispose = (): void => {
    activeDispose = null;
    for (const unsub of unsubs) {
      try {
        unsub();
      } catch {
        /* a handler that is already gone is the state we want */
      }
    }
  };
  activeDispose = dispose;
  return dispose;
}

/** Whether a handler set is currently attached (tests). */
export function appSubscriptionsActive(): boolean {
  return activeDispose !== null;
}
