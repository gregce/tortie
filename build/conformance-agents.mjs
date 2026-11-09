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
 * SECTION 11 — the screen record and the inline switches (Phases 331 and 350).
 *   Codex is launched AND resumed with `-c tui.fullscreen_transcript=false`,
 *   Claude Code with `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1` in its compiled
 *   `launch.env`, and every launchable row carries a compiled screen record
 *   nothing in the app reads. Section 2 cannot see a switch go, because both
 *   of its sides move together, so five rows hold the registry's own exports:
 *   every launchable row declares one of four classes with a carriage only on
 *   a switch (11.1); an argv switch ends BOTH the launch argv and the resume
 *   template and each composition carries it once (11.2); an env switch is in
 *   `launch.env`, `compiledLaunchEnvKeys` and `sharedRefusedEnvKeys()` (11.3);
 *   `screen` is refused on the overlay, named by no overlay type, key list or
 *   schema, absent from `ConfigExecutionFields` and from what
 *   `executionFieldsOf` reads, the hash unmoved by it, and a row carrying it
 *   DRIVEN through the shipping loader is dropped with the refusal sentence
 *   (11.4); and exactly codex (argv), claude (env) and, since Phase 350, pi
 *   (argv, behind its floor) are switches (11.5). Phase 350 adds four rows for
 *   pi's token, which no row field carries: spelled once and named by its
 *   record and `fixedLaunchTokens` (11.6), every production composer call
 *   naming the floor and the token composed for pi alone (11.7), one floor rule
 *   (11.8), and the boot pass, restore's strip and the arming composer, driven
 *   over planted rows (11.9). Its ruled round (his ruling of 2026-11-02) adds a
 *   fifth: the token only for a pi inside pi's own package, one predicate
 *   (`insidePiPackage`) asked by the one floor reader every decision goes
 *   through (11.10). Its second ruled round adds a sixth: the file that runs,
 *   one resolver (`bareNameSpawnFile`) walking the pane's PATH from the
 *   session's own folder and one comparison by device and inode
 *   (`bareNameSpawnRuns`), a gate in that reader, and the create handing it
 *   the spawn of a pane started by pi's bare name, driven over a planted world
 *   (11.11). His rulings of 2026-11-03 and 2026-11-04 gave the walk two terms
 *   that read a folder holding a `#`, or ending in `;`, as unread; Phase 353
 *   holds the folder back at the create, so the pane starts in it, and 11.11
 *   now requires the guard to name neither term and the create to hand tmux the
 *   folder held back. Every row is asked again over in-memory copies with its
 *   rule broken, and `npm run ablation:p331` breaks the shipping source.
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
import { readdirSync, readFileSync } from 'node:fs';
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
// narrowed by a later round that "only adds one field". Phase 353 (S4) holds
// Phase 328's two compiled fields, `writesWithoutDrawing` and `terminalTools`,
// to the same four rows, each clause with its own self-test.
//
// Rows 10.1 to 10.3 read the source with the TypeScript parser (a module, not a
// process), so comments never satisfy or break them. Row 10.4 is DRIVEN: one
// short run of the pinned tsx feeds rows to the shipping `parseAgentOverlay` on
// its stdin and prints what came back. Every row is then asked again over
// in-memory copies with its rule broken, and each copy must read red.

const P321_FIELDS = ['dialogs', 'writesWhileAsking', 'residentHelpers'];
/**
 * PHASE 353 (build/p353/SPEC.md S4, for D328-2). The two compiled fields Phase 328 gives antigravity's row: output
 * that is not work, and a tool on a terminal of its own that is. Each decides a session's status exactly as
 * `dialogs` does, so refusal 5 holds them to the same rows: no overlay type or schema names them, `ROW_KEYS` admits
 * neither, neither floor profile lists them, and the shipping loader drops a row carrying either with its field named.
 */
