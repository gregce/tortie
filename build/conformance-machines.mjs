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
 * THE EIGHTEEN CONDITIONS IT FAILS ON. Each one is a way a person's agreement
 * could come to cover something they did not read, a way a refusal could quietly
 * stop being a refusal, or (from 11 on) a way a command Tortie sends to another
 * machine could come to land somewhere nobody chose.
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
 * 11. A remote command does not carry `-f /dev/null`, does not carry
 *     `-L <the socket activeTmuxSocket returned>`, carries a literal `gmux`,
 *     names a bare program rather than an absolute path, or sends a boot verb
 *     that is not on the ledger.
 * 12. The local composition differs by one byte from the golden taken from
 *     `ab94847`'s `tmuxArgs`, across twelve representative argument vectors.
 * 13. An exec plane command is missing any required option, carries
 *     `BatchMode=no`, does not name both identity record files with Tortie's own
 *     first and both quoted, or carries a keepalive pair that would take longer
 *     than 20 s to call a dead link dead.
 * 14. The composed control path is over its byte budget, its directory is not
 *     created mode 0700, or two accounts would share one connection name.
 * 15. The ledger holds any of the six verbs this release refuses, a row carries
 *     an empty reason, or a verb the plane does send is absent from it.
 * 16. `SERVER_OPTIONS` and `resources/gmux-tmux.conf` disagree on any option,
 *     value or scope flag, in either direction; the local re-assert order moved;
 *     or a second row started taking its value from Settings.
 * 17. `TESTED_REMOTE_TMUX_VERSIONS` is empty, a row is missing its measurement
 *     date or its note, or any row claims control mode was measured.
 * 18. A golden file has no manifest row, a manifest row names a file that is not
 *     there, or a class listed as having no golden has one or gives no reason.
 *
 * WHAT IT DOES NOT PROVE, stated so nobody reads more into a pass. The record
 * is sealed through `safeStorage`, which needs an Electron process, so this
 * gate never watches a confirmed machine pass and an unconfirmed one refuse.
 * That is `npm run smoke:machines`. It also connects to nothing: no ssh runs,
 * no remote tmux is started and no version is measured. Conditions 11 to 18 read
 * COMPOSED strings and lists, never a live connection, so what they prove is that
 * the shapes are right and not that a machine answered. That is
 * `build/probe-execplane.mjs` and `npm run smoke:execplane`.
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
  'unknown',
  // Phase 69. `no-server` is a machine that answered with nothing of Tortie's on
  // it, which research 51 section 4.4 requires be told apart from a refused
  // connection. The other two are Tortie's own judgement about a version and its
  // own answer on success.
  'no-server',
  'version-unmeasured',
  'prepared'
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
// 11. Every remote argv, and the socket it is aimed at
// ---------------------------------------------------------------------------
//
// This is the condition that stands between a remote command and the operator's
// own server. In the live probe the far side of the connection IS this Mac, so a
// remote `set-option -g history-limit` on socket `gmux` would rewrite every option
// on the server holding his live sessions.

// The ssh argv, and the tmux call it carries. They are two different lists and the
// distinction is load bearing. ssh carries no argv to the other machine: it joins
// everything after the address with single spaces and hands one STRING to that
// machine's login shell. MEASURED 2026-08-17 against a scratch sshd, unquoted, the
// far side's shell read `#{session_id}` as the start of a comment and dropped it. So
// the whole tmux call travels as ONE quoted argument, and the four checks below read
// the call as a list rather than picking `-L` back out of the quoting.
const remoteArgv = (data.remoteArgv ?? []).map(String);
const remoteCall = (data.remoteCall ?? []).map(String);

if (remoteCall.length === 0) {
  fail(
    'the probe reported no remote tmux call at all, so conditions 11 checked ' +
      'nothing. The call is composed by remoteTmuxArgv and it is the list the ' +
      'socket, the configuration file and the program are named in.'
  );
}

