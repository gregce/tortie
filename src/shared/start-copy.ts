/**
 * THE MAC'S WORDS FOR A START FROM THE PHONE (Phase 346, build/p346/SPEC.md
 * §4.2, D5, D12, D16 to D19).
 *
 * Main composes every sentence a start answers, and the phone draws it
 * verbatim, so each one lives here once, a named constant with the reason it
 * exists above it. The door's own sentences (`busy`, `unreadable`, `stopped`)
 * are `POCKET_WRITE_SENTENCES` in ./ipc/pocket.ts and a start reuses them
 * where they are true.
 *
 * Every refusal ends `Nothing was started.`, because that is what a refusal
 * means: the create was never called. The two that cannot say it are
 * {@link START_STILL}, which speaks for a start that may be running now, and
 * {@link START_FAILED}, which speaks for a create that was called and threw.
 *
 * It imports nothing, so main, the gates and the copy-drift reader can all
 * read it. No sentence names a tmux word (CLAUDE.md's UI rules), and none
 * names Face ID: the Mac cannot verify one (build/p317/SPEC.md D13).
 */

/** The project was closed on the Mac between the offer and the press. */
export const START_PROJECT_GONE = 'That project is not open on your Mac any more. Nothing was started.';

/** The create's own `PROJECT_NOT_FOUND`: the project's folder is not there. */
export const START_FOLDER_GONE = 'That project’s folder is not there. Nothing was started.';

/** The agent is not installed where the project is, or no longer is. */
export const START_AGENT_GONE = 'That agent is not installed there. Nothing was started.';

/** The project is on a machine Tortie is not signed in to now. */
export const START_MACHINE_AWAY = 'Tortie is not connected to that project’s machine. Nothing was started.';

/**
 * The create's preflight found the agent's interpreter missing. `Start it
 * anyway` stays on the Mac (entry mechanism 5), so the phone is told to go
 * there.
 */
export const START_INTERPRETER =
  'That agent needs a program your Mac cannot find. Start it on your Mac to see why. Nothing was started.';

/** This phone has started the most sessions one minute allows (D16, D19). */
export const START_OFTEN =
  'Your phone started several sessions just now. Wait a minute, then try again. Nothing was started.';

/** Another start, from this phone or another, is running on this Mac (D16, D18). */
export const START_BUSY = 'Your Mac is starting another session. Nothing was started.';

/**
 * The same write id again while its start runs (D17). It cannot say nothing
 * was started: the start it duplicates may be starting the session now.
 */
export const START_STILL = 'Your Mac is still starting this session.';

/**
 * The create was called and did not answer a session. Honest for both sides:
 * a local create that throws deletes its row, and a create on another machine
 * may have started over there before it threw.
 */
export const START_FAILED = 'Your Mac could not start that session. If anything started, it is in Sessions.';