const P328_FIELDS = ['writesWithoutDrawing', 'terminalTools'];
/** Every activity field the overlay may never carry, Phase 321's three and Phase 328's two. */
const OVERLAY_NEVER_FIELDS = [...P321_FIELDS, ...P328_FIELDS];
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
    for (const f of OVERLAY_NEVER_FIELDS) {
      if (members.includes(f)) out.push(`${decl.name.text} declares \`${f}\``);
    }
    if (decl === row && members.includes('activity')) out.push('AgentOverlayV1 declares `activity`');
  }
  const schema = constObject(sf, 'AGENT_OVERLAY_JSON_SCHEMA');
  if (schema !== null) {
    const keys = tsNodes(schema).filter((n) => ts.isPropertyAssignment(n)).map(propName);
    for (const f of [...OVERLAY_NEVER_FIELDS, 'activity']) {
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
    for (const f of [...OVERLAY_NEVER_FIELDS, 'activity']) {
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
      else if (OVERLAY_NEVER_FIELDS.includes(propName(p))) out.push(`${name} lists \`${propName(p)}\``);
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
  { name: 'control: cursor patched with a display name only', expect: 'accepted', row: { id: 'cursor', displayName: 'Cursor' } },
  // PHASE 353 (S4, for D328-2). Appended, so the self-tests below that name a case by its index read the same rows.
  { name: 'a new agent carrying activity.writesWithoutDrawing and activity.terminalTools', expect: 'refused', field: 'activity',
    row: { ...P321_NEW_AGENT, activity: { tier: 'screen', animatesWhenIdle: false, verified: 'partial', writesWithoutDrawing: true, terminalTools: true } } },
  { name: 'antigravity patched with activity.writesWithoutDrawing and activity.terminalTools', expect: 'refused', field: 'activity',
    row: { id: 'antigravity', activity: { writesWithoutDrawing: true, terminalTools: true } } },
  { name: 'cursor patched with activity.terminalTools', expect: 'refused', field: 'activity',
    row: { id: 'cursor', activity: { terminalTools: true } } },
  { name: 'antigravity given writesWithoutDrawing at the top of its row', expect: 'refused', field: 'writesWithoutDrawing',
    row: { id: 'antigravity', writesWithoutDrawing: true } },
  { name: 'control: antigravity patched with a display name only', expect: 'accepted', row: { id: 'antigravity', displayName: 'Antigravity' } }
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

/**
 * The row loop sections 10 and 11 share (extracted by Phase 331's integrator,
 * because the two sections carried the same twenty lines). Each case is
 * judged over the shipping data, then each of its in-memory attacks is built
 * and judged, and every attack must read RED or the row has stopped asking.
 * Every failure line is `Phase <phase> <rule> (<name>): …`, which is what
 * `ablation:p321` and `ablation:p331` match an owning row by, so the wording
 * is the two sections' own, byte for byte. Returns one table row per case.
 */
function judgeRuleCases(phase, cases, findingsOf = (c) => c.findings()) {
  const rows = [];
  for (const c of cases) {
    const found = findingsOf(c);
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
    for (const f of found) fail(`Phase ${phase} ${c.rule} (${c.name}): ${f}.`);
    for (const n of notes) fail(`Phase ${phase} ${c.rule} (${c.name}): ${n}, so the row has stopped asking.`);
    if (c.attacks.length === 0) fail(`Phase ${phase} ${c.rule}: the row carries no self-test.`);
    rows.push({
      rule: c.rule,
      name: c.name,
      ok: found.length === 0 && notes.length === 0,
      note: `${String(red)} of ${String(c.attacks.length)} self-tests red`
    });
  }
  return rows;
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
  const inRowKeys = (text, key = 'activity') => {
    const d = tsNodes(tsParse(OVERLAY_LOADER, text)).find((n) => ts.isVariableDeclaration(n) && n.name.getText() === 'ROW_KEYS');
    const list = d === undefined ? undefined : tsPeel(d.initializer);
    return list === undefined || !ts.isArrayLiteralExpression(list) ? null : insertAt(text, list.getStart() + 1, `\n  '${key}',`);
  };
  const lookupWidened = (text) => {
    const fn = tsNodes(tsParse(REGISTRY_SOURCE, text)).find((n) => ts.isFunctionDeclaration(n) && n.name?.text === 'activityProfileFor');
    return fn?.body === undefined ? null : insertAt(text, fn.body.getStart() + 1, '\n  const configured = mergedOverlayRow(id)?.activity;\n  if (configured !== undefined) return configured;');
  };
  const cases = [
    {
      rule: '10.1',
      name: 'the overlay types name none of dialogs, residentHelpers, writesWhileAsking, writesWithoutDrawing, terminalTools',
      findings: () => p321OverlayTypeFindings(overlayText),
      attacks: [
        ['AgentOverlayV1 given dialogs', () => inRow(overlayText, 'AgentOverlayV1', 'dialogs?: readonly string[];')],
        ['AgentOverlayV1 given activity', () => inRow(overlayText, 'AgentOverlayV1', 'activity?: unknown;')],
        ['the launch block given residentHelpers', () => inRow(overlayText, 'AgentOverlayLaunchV1', 'residentHelpers?: true;')],
        ['the resume block given writesWhileAsking', () => inRow(overlayText, 'AgentOverlayResumeV1', 'writesWhileAsking?: true;')],
        ['the registry type re-exported to the overlay', () => `import type { DialogShapeId } from '../main/activity/screen';\nexport type P321SelfTest = DialogShapeId;\n${overlayText}`],
        // PHASE 353 (S4): Phase 328's two names, each put on an overlay shape.
        ['AgentOverlayV1 given writesWithoutDrawing', () => inRow(overlayText, 'AgentOverlayV1', 'writesWithoutDrawing?: true;')],
        ['the launch block given terminalTools', () => inRow(overlayText, 'AgentOverlayLaunchV1', 'terminalTools?: true;')]
      ].map(([n, build]) => [n, build, (t) => p321OverlayTypeFindings(t)])
    },
    {
      rule: '10.2',
      name: 'REFUSED_ROW_FIELDS.activity stands, and validateRow asks it',
      findings: () => p321RefusalFindings(overlayText, loaderText),
      attacks: [
        ['the activity refusal deleted', () => withoutActivity(overlayText), (t) => p321RefusalFindings(t, loaderText)],
        ['ROW_KEYS admitting activity', () => inRowKeys(loaderText), (t) => p321RefusalFindings(overlayText, t)],
        // PHASE 353 (S4).
        ['ROW_KEYS admitting writesWithoutDrawing', () => inRowKeys(loaderText, 'writesWithoutDrawing'), (t) => p321RefusalFindings(overlayText, t)],
        ['ROW_KEYS admitting terminalTools', () => inRowKeys(loaderText, 'terminalTools'), (t) => p321RefusalFindings(overlayText, t)]
      ]
    },
    {
      rule: '10.3',
      name: 'the floor profiles list none, and the lookup reads the compiled rows alone',
      findings: () => p321FloorFindings(registryText),
      attacks: [
        ['DEFAULT_ACTIVITY listing a shape', () => inObject(REGISTRY_SOURCE, registryText, 'DEFAULT_ACTIVITY', "dialogs: ['qwen-confirmation'],"), (t) => p321FloorFindings(t)],
        ['SHELL_ACTIVITY given the helper rule', () => inObject(REGISTRY_SOURCE, registryText, 'SHELL_ACTIVITY', 'residentHelpers: true,'), (t) => p321FloorFindings(t)],
        ['the lookup reading a configured row first', () => lookupWidened(registryText), (t) => p321FloorFindings(t)],
        // PHASE 353 (S4): neither floor profile may carry Phase 328's fields.
        ['DEFAULT_ACTIVITY given writesWithoutDrawing', () => inObject(REGISTRY_SOURCE, registryText, 'DEFAULT_ACTIVITY', 'writesWithoutDrawing: true,'), (t) => p321FloorFindings(t)],
        ['SHELL_ACTIVITY given terminalTools', () => inObject(REGISTRY_SOURCE, registryText, 'SHELL_ACTIVITY', 'terminalTools: true,'), (t) => p321FloorFindings(t)]
      ]
    },
    {
      rule: '10.4',
      name: 'the shipping loader drops a row carrying any of them, with the field named',
      findings: () => judgeDriven(driven.outcomes),
      attacks: [
        ['a refused row answered as kept', () => (driven.outcomes === null ? null : driven.outcomes.map((o, i) => (i === 2 ? { rows: ['cursor'], problems: [] } : o))), (o) => p321DrivenFindings(o)],
        ['a refusal naming the wrong field', () => (driven.outcomes === null ? null : driven.outcomes.map((o, i) => (i === 4 ? { rows: [], problems: [{ index: 0, field: 'agents[0].id', message: 'x' }] } : o))), (o) => p321DrivenFindings(o)],
        ['a control refused', () => (driven.outcomes === null ? null : driven.outcomes.map((o, i) => (i === 6 ? { rows: [], problems: [{ index: 0, field: 'agents[0].activity', message: 'x' }] } : o))), (o) => p321DrivenFindings(o)],
        // PHASE 353 (S4): the rows carrying Phase 328's fields, cases 8 to 12.
        ['antigravity patched with both answered as kept', () => (driven.outcomes === null ? null : driven.outcomes.map((o, i) => (i === 9 ? { rows: ['antigravity'], problems: [] } : o))), (o) => p321DrivenFindings(o)],
        ['the top-level writesWithoutDrawing refusal naming the wrong field', () => (driven.outcomes === null ? null : driven.outcomes.map((o, i) => (i === 11 ? { rows: [], problems: [{ index: 0, field: 'agents[0].id', message: 'x' }] } : o))), (o) => p321DrivenFindings(o)],
        ['the antigravity control refused', () => (driven.outcomes === null ? null : driven.outcomes.map((o, i) => (i === 12 ? { rows: [], problems: [{ index: 0, field: 'agents[0].activity', message: 'x' }] } : o))), (o) => p321DrivenFindings(o)]
      ]
    }
  ];
  p321Rows.push(...judgeRuleCases('321', cases));
  if (p321Rows.length !== 4) fail('Phase 321 asks four rows, 10.1 to 10.4, and this gate no longer does.');
}

// ---------------------------------------------------------------------------
// Section 11 — the screen record and the two inline switches (Phase 331)
// ---------------------------------------------------------------------------
//
// build/p331/SPEC.md §2.9. Phase 331 compiles an inline switch for exactly two
// agents, from one constant each: Codex's `-c tui.fullscreen_transcript=false`
// on BOTH its launch argv and its resume template (research 133: `codex resume`
// restores no launch flag, and `resumeArgvFor` never reads `launch.argv`), and
// Claude Code's `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1` in its compiled
// `launch.env` (research 134), which Phase 275's rule then refuses on both
// passthrough lists. Every launchable row also carries a compiled screen record
// that nothing in the app reads and that configuration may never supply.
//
// Section 2 cannot see a switch go, because the registry and the parsed
// contract move together, and B's splice in research 133 §4.3 stayed green
// there. So these rows hold the registry's own exports to the switch itself.
// 11.1, 11.2, 11.3 and 11.5 judge what the probe read off the registry; 11.4
// also reads three source files with the TypeScript parser and judges five
// rows DRIVEN through the shipping `parseAgentOverlay`. Every row is asked
// again over in-memory copies with its rule broken, and each copy must read
// red. `npm run ablation:p331` breaks the SHIPPING source and requires the row
// that owns each clause to go red here BY NAME.

const P331_CLASSES = ['switch-to-inline', 'inline-already', 'fullscreen-with-mouse', 'unknown'];
const CONFIRM_SOURCE = 'src/main/config/confirm.ts';
const P331_SENTENCE_MIN = 12;
const p331Copy = (x) => (x === null || x === undefined ? x : JSON.parse(JSON.stringify(x)));
const p331Same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** How many times `seq` occurs in `argv` as a contiguous run. */
function p331Count(argv, seq) {
  if (!Array.isArray(argv) || !Array.isArray(seq) || seq.length === 0) return 0;
  let n = 0;
  for (let i = 0; i + seq.length <= argv.length; i += 1) {
    if (seq.every((t, k) => argv[i + k] === t)) n += 1;
  }
  return n;
}
const p331EndsWith = (argv, seq) =>
  Array.isArray(argv) && Array.isArray(seq) && seq.length > 0 && argv.length >= seq.length && p331Same(argv.slice(argv.length - seq.length), seq);
const p331Rows = (p) => (Array.isArray(p?.rows) ? p.rows : []);
const p331Switched = (p, carriage) =>
  p331Rows(p).filter((r) => r.launchable && r.screen?.class === 'switch-to-inline' && r.screen?.carriage === carriage);
/**
 * PHASE 350. An argv switch whose record names a `floor` is composed by the
 * two composers behind that floor, not carried by the row, so 11.2 does not
 * read it: rows 11.6 and 11.7 hold pi's token instead.
 */
const p331Floored = (r) => Object.prototype.hasOwnProperty.call(r?.screen ?? {}, 'floor');

/** 11.1 Every launchable row declares one of four classes, a carriage exactly on a switch, and the IDE rows none. */
function p331RecordFindings(p) {
  const rows = p331Rows(p);
  if (rows.length === 0) return ['the probe printed no compiled rows'];
  const out = [];
  for (const row of rows) {
    const s = row.screen;
    if (!row.launchable) {
      if (s !== null && s !== undefined) out.push(`${row.id} is capture-only and declares a screen record`);
      continue;
    }
    if (s === null || typeof s !== 'object' || Array.isArray(s)) {
      out.push(`${row.id} declares no screen record`);
      continue;
    }
    if (!P331_CLASSES.includes(s.class)) out.push(`${row.id}'s class is ${JSON.stringify(s.class)}, not one of the four`);
    if (typeof s.measured !== 'string' || s.measured.trim() === '') out.push(`${row.id}'s record says nothing about what was measured`);
    if (!Array.isArray(s.notes) || s.notes.some((n) => typeof n !== 'string' || n.trim() === '')) {
      out.push(`${row.id}'s record has no notes list of sentences`);
    }
    const carries = ['carriage', 'tokens', 'env'].filter((k) => Object.prototype.hasOwnProperty.call(s, k));
    if (s.class !== 'switch-to-inline') {
      if (carries.length > 0) out.push(`${row.id} is ${String(s.class)} and carries ${carries.join(', ')}, which only a switch-to-inline row has`);
      continue;
    }
    if (s.carriage === 'argv') {
      if (!Array.isArray(s.tokens) || s.tokens.length === 0 || s.tokens.some((t) => typeof t !== 'string' || t === '')) {
        out.push(`${row.id} carries its switch in the argv with no tokens`);
      }
      if (Object.prototype.hasOwnProperty.call(s, 'env')) out.push(`${row.id} carries its switch in the argv and names an env too`);
    } else if (s.carriage === 'env') {
      const env = s.env;
      if (env === null || typeof env !== 'object' || Array.isArray(env) || Object.keys(env).length === 0) {
        out.push(`${row.id} carries its switch in the env with no variable`);
      }
      if (Object.prototype.hasOwnProperty.call(s, 'tokens')) out.push(`${row.id} carries its switch in the env and names tokens too`);
    } else {
      out.push(`${row.id} is switch-to-inline with carriage ${JSON.stringify(s.carriage)}, not argv or env`);
    }
  }
  return out;
}

/**
 * 11.2 An argv switch ends BOTH launch.argv and resume.template, and each
 * composition carries it once. Since Phase 350 it reads the rows whose record
 * names no floor (Codex's); a floored switch (pi's) is in neither field by
 * design and is held by 11.6 and 11.7.
 */
function p331ArgvFindings(p) {
  const rows = p331Switched(p, 'argv').filter((r) => !p331Floored(r));
  if (rows.length === 0) return ['no switch-to-inline row without a floor carries its switch in the argv'];
  const out = [];
  for (const r of rows) {
    const t = Array.isArray(r.screen.tokens) ? r.screen.tokens : [];
    if (!p331EndsWith(r.launchArgv, t) || (r.launchArgv ?? []).length !== t.length + 1) {
      out.push(`${r.id}'s launch.argv ${JSON.stringify(r.launchArgv)} is not its binary followed by its tokens ${JSON.stringify(t)}`);
    }
    if (!p331EndsWith(r.resumeTemplate, t)) {
      out.push(`${r.id}'s resume.template ${JSON.stringify(r.resumeTemplate)} does not end with its tokens ${JSON.stringify(t)}, so a restore would come back without the switch`);
    }
    if (p331Count(r.resumeTemplate, t) !== 1) out.push(`${r.id}'s resume.template carries its tokens ${String(p331Count(r.resumeTemplate, t))} times`);
    const c = p?.composed?.[r.id];
    if (c === undefined || c === null) {
      out.push(`the probe composed no argv for ${r.id}`);
      continue;
    }
    const wantLaunch = [c.bin, ...t, p.own];
    const template = (r.resumeTemplate ?? []).map((x) => (x === p.slot ? p.id : x));
    const wantResume = r.resumeExtrasPosition === 'leading' ? [c.bin, p.own, ...template] : [c.bin, ...template, p.own];
    if (!p331Same(c.launch, wantLaunch)) out.push(`launchArgvFor(${r.id}) composed ${JSON.stringify(c.launch)}, not ${JSON.stringify(wantLaunch)}`);
    if (!p331Same(c.resume, wantResume)) out.push(`resumeArgvFor(${r.id}) composed ${JSON.stringify(c.resume)}, not ${JSON.stringify(wantResume)}`);
    for (const [what, argv] of [['launch', c.launch], ['resume', c.resume]]) {
      const n = p331Count(argv, t);
      if (n !== 1) out.push(`the composed ${what} for ${r.id} carries its tokens ${String(n)} times, not once`);
    }
  }
  return out;
}

/** 11.3 An env switch is in launch.env with its value, in compiledLaunchEnvKeys and in sharedRefusedEnvKeys(). */
function p331EnvFindings(p) {
  const rows = p331Switched(p, 'env');
  if (rows.length === 0) return ['no switch-to-inline row carries its switch in the env'];
  const out = [];
  const shared = Array.isArray(p?.sharedRefused) ? p.sharedRefused : null;
  if (shared === null) out.push(`sharedRefusedEnvKeys() could not be read (${String(p?.sharedWhy ?? 'no reason given')})`);
  for (const r of rows) {
    const env = r.screen.env !== null && typeof r.screen.env === 'object' ? r.screen.env : {};
    for (const [name, value] of Object.entries(env)) {
      const has = r.launchEnv !== null && typeof r.launchEnv === 'object' && Object.prototype.hasOwnProperty.call(r.launchEnv, name);
      if (!has) out.push(`${r.id}'s launch.env does not set ${name}`);
      else if (r.launchEnv[name] !== value) out.push(`${r.id}'s launch.env sets ${name} to ${JSON.stringify(r.launchEnv[name])}, and its record says ${JSON.stringify(value)}`);
      if (!(p?.compiledEnvKeys?.[r.id] ?? []).includes(name)) out.push(`compiledLaunchEnvKeys('${r.id}') does not answer ${name}, so Settings would admit it on ${r.id}'s own list`);
      if (shared !== null && !shared.includes(name)) out.push(`sharedRefusedEnvKeys() does not refuse ${name}, so Settings would admit it on the shared list`);
    }
  }
  return out;
}

/** The refusal sentence as the source spells it, or null. */
function p331RefusalEntry(overlayText) {
  const refused = constObject(tsParse(OVERLAY_TYPES, overlayText), 'REFUSED_ROW_FIELDS');
  if (refused === null) return { found: false, why: `${OVERLAY_TYPES} no longer declares REFUSED_ROW_FIELDS as an object literal` };
  const entry = refused.properties.find((x) => ts.isPropertyAssignment(x) && propName(x) === 'screen');
  const text = entry === undefined ? '' : entry.initializer.getText();
  if (entry === undefined || !/['"`]/.test(text) || text.length < P331_SENTENCE_MIN) {
    return { found: false, why: 'REFUSED_ROW_FIELDS no longer refuses `screen` with a sentence' };
  }
  return { found: true, why: '' };
}

/** The driven rows: three refused WHOLE with `agents[0].screen` and the refusal sentence, two controls kept. */
function p331DrivenFindings(cases, refusal) {
  if (!Array.isArray(cases)) return ['the shipping loader answered nothing'];
  const out = [];
  if (typeof refusal !== 'string' || refusal.length < P331_SENTENCE_MIN) out.push('the probe read no refusal sentence for `screen`');
  const ids = (want) => cases.filter((c) => c.expect === want).map((c) => c.id).sort();
  if (!p331Same(ids('refused'), ['claude', 'codex', 'tortie-conf-p331'])) {
    out.push(`the refused rows driven were ${ids('refused').join(', ') || 'none'}, not a new agent, codex and claude`);
  }
  if (!p331Same(ids('accepted'), ['codex', 'tortie-conf-p331'])) {
    out.push(`the controls driven were ${ids('accepted').join(', ') || 'none'}, not the new agent and codex`);
  }
  for (const c of cases) {
    const kept = Array.isArray(c.rows) && c.rows.includes(c.id);
    const problems = Array.isArray(c.problems) ? c.problems : [];
    if (c.expect === 'accepted') {
      if (!kept || problems.length > 0) out.push(`${c.name}: the control was not kept, so the refusals prove nothing`);
      continue;
    }
    if (kept) out.push(`${c.name}: the row was KEPT`);
    const named = problems.filter((q) => q.index === 0 && q.field === 'agents[0].screen' && q.message === refusal);
    if (named.length === 0) {
      out.push(
        `${c.name}: no problem names agents[0].screen with the refusal sentence ` +
          `(${problems.map((q) => `${q.field}: ${String(q.message).slice(0, 60)}`).join('; ') || 'no problem at all'})`
      );
    }
  }
  return out;
}

/**
 * 11.4 `screen` is refused on the overlay, named by no overlay type, no
 * ROW_KEYS and no schema, absent from the confirm hash's fields and from what
 * `executionFieldsOf` reads, the hash equal with and without it, and the
 * shipping loader drops a row carrying it with the refusal sentence.
 */
function p331OverlayFindings(src, p) {
  const out = [];
  const refusal = p331RefusalEntry(src.overlayText);
  if (!refusal.found) out.push(refusal.why);
  const overlay = tsParse(OVERLAY_TYPES, src.overlayText);
  for (const decl of tsNodes(overlay).filter(
    (n) => (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) && n.name.text.startsWith('AgentOverlay')
  )) {
    const members = tsNodes(decl).filter((n) => ts.isPropertySignature(n)).map(propName);
    if (members.includes('screen')) out.push(`${decl.name.text} declares \`screen\``);
  }
  const schema = constObject(overlay, 'AGENT_OVERLAY_JSON_SCHEMA');
  if (schema !== null && tsNodes(schema).filter((n) => ts.isPropertyAssignment(n)).map(propName).includes('screen')) {
    out.push('AGENT_OVERLAY_JSON_SCHEMA offers `screen`');
  }
  for (const name of ['AgentScreenRecord', 'AgentScreenClass']) {
    if (tsNodes(overlay).some((n) => ts.isIdentifier(n) && n.text === name)) out.push(`${OVERLAY_TYPES} names ${name}`);
  }
  const loader = tsParse(OVERLAY_LOADER, src.loaderText);
  const rowKeys = tsNodes(loader).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'ROW_KEYS');
  const list = rowKeys === undefined ? undefined : tsPeel(rowKeys.initializer);
  if (list === undefined || !ts.isArrayLiteralExpression(list)) out.push(`${OVERLAY_LOADER} no longer declares ROW_KEYS as a list`);
  else if (list.elements.some((e) => ts.isStringLiteral(e) && e.text === 'screen')) out.push('ROW_KEYS admits `screen`');
  const fields = tsNodes(loader).find((n) => ts.isFunctionDeclaration(n) && n.name?.text === 'executionFieldsOf');
  if (fields === undefined || fields.body === undefined) out.push(`${OVERLAY_LOADER} no longer declares executionFieldsOf`);
  else if (
    tsNodes(fields.body).some(
      (n) =>
        (ts.isPropertyAccessExpression(n) && n.name.text === 'screen') ||
        (ts.isElementAccessExpression(n) && ts.isStringLiteral(n.argumentExpression) && n.argumentExpression.text === 'screen') ||
        (ts.isBindingElement(n) && (n.propertyName ?? n.name).getText() === 'screen')
    )
  ) {
    out.push('executionFieldsOf reads `screen`, so the confirm hash would move with a display record');
  }
  const confirm = tsParse(CONFIRM_SOURCE, src.confirmText);
  const exec = tsNodes(confirm).find((n) => ts.isInterfaceDeclaration(n) && n.name.text === 'ConfigExecutionFields');
  if (exec === undefined) out.push(`${CONFIRM_SOURCE} no longer declares ConfigExecutionFields`);
  else if (exec.members.some((m) => propName(m) === 'screen')) {
    out.push('ConfigExecutionFields declares `screen`, which would move the hash of every confirmed row');
  }
  const empty = constObject(confirm, 'EMPTY_EXECUTION_FIELDS');
  if (empty !== null && empty.properties.some((x) => propName(x) === 'screen')) out.push('EMPTY_EXECUTION_FIELDS names `screen`');
  if (p?.emptyExecutionHasScreen === true) out.push('the shipping EMPTY_EXECUTION_FIELDS carries `screen`');
  if (p?.hashes === null || p?.hashes === undefined) {
    out.push(`the confirm hash could not be taken (${String(p?.overlayWhy ?? 'no reason given')})`);
  } else {
    for (const id of ['codex', 'claude']) {
      const h = p.hashes[id];
      if (h === null || h === undefined) {
        out.push(`the merge has no ${id} entry to hash`);
        continue;
      }
      if (h.mergedCarriesScreen !== true) out.push(`the merged ${id} entry carries no screen record, so the hash comparison proves nothing`);
      if (typeof h.withScreen !== 'string' || h.withScreen !== h.withoutScreen) {
        out.push(`the confirm hash of the merged ${id} entry moves when \`screen\` is deleted`);
      }
    }
  }
  out.push(...p331DrivenFindings(p?.cases ?? null, p?.refusal ?? null));
  return out;
}

/**
 * 11.5 Exactly three rows are switch-to-inline: codex in the argv, claude in
 * the env and, since Phase 350, pi in the argv behind its floor; pi's record
 * names the floor `0.84.0` and no other row names one.
 */
function p331ExactlyThreeFindings(p) {
  const sw = p331Rows(p)
    .filter((r) => r.screen?.class === 'switch-to-inline')
    .map((r) => `${r.id} (${String(r.screen.carriage)})`)
    .sort();
  const out = p331Same(sw, ['claude (env)', 'codex (argv)', 'pi (argv)'])
    ? []
    : [`the switch-to-inline rows are ${sw.join(', ') || 'none'}, not exactly codex (argv), claude (env) and pi (argv)`];
  const pi = p331Rows(p).find((r) => r.id === 'pi');
  if (pi?.screen?.floor !== '0.84.0') {
    out.push(`pi's record names the floor ${JSON.stringify(pi?.screen?.floor ?? null)}, not '0.84.0', so its switch would read as Codex's, in every pi`);
  }
  for (const r of p331Rows(p).filter((x) => x.id !== 'pi' && p331Floored(x))) {
    out.push(`${r.id}'s record names a floor (${JSON.stringify(r.screen.floor)}), and only pi's may`);
  }
  return out;
}

const p331Result = [];
const p331Data = data.p331 ?? null;
{
  const src = {
    overlayText: sourceOf(OVERLAY_TYPES) ?? '',
    loaderText: sourceOf(OVERLAY_LOADER) ?? '',
    confirmText: sourceOf(CONFIRM_SOURCE) ?? ''
  };
  /** A copy of the probe's block with one change, or null when it cannot be built over this tree. */
  const mut = (fn) => {
    if (p331Data === null) return null;
    const d = p331Copy(p331Data);
    return fn(d) === false ? null : d;
  };
  const rowOf = (d, id) => p331Rows(d).find((r) => r.id === id);
  const withRow = (id, fn) => mut((d) => {
    const r = rowOf(d, id);
    if (r === undefined || r.screen === null || r.screen === undefined) return false;
    return fn(r, d);
  });
  const inInterface = (text, iface, member) => {
    const decl = tsNodes(tsParse(CONFIRM_SOURCE, text)).find((n) => ts.isInterfaceDeclaration(n) && n.name.text === iface);
    return decl === undefined ? null : insertAt(text, decl.members.pos, `\n  ${member}`);
  };
  const withoutScreenRefusal = (text) => {
    const obj = constObject(tsParse(OVERLAY_TYPES, text), 'REFUSED_ROW_FIELDS');
    const e = obj?.properties.find((x) => propName(x) === 'screen');
    if (e === undefined) return null;
    const before = text.slice(0, e.getFullStart());
    // Also drop the comma that ended the entry before it, when this was the last.
    const after = text.slice(e.getEnd());
    return after.startsWith(',') ? `${before}${after.slice(1)}` : `${before.replace(/,\s*$/, '')}${after}`;
  };
  const screenInRowKeys = (text) => {
    const d = tsNodes(tsParse(OVERLAY_LOADER, text)).find((n) => ts.isVariableDeclaration(n) && n.name.getText() === 'ROW_KEYS');
    const list = d === undefined ? undefined : tsPeel(d.initializer);
    return list === undefined || !ts.isArrayLiteralExpression(list) ? null : insertAt(text, list.getStart() + 1, "\n  'screen',");
  };
  const fieldsReadScreen = (text) => {
    const fn = tsNodes(tsParse(OVERLAY_LOADER, text)).find((n) => ts.isFunctionDeclaration(n) && n.name?.text === 'executionFieldsOf');
    return fn?.body === undefined ? null : insertAt(text, fn.body.getStart() + 1, '\n  void (entry as { screen?: unknown }).screen;');
  };
  const onSource = (build) => () => {
    const t = build();
    return t === null ? null : { src: t, p: p331Data };
  };
  const judge4 = ({ src: s, p }) => p331OverlayFindings(s, p);
  const cases = [
    {
      rule: '11.1',
      name: 'every launchable row declares a screen class, a carriage only on a switch, the IDE pair none',
      findings: () => p331RecordFindings(p331Data),
      attacks: [
        ["pi's record deleted", () => withRow('pi', (r) => { r.screen = null; })],
        ["a class 'inline'", () => withRow('pi', (r) => { r.screen.class = 'inline'; })],
        // PHASE 350: pi is a switch now, so the attack is aimed at a row that is
        // still inline-already, whichever that is (cursor, gemini, muse, omp).
        ['a carriage on an inline-already row', () => mut((d) => {
          const r = p331Rows(d).find((x) => x.launchable && x.screen?.class === 'inline-already');
          if (r === undefined) return false;
          r.screen.carriage = 'argv';
          r.screen.tokens = ['--x-mode', 'inline'];
          return true;
        })],
        ['a capture-only row given a record', () => mut((d) => {
          const r = p331Rows(d).find((x) => !x.launchable);
          if (r === undefined) return false;
          r.screen = { class: 'unknown', measured: 'x', notes: [] };
          return true;
        })]
      ].map(([n, build]) => [n, build, (d) => p331RecordFindings(d)])
    },
    {
      rule: '11.2',
      name: 'an argv switch ends launch.argv and resume.template, once in each composition',
      findings: () => p331ArgvFindings(p331Data),
      attacks: [
        ['the tokens off the template', () => withRow('codex', (r) => { r.resumeTemplate = r.resumeTemplate.slice(0, r.resumeTemplate.length - (r.screen.tokens ?? []).length); })],
        ['the tokens off launch.argv', () => withRow('codex', (r) => { r.launchArgv = r.launchArgv.slice(0, r.launchArgv.length - (r.screen.tokens ?? []).length); })],
        ['the tokens twice in the composed resume', () => mut((d) => {
          const r = rowOf(d, 'codex');
          const c = d.composed?.codex;
          if (r?.screen === null || r?.screen === undefined || c === undefined) return false;
          c.resume = [...c.resume.slice(0, -1), ...(r.screen.tokens ?? []), ...c.resume.slice(-1)];
          return true;
        })]
      ].map(([n, build]) => [n, build, (d) => p331ArgvFindings(d)])
    },
    {
      rule: '11.3',
      name: 'an env switch is in launch.env, compiledLaunchEnvKeys and sharedRefusedEnvKeys()',
      findings: () => p331EnvFindings(p331Data),
      attacks: [
        ['the name off launch.env', () => withRow('claude', (r) => { for (const k of Object.keys(r.screen.env ?? {})) delete r.launchEnv[k]; })],
        ["the value '0'", () => withRow('claude', (r) => { for (const k of Object.keys(r.screen.env ?? {})) r.launchEnv[k] = '0'; })],
        ['the name off the shared refused set', () => mut((d) => {
          const r = rowOf(d, 'claude');
          if (r?.screen?.env === undefined || !Array.isArray(d.sharedRefused)) return false;
          const names = Object.keys(r.screen.env);
          d.sharedRefused = d.sharedRefused.filter((n) => !names.includes(n));
          return true;
        })]
      ].map(([n, build]) => [n, build, (d) => p331EnvFindings(d)])
    },
    {
      rule: '11.4',
      name: 'screen is refused on the overlay and never reaches the confirm hash',
      findings: () => p331OverlayFindings(src, p331Data),
      attacks: [
        ['the refusal deleted', onSource(() => { const t = withoutScreenRefusal(src.overlayText); return t === null ? null : { ...src, overlayText: t }; })],
        ["'screen' added to ROW_KEYS", onSource(() => { const t = screenInRowKeys(src.loaderText); return t === null ? null : { ...src, loaderText: t }; })],
        ['`screen?: unknown;` added to ConfigExecutionFields', onSource(() => { const t = inInterface(src.confirmText, 'ConfigExecutionFields', 'readonly screen?: unknown;'); return t === null ? null : { ...src, confirmText: t }; })],
        ['executionFieldsOf reading entry.screen', onSource(() => { const t = fieldsReadScreen(src.loaderText); return t === null ? null : { ...src, loaderText: t }; })],
        ['a refused row answered as kept', () => { const d = mut((x) => { if (!Array.isArray(x.cases) || x.cases[1] === undefined) return false; x.cases[1] = { ...x.cases[1], rows: [x.cases[1].id], problems: [] }; return true; }); return d === null ? null : { src, p: d }; }],
        ['a control answered as refused', () => { const d = mut((x) => { if (!Array.isArray(x.cases) || x.cases[3] === undefined) return false; x.cases[3] = { ...x.cases[3], rows: [], problems: [{ index: 0, field: 'agents[0].screen', message: x.refusal }] }; return true; }); return d === null ? null : { src, p: d }; }],
        ['unequal hashes', () => { const d = mut((x) => { if (x.hashes?.codex === null || x.hashes?.codex === undefined) return false; x.hashes.codex.withoutScreen = `${String(x.hashes.codex.withScreen)}0`; return true; }); return d === null ? null : { src, p: d }; }]
      ].map(([n, build]) => [n, build, judge4])
    },
    {
      rule: '11.5',
      name: 'exactly three rows are switch-to-inline: codex (argv), claude (env) and pi (argv, behind its floor)',
      findings: () => p331ExactlyThreeFindings(p331Data),
      attacks: [
        // PHASE 350: pi is the third, so the attack that a row joins is a fourth.
        ['a fourth (opencode) made a switch', () => withRow('opencode', (r) => { r.screen = { ...r.screen, class: 'switch-to-inline', carriage: 'argv', tokens: ['--x-mode', 'inline'] }; })],
        ["claude's carriage made argv", () => withRow('claude', (r) => { r.screen = { ...r.screen, carriage: 'argv' }; })],
        ["pi's floor removed", () => withRow('pi', (r) => { delete r.screen.floor; })],
        ['codex given a floor', () => withRow('codex', (r) => { r.screen.floor = '0.1.0'; })]
      ].map(([n, build]) => [n, build, (d) => p331ExactlyThreeFindings(d)])
    }
  ];
  p331Result.push(
    ...judgeRuleCases('331', cases, (c) => (p331Data === null ? ['the probe printed no p331 section'] : c.findings()))
  );
  if (p331Result.length !== 5) fail('Phase 331 asks five rows, 11.1 to 11.5, and this gate no longer does.');
}

// ---------------------------------------------------------------------------
// Section 11, rows 11.6 to 11.9 — pi's inline token behind its floor (Phase 350)
// ---------------------------------------------------------------------------
//
// build/p350/SPEC.md §7.1. pi's switch, `--tui-mode regular`, is the third
// inline switch and the first one the row does not carry: it is in neither
// pi's `launch.argv` nor its `resume.template`, because a pi before 0.84.0
// stops on the unknown flag after its trust question (research 134 §5). The two
// composers put it straight after argv[0] only when their caller says this
// Mac's scan reads pi at `PI_INLINE_FLOOR`, a boot pass brings recorded rows
// across once the scan first answers, and restore takes it back out of an armed
// command while the floor does not hold. Section 2 and rows 11.1 to 11.5 cannot
// see any of that go, because it lives in callers, so four rows hold it:
//
//   11.6 THE TOKEN, spelled once and carried by no row field;
//   11.7 THE FLOOR AT THE COMPOSERS, read with the TypeScript parser over every
//        production file under src/main and driven over every launchable row;
//   11.8 ONE FLOOR RULE, the SpecStory version reader's and no third copy;
//   11.9 THE ROWS AND THE ARMING, the boot pass DRIVEN at each reading over
//        planted rows and judged against this file's own reading of
//        build/p350/SPEC.md §4.2 step 3, restore's strip driven at `unread`, and
//        the arming composer's tokens.
//
// THE FIX ROUND (build/p350/SPEC.md §As built, "The fix round"). The floor is
// a fact about ONE file: the create, the harvest, the pass and restore's strip
// each ask it for the binary their own argv names (`piInlineFloorFor`), so a
// row recorded against a second pi install, or against a pi reinstalled since
// the scan, is never handed the token and loses Tortie's copy at restore. And
// the two words straight after the binary are Tortie's only when the row's own
// composition does not lead with them (`piTokenIsTortiesIn` over
// `piOwnResumeArgv`), so a person's own agents.json `--tui-mode regular` is
// never taken out. 11.7 reads the new reader by name; 11.9 drives two rows of
// a second install, a row with Tortie's copy before a person's own, a fourth
// pass run whose own composition leads with the words, and the strip over a
// planted table that does, and reads both readers on the pass's and the
// strip's own paths.
//
// The expectations below are this checker's own, written from the spec rather
// than read back from the code: the token is the literal pair, a row's own id
// is the literal `--session-id <id>`, and every verdict is computed here. Every
// row is asked again over in-memory copies with its rule broken, and each copy
// must read red; `npm run ablation:p331` breaks the SHIPPING source and
// requires the row that owns each clause to go red here BY NAME (`Phase 350
// 11.N (`).

const P350_TOKENS = ['--tui-mode', 'regular'];
const P350_FLOOR = '0.84.0';
const P350_CREATE = 'src/main/sessions/create-local.ts';
const P350_HARVEST = 'src/main/sessions/id-harvest.ts';
const P350_EXTRAS = 'src/main/restart/extras.ts';
const P350_RESTORE = 'src/main/restore/restore.ts';
const P350_ARM = 'src/main/machines/remote-arm.ts';
const P350_PASS = 'src/main/sessions/inline-repair.ts';
const P350_RESUME_IN_PLACE = 'src/main/sessions/resume-in-place.ts';
/** Every composer that takes the floor, and the file that declares it. */
const P350_COMPOSERS = {
  launchArgvFor: REGISTRY_SOURCE,
  resumeArgvFor: REGISTRY_SOURCE,
  registryLaunchArgv: REGISTRY_SOURCE,
  registryResumeArgv: REGISTRY_SOURCE,
  buildLaunchSpec: 'src/main/manifest/agents.ts',
  resolveLaunchSpec: 'src/main/manifest/agents.ts',
  composeResumeArgv: 'src/main/sessions/resume-argv.ts'
};
/** The files whose every composer call passes the literal `false` (D2, D20). */
const P350_FALSE_FILES = [
  'src/main/machines/remote-sessions.ts',
  'src/main/machines/remote-record.ts',
  'src/main/sessions/codex-repair.ts',
  P350_PASS
];
/** The files that must still call a composer, so a call that went is noticed. */
const P350_CALLING_FILES = [
  'src/main/machines/remote-sessions.ts',
  'src/main/machines/remote-record.ts',
  P350_EXTRAS,
  P350_CREATE,
  P350_HARVEST
];

/** Every production TypeScript file under `root`, relative, tests excluded. */
function p350ProductionFiles(root) {
  const out = [];
  const walk = (rel) => {
    let names = [];
    try {
      names = readdirSync(join(process.cwd(), rel), { withFileTypes: true });
    } catch {
      return;
    }
    for (const d of names) {
      const child = `${rel}/${d.name}`;
      if (d.isDirectory()) {
        if (d.name === '__tests__' || d.name === 'node_modules') continue;
        walk(child);
      } else if (/\.tsx?$/.test(d.name) && !/\.test\.tsx?$/.test(d.name) && !d.name.endsWith('.d.ts')) {
        out.push(child);
      }
    }
  };
  walk(root);
  return out.sort();
}

/** The texts the rows read, as a map a self-test can copy and break one file of. */
function p350Texts() {
  const texts = new Map();
  for (const root of ['src/main', 'src/shared', 'src/renderer', 'src/preload']) {
    for (const rel of p350ProductionFiles(root)) texts.set(rel, sourceOf(rel) ?? '');
  }
  return texts;
}
const p350With = (texts, rel, edit) => {
  const was = texts.get(rel);
  if (was === undefined) return null;
  const next = edit(was);
  if (next === null || next === was) return null;
  const copy = new Map(texts);
  copy.set(rel, next);
  return copy;
};
const p350Line = (sf, node) => sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
/**
 * One parse per distinct text of a file. Rows 11.6 and 11.7 read every
 * production file, and each self-test hands them the same texts but one, so a
 * copy reparses only the file its attack broke.
 */
const p350Parsed = new Map();
/** Every node of a parsed file, walked once per parse. */
const p350Nodes = new WeakMap();
function p350NodesOf(sf) {
  let nodes = p350Nodes.get(sf);
  if (nodes === undefined) {
    nodes = tsNodes(sf);
    p350Nodes.set(sf, nodes);
  }
  return nodes;
}
function p350Parse(rel, text) {
  let byText = p350Parsed.get(rel);
  if (byText === undefined) {
    byText = new Map();
    p350Parsed.set(rel, byText);
  }
  let sf = byText.get(text);
  if (sf === undefined) {
    sf = tsParse(rel, text);
    byText.set(text, sf);
  }
  return sf;
}
/** The function declaration `name` in a parsed file, or undefined. */
const p350Fn = (sf, name) => tsNodes(sf).find((n) => ts.isFunctionDeclaration(n) && n.name?.text === name);
/** The nodes of a function body that are not inside a nested function. */
function p350OwnNodes(body) {
  const out = [];
  const visit = (n) => {
    out.push(n);
    if (n !== body && (ts.isFunctionLike(n) || ts.isClassLike(n))) return;
    ts.forEachChild(n, visit);
  };
  visit(body);
  return out;
}
const p350IsLiteralArray = (node, want) => {
  const e = node === undefined ? undefined : tsPeel(node);
  return (
    e !== undefined &&
    ts.isArrayLiteralExpression(e) &&
    e.elements.length === want.length &&
    e.elements.every((el, i) => (want[i].ident !== undefined ? ts.isIdentifier(el) && el.text === want[i].ident : ts.isStringLiteral(el) && el.text === want[i]))
  );
};
/** A property's initializer inside an object literal, by name. */
const p350Prop = (obj, name) => {
  if (obj === undefined || !ts.isObjectLiteralExpression(obj)) return undefined;
  const p = obj.properties.find((x) => ts.isPropertyAssignment(x) && propName(x) === name);
  return p === undefined ? undefined : tsPeel(p.initializer);
};

/** 11.6 The token: spelled once, in no row field, named by the record and by `fixedLaunchTokens('pi')`. */
function p350TokenFindings(texts, p, rows) {
  const out = [];
  const decls = { PI_INLINE_ARGS: [], PI_INLINE_FLOOR: [] };
  const spellings = [];
  for (const [rel, text] of texts) {
    const sf = p350Parse(rel, text);
    for (const n of p350NodesOf(sf)) {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text in decls) decls[n.name.text].push({ rel, n });
      if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && n.text === P350_TOKENS[0]) spellings.push({ rel, n, sf });
    }
  }
  if (decls.PI_INLINE_ARGS.length !== 1 || decls.PI_INLINE_ARGS[0].rel !== REGISTRY_SOURCE) {
    out.push(`PI_INLINE_ARGS is declared ${String(decls.PI_INLINE_ARGS.length)} times (${decls.PI_INLINE_ARGS.map((d) => d.rel).join(', ') || 'nowhere'}), not once, in ${REGISTRY_SOURCE}`);
  } else if (!p350IsLiteralArray(decls.PI_INLINE_ARGS[0].n.initializer, P350_TOKENS)) {
    out.push(`PI_INLINE_ARGS is ${decls.PI_INLINE_ARGS[0].n.initializer?.getText() ?? 'nothing'}, not ${JSON.stringify(P350_TOKENS)}`);
  }
  if (decls.PI_INLINE_FLOOR.length !== 1 || decls.PI_INLINE_FLOOR[0].rel !== REGISTRY_SOURCE) {
    out.push(`PI_INLINE_FLOOR is declared ${String(decls.PI_INLINE_FLOOR.length)} times, not once, in ${REGISTRY_SOURCE}`);
  } else {
    const init = tsPeel(decls.PI_INLINE_FLOOR[0].n.initializer);
    if (init === undefined || !ts.isStringLiteral(init) || init.text !== P350_FLOOR) out.push(`PI_INLINE_FLOOR is ${init?.getText() ?? 'nothing'}, not '${P350_FLOOR}'`);
  }
  const home = decls.PI_INLINE_ARGS[0]?.n;
  for (const s of spellings) {
    const inside = home !== undefined && s.rel === REGISTRY_SOURCE && s.n.getStart() >= home.getStart() && s.n.getEnd() <= home.getEnd();
    if (!inside) out.push(`${s.rel}:${String(p350Line(s.sf, s.n))} spells '${P350_TOKENS[0]}' a second time, beside PI_INLINE_ARGS`);
  }
  // pi's own row, read with the parser: the token in neither field, the record naming both constants.
  const sf = p350Parse(REGISTRY_SOURCE, texts.get(REGISTRY_SOURCE) ?? '');
  const piRow = tsNodes(sf).find(
    (n) => ts.isObjectLiteralExpression(n) && n.properties.some((x) => ts.isPropertyAssignment(x) && propName(x) === 'id' && ts.isStringLiteral(x.initializer) && x.initializer.text === 'pi') && p350Prop(n, 'screen') !== undefined
  );
  if (piRow === undefined) {
    out.push(`${REGISTRY_SOURCE} holds no pi row with a screen record`);
  } else {
    if (!p350IsLiteralArray(p350Prop(p350Prop(piRow, 'launch'), 'argv'), ['pi'])) out.push(`pi's launch.argv is ${p350Prop(p350Prop(piRow, 'launch'), 'argv')?.getText() ?? 'missing'}, not ['pi']: the token would reach every pi`);
    if (!p350IsLiteralArray(p350Prop(p350Prop(piRow, 'resume'), 'template'), ['--session-id', { ident: 'SESSION_ID_SLOT' }])) out.push(`pi's resume.template is ${p350Prop(p350Prop(piRow, 'resume'), 'template')?.getText() ?? 'missing'}, not ['--session-id', SESSION_ID_SLOT]`);
    const screen = p350Prop(piRow, 'screen');
    const tokens = p350Prop(screen, 'tokens');
    const floor = p350Prop(screen, 'floor');
    if (tokens === undefined || !ts.isIdentifier(tokens) || tokens.text !== 'PI_INLINE_ARGS') out.push(`pi's record names its tokens as ${tokens?.getText() ?? 'nothing'}, not PI_INLINE_ARGS`);
    if (floor === undefined || !ts.isIdentifier(floor) || floor.text !== 'PI_INLINE_FLOOR') out.push(`pi's record names its floor as ${floor?.getText() ?? 'nothing'}, not PI_INLINE_FLOOR`);
  }
  // What the registry's own exports said, through the probe.
  if (p === null) return [...out, 'the probe printed no p350 section'];
  if (!p331Same(p.tokens, P350_TOKENS)) out.push(`PI_INLINE_ARGS reads ${JSON.stringify(p.tokens)} at run time`);
  if (p.floor !== P350_FLOOR) out.push(`PI_INLINE_FLOOR reads ${JSON.stringify(p.floor)} at run time`);
  if (!p331Same(p.fixed?.pi, P350_TOKENS)) out.push(`fixedLaunchTokens('pi') answers ${JSON.stringify(p.fixed?.pi ?? null)}, not the token, so a row recorded with it would hand it back as a person's flag`);
  const pi = rows.find((r) => r.id === 'pi');
  if (pi === undefined) out.push('the probe read no pi row');
  else {
    if (!p331Same(pi.launchArgv, ['pi'])) out.push(`pi's launch.argv reads ${JSON.stringify(pi.launchArgv)} at run time, not ['pi']`);
    if (!p331Same(pi.resumeTemplate, ['--session-id', '<sessionId>'])) out.push(`pi's resume.template reads ${JSON.stringify(pi.resumeTemplate)} at run time`);
    if (!p331Same(pi.screen?.tokens, P350_TOKENS)) out.push(`pi's record reads tokens ${JSON.stringify(pi.screen?.tokens ?? null)} at run time`);
  }
  for (const [id, fixed] of Object.entries(p.fixed ?? {})) {
    if (id !== 'pi' && p331Count(fixed, P350_TOKENS) > 0) out.push(`fixedLaunchTokens('${id}') names pi's token`);
  }
  return out;
}

/** The function-like node a call sits in, or undefined. */
function p350Enclosing(node) {
  let n = node.parent;
  while (n !== undefined && !ts.isFunctionLike(n)) n = n.parent;
  return n;
}

/** 11.7 Every production call of a composer passes the floor, and the right one. */
function p350CallFindings(texts) {
  const out = [];
  const index = {};
  for (const [name, rel] of Object.entries(P350_COMPOSERS)) {
    const decl = p350Fn(p350Parse(rel, texts.get(rel) ?? ''), name);
    if (decl === undefined) {
      out.push(`${rel} no longer declares ${name}`);
      continue;
    }
    const i = decl.parameters.findIndex((x) => ts.isIdentifier(x.name) && x.name.text === 'floorHolds');
    if (i < 0) {
      out.push(`${name} takes no floorHolds parameter`);
      continue;
    }
    if (decl.parameters[i].initializer?.kind !== ts.SyntaxKind.FalseKeyword) {
      out.push(`${name}'s floorHolds defaults to ${decl.parameters[i].initializer?.getText() ?? 'nothing'}, not false`);
    }
    index[name] = i;
  }
  const calls = {};
  for (const [rel, text] of texts) {
    if (!rel.startsWith('src/main/')) continue;
    const sf = p350Parse(rel, text);
    for (const call of p350NodesOf(sf).filter((n) => ts.isCallExpression(n))) {
      const callee = call.expression;
      const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : null;
      if (name === null || !Object.prototype.hasOwnProperty.call(P350_COMPOSERS, name) || index[name] === undefined) continue;
      calls[rel] = (calls[rel] ?? 0) + 1;
      const where = `${rel}:${String(p350Line(sf, call))}`;
      if (call.arguments.some((a) => ts.isSpreadElement(a))) {
        out.push(`${name} at ${where} spreads its arguments, so its floor cannot be read`);
        continue;
      }
      const arg = call.arguments[index[name]];
      if (arg === undefined) {
        out.push(`${name} at ${where} passes no floor, so it composes as the default says rather than as its caller decided`);
        continue;
      }
      const said = arg.getText().replace(/\s+/g, ' ');
      const isFalse = arg.kind === ts.SyntaxKind.FalseKeyword;
      const isTrue = arg.kind === ts.SyntaxKind.TrueKeyword;
      const host = p350Enclosing(call);
      const through = ts.isIdentifier(arg) && arg.text === 'floorHolds' && host !== undefined && host.parameters.some((x) => ts.isIdentifier(x.name) && x.name.text === 'floorHolds');
      const names = (fn) => tsNodes(arg).some((n) => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === fn);
      if (isTrue && rel !== P350_EXTRAS) out.push(`${name} at ${where} passes the literal true, which hands pi the token whatever this Mac's pi reads`);
      if (P350_FALSE_FILES.includes(rel)) {
        if (!isFalse) out.push(`${name} at ${where} passes ${said}; every composition in ${rel} is the literal false`);
      } else if (rel === P350_EXTRAS) {
        if (!isTrue) out.push(`${name} at ${where} passes ${said}; Restart composes the argv it compares with the floor answered true (D15)`);
      } else if (rel === P350_CREATE) {
        if (!names('piInlineFloorFor')) out.push(`${name} at ${where} passes ${said}, which does not ask piInlineFloorFor( of the binary the create runs`);
      } else if (rel === P350_HARVEST) {
        if (!names('piInlineFloorFor')) out.push(`${name} at ${where} passes ${said}, which does not ask piInlineFloorFor( of the binary its resume runs`);
      } else if (!(isFalse || through || names('piInlineFloor') || names('piInlineFloorFor'))) {
        out.push(`${name} at ${where} passes ${said}, which names no floor`);
      }
    }
  }
  for (const rel of P350_CALLING_FILES) {
    if ((calls[rel] ?? 0) === 0) out.push(`${rel} calls none of the composers, so the floor it must pass cannot be read`);
  }
  return out;
}

/** 11.7, driven: the token straight after argv[0] for pi alone, only with the floor held. */
function p350ComposedFindings(p) {
  if (p === null) return ['the probe printed no p350 section'];
  const out = [];
  const composed = p.composed ?? {};
  for (const need of ['pi', 'codex', 'claude']) if (composed[need] === undefined) out.push(`the probe composed nothing for ${need}`);
  for (const [id, c] of Object.entries(composed)) {
    for (const key of ['launch', 'resume', 'registryLaunch', 'registryResume', 'specArgv', 'specResume', 'composeResume']) {
      const held = c?.held?.[key] ?? null;
      const not = c?.notHeld?.[key] ?? null;
      if (id === 'pi') {
        if (!Array.isArray(not) || not.length === 0) {
          out.push(`pi's ${key} composed nothing with the floor not held`);
          continue;
        }
        const want = [not[0], ...P350_TOKENS, ...not.slice(1)];
        if (!p331Same(held, want)) out.push(`pi's ${key} with the floor held is ${JSON.stringify(held)}, not ${JSON.stringify(want)}`);
        if (p331Count(not, P350_TOKENS) !== 0) out.push(`pi's ${key} carries the token with the floor NOT held`);
      } else if (!p331Same(held, not)) {
        out.push(`${id}'s ${key} moves with pi's floor: ${JSON.stringify(not)} became ${JSON.stringify(held)}`);
      }
    }
    for (const key of ['launch', 'resume']) {
      if (!p331Same(c?.defaults?.[key], c?.notHeld?.[key])) out.push(`${id}'s ${key} with the floor omitted is not its ${key} with the floor false`);
    }
  }
  return out;
}

/**
 * 11.8 One floor rule: the SpecStory reader's, over the twelve readings, and no
 * other comparison. The fix round's three: a reading is the version ALONE, as
 * `pi -v` prints it (`22.11.0 node` and `pi 0.84.2` are unread), and a
 * prerelease of the floor itself is below it, as semver orders it.
 */
function p350FloorRuleFindings(registryText, p) {
  const out = [];
  const want = [
    [null, 'unread'], ['', 'unread'], ['garbage', 'unread'], ['0.83.9', 'below'], ['0.84.0', 'holds'],
    ['0.84.2', 'holds'], ['0.99.2', 'holds'], ['1.4.0', 'holds'], ['10.0.0', 'holds'],
    ['22.11.0 node', 'unread'], ['pi 0.84.2', 'unread'], ['0.84.0-rc.1', 'below']
  ];
  const got = Array.isArray(p?.readings) ? p.readings : [];
  for (const [version, reading] of want) {
    const r = got.find((x) => x.version === version);
    if (r === undefined) out.push(`piInlineFloor(${JSON.stringify(version)}) was not driven`);
    else if (r.reading !== reading) out.push(`piInlineFloor(${JSON.stringify(version)}) answers ${JSON.stringify(r.reading)}, not ${reading}`);
  }
  const sf = tsParse(REGISTRY_SOURCE, registryText);
  const imported = tsNodes(sf).filter(
    (n) => ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && n.moduleSpecifier.text === '@shared/specstory-status'
  );
  const names = imported.flatMap((d) => (d.importClause?.namedBindings !== undefined && ts.isNamedImports(d.importClause.namedBindings) ? d.importClause.namedBindings.elements.map((e) => e.name.text) : []));
  for (const fn of ['parseSpecStoryVersionOutput', 'compareSpecStoryVersions']) {
    if (!names.includes(fn)) out.push(`${REGISTRY_SOURCE} does not import ${fn} from @shared/specstory-status`);
  }
  const fn = p350Fn(sf, 'piInlineFloor');
  if (fn?.body === undefined) return [...out, `${REGISTRY_SOURCE} no longer declares piInlineFloor`];
  const nodes = tsNodes(fn.body);
  const called = new Set(nodes.filter((n) => ts.isCallExpression(n)).map((n) => n.expression.getText()));
  for (const need of ['parseSpecStoryVersionOutput', 'compareSpecStoryVersions']) if (!called.has(need)) out.push(`piInlineFloor does not call ${need}`);
  const foreign = [...called].filter((c) => c !== 'parseSpecStoryVersionOutput' && c !== 'compareSpecStoryVersions');
  if (foreign.length > 0) out.push(`piInlineFloor also calls ${foreign.join(', ')}, a comparison of its own`);
  if (nodes.some((n) => n.kind === ts.SyntaxKind.RegularExpressionLiteral)) out.push('piInlineFloor carries a regular expression of its own');
  const RELATIONAL = [ts.SyntaxKind.LessThanToken, ts.SyntaxKind.GreaterThanToken, ts.SyntaxKind.LessThanEqualsToken, ts.SyntaxKind.GreaterThanEqualsToken];
  for (const b of nodes.filter((n) => ts.isBinaryExpression(n) && RELATIONAL.includes(n.operatorToken.kind))) {
    const left = tsPeel(b.left);
    const isCompare = ts.isCallExpression(left) && left.expression.getText() === 'compareSpecStoryVersions';
    if (!isCompare || !(ts.isNumericLiteral(b.right) && b.right.text === '0')) out.push(`piInlineFloor compares ${b.getText()}, not the shared rule's answer against 0`);
  }
  return out;
}

/** TRUE when `argv` holds the literal pair starting at `at`. */
const p350PairAt = (argv, at) => argv[at] === P350_TOKENS[0] && argv[at + 1] === P350_TOKENS[1];

/**
 * Whether the pair straight after the binary is TORTIE's copy (the fix round):
 * the composers put Tortie's first, so it is Tortie's unless the row's own
 * composition leads with the same pair, and then only when a second follows.
 */
const p350Torties = (argv, ownLeads) => p350PairAt(argv, 1) && (!ownLeads || p350PairAt(argv, 3));

/**
 * The pass's answer for one planted row at one reading, written from
 * build/p350/SPEC.md §4.2 step 3 in its own order, and from nothing in the
 * code: null when the arm must not read the row at all. The fix round: the
 * reading is the reader's for the row's OWN binary, `unread` for every binary
 * but the one the probe's reader holds, and below the floor only Tortie's copy
 * comes out.
 */
function p350PassWant(row, reading, local, readerBinary, ownLeads) {
  if (row.agent !== 'pi' || (row.machineId ?? local) !== local) return null;
  const id = row.agentSessionId ?? '';
  if (id === '') return { verdict: 'no-id' };
  const recorded = Array.isArray(row.resumeArgv) ? row.resumeArgv : [];
  if (recorded.length === 0) return { verdict: 'no-resume-argv' };
  if (row.wrapped === true) return { verdict: 'unreadable' };
  const floor = recorded[0] === readerBinary ? reading : 'unread';
  if (floor === 'unread') return { verdict: 'no-floor' };
  let own = false;
  for (let i = 1; i + 1 < recorded.length; i += 1) if (recorded[i] === '--session-id' && recorded[i + 1] === id) own = true;
  if (!own) return { verdict: 'recorded-differs' };
  if (floor === 'holds') return p350PairAt(recorded, 1) ? { verdict: 'already-right' } : { verdict: 'rewritten', argv: [recorded[0], ...P350_TOKENS, ...recorded.slice(1)] };
  return p350Torties(recorded, ownLeads) ? { verdict: 'rewritten', argv: [recorded[0], ...recorded.slice(3)] } : { verdict: 'already-right' };
}

/** 11.9, driven: the pass at each reading and the strip at `unread`, each row byte for byte. */
function p350DrivenRowFindings(p) {
  if (p === null) return ['the probe printed no p350 section'];
  const out = [];
  const planted = Array.isArray(p.planted) ? p.planted : [];
  if (planted.length < 12) out.push(`the probe planted ${String(planted.length)} rows, fewer than M2's set`);
  if (p.pass === null || p.pass === undefined) return [...out, `the pass was not driven (${String(p.passWhy ?? 'no reason given')})`];
  const local = p.local;
  const readerBinary = p.readerBinary;
  if (typeof readerBinary !== 'string' || readerBinary === '') out.push('the probe names no binary its reader holds a reading for');
  // The fix round's rows, so the two regressions it fixed are driven every run.
  const second = planted.filter((r) => r.agent === 'pi' && Array.isArray(r.resumeArgv) && r.resumeArgv[0] !== readerBinary && (r.machineId ?? local) === local && r.wrapped !== true);
  if (second.length < 2) out.push(`the probe planted ${String(second.length)} row(s) of a second pi install on this Mac, fewer than two`);
  if (!planted.some((r) => r.agent === 'pi' && Array.isArray(r.resumeArgv) && p350PairAt(r.resumeArgv, 1) && p350PairAt(r.resumeArgv, 3))) out.push("the probe planted no row with Tortie's copy before a person's own");
  // Each run: its name, the reading for the reader's binary, and whether the row's own composition leads.
  const RUNS = [['holds', 'holds', false], ['below', 'below', false], ['unread', 'unread', false], ['below-own', 'below', true]];
  for (const [name, reading, ownLeads] of RUNS) {
    const run = p.pass[name];
    if (run === undefined) {
      out.push(`the pass was not driven at ${name}`);
      continue;
    }
    const outcomes = Array.isArray(run.outcomes) ? run.outcomes : [];
    const writes = Array.isArray(run.writes) ? run.writes : [];
    const wantWrites = [];
    for (const row of planted) {
      const want = p350PassWant(row, reading, local, readerBinary, ownLeads);
      const got = outcomes.filter((o) => o.sessionId === row.id);
      if (want === null) {
        if (got.length > 0) out.push(`at ${name} the pass read ${row.id} (${row.agent}${row.machineId === undefined ? '' : ` on ${row.machineId}`}), which it must never read`);
        continue;
      }
      if (got.length !== 1) {
        out.push(`at ${name} the pass answered ${String(got.length)} outcomes for ${row.id}, not one`);
        continue;
      }
      if (got[0].verdict !== want.verdict) out.push(`at ${name} ${row.id} reads ${String(got[0].verdict)}, not ${want.verdict}`);
      if (got[0].arm !== 'pi') out.push(`at ${name} ${row.id} was judged under the ${String(got[0].arm)} arm`);
      if (want.argv !== undefined) wantWrites.push({ id: row.id, argv: want.argv });
    }
    for (const w of wantWrites) {
      const made = writes.filter((x) => x.id === w.id);
      if (made.length !== 1) out.push(`at ${name} ${w.id} was written ${String(made.length)} times, not once`);
      else if (!p331Same(made[0].argv, w.argv)) out.push(`at ${name} ${w.id} was written ${JSON.stringify(made[0].argv)}, not ${JSON.stringify(w.argv)}`);
    }
    for (const x of writes) {
      if (!wantWrites.some((w) => w.id === x.id)) out.push(`at ${name} the pass wrote ${x.id}, which it must leave byte identical`);
    }
    if ((run.envWrites ?? []).length > 0) out.push(`at ${name} the pass wrote the env column of ${(run.envWrites ?? []).map((x) => x.id).join(', ')}`);
    if (reading === 'unread' && writes.length > 0) out.push('an unread version moved a row (D13)');
    const lines = Array.isArray(run.lines) ? run.lines : [];
    if (lines.length === 0) out.push(`at ${name} the pass said nothing, though it read pi rows`);
    for (const line of lines) {
      for (const word of [...P350_TOKENS, '--session-id', p.id, '--model', ...new Set(planted.map((r) => (Array.isArray(r.resumeArgv) ? r.resumeArgv[0] : r.argv?.[0])).filter((b) => typeof b === 'string'))]) {
        if (line.includes(word)) out.push(`at ${name} a line names ${JSON.stringify(word)}: ${line.slice(0, 120)}`);
      }
    }
  }
  // Restore's strip, at the one reading this probe can have.
  if (p.floorNowBefore !== 'unread' || p.floorNowAfter !== 'unread') out.push(`piInlineFloorFor() read ${String(p.floorNowBefore)} and ${String(p.floorNowAfter)} in a process that started no scan, not unread`);
  // The fix round: over the compiled table, and over a table whose pi
  // template leads with the pair, where a person's own copy is theirs.
  for (const [key, ownLeads, what] of [['strip', false, ''], ['stripOwn', true, ' with a template that leads with the pair']]) {
    if (!Array.isArray(p[key])) {
      out.push(`restore's strip${what} was not driven (${String(p.stripWhy ?? 'no reason given')})`);
      continue;
    }
    for (const row of planted.filter((r) => Array.isArray(r.resumeArgv))) {
      const got = p[key].find((s) => s.id === row.id);
      const argv = row.resumeArgv;
      const strips = row.agent === 'pi' && (row.machineId ?? local) === local && p350Torties(argv, ownLeads);
      const want = strips ? [argv[0], ...argv.slice(3)] : argv;
      if (got === undefined) out.push(`the strip${what} was not asked for ${row.id}`);
      else if (!p331Same(got.argv, want)) out.push(`before the scan answers${what}, ${row.id} arms ${JSON.stringify(got.argv)}, not ${JSON.stringify(want)}`);
    }
  }
  if (p.armed === null || p.armed === undefined) out.push(`armedResumeTokens was not read (${String(p.armedWhy ?? 'no reason given')})`);
  else {
    for (const t of [...P350_TOKENS, '--session-id']) if (!(p.armed.pi ?? []).includes(t)) out.push(`armedResumeTokens('pi') does not admit ${t}, so resume in place would refuse a pi row this build records (D16)`);
    for (const t of P350_TOKENS) for (const a of ['codex', 'claude']) if ((p.armed[a] ?? []).includes(t)) out.push(`armedResumeTokens('${a}') admits pi's ${t}`);
  }
  return out;
}

/** 11.9, read: one column written, the strip on armableResume's one way out, Rule 1 naming the fixed tokens. */
function p350ArmingSourceFindings(texts) {
  const out = [];
  const pass = tsParse(P350_PASS, texts.get(P350_PASS) ?? '');
  for (const name of ['repairPiInline', 'piPass', 'piArm']) {
    const fn = p350Fn(pass, name);
    if (fn?.body === undefined) {
      out.push(`${P350_PASS} no longer declares ${name}`);
      continue;
    }
    const used = new Set(
      tsNodes(fn.body)
        .filter((n) => ts.isPropertyAccessExpression(n) && ts.isIdentifier(tsPeel(n.expression)) && tsPeel(n.expression).text === 'manifest')
        .map((n) => n.name.text)
    );
    const foreign = [...used].filter((m) => m !== 'listSessions' && m !== 'setResumeArgvColumn');
    if (foreign.length > 0) out.push(`${name} reaches manifest.${foreign.join(', manifest.')}, and the pi arm writes resume_argv alone`);
  }
  if (!tsNodes(p350Fn(pass, 'piArm') ?? pass).some((n) => ts.isPropertyAccessExpression(n) && n.name.text === 'setResumeArgvColumn')) {
    out.push('piArm writes no resume_argv at all');
  }
  // THE FIX ROUND: the floor of the row's OWN binary, and only Tortie's copy taken out.
  {
    const arm = p350Fn(pass, 'piArm');
    const nodes = arm?.body === undefined ? [] : tsNodes(arm.body);
    const floorCalls = nodes.filter((n) => ts.isCallExpression(n) && n.expression.getText() === 'readers.floorFor');
    if (floorCalls.length !== 1 || !/^recorded\[0\]/.test(floorCalls[0].arguments[0]?.getText() ?? '')) {
      out.push(`piArm asks readers.floorFor( ${String(floorCalls.length)} time(s)${floorCalls.length === 1 ? ` of ${floorCalls[0].arguments[0]?.getText() ?? 'nothing'}` : ''}; once, of the binary the row records (recorded[0]), so a second pi install's row is never judged by the scanned one's version`);
    }
    const torties = nodes.filter((n) => ts.isCallExpression(n) && n.expression.getText() === 'piTokenIsTortiesIn');
    if (torties.length !== 1 || !tsNodes(torties[0]).some((n) => ts.isCallExpression(n) && n.expression.getText() === 'readers.ownResume')) {
      out.push("piArm does not take the token out below the floor through piTokenIsTortiesIn( over readers.ownResume(, so a person's own leading --tui-mode would be taken out as Tortie's");
    }
  }
  const restore = tsParse(P350_RESTORE, texts.get(P350_RESTORE) ?? '');
  const arm = p350Fn(restore, 'armableResume');
  if (arm?.body === undefined) out.push(`${P350_RESTORE} no longer declares armableResume`);
  else {
    const own = p350OwnNodes(arm.body);
    const strips = own.filter((n) => ts.isCallExpression(n) && n.expression.getText() === 'withoutPiTokenBelowFloor');
    if (strips.length !== 1) out.push(`armableResume calls withoutPiTokenBelowFloor ${String(strips.length)} times, not once on its way out`);
    const bound = strips
      .map((c) => c.parent)
      .filter((v) => v !== undefined && ts.isVariableDeclaration(v) && ts.isIdentifier(v.name))
      .map((v) => v.name.text);
    for (const ret of own.filter((n) => ts.isReturnStatement(n))) {
      const e = ret.expression;
      const passes = e !== undefined && tsNodes(e).some((n) => (ts.isIdentifier(n) && bound.includes(n.text)) || (ts.isCallExpression(n) && n.expression.getText() === 'withoutPiTokenBelowFloor'));
      if (!passes) out.push(`armableResume returns ${e?.getText().slice(0, 60) ?? 'nothing'} without the strip`);
    }
  }
  const strip = p350Fn(restore, 'withoutPiTokenBelowFloor');
  if (strip?.body === undefined) out.push(`${P350_RESTORE} no longer declares withoutPiTokenBelowFloor`);
  else {
    const nodes = tsNodes(strip.body);
    // THE FIX ROUND: the floor of the binary the armed argv runs, argv[0].
    const asksHolds = nodes.some(
      (n) =>
        ts.isBinaryExpression(n) &&
        [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(n.operatorToken.kind) &&
        ts.isCallExpression(tsPeel(n.left)) &&
        tsPeel(n.left).expression.getText() === 'piInlineFloorFor' &&
        tsPeel(n.left).arguments[0]?.getText() === 'argv[0]' &&
        ts.isStringLiteral(n.right) &&
        n.right.text === 'holds'
    );
    if (!asksHolds) out.push("withoutPiTokenBelowFloor does not ask piInlineFloorFor(argv[0]) against 'holds'");
    const torties = nodes.filter((n) => ts.isCallExpression(n) && n.expression.getText() === 'piTokenIsTortiesIn');
    if (torties.length !== 1 || !tsNodes(torties[0]).some((n) => ts.isCallExpression(n) && n.expression.getText() === 'piOwnResumeArgv')) {
      out.push("withoutPiTokenBelowFloor does not ask piTokenIsTortiesIn( over piOwnResumeArgv(, so a person's own leading --tui-mode would be taken out as Tortie's");
    }
    for (const ident of ['PI_INLINE_ARGS', 'LOCAL_MACHINE_ID']) {
      if (!nodes.some((n) => ts.isIdentifier(n) && n.text === ident)) out.push(`withoutPiTokenBelowFloor does not read ${ident}`);
    }
  }
  const inPlace = tsParse(P350_RESUME_IN_PLACE, texts.get(P350_RESUME_IN_PLACE) ?? '');
  if (!tsNodes(inPlace).some((n) => ts.isCallExpression(n) && n.expression.getText() === 'armableResume')) {
    out.push(`${P350_RESUME_IN_PLACE} no longer arms through armableResume, so it would skip the strip`);
  }
  const armed = p350Fn(tsParse(P350_ARM, texts.get(P350_ARM) ?? ''), 'armedResumeTokens');
  if (armed?.body === undefined) out.push(`${P350_ARM} no longer declares armedResumeTokens`);
  else if (!tsNodes(armed.body).some((n) => ts.isCallExpression(n) && n.expression.getText() === 'fixedLaunchTokens')) {
    out.push('armedResumeTokens does not read fixedLaunchTokens(, so resume in place would refuse a pi row recorded at the floor (D16)');
  }
  return out;
}

// ---------------------------------------------------------------------------
// Row 11.10 — ONLY PI'S OWN PACKAGE (his ruling of 2026-11-02, R1)
// ---------------------------------------------------------------------------
//
// The reverify found the one case worse than today: a pi reached through a
// version manager's shim (mise, asdf, volta) resolves to the manager's own
// dispatcher, ONE file that picks pi's version by the folder it runs in, so the
// scan's global reading handed `--tui-mode regular` to a project pinned below
// 0.84.0 and pi stopped after its trust question at every launch. His ruling:
// the token only when pi's real file sits inside pi's OWN installed package, the
// package.json above it naming pi's package, and anything else reads `unread`.
// This row holds that by its shape, read with the TypeScript parser over every
// production file: the package name declared once, in the registry, as this
// checker's own literal (the name pi 0.84.2's package.json carries, read as text
// on 2026-11-02) and the one the install map's npm route installs; ONE
// predicate, `insidePiPackage`, in detection.ts, that reads files and starts no
// process or scan; its ONE caller, `piInlineFloorFor`, which answers `unread`
// before anything else when it is false; `piInlineFloor(`, the version-only
// rule, asked nowhere else; and every place the token is decided asking
// `piInlineFloorFor(` (the create, the harvest and the admission, restore's
// strip, which resume in place arms through, and the boot pass's readers, which
// the core hands it). Restart's replacement is a create; its shapes compose with
// `true` to RECOGNISE the token, which 11.7 holds. What each shape of install
// answers is DRIVEN by p350-pi-package.test.ts, which `ablation:p331` P33 to P35
// tie to this row.

const P350_DETECTION = 'src/main/agents/detection.ts';
const P350_CORE = 'src/main/sessions/core.ts';
/** pi's own package name, this checker's own literal: the `name` pi 0.84.2's own package.json reads. */
const P350_PACKAGE = '@earendil-works/pi-coding-agent';
/** The places pi's token is decided, each of which must ask `piInlineFloorFor(` (R1). */
const P350_FLOOR_ASKERS = [P350_CREATE, P350_HARVEST, P350_RESTORE, P350_CORE];
/** Calls that start a process or a scan; the package predicate may make none of them. */
const P350_STARTERS = new Set([
  'spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork', 'runGuarded', 'runVersionProbe',
  'execProbe', 'scanAgents', 'listDetectedAgents', 'rescanAgents', 'warmDetectionAtBoot', 'warmDetectionForLocalPi'
]);

/** TRUE when `node` sits inside an import or an export declaration. */
function p350InImportOrExport(node) {
  for (let n = node.parent; n !== undefined; n = n.parent) {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return true;
  }
  return false;
}

/** The statement a `return` answers with the string literal `word`, alone or as a block's one statement. */
const p350ReturnsWord = (stmt, word) => {
  const s = stmt !== undefined && ts.isBlock(stmt) && stmt.statements.length === 1 ? stmt.statements[0] : stmt;
  return s !== undefined && ts.isReturnStatement(s) && s.expression !== undefined && ts.isStringLiteral(tsPeel(s.expression)) && tsPeel(s.expression).text === word;
};

/** 11.10 Only pi's own package: one constant, one predicate, one gate, and every decision through it. */
function p350PackageFindings(texts) {
  const out = [];
  const decls = [];
  const preds = [];
  const predCalls = [];
  const ruleCalls = [];
  const asks = new Map();
  for (const [rel, text] of texts) {
    const sf = p350Parse(rel, text);
    for (const n of p350NodesOf(sf)) {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'PI_PACKAGE_NAME') decls.push({ rel, n });
      if (ts.isFunctionDeclaration(n) && n.name?.text === 'insidePiPackage') preds.push({ rel, n });
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'insidePiPackage') predCalls.push({ rel, n, sf });
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'piInlineFloor') ruleCalls.push({ rel, n, sf });
      if (ts.isIdentifier(n) && n.text === 'piInlineFloorFor' && !p350InImportOrExport(n) && !(ts.isFunctionDeclaration(n.parent) && n.parent.name === n)) {
        asks.set(rel, (asks.get(rel) ?? 0) + 1);
      }
    }
  }
  // The constant, and the install map that names the same package.
  if (decls.length !== 1 || decls[0].rel !== REGISTRY_SOURCE) {
    out.push(`PI_PACKAGE_NAME is declared ${String(decls.length)} times (${decls.map((d) => d.rel).join(', ') || 'nowhere'}), not once, in ${REGISTRY_SOURCE}`);
  } else {
    const init = tsPeel(decls[0].n.initializer);
    if (init === undefined || !ts.isStringLiteral(init) || init.text !== P350_PACKAGE) out.push(`PI_PACKAGE_NAME is ${init?.getText() ?? 'nothing'}, not '${P350_PACKAGE}', the name pi's own package.json carries`);
  }
  const registry = p350Parse(REGISTRY_SOURCE, texts.get(REGISTRY_SOURCE) ?? '');
  const piRow = tsNodes(registry).find(
    (n) => ts.isObjectLiteralExpression(n) && n.properties.some((x) => ts.isPropertyAssignment(x) && propName(x) === 'id' && ts.isStringLiteral(x.initializer) && x.initializer.text === 'pi') && p350Prop(n, 'install') !== undefined
  );
  const alternates = p350Prop(p350Prop(piRow, 'install'), 'alternates');
  const named = alternates !== undefined && ts.isArrayLiteralExpression(alternates)
    ? alternates.elements.some((el) => {
      const cmd = p350Prop(tsPeel(el), 'command');
      return cmd !== undefined && ts.isStringLiteral(cmd) && cmd.text.split(/\s+/).includes(P350_PACKAGE);
    })
    : false;
  if (!named) out.push(`pi's install map names no route that installs ${P350_PACKAGE}, so the package the token is held to is not the one the map installs`);
  // The predicate: once, in detection.ts, reading files and starting nothing.
  if (preds.length !== 1 || preds[0].rel !== P350_DETECTION) {
    out.push(`insidePiPackage is declared ${String(preds.length)} times (${preds.map((d) => d.rel).join(', ') || 'nowhere'}), not once, in ${P350_DETECTION}`);
  } else {
    const body = preds[0].n.body;
    const nodes = body === undefined ? [] : tsNodes(body);
    if (!nodes.some((n) => ts.isIdentifier(n) && n.text === 'PI_PACKAGE_NAME')) out.push('insidePiPackage compares no name with PI_PACKAGE_NAME, so any package reads as pi\'s');
    if (!nodes.some((n) => ts.isCallExpression(n) && n.expression.getText() === 'realpathSync')) out.push('insidePiPackage does not follow the binary to its real file (realpathSync)');
    if (!nodes.some((n) => ts.isStringLiteral(n) && n.text === 'package.json')) out.push("insidePiPackage reads no 'package.json'");
    for (const call of nodes.filter((n) => ts.isCallExpression(n))) {
      const callee = call.expression;
      const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : null;
      if (name !== null && P350_STARTERS.has(name)) out.push(`insidePiPackage calls ${name}(, and it may read files only: nothing is run (R1)`);
    }
  }
  // Its one caller, as the gate: `if (!insidePiPackage(bin)) return 'unread';` before the reader's last return.
  const floorFor = p350Fn(p350Parse(P350_DETECTION, texts.get(P350_DETECTION) ?? ''), 'piInlineFloorFor');
  if (floorFor?.body === undefined) out.push(`${P350_DETECTION} no longer declares piInlineFloorFor`);
  else {
    const own = p350OwnNodes(floorFor.body);
    const outside = predCalls.filter((c) => !own.includes(c.n));
    for (const c of outside) out.push(`insidePiPackage is called at ${c.rel}:${String(p350Line(c.sf, c.n))}, outside piInlineFloorFor, its one caller`);
    const inside = predCalls.filter((c) => own.includes(c.n));
    if (inside.length !== 1) out.push(`piInlineFloorFor asks insidePiPackage ${String(inside.length)} times, not once`);
    else {
      const call = inside[0].n;
      const arg = call.arguments[0];
      if (call.arguments.length !== 1 || arg === undefined || !ts.isIdentifier(arg) || arg.text !== 'bin') out.push(`piInlineFloorFor asks insidePiPackage of ${call.arguments.map((a) => a.getText()).join(', ') || 'nothing'}, not of the binary it was handed (bin)`);
      const not = call.parent;
      const gate = not?.parent;
      const isGate = not !== undefined && ts.isPrefixUnaryExpression(not) && not.operator === ts.SyntaxKind.ExclamationToken && gate !== undefined && ts.isIfStatement(gate) && gate.expression === not && gate.elseStatement === undefined && p350ReturnsWord(gate.thenStatement, 'unread');
      if (!isGate) out.push("piInlineFloorFor does not answer 'unread' when insidePiPackage(bin) is false (`if (!insidePiPackage(bin)) return 'unread';`)");
      else {
        const statements = floorFor.body.statements;
        const at = statements.indexOf(gate);
        const last = statements[statements.length - 1];
        if (at < 0 || at >= statements.length - 1 || last === undefined || !ts.isReturnStatement(last)) out.push('the package gate is not a statement of piInlineFloorFor ahead of its last return, so a reading can leave before it is asked');
        // No reading but `unread` may leave the reader before the gate has been asked.
        for (const ret of own.filter((n) => ts.isReturnStatement(n))) {
          const e = ret.expression === undefined ? undefined : tsPeel(ret.expression);
          const unread = e !== undefined && ts.isStringLiteral(e) && e.text === 'unread';
          if (!unread && ret.getStart() < gate.getEnd()) out.push(`piInlineFloorFor returns ${e?.getText() ?? 'nothing'} before it asks insidePiPackage, so that reading never asks whether pi is in its own package`);
        }
      }
    }
    // The version-only rule is asked inside the reader alone, so no decision bypasses the gate.
    for (const c of ruleCalls.filter((x) => !own.includes(x.n))) out.push(`piInlineFloor( is asked at ${c.rel}:${String(p350Line(c.sf, c.n))}, outside piInlineFloorFor, so that decision never asks whether pi is in its own package`);
    if (ruleCalls.filter((x) => own.includes(x.n)).length !== 1) out.push('piInlineFloorFor no longer reads the version through piInlineFloor(');
  }
  // Every place the token is decided asks the reader; the core hands it to the pass.
  for (const rel of P350_FLOOR_ASKERS) {
    if ((asks.get(rel) ?? 0) === 0) out.push(`${rel} no longer asks piInlineFloorFor, so the token it decides is not held to pi's own package`);
  }
  const core = p350Parse(P350_CORE, texts.get(P350_CORE) ?? '');
  const handed = tsNodes(core).some((n) => {
    if (!ts.isCallExpression(n) || n.expression.getText() !== 'repairPiInlineOnce') return false;
    const readers = n.arguments[1] === undefined ? undefined : tsPeel(n.arguments[1]);
    const floor = p350Prop(readers, 'floorFor');
    return floor !== undefined && ts.isIdentifier(floor) && floor.text === 'piInlineFloorFor';
  });
  if (!handed) out.push('the core hands the boot pass a floor reader other than piInlineFloorFor, so the pass is not held to pi\'s own package');
  return out;
}