const dashF = remoteCall.indexOf('-f');
if (dashF < 0 || remoteCall[dashF + 1] !== data.remoteConfPath) {
  fail(
    `a remote command does not carry -f ${String(data.remoteConfPath)}. Without ` +
      `it tmux reads the OTHER machine's own configuration file whenever a verb ` +
      `creates the server, which is any verb at all.`
  );
}
const dashL = remoteCall.indexOf('-L');
if (dashL < 0 || remoteCall[dashL + 1] !== data.probeSocket) {
  fail(
    `a remote command does not carry -L ${String(data.probeSocket)}, the socket ` +
      `activeTmuxSocket() returned. It carried ${JSON.stringify(
        remoteCall[dashL + 1] ?? null
      )}.`
  );
}
if (remoteCall.includes(data.realSocket)) {
  fail(
    `a remote command carries the literal socket "${String(data.realSocket)}". ` +
      `The socket must come from activeTmuxSocket() and from nowhere else: with ` +
      `a literal, a remote set-option lands on the server holding the ` +
      `operator's live sessions whenever the far side is this Mac, which is ` +
      `exactly what the live probe's far side is.`
  );
}
if (remoteCall[remoteCall.indexOf(data.probeSocket) - 1] !== '-L') {
  fail('the socket name in a remote command is not the value of -L.');
}
// The program on the far side is the absolute path the confirm hash bound, and it
// stands first in the call, immediately before -L.
if (!String(remoteCall[0] ?? '').startsWith('/')) {
  fail(
    `the program a remote command runs is ${JSON.stringify(
      remoteCall[0] ?? null
    )} rather than an absolute path. A bare name would let the other machine's ` +
      `PATH choose which program runs, and sealing that choice is the whole ` +
      `point of the confirm gate.`
  );
}

// The call reaches the machine as one argument, and it is the LAST one. A call
// split across arguments is the shape the far side's shell mangles.
const lastArg = String(remoteArgv[remoteArgv.length - 1] ?? '');
for (const piece of ['-L', data.probeSocket, '-f', data.remoteConfPath]) {
  if (lastArg.includes(String(piece))) continue;
  fail(
    `the remote tmux call does not travel as one argument: ${JSON.stringify(
      String(piece)
    )} is missing from the last argument of the ssh command. ssh hands one string ` +
      `to the other machine's login shell, so a call split across arguments is a ` +
      `call that shell can re-split.`
  );
}
if (remoteArgv.filter((a) => a === '-L').length > 0) {
  fail(
    'the ssh argv carries -L as an argument of its own. That is the unquoted ' +
      'shape the live probe measured being mangled by the far side, and it also ' +
      'means ssh reads -L as its own local port forward flag.'
  );
}

// The boot call carries the same two, because the verb that CREATES the server is
// the one whose configuration file matters most.
const remoteBootCall = (data.remoteBootCall ?? []).map(String);
const bootDashF = remoteBootCall.indexOf('-f');
if (bootDashF < 0 || remoteBootCall[bootDashF + 1] !== data.remoteConfPath) {
  fail(
    `the remote boot command does not carry -f ${String(data.remoteConfPath)}. ` +
      `The boot is the invocation that creates the server, so it is the one that ` +
      `decides whether the other machine's own configuration file is read.`
  );
}
if (remoteBootCall[remoteBootCall.indexOf('-L') + 1] !== data.probeSocket) {
  fail(
    `the remote boot command does not name the socket activeTmuxSocket() ` +
      `returned. A boot on the wrong socket is a server created where the ` +
      `operator's live sessions are.`
  );
}

// The boot verb is a chain, and every verb in it is on the ledger.
const bootVerbs = (data.remoteBootVerbs ?? []).map(String);
if (bootVerbs.length < 2) {
  fail(
    `the remote boot sends ${String(bootVerbs.length)} verb(s). MEASURED on ` +
      `tmux 3.6a: a server created with -f /dev/null and no sessions ends ` +
      `itself immediately, because tmux's own default for exit-empty is on. The ` +
      `boot has to set that option in the same invocation that creates the server.`
  );
}
for (const verb of bootVerbs) {
  if (!(data.ledger ?? []).some((row) => row.verb === verb)) {
    fail(`the remote boot sends "${verb}", which is not on the verb ledger.`);
  }
}

