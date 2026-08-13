/**
 * What a running session does when this changes (research 29 §10), said out
 * loud.
 *
 * This table is registry data, not prose in a component. It changed underneath
 * the research while the research was being written: hooks moved from needing a
 * restart to being reloaded live by a file watcher. Any sentence Tortie prints
 * about needing a new session has a short shelf life, so this module prints
 * what the registry says and holds no opinion of its own. Each cell already
 * carries `note`, its own plain sentence, so the composing below never invents
 * a claim.
 *
 * `unknown` is a first-class value. Guessing is worse than admitting, because
 * the user's next action depends on the answer.
 *
 * The refusals in §10.2 bind everything downstream. Tortie never ends and
 * relaunches a session to apply a change, never presses Enter on a reload, and
 * never says a session is "running with N skills" when it can only prove it was
 * launched with them.
 */

import type { ContextRowDrift, ContextReloadBehavior } from '../model';
import type { AgentReload } from './model';

function list(names: readonly string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1] ?? ''}`;
}

/** One answer, and every agent that gives it. */
export interface ReloadLine {
  behavior: ContextReloadBehavior;
  /** Every agent whose cell carries this exact note, alphabetically. */
  agentNames: string[];
  /** The registry's own sentence. Never composed here. */
  note: string;
}

/**
 * One line per DISTINCT answer, with the agents that give it named.
 *
 * It was one line per agent until the card was mounted against a real machine.
 * A skill loaded by six agents where five of them share the `unknown` cell drew
 * the same unnamed sentence five times in a column, and a reader could not tell
 * whether that was five agents or one bug. Neither the note nor the agent list
 * was wrong; printing the pair once per agent was.
 *
 * The note still comes from the registry and nothing here writes prose. The
 * agent names are data, attached to the answer they belong to. Grouping is by
 * behaviour AND note, because two agents can both be `next-session` for
 * different reasons and folding those together would put one agent's reason
 * against the other's name.
 *
 * Ordered live, then next session, then unknown, so the three answers stay
 * visually apart even when the fleet is ten agents long.
 */
export function reloadLines(agents: readonly AgentReload[]): ReloadLine[] {
  const order: ContextReloadBehavior[] = ['live', 'next-session', 'unknown'];
  const groups = new Map<string, ReloadLine>();
  for (const agent of [...agents].sort((a, b) =>
    a.agentName.localeCompare(b.agentName)
  )) {
    const key = `${agent.cell.behavior}\u0000${agent.cell.note}`;
    const existing = groups.get(key);
    if (existing === undefined) {
      groups.set(key, {
        behavior: agent.cell.behavior,
        agentNames: [agent.agentName],
        note: agent.cell.note
      });
      continue;
    }
    if (!existing.agentNames.includes(agent.agentName)) {
      existing.agentNames.push(agent.agentName);
    }
  }
  return [...groups.values()].sort(
    (a, b) =>
      order.indexOf(a.behavior) - order.indexOf(b.behavior) ||
      (a.agentNames[0] ?? '').localeCompare(b.agentNames[0] ?? '')
  );
}

/** The agent names on one line, joined the way English joins them. */
export function reloadLineAgents(line: ReloadLine): string {
  return list(line.agentNames);
}

/**
 * The blast-radius line in a confirm (§9.1 rule 5). When every agent reads this
 * category at startup, the answer is the short one the wireframe shows. When
 * they disagree, the sentence names the agents rather than averaging them.
 */
export function blastRadiusSentence(agents: readonly AgentReload[]): string {
  if (agents.length === 0) {
    return 'Tortie does not know whether sessions running now will pick this up.';
  }

  const bucket = (value: ContextReloadBehavior): string[] =>
    agents.filter((a) => a.cell.behavior === value).map((a) => a.agentName);

  const live = bucket('live');
  const unknown = bucket('unknown');

  if (live.length === 0 && unknown.length === 0) {
    return 'Sessions running now are not affected.';
  }

  const out: string[] = [];
  if (live.length > 0) {
    out.push(
      live.length === 1
        ? `${live[0] ?? ''} picks this up while it is running.`
        : `${list(live)} pick this up while they are running.`
    );
  }
  if (bucket('next-session').length > 0) {
    const next = bucket('next-session');
    out.push(
      next.length === 1
        ? `${next[0] ?? ''} reads it when a session starts, so a session running now will not see it.`
        : `${list(next)} read it when a session starts, so sessions running now will not see it.`
    );
  }
  if (unknown.length > 0) {
    out.push(
      unknown.length === 1
        ? `Tortie does not know whether ${unknown[0] ?? ''} picks this up while it is running.`
        : `Tortie does not know whether ${list(unknown)} pick this up while they are running.`
    );
  }
  return out.join(' ');
}

/**
 * §8.3's three drift sentences. The third is the one nobody expects and the one
 * that bites.
 */
export function driftSentence(drift: ContextRowDrift): string | null {
  switch (drift) {
    case 'unchanged':
      return null;
    case 'changed':
      return 'Changed since this session started. It is still running the old version.';
    case 'added':
      return 'Added since this session started. This session has not loaded it.';
    case 'removed':
      return 'Removed since this session started. This session is still running it.';
  }
}

/**
 * §10.1's armed reload. Tortie TYPES the command into the pane and stops. It
 * never presses Enter, and where no reload command exists it offers nothing and
 * states the fact instead.
 */
export function reloadCommandFor(
  agents: readonly AgentReload[]
): string | null {
  for (const agent of agents) {
    if (agent.cell.reloadCommand !== null) return agent.cell.reloadCommand;
  }
  return null;
}
