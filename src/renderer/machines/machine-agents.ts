/**
 * Which agents that machine has (Phase 109).
 *
 * The doctrine that binds these sentences is in ./presentation.ts.
 */

// On a tab whose files are on a machine, the agent board stops reading this
// Mac's detection scan and reads that machine's own answer instead. Only a
// positive absent greys a tile. A machine that has not answered, or whose
// answer could not be read, greys nothing.
//
// THERE IS NO INSTALL COMMAND IN ANY OF THESE SENTENCES, on purpose. The
// command Tortie holds was read for this Mac, and handing it over for another
// machine would put an unverified claim about that machine's package manager
// on screen. The sentence says where installing happens instead.
//
// PHASE 235 TOOK `agentsAbsentHint` OFF THE RESTING FACE. It read "A greyed
// agent was not found on <machine> when Tortie asked." and it was drawn under
// the board on a machine tab and nowhere else, so a remote board carried one
// standing line a local board does not. Every fact in it is already on the
// tiles: a greyed tile IS the answer, its accessible name is
// `agentNotOnMachineAria` and a click pins `agentMissingOnMachine`, which says
// the same thing about the one agent the person actually asked about. That is
// the *just enough words* rule, being that explanation a person might want
// lives behind hover or a click and not on the resting face, and it is the
// operator's rule of 2026-09-07. ../__tests__/p228-off-the-face.test.ts keeps
// it off.

/** The greyed tile's aria label on a machine tab. */
export function agentNotOnMachineAria(agent: string, label: string): string {
  return `${agent}, not on ${label}`;
}

/** The empty state's caption for a missing agent on a machine tab. NO install command. */
export function agentMissingOnMachine(agent: string, label: string): string {
  return `Tortie could not find ${agent} on ${label}. Install it on that machine, or pick an agent that machine has.`;
}

/** The launch block heading for AGENT_NOT_ON_MACHINE. */
export function agentNotOnMachineTitle(agent: string, label: string): string {
  return `${agent} was not found on ${label}`;
}

/** The launch block's one action. Never "Try again", which rescans this Mac. */
export function askMachineAgainLabel(label: string): string {
  return `Ask ${label} again`;
}