// ---------------------------------------------------------------------------
// 12. The local composition, byte for byte against ab94847
// ---------------------------------------------------------------------------

const localRows = data.localRows ?? [];
if (localRows.length < 12) {
  fail(
    `the local composition was compared on ${String(localRows.length)} argument ` +
      `vector(s) and the gate wants at least twelve. 59 call sites reach tmux ` +
      `through this composer, so one wrong byte is one wrong byte in every one.`
  );
}
for (const row of localRows) {
  if (row.equal) continue;
  fail(
    `the local composition for "${String(row.verb)}" differs from what ` +
      `ab94847 produced.\n      want ${JSON.stringify(row.want)}\n      got  ` +
      `${JSON.stringify(row.got)}`
  );
}

// ---------------------------------------------------------------------------
// 13. The carriage
// ---------------------------------------------------------------------------

const sshOptionText = (data.remoteSshOptions ?? []).map(String).join(' ');
for (const required of data.requiredSshOptions ?? []) {
  if (sshOptionText.includes(String(required))) continue;
  fail(
    `an exec plane command is missing ${String(required)}. Every one of these ` +
      `exists for a measured reason, and the two keepalive numbers exist so a ` +
      `dropped link becomes an error instead of a pipe that never answers.`
  );
}
if (sshOptionText.includes('BatchMode=no')) {
  fail(
    'an exec plane command carries BatchMode=no. Nothing but the ONE visible ' +
      'connection test may, because a client waiting on a prompt nobody can see ' +
      'is a session that never opens and never says why.'
  );
}
if (!sshOptionText.includes('StrictHostKeyChecking=yes')) {
  fail(
    'an exec plane command does not carry StrictHostKeyChecking=yes. Under any ' +
      'weaker value the plane could add a line to an identity record file, and ' +
      'first contact belongs to the one test where a person is watching.'
  );
}
const knownHostsValueRemote =
  (data.remoteSshOptions ?? [])
    .map(String)
    .find((a) => a.startsWith(`${data.knownHostsOption}=`)) ?? '';
const tortieAtRemote = knownHostsValueRemote.indexOf(data.hostKeys.tortie);
const userAtRemote = knownHostsValueRemote.indexOf(data.hostKeys.user);
if (tortieAtRemote < 0 || userAtRemote < 0) {
  fail(
    'an exec plane command does not name both identity record files. The one ' +
      'Tortie owns has to be there, and the person’s own has to be read so a ' +
      'machine they have known for years still raises the alarm if it changes.'
  );
} else if (tortieAtRemote > userAtRemote) {
  fail(
    "an exec plane command names the person's own record file before the file " +
      'Tortie owns. The client adds a new key to the first file in the list.'
  );
}
if (
  !knownHostsValueRemote.includes(`"${data.hostKeys.tortie}"`) ||
  !knownHostsValueRemote.includes(`"${data.hostKeys.user}"`)
) {
  fail(
    'a path in the exec plane record file option is unquoted. The client reads ' +
      "that value as a list separated by spaces, and Tortie's own directory has " +
      'a space in its name on every Mac.'
  );
}
if (Number(data.keepalive?.interval) <= 0 || Number(data.keepalive?.countMax) <= 0) {
  fail(
    `the keepalive pair is ${JSON.stringify(data.keepalive)}. A zero on either ` +
      `side turns the check off, and a frozen far side then leaves a command ` +
      `hanging with no deadline at all.`
  );
}
const detectionSeconds =
  Number(data.keepalive?.interval) * Number(data.keepalive?.countMax);
if (detectionSeconds > 20) {
  fail(
    `the keepalive pair detects a dead link in about ${String(detectionSeconds)} ` +
      `s. The measurement in src/main/machines/ssh.ts chose a pair at or under ` +
      `20 s, because longer reads to a person as Tortie freezing.`
  );
}

