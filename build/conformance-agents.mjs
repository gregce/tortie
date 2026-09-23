/**
 * `npm run conformance:agents` — the cheap gate that keeps a FOURTEENTH agent
 * executable rather than asserted (Phase 23, C1/C2).
 *
 * WHAT IT IS FOR. Phase 23 lets a user describe an agent Tortie never compiled
 * in, in `<userData>/gmux/config/agents.json`. The claim that comes with that
 * is large: the new row launches, resumes and survives a quit and a restore
 * exactly the way the thirteen compiled rows do. A claim like that decays. This
 * gate is the executable half of it, and it costs about a second.
 *
 * It is the third gate of its shape. `conformance:resume` proves the resume
 * argv against real agent processes and costs about sixteen seconds. That one
 * is the truth. `conformance:context` prints the substrate matrix. This one
 * sits between them: no process, no tmux server, no Electron, no manifest, no
 * file under the user's home, no write anywhere. Safe on a machine with live
 * sessions on it.
 *
 * WHAT IT CHECKS, in eight sections, and each one is a way a user-added agent
 * could go missing, a session could be lost, or a secret could be written down.
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
 *   carrying a fourteenth agent and requires a chip for it, with its own name
 *   and icon, with no edit to the renderer.
 *
 * SECTION 4 — the overlay loader. A file with three rows goes in: an agent this
 *   build has never heard of, a row whose resume template lost its
 *   `<sessionId>` slot, and a patch that renames a compiled agent. Out must
 *   come the new agent complete, the broken row dropped WHOLE with its field
 *   named, and the rename applied with nothing a process would run touched.
 *   `AGENT_REGISTRY` itself must be the same thirteen rows afterwards, because
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
 * SECTION 5 — env passthrough (Phase 33). `launch.envPassthrough` is a list of
 *   environment variable NAMES. Tortie reads their values from the login shell
 *   at each launch and each restore, hands them to that pane, and writes them
 *   nowhere. Five assertions keep that sentence true.
 *
 *   1. The confirm hash moves when the name SET changes and only then. Adding a
 *      name moves it, removing that name moves it back, reordering the list
 *      leaves it byte equal, and a display name change leaves it byte equal.
 *   2. The manifest row carries names and never values. The record is composed
 *      from a spec carrying the names, the pane environment is composed
 *      separately from a resolved map carrying a sentinel value, and the
 *      sentinel must appear in the second and in no byte of the first. The same
 *      assertion holds the stamps-stay-last rule: a resolved map that tries to
 *      set `GMUX_SESSION_ID` loses to the session's own id.
 *   3. The resume argv rebuilt from the passthrough row's manifest contract
 *      alone is byte equal to the registry's, so the new field changed nothing
 *      about how a session comes back.
 *   4. The confirm sheet prints one line per name and no value.
 *   5. The refused names are refused. A row naming `PI_CODING_AGENT_DIR` is
 *      dropped whole with the field named, and so is a `"schema": 1` file that
 *      carries the field at all.
 *
 *   The login shell probe itself is NOT run here. It spawns a process, and this
 *   gate spawns none. Its 3 second deadline and its group kill are proven by the
 *   unit tests beside it and by the Tier 3 verifier driving the real app.
 *
 * SECTION 9 — the SHARED shell-variable list (Phase 275), the one every agent
 *   reads. Phase 269 keyed a name by agent; this one is keyed by nothing, so a
 *   single confirmation covers every agent Tortie can launch, including agents
 *   installed after the name was confirmed. That is a WIDENING of what one
 *   agreement covers and it is the reason the section exists.
 *
 *   Its two most important rows are the phase's two refusals, driven against
 *   the shipping `withSealedDangerState` rather than reasoned about: a SHARED
 *   name sealed PER-AGENT is dropped (R27), and a PER-AGENT name sealed as
 *   SHARED is dropped (R28). R8 is the control beside them — the same objects
 *   sealed the right way keep their name — because a seal that admitted nothing
 *   would pass both refusals and break the product.
 *
 *   R7 is the line most likely to be forgotten and the most expensive to
 *   forget: `getSettings` short-circuits on `isDangerStateEmpty` and returns
 *   the file WITHOUT OPENING THE SEAL, so a field added to `DangerState` and
 *   missed there leaves that function compiling and wrong, and a settings.json
 *   whose only danger value is a shared name would be admitted unsealed.
 *
 *   Every row carries its rule number from `build/p275/SPEC.md` §8 in its
 *   failure line, and `npm run ablation:p275` breaks one clause at a time in a
 *   CLONE of the tree and proves each row can still go red.
 *
 * SECTION 10 — the two activity fields no configuration can reach (Phase
 *   321). Phase 321 gives `AgentActivityProfile` one field that decides a
 *   session's status: `dialogs` (the named question shapes read beside the
 *   numbered verdict). Its build had two more: `writesWhileAsking`, which its
 *   fix round removed with antigravity's shape, and `residentHelpers` (grok's
 *   helpers not counted as a running tool once it had rested), which the
 *   operator's ruling of 2026-09-23 removed whole. The rows below still refuse
 *   both names, so a later round cannot bring either back through the
 *   overlay. Refusal 5 says no configuration may set a status, so every one is
 *   COMPILED data. Four rows keep that true:
 *   the overlay's hand-written types name none of them (and the row type names
 *   no `activity` at all); `REFUSED_ROW_FIELDS.activity` still stands and the
 *   loader asks it before it asks anything else; the floor profiles every
 *   configured or unknown agent is read with list none of them, and
 *   `activityProfileFor` reads the compiled array alone; and, DRIVEN through
 *   the shipping `parseAgentOverlay`, a row carrying any of them, new or a
 *   patch of cursor, claude or grok, is dropped whole with the field
 *   named. Each row is also asked over in-memory copies of the source with its
 *   rule broken, and every copy must read red, so a gutted rule cannot pass.
 *
 * WHAT IT DOES NOT PROVE, stated so nobody reads more into a pass. The confirm
 * record is sealed through `safeStorage`, which needs an Electron process, so
 * this gate never watches a confirmed row start a process or an unconfirmed one
 * refuse to. The danger seal's CIPHERTEXT is the same story: section 9 asserts
 * over the exact text `sealDangerState` is handed and never over the sealed
 * bytes, which belong to `src/main/settings/__tests__/p275-env-shared-seal.test.ts`
 * and to the Tier 3 verifier. It also does not prove that the create path resolves a configured
 * id at all, because that wiring lives outside the pure modules it can import.
 * Both belong to the Tier 3 verifier driving the real app. What is proven here
 * is that the data is complete and the hash is bound correctly.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { tsxCli } from './ts-runner.mjs';

const probe = spawnSync(
  process.execPath,
  [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/agents-conformance-probe.mts'],
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
// Section 5 — env passthrough (Phase 33)
// ---------------------------------------------------------------------------
//
// Each of the five assertions gets a row in its own table, so a person reads
// which one broke rather than a paragraph. `note` is what the row says when it
// is not a plain pass.

const p33 = data.p33 ?? { state: 'absent', missing: ['the probe printed no p33 section'] };
const p33Rows = [];

/** Record one assertion. `ok` decides the verdict; `note` is for the table. */
const p33Assert = (name, ok, note, why) => {
  p33Rows.push({ name, ok, note: note ?? '' });
  if (!ok) fail(`env passthrough, ${name}: ${why}`);
};

if (p33.state === 'absent') {
  skipped.push(
    'env passthrough (Phase 33) has not landed, so the confirm hash, the names-only ' +
      `manifest row, the resume argv, the sheet and the refusals were NOT checked. Missing: ${(
        p33.missing ?? []
      ).join(', ')}.`
  );
} else if (p33.state === 'broken') {
  fail(
    `the env passthrough section threw when it was used: ${p33.error}. Nothing about ` +
      'launch.envPassthrough was checked.'
  );
} else {
  const h = p33.hash;
  const everyHash = [h.base, h.sameAgain, h.afterAdd, h.afterRemove, h.afterReorder, h.afterDisplayName];
  const hashed = everyHash.every((v) => typeof v === 'string' && v.length === 64);

  // 1. The hash moves on the name SET and on nothing else.
  p33Assert(
    'hash moves on add and remove, not on reorder',
    hashed &&
      h.sameAgain === h.base &&
      h.afterAdd !== h.base &&
      h.afterRemove === h.base &&
      h.afterReorder === h.base &&
      h.afterDisplayName === h.base,
    hashed ? '' : 'a variation did not survive validation',
    !hashed
      ? 'at least one variation of the row did not hash, so its hash was never compared. ' +
          `base ${JSON.stringify(h.base)}, add ${JSON.stringify(h.afterAdd)}, ` +
          `reorder ${JSON.stringify(h.afterReorder)}.`
      : h.afterAdd === h.base
        ? 'adding a name left the confirm hash unchanged, so a row could widen the set of ' +
          'variables reaching a pane on a confirmation given for a narrower set.'
        : h.afterRemove !== h.base
          ? 'removing the added name did not return the hash to where it started, so the hash ' +
            'depends on something other than the set of names.'
          : h.afterReorder !== h.base
            ? 'reordering the names moved the confirm hash. Order does not change which ' +
              'variables reach the pane, and asking a person to re-approve a reorder trains ' +
              'them to click through the sheet that matters.'
            : h.afterDisplayName !== h.base
              ? 'changing the display name moved the confirm hash of a passthrough row.'
              : 'hashing the same row twice gave two answers.'
  );

  // 2. The row carries names. The value is in the pane and nowhere else.
  const rec = p33.record;
  const namesOnRecord = Array.isArray(rec.envPassthrough)
    ? [...rec.envPassthrough].sort().join(',')
    : null;
  const wantNames = [...p33.names].sort().join(',');
  p33Assert(
    'manifest row carries names, never values',
    namesOnRecord === wantNames && !rec.recordJsonHasSentinel && rec.paneEnvCarriesValue,
    namesOnRecord === null ? 'the record carries no envPassthrough' : '',
    rec.recordJsonHasSentinel
      ? 'a resolved VALUE was found in the manifest record. Option B in research 41 is the ' +
          'design this phase rejected, and its whole failure is a secret written into the ' +
          'session database in plain text.'
      : !rec.paneEnvCarriesValue
        ? 'the resolved value did not reach the pane environment, so the feature does nothing.'
        : `the record's envPassthrough is ${JSON.stringify(rec.envPassthrough)} rather than the ` +
          `configured ${JSON.stringify(p33.names)}. Restore reads the row, not the registry, so ` +
          'a row that lost its names restores a pane without them.'
  );
  p33Assert(
    'the pane stamps stay last',
    rec.stampSurvives === true,
    '',
    'a resolved value overwrote GMUX_SESSION_ID. That stamp is the second identity source ' +
      'Tortie reads sessions back by, and a pane carrying another session\'s stamp is the one ' +
      'thing the durability layer cannot survive.'
  );

  // 3. The resume argv is untouched by the new field.
  const rep = p33.report;
  p33Assert(
    'resume argv stays byte equal',
    rep !== null && rep.resumeAgrees && rep.contractRoundTrips && rep.noUnfilledSlot,
    rep === null ? 'the passthrough row produced no recovery contract' : '',
    rep === null
      ? 'the passthrough row produced no recovery contract, so nothing about its restore was ' +
          'checked.'
      : !rep.contractRoundTrips
        ? 'the passthrough row\'s recovery contract did not survive serialize and parse ' +
            'unchanged, which is the exact path restore reads.'
        : `the resume argv composed from the passthrough row's manifest contract differs from ` +
            `the registry's.\n      row      ${JSON.stringify(rep.contractResume)}` +
            `\n      registry ${JSON.stringify(rep.registryResume)}`
  );

  // 4. The sheet prints the names and no value.
  const sheet = p33.sheet;
  const printed =
    sheet === null
      ? []
      : sheet.passthroughLines.map((line) => line.slice(p33.sheetPrefix.length));
  p33Assert(
    'the sheet prints names and no value',
    sheet !== null &&
      !sheet.valueLeak &&
      printed.join(',') === [...p33.names].sort().join(','),
    sheet === null ? 'no sheet was built' : printed.join(' '),
    sheet === null
      ? 'the confirm sheet could not be built for the passthrough row.'
      : sheet.valueLeak
        ? 'a resolved VALUE appeared on the confirm sheet. The sheet is what the person reads ' +
            'before they agree, and it carries names only.'
        : `the sheet printed ${JSON.stringify(printed)} rather than the sorted configured names ` +
            `${JSON.stringify([...p33.names].sort())}. A person who cannot see every name on the ` +
            'sheet is confirming a set they were not shown.'
  );

  // 5. The refusals refuse, and each one names the field.
  const namesField = (r) => typeof r.field === 'string' && r.field.includes('envPassthrough');
  p33Assert(
    'PI_CODING_AGENT_DIR is refused',
    p33.refusePiDir.dropped && namesField(p33.refusePiDir),
    p33.refusePiDir.field ?? 'no problem named the field',
    !p33.refusePiDir.dropped
      ? 'a row naming PI_CODING_AGENT_DIR was merged. That name moves where the agent keeps ' +
          'its sessions, and Tortie would keep looking in the old place and lose the conversation.'
      : 'the row was dropped with no problem naming launch.envPassthrough. A silent drop is the ' +
          'failure mode the drop-whole rule exists to prevent.'
  );
  p33Assert(
    'a "schema": 1 file may not carry the field',
    p33.refuseSchema1.dropped &&
      namesField(p33.refuseSchema1) &&
      typeof p33.refuseSchema1.message === 'string' &&
      p33.refuseSchema1.message.includes('2'),
    p33.refuseSchema1.field ?? 'no problem named the field',
    !p33.refuseSchema1.dropped
      ? 'a file that says "schema": 1 carried launch.envPassthrough and the row was merged ' +
          'anyway. A new field arrives as schema 2 with a converter, never as a block bolted ' +
          'onto version 1.'
      : 'the row was dropped without an error naming the field and the schema number to move ' +
          'to. The person cannot fix a file when the error does not say what to change.'
  );
}

