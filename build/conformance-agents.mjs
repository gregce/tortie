/**
 * `npm run conformance:agents` — the cheap gate that keeps a THIRTEENTH agent
 * executable rather than asserted (Phase 23, C1/C2).
 *
 * WHAT IT IS FOR. Phase 23 lets a user describe an agent Tortie never compiled
 * in, in `<userData>/gmux/config/agents.json`. The claim that comes with that
 * is large: the new row launches, resumes and survives a quit and a restore
 * exactly the way the twelve compiled rows do. A claim like that decays. This
 * gate is the executable half of it, and it costs about a second.
 *
 * It is the third gate of its shape. `conformance:resume` proves the resume
 * argv against real agent processes and costs about sixteen seconds. That one
 * is the truth. `conformance:context` prints the substrate matrix. This one
 * sits between them: no process, no tmux server, no Electron, no manifest, no
 * file under the user's home, no write anywhere. Safe on a machine with live
 * sessions on it.
 *
 * WHAT IT CHECKS, in four sections, and each one is a way a user-added agent
 * could go missing or a session could be lost.
 *
 * SECTION 1 — the create path. For every launchable agent, the launch argv
 *   starts with the ABSOLUTE binary it was handed, keeps the user's extra
 *   flags, and names a real id-capture mode. The recovery contract comes back
 *   with no undefined field and the SAME KEY SET as every other agent's. That
 *   last one is research 31's clause (d) made executable: a session created by
 *   a config row and a session created by a compiled row are the same shape in
 *   the manifest, and restore cannot tell them apart.
 *
 * SECTION 2 — the restore path, and this is the sharp edge. The contract is
 *   serialized, parsed back, and then a resume argv is composed FROM THE
 *   PARSED ROW ALONE, with no registry lookup at all. It must equal the argv
 *   the registry composes, byte for byte. When those two agree, deleting
 *   `agents.json` cannot change how an existing session restores, which is the
 *   whole reason a user may add an agent without risking their work. The same
 *   section checks that `requiresOriginalCwd` is a real boolean on the row, so
 *   `originalCwdRule` answers with basis 'row' and never falls through to the
 *   live registry.
 *
 * SECTION 3 — the renderer. The pre-scan seed in `src/renderer/state/agents.ts`
 *   is a hand-written list that nothing type-checks. Its ids, its order and its
 *   `unverified` column must agree with the registry, and before Phase 23 two
 *   of those facts had drifted: the seed marked pi unverified and left droid
 *   unmarked, which is backwards. The section then hands the renderer a scan
 *   carrying a thirteenth agent and requires a chip for it, with its own name
 *   and icon, with no edit to the renderer.
 *
 * SECTION 4 — the overlay loader. A file with three rows goes in: an agent this
 *   build has never heard of, a row whose resume template lost its
 *   `<sessionId>` slot, and a patch that renames a compiled agent. Out must
 *   come the new agent complete, the broken row dropped WHOLE with its field
 *   named, and the rename applied with nothing a process would run touched.
 *   `AGENT_REGISTRY` itself must be the same twelve rows afterwards, because
 *   that is the array the restore path reads.
 *
 *   The same section proves the confirm gate's binding on the hash alone.
 *   Changing the binary, the launch argv, the environment, the resume template,
 *   the id capture or the version probe must all produce a different hash, so a
 *   person is asked again. Changing the display name, the icon or the notes must
 *   produce the same hash, or Tortie would ask a person to re-approve a rename
 *   and the gate would train them to click through it.
 *
 *   When the loader has not landed the probe reports `seam: absent`, this
 *   section is SKIPPED OUT LOUD, and sections 1 to 3 still decide the verdict.
 *   It never silently passes.
 *
 * WHAT IT DOES NOT PROVE, stated so nobody reads more into a pass. The confirm
 * record is sealed through `safeStorage`, which needs an Electron process, so
 * this gate never watches a confirmed row start a process or an unconfirmed one
 * refuse to. It also does not prove that the create path resolves a configured
 * id at all, because that wiring lives outside the pure modules it can import.
 * Both belong to the Tier 3 verifier driving the real app. What is proven here
 * is that the data is complete and the hash is bound correctly.
 */

import { spawnSync } from 'node:child_process';

