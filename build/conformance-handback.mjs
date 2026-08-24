/**
 * `npm run conformance:handback` — the cheap gate that keeps Phase 141's
 * refusals executable rather than asserted.
 *
 * WHAT IT IS FOR. Phase 141 lets a person get back into an agent that left its
 * shell running, with one word on one row and one press. The claim that comes
 * with it is narrow and easy to break: the word appears because Tortie watched
 * a NAMED PROCESS go away, and never because a pane LOOKS like a shell. A
 * session Tortie has just restored, sitting with its command armed and
 * unpressed, is byte for byte the same shape as a session whose agent has left,
 * so every shape rule announces a drop that never happened. Three candidate
 * designs died on that one fact.
 *
 * Nothing in a type checker stops a later round undoing that. This gate is the
 * executable half, and it costs about a second. It is the seventh gate of its
 * shape, beside conformance:agents, :machines, :installs, :context, :installs
 * and :overview, and it keeps their posture: no process, no tmux server, no
 * Electron, no manifest, no file under the person's home, no write anywhere.
 * That posture matters more here than usual, because the feature it watches
 * types into a live session.
 *
 * WHAT IT CHECKS, in five sections.
 *
 * SECTION 1 — the contract. One channel, declared once, exposed once and
 *   registered once, and present in the flat channel map the TypeScript checker
 *   resolves for docs/audits/contract-baseline.txt. A channel folded into no map
 *   type-checks in both files and reaches nothing. The section then RE-DERIVES
 *   the two unions that are written down twice, being the handback states and
 *   the four landings, and requires the two copies to agree. It also drives
 *   `decideArmLanding` over a grid and requires every landing it can produce to
 *   be a member of the contract's union, so main cannot answer with a word the
 *   renderer has no sentence for.
 *
 * SECTION 2 — the menu bar. One row, appearing once, unaccelerated, sitting
 *   between End Session and the per agent hotkeys, dispatched by the renderer,
 *   and named by no keymap entry anywhere. The row is the only surface that
 *   works in session focus mode, where the session list is hidden by design, so
 *   its absence is not cosmetic.
 *
 * SECTION 3 — the refusals, and this is the section the phase is for.
 *   1. `SessionStatus` gained no member. Phase 23 refusal 5 says nothing may set
 *      a session's status, and the drop is not one.
 *   2. No file that knows about the drop calls `applyDetectedStatus`.
 *   3. The manifest projection has never heard the word.
 *   4. The three columns research 64 section 10.4 asked for exist nowhere, in
 *      source or in the schema baseline. The backlog refused them in the same
 *      words: no change to the manifest schema beyond what the conversation id
 *      already uses. The witness lives in memory, and that is exactly what makes
 *      it immune to the restore shape.
 *   5. The restore path names no witness. A restore must not be able to
 *      manufacture one, because a session Tortie has only just restored has
 *      never had an agent alive in it.
 *   6. Nothing that holds a witness reads a screen to decide the drop.
 *   7. The local press does not reach `sendArmedResumeText`, which is the door
 *      built to type on ANOTHER computer and is pinned to two files by gate 65
 *      of build/conformance-machines.mjs.
 *
 * SECTION 4 — the witness base case, behind a seam. A freshly watched session
 *   carries no witness and a handback of `none`. That is the governing rule's
 *   base case: with no witness there is nothing to lose, so a restored session
 *   sitting armed and unpressed offers nothing.
 *
 * SECTION 5 — the copy, behind a seam. Four states and four landings, every
 *   sentence distinct, none of them saying an agent is running, none of them
 *   saying "on that machine" because this session is on this Mac, exactly one
 *   landing asking the person to press Enter and the other three saying nothing
 *   ran, and no dash of any kind anywhere in the words a person reads.
 *
 * WHAT IT CANNOT PROVE, said so nobody reads more into a pass. It never watches
 * a process go away, never reads a real pane, never types anything. The drop
 * latency, the false positive set and the typed resume path belong to the
 * phase's Tier 3 verifier driving the real app on a scratch tmux server. What is
 * proven here is the pure half, which is where the refusals live.
 */

