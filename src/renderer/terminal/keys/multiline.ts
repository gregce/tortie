/**
 * The per-agent Shift+Enter table, cached for the renderer's lifetime.
 *
 * The table itself lives ONCE, in the main-process agent registry
 * (src/main/agents/registry.ts `multilineKey`, beside `imageDrop`); this
 * module is only a cache in front of `agents:multilineKeys`, so nothing here
 * duplicates agent knowledge. The registry header carries WHY the bytes are
 * what they are — the CSI-u and `ESC CR` traps that make a wrong answer here
 * submit a half-written prompt.
 *
 * Lookups are synchronous because they happen inside a keystroke handler
 * (src/renderer/terminal/keys/index.ts), which cannot await. Before the table
 * arrives — and on any older preload — every agent resolves to `LF`, which is
 * what all ten measured agents resolve to anyway, so the pre-prime window is
 * correct rather than merely safe.
 */

import type { AgentMultilineKey, MultilineKeyTable } from '@shared/types';
import type { GmuxMultilineExtras } from '@shared/ipc';
import { DEFAULT_MULTILINE_KEY, LF } from '@shared/agent-defaults';

/**
 * `LF` and the default row come from `@shared/agent-defaults`, which is also
 * where main's registry gets them: the renderer used to declare its own copies
 * — one of them under the SAME exported name as main's — and two constants
 * that must be equal, declared twice, diverge the day someone edits one
 * (research 25 §3, Tier 3). Re-exported so this module's import sites and its
 * test are unchanged.
 */
export { DEFAULT_MULTILINE_KEY, LF };

let table: MultilineKeyTable | null = null;
let inflight: Promise<void> | null = null;

/** The optional multiline surface on the preload bridge (feature-detected). */
function multilineBridge(): NonNullable<
  GmuxMultilineExtras['agentMultilineKeys']
> | null {
  const api = window.gmux as (GmuxMultilineExtras & object) | undefined;
  const fn = api?.agentMultilineKeys;
  return typeof fn === 'function' ? fn.bind(api) : null;
}

/** Fetch the table once (called by TerminalPane when a terminal mounts). */
export function primeMultilineKeys(): Promise<void> {
  if (table !== null) return Promise.resolve();
  if (inflight !== null) return inflight;
  const fetchTable = multilineBridge();
  if (fetchTable === null) return Promise.resolve();
  inflight = fetchTable()
    .then((res) => {
      table = res;
    })
    .catch(() => {
      /* an unreachable table just means everyone gets the LF default */
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * The whole row for this session's agent. `agent` is the value on
 * Session.agent, which at runtime carries the full registry id even though
 * the frozen type says AgentKind (research 16 §2.1) — hence the string
 * parameter and the tolerant lookup, matching `imageDropFor`.
 */
export function multilineKeyFor(agent: string): AgentMultilineKey {
  if (agent === 'shell') return table?.fallback ?? DEFAULT_MULTILINE_KEY;
  const row = table?.agents[agent as keyof MultilineKeyTable['agents']];
  return row ?? table?.fallback ?? DEFAULT_MULTILINE_KEY;
}

/**
 * The bytes Shift+Enter should write for this session's agent, or `null` when
 * the agent has no multiline input and Enter must be left entirely alone.
 */
export function multilineSequenceFor(agent: string): string | null {
  return multilineKeyFor(agent).sequence;
}

/** Test seam: install a table without IPC. */
export function __setMultilineKeyTable(next: MultilineKeyTable | null): void {
  table = next;
}