const probe = spawnSync(
  'npx',
  ['tsx', '--tsconfig', 'tsconfig.node.json', 'build/agents-conformance-probe.mts'],
  { encoding: 'utf8', cwd: process.cwd() }
);

if (probe.status !== 0) {
  process.stderr.write(probe.stderr || 'the probe did not run\n');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(probe.stdout);
} catch {
  process.stderr.write(`the probe did not print JSON:\n${probe.stdout}\n`);
  process.exit(1);
}

const failures = [];
const skipped = [];
const fail = (message) => failures.push(message);

// ---------------------------------------------------------------------------
// Section 1 — the create path
// ---------------------------------------------------------------------------

const claude = data.agents.find((a) => a.id === 'claude') ?? null;
if (claude === null) {
  fail('claude is no longer a launchable agent, so there is no shape to compare against.');
}
const referenceKeys = claude === null ? [] : claude.contractKeys;

for (const agent of data.agents) {
  if (agent.launchArgv0 !== data.absBin) {
    fail(
      `${agent.id}: the launch argv starts with ${agent.launchArgv0}, not the absolute binary it was handed. ` +
        'The manifest stores absolute paths so a restore survives PATH drift.'
    );
  }
  if (!agent.launchKeepsExtras) {
    fail(`${agent.id}: the user's extra flags did not survive into the launch argv.`);
  }
  if (agent.idCapture.length === 0) {
    fail(`${agent.id}: the launch spec has no id-capture mode.`);
  }
  if (agent.contractUndefined.length > 0) {
    fail(
      `${agent.id}: the recovery contract came back with undefined fields: ` +
        `${agent.contractUndefined.join(', ')}.`
    );
  }
  if (agent.contractKeys.join('|') !== referenceKeys.join('|')) {
    const missing = referenceKeys.filter((k) => !agent.contractKeys.includes(k));
    const extra = agent.contractKeys.filter((k) => !referenceKeys.includes(k));
    fail(
      `${agent.id}: its recovery contract is a different shape from claude's. ` +
        `Missing ${missing.join(', ') || 'nothing'}; extra ${extra.join(', ') || 'nothing'}. ` +
        'A config row and a compiled row must be indistinguishable in the manifest.'
    );
  }
  if (agent.sessionStore.length === 0) {
    fail(
      `${agent.id}: the contract names no session store, so a drift warning has nothing ` +
        'actionable to tell the user.'
    );
  }
  if (agent.resumeExtrasPosition !== 'leading' && agent.resumeExtrasPosition !== 'trailing') {
    fail(`${agent.id}: resumeExtrasPosition is "${agent.resumeExtrasPosition}".`);
  }
}

// ---------------------------------------------------------------------------
// Section 2 — the restore path
// ---------------------------------------------------------------------------

for (const agent of data.agents) {
  if (!agent.contractRoundTrips) {
    fail(
      `${agent.id}: the recovery contract did not survive serialize and parse unchanged. ` +
        'That round trip is the exact path restore reads.'
    );
  }
  if (!agent.cwdBasisIsRow) {
    fail(
      `${agent.id}: requiresOriginalCwd is not a boolean on the parsed row, so originalCwdRule ` +
        'would fall through to the live registry instead of answering from the row.'
    );
  }
  if (!agent.resumeAgrees) {
    fail(
      `${agent.id}: the resume argv composed from the manifest row differs from the one the ` +
        `registry composes.\n      row      ${JSON.stringify(agent.contractResume)}` +
        `\n      registry ${JSON.stringify(agent.registryResume)}`
    );
  }
  if (!agent.noUnfilledSlot) {
    fail(`${agent.id}: the composed resume argv still contains ${data.slot}.`);
  }
  if (!agent.refusesEmptyId) {
    fail(
      `${agent.id}: a resume argv built from an EMPTY id came back non-empty. A bare resume ` +
        'attaches to the most recent conversation instead of failing.'
    );
  }
  if (agent.resumeStrategy === 'flag-uuid' && agent.registryResume.length === 0) {
    fail(`${agent.id}: strategy is flag-uuid but no resume argv could be composed.`);
  }
}

// ---------------------------------------------------------------------------
// Section 3 — the renderer
// ---------------------------------------------------------------------------

const r = data.renderer;