// ---------------------------------------------------------------------------
// 14. The control path
// ---------------------------------------------------------------------------

if (Number(data.controlPathBytes) > Number(data.controlPathMaxBytes)) {
  fail(
    `the control socket path is ${String(data.controlPathBytes)} bytes and the ` +
      `budget is ${String(data.controlPathMaxBytes)}. A unix socket path is ` +
      `limited to 104 bytes and the failure otherwise lands at connect time, ` +
      `where it reads as the machine being broken.`
  );
}
if (Number(data.controlDirMode) !== 0o700) {
  fail(
    `the control socket directory is created with mode ${Number(
      data.controlDirMode
    ).toString(8)} rather than 700. Another account could reach this machine's ` +
      `open connection.`
  );
}
if (data.controlLeaf === data.controlLeafForOtherUid) {
  fail(
    'the control socket name is the same for two different accounts, so two ' +
      'people on one machine would share one connection.'
  );
}
if (!/^m-[0-9a-f]{12}$/.test(String(data.controlLeaf))) {
  fail(
    `the control socket name is ${JSON.stringify(data.controlLeaf)} rather than ` +
      `a short hashed one, so its length depends on the machine's own name.`
  );
}

// ---------------------------------------------------------------------------
// 15. The verb ledger
// ---------------------------------------------------------------------------

const ledger = data.ledger ?? [];
if (ledger.length === 0) {
  fail(
    'the remote verb ledger is empty, so either nothing may cross to a machine ' +
      'or the ledger stopped being read.'
  );
}
for (const forbidden of data.forbiddenVerbs ?? []) {
  if (!ledger.some((row) => row.verb === forbidden)) continue;
  fail(
    `"${String(forbidden)}" is on the remote verb ledger. This release opens no ` +
      `session on any machine, and the ledger is what enforces that in code ` +
      `rather than in prose. A later rung adds it WITH its repeat reasoning.`
  );
}
for (const row of ledger) {
  if (Number(row.reasonLength) < 10) {
    fail(
      `the ledger row for "${String(row.verb)}" carries no reason. The whole ` +
        `point of the row is that somebody wrote down why running it twice is ` +
        `safe, and a blank reason is a row nobody thought about.`
    );
  }
  if (row.repeat !== 'safe' && row.repeat !== 'unsafe') {
    fail(`the ledger row for "${String(row.verb)}" has no repeat class.`);
  }
  if (!['read', 'server-setup', 'mutating'].includes(String(row.kind))) {
    fail(`the ledger row for "${String(row.verb)}" has no kind.`);
  }
}
// Every verb the plane actually sends has to be on it, or the plane refuses its
// own boot.
for (const verb of ['list-sessions', 'display-message', 'show-options', 'start-server', 'set-option', 'set-environment']) {
  if (ledger.some((row) => row.verb === verb)) continue;
  fail(
    `"${verb}" is sent by this release and is not on the ledger, so the plane ` +
      `would refuse its own commands.`
  );
}

// ---------------------------------------------------------------------------
// 16. The option list against the conf, in both directions
// ---------------------------------------------------------------------------