// ---------------------------------------------------------------------------
// Row 11.11 — THE FILE THAT RUNS (his ruling of 2026-11-02, the second ruled
// round)
// ---------------------------------------------------------------------------
//
// The second ruled reverify found what 11.10 cannot see: a create spawns pi by
// its BARE NAME (Phase 12.7 F3), and the pane's execvp walks the pane's PATH from
// the folder tmux starts it in, so a relative entry (`node_modules/.bin`, the
// common `export PATH=./node_modules/.bin:$PATH`) ahead of the global pi finds a
// project's own pi below 0.84.0, which the token stops after its trust question,
// while the scan read, and 11.10 passed, the global file. His ruling: "Check the
// file that runs. Before adding the switch, find pi the way the terminal will,
// starting from the session's folder. Add the switch only when that's the file
// Tortie checked." This row holds it two ways.
//
// BY ITS SHAPE, read with the TypeScript parser over every production file: ONE
// resolver, `bareNameSpawnFile`, and ONE comparison, `bareNameSpawnRuns`, each
// declared once, in detection.ts, starting nothing and calling nothing that reads
// this process's folder, normalises a path or folds its case; the resolver asked
// by the comparison alone, which reads a device and an inode; the comparison asked
// once, inside `piInlineFloorFor`, as a gate that answers `unread` ahead of the
// reader's last return; and the create handing that reader its pane's spawn, built
// from the bare name, the PATH `installUserPath` wrote and the very folder it
// hands tmux. His ruling of 2026-11-03 gave the resolver's guard a term answering
// null for a folder holding a `#`, because tmux read `new-session -c` as a format,
// and his ruling of 2026-11-04 one for a folder ending in `;`, because tmux's
// argument reader ended a command at an argument ending in `;` and read `\;` as
// `;`. PHASE 353 (build/p353/SPEC.md D354-5) TOOK BOTH OUT: `createSession` hands
// tmux the folder held back (`tmuxFolderArgument`, src/main/tmux/argument.ts), so
// the pane starts in exactly the folder the walk starts from. So this row now
// requires the guard to name neither term, and the create to hold the folder back,
// because the walk is only the file that runs while the pane starts where it walks.
//
// DRIVEN: the probe plants a world (a global npm pi; projects holding their own pi
// as npm and pnpm install it, behind every relative and empty PATH entry and a
// binstub; a second link, a hard link and a linked folder to the global file; a
// `..` read through a linked folder; folders and links that cannot be read;
// projects whose folder, or a parent's, holds a `#`; a project whose folder ends
// in `\;`) and walks it through the SHIPPING resolver and comparison. Every answer is compared
// with the table below, written from his ruling and from execvp's rule, never read
// back from the code. `ablation:p331` P37 to P40, P43 and Phase 353's P45 to P47 break the shipping source.

