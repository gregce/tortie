/**
 * `npm run conformance:machines`. The cheap gate that keeps the machine
 * confirm gate executable rather than asserted (Phase 68, research 51 section
 * 4.2).
 *
 * WHAT IT IS FOR. A machine row names a computer Tortie may sign in to as the
 * user, and a program it may run there. The claim that comes with that is
 * large: a person agrees once, the agreement is bound to the four fields that
 * decide what runs, and nothing else can move it. A claim like that decays.
 * This gate is the executable half of it, and it costs about a second.
 *
 * It is the fourth gate of its shape, beside `conformance:agents`,
 * `conformance:installs` and `conformance:context`. It spawns nothing: no ssh,
 * no tmux server, no Electron, no manifest, no file under the person's home, no
 * request and no write anywhere. Safe on a machine with live sessions on it.
 *
 * THE TEN CONDITIONS IT FAILS ON. Each one is a way a person's agreement could
 * come to cover something they did not read, or a way a refusal could quietly
 * stop being a refusal.
 *
 *  1. The hash does not move for `host`, `user`, `port` or `remoteTmuxPath`,
 *     each varied alone, including set to unset for the three optional ones.
 *  2. The hash moves for `label` or for `color`.
 *  3. Hashing one machine twice gives two answers.
 *  4. The canonical hash text contains the label string or the colour string.
 *  5. An invalid row is not dropped whole, or is dropped without a problem
 *     naming the field and the reason, or takes a valid row down with it.
 *  6. A machine id and an agent id that are the same bare string produce the
 *     same record key or the same hash.
 *  7. The normalizer key set and MACHINE_EXECUTION_FIELDS disagree, which is
 *     how a fifth field added later would fall out of the hash.
 *  8. The connection test argv does not name exactly one record file option,
 *     or the file Tortie owns is not first in it, or the person's own file is
 *     not named second, or either path is unquoted. Also fails when any
 *     production file under src/main/machines/ mentions `.ssh/config` outside a
 *     comment saying Tortie does not read it.
 *  9. `BatchMode=no` appears in more than one place, or `BatchMode=yes` is
 *     missing from the constant Phase 69 will read.
 * 10. Any taxonomy class has empty copy, or `alarm` is true for anything other
 *     than `host-key-changed`, or a class is missing from the table.
 *
 * WHAT IT DOES NOT PROVE, stated so nobody reads more into a pass. The record
 * is sealed through `safeStorage`, which needs an Electron process, so this
 * gate never watches a confirmed machine pass and an unconfirmed one refuse.
 * That is `npm run smoke:machines`. It also connects to nothing: no ssh runs,
 * no remote tmux is started and no version is measured.
 */

import { spawnSync } from 'node:child_process';

