/**
 * What Tortie says when its session list stops reading correctly while it runs
 * (Phase 357).
 *
 * On 2026-11-05 every read of the session list in one running 0.114.0 answered
 * "database disk image is malformed", a dialog appeared once per refresh, and
 * the quit crashed inside SQLite's page cache, while the FILE passed its full
 * check at the next launch. From the first such answer the store in
 * src/main/manifest/store.ts stops: it refuses every read and every write before
 * SQLite and asks for one restart. These are the only words that say so, held in
 * one place so the Mac's notice, a refused create and the phone's Needs input
 * list cannot say three different things about one fault.
 *
 * WHAT IS NOT HERE. No word on any surface says whether the file itself is
 * fine: that verdict is in the `manifest.stopped` log record and nowhere else.
 * No tmux vocabulary. The sentences are the operator's entry's own words.
 */

/** The Mac's one sticky notice. It is said once per run. */
export const MANIFEST_STOPPED_NOTICE =
  "Tortie's session list stopped reading correctly. Your sessions are still running. Restart Tortie to load it again.";

/** The notice's one action, which relaunches Tortie when pressed. */
export const MANIFEST_STOPPED_RESTART = 'Restart';

/**
 * The typed refusal's message, so a create or a rename the stopped store
 * refused says this in its toast rather than a SQLite error.
 */
export const MANIFEST_STOPPED_REFUSAL =
  "Tortie's session list stopped reading correctly. Restart Tortie, then try again.";

/** The phone's Needs input list while the Mac's session list is stopped. */
export const MANIFEST_STOPPED_PHONE_LINE =
  "Tortie's session list stopped reading correctly on your Mac. Restart Tortie there.";