/** The resolver and the comparison, by name. */
const P350_SPAWN_FNS = ['bareNameSpawnFile', 'bareNameSpawnRuns'];
/** What neither may call: a process or a scan, this process's folder, a normalised or case-folded path, a real path's text. */
const P350_SPAWN_FORBIDDEN = new Set([
  ...P350_STARTERS, 'cwd', 'chdir', 'resolve', 'normalize', 'join', 'realpathSync', 'realpath',
  'toLowerCase', 'toUpperCase', 'toLocaleLowerCase', 'toLocaleUpperCase', 'localeCompare'
]);
/**
 * Each planted shape: the file the pane's lookup finds, spelled as the walk spells it under the world's
 * root (null for none), and whether that is the global file the floor was read for.
 */
const P350_SPAWN_TABLE = {
  'nm-npm': ['npm/node_modules/.bin/pi', false],
  'dotnm-pnpm': ['pnpm/./node_modules/.bin/pi', false],
  'dot-npm': ['npm/./pi', false],
  'lead-npm': ['npm/pi', false],
  'double-pnpm': ['pnpm/pi', false],
  'trail-npm': ['npm/pi', false],
  'bin-npm': ['npm/bin/pi', false],
  'nm-plain': ['g/bin/pi', true],
  'lead-plain': ['g/bin/pi', true],
  'after-npm': ['g/bin/pi', true],
  'link-npm': ['npm-link/node_modules/.bin/pi', false],
  'link-plain': ['g/bin/pi', true],
  second: ['g2/pi', true],
  hard: ['hard/pi', true],
  alias: ['alias/pi', true],
  dotdot: ['deep/link/../g/bin/pi', true],
  locked: [null, false],
  noexec: ['g/bin/pi', true],
  dirpi: ['g/bin/pi', true],
  dangling: ['g/bin/pi', true],
  loop: [null, false],
  shut: [null, false],
  'relative-folder': [null, false],
  none: [null, false],
  // His rulings of 2026-11-03 and 2026-11-04 read these as no file, because the pane did not start in them. Since
  // Phase 353 the create holds the folder back and the pane starts there, so a folder holding a `#`, in its own name
  // or a parent's, and one ending in `\;` are walked like any other: each holds no pi, so the global file runs.
  hash: ['g/bin/pi', true],
  'hash-parent': ['g/bin/pi', true],
  semi: ['g/bin/pi', true]
};

