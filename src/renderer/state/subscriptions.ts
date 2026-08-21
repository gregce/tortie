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
import type { InstalledGmuxApi } from '@shared/ipc';
import type { DurabilityNotice, GmuxNotice } from '@shared/notice';
import { isDurabilityNotice } from '@shared/notice';
import { formatScrollbackBytes } from '@shared/scrollback';
import type { GmuxErrorPayload } from '@shared/types';
import type { AppState, BootBlock } from './app-state';
import { errorPayload, errorText } from './errors';
import { loadLocal } from './local';
import { LS_ACTIVE_PROJECT } from './projects-slice';
import { pullPendingShellOpen } from './shell-open';
import { gmuxBridge } from '../bridge';

type AppStore = StoreApi<AppState>;

/**
 * Fetch main's truth (projects + sessions) and adopt it, including the boot
 * toasts and the tmux-missing block. Safe to call again: a retry re-fetches
 * and re-adopts, and the union below means a project added while the list
 * was in flight is never dropped.
 */
export async function hydrateAppState(store: AppStore): Promise<void> {
  const gmux = gmuxBridge();
  if (!gmux) return;
  const { getState, setState } = store;
  try {
    // PHASE 81, and its position is load bearing (Phase 81.1). It is asked
    // BEFORE the two lists are awaited, not after them. It sat after them
    // once, and any failure in this try that was not a boot block code then
    // skipped it, so every Restore control stayed greyed for the whole run
    // under a sentence that was no longer true, and quitting was the only way
    // out. Restore worked in that state before Phase 81, so it was a
    // regression. Not awaited, because the session list must not wait on it
    // and this only decides whether Restore is pressable yet.
    void readShellPathReady(store);
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
      bootBlockMessage: null,
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
    // PHASE 71. The link state of every machine, read once here.
    //
    // It is read separately from the session list because it answers a question
    // the session list cannot: a confirmed machine that is asleep produces no
    // session row on this Mac at all, so without this read the window would
    // have nothing to draw for a person who left an agent running there. The
    // read never blocks the boot: a build with no machines surface, or a read
    // that fails, leaves the list empty and every other surface as it was.
    void readMachineStates(store);
    // PHASE 109. Which agents each machine has, as main last heard. The read
    // hands back what is already in main's memory and starts no scan, so it
    // never contacts a machine and never slows the boot. Not awaited for the
    // same reason the machine states read is not.
    void readMachineAgents(store);
    // Phase 51: a folder passed to a cold launch (`tortie .` or a Finder
    // open while Tortie was not running). The pull is take-and-clear
    // main-side, so this and the shell-open-pending menu action can both
    // exist without ever opening the same folder twice. Since Phase 61 the
    // pull carries an optional file that opens after the project does.
    void pullPendingShellOpen();
  } catch (err) {
    const payload = errorPayload(err);
    // Phase 41: three codes, three screens. Each one also carries the sentence
    // main composed, because the version block's sentence holds two numbers
    // that exist nowhere in the renderer.
    const block = payload === null ? null : BOOT_BLOCK_BY_CODE[payload.code];
    if (payload !== null && block !== undefined) {
      setState({
        ready: true,
        bootBlock: block,
        bootBlockMessage: payload.message,
        bootErrorDetail: payload.detail ?? null
      });
    } else {
      setState({ ready: true });
      getState().toast('error', errorText(err), { sticky: true });
    }
  }
}

/**
 * The machines surface, when this build has one (Phase 71).
 *
 * It is optional on the bridge, exactly as `config` is, so a build without it
 * shows no Machines section and reports no machines. Feature-detected here
 * rather than assumed, so the boot of a build without it is unchanged.
 */
function machinesExtras(): InstalledGmuxApi['machines'] | null {
  const gmux = gmuxBridge();
  if (!gmux) return null;
  return gmux.machines ?? null;
}

/**
 * Read the machine link state once and adopt it.
 *
 * Failures are swallowed on purpose. This list is a statement about other
 * computers, and no failure to read it should stop a person from using the
 * sessions on the one in front of them.
 */
async function readMachineStates(store: AppStore): Promise<void> {
  const machines = machinesExtras();
  if (machines === null || typeof machines.state !== 'function') return;
  try {
    store.getState().applyMachineStates(await machines.state());
  } catch {
    /* a machine list that could not be read leaves the previous one alone */
  }
}

