/**
 * SpecStory integration contract (Phase 15): the Settings status pull,
 * the device-flow auth actions, and the capture failure notice. Moved
 * verbatim from src/shared/ipc.ts (Phase 42 stage 2).
 */

// ---------------------------------------------------------------------------
// APPENDED by the Phase-15 SpecStory settings+status stream (research
// docs/research/13-specstory-integration.md §3.4) — new channels/types only.
// The one existing line touched above is the GmuxInvokeChannelMap
// intersection, exactly as that declaration's own comment prescribes.
//
// FOUR CHANNELS, ALL PULLS OR ACTIONS, NONE OF THEM A FEED. There is no
// `specstory:changed` event and no timer: Settings reads the status when the
// section mounts, when its window regains focus, and after an action it just
// took. ZEN-OF-TORTIE forbids a dashboard, and an account line that re-renders
// on its own is one.
//
// Main handler: registerSpecStoryStatusIpc, called by registerSettingsIpc
// (src/main/settings/ipc.ts) — the Settings window is the only consumer today.
// ---------------------------------------------------------------------------

import type {
  SpecStoryAuthActionResult,
  SpecStoryLoginStart,
  SpecStoryStatus
} from '../specstory-status';

/** New invoke channels appended by the SpecStory settings+status stream. */
export interface SpecStoryStatusInvokeChannelMap {
  /**
   * Binary + account + capturable agents, in one round trip. `refresh: true`
   * drops main's cached binary resolution (the only part that can cost a
   * spawn); the account is always re-read from auth.json, which is one stat
   * and, when the file moved, one small parse.
   */
  'specstory:status': { req: [refresh?: boolean]; res: SpecStoryStatus };
  /**
   * Start the device flow: ONE `specstory login`, which opens the login page
   * itself and then waits on its stdin. `opened: false` means that child could
   * not be started at all, and the URL is shown so the user is never stuck.
   * gmux deliberately does not open the page as well — see
   * src/main/specstory/login.ts for the double-tab that avoids.
   */
  'specstory:beginLogin': { req: []; res: SpecStoryLoginStart };
  /** Abandon a sign-in in progress, killing the waiting CLI. */
  'specstory:cancelLogin': { req: []; res: void };
  /**
   * Finish the device flow: write the 6-character code to the stdin of the
   * `specstory login` already waiting for it (the CLI reads with
   * `bufio.NewReader(os.Stdin)`, so a pipe is as good as a terminal) and
   * return the re-read status. A rejected code leaves that CLI at its next
   * prompt, so the user can simply retype.
   */
  'specstory:submitCode': {
    req: [code: string];
    res: SpecStoryAuthActionResult;
  };
  /** `specstory logout` — server-side revoke, then auth.json is deleted. */
  'specstory:signOut': { req: []; res: SpecStoryAuthActionResult };
}

/**
 * OPTIONAL top-level extra on window.gmux, feature-detected by both renderers
 * (`typeof window.gmux.specstory?.status === 'function'`). Without it the
 * Settings section renders one honest line instead of dead controls.
 */
export interface GmuxSpecStoryExtras {
  specstory?: {
    status(refresh?: boolean): Promise<SpecStoryStatus>;
    beginLogin(): Promise<SpecStoryLoginStart>;
    cancelLogin(): Promise<void>;
    submitCode(code: string): Promise<SpecStoryAuthActionResult>;
    signOut(): Promise<SpecStoryAuthActionResult>;
    /**
     * APPENDED by the Phase-15 capture+sync stream. The one thing on this
     * surface that is pushed rather than pulled: a session-end capture flush
     * that did NOT work, or a capture the user asked for at create and did
     * not get. Failures only — a healthy capture says nothing, ever.
     */
    onNotice?(cb: (notice: SessionCaptureNotice) => void): () => void;
  };
}

// ---------------------------------------------------------------------------
// APPENDED by the Phase-15 capture+sync stream — ONE event, no channels.
// The one existing line touched above is the AllEventPayloadMap intersection,
// exactly as its own comment prescribes.
//
// WHY AN EVENT AT ALL, when the sibling SpecStory block above deliberately has
// none: this one is not a reading and not a status, it is a FAILURE that
// happened while nobody was looking. A session ended, gmux ran the SpecStory
// flush that recovers the tail of the conversation (research 13 §1.2), and it
// did not work. The user opted into capture; being told once, in a sentence,
// is the difference between "saved" and "silently not saved". Success emits
// nothing — there is no counterpart that reports a healthy sync, by design.
// ---------------------------------------------------------------------------

import type { SessionCaptureNotice } from '../types';

/** Main → renderers: a session-end SpecStory sync did not succeed. */
export const EVT_CAPTURE_NOTICE = 'capture:notice' as const;

export interface CaptureEventPayloadMap {
  'capture:notice': [notice: SessionCaptureNotice];
}