/** The file that holds the create every local session starts through, and the function that hands tmux `-c`. */
const P353_TMUX_SESSIONS = 'src/main/tmux/sessions.ts';

/**
 * PHASE 353. The resolver's guard reads no character of the folder: no call on `folder` with a string literal
 * holding a `#` or a `;`, anywhere in the resolver. Each finding says why, so a later round does not put one back.
 */
function p353GuardTermFindings(resolver) {
  const out = [];
  if (resolver?.body === undefined) return out;
  // THE PROBE REVIEW (Phase 353). Every literal in the resolver, and not only a
  // string handed to a method on `folder`: a term spelled `/[#;]/.test(folder)`
  // or `folder.at(-1) === ';'` reads the same characters and read green before.
  // The resolver needs no `#` and no `;` for anything else (its PATH delimiter
  // is `delimiter`), so any literal holding one is a term put back.
  for (const n of p350OwnNodes(resolver.body)) {
    const literal =
      ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isRegularExpressionLiteral(n);
    if (!literal) continue;
    const text = ts.isRegularExpressionLiteral(n) ? n.getText() : n.text;
    const at = n.parent?.getText() ?? n.getText();
    if (text.includes('#')) {
      out.push(
        `bareNameSpawnFile reads the folder for a \`#\` (\`${at}\`): since Phase 353 every create hands tmux ` +
          'the folder held back, so the pane starts in exactly the folder the walk starts from, and a folder holding a `#` is walked like any other'
      );
    }
    if (text.includes(';')) {
      out.push(
        `bareNameSpawnFile reads the folder for a \`;\` (\`${at}\`): since Phase 353 every create hands tmux ` +
          'a final `;` held back, so the pane starts in exactly the folder the walk starts from, and a folder ending in `;` is walked like any other'
      );
    }
  }
  return out;
}

