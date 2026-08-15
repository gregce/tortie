/**
 * The words on the three screens that stop a boot (Phase 41).
 *
 * WHY THEY ARE HERE AND NOT INLINE IN THE COMPONENTS. Vitest runs in a node
 * environment in this repo and the suite only collects `.test.ts`, so no test
 * can render a React tree. Copy that only exists inside JSX is copy no test can
 * pin. These are the sentences a user reads at the worst moment they will ever
 * have with Tortie, being the moment it will not start, so they are worth
 * pinning. `__tests__/tmux-block-copy.test.ts` asserts every one of them.
 *
 * THE WORD TMUX IS ALLOWED HERE, and this is the one place in the product where
 * that is true. Design spec §6.4 made the tmux missing screen the single
 * exception to the no-tmux-vocabulary rule. These three screens are the same
 * surface family and the same exception, and the word appears for one reason:
 * the user has to type a command that spells it. A later cleanup that "fixes"
 * the vocabulary here would leave a screen telling somebody to run a command it
 * cannot name.
 *
 * One sentence on each screen is NOT here. Main composes it, because main is
 * the only place that holds the two version numbers, and the renderer draws it
 * from `bootBlockMessage`.
 */

/** §6.4 — a development build with no tmux anywhere on the machine. */
export const TMUX_MISSING_COPY = {
  title: 'Tortie needs tmux to keep sessions alive',
  body: [
    'Tortie runs sessions on a private tmux server so they survive quits and crashes. It never touches your own tmux setup.',
    'This is a development build. A packaged Tortie carries its own copy of tmux and needs nothing installed first.'
  ],
  command: 'brew install tmux',
  copyLabel: 'Copy install command',
  button: 'Check again',
  buttonBusy: 'Checking…'
} as const;

/** A packaged Tortie whose own copy of tmux is not inside the bundle. */
export const TMUX_BUNDLE_INCOMPLETE_COPY = {
  title: 'Tortie is missing part of its install',
  body: [
    'Nothing has been lost. Your sessions are recorded, and Tortie lists them again as soon as it can start.'
  ],
  button: 'Check again',
  buttonBusy: 'Checking…'
} as const;

/**
 * A session server that is already running, whose version pair this release
 * never tested, or whose version could not be read.
 *
 * The first paragraph the user reads is main's composed sentence. Everything
 * here comes after it, and every line of it is about what has NOT happened:
 * nothing was changed, nothing was ended, and Tortie will not run the command
 * that would end it.
 */
export const TMUX_VERSION_BLOCKED_COPY = {
  title: 'Tortie will not attach to the session server it found',
  body: [
    'Nothing has been changed and nothing has been ended. Every session on that server is still running, and Tortie has not touched it.',
    'Attaching across a pair that was never tested can hang instead of failing, and a hang would look like Tortie freezing on work you care about.',
    'You have two ways forward.'
  ],
  ways: [
    'Leave it alone. Quit Tortie and keep using the copy of Tortie that started that server.',
    'Move over. End the old server yourself, then open Tortie again. Tortie starts a new server with the version it carries, lists your sessions from its own records, and you restore the ones you want. Restoring brings the agent back with its conversation.'
  ],
  command: 'tmux -L gmux kill-server',
  copyLabel: 'Copy the command that ends the old server',
  afterCommand: [
    'That command ends every session on the old server. Tortie will not run it for you, because ending a server that holds your work is your decision. Restarting your Mac has the same effect.',
    'Tortie does not restore sessions on its own. It lists them, and you choose which ones come back.'
  ],
  button: 'Check again',
  buttonBusy: 'Checking…'
} as const;

/** The toasts the copy button raises, shared by both command rows. */
export const COPY_COMMAND_TOASTS = {
  ok: 'Command copied',
  failed: 'Could not copy the command'
} as const;