/**
 * Read the held machine agent answers once and adopt them (Phase 109).
 *
 * `fresh: false` reads main's memory and starts nothing, so this costs one
 * round trip and never contacts a machine. A bridge without the method is an
 * older preload; the list then stays empty, and an empty list draws every
 * tile on, because only a positive absent may grey one. Failures are
 * swallowed on the same terms as the machine states read above.
 */
async function readMachineAgents(store: AppStore): Promise<void> {
  const machines = machinesExtras();
  if (machines === null || typeof machines.agents !== 'function') return;
  try {
    store.getState().applyMachineAgents(await machines.agents(null, false));
  } catch {
    /* an answer that could not be read leaves the previous one alone */
  }
}

/**
 * Ask main whether the login shell PATH is installed, and flip the flag when
 * it says so.
 *
 * PHASE 81. The five Restore controls are off until this resolves. A build
 * whose preload has no such method starts with the flag already true, so this
 * function returns at once and the controls behave the way they always did.
 * A failure is swallowed: main awaits the same promise on the restore path,
 * so a flag that never flipped would cost the person a disabled button and
 * never a wrong restore. The call itself always resolves, at worst on the
 * capture's own 10,000 ms deadline.
 */
async function readShellPathReady(store: AppStore): Promise<void> {
  const gmux = gmuxBridge();
  if (!gmux) return;
  const sessions = gmux.sessions;
  if (typeof sessions.shellPathReady !== 'function') {
    store.getState().applyShellPathReady();
    return;
  }
  try {
    await sessions.shellPathReady();
    store.getState().applyShellPathReady();
  } catch {
    /* the controls stay off; main's own wait is what keeps a restore right */
  }
}

/** Which main-process failure stops the boot, and with which screen. */
const BOOT_BLOCK_BY_CODE: Partial<
  Record<GmuxErrorPayload['code'], Exclude<BootBlock, null>>