/**
 * PHASE 353. The premise the guard rests on: `createSession` hands tmux `-c` once, held back by
 * `tmuxFolderArgument(input.cwd)`, and as recorded only when a restore asks `folderAsRecorded`.
 */
function p353CreateHoldsFolderFindings(texts) {
  const text = texts.get(P353_TMUX_SESSIONS);
  if (text === undefined) return [`${P353_TMUX_SESSIONS} is not in the tree, so the create that starts every local pane cannot be read`];
  const fn = p350Fn(p350Parse(P353_TMUX_SESSIONS, text), 'createSession');
  if (fn?.body === undefined) return [`${P353_TMUX_SESSIONS} no longer declares createSession`];
  const pushes = p350OwnNodes(fn.body).filter(
    (n) =>
      ts.isCallExpression(n) &&
      n.expression.getText() === 'args.push' &&
      n.arguments.length === 2 &&
      ts.isStringLiteral(n.arguments[0]) &&
      n.arguments[0].text === '-c'
  );
  if (pushes.length !== 1) return [`createSession pushes -c ${String(pushes.length)} times, not once`];
  const handed = tsPeel(pushes[0].arguments[1]);
  const held = (e) => {
    const x = e === undefined ? undefined : tsPeel(e);
    return x !== undefined && ts.isCallExpression(x) && x.expression.getText() === 'tmuxFolderArgument' && x.arguments.length === 1 && x.arguments[0].getText() === 'input.cwd';
  };
  const ok =
    held(handed) ||
    (ts.isConditionalExpression(handed) &&
      handed.condition.getText().replace(/\s+/g, ' ') === 'input.folderAsRecorded === true' &&
      handed.whenTrue.getText() === 'input.cwd' &&
      held(handed.whenFalse));
  return ok
    ? []
    : [
        `createSession hands tmux -c as \`${handed.getText()}\`, not held back by tmuxFolderArgument(input.cwd): tmux reads -c as a format and ` +
          'ends a command at a final `;`, so the pane would not start in the folder the walk starts from'
      ];
}

