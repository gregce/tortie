/**
 * The per-agent file-reference table, cached for the renderer's lifetime.
 *
 * The table itself lives ONCE, in the main-process agent registry
 * (src/main/agents/registry.ts `imageDrop`); this module is only a cache in
 * front of `drop:strategies`, so nothing here duplicates agent knowledge.
 *
 * Lookups are synchronous because they happen during `dragover` (choosing the
 * overlay's promise) and inside the drop handler. Before the table arrives —
 * and on any older preload — every agent resolves to the path-text fallback,
 * which is exactly the documented default.
 */

import type { AgentImageDrop, ImageDropTable } from '@shared/types';
import { dropBridge } from './acquire';

/** Shipped default: insert the path as text. Matches main's DEFAULT_IMAGE_DROP. */
export const FALLBACK_IMAGE_DROP: AgentImageDrop = {
  strategy: 'path-text',
  insert: 'paste',
  verified: false
};

let table: ImageDropTable | null = null;
let inflight: Promise<void> | null = null;

/** Fetch the table once (called by the drop router at mount). */
export function primeImageDropTable(): Promise<void> {
  if (table !== null) return Promise.resolve();
  if (inflight !== null) return inflight;
  const strategies = dropBridge()?.strategies;
  if (typeof strategies !== 'function') return Promise.resolve();
  inflight = strategies()
    .then((res) => {
      table = res;
    })
    .catch(() => {
      /* an unreachable table just means everyone gets path-text */
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * How to insert a reference for this session's agent. `agent` is the value on
 * Session.agent, which at runtime carries the full registry id even though
 * the frozen type says AgentKind (research 16 §2.1) — hence the string
 * parameter and the tolerant lookup.
 */
export function imageDropFor(agent: string): AgentImageDrop {
  if (agent === 'shell') return table?.fallback ?? FALLBACK_IMAGE_DROP;
  const row = table?.agents[agent as keyof ImageDropTable['agents']];
  return row ?? table?.fallback ?? FALLBACK_IMAGE_DROP;
}

/** Test seam: install a table without IPC. */
export function __setImageDropTable(next: ImageDropTable | null): void {
  table = next;
}