> = {
  TMUX_NOT_FOUND: 'tmux-missing',
  TMUX_BUNDLE_INCOMPLETE: 'tmux-bundle-incomplete',
  TMUX_VERSION_UNTESTED: 'tmux-version-blocked'
};

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
  const gmux = gmuxBridge();
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
    // PHASE 84, item 2. A session on another machine gets its own sentence,
    // and it is ahead of the local one because the local one ends with a
    // promise that is false over there. "Restore resumes it" is true on this
    // Mac, where the conversation comes back. A session on another machine
    // comes back with its folder and its program and no conversation, and the
    // copy this notice is about is the only thing that would have held what it
    // printed. So the second half says what is left rather than what to press.
    if (
      notice.remote === true &&
      notice.atSessionEnd === true &&
      notice.sessionName !== undefined
    ) {
      getState().toast(
        'error',
        `"${shortName(notice.sessionName)}" was not saved. Nothing more of it is here.`,
        { sticky: true }
      );
      return;
    }
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
    const fsExtras = gmux ? gmux.fs : null;
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
    const fsExtras = gmux ? gmux.fs : null;
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
  if (notice.kind === 'unclean-exit') {
    // Phase 35. The previous run did not exit cleanly: the run sentinel
    // survived, and main already wrote the boot.unclean_exit record with
    // the crash dump delta. This is INFO, never error, because the crash
    // already happened, the sessions live in the tmux server, and there is
    // nothing degraded about the run the user is in now. The second half
    // of the research sentence ("Details are in the logs.") does not fit
    // the toast's 58 characters beside the first, so it moved into the
    // action, which is where it already pointed.
    const logExtras = gmux ? gmux.log : null;
    const openFolder = logExtras?.openFolder;
    getState().toast('info', 'Tortie quit unexpectedly last time.', {
      sticky: true,
      ...(typeof openFolder === 'function'
        ? {
            action: {
              label: 'View logs',
              run: () => void openFolder()
            }
          }
        : {})
    });
    return;
  }
  if (notice.kind === 'env-unresolved') {
    // Phase 33. The pane exists and the agent is running. What is missing
    // is a variable the row promises through launch.envPassthrough: the
    // login shell probe found it unset, empty or over the size cap, or the
    // probe itself failed. Main sends the fact once per session per run.
    // There is no action button, because there is nothing Tortie can run
    // for the user. The fix is in their own shell startup files. Two lines
    // of about 29 characters, matching the restore shortfall pattern.
    const short = shortName(notice.sessionName);
    getState().toast(
      'error',
      notice.probeFailed
        ? `"${short}" started without its shell variables.`
        : notice.names.length === 1
          ? `"${short}" started without ${notice.names[0]}.`
          : `"${short}" started without ${notice.names.length} of its variables.`,
      { sticky: true }
    );
    return;
  }
  if (notice.kind === 'shell-path-fallback') {
    // Phase 81. The login shell did not print its PATH, so every pane this
    // run gets the fallback, which carries no version managed node directory.
    // The sentence says the consequence and not the mechanism, because "your
    // shell did not print its PATH" is not something a person can act on and
    // "agents may not start" is. 47 characters, which is two lines of about
    // 26 beside the action button. The shell's own name is in the log, which
    // is where the action goes, because a path does not fit here.
    const logExtras = gmux ? gmux.log : null;
    const openFolder = logExtras?.openFolder;
    getState().toast('error', 'Your shell did not answer. Agents may not start.', {
      sticky: true,
      ...(typeof openFolder === 'function'
        ? {
            action: {
              label: 'View logs',
              run: () => void openFolder()
            }
          }
        : {})
    });
    return;
  }
  if (notice.kind === 'remote-resume') {
    // Phase 89. A session on another machine came back and the command that
    // continues its conversation did not land once. Two lines of about 29
    // characters with no button beside it, which is the same shape the
    // restore shortfall sentence above measured.
    //
    // THERE IS NO SENTENCE FOR THE GOOD ANSWER, and main sends none. A command
    // that landed exactly once is sitting on the screen of that session where
    // the person can read it, so nothing is degraded and a toast would be a
    // dashboard line rather than a notice.
    //
    // There is no action button on any of the three, because the thing to do
    // is in that session on the other machine and Tortie cannot press it from
    // here. The three sentences measure 51, 48 and 54 characters with the
    // longest name this helper can produce, against the 58 the column holds.
    const short = shortName(notice.sessionName);
    getState().toast(
      'error',
      notice.landing === 'twice'
        ? `"${short}" was typed twice. Clear the line.`
        : notice.landing === 'absent'
          ? `"${short}" came back without its resume.`
          : `Tortie cannot read "${short}" on that machine.`,
      { sticky: true }
    );
    return;
  }
  if (notice.kind === 'remote-work-cut-off') {
    // Phase 118. A copy onto another machine was ended because the person
    // quit. The folder on that machine may hold part of the project, and the
    // next attempt refuses that path by name, so this is the one moment a
    // person can be told.
    //
    // THE PATH IS NOT IN THE SENTENCE. Two lines of about 26 characters beside
    // the action button have no room for a folder on another computer, so the
    // path is in the log and the action goes there. Measured with the longest
    // name `shortName` can produce: 53 characters against the 58 the column
    // holds.
    const short = shortName(notice.machineLabel);
    const logExtras = gmux ? gmux.log : null;
    const openFolder = logExtras?.openFolder;
    getState().toast(
      'error',
      notice.count === 1
        ? `The copy to "${short}" stopped when you quit.`
        : `${notice.count} copies to machines stopped when you quit.`,
      {
        sticky: true,
        ...(typeof openFolder === 'function'
          ? {
              action: {
                label: 'View logs',
                run: () => void openFolder()
              }
            }
          : {})
      }
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
  const gmux = gmuxBridge();
  const openSettings = (): void => {
    void gmux?.openSettings?.();
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
  const gmux = gmuxBridge();
  if (!gmux) return () => undefined;
  const { getState, setState } = store;

  const activityExtras = gmux;
  const scrollbackExtras = gmux.scrollback ?? null;
  const specstoryExtras = gmux.specstory ?? null;
  // Phase 19 item 9. Only the backlog drain lives here; the notices
  // themselves arrive on scrollback.onNotice, the channel they all share.
  const noticeExtras = gmux.notice ?? null;

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

  // Phase 71. Main pushes the whole machine list whenever any machine's link
  // changes, and whenever the machines file changes. There is one push and one
  // handler, so the window never has to poll main for it.
  const machinesApi = machinesExtras();
  keep(
    machinesApi?.onStateChanged?.((states) => {
      getState().applyMachineStates(states);
    })
  );

  // Phase 109. Main pushes every machine's agent answer whenever a scan lands
  // or a create teaches it something. One push and one handler, the same shape
  // as the machine states above, and no polling anywhere.
  keep(
    machinesApi?.onAgentsChanged?.((views) => {
      getState().applyMachineAgents(views);
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
