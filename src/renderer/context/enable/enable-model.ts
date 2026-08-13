/**
 * The rules of the "Enable for…" picker, as pure functions (Phase 26 item 3).
 *
 * The surface shows the DETECTED FLEET as checkboxes. Three kinds of row:
 *
 *  - **locked** — the skill is already on disk for this agent. The box is
 *    checked and cannot be unchecked, because this surface only ADDS: the
 *    plumbing behind it is `skills add` re-run with a wider agent list, and
 *    an unchecked box that removed nothing would be a lie. Removing an agent
 *    is the remove verb, not this one.
 *  - **unavailable** — the skills CLI has no name for this agent, so no
 *    command can target it. Disabled, with the same reason sentence the
 *    install sheet shows.
 *  - **free** — checkable. These are the agents the confirm can add.
 *
 * `enableBlocker` is the single opinion about why the primary control is
 * disabled. It returns a sentence or null, and the component renders the
 * sentence rather than hiding the reason in a tooltip.
 */

/**
 * The one sentence for an agent the CLI cannot target. It lives HERE, in a
 * module with no imports and no side effects, so both the install sheet and
 * this picker can show the same words and a test can read them without
 * touching `window`. install-store re-exports it.
 */
export const NO_CLI_NAME_REASON =
  'The skills CLI has no name for this agent, so a skill cannot be installed for it.';

/**
 * What the picker needs to know about one detected agent. Structurally the
 * install store's `AgentChoice`, restated here so this module imports nothing:
 * install-store touches `window` at load, and these rules must stay testable
 * without a DOM.
 */
export interface EnableAgentInput {
  id: string;
  name: string;
  cliName: string | null;
}

/** One agent row in the picker. */
export interface EnableTarget {
  agentId: string;
  agentName: string;
  /** The CLI's own name for it, or null when the CLI has none. */
  cliName: string | null;
  checked: boolean;
  /** Already enabled on disk. Checked, and this surface will not uncheck it. */
  locked: boolean;
  /** Why the row cannot be targeted, when it cannot. */
  unavailableReason: string | null;
}

/**
 * The fleet as picker rows, pre-checked from what is on disk.
 *
 * `onDisk` is the entry's own `agents` list — the registry agents whose
 * directories actually hold this skill, read by the scan. An on-disk agent the
 * CLI cannot target renders checked AND unavailable: it is a fact about the
 * disk, and it will simply not be part of the command.
 */
export function buildEnableTargets(
  agents: readonly EnableAgentInput[],
  onDisk: readonly string[]
): EnableTarget[] {
  const has = new Set(onDisk);
  return agents.map((agent) => ({
    agentId: agent.id,
    agentName: agent.name,
    cliName: agent.cliName,
    checked: has.has(agent.id),
    locked: has.has(agent.id),
    unavailableReason: agent.cliName === null ? NO_CLI_NAME_REASON : null
  }));
}

/** Toggle one free row. Locked and unavailable rows do not move. */
export function toggleEnableTarget(
  targets: readonly EnableTarget[],
  agentId: string
): EnableTarget[] {
  return targets.map((t) =>
    t.agentId === agentId && !t.locked && t.unavailableReason === null
      ? { ...t, checked: !t.checked }
      : t
  );
}

/** The rows the command will actually name: checked, and the CLI knows them. */
export function sendableTargets(
  targets: readonly EnableTarget[]
): EnableTarget[] {
  return targets.filter((t) => t.checked && t.cliName !== null);
}

/** The rows the confirm is ADDING: sendable and not already on disk. */
export function addedTargets(
  targets: readonly EnableTarget[]
): EnableTarget[] {
  return sendableTargets(targets).filter((t) => !t.locked);
}

/**
 * Why the primary control is disabled, as a sentence, or null when it may be
 * pressed.
 *
 * The two-agent floor mirrors `installCommand` in main, which throws for a
 * single agent: with one target directory the CLI writes a full copy instead
 * of a symlink, and adding the other agents afterwards is a silent no-op that
 * reports success. The picker states the refusal rather than letting the plan
 * call discover it.
 */
export function enableBlocker(
  targets: readonly EnableTarget[]
): string | null {
  const added = addedTargets(targets);
  if (added.length === 0) {
    return 'Check at least one agent that does not have it yet.';
  }
  const sendable = sendableTargets(targets);
  if (sendable.length === 1) {
    return (
      'The skills CLI cannot target exactly one agent. With one target it ' +
      'writes a full copy instead of a link, and adding more agents later ' +
      'would silently do nothing. Check a second agent.'
    );
  }
  return null;
}