for (const row of data.serverOptions ?? []) {
  if (!row.inConf) {
    fail(
      `SERVER_OPTIONS carries ${String(row.name)} and resources/gmux-tmux.conf ` +
        `does not set it. A machine booted with -f /dev/null would then be ` +
        `given a value this Mac never runs with.`
    );
    continue;
  }
  if (row.confScope !== row.scope) {
    fail(
      `${String(row.name)} is ${String(row.scope)} in SERVER_OPTIONS and ` +
        `${String(row.confScope)} in the conf. The flags reach different places, ` +
        `and a wrong one is an option that silently never applies. MEASURED: ` +
        `show-options -sv on a session option fails with "no current session".`
    );
    continue;
  }
  if (row.confValue !== row.value) {
    fail(
      `${String(row.name)} is ${JSON.stringify(row.value)} in SERVER_OPTIONS and ` +
        `${JSON.stringify(row.confValue)} in the conf. A machine would then be ` +
        `set up differently from this Mac.`
    );
  }
}
for (const name of data.confOnlyOptions ?? []) {
  fail(
    `resources/gmux-tmux.conf sets ${String(name)} and SERVER_OPTIONS does not ` +
      `carry it, so a machine booted with -f /dev/null would never get it.`
  );
}
const reassert = (data.localReassertOrder ?? []).map(String);
const REASSERT_AT_AB94847 = [
  'remain-on-exit',
  'exit-empty',
  'mouse',
  'copy-mode-position-format',
  'mode-style'
];
if (reassert.join('|') !== REASSERT_AT_AB94847.join('|')) {
  fail(
    `the local boot re-asserts ${JSON.stringify(reassert)} and at ab94847 it ` +
      `asserted ${JSON.stringify(REASSERT_AT_AB94847)}, in that order. The local ` +
      `sequence must be byte for byte what it was.`
  );
}
const fromSettings = (data.fromSettingsRows ?? []).map(String);
if (fromSettings.join('|') !== 'history-limit') {
  fail(
    `${JSON.stringify(fromSettings)} take their value from Settings, and exactly ` +
      `one row may, being history-limit. Any other row taking a Settings value ` +
      `would be Tortie inventing a preference on somebody else's machine.`
  );
}

// ---------------------------------------------------------------------------
// 17. The tested remote version list
// ---------------------------------------------------------------------------

const remoteVersions = data.remoteVersions ?? [];
if (remoteVersions.length === 0) {
  fail(
    'TESTED_REMOTE_TMUX_VERSIONS is empty, so every machine is refused and the ' +
      'gate cannot tell a measured version from an unmeasured one.'
  );
}
for (const row of remoteVersions) {
  if (typeof row.measuredAt !== 'string' || row.measuredAt.length < 8) {
    fail(
      `the row for ${String(row.version)} has no measurement date. A version on ` +
        `this list without one is a claim nobody can check or re-run.`
    );
  }
  if (Number(row.noteLength) < 20) {
    fail(
      `the row for ${String(row.version)} says nothing about what was measured.`
    );
  }
  if (row.control === true) {
    fail(
      `the row for ${String(row.version)} claims control mode was measured. This ` +
        `release opens no control connection, so nothing here could have ` +
        `measured one. A later rung measures it and flips the field, and that ` +
        `order is what makes the ladder fail closed.`
    );
  }
  if (row.exec !== true) {
    fail(
      `the row for ${String(row.version)} claims no plane at all was measured, ` +
        `so it should not be on the list.`
    );
  }
}

// ---------------------------------------------------------------------------
// 18. The golden files, and what deliberately has none
// ---------------------------------------------------------------------------