/** 11.11 by its shape: one resolver, one comparison by identity, one gate, and the create asking it. */
function p350SpawnSourceFindings(texts) {
  const out = [];
  const decls = Object.fromEntries(P350_SPAWN_FNS.map((n) => [n, []]));
  const calls = Object.fromEntries(P350_SPAWN_FNS.map((n) => [n, []]));
  for (const [rel, text] of texts) {
    const sf = p350Parse(rel, text);
    for (const n of p350NodesOf(sf)) {
      if (ts.isFunctionDeclaration(n) && n.name !== undefined && P350_SPAWN_FNS.includes(n.name.text)) decls[n.name.text].push({ rel, n });
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && P350_SPAWN_FNS.includes(n.expression.text)) calls[n.expression.text].push({ rel, n, sf });
    }
  }
  const one = {};
  for (const name of P350_SPAWN_FNS) {
    const list = decls[name];
    if (list.length !== 1 || list[0].rel !== P350_DETECTION) {
      out.push(`${name} is declared ${String(list.length)} times (${list.map((d) => d.rel).join(', ') || 'nowhere'}), not once, in ${P350_DETECTION}`);
    } else {
      one[name] = list[0].n;
    }
  }
  // The resolver's guard answers null for a folder that is not absolute, ahead of the walk, because tmux could not
  // enter it either. PHASE 353: and it reads no character of the folder. His rulings of 2026-11-03 and 2026-11-04
  // put a `#` term and a final-`;` term in this guard while tmux read the folder as a format and as the end of a
  // command; the create now hands it held back (checked below), so both terms went, and a term put back is red.
  const resolver = one.bareNameSpawnFile;
  if (resolver?.body !== undefined) {
    const statements = resolver.body.statements;
    const guard = statements.find((s) => ts.isIfStatement(s));
    const walk = statements.findIndex((s) => ts.isForOfStatement(s) || ts.isForStatement(s) || ts.isWhileStatement(s));
    const terms = [];
    const flat = (e) => {
      const x = tsPeel(e);
      if (ts.isBinaryExpression(x) && x.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
        flat(x.left);
        flat(x.right);
      } else terms.push(x);
    };
    if (guard !== undefined) flat(guard.expression);
    const absolute = terms.some((t) => t.getText().replace(/\s+/g, '') === "!folder.startsWith('/')");
    const then = guard === undefined ? undefined : ts.isBlock(guard.thenStatement) && guard.thenStatement.statements.length === 1 ? guard.thenStatement.statements[0] : guard.thenStatement;
    const returnsNull = then !== undefined && ts.isReturnStatement(then) && then.expression?.kind === ts.SyntaxKind.NullKeyword;
    const ahead = guard !== undefined && guard.elseStatement === undefined && (walk < 0 || statements.indexOf(guard) < walk);
    if (!(absolute && returnsNull && ahead)) {
      out.push("bareNameSpawnFile's guard does not answer null for a folder that is not absolute (`!folder.startsWith('/')`, ahead of the walk): tmux could not enter such a folder, and starts the pane in the home folder instead");
    }
    out.push(...p353GuardTermFindings(resolver));
  }
  // PHASE 353: the premise of the walk, that the pane starts in the folder it walks from.
  out.push(...p353CreateHoldsFolderFindings(texts));
  // Neither starts anything, reads this process's folder, normalises a path, folds its case or reads a real path's text.
  for (const name of P350_SPAWN_FNS) {
    const fn = one[name];
    if (fn?.body === undefined) continue;
    for (const call of p350OwnNodes(fn.body).filter((n) => ts.isCallExpression(n))) {
      const callee = call.expression;
      const said = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : null;
      if (said !== null && P350_SPAWN_FORBIDDEN.has(said)) out.push(`${name} calls ${said}(: it reads the session's own folder as spelled and starts nothing`);
    }
  }
  // The resolver is asked by the comparison alone; the comparison reads a device and an inode.
  const runs = one.bareNameSpawnRuns;
  if (runs?.body !== undefined) {
    const own = p350OwnNodes(runs.body);
    for (const c of calls.bareNameSpawnFile.filter((x) => !own.includes(x.n))) out.push(`bareNameSpawnFile is called at ${c.rel}:${String(p350Line(c.sf, c.n))}, outside bareNameSpawnRuns, its one caller`);
    if (calls.bareNameSpawnFile.filter((x) => own.includes(x.n)).length !== 1) out.push('bareNameSpawnRuns does not ask bareNameSpawnFile once');
    const names = new Set(own.filter((n) => ts.isPropertyAccessExpression(n)).map((n) => n.name.text));
    for (const field of ['dev', 'ino']) if (!names.has(field)) out.push(`bareNameSpawnRuns compares no ${field}: one file is one device and one inode, never one spelling`);
  }
  // The comparison is asked once, inside piInlineFloorFor, as a gate answering `unread` ahead of its last return.
  const floorFor = p350Fn(p350Parse(P350_DETECTION, texts.get(P350_DETECTION) ?? ''), 'piInlineFloorFor');
  if (floorFor?.body === undefined) out.push(`${P350_DETECTION} no longer declares piInlineFloorFor`);
  else {
    const own = p350OwnNodes(floorFor.body);
    for (const c of calls.bareNameSpawnRuns.filter((x) => !own.includes(x.n))) out.push(`bareNameSpawnRuns is called at ${c.rel}:${String(p350Line(c.sf, c.n))}, outside piInlineFloorFor, its one caller`);
    const inside = calls.bareNameSpawnRuns.filter((x) => own.includes(x.n));
    const param = floorFor.parameters[1];
    if (param === undefined || !ts.isIdentifier(param.name) || param.name.text !== 'spawn' || param.questionToken === undefined) out.push("piInlineFloorFor takes no optional second parameter `spawn`, so a create cannot say how its pane will run pi");
    if (inside.length !== 1) out.push(`piInlineFloorFor asks bareNameSpawnRuns ${String(inside.length)} times, not once`);
    else {
      const call = inside[0].n;
      const args = call.arguments.map((a) => a.getText());
      if (args.join(', ') !== 'spawn, bin') out.push(`piInlineFloorFor asks bareNameSpawnRuns(${args.join(', ')}), not of its own spawn and the binary it was handed (spawn, bin)`);
      const not = call.parent;
      const both = not?.parent;
      const gate = both?.parent;
      const isGate =
        not !== undefined && ts.isPrefixUnaryExpression(not) && not.operator === ts.SyntaxKind.ExclamationToken &&
        both !== undefined && ts.isBinaryExpression(both) && both.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && both.right === not &&
        both.left.getText().replace(/\s+/g, ' ') === 'spawn !== undefined' &&
        gate !== undefined && ts.isIfStatement(gate) && gate.expression === both && gate.elseStatement === undefined && p350ReturnsWord(gate.thenStatement, 'unread');
      if (!isGate) out.push("piInlineFloorFor does not answer 'unread' when the pane's lookup does not find bin (`if (spawn !== undefined && !bareNameSpawnRuns(spawn, bin)) return 'unread';`)");
      else {
        const statements = floorFor.body.statements;
        const at = statements.indexOf(gate);
        const last = statements[statements.length - 1];
        if (at < 0 || at >= statements.length - 1 || last === undefined || !ts.isReturnStatement(last)) out.push('the spawn gate is not a statement of piInlineFloorFor ahead of its last return');
        for (const ret of own.filter((n) => ts.isReturnStatement(n))) {
          const e = ret.expression === undefined ? undefined : tsPeel(ret.expression);
          const unread = e !== undefined && ts.isStringLiteral(e) && e.text === 'unread';
          if (!unread && ret.getStart() < gate.getEnd()) out.push(`piInlineFloorFor returns ${e?.getText() ?? 'nothing'} before it asks how the pane will run pi`);
        }
      }
    }
  }
  // The create hands the reader its pane's spawn: the bare name, the PATH installUserPath wrote, the folder it hands tmux.
  const create = p350Parse(P350_CREATE, texts.get(P350_CREATE) ?? '');
  const cnodes = p350NodesOf(create);
  const asks = cnodes.filter((n) => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'piInlineFloorFor');
  const constOf = (name) => cnodes.find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name && ts.isVariableDeclarationList(n.parent) && (n.parent.flags & ts.NodeFlags.Const) !== 0);
  if (asks.length !== 1) out.push(`${P350_CREATE} asks piInlineFloorFor ${String(asks.length)} times, not once`);
  else {
    const [binArg, spawnArg] = asks[0].arguments;
    if (binArg === undefined || binArg.getText() !== 'binPath') out.push(`the create asks piInlineFloorFor of ${binArg?.getText() ?? 'nothing'}, not of binPath, the binary it records`);
    if (spawnArg === undefined || !ts.isIdentifier(spawnArg)) out.push("the create asks piInlineFloorFor with no spawn, so the floor is read for a file its pane may not run");
    else {
      const decl = constOf(spawnArg.text);
      const init = decl === undefined ? undefined : tsPeel(decl.initializer);
      const whenTrue = init !== undefined && ts.isConditionalExpression(init) ? init : undefined;
      const obj = whenTrue === undefined ? undefined : tsPeel(whenTrue.whenFalse);
      const ok =
        whenTrue !== undefined && whenTrue.condition.getText().replace(/\s+/g, ' ') === 'bareName === undefined' &&
        whenTrue.whenTrue.getText() === 'undefined' && obj !== undefined && ts.isObjectLiteralExpression(obj);
      if (!ok) out.push(`${spawnArg.text} is not \`bareName === undefined ? undefined : { name, path, folder }\`, so a pane spawned by its bare name is not described as it runs`);
      else {
        const name = p350Prop(obj, 'name');
        const path = p350Prop(obj, 'path');
        const folder = p350Prop(obj, 'folder');
        if (name === undefined || name.getText() !== 'bareName') out.push(`the spawn's name is ${name?.getText() ?? 'nothing'}, not bareName, the argv[0] the pane gets`);
        const pathDecl = path !== undefined && ts.isIdentifier(path) ? constOf(path.text) : undefined;
        const pathInit = pathDecl === undefined ? undefined : tsPeel(pathDecl.initializer);
        const fromInstall = pathInit !== undefined && ts.isAwaitExpression(pathInit) && pathInit.expression.getText() === 'tmux.installUserPath()';
        if (!fromInstall) out.push(`the spawn's path is ${path?.getText() ?? 'nothing'}, not the PATH \`await tmux.installUserPath()\` wrote, which the pane's execvp walks`);
        const handed = cnodes.filter((n) => ts.isCallExpression(n) && n.expression.getText() === 'tmux.createSession').map((n) => {
          const arg = n.arguments[0] === undefined ? undefined : tsPeel(n.arguments[0]);
          const prop = arg !== undefined && ts.isObjectLiteralExpression(arg) ? arg.properties.find((x) => (ts.isPropertyAssignment(x) || ts.isShorthandPropertyAssignment(x)) && propName(x) === 'cwd') : undefined;
          return prop === undefined ? null : ts.isShorthandPropertyAssignment(prop) ? prop.name.text : prop.initializer.getText();
        });
        if (folder === undefined || !ts.isIdentifier(folder) || handed.length !== 1 || handed[0] !== folder.text) {
          out.push(`the spawn's folder is ${folder?.getText() ?? 'nothing'}, and the create hands tmux ${handed.join(', ') || 'no folder'}: the lookup must start in the folder tmux changes into`);
        }
      }
    }
  }
  return out;
}

/** 11.11 driven: the probe's world through the SHIPPING resolver and comparison, against the table above. */
function p350SpawnDrivenFindings(p) {
  if (p === null) return ['the probe printed no p350 section'];
  const world = p.spawn ?? null;
  if (world === null || !Array.isArray(world.rows)) return ['the probe planted no world for the file that runs'];
  const out = [];
  if (world.why !== null && world.why !== undefined) out.push(`the probe's world stopped: ${world.why}`);
  const got = new Map(world.rows.map((r) => [r.id, r]));
  for (const [id, [found, runs]] of Object.entries(P350_SPAWN_TABLE)) {
    const r = got.get(id);
    if (r === undefined) {
      out.push(`the probe walked no ${id}`);
      continue;
    }
    if (r.found !== found) out.push(`${id}: the pane's lookup found ${JSON.stringify(r.found)}, not ${JSON.stringify(found)}`);
    if (r.runs !== runs) out.push(`${id}: the comparison read ${String(r.runs)}, not ${String(runs)} (${runs ? 'one file' : 'another file or none'})`);
  }
  for (const id of got.keys()) if (!(id in P350_SPAWN_TABLE)) out.push(`the probe walked ${id}, which this checker has no answer for`);
  return out;
}