const seedIds = r.seed.map((s) => s.id);
if (seedIds.join('|') !== r.launchableIds.join('|')) {
  fail(
    'the renderer seed no longer offers exactly the registry\'s launchable agents in order.\n' +
      `      seed     ${seedIds.join(', ')}\n      registry ${r.launchableIds.join(', ')}`
  );
}
for (const seeded of r.seed) {
  const truth = r.registrySeed.find((e) => e.id === seeded.id) ?? null;
  if (truth === null) continue;
  if (seeded.unverified !== truth.unverified) {
    fail(
      `the renderer seed says ${seeded.id} unverified=${seeded.unverified}; the registry says ` +
        `${truth.unverified}. The picker would label the wrong agent "early".`
    );
  }
}
if (!r.overlayIsOffered) {
  fail(
    'a launchable agent that arrived only in the scan did not become a picker chip. ' +
      'A user-added agent must appear with no edit to the renderer.'
  );
}
if (r.overlayLabel !== 'Tortie Conformance Agent') {
  fail(`the overlay agent's chip label is "${r.overlayLabel}", not its display name.`);
}
if (r.overlayIconKey !== 'terminal') {
  fail(`the overlay agent's icon key is "${r.overlayIconKey}", not the one main reported.`);
}
if (r.labelBefore !== data.synthId) {
  fail(
    `agentShortLabel invented a name for an unknown agent before any scan: "${r.labelBefore}". ` +
      'An unknown id must read as itself.'
  );
}
if (r.labelAfter !== 'Tortie Conformance Agent') {
  fail(
    `agentShortLabel still reads "${r.labelAfter}" for the overlay agent after a scan carried ` +
      'its display name. It would show a bare id in Context rows and resume copy.'
  );
}
if (r.compiledLabelSurvives !== 'Cursor') {
  fail(
    `a scan overwrote the chosen chip copy for a compiled agent: cursor now reads ` +
      `"${r.compiledLabelSurvives}" rather than "Cursor".`
  );
}
if (r.lastOption !== 'shell') {
  fail(`Shell is no longer the last picker option; it is "${r.lastOption}".`);
}
for (const ideOnly of ['cursoride', 'copilotide']) {
  if (r.offeredIds.includes(ideOnly)) {
    fail(`the capture-only IDE row ${ideOnly} is being offered for launch.`);
  }
}

// ---------------------------------------------------------------------------
// Section 4 — the overlay loader
// ---------------------------------------------------------------------------

const seam = data.seam;
const BROKEN_ID = 'tortie-conf-broken';