const probe = spawnSync(
  'npx',
  ['tsx', '--tsconfig', 'tsconfig.node.json', 'build/machines-conformance-probe.mts'],
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
const fail = (message) => failures.push(message);

// ---------------------------------------------------------------------------
// 1 to 3. The hash moves for what runs, and only for what runs
// ---------------------------------------------------------------------------

const OPTIONAL = ['user', 'port', 'remoteTmuxPath'];
const fieldVerdicts = [];

if (typeof data.base !== 'string' || data.base.length !== 64) {
  fail(
    `a machine naming an address, an account, a port and a program hashed to ` +
      `${JSON.stringify(data.base)}. There is nothing for a confirmation to bind to.`
  );
}
if (data.sameAgain !== data.base) {
  fail('hashing the same machine twice gave two answers. A confirmation would never hold.');
}

for (const row of data.fields) {
  if (row.kind === 'execution') {
    const moved = row.changedHash !== null && row.changedHash !== data.base;
    const unsetMoved =
      !OPTIONAL.includes(row.field) || (row.unsetHash !== null && row.unsetHash !== data.base);
    if (!moved) {
      fail(
        `changing ${row.field} left the confirm hash unchanged, so an edit that changes ` +
          'which machine Tortie signs in to, or what it runs there, would inherit a ' +
          'confirmation given for something else.'
      );
    }
    if (!unsetMoved) {
      fail(
        `unsetting ${row.field} left the confirm hash unchanged. Removing a value changes ` +
          'what runs exactly as much as replacing it does.'
      );
    }
    fieldVerdicts.push({
      field: row.field,
      kind: row.kind,
      moves: moved && unsetMoved ? 'yes' : 'NO',
      verdict: moved && unsetMoved ? 'pass' : 'FAIL'
    });
    continue;
  }
  // A presentation field cannot reach the hash's own type at all, so the test
  // is whether its value can reach the canonical text.
  const leaked =
    row.field === 'label' ? data.canonicalCarriesLabel : data.canonicalCarriesColor;
  if (leaked) {
    fail(
      `the canonical hash text carries ${row.field}. A person would be asked to ` +
        're-approve a rename, and a gate that asks about a rename trains them to click ' +
        'through the sheet that matters.'
    );
  }
  fieldVerdicts.push({
    field: row.field,
    kind: row.kind,
    moves: leaked ? 'YES' : 'no',
    verdict: leaked ? 'FAIL' : 'pass'
  });
}

// ---------------------------------------------------------------------------
// 4. What may not be in the canonical text, and what must be
// ---------------------------------------------------------------------------

if (!data.canonicalCarriesPrefix) {
  fail(
    `the canonical hash text does not carry the record prefix, so a machine and a ` +
      'configured agent with the same bare id would hash against the same id entry.'
  );
}
if (data.sheetCarriesSshPath) {
  fail(
    'the confirm sheet lines carry the pinned ssh path. The lines are what the record ' +
      'says a person agreed to, so they must carry nothing the hash does not cover.'
  );
}
if (data.sheetCarriesHonesty) {
  fail(
    'the confirm sheet lines carry the honesty line. It belongs beside them, not in ' +
      'them, for the same reason the ssh path does.'
  );
}
if (data.sheetLines.length < 2) {
  fail(`the confirm sheet drew ${data.sheetLines.length} line(s). There is nothing to read.`);
}

// ---------------------------------------------------------------------------
// 5. The drop whole rule
// ---------------------------------------------------------------------------

const dropVerdicts = [];
for (const drop of data.drops) {
  const named =
    typeof drop.problemField === 'string' && drop.problemField.includes(drop.expectField);
  const reasoned = typeof drop.problemMessage === 'string' && drop.problemMessage.length > 10;
  const ok = drop.survivorKept && drop.droppedWhole && drop.problemCount === 1 && named && reasoned;
  if (!drop.survivorKept) {
    fail(
      `${drop.name}: the valid row beside it did not survive. A file must never lose ` +
        'every machine over one bad row.'
    );
  } else if (!drop.droppedWhole) {
    fail(`${drop.name}: the bad row was merged rather than dropped whole.`);
  } else if (!named) {
    fail(
      `${drop.name}: the problem named "${String(drop.problemField)}" rather than ` +
        `"${drop.expectField}". A person cannot fix a file when the error does not say ` +
        'what to change.'
    );
  } else if (!reasoned) {
    fail(`${drop.name}: the row was dropped with no reason a person can act on.`);
  }
  dropVerdicts.push({ name: drop.name, field: drop.problemField ?? '', verdict: ok ? 'pass' : 'FAIL' });
}

// ---------------------------------------------------------------------------
// 6. The two key spaces
// ---------------------------------------------------------------------------

if (!data.recordKeyIsPrefixed) {
  fail(
    `the record key for a machine is ${JSON.stringify(data.recordKey)} rather than the ` +
      'prefixed id, so a machine and a configured agent with the same bare id would ' +
      'share one confirmation.'
  );
}
if (data.recordKey === data.id) {
  fail('the record key for a machine is its bare id, which is the same hole stated above.');
}
if (data.base === data.agentHashForSameBareId) {
  fail(
    'a machine and a configured agent with the same bare id hashed to the same value. ' +
      'One agreement would cover both.'
  );
}
if (data.agentCanonicalCarriesPrefix) {
  fail(
    'the AGENT canonical text carries the machine prefix, so the two key spaces are ' +
      'not separate after all.'
  );
}

// ---------------------------------------------------------------------------
// 7. The normalizer key set
// ---------------------------------------------------------------------------

const declared = [...data.executionFields].sort();
if (data.hashedKeys.join('|') !== declared.join('|')) {
  const missing = declared.filter((k) => !data.hashedKeys.includes(k));
  const extra = data.hashedKeys.filter((k) => !declared.includes(k));
  fail(
    'the fields the hash actually covered and MACHINE_EXECUTION_FIELDS disagree. ' +
      `Missing from the hash: ${missing.join(', ') || 'nothing'}; hashed but not ` +
      `declared: ${extra.join(', ') || 'nothing'}. This is how a fifth field added ` +
      'later falls out of the hash without anything failing.'
  );
}

// ---------------------------------------------------------------------------
// 8. Where a machine's identity is recorded
// ---------------------------------------------------------------------------
//
// MEASURED, and this rule replaced a weaker one because the weaker one passed
// while the product wrote into the operator's home folder. The old rule only
// asked that `known_hosts` never appear outside a denying comment. It appeared
// nowhere, the rule passed, and the command named no record file at all, so the
// client used its own default. Answering the question in Tortie added three
// lines to /Users/gdc/.ssh/known_hosts, measured at 932 bytes before a probe
// run and 1229 bytes after.
//
// So the rule now reads the argv. Tortie's own file must be named, it must be
// FIRST, and the person's file must be second, because the client adds a new
// key to the first file in the list and to no other.

/**
 * A mention is allowed only inside a comment that says Tortie does not read it.
 * The comment markers are checked on the line itself, which is enough: these
 * files put one sentence per line and the gate would rather fail on a wrapped
 * comment than pass on a read.
 */
const isDenyingComment = (text) => {
  const commented = text.startsWith('*') || text.startsWith('//') || text.startsWith('/*');
  const denies = /\b(not|never|no)\b/i.test(text);
  return commented && denies;
};

for (const hit of data.sshConfigMentions) {
  if (isDenyingComment(hit.text)) continue;
  fail(
    `${hit.file}:${hit.line} mentions .ssh/config outside a comment saying Tortie does ` +
      `not read it. Tortie never reads and never writes the person's own connection ` +
      `settings file. The line reads: ${hit.text}`
  );
}

/**
 * The one code line allowed to name the person's record file names it in order
 * to READ it, and it is the path helper. Anything else naming that file is a
 * second place that could write to it.
 */
for (const hit of data.knownHostsMentions) {
  if (isDenyingComment(hit.text)) continue;
  if (hit.text.includes('join(home,')) continue;
  fail(
    `${hit.file}:${hit.line} names the person's own record file somewhere other than ` +
      `the one path helper that exists to read it. The line reads: ${hit.text}`
  );
}

const knownHostsOptions = data.argv.filter((a) =>
  String(a).startsWith(`${data.knownHostsOption}=`)
);
const knownHostsValue = String(knownHostsOptions[0] ?? '');
const tortieAt = knownHostsValue.indexOf(data.hostKeys.tortie);
const userAt = knownHostsValue.indexOf(data.hostKeys.user);

if (knownHostsOptions.length !== 1) {
  fail(
    `the connection test argv names ${knownHostsOptions.length} record file option(s) ` +
      `and it must name exactly one. With none, the client picks the file in the ` +
      `person's home folder and answering the question in Tortie writes into it. That ` +
      `is what happened: 932 bytes before a probe run and 1229 bytes after.`
  );
} else if (tortieAt < 0) {
  fail(
    `the connection test argv does not name the file Tortie owns, so the identity of ` +
      `every machine a person adds lands somewhere Tortie did not choose.`
  );
} else if (userAt < 0) {
  fail(
    `the connection test argv does not name the person's own record file, so a machine ` +
      `they have known for years, whose identity has since changed, looks to Tortie ` +
      `like a machine nobody has ever met. The alarm would never fire on first contact.`
  );
} else if (tortieAt > userAt) {
  fail(
    `the connection test argv names the person's own record file BEFORE the file ` +
      `Tortie owns. The client adds a new key to the first file in the list, so this ` +
      `order writes into their home folder. Tortie's file goes first.`
  );
}

if (!knownHostsValue.includes(`"${data.hostKeys.tortie}"`)) {
  fail(
    `the path of the file Tortie owns is not quoted in the record file option. The ` +
      `client reads that value as a list separated by spaces, and Tortie's own ` +
      `directory has a space in its name on every Mac.`
  );
}

// ---------------------------------------------------------------------------
// 9. BatchMode
// ---------------------------------------------------------------------------

const noSites = data.batchModeNoMentions.filter((hit) => !isDenyingComment(hit.text));
if (noSites.length !== 1) {
  fail(
    `BatchMode=no appears at ${noSites.length} place(s) and it must appear at exactly ` +
      `one, being the ONE visible connection test. Everything else that speaks ssh must ` +
      `fail fast rather than wait for a person who is not there. Sites: ` +
      `${noSites.map((h) => `${h.file}:${h.line}`).join(', ') || 'none'}`
  );
}
if (!data.argv.includes(data.batchModeInteractive)) {
  fail('the connection test argv does not carry BatchMode=no, so the person cannot answer.');
}
if (data.argv.filter((a) => a === data.batchModeInteractive).length !== 1) {
  fail('the connection test argv carries BatchMode=no more than once.');
}
if (data.batchModeSteady !== 'BatchMode=yes') {
  fail(
    `the steady constant Phase 69 will read is ${JSON.stringify(data.batchModeSteady)} ` +
      'rather than BatchMode=yes.'
  );
}
if (!data.batchModeYesPresent) {
  fail(
    'BatchMode=yes is nowhere in the tree, so Phase 69 has no constant to read and will ' +
      'write the string again.'
  );
}
if (data.argv.includes(data.batchModeSteady)) {
  fail('the ONE visible test carries BatchMode=yes, which would stop the person answering.');
}

// ---------------------------------------------------------------------------
// 10. The taxonomy
// ---------------------------------------------------------------------------

const EXPECTED_CLASSES = [
  'ok',
  'host-key-changed',
  'unreachable',
  'refused',
  'not-resolved',
  'auth-refused',
  'no-program',
  'client-missing',
  'cancelled',
  'timed-out',
  'unknown'
].sort();

const gotClasses = data.taxonomy.map((row) => row.class).sort();
if (gotClasses.join('|') !== EXPECTED_CLASSES.join('|')) {
  const missing = EXPECTED_CLASSES.filter((c) => !gotClasses.includes(c));
  const extra = gotClasses.filter((c) => !EXPECTED_CLASSES.includes(c));
  fail(
    `the failure taxonomy is a different set from the one this gate knows. Missing ` +
      `${missing.join(', ') || 'nothing'}; extra ${extra.join(', ') || 'nothing'}.`
  );
}

const alarming = data.taxonomy.filter((row) => row.alarm).map((row) => row.class);
if (alarming.join('|') !== data.alarmClass) {
  fail(
    `${alarming.length} class(es) set alarm: ${alarming.join(', ') || 'none'}. Exactly ` +
      `one may, and it is ${data.alarmClass}. An expired key, a changed permission and ` +
      'a dead machine share calm copy on purpose. A changed host key never does.'
  );
}

for (const row of data.taxonomy) {
  if (row.headline.length < 10 || row.detailLength < 10) {
    fail(`the ${row.class} outcome has no copy a person can read.`);
  }
  if (row.hasDash) {
    fail(`the ${row.class} outcome copy uses an em dash, which the writing rules refuse.`);
  }
}

// ---------------------------------------------------------------------------
// The tables, printed whatever the verdict, because the point is that a person
// can read them.
// ---------------------------------------------------------------------------

const pad = (value, width) => String(value).padEnd(width);

process.stdout.write('\nfield                kind          hash moves  verdict\n');
process.stdout.write('-'.repeat(60) + '\n');
for (const row of fieldVerdicts) {
  process.stdout.write(
    `${pad(row.field, 20)} ${pad(row.kind, 13)} ${pad(row.moves, 11)} ${row.verdict}\n`
  );
}

process.stdout.write('\nclass               alarm  headline\n');
process.stdout.write('-'.repeat(100) + '\n');
for (const row of data.taxonomy) {
  process.stdout.write(
    `${pad(row.class, 19)} ${pad(row.alarm ? 'YES' : 'no', 6)} ${row.headline}\n`
  );
}

process.stdout.write('\ndropped whole                          field                       verdict\n');
process.stdout.write('-'.repeat(100) + '\n');
for (const row of dropVerdicts) {
  process.stdout.write(`${pad(row.name, 38)} ${pad(row.field, 27)} ${row.verdict}\n`);
}

process.stdout.write(
  `\nthe record key is ${data.recordKey}, and the agent gate's key for the same bare id ` +
    `is ${data.id}.\n`
);
process.stdout.write(
  `the hash covered ${data.hashedKeys.join(', ')}, plus the prefixed id, and nothing else.\n`
);
process.stdout.write(
  `${data.scannedFiles.length} production files under src/main/machines/ were scanned. ` +
    `.ssh/config: ${data.sshConfigMentions.length} mention(s).\n`
);
process.stdout.write(`BatchMode=no call sites: ${noSites.length}.\n`);
process.stdout.write(
  `a machine's identity is recorded in ${data.hostKeys.tortie}, which is named first ` +
    `and is the only file the client adds a key to. ${data.hostKeys.user} is named ` +
    `second and is read, never written.\n`
);

if (failures.length > 0) {
  process.stdout.write(`\nFAIL, ${failures.length}:\n`);
  for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
  process.exit(1);
}

process.stdout.write(
  '\nPASS. A machine confirmation is bound to the four fields that decide what runs, to ' +
    'the prefixed id, and to nothing else. Nothing was started by this gate.\n'
);