// ---------------------------------------------------------------------------
// Section 7 — the settings route to a shell variable name (Phase 269)
// ---------------------------------------------------------------------------
//
// Phase 33, in section 5 above, built the mechanism and left it unreachable:
// no compiled row sets `launch.envPassthrough` and the only route to it was an
// `agents.json` file most people do not have. Phase 269 added the second
// route, being Settings then Launch defaults. This section holds the SHAPE
// half of it, which is everything a node process can reach: the refusal, the
// sanitizer the settings store calls, the union the launch path reads, and the
// promise that no compiled row has quietly started naming a variable.
//
// The seal itself needs `safeStorage` and therefore an Electron process, so it
// belongs to `src/main/settings/__tests__/p269-env-seal.test.ts` and to
// `probe:p269`, exactly as the confirm gate belongs to the Tier 3 verifier.
//
// Every denylist row is DERIVED from the exported arrays, so a name added to a
// denylist later is covered here with no edit to this file.

const p269 = data.p269 ?? {
  state: 'absent',
  missing: 'the probe printed no p269 section'
};
const p269Rows = [];

const p269Assert = (name, ok, note, why) => {
  p269Rows.push({ name, ok, note: note ?? '' });
  if (!ok) fail(`the settings route, ${name}: ${why}`);
};

const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);

if (p269.state !== 'present') {
  skipped.push(
    'the settings route to a shell variable name (Phase 269) has not landed, so the ' +
      'refusal, the sanitizer, the union and the "no compiled row names one" promise ' +
      `were NOT checked. ${p269.missing ?? ''}`
  );
} else {
  // 1. Every denied name earns a sentence, derived from the three arrays.
  const unsentenced = p269.denied.filter(
    (row) => typeof row.sentence !== 'string' || row.sentence.length === 0
  );
  p269Assert(
    'every denylisted name is refused with a sentence',
    unsentenced.length === 0,
    `${p269.denied.length} names probed`,
    `${unsentenced.map((r) => r.name).join(', ')} passed the refusal, so a name on a ` +
      'denylist could be added through Settings. The rows are derived from ' +
      'ENV_REFUSED_EXACT, ENV_REFUSED_PATTERNS and ENV_PASSTHROUGH_REFUSED, so a new ' +
      'entry is covered here without an edit.'
  );

  // 2. A usable name is accepted and a malformed one is not.
  const wronglyRefused = p269.accepted.filter((r) => r.sentence !== null);
  const wronglyAccepted = p269.malformed.filter((r) => r.sentence === null);
  p269Assert(
    'a usable name passes and a malformed one does not',
    wronglyRefused.length === 0 && wronglyAccepted.length === 0,
    `${p269.accepted.length} accepted, ${p269.malformed.length} refused`,
    wronglyRefused.length > 0
      ? `${wronglyRefused.map((r) => r.name).join(', ')} was refused, and a person whose ` +
          'own shell exports it would have no way to name it. A lower case name is a ' +
          'usable one: the pattern both routes read has always admitted it.'
      : `${wronglyAccepted.map((r) => JSON.stringify(r.name)).join(', ')} was accepted, ` +
          'and a name that is not a name reaches a shell script interpolation.'
  );

  // 3. The cap, driven exactly at its edge.
  p269Assert(
    'the sixteenth name is accepted and the seventeenth is not',
    p269.cap.limit === 16 &&
      p269.cap.sixteenth.sentence === null &&
      typeof p269.cap.seventeenth.sentence === 'string',
    `cap ${p269.cap.limit}`,
    p269.cap.limit !== 16
      ? `the cap moved to ${p269.cap.limit}, and the sentence a person reads still says ` +
          'sixteen.'
      : p269.cap.sixteenth.sentence !== null
        ? 'the sixteenth name was refused, so the cap bites one name early.'
        : 'the seventeenth name was accepted, so the cap does not bite at all.'
  );

  // 4. A duplicate, and the agent's OWN compiled variable. The cursor row is
  // asserted non-empty first, so this cannot go vacuous if that row ever loses
  // its `launch.env`.
  p269Assert(
    "a duplicate and the agent's own compiled variable are refused",
    p269.own.cursorEnvKeys.length > 0 &&
      typeof p269.own.duplicate.sentence === 'string' &&
      typeof p269.own.ownKey.sentence === 'string' &&
      p269.own.ownKeyOnAnotherAgent.sentence === null,
    `cursor sets ${p269.own.cursorEnvKeys.join(', ') || 'nothing'}`,
    p269.own.cursorEnvKeys.length === 0
      ? 'the cursor row sets no launch.env, so this assertion would have passed without ' +
          'checking anything. Point it at a row that does.'
      : p269.own.duplicate.sentence === null
        ? 'a name already on the list was accepted a second time.'
        : p269.own.ownKey.sentence === null
          ? 'a name the agent already sets itself was accepted, so an env-unresolved ' +
              'notice could say a pane started WITHOUT a variable the pane has.'
          : "the same name was refused for an agent that does NOT set it, so the check is " +
              'reading a global list rather than this agent.'
  );

  // 5. The sanitizer the settings store calls.
  const sz = p269.sanitized;
  const sanitizerOk =
    sameList(sz.unknownId, {}) &&
    sameList(sz.notAnArray, {}) &&
    sameList(sz.notAnObject, {}) &&
    sameList(sz.nullish, {}) &&
    sameList(sz.nonStringEntry, { claude: ['P269_A'] }) &&
    sameList(sz.refusedNames, { claude: ['P269_A', 'P269_B'] }) &&
    sameList(sz.ownKey, {}) &&
    sameList(sz.order, { claude: ['P269_Z', 'P269_A', 'P269_M'] }) &&
    Array.isArray(sz.overCap.claude) &&
    sz.overCap.claude.length === 16;
  p269Assert(
    'the sanitizer drops the bad and keeps the good, in order',
    sanitizerOk,
    `over-cap list kept ${Array.isArray(sz.overCap.claude) ? sz.overCap.claude.length : '?'}`,
    'sanitizeEnvPassthrough is what stands between a hand-edited settings.json and the ' +
      'shape the seal is then asked about. It must drop an unknown id, a non array, a ' +
      'non string entry and every refused name, keep the rest IN ORDER, stop at sixteen, ' +
      `and never throw. It answered ${JSON.stringify(sz)}.`
  );

  // 6. The union the launch path reads.
  const u = p269.union;
  const unionOk =
    u.bothEmpty === null &&
    u.bothEmptyLists === null &&
    sameList(u.rowOnly, ['P269_ROW_A', 'P269_ROW_B']) &&
    sameList(u.settingsOnly, ['P269_ROW_B', 'P269_SET_A']) &&
    sameList(u.merged, ['P269_ROW_A', 'P269_ROW_B', 'P269_SET_A']) &&
    u.rowUnchanged &&
    u.settingsUnchanged;
  p269Assert(
    'the two routes union, row first, deduped, undefined for neither',
    unionOk,
    u.merged === null ? 'no union' : u.merged.join(' '),
    u.bothEmpty !== null || u.bothEmptyLists !== null
      ? 'two empty routes answered a list rather than undefined, so an agent nobody has ' +
          'configured would spawn a probe and write a record field it did not before.'
      : !u.rowUnchanged || !u.settingsUnchanged
        ? 'the union edited one of its inputs, which are the stored settings and the ' +
            'merged agent row.'
        : `the union came back ${JSON.stringify(u.merged)}. It must be the row's names ` +
            "first, then the person's, with a name both name appearing once."
  );

  // 7. No compiled row names a variable. The Phase 33 promise, held over the
  // whole table so it survives the arrival of a second route.
  p269Assert(
    'no compiled registry row sets launch.envPassthrough',
    p269.compiledNamers.length === 0,
    `${data.compiledRows} rows scanned`,
    `${p269.compiledNamers.join(', ')} names a variable in the COMPILED table. Which ` +
      "variables an agent needs is a fact about one person's machine, so it is named by " +
      'that person, in Settings or in agents.json, and never shipped on by default.'
  );
}

// 8. Every catalog view carries `envKeys`, equal to that agent's compiled row.
const p269cat = data.p269Catalog ?? { state: 'absent', missing: 'no section printed' };
if (p269cat.state === 'absent') {
  skipped.push(
    'the flag catalog views were NOT checked for envKeys (Phase 269): ' +
      `${p269cat.missing}.`
  );
} else if (p269cat.state === 'broken') {
  fail(`composing the flag catalog views threw: ${p269cat.error}.`);
} else {
  const wrong = p269cat.rows.filter((r) => !sameList(r.envKeys, r.expected));
  p269Assert(
    'every flag catalog view carries its compiled env keys',
    wrong.length === 0,
    `${p269cat.rows.length} catalogs`,
    `${wrong
      .map((r) => `${r.id} carries ${JSON.stringify(r.envKeys)} rather than ${JSON.stringify(r.expected)}`)
      .join('; ')}. The Settings window says "this agent already sets FORCE_COLOR itself" ` +
      'from this field, so a wrong one is a sentence a person cannot act on.'
  );
}

