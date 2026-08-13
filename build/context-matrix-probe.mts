/**
 * The probe half of `npm run conformance:context`.
 *
 * It prints, as JSON, the substrate matrix the panel will actually draw from:
 * one row per agent and category that declares a location, with the precedence
 * model, the evidence, the scope order and the live-reload answer. The checker
 * beside it (`conformance-context.mjs`) decides pass or fail.
 *
 * It is a separate file rather than an inline `--eval` because the table is
 * TypeScript with path aliases, and a probe that cannot resolve `@shared/*`
 * silently prints nothing.
 *
 * It spawns nothing, makes no request and reads no file under the user's home.
 */

import { CONTEXT_CATEGORIES } from '../src/shared/context';
import {
  CONTEXT_AGENT_IDS,
  displayName,
  locationsFor,
  precedenceReadoutFor,
  reloadFor
} from '../src/main/context/agent-context';

const rows = [];
for (const agent of CONTEXT_AGENT_IDS) {
  for (const category of CONTEXT_CATEGORIES) {
    if (locationsFor(agent, category).length === 0) continue;
    const precedence = precedenceReadoutFor(agent, category);
    const reload = reloadFor(agent, category);
    rows.push({
      agent,
      displayName: displayName(agent),
      category,
      // Locations the USER owns. A category whose only locations are vendor
      // bundles has nothing to order, and that is an answer rather than a gap.
      ownLocations: locationsFor(agent, category).filter((l) => l.bundled !== true).length,
      model: precedence.model,
      evidence: precedence.evidence,
      scopeOrder: precedence.scopeOrder,
      note: precedence.note,
      reload: reload.behavior
    });
  }
}

process.stdout.write(JSON.stringify(rows));