const p350Result = [];
const p350Data = data.p350 ?? null;
{
  const texts = p350Texts();
  const rows = p331Rows(p331Data);
  /** A copy of the probe's block with one change, or null when it cannot be built. */
  const mut = (fn) => {
    if (p350Data === null) return null;
    const d = p331Copy(p350Data);
    return fn(d) === false ? null : d;
  };
  const withRows = (fn) => {
    const copy = p331Copy(rows);
    return fn(copy) === false ? null : copy;
  };
  const judge6 = ({ t, p, r }) => p350TokenFindings(t, p, r);
  const on6 = (build) => () => {
    const x = build();
    return x === null ? null : x;
  };
  const judge9 = ({ t, p }) => [...p350DrivenRowFindings(p), ...p350ArmingSourceFindings(t)];
  const cases = [
    {
      rule: '11.6',
      name: "pi's token is spelled once, in no row field, and named by its record and by fixedLaunchTokens",
      findings: () => p350TokenFindings(texts, p350Data, rows),
      attacks: [
        ['the token put into launch.argv', on6(() => { const r = withRows((x) => { const pi = x.find((y) => y.id === 'pi'); if (pi === undefined) return false; pi.launchArgv = ['pi', ...P350_TOKENS]; return true; }); return r === null ? null : { t: texts, p: p350Data, r }; })],
        ['the token put into resume.template', on6(() => { const t = p350With(texts, REGISTRY_SOURCE, (s) => s.replace("template: ['--session-id', SESSION_ID_SLOT],", "template: ['--session-id', SESSION_ID_SLOT, ...PI_INLINE_ARGS],")); return t === null ? null : { t, p: p350Data, r: rows }; })],
        ["fixedLaunchTokens('pi') answering nothing", on6(() => { const p = mut((d) => { d.fixed.pi = []; }); return p === null ? null : { t: texts, p, r: rows }; })],
        ['a second PI_INLINE_ARGS', on6(() => { const t = p350With(texts, 'src/main/restore/restore.ts', (s) => `${s}\nconst PI_INLINE_ARGS = ['--tui-mode', 'regular'] as const;\nvoid PI_INLINE_ARGS;\n`); return t === null ? null : { t, p: p350Data, r: rows }; })],
        ["the token spelled again as a literal", on6(() => { const t = p350With(texts, 'src/main/sessions/create-local.ts', (s) => `${s}\nexport const P350_SELF_TEST = '--tui-mode';\n`); return t === null ? null : { t, p: p350Data, r: rows }; })],
        ["the record's tokens a literal list", on6(() => { const t = p350With(texts, REGISTRY_SOURCE, (s) => s.replace('      tokens: PI_INLINE_ARGS,', "      tokens: ['--tui-mode', 'regular'],")); return t === null ? null : { t, p: p350Data, r: rows }; })]
      ].map(([n, build]) => [n, build, judge6])
    },
    {
      rule: '11.7',
      name: 'every production composer call names the floor, and the token goes after argv[0] for pi alone, only with it held',
      findings: () => [...p350CallFindings(texts), ...p350ComposedFindings(p350Data)],
      attacks: [
        ['a far caller passing true', () => p350With(texts, 'src/main/machines/remote-sessions.ts', (s) => s.replace('agentSessionId, false);', 'agentSessionId, true);')), (t) => p350CallFindings(t)],
        ['the create passing no floor', () => p350With(texts, P350_CREATE, (s) => s.replace(/,\s*\/\/ `AgentKind`(?:[^\n]*\n){5}\s*\(input\.agent as LaunchableAgentKind\) === 'pi' && piInlineFloorFor\(binPath, spawnedBy\) === 'holds'/, '')), (t) => p350CallFindings(t)],
        ['the create asking the version and not its binary', () => p350With(texts, P350_CREATE, (s) => s.replace("piInlineFloorFor(binPath, spawnedBy) === 'holds'", "piInlineFloorAt(agentVersion) === 'holds'")), (t) => p350CallFindings(t)],
        ['Restart composing without the floor', () => p350With(texts, P350_EXTRAS, (s) => s.replace('rec.agentSessionId, true);', 'rec.agentSessionId, false);')), (t) => p350CallFindings(t)],
        ['the harvest passing true', () => p350With(texts, P350_HARVEST, (s) => s.replace("agent === 'pi' && piInlineFloorFor(resumeBinOf(rec, agent)) === 'holds'", 'true')), (t) => p350CallFindings(t)],
        ['a Codex repair dropping its false', () => p350With(texts, 'src/main/sessions/codex-repair.ts', (s) => s.replace(/agentExtrasOf\(rec\),\s*false\s*\)/, 'agentExtrasOf(rec))')), (t) => p350CallFindings(t)],
        ['the floor defaulting to true', () => p350With(texts, 'src/main/sessions/resume-argv.ts', (s) => s.replace('  floorHolds = false\n', '  floorHolds = true\n')), (t) => p350CallFindings(t)],
        ['pi composed without the token when held', () => mut((d) => { d.composed.pi.held.launch = [...d.composed.pi.notHeld.launch]; }), (d) => p350ComposedFindings(d)],
        ["codex's argv moving with the floor", () => mut((d) => { d.composed.codex.held.resume = [...d.composed.codex.held.resume, ...P350_TOKENS]; }), (d) => p350ComposedFindings(d)]
      ]
    },
    {
      rule: '11.8',
      name: "one floor rule: the SpecStory version reader's, over the twelve readings, and no comparison of its own",
      findings: () => p350FloorRuleFindings(texts.get(REGISTRY_SOURCE) ?? '', p350Data),
      attacks: [
        ["'0.83.9' read as holding", () => mut((d) => { d.readings.find((x) => x.version === '0.83.9').reading = 'holds'; }), (d) => p350FloorRuleFindings(texts.get(REGISTRY_SOURCE) ?? '', d)],
        ["'' read as below", () => mut((d) => { d.readings.find((x) => x.version === '').reading = 'below'; }), (d) => p350FloorRuleFindings(texts.get(REGISTRY_SOURCE) ?? '', d)],
        ['the versions compared as strings', () => { const t = p350With(texts, REGISTRY_SOURCE, (s) => s.replace('compareSpecStoryVersions(read, PI_INLINE_FLOOR) > 0', 'read > PI_INLINE_FLOOR')); return t === null ? null : t.get(REGISTRY_SOURCE); }, (s) => p350FloorRuleFindings(s, p350Data)],
        // THE FIX ROUND: a line with words around the version read as one, and a prerelease of the floor as holding it.
        ["'22.11.0 node' read as holding", () => mut((d) => { const r = d.readings.find((x) => x.version === '22.11.0 node'); if (r === undefined) return false; r.reading = 'holds'; }), (d) => p350FloorRuleFindings(texts.get(REGISTRY_SOURCE) ?? '', d)],
        ["'0.84.0-rc.1' read as holding", () => mut((d) => { const r = d.readings.find((x) => x.version === '0.84.0-rc.1'); if (r === undefined) return false; r.reading = 'holds'; }), (d) => p350FloorRuleFindings(texts.get(REGISTRY_SOURCE) ?? '', d)],
        ['a reader of its own', () => { const t = p350With(texts, REGISTRY_SOURCE, (s) => s.replace('version === null ? null : parseSpecStoryVersionOutput(version)', 'version === null ? null : (/\\d+\\.\\d+\\.\\d+/.exec(version)?.[0] ?? null)')); return t === null ? null : t.get(REGISTRY_SOURCE); }, (s) => p350FloorRuleFindings(s, p350Data)]
      ]
    },
    {
      rule: '11.9',
      name: 'the pi arm writes resume_argv alone, local pi rows with an id, index 1 only, never unread; the strip on every arm',
      findings: () => [...p350DrivenRowFindings(p350Data), ...p350ArmingSourceFindings(texts)],
      attacks: [
        ['an unread version that moves a row', () => { const p = mut((d) => { d.pass.unread.writes.push({ id: 'R1', argv: d.planted[0].resumeArgv }); }); return p === null ? null : { t: texts, p }; }],
        ["a second install's row handed the token", () => { const p = mut((d) => { const r = d.planted.find((x) => x.id === 'R13'); if (r === undefined) return false; d.pass.holds.writes.push({ id: 'R13', argv: [r.resumeArgv[0], ...P350_TOKENS, ...r.resumeArgv.slice(1)] }); }); return p === null ? null : { t: texts, p }; }],
        ["a person's own copy taken out below the floor", () => { const p = mut((d) => { const r = d.planted.find((x) => x.id === 'R4'); if (r === undefined || d.pass['below-own'] === undefined) return false; d.pass['below-own'].writes.push({ id: 'R4', argv: [r.resumeArgv[0], ...r.resumeArgv.slice(3)] }); }); return p === null ? null : { t: texts, p }; }],
        ["the strip taking a person's own copy", () => { const p = mut((d) => { const s = d.stripOwn?.find((x) => x.id === 'R4'); if (s === undefined) return false; s.argv = [s.argv[0], ...s.argv.slice(3)]; return true; }); return p === null ? null : { t: texts, p }; }],
        ['the strip asking the scanned pi, not the binary it arms', () => { const t = p350With(texts, P350_RESTORE, (s) => s.replace("if (piInlineFloorFor(argv[0]) === 'holds') return argv;", "if (piInlineFloorFor(rec.argv[0]) === 'holds') return argv;")); return t === null ? null : { t, p: p350Data }; }],
        ["the strip ignoring a person's own composition", () => { const t = p350With(texts, P350_RESTORE, (s) => s.replace("piTokenIsTortiesIn(argv, piOwnResumeArgv(rec.agentSessionId ?? '', rec.specstory?.agentArgv ?? rec.argv))", 'piTokenIsTortiesIn(argv, [])')); return t === null ? null : { t, p: p350Data }; }],
        ['the pass judging rows by no binary of their own', () => { const t = p350With(texts, P350_PASS, (s) => s.replace("const floor = readers.floorFor(recorded[0] ?? '');", "const floor = readers.floorFor('');")); return t === null ? null : { t, p: p350Data }; }],
        ["another machine's row read", () => { const p = mut((d) => { d.pass.holds.outcomes.push({ sessionId: 'R6', arm: 'pi', verdict: 'already-right' }); }); return p === null ? null : { t: texts, p }; }],
        ['the token put in at index 2', () => { const p = mut((d) => { const w = d.pass.holds.writes.find((x) => x.id === 'R1'); if (w === undefined) return false; w.argv = [w.argv[0], w.argv[3], ...P350_TOKENS, ...w.argv.slice(4)]; return true; }); return p === null ? null : { t: texts, p }; }],
        ['the env column written', () => { const p = mut((d) => { d.pass.holds.envWrites.push({ id: 'R1' }); }); return p === null ? null : { t: texts, p }; }],
        ['a restore before the scan answers keeping the token', () => { const p = mut((d) => { const s = d.strip?.find((x) => x.id === 'R4'); if (s === undefined) return false; s.argv = d.planted.find((r) => r.id === 'R4').resumeArgv; return true; }); return p === null ? null : { t: texts, p }; }],
        ['armableResume handing back the ladder unstripped', () => { const t = p350With(texts, P350_RESTORE, (s) => s.replace('const argv = withoutPiTokenBelowFloor(rec, decided.argv);', 'const argv = decided.argv;')); return t === null ? null : { t, p: p350Data }; }],
        ['an early return around the strip', () => { const t = p350With(texts, P350_RESTORE, (s) => s.replace('  const decided = await armableResumeLadder(rec, options);', "  if (rec.agent === 'codex') return armableResumeLadder(rec, options);\n  const decided = await armableResumeLadder(rec, options);")); return t === null ? null : { t, p: p350Data }; }],
        ['armedResumeTokens without the fixed tokens', () => { const t = p350With(texts, P350_ARM, (s) => s.replace('  for (const token of fixedLaunchTokens(agent)) tokens.add(token);\n', '')); return t === null ? null : { t, p: p350Data }; }],
        ['the pi arm writing the whole row', () => { const t = p350With(texts, P350_PASS, (s) => s.replace("  if (floor === 'unread') return left('no-floor');", "  (manifest as unknown as { updateSession: (a: string, b: object) => void }).updateSession(rec.id, {});\n  if (floor === 'unread') return left('no-floor');")); return t === null ? null : { t, p: p350Data }; }]
      ].map(([n, build]) => [n, build, judge9])
    },
    {
      // HIS RULING OF 2026-11-02 (R1): see the block above p350PackageFindings.
      rule: '11.10',
      name: "only pi's own package: one name, one predicate that runs nothing, one gate in the floor reader, and every decision through it",
      findings: () => p350PackageFindings(texts),
      attacks: [
        ['the gate taken out of piInlineFloorFor', () => p350With(texts, P350_DETECTION, (s) => s.replace("  if (!insidePiPackage(bin)) return 'unread';\n", ''))],
        ['the gate asking another file', () => p350With(texts, P350_DETECTION, (s) => s.replace("if (!insidePiPackage(bin)) return 'unread';", "if (!insidePiPackage(lastReadFrom.get('pi')?.real ?? '')) return 'unread';"))],
        ['the gate answering the reading', () => p350With(texts, P350_DETECTION, (s) => s.replace("if (!insidePiPackage(bin)) return 'unread';", 'if (!insidePiPackage(bin)) return reading;'))],
        ['a reading returned before the gate is asked', () => p350With(texts, P350_DETECTION, (s) => s.replace("  if (!insidePiPackage(bin)) return 'unread';\n", "  if (reading === 'below') return reading;\n  if (!insidePiPackage(bin)) return 'unread';\n"))],
        ['a second insidePiPackage', () => p350With(texts, P350_RESTORE, (s) => `${s}\nexport function insidePiPackage(bin: string): boolean {\n  return bin.length > 0;\n}\n`)],
        ['the predicate asked outside the floor reader', () => p350With(texts, P350_RESTORE, (s) => `${s}\nexport const p350SelfTest = (bin: string): boolean => insidePiPackage(bin);\n`)],
        ["pi's package named by its old scope", () => p350With(texts, REGISTRY_SOURCE, (s) => s.replace("export const PI_PACKAGE_NAME = '@earendil-works/pi-coding-agent';", "export const PI_PACKAGE_NAME = '@mariozechner/pi-coding-agent';"))],
        ['the install map installing another package', () => p350With(texts, REGISTRY_SOURCE, (s) => s.replace("command: 'npm install -g --ignore-scripts @earendil-works/pi-coding-agent'", "command: 'npm install -g --ignore-scripts @someone/pi-fork'"))],
        ['the predicate comparing no name', () => p350With(texts, P350_DETECTION, (s) => s.replace('(parsed as { name?: unknown }).name === PI_PACKAGE_NAME', '(parsed as { name?: unknown }).name !== undefined'))],
        ['the predicate starting a scan', () => p350With(texts, P350_DETECTION, (s) => s.replace('export function insidePiPackage(bin: string): boolean {\n', 'export function insidePiPackage(bin: string): boolean {\n  void listDetectedAgents();\n'))],
        ['a create asking the version rule alone', () => p350With(texts, P350_CREATE, (s) => s.replace("piInlineFloorFor(binPath, spawnedBy) === 'holds'", "piInlineFloor(agentVersion) === 'holds'"))],
        ['the pass handed another floor reader', () => p350With(texts, P350_CORE, (s) => s.replace('floorFor: piInlineFloorFor', "floorFor: () => 'holds' as const"))]
      ].map(([n, build]) => [n, build, (t) => p350PackageFindings(t)])
    },
    {
      // HIS RULING OF 2026-11-02, THE SECOND RULED ROUND: see the block above p350SpawnSourceFindings.
      rule: '11.11',
      name: "the file that runs: one resolver from the session's own folder, one comparison by device and inode, one gate, and the create asking it",
      findings: () => [...p350SpawnSourceFindings(texts), ...p350SpawnDrivenFindings(p350Data)],
      attacks: [
        // The source, broken one clause at a time.
        ['the gate taken out of piInlineFloorFor', () => p350With(texts, P350_DETECTION, (s) => s.replace("  if (spawn !== undefined && !bareNameSpawnRuns(spawn, bin)) return 'unread';\n", ''))],
        ['the create asking with no spawn', () => p350With(texts, P350_CREATE, (s) => s.replace('piInlineFloorFor(binPath, spawnedBy)', 'piInlineFloorFor(binPath)'))],
        ["the spawn's folder this process's own", () => p350With(texts, P350_CREATE, (s) => s.replace('folder: cwd }', 'folder: process.cwd() }'))],
        ["the spawn walking a PATH that is not the pane's", () => p350With(texts, P350_CREATE, (s) => s.replace('path: panePath,', "path: '',"))],
        ['a second resolver', () => p350With(texts, P350_RESTORE, (s) => `${s}\nexport function bareNameSpawnFile(): null {\n  return null;\n}\n`)],
        ['the comparison asked outside the floor reader', () => p350With(texts, P350_RESTORE, (s) => `${s}\nexport const p350SpawnSelfTest = (bin: string): boolean => bareNameSpawnRuns({ name: 'pi', path: '', folder: '/' }, bin);\n`)],
        ['the resolver normalising its candidate', () => p350With(texts, P350_DETECTION, (s) => s.replace('    const at = `${dir}/${name}`;\n', '    const at = join(dir, name);\n'))],
        ['the comparison reading real paths', () => p350With(texts, P350_DETECTION, (s) => s.replace('    const st = statSync(bin, { bigint: true });\n    return st.dev === runs.dev && st.ino === runs.ino;\n', '    return realpathSync(bin) === realpathSync(runs.at);\n'))],
        // PHASE 353: his rulings' two terms, put back, each red; and the guard's own absolute-folder term taken out.
        ["the # term of 2026-11-03 put back into the resolver's guard", () => p350With(texts, P350_DETECTION, (s) => s.replace("|| !folder.startsWith('/')) return null;", "|| !folder.startsWith('/') || folder.includes('#')) return null;"))],
        ["the ; term of 2026-11-04 put back into the resolver's guard", () => p350With(texts, P350_DETECTION, (s) => s.replace("|| !folder.startsWith('/')) return null;", "|| !folder.startsWith('/') || folder.endsWith(';')) return null;"))],
        ['a # read anywhere else in the resolver', () => p350With(texts, P350_DETECTION, (s) => s.replace("  for (const entry of path.split(delimiter)) {\n", "  if (folder.indexOf('#') >= 0) return null;\n  for (const entry of path.split(delimiter)) {\n"))],
        // THE PROBE REVIEW (Phase 353): the same two terms spelled without a string handed to a method on `folder`.
        ['a # or ; read by a regular expression', () => p350With(texts, P350_DETECTION, (s) => s.replace("  for (const entry of path.split(delimiter)) {\n", "  if (/[#;]/.test(folder)) return null;\n  for (const entry of path.split(delimiter)) {\n"))],
        ["a final ; read by the folder's last character", () => p350With(texts, P350_DETECTION, (s) => s.replace("  for (const entry of path.split(delimiter)) {\n", "  if (folder.at(-1) === ';') return null;\n  for (const entry of path.split(delimiter)) {\n"))],
        ["the guard's absolute-folder term taken out", () => p350With(texts, P350_DETECTION, (s) => s.replace(" || !folder.startsWith('/')) return null;", ') return null;'))],
        // PHASE 353: the premise, broken. The create handing tmux the folder raw, and held back only on the restore's arm.
        ['the create handing tmux the folder raw', () => p350With(texts, P353_TMUX_SESSIONS, (s) => s.replace('input.folderAsRecorded === true ? input.cwd : tmuxFolderArgument(input.cwd)', 'input.cwd'))],
        ['the create holding the folder back only when a restore asks it as recorded', () => p350With(texts, P353_TMUX_SESSIONS, (s) => s.replace('input.folderAsRecorded === true ? input.cwd : tmuxFolderArgument(input.cwd)', 'input.folderAsRecorded === true ? tmuxFolderArgument(input.cwd) : input.cwd'))]
      ].map(([n, build]) => [n, build, (t) => p350SpawnSourceFindings(t)]).concat([
        // The behaviour, as each broken resolver answers over the same world.
        ["a relative entry read from this process's folder", () => mut((d) => { const at = (id) => d.spawn?.rows?.find((r) => r.id === id); const a = at('nm-npm'); const b = at('dotdot'); if (a === undefined || b === undefined) return false; Object.assign(a, { found: 'g/bin/pi', runs: true }); Object.assign(b, { found: null, runs: false }); return true; }), (d) => p350SpawnDrivenFindings(d)],
        ['empty entries passed over', () => mut((d) => { const rows = d.spawn?.rows ?? []; const hit = rows.filter((r) => ['lead-npm', 'double-pnpm'].includes(r.id)); if (hit.length !== 2) return false; for (const r of hit) Object.assign(r, { found: 'g/bin/pi', runs: true }); return true; }), (d) => p350SpawnDrivenFindings(d)],
        ['one file told apart by its spelling', () => mut((d) => { const rows = d.spawn?.rows ?? []; const hit = rows.filter((r) => ['second', 'hard', 'alias', 'dotdot'].includes(r.id)); if (hit.length !== 4) return false; for (const r of hit) r.runs = false; return true; }), (d) => p350SpawnDrivenFindings(d)],
        // PHASE 353: the two folders his rulings read as no file, read so again over the driven data.
        ['a folder holding a # read as no file again', () => mut((d) => { const rows = d.spawn?.rows ?? []; const hit = rows.filter((r) => ['hash', 'hash-parent'].includes(r.id)); if (hit.length !== 2) return false; for (const r of hit) Object.assign(r, { found: null, runs: false }); return true; }), (d) => p350SpawnDrivenFindings(d)],
        ['a folder ending in ; read as no file again', () => mut((d) => { const r = d.spawn?.rows?.find((x) => x.id === 'semi'); if (r === undefined) return false; Object.assign(r, { found: null, runs: false }); return true; }), (d) => p350SpawnDrivenFindings(d)]
      ])
    }
  ];
  p350Result.push(
    ...judgeRuleCases('350', cases, (c) => (p350Data === null ? ['the probe printed no p350 section'] : c.findings()))
  );
  if (p350Result.length !== 6) fail('Phase 350 asks six rows, 11.6 to 11.11, and this gate no longer does.');
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

process.stdout.write('\nthe screen record and the two inline switches (Phase 331)\n');
process.stdout.write('-'.repeat(107) + '\n');
for (const row of p331Result) {
  process.stdout.write(`${pad(row.rule, 6)} ${pad(row.name, 90)} ${pad(tick(row.ok), 4)} ${row.note}\n`);
}
{
  const driven = Array.isArray(p331Data?.cases) ? p331Data.cases.length : 0;
  const switched = p331Rows(p331Data).filter((r) => r.screen?.class === 'switch-to-inline').map((r) => r.id);
  process.stdout.write(
    `\n${String(driven)} rows went through the shipping parseAgentOverlay inside the probe, one parse each, and ` +
      `${String(p331Rows(p331Data).filter((r) => r.launchable).length)} launchable rows were read off the registry's own ` +
      `exports (${switched.join(' and ') || 'none'} switch-to-inline); nothing was written and nothing was started.\n`
  );
}

process.stdout.write("\npi's inline token behind its floor (Phase 350)\n");
process.stdout.write('-'.repeat(107) + '\n');
for (const row of p350Result) {
  process.stdout.write(`${pad(row.rule, 6)} ${pad(row.name, 90)} ${pad(tick(row.ok), 4)} ${row.note}\n`);
}
{
  const planted = Array.isArray(p350Data?.planted) ? p350Data.planted.length : 0;
  const composed = Object.keys(p350Data?.composed ?? {}).length;
  const walked = Array.isArray(p350Data?.spawn?.rows) ? p350Data.spawn.rows.length : 0;
  process.stdout.write(
    `\n${String(composed)} launchable rows were composed by seven composers at both floor answers, the pi arm of the boot ` +
      `pass ran at holds, below and unread, and below again with a person's own leading pair, over ${String(planted)} ` +
      "planted rows through a recording store, each row's floor read for its own binary, and restore's strip ran at " +
      'unread, the one reading a process that starts no scan can have, over the compiled table and a planted one whose ' +
      `pi template leads with the pair; the file a bare-name spawn runs was walked over ${String(walked)} planted PATH ` +
      "shapes in a scratch world the probe removed; no manifest was opened, nothing else was written and nothing was started.\n"
  );
}

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
