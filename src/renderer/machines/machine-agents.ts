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

/** Under the agent board, only when at least one tile is greyed by that machine's answer. */
export function agentsAbsentHint(label: string): string {
  return `A greyed agent was not found on ${label} when Tortie asked.`;
}

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