// ---------------------------------------------------------------------------
// Reading the tree — the four helpers Section 9 below needs (Phase 275)
// ---------------------------------------------------------------------------
//
// Five of Phase 275's rules are about SHAPE rather than behaviour: a module that
// must import nothing, three launch paths that must pass a particular argument,
// two remote paths that must CALL one function, two config modules that must
// name a field nowhere, and one comment that named the wrong number. None of
// them can be driven — there is nothing to call — so they are read off the tree
// here.
//
// A LINE SCANNER RATHER THAN A PARSER, deliberately. This gate spawns nothing
// and imports nothing but the probe's JSON, and a real parser would be a second
// spelling of what `build/assert-no-runtime-cycles.mjs` already owns. Every
// file it reads keeps its imports at column zero and its comments in the two
// shapes below, which is the whole repository's idiom, and a file that broke
// that idiom would make a rule LOUDER rather than quieter: an unreadable file
// is reported as a failure naming the file, never as a pass.

/** One file's text, read once, or null when it is not there. */
const sourceCache = new Map();
function sourceOf(rel) {
  if (sourceCache.has(rel)) return sourceCache.get(rel);
  let text = null;
  try {
    text = readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    text = null;
  }
  sourceCache.set(rel, text);
  return text;
}

/**
 * A file's lines with its comments gone: block comments dropped whole, and any
 * line whose first non-space character opens a line comment or continues a
 * block one. A trailing `// …` after code on the same line is left alone, which
 * is why the identifier rules below read a whole word rather than a substring.
 */
function codeLines(rel) {
  const text = sourceOf(rel);
  if (text === null) return null;
  const out = [];
  let inBlock = false;
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (inBlock) {
      if (t.includes('*/')) inBlock = false;
      continue;
    }
    if (t.startsWith('/*')) {
      if (!t.includes('*/')) inBlock = true;
      continue;
    }
    if (t.startsWith('//')) continue;
    out.push(line);
  }
  return out;
}

/**
 * How many times a file brings another module in — a top-level `import`, a
 * re-export with a `from` clause, and a dynamic `import(`. Answers `ok: false`
 * with a reason rather than a number when the file cannot be read, so a missing
 * file is a failure and never a zero.
 */
