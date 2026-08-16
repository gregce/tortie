/**
 * The probe half of `npm run conformance:installs` (Phase 49).
 *
 * It prints, as JSON, the install map of every compiled registry row, so the
 * checker beside it (`conformance-installs.mjs`) can assert the shape rules
 * from research 47 §10 and print the table a person reads.
 *
 * IT SPAWNS NOTHING. It opens no manifest, makes no request, launches no
 * Electron and runs no agent process. It imports one table and prints it.
 * That is the point: the install map's promise is that nothing in it can
 * run, and a gate that ran anything would break the promise while checking
 * it.
 */

import { AGENT_REGISTRY } from '../src/main/agents/registry';

process.stdout.write(
  JSON.stringify({
    rows: AGENT_REGISTRY.map((e) => ({
      id: e.id,
      kind: e.kind,
      launchable: e.launchable,
      hasInstall: e.install !== undefined && e.install !== null,
      canonical: e.install?.canonical ?? null,
      alternates: e.install?.alternates ?? [],
      canonicalIsPackageManager: e.install?.canonicalIsPackageManager ?? false,
      signature: e.install?.signature ?? null
    }))
  })
);