const manifest = data.goldenManifest;
const goldenFiles = (data.goldenFiles ?? []).map(String);
if (manifest === null || typeof manifest !== 'object') {
  fail(
    'src/main/machines/__tests__/golden/manifest.json is missing or unreadable, ' +
      'so nothing records which ssh client and which remote tmux the captured ' +
      'text came from, and an upgrade that reworded a line would look fine.'
  );
} else {
  const captures = manifest.captures ?? [];
  const noGolden = manifest.noGolden ?? [];
  for (const name of goldenFiles) {
    const cls = name.replace(/\.txt$/, '');
    if (captures.some((row) => row.class === cls)) continue;
    fail(
      `the golden file ${name} has no row in the manifest, so nothing records ` +
        `which client and which version produced it.`
    );
  }
  for (const row of captures) {
    if (goldenFiles.includes(String(row.file))) continue;
    fail(
      `the manifest names ${String(row.file)} and the file is not there, so the ` +
        `test that reads it would silently check nothing.`
    );
  }
  for (const row of noGolden) {
    if (!goldenFiles.includes(`${String(row.class)}.txt`)) {
      if (typeof row.reason === 'string' && row.reason.length > 20) continue;
      fail(
        `${String(row.class)} is listed as having no golden and the manifest ` +
          `gives no reason. "There is no file" without a reason is how a ` +
          `missing measurement comes to look deliberate.`
      );
      continue;
    }
    fail(
      `${String(row.class)} is listed as having no golden and a file for it ` +
        `exists. Tortie writes that sentence itself, so a file would look like ` +
        `a measurement while being a fixture.`
    );
  }
  if (typeof manifest.sshClient !== 'string' || manifest.sshClient.length < 5) {
    fail(
      'the golden manifest does not record which ssh client printed the ' +
        'captured text. One client was measured and a different one may print ' +
        'different words.'
    );
  }
  if (typeof manifest.remoteTmux !== 'string' || manifest.remoteTmux.length < 5) {
    fail('the golden manifest does not record which remote tmux was measured.');
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

// ---------------------------------------------------------------------------
// Phase 69's tables
// ---------------------------------------------------------------------------

process.stdout.write('\nverb                 repeat  kind          reason\n');
process.stdout.write('-'.repeat(70) + '\n');
for (const row of data.ledger ?? []) {
  process.stdout.write(
    `${pad(row.verb, 20)} ${pad(row.repeat, 7)} ${pad(row.kind, 13)} ${String(
      row.reasonLength
    )} chars\n`
  );
}
process.stdout.write(
  `nothing else may cross to a machine. These ` +
    `${String((data.forbiddenVerbs ?? []).length)} are absent and stay absent: ` +
    `${(data.forbiddenVerbs ?? []).join(', ')}.\n`
);

process.stdout.write('\noption                       scope  value                          conf\n');
process.stdout.write('-'.repeat(80) + '\n');
for (const row of data.serverOptions ?? []) {
  process.stdout.write(
    `${pad(row.name, 28)} ${pad(row.scope, 6)} ${pad(
      JSON.stringify(row.value),
      30
    )} ${row.agrees ? 'agrees' : 'DISAGREES'}\n`
  );
}

process.stdout.write('\nremote tmux  exec measured  control measured  measured on\n');
process.stdout.write('-'.repeat(70) + '\n');
for (const row of data.remoteVersions ?? []) {
  process.stdout.write(
    `${pad(row.version, 12)} ${pad(row.exec ? 'yes' : 'NO', 14)} ${pad(
      row.control ? 'YES' : 'no',
      17
    )} ${String(row.measuredAt)}\n`
  );
}

process.stdout.write(
  `\nthe local composition matched ab94847 on ` +
    `${(data.localRows ?? []).filter((r) => r.equal).length} of ` +
    `${(data.localRows ?? []).length} argument vectors.\n`
);
process.stdout.write(
  `a remote command is: ${String(data.remoteFile)} ${(data.remoteArgv ?? []).join(' ')}\n`
);
process.stdout.write(
  `the last argument above is ONE argument, and the tmux call inside it is: ` +
    `${(data.remoteCall ?? []).join(' ')}\n`
);
process.stdout.write(
  `the connection it keeps open is named ${String(data.controlPath)}, ` +
    `${String(data.controlPathBytes)} bytes of a ${String(
      data.controlPathMaxBytes
    )} byte budget, in a directory created mode ` +
    `${Number(data.controlDirMode).toString(8)}.\n`
);
process.stdout.write(
  `a dropped link becomes an error in about ` +
    `${String(
      Number(data.keepalive?.interval) * Number(data.keepalive?.countMax)
    )} s, from ServerAliveInterval ${String(
      data.keepalive?.interval
    )} and ServerAliveCountMax ${String(data.keepalive?.countMax)}.\n`
);
process.stdout.write(
  `${(data.goldenFiles ?? []).length} golden file(s) are on disk, captured from ` +
    `${String(data.goldenManifest?.sshClient ?? 'an unrecorded client')} against ` +
    `${String(data.goldenManifest?.remoteTmux ?? 'an unrecorded tmux')}. ` +
    `${(data.goldenManifest?.noGolden ?? []).length} class(es) have none, each ` +
    `with its reason recorded.\n`
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