function countImports(rel) {
  const lines = codeLines(rel);
  if (lines === null) return { ok: false, count: 0, found: [], why: `${rel} could not be read.` };
  const found = [];
  for (const line of lines) {
    if (/^\s*import\b/.test(line)) found.push(line.trim());
    else if (/^\s*export\b[^\n]*\bfrom\s*['"]/.test(line)) found.push(line.trim());
    else if (/\bimport\s*\(/.test(line)) found.push(line.trim());
  }
  return { ok: true, count: found.length, found, why: '' };
}

/** Every module specifier a file names in a `from '…'` clause, outside comments. */
function moduleSpecifiers(rel) {
  const lines = codeLines(rel);
  if (lines === null) return [];
  const out = [];
  for (const line of lines) {
    const m = /\bfrom\s*['"]([^'"]+)['"]/.exec(line);
    if (m !== null) out.push(m[1]);
  }
  return out;
}

/** Does this file name `needle` anywhere outside a comment? */
function fileHas(rel, needle) {
  const lines = codeLines(rel);
  if (lines === null) return false;
  return lines.some((line) => line.includes(needle));
}

/** Every match of `re` in the file's raw text, comments included. */
function fileMatches(rel, re) {
  const text = sourceOf(rel);
  if (text === null) return [];
  return [...text.matchAll(re)];
}

/**
 * The arguments of every `envPassthroughFor(…)` CALL in a file, as text, with
 * the declaration itself skipped. Parentheses, brackets and braces are balanced
 * and quoted runs are stepped over, so a call spanning five lines with an
 * object literal in it splits correctly.
 */
function unionCallArguments(rel) {
  const text = sourceOf(rel);
  if (text === null) return [];
  const calls = [];
  const needle = 'envPassthroughFor(';
  let at = text.indexOf(needle);
  while (at !== -1) {
    const before = text.slice(Math.max(0, at - 20), at);
    // `export function envPassthroughFor(` is the declaration, not a call.
    if (!/function\s+$/.test(before) && !/[A-Za-z0-9_$.]$/.test(before)) {
      const open = at + needle.length - 1;
      const args = splitArguments(text, open);
      if (args !== null) calls.push(args);
    }
    at = text.indexOf(needle, at + needle.length);
  }
  return calls;
}

/** Split the argument list whose `(` is at `open`, or null if it is unbalanced. */
function splitArguments(text, open) {
  const args = [];
  let depth = 0;
  let current = '';
  let quote = '';
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (quote !== '') {
      current += ch;
      if (ch === '\\') {
        current += text[i + 1] ?? '';
        i += 1;
      } else if (ch === quote) quote = '';
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') {
      depth += 1;
      if (depth === 1) continue;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      depth -= 1;
      if (depth === 0) {
        if (current.trim().length > 0) args.push(current);
        return args;
      }
    } else if (ch === ',' && depth === 1) {
      args.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  return null;
}

/** The login-shell capture deadline in whole seconds, read where it is set. */
function pathCaptureSeconds() {
  const m = fileMatches('src/main/tmux/resolve.ts', /PATH_CAPTURE_TIMEOUT_MS\s*=\s*([0-9_]+)/g);
  if (m.length === 0) return null;
  return Number(m[0][1].replace(/_/g, '')) / 1000;
}

// ---------------------------------------------------------------------------
// Section 9 — the shared list every agent reads (Phase 275)
// ---------------------------------------------------------------------------
//
// Phase 269 (section 7) keyed a shell variable name by AGENT. Phase 275 put a
// SHARED list beside that map, because an API key is a property of a PROVIDER
// rather than of an agent — one DeepSeek key is the same key whichever agent
// talks to DeepSeek — and repeating the same name once per agent was what the
// reporter actually hit.
//
// A shared list WIDENS WHAT ONE CONFIRMATION COVERS, and that is the whole
// reason this section exists. The rows below are numbered with the rule numbers
// in `build/p275/SPEC.md` §8, and every failure line carries its rule in
// brackets so `npm run ablation:p275` can prove each one can still go red.
// A rule that cannot fail proves nothing.
//
// The two most important rows are R27 and R28, which are the phase's two
// refusals driven rather than reasoned about:
//
//   R27 (R-A)  a SHARED name sealed PER-AGENT is dropped and reported.
//   R28 (R-B)  a PER-AGENT name sealed as SHARED is dropped and reported.
//
// Both run against the SHIPPING `withSealedDangerState`, which is pure and is
// handed the opened seal, so neither needs `safeStorage` and neither starts an
// Electron. R8 is the control beside them: the same two settings objects sealed
// the RIGHT way keep their name, so a refusal above cannot be passing because
// the seal drops everything.
//
// WHAT THIS SECTION STILL CANNOT PROVE. `sealDangerState` and `openDangerSeal`
// need a keystore. The text they seal is `JSON.stringify(dangerStateOf(...))`,
// and R30 asserts over exactly those bytes, so what is missing is the
// ciphertext and the round trip through the OS — which belong to
// `src/main/settings/__tests__/p275-env-shared-seal.test.ts` and to the Tier 3
// verifier driving the real app.
//
// NO VALUE IS READ ANYWHERE IN HERE. Every name is invented in the probe, in
// the shape a provider key has and matching none.

const p275 = data.p275 ?? null;
const p275Rows = [];
const p275Assert = (rule, name, ok, note, why) => {
  p275Rows.push({ rule, name, ok, note: note ?? '' });
  if (!ok) fail(`[p275 ${rule}] ${name}: ${why}`);
};

if (p275 === null) {
  fail(
    '[p275 R0] the probe printed no p275 section, so nothing about the shared ' +
      'shell-variable list was checked.'
  );
} else {
  const k = p275.keys;

  // R33. NON-VACUITY FIRST, before any per-id assertion below reads the list.
  // Every cross-admission check in this section loops over the launchable ids,
  // and a loop over an empty list passes without checking anything. This row is
  // what stops the whole section going quietly green if that table is ever
  // filtered down to nothing.
  const idsPresent = Array.isArray(k.ids) && k.ids.length > 0;
  p275Assert(
    'R33',
    'the launchable id list is not empty',
    idsPresent,
    `${idsPresent ? k.ids.length : 0} launchable ids`,
    'LAUNCHABLE_AGENT_IDS is empty, so every per-id assertion in this section ' +
      'would have passed over nothing. Non-vacuity is asserted before the ' +
      'per-id rows and not after them, because after them it is too late.'
  );

  // R35c. THE TWO KEY SPACES ARE DISJOINT, over every launchable id rather than
  // over a convenient one, because the claim is about a closed compiled set.
  //
  // Belt one is structural and lives in `withSealedDangerState`: a per-agent
  // name is tested only against `sealedEnv` and a shared name only against
  // `sealedShared`. R27 and R28 drive that belt. This row is BELT TWO, which is
  // textual and survives a later round merging the two fields: `envNameKey`
  // joins with a single space, `OVERLAY_ENV_KEY_PATTERN` forbids a space in a
  // name, so every per-agent key holds exactly one space and every bare shared
  // name holds none. The id half is never pattern-matched — it is drawn from
  // the compiled closed set, every member of which begins with a lowercase
  // letter — so no per-agent key can begin with `*` either.
  p275Assert(
    'R35c',
    'no agent id can produce a shared key, and no shared key an agent one',
    idsPresent &&
      k.collisions.length === 0 &&
      k.wrongSpaceCount.length === 0 &&
      k.startingWithStar.length === 0 &&
      k.patternAdmitsSpace === false &&
      k.idsNotLowercase.length === 0 &&
      k.sharedKeySpaces === 1 &&
      k.sharedKey.startsWith('* '),
    `${idsPresent ? k.ids.length : 0} ids × ${4} names`,
    k.collisions.length > 0
      ? `${k.collisions.join(', ')} is a per-agent seal key that equals a bare ` +
          'shared name or the shared display key. The two key spaces have to be ' +
          'disjoint or one confirmation can be replayed as the other, which is ' +
          'the exact widening this phase exists to make a person ask for out loud.'
      : k.patternAdmitsSpace
        ? 'OVERLAY_ENV_KEY_PATTERN now admits a space, so a name can carry the ' +
            'separator envNameKey joins with and the two key spaces are no ' +
            'longer disjoint by construction.'
        : k.wrongSpaceCount.length > 0
          ? `${k.wrongSpaceCount.join(', ')} does not hold exactly one space.`
          : k.idsNotLowercase.length > 0
            ? `${k.idsNotLowercase.join(', ')} does not begin with a lowercase ` +
                'letter, so an envNameKey output could begin with the `*` the ' +
                'shared display key begins with.'
            : `the shared display key is ${JSON.stringify(k.sharedKey)}, which is ` +
                'not `* ` followed by a bare name.'
  );

  // R24. `src/shared/launch-env.ts` IMPORTS NOTHING, and nothing mechanical
  // held that sentence before this phase: the import-boundary gate allows
  // shared -> shared, the cycle gate skips type-only imports, and no test named
  // the file. It is the leaf both the local launch and the remote carriage
  // import, and Phase 270 moved it there to cut a nineteen-module runtime
  // cycle. One import puts that cycle back.
  const launchEnvImports = countImports('src/shared/launch-env.ts');
  p275Assert(
    'R24',
    'the union module imports nothing',
    launchEnvImports.ok && launchEnvImports.count === 0,
    launchEnvImports.ok ? `${launchEnvImports.count} imports` : launchEnvImports.why,
    !launchEnvImports.ok
      ? launchEnvImports.why
      : `src/shared/launch-env.ts has ${launchEnvImports.count} import(s): ` +
          `${launchEnvImports.found.join(' | ')}. Phase 270 moved this function to a ` +
          'leaf precisely so the remote carriage could import it without closing a ' +
          'nineteen-module cycle, and the three things a round is likely to reach ' +
          'for all need one: the whole settings object, LaunchableAgentId, and ' +
          'OVERLAY_LIMITS for the cap. The cap belongs to the doors.'
  );

  // R23. THE THREE SOURCE UNION, and the half of it that matters most is the
  // NEGATIVE: the Phase 269 answer does not move by one byte. The shared source
  // joined on the END for exactly that reason, so nobody who never uses it sees
  // an argv order, a manifest row or a notice list change.
  const u = p275.union;
  const unionOk =
    u.threeEmpty === null &&
    u.threeEmptyLists === null &&
    sameList(u.sharedOnly, ['P275_SET_A', 'P275_SHR_A']) &&
    sameList(u.parentUndefined, ['P275_ROW_A', 'P275_ROW_B', 'P275_SET_A']) &&
    sameList(u.parentEmptyList, ['P275_ROW_A', 'P275_ROW_B', 'P275_SET_A']) &&
    sameList(u.merged, ['P275_ROW_A', 'P275_ROW_B', 'P275_SET_A', 'P275_SHR_A']) &&
    u.rowUnchanged &&
    u.perUnchanged &&
    u.sharedUnchanged;
  p275Assert(
    'R23',
    'three routes union, row then agent then shared, deduped',
    unionOk,
    u.merged === null ? 'no union' : u.merged.join(' '),
    u.threeEmpty !== null || u.threeEmptyLists !== null
      ? 'three empty routes answered a list rather than undefined. Empty at ' +
          'install is what keeps the login-shell probe unspawned for a person ' +
          'who configured nothing, and that probe costs about a second at the ' +
          'front of every session.'
      : !sameList(u.parentUndefined, ['P275_ROW_A', 'P275_ROW_B', 'P275_SET_A'])
        ? `a row and a per-agent list now answer ${JSON.stringify(u.parentUndefined)} ` +
            'rather than the Phase 269 order. Everybody who has both gets the ' +
            'identical list in the identical order they got at the parent, or the ' +
            'argv, the manifest row and the notice list move for people who never ' +
            'touched the new feature.'
        : !u.rowUnchanged || !u.perUnchanged || !u.sharedUnchanged
          ? 'the union edited one of its inputs, which are the merged agent row ' +
              'and two lists out of the sealed settings.'
          : `the union came back ${JSON.stringify(u.merged)}. It is the row first, ` +
              'then the per-agent list, then the shared one, with a name on more ' +
              'than one of them appearing once.'
  );

  // R12. Empty at install is not a nicety. It is the reason `envPassthroughFor`
  // returns undefined for a person who configured nothing, which is the reason
  // no launch pays for a feature it does not use.
  p275Assert(
    'R12',
    'the shared list is empty at install',
    p275.defaults.hasField === true && sameList(p275.defaults.shared, []),
    JSON.stringify(p275.defaults.shared),
    p275.defaults.hasField !== true
      ? 'defaultGmuxSettings() has no envPassthroughShared field at all, so every ' +
          'construction site of a settings object is one undefined away from a throw.'
      : `defaultGmuxSettings() ships ${JSON.stringify(p275.defaults.shared)} on the ` +
          'shared list. A fresh install would then spawn a login shell at the front ' +
          'of every create and every restore, for a name nobody asked for, and the ' +
          'seal would refuse it anyway.'
  );

  // R14, R15, R16. THE SHARED SANITIZER'S SHAPE TABLE, which is what stands
  // between a hand-edited settings.json and the shape the seal is then asked
  // about. Three separate rules, because the three failures are different:
  // R14 is repair, R15 is denial, R16 is a rendering primitive.
  const s = p275.shapeTable;
  const none = (v) => sameList(v, { names: [], refused: [], refusedOver: 0, unnamed: 0 });
  p275Assert(
    'R14',
    'the field drops whole when it is not an array, and nothing is repaired',
    none(s.nullish) &&
      none(s.undef) &&
      none(s.anObject) &&
      none(s.aString) &&
      none(s.aNumber) &&
      sameList(s.notTrimmed.names, []) &&
      sameList(s.order.names, ['P275_Z', 'P275_A', 'P275_M']) &&
      sameList(s.duplicate.names, ['P275_A']) &&
      s.overCap.names.length === 16,
    `over-cap kept ${Array.isArray(s.overCap.names) ? s.overCap.names.length : '?'}`,
    'a name is kept entirely or dropped entirely: never trimmed, case-folded, ' +
      'truncated or otherwise repaired into an acceptable shape, and the FIELD is ' +
      'dropped whole only when it is not an array. A sanitizer that repairs is a ' +
      'sanitizer that admits a name nobody typed. It answered ' +
      `${JSON.stringify(s)}.`
  );
  p275Assert(
    'R15',
    'one bad entry never denies the rest of the list',
    sameList(s.mixed, { names: ['P275_A', 'P275_B'], refused: [], refusedOver: 0, unnamed: 2 }) &&
      sameList(s.refusedEchoed.names, ['P275_A']),
    `${s.mixed.names.length} kept beside ${s.mixed.unnamed} dropped`,
    'a list with one junk entry came back short. Dropping the whole list because ' +
      'one entry is junk is a DENIAL any agent with write access could author in ' +
      'one line, and it would take away every key a person set. Per-name dropping ' +
      `fails closed per name. It answered ${JSON.stringify(s.mixed)}.`
  );
  p275Assert(
    'R16',
    'a refused entry is echoed only when it is safe to draw',
    sameList(s.refusedEchoed.refused, ['PATH']) &&
      sameList(s.tooLong, { names: [], refused: [], refusedOver: 0, unnamed: 1 }) &&
      sameList(s.notTrimmed, { names: [], refused: [], refusedOver: 0, unnamed: 1 }) &&
      sameList(s.trailingNewline, { names: [], refused: [], refusedOver: 0, unnamed: 1 }) &&
      sameList(s.carriageReturn, { names: [], refused: [], refusedOver: 0, unnamed: 1 }) &&
      sameList(s.overCap.refused, ['P275_OVER']),
    `${s.refusedEchoed.refused.join(', ')} echoed`,
    !sameList(s.trailingNewline, { names: [], refused: [], refusedOver: 0, unnamed: 1 }) ||
    !sameList(s.carriageReturn, { names: [], refused: [], refusedOver: 0, unnamed: 1 })
      ? 'a name carrying a newline or a carriage return was echoed or kept. That ' +
          'byte is what starts a second line inside one warning record and a second ' +
          'word in a shell, and the hand-written test for it is deliberate ' +
          'belt-and-braces beside the key pattern rather than a duplicate of it.'
      : 'a refused entry is echoed by name only when it has already passed the key ' +
          'pattern — letters, digits and underscore, at most 64 bytes — so it is ' +
          'provably safe in a log line and in the DOM. Anything else is counted in ' +
          '`unnamed` and never echoed. That is the difference between "never ' +
          'silently dropped" and "hand an attacker a rendering primitive". It ' +
          `answered ${JSON.stringify(s)}.`
  );

  // R16b. THE ECHO IS BOUNDED, and this rule is THE FIX ROUND'S. R16 above asks
  // WHAT may be echoed — the character set — and a rendering primitive is a SIZE
  // as well as a character set. `names` was always bounded, because the cap
  // counts it. `refused` was not: it runs over the raw file, and the raw file's
  // length is chosen by whoever wrote it, which since this phase is the exact
  // actor layer one of the seal exists to refuse. A verifier measured the
  // shipping store turning 200,000 hand-written junk names into one 12,088,932
  // byte paragraph in the Settings window. Nothing unsafe was DELIVERED and no
  // value moved — every echoed byte had passed the alphabet — so it is bounded
  // here rather than refused, and the remainder is a count the way `unnamed`
  // already is.
  p275Assert(
    'R16b',
    'the refused echo stops at sixteen and the rest is a count',
    Array.isArray(s.flood?.names) &&
      s.flood.names.length === 16 &&
      Array.isArray(s.flood.refused) &&
      s.flood.refused.length === 16 &&
      s.flood.refusedOver === 168 &&
      s.flood.unnamed === 0 &&
      // The two channels are disjoint: nothing counted is also echoed, so the
      // count cannot be read as "and these sixteen again".
      s.flood.names.length + s.flood.refused.length + s.flood.refusedOver === 200,
    `${String(s.flood?.refused?.length)} echoed, ${String(s.flood?.refusedOver)} counted`,
    'two hundred shape-valid names in settings.json came back with more than ' +
      'sixteen echoed. The window joins this list into ONE paragraph, so the ' +
      'length of that paragraph would be the file writer\'s to choose. Sixteen is ' +
      'the number this domain already spells, and the rest is `refusedOver`, ' +
      `counted and never drawn. It answered ${JSON.stringify(s.flood)}.`
  );

  // R18. THE TWO CAP SENTENCES, READ FROM `envPassthroughRefusal` rather than
  // written out here, so a reworded sentence is caught by the difference and
  // never by a stale copy of the words. "the most Tortie will read for one
  // agent" is FALSE at the shared door, and a sentence that is false at the
  // door a person is standing at is worse than no sentence.
  const c = p275.cap;
  p275Assert(
    'R18',
    'the cap says a different true sentence at each of the two doors',
    c.limit === 16 &&
      typeof c.agent === 'string' &&
      typeof c.shared === 'string' &&
      c.agent !== c.shared &&
      c.agent === c.defaulted &&
      c.agent.includes('one agent') &&
      c.shared.includes('every agent') &&
      typeof c.ownAgent === 'string' &&
      typeof c.ownShared === 'string' &&
      c.ownAgent !== c.ownShared,
    `${c.limit} at both doors`,
    c.limit !== 16
      ? `the cap moved to ${c.limit} while both sentences still say sixteen.`
      : c.agent === c.shared
        ? 'the shared door says the per-agent sentence. "Sixteen names is the most ' +
            'Tortie will read for one agent" is false on a list that is read for ' +
            'every agent, including agents installed later.'
        : c.agent !== c.defaulted
          ? 'a call site that passes no scope no longer gets the sentence it got ' +
              'before Phase 275, so every door written before this phase changed ' +
              'its words without asking.'
          : c.ownAgent === c.ownShared
            ? 'the "this agent already sets it itself" refusal says the same thing ' +
                'at both doors. On the shared door the subject is not one agent, and ' +
                'naming one names an agent the person is not looking at.'
            : `the two sentences are ${JSON.stringify([c.agent, c.shared])}.`
  );

  // The static half: the four launch paths, the confirm hash's negative, and
  // one comment that drifted. These read the tree directly rather than the
  // probe, so they hold even when the settings store has not landed.
  //
  // R25. ALL FOUR LAUNCH PATHS READ THE SAME UNION — local create, local
  // restore, remote create and remote restore — because "remote feels identical
  // to local" is the operator's standing rule and the env path was the one
  // place it was not true: at the parent, a name added in Settings after a
  // session was created reached that session on a remote restore and never on a
  // local one.
  //
  // THE ARGUMENT IS READ, NOT COUNTED. TypeScript already refuses a call with
  // two arguments, so a gate that counted them would assert what the compiler
  // asserts. What the compiler cannot see is `envPassthroughFor(row, per,
  // undefined)`, which is a launch path that quietly carries two sources out of
  // three, so the third argument has to NAME the shared list.
  const callSites = [
    ['src/main/sessions/create-local.ts', 'the local create'],
    ['src/main/restore/restore.ts', 'the local restore'],
    ['src/main/machines/remote-env-probe.ts', 'the remote create and the remote restore']
  ];
  const badSites = [];
  for (const [rel, what] of callSites) {
    const found = unionCallArguments(rel);
    if (found.length === 0) {
      badSites.push(`${rel} (${what}) calls envPassthroughFor nowhere`);
      continue;
    }
    for (const args of found) {
      if (args.length !== 3) {
        badSites.push(`${rel} (${what}) passes ${args.length} arguments`);
        continue;
      }
      const third = args[2].trim();
      // The literal shapes are the whole point of this row. Each of these
      // compiles, each satisfies the required third parameter, and each is a
      // launch path carrying two sources out of three.
      if (third === 'undefined' || third === 'null' || third === '[]') {
        badSites.push(
          `${rel} (${what}) passes the literal ${JSON.stringify(third)} as its ` +
            'third argument, which compiles and carries no shared name'
        );
        continue;
      }
      // Either the argument names the field, or it is a local the file binds
      // FROM the field — the shape a path that has to read the settings inside
      // a try/catch ends up with.
      const namesField = third.includes('envPassthroughShared');
      const boundFromField =
        /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(third) &&
        (codeLines(rel) ?? []).some(
          (line) => line.includes(third) && line.includes('envPassthroughShared')
        );
      if (!namesField && !boundFromField) {
        badSites.push(
          `${rel} (${what}) passes ${JSON.stringify(third)} as its third argument, ` +
            'and nothing in that file binds it from envPassthroughShared'
        );
      }
    }
  }
  p275Assert(
    'R25',
    'all four launch paths read the same three-source union',
    badSites.length === 0,
    `${callSites.length} files`,
    `${badSites.join('; ')}. A shared key that works only on sessions created ` +
      'after it was set is not what the reporter asked for — his words were ' +
      '"applies to any agent session that needs keys", and a restored session is a ' +
      'session that needs keys.'
  );

  // R20b. THE TWO LAYERS STAY APART ALL THE WAY TO THE FACE, and this rule is
  // THE FIX ROUND'S. `store.ts` holds the shape layer's drops and the seal
  // layer's in two module fields, with a comment saying in as many words that
  // they "are not interchangeable" — and the build two verifiers attacked then
  // concatenated them one line before the answer left the process, so the window
  // drew the SEAL's sentence over both. Two independent readings of that:
  // twenty-one names under "not added here" while app.log named twelve; and a
  // name the seal DOES cover, pushed out by the cap at the shape layer, drawn
  // FIRST and labelled as one that had never been added here. Nothing unsafe was
  // delivered either time — this is the honesty half, on the one surface that
  // exists to say honestly why a key stopped arriving.
  //
  // Read as TEXT because `envRejectionsNow` needs Electron and this gate starts
  // nothing. The suite drives the behaviour; this holds the shape so the
  // ablation harness can redden it.
  const rejFile = 'src/main/settings/store.ts';
  const sealOnly = fileHas(rejFile, 'answer.shared = [...(seal?.shared ?? [])];');
  const shapeOwn = fileHas(rejFile, 'answer.sharedUnread = [...shapeEnvRejections.shared];');
  const overCarried = fileHas(rejFile, 'answer.sharedUnreadOver = shapeEnvRejections.sharedOver;');
  const concatenated = fileHas(
    rejFile,
    'answer.shared = [...shapeEnvRejections.shared, ...(seal?.shared ?? [])];'
  );
  // The face has to have a second sentence to draw, and it must not be the
  // seal's words, or the split in main is a distinction nobody reads.
  const copyFile = 'src/renderer/settings/env-copy.ts';
  const twoSentences =
    fileHas(copyFile, 'export function envUnreadLine(') &&
    fileHas(copyFile, 'Ignored, because they were not added here:') &&
    fileHas(copyFile, 'Ignored, because Tortie will not read them:');
  const drawsBoth =
    fileHas('src/renderer/settings/LaunchDefaultsSection.tsx', 'envUnreadLine(unread, unreadOver)') &&
    fileHas('src/renderer/settings/LaunchDefaultsSection.tsx', 'unread={rejections.sharedUnread}');
  p275Assert(
    'R20b',
    'the shape layer and the seal layer get two fields and two sentences',
    sealOnly && shapeOwn && overCarried && !concatenated && twoSentences && drawsBoth,
    `seal ${String(sealOnly)}, shape ${String(shapeOwn)}, two sentences ${String(twoSentences)}`,
    'the two rejection layers were merged, or the face draws one sentence over ' +
      'both. "Ignored, because they were not added here" is a DIRECTION: it tells ' +
      'a person to add the name in this window. That is true of a seal drop and ' +
      'false of a shape drop, where adding it here is a dead end — and when the ' +
      'cap is what dropped it, the name being mislabelled is the very name the ' +
      'person came to the window about.'
  );

  // R26. What the remote cap drops is REPORTED BY NAME. The union can now reach
  // 48 names and `remoteEnvNamesFor` caps it at 16 BEFORE the far-side probe
  // sees it, so without this the names past sixteen vanish with nothing said,
  // on remote only. Phase 270 already computes a `dropped` list; this is that
  // machinery reused rather than a new one.
  const droppedNamers = ['src/main/machines/remote-sessions.ts', 'src/main/machines/remote-restore.ts'];
  const dropExports = fileHas('src/main/machines/remote-env-probe.ts', 'export function remoteEnvNamesDroppedFor');
  // The trailing `(` is the whole point: an import that nobody CALLS satisfies a
  // name search and reports nothing, and that is precisely the shape a round
  // leaves behind when it removes the read and forgets the import.
  const dropReaders = droppedNamers.filter((rel) => fileHas(rel, 'remoteEnvNamesDroppedFor('));
  p275Assert(
    'R26',
    'the remote cap says which names did not travel',
    dropExports && dropReaders.length === droppedNamers.length,
    `${dropReaders.length} of ${droppedNamers.length} readers`,
    !dropExports
      ? 'remote-env-probe.ts exports no remoteEnvNamesDroppedFor, so the cap at ' +
          'sixteen truncates the union silently and a person over it is never told ' +
          'which names did not travel.'
      : `${droppedNamers
          .filter((rel) => !dropReaders.includes(rel))
          .join(', ')} never CALLS it, so the env-unresolved notice on that path is ` +
          'drawn without the names the cap dropped, and a person over sixteen is ' +
          'told nothing on remote while the local paths say it.'
  );

  // R10. THE CONFIRM HASH DOES NOT GAIN THE SHARED SET, and this is a NEGATIVE
  // rather than a feature. `executionHash` covers `agents.json` rows; the shared
  // list lives in `settings.json` behind its own seal. Wiring one into the other
  // would re-arm every configured row's confirmation for a change that cannot
  // alter what that row runs, and `src/main/config/confirm.ts` says in as many
  // words why that is worse than useless: "asking a person to re-approve it
  // trains them to click through the sheet that matters."
  //
  // It is asserted statically because there is nothing behavioural to measure:
  // the point is that the two mechanisms do not touch, and the way a later round
  // would make them touch is by naming one from the other.
  const confirmFiles = ['src/main/config/overlay.ts', 'src/main/config/confirm.ts'];
  const leaks = [];
  for (const rel of confirmFiles) {
    if (fileHas(rel, 'envPassthroughShared')) leaks.push(`${rel} names envPassthroughShared`);
    if (fileHas(rel, 'envShared')) leaks.push(`${rel} names envShared`);
    // The SETTINGS STORE, not `@shared/settings`. The shape module is a pure
    // description of what a settings file may hold and naming it changes
    // nothing about what an agents.json row runs; `../settings/store` is the
    // sealed read, and a config module reaching for that is the one import that
    // would let a shared name into the confirm hash.
    for (const spec of moduleSpecifiers(rel)) {
      if (spec.startsWith('@shared/')) continue;
      if (/(^|\/)settings(\/|$)/.test(spec)) leaks.push(`${rel} imports ${spec}`);
    }
  }
  p275Assert(
    'R10',
    'the confirm hash did not gain the shared set',
    leaks.length === 0,
    `${confirmFiles.length} files`,
    `${leaks.join('; ')}. The confirm hash is bound to the fields that decide what ` +
      'an agents.json row RUNS. A shared name cannot change any of them, so adding ' +
      'it there asks every configured row to be re-approved for a change that ' +
      'cannot affect it, which trains a person to click through the sheet that ' +
      'matters.'
  );

  // R34. One comment that drifted, fixed in the same commit because the phase
  // touched the line above it. The login-shell deadline is read out of the
  // module that owns it rather than written here, so this row re-derives
  // instead of pinning a number.
  const deadline = pathCaptureSeconds();
  const wrongDeadline =
    deadline === null
      ? []
      : fileMatches('src/main/sessions/create-local.ts', /(\d+)\s+second deadline/g).filter(
          (m) => Number(m[1]) !== deadline
        );
  p275Assert(
    'R34',
    'the login-shell deadline is named correctly where it is described',
    deadline !== null && wrongDeadline.length === 0,
    deadline === null ? 'no PATH_CAPTURE_TIMEOUT_MS found' : `${deadline} s`,
    deadline === null
      ? 'PATH_CAPTURE_TIMEOUT_MS could not be read out of src/main/tmux/resolve.ts, ' +
          'so the deadline a comment claims cannot be compared with the real one.'
      : `src/main/sessions/create-local.ts says ` +
          `"${wrongDeadline.map((m) => m[0]).join('", "')}" while the real deadline ` +
          `is ${deadline} seconds. A comment that names a wrong number is worse than ` +
          'no comment: the next person budgets for it.'
  );

  // The seal half. It needs the settings store, which imports electron — safe
  // in a node process because nothing here touches `app` — and it reports
  // `absent` OUT LOUD rather than passing quietly if the store has not landed.
  const sl = p275.seal ?? { state: 'absent', missing: 'no seal section printed' };
  if (sl.state === 'absent') {
    skipped.push(
      'the Phase 275 SEAL was NOT checked, so the two refusals R27 and R28, the ' +
        'isDangerStateEmpty clause R7, the sealed text R30 and the old-seal rule ' +
        `R32 all went unasserted. ${sl.missing ?? ''}`
    );
  } else if (sl.state === 'broken') {
    fail(`[p275 R0] the seal section threw when it was used: ${sl.error}.`);
  } else {
    // R7. THE SINGLE MOST IMPORTANT LINE IN THIS PHASE. `getSettings`
    // short-circuits on `isDangerStateEmpty` and returns the file VERBATIM,
    // WITHOUT OPENING THE SEAL. It is a boolean expression over an object, so a
    // field added to `DangerState` and forgotten there leaves the function
    // COMPILING AND WRONG, and a settings.json whose ONLY danger value is a
    // shared name would be admitted unsealed. That is a complete bypass of
    // layer one — a name no human confirmed reaching a spawned process — and it
    // is invisible to the type checker, to every other row in this section and
    // to every test that seals something else as well.
    p275Assert(
      'R7',
      'a file whose only danger value is a shared name still reaches the seal',
      sl.empty.withOnlyASharedName === false &&
        sl.empty.withOnlyAPerAgentName === false &&
        sl.empty.withNothing === true,
      '',
      sl.empty.withOnlyASharedName !== false
        ? 'isDangerStateEmpty answered true for a settings object whose only danger ' +
            'value is a shared name, so getSettings returns that file verbatim and ' +
            'never opens the seal. A name written into settings.json by any agent on ' +
            'the machine would then be handed to every agent Tortie launches, with ' +
            'nothing said. This is refusal 8 in CLAUDE.md and it does not move.'
        : sl.empty.withNothing !== true
          ? 'isDangerStateEmpty answered false for a settings object with no danger ' +
              'value at all, so every ordinary install now pays for a seal read it ' +
              'does not need.'
          : 'isDangerStateEmpty answered true for a settings object whose only ' +
              'danger value is a PER-AGENT name, which is the Phase 269 clause.'
    );

    // R2 and R30. The sealed TEXT — the exact bytes `sealDangerState` encrypts.
    const sealText = sl.seal;
    p275Assert(
      'R30',
      'the seal moves when a shared name is added and returns when it goes',
      sealText.afterAdd !== sealText.base &&
        sealText.afterRemove === sealText.base &&
        sealText.twoNamesOneOrder === sealText.twoNamesOtherOrder,
      '',
      sealText.afterAdd === sealText.base
        ? 'adding a shared name left the sealed text byte-identical, so a seal given ' +
            'for a narrower set still covers the wider one and the confirmation a ' +
            'person gave has been silently extended.'
        : sealText.afterRemove !== sealText.base
          ? 'removing the name did not return the text to where it started, so the ' +
              'seal depends on something other than the set of names and a person is ' +
              'asked to confirm again for no reason.'
          : 'two orders of the same two shared names sealed to two different texts. ' +
              'Order does not change which variables reach a pane, and asking a person ' +
              'to re-approve a reorder trains them to click through the sheet that ' +
              'matters.'
    );
    p275Assert(
      'R2',
      'the sealed field holds BARE names, never a key',
      sameList(sealText.sharedField, [sl.name]),
      sealText.sharedField.join(' '),
      `the shared seal field holds ${JSON.stringify(sealText.sharedField)} rather ` +
        `than the bare ${JSON.stringify([sl.name])}. envSharedKey's "* " form is ` +
        'display-only: it exists so one log line can print `* NAME` beside ' +
        '`claude NAME`, and it is never a Set member, never compared and never ' +
        'parsed back apart. A seal field holding it would be a key space with a ' +
        'parser behind it, and no seal key in this repository is ever split.'
    );

    // R27 — R-A. A SHARED name sealed PER-AGENT is dropped and reported.
    p275Assert(
      'R27',
      'R-A, a shared name sealed per-agent is dropped',
      sameList(sl.ra.kept, []) &&
        sl.ra.rejected.includes(sl.expectShared) &&
        sameList(sl.ra.reportedShared, [sl.name]) &&
        sameList(sl.ra.reportedPerAgent, []),
      sl.ra.rejected.join(', '),
      !sameList(sl.ra.kept, [])
        ? `a name sealed as "${sl.expectAgent}" was admitted onto the SHARED list, ` +
            'which hands it to every agent Tortie launches, including agents ' +
            'installed after the confirmation. A person agreed to one agent and got ' +
            'all of them. That is the widening this phase exists to make somebody ' +
            'ask for out loud, and it is layer two of the seal failing open.'
        : `the name was dropped but not reported as ${JSON.stringify(sl.expectShared)} ` +
            `(rejected: ${JSON.stringify(sl.ra.rejected)}, shared: ` +
            `${JSON.stringify(sl.ra.reportedShared)}). A silent drop is how a ` +
            'person finds out their agent stopped seeing a key by watching it fail.'
    );

    // R28 — R-B. A PER-AGENT name sealed as SHARED is dropped and reported.
    p275Assert(
      'R28',
      'R-B, a per-agent name sealed as shared is dropped',
      sameList(sl.rb.kept, []) &&
        sl.rb.rejected.includes(sl.expectAgent) &&
        sameList(sl.rb.reportedPerAgent, [sl.name]) &&
        sameList(sl.rb.reportedShared, []),
      sl.rb.rejected.join(', '),
      !sameList(sl.rb.kept, [])
        ? 'a name sealed on the SHARED list was admitted onto one agent\'s list. ' +
            'The direction is the safer one of the two and it is refused anyway, ' +
            'because the seal\'s promise is that an agreement covers exactly what ' +
            'its words said and nothing else — an agreement that can be replayed in ' +
            'either direction is one agreement pretending to be two.'
        : `the name was dropped but not reported as ${JSON.stringify(sl.expectAgent)} ` +
            `(rejected: ${JSON.stringify(sl.rb.rejected)}, per-agent: ` +
            `${JSON.stringify(sl.rb.reportedPerAgent)}).`
    );

    // R8 — THE CONTROL BESIDE R27 AND R28, and without it neither proves
    // anything. The same two settings objects, sealed the RIGHT way, keep their
    // name. A `withSealedDangerState` that dropped everything would pass both
    // refusals above and break the product completely.
    p275Assert(
      'R8',
      'sealed the right way, each name survives',
      sameList(sl.okShared.kept, [sl.name]) &&
        sameList(sl.okShared.rejected, []) &&
        sameList(sl.okAgent.kept, [sl.name]) &&
        sameList(sl.okAgent.rejected, []),
      '',
      `a name sealed on its OWN list was dropped anyway (shared kept ` +
        `${JSON.stringify(sl.okShared.kept)}, agent kept ` +
        `${JSON.stringify(sl.okAgent.kept)}). R27 and R28 above would pass over a ` +
        'seal that admits nothing, so this row is what makes them mean something.'
    );

    // R32. A seal written before this phase has no `envShared` member at all.
    // It must cover no shared name — fail safe, not fail open, and not throw.
    p275Assert(
      'R32',
      'a seal written before this phase covers no shared name',
      sameList(sl.oldSeal.kept, []) && sl.oldSeal.rejected.includes(sl.expectShared),
      sl.oldSeal.rejected.join(', '),
      sameList(sl.oldSeal.kept, [])
        ? 'the old seal dropped the name without reporting it.'
        : 'a seal with no envShared member admitted a shared name. Every person ' +
            'upgrading into this phase has exactly that seal, so this is not an edge ' +
            'case — it is the first read after the update, on every machine.'
    );

    // R17. The shared list refuses every name any launchable agent's compiled
    // `launch.env` already sets, and the union is DERIVED from the registry by
    // the probe rather than read out of the store twice. Refusing them is the
    // honest answer rather than an over-reach: the shared list reaches cursor
    // too, and a shared FORCE_COLOR would make the env-unresolved notice say a
    // cursor pane started WITHOUT a variable that pane actually has.
    const ru = sl.refusedUnion;
    p275Assert(
      'R17',
      'the shared list refuses every compiled launch.env name',
      ru.derived.length > 0 &&
        sameList(ru.stored, ru.derived) &&
        sameList(ru.sanitized.names, []) &&
        sameList(ru.sanitized.refused, ru.derived),
      ru.derived.join(', ') || 'nothing',
      ru.derived.length === 0
        ? 'no launchable agent sets a compiled launch.env key, so this row would ' +
            'have passed without checking anything. Point it at a table that has one.'
        : !sameList(ru.stored, ru.derived)
          ? `sharedRefusedEnvKeys() answers ${JSON.stringify(ru.stored)} where the ` +
              `registry says ${JSON.stringify(ru.derived)}. The number is spelled ` +
              'once, from LAUNCHABLE_AGENT_IDS × compiledLaunchEnvKeys, so the door ' +
              'that refuses a name and the list that offers one cannot disagree.'
          : `putting ${JSON.stringify(ru.derived)} on the shared list by hand gave ` +
              `${JSON.stringify(ru.sanitized)}. Each one has to be refused and named.`
    );

    // R17b. THE INTEGRATOR'S ROUND ADDED THIS, and it is the one seam where
    // the two halves of Phase 275 could come to different answers.
    //
    // Main refuses a shared name that any LAUNCHABLE agent's compiled
    // `launch.env` sets, computed in `sharedRefusedEnvKeys()` from
    // `LAUNCHABLE_AGENT_IDS` × `compiledLaunchEnvKeys`. The picker sheet has no
    // registry, so it draws the same sentence from a union it builds over the
    // `envKeys` on every flag catalog the renderer holds
    // (`EnvPickerSheet.tsx`'s `agentEnvKeys`, the shared arm). Those are two
    // tables — `AGENT_REGISTRY` filtered by `launchable` on one side,
    // `AGENT_FLAG_PRESETS` on the other — and nothing made them agree.
    //
    // MEASURED AT THIS COMMIT and they do agree exactly, both answering
    // `FORCE_COLOR, GROK_PRIVACY_NOTICE_ROLLOUT`, because every registry row
    // carrying a `launch.env` is launchable today. If a later round adds a row
    // to one table and not the other, the picker would offer a name the door
    // then refuses on write — a person ticks it, agrees to the confirm, and the
    // name is silently absent afterwards. That is the defect this row catches,
    // and it catches it in the gate rather than in the running app.
    const catalogUnion =
      p269cat.state === 'present'
        ? [...new Set(p269cat.rows.flatMap((r) => r.envKeys ?? []))].sort()
        : null;
    p275Assert(
      'R17b',
      'the picker offers what the shared door accepts, over one union',
      catalogUnion !== null && sameList(catalogUnion, ru.stored),
      catalogUnion === null
        ? 'no catalog views'
        : `${catalogUnion.length} keys on both sides`,
      catalogUnion === null
        ? 'the flag catalog views were not read, so the union the Settings window ' +
            'builds could not be compared with the one main refuses by.'
        : `the catalogs the renderer holds union to ${JSON.stringify(catalogUnion)} ` +
            `while sharedRefusedEnvKeys() answers ${JSON.stringify(ru.stored)}. The ` +
            'picker would offer a name the shared door refuses, so a person would ' +
            'tick it, read the confirm, agree, and find the name gone.'
    );

    // R18's second half and R13. TWO CAPS, ONE NUMBER: the shared list gets its
    // own sixteen and each agent list keeps its own sixteen, driven through
    // `sanitizeSettings`, which is the door a settings file actually comes in
    // at. One sixteen split between them would mean a shared name silently
    // shrinks what an agent may add on its own card — taking away per-agent
    // narrowing at exactly the moment this phase promises to keep it.
    p275Assert(
      'R13',
      'the two lists have their own budgets and their own sanitizer',
      sl.budgets.shared === 16 &&
        sl.budgets.agent === 16 &&
        sameList(sl.sanitized, ['P275_KEEP', 'P275_ALSO']),
      `${sl.budgets.shared} shared beside ${sl.budgets.agent} per agent`,
      sl.budgets.shared !== 16 || sl.budgets.agent !== 16
        ? `sixteen shared names beside sixteen claude names came back as ` +
            `${sl.budgets.shared} and ${sl.budgets.agent}. The cap is a property of ` +
            'a DOOR and not of a launch, and a person who filled the shared list ' +
            'would meet a per-agent refusal about a list they are not looking at.'
        : `sanitizeSettings answered ${JSON.stringify(sl.sanitized)} for a shared ` +
            'list holding two good names, a number, a denylisted name and a 65-byte ' +
            'one. The field has to be filled through the shared sanitizer, or a ' +
            'hand-edited file reaches the seal unbounded.'
    );
  }
}

// ---------------------------------------------------------------------------
// Section 6 — the version probe is unreachable from the create path (Phase 49)
// ---------------------------------------------------------------------------
//
// The probe composed the full create-path spec for every launchable agent
// before it read these two values. A create can never start a version probe
// and can never wait on one; these two lines are what keep that sentence
// executable rather than asserted.

const pb = data.probeBudget ?? null;
if (pb === null) {
  fail(
    'the probe printed no probeBudget section, so "the version probe is ' +
      'unreachable from the create path" was not checked.'
  );
} else {
  if (pb.versionProbeCount !== 0) {
    fail(
      `composing the create-path spec ran ${pb.versionProbeCount} version ` +
        'probe(s). The create path must never start one.'
    );
  }
  if (pb.scanResolved) {
    fail(
      'composing the create-path spec left a resolved detection scan behind, ' +
        'so something on that path started a scan.'
    );
  }
}

// ---------------------------------------------------------------------------
// Section 10 — the activity fields no configuration can reach (Phase 321)
// ---------------------------------------------------------------------------
//
// build/p321/SPEC.md §4.1: `dialogs` is fixed data built into Tortie, because
// it decides a session's status and refusal 5 says no configuration may.
// `writesWhileAsking` (removed by the fix round, SPEC §12.9) and
// `residentHelpers` (removed by the operator's ruling of 2026-09-23, SPEC
// §12.10) stay in the list the overlay may never name, so neither can come
// back as configuration. The overlay already refuses
// `activity` whole; these rows are what keep that refusal from being quietly
// narrowed by a later round that "only adds one field".
//
// Rows 10.1 to 10.3 read the source with the TypeScript parser (a module, not a
// process), so comments never satisfy or break them. Row 10.4 is DRIVEN: one
// short run of the pinned tsx feeds rows to the shipping `parseAgentOverlay` on
// its stdin and prints what came back. Every row is then asked again over
// in-memory copies with its rule broken, and each copy must read red.

const P321_FIELDS = ['dialogs', 'writesWhileAsking', 'residentHelpers'];
const OVERLAY_TYPES = 'src/shared/agent-overlay.ts';
const OVERLAY_LOADER = 'src/main/config/overlay.ts';
const REGISTRY_SOURCE = 'src/main/agents/registry.ts';

const tsParse = (rel, text) =>
  ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
function tsNodes(node) {
  const out = [];
  const visit = (n) => {
    out.push(n);
    ts.forEachChild(n, visit);
  };
  visit(node);
  return out;
}
/** `x as const`, `x satisfies T`, `(x)` and `Object.freeze(x)`, peeled to `x`. */
function tsPeel(expr) {
  let e = expr;
  while (e !== undefined) {
    if (ts.isAsExpression(e) || ts.isParenthesizedExpression(e) || ts.isSatisfiesExpression(e)) e = e.expression;
    else if (ts.isCallExpression(e) && e.expression.getText() === 'Object.freeze' && e.arguments.length === 1) e = e.arguments[0];
    else return e;
  }
  return e;
}
/** The object literal a `const NAME = { … }` holds, or null. */
function constObject(sf, name) {
  const decl = tsNodes(sf).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name);
  const init = decl === undefined ? undefined : tsPeel(decl.initializer);
  return init !== undefined && ts.isObjectLiteralExpression(init) ? init : null;
}
const propName = (p) =>
  p.name !== undefined && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : null;
const insertAt = (text, at, what) => `${text.slice(0, at)}${what}${text.slice(at)}`;

/** 10.1 The overlay's hand-written types name none of the three, and the row type no `activity`. */
function p321OverlayTypeFindings(text) {
  const sf = tsParse(OVERLAY_TYPES, text);
  const out = [];
  const shapes = tsNodes(sf).filter(
    (n) => (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) && n.name.text.startsWith('AgentOverlay')
  );
  const row = shapes.find((n) => ts.isInterfaceDeclaration(n) && n.name.text === 'AgentOverlayV1');
  if (row === undefined) return [`${OVERLAY_TYPES} no longer declares the interface AgentOverlayV1, so the row type cannot be read`];
  for (const decl of shapes) {
    const members = tsNodes(decl).filter((n) => ts.isPropertySignature(n)).map(propName).filter((x) => x !== null);
    for (const f of P321_FIELDS) {
      if (members.includes(f)) out.push(`${decl.name.text} declares \`${f}\``);
    }
    if (decl === row && members.includes('activity')) out.push('AgentOverlayV1 declares `activity`');
  }
  const schema = constObject(sf, 'AGENT_OVERLAY_JSON_SCHEMA');
  if (schema !== null) {
    const keys = tsNodes(schema).filter((n) => ts.isPropertyAssignment(n)).map(propName);
    for (const f of [...P321_FIELDS, 'activity']) {
      if (keys.includes(f)) out.push(`AGENT_OVERLAY_JSON_SCHEMA offers \`${f}\``);
    }
  }
  // The internal registry types are never re-exported to the overlay (CLAUDE.md).
  for (const name of ['AgentActivityProfile', 'DialogShapeId', 'DIALOG_SHAPES']) {
    if (tsNodes(sf).some((n) => ts.isIdentifier(n) && n.text === name)) out.push(`${OVERLAY_TYPES} names ${name}`);
  }
  return out;
}

/** 10.2 `REFUSED_ROW_FIELDS.activity` stands, ROW_KEYS admits none of it, and validateRow asks the refusal. */
function p321RefusalFindings(overlayText, loaderText) {
  const out = [];
  const refused = constObject(tsParse(OVERLAY_TYPES, overlayText), 'REFUSED_ROW_FIELDS');
  if (refused === null) return [`${OVERLAY_TYPES} no longer declares REFUSED_ROW_FIELDS as an object literal`];
  const activity = refused.properties.find((p) => ts.isPropertyAssignment(p) && propName(p) === 'activity');
  const sentence = activity === undefined ? '' : activity.initializer.getText();
  if (activity === undefined || !/['"`]/.test(sentence) || sentence.length < 12) {
    out.push('REFUSED_ROW_FIELDS no longer refuses `activity` with a sentence');
  }
  const loader = tsParse(OVERLAY_LOADER, loaderText);
  const rowKeys = tsNodes(loader).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'ROW_KEYS');
  const list = rowKeys === undefined ? undefined : tsPeel(rowKeys.initializer);
  if (list === undefined || !ts.isArrayLiteralExpression(list)) {
    out.push(`${OVERLAY_LOADER} no longer declares ROW_KEYS as a list, so what a row may carry cannot be read`);
  } else {
    const keys = list.elements.filter((e) => ts.isStringLiteral(e)).map((e) => e.text);
    for (const f of [...P321_FIELDS, 'activity']) {
      if (keys.includes(f)) out.push(`ROW_KEYS admits \`${f}\``);
    }
  }
  const validate = tsNodes(loader).find((n) => ts.isFunctionDeclaration(n) && n.name?.text === 'validateRow');
  if (validate === undefined) {
    out.push(`${OVERLAY_LOADER} no longer declares validateRow`);
  } else {
    const refusal = tsNodes(validate).find(
      (n) =>
        ts.isCallExpression(n) &&
        n.expression.getText() === 'refusedKeys' &&
        n.arguments[1]?.getText() === 'REFUSED_ROW_FIELDS'
    );
    if (refusal === undefined) out.push('validateRow no longer asks refusedKeys(…, REFUSED_ROW_FIELDS, …)');
  }
  return out;
}

/**
 * 10.3 The floor profiles list none of the three, and `activityProfileFor`
 * reads the compiled array alone, so a configured or unknown agent can never
 * be handed a shape, a repaint exemption or a helper rule.
 */
function p321FloorFindings(registryText) {
  const sf = tsParse(REGISTRY_SOURCE, registryText);
  const out = [];
  for (const name of ['DEFAULT_ACTIVITY', 'SHELL_ACTIVITY']) {
    const obj = constObject(sf, name);
    if (obj === null) {
      out.push(`${REGISTRY_SOURCE} no longer declares ${name} as an object literal`);
      continue;
    }
    for (const p of obj.properties) {
      if (!ts.isPropertyAssignment(p) && !ts.isShorthandPropertyAssignment(p)) out.push(`${name} spreads or computes a field`);
      else if (P321_FIELDS.includes(propName(p))) out.push(`${name} lists \`${propName(p)}\``);
    }
  }
  const fn = tsNodes(sf).find((n) => ts.isFunctionDeclaration(n) && n.name?.text === 'activityProfileFor');
  if (fn === undefined || fn.body === undefined) return [...out, `${REGISTRY_SOURCE} no longer declares activityProfileFor`];
  // Its own parameters and locals are not reads of anything outside it.
  const locals = new Set(
    tsNodes(fn)
      .filter((n) => (ts.isParameter(n) || ts.isVariableDeclaration(n)) && ts.isIdentifier(n.name))
      .map((n) => n.name.text)
  );
  const reads = new Set(
    tsNodes(fn.body)
      .filter((n) => ts.isIdentifier(n))
      .filter((n) => !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n))
      .map((n) => n.text)
      .filter((t) => !locals.has(t))
  );
  const allowed = ['AGENT_REGISTRY', 'SHELL_ACTIVITY', 'DEFAULT_ACTIVITY'];
  const foreign = [...reads].filter((t) => !allowed.includes(t));
  if (!reads.has('AGENT_REGISTRY') || foreign.length > 0) {
    out.push(
      `activityProfileFor reads ${[...reads].join(', ') || 'nothing'}; it may read the compiled AGENT_REGISTRY and ` +
        'the two floor profiles and nothing else'
    );
  }
  return out;
}

/** 10.4 The rows driven through the shipping loader, each with what it must come back as. */
const P321_NEW_AGENT = {
  id: 'tortie-conf-p321',
  displayName: 'Tortie Conformance P321',
  binaries: ['tortie-conf-p321'],
  launch: { argv: ['tortie-conf-p321'] }
};
const P321_CASES = [
  { name: 'a new agent carrying activity.dialogs', expect: 'refused', field: 'activity',
    row: { ...P321_NEW_AGENT, activity: { dialogs: ['qwen-confirmation'] } } },
  { name: 'a new agent carrying a whole activity profile with every field', expect: 'refused', field: 'activity',
    row: { ...P321_NEW_AGENT, activity: { tier: 'screen', animatesWhenIdle: false, verified: 'verified', dialogs: ['qwen-confirmation'], writesWhileAsking: true, residentHelpers: true } } },
  { name: 'cursor patched with activity.dialogs naming a compiled shape', expect: 'refused', field: 'activity',
    row: { id: 'cursor', activity: { dialogs: ['qwen-confirmation'] } } },
  { name: 'claude patched with an empty activity.dialogs, turning its shape off', expect: 'refused', field: 'activity',
    row: { id: 'claude', activity: { dialogs: [] } } },
  { name: 'grok patched with activity.residentHelpers', expect: 'refused', field: 'activity',
    row: { id: 'grok', activity: { residentHelpers: true } } },
  { name: 'gemini given dialogs at the top of its row', expect: 'refused', field: 'dialogs',
    row: { id: 'gemini', dialogs: ['claude-trust-gate'] } },
  { name: 'control: the same new agent with no activity', expect: 'accepted', row: { ...P321_NEW_AGENT } },
  { name: 'control: cursor patched with a display name only', expect: 'accepted', row: { id: 'cursor', displayName: 'Cursor' } }
];

/** Judge the loader's answers: a refused row gone WHOLE with its field named, a control kept. */
function p321DrivenFindings(outcomes) {
  const out = [];
  if (!Array.isArray(outcomes) || outcomes.length !== P321_CASES.length) {
    return [`the loader answered ${Array.isArray(outcomes) ? String(outcomes.length) : 'nothing'} of ${String(P321_CASES.length)} cases`];
  }
  P321_CASES.forEach((c, i) => {
    const got = outcomes[i];
    const kept = Array.isArray(got?.rows) && got.rows.includes(c.row.id);
    const problems = Array.isArray(got?.problems) ? got.problems : [];
    if (c.expect === 'accepted') {
      if (!kept || problems.length > 0) out.push(`${c.name}: the control was not kept, so the refusals above prove nothing`);
      return;
    }
    if (kept) out.push(`${c.name}: the row was KEPT`);
    const named = problems.filter(
      (p) => p.index === 0 && p.field === `agents[0].${c.field}` && typeof p.message === 'string' && p.message.length > 0
    );
    if (named.length === 0) {
      out.push(`${c.name}: no problem names agents[0].${c.field} (${problems.map((p) => p.field).join(', ') || 'no problem at all'})`);
    }
  });
  return out;
}

/** The driven half: the shipping loader, fed on stdin by the pinned tsx, one parse per case. */
function p321Drive() {
  const script = [
    `import { parseAgentOverlay } from './${OVERLAY_LOADER}';`,
    `const cases = ${JSON.stringify(P321_CASES.map((c) => c.row))};`,
    'const out = cases.map((row) => {',
    '  const r = parseAgentOverlay(JSON.stringify({ schema: 2, agents: [row] }));',
    '  return { rows: r.rows.map((x) => x.id), problems: r.problems.map((p) => ({ index: p.index, field: p.field, message: p.message })) };',
    '});',
    'process.stdout.write(JSON.stringify(out));',
    ''
  ].join('\n');
  const run = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', '-'], {
    encoding: 'utf8',
    cwd: process.cwd(),
    input: script,
    timeout: 60_000
  });
  if (run.status !== 0) return { outcomes: null, why: `the loader run exited ${String(run.status)}: ${(run.stderr ?? '').slice(0, 300)}` };
  try {
    return { outcomes: JSON.parse(run.stdout), why: '' };
  } catch {
    return { outcomes: null, why: 'the loader run printed no JSON' };
  }
}