if (seam.state === 'absent') {
  skipped.push(
    `the overlay loader (${seam.specifier}) has not landed, so the merge, the drop-whole rule ` +
      'and the confirm hash binding were NOT checked.'
  );
} else if (seam.state === 'incomplete') {
  fail(
    `${seam.specifier} exists but does not export ${seam.missing.join(', ')}. ` +
      `It exports: ${seam.exports.join(', ') || 'nothing'}. ` +
      'See the seam contract in build/agents-conformance-probe.mts.'
  );
} else if (seam.state === 'broken') {
  fail(
    `${seam.specifier} imported, then threw when it was used: ${seam.error}. ` +
      'Nothing about the overlay was checked.'
  );
} else {
  // 4a. The compiled array is untouched, and the compiled rows still lead.
  if (seam.compiledAfter !== seam.compiledBefore) {
    fail(
      `merging an overlay changed AGENT_REGISTRY itself, from ${seam.compiledBefore} rows to ` +
        `${seam.compiledAfter}. The restore path reads that array, so it must never grow.`
    );
  }
  if (!seam.mergedHeadMatchesRegistry) {
    fail(
      'the merged table no longer starts with the compiled rows in registry order, so a ' +
        'configured agent can displace a compiled one in a picker.'
    );
  }

  // 4b. The broken row is dropped WHOLE, and it is named.
  if (seam.parsedIds.includes(BROKEN_ID) && seam.mergedIds.includes(BROKEN_ID)) {
    fail(
      `the row whose resume template lost its ${data.slot} slot was merged anyway. An argv that ` +
        'loses its id attaches to the wrong conversation instead of failing.'
    );
  }
  const named = [...seam.parseProblems, ...seam.mergeProblems].filter(
    (p) => p.id === BROKEN_ID && p.field.length > 0 && p.message.length > 0
  );
  if (named.length === 0) {
    fail(
      'dropping the broken row produced no problem naming the field and the reason. A silent drop ' +
        'is the failure mode this rule exists to prevent.'
    );
  }
  if (!seam.parsedIds.includes(data.synthId)) {
    fail('the valid row did not survive a file that also contained a broken row.');
  }

  // 4c. The new agent is complete enough to launch, resume and restore.
  const n = seam.newEntry;
  if (n === null) {
    fail('the merge produced no row for an agent the file created.');
  } else {
    if (n.source !== 'config') {
      fail(`the configured agent's row says source "${n.source}", not "config".`);
    }
    if (n.unverified !== true) {
      fail(
        'the configured agent came back verified. Tortie has measured nothing about it, and ' +
          'unverified is the registry\'s existing word for that.'
      );
    }
    if (n.launchArgv.length === 0 || n.launchArgv[0] !== n.binaries[0]) {
      fail(
        `the configured agent's launch.argv[0] is ${JSON.stringify(n.launchArgv[0])} and its ` +
          `binaries[0] is ${JSON.stringify(n.binaries[0])}. Tortie resolves the second and tmux ` +
          'runs the first, so they must be the same name.'
      );
    }
    if (n.slotCount !== 1) {
      fail(
        `the configured agent's resume template carries ${n.slotCount} ${data.slot} slots. ` +
          'Exactly one is the only number that composes a correct resume.'
      );
    }
    if (n.sessionStore.length === 0) {
      fail(
        'the configured agent names no session store, so a drift warning has nothing actionable ' +
          'to tell the user.'
      );
    }
    if (!['pre-assign', 'pre-assign-cmd', 'none'].includes(n.idCaptureMode)) {
      fail(`the configured agent's idCapture mode is "${n.idCaptureMode}", outside the closed set.`);
    }
    if (!n.requiresOriginalCwd || !n.bareResumeIsDangerous) {
      fail(
        'a configured agent that said nothing about requiresOriginalCwd or bareResumeIsDangerous ' +
          'did not default to true. Both defaults must be the refusing direction, because ' +
          'substituting a directory can open an empty session that looks resumed.'
      );
    }
  }

  // 4d. Its manifest row is the same shape as a compiled agent's.
  const o = seam.report;
  if (o === null) {
    if (seam.newEntry !== null) fail('the configured agent produced no recovery contract.');
  } else {
    if (o.contractKeys.join('|') !== referenceKeys.join('|')) {
      const missing = referenceKeys.filter((k) => !o.contractKeys.includes(k));
      const extra = o.contractKeys.filter((k) => !referenceKeys.includes(k));
      fail(
        "the configured agent's recovery contract is a different shape from claude's. " +
          `Missing ${missing.join(', ') || 'nothing'}; extra ${extra.join(', ') || 'nothing'}. ` +
          'A config row and a compiled row must be indistinguishable in the manifest.'
      );
    }
    if (!o.contractRoundTrips) {
      fail("the configured agent's contract did not survive serialize and parse unchanged.");
    }
    if (!o.cwdBasisIsRow) {
      fail(
        "the configured agent's requiresOriginalCwd is not a boolean on the parsed row, so " +
          'originalCwdRule would ask the live registry for an agent it does not have.'
      );
    }
    if (o.contractResume.length === 0 || !o.noUnfilledSlot) {
      fail(
        'the configured agent cannot compose a resume argv from its manifest row alone, so ' +
          'deleting agents.json would change how its sessions restore.'
      );
    }
    if (!o.refusesEmptyId) {
      fail(
        "the configured agent's resume argv came back non-empty for an EMPTY id. A bare resume " +
          'attaches to the most recent conversation instead of failing.'
      );
    }
  }

  // 4e. A patch that renames a compiled agent changes nothing that runs.
  const p = seam.patched;
  if (p === null) {
    fail('the merge lost the compiled claude row while applying a patch to it.');
  } else {
    if (p.source !== 'patched') {
      fail(`a patched compiled row says source "${p.source}", not "patched".`);
    }
    if (p.displayName !== 'Claude' || p.iconKey !== 'terminal') {
      fail(
        `the presentation patch did not apply: claude reads "${p.displayName}" with icon ` +
          `"${p.iconKey}".`
      );
    }
    if (!p.launchUnchanged || !p.resumeUnchanged) {
      fail(
        'a patch that only changed a name and an icon altered the compiled launch or resume. ' +
          'A present key replaces its own field and nothing else.'
      );
    }
  }

  // 4f. The confirm gate's binding, on the hash alone.
  const h = seam.hash;
  if (typeof h.base !== 'string' || h.base.length !== 64) {
    fail(
      `a row naming a binary, an argv, an environment and a resume template hashed to ` +
        `${JSON.stringify(h.base)}. There is nothing for a confirmation to bind to.`
    );
  }
  if (h.sameAgain !== h.base) {
    fail('hashing the same row twice gave two answers. A confirmation would never hold.');
  }
  const mustNotMove = [
    ['iconKey', h.afterIconChange],
    ['displayName', h.afterDisplayNameChange],
    ['notes', h.afterNotesChange],
    ['storeDirs', h.afterStoreDirsChange],
    ['resume.sessionStore', h.afterSessionStoreChange]
  ];
  for (const [field, value] of mustNotMove) {
    if (value !== h.base) {
      fail(
        `changing ${field} re-armed the confirm gate. It cannot change what runs, and asking a ` +
          'person to re-approve it trains them to click through the sheet that matters.'
      );
    }
  }
  const mustMove = [
    ['binaries', h.afterBinaryChange],
    ['extraProbeDirs', h.afterProbeDirChange],
    ['launch.argv', h.afterArgvChange],
    ['launch.env', h.afterEnvChange],
    ['resume.template', h.afterTemplateChange],
    ['resume.extrasPosition', h.afterExtrasPositionChange],
    ['resume.idCapture', h.afterIdCaptureChange],
    ['versionProbe', h.afterVersionProbeChange]
  ];
  for (const [field, value] of mustMove) {
    if (value === h.base) {
      fail(
        `changing ${field} left the confirm hash unchanged, so an edit that changes what runs ` +
          'would inherit a confirmation given for something else.'
      );
    }
    if (value === null) {
      fail(`the variation of ${field} did not survive validation, so its hash was not compared.`);
    }
  }
  if (h.compiledClaude === null || h.renamedClaude === null) {
    fail('claude could not be hashed through the merge, so the rename comparison did not run.');
  } else if (h.compiledClaude !== h.renamedClaude) {
    fail(
      'renaming a compiled agent changed its confirm hash. A patch that only supplies a display ' +
        'name and an icon must leave the compiled command line, and therefore its hash, alone.'
    );
  }
}

