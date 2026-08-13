/**
 * launch-resolver.ts — the one line that turns the launch snapshot on.
 *
 * `snapshot.ts` takes the thing that walks an agent's configuration directories
 * by REGISTRATION rather than by import, so it compiles and its tests run with
 * no scanner present. This file is the registration, and it is a file of its own
 * for one reason: `src/main/index.ts` should say what it is switching on, in one
 * call, rather than carry a closure that quietly decides what a snapshot is.
 *
 * ## Three choices made here, all of them about cost
 *
 * ONE agent, not all ten. A session launches under one agent, so asking about
 * the other nine would record configuration that session cannot load. The full
 * scan is 67 to 85 ms warm; one agent is 38 ms.
 *
 * `hash: 'head'` rather than `'full'`. The comparison the readout draws asks
 * whether the file that DEFINES a row changed, and head hashes exactly that
 * file. The full mode walks a skill's whole directory and exists for the install
 * pin, which is a different question asked at a different time.
 *
 * Nested project skills are left out. The walk below a project root is bounded
 * but it is the expensive part of a cold scan, and this call sits on the create
 * path where the budget is a 3 second leash. A nested skill missing from a
 * record reads as one unrecorded row, which is the honest state.
 *
 * ## It cannot fail a launch, and this file does not need to try
 *
 * `recordLaunchContext` returns void, races this against a deadline and wraps
 * every path in one try/catch. So a throw here becomes a null snapshot and the
 * readout shows its unrecorded sentence. Nothing in this file has to be
 * defensive on its own account, and adding a second try/catch would only hide
 * from the log what the caller already handles.
 */

import { CONTEXT_CATEGORIES } from '@shared/context';
import type { AgentRegistryId } from '@shared/types';
import { CONTEXT_AGENT_IDS } from './agent-context';
import { scanContext } from './scan';
import { setContextResolver, type ContextResolveResult } from './snapshot';

/**
 * Install the resolver. Call once during main-process boot, before any session
 * can be created. Passing nothing is not an option: a build that skips this
 * call records no snapshots at all, which is why it is one named call rather
 * than a flag.
 */
export function installLaunchContextResolver(): void {
  setContextResolver(async ({ agent, cwd }): Promise<ContextResolveResult> => {
    // A session can launch under an agent this build's context table has no
    // block for. That is not an error and not an empty set: it is "Tortie does
    // not know", and the readout has a sentence for it. Reporting the five
    // categories as unknown is the only honest answer.
    const known = CONTEXT_AGENT_IDS.find((id) => id === agent);
    if (known === undefined) {
      return { entries: [], unknown: CONTEXT_CATEGORIES };
    }
    const scan = await scanContext({
      cwd,
      agent: known as AgentRegistryId,
      hash: 'head',
      includeNested: false
    });
    const readout = scan.agents.find((row) => row.agent === known);
    return {
      entries: scan.entries,
      // Straight from the reader. An agent whose hook support was never
      // verified appears here rather than as an absence, because an absence
      // reads as "there were none" and that is a claim nobody made.
      unknown: readout?.unknown ?? []
    };
  });
}