const p321Rows = [];
{
  const overlayText = sourceOf(OVERLAY_TYPES) ?? '';
  const loaderText = sourceOf(OVERLAY_LOADER) ?? '';
  const registryText = sourceOf(REGISTRY_SOURCE) ?? '';
  const driven = p321Drive();
  const judgeDriven = (outcomes) => (outcomes === null ? [driven.why] : p321DrivenFindings(outcomes));

  // Every attack is a copy of the input with one rule broken; null means it
  // could not be built over this tree, which is itself a finding.
  const inRow = (text, iface, member) => {
    const decl = tsNodes(tsParse(OVERLAY_TYPES, text)).find((n) => ts.isInterfaceDeclaration(n) && n.name.text === iface);
    return decl === undefined ? null : insertAt(text, decl.members.pos, `\n  ${member}`);
  };
  const inObject = (rel, text, name, entry) => {
    const obj = constObject(tsParse(rel, text), name);
    return obj === null ? null : insertAt(text, obj.getStart() + 1, `\n  ${entry}`);
  };
  const withoutActivity = (text) => {
    const obj = constObject(tsParse(OVERLAY_TYPES, text), 'REFUSED_ROW_FIELDS');
    const p = obj?.properties.find((x) => propName(x) === 'activity');
    return p === undefined ? null : `${text.slice(0, p.getStart())}${text.slice(p.getEnd() + (text[p.getEnd()] === ',' ? 1 : 0))}`;
  };
  const inRowKeys = (text) => {
    const d = tsNodes(tsParse(OVERLAY_LOADER, text)).find((n) => ts.isVariableDeclaration(n) && n.name.getText() === 'ROW_KEYS');
    const list = d === undefined ? undefined : tsPeel(d.initializer);
    return list === undefined || !ts.isArrayLiteralExpression(list) ? null : insertAt(text, list.getStart() + 1, "\n  'activity',");
  };
  const lookupWidened = (text) => {
    const fn = tsNodes(tsParse(REGISTRY_SOURCE, text)).find((n) => ts.isFunctionDeclaration(n) && n.name?.text === 'activityProfileFor');
    return fn?.body === undefined ? null : insertAt(text, fn.body.getStart() + 1, '\n  const configured = mergedOverlayRow(id)?.activity;\n  if (configured !== undefined) return configured;');
  };
  const cases = [
    {
      rule: '10.1',
      name: 'the overlay types name none of dialogs, residentHelpers, writesWhileAsking',
      findings: () => p321OverlayTypeFindings(overlayText),
      attacks: [
        ['AgentOverlayV1 given dialogs', () => inRow(overlayText, 'AgentOverlayV1', 'dialogs?: readonly string[];')],
        ['AgentOverlayV1 given activity', () => inRow(overlayText, 'AgentOverlayV1', 'activity?: unknown;')],
        ['the launch block given residentHelpers', () => inRow(overlayText, 'AgentOverlayLaunchV1', 'residentHelpers?: true;')],
        ['the resume block given writesWhileAsking', () => inRow(overlayText, 'AgentOverlayResumeV1', 'writesWhileAsking?: true;')],
        ['the registry type re-exported to the overlay', () => `import type { DialogShapeId } from '../main/activity/screen';\nexport type P321SelfTest = DialogShapeId;\n${overlayText}`]
      ].map(([n, build]) => [n, build, (t) => p321OverlayTypeFindings(t)])
    },
    {
      rule: '10.2',
      name: 'REFUSED_ROW_FIELDS.activity stands, and validateRow asks it',
      findings: () => p321RefusalFindings(overlayText, loaderText),
      attacks: [
        ['the activity refusal deleted', () => withoutActivity(overlayText), (t) => p321RefusalFindings(t, loaderText)],
        ['ROW_KEYS admitting activity', () => inRowKeys(loaderText), (t) => p321RefusalFindings(overlayText, t)]
      ]
    },
    {
      rule: '10.3',
      name: 'the floor profiles list none, and the lookup reads the compiled rows alone',
      findings: () => p321FloorFindings(registryText),
      attacks: [
        ['DEFAULT_ACTIVITY listing a shape', () => inObject(REGISTRY_SOURCE, registryText, 'DEFAULT_ACTIVITY', "dialogs: ['qwen-confirmation'],"), (t) => p321FloorFindings(t)],
        ['SHELL_ACTIVITY given the helper rule', () => inObject(REGISTRY_SOURCE, registryText, 'SHELL_ACTIVITY', 'residentHelpers: true,'), (t) => p321FloorFindings(t)],
        ['the lookup reading a configured row first', () => lookupWidened(registryText), (t) => p321FloorFindings(t)]
      ]
    },
    {
      rule: '10.4',
      name: 'the shipping loader drops a row carrying any of them, with the field named',
      findings: () => judgeDriven(driven.outcomes),
      attacks: [
        ['a refused row answered as kept', () => (driven.outcomes === null ? null : driven.outcomes.map((o, i) => (i === 2 ? { rows: ['cursor'], problems: [] } : o))), (o) => p321DrivenFindings(o)],
        ['a refusal naming the wrong field', () => (driven.outcomes === null ? null : driven.outcomes.map((o, i) => (i === 4 ? { rows: [], problems: [{ index: 0, field: 'agents[0].id', message: 'x' }] } : o))), (o) => p321DrivenFindings(o)],
        ['a control refused', () => (driven.outcomes === null ? null : driven.outcomes.map((o, i) => (i === 6 ? { rows: [], problems: [{ index: 0, field: 'agents[0].activity', message: 'x' }] } : o))), (o) => p321DrivenFindings(o)]
      ]
    }
  ];
  for (const c of cases) {
    const found = c.findings();
    let red = 0;
    const notes = [];
    for (const [attack, build, judge] of c.attacks) {
      const broken = build();
      if (broken === null || broken === undefined) {
        notes.push(`self-test "${attack}" could not be built`);
        continue;
      }
      if (judge(broken).length === 0) {
        notes.push(`self-test "${attack}" stayed GREEN with the rule broken`);
        continue;
      }
      red += 1;
    }
    for (const f of found) fail(`Phase 321 ${c.rule} (${c.name}): ${f}.`);
    for (const n of notes) fail(`Phase 321 ${c.rule} (${c.name}): ${n}, so the row has stopped asking.`);
    if (c.attacks.length === 0) fail(`Phase 321 ${c.rule}: the row carries no self-test.`);
    p321Rows.push({
      rule: c.rule,
      name: c.name,
      ok: found.length === 0 && notes.length === 0,
      note: `${String(red)} of ${String(c.attacks.length)} self-tests red`
    });
  }
  if (p321Rows.length !== 4) fail('Phase 321 asks four rows, 10.1 to 10.4, and this gate no longer does.');
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
if (pb !== null && pb.versionProbeCount === 0 && !pb.scanResolved) {
  process.stdout.write(
    'the version probe is unreachable from the create path: 0 probes ran and no scan started.\n'
  );
}

process.stdout.write('\nenv passthrough (Phase 33)\n');
process.stdout.write('-'.repeat(107) + '\n');
if (p33Rows.length === 0) {
  process.stdout.write(`  not checked: the section reported ${p33.state}.\n`);
} else {
  for (const row of p33Rows) {
    process.stdout.write(`${pad(row.name, 46)} ${pad(tick(row.ok), 4)} ${row.note}\n`);
  }
  process.stdout.write(
    `\nthe configured names are ${p33.names.join(' and ')}. The sentinel value is ` +
      `${p33.sentinel.length} bytes, it was found in the pane environment, and it was found in ` +
      'no byte of the manifest record.\n'
  );
}

process.stdout.write('\nthe settings route to a shell variable name (Phase 269)\n');
process.stdout.write('-'.repeat(107) + '\n');
if (p269Rows.length === 0) {
  process.stdout.write(`  not checked: the section reported ${p269.state}.\n`);
} else {
  for (const row of p269Rows) {
    process.stdout.write(`${pad(row.name, 60)} ${pad(tick(row.ok), 4)} ${row.note}\n`);
  }
  process.stdout.write(
    `\n${p269.denied.length} denylisted names were derived from the three exported arrays ` +
      'and every one of them was refused with a sentence. No value was read, resolved or ' +
      'printed at any point: this section spawns nothing.\n'
  );
}

process.stdout.write('\nthe shared list every agent reads (Phase 275)\n');
process.stdout.write('-'.repeat(107) + '\n');
if (p275Rows.length === 0) {
  process.stdout.write('  not checked: the probe printed no p275 section.\n');
} else {
  for (const row of p275Rows) {
    process.stdout.write(
      `${pad(row.rule, 6)} ${pad(row.name, 58)} ${pad(tick(row.ok), 4)} ${row.note}\n`
    );
  }
  const sealState = (p275?.seal ?? {}).state ?? 'absent';
  process.stdout.write(
    `\nthe seal section reported ${sealState}. The two refusals were driven against ` +
      'the shipping withSealedDangerState, which is pure: no keystore was opened, no ' +
      'Electron was started, no settings file was read and no value exists anywhere ' +
      'in this section — every name in it is invented in the probe.\n'
  );
}

process.stdout.write('\nthe activity fields no configuration can reach (Phase 321)\n');
process.stdout.write('-'.repeat(107) + '\n');
for (const row of p321Rows) {
  process.stdout.write(`${pad(row.rule, 6)} ${pad(row.name, 78)} ${pad(tick(row.ok), 4)} ${row.note}\n`);
}
process.stdout.write(
  `\n${String(P321_CASES.length)} rows went through the shipping parseAgentOverlay on the pinned tsx's stdin, ` +
    'one parse each; no file was written and no agent was started.\n'
);

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