// ---------------------------------------------------------------------------
// The table, printed whatever the verdict, because the point is that a person
// can read it.
// ---------------------------------------------------------------------------

const pad = (value, width) => String(value).padEnd(width);
const tick = (ok) => (ok ? 'yes' : 'NO');

process.stdout.write(
  '\nagent                    origin    capture         strategy      row=argv  roundtrip  ' +
    'cwd=row  extras\n'
);
process.stdout.write('-'.repeat(107) + '\n');
const rows = [...data.agents];
if (seam.state === 'present' && seam.report !== null) rows.push(seam.report);
for (const a of rows) {
  process.stdout.write(
    `${pad(a.id, 24)} ${pad(a.origin, 9)} ${pad(a.idCapture, 15)} ${pad(a.resumeStrategy, 13)} ` +
      `${pad(tick(a.resumeAgrees), 9)} ${pad(tick(a.contractRoundTrips), 10)} ` +
      `${pad(tick(a.cwdBasisIsRow), 8)} ${a.resumeExtrasPosition}\n`
  );
}

process.stdout.write(
  `\n${data.compiledRows} compiled registry rows, ${data.agents.length} of them launchable. ` +
    `Every recovery contract carries ${referenceKeys.length} fields.\n`
);
process.stdout.write(
  `renderer: seed of ${r.seed.length}, and a scan of ${r.offeredIds.length - 1} launchable ` +
    `agents including one the registry does not contain.\n`
);
process.stdout.write(`overlay loader: ${seam.state} (${seam.specifier}).\n`);

if (skipped.length > 0) {
  process.stdout.write(`\nSKIPPED, ${skipped.length}:\n`);
  for (const note of skipped) process.stdout.write(`  - ${note}\n`);
}

if (failures.length > 0) {
  process.stdout.write(`\nFAIL, ${failures.length}:\n`);
  for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
  process.exit(1);
}

process.stdout.write(
  '\nPASS. Every launchable agent restores from its manifest row alone, and an agent that ' +
    'exists only in a scan reaches the picker.\n'
);