import { spawnSync } from 'node:child_process';

const probe = spawnSync(
  'npx',
  [
    'tsx',
    '--tsconfig',
    'tsconfig.node.json',
    'build/handback-conformance-probe.mts'
  ],
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
const list = (values) => (values.length === 0 ? 'nothing' : values.join(', '));

const { contract, menu, refusals, witness, copy } = data;

// ---------------------------------------------------------------------------
// Section 1 — the contract
// ---------------------------------------------------------------------------

if (!contract.inBaseline) {
  fail(
    `${data.channel} is not in docs/audits/contract-baseline.txt. That list is ` +
      'the flat GmuxInvokeChannelMap resolved by the TypeScript checker, so a ' +
      'channel missing from it was declared in a map nothing folds in. It ' +
      'type-checks on both sides and reaches nothing. Re-baseline with ' +
      '`node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt` ' +
      'and say why in the commit body.'
  );
}
if (contract.declaredIn.length !== 1) {
  fail(
    `${data.channel} is declared in ${list(contract.declaredIn)}. Exactly one ` +
      'file in the shared contract may declare it.'
  );
}
if (contract.exposedIn.length !== 1) {
  fail(
    `${data.channel} is exposed by ${list(contract.exposedIn)}. There is one ` +
      'preload bridge and it makes one call.'
  );
}

// The main handler is required as soon as ANY of the phase's main side exists.
// A tree with a witness in it and no handler is a half-landed phase, and the
// gate says so rather than skipping.
const mainSideLanded = refusals.witnessFiles.length > 0;
if (!mainSideLanded) {
  skipped.push(
    'no file under src/main names a witness, so Phase 141 has not landed in ' +
      'main and sections 1 (the handler) and 4 could not be checked. This is ' +
      'not a pass of the whole gate.'
  );
} else if (contract.registeredIn.length !== 1) {
  fail(
    `${data.channel} is registered in ${list(contract.registeredIn)}. Main ` +
      'holds a witness for this phase, so exactly one file must answer the ' +
      'channel. Nothing else in the build can put the command on a prompt.'
  );
}

if (contract.calledIn.length === 0) {
  fail(
    'no renderer file calls resumeInPlace, so the press has no surface. The ' +
      'verb reaches a person from a row and from the menu bar, and neither ' +
      'exists without a caller.'
  );
}
if (!contract.handbackField) {
  fail(
    'SessionActivityInfo carries no `handback` field. The fact travels on the ' +
      'activity channel rather than on the session projection, and that is ' +
      'what keeps Phase 23 refusal 5 structural: there is no code path from ' +
      'this state to a status dot.'
  );
}

const STATES = ['none', 'left', 'returning', 'unconfirmed'];
if (contract.sharedStates.join('|') !== STATES.join('|')) {
  fail(
    `the handback states are ${list(contract.sharedStates)}. They are ` +
      `${STATES.join(', ')} and there is no fifth. A new member is a new ` +
      'thing Tortie claims to know about a session it is not watching.'
  );
}
// The renderer holds no record for a session in no state, so `none` has no
// member there. Every other member must match, in order.
const rendererExpected = STATES.filter((s) => s !== 'none');
if (contract.rendererStates.join('|') !== rendererExpected.join('|')) {
  fail(
    'the handback states are written down twice and the two copies disagree.\n' +
      `      contract ${list(contract.sharedStates)}\n` +
      `      renderer ${list(contract.rendererStates)}\n` +
      "      The renderer drops `none` on purpose and must match on the rest."
  );
}
if (contract.sharedLandings.join('|') !== contract.rendererLandings.join('|')) {
  fail(
    'the four landings are written down twice and the two copies disagree.\n' +
      `      contract ${list(contract.sharedLandings)}\n` +
      `      renderer ${list(contract.rendererLandings)}\n` +
      '      A landing main can answer with and the renderer has no sentence ' +
      'for is a press that says nothing.'
  );
}
{
  const produced = [...contract.producedLandings].sort().join('|');
  const declared = [...contract.sharedLandings].sort().join('|');
  if (produced !== declared) {
    fail(
      'decideArmLanding produces landings the contract does not declare, or ' +
        'the contract declares landings it can never produce.\n' +
        `      produced ${list(contract.producedLandings)}\n` +
        `      declared ${list([...contract.sharedLandings].sort())}`
    );
  }
}
if (
  [...contract.rendererRefusals].sort().join('|') !==
  [...contract.sharedRefusals].sort().join('|')
) {
  fail(
    'the refusal reasons in the renderer and in the contract disagree.\n' +
      `      contract ${list([...contract.sharedRefusals].sort())}\n` +
      `      renderer ${list([...contract.rendererRefusals].sort())}\n` +
      '      A reason main can answer with and the renderer has no sentence ' +
      'for is an empty toast on a press that typed nothing.'
  );
}

if (contract.sharedRefusals.length === 0) {
  fail(
    'the contract names no refusal reasons. A press that types nothing has to ' +
      'say why, and the re-read at the moment of the press is the guard the ' +
      'whole design turns on.'
  );
}
if (contract.mainRefusals.length === 0) {
  if (mainSideLanded) {
    fail(
      'no module under src/main declares the refusal reasons, so the press ' +
        'either never refuses or refuses with words nothing else knows.'
    );
  }
} else if (
  [...contract.mainRefusals].sort().join('|') !==
  [...contract.sharedRefusals].sort().join('|')
) {
  fail(
    'the refusal reasons are written down twice and the two copies disagree.\n' +
      `      contract ${list([...contract.sharedRefusals].sort())}\n` +
      `      main     ${list([...contract.mainRefusals].sort())}\n` +
      '      A renderer file cannot import main, so this list is kept by hand ' +
      'in both places. A reason main can answer with and the renderer has no ' +
      'sentence for is a press that says nothing at all.'
  );
}
{
  const w = contract.wrapCounts;
  if (w.once !== 1 || w.twice !== 2 || w.none !== 0) {
    fail(
      `the screen counter reads ${w.once}, ${w.twice} and ${w.none} for a ` +
        'command that landed once, a command sent twice and a bare prompt, and ' +
        'it should read 1, 2 and 0. A shell wraps a long command across rows ' +
        'and tmux does not mark those rows joined, so a counter that searches ' +
        'for one contiguous string tells a person their command is not there ' +
        'when it is.'
    );
  }
}

// ---------------------------------------------------------------------------
// Section 2 — the menu bar
// ---------------------------------------------------------------------------

if (!menu.declaredInUnion) {
  fail(`'${data.action}' is not a member of MenuActionId.`);
}
if (menu.rowCount !== 1) {
  fail(
    `'${data.action}' appears ${menu.rowCount} times in src/main/menu.ts. One ` +
      'row, in the Session menu.'
  );
}
if (/accel\(/.test(menu.rowLine)) {
  fail(
    `the Session menu row carries an accelerator: ${menu.rowLine}\n` +
      '      It is unaccelerated on purpose, for the reason End Session beside ' +
      'it is: it acts on the live session the person is looking at, and typing ' +
      'into that session deserves the same care as ending it.'
  );
}
if (menu.keymapNames.length > 0 || menu.keymapResumeIds.includes('session.resume')) {
  fail(
    'a keymap entry names the resume verb. This phase registers no chord and ' +
      'adds no shortcuts overlay row.'
  );
}
if (menu.rowAt === -1 || menu.endSessionAt === -1 || menu.hotkeysAt === -1) {
  fail(
    'the Session menu no longer holds End Session, the resume row and the per ' +
      'agent hotkeys together, so the row cannot be placed.'
  );
} else if (!(menu.endSessionAt < menu.rowAt && menu.rowAt < menu.hotkeysAt)) {
  fail(
    `the row sits at line ${menu.rowAt + 1}, End Session at ` +
      `${menu.endSessionAt + 1} and the hotkeys at ${menu.hotkeysAt + 1}. It ` +
      'belongs immediately after End Session and before the per agent items.'
  );
}
if (menu.dispatchedIn.length !== 1) {
  fail(
    `'${data.action}' is dispatched in ${list(menu.dispatchedIn)}. Exactly one ` +
      'renderer file handles a menu action, and a row nothing handles is a ' +
      'menu that does nothing in the one mode where it is the only surface.'
  );
}

// ---------------------------------------------------------------------------
// Section 3 — the refusals
// ---------------------------------------------------------------------------

const PINNED_STATUSES = [
  'running',
  'idle',
  'needs_input',
  'exited',
  'restorable',
  'unknown',
  'discarded'
];
if (refusals.sessionStatuses.join('|') !== PINNED_STATUSES.join('|')) {
  fail(
    `SessionStatus now reads ${list(refusals.sessionStatuses)}. It is ` +
      `${PINNED_STATUSES.join(', ')}. Phase 23 refusal 5 says nothing may set ` +
      'a session status, and an agent that left its shell running is not one.'
  );
}
if (refusals.statusCallsNamingDrop.length > 0) {
  fail(
    'a status is being set from the drop:\n      ' +
      refusals.statusCallsNamingDrop.join('\n      ') +
      '\n      Phase 23 refusal 5 says nothing may set a session status, and ' +
      'an agent that left its shell running is not one. The fact travels on ' +
      'the activity channel and stops there.'
  );
}
if (refusals.codecsNamesHandback) {
  fail(
    'src/main/manifest/codecs.ts names the handback. The fact is a runtime ' +
      'reading of a pane and it does not belong in the projection a row is ' +
      'built from.'
  );
}
if (refusals.refusedColumnsInSource.length > 0) {
  fail(
    `${list(refusals.refusedColumnsInSource)} appears in the source. Research ` +
      '64 section 10.4 asked for those columns and the backlog entry refused ' +
      'them: no change to the manifest schema beyond what the conversation id ' +
      'already uses. The witness lives in memory, and that is what makes it ' +
      'immune to the restore shape. Adding them is its own phase and its own ' +
      'migration.'
  );
}
if (refusals.refusedColumnsInBaseline.length > 0) {
  fail(
    `${list(refusals.refusedColumnsInBaseline)} is in the schema baseline, so ` +
      'a migration added it. See the reason above.'
  );
}
if (refusals.restoreNamesWitness) {
  fail(
    'src/main/restore/restore.ts names a witness. THIS IS THE RULE THAT ' +
      'OUTRANKS THE REST OF THE PHASE. A session Tortie has just restored has ' +
      'never had an agent alive in it, so it has no witness to lose and offers ' +
      'nothing. A restore that records one would announce that an agent left ' +
      'every time a person brings a session back.'
  );
}
if (mainSideLanded && !refusals.rule.namesWitness) {
  fail(
    `${refusals.rule.file} holds no witness. The drop rule belongs in the pure ` +
      'state machine, so it is testable with no tmux server and so it cannot ' +
      'read a screen even if a later round wanted it to.'
  );
}
if (refusals.rule.readsScreen) {
  fail(
    `${refusals.rule.file} reads a screen. The module that decides the drop ` +
      'must not be able to. Tortie reacts to a named process going away and ' +
      'never to a pane that looks like a shell, because a restored session ' +
      'sitting armed and unpressed looks exactly like one whose agent left. ' +
      'Three candidate designs died on that fact.'
  );
}
if (refusals.rule.startsProcess) {
  fail(
    `${refusals.rule.file} starts a process. The rule is pure and the reads ` +
      'belong beside the fleet reader in src/main/activity/process.ts.'
  );
}
if (refusals.handbackNamesMachineSend.length > 0) {
  fail(
    `${list(refusals.handbackNamesMachineSend)} names sendArmedResumeText. ` +
      'That is the door built to type on ANOTHER computer, and gate 65 of ' +
      'build/conformance-machines.mjs pins it to two files. The local press ' +
      'types through the local tmux path.'
  );
}

// ---------------------------------------------------------------------------
// Section 4 — the witness base case
// ---------------------------------------------------------------------------

if (witness.state !== 'present') {
  skipped.push(
    `the witness seam is absent (${witness.specifier}), so the base case was ` +
      'not driven. Sections 1 to 3 and 5 still decided the verdict.'
  );
} else if (!witness.keys.includes('witnessPid')) {
  skipped.push(
    'the watched state carries no witnessPid yet, so the base case was not ' +
      'driven. This is not a pass of the whole gate.'
  );
} else {
  if (witness.witnessPid !== null) {
    fail(
      `a freshly watched session starts with witnessPid ` +
        `${JSON.stringify(witness.witnessPid)}. It starts with none. Tortie ` +
        'has not seen an agent alive in a session it has only started ' +
        'watching, and a restored session is exactly that.'
    );
  }
  if (witness.handback !== 'none') {
    fail(
      `a freshly watched session starts with handback ` +
        `${JSON.stringify(witness.handback)}. It starts at none, which is ` +
        'what keeps a restored session sitting armed and unpressed from ' +
        'offering the verb.'
    );
  }
  for (const key of ['witnessPpid', 'handback', 'leftAt', 'leftCommand']) {
    if (!witness.keys.includes(key)) {
      fail(
        `the watched state carries no ${key}. The five fields are what the ` +
          'drop edge and the return trigger are decided from.'
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Section 5 — the copy
// ---------------------------------------------------------------------------

const DASHES = ['—', '–'];

if (copy.state !== 'present') {
  skipped.push(
    `the copy seam is absent (${copy.specifier}), so no sentence was read. ` +
      'This is not a pass of the whole gate.'
  );
} else {
  const sentences = {
    ...copy.notes,
    ...copy.landings,
    ...copy.refusals,
    ...copy.constants
  };
  const values = Object.values(sentences);

  for (const [name, text] of Object.entries(sentences)) {
    for (const dash of DASHES) {
      if (text.includes(dash)) {
        fail(`the ${name} sentence carries a dash: ${text}`);
      }
    }
  }

  for (const state of ['left', 'returning', 'unconfirmed']) {
    const text = copy.notes[state];
    if (typeof text !== 'string' || text.length === 0) {
      fail(`there is no sentence for the ${state} state.`);
      continue;
    }
    if (/running/i.test(text) && /agent/i.test(text)) {
      fail(
        `the ${state} sentence says an agent is running: ${text}\n` +
          '      None of these sentences may claim an agent is running. ' +
          'Tortie does not know that, and saying it is how a person ends up ' +
          'typing into a program that owns the terminal.'
      );
    }
    if (/machine/i.test(text)) {
      fail(
        `the ${state} sentence names a machine: ${text}\n` +
          '      The four sentences in src/main/machines/remote-copy.ts each ' +
          'say "on that machine" because they were written for another ' +
          'computer. This session is on this Mac and in front of the person.'
      );
    }
  }

  const timed = copy.notes['left-with-time'];
  if (typeof timed === 'string' && timed === copy.notes['left']) {
    fail(
      'the left sentence reads the same with a time and without one, so the ' +
        'moment the agent left is never said.'
    );
  }

  let asksForEnter = 0;
  let saysNothingRan = 0;
  for (const landing of contract.sharedLandings) {
    const text = copy.landings[landing];
    if (typeof text !== 'string' || text.length === 0) {
      fail(`there is no sentence for the ${landing} landing.`);
      continue;
    }
    if (/machine/i.test(text)) {
      fail(`the ${landing} sentence names a machine: ${text}`);
    }
    if (/press enter/i.test(text) && !/never presses enter/i.test(text)) {
      asksForEnter += 1;
    }
    if (/nothing ran/i.test(text)) saysNothingRan += 1;
  }
  if (asksForEnter !== 1) {
    fail(
      `${asksForEnter} of the four landing sentences ask the person to press ` +
        'Enter. Exactly one does, being the one where the command is on the ' +
        'prompt. Tortie types and never presses Enter, so the other three have ' +
        'nothing to ask for.'
    );
  }
  if (saysNothingRan !== 3) {
    fail(
      `${saysNothingRan} of the four landing sentences say nothing ran. Three ` +
        'do: the person is reading about a command that is not on their ' +
        'prompt, and the first thing they will assume is that it ran.'
    );
  }
  // The six refusals. A refusal is a press that typed NOTHING, so every one of
  // these has to say so, and none of them may ask a person to press Enter at
  // the end of a command that is not there.
  for (const refusal of contract.sharedRefusals) {
    const text = copy.refusals[refusal];
    if (typeof text !== 'string' || text.length === 0) {
      fail(`there is no sentence for the ${refusal} refusal.`);
      continue;
    }
    if (/press enter/i.test(text)) {
      fail(
        `the ${refusal} sentence asks the person to press Enter: ${text}\n` +
          '      Nothing was typed, so there is nothing on the prompt to press ' +
          'Enter at the end of.'
      );
    }
    if (!/typed nothing|nothing to put back|nothing to put on/i.test(text)) {
      fail(
        `the ${refusal} sentence never says that nothing was typed: ${text}\n` +
          '      Every refusal is a press that put no command on the prompt, ' +
          'and the person is looking at the session while they read it.'
      );
    }
  }
  if (typeof copy.fallback !== 'string' || copy.fallback.length === 0) {
    fail(
      'an answer with neither a landing nor a refusal produces no sentence at ' +
        'all, so a build of main this window does not understand shows an ' +
        'empty toast.'
    );
  }
  if (copy.landedOn.join('|') !== 'armed') {
    fail(
      `the landings treated as good news are ${list(copy.landedOn)}. Only ` +
        'armed is good news; the other three ask the person to look at the ' +
        'session before they press anything.'
    );
  }
  if (new Set(values).size !== values.length) {
    fail('two of the sentences are the same words, so a person cannot tell the two states apart.');
  }
  for (const key of [
    'RESUME_VERB',
    'RESUME_IN_PLACE_LABEL',
    'RESUME_IN_PLACE_SUBLABEL',
    'RESUME_VERB_TITLE'
  ]) {
    if (typeof copy.constants[key] !== 'string') {
      fail(`the copy module no longer exports ${key}.`);
    }
  }
}

// ---------------------------------------------------------------------------
// The table, printed whatever the verdict, because the point is that a person
// can read it.
// ---------------------------------------------------------------------------

const pad = (value, width) => String(value).padEnd(width);
const tick = (ok) => (ok ? 'yes' : 'NO');

process.stdout.write('\nthe contract\n');
process.stdout.write('-'.repeat(96) + '\n');
process.stdout.write(
  `${pad('channel', 34)} ${data.channel}\n` +
    `${pad('in the resolved channel map', 34)} ${tick(contract.inBaseline)}\n` +
    `${pad('declared / exposed / registered', 34)} ${list(contract.declaredIn)} | ` +
    `${list(contract.exposedIn)} | ${list(contract.registeredIn)}\n` +
    `${pad('called by', 34)} ${list(contract.calledIn)}\n` +
    `${pad('handback states', 34)} ${list(contract.sharedStates)}\n` +
    `${pad('landings, contract and renderer', 34)} ${list(contract.sharedLandings)} | ` +
    `${list(contract.rendererLandings)}\n` +
    `${pad('landings decideArmLanding makes', 34)} ${list(contract.producedLandings)}\n` +
    `${pad('refusal reasons, contract', 34)} ${list(contract.sharedRefusals)}\n` +
    `${pad('refusal reasons, main', 34)} ${list(contract.mainRefusals)}\n` +
    `${pad('refusal reasons, renderer', 34)} ${list(contract.rendererRefusals)}\n` +
    `${pad('wrapped screen counter', 34)} once ${contract.wrapCounts.once}, ` +
    `twice ${contract.wrapCounts.twice}, bare prompt ${contract.wrapCounts.none}\n`
);

process.stdout.write('\nthe menu bar\n');
process.stdout.write('-'.repeat(96) + '\n');
process.stdout.write(
  `${pad('action', 34)} ${data.action}\n` +
    `${pad('rows in the Session menu', 34)} ${menu.rowCount}\n` +
    `${pad('accelerated', 34)} ${tick(/accel\(/.test(menu.rowLine))}\n` +
    `${pad('placed after End Session', 34)} ` +
    `${tick(menu.endSessionAt < menu.rowAt && menu.rowAt < menu.hotkeysAt)}\n` +
    `${pad('dispatched by', 34)} ${list(menu.dispatchedIn)}\n` +
    `${pad('keymap entries naming it', 34)} ${list(menu.keymapNames)}\n`
);

process.stdout.write('\nthe refusals\n');
process.stdout.write('-'.repeat(96) + '\n');
const refusalRows = [
  ['SessionStatus gained no member', refusals.sessionStatuses.join(', ')],
  [
    'nothing sets a status from it',
    tick(refusals.statusCallsNamingDrop.length === 0)
  ],
  ['files that know about the drop', String(refusals.handbackFiles.length)],
  ['the projection has not heard of it', tick(!refusals.codecsNamesHandback)],
  [
    'no witness column in source or schema',
    tick(
      refusals.refusedColumnsInSource.length === 0 &&
        refusals.refusedColumnsInBaseline.length === 0
    )
  ],
  ['restore records no witness', tick(!refusals.restoreNamesWitness)],
  [
    'the rule reads no screen, spawns none',
    tick(!refusals.rule.readsScreen && !refusals.rule.startsProcess)
  ],
  [
    'the press does not use the machine door',
    tick(refusals.handbackNamesMachineSend.length === 0)
  ],
  ['files holding a witness', list(refusals.witnessFiles)]
];
for (const [name, value] of refusalRows) {
  process.stdout.write(`${pad(name, 40)} ${value}\n`);
}

process.stdout.write('\nthe witness base case\n');
process.stdout.write('-'.repeat(96) + '\n');
if (witness.state !== 'present' || !witness.keys.includes('witnessPid')) {
  process.stdout.write('  not checked: the seam reported absent.\n');
} else {
  process.stdout.write(
    `${pad('a freshly watched session', 40)} witnessPid ` +
      `${JSON.stringify(witness.witnessPid)}, handback ` +
      `${JSON.stringify(witness.handback)}\n`
  );
}

process.stdout.write('\nthe words a person reads\n');
process.stdout.write('-'.repeat(96) + '\n');
if (copy.state !== 'present') {
  process.stdout.write('  not checked: the seam reported absent.\n');
} else {
  for (const [name, text] of Object.entries({
    ...copy.notes,
    ...copy.landings,
    ...copy.refusals
  })) {
    process.stdout.write(`${pad(name, 16)} ${text}\n`);
  }
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
  '\nPASS. The drop is read from a witness and never from a shape, it sets no ' +
    'status and writes no column, the press has one door, and every sentence ' +
    'says what is true.\n'
);
